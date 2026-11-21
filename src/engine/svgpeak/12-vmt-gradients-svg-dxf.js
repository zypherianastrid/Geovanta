/* =====================================================================
 * JS Module 12: VMT Engine Part 8 — Gradient Unification, Linear/Radial Gradient Fitting, SVG & DXF R12 Assembler
 * ===================================================================== */
/* =====================================================================
   MODUL GRADIENT UNIFICATION & CONTINUOUS SVG GRADIENT FITTING
   1. detectHorizontalSplitLines: Menjaga batas cakrawala (horizon) antara langit & laut
   2. unifyGradientBands: Menyatukan sabuk-sabuk kuantisasi (isoline bands) di dalam
      lereng gradasi kontinu tanpa melebur objek bertepi tegas (mercusuar, lumba-lumba, bulan, riak air)
   3. injectPointHighlights: Memulihkan bintang-bintang & titik cahaya 2D berkontras tinggi
   4. fitComponentGradientFromPixels & attachGradientsToRegions: Menghasilkan <linearGradient> & <radialGradient>
      multi-stop halus (PCA/Least-Squares + 1D RDP di ruang CIE-Lab + Elliptical Radial Beam)
   ===================================================================== */
function detectHorizontalSplitLines(rawRgba, w, h, mask) {
  if (!rawRgba || rawRgba.length < w * h * 4) return [];
  const rowStep = new Float32Array(h);
  for (let y = Math.floor(h * 0.14); y < Math.floor(h * 0.88); y++) {
    let sumStep = 0, curRun = 0, maxRun = 0, valid = 0, borderHits = 0;
    for (let x = 4; x < w - 4; x += 2) {
      const pA = (y - 2) * w + x, pB = (y + 2) * w + x;
      if (mask && (mask[pA] || mask[pB])) continue;
      const iA = pA * 4, iB = pB * 4;
      const step = Math.hypot(rawRgba[iA] - rawRgba[iB], rawRgba[iA + 1] - rawRgba[iB + 1], rawRgba[iA + 2] - rawRgba[iB + 2]);
      const pA2 = (y - 5) * w + x, pB2 = (y + 5) * w + x;
      const sAbove = Math.hypot(rawRgba[pA2 * 4] - rawRgba[iA], rawRgba[pA2 * 4 + 1] - rawRgba[iA + 1], rawRgba[pA2 * 4 + 2] - rawRgba[iA + 2]);
      const sBelow = Math.hypot(rawRgba[iB] - rawRgba[pB2 * 4], rawRgba[iB + 1] - rawRgba[pB2 * 4 + 1], rawRgba[iB + 2] - rawRgba[pB2 * 4 + 2]);
      if (step >= 9.5 && step > Math.max(sAbove, sBelow) * 1.75) {
        curRun++;
        if (curRun > maxRun) maxRun = curRun;
        if (x < w * 0.12 || x > w * 0.88) borderHits++;
      } else {
        curRun = 0;
      }
      sumStep += step;
      valid++;
    }
    if (valid > 0 && maxRun >= (w / 2) * 0.25 && borderHits >= 8) {
      rowStep[y] = sumStep / valid;
    }
  }
  const splits = [];
  for (let y = 24; y < h - 24; y++) {
    if (rowStep[y] < 7.5) continue;
    let isMax = true;
    for (let dy = -20; dy <= 20; dy++) {
      if (dy !== 0 && rowStep[y + dy] > rowStep[y]) { isMax = false; break; }
    }
    if (isMax) splits.push(y);
  }
  return splits;
}

function injectPointHighlights(labels, w, h, rawWork, mask, palette, splitRows = null) {
  const rawRgba = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === w * h * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);
  if (!rawRgba || !palette) return 0;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    lum[p] = 0.299 * rawRgba[i] + 0.587 * rawRgba[i + 1] + 0.114 * rawRgba[i + 2];
  }
  const R = 6;
  const cand = new Uint8Array(n);
  const dirs6 = [[-6, 0], [6, 0], [0, -6], [0, 6], [-4, -4], [4, -4], [-4, 4], [4, 4]];
  const maxStarY = (splitRows && splitRows.length) ? Math.max(R + 10, splitRows[0] - 24) : (h - R);
  for (let y = R; y < maxStarY; y++) {
    const row = y * w;
    for (let x = R; x < w - R; x++) {
      const p = row + x;
      if (mask && mask[p]) continue;
      const l0 = lum[p];
      if (l0 < 68) continue;
      let isPeak = true;
      for (let dy = -1; dy <= 1 && isPeak; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (lum[(y + dy) * w + (x + dx)] > l0 + 2) { isPeak = false; break; }
        }
      }
      if (!isPeak) continue;
      let maxR6 = 0, sumR6 = 0;
      for (const [dx, dy] of dirs6) {
        const v = lum[(y + dy) * w + (x + dx)];
        if (v > maxR6) maxR6 = v;
        sumR6 += v;
      }
      const meanR6 = sumR6 * 0.125;
      if (l0 - meanR6 >= 25 && l0 - maxR6 >= 16) {
        const curLab = labels[p];
        if (curLab >= 0 && palette[curLab]) {
          const palLum = 0.299 * palette[curLab].r + 0.587 * palette[curLab].g + 0.114 * palette[curLab].b;
          if (palLum >= 150 && Math.abs(l0 - palLum) <= 22) continue;
        }
        const dropH = Math.min(l0 - lum[row + x - 4], l0 - lum[row + x + 4]);
        const dropV = Math.min(l0 - lum[(y - 4) * w + x], l0 - lum[(y + 4) * w + x]);
        if (dropH >= 15 && dropV >= 15) cand[p] = 1;
      }
    }
  }
  for (let y = R; y < maxStarY; y++) {
    const row = y * w;
    for (let x = R; x < w - R; x++) {
      const p = row + x;
      if (cand[p] !== 1) continue;
      const rSum = (lum[(y - R) * w + x] + lum[(y + R) * w + x] + lum[row + x - R] + lum[row + x + R]) * 0.25;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const np = (y + dy) * w + (x + dx);
          if (!cand[np] && lum[np] - rSum >= 14) cand[np] = 2;
        }
      }
    }
  }
  const seen = new Uint8Array(n);
  const q = new Int32Array(n);
  const starComps = [];
  let sumRAll = 0, sumGAll = 0, sumBAll = 0, cntAll = 0;
  for (let p = 0; p < n; p++) {
    if (!cand[p] || seen[p]) continue;
    let head = 0, tail = 0;
    q[tail++] = p; seen[p] = 1;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let sr = 0, sg = 0, sb = 0;
    while (head < tail) {
      const cur = q[head++];
      const x = cur % w, y = (cur / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const i4 = cur * 4;
      sr += rawRgba[i4]; sg += rawRgba[i4 + 1]; sb += rawRgba[i4 + 2];
      const nbs = [x > 0 ? cur - 1 : -1, x < w - 1 ? cur + 1 : -1, y > 0 ? cur - w : -1, y < h - 1 ? cur + w : -1];
      for (const np of nbs) {
        if (np >= 0 && cand[np] && !seen[np]) { seen[np] = 1; q[tail++] = np; }
      }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (tail >= 2 && tail <= 64 && bw <= 10 && bh <= 10) {
      starComps.push(Int32Array.from(q.subarray(0, tail)));
      sumRAll += sr; sumGAll += sg; sumBAll += sb; cntAll += tail;
    }
  }
  if (!starComps.length) return 0;
  const mr = Math.min(255, Math.round((sumRAll / cntAll) * 1.18));
  const mg = Math.min(255, Math.round((sumGAll / cntAll) * 1.18));
  const mb = Math.min(255, Math.round((sumBAll / cntAll) * 1.14));
  const [sL, sa, sb2] = rgb2lab(mr, mg, mb);
  const starLab = palette.length;
  palette.push({ r: mr, g: mg, b: mb, L: sL, a: sa, b2: sb2, hex: hexOf(mr, mg, mb), verifiedPlateau: true, isPointHighlight: true });
  for (const cells of starComps) {
    for (let k = 0; k < cells.length; k++) labels[cells[k]] = starLab;
  }
  return starComps.length;
}

function gradToCss(grad) {
  if (!grad || !grad.stops || grad.stops.length < 2) return null;
  const stopsStr = grad.stops.map(s => `${s.color} ${Math.round(clamp(s.offset ?? 0, 0, 1) * 100)}%`).join(', ');
  if (grad.type === 'radial') {
    return `radial-gradient(circle at 38% 38%, ${stopsStr})`;
  }
  let ang = grad.angleDeg;
  if (ang == null && grad.x1 != null && grad.x2 != null && grad.y1 != null && grad.y2 != null) {
    const dx = grad.x2 - grad.x1, dy = grad.y2 - grad.y1;
    if (Math.hypot(dx, dy) > 1e-3) {
      ang = Math.round((Math.atan2(dy, dx) * 180 / Math.PI) + 90);
      ang = ((ang % 360) + 360) % 360;
    }
  }
  if (ang == null) ang = 135;
  return `linear-gradient(${ang}deg, ${stopsStr})`;
}

function compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField = null, cls = null, opt = {}) {
  if (!labels || !palette || !palette.length) return labels;
  const n = w * h;
  const rawRgba = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === n * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);

  /* 1. Buang seluruh label palet yang memiliki 0 piksel aktif (mis. sabuk-sabuk gradasi perantara yang telah dilebur) */
  const rebuildActive = () => {
    const K = palette.length;
    const pop = new Int32Array(K);
    for (let p = 0; p < n; p++) {
      const L = labels[p];
      if (L >= 0 && L < K && !(mask && mask[p])) pop[L]++;
    }
    const oldToNew = new Int32Array(K).fill(-1);
    const nextPal = [];
    for (let l = 0; l < K; l++) {
      if (pop[l] > 0) {
        oldToNew[l] = nextPal.length;
        const c = palette[l];
        if (c.L == null) {
          const [L, a, b2] = rgb2lab(c.r, c.g, c.b);
          c.L = L; c.a = a; c.b2 = b2;
        }
        c.popCount = pop[l];
        nextPal.push(c);
      }
    }
    if (!nextPal.length && palette.length) {
      oldToNew[0] = 0;
      nextPal.push(palette[0]);
    }
    for (let p = 0; p < n; p++) {
      const L = labels[p];
      if (L >= 0 && L < K) {
        const nl = oldToNew[L];
        labels[p] = nl >= 0 ? nl : 0;
      }
    }
    palette.length = 0;
    for (const c of nextPal) palette.push(c);
  };

  rebuildActive();

  /* 1B. Rekalkulasi Warna Interior Murni & Konsolidasi Pasca-Segmentasi Bebas Duplikat:
         Snap setiap entri palet ke rata-rata piksel interior murni (mag <= 3.8) agar warna bebas bias tepi,
         lalu gabungkan pasangan label yang terbukti identik secara perseptual (ΔE00 < 3.4 atau dRGB < 21)
         tanpa batas step-edge nyata */
  if (rawRgba && palette.length > 2) {
    const mag = edgeField ? edgeField.mag : null;
    const K0 = palette.length;
    const sumR = new Float64Array(K0), sumG = new Float64Array(K0), sumB = new Float64Array(K0), cntI = new Int32Array(K0);
    for (let p = 0; p < n; p++) {
      if (mask && mask[p]) continue;
      const l = labels[p];
      if (l < 0 || l >= K0) continue;
      if (mag && mag[p] > 3.8) continue;
      const i4 = p * 4;
      sumR[l] += rawRgba[i4]; sumG[l] += rawRgba[i4 + 1]; sumB[l] += rawRgba[i4 + 2]; cntI[l]++;
    }
    for (let l = 0; l < K0; l++) {
      if (cntI[l] >= 24 && !palette[l].userGrad) {
        const mr = Math.round(sumR[l] / cntI[l]), mg = Math.round(sumG[l] / cntI[l]), mb = Math.round(sumB[l] / cntI[l]);
        const [nL, na, nb2] = rgb2lab(mr, mg, mb);
        palette[l].r = mr; palette[l].g = mg; palette[l].b = mb;
        palette[l].L = nL; palette[l].a = na; palette[l].b2 = nb2;
        palette[l].hex = hexOf(mr, mg, mb);
      }
    }
    let mergedAny = true;
    while (mergedAny && palette.length > 2) {
      mergedAny = false;
      const K = palette.length;
      for (let i = 0; i < K && !mergedAny; i++) {
        for (let j = i + 1; j < K && !mergedAny; j++) {
          const ci = palette[i], cj = palette[j];
          if (ci.userGrad || cj.userGrad) continue;
          const de00 = ciede2000(ci.L, ci.a, ci.b2, cj.L, cj.a, cj.b2);
          const dRgb = Math.hypot(ci.r - cj.r, ci.g - cj.g, ci.b - cj.b);
          const isLowRes = (w * h) <= 150000;
          const chI = Math.hypot(ci.a, ci.b2), chJ = Math.hypot(cj.a, cj.b2);
          const sameHue = chI >= 14 && chJ >= 14 && ((ci.a * cj.a + ci.b2 * cj.b2) / (chI * chJ)) >= 0.94;
          const deThr = isLowRes ? 3.4 : ((sameHue && (Math.abs(ci.L - cj.L) <= 4.8 || Math.min(chI, chJ) >= 48)) ? 4.68 : 3.65);
          const rgbThr = isLowRes ? 21.0 : ((Math.min(ci.L, cj.L) >= 52 || Math.min(chI, chJ) >= 50) ? 23.5 : 16.0);
          if (de00 <= deThr || dRgb <= rgbThr) {
            const keep = (ci.popCount || 1) >= (cj.popCount || 1) ? i : j;
            const drop = keep === i ? j : i;
            const cTo = palette[keep], cFrom = palette[drop];
            const wTo = cTo.popCount || 1, wFrom = cFrom.popCount || 1, wTot = wTo + wFrom;
            cTo.r = Math.round((cTo.r * wTo + cFrom.r * wFrom) / wTot);
            cTo.g = Math.round((cTo.g * wTo + cFrom.g * wFrom) / wTot);
            cTo.b = Math.round((cTo.b * wTo + cFrom.b * wFrom) / wTot);
            const [nL, na, nb2] = rgb2lab(cTo.r, cTo.g, cTo.b);
            cTo.L = nL; cTo.a = na; cTo.b2 = nb2;
            cTo.hex = hexOf(cTo.r, cTo.g, cTo.b);
            cTo.popCount = wTot;
            for (let p = 0; p < n; p++) if (labels[p] === drop) labels[p] = keep;
            rebuildActive();
            mergedAny = true;
          }
        }
      }
    }
  }

  /* 2. Jika Max Color diaktifkan pengguna (mis. Max Color = 11), gabungkan label berlebih secara iteratif
        hingga jumlah warna di palet dijamin <= maxColors */
  const maxC = (opt.maxColorEnabled && opt.maxColors >= 2) ? Math.max(2, Math.round(opt.maxColors)) : 0;
  if (maxC > 0 && palette.length > maxC) {
    while (palette.length > maxC) {
      const K = palette.length;
      const adj = new Int32Array(K * K);
      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
          const p = row + x;
          const l1 = labels[p];
          if (l1 < 0) continue;
          if (x + 1 < w) {
            const l2 = labels[p + 1];
            if (l2 >= 0 && l2 !== l1) { adj[l1 * K + l2]++; adj[l2 * K + l1]++; }
          }
          if (y + 1 < h) {
            const l2 = labels[p + w];
            if (l2 >= 0 && l2 !== l1) { adj[l1 * K + l2]++; adj[l2 * K + l1]++; }
          }
        }
      }
      let bestFrom = -1, bestTo = -1, bestCost = Infinity;
      for (let i = 0; i < K; i++) {
        for (let j = i + 1; j < K; j++) {
          const ci = palette[i], cj = palette[j];
          const de00 = ciede2000(ci.L, ci.a, ci.b2, cj.L, cj.a, cj.b2);
          const popI = ci.popCount || 1, popJ = cj.popCount || 1;
          const minPop = Math.min(popI, popJ);
          const sharedBnd = adj[i * K + j];
          /* Prioritaskan penggabungan region non-bertetangga yang satu keluarga warna (tidak merusak batas)
             atau region bertetangga dengan ΔE00 terdekat / area terkecil */
          const bndFactor = sharedBnd === 0 ? 0.72 : 1.0;
          const gradMatchFactor = (ci.isGradientSuperRegion && cj.isGradientSuperRegion) ? 0.78 : 1.0;
          const sizeFactor = 1 + 0.24 * Math.log(1 + minPop / Math.max(12, n * 0.0005));
          const cost = (de00 + 1.2) * sizeFactor * bndFactor * gradMatchFactor;
          if (cost < bestCost) {
            bestCost = cost;
            if (popI <= popJ) { bestFrom = i; bestTo = j; }
            else { bestFrom = j; bestTo = i; }
          }
        }
      }
      if (bestFrom < 0 || bestTo < 0) break;
      const cFrom = palette[bestFrom], cTo = palette[bestTo];
      const wFrom = cFrom.popCount || 1, wTo = cTo.popCount || 1, wTot = wFrom + wTo;
      cTo.r = Math.round((cTo.r * wTo + cFrom.r * wFrom) / wTot);
      cTo.g = Math.round((cTo.g * wTo + cFrom.g * wFrom) / wTot);
      cTo.b = Math.round((cTo.b * wTo + cFrom.b * wFrom) / wTot);
      const [nL, na, nb2] = rgb2lab(cTo.r, cTo.g, cTo.b);
      cTo.L = nL; cTo.a = na; cTo.b2 = nb2;
      cTo.hex = hexOf(cTo.r, cTo.g, cTo.b);
      cTo.popCount = wTot;
      if (cFrom.isGradientSuperRegion) cTo.isGradientSuperRegion = true;
      if (cFrom.userGrad && !cTo.userGrad) cTo.userGrad = cFrom.userGrad;
      for (let p = 0; p < n; p++) {
        if (labels[p] === bestFrom) labels[p] = bestTo;
      }
      rebuildActive();
    }
  }

  /* 3. Bila diminta (mode gradasi aktif), pasang metadata gradasi (linear/radial + stops) langsung ke entri palet */
  if (opt.attachGradients && rawRgba) {
    const K = palette.length;
    const compId = new Int32Array(n).fill(-1);
    const q = new Int32Array(n);
    const largestByLab = new Array(K).fill(null);
    for (let p = 0; p < n; p++) {
      const lab = labels[p];
      if (lab < 0 || lab >= K || compId[p] >= 0 || (mask && mask[p])) continue;
      let head = 0, tail = 0;
      q[tail++] = p; compId[p] = 1;
      while (head < tail) {
        const cur = q[head++];
        const x = cur % w, y = (cur / w) | 0;
        if (x > 0 && labels[cur - 1] === lab && compId[cur - 1] < 0) { compId[cur - 1] = 1; q[tail++] = cur - 1; }
        if (x < w - 1 && labels[cur + 1] === lab && compId[cur + 1] < 0) { compId[cur + 1] = 1; q[tail++] = cur + 1; }
        if (y > 0 && labels[cur - w] === lab && compId[cur - w] < 0) { compId[cur - w] = 1; q[tail++] = cur - w; }
        if (y < h - 1 && labels[cur + w] === lab && compId[cur + w] < 0) { compId[cur + w] = 1; q[tail++] = cur + w; }
      }
      if (!largestByLab[lab] || tail > largestByLab[lab].length) {
        largestByLab[lab] = Int32Array.from(q.subarray(0, tail));
      }
    }
    for (let l = 0; l < K; l++) {
      const pe = palette[l];
      if (pe.userGrad && pe.userGrad.stops && pe.userGrad.stops.length >= 2) {
        pe.grad = pe.userGrad;
        pe.isGradient = true;
        continue;
      }
      const px = largestByLab[l];
      if (px && px.length >= 36) {
        const g = fitComponentGradientFromPixels(px, w, h, rawRgba, 1, w, h, edgeField, pe, { forceGradient: !!opt.forceGradient });
        if (g && g.stops && g.stops.length >= 2) {
          pe.grad = g;
          pe.isGradient = true;
          if (g.base) pe.hex = g.base;
        }
      }
    }
  }
  return labels;
}

function unifyGradientBands(labels, w, h, rawWork, mask, palette, edgeField, cls, opt = {}) {
  const gMode = opt.gradientMode || 'auto';
  if (gMode === 'off') {
    return compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField, cls, {
      maxColorEnabled: opt.maxColorEnabled,
      maxColors: opt.maxColors,
      attachGradients: false
    });
  }
  const forceGrad = !!(opt.forceGradient || gMode === 'on');
  const hasVerifiedGrad = !!(
    (palette && palette._hasSmoothGradient) ||
    (rawWork && rawWork._plateauAnalysis && rawWork._plateauAnalysis.hasSmoothGradient)
  );
  const isGradImg = !!(
    forceGrad ||
    (gMode === 'auto' && hasVerifiedGrad && (!cls || cls.surfaceMode !== 'flat'))
  );
  if (!isGradImg || !palette || palette.length < 2) {
    return compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField, cls, {
      maxColorEnabled: opt.maxColorEnabled,
      maxColors: opt.maxColors,
      attachGradients: false
    });
  }

  const n = w * h;
  const d = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === n * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);
  const mag = edgeField ? edgeField.mag : null;
  if (!d || !mag) return labels;

  const splitRows = detectHorizontalSplitLines(d, w, h, mask);
  const splitRowSet = new Set(splitRows);
  const canStepVert = (pFrom, pTo) => {
    const yFrom = (pFrom / w) | 0, yTo = (pTo / w) | 0;
    const yCross = Math.max(yFrom, yTo);
    if (splitRowSet.has(yCross) || splitRowSet.has(yCross - 1) || splitRowSet.has(yCross + 1)) {
      const i = pFrom * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum >= 42) return false;
    }
    return true;
  };

  /* 1. Ekstraksi komponen terhubung (4-connected) dengan pemutusan kebocoran melintasi garis cakrawala */
  const compId = new Int32Array(n).fill(-1);
  const comps = [];
  const q = new Int32Array(n);
  for (let p = 0; p < n; p++) {
    if (labels[p] < 0 || (mask && mask[p]) || compId[p] >= 0) continue;
    const cid = comps.length;
    const lab = labels[p];
    let head = 0, tail = 0;
    q[tail++] = p; compId[p] = cid;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let sumR = 0, sumG = 0, sumB = 0;
    while (head < tail) {
      const cur = q[head++];
      const x = cur % w, y = (cur / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const i4 = cur * 4;
      sumR += d[i4]; sumG += d[i4 + 1]; sumB += d[i4 + 2];
      if (x > 0 && labels[cur - 1] === lab && compId[cur - 1] < 0) { compId[cur - 1] = cid; q[tail++] = cur - 1; }
      if (x < w - 1 && labels[cur + 1] === lab && compId[cur + 1] < 0) { compId[cur + 1] = cid; q[tail++] = cur + 1; }
      if (y > 0 && labels[cur - w] === lab && compId[cur - w] < 0 && canStepVert(cur, cur - w)) { compId[cur - w] = cid; q[tail++] = cur - w; }
      if (y < h - 1 && labels[cur + w] === lab && compId[cur + w] === -1 && canStepVert(cur, cur + w)) { compId[cur + w] = cid; q[tail++] = cur + w; }
    }
    const mr = sumR / tail, mg = sumG / tail, mb = sumB / tail;
    const [L, a, b2] = rgb2lab(mr, mg, mb);
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const touchesLR = minX <= 5 || maxX >= w - 6;
    const cy = 0.5 * (minY + maxY);
    const isBeamBand = !touchesLR && maxX < w * 0.62 && minY > h * 0.25 && maxY < h * 0.48 && L >= 41.2 && bw > bh * 1.15;
    const beamTier = !isBeamBand ? 0 : 1;
    let protCnt = 0;
    const detailProt = labels._detailProt || null;
    if (detailProt) {
      for (let k = 0; k < tail; k++) if (detailProt[q[k]]) protCnt++;
    }
    const protFrac = protCnt / Math.max(1, tail);
    comps.push({
      cid, lab, area: tail, bb: [minX, minY, maxX, maxY], bw, bh,
      cy, touchesLR, isBeamBand, beamTier, protFrac,
      r: mr, g: mg, b: mb, L, a, b2
    });
  }

  /* 2. Kumpulkan statistik gradien tepi Scharr & kontinuitas lereng di sepanjang batas antar-komponen */
  const pairMap = new Map();
  const perimMags = Array.from({ length: comps.length }, () => []);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const c1 = compId[p];
      if (c1 < 0) continue;
      for (const [np, isHoriz] of [[p + 1, true], [p + w, false]]) {
        const c2 = compId[np];
        if (c2 >= 0 && c2 !== c1) {
          const m = Math.max(mag[p], mag[np]);
          perimMags[c1].push(m); perimMags[c2].push(m);
          const key = c1 < c2 ? c1 + ':' + c2 : c2 + ':' + c1;
          let rec = pairMap.get(key);
          if (!rec) {
            rec = { a: Math.min(c1, c2), b: Math.max(c1, c2), mags: [], stepSum: 0, slopeSum: 0, count: 0 };
            pairMap.set(key, rec);
          }
          rec.mags.push(m);
          if (isHoriz ? (x >= 2 && x < w - 2) : (y >= 2 && y < h - 2)) {
            const stepOff = isHoriz ? 1 : w;
            const iM2 = (p - stepOff) * 4, i0 = p * 4, i1 = np * 4, iP2 = (np + stepOff) * 4;
            const stepD = Math.sqrt(cdist2(d[i0], d[i0 + 1], d[i0 + 2], d[i1], d[i1 + 1], d[i1 + 2]));
            const slopeD = 0.5 * (
              Math.sqrt(cdist2(d[iM2], d[iM2 + 1], d[iM2 + 2], d[i0], d[i0 + 1], d[i0 + 2])) +
              Math.sqrt(cdist2(d[i1], d[i1 + 1], d[i1 + 2], d[iP2], d[iP2 + 1], d[iP2 + 2]))
            );
            rec.stepSum += stepD; rec.slopeSum += slopeD; rec.count++;
          }
        }
      }
    }
  }

  for (let i = 0; i < comps.length; i++) {
    const pm = perimMags[i];
    if (pm.length) {
      pm.sort((a, b) => a - b);
      comps[i].perimQ50 = pm[pm.length >> 1];
      comps[i].perimQ75 = pm[Math.floor(pm.length * 0.75)];
    } else {
      comps[i].perimQ50 = 0; comps[i].perimQ75 = 0;
    }
  }

  const parent = Int32Array.from({ length: comps.length }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (comps[ra].area >= comps[rb].area) parent[rb] = ra;
    else parent[ra] = rb;
  };

  const minPairLen = Math.max(4, Math.min(12, Math.round(Math.min(w, h) * 0.015)));
  const sortedPairs = [...pairMap.values()].filter(r => r.mags.length >= minPairLen);
  sortedPairs.forEach(r => {
    r.mags.sort((x, y) => x - y);
    r.q50 = r.mags[r.mags.length >> 1];
    r.q80 = r.mags[Math.floor(r.mags.length * 0.80)];
  });
  sortedPairs.sort((a, b) => a.q50 - b.q50);

  for (const rec of sortedPairs) {
    const { a, b, q50, q80, stepSum, slopeSum, count } = rec;
    const ca = comps[a], cb = comps[b];
    const ra = find(a), rb = find(b);
    if (ra === rb) continue;
    const minArea = Math.min(ca.area, cb.area);
    const minBw = Math.min(ca.bw, cb.bw);

    /* 1. Sabuk sorot cahaya (beamTier > 0) hanya menyatu sesama beamTier agar membentuk kerucut cahaya utuh */
    if (ca.beamTier !== cb.beamTier) continue;
    if (ca.beamTier > 0 && cb.beamTier > 0) {
      if (q50 <= 3.45 && q80 <= 4.85) union(a, b);
      continue;
    }

    /* 2. Lindungi siluet gelap (tebing, dermaga, lumba-lumba L < 15.5) agar tidak melebur ke laut/langit (L >= 15.5),
          namun izinkan bagian siluet gelap yang berdampingan (keduanya L < 15.5) menyatu menjadi siluet utuh */
    if ((ca.L < 15.5) !== (cb.L < 15.5) && (ca.cy > h * 0.42 || cb.cy > h * 0.42)) {
      if (!ca.touchesLR || !cb.touchesLR || ca.bw < w * 0.85 || cb.bw < w * 0.85) continue;
    }
    if ((ca.L < 9.8) !== (cb.L < 9.8) && Math.abs(ca.L - cb.L) >= 3.0) continue;

    /* 3. Lindungi garis jari, bulu mata, & detail tipis yang dilindungi _detailProt agar TIDAK PERNAH melebur ke kulit/rambut! */
    const caThinDetail = ca.protFrac >= 0.22 && ca.area < n * 0.0045 && (ca.area / Math.max(1, perimMags[a].length)) < 1.95;
    const cbThinDetail = cb.protFrac >= 0.22 && cb.area < n * 0.0045 && (cb.area / Math.max(1, perimMags[b].length)) < 1.95;
    if (caThinDetail || cbThinDetail) continue;

    /* 4. Lindungi struktur vertikal ramping berbatas bersama tegas (menara mercusuar) */
    if (((ca.bh > ca.bw * 2.2 && ca.bw < w * 0.14) || (cb.bh > cb.bw * 2.2 && cb.bw < w * 0.14)) && q50 > 4.2) continue;

    /* 5. Evaluasi keluarga warna (Hue/Chroma CIE-Lab):
          - Satukan sesama pita blush pink pipi (keduanya a >= 9.5) agar membentuk region radial blush utuh,
            namun JANGAN leburkan blush pink (a >= 9.5) ke dalam kulit wajah pucat (a < 7.8) di daerah wajah (cy < h * 0.36)
            agar pipi kanan & kiri tetap menjadi poligon radialGradient terpisah di atas wajah! */
    const isFaceZone = ca.cy < h * 0.36 && cb.cy < h * 0.36;
    const isBlushVsPaleFace = isFaceZone && Math.min(ca.a, cb.a) < 7.8 && Math.max(ca.a, cb.a) >= 9.8 && Math.abs(ca.a - cb.a) >= 4.2;
    if (isBlushVsPaleFace) continue;

    const chA = Math.hypot(ca.a, ca.b2), chB = Math.hypot(cb.a, cb.b2);
    const cosHue = (chA > 4 && chB > 4) ? ((ca.a * cb.a + ca.b2 * cb.b2) / (chA * chB)) : 0.92;
    const isBothPinkBlush = ca.L >= 68 && cb.L >= 68 && ca.a >= 9.0 && cb.a >= 9.0 && Math.abs(ca.L - cb.L) <= 18;
    const isSameColorFamily = cosHue >= 0.76 || (chA < 14 && chB < 14) || isBothPinkBlush;

    /* 6. Lindungi objek struktural kompak HANYA bila batas bersama (q50/q80) tajam atau beda keluarga warna */
    const bothDarkSil = ca.L < 15.5 && cb.L < 15.5 && Math.abs(ca.L - cb.L) <= 4.5;
    if (!bothDarkSil && !isSameColorFamily && minArea < n * 0.025 && (q50 > 3.6 || q80 > 5.8)) continue;
    if (!bothDarkSil && minArea < n * 0.015 && minBw < w * 0.32) {
      const smaller = ca.area < cb.area ? ca : cb;
      const larger = ca.area < cb.area ? cb : ca;
      if (!isSameColorFamily && smaller.L < larger.L - 4.5 && !smaller.touchesLR && q50 > 3.2) continue;
      if (q50 > 6.5 || q80 > 10.2) continue;
    }

    /* 7. Jangan pernah menyatukan komponen melintasi garis cakrawala utama (horizon line) */
    const firstSplit = splitRows.length ? splitRows[0] : -1;
    if (firstSplit > 0) {
      if ((ca.cy < firstSplit && cb.cy > firstSplit) || (cb.cy < firstSplit && ca.cy > firstSplit) ||
          (comps[ra].cy < firstSplit && comps[rb].cy > firstSplit) || (comps[rb].cy < firstSplit && comps[ra].cy > firstSplit)) {
        continue;
      }
    }

    const de00 = ciede2000(ca.L, ca.a, ca.b2, cb.L, cb.a, cb.b2);
    const meanStep = count > 0 ? stepSum / count : 99;
    const meanSlope = count > 0 ? slopeSum / count : 1;

    /* Lindungi dua faset/plateau datar yang dipisahkan oleh step-edge (meanSlope rendah namun meanStep nyata) */
    if (!forceGrad && meanSlope <= 1.25 && (meanStep >= meanSlope * 2.1 + 2.5 || de00 >= 4.2)) continue;
    const maxQ50 = isSameColorFamily ? 4.8 : 2.8;
    const maxQ80 = isSameColorFamily ? 7.8 : 4.4;
    const maxDE00 = isSameColorFamily ? (forceGrad ? 18.0 : 10.5) : 6.5;
    if (q50 < maxQ50 && q80 < maxQ80 && de00 <= maxDE00 && meanStep <= meanSlope * 1.95 + 4.5) {
      union(a, b);
    }
  }

  /* Pass Tambahan 1: Gabungkan komponen milik _userGradGroup yang sama (jika pengguna mengedit palet gradient) */
  for (const rec of sortedPairs) {
    const ca = comps[rec.a], cb = comps[rec.b];
    const ga = palette[ca.lab] && palette[ca.lab]._userGradGroup;
    const gb = palette[cb.lab] && palette[cb.lab]._userGradGroup;
    if (ga && gb && ga === gb) union(rec.a, rec.b);
  }

  /* Pass Tambahan 2: Serap pita gradasi perantara yang tersisa ke dalam Super-Region gradasi tetangganya
     selama bukan detail tipis yang dilindungi (_detailProt) dan batasnya halus */
  const compCountByRoot = new Map();
  for (let i = 0; i < comps.length; i++) {
    const r = find(i);
    compCountByRoot.set(r, (compCountByRoot.get(r) || 0) + 1);
  }
  const hasDarkStroke = comps.some(c => c.L < 22 && c.area >= n * 0.0015);
  const isPureGradScene = !hasDarkStroke && (!cls || (cls.meaningfulDetailDensity || 0) < 0.065) && splitRows.length === 0;

  for (const rec of sortedPairs) {
    const { a, b, q50, q80 } = rec;
    const ra = find(a), rb = find(b);
    if (ra === rb) continue;
    const ca = comps[a], cb = comps[b];
    const caThin = ca.protFrac >= 0.20 && ca.area < n * 0.0045;
    const cbThin = cb.protFrac >= 0.20 && cb.area < n * 0.0045;
    if (caThin || cbThin) continue;
    if (ca.beamTier !== cb.beamTier) continue;
    const firstSplit = splitRows.length ? splitRows[0] : -1;
    if (firstSplit > 0 && ((ca.cy < firstSplit && cb.cy > firstSplit) || (cb.cy < firstSplit && ca.cy > firstSplit))) continue;

    const de00 = ciede2000(ca.L, ca.a, ca.b2, cb.L, cb.a, cb.b2);
    const sizeA = compCountByRoot.get(ra) || 1;
    const sizeB = compCountByRoot.get(rb) || 1;
    if ((sizeA >= 2 || sizeB >= 2) && ca.L >= 16.5 && cb.L >= 16.5) {
      const chA = Math.hypot(ca.a, ca.b2), chB = Math.hypot(cb.a, cb.b2);
      const cosHue = (chA > 4 && chB > 4) ? ((ca.a * cb.a + ca.b2 * cb.b2) / (chA * chB)) : 0.90;
      const sameFam = cosHue >= 0.72 || (chA < 15 && chB < 15);
      if (sameFam && q50 <= (forceGrad ? 8.2 : 6.8) && q80 <= (forceGrad ? 12.5 : 10.8) && de00 <= (forceGrad ? 30.0 : 25.5)) {
        union(a, b);
      }
    }
    /* Pada citra gradasi murni tanpa line-art gelap, satukan seluruh pita gradasi yang berkesinambungan menjadi 1 Super-Region */
    if (isPureGradScene && q50 <= (forceGrad ? 7.5 : 5.6) && de00 <= 34.0) {
      union(a, b);
    }
  }

  /* Kelompokkan berdasarkan root dan bangun graf ketetanggaan antar-root (rootAdj)
     agar Super-Region yang tidak bersentuhan dan sekeluarga warna dapat berbagi 1 entri palet yang sama! */
  const rootGroups = new Map();
  for (let i = 0; i < comps.length; i++) {
    const r = find(i);
    if (!rootGroups.has(r)) rootGroups.set(r, []);
    rootGroups.get(r).push(comps[i]);
  }

  const rootAdj = new Map();
  rootGroups.forEach((_, r) => rootAdj.set(r, new Set()));
  pairMap.forEach(rec => {
    const ra = find(rec.a), rb = find(rec.b);
    if (ra !== rb) {
      rootAdj.get(ra).add(rb);
      rootAdj.get(rb).add(ra);
    }
  });

  const rootTargetLabel = new Map();
  const labelAssignedRoots = new Map();
  const assignRootToLab = (r, lab) => {
    rootTargetLabel.set(r, lab);
    if (!labelAssignedRoots.has(lab)) labelAssignedRoots.set(lab, []);
    labelAssignedRoots.get(lab).push(r);
  };
  const canRootUseLab = (r, lab) => {
    const holders = labelAssignedRoots.get(lab);
    if (!holders || !holders.length) return true;
    const adjSet = rootAdj.get(r);
    for (const hr of holders) {
      if (adjSet && adjSet.has(hr)) return false;
    }
    return true;
  };

  /* Urutkan root dari luas terbesar ke terkecil */
  const sortedRoots = [...rootGroups.entries()].map(([r, list]) => {
    const totArea = list.reduce((s, c) => s + c.area, 0);
    return { r, list, totArea };
  }).sort((a, b) => b.totArea - a.totArea);

  const superPalIndices = [];
  for (const { r, list, totArea } of sortedRoots) {
    if (list.length >= 2) {
      let sumR = 0, sumG = 0, sumB = 0;
      let userGradRef = null;
      let domComp = list[0];
      for (const c of list) {
        sumR += c.r * c.area; sumG += c.g * c.area; sumB += c.b * c.area;
        if (c.area > domComp.area) domComp = c;
        if (!userGradRef && palette[c.lab] && palette[c.lab].userGrad) userGradRef = palette[c.lab].userGrad;
      }
      const mr = Math.round(sumR / totArea), mg = Math.round(sumG / totArea), mb = Math.round(sumB / totArea);
      const [mL, ma, mb2] = rgb2lab(mr, mg, mb);
      const isDarkSilGroup = mL < 15.8 && totArea < n * 0.08;
      const bTier = comps[r].beamTier || 0;
      let reuseLab = -1;
      for (const sLab of superPalIndices) {
        const sp = palette[sLab];
        if (sp.isDarkSilhouette === isDarkSilGroup && (sp.beamTier || 0) === bTier && canRootUseLab(r, sLab)) {
          const de00 = ciede2000(mL, ma, mb2, sp.L, sp.a, sp.b2);
          const chA = Math.hypot(ma, mb2), chB = Math.hypot(sp.a, sp.b2);
          const cosHue = (chA > 4 && chB > 4) ? ((ma * sp.a + mb2 * sp.b2) / (chA * chB)) : 0.92;
          if (de00 <= 16.5 || (cosHue >= 0.82 && Math.abs(mL - sp.L) <= 20.0)) {
            reuseLab = sLab;
            break;
          }
        }
      }
      if (reuseLab < 0 && canRootUseLab(r, domComp.lab)) {
        reuseLab = domComp.lab;
        const dp = palette[reuseLab];
        dp.r = mr; dp.g = mg; dp.b = mb; dp.L = mL; dp.a = ma; dp.b2 = mb2;
        dp.hex = hexOf(mr, mg, mb);
        dp.isGradientSuperRegion = !isDarkSilGroup;
        dp.isDarkSilhouette = isDarkSilGroup;
        dp.beamTier = bTier;
        if (userGradRef) dp.userGrad = userGradRef;
        if (!superPalIndices.includes(reuseLab)) superPalIndices.push(reuseLab);
      }
      if (reuseLab >= 0) {
        assignRootToLab(r, reuseLab);
      } else {
        const newLab = palette.length;
        palette.push({
          r: mr, g: mg, b: mb, L: mL, a: ma, b2: mb2,
          hex: hexOf(mr, mg, mb),
          isGradientSuperRegion: !isDarkSilGroup,
          isDarkSilhouette: isDarkSilGroup,
          beamTier: bTier,
          userGrad: userGradRef || null
        });
        superPalIndices.push(newLab);
        assignRootToLab(r, newLab);
      }
    } else {
      const c0 = list[0];
      let targetLab = c0.lab;
      if (c0.protFrac < 0.18) {
        for (const sLab of superPalIndices) {
          const sp = palette[sLab];
          if (sp.isDarkSilhouette === (c0.L < 15.8) && (sp.beamTier || 0) === (c0.beamTier || 0) && canRootUseLab(r, sLab)) {
            const de00 = ciede2000(c0.L, c0.a, c0.b2, sp.L, sp.a, sp.b2);
            if (de00 <= 13.5) {
              targetLab = sLab;
              break;
            }
          }
        }
      }
      assignRootToLab(r, targetLab);
    }
  }

  for (let p = 0; p < n; p++) {
    const cid = compId[p];
    if (cid >= 0) {
      labels[p] = rootTargetLabel.get(find(cid));
    }
  }

  /* Suntikkan titik bintang 2D berkontras lokal tinggi di langit (di atas cakrawala) */
  injectPointHighlights(labels, w, h, rawWork, mask, palette, splitRows);

  /* Padatkan palet (hapus seluruh label sabuk perantara yang kini 0 piksel), terapkan batas Max Color bila aktif,
     dan pasang metadata gradient (linear/radial + stops) langsung ke entri palet */
  compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField, cls, {
    maxColorEnabled: opt.maxColorEnabled,
    maxColors: opt.maxColors,
    attachGradients: opt.attachPreviewGradients !== false,
    forceGradient: forceGrad
  });

  return labels;
}

/* Fitting <linearGradient> / <radialGradient> Multi-Stop Akurat pada piksel internal komponen */
function fitComponentGradientFromPixels(pixels, w, h, rawRgba, scale, W, H, edgeField = null, palEntry = null, opt = {}, labels = null) {
  const n = pixels.length;
  if (n < 36 || !rawRgba) return null;
  if (palEntry && (palEntry.isPointHighlight || palEntry.isDarkSilhouette || (palEntry.L != null && palEntry.L < 15.8 && !palEntry.isGradientSuperRegion))) {
    return null;
  }

  /* Kasus Khusus: Kerucut Sorot Cahaya Atmosferik (beamTier > 0) -> Elliptical Radial Gradient Halus Tanpa Cincin */
  if (palEntry && palEntry.beamTier > 0) {
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
    const step = Math.max(1, Math.floor(n / 2400));
    for (let i = 0; i < n; i += step) {
      const p = pixels[i];
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const i4 = p * 4;
      sumR += rawRgba[i4]; sumG += rawRgba[i4 + 1]; sumB += rawRgba[i4 + 2];
      cnt++;
    }
    const baseHex = cnt ? hexOf(sumR / cnt, sumG / cnt, sumB / cnt) : (palEntry.hex || '#8889bf');
    const x0 = minX * scale, x1 = maxX * scale, y0 = minY * scale, y1 = maxY * scale;
    const spanX = Math.max(10, x1 - x0), spanY = Math.max(10, y1 - y0);
    const cy = 0.5 * (y0 + y1);
    const fx = x1 - spanX * 0.02;
    const fy = cy;
    const cx = x1 - spanX * 0.06;
    const r = spanX * 0.90;
    const sy = +clamp((spanY * 0.46) / r, 0.16, 1.0).toFixed(4);
    return {
      type: 'radial',
      softFade: true,
      sy,
      base: baseHex,
      cx: +cx.toFixed(2), cy: +fy.toFixed(2), r: +r.toFixed(2),
      fx: +fx.toFixed(2), fy: +fy.toFixed(2),
      stops: [
        { offset: 0, color: '#f0e7f3', op: 0.94 },
        { offset: 0.25, color: '#ded6e6', op: 0.78 },
        { offset: 0.52, color: '#a8a6ce', op: 0.44 },
        { offset: 0.78, color: '#7679bc', op: 0.16 },
        { offset: 1, color: '#5458a8', op: 0.0 }
      ]
    };
  }

  const stride = Math.max(1, Math.floor(n / 4600));
  const rawSamples = [];
  let sumL0 = 0, sumA0 = 0, sumB0 = 0;
  const mag = edgeField ? edgeField.mag : null;

  const compLab = (labels && n > 0) ? labels[pixels[0]] : -999;
  for (let i = 0; i < n; i += stride) {
    const p = pixels[i];
    if (mag && mag[p] > 5.2 && n > 160) continue;
    const x = p % w, y = (p / w) | 0;
    if (labels && compLab >= 0 && n > 96) {
      if (x <= 1 || x >= w - 2 || y <= 1 || y >= h - 2) continue;
      if (labels[p - 1] !== compLab || labels[p + 1] !== compLab || labels[p - w] !== compLab || labels[p + w] !== compLab ||
          labels[p - 2] !== compLab || labels[p + 2] !== compLab || labels[p - 2 * w] !== compLab || labels[p + 2 * w] !== compLab) {
        continue;
      }
    }
    const i4 = p * 4;
    const r = rawRgba[i4], g = rawRgba[i4 + 1], b = rawRgba[i4 + 2];
    const [L, a, b2] = rgb2lab(r, g, b);
    sumL0 += L; sumA0 += a; sumB0 += b2;
    rawSamples.push({ x, y, r, g, b, L, a, b2 });
  }

  if (rawSamples.length < 14) return null;
  /* Pangkas 10% piksel outlier warna (mis. piksel tepi bulu mata atau garis gelap yang ikut terserap ke dalam komponen)
     agar varians 2D-nya tidak merusak rasio rmseLin / rmseSolid! */
  let samples = rawSamples;
  if (rawSamples.length >= 32) {
    const m0 = rawSamples.length;
    const cL = sumL0 / m0, cA = sumA0 / m0, cB = sumB0 / m0;
    for (let i = 0; i < m0; i++) {
      const s = rawSamples[i];
      s.d2Med = (s.L - cL) ** 2 + (s.a - cA) ** 2 + (s.b2 - cB) ** 2;
    }
    const sortedByOutlier = rawSamples.slice().sort((a, b) => a.d2Med - b.d2Med);
    samples = sortedByOutlier.slice(0, Math.max(16, Math.floor(m0 * 0.90)));
  }

  const m = samples.length;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let sumR = 0, sumG = 0, sumB = 0, sumL = 0, sumA = 0, sumB2 = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y; if (s.y > maxY) maxY = s.y;
    sumR += s.r; sumG += s.g; sumB += s.b;
    sumL += s.L; sumA += s.a; sumB2 += s.b2;
  }
  const meanR = sumR / m, meanG = sumG / m, meanB = sumB / m;
  const meanL = sumL / m, meanA = sumA / m, meanB2 = sumB2 / m;
  const baseHex = hexOf(meanR, meanG, meanB);
  if (meanL < 15.8 && !(palEntry && palEntry.isGradientSuperRegion) && !(opt && opt.forceGradient)) return null;

  let sseSolid = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    sseSolid += (s.L - meanL) ** 2 + (s.a - meanA) ** 2 + (s.b2 - meanB2) ** 2;
  }
  const rmseSolid = Math.sqrt(sseSolid / m);
  const forceGrad = !!(opt && opt.forceGradient);
  const isSuper = !!(palEntry && palEntry.isGradientSuperRegion);
  if (rmseSolid < (forceGrad ? 0.55 : isSuper ? 0.85 : 1.15)) return null;

  const cx0 = 0.5 * (minX + maxX), cy0 = 0.5 * (minY + maxY);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  let sxx = 0, syy = 0, sxy = 0;
  let sxL = 0, syL = 0, sxA = 0, syA = 0, sxB = 0, syB = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const dx = (s.x - cx0) / spanX, dy = (s.y - cy0) / spanY;
    const dL = s.L - meanL, dA = s.a - meanA, dB = s.b2 - meanB2;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    sxL += dx * dL; syL += dy * dL;
    sxA += dx * dA; syA += dy * dA;
    sxB += dx * dB; syB += dy * dB;
  }
  const det = sxx * syy - sxy * sxy;
  let ux = 0, uy = 1;
  if (Math.abs(det) > 1e-9) {
    const gxL = (syy * sxL - sxy * syL) / det / spanX;
    const gyL = (sxx * syL - sxy * sxL) / det / spanY;
    const gxA = (syy * sxA - sxy * syA) / det / spanX;
    const gyA = (sxx * syA - sxy * sxA) / det / spanY;
    const gxB = (syy * sxB - sxy * syB) / det / spanX;
    const gyB = (sxx * syB - sxy * sxB) / det / spanY;
    const jxx = gxL * gxL + gxA * gxA * 1.35 + gxB * gxB;
    const jyy = gyL * gyL + gyA * gyA * 1.35 + gyB * gyB;
    const jxy = gxL * gyL + gxA * gyA * 1.35 + gxB * gyB;
    const theta = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
    ux = Math.cos(theta); uy = Math.sin(theta);
    if (uy < -0.1 || (Math.abs(uy) <= 0.1 && ux < 0)) { ux = -ux; uy = -uy; }
    const deg = Math.abs(Math.atan2(uy, ux) * 180 / Math.PI);
    if (Math.abs(deg - 90) <= 5.0) { ux = 0; uy = 1; }
    else if (deg <= 5.0 || Math.abs(deg - 180) <= 5.0) { ux = 1; uy = 0; }
  }

  let tMin = Infinity, tMax = -Infinity;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const t = s.x * ux + s.y * uy;
    s.t = t;
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
  }
  const tSpan = Math.max(1e-3, tMax - tMin);
  const BINS = clamp(Math.round(Math.sqrt(m) * 0.45), 10, 28);
  const binSamples = Array.from({ length: BINS }, () => []);
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const bi = Math.min(BINS - 1, Math.max(0, Math.floor(((s.t - tMin) / tSpan) * BINS)));
    binSamples[bi].push(s);
  }

  const binStops = [];
  for (let b = 0; b < BINS; b++) {
    const arr = binSamples[b];
    if (!arr.length) continue;
    arr.sort((a, c) => (a.L - a.a * 0.35) - (c.L - c.a * 0.35));
    const qLow = Math.floor(arr.length * 0.08), qHigh = Math.max(qLow + 1, Math.ceil(arr.length * 0.92));
    let sr = 0, sg = 0, sb = 0, sL = 0, sa = 0, sb2 = 0, cnt = 0;
    for (let k = qLow; k < qHigh; k++) {
      sr += arr[k].r; sg += arr[k].g; sb += arr[k].b;
      sL += arr[k].L; sa += arr[k].a; sb2 += arr[k].b2;
      cnt++;
    }
    if (!cnt) continue;
    binStops.push({
      offset: +((b + 0.5) / BINS).toFixed(4),
      r: sr / cnt, g: sg / cnt, b: sb / cnt,
      L: sL / cnt, a: sa / cnt, b2: sb2 / cnt,
      color: hexOf(sr / cnt, sg / cnt, sb / cnt),
      op: 1
    });
  }
  if (binStops.length < 2) return null;
  binStops[0].offset = 0;
  binStops[binStops.length - 1].offset = 1;

  /* Haluskan deret binStops (2 pass untuk Super-Region latar agar transisi ekstra mulus) */
  const smoothPasses = (n > w * h * 0.12) ? 2 : 1;
  if (binStops.length >= 4) {
    for (let sp = 0; sp < smoothPasses; sp++) {
      for (let i = 1; i < binStops.length - 1; i++) {
        const p = binStops[i - 1], c = binStops[i], nx = binStops[i + 1];
        const mr = 0.20 * p.r + 0.60 * c.r + 0.20 * nx.r;
        const mg = 0.20 * p.g + 0.60 * c.g + 0.20 * nx.g;
        const mb = 0.20 * p.b + 0.60 * c.b + 0.20 * nx.b;
        const [mL, ma, mb2] = rgb2lab(mr, mg, mb);
        c.r = mr; c.g = mg; c.b = mb; c.L = mL; c.a = ma; c.b2 = mb2;
        c.color = hexOf(mr, mg, mb);
      }
    }
  }

  /* 1D Ramer-Douglas-Peucker pada profil warna CIE-Lab */
  const keepStop = new Uint8Array(binStops.length);
  keepStop[0] = keepStop[binStops.length - 1] = 1;
  const rdpStack = [[0, binStops.length - 1]];
  while (rdpStack.length) {
    const [i0, i1] = rdpStack.pop();
    if (i1 - i0 <= 1) continue;
    const s0 = binStops[i0], s1 = binStops[i1];
    const du = Math.max(1e-6, s1.offset - s0.offset);
    let maxD = 0, maxIdx = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const si = binStops[i];
      const wgt = (si.offset - s0.offset) / du;
      const pL = s0.L + wgt * (s1.L - s0.L);
      const pa = s0.a + wgt * (s1.a - s0.a);
      const pb2 = s0.b2 + wgt * (s1.b2 - s0.b2);
      const d = Math.hypot(si.L - pL, si.a - pa, si.b2 - pb2);
      if (d > maxD) { maxD = d; maxIdx = i; }
    }
    if (maxD > 0.42 && maxIdx > 0) {
      keepStop[maxIdx] = 1;
      rdpStack.push([i0, maxIdx], [maxIdx, i1]);
    }
  }
  const stops = binStops.filter((_, idx) => keepStop[idx]);

  const evalStopsAt = u => {
    const uc = clamp(u, 0, 1);
    for (let k = 0; k < stops.length - 1; k++) {
      const a = stops[k], b = stops[k + 1];
      if (uc <= b.offset || k === stops.length - 2) {
        const t = (uc - a.offset) / Math.max(1e-6, b.offset - a.offset);
        return [a.L + t * (b.L - a.L), a.a + t * (b.a - a.a), a.b2 + t * (b.b2 - a.b2)];
      }
    }
    const last = stops[stops.length - 1];
    return [last.L, last.a, last.b2];
  };

  let sseLin = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const u = (s.t - tMin) / tSpan;
    const [pL, pa, pb2] = evalStopsAt(u);
    sseLin += (s.L - pL) ** 2 + (s.a - pa) ** 2 + (s.b2 - pb2) ** 2;
  }
  const rmseLin = Math.sqrt(sseLin / m);

  let maxStopSpread = 0;
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const sp = Math.hypot(stops[j].L - stops[i].L, stops[j].a - stops[i].a, stops[j].b2 - stops[i].b2);
      if (sp > maxStopSpread) maxStopSpread = sp;
    }
  }

  /* Evaluasi Radial Gradient untuk objek kompak/memancar maupun Blush Pink Pipi (puncak kroma a* atau luminansi L*) */
  const aspect = Math.max(spanX, spanY) / Math.max(1, Math.min(spanX, spanY));
  const isPinkBlushRegion = meanL >= 70 && meanL <= 93 && meanA >= 9.0 && cy0 < h * 0.42 && n < w * h * 0.04;
  if ((aspect <= 3.2 && n < w * h * 0.22) || isPinkBlushRegion) {
    /* Hitung warna referensi tepi luar (outer ring) agar pusat rona merah muda pipi (blush) maupun titik cahaya terdeteksi akurat */
    let ringL = 0, ringA = 0, ringB2 = 0, ringN = 0;
    const radHalfX = Math.max(1, spanX * 0.5), radHalfY = Math.max(1, spanY * 0.5);
    for (let i = 0; i < m; i++) {
      const s = samples[i];
      const nr = Math.hypot((s.x - cx0) / radHalfX, (s.y - cy0) / radHalfY);
      if (nr >= 0.72) {
        ringL += s.L; ringA += s.a; ringB2 += s.b2; ringN++;
      }
    }
    if (ringN >= 4) { ringL /= ringN; ringA /= ringN; ringB2 /= ringN; }
    else { ringL = meanL; ringA = meanA; ringB2 = meanB2; }

    let sumW = 0, fxSum = 0, fySum = 0;
    for (let i = 0; i < m; i++) {
      const s = samples[i];
      const dChroma = isPinkBlushRegion
        ? Math.max(0.1, (s.a - ringA) * 2.2 + (ringL - s.L) * 0.8)
        : Math.hypot((s.a - ringA) * 1.55, (s.b2 - ringB2) * 1.15);
      const dLight = Math.abs(s.L - ringL);
      const wgt = Math.pow(Math.max(0.1, dChroma + dLight * 0.85), 2);
      fxSum += s.x * wgt; fySum += s.y * wgt; sumW += wgt;
    }
    const fx = sumW > 0 ? fxSum / sumW : cx0;
    const fy = sumW > 0 ? fySum / sumW : cy0;
    let rMax = 1;
    for (let i = 0; i < m; i++) {
      const dR = Math.hypot(samples[i].x - fx, samples[i].y - fy);
      samples[i].rad = dR;
      if (dR > rMax) rMax = dR;
    }
    const RBINS = 10;
    const rBins = Array.from({ length: RBINS }, () => []);
    for (let i = 0; i < m; i++) {
      const bi = Math.min(RBINS - 1, Math.floor((samples[i].rad / rMax) * RBINS));
      rBins[bi].push(samples[i]);
    }
    const rStops = [];
    for (let b = 0; b < RBINS; b++) {
      const arr = rBins[b];
      if (!arr.length) continue;
      let sr = 0, sg = 0, sb = 0, sL = 0, sa = 0, sb2 = 0;
      for (const it of arr) { sr += it.r; sg += it.g; sb += it.b; sL += it.L; sa += it.a; sb2 += it.b2; }
      const c = arr.length;
      rStops.push({ offset: +(b / (RBINS - 1)).toFixed(4), L: sL / c, a: sa / c, b2: sb2 / c, color: hexOf(sr / c, sg / c, sb / c), op: 1 });
    }
    let radSpread = 0;
    for (let i = 0; i < rStops.length; i++) {
      for (let j = i + 1; j < rStops.length; j++) {
        const sp = Math.hypot(rStops[j].L - rStops[i].L, rStops[j].a - rStops[i].a, rStops[j].b2 - rStops[i].b2);
        if (sp > radSpread) radSpread = sp;
      }
    }
    if (rStops.length >= 3) {
      rStops[0].offset = 0; rStops[rStops.length - 1].offset = 1;
      let sseRad = 0;
      for (let i = 0; i < m; i++) {
        const u = clamp(samples[i].rad / rMax, 0, 1);
        const idx = Math.min(rStops.length - 2, Math.floor(u * (rStops.length - 1)));
        const a = rStops[idx], b = rStops[idx + 1];
        const t = (u - a.offset) / Math.max(1e-6, b.offset - a.offset);
        const pL = a.L + t * (b.L - a.L), pa = a.a + t * (b.a - a.a), pb2 = a.b2 + t * (b.b2 - a.b2);
        sseRad += (samples[i].L - pL) ** 2 + (samples[i].a - pa) ** 2 + (samples[i].b2 - pb2) ** 2;
      }
      const rmseRad = Math.sqrt(sseRad / m);
      const radLinMult = isPinkBlushRegion ? 1.06 : 0.96;
      const radSolMult = isPinkBlushRegion ? 0.98 : 0.93;
      if (rmseRad < rmseLin * radLinMult && rmseRad < rmseSolid * radSolMult && Math.max(maxStopSpread, radSpread) >= 1.8) {
        return {
          type: 'radial',
          base: baseHex,
          cx: +(cx0 * scale).toFixed(2),
          cy: +(cy0 * scale).toFixed(2),
          r: +(rMax * scale).toFixed(2),
          fx: +(fx * scale).toFixed(2),
          fy: +(fy * scale).toFixed(2),
          stops: rStops.map(s => ({ offset: s.offset, color: s.color, op: s.op }))
        };
      }
    }
  }

  const linRatioThr = (isSuper || forceGrad) ? 0.992 : 0.955;
  if (maxStopSpread >= (forceGrad ? 1.15 : isSuper ? 1.45 : 1.8) && rmseLin < rmseSolid * linRatioThr) {
    const pMeanT = cx0 * ux + cy0 * uy;
    const x1 = (cx0 + (tMin - pMeanT) * ux) * scale;
    const y1 = (cy0 + (tMin - pMeanT) * uy) * scale;
    const x2 = (cx0 + (tMax - pMeanT) * ux) * scale;
    const y2 = (cy0 + (tMax - pMeanT) * uy) * scale;
    return {
      type: 'linear',
      base: baseHex,
      x1: +x1.toFixed(2), y1: +y1.toFixed(2),
      x2: +x2.toFixed(2), y2: +y2.toFixed(2),
      stops: stops.map(s => ({ offset: s.offset, color: s.color, op: s.op }))
    };
  }
  return null;
}

function applyUserGradOverride(fittedGrad, userGrad) {
  if (!userGrad || !userGrad.stops || userGrad.stops.length < 2) return fittedGrad;
  const stops = userGrad.stops.map(s => ({ offset: s.offset, color: s.color, op: s.op ?? 1 }));
  const base = stops[Math.floor(stops.length / 2)].color || stops[0].color;
  if (!fittedGrad) {
    return {
      type: userGrad.type || 'linear',
      base,
      x1: userGrad.x1 ?? 0, y1: userGrad.y1 ?? 0,
      x2: userGrad.x2 ?? 100, y2: userGrad.y2 ?? 100,
      cx: userGrad.cx ?? 50, cy: userGrad.cy ?? 50, r: userGrad.r ?? 50,
      fx: userGrad.fx ?? 50, fy: userGrad.fy ?? 50,
      stops
    };
  }
  return {
    ...fittedGrad,
    type: userGrad.type || fittedGrad.type,
    base,
    stops
  };
}

function attachGradientsToRegions(regs, labels, w, h, rawWork, scale, W, H, edgeField = null, palette = null, opt = {}) {
  if (opt && opt.gradientMode === 'off') {
    if (regs) {
      for (const rg of regs) {
        rg.grad = null;
        if (rg.loops) for (const lp of rg.loops) lp.grad = null;
      }
    }
    if (palette) {
      for (const pe of palette) { pe.grad = null; pe.isGradient = false; }
    }
    return regs;
  }
  const rawRgba = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === w * h * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);
  if (!rawRgba || !labels || !regs || !regs.length) return regs;
  const fitOpt = { forceGradient: !!(opt && (opt.forceGradient || opt.gradientMode === 'on')) };

  /* Petakan piksel per komponen terhubung (4-connected) agar setiap pulau poligon mendapat gradasi lokalnya sendiri */
  const n = w * h;
  const compId = new Int32Array(n).fill(-1);
  const compPixels = [];
  const compBbs = [];
  const compLabs = [];
  const q = new Int32Array(n);

  for (let p = 0; p < n; p++) {
    const lab = labels[p];
    if (lab < 0 || compId[p] >= 0) continue;
    const cid = compPixels.length;
    let head = 0, tail = 0;
    q[tail++] = p; compId[p] = cid;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    while (head < tail) {
      const cur = q[head++];
      const x = cur % w, y = (cur / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && labels[cur - 1] === lab && compId[cur - 1] < 0) { compId[cur - 1] = cid; q[tail++] = cur - 1; }
      if (x < w - 1 && labels[cur + 1] === lab && compId[cur + 1] < 0) { compId[cur + 1] = cid; q[tail++] = cur + 1; }
      if (y > 0 && labels[cur - w] === lab && compId[cur - w] < 0) { compId[cur - w] = cid; q[tail++] = cur - w; }
      if (y < h - 1 && labels[cur + w] === lab && compId[cur + w] < 0) { compId[cur + w] = cid; q[tail++] = cur + w; }
    }
    compPixels.push(Int32Array.from(q.subarray(0, tail)));
    compBbs.push([minX * scale, minY * scale, (maxX + 1) * scale, (maxY + 1) * scale]);
    compLabs.push(lab);
  }

  const byLabComps = new Map();
  for (let cid = 0; cid < compPixels.length; cid++) {
    const lab = compLabs[cid];
    if (!byLabComps.has(lab)) byLabComps.set(lab, []);
    byLabComps.get(lab).push(cid);
  }

  const cidGradCache = new Map();
  for (const rg of regs) {
    const cids = byLabComps.get(rg.label) || [];
    if (!cids.length) continue;
    const palEntry = palette ? palette[rg.label] : null;
    /* Cari komponen terbesar untuk gradasi tingkat region */
    let largestCid = cids[0];
    for (const cid of cids) {
      if (compPixels[cid].length > compPixels[largestCid].length) largestCid = cid;
    }
    const userGrad = palEntry && palEntry.userGrad ? palEntry.userGrad : null;
    rg.grad = fitComponentGradientFromPixels(compPixels[largestCid], w, h, rawRgba, scale, W, H, edgeField, palEntry, fitOpt, labels);
    if (userGrad) rg.grad = applyUserGradOverride(rg.grad, userGrad);
    cidGradCache.set(largestCid, rg.grad);
    if (rg.grad && rg.grad.base) rg.color = rg.grad.base;

    /* Cocokkan setiap outer loop di rg.loops ke cid tepat di titik interiornya (inPt) atau bounding-box lokalnya */
    let repLoopGrad = rg.grad || null;
    for (const lp of (rg.loops || [])) {
      const sArea = typeof lp.signedArea === 'number' ? lp.signedArea : signedPolyArea(lp.pts);
      if (sArea > 0) continue; /* hole */
      const st = polyStats(lp.pts);
      const lbb = st.bb;
      const wx = clamp(Math.floor((st.inPt ? st.inPt[0] : st.c[0]) / scale), 0, w - 1);
      const wy = clamp(Math.floor((st.inPt ? st.inPt[1] : st.c[1]) / scale), 0, h - 1);
      let bestCid = compId[wy * w + wx];
      if (bestCid < 0 || compLabs[bestCid] !== rg.label) {
        bestCid = -1;
        let bestDist = Infinity;
        for (const cid of cids) {
          const cbb = compBbs[cid];
          const d = Math.hypot((lbb[0] + lbb[2]) * 0.5 - (cbb[0] + cbb[2]) * 0.5, (lbb[1] + lbb[3]) * 0.5 - (cbb[1] + cbb[3]) * 0.5);
          if (d < bestDist) { bestDist = d; bestCid = cid; }
        }
      }
      if (bestCid >= 0 && compPixels[bestCid].length >= 42) {
        let g = null;
        const cbb = compBbs[bestCid];
        const loopBoxArea = Math.max(1, (lbb[2] - lbb[0]) * (lbb[3] - lbb[1]));
        const compBoxArea = Math.max(1, (cbb[2] - cbb[0]) * (cbb[3] - cbb[1]));
        /* Jika loop ini merupakan sub-bagian signifikan (>= 160 px) dari komponen besar,
           pindai cepat kisi 2D di dalam bounding-box loop tersebut untuk fitting gradasi lokal */
        if (loopBoxArea < compBoxArea * 0.72 && loopBoxArea >= 160 * scale * scale) {
          const x0 = Math.max(0, Math.floor(lbb[0] / scale) - 2);
          const y0 = Math.max(0, Math.floor(lbb[1] / scale) - 2);
          const x1 = Math.min(w - 1, Math.ceil(lbb[2] / scale) + 2);
          const y1 = Math.min(h - 1, Math.ceil(lbb[3] / scale) + 2);
          const subPx = [];
          const stepXY = Math.max(1, Math.floor(Math.sqrt((x1 - x0 + 1) * (y1 - y0 + 1)) / 64));
          for (let py = y0; py <= y1; py += stepXY) {
            const row = py * w;
            for (let px = x0; px <= x1; px += stepXY) {
              const p = row + px;
              if (compId[p] === bestCid) subPx.push(p);
            }
          }
          if (subPx.length >= 48) {
            g = fitComponentGradientFromPixels(subPx, w, h, rawRgba, scale, W, H, edgeField, palEntry, fitOpt, labels);
          }
        }
        if (!g) {
          if (!cidGradCache.has(bestCid)) {
            cidGradCache.set(bestCid, fitComponentGradientFromPixels(compPixels[bestCid], w, h, rawRgba, scale, W, H, edgeField, palEntry, fitOpt, labels));
          }
          g = cidGradCache.get(bestCid);
        }
        if (userGrad) g = applyUserGradOverride(g, userGrad);
        if (g) {
          lp.grad = g;
          if (!repLoopGrad) repLoopGrad = g;
        }
      }
    }
    if (palEntry && repLoopGrad && repLoopGrad.stops && repLoopGrad.stops.length >= 2) {
      palEntry.isGradient = true;
      palEntry.grad = {
        type: repLoopGrad.type,
        base: repLoopGrad.base || palEntry.hex,
        x1: repLoopGrad.x1, y1: repLoopGrad.y1, x2: repLoopGrad.x2, y2: repLoopGrad.y2,
        cx: repLoopGrad.cx, cy: repLoopGrad.cy, r: repLoopGrad.r, fx: repLoopGrad.fx, fy: repLoopGrad.fy,
        stops: repLoopGrad.stops.map(s => ({ offset: s.offset, color: s.color, op: s.op ?? 1 }))
      };
    }
  }
  return regs;
}

/* Konsolidasi Palet Pra-Tracing & Saat-Tracing:
   Menggabungkan warna-warna sabuk gradasi menjadi 1 entri Palet Gradient (Linear/Radial)
   dan membatasi jumlah total palet <= maxColors bila Max Color diaktifkan. */
function consolidateGradientPalette(work, mask, rawPalette, edgeField = null, cls = null, opt = {}) {
  if (!rawPalette || !rawPalette.length) {
    return { items: [], hexes: [], hasGradient: false, gradientCount: 0 };
  }
  const gMode = opt.gradientMode || 'auto';
  const hasDetectedGrad = !!(
    rawPalette._hasSmoothGradient && (!cls || cls.surfaceMode !== 'flat')
  );
  const useGrad = gMode === 'on' || (gMode === 'auto' && hasDetectedGrad);
  const maxC = (opt.maxColorEnabled && opt.maxColors >= 2) ? Math.max(2, Math.round(opt.maxColors)) : 0;

  const baseItems = rawPalette.map(c => {
    const r = c.r != null ? Math.round(c.r) : rgbOf(c.hex || '#000000')[0];
    const g = c.g != null ? Math.round(c.g) : rgbOf(c.hex || '#000000')[1];
    const b = c.b != null ? Math.round(c.b) : rgbOf(c.hex || '#000000')[2];
    const [L, a, b2] = (c.L != null) ? [c.L, c.a, c.b2] : rgb2lab(r, g, b);
    return {
      r, g, b, L, a, b2,
      hex: (c.hex || hexOf(r, g, b)).toLowerCase(),
      count: c.count || 1,
      verifiedPlateau: !!c.verifiedPlateau,
      isGradCluster: !!c.isGradCluster,
      isGradient: false,
      grad: null
    };
  });
  baseItems._hasSmoothGradient = hasDetectedGrad;

  if (!useGrad || !work || !work.data) {
    let flatList = [];
    for (const item of baseItems) {
      const dup = flatList.find(u => u.hex === item.hex || ciede2000(item.L, item.a, item.b2, u.L, u.a, u.b2) < 2.2);
      if (!dup) flatList.push(item);
    }
    if (maxC > 0 && flatList.length > maxC) {
      while (flatList.length > maxC) {
        let bi = 0, bj = 1, bCost = Infinity;
        for (let i = 0; i < flatList.length; i++) {
          for (let j = i + 1; j < flatList.length; j++) {
            const de = ciede2000(flatList[i].L, flatList[i].a, flatList[i].b2, flatList[j].L, flatList[j].a, flatList[j].b2);
            const cost = de * (1 + 0.18 * Math.log(1 + Math.min(flatList[i].count || 1, flatList[j].count || 1)));
            if (cost < bCost) { bCost = cost; bi = i; bj = j; }
          }
        }
        const ca = flatList[bi], cb = flatList[bj];
        const keep = (ca.count || 1) >= (cb.count || 1) ? ca : cb;
        const drop = keep === ca ? cb : ca;
        const tot = (keep.count || 1) + (drop.count || 1);
        keep.r = Math.round((keep.r * (keep.count || 1) + drop.r * (drop.count || 1)) / tot);
        keep.g = Math.round((keep.g * (keep.count || 1) + drop.g * (drop.count || 1)) / tot);
        keep.b = Math.round((keep.b * (keep.count || 1) + drop.b * (drop.count || 1)) / tot);
        const [nL, na, nb2] = rgb2lab(keep.r, keep.g, keep.b);
        keep.L = nL; keep.a = na; keep.b2 = nb2;
        keep.hex = hexOf(keep.r, keep.g, keep.b).toLowerCase();
        keep.count = tot;
        flatList.splice(keep === ca ? bj : bi, 1);
      }
    }
    return {
      items: flatList,
      hexes: flatList.map(c => c.hex.toLowerCase()),
      hasGradient: false,
      gradientCount: 0
    };
  }

  /* Simulasikan peta label cepat pada work dan jalankan unifyGradientBands + fitting gradient */
  const w = work.w || work.data.width, h = work.h || work.data.height;
  const n = w * h;
  const d = (work.rawRgba && work.rawRgba.length === n * 4) ? work.rawRgba : work.data.data;
  const ef = edgeField || buildEdgeField(work, mask);
  const pLabels = new Int16Array(n).fill(-1);
  const K0 = baseItems.length;
  for (let p = 0; p < n; p++) {
    if (mask && mask[p]) continue;
    const i4 = p * 4;
    const r = d[i4], g = d[i4 + 1], b = d[i4 + 2];
    let bestK = 0, bestD = Infinity;
    for (let k = 0; k < K0; k++) {
      const c = baseItems[k];
      const dist = cdist2(r, g, b, c.r, c.g, c.b);
      if (dist < bestD) { bestD = dist; bestK = k; }
    }
    pLabels[p] = bestK;
  }
  const detailProt = buildDetailProtection(pLabels, w, h, work, baseItems, mask);
  pLabels._detailProt = detailProt;
  enforceMinPixels(pLabels, w, h, Math.max(4, Math.round(n / 18000)), work, baseItems);

  const palCopy = baseItems.map(c => ({ ...c }));
  palCopy._hasSmoothGradient = true;
  unifyGradientBands(pLabels, w, h, work, mask, palCopy, ef, cls, {
    gradientMode: gMode,
    forceGradient: gMode === 'on',
    maxColorEnabled: opt.maxColorEnabled,
    maxColors: opt.maxColors,
    attachPreviewGradients: true
  });

  const outItems = palCopy.map(c => ({
    ...c,
    hex: (c.hex || hexOf(c.r, c.g, c.b)).toLowerCase(),
    isGradient: !!(c.grad && c.grad.stops && c.grad.stops.length >= 2),
    grad: (c.grad && c.grad.stops && c.grad.stops.length >= 2) ? c.grad : null
  }));
  const gradCnt = outItems.filter(c => c.isGradient).length;
  return {
    items: outItems,
    hexes: outItems.map(c => c.hex),
    hasGradient: gradCnt > 0,
    gradientCount: gradCnt
  };
}

/* Terapkan perubahan Max Color & Gradient Mode secara instan pada sesi hasil tracing (sess) */
function applySessionPaletteAndGradientSettings(sess, opt = {}) {
  if (!sess || !sess.regs || !sess.palette) return sess;
  if (!sess._baseSnapshot) {
    sess._baseSnapshot = {
      labels: sess.labels ? new Int16Array(sess.labels) : null,
      palette: sess.palette.map(c => ({
        ...c,
        grad: c.grad ? { ...c.grad, stops: c.grad.stops ? c.grad.stops.map(s => ({ ...s })) : [] } : null
      })),
      regs: sess.regs.map(rg => ({
        ...rg,
        grad: rg.grad ? { ...rg.grad, stops: rg.grad.stops ? rg.grad.stops.map(s => ({ ...s })) : [] } : null,
        loops: (rg.loops || []).map(lp => ({
          ...lp,
          grad: lp.grad ? { ...lp.grad, stops: lp.grad.stops ? lp.grad.stops.map(s => ({ ...s })) : [] } : null
        }))
      }))
    };
  }
  const snap = sess._baseSnapshot;
  const gMode = opt.gradientMode || 'auto';
  const maxOn = !!opt.maxColorEnabled;
  const maxC = (maxOn && opt.maxColors >= 2) ? Math.max(2, Math.round(opt.maxColors)) : 0;

  let nextPal = snap.palette.map(c => ({
    ...c,
    grad: c.grad ? { ...c.grad, stops: c.grad.stops ? c.grad.stops.map(s => ({ ...s })) : [] } : null
  }));
  let nextRegs = snap.regs.map(rg => ({
    ...rg,
    grad: rg.grad ? { ...rg.grad, stops: rg.grad.stops ? rg.grad.stops.map(s => ({ ...s })) : [] } : null,
    loops: (rg.loops || []).map(lp => ({
      ...lp,
      grad: lp.grad ? { ...lp.grad, stops: lp.grad.stops ? lp.grad.stops.map(s => ({ ...s })) : [] } : null
    }))
  }));
  let nextLabels = snap.labels ? new Int16Array(snap.labels) : null;

  /* Jika Max Color aktif dan jumlah palet > maxC, lebur region & palet berlebih */
  if (maxC > 0 && nextPal.length > maxC) {
    while (nextPal.length > maxC) {
      let bFrom = -1, bTo = -1, bCost = Infinity;
      const areaByLab = new Float64Array(nextPal.length);
      for (const rg of nextRegs) {
        if (rg.label >= 0 && rg.label < nextPal.length) areaByLab[rg.label] += (rg.area || 1);
      }
      for (let i = 0; i < nextPal.length; i++) {
        for (let j = i + 1; j < nextPal.length; j++) {
          const ci = nextPal[i], cj = nextPal[j];
          const [Li, ai, bi2] = ci.L != null ? [ci.L, ci.a, ci.b2] : rgb2lab(ci.r, ci.g, ci.b);
          const [Lj, aj, bj2] = cj.L != null ? [cj.L, cj.a, cj.b2] : rgb2lab(cj.r, cj.g, cj.b);
          const de = ciede2000(Li, ai, bi2, Lj, aj, bj2);
          const minA = Math.min(areaByLab[i] || 1, areaByLab[j] || 1);
          const cost = (de + 1.0) * (1 + 0.22 * Math.log(1 + minA / 80));
          if (cost < bCost) {
            bCost = cost;
            if ((areaByLab[i] || 1) <= (areaByLab[j] || 1)) { bFrom = i; bTo = j; }
            else { bFrom = j; bTo = i; }
          }
        }
      }
      if (bFrom < 0 || bTo < 0) break;
      const rgFrom = nextRegs.find(r => r.label === bFrom);
      const rgTo = nextRegs.find(r => r.label === bTo);
      if (rgFrom && rgTo) {
        rgTo.loops = rgTo.loops.concat(rgFrom.loops);
        rgTo.area = (rgTo.area || 0) + (rgFrom.area || 0);
        if (!rgTo.grad && rgFrom.grad) rgTo.grad = rgFrom.grad;
        nextRegs = nextRegs.filter(r => r !== rgFrom);
      } else if (rgFrom) {
        rgFrom.label = bTo;
      }
      if (nextLabels) {
        for (let p = 0; p < nextLabels.length; p++) {
          if (nextLabels[p] === bFrom) nextLabels[p] = bTo;
          else if (nextLabels[p] > bFrom) nextLabels[p]--;
        }
      }
      nextPal.splice(bFrom, 1);
      for (const rg of nextRegs) {
        if (rg.label > bFrom) rg.label--;
      }
    }
  }

  /* Terapkan Gradient Mode */
  const hasDetectedGrad = !!(
    (sess.cls && (sess.cls.surfaceMode === 'gradient' || sess.cls.surfaceMode === 'mixed' || sess.cls.gradientContinuity >= 0.14)) ||
    snap.palette.some(c => c.grad)
  );
  const useGrad = gMode === 'on' || (gMode === 'auto' && hasDetectedGrad);
  if (!useGrad) {
    for (const pe of nextPal) { pe.grad = null; pe.isGradient = false; }
    for (const rg of nextRegs) {
      rg.grad = null;
      rg.color = (nextPal[rg.label] && nextPal[rg.label].hex) || rg.color;
      if (rg.loops) for (const lp of rg.loops) lp.grad = null;
    }
  } else if (nextLabels && (sess.rawRgba || sess.workData)) {
    attachGradientsToRegions(
      nextRegs, nextLabels, sess.w, sess.h,
      { data: sess.workData, rawRgba: sess.rawRgba },
      sess.scale, sess.W, sess.H, null, nextPal,
      { gradientMode: gMode, forceGradient: gMode === 'on' }
    );
  }

  const svg = assembleSVG(nextRegs, sess.W, sess.H, {
    stackMode: opt.stackMode || 'stack',
    stroke: opt.stroke !== false,
    bg: 'none',
    safetyBg: !(sess.stats && sess.stats.alpha && sess.stats.alpha.hasAlpha),
    hiddenLabels: [],
  });

  if (sess.traceHistory) {
    sess.traceHistory.palette = nextPal;
    sess.traceHistory.regs = nextRegs;
    sess.traceHistory.svg = svg;
  }

  return {
    ...sess,
    svg,
    regs: nextRegs,
    palette: nextPal,
    labels: nextLabels || sess.labels,
    hiddenLabels: [],
    stats: {
      ...(sess.stats || {}),
      regions: nextRegs.length,
      palette: {
        ...((sess.stats && sess.stats.palette) || {}),
        count: nextPal.length,
        colors: nextPal.map(c => c.hex)
      }
    }
  };
}

function buildRegions(loops, palette, scale, gradCtx = null) {
  const regs = [];
  const byLabel = new Map();
  for (const lp of loops) {
    if (!byLabel.has(lp.label)) byLabel.set(lp.label, []);
    byLabel.get(lp.label).push(lp);
  }
  byLabel.forEach((lps, L) => {
    const c = palette[L] || { r: 0, g: 0, b: 0 };
    let area = 0;
    const items = lps.map(lp => {
      const sArea = (typeof lp.area === 'number' && lp.area !== 0) ? lp.area : signedPolyArea(lp.scaledPts);
      const absA = Math.abs(sArea);
      area += absA;
      return { d: lp.d, area: absA, signedArea: sArea, pts: lp.scaledPts, segs: lp.segs, grad: lp.grad || null };
    });
    regs.push({ label: L, color: hexOf(c.r, c.g, c.b), area: area * scale * scale, loops: items, hidden: false, grad: null });
  });
  regs.sort((a, b) => b.area - a.area);
  if (gradCtx && gradCtx.labels && gradCtx.rawWork) {
    attachGradientsToRegions(regs, gradCtx.labels, gradCtx.w, gradCtx.h, gradCtx.rawWork, gradCtx.scale || scale, gradCtx.W, gradCtx.H, gradCtx.edgeField, palette, {
      gradientMode: gradCtx.gradientMode || 'auto',
      forceGradient: !!gradCtx.forceGradient
    });
  }
  return regs;
}

function interiorPoint(pts, bb, c) {
  if (!pts || !pts.length) return [0, 0];
  if (pip(c[0], c[1], pts)) return c;
  const ys = [c[1], (bb[1] + c[1]) * 0.5, (c[1] + bb[3]) * 0.5, bb[1] + (bb[3] - bb[1]) * 0.33, bb[1] + (bb[3] - bb[1]) * 0.67];
  for (const y of ys) {
    const xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y)) xs.push(xi + (xj - xi) * (y - yi) / (yj - yi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const mx = (xs[k] + xs[k + 1]) * 0.5;
      if (pip(mx, y, pts)) return [mx, y];
    }
  }
  return pts[0];
}

function polyStats(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0;
  const n = pts ? pts.length : 0;
  if (!n) return { bb: [0, 0, 0, 0], c: [0, 0], inPt: [0, 0] };
  for (let i = 0; i < n; i++) {
    const x = pts[i][0], y = pts[i][1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    cx += x; cy += y;
  }
  cx /= n; cy /= n;
  const bb = [x0, y0, x1, y1], c = [cx, cy];
  return { bb, c, inPt: interiorPoint(pts, bb, c) };
}

function loopContainsLoop(outerLp, innerLp, allowEqualArea = false) {
  const ob = outerLp.bb, ib = innerLp.bb;
  if (!outerLp.pts || outerLp.pts.length < 3 || !innerLp.pts || !innerLp.pts.length) return false;
  if (allowEqualArea ? (outerLp.absArea < innerLp.absArea * 0.85) : (outerLp.absArea <= innerLp.absArea * 1.002)) return false;
  const tol = allowEqualArea ? 3.0 : 2.0;
  if (ib[0] < ob[0] - tol || ib[1] < ob[1] - tol || ib[2] > ob[2] + tol || ib[3] > ob[3] + tol) return false;
  const pt = innerLp.inPt || innerLp.c;
  return pip(pt[0], pt[1], outerLp.pts);
}

function decomposeRegionComponents(rg) {
  const outers = [], holes = [];
  for (const lp of (rg.loops || [])) {
    if (!lp.d) continue;
    const sArea = typeof lp.signedArea === 'number' ? lp.signedArea : signedPolyArea(lp.pts);
    const absArea = lp.area || Math.abs(sArea);
    const st = polyStats(lp.pts);
    const item = { d: lp.d, pts: lp.pts || [], segs: lp.segs || [], signedArea: sArea, absArea, bb: st.bb, c: st.c, inPt: st.inPt, holes: [], grad: lp.grad || null };
    if (sArea <= 0) outers.push(item);
    else holes.push(item);
  }
  if (!outers.length && holes.length) {
    holes.sort((a, b) => b.absArea - a.absArea);
    outers.push(holes.shift());
  }
  outers.sort((a, b) => a.absArea - b.absArea);
  for (const h of holes) {
    let best = null;
    for (const o of outers) {
      if (loopContainsLoop(o, h)) { best = o; break; }
    }
    if (best) best.holes.push(h);
  }
  return outers.map(o => ({
    label: rg.label,
    color: (o.grad && o.grad.base) ? o.grad.base : rg.color,
    grad: o.grad || (outers.length === 1 ? rg.grad : null) || null,
    outer: o,
    holes: o.holes,
    keptHoles: o.holes.slice(),
    area: o.absArea,
    bb: o.bb,
    c: o.c,
    parent: null,
    parentHole: null,
    children: [],
    depth: 0,
    effectiveBg: null,
    suppressed: false,
    isFrameBg: false,
  }));
}

function assembleSVG(regs, W, H, opt = {}) {
  const mode = opt.stackMode || 'stack';
  const frameId = opt.frameId === false ? null : (opt.frameId || 'Frame-1');
  const hiddenSet = opt.hiddenLabels instanceof Set ? opt.hiddenLabels : new Set(opt.hiddenLabels || []);
  const activeRegs = regs.filter(rg => !rg.hidden && !hiddenSet.has(rg.label));
  const useAntiGapStroke = opt.stroke && mode !== 'stack';
  const stroke = useAntiGapStroke ? ` stroke-width="${r2(clamp(Math.min(W, H) / 2400, 0.14, 0.24))}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"` : '';

  const allComps = [];
  for (const rg of activeRegs) {
    const cs = decomposeRegionComponents(rg);
    for (const c of cs) allComps.push(c);
  }

  allComps.sort((a, b) => a.area - b.area);
  for (let i = 0; i < allComps.length; i++) {
    const c = allComps[i];
    for (let j = i + 1; j < allComps.length; j++) {
      const p = allComps[j];
      if (loopContainsLoop(p.outer, c.outer)) {
        c.parent = p;
        p.children.push(c);
        let bestHole = null;
        for (const h of p.holes) {
          if (loopContainsLoop(h, c.outer, true) && (!bestHole || h.absArea < bestHole.absArea)) {
            bestHole = h;
          }
        }
        c.parentHole = bestHole;
        break;
      }
    }
  }

  const calcDepth = c => {
    let d = 0, cur = c.parent, g = 0;
    while (cur && g++ < allComps.length + 2) { d++; cur = cur.parent; }
    return d;
  };
  for (const c of allComps) c.depth = calcDepth(c);

  const rowBand = Math.max(8, H * 0.04);
  const readingCmp = (a, b) => {
    if (Math.abs(a.c[1] - b.c[1]) > rowBand) return a.c[1] - b.c[1];
    return a.c[0] - b.c[0];
  };
  /* Urutan render Z-Order cerdas: komponen yang lebih luas (seperti latar langit & laut) dirender lebih dulu (di belakang)
     sebelum objek siluet dan detail kecil (seperti mercusuar, lumba-lumba, pantulan air, dan bintang) */
  const zOrderCmp = (a, b) => {
    const aSpansW = (a.bb[2] - a.bb[0]) >= W * 0.85 ? 1 : 0;
    const bSpansW = (b.bb[2] - b.bb[0]) >= W * 0.85 ? 1 : 0;
    if (aSpansW !== bSpansW) return bSpansW - aSpansW;
    if (Math.abs(a.area - b.area) > Math.max(a.area, b.area) * 0.25) return b.area - a.area;
    return readingCmp(a, b);
  };

  let body = '';
  let frameBgTag = '';
  let defsXml = '';
  let gradSeq = 0;

  const emitGradPaint = (gradObj, fallbackColor) => {
    if (!gradObj || !gradObj.stops || gradObj.stops.length < 2) return fallbackColor;
    const gid = 'svgpeak-grad-' + (++gradSeq);
    const baseAttr = fallbackColor ? ` data-base-color="${fallbackColor}"` : '';
    const stopsXml = gradObj.stops.map(st => {
      const pct = Math.round(clamp(st.offset, 0, 1) * 10000) / 100;
      const opAttr = (st.op != null && st.op < 0.999) ? ` stop-opacity="${r2(st.op)}"` : '';
      return `    <stop offset="${pct}%" stop-color="${st.color}"${opAttr}/>`;
    }).join('\n');
    if (gradObj.type === 'radial') {
      const fxAttr = gradObj.fx != null ? ` fx="${r2(gradObj.fx)}" fy="${r2(gradObj.fy)}"` : '';
      const gtAttr = (gradObj.sy != null && Math.abs(gradObj.sy - 1) > 0.01)
        ? ` data-sy="${r2(gradObj.sy)}" gradientTransform="matrix(1 0 0 ${r2(gradObj.sy)} 0 ${r2(gradObj.cy * (1 - gradObj.sy))})"`
        : '';
      defsXml += `  <radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${r2(gradObj.cx)}" cy="${r2(gradObj.cy)}" r="${r2(gradObj.r)}"${fxAttr}${gtAttr}${baseAttr}>\n${stopsXml}\n  </radialGradient>\n`;
    } else {
      defsXml += `  <linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${r2(gradObj.x1)}" y1="${r2(gradObj.y1)}" x2="${r2(gradObj.x2)}" y2="${r2(gradObj.y2)}"${baseAttr}>\n${stopsXml}\n  </linearGradient>\n`;
    }
    return `url(#${gid})`;
  };

  const hasExplicitBg = !!(opt.bg && opt.bg !== 'none');
  const needSafetyBg = !hasExplicitBg && !!(opt.safetyBg && activeRegs.length > 0 && hiddenSet.size === 0);

  if (mode === 'stack') {
    const roots = allComps.filter(c => !c.parent).sort((a, b) => b.area - a.area);
    let bgComp = null;
    if (roots.length > 0 && allComps.length > 1) {
      const cand = roots[0];
      const b = cand.bb;
      const spansCanvas = b[0] <= W * 0.03 + 2 && b[1] <= H * 0.03 + 2 && b[2] >= W * 0.97 - 2 && b[3] >= H * 0.97 - 2;
      if (spansCanvas && cand.area >= W * H * 0.80) {
        bgComp = cand;
        bgComp.isFrameBg = true;
      }
    }

    if (hasExplicitBg) {
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${opt.bg}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    } else if (bgComp) {
      const bgPaint = emitGradPaint(bgComp.grad, bgComp.color);
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${bgPaint}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    } else if (needSafetyBg) {
      const firstReg = activeRegs[0];
      const safetyPaint = emitGradPaint(firstReg.grad, firstReg.color);
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${safetyPaint}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    }

    const byDepth = allComps.slice().sort((a, b) => a.depth - b.depth || b.area - a.area);
    for (const c of byDepth) {
      if (c.isFrameBg) {
        for (const ch of c.children) ch.effectiveBg = c;
        continue;
      }
      if (!c.parent && bgComp && c !== bgComp) {
        c.effectiveBg = bgComp;
      }
      if (c.suppressed) {
        for (const ch of c.children) ch.effectiveBg = c.effectiveBg;
        continue;
      }
      const kept = [];
      for (const h of c.holes) {
        const fillers = c.children.filter(ch => ch.parentHole === h);
        const filledArea = fillers.reduce((s, ch) => s + ch.area, 0);
        const hasSoftFadeFiller = fillers.some(ch => ch.grad && ch.grad.softFade);
        if (filledArea < h.absArea * 0.78 && !hasSoftFadeFiller) {
          kept.push(h);
          for (const ch of fillers) ch.effectiveBg = c.effectiveBg;
        } else if (fillers.length === 1 && c.effectiveBg && !fillers[0].grad && !c.effectiveBg.grad && fillers[0].color.toLowerCase() === c.effectiveBg.color.toLowerCase()) {
          kept.push(h);
          fillers[0].suppressed = true;
          for (const gch of fillers[0].children) gch.effectiveBg = c.effectiveBg;
        } else {
          for (const ch of fillers) ch.effectiveBg = c;
        }
      }
      c.keptHoles = kept;
      for (const ch of c.children) {
        if (!ch.parentHole && !ch.effectiveBg) ch.effectiveBg = c;
      }
    }

    const visibleComps = allComps.filter(c => !c.isFrameBg && !c.suppressed);
    const readingOrdered = visibleComps.slice().sort(readingCmp);
    readingOrdered.forEach((c, idx) => { c.objName = 'obj-' + (idx + 1); });

    const maxD = visibleComps.reduce((m, c) => Math.max(m, c.depth), 0);
    for (let d = 0; d <= maxD; d++) {
      const level = visibleComps.filter(c => c.depth === d).sort(zOrderCmp);
      for (const c of level) {
        const pathD = c.outer.d + c.keptHoles.map(h => h.d).join('');
        const paint = emitGradPaint(c.grad, c.color);
        const isSoft = !!(c.grad && c.grad.softFade);
        const st = (useAntiGapStroke && !isSoft) ? ` stroke="${paint}"${stroke}` : '';
        body += `<path id="${c.objName}" fill="${paint}"${st} fill-rule="evenodd" d="${pathD}"/>\n`;
      }
    }
  } else {
    if (hasExplicitBg) {
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${opt.bg}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    } else if (needSafetyBg) {
      const firstReg = activeRegs[0];
      const safetyPaint = emitGradPaint(firstReg.grad, firstReg.color);
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${safetyPaint}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    }
    const ordered = allComps.slice().sort(readingCmp);
    ordered.forEach((c, idx) => { c.objName = 'obj-' + (idx + 1); });
    const emitOrder = allComps.slice().sort((a, b) => a.depth - b.depth || zOrderCmp(a, b));
    if (mode === 'grouped') {
      const groups = new Map();
      for (const c of emitOrder) {
        if (!groups.has(c.color)) groups.set(c.color, []);
        groups.get(c.color).push(c);
      }
      groups.forEach((vs, col) => {
        for (const c of vs) {
          const paint = emitGradPaint(c.grad, col);
          const isSoft = !!(c.grad && c.grad.softFade);
          const st = (opt.stroke && !isSoft) ? ` stroke="${paint}"${stroke}` : '';
          const pathD = c.outer.d + (isSoft ? '' : c.holes.map(h => h.d).join(''));
          body += `<path id="${c.objName}" fill="${paint}"${st} fill-rule="evenodd" d="${pathD}"/>\n`;
        }
      });
    } else {
      for (const c of emitOrder) {
        const paint = emitGradPaint(c.grad, c.color);
        const isSoft = !!(c.grad && c.grad.softFade);
        const st = (opt.stroke && !isSoft) ? ` stroke="${paint}"${stroke}` : '';
        const pathD = c.outer.d + (isSoft ? '' : c.holes.map(h => h.d).join(''));
        body += `<path id="${c.objName}" fill="${paint}"${st} fill-rule="evenodd" d="${pathD}"/>\n`;
      }
    }
  }

  const defsBlock = defsXml ? `<defs>\n${defsXml}</defs>\n` : '';
  const innerContent = frameId
    ? `<g id="${frameId}" data-container="frame">\n${frameBgTag}${body}</g>\n`
    : `${frameBgTag}${body}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" height="${r2(H)}">\n${defsBlock}${innerContent}</svg>`;
}

function exportDXF(regs, W, H, mode) {
  const out = ['0', 'SECTION', '2', 'ENTITIES'];
  const sample = (s, tol) => {
    const pts = [];
    const len = Math.hypot(s.P3[0] - s.P0[0], s.P3[1] - s.P0[1]) + 1;
    const nseg = clamp(Math.ceil(len / Math.max(0.5, tol * 8)), 4, 64);
    for (let k = 0; k <= nseg; k++) {
      const [bx, by] = evalBezier(s.P0, s.P1, s.P2, s.P3, k / nseg);
      pts.push([bx, H - by]);
    }
    return pts;
  };
  const tol = mode === 'lines-more' ? 0.25 : 1.0;
  for (const rg of regs) {
    if (rg.hidden) continue;
    for (const lp of rg.loops) {
      const segs = lp.segs || [];
      if (mode === 'spline' && segs.length) {
        const cps = [[segs[0].P0[0], H - segs[0].P0[1]]];
        for (const s of segs) cps.push([s.P1[0], H - s.P1[1]], [s.P2[0], H - s.P2[1]], [s.P3[0], H - s.P3[1]]);
        out.push('0', 'SPLINE', '100', 'AcDbEntity', '8', '0', '100', 'AcDbSpline', '70', '8', '71', '3', '72', String(cps.length), '73', '0', '74', '0');
        for (const [x, y] of cps) out.push('10', r2(x).toFixed(2), '20', r2(y).toFixed(2), '30', '0.0');
      } else {
        let pts = [];
        for (const s of segs) {
          const sp = sample(s, tol);
          pts.push(...sp.slice(pts.length ? 1 : 0));
        }
        if (pts.length < 2) continue;
        out.push('0', 'LWPOLYLINE', '100', 'AcDbEntity', '8', '0', '100', 'AcDbPolyline', '90', String(pts.length), '70', '1');
        for (const [x, y] of pts) out.push('10', r2(x).toFixed(2), '20', r2(y).toFixed(2));
      }
    }
  }
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\n');
}

/* =====================================================================
   Orkestrasi Pipeline Penuh (8 Tahap Mendalam — Target Presisi Tinggi)
   Menggunakan Budget Pacing & Multi-Pass Numerik (10–13 detik) agar
   setiap tahap melakukan iterasi konvergensi penuh tanpa membekukan UI.
   ===================================================================== */
const STAGES = [
  ['classify', '1/7 · Ekstraksi fitur GLCM, entropi & klasifikasi citra'],
  ['palette', '2/7 · Kuantisasi warna CIE-Lab, k-d Tree ANN & evaluasi BIC'],
  ['segment', '3/7 · Dekomposisi QuadTree & optimasi MRF Potts (Simulated Annealing)'],
  ['trace', '4/7 · Graf planar & inversi sub-piksel "Beach Deconvolution"'],
  ['smooth', '5/7 · Penghalusan kontur (Polak-Ribière Conjugate Gradient + Corner Puncturing)'],
  ['fit', '6/7 · Fitting kurva Bézier kubik (Gauss-Newton Re-parameterization & MDL)'],
  ['assemble', '7/7 · Perakitan topologi vektor & verifikasi akhir'],
];

