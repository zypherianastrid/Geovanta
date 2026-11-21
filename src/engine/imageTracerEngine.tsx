/**
 * @file src/engine/imageTracerEngine.tsx
 * @description Raster Image to Vector SVG Auto-Tracer powered by SVGPeak VMT Bayesian Vectorization Engine
 * (8-Stage Multiscale Image Profiler, CIE-Lab/CIEDE2000 KD-Tree & K-Means++, QuadTree + MRF Potts Segmentation,
 * Beach Sub-Pixel Deconvolution, Polak-Ribière Conjugate Gradient Smoother, Cubic Bézier Fitting & Gradient Assembly).
 */
import { getSvgPeakVmtEngine } from './svgpeak/vmtEngineBundle.js';
import { parseSVG } from './svgDocumentParser.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { scaleObjXY } from './selectionTransformAndAlign.tsx';
import { translate } from './bezierSubdivisionAndMove.tsx';
import { uid } from './vectorPrimitives.tsx';

export interface AutoTraceOptions {
  /** 'bw' (Two Colors) | 'color' (Automatic / Custom Colors) | 'auto' | 'two' | 'unlimited' */
  mode?: 'bw' | 'color' | 'auto' | 'two' | 'unlimited';
  /** SVGPeak VMT color mode: 'auto' | 'two' | 'custom' | 'unlimited' */
  colorMode?: 'auto' | 'two' | 'custom' | 'unlimited';
  /** SVGPeak 8-Stage Image Profiler mode: 'auto' | 'flat' | 'illustration' | 'photo' */
  adaptiveProfileMode?: 'auto' | 'flat' | 'illustration' | 'photo';
  /** Image edge classification override: 'auto' | 'blended' | 'aliased' | 'photo' */
  imageType?: 'auto' | 'blended' | 'aliased' | 'photo';
  /** Quality/noise level override: 'auto' | 'high' | 'medium' | 'low' */
  quality?: 'auto' | 'high' | 'medium' | 'low';
  /** Gradient extraction mode: 'auto' | 'on' | 'off' */
  gradientMode?: 'auto' | 'on' | 'off';
  /** Layer assembly mode: 'stack' | 'cutout' | 'grouped' */
  stackMode?: 'stack' | 'cutout' | 'grouped';
  /** Luminance cutoff (0..255) for strict B&W pre-thresholding when mode === 'bw' */
  threshold?: number;
  /** Maximum / target color layers (2..64, default 16) */
  colorCount?: number;
  /** Whether to cap automatic palette count to colorCount */
  maxColorEnabled?: boolean;
  /** Minimum region area in pixels (filter_speckle, default 4) */
  despeckle?: number;
  /** Curve smoothing factor (0..1.5 normalized or 0..100 percentage, default 0.66 / 66%) */
  smoothness?: number;
  /** Node density / curve fidelity (0..100, default 62) */
  nodeDensity?: number;
  /** Corner angle threshold in degrees (15..165, default 44) */
  cornerThreshold?: number;
  /** Perceptual CIEDE2000 layer difference (ΔE, default 4.2) */
  layerDifference?: number;
  /** Enable SVGPeak Closed-Loop Calibration & Round-Trip Evaluator */
  closedLoop?: boolean;
  /** Enable anti-gap seam stroke between adjacent regions */
  stroke?: boolean;
  /** Omit near-white background region from traced output */
  ignoreWhite?: boolean;
  /** Keep original raster image object underneath traced vector paths */
  keepOriginalImage?: boolean;
  /** Maximum working resolution dimension (default 880) */
  maxSampleDim?: number;
}

export const DEFAULT_AUTO_TRACE_OPTIONS: Required<AutoTraceOptions> = {
  mode: 'color',
  colorMode: 'auto',
  adaptiveProfileMode: 'auto',
  imageType: 'auto',
  quality: 'auto',
  gradientMode: 'auto',
  stackMode: 'stack',
  threshold: 128,
  colorCount: 16,
  maxColorEnabled: false,
  despeckle: 4,
  smoothness: 0.66,
  nodeDensity: 62,
  cornerThreshold: 44,
  layerDifference: 4.2,
  closedLoop: true,
  stroke: true,
  ignoreWhite: true,
  keepOriginalImage: false,
  maxSampleDim: 880,
};

/**
 * Returns the full 85-function SVGPeak VMT Bayesian Vectorization Engine instance.
 */
export function getSvgPeakVmt(): any {
  return getSvgPeakVmtEngine().VMT;
}

/**
 * Returns the SVGPeak VE (SVG / AI / EPS Exporter) engine instance.
 */
export function getSvgPeakVe(): any {
  return getSvgPeakVmtEngine().VE;
}

/**
 * Normalizes AutoTraceOptions into an SVGPeak VMT configuration object.
 */
export function buildSvgPeakVmtConfig(options: AutoTraceOptions = {}): any {
  const opts = { ...DEFAULT_AUTO_TRACE_OPTIONS, ...options };
  const isBw = opts.mode === 'bw' || opts.mode === 'two' || opts.colorMode === 'two';
  const effColorMode = isBw
    ? 'two'
    : opts.mode === 'unlimited' || opts.colorMode === 'unlimited'
    ? 'unlimited'
    : opts.colorMode || 'auto';

  const rawSmooth = Number(opts.smoothness);
  const smoothnessPct = Number.isFinite(rawSmooth)
    ? rawSmooth <= 2.0
      ? Math.max(0, Math.min(100, Math.round(rawSmooth * 66)))
      : Math.max(0, Math.min(100, Math.round(rawSmooth)))
    : 66;

  const maxColOn = !isBw && (opts.maxColorEnabled || (options.colorCount != null && effColorMode === 'auto'));
  const maxColors = Math.max(2, Math.min(64, Math.round(opts.colorCount || 16)));

  return {
    adaptiveProfileMode: opts.adaptiveProfileMode || 'auto',
    closedLoop: opts.closedLoop !== false,
    imageType: opts.imageType || 'auto',
    quality: opts.quality || 'auto',
    transparency: 'keep',
    colorMode: effColorMode,
    maxColorEnabled: maxColOn,
    maxColors,
    targetColors: maxColOn ? maxColors : undefined,
    gradientMode: isBw ? 'off' : (opts.gradientMode || 'auto'),
    minPixels: Math.max(1, Math.round(opts.despeckle ?? 4)),
    smoothness: smoothnessPct,
    nodeDensity: Math.max(10, Math.min(100, Math.round(opts.nodeDensity ?? 62))),
    cornerAngle: Math.max(15, Math.min(165, Math.round(opts.cornerThreshold ?? 44))),
    layerDifference: opts.layerDifference ?? 4.2,
    autoProfileParams: options.smoothness == null && options.despeckle == null && options.cornerThreshold == null,
    stroke: opts.stroke !== false,
    stackMode: opts.stackMode || 'stack',
    maxDim: Math.max(64, Math.min(2048, Math.round(opts.maxSampleDim || 880))),
    fastPreview: true,
  };
}

/**
 * Detects near-white background palette labels so they can be hidden when `ignoreWhite` is enabled.
 */
function computeHiddenWhiteLabels(
  palette: any[],
  labels: Int16Array | number[] | null,
  w: number,
  h: number,
  ignoreWhite: boolean
): number[] {
  if (!ignoreWhite || !Array.isArray(palette) || palette.length <= 1) return [];
  const whiteCandidates = new Set<number>();
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    if (!c) continue;
    if (c.r >= 238 && c.g >= 238 && c.b >= 238) {
      whiteCandidates.add(i);
    }
  }
  if (!whiteCandidates.size || whiteCandidates.size >= palette.length) return [];

  if (labels && labels.length === w * h && w > 2 && h > 2) {
    const borderHits = new Map<number, number>();
    for (let x = 0; x < w; x++) {
      const lTop = labels[x];
      const lBot = labels[(h - 1) * w + x];
      if (whiteCandidates.has(lTop)) borderHits.set(lTop, (borderHits.get(lTop) || 0) + 1);
      if (whiteCandidates.has(lBot)) borderHits.set(lBot, (borderHits.get(lBot) || 0) + 1);
    }
    for (let y = 1; y < h - 1; y++) {
      const lLeft = labels[y * w];
      const lRight = labels[y * w + (w - 1)];
      if (whiteCandidates.has(lLeft)) borderHits.set(lLeft, (borderHits.get(lLeft) || 0) + 1);
      if (whiteCandidates.has(lRight)) borderHits.set(lRight, (borderHits.get(lRight) || 0) + 1);
    }
    if (borderHits.size > 0) {
      return Array.from(borderHits.keys());
    }
  }
  return Array.from(whiteCandidates);
}

/**
 * Pre-processes an RGBA buffer when strict B&W luminance thresholding (`mode === 'bw'`) is requested with a custom threshold.
 */
function preprocessBwThresholdRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  threshold: number,
  ignoreWhite: boolean
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const thr = Math.max(1, Math.min(254, Math.round(threshold)));
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a < 32) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 0;
      continue;
    }
    const lum = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
    if (lum <= thr) {
      out[i] = 24;
      out[i + 1] = 24;
      out[i + 2] = 27;
      out[i + 3] = 255;
    } else {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = ignoreWhite ? 0 : 255;
    }
  }
  return out;
}

/**
 * Full async SVGPeak VMT vectorization on an RGBA buffer.
 */
export async function traceRgbaBufferToSvgAsync(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: AutoTraceOptions = {},
  onProgress?: (stage: string, frac: number, detail: string, viz?: any) => void
): Promise<{ svg: string; palette: any[]; regions: any[]; stats: any }> {
  const VMT = getSvgPeakVmt();
  const opts = { ...DEFAULT_AUTO_TRACE_OPTIONS, ...options };
  const vmtCfg = buildSvgPeakVmtConfig(opts);
  const inputRgba =
    opts.mode === 'bw' && options.threshold != null
      ? preprocessBwThresholdRgba(rgba, opts.threshold, opts.ignoreWhite)
      : rgba instanceof Uint8ClampedArray
      ? rgba
      : new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength);

  const res = await VMT.vectorize(
    { rgba: inputRgba, img: { _rgba: inputRgba, w: width, h: height }, w: width, h: height },
    vmtCfg,
    onProgress || (() => {})
  );

  const hiddenLabels = computeHiddenWhiteLabels(res.palette, res.labels, res.w, res.h, opts.ignoreWhite);
  const svg = VMT.assembleSVG(res.regs, res.W, res.H, {
    stackMode: vmtCfg.stackMode || 'stack',
    stroke: vmtCfg.stroke !== false,
    bg: 'none',
    safetyBg: !opts.ignoreWhite && !(res.stats?.alpha?.hasAlpha),
    hiddenLabels,
    frameId: false,
  });

  return {
    svg,
    palette: res.palette || [],
    regions: res.regs || [],
    stats: res.stats || {},
  };
}

/**
 * Synchronous SVGPeak VMT pipeline execution on a raw RGBA8 pixel buffer.
 * Executes SVGPeak's synchronous VMT stages directly (classifyStage -> buildAdaptiveTraceProfile ->
 * buildEdgeField -> findPalette -> quadtreeInit -> segmentMRF -> localNeighborhoodEdgeSnap ->
 * runSegmentationCleanup -> traceBoundaries -> smoothLoop -> fitLoopBeziers -> synchronizeSharedTopology ->
 * buildRegions -> assembleSVG).
 */
export function traceRgbaBufferToSvg(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: AutoTraceOptions = {}
): string {
  const w0 = width | 0;
  const h0 = height | 0;
  if (w0 <= 0 || h0 <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>`;
  }

  const VMT = getSvgPeakVmt();
  const opts = { ...DEFAULT_AUTO_TRACE_OPTIONS, ...options };
  const vmtCfg = buildSvgPeakVmtConfig(opts);

  const inputRgba =
    opts.mode === 'bw' && options.threshold != null
      ? preprocessBwThresholdRgba(rgba, opts.threshold, opts.ignoreWhite)
      : rgba instanceof Uint8ClampedArray
      ? rgba
      : new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength);

  const work = VMT.makeWork(
    { rgba: inputRgba, img: { _rgba: inputRgba, w: w0, h: h0 }, w: w0, h: h0 },
    vmtCfg.maxDim
  );
  const { w, h, scale } = work;
  const W = w0;
  const H = h0;

  const alphaInfo = VMT.analyzeAlpha(work.data);
  const mask = VMT.flattenAlpha(work, vmtCfg.transparency || 'keep');
  work.rawRgba = new Uint8ClampedArray(work.data.data);
  const rawBeachWork: any = {
    data: { data: new Uint8ClampedArray(work.data.data), width: w, height: h },
    rawRgba: work.rawRgba,
    w,
    h,
    origAlpha: work.origAlpha,
  };

  const cls = VMT.classifyStage(work, alphaInfo, W, H);
  const adpProfile = VMT.buildAdaptiveTraceProfile(cls, W, H, vmtCfg.adaptiveProfileMode || 'auto');
  const adpP = adpProfile.params;

  const edgeField = VMT.buildEdgeField(work, mask);
  const palRes = VMT.findPalette(
    work,
    mask,
    {
      colorMode: vmtCfg.colorMode || 'auto',
      targetColors: vmtCfg.targetColors,
      maxColorEnabled: vmtCfg.maxColorEnabled,
      maxColors: vmtCfg.maxColors,
      gradientMode: vmtCfg.gradientMode,
      adaptiveKMax: vmtCfg.maxColorEnabled
        ? Math.min(adpP.targetKMax || 22, vmtCfg.maxColors)
        : adpP.targetKMax,
      sensitivity: adpP.sensitivity || 'medium',
      layerDifference: vmtCfg.layerDifference ?? adpP.layerDifference,
      imageType: cls.type,
    },
    edgeField
  );
  const palette = palRes.palette;

  const q = adpP.qtVarThr || 320;
  const labels = VMT.quadtreeInit(
    work,
    mask,
    palette,
    cls.type === 'aliased' ? q * 0.35 : q,
    edgeField,
    [],
    rawBeachWork
  );
  const segCtx = labels._segCtx || work._segCtx;
  rawBeachWork._segCtx = segCtx;

  const cplx = adpP.complexity || 55;
  const noiseBeta = ({ high: 1250, medium: 2100, low: 3600 } as any)[cls.quality] || 2100;
  const beta =
    noiseBeta *
    (adpP.mrfBetaScale || 1.0) *
    (1.28 - (cplx / 100) * 0.85) *
    (cls.type === 'aliased' ? 0.45 : 1);
  const mrfIters = Math.min(10, adpP.mrfIters || 12);

  VMT.segmentMRF(work, mask, labels, palette, {
    beta,
    maxIter: mrfIters,
    startIter: 0,
    totalIters: mrfIters,
    topology: true,
    rawWork: rawBeachWork,
    edgeField,
    segCtx,
  });

  VMT.localNeighborhoodEdgeSnap(rawBeachWork, mask, labels, palette, edgeField, adpP.snapPasses || 3, segCtx);
  const minPx = opts.despeckle != null ? Math.max(1, Math.round(opts.despeckle)) : adpP.minPixels;
  VMT.runSegmentationCleanup(labels, w, h, rawBeachWork, palette, mask, segCtx, minPx);

  if (vmtCfg.colorMode !== 'two') {
    VMT.unifyGradientBands(labels, w, h, rawBeachWork, mask, palette, edgeField, cls, {
      gradientMode: vmtCfg.gradientMode,
      forceGradient: vmtCfg.gradientMode === 'on',
      maxColorEnabled: vmtCfg.maxColorEnabled,
      maxColors: vmtCfg.maxColors,
      attachPreviewGradients: true,
    });
  } else {
    VMT.compactActivePaletteAndLabels(labels, w, h, rawBeachWork, mask, palette, edgeField, cls, {
      maxColorEnabled: vmtCfg.maxColorEnabled,
      maxColors: vmtCfg.maxColors,
      attachGradients: false,
    });
  }

  const tr = VMT.traceBoundaries(labels, w, h, rawBeachWork, palette, { aa: true });
  const sm = vmtCfg.smoothness ?? adpP.smoothness ?? 66;
  const lambda = Math.pow(10, -0.8 + (sm / 100) * 2.25);
  const nd = vmtCfg.nodeDensity ?? adpP.nodeDensity ?? 62;
  const tol = Math.max(0.08, 0.38 - (nd / 100) * 0.28) * scale;
  const effCornerAngle = vmtCfg.cornerAngle || adpP.cornerAngle || 44;

  const advOpt = {
    smoothMethod: adpP.smoothMethod || 'hybrid',
    lineStraighten: adpP.lineStraighten ?? 58,
    axisSnap: adpP.axisSnap !== false,
    axisSnapDeg: adpP.axisSnapDeg ?? 2.4,
    despeckleJitter: adpP.despeckleJitter ?? 74,
    extremumAlign: true,
    cornerMode: adpP.cornerMode || 'typo',
    lineCurveSensitivity: adpP.lineCurveSensitivity ?? 76,
    apexSharpness: adpP.apexSharpness ?? 82,
    cornerRoundness: adpP.cornerRoundness ?? 68,
    protectStemCaps: adpP.protectStemCaps !== false,
  };

  const rawLoops: any[] = [];
  const smoothed: any[] = [];
  for (let i = 0; i < tr.loops.length; i++) {
    const lp = tr.loops[i];
    const pts = lp.pts.map((p: number[]) => [p[0], p[1]]);
    rawLoops.push({
      label: lp.label,
      rawPts: pts,
      vkeys: lp.vkeys,
      juncFlags: lp.juncFlags,
      isTrueCircle: !!lp.isTrueCircle,
      area: lp.area,
    });
    const { localLambda, localTol, localAdv } = VMT.computeContourAdaptiveOpts(
      pts,
      lp.area,
      lambda,
      tol,
      scale,
      advOpt
    );
    const s = VMT.smoothLoop(pts, {
      ...localAdv,
      lambda: localLambda,
      iters: 42,
      detectCorners: true,
      cornerAngle: effCornerAngle,
      juncFlags: lp.juncFlags,
      isTrueCircle: lp.isTrueCircle,
    });
    const spts = s.pts.map((p: number[]) => [p[0] * scale, p[1] * scale]);
    const scaledCircleFit = s.circleFit
      ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale }
      : null;
    const segs = VMT.fitLoopBeziers(
      {
        pts: spts,
        corners: s.corners,
        smoothKnots: s.smoothKnots,
        knotTangents: s.knotTangents,
        juncFlags: lp.juncFlags,
        straightSpanFlags: s.straightSpanFlags,
        isTrueCircle: s.isTrueCircle,
        circleFit: scaledCircleFit,
      },
      localTol,
      localAdv || advOpt
    );
    smoothed.push({
      label: lp.label,
      pts: spts,
      scaledPts: spts,
      segs,
      d: VMT.segsToD(segs, true),
      area: lp.area * scale * scale,
    });
  }

  VMT.synchronizeSharedTopology(smoothed, rawLoops);
  const regs = VMT.buildRegions(smoothed, palette, 1, null);
  const hiddenLabels = computeHiddenWhiteLabels(palette, labels, w, h, opts.ignoreWhite);
  return VMT.assembleSVG(regs, W, H, {
    stackMode: vmtCfg.stackMode || 'stack',
    stroke: vmtCfg.stroke !== false,
    bg: 'none',
    safetyBg: !opts.ignoreWhite && !alphaInfo.hasAlpha,
    hiddenLabels,
    frameId: false,
  });
}

/**
 * Load an image href (data URI / blob URL / asset URL) into an offscreen HTMLCanvasElement and extract its RGBA buffer.
 */
export async function extractImageObjectRgba(
  imgHref: string,
  maxDim = 880
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Canvas 2D environment required to decode raster image');
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = Math.max(1, img.naturalWidth || img.width || 64);
        const nh = Math.max(1, img.naturalHeight || img.height || 64);
        const scale = Math.min(1, maxDim / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to obtain 2D context for image tracing'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        resolve({
          rgba: new Uint8Array(imgData.data.buffer, imgData.data.byteOffset, imgData.data.byteLength),
          width: w,
          height: h,
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load raster image for Auto Trace'));
    img.src = imgHref;
  });
}

/**
 * Trace an editor image object (`o.type === 'image'` / `o.img`) into vector path objects positioned at the image's bounding box
 * using the full SVGPeak VMT Bayesian Vectorization Engine (`VMT.vectorize`).
 */
export async function traceImageObjectToVectorPaths(
  imageObj: any,
  options: AutoTraceOptions = {},
  onProgress?: (stage: string, frac: number, detail: string) => void
): Promise<{ objects: any[]; svg: string; nodeCount: number; pathCount: number; stats?: any; palette?: any[] }> {
  if (!imageObj || !imageObj.img || !imageObj.img.href) {
    throw new Error('Invalid image object');
  }
  const opts = { ...DEFAULT_AUTO_TRACE_OPTIONS, ...options };
  const { rgba, width, height } = await extractImageObjectRgba(imageObj.img.href, opts.maxSampleDim);
  const traceRes = await traceRgbaBufferToSvgAsync(rgba, width, height, opts, onProgress);
  const svg = traceRes.svg;
  const parsed = parseSVG(svg);
  if (parsed.error || !parsed.objects.length) {
    return { objects: [], svg, nodeCount: 0, pathCount: 0, stats: traceRes.stats, palette: traceRes.palette };
  }

  // Filter out synthetic Frame-bg if ignoreWhite is true
  const rawObjects = opts.ignoreWhite
    ? parsed.objects.filter((po: any) => !po.isFrameBg)
    : parsed.objects;
  if (!rawObjects.length) {
    return { objects: [], svg, nodeCount: 0, pathCount: 0, stats: traceRes.stats, palette: traceRes.palette };
  }

  // Compute target bounding box of the image object on the canvas
  const bb = tightBBox(imageObj);
  const targetX = Number.isFinite(bb?.[0]) ? bb[0] : 0;
  const targetY = Number.isFinite(bb?.[1]) ? bb[1] : 0;
  const targetW = Number.isFinite(bb?.[2]) && bb[2] > bb[0] ? bb[2] - bb[0] : (imageObj.img.w || width);
  const targetH = Number.isFinite(bb?.[3]) && bb[3] > bb[1] ? bb[3] - bb[1] : (imageObj.img.h || height);

  const sx = targetW / Math.max(1, width);
  const sy = targetH / Math.max(1, height);
  const baseName = (imageObj.name || 'Trace').replace(/\s+/g, '-');
  const groupId = rawObjects.length > 1 ? `${baseName}-trace` : (imageObj.group || null);

  let totalNodes = 0;
  const outObjects = rawObjects.map((po: any, idx: number) => {
    let transformed = scaleObjXY(po, 0, 0, sx, sy, true);
    transformed = translate(transformed, targetX, targetY);
    const nCount = (transformed.subs || []).reduce((acc: number, sp: any) => acc + (sp.nodes?.length || 0), 0);
    totalNodes += nCount;
    return {
      ...transformed,
      id: uid(),
      name: rawObjects.length === 1 ? `${baseName}-traced` : `${baseName}-layer-${idx + 1}`,
      group: groupId,
      containerType: undefined,
      isAutoFrame: false,
      isFrameBg: false,
      opacity: (transformed.opacity ?? 1) * (imageObj.opacity ?? 1),
    };
  });

  return {
    objects: outObjects,
    svg,
    nodeCount: totalNodes,
    pathCount: outObjects.length,
    stats: traceRes.stats,
    palette: traceRes.palette,
  };
}
