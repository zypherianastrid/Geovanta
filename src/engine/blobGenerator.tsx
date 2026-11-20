/**
 * @file src/engine/blobGenerator.tsx
 * @description Generator blob organik parametrik (Task 2, plan 2026-11-13-new-tools):
 * titik-titik di sekeliling pusat pada radius yang diacak, dihaluskan menjadi
 * kurva tertutup (Catmull-Rom via autoHandles). Seed membuat hasil
 * deterministik: seed sama + parameter sama = blob sama.
 *
 * CATATAN ID: blobNodes() adalah fungsi geometri murni dan TIDAK memberi id
 * pada node (agar dua pemanggilan dengan parameter sama menghasilkan struktur
 * yang identik — lihat tes 'blob deterministik per seed'). Id diberikan saat
 * materialisasi: makeBlob() di VectorEditor.tsx untuk objek baru, regenBlob()
 * di bawah ini untuk regenerasi (mewarisi id node lama per indeks).
 */
import { autoHandles } from './nodeEditingAndHandles.tsx';
import { uid } from './vectorPrimitives.tsx';

/* PRNG deterministik mulberry32 — seed sama = urutan sama. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULT_BLOB_PARAMS = { points: 8, irregularity: 0.35, smoothness: 0.7, seed: 0, rotation: 0, spikiness: 0 };

/* Jepit parameter ke rentang yang diizinkan UI (points 3-48, fraksi 0-1, rotasi 0-360). */
function normalizeBlobParams(p) {
  const q = { ...DEFAULT_BLOB_PARAMS, ...(p || {}) };
  q.points = Math.max(3, Math.min(48, Math.round(Number(q.points) || 8)));
  q.irregularity = Math.max(0, Math.min(1, Number(q.irregularity) || 0));
  q.smoothness = Math.max(0, Math.min(1, Number(q.smoothness) || 0));
  q.seed = Math.floor(Number(q.seed) || 0) >>> 0;
  q.rotation = Math.max(0, Math.min(360, Math.round(Number(q.rotation) || 0)));
  q.spikiness = Math.max(0, Math.min(1, Number(q.spikiness) || 0));
  return q;
}

/*
 * blobNodes(cx, cy, rx, ry, params) -> array node (tanpa id).
 * Titik ke-i pada sudut merata (mulai dari atas, -90 derajat + rotasi), radius
 * diacak KE DALAM saja: r = 1 - rand() * irregularity, dan dimodulasi oleh
 * spikiness (puncak berselang-seling).
 */
function blobNodes(cx, cy, rx, ry, params) {
  const p = normalizeBlobParams(params);
  const rand = seededRandom(p.seed);
  const rotRad = (p.rotation * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < p.points; i++) {
    const ang = (i / p.points) * Math.PI * 2 - Math.PI / 2 + rotRad;
    let r = Math.max(0.05, 1 - rand() * p.irregularity);
    if (p.spikiness > 0) {
      const spikeFactor = i % 2 === 1 ? 1 - p.spikiness * 0.65 : 1;
      r = Math.max(0.05, r * spikeFactor);
    }
    pts.push({
      x: cx + Math.cos(ang) * rx * r,
      y: cy + Math.sin(ang) * ry * r,
      type: 'corner',
      handleIn: null,
      handleOut: null
    });
  }
  const smoothed = autoHandles({ subs: [{ id: 'blob-tmp', closed: true, nodes: pts }] }, null, {
    preserveShape: false,
    tau: p.smoothness * 0.5
  });
  return smoothed.subs[0].nodes;
}

/*
 * regenBlob(obj, newUiParams) -> objek baru (immutable).
 * Meregenerasi subs dari obj.gen (cx/cy/rx/ry dipertahankan atau diperbarui) + parameter UI
 * baru (points/irregularity/smoothness/seed/rotation/spikiness).
 */
function regenBlob(obj, newUiParams) {
  const g = obj.gen || {};
  const p = normalizeBlobParams({ ...g, ...(newUiParams || {}) });
  const cx = newUiParams && newUiParams.cx != null ? Number(newUiParams.cx) : Number(g.cx) || 0,
    cy = newUiParams && newUiParams.cy != null ? Number(newUiParams.cy) : Number(g.cy) || 0,
    rx = newUiParams && newUiParams.rx != null ? Number(newUiParams.rx) : Number(g.rx) || 50,
    ry = newUiParams && newUiParams.ry != null ? Number(newUiParams.ry) : Number(g.ry) || 50;
  const nodes = blobNodes(cx, cy, rx, ry, p);
  const oldNodes = (obj.subs && obj.subs[0] && obj.subs[0].nodes) || [];
  const withIds = nodes.map((n, i) => ({
    ...n,
    id: oldNodes[i] && oldNodes[i].id ? oldNodes[i].id : uid()
  }));
  return {
    ...obj,
    subs: [{ id: obj.subs && obj.subs[0] && obj.subs[0].id ? obj.subs[0].id : uid(), closed: true, nodes: withIds }],
    gen: {
      kind: 'blob',
      points: p.points,
      irregularity: p.irregularity,
      smoothness: p.smoothness,
      seed: p.seed,
      ...(p.rotation || g.rotation !== undefined ? { rotation: p.rotation } : {}),
      ...(p.spikiness || g.spikiness !== undefined ? { spikiness: p.spikiness } : {}),
      cx,
      cy,
      rx,
      ry
    }
  };
}

export { seededRandom, DEFAULT_BLOB_PARAMS, normalizeBlobParams, blobNodes, regenBlob };
export default blobNodes;
