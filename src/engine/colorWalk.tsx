/**
 * @file src/engine/colorWalk.tsx
 * @description Walk warna dokumen: baca (collectDocumentColors) + tulis
 * (mapDocumentColors) warna di semua slot cat — fill, stroke, stop gradien
 * fill (o.grad) dan stroke (o.strokeGrad), fill teks (o.text.fill), dan
 * background frame (o.fill objek frame). Model dokumen datar, jadi satu walk
 * atas doc.objects mencakup group/frame. Dipakai Select Same, Find & Replace,
 * Recolor (Task 4-7). Murni: tidak memutasi doc input.
 */
import { cssToHex } from '../utils/colorParserAndFormatter.tsx';
import { gradOn, strokeGradOn, updateGradStops } from './gradientEngine.tsx';

/* Normalisasi stop gradien ke bentuk rawStops [{id, offset, color, op, mid}].
   Bila rawStops kosong, diturunkan dari stops terkompilasi. */
function normalizedRawStops(g) {
  if (!g) return [];
  if (Array.isArray(g.rawStops) && g.rawStops.length) return g.rawStops;
  return (Array.isArray(g.stops) ? g.stops : []).map((s, i) => ({
    id: s.id || String(i),
    offset: s.offset ?? 0,
    color: s.color,
    op: s.op ?? 1,
    mid: s.mid ?? 0.5
  }));
}

/* Daftar slot warna satu objek.
   Slot: { kind, hex, obj, stopIdx?, grad?, stopId? }
   - kind 'text' hanya untuk objek teks: fill dibaca dari o.text.fill (bila
     tidak ada, fallback ke o.fill — teks legacy); o.fill/o.stroke objek teks
     TIDAK dihitung terpisah karena keduanya cerminan fill yang sama.
   - 'grad' mencakup stop fill (grad: 'fill') dan stop stroke (grad: 'stroke').
   - hex selalu lowercase via cssToHex; slot 'none' dilewati.
   Field hex/grad/stopId adalah tambahan di atas bentuk {kind, obj, stopIdx?}
   di brief: tanpa hex, fn tidak bisa memutuskan; tanpa grad, fn tidak bisa
   membedakan stop grad fill vs stroke (kind keduanya 'grad'). */
function slotsFor(o) {
  const slots = [];
  if (o.type === 'text' && o.text) {
    const tf = o.text.fill && o.text.fill !== 'none' ? o.text.fill : o.fill && o.fill !== 'none' ? o.fill : null;
    if (tf) slots.push({ kind: 'text', hex: cssToHex(tf), obj: o });
    return slots;
  }
  if (gradOn(o) && o.grad) {
    const raw = normalizedRawStops(o.grad);
    for (let i = 0; i < raw.length; i++) {
      const st = raw[i];
      if (!st.color || st.color === 'none') continue;
      slots.push({ kind: 'grad', grad: 'fill', hex: cssToHex(st.color), obj: o, stopIdx: i, stopId: st.id || String(i) });
    }
  } else if (o.fill && o.fill !== 'none') {
    slots.push({ kind: 'fill', hex: cssToHex(o.fill), obj: o });
  }
  if (strokeGradOn(o) && o.strokeGrad) {
    const raw = normalizedRawStops(o.strokeGrad);
    for (let i = 0; i < raw.length; i++) {
      const st = raw[i];
      if (!st.color || st.color === 'none') continue;
      slots.push({ kind: 'grad', grad: 'stroke', hex: cssToHex(st.color), obj: o, stopIdx: i, stopId: st.id || String(i) });
    }
  } else if (o.stroke && o.stroke !== 'none') {
    slots.push({ kind: 'stroke', hex: cssToHex(o.stroke), obj: o });
  }
  return slots;
}

function inScope(o, sel) {
  if (!o || o.locked || o.hidden || o.img) return false;
  if (sel && !sel.has(o.id)) return false;
  return true;
}

/* Kumpulkan semua warna unik dokumen: [{ hex, count, kinds, ids, stopKeys }].
   count = jumlah slot; kinds = subset ['fill','stroke','grad','text'] (urutan
   kemunculan pertama); ids = id objek (unik); stopKeys = 'objId#stopId'.
   Urutan entri = urutan kemunculan pertama di dokumen. scope =
   { kind: 'all' } | { kind: 'selection', ids: Set }. */
function collectDocumentColors(doc, scope) {
  /* Fix wave F3: ids bukan Set -> throw, JANGAN diam-diam jatuh ke
     cakupan seluruh dokumen (jalur tulis destruktif bila salah panggil). */
  let sel = null;
  if (scope && scope.kind === 'selection') {
    if (!(scope.ids instanceof Set)) throw new TypeError("scope.ids harus berupa Set (kind 'selection')");
    sel = scope.ids;
  }
  const byHex = new Map();
  for (const o of (doc && doc.objects) || []) {
    if (!inScope(o, sel)) continue;
    for (const slot of slotsFor(o)) {
      let e = byHex.get(slot.hex);
      if (!e) {
        e = { hex: slot.hex, count: 0, kinds: [], ids: [], stopKeys: [] };
        byHex.set(slot.hex, e);
      }
      e.count++;
      if (!e.kinds.includes(slot.kind)) e.kinds.push(slot.kind);
      if (!e.ids.includes(o.id)) e.ids.push(o.id);
      if (slot.kind === 'grad') {
        const key = o.id + '#' + slot.stopId;
        if (!e.stopKeys.includes(key)) e.stopKeys.push(key);
      }
    }
  }
  return [...byHex.values()];
}

/* Terapkan fn ke tiap slot warna dokumen; fn(slot) -> hexBaru | null
   (null = tidak berubah; 'none' = hapus cat slot itu). Mengembalikan
   { doc, changed, unlinked } — changed = jumlah slot yang berubah;
   unlinked = jumlah tautan style yang dilepas (keputusan user 2B: slot fill/
   stroke/text yang berubah dan membawa tautan style yang sesuai
   (fillStyleId untuk fill/text, strokeStyleId untuk stroke) kehilangan
   tautannya; style-nya sendiri utuh). Murni: doc input tidak dimutasi;
   bila tidak ada perubahan, doc yang sama dikembalikan. */
function mapDocumentColors(doc, fn, scope) {
  /* Fix wave F3: sama seperti collectDocumentColors — ids bukan Set ->
     throw TypeError, bukan fallback ke seluruh dokumen. */
  let sel = null;
  if (scope && scope.kind === 'selection') {
    if (!(scope.ids instanceof Set)) throw new TypeError("scope.ids harus berupa Set (kind 'selection')");
    sel = scope.ids;
  }
  let changed = 0,
    unlinked = 0,
    anyChange = false;
  const objects = ((doc && doc.objects) || []).map(o => {
    if (!inScope(o, sel)) return o;
    let next = null;
    let fillGradEdits: Map<number, string> | null = null;
    let strokeGradEdits: Map<number, string> | null = null;
    for (const slot of slotsFor(o)) {
      const res = fn({ ...slot });
      if (res == null) continue;
      const nextHex = res === 'none' ? 'none' : cssToHex(res);
      if (nextHex === slot.hex) continue;
      if (!next) next = { ...o };
      if (slot.kind === 'fill') {
        next.fill = nextHex;
        if (next.fillStyleId) {
          delete next.fillStyleId;
          unlinked++;
        }
      } else if (slot.kind === 'stroke') {
        next.stroke = nextHex;
        if (next.strokeStyleId) {
          delete next.strokeStyleId;
          unlinked++;
        }
      } else if (slot.kind === 'text') {
        next.text = { ...next.text, fill: nextHex };
        if (typeof next.fill === 'string') next.fill = nextHex;
        if (next.fillStyleId) {
          delete next.fillStyleId;
          unlinked++;
        }
      } else if (slot.kind === 'grad') {
        if (slot.grad === 'stroke') {
          if (!strokeGradEdits) strokeGradEdits = new Map();
          strokeGradEdits.set(slot.stopIdx, nextHex);
        } else {
          if (!fillGradEdits) fillGradEdits = new Map();
          fillGradEdits.set(slot.stopIdx, nextHex);
        }
      }
      changed++;
    }
    if (fillGradEdits) {
      const raw = normalizedRawStops(next.grad).map((st, i) => (fillGradEdits.has(i) ? { ...st, color: fillGradEdits.get(i) } : st));
      next = updateGradStops(next, raw, null, 'fill');
    }
    if (strokeGradEdits) {
      const raw = normalizedRawStops(next.strokeGrad).map((st, i) => (strokeGradEdits.has(i) ? { ...st, color: strokeGradEdits.get(i) } : st));
      next = updateGradStops(next, raw, null, 'stroke');
    }
    if (next) {
      anyChange = true;
      return next;
    }
    return o;
  });
  return { doc: anyChange ? { ...doc, objects } : doc, changed, unlinked };
}

/* Klasifikasi tipe objek untuk Select Same: 'path' | 'text' | 'image' | 'frame'.
   Frame = objek latar frame (isFrameBg / isAutoFrame — dibuat parser dari
   grup Frame, atau Frame Selection); anggota frame biasa tetap 'path'.
   Gambar = o.img / type 'image'; teks = type 'text' / o.text. */
function objectKind(o) {
  if (!o) return 'path';
  if (o.img || o.type === 'image') return 'image';
  if (o.type === 'text' || o.text) return 'text';
  if (o.isFrameBg || o.isAutoFrame) return 'frame';
  return 'path';
}

/* Pilih objek yang sama dengan objek acuan: criterion 'fill' | 'stroke' |
   'type'. Mengembalikan id objek yang cocok SELAIN acuan (acuan dikecualikan
   agar UI bisa memutuskan sendiri apakah acuan tetap terseleksi — probe
   Task 4 menuntut jumlah terseleksi = jumlah total objek yang cocok di
   dokumen, jadi UI menambahkan acuan kembali). Locked, hidden, dan image
   dilewati (fill image bukan cat yang terlihat); objek gradien tidak pernah
   cocok sebagai fill/stroke solid (Ruling L: fill-nya url(#grad-…) bukan
   hex — slotsFor memang tidak memberi slot 'fill'/'stroke' pada mereka).
   Perbandingan hex ternormalisasi via cssToHex (case-insensitive, sudah
   lowercase di slotsFor). Urutan hasil = urutan dokumen. Murni. */
function selectSame(doc, refObj, criterion) {
  const objs = (doc && doc.objects) || [];
  if (!refObj || !objs.length) return [];
  if (criterion === 'type') {
    const kind = objectKind(refObj);
    return objs.filter(o => o.id !== refObj.id && !o.locked && !o.hidden && objectKind(o) === kind).map(o => o.id);
  }
  if (criterion !== 'fill' && criterion !== 'stroke') return [];
  if (refObj.img) return []; /* fill image bukan cat yang terlihat (inScope di walk juga melewatinya) */
  const isFill = criterion === 'fill';
  const refSlot = slotsFor(refObj).find(s => (isFill ? (s.kind === 'fill' || s.kind === 'text') : s.kind === 'stroke'));
  if (!refSlot) return [];
  const out = [];
  for (const o of objs) {
    if (o.id === refObj.id || o.locked || o.hidden || o.img) continue;
    const slot = slotsFor(o).find(s => (isFill ? (s.kind === 'fill' || s.kind === 'text') : s.kind === 'stroke'));
    if (slot && slot.hex === refSlot.hex) out.push(o.id);
  }
  return out;
}

export { collectDocumentColors, mapDocumentColors, selectSame };
