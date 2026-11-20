/**
 * @file src/engine/effectsEngine.tsx
 * @description Model efek objek (Task 8): drop shadow, layer blur,
 * background blur — fungsi murni, tanpa React / document / window.
 *
 * Model: o.effects = [
 *   { type: 'dropShadow', dx, dy, blur, color, opacity, disabled? },
 *   { type: 'layerBlur', radius, disabled? },
 *   { type: 'backgroundBlur', radius, disabled? }
 * ]
 * dx/dy piksel dokumen (boleh negatif), blur >= 0, color hex, opacity 0..1.
 *
 * Catatan warna: cssToHex/validColor dari colorParserAndFormatter TIDAK
 * dipakai di sini — validColor memakai window.CSS (ReferenceError di Node,
 * temuan Task 2) dan parseColorWithAlpha memanggil validColor untuk string
 * non-hex (throw yang sama). Engine ini memakai parser hex/rgba regex
 * sendiri (Node-safe), pola yang sama dengan isStyleHex di colorStyles.tsx.
 */

const EFFECT_TYPES = new Set(['dropShadow', 'layerBlur', 'backgroundBlur']);

const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isFiniteNum = v => typeof v === 'number' && Number.isFinite(v);

/* Parse warna efek -> { hex, alpha } atau null bila tak valid.
   Menerima #rgb, #rrggbb, #rrggbbaa, rgb()/rgba(). 'none' dan nama warna
   (butuh CSSOM) DITOLAK — model efek hanya menyimpan hex. */
function parseEffectColor(c) {
  if (typeof c !== 'string') return null;
  const s = c.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return { hex: '#' + m[1].split('').map(x => x + x).join('').toLowerCase(), alpha: 1 };
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) return { hex: '#' + m[1].toLowerCase(), alpha: 1 };
  m = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(s);
  if (m) return { hex: '#' + m[1].toLowerCase(), alpha: Math.round(parseInt(m[2], 16) / 255 * 100) / 100 };
  m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    const r = Math.max(0, Math.min(255, +m[1])), g = Math.max(0, Math.min(255, +m[2])), b = Math.max(0, Math.min(255, +m[3]));
    const rawA = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    const hex = '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    return { hex, alpha: clampN(Number.isFinite(rawA) ? rawA : 1, 0, 1) };
  }
  return null;
}

/* Normalisasi SATU item efek untuk jalur tulis (add/update): field
   numerik di-clamp ke rentang (blur/radius >= 0, opacity 0..1); alpha
   warna rgba dilipat ke opacity. Field asing dibuang; `disabled`
   boolean dipertahankan. Mengembalikan null hanya bila item tak bisa
   diselamatkan (type tak dikenal / field wajib tak finite / warna tak
   valid). Berbeda dengan validateEffects (jalur parser, KETAT: nilai
   di luar rentang langsung membuang item, bukan di-clamp). */
function normalizeEffect(e) {
  if (!e || typeof e !== 'object' || !EFFECT_TYPES.has(e.type)) return null;
  const disabled = e.disabled === true ? true : e.disabled === false ? false : undefined;
  if (e.type === 'dropShadow') {
    if (!isFiniteNum(e.dx) || !isFiniteNum(e.dy) || !isFiniteNum(e.blur) || !isFiniteNum(e.opacity)) return null;
    const col = parseEffectColor(e.color);
    if (!col) return null;
    const out: any = {
      type: 'dropShadow',
      dx: e.dx,
      dy: e.dy,
      blur: Math.max(0, e.blur),
      color: col.hex,
      opacity: clampN(e.opacity * col.alpha, 0, 1)
    };
    if (disabled !== undefined) out.disabled = disabled;
    return out;
  }
  if (!isFiniteNum(e.radius)) return null;
  const out: any = { type: e.type, radius: Math.max(0, e.radius) };
  if (disabled !== undefined) out.disabled = disabled;
  return out;
}

/* Validasi KETAT satu item untuk jalur parser (data-effects): nilai
   numerik di luar rentang (blur/radius negatif, opacity di luar 0..1)
   MEMBUANG item — bukan di-clamp. Hex dinormalisasi ke lowercase;
   `disabled` boolean dipertahankan; field asing dibuang. */
function validateOne(e) {
  if (!e || typeof e !== 'object' || !EFFECT_TYPES.has(e.type)) return null;
  const disabled = e.disabled === true ? true : e.disabled === false ? false : undefined;
  if (e.type === 'dropShadow') {
    if (!isFiniteNum(e.dx) || !isFiniteNum(e.dy) || !isFiniteNum(e.blur) || !isFiniteNum(e.opacity)) return null;
    if (e.blur < 0 || e.opacity < 0 || e.opacity > 1) return null;
    const col = parseEffectColor(e.color);
    if (!col) return null;
    const out: any = {
      type: 'dropShadow',
      dx: e.dx,
      dy: e.dy,
      blur: e.blur,
      color: col.hex,
      opacity: clampN(e.opacity * col.alpha, 0, 1)
    };
    if (disabled !== undefined) out.disabled = disabled;
    return out;
  }
  if (!isFiniteNum(e.radius) || e.radius < 0) return null;
  const out: any = { type: e.type, radius: e.radius };
  if (disabled !== undefined) out.disabled = disabled;
  return out;
}

function effectsOf(obj) {
  return Array.isArray(obj && obj.effects) ? obj.effects : [];
}

function addEffect(obj, effect) {
  const norm = normalizeEffect(effect);
  if (!norm) return obj;
  return { ...obj, effects: [...effectsOf(obj), norm] };
}

function removeEffect(obj, idx) {
  const list = effectsOf(obj);
  return { ...obj, effects: list.filter((_, i) => i !== idx) };
}

function updateEffect(obj, idx, patch) {
  const list = effectsOf(obj);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return obj;
  const norm = normalizeEffect({ ...list[idx], ...patch });
  if (!norm) return obj;
  const next = list.slice();
  next[idx] = norm;
  return { ...obj, effects: next };
}

function toggleEffect(obj, idx) {
  const list = effectsOf(obj);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return obj;
  const next = list.slice();
  next[idx] = { ...list[idx], disabled: !(list[idx].disabled === true) };
  return { ...obj, effects: next };
}

/* Parser: validasi array mentah (mis. dari data-effects) -> efek valid
   saja, ternormalisasi. Bukan array -> []. KETAT: nilai di luar rentang
   membuang item (lihat validateOne). */
function validateEffects(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const norm = validateOne(item);
    if (norm) out.push(norm);
  }
  return out;
}

/* Efek yang punya representasi <filter> SVG: dropShadow + layerBlur,
   yang tidak disabled. Background blur TIDAK punya def (render-only). */
function defEffects(effects) {
  return validateEffects(effects).filter(e => !e.disabled && (e.type === 'dropShadow' || e.type === 'layerBlur'));
}

/* Hash deterministik FNV-1a 32-bit -> hex 8 digit. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* Id filter stabil dari isi efek (deterministik, bukan random) — dua objek
   dengan efek identik berbagi satu def; round-trip stabil. Fix wave F2:
   bbox opsional — bila diberikan, region ikut di-hash sehingga objek
   berukuran beda dengan efek identik mendapat def berbeda (regionnya
   beda); tanpa bbox, id = hash isi saja (perilaku lama, tes lama hijau). */
function effectsFilterId(effects, bbox) {
  const defs = defEffects(effects);
  if (!defs.length) return null;
  const region = filterRegion(bbox, effectExtent(defs));
  return 'fx-' + fnv1a(JSON.stringify(defs) + (region ? '|' + fmt(region.x) + ',' + fmt(region.y) + ',' + fmt(region.width) + ',' + fmt(region.height) : ''));
}

const fmt = v => String(Math.round(v * 1e6) / 1e6);

/* Extent bayangan/blur dalam satuan dokumen — rumus yang sama dengan
   culling pad kanvas: drop shadow max(|dx|,|dy|) + 3*blur; layer blur
   3*radius; ambil maksimum lintas efek ber-def. */
function effectExtent(defs) {
  let e = 0;
  for (const d of defs) {
    if (d.type === 'dropShadow') e = Math.max(e, Math.max(Math.abs(d.dx), Math.abs(d.dy)) + 3 * d.blur);
    else if (d.type === 'layerBlur') e = Math.max(e, 3 * d.radius);
  }
  return e;
}

/* Region filter dalam persen objectBoundingBox dari bbox [x0,y0,x1,y1]
   ruang dokumen + extent. null bila bbox tidak diberikan / degenerat
   (lebar/tinggi 0 atau non-finite) — pemanggil memakai fallback
   -20%/140%. Overestimate aman, underestimate memotong bayangan. */
function filterRegion(bbox, extent) {
  if (!bbox) return null;
  const w = bbox[2] - bbox[0], h = bbox[3] - bbox[1];
  if (!(w > 0) || !(h > 0) || !isFinite(w) || !isFinite(h) || !isFinite(extent)) return null;
  const px = extent / w * 100, py = extent / h * 100;
  return { x: -px, y: -py, width: 100 + 2 * px, height: 100 + 2 * py };
}

/* Apakah dokumen memuat backgroundBlur AKTIF (tidak disabled) pada
   objek mana pun — dipakai pemberitahuan ekspor SVG (Task 9 Step 5):
   background blur render-only, tidak ikut terekspor ke SVG. */
function docHasBackgroundBlur(doc) {
  if (!doc || !Array.isArray(doc.objects)) return false;
  return doc.objects.some(o => Array.isArray(o && o.effects) &&
    o.effects.some(e => e && e.type === 'backgroundBlur' && !e.disabled));
}

/* XML <filter> untuk efek yang punya def. Satu primitif: output Task 8
   utuh (tanpa in/result/feMerge). Multi-primitif (Task 9a): tiap primitif
   dihitung dari SourceGraphic — BUKAN dari hasil primitif sebelumnya,
   kalau tidak shadow ke-2 ikut membayangi shadow ke-1 dan blur ikut
   me-blur bayangan (artefak Task 8 minor a) — lalu digabung feMerge:
   bayangan dulu, lalu objek blur (atau SourceGraphic bila tidak ada
   layer blur). Dua layer blur digabung SATU feGaussianBlur radius
   maksimum — kebijakan yang sama dengan renderer (canvasKitScene).
   Fix wave F2: region filter dari bbox + extent (bila bbox diberikan);
   tanpa bbox, fallback -20%/140% (perilaku lama). */
function effectsFilterDefs(effects, id, bbox) {
  const defs = defEffects(effects);
  if (!defs.length) return '';
  const shadows = defs.filter(e => e.type === 'dropShadow');
  const blurs = defs.filter(e => e.type === 'layerBlur');
  const blurRadius = blurs.length ? Math.max(...blurs.map(e => e.radius)) : null;
  const region = filterRegion(bbox, effectExtent(defs));
  const open = region
    ? '<filter id="' + id + '" x="' + fmt(region.x) + '%" y="' + fmt(region.y) + '%" width="' + fmt(region.width) + '%" height="' + fmt(region.height) + '%" color-interpolation-filters="sRGB">'
    : '<filter id="' + id + '" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">';
  if (shadows.length + (blurs.length ? 1 : 0) === 1) {
    if (shadows.length) {
      const e = shadows[0];
      return open + '<feDropShadow dx="' + fmt(e.dx) + '" dy="' + fmt(e.dy) + '" stdDeviation="' + fmt(e.blur) + '" flood-color="' + e.color + '" flood-opacity="' + fmt(e.opacity) + '"/></filter>';
    }
    return open + '<feGaussianBlur stdDeviation="' + fmt(blurRadius) + '"/></filter>';
  }
  const parts = [];
  const merge = [];
  shadows.forEach((e, i) => {
    parts.push('<feDropShadow in="SourceGraphic" dx="' + fmt(e.dx) + '" dy="' + fmt(e.dy) + '" stdDeviation="' + fmt(e.blur) + '" flood-color="' + e.color + '" flood-opacity="' + fmt(e.opacity) + '" result="fxs' + i + '"/>');
    merge.push('<feMergeNode in="fxs' + i + '"/>');
  });
  if (blurs.length) {
    parts.push('<feGaussianBlur in="SourceGraphic" stdDeviation="' + fmt(blurRadius) + '" result="fxb"/>');
    merge.push('<feMergeNode in="fxb"/>');
  } else {
    merge.push('<feMergeNode in="SourceGraphic"/>');
  }
  parts.push('<feMerge>' + merge.join('') + '</feMerge>');
  return open + parts.join('') + '</filter>';
}

export { addEffect, removeEffect, updateEffect, toggleEffect, validateEffects, effectsFilterId, effectsFilterDefs, normalizeEffect, docHasBackgroundBlur };
export default { addEffect, removeEffect, updateEffect, toggleEffect, validateEffects, effectsFilterId, effectsFilterDefs, docHasBackgroundBlur };
