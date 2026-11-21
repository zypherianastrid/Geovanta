/* =====================================================================
 * JS Module 14: VMT Engine Part 10 — Self-Validating Orchestrator (vectorize, retrace, refit) & Manual Seg Tools
 * ===================================================================== */
/* =====================================================================
   MEKANISME CLOSED-LOOP CALIBRATION & ROUND-TRIP EVALUATOR (Bagian 5 Markdown)
   Menghitung fungsi skor komposit:
     J = wc * E_color + wb * E_boundary + wt * E_topology + wd * E_detail + ws * E_complexity
   beserta metrik Boundary IoU, dan menguji kandidat parameter terbatas
   (generateBoundedCandidates) jika skor awal membutuhkan penyempurnaan.
   ===================================================================== */
function evaluateSegmentationRoundTrip(work, mask, labels, palette, edgeField, cls, loopCount = 0, segCount = 0, forceCpu = false) {
  const { w, h } = work;
  const bStep = Math.max(1, Math.floor(Math.min(w, h) / 180));
  let meanDE00 = 0, validPix = 0;
  let interB = 0, unionB = 0, imgEdgeN = 0, segEdgeN = 0;
  let detailHits = 0, detailTotal = 0, orphanNoise = 0;

  const gpuMetrics = (!forceCpu && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuEvaluateRoundTripMetrics && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full')
    ? GpuAccelerator.gpuEvaluateRoundTripMetrics(work, mask, labels, palette, edgeField, cls)
    : null;

  if (gpuMetrics) {
    meanDE00 = gpuMetrics.meanDE00;
    validPix = gpuMetrics.validPix;
    interB = gpuMetrics.interB;
    unionB = gpuMetrics.unionB;
    imgEdgeN = gpuMetrics.imgEdgeN;
    segEdgeN = gpuMetrics.segEdgeN;
    detailHits = gpuMetrics.detailHits;
    detailTotal = gpuMetrics.detailTotal;
    orphanNoise = gpuMetrics.orphanNoise;
  } else {
    const d = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
    const mag = edgeField ? edgeField.mag : null;
    const stride = Math.max(1, Math.floor((w * h) / 16000));

    let sumDE00 = 0;
    const palLab = palette.map(c => {
      const [L, a, b] = (c.L != null && c.a != null && c.b2 != null) ? [c.L, c.a, c.b2] : rgb2lab(c.r, c.g, c.b);
      return { r: c.r, g: c.g, b: c.b, L, a, b2: b };
    });

    /* 1. E_color: Rata-rata kesalahan warna perseptual CIEDE2000 ternormalisasi */
    for (let p = 0; p < w * h; p += stride) {
      if (mask && mask[p]) continue;
      const l = labels[p];
      if (l < 0 || !palLab[l]) continue;
      const i = p * 4;
      const [L, a, b] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      const cp = palLab[l];
      sumDE00 += ciede2000(L, a, b, cp.L, cp.a, cp.b2);
      validPix++;
    }
    meanDE00 = validPix > 0 ? (sumDE00 / validPix) : 0;

    /* 2. Boundary IoU & E_boundary: Tumpang tindih pita batas (dilation 1px) antara tepi citra & batas label */
    const edgeThr = cls && cls.type === 'photo' ? 18.5 : 13.5;
    for (let y = 1; y < h - 1; y += bStep) {
      const row = y * w;
      for (let x = 1; x < w - 1; x += bStep) {
        const p = row + x;
        if (mask && mask[p]) continue;
        const isImgEdge = mag ? (mag[p] >= edgeThr || mag[p - 1] >= edgeThr || mag[p + 1] >= edgeThr || mag[p - w] >= edgeThr || mag[p + w] >= edgeThr) : false;
        const l0 = labels[p];
        const isSegEdge = (labels[p - 1] !== l0 || labels[p + 1] !== l0 || labels[p - w] !== l0 || labels[p + w] !== l0);
        if (isImgEdge) imgEdgeN++;
        if (isSegEdge) segEdgeN++;
        if (isImgEdge && isSegEdge) interB++;
        if (isImgEdge || isSegEdge) unionB++;
      }
    }

    /* 3. E_detail & E_topology: Evaluasi pelestarian detail kontras tinggi vs spekula liar */
    for (let y = 2; y < h - 2; y += bStep * 2) {
      const row = y * w;
      for (let x = 2; x < w - 2; x += bStep * 2) {
        const p = row + x;
        if (mask && mask[p]) continue;
        const l0 = labels[p];
        const sameOrtho = (labels[p - 1] === l0 ? 1 : 0) + (labels[p + 1] === l0 ? 1 : 0) + (labels[p - w] === l0 ? 1 : 0) + (labels[p + w] === l0 ? 1 : 0);
        if (sameOrtho === 0) orphanNoise++;
        if (mag && mag[p] >= edgeThr * 1.25) {
          detailTotal++;
          const hasNearBoundary = (labels[p - 1] !== l0 || labels[p + 1] !== l0 || labels[p - w] !== l0 || labels[p + w] !== l0 ||
                                   labels[p - 2] !== l0 || labels[p + 2] !== l0 || labels[p - 2 * w] !== l0 || labels[p + 2 * w] !== l0);
          if (hasNearBoundary) detailHits++;
        }
      }
    }
  }

  const E_color = clamp(meanDE00 / 18.0, 0, 1);
  /* Jika gambar murni gradasi halus tanpa step-edge tajam (imgEdgeN sangat kecil),
     evaluasi koherensi batas terhadap kelancaran isoline agar tidak menghukum batas tonal secara keliru */
  const boundaryIoU = imgEdgeN >= Math.max(6, (w * h) / (bStep * bStep * 250))
    ? (unionB > 0 ? clamp(interB / unionB, 0, 1) : 0.85)
    : clamp(0.88 - (segEdgeN / Math.max(1, (w * h) / (bStep * bStep))) * 0.25, 0.62, 0.94);
  const E_boundary = clamp(1 - boundaryIoU, 0, 1);
  const detailRecall = detailTotal > 0 ? clamp(detailHits / detailTotal, 0, 1) : 0.90;
  const E_detail = clamp(1 - detailRecall, 0, 1);
  const E_topology = clamp((orphanNoise / Math.max(1, validPix)) * 12 + Math.abs(palette.length - (cls && cls.effectiveColors || palette.length)) / 42, 0, 1);

  /* 4. E_complexity: Penalti kompleksitas poligon/segmen berlebih */
  const estLoops = loopCount || Math.max(palette.length, Math.round(segEdgeN * 0.08));
  const estSegs = segCount || estLoops * 8;
  const targetSegBudget = (cls && cls.profileId === 'flat') ? 450 : (cls && cls.profileId === 'photo') ? 2600 : 1200;
  const E_complexity = clamp((estSegs / Math.max(200, targetSegBudget)) * 0.28, 0, 1);

  /* Bobot fungsi objektif J disesuaikan dengan atribut profil citra */
  const attr = (cls && cls.adaptiveAttributes) || { geometryPriority: 0.6, detailProtection: 0.6, gradientPreservation: 0.3 };
  const wc = 0.26 + attr.gradientPreservation * 0.08;
  const wb = 0.26 + attr.geometryPriority * 0.08;
  const wt = 0.24;
  const wd = 0.18 + attr.detailProtection * 0.08;
  const ws = 0.14;
  const wNorm = wc + wb + wt + wd + ws;

  const J = (wc * E_color + wb * E_boundary + wt * E_topology + wd * E_detail + ws * E_complexity) / wNorm;
  const needsRefinement = J > 0.235 || boundaryIoU < 0.56 || meanDE00 > 5.8 || detailRecall < 0.68;

  return {
    J: +J.toFixed(4),
    qualityScore: Math.round(clamp((1 - J) * 100, 10, 99)),
    boundaryIoU: +boundaryIoU.toFixed(3),
    meanDE00: +meanDE00.toFixed(2),
    detailRecall: +detailRecall.toFixed(3),
    components: {
      E_color: +E_color.toFixed(3),
      E_boundary: +E_boundary.toFixed(3),
      E_topology: +E_topology.toFixed(3),
      E_detail: +E_detail.toFixed(3),
      E_complexity: +E_complexity.toFixed(3)
    },
    needsRefinement
  };
}

function generateBoundedCandidates(baseParams, cls, eval0) {
  const cands = [];
  const p0 = baseParams;
  /* Kandidat 1: Presisi Detail & Batas Lebih Ketat (tanpa menurunkan minPixels yang memicu ledakan island) */
  if (eval0.detailRecall < 0.78 || eval0.meanDE00 > 4.2) {
    cands.push({
      name: 'Presisi Detail & Warna (ΔE Lebih Ketat)',
      layerDifference: +clamp(p0.layerDifference * 0.86, 3.4, 8.8).toFixed(2),
      targetKMax: clamp(p0.targetKMax + 4, 4, 36),
      minPixels: p0.minPixels,
      complexity: clamp(p0.complexity + 3, 35, 78),
      qtVarThr: Math.max(95, Math.round(p0.qtVarThr * 0.85))
    });
  }
  /* Kandidat 2: Regularisasi Kontur & Reduksi Derau (dengan pengaman Line-Art agar minPixels tidak menghapus detail tipis) */
  if (eval0.boundaryIoU < 0.68 || eval0.components.E_topology > 0.18) {
    const isFewColorLineArt = (cls && (cls.effectiveColors <= 6 || cls.profileId === 'flat'));
    cands.push({
      name: 'Koherensi Batas & Reduksi Spekula',
      layerDifference: isFewColorLineArt ? p0.layerDifference : +clamp(p0.layerDifference * 1.12, 3.4, 9.2).toFixed(2),
      targetKMax: p0.targetKMax,
      minPixels: isFewColorLineArt ? p0.minPixels : clamp(p0.minPixels + 1, 2, 12),
      complexity: isFewColorLineArt ? p0.complexity : clamp(p0.complexity - 6, 35, 88),
      qtVarThr: isFewColorLineArt ? p0.qtVarThr : Math.min(420, Math.round(p0.qtVarThr * 1.15))
    });
  }
  /* Kandidat 3: Penyeimbang Gradasi / Shade Keluarga Warna */
  if (!cands.length || (cls && cls.surfaceMode !== 'flat')) {
    cands.push({
      name: 'Harmoni Tonal & Transisi CIE-Lab',
      layerDifference: +clamp(p0.layerDifference * 0.90, 3.2, 8.5).toFixed(2),
      targetKMax: clamp(p0.targetKMax + 2, 4, 34),
      minPixels: p0.minPixels,
      complexity: clamp(p0.complexity + 4, 40, 88),
      qtVarThr: p0.qtVarThr
    });
  }
  return cands.slice(0, 2);
}

/* Evaluasi Round-Trip Penuh pasca-perakitan SVG (membandingkan rasterisasi kanvas vektor terhadap bitmap asli) */
function evaluateFinalVectorRoundTrip(work, mask, vecPaths, labels, palette, edgeField, cls, totalSegs, totalLoops) {
  const baseEval = evaluateSegmentationRoundTrip(work, mask, labels, palette, edgeField, cls, totalLoops, totalSegs);
  if (!vecPaths || !vecPaths.length || typeof document === 'undefined') return baseEval;
  try {
    const { w, h } = work;
    const evalRatio = Math.min(1, 360 / Math.max(w, h));
    const ew = Math.max(16, Math.round(w * evalRatio)), eh = Math.max(16, Math.round(h * evalRatio));
    const scale = evalRatio / (work.scale || 1);
    const cv = document.createElement('canvas');
    cv.width = ew; cv.height = eh;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.scale(scale, scale);
    for (const it of vecPaths) {
      ctx.globalAlpha = it.opacity ?? 1;
      if (it.fill && it.fill !== 'none') {
        if (typeof fillCanvasPath === 'function') fillCanvasPath(ctx, it);
        else { ctx.fillStyle = typeof resolveCanvasPaint === 'function' ? resolveCanvasPaint(ctx, it.fill, it.fillGrad) : it.fill; ctx.fill(it.p2d, it.fillRule || 'evenodd'); }
      }
      if (it.stroke && it.stroke !== 'none' && it.strokeWidth > 0) {
        ctx.strokeStyle = typeof resolveCanvasPaint === 'function' ? resolveCanvasPaint(ctx, it.stroke, it.strokeGrad) : it.stroke;
        ctx.lineWidth = it.strokeWidth;
        ctx.stroke(it.p2d);
      }
    }
    ctx.restore();
    const vData = ctx.getImageData(0, 0, ew, eh).data;
    const oData = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
    const step = Math.max(1, Math.floor((ew * eh) / 8000));
    let sumDE00 = 0, cnt = 0;
    for (let ep = 0; ep < ew * eh; ep += step) {
      const ex = ep % ew, ey = (ep / ew) | 0;
      const ox = Math.min(w - 1, Math.floor((ex * w) / ew));
      const oy = Math.min(h - 1, Math.floor((ey * h) / eh));
      const op = oy * w + ox;
      if (mask && mask[op]) continue;
      const vi = ep * 4, oi = op * 4;
      if (vData[vi + 3] < 32) continue;
      const [L1, a1, b1] = rgb2lab(oData[oi], oData[oi + 1], oData[oi + 2]);
      const [L2, a2, b2] = rgb2lab(vData[vi], vData[vi + 1], vData[vi + 2]);
      sumDE00 += ciede2000(L1, a1, b1, L2, a2, b2);
      cnt++;
    }
    if (cnt > 0) {
      const rtDE00 = +(sumDE00 / cnt).toFixed(2);
      const rtEColor = clamp(rtDE00 / 18.0, 0, 1);
      const newJ = +(baseEval.J * 0.72 + rtEColor * 0.28).toFixed(4);
      return {
        ...baseEval,
        J: newJ,
        qualityScore: Math.round(clamp((1 - newJ) * 100, 12, 99)),
        meanDE00: rtDE00,
        components: { ...baseEval.components, E_color: +rtEColor.toFixed(3) }
      };
    }
  } catch (e) {}
  return baseEval;
}

async function vectorize(srcImg, cfg = {}, onProgress) {
  setTraceCtrl({ paused: false, skipToEnd: false });
  const tAll = performance.now();
  const stats = {};
  const hw = getHwConfig();
  const activeCores = hw.multiThread ? clamp(hw.cpuCores || 1, 1, 64) : 1;
  const ramCaps = MemPool.computeRamCaps(cfg.maxDim || (cfg.imageType === 'photo' ? 760 : 880));
  MemPool.beginSession();

  /* Budget waktu real-time agar pengguna dapat mengamati proses scanning hingga penggambaran kurva SVG secara jelas */
  const TARGET_TOTAL_MS = cfg.fastPreview ? 900 : 6400;
  const W_BUDGET = {
    classify: TARGET_TOTAL_MS * 0.12,
    palette:  TARGET_TOTAL_MS * 0.13,
    segment:  TARGET_TOTAL_MS * 0.20,
    trace:    TARGET_TOTAL_MS * 0.14,
    smooth:   TARGET_TOTAL_MS * 0.14,
    fit:      TARGET_TOTAL_MS * 0.19,
    assemble: TARGET_TOTAL_MS * 0.08,
  };

  const maxDim = ramCaps.effMaxDim;
  if (onProgress) { onProgress('classify', 0.005, 'Membaca & menyiapkan citra resolusi kerja…', null); await tick(); }
  const work = makeWork(srcImg, maxDim);
  const { w, h, scale } = work;
  const W = Math.round(srcImg.w), H = Math.round(srcImg.h);
  MemPool.trackAlloc(w * h * 16);
  stats.workSize = w + '×' + h;
  stats.origSize = srcImg.w + '×' + srcImg.h;

  const origRgbaSnapshot = new Uint8ClampedArray(work.data.data);
  const vizState = {
    w, h, W, H, scale,
    origCanvas: buildVizRgbaCanvas(origRgbaSnapshot, w, h),
    edgeScanCanvas: null,
    cls: null,
    alphaInfo: null,
    palette: [],
    paletteProbes: [],
    quantCanvas: null,
    quadBlocks: [],
    qtCanvas: null,
    segMidCanvas: null,
    segFinalCanvas: null,
    segDiffCanvas: null,
    cleanedPixels: 0,
    rawLoops: [],
    smoothedLoops: [],
    bezierLoops: [],
    drawingSegs: [],
    regs: [],
    svg: '',
    stats
  };

  /* [RT-SMOOTH] prog: progres dijamin monotonik; flag `busy` memberi tahu viewer bahwa blok komputasi berat
     sedang berjalan (viewer menampilkan sinar CSS compositor yang tetap bergerak walau main-thread sibuk). */
  let _maxFrac = 0;
  const prog = async (stage, frac, detail, busy) => {
    if (stage !== 'done') { if (frac < _maxFrac) frac = _maxFrac; else _maxFrac = frac; }
    vizState.busy = !!busy;
    while (_traceCtrl.paused && !_traceCtrl.skipToEnd) {
      if (onProgress) onProgress(stage, frac, detail, vizState);
      await sleep(60);
    }
    if (onProgress) onProgress(stage, frac, detail, vizState);
    await tick();
    _lastYieldT = performance.now();
  };
  /* Update teks + napas UI di dalam loop rapat: hanya benar-benar memanggil prog bila >= 90 ms sejak update terakhir */
  let _lastUiT = 0;
  const ui = async (stage, frac, detail) => {
    const n = performance.now();
    if (n - _lastUiT < 90) { await yieldIfDue(12); return; }
    _lastUiT = n;
    await prog(stage, frac, detail, true);
  };

  /* ---- TAHAP 1: Alpha Defringing, Bilateral Pre-Filtering & Klasifikasi ---- */
  let tStage = performance.now();
  await prog('classify', 0.02, `Memindai citra & gradien Scharr 2D (${activeCores} Core · ${hw.ramMb} MB RAM${hw.useGpu ? ' · VGA Aktif' : ''})…`, true);
  let usedGpuShader = false;
  let usedMtWorkers = false;
  const gpuSession = (hw.useGpu && hw.gpuPipeline !== 'off') ? GpuAccelerator.beginGpuSession(work) : null;
  const alphaInfo = analyzeAlpha(work.data);
  const mask = flattenAlpha(work, cfg.transparency || 'keep', cfg.customColor);
  work.rawRgba = new Uint8ClampedArray(work.data.data);
  const rawBeachWork = { data: { data: new Uint8ClampedArray(work.data.data), width: w, height: h }, rawRgba: work.rawRgba, w, h, origAlpha: work.origAlpha };
  stats.alpha = alphaInfo;
  vizState.alphaInfo = alphaInfo;

  await prog('classify', 0.02, 'Mengklasifikasi karakter citra (warna, tepi, noise, topologi)…', true);
  let cls = classifyStage(work, alphaInfo, W, H);
  if (cfg.imageType && cfg.imageType !== 'auto') {
    cls = { ...cls, type: cfg.imageType, label: { blended: 'Artwork with Blended Edges', aliased: 'Artwork without Blended Edges', photo: 'Photograph' }[cfg.imageType] };
  }
  if (cfg.quality && cfg.quality !== 'auto') {
    cls = { ...cls, quality: cfg.quality, qlabel: { high: 'High', medium: 'Medium', low: 'Low' }[cfg.quality] };
  }
  const adpProfile = buildAdaptiveTraceProfile(cls, W, H, cfg.adaptiveProfileMode || 'auto');
  const adpP = adpProfile.params;
  stats.classification = cls;
  stats.adaptiveProfile = adpProfile;
  vizState.cls = cls;
  vizState.adaptiveProfile = adpProfile;

  if (cls.type !== 'aliased' && !adpP.skipBilateral) {
    await prog('classify', 0.02, 'Meredam noise dengan filter bilateral…', true);
    const sigSp = adpP.sigmaSpatial || 1.45;
    const sigCol = adpP.sigmaColor || (cls.quality === 'low' ? 30 : cls.quality === 'medium' ? 20 : 14);
    if (hw.useGpu && hw.gpuPipeline !== 'off') {
      usedGpuShader = GpuAccelerator.gpuBilateralPreFilter(work, mask, sigSp, sigCol, {
        radius: adpP.bilateralRadius,
        wedgeGuardThr: adpP.wedgeGuardThr
      });
    }
    if (!usedGpuShader) {
      if (hw.multiThread && activeCores > 1) {
        usedMtWorkers = await WorkerPool.bilateralPreFilterParallel(work, mask, sigSp, sigCol, activeCores, null, { radius: adpP.bilateralRadius, wedgeGuardThr: adpP.wedgeGuardThr, skipIfClean: adpP.skipBilateral });
      } else {
        await bilateralPreFilter(work, mask, sigSp, sigCol, null, { radius: adpP.bilateralRadius, wedgeGuardThr: adpP.wedgeGuardThr, skipIfClean: adpP.skipBilateral });
      }
    }
  }
  await prog('classify', 0.02, 'Menghitung gradien tepi DiZenzo Scharr 2D…', true);
  const edgeField = (hw.useGpu && hw.gpuPipeline === 'full')
    ? (GpuAccelerator.gpuBuildEdgeField(work, mask) || ((hw.multiThread && activeCores > 1) ? await WorkerPool.buildEdgeFieldParallel(work, mask, activeCores) : buildEdgeField(work, mask)))
    : ((hw.multiThread && activeCores > 1)
      ? await WorkerPool.buildEdgeFieldParallel(work, mask, activeCores)
      : buildEdgeField(work, mask));
  if (edgeField && edgeField.gpuSlotReady) usedGpuShader = true;
  await yieldIfDue();
  vizState.edgeScanCanvas = buildVizEdgeScanCanvas(work.data.data, edgeField.mag, mask, w, h);
  await paceStage(tStage, W_BUDGET.classify, 'classify', 0.02, 0.14, `Image Profiler: ${adpProfile.shortTitle} · ${cls.effectiveColors} warna efektif · ΔE=${adpP.layerDifference}`, prog);

  /* ---- TAHAP 2: Kuantisasi Warna CIE-Lab + Adaptive Layer Difference ---- */
  tStage = performance.now();
  const useAutoAdp = !!cfg.autoProfileParams;
  const effLayerDiff = (!useAutoAdp && cfg.layerDifference != null) ? cfg.layerDifference : adpP.layerDifference;
  await prog('palette', 0.15, `Kuantisasi CIE-Lab adaptif (target K≤${adpP.targetKMax}, ΔE=${effLayerDiff}) & eliminasi halo…`, true);
  const gMode = cfg.gradientMode || 'auto';
  const maxColOn = !!cfg.maxColorEnabled;
  const maxColVal = (maxColOn && cfg.maxColors >= 2) ? Math.max(2, Math.round(cfg.maxColors)) : 0;
  const palOpt = {
    colorMode: cfg.colorMode || 'auto',
    paletteColors: cfg.paletteColors,
    paletteItems: cfg.paletteItems,
    targetColors: maxColOn ? maxColVal : cfg.targetColors,
    maxColorEnabled: maxColOn,
    maxColors: maxColVal,
    gradientMode: gMode,
    adaptiveKMax: maxColOn ? Math.min(adpP.targetKMax || 22, maxColVal) : adpP.targetKMax,
    fixedK: cfg.palMode === 'fixed',
    sensitivity: cfg.sensitivity || adpP.sensitivity || 'medium',
    layerDifference: effLayerDiff,
    imageType: cls.type,
  };
  const palRes = findPalette(work, mask, palOpt, edgeField);
  const palette = palRes.palette;
  /* Selama Tahap 2-3 berlangsung, tampilkan palet yang sudah terkonsolidasi di vizState.palette
     agar pengguna langsung melihat palet gradient & batas Max Color sejak awal proses tracing */
  const earlyCons = consolidateGradientPalette(work, mask, palette, edgeField, cls, {
    gradientMode: gMode,
    maxColorEnabled: maxColOn,
    maxColors: maxColVal
  });
  stats.palette = { count: earlyCons.items.length, auto: palRes.auto, colors: earlyCons.hexes, layerDifference: effLayerDiff };
  vizState.palette = earlyCons.items;
  await yieldIfDue();
  vizState.paletteProbes = buildPaletteProbes(work, mask, palette, scale);
  await prog('palette', 0.15, 'Menyusun partisi QuadTree adaptif…', true);

  /* Inisialisasi QuadTree dengan ambang varians adaptif */
  const q = adpP.qtVarThr || ({ high: 160, medium: 320, low: 620 }[cls.quality] || 320);
  const quadBlocks = [];
  let labels = quadtreeInit(work, mask, palette, cls.type === 'aliased' ? q * 0.35 : q, edgeField, quadBlocks, rawBeachWork);
  const segCtx = labels._segCtx || work._segCtx;
  rawBeachWork._segCtx = segCtx;
  quadBlocks.sort((a, b) => (b[2] * b[3]) - (a[2] * a[3]));
  vizState.quadBlocks = quadBlocks;
  const rawNearestSnapshot = labels._rawNearestSnapshot || new Int16Array(labels);
  const qtLabelsSnapshot = new Int16Array(labels);
  await yieldIfDue();
  vizState.quantCanvas = buildVizLabelCanvas(rawNearestSnapshot, palette, w, h, false);
  await yieldIfDue();
  vizState.qtCanvas = buildVizLabelCanvas(qtLabelsSnapshot, palette, w, h, true);
  await paceStage(tStage, W_BUDGET.palette, 'palette', 0.15, 0.28, `Palet CIE-Lab ditemukan: ${palette.length} warna bersih (layer_difference ΔE=${effLayerDiff})`, prog);

  /* ---- TAHAP 3 & 4: Partisi QuadTree + Multi-Scale Edge Snapping + MRF Potts + Context-Aware Speckle/Sliver Removal ---- */
  tStage = performance.now();
  await paceStage(tStage, W_BUDGET.segment * 0.38, 'segment', 0.28, 0.38, `Partisi kisi adaptif QuadTree (${quadBlocks.length} sub-blok tepi)…`, prog);

  const tStageMrf = performance.now();
  const cplx = (!useAutoAdp && cfg.complexity != null) ? cfg.complexity : adpP.complexity;
  const isTexturedFlatPoster = cls.surfaceMode === 'flat' && cls.effectiveColors <= 8 && cls.meaningfulDetailDensity >= 0.45;
  const noiseBeta = isTexturedFlatPoster ? 1150 : ({ high: 1250, medium: 2100, low: 3600 }[cls.quality] || 2100);
  const beta = noiseBeta * (adpP.mrfBetaScale || 1.0) * (1.28 - cplx / 100 * 0.85) * (cls.type === 'aliased' ? 0.45 : 1);
  const mrfIters = adpP.mrfIters || (cls.type === 'photo' ? 14 : 18);

  await prog('segment', 0.38, 'Optimasi MRF Potts (simulated annealing)…', true);
  if (hw.useGpu && hw.gpuPipeline === 'full' && palette.length <= 64) {
    const half1 = Math.max(1, mrfIters >> 1);
    const half2 = Math.max(0, mrfIters - half1);
    segmentMRF(work, mask, labels, palette, {
      beta, maxIter: half1, startIter: 0, totalIters: mrfIters,
      topology: true, rawWork: rawBeachWork, edgeField, segCtx,
    });
    vizState.segMidCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
    await yieldIfDue();
    if (half2 > 0) {
      segmentMRF(work, mask, labels, palette, {
        beta, maxIter: half2, startIter: half1, totalIters: mrfIters,
        topology: true, rawWork: rawBeachWork, edgeField, segCtx,
      });
    }
  } else {
    for (let it = 0; it < mrfIters; it++) {
      await ui('segment', 0.38, `Optimasi MRF Potts · iterasi ${it + 1}/${mrfIters}…`);
      segmentMRF(work, mask, labels, palette, {
        beta: beta * (0.55 + 0.55 * (it / Math.max(1, mrfIters - 1))),
        maxIter: 1,
        iterIndex: it,
        totalIters: mrfIters,
        topology: true,
        rawWork: rawBeachWork,
        edgeField,
        segCtx,
      });
      if (it === (mrfIters >> 1)) {
        vizState.segMidCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
      }
      if (it >= 6 && labels._lastMrfChanged != null && labels._lastMrfChanged < Math.max(4, w * h * 0.00012)) {
        if (!vizState.segMidCanvas) vizState.segMidCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
        break;
      }
    }
  }

  await prog('segment', 0.38, 'Edge snapping sub-piksel & pembersihan speckle…', true);
  localNeighborhoodEdgeSnap(rawBeachWork, mask, labels, palette, edgeField, adpP.snapPasses || 4, segCtx);
  await yieldIfDue();
  let minPx = (!useAutoAdp && cfg.minPixels != null) ? cfg.minPixels : adpP.minPixels;
  /* [PATCH-FAM] Pembersihan terpadu: morfologi → gabung island derau 1-keluarga → min-pixels → sliver → parasit (dengan perlindungan lubang/detail nyata) */
  runSegmentationCleanup(labels, w, h, rawBeachWork, palette, mask, segCtx, minPx);
  await prog('segment', 0.38, 'Evaluasi kualitas segmentasi (closed-loop)…', true);

  /* ---- CLOSED-LOOP CALIBRATION & CANDIDATE REFINEMENT (Sesuai Bagian 5 Markdown) ---- */
  const initialEval = evaluateSegmentationRoundTrip(rawBeachWork, mask, labels, palette, edgeField, cls);
  let bestEval = initialEval;
  let calibrationInfo = {
    enabled: cfg.closedLoop !== false,
    refined: false,
    candidatesTested: 0,
    selectedCandidate: 'Konfigurasi Awal (Optimal)',
    initialJ: initialEval.J,
    finalJ: initialEval.J,
    initialQuality: initialEval.qualityScore,
    finalQuality: initialEval.qualityScore,
    boundaryIoU: initialEval.boundaryIoU,
    meanDE00: initialEval.meanDE00,
    detailRecall: initialEval.detailRecall,
    components: initialEval.components
  };

  if (cfg.closedLoop !== false && (cfg.colorMode || 'auto') === 'auto' && !(cfg.paletteColors && cfg.paletteColors.length) && initialEval.needsRefinement) {
    const candidates = generateBoundedCandidates(
      { layerDifference: effLayerDiff, targetKMax: adpP.targetKMax, minPixels: minPx, complexity: cplx, qtVarThr: q },
      cls,
      initialEval
    );
    const probeMaxDim = Math.min(480, Math.max(w, h));
    const probeWork = (Math.max(w, h) > probeMaxDim)
      ? makeWork(srcImg, probeMaxDim)
      : { data: new ImageData(new Uint8ClampedArray(work.data.data), w, h), rawRgba: rawBeachWork.rawRgba, w, h };
    const probeMask = (Math.max(w, h) > probeMaxDim)
      ? flattenAlpha(probeWork, cfg.transparency || 'keep', cfg.customColor)
      : mask;
    if (!probeWork.rawRgba) probeWork.rawRgba = new Uint8ClampedArray(probeWork.data.data);
    const probeEdge = (Math.max(w, h) > probeMaxDim) ? buildEdgeField(probeWork, probeMask) : edgeField;

    let bestCand = null;
    for (const cand of candidates) {
      calibrationInfo.candidatesTested++;
      await prog('segment', 0.38, `Kalibrasi kandidat ${calibrationInfo.candidatesTested}/${candidates.length}: ${cand.name}…`, true);
      const cPalRes = findPalette(probeWork, probeMask, {
        ...palOpt,
        adaptiveKMax: cand.targetKMax,
        layerDifference: cand.layerDifference
      }, probeEdge);
      const cPal = cPalRes.palette;
      await yieldIfDue();
      let cLabels = quadtreeInit(probeWork, probeMask, cPal, cls.type === 'aliased' ? cand.qtVarThr * 0.35 : cand.qtVarThr, probeEdge, null, probeWork);
      const cBeta = noiseBeta * (adpP.mrfBetaScale || 1.0) * (1.28 - cand.complexity / 100 * 0.85) * (cls.type === 'aliased' ? 0.45 : 1);
      await yieldIfDue();
      segmentMRF(probeWork, probeMask, cLabels, cPal, { beta: cBeta, maxIter: 6, topology: true, rawWork: probeWork, edgeField: probeEdge, segCtx: cLabels._segCtx });
      await yieldIfDue();
      runSegmentationCleanup(cLabels, probeWork.w, probeWork.h, probeWork, cPal, probeMask, cLabels._segCtx, cand.minPixels);
      const cEval = evaluateSegmentationRoundTrip(probeWork, probeMask, cLabels, cPal, probeEdge, cls);
      if (cEval.J < bestEval.J - 0.008) {
        bestEval = cEval;
        bestCand = cand;
      }
    }

    if (bestCand) {
      /* Jalankan parameter kandidat pemenang pada resolusi produksi penuh */
      await prog('segment', 0.38, 'Menerapkan kandidat terbaik pada resolusi penuh…', true);
      const winPalRes = findPalette(work, mask, {
        ...palOpt,
        adaptiveKMax: bestCand.targetKMax,
        layerDifference: bestCand.layerDifference
      }, edgeField);
      palette.length = 0;
      winPalRes.palette.forEach(c => palette.push(c));
      labels = quadtreeInit(work, mask, palette, cls.type === 'aliased' ? bestCand.qtVarThr * 0.35 : bestCand.qtVarThr, edgeField, null, rawBeachWork);
      const winBeta = noiseBeta * (adpP.mrfBetaScale || 1.0) * (1.28 - bestCand.complexity / 100 * 0.85) * (cls.type === 'aliased' ? 0.45 : 1);
      const winIters = Math.max(8, mrfIters - 4);
      if (hw.useGpu && hw.gpuPipeline === 'full' && palette.length <= 64) {
        segmentMRF(work, mask, labels, palette, {
          beta: winBeta, maxIter: winIters, startIter: 0, totalIters: winIters,
          topology: true, rawWork: rawBeachWork, edgeField, segCtx: labels._segCtx
        });
      } else {
        for (let it = 0; it < winIters; it++) {
          await ui('segment', 0.38, `Optimasi MRF resolusi penuh · iterasi ${it + 1}/${winIters}…`);
          segmentMRF(work, mask, labels, palette, {
            beta: winBeta * (0.60 + 0.40 * (it / Math.max(1, mrfIters - 5))),
            maxIter: 1,
            iterIndex: it,
            totalIters: mrfIters,
            topology: true,
            rawWork: rawBeachWork,
            edgeField,
            segCtx: labels._segCtx
          });
          if (it >= 6 && labels._lastMrfChanged != null && labels._lastMrfChanged < Math.max(4, w * h * 0.00012)) break;
        }
      }
      localNeighborhoodEdgeSnap(rawBeachWork, mask, labels, palette, edgeField, adpP.snapPasses || 4, labels._segCtx);
      minPx = bestCand.minPixels;
      runSegmentationCleanup(labels, w, h, rawBeachWork, palette, mask, labels._segCtx, minPx);
      const prodEval = evaluateSegmentationRoundTrip(rawBeachWork, mask, labels, palette, edgeField, cls);
      bestEval = prodEval;
      calibrationInfo.refined = true;
      calibrationInfo.selectedCandidate = bestCand.name;
      calibrationInfo.finalJ = prodEval.J;
      calibrationInfo.finalQuality = prodEval.qualityScore;
      calibrationInfo.boundaryIoU = prodEval.boundaryIoU;
      calibrationInfo.meanDE00 = prodEval.meanDE00;
      calibrationInfo.detailRecall = prodEval.detailRecall;
      calibrationInfo.components = prodEval.components;
      stats.palette = { count: palette.length, auto: true, colors: palette.map(c => c.hex), layerDifference: bestCand.layerDifference };
      vizState.palette = palette;
      vizState.paletteProbes = buildPaletteProbes(work, mask, palette, scale);
    }
  }

  if ((cfg.colorMode || 'auto') !== 'two') {
    unifyGradientBands(labels, w, h, rawBeachWork, mask, palette, edgeField, cls, {
      gradientMode: gMode,
      forceGradient: gMode === 'on',
      maxColorEnabled: maxColOn,
      maxColors: maxColVal,
      attachPreviewGradients: true
    });
    stats.palette = { count: palette.length, auto: palRes.auto, colors: palette.map(c => c.hex), layerDifference: stats.palette ? stats.palette.layerDifference : effLayerDiff };
    vizState.palette = palette;
  } else {
    compactActivePaletteAndLabels(labels, w, h, rawBeachWork, mask, palette, edgeField, cls, {
      maxColorEnabled: maxColOn,
      maxColors: maxColVal,
      attachGradients: false
    });
    vizState.palette = palette;
  }
  stats.beta = Math.round(beta);
  stats.minPixels = minPx;
  stats.layerDifference = stats.palette ? stats.palette.layerDifference : effLayerDiff;
  stats.calibration = calibrationInfo;
  vizState.calibration = calibrationInfo;
  await yieldIfDue();
  vizState.segFinalCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
  await yieldIfDue();
  const diffRes = buildVizDiffCanvas(rawNearestSnapshot, labels, w, h);
  vizState.segDiffCanvas = diffRes.canvas;
  vizState.cleanedPixels = diffRes.diffCount;
  stats.cleanedPixels = diffRes.diffCount;
  await paceStage(tStageMrf, W_BUDGET.segment * 0.62, 'segment', 0.38, 0.54, `MRF Potts & Context-Aware Cleanup selesai (filter_speckle=${minPx}px · ${diffRes.diffCount.toLocaleString('id-ID')} piksel diperbaiki)`, prog);

  /* ---- TAHAP 5 & 6: Graf Planar & Inversi Sub-Piksel "Beach Deconvolution" ---- */
  tStage = performance.now();
  await prog('trace', 0.55, 'Menelusuri graf planar & dekonvolusi sub-piksel pantai…', true);
  const aaOn = cfg.aa !== false;
  const tr = traceBoundaries(labels, w, h, rawBeachWork, palette, { aa: aaOn });
  stats.loops = tr.loops.length;
  stats.traceMs = Math.round(tr.ms);

  const rawLoops = [];
  let totalPts = 0;
  for (let i = 0; i < tr.loops.length; i++) {
    const lp = tr.loops[i];
    const pts = lp.pts.map(p => [p[0], p[1]]);
    totalPts += pts.length;
    rawLoops.push({ label: lp.label, rawPts: pts, vkeys: lp.vkeys, juncFlags: lp.juncFlags, isTrueCircle: !!lp.isTrueCircle, area: lp.area });
  }
  buildVizGeometryInto(vizState, rawLoops, null, palette, scale);
  await paceStage(tStage, W_BUDGET.trace, 'trace', 0.55, 0.67, `Menelusuri ${tr.loops.length} kontur graf planar (${totalPts.toLocaleString('id-ID')} verteks sub-piksel)…`, prog);

  /* ---- TAHAP 7 & 8: Penghalusan Kontur Adaptif Per-Kontur, Fitting Bézier & Sinkronisasi Topologi Bersama ---- */
  tStage = performance.now();
  const sm = (!useAutoAdp && cfg.smoothness != null) ? cfg.smoothness : adpP.smoothness;
  const lambda = Math.pow(10, -0.8 + (sm / 100) * 2.25);
  const nd = (!useAutoAdp && cfg.nodeDensity != null) ? cfg.nodeDensity : adpP.nodeDensity;
  const tol = Math.max(0.08, (0.38 - (nd / 100) * 0.28)) * scale;
  const smoothed = [];
  let totalSegs = 0;

  const advOpt = {
    smoothMethod: (!useAutoAdp && cfg.smoothMethod) || adpP.smoothMethod || 'hybrid',
    lineStraighten: (!useAutoAdp ? cfg.lineStraighten : undefined) ?? adpP.lineStraighten ?? 58,
    axisSnap: (!useAutoAdp && cfg.axisSnap !== undefined) ? cfg.axisSnap !== false : adpP.axisSnap,
    axisSnapDeg: (!useAutoAdp ? cfg.axisSnapDeg : undefined) ?? adpP.axisSnapDeg ?? 2.4,
    despeckleJitter: (!useAutoAdp ? cfg.despeckleJitter : undefined) ?? adpP.despeckleJitter ?? 74,
    extremumAlign: cfg.extremumAlign !== false,
    cornerMode: (!useAutoAdp && cfg.cornerMode) || adpP.cornerMode || 'typo',
    lineCurveSensitivity: (!useAutoAdp ? cfg.lineCurveSensitivity : undefined) ?? adpP.lineCurveSensitivity ?? 76,
    apexSharpness: (!useAutoAdp ? cfg.apexSharpness : undefined) ?? adpP.apexSharpness ?? 82,
    cornerRoundness: (!useAutoAdp ? cfg.cornerRoundness : undefined) ?? adpP.cornerRoundness ?? 68,
    protectStemCaps: (!useAutoAdp && cfg.protectStemCaps !== undefined) ? cfg.protectStemCaps !== false : adpP.protectStemCaps
  };
  const effCornerAngle = (!useAutoAdp && cfg.cornerAngle) || adpP.cornerAngle || 44;

  await prog('smooth', 0.67, `Menghaluskan ${tr.loops.length} kontur & fitting kurva Bézier…`, true);
  let parallelRes = null;
  if (hw.multiThread && activeCores > 1 && tr.loops.length >= 4) {
    parallelRes = await WorkerPool.smoothAndFitParallel(tr.loops, scale, {
      lambda,
      iters: 52,
      detectCorners: cfg.detectCorners !== false,
      cornerAngle: effCornerAngle,
      tol,
      advOpt
    }, activeCores);
  }

  let sharpCorners = 0, smoothCorners = 0, straightSegs = 0, curveSegs = 0;
  if (parallelRes) {
    usedMtWorkers = true;
    for (const r of parallelRes) {
      sharpCorners += (r.sharpCnt || 0);
      smoothCorners += (r.smoothCnt || 0);
      smoothed.push({
        label: r.label,
        pts: r.scaledPts,
        scaledPts: r.scaledPts,
        segs: r.segs,
        d: r.d,
        area: r.area,
        isTrueCircle: !!r.isTrueCircle,
        sharpPts: r.sharpPts || [],
        smoothPts: r.smoothPts || []
      });
    }
  } else {
    for (let i = 0; i < tr.loops.length; i++) {
      if ((i & 7) === 0) await ui('smooth', 0.67, `Menghaluskan & memfitting kontur ${i + 1}/${tr.loops.length}…`);
      const lp = tr.loops[i];
      const pts = rawLoops[i].rawPts;
      const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(pts, lp.area, lambda, tol, scale, advOpt);
      const s = smoothLoop(pts, {
        ...localAdv,
        lambda: localLambda,
        iters: 52,
        detectCorners: cfg.detectCorners !== false,
        cornerAngle: effCornerAngle,
        juncFlags: lp.juncFlags,
        isTrueCircle: lp.isTrueCircle
      });
      const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
      const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
      const sharpPts = [], smoothPts = [];
      for (let k = 0; k < s.corners.length; k++) {
        if (s.corners[k]) { sharpCorners++; sharpPts.push(spts[k]); }
        else if (s.smoothKnots && s.smoothKnots[k]) { smoothCorners++; smoothPts.push(spts[k]); }
      }
      const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: lp.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt);
      smoothed.push({
        label: lp.label,
        pts: spts,
        scaledPts: spts,
        corners: s.corners,
        smoothKnots: s.smoothKnots,
        knotTangents: s.knotTangents,
        juncFlags: lp.juncFlags,
        isTrueCircle: !!s.isTrueCircle,
        segs,
        d: segsToD(segs, true),
        area: lp.area * scale * scale,
        sharpPts,
        smoothPts
      });
    }
  }

  synchronizeSharedTopology(smoothed, rawLoops);
  for (const s of smoothed) {
    totalSegs += s.segs.length;
    for (const sg of s.segs) { if (sg.isLine) straightSegs++; else curveSegs++; }
  }
  stats.smoothLambda = +lambda.toFixed(3);
  stats.vertices = totalPts;
  stats.bezierSegs = totalSegs;
  stats.sharpCorners = sharpCorners;
  stats.smoothCorners = smoothCorners;
  stats.straightSegs = straightSegs;
  stats.curveSegs = curveSegs;
  stats.fitTol = +tol.toFixed(2);

  buildVizGeometryInto(vizState, rawLoops, smoothed, palette, scale);

  await paceStage(tStage, W_BUDGET.smooth, 'smooth', 0.67, 0.78, `Penghalusan Elastika CG & penguncian sudut (${sharpCorners} Sudut Tajam C⁰ · ${smoothCorners} Simpul Halus G¹)…`, prog);

  const tStageFit = performance.now();
  await paceStage(tStageFit, W_BUDGET.fit, 'fit', 0.78, 0.93, `Menggambar ${totalSegs} segmen vektor (${straightSegs} Garis Lurus L · ${curveSegs} Kurva Bézier Kubik C)…`, prog);

  /* ---- TAHAP AKHIR: Perakitan Topologi SVG & Fitting Gradasi Kontinu ---- */
  tStage = performance.now();
  await prog('assemble', 0.93, 'Mengekstraksi gradien halus (<linearGradient> / <radialGradient>) & merakit topologi SVG…', true);
  const hasGradForAssemble = gMode === 'on' || (gMode === 'auto' && cls && cls.surfaceMode !== 'flat' && (
    cls.surfaceMode === 'gradient' ||
    cls.surfaceMode === 'mixed' ||
    cls.gradientContinuity >= 0.18 ||
    palRes.hasSmoothGradient
  ));
  const gradCtx = ((cfg.colorMode || 'auto') !== 'two' && hasGradForAssemble)
    ? { labels, w, h, rawWork: rawBeachWork, scale, W, H, edgeField, gradientMode: gMode, forceGradient: gMode === 'on' }
    : null;
  const regs = buildRegions(smoothed.map(s => ({ label: s.label, area: s.area, d: s.d, scaledPts: s.pts, segs: s.segs })), palette, 1, gradCtx);
  vizState.palette = palette;
  const bgOpt = (cfg.transparency === 'white' || cfg.transparency === 'custom')
    ? (cfg.transparency === 'custom' ? (cfg.customColor || '#ffffff') : '#ffffff')
    : 'none';
  const svg = assembleSVG(regs, W, H, {
    stackMode: cfg.stackMode || 'stack',
    stroke: cfg.stroke !== false,
    bg: bgOpt,
    safetyBg: !alphaInfo.hasAlpha,
  });
  stats.regions = regs.length;
  vizState.regs = regs;
  vizState.svg = svg;
  if (stats.calibration) {
    /* [FIX-2026-10-29] Evaluasi round-trip vektor TIDAK BOLEH membuang
       SVG yang sudah jadi: dulu pemanggilan parseSvgForCanvas() yang
       tidak terdefinisi melempar di sini dan vectorize() gagal total.
       Kini helper itu disediakan modul 00, dan sebagai pertahanan
       kedua, kegagalan metrik apa pun di sini ditangkap — skor
       segmentasi awal tetap dipakai, SVG tetap dikembalikan. */
    try {
      const finalRt = evaluateFinalVectorRoundTrip(
        rawBeachWork, mask, (typeof parseSvgForCanvas === 'function' ? parseSvgForCanvas(svg) : []), labels, palette, edgeField, cls, totalSegs, tr.loops.length
      );
      if (finalRt) {
        stats.calibration.finalJ = finalRt.J;
        stats.calibration.finalQuality = finalRt.qualityScore;
        stats.calibration.boundaryIoU = finalRt.boundaryIoU;
        stats.calibration.meanDE00 = finalRt.meanDE00;
        stats.calibration.components = finalRt.components;
      }
    } catch (e) { /* metrik gagal: SVG tetap sah, skor awal dipertahankan */ }
  }

  await paceStage(tStage, W_BUDGET.assemble, 'assemble', 0.93, 0.99, `Mewarnai & merakit ${regs.length} layer region SVG bebas-celah…`, prog);

  stats.ms = Math.round(performance.now() - tAll);
  const memStat = MemPool.getStats();
  const vramStat = GPUMemPool.getStats();
  stats.hw = {
    coresUsed: activeCores,
    multiThread: hw.multiThread && activeCores > 1,
    workersActive: usedMtWorkers,
    gpuUsed: usedGpuShader || (hw.useGpu && HW_LIMITS.gpu.available),
    gpuBackend: gpuSession ? gpuSession.backend : (hw.useGpu ? 'WebGL2 Shader' : 'CPU'),
    gpuRenderer: HW_LIMITS.gpu.renderer,
    ramAllocatedMb: hw.ramMb,
    peakRamMb: memStat.peakMb,
    peakVramMb: vramStat.peakVramMb,
    activeVramSlots: vramStat.activeSlots,
    threadPriority: hw.threadPriority
  };
  MemPool.flush();
  await prog('done', 1, 'Selesai');

  return {
    svg, regs, palette, labels, loops: rawLoops,
    w, h, W, H, scale, cls, stats, mask,
    hasGradForAssemble, edgeField, adaptiveProfile: adpProfile,
    origLabelsSnapshot: new Int16Array(labels),
    workData: work.data, rawRgba: origRgbaSnapshot, origAlpha: work.origAlpha, hiddenLabels: [],
    traceHistory: vizState
  };
}

/* Trace ulang dari label map yang sudah diedit di SegEditor */
async function retraceFromLabels(S, cfg = {}, onProgress) {
  setTraceCtrl({ paused: false, skipToEnd: false });
  const vizState = S.traceHistory || buildTraceHistoryFromSession(S, null);
  const prog = async (stage, f, d) => {
    while (_traceCtrl.paused && !_traceCtrl.skipToEnd) {
      if (onProgress) onProgress(stage, f, d, vizState);
      await sleep(60);
    }
    if (onProgress) onProgress(stage, f, d, vizState);
    await tick();
  };
  const t0 = performance.now();
  const { labels, palette, w, h, scale, W, H, cls, workData } = S;
  const effCls = cls || (S.stats && S.stats.classification) || {};
  const adpProfile = S.adaptiveProfile || (S.stats && S.stats.adaptiveProfile) || buildAdaptiveTraceProfile(effCls, W, H, cfg.adaptiveProfileMode || 'auto');
  const adpP = (adpProfile && adpProfile.params) || {};
  const useAutoAdp = !!cfg.autoProfileParams;

  /* Deteksi piksel yang baru diedit secara manual di SegEditor agar:
     1) Sadel papan catur 2x2 & bintik 1px bekas goresan kuas dibersihkan secara lokal tanpa merusak bentuk editan,
     2) Beach Deconvolution menerima nilai RGB transisi yang konsisten dengan label baru di area editan (bukan RGB lama!) */
  let effectiveRgba = S.rawRgba;
  if (S.origLabelsSnapshot && S.origLabelsSnapshot.length === w * h) {
    const origSnap = S.origLabelsSnapshot;
    const editedMask = new Uint8Array(w * h);
    let editedCnt = 0;
    for (let p = 0; p < w * h; p++) {
      if (labels[p] !== origSnap[p]) { editedMask[p] = 1; editedCnt++; }
    }
    if (editedCnt > 0) {
      const nearEdit = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!editedMask[y * w + x]) continue;
          for (let dy = -2; dy <= 2; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= h) continue;
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              if (nx >= 0 && nx < w) nearEdit[ny * w + nx] = 1;
            }
          }
        }
      }
      /* Bersihkan sadel papan catur 2x2 khusus pada zona goresan kuas agar tidak menciptakan X-junction palsu */
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const p00 = y * w + x;
          if (!nearEdit[p00]) continue;
          const p10 = p00 + 1, p01 = p00 + w, p11 = p01 + 1;
          const l00 = labels[p00], l10 = labels[p10], l01 = labels[p01], l11 = labels[p11];
          if (l00 >= 0 && l10 >= 0 && l00 === l11 && l10 === l01 && l00 !== l10) {
            if (!wouldChangeTopology(labels, w, h, x, y, l00, l10)) labels[p00] = l10;
            else if (!wouldChangeTopology(labels, w, h, x + 1, y, l10, l00)) labels[p10] = l00;
          }
        }
      }
      if (S.rawRgba && S.rawRgba.length === w * h * 4) {
        effectiveRgba = new Uint8ClampedArray(S.rawRgba);
        /* Pertama isi piksel yang diubah dengan warna palet barunya */
        for (let p = 0; p < w * h; p++) {
          if (!editedMask[p]) continue;
          const c = palette[labels[p]];
          if (!c) continue;
          const i4 = p * 4;
          effectiveRgba[i4] = c.r; effectiveRgba[i4 + 1] = c.g; effectiveRgba[i4 + 2] = c.b;
        }
        /* Haluskan pita batas 1px di sekeliling editan manual dengan kernel 2x2 agar Beach Deconvolution mulus */
        const smRgba = new Uint8ClampedArray(effectiveRgba);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (!nearEdit[p]) continue;
            const L = labels[p];
            if (labels[p - 1] === L && labels[p + 1] === L && labels[p - w] === L && labels[p + w] === L) continue;
            let sr = 0, sg = 0, sb = 0, sw = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const np = (y + dy) * w + (x + dx);
                const c = palette[labels[np]];
                if (!c) continue;
                const wgt = (dx === 0 && dy === 0) ? 4 : (dx === 0 || dy === 0) ? 2 : 1;
                sr += c.r * wgt; sg += c.g * wgt; sb += c.b * wgt; sw += wgt;
              }
            }
            if (sw > 0) {
              const i4 = p * 4;
              smRgba[i4] = Math.round(sr / sw);
              smRgba[i4 + 1] = Math.round(sg / sw);
              smRgba[i4 + 2] = Math.round(sb / sw);
            }
          }
        }
        effectiveRgba = smRgba;
      }
      S.origLabelsSnapshot = new Int16Array(labels);
    }
  }

  if (vizState) {
    vizState.segFinalCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
  }
  await prog('trace', 0.56, 'Menelusuri ulang graf planar dari label yang diedit…');
  const aaOn = cfg.aa !== false;
  const tr = traceBoundaries(labels, w, h, { data: workData, rawRgba: effectiveRgba, origAlpha: S.origAlpha }, palette, { aa: aaOn });

  const sm = (!useAutoAdp && cfg.smoothness != null) ? cfg.smoothness : (adpP.smoothness ?? (effCls.type === 'photo' ? 56 : 66));
  const lambda = Math.pow(10, -0.8 + (sm / 100) * 2.25);
  const nd = (!useAutoAdp && cfg.nodeDensity != null) ? cfg.nodeDensity : (adpP.nodeDensity ?? 62);
  const tol = Math.max(0.08, (0.38 - (nd / 100) * 0.28)) * scale;
  const smoothed = [], rawLoops = [];
  const hw = getHwConfig();
  const activeCores = hw.multiThread ? clamp(hw.cpuCores || 1, 1, 64) : 1;
  const advOpt = {
    smoothMethod: (!useAutoAdp && cfg.smoothMethod) || adpP.smoothMethod || 'hybrid',
    lineStraighten: (!useAutoAdp ? cfg.lineStraighten : undefined) ?? adpP.lineStraighten ?? 58,
    axisSnap: (!useAutoAdp && cfg.axisSnap !== undefined) ? cfg.axisSnap !== false : (adpP.axisSnap !== false),
    axisSnapDeg: (!useAutoAdp ? cfg.axisSnapDeg : undefined) ?? adpP.axisSnapDeg ?? 2.4,
    despeckleJitter: (!useAutoAdp ? cfg.despeckleJitter : undefined) ?? adpP.despeckleJitter ?? 74,
    extremumAlign: cfg.extremumAlign !== false,
    cornerMode: (!useAutoAdp && cfg.cornerMode) || adpP.cornerMode || 'typo',
    lineCurveSensitivity: (!useAutoAdp ? cfg.lineCurveSensitivity : undefined) ?? adpP.lineCurveSensitivity ?? 76,
    apexSharpness: (!useAutoAdp ? cfg.apexSharpness : undefined) ?? adpP.apexSharpness ?? 82,
    cornerRoundness: (!useAutoAdp ? cfg.cornerRoundness : undefined) ?? adpP.cornerRoundness ?? 68,
    protectStemCaps: (!useAutoAdp && cfg.protectStemCaps !== undefined) ? cfg.protectStemCaps !== false : (adpP.protectStemCaps !== false)
  };
  const effCornerAngle = (!useAutoAdp && cfg.cornerAngle) || adpP.cornerAngle || 44;

  for (let i = 0; i < tr.loops.length; i++) {
    const lp = tr.loops[i];
    rawLoops.push({ label: lp.label, rawPts: lp.pts.map(p => [p[0], p[1]]), vkeys: lp.vkeys, juncFlags: lp.juncFlags, isTrueCircle: !!lp.isTrueCircle, area: lp.area });
  }

  let sharpCorners = 0, smoothCorners = 0, straightSegs = 0, curveSegs = 0;
  let pRes = null;
  if (hw.multiThread && activeCores > 1 && tr.loops.length >= 4) {
    pRes = await WorkerPool.smoothAndFitParallel(tr.loops, scale, {
      lambda, iters: 52, detectCorners: cfg.detectCorners !== false, cornerAngle: effCornerAngle, tol, advOpt
    }, activeCores);
  }
  if (pRes) {
    for (const r of pRes) {
      sharpCorners += (r.sharpCnt || 0);
      smoothCorners += (r.smoothCnt || 0);
      smoothed.push({ label: r.label, area: r.area, d: r.d, pts: r.scaledPts, scaledPts: r.scaledPts, segs: r.segs, isTrueCircle: !!r.isTrueCircle, sharpPts: r.sharpPts || [], smoothPts: r.smoothPts || [] });
    }
  } else {
    for (let i = 0; i < tr.loops.length; i++) {
      const lp = tr.loops[i];
      const pts = rawLoops[i].rawPts;
      const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(pts, lp.area, lambda, tol, scale, advOpt);
      const s = smoothLoop(pts, {
        ...localAdv,
        lambda: localLambda,
        iters: 52,
        detectCorners: cfg.detectCorners !== false,
        cornerAngle: effCornerAngle,
        juncFlags: lp.juncFlags,
        isTrueCircle: lp.isTrueCircle
      });
      const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
      const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
      const sharpPts = [], smoothPts = [];
      for (let k = 0; k < s.corners.length; k++) {
        if (s.corners[k]) { sharpCorners++; sharpPts.push(spts[k]); }
        else if (s.smoothKnots && s.smoothKnots[k]) { smoothCorners++; smoothPts.push(spts[k]); }
      }
      const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: lp.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt);
      smoothed.push({ label: lp.label, area: lp.area * scale * scale, d: segsToD(segs, true), pts: spts, scaledPts: spts, segs, isTrueCircle: !!s.isTrueCircle, sharpPts, smoothPts });
    }
  }
  synchronizeSharedTopology(smoothed, rawLoops);
  for (const s of smoothed) {
    for (const sg of s.segs) { if (sg.isLine) straightSegs++; else curveSegs++; }
  }
  const gMode = cfg.gradientMode || 'auto';
  const hasUserGrad = palette && palette.some(pe => pe && pe.userGrad);
  const hasGradForRetrace = gMode === 'on' || hasUserGrad || (gMode === 'auto' && effCls && effCls.surfaceMode !== 'flat' && (
    effCls.surfaceMode === 'gradient' ||
    effCls.surfaceMode === 'mixed' ||
    effCls.gradientContinuity >= 0.18 ||
    !!S.hasGradForAssemble
  ));
  if (!hasGradForRetrace && palette) {
    for (const pe of palette) {
      if (pe && !pe.userGrad) { pe.grad = null; pe.isGradient = false; }
    }
  }
  const gradCtxRetrace = ((cfg.colorMode || 'auto') !== 'two' && hasGradForRetrace)
    ? { labels, w, h, rawWork: { data: workData, rawRgba: S.rawRgba }, scale, W, H, edgeField: S.edgeField, gradientMode: gMode, forceGradient: gMode === 'on' }
    : null;
  const regs = buildRegions(smoothed, palette, 1, gradCtxRetrace);
  const svg = assembleSVG(regs, W, H, {
    stackMode: cfg.stackMode || 'stack',
    stroke: cfg.stroke !== false,
    bg: (cfg.transparency === 'white' || cfg.transparency === 'custom') ? (cfg.transparency === 'custom' ? (cfg.customColor || '#ffffff') : '#ffffff') : 'none',
    safetyBg: true,
    hiddenLabels: S.hiddenLabels || [],
  });
  if (vizState) {
    buildVizGeometryInto(vizState, rawLoops, smoothed, palette, scale);
    vizState.regs = regs;
    vizState.svg = svg;
  }
  await paceStage(performance.now(), 950, 'fit', 0.78, 0.96, 'Menggambar ulang kurva Bézier dari peta segmen baru…', prog);
  await prog('done', 1, 'Selesai');
  return {
    ...S, svg, regs, loops: rawLoops,
    traceHistory: vizState,
    stats: {
      ...(S.stats || {}),
      loops: tr.loops.length,
      bezierSegs: smoothed.reduce((a, s) => a + s.segs.length, 0),
      sharpCorners,
      smoothCorners,
      straightSegs,
      curveSegs,
      regions: regs.length,
      ms: Math.round(performance.now() - t0)
    }
  };
}

/* Render ulang smoothing + Bezier fit dari loops tersimpan (Auto-Update di Advanced Wizard) */
async function refitFromSession(sess, cfg = {}, onProgress) {
  const t0 = performance.now();
  const { loops, palette, scale, W, H } = sess;
  const sm = cfg.smoothness != null ? cfg.smoothness : 66;
  const lambda = Math.pow(10, -0.8 + (sm / 100) * 2.25);
  const nd = cfg.nodeDensity != null ? cfg.nodeDensity : 62;
  const tol = Math.max(0.08, (0.38 - (nd / 100) * 0.28)) * scale;
  const advOpt = {
    smoothMethod: cfg.smoothMethod || 'hybrid',
    lineStraighten: cfg.lineStraighten ?? 58,
    axisSnap: cfg.axisSnap !== false,
    axisSnapDeg: cfg.axisSnapDeg ?? 2.4,
    despeckleJitter: cfg.despeckleJitter ?? 74,
    extremumAlign: cfg.extremumAlign !== false,
    cornerMode: cfg.cornerMode || 'typo',
    lineCurveSensitivity: cfg.lineCurveSensitivity ?? 76,
    apexSharpness: cfg.apexSharpness ?? 82,
    cornerRoundness: cfg.cornerRoundness ?? 68,
    protectStemCaps: cfg.protectStemCaps !== false
  };
  const out = [];
  let sharpCorners = 0, smoothCorners = 0, straightSegs = 0, curveSegs = 0;
  for (let i = 0; i < loops.length; i++) {
    const lp = loops[i];
    const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(lp.rawPts, lp.area, lambda, tol, scale, advOpt);
    const s = smoothLoop(lp.rawPts, {
      ...localAdv,
      lambda: localLambda, iters: 50,
      detectCorners: cfg.detectCorners !== false,
      cornerAngle: cfg.cornerAngle || 44,
      juncFlags: lp.juncFlags,
      isTrueCircle: lp.isTrueCircle
    });
    for (let k = 0; k < s.corners.length; k++) {
      if (s.corners[k]) sharpCorners++;
      else if (s.smoothKnots && s.smoothKnots[k]) smoothCorners++;
    }
    const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
    const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
    const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: lp.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt);
    out.push({ label: lp.label, area: lp.area * scale * scale, d: segsToD(segs, true), pts: spts, scaledPts: spts, segs, isTrueCircle: !!s.isTrueCircle });
    if (i % 35 === 0 && onProgress) { onProgress(i / loops.length); await tick(); }
  }
  synchronizeSharedTopology(out, loops);
  for (const s of out) {
    for (const sg of s.segs) { if (sg.isLine) straightSegs++; else curveSegs++; }
  }
  const gMode = cfg.gradientMode || 'auto';
  const effCls = sess.cls || (sess.stats && sess.stats.classification) || {};
  const hasUserGrad = palette && palette.some(pe => pe && pe.userGrad);
  const hasGradForRefit = gMode === 'on' || hasUserGrad || (gMode === 'auto' && effCls && effCls.surfaceMode !== 'flat' && (
    effCls.surfaceMode === 'gradient' ||
    effCls.surfaceMode === 'mixed' ||
    effCls.gradientContinuity >= 0.18 ||
    !!sess.hasGradForAssemble
  ));
  if (!hasGradForRefit && palette) {
    for (const pe of palette) {
      if (pe && !pe.userGrad) { pe.grad = null; pe.isGradient = false; }
    }
  }
  const gradCtxRefit = (hasGradForRefit && sess.labels && (sess.rawRgba || sess.workData))
    ? { labels: sess.labels, w: Math.round(W / scale), h: Math.round(H / scale), rawWork: { data: sess.workData, rawRgba: sess.rawRgba }, scale, W, H, edgeField: sess.edgeField, gradientMode: gMode, forceGradient: gMode === 'on' }
    : null;
  const regs = buildRegions(out, palette, 1, gradCtxRefit);
  const svg = assembleSVG(regs, W, H, {
    stackMode: cfg.stackMode || 'stack',
    stroke: cfg.stroke !== false,
    bg: (cfg.transparency === 'white' || cfg.transparency === 'custom') ? (cfg.transparency === 'custom' ? (cfg.customColor || '#ffffff') : '#ffffff') : 'none',
    safetyBg: true,
    hiddenLabels: sess.hiddenLabels || [],
  });
  return {
    svg, regs, ms: Math.round(performance.now() - t0),
    segs: out.reduce((a, s) => a + s.segs.length, 0),
    sharpCorners, smoothCorners, straightSegs, curveSegs
  };
}

/* ---------------- Editor Segmentasi Manual ---------------- */
function renderSeg(canvas, labels, palette, w, h, opt = {}) {
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h), dd = img.data;
  for (let p = 0; p < w * h; p++) {
    const L = labels[p], o = p * 4;
    if (L < 0) { dd[o + 3] = 0; continue; }
    const c = palette[L] || { r: 200, g: 200, b: 200 };
    dd[o] = c.r; dd[o + 1] = c.g; dd[o + 2] = c.b; dd[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (opt.bounds) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const L = labels[y * w + x];
        if ((x < w - 1 && labels[y * w + x + 1] !== L) || (y < h - 1 && labels[(y + 1) * w + x] !== L)) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  return canvas;
}

function segLine(labels, w, h, x0, y0, x1, y1, L, size = 1, shape = 'circle', lockLabel = -999) {
  const r = Math.max(0, Math.floor(size / 2));
  const r2 = (r + 0.35) * (r + 0.35);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  const dot = (x, y) => {
    for (let j = -r; j <= r; j++) {
      const yy = y + j;
      if (yy < 0 || yy >= h) continue;
      const row = yy * w;
      for (let i = -r; i <= r; i++) {
        if (shape === 'circle' && r > 1 && (i * i + j * j) > r2) continue;
        const xx = x + i;
        if (xx < 0 || xx >= w) continue;
        const p = row + xx;
        if (lockLabel !== -999 && labels[p] !== lockLabel) continue;
        labels[p] = L;
        if (xx < minX) minX = xx;
        if (xx > maxX) maxX = xx;
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
    }
  };
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
  dot(x, y);
  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    dot(x, y);
  }
  return maxX >= minX ? { x0: minX, y0: minY, x1: maxX, y1: maxY } : null;
}

function segFill(labels, w, h, x, y, L, opt = {}) {
  const p0 = y * w + x;
  const from = labels[p0];
  const scope = opt.scope || 'contig'; /* 'contig' | 'global' | 'similar' */
  if (scope === 'global') {
    if (from === L) return 0;
    let n = 0;
    for (let p = 0, tot = w * h; p < tot; p++) {
      if (labels[p] === from) { labels[p] = L; n++; }
    }
    return n;
  }
  const palette = opt.palette;
  const tol = opt.tol || 0;
  const useSim = scope === 'similar' && palette && palette[from] && tol > 0;
  const c0 = useSim ? palette[from] : null;
  const maxD2 = useSim ? (tol * tol * 18) : 0;
  const canFillLabel = lbl => {
    if (lbl === from) return true;
    if (!useSim || lbl < 0 || lbl === L || !palette[lbl]) return false;
    const c = palette[lbl];
    return cdist2(c0.r, c0.g, c0.b, c.r, c.g, c.b) <= maxD2;
  };
  if (from === L && !useSim) return 0;

  const q = new Int32Array(w * h);
  const visited = useSim ? new Uint8Array(w * h) : null;
  let head = 0, tail = 0;
  q[tail++] = p0;
  labels[p0] = L;
  if (visited) visited[p0] = 1;
  while (head < tail) {
    const p = q[head++], px = p % w, py = (p / w) | 0;
    if (px > 0) {
      const np = p - 1;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
    if (px < w - 1) {
      const np = p + 1;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
    if (py > 0) {
      const np = p - w;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
    if (py < h - 1) {
      const np = p + w;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
  }
  return tail;
}

/* Magic Wand pada gambar bitmap asli: menyatukan banyak segmen pecah berdasarkan toleransi warna piksel asli */
function segWandFill(labels, rawRgba, w, h, x, y, L, tol = 28, contig = true) {
  if (!rawRgba || rawRgba.length < w * h * 4) return segFill(labels, w, h, x, y, L, { scope: contig ? 'contig' : 'global' });
  const p0 = y * w + x, i0 = p0 * 4;
  const r0 = rawRgba[i0], g0 = rawRgba[i0 + 1], b0 = rawRgba[i0 + 2];
  const maxD2 = (tol * tol) * 14 + 45;
  if (!contig) {
    let n = 0;
    for (let p = 0, tot = w * h; p < tot; p++) {
      if (labels[p] < 0) continue;
      const i = p * 4;
      if (cdist2(r0, g0, b0, rawRgba[i], rawRgba[i + 1], rawRgba[i + 2]) <= maxD2) {
        labels[p] = L; n++;
      }
    }
    return n;
  }
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;
  seen[p0] = 1; q[tail++] = p0; labels[p0] = L;
  while (head < tail) {
    const p = q[head++], px = p % w, py = (p / w) | 0;
    const nbs = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
    for (let k = 0; k < 4; k++) {
      const np = nbs[k];
      if (np < 0 || seen[np] || labels[np] < 0) continue;
      const ni = np * 4;
      if (cdist2(r0, g0, b0, rawRgba[ni], rawRgba[ni + 1], rawRgba[ni + 2]) <= maxD2) {
        seen[np] = 1; labels[np] = L; q[tail++] = np;
      }
    }
  }
  return tail;
}

function segRectFill(labels, w, h, x0, y0, x1, y1, L, lockLabel = -999) {
  const ax = clamp(Math.min(x0, x1), 0, w - 1), bx = clamp(Math.max(x0, x1), 0, w - 1);
  const ay = clamp(Math.min(y0, y1), 0, h - 1), by = clamp(Math.max(y0, y1), 0, h - 1);
  let n = 0;
  for (let y = ay; y <= by; y++) {
    const row = y * w;
    for (let x = ax; x <= bx; x++) {
      const p = row + x;
      if (labels[p] < 0) continue;
      if (lockLabel !== -999 && labels[p] !== lockLabel) continue;
      labels[p] = L; n++;
    }
  }
  return n;
}

function segZap(labels, w, h, x, y) {
  const p0 = y * w + x, from = labels[p0];
  if (from < 0) return 0;
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;
  seen[p0] = 1; q[tail++] = p0;
  const votes = new Map();
  while (head < tail) {
    const p = q[head++], px = p % w, py = (p / w) | 0;
    const nb = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
    for (let k = 0; k < 4; k++) {
      const nq = nb[k];
      if (nq < 0) continue;
      const nl = labels[nq];
      if (nl === from) {
        if (!seen[nq]) { seen[nq] = 1; q[tail++] = nq; }
      } else if (nl >= 0) {
        votes.set(nl, (votes.get(nl) || 0) + 1);
      }
    }
  }
  let bl = -1, bv = 0;
  votes.forEach((v, k) => { if (v > bv) { bv = v; bl = k; } });
  if (bl < 0) return 0;
  for (let i = 0; i < tail; i++) labels[q[i]] = bl;
  return tail;
}

function rasterizeSVG(svg, W, H, scale = 1) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(W * scale));
      c.height = Math.max(1, Math.round(H * scale));
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c);
    };
    img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}


const VMT = {
  loadImage, makeWork, analyzeAlpha, flattenAlpha, classifyStage, buildEdgeField,
  findPalette, pruneHaloPaletteClusters, detectImageColorPool, detectNextImageColor, analyzeRecommendations, buildAdaptiveTraceProfile,
  evalColorBlendPair, buildSegmentationContext, quadtreeInit, localNeighborhoodEdgeSnap, segmentMRF, enforceMinPixels, erodeSandwichedBoundaryRibbons, resolveCheckerboardSaddles, absorbBoundaryParasites, morphologicalCleanStrokes, removeBoundarySlivers,
  analyzeSmallRegions, buildDetailProtection, resolveEnclosedNoiseIslands, runSegmentationCleanup,
  detectHorizontalSplitLines, injectPointHighlights, unifyGradientBands, fitComponentGradientFromPixels, attachGradientsToRegions,
  gradToCss, compactActivePaletteAndLabels, consolidateGradientPalette, applySessionPaletteAndGradientSettings,
  traceBoundaries, pruneContourSliverSpikes, refineBeachPlanar, douglasPeucker, simplifyClosed, smoothLoop, detectCorners,
  fitLoopBeziers, segsToD, synchronizeSharedTopology, analyzeColorPlateausAndGradients, buildRegions, assembleSVG, exportDXF,
  vectorize, retraceFromLabels, refitFromSession, STAGES,
  renderSeg, segLine, segFill, segWandFill, segRectFill, segZap, rasterizeSVG,
  hexOf, rgbOf, cdist2, rgb2lab, lab2lch, ciede2000, clamp,
  evaluateSegmentationRoundTrip, evaluateFinalVectorRoundTrip, generateBoundedCandidates, computeContourAdaptiveOpts,
  getHwConfig, setHwConfig, resetHwConfig, getHwInfo, subscribeHwConfig,
  getTraceCtrl, setTraceCtrl, subscribeTraceCtrl, buildTraceHistoryFromSession,
  MemPool, GPUMemPool, GpuAccelerator, WorkerPool,
};
window.VMT = VMT;
