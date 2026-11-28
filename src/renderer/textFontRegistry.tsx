const MAX_FONT_BYTES = 16 * 1024 * 1024;
import opentype from 'opentype.js';
import { AssetManager } from '../workspace/assetManager.tsx';

export function normalizeFontFamily(family: any): string {
  const first = String(family ?? '')
    .split(',')[0]
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return first;
}

export function faceKey(weight, style) {
  const bold = weight === 'bold' || Number(weight) >= 600;
  const italic = style === 'italic' || style === 'oblique';
  return bold ? (italic ? 'boldItalic' : 'bold') : (italic ? 'italic' : 'regular');
}

// Bobot/gaya untuk memuat ulang satu face dari asetnya.
export const FACE_WEIGHT_STYLE = {
  regular: ['normal', 'normal'],
  bold: ['bold', 'normal'],
  italic: ['normal', 'italic'],
  boldItalic: ['bold', 'italic']
};

export function validateFontBytes(input, filename = '') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  const ext = String(filename).toLowerCase().split('.').pop();
  if (!['ttf', 'otf'].includes(ext) || bytes.length < 4 || bytes.length > MAX_FONT_BYTES) {
    throw new Error('File font harus TTF/OTF valid dan maksimal 16 MiB');
  }
  const sfnt = bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0;
  const otto = bytes[0] === 79 && bytes[1] === 84 && bytes[2] === 84 && bytes[3] === 79;
  if (!sfnt && !otto) throw new Error('Format font TTF/OTF tidak valid');
  return true;
}

export function inspectFontBytes(input, filename = 'font.ttf') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  validateFontBytes(bytes, filename);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  let font;
  try {
    font = opentype.parse(ab);
  } catch (err) {
    throw new Error('Gagal membaca struktur tabel font TTF/OTF: ' + (err?.message || 'corrupt font'));
  }
  const pickField = key => {
    const names = font.names || {};
    const candidates = [
      names[key],
      names.unicode?.[key],
      names.windows?.[key],
      names.macintosh?.[key]
    ];
    for (const rec of candidates) {
      if (!rec || typeof rec !== 'object') continue;
      const val = rec.en || Object.values(rec).find(v => typeof v === 'string' && v.trim());
      if (val && val.trim()) return val.trim();
    }
    return '';
  };
  const fallbackName = String(filename || 'Custom Font')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_](regular|bolditalic|bold|italic|light|medium|semibold|black|thin)$/i, '')
    .trim() || 'Custom Font';
  const family = (pickField('preferredFamily') || pickField('fontFamily') || fallbackName).trim();
  const subfamily = (pickField('preferredSubfamily') || pickField('fontSubfamily') || 'Regular').trim();
  const fullName = (pickField('fullName') || `${family} ${subfamily}`).trim();
  const os2Weight = Number(font.tables?.os2?.usWeightClass);
  const isBoldSub = /bold|black|heavy|semibold|demibold|extrabold/i.test(subfamily);
  const isItalicSub = /italic|oblique/i.test(subfamily) ||
    Boolean(font.tables?.os2 && (font.tables.os2.fsSelection & 1)) ||
    Boolean(font.tables?.head && (font.tables.head.macStyle & 2));
  const numericWeight = Number.isFinite(os2Weight) && os2Weight >= 100 && os2Weight <= 900
    ? os2Weight
    : (isBoldSub ? 700 : 400);
  const weight = numericWeight >= 600 || isBoldSub ? 'bold' : 'normal';
  const style = isItalicSub ? 'italic' : 'normal';
  return {
    family,
    subfamily,
    fullName,
    weight,
    numericWeight,
    style,
    faceKey: faceKey(weight, style),
    glyphCount: Number(font.numGlyphs) || 0,
    unitsPerEm: Number(font.unitsPerEm) || 1000
  };
}

const registeredBrowserFaces = new Set();

export function registerBrowserFontFace(family, key, bytes) {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts?.add) return;
  const sig = `${family.toLowerCase()}:${key}:${bytes.byteLength}`;
  if (registeredBrowserFaces.has(sig)) return;
  registeredBrowserFaces.add(sig);
  try {
    const isBold = key === 'bold' || key === 'boldItalic';
    const isItalic = key === 'italic' || key === 'boldItalic';
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const ff = new FontFace(family, ab, {
      weight: isBold ? '700' : '400',
      style: isItalic ? 'italic' : 'normal'
    });
    ff.load().then(loaded => {
      try { document.fonts.add(loaded); } catch (e) {}
    }).catch(() => {});
  } catch (e) {}
}

export class TextFontRegistry {
  [key: string]: any;
  constructor(kit, bundled = globalThis.GEOVANTA_BUNDLED_TEXT_FONT) {
    this.kit = kit;
    this.provider = kit?.TypefaceFontProvider ? kit.TypefaceFontProvider.Make() : null;
    this.families = new Map();
    this.pendingAssets = new Map();
    this.defaultFamily = bundled?.family || null;
    if (bundled?.family && bundled.faces) this.addFamily(bundled.family, bundled.faces);
  }

  addFamily(family, faces, assetId = null) {
    const cleanFamily = normalizeFontFamily(family) || String(family || '').trim();
    const normalized = {};
    for (const key of ['regular', 'bold', 'italic', 'boldItalic']) {
      const bytes = faces?.[key];
      if (!bytes) continue;
      normalized[key] = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      this.provider?.registerFont(normalized[key], cleanFamily);
      registerBrowserFontFace(cleanFamily, key, normalized[key]);
    }
    if (!Object.keys(normalized).length) throw new Error('Face font diperlukan');
    const lookupKey = cleanFamily.toLowerCase();
    const prev = this.families.get(lookupKey);
    this.families.set(lookupKey, {
      family: cleanFamily,
      faces: {...(prev?.faces || {}), ...normalized},
      assetId: assetId ?? prev?.assetId ?? null
    });
  }

  getFace(family, weight = 'normal', style = 'normal') {
    const entry = this.families.get(normalizeFontFamily(family).toLowerCase());
    if (!entry) return null;
    const key = faceKey(weight, style);
    return entry.faces[key] || entry.faces.regular || Object.values(entry.faces)[0] || null;
  }

  // Face PERSIS untuk bobot/gaya yang diminta, TANPA fallback ke regular.
  // Dipakai semua jalur yang butuh face yang tepat (bukan "keluarga apa saja"):
  // - ensureAssetFont: jangan anggap bold sudah dimuat hanya karena regular ada.
  // - drawText/ensureFonts: picu pemulihan keluarga bila face yang diminta
  //   belum terdaftar, meski face lain keluarga itu sudah ada.
  // - textToPath: konversi harus memakai face yang sama dengan teksnya.
  // getFace() di atas tetap dipakai makeTextLayout (keputusan fallback keluarga).
  getExactFace(family, weight = 'normal', style = 'normal') {
    const entry = this.families.get(normalizeFontFamily(family).toLowerCase());
    if (!entry) return null;
    return entry.faces[faceKey(weight, style)] || null;
  }

  getFamily(family) {
    return this.families.get(normalizeFontFamily(family).toLowerCase()) || null;
  }

  listFamilies() {
    return Array.from(this.families.values()).map((entry: any) => ({
      family: entry.family,
      faces: Object.keys(entry.faces),
      assetId: entry.assetId || null,
      isBundled: entry.family === this.defaultFamily && !entry.assetId
    }));
  }

  async ensureAssetFont(assetId, family, weight = 'normal', style = 'normal') {
    if (!assetId) return false;
    // WAJIB getExactFace: getFace() jatuh ke regular, sehingga bila hanya
    // regular yang terdaftar, ensureAssetFont(bold) akan mengembalikan true
    // tanpa memuat apa-apa — dan face bold tidak pernah dimuat (bug: teks
    // bold me-render regular; Ubah ke Path memakai face regular).
    if (this.getExactFace(family, weight, style)) return true;
    if (this.pendingAssets.has(assetId)) return this.pendingAssets.get(assetId);
    const pending = (async () => {
      const record = await AssetManager.getAsset(assetId);
      if (!record?.blob) throw new Error(`Font proyek tidak ditemukan: ${family}`);
      const bytes = new Uint8Array(await record.blob.arrayBuffer());
      validateFontBytes(bytes, record.name);
      let resolvedKey = faceKey(weight, style);
      let meta = null;
      try {
        meta = inspectFontBytes(bytes, record.name);
        if (meta?.faceKey) resolvedKey = meta.faceKey;
      } catch (e) {}
      // Validasi keluarga dari byte font itu sendiri: aset yang disimpan
      // untuk keluarga A tidak boleh didaftarkan atas nama keluarga B.
      // Ini terjadi bila fontAssetIds basi — mis. keluarga diganti
      // (optimistis) tetapi unduh keluarga baru gagal, sehingga teks
      // membawa fontAssetIds keluarga lama. Tanpa validasi ini, Ubah ke
      // Path diam-diam memakai outline keluarga lama sementara kanvas
      // menampilkan fallback (sans): teks dan path terlihat seperti dua
      // font berbeda. Bila tidak cocok: gagal jelas, jangan daftarkan.
      // (Bila metadata nama tidak terbaca, biarkan lolos seperti dulu.)
      if (meta?.family) {
        const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
        if (norm(meta.family) !== norm(family)) {
          throw new Error(`Aset font untuk "${family}" tidak cocok (aset berisi "${meta.family}"). Pilih ulang keluarga font atau impor ulang font tersebut.`);
        }
      }
      const existing = this.getFamily(family)?.faces || {};
      this.addFamily(family, {...existing, [resolvedKey]: bytes}, assetId);
      return true;
    })();
    this.pendingAssets.set(assetId, pending);
    try { return await pending; }
    finally { this.pendingAssets.delete(assetId); }
  }

  // Muat ulang SEMUA face keluarga dari asetnya (peta fontAssetIds dari
  // spec teks). Dipakai saat proyek dibuka lagi: fontAssetId tunggal hanya
  // memulihkan 1 face, sedangkan embed Google Fonts menyimpan 1 aset per
  // face (regular/bold/italic/boldItalic). Face yang sudah terdaftar
  // dilewati oleh ensureAssetFont.
  async ensureAssetFontFamily(spec) {
    const jobs = [];
    if (spec.fontAssetId) {
      jobs.push(this.ensureAssetFont(spec.fontAssetId, spec.fontFamily, spec.fontWeight, spec.fontStyle));
    }
    if (spec.fontAssetIds) {
      for (const [faceName, assetId] of Object.entries(spec.fontAssetIds)) {
        if (!assetId) continue;
        const [w, s] = FACE_WEIGHT_STYLE[faceName] || ['normal', 'normal'];
        jobs.push(this.ensureAssetFont(assetId, spec.fontFamily, w, s));
      }
    }
    await Promise.all(jobs);
    return true;
  }

  dispose() {
    this.provider?.delete();
    this.families.clear();
    this.pendingAssets.clear();
  }
}
