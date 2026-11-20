# GPU Editor Renderer Implementation Plan

**Goal:** Reduce blocking redraw time for color and angular gradient edits by using CanvasKit WebGL in the editor, with reliable CPU fallback.

**Architecture:** Keep raster export on its independent software surface. Give the editor separate GPU and CPU canvases, select the backend once per surface creation, and retry on CPU if GPU creation, drawing, or context fails. Preserve the current telemetry and screen pipette behavior.

**Tech stack:** React 18, CanvasKit 0.40, Tauri WebView2, Node tests.

**Spec:** User approved the GPU-first renderer with CPU fallback and before/after measurement in this chat.

## Tasks

- [x] Capture a reproducible CPU gradient benchmark before changing the renderer.
- [x] Add tests for GPU selection, CPU fallback, resize, context loss, and pipette sampling.
- [x] Implement GPU-first editor surfaces and CPU fallback without replacing React-owned DOM nodes.
- [x] Verify the test suite, offline build, and Rust check; rerun the benchmark and record limits of the comparison.

## Verification

- `npm test`: 45 tests passed.
- `npm run build:web`: passed.
- `cargo check` in `src-tauri`: passed.
- Chrome headless smoke test: editor activated GPU, imported an SVG radial gradient, switched to angular, then fell back to CPU after forced WebGL context loss. No render alerts appeared.
- Synthetic full-canvas angular gradient benchmark at 1280 × 800: CPU median 43–44 ms per frame before the change; GPU median about 0.1 ms in the final run. GPU timing measures JavaScript submission and `surface.flush()` in Chrome headless with SwiftShader, not display completion or WebView2 hardware performance. Treat it as evidence of lower main-thread blocking, not an end-user FPS estimate.
