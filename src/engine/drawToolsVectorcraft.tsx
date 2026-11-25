/**
 * @file src/engine/drawToolsVectorcraft.tsx
 * @description Helper & logika behavior VectorCraft untuk 7 alat dropdown drawGrp:
 * Pen, Pencil, Brush, Curvature, Shape Builder, Line Segment, dan Three-Point Arc.
 */
import { arcToCubics } from './arcToBezier.tsx';
import { applyShapeBuilder, shapesCrossedByStroke } from './shapeBuilder.tsx';
import { booleanDoc, flattenObjToRings, isInsideRings } from './pathBoolean.tsx';
import { uid } from './vectorPrimitives.tsx';

export interface Pt {
  x: number;
  y: number;
}

/**
 * Menghitung busur lingkaran yang melewati 3 titik: `start` -> `through` -> `end`
 * (mengacu ke `vectorcraft-main/crates/tools/src/three_point_arc.rs`).
 */
export function threePointArcFromPoints(start: Pt, end: Pt, through: Pt) {
  const ax = start.x, ay = start.y;
  const bx = through.x, by = through.y;
  const cx = end.x, cy = end.y;

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-6) {
    return {
      cx: (ax + cx) / 2,
      cy: (ay + cy) / 2,
      r: Math.hypot(cx - ax, cy - ay) / 2,
      nodes: [
        { x: ax, y: ay, type: 'corner', handleIn: null, handleOut: null },
        { x: cx, y: cy, type: 'corner', handleIn: null, handleOut: null },
      ],
    };
  }

  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  const r = Math.hypot(ax - ux, ay - uy);

  if (!Number.isFinite(r) || r < 0.5 || r > 1e6) {
    return {
      cx: (ax + cx) / 2,
      cy: (ay + cy) / 2,
      r: Math.hypot(cx - ax, cy - ay) / 2,
      nodes: [
        { x: ax, y: ay, type: 'corner', handleIn: null, handleOut: null },
        { x: cx, y: cy, type: 'corner', handleIn: null, handleOut: null },
      ],
    };
  }

  const angA = Math.atan2(ay - uy, ax - ux);
  const angB = Math.atan2(by - uy, bx - ux);
  const angC = Math.atan2(cy - uy, cx - ux);

  const norm = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const cwSweep = (from: number, to: number) => norm(to - from);

  // Tentukan arah sweep (CW = 1 vs CCW = 0) agar busur melewati `through`
  const sweepAC = cwSweep(angA, angC);
  const sweepAB = cwSweep(angA, angB);
  const sweepFlag = sweepAB <= sweepAC ? 1 : 0;
  const delta = sweepFlag === 1 ? sweepAC : norm(angA - angC);
  const largeArc = delta > Math.PI ? 1 : 0;

  const segs = arcToCubics(ax, ay, r, r, 0, largeArc, sweepFlag, cx, cy);
  if (!segs || !segs.length) {
    return {
      cx: ux,
      cy: uy,
      r,
      nodes: [
        { x: ax, y: ay, type: 'corner', handleIn: null, handleOut: null },
        { x: cx, y: cy, type: 'corner', handleIn: null, handleOut: null },
      ],
    };
  }

  const nodes: any[] = [
    { x: ax, y: ay, type: 'corner', handleIn: null, handleOut: { x: segs[0][0], y: segs[0][1] } },
  ];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const isLast = i === segs.length - 1;
    nodes.push({
      x: s[4],
      y: s[5],
      type: isLast ? 'corner' : 'symmetric',
      handleIn: { x: s[2], y: s[3] },
      handleOut: isLast ? null : { x: segs[i + 1][0], y: segs[i + 1][1] },
    });
  }

  return {
    cx: ux,
    cy: uy,
    r,
    startDeg: (angA * 180) / Math.PI,
    sweepDeg: (delta * 180) / Math.PI,
    nodes,
  };
}

/** Mengunci titik akhir ke kelipatan 45° dari titik awal. */
export function constrainPoint45(start: Pt, pt: Pt): Pt {
  const dx = pt.x - start.x;
  const dy = pt.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { ...pt };
  const snap = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: start.x + len * Math.cos(snap), y: start.y + len * Math.sin(snap) };
}

/** Mencari ujung subpath terbuka dari objek terseleksi yang berada dekat `pt` (untuk lanjutkan path di Pen/Pencil). */
export function findSelectedOpenEnd(doc: any, selObjIds: Set<string>, pt: Pt, tol: number) {
  for (const o of doc.objects || []) {
    if (o.hidden || o.locked || o.img || o.text || !selObjIds.has(o.id)) continue;
    for (const sp of o.subs || []) {
      if (sp.closed || !sp.nodes || sp.nodes.length === 0) continue;
      const first = sp.nodes[0];
      const last = sp.nodes[sp.nodes.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) <= tol) {
        return { obj: o, sp, isStart: false, node: last };
      }
      if (sp.nodes.length > 1 && Math.hypot(pt.x - first.x, pt.y - first.y) <= tol) {
        return { obj: o, sp, isStart: true, node: first };
      }
    }
  }
  return null;
}

/** Membalik urutan node subpath bila user melanjutkan dari titik awal path terbuka. */
export function reverseSubpathNodes(sp: any) {
  const rev = [...sp.nodes].reverse().map((n: any) => ({
    ...n,
    handleIn: n.handleOut ? { ...n.handleOut } : null,
    handleOut: n.handleIn ? { ...n.handleIn } : null,
  }));
  return { ...sp, nodes: rev };
}

/** Menggeser anchor beserta kedua handle-nya saat `Space` ditahan di Pen Tool. */
export function translateAnchorInDoc(doc: any, oid: string, spid: string, nid: string, dx: number, dy: number) {
  return {
    ...doc,
    objects: (doc.objects || []).map((o: any) =>
      o.id !== oid
        ? o
        : {
            ...o,
            subs: (o.subs || []).map((sp: any) =>
              sp.id !== spid
                ? sp
                : {
                    ...sp,
                    nodes: (sp.nodes || []).map((n: any) =>
                      n.id !== nid
                        ? n
                        : {
                            ...n,
                            x: n.x + dx,
                            y: n.y + dy,
                            handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
                            handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
                          }
                    ),
                  }
            ),
          }
    ),
  };
}

/**
 * Shape Builder ala VectorCraft: mendukung klik tunggal pada region/bentuk
 * maupun seret melintasi beberapa bentuk (`union` atau `Alt` = `subtract`/`erase`).
 */
export function applyShapeBuilderVectorcraft(
  doc: any,
  selIds: Set<string>,
  strokePts: Pt[],
  opts: { alt?: boolean; shift?: boolean },
  say: (msg: string) => void
) {
  const selected = (doc.objects || []).filter((o: any) => selIds.has(o.id));
  if (selected.length === 0) return { doc, resultId: null, changed: false };

  const pts =
    opts.shift && strokePts.length >= 2
      ? [strokePts[0], strokePts[strokePts.length - 1]]
      : strokePts;

  // Klik tunggal (tanpa drag): cari bentuk di bawah titik klik
  if (pts.length === 1) {
    const p = pts[0];
    const hit = [...selected].reverse().find(o => {
      const rings = flattenObjToRings(o).rings;
      return rings.length > 0 && isInsideRings(p.x, p.y, rings);
    });
    if (!hit) return { doc, resultId: null, changed: false };

    if (opts.alt) {
      // Alt+Klik: hapus bentuk yang diklik dari seleksi
      const remaining = selected.filter((o: any) => o.id !== hit.id);
      if (remaining.length === 0) {
        return {
          doc: { ...doc, objects: (doc.objects || []).filter((o: any) => o.id !== hit.id) },
          resultId: null,
          changed: true,
        };
      }
      const nextDoc = { ...doc, objects: (doc.objects || []).filter((o: any) => o.id !== hit.id) };
      say(`Shape Builder: ${hit.name} dihapus`);
      return { doc: nextDoc, resultId: remaining[0].id, changed: true };
    }

    // Klik biasa: jika hanya 1 atau 2+ objek, pisahkan/jadikan bentuk aktif teratas
    say(`Shape Builder: ${hit.name} dipilih`);
    return { doc, resultId: hit.id, changed: false };
  }

  // Drag melintasi bentuk
  const mode = opts.alt ? 'subtract' : 'union';
  const crossed = shapesCrossedByStroke(selected, pts);
  if (mode === 'union' && crossed.length >= 2) {
    const nd = applyShapeBuilder(doc, selIds, pts, 'union', say);
    if (nd !== doc) {
      const baseIds = new Set((doc.objects || []).map((o: any) => o.id));
      const resObj = (nd.objects || []).find((o: any) => !baseIds.has(o.id));
      return { doc: nd, resultId: resObj ? resObj.id : null, changed: true };
    }
  } else if (mode === 'subtract' && crossed.length >= 1) {
    if (selected.length >= 2) {
      const nd = applyShapeBuilder(doc, selIds, pts, 'subtract', say);
      if (nd !== doc) {
        const baseIds = new Set((doc.objects || []).map((o: any) => o.id));
        const resObj = (nd.objects || []).find((o: any) => !baseIds.has(o.id));
        return { doc: nd, resultId: resObj ? resObj.id : null, changed: true };
      }
    } else {
      const crossedIds = new Set(crossed.map((o: any) => o.id));
      const nd = { ...doc, objects: (doc.objects || []).filter((o: any) => !crossedIds.has(o.id)) };
      return { doc: nd, resultId: null, changed: true };
    }
  } else if (selected.length >= 2) {
    const res = booleanDoc(doc, 'union', selIds);
    if (res.changed) {
      return { doc: res.doc, resultId: res.resultId, changed: true };
    }
  }

  return { doc, resultId: null, changed: false };
}

export function makeNodeId() {
  return uid();
}
