/**
 * @file src/engine/findReplaceColor.tsx
 * @description Find & Replace warna dokumen (Task 5): ganti satu warna persis
 * ke warna lain, di seluruh dokumen atau hanya di seleksi. Murni: tidak
 * memutasi doc input. Memakai mapDocumentColors (Task 1) sehingga aturan
 * unlink (keputusan user 2B) berlaku otomatis, dan cakupan warnanya SAMA
 * dengan Task 1 (fill, stroke, stop gradien fill+stroke, fill teks,
 * background frame).
 */
import { cssToHex } from '../utils/colorParserAndFormatter.tsx';
import { collectDocumentColors, mapDocumentColors } from './colorWalk.tsx';

/* Ganti semua slot yang hex-nya (ternormalisasi via cssToHex) sama persis
   dengan fromHex menjadi toHex. Mengembalikan { doc, changed, unlinked }
   dari mapDocumentColors — changed/unlinked dihitung PER SLOT (Ruling K:
   pemanggil yang menampilkan "jumlah objek" harus menghitung objek
   BERBEDA sendiri). opts.limit (default tak terbatas) = jumlah maksimum
   slot yang diganti, dalam urutan dokumen (tombol Replace satu-per-satu).
   toHex === 'none' = hapus cat slot itu (fill: 'none'). fromHex ===
   'none' DITOLAK: throw Error('from-none-not-supported') — UI menangkap
   dan menampilkan pesan. */
function findReplaceColor(doc, fromHex, toHex, scope, opts: Record<string, any> = {}) {
  if (typeof fromHex === 'string' && fromHex.toLowerCase() === 'none') {
    throw new Error('from-none-not-supported');
  }
  const from = cssToHex(fromHex);
  const to = typeof toHex === 'string' && toHex.toLowerCase() === 'none' ? 'none' : cssToHex(toHex);
  const limit = opts && Number.isFinite(opts.limit) && opts.limit >= 0 ? Math.floor(opts.limit) : Infinity;
  let replaced = 0;
  const fn = slot => {
    if (replaced >= limit) return null;
    if (slot.hex !== from) return null;
    replaced++;
    return to;
  };
  return mapDocumentColors(doc, fn, scope);
}

/* Jumlah slot yang cocok dengan fromHex dalam scope (untuk hitungan "N
   cocok" / "ke-N dari M" di modal). 'none' sebagai from tidak pernah
   cocok (0) — bukan throw, karena modal memanggil ini untuk menampilkan
   hitungan sebelum engine dipanggil. */
function countMatches(doc, fromHex, scope) {
  if (typeof fromHex === 'string' && fromHex.toLowerCase() === 'none') return 0;
  const from = cssToHex(fromHex);
  const entries = collectDocumentColors(doc, scope);
  const e = entries.find(x => x.hex === from);
  return e ? e.count : 0;
}

/* Id objek BERBEDA yang kehilangan tautan style antara dua versi dokumen
   (Ruling K: unlinked dihitung per-slot di engine, tapi toast UI menyebut
   jumlah OBJEK — diturunkan pemanggil dari slot/objek yang berubah).
   Objek dihitung sekali walau kedua slotnya (fill+stroke) terlepas. */
function unlinkedObjectIds(beforeDoc, afterDoc) {
  const afterById = new Map<any, any>(((afterDoc && afterDoc.objects) || []).map(o => [o.id, o]));
  const out = [];
  for (const o of (beforeDoc && beforeDoc.objects) || []) {
    const n = afterById.get(o.id);
    if (!n) continue;
    const fillLost = !!o.fillStyleId && !n.fillStyleId;
    const strokeLost = !!o.strokeStyleId && !n.strokeStyleId;
    if (fillLost || strokeLost) out.push(o.id);
  }
  return out;
}

export { findReplaceColor, countMatches, unlinkedObjectIds };
