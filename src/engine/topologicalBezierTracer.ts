/**
 * @file src/engine/topologicalBezierTracer.ts
 * @description Unified Topological Shared-Edge Cubic-Bézier Auto-Trace Engine.
 * Eliminates pixel-staircase node explosion AND cross-region seam gaps by:
 * 1. Adaptive 15-bit exact histogram classification + farthest-first contrast-weighted K-Means++ palette.
 * 2. GPU WebGL2 (or CPU fallback) nearest perceptual Redmean palette assignment.
 * 3. Contrast-aware anti-speckle (removes JPEG/AA noise without erasing thin high-contrast lines/eyes).
 * 4. Planar topological boundary graph decomposing shared borders into canonical chains & closed loops.
 * 5. Endpoint/corner-pinned Taubin smoothing + multi-scale corner preservation + straight-span collapsing.
 * 6. Schneider Least-Squares Cubic Bézier fitting (watertight exact reversal across shared chains).
 */

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export type ImageProfileKind = 'flat' | 'line_typo' | 'illustration' | 'gradient_photo';

export interface TraceCalibrationParams {
  /** Base max error tolerance (px) for Cubic Bézier fitting on flat/sharp art */
  flatCurveTol: number;
  /** Base max error tolerance (px) for smooth gradients/illustrations */
  smoothCurveTol: number;
  /** Max perpendicular error (px) to collapse a span into a single straight L line */
  lineMergeTol: number;
  /** Corner angle threshold in degrees (larger = fewer corners detected) */
  cornerAngleDeg: number;
  /** Taubin smoothing iterations on smooth chains */
  taubinPasses: number;
  /** Minimum area (px) for low-contrast speckle absorption */
  lowContrastSpeckleArea: number;
  /** Color distance threshold separating low-contrast noise from real high-contrast features */
  contrastProtectDist: number;
  /** Hairline seam stroke width (0 disables; ~0.3 prevents anti-aliasing gaps over contrasting canvas) */
  seamStrokeWidth: number;
  /** Edge-preserving bilateral pre-filter L1 threshold for gradients (0 disables) */
  bilateralL1Thresh?: number;
}

export const DEFAULT_CALIBRATION: TraceCalibrationParams = {
  flatCurveTol: 0.44,
  smoothCurveTol: 0.30,
  lineMergeTol: 0.26,
  cornerAngleDeg: 58,
  taubinPasses: 5,
  lowContrastSpeckleArea: 1,
  contrastProtectDist: 14,
  seamStrokeWidth: 0.22,
  bilateralL1Thresh: 0,
};

export interface TopologicalSegment {
  type: 'L' | 'C';
  p0: [number, number];
  p1?: [number, number];
  p2?: [number, number];
  p3: [number, number];
}

export interface CanonicalChain {
  id: number;
  vStart: number;
  vEnd: number;
  isClosed: boolean;
  pts: Array<[number, number]>;
  segs: TopologicalSegment[];
}

export interface AssignFnResult {
  labels: Int16Array;
  usedGpu: boolean;
  backend: string;
  renderer: string;
}

export type AssignPaletteFn = (
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  palette: PaletteColor[],
  allowGpu?: boolean
) => AssignFnResult;

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function redmeanDistSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const rm = (r1 + r2) * 0.5;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

// Reusable 6-bit (64x64x64) color histogram buffers to avoid per-image GC allocation across batches
const _histCounts = new Int32Array(262144);
const _histSumR = new Float64Array(262144);
const _histSumG = new Float64Array(262144);
const _histSumB = new Float64Array(262144);

/**
 * Classifies an RGBA image using a full-pixel 18-bit (6-bit/ch) histogram and builds a compact,
 * contrast-preserving palette via weighted K-Means++.
 */
export function analyzeAndBuildPalette(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  requestedColors: number
): {
  palette: PaletteColor[];
  profile: ImageProfileKind;
  hasAlpha: boolean;
  opaqueCount: number;
} {
  const n = w * h;
  _histCounts.fill(0);
  _histSumR.fill(0);
  _histSumG.fill(0);
  _histSumB.fill(0);
  let opaqueCount = 0;
  let alphaTransCount = 0;
  let smoothGradEdges = 0;
  let sharpEdges = 0;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const p = row + x;
      const i = p * 4;
      const a = rgba[i + 3];
      if (a < 32) {
        alphaTransCount++;
        continue;
      }
      opaqueCount++;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      _histCounts[key]++;
      _histSumR[key] += r;
      _histSumG[key] += g;
      _histSumB[key] += b;

      if (x + 1 < w) {
        const j = i + 4;
        if (rgba[j + 3] >= 32) {
          const d = Math.abs(r - rgba[j]) + Math.abs(g - rgba[j + 1]) + Math.abs(b - rgba[j + 2]);
          if (d >= 2 && d <= 28) smoothGradEdges++;
          else if (d > 64) sharpEdges++;
        }
      }
    }
  }

  const hasAlpha = alphaTransCount > Math.max(4, n * 0.002);
  if (opaqueCount === 0) {
    return {
      palette: [{ r: 0, g: 0, b: 0, hex: '#000000' }],
      profile: 'flat',
      hasAlpha,
      opaqueCount: 0,
    };
  }

  interface HistBin {
    r: number;
    g: number;
    b: number;
    cnt: number;
  }
  const bins: HistBin[] = [];
  for (let k = 0; k < 262144; k++) {
    const c = _histCounts[k];
    if (c > 0) {
      bins.push({
        r: Math.round(_histSumR[k] / c),
        g: Math.round(_histSumG[k] / c),
        b: Math.round(_histSumB[k] / c),
        cnt: c,
      });
    }
  }
  bins.sort((a, b) => b.cnt - a.cnt);

  // Merge ultra-close minor bins within Redmean distance < 14 to estimate true unique flat colors
  const sigBins: HistBin[] = [];
  for (const bin of bins) {
    let merged = false;
    for (let s = 0; s < Math.min(sigBins.length, 48); s++) {
      const sb = sigBins[s];
      if (redmeanDistSq(bin.r, bin.g, bin.b, sb.r, sb.g, sb.b) < 220) {
        if (bin.cnt > sb.cnt * 0.25) {
          const tot = sb.cnt + bin.cnt;
          sb.r = Math.round((sb.r * sb.cnt + bin.r * bin.cnt) / tot);
          sb.g = Math.round((sb.g * sb.cnt + bin.g * bin.cnt) / tot);
          sb.b = Math.round((sb.b * sb.cnt + bin.b * bin.cnt) / tot);
          sb.cnt = tot;
        } else {
          sb.cnt += bin.cnt;
        }
        merged = true;
        break;
      }
    }
    if (!merged) {
      sigBins.push({ ...bin });
      if (sigBins.length > 512) break;
    }
  }

  // Filter out AA fringe pixels when estimating dominant flat regions
  const minSigPx = Math.max(4, Math.floor(opaqueCount * 0.0012));
  const majorFlatBins = sigBins.filter((b) => b.cnt >= minSigPx);
  const gradFrac = smoothGradEdges / Math.max(1, opaqueCount);
  const sharpFrac = sharpEdges / Math.max(1, opaqueCount);

  let profile: ImageProfileKind = 'gradient_photo';
  if (majorFlatBins.length <= 12 && gradFrac < 0.032) {
    profile = 'flat';
  } else if (majorFlatBins.length <= 28 && sharpFrac > 0.014 && gradFrac < 0.08) {
    profile = 'line_typo';
  } else if (gradFrac < 0.14) {
    profile = 'illustration';
  }

  // Adaptive color budget K: crisp flat images use exact dominant colors; gradients use full budget for 99%+
  const reqK = Math.max(2, Math.min(250, Math.round(requestedColors || 250)));
  let K = reqK;
  if (profile === 'flat') {
    // Include rare high-contrast interior details (e.g. small pupils) while omitting AA halo clusters
    K = Math.min(reqK, Math.max(2, majorFlatBins.length + 1));
  } else if (profile === 'line_typo') {
    K = Math.min(reqK, Math.max(8, majorFlatBins.length + 4, Math.min(36, sigBins.length)));
  } else if (bins.length <= reqK) {
    K = bins.length;
  }

  // Retain top 4000 frequent 6-bit bins + ALL contrasting rare outlier bins for sharp micro-details/highlights
  const activeBins = bins.length <= 4000 ? bins : bins.slice(0, 4000);
  if (bins.length > 4000) {
    const dom = bins[0];
    let added = 0;
    for (let i = 4000; i < bins.length && added < 200; i++) {
      if (bins[i].cnt >= 2 && redmeanDistSq(bins[i].r, bins[i].g, bins[i].b, dom.r, dom.g, dom.b) > 1600) {
        activeBins.push(bins[i]);
        added++;
      }
    }
  }

  // Deterministic contrast-aware farthest-first initialization over exact histogram bins
  const cents: Array<[number, number, number]> = [[activeBins[0].r, activeBins[0].g, activeBins[0].b]];
  const minD = new Float64Array(activeBins.length);
  for (let s = 0; s < activeBins.length; s++) {
    minD[s] = redmeanDistSq(
      activeBins[s].r,
      activeBins[s].g,
      activeBins[s].b,
      cents[0][0],
      cents[0][1],
      cents[0][2]
    );
  }

  let totalActiveWeight = 0;
  for (let s = 0; s < activeBins.length; s++) totalActiveWeight += activeBins[s].cnt;

  for (let k = 1; k < K; k++) {
    let bestScore = -1;
    let bestIdx = -1;
    let weightedDistSum = 0;
    for (let s = 0; s < activeBins.length; s++) {
      const b = activeBins[s];
      weightedDistSum += b.cnt * minD[s];
      const weightExp = k < Math.min(16, K * 0.2) ? 0.25 : 0.65;
      const score = Math.pow(b.cnt, weightExp) * minD[s];
      if (score > bestScore && minD[s] > 4) {
        bestScore = score;
        bestIdx = s;
      }
    }
    if (bestIdx < 0) break;
    const estRmse = Math.sqrt(weightedDistSum / Math.max(1, totalActiveWeight * 9));
    const chosen = activeBins[bestIdx];
    // Dynamically stop adding redundant subtle shades once global RMSE is <= 1.38 (~99.6%+ color fidelity)
    if (k >= 32 && profile !== 'flat' && estRmse <= 1.38 && minD[bestIdx] < 900) break;
    cents.push([chosen.r, chosen.g, chosen.b]);
    for (let s = 0; s < activeBins.length; s++) {
      const d = redmeanDistSq(
        activeBins[s].r,
        activeBins[s].g,
        activeBins[s].b,
        chosen.r,
        chosen.g,
        chosen.b
      );
      if (d < minD[s]) minD[s] = d;
    }
  }

  // Weighted Lloyd refinement (5 fast iterations over histogram bins)
  const kLen = cents.length;
  const wR = new Float64Array(kLen);
  const wG = new Float64Array(kLen);
  const wB = new Float64Array(kLen);
  const wC = new Float64Array(kLen);

  for (let iter = 0; iter < 5; iter++) {
    wR.fill(0);
    wG.fill(0);
    wB.fill(0);
    wC.fill(0);
    for (let s = 0; s < activeBins.length; s++) {
      const b = activeBins[s];
      let bi = 0;
      let bd = Infinity;
      for (let k = 0; k < kLen; k++) {
        const c = cents[k];
        const d = redmeanDistSq(b.r, b.g, b.b, c[0], c[1], c[2]);
        if (d < bd) {
          bd = d;
          bi = k;
        }
      }
      const wt = b.cnt;
      wR[bi] += b.r * wt;
      wG[bi] += b.g * wt;
      wB[bi] += b.b * wt;
      wC[bi] += wt;
    }
    for (let k = 0; k < kLen; k++) {
      if (wC[k] > 0) {
        cents[k][0] = Math.round(wR[k] / wC[k]);
        cents[k][1] = Math.round(wG[k] / wC[k]);
        cents[k][2] = Math.round(wB[k] / wC[k]);
      }
    }
  }

  const seen = new Set<string>();
  const palette: PaletteColor[] = [];
  for (const c of cents) {
    const hex = toHex(c[0], c[1], c[2]);
    if (!seen.has(hex)) {
      seen.add(hex);
      palette.push({ r: c[0], g: c[1], b: c[2], hex });
    }
  }

  return { palette, profile, hasAlpha, opaqueCount };
}

/**
 * Collapses 1px anti-aliasing halo pixels sandwiched linearly between two high-contrast regions
 * (e.g. text edges, flat shapes, outlines) without altering smooth gradients or real thin 1px strokes.
 */
/**
 * Fast 3x3 edge-preserving bilateral pre-filter used strictly for cleaner label assignment
 * on smooth gradients/photos (melts JPEG DCT ripples without blurring sharp edges or thin strokes).
 */
function bilateralDenoiseForLabeling(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  l1Thresh = 28
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  if (w < 3 || h < 3) return out;
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = (row + x) * 4;
      const a = rgba[i + 3];
      if (a < 32) continue;
      const r0 = rgba[i], g0 = rgba[i + 1], b0 = rgba[i + 2];
      let sr = r0 * 2, sg = g0 * 2, sb = b0 * 2, wSum = 2;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const j = ((y + dy) * w + (x + dx)) * 4;
          if (rgba[j + 3] < 32) continue;
          const rj = rgba[j], gj = rgba[j + 1], bj = rgba[j + 2];
          const d = Math.abs(r0 - rj) + Math.abs(g0 - gj) + Math.abs(b0 - bj);
          if (d <= l1Thresh) {
            const wt = (l1Thresh - d) / l1Thresh;
            sr += rj * wt;
            sg += gj * wt;
            sb += bj * wt;
            wSum += wt;
          }
        }
      }
      out[i] = Math.round(sr / wSum);
      out[i + 1] = Math.round(sg / wSum);
      out[i + 2] = Math.round(sb / wSum);
    }
  }
  return out;
}

export function suppressEdgeAntiAliasingFringes(
  labels: Int16Array,
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  palette: PaletteColor[],
  minEdgeContrastSq = 2800,
  requireDepth3 = false
): void {
  if (w < 7 || h < 7) return;
  const orig = new Int16Array(labels);
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) orig.set(labels);
    for (let y = 3; y < h - 3; y++) {
      const row = y * w;
      for (let x = 3; x < w - 3; x++) {
        const p = row + x;
        const L = orig[p];
        if (L < 0) continue;

        const ll = orig[p - 1];
        const lr = orig[p + 1];
        const lt = orig[p - w];
        const lb = orig[p + w];
        const sameCard = (ll === L ? 1 : 0) + (lr === L ? 1 : 0) + (lt === L ? 1 : 0) + (lb === L ? 1 : 0);
        if (sameCard >= 3) continue;

        const i = p * 4;
        const pr = rgba[i], pg = rgba[i + 1], pb = rgba[i + 2];

        const trySnapPair = (la: number, la2: number, la3: number, lbPair: number, lb2: number, lb3: number): number => {
          if (la < 0 || lbPair < 0 || la === lbPair || la === L || lbPair === L) return -1;
          if (requireDepth3) {
            if (la2 !== la || la3 !== la || lb2 !== lbPair || lb3 !== lbPair) return -1;
          } else {
            if (la2 === lbPair || lb2 === la) return -1;
          }

          const ca = palette[la];
          const cb = palette[lbPair];
          if (!ca || !cb) return -1;
          if (redmeanDistSq(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b) < minEdgeContrastSq) return -1;

          const abR = cb.r - ca.r;
          const abG = cb.g - ca.g;
          const abB = cb.b - ca.b;
          const abLenSq = abR * abR + abG * abG + abB * abB;
          if (abLenSq < 1) return -1;
          const t = ((pr - ca.r) * abR + (pg - ca.g) * abG + (pb - ca.b) * abB) / abLenSq;
          if (t <= 0.02 || t >= 0.98) return -1;

          const qR = ca.r + t * abR - pr;
          const qG = ca.g + t * abG - pg;
          const qB = ca.b + t * abB - pb;
          if (qR * qR + qG * qG + qB * qB < 750) {
            return t < 0.5 ? la : lbPair;
          }
          return -1;
        };

        let snapped = trySnapPair(ll, orig[p - 2], orig[p - 3], lr, orig[p + 2], orig[p + 3]);
        if (snapped < 0) snapped = trySnapPair(lt, orig[p - 2 * w], orig[p - 3 * w], lb, orig[p + 2 * w], orig[p + 3 * w]);
        if (snapped >= 0) {
          labels[p] = snapped;
        }
      }
    }
  }
}

/**
 * Removes tiny low-contrast dithering/JPEG speckles while strictly protecting small high-contrast
 * vector details (eyes, specular dots, thin text strokes, hairlines).
 */
export function despeckleContrastAware(
  labels: Int16Array,
  w: number,
  h: number,
  palette: PaletteColor[],
  maxSpeckleArea: number,
  contrastProtectDist: number
): void {
  if (maxSpeckleArea <= 0 || w < 3 || h < 3) return;
  const n = w * h;
  const visited = new Uint8Array(n);
  const queue = new Int32Array(Math.min(n, Math.max(64, maxSpeckleArea * 4)));
  const memberList = new Int32Array(Math.min(n, maxSpeckleArea + 2));
  const protectSq = contrastProtectDist * contrastProtectDist * 2.5;

  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;
    const lbl = labels[start];
    if (lbl < 0) {
      visited[start] = 1;
      continue;
    }

    visited[start] = 1;
    let qHead = 0;
    let qTail = 1;
    queue[0] = start;
    let compSize = 0;
    let tooBig = false;
    let bestNbr = -1;
    const nbrCounts = new Map<number, number>();

    while (qHead < qTail) {
      const p = queue[qHead++];
      if (compSize < memberList.length) {
        memberList[compSize] = p;
      }
      compSize++;
      if (compSize > maxSpeckleArea) {
        tooBig = true;
      }

      const x = p % w;
      const y = (p / w) | 0;
      const checkNbr = (np: number) => {
        const nl = labels[np];
        if (nl === lbl) {
          if (!visited[np]) {
            visited[np] = 1;
            if (qTail < queue.length) {
              queue[qTail++] = np;
            } else {
              tooBig = true;
            }
          }
        } else if (nl >= 0 && !tooBig) {
          nbrCounts.set(nl, (nbrCounts.get(nl) || 0) + 1);
        }
      };

      if (x > 0) checkNbr(p - 1);
      if (x + 1 < w) checkNbr(p + 1);
      if (y > 0) checkNbr(p - w);
      if (y + 1 < h) checkNbr(p + w);
    }

    if (tooBig || compSize === 0 || nbrCounts.size === 0) continue;

    let topCount = -1;
    nbrCounts.forEach((cnt, nl) => {
      if (cnt > topCount) {
        topCount = cnt;
        bestNbr = nl;
      }
    });
    if (bestNbr < 0) continue;

    const cSelf = palette[lbl];
    const cNbr = palette[bestNbr];
    if (!cSelf || !cNbr) continue;

    const distSq = redmeanDistSq(cSelf.r, cSelf.g, cSelf.b, cNbr.r, cNbr.g, cNbr.b);
    // Two-tier noise merge: 1px specks up to contrastProtectDist; 2..N px specks only if near-identical color (<5 RGB levels, distSq < 200)
    const allowed =
      compSize <= 1
        ? distSq < protectSq || (topCount >= 3 && distSq < protectSq * 1.6)
        : distSq < 200;
    if (allowed) {
      for (let m = 0; m < compSize; m++) {
        labels[memberList[m]] = bestNbr;
      }
    }
  }
}

/**
 * Extracts a strictly planar shared-boundary graph across the `(w+1) x (h+1)` vertex grid.
 * Decomposes all region borders into unique canonical chains (open junction-to-junction chains
 * and pure closed cycles) so touching shapes ALWAYS share identical reversed Bézier curves.
 */
export function extractTopologicalChains(
  labels: Int16Array,
  w: number,
  h: number
): {
  chains: CanonicalChain[];
  labelRings: Map<number, Array<Array<{ chainId: number; forward: boolean }>>>;
} {
  const w1 = w + 1;
  const maxVerts = (w + 1) * (h + 1);

  // Build undirected planar crack graph in flat typed arrays (max degree per grid vertex = 4)
  // Bitmask of undirected edges leaving vertex v: bit0=Right(+1), bit1=Down(+w1), bit2=Left(-1), bit3=Up(-w1)
  const dirMask = new Uint8Array(maxVerts);

  const labelAt = (x: number, y: number): number => {
    if (x < 0 || x >= w || y < 0 || y >= h) return -1;
    return labels[y * w + x];
  };

  // Horizontal cracks between (x, y-1) and (x, y) across y = 0..h, x = 0..w-1
  for (let y = 0; y <= h; y++) {
    for (let x = 0; x < w; x++) {
      const top = labelAt(x, y - 1);
      const bot = labelAt(x, y);
      if (top !== bot) {
        const u = y * w1 + x;
        const v = u + 1;
        dirMask[u] |= 1; // Right
        dirMask[v] |= 4; // Left
      }
    }
  }

  // Vertical cracks between (x-1, y) and (x, y) across y = 0..h-1, x = 0..w
  for (let y = 0; y < h; y++) {
    for (let x = 0; x <= w; x++) {
      const left = labelAt(x - 1, y);
      const right = labelAt(x, y);
      if (left !== right) {
        const u = y * w1 + x;
        const v = u + w1;
        dirMask[u] |= 2; // Down
        dirMask[v] |= 8; // Up
      }
    }
  }

  const popCount4 = (m: number) => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1));
  const stepVert = (v: number, bit: number): number => {
    if (bit === 1) return v + 1;
    if (bit === 2) return v + w1;
    if (bit === 4) return v - 1;
    return v - w1;
  };
  const oppBit = (bit: number): number => (bit === 1 ? 4 : bit === 4 ? 1 : bit === 2 ? 8 : 2);

  // Remaining unconsumed undirected edges
  const remMask = new Uint8Array(dirMask);
  // Directed edge (u -> bit) lookup -> packed (chainIndex << 1) | (forward ? 1 : 0)
  // Keyed in flat Int32Array(maxVerts * 4) initialized to -1 for O(1) lookup with zero allocation overhead!
  const edgeToChain = new Int32Array(maxVerts * 4).fill(-1);
  const bitToSlot = (bit: number) => (bit === 1 ? 0 : bit === 2 ? 1 : bit === 4 ? 2 : 3);
  const chains: CanonicalChain[] = [];

  const traceChainFrom = (startV: number, firstBit: number, stopAtJunction: boolean) => {
    const chainId = chains.length;
    const verts: number[] = [startV];
    let cur = startV;
    let bit = firstBit;

    while (true) {
      const slotF = cur * 4 + bitToSlot(bit);
      const nxt = stepVert(cur, bit);
      const ob = oppBit(bit);
      const slotR = nxt * 4 + bitToSlot(ob);

      // Consume undirected edge
      remMask[cur] &= ~bit;
      remMask[nxt] &= ~ob;

      edgeToChain[slotF] = (chainId << 1) | 1; // forward
      edgeToChain[slotR] = chainId << 1; // reverse

      verts.push(nxt);
      cur = nxt;

      if (stopAtJunction) {
        if (popCount4(dirMask[cur]) !== 2 || cur === startV) break;
      } else {
        if (cur === startV) break;
      }

      const rem = remMask[cur];
      if (rem === 0) break;
      // Pick only available outgoing bit (at degree-2 vertex there is strictly 1 left!)
      if (rem & 1) bit = 1;
      else if (rem & 2) bit = 2;
      else if (rem & 4) bit = 4;
      else bit = 8;
    }

    const pts: Array<[number, number]> = new Array(verts.length);
    for (let i = 0; i < verts.length; i++) {
      const vv = verts[i];
      pts[i] = [vv % w1, (vv / w1) | 0];
    }

    chains.push({
      id: chainId,
      vStart: verts[0],
      vEnd: verts[verts.length - 1],
      isClosed: !stopAtJunction && verts[0] === verts[verts.length - 1],
      pts,
      segs: [],
    });
  };

  // Pass 1: Extract all open junction-to-junction chains
  for (let v = 0; v < maxVerts; v++) {
    if (remMask[v] === 0 || popCount4(dirMask[v]) === 2) continue;
    for (const bit of [1, 2, 4, 8]) {
      if (remMask[v] & bit) {
        traceChainFrom(v, bit, true);
      }
    }
  }

  // Pass 2: Extract remaining pure closed degree-2 cycles
  for (let v = 0; v < maxVerts; v++) {
    if (remMask[v] === 0) continue;
    for (const bit of [1, 2, 4, 8]) {
      if (remMask[v] & bit) {
        traceChainFrom(v, bit, false);
      }
    }
  }

  // Pass 3: Reconstruct directed closed rings per label using tight-turn rule & canonical chain jumps!
  // Directed mask per boundary edge belonging to its right-hand pixel label:
  // Every pixel (x, y) with label L has clockwise directed edges:
  //   Top:    (x,y)   -> right (bit 1)  if top neighbor != L
  //   Right:  (x+1,y) -> down  (bit 2)  if right neighbor != L
  //   Bottom: (x+1,y+1)->left  (bit 4)  if bottom neighbor != L
  //   Left:   (x,y+1) -> up    (bit 8)  if left neighbor != L
  const visitedChainDir = new Uint8Array(chains.length * 2);
  const labelRings = new Map<number, Array<Array<{ chainId: number; forward: boolean }>>>();

  // Helper returning label on the RIGHT side of directed step u -> bit
  const rightLabelOf = (u: number, bit: number): number => {
    const ux = u % w1;
    const uy = (u / w1) | 0;
    if (bit === 1) return labelAt(ux, uy); // heading right: pixel below is (ux, uy)
    if (bit === 2) return labelAt(ux - 1, uy); // heading down: pixel left is (ux-1, uy)
    if (bit === 4) return labelAt(ux - 1, uy - 1); // heading left: pixel above is (ux-1, uy-1)
    return labelAt(ux, uy - 1); // heading up (8): pixel right is (ux, uy-1)
  };

  // Left-side pixel label check to confirm it's genuinely a boundary edge of targetLbl
  const isLabelEdge = (u: number, bit: number, targetLbl: number): boolean => {
    if (rightLabelOf(u, bit) !== targetLbl) return false;
    const opp = oppBit(bit);
    const nxt = stepVert(u, bit);
    return rightLabelOf(nxt, opp) !== targetLbl;
  };

  // Right-turn-first (hugging 4-connected interior on RIGHT without figure-8 crossing at diagonal saddles)
  const turnOrder = (dirBit: number): number[] => {
    if (dirBit === 1) return [2, 1, 8, 4];
    if (dirBit === 2) return [4, 2, 1, 8];
    if (dirBit === 4) return [8, 4, 2, 1];
    return [1, 8, 4, 2];
  };

  const pushRing = (lbl: number, ring: Array<{ chainId: number; forward: boolean }>) => {
    let list = labelRings.get(lbl);
    if (!list) {
      list = [];
      labelRings.set(lbl, list);
    }
    list.push(ring);
  };

  // Loop 3A: Start ONLY from junction vertices (degree !== 2) so open U-shaped chains are NEVER entered mid-chain!
  for (let u = 0; u < maxVerts; u++) {
    const dm = dirMask[u];
    if (dm === 0 || popCount4(dm) === 2) continue;
    for (const startBit of [1, 2, 4, 8]) {
      if ((dm & startBit) === 0) continue;
      const startEncoded = edgeToChain[u * 4 + bitToSlot(startBit)];
      if (startEncoded < 0 || visitedChainDir[startEncoded]) continue;
      const lbl = rightLabelOf(u, startBit);
      if (lbl < 0 || !isLabelEdge(u, startBit, lbl)) continue;

      const ring: Array<{ chainId: number; forward: boolean }> = [];
      let curU = u;
      let curBit = startBit;
      let guard = 0;

      while (guard++ < maxVerts) {
        const encoded = edgeToChain[curU * 4 + bitToSlot(curBit)];
        if (encoded < 0 || visitedChainDir[encoded]) break;
        visitedChainDir[encoded] = 1;

        const chainId = encoded >> 1;
        const forward = (encoded & 1) === 1;
        const chain = chains[chainId];
        const cPts = chain.pts;
        ring.push({ chainId, forward });

        if (chain.isClosed) break;

        let endV = curU;
        let lastStepBit = curBit;
        if (forward) {
          endV = chain.vEnd;
          const a = cPts[cPts.length - 2];
          const b = cPts[cPts.length - 1];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          lastStepBit = dx === 1 ? 1 : dx === -1 ? 4 : dy === 1 ? 2 : 8;
        } else {
          endV = chain.vStart;
          const a = cPts[1];
          const b = cPts[0];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          lastStepBit = dx === 1 ? 1 : dx === -1 ? 4 : dy === 1 ? 2 : 8;
        }

        const candidates = turnOrder(lastStepBit);
        let pickedBit = 0;
        for (const cb of candidates) {
          if ((dirMask[endV] & cb) !== 0 && isLabelEdge(endV, cb, lbl)) {
            if (endV === u && cb === startBit) {
              pickedBit = startBit;
              break;
            }
            const nextEnc = edgeToChain[endV * 4 + bitToSlot(cb)];
            if (nextEnc >= 0 && !visitedChainDir[nextEnc]) {
              pickedBit = cb;
              break;
            }
          }
        }

        if (pickedBit === 0 || (endV === u && pickedBit === startBit)) break;
        curU = endV;
        curBit = pickedBit;
      }

      if (ring.length > 0) {
        pushRing(lbl, ring);
      }
    }
  }

  // Loop 3B: Emit all pure closed degree-2 cycles (islands & holes cleanly on both sides)
  for (let c = 0; c < chains.length; c++) {
    const chain = chains[c];
    if (!chain.isClosed || chain.pts.length < 3) continue;
    const p0 = chain.pts[0];
    const p1 = chain.pts[1];
    const v0 = p0[1] * w1 + p0[0];
    const v1 = p1[1] * w1 + p1[0];
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const fwdBit = dx === 1 ? 1 : dx === -1 ? 4 : dy === 1 ? 2 : 8;
    const revBit = oppBit(fwdBit);

    const lblFwd = rightLabelOf(v0, fwdBit);
    if (lblFwd >= 0 && isLabelEdge(v0, fwdBit, lblFwd) && !visitedChainDir[(c << 1) | 1]) {
      visitedChainDir[(c << 1) | 1] = 1;
      pushRing(lblFwd, [{ chainId: c, forward: true }]);
    }

    const lblRev = rightLabelOf(v1, revBit);
    if (lblRev >= 0 && isLabelEdge(v1, revBit, lblRev) && !visitedChainDir[c << 1]) {
      visitedChainDir[c << 1] = 1;
      pushRing(lblRev, [{ chainId: c, forward: false }]);
    }
  }

  return { chains, labelRings };
}

function pointToSegDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const l2 = vx * vx + vy * vy;
  if (l2 < 1e-12) return (px - ax) * (px - ax) + (py - ay) * (py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return dx * dx + dy * dy;
}

/**
 * Detects true geometric corner indices on a chain so sharp edges/corners remain crisp while
 * staircase pixel steps smoothly filter out.
 */
function detectGeometricCorners(
  pts: Array<[number, number]>,
  isClosed: boolean,
  cornerAngleDeg: number,
  w: number,
  h: number
): Uint8Array {
  const n = pts.length;
  const corners = new Uint8Array(n);
  if (!isClosed) {
    corners[0] = 1;
    corners[n - 1] = 1;
  }
  if (n < 5) return corners;

  const effAngle = Math.max(cornerAngleDeg, 56);
  const cosThr = Math.cos((effAngle * Math.PI) / 180);
  const win = Math.min(5, Math.max(3, Math.floor((n - 1) / 4)));

  const wrap = (i: number) => (isClosed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i)));

  // Identify image-corner pins
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    if ((x === 0 || x === w) && (y === 0 || y === h)) {
      corners[i] = 1;
    }
  }

  // First detect crisp 90-deg straight-run intersections (e.g., >= 3px H meeting >= 3px V)
  for (let i = 0; i < n; i++) {
    if (!isClosed && (i < 2 || i > n - 3)) continue;
    const p = pts[i];
    const pm1 = pts[wrap(i - 1)];
    const pm2 = pts[wrap(i - 2)];
    const pm3 = pts[wrap(i - 3)];
    const pp1 = pts[wrap(i + 1)];
    const pp2 = pts[wrap(i + 2)];
    const pp3 = pts[wrap(i + 3)];

    const inAlignedH = p[1] === pm1[1] && pm1[1] === pm2[1] && pm2[1] === pm3[1];
    const inAlignedV = p[0] === pm1[0] && pm1[0] === pm2[0] && pm2[0] === pm3[0];
    const outAlignedH = p[1] === pp1[1] && pp1[1] === pp2[1] && pp2[1] === pp3[1];
    const outAlignedV = p[0] === pp1[0] && pp1[0] === pp2[0] && pp2[0] === pp3[0];

    if ((inAlignedH && outAlignedV) || (inAlignedV && outAlignedH)) {
      corners[i] = 1;
    }
  }

  // Pre-smooth a temporary polyline copy (2 passes) so unit pixel staircases do not fake sharp corners
  const sPts: Array<[number, number]> = pts.map((p) => [p[0], p[1]]);
  const m = isClosed && n > 1 && pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1] ? n - 1 : n;
  for (let pass = 0; pass < 2 && m >= 5; pass++) {
    const nxt: Array<[number, number]> = sPts.map((p) => [p[0], p[1]]);
    for (let i = 0; i < m; i++) {
      if (!isClosed && (i === 0 || i === m - 1)) continue;
      const prev = sPts[(i - 1 + m) % m];
      const cur = sPts[i];
      const next = sPts[(i + 1) % m];
      nxt[i][0] = 0.25 * prev[0] + 0.5 * cur[0] + 0.25 * next[0];
      nxt[i][1] = 0.25 * prev[1] + 0.5 * cur[1] + 0.25 * next[1];
    }
    for (let i = 0; i < m; i++) {
      sPts[i][0] = nxt[i][0];
      sPts[i][1] = nxt[i][1];
    }
    if (isClosed && m < n) {
      sPts[n - 1][0] = sPts[0][0];
      sPts[n - 1][1] = sPts[0][1];
    }
  }

  // Multi-scale turn score on pre-smoothed polyline to catch real non-90deg sharp tips (stars, triangles, apexes)
  const scores = new Float64Array(n);
  if (n >= win * 2 + 1) {
    for (let i = 0; i < n; i++) {
      if (!isClosed && (i < win || i >= n - win)) continue;
      const a = sPts[wrap(i - win)];
      const b = sPts[i];
      const c = sPts[wrap(i + win)];
      const vx = b[0] - a[0];
      const vy = b[1] - a[1];
      const wx = c[0] - b[0];
      const wy = c[1] - b[1];
      const lv = Math.hypot(vx, vy);
      const lw = Math.hypot(wx, wy);
      if (lv < 1.5 || lw < 1.5) continue;
      const dot = (vx * wx + vy * wy) / (lv * lw);
      if (dot < cosThr) {
        scores[i] = 1 - dot;
      }
    }

    // Non-maximum suppression across window radius
    for (let i = 0; i < n; i++) {
      if (scores[i] <= 0) continue;
      let isPeak = true;
      for (let k = -win; k <= win; k++) {
        if (k === 0) continue;
        if (!isClosed && (i + k < 0 || i + k >= n)) continue;
        const j = wrap(i + k);
        if (scores[j] > scores[i] || (scores[j] === scores[i] && j < i)) {
          isPeak = false;
          break;
        }
      }
      if (isPeak) corners[i] = 1;
    }
  }

  return corners;
}

/**
 * Applies volume-preserving endpoint/corner-pinned Taubin smoothing (`lambda`, `mu`)
 * while clamping image border coordinates so shapes stay watertight inside `[0, w] x [0, h]`.
 */
function smoothChainTaubin(
  rawPts: Array<[number, number]>,
  corners: Uint8Array,
  isClosed: boolean,
  passes: number,
  w: number,
  h: number
): Array<[number, number]> {
  const n = rawPts.length;
  const pts: Array<[number, number]> = rawPts.map((p) => [p[0], p[1]]);
  if (n < 4 || passes <= 0) return pts;

  // For closed loops, deduplicate final point matching first point during smoothing
  const m = isClosed && n > 1 && pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1] ? n - 1 : n;
  if (m < 4) return pts;

  // Track which vertices are on horizontal or vertical outer image borders (keep flush with frame edge)
  const lockX = new Uint8Array(m);
  const lockY = new Uint8Array(m);
  for (let i = 0; i < m; i++) {
    if (pts[i][0] === 0 || pts[i][0] === w) lockX[i] = 1;
    if (pts[i][1] === 0 || pts[i][1] === h) lockY[i] = 1;
  }

  const tmp: Array<[number, number]> = pts.slice(0, m).map((p) => [p[0], p[1]]);
  const lam = 0.48;
  const mu = -0.50;

  const step = (alpha: number) => {
    for (let i = 0; i < m; i++) {
      if (corners[i] || (!isClosed && (i === 0 || i === m - 1))) {
        tmp[i][0] = pts[i][0];
        tmp[i][1] = pts[i][1];
        continue;
      }
      const prev = pts[(i - 1 + m) % m];
      const next = pts[(i + 1) % m];
      const avgX = (prev[0] + next[0]) * 0.5;
      const avgY = (prev[1] + next[1]) * 0.5;
      let nx = lockX[i] ? pts[i][0] : pts[i][0] + alpha * (avgX - pts[i][0]);
      let ny = lockY[i] ? pts[i][1] : pts[i][1] + alpha * (avgY - pts[i][1]);
      if (nx < 0) nx = 0;
      else if (nx > w) nx = w;
      if (ny < 0) ny = 0;
      else if (ny > h) ny = h;
      tmp[i][0] = nx;
      tmp[i][1] = ny;
    }
    for (let i = 0; i < m; i++) {
      pts[i][0] = tmp[i][0];
      pts[i][1] = tmp[i][1];
    }
  };

  for (let p = 0; p < passes; p++) {
    step(lam);
    step(mu);
  }
  if (isClosed && m < n) {
    pts[n - 1][0] = pts[0][0];
    pts[n - 1][1] = pts[0][1];
  }
  return pts;
}

function normVec(dx: number, dy: number): [number, number] {
  const len = Math.hypot(dx, dy);
  return len > 1e-9 ? [dx / len, dy / len] : [1, 0];
}

function evalCubic(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): [number, number] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return [
    mt2 * mt * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t2 * t * p3[0],
    mt2 * mt * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t2 * t * p3[1],
  ];
}

/**
 * Schneider's least-squares single Cubic Bézier fit with constrained handles (prevents overshoots/loops).
 */
function fitSingleCubic(
  pts: Array<[number, number]>,
  u: Float64Array,
  tHat1: [number, number],
  tHat2: [number, number]
): { p1: [number, number]; p2: [number, number] } {
  const n = pts.length;
  const p0 = pts[0];
  const p3 = pts[n - 1];
  const C00 = [0, 0];
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  void C00;

  for (let i = 0; i < n; i++) {
    const t = u[i];
    const mt = 1 - t;
    const b0 = mt * mt * mt;
    const b1 = 3 * mt * mt * t;
    const b2 = 3 * mt * t * t;
    const b3 = t * t * t;

    const a1x = tHat1[0] * b1;
    const a1y = tHat1[1] * b1;
    const a2x = tHat2[0] * b2;
    const a2y = tHat2[1] * b2;

    c00 += a1x * a1x + a1y * a1y;
    c01 += a1x * a2x + a1y * a2y;
    c11 += a2x * a2x + a2y * a2y;

    const tx = pts[i][0] - (b0 * p0[0] + b1 * p0[0] + b2 * p3[0] + b3 * p3[0]);
    const ty = pts[i][1] - (b0 * p0[1] + b1 * p0[1] + b2 * p3[1] + b3 * p3[1]);

    x0 += a1x * tx + a1y * ty;
    x1 += a2x * tx + a2y * ty;
  }

  const det = c00 * c11 - c01 * c01;
  const chord = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
  const fallbackAlpha = chord / 3;

  let alphaL = fallbackAlpha;
  let alphaR = fallbackAlpha;
  if (Math.abs(det) > 1e-8) {
    alphaL = (x0 * c11 - x1 * c01) / det;
    alphaR = (c00 * x1 - c01 * x0) / det;
  }

  // Clamp extreme or negative handle lengths to prevent self-intersecting loops
  const epsilon = 1e-6 * chord;
  const maxHandle = Math.max(0.5, chord * 0.85);
  if (alphaL < epsilon || alphaR < epsilon || alphaL > maxHandle || alphaR > maxHandle) {
    alphaL = fallbackAlpha;
    alphaR = fallbackAlpha;
  }

  return {
    p1: [p0[0] + tHat1[0] * alphaL, p0[1] + tHat1[1] * alphaL],
    p2: [p3[0] + tHat2[0] * alphaR, p3[1] + tHat2[1] * alphaR],
  };
}

/**
 * Recursively fits minimal Cubic Bézier (`C`) or straight line (`L`) segments to an open sub-chain.
 */
function fitSubChainRecursive(
  pts: Array<[number, number]>,
  tHat1: [number, number],
  tHat2: [number, number],
  curveTol: number,
  lineMergeTol: number,
  depth = 0
): TopologicalSegment[] {
  const n = pts.length;
  if (n <= 1) return [];
  const p0 = pts[0];
  const p3 = pts[n - 1];
  if (n === 2) {
    return [{ type: 'L', p0, p3 }];
  }

  // Check if entire sub-chain is straight within lineMergeTol -> collapse to 1 single L segment!
  let maxLineDistSq = 0;
  for (let i = 1; i < n - 1; i++) {
    const d2 = pointToSegDistSq(pts[i][0], pts[i][1], p0[0], p0[1], p3[0], p3[1]);
    if (d2 > maxLineDistSq) maxLineDistSq = d2;
  }
  if (maxLineDistSq <= lineMergeTol * lineMergeTol) {
    return [{ type: 'L', p0, p3 }];
  }

  // Chord-length parameterization
  const u = new Float64Array(n);
  u[0] = 0;
  for (let i = 1; i < n; i++) {
    u[i] = u[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  const totalLen = u[n - 1];
  if (totalLen < 1e-6) {
    return [{ type: 'L', p0, p3 }];
  }
  for (let i = 1; i < n; i++) u[i] /= totalLen;

  let { p1, p2 } = fitSingleCubic(pts, u, tHat1, tHat2);

  // Evaluate max error and find split index
  const measureMaxErr = (cp1: [number, number], cp2: [number, number]) => {
    let maxD2 = 0;
    let split = Math.floor(n / 2);
    for (let i = 1; i < n - 1; i++) {
      const q = evalCubic(p0, cp1, cp2, p3, u[i]);
      const dx = q[0] - pts[i][0];
      const dy = q[1] - pts[i][1];
      const d2 = dx * dx + dy * dy;
      if (d2 > maxD2) {
        maxD2 = d2;
        split = i;
      }
    }
    return { maxD2, split };
  };

  let { maxD2, split } = measureMaxErr(p1, p2);
  const tolSq = curveTol * curveTol;
  if (maxD2 <= tolSq) {
    return [{ type: 'C', p0, p1, p2, p3 }];
  }

  // 2 quick Gauss-Newton/reparameterization refinement steps when close to threshold
  if (maxD2 < tolSq * 9.0) {
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 1; i < n - 1; i++) {
        const t = u[i];
        const q = evalCubic(p0, p1, p2, p3, t);
        const mt = 1 - t;
        const d1x = 3 * (mt * mt * (p1[0] - p0[0]) + 2 * mt * t * (p2[0] - p1[0]) + t * t * (p3[0] - p2[0]));
        const d1y = 3 * (mt * mt * (p1[1] - p0[1]) + 2 * mt * t * (p2[1] - p1[1]) + t * t * (p3[1] - p2[1]));
        const denom = d1x * d1x + d1y * d1y;
        if (denom > 1e-8) {
          const num = (q[0] - pts[i][0]) * d1x + (q[1] - pts[i][1]) * d1y;
          u[i] = Math.max(u[i - 1] + 1e-5, Math.min(0.99999, t - num / denom));
        }
      }
      const refit = fitSingleCubic(pts, u, tHat1, tHat2);
      const nextErr = measureMaxErr(refit.p1, refit.p2);
      if (nextErr.maxD2 < maxD2) {
        p1 = refit.p1;
        p2 = refit.p2;
        maxD2 = nextErr.maxD2;
        split = nextErr.split;
      }
      if (maxD2 <= tolSq) {
        return [{ type: 'C', p0, p1, p2, p3 }];
      }
    }
  }

  // Fallback safeguard for very deep splits
  if (depth >= 10 || n <= 3) {
    const out: TopologicalSegment[] = [];
    for (let i = 0; i < n - 1; i++) {
      out.push({ type: 'L', p0: pts[i], p3: pts[i + 1] });
    }
    return out;
  }

  split = Math.max(1, Math.min(n - 2, split));
  const leftTanOut = normVec(pts[split - 1][0] - pts[Math.min(n - 1, split + 1)][0], pts[split - 1][1] - pts[Math.min(n - 1, split + 1)][1]);
  const rightTanIn: [number, number] = [-leftTanOut[0], -leftTanOut[1]];

  const left = fitSubChainRecursive(pts.slice(0, split + 1), tHat1, leftTanOut, curveTol, lineMergeTol, depth + 1);
  const right = fitSubChainRecursive(pts.slice(split), rightTanIn, tHat2, curveTol, lineMergeTol, depth + 1);
  return left.concat(right);
}

/**
 * Smooths and fits a single canonical topological chain into minimal Bézier/Line segments.
 */
function fitCanonicalChain(
  chain: CanonicalChain,
  profile: ImageProfileKind,
  calib: TraceCalibrationParams,
  w: number,
  h: number,
  isUltraDense = false
): TopologicalSegment[] {
  const raw = chain.pts;
  if (raw.length < 2) return [];
  if (raw.length === 2) {
    return [{ type: 'L', p0: raw[0], p3: raw[1] }];
  }

  // Compute chain bounding-box diagonal to scale smoothing & Bézier tolerance cleanly
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    const x = raw[i][0], y = raw[i][1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY);
  const isTinyDetail = chain.isClosed && diag <= 7.0;
  const isLargeSweep = diag > 28;

  const corners = detectGeometricCorners(raw, chain.isClosed, calib.cornerAngleDeg, w, h);
  const passes = isUltraDense
    ? isTinyDetail
      ? 2
      : isLargeSweep
      ? 4
      : 3
    : isTinyDetail
    ? 2
    : isLargeSweep
    ? Math.max(8, calib.taubinPasses + 2)
    : profile === 'flat'
    ? 6
    : calib.taubinPasses;
  const smoothed = smoothChainTaubin(raw, corners, chain.isClosed, passes, w, h);

  const baseTol = profile === 'flat' || profile === 'line_typo' ? calib.flatCurveTol : calib.smoothCurveTol;
  const curveTol = isUltraDense
    ? isTinyDetail
      ? 0.16
      : isLargeSweep
      ? 0.34
      : 0.20
    : isTinyDetail
    ? Math.min(baseTol, 0.20)
    : isLargeSweep
    ? Math.max(baseTol, 0.48)
    : baseTol;
  const lineTol = isUltraDense
    ? isTinyDetail
      ? 0.14
      : isLargeSweep
      ? 0.22
      : 0.16
    : isTinyDetail
    ? Math.min(calib.lineMergeTol, 0.18)
    : isLargeSweep
    ? Math.max(calib.lineMergeTol, 0.30)
    : calib.lineMergeTol;

  // Split chain at pinned corners (or split closed loops starting at first corner, or vertex 0 if none)
  const cornerIndices: number[] = [];
  const limit = chain.isClosed ? smoothed.length - 1 : smoothed.length;
  for (let i = 0; i < limit; i++) {
    if (corners[i]) cornerIndices.push(i);
  }

  const pieces: Array<Array<[number, number]>> = [];
  if (chain.isClosed) {
    if (cornerIndices.length === 0) {
      // Pure closed loop with no corners (e.g., circle / eye): split into 2 halves or at extrema so endpoints join smoothly!
      const n = limit;
      if (n >= 8) {
        const mid = Math.floor(n / 2);
        pieces.push(smoothed.slice(0, mid + 1));
        const second = smoothed.slice(mid, n);
        second.push(smoothed[0]);
        pieces.push(second);
      } else {
        const ring = smoothed.slice(0, n);
        ring.push(smoothed[0]);
        pieces.push(ring);
      }
    } else {
      for (let k = 0; k < cornerIndices.length; k++) {
        const a = cornerIndices[k];
        const b = cornerIndices[(k + 1) % cornerIndices.length];
        if (a < b) {
          pieces.push(smoothed.slice(a, b + 1));
        } else {
          pieces.push(smoothed.slice(a, limit).concat(smoothed.slice(0, b + 1)));
        }
      }
    }
  } else {
    if (cornerIndices[0] !== 0) cornerIndices.unshift(0);
    if (cornerIndices[cornerIndices.length - 1] !== smoothed.length - 1) {
      cornerIndices.push(smoothed.length - 1);
    }
    for (let k = 0; k < cornerIndices.length - 1; k++) {
      const a = cornerIndices[k];
      const b = cornerIndices[k + 1];
      if (b > a) pieces.push(smoothed.slice(a, b + 1));
    }
  }

  const allSegs: TopologicalSegment[] = [];
  for (const sub of pieces) {
    if (sub.length < 2) continue;
    const t0 = normVec(sub[1][0] - sub[0][0], sub[1][1] - sub[0][1]);
    const tEnd = normVec(sub[sub.length - 2][0] - sub[sub.length - 1][0], sub[sub.length - 2][1] - sub[sub.length - 1][1]);
    const segs = fitSubChainRecursive(sub, t0, tEnd, curveTol, lineTol, 0);
    for (const s of segs) allSegs.push(s);
  }
  return allSegs;
}

const fmt = (v: number): string => {
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
};

/**
 * Traces an RGBA buffer into a clean, watertight, minimal-node Cubic-Bézier SVG using
 * WebGL2 GPU palette labeling (with CPU fallback) and canonical topological boundaries.
 */
export function traceTopologicalBezierSvg(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  opts: {
    colorCount?: number;
    despeckle?: number;
    smoothness?: number;
    ignoreWhite?: boolean;
    useGpu?: boolean;
    stroke?: boolean;
    calibration?: Partial<TraceCalibrationParams>;
  },
  assignPalette: AssignPaletteFn,
  maskBackdropFn?: (rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, whiteMin?: number) => Uint8ClampedArray,
  onProgress?: (stage: string, frac: number, detail: string) => void
): { svg: string; palette: PaletteColor[]; stats: any } {
  const t0 = performance.now();
  const calib: TraceCalibrationParams = { ...DEFAULT_CALIBRATION, ...(opts.calibration || {}) };

  // Adjust tolerance gently by smoothness UI slider if provided
  if (opts.smoothness != null) {
    const sm = Number(opts.smoothness) > 2 ? Number(opts.smoothness) / 100 : Number(opts.smoothness);
    if (Number.isFinite(sm)) {
      const factor = 0.78 + sm * 0.45;
      calib.flatCurveTol = +(calib.flatCurveTol * factor).toFixed(3);
      calib.smoothCurveTol = +(calib.smoothCurveTol * factor).toFixed(3);
    }
  }
  if (opts.despeckle != null) {
    calib.lowContrastSpeckleArea = Math.max(0, Math.min(2, Math.round(opts.despeckle)));
  }

  const workRgba = opts.ignoreWhite && maskBackdropFn ? maskBackdropFn(rgba, w, h, 244) : rgba;

  onProgress?.('palette', 0.2, 'Extracting adaptive palette…');
  const palRes = analyzeAndBuildPalette(workRgba, w, h, opts.colorCount || 250);
  const { palette, profile, hasAlpha } = palRes;

  onProgress?.('segment', 0.45, opts.useGpu !== false ? 'Assigning pixels via GPU WebGL2…' : 'Assigning pixels via CPU…');
  const bThresh = calib.bilateralL1Thresh ?? 0;
  const segRgba =
    bThresh > 0 && (profile === 'gradient_photo' || profile === 'illustration')
      ? bilateralDenoiseForLabeling(workRgba, w, h, bThresh)
      : workRgba;
  const assign = assignPalette(segRgba, w, h, palette, opts.useGpu !== false);
  const labels = assign.labels;

  // Collapse 1px anti-aliasing halo rims cleanly on crisp vector/logo/typography profiles only
  if (profile === 'flat' || profile === 'line_typo') {
    suppressEdgeAntiAliasingFringes(labels, workRgba, w, h, palette, 2800, profile === 'flat');
  }

  const minSpeckle = 1;
  despeckleContrastAware(labels, w, h, palette, minSpeckle, calib.contrastProtectDist);

  onProgress?.('trace', 0.7, 'Extracting shared topological chains & fitting Cubic Béziers…');
  const { chains, labelRings } = extractTopologicalChains(labels, w, h);

  let totalNodes = 0;
  let cubicCount = 0;
  let lineCount = 0;

  const chainDensity = chains.length / Math.max(1, w * h);
  const isUltraDense = chainDensity > 0.20;
  for (let c = 0; c < chains.length; c++) {
    chains[c].segs = fitCanonicalChain(chains[c], profile, calib, w, h, isUltraDense);
  }

  // Count opaque area per label to render dominant backdrop layers before smaller foreground accents
  const labelAreas = new Int32Array(palette.length);
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] >= 0) labelAreas[labels[i]]++;
  }
  const orderedLabels = Array.from(labelRings.keys()).sort((a, b) => labelAreas[b] - labelAreas[a]);

  const seamW =
    opts.stroke === false || profile === 'flat' || profile === 'line_typo'
      ? 0
      : calib.seamStrokeWidth;
  const seamAreaFloor = 12;
  const pathTags: string[] = [];

  // Emit 1 opaque dominant-color safety backdrop behind multi-tone gradients/illustrations so hairline seams never show white canvas
  if (!hasAlpha && !opts.ignoreWhite && orderedLabels.length > 1 && (profile === 'gradient_photo' || profile === 'illustration')) {
    const domHex = palette[orderedLabels[0]].hex;
    pathTags.push(`<rect width="${w}" height="${h}" fill="${domHex}"/>`);
  }

  for (const lbl of orderedLabels) {
    const rings = labelRings.get(lbl);
    if (!rings || !rings.length) continue;

    const ringDStrings: string[] = [];
    for (const ring of rings) {
      const cmds: string[] = [];
      let started = false;
      for (const ref of ring) {
        const segs = chains[ref.chainId].segs;
        if (!segs.length) continue;
        if (ref.forward) {
          for (let s = 0; s < segs.length; s++) {
            const seg = segs[s];
            if (!started) {
              cmds.push(`M${fmt(seg.p0[0])} ${fmt(seg.p0[1])}`);
              started = true;
              totalNodes++;
            }
            if (seg.type === 'L') {
              cmds.push(`L${fmt(seg.p3[0])} ${fmt(seg.p3[1])}`);
              lineCount++;
            } else {
              cmds.push(`C${fmt(seg.p1![0])} ${fmt(seg.p1![1])} ${fmt(seg.p2![0])} ${fmt(seg.p2![1])} ${fmt(seg.p3[0])} ${fmt(seg.p3[1])}`);
              cubicCount++;
            }
            totalNodes++;
          }
        } else {
          for (let s = segs.length - 1; s >= 0; s--) {
            const seg = segs[s];
            if (!started) {
              cmds.push(`M${fmt(seg.p3[0])} ${fmt(seg.p3[1])}`);
              started = true;
              totalNodes++;
            }
            if (seg.type === 'L') {
              cmds.push(`L${fmt(seg.p0[0])} ${fmt(seg.p0[1])}`);
              lineCount++;
            } else {
              cmds.push(`C${fmt(seg.p2![0])} ${fmt(seg.p2![1])} ${fmt(seg.p1![0])} ${fmt(seg.p1![1])} ${fmt(seg.p0[0])} ${fmt(seg.p0[1])}`);
              cubicCount++;
            }
            totalNodes++;
          }
        }
      }
      if (started) {
        cmds.push('Z');
        ringDStrings.push(cmds.join(''));
      }
    }

    if (ringDStrings.length) {
      const hex = palette[lbl].hex;
      // Add ultra-thin anti-seam stroke ONLY on larger non-alpha regions so fine 1-2px details never thicken
      const strokeAttr =
        seamW > 0 && !hasAlpha && labelAreas[lbl] >= seamAreaFloor
          ? ` stroke="${hex}" stroke-width="${seamW}" stroke-linejoin="round"`
          : '';
      pathTags.push(`<path fill="${hex}"${strokeAttr} fill-rule="evenodd" d="${ringDStrings.join('')}"/>`);
    }
  }

  onProgress?.('done', 1, 'Selesai');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n${pathTags.join('\n')}\n</svg>`;
  const segSum = cubicCount + lineCount;

  return {
    svg,
    palette,
    stats: {
      ms: Math.round(performance.now() - t0),
      regions: pathTags.length,
      profile,
      chains: chains.length,
      totalNodes,
      cubicCount,
      lineCount,
      bezierRatio: segSum > 0 ? +(cubicCount / segSum).toFixed(4) : 0,
      hw: {
        gpuUsed: assign.usedGpu,
        gpuBackend: assign.backend,
        gpuRenderer: assign.renderer,
      },
    },
  };
}
