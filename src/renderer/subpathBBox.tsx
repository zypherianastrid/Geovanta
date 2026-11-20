/**
 * @file src/renderer/subpathBBox.tsx
 * @description Kalkulasi cepat dan cache WeakMap kotak batas subpath (subBBox)
 */
import { segAnalyticBBox } from '../engine/spatialIndexAndHitTest.tsx';

/* cache d / Path2D / bbox per objek (objek immutable → WeakMap) */
const VINFO = new WeakMap(),
  SUB_BB = new WeakMap();
/* IM-007: subBBox menggunakan ekstrema analitik kurva kubik, bukan sekadar hull titik kontrol */
/* IM-007: subBBox menggunakan ekstrema analitik kurva kubik, bukan sekadar hull titik kontrol */
const subBBox = sp => {
  let b = SUB_BB.get(sp);
  if (b) return b;
  let x0 = 1e18,
    y0 = 1e18,
    x1 = -1e18,
    y1 = -1e18;
  const ns = sp.nodes,
    L = ns.length;
  if (L === 1) {
    x0 = x1 = ns[0].x;
    y0 = y1 = ns[0].y;
  }
  for (let i = 0; i < (sp.closed ? L : L - 1); i++) {
    const sb = segAnalyticBBox(ns[i], ns[(i + 1) % L]);
    if (sb[0] < x0) x0 = sb[0];
    if (sb[2] > x1) x1 = sb[2];
    if (sb[1] < y0) y0 = sb[1];
    if (sb[3] > y1) y1 = sb[3];
  }
  b = [x0, y0, x1, y1];
  SUB_BB.set(sp, b);
  return b;
};

export { VINFO, SUB_BB, subBBox };
