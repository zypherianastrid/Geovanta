/**
 * @file src/engine/shapeBuilder.tsx
 * @description Shape Builder tool (Task 7 — plan 2026-11-13-new-tools).
 * Pure JS (tanpa JSX) agar bisa diuji langsung di Node.
 *
 * - shapesCrossedByStroke(objects, strokePts): bentuk yang dilewati garis
 *   seret, dalam URUTAN garis (bentuk pertama yang dilewati = pertama).
 *   Tahap 1: segmen garis vs bbox objek (bbox memakai node + handle, jadi
 *   tidak pernah salah mengecualikan kurva yang menonjol). Tahap 2: segmen
 *   vs ring sebenarnya (flattenObjToRings) + titik garis di dalam fill.
 * - applyShapeBuilder(doc, selIds, strokePts, mode, say): doc baru.
 *   mode 'union' -> booleanDoc(doc, 'union', crossed); mode 'subtract'
 *   (Alt, Q1 B) -> tiap bentuk yang dilewati garis DIKURANGKAN UTUH dari
 *   hasil (gabungan semua objek terseleksi). Bila boolean gagal / hasil
 *   kosong -> doc dikembalikan TANPA perubahan + say() pesan (Review
 *   Focus 2). Hasil union mewarisi fill/stroke bentuk pertama yang
 *   dilewati garis. Hanya objek terseleksi yang diproses (Q3 A).
 */
import { booleanDoc, flattenObjToRings, segSegIntersect, isInsideRings } from './pathBoolean.tsx';

/* ---- bbox objek (node + handle; kurva kubik selalu di dalam convex hull
   titik kontrolnya, jadi bbox ini tidak pernah mengecualikan bentuk) ---- */
const objBBox = o => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const sp of o.subs || []) {
    for (const n of sp.nodes || []) {
      for (const p of [n, n.handleIn, n.handleOut]) {
        if (!p) continue;
        if (p.x < x0) x0 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.x > x1) x1 = p.x;
        if (p.y > y1) y1 = p.y;
      }
    }
  }
  return x0 === Infinity ? null : [x0, y0, x1, y1];
};
const segHitsBBox = (ax, ay, bx, by, bb) => {
  const [x0, y0, x1, y1] = bb;
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  if (inside(ax, ay) || inside(bx, by)) return true;
  return !!segSegIntersect(ax, ay, bx, by, x0, y0, x1, y0)
    || !!segSegIntersect(ax, ay, bx, by, x1, y0, x1, y1)
    || !!segSegIntersect(ax, ay, bx, by, x1, y1, x0, y1)
    || !!segSegIntersect(ax, ay, bx, by, x0, y1, x0, y0);
};

/* Apakah dua kelompok ring saling tumpang tindih (sisi berpotongan, atau
   satu berisi titik sudut yang lain)? Dipakai penjaga union: gabung hanya
   masuk akal bila bentuk yang dilewati saling tumpang tindih. */
const ringsOverlap = (ra, rb) => {
  for (const a of ra) {
    for (let i = 0; i < a.length; i++) {
      const p = a[i], q = a[(i + 1) % a.length];
      for (const b of rb) {
        for (let j = 0; j < b.length; j++) {
          const c = b[j], d = b[(j + 1) % b.length];
          if (segSegIntersect(p[0], p[1], q[0], q[1], c[0], c[1], d[0], d[1])) return true;
        }
      }
    }
  }
  for (const a of ra) if (isInsideRings(a[0][0], a[0][1], rb)) return true;
  for (const b of rb) if (isInsideRings(b[0][0], b[0][1], ra)) return true;
  return false;
};

const shapesCrossedByStroke = (objects, strokePts) => {
  if (!strokePts || !strokePts.length) return [];
  const items = objects.map(o => ({ o, bb: objBBox(o), rings: null, crossed: false }));
  const ringsOf = it => {
    if (it.rings === null) it.rings = flattenObjToRings(it.o).rings;
    return it.rings;
  };
  const out = [];
  const mark = it => {
    if (!it.crossed) {
      it.crossed = true;
      out.push(it.o);
    }
  };
  const pointInside = p => {
    for (const it of items) {
      if (it.crossed || !it.bb) continue;
      if (p.x < it.bb[0] || p.x > it.bb[2] || p.y < it.bb[1] || p.y > it.bb[3]) continue;
      const rings = ringsOf(it);
      if (rings.length && isInsideRings(p.x, p.y, rings)) mark(it);
    }
  };
  const segCrosses = (a, b) => {
    for (const it of items) {
      if (it.crossed || !it.bb) continue;
      if (!segHitsBBox(a.x, a.y, b.x, b.y, it.bb)) continue;
      const rings = ringsOf(it);
      if (!rings.length) continue;
      let hit = false;
      for (const r of rings) {
        for (let j = 0; j < r.length && !hit; j++) {
          const c = r[j], d = r[(j + 1) % r.length];
          if (segSegIntersect(a.x, a.y, b.x, b.y, c[0], c[1], d[0], d[1])) hit = true;
        }
      }
      if (hit) mark(it);
    }
  };
  if (strokePts.length === 1) {
    pointInside(strokePts[0]);
    return out;
  }
  for (let i = 0; i + 1 < strokePts.length; i++) {
    pointInside(strokePts[i]);
    segCrosses(strokePts[i], strokePts[i + 1]);
  }
  pointInside(strokePts[strokePts.length - 1]);
  return out;
};

/* Fill hasil dari bentuk acuan (cerminan logika bottomFill booleanDoc). */
const paintFrom = first => ({
  fill: first.fill != null && first.fill !== 'none' ? first.fill
    : typeof first.stroke === 'string' && first.stroke !== 'none' ? first.stroke : '#000000',
  stroke: typeof first.stroke === 'string' ? first.stroke : 'none',
  strokeWidth: first.strokeWidth != null ? first.strokeWidth : 0
});

const applyUnion = (doc, crossed, say) => {
  if (crossed.length < 2) {
    say('Garis hanya melewati 1 bentuk — seret melintasi 2+ bentuk yang tumpang tindih');
    return doc;
  }
  const ringsOf = crossed.map(o => flattenObjToRings(o).rings);
  let overlap = false;
  for (let i = 0; i < ringsOf.length && !overlap; i++) {
    for (let j = i + 1; j < ringsOf.length; j++) {
      if (ringsOverlap(ringsOf[i], ringsOf[j])) {
        overlap = true;
        break;
      }
    }
  }
  if (!overlap) {
    say('Bentuk yang dilewati garis tidak saling tumpang tindih');
    return doc;
  }
  const res = booleanDoc(doc, 'union', new Set(crossed.map(o => o.id)));
  if (!res.changed) {
    say('Shape Builder: tidak ada perubahan');
    return doc;
  }
  const merged = res.doc.objects.find(o => o.id === res.resultId);
  if (merged) Object.assign(merged, paintFrom(crossed[0]));
  return res.doc;
};

const applySubtract = (doc, selected, crossed, say) => {
  /* Gabungan semua objek terseleksi dulu (booleanDoc), lalu kurangkan tiap
     bentuk yang dilewati garis satu per satu (Q1 B: bentuk utuh). */
  const base = booleanDoc(doc, 'union', new Set(selected.map(o => o.id)));
  if (!base.changed) {
    say(base.reason === 'need2closed' ? 'Shape Builder butuh 2+ bentuk tertutup' : 'Shape Builder: tidak ada perubahan');
    return doc;
  }
  let cur = base.doc.objects.find(o => o.id === base.resultId);
  for (const c of crossed) {
    const res = booleanDoc({ objects: [cur, c] }, 'subtract', new Set([cur.id, c.id]));
    if (!res.changed) {
      if (res.reason === 'empty') say('Shape Builder: hasil kosong (bentuk saling meniadakan)');
      else say('Shape Builder: tidak ada perubahan');
      return doc;
    }
    cur = res.doc.objects.find(o => o.id === res.resultId);
  }
  /* Nama unik terhadap doc asli (nama Boolean-N dari doc sementara bisa
     bertabrakan dengan nama yang sudah ada di doc). */
  const names = new Set(doc.objects.map(o => o.name));
  let k = 1;
  while (names.has('Boolean-' + k)) k++;
  cur = { ...cur, name: 'Boolean-' + k };
  const selIdSet = new Set(selected.map(o => o.id));
  const lastSel = selected[selected.length - 1];
  const out = [];
  for (const o of doc.objects) {
    if (o.id === lastSel.id) out.push(cur);
    else if (!selIdSet.has(o.id)) out.push(o);
  }
  return { ...doc, objects: out };
};

const applyShapeBuilder = (doc, selIds, strokePts, mode, say: any = () => {}) => {
  const ids = selIds instanceof Set ? selIds : new Set(selIds || []);
  const selected = (doc.objects || []).filter(o =>
    ids.has(o.id) &&
    !o.locked &&
    !o.hidden &&
    !o.img &&
    !o.text &&
    o.subs &&
    o.subs.length > 0
  );
  if (selected.length < 2) {
    say('Pilih 2+ bentuk untuk Shape Builder');
    return doc;
  }
  const crossed = shapesCrossedByStroke(selected, strokePts || []);
  if (!crossed.length) {
    say('Garis tidak melewati bentuk apa pun');
    return doc;
  }
  return mode === 'subtract' ? applySubtract(doc, selected, crossed, say) : applyUnion(doc, crossed, say);
};

export { shapesCrossedByStroke, applyShapeBuilder };
export default applyShapeBuilder;
