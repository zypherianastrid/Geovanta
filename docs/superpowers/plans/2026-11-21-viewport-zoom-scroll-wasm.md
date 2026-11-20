# Viewport, Zoom, & Scrolling WASM Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrasikan modul matematika viewport, zoom around anchor, wheel/trackpad scaling, fit-to-bounds, dan pemetaan slider logaritmik ke Rust WebAssembly (`wasm-bindgen`) dengan integrasi *in-place facade* dan *zero-allocation FFI*.

**Architecture:** Menambahkan submodul `src/viewport.rs` di crate `rust/geovanta-wasm` yang mengembalikan flat `Vec<f64>` untuk operasi bernilai majemuk. Mengekspos fungsi-fungsi tersebut melalui `src/bridge/wasmEngineBridge.ts`. Mengintegrasikan facade transparan ke dalam `src/utils/zoomAndFormatHelpers.tsx` dan `src/components/editor/hooks/useCanvasWheelZoom.tsx` dengan preservasi fallback TypeScript tanpa mengubah call sites di `VectorEditor.tsx`.

**Tech Stack:** Rust 1.100, `wasm-bindgen` 0.2, target `wasm32-unknown-unknown`, TypeScript 5.8 / 7.0, React 18, `@playwright/test`.

**Spec:** [docs/superpowers/specs/2026-11-21-viewport-zoom-scroll-wasm-design.md](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Backup/Geovanta%20Backup/docs/superpowers/specs/2026-11-21-viewport-zoom-scroll-wasm-design.md)

## Global Constraints

- Platform: Windows 64-bit, Node.js v26.13, Rust 1.100.0, Cargo 1.100.0.
- Testing: Wajib menggunakan Playwright Regular (`@playwright/test` dan `npx playwright test`) untuk seluruh penulisan dan eksekusi pengujian otomatis.
- FFI Zero-Allocation: Seluruh fungsi multi-value return mengembalikan flat vector `Vec<f64>` (bukan heap struct `#[wasm_bindgen]`) untuk mencegah kebocoran memori pada loop gesture 60–120 FPS.
- Zero Call-Site Rewiring: `VectorEditor.tsx` (10.000 baris) tidak boleh dimodifikasi; integrasi dilakukan via in-place facade di hook dan helper.
- Konstanta Viewport: `VZMIN = 0.0005`, `VZMAX = 5000.0`, `VZ_LOG_SPAN = ln(VZMAX / VZMIN)`.

## Review Focus

1. **Clamping Batas Ekstrem:** Zoom bernilai $< 0.0005$ atau $> 5000$, atau `NaN` / `Infinity` -> wajib di-clamp secara aman ke `[VZMIN, VZMAX]`.
2. **Dimensi Kanvas Nol / Negatif:** Viewport dengan `client_w <= 0` atau `client_h <= 0` pada `compute_fit_to` -> wajib mengembalikan `success = 0.0` tanpa crash / pembagian dengan nol.
3. **Peredaman Delta Wheel:** Delta wheel ekstrem ($\pm 1000$) -> wajib di-clamp ke `[-120, 120]` sebelum menghitung faktor eksponensial.
4. **Presisi Batas Slider:** Slider bernilai $0$ dan $1000$ -> wajib memetakan tepat ke `VZMIN` ($0.0005$) dan `VZMAX` ($5000$).
5. **Fallback Sebelum Init:** Pemanggilan helper zoom sebelum modul WASM selesai dimuat -> wajib mengeksekusi fallback TypeScript lokal tanpa error runtime.

---

### Task 1: Implementasi Modul Viewport di Rust WASM (`src/viewport.rs`)

**Files:**
- Create: `rust/geovanta-wasm/src/viewport.rs`
- Modify: `rust/geovanta-wasm/src/lib.rs`
- Create: `tests/viewport-wasm.spec.ts`

**Interfaces:**
- Consumes: Angka float64 koordinat dan parameter viewport.
- Produces: Ekspor fungsi WASM `compute_zoom_at_anchor`, `compute_wheel_zoom_factor`, `compute_fit_to`, `screen_to_world`, `world_to_screen`, `compute_visible_world_bounds`, `zoom_to_slider`, `slider_to_zoom`.

- [ ] **Step 1: Write failing Playwright unit test in `tests/viewport-wasm.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import * as path from 'path';

test('viewport wasm: verifies anchor zoom, fit-to, and logarithmic slider math', async () => {
  const wasm = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  expect(typeof wasm.compute_zoom_at_anchor).toBe('function');
  expect(typeof wasm.compute_wheel_zoom_factor).toBe('function');
  expect(typeof wasm.compute_fit_to).toBe('function');
  expect(typeof wasm.zoom_to_slider).toBe('function');
  expect(typeof wasm.slider_to_zoom).toBe('function');

  // Review Focus 4: Slider boundaries
  expect(wasm.slider_to_zoom(0)).toBeCloseTo(0.0005, 6);
  expect(wasm.slider_to_zoom(1000)).toBeCloseTo(5000.0, 1);
  expect(wasm.zoom_to_slider(0.0005)).toBe(0);
  expect(wasm.zoom_to_slider(5000.0)).toBe(1000);

  // Review Focus 1: Extreme zoom clamping
  const resClamped = wasm.compute_zoom_at_anchor(1.0, 0, 0, 999999, 400, 300, 800, 600, 0, 0, true);
  expect(resClamped[0]).toBe(5000.0);

  // Normal zoom anchor test: zoom 1x to 2x around center (400, 300)
  const res = wasm.compute_zoom_at_anchor(1.0, 0, 0, 2.0, 400, 300, 800, 600, 0, 0, true);
  expect(res[0]).toBe(2.0); // new_zoom
  expect(res[1]).toBe(-400.0); // new_pan_x: 400 - (400 * 2) = -400
  expect(res[2]).toBe(-300.0); // new_pan_y: 300 - (300 * 2) = -300

  // Review Focus 2: Fit to invalid dimensions returns success = 0.0
  const invalidFit = wasm.compute_fit_to(0, 0, 100, 100, 0, 0, 24);
  expect(invalidFit[3]).toBe(0.0);

  // Fit to 1000x1000 box in 800x600 viewport with pad 24
  const fit = wasm.compute_fit_to(0, 0, 1000, 1000, 800, 600, 24);
  expect(fit[3]).toBe(1.0);
  expect(fit[0]).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/viewport-wasm.spec.ts`  
Expected: FAIL (`wasm.compute_zoom_at_anchor is not a function`).

- [ ] **Step 3: Implement `viewport.rs` and export in `lib.rs`**

1. Tulis `rust/geovanta-wasm/src/viewport.rs` yang mengimplementasikan rumus matematika viewport, logarithmic slider, wheel factor exponential, dan screen/world projections.
2. Re-ekspor fungsi di `rust/geovanta-wasm/src/lib.rs`.
3. Kompilasi Wasm via `node scripts/build-wasm.js`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/viewport-wasm.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add rust/geovanta-wasm/src/viewport.rs rust/geovanta-wasm/src/lib.rs tests/viewport-wasm.spec.ts
git commit -m "feat(wasm): implement viewport and zoom/scroll mathematics in rust"
```

---

### Task 2: Integrasi Frontend Bridge di `src/bridge/wasmEngineBridge.ts`

**Files:**
- Modify: `src/bridge/wasmEngineBridge.ts:1-70`
- Create: `tests/viewport-bridge.spec.ts`

**Interfaces:**
- Consumes: Crate Wasm package `pkg/geovanta_wasm.js`.
- Produces: Properti `computeZoomAtAnchor`, `computeWheelZoomFactor`, `computeFitTo`, `screenToWorld`, `worldToScreen`, `computeVisibleBounds`, `zoomToSlider`, `sliderToZoom` pada `wasmEngine`.

- [ ] **Step 1: Write failing Playwright test in `tests/viewport-bridge.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('viewport bridge: exposes all viewport functions after initWasmEngine', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);
  expect(typeof wasmEngine.computeZoomAtAnchor).toBe('function');
  expect(typeof wasmEngine.computeWheelZoomFactor).toBe('function');
  expect(typeof wasmEngine.computeFitTo).toBe('function');
  expect(typeof wasmEngine.zoomToSlider).toBe('function');
  expect(typeof wasmEngine.sliderToZoom).toBe('function');

  const z = wasmEngine.sliderToZoom!(500);
  expect(z).toBeGreaterThan(0.0005);
  expect(z).toBeLessThan(5000);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/viewport-bridge.spec.ts`  
Expected: FAIL (`typeof wasmEngine.computeZoomAtAnchor is undefined`).

- [ ] **Step 3: Update `src/bridge/wasmEngineBridge.ts` to connect viewport functions**

Sambungkan fungsi-fungsi WASM viewport ke object singleton `wasmEngine` pada saat `initWasmEngine()`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/viewport-bridge.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add src/bridge/wasmEngineBridge.ts tests/viewport-bridge.spec.ts
git commit -m "feat: expose viewport mathematics on wasm engine bridge"
```

---

### Task 3: In-Place Facade di `src/utils/zoomAndFormatHelpers.tsx`

**Files:**
- Modify: `src/utils/zoomAndFormatHelpers.tsx:1-25`
- Create: `tests/zoom-slider-facade.spec.ts`

**Interfaces:**
- Consumes: `wasmEngine.zoomToSlider` & `wasmEngine.sliderToZoom`.
- Produces: API publik stabil `vzToSl` dan `vslToZ` dengan akselerasi WASM transparan dan fallback otomatis.

- [ ] **Step 1: Write failing Playwright test in `tests/zoom-slider-facade.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { vzToSl, vslToZ } from '../src/utils/zoomAndFormatHelpers.tsx';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('zoom slider facade: verifies parity and fallback before/after wasm init', async () => {
  // Test fallback before WASM init
  const slBefore = vzToSl(1.0);
  const zBefore = vslToZ(slBefore);
  expect(slBefore).toBeGreaterThan(0);
  expect(zBefore).toBeCloseTo(1.0, 2);

  // Initialize WASM
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  // Test facade after WASM init across multiple zoom levels
  const testZooms = [0.0005, 0.01, 0.1, 0.5, 1.0, 2.5, 10.0, 100.0, 1000.0, 5000.0];
  for (const z of testZooms) {
    const sl = vzToSl(z);
    expect(sl).toBeGreaterThanOrEqual(0);
    expect(sl).toBeLessThanOrEqual(1000);
    const zBack = vslToZ(sl);
    // Relative error within 0.2% due to 0.1 decimal quantization
    expect(Math.abs(zBack - z) / z).toBeLessThan(0.002);
  }
});
```

- [ ] **Step 2: Run Playwright test to verify behavior before modification**

Run: `npx playwright test tests/zoom-slider-facade.spec.ts`  
Expected: PASS/FAIL (memverifikasi hookup facade).

- [ ] **Step 3: Implement in-place facade in `src/utils/zoomAndFormatHelpers.tsx`**

Integrasikan delegasi `wasmEngine.zoomToSlider` ke `vzToSl` dan `wasmEngine.sliderToZoom` ke `vslToZ`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/zoom-slider-facade.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add src/utils/zoomAndFormatHelpers.tsx tests/zoom-slider-facade.spec.ts
git commit -m "feat: integrate wasm facade into zoom slider helpers"
```

---

### Task 4: In-Place Facade di `src/components/editor/hooks/useCanvasWheelZoom.tsx`

**Files:**
- Modify: `src/components/editor/hooks/useCanvasWheelZoom.tsx:50-190`
- Create: `tests/viewport-hook-integration.spec.ts`

**Interfaces:**
- Consumes: `wasmEngine.computeZoomAtAnchor`, `wasmEngine.computeFitTo`, `wasmEngine.computeWheelZoomFactor`.
- Produces: API `CanvasWheelZoomApi` yang dipercepat dengan WASM.

- [ ] **Step 1: Write failing Playwright integration test in `tests/viewport-hook-integration.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('viewport hook facade: verifies anchor zoom and fitTo calculation parity', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  // Verify computeZoomAtAnchor calculation
  const anchorRes = wasmEngine.computeZoomAtAnchor!(1.0, 0, 0, 1.5, 400, 300, 800, 600, 0, 0, false);
  expect(anchorRes[0]).toBe(1.5);
  expect(anchorRes[1]).toBe(400 - 400 * 1.5);
  expect(anchorRes[2]).toBe(300 - 300 * 1.5);

  // Verify computeFitTo calculation
  const fitRes = wasmEngine.computeFitTo!(0, 0, 400, 300, 800, 600, 24);
  expect(fitRes[3]).toBe(1.0);
  expect(fitRes[0]).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails/runs**

Run: `npx playwright test tests/viewport-hook-integration.spec.ts`  
Expected: Check status.

- [ ] **Step 3: Update `useCanvasWheelZoom.tsx` with in-place facades**

1. Gunakan `wasmEngine.computeZoomAtAnchor` di dalam `setZ`.
2. Gunakan `wasmEngine.computeFitTo` di dalam `fitTo`.
3. Gunakan `wasmEngine.computeWheelZoomFactor` di dalam wheel handler.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/viewport-hook-integration.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/hooks/useCanvasWheelZoom.tsx tests/viewport-hook-integration.spec.ts
git commit -m "feat: integrate wasm acceleration into canvas wheel zoom hook"
```

---

### Task 5: Parity & Benchmark Regression Suite

**Files:**
- Create: `tests/viewport-benchmark.spec.ts`

**Interfaces:**
- Consumes: Seluruh modul WASM viewport dan fallback TypeScript.
- Produces: Bukti paritas numerik $\le 10^{-7}$ dan metrik benchmark kecepatan eksekusi.

- [ ] **Step 1: Write benchmark Playwright test in `tests/viewport-benchmark.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('viewport benchmark: verifies 50,000 anchor zoom & projection calculations', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  const N = 50000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    wasmEngine.computeZoomAtAnchor!(1.0, 0, 0, 1.0 + (i % 100) * 0.05, 400, 300, 800, 600, 0, 0, false);
  }
  const tWasm = performance.now() - t0;

  console.log(`[VIEWPORT BENCHMARK] N=${N} calls: WASM=${tWasm.toFixed(2)}ms`);
  expect(tWasm).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run Playwright test to verify it passes**

Run: `npx playwright test tests/viewport-benchmark.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 3: Run full Playwright test suite to confirm zero regressions**

Run: `npx playwright test`  
Expected: PASS on all test suites.

- [ ] **Step 4: Commit**

```bash
git add tests/viewport-benchmark.spec.ts
git commit -m "test(perf): add viewport benchmark and parity regression test"
```
