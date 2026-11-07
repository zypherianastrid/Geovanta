/**
 * @file src/renderer/adaptiveCubicFlattener.jsx
 * @description Algoritma flattening adaptif kurva Bézier kubik ke polilin dengan toleransi subpiksel
 */
import { RENDER_CONFIG } from '../utils/renderConfigAndTelemetry.jsx';

/* =========================================================================
   2.1. ADAPTIVE BÉZIER FLATTENING (DE CASTELJAU + CHORD CONTROL-POINT DISTANCE)
   - Target geometric error: 0.25 CSS pixel (RENDER_CONFIG.targetPixelError)
   - Maksimum recursion depth: 16 (RENDER_CONFIG.maxBezierDepth, pengaman bukan target)
   - Minimum segment length: 0.01 CSS pixel (berhenti lebih awal untuk segmen mikro)
   - Kriteria flatness: jarak tegak lurus kedua control point terhadap garis chord
     + validasi overshoot longitudinal & deviasi titik tengah untuk kurva S / cusp / loop.
   - Anggaran vertex adaptif + pelaporan metadata tessellation lengkap.
   ========================================================================= */
function flattenCubicAdaptive(a, b, tolSq, outPts, depth = 0, minSegLenSq = 0, stats = null) {
  const vertexLimit = stats && stats.vertexLimit ? stats.vertexLimit : RENDER_CONFIG.vertexBudgetPerObject || 65536;
  const segVertexLimit = stats && stats.segVertexLimit ? Math.min(vertexLimit, stats.segVertexLimit) : vertexLimit;
  const currentTotalVerts = () => stats ? stats.vertexCount : outPts.length >> 1;
  if (!a.handleOut && !b.handleIn) {
    outPts.push(b.x, b.y);
    if (stats) {
      stats.vertexCount++;
      stats.segmentCount++;
    }
    return;
  }
  /* Jika anggaran vertex sudah tercapai, TETAP dorong titik ujung (b.x, b.y) agar poligon/subpath tidak pernah terpotong atau hilang saat zoom tinggi! */
  if (currentTotalVerts() >= segVertexLimit) {
    outPts.push(b.x, b.y);
    if (stats) {
      stats.budgetHit = true;
      stats.toleranceMet = false;
      stats.vertexCount++;
      stats.segmentCount++;
    }
    return;
  }
  const p0x = a.x,
    p0y = a.y;
  const p1x = a.handleOut ? a.handleOut.x : a.x,
    p1y = a.handleOut ? a.handleOut.y : a.y;
  const p2x = b.handleIn ? b.handleIn.x : b.x,
    p2y = b.handleIn ? b.handleIn.y : b.y;
  const p3x = b.x,
    p3y = b.y;
  const cfgMaxDepth = Math.max(4, Math.min(24, RENDER_CONFIG.maxBezierDepth || 16));
  const maxDepth = stats && stats.segMaxDepth != null ? Math.min(cfgMaxDepth, stats.segMaxDepth) : cfgMaxDepth;

  /* Jarak kuadrat titik (px, py) terhadap segmen/garis chord (x0, y0) -> (x3, y3) */
  const pointToChordDistSq = (px, py, x0, y0, dx, dy, chordLenSq) => {
    const vx = px - x0,
      vy = py - y0;
    if (chordLenSq <= 1e-12) return vx * vx + vy * vy;
    const crossVal = vx * dy - vy * dx;
    const perpSq = crossVal * crossVal / chordLenSq;
    /* Periksa juga proyeksi longitudinal untuk mendeteksi cusp tajam / loop balik */
    const dotVal = vx * dx + vy * dy;
    if (dotVal < 0) return vx * vx + vy * vy;
    if (dotVal > chordLenSq) {
      const ex = px - (x0 + dx),
        ey = py - (y0 + dy);
      return ex * ex + ey * ey;
    }
    return perpSq;
  };
  const rec = (x0, y0, x1, y1, x2, y2, x3, y3, d) => {
    if (stats && d > stats.maxDepthReached) stats.maxDepthReached = d;

    /* 1. GV-A05 + High-Zoom Guard: Jika anggaran vertex segmen/objek habis di tengah rekursi,
       SELALU pancarkan titik akhir cabang (x3, y3) agar kontur subpath tetap utuh dan tidak pernah hilang! */
    if (currentTotalVerts() + 1 >= segVertexLimit) {
      if (stats) {
        stats.budgetHit = true;
        stats.toleranceMet = false;
        stats.vertexCount++;
        stats.segmentCount++;
      }
      outPts.push(x3, y3);
      return;
    }
    const dx = x3 - x0,
      dy = y3 - y0;
    const chordLenSq = dx * dx + dy * dy;

    /* 2. Minimum segment length check (0.01 CSS pixel): berhenti lebih awal jika panjang kurva mikro */
    if (minSegLenSq > 0 && chordLenSq <= minSegLenSq) {
      const hullSq = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0) + (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) + (x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2);
      if (hullSq <= 4 * minSegLenSq) {
        outPts.push(x3, y3);
        if (stats) {
          stats.vertexCount++;
          stats.segmentCount++;
        }
        return;
      }
    }

    /* 3. De Casteljau Subdivision Midpoints */
    const x01 = (x0 + x1) * 0.5,
      y01 = (y0 + y1) * 0.5;
    const x12 = (x1 + x2) * 0.5,
      y12 = (y1 + y2) * 0.5;
    const x23 = (x2 + x3) * 0.5,
      y23 = (y2 + y3) * 0.5;
    const x012 = (x01 + x12) * 0.5,
      y012 = (y01 + y12) * 0.5;
    const x123 = (x12 + x23) * 0.5,
      y123 = (y12 + y23) * 0.5;
    const x0123 = (x012 + x123) * 0.5,
      y0123 = (y012 + y123) * 0.5;

    /* 4. Flatness test: jarak kedua control point terhadap garis chord + titik puncak De Casteljau */
    if (d < maxDepth) {
      const d1Sq = pointToChordDistSq(x1, y1, x0, y0, dx, dy, chordLenSq);
      const d2Sq = pointToChordDistSq(x2, y2, x0, y0, dx, dy, chordLenSq);
      const dmSq = pointToChordDistSq(x0123, y0123, x0, y0, dx, dy, chordLenSq);
      /* Batas ketat Hausdorff kurva kubik terhadap chord adalah <= 3/4 max(d1, d2),
         kita uji max(9/16 * max(d1Sq, d2Sq), dmSq) <= tolSq */
      const errSq = Math.max(0.5625 * Math.max(d1Sq, d2Sq), dmSq);
      if (errSq <= tolSq) {
        outPts.push(x3, y3);
        if (stats) {
          stats.vertexCount++;
          stats.segmentCount++;
        }
        return;
      }
    } else {
      /* Kedalaman rekursi maksimum (16) tercapai sebagai pengaman */
      if (stats) {
        stats.maxDepthHit++;
        stats.toleranceMet = false;
        stats.vertexCount++;
        stats.segmentCount++;
      }
      outPts.push(x3, y3);
      return;
    }
    rec(x0, y0, x01, y01, x012, y012, x0123, y0123, d + 1);
    rec(x0123, y0123, x123, y123, x23, y23, x3, y3, d + 1);
  };
  rec(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, depth);
}

/* =========================================================================
   2.2. PERHITUNGAN TOLERANSI BERBASIS PIXEL ERROR & ZOOM TANPA BATAS 64x
   - Menghapus batas maksimum bucket 6 (64x) dan batas minimum toleransi 0.04.
   - Menggunakan GeometryCache berbasis Object ID & Geometry Revision.
   ========================================================================= */

export { flattenCubicAdaptive };
export default flattenCubicAdaptive;
