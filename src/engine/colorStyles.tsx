/**
 * @file src/engine/colorStyles.tsx
 * @description Model Color Styles dokumen: doc.styles + tautan fillStyleId /
 * strokeStyleId per objek. Murni: tidak memutasi doc input (fungsi
 * mengembalikan doc baru bila ada perubahan, doc yang sama bila tidak ada).
 * Dipakai Task 3 (UI), Task 5 (Find & Replace), Task 6-7 (Recolor).
 *
 * Asumsi (Ruling L): style v1 hanya menaut ke slot SOLID (fill/stroke);
 * objek gradien tidak pernah membawa tautan style. linkStyle mengasumsikan
 * slot solid — jangan tawarkan/terapkan penautan untuk fill gradien.
 * Objek teks: fill ditulis ke o.text.fill DAN o.fill bersamaan (karena
 * legacyTextSpec mengutamakan o.fill); teks tidak punya slot stroke di
 * colorWalk, jadi slot 'stroke' pada objek teks tidak bermakna dan tidak
 * boleh dipakai pemanggil.
 */
import { cssToHex, validColor, parseColorWithAlpha } from '../utils/colorParserAndFormatter.tsx';

function stylesOf(doc) {
  return doc && Array.isArray(doc.styles) ? doc.styles : [];
}

/* Id style berikutnya: 'sty-N' pertama yang belum dipakai (deterministik). */
function nextStyleId(styles) {
  const ids = new Set(styles.map(s => s.id));
  let n = 1;
  while (ids.has('sty-' + n)) n++;
  return 'sty-' + n;
}

/* Petakan objek doc; fn(o) mengembalikan objek baru bila berubah, o bila
   tidak. Mengembalikan doc yang sama bila tidak ada objek yang berubah. */
function mapObjects(doc, fn) {
  let changed = false;
  const objects = (doc.objects || []).map(o => {
    const next = fn(o);
    if (next !== o) changed = true;
    return next;
  });
  return changed ? { ...doc, objects } : doc;
}

/* Salin objek dengan cat slot disetel ke hex. Teks: text.fill selalu,
   o.fill hanya bila sudah berupa string (pola mapDocumentColors Task 1). */
function paintSlot(o, slot, hex) {
  if (slot === 'fill') {
    if (o.type === 'text' && o.text) {
      const next = { ...o, text: { ...o.text, fill: hex } };
      if (typeof o.fill === 'string') next.fill = hex;
      return next;
    }
    return { ...o, fill: hex };
  }
  return { ...o, stroke: hex };
}

function styleLinkField(slot) {
  return slot === 'stroke' ? 'strokeStyleId' : 'fillStyleId';
}

function asIdSet(objIds) {
  if (objIds instanceof Set) return objIds;
  return new Set(Array.isArray(objIds) ? objIds : []);
}

/* Buat style baru. Mengembalikan { doc, style }. */
function createStyle(doc, name, hex) {
  const styles = stylesOf(doc);
  const style = {
    id: nextStyleId(styles),
    name: typeof name === 'string' ? name : '',
    hex: cssToHex(hex)
  };
  return { doc: { ...doc, styles: [...styles, style] }, style };
}

/* Ganti nama style. Id tak dikenal -> doc tidak berubah. */
function renameStyle(doc, id, name) {
  const styles = stylesOf(doc);
  if (!styles.some(s => s.id === id)) return doc;
  return {
    ...doc,
    styles: styles.map(s => (s.id === id ? { ...s, name: typeof name === 'string' ? name : s.name } : s))
  };
}

/* Hapus style; objek yang menaut menjadi warna lepas (hex terakhir
   dipertahankan, tautan dihapus). Id tak dikenal -> doc tidak berubah. */
function deleteStyle(doc, id) {
  const styles = stylesOf(doc);
  if (!styles.some(s => s.id === id)) return doc;
  const next = { ...doc, styles: styles.filter(s => s.id !== id) };
  return mapObjects(next, o => {
    if (o.fillStyleId !== id && o.strokeStyleId !== id) return o;
    const copy = { ...o };
    if (copy.fillStyleId === id) delete copy.fillStyleId;
    if (copy.strokeStyleId === id) delete copy.strokeStyleId;
    return copy;
  });
}

/* Tautkan objek ke style: tulis fillStyleId/strokeStyleId + hex style ke
   fill/stroke. Style tak dikenal atau slot bukan fill/stroke -> doc tidak
   berubah. (Ruling L: slot diasumsikan solid.)
   Fix wave F4: tautan yang tak bisa direpresentasikan DITOLAK — image
   (tidak membawa cat yang bisa ditautkan) dan teks+stroke (teks tidak
   punya slot stroke di colorWalk); tanpa guard ini linkStyle membuat
   tautan yang serializer/parser diam-diam buang. */
function linkStyle(doc, objIds, slot, styleId) {
  if (slot !== 'fill' && slot !== 'stroke') return doc;
  const style = stylesOf(doc).find(s => s.id === styleId);
  if (!style) return doc;
  const ids = asIdSet(objIds);
  const field = styleLinkField(slot);
  return mapObjects(doc, o => {
    if (!ids.has(o.id)) return o;
    if (o.img) return o;
    if (o.type === 'text' && slot === 'stroke') return o;
    return { ...paintSlot(o, slot, style.hex), [field]: styleId };
  });
}

/* Lepas tautan slot pada objek yang disebut; hex dipertahankan. */
function unlinkStyle(doc, objIds, slot) {
  if (slot !== 'fill' && slot !== 'stroke') return doc;
  const ids = asIdSet(objIds);
  const field = styleLinkField(slot);
  return mapObjects(doc, o => {
    if (!ids.has(o.id) || !o[field]) return o;
    const copy = { ...o };
    delete copy[field];
    return copy;
  });
}

/* Ubah hex style + tulis ulang fill/stroke SEMUA objek yang menaut ke
   style itu (satu operasi; history ditangani pemanggil). Style tak dikenal
   -> doc tidak berubah. */
function applyStyleEdit(doc, styleId, nextHex) {
  const styles = stylesOf(doc);
  if (!styles.some(s => s.id === styleId)) return doc;
  const hex = cssToHex(nextHex);
  const next = {
    ...doc,
    styles: styles.map(s => (s.id === styleId ? { ...s, hex } : s))
  };
  return mapObjects(next, o => {
    let out = o;
    if (o.fillStyleId === styleId) out = paintSlot(out, 'fill', hex);
    if (o.strokeStyleId === styleId) out = paintSlot(out, 'stroke', hex);
    return out;
  });
}

/* Aturan unlink-on-edit PER OBJEK (keputusan user 3A, gate brief Task 3
   Step 4) — SATU-SATUNYA rumah aturan ini. `o` = objek lama, `next` =
   objek baru yang nilainya sudah diterapkan pemanggil (mis. mapper
   commitPaint/livePaint), `slot` = 'fill' | 'stroke', `styles` = doc.styles.
   - next === o (tidak ada perubahan) -> next apa adanya.
   - Objek tidak tertaut pada slot -> next apa adanya.
   - Nilai baru 'none' -> unlink + 'none' dipertahankan (JANGAN PERNAH
     di-cssToHex-kan: cssToHex('none') = '#000000').
   - Nilai baru ber-alpha (a < 1) atau hex-nya berbeda dari hex style ->
     unlink + nilai baru dipertahankan (alpha dipertahankan apa adanya).
   - Nilai baru hex-nya SAMA dengan hex style -> tautan dipertahankan.
   Mengembalikan objek baru bila tautan dihapus, `next` bila tidak.
   Dipakai directEditUnlink (inspector) dan unlinkOnDirectPaintEdit di bawah. */
function directPaintEdit(o, next, slot, styles) {
  if (!next || next === o) return next;
  const field = slot === 'stroke' ? 'strokeStyleId' : 'fillStyleId';
  const linkId = o[field];
  if (!linkId) return next;
  const style = (styles || []).find(s => s.id === linkId);
  if (!style) return next;
  const nextVal = slot === 'stroke' ? next.stroke : next.type === 'text' && next.text ? next.text.fill : next.fill;
  if (nextVal === 'none') {
    const c = { ...next };
    delete c[field];
    return c;
  }
  const p = parseColorWithAlpha(nextVal);
  if (p.isNone || p.a < 0.999 || p.hex.toLowerCase() !== style.hex.toLowerCase()) {
    const c = { ...next };
    delete c[field];
    return c;
  }
  return next;
}

/* Edit langsung fill/stroke lewat ColorField pada objek tertaut (keputusan
   user 3A): hapus tautan slot itu saja + terapkan nilai baru. Nilai
   dipertahankan persis seperti yang diberikan pemanggil ('none' tetap
   'none', alpha dipertahankan) — JANGAN di-cssToHex-kan. Objek tak
   dikenal -> doc tidak berubah. Bila objek tidak tertaut, cat tetap
   diterapkan (idempotent dengan edit pemanggil). */
function unlinkOnDirectPaintEdit(doc, objId, slot, nextHex) {
  if (slot !== 'fill' && slot !== 'stroke') return doc;
  const target = (doc.objects || []).find(o => o.id === objId);
  if (!target) return doc;
  const next = directPaintEdit(target, paintSlot(target, slot, nextHex), slot, stylesOf(doc));
  return mapObjects(doc, o => (o.id === objId ? next : o));
}

/* Apakah string ini warna yang sah untuk sebuah style? Bentuk hex (#rgb /
   #rrggbb) diterima langsung; bentuk lain (mis. nama warna) diterima bila
   validColor menerimanya — validColor dilempar ke try/catch karena memakai
   window.CSS yang tidak ada di Node. */
function isStyleHex(v) {
  if (typeof v !== 'string') return false;
  /* Fix wave F5: 'none' BUKAN hex style — tanpa ini validateStyles
     menerimanya dan cssToHex('none') = '#000000' (warna hitam palsu). */
  if (v.toLowerCase() === 'none') return false;
  if (/^#[0-9a-f]{3}$/i.test(v) || /^#[0-9a-f]{6}$/i.test(v)) return true;
  try {
    return !!validColor(v);
  } catch (e) {
    return false;
  }
}

/* Validasi array styles mentah (dari parser): tiap entri harus
   { id: string non-empty, name: string, hex: valid }; entri tak valid
   dibuang; id duplikat -> pertahankan yang pertama. Bukan array -> []. */
function validateStyles(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    if (typeof e.id !== 'string' || e.id.length === 0) continue;
    if (typeof e.name !== 'string') continue;
    if (!isStyleHex(e.hex)) continue;
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({ id: e.id, name: e.name, hex: cssToHex(e.hex) });
  }
  return out;
}

/* Baca <metadata id="geovanta-doc"> dari elemen <svg> hasil parse: JSON
   {"styles":[...]} -> validateStyles. Apa pun yang gagal (elemen hilang,
   JSON rusak, bentuk salah) -> [] tanpa throw. */
function parseDocStyles(svgEl) {
  try {
    const md = svgEl && svgEl.querySelector && svgEl.querySelector('metadata#geovanta-doc');
    if (!md) return [];
    const raw = JSON.parse(md.textContent || '');
    return validateStyles(Array.isArray(raw) ? raw : raw && raw.styles);
  } catch (e) {
    return [];
  }
}

/* Baca tautan style dari satu elemen SVG; hanya id yang ada di styleIds
   (Set) yang dipertahankan, sisanya dibuang (jadi warna lepas). */
function readStyleLinks(el, styleIds) {
  const out: Record<string, any> = {};
  if (!el || typeof el.getAttribute !== 'function') return out;
  const has = id => styleIds instanceof Set ? styleIds.has(id) : false;
  const f = el.getAttribute('data-fill-style');
  if (f && has(f)) out.fillStyleId = f;
  const s = el.getAttribute('data-stroke-style');
  if (s && has(s)) out.strokeStyleId = s;
  return out;
}

export {
  createStyle, renameStyle, deleteStyle, linkStyle, unlinkStyle,
  applyStyleEdit, validateStyles, unlinkOnDirectPaintEdit,
  parseDocStyles, readStyleLinks, paintSlot, directPaintEdit
};
