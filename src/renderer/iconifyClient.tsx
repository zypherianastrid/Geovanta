/**
 * @file src/renderer/iconifyClient.tsx
 * @description Klien hybrid Iconify (tanpa UI): cari + daftar koleksi lewat
 * API publik api.iconify.design, data ikon lewat CDN jsDelivr
 * (@iconify-json). Preseden fetch online: src/renderer/googleFonts.tsx.
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
const MAX_ICON_SVG_BYTES = 256 * 1024;

// fetch dengan timeout sendiri (AbortController). Signal eksternal (bila
// diberikan) juga membatalkan request; abort eksternal diteruskan apa
// adanya (AbortError), timeout diubah menjadi Error berkode
// ICONIFY_TIMEOUT agar pemanggil bisa membedakannya dari abort user.
async function fetchWithTimeout(url, timeoutMs, externalSignal: any = null) {
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
      const err: any = new Error(`Permintaan kehabisan waktu (${timeoutMs / 1000} detik)`);
      err.code = 'ICONIFY_TIMEOUT';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (externalSignal && onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

export interface SearchIconsOptions {
  prefix?: string;
  category?: string;
  collections?: any[];
  limit?: number;
  start?: number;
  signal?: AbortSignal;
  [key: string]: any;
}

// Cari ikon lintas set. Mengembalikan ikon sebagai objek
// {name, prefix, palette, license} (palette/license dari koleksi respons).
export async function searchIcons(query: any, {prefix, limit = 48, start = 0, signal}: SearchIconsOptions = {}) {
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
    return {name, prefix: pfx, palette: col.palette === true, license: typeof col.license === 'string' ? col.license : (col.license?.spdx || col.license?.title || null)};
  });
  return {
    icons,
    total: data?.total ?? icons.length,
    limit: data?.limit ?? limit,
    start: data?.start ?? start,
    collections
  };
}

// Cari ikon terfilter kategori (modal Iconify, Task 1). `category` adalah
// string kategori mentah dari API, atau sentinel '__other__' untuk koleksi
// tanpa kategori (ruling R1 — jangan bandingkan dengan label display
// "Lainnya"/"Other" yang bergantung bahasa). Tanpa kategori: delegasi satu
// halaman searchIcons. Dengan kategori: loop halaman demi halaman sampai
// `limit` kecocokan terkumpul atau `start >= total` API. AbortError
// diteruskan apa adanya; error lain memakai pesan kontekstual searchIcons.
export async function searchIconsFiltered(query: any, {category, collections, limit = 48, start = 0, signal}: SearchIconsOptions = {}) {
  if (!category) {
    const {icons, total} = await searchIcons(query, {limit, start, signal});
    return {icons, total, exhausted: (start + icons.length) >= total};
  }
  const allowedPrefixes = new Set(
    (Array.isArray(collections) ? collections : [])
      .filter((c) => (category === '__other__' ? !c?.category : c?.category === category))
      .map((c) => c.prefix)
  );
  const matched = [];
  let apiStart = 0;
  let total = Infinity;
  const targetEnd = start + limit;
  const CHUNK = Math.max(limit, 48);
  while (matched.length < targetEnd && apiStart < total) {
    const page = await searchIcons(query, {limit: CHUNK, start: apiStart, signal});
    total = page.total ?? page.icons.length;
    for (const icon of page.icons) {
      if (allowedPrefixes.has(icon.prefix)) matched.push(icon);
    }
    apiStart += CHUNK;
  }
  const pageIcons = matched.slice(start, targetEnd);
  return {icons: pageIcons, total: matched.length, exhausted: apiStart >= total};
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
        license: typeof c?.license === 'string' ? c.license : (c?.license?.spdx || c?.license?.title || null),
        palette: c?.palette === true,
        category: c?.category ?? null
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
  const data = JSON.parse(new TextDecoder().decode(buf));
  return {
    prefix: data?.prefix ?? pfx,
    width: data?.width ?? 24,
    height: data?.height ?? 24,
    icons: data?.icons ?? {},
    aliases: data?.aliases ?? {},
    left: data?.left,
    top: data?.top,
    palette: data?.palette
  };
}

export function resolveIconEntry(name, setData) {
  if (!setData) return null;
  const full = String(name ?? '').trim();
  if (!full) return null;
  const short = full.includes(':') ? full.split(':').slice(1).join(':') : full;

  // 1. Direct match in icons
  if (setData.icons?.[short]) return { name: short, entry: setData.icons[short] };
  if (setData.icons?.[full]) return { name: full, entry: setData.icons[full] };

  // 2. Resolve via aliases chain
  const visited = new Set();
  let currentKey = setData.aliases?.[short] ? short : (setData.aliases?.[full] ? full : null);
  let depth = 0;
  while (currentKey && depth < 20) {
    if (visited.has(currentKey)) break; // cycle protection
    visited.add(currentKey);
    const aliasObj = setData.aliases?.[currentKey];
    if (!aliasObj || !aliasObj.parent) break;
    const parentKey = aliasObj.parent;
    if (setData.icons?.[parentKey]) {
      return {
        name: parentKey,
        entry: {
          ...setData.icons[parentKey],
          ...aliasObj,
          body: aliasObj.body || setData.icons[parentKey].body,
        }
      };
    }
    // Chained alias
    currentKey = parentKey;
    depth++;
  }
  return null;
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
// xmlns WAJIB: string ini dipakai dua jalur — VE.parseSVG (sisip,
// tidak butuh xmlns) dan <img src="data:image/svg+xml,...">
// (thumbnail panel). Tanpa xmlns, Chromium gagal parse SVG sebagai
// dokumen gambar (naturalWidth 0 → ikon rusak semua), padahal sisip
// tetap jalan. Bug laporan user 2026-11-15, probe
// probes/probe-iconify-thumb.cjs (THUMB-1/2: 48/48 + 38/38 rusak
// sebelum fix). Spike 1/2 sudah memakai xmlns — produksi yang lupa.
export function buildIconSvg(name, setData) {
  const full = String(name ?? '').trim();
  const resolved = resolveIconEntry(full, setData);
  const entry = resolved?.entry;
  if (!entry?.body) throw new Error(`Ikon tidak ditemukan di set: ${full}`);
  const left = entry.left ?? setData?.left ?? 0;
  const top = entry.top ?? setData?.top ?? 0;
  const width = entry.width ?? setData?.width ?? 24;
  const height = entry.height ?? setData?.height ?? 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}">${entry.body}</svg>`;
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
  const resolved = resolveIconEntry(full, setData);
  const body = resolved?.entry?.body
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
