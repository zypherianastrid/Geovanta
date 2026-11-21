/* =====================================================================
 * JS Module 07: VMT Engine Part 3 — 3D CIE-Lab KD-Tree, K-Means++ Palette & Halo Pruning
 * ===================================================================== */
/* =====================================================================
   TAHAP 2 — PaletteFinder: ANNkd_tree + K-Means++ di CIE-Lab + BIC/MDL
   + Anti-Halo Transition Cluster Unmixing & Pruning
   ===================================================================== */
function buildKdTree(pts, depth = 0) {
  if (!pts.length) return null;
  const ax = depth % 3, k = ['L', 'a', 'b'][ax];
  pts.sort((x, y) => x[k] - y[k]);
  const m = pts.length >> 1;
  return { p: pts[m], ax, k, l: buildKdTree(pts.slice(0, m), depth + 1), r: buildKdTree(pts.slice(m + 1), depth + 1) };
}

function kdNearestLab(nd, L, a, b, best) {
  if (!nd) return best;
  const p = nd.p;
  const dL = L - p.L, da = a - p.a, db = b - p.b;
  const dd = dL * dL + da * da + db * db;
  if (dd < best.d) { best.d = dd; best.i = p.i; }
  const v = nd.ax === 0 ? L : nd.ax === 1 ? a : b;
  const pv = p[nd.k];
  const first = v < pv ? nd.l : nd.r, second = v < pv ? nd.r : nd.l;
  kdNearestLab(first, L, a, b, best);
  const dv = v - pv;
  if (dv * dv < best.d) kdNearestLab(second, L, a, b, best);
  return best;
}

/* Analisis Plateau Datar Terverifikasi & Detektor Gradasi Halus (1-Family Multi-Shade + Smooth Gradient) */
function analyzeColorPlateausAndGradients(work, mask, edgeField = null) {
  if (!work || !work.data) {
    return { plateauModes: [], isSingleFamilyMultiShade: false, hasSmoothGradient: false, gradPixelFrac: 0, flatPixelFrac: 0, gradSamples: [] };
  }
  const cacheKey = (mask ? 2 : 1) + (edgeField ? 4 : 0);
  if (work._plateauAnalysis && work._plateauCacheKey === cacheKey) {
    return work._plateauAnalysis;
  }
  const { w, h } = work;
  const d = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
  const mag = edgeField ? edgeField.mag : null;

  const xyStep = Math.max(w, h) > 560 ? Math.max(1, Math.floor(Math.max(w, h) / 480)) : 1;
  const stepArea = xyStep * xyStep;
  const plateauBins = new Map();
  const gradSamples = [];
  let totalValid = 0, flatCount = 0, smoothGradCount = 0;
  const gradStride = Math.max(1, Math.floor(((w * h) / stepArea) / 6000));

  for (let y = 2; y < h - 2; y += xyStep) {
    const row = y * w;
    for (let x = 2; x < w - 2; x += xyStep) {
      const p = row + x;
      if (mask && mask[p]) continue;
      totalValid += stepArea;
      let mp = 0;
      if (mag) {
        mp = mag[p];
      } else {
        const iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
        const gx = 0.299 * (d[iR] - d[iL]) + 0.587 * (d[iR + 1] - d[iL + 1]) + 0.114 * (d[iR + 2] - d[iL + 2]);
        const gy = 0.299 * (d[iD] - d[iU]) + 0.587 * (d[iD + 1] - d[iU + 1]) + 0.114 * (d[iD + 2] - d[iU + 2]);
        mp = 0.5 * Math.hypot(gx, gy);
      }
      const i0 = p * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];

      /* 1. Uji Plateau Datar Murni (2D Isotropik 5x5 MAUPUN Pita Fungsional 1D Anisotropik tebal >= 3px seperti bibir roti, kuning telur, & tepian renyah) */
      if (mp <= 3.4) {
        let flatNbs = 0, hNbs = 0, vNbs = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const rOff = (y + dy) * w;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const np = rOff + x + dx;
            if (mask && mask[np]) continue;
            const ni = np * 4;
            if (cdist2(r0, g0, b0, d[ni], d[ni + 1], d[ni + 2]) <= 54) {
              flatNbs++;
              if (dy === 0) hNbs++;
              if (dx === 0) vNbs++;
            }
          }
        }
        if (flatNbs >= 6) {
          const iL2 = (p - 2) * 4, iR2 = (p + 2) * 4, iU2 = (p - 2 * w) * 4, iD2 = (p + 2 * w) * 4;
          const spanH2 = cdist2(d[iL2], d[iL2 + 1], d[iL2 + 2], d[iR2], d[iR2 + 1], d[iR2 + 2]);
          const spanV2 = cdist2(d[iU2], d[iU2 + 1], d[iU2 + 2], d[iD2], d[iD2 + 1], d[iD2 + 2]);
          const isIsoFlat = flatNbs >= 7 && spanH2 <= 90 && spanV2 <= 90;
          const isHorizBand = mp <= 2.2 && hNbs === 2 && vNbs === 2 && spanH2 <= 42 &&
            cdist2(r0, g0, b0, d[iL2], d[iL2 + 1], d[iL2 + 2]) <= 42 &&
            cdist2(r0, g0, b0, d[iR2], d[iR2 + 1], d[iR2 + 2]) <= 42;
          const isVertBand = mp <= 2.2 && hNbs === 2 && vNbs === 2 && spanV2 <= 42 &&
            cdist2(r0, g0, b0, d[iU2], d[iU2 + 1], d[iU2 + 2]) <= 42 &&
            cdist2(r0, g0, b0, d[iD2], d[iD2 + 1], d[iD2 + 2]) <= 42;
          /* [FIX-2026-10-29] Ramp lambat BUKAN pita datar: kolom sebuah
             gradasi horizontal (nilai konstan sepanjang vertikal, naik
             monoton sepanjang horizontal) selama ini lolos uji
             isVertBand — karena uji itu hanya memeriksa konstansi
             SEPANJANG pita, bukan perubahan TEGAK LURUS pita — sehingga
             gradasi murni 0→255 terhitung flatPixelFrac≈0.98, lalu
             classifyStage memangkas gradientContinuity ke 0.07 dan
             output diposterisasi jadi 11 pita, bukan 1 gradien.
             Pengecualian: bila deret 5 piksel tegak lurus pita monoton
             (≥3 langkah searah, tanpa pembalikan) maka ini ramp, bukan
             pita — jangan hitung flat, biarkan jatuh ke uji gradasi.
             Pita asli aman: pita lebar ≥5 punya langkah 0; pita lebar 3
             punya deret A,B,B,B,A (tidak monoton); piksel tepi pita
             hanya punya 1 langkah tak-nol. */
          const grayAt = (pp) => 0.299 * d[pp * 4] + 0.587 * d[pp * 4 + 1] + 0.114 * d[pp * 4 + 2];
          const isMonotonicRamp = (vals) => {
            let pos = 0, neg = 0;
            for (let k = 0; k + 1 < vals.length; k++) {
              const s = vals[k + 1] - vals[k];
              if (s >= 0.9) pos++; else if (s <= -0.9) neg++;
            }
            const span = Math.abs(vals[vals.length - 1] - vals[0]);
            return span >= 3 && ((pos >= 3 && neg === 0) || (neg >= 3 && pos === 0));
          };
          const isPerpRamp = (isVertBand && isMonotonicRamp([grayAt(p - 2), grayAt(p - 1), grayAt(p), grayAt(p + 1), grayAt(p + 2)])) ||
            (isHorizBand && isMonotonicRamp([grayAt(p - 2 * w), grayAt(p - w), grayAt(p), grayAt(p + w), grayAt(p + 2 * w)]));
          if ((isIsoFlat || isHorizBand || isVertBand) && !isPerpRamp) {
            flatCount += stepArea;
            const bKey = ((r0 >> 1) << 14) | ((g0 >> 1) << 7) | (b0 >> 1);
            let bin = plateauBins.get(bKey);
            if (!bin) {
              bin = { rSum: 0, gSum: 0, bSum: 0, count: 0 };
              plateauBins.set(bKey, bin);
            }
            bin.rSum += r0 * stepArea; bin.gSum += g0 * stepArea; bin.bSum += b0 * stepArea; bin.count += stepArea;
            continue;
          }
        }
      }

      /* 2. Uji Interior Gradasi Halus (jauh dari step-edge tajam, turunan ke-1 bermakna, rentang 5x5 tumbuh >= 1.85x rentang 3x3, dan turunan ke-2 rendah) */
      if (mp >= 0.65 && mp <= 16.0) {
        if (mag && (mag[p - 2] > 18 || mag[p + 2] > 18 || mag[p - 2 * w] > 18 || mag[p + 2 * w] > 18)) continue;
        const checkSym = (off1, off2) => {
          if (mask && (mask[p - off1] || mask[p + off1] || mask[p - off2] || mask[p + off2])) return false;
          const a1 = (p - off1) * 4, b1 = (p + off1) * 4;
          const a2 = (p - off2) * 4, b2 = (p + off2) * 4;
          const lap1 = cdist2(r0, g0, b0, (d[a1] + d[b1]) * 0.5, (d[a1 + 1] + d[b1 + 1]) * 0.5, (d[a1 + 2] + d[b1 + 2]) * 0.5);
          if (lap1 > 18) return false;
          const lap2 = cdist2(r0, g0, b0, (d[a2] + d[b2]) * 0.5, (d[a2 + 1] + d[b2 + 1]) * 0.5, (d[a2 + 2] + d[b2 + 2]) * 0.5);
          if (lap2 > 38) return false;
          const dTot = cdist2(d[a2], d[a2 + 1], d[a2 + 2], d[b2], d[b2 + 1], d[b2 + 2]);
          const dMid = cdist2(d[a1], d[a1 + 1], d[a1 + 2], d[b1], d[b1 + 1], d[b1 + 2]);
          if (dTot > 40) {
            if (dMid > dTot * 0.50) return false;
            const dSideA = cdist2(r0, g0, b0, d[a2], d[a2 + 1], d[a2 + 2]);
            const dSideB = cdist2(r0, g0, b0, d[b2], d[b2 + 1], d[b2 + 2]);
            if (dSideA < dTot * 0.08 || dSideB < dTot * 0.08) return false;
          }
          return true;
        };
        if (checkSym(1, 2) && checkSym(w, 2 * w)) {
          const iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
          const iL2 = (p - 2) * 4, iR2 = (p + 2) * 4, iU2 = (p - 2 * w) * 4, iD2 = (p + 2 * w) * 4;
          const slope2 = cdist2(d[iL], d[iL + 1], d[iL + 2], d[iR], d[iR + 1], d[iR + 2]) +
                         cdist2(d[iU], d[iU + 1], d[iU + 2], d[iD], d[iD + 1], d[iD + 2]);
          const span2 = cdist2(d[iL2], d[iL2 + 1], d[iL2 + 2], d[iR2], d[iR2 + 1], d[iR2 + 2]) +
                        cdist2(d[iU2], d[iU2 + 1], d[iU2 + 2], d[iD2], d[iD2 + 1], d[iD2 + 2]);
          if (slope2 >= 20 && span2 >= 56 && span2 >= slope2 * 1.95) {
            const prevG = smoothGradCount;
            smoothGradCount += stepArea;
            if (Math.floor(smoothGradCount / gradStride) > Math.floor(prevG / gradStride) && gradSamples.length < 6000) {
              const [L, ca, cb] = rgb2lab(r0, g0, b0);
              gradSamples.push({ r: r0, g: g0, b: b0, L, a: ca, b2: cb, pureCore: true, isGradCore: true });
            }
          }
        }
      }
    }
  }

  const flatPixelFrac = flatCount / Math.max(1, totalValid);
  const gradPixelFrac = smoothGradCount / Math.max(1, totalValid);
  const prelimSmoothGrad = gradPixelFrac >= 0.045 || (gradPixelFrac >= 0.020 && flatPixelFrac < 0.28 && smoothGradCount >= 260);

  /* Klasterisasi Peak-First Non-Chaining pada bin plateau datar */
  const sortedBins = [];
  plateauBins.forEach(b => {
    const mr = b.rSum / b.count, mg = b.gSum / b.count, mb = b.bSum / b.count;
    const [L, a, b2] = rgb2lab(mr, mg, mb);
    sortedBins.push({ r: mr, g: mg, b: mb, L, a, b2, count: b.count });
  });
  sortedBins.sort((a, b) => b.count - a.count);

  const isLowRes07 = (work.w * work.h) <= 150000;
  const rawModes = [];
  const mergeRadLab2 = prelimSmoothGrad ? 16.0 : (isLowRes07 ? 16.0 : 10.5);
  const mergeDe00Thr = isLowRes07 ? 3.5 : 2.45;
  for (const sb of sortedBins) {
    let found = null;
    for (const m of rawModes) {
      const d2 = (sb.L - m.L0) ** 2 + (sb.a - m.a0) ** 2 + (sb.b2 - m.b0) ** 2;
      const de00 = ciede2000(sb.L, sb.a, sb.b2, m.L0, m.a0, m.b0);
      if (d2 <= mergeRadLab2 || de00 <= mergeDe00Thr) { found = m; break; }
    }
    if (found) {
      const wTot = found.count + sb.count;
      found.r = (found.r * found.count + sb.r * sb.count) / wTot;
      found.g = (found.g * found.count + sb.g * sb.count) / wTot;
      found.b = (found.b * found.count + sb.b * sb.count) / wTot;
      found.L = (found.L * found.count + sb.L * sb.count) / wTot;
      found.a = (found.a * found.count + sb.a * sb.count) / wTot;
      found.b2 = (found.b2 * found.count + sb.b2 * sb.count) / wTot;
      found.count = wTot;
    } else {
      rawModes.push({
        r: sb.r, g: sb.g, b: sb.b, L: sb.L, a: sb.a, b2: sb.b2,
        L0: sb.L, a0: sb.a, b0: sb.b2,
        rPeak: Math.round(sb.r), gPeak: Math.round(sb.g), bPeak: Math.round(sb.b),
        count: sb.count
      });
    }
  }

  rawModes.sort((a, b) => b.count - a.count);
  const minPlateauSupport = prelimSmoothGrad
    ? Math.max(16, Math.round(totalValid * 0.0022))
    : Math.max(16, Math.min(200, Math.round(totalValid * 0.00024)));
  let candidateModes = rawModes.filter(m => m.count >= minPlateauSupport);

  /* Deduplikasi Seimbang Tanpa Bias Rasio 4x:
     Gabungkan warna kembar akibat kompresi JPEG / anti-aliasing (dRgb <= 25 atau ΔE00 <= 3.85,
     serta variasi rona kromatik identik ΔE00 <= 4.65), namun pertahankan faset berbeda yang sah */
  if (!prelimSmoothGrad && candidateModes.length > 2) {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = candidateModes.length - 1; i >= 1; i--) {
        const mi = candidateModes[i];
        const chI = Math.hypot(mi.a, mi.b2);
        for (let j = 0; j < i; j++) {
          const mj = candidateModes[j];
          const chJ = Math.hypot(mj.a, mj.b2);
          const de00 = ciede2000(mi.L, mi.a, mi.b2, mj.L, mj.a, mj.b2);
          const dRgb = Math.hypot(mi.r - mj.r, mi.g - mj.g, mi.b - mj.b);
          const sameHue = chI >= 14 && chJ >= 14 && ((mi.a * mj.a + mi.b2 * mj.b2) / (chI * chJ)) >= 0.94;
          const isLowResIcon = (work.w * work.h) <= 150000;
          const bothWarmBrown = isLowResIcon && mi.a >= 8 && mj.a >= 8 && mi.b2 >= 18 && mj.b2 >= 18 && Math.abs(mi.L - mj.L) <= 8.5 && dRgb <= 32;
          const isSameHueSubBand = sameHue && de00 <= (isLowResIcon ? 4.65 : 4.68) && (isLowResIcon || Math.abs(mi.L - mj.L) <= 4.8 || Math.min(chI, chJ) >= 48);
          const maxDRgb = isLowResIcon ? 25.0 : ((Math.min(mi.L, mj.L) >= 52 || Math.min(chI, chJ) >= 50) ? 23.5 : 16.0);
          if (de00 <= 3.85 || dRgb <= maxDRgb || isSameHueSubBand || bothWarmBrown) {
            const wTot = mj.count + mi.count;
            mj.r = (mj.r * mj.count + mi.r * mi.count) / wTot;
            mj.g = (mj.g * mj.count + mi.g * mi.count) / wTot;
            mj.b = (mj.b * mj.count + mi.b * mi.count) / wTot;
            const [nL, na, nb2] = rgb2lab(mj.r, mj.g, mj.b);
            mj.L = nL; mj.a = na; mj.b2 = nb2;
            mj.count = wTot;
            candidateModes.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  /* Saring hanya pita transisi sangat kecil (< 0.052% area) yang benar-benar kolinier di antara dua mode mayor,
     TANPA pernah menghapus warna objek solid (seperti highlight pink tomat, kuning telur, atau bibir roti)! */
  const plateauModes = candidateModes
    .filter((m, idx) => {
      if (idx < 4 || m.count >= totalValid * 0.00052) return true;
      for (let a = 0; a < Math.min(idx, 6); a++) {
        if (candidateModes[a].count < m.count * 8) continue;
        for (let b = a + 1; b < Math.min(idx, 6); b++) {
          if (candidateModes[b].count < m.count * 8) continue;
          const bl = evalColorBlendPair(m.r, m.g, m.b, candidateModes[a], candidateModes[b]);
          if (bl && bl.perpD2 <= 180) return false;
        }
      }
      return true;
    })
    .map(m => {
      const rp = Math.round(m.r), gp = Math.round(m.g), bp = Math.round(m.b);
      const [pL, pa, pb2] = rgb2lab(rp, gp, bp);
      return {
        r: rp, g: gp, b: bp,
        L: pL, a: pa, b2: pb2,
        count: m.count,
        hex: hexOf(rp, gp, bp),
        verifiedPlateau: true
      };
    });

  /* Bersihkan gradSamples dari piksel yang sebenarnya hanya derau JPEG di atas warna plateau datar */
  if (gradSamples.length > 0 && plateauModes.length > 0) {
    const rawGradLen = gradSamples.length;
    const filteredGrad = gradSamples.filter(gs => {
      for (let i = 0; i < plateauModes.length; i++) {
        const pm = plateauModes[i];
        const dLab2 = (gs.L - pm.L) ** 2 + (gs.a - pm.a) ** 2 + (gs.b2 - pm.b2) ** 2;
        if (dLab2 <= 16.0) return false;
      }
      return true;
    });
    const keepRatio = filteredGrad.length / Math.max(1, rawGradLen);
    gradSamples.length = 0;
    for (let i = 0; i < filteredGrad.length; i++) gradSamples.push(filteredGrad[i]);
    smoothGradCount = Math.round(smoothGradCount * keepRatio);
  }
  const adjGradPixelFrac = smoothGradCount / Math.max(1, totalValid);
  const adjHasSmoothGradient = adjGradPixelFrac >= 0.045 || (adjGradPixelFrac >= 0.020 && flatPixelFrac < 0.28 && smoothGradCount >= 260 && adjGradPixelFrac >= flatPixelFrac * 0.15);

  /* Evaluasi apakah palet plateau merupakan Single-Family Multi-Shade (>= 4 tingkat warna dalam 1 rona/keluarga) */
  let isSingleFamilyMultiShade = false;
  if (plateauModes.length >= 4 && !adjHasSmoothGradient) {
    let chromCount = 0, sumU = 0, sumV = 0;
    for (const m of plateauModes) {
      const ch = Math.hypot(m.a, m.b2);
      if (ch >= 8.0) {
        chromCount++;
        sumU += (m.a / ch) * m.count;
        sumV += (m.b2 / ch) * m.count;
      }
    }
    if (chromCount <= 1) {
      isSingleFamilyMultiShade = true;
    } else {
      const uLen = Math.hypot(sumU, sumV) || 1;
      const domU = sumU / uLen, domV = sumV / uLen;
      let inFam = 0;
      for (const m of plateauModes) {
        const ch = Math.hypot(m.a, m.b2);
        if (ch < 9.5 || m.L <= 24 || m.L >= 88) {
          inFam++;
        } else {
          const cosA = (m.a * domU + m.b2 * domV) / ch;
          if (cosA >= 0.72) inFam++;
        }
      }
      if (inFam >= Math.max(4, Math.ceil(plateauModes.length * 0.75))) {
        isSingleFamilyMultiShade = true;
      }
    }
  }

  const result = {
    plateauModes,
    isSingleFamilyMultiShade,
    hasSmoothGradient: adjHasSmoothGradient,
    gradPixelFrac: +adjGradPixelFrac.toFixed(4),
    flatPixelFrac: +flatPixelFrac.toFixed(4),
    gradSamples
  };
  work._plateauAnalysis = result;
  work._plateauCacheKey = cacheKey;
  return result;
}

/* Ambil sampel piksel interior murni & detail 2D koheren + sampel interior gradasi halus */
function sampleInteriorPixels(work, mask, edgeField, maxN = 32000) {
  const { data, w, h } = work, d = data.data, mag = edgeField ? edgeField.mag : null;
  const out = [];
  const stride = Math.max(1, Math.floor((w * h) / maxN));

  /* Deteksi apakah piksel p berada pada ramp transisi anti-aliasing 1-2px (BUKAN interior gradasi halus atau plateau) */
  const isTransitionRamp = (x, y, p) => {
    if (mag && mag[p] > 16) return true;
    const i0 = p * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];
    const mp0 = mag ? mag[p] : 0;

    /* Jika piksel berada di atas plateau datar lokal (gradien rendah), bukan ramp transisi */
    if (mp0 <= 2.2 && x >= 1 && x < w - 1 && y >= 1 && y < h - 1) {
      let flatSim = 0;
      for (const np of [p - 1, p + 1, p - w, p + w]) {
        if (mask && mask[np]) continue;
        const ni = np * 4;
        if (cdist2(r0, g0, b0, d[ni], d[ni + 1], d[ni + 2]) <= 42) flatSim++;
      }
      if (flatSim >= 3) return false;
    }

    const nearEdge = mp0 > 3.2;
    const checkAxisRamp = (stepOff, r) => {
      const pA = p - r * stepOff, pB = p + r * stepOff;
      if (mask && (mask[pA] || mask[pB])) return false;
      const iA = pA * 4, iB = pB * 4;
      const rA = d[iA], gA = d[iA + 1], bA = d[iA + 2];
      const rB = d[iB], gB = d[iB + 1], bB = d[iB + 2];
      const dAB = cdist2(rA, gA, bA, rB, gB, bB);
      if (dAB < 420) return false;

      /* Bedakan tepi langkah 1-2px vs lereng gradasi kontinu pada r >= 2 */
      if (r >= 2) {
        const pM1 = p - stepOff, pP1 = p + stepOff;
        const iM1 = pM1 * 4, iP1 = pP1 * 4;
        const dMid = cdist2(d[iM1], d[iM1 + 1], d[iM1 + 2], d[iP1], d[iP1 + 1], d[iP1 + 2]);
        const dLeft = cdist2(rA, gA, bA, d[iM1], d[iM1 + 1], d[iM1 + 2]);
        const dRight = cdist2(d[iP1], d[iP1 + 1], d[iP1 + 2], rB, gB, bB);
        /* Pada gradasi kontinu, dLeft & dRight sama-sama aktif dan dMid < 0.42 * dAB */
        if (dLeft >= 0.035 * dAB && dRight >= 0.035 * dAB && dMid <= 0.42 * dAB) {
          return false;
        }
      } else if (r === 1 && mp0 <= 11.0 && x >= 2 && x < w - 2 && y >= 2 && y < h - 2) {
        const pA2 = p - 2 * stepOff, pB2 = p + 2 * stepOff;
        if (!(mask && (mask[pA2] || mask[pB2]))) {
          const iA2 = pA2 * 4, iB2 = pB2 * 4;
          const dTot2 = cdist2(d[iA2], d[iA2 + 1], d[iA2 + 2], d[iB2], d[iB2 + 1], d[iB2 + 2]);
          if (dTot2 > 180 && dAB <= 0.42 * dTot2) return false;
        }
      }

      /* Jangan membuang titik lembah garis sejati (1D valley seperti garis jari di dalam permukaan sewarna atau tinta gelap) */
      const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
      const lA = 0.299 * rA + 0.587 * gA + 0.114 * bA;
      const lB = 0.299 * rB + 0.587 * gB + 0.114 * bB;
      if ((l0 < Math.min(lA, lB) - 3.5 && (dAB <= 2200 || l0 <= 22)) || (l0 > Math.max(lA, lB) + 4.0 && dAB <= 2200)) return false;

      const dr = rA - rB, dg = gA - gB, db = bA - bB;
      const len2 = dr * dr + dg * dg + db * db;
      if (len2 < 100) return false;
      const t = ((r0 - rB) * dr + (g0 - gB) * dg + (b0 - bB) * db) / len2;
      const tMin = nearEdge ? -0.24 : 0.03;
      const tMax = nearEdge ? 1.24 : 0.97;
      if (t > tMin && t < tMax) {
        const tc = clamp(t, 0, 1);
        const pr = rB + tc * dr, pg = gB + tc * dg, pb = bB + tc * db;
        const perpD2 = cdist2(r0, g0, b0, pr, pg, pb);
        if (perpD2 <= dAB * 0.22 + 560) {
          if (t >= 0.03 && t <= 0.97) return true;
          const dEnd = Math.min(cdist2(r0, g0, b0, rA, gA, bA), cdist2(r0, g0, b0, rB, gB, bB));
          if (dEnd > 14 && dEnd < dAB * 0.28) return true;
        }
      }
      return false;
    };

    for (const r of [1, 2, 3]) {
      if (x >= r && x < w - r && checkAxisRamp(1, r)) return true;
      if (y >= r && y < h - r && checkAxisRamp(w, r)) return true;
      if (x >= r && x < w - r && y >= r && y < h - r) {
        if (checkAxisRamp(w + 1, r)) return true;
        if (checkAxisRamp(w - 1, r)) return true;
      }
    }
    return false;
  };

  /* Evaluasi apakah piksel berada pada inti plateau datar, permukaan gradasi halus, detail kroma tinggi, atau inti line-art */
  const evalHomogeneousCore = (x, y, p) => {
    const mp0 = mag ? mag[p] : 0;
    if (mp0 > 24.0) return { coherent: false, pureCore: false, isGradCore: false };
    const i0 = p * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];
    const sat0 = Math.max(r0, g0, b0) - Math.min(r0, g0, b0);
    const lum0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
    let sim = 0, simMed = 0, simH = 0, simV = 0, maxEdgeMag = mp0, maxNbLum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const np = ny * w + nx;
        if (mask && mask[np]) continue;
        const mNp = mag ? mag[np] : 0;
        if (mNp > maxEdgeMag) maxEdgeMag = mNp;
        const ni = np * 4;
        const nr = d[ni], ng = d[ni + 1], nb = d[ni + 2];
        const nLum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        if (nLum > maxNbLum) maxNbLum = nLum;
        const cd2 = cdist2(r0, g0, b0, nr, ng, nb);
        if (cd2 < 240) simMed++;
        if (mNp <= 15 && cd2 < 150) {
          sim++;
          if (dy === 0) simH++;
          if (dx === 0) simV++;
        }
      }
    }
    const coherent = mp0 <= 16.0 && sim >= 5 && simH >= 1 && simV >= 1;
    let pureCore = coherent && sim >= 7 && maxEdgeMag < 7.0;
    if (pureCore && x >= 2 && x < w - 2 && y >= 2 && y < h - 2) {
      for (const np2 of [p - 2, p + 2, p - 2 * w, p + 2 * w]) {
        if ((mask && mask[np2]) || (mag && mag[np2] > 12)) { pureCore = false; break; }
        const ni2 = np2 * 4;
        if (cdist2(r0, g0, b0, d[ni2], d[ni2 + 1], d[ni2 + 2]) > 220) { pureCore = false; break; }
      }
    }
    if (coherent) return { coherent: true, pureCore, isGradCore: false };

    const pModes = (work._plateauAnalysis && work._plateauAnalysis.plateauModes) ? work._plateauAnalysis.plateauModes : [];
    const hasSmoothGrad = !!(work._plateauAnalysis && work._plateauAnalysis.hasSmoothGradient);
    const isBlendOfPlateaus = () => {
      for (let a = 0; a < pModes.length; a++) {
        for (let b = a + 1; b < pModes.length; b++) {
          if (evalColorBlendPair(r0, g0, b0, pModes[a], pModes[b])) return true;
        }
      }
      return false;
    };

    if (hasSmoothGrad && sat0 >= 22 && sim >= 4 && mp0 <= 14.0 && maxEdgeMag <= 16.0 && !isBlendOfPlateaus()) {
      return { coherent: true, pureCore: true, isGradCore: true, isCreaseCore: false };
    }
    if (lum0 <= 24 && simMed >= 3 && (maxNbLum - lum0 >= 22 || mp0 <= 14.0) && !isBlendOfPlateaus()) {
      return { coherent: true, pureCore: true, isGradCore: false, isCreaseCore: true };
    }
    /* Deteksi Inti Garis Celah/Lipatan Halus (Finger Crease / Soft Line-Art) dengan lebar 1-2px:
       Jika piksel lebih gelap >= 4.2 luma dibanding kedua sisi normalnya (r=2) yang berada pada permukaan sewarna (dAB <= 2000)
       dan koheren di KEDUA sisi sepanjang arah tangensial (bukan bintik halftone atau tepi anti-aliasing dua warna kontras) */
    if (x >= 2 && x < w - 2 && y >= 2 && y < h - 2 && simMed >= 2 && !isBlendOfPlateaus()) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const iA = ((y - 2 * dy) * w + (x - 2 * dx)) * 4;
        const iB = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
        const dAB = cdist2(d[iA], d[iA + 1], d[iA + 2], d[iB], d[iB + 1], d[iB + 2]);
        if (dAB > 2000 && lum0 > 22) continue;
        const lA = 0.299 * d[iA] + 0.587 * d[iA + 1] + 0.114 * d[iA + 2];
        const lB = 0.299 * d[iB] + 0.587 * d[iB + 1] + 0.114 * d[iB + 2];
        const iT1 = ((y - dx) * w + (x + dy)) * 4;
        const iT2 = ((y + dx) * w + (x - dy)) * 4;
        const dT1 = cdist2(r0, g0, b0, d[iT1], d[iT1 + 1], d[iT1 + 2]);
        const dT2 = cdist2(r0, g0, b0, d[iT2], d[iT2 + 1], d[iT2 + 2]);
        if (lum0 < Math.min(lA, lB) - 4.2 && Math.min(dT1, dT2) <= 160 && Math.max(dT1, dT2) <= 260) {
          return { coherent: true, pureCore: true, isGradCore: false, isCreaseCore: true };
        }
      }
    }

    if (hasSmoothGrad && x >= 2 && x < w - 2 && y >= 2 && y < h - 2 && maxEdgeMag <= 16.0) {
      const iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
      const lapH = cdist2(r0, g0, b0, (d[iL] + d[iR]) * 0.5, (d[iL + 1] + d[iR + 1]) * 0.5, (d[iL + 2] + d[iR + 2]) * 0.5);
      const lapV = cdist2(r0, g0, b0, (d[iU] + d[iD]) * 0.5, (d[iU + 1] + d[iD + 1]) * 0.5, (d[iU + 2] + d[iD + 2]) * 0.5);
      if (lapH <= 22 && lapV <= 22) {
        const iL2 = (p - 2) * 4, iR2 = (p + 2) * 4, iU2 = (p - 2 * w) * 4, iD2 = (p + 2 * w) * 4;
        const lapH2 = cdist2(r0, g0, b0, (d[iL2] + d[iR2]) * 0.5, (d[iL2 + 1] + d[iR2 + 1]) * 0.5, (d[iL2 + 2] + d[iR2 + 2]) * 0.5);
        const lapV2 = cdist2(r0, g0, b0, (d[iU2] + d[iD2]) * 0.5, (d[iU2 + 1] + d[iD2 + 1]) * 0.5, (d[iU2 + 2] + d[iD2 + 2]) * 0.5);
        if (lapH2 <= 46 && lapV2 <= 46) {
          return { coherent: true, pureCore: true, isGradCore: true };
        }
      }
    }
    return { coherent: false, pureCore: false, isGradCore: false };
  };

  const qBinCounts = new Uint32Array(4096);
  const maxPerQBin = Math.max(48, Math.floor(maxN * 0.045));
  for (let p = 0; p < w * h; p += stride) {
    if (mask && mask[p]) continue;
    const x = p % w, y = (p / w) | 0;
    const i = p * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const qb = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    if (qBinCounts[qb] >= maxPerQBin) continue;
    let isStrokeCore = false;
    if (x >= 2 && x < w - 2 && y >= 2 && y < h - 2) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const iT1 = ((y - dx) * w + (x + dy)) * 4, iT2 = ((y + dx) * w + (x - dy)) * 4;
        if (cdist2(r, g, b, d[iT1], d[iT1 + 1], d[iT1 + 2]) > 180 && cdist2(r, g, b, d[iT2], d[iT2 + 1], d[iT2 + 2]) > 180) continue;
        const iA = ((y - 2 * dy) * w + (x - 2 * dx)) * 4, iB = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
        if (cdist2(d[iA], d[iA + 1], d[iA + 2], d[iB], d[iB + 1], d[iB + 2]) > 900) continue;
        const bgR = (d[iA] + d[iB]) * 0.5, bgG = (d[iA + 1] + d[iB + 1]) * 0.5, bgB = (d[iA + 2] + d[iB + 2]) * 0.5;
        const dBg0 = cdist2(r, g, b, bgR, bgG, bgB);
        if (dBg0 < 4200) continue;
        const iM1 = ((y - dy) * w + (x - dx)) * 4, iP1 = ((y + dy) * w + (x + dx)) * 4;
        if (dBg0 >= cdist2(d[iM1], d[iM1 + 1], d[iM1 + 2], bgR, bgG, bgB) * 0.96 &&
            dBg0 >= cdist2(d[iP1], d[iP1 + 1], d[iP1 + 2], bgR, bgG, bgB) * 0.96) {
          isStrokeCore = true; break;
        }
      }
    }
    let coherent = false, pureCore = false, isGradCore = false, isCreaseCore = false;
    if (isStrokeCore) {
      coherent = true; pureCore = true;
    } else {
      if (isTransitionRamp(x, y, p)) continue;
      const hc = evalHomogeneousCore(x, y, p);
      if (!hc.coherent) continue;
      coherent = hc.coherent; pureCore = hc.pureCore; isGradCore = hc.isGradCore; isCreaseCore = hc.isCreaseCore;
    }
    qBinCounts[qb]++;
    const [L, ca, cb] = rgb2lab(r, g, b);
    out.push({ r, g, b, L, a: ca, b2: cb, pureCore, isGradCore, isCreaseCore: !!isCreaseCore });
    if (out.length >= maxN) break;
  }

  if (out.length < 64) {
    for (let p = 0; p < w * h; p += Math.max(1, stride)) {
      if (mask && mask[p]) continue;
      const x = p % w, y = (p / w) | 0;
      if (mag && mag[p] > 16) continue;
      if (isTransitionRamp(x, y, p)) continue;
      const i = p * 4;
      const [L, ca, cb] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      out.push({ r: d[i], g: d[i + 1], b: d[i + 2], L, a: ca, b2: cb, pureCore: false, isGradCore: false });
      if (out.length >= maxN) break;
    }
  }
  if (out.length < 16) {
    for (let p = 0; p < w * h; p += Math.max(1, stride)) {
      if (mask && mask[p]) continue;
      const i = p * 4;
      const [L, ca, cb] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      out.push({ r: d[i], g: d[i + 1], b: d[i + 2], L, a: ca, b2: cb, pureCore: false, isGradCore: false });
    }
  }
  return out;
}

/* Seeding K-Means++ di ruang CIE-Lab dengan dukungan penuh warna 1-family & permukaan gradasi */
function kmeansPlusPlusSeeds(samples, K, plateauModes = null) {
  const n = samples.length;
  if (!n) return [];
  const binCount = new Uint32Array(4096);
  const binCoreCount = new Uint32Array(4096);
  const sampleBin = new Uint16Array(n);
  let maxScore0 = -1, firstIdx = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const b = ((s.r >> 4) << 8) | ((s.g >> 4) << 4) | (s.b >> 4);
    sampleBin[i] = b;
    const c = ++binCount[b];
    const cc = s.pureCore ? ++binCoreCount[b] : binCoreCount[b];
    const sc0 = c + cc * 2;
    if (sc0 > maxScore0) { maxScore0 = sc0; firstIdx = i; }
  }

  const seeds = [];
  /* Jika terdapat mode plateau datar terverifikasi, jadikan benih prioritas utama */
  if (plateauModes && plateauModes.length > 0) {
    for (let i = 0; i < Math.min(K, plateauModes.length); i++) {
      const pm = plateauModes[i];
      seeds.push({ r: pm.r, g: pm.g, b: pm.b, L: pm.L, a: pm.a, b2: pm.b2, pureCore: true, verifiedPlateau: true });
    }
  }
  if (!seeds.length) seeds.push(samples[firstIdx]);

  /* Extrema & Chromatic Accent Anchors di awal: pastikan siluet tergelap (L_min), titik cahaya paling terang (L_max),
     dan aksen rona hangat/komplementer (seperti lampu lentera mercusuar) langsung masuk ke benih utama di K >= 6 */
  if (K >= 6 && n >= 64) {
    let minLIdx = -1, minLVal = Infinity;
    let maxLIdx = -1, maxLVal = -Infinity;
    let maxWarmIdx = -1, maxWarmVal = -Infinity;
    let maxPinkBlushIdx = -1, maxPinkBlushVal = -Infinity;
    let creaseAnchorIdx = -1, maxCreaseScore = -Infinity;
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      if (!s.pureCore && !s.isGradCore && !s.isCreaseCore) continue;
      if (s.L < minLVal) { minLVal = s.L; minLIdx = i; }
      if (s.L > maxLVal) { maxLVal = s.L; maxLIdx = i; }
      const warmScore = s.a * 1.25 + s.b2 * 0.95 + (s.L > 45 ? s.L * 0.35 : -20);
      if (warmScore > maxWarmVal && s.L > 48) { maxWarmVal = warmScore; maxWarmIdx = i; }
      /* Jangkar khusus Blush Pink Pipi (kroma a* positif hangat pada tingkat kecerahan kulit) */
      if (s.L >= 68 && s.L <= 92 && s.a >= 10.5 && s.b2 >= -4 && s.b2 <= 22) {
        const blushScore = s.a * 1.8 - Math.abs(s.L - 82) * 0.25 + binCount[sampleBin[i]] * 0.08;
        if (blushScore > maxPinkBlushVal) { maxPinkBlushVal = blushScore; maxPinkBlushIdx = i; }
      }
      /* Jangkar khusus Garis Lipatan/Jari (rose-taupe / mauve-brown / shadow line) */
      if (s.isCreaseCore && s.L >= 32 && s.L <= 78 && s.a >= 4.5) {
        const cScore = s.a * 1.4 + binCount[sampleBin[i]] * 0.25;
        if (cScore > maxCreaseScore) { maxCreaseScore = cScore; creaseAnchorIdx = i; }
      }
    }
    const ensureEarlyAnchor = (idx, minDeThr = 5.0, lockAsCrease = false) => {
      if (idx < 0 || seeds.length >= K) return;
      const cand = samples[idx];
      let minDE = Infinity;
      for (const sd of seeds) {
        const de = ciede2000(cand.L, cand.a, cand.b2, sd.L, sd.a, sd.b2);
        if (de < minDE) minDE = de;
      }
      if (minDE <= minDeThr) return;
      for (let a = 0; a < seeds.length; a++) {
        for (let b = a + 1; b < seeds.length; b++) {
          if (evalColorBlendPair(cand.r, cand.g, cand.b, seeds[a], seeds[b])) return;
        }
      }
      seeds.push({ ...cand, verifiedPlateau: !!lockAsCrease });
    };
    ensureEarlyAnchor(minLIdx, 5.0, false);
    ensureEarlyAnchor(maxLIdx, 5.0, false);
    ensureEarlyAnchor(maxWarmIdx, 5.0, false);
    ensureEarlyAnchor(maxPinkBlushIdx, 3.4, true);
    ensureEarlyAnchor(creaseAnchorIdx, 3.6, true);
  }

  const dists = new Float64Array(n).fill(Infinity);
  for (let sIdx = 0; sIdx < seeds.length - 1; sIdx++) {
    const sd = seeds[sIdx];
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      const d = (s.L - sd.L) ** 2 + (s.a - sd.a) ** 2 + (s.b2 - sd.b2) ** 2;
      if (d < dists[i]) dists[i] = d;
    }
  }

  const isCollinearWithSeeds = (s, b) => {
    if (seeds.length < 2) return false;
    if (s.isGradCore) return false;
    const chS = Math.hypot(s.a, s.b2);
    if (chS >= 18) return false;
    if (s.pureCore && binCoreCount[b] >= Math.max(8, n * 0.002)) return false;

    for (let a = 0; a < seeds.length; a++) {
      const sa = seeds[a];
      for (let bIdx = a + 1; bIdx < seeds.length; bIdx++) {
        const sb = seeds[bIdx];
        if (evalColorBlendPair(s.r, s.g, s.b, sa, sb)) return true;
        const dL = sa.L - sb.L, da = sa.a - sb.a, db = sa.b2 - sb.b2;
        const len2 = dL * dL + da * da + db * db;
        if (len2 >= 36) {
          const t = ((s.L - sb.L) * dL + (s.a - sb.a) * da + (s.b2 - sb.b2) * db) / len2;
          if (t > 0.08 && t < 0.92) {
            const pL = sb.L + t * dL, pa = sb.a + t * da, pb = sb.b2 + t * db;
            const perp2 = (s.L - pL) ** 2 + (s.a - pa) ** 2 + (s.b2 - pb) ** 2;
            if (perp2 <= Math.min(42, 14 + len2 * 0.012)) return true;
          }
        }
      }
    }
    return false;
  };

  /* Precompute popWeight * coreMult dan chroma tiap sampel sekali saja di luar loop K */
  const baseWeightArr = new Float64Array(n);
  const chSArr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const b = sampleBin[i];
    const popWeight = s.isGradCore ? Math.max(2.2, Math.log2(2 + binCount[b])) : Math.log2(1 + binCount[b] + binCoreCount[b] * 2);
    const coreMult = s.pureCore ? 1.0 : (binCoreCount[b] > 0 ? 0.45 : 0.08);
    baseWeightArr[i] = popWeight * coreMult;
    chSArr[i] = Math.hypot(s.a, s.b2);
  }

  for (let k = seeds.length; k < K; k++) {
    const last = seeds[seeds.length - 1];
    let hasDarkSeed = false;
    for (let j = 0; j < seeds.length; j++) {
      if (seeds[j].L < 14.5) { hasDarkSeed = true; break; }
    }
    let bestIdx = 0, bestScore = -1;
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      const d = (s.L - last.L) ** 2 + (s.a - last.a) ** 2 + (s.b2 - last.b2) ** 2;
      if (d < dists[i]) dists[i] = d;
      const distVal = dists[i];
      if (distVal <= 0) continue;

      let diversityMult = 1.0;
      const chS = chSArr[i];
      if (chS >= 15) {
        let maxCos = -1, sameHueSeeds = 0;
        for (let j = 0; j < seeds.length; j++) {
          const sj = seeds[j], chJ = Math.hypot(sj.a, sj.b2);
          if (chJ >= 12) {
            const cosH = (s.a * sj.a + s.b2 * sj.b2) / (chS * chJ);
            if (cosH > maxCos) maxCos = cosH;
            if (cosH >= 0.94) sameHueSeeds++;
          }
        }
        if (maxCos < 0.88) diversityMult = 4.2;
        else if (sameHueSeeds >= (s.isGradCore ? 10 : 4)) diversityMult = 0.18;
        else if (sameHueSeeds >= (s.isGradCore ? 7 : 3)) diversityMult = 0.42;
      } else if (s.L < 14.5 && !hasDarkSeed) {
        diversityMult = 3.8;
      }

      /* Upper-bound pruning: hanya evaluasi isCollinearWithSeeds jika kandidat ini berpeluang melampaui bestScore */
      const rawScore = distVal * baseWeightArr[i] * diversityMult;
      if (rawScore <= bestScore) continue;
      const blendMult = isCollinearWithSeeds(s, sampleBin[i]) ? 0.06 : 1.0;
      const score = rawScore * blendMult;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    seeds.push(samples[bestIdx]);
  }
  return seeds;
}

function kmeansLab(samples, K, seeds, maxIter = 18) {
  const n = samples.length;
  const cents = seeds.map(s => ({ r: s.r, g: s.g, b: s.b, L: s.L, a: s.a, b2: s.b2, verifiedPlateau: !!s.verifiedPlateau }));
  const asg = new Int32Array(n);
  const cL = new Float64Array(K), cA = new Float64Array(K), cB = new Float64Array(K);
  let sse = Infinity;
  for (let it = 0; it < maxIter; it++) {
    for (let k = 0; k < K; k++) {
      cL[k] = cents[k].L; cA[k] = cents[k].a; cB[k] = cents[k].b2;
    }
    const sum = Array.from({ length: K }, () => ({ r: 0, g: 0, b: 0, L: 0, a: 0, b2: 0, n: 0, gradN: 0, creaseN: 0 }));
    let newsse = 0;
    for (let s = 0; s < n; s++) {
      const sm = samples[s];
      const sL = sm.L, sa = sm.a, sb = sm.b2;
      let bestD = Infinity, bestI = 0;
      for (let k = 0; k < K; k++) {
        const dL = sL - cL[k], da = sa - cA[k], db = sb - cB[k];
        const dd = dL * dL + da * da + db * db;
        if (dd < bestD) { bestD = dd; bestI = k; }
      }
      asg[s] = bestI;
      newsse += bestD;
      const ac = sum[bestI];
      ac.r += sm.r; ac.g += sm.g; ac.b += sm.b;
      ac.L += sL; ac.a += sa; ac.b2 += sb;
      ac.n++;
      if (sm.isGradCore) ac.gradN++;
      if (sm.isCreaseCore) ac.creaseN++;
    }
    let moved = 0;
    for (let k = 0; k < K; k++) {
      const ac = sum[k];
      if (!ac.n) continue;
      /* Jika centroid dikunci sebagai plateau datar terverifikasi dan cukup dekat, jaga akurasinya */
      const nr = ac.r / ac.n, ng = ac.g / ac.n, nb = ac.b / ac.n;
      const nL = ac.L / ac.n, na = ac.a / ac.n, nb2 = ac.b2 / ac.n;
      moved += Math.hypot(nL - cents[k].L, na - cents[k].a, nb2 - cents[k].b2);
      cents[k] = {
        r: nr, g: ng, b: nb, L: nL, a: na, b2: nb2,
        count: ac.n,
        isGradCluster: ac.gradN >= Math.max(4, ac.n * 0.24),
        isCreaseCluster: ac.creaseN >= Math.max(8, samples.length * 0.0012) && ac.creaseN >= ac.n * 0.18,
        verifiedPlateau: cents[k].verifiedPlateau || (ac.creaseN >= Math.max(10, samples.length * 0.0015) && ac.creaseN >= ac.n * 0.22)
      };
    }
    sse = newsse;
    if (moved < K * 0.08) break;
  }
  return { cents, sse, asg };
}

/* Eliminasi Klaster Palet Transisi Anti-Aliasing dengan Perlindungan Penuh Plateau 1-Family & Klaster Gradasi */
function pruneHaloPaletteClusters(work, mask, cents, edgeField = null, plateauInfo = null) {
  if (!work || !work.data || !cents || cents.length <= 2) return cents;
  const { data, w, h } = work, d = data.data;
  const mag = edgeField ? edgeField.mag : null;
  const pInfo = plateauInfo || work._plateauAnalysis || { plateauModes: [], hasSmoothGradient: false };
  const verifiedModes = pInfo.plateauModes || [];
  let active = cents.map(c => ({ ...c }));

  const matchesVerifiedPlateau = c => {
    if (c.verifiedPlateau) return true;
    for (const pm of verifiedModes) {
      const d2 = (c.L - pm.L) ** 2 + (c.a - pm.a) ** 2 + (c.b2 - pm.b2) ** 2;
      if (d2 <= 12.25) return true;
    }
    return false;
  };

  const step = Math.max(1, Math.floor(Math.min(w, h) / 260));
  const sw = Math.ceil(w / step), sh = Math.ceil(h / step), nCells = sw * sh;
  const gridValid = new Uint8Array(nCells);
  const gridL = new Float32Array(nCells), gridA = new Float32Array(nCells), gridB = new Float32Array(nCells);
  for (let gy = 0; gy < sh; gy++) {
    const y = Math.min(h - 1, gy * step);
    for (let gx = 0; gx < sw; gx++) {
      const x = Math.min(w - 1, gx * step);
      const p = y * w + x;
      if (mask && mask[p]) continue;
      const cellIdx = gy * sw + gx;
      gridValid[cellIdx] = 1;
      const i = p * 4;
      const [L, a, b] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      gridL[cellIdx] = L; gridA[cellIdx] = a; gridB[cellIdx] = b;
    }
  }
  const grid = new Int16Array(nCells);

  for (let pass = 0; pass < 3 && active.length > 2; pass++) {
    const K = active.length;
    const cL = new Float32Array(K), cA = new Float32Array(K), cB = new Float32Array(K);
    for (let k = 0; k < K; k++) { cL[k] = active[k].L; cA[k] = active[k].a; cB[k] = active[k].b2; }
    for (let cIdx = 0; cIdx < nCells; cIdx++) {
      if (!gridValid[cIdx]) { grid[cIdx] = -1; continue; }
      const L = gridL[cIdx], a = gridA[cIdx], b = gridB[cIdx];
      let bestD = Infinity, bestI = 0;
      for (let k = 0; k < K; k++) {
        const dL = L - cL[k], da = a - cA[k], db = b - cB[k];
        const dd = dL * dL + da * da + db * db;
        if (dd < bestD) { bestD = dd; bestI = k; }
      }
      grid[cIdx] = bestI;
    }

    const tot = new Int32Array(K);
    const core = new Int32Array(K);
    const deepCore = new Int32Array(K);
    const smoothCore = new Int32Array(K);
    const sandwiched = new Int32Array(K);
    const pairCounts = Array.from({ length: K }, () => new Map());
    let totalValidCells = 0;

    for (let gy = 1; gy < sh - 1; gy++) {
      const y = Math.min(h - 1, gy * step);
      for (let gx = 1; gx < sw - 1; gx++) {
        const idx = gy * sw + gx;
        const k = grid[idx];
        if (k < 0) continue;
        tot[k]++;
        totalValidCells++;
        const x = Math.min(w - 1, gx * step);
        const p = y * w + x;
        const lL = grid[idx - 1], lR = grid[idx + 1], lU = grid[idx - sw], lD = grid[idx + sw];
        const lowGrad = !mag || mag[p] < 11;
        if (mag && mag[p] >= 0.15 && mag[p] <= 16.0 && y >= 1 && y < h - 1 && x >= 1 && x < w - 1) {
          const i0 = p * 4, iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
          const lapH = cdist2(d[i0], d[i0 + 1], d[i0 + 2], (d[iL] + d[iR]) * 0.5, (d[iL + 1] + d[iR + 1]) * 0.5, (d[iL + 2] + d[iR + 2]) * 0.5);
          const lapV = cdist2(d[i0], d[i0 + 1], d[i0 + 2], (d[iU] + d[iD]) * 0.5, (d[iU + 1] + d[iD + 1]) * 0.5, (d[iU + 2] + d[iD + 2]) * 0.5);
          if (lapH <= 28 && lapV <= 28) smoothCore[k]++;
        }
        if (lL === k && lR === k && lU === k && lD === k && lowGrad) {
          core[k]++;
          if (gx >= 2 && gx < sw - 2 && gy >= 2 && gy < sh - 2) {
            if (grid[idx - 2] === k && grid[idx + 2] === k && grid[idx - 2 * sw] === k && grid[idx + 2 * sw] === k &&
                grid[idx - sw - 1] === k && grid[idx - sw + 1] === k && grid[idx + sw - 1] === k && grid[idx + sw + 1] === k) {
              deepCore[k]++;
            }
          }
        } else {
          const checkAxis = (a, b) => {
            if (a >= 0 && b >= 0 && a !== k && b !== k && a !== b) {
              sandwiched[k]++;
              const pk = a < b ? (a * 64 + b) : (b * 64 + a);
              pairCounts[k].set(pk, (pairCounts[k].get(pk) || 0) + 1);
            }
          };
          checkAxis(lL, lR);
          checkAxis(lU, lD);
          if (gx >= 2 && gx < sw - 2) checkAxis(grid[idx - 2], grid[idx + 2]);
          if (gy >= 2 && gy < sh - 2) checkAxis(grid[idx - 2 * sw], grid[idx + 2 * sw]);
        }
      }
    }

    /* [PATCH-A1] Simpan bukti koherensi spasial tiap klaster agar tahap penggabungan akhir bisa membedakan shade nyata vs halo */
    for (let k = 0; k < K; k++) {
      active[k].gridTot = tot[k];
      active[k].coreCount = core[k];
      active[k].deepCoreCount = deepCore[k];
    }

    const isBlendInLab = (ck, ca, cb) => {
      if (evalColorBlendPair(ck.r, ck.g, ck.b, ca, cb)) return true;
      const dL = ca.L - cb.L, da = ca.a - cb.a, db = ca.b2 - cb.b2;
      const len2 = dL * dL + da * da + db * db;
      if (len2 < 24) return false;
      const t = ((ck.L - cb.L) * dL + (ck.a - cb.a) * da + (ck.b2 - cb.b2) * db) / len2;
      if (t <= 0.04 || t >= 0.96) return false;
      const pL = cb.L + t * dL, pa = cb.a + t * da, pb = cb.b2 + t * db;
      const perp2 = (ck.L - pL) ** 2 + (ck.a - pa) ** 2 + (ck.b2 - pb) ** 2;
      if (perp2 <= Math.min(42, 12 + len2 * 0.014)) return true;
      return false;
    };

    const drop = new Uint8Array(K);
    for (let k = 0; k < K; k++) {
      if (tot[k] === 0) { drop[k] = 1; continue; }
      /* Lindungi penuh klaster yang terbukti merupakan plateau datar murni, permukaan gradasi, keluarga hue unik, atau line-art gelap */
      if (matchesVerifiedPlateau(active[k])) continue;
      if (active[k].isGradCluster || (pInfo.hasSmoothGradient && smoothCore[k] >= Math.max(8, tot[k] * 0.25))) continue;
      const ckChroma = Math.hypot(active[k].a, active[k].b2);
      if (ckChroma >= 16) {
        let hasLargerSameHue = false;
        let isCrossHueBlend = false;
        for (let a = 0; a < K; a++) {
          if (a === k || drop[a] || tot[a] <= tot[k]) continue;
          const caChroma = Math.hypot(active[a].a, active[a].b2);
          if (caChroma >= 12 && ((active[k].a * active[a].a + active[k].b2 * active[a].b2) / (ckChroma * caChroma)) >= 0.88) {
            hasLargerSameHue = true; break;
          }
        }
        if (!hasLargerSameHue) {
          for (let a = 0; a < K && !isCrossHueBlend; a++) {
            if (a === k || drop[a] || tot[a] < tot[k] * 2.0) continue;
            for (let b = a + 1; b < K && !isCrossHueBlend; b++) {
              if (b === k || drop[b] || tot[b] < tot[k] * 2.0) continue;
              if (isBlendInLab(active[k], active[a], active[b])) isCrossHueBlend = true;
            }
          }
          if (!isCrossHueBlend) continue;
        }
      }

      const coreRatio = core[k] / Math.max(1, tot[k]);
      const deepCoreRatio = deepCore[k] / Math.max(1, tot[k]);
      const popShare = tot[k] / Math.max(1, totalValidCells);

      /* Invarian Spasial 2D: Klaster warna yang memiliki dukungan blok inti 2D nyata (deepCoreRatio >= 0.22
         atau coreRatio >= 0.28 dengan popShare >= 0.03) adalah permukaan desain asli (seperti bidang Peach-Oranye
         pada poster bertekstur kertas), BUKAN halo anti-aliasing! */
      if (deepCoreRatio >= 0.22 || (coreRatio >= 0.28 && popShare >= 0.03) || deepCore[k] >= Math.max(64, totalValidCells * 0.008)) continue;

      let isHalo = false;
      pairCounts[k].forEach((cnt, pk) => {
        if (isHalo) return;
        const a = pk >> 6, b = pk & 63;
        if (drop[a] || drop[b]) return;
        if (cnt >= Math.max(2, tot[k] * 0.10) && (tot[a] + tot[b]) > tot[k] * 1.8) {
          if (isBlendInLab(active[k], active[a], active[b])) isHalo = true;
        }
      });

      if (!isHalo && (deepCoreRatio < 0.18 || coreRatio < 0.38) && popShare < 0.12) {
        for (let a = 0; a < K && !isHalo; a++) {
          if (a === k || drop[a] || tot[a] < tot[k] * 1.6) continue;
          for (let b = a + 1; b < K && !isHalo; b++) {
            if (b === k || drop[b] || tot[b] < tot[k] * 1.6) continue;
            if (isBlendInLab(active[k], active[a], active[b])) isHalo = true;
          }
        }
      }

      if (!isHalo && (deepCoreRatio < 0.15 || coreRatio < 0.28)) {
        for (let a = 0; a < K && !isHalo; a++) {
          if (a === k || drop[a] || tot[a] < tot[k] * 3.0) continue;
          const dLab2 = (active[k].L - active[a].L) ** 2 + (active[k].a - active[a].a) ** 2 + (active[k].b2 - active[a].b2) ** 2;
          if (dLab2 < 324) isHalo = true;
        }
      }
      if (isHalo) drop[k] = 1;
    }

    const nextActive = active.filter((_, i) => !drop[i]);
    if (nextActive.length === active.length || nextActive.length < 2) break;
    active = nextActive;
  }
  return active;
}

/* Snap setiap centroid CIE-Lab ke modus warna murni (histogram peak dalam radius DeltaE <= 3.5) */
function snapCentroidsToInteriorMode(cents, samples) {
  if (!samples || !samples.length || !cents || !cents.length) return cents;
  return cents.map(c => {
    const bins = new Map();
    let bestKey = -1, bestCnt = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const d2 = (s.L - c.L) ** 2 + (s.a - c.a) ** 2 + (s.b2 - c.b2) ** 2;
      if (d2 <= 12.25) {
        const key = (s.r << 16) | (s.g << 8) | (s.b);
        const wgt = s.pureCore ? 2 : 1;
        const nv = (bins.get(key) || 0) + wgt;
        bins.set(key, nv);
        if (nv > bestCnt) { bestCnt = nv; bestKey = key; }
      }
    }
    if (bestKey >= 0 && bestCnt >= Math.max(3, (c.count || 0) * 0.16)) {
      const mr = (bestKey >> 16) & 255, mg = (bestKey >> 8) & 255, mb = bestKey & 255;
      const [mL, ma, mb2] = rgb2lab(mr, mg, mb);
      return { ...c, r: mr, g: mg, b: mb, L: mL, a: ma, b2: mb2 };
    }
    return c;
  });
}

/* Ekstraksi Palet Optimal: mendukung 'two', 'auto', 'custom', dan 'unlimited' + Akurasi 1-Family & Gradasi */
function findPalette(work, mask, opt = {}, edgeField = null) {
  if (!edgeField && work && work.data) edgeField = buildEdgeField(work, mask);
  const plateauInfo = analyzeColorPlateausAndGradients(work, mask, edgeField);
  const { plateauModes, isSingleFamilyMultiShade, hasSmoothGradient, gradSamples } = plateauInfo;

  let samples = sampleInteriorPixels(work, mask, edgeField, 24000);
  if (hasSmoothGradient && gradSamples && gradSamples.length) {
    samples = samples.concat(gradSamples);
  }
  if (!samples.length) return { palette: [{ r: 0, g: 0, b: 0, hex: '#000000' }], K: 1, auto: false };

  if (opt.colorMode === 'two') {
    const seeds = kmeansPlusPlusSeeds(samples, 2, plateauModes.slice(0, 2));
    const { cents } = kmeansLab(samples, 2, seeds, 20);
    const snapped = snapCentroidsToInteriorMode(cents, samples);
    return { palette: snapped.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), hex: hexOf(c.r, c.g, c.b) })), K: 2, auto: false };
  }

  const capFlatPaletteList = (list, maxK) => {
    if (!maxK || maxK < 2 || list.length <= maxK) return list;
    const arr = list.map(c => {
      if (c.L == null) {
        const [L, a, b2] = rgb2lab(c.r, c.g, c.b);
        return { ...c, L, a, b2, count: c.count || 1 };
      }
      return { ...c, count: c.count || 1 };
    });
    while (arr.length > maxK) {
      let bestI = 0, bestJ = 1, bestCost = Infinity;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const de = ciede2000(arr[i].L, arr[i].a, arr[i].b2, arr[j].L, arr[j].a, arr[j].b2);
          const minCnt = Math.min(arr[i].count || 1, arr[j].count || 1);
          const cost = de * (1 + 0.18 * Math.log(1 + minCnt));
          if (cost < bestCost) { bestCost = cost; bestI = i; bestJ = j; }
        }
      }
      const ca = arr[bestI], cb = arr[bestJ];
      const keep = (ca.count || 1) >= (cb.count || 1) ? ca : cb;
      const drop = keep === ca ? cb : ca;
      const totW = (keep.count || 1) + (drop.count || 1);
      keep.r = Math.round((keep.r * (keep.count || 1) + drop.r * (drop.count || 1)) / totW);
      keep.g = Math.round((keep.g * (keep.count || 1) + drop.g * (drop.count || 1)) / totW);
      keep.b = Math.round((keep.b * (keep.count || 1) + drop.b * (drop.count || 1)) / totW);
      const [nL, na, nb2] = rgb2lab(keep.r, keep.g, keep.b);
      keep.L = nL; keep.a = na; keep.b2 = nb2;
      keep.hex = hexOf(keep.r, keep.g, keep.b);
      keep.count = totW;
      arr.splice(keep === ca ? bestJ : bestI, 1);
    }
    return arr;
  };

  if (opt.colorMode === 'custom' && opt.paletteColors && opt.paletteColors.length) {
    const pal = [];
    const pItems = opt.paletteItems && opt.paletteItems.length === opt.paletteColors.length ? opt.paletteItems : null;
    for (let idx = 0; idx < opt.paletteColors.length; idx++) {
      const hx = opt.paletteColors[idx];
      const it = pItems ? pItems[idx] : null;
      if (it && it.grad && it.grad.stops && it.grad.stops.length >= 2 && opt.gradientMode !== 'off') {
        it.grad.stops.forEach((st, sIdx) => {
          const [r, g, b] = rgbOf(st.color || hx);
          const [L, a, b2] = rgb2lab(r, g, b);
          pal.push({
            r, g, b, L, a, b2, hex: hexOf(r, g, b),
            isGradCluster: true,
            _userGradGroup: idx + 1,
            _userGradPrimary: sIdx === 0,
            userGrad: it.grad
          });
        });
      } else {
        const [r, g, b] = rgbOf(hx);
        const [L, a, b2] = rgb2lab(r, g, b);
        pal.push({ r, g, b, L, a, b2, hex: hexOf(r, g, b), _userGradGroup: it ? (idx + 1) : 0 });
      }
    }
    const hasCustomGrad = pal.some(p => p.userGrad);
    pal._hasSmoothGradient = hasCustomGrad || hasSmoothGradient;
    return { palette: pal, K: pal.length, auto: false, hasSmoothGradient: pal._hasSmoothGradient };
  }

  if (opt.fixedK && opt.targetColors) {
    const K = clamp(opt.targetColors, 2, 48);
    const seeds = kmeansPlusPlusSeeds(samples, K, plateauModes);
    const { cents } = kmeansLab(samples, K, seeds, 18);
    const snapped = snapCentroidsToInteriorMode(cents, samples);
    return { palette: snapped.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), hex: hexOf(c.r, c.g, c.b) })), K: snapped.length, auto: false };
  }

  /* JALUR 1: Gambar Diskrit Flat (1-Family Multi-Shade maupun Multi-Family Flat, Tanpa Gradasi Halus)
     Jika gambar didominasi plateau datar murni tanpa gradasi kontinu, pertahankan mode plateau terverifikasi
     dengan jarak perseptual CIEDE2000 (ΔE00) yang bermakna dan batasi artefak sesuai targetKMax adaptif */
  const maxAllowedPlateau = clamp(opt.targetColors || Math.max((opt.adaptiveKMax || 16) + 6, plateauModes.length, 16), 2, 44);
  if (!hasSmoothGradient && plateauModes.length >= 2 && opt.colorMode !== 'unlimited') {
    const palList = plateauModes.map(pm => ({ ...pm }));
    /* Periksa apakah ada detail aksen mikro yang memiliki pureCore mandiri di luar plateauModes */
    const seedsExtra = kmeansPlusPlusSeeds(samples, Math.min(28, palList.length + 4), palList);
    for (let sIdx = palList.length; sIdx < seedsExtra.length; sIdx++) {
      const sd = seedsExtra[sIdx];
      const minDe00 = palList.reduce((mn, c) => Math.min(mn, ciede2000(sd.L, sd.a, sd.b2, c.L, c.a, c.b2)), Infinity);
      const minDRgb = palList.reduce((mn, c) => Math.min(mn, Math.hypot(sd.r - c.r, sd.g - c.g, sd.b - c.b)), Infinity);
      if (minDe00 >= 5.5 && minDRgb >= 28.0) {
        let support = 0, coreSupport = 0, sr = 0, sg = 0, sb = 0, sL = 0, sa = 0, sb2 = 0;
        for (let i = 0; i < samples.length; i++) {
          const sm = samples[i];
          if ((sm.L - sd.L) ** 2 + (sm.a - sd.a) ** 2 + (sm.b2 - sd.b2) ** 2 <= 18) {
            support++;
            if (sm.pureCore) coreSupport++;
            sr += sm.r; sg += sm.g; sb += sm.b; sL += sm.L; sa += sm.a; sb2 += sm.b2;
          }
        }
        if (support >= Math.max(18, Math.round(samples.length * 0.0040)) && coreSupport >= Math.max(10, support * 0.55)) {
          const mr = Math.round(sr / support), mg = Math.round(sg / support), mb = Math.round(sb / support);
          palList.push({ r: mr, g: mg, b: mb, L: sL / support, a: sa / support, b2: sb2 / support, count: support, hex: hexOf(mr, mg, mb), verifiedPlateau: true });
        }
      }
    }
    /* Saring mode plateau yang terlalu mirip secara CIEDE2000 atau Euclidean RGB tanpa menghapus shade 1-family yang sah */
    const isLowResIcon = (work.w * work.h) <= 150000;
    const filteredPal = [];
    for (const pm of palList) {
      const chP = Math.hypot(pm.a, pm.b2);
      const dup = filteredPal.find(u => {
        const chU = Math.hypot(u.a, u.b2);
        const de00 = ciede2000(pm.L, pm.a, pm.b2, u.L, u.a, u.b2);
        const dRgb = Math.hypot(pm.r - u.r, pm.g - u.g, pm.b - u.b);
        if (isLowResIcon) {
          return de00 < (isSingleFamilyMultiShade ? 2.4 : 3.6) || dRgb < 24.5;
        }
        const sameHue = chP >= 14 && chU >= 14 && ((pm.a * u.a + pm.b2 * u.b2) / (chP * chU)) >= 0.94;
        const deThr = (sameHue && (Math.abs(pm.L - u.L) <= 4.8 || Math.min(chP, chU) >= 48)) ? 4.68 : 3.85;
        const rgbThr = (Math.min(pm.L, u.L) >= 52 || Math.min(chP, chU) >= 50) ? 23.5 : 16.0;
        return de00 <= deThr || dRgb <= rgbThr;
      });
      if (!dup) filteredPal.push(pm);
    }
    if (filteredPal.length > maxAllowedPlateau) {
      const capped = capFlatPaletteList(filteredPal, maxAllowedPlateau);
      filteredPal.length = 0;
      capped.forEach(c => filteredPal.push(c));
    }
    let outPal = filteredPal.length >= 2 ? filteredPal : palList.slice(0, maxAllowedPlateau);
    if (opt.maxColorEnabled && opt.maxColors >= 2 && outPal.length > opt.maxColors) {
      outPal = capFlatPaletteList(outPal, opt.maxColors);
    }
    outPal._isSingleFamilyMultiShade = isSingleFamilyMultiShade;
    outPal._hasSmoothGradient = false;
    return { palette: outPal, K: outPal.length, auto: true, bic: 0 };
  }

  /* JALUR 2: Gambar dengan Permukaan Gradasi Halus atau Unlimited / Kompleks */
  const isUnlimited = opt.colorMode === 'unlimited';
  const effSens = (isUnlimited || hasSmoothGradient || isSingleFamilyMultiShade) ? 'high' : (opt.sensitivity || 'medium');
  const sigma0Sq = (isUnlimited || hasSmoothGradient || isSingleFamilyMultiShade) ? 2.4 : ({ low: 48.0, medium: 28.0, high: 15.0 }[effSens] || 28.0);
  const baseGamma = (isUnlimited || hasSmoothGradient || isSingleFamilyMultiShade) ? 0.82 : ({ low: 4.8, medium: 3.1, high: 1.95 }[effSens] || 3.1);
  const typeMult = opt.imageType === 'photo' ? 0.85 : opt.imageType === 'blended' ? 1.05 : 1.35;
  const sensGamma = baseGamma * typeMult;
  const defaultKmax = isUnlimited
    ? (opt.imageType === 'photo' ? 34 : opt.imageType === 'aliased' ? 18 : 26)
    : hasSmoothGradient
    ? Math.max(18, opt.adaptiveKMax || 22, plateauModes.length + 12)
    : Math.max(plateauModes.length + 2, opt.adaptiveKMax || (opt.imageType === 'photo' ? 24 : opt.imageType === 'aliased' ? 12 : 18));
  const Kmax = clamp(opt.targetColors || defaultKmax, 2, 40);
  const N = samples.length;
  const Neff = hasSmoothGradient ? 1150 : 480;

  const allSeeds = kmeansPlusPlusSeeds(samples, Kmax, plateauModes);
  const minStartK = Math.max(2, hasSmoothGradient ? Math.min(Kmax, Math.max(15, plateauModes.length + 10)) : plateauModes.length);
  /* Subsampling terstratifikasi untuk pencarian BIC agar evaluasi puluhan kandidat K berjalan instan */
  const bicMaxN = 4096;
  let bicSamples = samples;
  if (N > bicMaxN) {
    bicSamples = [];
    const stepB = N / bicMaxN;
    for (let i = 0; i < bicMaxN; i++) bicSamples.push(samples[Math.min(N - 1, Math.floor(i * stepB))]);
  }
  const Nbic = bicSamples.length;
  let best = null;
  for (let K = minStartK; K <= Math.min(allSeeds.length, Kmax); K++) {
    const r = kmeansLab(bicSamples, K, allSeeds.slice(0, K), 10);
    const mse = r.sse / Math.max(1, Nbic);
    const bic = Neff * Math.log(mse + sigma0Sq) + sensGamma * K * Math.log(Neff);
    if (!best) {
      best = { K, bic, cents: r.cents, sse: r.sse, mse };
    } else if (bic < best.bic) {
      const relDrop = (best.mse - mse) / Math.max(1e-4, best.mse);
      if (hasSmoothGradient || isSingleFamilyMultiShade || best.mse > sigma0Sq * 0.72 || relDrop >= 0.08) {
        best = { K, bic, cents: r.cents, sse: r.sse, mse };
      }
    }
    if (best && K > best.K + (isUnlimited || hasSmoothGradient ? 8 : 5)) break;
  }
  if (best && bicSamples !== samples) {
    const refined = kmeansLab(samples, best.K, best.cents, 14);
    best.cents = refined.cents;
    best.sse = refined.sse;
    best.mse = refined.sse / Math.max(1, N);
  }

  /* Pastikan seluruh mode plateau datar terverifikasi tetap terwakili di dalam best.cents */
  for (const pm of plateauModes) {
    const minD2 = best.cents.reduce((mn, c) => Math.min(mn, (pm.L - c.L) ** 2 + (pm.a - c.a) ** 2 + (pm.b2 - c.b2) ** 2), Infinity);
    if (minD2 > 10.5) {
      best.cents.push({ r: pm.r, g: pm.g, b: pm.b, L: pm.L, a: pm.a, b2: pm.b2, count: pm.count, verifiedPlateau: true });
    }
  }

  const minFrac = (isUnlimited || hasSmoothGradient) ? 0.0004 : 0.0010;
  const rawPal = best.cents
    .filter(c => c.verifiedPlateau || c.isGradCluster || (c.count || 1) >= Math.max(4, samples.length * minFrac))
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  const dehaledPal = snapCentroidsToInteriorMode(
    pruneHaloPaletteClusters(work, mask, rawPal.length ? rawPal : best.cents, edgeField, plateauInfo),
    samples
  );

  const layerDiff = (hasSmoothGradient || isSingleFamilyMultiShade)
    ? 3.2
    : (opt.layerDifference != null ? opt.layerDifference : (isUnlimited ? 4.8 : (opt.imageType === 'photo' ? 6.4 : 7.0)));
  const baseMergeThrLab2 = layerDiff * layerDiff;
  const uniq = [];
  for (const c of dehaledPal) {
    const cChroma = Math.hypot(c.a, c.b2);
    let sameHueInUniq = 0, darkCountInUniq = 0;
    for (const u of uniq) {
      const uChroma = Math.hypot(u.a, u.b2);
      if (cChroma >= 18 && uChroma >= 18 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) >= 0.92) {
        sameHueInUniq++;
      }
      if (u.L < 15.5) darkCountInUniq++;
    }
    const dup = uniq.find(u => {
      const dLab2 = (c.L - u.L) ** 2 + (c.a - u.a) ** 2 + (c.b2 - u.b2) ** 2;
      const de00 = ciede2000(c.L, c.a, c.b2, u.L, u.a, u.b2);
      const uChroma = Math.hypot(u.a, u.b2);
      const isDiffHue = cChroma >= 15 && uChroma >= 15 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) < 0.85;
      // Konsolidasikan warna bahu line-art gelap netral (hanya bila bukan klaster kromatik/gradasi malam)
      const bothLowChromaDark = cChroma < 16.0 && uChroma < 16.0 && !hasSmoothGradient;
      if (bothLowChromaDark && c.L < 16.0 && u.L < 16.0 && Math.max(c.a, u.a) < 18.0 && de00 < 12.5) {
        if (c.L < u.L) {
          u.r = Math.round(0.60 * c.r + 0.40 * u.r);
          u.g = Math.round(0.60 * c.g + 0.40 * u.g);
          u.b = Math.round(0.60 * c.b + 0.40 * u.b);
          const [nL, na, nb2] = rgb2lab(u.r, u.g, u.b);
          u.L = nL; u.a = na; u.b2 = nb2;
          u.hex = hexOf(u.r, u.g, u.b);
        }
        return true;
      }
      if (bothLowChromaDark && c.L < 15.5 && u.L < 15.5 && darkCountInUniq >= 2 && de00 < 12.5) return true;
      if (isDiffHue) {
        return de00 < 2.0;
      }
      // Gabungkan warna yang secara perseptual hampir identik (mis. #bf0005 vs #b40207 dengan de00 < 2.8)
      if (de00 < Math.max(2.5, layerDiff * 0.72) || (dLab2 < baseMergeThrLab2 && de00 < layerDiff * 0.82)) return true;
      // Cegah duplikasi shade semu dari kompresi JPEG pada hue kromatik yang identik (cosH >= 0.96 & de00 < 5.8)
      const sameChromaticHue = cChroma >= 18 && uChroma >= 18 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) >= 0.92;
      const identicalChromaticHue = cChroma >= 22 && uChroma >= 22 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) >= 0.96;
      if (!hasSmoothGradient && !isSingleFamilyMultiShade && identicalChromaticHue && de00 < Math.max(5.8, layerDiff * 0.88)) return true;
      if (!hasSmoothGradient && !isSingleFamilyMultiShade) {
        if (sameChromaticHue && sameHueInUniq >= 3 && de00 < 7.2) return true;
        if (sameChromaticHue && sameHueInUniq >= 2 && de00 < 4.5) return true;
      } else if (sameChromaticHue && sameHueInUniq >= 10 && de00 < 3.2) {
        return true;
      }
      const hasSolidSurface = (c.coreCount || 0) >= 12 && (c.coreCount || 0) >= (c.gridTot || 0) * 0.30;
      if (!isUnlimited && !hasSmoothGradient && !isSingleFamilyMultiShade && !c.verifiedPlateau && !c.isGradCluster && !hasSolidSurface && (c.count || 0) < (u.count || 1) * 0.85) {
        const bothNeutral = cChroma < 9.5 && uChroma < 9.5;
        if (bothNeutral || sameChromaticHue) {
          const shadeLimit = Math.max(layerDiff * 1.85, 13.8);
          if (dLab2 <= shadeLimit * shadeLimit) return true;
        }
      }
      return false;
    });
    if (!dup) {
      uniq.push({
        r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b),
        L: c.L, a: c.a, b2: c.b2, count: c.count || 1,
        hex: hexOf(c.r, c.g, c.b),
        verifiedPlateau: !!c.verifiedPlateau,
        isGradCluster: !!c.isGradCluster
      });
    }
  }

  /* Pemulihan Keluarga Hue Garis Tipis yang Hilang (Missing Distinct Hue Recovery):
     Pada ilustrasi garis tipis multi-warna (terutama di lowWork pratinjau), jika ada keluarga warna kromatik/gelap tegas
     yang terdeteksi di rawPal/best.cents namun belum terwakili di uniq (jarak CIEDE2000 >= 14.5 & bukan campuran linier 2 warna uniq),
     pulihkan agar pratinjau makeJob dan vectorize 100% konsisten! */
  if (opt.colorMode !== 'two' && uniq.length < Kmax) {
    for (const cand of best.cents) {
      if (uniq.length >= Kmax) break;
      if ((cand.count || 0) < 3) continue;
      let minDe00 = Infinity;
      for (const u of uniq) {
        const de = ciede2000(cand.L, cand.a, cand.b2, u.L, u.a, u.b2);
        if (de < minDe00) minDe00 = de;
      }
      if (minDe00 < 14.5) continue;
      let isBlend = false;
      for (let a = 0; a < uniq.length && !isBlend; a++) {
        for (let b = a + 1; b < uniq.length && !isBlend; b++) {
          if (evalColorBlendPair(cand.r, cand.g, cand.b, uniq[a], uniq[b])) isBlend = true;
        }
      }
      if (!isBlend) {
        uniq.push({
          r: Math.round(cand.r), g: Math.round(cand.g), b: Math.round(cand.b),
          L: cand.L, a: cand.a, b2: cand.b2,
          hex: hexOf(cand.r, cand.g, cand.b),
          count: cand.count || 1,
          isGradCluster: false,
          verifiedPlateau: false
        });
      }
    }
  }
  let finalPal = uniq.length ? uniq : best.cents.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), hex: hexOf(c.r, c.g, c.b) }));
  const allowGradUnify = opt.gradientMode === 'on' || (opt.gradientMode !== 'off' && hasSmoothGradient);
  if (opt.maxColorEnabled && opt.maxColors >= 2 && !allowGradUnify && finalPal.length > opt.maxColors) {
    finalPal = capFlatPaletteList(finalPal, opt.maxColors);
  }
  finalPal._isSingleFamilyMultiShade = isSingleFamilyMultiShade;
  finalPal._hasSmoothGradient = hasSmoothGradient;
  return { palette: finalPal, K: finalPal.length, auto: true, bic: best.bic, hasSmoothGradient, isSingleFamilyMultiShade };
}

function detectImageColorPool(work, mask, edgeField = null, maxColors = 28) {
  const samples = sampleInteriorPixels(work, mask, edgeField, 4500);
  if (!samples.length) return ['#000000', '#ffffff'];
  const K = clamp(maxColors, 4, Math.min(28, samples.length));
  const seeds = kmeansPlusPlusSeeds(samples, K);
  const { cents } = kmeansLab(samples, K, seeds, 8);
  const sorted = cents.filter(c => (c.count || 0) > 0).sort((a, b) => (b.count || 0) - (a.count || 0));
  const pool = [];
  for (const c of sorted) {
    const hx = hexOf(c.r, c.g, c.b).toLowerCase();
    const dup = pool.find(u => ((c.L - u.L) ** 2 + (c.a - u.a) ** 2 + (c.b2 - u.b2) ** 2) < 18);
    if (!dup && !pool.some(u => u.hex === hx)) {
      pool.push({ hex: hx, L: c.L, a: c.a, b2: c.b2, count: c.count || 1 });
    }
  }
  return pool.map(p => p.hex);
}

function detectNextImageColor(work, mask, existingHexes = [], poolHexes = []) {
  const norm = existingHexes.map(h => String(h || '').toLowerCase());
  const existLab = norm.map(h => {
    const [r, g, b] = rgbOf(h);
    const [L, a, b2] = rgb2lab(r, g, b);
    return { hex: h, r, g, b, L, a, b2 };
  });

  const minLabDist2 = (L, a, b2) => {
    if (!existLab.length) return Infinity;
    let mn = Infinity;
    for (const e of existLab) {
      const d = (L - e.L) ** 2 + (a - e.a) ** 2 + (b2 - e.b2) ** 2;
      if (d < mn) mn = d;
    }
    return mn;
  };

  for (const thr of [55, 18, 2, 0]) {
    for (const ph of (poolHexes || [])) {
      const h = ph.toLowerCase();
      if (norm.includes(h)) continue;
      const [r, g, b] = rgbOf(h);
      const [L, a, b2] = rgb2lab(r, g, b);
      if (minLabDist2(L, a, b2) >= thr) return h;
    }
  }

  if (work && work.data) {
    const samples = sampleInteriorPixels(work, mask, null, 12000);
    let bestS = null, bestD = -1;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const d = minLabDist2(s.L, s.a, s.b2);
      if (d > bestD) { bestD = d; bestS = s; }
    }
    if (bestS) {
      let sr = 0, sg = 0, sb = 0, cnt = 0;
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const d2 = (s.L - bestS.L) ** 2 + (s.a - bestS.a) ** 2 + (s.b2 - bestS.b2) ** 2;
        if (d2 <= 64) { sr += s.r; sg += s.g; sb += s.b; cnt++; }
      }
      const hx = cnt > 0 ? hexOf(sr / cnt, sg / cnt, sb / cnt).toLowerCase() : hexOf(bestS.r, bestS.g, bestS.b).toLowerCase();
      if (!norm.includes(hx)) return hx;
    }
  }

  return (poolHexes && poolHexes[0]) || '#4f46e5';
}

function analyzeRecommendations(w, h, alpha, cls, autoPaletteHexes, colorPoolHexes) {
  const nAuto = (autoPaletteHexes || []).length;
  const nPool = (colorPoolHexes || []).length;
  const maxDim = Math.max(w, h);
  const adp = buildAdaptiveTraceProfile(cls, w, h, 'auto');

  const recPipe = {
    id: 'auto',
    title: 'Fully Automatic (Adaptive Profile)',
    badge: `Rekomendasi Sistem · ${adp.shortTitle}`,
    reason: `Image Profiler mengenali gambar sebagai ${adp.title} (${cls.effectiveColors || nAuto} warna efektif CIE-Lab, entropi ${cls.colorEntropy || cls.entropy} bit, resolusi ${adp.resBucketLabel}). Racikan adaptif diterapkan otomatis: layer_difference ΔE=${adp.keyParams.layerDifference}, filter_speckle=${adp.keyParams.filterSpeckle}px, smoothing λ=${adp.keyParams.smoothingLambda}, dan bezier_tolerance ε=${adp.keyParams.bezierTolerance}px.`
  };

  const origScale = Math.min(1, 2048 / maxDim);
  const origW = Math.max(16, Math.round(w * origScale));
  const origH = Math.max(16, Math.round(h * origScale));
  const maxOrigDim = Math.max(origW, origH);
  const maxHighDim = Math.min(maxOrigDim, Math.min(1280, Math.max(360, Math.round(maxOrigDim * 0.78))));
  const highScale = Math.min(1, maxHighDim / maxDim);
  const highW = Math.max(16, Math.round(w * highScale));
  const highH = Math.max(16, Math.round(h * highScale));
  const maxMedDim = Math.min(maxHighDim, Math.min(800, Math.max(240, Math.round(maxOrigDim * 0.58))));
  const medScale = Math.min(1, maxMedDim / maxDim);
  const medW = Math.max(16, Math.round(w * medScale));
  const medH = Math.max(16, Math.round(h * medScale));
  const maxLowDim = Math.min(maxMedDim, Math.min(480, Math.max(160, Math.round(maxDim * 0.42))));
  const lowScale = Math.min(1, maxLowDim / maxDim);
  const lowW = Math.max(16, Math.round(w * lowScale));
  const lowH = Math.max(16, Math.round(h * lowScale));

  let recRes;
  if (maxDim > 2200) {
    recRes = {
      id: 'low',
      title: 'Resolusi Rendah',
      reason: `Dimensi asli cukup besar (${w}×${h} px). Resolusi Rendah (${lowW}×${lowH} px) mempercepat komputasi MRF dan menghasilkan kurva yang lebih halus.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  } else if (maxDim > 1650) {
    recRes = {
      id: 'medium',
      title: 'Resolusi Sedang',
      reason: `Dimensi asli cukup besar (${w}×${h} px). Resolusi Sedang (${medW}×${medH} px) memberikan keseimbangan terbaik antara ketajaman detail dan kecepatan MRF.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  } else if (maxDim > 1250) {
    recRes = {
      id: 'high',
      title: 'Resolusi Tinggi',
      reason: `Dimensi gambar (${w}×${h} px) cukup besar. Resolusi Tinggi (${highW}×${highH} px) menjaga ketajaman detail dengan waktu komputasi yang jauh lebih efisien.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  } else {
    recRes = {
      id: 'original',
      title: 'Resolusi Asli',
      reason: `Dimensi gambar (${w}×${h} px) sangat ideal untuk di-trace pada Resolusi Asli guna mempertahankan ketajaman sudut C⁰ dan presisi sub-piksel maksimal.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  }

  let recColor;
  if (nAuto <= 2 || (cls.nColors <= 14 && nAuto <= 2)) {
    recColor = {
      id: 'two',
      title: 'Two Colors',
      reason: `Gambar didominasi 2 warna kontras tinggi (${autoPaletteHexes.slice(0, 2).join(' & ')}). Mode Two Colors menghasilkan pemisahan biner paling tajam.`
    };
  } else if (cls.type === 'photo' && cls.entropy > 5.45 && nPool >= 18) {
    recColor = {
      id: 'unlimited',
      title: 'Unlimited Colors',
      reason: `Fotografi dengan variasi rona kompleks (entropi ${cls.entropy} bit). Unlimited Colors mengalokasikan spektrum warna paling kaya.`
    };
  } else {
    recColor = {
      id: 'auto',
      title: 'Automatic Colors',
      reason: `Sistem mendeteksi ${nAuto} warna utama bersih di ruang CIE-Lab dengan pemangkasan klaster halo anti-aliasing otomatis.`
    };
  }

  const recType = cls.type;
  const recAlpha = 'keep';
  const recQual = cls.quality;
  const recDetail = cls.type === 'photo' ? 'tinggi' : cls.edgeDensity > 0.12 ? 'tinggi' : 'medium';

  return { recPipe, recRes, recColor, recType, recAlpha, recQual, recDetail, adaptiveProfile: adp };
}

