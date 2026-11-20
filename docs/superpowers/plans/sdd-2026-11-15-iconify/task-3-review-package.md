# Review package — Task 3: Hybrid icon client + unit tests

BASE: pre-Task 3 state (no iconifyClient.jsx, no iconify-client.test.cjs; baseline npm test 277/277).
HEAD: Task 3 as reported (new client + 14 tests, full suite 291/291, build exit 0).

## Files changed

- NEW `src/renderer/iconifyClient.jsx`
- NEW `tests/iconify-client.test.cjs`
- NEW `docs/superpowers/plans/sdd-2026-11-15-iconify/task-3-report.md`
- MODIFIED: none

## Full diff (new files in full)

### src/renderer/iconifyClient.jsx
```jsx
/**
 * @file src/renderer/iconifyClient.jsx
 * @description Klien hybrid Iconify (tanpa UI): cari + daftar koleksi lewat
 * API publik api.iconify.design, data ikon lewat CDN jsDelivr
 * (@iconify-json). Preseden fetch online: src/renderer/googleFonts.jsx.
 *
 * Kontrak (design §7 butir 0, 3, 5, 8, 10; plan Task 3):
 * - Host adalah konstanta tunggal; fetch hanya ke dua host ini.
 * - Search: GET /search?query={q}&limit=48 (+ &prefix= bila filter aktif).
 *   API punya halaman minimum 32 — jangan pernah meminta limit < 32.
 * - Set JSON dimuat malas per set, sekali per set per sesi (Map memori),
 *   dan ditolak bila > 10 MB.
 * - Timeout: 10 detik (search/koleksi), 30 detik (icons.json), 3 detik
 *   (probe /version, default probeOnline).
 * - Kegagalan offline (Task 2): fetch menolak dengan TypeError verbatim
 *   "Failed to fetch" tanpa host/URL/alasan — karena itu klien membedakan
 *   kegagalan dari KONTEKS pemanggilan (pesan per panggilan), bukan dari
 *   teks error. Non-OK HTTP juga diperlakukan sebagai jalur gagal
 *   (fetch hanya menolak saat gagal jaringan).
 * - Penolakan 10 MB (ruling R9): diukur dari UKURAN BODY TERAKUMULASI
 *   (byteLength arrayBuffer respons), BUKAN dari header Content-Length —
 *   jadi berlaku juga bila header tidak ada / tidak jujur.
 */

// Host tunggal — ganti di sini bila kelak pindah ke self-host (design §7.0).
export const ICONIFY_API_BASE = 'https://api.iconify.design';
export const ICONIFY_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@iconify-json';

const SEARCH_TIMEOUT_MS = 10 * 1000;
const COLLECTIONS_TIMEOUT_MS = 10 * 1000;
const LOAD_SET_TIMEOUT_MS = 30 * 1000;
const MAX_SET_BYTES = 10 * 1024 * 1024;
const MAX_ICON_SVG_BYTES = 256 * 1024;

// fetch dengan timeout sendiri (AbortController). Signal eksternal (bila
// diberikan) juga membatalkan request; abort eksternal diteruskan apa
// adanya (AbortError), timeout diubah menjadi Error berkode
// ICONIFY_TIMEOUT agar pemanggil bisa membedakannya dari abort user.
async function fetchWithTimeout(url, timeoutMs, externalSignal) {
  let timedOut = false;
  const controller = new AbortController();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  let onExternalAbort = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      throw externalSignal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
    }
    onExternalAbort = () => controller.abort();
    externalSignal.addEventListener('abort', onExternalAbort, {once: true});
  }
  try {
    return await globalThis.fetch(url, {signal: controller.signal});
  } catch (e) {
    if (timedOut) {
      const err = new Error(`Permintaan kehabisan waktu (${timeoutMs / 1000} detik)`);
      err.code = 'ICONIFY_TIMEOUT';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (externalSignal && onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

// Cari ikon lintas set. Mengembalikan ikon sebagai objek
// {name, prefix, palette, license} (palette/license dari koleksi respons).
export async function searchIcons(query, {prefix, limit = 48, start = 0, signal} = {}) {
  const q = String(query ?? '').trim();
  if (!q) throw new Error('Kata kunci pencarian ikon kosong');
  const params = new URLSearchParams({query: q, limit: String(limit)});
  if (start) params.set('start', String(start));
  if (prefix) params.set('prefix', String(prefix).trim());
  const url = `${ICONIFY_API_BASE}/search?${params.toString()}`;
  let res;
  try {
    res = await fetchWithTimeout(url, SEARCH_TIMEOUT_MS, signal);
  } catch (e) {
    if (e?.code === 'ICONIFY_TIMEOUT') throw new Error('Pencarian ikon kehabisan waktu (10 detik)');
    if (e?.name === 'AbortError') throw e;
    throw new Error('Perlu internet untuk mencari ikon');
  }
  if (!res.ok) throw new Error(`Pencarian ikon gagal (HTTP ${res.status})`);
  const data = await res.json();
  const collections = data?.collections ?? {};
  const icons = (Array.isArray(data?.icons) ? data.icons : []).map((full) => {
    const name = String(full);
    const pfx = name.includes(':') ? name.split(':')[0] : String(prefix ?? '');
    const col = collections[pfx] || {};
    return {name, prefix: pfx, palette: col.palette === true, license: col.license ?? null};
  });
  return {
    icons,
    total: data?.total ?? icons.length,
    limit: data?.limit ?? limit,
    start: data?.start ?? start,
    collections
  };
}

// Daftar koleksi, diambil sekali per sesi (promise di-memoize; bila gagal,
// cache dibersihkan agar percobaan berikutnya mencoba lagi).
let collectionsPromise = null;
export function listCollections() {
  if (!collectionsPromise) {
    collectionsPromise = (async () => {
      let res;
      try {
        res = await fetchWithTimeout(`${ICONIFY_API_BASE}/collections`, COLLECTIONS_TIMEOUT_MS);
      } catch (e) {
        if (e?.code === 'ICONIFY_TIMEOUT') throw new Error('Memuat daftar koleksi ikon kehabisan waktu (10 detik)');
        if (e?.name === 'AbortError') throw e;
        throw new Error('Perlu internet untuk memuat daftar koleksi ikon');
      }
      if (!res.ok) throw new Error(`Gagal memuat daftar koleksi ikon (HTTP ${res.status})`);
      const data = await res.json();
      const entries = Array.isArray(data)
        ? data.map((c) => [c?.prefix, c])
        : Object.entries(data ?? {});
      return entries.map(([pfx, c]) => ({
        prefix: pfx,
        name: c?.name ?? pfx,
        total: c?.total ?? 0,
        license: c?.license ?? null,
        palette: c?.palette === true
      }));
    })();
    collectionsPromise.catch(() => { collectionsPromise = null; });
  }
  return collectionsPromise;
}

// Muat satu set JSON dari CDN, sekali per set per sesi (Map memori; bila
// gagal, entri dibersihkan agar percobaan berikutnya mencoba lagi).
// Menolak bila body > 10 MB (diukur dari byteLength arrayBuffer — R9)
// atau bila 30 detik tidak selesai.
const setCache = new Map();

async function loadSetUncached(pfx) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(pfx)) throw new Error(`Prefix set ikon tidak valid: ${pfx}`);
  const url = `${ICONIFY_CDN_BASE}/${pfx}/icons.json`;
  let res;
  try {
    res = await fetchWithTimeout(url, LOAD_SET_TIMEOUT_MS);
  } catch (e) {
    if (e?.code === 'ICONIFY_TIMEOUT') throw new Error(`Memuat set ikon "${pfx}" kehabisan waktu (30 detik)`);
    if (e?.name === 'AbortError') throw e;
    throw new Error(`Perlu internet untuk memuat set ikon "${pfx}"`);
  }
  if (!res.ok) throw new Error(`Gagal memuat set ikon "${pfx}" (HTTP ${res.status})`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_SET_BYTES) throw new Error(`Set ikon "${pfx}" terlalu besar (maksimal 10 MB)`);
  const data = JSON.parse(new TextDecoder().decode(buf));
  return {prefix: data?.prefix ?? pfx, width: data?.width ?? 24, height: data?.height ?? 24, icons: data?.icons ?? {}};
}

export function loadSet(prefix) {
  const pfx = String(prefix ?? '').trim();
  if (!pfx) return Promise.reject(new Error('Prefix set ikon kosong'));
  if (!setCache.has(pfx)) {
    const p = loadSetUncached(pfx);
    setCache.set(pfx, p);
    p.catch(() => { if (setCache.get(pfx) === p) setCache.delete(pfx); });
  }
  return setCache.get(pfx);
}

// Rakit string SVG satu ikon dari set yang sudah dimuat
// (design §7.4 / §6 A1). Nama boleh "home" atau "mdi:home".
// Menolak SVG > 256 KB (design §7.10).
export function buildIconSvg(name, setData) {
  const full = String(name ?? '').trim();
  const short = full.includes(':') ? full.split(':').slice(1).join(':') : full;
  const entry = setData?.icons?.[short] ?? setData?.icons?.[full];
  if (!entry?.body) throw new Error(`Ikon tidak ditemukan di set: ${full}`);
  const width = setData?.width ?? 24;
  const height = setData?.height ?? 24;
  const svg = `<svg viewBox="0 0 ${width} ${height}">${entry.body}</svg>`;
  if (new TextEncoder().encode(svg).length > MAX_ICON_SVG_BYTES) {
    throw new Error(`SVG ikon "${full}" terlalu besar (maksimal 256 KB)`);
  }
  return svg;
}

// true bila ikon multi-warna (design §7.5): flag palette koleksi true,
// ATAU body mengandung fill eksplisit selain currentColor. fill="none"
// (ikon stroke-based, mis. tabler) dan fill="currentColor" BUKAN warna
// eksplisit — ikon seperti itu tetap monokrom. `icon` boleh objek hasil
// searchIcons ({name, prefix, palette}) atau string nama; `setData`
// boleh set hasil loadSet (atau null bila body tidak tersedia).
export function isPaletteIcon(icon, setData) {
  if (icon && typeof icon === 'object' && icon.palette === true) return true;
  if (setData && typeof setData === 'object' && setData.palette === true) return true;
  const full = typeof icon === 'string' ? icon : icon?.name;
  const short = typeof full === 'string' && full.includes(':')
    ? full.split(':').slice(1).join(':')
    : full;
  const body = setData?.icons?.[short]?.body
    ?? setData?.icons?.[full]?.body
    ?? (icon && typeof icon === 'object' ? icon.body : null)
    ?? '';
  return hasExplicitFill(body);
}

function hasExplicitFill(body) {
  const values = [];
  const attrRe = /fill\s*=\s*["']([^"']*)["']/gi;
  const styleRe = /fill\s*:\s*([^;'"}\s]+)/gi;
  let m;
  while ((m = attrRe.exec(body)) !== null) values.push(m[1]);
  while ((m = styleRe.exec(body)) !== null) values.push(m[1]);
  return values.some((v) => {
    const val = String(v).trim().toLowerCase();
    return val !== '' && val !== 'currentcolor' && val !== 'none'
      && val !== 'transparent' && val !== 'inherit';
  });
}

// Probe ringan: GET /version. true hanya bila HTTP OK; false untuk
// timeout, gagal jaringan, atau status non-OK. Tidak pernah melempar.
export async function probeOnline(timeoutMs = 3000) {
  try {
    const res = await fetchWithTimeout(`${ICONIFY_API_BASE}/version`, timeoutMs);
    return res.ok === true;
  } catch (e) {
    return false;
  }
}
```

### tests/iconify-client.test.cjs
```javascript
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Pola pemuat yang sama dengan tests/google-fonts.test.cjs: bundel modul
// .jsx lewat esbuild lalu compile sebagai CommonJS. Modul dimuat FRESH
// per tes (bukan sekali di atas file) karena listCollections/loadSet
// di-memoize per sesi — cache antar tes akan mengotori hitungan fetch.
function loadModule(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const code = esbuild.buildSync({
    entryPoints: [filename],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    external: ['react', 'react-dom', 'react-dom/server'],
    loader: {'.jsx': 'jsx', '.js': 'js'}
  }).outputFiles[0].text;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(code, filename);
  return mod.exports;
}

const fresh = () => loadModule('src/renderer/iconifyClient.jsx');

const API = 'https://api.iconify.design';
const CDN = 'https://cdn.jsdelivr.net/npm/@iconify-json';

function installFetch(t, impl) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  t.after(() => { globalThis.fetch = orig; });
}

function jsonResponse(data, {ok = true, status = 200} = {}) {
  return {ok, status, headers: {get: () => null}, json: async () => data};
}

function setJsonResponse(setData) {
  const bytes = new TextEncoder().encode(JSON.stringify(setData));
  return {
    ok: true,
    status: 200,
    headers: {get: () => null},
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  };
}

const SEARCH_BODY = {
  icons: ['mdi:home', 'material-symbols:home'],
  total: 2,
  limit: 48,
  start: 0,
  collections: {
    mdi: {name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false},
    'material-symbols': {name: 'Material Symbols', total: 12000, license: 'Apache-2.0', palette: false}
  }
};

const MDI_SET = {
  prefix: 'mdi',
  width: 24,
  height: 24,
  icons: {home: {body: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/>'}}
};

test('searchIcons("home") memanggil URL search persis + mem-parse ikon (nama, prefix, palette, license)', async (t) => {
  const mod = fresh();
  const urls = [];
  installFetch(t, async (url) => { urls.push(url); return jsonResponse(SEARCH_BODY); });
  const res = await mod.searchIcons('home');
  assert.deepEqual(urls, [`${API}/search?query=home&limit=48`]);
  assert.equal(res.total, 2);
  assert.equal(res.limit, 48);
  assert.equal(res.start, 0);
  assert.deepEqual(res.icons, [
    {name: 'mdi:home', prefix: 'mdi', palette: false, license: 'Apache-2.0'},
    {name: 'material-symbols:home', prefix: 'material-symbols', palette: false, license: 'Apache-2.0'}
  ]);
  assert.equal(res.collections.mdi.name, 'Material Design Icons');
});

test('searchIcons("home", {prefix: "mdi"}) menambahkan &prefix=mdi; start non-nol menambahkan &start=', async (t) => {
  const mod = fresh();
  const urls = [];
  installFetch(t, async (url) => { urls.push(url); return jsonResponse(SEARCH_BODY); });
  await mod.searchIcons('home', {prefix: 'mdi'});
  await mod.searchIcons('home', {start: 48});
  assert.deepEqual(urls, [
    `${API}/search?query=home&limit=48&prefix=mdi`,
    `${API}/search?query=home&limit=48&start=48`
  ]);
});

test('searchIcons menolak dengan pesan offline saat fetch melempar TypeError (bukan string error mentah)', async (t) => {
  const mod = fresh();
  installFetch(t, async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(() => mod.searchIcons('home'), /Perlu internet untuk mencari ikon/);
});

test('listCollections() fetch /collections sekali untuk dua panggilan (memoize per sesi)', async (t) => {
  const mod = fresh();
  let calls = 0;
  const urls = [];
  installFetch(t, async (url) => {
    calls += 1;
    urls.push(url);
    return jsonResponse({
      mdi: {name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false},
      tabler: {name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false}
    });
  });
  const a = await mod.listCollections();
  const b = await mod.listCollections();
  assert.equal(calls, 1);
  assert.deepEqual(urls, [`${API}/collections`]);
  assert.deepEqual(a, [
    {prefix: 'mdi', name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false},
    {prefix: 'tabler', name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false}
  ]);
  assert.deepEqual(b, a);
});

test('loadSet("mdi") fetch icons.json CDN sekali untuk dua panggilan + mengembalikan width/height/icons', async (t) => {
  const mod = fresh();
  let calls = 0;
  const urls = [];
  installFetch(t, async (url) => {
    calls += 1;
    urls.push(url);
    return setJsonResponse(MDI_SET);
  });
  const a = await mod.loadSet('mdi');
  const b = await mod.loadSet('mdi');
  assert.equal(calls, 1);
  assert.deepEqual(urls, [`${CDN}/mdi/icons.json`]);
  assert.equal(a.prefix, 'mdi');
  assert.equal(a.width, 24);
  assert.equal(a.height, 24);
  assert.equal(a.icons.home.body, MDI_SET.icons.home.body);
  assert.equal(b, a);
});

test('loadSet menolak saat respons melebihi 10 MB (ukuran body terakumulasi)', async (t) => {
  const mod = fresh();
  installFetch(t, async () => ({
    ok: true,
    status: 200,
    headers: {get: () => null},
    arrayBuffer: async () => new ArrayBuffer(10 * 1024 * 1024 + 1)
  }));
  await assert.rejects(() => mod.loadSet('mdi'), /terlalu besar.*10 MB/i);
});

test('loadSet menolak saat fetch tidak pernah resolve (timeout 30 detik, fake timers)', async (t) => {
  const mod = fresh();
  t.mock.timers.enable({apis: ['setTimeout']});
  t.after(() => t.mock.timers.reset());
  installFetch(t, async (_url, {signal} = {}) => new Promise((_resolve, reject) => {
    if (signal) {
      signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), {once: true});
    }
    // Tidak pernah resolve sendiri — hanya abort dari timeout yang mengakhirinya.
  }));
  const pending = assert.rejects(() => mod.loadSet('mdi'), /kehabisan waktu.*30 detik/i);
  t.mock.timers.tick(30000); // sinkron: memicu AbortController, lalu await di bawah menguras microtask
  await pending;
});

test('loadSet menolak saat HTTP tidak OK (404)', async (t) => {
  const mod = fresh();
  installFetch(t, async () => ({ok: false, status: 404, headers: {get: () => null}, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0)}));
  await assert.rejects(() => mod.loadSet('tidak-ada'), /HTTP 404/);
});

test('buildIconSvg("home", setData) mengembalikan SVG berisi body + viewBox set', (t) => {
  const mod = fresh();
  const svg = mod.buildIconSvg('home', MDI_SET);
  assert.equal(svg, '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>');
  // Nama lengkap "prefix:nama" juga diterima.
  assert.equal(mod.buildIconSvg('mdi:home', MDI_SET), svg);
  assert.throws(() => mod.buildIconSvg('tidak-ada', MDI_SET), /tidak ditemukan/i);
});

test('buildIconSvg menolak SVG ikon > 256 KB', (t) => {
  const mod = fresh();
  const bigSet = {prefix: 'x', width: 24, height: 24, icons: {big: {body: `<path d="${'M0 0h1 '.repeat(40000)}"/>`}}};
  assert.throws(() => mod.buildIconSvg('big', bigSet), /terlalu besar.*256 KB/i);
});

test('isPaletteIcon: true untuk palette:true dan untuk fill="#ff0000"; false untuk currentColor-only / fill="none"', (t) => {
  const mod = fresh();
  // Flag palette koleksi menang tanpa perlu body.
  assert.equal(mod.isPaletteIcon({name: 'x:logo', prefix: 'x', palette: true}, MDI_SET), true);
  // Body dengan fill eksplisit selain currentColor.
  const colorSet = {prefix: 'x', width: 24, height: 24, icons: {logo: {body: '<path d="M0 0h1" fill="#ff0000"/>'}}};
  assert.equal(mod.isPaletteIcon({name: 'x:logo', prefix: 'x', palette: false}, colorSet), true);
  // Body currentColor-only di koleksi non-palette.
  assert.equal(mod.isPaletteIcon({name: 'mdi:home', prefix: 'mdi', palette: false}, MDI_SET), false);
  // Body fill="none" (ikon stroke-based, mis. tabler) bukan ikon palette.
  const strokeSet = {prefix: 'tabler', width: 24, height: 24, icons: {home: {body: '<g fill="none" stroke="currentColor" stroke-width="2"><path d="M0 0h1"/></g>'}}};
  assert.equal(mod.isPaletteIcon({name: 'tabler:home', prefix: 'tabler', palette: false}, strokeSet), false);
});

test('searchIcons meneruskan AbortError saat signal eksternal dibatalkan', async (t) => {
  const mod = fresh();
  installFetch(t, async (_url, {signal} = {}) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), {once: true});
  }));
  const controller = new AbortController();
  const pending = assert.rejects(
    () => mod.searchIcons('home', {signal: controller.signal}),
    (e) => e.name === 'AbortError'
  );
  controller.abort();
  await pending;
});

test('loadSet mencoba lagi setelah gagal (cache gagal tidak dipertahankan)', async (t) => {
  const mod = fresh();
  let calls = 0;
  installFetch(t, async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('Failed to fetch');
    return setJsonResponse(MDI_SET);
  });
  await assert.rejects(() => mod.loadSet('mdi'), /Perlu internet untuk memuat set ikon/);
  const res = await mod.loadSet('mdi');
  assert.equal(calls, 2);
  assert.equal(res.prefix, 'mdi');
});

test('probeOnline mengembalikan false saat fetch reject; true saat /version OK', async (t) => {
  const mod = fresh();
  const urls = [];
  installFetch(t, async (url) => {
    urls.push(url);
    throw new TypeError('Failed to fetch');
  });
  assert.equal(await mod.probeOnline(), false);
  assert.deepEqual(urls, [`${API}/version`]);

  const mod2 = fresh();
  installFetch(t, async () => ({ok: true, status: 200}));
  assert.equal(await mod2.probeOnline(), true);
});
```
