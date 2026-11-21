/* =====================================================================
 * JS Module 08: VMT Engine Part 4 — Barycentric Anti-Aliasing Deconvolution, QuadTree & MRF Potts Segmentation
 * ===================================================================== */
/* =====================================================================
   TAHAP 3 — QuadTree & Multi-Scale Geodesic Edge Snapping (Anti-Halo Fix)
   Menyapu bersih piksel transisi anti-aliasing (lebar 1-3 px) di perbatasan
   agar mengunci ke warna jangkar (anchor) lokal tanpa membentuk cincin halo
   atau poligon serpihan (sliver) warna ketiga.
   ===================================================================== */
/* Evaluasi presisi apakah warna (r,g,b) berada pada kurva pencampuran anti-aliasing
   (baik sRGB linier maupun gamma-2.0 linear-light) di antara dua warna CA dan CB */
function evalColorBlendPair(r, g, b, CA, CB) {
  if (!CA || !CB) return null;
  const dr = CA.r - CB.r, dg = CA.g - CB.g, db = CA.b - CB.b;
  const len2 = dr * dr + dg * dg + db * db;
  if (len2 < 120) return null;

  const t = ((r - CB.r) * dr + (g - CB.g) * dg + (b - CB.b) * db) / len2;
  if (t <= 0.02 || t >= 0.98) return null;

  const abD2 = cdist2(CA.r, CA.g, CA.b, CB.r, CB.g, CB.b);
  if (abD2 < 320) return null;

  const maxAllowedPerp = Math.min(5400, 680 + abD2 * 0.022);
  const pr = CB.r + t * dr, pg = CB.g + t * dg, pb = CB.b + t * db;
  let perpD2 = cdist2(r, g, b, pr, pg, pb);
  if (perpD2 > maxAllowedPerp * 5.5) return null;

  /* Evaluasi kurva campuran linear-light (gamma 2.0 & sRGB gamma 2.2) untuk anti-aliasing sub-piksel */
  const tc = clamp(t, 0.02, 0.98), invTc = 1 - tc;
  const gr = Math.sqrt(tc * CA.r * CA.r + invTc * CB.r * CB.r);
  const gg = Math.sqrt(tc * CA.g * CA.g + invTc * CB.g * CB.g);
  const gb = Math.sqrt(tc * CA.b * CA.b + invTc * CB.b * CB.b);
  const perpGammaD2 = cdist2(r, g, b, gr, gg, gb);
  if (perpGammaD2 < perpD2) perpD2 = perpGammaD2;

  if (perpD2 > maxAllowedPerp * 0.85) {
    const ar = CA.r | 0, ag = CA.g | 0, ab = CA.b | 0;
    const br = CB.r | 0, bg = CB.g | 0, bb = CB.b | 0;
    const pAr = (CA.r === ar && (ar & ~255) === 0) ? _GAMMA22_LUT[ar] : Math.pow(CA.r, 2.2);
    const pAg = (CA.g === ag && (ag & ~255) === 0) ? _GAMMA22_LUT[ag] : Math.pow(CA.g, 2.2);
    const pAb = (CA.b === ab && (ab & ~255) === 0) ? _GAMMA22_LUT[ab] : Math.pow(CA.b, 2.2);
    const pBr = (CB.r === br && (br & ~255) === 0) ? _GAMMA22_LUT[br] : Math.pow(CB.r, 2.2);
    const pBg = (CB.g === bg && (bg & ~255) === 0) ? _GAMMA22_LUT[bg] : Math.pow(CB.g, 2.2);
    const pBb = (CB.b === bb && (bb & ~255) === 0) ? _GAMMA22_LUT[bb] : Math.pow(CB.b, 2.2);
    const inv22 = 1 / 2.2;
    const gr22 = Math.pow(tc * pAr + invTc * pBr, inv22);
    const gg22 = Math.pow(tc * pAg + invTc * pBg, inv22);
    const gb22 = Math.pow(tc * pAb + invTc * pBb, inv22);
    const perpGamma22D2 = cdist2(r, g, b, gr22, gg22, gb22);
    if (perpGamma22D2 < perpD2) perpD2 = perpGamma22D2;
  }

  if (perpD2 > maxAllowedPerp) return null;

  const dA = cdist2(r, g, b, CA.r, CA.g, CA.b);
  const dB = cdist2(r, g, b, CB.r, CB.g, CB.b);
  return {
    t,
    perpD2,
    abD2,
    dA,
    dB,
    target: t >= 0.5 ? 0 : 1,
    closest: dA <= dB ? 0 : 1
  };
}

/* Membangun Konteks Segmentasi Terpadu (Dual-Space CIE-Lab + Redmean, 2D Structure Tensor,
   Shi-Tomasi Cornerness, dan Normal-Ray Unmixing untuk akurasi penuh pada QuadTree & MRF) */
/* Unmixing Barisentrik 3-Arah (Tri-Junction / Y-Junction Convex Hull Unmixing):
   Mendeteksi piksel/klaster transisi pada pertemuan 3 warna (CA, CB, CC) seperti Kuning+Krem+Hitam
   agar tidak terlempar ke warna palet ke-4 (mis. Hijau) akibat campuran anti-aliasing + subsampling JPEG. */
function evalColorBlendTriplet(r, g, b, CA, CB, CC) {
  if (!CA || !CB || !CC) return null;
  const ux = CA.r - CC.r, uy = CA.g - CC.g, uz = CA.b - CC.b;
  const vx = CB.r - CC.r, vy = CB.g - CC.g, vz = CB.b - CC.b;
  const wx = r - CC.r, wy = g - CC.g, wz = b - CC.b;
  const uu = ux * ux + uy * uy + uz * uz;
  const vv = vx * vx + vy * vy + vz * vz;
  const uv = ux * vx + uy * vy + uz * vz;
  const det = uu * vv - uv * uv;
  if (det < 1e4) return null;
  const uw = ux * wx + uy * wy + uz * wz;
  const vw = vx * wx + vy * wy + vz * wz;
  let wA = (vv * uw - uv * vw) / det;
  let wB = (uu * vw - uv * uw) / det;
  let wC = 1.0 - wA - wB;
  if (wA < -0.08 || wB < -0.08 || wC < -0.08) return null;
  wA = Math.max(0, wA); wB = Math.max(0, wB); wC = Math.max(0, wC);
  const wSum = wA + wB + wC || 1;
  wA /= wSum; wB /= wSum; wC /= wSum;
  const activeCnt = (wA > 0.04 ? 1 : 0) + (wB > 0.04 ? 1 : 0) + (wC > 0.04 ? 1 : 0);
  if (activeCnt < 2) return null;
  const pr = wA * CA.r + wB * CB.r + wC * CC.r - r;
  const pg = wA * CA.g + wB * CB.g + wC * CC.g - g;
  const pb = wA * CA.b + wB * CB.b + wC * CC.b - b;
  const perpD2 = pr * pr + pg * pg + pb * pb;
  const dAB = cdist2(CA.r, CA.g, CA.b, CB.r, CB.g, CB.b);
  const maxSpan = Math.max(uu, vv, dAB);
  if (perpD2 > Math.max(480, maxSpan * 0.052)) return null;
  const domSlot = (wA >= wB && wA >= wC) ? 0 : (wB >= wC ? 1 : 2);
  return { wA, wB, wC, domSlot, perpD2, maxSpan };
}

function buildSegmentationContext(work, rawWork, mask, palette, edgeField, forceCpu = false) {
  const { w, h } = work;
  const n = w * h;
  const fltD = work.data.data;
  const rawD = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === n * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data && rawWork.data.data ? rawWork.data.data : fltD);

  const ef = edgeField || buildEdgeField(work, mask);
  const gx = ef.gx, gy = ef.gy, mag = ef.mag;

  const K = palette.length;
  const palLab = palette.map((c, i) => {
    const [L, a, labB] = rgb2lab(c.r, c.g, c.b);
    return { r: c.r, g: c.g, b: c.b, L, a, b2: labB, i };
  });
  const tree = buildKdTree(palLab.map(c => ({ L: c.L, a: c.a, b: c.b2, i: c.i })));

  const palDist2 = new Float32Array(K * K);
  const palIsMidBlend = new Uint8Array(K * K * K);
  for (let a = 0; a < K; a++) {
    for (let b = 0; b < K; b++) {
      const dRgb = cdist2(palLab[a].r, palLab[a].g, palLab[a].b, palLab[b].r, palLab[b].g, palLab[b].b);
      const dLab = (palLab[a].L - palLab[b].L) ** 2 + (palLab[a].a - palLab[b].a) ** 2 + (palLab[a].b2 - palLab[b].b2) ** 2;
      palDist2[a * K + b] = 0.55 * dRgb + 0.45 * (dLab * 18);
    }
  }
  const hasSmoothGrad = !!(palette._hasSmoothGradient || palette._isSingleFamilyMultiShade);
  for (let cur = 0; cur < K; cur++) {
    const Ccur = palLab[cur];
    const isVerified = !!(palette[cur] && (palette[cur].verifiedPlateau || palette[cur].isGradCluster));
    for (let a = 0; a < K; a++) {
      if (a === cur) continue;
      for (let b = a + 1; b < K; b++) {
        if (b === cur) continue;
        const bl = evalColorBlendPair(Ccur.r, Ccur.g, Ccur.b, palLab[a], palLab[b]);
        const minAbD2 = (hasSmoothGrad || isVerified) ? 3600 : 225;
        const maxPerp = isVerified ? Math.min(360, 120 + (bl ? bl.abD2 * 0.0025 : 0)) : Math.min(1400, 420 + (bl ? bl.abD2 * 0.008 : 0));
        if (bl && bl.abD2 >= minAbD2 && bl.perpD2 <= maxPerp) {
          palIsMidBlend[cur * K * K + a * K + b] = 1;
          palIsMidBlend[cur * K * K + b * K + a] = 1;
        }
      }
    }
  }

  /* TAHAP 2 GPU ACCELERATION: Jalankan Structure Tensor 2D 3x3, Deteksi Thin-Stroke 1D,
     Nearest-Palette Lookup CIE-Lab, dan Normal-Ray Flank Unmixing langsung di VRAM GPU */
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuBuildSegmentationTables && K <= 64) {
    const gpuTabs = GpuAccelerator.gpuBuildSegmentationTables(work, rawD, fltD, mask, palLab, ef);
    if (gpuTabs) {
      const { nxArr, nyArr, cohArr, cornerArr, flankA, flankB, flankAlpha, flankPerp, thinStrokeLab, rawNearestFlt, rawNearestRaw } = gpuTabs;
      const nearestLabAt = (dArr, p) => {
        if (thinStrokeLab[p] >= 0) return thinStrokeLab[p];
        if (dArr === fltD && rawNearestFlt) return rawNearestFlt[p];
        if (dArr === rawD && rawNearestRaw) return rawNearestRaw[p];
        const i = p * 4;
        const r = dArr[i], g = dArr[i + 1], b = dArr[i + 2];
        if (K === 2) {
          const d0 = cdist2(r, g, b, palLab[0].r, palLab[0].g, palLab[0].b);
          const d1 = cdist2(r, g, b, palLab[1].r, palLab[1].g, palLab[1].b);
          return d0 <= d1 ? 0 : 1;
        }
        const [L, a, b2] = rgb2lab(r, g, b);
        return kdNearestLab(tree, L, a, b2, { d: Infinity, i: 0 }).i;
      };
      return {
        w, h, K, fltD, rawD, gx, gy, mag,
        palLab, tree, palDist2, palIsMidBlend,
        nxArr, nyArr, cohArr, cornerArr,
        flankA, flankB, flankAlpha, flankPerp,
        thinStrokeLab,
        rawNearestFlt,
        rawNearestRaw,
        nearestLabAt,
        gpuAccelerated: true
      };
    }
  }

  /* Hitung Structure Tensor 2D 3x3 (nx, ny, koherensi tepi, dan Shi-Tomasi cornerness) */
  const nxArr = new Float32Array(n);
  const nyArr = new Float32Array(n);
  const cohArr = new Float32Array(n);
  const cornerArr = new Float32Array(n);

  for (let y = 0; y < h; y++) {
    const ym1 = Math.max(0, y - 1) * w, y0 = y * w, yp1 = Math.min(h - 1, y + 1) * w;
    for (let x = 0; x < w; x++) {
      const p = y0 + x;
      if ((mask && mask[p]) || mag[p] < 1.5) continue;
      const xm1 = Math.max(0, x - 1), xp1 = Math.min(w - 1, x + 1);
      const p00 = ym1 + xm1, p01 = ym1 + x, p02 = ym1 + xp1;
      const p10 = y0  + xm1, p11 = p,       p12 = y0  + xp1;
      const p20 = yp1 + xm1, p21 = yp1 + x, p22 = yp1 + xp1;

      const jxx = (
        gx[p00] * gx[p00] + 2 * gx[p01] * gx[p01] + gx[p02] * gx[p02] +
        2 * gx[p10] * gx[p10] + 4 * gx[p11] * gx[p11] + 2 * gx[p12] * gx[p12] +
        gx[p20] * gx[p20] + 2 * gx[p21] * gx[p21] + gx[p22] * gx[p22]
      ) * 0.0625;
      const jxy = (
        gx[p00] * gy[p00] + 2 * gx[p01] * gy[p01] + gx[p02] * gy[p02] +
        2 * gx[p10] * gy[p10] + 4 * gx[p11] * gy[p11] + 2 * gx[p12] * gy[p12] +
        gx[p20] * gy[p20] + 2 * gx[p21] * gy[p21] + gx[p22] * gy[p22]
      ) * 0.0625;
      const jyy = (
        gy[p00] * gy[p00] + 2 * gy[p01] * gy[p01] + gy[p02] * gy[p02] +
        2 * gy[p10] * gy[p10] + 4 * gy[p11] * gy[p11] + 2 * gy[p12] * gy[p12] +
        gy[p20] * gy[p20] + 2 * gy[p21] * gy[p21] + gy[p22] * gy[p22]
      ) * 0.0625;

      const tr = jxx + jyy;
      if (tr > 1e-3) {
        const df = jxx - jyy;
        const disc = Math.hypot(df, 2 * jxy);
        const l2 = Math.max(0, 0.5 * (tr - disc));
        cohArr[p] = (disc / tr) * (disc / tr);
        cornerArr[p] = Math.sqrt(l2);
        const theta = 0.5 * Math.atan2(2 * jxy, df);
        let vx = Math.cos(theta), vy = Math.sin(theta);
        if (vx * gx[p] + vy * gy[p] < 0) { vx = -vx; vy = -vy; }
        nxArr[p] = vx;
        nyArr[p] = vy;
      }
    }
  }

  /* Deteksi Sub-Pixel 1D Thin Stroke Valley/Ridge Berbasis Unmixing Vektor Warna Penuh (Bebas Salah-Warna Lintas Hue) */
  const thinStrokeLab = new Int16Array(n).fill(-1);
  for (let y = 2; y < h - 2; y++) {
    const row = y * w;
    for (let x = 2; x < w - 2; x++) {
      const p = row + x;
      if (mask && mask[p]) continue;
      const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
      const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
      for (let dIdx = 0; dIdx < 4; dIdx++) {
        const dx = DIRS[dIdx][0], dy = DIRS[dIdx][1];
        const pA2 = (y - 2 * dy) * w + (x - 2 * dx);
        const pB2 = (y + 2 * dy) * w + (x + 2 * dx);
        if (mask && (mask[pA2] || mask[pB2])) continue;
        const iA2 = pA2 * 4, iB2 = pB2 * 4;
        const dAB = cdist2(rawD[iA2], rawD[iA2 + 1], rawD[iA2 + 2], rawD[iB2], rawD[iB2 + 1], rawD[iB2 + 2]);
        if (dAB > 1800) continue; // bukan permukaan latar yang sama di kedua sisi
        const bgR = 0.5 * (rawD[iA2] + rawD[iB2]);
        const bgG = 0.5 * (rawD[iA2 + 1] + rawD[iB2 + 1]);
        const bgB = 0.5 * (rawD[iA2 + 2] + rawD[iB2 + 2]);
        const dBg0 = cdist2(r0, g0, b0, bgR, bgG, bgB);
        if (dBg0 < 1650) continue;

        const pA1 = (y - dy) * w + (x - dx), pB1 = (y + dy) * w + (x + dx);
        const dBgA1 = cdist2(rawD[pA1 * 4], rawD[pA1 * 4 + 1], rawD[pA1 * 4 + 2], bgR, bgG, bgB);
        const dBgB1 = cdist2(rawD[pB1 * 4], rawD[pB1 * 4 + 1], rawD[pB1 * 4 + 2], bgR, bgG, bgB);
        if (dBg0 < Math.max(dBgA1, dBgB1) * 0.90) continue; // harus puncak punggung/lembah kontras lokal

        // Periksa kontinuitas tangensial sepanjang arah garis (-dy, dx)
        const pT1 = (y - dx) * w + (x + dy), pT2 = (y + dx) * w + (x - dy);
        const dBgT1 = cdist2(rawD[pT1 * 4], rawD[pT1 * 4 + 1], rawD[pT1 * 4 + 2], bgR, bgG, bgB);
        const dBgT2 = cdist2(rawD[pT2 * 4], rawD[pT2 * 4 + 1], rawD[pT2 * 4 + 2], bgR, bgG, bgB);
        const dSimT1 = cdist2(r0, g0, b0, rawD[pT1 * 4], rawD[pT1 * 4 + 1], rawD[pT1 * 4 + 2]);
        const dSimT2 = cdist2(r0, g0, b0, rawD[pT2 * 4], rawD[pT2 * 4 + 1], rawD[pT2 * 4 + 2]);
        if (Math.max(dBgT1, dBgT2) < dBg0 * 0.42 || Math.min(dSimT1, dSimT2) > dBg0 * 0.45) continue;

        // Cari warna latar terdekat bgK
        let bgK = 0, bestBgD = Infinity;
        for (let k = 0; k < K; k++) {
          const dB = cdist2(bgR, bgG, bgB, palLab[k].r, palLab[k].g, palLab[k].b);
          if (dB < bestBgD) { bestBgD = dB; bgK = k; }
        }

        // Pilih label palet k != bgK yang paling akurat menjelaskan vektor warna ter-unmix (r0, g0, b0) dari latar (bgR, bgG, bgB)
        let bestK = -1, bestCost = Infinity;
        for (let k = 0; k < K; k++) {
          if (k === bgK) continue;
          const pk = palLab[k];
          const dPalBg = cdist2(pk.r, pk.g, pk.b, bgR, bgG, bgB);
          if (dPalBg < 1800) continue;
          const vr = pk.r - bgR, vg = pk.g - bgG, vb = pk.b - bgB;
          const vLen2 = vr * vr + vg * vg + vb * vb;
          if (vLen2 < 200) continue;
          const alpha = clamp(((r0 - bgR) * vr + (g0 - bgG) * vg + (b0 - bgB) * vb) / vLen2, 0, 1.15);
          if (alpha < 0.36) continue;
          const ac = Math.min(1, alpha);
          const pr = bgR + ac * vr, pg = bgG + ac * vg, pb = bgB + ac * vb;
          const perpD2 = cdist2(r0, g0, b0, pr, pg, pb);
          const directD2 = cdist2(r0, g0, b0, pk.r, pk.g, pk.b);
          const cost = perpD2 + directD2 * 0.28;
          if (cost < bestCost && perpD2 <= dBg0 * 0.28 + 480) {
            bestCost = cost;
            bestK = k;
          }
        }
        if (bestK >= 0) { thinStrokeLab[p] = bestK; break; }
      }
    }
  }

  const nearestLabAt = (dArr, p) => {
    if (thinStrokeLab[p] >= 0) return thinStrokeLab[p];
    const i = p * 4;
    const r = dArr[i], g = dArr[i + 1], b = dArr[i + 2];
    if (K === 2) {
      // Gunakan titik tengah linier sRGB (50% coverage) agar garis tipis anti-aliased tidak terhapus oleh bias kubik CIE L*
      const d0 = cdist2(r, g, b, palLab[0].r, palLab[0].g, palLab[0].b);
      const d1 = cdist2(r, g, b, palLab[1].r, palLab[1].g, palLab[1].b);
      return d0 <= d1 ? 0 : 1;
    }
    const [L, a, b2] = rgb2lab(r, g, b);
    const chP = Math.hypot(a, b2);
    if (chP >= 10.0 && K <= 24) {
      let bestI = 0, bestCost = Infinity;
      for (let k = 0; k < K; k++) {
        const pk = palLab[k];
        const dL = L - pk.L, da = a - pk.a, db = b2 - pk.b2;
        let cost = dL * dL + da * da + db * db;
        const chK = Math.hypot(pk.a, pk.b2);
        if (chK >= 12.0) {
          const cosH = (a * pk.a + b2 * pk.b2) / (chP * chK);
          if (cosH < 0.88) {
            cost += (0.88 - cosH) * chP * chK * 4.2;
          }
        }
        if (cost < bestCost) { bestCost = cost; bestI = k; }
      }
      return bestI;
    }
    return kdNearestLab(tree, L, a, b2, { d: Infinity, i: 0 }).i;
  };

  /* Ray-casting sepanjang normal gradien +-n_p pada piksel tepi untuk menemukan pasangan jangkar interior (flankA, flankB) */
  const flankA = new Int16Array(n).fill(-1);
  const flankB = new Int16Array(n).fill(-1);
  const flankAlpha = new Float32Array(n).fill(0.5);
  const flankPerp = new Float32Array(n);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const mp0 = mag[p];
      if ((mask && mask[p]) || mp0 < 4.5) continue;
      const nx = nxArr[p], ny = nyArr[p];
      if (nx === 0 && ny === 0) continue;

      let bestPosP = -1, bestPosMag = Infinity;
      let bestNegP = -1, bestNegMag = Infinity;
      let bestRidgeP = -1, bestRidgeLab = -1;
      for (let s = 1; s <= 4; s++) {
        const px = clamp(Math.round(x + nx * s), 0, w - 1);
        const py = clamp(Math.round(y + ny * s), 0, h - 1);
        const pp = py * w + px;
        if (!(mask && mask[pp])) {
          const mScore = mag[pp] + s * 1.1;
          if (mScore < bestPosMag) { bestPosMag = mScore; bestPosP = pp; }
          if (bestRidgeP < 0 && thinStrokeLab[pp] >= 0) { bestRidgeP = pp; bestRidgeLab = thinStrokeLab[pp]; }
        }
        const mx = clamp(Math.round(x - nx * s), 0, w - 1);
        const my = clamp(Math.round(y - ny * s), 0, h - 1);
        const mp = my * w + mx;
        if (!(mask && mask[mp])) {
          const mScore = mag[mp] + s * 1.1;
          if (mScore < bestNegMag) { bestNegMag = mScore; bestNegP = mp; }
          if (bestRidgeP < 0 && thinStrokeLab[mp] >= 0) { bestRidgeP = mp; bestRidgeLab = thinStrokeLab[mp]; }
        }
      }
      if (bestPosP < 0 || bestNegP < 0 || bestPosP === bestNegP) continue;

      let LA = nearestLabAt(fltD, bestPosP);
      let LB = nearestLabAt(fltD, bestNegP);
      if (LA === LB && bestRidgeLab >= 0 && bestRidgeLab !== LA) {
        LB = bestRidgeLab;
        bestNegP = bestRidgeP;
      } else if (mag[bestPosP] > mp0 * 0.65 || mag[bestNegP] > mp0 * 0.65) {
        continue;
      }
      if (LA === LB || LA < 0 || LB < 0) continue;

      const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
      let blPal = evalColorBlendPair(r0, g0, b0, palLab[LA], palLab[LB]);
      if (!blPal) {
        /* Fallback ke rata-rata rawD & fltD bila terdapat derau kompresi JPEG pada piksel tepi */
        blPal = evalColorBlendPair((r0 + fltD[i0]) * 0.5, (g0 + fltD[i0 + 1]) * 0.5, (b0 + fltD[i0 + 2]) * 0.5, palLab[LA], palLab[LB]);
      }
      if (!blPal) continue;

      const iPos = bestPosP * 4, iNeg = bestNegP * 4;
      const CposLocal = { r: fltD[iPos], g: fltD[iPos + 1], b: fltD[iPos + 2] };
      const CnegLocal = { r: fltD[iNeg], g: fltD[iNeg + 1], b: fltD[iNeg + 2] };
      const blLoc = evalColorBlendPair(r0, g0, b0, CposLocal, CnegLocal);

      const alpha = blLoc ? (0.60 * blLoc.t + 0.40 * blPal.t) : blPal.t;
      flankA[p] = LA;
      flankB[p] = LB;
      flankAlpha[p] = clamp(alpha, 0, 1);
      flankPerp[p] = blLoc ? Math.min(blPal.perpD2, blLoc.perpD2) : blPal.perpD2;
    }
  }

  return {
    w, h, K, fltD, rawD, gx, gy, mag,
    palLab, tree, palDist2, palIsMidBlend,
    nxArr, nyArr, cohArr, cornerArr,
    flankA, flankB, flankAlpha, flankPerp,
    thinStrokeLab,
    nearestLabAt
  };
}

function localNeighborhoodEdgeSnap(work, mask, labels, palette, edgeField = null, passes = 4, segCtx = null, forceCpu = false) {
  if (!palette || palette.length < 2) return labels;
  const ctx = segCtx || labels._segCtx || work._segCtx || buildSegmentationContext(work, work, mask, palette, edgeField, forceCpu);
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuLocalNeighborhoodEdgeSnap && palette.length <= 64) {
    if (GpuAccelerator.gpuLocalNeighborhoodEdgeSnap(work, mask, labels, palette, passes, ctx)) {
      return labels;
    }
  }
  const { w, h, K, rawD, mag, palLab, palIsMidBlend, flankA, flankB, flankAlpha } = ctx;

  const isAnchor = new Uint8Array(w * h);
  const R = 3;

  for (let pass = 0; pass < passes; pass++) {
    isAnchor.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (mask && mask[p]) continue;
        const L0 = labels[p];
        if (L0 < 0) continue;
        if (mag && mag[p] > 14 && pass === 0) continue;
        let same = 0;
        if (labels[p - 1] === L0) same++;
        if (labels[p + 1] === L0) same++;
        if (labels[p - w] === L0) same++;
        if (labels[p + w] === L0) same++;
        if (same >= 3) {
          const i0 = p * 4;
          const C0 = palLab[L0];
          if (cdist2(rawD[i0], rawD[i0 + 1], rawD[i0 + 2], C0.r, C0.g, C0.b) < 1450) {
            isAnchor[p] = 1;
          }
        }
      }
    }

    const nextLabels = new Int16Array(labels);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if ((mask && mask[p]) || isAnchor[p]) continue;
        const curL = labels[p];
        if (curL < 0) continue;

        const lL = labels[p - 1], lR = labels[p + 1], lU = labels[p - w], lD = labels[p + w];
        if (lL === curL && lR === curL && lU === curL && lD === curL) continue;

        const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
        const Ccur = palLab[curL];
        const dCur = cdist2(r0, g0, b0, Ccur.r, Ccur.g, Ccur.b);

        /* 1. Periksa pasangan jangkar normal gradien (flankA, flankB) terlebih dahulu */
        const fA = flankA[p], fB = flankB[p];
        if (fA >= 0 && fB >= 0 && fA !== curL && fB !== curL) {
          if (palIsMidBlend[curL * K * K + fA * K + fB]) {
            const bl = evalColorBlendPair(r0, g0, b0, palLab[fA], palLab[fB]);
            if (bl && dCur > bl.perpD2 * 0.45) {
              nextLabels[p] = flankAlpha[p] >= 0.5 ? fA : fB;
              continue;
            }
          }
        }

        /* 2. Evaluasi statistik jangkar lokal pada jendela 7x7 */
        const counts = new Map();
        const anchorCounts = new Map();
        for (let dy = -R; dy <= R; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          const row = ny * w;
          for (let dx = -R; dx <= R; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const np = row + nx;
            const nl = labels[np];
            if (nl < 0) continue;
            counts.set(nl, (counts.get(nl) || 0) + 1);
            if (isAnchor[np]) anchorCounts.set(nl, (anchorCounts.get(nl) || 0) + 4);
          }
        }
        if (counts.size < 2) continue;

        const localRanked = [...counts.keys()].sort((a, b) => {
          const sa = (anchorCounts.get(a) || 0) + (counts.get(a) || 0);
          const sb = (anchorCounts.get(b) || 0) + (counts.get(b) || 0);
          return sb - sa;
        });

        const curAnchor = anchorCounts.get(curL) || 0;
        const curTotal = counts.get(curL) || 0;

        let snapped = -1, bestPerp = Infinity;
        const maxCheck = Math.min(localRanked.length, 4);
        for (let a = 0; a < maxCheck; a++) {
          const LA = localRanked[a];
          for (let b = a + 1; b < maxCheck; b++) {
            const LB = localRanked[b];
            if ((counts.get(LA) || 0) + (counts.get(LB) || 0) < 5) continue;

            if (LA !== curL && LB !== curL) {
              const isPalMid = palIsMidBlend[curL * K * K + LA * K + LB] === 1;
              const blendPx = evalColorBlendPair(r0, g0, b0, palLab[LA], palLab[LB]);
              if (blendPx) {
                if (!(!isPalMid && dCur < blendPx.perpD2 * 2.5 + 1200)) {
                  const ancAB = (anchorCounts.get(LA) || 0) + (anchorCounts.get(LB) || 0);
                  if ((isPalMid && (curAnchor <= 8 || curTotal <= 22) && ancAB >= 8) || (curAnchor === 0 && curTotal <= 10 && ancAB >= 10 && dCur > blendPx.perpD2 * 1.65)) {
                    if (blendPx.perpD2 < bestPerp) {
                      bestPerp = blendPx.perpD2;
                      snapped = blendPx.t >= 0.5 ? LA : LB;
                    }
                  }
                }
              }
            }
            /* Periksa campuran barisentrik 3-arah (Tri-Junction) bila curAnchor === 0 (warna asing tanpa plateau lokal) */
            if (curAnchor === 0 && curTotal <= 10) {
              for (let c = b + 1; c < maxCheck; c++) {
                const LC = localRanked[c];
                if (LA === curL || LB === curL || LC === curL) continue;
                const ancABC = (anchorCounts.get(LA) || 0) + (anchorCounts.get(LB) || 0) + (anchorCounts.get(LC) || 0);
                if (ancABC < 12) continue;
                const triPx = evalColorBlendTriplet(r0, g0, b0, palLab[LA], palLab[LB], palLab[LC]);
                const triPal = evalColorBlendTriplet(Ccur.r, Ccur.g, Ccur.b, palLab[LA], palLab[LB], palLab[LC]);
                if (triPx && (triPal || dCur > triPx.perpD2 * 1.6 + 450)) {
                  if (triPx.perpD2 < bestPerp) {
                    bestPerp = triPx.perpD2;
                    snapped = triPx.domSlot === 0 ? LA : (triPx.domSlot === 1 ? LB : LC);
                  }
                }
              }
            }
          }
        }

        if (snapped >= 0 && snapped !== curL) {
          nextLabels[p] = snapped;
        }
      }
    }
    labels.set(nextLabels);
  }
  return labels;
}

function quadtreeInit(work, mask, palette, varThr, edgeField = null, outBlocks = null, rawWork = null) {
  const ctx = buildSegmentationContext(work, rawWork || work, mask, palette, edgeField);
  const { w, h, K, fltD, rawD, mag, palLab, tree, palIsMidBlend, flankA, flankB, flankAlpha } = ctx;
  const labels = new Int16Array(w * h).fill(-2);
  const rawNearest = new Int16Array(w * h).fill(-1);

  if (ctx.rawNearestFlt && ctx.rawNearestFlt.length === w * h) {
    rawNearest.set(ctx.rawNearestFlt);
    if (mask) {
      for (let p = 0; p < w * h; p++) if (mask[p]) rawNearest[p] = -1;
    }
  } else {
    for (let p = 0; p < w * h; p++) {
      if (mask && mask[p]) continue;
      rawNearest[p] = ctx.nearestLabAt(fltD, p);
    }
  }

  const nearestUnmixedAt = (p, useRaw = true) => {
    const src = useRaw ? rawD : fltD;
    const i = p * 4;
    let li = useRaw ? ctx.nearestLabAt(rawD, p) : rawNearest[p];
    if (ctx.thinStrokeLab && ctx.thinStrokeLab[p] >= 0) return ctx.thinStrokeLab[p];
    const fA = flankA[p], fB = flankB[p];
    if (fA >= 0 && fB >= 0 && li !== fA && li !== fB) {
      if (palIsMidBlend[li * K * K + fA * K + fB]) {
        return flankAlpha[p] >= 0.5 ? fA : fB;
      }
      const bl = evalColorBlendPair(rawD[i], rawD[i + 1], rawD[i + 2], palLab[fA], palLab[fB]);
      const dLi = cdist2(rawD[i], rawD[i + 1], rawD[i + 2], palLab[li].r, palLab[li].g, palLab[li].b);
      if (bl && bl.perpD2 < dLi * 0.85) {
        return flankAlpha[p] >= 0.5 ? fA : fB;
      }
    }
    return li;
  };

  const stack = [[0, 0, w, h]];
  const MINB = 2;
  const rawBlocks = [];

  while (stack.length) {
    const [x0, y0, x1, y1] = stack.pop();
    const bw = x1 - x0, bh = y1 - y0;
    if (bw <= 0 || bh <= 0) continue;

    let sr = 0, sg = 0, sb = 0, n = 0, hasMask = false, maxGrad = 0;
    for (let y = y0; y < y1; y++) {
      const row = y * w;
      for (let x = x0; x < x1; x++) {
        const p = row + x;
        if (mask && mask[p]) { hasMask = true; continue; }
        const i = p * 4;
        sr += fltD[i]; sg += fltD[i + 1]; sb += fltD[i + 2]; n++;
        if (mag && mag[p] > maxGrad) maxGrad = mag[p];
      }
    }
    if (!n) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) labels[y * w + x] = -1;
      continue;
    }
    const mr = sr / n, mg = sg / n, mb = sb / n;
    let vr = 0, maxDev = 0;
    for (let y = y0; y < y1; y++) {
      const row = y * w;
      for (let x = x0; x < x1; x++) {
        const p = row + x;
        if (mask && mask[p]) continue;
        const i = p * 4;
        const dr = fltD[i] - mr, dg = fltD[i + 1] - mg, db = fltD[i + 2] - mb;
        const dev2 = dr * dr + dg * dg + db * db;
        vr += dev2;
        if (dev2 > maxDev) maxDev = dev2;
      }
    }
    vr /= n;

    const tightVar = Math.max(18, Math.min(48, varThr * 0.16));
    const tightMaxDev = Math.max(42, Math.min(96, varThr * 0.32));
    if (!hasMask && maxGrad < 7.5 && vr < tightVar && maxDev < tightMaxDev && bw <= 32 && bh <= 32) {
      const midP = (y0 + (bh >> 1)) * w + (x0 + (bw >> 1));
      const li = rawNearest[midP] >= 0 ? rawNearest[midP] : ctx.nearestLabAt(fltD, midP);
      const c00 = rawNearest[y0 * w + x0];
      const c10 = rawNearest[y0 * w + (x1 - 1)];
      const c01 = rawNearest[(y1 - 1) * w + x0];
      const c11 = rawNearest[(y1 - 1) * w + (x1 - 1)];
      if (c00 === li && c10 === li && c01 === li && c11 === li) {
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) labels[y * w + x] = li;
        if (outBlocks) rawBlocks.push([x0, y0, bw, bh, li]);
        continue;
      }
    }

    if (bw <= MINB && bh <= MINB) {
      let leafL = -1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = y * w + x;
          const li = (mask && mask[p]) ? -1 : nearestUnmixedAt(p, true);
          labels[p] = li;
          if (leafL < 0 && li >= 0) leafL = li;
        }
      }
      if (outBlocks && leafL >= 0) rawBlocks.push([x0, y0, bw, bh, leafL]);
    } else {
      const mx = x0 + (bw >> 1), my = y0 + (bh >> 1);
      if (bw > MINB && bh > MINB) {
        stack.push([x0, y0, mx, my], [mx, y0, x1, my], [x0, my, mx, y1], [mx, my, x1, y1]);
      } else if (bw > MINB) {
        stack.push([x0, y0, mx, y1], [mx, y0, x1, y1]);
      } else {
        stack.push([x0, y0, x1, my], [x0, my, x1, y1]);
      }
    }
  }

  if (outBlocks && rawBlocks.length) {
    rawBlocks.sort((a, b) => (b[2] * b[3]) - (a[2] * a[3]));
    const maxB = Math.min(rawBlocks.length, 4800);
    for (let i = 0; i < maxB; i++) outBlocks.push(rawBlocks[i]);
  }
  for (let p = 0; p < labels.length; p++) if (labels[p] === -2) labels[p] = nearestUnmixedAt(p, true);

  localNeighborhoodEdgeSnap(work, mask, labels, palette, edgeField, 2, ctx);
  work._segCtx = ctx;
  labels._segCtx = ctx;
  labels._rawNearestSnapshot = rawNearest;
  return labels;
}

/* =====================================================================
   TAHAP 4 — Discrete MRF Segmentation & Topological Invariants
   Model Energi Potts Anisotropik & Unmixing Anti-Aliasing:
     E(L) = sum_p D_unmix(p, Lp) + sum_(p,q) w_aniso(p,q) * beta_eff(Lp, Lq) * [Lp != Lq]
   ===================================================================== */
function wouldChangeTopology(labels, w, h, x, y, from, to) {
  if (from === to) return false;
  const countComp4 = (targetLabel, centerHasTarget) => {
    let seen = 0, c = 0;
    const qx = new Int8Array(9), qy = new Int8Array(9);
    const hasAt = (i, j) => {
      if (i === 0 && j === 0) return centerHasTarget;
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false;
      return labels[yy * w + xx] === targetLabel;
    };
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const bit = 1 << ((j + 1) * 3 + (i + 1));
        if ((seen & bit) || !hasAt(i, j)) continue;
        c++;
        let head = 0, tail = 0;
        qx[tail] = i; qy[tail] = j; tail++;
        seen |= bit;
        while (head < tail) {
          const ax = qx[head], ay = qy[head]; head++;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const bx = ax + dx, by = ay + dy;
            if (bx < -1 || bx > 1 || by < -1 || by > 1) continue;
            const bbit = 1 << ((by + 1) * 3 + (bx + 1));
            if ((seen & bbit) || !hasAt(bx, by)) continue;
            seen |= bbit;
            qx[tail] = bx; qy[tail] = by; tail++;
          }
        }
      }
    }
    return c;
  };
  const beforeFrom = countComp4(from, true);
  const afterFrom = countComp4(from, false);
  if (afterFrom > beforeFrom) return true;
  const beforeTo = countComp4(to, false);
  const afterTo = countComp4(to, true);
  if (beforeTo >= 2 && afterTo < beforeTo) return true;
  return false;
}

function segmentMRF(work, mask, labels, palette, opt = {}, onTick) {
  const forceCpu = !!(opt && opt.forceCpu);
  const ctx = opt.segCtx || labels._segCtx || work._segCtx || buildSegmentationContext(work, opt.rawWork || work, mask, palette, opt.edgeField, forceCpu);
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuSegmentMRF && palette.length <= 64) {
    if (GpuAccelerator.gpuSegmentMRF(work, mask, labels, palette, opt, ctx, onTick)) {
      return labels;
    }
  }
  const { w, h, K, fltD, rawD, mag, palLab, palDist2, palIsMidBlend, nxArr, nyArr, cohArr, cornerArr, flankA, flankB, flankAlpha, flankPerp } = ctx;

  const baseBeta = opt.beta || 1350;
  const maxIter = opt.maxIter || 20;
  const singleStepMode = maxIter === 1 && typeof opt.iterIndex === 'number';
  const DX = [1, -1, 0, 0, 1, -1, 1, -1];
  const DY = [0, 0, 1, -1, 1, 1, -1, -1];
  const W_DIR = [1.0, 1.0, 1.0, 1.0, 0.707, 0.707, 0.707, 0.707];
  const wEdge = new Float32Array(8);
  const nLabelBuf = new Int16Array(8);
  const candBuf = new Int16Array(16);
  const inv2SigmaEdge = 1 / (2 * 1350);

  const thinStrokeLab = ctx.thinStrokeLab;
  const dataEnergy = (p, l, curBeta) => {
    if (thinStrokeLab && thinStrokeLab[p] >= 0) {
      return l === thinStrokeLab[p] ? 0 : curBeta * 6.5 + 18000;
    }
    const i = p * 4, c = palLab[l];
    const m = mag ? mag[p] : 0;
    const useRaw = m > 5.5;
    const r = useRaw ? rawD[i] : fltD[i];
    const g = useRaw ? rawD[i + 1] : fltD[i + 1];
    const b = useRaw ? rawD[i + 2] : fltD[i + 2];
    let dBase = cdist2(r, g, b, c.r, c.g, c.b);
    const chC = Math.hypot(c.a, c.b2);
    if (chC >= 12.0 && (Math.max(r, g, b) - Math.min(r, g, b)) >= 22) {
      const [, pa, pb2] = rgb2lab(r, g, b);
      const chP = Math.hypot(pa, pb2);
      if (chP >= 10.0) {
        const cosH = (pa * c.a + pb2 * c.b2) / (chP * chC);
        if (cosH < 0.88) {
          dBase += (0.88 - cosH) * chP * chC * 75.0;
        }
      }
    }

    const fA = flankA[p], fB = flankB[p];
    if (fA >= 0 && fB >= 0) {
      const alpha = flankAlpha[p];
      const perp = flankPerp[p];
      const abDist2 = palDist2[fA * K + fB];
      const scale = Math.min(abDist2 * 0.28, curBeta * 3.0);
      if (l === fA) {
        const unmixCost = perp * 0.65 + (1 - alpha) * (1 - alpha) * scale;
        return Math.min(dBase, unmixCost);
      }
      if (l === fB) {
        const unmixCost = perp * 0.65 + alpha * alpha * scale;
        return Math.min(dBase, unmixCost);
      }
      if (palIsMidBlend[l * K * K + fA * K + fB] && dBase > perp * 0.5) {
        return dBase + curBeta * 3.6 + abDist2 * 0.25;
      }
    }
    return dBase;
  };

  for (let it = 0; it < maxIter; it++) {
    const effIt = singleStepMode ? opt.iterIndex : it;
    const effTotal = singleStepMode ? (opt.totalIters || 18) : maxIter;
    const anneal = singleStepMode ? 1.0 : (0.55 + 0.55 * (effIt / Math.max(1, effTotal - 1)));
    const beta = baseBeta * anneal;
    let changed = 0;

    const dirMode = effIt & 3;
    const revY = (dirMode === 1 || dirMode === 2);
    const revX = (dirMode === 1 || dirMode === 3);

    for (let yy = 0; yy < h; yy++) {
      const y = revY ? (h - 1 - yy) : yy;
      for (let xx = 0; xx < w; xx++) {
        const x = revX ? (w - 1 - xx) : xx;
        const p = y * w + x;
        if (mask && mask[p]) continue;
        const cur = labels[p];
        if (cur < 0) continue;

        let isBoundary = false, sameOrtho = 0, sameDiag = 0;
        let candLen = 1;
        candBuf[0] = cur;
        for (let k = 0; k < 8; k++) {
          const qx = x + DX[k], qy = y + DY[k];
          if (qx < 0 || qy < 0 || qx >= w || qy >= h) { nLabelBuf[k] = -2; continue; }
          const nl = labels[qy * w + qx];
          nLabelBuf[k] = nl;
          if (nl === cur) {
            if (k < 4) sameOrtho++; else sameDiag++;
          } else if (nl >= 0) {
            isBoundary = true;
            let seenC = false;
            for (let ci = 0; ci < candLen; ci++) if (candBuf[ci] === nl) { seenC = true; break; }
            if (!seenC) candBuf[candLen++] = nl;
          }
        }
        if (!isBoundary) continue;

        const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
        const nx = nxArr[p], ny = nyArr[p], coh = cohArr[p];
        const hasAniso = coh > 0.15 && (nx !== 0 || ny !== 0);
        for (let k = 0; k < 8; k++) {
          if (nLabelBuf[k] === -2) { wEdge[k] = 0; continue; }
          const np = (y + DY[k]) * w + (x + DX[k]);
          const ni = np * 4;
          const dc2 = cdist2(r0, g0, b0, rawD[ni], rawD[ni + 1], rawD[ni + 2]);
          let aniso = 1.0;
          if (hasAniso) {
            const stepLen = k < 4 ? 1.0 : 1.41421356;
            const tanAlign = Math.abs((DX[k] * (-ny) + DY[k] * nx) / stepLen);
            aniso = 0.74 + 0.56 * tanAlign;
          }
          wEdge[k] = W_DIR[k] * aniso * (0.14 + 0.86 * Math.exp(-dc2 * inv2SigmaEdge));
        }

        const fAp = flankA[p], fBp = flankB[p];
        if (fAp >= 0) {
          let sc = false; for (let ci = 0; ci < candLen; ci++) if (candBuf[ci] === fAp) { sc = true; break; }
          if (!sc) candBuf[candLen++] = fAp;
        }
        if (fBp >= 0) {
          let sc = false; for (let ci = 0; ci < candLen; ci++) if (candBuf[ci] === fBp) { sc = true; break; }
          if (!sc) candBuf[candLen++] = fBp;
        }

        const dCurRaw = cdist2(r0, g0, b0, palLab[cur].r, palLab[cur].g, palLab[cur].b);
        const dCur = dataEnergy(p, cur, beta);
        const hasCleanUnmixMajority = fAp >= 0 && fBp >= 0 && coh > 0.25 && flankPerp[p] < 320 && sameOrtho >= 1 && (sameOrtho + sameDiag >= 2) &&
          ((cur === fAp && flankAlpha[p] >= 0.505) || (cur === fBp && flankAlpha[p] <= 0.495));
        if (hasCleanUnmixMajority) continue;
        const detailProt = labels._detailProt || null;
        const isSharpFeature = (cornerArr[p] > 5.5 && sameOrtho + sameDiag >= 1 && dCurRaw < 1100) || !!(detailProt && detailProt[p]);
        const isProtectedDetailOrTip = (sameOrtho + sameDiag >= 1 && dCurRaw < 480) || isSharpFeature;

        let bestL = cur, bestE = Infinity;
        for (let ci = 0; ci < candLen; ci++) {
          const l = candBuf[ci];
          const dl = l === cur ? dCur : dataEnergy(p, l, beta);
          if (isProtectedDetailOrTip && l !== cur && dl > dCur * 1.95 + 420) continue;
          let e = dl;
          for (let k = 0; k < 8; k++) {
            const nl = nLabelBuf[k];
            if (nl === -2) continue;
            if (nl !== l) {
              const pairCap = (nl >= 0 && l >= 0) ? Math.min(beta, palDist2[l * K + nl] * 0.24 + 120) : beta;
              e += pairCap * wEdge[k];
            }
          }
          if (e < bestE) { bestE = e; bestL = l; }
        }

        if (bestL !== cur) {
          if (opt.topology !== false && effIt >= 1 && wouldChangeTopology(labels, w, h, x, y, cur, bestL)) {
            const isFalseHalo = fAp >= 0 && fBp >= 0 && cur !== fAp && cur !== fBp && palIsMidBlend[cur * K * K + fAp * K + fBp];
            if (!isFalseHalo) continue;
          }
          labels[p] = bestL;
          changed++;
        }
      }
    }
    labels._lastMrfChanged = changed;
    if (onTick) onTick((it + 1) / maxIter, changed);
    if (!singleStepMode && it >= 6 && changed < Math.max(4, w * h * 0.00012)) break;
  }
  return labels;
}

