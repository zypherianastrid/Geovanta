/**
 * Build Geovanta's offline browser and Tauri assets.
 * Without npm dependencies, stage the prebuilt assets shipped with the project.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const distAssets = path.join(root, 'dist', 'assets');
const webDir = path.join(root, 'web');
const assetNames = ['geovanta.bundle.js', 'canvaskit-runtime.js', 'canvaskit-LICENSE.txt',
  'text-font-runtime.js', 'IBM-Plex-LICENSE.txt'];

function findEsbuild() {
  try {
    return require('esbuild');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return null;
  }
}

function buildCanvasKit() {
  const entry = require.resolve('canvaskit-wasm/bin/canvaskit.js');
  const wasm = fs.readFileSync(require.resolve('canvaskit-wasm/bin/canvaskit.wasm'));
  // Supply bytes to CanvasKitInit without a fetch, including on the file:// origin.
  const loader = `
globalThis.initGeovantaCanvasKit = function () {
  const encoded = '${wasm.toString('base64')}';
  if (Uint8Array.fromBase64) return CanvasKitInit({wasmBinary: Uint8Array.fromBase64(encoded)});
  const decoded = atob(encoded);
  const wasmBinary = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) wasmBinary[i] = decoded.charCodeAt(i);
  return CanvasKitInit({wasmBinary});
};
`;
  fs.writeFileSync(path.join(distAssets, 'canvaskit-runtime.js'), fs.readFileSync(entry, 'utf8') + '\n' + loader);
  fs.copyFileSync(path.join(path.dirname(entry), '..', 'LICENSE'), path.join(distAssets, 'canvaskit-LICENSE.txt'));
}

function buildTextFonts() {
  const folder = path.join(root, 'src', 'assets', 'fonts');
  const styles = {regular: 'Regular', bold: 'Bold', italic: 'Italic', boldItalic: 'BoldItalic'};
  const payload = Object.fromEntries(Object.entries(styles).map(([key, style]) =>
    [key, fs.readFileSync(path.join(folder, `IBMPlexSans-${style}.ttf`)).toString('base64')]));
  const runtime = `
globalThis.GEOVANTA_BUNDLED_TEXT_FONT = {
  family: 'IBM Plex Sans',
  faces: Object.fromEntries(Object.entries(${JSON.stringify(payload)}).map(([key, value]) => {
    if (Uint8Array.fromBase64) return [key, Uint8Array.fromBase64(value)];
    const binary = atob(value);
    return [key, Uint8Array.from(binary, ch => ch.charCodeAt(0))];
  }))
};
`;
  fs.writeFileSync(path.join(distAssets, 'text-font-runtime.js'), runtime);
  fs.copyFileSync(path.join(folder, 'IBM-Plex-LICENSE.txt'), path.join(distAssets, 'IBM-Plex-LICENSE.txt'));
}

async function build() {
  const stagePrebuilt = process.argv.includes('--stage-prebuilt');
  const esbuild = stagePrebuilt ? null : findEsbuild();
  if (!esbuild && !stagePrebuilt) {
    throw new Error('esbuild tidak tersedia. Jalankan npm ci sebelum build:web, atau gunakan --stage-prebuilt untuk menyalin aset lama secara eksplisit.');
  }
  if (esbuild) {
    fs.mkdirSync(distAssets, {recursive: true});
    buildCanvasKit();
    buildTextFonts();
    await esbuild.build({
      entryPoints: [path.join(root, 'src', 'main.tsx')],
      outfile: path.join(distAssets, 'geovanta.bundle.js'),
      bundle: true,
      minify: true,
      format: 'iife',
      jsx: 'transform',
      define: {'process.env.NODE_ENV': '"production"'}
    });
    const engineEntry = path.join(root, 'scripts', 'mcp-server', 'engineBundleEntry.ts');
    if (fs.existsSync(engineEntry)) {
      await esbuild.build({
        entryPoints: [engineEntry],
        outfile: path.join(root, 'scripts', 'mcp-server', 'engineBundle.cjs'),
        bundle: true,
        platform: 'node',
        format: 'cjs',
        loader: {'.tsx': 'tsx', '.ts': 'ts', '.js': 'js'}
      });
    }
  }

  for (const name of assetNames) {
    if (!fs.existsSync(path.join(distAssets, name))) throw new Error('Aset tidak ditemukan: ' + name + '. Jalankan npm ci.');
  }
  const webAssets = path.join(webDir, 'assets');
  fs.mkdirSync(webAssets, {recursive: true});
  for (const name of assetNames) fs.copyFileSync(path.join(distAssets, name), path.join(webAssets, name));
  /* Cache-busting (2026-11-16): bundle di web/index.html memakai ?v=<md5>
     supaya browser tidak menyajikan bundle lama sesudah rebuild. */
  const bundleVer = require('node:crypto').createHash('md5').update(fs.readFileSync(path.join(distAssets, 'geovanta.bundle.js'))).digest('hex').slice(0, 8);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replaceAll('./dist/assets/', './assets/')
    .replaceAll('./assets/geovanta.bundle.js', './assets/geovanta.bundle.js?v=' + bundleVer);
  fs.writeFileSync(path.join(webDir, 'index.html'), html);
  console.log('[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/.');
}

build().catch(error => {
  console.error('[Geovanta Build] GAGAL:', error);
  process.exitCode = 1;
});
