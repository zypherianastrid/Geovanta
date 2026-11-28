/**
 * @file src/engine/warpAndBlendEngine.ts
 * @description Advanced transforms & effects: Skew/Shear, Perspective Distort, Envelope Warp, Object Blend, and Variable-Width Stroke.
 */
import { uid, rd } from './vectorPrimitives.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';

const lerpNum = (a: number, b: number, t: number) => a + (b - a) * t;

function mapObjectPoints(o: any, fn: (x: number, y: number) => { x: number; y: number }): any {
  return {
    ...o,
    subs: (o.subs || []).map((sp: any) => ({
      ...sp,
      nodes: (sp.nodes || []).map((n: any) => {
        const p = fn(n.x, n.y);
        const hi = n.handleIn ? fn(n.handleIn.x, n.handleIn.y) : null;
        const ho = n.handleOut ? fn(n.handleOut.x, n.handleOut.y) : null;
        return { ...n, x: rd(p.x), y: rd(p.y), handleIn: hi ? { x: rd(hi.x), y: rd(hi.y) } : null, handleOut: ho ? { x: rd(ho.x), y: rd(ho.y) } : null };
      }),
    })),
  };
}

function selectionBBox(objects: any[]): [number, number, number, number] | null {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const o of objects) {
    const bb = tightBBox(o);
    if (!bb) continue;
    l = Math.min(l, bb[0]); t = Math.min(t, bb[1]);
    r = Math.max(r, bb[2]); b = Math.max(b, bb[3]);
  }
  return Number.isFinite(l) ? [l, t, r, b] : null;
}

export function skewObjectDoc(doc: any, selIds: Set<string> | string[], skewXDeg = 0, skewYDeg = 0) {
  const idSet = selIds instanceof Set ? selIds : new Set(selIds || []);
  const targets = (doc?.objects || []).filter((o: any) => idSet.has(o.id) && o.subs?.length);
  if (!targets.length) return { doc, changed: false };
  const bb = selectionBBox(targets);
  if (!bb) return { doc, changed: false };
  const cx = (bb[0] + bb[2]) / 2;
  const cy = (bb[1] + bb[3]) / 2;
  const kx = Math.tan((skewXDeg * Math.PI) / 180);
  const ky = Math.tan((skewYDeg * Math.PI) / 180);

  const nextObjects = (doc.objects || []).map((o: any) =>
    idSet.has(o.id) && o.subs?.length
      ? mapObjectPoints(o, (x, y) => ({
          x: x + (y - cy) * kx,
          y: y + (x - cx) * ky,
        }))
      : o
  );
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}

export function perspectiveDistortDoc(
  doc: any,
  selIds: Set<string> | string[],
  quad: [[number, number], [number, number], [number, number], [number, number]]
) {
  const idSet = selIds instanceof Set ? selIds : new Set(selIds || []);
  const targets = (doc?.objects || []).filter((o: any) => idSet.has(o.id) && o.subs?.length);
  if (!targets.length || !Array.isArray(quad) || quad.length !== 4) return { doc, changed: false };
  const bb = selectionBBox(targets);
  if (!bb) return { doc, changed: false };
  const w = Math.max(1e-6, bb[2] - bb[0]);
  const h = Math.max(1e-6, bb[3] - bb[1]);
  const [tl, tr, br, bl] = quad;

  const nextObjects = (doc.objects || []).map((o: any) =>
    idSet.has(o.id) && o.subs?.length
      ? mapObjectPoints(o, (x, y) => {
          const u = (x - bb[0]) / w;
          const v = (y - bb[1]) / h;
          const topX = lerpNum(tl[0], tr[0], u);
          const topY = lerpNum(tl[1], tr[1], u);
          const botX = lerpNum(bl[0], br[0], u);
          const botY = lerpNum(bl[1], br[1], u);
          return { x: lerpNum(topX, botX, v), y: lerpNum(topY, botY, v) };
        })
      : o
  );
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}

export function envelopeWarpDoc(
  doc: any,
  selIds: Set<string> | string[],
  mode: 'arc' | 'flag' | 'bulge' = 'arc',
  bend = 0.25
) {
  const idSet = selIds instanceof Set ? selIds : new Set(selIds || []);
  const targets = (doc?.objects || []).filter((o: any) => idSet.has(o.id) && o.subs?.length);
  if (!targets.length) return { doc, changed: false };
  const bb = selectionBBox(targets);
  if (!bb) return { doc, changed: false };
  const w = Math.max(1e-6, bb[2] - bb[0]);
  const h = Math.max(1e-6, bb[3] - bb[1]);

  const nextObjects = (doc.objects || []).map((o: any) =>
    idSet.has(o.id) && o.subs?.length
      ? mapObjectPoints(o, (x, y) => {
          const u = (x - bb[0]) / w;
          const v = (y - bb[1]) / h;
          if (mode === 'flag') {
            return { x, y: y + Math.sin(u * Math.PI * 2) * h * bend * 0.5 };
          }
          if (mode === 'bulge') {
            const bulge = Math.sin(u * Math.PI) * (v - 0.5) * h * bend;
            return { x, y: y + bulge };
          }
          // arc
          return { x, y: y - Math.sin(u * Math.PI) * h * bend };
        })
      : o
  );
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}

function parseHexRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || '#000000').trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHexRgb(a);
  const [r2, g2, b2] = parseHexRgb(b);
  const r = Math.round(lerpNum(r1, r2, t)).toString(16).padStart(2, '0');
  const g = Math.round(lerpNum(g1, g2, t)).toString(16).padStart(2, '0');
  const bl = Math.round(lerpNum(b1, b2, t)).toString(16).padStart(2, '0');
  return `#${r}${g}${bl}`;
}

export function blendObjectsDoc(doc: any, objIdA: string, objIdB: string, steps = 3) {
  const objects: any[] = doc?.objects || [];
  const a = objects.find(o => o.id === objIdA);
  const b = objects.find(o => o.id === objIdB);
  const nSteps = Math.max(1, Math.min(50, Math.round(steps)));
  if (!a || !b || !a.subs?.[0]?.nodes?.length || !b.subs?.[0]?.nodes?.length) {
    return { doc, changed: false, addedIds: [] };
  }
  const nodesA = a.subs[0].nodes;
  const nodesB = b.subs[0].nodes;
  const count = Math.min(nodesA.length, nodesB.length);
  const added: any[] = [];

  for (let s = 1; s <= nSteps; s++) {
    const t = s / (nSteps + 1);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: uid(),
        x: rd(lerpNum(nodesA[i].x, nodesB[i].x, t)),
        y: rd(lerpNum(nodesA[i].y, nodesB[i].y, t)),
        type: 'corner',
        handleIn: null,
        handleOut: null,
      });
    }
    added.push({
      id: uid(),
      name: `Blend-${s}`,
      type: 'path',
      fill: a.fill && b.fill && a.fill !== 'none' && b.fill !== 'none' ? lerpHex(a.fill, b.fill, t) : (a.fill || '#000000'),
      stroke: a.stroke || 'none',
      strokeWidth: lerpNum(a.strokeWidth || 0, b.strokeWidth || 0, t),
      opacity: lerpNum(a.opacity ?? 1, b.opacity ?? 1, t),
      subs: [{ id: uid(), closed: Boolean(a.subs[0].closed), nodes }],
    });
  }

  return {
    doc: { ...doc, objects: [...objects, ...added] },
    changed: true,
    addedIds: added.map(x => x.id),
  };
}

export function applyVariableWidthProfileDoc(
  doc: any,
  objId: string,
  profile: Array<{ t: number; width: number }>
) {
  const objects: any[] = doc?.objects || [];
  const idx = objects.findIndex(o => o.id === objId);
  if (idx === -1 || !Array.isArray(profile) || profile.length < 2) return { doc, changed: false };
  const o = objects[idx];
  const sp = o.subs?.[0];
  const nodes = sp?.nodes;
  if (!nodes || nodes.length < 2) return { doc, changed: false };

  const sampleWidth = (t: number) => {
    const sorted = profile.slice().sort((p, q) => p.t - q.t);
    if (t <= sorted[0].t) return sorted[0].width;
    if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].width;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].t && t <= sorted[i + 1].t) {
        const u = (t - sorted[i].t) / Math.max(1e-6, sorted[i + 1].t - sorted[i].t);
        return lerpNum(sorted[i].width, sorted[i + 1].width, u);
      }
    }
    return sorted[0].width;
  };

  const leftPts: Array<{ x: number; y: number }> = [];
  const rightPts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    const prev = nodes[Math.max(0, i - 1)];
    const next = nodes[Math.min(nodes.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const halfW = Math.max(0.5, sampleWidth(i / Math.max(1, nodes.length - 1)) / 2);
    leftPts.push({ x: rd(nodes[i].x + nx * halfW), y: rd(nodes[i].y + ny * halfW) });
    rightPts.unshift({ x: rd(nodes[i].x - nx * halfW), y: rd(nodes[i].y - ny * halfW) });
  }

  const nextObj = {
    ...o,
    fill: o.stroke && o.stroke !== 'none' ? o.stroke : (o.fill || '#000000'),
    stroke: 'none',
    strokeWidth: 0,
    widthProfile: profile,
    subs: [{
      id: uid(),
      closed: true,
      nodes: [...leftPts, ...rightPts].map(p => ({ id: uid(), x: p.x, y: p.y, type: 'corner', handleIn: null, handleOut: null })),
    }],
  };
  const nextObjects = objects.slice();
  nextObjects[idx] = nextObj;
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}
