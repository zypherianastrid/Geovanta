/**
 * @file src/engine/compoundPathEngine.tsx
 * @description Pure engine functions for compound path management (Make / Release Compound Path).
 * Menggabungkan multi-path menjadi satu compound path dengan fillRule 'evenodd',
 * atau memecah compound path multi-subpath menjadi objek-objek path terpisah.
 */
import { uid } from './vectorPrimitives.tsx';
import {
  flattenObjToRings,
  ringArea,
  ringContainsPt,
  segSegIntersect,
  clipRings,
  ringsToSubs
} from './pathBoolean.tsx';

/**
 * Gabungkan dua atau lebih objek path menjadi satu compound path.
 * Mewarisi styling visual dari objek teratas (topObj) dengan fillRule: 'evenodd'.
 *
 * @param {object} doc Dokumen vektor
 * @param {Set<string>} selIds Set ID objek terpilih
 * @returns {object} Hasil operasi { doc, changed, resultId, resultIds, stats, reason }
 */
const makeCompoundPathDoc = (doc, selIds) => {
  const targets = (doc?.objects || []).filter(
    o => selIds && selIds.has(o.id) && !o.hidden && !o.locked && !o.img && !o.text && o.subs && o.subs.length
  );
  if (targets.length < 2) return { doc, changed: false, reason: 'need2' };

  const topObj = targets[targets.length - 1];
  const subs = targets.flatMap(o =>
    (o.subs || []).map(sp => ({
      ...sp,
      id: uid(),
      nodes: (sp.nodes || []).map(n => ({ ...n, id: uid() }))
    }))
  );

  const names = new Set((doc.objects || []).map(o => o.name));
  let k = 1;
  while (names.has('Compound-' + k)) k++;
  const name = 'Compound-' + k;

  const merged = {
    id: uid(),
    name,
    type: 'path',
    fill: topObj.fill !== undefined ? topObj.fill : '#000000',
    stroke: topObj.stroke !== undefined ? topObj.stroke : 'none',
    strokeWidth: topObj.strokeWidth !== undefined ? topObj.strokeWidth : 0,
    strokeLinecap: topObj.strokeLinecap,
    strokeLinejoin: topObj.strokeLinejoin,
    strokeMiterlimit: topObj.strokeMiterlimit,
    strokeDasharray: topObj.strokeDasharray,
    strokeDashoffset: topObj.strokeDashoffset,
    strokeAlign: topObj.strokeAlign,
    blendMode: topObj.blendMode,
    opacity: topObj.opacity !== undefined ? topObj.opacity : 1,
    fillRule: 'evenodd',
    group: topObj.group || null,
    subs
  };

  const targetIds = new Set(targets.map(o => o.id));
  const newObjects = [];
  let inserted = false;
  for (const o of (doc.objects || [])) {
    if (o.id === topObj.id) {
      newObjects.push(merged);
      inserted = true;
    } else if (!targetIds.has(o.id)) {
      newObjects.push(o);
    }
  }
  if (!inserted) {
    newObjects.push(merged);
  }

  return {
    doc: { ...doc, objects: newObjects },
    changed: true,
    resultId: merged.id,
    resultIds: [merged.id],
    stats: {
      inObjects: targets.length,
      outSubs: subs.length
    }
  };
};

/**
 * Pecah objek-objek compound path (yang memiliki subs.length > 1) menjadi
 * objek-objek mandiri terpisah (satu subpath per objek).
 *
 * @param {object} doc Dokumen vektor
 * @param {Set<string>} selIds Set ID objek terpilih
 * @returns {object} Hasil operasi { doc, changed, resultIds, resultId, stats, reason }
 */
const releaseCompoundPathDoc = (doc, selIds) => {
  const targets = (doc?.objects || []).filter(
    o => selIds && selIds.has(o.id) && !o.hidden && !o.locked && !o.img && !o.text && o.subs && o.subs.length > 1
  );
  if (targets.length === 0) return { doc, changed: false, reason: 'nocmp' };

  const targetMap = new Map();
  const allNewObjs = [];

  for (const o of targets) {
    const { id: _id, subs: _subs, name: origName, ...rest } = o;
    const splitObjs = (o.subs || []).map((sub, idx) => ({
      ...rest,
      id: uid(),
      name: `${origName || 'Path'}-${idx + 1}`,
      type: 'path',
      fill: o.fill,
      stroke: o.stroke,
      strokeWidth: o.strokeWidth,
      strokeLinecap: o.strokeLinecap,
      strokeLinejoin: o.strokeLinejoin,
      strokeMiterlimit: o.strokeMiterlimit,
      strokeDasharray: o.strokeDasharray,
      strokeDashoffset: o.strokeDashoffset,
      strokeAlign: o.strokeAlign,
      blendMode: o.blendMode,
      opacity: o.opacity,
      fillRule: o.fillRule || 'nonzero',
      group: o.group || null,
      subs: [{
        ...sub,
        id: uid(),
        nodes: (sub.nodes || []).map(n => ({ ...n, id: uid() }))
      }]
    }));
    targetMap.set(o.id, splitObjs);
    allNewObjs.push(...splitObjs);
  }

  const newObjects = [];
  for (const o of (doc.objects || [])) {
    if (targetMap.has(o.id)) {
      newObjects.push(...targetMap.get(o.id));
    } else {
      newObjects.push(o);
    }
  }

  const resultIds = allNewObjs.map(o => o.id);
  return {
    doc: { ...doc, objects: newObjects },
    changed: true,
    resultIds,
    resultId: resultIds[0],
    stats: {
      inObjects: targets.length,
      outObjects: allNewObjs.length
    }
  };
};

/**
 * Heuristik deteksi apakah subpath tertutup merupakan lingkaran (mis. titik dadu, radio, ikon).
 * Memeriksa keseragaman jarak 4 kuadran dari pusat dan rasio aspek 1:1.
 */
export const isCircleSubpath = (sp: any, tol = 0.08) => {
  if (!sp || !sp.closed || !Array.isArray(sp.nodes)) return false;
  const nodes = sp.nodes;
  if (nodes.length !== 5 && nodes.length !== 4) return false;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 0.001 || h < 0.001) return false;
  const aspect = w / h;
  if (aspect < 0.9 || aspect > 1.1) return false;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const r = (w + h) / 4;
  for (let i = 0; i < 4; i++) {
    const d = Math.hypot(nodes[i].x - cx, nodes[i].y - cy);
    if (Math.abs(d - r) / r > tol) return false;
  }
  return true;
};

/**
 * Gabungkan subpath-subpath terbuka yang ujungnya bersentuhan (kontigu)
 * menjadi satu subpath utuh (tertutup bila ujung awal bertemu ujung akhir).
 */
export const stitchContiguousSubpaths = (subpaths: any[], tol = 0.05) => {
  const pool: any[] = (subpaths || []).map(sp => ({
    closed: Boolean(sp.closed),
    nodes: (sp.nodes || []).map((n: any) => ({ ...n })),
    id: sp.id
  }));

  const merged: any[] = [];
  while (pool.length > 0) {
    let cur = pool.shift();
    if (cur.closed || cur.nodes.length < 2) {
      merged.push(cur);
      continue;
    }

    let extended = true;
    while (extended && !cur.closed) {
      extended = false;
      const endNode = cur.nodes[cur.nodes.length - 1];
      const startNode = cur.nodes[0];

      if (Math.hypot(endNode.x - startNode.x, endNode.y - startNode.y) <= tol) {
        cur.closed = true;
        break;
      }

      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[i];
        if (candidate.closed || candidate.nodes.length < 2) continue;
        const candStart = candidate.nodes[0];
        const candEnd = candidate.nodes[candidate.nodes.length - 1];

        if (Math.hypot(endNode.x - candStart.x, endNode.y - candStart.y) <= tol) {
          if (endNode.handleOut || candStart.handleOut) {
            endNode.handleOut = endNode.handleOut || candStart.handleOut;
          }
          cur.nodes.push(...candidate.nodes.slice(1));
          pool.splice(i, 1);
          extended = true;
          break;
        } else if (Math.hypot(candEnd.x - startNode.x, candEnd.y - startNode.y) <= tol) {
          if (candEnd.handleOut || startNode.handleOut) {
            candEnd.handleOut = candEnd.handleOut || startNode.handleOut;
          }
          cur.nodes.unshift(...candidate.nodes.slice(0, -1));
          pool.splice(i, 1);
          extended = true;
          break;
        }
      }

      const newEnd = cur.nodes[cur.nodes.length - 1];
      const newStart = cur.nodes[0];
      if (Math.hypot(newEnd.x - newStart.x, newEnd.y - newStart.y) <= tol) {
        cur.closed = true;
        break;
      }
    }
    merged.push(cur);
  }
  return merged;
};

/**
 * Uji apakah dua ring poligon tertutup memiliki perpotongan sisi secara nyata (bukan bersarang murni atau terpisah).
 */
const ringsCrossEachOther = (r1: number[][], r2: number[][]) => {
  if (!r1 || !r2 || r1.length < 3 || r2.length < 3) return false;
  let min1X = Infinity, min1Y = Infinity, max1X = -Infinity, max1Y = -Infinity;
  for (const p of r1) {
    if (p[0] < min1X) min1X = p[0];
    if (p[0] > max1X) max1X = p[0];
    if (p[1] < min1Y) min1Y = p[1];
    if (p[1] > max1Y) max1Y = p[1];
  }
  let min2X = Infinity, min2Y = Infinity, max2X = -Infinity, max2Y = -Infinity;
  for (const p of r2) {
    if (p[0] < min2X) min2X = p[0];
    if (p[0] > max2X) max2X = p[0];
    if (p[1] < min2Y) min2Y = p[1];
    if (p[1] > max2Y) max2Y = p[1];
  }
  if (max1X < min2X - 1e-6 || max2X < min1X - 1e-6 || max1Y < min2Y - 1e-6 || max2Y < min1Y - 1e-6) {
    return false;
  }
  const n1 = r1.length;
  const n2 = r2.length;
  for (let i = 0; i < n1; i++) {
    const a = r1[i], b = r1[(i + 1) % n1];
    for (let j = 0; j < n2; j++) {
      const c = r2[j], d = r2[(j + 1) % n2];
      const hit = segSegIntersect(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
      if (hit && (hit.kind === 'cross' || hit.kind === 'overlap')) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Gabungkan (Boolean Union) hanya subpath-subpath tertutup berarah winding SAMA yang saling berpotongan
 * di dalam satu objek path (mis. garis silang ikon "off" yang menabrak badan mikrofon di Material Symbols),
 * sehingga node-node yang tertanam di tengah badan ikon hilang bersih tanpa mengubah subpath terpisah atau lubang (hole).
 */
export const mergeOverlappingSubpathsInObject = (subpaths: any[], fillRule = 'nonzero', tol = 0.05) => {
  if (!Array.isArray(subpaths) || subpaths.length < 2 || fillRule === 'evenodd') {
    return subpaths;
  }
  // Flatten masing-masing subpath untuk memeriksa orientasi winding & perpotongan sisi
  const items = subpaths.map((sp, idx) => {
    if (!sp || !sp.closed || !Array.isArray(sp.nodes) || sp.nodes.length < 2) {
      return { sp, ring: null, area: 0, idx };
    }
    const { rings } = flattenObjToRings({ subs: [sp] }, 0.05);
    const ring = rings[0] || null;
    const area = ring ? ringArea(ring) : 0;
    return { sp, ring, area, idx };
  });

  // Cari pasangan subpath dengan tanda luas (orientasi winding) SAMA yang saling berpotongan sisi secara nyata.
  // Jangan gabungkan subpath konsentris murni yang tidak bersentuhan (seperti pulau di dalam lubang / bullseye).
  const n = items.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  let hasOverlap = false;

  for (let i = 0; i < n; i++) {
    const A = items[i];
    if (!A.ring || Math.abs(A.area) < 1e-6) continue;
    for (let j = i + 1; j < n; j++) {
      const B = items[j];
      if (!B.ring || Math.abs(B.area) < 1e-6) continue;
      // Hanya gabungkan subpath dengan arah winding yang SAMA (sama-sama solid / sama-sama hole)
      if ((A.area > 0) !== (B.area > 0)) continue;
      if (ringsCrossEachOther(A.ring, B.ring)) {
        adj[i].push(j);
        adj[j].push(i);
        hasOverlap = true;
      }
    }
  }

  if (!hasOverlap) return subpaths;

  const visited = new Array(n).fill(false);
  const outSubs: any[] = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    if (adj[i].length === 0) {
      // Subpath ini tidak bertumpukan dengan subpath ber-winding sama lainnya: pertahankan kurva Bézier aslinya 100%!
      outSubs.push(items[i].sp);
      continue;
    }
    // Kumpulkan komponen terhubung subpath yang saling bertumpukan
    const comp = [i];
    const queue = [i];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nxt of adj[cur]) {
        if (!visited[nxt]) {
          visited[nxt] = true;
          comp.push(nxt);
          queue.push(nxt);
        }
      }
    }

    // Lakukan Boolean Union dengan presisi tinggi (di ruang ikon 24x24 gunakan skala sementara x16 agar fitting kurva akurat)
    const SCALE = 16;
    const scaleRing = (r: number[][], k: number) => r.map(p => [p[0] * k, p[1] * k]);
    let unionRings = scaleRing(items[comp[0]].ring!, SCALE);
    // Pastikan orientasi positif selama union
    if (ringArea(unionRings) < 0) unionRings = unionRings.slice().reverse();
    let wrappedRings = [unionRings];

    for (let k = 1; k < comp.length; k++) {
      let nextR = scaleRing(items[comp[k]].ring!, SCALE);
      if (ringArea(nextR) < 0) nextR = nextR.slice().reverse();
      wrappedRings = clipRings(wrappedRings, [nextR], 'union');
    }

    const origSign = items[comp[0]].area >= 0 ? 1 : -1;
    const fittedSubs = ringsToSubs(wrappedRings, 0.35);
    if (fittedSubs.length > 0) {
      for (const fsp of fittedSubs) {
        const unscaledNodes = (fsp.nodes || []).map((nd: any) => ({
          ...nd,
          x: nd.x / SCALE,
          y: nd.y / SCALE,
          handleIn: nd.handleIn ? { x: nd.handleIn.x / SCALE, y: nd.handleIn.y / SCALE } : null,
          handleOut: nd.handleOut ? { x: nd.handleOut.x / SCALE, y: nd.handleOut.y / SCALE } : null,
        }));
        // Pertahankan tanda winding asli supaya tetap cocok dengan lubang nonzero lainnya
        const testRing = unscaledNodes.map((nd: any) => [nd.x, nd.y]);
        const curSign = ringArea(testRing) >= 0 ? 1 : -1;
        if (curSign !== origSign) {
          unscaledNodes.reverse();
          for (const nd of unscaledNodes) {
            const tmp = nd.handleIn;
            nd.handleIn = nd.handleOut;
            nd.handleOut = tmp;
          }
        }
        outSubs.push({
          ...fsp,
          id: uid(),
          closed: true,
          nodes: unscaledNodes
        });
      }
    } else {
      for (const idx of comp) outSubs.push(items[idx].sp);
    }
  }

  return outSubs;
};

/**
 * Membersihkan dan menjahit objek-objek ikon yang diimpor:
 * 1. Menjahit kuadran/segmen busur terbuka (seperti dot dadu streamline) di dalam objek yang sama menjadi 1 subpath tertutup utuh.
 * 2. Melebur (Boolean Union) subpath yang saling menumpuk/berpotongan dengan arah winding sama agar tidak ada node aneh yang tertinggal di tengah badan ikon.
 * 3. Mempertahankan struktur objek, urutan layer, opacity, dan fillRule ('nonzero' vs 'evenodd') asli SVG untuk subpath terpisah & lubang.
 */
export const cleanAndStitchIconObjects = (objects: any[], tol = 0.05) => {
  const result: any[] = [];
  for (const o of (objects || [])) {
    if (!o) continue;
    const rawSubs = Array.isArray(o.subs) ? o.subs : [];
    const hasOpenSub = rawSubs.some((sp: any) => sp && !sp.closed);
    let stitchedSubs = hasOpenSub ? stitchContiguousSubpaths(rawSubs, tol) : rawSubs.map((sp: any) => ({
      ...sp,
      nodes: (sp.nodes || []).map((n: any) => ({ ...n }))
    }));
    if (stitchedSubs.length > 1) {
      stitchedSubs = mergeOverlappingSubpathsInObject(stitchedSubs, o.fillRule || 'nonzero', tol);
    }
    const isCircle = stitchedSubs.length === 1 && isCircleSubpath(stitchedSubs[0], tol);
    const baseName = isCircle && (!o.name || /^path-\d+$/.test(o.name)) ? 'Lingkaran' : (o.name || 'path');
    result.push({
      ...o,
      id: o.id || uid(),
      name: baseName,
      subs: stitchedSubs,
      fillRule: o.fillRule || 'nonzero',
      isCircle
    });
  }
  return result;
};

/**
 * Pisahkan (Separate) objek ikon / compound path yang memiliki beberapa bagian (island) terpisah
 * menjadi objek-objek path mandiri, sambil tetap menyatukan lubang (inner hole) dengan kontur induknya (outer island).
 */
export const separateIconObjectsDoc = (doc: any, selIds: Set<string>) => {
  const allObjs = doc?.objects || [];
  // Jika pengguna memilih frame ikon (termasuk latar frame), kumpulkan seluruh objek path di dalam seleksi / grup ikon tersebut
  const selectedObjs = allObjs.filter((o: any) => selIds && selIds.has(o.id) && !o.hidden && !o.locked);
  const selectedIconGroups = new Set(
    selectedObjs
      .filter((o: any) => o.group && (o.isIconFrame || o.icon))
      .map((o: any) => o.group)
  );

  const targets = allObjs.filter((o: any) => {
    if (o.hidden || o.locked || o.img || o.text || o.isFrameBg || o.isAutoFrame) return false;
    if (!Array.isArray(o.subs) || o.subs.length <= 1) return false;
    return (selIds && selIds.has(o.id)) || (o.group && selectedIconGroups.has(o.group));
  });

  if (targets.length === 0) {
    return { doc, changed: false, reason: 'nosubs' };
  }

  const targetMap = new Map<string, any[]>();
  const allNewObjs: any[] = [];
  let totalIn = 0;

  for (const o of targets) {
    const subs = o.subs || [];
    // Hitung ring & luas tiap subpath untuk mendeteksi hierarki pulau (outer island) vs lubang (hole)
    const subInfos = subs.map((sp: any, idx: number) => {
      if (!sp || !sp.closed || !Array.isArray(sp.nodes) || sp.nodes.length < 2) {
        return { sp, ring: null, absArea: 0, idx, parentIdx: -1, depth: 0 };
      }
      const { rings } = flattenObjToRings({ subs: [sp] }, 0.15);
      const ring = rings[0] || sp.nodes.map((n: any) => [n.x, n.y]);
      const absArea = ring && ring.length >= 3 ? Math.abs(ringArea(ring)) : 0;
      return { sp, ring, absArea, idx, parentIdx: -1, depth: 0 };
    });

    // Untuk setiap subpath tertutup, cari kontur terkecil yang memuatnya (parent)
    for (let i = 0; i < subInfos.length; i++) {
      const A = subInfos[i];
      if (!A.ring || A.ring.length < 3) continue;
      const samplePt = A.ring[0];
      let bestParent = -1;
      let bestParentArea = Infinity;
      let depth = 0;
      for (let j = 0; j < subInfos.length; j++) {
        if (i === j) continue;
        const B = subInfos[j];
        if (!B.ring || B.ring.length < 3 || B.absArea <= A.absArea) continue;
        if (ringContainsPt(samplePt[0], samplePt[1], B.ring)) {
          depth++;
          if (B.absArea < bestParentArea) {
            bestParentArea = B.absArea;
            bestParent = j;
          }
        }
      }
      A.depth = depth;
      A.parentIdx = bestParent;
    }

    // Subpath dengan depth genap (0, 2, ...) adalah pulau utama (outer root);
    // Subpath dengan depth ganjil (1, 3, ...) adalah lubang (hole) milik parent terdekatnya yang ber-depth genap.
    const findIslandRoot = (idx: number): number => {
      const info = subInfos[idx];
      if (!info) return idx;
      if (info.depth % 2 === 1 && info.parentIdx >= 0) {
        return info.parentIdx;
      }
      return idx;
    };

    const islandMap = new Map<number, any[]>();
    for (let i = 0; i < subInfos.length; i++) {
      const rootIdx = findIslandRoot(i);
      if (!islandMap.has(rootIdx)) islandMap.set(rootIdx, []);
      islandMap.get(rootIdx)!.push(subInfos[i].sp);
    }

    const islands = Array.from(islandMap.values());
    if (islands.length <= 1) continue;

    totalIn++;
    const { id: _id, subs: _subs, name: origName, ...rest } = o;
    const splitObjs = islands.map((islandSubs, idx) => {
      const isCircle = islandSubs.length === 1 && isCircleSubpath(islandSubs[0], 0.08);
      return {
        ...rest,
        id: uid(),
        name: `${origName || 'Path'}-${idx + 1}`,
        type: 'path',
        fill: o.fill,
        stroke: o.stroke,
        strokeWidth: o.strokeWidth,
        strokeLinecap: o.strokeLinecap,
        strokeLinejoin: o.strokeLinejoin,
        strokeMiterlimit: o.strokeMiterlimit,
        strokeDasharray: o.strokeDasharray,
        strokeDashoffset: o.strokeDashoffset,
        strokeAlign: o.strokeAlign,
        blendMode: o.blendMode,
        opacity: o.opacity,
        fillRule: islandSubs.length > 1 ? 'evenodd' : (o.fillRule || 'nonzero'),
        group: o.group || null,
        isCircle,
        subs: islandSubs.map((sp: any) => ({
          ...sp,
          id: uid(),
          nodes: (sp.nodes || []).map((n: any) => ({ ...n, id: uid() }))
        }))
      };
    });

    targetMap.set(o.id, splitObjs);
    allNewObjs.push(...splitObjs);
  }

  if (targetMap.size === 0) {
    return { doc, changed: false, reason: 'singleisland' };
  }

  const newObjects: any[] = [];
  for (const o of allObjs) {
    if (targetMap.has(o.id)) {
      newObjects.push(...targetMap.get(o.id)!);
    } else {
      newObjects.push(o);
    }
  }

  const resultIds = allNewObjs.map(o => o.id);
  return {
    doc: { ...doc, objects: newObjects },
    changed: true,
    resultIds,
    resultId: resultIds[0],
    stats: {
      inObjects: totalIn,
      outObjects: allNewObjs.length
    }
  };
};

export { makeCompoundPathDoc, releaseCompoundPathDoc };
export default {
  makeCompoundPathDoc,
  releaseCompoundPathDoc,
  isCircleSubpath,
  stitchContiguousSubpaths,
  mergeOverlappingSubpathsInObject,
  cleanAndStitchIconObjects,
  separateIconObjectsDoc
};
