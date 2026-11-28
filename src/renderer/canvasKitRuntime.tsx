// The packaged runtime supplies WASM bytes directly so file:// and Tauri work offline,
// while http(s) origins (including Capacitor Android) stream canvaskit.wasm lazily on editor entry.
declare const __GEOVANTA_FONT_RUNTIME_VER__: string | undefined;
const loadedScripts = new Map<string, Promise<void>>();
let runtime: Promise<any> | null = null;
const FONT_RUNTIME_VER = typeof __GEOVANTA_FONT_RUNTIME_VER__ !== 'undefined' ? __GEOVANTA_FONT_RUNTIME_VER__ : '';

function loadScriptOnce(src: string): Promise<void> {
  const existing = loadedScripts.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined' || !document.head) {
      reject(new Error(`Cannot load script ${src} without document`));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadedScripts.delete(src);
      reject(new Error(`Failed to load script ${src}`));
    };
    document.head.appendChild(script);
  });
  loadedScripts.set(src, promise);
  return promise;
}

export function ensureBundledTextFonts(): Promise<void> {
  const bundled = (globalThis as any).GEOVANTA_BUNDLED_TEXT_FONT;
  if (bundled && bundled.family === 'Geovanta Sans' && bundled.faces?.regular) {
    return Promise.resolve();
  }
  const src = FONT_RUNTIME_VER
    ? `./assets/text-font-runtime.js?v=${FONT_RUNTIME_VER}`
    : './assets/text-font-runtime.js';
  return loadScriptOnce(src).catch(() => {});
}

async function initCanvasKitRuntime(): Promise<any> {
  const g = globalThis as any;
  if (typeof g.initGeovantaCanvasKit === 'function') {
    return g.initGeovantaCanvasKit();
  }
  const isHttpLike = typeof location !== 'undefined' &&
    (location.protocol === 'http:' || location.protocol === 'https:');
  if (isHttpLike) {
    try {
      await loadScriptOnce('./assets/canvaskit.js');
      if (typeof g.CanvasKitInit === 'function') {
        return await g.CanvasKitInit({
          locateFile: (file: string) => './assets/' + file,
        });
      }
    } catch (_) {
      // Fall back to base64 inline runtime if streaming WASM fails (e.g. strict WebView origin).
    }
  }
  await loadScriptOnce('./assets/canvaskit-runtime.js');
  if (typeof g.initGeovantaCanvasKit === 'function') {
    return g.initGeovantaCanvasKit();
  }
  throw new Error('CanvasKit runtime gagal dimuat');
}

export function loadCanvasKit() {
  if (!runtime) {
    runtime = Promise.all([initCanvasKitRuntime(), ensureBundledTextFonts()])
      .then(([kit]) => {
        (globalThis as any).__geovantaCanvasKit = kit;
        return kit;
      })
      .catch(err => {
        runtime = null;
        throw err;
      });
  }
  return runtime;
}
