// The packaged runtime supplies WASM bytes directly so file:// and Tauri work offline.
let runtime;
export function loadCanvasKit() {
  if (!runtime) runtime = Promise.resolve().then(() => globalThis.initGeovantaCanvasKit());
  return runtime;
}
