/**
 * @file src/utils/gpuCapabilities.jsx
 * @description Deteksi kapabilitas WebGL2 GPU, profil perangkat, & batas aman framebuffer
 */
import { RENDER_CONFIG } from './renderConfigAndTelemetry.jsx';

/* GV-A23 & Bab 7: Probe GPU capabilities safely and immediately release temporary WebGL context */
const probeGpuCapabilities = () => {
  let cv = null;
  let gl = null;
  try {
    if (typeof document === 'undefined' || !document.createElement) {
      return {
        label: 'Canvas2D Software Compositor',
        webgl2: false,
        maxTextureSize: 4096,
        maxRenderbufferSize: 4096,
        maxSamples: 0,
        renderer: ''
      };
    }
    cv = document.createElement('canvas');
    cv.width = 1;
    cv.height = 1;
    const gl2 = cv.getContext('webgl2', {
      powerPreference: 'default'
    });
    gl = gl2 || cv.getContext('webgl') || cv.getContext('experimental-webgl');
    if (!gl) {
      return {
        label: 'Canvas2D Software Compositor',
        webgl2: false,
        maxTextureSize: 4096,
        maxRenderbufferSize: 4096,
        maxSamples: 0,
        renderer: ''
      };
    }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rnd = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096;
    const maxRbo = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || 4096;
    const maxSamples = gl2 && gl.MAX_SAMPLES ? Number(gl.getParameter(gl.MAX_SAMPLES)) || 4 : 0;
    const prefix = gl2 ? 'WebGL2 · ' : 'WebGL · ';
    const label = rnd ? prefix + String(rnd) : prefix + 'Hardware Accelerated';
    return {
      label,
      webgl2: !!gl2,
      maxTextureSize: maxTex,
      maxRenderbufferSize: maxRbo,
      maxSamples,
      renderer: String(rnd || '')
    };
  } catch (e) {
    return {
      label: 'Canvas2D Fallback',
      webgl2: false,
      maxTextureSize: 4096,
      maxRenderbufferSize: 4096,
      maxSamples: 0,
      renderer: ''
    };
  } finally {
    try {
      if (gl && typeof gl.getExtension === 'function') {
        const loseExt = gl.getExtension('WEBGL_lose_context');
        if (loseExt && typeof loseExt.loseContext === 'function') loseExt.loseContext();
      }
    } catch (e) {}
    if (cv) {
      cv.width = 0;
      cv.height = 0;
    }
  }
};
const GPU_CAPS = probeGpuCapabilities();
const detectGpuRenderer = () => probeGpuCapabilities().label;
const GPU_INFO = GPU_CAPS.label;

/* Bab 7 & GV-A05, GV-A06, GV-A21: Adaptive Device Profile Tiers */
/* Bab 7 & GV-A05, GV-A06, GV-A21: Adaptive Device Profile Tiers */
const DEVICE_PROFILES = {
  'low-mobile': {
    tier: 'low-mobile',
    maxDpr: 1.5,
    maxBackingPixels: 4000000,
    // 4 MP
    maxExportPixels: 16777216,
    // 16 MP (4096x4096)
    maxExportDimension: 4096,
    maxVerticesPerObject: 16384,
    maxVerticesPerFrame: 120000,
    maxGeometryCacheBytes: 16 * 1024 * 1024,
    maxVboCacheBytes: 16 * 1024 * 1024,
    maxTextureCacheBytes: 24 * 1024 * 1024,
    maxImageCachePixels: 12000000,
    maxHistoryBytes: 12 * 1024 * 1024,
    targetPixelError: 0.35,
    allowSsaa: false
  },
  'mid-mobile': {
    tier: 'mid-mobile',
    maxDpr: 2.0,
    maxBackingPixels: 8000000,
    // 8 MP
    maxExportPixels: 33554432,
    // 32 MP
    maxExportDimension: 6144,
    maxVerticesPerObject: 32768,
    maxVerticesPerFrame: 250000,
    maxGeometryCacheBytes: 32 * 1024 * 1024,
    maxVboCacheBytes: 32 * 1024 * 1024,
    maxTextureCacheBytes: 48 * 1024 * 1024,
    maxImageCachePixels: 24000000,
    maxHistoryBytes: 20 * 1024 * 1024,
    targetPixelError: 0.28,
    allowSsaa: false
  },
  'desktop': {
    tier: 'desktop',
    maxDpr: 2.0,
    maxBackingPixels: 16000000,
    // 16 MP
    maxExportPixels: 67108864,
    // 64 MP (8192x8192)
    maxExportDimension: 8192,
    maxVerticesPerObject: 49152,
    maxVerticesPerFrame: 500000,
    maxGeometryCacheBytes: 48 * 1024 * 1024,
    maxVboCacheBytes: 48 * 1024 * 1024,
    maxTextureCacheBytes: 64 * 1024 * 1024,
    maxImageCachePixels: 40000000,
    maxHistoryBytes: 32 * 1024 * 1024,
    targetPixelError: 0.25,
    allowSsaa: true
  },
  'high-gpu': {
    tier: 'high-gpu',
    maxDpr: 2.5,
    maxBackingPixels: 24000000,
    // 24 MP
    maxExportPixels: 67108864,
    // 64 MP (8192x8192)
    maxExportDimension: 8192,
    maxVerticesPerObject: 65536,
    maxVerticesPerFrame: 800000,
    maxGeometryCacheBytes: 64 * 1024 * 1024,
    maxVboCacheBytes: 64 * 1024 * 1024,
    maxTextureCacheBytes: 96 * 1024 * 1024,
    maxImageCachePixels: 64000000,
    maxHistoryBytes: 48 * 1024 * 1024,
    targetPixelError: 0.22,
    allowSsaa: true
  },
  'battery-saver': {
    tier: 'battery-saver',
    maxDpr: 1.25,
    maxBackingPixels: 3000000,
    // 3 MP
    maxExportPixels: 16777216,
    // 16 MP
    maxExportDimension: 4096,
    maxVerticesPerObject: 16384,
    maxVerticesPerFrame: 100000,
    maxGeometryCacheBytes: 16 * 1024 * 1024,
    maxVboCacheBytes: 16 * 1024 * 1024,
    maxTextureCacheBytes: 24 * 1024 * 1024,
    maxImageCachePixels: 10000000,
    maxHistoryBytes: 12 * 1024 * 1024,
    targetPixelError: 0.40,
    allowSsaa: false
  },
  /* P2-06 (Track 4): tier 'unknown' — dipakai ketika navigator.deviceMemory
     dan/atau navigator.hardwareConcurrency TIDAK tersedia. BUKAN bukti
     perangkat 4 GB/4 core; mulai dari profil konservatif (anggaran setara
     low-mobile) sampai probe/benchmark memberi keyakinan lebih. */
  'unknown': {
    tier: 'unknown',
    maxDpr: 1.5,
    maxBackingPixels: 4000000,
    // 4 MP
    maxExportPixels: 16777216,
    // 16 MP (4096x4096)
    maxExportDimension: 4096,
    maxVerticesPerObject: 16384,
    maxVerticesPerFrame: 120000,
    maxGeometryCacheBytes: 16 * 1024 * 1024,
    maxVboCacheBytes: 16 * 1024 * 1024,
    maxTextureCacheBytes: 24 * 1024 * 1024,
    maxImageCachePixels: 12000000,
    maxHistoryBytes: 12 * 1024 * 1024,
    targetPixelError: 0.35,
    allowSsaa: false,
    apiUnknown: true
  }
};
/* P2-06 (Track 4): API yang tidak tersedia = 'unknown', BUKAN default 4.
   Sebelumnya `Number(nav.deviceMemory) || 4` menebak 4 GB/4 core ketika API
   tidak memberi data, sehingga perangkat terbatas bisa salah dikira
   'desktop'. Sekarang: bila deviceMemory ATAU hardwareConcurrency hilang/
   tidak valid, tier = 'unknown' (profil konservatif, lihat DEVICE_PROFILES).
   Hasil deteksi membawa flag `apiUnknown` agar diagnostics bisa menampilkannya. */
const detectDeviceProfile = (overrideTier = null) => {
  if (overrideTier && DEVICE_PROFILES[overrideTier]) {
    return {
      ...DEVICE_PROFILES[overrideTier],
      maxTextureSize: GPU_CAPS.maxTextureSize,
      maxRenderbufferSize: GPU_CAPS.maxRenderbufferSize,
      apiUnknown: overrideTier === 'unknown'
    };
  }
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const memRaw = Number(nav.deviceMemory);
  const coresRaw = Number(nav.hardwareConcurrency);
  const mem = Number.isFinite(memRaw) && memRaw > 0 ? memRaw : null;
  const cores = Number.isFinite(coresRaw) && coresRaw > 0 ? coresRaw : null;
  const apiUnknown = mem === null || cores === null;
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || nav.maxTouchPoints > 0);
  const swRenderer = /SwiftShader|llvmpipe|Software|Basic Render/i.test(GPU_CAPS.renderer || '');
  let tier = 'desktop';
  if (apiUnknown) tier = 'unknown';else if (swRenderer || mem <= 2 || cores <= 2) tier = 'low-mobile';else if (isTouch && (mem <= 4 || cores <= 4)) tier = 'mid-mobile';else if (!isTouch && mem >= 8 && cores >= 8 && GPU_CAPS.webgl2 && GPU_CAPS.maxTextureSize >= 8192) tier = 'high-gpu';
  return {
    ...DEVICE_PROFILES[tier],
    maxTextureSize: GPU_CAPS.maxTextureSize,
    maxRenderbufferSize: GPU_CAPS.maxRenderbufferSize,
    apiUnknown
  };
};
let ACTIVE_DEVICE_PROFILE = detectDeviceProfile();
const setDeviceProfileTier = (tier, opts = {}) => {
  ACTIVE_DEVICE_PROFILE = detectDeviceProfile(tier);
  RENDER_CONFIG.vertexBudgetPerObject = ACTIVE_DEVICE_PROFILE.maxVerticesPerObject;
  RENDER_CONFIG.maxRenderDpr = ACTIVE_DEVICE_PROFILE.maxDpr;
  RENDER_CONFIG.deviceProfileTier = ACTIVE_DEVICE_PROFILE.tier;
  /* Beri tahu telemetri + UI (Settings diagnostics) bahwa tier berubah.
     Telemetri mendengarkan event ini agar snapshot-nya tetap sinkron tanpa
     import balik ke modul telemetri. */
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('geovanta-device-tier', {
        detail: {
          tier: ACTIVE_DEVICE_PROFILE.tier,
          apiUnknown: !!ACTIVE_DEVICE_PROFILE.apiUnknown,
          preset: opts.preset || null,
          mode: opts.mode || null
        }
      }));
    } catch (e) {}
  }
  return ACTIVE_DEVICE_PROFILE;
};

/* -------------------------------------------------------------------------
   P2-06 (Track 4): preset manual + hysteresis perubahan tier.
   Preset: 'auto' (deteksi, hysteresis aktif) | 'saver' (battery-saver) |
   'balanced' (desktop) | 'quality' (high-gpu). Preset manual mematikan
   adaptasi otomatis (mode 'manual'); kembali ke 'auto' menghidupkannya lagi.
   Hysteresis: tier TURUN hanya setelah 3 jendela p95 berturut-turut di atas
   1,5x budget (dan jeda ≥5 dtk sejak perubahan terakhir); tier NAIK hanya
   setelah p95 stabil di bawah 0,7x budget selama ≥30 dtk. Satu drag berat
   tidak boleh membuat tier naik-turun cepat.
   Urutan adaptasi (konservatif → agresif): battery-saver, unknown,
   low-mobile, mid-mobile, desktop, high-gpu.
   ------------------------------------------------------------------------- */
const PERF_PRESETS = {
  auto: null,
  saver: 'battery-saver',
  balanced: 'desktop',
  quality: 'high-gpu'
};
const TIER_ADAPT_ORDER = ['battery-saver', 'unknown', 'low-mobile', 'mid-mobile', 'desktop', 'high-gpu'];
const TIER_HYSTERESIS = (() => {
  const BAD_WINDOWS_TO_DOWNGRADE = 3;
  const DOWNGRADE_FACTOR = 1.5;
  const UPGRADE_FACTOR = 0.7;
  const MIN_DOWNGRADE_DWELL_MS = 5000;
  const STABLE_MS_TO_UPGRADE = 30000;
  let mode = 'auto';
  let preset = 'auto';
  let badWindows = 0;
  let goodSinceMs = null;
  let lastChangeMs = 0;
  let lastDecision = {
    tier: ACTIVE_DEVICE_PROFILE.tier,
    changed: false,
    reason: 'init'
  };
  const observe = (p95Ms, budgetMs, nowMs) => {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const cur = ACTIVE_DEVICE_PROFILE.tier;
    const idx = TIER_ADAPT_ORDER.indexOf(cur);
    if (mode !== 'auto' || idx < 0 || !Number.isFinite(p95Ms) || !Number.isFinite(budgetMs) || budgetMs <= 0) {
      return {
        tier: cur,
        changed: false,
        reason: mode !== 'auto' ? 'manual' : 'no-data'
      };
    }
    if (p95Ms > budgetMs * DOWNGRADE_FACTOR) {
      goodSinceMs = null;
      badWindows++;
      if (badWindows >= BAD_WINDOWS_TO_DOWNGRADE && idx > 0 && now - lastChangeMs >= MIN_DOWNGRADE_DWELL_MS) {
        const next = TIER_ADAPT_ORDER[idx - 1];
        badWindows = 0;
        lastChangeMs = now;
        lastDecision = {
          tier: next,
          changed: true,
          reason: 'downgrade-p95'
        };
        return lastDecision;
      }
      return {
        tier: cur,
        changed: false,
        reason: 'bad-window-' + badWindows
      };
    }
    if (p95Ms < budgetMs * UPGRADE_FACTOR) {
      badWindows = 0;
      if (goodSinceMs === null) goodSinceMs = now;
      if (idx < TIER_ADAPT_ORDER.length - 1 && now - goodSinceMs >= STABLE_MS_TO_UPGRADE && now - lastChangeMs >= STABLE_MS_TO_UPGRADE) {
        const next = TIER_ADAPT_ORDER[idx + 1];
        goodSinceMs = null;
        lastChangeMs = now;
        lastDecision = {
          tier: next,
          changed: true,
          reason: 'upgrade-stable'
        };
        return lastDecision;
      }
      return {
        tier: cur,
        changed: false,
        reason: 'good-stable'
      };
    }
    badWindows = 0;
    goodSinceMs = null;
    return {
      tier: cur,
      changed: false,
      reason: 'within-budget'
    };
  };
  /* Dipanggil telemetri (recordRenderPass) setiap kali p95 diperbarui.
     Hanya menerapkan perubahan bila hysteresis memutuskan begitu. */
  const observeFrameHealth = (p95Ms, budgetMs, nowMs) => {
    const d = observe(p95Ms, budgetMs, nowMs);
    if (d.changed) setDeviceProfileTier(d.tier, {
      preset,
      mode
    });
    return d;
  };
  const getState = () => ({
    mode,
    preset,
    badWindows,
    goodSinceMs,
    lastChangeMs,
    tier: ACTIVE_DEVICE_PROFILE.tier,
    lastDecision
  });
  const setMode = (nextMode, nextPreset) => {
    if (nextMode) mode = nextMode;
    if (nextPreset) preset = nextPreset;
  };
  const reset = () => {
    badWindows = 0;
    goodSinceMs = null;
    lastChangeMs = 0;
  };
  return {
    observe,
    observeFrameHealth,
    getState,
    setMode,
    reset
  };
})();
const getPerfPreset = () => TIER_HYSTERESIS.getState().preset;
const getTierMode = () => TIER_HYSTERESIS.getState().mode;
const setPerfPreset = preset => {
  const p = PERF_PRESETS[preset] !== undefined ? preset : 'auto';
  if (p === 'auto') {
    TIER_HYSTERESIS.setMode('auto', 'auto');
    TIER_HYSTERESIS.reset();
    return setDeviceProfileTier(null, {
      preset: 'auto',
      mode: 'auto'
    });
  }
  TIER_HYSTERESIS.setMode('manual', p);
  return setDeviceProfileTier(PERF_PRESETS[p], {
    preset: p,
    mode: 'manual'
  });
};

/* GV-A06: Compute safe backing-store dimensions clamped by DPR, pixel budget, and GPU texture/renderbuffer limits */
/* GV-A06: Compute safe backing-store dimensions clamped by DPR, pixel budget, and GPU texture/renderbuffer limits */
const computeSafeFramebufferSize = (cssW, cssH, requestedDpr, profile = ACTIVE_DEVICE_PROFILE, aaMode = 'msaa') => {
  const w = Math.max(1, Number(cssW) || 1);
  const h = Math.max(1, Number(cssH) || 1);
  const prof = profile || ACTIVE_DEVICE_PROFILE;
  const ssaaMult = aaMode === 'ssaa' && prof.allowSsaa !== false ? 1.5 : 1.0;
  const maxDprCap = aaMode === 'ssaa' && prof.allowSsaa !== false ? Math.min(2.75, (prof.maxDpr || 2.0) * 1.25) : prof.maxDpr || 2.0;
  let dpr = Math.max(0.5, Math.min((Number(requestedDpr) || 1) * ssaaMult, maxDprCap));
  const maxSide = Math.min(prof.maxTextureSize || 4096, prof.maxRenderbufferSize || 4096, 8192);
  const maxPixels = prof.maxBackingPixels || 16000000;
  if (w * dpr > maxSide) dpr = Math.min(dpr, maxSide / w);
  if (h * dpr > maxSide) dpr = Math.min(dpr, maxSide / h);
  if (w * dpr * (h * dpr) > maxPixels) {
    dpr = Math.min(dpr, Math.sqrt(maxPixels / (w * h)));
  }
  const pw = Math.max(1, Math.min(maxSide, Math.round(w * dpr)));
  const ph = Math.max(1, Math.min(maxSide, Math.round(h * dpr)));
  return {
    pw,
    ph,
    effectiveDpr: pw / w,
    maxSide,
    maxPixels
  };
};

/* =========================================================================
   KONFIGURASI PIPELINE RENDERING HYBRID GEOVANTA (Tahap 1–6)
   - Mengontrol Seam Guard (default: false untuk A/B test), Target Pixel Error (0.25 px),
     Max Bézier Depth (16), Min Segment Length (0.01 px), Local Coordinate Rebasing (Float32),
     Tiered Antialiasing (MSAA / Analytic Edge Coverage / SSAA / FXAA), Backend Override, & 7 Debug Modes.
   ========================================================================= */

export { probeGpuCapabilities, GPU_CAPS, detectGpuRenderer, GPU_INFO, DEVICE_PROFILES, detectDeviceProfile, ACTIVE_DEVICE_PROFILE, setDeviceProfileTier, computeSafeFramebufferSize, PERF_PRESETS, TIER_ADAPT_ORDER, TIER_HYSTERESIS, getPerfPreset, getTierMode, setPerfPreset };
