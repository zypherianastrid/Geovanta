/**
 * @file src/engine/pathCutEngine.ts
 * @description Knife cut, Scissors split, and True Vector Eraser operations on VectorDocument.
 */
import { uid, rd } from './vectorPrimitives.tsx';
import { booleanDoc } from './pathBoolean.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';

export interface CutResult {
  doc: any;
  changed: boolean;
  resultIds?: string[];
}

function makeHalfPlaneObj(p1: { x: number; y: number }, p2: { x: number; y: number }, side: 1 | -1, extent = 50000) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * side;
  const ny = ux * side;
  const a = { x: p1.x - ux * extent, y: p1.y - uy * extent };
  const b = { x: p2.x + ux * extent, y: p2.y + uy * extent };
  const c = { x: b.x + nx * extent, y: b.y + ny * extent };
  const d = { x: a.x + nx * extent, y: a.y + ny * extent };
  return {
    id: uid(),
    type: 'path',
    fill: '#000000',
    stroke: 'none',
    strokeWidth: 0,
    subs: [{
      id: uid(),
      closed: true,
      nodes: [a, b, c, d].map(pt => ({ id: uid(), x: rd(pt.x), y: rd(pt.y), type: 'corner', handleIn: null, handleOut: null })),
    }],
  };
}

export function knifeCutDoc(
  doc: any,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  selIds?: Set<string> | string[]
): CutResult {
  const idSet = selIds ? (selIds instanceof Set ? selIds : new Set(selIds)) : null;
  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const targets = objects.filter(o =>
    (!idSet || idSet.has(o.id)) && !o.hidden && !o.locked && !o.img && !o.text && o.subs && o.subs.length
  );
  if (!targets.length || Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1e-3) {
    return { doc, changed: false };
  }

  const hpA = makeHalfPlaneObj(p1, p2, 1);
  const hpB = makeHalfPlaneObj(p1, p2, -1);
  const nextObjects: any[] = [];
  const resultIds: string[] = [];
  let changed = false;

  for (const o of objects) {
    if (!targets.includes(o)) {
      nextObjects.push(o);
      continue;
    }
    const bb = tightBBox(o);
    if (!bb) {
      nextObjects.push(o);
      continue;
    }
    const dA = { ...doc, objects: [o, hpA] };
    const dB = { ...doc, objects: [o, hpB] };
    const rA = booleanDoc(dA, 'intersect', new Set([o.id, hpA.id]));
    const rB = booleanDoc(dB, 'intersect', new Set([o.id, hpB.id]));
    if (rA.changed && rB.changed && rA.doc.objects[0] && rB.doc.objects[0]) {
      changed = true;
      const objA = { ...o, id: uid(), name: (o.name || 'Path') + '-1', subs: rA.doc.objects[0].subs };
      const objB = { ...o, id: uid(), name: (o.name || 'Path') + '-2', subs: rB.doc.objects[0].subs };
      resultIds.push(objA.id, objB.id);
      nextObjects.push(objA, objB);
    } else {
      nextObjects.push(o);
    }
  }

  return changed ? { doc: { ...doc, objects: nextObjects }, changed: true, resultIds } : { doc, changed: false };
}

export function vectorEraseDoc(
  doc: any,
  points: Array<{ x: number; y: number }>,
  radius = 10,
  selIds?: Set<string> | string[]
): CutResult {
  if (!Array.isArray(points) || points.length < 1) return { doc, changed: false };
  const idSet = selIds ? (selIds instanceof Set ? selIds : new Set(selIds)) : null;
  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const targets = objects.filter(o =>
    (!idSet || idSet.has(o.id)) && !o.hidden && !o.locked && !o.img && !o.text && o.subs && o.subs.length
  );
  if (!targets.length) return { doc, changed: false };

  // Build eraser polygon strip around points
  const r = Math.max(2, Number(radius) || 10);
  const pts = points.length === 1 ? [points[0], { x: points[0].x + 0.5, y: points[0].y }] : points;
  const leftSide: Array<{ x: number; y: number }> = [];
  const rightSide: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    leftSide.push({ x: rd(pts[i].x + nx * r), y: rd(pts[i].y + ny * r) });
    rightSide.unshift({ x: rd(pts[i].x - nx * r), y: rd(pts[i].y - ny * r) });
  }
  const eraserPoly = {
    id: uid(),
    type: 'path',
    fill: '#000000',
    stroke: 'none',
    strokeWidth: 0,
    subs: [{
      id: uid(),
      closed: true,
      nodes: [...leftSide, ...rightSide].map(p => ({ id: uid(), x: p.x, y: p.y, type: 'corner', handleIn: null, handleOut: null })),
    }],
  };

  let changed = false;
  const nextObjects: any[] = [];
  for (const o of objects) {
    if (!targets.includes(o)) {
      nextObjects.push(o);
      continue;
    }
    const res = booleanDoc({ ...doc, objects: [o, eraserPoly] }, 'subtract', new Set([o.id, eraserPoly.id]));
    if (res.changed && res.doc.objects[0]) {
      changed = true;
      nextObjects.push({ ...o, subs: res.doc.objects[0].subs });
    } else {
      nextObjects.push(o);
    }
  }
  return changed ? { doc: { ...doc, objects: nextObjects }, changed: true } : { doc, changed: false };
}

export function scissorsSplitAtPoint(
  doc: any,
  objId: string,
  pt: { x: number; y: number }
): CutResult {
  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const idx = objects.findIndex(o => o.id === objId);
  if (idx === -1) return { doc, changed: false };
  const o = objects[idx];
  if (!o.subs || !o.subs.length) return { doc, changed: false };

  let bestSubIdx = -1;
  let bestSegIdx = -1;
  let bestDist = Infinity;
  let bestProj = { x: pt.x, y: pt.y };

  for (let si = 0; si < o.subs.length; si++) {
    const sp = o.subs[si];
    const nodes = sp?.nodes || [];
    if (nodes.length < 2) continue;
    const count = sp.closed ? nodes.length : nodes.length - 1;
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const len2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((pt.x - a.x) * vx + (pt.y - a.y) * vy) / len2));
      const px = a.x + t * vx;
      const py = a.y + t * vy;
      const d = Math.hypot(pt.x - px, pt.y - py);
      if (d < bestDist) {
        bestDist = d;
        bestSubIdx = si;
        bestSegIdx = i;
        bestProj = { x: rd(px), y: rd(py) };
      }
    }
  }

  if (bestSubIdx === -1) return { doc, changed: false };
  const targetSub = o.subs[bestSubIdx];
  const nodes = targetSub.nodes.map((n: any) => ({ ...n }));
  const splitNode = { id: uid(), x: bestProj.x, y: bestProj.y, type: 'corner', handleIn: null, handleOut: null };

  let nextSubs: any[];
  if (targetSub.closed) {
    // Open the closed loop at splitNode
    const reordered = [
      { ...splitNode },
      ...nodes.slice(bestSegIdx + 1),
      ...nodes.slice(0, bestSegIdx + 1),
      { ...splitNode, id: uid() },
    ];
    nextSubs = o.subs.map((sp: any, i: number) =>
      i === bestSubIdx ? { ...sp, closed: false, nodes: reordered } : sp
    );
  } else {
    const firstPart = { id: uid(), closed: false, nodes: [...nodes.slice(0, bestSegIdx + 1), { ...splitNode }] };
    const secondPart = { id: uid(), closed: false, nodes: [{ ...splitNode, id: uid() }, ...nodes.slice(bestSegIdx + 1)] };
    nextSubs = [
      ...o.subs.slice(0, bestSubIdx),
      firstPart,
      secondPart,
      ...o.subs.slice(bestSubIdx + 1),
    ];
  }

  const nextObjects = objects.slice();
  nextObjects[idx] = { ...o, subs: nextSubs };
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}
