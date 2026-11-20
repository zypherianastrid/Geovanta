/**
 * @file src/engine/freehandEngine.tsx
 * @description Engine matematika murni untuk memproses aliran titik pointer menjadi kurva vektor Bézier kubik yang halus dan presisi, serta kuas vektor ribbon berbasis tekanan/kecepatan
 */
import { schneiderFit } from './curveFittingAndAnomalies.tsx';
import { uid, rd } from './vectorPrimitives.tsx';
import type { Subpath, NodePoint, VectorObject, VectorPoint } from '../types/vectorTypes.ts';

export interface FreehandPoint {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
  [key: string]: any;
}

export interface FitSubpathOptions {
  tolerance?: number;
  closed?: boolean;
  minDistance?: number;
  smooth?: boolean;
}

export interface BrushRibbonOptions {
  baseWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  taper?: boolean;
  tolerance?: number;
}

export interface FreehandStyle {
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  opacity?: number;
  [key: string]: any;
}

export interface FreehandObjectOptions extends FitSubpathOptions, BrushRibbonOptions {
  name?: string;
  id?: string;
}

/**
 * Menyaring titik-titik berturutan yang berjarak < minDistance px untuk menghilangkan jitter/redundansi.
 * Titik awal dan akhir selalu dipertahankan secara akurat.
 */
export function distanceFilter<T extends { x: number; y: number }>(
  pts: T[],
  minDistance: number = 2.0
): T[] {
  if (!pts || pts.length === 0) return [];
  if (pts.length === 1) return [{ ...pts[0] }];

  const dMinSq = minDistance * minDistance;
  const res: T[] = [{ ...pts[0] }];

  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const prev = res[res.length - 1];
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    if (dx * dx + dy * dy >= dMinSq) {
      res.push({ ...p });
    }
  }

  // Pastikan titik terakhir selalu ada/tercermin persis
  const last = pts[pts.length - 1];
  const lastKept = res[res.length - 1];
  const dxEnd = last.x - lastKept.x;
  const dyEnd = last.y - lastKept.y;
  const dEndSq = dxEnd * dxEnd + dyEnd * dyEnd;

  if (dEndSq > 1e-6) {
    if (dEndSq >= dMinSq || res.length === 1) {
      res.push({ ...last });
    } else {
      // Perbarui titik terakhir yang disimpan ke posisi pelepasan pena aktual
      res[res.length - 1] = { ...last };
    }
  }

  return res;
}

/**
 * Moving average filter sederhana berbobot pada koordinat (x, y) & tekanan,
 * dengan titik awal dan akhir tetap dipertahankan persis.
 */
export function smoothPoints<T extends { x: number; y: number; pressure?: number }>(
  pts: T[],
  windowSize: number = 3
): T[] {
  if (!pts || pts.length <= 2 || windowSize <= 1) {
    return pts ? pts.map(p => ({ ...p })) : [];
  }

  const half = Math.floor(windowSize / 2);
  const n = pts.length;
  const res: T[] = [{ ...pts[0] }];

  for (let i = 1; i < n - 1; i++) {
    let sumX = 0;
    let sumY = 0;
    let sumP = 0;
    let sumW = 0;
    const hasPressure = pts[i].pressure !== undefined;

    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < n) {
        const w = half + 1 - Math.abs(j - i);
        sumX += pts[j].x * w;
        sumY += pts[j].y * w;
        if (hasPressure) {
          sumP += (pts[j].pressure ?? 0.5) * w;
        }
        sumW += w;
      }
    }

    const smoothed: any = {
      ...pts[i],
      x: sumX / sumW,
      y: sumY / sumW
    };
    if (hasPressure) {
      smoothed.pressure = sumP / sumW;
    }
    res.push(smoothed);
  }

  res.push({ ...pts[n - 1] });
  return res;
}

/**
 * Menghitung vektor tangen awal (t1) dan akhir (t2) untuk Schneider curve fitting.
 * t1 mengarah ke depan dari titik awal; t2 mengarah ke belakang (masuk ke kurva) dari titik akhir.
 */
function computeTangents(pts: { x: number; y: number }[], isClosed: boolean): { t1: VectorPoint; t2: VectorPoint } {
  const n = pts.length;
  if (n < 2) {
    return { t1: { x: 1, y: 0 }, t2: { x: -1, y: 0 } };
  }

  if (isClosed) {
    // Kurva tertutup: tangen di persambungan p0 & pn-1
    // pts[0] dan pts[n - 1] berada di lokasi yang sama
    const prev = pts[n - 2];
    const next = pts[1];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    let len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      dx = 1;
      dy = 0;
      len = 1;
    }
    const t1 = { x: dx / len, y: dy / len };
    const t2 = { x: -t1.x, y: -t1.y };
    return { t1, t2 };
  } else {
    // Kurva terbuka
    let dx1 = pts[1].x - pts[0].x;
    let dy1 = pts[1].y - pts[0].y;
    let len1 = Math.hypot(dx1, dy1);
    if (len1 < 1e-6) {
      dx1 = 1;
      dy1 = 0;
      len1 = 1;
    }
    const t1 = { x: dx1 / len1, y: dy1 / len1 };

    let dx2 = pts[n - 2].x - pts[n - 1].x;
    let dy2 = pts[n - 2].y - pts[n - 1].y;
    let len2 = Math.hypot(dx2, dy2);
    if (len2 < 1e-6) {
      dx2 = -1;
      dy2 = 0;
      len2 = 1;
    }
    const t2 = { x: dx2 / len2, y: dy2 / len2 };

    return { t1, t2 };
  }
}

/**
 * Mencocokkan aliran titik menjadi Subpath Bézier kubik presisi menggunakan algoritma Philip Schneider.
 */
export function fitPointsToSubpath(
  pts: FreehandPoint[],
  options: FitSubpathOptions = {}
): Subpath {
  if (!pts || pts.length === 0) {
    return { id: uid(), closed: false, nodes: [] };
  }

  const minDistance = options.minDistance !== undefined ? options.minDistance : 2.0;
  const tolerance = options.tolerance !== undefined ? options.tolerance : 1.5;
  const smooth = options.smooth !== false;
  let isClosed = !!options.closed;

  // 1. Distance decimation
  let cleaned = minDistance > 0 ? distanceFilter(pts, minDistance) : pts.map(p => ({ ...p }));

  // 2. Moving average smoothing
  if (smooth && cleaned.length >= 3) {
    cleaned = smoothPoints(cleaned, 3);
  }

  if (cleaned.length === 0) {
    return { id: uid(), closed: false, nodes: [] };
  }

  if (cleaned.length === 1) {
    return {
      id: uid(),
      closed: false,
      nodes: [
        {
          id: uid(),
          x: rd(cleaned[0].x),
          y: rd(cleaned[0].y),
          handleIn: null,
          handleOut: null,
          type: 'corner'
        }
      ]
    };
  }

  // 3. Deteksi auto-close: jika closed !== true tapi jarak antara titik awal & akhir <= 10px (titik >= 4)
  if (!isClosed && cleaned.length >= 4) {
    const dStartEnd = Math.hypot(
      cleaned[0].x - cleaned[cleaned.length - 1].x,
      cleaned[0].y - cleaned[cleaned.length - 1].y
    );
    if (dStartEnd <= 10.0) {
      isClosed = true;
    }
  }

  // Jika tertutup, pastikan titik akhir menyatu persis dengan titik awal
  if (isClosed) {
    const lastPt = cleaned[cleaned.length - 1];
    const dEnd = Math.hypot(lastPt.x - cleaned[0].x, lastPt.y - cleaned[0].y);
    if (dEnd > 1e-4) {
      cleaned.push({ ...cleaned[0] });
    }
  }

  // 4. Hitung tangen ujung
  const { t1, t2 } = computeTangents(cleaned, isClosed);

  // 5. Panggil schneiderFit
  const fitted = schneiderFit(cleaned, t1, t2, tolerance);

  // Fallback jika schneiderFit tidak menghasilkan segmen
  if (!fitted || fitted.length === 0) {
    const fallbackNodes: NodePoint[] = cleaned.map(p => ({
      id: uid(),
      x: rd(p.x),
      y: rd(p.y),
      handleIn: null,
      handleOut: null,
      type: 'corner'
    }));
    return { id: uid(), closed: isClosed, nodes: fallbackNodes };
  }

  const M = fitted.length;
  const nodes: NodePoint[] = [];

  if (isClosed) {
    if (M === 1) {
      nodes.push({
        id: uid(),
        x: rd(fitted[0][0][0]),
        y: rd(fitted[0][0][1]),
        handleIn: {
          x: rd(fitted[0][2][0]),
          y: rd(fitted[0][2][1])
        },
        handleOut: {
          x: rd(fitted[0][1][0]),
          y: rd(fitted[0][1][1])
        },
        type: 'smooth'
      });
    } else {
      // Node 0 di titik persambungan awal/akhir
      nodes.push({
        id: uid(),
        x: rd(fitted[0][0][0]),
        y: rd(fitted[0][0][1]),
        handleIn: {
          x: rd(fitted[M - 1][2][0]),
          y: rd(fitted[M - 1][2][1])
        },
        handleOut: {
          x: rd(fitted[0][1][0]),
          y: rd(fitted[0][1][1])
        },
        type: 'smooth'
      });

      // Intermediate nodes
      for (let k = 1; k < M; k++) {
        nodes.push({
          id: uid(),
          x: rd(fitted[k][0][0]),
          y: rd(fitted[k][0][1]),
          handleIn: {
            x: rd(fitted[k - 1][2][0]),
            y: rd(fitted[k - 1][2][1])
          },
          handleOut: {
            x: rd(fitted[k][1][0]),
            y: rd(fitted[k][1][1])
          },
          type: 'smooth'
        });
      }
    }
  } else {
    // Kurva terbuka
    // Node awal
    nodes.push({
      id: uid(),
      x: rd(fitted[0][0][0]),
      y: rd(fitted[0][0][1]),
      handleIn: null,
      handleOut: {
        x: rd(fitted[0][1][0]),
        y: rd(fitted[0][1][1])
      },
      type: 'corner'
    });

    // Intermediate nodes
    for (let k = 0; k < M - 1; k++) {
      const segCurr = fitted[k];
      const segNext = fitted[k + 1];
      nodes.push({
        id: uid(),
        x: rd(segCurr[3][0]),
        y: rd(segCurr[3][1]),
        handleIn: {
          x: rd(segCurr[2][0]),
          y: rd(segCurr[2][1])
        },
        handleOut: {
          x: rd(segNext[1][0]),
          y: rd(segNext[1][1])
        },
        type: 'smooth'
      });
    }

    // Node akhir
    nodes.push({
      id: uid(),
      x: rd(fitted[M - 1][3][0]),
      y: rd(fitted[M - 1][3][1]),
      handleIn: {
        x: rd(fitted[M - 1][2][0]),
        y: rd(fitted[M - 1][2][1])
      },
      handleOut: null,
      type: 'corner'
    });
  }

  return { id: uid(), closed: isClosed, nodes };
}

/**
 * Helper pembuat subpath lingkaran Bézier kubik 4-node
 */
function makeCircleSubpath(cx: number, cy: number, r: number): Subpath {
  const k = r * 0.5522847498;
  return {
    id: uid(),
    closed: true,
    nodes: [
      {
        id: uid(),
        x: rd(cx),
        y: rd(cy - r),
        handleIn: { x: rd(cx - k), y: rd(cy - r) },
        handleOut: { x: rd(cx + k), y: rd(cy - r) },
        type: 'smooth'
      },
      {
        id: uid(),
        x: rd(cx + r),
        y: rd(cy),
        handleIn: { x: rd(cx + r), y: rd(cy - k) },
        handleOut: { x: rd(cx + r), y: rd(cy + k) },
        type: 'smooth'
      },
      {
        id: uid(),
        x: rd(cx),
        y: rd(cy + r),
        handleIn: { x: rd(cx + k), y: rd(cy + r) },
        handleOut: { x: rd(cx - k), y: rd(cy + r) },
        type: 'smooth'
      },
      {
        id: uid(),
        x: rd(cx - r),
        y: rd(cy),
        handleIn: { x: rd(cx - r), y: rd(cy + k) },
        handleOut: { x: rd(cx - r), y: rd(cy - k) },
        type: 'smooth'
      }
    ]
  };
}

/**
 * Resampling titik jika ada jarak segmen yang terlalu renggang,
 * agar profil lebar dan taper dapat dihitung dengan mulus.
 */
function resamplePointsIfNeeded<T extends { x: number; y: number; pressure?: number; time?: number }>(
  pts: T[],
  maxSegmentLength: number = 6.0
): T[] {
  if (pts.length < 2) return pts;
  const result: T[] = [{ ...pts[0] }];

  for (let i = 1; i < pts.length; i++) {
    const pPrev = pts[i - 1];
    const pCurr = pts[i];
    const d = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
    if (d > maxSegmentLength) {
      const steps = Math.ceil(d / maxSegmentLength);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const interp: any = {
          x: pPrev.x + (pCurr.x - pPrev.x) * t,
          y: pPrev.y + (pCurr.y - pPrev.y) * t
        };
        if (pPrev.pressure !== undefined && pCurr.pressure !== undefined) {
          interp.pressure = pPrev.pressure + (pCurr.pressure - pPrev.pressure) * t;
        } else if (pCurr.pressure !== undefined) {
          interp.pressure = pCurr.pressure;
        } else if (pPrev.pressure !== undefined) {
          interp.pressure = pPrev.pressure;
        }
        if (pPrev.time !== undefined && pCurr.time !== undefined) {
          interp.time = pPrev.time + (pCurr.time - pPrev.time) * t;
        }
        result.push(interp);
      }
    }
    result.push({ ...pCurr });
  }

  return result;
}

/**
 * Menghasilkan kuas pita vektor (smooth vector brush ribbon) tertutup
 * berdasarkan tekanan pena atau tapering berbasis kecepatan/kurva.
 */
export function generateBrushRibbon(
  pts: FreehandPoint[],
  options: BrushRibbonOptions = {}
): Subpath {
  if (!pts || pts.length === 0) {
    return { id: uid(), closed: true, nodes: [] };
  }

  const baseWidth = options.baseWidth ?? 8;
  const minWidth = options.minWidth ?? 1;
  const maxWidth = options.maxWidth ?? 32;
  const taper = options.taper !== false;
  const tolerance = options.tolerance ?? 1.5;

  // 1. Filter jitter awal
  const filtered = distanceFilter(pts, 2.0);
  let cleaned = filtered.length >= 3 ? smoothPoints(filtered, 3) : filtered;

  if (cleaned.length === 0) {
    return { id: uid(), closed: true, nodes: [] };
  }

  if (cleaned.length === 1) {
    const p0 = cleaned[0];
    const w = Math.max(minWidth, Math.min(maxWidth, baseWidth * (0.2 + 1.6 * (p0.pressure ?? 0.5))));
    return makeCircleSubpath(p0.x, p0.y, w / 2);
  }

  // 2. Resample jika titik terlalu renggang
  cleaned = resamplePointsIfNeeded(cleaned, 6.0);
  const n = cleaned.length;

  // 3. Hitung jarak kumulatif
  const dists = [0];
  let totalLen = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(cleaned[i].x - cleaned[i - 1].x, cleaned[i].y - cleaned[i - 1].y);
    totalLen += d;
    dists.push(totalLen);
  }

  if (totalLen < 1e-4) {
    const p0 = cleaned[0];
    const w = Math.max(minWidth, Math.min(maxWidth, baseWidth * (0.2 + 1.6 * (p0.pressure ?? 0.5))));
    return makeCircleSubpath(p0.x, p0.y, w / 2);
  }

  // 4. Deteksi apakah tekanan konstan (mouse/trackpad) vs tekanan bervariasi (stylus)
  let minP = 1.0;
  let maxP = 0.0;
  let hasPressureVal = false;
  for (const p of cleaned) {
    if (p.pressure !== undefined) {
      hasPressureVal = true;
      minP = Math.min(minP, p.pressure);
      maxP = Math.max(maxP, p.pressure);
    }
  }
  const isConstantPressure = !hasPressureVal || (maxP - minP < 0.05);

  // 5. Hitung lebar & jari-jari di setiap titik
  const radii: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = cleaned[i];
    const pressure = p.pressure !== undefined ? p.pressure : 0.5;
    let w = baseWidth * (0.2 + 1.6 * pressure);

    if (isConstantPressure && taper && totalLen > 0) {
      const u = dists[i] / totalLen;
      let tFactor = 1.0;
      if (u < 0.15) {
        const t = u / 0.15;
        tFactor = Math.sin((t * Math.PI) / 2);
      } else if (u > 0.85) {
        const t = (1 - u) / 0.15;
        tFactor = Math.sin((t * Math.PI) / 2);
      }
      w *= tFactor;
    }

    w = Math.max(minWidth, Math.min(maxWidth, w));
    radii.push(w / 2);
  }

  // 6. Hitung tangen & normal di setiap titik
  const tangents: VectorPoint[] = [];
  const normals: VectorPoint[] = [];

  for (let i = 0; i < n; i++) {
    let tx = 0, ty = 0;
    if (i === 0) {
      tx = cleaned[1].x - cleaned[0].x;
      ty = cleaned[1].y - cleaned[0].y;
    } else if (i === n - 1) {
      tx = cleaned[n - 1].x - cleaned[n - 2].x;
      ty = cleaned[n - 1].y - cleaned[n - 2].y;
    } else {
      const dx1 = cleaned[i].x - cleaned[i - 1].x;
      const dy1 = cleaned[i].y - cleaned[i - 1].y;
      const l1 = Math.hypot(dx1, dy1) || 1;
      const dx2 = cleaned[i + 1].x - cleaned[i].x;
      const dy2 = cleaned[i + 1].y - cleaned[i].y;
      const l2 = Math.hypot(dx2, dy2) || 1;
      tx = dx1 / l1 + dx2 / l2;
      ty = dy1 / l1 + dy2 / l2;
    }
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    tangents.push({ x: tx, y: ty });
    // Left normal (-ty, tx)
    normals.push({ x: -ty, y: tx });
  }

  // 7. Hitung batas kiri dan kanan
  const leftPts: VectorPoint[] = [];
  const rightPts: VectorPoint[] = [];

  for (let i = 0; i < n; i++) {
    const r = radii[i];
    const nx = normals[i].x;
    const ny = normals[i].y;
    leftPts.push({
      x: cleaned[i].x + nx * r,
      y: cleaned[i].y + ny * r
    });
    rightPts.push({
      x: cleaned[i].x - nx * r,
      y: cleaned[i].y - ny * r
    });
  }

  // 8. Bangun poligon tertutup
  const poly: VectorPoint[] = [];

  // A. Batas kiri: dari awal ke akhir
  for (let i = 0; i < n; i++) {
    poly.push(leftPts[i]);
  }

  // B. Tutup setengah lingkaran di ujung (end cap) dari L_end ke R_end
  const S = 6;
  const pend = cleaned[n - 1];
  const rend = radii[n - 1];
  const Tend = tangents[n - 1];
  const Nend = normals[n - 1];
  for (let k = 1; k <= S; k++) {
    const theta = (Math.PI / 2) - (k / (S + 1)) * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    poly.push({
      x: pend.x + rend * (cosT * Tend.x + sinT * Nend.x),
      y: pend.y + rend * (cosT * Tend.y + sinT * Nend.y)
    });
  }

  // C. Batas kanan: dari akhir ke awal
  for (let i = n - 1; i >= 0; i--) {
    poly.push(rightPts[i]);
  }

  // D. Tutup setengah lingkaran di pangkal (start cap) dari R_0 ke L_0
  const p0 = cleaned[0];
  const r0 = radii[0];
  const T0 = tangents[0];
  const N0 = normals[0];
  for (let k = 1; k <= S; k++) {
    const theta = (-Math.PI / 2) - (k / (S + 1)) * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    poly.push({
      x: p0.x + r0 * (cosT * T0.x + sinT * N0.x),
      y: p0.y + r0 * (cosT * T0.y + sinT * N0.y)
    });
  }

  // 9. Refit poligon tertutup ke Subpath kubik tertutup
  return fitPointsToSubpath(poly, {
    tolerance,
    closed: true,
    minDistance: 1.0,
    smooth: true
  });
}

/**
 * Menghasilkan VectorObject pencil baru dengan stroke cap & join bulat.
 */
export function createPencilObject(
  pts: FreehandPoint[],
  style: FreehandStyle = {},
  options: FreehandObjectOptions = {}
): VectorObject {
  const fittedSub = fitPointsToSubpath(pts, {
    tolerance: options.tolerance ?? 1.5,
    closed: options.closed ?? false,
    minDistance: options.minDistance ?? 2.0,
    smooth: options.smooth ?? true
  });

  return {
    id: options.id || uid(),
    name: options.name || 'Pencil',
    type: 'path',
    fill: 'none',
    stroke: style.stroke || '#000000',
    strokeWidth: style.strokeWidth != null ? style.strokeWidth : 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    opacity: style.opacity != null ? style.opacity : 1,
    subs: [fittedSub]
  };
}

/**
 * Menghasilkan VectorObject kuas (smooth vector brush) baru berupa ribbon path tertutup terisi warna.
 */
export function createBrushObject(
  pts: FreehandPoint[],
  style: FreehandStyle = {},
  options: FreehandObjectOptions = {}
): VectorObject {
  const ribbonSub = generateBrushRibbon(pts, {
    baseWidth: options.baseWidth ?? 8,
    minWidth: options.minWidth ?? 1,
    maxWidth: options.maxWidth ?? 32,
    taper: options.taper ?? true,
    tolerance: options.tolerance ?? 1.5
  });

  const brushColor =
    style.stroke && style.stroke !== 'none'
      ? style.stroke
      : style.fill && style.fill !== 'none'
      ? style.fill
      : '#000000';

  return {
    id: options.id || uid(),
    name: options.name || 'Brush',
    type: 'path',
    fill: brushColor,
    stroke: 'none',
    strokeWidth: 0,
    opacity: style.opacity != null ? style.opacity : 1,
    subs: [ribbonSub]
  };
}
