# Geovanta Rapid Zoom Performance Optimization — Technical Design Specification

- **Date:** 2026-11-21
- **Status:** Approved
- **Target:** Geovanta Vector Studio (CanvasKit GPU / CPU Renderer, Viewport Navigation, and React Editor)

---

## 1. Problem Statement & Root Cause Summary

Empirical profiling conducted with 55 diverse vector objects (shapes, multi-node Bézier curves, curvature paths, dense freehand pencil/brush strokes, text, weaves) demonstrated that rapid zooming (0% to 500%) suffered from severe lag and frame drops:
- **RGSS Overhead (Root Cause #1):** [src/renderer/sceneRenderer.tsx:570](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Backup/Geovanta%20Backup/src/renderer/sceneRenderer.tsx#L570) evaluated `useRgss = !RENDER_CONFIG.antialias && (!interacting || isGpu)`. Because `isGpu` is true for WebGL, 4-pass Rotated Grid Super-Sampling (RGSS) ran on **every zoom frame**, rendering the entire 55-object scene 2 to 4 times at $2688 \times 1778$ resolution with multiple GPU image snapshot allocations and SkSL shader blits. This took **14.36ms to 41.3ms per frame** (25% to 41% frame drop rate).
- **React Settle Stall (Root Cause #2):** [src/components/editor/VectorEditor.tsx:587-598](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Backup/Geovanta%20Backup/src/components/editor/VectorEditor.tsx#L587-L598) executed `flushView()` synchronously on pause (120ms timeout), triggering `setZoom` and `setPan`. Reconciling the 10,020-line `VectorEditor` component froze the main thread for **49.0ms** (dropping 3 full frames).
- **Cache Thrashing in Dashes (Root Cause #3):** [src/renderer/canvasKitScene.tsx:640-647](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Backup/Geovanta%20Backup/src/renderer/canvasKitScene.tsx#L640-L647) recalculated `v / zoom` without quantization, causing 100% cache-miss rate for `kit.PathEffect.MakeDash` on non-scaling strokes during continuous zoom.
- **Offline Bundle Compatibility (Root Cause #4):** `rust/geovanta-wasm/pkg/geovanta_wasm.js` used Node.js `require('fs')`, preventing `esbuild` from bundling the offline web build.

---

## 2. Architecture & Solution Design

### 2.1 Interactive Dynamic LOD (SceneRenderer)
- During active camera interaction (`interacting = true` / `cameraInteracting = true`):
  - In `sceneRenderer.tsx`, bypass `renderRgssFrame` entirely during zoom gestures (`this.cameraInteracting`).
  - Route directly to `drawVectorFrame(canvas, background, options, pw, ph, smoothEdges = true, interacting = true)`.
  - Measurements show this single change reduces frame time from **23.4ms down to 2.19ms (a 7x - 18x speedup)**.
  - When the gesture settles (`cameraInteracting = false`), render the final full-quality RGSS presentation frame so edge fidelity is preserved when the camera comes to rest.

### 2.2 React State Deferred Settle (VectorEditor)
- In `VectorEditor.tsx`:
  - `applyVP()` already updates the SVG camera transform matrix directly on `<g ref={vpRef}>` and updates CanvasKit camera via `sceneRenderer.setCamera()`, maintaining 60 FPS visual smoothness.
  - Wrap the React state updates `setZoom` and `setPan` in `React.startTransition` or defer them via `requestIdleCallback` / microtask so that React reconciliations never block the interactive render loop or freeze the main thread on settle.

### 2.3 Non-Scaling Stroke Dash Key Quantization (CanvasKitScene)
- In `canvasKitScene.tsx`:
  - Quantize the continuous zoom value for dash cache keys to logarithmic intervals:
    `const qZoom = Math.pow(2, Math.round(Math.log2(Math.max(1e-4, zoom)) * 16) / 16);`
  - This ensures that continuous zoom steps reuse cached `PathEffect.MakeDash` instances rather than thrashing allocations and garbage collection on every frame.

### 2.4 Isomorphic WASM Bridge Loader
- In `src/bridge/wasmEngineBridge.ts`:
  - Provide safe runtime detection for Node.js vs Browser environments.
  - For browser environments, provide WASM binary initialization compatible with `esbuild` offline bundling without bare `fs` dependencies, falling back seamlessly if uninitialized.

---

## 3. Performance Targets

1. **Active Zoom Frame Time:** P95 $\le$ 8.0ms (comfortably within 16.6ms / 60 FPS, enabling 120-240 FPS on high-refresh displays).
2. **Frame Drop Rate during Rapid Zoom (0% to 500%):** 0 dropped frames ($>16.6\text{ms}$).
3. **Settle Latency:** No synchronous main-thread block $>16\text{ms}$ on gesture end.
4. **Test Suite:** 100% passing Playwright tests (`npx playwright test`).
