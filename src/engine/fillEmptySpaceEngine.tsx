/**
 * @file src/engine/fillEmptySpaceEngine.tsx
 * @description Mesin Topologi Poligon Hibrida untuk "Isi Ruang Kosong":
 * 1. Scanline Winding Rasterizer + Konservatif Seam-Seal Grid (kebal terhadap
 *    degenerasi Greiner-Hormann pada ratusan objek SVG auto-trace, mosaik
 *    banyak ubin, sudut bersinggungan, dan celah rambut sub-piksel).
 * 2. Flood-fill komponen terhubung (BFS) dengan kepemilikan batas berurutan
 *    Z-order sehingga penghalang/dinding tipis memblokir objek terpisah secara eksak.
 * 3. Ekstraksi Vektor Lokal Eksak + fallback Kontur Half-Edge Marching Squares
 *    dengan snapping tepi ke segmen pembatas lokal dan refit kurva Bézier.
 *
 * Pure JS/TS (tanpa JSX atau dependensi DOM/Canvas).
 */
import {
  flattenObjToRings,
  clipRings,
  normalizeRingOrientations,
  ringArea,
  cleanRing,
  ringsToSubs,
  isInsideRings,
  ringContainsPt
} from './pathBoolean.tsx';
import { outlineStrokeDoc } from './pathOffset.tsx';
import { hasVisibleStroke } from './strokeStyles.tsx';
import { gradOn, strokeGradOn } from './gradientEngine.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';

const FLAT_TOL = 0.25;
const REFIT_TOL = 0.45;
const TOUCH_TOL = 1.25;
const MIN_POCKET_AREA = 0.02;
const EDGE_SAMPLE_STEP = 8.0;
const GRID_MAX_DIM = 800;
const FINE_SCAN_TARGET_CELL = 0.2;
const FINE_TILE_WORLD = 140;

const hasVisibleFill = (o: any) =>
  Boolean((o?.fill && o.fill !== 'none' && o.fill !== 'transparent') || gradOn(o));

const ringsBBox = (rings: number[][][]): [number, number, number, number] => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const x = r[i][0], y = r[i][1];
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return [x0, y0, x1, y1];
};

const netRingsArea = (rings: number[][][]): number => {
  let sum = 0;
  for (const r of rings) sum += ringArea(r);
  return Math.abs(sum);
};

const bboxesTouchOrOverlap = (a: number[], b: number[], pad = 0) =>
  a[0] - pad <= b[2] && a[2] + pad >= b[0] && a[1] - pad <= b[3] && a[3] + pad >= b[1];

/* Ekstrak ring poligon pembatas untuk satu objek (fill tertutup + stroke band tertutup/terbuka). */
const extractObstacleRings = (
  o: any
): {
  barrierRings: number[][][];
  fillRule: 'nonzero' | 'evenodd';
  targetBaseRings: number[][][];
  promoteFill: boolean;
} => {
  const subs = Array.isArray(o?.subs) ? o.subs : [];
  const closedSubs = subs.filter((sp: any) => sp && sp.closed);
  const openSubs = subs.filter((sp: any) => sp && !sp.closed);
  const hasFill = hasVisibleFill(o);
  const visStroke = hasVisibleStroke(o) && (o.strokeWidth || 0) > 0;
  const fillRule: 'nonzero' | 'evenodd' = o?.fillRule === 'evenodd' ? 'evenodd' : 'nonzero';

  let barrierRings: number[][][] = [];
  let targetBaseRings: number[][][] = [];
  let promoteFill = false;
  let effectiveFillRule: 'nonzero' | 'evenodd' = fillRule;

  if (hasFill && closedSubs.length > 0) {
    const { rings } = flattenObjToRings({ ...o, subs: closedSubs }, FLAT_TOL);
    barrierRings = rings.slice();
    targetBaseRings = rings;
  } else if (!hasFill && visStroke && closedSubs.length > 0) {
    const tmp = { ...o, subs: closedSubs };
    const outRes = outlineStrokeDoc({ objects: [tmp] }, new Set([tmp.id]));
    if (outRes?.changed) {
      const outObj = outRes.doc.objects[0];
      const { rings } = flattenObjToRings(outObj, FLAT_TOL);
      barrierRings = rings.slice();
      targetBaseRings = rings;
      promoteFill = true;
      if (outObj.fillRule === 'evenodd') effectiveFillRule = 'evenodd';
    }
  }

  if (visStroke && openSubs.length > 0) {
    const tmpOpen = { ...o, subs: openSubs };
    const outOpen = outlineStrokeDoc({ objects: [tmpOpen] }, new Set([tmpOpen.id]));
    if (outOpen?.changed) {
      const { rings: openRings } = flattenObjToRings(outOpen.doc.objects[0], FLAT_TOL);
      for (const r of openRings) barrierRings.push(r);
    }
  }

  return { barrierRings, fillRule: effectiveFillRule, targetBaseRings, promoteFill };
};

interface ObstacleEntry {
  id: string;
  docIdx: number;
  isTarget: boolean;
  rings: number[][][];
  fillRule: 'nonzero' | 'evenodd';
  bbox: [number, number, number, number];
}

/* Rasterisasi tepat interior poligon berdasarkan keberadaan warna (nonzero & evenodd)
   serta pencatatan penghalang batas antar-sel (`wallMask`) agar ruang kosong kecil
   tidak tertutup oleh dilasi batas namun tetap kedap terhadap kebocoran dinding tipis. */
const rasterizeObstaclesToGrid = (
  entries: ObstacleEntry[],
  ox: number,
  oy: number,
  cell: number,
  gw: number,
  gh: number
): {
  occ: Uint8Array;
  owner: Int32Array;
  wallMask: Uint8Array;
  wallOwnerR: Int32Array;
  wallOwnerD: Int32Array;
} => {
  const size = gw * gh;
  const occ = new Uint8Array(size);
  const owner = new Int32Array(size).fill(-1);
  const wallMask = new Uint8Array(size);
  const wallOwnerR = new Int32Array(size).fill(-1);
  const wallOwnerD = new Int32Array(size).fill(-1);
  const invCell = 1 / cell;

  // Rasterize target terlebih dahulu agar penghalang non-target menimpa kepemilikan batas di atasnya.
  const ordered = entries
    .map((e, origIdx) => ({ e, origIdx }))
    .sort((a, b) => {
      if (a.e.isTarget !== b.e.isTarget) return a.e.isTarget ? -1 : 1;
      return a.e.docIdx - b.e.docIdx;
    });

  for (const { e, origIdx } of ordered) {
    const rings = e.rings;
    if (!rings.length) continue;
    const isEvenOdd = e.fillRule === 'evenodd';

    const gxMin = Math.max(0, Math.floor((e.bbox[0] - ox) * invCell) - 1);
    const gxMax = Math.min(gw - 1, Math.ceil((e.bbox[2] - ox) * invCell) + 1);
    const gyMin = Math.max(1, Math.floor((e.bbox[1] - oy) * invCell) - 1);
    const gyMax = Math.min(gh - 2, Math.ceil((e.bbox[3] - oy) * invCell) + 1);

    // 1. Active-edge scanline fill untuk interior berwarna eksak (nonzero & evenodd)
    //    serta penandaan penghalang horizontal antar pusat sel yang bersebelahan.
    for (let gy = gyMin; gy <= gyMax; gy++) {
      const wy = oy + (gy + 0.5) * cell;
      const hits: { x: number; dir: number }[] = [];

      for (const r of rings) {
        const n = r.length;
        for (let i = 0; i < n; i++) {
          const p0 = r[i], p1 = r[(i + 1) % n];
          const y0 = p0[1], y1 = p1[1];
          if ((y0 <= wy && y1 > wy) || (y1 <= wy && y0 > wy)) {
            const xHit = p0[0] + ((wy - y0) / (y1 - y0)) * (p1[0] - p0[0]);
            hits.push({ x: xHit, dir: y1 > y0 ? 1 : -1 });
          }
        }
      }

      if (!hits.length) continue;
      const rowOff = gy * gw;

      for (let k = 0; k < hits.length; k++) {
        const gxLeft = Math.floor((hits[k].x - ox) * invCell - 0.5);
        if (gxLeft >= 0 && gxLeft + 1 < gw) {
          const pL = rowOff + gxLeft;
          wallMask[pL] |= 1;
          wallMask[pL + 1] |= 2;
          wallOwnerR[pL] = origIdx;
        }
      }

      if (hits.length < 2) continue;
      hits.sort((a, b) => a.x - b.x);

      if (isEvenOdd) {
        for (let k = 0; k + 1 < hits.length; k += 2) {
          const xStart = Math.max(1, Math.ceil((hits[k].x - ox) * invCell - 0.5));
          const xEnd = Math.min(gw - 2, Math.floor((hits[k + 1].x - ox) * invCell - 0.5));
          for (let gx = xStart; gx <= xEnd; gx++) {
            const pos = rowOff + gx;
            occ[pos] = 1;
            owner[pos] = origIdx;
          }
        }
      } else {
        let wn = 0;
        let spanStartWorldX = 0;
        for (let k = 0; k < hits.length; k++) {
          const prevWn = wn;
          wn += hits[k].dir;
          if (prevWn === 0 && wn !== 0) {
            spanStartWorldX = hits[k].x;
          } else if (prevWn !== 0 && wn === 0) {
            const xStart = Math.max(1, Math.ceil((spanStartWorldX - ox) * invCell - 0.5));
            const xEnd = Math.min(gw - 2, Math.floor((hits[k].x - ox) * invCell - 0.5));
            for (let gx = xStart; gx <= xEnd; gx++) {
              const pos = rowOff + gx;
              occ[pos] = 1;
              owner[pos] = origIdx;
            }
          }
        }
      }
    }

    // 2. Penandaan penghalang vertikal antar pusat sel (gy <-> gy+1) agar dinding tipis kedap
    for (const r of rings) {
      const n = r.length;
      for (let i = 0; i < n; i++) {
        const p0 = r[i], p1 = r[(i + 1) % n];
        const x0 = p0[0], x1 = p1[0];
        if (x0 === x1) continue;
        const minX = x0 < x1 ? x0 : x1;
        const maxX = x0 < x1 ? x1 : x0;
        const g0 = Math.max(gxMin, Math.ceil((minX - ox) * invCell - 0.5));
        const g1 = Math.min(gxMax, Math.floor((maxX - ox) * invCell - 0.5));
        for (let gx = g0; gx <= g1; gx++) {
          const wx = ox + (gx + 0.5) * cell;
          if ((x0 <= wx && x1 > wx) || (x1 <= wx && x0 > wx)) {
            const yHit = p0[1] + ((wx - x0) / (x1 - x0)) * (p1[1] - p0[1]);
            const gyTop = Math.floor((yHit - oy) * invCell - 0.5);
            if (gyTop >= 0 && gyTop + 1 < gh) {
              const pT = gyTop * gw + gx;
              wallMask[pT] |= 4;
              wallMask[pT + gw] |= 8;
              wallOwnerD[pT] = origIdx;
            }
          }
        }
      }
    }
  }

  return { occ, owner, wallMask, wallOwnerR, wallOwnerD };
};

interface DiscoveredPocket {
  id: number;
  cells: Int32Array;
  gx0: number;
  gy0: number;
  gx1: number;
  gy1: number;
  worldBBox: [number, number, number, number];
  worldArea: number;
  seedX: number;
  seedY: number;
  borderingTargets: Map<number, number>;
}

/* BFS dari bingkai luar -> tandai eksterior -> labeli tiap komponen ruang kosong tertutup. */
const discoverEnclosedPockets = (
  occ: Uint8Array,
  owner: Int32Array,
  wallMask: Uint8Array,
  wallOwnerR: Int32Array,
  wallOwnerD: Int32Array,
  entries: ObstacleEntry[],
  ox: number,
  oy: number,
  cell: number,
  gw: number,
  gh: number
): DiscoveredPocket[] => {
  const size = gw * gh;
  const queue = new Int32Array(size);
  let qHead = 0, qTail = 0;

  // 1. Seed seluruh tepi bingkai luar sebagai eksterior (occ = 255)
  for (let gx = 0; gx < gw; gx++) {
    const top = gx;
    const bot = (gh - 1) * gw + gx;
    if (occ[top] === 0) { occ[top] = 255; queue[qTail++] = top; }
    if (occ[bot] === 0) { occ[bot] = 255; queue[qTail++] = bot; }
  }
  for (let gy = 1; gy < gh - 1; gy++) {
    const left = gy * gw;
    const right = left + gw - 1;
    if (occ[left] === 0) { occ[left] = 255; queue[qTail++] = left; }
    if (occ[right] === 0) { occ[right] = 255; queue[qTail++] = right; }
  }

  while (qHead < qTail) {
    const pos = queue[qHead++];
    const gx = pos % gw;
    const gy = (pos - gx) / gw;
    const wm = wallMask[pos];
    if (gx > 0 && !(wm & 2) && occ[pos - 1] === 0) { occ[pos - 1] = 255; queue[qTail++] = pos - 1; }
    if (gx + 1 < gw && !(wm & 1) && occ[pos + 1] === 0) { occ[pos + 1] = 255; queue[qTail++] = pos + 1; }
    if (gy > 0 && !(wm & 8) && occ[pos - gw] === 0) { occ[pos - gw] = 255; queue[qTail++] = pos - gw; }
    if (gy + 1 < gh && !(wm & 4) && occ[pos + gw] === 0) { occ[pos + gw] = 255; queue[qTail++] = pos + gw; }
  }

  // 2. Kumpulkan tiap komponen ruang kosong tertutup yang tersisa (occ === 0)
  const label = new Int32Array(size);
  const pockets: DiscoveredPocket[] = [];
  const cellArea = cell * cell;
  let nextId = 1;

  for (let startPos = 0; startPos < size; startPos++) {
    if (occ[startPos] !== 0 || label[startPos] !== 0) continue;
    const pid = nextId++;
    qHead = 0;
    qTail = 0;
    label[startPos] = pid;
    queue[qTail++] = startPos;

    let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
    const borderingTargets = new Map<number, number>();
    let interiorBestDist = -1;
    let seedGx = startPos % gw, seedGy = (startPos - seedGx) / gw;

    while (qHead < qTail) {
      const pos = queue[qHead++];
      const gx = pos % gw;
      const gy = (pos - gx) / gw;
      if (gx < gx0) gx0 = gx;
      if (gy < gy0) gy0 = gy;
      if (gx > gx1) gx1 = gx;
      if (gy > gy1) gy1 = gy;

      const wm = wallMask[pos];
      // Uji 4-tetangga: catat sel kosong untuk BFS, dan catat kepemilikan objek batas / dinding
      const dirs: [number, number, number][] = [
        [pos - 1, 2, wallOwnerR[pos - 1]],
        [pos + 1, 1, wallOwnerR[pos]],
        [pos - gw, 8, wallOwnerD[pos - gw]],
        [pos + gw, 4, wallOwnerD[pos]]
      ];
      let hasWallNeighbor = false;
      for (let ni = 0; ni < 4; ni++) {
        const [nPos, bit, wOwn] = dirs[ni];
        if (wm & bit) {
          hasWallNeighbor = true;
          const ownIdx = wOwn >= 0 ? wOwn : owner[nPos];
          if (ownIdx >= 0 && entries[ownIdx].isTarget) {
            borderingTargets.set(ownIdx, (borderingTargets.get(ownIdx) || 0) + 1);
          }
        } else if (occ[nPos] === 0 && label[nPos] === 0) {
          label[nPos] = pid;
          queue[qTail++] = nPos;
        } else if (occ[nPos] === 1) {
          hasWallNeighbor = true;
          const ownIdx = owner[nPos];
          if (ownIdx >= 0 && entries[ownIdx].isTarget) {
            borderingTargets.set(ownIdx, (borderingTargets.get(ownIdx) || 0) + 1);
          }
        }
      }

      // Pilih seed yang menjauh dari dinding bila ada
      const scoreInterior = (hasWallNeighbor ? 0 : 10) + Math.min(gx - gx0, gx1 - gx, gy - gy0, gy1 - gy);
      if (scoreInterior > interiorBestDist) {
        interiorBestDist = scoreInterior;
        seedGx = gx;
        seedGy = gy;
      }
    }

    const worldArea = qTail * cellArea;
    if (worldArea < MIN_POCKET_AREA) continue;

    pockets.push({
      id: pid,
      cells: queue.slice(0, qTail),
      gx0,
      gy0,
      gx1,
      gy1,
      worldBBox: [
        ox + gx0 * cell,
        oy + gy0 * cell,
        ox + (gx1 + 1) * cell,
        oy + (gy1 + 1) * cell
      ],
      worldArea,
      seedX: ox + (seedGx + 0.5) * cell,
      seedY: oy + (seedGy + 0.5) * cell,
      borderingTargets
    });
  }

  return pockets;
};

const closestPointOnRings = (
  px: number,
  py: number,
  rings: number[][][]
): { d2: number; qx: number; qy: number; inX: number; inY: number } => {
  let bestD2 = Infinity, qx = px, qy = py, inX = 0, inY = 0;
  for (const r of rings) {
    const n = r.length;
    const rSign = ringArea(r) >= 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = r[i], b = r[(i + 1) % n];
      const vx = b[0] - a[0], vy = b[1] - a[1];
      const len2 = vx * vx + vy * vy;
      let cx = a[0], cy = a[1];
      if (len2 > 1e-12) {
        let t = ((px - a[0]) * vx + (py - a[1]) * vy) / len2;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
        cx = a[0] + t * vx;
        cy = a[1] + t * vy;
      }
      const dx = px - cx, dy = py - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        qx = cx;
        qy = cy;
        const L = Math.sqrt(len2) || 1;
        inX = (-vy / L) * rSign;
        inY = (vx / L) * rSign;
      }
    }
  }
  return { d2: bestD2, qx, qy, inX, inY };
};

/* Ekstrak kontur eksak berarah (half-edge loop tracing) dari mask piksel komponen kantong.
   Outer loop berorientasi +area, hole pulau di dalam berorientasi -area. */
const extractContourFromPocketMask = (
  pk: DiscoveredPocket,
  ox: number,
  oy: number,
  cell: number,
  gw: number,
  localObsRings: number[][][]
): number[][][] => {
  const pad = 2;
  const xOff = pk.gx0 - pad;
  const yOff = pk.gy0 - pad;
  const w = pk.gx1 - pk.gx0 + 1 + pad * 2;
  const h = pk.gy1 - pk.gy0 + 1 + pad * 2;
  const mask = new Uint8Array(w * h);

  for (let i = 0; i < pk.cells.length; i++) {
    const pos = pk.cells[i];
    const gx = pos % gw;
    const gy = (pos - gx) / gw;
    mask[(gy - yOff) * w + (gx - xOff)] = 1;
  }

  // Kumpulkan half-edge batas berarah: vertex key = vx * 65536 + vy
  interface HalfEdge {
    ax: number; ay: number;
    bx: number; by: number;
    dx: number; dy: number;
    used: boolean;
  }
  const outByStart = new Map<number, HalfEdge[]>();
  const addEdge = (ax: number, ay: number, bx: number, by: number) => {
    const e: HalfEdge = { ax, ay, bx, by, dx: bx - ax, dy: by - ay, used: false };
    const k = ax * 65536 + ay;
    let arr = outByStart.get(k);
    if (!arr) { arr = []; outByStart.set(k, arr); }
    arr.push(e);
  };

  for (let ly = 1; ly < h - 1; ly++) {
    for (let lx = 1; lx < w - 1; lx++) {
      if (mask[ly * w + lx] === 0) continue;
      if (mask[(ly - 1) * w + lx] === 0) addEdge(lx, ly, lx + 1, ly);
      if (mask[ly * w + lx + 1] === 0) addEdge(lx + 1, ly, lx + 1, ly + 1);
      if (mask[(ly + 1) * w + lx] === 0) addEdge(lx + 1, ly + 1, lx, ly + 1);
      if (mask[ly * w + lx - 1] === 0) addEdge(lx, ly + 1, lx, ly);
    }
  }

  const allLoops: number[][][] = [];
  for (const list of outByStart.values()) {
    for (const startEdge of list) {
      if (startEdge.used) continue;
      const pts: number[][] = [];
      let cur: HalfEdge | null = startEdge;
      let guard = 0;
      while (cur && !cur.used && guard++ < w * h * 4) {
        cur.used = true;
        pts.push([cur.ax, cur.ay]);
        if (cur.bx === startEdge.ax && cur.by === startEdge.ay) break;
        const candList = outByStart.get(cur.bx * 65536 + cur.by);
        if (!candList || !candList.length) { cur = null; break; }
        let nextEdge: HalfEdge | null = null;
        if (candList.length === 1) {
          nextEdge = candList[0].used ? null : candList[0];
        } else {
          // Saddle disambiguation: pilih belokan kanan terdalam (right-hand rule untuk memisahkan loop tanpa silang)
          for (const c of candList) {
            if (c.used) continue;
            const turnRight = cur.dx * (-c.dy) + cur.dy * c.dx > 0;
            if (turnRight) { nextEdge = c; break; }
            if (!nextEdge) nextEdge = c;
          }
        }
        cur = nextEdge;
      }

      if (pts.length >= 4) {
        // Konversi titik tepi grid ke koordinat dunia & snap ke segmen pembatas lokal terdekat
        const snapThreshSq = (cell * 2.2) * (cell * 2.2);
        const worldPts: number[][] = [];
        for (let i = 0; i < pts.length; i++) {
          const wx = ox + (pts[i][0] + xOff) * cell;
          const wy = oy + (pts[i][1] + yOff) * cell;
          if (localObsRings.length > 0) {
            const cp = closestPointOnRings(wx, wy, localObsRings);
            if (cp.d2 <= snapThreshSq) {
              worldPts.push([cp.qx, cp.qy]);
              continue;
            }
          }
          worldPts.push([wx, wy]);
        }
        const cleaned = cleanRing(worldPts);
        if (cleaned.length >= 3 && Math.abs(ringArea(cleaned)) >= MIN_POCKET_AREA * 0.25) {
          allLoops.push(cleaned);
        }
      }
    }
  }

  return normalizeRingOrientations(allLoops);
};

/* Coba ekstraksi vektor eksak dari selisih kotak lokal dikurangi pembatas lokal. */
const tryExtractExactVectorPocket = (
  pk: DiscoveredPocket,
  localEntries: ObstacleEntry[],
  cell: number
): number[][][] | null => {
  if (!localEntries.length || localEntries.length > 18) return null;
  let totalVerts = 0;
  for (const e of localEntries) {
    for (const r of e.rings) totalVerts += r.length;
  }
  if (totalVerts > 600) return null;

  const pad = Math.max(4, cell * 4);
  const bx0 = pk.worldBBox[0] - pad;
  const by0 = pk.worldBBox[1] - pad;
  const bx1 = pk.worldBBox[2] + pad;
  const by1 = pk.worldBBox[3] + pad;
  let localBox: number[][] = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]];
  if (ringArea(localBox) < 0) localBox = localBox.slice().reverse();

  // Subtract tiap pembatas lokal secara bertahap dari localBox (kebal terhadap union Greiner-Hormann antar ubin!)
  let region: number[][][] = [localBox];
  for (const e of localEntries) {
    if (!region.length) return null;
    region = clipRings(region, e.rings, 'difference');
  }

  const norm = normalizeRingOrientations(region.map(cleanRing).filter(r => r.length >= 3 && Math.abs(ringArea(r)) > 1e-6));
  if (!norm.length) return null;

  // Pilih komponen positif yang berisi seed kantong DAN tidak menyentuh bingkai localBox (berarti tidak bocor!)
  const epsEdge = 0.25;
  const depths = norm.map((r, i) => {
    let d = 0;
    for (let j = 0; j < norm.length; j++) if (i !== j && ringContainsPt(r[0][0], r[0][1], norm[j])) d++;
    return d;
  });

  for (let i = 0; i < norm.length; i++) {
    if (depths[i] % 2 !== 0) continue;
    const outer = norm[i];
    if (!ringContainsPt(pk.seedX, pk.seedY, outer)) continue;

    // Cek kebocoran ke bingkai luar localBox
    let leaks = false;
    for (let k = 0; k < outer.length; k++) {
      const p = outer[k];
      if (Math.abs(p[0] - bx0) < epsEdge || Math.abs(p[0] - bx1) < epsEdge ||
          Math.abs(p[1] - by0) < epsEdge || Math.abs(p[1] - by1) < epsEdge) {
        leaks = true;
        break;
      }
    }
    if (leaks) continue;

    const holes: number[][][] = [];
    for (let j = 0; j < norm.length; j++) {
      if (j !== i && depths[j] === depths[i] + 1 && ringContainsPt(norm[j][0][0], norm[j][0][1], outer)) {
        holes.push(norm[j]);
      }
    }
    const comp = [outer, ...holes];
    const a = netRingsArea(comp);
    if (a >= pk.worldArea * 0.4 && a <= pk.worldArea * 2.2) {
      return comp;
    }
  }
  return null;
};

/* Snap simpul tepi kantong yang berjarak tipis (<= snapTol) sedikit ke dalam
   interior target agar clipRings('union') menyatu mulus tanpa celah maupun grazing. */
const snapPocketBoundaryToTarget = (
  pocketRings: number[][][],
  targetRings: number[][][],
  snapTol: number
): number[][][] => {
  const tolSq = snapTol * snapTol;
  return pocketRings.map(ring =>
    ring.map(pt => {
      const cp = closestPointOnRings(pt[0], pt[1], targetRings);
      if (cp.d2 > tolSq) return pt;
      const nx = cp.inX, ny = cp.inY;
      const dirs: [number, number][] = [
        [nx, ny],
        [-nx, -ny],
        [(nx - ny) * 0.7071, (ny + nx) * 0.7071],
        [(nx + ny) * 0.7071, (ny - nx) * 0.7071],
        [(-nx + ny) * 0.7071, (-ny - nx) * 0.7071],
        [(-nx - ny) * 0.7071, (-ny + nx) * 0.7071]
      ];
      for (let di = 0; di < dirs.length; di++) {
        const cx = cp.qx + dirs[di][0] * 0.06;
        const cy = cp.qy + dirs[di][1] * 0.06;
        if (isInsideRings(cx, cy, targetRings)) return [cx, cy];
      }
      if (cp.d2 > 1e-8) {
        const d = Math.sqrt(cp.d2);
        const ux = (cp.qx - pt[0]) / d;
        const uy = (cp.qy - pt[1]) / d;
        const nx = cp.qx + ux * 0.06;
        const ny = cp.qy + uy * 0.06;
        return isInsideRings(nx, ny, targetRings) ? [nx, ny] : [cp.qx, cp.qy];
      }
      return pt;
    })
  );
};

export interface FillEmptySpaceResult {
  doc: any;
  changed: boolean;
  reason?: 'needpath' | 'noempty' | 'notouch' | 'empty';
  resultIds?: string[];
  stats?: {
    updatedObjects: number;
    filledPockets: number;
  };
}

/**
 * Mengisi semua ruang kosong tertutup yang bersentuhan langsung dengan
 * objek path terpilih pada dokumen.
 */
export const fillEmptySpaceDoc = (doc: any, selIds: any): FillEmptySpaceResult => {
  const allObjs: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const selSet: Set<string> = selIds instanceof Set ? selIds : new Set(selIds || []);

  if (!allObjs.length || !selSet.size) {
    return { doc, changed: false, reason: 'needpath' };
  }

  // 1. Validasi target seleksi (path tertutup ber-fill atau stroke tertutup)
  const rawSelected = allObjs.filter(
    o => o && selSet.has(o.id) && !o.hidden && !o.locked && !o.img && !o.text &&
      !o.isFrameBg && !o.isAutoFrame && Array.isArray(o.subs) && o.subs.length > 0
  );
  const eligibleTargets: any[] = [];
  const targetMetaMap = new Map<string, {
    obj: any;
    docIdx: number;
    baseRings: number[][][];
    promoteFill: boolean;
    fillRule: 'nonzero' | 'evenodd';
    bbox: [number, number, number, number];
  }>();

  for (const o of rawSelected) {
    if (!o.subs.some((sp: any) => sp && sp.closed)) continue;
    const ext = extractObstacleRings(o);
    if (!ext.targetBaseRings.length) continue;
    eligibleTargets.push(o);
    targetMetaMap.set(o.id, {
      obj: o,
      docIdx: allObjs.indexOf(o),
      baseRings: ext.targetBaseRings,
      promoteFill: ext.promoteFill,
      fillRule: ext.fillRule,
      bbox: ringsBBox(ext.targetBaseRings)
    });
  }

  if (!eligibleTargets.length) {
    return { doc, changed: false, reason: 'needpath' };
  }

  // 2. Kumpulkan klaster spasial pembatas di sekitar seleksi (BFS bounding box)
  const candidateObs = allObjs
    .map((o, docIdx) => ({ o, docIdx, bb: o ? tightBBox(o) : null }))
    .filter(it =>
      it.o && !it.o.hidden && !it.o.isFrameBg && !it.o.isAutoFrame &&
      !it.o.img && !it.o.text && Array.isArray(it.o.subs) && it.o.subs.length > 0 &&
      it.bb && it.bb[0] <= it.bb[2] && it.bb[1] <= it.bb[3]
    );

  const clusterIds = new Set<string>(eligibleTargets.map(o => o.id));
  const clusterBBoxes: number[][] = Array.from(targetMetaMap.values()).map(v => v.bbox);
  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < candidateObs.length; i++) {
      const it = candidateObs[i];
      if (clusterIds.has(it.o.id)) continue;
      for (let j = 0; j < clusterBBoxes.length; j++) {
        if (bboxesTouchOrOverlap(it.bb!, clusterBBoxes[j], TOUCH_TOL * 2)) {
          clusterIds.add(it.o.id);
          clusterBBoxes.push(it.bb!);
          added = true;
          break;
        }
      }
    }
  }

  const clusterEntries: ObstacleEntry[] = [];
  let cx0 = Infinity, cy0 = Infinity, cx1 = -Infinity, cy1 = -Infinity;

  for (const it of candidateObs) {
    if (!clusterIds.has(it.o.id)) continue;
    const isTarget = targetMetaMap.has(it.o.id);
    const meta = isTarget ? targetMetaMap.get(it.o.id)! : null;
    const ext = meta && !it.o.subs.some((sp: any) => !sp?.closed)
      ? { barrierRings: meta.baseRings, fillRule: meta.fillRule }
      : extractObstacleRings(it.o);
    if (!ext.barrierRings.length) continue;
    const bb = ringsBBox(ext.barrierRings);
    if (bb[0] < cx0) cx0 = bb[0];
    if (bb[1] < cy0) cy0 = bb[1];
    if (bb[2] > cx1) cx1 = bb[2];
    if (bb[3] > cy1) cy1 = bb[3];
    clusterEntries.push({
      id: it.o.id,
      docIdx: it.docIdx,
      isTarget,
      rings: ext.barrierRings,
      fillRule: ext.fillRule,
      bbox: bb
    });
  }

  if (!clusterEntries.length || !isFinite(cx0)) {
    return { doc, changed: false, reason: 'noempty' };
  }

  // 3. Bangun Occupancy Grid & Flood-fill untuk menemukan seluruh ruang kosong tertutup
  const spanW = Math.max(1, cx1 - cx0);
  const spanH = Math.max(1, cy1 - cy0);
  const cell = Math.max(spanW, spanH) / (GRID_MAX_DIM - 10);
  const padWorld = cell * 4;
  const ox = cx0 - padWorld;
  const oy = cy0 - padWorld;
  const gw = Math.min(GRID_MAX_DIM, Math.max(16, Math.ceil((spanW + padWorld * 2) / cell)));
  const gh = Math.min(GRID_MAX_DIM, Math.max(16, Math.ceil((spanH + padWorld * 2) / cell)));

  const { occ, owner, wallMask, wallOwnerR, wallOwnerD } = rasterizeObstaclesToGrid(
    clusterEntries,
    ox,
    oy,
    cell,
    gw,
    gh
  );
  const pockets = discoverEnclosedPockets(
    occ,
    owner,
    wallMask,
    wallOwnerR,
    wallOwnerD,
    clusterEntries,
    ox,
    oy,
    cell,
    gw,
    gh
  );

  // 3b. Fine Local Color-Scan: jika grid global terlalu kasar (cell > 0.2px),
  //     lakukan scanning warna resolusi tinggi di sekitar tepi & lubang kecil target
  //     agar ruang kosong yang sangat kecil tetap terdeteksi.
  const fineResults: { pk: DiscoveredPocket; rings: number[][][]; winTargetId: string }[] = [];
  if (cell > FINE_SCAN_TARGET_CELL) {
    const entryIndexById = new Map<string, number>();
    for (let i = 0; i < clusterEntries.length; i++) {
      entryIndexById.set(clusterEntries[i].id, i);
    }

    const alreadyCoveredByGlobal = (sx: number, sy: number) => {
      for (let i = 0; i < pockets.length; i++) {
        const bb = pockets[i].worldBBox;
        if (sx >= bb[0] - cell && sx <= bb[2] + cell && sy >= bb[1] - cell && sy <= bb[3] + cell) {
          return true;
        }
      }
      for (let i = 0; i < fineResults.length; i++) {
        const bb = fineResults[i].pk.worldBBox;
        if (sx >= bb[0] - 0.5 && sx <= bb[2] + 0.5 && sy >= bb[1] - 0.5 && sy <= bb[3] + 0.5) {
          return true;
        }
      }
      return false;
    };

    const runFineBox = (bx0: number, by0: number, bx1: number, by1: number, fineCell: number) => {
      const fSpanW = Math.max(1, bx1 - bx0);
      const fSpanH = Math.max(1, by1 - by0);
      const fPad = fineCell * 4;
      const fox = bx0 - fPad;
      const foy = by0 - fPad;
      const fgw = Math.min(GRID_MAX_DIM, Math.max(16, Math.ceil((fSpanW + fPad * 2) / fineCell)));
      const fgh = Math.min(GRID_MAX_DIM, Math.max(16, Math.ceil((fSpanH + fPad * 2) / fineCell)));
      const actualCell = Math.max((fSpanW + fPad * 2) / fgw, (fSpanH + fPad * 2) / fgh, fineCell);

      const boxBB: [number, number, number, number] = [fox, foy, fox + fgw * actualCell, foy + fgh * actualCell];
      const localEntries = clusterEntries.filter(e => bboxesTouchOrOverlap(e.bbox, boxBB, actualCell * 2));
      if (!localEntries.some(e => e.isTarget)) return;

      const fGrid = rasterizeObstaclesToGrid(localEntries, fox, foy, actualCell, fgw, fgh);
      const fPockets = discoverEnclosedPockets(
        fGrid.occ,
        fGrid.owner,
        fGrid.wallMask,
        fGrid.wallOwnerR,
        fGrid.wallOwnerD,
        localEntries,
        fox,
        foy,
        actualCell,
        fgw,
        fgh
      );

      for (const pk of fPockets) {
        if (!pk.borderingTargets.size) continue;
        if (alreadyCoveredByGlobal(pk.seedX, pk.seedY)) continue;

        let bestLocalIdx = -1;
        let bestHits = 0;
        let bestDocIdx = Infinity;
        for (const [entryIdx, hits] of pk.borderingTargets.entries()) {
          const entry = localEntries[entryIdx];
          if (!entry) continue;
          if (hits > bestHits || (hits === bestHits && entry.docIdx < bestDocIdx)) {
            bestHits = hits;
            bestLocalIdx = entryIdx;
            bestDocIdx = entry.docIdx;
          }
        }
        const minHits = pk.cells.length <= 6 ? 1 : 2;
        if (bestLocalIdx < 0 || bestHits < minHits) continue;
        const winEntry = localEntries[bestLocalIdx];

        const pocketLocalEntries = localEntries.filter(e =>
          bboxesTouchOrOverlap(e.bbox, pk.worldBBox, Math.max(TOUCH_TOL, actualCell * 3))
        );
        const pocketObsRings: number[][][] = [];
        for (const le of pocketLocalEntries) for (const r of le.rings) pocketObsRings.push(r);

        let pkRings = tryExtractExactVectorPocket(pk, pocketLocalEntries, actualCell);
        if (!pkRings || !pkRings.length) {
          pkRings = extractContourFromPocketMask(pk, fox, foy, actualCell, fgw, pocketObsRings);
        }
        if (pkRings.length) {
          fineResults.push({ pk, rings: pkRings, winTargetId: winEntry.id });
        }
      }
    };

    const segIntersectsBox = (ax: number, ay: number, bx: number, by: number, x0: number, y0: number, x1: number, y1: number) =>
      Math.max(ax, bx) >= x0 && Math.min(ax, bx) <= x1 && Math.max(ay, by) >= y0 && Math.min(ay, by) <= y1;

    const ringHasEdgeInBox = (r: number[][], x0: number, y0: number, x1: number, y1: number) => {
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length];
        if (segIntersectsBox(a[0], a[1], b[0], b[1], x0, y0, x1, y1)) return true;
      }
      return false;
    };

    for (const te of clusterEntries) {
      if (!te.isTarget) continue;

      // a) Scan cepat setiap subpath/lubang kecil milik target
      for (const r of te.rings) {
        const rbb = ringsBBox([r]);
        const rw = rbb[2] - rbb[0];
        const rh = rbb[3] - rbb[1];
        if (Math.max(rw, rh) <= FINE_TILE_WORLD) {
          const pad = Math.max(2, Math.max(rw, rh) * 0.5);
          const fCell = Math.max(0.05, Math.min(FINE_SCAN_TARGET_CELL, Math.max(rw, rh) / 32));
          runFineBox(rbb[0] - pad, rbb[1] - pad, rbb[2] + pad, rbb[3] + pad, fCell);
        }
      }

      // b) Scan ubin batas di sekitar tepi target yang bersinggungan dengan objek lain
      const padT = Math.max(4, cell * 2);
      const tx0 = te.bbox[0] - padT;
      const ty0 = te.bbox[1] - padT;
      const tx1 = te.bbox[2] + padT;
      const ty1 = te.bbox[3] + padT;
      const tW = tx1 - tx0;
      const tH = ty1 - ty0;

      if (tW <= FINE_TILE_WORLD * 1.4 && tH <= FINE_TILE_WORLD * 1.4) {
        runFineBox(tx0, ty0, tx1, ty1, FINE_SCAN_TARGET_CELL);
      } else {
        const neighbors = clusterEntries.filter(
          e => e.id !== te.id && bboxesTouchOrOverlap(e.bbox, te.bbox, padT)
        );
        if (neighbors.length) {
          const step = FINE_TILE_WORLD - 8;
          for (let y = ty0; y < ty1; y += step) {
            const yEnd = Math.min(ty1, y + FINE_TILE_WORLD);
            for (let x = tx0; x < tx1; x += step) {
              const xEnd = Math.min(tx1, x + FINE_TILE_WORLD);
              const targetHasEdge = te.rings.some(r => ringHasEdgeInBox(r, x, y, xEnd, yEnd));
              if (!targetHasEdge) continue;
              const nbrHasEdge = neighbors.some(nb =>
                bboxesTouchOrOverlap(nb.bbox, [x, y, xEnd, yEnd], 2) &&
                nb.rings.some(r => ringHasEdgeInBox(r, x, y, xEnd, yEnd))
              );
              if (!nbrHasEdge) continue;
              runFineBox(x, y, xEnd, yEnd, FINE_SCAN_TARGET_CELL);
            }
          }
        }
      }
    }
  }

  if (!pockets.length && !fineResults.length) {
    return { doc, changed: false, reason: 'noempty' };
  }

  // 4. Tugaskan tiap ruang kosong tertutup hanya ke target yang langsung bersentuhan (skor batas tertinggi)
  const assignedByTarget = new Map<string, { pk: DiscoveredPocket; rings: number[][][] }[]>();
  const targetEntriesById = new Map<string, ObstacleEntry>();
  for (const e of clusterEntries) if (e.isTarget) targetEntriesById.set(e.id, e);

  for (const fr of fineResults) {
    let arr = assignedByTarget.get(fr.winTargetId);
    if (!arr) { arr = []; assignedByTarget.set(fr.winTargetId, arr); }
    arr.push({ pk: fr.pk, rings: fr.rings });
  }

  for (const pk of pockets) {
    if (!pk.borderingTargets.size) continue;
    let bestEntryIdx = -1;
    let bestHits = 0;
    let bestDocIdx = Infinity;

    for (const [entryIdx, hits] of pk.borderingTargets.entries()) {
      const entry = clusterEntries[entryIdx];
      if (!entry) continue;
      if (hits > bestHits || (hits === bestHits && entry.docIdx < bestDocIdx)) {
        bestHits = hits;
        bestEntryIdx = entryIdx;
        bestDocIdx = entry.docIdx;
      }
    }

    // Minimal 2 sel sentuh untuk kantong besar; untuk kantong sangat kecil (<= 6 sel) 1 sel sentuh 4-arah sudah sah
    const minHits = pk.cells.length <= 6 ? 1 : 2;
    if (bestEntryIdx < 0 || bestHits < minHits) continue;
    const winEntry = clusterEntries[bestEntryIdx];

    // Ekstrak pembatas lokal tepat di sekitar bbox kantong ini (bukan seluruh dokumen!)
    const localEntries = clusterEntries.filter(e =>
      bboxesTouchOrOverlap(e.bbox, pk.worldBBox, Math.max(TOUCH_TOL, cell * 3))
    );
    const localObsRings: number[][][] = [];
    for (const le of localEntries) for (const r of le.rings) localObsRings.push(r);

    let pkRings = tryExtractExactVectorPocket(pk, localEntries, cell);
    if (!pkRings || !pkRings.length) {
      pkRings = extractContourFromPocketMask(pk, ox, oy, cell, gw, localObsRings);
    }
    if (!pkRings.length) continue;

    let arr = assignedByTarget.get(winEntry.id);
    if (!arr) { arr = []; assignedByTarget.set(winEntry.id, arr); }
    arr.push({ pk, rings: pkRings });
  }

  if (!assignedByTarget.size) {
    return { doc, changed: false, reason: 'notouch' };
  }

  // 5. Gabungkan kantong terhubung ke dalam objek target terpilih secara aman
  let updatedObjects = 0;
  let filledPockets = 0;
  const resultIds: string[] = [];

  const nextObjects = allObjs.map(o => {
    const wonList = assignedByTarget.get(o.id);
    if (!wonList || !wonList.length) return o;
    const meta = targetMetaMap.get(o.id)!;

    const snapTol = Math.max(TOUCH_TOL, cell * 1.8);
    const snappedList: number[][][] = [];
    let expectedAddedArea = 0;
    for (const item of wonList) {
      const snappedPk = snapPocketBoundaryToTarget(item.rings, meta.baseRings, snapTol);
      for (const r of snappedPk) snappedList.push(r);
      expectedAddedArea += item.pk.worldArea;
    }

    const baseNormalized = normalizeRingOrientations(meta.baseRings);
    const origArea = netRingsArea(baseNormalized);
    const minExpectedTotal = origArea + expectedAddedArea * 0.72;
    let mergedNorm: number[][][] = [];

    // Bersihkan sliver rambut mikroskopis (tebal < 0.05px akibat overlap snap) dari hasil union
    const stripSeamSlivers = (rings: number[][][]): number[][][] =>
      rings.filter((r, ri) => {
        if (ri === 0 && ringArea(r) > 0) return true;
        const a = Math.abs(ringArea(r));
        if (a < MIN_POCKET_AREA * 0.5) return false;
        const bb = ringsBBox([r]);
        const minSide = a / Math.max(1e-6, bb[2] - bb[0], bb[3] - bb[1]);
        return minSide >= 0.05 || a >= MIN_POCKET_AREA;
      });

    // Gabungkan satu per satu: coba koordinat persis terlebih dahulu (nol distorsi sudut), lalu fallback snap bila belum menyatu
    try {
      let cur = baseNormalized;
      let allMergedCleanly = true;
      for (const item of wonList) {
        const curArea = netRingsArea(cur);
        const exactRaw = clipRings(cur, item.rings, 'union');
        const exactNorm = stripSeamSlivers(normalizeRingOrientations(exactRaw));
        if (
          exactNorm.length > 0 &&
          exactNorm.length < cur.length + item.rings.length &&
          netRingsArea(exactNorm) >= curArea + item.pk.worldArea * 0.6
        ) {
          cur = exactNorm;
          continue;
        }
        const snappedPk = snapPocketBoundaryToTarget(item.rings, cur, snapTol);
        const rawNext = clipRings(cur, snappedPk, 'union');
        const nextNorm = stripSeamSlivers(normalizeRingOrientations(rawNext));
        if (nextNorm.length && netRingsArea(nextNorm) >= curArea + item.pk.worldArea * 0.6) {
          cur = nextNorm;
        } else {
          allMergedCleanly = false;
          break;
        }
      }
      if (allMergedCleanly && netRingsArea(cur) >= minExpectedTotal) {
        mergedNorm = cur;
      }
    } catch {
      mergedNorm = [];
    }

    let nextSubs: any[] = [];
    if (mergedNorm.length) {
      nextSubs = ringsToSubs(mergedNorm, REFIT_TOL);
    } else {
      // Fallback tangguh: pertahankan seluruh subpath target + tambah subpath kantong terisi
      const pocketSubs = ringsToSubs(normalizeRingOrientations(snappedList), REFIT_TOL);
      if (pocketSubs.length) {
        nextSubs = meta.promoteFill ? [...ringsToSubs(baseNormalized, REFIT_TOL), ...pocketSubs] : [...o.subs, ...pocketSubs];
      }
    }

    if (!nextSubs.length) return o;

    updatedObjects++;
    filledPockets += wonList.length;
    resultIds.push(o.id);

    if (meta.promoteFill) {
      const hasSGrad = strokeGradOn(o);
      const promotedFill = typeof o.stroke === 'string' && o.stroke !== 'none' && o.stroke !== 'transparent'
        ? o.stroke
        : (hasSGrad && typeof o.strokeGrad?.base === 'string' ? o.strokeGrad.base : '#000000');
      const promotedGrad = hasSGrad ? { ...o.strokeGrad, base: promotedFill } : o.grad || null;
      return {
        ...o,
        fill: promotedFill,
        grad: promotedGrad,
        fillRule: 'nonzero',
        subs: nextSubs
      };
    }

    return {
      ...o,
      fillRule: mergedNorm.length ? (o.fillRule || 'nonzero') : 'nonzero',
      subs: nextSubs
    };
  });

  if (!updatedObjects) {
    return { doc, changed: false, reason: 'empty' };
  }

  return {
    doc: { ...doc, objects: nextObjects },
    changed: true,
    resultIds,
    stats: {
      updatedObjects,
      filledPockets
    }
  };
};

export default { fillEmptySpaceDoc };
