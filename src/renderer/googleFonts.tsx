/**
 * @file src/renderer/googleFonts.tsx
 * @description Katalog Google Fonts (bundel statis, 1.968 keluarga) + embed otomatis:
 * memilih keluarga di picker mengunduh file TTF-nya (latin), mendaftarkannya ke
 * TextFontRegistry, dan menyimpannya sebagai aset proyek lewat AssetManager
 * sehingga proyek tetap bisa dibuka offline setelah font disematkan.
 *
 * ARSITEKTUR URL (penting — jangan kembali ke fetch API gwfh):
 * API google-webfonts-helper (gwfh.mranftl.com) TIDAK mengirim header
 * `Access-Control-Allow-Origin`, sehingga `fetch()` dari browser ke
 * `/api/fonts/{id}` SELALU gagal CORS untuk SEMUA font ("Perlu internet...")
 * — curl tidak kena CORS sehingga verifikasi awal lolos palsu. Sebaliknya,
 * file TTF di fonts.gstatic.com MENGIRIM `Access-Control-Allow-Origin: *`.
 * Maka URL TTF per keluarga di-generate SEKALI lewat
 * `scripts/gen-google-font-urls.cjs` dan dibundel di `googleFontUrls.json`;
 * saat runtime, embed hanya fetch TTF dari gstatic. Tidak ada lagi
 * ketergantungan runtime ke gwfh. CSS2 API Google hanya memberi woff/woff2
 * (ditolak validator TTF/OTF registry), jadi tidak dipakai.
 */
import GOOGLE_FONTS from '../data/googleFonts.json';
import GOOGLE_FONT_URLS from '../data/googleFontUrls.json';
import { inspectFontBytes, validateFontBytes } from './textFontRegistry.tsx';
import { AssetManager } from '../workspace/assetManager.tsx';

const MAX_FACE_BYTES = 16 * 1024 * 1024;
const FACE_KEYS = ['regular', 'bold', 'italic', 'boldItalic'];

export { GOOGLE_FONTS, GOOGLE_FONT_URLS };

export function findGoogleFamily(nameOrId) {
  const q = String(nameOrId || '').trim().toLowerCase();
  if (!q) return null;
  return GOOGLE_FONTS.families.find(f => f.id === q || String(f.family).toLowerCase() === q) || null;
}

// 'regular' -> {weight: 400, italic: false}; '700italic' -> {700, true}; dst.
export function parseVariant(id) {
  const s = String(id || '').trim();
  if (!s) return null;
  const italic = /italic$/i.test(s);
  const num = s.replace(/italic$/i, '');
  if (num === '' || num.toLowerCase() === 'regular') return {weight: 400, italic};
  const weight = Number(num);
  if (!Number.isFinite(weight) || weight < 100 || weight > 900) return null;
  return {weight, italic};
}

// Pilih varian untuk 4 face registry dari daftar varian keluarga.
// regular = normal terdekat 400; bold = normal terdekat 700 (dari atas);
// italic = italic terdekat 400; boldItalic = italic terdekat 700.
// Face yang tidak tersedia = null (registry fallback ke face lain).
export function pickFaceVariants(variants) {
  const parsed = (Array.isArray(variants) ? variants : [])
    .map(id => ({id: String(id), ...parseVariant(id)}))
    .filter(v => v.weight != null);
  const normals = parsed.filter(v => !v.italic).sort((a, b) => a.weight - b.weight);
  const italics = parsed.filter(v => v.italic).sort((a, b) => a.weight - b.weight);
  const nearest = (list, target, fromAbove) => {
    if (!list.length) return null;
    if (fromAbove) {
      const above = list.filter(v => v.weight >= target);
      if (above.length) return above[0].id;
      return list[list.length - 1].id;
    }
    let best = list[0];
    for (const v of list) {
      if (Math.abs(v.weight - target) < Math.abs(best.weight - target)) best = v;
    }
    return best.id;
  };
  const picked = {
    regular: nearest(normals, 400, false),
    bold: nearest(normals, 700, true),
    italic: nearest(italics, 400, false),
    boldItalic: nearest(italics, 700, true)
  };
  // Jangan unduh file yang sama dua kali: bila "bold" jatuh ke varian yang
  // sama dengan "regular" (keluarga hanya punya 1 bobot), biarkan null —
  // registry sudah fallback ke regular saat bold diminta.
  if (picked.bold && picked.bold === picked.regular) picked.bold = null;
  if (picked.boldItalic && picked.boldItalic === picked.italic) picked.boldItalic = null;
  return picked;
}

// URL TTF satu face dari entri peta URL: nilai berupa hash file (digabung
// dengan prefix `p` keluarga) atau URL penuh bila bentuknya tidak cocok pola
// gstatic. Entri peta dibuat scripts/gen-google-font-urls.cjs.
export function resolveFaceTtfUrl(entry, face) {
  const v = entry?.[face];
  if (!v || typeof v !== 'string') return null;
  if (/^https?:\/\//.test(v)) return v;
  if (!entry?.p) return null;
  return `https://fonts.gstatic.com/s/${entry.p}/${v}.ttf`;
}

// Peta URL TTF 4 face sebuah keluarga dari peta terbundel (atau peta inject
// untuk tes). Mengembalikan null bila keluarga tidak ada di peta.
export function getFaceTtfUrls(familyId, urlMap) {
  const map = urlMap || GOOGLE_FONT_URLS;
  const entry = map?.families?.[String(familyId || '').toLowerCase()];
  if (!entry) return null;
  const urls = {};
  for (const face of FACE_KEYS) {
    const u = resolveFaceTtfUrl(entry, face);
    if (u) urls[face] = u;
  }
  return Object.keys(urls).length ? urls : null;
}

function isValidFontMagic(bytes) {
  if (!bytes || bytes.length < 4) return false;
  const sfnt = bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0;
  const otto = bytes[0] === 79 && bytes[1] === 84 && bytes[2] === 84 && bytes[3] === 79;
  return sfnt || otto;
}

async function downloadFace(url, fetchFn) {
  let res;
  try {
    res = await fetchFn(url);
  } catch (e) {
    throw new Error('Perlu internet untuk mengunduh font Google. Periksa koneksi, lalu coba lagi.');
  }
  if (!res || !res.ok) {
    throw new Error(`Gagal mengunduh file font (HTTP ${res ? res.status : '?'})`);
  }
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.length > MAX_FACE_BYTES) throw new Error('File font terlalu besar (maksimal 16 MiB)');
  if (!isValidFontMagic(bytes)) throw new Error('File font yang diunduh bukan TTF/OTF yang valid');
  return bytes;
}

// Unduh + daftarkan + simpan (embed) satu keluarga Google Fonts.
// registry: TextFontRegistry; projectId: id proyek aktif (boleh null -> tidak disimpan).
// fetchFn/urlMap/ingestFn bisa di-inject untuk tes (default: fetch global,
// peta URL terbundel, AssetManager.ingestBlob). URL TTF berasal dari peta
// terbundel (bukan fetch API gwfh — API itu tidak mengirim CORS).
export interface EmbedGoogleFontOptions {
  registry: any;
  projectId?: any;
  family: string;
  fetchFn?: any;
  urlMap?: any;
  ingestFn?: any;
}

export async function embedGoogleFont({registry, projectId, family, fetchFn, urlMap, ingestFn}: EmbedGoogleFontOptions) {
  if (!registry || typeof registry.addFamily !== 'function') {
    throw new Error('Font registry tidak tersedia');
  }
  const entry = findGoogleFamily(family);
  if (!entry) throw new Error(`Font Google tidak dikenal: ${family}`);
  const urls = getFaceTtfUrls(entry.id, urlMap);
  if (!urls) {
    throw new Error(`Font "${entry.family}" tidak ada di katalog URL offline. Perbarui katalog (scripts/gen-google-font-urls.cjs).`);
  }
  const doFetch = fetchFn || globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new Error('Perlu internet untuk mengunduh font Google. Periksa koneksi, lalu coba lagi.');
  }
  const ingest = ingestFn || ((pid, blob, name) => AssetManager.ingestBlob(pid, blob, name));
  const faces = {};
  const assetIds = {};
  let familyName = entry.family;
  // Unduh paralel; tiap face divalidasi + dibaca nama keluarganya dari tabel font.
  const downloaded = await Promise.all(Object.entries(urls).map(async ([face, url]) => {
    const bytes = await downloadFace(url, doFetch);
    validateFontBytes(bytes, `${face}.ttf`);
    let meta = null;
    try { meta = inspectFontBytes(bytes, `${face}.ttf`); } catch (e) { meta = null; }
    return {face, bytes, meta};
  }));
  for (const {face, bytes, meta} of downloaded) {
    if (meta?.family) familyName = meta.family;
    faces[face] = bytes;
  }
  // Simpan tiap face sebagai aset proyek (embed) — urutan stabil: regular dulu.
  for (const face of ['regular', 'bold', 'italic', 'boldItalic']) {
    if (!faces[face]) continue;
    if (projectId) {
      const blob = new Blob([faces[face]], {type: 'font/ttf'});
      const saved = await ingest(projectId, blob, `${familyName}-${face}.ttf`);
      if (saved?.assetId) assetIds[face] = saved.assetId;
    }
  }
  registry.addFamily(familyName, faces, (assetIds as any).regular || Object.values(assetIds)[0] || null);
  return {family: familyName, faces: Object.keys(faces), assetIds};
}

// Cache preview per sesi: id keluarga -> janji hasil (true/false). Sekali
// dimuat (atau gagal), tidak diulang — dropdown dibuka-tutup berkali-kali
// tanpa fetch ulang.
const previewCache = new Map();

// Muat SATU face regular keluarga Google sebagai FontFace dokumen, khusus
// untuk PREVIEW di dropdown font (bukan embed proyek: tidak disimpan
// sebagai aset, tidak masuk registry). Gagal (offline / tanpa URL / tanpa
// FontFace / belum ada di dokumen) = no-op senyap: preview tetap font
// bawaan, tanpa error ke user. Deps bisa di-inject untuk tes:
// fontFaceCtor (default global FontFace), fontsSet (default
// document.fonts), urlMap (default peta terbundel).
export function ensureGoogleFontPreview(family, {urlMap, fontFaceCtor, fontsSet}: any = {}) {
  const entry = findGoogleFamily(family);
  if (!entry) return Promise.resolve(false);
  const key = entry.id;
  if (previewCache.has(key)) return previewCache.get(key);
  const p = (async () => {
    try {
      const FF = fontFaceCtor || globalThis.FontFace;
      const fonts = fontsSet || (typeof document !== 'undefined' ? document.fonts : null);
      if (typeof FF !== 'function' || !fonts || typeof fonts.add !== 'function') return false;
      // Sudah ada di dokumen (mis. sudah di-embed via registry) -> tidak
      // perlu muat; preview langsung pakai face itu.
      try {
        for (const f of fonts) { if (f && f.family === entry.family) return true; }
      } catch (e) { /* FontFaceSet tidak iterable di sebagian env -> lanjut muat */ }
      const urls = getFaceTtfUrls(entry.id, urlMap);
      const url = urls && (urls as any).regular;
      if (!url) return false;
      const face = new FF(entry.family, `url(${url})`, {weight: '400', style: 'normal'});
      await face.load();
      try { fonts.add(face); } catch (e) {}
      return true;
    } catch (e) { return false; }
  })();
  previewCache.set(key, p);
  return p;
}
