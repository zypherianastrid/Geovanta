# Rapid Zoom Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate lag, main-thread stalls, and frame drops during rapid canvas wheel zoom and sidebar zoom slider dragging (0% to 500%) by implementing dynamic interactive LOD, quantizing dash caches, deferring React settle state updates, and fixing offline WASM bundling.

**Architecture:** Route active zoom frames directly through single-pass Skia hardware antialiasing (bypassing expensive multi-pass RGSS supersampling while gestures are in motion), quantize non-scaling stroke dash cache keys, defer heavyweight React component tree reconciliation in `VectorEditor` on settle via `startTransition`, and provide an isomorphic bridge loader for offline WebAssembly.

**Tech Stack:** TypeScript, React 18, CanvasKit-WASM (Skia), Rust WebAssembly, Playwright (`@playwright/test`, `npx playwright test`).

**Spec:** [docs/superpowers/specs/2026-11-21-rapid-zoom-performance-fix-design.md](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Backup/Geovanta%20Backup/docs/superpowers/specs/2026-11-21-rapid-zoom-performance-fix-design.md)

## Global Constraints

- Mandatory Playwright tooling: Strictly and exclusively use `@playwright/test` and `npx playwright test` for automated tests and Playwright MCP for live browser interactions.
- Zero frame drops: Active zoom frame times must stay $\le 8.0\text{ms}$ (well within the 16.6ms / 60 FPS threshold).
- Visual parity: Final settled frame quality must preserve antialiasing sharpness (RGSS when antialias=false).
- Offline self-containment: Must compile and run 100% offline via `node scripts/build-offline-bundle.js` without CDN or internet access.

## Review Focus

1. **Gestures during settlement:** When rapid wheel events fire while a previous settle timer is running, the timer must be cleanly cancelled without queuing duplicate frame renders or stale camera state.
2. **Transition back to static RGSS:** When camera motion stops, the transition from single-pass interactive draw to settled RGSS presentation must not produce visual flicker or border seams.
3. **Extreme zoom bounds:** At minimum zoom ($0.05\%$) and maximum zoom ($5000\%$), logarithmic dash quantization and bounding box culling must not divide by zero or emit `NaN`.
4. **React concurrent state:** When `setZoom` and `setPan` are deferred via `startTransition`, overlay components (such as text editor gizmos and selection bounding boxes) must remain aligned with the camera matrix.
5. **WASM fallback resilience:** If WebAssembly fails to load in offline browser environments, the TypeScript facades must execute cleanly without crashing the canvas.

---

### Task 1: Isomorphic WASM Bridge Loader & Offline Bundle Fix

**Files:**
- Modify: `src/bridge/wasmEngineBridge.ts`
- Modify: `scripts/build-offline-bundle.js:70-85`
- Test: `tests/wasm-offline-bundle.spec.ts`

**Interfaces:**
- Consumes: `initWasmEngine(): Promise<boolean>`
- Produces: `initWasmEngine()` that executes in both Node.js (`@playwright/test`) and browser (`esbuild` IIFE offline bundle) without `require('fs')` bundle resolution errors.

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/wasm-offline-bundle.spec.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

test('build:web bundles successfully without esbuild fs resolution errors', async () => {
  const root = path.resolve(__dirname, '..');
  const result = execSync('node scripts/build-offline-bundle.js', { cwd: root, encoding: 'utf8' });
  expect(result).toContain('[Geovanta Build] Aset offline CanvasKit GPU/CPU siap');
  const bundlePath = path.join(root, 'web', 'assets', 'geovanta.bundle.js');
  expect(fs.existsSync(bundlePath)).toBe(true);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/wasm-offline-bundle.spec.ts`
Expected: FAIL with `Could not resolve "fs"` in `geovanta_wasm.js`.

- [ ] **Step 3: Implement isomorphic bridge loader in `src/bridge/wasmEngineBridge.ts` and update `scripts/build-offline-bundle.js`**

Isolate Node.js `fs` access behind environment checks or provide external alias/plugin in `scripts/build-offline-bundle.js` so `esbuild` bundles browser assets cleanly.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/wasm-offline-bundle.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bridge/wasmEngineBridge.ts scripts/build-offline-bundle.js tests/wasm-offline-bundle.spec.ts
git commit -m "fix(bridge): make wasm loader isomorphic and resolve offline bundle build"
```

---

### Task 2: Interactive Dynamic LOD in SceneRenderer

**Files:**
- Modify: `src/renderer/sceneRenderer.tsx:570-580`
- Test: `tests/dynamic-lod-zoom.spec.ts`

**Interfaces:**
- Consumes: `this.cameraInteracting: boolean`, `RENDER_CONFIG.antialias: boolean`
- Produces: `useRgss` condition that strictly evaluates to `false` when `this.cameraInteracting === true`, routing active zoom frames directly to `drawVectorFrame` ($2\text{ms}/\text{frame}$).

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/dynamic-lod-zoom.spec.ts
import { test, expect } from '@playwright/test';

test('sceneRenderer: bypasses multi-pass RGSS when cameraInteracting is true', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(() => typeof window.__geovantaEditorApi !== 'undefined');

  const result = await page.evaluate(() => {
    const renderer = window.__geovantaEditorApi.getSceneRenderer();
    let rgssCalled = false;
    let directDrawCalled = false;

    const origRgss = renderer.renderRgssFrame?.bind(renderer);
    if (origRgss) {
      renderer.renderRgssFrame = function(...args: any[]) {
        rgssCalled = true;
        return origRgss(...args);
      };
    }
    const origDraw = renderer.drawVectorFrame.bind(renderer);
    renderer.drawVectorFrame = function(...args: any[]) {
      directDrawCalled = true;
      return origDraw(...args);
    };

    // When camera is interacting (zooming/panning)
    renderer.setCameraInteracting(true);
    renderer.setCamera(2.5, 0, 0, 1000, 800);
    renderer.renderFrame(true);

    return { rgssCalled, directDrawCalled };
  });

  expect(result.directDrawCalled).toBe(true);
  expect(result.rgssCalled).toBe(false);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/dynamic-lod-zoom.spec.ts`
Expected: FAIL with `expect(result.rgssCalled).toBe(false)` returning `true`.

- [ ] **Step 3: Update `useRgss` in `src/renderer/sceneRenderer.tsx`**

Modify line 570 in `src/renderer/sceneRenderer.tsx`:
```typescript
const useRgss = !RENDER_CONFIG.antialias && !interacting;
```
Ensure that whenever `interacting` is true (including `cameraInteracting` during zoom), `useRgss` is disabled and single-pass `drawVectorFrame` is invoked.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/dynamic-lod-zoom.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/sceneRenderer.tsx tests/dynamic-lod-zoom.spec.ts
git commit -m "perf(renderer): implement dynamic interactive LOD bypassing RGSS during camera gestures"
```

---

### Task 3: Quantize Non-Scaling Stroke Dash Cache Keys

**Files:**
- Modify: `src/renderer/canvasKitScene.tsx:640-655`
- Test: `tests/dash-cache-quantization.spec.ts`

**Interfaces:**
- Consumes: `zoom: number`, `intervals: number[]`, `phase: number`
- Produces: Logarithmically quantized cache key that prevents continuous cache eviction during smooth zooming.

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/dash-cache-quantization.spec.ts
import { test, expect } from '@playwright/test';

test('canvasKitScene: reuses cached MakeDash effect across continuous micro-zoom steps', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(() => typeof window.__geovantaEditorApi !== 'undefined');

  const cacheMisses = await page.evaluate(() => {
    const renderer = window.__geovantaEditorApi.getSceneRenderer();
    const scene = renderer.scene;
    let makeCount = 0;

    const origMake = scene.kit.PathEffect.MakeDash.bind(scene.kit.PathEffect);
    scene.kit.PathEffect.MakeDash = function(...args: any[]) {
      makeCount++;
      return origMake(...args);
    };

    const dashedObj = {
      id: 'test_dash',
      name: 'DashObj',
      type: 'path',
      fill: 'none',
      stroke: '#000',
      strokeWidth: 2,
      nonScalingStroke: true,
      strokeDasharray: '6,6',
      strokeDashoffset: 0,
      opacity: 1,
      subs: [{ id: 's1', closed: false, nodes: [{ id: 'n1', x: 0, y: 0 }, { id: 'n2', x: 100, y: 100 }] }]
    };

    // Draw across 20 very close zoom values
    const canvas = renderer.surface.getCanvas();
    const path = scene.path(dashedObj).path;
    for (let i = 0; i < 20; i++) {
      const z = 1.0 + i * 0.005;
      scene.drawVector(canvas, dashedObj, path, 0, 0, z, false, true, 1, true);
    }

    return makeCount;
  });

  // With quantization, 20 micro-steps should produce far fewer than 20 distinct MakeDash instances
  expect(cacheMisses).toBeLessThan(5);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/dash-cache-quantization.spec.ts`
Expected: FAIL with `makeCount` equal to 20.

- [ ] **Step 3: Implement logarithmic zoom quantization in `src/renderer/canvasKitScene.tsx`**

In `canvasKitScene.tsx`:
```typescript
const qZoom = Math.pow(2, Math.round(Math.log2(Math.max(1e-4, zoom)) * 16) / 16);
const scIntervals = intervals.map(v => Math.round((v / qZoom) * 100) / 100);
const scPhase = Math.round((phase / qZoom) * 100) / 100;
```

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/dash-cache-quantization.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/canvasKitScene.tsx tests/dash-cache-quantization.spec.ts
git commit -m "perf(renderer): quantize non-scaling stroke dash cache keys across zoom levels"
```

---

### Task 4: Defer React State Settle in VectorEditor

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx:580-600`
- Test: `tests/react-settle-latency.spec.ts`

**Interfaces:**
- Consumes: `setZoom: React.Dispatch<React.SetStateAction<number>>`, `setPan: React.Dispatch<React.SetStateAction<{x: number, y: number}>>`
- Produces: Non-blocking state update via `React.startTransition` inside `flushView()`, eliminating the 49ms synchronous main-thread freeze.

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/react-settle-latency.spec.ts
import { test, expect } from '@playwright/test';

test('VectorEditor: flushView does not block the main thread longer than 16ms', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(() => typeof window.__geovantaEditorApi !== 'undefined');

  const duration = await page.evaluate(() => {
    const api = window.__geovantaEditorApi;
    const t0 = performance.now();
    api.setZ(2.0, null, null, false); // triggers flushView
    return performance.now() - t0;
  });

  expect(duration).toBeLessThan(16.0);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/react-settle-latency.spec.ts`
Expected: FAIL with `duration` around 49ms ($> 16.0\text{ms}$).

- [ ] **Step 3: Wrap `setZoom` and `setPan` in `React.startTransition` in `flushView`**

In `VectorEditor.tsx`:
```typescript
import { startTransition } from 'react';
// Inside flushView():
startTransition(() => {
  setZoom(prevZ => Math.abs(prevZ - z) > 1e-6 ? z : prevZ);
  setPan(prevP => Math.abs(prevP.x - p.x) > 0.5 || Math.abs(prevP.y - p.y) > 0.5 ? p : prevP);
});
```

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/react-settle-latency.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/VectorEditor.tsx tests/react-settle-latency.spec.ts
git commit -m "perf(editor): defer react zoom/pan state updates via startTransition on settle"
```

---

### Task 5: End-to-End Rapid Zoom Verification (0% to 500%)

**Files:**
- Test: `tests/zoom-perf-verification.spec.ts`

- [ ] **Step 1: Write the E2E verification Playwright test**

Measure 60 continuous zoom frames on a canvas populated with 55 diverse objects, asserting average frame time $< 8.0\text{ms}$ and 0 dropped frames ($> 16.6\text{ms}$).

- [ ] **Step 2: Run Playwright test to verify it passes**

Run: `npx playwright test tests/zoom-perf-verification.spec.ts`
Expected: PASS with 0 dropped frames.

- [ ] **Step 3: Rebuild offline web bundle and verify entire suite**

Run: `npm run build:web && npx playwright test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/zoom-perf-verification.spec.ts web/
git commit -m "test(perf): verify smooth 60+ FPS rapid zoom across 0% to 500%"
```
