/**
 * @file src/engine/drawTools.tsx
 * @description Helper geometri murni untuk tool gambar drag (plan 2026-11-13-new-tools):
 * Line Segment (Task 4) dan Arc (Task 5).
 *
 * CATATAN ID: fungsi di sini TIDAK memberi id pada node (pola blobNodes):
 * id diberikan saat materialisasi di VectorEditor.tsx, supaya dua pemanggilan
 * dengan parameter sama menghasilkan struktur yang identik.
 */
import { arcToCubics } from './arcToBezier.tsx';
import { uid } from './vectorPrimitives.tsx';

/*
 * visibleStrokeStyle(st, fallback) -> { stroke, sw }.
 * Menjamin stroke TERLIHAT untuk factory tool gambar (Line/Arc/Curvature):
 * bila st.stroke === 'none' atau st.sw === 0 (atau st hilang), pakai
 * fallback yang terlihat; selain itu st diteruskan apa adanya. Satu helper
 * bersama agar ketiga factory tidak menyimpang lagi (final review fix wave).
 */
function visibleStrokeStyle(st, fallback) {
  const fb = fallback || { stroke: '#111827', sw: 2 };
  if (!st || typeof st !== 'object') return { stroke: fb.stroke, sw: fb.sw };
  if (st.stroke === 'none' || !(st.sw > 0)) return { stroke: fb.stroke, sw: fb.sw };
  return { stroke: st.stroke, sw: st.sw };
}

/* Garis lurus 2 node: start -> end.
   opts.constrain45: bulatkan sudut ke kelipatan 45 derajat terdekat, panjang
     dipertahankan. opts.fromCenter: cerminkan titik akhir terhadap titik awal
     (garis berpusat di titik awal, memanjang dua arah). */
function lineSegmentNodes(start, end, opts: Record<string, any> = {}) {
  let x0 = start.x,
    y0 = start.y,
    x1 = end.x,
    y1 = end.y;
  if (opts.constrain45) {
    const dx = x1 - x0,
      dy = y1 - y0,
      len = Math.hypot(dx, dy),
      ang = Math.atan2(dy, dx),
      snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    x1 = x0 + len * Math.cos(snap);
    y1 = y0 + len * Math.sin(snap);
  }
  if (opts.fromCenter) {
    x0 = start.x - (x1 - start.x);
    y0 = start.y - (y1 - start.y);
  }
  const node = (x, y) => ({ x, y, type: 'corner', handleIn: null, handleOut: null });
  return [node(x0, y0), node(x1, y1)];
}

/* ---------- Arc (Task 5) ---------- */
const DEFAULT_ARC_PARAMS = { r: 50, startDeg: 0, sweepDeg: 90 };

/* Jepit parameter ke rentang yang diizinkan UI (radius 1-500, sudut 0-360). */
function normalizeArcParams(p) {
  const q = { ...DEFAULT_ARC_PARAMS, ...(p || {}) };
  const rn = Number(q.r), sn = Number(q.startDeg), wn = Number(q.sweepDeg);
  q.r = Number.isFinite(rn) ? Math.max(1, Math.min(500, rn)) : 50;
  q.startDeg = Number.isFinite(sn) ? ((sn % 360) + 360) % 360 : 0;
  q.sweepDeg = Number.isFinite(wn) ? Math.max(0, Math.min(360, wn)) : 90;
  return q;
}

/* Busur lingkaran -> node Bézier kubik (tanpa id, pola blobNodes).
   Sudut 0° = arah jam 3 (timur); sweep positif = searah jarum jam di layar
   (y ke bawah, konsisten dengan atan2 layar). Tiap segmen kubik ≤ 90°
   (arcToCubics sudah membelah begitu); sambungan antar-segmen bertipe
   'symmetric' (handle segaris + sama panjang — sama seperti klasifikasi
   svgPathParser untuk geometri yang sama), ujung 'corner' ber-handle
   tunggal. Sweep 0 -> 1 node di titik awal (tanpa crash); sweep 360 ->
   titik akhir = titik awal (dua belahan 180°, karena arcToCubics menolak
   start == end). */
function arcNodes(cx, cy, r, startDeg, sweepDeg) {
  const rad = d => d * Math.PI / 180;
  const rr = Math.max(0, Number(r) || 0);
  const sx = cx + rr * Math.cos(rad(startDeg)), sy = cy + rr * Math.sin(rad(startDeg));
  const single = { x: sx, y: sy, type: 'corner', handleIn: null, handleOut: null };
  const sw = Math.max(0, Math.min(360, Number(sweepDeg) || 0));
  if (!rr || sw === 0) return [single];
  const ex = cx + rr * Math.cos(rad(startDeg + sw)), ey = cy + rr * Math.sin(rad(startDeg + sw));
  const segs = [];
  if (sw >= 360) {
    const mx = cx + rr * Math.cos(rad(startDeg + 180)), my = cy + rr * Math.sin(rad(startDeg + 180));
    const h1 = arcToCubics(sx, sy, rr, rr, 0, 0, 1, mx, my);
    const h2 = arcToCubics(mx, my, rr, rr, 0, 1, 1, ex, ey);
    if (h1) segs.push(...h1);
    if (h2) segs.push(...h2);
  } else {
    const s = arcToCubics(sx, sy, rr, rr, 0, sw > 180 ? 1 : 0, 1, ex, ey);
    if (s) segs.push(...s);
  }
  if (!segs.length) return [single];
  const nodes = [{ x: sx, y: sy, type: 'corner', handleIn: null, handleOut: { x: segs[0][0], y: segs[0][1] } }];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i], isLast = i === segs.length - 1;
    nodes.push({
      x: s[4], y: s[5],
      type: isLast ? 'corner' : 'symmetric',
      handleIn: { x: s[2], y: s[3] },
      handleOut: isLast ? null : { x: segs[i + 1][0], y: segs[i + 1][1] }
    });
  }
  return nodes;
}

/*
 * regenArc(obj, newUiParams) -> objek baru (immutable).
 * Meregenerasi subs dari obj.gen (cx/cy dipertahankan) + parameter UI baru
 * (r/startDeg/sweepDeg). Id objek, nama, fill, stroke, dan id node per
 * indeks dipertahankan (seleksi tidak putus); node tambahan (sweep naik)
 * mendapat id baru. Metadata gen diperbarui ke parameter baru.
 * (Pola regenBlob; commitObjs bisa dipakai — 1 objek tetap 1 objek, hanya
 * jumlah node di dalamnya yang berubah.)
 */
function regenArc(obj, newUiParams) {
  const g = obj.gen || {};
  const p = normalizeArcParams({ ...g, ...(newUiParams || {}) });
  const cx = Number(g.cx) || 0, cy = Number(g.cy) || 0;
  const nodes = arcNodes(cx, cy, p.r, p.startDeg, p.sweepDeg);
  const oldNodes = (obj.subs && obj.subs[0] && obj.subs[0].nodes) || [];
  const withIds = nodes.map((n, i) => ({
    ...n,
    id: oldNodes[i] && oldNodes[i].id ? oldNodes[i].id : uid()
  }));
  return {
    ...obj,
    subs: [{ id: obj.subs && obj.subs[0] && obj.subs[0].id ? obj.subs[0].id : uid(), closed: false, nodes: withIds }],
    gen: { kind: 'arc', cx, cy, r: p.r, startDeg: p.startDeg, sweepDeg: p.sweepDeg }
  };
}

export { lineSegmentNodes, arcNodes, DEFAULT_ARC_PARAMS, normalizeArcParams, regenArc, visibleStrokeStyle };
