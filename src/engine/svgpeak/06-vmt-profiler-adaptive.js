/* =====================================================================
 * JS Module 06: VMT Engine Part 2 — 8-Stage Multiscale Image Profiler & Adaptive Trace Profile
 * ===================================================================== */
/* =====================================================================
   ARSITEKTUR IMAGE PROFILER 8-TAHAP MULTISKALA & 2-SUMBU STRUKTUR WARNA
   Sesuai Spesifikasi:
   - Tahap 1: Input & Multiskala (Anti-aliased box-area downsampling + full-res micro-detail sampling)
   - Tahap 2: Distribusi Warna (Warna efektif CIE-Lab & CIEDE2000, entropi, persentil Q10/Q25/Q50/Q90 berbobot luas)
   - Tahap 3: Struktur Tepi (Kepadatan tepi, kontras, orientasi dominan, kontinuitas garis, rasio lurus/kurva, junctions di L*a*b*)
   - Tahap 4: Noise & Tekstur (Pemisahan noise sensor/JPEG dari tekstur bermakna, estimasi noise area datar, blockiness 8x8)
   - Tahap 5: Topologi Region (Komponen terhubung, distribusi luas, lubang/holes, rasio perimeter/luas, island kecil)
   - Tahap 6: Gradasi & Nada (Deteksi ramp kontinu monoton di L*, a*, b* vs batas tegas)
   - Tahap 7: Geometri & Stroke (Kelurusan, ketebalan stroke, lebar ujung garis, ketajaman sudut vs ujung membulat)
   - Tahap 8: Resolver & Validasi (Profil berbobot + 6 atribut independen + tingkat keyakinan/confidence)
   ===================================================================== */
function downsampleAreaAverageLab(d, w, h, step) {
  const sw = Math.max(4, Math.floor(w / step));
  const sh = Math.max(4, Math.floor(h / step));
  const n = sw * sh;
  const rArr = new Float32Array(n);
  const gArr = new Float32Array(n);
  const bArr = new Float32Array(n);
  const aArr = new Float32Array(n);
  const LArr = new Float32Array(n);
  const caArr = new Float32Array(n);
  const cbArr = new Float32Array(n);
  const gray = new Float32Array(n);
  const qcol = new Uint16Array(n);

  for (let sy = 0; sy < sh; sy++) {
    const y0 = sy * step, y1 = Math.min(h, y0 + step);
    for (let sx = 0; sx < sw; sx++) {
      const x0 = sx * step, x1 = Math.min(w, x0 + step);
      let sr = 0, sg = 0, sb = 0, sa = 0, cnt = 0, wCnt = 0;
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        for (let x = x0; x < x1; x++) {
          const i = (row + x) * 4;
          const a = d[i + 3];
          sa += a; cnt++;
          if (a >= 32) {
            sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; wCnt++;
          }
        }
      }
      const idx = sy * sw + sx;
      const mr = wCnt > 0 ? sr / wCnt : 0;
      const mg = wCnt > 0 ? sg / wCnt : 0;
      const mb = wCnt > 0 ? sb / wCnt : 0;
      const ma = cnt > 0 ? sa / cnt : 0;
      rArr[idx] = mr; gArr[idx] = mg; bArr[idx] = mb; aArr[idx] = ma;
      gray[idx] = 0.299 * mr + 0.587 * mg + 0.114 * mb;
      qcol[idx] = ((Math.round(mr) >> 4) << 8) | ((Math.round(mg) >> 4) << 4) | (Math.round(mb) >> 4);
      const [L, ca, cb] = rgb2lab(mr, mg, mb);
      LArr[idx] = L; caArr[idx] = ca; cbArr[idx] = cb;
    }
  }
  return { sw, sh, rArr, gArr, bArr, aArr, LArr, caArr, cbArr, gray, qcol, step };
}

function computeWeightedQuantiles(vals, weights) {
  if (!vals || !vals.length) return { q10: 8.0, q25: 10.5, q50: 14.0, q90: 24.0, mean: 14.0 };
  const pairs = vals.map((v, i) => ({ v, w: (weights && weights[i]) || 1 })).sort((a, b) => a.v - b.v);
  let totW = 0, wSum = 0;
  for (const p of pairs) { totW += p.w; wSum += p.v * p.w; }
  if (totW <= 0) return { q10: 8.0, q25: 10.5, q50: 14.0, q90: 24.0, mean: 14.0 };
  const atQ = q => {
    const target = q * totW;
    let acc = 0;
    for (const p of pairs) {
      acc += p.w;
      if (acc >= target) return +p.v.toFixed(2);
    }
    return +pairs[pairs.length - 1].v.toFixed(2);
  };
  return {
    q10: atQ(0.10),
    q25: atQ(0.25),
    q50: atQ(0.50),
    q90: atQ(0.90),
    mean: +(wSum / totW).toFixed(2)
  };
}

/* Analisis Sumbu A (Struktur Keluarga Warna di CIELCh) & Sumbu B (Permukaan Flat vs Gradasi) */
function analyzeColorFamilyStructure(clusters, plateauInfo, gradientContinuity, noiseLevel, totalInteriorPix) {
  const validClusters = (clusters && clusters.length) ? clusters : [];
  const pModes = (plateauInfo && plateauInfo.plateauModes) || [];
  const flatFrac = (plateauInfo && plateauInfo.flatPixelFrac) || 0;
  const gradFrac = (plateauInfo && plateauInfo.gradPixelFrac) || 0;

  let minL = 100, maxL = 0, minC = 200, maxC = 0;
  let cosSum = 0, sinSum = 0, chromaWeightSum = 0;
  const hueBins = [];
  let hasNeutralFamily = false;
  let neutralSupport = 0;
  let totalSupport = 0;

  const sourceList = pModes.length >= 2 ? pModes : validClusters;
  for (const c of sourceList) {
    const L = c.L ?? 50, a = c.a ?? 0, b = c.b2 ?? c.b ?? 0;
    const cnt = c.count || c.cnt || 1;
    totalSupport += cnt;
    const [, C, hDeg] = lab2lch(L, a, b);
    if (L < minL) minL = L;
    if (L > maxL) maxL = L;
    if (C < minC) minC = C;
    if (C > maxC) maxC = C;

    /* Warna hampir netral (C < 9.5) diberi bobot rendah pada sirkular hue & dikelompokkan sebagai akromatik */
    const neutralDamp = C < 9.5 ? (C / 9.5) * 0.18 : 1.0;
    const w = Math.log2(1 + cnt) * Math.pow(Math.max(1, C), 0.85) * neutralDamp;
    const rad = (hDeg * Math.PI) / 180;
    cosSum += Math.cos(rad) * w;
    sinSum += Math.sin(rad) * w;
    chromaWeightSum += w;

    if (C < 9.5 || L <= 14 || L >= 94) {
      hasNeutralFamily = true;
      neutralSupport += cnt;
    } else {
      /* Kelompokkan keluarga warna berdasarkan sudut hue (toleransi ~28 derajat) & chroma */
      let matchedFam = null;
      for (const fam of hueBins) {
        let dHue = Math.abs(hDeg - fam.meanHue);
        if (dHue > 180) dHue = 360 - dHue;
        if (dHue <= 28) { matchedFam = fam; break; }
      }
      if (matchedFam) {
        const nw = matchedFam.weight + cnt;
        const r1 = (matchedFam.meanHue * Math.PI) / 180;
        const mx = Math.cos(r1) * matchedFam.weight + Math.cos(rad) * cnt;
        const my = Math.sin(r1) * matchedFam.weight + Math.sin(rad) * cnt;
        let nh = Math.atan2(my, mx) * (180 / Math.PI);
        if (nh < 0) nh += 360;
        matchedFam.meanHue = nh;
        matchedFam.weight = nw;
        matchedFam.shades++;
      } else {
        hueBins.push({ meanHue: hDeg, weight: cnt, shades: 1 });
      }
    }
  }

  const significantHueFamilies = hueBins.filter(f => f.weight >= Math.max(2, totalSupport * 0.0035));
  const colorFamilyCount = Math.max(1, significantHueFamilies.length + (hasNeutralFamily && (neutralSupport >= totalSupport * 0.04 || significantHueFamilies.length === 0) ? 1 : 0));

  /* Koherensi keluarga warna sirkular CIELCh (0..1): 1 berarti terfokus pada 1 keluarga rona */
  const resultantLen = chromaWeightSum > 1e-5 ? (Math.hypot(cosSum, sinSum) / chromaWeightSum) : 1.0;
  const familyCoherence = significantHueFamilies.length <= 1
    ? clamp(0.78 + resultantLen * 0.22, 0, 1)
    : clamp(resultantLen * (1 / Math.sqrt(significantHueFamilies.length)), 0, 1);

  const shadeLevelCount = Math.max(pModes.length, validClusters.length);
  const lightnessSpread = sourceList.length > 1 ? +(maxL - minL).toFixed(1) : 0;
  const chromaSpread = sourceList.length > 1 ? +(maxC - minC).toFixed(1) : 0;
  const plateauSupport = clamp(flatFrac + (pModes.length >= 2 ? 0.18 : 0), 0, 1);

  /* Estimasi rasio shade semu/noise di dalam keluarga warna */
  const unsupportedClusters = validClusters.filter(c => (c.cnt || c.count || 0) < Math.max(6, totalInteriorPix * 0.0025)).length;
  const familyNoiseRatio = clamp(
    (unsupportedClusters / Math.max(1, validClusters.length)) * 0.55 + noiseLevel * 0.45 * (1 - plateauSupport * 0.6),
    0, 1
  );

  /* Sumbu B: Karakter Permukaan Transisi Warna (flat vs gradient vs mixed) */
  let surfaceMode = 'flat';
  const effGradCont = clamp(gradientContinuity * 0.65 + clamp(gradFrac * 8.5, 0, 1) * 0.35, 0, 1);
  if (effGradCont >= 0.32 || (plateauInfo && plateauInfo.hasSmoothGradient && flatFrac < 0.42)) {
    surfaceMode = 'gradient';
  } else if (effGradCont >= 0.14 || (plateauInfo && plateauInfo.hasSmoothGradient)) {
    surfaceMode = 'mixed';
  } else {
    surfaceMode = 'flat';
  }

  /* Aturan Pengambilan Keputusan Struktur Warna (Sesuai Bagian 5 & Koreksi 2-Sumbu di Markdown) */
  let colorStructureMode = 'MIXED_COLOR_STRUCTURE';
  const isCoherentSingleFamily = (colorFamilyCount <= 2 && familyCoherence >= 0.68) || (plateauInfo && plateauInfo.isSingleFamilyMultiShade);
  if (familyNoiseRatio >= 0.48 && plateauSupport < 0.38) {
    colorStructureMode = 'FAMILY_NOISE';
  } else if (isCoherentSingleFamily && surfaceMode === 'flat' && shadeLevelCount >= 3 && plateauSupport >= 0.35) {
    colorStructureMode = 'DISCRETE_FAMILY_SHADES';
  } else if (isCoherentSingleFamily && (surfaceMode === 'gradient' || effGradCont >= 0.22)) {
    colorStructureMode = 'FAMILY_GRADIENT';
  } else if (!isCoherentSingleFamily && surfaceMode === 'flat') {
    colorStructureMode = 'MULTI_FAMILY_FLAT';
  } else if (!isCoherentSingleFamily && surfaceMode === 'gradient') {
    colorStructureMode = 'MULTI_FAMILY_GRADIENT';
  }

  return {
    colorFamilyCount,
    surfaceMode,
    colorStructureMode,
    familyCoherence: +familyCoherence.toFixed(2),
    shadeLevelCount,
    lightnessSpread,
    chromaSpread,
    plateauSupport: +plateauSupport.toFixed(2),
    gradientContinuity: +effGradCont.toFixed(2),
    familyNoiseRatio: +familyNoiseRatio.toFixed(2)
  };
}

function classifyStage(work, alphaInfo, origW, origH) {
  const { data, w, h } = work, d = data.data;

  /* ---- TAHAP 1 PROFILER: Input & Sampling Multiskala Anti-Aliased + Full-Res Micro Sampling ---- */
  const stepFine = Math.max(1, Math.floor(Math.max(w, h) / 320));
  const stepCoarse = Math.max(stepFine + 1, Math.floor(Math.max(w, h) / 150));
  const scaleFine = downsampleAreaAverageLab(d, w, h, stepFine);
  const scaleCoarse = downsampleAreaAverageLab(d, w, h, stepCoarse);
  const { sw, sh, rArr, gArr, bArr, aArr, LArr, caArr, cbArr, gray, qcol } = scaleFine;

  /* Sampling resolusi penuh (1:1) pada petak pusat & kuadran untuk mendeteksi detail 1-2px yang berisiko hilang */
  let fullResRidges = 0, fullResChecked = 0, fullResFlatNoise = 0, fullResFlatN = 0;
  const patchR = Math.min(48, Math.floor(Math.min(w, h) * 0.22));
  const anchors = [
    [w >> 1, h >> 1],
    [w >> 2, h >> 2],
    [(w * 3) >> 2, h >> 2],
    [w >> 2, (h * 3) >> 2],
    [(w * 3) >> 2, (h * 3) >> 2]
  ];
  for (const [ax, ay] of anchors) {
    const x0 = clamp(ax - patchR, 1, w - 2), x1 = clamp(ax + patchR, 1, w - 2);
    const y0 = clamp(ay - patchR, 1, h - 2), y1 = clamp(ay + patchR, 1, h - 2);
    for (let y = y0; y <= y1; y += 2) {
      const row = y * w;
      for (let x = x0; x <= x1; x += 2) {
        const p = row + x, i = p * 4;
        if (d[i + 3] < 64) continue;
        fullResChecked++;
        const l0 = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const lL = 0.299 * d[i - 4] + 0.587 * d[i - 3] + 0.114 * d[i - 2];
        const lR = 0.299 * d[i + 4] + 0.587 * d[i + 5] + 0.114 * d[i + 6];
        const lU = 0.299 * d[i - w * 4] + 0.587 * d[i - w * 4 + 1] + 0.114 * d[i - w * 4 + 2];
        const lD = 0.299 * d[i + w * 4] + 0.587 * d[i + w * 4 + 1] + 0.114 * d[i + w * 4 + 2];
        const g1 = Math.hypot(lR - lL, lD - lU) * 0.5;
        const lap = Math.abs(4 * l0 - lL - lR - lU - lD);
        if (g1 < 5.5) { fullResFlatNoise += lap; fullResFlatN++; }
        const ridgeH = (l0 > lL + 9 && l0 > lR + 9) || (l0 < lL - 9 && l0 < lR - 9);
        const ridgeV = (l0 > lU + 9 && l0 > lD + 9) || (l0 < lU - 9 && l0 < lD - 9);
        if (ridgeH || ridgeV) fullResRidges++;
      }
    }
  }

  /* ---- TAHAP 3, 4 & 6 PROFILER: Struktur Tepi (L*a*b*), Noise vs Detail Nyata & Gradasi Multiskala ---- */
  let edgeCnt = 0, sumGrad = 0, lapEnergy = 0, lapCnt = 0;
  let tSame = 0, tBlend = 0, tSharp = 0, tTot = 0;
  let gradContCnt = 0, nonFlatCnt = 0, microRidgeCnt = 0, coherentRidgeCnt = 0, sharpStepEdgeCnt = 0;
  let axisAlignedEdgeCnt = 0, collinearEdgeCnt = 0, curvedAnalyticEdgeCnt = 0, junctionCandCnt = 0;
  const interiorBins = new Uint32Array(4096);
  const binSumR = new Float64Array(4096), binSumG = new Float64Array(4096), binSumB = new Float64Array(4096);
  let interiorTotal = 0;

  const atG = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : gray[y * sw + x];
  const atL = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : LArr[y * sw + x];
  const atA = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : caArr[y * sw + x];
  const atB = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : cbArr[y * sw + x];

  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const idx0 = y * sw + x;
      if (aArr[idx0] < 64) continue;

      /* Gradien Scharr pada Luminansi + Krominansi CIE a* dan b* */
      const gxL = -3 * atG(x - 1, y - 1) - 10 * atG(x - 1, y) - 3 * atG(x - 1, y + 1)
                  + 3 * atG(x + 1, y - 1) + 10 * atG(x + 1, y) + 3 * atG(x + 1, y + 1);
      const gyL = -3 * atG(x - 1, y - 1) - 10 * atG(x, y - 1) - 3 * atG(x + 1, y - 1)
                  + 3 * atG(x - 1, y + 1) + 10 * atG(x, y + 1) + 3 * atG(x + 1, y + 1);
      const gxA = (atA(x + 1, y) - atA(x - 1, y)) * 8.5;
      const gyA = (atA(x, y + 1) - atA(x, y - 1)) * 8.5;
      const gxB = (atB(x + 1, y) - atB(x - 1, y)) * 8.5;
      const gyB = (atB(x, y + 1) - atB(x, y - 1)) * 8.5;

      const gmL = Math.hypot(gxL, gyL) / 8;
      const gmC = Math.hypot(gxA, gyA, gxB, gyB) / 8;
      const gm = Math.max(gmL, gmC * 0.85);
      sumGrad += gm;

      if (gm > 32) {
        edgeCnt++;
        const rawAngRad = Math.atan2(gyL, gxL);
        const ang = Math.abs(rawAngRad * (180 / Math.PI)) % 90;
        if (ang <= 11 || ang >= 79) axisAlignedEdgeCnt++;
        if (Math.abs(gxL) > 95 && Math.abs(gyL) > 95) junctionCandCnt++;
        /* Deteksi Busur Analitik Berkelengkungan Konstan (Constant-Curvature Circular/Elliptical Arc Invariant) */
        const tx = -Math.sin(rawAngRad), ty = Math.cos(rawAngRad);
        const xM1 = clamp(Math.round(x - tx), 1, sw - 2), yM1 = clamp(Math.round(y - ty), 1, sh - 2);
        const xP1 = clamp(Math.round(x + tx), 1, sw - 2), yP1 = clamp(Math.round(y + ty), 1, sh - 2);
        if ((xM1 !== x || yM1 !== y) && (xP1 !== x || yP1 !== y)) {
          const gxM = atG(xM1 + 1, yM1) - atG(xM1 - 1, yM1), gyM = atG(xM1, yM1 + 1) - atG(xM1, yM1 - 1);
          const gxP = atG(xP1 + 1, yP1) - atG(xP1 - 1, yP1), gyP = atG(xP1, yP1 + 1) - atG(xP1, yP1 - 1);
          if (Math.hypot(gxM, gyM) > 12 && Math.hypot(gxP, gyP) > 12) {
            const aM = Math.atan2(gyM, gxM), aP = Math.atan2(gyP, gxP);
            const wrapRad = r => Math.atan2(Math.sin(r), Math.cos(r));
            const d1 = wrapRad(rawAngRad - aM), d2 = wrapRad(aP - rawAngRad);
            const meanK = 0.5 * Math.abs(d1 + d2);
            const diffK = Math.abs(d1 - d2);
            if (meanK < 0.034 && diffK <= 0.075 && Math.abs(d1) <= 0.055 && Math.abs(d2) <= 0.055) {
              collinearEdgeCnt++;
            } else if (meanK >= 0.034 && meanK <= 0.52 && diffK <= 0.16 && d1 * d2 >= -0.002) {
              curvedAnalyticEdgeCnt++;
            }
          }
        }
      }
      if (gm > 50) sharpStepEdgeCnt++;

      const lapL = Math.abs(4 * atL(x, y) - atL(x - 1, y) - atL(x + 1, y) - atL(x, y - 1) - atL(x, y + 1));
      const lapA = Math.abs(4 * atA(x, y) - atA(x - 1, y) - atA(x + 1, y) - atA(x, y - 1) - atA(x, y + 1));
      const lapB = Math.abs(4 * atB(x, y) - atB(x - 1, y) - atB(x + 1, y) - atB(x, y - 1) - atB(x, y + 1));
      const lap = Math.abs(4 * atG(x, y) - atG(x - 1, y) - atG(x + 1, y) - atG(x, y - 1) - atG(x, y + 1));
      const lapLab = Math.hypot(lapL, lapA * 0.8, lapB * 0.8);

      if (gm < 11) {
        lapEnergy += lap; lapCnt++;
        const isSmoothSlope = gm <= 10.5 && lapLab <= Math.max(1.35, Math.hypot(atL(x + 1, y) - atL(x - 1, y), atA(x + 1, y) - atA(x - 1, y), atB(x + 1, y) - atB(x - 1, y)) * 0.62);
        if ((gm < 4.8 && lap < 5.2 && lapLab < 4.5) || isSmoothSlope) {
          const b = qcol[idx0];
          interiorBins[b]++;
          binSumR[b] += rArr[idx0];
          binSumG[b] += gArr[idx0];
          binSumB[b] += bArr[idx0];
          interiorTotal++;
        }
      }

      /* Deteksi Gradasi & Nada di L*, a*, b*: perubahan monoton & turunan ke-2 rendah (abaikan derau kuantisasi JPEG 1-2 LSB) */
      const dLabH = Math.hypot(atL(x + 1, y) - atL(x - 1, y), atA(x + 1, y) - atA(x - 1, y), atB(x + 1, y) - atB(x - 1, y)) * 0.5;
      const dLabV = Math.hypot(atL(x, y + 1) - atL(x, y - 1), atA(x, y + 1) - atA(x, y - 1), atB(x, y + 1) - atB(x, y - 1)) * 0.5;
      const gmLab = Math.hypot(dLabH, dLabV);
      if (gm >= 1.15 || gmLab >= 0.85) {
        nonFlatCnt++;
        const monoH = (atL(x - 1, y) <= atL(x, y) + 0.35 && atL(x, y) <= atL(x + 1, y) + 0.35) ||
                      (atL(x - 1, y) >= atL(x, y) - 0.35 && atL(x, y) >= atL(x + 1, y) - 0.35) ||
                      (atA(x - 1, y) <= atA(x, y) + 0.35 && atA(x, y) <= atA(x + 1, y) + 0.35);
        const monoV = (atL(x, y - 1) <= atL(x, y) + 0.35 && atL(x, y) <= atL(x, y + 1) + 0.35) ||
                      (atL(x, y - 1) >= atL(x, y) - 0.35 && atL(x, y) >= atL(x, y + 1) - 0.35) ||
                      (atB(x, y - 1) <= atB(x, y) + 0.35 && atB(x, y) <= atB(x, y + 1) + 0.35);
        if (gm <= 16.5 && lapLab <= Math.max(0.85, gmLab * 0.72) && (monoH || monoV)) gradContCnt++;
      }

      /* Deteksi Detail Mikro (L* + Chroma a*b*) & Verifikasi Koherensi Garis Tangensial (bukan sekadar bintik noise) */
      const g0 = atG(x, y), a0 = atA(x, y), b0 = atB(x, y);
      const dChromaH = Math.hypot(a0 - atA(x - 1, y), b0 - atB(x - 1, y)) + Math.hypot(a0 - atA(x + 1, y), b0 - atB(x + 1, y));
      const dChromaV = Math.hypot(a0 - atA(x, y - 1), b0 - atB(x, y - 1)) + Math.hypot(a0 - atA(x, y + 1), b0 - atB(x, y + 1));
      const extrH = (g0 > atG(x - 1, y) + 9 && g0 > atG(x + 1, y) + 9) || (g0 < atG(x - 1, y) - 9 && g0 < atG(x + 1, y) - 9) || dChromaH > 18;
      const extrV = (g0 > atG(x, y - 1) + 9 && g0 > atG(x, y + 1) + 9) || (g0 < atG(x, y - 1) - 9 && g0 < atG(x, y + 1) - 9) || dChromaV > 18;
      if (extrH || extrV) {
        microRidgeCnt++;
        /* Cek apakah punggung ridge berlanjut ke tetangga tangensial (detail nyata vs bintik noise terisolasi) */
        const tangContH = extrH && (Math.abs(g0 - atG(x, y - 1)) < 7.5 || Math.abs(g0 - atG(x, y + 1)) < 7.5);
        const tangContV = extrV && (Math.abs(g0 - atG(x - 1, y)) < 7.5 || Math.abs(g0 - atG(x + 1, y)) < 7.5);
        if (tangContH || tangContV) coherentRidgeCnt++;
      }

      /* Matriks Ko-okurensi Warna (CCM) 4-arah */
      const c0 = qcol[idx0];
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || xx >= sw || yy < 0 || yy >= sh) continue;
        const c1 = qcol[yy * sw + xx];
        if (c1 === c0) tSame++;
        else {
          const dr = ((c0 >> 8) & 15) - ((c1 >> 8) & 15);
          const dg = ((c0 >> 4) & 15) - ((c1 >> 4) & 15);
          const db = (c0 & 15) - (c1 & 15);
          const dd = dr * dr + dg * dg + db * db;
          const g1 = atG(xx, yy), gPrev = atG(x - dx, y - dy);
          const isRamp = (g0 > Math.min(gPrev, g1) + 4 && g0 < Math.max(gPrev, g1) - 4);
          if (dd <= 45 || isRamp) tBlend++; else tSharp++;
        }
        tTot++;
      }
    }
  }

  /* Konsistensi gradien pada skala kasar (multiscale consistency) */
  let coarseGradCnt = 0, coarseNonFlat = 0;
  const csw = scaleCoarse.sw, csh = scaleCoarse.sh;
  for (let y = 1; y < csh - 1; y++) {
    for (let x = 1; x < csw - 1; x++) {
      const i0 = y * csw + x;
      if (scaleCoarse.aArr[i0] < 64) continue;
      const dLx = scaleCoarse.LArr[i0 + 1] - scaleCoarse.LArr[i0 - 1];
      const dLy = scaleCoarse.LArr[i0 + csw] - scaleCoarse.LArr[i0 - csw];
      const gmC = Math.hypot(dLx, dLy) * 0.5;
      if (gmC >= 1.0) {
        coarseNonFlat++;
        const lapC = Math.abs(4 * scaleCoarse.LArr[i0] - scaleCoarse.LArr[i0 - 1] - scaleCoarse.LArr[i0 + 1] - scaleCoarse.LArr[i0 - csw] - scaleCoarse.LArr[i0 + csw]);
        if (gmC <= 14.0 && lapC < gmC * 0.78) coarseGradCnt++;
      }
    }
  }
  const coarseGradCont = coarseNonFlat > 8 ? clamp(coarseGradCnt / coarseNonFlat, 0, 1) : 0;

  const totalPix = Math.max(1, sw * sh);
  const edgeDensity = edgeCnt / totalPix;
  const noiseE = lapCnt ? (lapEnergy / lapCnt) * 0.7 + (fullResFlatN ? (fullResFlatNoise / fullResFlatN) * 0.3 : 0) : 0;
  const tEdge = Math.max(1, tBlend + tSharp);
  const blendFrac = tBlend / tEdge;
  const sharpFrac = tSharp / tEdge;
  const edgeSharpness = clamp((sharpStepEdgeCnt / Math.max(1, edgeCnt)) * 0.65 + sharpFrac * 0.35, 0, 1);
  const fineGradCont = nonFlatCnt > 8 ? clamp(gradContCnt / nonFlatCnt, 0, 1) : 0;
  let gradientContinuity = clamp(fineGradCont * 0.62 + coarseGradCont * 0.38, 0, 1);

  /* Detektor artefak blok DCT 8x8 murni */
  let blk = 0, blkN = 0, noblk = 0, noblkN = 0;
  for (let y = 8; y < sh - 8; y += 2) {
    for (let x = 8; x < sw - 8; x += 2) {
      const g = Math.abs(atG(x + 1, y) - atG(x, y)) + Math.abs(atG(x, y + 1) - atG(x, y));
      if (g < 0.35 || g > 16.0) continue;
      if (x % 8 === 0 || y % 8 === 0) { blk += g; blkN++; } else { noblk += g; noblkN++; }
    }
  }
  const blockiness = (blkN >= 16 && noblkN >= 32) ? (blk / blkN) / Math.max(0.5, noblk / noblkN) : 1;
  const deg = noiseE / 9 + Math.max(0, blockiness - 1.12) * 1.35;
  const quality = deg < 0.85 ? 'high' : deg < 1.95 ? 'medium' : 'low';
  const noiseLevel = clamp(deg / 3, 0, 1);

  /* Pemisahan Tegas: meaningfulDetailDensity vs microDetailDensity vs noiseLevel */
  const rawMicroDens = clamp(((microRidgeCnt / totalPix) * 0.65 + (fullResChecked ? (fullResRidges / fullResChecked) * 0.35 : 0)) * 6.8, 0, 1);
  const coherenceRatio = microRidgeCnt > 0 ? clamp(coherentRidgeCnt / microRidgeCnt, 0, 1) : 0.5;
  const meaningfulDetailDensity = clamp(rawMicroDens * (0.35 + 0.65 * coherenceRatio) * (1 - noiseLevel * 0.42), 0, 1);
  const microDetailDensity = meaningfulDetailDensity;

  const hist = new Float64Array(64);
  let hp = 0;
  for (let i = 0; i < gray.length; i++) {
    if (aArr[i] < 64) continue;
    hist[clamp(gray[i] / 4 | 0, 0, 63)]++; hp++;
  }
  let entropy = 0;
  if (hp > 0) {
    for (let i = 0; i < 64; i++) if (hist[i] > 0) { const p = hist[i] / hp; entropy -= p * Math.log2(p); }
  }

  /* ---- TAHAP 2 PROFILER: Distribusi Warna, CIEDE2000 & Persentil Q10/Q25/Q50/Q90 ---- */
  let colorEntropy = 0;
  const activeBins = [];
  const minBinSupport = Math.max(2, Math.floor(interiorTotal * 0.00045));
  for (let b = 0; b < 4096; b++) {
    const cnt = interiorBins[b];
    if (cnt > 0 && interiorTotal > 0) {
      const p = cnt / interiorTotal;
      colorEntropy -= p * Math.log2(p);
    }
    if (cnt >= minBinSupport) {
      const mr = binSumR[b] / cnt, mg = binSumG[b] / cnt, mb = binSumB[b] / cnt;
      const [L, ca, cb] = rgb2lab(mr, mg, mb);
      activeBins.push({ r: mr, g: mg, b: mb, L, a: ca, b2: cb, cnt });
    }
  }
  activeBins.sort((x, y) => y.cnt - x.cnt);

  /* Klasterisasi Peak-First Non-Chaining menggunakan jarak perseptual CIEDE2000 (ΔE00 <= 4.2) */
  const effClusters = [];
  for (const ab of activeBins) {
    let merged = false;
    for (const ec of effClusters) {
      const de00 = ciede2000(ab.L, ab.a, ab.b2, ec.L0, ec.a0, ec.b0);
      if (de00 <= 4.2) {
        const wTot = ec.cnt + ab.cnt;
        ec.r = (ec.r * ec.cnt + ab.r * ab.cnt) / wTot;
        ec.g = (ec.g * ec.cnt + ab.g * ab.cnt) / wTot;
        ec.b = (ec.b * ec.cnt + ab.b * ab.cnt) / wTot;
        ec.L = (ec.L * ec.cnt + ab.L * ab.cnt) / wTot;
        ec.a = (ec.a * ec.cnt + ab.a * ab.cnt) / wTot;
        ec.b2 = (ec.b2 * ec.cnt + ab.b2 * ab.cnt) / wTot;
        ec.cnt = wTot;
        merged = true;
        break;
      }
    }
    if (!merged) effClusters.push({ ...ab, L0: ab.L, a0: ab.a, b0: ab.b2 });
  }
  /* Integrasikan mode plateau datar terverifikasi dari analyzeColorPlateausAndGradients di hulu
     agar effectiveColors dan persentil CIEDE2000 (Q10..Q90) mencerminkan seluruh shade/warna valid */
  const plateauInfo = analyzeColorPlateausAndGradients(work, null, null);
  if (plateauInfo && plateauInfo.hasSmoothGradient) {
    gradientContinuity = clamp(Math.max(gradientContinuity, clamp(plateauInfo.gradPixelFrac * 6.5, 0.28, 0.92)), 0, 1);
  } else if (plateauInfo && !plateauInfo.hasSmoothGradient && (plateauInfo.flatPixelFrac >= 0.28 || ((plateauInfo.plateauModes || []).length >= 10 && plateauInfo.gradPixelFrac < 0.035))) {
    gradientContinuity = Math.min(gradientContinuity * 0.22, 0.07);
  } else if (plateauInfo && plateauInfo.flatPixelFrac < 0.22 && edgeSharpness < 0.32 && plateauInfo.gradPixelFrac >= 0.035) {
    gradientContinuity = clamp(Math.max(gradientContinuity, (1 - plateauInfo.flatPixelFrac) * 0.55), 0, 1);
  }
  for (const pm of (plateauInfo.plateauModes || [])) {
    let exists = false;
    for (const ec of effClusters) {
      if (ciede2000(pm.L, pm.a, pm.b2, ec.L, ec.a, ec.b2) <= 3.2) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      effClusters.push({ r: pm.r, g: pm.g, b: pm.b, L: pm.L, a: pm.a, b2: pm.b2, L0: pm.L, a0: pm.a, b0: pm.b2, cnt: Math.max(4, Math.round(pm.count / Math.max(1, stepFine * stepFine))) });
    }
  }
  /* Jika gambar datar murni (!hasSmoothGradient) memiliki mode plateau kuat, bersihkan effClusters dari artefak campuran AA */
  if (plateauInfo && !plateauInfo.hasSmoothGradient && plateauInfo.flatPixelFrac >= 0.45 && (plateauInfo.plateauModes || []).length >= 2) {
    const pModes = plateauInfo.plateauModes;
    for (let i = effClusters.length - 1; i >= 0; i--) {
      const ec = effClusters[i];
      const isPM = pModes.some(pm => ciede2000(ec.L, ec.a, ec.b2, pm.L, pm.a, pm.b2) <= 3.8);
      if (!isPM && ec.cnt < interiorTotal * 0.025) {
        let blended = false;
        for (let a = 0; a < pModes.length && !blended; a++) {
          for (let b = a + 1; b < pModes.length && !blended; b++) {
            if (evalColorBlendPair(ec.r, ec.g, ec.b, pModes[a], pModes[b])) blended = true;
          }
        }
        if (blended && effClusters.length > pModes.length) effClusters.splice(i, 1);
      }
    }
  }
  const effectiveColors = Math.max(2, effClusters.length, (plateauInfo.plateauModes || []).length);
  const dominantClusters = effClusters.filter(c => c.cnt >= Math.max(4, interiorTotal * 0.012));
  const minorClusters = effClusters.filter(c => c.cnt < Math.max(4, interiorTotal * 0.012));

  /* Hitung distribusi persentil jarak warna terdekat (Q10, Q25, Q50, Q90) di ΔE76 dan CIEDE2000 berbobot luas */
  const nearDE76List = [], nearDE00List = [], clusterWeights = [];
  for (let i = 0; i < Math.min(32, effClusters.length); i++) {
    let mn76 = Infinity, mn00 = Infinity;
    for (let j = 0; j < effClusters.length; j++) {
      if (i === j) continue;
      const d76 = Math.hypot(effClusters[i].L - effClusters[j].L, effClusters[i].a - effClusters[j].a, effClusters[i].b2 - effClusters[j].b2);
      const d00 = ciede2000(effClusters[i].L, effClusters[i].a, effClusters[i].b2, effClusters[j].L, effClusters[j].a, effClusters[j].b2);
      if (d76 < mn76) mn76 = d76;
      if (d00 < mn00) mn00 = d00;
    }
    if (mn76 < Infinity) {
      nearDE76List.push(mn76);
      nearDE00List.push(mn00);
      clusterWeights.push(Math.sqrt(effClusters[i].cnt || 1));
    }
  }
  const de76Quantiles = computeWeightedQuantiles(nearDE76List, clusterWeights);
  const de00Quantiles = computeWeightedQuantiles(nearDE00List, clusterWeights);
  const meanNearestDeltaE = de76Quantiles.mean;
  const meanNearestDeltaE00 = de00Quantiles.mean;

  /* Hitung jumlah warna unik sesungguhnya dari gambar kerja (bukan sekadar kali 2) */
  const fullSeen = new Set();
  const rawStep = Math.max(1, Math.floor((w * h) / 48000));
  for (let p = 0; p < w * h; p += rawStep) {
    const i = p * 4;
    if (d[i + 3] >= 64) fullSeen.add(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3));
  }
  const nColors = Math.max(effectiveColors, fullSeen.size);

  /* ---- TAHAP 5 & 7 PROFILER: Topologi Region, Ketebalan Stroke, Kelurusan & Analisis Plateau Hulu ---- */
  const familyColorProfile = analyzeColorFamilyStructure(effClusters, plateauInfo, gradientContinuity, noiseLevel, interiorTotal);

  /* Estimasi cepat topologi komponen pada kisi kasar (sw x sh) */
  const compSeen = new Uint8Array(sw * sh);
  let compCount = 0, smallIslandCount = 0, straightEdgeRatio = clamp(Math.max(axisAlignedEdgeCnt, collinearEdgeCnt * 0.90) / Math.max(1, edgeCnt), 0, 1);
  const circularArcRatio = clamp(curvedAnalyticEdgeCnt / Math.max(1, edgeCnt), 0, 1);
  const analyticGeometryRatio = clamp(Math.max(straightEdgeRatio, straightEdgeRatio * 0.65 + circularArcRatio * 0.88), 0, 1);
  const bfsQ = new Int32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    if (compSeen[i] || aArr[i] < 64) continue;
    compCount++;
    const c0 = qcol[i];
    let head = 0, tail = 0;
    bfsQ[tail++] = i; compSeen[i] = 1;
    while (head < tail) {
      const q = bfsQ[head++], qx = q % sw, qy = (q / sw) | 0;
      const nbs = [qx > 0 ? q - 1 : -1, qx < sw - 1 ? q + 1 : -1, qy > 0 ? q - sw : -1, qy < sh - 1 ? q + sw : -1];
      for (const nq of nbs) {
        if (nq >= 0 && !compSeen[nq] && aArr[nq] >= 64 && qcol[nq] === c0) {
          compSeen[nq] = 1; bfsQ[tail++] = nq;
        }
      }
    }
    if (tail <= 3) smallIslandCount++;
  }
  const islandRatio = clamp(smallIslandCount / Math.max(1, compCount), 0, 1);
  const junctionDensity = clamp(junctionCandCnt / Math.max(1, edgeCnt), 0, 1);

  /* ---- TAHAP 8 PROFILER: Weighted Profile Router & 6 Independent Adaptive Attributes ---- */
  const hasSemiAlpha = alphaInfo && alphaInfo.semiFrac > 0.002;
  /* Deteksi Ilustrasi Anime / Digital Painting dengan Line-Art Koheren & Gradasi Halus:
     Memiliki kepadatan detail garis nyata tinggi (meaningfulDetailDensity >= 0.28),
     koherensi punggung garis tinggi (coherenceRatio >= 0.45), dan derau rendah (noiseLevel <= 0.22) */
  const isShadedIllustration = (
    meaningfulDetailDensity >= 0.28 &&
    edgeDensity >= 0.16 &&
    noiseLevel <= 0.22 &&
    coherenceRatio >= 0.45 &&
    (plateauInfo.flatPixelFrac >= 0.10 || edgeSharpness >= 0.18)
  );
  const sPhoto = (entropy > 5.15 ? 2 : 0) + (effectiveColors > 36 && familyColorProfile.surfaceMode !== 'flat' ? 2 : 0) + (gradientContinuity > 0.28 ? 1.5 : 0) - (isShadedIllustration ? 2.2 : 0);
  const sAliased = (!hasSemiAlpha && blendFrac < 0.08 && effectiveColors <= 16 && nColors <= 48 ? 3 : 0) + (sharpFrac > 0.92 ? 2 : 0);
  const sBlended = (hasSemiAlpha || blendFrac >= 0.08 ? 3 : 1) + (entropy <= 5.4 ? 1 : 0) + (familyColorProfile.surfaceMode === 'flat' ? 1.5 : 0) + (isShadedIllustration ? 2.0 : 0);

  let type;
  if (!isShadedIllustration && sPhoto >= sAliased && sPhoto >= sBlended && sPhoto >= 3.2 && familyColorProfile.surfaceMode !== 'flat') type = 'photo';
  else if (sAliased > sBlended) type = 'aliased';
  else type = 'blended';

  /* Hitung Bobot Kontinu (0..1) untuk Flat, Illustration, dan Photo (Weighted Profile Router) */
  let rawWFlat = clamp(
    (familyColorProfile.surfaceMode === 'flat' ? 0.45 : 0.10) +
    (effectiveColors <= 16 ? 0.28 : effectiveColors <= 26 ? 0.14 : 0.04) +
    edgeSharpness * 0.22 +
    analyticGeometryRatio * 0.22 -
    gradientContinuity * 0.35,
    0.05, 1.0
  );
  let rawWIllus = clamp(
    0.32 +
    (familyColorProfile.colorStructureMode === 'MULTI_FAMILY_FLAT' || familyColorProfile.colorStructureMode === 'DISCRETE_FAMILY_SHADES' ? 0.32 : 0.14) +
    meaningfulDetailDensity * 0.32 +
    (isShadedIllustration ? 0.28 : 0) +
    (1 - Math.abs(gradientContinuity - 0.22)) * 0.18,
    0.08, 1.0
  );
  let rawWPhoto = clamp(
    (familyColorProfile.surfaceMode === 'gradient' ? 0.42 : familyColorProfile.surfaceMode === 'mixed' ? 0.22 : 0.04) +
    gradientContinuity * 0.38 +
    (entropy > 5.0 ? (entropy - 4.8) * 0.25 : 0) -
    (familyColorProfile.surfaceMode === 'flat' ? 0.35 : 0) -
    (isShadedIllustration ? 0.28 : 0),
    0.02, 1.0
  );

  /* Koreksi Penting: Desain geometris flat (baik berbasis garis lurus maupun busur lingkaran/Truchet)
     serta ilustrasi flat dengan plateau kuat harus diarahkan secara akurat */
  if (familyColorProfile.surfaceMode === 'flat' && (plateauInfo.flatPixelFrac >= 0.32 || (!plateauInfo.hasSmoothGradient && dominantClusters.length <= 4 && analyticGeometryRatio >= 0.40))) {
    rawWPhoto *= 0.25;
    if (effectiveColors <= 14 && (straightEdgeRatio >= 0.22 || (analyticGeometryRatio >= 0.38 && gradientContinuity <= 0.06 && plateauInfo.flatPixelFrac >= 0.55))) {
      rawWFlat += 0.42;
      rawWIllus *= 0.62;
    } else {
      rawWIllus += 0.28;
    }
  } else if (isShadedIllustration) {
    rawWPhoto *= 0.36;
    rawWIllus += 0.35;
  } else if (type !== 'photo' && plateauInfo.flatPixelFrac >= 0.25 && entropy < 5.1) {
    rawWPhoto *= 0.42;
    rawWIllus += 0.30;
  }

  const wSum = rawWFlat + rawWIllus + rawWPhoto || 1;
  const profileWeights = {
    flat: +(rawWFlat / wSum).toFixed(3),
    illustration: +(rawWIllus / wSum).toFixed(3),
    photo: +(rawWPhoto / wSum).toFixed(3)
  };

  const sortedW = [
    ['flat', profileWeights.flat],
    ['illustration', profileWeights.illustration],
    ['photo', profileWeights.photo]
  ].sort((a, b) => b[1] - a[1]);
  const profileId = sortedW[0][0];
  const confidence = +clamp(0.52 + (sortedW[0][1] - sortedW[1][1]) * 0.95, 0.45, 0.99).toFixed(2);

  /* Enam Atribut Adaptif Independen (0..1) sesuai Bagian 3.C Markdown */
  const adaptiveAttributes = {
    geometryPriority: +clamp(edgeSharpness * 0.42 + analyticGeometryRatio * 0.36 + profileWeights.flat * 0.28, 0.10, 0.98).toFixed(2),
    detailProtection: +clamp(meaningfulDetailDensity * 0.55 + (1 - noiseLevel) * 0.20 + (familyColorProfile.colorStructureMode === 'DISCRETE_FAMILY_SHADES' ? 0.25 : 0.10), 0.15, 0.98).toFixed(2),
    noiseSuppression: +clamp(noiseLevel * 0.65 + (familyColorProfile.colorStructureMode === 'FAMILY_NOISE' ? 0.28 : 0) + (islandRatio > 0.35 ? 0.15 : 0), 0.05, 0.96).toFixed(2),
    gradientPreservation: +clamp(familyColorProfile.gradientContinuity * 0.60 + (familyColorProfile.surfaceMode !== 'flat' ? 0.28 : 0) + (familyColorProfile.isSingleFamilyMultiShade || familyColorProfile.colorStructureMode === 'DISCRETE_FAMILY_SHADES' ? 0.25 : 0), 0.05, 0.98).toFixed(2),
    alphaSensitivity: +clamp((alphaInfo && alphaInfo.hasAlpha ? 0.65 : 0.10) + (alphaInfo && alphaInfo.semiFrac > 0.005 ? 0.30 : 0), 0.08, 0.98).toFixed(2),
    topologyProtection: +clamp(0.45 + junctionDensity * 0.30 + meaningfulDetailDensity * 0.25, 0.25, 0.98).toFixed(2)
  };

  const maxSide = Math.max(origW || w, origH || h);
  const resBucket = maxSide <= 512 ? 'small' : maxSide <= 1500 ? 'medium' : maxSide <= 3000 ? 'large' : 'uhd';

  /* Ringkasan 8 Tahap Image Profiler untuk Diagnostik UI */
  const profiler8Stages = [
    { stage: '1. Input & Multiskala', val: `${w}×${h} px (Skala 1:${stepFine} & 1:${stepCoarse})`, desc: `Alpha ${alphaInfo && alphaInfo.hasAlpha ? Math.round(alphaInfo.transparentFrac * 100) + '%' : 'Opaque'} · Full-res patch aktif` },
    { stage: '2. Distribusi Warna', val: `${effectiveColors} Efektif (${dominantClusters.length} Dom / ${minorClusters.length} Minor)`, desc: `ΔE00 Q25=${de00Quantiles.q25} · Q50=${de00Quantiles.q50} · Q90=${de00Quantiles.q90}` },
    { stage: '3. Struktur Tepi', val: `Ketajaman ${Math.round(edgeSharpness * 100)}% · Kepadatan ${(edgeDensity * 100).toFixed(1)}%`, desc: `Lurus ${Math.round(straightEdgeRatio * 100)}% · Simpang ${Math.round(junctionDensity * 100)}%` },
    { stage: '4. Noise & Tekstur', val: `Noise ${Math.round(noiseLevel * 100)}% · Blok JPEG ${blockiness.toFixed(2)}×`, desc: `Detail Nyata ${Math.round(meaningfulDetailDensity * 100)}% (Koherensi ${Math.round(coherenceRatio * 100)}%)` },
    { stage: '5. Topologi Region', val: `${compCount} Komponen · Island ${(islandRatio * 100).toFixed(0)}%`, desc: `${plateauInfo.plateauModes.length} Plateau Solid (${Math.round(plateauInfo.flatPixelFrac * 100)}% area)` },
    { stage: '6. Gradasi & Nada', val: `Permukaan: ${familyColorProfile.surfaceMode.toUpperCase()}`, desc: `Kontinuitas L*a*b* ${Math.round(gradientContinuity * 100)}% · ${familyColorProfile.colorStructureMode}` },
    { stage: '7. Geometri & Stroke', val: `Prioritas Geometri ${Math.round(adaptiveAttributes.geometryPriority * 100)}%`, desc: `Proteksi Detail ${Math.round(adaptiveAttributes.detailProtection * 100)}% · Topologi ${Math.round(adaptiveAttributes.topologyProtection * 100)}%` },
    { stage: '8. Resolver & Validasi', val: `Keyakinan ${Math.round(confidence * 100)}% (${profileId.toUpperCase()})`, desc: `Bobot A:${Math.round(profileWeights.flat * 100)}% B:${Math.round(profileWeights.illustration * 100)}% C:${Math.round(profileWeights.photo * 100)}%` }
  ];

  return {
    type, quality, noise: +noiseLevel.toFixed(2), edgeDensity: +edgeDensity.toFixed(3),
    blendFrac, sharpFrac, edgeSharpness: +edgeSharpness.toFixed(2),
    gradientContinuity: +gradientContinuity.toFixed(2),
    microDetailDensity: +microDetailDensity.toFixed(2),
    meaningfulDetailDensity: +meaningfulDetailDensity.toFixed(2),
    coherenceRatio: +coherenceRatio.toFixed(2),
    straightEdgeRatio: +straightEdgeRatio.toFixed(2),
    circularArcRatio: +circularArcRatio.toFixed(2),
    analyticGeometryRatio: +analyticGeometryRatio.toFixed(2),
    junctionDensity: +junctionDensity.toFixed(2),
    islandRatio: +islandRatio.toFixed(2),
    entropy: +entropy.toFixed(2), colorEntropy: +colorEntropy.toFixed(2),
    nColors, effectiveColors,
    dominantClusterCount: dominantClusters.length,
    minorClusterCount: minorClusters.length,
    meanNearestDeltaE, meanNearestDeltaE00,
    de76Quantiles, de00Quantiles,
    blockiness: +blockiness.toFixed(2),
    profileId, profileWeights, confidence,
    adaptiveAttributes,
    familyColorProfile,
    colorFamilyCount: familyColorProfile.colorFamilyCount,
    surfaceMode: familyColorProfile.surfaceMode,
    colorStructureMode: familyColorProfile.colorStructureMode,
    profiler8Stages,
    maxSide, resBucket,
    label: { blended: 'Artwork with Blended Edges', aliased: 'Artwork without Blended Edges', photo: 'Photograph' }[type],
    qlabel: { high: 'High', medium: 'Medium', low: 'Low' }[quality]
  };
}

/* =====================================================================
   MODUL ADAPTIVE PARAMETER PROFILES (Weighted Resolver -> 8-Stage Pipeline)
   Menggabungkan Base Profiles (Flat, Illustration, Photo) secara berbobot
   beserta 6 Atribut Independen, Distribusi Kuantil CIEDE2000 (Q10/Q25/Q50),
   dan Sumbu Ganda (colorFamilyCount × surfaceMode).
   ===================================================================== */
function buildAdaptiveTraceProfile(cls, origW = 800, origH = 800, forcedProfile = 'auto') {
  const f = cls || {};
  const maxSide = Math.max(origW || f.maxSide || 800, origH || f.maxSide || 800);
  const resBucket = maxSide <= 512 ? 'small' : maxSide <= 1500 ? 'medium' : maxSide <= 3000 ? 'large' : 'uhd';
  const resBucketLabel = {
    small: '≤ 512 px (Proteksi Detail Mikro Ketat)',
    medium: '513–1500 px (Kalibrasi Standar)',
    large: '1501–3000 px (Skala Resolusi Tinggi)',
    uhd: '> 3000 px (Multi-Skala UHD)'
  }[resBucket];

  const isForced = !!(forcedProfile && forcedProfile !== 'auto');
  const effProfile = isForced ? forcedProfile : (f.profileId || 'illustration');
  const effColors = f.effectiveColors || 12;
  const noise = f.noise != null ? f.noise : 0.2;
  const edgeSharp = f.edgeSharpness != null ? f.edgeSharpness : 0.6;
  const gradCont = f.gradientContinuity != null ? f.gradientContinuity : 0.12;
  const meaningfulDetail = f.meaningfulDetailDensity != null ? f.meaningfulDetailDensity : (f.microDetailDensity != null ? f.microDetailDensity : 0.15);
  const nearDE = f.meanNearestDeltaE != null ? f.meanNearestDeltaE : 12.0;
  const nearDE00 = f.meanNearestDeltaE00 != null ? f.meanNearestDeltaE00 : 8.5;
  const q25DE = (f.de76Quantiles && f.de76Quantiles.q25) || nearDE * 0.8;

  const wts = isForced
    ? { flat: effProfile === 'flat' ? 1 : 0, illustration: effProfile === 'illustration' ? 1 : 0, photo: effProfile === 'photo' ? 1 : 0 }
    : (f.profileWeights || { flat: effProfile === 'flat' ? 0.7 : 0.15, illustration: effProfile === 'illustration' ? 0.7 : 0.2, photo: effProfile === 'photo' ? 0.7 : 0.1 });

  const attr = f.adaptiveAttributes || {
    geometryPriority: effProfile === 'flat' ? 0.82 : 0.55,
    detailProtection: meaningfulDetail > 0.22 ? 0.78 : 0.58,
    noiseSuppression: noise,
    gradientPreservation: gradCont,
    alphaSensitivity: 0.5,
    topologyProtection: 0.65
  };
  const fam = f.familyColorProfile || {
    colorFamilyCount: 2,
    surfaceMode: gradCont > 0.26 ? 'gradient' : 'flat',
    colorStructureMode: 'MIXED_COLOR_STRUCTURE',
    familyCoherence: 0.5,
    shadeLevelCount: effColors,
    lightnessSpread: 45,
    chromaSpread: 30,
    plateauSupport: 0.6,
    gradientContinuity: gradCont,
    familyNoiseRatio: noise * 0.5
  };

  /* 1. Base Profiles sebagai jangkar referensi */
  const BASE_PROFILES = {
    flat: {
      id: 'flat',
      code: 'Profil A',
      title: 'Profil A — Ikon, Logo & Ilustrasi Flat',
      shortTitle: 'Profil A (Flat / Logo)',
      desc: 'Prioritas bentuk geometris akurat, sudut C⁰ tegas, warna solid bersih, dan jumlah node minimal.',
      bilateralRadius: 1,
      sigmaSpatial: 1.15,
      sigmaColor: 13,
      wedgeGuardThr: 620,
      skipBilateralIfClean: true,
      targetKMax: 12,
      layerDifference: 7.4,
      sensitivity: 'medium',
      qtVarThr: 135,
      snapPasses: 4,
      complexity: 54,
      mrfBetaScale: 1.08,
      mrfIters: 16,
      minPixels: 4,
      sliverRatioThr: 0.030,
      smoothMethod: 'hybrid',
      smoothness: 52,
      despeckleJitter: 68,
      lineStraighten: 82,
      axisSnap: true,
      axisSnapDeg: 2.8,
      extremumAlign: true,
      cornerMode: 'typo',
      cornerAngle: 42,
      lineCurveSensitivity: 80,
      apexSharpness: 88,
      cornerRoundness: 60,
      protectStemCaps: true,
      nodeDensity: 66
    },
    illustration: {
      id: 'illustration',
      code: 'Profil B',
      title: 'Profil B — Ilustrasi Berwarna & Kontur Organik',
      shortTitle: 'Profil B (Ilustrasi)',
      desc: 'Prioritas mempertahankan bentuk organik, garis jari/line-art tipis, gradasi lembut pipi/rambut, dan kurva mulus.',
      bilateralRadius: 1,
      sigmaSpatial: 1.18,
      sigmaColor: 14,
      wedgeGuardThr: 540,
      skipBilateralIfClean: false,
      targetKMax: 28,
      layerDifference: 3.8,
      sensitivity: 'high',
      qtVarThr: 145,
      snapPasses: 3,
      complexity: 68,
      mrfBetaScale: 0.92,
      mrfIters: 14,
      minPixels: 4,
      sliverRatioThr: 0.014,
      smoothMethod: 'hybrid',
      smoothness: 54,
      despeckleJitter: 64,
      lineStraighten: 52,
      axisSnap: false,
      axisSnapDeg: 2.0,
      extremumAlign: true,
      cornerMode: 'typo',
      cornerAngle: 46,
      lineCurveSensitivity: 72,
      apexSharpness: 78,
      cornerRoundness: 68,
      protectStemCaps: true,
      nodeDensity: 60
    },
    photo: {
      id: 'photo',
      code: 'Profil C',
      title: 'Profil C — Foto & Lukisan Gradasi Kompleks',
      shortTitle: 'Profil C (Foto / Lukisan)',
      desc: 'Prioritas pengelompokan tonal/gradasi yang koheren, penapisan edge-preserving, dan kendali jumlah poligon.',
      bilateralRadius: 2,
      sigmaSpatial: 1.75,
      sigmaColor: 25,
      wedgeGuardThr: 880,
      skipBilateralIfClean: false,
      targetKMax: 26,
      layerDifference: 5.8,
      sensitivity: 'medium',
      qtVarThr: 340,
      snapPasses: 3,
      complexity: 70,
      mrfBetaScale: 1.12,
      mrfIters: 14,
      minPixels: 6,
      sliverRatioThr: 0.022,
      smoothMethod: 'hybrid',
      smoothness: 60,
      despeckleJitter: 70,
      lineStraighten: 42,
      axisSnap: false,
      axisSnapDeg: 2.0,
      extremumAlign: true,
      cornerMode: 'organic',
      cornerAngle: 50,
      lineCurveSensitivity: 64,
      apexSharpness: 72,
      cornerRoundness: 80,
      protectStemCaps: false,
      nodeDensity: 52
    }
  };

  /* Blending parameter dasar menggunakan bobot profil kontinu (Weighted Profile Blending) */
  const A = BASE_PROFILES.flat, B = BASE_PROFILES.illustration, C = BASE_PROFILES.photo;
  const wBlend = k => A[k] * wts.flat + B[k] * wts.illustration + C[k] * wts.photo;
  const p = {
    ...(BASE_PROFILES[effProfile] || B),
    sigmaSpatial: +wBlend('sigmaSpatial').toFixed(2),
    sigmaColor: Math.round(wBlend('sigmaColor')),
    wedgeGuardThr: Math.round(wBlend('wedgeGuardThr')),
    qtVarThr: Math.round(wBlend('qtVarThr')),
    complexity: Math.round(wBlend('complexity')),
    mrfBetaScale: +wBlend('mrfBetaScale').toFixed(2),
    mrfIters: Math.round(wBlend('mrfIters')),
    smoothness: Math.round(wBlend('smoothness')),
    despeckleJitter: Math.round(wBlend('despeckleJitter')),
    lineStraighten: Math.round(wBlend('lineStraighten')),
    axisSnapDeg: +wBlend('axisSnapDeg').toFixed(1),
    cornerAngle: Math.round(wBlend('cornerAngle')),
    lineCurveSensitivity: Math.round(wBlend('lineCurveSensitivity')),
    apexSharpness: Math.round(wBlend('apexSharpness')),
    cornerRoundness: Math.round(wBlend('cornerRoundness')),
    nodeDensity: Math.round(wBlend('nodeDensity'))
  };

  /* 2. Racikan Khusus 1 (Sesuai Bagian 4 Markdown):
     `layerDifference` TIDAK BOLEH dikendalikan noise saja, dan `gradientContinuity` tinggi
     harus MENURUNKAN `layerDifference` (memisahkan `noiseSuppression` dari `gradientPreservation`)
     agar level tonal gradasi & shade 1-family tidak terhapus! */
  const qAnchor = clamp((q25DE - 8.5) * 0.14, -0.9, 1.1);
  const noiseTerm = attr.noiseSuppression * 1.45;
  const gradPresTerm = attr.gradientPreservation * 1.35;
  const detailPresTerm = attr.detailProtection * 0.85;

  let baseLD = wBlend('layerDifference') + qAnchor + noiseTerm - gradPresTerm - detailPresTerm;
  if (fam.colorStructureMode === 'DISCRETE_FAMILY_SHADES') {
    /* Banyak shade dengan plateau solid berbeda (Kondisi A): lindungi tiap shade */
    baseLD = Math.min(baseLD, clamp(q25DE * 0.52, 3.4, 5.4));
    p.targetKMax = clamp(Math.round(Math.max(effColors, fam.shadeLevelCount) * 1.2 + 3), 6, 28);
    p.sensitivity = 'high';
  } else if (fam.colorStructureMode === 'FAMILY_GRADIENT' || fam.colorStructureMode === 'MULTI_FAMILY_GRADIENT') {
    /* Banyak shade membentuk gradasi kontinu (Kondisi B): jaga urutan tonal koheren & aktifkan fitting gradien */
    baseLD = clamp(baseLD - 1.05, 2.6, 4.4);
    const effGradColors = Math.max(effColors, Math.round(20 + gradCont * 16));
    p.targetKMax = clamp(Math.round(effGradColors * 1.22 + 6), 24, 38);
    p.sensitivity = 'high';
    p.enableGradientFitting = true;
  } else if (fam.colorStructureMode === 'FAMILY_NOISE') {
    /* Banyak shade semu akibat noise/JPEG (Kondisi C): tekan variasi tanpa dukungan spasial */
    baseLD = clamp(baseLD + 1.1, 6.4, 9.2);
    p.targetKMax = clamp(Math.round(effColors * 0.85 + 2), 4, 18);
  } else if (fam.colorStructureMode === 'MULTI_FAMILY_FLAT') {
    /* Flat dengan banyak keluarga warna (mis. poster atau low-poly多-faset): jaga presisi faset tanpa menduplikasi warna */
    const nPlat = Math.max(effColors, fam.shadeLevelCount);
    baseLD = nPlat >= 24 ? clamp(baseLD * 0.78, 3.6, 5.2) : clamp(baseLD, 4.4, 6.8);
    p.targetKMax = clamp(Math.round(nPlat * 1.15 + 3), 6, 44);
  } else {
    p.targetKMax = clamp(Math.round(effColors * (effProfile === 'photo' ? 0.96 : 1.15) + 3), 4, 32);
  }
  p.layerDifference = +clamp(baseLD, 3.2, 9.5).toFixed(2);
  p.layerDifference00 = +clamp(p.layerDifference * 0.68, 2.2, 6.8).toFixed(2);

  /* 3. Adaptasi Prapemrosesan & Bilateral Filter berbasis `noiseSuppression` vs `detailProtection` */
  if (fam.surfaceMode === 'flat' && attr.noiseSuppression < 0.18 && edgeSharp > 0.70) {
    p.skipBilateral = true;
    p.sigmaColor = 10;
  } else {
    p.skipBilateral = false;
    const noiseBoost = attr.noiseSuppression * 14;
    const detailDamp = attr.detailProtection * 8;
    p.sigmaColor = Math.round(clamp(p.sigmaColor + noiseBoost - detailDamp, 10, 34));
    p.sigmaSpatial = +clamp(p.sigmaSpatial + attr.noiseSuppression * 0.28 - attr.detailProtection * 0.20, 1.0, 2.1).toFixed(2);
  }
  p.snapPasses = attr.geometryPriority > 0.65 ? 4 : (effProfile === 'photo' ? 3 : 4);

  /* 4. Racikan Khusus 2 (Sesuai Bagian 4 Markdown):
     `minPixels` sebagai jaring pengaman terakhir yang dikalibrasi terhadap `detailProtection` & skala resolusi */
  let baseMinPx = Math.round(wBlend('minPixels'));
  if (resBucket === 'small') baseMinPx = effProfile === 'photo' ? 3 : 2;
  else if (resBucket === 'large' || resBucket === 'uhd') baseMinPx = Math.round(baseMinPx * 1.25);

  if (attr.detailProtection >= 0.62 || fam.colorStructureMode === 'DISCRETE_FAMILY_SHADES') {
    baseMinPx = Math.max(2, baseMinPx - 1);
    p.complexity = clamp(p.complexity + Math.round(attr.detailProtection * 12), 42, 88);
  } else if (attr.noiseSuppression >= 0.58 && fam.surfaceMode !== 'flat') {
    baseMinPx = clamp(baseMinPx + 2, 3, 10);
    p.complexity = clamp(p.complexity - 6, 36, 82);
  }
  p.minPixels = clamp(baseMinPx, 2, 12);

  /* 5. Racikan Khusus 3 (Sesuai Bagian 4 Markdown):
     Koordinasi `smoothness` dan `nodeDensity` berbasis `geometryPriority` & `detailProtection` */
  const isCurvedGeometric = (f.circularArcRatio || 0) > (f.straightEdgeRatio || 0) * 1.12 && (f.straightEdgeRatio || 0) < 0.30;
  if (attr.geometryPriority >= 0.72) {
    p.smoothness = clamp(p.smoothness - 5, 42, 64);
    if (isCurvedGeometric) {
      /* Geometri didominasi busur melengkung/lingkaran: cegah agresivitas lineStraighten meratakan puncak busur! */
      p.lineStraighten = clamp(Math.round(30 + (f.straightEdgeRatio || 0.2) * 70), 28, 48);
      p.axisSnap = false;
    } else {
      p.lineStraighten = clamp(Math.round(p.lineStraighten + attr.geometryPriority * 12), 68, 94);
      p.axisSnap = true;
    }
  } else if (isCurvedGeometric) {
    p.lineStraighten = clamp(Math.round(28 + (f.straightEdgeRatio || 0.2) * 65), 26, 46);
    p.axisSnap = false;
  }
  if (attr.detailProtection >= 0.65 && effProfile === 'flat') {
    p.smoothness = clamp(p.smoothness - 4, 44, 70);
    p.nodeDensity = clamp(p.nodeDensity + 6, 54, 76);
  } else if (attr.noiseSuppression >= 0.55 || effProfile !== 'flat') {
    p.despeckleJitter = clamp(p.despeckleJitter + 5, 68, 88);
  }

  const lambdaPreview = +(Math.pow(10, -0.8 + (p.smoothness / 100) * 2.25)).toFixed(2);
  const tolWorkPx = +(Math.max(0.08, (0.38 - (p.nodeDensity / 100) * 0.28))).toFixed(2);

  return {
    id: p.id,
    forced: isForced,
    code: p.code,
    title: p.title,
    shortTitle: p.shortTitle,
    desc: p.desc,
    resBucket,
    resBucketLabel,
    maxSide,
    confidence: f.confidence ?? 0.85,
    profileWeights: wts,
    adaptiveAttributes: attr,
    familyColorProfile: fam,
    profiler8Stages: f.profiler8Stages || [],
    metrics: {
      effectiveColors: effColors,
      rawColors: f.nColors || effColors,
      colorEntropy: f.colorEntropy || f.entropy || 0,
      edgeDensity: f.edgeDensity || 0,
      edgeSharpness: edgeSharp,
      microDetailDensity: meaningfulDetail,
      meaningfulDetailDensity: meaningfulDetail,
      gradientContinuity: gradCont,
      noiseLevel: noise,
      meanNearestDeltaE: nearDE,
      meanNearestDeltaE00: nearDE00,
      de00Quantiles: f.de00Quantiles || { q10: 5, q25: 7, q50: 9, q90: 18 },
      colorFamilyCount: fam.colorFamilyCount,
      surfaceMode: fam.surfaceMode,
      colorStructureMode: fam.colorStructureMode
    },
    keyParams: {
      layerDifference: p.layerDifference,
      layerDifference00: p.layerDifference00,
      filterSpeckle: p.minPixels,
      smoothingStrength: p.smoothness,
      smoothingLambda: lambdaPreview,
      bezierTolerance: tolWorkPx,
      nodeDensity: p.nodeDensity,
      bilateralSigmaColor: p.skipBilateral ? 0 : p.sigmaColor,
      targetKMax: p.targetKMax
    },
    params: p
  };
}

function analyzeAlpha(data) {
  const d = data.data, n = data.width * data.height;
  let t = 0, semi = 0;
  const step = Math.max(1, Math.floor(n / 80000));
  let c = 0;
  for (let i = 3; i < d.length; i += 4 * step) {
    const a = d[i]; c++;
    if (a < 128) t++; else if (a < 252) semi++;
  }
  return {
    hasAlpha: t > 0 || semi > 0,
    transparentFrac: t / Math.max(1, c),
    semiFrac: semi / Math.max(1, c),
    binary: semi / Math.max(1, c + t) < 0.015
  };
}

/* Alpha Defringing & Flattening:
   Ambang alpha diturunkan ke 0.30 pada piksel ujung yang bertetangga dengan piksel opaque
   agar ujung lancip huruf (yang cakupan pikselnya ~30%-44%) tidak terpotong! */
function flattenAlpha(work, mode, customHex, forceCpu = false) {
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline !== 'off' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuFlattenAlpha) {
    const gpuMask = GpuAccelerator.gpuFlattenAlpha(work, mode, customHex);
    if (gpuMask) return gpuMask;
  }
  const { data, w, h } = work, d = data.data;
  const rawCopy = new Uint8ClampedArray(d);
  const bg = mode === 'custom' ? rgbOf(customHex || '#ffffff') : [255, 255, 255];
  const mask = new Uint8Array(w * h);
  const origAlpha = new Uint8Array(w * h);
  for (let i = 3, p = 0; i < d.length; i += 4, p++) origAlpha[p] = d[i];
  work.origAlpha = origAlpha;

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const a = origAlpha[p] / 255;
    if (mode === 'keep') {
      const x = p % w, y = (p / w) | 0;
      let nearSolid = false;
      if (a >= 0.25 && a < 0.45) {
        for (let dy = -1; dy <= 1 && !nearSolid; dy++) {
          const ny = y + dy; if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx; if (nx < 0 || nx >= w) continue;
            if (origAlpha[ny * w + nx] >= 210) { nearSolid = true; break; }
          }
        }
      }
      const cut = nearSolid ? 0.25 : 0.40;
      if (a < cut) {
        mask[p] = 1;
        d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
        continue;
      }
      if (a < 0.98) {
        /* Anti-Halo Inward Opaque Foreground Propagation:
           Propagasi warna piksel interior solid (alpha >= 245) terdekat dalam radius 3
           agar tepi semi-transparan tidak menghasilkan cincin halo putih/hitam */
        let fgR = 0, fgG = 0, fgB = 0, fgW = 0;
        for (let dy = -3; dy <= 3; dy++) {
          const ny = y + dy; if (ny < 0 || ny >= h) continue;
          const row = ny * w;
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx; if (nx < 0 || nx >= w) continue;
            const np = row + nx;
            if (origAlpha[np] >= 245) {
              const wgt = 1 / (dx * dx + dy * dy + 0.5);
              const ni = np * 4;
              fgR += rawCopy[ni] * wgt;
              fgG += rawCopy[ni + 1] * wgt;
              fgB += rawCopy[ni + 2] * wgt;
              fgW += wgt;
            }
          }
        }
        if (fgW > 0) {
          const ir = fgR / fgW, ig = fgG / fgW, ib = fgB / fgW;
          d[i] = clamp(Math.round(ir * 0.88 + rawCopy[i] * 0.12), 0, 255);
          d[i + 1] = clamp(Math.round(ig * 0.88 + rawCopy[i + 1] * 0.12), 0, 255);
          d[i + 2] = clamp(Math.round(ib * 0.88 + rawCopy[i + 2] * 0.12), 0, 255);
        } else {
          d[i] = rawCopy[i]; d[i + 1] = rawCopy[i + 1]; d[i + 2] = rawCopy[i + 2];
        }
        d[i + 3] = 255;
        continue;
      }
    }
    d[i] = Math.round(rawCopy[i] * a + bg[0] * (1 - a));
    d[i + 1] = Math.round(rawCopy[i + 1] * a + bg[1] * (1 - a));
    d[i + 2] = Math.round(rawCopy[i + 2] * a + bg[2] * (1 - a));
    d[i + 3] = 255;
  }
  return mask;
}

