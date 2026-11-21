/**
 * @file src/engine/compoundPathEngine.tsx
 * @description Pure engine functions for compound path management (Make / Release Compound Path).
 * Menggabungkan multi-path menjadi satu compound path dengan fillRule 'evenodd',
 * atau memecah compound path multi-subpath menjadi objek-objek path terpisah.
 */
import { uid } from './vectorPrimitives.tsx';

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
 * Membersihkan dan menjahit objek-objek ikon yang diimpor:
 * 1. Menjahit kuadran/segmen busur terbuka (seperti dot dadu streamline) di dalam objek yang sama menjadi 1 subpath tertutup utuh.
 * 2. Mempertahankan struktur objek, urutan layer, opacity, dan fillRule ('nonzero' vs 'evenodd') asli SVG tanpa menggabungkan atau memecah subpath tertutup secara paksa (agar ikon Material UI / compound path tampil 100% identik dengan aslinya).
 */
export const cleanAndStitchIconObjects = (objects: any[], tol = 0.05) => {
  const result: any[] = [];
  for (const o of (objects || [])) {
    if (!o) continue;
    const rawSubs = Array.isArray(o.subs) ? o.subs : [];
    const hasOpenSub = rawSubs.some((sp: any) => sp && !sp.closed);
    const stitchedSubs = hasOpenSub ? stitchContiguousSubpaths(rawSubs, tol) : rawSubs.map((sp: any) => ({
      ...sp,
      nodes: (sp.nodes || []).map((n: any) => ({ ...n }))
    }));
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

export { makeCompoundPathDoc, releaseCompoundPathDoc };
export default {
  makeCompoundPathDoc,
  releaseCompoundPathDoc,
  isCircleSubpath,
  stitchContiguousSubpaths,
  cleanAndStitchIconObjects
};
