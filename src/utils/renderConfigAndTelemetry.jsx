/**
 * @file src/utils/renderConfigAndTelemetry.jsx
 * @description Konfigurasi pipeline render & telemetri performa frame/memori
 */
import { ACTIVE_DEVICE_PROFILE, TIER_HYSTERESIS } from './gpuCapabilities.jsx';
import { GPU_TIMER_QUERY_SUPPORTED } from './gpuTimerQuery.jsx';
import { GEOMETRY_CACHE } from '../renderer/geometryCache.jsx';

/* =========================================================================
   KONFIGURASI PIPELINE RENDERING HYBRID GEOVANTA (Tahap 1–6)
   - Mengontrol Seam Guard (default: false untuk A/B test), Target Pixel Error (0.25 px),
     Max Bézier Depth (16), Min Segment Length (0.01 px), Local Coordinate Rebasing (Float32),
     Tiered Antialiasing (MSAA / Analytic Edge Coverage / SSAA / FXAA), Backend Override, & 7 Debug Modes.
   ========================================================================= */
const _initDevProf = typeof ACTIVE_DEVICE_PROFILE !== 'undefined' && ACTIVE_DEVICE_PROFILE ? ACTIVE_DEVICE_PROFILE : {
  tier: 'mid-tier',
  maxDpr: 2.0,
  targetPixelError: 0.25,
  maxVerticesPerObject: 32768,
  vramBudgetBytes: 128 * 1024 * 1024
};
const MAX_RENDER_DPR = _initDevProf.maxDpr;
const RENDER_CONFIG = {
  seamGuard: false,
  selectiveSeamGuard: false,
  targetPixelError: _initDevProf.targetPixelError || 0.25,
  maxBezierDepth: 16,
  minSegmentLengthPx: 0.01,
  vertexBudgetPerObject: _initDevProf.maxVerticesPerObject || 65536,
  maxRenderDpr: MAX_RENDER_DPR,
  deviceProfileTier: _initDevProf.tier,
  aaMode: 'msaa',
  // 'msaa' | 'analytic' | 'ssaa' | 'fxaa'
  backendOverride: 'auto',
  // 'auto' | 'webgl2' | 'canvas2d' | 'svg'
  canvasUseCanonicalLOD: true,
  localCoordRebasing: true,
  /* Desain 3 Mode Rendering (Bagian 4 `perbaikan tools geovanta terbaru.md`):
     - 'smooth'   : Mode 1 — Smooth Vector (Default: geometri vektor tetap halus & solid tanpa kotak abu-abu)
     - 'coverage' : Mode 2 — Pixel Coverage Preview (melihat hasil rasterisasi 1x1 beserta partial alpha coverage)
     - 'hard'     : Mode 3 — Hard Pixel Preview (rasterizer biner per-objek: piksel kotak tegas 100% solid tanpa tepi transparan) */
  pixelPreviewMode: 'smooth',
  // 'smooth' | 'hard' | 'coverage'
  pixelBoxZoom: 'smooth',
  // alias sinkron untuk kompatibilitas ('smooth' | 'hard' | 'coverage')
  pixelBoxThreshold: 6,
  pixelGrid: true,
  // Tampilkan garis kotak-kotak piksel 1x1 px saat mode Hard/Coverage aktif
  pixelGridInSmooth: false,
  // Pada Smooth Vector, jangan timpa bentuk solid dengan garis grid kecuali diminta
  logPartialAlpha: false,
  // Log diagnostik `Partial alpha coverage:` ke console saat pengujian Bagian 5
  debugGeometry: false,
  debugMode: 'none' // 'none' | 'original' | 'polyline' | 'mesh' | 'fill_tris' | 'stroke_tris' | 'seam_guard' | 'edge_coverage'
};

const getActivePixelPreviewMode = zoom => {
  const m = RENDER_CONFIG.pixelPreviewMode || RENDER_CONFIG.pixelBoxZoom || 'smooth';
  if (m === 'hard' || m === 'coverage') {
    if (zoom != null && Number.isFinite(zoom) && zoom < 1.5) return 'smooth';
    return m;
  }
  return 'smooth';
};
const isPixelBoxModeActive = zoom => {
  const m = RENDER_CONFIG.pixelPreviewMode || RENDER_CONFIG.pixelBoxZoom || 'smooth';
  return m === 'hard' || m === 'coverage';
};
const updateRenderConfig = patch => {
  if (!patch) return RENDER_CONFIG;
  const geomKeys = ['targetPixelError', 'maxBezierDepth', 'minSegmentLengthPx', 'vertexBudgetPerObject', 'localCoordRebasing', 'seamGuard', 'selectiveSeamGuard'];
  let geomChanged = false;
  if (patch.pixelPreviewMode && !patch.pixelBoxZoom) patch = {
    ...patch,
    pixelBoxZoom: patch.pixelPreviewMode
  };else if (patch.pixelBoxZoom && !patch.pixelPreviewMode) {
    const mapped = patch.pixelBoxZoom === 'off' ? 'smooth' : patch.pixelBoxZoom === 'on' || patch.pixelBoxZoom === 'auto' ? 'hard' : patch.pixelBoxZoom;
    patch = {
      ...patch,
      pixelPreviewMode: mapped,
      pixelBoxZoom: mapped
    };
  }
  for (const k of Object.keys(patch)) {
    if (RENDER_CONFIG[k] !== patch[k]) {
      if (geomKeys.includes(k)) geomChanged = true;
      RENDER_CONFIG[k] = patch[k];
    }
  }
  if (RENDER_CONFIG.debugMode !== 'none') RENDER_CONFIG.debugGeometry = true;
  if (geomChanged && typeof GEOMETRY_CACHE !== 'undefined' && GEOMETRY_CACHE.clearAll) {
    GEOMETRY_CACHE.clearAll();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('geovanta-render-config', {
      detail: {
        ...RENDER_CONFIG,
        geomChanged
      }
    }));
  }
  return {
    ...RENDER_CONFIG
  };
};

/* Real-Time Performance, Tessellation, MSAA Audit & Direct renderFrame() Execution Telemetry */
/* Real-Time Performance, Tessellation, MSAA Audit & Direct renderFrame() Execution Telemetry */
const PERF_TELEMETRY = (() => {
  const MAX_SAMPLES = 120;
  const renderDurations = new Float64Array(MAX_SAMPLES);
  const frameIntervals = new Float64Array(MAX_SAMPLES);
  let rHead = 0,
    rCount = 0,
    fHead = 0,
    fCount = 0,
    lastRenderTs = 0,
    droppedFrames = 0;
  let lastInteractionTs = 0,
    rafProbeActive = false;
  /* P2-05 (Track 4): ring buffer terpisah untuk frame interaksi (hanya saat
     pointer/zoom aktif) dan untuk durasi thumbnail — jangan dicampur dengan
     sampel render-pass/idle agar p95 interaksi jujur. */
  const interactionIntervals = new Float64Array(MAX_SAMPLES);
  let iHead = 0,
    iCount = 0;
  const thumbDurations = new Float64Array(60);
  let tHead = 0,
    tCount = 0;
  const _percentileOf = (arr, count, q) => {
    if (!count) return 0;
    const sub = Array.from(arr.subarray(0, count)).sort((a, b) => a - b);
    return Math.round(sub[Math.min(sub.length - 1, Math.max(0, Math.floor((sub.length - 1) * q)))] * 100) / 100;
  };
  /* P2-05 (Track 4): hitung long task via PerformanceObserver. Aman bila API
     tak tersedia (mis. WebView lama): counter tetap 0 dan tidak throw. */
  if (typeof window !== 'undefined' && typeof PerformanceObserver !== 'undefined') {
    try {
      const _ltObs = new PerformanceObserver(list => {
        try {
          const entries = list.getEntries ? list.getEntries() : [];
          for (const e of entries) {
            state.longTaskCount++;
            if (e.duration > state.longTaskMaxMs) state.longTaskMaxMs = Math.round(e.duration * 100) / 100;
          }
        } catch (e) {}
      });
      _ltObs.observe({
        entryTypes: ['longtask']
      });
    } catch (e) {}
  }
  /* P2-06 (Track 4): sinkronkan tier ke snapshot saat setDeviceProfileTier /
     setPerfPreset mengubahnya (event 'geovanta-device-tier'). */
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    try {
      window.addEventListener('geovanta-device-tier', ev => {
        const d = ev && ev.detail || {};
        if (d.tier) state.deviceProfileTier = d.tier;
        if (d.apiUnknown != null) state.deviceProfileApiUnknown = !!d.apiUnknown;
        if (d.mode) state.deviceTierMode = d.mode;
      });
    } catch (e) {}
  }
  const state = {
    fps: 120,
    nativeHz: 120,
    targetFrameBudgetMs: 8.33,
    uncappedFps: true,
    renderPassMs: 0.4,
    tessellationTimeMs: 0.1,
    lastTessellationMs: 0.1,
    p50: 0.5,
    p95: 1.8,
    p99: 3.2,
    droppedFrames: 0,
    domNodeCount: 0,
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    domPathCount: 0,
    gpuDrawCalls: 0,
    snapQueryMs: 0,
    activeBackend: 'WebGL2 Hardware Engine',
    lodLevel: 0,
    effectiveZoom: 1,
    currentEpsilon: 0.25,
    targetPixelError: 0.25,
    lodSegments: 0,
    totalVertices: 0,
    fillTriangleCount: 0,
    strokeTriangleCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cachedObjectsCount: 0,
    /* P1-05 followup: byte cache di atas budget + jumlah entri oversized
       (dari SceneRenderer.getCacheStats(); 0 bila tidak ada yang over-budget). */
    overBudgetBytes: 0,
    oversizedEntryCount: 0,
    toleranceMet: true,
    partialAlphaPixels: 0,
    pixelPreviewMode: 'smooth',
    maxDepthHitCount: 0,
    budgetHitCount: 0,
    geometryCacheBytes: 0,
    vboBytes: 0,
    textureBytes: 0,
    imageDecodedPixels: 0,
    historyBytes: 0,
    autosaveQueueLagMs: 0,
    lastImportParseMs: 0,
    webglContextLostCount: 0,
    backendFallbackReason: 'none',
    deviceProfileTier: _initDevProf.tier,
    /* P2-06 (Track 4): dibawa dari profil perangkat; true bila API memori/
       core tak tersedia sehingga tier jatuh ke 'unknown'. */
    deviceProfileApiUnknown: !!_initDevProf.apiUnknown,
    deviceTierMode: 'auto',
    /* P2-05 (Track 4): metrik BARU di samping metrik lama. Definisi lama
       TIDAK diubah: renderPassMs tetap waktu CPU submit seperti sebelumnya,
       fps/p50/p95/p99 tetap dari sampel render-pass. Yang baru:
       - rafIntervalMs: rerata interval antar frame aktual (ms).
       - interactionFrameP50/P95/P99: persentil interval frame HANYA saat
         pointer/zoom aktif (markInteractionFrame), bukan campuran idle.
       - cpuSubmitMs: alias eksplisit waktu CPU menyiapkan+mengirim draw
         command (nilai sama dengan renderPassMs; penamaan jujur).
       - gpuTimeMs: waktu eksekusi GPU via EXT_disjoint_timer_query_webgl2;
         null bila extension tak tersedia / belum ada sampel. Wiring query
         ada di sceneRenderer (TERLARANG untuk track ini) — lihat modul
         baru src/utils/gpuTimerQuery.jsx + laporan Track 4.
       - gpuTimerQuerySupported: hasil probe extension (false = tak tersedia).
       - longTaskCount/longTaskMaxMs: dari PerformanceObserver 'longtask'.
       - thumbnailLastMs/thumbnailP95Ms/thumbnailCount/
         thumbnailSkippedCached/thumbnailDroppedUnstable: durasi pembuatan
         thumbnail (P2-04), terpisah dari autosave. */
    rafIntervalMs: 0,
    interactionFrameP50: 0,
    interactionFrameP95: 0,
    interactionFrameP99: 0,
    cpuSubmitMs: 0.4,
    gpuTimeMs: null,
    /* P2-05: hasil probe sekali saat modul dimuat (bukan klaim dari membaca
       kode): true hanya bila EXT_disjoint_timer_query_webgl2 tersedia. */
    gpuTimerQuerySupported: !!GPU_TIMER_QUERY_SUPPORTED,
    longTaskCount: 0,
    longTaskMaxMs: 0,
    thumbnailLastMs: 0,
    thumbnailP95Ms: 0,
    thumbnailCount: 0,
    thumbnailSkippedCached: 0,
    thumbnailDroppedUnstable: 0,
    dpr: typeof window !== 'undefined' && window.devicePixelRatio || 1,
    drawingBufferWidth: 0,
    drawingBufferHeight: 0,
    aaDiagnostics: {
      antialiasRequested: true,
      antialiasEnabled: true,
      samples: 4,
      stencilBits: 8,
      drawingBufferWidth: 0,
      drawingBufferHeight: 0
    }
  };
  const recordFrameIntervalSample = dt => {
    if (dt >= 0.4 && dt < 120) {
      frameIntervals[fHead] = dt;
      fHead = (fHead + 1) % MAX_SAMPLES;
      if (fCount < MAX_SAMPLES) fCount++;
      if (fCount >= 3 && (fCount < 8 || (fHead & 15) === 0)) {
        const sub = Array.from(frameIntervals.subarray(0, fCount)).sort((a, b) => a - b);
        /* P2-05 (Track 4): rafIntervalMs = rerata SEMUA interval frame aktual
           (bukan subset tercepat seperti estimasi Hz di bawah). */
        let total = 0;
        for (let i = 0; i < sub.length; i++) total += sub[i];
        state.rafIntervalMs = Math.round(total / sub.length * 100) / 100;
        /* Gunakan persentil 25% tercepat dari interval frame agar jeda idle tidak menurunkan bacaan Hz native layar 100Hz/120Hz/144Hz/240Hz+ */
        const fastCount = Math.max(1, Math.ceil(sub.length * 0.45));
        let sum = 0;
        for (let i = 0; i < fastCount; i++) sum += sub[i];
        const avgDt = sum / fastCount;
        const measuredFps = Math.max(1, Math.min(1000, Math.round(1000 / Math.max(0.4, avgDt))));
        state.fps = measuredFps;
        if (measuredFps > state.nativeHz || state.nativeHz === 120) {
          state.nativeHz = measuredFps;
          state.targetFrameBudgetMs = Math.round(1000 / measuredFps * 100) / 100;
        }
      }
    }
  };
  const probeNativeRefreshRate = (framesToSample = 28) => {
    if (rafProbeActive || typeof requestAnimationFrame !== 'function') return;
    rafProbeActive = true;
    let prevTs = 0,
      rem = framesToSample;
    const step = ts => {
      const now = ts || (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      if (prevTs > 0) recordFrameIntervalSample(now - prevTs);
      prevTs = now;
      if (--rem > 0) requestAnimationFrame(step);else rafProbeActive = false;
    };
    requestAnimationFrame(step);
  };
  if (typeof window !== 'undefined' && typeof requestAnimationFrame === 'function') {
    probeNativeRefreshRate(32);
  }
  const recordRenderPass = (execMs, nowTs) => {
    const now = nowTs || (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    if (execMs >= 0 && execMs < 2000) {
      state.renderPassMs = Math.round(execMs * 100) / 100;
      /* P2-05 (Track 4): cpuSubmitMs = nilai yang sama, nama yang jujur —
         ini waktu CPU menyiapkan+mengirim command, BUKAN waktu GPU. */
      state.cpuSubmitMs = state.renderPassMs;
      renderDurations[rHead] = execMs;
      rHead = (rHead + 1) % MAX_SAMPLES;
      if (rCount < MAX_SAMPLES) rCount++;
      const budgetMs = Math.max(16.67, (state.targetFrameBudgetMs || 8.33) * 2.0);
      if (execMs > budgetMs) droppedFrames++;
      state.droppedFrames = droppedFrames;
      if (rCount >= 3 && (rCount < 8 || (rHead & 15) === 0)) {
        const arr = Array.from(renderDurations.subarray(0, rCount)).sort((a, b) => a - b);
        const pick = q => arr[Math.min(arr.length - 1, Math.max(0, Math.floor((arr.length - 1) * q)))];
        state.p50 = Math.round(pick(0.50) * 100) / 100;
        state.p95 = Math.round(pick(0.95) * 100) / 100;
        state.p99 = Math.round(pick(0.99) * 100) / 100;
        /* P2-06 (Track 4): beri makan hysteresis tier dari p95 render-pass.
           Hanya preset 'auto' yang bisa berubah; manual tidak disentuh.
           Pemanggilan aman: observeFrameHealth no-op bila mode manual. */
        try {
          if (typeof TIER_HYSTERESIS !== 'undefined' && TIER_HYSTERESIS) TIER_HYSTERESIS.observeFrameHealth(state.p95, budgetMs, now);
        } catch (e) {}
      }
    }
    if (lastRenderTs > 0) {
      recordFrameIntervalSample(now - lastRenderTs);
    }
    lastRenderTs = now;
  };
  /* P2-05 (Track 4): catat waktu eksekusi GPU dari timer query. Dipanggil
     oleh sceneRenderer SETELAH wiring EXT_disjoint_timer_query_webgl2
     (lihat src/utils/gpuTimerQuery.jsx). Nilai null = belum ada sampel /
     extension tak tersedia; jangan dibaca sebagai 0. */
  const recordGpuTimeMs = ms => {
    if (ms != null && Number.isFinite(ms) && ms >= 0 && ms < 2000) {
      state.gpuTimeMs = Math.round(ms * 100) / 100;
    }
  };
  const setGpuTimerQuerySupported = supported => {
    state.gpuTimerQuerySupported = !!supported;
  };
  const recordFrameDelta = dt => recordRenderPass(dt);
  const markInteractionFrame = () => {
    const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    if (lastInteractionTs > 0) {
      const dt = now - lastInteractionTs;
      if (dt >= 0.4 && dt < 60) {
        recordFrameIntervalSample(dt);
        /* P2-05 (Track 4): sampel interaksi terpisah — p50/p95/p99 HANYA
           dari frame saat pointer/zoom aktif, tanpa campuran frame idle. */
        interactionIntervals[iHead] = dt;
        iHead = (iHead + 1) % MAX_SAMPLES;
        if (iCount < MAX_SAMPLES) iCount++;
        if (iCount >= 3 && (iCount < 8 || (iHead & 15) === 0)) {
          state.interactionFrameP50 = _percentileOf(interactionIntervals, iCount, 0.50);
          state.interactionFrameP95 = _percentileOf(interactionIntervals, iCount, 0.95);
          state.interactionFrameP99 = _percentileOf(interactionIntervals, iCount, 0.99);
        }
      }
    }
    lastInteractionTs = now;
    if (!rafProbeActive) probeNativeRefreshRate(12);
  };
  const updateSceneMetrics = metrics => {
    if (!metrics) return;
    if (metrics.totalObjects != null) state.totalObjects = metrics.totalObjects;
    if (metrics.visibleObjects != null) state.visibleObjects = metrics.visibleObjects;
    if (metrics.culledObjects != null) state.culledObjects = metrics.culledObjects;
    if (metrics.domNodeCount != null) state.domNodeCount = metrics.domNodeCount;
    if (metrics.snapQueryMs != null) state.snapQueryMs = Math.round(metrics.snapQueryMs * 100) / 100;
    if (metrics.activeBackend) state.activeBackend = metrics.activeBackend;
    if (metrics.lodLevel != null) state.lodLevel = metrics.lodLevel;
    if (metrics.effectiveZoom != null) state.effectiveZoom = metrics.effectiveZoom;
    if (metrics.currentEpsilon != null) state.currentEpsilon = metrics.currentEpsilon;
    if (metrics.targetPixelError != null) state.targetPixelError = metrics.targetPixelError;
    if (metrics.lodSegments != null) {
      state.lodSegments = metrics.lodSegments;
      state.totalVertices = metrics.lodSegments;
    }
    if (metrics.totalVertices != null) state.totalVertices = metrics.totalVertices;
    if (metrics.fillTriangleCount != null) state.fillTriangleCount = metrics.fillTriangleCount;
    if (metrics.strokeTriangleCount != null) state.strokeTriangleCount = metrics.strokeTriangleCount;
    if (metrics.tessellationTimeMs != null) {
      state.tessellationTimeMs = Math.round(metrics.tessellationTimeMs * 1000) / 1000;
      if (metrics.tessellationTimeMs > 0) state.lastTessellationMs = state.tessellationTimeMs;
    }
    if (metrics.cacheHits != null) state.cacheHits = metrics.cacheHits;
    if (metrics.cacheMisses != null) state.cacheMisses = metrics.cacheMisses;
    if (metrics.cachedObjectsCount != null) state.cachedObjectsCount = metrics.cachedObjectsCount;
    if (metrics.overBudgetBytes != null) state.overBudgetBytes = metrics.overBudgetBytes;
    if (metrics.oversizedEntryCount != null) state.oversizedEntryCount = metrics.oversizedEntryCount;
    if (metrics.toleranceMet != null) state.toleranceMet = metrics.toleranceMet;
    if (metrics.partialAlphaPixels != null) state.partialAlphaPixels = metrics.partialAlphaPixels;
    if (metrics.pixelPreviewMode != null) state.pixelPreviewMode = metrics.pixelPreviewMode;
    if (metrics.maxDepthHitCount != null) state.maxDepthHitCount = metrics.maxDepthHitCount;
    if (metrics.budgetHitCount != null) state.budgetHitCount = metrics.budgetHitCount;
    if (metrics.dpr != null) state.dpr = Math.round(metrics.dpr * 100) / 100;
    if (metrics.drawingBufferWidth != null) state.drawingBufferWidth = metrics.drawingBufferWidth;
    if (metrics.drawingBufferHeight != null) state.drawingBufferHeight = metrics.drawingBufferHeight;
    if (metrics.aaDiagnostics) state.aaDiagnostics = {
      ...state.aaDiagnostics,
      ...metrics.aaDiagnostics
    };
    if (metrics.domPathCount != null) state.domPathCount = metrics.domPathCount;
    if (metrics.gpuDrawCalls != null) state.gpuDrawCalls = metrics.gpuDrawCalls;
    if (metrics.geometryCacheBytes != null) state.geometryCacheBytes = metrics.geometryCacheBytes;
    if (metrics.vboBytes != null) state.vboBytes = metrics.vboBytes;
    if (metrics.textureBytes != null) state.textureBytes = metrics.textureBytes;
    if (metrics.imageDecodedPixels != null) state.imageDecodedPixels = metrics.imageDecodedPixels;
    if (metrics.historyBytes != null) state.historyBytes = metrics.historyBytes;
    if (metrics.autosaveQueueLagMs != null) state.autosaveQueueLagMs = metrics.autosaveQueueLagMs;
    if (metrics.lastImportParseMs != null) state.lastImportParseMs = metrics.lastImportParseMs;
    if (metrics.webglContextLostCount != null) state.webglContextLostCount = metrics.webglContextLostCount;
    if (metrics.backendFallbackReason != null) state.backendFallbackReason = metrics.backendFallbackReason;
    if (metrics.deviceProfileTier != null) state.deviceProfileTier = metrics.deviceProfileTier;
    if (metrics.deviceProfileApiUnknown != null) state.deviceProfileApiUnknown = !!metrics.deviceProfileApiUnknown;
    if (metrics.deviceTierMode != null) state.deviceTierMode = metrics.deviceTierMode;
    /* P2-05 (Track 4): metrik baru via updateSceneMetrics — gpuTimeMs dari
       timer query (null = tak tersedia), longTask dari observer internal
       (boleh di-override untuk pengujian), rafIntervalMs bila diukur di luar. */
    if (metrics.rafIntervalMs != null) state.rafIntervalMs = Math.round(metrics.rafIntervalMs * 100) / 100;
    if (metrics.interactionFrameP50 != null) state.interactionFrameP50 = Math.round(metrics.interactionFrameP50 * 100) / 100;
    if (metrics.interactionFrameP95 != null) state.interactionFrameP95 = Math.round(metrics.interactionFrameP95 * 100) / 100;
    if (metrics.interactionFrameP99 != null) state.interactionFrameP99 = Math.round(metrics.interactionFrameP99 * 100) / 100;
    if (metrics.cpuSubmitMs != null) state.cpuSubmitMs = Math.round(metrics.cpuSubmitMs * 100) / 100;
    if (metrics.gpuTimeMs != null) state.gpuTimeMs = metrics.gpuTimeMs == null ? null : Math.round(metrics.gpuTimeMs * 100) / 100;
    if (metrics.gpuTimerQuerySupported != null) state.gpuTimerQuerySupported = !!metrics.gpuTimerQuerySupported;
    if (metrics.longTaskCount != null) state.longTaskCount = metrics.longTaskCount;
    if (metrics.longTaskMaxMs != null) state.longTaskMaxMs = Math.round(metrics.longTaskMaxMs * 100) / 100;
    /* P2-04 (Track 4): durasi thumbnail — HANYA bila pemanggil menandai
       `thumbnailSample: true` (satu pembuatan selesai) sampel masuk ring
       p95 dan menaikkan thumbnailCount. Laporan skip/drop hanya membawa
       counter dan tidak boleh dihitung sebagai sampel durasi. */
    if (metrics.thumbnailSample === true && metrics.thumbnailLastMs != null) {
      state.thumbnailLastMs = Math.round(metrics.thumbnailLastMs * 100) / 100;
      if (metrics.thumbnailLastMs >= 0 && metrics.thumbnailLastMs < 60000) {
        thumbDurations[tHead] = metrics.thumbnailLastMs;
        tHead = (tHead + 1) % thumbDurations.length;
        if (tCount < thumbDurations.length) tCount++;
        state.thumbnailCount++;
        state.thumbnailP95Ms = _percentileOf(thumbDurations, tCount, 0.95);
      }
    } else if (metrics.thumbnailLastMs != null) {
      state.thumbnailLastMs = Math.round(metrics.thumbnailLastMs * 100) / 100;
    }
    if (metrics.thumbnailP95Ms != null) state.thumbnailP95Ms = Math.round(metrics.thumbnailP95Ms * 100) / 100;
    if (metrics.thumbnailCount != null) state.thumbnailCount = metrics.thumbnailCount;
    if (metrics.thumbnailSkippedCached != null) state.thumbnailSkippedCached = metrics.thumbnailSkippedCached;
    if (metrics.thumbnailDroppedUnstable != null) state.thumbnailDroppedUnstable = metrics.thumbnailDroppedUnstable;
  };
  const getSnapshot = () => ({
    ...state,
    config: {
      ...RENDER_CONFIG
    }
  });
  const getBadgeText = gpuEnabled => {
    if (!gpuEnabled || RENDER_CONFIG.backendOverride === 'svg') return `SVG DOM · ${state.fps} FPS (Uncapped)`;
    const aa = state.aaDiagnostics && state.aaDiagnostics.antialiasEnabled ? `MSAA ${state.aaDiagnostics.samples || 1}x` : RENDER_CONFIG.aaMode.toUpperCase();
    return `${state.fps} FPS (Uncapped) · p95 ${state.p95.toFixed(2)}ms · ${state.activeBackend} (${aa})`;
  };
  return {
    recordRenderPass,
    recordFrameDelta,
    recordGpuTimeMs,
    setGpuTimerQuerySupported,
    markInteractionFrame,
    updateSceneMetrics,
    getSnapshot,
    getBadgeText,
    state
  };
})();

export { MAX_RENDER_DPR, RENDER_CONFIG, getActivePixelPreviewMode, isPixelBoxModeActive, updateRenderConfig, PERF_TELEMETRY };
