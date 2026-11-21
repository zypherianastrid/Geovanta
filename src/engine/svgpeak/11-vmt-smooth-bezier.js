/* =====================================================================
 * JS Module 11: VMT Engine Part 7 — Taubin Smoother, CSS Corner Detector, Cubic Bezier Fitter & Shared Topology
 * ===================================================================== */
/* =====================================================================
   TAHAP 7 — Non-Linear ContourSmoother (Polak-Ribière Conjugate Gradient)
   + Multi-Scale Curvature Extrema & Stroke-End Cap Discriminator
   ---------------------------------------------------------------------
   Membedakan secara presisi:
   1. Ujung Daun & Outline Lancip (Curvature Extrema Multi-Skala C0):
      Mengunci titik ujung daun hijau & outline atas (meskipun kedua sisinya melengkung)
      agar tidak tumpul saat penghalusan spline.
   2. Ujung Goresan Kuas / Jahitan '#' (Stroke-End Pinching Guard G1):
      Mendeteksi pita goresan sempit (lebar <= 5px) yang menyempit di ujungnya,
      mencegah proyeksi duri tajam (apex spiking), dan membulatkan ujung kuas secara alami.
   3. Bayangan Tanah & Bawah Karung (Anti-Polygonal Faceting G1):
      Menolak anak-tangga (staircase) pada kurva landai agar tidak dianggap sudut C0
      atau diubah menjadi garis lurus patah-patah.
   ===================================================================== */
function taubinFilterClosed(pts, corners, passes = 14, lam = 0.45, mu = -0.473, forceCpu = false) {
  const n = pts.length;
  if (n < 5) return pts.map(p => [p[0], p[1]]);
  if (!forceCpu && n >= 512 && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuTaubinFilterClosed) {
    const gpuRes = GpuAccelerator.gpuTaubinFilterClosed(pts, corners, passes, lam, mu);
    if (gpuRes) return gpuRes;
  }
  let cur = pts.map(p => [p[0], p[1]]);
  const step = (src, weight) => {
    const dst = src.map(p => [p[0], p[1]]);
    for (let i = 0; i < n; i++) {
      if (corners && corners[i]) continue;
      const a = (i - 1 + n) % n, b = (i + 1) % n;
      dst[i][0] = src[i][0] + weight * (0.5 * (src[a][0] + src[b][0]) - src[i][0]);
      dst[i][1] = src[i][1] + weight * (0.5 * (src[a][1] + src[b][1]) - src[i][1]);
    }
    return dst;
  };
  for (let p = 0; p < passes; p++) {
    cur = step(cur, lam);
    cur = step(cur, mu);
  }
  return cur;
}

function fitLine2D(pts) {
  const m = pts.length;
  if (m < 2) return null;
  let mx = 0, my = 0;
  for (let i = 0; i < m; i++) { mx += pts[i][0]; my += pts[i][1]; }
  mx /= m; my /= m;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < m; i++) {
    const dx = pts[i][0] - mx, dy = pts[i][1] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let dx = Math.cos(th), dy = Math.sin(th);
  const cx = pts[m - 1][0] - pts[0][0], cy = pts[m - 1][1] - pts[0][1];
  if (dx * cx + dy * cy < 0) { dx = -dx; dy = -dy; }
  let ss = 0, maxDev = 0;
  for (let i = 0; i < m; i++) {
    const e = Math.abs((pts[i][0] - mx) * dy - (pts[i][1] - my) * dx);
    if (e > maxDev) maxDev = e;
    ss += e * e;
  }
  return { c: [mx, my], d: [dx, dy], rms: Math.sqrt(ss / m), maxDev, span: Math.hypot(cx, cy) };
}

/* Kåsa Circle Fit 2D pada array [x, y] */
function fitCircle2D(pts) {
  const m = pts.length;
  if (m < 4) return null;
  let sx = 0, sy = 0, sx2 = 0, sy2 = 0, sxy = 0, sx3 = 0, sy3 = 0, sx2y = 0, sxy2 = 0;
  for (let i = 0; i < m; i++) {
    const x = pts[i][0], y = pts[i][1], x2 = x * x, y2 = y * y;
    sx += x; sy += y; sx2 += x2; sy2 += y2; sxy += x * y;
    sx3 += x2 * x; sy3 += y2 * y; sx2y += x2 * y; sxy2 += x * y2;
  }
  const C = m * sx2 - sx * sx, D = m * sxy - sx * sy, E = m * sy2 - sy * sy;
  const G = 0.5 * (m * sx3 + m * sxy2 - sx * sx2 - sx * sy2);
  const H = 0.5 * (m * sx2y + m * sy3 - sy * sx2 - sy * sy2);
  const det = C * E - D * D;
  if (Math.abs(det) < 1e-9) return null;
  const cx = (G * E - H * D) / det, cy = (C * H - D * G) / det;
  let r = 0;
  for (let i = 0; i < m; i++) r += Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
  r /= m;
  let ss = 0;
  for (let i = 0; i < m; i++) {
    const e = Math.hypot(pts[i][0] - cx, pts[i][1] - cy) - r;
    ss += e * e;
  }
  return { cx, cy, r, rms: Math.sqrt(ss / m) };
}

/* =====================================================================
   Validasi Sudut: Curvature Scale Space (CSS) + Geometric Fillet Fitting
   - cssCornerPersistence: sudut sejati menyimpan sudut belok (turning angle) yang SAMA pada
     skala kecil maupun besar; busur bulat hanya menumpuk belokan seiring skala membesar.
   - filletSupport: dua garis lurus + transisi membulat dipertahankan sebagai fillet HANYA jika
     kontur sumber lebih cocok dengan model fillet (garis-busur-garis) daripada baji tajam.
   ===================================================================== */
function cssCornerPersistence(pts, i, others) {
  const n = pts.length;
  const md = k => ((k % n) + n) % n;
  const P = pts[i];
  let avail = Infinity;
  for (const dir of [1, -1]) {
    let acc = 0, k = i;
    for (let s = 0; s < n; s++) {
      const a = pts[md(k)], b = pts[md(k + dir)];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      k += dir;
      if (others.has(md(k))) { if (acc < avail) avail = acc; break; }
      if (acc > 14) break;
    }
  }
  const dmax = Math.min(6.5, Math.max(2.6, 0.54 * avail));
  if (!(dmax >= 2.6) || avail < 4.5) return null;
  const walk = (dir, d) => {
    let acc = 0, k = i;
    for (let s = 0; s < n; s++) {
      const a = pts[md(k)], b = pts[md(k + dir)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= d) {
        const t = (d - acc) / Math.max(l, 1e-9);
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      acc += l; k += dir;
    }
    return null;
  };
  const turnAt = d => {
    const A = walk(-1, d), B = walk(1, d);
    if (!A || !B) return null;
    const ux = P[0] - A[0], uy = P[1] - A[1], vx = B[0] - P[0], vy = B[1] - P[1];
    if (Math.hypot(ux, uy) < 1e-6 || Math.hypot(vx, vy) < 1e-6) return null;
    return Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
  };
  const t1 = turnAt(Math.min(1.85, dmax * 0.48)), t3 = turnAt(dmax);
  if (t1 == null || t3 == null) return null;
  return { t1, t3, rho: t1 / Math.max(t3, 1e-6) };
}

function filletSupport(pts, i, others) {
  const n = pts.length;
  const md = k => ((k % n) + n) % n;
  const armLen = dir => {
    let acc = 0, k = i;
    for (let s = 0; s < n; s++) {
      const a = pts[md(k)], b = pts[md(k + dir)];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      k += dir;
      if (others.has(md(k)) || acc >= 30) break;
    }
    return acc;
  };
  const avail = Math.min(armLen(-1), armLen(1));
  const LL = 80;
  const dSeg = (p, a, b) => {
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const l2 = abx * abx + aby * aby || 1e-9;
    const q = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2));
    return Math.hypot(p[0] - (a[0] + abx * q), p[1] - (a[1] + aby * q));
  };
  let best = null;
  /* Lengan garis di-fit pada jendela yang digeser menjauhi sudut agar bagian busur fillet tidak mencemari garis */
  for (const a0 of [2, 4, 6, 8, 10, 13]) {
    const b0 = a0 + 9;
    if (b0 > avail - 1) break;
    const lp = [], rp = [];
    for (let s = a0; s <= b0; s++) { lp.push(pts[md(i - s)]); rp.push(pts[md(i + s)]); }
    const fL = fitLine2D(lp), fR = fitLine2D(rp);
    if (!fL || !fR || fL.rms > 0.30 || fR.rms > 0.30 || fL.span < 6 || fR.span < 6) continue;
    const det = fL.d[0] * fR.d[1] - fL.d[1] * fR.d[0];
    if (Math.abs(det) < 0.08) continue;
    const wx = fR.c[0] - fL.c[0], wy = fR.c[1] - fL.c[1];
    const tt = (wx * fR.d[1] - wy * fR.d[0]) / det;
    const A = [fL.c[0] + fL.d[0] * tt, fL.c[1] + fL.d[1] * tt];
    const orient = f => {
      const s = ((f.c[0] - A[0]) * f.d[0] + (f.c[1] - A[1]) * f.d[1]) >= 0 ? 1 : -1;
      return [f.d[0] * s, f.d[1] * s];
    };
    const u = orient(fL), v = orient(fR);
    const phi = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));
    const turn = Math.PI - phi;
    if (turn < 0.35 || turn > 2.95) continue;
    const alpha = phi / 2, sinA = Math.sin(alpha), tanA = Math.tan(alpha);
    const k = (1 / sinA) - 1;
    if (!(k > 1e-3) || !(tanA > 1e-3)) continue;
    const WIN = Math.min(a0 + 6, Math.floor(avail) - 1, 22);
    const win = [];
    let dClosest = Infinity;
    for (let s = -WIN; s <= WIN; s++) {
      const p = pts[md(i + s)];
      win.push(p);
      const dd = Math.hypot(p[0] - A[0], p[1] - A[1]);
      if (dd < dClosest) dClosest = dd;
    }
    const r = dClosest / k, t = r / tanA;
    if (dClosest < 1.25 || r < 3.2 || t > 20 || t > a0 + 6) continue;
    const bl = Math.hypot(u[0] + v[0], u[1] + v[1]) || 1;
    const bis = [(u[0] + v[0]) / bl, (u[1] + v[1]) / bl];
    const Cc = [A[0] + bis[0] * (r / sinA), A[1] + bis[1] * (r / sinA)];
    const T1 = [A[0] + u[0] * t, A[1] + u[1] * t], T2 = [A[0] + v[0] * t, A[1] + v[1] * t];
    const half = turn / 2;
    const mx = A[0] - Cc[0], my = A[1] - Cc[1], ml = Math.hypot(mx, my) || 1;
    let sF = 0, sW = 0, sC = 0;
    for (const p of win) {
      const dW = Math.min(dSeg(p, A, [A[0] + u[0] * LL, A[1] + u[1] * LL]), dSeg(p, A, [A[0] + v[0] * LL, A[1] + v[1] * LL]));
      let dF = Math.min(dSeg(p, T1, [T1[0] + u[0] * LL, T1[1] + u[1] * LL]), dSeg(p, T2, [T2[0] + v[0] * LL, T2[1] + v[1] * LL]));
      const px = p[0] - Cc[0], py = p[1] - Cc[1], pl = Math.hypot(px, py) || 1e-9;
      const ang = Math.acos(Math.max(-1, Math.min(1, (px * mx + py * my) / (pl * ml))));
      if (ang <= half) dF = Math.min(dF, Math.abs(pl - r));
      /* model chamfer (garis-potong lurus T1-T2): bila lebih cocok daripada busur, itu BUKAN fillet */
      const dC = Math.min(dSeg(p, T1, [T1[0] + u[0] * LL, T1[1] + u[1] * LL]), dSeg(p, T2, [T2[0] + v[0] * LL, T2[1] + v[1] * LL]), dSeg(p, T1, T2));
      sF += dF * dF; sW += dW * dW; sC += dC * dC;
    }
    const rmsF = Math.sqrt(sF / win.length), rmsW = Math.sqrt(sW / win.length), rmsC = Math.sqrt(sC / win.length);
    if (rmsF <= Math.max(0.24, 0.032 * r) && rmsF <= 0.48 * rmsW && rmsF <= 0.80 * rmsC && (!best || rmsF < best.rmsF)) best = { r, t, rmsF, rmsW };
  }
  return best;
}

/* Pra-penapis Despeckle Tangga Piksel (Staircase / Jaggies Removal)
   Menghaluskan anak-tangga 1-4 piksel pada bayangan tanah & bawah karung yang melengkung
   tanpa menggeser ujung daun lancip (curvature extrema) atau sudut siku sejati. */
function despeckleStaircaseClosed(pts, strength = 0.65, juncFlags = null, cornerPin = null, forceCpu = false) {
  const n = pts.length;
  if (n < 8 || strength <= 0.01) return pts.map(p => [p[0], p[1]]);
  if (!forceCpu && n >= 256 && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuDespeckleStaircaseClosed) {
    const gpuPts = GpuAccelerator.gpuDespeckleStaircaseClosed(pts, strength, juncFlags, cornerPin);
    if (gpuPts && gpuPts.length === n) return gpuPts;
  }
  const rawPts = pts.map(p => [p[0], p[1]]);
  let cur = pts.map(p => [p[0], p[1]]);
  const idx = k => ((k % n) + n) % n;
  const passes = clamp(Math.round(2 + strength * 3), 2, 5);
  const lam = clamp(0.32 + strength * 0.14, 0.24, 0.45);
  const mu = -lam / (1 - 0.06 * lam);

  for (let pass = 0; pass < passes; pass++) {
    const isZig = new Uint8Array(n);
    const turns = new Float64Array(n);
    const segLens = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = cur[idx(i - 1)], p = cur[i], b = cur[idx(i + 1)];
      const ux = p[0] - a[0], uy = p[1] - a[1];
      const vx = b[0] - p[0], vy = b[1] - p[1];
      const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
      segLens[i] = l1;
      if (l1 > 1e-5 && l2 > 1e-5) {
        turns[i] = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      }
    }
    for (let i = 0; i < n; i++) {
      if ((juncFlags && juncFlags[i]) || (cornerPin && cornerPin[i])) continue;
      const t0 = turns[i];
      const lPrev = segLens[i], lNext = segLens[idx(i + 1)];
      let hasOpp = false;
      for (let d = 1; d <= 4; d++) {
        if (t0 * turns[idx(i - d)] < -0.006 || t0 * turns[idx(i + d)] < -0.006) {
          hasOpp = true;
          break;
        }
      }
      if (n >= 120 && typeof VMT !== "undefined" && VMT._curMaxDim >= 1200) {
        if (Math.abs(t0) >= 0.22 && hasOpp && Math.min(lPrev, lNext) <= 5.5) {
          isZig[i] = 1;
          for (let d = -2; d <= 2; d++) {
            const j = idx(i + d);
            if (!((juncFlags && juncFlags[j]) || (cornerPin && cornerPin[j]))) isZig[j] = 1;
          }
        }
      } else {
        if (Math.abs(t0) >= 0.25 && hasOpp && Math.min(lPrev, lNext) <= 4.5) isZig[i] = 1;
      }
    }

    for (const w of [lam, mu]) {
      const next = cur.map(p => [p[0], p[1]]);
      for (let i = 0; i < n; i++) {
        if (!isZig[i]) continue;
        const a = cur[idx(i - 1)], b = cur[idx(i + 1)];
        const mx = 0.5 * (a[0] + b[0]), my = 0.5 * (a[1] + b[1]);
        const tx = cur[i][0] + w * (mx - cur[i][0]);
        const ty = cur[i][1] + w * (my - cur[i][1]);
        /* Tabung kelayakan Minkowski +-0.48 px meratakan anak-tangga piksel pada garis miring */
        next[i][0] = clamp(tx, rawPts[i][0] - 0.48, rawPts[i][0] + 0.48);
        next[i][1] = clamp(ty, rawPts[i][1] - 0.48, rawPts[i][1] + 0.48);
      }
      cur = next;
    }
  }

  /* Multi-Scale Quadratic Savitzky-Golay Fairing untuk meluruhkan tangga berperiode panjang (5..80 px)
     dan riak blok JPEG 8x8 pada kontur miring/landai tanpa menggeser sudut tajam C0 atau simpul T-junction */
  let maxLoopCoord = 0;
  for (let i = 0; i < n; i += Math.max(1, (n >> 4))) {
    if (pts[i][0] > maxLoopCoord) maxLoopCoord = pts[i][0];
    if (pts[i][1] > maxLoopCoord) maxLoopCoord = pts[i][1];
  }
  const isHiResLoop = n >= 120 && typeof VMT !== "undefined" && VMT._curMaxDim >= 1200;
  if (n >= 16 && strength >= 0.15) {
    const maxTube = isHiResLoop ? 0.68 : 0.58;
    const isLocked = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if ((juncFlags && juncFlags[i]) || (cornerPin && cornerPin[i])) {
        isLocked[i] = 1;
        continue;
      }
      const pM4 = cur[idx(i - 4)], p0 = cur[i], pP4 = cur[idx(i + 4)];
      const ux = p0[0] - pM4[0], uy = p0[1] - pM4[1];
      const vx = pP4[0] - p0[0], vy = pP4[1] - p0[1];
      const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
      if (l1 > 0.5 && l2 > 0.5) {
        const turn4 = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
        const c4 = Math.hypot(pP4[0] - pM4[0], pP4[1] - pM4[1]) || 1;
        const sag4 = Math.hypot(p0[0] - 0.5 * (pM4[0] + pP4[0]), p0[1] - 0.5 * (pM4[1] + pP4[1]));
        if (turn4 >= 0.45 && (sag4 / c4) >= 0.16) isLocked[i] = 1;
      }
    }

    for (const maxW of [16, 36]) {
      const next = cur.map(p => [p[0], p[1]]);
      for (let i = 0; i < n; i++) {
        if (isLocked[i]) continue;
        let w = 0;
        while (w < maxW && w < (n >> 2) && !isLocked[idx(i - w - 1)] && !isLocked[idx(i + w + 1)]) {
          w++;
        }
        if (w < 4) continue;
        let arc = 0;
        for (let k = -w; k < w; k++) {
          const a = cur[idx(i + k)], b = cur[idx(i + k + 1)];
          arc += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        const pA = cur[idx(i - w)], pB = cur[idx(i + w)];
        const chord = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]);
        if (chord < 3.0 || arc / chord > (isHiResLoop ? 1.28 : 1.035)) continue;

        const sig = w * 0.55;
        const inv2Sig2 = 1 / (2 * sig * sig);
        let s0 = 0, s2 = 0, s4 = 0;
        let sx0 = 0, sx2 = 0, sy0 = 0, sy2 = 0;
        for (let k = -w; k <= w; k++) {
          const wt = Math.exp(-(k * k) * inv2Sig2);
          const k2 = k * k;
          const pk = cur[idx(i + k)];
          s0 += wt;
          s2 += wt * k2;
          s4 += wt * k2 * k2;
          sx0 += wt * pk[0];
          sx2 += wt * k2 * pk[0];
          sy0 += wt * pk[1];
          sy2 += wt * k2 * pk[1];
        }
        const det = s0 * s4 - s2 * s2;
        if (Math.abs(det) < 1e-9) continue;
        const ax = (s4 * sx0 - s2 * sx2) / det;
        const cx = (s0 * sx2 - s2 * sx0) / det;
        const ay = (s4 * sy0 - s2 * sy2) / det;
        const cy = (s0 * sy2 - s2 * sy0) / det;

        const bx = (pB[0] - pA[0]) / (2 * w);
        const by = (pB[1] - pA[1]) / (2 * w);
        let errSq = 0;
        for (let k = -w; k <= w; k++) {
          const pk = cur[idx(i + k)];
          const fx = ax + bx * k + cx * k * k;
          const fy = ay + by * k + cy * k * k;
          errSq += (pk[0] - fx) ** 2 + (pk[1] - fy) ** 2;
        }
        const rms = Math.sqrt(errSq / (2 * w + 1));
        if (rms <= (isHiResLoop ? 0.54 : 0.42)) {
          next[i][0] = clamp(ax, rawPts[i][0] - maxTube, rawPts[i][0] + maxTube);
          next[i][1] = clamp(ay, rawPts[i][1] - maxTube, rawPts[i][1] + maxTube);
        }
      }
      cur = next;
    }
  }
  return cur;
}

function detectCornersAndExtrema(pts, angleDeg = 44, juncFlags = null, advOpt = {}) {
  const n = pts.length;
  const corners = new Uint8Array(n);
  const smoothKnots = new Uint8Array(n);
  const apexMap = new Map();
  const knotTangents = new Map();
  if (juncFlags) {
    for (let i = 0; i < n; i++) {
      if (juncFlags[i] === 1) corners[i] = 1;
      else if (juncFlags[i] === 2) smoothKnots[i] = 1;
    }
  }
  if (n < 6) {
    for (let i = 0; i < n; i++) corners[i] = 1;
    return { corners, smoothKnots, apexMap, knotTangents };
  }

  let minX_c = Infinity, maxX_c = -Infinity, minY_c = Infinity, maxY_c = -Infinity;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (p[0] < minX_c) minX_c = p[0]; if (p[0] > maxX_c) maxX_c = p[0];
    if (p[1] < minY_c) minY_c = p[1]; if (p[1] > maxY_c) maxY_c = p[1];
  }
  const bboxDiag = Math.hypot(maxX_c - minX_c, maxY_c - minY_c);
  let orthoStepsCnt = 0;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n];
    const dx = Math.abs(p1[0] - p0[0]), dy = Math.abs(p1[1] - p0[1]);
    if (Math.min(dx, dy) <= 0.18 * Math.max(dx, dy)) orthoStepsCnt++;
  }
  /* Aktifkan isMicroGlyph HANYA bila kontur kecil benar-benar didominasi langkah ortogonal/rektilinear (huruf teks),
     bukan kontur organik/oval/sabit seperti mata, hidung, atau alis pada ilustrasi line-art! */
  const isMicroGlyph = (bboxDiag <= 32 && n <= 90) && ((orthoStepsCnt / n) >= 0.64) && advOpt.cornerMode !== 'organic';
  const cornerMode = advOpt.cornerMode || 'typo';
  const lcSens = (advOpt.lineCurveSensitivity ?? 74) / 100;
  const apexSharp = (advOpt.apexSharpness ?? 78) / 100;
  const roundness = (advOpt.cornerRoundness ?? 65) / 100;
  const protectStemCaps = advOpt.protectStemCaps !== false;
  const extremumAlign = advOpt.extremumAlign !== false;
  const idx = k => ((k % n) + n) % n;

  const turnOn = (arr, i, L) => {
    const a = arr[idx(i - L)], p = arr[i], b = arr[idx(i + L)];
    const ux = p[0] - a[0], uy = p[1] - a[1];
    const vx = b[0] - p[0], vy = b[1] - p[1];
    const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
    if (l1 < 0.20 || l2 < 0.20) return 0;
    return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  };

  /* 0. Pra-kunci HANYA puncak baji sejati (sagitta/chord >= 0.20 & searah tanpa pembatalan tanda tangga) */
  const rawPin = new Uint8Array(corners);
  const rawTurn1 = new Float64Array(n);
  const rawTurn2 = new Float64Array(n);
  const rawTurn3 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    rawTurn1[i] = turnOn(pts, i, 1);
    rawTurn2[i] = turnOn(pts, i, 2);
    rawTurn3[i] = turnOn(pts, i, 3);
  }
  const isOrganicCornerMode = cornerMode === 'organic';
  for (let i = 0; i < n; i++) {
    const r2Thr = isOrganicCornerMode ? 0.72 : 0.58;
    const r3Thr = isOrganicCornerMode ? 0.78 : 0.66;
    const sagThr = isOrganicCornerMode ? 0.24 : 0.205;
    /* Hanya kunci puncak baji sejati yang memiliki konsentrasi belokan tajam di simpul i (bukan busur melengkung mulus!) */
    if ((Math.abs(rawTurn2[i]) >= r2Thr || Math.abs(rawTurn3[i]) >= r3Thr) && Math.abs(rawTurn1[i]) >= 0.34) {
      const net1 = Math.abs(rawTurn1[idx(i - 1)] + rawTurn1[i] + rawTurn1[idx(i + 1)]);
      const pM3 = pts[idx(i - 3)], pP3 = pts[idx(i + 3)];
      const w3 = Math.hypot(pP3[0] - pM3[0], pP3[1] - pM3[1]);
      const sag3 = Math.hypot(pts[i][0] - 0.5 * (pM3[0] + pP3[0]), pts[i][1] - 0.5 * (pM3[1] + pP3[1]));
      if (net1 >= (isOrganicCornerMode ? 0.68 : 0.56) && w3 > 0.5 && (sag3 / w3) >= sagThr) {
        rawPin[i] = 1;
      }
    }
  }

  let maxC = 0;
  for (let i = 0; i < n; i += Math.max(1, (n >> 4))) {
    if (pts[i][0] > maxC) maxC = pts[i][0];
    if (pts[i][1] > maxC) maxC = pts[i][1];
  }
  const is2KLoop = n >= 120 && typeof VMT !== "undefined" && VMT._curMaxDim >= 1200;
  const cssPin = is2KLoop ? new Uint8Array(corners) : rawPin;
  const smMicro = taubinFilterClosed(pts, cssPin, 2, 0.42, -0.44);
  const smFine = taubinFilterClosed(pts, cssPin, is2KLoop ? 5 : 4, 0.44, -0.46);
  const smBroad = taubinFilterClosed(pts, cssPin, is2KLoop ? 10 : 9, 0.45, -0.473);

  const L_fine = clamp(Math.round(n / 135), 3, 6);
  const scales = [2, L_fine, clamp(L_fine * 2, 6, 14), clamp(L_fine * 4, 12, 26)]
    .filter((v, i, a) => v < Math.max(4, n >> 2) && a.indexOf(v) === i);
  if (!scales.length) scales.push(2);

  const microTurn = new Float64Array(n);
  const signedMicroTurn = new Float64Array(n);
  const fineTurn = new Float64Array(n);
  const maxScaleTurn = new Float64Array(n);
  const signedMaxTurn = new Float64Array(n);
  const curvExtremaScore = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const mt = rawPin[i] && Math.abs(rawTurn2[i]) > Math.abs(turnOn(smMicro, i, 2)) ? rawTurn2[i] : turnOn(smMicro, i, 2);
    signedMicroTurn[i] = mt;
    microTurn[i] = Math.abs(mt);
    const mtLocal = Math.max(microTurn[i], Math.abs(rawTurn1[i]) * 1.35);
    const mt3 = Math.max(microTurn[i], Math.abs(turnOn(smMicro, i, 3)) * (mtLocal < 0.18 ? 0.35 : 1.0), rawPin[i] ? Math.abs(rawTurn3[i]) : 0);
    /* Batasi kontribusi skala L >= 4 pada titik yang secara lokal datar (mtLocal kecil)
       agar titik datar di antara 2 sudut dekat tidak mencuri puncak NMS dari sudut siku sejati! */
    const rawFine = Math.abs(turnOn(smFine, i, L_fine));
    const fineCap = mtLocal < 0.08 ? 0.12 : mtLocal < 0.22 ? mtLocal * 1.65 : (isMicroGlyph ? microTurn[i] * 1.65 : Math.PI);
    fineTurn[i] = Math.max(rawPin[i] ? Math.abs(rawTurn3[i]) : 0, Math.min(rawFine, fineCap));
    const largeScaleCap = mtLocal < 0.10 ? 0.12 : mtLocal < 0.25 ? mtLocal * 1.75 : (isMicroGlyph ? Math.max(fineTurn[i], microTurn[i] * 1.75) : Math.PI);
    let bestA = fineTurn[i], bestS = turnOn(smFine, i, L_fine);
    for (const L of scales) {
      const rawT = turnOn(smBroad, i, L);
      const effA = L > 3 ? Math.min(Math.abs(rawT), largeScaleCap) : Math.abs(rawT);
      if (effA > bestA) { bestA = effA; bestS = rawT; }
    }
    maxScaleTurn[i] = bestA;
    signedMaxTurn[i] = bestS;

    const t2 = Math.abs(turnOn(smMicro, i, 2));
    const t4 = Math.abs(turnOn(smFine, i, 4));
    const c4 = Math.hypot(smFine[idx(i + 4)][0] - smFine[idx(i - 4)][0], smFine[idx(i + 4)][1] - smFine[idx(i - 4)][1]);
    const mx4 = 0.5 * (smFine[idx(i - 4)][0] + smFine[idx(i + 4)][0]);
    const my4 = 0.5 * (smFine[idx(i - 4)][1] + smFine[idx(i + 4)][1]);
    const sag4 = Math.hypot(smMicro[i][0] - mx4, smMicro[i][1] - my4);
    const sagRatio4 = c4 > 0.8 ? (sag4 / c4) : 0;
    const sameSign = Math.sign(turnOn(smMicro, i, 2)) === Math.sign(turnOn(smFine, i, 4));
    const rawCExt = (sameSign && sagRatio4 >= 0.16 && t2 >= 0.20) ? Math.max(t2, t4 * 0.95, sagRatio4 * 1.95) : Math.max(t2 * 0.75, Math.min(t4 * 0.75, fineCap));
    curvExtremaScore[i] = Math.min(rawCExt, largeScaleCap);
  }

  const modeAngleBias = cornerMode === 'sharp' ? -8 : cornerMode === 'organic' ? 6 : -4;
  const effAngleDeg = clamp(angleDeg + modeAngleBias, 18, 115);
  const minPeakRad = (Math.min(effAngleDeg, 28) * Math.PI) / 180;
  const sharpThrRad = (Math.min(effAngleDeg, 38) * Math.PI) / 180;
  const nmsWin = protectStemCaps ? clamp(L_fine, 2, 4) : clamp(L_fine + 1, 3, 6);
  const rawPeaks = [];

  for (let i = 0; i < n; i++) {
    if (corners[i]) {
      rawPeaks.push({ i, forced: true, peakVal: Math.PI, sign: 1 });
      continue;
    }
    const score = Math.max(microTurn[i], fineTurn[i], maxScaleTurn[i] * 0.90, curvExtremaScore[i]);
    if (score < minPeakRad) continue;
    let isMax = true;
    for (let d = -nmsWin; d <= nmsWin; d++) {
      if (d === 0) continue;
      const j = idx(i + d);
      const sj = Math.max(microTurn[j], fineTurn[j], maxScaleTurn[j] * 0.90, curvExtremaScore[j]);
      if (sj > score + 1e-6) {
        const ti = Math.max(microTurn[i], fineTurn[i]);
        const tj = Math.max(microTurn[j], fineTurn[j]);
        if (protectStemCaps && Math.abs(d) >= 2 && ti >= 0.48 && tj >= 0.48 &&
            Math.sign(signedMicroTurn[i]) === Math.sign(signedMicroTurn[j]) &&
            (ti + tj) >= 2.55) {
          continue;
        }
        if (protectStemCaps && Math.abs(d) <= 2 && rawPin[i] && microTurn[i] >= 0.65 && microTurn[j] < microTurn[i] * 0.85) {
          continue;
        }
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;

    let bestLocalI = i, bestMicro = Math.max(microTurn[i], Math.abs(turnOn(smMicro, i, 3)), rawPin[i] ? Math.abs(rawTurn2[i]) : 0);
    for (let d = -3; d <= 3; d++) {
      const j = idx(i + d);
      const mj = Math.max(microTurn[j], Math.abs(turnOn(smMicro, j, 3)), rawPin[j] ? Math.abs(rawTurn2[j]) : 0);
      if (mj > bestMicro + 0.02) { bestMicro = mj; bestLocalI = j; }
    }
    if (rawPeaks.length) {
      const prev = rawPeaks[rawPeaks.length - 1];
      const gap = idx(bestLocalI - prev.i);
      const tCur = Math.max(microTurn[bestLocalI], fineTurn[bestLocalI]);
      const tPrev = Math.max(microTurn[prev.i], fineTurn[prev.i]);
      const isTwoCornerCap = protectStemCaps && gap >= 2 && tCur >= 0.48 && tPrev >= 0.48 &&
        Math.sign(signedMicroTurn[bestLocalI]) === Math.sign(signedMicroTurn[prev.i]) &&
        (tCur + tPrev) >= 2.55;
      if (gap < nmsWin && !isTwoCornerCap) {
        if (!prev.forced && score > prev.peakVal) {
          rawPeaks[rawPeaks.length - 1] = { i: bestLocalI, forced: false, peakVal: score, sign: Math.sign(signedMaxTurn[bestLocalI]) || 1 };
        }
        continue;
      }
    }
    rawPeaks.push({ i: bestLocalI, forced: false, peakVal: score, sign: Math.sign(signedMaxTurn[bestLocalI]) || 1 });
  }

  /* Helper: menguji apakah sebuah lengan kontur benar-benar lurus (bukan busur lengkung seperti dalam huruf e, D, P, B, R) */
  const evalArmStraightness = (armPts, fLine) => {
    if (!fLine || fLine.span < (isMicroGlyph ? 2.25 : 2.65)) return false;
    const rmsLim = Math.min(0.22, 0.11 + fLine.span * 0.0045);
    const devLim = Math.min(0.40, 0.20 + fLine.span * 0.0085);
    if (fLine.rms > rmsLim || fLine.maxDev > devLim) return false;
    const mPts = armPts.length;
    if (mPts >= 5) {
      const p0 = armPts[0], p1 = armPts[mPts - 1];
      const ch = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const ux = (p1[0] - p0[0]) / ch, uy = (p1[1] - p0[1]) / ch;
      let sumSigned = 0, cntMid = 0;
      const i0 = Math.max(1, Math.floor(mPts * 0.25)), i1 = Math.min(mPts - 2, Math.ceil(mPts * 0.75));
      for (let s = i0; s <= i1; s++) {
        sumSigned += (armPts[s][0] - p0[0]) * uy - (armPts[s][1] - p0[1]) * ux;
        cntMid++;
      }
      const meanSagRatio = cntMid > 0 ? Math.abs(sumSigned / cntMid) / ch : 0;
      const sagRatioLim = ch < 6.5 ? Math.max(0.036, 0.14 / ch) : 0.022;
      if (meanSagRatio > sagRatioLim) return false;
      if (mPts >= 7 && fLine.rms > 0.085) {
        const cf = fitCircle2D(armPts);
        if (cf && cf.r >= 2.5 && cf.r <= 185 && cf.rms < fLine.rms * 0.62) return false;
      }
    }
    return true;
  };

  if (rawPeaks.length >= 2) {
    const firstPk = rawPeaks[0], lastPk = rawPeaks[rawPeaks.length - 1];
    const wrapGap = (firstPk.i - lastPk.i + n) % n;
    if (wrapGap < nmsWin) {
      if (lastPk.peakVal > firstPk.peakVal) rawPeaks[0] = lastPk;
      rawPeaks.pop();
    }
  }
  if (protectStemCaps && rawPeaks.length >= 2 && n >= 14) {
    const intersectLines2D = (lA, lB) => {
      if (!lA || !lB) return null;
      const det = lA.d[0] * lB.d[1] - lA.d[1] * lB.d[0];
      if (Math.abs(det) < 0.25) return null;
      const wx = lB.c[0] - lA.c[0], wy = lB.c[1] - lA.c[1];
      const t = (wx * lB.d[1] - wy * lB.d[0]) / det;
      return [lA.c[0] + lA.d[0] * t, lA.c[1] + lA.d[1] * t];
    };
    const expandedPeaks = [];
    for (let k = 0; k < rawPeaks.length; k++) {
      const pk = rawPeaks[k];
      const prevPk = rawPeaks[(k - 1 + rawPeaks.length) % rawPeaks.length];
      const nextPk = rawPeaks[(k + 1) % rawPeaks.length];
      const gapNext = (nextPk.i - pk.i + n) % n;
      let capStartI = pk.i, capEndI = pk.i, isPair = false;
      const maxCapSpan = Math.min(4, Math.max(2, Math.floor(n * 0.20)));
      if (gapNext > 0 && gapNext <= maxCapSpan && pk.sign === nextPk.sign && !pk.forced && !nextPk.forced) {
        capStartI = pk.i;
        capEndI = nextPk.i;
        isPair = true;
      } else if (!pk.forced) {
        for (let s = 1; s <= Math.min(maxCapSpan, ((pk.i - prevPk.i + n) % n) - 2); s++) {
          const j = idx(pk.i - s);
          if (signedMicroTurn[j] * pk.sign < -0.25) break;
          if (microTurn[j] >= 0.28 && Math.sign(signedMicroTurn[j]) === pk.sign) capStartI = j;
        }
        for (let s = 1; s <= Math.min(maxCapSpan, ((nextPk.i - pk.i + n) % n) - 2); s++) {
          const j = idx(pk.i + s);
          if (signedMicroTurn[j] * pk.sign < -0.25) break;
          if (microTurn[j] >= 0.28 && Math.sign(signedMicroTurn[j]) === pk.sign) capEndI = j;
        }
      }
      const spanInit = (capEndI - capStartI + n) % n;
      const midCapI = idx(capStartI + Math.round(spanInit * 0.5));
      const afterPk = isPair ? rawPeaks[(k + 2) % rawPeaks.length] : nextPk;
      const maxInSteps = clamp(((capStartI - prevPk.i + n) % n) - 1, 3, 7);
      const maxOutSteps = clamp(((afterPk.i - capEndI + n) % n) - 1, 3, 7);
      const inPts = [], outPts = [];
      for (let s = 1; s <= maxInSteps; s++) {
        const idxIn = idx(capStartI - s);
        if (s >= 3 && microTurn[idxIn] >= 0.55) break;
        inPts.push(pts[idxIn]);
      }
      inPts.reverse();
      for (let s = 1; s <= maxOutSteps; s++) {
        const idxOut = idx(capEndI + s);
        if (s >= 3 && microTurn[idxOut] >= 0.55) break;
        outPts.push(pts[idxOut]);
      }
      const fIn = fitLine2D(inPts), fOut = fitLine2D(outPts);
      const antiDot = (fIn && fOut) ? (fIn.d[0] * fOut.d[0] + fIn.d[1] * fOut.d[1]) : 0;
      const perpDist = (fIn && fOut) ? Math.abs((fOut.c[0] - fIn.c[0]) * fIn.d[1] - (fOut.c[1] - fIn.c[1]) * fIn.d[0]) : 99;
      if (fIn && fOut && fIn.rms <= 0.14 && fOut.rms <= 0.14 && fIn.span >= 4.2 && fOut.span >= 4.2 &&
          antiDot <= -0.90 && perpDist >= 2.2 && perpDist <= 6.2) {
        let iL = capStartI, iR = capEndI;
        for (let s = 0; s <= 4; s++) {
          const candL = idx(midCapI - s);
          const dIn = Math.abs((pts[candL][0] - fIn.c[0]) * fIn.d[1] - (pts[candL][1] - fIn.c[1]) * fIn.d[0]);
          if (dIn <= 0.55) { iL = candL; break; }
        }
        for (let s = 0; s <= 4; s++) {
          const candR = idx(midCapI + s);
          const dOut = Math.abs((pts[candR][0] - fOut.c[0]) * fOut.d[1] - (pts[candR][1] - fOut.c[1]) * fOut.d[0]);
          if (dOut <= 0.55) { iR = candR; break; }
        }
        const spanLR = (iR - iL + n) % n;
        if (spanLR >= 2 && spanLR <= 8) {
          const capFacePts = [];
          for (let s = 1; s < spanLR; s++) capFacePts.push(pts[idx(iL + s)]);
          const fCapCore = capFacePts.length >= 2 ? fitLine2D(capFacePts) : null;
          const allCapPts = [];
          for (let s = 0; s <= spanLR; s++) allCapPts.push(pts[idx(iL + s)]);
          const fCapAll = fitLine2D(allCapPts);
          const nx = -fIn.d[1], ny = fIn.d[0];
          /* Diskriminator Round Brush Cap vs Flat Stem Cap:
             Ukur tonjolan puncak cap (hTip) melewati tali busur bahu [pts[iL]..pts[iR]] dan uji kecocokan setengah lingkaran.
             Jika ujung menonjol melengkung seperti kuas/pena bulat (hTip >= 0.18 * perpDist atau cfSemi lebih baik),
             JANGAN meratakannya menjadi garis lurus [apL, apR]! */
          const chCapX = pts[iR][0] - pts[iL][0], chCapY = pts[iR][1] - pts[iL][1], chCapL = Math.hypot(chCapX, chCapY) || 1;
          let maxCapBulge = 0;
          for (let s = 1; s < spanLR; s++) {
            const pM = pts[idx(iL + s)];
            const bulge = Math.abs((pM[0] - pts[iL][0]) * (-chCapY / chCapL) + (pM[1] - pts[iL][1]) * (chCapX / chCapL));
            if (bulge > maxCapBulge) maxCapBulge = bulge;
          }
          const semiCheckPts = [];
          for (let s = -2; s <= spanLR + 2; s++) semiCheckPts.push(pts[idx(iL + s)]);
          const cfSemi = semiCheckPts.length >= 5 ? fitCircle2D(semiCheckPts) : null;
          const isRoundBrushCap = maxCapBulge >= Math.max(0.42, perpDist * 0.16) ||
            !!(cfSemi && cfSemi.r >= 1.1 && cfSemi.r <= perpDist * 0.85 && cfSemi.rms <= 0.22);
          const isFlatCap = !isRoundBrushCap && (
            (fCapCore && fCapCore.rms <= 0.18 && fCapCore.maxDev <= 0.28 && Math.abs(fCapCore.d[0] * nx + fCapCore.d[1] * ny) >= 0.82) ||
            (fCapAll && fCapAll.rms <= 0.20 && fCapAll.maxDev <= 0.32 && Math.abs(fCapAll.d[0] * nx + fCapAll.d[1] * ny) >= 0.84)
          );
          if (isFlatCap) {
            const capLine = (fCapAll && Math.abs(fCapAll.d[0] * nx + fCapAll.d[1] * ny) >= 0.90)
              ? { c: fCapAll.c, d: [nx, ny] }
              : ((fCapCore && fCapCore.span >= 1.2 && Math.abs(fCapCore.d[0] * nx + fCapCore.d[1] * ny) >= 0.85) ? fCapCore : fCapAll);
            const apL = intersectLines2D(fIn, capLine);
            const apR = intersectLines2D(capLine, fOut);
            if (apL && apR && Math.hypot(apL[0] - pts[iL][0], apL[1] - pts[iL][1]) <= 1.45 &&
                Math.hypot(apR[0] - pts[iR][0], apR[1] - pts[iR][1]) <= 1.45) {
              for (let s = 1; s < spanLR; s++) {
                const u = s / spanLR, mIdx = idx(iL + s);
                pts[mIdx] = [apL[0] + (apR[0] - apL[0]) * u, apL[1] + (apR[1] - apL[1]) * u];
              }
              expandedPeaks.push({ i: iL, forced: false, peakVal: pk.peakVal, sign: pk.sign, capApex: apL });
              expandedPeaks.push({ i: iR, forced: false, peakVal: pk.peakVal, sign: pk.sign, capApex: apR });
              if (isPair) {
                if (k === rawPeaks.length - 1) expandedPeaks.shift();
                else k++;
              }
              continue;
            }
          }
        }
      }
      expandedPeaks.push(pk);
    }
    rawPeaks.length = 0;
    for (const ep of expandedPeaks) rawPeaks.push(ep);
  }
  const m = rawPeaks.length;
  const rawPeakSet = new Set(rawPeaks.map(p => p.i));
  rawPeakSet.delete(-1);
  const cands = [];
  for (let k = 0; k < m; k++) {
    const pk = rawPeaks[k];
    const centerI = pk.i;
    if (pk.forced) {
      cands.push({ i: centerI, forced: true, sharp: true, apexPt: null, turn: Math.PI, sign: 1, leftStraight: true, rightStraight: true, isStrokeCap: false, isCurvCusp: false });
      continue;
    }
    const prevPeak = rawPeaks[(k - 1 + m) % m];
    const nextPeak = rawPeaks[(k + 1) % m];
    const distPrev = m > 1 ? ((centerI - prevPeak.i + n) % n) : (n >> 1);
    const distNext = m > 1 ? ((nextPeak.i - centerI + n) % n) : (n >> 1);

    const maxArmL = distPrev <= 7 ? Math.max(2, distPrev) : ((isMicroGlyph && distPrev <= 9) ? clamp(distPrev - 1, 2, 7) : (distPrev <= 26 ? clamp(Math.min(Math.floor(distPrev * 0.65), distPrev - 2), 2, 16) : clamp(Math.floor(distPrev * 0.72), 2, 26)));
    const maxArmR = distNext <= 7 ? Math.max(2, distNext) : ((isMicroGlyph && distNext <= 9) ? clamp(distNext - 1, 2, 7) : (distNext <= 26 ? clamp(Math.min(Math.floor(distNext * 0.65), distNext - 2), 2, 16) : clamp(Math.floor(distNext * 0.72), 2, 26)));
    const gapL = maxArmL >= 18 ? 5 : maxArmL >= 12 ? 3 : maxArmL >= 8 ? 2 : (maxArmL >= 6 ? 1 : 0);
    const gapR = maxArmR >= 18 ? 5 : maxArmR >= 12 ? 3 : maxArmR >= 8 ? 2 : (maxArmR >= 6 ? 1 : 0);

    const leftPts = [], rightPts = [];
    for (let s = maxArmL; s >= gapL; s--) leftPts.push(smMicro[idx(centerI - s)]);
    for (let s = gapR; s <= maxArmR; s++) rightPts.push(smMicro[idx(centerI + s)]);

    const fL = fitLine2D(leftPts), fR = fitLine2D(rightPts);
    const leftStraight = evalArmStraightness(leftPts, fL);
    const rightStraight = evalArmStraightness(rightPts, fR);

    const nearL = [], nearR = [];
    const nLenL = clamp(maxArmL, 2, 5), nLenR = clamp(maxArmR, 2, 5);
    for (let s = nLenL; s >= 0; s--) nearL.push(pts[idx(centerI - s)]);
    for (let s = 0; s <= nLenR; s++) nearR.push(pts[idx(centerI + s)]);
    const fnL = fitLine2D(nearL), fnR = fitLine2D(nearR);

    const dL = (leftStraight ? fL : fnL)?.d || [1, 0];
    const dR = (rightStraight ? fR : fnR)?.d || [0, 1];
    const cL = (leftStraight ? fL : fnL)?.c || pts[centerI];
    const cR = (rightStraight ? fR : fnR)?.c || pts[centerI];

    const armTurnRad = Math.abs(Math.atan2(dL[0] * dR[1] - dL[1] * dR[0], dL[0] * dR[0] + dL[1] * dR[1]));
    const nearTurnRad = (fnL && fnR)
      ? Math.abs(Math.atan2(fnL.d[0] * fnR.d[1] - fnL.d[1] * fnR.d[0], fnL.d[0] * fnR.d[0] + fnL.d[1] * fnR.d[1]))
      : armTurnRad;
    const effTurn = Math.max(armTurnRad, nearTurnRad, fineTurn[centerI], microTurn[centerI]);

    const wSpan = d => {
      const pA = pts[idx(centerI - d)], pB = pts[idx(centerI + d)];
      return Math.hypot(pB[0] - pA[0], pB[1] - pA[1]);
    };
    const w2 = wSpan(2), w4 = wSpan(4), w6 = wSpan(6), w12 = wSpan(Math.min(12, n >> 2));
    const mid4 = [0.5 * (pts[idx(centerI - 4)][0] + pts[idx(centerI + 4)][0]), 0.5 * (pts[idx(centerI - 4)][1] + pts[idx(centerI + 4)][1])];
    const sag4 = Math.hypot(pts[centerI][0] - mid4[0], pts[centerI][1] - mid4[1]);
    const sagRatio4 = w4 > 0.5 ? (sag4 / w4) : 0;

    const isDivergingVee = (leftStraight && rightStraight && Math.min(fL.span, fR.span) >= 5.5 && w12 > w4 * 1.35) || (w12 > w6 * 1.48);
    const isStrokeCap = !isDivergingVee && !pk.capApex && (
      n >= 12 &&
      effTurn >= 1.95 &&
      w2 <= 4.6 && w4 <= 5.4 && w6 <= 6.0 && w12 <= 6.8 &&
      (w6 / Math.max(1.3, w2)) < 1.52
    );

    const arcZone = [];
    const arcW = clamp(Math.min(distPrev, distNext) >> 1, 3, 7);
    for (let s = -arcW; s <= arcW; s++) arcZone.push(smFine[idx(centerI + s)]);
    const cFit = fitCircle2D(arcZone);
    const wedgeRms = 0.5 * ((fnL ? fnL.rms : 0.45) + (fnR ? fnR.rms : 0.45));
    const conc = Math.max(microTurn[centerI], nearTurnRad * 0.85) / Math.max(1e-4, Math.max(fineTurn[centerI], armTurnRad));

    const isSmoothCircleCap = !!(cFit && cFit.r >= 1.35 && cFit.r <= 48 && cFit.rms <= Math.max(0.20, cFit.r * 0.045) && cFit.rms < wedgeRms * 0.90);
    const isCurvCusp = !isStrokeCap && !isSmoothCircleCap && (
      sagRatio4 >= 0.25 &&
      conc >= 0.62 &&
      (w6 - w2) >= 1.6 &&
      w6 >= 3.8 &&
      (nearTurnRad >= 0.65 || effTurn >= 0.78) &&
      (!cFit || wedgeRms <= cFit.rms * 0.92 || (nearTurnRad >= 1.18 && microTurn[centerI] >= 0.58))
    );

    let oppTurnSum = 0;
    const pkSign = Math.sign(signedMicroTurn[centerI]) || pk.sign || 1;
    for (let s = -4; s <= 4; s++) {
      if (s === 0) continue;
      const ts = turnOn(pts, idx(centerI + s), 1);
      if (ts * pkSign < -0.08) oppTurnSum += Math.abs(ts);
    }
    const isStaircaseFacet = !isCurvCusp && oppTurnSum >= 0.35 && sagRatio4 < 0.22 && (!leftStraight || !rightStraight);

    const det = dL[0] * dR[1] - dL[1] * dR[0];
    let dApex = 999, dPerp = 999, apexPt = null, rEff = 999;
    if (Math.abs(det) > 0.08 && !isStrokeCap) {
      const wx = cR[0] - cL[0], wy = cR[1] - cL[1];
      const t = (wx * dR[1] - wy * dR[0]) / det;
      const ax = cL[0] + dL[0] * t, ay = cL[1] + dL[1] * t;
      dApex = Math.hypot(pts[centerI][0] - ax, pts[centerI][1] - ay);
      const halfInterior = Math.max(0.14, (Math.PI - clamp(effTurn, 0.15, 2.85)) * 0.5);
      dPerp = dApex * Math.sin(halfInterior);
      const secantFactor = (1 / Math.max(0.14, Math.sin(halfInterior))) - 1;
      rEff = secantFactor > 0.04 ? (dApex / secantFactor) : dPerp;

      const isStrongPolygonWedge = leftStraight && rightStraight && fL.span >= 5.5 && fR.span >= 5.5 && armTurnRad >= 0.42 && dPerp <= Math.min(3.2, 0.16 * Math.min(fL.span, fR.span));
      if (pk.capApex) {
        apexPt = pk.capApex;
      } else if (leftStraight && rightStraight) {
        const isOrthoBevel = effTurn > 1.15 && effTurn < 1.95 && fL.rms <= 0.14 && fR.rms <= 0.14 && Math.max(fL.span, fR.span) >= 3.2;
        const maxAllowApex = isOrthoBevel ? 1.65 : ((effTurn > 0.42 && effTurn < 2.85) ? Math.min(0.85, 0.45 + apexSharp * 0.35) : 0.55);
        if ((dPerp <= 1.85 || isStrongPolygonWedge || isOrthoBevel) && dApex <= maxAllowApex && apexSharp > 0.05) {
          const shift = (fL.rms <= 0.22 && fR.rms <= 0.22)
            ? 1.0
            : Math.min(0.95, (0.85 + apexSharp * 1.35) / Math.max(1e-6, dApex)) * Math.min(1.0, 0.65 + apexSharp * 0.35);
          apexPt = [
            pts[centerI][0] + (ax - pts[centerI][0]) * shift,
            pts[centerI][1] + (ay - pts[centerI][1]) * shift
          ];
        }
      } else if (leftStraight !== rightStraight && apexSharp > 0.05) {
        /* Sudut Garis-ke-Kurva (seperti ujung busur dalam huruf e, D, P, B, R):
           Jangan gunakan perpotongan tali busur jauh dari sisi lengkung!
           Proyeksikan titik sudut ke garis lurus fStr sepanjang arah singgung lokal fnCurv (dibatasi <= 0.48 px) */
        const fStr = leftStraight ? fL : fR;
        const fnCurv = leftStraight ? fnR : fnL;
        if (fStr && fnCurv) {
          const detLC = fStr.d[0] * fnCurv.d[1] - fStr.d[1] * fnCurv.d[0];
          if (Math.abs(detLC) > 0.14) {
            const wxLC = pts[centerI][0] - fStr.c[0], wyLC = pts[centerI][1] - fStr.c[1];
            const tLC = (wxLC * fnCurv.d[1] - wyLC * fnCurv.d[0]) / detLC;
            const axLC = fStr.c[0] + fStr.d[0] * tLC, ayLC = fStr.c[1] + fStr.d[1] * tLC;
            const distLC = Math.hypot(axLC - pts[centerI][0], ayLC - pts[centerI][1]);
            if (distLC <= 0.55) {
              apexPt = [axLC, ayLC];
            } else {
              /* Proyeksikan secara ortogonal tepat ke garis lurus fStr */
              const projS = (pts[centerI][0] - fStr.c[0]) * fStr.d[0] + (pts[centerI][1] - fStr.c[1]) * fStr.d[1];
              const ox = fStr.c[0] + fStr.d[0] * projS, oy = fStr.c[1] + fStr.d[1] * projS;
              if (Math.hypot(ox - pts[centerI][0], oy - pts[centerI][1]) <= 0.48) {
                apexPt = [ox, oy];
              }
            }
          }
        }
      } else if (isCurvCusp && dApex <= 1.25 && apexSharp > 0.05) {
        apexPt = [
          pts[centerI][0] + (ax - pts[centerI][0]) * 0.65,
          pts[centerI][1] + (ay - pts[centerI][1]) * 0.65
        ];
      }
    } else if (isStrokeCap) {
      const neckMidX = 0.5 * (pts[idx(centerI - 2)][0] + pts[idx(centerI + 2)][0]);
      const neckMidY = 0.5 * (pts[idx(centerI - 2)][1] + pts[idx(centerI + 2)][1]);
      apexPt = [
        pts[centerI][0] + (neckMidX - pts[centerI][0]) * 0.34,
        pts[centerI][1] + (neckMidY - pts[centerI][1]) * 0.34
      ];
    }

    let activeArcSteps = 0;
    for (let s = -3; s <= 3; s++) {
      if (Math.abs(turnOn(smFine, idx(centerI + s), 2)) > 0.11) activeArcSteps++;
    }
    const isStrongPolygonWedge = leftStraight && rightStraight && fL.span >= 5.5 && fR.span >= 5.5 && armTurnRad >= 0.42 && dPerp <= Math.min(3.2, 0.16 * Math.min(fL.span, fR.span)) && rEff <= 3.8;
    const minRoundRadius = 2.6 - roundness * 0.80;
    const isGenuineSmoothArc = !isCurvCusp && !isStrongPolygonWedge && cornerMode !== 'sharp' && !!(
      cFit && cFit.r >= minRoundRadius && cFit.r <= 90 &&
      cFit.rms <= Math.max(0.35, cFit.r * (0.042 + roundness * 0.020)) &&
      (cFit.rms <= wedgeRms * 1.12 || conc < 0.52) &&
      (rEff > (1.85 - roundness * 0.40) || sagRatio4 < 0.22) &&
      activeArcSteps >= 4 && conc < (0.60 - roundness * 0.06)
    );

    const isRoundUCap = !!(cFit && cFit.r >= 2.2 && cFit.r <= 24 && cFit.rms <= Math.max(0.24, cFit.r * 0.042) && cFit.rms <= wedgeRms * 0.78);
    const isStemCapCorner = protectStemCaps && !isRoundUCap && rawPin[centerI] && (leftStraight && rightStraight) &&
      Math.min(distPrev, distNext) >= 4 && Math.min(distPrev, distNext) <= 22 &&
      Math.max(armTurnRad, nearTurnRad) >= 1.28;
    const isRoundEndArc = !isStrokeCap && !isStemCapCorner && cornerMode !== 'sharp' && !(leftStraight && rightStraight) && !!(
      cFit && cFit.r >= 1.4 && cFit.r <= 90 &&
      cFit.rms <= Math.max(0.20, cFit.r * 0.045) &&
      activeArcSteps >= 4 &&
      (cFit.rms <= wedgeRms * 0.88 || conc < 0.58)
    );

    const isLineToCurve = (leftStraight && !rightStraight) || (!leftStraight && rightStraight);
    const lcAngleThr = (38 - lcSens * 20) * Math.PI / 180;

    let isSharp = false;
    let lockedTangent = null;

    if (pk.capApex) {
      isSharp = true;
      apexPt = pk.capApex;
    } else if (isStrokeCap || isStaircaseFacet || isGenuineSmoothArc || isRoundEndArc) {
      isSharp = false;
    } else if (isStrongPolygonWedge || isCurvCusp) {
      isSharp = true;
    } else if (isLineToCurve) {
      const straightDir = leftStraight ? fL.d : fR.d;
      const effLcThr = cornerMode === 'organic' ? Math.max(lcAngleThr, 0.72) : lcAngleThr;
      if (Math.max(armTurnRad, nearTurnRad) >= effLcThr && (dPerp <= (cornerMode === 'organic' ? 1.25 : 1.65) || microTurn[centerI] >= (cornerMode === 'organic' ? 0.52 : 0.34) || nearTurnRad >= (cornerMode === 'organic' ? 0.68 : 0.48))) {
        isSharp = true;
      } else {
        isSharp = false;
        lockedTangent = [straightDir[0], straightDir[1]];
      }
    } else if (effTurn >= sharpThrRad * (cornerMode === 'organic' ? 0.82 : 0.66)) {
      if (leftStraight && rightStraight && armTurnRad >= (cornerMode === 'organic' ? 0.56 : 0.44) && (dPerp <= 2.25 || rEff <= 2.50 || conc >= 0.44)) {
        isSharp = true;
      } else if (nearTurnRad >= (cornerMode === 'organic' ? 0.78 : 0.62) && conc >= (cornerMode === 'organic' ? 0.62 : 0.54) && dPerp <= 1.35 && sagRatio4 >= 0.24) {
        isSharp = true;
      } else if (armTurnRad >= (cornerMode === 'organic' ? 1.02 : 0.88) && microTurn[centerI] >= (cornerMode === 'organic' ? 0.56 : 0.44) && rEff <= 1.65) {
        isSharp = true;
      } else if (cornerMode === 'sharp' && effTurn >= sharpThrRad * 0.78 && conc >= 0.40) {
        isSharp = true;
      }
    }

    let filletShoulders = null;
    if (isSharp && cornerMode !== 'sharp' && !pk.capApex) {
      const fil = filletSupport(pts, centerI, rawPeakSet);
      if (fil && (!isStrongPolygonWedge || (fil.r >= 4.2 && fil.t >= 3.8 && fil.rmsF <= 0.42 * fil.rmsW))) {
        isSharp = false;
        const shStep = clamp(Math.round(fil.t), 3, Math.min(14, Math.min(distPrev, distNext) - 1));
        if (shStep >= 3) {
          filletShoulders = {
            iL: idx(centerI - shStep),
            iR: idx(centerI + shStep),
            tL: fL ? [fL.d[0], fL.d[1]] : null,
            tR: fR ? [fR.d[0], fR.d[1]] : null
          };
        }
      }
      if (isSharp && !isStrongPolygonWedge && !isLineToCurve && !isStemCapCorner) {
        const css = cssCornerPersistence(smMicro, centerI, rawPeakSet);
        if (css && css.t3 >= 0.45 && css.rho < 0.62) isSharp = false;
      }
    }

    cands.push({
      i: centerI,
      sharp: isSharp,
      apexPt: (isSharp || isStrokeCap) ? apexPt : null,
      lockedTangent,
      filletShoulders,
      turn: effTurn,
      sign: pk.sign,
      leftStraight,
      rightStraight,
      isStrokeCap,
      isCurvCusp
    });
  }

  /* Pasca-validasi kelompok:
     1) Uji terlebih dahulu apakah pasangan 2 kandidat searah berjarak <= 18 langkah adalah Round U-Cap (ujung garis bulat G1)
        ATAU Inward V-Cusp (lekuk V lancip seperti poni rambut / lekuk daun) sebelum menahan 2 sudut C0! */
  if (cornerMode !== 'sharp' && cands.length >= 2) {
    const cn = cands.length;
    const seen = new Uint8Array(cn);
    for (let s0 = 0; s0 < cn; s0++) {
      const c0 = cands[s0];
      if (seen[s0] || !c0.sharp || c0.forced) continue;
      const grp = [s0];
      let accTurn = c0.turn;
      for (let q = 1; q < cn; q++) {
        const cj = cands[(s0 + q) % cn], cp = cands[(s0 + q - 1) % cn];
        if (!cj.sharp || cj.forced || cj.sign !== c0.sign) break;
        if ((cj.i - cp.i + n) % n > 10 || (cj.i - c0.i + n) % n > 20) break;
        if (accTurn + cj.turn > 2.45) break;
        accTurn += cj.turn;
        grp.push((s0 + q) % cn);
      }
      for (const g of grp) seen[g] = 1;
      if (grp.length < 2) continue;
      const first = cands[grp[0]].i, last = cands[grp[grp.length - 1]].i;
      let totalGrpTurn = 0, allStrongCorners = true;
      for (const g of grp) {
        totalGrpTurn += cands[g].turn;
        if (Math.max(microTurn[cands[g].i], fineTurn[cands[g].i]) < 0.52) allStrongCorners = false;
      }
      const spanCap = (last - first + n) % n;
      const bridgePts = [];
      const padB = spanCap >= 6 ? 2 : 1;
      for (let s = padB; s <= spanCap - padB; s++) bridgePts.push(pts[idx(first + s)]);
      const flBridge = bridgePts.length >= 3 ? fitLine2D(bridgePts) : null;
      const chX = pts[last][0] - pts[first][0], chY = pts[last][1] - pts[first][1], chL = Math.hypot(chX, chY) || 1;
      const midCap = idx(first + Math.round(spanCap * 0.5));
      const midBulge = Math.abs((pts[midCap][0] - pts[first][0]) * (-chY / chL) + (pts[midCap][1] - pts[first][1]) * (chX / chL));
      const isFlatBridgeCap = !!(flBridge && flBridge.rms <= 0.10 && flBridge.maxDev <= 0.18 && midBulge <= Math.max(0.32, chL * 0.08));

      /* Uji Round U-Cap (ujung garis bulat / ujung jari / ujung kapsul) terlebih dahulu! */
      if (grp.length === 2 && spanCap <= 18 && !isFlatBridgeCap) {
        const capPts = [];
        for (let s = -3; s <= spanCap + 3; s++) capPts.push(smFine[idx(first + s)]);
        const cfCap = fitCircle2D(capPts);
        if (cfCap && cfCap.r >= 1.5 && cfCap.r <= 24 && cfCap.rms <= Math.max(0.24, cfCap.r * 0.045) && midBulge >= Math.max(0.30, chL * 0.12)) {
          for (const g of grp) { cands[g].sharp = false; cands[g].apexPt = null; }
          smoothKnots[midCap] = 1;
          knotTangents.set(midCap, smoothTangentClosed(smFine, midCap, 5));
          smoothKnots[first] = 1;
          knotTangents.set(first, smoothTangentClosed(smFine, first, 4));
          smoothKnots[last] = 1;
          knotTangents.set(last, smoothTangentClosed(smFine, last, 4));
          continue;
        }
      }
      if (protectStemCaps && grp.length === 2 && isFlatBridgeCap && flBridge) {
        for (const g of grp) {
          const P = cands[g].apexPt || pts[cands[g].i];
          const proj = (P[0] - flBridge.c[0]) * flBridge.d[0] + (P[1] - flBridge.c[1]) * flBridge.d[1];
          const qx = flBridge.c[0] + flBridge.d[0] * proj, qy = flBridge.c[1] + flBridge.d[1] * proj;
          if (Math.hypot(qx - pts[cands[g].i][0], qy - pts[cands[g].i][1]) <= 0.85) {
            cands[g].apexPt = [qx, qy];
          }
        }
        continue;
      }
      const mid = (first + Math.round(((last - first + n) % n) / 2)) % n;
      const othersG = new Set(rawPeakSet);
      for (const g of grp) othersG.delete(cands[g].i);
      let reject = !!filletSupport(smMicro, mid, othersG);
      if (!reject) {
        const css = cssCornerPersistence(smMicro, mid, othersG);
        reject = !!(css && css.t3 >= 0.5 && css.rho < 0.60);
      }
      if (reject) for (const g of grp) { cands[g].sharp = false; cands[g].apexPt = null; }
    }
  }

  const mc = cands.length;
  const skip = new Uint8Array(mc);
  for (let k = 0; k < mc; k++) {
    if (skip[k]) continue;
    const a = cands[k], b = cands[(k + 1) % mc];
    const prev = cands[(k - 1 + mc) % mc], next = cands[(k + 2) % mc];
    const distAB = (b.i - a.i + n) % n;
    const distPrev = (a.i - prev.i + n) % n;
    const distNext = (next.i - b.i + n) % n;

    if (mc >= 3 && distAB > 0 && distAB <= 9 && a.sign === b.sign && !(juncFlags && (juncFlags[a.i] || juncFlags[b.i]))) {
      /* Konsolidasi Sudut Poligon Tunggal yang Tumpul/Terpotong (Chamfered Single Polygon Corner, mis. sudut 45° pita diagonal):
         Jika 2 kandidat searah berjarak <= 9 langkah diapit oleh dua lengan lurus panjang (distPrev >= 11, distNext >= 11)
         yang TIDAK berlawanan arah 180° (antiDot > -0.84, bukan stem cap), lebur menjadi 1 sudut tajam di perpotongan kedua garis! */
      if (distPrev >= Math.max(11, distAB * 2) && distNext >= Math.max(11, distAB * 2)) {
        const inPtsL = [], outPtsR = [];
        const maxInL = Math.min(18, distPrev - 2), maxOutR = Math.min(18, distNext - 2);
        for (let s = maxInL; s >= 2; s--) inPtsL.push(pts[idx(a.i - s)]);
        for (let s = 2; s <= maxOutR; s++) outPtsR.push(pts[idx(b.i + s)]);
        const fInLong = fitLine2D(inPtsL), fOutLong = fitLine2D(outPtsR);
        if (fInLong && fOutLong && fInLong.rms <= 0.20 && fOutLong.rms <= 0.20 && fInLong.span >= 6.0 && fOutLong.span >= 6.0) {
          const ux1 = fInLong.d[0], uy1 = fInLong.d[1];
          const ux2 = fOutLong.d[0], uy2 = fOutLong.d[1];
          const antiDot = ux1 * ux2 + uy1 * uy2;
          const detLong = ux1 * uy2 - uy1 * ux2;
          if (antiDot > -0.84 && Math.abs(detLong) >= 0.32) {
            const wxL = fOutLong.c[0] - fInLong.c[0], wyL = fOutLong.c[1] - fInLong.c[1];
            const tL = (wxL * uy2 - wyL * ux2) / detLong;
            const axL = fInLong.c[0] + ux1 * tL, ayL = fInLong.c[1] + uy1 * tL;
            const midIdx = (a.i + (distAB >> 1)) % n;
            const midPt = pts[midIdx];
            if (Math.hypot(axL - midPt[0], ayL - midPt[1]) <= 3.2) {
              corners[midIdx] = 1;
              apexMap.set(midIdx, [axL, ayL]);
              skip[k] = 1;
              skip[(k + 1) % mc] = 1;
              continue;
            }
          }
        }
      }
    }
    if (mc >= 3 && distAB > 0 && distAB <= 6 && a.sign === b.sign && !(juncFlags && (juncFlags[a.i] || juncFlags[b.i]))) {
      const midIdx = (a.i + (distAB >> 1)) % n;
      const pM6 = pts[idx(midIdx - 6)], pP6 = pts[idx(midIdx + 6)];
      const wCap = Math.hypot(pts[b.i][0] - pts[a.i][0], pts[b.i][1] - pts[a.i][1]);
      const wBack = Math.hypot(pP6[0] - pM6[0], pP6[1] - pM6[1]);

      /* Konsolidasi Lekuk V Dalam (Inward V-Cusp / Ujung Daun Lancip):
         Jika 2 kandidat berjarak <= 5 langkah memiliki lengan belakang yang melebar (wBack >= wCap * 1.45, wCap <= 3.8),
         satukan keduanya menjadi 1 puncak tajam C0 tunggal agar lembah poni rambut & lekuk daun tidak tumpul rata! */
      if ((a.isCurvCusp || b.isCurvCusp || (wCap <= 3.8 && wBack >= wCap * 1.45)) && (a.turn + b.turn >= 1.05)) {
        corners[midIdx] = 1;
        const armInPts = [], armOutPts = [];
        for (let s = 5; s >= 1; s--) armInPts.push(pts[idx(a.i - s)]);
        for (let s = 1; s <= 5; s++) armOutPts.push(pts[idx(b.i + s)]);
        const fInV = fitLine2D(armInPts), fOutV = fitLine2D(armOutPts);
        const midPt = [0.5 * (pts[a.i][0] + pts[b.i][0]), 0.5 * (pts[a.i][1] + pts[b.i][1])];
        let vApex = null;
        if (fInV && fOutV) {
          const detV = fInV.d[0] * fOutV.d[1] - fInV.d[1] * fOutV.d[0];
          if (Math.abs(detV) > 0.15) {
            const wxV = fOutV.c[0] - fInV.c[0], wyV = fOutV.c[1] - fInV.c[1];
            const tV = (wxV * fOutV.d[1] - wyV * fOutV.d[0]) / detV;
            const axV = fInV.c[0] + fInV.d[0] * tV, ayV = fInV.c[1] + fInV.d[1] * tV;
            if (Math.hypot(axV - midPt[0], ayV - midPt[1]) <= 1.35) vApex = [axV, ayV];
          }
        }
        if (!vApex) {
          const backMid = [0.5 * (pM6[0] + pP6[0]), 0.5 * (pM6[1] + pP6[1])];
          const outDx = midPt[0] - backMid[0], outDy = midPt[1] - backMid[1];
          const outLen = Math.hypot(outDx, outDy) || 1;
          vApex = [midPt[0] + (outDx / outLen) * 0.50, midPt[1] + (outDy / outLen) * 0.50];
        }
        apexMap.set(midIdx, vApex);
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
      if (a.isStrokeCap || b.isStrokeCap || (wCap <= 3.8 && wBack <= 5.6)) {
        smoothKnots[midIdx] = 1;
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
      if (a.sharp && b.sharp) continue;
      if (protectStemCaps && (a.sharp || b.sharp || a.leftStraight || b.rightStraight)) continue;
      if (false) {
        corners[midIdx] = 1;
        const midPt = [0.5 * (pts[a.i][0] + pts[b.i][0]), 0.5 * (pts[a.i][1] + pts[b.i][1])];
        const backMid = [0.5 * (pM6[0] + pP6[0]), 0.5 * (pM6[1] + pP6[1])];
        const outDx = midPt[0] - backMid[0], outDy = midPt[1] - backMid[1];
        const outLen = Math.hypot(outDx, outDy) || 1;
        apexMap.set(midIdx, [midPt[0] + (outDx / outLen) * 0.50, midPt[1] + (outDy / outLen) * 0.50]);
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
      if (a.sharp && b.sharp) continue;
      if (protectStemCaps && (a.sharp || b.sharp || a.leftStraight || b.rightStraight)) continue;
      if (Math.min(distPrev, distNext) > distAB * 2.4 && (!a.sharp && !b.sharp)) {
        smoothKnots[midIdx] = 1;
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
    }
  }

  /* Hanya terima kandidat sudut tajam C0 sejati, atau simpul G1 yang memiliki lockedTangent / strokeCap!
     Kandidat riak tangga piksel yang ditolak (c.sharp === false) TIDAK boleh dijadikan smoothKnot sembarangan */
  for (let k = 0; k < mc; k++) {
    if (skip[k]) continue;
    const c = cands[k];
    if (c.sharp && !c.forced && juncFlags && n >= 16) {
      /* Jangan buat sudut tajam C0 palsu tepat di sebelah T-junction (jarak <= 3 langkah / <= 3.2 px)
         karena akan memicu segmen garis lurus mikro (L stub 1-2 px) di ujung busur! */
      let nearJunc = false;
      for (let d = -3; d <= 3; d++) {
        if (d === 0) continue;
        const j = idx(c.i + d);
        if (juncFlags[j] && Math.hypot(pts[c.i][0] - pts[j][0], pts[c.i][1] - pts[j][1]) <= 3.4) {
          nearJunc = true;
          break;
        }
      }
      if (nearJunc) continue;
    }
    if (c.sharp) {
      corners[c.i] = 1;
      if (c.apexPt && (!juncFlags || !juncFlags[c.i])) apexMap.set(c.i, c.apexPt);
    } else if (c.filletShoulders) {
      const { iL, iR, tL, tR } = c.filletShoulders;
      if (!corners[iL]) {
        smoothKnots[iL] = 1;
        if (tL) knotTangents.set(iL, tL);
      }
      if (!corners[iR]) {
        smoothKnots[iR] = 1;
        if (tR) knotTangents.set(iR, tR);
      }
    } else if (c.isStrokeCap || c.lockedTangent) {
      smoothKnots[c.i] = 1;
      if (c.isStrokeCap && c.apexPt) apexMap.set(c.i, c.apexPt);
      if (c.lockedTangent) knotTangents.set(c.i, c.lockedTangent);
    }
  }

  /* Penempatan Simpul Ekstremum Kardinal Lokal (Local Cardinal Extrema Placement):
     Menempatkan simpul G1 dengan garis singgung horizontal/vertikal murni tepat di puncak lengkungan
     (seperti puncak busur dalam huruf 'e', mangkuk 'c', 'C', 'G', 'o', 'O', 's', 'S', 'a', 'b', 'd', 'p', 'q', 'u') */
  if (extremumAlign && n >= 12) {
    const measurePlateau = (arr, i0, axis, sign) => {
      const v0 = arr[i0][axis];
      let dL = 0, dR = 0;
      const maxPlat = Math.min(20, n >> 2);
      while (dL < maxPlat && sign * (arr[idx(i0 - dL - 1)][axis] - v0) <= 0.045) dL++;
      while (dR < maxPlat && sign * (arr[idx(i0 + dR + 1)][axis] - v0) <= 0.045) dR++;
      const ei = idx(i0 + Math.round((dR - dL) * 0.5));
      const flatSpan = dL + dR;
      return { ei, flatSpan };
    };
    const minDistToCorner = idxCand => {
      let md = n;
      for (let j = 0; j < n; j++) {
        if (corners[j] || (juncFlags && juncFlags[j])) {
          const d = Math.min((idxCand - j + n) % n, (j - idxCand + n) % n);
          if (d < md) md = d;
        }
      }
      return md;
    };
    const minDistToSmooth = idxCand => {
      let md = n;
      for (let j = 0; j < n; j++) {
        if (smoothKnots[j]) {
          const d = Math.min((idxCand - j + n) % n, (j - idxCand + n) % n);
          if (d < md) md = d;
        }
      }
      return md;
    };

    const wLocal = clamp(Math.round(n / 28), 4, 12);
    const reach = clamp(Math.round(n / 15), 7, 26);
    const extCands = [];
    for (let axis = 0; axis < 2; axis++) {
      for (const sign of [1, -1]) {
        for (let i = 0; i < n; i++) {
          const v0 = smFine[i][axis];
          let isExt = true;
          for (let s = 1; s <= wLocal; s++) {
            const vPrev = smFine[idx(i - s)][axis];
            const vNext = smFine[idx(i + s)][axis];
            if (sign * (vPrev - v0) < -1e-5 || sign * (vNext - v0) < -1e-5) {
              isExt = false;
              break;
            }
          }
          if (!isExt) continue;
          const { ei, flatSpan } = measurePlateau(smFine, i, axis, sign);
          if (flatSpan > 14) continue; /* Abaikan segmen garis lurus mendatar/tegak */
          const dCorner = minDistToCorner(ei);
          if (dCorner < (isMicroGlyph ? 4 : 8)) continue;
          const effReach = Math.min(reach, dCorner - 1);
          if (effReach < (isMicroGlyph ? 4 : 6)) continue;
          const vei = smFine[ei][axis];
          const promL = sign * (smFine[idx(ei - effReach)][axis] - vei);
          const promR = sign * (smFine[idx(ei + effReach)][axis] - vei);
          if (Math.min(promL, promR) < 0.65 || Math.max(promL, promR) < 1.10) continue;
          const winPts = [];
          for (let s = -effReach; s <= effReach; s++) winPts.push(smFine[idx(ei + s)]);
          const lf = fitLine2D(winPts);
          const cf = fitCircle2D(winPts);
          if (!lf || lf.rms < 0.14 || (cf && cf.rms > lf.rms * 0.82)) continue;
          extCands.push({ ei, axis, sign, prom: Math.min(promL, promR), r: cf ? cf.r : 99 });
        }
      }
    }

    extCands.sort((a, b) => b.prom - a.prom);
    for (const ec of extCands) {
      let { ei, axis, r } = ec;
      if (minDistToCorner(ei) < (isMicroGlyph ? 4 : 8) || minDistToSmooth(ei) < (isMicroGlyph ? 6 : 16)) continue;
      let tooCloseChord = false;
      for (let j = 0; j < n; j++) {
        if (smoothKnots[j] || corners[j]) {
          if (Math.hypot(smFine[ei][0] - smFine[j][0], smFine[ei][1] - smFine[j][1]) < (isMicroGlyph ? 3.8 : 9.5)) {
            tooCloseChord = true;
            break;
          }
        }
      }
      if (tooCloseChord) continue;
      if (r <= 10.5) {
        let bestK = ei, bestTurn = -1;
        for (let d = -5; d <= 5; d++) {
          const cand = idx(ei + d);
          const tCand = Math.abs(turnOn(smFine, cand, 4));
          if (tCand > bestTurn) { bestTurn = tCand; bestK = cand; }
        }
        ei = bestK;
        if (minDistToCorner(ei) < (isMicroGlyph ? 4 : 8) || minDistToSmooth(ei) < (isMicroGlyph ? 6 : 14)) continue;
        smoothKnots[ei] = 1;
        knotTangents.set(ei, smoothTangentClosed(smFine, ei, 5));
        continue;
      }
      smoothKnots[ei] = 1;
      const dx = smFine[idx(ei + 4)][0] - smFine[idx(ei - 4)][0];
      const dy = smFine[idx(ei + 4)][1] - smFine[idx(ei - 4)][1];
      const empT = smoothTangentClosed(smFine, ei, 6);
      if (axis === 1) {
        const cardT = [dx >= 0 ? 1 : -1, 0];
        if (empT[0] * cardT[0] >= 0.985 && r >= 12) knotTangents.set(ei, cardT);
        else knotTangents.set(ei, empT);
      } else {
        const cardT = [0, dy >= 0 ? 1 : -1];
        if (empT[1] * cardT[1] >= 0.985 && r >= 12) knotTangents.set(ei, cardT);
        else knotTangents.set(ei, empT);
      }
    }
  }

  /* Deteksi Puncak U-Cap Bulat (Ujung Jari, Ujung Senyum, & Lembah Jari Halus):
     Jika terdapat belokan U mulus (turn L=6 >= 1.35 rad) tanpa sudut tajam C0 atau smoothKnot di dekatnya,
     tempatkan tepat 1 simpul G1 di puncak belokan dengan garis singgung empiris alami! */
  if (n >= 24) {
    for (let i = 0; i < n; i++) {
      const t6 = Math.abs(turnOn(smFine, i, 6));
      if (t6 < 1.35) continue;
      let isPeak = true;
      for (let d = -6; d <= 6; d++) {
        if (d !== 0 && Math.abs(turnOn(smFine, idx(i + d), 6)) > t6 + 1e-6) { isPeak = false; break; }
      }
      if (!isPeak) continue;
      let nearAny = false;
      for (let d = -10; d <= 10; d++) {
        const k = idx(i + d);
        if (corners[k] || smoothKnots[k]) { nearAny = true; break; }
      }
      if (nearAny) continue;
      const capWin = [];
      for (let d = -6; d <= 6; d++) capWin.push(smFine[idx(i + d)]);
      const cf = fitCircle2D(capWin);
      if (cf && cf.r >= 1.6 && cf.r <= 14.0 && cf.rms <= Math.max(0.28, cf.r * 0.055)) {
        smoothKnots[i] = 1;
        knotTangents.set(i, smoothTangentClosed(smFine, i, 5));
      }
    }
  }

  return { corners, smoothKnots, apexMap, knotTangents };
}

function detectCorners(pts, angleDeg = 44, lookahead = 4, juncFlags = null, advOpt = {}) {
  return detectCornersAndExtrema(pts, angleDeg, juncFlags, advOpt).corners;
}

function oneSidedTangentOpen(pts, atStart = true, maxSpanPx = 9.0) {
  const n = pts.length;
  if (n < 2) return [1, 0];
  if (n === 2) {
    const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }
  const P0 = atStart ? pts[0] : pts[n - 1];
  const sArr = [0];
  const pArr = [P0];
  let accS = 0;
  const maxK = Math.min(n - 1, 16);
  for (let k = 1; k <= maxK; k++) {
    const prev = atStart ? pts[k - 1] : pts[n - k];
    const cur = atStart ? pts[k] : pts[n - 1 - k];
    const ds = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    if (ds < 1e-5) continue;
    accS += ds;
    sArr.push(accS);
    pArr.push(cur);
    if (accS >= maxSpanPx && sArr.length >= 5) break;
  }
  if (sArr.length < 3) {
    const P1 = pArr[pArr.length - 1];
    const dx = atStart ? (P1[0] - P0[0]) : (P0[0] - P1[0]);
    const dy = atStart ? (P1[1] - P0[1]) : (P0[1] - P1[1]);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  /* Jika segmen lokal sangat cocok dengan busur lingkaran (mis. busur dalam huruf e),
     gunakan garis singgung analitik lingkaran pada titik ujung P0 */
  if (pArr.length >= 5) {
    const cf = fitCircle2D(pArr);
    const lf = fitLine2D(pArr);
    if (cf && cf.r >= 2.2 && cf.r <= 220 && cf.rms <= 0.16 && (!lf || cf.rms < lf.rms * 0.65)) {
      const rx = P0[0] - cf.cx, ry = P0[1] - cf.cy, rl = Math.hypot(rx, ry) || 1;
      const Pmid = pArr[Math.min(3, pArr.length - 1)];
      const dirX = Pmid[0] - P0[0], dirY = Pmid[1] - P0[1];
      let tx = -ry / rl, ty = rx / rl;
      if (tx * dirX + ty * dirY < 0) { tx = -tx; ty = -ty; }
      if (!atStart) { tx = -tx; ty = -ty; }
      return [tx, ty];
    }
  }

  /* Regresi kuadratik berbobot s * exp(-s/sigma) agar derau sub-piksel di s=1px tidak membelokkan garis singgung */
  let sw = 0, sws = 0, sws2 = 0;
  let swVx = 0, swVy = 0, swsVx = 0, swsVy = 0;
  for (let i = 1; i < sArr.length; i++) {
    const s = sArr[i];
    const vx = (pArr[i][0] - P0[0]) / s;
    const vy = (pArr[i][1] - P0[1]) / s;
    const w = Math.min(s, 3.0) * Math.exp(-s / (maxSpanPx * 0.62));
    sw += w;
    sws += w * s;
    sws2 += w * s * s;
    swVx += w * vx;
    swVy += w * vy;
    swsVx += w * s * vx;
    swsVy += w * s * vy;
  }
  const det = sw * sws2 - sws * sws;
  let tx, ty;
  const meanVx = swVx / (sw || 1), meanVy = swVy / (sw || 1);
  if (Math.abs(det) > 1e-6) {
    tx = (sws2 * swVx - sws * swsVx) / det;
    ty = (sws2 * swVy - sws * swsVy) / det;
    /* Batasi deviasi ekstrapolasi kuadratik terhadap arah sekant rata-rata terdekat (maks ~22 derajat) */
    const ml = Math.hypot(meanVx, meanVy) || 1;
    const tl = Math.hypot(tx, ty) || 1;
    const dotM = (tx * meanVx + ty * meanVy) / (tl * ml);
    if (dotM < 0.92) {
      tx = 0.55 * (tx / tl) + 0.45 * (meanVx / ml);
      ty = 0.55 * (ty / tl) + 0.45 * (meanVy / ml);
    }
  } else {
    tx = meanVx;
    ty = meanVy;
  }
  if (!atStart) {
    tx = -tx;
    ty = -ty;
  }
  const l = Math.hypot(tx, ty) || 1;
  return [tx / l, ty / l];
}

function detectMaximalStraightSpans(pts, corners, smoothKnots, knotTangents, juncFlags, lineStr = 0.65, preStraight = null, axisSnapOn = true, axisSnapDeg = 2.3) {
  const n = pts.length;
  const onStraight = new Uint8Array(n);
  if (n < 12 || lineStr <= 0.1) return onStraight;
  const isHardJunc = k => !!(juncFlags && juncFlags[k] === 1);
  let minX_s = Infinity, maxX_s = -Infinity, minY_s = Infinity, maxY_s = -Infinity;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (p[0] < minX_s) minX_s = p[0]; if (p[0] > maxX_s) maxX_s = p[0];
    if (p[1] < minY_s) minY_s = p[1]; if (p[1] > maxY_s) maxY_s = p[1];
  }
  const isSmallLoop = Math.hypot(maxX_s - minX_s, maxY_s - minY_s) <= 38 || n <= 115;

  const idx = k => ((k % n) + n) % n;
  const seedLen = isSmallLoop ? 6 : 9;
  const seedRmsTol = 0.036 + lineStr * 0.018;
  const seedDevTol = 0.070 + lineStr * 0.028;

  const isSeed = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const win = [];
    let hasCornerInside = false;
    for (let s = 0; s < seedLen; s++) {
      const k = idx(i + s);
      if ((preStraight && preStraight[k]) || (s > 0 && s < seedLen - 1 && (corners[k] || isHardJunc(k)))) {
        hasCornerInside = true; break;
      }
      win.push(pts[k]);
    }
    if (hasCornerInside) continue;
    const fl = fitLine2D(win);
    if (!fl || fl.span < (isSmallLoop ? 3.2 : 5.2) || fl.rms > seedRmsTol || fl.maxDev > seedDevTol) continue;
    const P0 = win[0], P1 = win[seedLen - 1], PM = win[seedLen >> 1];
    const ch = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) || 1;
    const sag = Math.abs((PM[0] - P0[0]) * (P1[1] - P0[1]) - (PM[1] - P0[1]) * (P1[0] - P0[0])) / ch;
    if (sag <= 0.055) isSeed[i] = 1;
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      if (!isSeed[i] || isSeed[idx(i + 1)]) continue;
      let gap = 0, hitCorner = false;
      while (gap < 18 && !isSeed[idx(i + 1 + gap)]) {
        const k = idx(i + 1 + gap);
        if ((preStraight && preStraight[k]) || corners[k] || isHardJunc(k)) { hitCorner = true; break; }
        gap++;
      }
      if (hitCorner || gap === 0 || gap > 16 || !isSeed[idx(i + 1 + gap)]) continue;
      const testPts = [];
      for (let s = -2; s <= gap + seedLen + 1; s++) {
        const k = idx(i + s);
        if (s > 0 && s < gap + seedLen && (corners[k] || isHardJunc(k))) { hitCorner = true; break; }
        testPts.push(pts[k]);
      }
      if (hitCorner) continue;
      const fl = fitLine2D(testPts);
      if (fl && fl.rms <= seedRmsTol * 1.38 && fl.maxDev <= seedDevTol * 1.55) {
        for (let s = 1; s <= gap; s++) isSeed[idx(i + s)] = 1;
      }
    }
  }

  const visited = new Uint8Array(n);
  const spans = [];
  for (let i = 0; i < n; i++) {
    if (!isSeed[i] || visited[i]) continue;
    let start = i;
    while (isSeed[idx(start - 1)] && !visited[idx(start - 1)] && !corners[start] && !isHardJunc(start)) {
      start = idx(start - 1);
      if (start === i) break;
    }
    let end = idx(start + seedLen - 1);
    let curSeed = start;
    visited[curSeed] = 1;
    while (isSeed[idx(curSeed + 1)] && !visited[idx(curSeed + 1)]) {
      const nextSeed = idx(curSeed + 1);
      if (corners[idx(curSeed + seedLen - 1)] || isHardJunc(idx(curSeed + seedLen - 1))) break;
      const len = ((idx(nextSeed + seedLen - 1) - start + n) % n) + 1;
      if (len >= n - 2) break;
      if (len >= 22) {
        const trim = Math.min(8, Math.floor(len * 0.2));
        const testPts = [];
        for (let s = trim; s < len - trim; s++) testPts.push(pts[idx(start + s)]);
        const fl = fitLine2D(testPts);
        if (!fl || fl.rms > seedRmsTol * 1.42 || fl.maxDev > seedDevTol * 1.58) break;
      }
      visited[nextSeed] = 1;
      curSeed = nextSeed;
      end = idx(curSeed + seedLen - 1);
    }

    let spanLen = ((end - start + n) % n) + 1;
    if (spanLen < (isSmallLoop ? 7 : 14)) continue;

    const pad = Math.max(2, Math.floor(spanLen * 0.2));
    const corePts = [];
    for (let s = pad; s < spanLen - pad; s++) corePts.push(pts[idx(start + s)]);
    const coreLine = fitLine2D(corePts);
    if (!coreLine || coreLine.rms > 0.045) continue;

    /* Perluas start mundur & end maju selama titik masih berada pada coreLine
       (mencegah rentang lurus berhenti terlalu dini akibat riak sub-piksel 0.03px sebelum busur) */
    const extDevTol = Math.max(0.085, coreLine.rms * 3.4);
    while (spanLen < n - 4 && !corners[start] && !isHardJunc(start)) {
      const prevIdx = idx(start - 1);
      if (corners[prevIdx] || isHardJunc(prevIdx)) break;
      const p = pts[prevIdx], pCur = pts[start];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      const stepDx = pCur[0] - p[0], stepDy = pCur[1] - p[1], stepL = Math.hypot(stepDx, stepDy) || 1;
      const dot = (stepDx * coreLine.d[0] + stepDy * coreLine.d[1]) / stepL;
      if (dev <= extDevTol && dot >= 0.88) { start = prevIdx; spanLen++; } else break;
    }
    while (spanLen < n - 4 && !corners[end] && !isHardJunc(end)) {
      const nextIdx = idx(end + 1);
      if (corners[nextIdx] || isHardJunc(nextIdx)) break;
      const p = pts[nextIdx], pCur = pts[end];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      const stepDx = p[0] - pCur[0], stepDy = p[1] - pCur[1], stepL = Math.hypot(stepDx, stepDy) || 1;
      const dot = (stepDx * coreLine.d[0] + stepDy * coreLine.d[1]) / stepL;
      if (dev <= extDevTol && dot >= 0.88) { end = nextIdx; spanLen++; } else break;
    }

    const trimDevTol = Math.max(0.038, coreLine.rms * 1.65);
    while (spanLen > 10 && !corners[start] && !isHardJunc(start)) {
      const p = pts[start];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      if (dev > trimDevTol) { start = idx(start + 1); spanLen--; } else break;
    }
    while (spanLen > 10 && !corners[end] && !isHardJunc(end)) {
      const p = pts[end];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      if (dev > trimDevTol) { end = idx(end - 1); spanLen--; } else break;
    }

    /* Tarik ujung rentang lurus ke sudut tajam C0 terdekat HANYA JIKA sudut tersebut benar-benar terletak pada garis coreLine
       (bukan puncak/apex ujung U-cap sempit yang berjarak > 0.26 px ke samping garis lurus!) */
    const maxCornerLineDev = Math.max(0.26, coreLine.rms * 4.5);
    for (let d = 1; d <= 14; d++) {
      const candS = idx(start - d);
      if (corners[candS] || isHardJunc(candS)) {
        const P = pts[candS];
        const devC = Math.abs((P[0] - coreLine.c[0]) * coreLine.d[1] - (P[1] - coreLine.c[1]) * coreLine.d[0]);
        let maxNeck = devC;
        for (let s = 1; s < d; s++) {
          const Q = pts[idx(candS + s)];
          const dv = Math.abs((Q[0] - coreLine.c[0]) * coreLine.d[1] - (Q[1] - coreLine.c[1]) * coreLine.d[0]);
          if (dv > maxNeck) maxNeck = dv;
        }
        const allowNeck = (d <= 8 && corners[candS]) ? 1.35 : maxCornerLineDev;
        if (maxNeck <= allowNeck && devC <= (d <= 8 ? 1.15 : maxCornerLineDev)) start = candS;
        break;
      }
      if (d <= 6 && corners[idx(start + d)]) { start = idx(start + d); break; }
    }
    for (let d = 1; d <= 14; d++) {
      const candE = idx(end + d);
      if (corners[candE] || isHardJunc(candE)) {
        const P = pts[candE];
        const devC = Math.abs((P[0] - coreLine.c[0]) * coreLine.d[1] - (P[1] - coreLine.c[1]) * coreLine.d[0]);
        let maxNeck = devC;
        for (let s = 1; s < d; s++) {
          const Q = pts[idx(end + s)];
          const dv = Math.abs((Q[0] - coreLine.c[0]) * coreLine.d[1] - (Q[1] - coreLine.c[1]) * coreLine.d[0]);
          if (dv > maxNeck) maxNeck = dv;
        }
        const allowNeck = (d <= 8 && corners[candE]) ? 1.35 : maxCornerLineDev;
        if (maxNeck <= allowNeck && devC <= (d <= 8 ? 1.15 : maxCornerLineDev)) end = candE;
        break;
      }
      if (d <= 6 && corners[idx(end - d)]) { end = idx(end - d); break; }
    }

    /* Snap ke titik singgung lingkaran busur tetangga TANPA menggeser start/end masuk ke dalam bahu busur
       (d >= 0 untuk start, d <= 0 untuk end) agar tidak mengontaminasi finalPts */
    let snapStartPt = null, snapEndPt = null;
    if (!corners[start] && !isHardJunc(start)) {
      const arcBefore = [];
      for (let s = 14; s >= 1; s--) arcBefore.push(pts[idx(start - s)]);
      const cf = fitCircle2D(arcBefore);
      if (cf && cf.r >= 10.0 && cf.r <= 220 && cf.rms <= 0.11) {
        const projT = (cf.cx - coreLine.c[0]) * coreLine.d[0] + (cf.cy - coreLine.c[1]) * coreLine.d[1];
        const tx = coreLine.c[0] + coreLine.d[0] * projT;
        const ty = coreLine.c[1] + coreLine.d[1] * projT;
        let bestS = start, bestD = Infinity;
        for (let d = 0; d <= 4; d++) {
          const cand = idx(start + d);
          if (corners[cand]) continue;
          const dist = Math.hypot(pts[cand][0] - tx, pts[cand][1] - ty);
          if (dist < bestD) { bestD = dist; bestS = cand; }
        }
        if (bestD <= 1.5) {
          start = bestS;
          snapStartPt = [tx, ty];
        }
      }
    }
    if (!corners[end] && !isHardJunc(end)) {
      const arcAfter = [];
      for (let s = 1; s <= 14; s++) arcAfter.push(pts[idx(end + s)]);
      const cf = fitCircle2D(arcAfter);
      if (cf && cf.r >= 10.0 && cf.r <= 220 && cf.rms <= 0.11) {
        const projT = (cf.cx - coreLine.c[0]) * coreLine.d[0] + (cf.cy - coreLine.c[1]) * coreLine.d[1];
        const tx = coreLine.c[0] + coreLine.d[0] * projT;
        const ty = coreLine.c[1] + coreLine.d[1] * projT;
        let bestE = end, bestD = Infinity;
        for (let d = -4; d <= 0; d++) {
          const cand = idx(end + d);
          if (corners[cand]) continue;
          const dist = Math.hypot(pts[cand][0] - tx, pts[cand][1] - ty);
          if (dist < bestD) { bestD = dist; bestE = cand; }
        }
        if (bestD <= 1.5) {
          end = bestE;
          snapEndPt = [tx, ty];
        }
      }
    }

    spanLen = ((end - start + n) % n) + 1;
    const startSharp = !!(corners[start] || isHardJunc(start));
    const endSharp = !!(corners[end] || isHardJunc(end));
    const bothEndsSharp = startSharp && endSharp;
    const isCrispCollinear = coreLine.rms <= 0.038 && coreLine.maxDev <= 0.075;
    const minReqLen = bothEndsSharp ? (isSmallLoop ? 6 : 9) : ((isSmallLoop || isCrispCollinear) ? 8 : Math.max(14, Math.min(24, Math.floor(n * 0.06))));
    if (spanLen < minReqLen) continue;
    const trimS = startSharp ? 2 : 0;
    const trimE = endSharp ? 2 : 0;
    const finalPts = [];
    for (let s = trimS; s < spanLen - trimE; s++) {
      if (s === 0 && snapStartPt) finalPts.push(snapStartPt);
      else if (s === spanLen - 1 && snapEndPt) finalPts.push(snapEndPt);
      else finalPts.push(pts[idx(start + s)]);
    }
    const fl = fitLine2D(finalPts);
    const minReqSpan = bothEndsSharp ? (isSmallLoop ? 4.2 : 7.0) : ((isSmallLoop || isCrispCollinear) ? 6.0 : 11.5);
    const isLongCollinear = (spanLen >= 28 || (bothEndsSharp && spanLen >= 12 && isCrispCollinear)) && coreLine.rms <= 0.038;
    const allowRms = bothEndsSharp ? seedRmsTol * 1.40 : (isLongCollinear ? seedRmsTol * 1.35 : seedRmsTol * 1.15);
    const allowDev = bothEndsSharp ? seedDevTol * 1.50 : (isLongCollinear ? Math.max(seedDevTol * 1.60, 0.165) : seedDevTol * 1.25);
    if (!fl || fl.span < minReqSpan || fl.rms > allowRms || fl.maxDev > allowDev) continue;

    /* Jika ujung start/end berjarak <= 14 langkah dari sudut tajam C0:
       Hanya tolak bila rentang sangat pendek (< 12 px) DAN bukan isCrispCollinear */
    if (spanLen < 12 && !isCrispCollinear) {
      let nearOnLineCorner = false;
      if (!startSharp) {
        for (let d = 1; d <= 14; d++) {
          const k = idx(start - d);
          if (corners[k] || isHardJunc(k)) {
            const devC = Math.abs((pts[k][0] - fl.c[0]) * fl.d[1] - (pts[k][1] - fl.c[1]) * fl.d[0]);
            if (devC <= 0.55) nearOnLineCorner = true;
            break;
          }
        }
      }
      if (!endSharp && !nearOnLineCorner) {
        for (let d = 1; d <= 14; d++) {
          const k = idx(end + d);
          if (corners[k] || isHardJunc(k)) {
            const devC = Math.abs((pts[k][0] - fl.c[0]) * fl.d[1] - (pts[k][1] - fl.c[1]) * fl.d[0]);
            if (devC <= 0.55) nearOnLineCorner = true;
            break;
          }
        }
      }
      if (nearOnLineCorner) continue;
    }

    /* Validasi G1 Tangential Continuity untuk rentang pendek/menengah yang tidak bermuara pada cap sempit */
    if (!isLongCollinear) {
      const lookW = clamp(Math.floor((n - spanLen) * 0.12), 3, 6);
      if (!startSharp) {
        const pCapS = pts[idx(start - Math.min(5, lookW))];
        const capDevS = Math.abs((pCapS[0] - fl.c[0]) * fl.d[1] - (pCapS[1] - fl.c[1]) * fl.d[0]);
        if (capDevS < 0.45) {
          const outsideS = [];
          for (let s = lookW; s >= 0; s--) outsideS.push(pts[idx(start - s)]);
          const tOutS = oneSidedTangentOpen(outsideS, false, lookW);
          if (tOutS[0] * fl.d[0] + tOutS[1] * fl.d[1] < 0.88) continue;
        }
      }
      if (!endSharp) {
        const pCapE = pts[idx(end + Math.min(5, lookW))];
        const capDevE = Math.abs((pCapE[0] - fl.c[0]) * fl.d[1] - (pCapE[1] - fl.c[1]) * fl.d[0]);
        if (capDevE < 0.45) {
          const outsideE = [];
          for (let s = 0; s <= lookW; s++) outsideE.push(pts[idx(end + s)]);
          const tOutE = oneSidedTangentOpen(outsideE, true, lookW);
          if (tOutE[0] * fl.d[0] + tOutE[1] * fl.d[1] < 0.88) continue;
        }
      }
    }

    const extW = bothEndsSharp ? 6 : Math.min(22, Math.max(12, spanLen));
    const extPts = [];
    for (let s = -extW; s < 0; s++) {
      const k = idx(start + s);
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(pts[k]);
    }
    for (let s = 0; s < spanLen; s++) extPts.push(pts[idx(start + s)]);
    for (let s = spanLen; s < spanLen + extW; s++) {
      const k = idx(start + s);
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(pts[k]);
    }
    const cfExt = extPts.length >= 10 ? fitCircle2D(extPts) : null;
    const flExt = fitLine2D(extPts);
    if (cfExt && flExt && cfExt.r >= 4.0 && cfExt.r < 480 && cfExt.rms < flExt.rms * (bothEndsSharp ? 0.58 : 0.72) && cfExt.rms <= Math.max(0.18, cfExt.r * 0.012)) continue;

    const stepOut = Math.min(12, Math.max(5, (n - spanLen) >> 2));
    const pBefore = pts[idx(start - stepOut)];
    const pAfter = pts[idx(end + stepOut)];
    const devBefore = Math.abs((pBefore[0] - fl.c[0]) * fl.d[1] - (pBefore[1] - fl.c[1]) * fl.d[0]);
    const devAfter = Math.abs((pAfter[0] - fl.c[0]) * fl.d[1] - (pAfter[1] - fl.c[1]) * fl.d[0]);
    const minOutDev = isLongCollinear ? Math.max(0.08, fl.rms * 2.5) : Math.max(0.15, fl.rms * 3.8);
    if (devBefore < minOutDev || devAfter < minOutDev) continue;

    /* Filter leher angsa (swan-neck) hanya untuk rentang pendek/menengah (< 80 px dan bukan isLongCollinear)
       agar tidak menolak transisi G1 lurus-ke-busur besar (seperti dinding luar huruf O/D dengan R >= 60 px) */
    if (fl.span < 80 && !isLongCollinear && !isSmallLoop) {
      const stepOut2 = Math.min(20, Math.max(10, (n - spanLen) >> 2));
      if (!startSharp) {
        const pBefore2 = pts[idx(start - stepOut2)];
        const distBefore2 = Math.hypot(pBefore2[0] - pts[start][0], pBefore2[1] - pts[start][1]) || 1;
        const devBefore2 = Math.abs((pBefore2[0] - fl.c[0]) * fl.d[1] - (pBefore2[1] - fl.c[1]) * fl.d[0]);
        if (devBefore2 < 0.85 || (devBefore2 / distBefore2) < 0.09) continue;
      }
      if (!endSharp) {
        const pAfter2 = pts[idx(end + stepOut2)];
        const distAfter2 = Math.hypot(pAfter2[0] - pts[end][0], pAfter2[1] - pts[end][1]) || 1;
        const devAfter2 = Math.abs((pAfter2[0] - fl.c[0]) * fl.d[1] - (pAfter2[1] - fl.c[1]) * fl.d[0]);
        if (devAfter2 < 0.85 || (devAfter2 / distAfter2) < 0.09) continue;
      }
    }

    spans.push({ start, end, spanLen, fl: coreLine, snapStartPt, snapEndPt });
  }

  for (const sp of spans) {
    let { start, end, spanLen, fl, snapStartPt, snapEndPt } = sp;
    if (snapStartPt && !corners[start] && !isHardJunc(start)) pts[start] = snapStartPt;
    if (snapEndPt && !corners[end] && !isHardJunc(end)) pts[end] = snapEndPt;

    /* Axis-snap arah garis lurus fl.d bila hampir vertikal/horizontal (dalam batas axisSnapDeg) */
    let ux = fl.d[0], uy = fl.d[1];
    const PA0 = pts[start], PB0 = pts[end];
    if ((PB0[0] - PA0[0]) * ux + (PB0[1] - PA0[1]) * uy < 0) { ux = -ux; uy = -uy; }
    if (axisSnapOn && !(juncFlags && (juncFlags[start] || juncFlags[end]))) {
      const deg = Math.atan2(uy, ux) * 180 / Math.PI;
      const canons = [0, 90, -90, 180, -180];
      for (const c of canons) {
        let df = Math.abs(deg - c);
        if (df > 180) df = 360 - df;
        const maxEndShift = 0.5 * fl.span * Math.sin(df * Math.PI / 180);
        if (df <= axisSnapDeg && maxEndShift <= 0.28) {
          const rad = c * Math.PI / 180;
          ux = Math.cos(rad);
          uy = Math.sin(rad);
          break;
        }
      }
    }
    sp.ux = ux;
    sp.uy = uy;

    /* Proyeksikan seluruh titik rentang lurus (termasuk simpul G1 start & end) langsung ke garis lurus
       fl.c + (ux, uy) dan kunci di onStraight[k] = 1 agar tidak digeser oleh Taubin/despeckle */
    const cx = fl.c[0], cy = fl.c[1];
    for (let s = 0; s < spanLen; s++) {
      const k = idx(start + s);
      const isEnd = (s === 0 || s === spanLen - 1);
      if (!corners[k] && !isHardJunc(k)) {
        const P = pts[k];
        const proj = (P[0] - cx) * ux + (P[1] - cy) * uy;
        pts[k] = [cx + ux * proj, cy + uy * proj];
        if (!isEnd) {
          smoothKnots[k] = 0;
          knotTangents.delete(k);
        }
        onStraight[k] = 1;
      } else if (isEnd && corners[k] && !isHardJunc(k)) {
        const P = pts[k];
        const perpDev = Math.abs((P[0] - cx) * uy - (P[1] - cy) * ux);
        if (perpDev <= 0.32) {
          const proj = (P[0] - cx) * ux + (P[1] - cy) * uy;
          pts[k] = [cx + ux * proj, cy + uy * proj];
          onStraight[k] = 1;
        }
      }
    }

    if (!corners[start]) {
      let nearHardStart = false;
      for (let d = -8; d <= 8; d++) {
        const nb = idx(start + d);
        if (corners[nb] || (juncFlags && juncFlags[nb])) nearHardStart = true;
        if (d !== 0 && !corners[nb] && !(juncFlags && juncFlags[nb])) {
          smoothKnots[nb] = 0;
          knotTangents.delete(nb);
        }
      }
      if (!nearHardStart) {
        smoothKnots[start] = 1;
        knotTangents.set(start, [ux, uy]);
      }
    }
    if (!corners[end]) {
      let nearHardEnd = false;
      for (let d = -8; d <= 8; d++) {
        const nb = idx(end + d);
        if (corners[nb] || (juncFlags && juncFlags[nb])) nearHardEnd = true;
        if (d !== 0 && !corners[nb] && !(juncFlags && juncFlags[nb])) {
          smoothKnots[nb] = 0;
          knotTangents.delete(nb);
        }
      }
      if (!nearHardEnd) {
        smoothKnots[end] = 1;
        knotTangents.set(end, [ux, uy]);
      }
    }
  }

  if (spans.length >= 2) {
    for (let i = 0; i < spans.length; i++) {
      const spA = spans[i], spB = spans[(i + 1) % spans.length];
      const gapLen = (spB.start - spA.end + n) % n;
      if (gapLen >= 2 && gapLen <= Math.max(58, Math.floor(n * 0.25))) {
        const pEndA = pts[spA.end], pStartB = pts[spB.start];
        const capW = Math.hypot(pStartB[0] - pEndA[0], pStartB[1] - pEndA[1]);
        const antiDot = spA.ux * spB.ux + spA.uy * spB.uy;
        /* Jika dua rentang lurus berlawanan arah (anti-paralel) dihubungkan oleh U-cap sempit TANPA sudut siku tajam,
           bersihkan sudut C0 palsu di tengah U-cap agar menjadi busur penutup yang mulus */
        let sharpCapCnt = (corners[spA.end] ? 1 : 0) + (corners[spB.start] ? 1 : 0);
        for (let s = 1; s < gapLen; s++) if (corners[idx(spA.end + s)]) sharpCapCnt++;
        if (gapLen <= 48 && capW <= 22.0 && antiDot <= -0.90 && sharpCapCnt === 0) {
          for (let s = 1; s < gapLen; s++) {
            const k = idx(spA.end + s);
            if (!isHardJunc(k)) {
              corners[k] = 0;
              smoothKnots[k] = 0;
              knotTangents.delete(k);
            }
          }
          if (!(juncFlags && juncFlags[spA.end])) {
            corners[spA.end] = 0;
            smoothKnots[spA.end] = 1;
            knotTangents.set(spA.end, [spA.ux, spA.uy]);
          }
          if (!(juncFlags && juncFlags[spB.start])) {
            corners[spB.start] = 0;
            smoothKnots[spB.start] = 1;
            knotTangents.set(spB.start, [spB.ux, spB.uy]);
          }
          continue;
        }
        let hasSharpInGap = false;
        const arcPts = [];
        for (let s = 0; s <= gapLen; s++) {
          const k = idx(spA.end + s);
          if (s > 0 && s < gapLen && (corners[k] || isHardJunc(k))) { hasSharpInGap = true; break; }
          arcPts.push(pts[k]);
        }
        /* Hanya hapus smoothKnots di dalam busur jika bukan U-turn lebar (antiDot >= -0.50 || capW <= 22.0)
           agar simpul puncak pada busur setengah lingkaran 180° lebar (seperti puncak huruf O) tetap terjaga */
        if (!hasSharpInGap && (antiDot >= -0.50 || capW <= 22.0)) {
          const cf = fitCircle2D(arcPts);
          if (cf && cf.r >= 2.0 && cf.r <= 260 && cf.rms <= Math.max(0.32, cf.r * 0.025)) {
            for (let s = 1; s < gapLen; s++) {
              const k = idx(spA.end + s);
              smoothKnots[k] = 0;
              knotTangents.delete(k);
            }
          }
        }
      }
    }
  }

  return onStraight;
}

function computeContourAdaptiveOpts(pts, area, baseLambda, baseTol, scale, baseAdvOpt = {}) {
  const n = pts ? pts.length : 0;
  const absA = Math.abs(area || 0);
  if (n < 6) return { localLambda: baseLambda * 0.35, localTol: Math.max(0.05 * scale, baseTol * 0.6), localAdv: baseAdvOpt };
  let axisSteps = 0, sharpTurns = 0, zigSteps = 0, prevTurn = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], p = pts[i], b = pts[(i + 1) % n];
    const ux = p[0] - a[0], uy = p[1] - a[1], vx = b[0] - p[0], vy = b[1] - p[1];
    if (Math.abs(ux) < 0.08 || Math.abs(uy) < 0.08) axisSteps++;
    const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
    if (l1 > 0.1 && l2 > 0.1) {
      const t = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      if (Math.abs(t) > 0.55) sharpTurns++;
      if (t * prevTurn < -0.04) zigSteps++;
      prevTurn = t;
    }
  }
  const axisRatio = axisSteps / n;
  const zigRatio = zigSteps / n;
  const sizeScale = absA < 36 || n < 20 ? 0.42 : absA < 140 || n < 42 ? 0.72 : 1.0;
  const geomMod = axisRatio > 0.68 && n <= 400 && sharpTurns >= 3 ? 0.78 : (zigRatio > 0.32 ? 1.16 : 1.0);
  const localLambda = baseLambda * sizeScale * geomMod;
  const isTypoStemMode = baseAdvOpt.protectStemCaps === true && baseAdvOpt.cornerMode === 'typo';
  const tolScale = absA < 64 || n < 24 ? (isTypoStemMode ? 0.78 : 1.45) : absA < 220 || n < 48 ? (isTypoStemMode ? 0.86 : 1.22) : (axisRatio > 0.72 && n <= 400 ? 0.92 : 1.08);
  const localTol = Math.max(0.10 * scale, baseTol * tolScale);
  const localAdv = {
    ...baseAdvOpt,
    lineStraighten: axisRatio > 0.65 ? Math.min(94, (baseAdvOpt.lineStraighten ?? 58) + 12) : (baseAdvOpt.lineStraighten ?? 58)
  };
  return { localLambda, localTol, localAdv };
}

function smoothLoop(pts, opt = {}) {
  const n = pts.length;
  if (n < 5) {
    const corners = new Uint8Array(n).fill(1);
    return { pts: pts.map(p => p.slice()), corners, smoothKnots: new Uint8Array(n), knotTangents: new Map(), straightSpanFlags: new Uint8Array(n) };
  }
  const isHardJunc = i => !!(opt.juncFlags && opt.juncFlags[i] === 1);
  const hasHardJunc = opt.juncFlags && opt.juncFlags.some(v => v === 1);
  if ((opt.isTrueCircle || !hasHardJunc) && n >= 8) {
    const cf = fitCircle2D(pts);
    if (cf && cf.r >= (opt.isTrueCircle ? 1.10 : 1.65) && cf.r <= 500) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxRDev = 0, polyA = 0;
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
        const dR = Math.abs(Math.hypot(p[0] - cf.cx, p[1] - cf.cy) - cf.r);
        if (dR > maxRDev) maxRDev = dR;
        polyA += p[0] * q[1] - q[0] * p[1];
      }
      const absA = Math.abs(polyA) * 0.5;
      const areaRatio = absA / (Math.PI * cf.r * cf.r);
      const bw = maxX - minX, bh = maxY - minY;
      const aspect = bw > 0 && bh > 0 ? (bw / bh) : 0;
      if (opt.isTrueCircle || (aspect >= 0.88 && aspect <= 1.13 && areaRatio >= 0.91 && areaRatio <= 1.09 &&
          cf.rms <= Math.max(0.32, cf.r * 0.025) && maxRDev <= Math.max(0.75, cf.r * 0.055))) {
        const cPts = pts.map((p, idxP) => {
          /* Pertahankan koordinat T-junction yang sudah diproyeksikan ke lingkaran bersama di traceBoundaries */
          if (opt.juncFlags && opt.juncFlags[idxP]) return [p[0], p[1]];
          const dx = p[0] - cf.cx, dy = p[1] - cf.cy, dl = Math.hypot(dx, dy) || 1;
          return [cf.cx + (dx / dl) * cf.r, cf.cy + (dy / dl) * cf.r];
        });
        return {
          pts: cPts,
          corners: new Uint8Array(n),
          smoothKnots: new Uint8Array(n),
          knotTangents: new Map(),
          straightSpanFlags: new Uint8Array(n),
          isTrueCircle: true,
          circleFit: { cx: cf.cx, cy: cf.cy, r: cf.r }
        };
      }
      if (opt.protectStemCaps && n >= 12 && n <= 26 && Math.min(bw, bh) >= 1.8 && Math.min(bw, bh) <= 4.2 && Math.max(bw, bh) >= 4.5 && Math.max(bw, bh) <= 10.5) {
        const rectFill = absA / Math.max(1e-4, bw * bh);
        let orthoSteps = 0;
        for (let i = 0; i < n; i++) {
          const p0 = pts[i], p1 = pts[(i + 1) % n];
          const dx = Math.abs(p1[0] - p0[0]), dy = Math.abs(p1[1] - p0[1]);
          if (Math.min(dx, dy) <= 0.35 * Math.max(dx, dy)) orthoSteps++;
        }
        if (rectFill >= 0.75 && (orthoSteps / n) >= 0.65) {
          const xsL = [], xsR = [], ysT = [], ysB = [];
          for (const p of pts) {
            if (p[0] <= minX + bw * 0.28) xsL.push(p[0]);
            if (p[0] >= maxX - bw * 0.28) xsR.push(p[0]);
            if (p[1] <= minY + bh * 0.28) ysT.push(p[1]);
            if (p[1] >= maxY - bh * 0.28) ysB.push(p[1]);
          }
          const med = arr => {
            if (!arr.length) return 0;
            const s = arr.slice().sort((a, b) => a - b);
            return s[s.length >> 1];
          };
          const xL = xsL.length ? med(xsL) : minX;
          const xR = xsR.length ? med(xsR) : maxX;
          const yT = ysT.length ? med(ysT) : minY;
          const yB = ysB.length ? med(ysB) : maxY;
          const rectCorners = [[xL, yT], [xR, yT], [xR, yB], [xL, yB]];
          const cornerIndices = [];
          for (const rc of rectCorners) {
            let bestI = 0, bestD = Infinity;
            for (let i = 0; i < n; i++) {
              if (cornerIndices.includes(i)) continue;
              const d = Math.hypot(pts[i][0] - rc[0], pts[i][1] - rc[1]);
              if (d < bestD) { bestD = d; bestI = i; }
            }
            cornerIndices.push(bestI);
          }
          const pairs = cornerIndices.map((ci, k) => ({ ci, pt: rectCorners[k] })).sort((a, b) => a.ci - b.ci);
          const rPts = pts.map(p => [p[0], p[1]]);
          const corners = new Uint8Array(n);
          const straightSpanFlags = new Uint8Array(n).fill(1);
          for (let k = 0; k < 4; k++) {
            const cur = pairs[k], nxt = pairs[(k + 1) % 4];
            corners[cur.ci] = 1;
            rPts[cur.ci] = [cur.pt[0], cur.pt[1]];
            const span = (nxt.ci - cur.ci + n) % n;
            for (let s = 1; s < span; s++) {
              const u = s / span;
              const idxM = (cur.ci + s) % n;
              rPts[idxM] = [cur.pt[0] + (nxt.pt[0] - cur.pt[0]) * u, cur.pt[1] + (nxt.pt[1] - cur.pt[1]) * u];
            }
          }
          return {
            pts: rPts,
            corners,
            smoothKnots: new Uint8Array(n),
            knotTangents: new Map(),
            straightSpanFlags
          };
        }
      }
      if (aspect >= 0.52 && aspect <= 1.95 && n >= 10 && n <= 95 && Math.min(bw, bh) >= 2.2) {
        const cxE = 0.5 * (minX + maxX), cyE = 0.5 * (minY + maxY);
        const rxE = Math.max(1.5, bw * 0.5), ryE = Math.max(1.5, bh * 0.5);
        const ellAreaRatio = absA / (Math.PI * rxE * ryE);
        if (ellAreaRatio >= 0.89 && ellAreaRatio <= 1.09) {
          let sumE2 = 0, maxEDev = 0;
          const minR = Math.min(rxE, ryE);
          for (let i = 0; i < n; i++) {
            const nxE = (pts[i][0] - cxE) / rxE, nyE = (pts[i][1] - cyE) / ryE;
            const rNorm = Math.hypot(nxE, nyE);
            const devE = Math.abs(rNorm - 1.0) * minR;
            sumE2 += devE * devE;
            if (devE > maxEDev) maxEDev = devE;
          }
          const rmsE = Math.sqrt(sumE2 / n);
          if (rmsE <= Math.max(0.28, minR * 0.055) && maxEDev <= Math.max(0.68, minR * 0.145)) {
            const ePts = pts.map(p => {
              const nxE = (p[0] - cxE) / rxE, nyE = (p[1] - cyE) / ryE;
              const rNorm = Math.hypot(nxE, nyE) || 1;
              const tx = cxE + (nxE / rNorm) * rxE, ty = cyE + (nyE / rNorm) * ryE;
              return [p[0] * 0.35 + tx * 0.65, p[1] * 0.35 + ty * 0.65];
            });
            const smoothKnots = new Uint8Array(n);
            const knotTangents = new Map();
            let iTop = 0, iBot = 0, iLeft = 0, iRight = 0;
            for (let i = 1; i < n; i++) {
              if (ePts[i][1] < ePts[iTop][1]) iTop = i;
              if (ePts[i][1] > ePts[iBot][1]) iBot = i;
              if (ePts[i][0] < ePts[iLeft][0]) iLeft = i;
              if (ePts[i][0] > ePts[iRight][0]) iRight = i;
            }
            for (const ki of [iTop, iRight, iBot, iLeft]) {
              smoothKnots[ki] = 1;
              knotTangents.set(ki, smoothTangentClosed(ePts, ki, 4));
            }
            return {
              pts: ePts,
              corners: new Uint8Array(n),
              smoothKnots,
              knotTangents,
              straightSpanFlags: new Uint8Array(n)
            };
          }
        }
      }
    }
  }

  // 0. Detect sharp corners C0 and curvature extrema directly on Beach-deconvolved pts
  const prePts = pts.map(p => [p[0], p[1]]);
  const det = opt.detectCorners === false
    ? { corners: new Uint8Array(n), smoothKnots: new Uint8Array(n), apexMap: new Map(), knotTangents: new Map() }
    : detectCornersAndExtrema(prePts, opt.cornerAngle || 44, opt.juncFlags, opt);
  const { corners, smoothKnots, apexMap, knotTangents } = det;

  // 1. Apply Apex reconstruction AND smoothly project the neck around each reconstructed polygon apex
  const apexPts = prePts.map((p, i) => apexMap.has(i) ? apexMap.get(i).slice() : [p[0], p[1]]);
  apexMap.forEach((ap, ci) => {
    if (!corners[ci]) return;
    const shiftDist = Math.hypot(ap[0] - prePts[ci][0], ap[1] - prePts[ci][1]);
    if (shiftDist < 0.20) return;
    const neckSpan = shiftDist > 1.6 ? Math.min(10, Math.max(6, Math.floor(n / 32))) : (shiftDist > 1.2 ? Math.min(8, Math.max(4, Math.floor(n / 40))) : Math.min(5, Math.max(2, Math.floor(n / 52))));
    const maxShiftNeck = shiftDist > 1.2 ? Math.min(2.4, shiftDist * 0.95) : 0.42;
    const pRefL = apexPts[(ci - neckSpan + n) % n];
    const pRefR = apexPts[(ci + neckSpan) % n];
    for (let s = 1; s < neckSpan; s++) {
      const u = s / neckSpan;
      const iL = (ci - s + n) % n, iR = (ci + s) % n;
      if (!corners[iL] && !(opt.juncFlags && opt.juncFlags[iL])) {
        const lx = ap[0] + (pRefL[0] - ap[0]) * u, ly = ap[1] + (pRefL[1] - ap[1]) * u;
        const wBlend = shiftDist > 1.2 ? (1 - u * 0.15) : (1 - u * 0.45) * Math.min(0.65, shiftDist / 1.1);
        let nx = apexPts[iL][0] * (1 - wBlend) + lx * wBlend;
        let ny = apexPts[iL][1] * (1 - wBlend) + ly * wBlend;
        const dx = nx - prePts[iL][0], dy = ny - prePts[iL][1], d = Math.hypot(dx, dy);
        if (d > maxShiftNeck) { nx = prePts[iL][0] + (dx / d) * maxShiftNeck; ny = prePts[iL][1] + (dy / d) * maxShiftNeck; }
        apexPts[iL] = [nx, ny];
      }
      if (!corners[iR] && !(opt.juncFlags && opt.juncFlags[iR])) {
        const rx = ap[0] + (pRefR[0] - ap[0]) * u, ry = ap[1] + (pRefR[1] - ap[1]) * u;
        const wBlend = shiftDist > 1.2 ? (1 - u * 0.15) : (1 - u * 0.45) * Math.min(0.65, shiftDist / 1.1);
        let nx = apexPts[iR][0] * (1 - wBlend) + rx * wBlend;
        let ny = apexPts[iR][1] * (1 - wBlend) + ry * wBlend;
        const dx = nx - prePts[iR][0], dy = ny - prePts[iR][1], d = Math.hypot(dx, dy);
        if (d > maxShiftNeck) { nx = prePts[iR][0] + (dx / d) * maxShiftNeck; ny = prePts[iR][1] + (dy / d) * maxShiftNeck; }
        apexPts[iR] = [nx, ny];
      }
    }
  });

  const despeckleStr = (opt.despeckleJitter ?? 72) / 100;
  const snappedPts = despeckleStr > 0.02
    ? despeckleStaircaseClosed(apexPts, despeckleStr * 0.65, opt.juncFlags, corners)
    : apexPts;

  // 2. Check full spans between Sharp C0 corners (preserving genuine curved spans that have cardinal extrema)
  const lineStr = (opt.lineStraighten ?? 58) / 100;
  const straightTol = 0.34 + lineStr * 0.36;
  const sagRatioTol = 0.015 + lineStr * 0.016;
  const axisSnapOn = opt.axisSnap !== false;
  const axisSnapDeg = opt.axisSnapDeg ?? 2.2;
  const onStraightSpan = new Uint8Array(n);

  /* Helper Kontekstual: uji apakah rentang [ia..ib] merupakan bagian dari busur lingkaran yang berlanjut ke kiri/kanan */
  const isPartOfExtendedCircleArc = (ia, ib, spanLen, localRms) => {
    const extW = Math.min(16, Math.max(7, spanLen));
    const extPts = [];
    for (let s = extW; s >= 1; s--) {
      const k = (ia - s + n) % n;
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(snappedPts[k]);
    }
    extPts.reverse();
    for (let s = 0; s <= spanLen; s++) extPts.push(snappedPts[(ia + s) % n]);
    for (let s = 1; s <= extW; s++) {
      const k = (ib + s) % n;
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(snappedPts[k]);
    }
    if (extPts.length < Math.max(10, spanLen + 5)) return false;
    const cfExt = fitCircle2D(extPts);
    const flExt = fitLine2D(extPts);
    if (!cfExt || cfExt.r < 3.0 || cfExt.r > 480) return false;
    return cfExt.rms <= Math.max(0.26, cfExt.r * 0.012) && (!flExt || cfExt.rms < flExt.rms * 0.68);
  };

  const cList = [];
  for (let i = 0; i < n; i++) if (corners[i] || isHardJunc(i)) cList.push(i);
  if (cList.length >= 2 && lineStr > 0.12) {
    /* Pra-fit garis inti (middle 70% core line) pada setiap rentang di antara sudut tajam cList:
       Jika dua rentang lurus berurutan bertemu di sebuah sudut tajam (mis. sudut lancip 45° pada pita diagonal B3K3
       yang tumpul 1.5..3.0 px oleh rasterisasi), perpotongan kedua garis inti memulihkan titik sudut 45° eksak
       sehingga seluruh rentang lurus dari sudut ke sudut tanpa menyisakan potongan kurva pendek di ujung! */
    const mC = cList.length;
    const spanCoreLines = new Array(mC).fill(null);
    for (let k = 0; k < mC; k++) {
      const ia = cList[k], ib = cList[(k + 1) % mC];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 6) continue;
      const PA0 = snappedPts[ia], PB0 = snappedPts[ib];
      const ch0 = Math.hypot(PB0[0] - PA0[0], PB0[1] - PA0[1]);
      if (ch0 < 4.5) continue;
      const padC = spanLen >= 20 ? Math.min(10, Math.floor(spanLen * 0.16)) : Math.max(2, Math.floor(spanLen * 0.20));
      const corePts = [];
      for (let s = padC; s <= spanLen - padC; s++) corePts.push(snappedPts[(ia + s) % n]);
      if (corePts.length < 4) continue;
      const flC = fitLine2D(corePts);
      if (!flC || flC.rms > 0.22 || flC.maxDev > 0.45) continue;
      const allSpanPts = [];
      for (let s = 0; s <= spanLen; s++) allSpanPts.push(snappedPts[(ia + s) % n]);
      const cfC = spanLen >= 8 ? fitCircle2D(allSpanPts) : null;
      const flAll = fitLine2D(allSpanPts);
      const isArc = !!(cfC && cfC.r >= 3.0 && cfC.r <= 500 && flAll && cfC.rms < flAll.rms * 0.62 && flC.rms > 0.10);
      if (!isArc) spanCoreLines[k] = flC;
    }
    for (let k = 0; k < mC; k++) {
      const flPrev = spanCoreLines[(k - 1 + mC) % mC];
      const flCur = spanCoreLines[k];
      const ic = cList[k];
      if (opt.juncFlags && opt.juncFlags[ic]) continue;
      if (flPrev && flCur) {
        const det = flPrev.d[0] * flCur.d[1] - flPrev.d[1] * flCur.d[0];
        if (Math.abs(det) >= 0.25) {
          const wx = flCur.c[0] - flPrev.c[0], wy = flCur.c[1] - flPrev.c[1];
          const t = (wx * flCur.d[1] - wy * flCur.d[0]) / det;
          const ax = flPrev.c[0] + flPrev.d[0] * t, ay = flPrev.c[1] + flPrev.d[1] * t;
          if (Math.hypot(ax - snappedPts[ic][0], ay - snappedPts[ic][1]) <= 3.4) {
            snappedPts[ic] = [ax, ay];
          }
        }
      }
    }
    for (let k = 0; k < cList.length; k++) {
      const ia = cList[k], ib = cList[(k + 1) % cList.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 2) continue;
      const PA = snappedPts[ia], PB = snappedPts[ib];
      const chord = Math.hypot(PB[0] - PA[0], PB[1] - PA[1]);
      if (chord < 3.0) continue;
      const ux = (PB[0] - PA[0]) / chord, uy = (PB[1] - PA[1]) / chord;
      let maxCoreDev = 0, maxNeckDev = 0, ss = 0, cnt = 0, sumSigned = 0, sumAbs = 0, hasCurvedExtremum = false;
      const padEnd = spanLen >= 20 ? Math.min(12, Math.floor(spanLen * 0.14)) : (spanLen >= 8 ? 2 : 1);
      for (let s = 1; s < spanLen; s++) {
        const idxP = (ia + s) % n;
        const P = snappedPts[idxP];
        const sDev = (P[0] - PA[0]) * uy - (P[1] - PA[1]) * ux;
        const dev = Math.abs(sDev);
        if (smoothKnots[idxP] && dev > 0.48) hasCurvedExtremum = true;
        if (s >= padEnd && s <= spanLen - padEnd) {
          if (dev > maxCoreDev) maxCoreDev = dev;
          ss += dev * dev;
          sumSigned += sDev;
          sumAbs += dev;
          cnt++;
        } else {
          if (dev > maxNeckDev) maxNeckDev = dev;
        }
      }
      const rms = cnt > 0 ? Math.sqrt(ss / cnt) : maxNeckDev;
      const meanSigned = cnt > 0 ? Math.abs(sumSigned / cnt) : 0;
      const oneSidedRatio = sumAbs > 1e-5 ? (Math.abs(sumSigned) / sumAbs) : 0;
      const isSystematicBow = (oneSidedRatio >= 0.58 && (maxCoreDev > 0.24 || meanSigned > 0.14)) || (maxCoreDev > 0.36);
      const bothHardCornersEarly = !!((corners[ia] || isHardJunc(ia)) && (corners[ib] || isHardJunc(ib)));
      if (hasCurvedExtremum && !(bothHardCornersEarly && !isSystematicBow && maxCoreDev <= 0.28 && rms <= 0.16)) continue;
      const spanPts = [];
      for (let s = 0; s <= spanLen; s++) spanPts.push(snappedPts[(ia + s) % n]);
      const cfSpan = spanLen >= 6 ? fitCircle2D(spanPts) : null;
      const isCurvedArcSpan = isSystematicBow ||
        !!(cfSpan && cfSpan.r >= 2.0 && cfSpan.r <= 750 && cfSpan.rms < rms * 0.85 && maxCoreDev > 0.10) ||
        (chord < 26.0 && isPartOfExtendedCircleArc(ia, ib, spanLen, rms));
      const coreSlice = [];
      for (let s = padEnd; s <= spanLen - padEnd; s++) coreSlice.push(snappedPts[(ia + s) % n]);
      const flCore = coreSlice.length >= 3 ? fitLine2D(coreSlice) : null;
      const isMicroStraightSpan = !isCurvedArcSpan && spanLen <= 16 && chord <= 11.0 && maxCoreDev <= 0.28 && rms <= 0.15;
      if (flCore && flCore.rms <= 0.085 && flCore.maxDev <= 0.16 && spanLen >= 5) {
        const devA = Math.abs((PA[0] - flCore.c[0]) * flCore.d[1] - (PA[1] - flCore.c[1]) * flCore.d[0]);
        const devB = Math.abs((PB[0] - flCore.c[0]) * flCore.d[1] - (PB[1] - flCore.c[1]) * flCore.d[0]);
        if (devA <= 1.35 && devB <= 1.35 && !(opt.juncFlags && (opt.juncFlags[ia] || opt.juncFlags[ib]))) {
          const pAProj = (PA[0] - flCore.c[0]) * flCore.d[0] + (PA[1] - flCore.c[1]) * flCore.d[1];
          const pBProj = (PB[0] - flCore.c[0]) * flCore.d[0] + (PB[1] - flCore.c[1]) * flCore.d[1];
          snappedPts[ia] = [flCore.c[0] + flCore.d[0] * pAProj, flCore.c[1] + flCore.d[1] * pAProj];
          snappedPts[ib] = [flCore.c[0] + flCore.d[0] * pBProj, flCore.c[1] + flCore.d[1] * pBProj];
          PA[0] = snappedPts[ia][0]; PA[1] = snappedPts[ia][1];
          PB[0] = snappedPts[ib][0]; PB[1] = snappedPts[ib][1];
          maxCoreDev = flCore.maxDev;
          maxNeckDev = Math.min(maxNeckDev, 0.25);
        }
      }
      const bothHardJuncOrCorner = !!((corners[ia] || isHardJunc(ia)) && (corners[ib] || isHardJunc(ib)));
      const hasCoreFit = !!(spanCoreLines[k] && bothHardJuncOrCorner);
      const allowCoreDev = bothHardJuncOrCorner
        ? Math.min(0.85, Math.max(0.42, chord * 0.026))
        : Math.min(0.28, Math.max(0.18, chord * 0.008));
      const allowRms = bothHardJuncOrCorner ? 0.38 : 0.12;
      const allowNeck = hasCoreFit ? 2.45 : (bothHardJuncOrCorner ? 1.15 : 0.38);
      if ((!isCurvedArcSpan && maxCoreDev <= allowCoreDev && (rms <= allowRms || (flCore && flCore.rms <= allowRms * 0.8)) && maxNeckDev <= allowNeck) || isMicroStraightSpan) {
        for (let s = 1; s < spanLen; s++) {
          const idxP = (ia + s) % n;
          const P = snappedPts[idxP];
          const proj = clamp((P[0] - PA[0]) * ux + (P[1] - PA[1]) * uy, 0, chord);
          snappedPts[idxP] = [PA[0] + ux * proj, PA[1] + uy * proj];
          smoothKnots[idxP] = 0;
          knotTangents.delete(idxP);
          onStraightSpan[idxP] = 1;
        }
      }
    }
  }

  // 3. Detect Maximal Collinear Straight Spans on remaining curved/mixed spans (for G1 Line-to-Curve transitions!)
  const g1Straight = detectMaximalStraightSpans(snappedPts, corners, smoothKnots, knotTangents, opt.juncFlags, lineStr, onStraightSpan, axisSnapOn, axisSnapDeg);
  for (let i = 0; i < n; i++) if (g1Straight[i]) onStraightSpan[i] = 1;

  if (lineStr > 0.12) {
    const spanKnots = [];
    for (let i = 0; i < n; i++) {
      if (corners[i] || smoothKnots[i] || (opt.juncFlags && opt.juncFlags[i])) spanKnots.push(i);
    }

    for (let k = 0; k < spanKnots.length; k++) {
      const ia = spanKnots[k], ib = spanKnots[(k + 1) % spanKnots.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 2) continue;
      let PA = snappedPts[ia], PB = snappedPts[ib];
      let dx = PB[0] - PA[0], dy = PB[1] - PA[1];
      let chord = Math.hypot(dx, dy);
      if (chord < 3.5) continue;
      let ux = dx / chord, uy = dy / chord;
      let maxDev = 0, ss = 0, cnt = 0;
      const padS = (corners[ia] && spanLen >= 8) ? 2 : 1;
      const padE = (corners[ib] && spanLen >= 8) ? 2 : 1;
      for (let s = padS; s <= spanLen - padE; s++) {
        const P = snappedPts[(ia + s) % n];
        const dev = Math.abs((P[0] - PA[0]) * uy - (P[1] - PA[1]) * ux);
        if (dev > maxDev) maxDev = dev;
        ss += dev * dev; cnt++;
      }
      const rms = Math.sqrt(ss / Math.max(1, cnt));
      const bothSharp = !!((corners[ia] || isHardJunc(ia)) && (corners[ib] || isHardJunc(ib)));
      const midStraight = !!(onStraightSpan[(ia + (spanLen >> 1)) % n]);
      const allowDev = (bothSharp || midStraight) ? Math.max(0.22, Math.min(straightTol, chord * sagRatioTol)) : 0.09;
      const allowRms = (bothSharp || midStraight) ? 0.14 : 0.05;
      const extArcGuard = (chord < 28.0 && !midStraight) ? isPartOfExtendedCircleArc(ia, ib, spanLen, rms) : false;
      if (!extArcGuard && maxDev <= allowDev && rms <= allowRms) {
        if (axisSnapOn && !(opt.juncFlags && (opt.juncFlags[ia] || opt.juncFlags[ib]))) {
          const deg = Math.atan2(dy, dx) * 180 / Math.PI;
          const canons = (bothSharp && chord >= 14.0) ? [0, 45, -45, 90, -90, 135, -135, 180, -180] : [0, 90, -90, 180, -180];
          let bestC = null, bestDiff = chord <= 8.5 ? Math.max(axisSnapDeg, 5.5) : axisSnapDeg;
          for (const c of canons) {
            let df = Math.abs(deg - c);
            if (df > 180) df = 360 - df;
            if (df <= bestDiff) { bestDiff = df; bestC = c; }
          }
          if (bestC !== null && bestDiff > 0.02) {
            const rad = bestC * Math.PI / 180;
            const tx = Math.cos(rad), ty = Math.sin(rad);
            const mx = 0.5 * (PA[0] + PB[0]), my = 0.5 * (PA[1] + PB[1]);
            const pA_proj = (PA[0] - mx) * tx + (PA[1] - my) * ty;
            const pB_proj = (PB[0] - mx) * tx + (PB[1] - my) * ty;
            if (Math.hypot((mx + tx * pA_proj) - PA[0], (my + ty * pA_proj) - PA[1]) <= 0.28) {
              snappedPts[ia] = [mx + tx * pA_proj, my + ty * pA_proj];
              snappedPts[ib] = [mx + tx * pB_proj, my + ty * pB_proj];
              PA = snappedPts[ia]; PB = snappedPts[ib];
              dx = PB[0] - PA[0]; dy = PB[1] - PA[1];
              chord = Math.hypot(dx, dy) || 1;
              ux = dx / chord; uy = dy / chord;
            }
          }
        }
        for (let s = 1; s < spanLen; s++) {
          const idxP = (ia + s) % n;
          const P = snappedPts[idxP];
          const proj = (P[0] - PA[0]) * ux + (P[1] - PA[1]) * uy;
          snappedPts[idxP] = [PA[0] + ux * proj, PA[1] + uy * proj];
          onStraightSpan[idxP] = 1;
        }
        if (!corners[ia] && smoothKnots[ia]) knotTangents.set(ia, [ux, uy]);
        if (!corners[ib] && smoothKnots[ib]) knotTangents.set(ib, [ux, uy]);
      }
    }
  }

  if (lineStr > 0.12) {
    const finalKnots = [];
    for (let i = 0; i < n; i++) {
      if (corners[i] || smoothKnots[i] || (opt.juncFlags && opt.juncFlags[i])) finalKnots.push(i);
    }
    for (let k = 0; k < finalKnots.length; k++) {
      const ia = finalKnots[k], ib = finalKnots[(k + 1) % finalKnots.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 2) continue;
      let isStr = true;
      for (let s = 1; s < spanLen; s++) {
        if (!onStraightSpan[(ia + s) % n]) { isStr = false; break; }
      }
      if (!isStr) continue;
      const PA = snappedPts[ia], PB = snappedPts[ib];
      const dx = PB[0] - PA[0], dy = PB[1] - PA[1], ch = Math.hypot(dx, dy);
      if (ch < 1e-5) continue;
      const ux = dx / ch, uy = dy / ch;
      for (let s = 1; s < spanLen; s++) {
        const idxP = (ia + s) % n;
        const P = snappedPts[idxP];
        const proj = (P[0] - PA[0]) * ux + (P[1] - PA[1]) * uy;
        snappedPts[idxP] = [PA[0] + ux * proj, PA[1] + uy * proj];
      }
    }
  }

  /* Deteksi Busur Lingkaran Parsial Eksak (Span-Level Exact Circular Arc) pada rentang di antara sudut tajam C0:
     Menjamin setengah lingkaran (B1K1, B3K2), seperempat lingkaran (B1K2), dan cincin busur konsentris (B3K4)
     tetap 100% bulat sempurna tanpa tertekan oleh Taubin/Elastika CG dan tanpa chamfer di sudut 90 derajat! */
  const onCircularArcSpan = new Uint8Array(n);
  if (cList.length >= 2) {
    for (let k = 0; k < cList.length; k++) {
      const ia = cList[k], ib = cList[(k + 1) % cList.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 12) continue;
      let anyStraight = false;
      for (let s = 1; s < spanLen; s++) {
        if (onStraightSpan[(ia + s) % n]) { anyStraight = true; break; }
      }
      if (anyStraight) continue;
      const trim = Math.min(3, Math.max(1, Math.floor(spanLen * 0.08)));
      const arcCore = [];
      for (let s = trim; s <= spanLen - trim; s++) arcCore.push(snappedPts[(ia + s) % n]);
      if (arcCore.length < 8) continue;
      const cf = fitCircle2D(arcCore);
      const lf = fitLine2D(arcCore);
      if (!cf || cf.r < 5.0 || cf.r > 480) continue;
      const thA = Math.atan2(snappedPts[ia][1] - cf.cy, snappedPts[ia][0] - cf.cx);
      const thB = Math.atan2(snappedPts[ib][1] - cf.cy, snappedPts[ib][0] - cf.cx);
      const sweep = Math.abs(Math.atan2(Math.sin(thB - thA), Math.cos(thB - thA)));
      if (sweep < 0.45) continue;
      let maxRDev = 0;
      for (let s = trim; s <= spanLen - trim; s++) {
        const p = snappedPts[(ia + s) % n];
        const dR = Math.abs(Math.hypot(p[0] - cf.cx, p[1] - cf.cy) - cf.r);
        if (dR > maxRDev) maxRDev = dR;
      }
      if (cf.rms <= Math.max(0.24, cf.r * 0.010) && maxRDev <= Math.max(0.52, cf.r * 0.024) && (!lf || cf.rms < lf.rms * 0.52)) {
        /* Proyeksikan titik internal busur tepat ke lingkaran cf dan bersihkan smoothKnots palsu di sepanjang busur */
        for (let s = 1; s < spanLen; s++) {
          const idxP = (ia + s) % n;
          const dx = snappedPts[idxP][0] - cf.cx, dy = snappedPts[idxP][1] - cf.cy;
          const dl = Math.hypot(dx, dy) || 1;
          snappedPts[idxP] = [cf.cx + (dx / dl) * cf.r, cf.cy + (dy / dl) * cf.r];
          onCircularArcSpan[idxP] = 1;
        }
        /* Jika sudut ujung ia atau ib tidak dikunci oleh T-junction, proyeksikan juga ke keliling lingkaran cf */
        for (const endIdx of [ia, ib]) {
          if (!(opt.juncFlags && opt.juncFlags[endIdx])) {
            const dx = snappedPts[endIdx][0] - cf.cx, dy = snappedPts[endIdx][1] - cf.cy;
            const dl = Math.hypot(dx, dy) || 1;
            if (Math.abs(dl - cf.r) <= 0.75) {
              snappedPts[endIdx] = [cf.cx + (dx / dl) * cf.r, cf.cy + (dy / dl) * cf.r];
            }
          }
        }
      }
    }
  }

  const lockMask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (corners[i] || onStraightSpan[i] || onCircularArcSpan[i] || (opt.juncFlags && opt.juncFlags[i])) lockMask[i] = 1;
  }

  /* Jalankan penghalusan Savitzky-Golay kuadratik pada rentang kurva yang tidak terkunci (unlocked)
     setelah deteksi garis lurus, agar kontur panjang yang melengkung lembut benar-benar mulus */
  const fairedPts = despeckleStr > 0.02
    ? despeckleStaircaseClosed(snappedPts, despeckleStr * 0.85, opt.juncFlags, lockMask)
    : snappedPts;

  const smoothMethod = opt.smoothMethod || 'hybrid';
  const lam = clamp((opt.lambda || 2.8) * 0.18, 0.05, 0.85);
  const taubinPasses = smoothMethod === 'cg' ? 2 : clamp(Math.round(4 + Math.log10(1 + lam) * 5), 4, 9);
  const refPts = taubinFilterClosed(fairedPts, lockMask, taubinPasses, 0.38, -0.392);

  for (let i = 0; i < n; i++) {
    if (lockMask[i]) {
      refPts[i][0] = snappedPts[i][0];
      refPts[i][1] = snappedPts[i][1];
    } else {
      const nearLock = (lockMask[(i - 1 + n) % n] || lockMask[(i + 1) % n]) ? 0.24 : 0.56;
      const dx = refPts[i][0] - snappedPts[i][0], dy = refPts[i][1] - snappedPts[i][1];
      const dl = Math.hypot(dx, dy);
      if (dl > nearLock) {
        refPts[i][0] = snappedPts[i][0] + (dx / dl) * nearLock;
        refPts[i][1] = snappedPts[i][1] + (dy / dl) * nearLock;
      }
    }
  }

  if (smoothMethod === 'taubin') {
    return { pts: refPts, corners, smoothKnots, knotTangents, straightSpanFlags: onStraightSpan };
  }

  if (!opt.forceCpu && n >= 192 && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuElasticaRelaxClosed) {
    const gpuElastica = GpuAccelerator.gpuElasticaRelaxClosed(refPts, snappedPts, lockMask, smoothKnots, lam, Math.min(opt.iters || 16, 16));
    if (gpuElastica && gpuElastica.length === n) {
      return { pts: gpuElastica, corners, smoothKnots, knotTangents, straightSpanFlags: onStraightSpan };
    }
  }

  const d0 = new Float64Array(2 * n);
  const x = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    x[2 * i] = d0[2 * i] = refPts[i][0];
    x[2 * i + 1] = d0[2 * i + 1] = refPts[i][1];
  }

  const muTension = 0.0;
  const iters = Math.min(opt.iters || 16, 16);
  const idx = i => ((i % n) + n) % n;

  const energy = v => {
    let e = 0;
    for (let i = 0; i < n; i++) {
      const wData = lockMask[i] ? 64.0 : (smoothKnots[i] ? 3.5 : 1.8);
      const dx = v[2 * i] - d0[2 * i], dy = v[2 * i + 1] - d0[2 * i + 1];
      e += wData * (dx * dx + dy * dy);

      const b = idx(i + 1);
      const tx = v[2 * b] - v[2 * i], ty = v[2 * b + 1] - v[2 * i + 1];
      e += muTension * (tx * tx + ty * ty);

      if (!lockMask[i]) {
        const a = idx(i - 1);
        const bx = v[2 * a] - 2 * v[2 * i] + v[2 * b];
        const by = v[2 * a + 1] - 2 * v[2 * i + 1] + v[2 * b + 1];
        const nearCorner = (lockMask[a] || lockMask[b]) ? 0.15 : 1.0;
        const wBend = (smoothKnots[i] ? lam * 0.65 : lam) * nearCorner;
        e += wBend * (bx * bx + by * by);
      }
    }
    return e;
  };

  const grad = (v, g) => {
    for (let i = 0; i < n; i++) {
      const wData = lockMask[i] ? 64.0 : (smoothKnots[i] ? 3.5 : 1.8);
      g[2 * i] = 2 * wData * (v[2 * i] - d0[2 * i]);
      g[2 * i + 1] = 2 * wData * (v[2 * i + 1] - d0[2 * i + 1]);
    }
    for (let i = 0; i < n; i++) {
      const a = idx(i - 1), b = idx(i + 1);
      for (let c = 0; c < 2; c++) {
        const t = v[2 * b + c] - v[2 * i + c];
        const st = 2 * muTension * t;
        if (!lockMask[i]) g[2 * i + c] -= st;
        if (!lockMask[b]) g[2 * b + c] += st;
      }
      if (lockMask[i]) continue;
      const nearCorner = (lockMask[a] || lockMask[b]) ? 0.15 : 1.0;
      const wBend = (smoothKnots[i] ? lam * 0.65 : lam) * nearCorner;
      for (let c = 0; c < 2; c++) {
        const ben = v[2 * a + c] - 2 * v[2 * i + c] + v[2 * b + c];
        const sb = 2 * wBend * ben;
        if (!lockMask[a]) g[2 * a + c] += sb;
        g[2 * i + c] -= 2 * sb;
        if (!lockMask[b]) g[2 * b + c] += sb;
      }
    }
  };

  const g = new Float64Array(2 * n), p = new Float64Array(2 * n), gPrev = new Float64Array(2 * n);
  const xt = new Float64Array(2 * n);
  grad(x, g);
  for (let i = 0; i < 2 * n; i++) p[i] = -g[i];
  let e0 = energy(x);

  for (let it = 0; it < iters; it++) {
    let gdotp = 0;
    for (let i = 0; i < 2 * n; i++) gdotp += g[i] * p[i];
    if (gdotp >= 0) {
      for (let i = 0; i < 2 * n; i++) p[i] = -g[i];
      gdotp = 0;
      for (let i = 0; i < 2 * n; i++) gdotp += g[i] * p[i];
    }
    let step = Math.min(1.0, 1.0 / (1.0 + 4.0 * lam));
    let e1 = e0, ok = false;
    for (let ls = 0; ls < 10; ls++) {
      for (let i = 0; i < 2 * n; i++) xt[i] = x[i] + step * p[i];
      e1 = energy(xt);
      if (e1 <= e0 + 1e-4 * step * gdotp) { ok = true; break; }
      step *= 0.5;
    }
    if (!ok) break;
    for (let i = 0; i < n; i++) {
      if (lockMask[i]) {
        x[2 * i] = snappedPts[i][0];
        x[2 * i + 1] = snappedPts[i][1];
      } else {
        const maxTube = (lockMask[idx(i - 1)] || lockMask[idx(i + 1)]) ? 0.12 : 0.28;
        const dx = xt[2 * i] - snappedPts[i][0], dy = xt[2 * i + 1] - snappedPts[i][1];
        const dl = Math.hypot(dx, dy);
        if (dl > maxTube) {
          x[2 * i] = snappedPts[i][0] + (dx / dl) * maxTube;
          x[2 * i + 1] = snappedPts[i][1] + (dy / dl) * maxTube;
        } else {
          x[2 * i] = xt[2 * i];
          x[2 * i + 1] = xt[2 * i + 1];
        }
      }
      gPrev[2 * i] = g[2 * i];
      gPrev[2 * i + 1] = g[2 * i + 1];
    }
    grad(x, g);
    let num = 0, den = 0;
    for (let i = 0; i < 2 * n; i++) {
      const y = g[i] - gPrev[i];
      num += g[i] * y;
      den += gPrev[i] * gPrev[i];
    }
    const beta = den > 1e-18 ? Math.max(0, num / den) : 0;
    for (let i = 0; i < 2 * n; i++) p[i] = -g[i] + beta * p[i];
    if (Math.abs(e0 - e1) < 1e-7 * Math.max(1, Math.abs(e0))) break;
    e0 = e1;
  }

  const out = [];
  for (let i = 0; i < n; i++) out.push([x[2 * i], x[2 * i + 1]]);
  return { pts: out, corners, smoothKnots, knotTangents, straightSpanFlags: onStraightSpan };
}

function evalBezier(P0, P1, P2, P3, t) {
  const u = 1 - t, u2 = u * u, t2 = t * t;
  return [
    u2 * u * P0[0] + 3 * u2 * t * P1[0] + 3 * u * t2 * P2[0] + t2 * t * P3[0],
    u2 * u * P0[1] + 3 * u2 * t * P1[1] + 3 * u * t2 * P2[1] + t2 * t * P3[1]
  ];
}
function evalBezierDeriv1(P0, P1, P2, P3, t) {
  const u = 1 - t;
  return [
    3 * (u * u * (P1[0] - P0[0]) + 2 * u * t * (P2[0] - P1[0]) + t * t * (P3[0] - P2[0])),
    3 * (u * u * (P1[1] - P0[1]) + 2 * u * t * (P2[1] - P1[1]) + t * t * (P3[1] - P2[1]))
  ];
}
function evalBezierDeriv2(P0, P1, P2, P3, t) {
  const u = 1 - t;
  return [
    6 * (u * (P2[0] - 2 * P1[0] + P0[0]) + t * (P3[0] - 2 * P2[0] + P1[0])),
    6 * (u * (P2[1] - 2 * P1[1] + P0[1]) + t * (P3[1] - 2 * P2[1] + P1[1]))
  ];
}

function reparameterize(pts, u, P0, P1, P2, P3) {
  const out = new Float64Array(u.length);
  out[0] = 0; out[u.length - 1] = 1;
  for (let i = 1; i < u.length - 1; i++) {
    const t = u[i];
    const Q = evalBezier(P0, P1, P2, P3, t);
    const Q1 = evalBezierDeriv1(P0, P1, P2, P3, t);
    const Q2 = evalBezierDeriv2(P0, P1, P2, P3, t);
    const dx = Q[0] - pts[i][0], dy = Q[1] - pts[i][1];
    const num = dx * Q1[0] + dy * Q1[1];
    const den = Q1[0] * Q1[0] + Q1[1] * Q1[1] + dx * Q2[0] + dy * Q2[1];
    const nt = Math.abs(den) > 1e-12 ? t - num / den : t;
    out[i] = clamp(nt, out[i - 1] + 1e-5, 1 - 1e-5);
  }
  return out;
}

function smoothTangentClosed(pts, i, W = 8) {
  const n = pts.length;
  let vx = 0, vy = 0;
  const wMax = Math.min(W, Math.max(1, n >> 2));
  for (let k = 1; k <= wMax; k++) {
    const w = Math.exp(-(k * k) / (2 * (wMax * 0.6) ** 2));
    const pNext = pts[(i + k) % n];
    const pPrev = pts[(i - k + n * 2) % n];
    vx += w * (pNext[0] - pPrev[0]);
    vy += w * (pNext[1] - pPrev[1]);
  }
  const l = Math.hypot(vx, vy) || 1;
  return [vx / l, vy / l];
}

function smoothTangentOpen(pts, i, W = 6) {
  const n = pts.length;
  let vx = 0, vy = 0;
  const wMax = Math.min(W, n - 1);
  for (let k = 1; k <= wMax; k++) {
    const w = Math.exp(-(k * k) / (2 * (wMax * 0.55) ** 2));
    const iNext = Math.min(n - 1, i + k);
    const iPrev = Math.max(0, i - k);
    if (iNext > iPrev) {
      vx += w * (pts[iNext][0] - pts[iPrev][0]) / (iNext - iPrev);
      vy += w * (pts[iNext][1] - pts[iPrev][1]) / (iNext - iPrev);
    }
  }
  const l = Math.hypot(vx, vy) || 1;
  return [vx / l, vy / l];
}

function fitCubicLS(pts, tanL = null, tanR = null, allowLine = false) {
  const n = pts.length;
  if (n < 2) return null;
  const P0 = pts[0], P3 = pts[n - 1];
  let u = new Float64Array(n);
  let L = 0;
  for (let i = 1; i < n; i++) {
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    u[i] = L;
  }
  if (L < 1e-9) return null;
  for (let i = 0; i < n; i++) u[i] /= L;

  const chord = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
  const chUx = chord > 1e-6 ? (P3[0] - P0[0]) / chord : 1;
  const chUy = chord > 1e-6 ? (P3[1] - P0[1]) / chord : 0;

  /* Deteksi apakah rantai titik membentuk busur satu sisi (atau hampir lurus tanpa infleksi nyata >= 0.35 px) terhadap tali busur P0->P3:
     Jika ya, kedua titik kontrol P1 dan P2 dilarang menyeberang ke sisi berlawanan agar bebas gelombang S (infleksi palsu)! */
  let maxPosH = 0, maxNegH = 0, sumH = 0;
  for (let i = 1; i < n - 1; i++) {
    const h = (pts[i][0] - P0[0]) * chUy - (pts[i][1] - P0[1]) * chUx;
    sumH += h;
    if (h > maxPosH) maxPosH = h;
    if (h < maxNegH) maxNegH = h;
  }
  const minOppExcur = Math.min(maxPosH, -maxNegH);
  const maxExcur = Math.max(maxPosH, -maxNegH);
  const domSign = sumH >= 0 ? 1 : -1;
  const convexSign = (maxPosH >= 0.20 && maxNegH >= -0.12) ? 1 : (maxNegH <= -0.20 && maxPosH <= 0.12) ? -1 : (minOppExcur <= 0.35 && maxExcur >= 0.12 ? domSign : 0);

  if (allowLine && chord >= 4.5) {
    const maxLineDev = Math.max(maxPosH, -maxNegH);
    const alignL = !tanL || Math.abs(tanL[0] * chUy - tanL[1] * chUx) < 0.12;
    const alignR = !tanR || Math.abs(tanR[0] * chUy - tanR[1] * chUx) < 0.12;
    if (maxLineDev <= 0.22 && alignL && alignR) {
      const P1 = [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3];
      const P2 = [P0[0] + 2 * (P3[0] - P0[0]) / 3, P0[1] + 2 * (P3[1] - P0[1]) / 3];
      return { P0, P1, P2, P3, err: maxLineDev, sse: maxLineDev * maxLineDev * n, at: n >> 1, isLine: true, tL: [chUx, chUy], tR: [-chUx, -chUy] };
    }
  }

  let circT_L = null, circT_R = null, circAlpha = null;
  if (n >= 5 && chord > 1.5) {
    const cf = fitCircle2D(pts);
    if (cf && cf.r >= 1.8 && cf.r <= 500 && cf.rms <= Math.max(0.16, cf.r * 0.015)) {
      const r0x = P0[0] - cf.cx, r0y = P0[1] - cf.cy, l0 = Math.hypot(r0x, r0y) || 1;
      const r3x = P3[0] - cf.cx, r3y = P3[1] - cf.cy, l3 = Math.hypot(r3x, r3y) || 1;
      const mid = pts[n >> 1];
      const crossDir = (P0[0] - cf.cx) * (mid[1] - cf.cy) - (P0[1] - cf.cy) * (mid[0] - cf.cx);
      const sgn = crossDir >= 0 ? 1 : -1;
      circT_L = [(-r0y / l0) * sgn, (r0x / l0) * sgn];
      circT_R = [(r3y / l3) * sgn, (-r3x / l3) * sgn];
      const dTheta = Math.acos(clamp((r0x * r3x + r0y * r3y) / (l0 * l3), -1, 1));
      if (dTheta > 0.08 && dTheta < 2.2) {
        circAlpha = (4 / 3) * cf.r * Math.tan(dTheta / 4);
      }
    }
  }

  const useCircL = circT_L && !tanL;
  const useCircR = circT_R && !tanR;
  const adaptiveSpanPx = (chord > 18 && L / chord < 1.02) ? clamp(chord * 0.24, 10.5, 28.0) : 9.5;
  let tL = tanL ? [tanL[0], tanL[1]] : (useCircL ? circT_L : oneSidedTangentOpen(pts, true, adaptiveSpanPx));
  const endFwd = useCircR ? [-circT_R[0], -circT_R[1]] : oneSidedTangentOpen(pts, false, adaptiveSpanPx);
  let tR = tanR ? [tanR[0], tanR[1]] : (useCircR ? circT_R : [-endFwd[0], -endFwd[1]]);

  /* Pastikan garis singgung bebas tidak menunjuk ke sisi seberang tali busur pada busur konveks */
  const enforceConvexTangent = (tVec, isLeft) => {
    if (!convexSign) return tVec;
    const h = tVec[0] * chUy - tVec[1] * chUx;
    if (convexSign * h < -0.01) {
      if (isLeft && circT_L) return circT_L;
      if (!isLeft && circT_R) return circT_R;
      const proj = tVec[0] * chUx + tVec[1] * chUy;
      const perp = Math.abs(h) * 0.5 * convexSign;
      const nx = proj * chUx + perp * chUy, ny = proj * chUy - perp * chUx;
      const nl = Math.hypot(nx, ny) || 1;
      return [nx / nl, ny / nl];
    }
    return tVec;
  };
  tL = enforceConvexTangent(tL, true);
  tR = enforceConvexTangent(tR, false);

  const aNat = circAlpha || (L / 3);
  const regW = circAlpha ? 0.06 : 0.004;

  const solveAlphas = (uParam, dirL = tL, dirR = tR) => {
    let c00 = regW, c01 = 0, c11 = regW, x0 = regW * aNat, x1 = regW * aNat;
    for (let i = 0; i < n; i++) {
      const t = uParam[i], m = 1 - t;
      const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
      const a1x = dirL[0] * b1, a1y = dirL[1] * b1;
      const a2x = dirR[0] * b2, a2y = dirR[1] * b2;
      c00 += a1x * a1x + a1y * a1y;
      c01 += a1x * a2x + a1y * a2y;
      c11 += a2x * a2x + a2y * a2y;
      const tx = pts[i][0] - (P0[0] * (b0 + b1) + P3[0] * (b2 + b3));
      const ty = pts[i][1] - (P0[1] * (b0 + b1) + P3[1] * (b2 + b3));
      x0 += a1x * tx + a1y * ty;
      x1 += a2x * tx + a2y * ty;
    }
    const det = c00 * c11 - c01 * c01;
    const minA = Math.max(0.08 * chord, 0.06 * L);
    const maxA = Math.min(0.58 * L, Math.max(0.64 * chord, 0.52 * L));
    let a1 = Math.abs(det) > 1e-9 ? (x0 * c11 - x1 * c01) / det : aNat;
    let a2 = Math.abs(det) > 1e-9 ? (c00 * x1 - c01 * x0) / det : aNat;
    if (a1 < minA || a1 > maxA) {
      a1 = clamp(a1, minA, maxA);
      if (c11 > 1e-9) a2 = clamp((x1 - c01 * a1) / c11, minA, maxA);
    }
    if (a2 < minA || a2 > maxA) {
      a2 = clamp(a2, minA, maxA);
      if (c00 > 1e-9) a1 = clamp((x0 - c01 * a2) / c00, minA, maxA);
    }
    return [
      [P0[0] + dirL[0] * a1, P0[1] + dirL[1] * a1],
      [P3[0] + dirR[0] * a2, P3[1] + dirR[1] * a2]
    ];
  };

  let minBx = Infinity, maxBx = -Infinity, minBy = Infinity, maxBy = -Infinity;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (p[0] < minBx) minBx = p[0]; if (p[0] > maxBx) maxBx = p[0];
    if (p[1] < minBy) minBy = p[1]; if (p[1] > maxBy) maxBy = p[1];
  }

  const computeErr = (uParam, P1, P2) => {
    let maxE = 0, sse = 0, maxI = n >> 1;
    for (let i = 1; i < n - 1; i++) {
      const Q = evalBezier(P0, P1, P2, P3, uParam[i]);
      const d2 = (Q[0] - pts[i][0]) ** 2 + (Q[1] - pts[i][1]) ** 2;
      sse += d2;
      if (d2 > maxE) { maxE = d2; maxI = i; }
    }
    /* Penalti Overshoot Kotak Pembatas (Bounding-Hull Containment Guard):
       Cegah perut kurva Bézier melambung keluar dari kotak pembatas titik asli (seperti bagian bawah bar baterai)! */
    for (const tTest of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const Qt = evalBezier(P0, P1, P2, P3, tTest);
      const overX = Math.max(0, minBx - Qt[0], Qt[0] - maxBx);
      const overY = Math.max(0, minBy - Qt[1], Qt[1] - maxBy);
      const over = Math.hypot(overX, overY);
      if (over > 0.28) {
        const pen2 = (over * 2.5) ** 2;
        sse += pen2 * 4;
        if (pen2 > maxE) maxE = pen2;
      }
    }
    return { err: Math.sqrt(maxE), sse, at: maxI };
  };

  /* Uji kelayakan konveksitas titik kontrol P1, P2 agar tidak pernah membentuk gelombang S atau melambung keluar */
  const isConvexPairValid = (cP1, cP2) => {
    if (chord < 1.5) return true;
    const h1 = (cP1[0] - P0[0]) * chUy - (cP1[1] - P0[1]) * chUx;
    const h2 = (cP2[0] - P0[0]) * chUy - (cP2[1] - P0[1]) * chUx;
    if (minOppExcur <= Math.max(0.85, chord * 0.035) && h1 * h2 < -1e-4) return false;
    if (convexSign && (convexSign * h1 < -0.005 || convexSign * h2 < -0.005)) return false;
    for (const tTest of [0.25, 0.5, 0.75]) {
      const Qt = evalBezier(P0, cP1, cP2, P3, tTest);
      if (Qt[0] < minBx - 0.35 || Qt[0] > maxBx + 0.35 || Qt[1] < minBy - 0.35 || Qt[1] > maxBy + 0.35) return false;
    }
    const proj1 = (cP1[0] - P0[0]) * chUx + (cP1[1] - P0[1]) * chUy;
    const proj2 = (P3[0] - cP2[0]) * chUx + (P3[1] - cP2[1]) * chUy;
    const minP1 = tanL ? -0.05 * chord : 0.02 * chord;
    const minP2 = tanR ? -0.05 * chord : 0.02 * chord;
    return proj1 >= minP1 && proj2 >= minP2 && proj1 <= 0.82 * chord && proj2 <= 0.82 * chord;
  };

  if (circAlpha) {
    const cP1 = [P0[0] + tL[0] * circAlpha, P0[1] + tL[1] * circAlpha];
    const cP2 = [P3[0] + tR[0] * circAlpha, P3[1] + tR[1] * circAlpha];
    u = reparameterize(pts, u, P0, cP1, cP2, P3);
    u = reparameterize(pts, u, P0, cP1, cP2, P3);
  }
  if (minOppExcur <= Math.max(0.85, chord * 0.035) && chord > 1.5) {
    const hL = tL[0] * chUy - tL[1] * chUx;
    const hR = (-tR[0]) * chUy - (-tR[1]) * chUx;
    if (hL * hR > 1e-4 && maxExcur >= 0.12) {
      const fixVec = (v, isEnd) => {
        const s = isEnd ? -1 : 1;
        const hv = (s * v[0]) * chUy - (s * v[1]) * chUx;
        if (hv * domSign * s > 0) {
          const proj = Math.max(0.2, (s * v[0]) * chUx + (s * v[1]) * chUy);
          const perp = -domSign * s * Math.min(Math.abs(hv) * 0.35, 0.18 * proj);
          const nx = s * (proj * chUx + perp * chUy);
          const ny = s * (proj * chUy - perp * chUx);
          const nl = Math.hypot(nx, ny) || 1;
          return [nx / nl, ny / nl];
        }
        return v;
      };
      tL = fixVec(tL, false);
      tR = fixVec(tR, true);
    }
  }
  let [P1, P2] = solveAlphas(u);
  let res = computeErr(u, P1, P2);
  if (circAlpha) {
    const cP1 = [P0[0] + tL[0] * circAlpha, P0[1] + tL[1] * circAlpha];
    const cP2 = [P3[0] + tR[0] * circAlpha, P3[1] + tR[1] * circAlpha];
    const cRes = computeErr(u, cP1, cP2);
    if (cRes.err <= res.err * 1.05) { P1 = cP1; P2 = cP2; res = cRes; }
  }
  if (res.err > 0.015 && res.err < 18.0 && n >= 4) {
    for (let it = 0; it < 10; it++) {
      const uNext = reparameterize(pts, u, P0, P1, P2, P3);
      const [nP1, nP2] = solveAlphas(uNext);
      const nRes = computeErr(uNext, nP1, nP2);
      if (nRes.err < res.err && isConvexPairValid(nP1, nP2)) { u = uNext; P1 = nP1; P2 = nP2; res = nRes; }
      else break;
    }
  }

  if ((!tanL || !tanR) && res.err > 0.14 && n >= 6) {
    const solveFreeOrSemi2D = (uParam) => {
      const reg = 1e-3;
      if (tanL && !tanR) {
        let s11 = reg, s12x = 0, s12y = 0, s22 = reg;
        let r1 = reg * aNat, r2x = reg * tR[0] * aNat, r2y = reg * tR[1] * aNat;
        for (let i = 0; i < n; i++) {
          const t = uParam[i], m = 1 - t;
          const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
          const rx = pts[i][0] - (b0 + b1) * P0[0] - (b2 + b3) * P3[0];
          const ry = pts[i][1] - (b0 + b1) * P0[1] - (b2 + b3) * P3[1];
          s11 += b1 * b1;
          s12x += b1 * b2 * tL[0];
          s12y += b1 * b2 * tL[1];
          s22 += b2 * b2;
          r1 += b1 * (tL[0] * rx + tL[1] * ry);
          r2x += b2 * rx;
          r2y += b2 * ry;
        }
        const den = s11 - (s12x * s12x + s12y * s12y) / s22;
        const a1 = clamp(Math.abs(den) > 1e-9 ? (r1 - (s12x * r2x + s12y * r2y) / s22) / den : aNat, 0.08 * chord, 0.78 * L);
        const dx2 = (r2x - s12x * a1) / s22;
        const dy2 = (r2y - s12y * a1) / s22;
        const l2 = Math.hypot(dx2, dy2) || 1;
        const sc2 = clamp(l2, 0.08 * chord, 0.78 * L) / l2;
        return [[P0[0] + a1 * tL[0], P0[1] + a1 * tL[1]], [P3[0] + dx2 * sc2, P3[1] + dy2 * sc2]];
      } else if (!tanL && tanR) {
        let s11 = reg, s12x = 0, s12y = 0, s22 = reg;
        let r1x = reg * tL[0] * aNat, r1y = reg * tL[1] * aNat, r2 = reg * aNat;
        for (let i = 0; i < n; i++) {
          const t = uParam[i], m = 1 - t;
          const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
          const rx = pts[i][0] - (b0 + b1) * P0[0] - (b2 + b3) * P3[0];
          const ry = pts[i][1] - (b0 + b1) * P0[1] - (b2 + b3) * P3[1];
          s11 += b1 * b1;
          s12x += b1 * b2 * tR[0];
          s12y += b1 * b2 * tR[1];
          s22 += b2 * b2;
          r1x += b1 * rx;
          r1y += b1 * ry;
          r2 += b2 * (tR[0] * rx + tR[1] * ry);
        }
        const den = s22 - (s12x * s12x + s12y * s12y) / s11;
        const a2 = clamp(Math.abs(den) > 1e-9 ? (r2 - (s12x * r1x + s12y * r1y) / s11) / den : aNat, 0.08 * chord, 0.78 * L);
        const dx1 = (r1x - s12x * a2) / s11;
        const dy1 = (r1y - s12y * a2) / s11;
        const l1 = Math.hypot(dx1, dy1) || 1;
        const sc1 = clamp(l1, 0.08 * chord, 0.78 * L) / l1;
        return [[P0[0] + dx1 * sc1, P0[1] + dy1 * sc1], [P3[0] + a2 * tR[0], P3[1] + a2 * tR[1]]];
      } else {
        let s11 = reg, s12 = 0, s22 = reg;
        let r1x = reg * tL[0] * aNat, r1y = reg * tL[1] * aNat;
        let r2x = reg * tR[0] * aNat, r2y = reg * tR[1] * aNat;
        for (let i = 0; i < n; i++) {
          const t = uParam[i], m = 1 - t;
          const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
          const rx = pts[i][0] - (b0 + b1) * P0[0] - (b2 + b3) * P3[0];
          const ry = pts[i][1] - (b0 + b1) * P0[1] - (b2 + b3) * P3[1];
          s11 += b1 * b1; s12 += b1 * b2; s22 += b2 * b2;
          r1x += b1 * rx; r1y += b1 * ry;
          r2x += b2 * rx; r2y += b2 * ry;
        }
        const det = s11 * s22 - s12 * s12;
        if (Math.abs(det) < 1e-9) return null;
        let dx1 = (s22 * r1x - s12 * r2x) / det, dy1 = (s22 * r1y - s12 * r2y) / det;
        let dx2 = (s11 * r2x - s12 * r1x) / det, dy2 = (s11 * r2y - s12 * r1y) / det;
        const l1 = Math.hypot(dx1, dy1) || 1, l2 = Math.hypot(dx2, dy2) || 1;
        const sc1 = clamp(l1, 0.08 * chord, 0.78 * L) / l1;
        const sc2 = clamp(l2, 0.08 * chord, 0.78 * L) / l2;
        return [[P0[0] + dx1 * sc1, P0[1] + dy1 * sc1], [P3[0] + dx2 * sc2, P3[1] + dy2 * sc2]];
      }
    };
    let u2 = new Float64Array(n);
    for (let i = 1; i < n; i++) u2[i] = u2[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 0; i < n; i++) u2[i] /= L;
    let pair = solveFreeOrSemi2D(u2);
    if (pair && isConvexPairValid(pair[0], pair[1])) {
      let [fP1, fP2] = pair;
      let fRes = computeErr(u2, fP1, fP2);
      let bestU = u2, bestP1 = fP1, bestP2 = fP2, bestRes = fRes;
      for (let it = 0; it < 10; it++) {
        const uNext = reparameterize(pts, u2, P0, fP1, fP2, P3);
        const nPair = solveFreeOrSemi2D(uNext);
        if (!nPair || !isConvexPairValid(nPair[0], nPair[1])) break;
        const nRes = computeErr(uNext, nPair[0], nPair[1]);
        u2 = uNext; fP1 = nPair[0]; fP2 = nPair[1]; fRes = nRes;
        if (nRes.err < bestRes.err) { bestU = uNext; bestP1 = fP1; bestP2 = fP2; bestRes = nRes; }
      }
      u2 = bestU; fP1 = bestP1; fP2 = bestP2; fRes = bestRes;
      if (fRes.err < res.err * 0.96 && isConvexPairValid(fP1, fP2)) {
        u = u2; P1 = fP1; P2 = fP2; res = fRes;
        const d1x = P1[0] - P0[0], d1y = P1[1] - P0[1], l1 = Math.hypot(d1x, d1y) || 1;
        const d2x = P2[0] - P3[0], d2y = P2[1] - P3[1], l2 = Math.hypot(d2x, d2y) || 1;
        if (!tanL) tL = [d1x / l1, d1y / l1];
        if (!tanR) tR = [d2x / l2, d2y / l2];
      }
    }
  }

  if (!circAlpha && res.err > 0.14 && res.err < 5.5 && n >= 6) {
    const rotVec = (v, ang) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
    };
    const deltasL = tanL ? [-0.04, -0.02, 0.02, 0.04] : [-0.32, -0.20, -0.12, -0.06, -0.03, 0.03, 0.06, 0.12, 0.20, 0.32];
    const deltasR = tanR ? [-0.04, -0.02, 0.02, 0.04] : [-0.32, -0.20, -0.12, -0.06, -0.03, 0.03, 0.06, 0.12, 0.20, 0.32];
    for (let pass = 0; pass < 2; pass++) {
      let improved = false;
      for (const da of deltasL) {
        const candTL = rotVec(tL, da);
        const [cP1, cP2] = solveAlphas(u, candTL, tR);
        if (!isConvexPairValid(cP1, cP2)) continue;
        const uCand = reparameterize(pts, u, P0, cP1, cP2, P3);
        const [rP1, rP2] = solveAlphas(uCand, candTL, tR);
        if (!isConvexPairValid(rP1, rP2)) continue;
        const cRes = computeErr(uCand, rP1, rP2);
        if (cRes.err < res.err - 0.003) {
          tL = candTL; u = uCand; P1 = rP1; P2 = rP2; res = cRes; improved = true;
        }
      }
      for (const db of deltasR) {
        const candTR = rotVec(tR, db);
        const [cP1, cP2] = solveAlphas(u, tL, candTR);
        if (!isConvexPairValid(cP1, cP2)) continue;
        const uCand = reparameterize(pts, u, P0, cP1, cP2, P3);
        const [rP1, rP2] = solveAlphas(uCand, tL, candTR);
        if (!isConvexPairValid(rP1, rP2)) continue;
        const cRes = computeErr(uCand, rP1, rP2);
        if (cRes.err < res.err - 0.003) {
          tR = candTR; u = uCand; P1 = rP1; P2 = rP2; res = cRes; improved = true;
        }
      }
      if (!improved || res.err <= 0.14) break;
    }
  }
  return { P0, P1, P2, P3, err: res.err, sse: res.sse, at: res.at, tL, tR, pts, lockL: !!tanL, lockR: !!tanR };
}

function fitChain(pts, tol, depth = 0, tL = null, tR = null, allowLine = false) {
  const n = pts.length;
  if (n < 2) return [];
  if (n === 2) {
    const [a, b] = pts;
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [{ P0: a, P1: [a[0] + dx / 3, a[1] + dy / 3], P2: [a[0] + 2 * dx / 3, a[1] + 2 * dy / 3], P3: b, isLine: allowLine, tL: [dx / l, dy / l], tR: [-dx / l, -dy / l], pts, lockL: !!tL, lockR: !!tR }];
  }
  const f = fitCubicLS(pts, tL, tR, allowLine);
  if (!f) return [];
  const chLen = Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]);
  const shallowBoost = (chLen > 12 && n > 10) ? 1.18 : 1.06;
  const effTol = (depth === 0 ? Math.max(tol * 1.45, 0.32) : depth === 1 ? Math.max(tol * 1.28, 0.28) : Math.max(tol * 1.15, 0.24)) * shallowBoost;
  if (f.err <= effTol || depth >= 5 || n <= 6) return [f];

  const m = clamp(f.at, 2, n - 2);
  const adaptW = clamp(Math.round(Math.min(m, n - 1 - m) * 0.45), 8, 28);
  const tMid = smoothTangentOpen(pts, m, adaptW);
  return [
    ...fitChain(pts.slice(0, m + 1), tol, depth + 1, tL, [-tMid[0], -tMid[1]], false),
    ...fitChain(pts.slice(m), tol, depth + 1, tMid, tR, false)
  ];
}

function harmonizeG1Joints(segs, jointCorner) {
  const m = segs.length;
  if (m < 2) return segs;
  for (let i = 0; i < m; i++) {
    if (jointCorner && jointCorner[i]) continue;
    const a = segs[i], b = segs[(i + 1) % m];
    if (a.isLine && b.isLine) continue;
    const P = a.P3;
    if (a.isLine && !b.isLine) {
      const dx = a.P3[0] - a.P0[0], dy = a.P3[1] - a.P0[1], l = Math.hypot(dx, dy);
      const lout = Math.hypot(b.P1[0] - P[0], b.P1[1] - P[1]);
      if (l > 1e-4 && lout > 1e-4) {
        const tx = dx / l, ty = dy / l;
        if ((b.P1[0] - P[0]) * tx + (b.P1[1] - P[1]) * ty > 0.65 * lout) {
          b.P1 = [P[0] + tx * lout, P[1] + ty * lout];
        }
      }
      continue;
    }
    if (!a.isLine && b.isLine) {
      const dx = b.P3[0] - b.P0[0], dy = b.P3[1] - b.P0[1], l = Math.hypot(dx, dy);
      const lin = Math.hypot(P[0] - a.P2[0], P[1] - a.P2[1]);
      if (l > 1e-4 && lin > 1e-4) {
        const tx = dx / l, ty = dy / l;
        if ((P[0] - a.P2[0]) * tx + (P[1] - a.P2[1]) * ty > 0.65 * lin) {
          a.P2 = [P[0] - tx * lin, P[1] - ty * lin];
        }
      }
      continue;
    }
    const vinX = P[0] - a.P2[0], vinY = P[1] - a.P2[1];
    const voutX = b.P1[0] - P[0], voutY = b.P1[1] - P[1];
    const lin = Math.hypot(vinX, vinY), lout = Math.hypot(voutX, voutY);
    if (lin < 1e-4 || lout < 1e-4) continue;
    const chA = Math.hypot(a.P3[0] - a.P0[0], a.P3[1] - a.P0[1]) || 1;
    const chB = Math.hypot(b.P3[0] - b.P0[0], b.P3[1] - b.P0[1]) || 1;
    const uinX = vinX / lin, uinY = vinY / lin;
    const uoutX = voutX / lout, uoutY = voutY / lout;
    /* Hanya harmonisasi bila kedua vektor singgung memang searah (selisih sudut <= ~56 derajat) */
    if (uinX * uoutX + uinY * uoutY < 0.55) continue;
    /* Bobot proporsional terhadap akar panjang tali busur agar segmen mikro tidak membengkokkan segmen panjang */
    const wA = Math.sqrt(chA), wB = Math.sqrt(chB);
    const ux = uinX * wA + uoutX * wB;
    const uy = uinY * wA + uoutY * wB;
    const ul = Math.hypot(ux, uy);
    if (ul < 1e-4) continue;
    const tx = ux / ul, ty = uy / ul;
    const candP2 = [P[0] - tx * lin, P[1] - ty * lin];
    const candP1 = [P[0] + tx * lout, P[1] + ty * lout];
    const maxShiftA = Math.min(0.85, chA * 0.08);
    const maxShiftB = Math.min(0.85, chB * 0.08);
    if (Math.hypot(candP2[0] - a.P2[0], candP2[1] - a.P2[1]) <= maxShiftA) a.P2 = candP2;
    if (Math.hypot(candP1[0] - b.P1[0], candP1[1] - b.P1[1]) <= maxShiftB) b.P1 = candP1;
  }
  return segs;
}

function fitLoopBeziers(smoothed, tol, advOpt = {}) {
  const { pts, corners, smoothKnots, knotTangents, juncFlags } = smoothed;
  const n = pts.length;
  if (n < 3) return [];
  const hasHardJunc = juncFlags && juncFlags.some(v => v === 1);
  if (smoothed.isTrueCircle || (!hasHardJunc && n >= 8)) {
    const cf = smoothed.circleFit || fitCircle2D(pts);
    if (cf && cf.r >= (smoothed.isTrueCircle ? 1.10 : 1.85)) {
      let maxRDev = 0, polyA = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
        const dR = Math.abs(Math.hypot(p[0] - cf.cx, p[1] - cf.cy) - cf.r);
        if (dR > maxRDev) maxRDev = dR;
        polyA += p[0] * q[1] - q[0] * p[1];
      }
      const absA = Math.abs(polyA) * 0.5;
      const areaRatio = absA / (Math.PI * cf.r * cf.r);
      const bw = maxX - minX, bh = maxY - minY;
      const aspect = bw > 0 && bh > 0 ? (bw / bh) : 0;
      const rms = cf.rms != null ? cf.rms : 0;
      if (smoothed.isTrueCircle || (aspect >= 0.88 && aspect <= 1.13 && areaRatio >= 0.91 && areaRatio <= 1.09 &&
          rms <= Math.max(0.32, cf.r * 0.025) && maxRDev <= Math.max(0.75, cf.r * 0.055))) {
        const cx = cf.cx, cy = cf.cy, r = cf.r;
        const sgn = polyA >= 0 ? 1 : -1;
        const juncList = [];
        if (juncFlags) {
          for (let i = 0; i < n; i++) if (juncFlags[i]) juncList.push(i);
        }
        /* Jika lingkaran tidak memiliki T-junction, gunakan 4 kuadran Bézier standar */
        if (juncList.length === 0) {
          const k = 0.552284749831 * r;
          const T = [cx, cy - r], R = [cx + sgn * r, cy], B = [cx, cy + r], L = [cx - sgn * r, cy];
          return [
            { P0: T, P1: [cx + sgn * k, cy - r], P2: [cx + sgn * r, cy - k], P3: R, isLine: false, isTrueCircleArc: true, tL: [sgn, 0], tR: [0, -1], startSharp: false, endSharp: false, spanIdx: 0 },
            { P0: R, P1: [cx + sgn * r, cy + k], P2: [cx + sgn * k, cy + r], P3: B, isLine: false, isTrueCircleArc: true, tL: [0, 1], tR: [sgn, 0], startSharp: false, endSharp: false, spanIdx: 0 },
            { P0: B, P1: [cx - sgn * k, cy + r], P2: [cx - sgn * r, cy + k], P3: L, isLine: false, isTrueCircleArc: true, tL: [-sgn, 0], tR: [0, 1], startSharp: false, endSharp: false, spanIdx: 0 },
            { P0: L, P1: [cx - sgn * r, cy - k], P2: [cx - sgn * k, cy - r], P3: T, isLine: false, isTrueCircleArc: true, tL: [0, -1], tR: [-sgn, 0], startSharp: false, endSharp: false, spanIdx: 0 }
          ];
        }
        /* Knot-Constrained Exact Circular Arc Splitting pada T-Junction Bersama:
           Membagi lingkaran tepat pada sudut polar setiap T-junction agar simpul ujung (P0, P3) dan spanIdx
           sinkron 100% bit-demi-bit dengan pita warna & latar di synchronizeSharedTopology! */
        const circleSegs = [];
        const mJ = juncList.length;
        for (let spanIdx = 0; spanIdx < mJ; spanIdx++) {
          const ia = juncList[spanIdx], ib = juncList[(spanIdx + 1) % mJ];
          const Pa = pts[ia], Pb = pts[ib];
          const thA = Math.atan2(Pa[1] - cy, Pa[0] - cx);
          const thB = Math.atan2(Pb[1] - cy, Pb[0] - cx);
          let dTheta = (thB - thA) * sgn;
          while (dTheta <= 1e-5) dTheta += 2 * Math.PI;
          while (dTheta > 2 * Math.PI + 1e-5) dTheta -= 2 * Math.PI;
          const numSub = Math.max(1, Math.ceil(dTheta / (Math.PI * 0.52)));
          const stepTh = (dTheta / numSub) * sgn;
          const alpha = (4 / 3) * Math.tan(Math.abs(stepTh) * 0.25) * r;
          for (let sub = 0; sub < numSub; sub++) {
            const a0 = thA + sub * stepTh;
            const a1 = (sub === numSub - 1) ? thB : (thA + (sub + 1) * stepTh);
            const P0 = (sub === 0) ? [Pa[0], Pa[1]] : [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
            const P3 = (sub === numSub - 1) ? [Pb[0], Pb[1]] : [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
            const t0x = -sgn * Math.sin(a0), t0y = sgn * Math.cos(a0);
            const t1x = -sgn * Math.sin(a1), t1y = sgn * Math.cos(a1);
            const P1 = [P0[0] + alpha * t0x, P0[1] + alpha * t0y];
            const P2 = [P3[0] - alpha * t1x, P3[1] - alpha * t1y];
            circleSegs.push({
              P0, P1, P2, P3,
              isLine: false,
              isTrueCircleArc: true,
              tL: [t0x, t0y],
              tR: [-t1x, -t1y],
              startSharp: false,
              endSharp: false,
              spanIdx
            });
          }
        }
        return circleSegs;
      }
    }
  }

  const lineStr = (advOpt.lineStraighten ?? 56) / 100;
  const extremumAlign = advOpt.extremumAlign !== false;

  const juncIndices = [];
  if (juncFlags) {
    for (let i = 0; i < n; i++) if (juncFlags[i]) juncIndices.push(i);
  }
  const getSpanIdx = knotI => {
    if (juncIndices.length === 0) return 0;
    for (let r = juncIndices.length - 1; r >= 0; r--) {
      if (knotI >= juncIndices[r]) return r;
    }
    return 0;
  };

  let allKnots = [];
  for (let i = 0; i < n; i++) {
    const jf = juncFlags ? juncFlags[i] : 0;
    const isHardJunc = (jf === 1);
    const isPassJunc = (jf === 2) && !(corners && corners[i]);
    if ((corners && corners[i]) || isHardJunc) {
      allKnots.push({ i, sharp: true, isJunc: jf > 0, extremum: false });
    } else if ((smoothKnots && smoothKnots[i]) || isPassJunc) {
      const lockedT = knotTangents && knotTangents.get(i);
      let t = lockedT || smoothTangentClosed(pts, i, 7);
      if (!lockedT && extremumAlign) {
        if (Math.abs(t[1]) < 0.045) t = [t[0] < 0 ? -1 : 1, 0];
        else if (Math.abs(t[0]) < 0.045) t = [0, t[1] < 0 ? -1 : 1];
      }
      allKnots.push({ i, sharp: false, isJunc: jf > 0, extremum: !isPassJunc && !!lockedT, t, locked: !!lockedT || isPassJunc });
    }
  }

  if (allKnots.length === 0) {
    let iMinX = 0, iMaxX = 0, iMinY = 0, iMaxY = 0;
    for (let i = 1; i < n; i++) {
      if (pts[i][0] < pts[iMinX][0]) iMinX = i;
      if (pts[i][0] > pts[iMaxX][0]) iMaxX = i;
      if (pts[i][1] < pts[iMinY][1]) iMinY = i;
      if (pts[i][1] > pts[iMaxY][1]) iMaxY = i;
    }
    const rawCard = [iMinX, iMaxX, iMinY, iMaxY].sort((a, b) => a - b);
    const card = [];
    for (const ci of rawCard) {
      if (!card.length || (ci - card[card.length - 1] >= n / 12 && (n - ci + card[0]) >= n / 12)) card.push(ci);
    }
    if (card.length < 2) card.push((card[0] + (n >> 1)) % n);
    allKnots = card.map(i => {
      let t = smoothTangentClosed(pts, i, 7);
      if (extremumAlign) {
        if (Math.abs(t[1]) < 0.045) t = [t[0] < 0 ? -1 : 1, 0];
        else if (Math.abs(t[0]) < 0.045) t = [0, t[1] < 0 ? -1 : 1];
      }
      return { i, sharp: false, isJunc: false, extremum: true, t, locked: false };
    });
  } else if (allKnots.length === 1) {
    const opp = (allKnots[0].i + (n >> 1)) % n;
    allKnots.push({ i: opp, sharp: false, isJunc: false, extremum: true, t: smoothTangentClosed(pts, opp, 7) });
    allKnots.sort((a, b) => a.i - b.i);
  }

  let segs = [], jointCorner = [], jointExt = [];
  for (let k = 0; k < allKnots.length; k++) {
    const ka = allKnots[k], kb = allKnots[(k + 1) % allKnots.length];
    const spanIdx = getSpanIdx(ka.i);
    const ch = [];
    for (let i = ka.i; ; i = (i + 1) % n) {
      ch.push(pts[i]);
      if (i === kb.i && ch.length > 1) break;
      if (ch.length > n + 2) break;
    }
    if (ch.length < 2) continue;

    const P0 = ch[0], P3 = ch[ch.length - 1];
    const chord = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
    if (chord > 1e-6) {
      const ux = (P3[0] - P0[0]) / chord, uy = (P3[1] - P0[1]) / chord;
      let maxD = 0, sumSD = 0, sumAD = 0;
      for (let i = 1; i < ch.length - 1; i++) {
        const sd = (ch[i][0] - P0[0]) * uy - (ch[i][1] - P0[1]) * ux;
        const d = Math.abs(sd);
        if (d > maxD) maxD = d;
        sumSD += sd;
        sumAD += d;
      }
      const isOneSidedCurve = sumAD > 1e-5 && (Math.abs(sumSD) / sumAD) >= 0.60 && maxD > 0.20;
      const midIdx = (ka.i + Math.floor(((kb.i - ka.i + n) % n) * 0.5)) % n;
      const isFlaggedStraight = !!(smoothed.straightSpanFlags && smoothed.straightSpanFlags[midIdx]) && !isOneSidedCurve;
      const isAxisChord = Math.min(Math.abs(ux), Math.abs(uy)) <= 0.12;
      const bothHardCorners = ka.sharp && kb.sharp;
      const lineLimit = isFlaggedStraight
        ? Math.max(isAxisChord ? 0.42 : (0.28 + lineStr * 0.16), tol * 1.05)
        : (bothHardCorners && chord >= 3.5 && !isOneSidedCurve)
        ? Math.min(0.24, Math.max(0.16, tol * 0.85))
        : 0.075;
      const alignA = ka.sharp || !ka.t || Math.abs(ka.t[0] * uy - ka.t[1] * ux) <= 0.16;
      const alignB = kb.sharp || !kb.t || Math.abs(kb.t[0] * uy - kb.t[1] * ux) <= 0.16;
      if (maxD <= lineLimit && alignA && alignB) {
        segs.push({
          P0, P1: [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3],
          P2: [P0[0] + 2 * (P3[0] - P0[0]) / 3, P0[1] + 2 * (P3[1] - P0[1]) / 3],
          P3, isLine: true, tL: [ux, uy], tR: [-ux, -uy], startSharp: ka.sharp, endSharp: kb.sharp, spanIdx
        });
        jointCorner.push(kb.sharp);
        jointExt.push(kb.extremum);
        continue;
      }
    }

    /* Jika rentang ch (panjang >= 10) merupakan busur lingkaran parsial murni, gunakan konstruksi Bézier analitik lingkaran! */
    if (ch.length >= 10 && chord >= 8.0) {
      const cfSpan = fitCircle2D(ch);
      const lfSpan = fitLine2D(ch);
      if (cfSpan && cfSpan.r >= 5.0 * (tol / 0.18) && cfSpan.r <= 600 &&
          cfSpan.rms <= Math.max(0.24, tol * 1.25) && (!lfSpan || cfSpan.rms < lfSpan.rms * 0.48)) {
        let maxArcD = 0;
        for (let i = 0; i < ch.length; i++) {
          const dR = Math.abs(Math.hypot(ch[i][0] - cfSpan.cx, ch[i][1] - cfSpan.cy) - cfSpan.r);
          if (dR > maxArcD) maxArcD = dR;
        }
        const th0 = Math.atan2(P0[1] - cfSpan.cy, P0[0] - cfSpan.cx);
        const th1 = Math.atan2(P3[1] - cfSpan.cy, P3[0] - cfSpan.cx);
        const Pmid = ch[ch.length >> 1];
        const thM = Math.atan2(Pmid[1] - cfSpan.cy, Pmid[0] - cfSpan.cx);
        let dTh01 = Math.atan2(Math.sin(th1 - th0), Math.cos(th1 - th0));
        const dTh0M = Math.atan2(Math.sin(thM - th0), Math.cos(thM - th0));
        if (dTh01 * dTh0M < 0) dTh01 += (dTh01 > 0 ? -2 * Math.PI : 2 * Math.PI);
        const absSweep = Math.abs(dTh01);
        if (maxArcD <= Math.max(0.55, tol * 2.6) && absSweep >= 0.42 && absSweep <= Math.PI * 1.65) {
          const sgnArc = dTh01 >= 0 ? 1 : -1;
          const numSub = Math.max(1, Math.ceil(absSweep / (Math.PI * 0.52)));
          const stepTh = dTh01 / numSub;
          const rArc = cfSpan.r;
          const alphaArc = (4 / 3) * Math.tan(Math.abs(stepTh) * 0.25) * rArc;
          for (let sub = 0; sub < numSub; sub++) {
            const a0 = th0 + sub * stepTh;
            const a1 = (sub === numSub - 1) ? th1 : (th0 + (sub + 1) * stepTh);
            const subP0 = (sub === 0) ? [P0[0], P0[1]] : [cfSpan.cx + rArc * Math.cos(a0), cfSpan.cy + rArc * Math.sin(a0)];
            const subP3 = (sub === numSub - 1) ? [P3[0], P3[1]] : [cfSpan.cx + rArc * Math.cos(a1), cfSpan.cy + rArc * Math.sin(a1)];
            const t0x = -sgnArc * Math.sin(a0), t0y = sgnArc * Math.cos(a0);
            const t1x = -sgnArc * Math.sin(a1), t1y = sgnArc * Math.cos(a1);
            const subP1 = [subP0[0] + alphaArc * t0x, subP0[1] + alphaArc * t0y];
            const subP2 = [subP3[0] - alphaArc * t1x, subP3[1] - alphaArc * t1y];
            segs.push({
              P0: subP0, P1: subP1, P2: subP2, P3: subP3,
              isLine: false, isTrueCircleArc: true,
              tL: [t0x, t0y], tR: [-t1x, -t1y],
              startSharp: (sub === 0) ? ka.sharp : false,
              endSharp: (sub === numSub - 1) ? kb.sharp : false,
              spanIdx
            });
            jointCorner.push(sub === numSub - 1 ? kb.sharp : false);
            jointExt.push(false);
          }
          continue;
        }
      }
    }

    const tL = ka.sharp ? null : ka.t;
    const endT = kb.sharp ? null : kb.t;
    const tR = endT ? [-endT[0], -endT[1]] : null;
    const fs = fitChain(ch, tol, 0, tL, tR, ka.sharp && kb.sharp);
    for (let s = 0; s < fs.length; s++) {
      const segItem = fs[s];
      segItem.startSharp = (s === 0) ? ka.sharp : false;
      segItem.endSharp = (s === fs.length - 1) ? kb.sharp : false;
      segItem.spanIdx = spanIdx;
      segs.push(segItem);
      jointCorner.push(s === fs.length - 1 ? kb.sharp : false);
      jointExt.push(s === fs.length - 1 ? kb.extremum : false);
    }
  }

  if (lineStr > 0.15) {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.isLine) continue;
      const bothSharp = !!(s.startSharp && s.endSharp);
      const dx = s.P3[0] - s.P0[0], dy = s.P3[1] - s.P0[1];
      const chord = Math.hypot(dx, dy);
      if (chord < 2.0) continue;
      const ux = dx / chord, uy = dy / chord;
      const d1 = (s.P1[0] - s.P0[0]) * uy - (s.P1[1] - s.P0[1]) * ux;
      const d2 = (s.P2[0] - s.P0[0]) * uy - (s.P2[1] - s.P0[1]) * ux;
      const maxH = Math.max(Math.abs(d1), Math.abs(d2));
      const ptsDev = (s.pts && s.pts.length >= 4)
        ? s.pts.reduce((mx, p) => Math.max(mx, Math.abs((p[0] - s.P0[0]) * uy - (p[1] - s.P0[1]) * ux)), 0)
        : maxH;
      const midSpanFlagged = !!(smoothed.straightSpanFlags && s.pts && s.pts.length >= 2);
      const isNearlyFlat = bothSharp
        ? (chord >= 8.0 && ptsDev <= Math.min(0.18, tol * 0.75) && maxH <= Math.max(0.20, tol * 0.72))
        : (midSpanFlagged && chord >= 14.0 && ptsDev <= Math.min(0.12, tol * 0.60) && maxH <= Math.max(0.24, chord * 0.012));
      if (isNearlyFlat) {
        s.P1 = [s.P0[0] + dx / 3, s.P0[1] + dy / 3];
        s.P2 = [s.P0[0] + 2 * dx / 3, s.P0[1] + 2 * dy / 3];
        s.isLine = true;
        s.tL = [ux, uy];
        s.tR = [-ux, -uy];
      }
    }
  }

  const sampleSeg = (s, from) => {
    const out = [];
    for (let k = from; k <= 16; k++) out.push(evalBezier(s.P0, s.P1, s.P2, s.P3, k / 16));
    return out;
  };
  const concatPts = (a, b) => {
    if (a.pts && b.pts && a.pts.length >= 2 && b.pts.length >= 2) {
      return a.pts.concat(b.pts.slice(1));
    }
    return sampleSeg(a, 0).concat(sampleSeg(b, 1));
  };
  const makeLineSeg = (P0, P3, startSharp, endSharp, spanIdx, ptsArr = null) => {
    const dx = P3[0] - P0[0], dy = P3[1] - P0[1], ch = Math.hypot(dx, dy) || 1;
    const ux = dx / ch, uy = dy / ch;
    return {
      P0: [P0[0], P0[1]],
      P1: [P0[0] + dx / 3, P0[1] + dy / 3],
      P2: [P0[0] + 2 * dx / 3, P0[1] + 2 * dy / 3],
      P3: [P3[0], P3[1]],
      err: 0, sse: 0, isLine: true,
      tL: [ux, uy], tR: [-ux, -uy],
      startSharp: !!startSharp, endSharp: !!endSharp, spanIdx,
      pts: ptsArr || [P0, P3], lockL: true, lockR: true
    };
  };
  const maxCollinearDev = (ptsArr, P0, P3) => {
    const dx = P3[0] - P0[0], dy = P3[1] - P0[1], ch = Math.hypot(dx, dy);
    if (ch < 1e-6) return 0;
    const ux = dx / ch, uy = dy / ch;
    let mx = 0;
    for (let k = 0; k < ptsArr.length; k++) {
      const d = Math.abs((ptsArr[k][0] - P0[0]) * uy - (ptsArr[k][1] - P0[1]) * ux);
      if (d > mx) mx = d;
    }
    return mx;
  };

  const mdlPenalty = tol * tol * 4.5;
  const lineMergeTol = Math.max(0.28 + lineStr * 0.20, tol * 1.05);
  let improved = true, guard = 0;
  while (improved && guard++ < 8 && segs.length > 2) {
    improved = false;
    const out = [], outC = [], outE = [];
    for (let i = 0; i < segs.length; i++) {
      if (i === segs.length - 1 || segs[i].spanIdx !== segs[i + 1].spanIdx) {
        out.push(segs[i]); outC.push(jointCorner[i]); outE.push(jointExt[i]);
        continue;
      }
      const a = segs[i], b = segs[i + 1];
      const lenA = Math.hypot(a.P3[0] - a.P0[0], a.P3[1] - a.P0[1]);
      const lenB = Math.hypot(b.P3[0] - b.P0[0], b.P3[1] - b.P0[1]);
      const mid = concatPts(a, b);

      /* 1. Peleburan Kolinier Ketat:
            Jangan pernah mengubah segmen kurva lengkung (seperti sisi busur huruf e) menjadi garis lurus L!
            Hanya gabungkan menjadi garis lurus jika kedua segmen sudah garis lurus (a.isLine && b.isLine)
            atau salah satunya adalah stub mikro (< 2.2 px) yang benar-benar kolinier (colDev <= 0.14 px). */
      const colDev = maxCollinearDev(mid, a.P0, b.P3);
      const canMergeToLine = (a.isLine && b.isLine && !jointCorner[i] && colDev <= lineMergeTol) ||
        (!jointCorner[i] && (a.isLine || b.isLine) && Math.min(lenA, lenB) < 2.2 && colDev <= 0.14);
      if (canMergeToLine) {
        out.push(makeLineSeg(a.P0, b.P3, a.startSharp, b.endSharp, a.spanIdx, mid));
        outC.push(jointCorner[i + 1]);
        outE.push(jointExt[i + 1]);
        i++; improved = true;
        continue;
      }

      if (jointCorner[i]) {
        out.push(a); outC.push(jointCorner[i]); outE.push(jointExt[i]);
        continue;
      }

      /* 2. Absorpsi Segmen Mikro (< 3.2px) ke kurva sebelahnya */
      if (a.isLine !== b.isLine) {
        if (Math.min(lenA, lenB) < Math.max(3.2, tol * 7)) {
          const fStub = fitCubicLS(mid, a.isLine ? null : (a.lockL ? a.tL : null), b.isLine ? null : (b.lockR ? b.tR : null), false);
          if (fStub && fStub.err <= tol * 1.15) {
            fStub.startSharp = a.startSharp;
            fStub.endSharp = b.endSharp;
            fStub.spanIdx = a.spanIdx;
            out.push(fStub); outC.push(jointCorner[i + 1]); outE.push(jointExt[i + 1]);
            i++; improved = true;
            continue;
          }
        }
        out.push(a); outC.push(jointCorner[i]); outE.push(jointExt[i]);
        continue;
      }

      /* 3. Peleburan Kurva Bézier Kubik MDL:
            Lindungi simpul bahu fillet (jointExt[i] dengan garis singgung terkunci) dan puncak ekstremum kardinal! */
      const turnAB = Math.acos(clamp(-(a.tL[0] * b.tR[0] + a.tL[1] * b.tR[1]), -1, 1));
      const isFilletShoulder = jointExt[i] && (a.lockR || b.lockL) && turnAB >= 0.65;
      const allowAcrossExt = !isFilletShoulder && (!jointExt[i] || (turnAB < 1.15 && Math.min(lenA, lenB) < 7.5));
      if (turnAB < 1.95 && allowAcrossExt) {
        const isLongShallowMerge = !jointExt[i] && Math.min(lenA, lenB) >= 35 && turnAB < 0.25;
        const useTanL = (!a.startSharp && a.lockL && !isLongShallowMerge) ? a.tL : null;
        const useTanR = (!b.endSharp && b.lockR && !isLongShallowMerge) ? b.tR : null;
        const f = fitCubicLS(mid, useTanL, useTanR, false);
        const maxAllow = jointExt[i] ? tol * 0.78 : Math.max(tol * 1.45, 0.34);
        const oldCost = (a.sse || 0) + (b.sse || 0) + 2 * mdlPenalty;
        const newCost = (f ? (f.sse || 0) : Infinity) + mdlPenalty;
        if (f && f.err <= maxAllow && (newCost <= oldCost * 1.35 || (!jointExt[i] && f.err <= maxAllow))) {
          f.startSharp = a.startSharp;
          f.endSharp = b.endSharp;
          f.spanIdx = a.spanIdx;
          f.lockL = a.lockL;
          f.lockR = b.lockR;
          out.push(f); outC.push(jointCorner[i + 1]); outE.push(jointExt[i + 1]);
          i++; improved = true;
          continue;
        }
      }
      out.push(a); outC.push(jointCorner[i]); outE.push(jointExt[i]);
    }
    segs = out;
    jointCorner = outC;
    jointExt = outE;
  }

  /* Pemeriksaan penutup siklik (antara segmen terakhir & segmen pertama) */
  if (segs.length > 3) {
    const lastIdx = segs.length - 1;
    const a = segs[lastIdx], b = segs[0];
    if (a.spanIdx === b.spanIdx) {
      const lenA = Math.hypot(a.P3[0] - a.P0[0], a.P3[1] - a.P0[1]);
      const lenB = Math.hypot(b.P3[0] - b.P0[0], b.P3[1] - b.P0[1]);
      const mid = concatPts(a, b);
      const colDev = maxCollinearDev(mid, a.P0, b.P3);
      const canMergeCyclicLine = (a.isLine && b.isLine && (!jointCorner[lastIdx] || Math.min(lenA, lenB) < 2.5) && colDev <= lineMergeTol) ||
        (!jointCorner[lastIdx] && (a.isLine || b.isLine) && Math.min(lenA, lenB) < 2.2 && colDev <= 0.14);
      if (canMergeCyclicLine) {
        segs[0] = makeLineSeg(a.P0, b.P3, a.startSharp, b.endSharp, a.spanIdx, mid);
        segs.pop();
        jointCorner.pop();
        jointExt.pop();
      } else if (!jointCorner[lastIdx] && !a.isLine && !b.isLine && segs.length > 4) {
        const turnAB = Math.acos(clamp(-(a.tL[0] * b.tR[0] + a.tL[1] * b.tR[1]), -1, 1));
        const allowAcrossExt = !jointExt[lastIdx] || (turnAB < 1.55 && Math.min(lenA, lenB) < 10.0);
        if (turnAB < 1.95 && allowAcrossExt) {
          const useTanL = (!a.startSharp && a.lockL) ? a.tL : null;
          const useTanR = (!b.endSharp && b.lockR) ? b.tR : null;
          const f = fitCubicLS(mid, useTanL, useTanR, false);
          if (f && f.err <= (jointExt[lastIdx] ? tol * 0.72 : Math.max(tol * 1.18, 0.25))) {
            f.startSharp = a.startSharp;
            f.endSharp = b.endSharp;
            f.spanIdx = a.spanIdx;
            f.lockL = a.lockL;
            f.lockR = b.lockR;
            segs[0] = f;
            segs.pop();
            jointCorner.pop();
            jointExt.pop();
          }
        }
      }
    }
  }

  /* G1 tangents Harmonization at smooth curve joints */
  harmonizeG1Joints(segs, jointCorner);
  for (let i = 0; i < segs.length; i++) {
    segs[i].endSharp = !!jointCorner[i];
    segs[i].startSharp = !!jointCorner[(i - 1 + segs.length) % segs.length];
  }
  return segs;
}

/* =====================================================================
   Shared Planar Topology Synchronizer (Masalah 6 & Masalah 1 Gap Fix)
   Menyamakan secara eksak (bit-for-bit) segmen kurva Bézier kubik pada
   setiap perbatasan bersama antar-region (baik loop tertutup bebas-junction
   maupun rantai half-edge di antara T/X-junctions).
   ===================================================================== */
function reverseBezierSegs(segs) {
  return segs.slice().reverse().map(sg => ({
    P0: [sg.P3[0], sg.P3[1]],
    P1: [sg.P2[0], sg.P2[1]],
    P2: [sg.P1[0], sg.P1[1]],
    P3: [sg.P0[0], sg.P0[1]],
    isLine: !!sg.isLine,
    isTrueCircleArc: !!sg.isTrueCircleArc,
    tL: sg.tR ? [sg.tR[0], sg.tR[1]] : null,
    tR: sg.tL ? [sg.tL[0], sg.tL[1]] : null,
    startSharp: !!sg.endSharp,
    endSharp: !!sg.startSharp,
    spanIdx: sg.spanIdx
  }));
}

function compareKeyArrays(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function synchronizeSharedTopology(smoothedList, rawLoops) {
  if (!smoothedList || !rawLoops || smoothedList.length !== rawLoops.length) return smoothedList;
  const cycleMap = new Map();
  const chainMap = new Map();

  /* Prioritaskan kontur Lingkaran Sejati (isTrueCircle) sebagai Master di atas kontur poligon/latar raksasa
     agar busur lingkaran analitik tidak ditimpa oleh segmen kasar dari latar belakang! */
  const order = smoothedList.map((_, i) => i).sort((a, b) => {
    const cA = smoothedList[a] && smoothedList[a].isTrueCircle ? 1 : 0;
    const cB = smoothedList[b] && smoothedList[b].isTrueCircle ? 1 : 0;
    if (cA !== cB) return cB - cA;
    /* Jika keduanya adalah lingkaran sejati yang bersinggungan, prioritaskan lingkaran yang lebih kecil (kurvatur lebih tinggi) */
    if (cA === 1 && cB === 1) {
      return Math.abs(smoothedList[a].area || 0) - Math.abs(smoothedList[b].area || 0);
    }
    const d = Math.abs(smoothedList[b].area || 0) - Math.abs(smoothedList[a].area || 0);
    return Math.abs(d) > 1e-2 ? d : (smoothedList[b].area || 0) - (smoothedList[a].area || 0);
  });

  for (const idx of order) {
    const s = smoothedList[idx];
    const raw = rawLoops[idx];
    if (!s || !s.segs || !s.segs.length || !raw || !raw.vkeys || raw.vkeys.length < 3) continue;
    const vkeys = raw.vkeys;
    const juncFlags = raw.juncFlags;
    const n = vkeys.length;

    const juncIndices = [];
    if (juncFlags) {
      for (let i = 0; i < n; i++) if (juncFlags[i]) juncIndices.push(i);
    }

    if (juncIndices.length === 0) {
      const fwd = vkeys;
      const rev = [vkeys[0], ...vkeys.slice(1).reverse()];
      const isFwd = compareKeyArrays(fwd, rev) <= 0;
      const cKey = (isFwd ? fwd : rev).join(',');
      const master = cycleMap.get(cKey);
      if (!master) {
        cycleMap.set(cKey, { segs: s.segs, pts: s.pts || s.scaledPts, isFwd });
      } else {
        const syncedSegs = master.isFwd === isFwd ? master.segs.map(sg => ({ ...sg })) : reverseBezierSegs(master.segs);
        s.segs = syncedSegs;
        if (master.pts) {
          const syncedPts = master.isFwd === isFwd ? master.pts.slice() : [master.pts[0], ...master.pts.slice(1).reverse()];
          if (s.pts) s.pts = syncedPts;
          if (s.scaledPts) s.scaledPts = syncedPts;
        }
        s.d = segsToD(s.segs, true);
      }
    } else {
      const m = juncIndices.length;
      const bySpan = Array.from({ length: m }, () => []);
      for (const sg of s.segs) {
        const sp = clamp(sg.spanIdx || 0, 0, m - 1);
        bySpan[sp].push(sg);
      }
      let anyReplaced = false;
      const newSegs = [];
      for (let r = 0; r < m; r++) {
        const spanSegs = bySpan[r];
        if (!spanSegs.length) continue;
        const ja = juncIndices[r];
        const jb = juncIndices[(r + 1) % m];
        const K = [];
        for (let i = ja; ; i = (i + 1) % n) {
          K.push(vkeys[i]);
          if (i === jb && K.length > 1) break;
          if (K.length > n + 2) break;
        }
        const Krev = K.slice().reverse();
        const isFwd = compareKeyArrays(K, Krev) <= 0;
        const chainKey = (isFwd ? K : Krev).join(',');
        const isPureAnalyticLine = spanSegs.length === 1 && !!spanSegs[0].isLine;
        const isPureCircleArc = spanSegs.every(sg => sg.isTrueCircleArc);
        const compactBonus = (n <= 600 && Math.abs(s.area || 0) >= 16) ? 1.5 : 0;
        const spanPriority = (s.isTrueCircle ? 6 : 0) + (isPureCircleArc ? 4.5 : 0) + (isPureAnalyticLine ? 3.5 : 0) + compactBonus + (juncFlags[ja] === 2 ? 1 : 0) + (juncFlags[jb] === 2 ? 1 : 0) - spanSegs.length * 0.05;
        const master = chainMap.get(chainKey);
        if (!master) {
          chainMap.set(chainKey, { segs: spanSegs, isFwd, priority: spanPriority, ownerIdx: idx, spanSlot: r });
          newSegs.push(...spanSegs);
        } else if (spanPriority > master.priority + 1e-4) {
          /* Jika kontur saat ini merupakan Host Curve mulus (juncFlags === 2) sedangkan master sebelumnya adalah Stem Corner,
             jadikan segmen kurva mulus ini sebagai master baru dan perbarui pemilik sebelumnya! */
          const prevOwner = smoothedList[master.ownerIdx];
          if (prevOwner && prevOwner.segs) {
            const replForPrev = master.isFwd === isFwd
              ? spanSegs.map(sg => ({ ...sg, spanIdx: master.spanSlot }))
              : reverseBezierSegs(spanSegs).map(sg => ({ ...sg, spanIdx: master.spanSlot }));
            const rebuiltPrev = [];
            let inserted = false;
            for (const psg of prevOwner.segs) {
              if ((psg.spanIdx || 0) === master.spanSlot) {
                if (!inserted) {
                  replForPrev[0].P0 = [psg.P0[0], psg.P0[1]];
                  rebuiltPrev.push(...replForPrev);
                  inserted = true;
                }
                rebuiltPrev[rebuiltPrev.length - 1].P3 = [psg.P3[0], psg.P3[1]];
              } else {
                rebuiltPrev.push(psg);
              }
            }
            if (inserted) {
              prevOwner.segs = rebuiltPrev;
              prevOwner.d = segsToD(prevOwner.segs, true);
            }
          }
          chainMap.set(chainKey, { segs: spanSegs, isFwd, priority: spanPriority, ownerIdx: idx, spanSlot: r });
          newSegs.push(...spanSegs);
        } else {
          const repl = master.isFwd === isFwd ? master.segs.map(sg => ({ ...sg, spanIdx: r })) : reverseBezierSegs(master.segs).map(sg => ({ ...sg, spanIdx: r }));
          repl[0].P0 = [spanSegs[0].P0[0], spanSegs[0].P0[1]];
          repl[repl.length - 1].P3 = [spanSegs[spanSegs.length - 1].P3[0], spanSegs[spanSegs.length - 1].P3[1]];
          newSegs.push(...repl);
          anyReplaced = true;
        }
      }
      if (anyReplaced && newSegs.length) {
        s.segs = newSegs;
        s.d = segsToD(s.segs, true);
      }
    }
  }
  return smoothedList;
}

/* =====================================================================
   Perakitan SVG & Ekspor Multi-Format (SVG, DXF, AI, EPS, PDF, PNG)
   ===================================================================== */
function r2(v) { return Math.round(v * 100) / 100; }
function segsToD(segs, closed) {
  if (!segs.length) return '';
  let d = `M${r2(segs[0].P0[0])} ${r2(segs[0].P0[1])}`;
  for (const s of segs) {
    /* Jika segmen adalah garis lurus kolinier, tulis L agar SVG lebih bersih & tajam */
    if (s.isLine) {
      d += `L${r2(s.P3[0])} ${r2(s.P3[1])}`;
    } else {
      d += `C${r2(s.P1[0])} ${r2(s.P1[1])} ${r2(s.P2[0])} ${r2(s.P2[1])} ${r2(s.P3[0])} ${r2(s.P3[1])}`;
    }
  }
  return closed ? d + 'Z' : d;
}

function pip(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function signedPolyArea(pts) {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a * 0.5;
}

