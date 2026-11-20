import { RENDER_CONFIG } from './renderConfigAndTelemetry.tsx';

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
    maxImageCachePixels: 12000000,
    maxHistoryBytes: 12 * 1024 * 1024,
    targetPixelError: 0.35
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
    maxImageCachePixels: 24000000,
    maxHistoryBytes: 20 * 1024 * 1024,
    targetPixelError: 0.28
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
    maxImageCachePixels: 40000000,
    maxHistoryBytes: 32 * 1024 * 1024,
    targetPixelError: 0.25
  },
  'high-memory': {
    tier: 'high-memory',
    maxDpr: 2.5,
    maxBackingPixels: 24000000,
    // 24 MP
    maxExportPixels: 67108864,
    // 64 MP (8192x8192)
    maxExportDimension: 8192,
    maxVerticesPerObject: 65536,
    maxVerticesPerFrame: 800000,
    maxGeometryCacheBytes: 64 * 1024 * 1024,
    maxImageCachePixels: 64000000,
    maxHistoryBytes: 48 * 1024 * 1024,
    targetPixelError: 0.22
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
    maxImageCachePixels: 10000000,
    maxHistoryBytes: 12 * 1024 * 1024,
    targetPixelError: 0.40
  }
};
const detectDeviceProfile = (overrideTier: any = null) => {
  if (overrideTier && DEVICE_PROFILES[overrideTier]) return {...DEVICE_PROFILES[overrideTier]};
  const nav: any = typeof navigator !== 'undefined' ? navigator : {};
  const memory = Number(nav.deviceMemory) || 4;
  const cores = Number(nav.hardwareConcurrency) || 4;
  let tier = 'desktop';
  if (memory <= 2 || cores <= 2) tier = 'low-mobile';
  else if (nav.maxTouchPoints > 0 && (memory <= 4 || cores <= 4)) tier = 'mid-mobile';
  return {...DEVICE_PROFILES[tier]};
};
let ACTIVE_DEVICE_PROFILE = detectDeviceProfile();
const setDeviceProfileTier = tier => {
  ACTIVE_DEVICE_PROFILE = detectDeviceProfile(tier);
  RENDER_CONFIG.vertexBudgetPerObject = ACTIVE_DEVICE_PROFILE.maxVerticesPerObject;
  RENDER_CONFIG.maxRenderDpr = ACTIVE_DEVICE_PROFILE.maxDpr;
  return ACTIVE_DEVICE_PROFILE;
};

const computeSafeFramebufferSize = (cssW, cssH, requestedDpr, profile = ACTIVE_DEVICE_PROFILE) => {
  const w = Math.max(1, Number(cssW) || 1);
  const h = Math.max(1, Number(cssH) || 1);
  const prof = profile || ACTIVE_DEVICE_PROFILE;
  let dpr = Math.max(0.5, Math.min(Number(requestedDpr) || 1, prof.maxDpr || 2));
  const maxSide = Math.min(prof.maxExportDimension || 4096, 8192);
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

export { DEVICE_PROFILES, detectDeviceProfile, ACTIVE_DEVICE_PROFILE, setDeviceProfileTier, computeSafeFramebufferSize };
