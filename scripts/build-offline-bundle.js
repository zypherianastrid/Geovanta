/**
 * Offline bundler untuk Geovanta Windows 64-Bit Desktop App
 *
 * 1. `esbuild` WAJIB terpasang (devDependency, lihat package.json + package-lock.json).
 *    Build GAGAL dengan pesan jelas bila esbuild tidak ditemukan — TIDAK ADA lagi
 *    fallback diam-diam ke bundle lama (P0-01: bundle lama bisa menyembunyikan
 *    patch source yang belum masuk ke installer).
 * 2. Kompilasi Tailwind CSS build-time (P1-01): `tailwindcss` CLI mengompilasi
 *    src/styles/tailwind.css -> dist/assets/tailwind.css (minify). `tailwindcss`
 *    WAJIB terpasang (dependency, lihat package.json); build GAGAL dengan pesan
 *    jelas bila CLI tidak ditemukan atau kompilasi gagal — sama seperti esbuild
 *    (P0-01): tidak ada fallback diam-diam ke CSS lama. CSS hasil build disalin
 *    ke web/assets/ bersama JS; bundle JS juga mengimpornya sebagai teks
 *    (esbuild loader '.css': 'text' di bawah) lalu menyuntikkannya sebagai
 *    <style> statis — runtime JIT/MutationObserver Tailwind sudah dihapus.
 * 3. Kompilasi ulang src/main.jsx (semua .jsx) ke dist/assets/geovanta.bundle.js
 * 4. Selalu menyalin index.html + bundle + tailwind.css ke folder terisolasi
 *    `web/` (dipakai Tauri sebagai frontendDist)
 *
 * Jalur resmi: npm ci  ->  npm run build:web  ->  cargo tauri build
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const distBundle = path.join(root, 'dist/assets/geovanta.bundle.js');
const distCss = path.join(root, 'dist/assets/tailwind.css');
const twInputCss = path.join(root, 'src/styles/tailwind.css');
const twCliJs = path.join(root, 'node_modules/tailwindcss/lib/cli.js');
const webDir = path.join(root, 'web');

function tryLoadEsbuild() {
  try { return require('esbuild'); } catch (e) { return null; }
}

(async () => {
  const esbuild = tryLoadEsbuild();
  if (!esbuild) {
    /* P0-01: GAGAL dengan pesan jelas — jangan pernah memakai bundle lama secara diam-diam. */
    throw new Error(
      'esbuild tidak ditemukan. Jalankan "npm ci" (atau "npm install") terlebih dahulu. ' +
      'Build dibatalkan agar bundle lama tidak menyembunyikan perubahan source terbaru.'
    );
  }
  console.log('[Geovanta Build] esbuild ditemukan, mengompilasi src/main.jsx ...');
  fs.mkdirSync(path.dirname(distBundle), { recursive: true });

  /* P1-01: Tailwind build-time — WAJIB berhasil sebelum esbuild, karena bundle
   * mengimpor dist/assets/tailwind.css sebagai teks. Gagal = build gagal. */
  if (!fs.existsSync(twCliJs)) {
    throw new Error(
      'tailwindcss CLI tidak ditemukan di node_modules/tailwindcss/lib/cli.js. ' +
      'Jalankan "npm ci" (atau "npm install") terlebih dahulu. ' +
      'Build dibatalkan agar CSS lama/tanpa-utility tidak menyembunyikan perubahan source terbaru.'
    );
  }
  if (!fs.existsSync(twInputCss)) {
    throw new Error('Input CSS Tailwind tidak ditemukan: ' + twInputCss);
  }
  console.log('[Geovanta Build] mengompilasi Tailwind CSS build-time ...');
  try {
    execFileSync(process.execPath, [
      twCliJs, '-c', path.join(root, 'tailwind.config.js'),
      '-i', twInputCss, '-o', distCss, '--minify'
    ], { cwd: root, stdio: 'pipe' });
  } catch (e) {
    throw new Error('Kompilasi Tailwind CSS gagal: ' + (e.stderr || e.stdout || e.message || e));
  }
  if (!fs.existsSync(distCss) || fs.statSync(distCss).size === 0) {
    throw new Error('CSS Tailwind tidak terbentuk: ' + distCss);
  }
  console.log(`[Geovanta Build] Tailwind CSS: ${(fs.statSync(distCss).size / 1024).toFixed(1)} KB -> dist/assets/tailwind.css`);

  await esbuild.build({
    entryPoints: [path.join(root, 'src/main.jsx')],
    outfile: distBundle,
    bundle: true,
    minify: true,
    format: 'iife',
    loader: { '.jsx': 'jsx', '.css': 'text' },
    jsx: 'transform',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  });

  if (!fs.existsSync(distBundle)) {
    throw new Error('Bundle tidak ditemukan: ' + distBundle);
  }

  // Folder terisolasi khusus untuk Tauri (tanpa node_modules / src-tauri)
  fs.rmSync(webDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(webDir, 'assets'), { recursive: true });
  fs.copyFileSync(distBundle, path.join(webDir, 'assets/geovanta.bundle.js'));
  fs.copyFileSync(distCss, path.join(webDir, 'assets/tailwind.css'));
  const html = fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace('./dist/assets/', './assets/');
  fs.writeFileSync(path.join(webDir, 'index.html'), html);

  const kb = (fs.statSync(distBundle).size / 1024).toFixed(1);
  const cssKb = (fs.statSync(distCss).size / 1024).toFixed(1);
  console.log(`[Geovanta Build] Selesai: bundle ${kb} KB + tailwind.css ${cssKb} KB -> dist/ dan web/`);
})().catch((e) => {
  console.error('[Geovanta Build] GAGAL:', e.message || e);
  process.exit(1);
});
