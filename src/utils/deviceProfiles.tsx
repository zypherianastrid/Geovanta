import { RENDER_CONFIG } from './renderConfigAndTelemetry.tsx';

const DEVICE_PROFILES = {
  'low-mobile': {
    tier: 'low-mobile',
    maxDpr: 1.5,
    interactiveDprCap: 1.0,
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
    interactiveDprCap: 1.15,
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
  'android-high': {
    tier: 'android-high',
    maxDpr: 2.0,
    interactiveDprCap: 1.25,
    maxBackingPixels: 6000000,
    // 6 MP
    maxExportPixels: 33554432,
    // 32 MP
    maxExportDimension: 6144,
    maxVerticesPerObject: 32768,
    maxVerticesPerFrame: 220000,
    maxGeometryCacheBytes: 24 * 1024 * 1024,
    maxImageCachePixels: 20000000,
    maxHistoryBytes: 16 * 1024 * 1024,
    targetPixelError: 0.28
  },
  'desktop': {
    tier: 'desktop',
    maxDpr: 2.0,
    interactiveDprCap: null,
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
    interactiveDprCap: null,
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
    interactiveDprCap: 1.0,
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
const detectDeviceProfile = (overrideTier: any = null, envOverride: any = null) => {
  if (overrideTier && DEVICE_PROFILES[overrideTier]) return {...DEVICE_PROFILES[overrideTier]};
  const nav: any = typeof navigator !== 'undefined' ? navigator : {};
  const env = envOverride || {};
  const memory = Number(env.deviceMemory ?? nav.deviceMemory) || 4;
  const cores = Number(env.hardwareConcurrency ?? nav.hardwareConcurrency) || 4;
  const maxTouchPoints = Number(env.maxTouchPoints ?? nav.maxTouchPoints) || 0;
  const ua = String(env.userAgent ?? nav.userAgent ?? '');
  const isCapacitorNative = Boolean(
    env.isCapacitorNative ?? (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.())
  );
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isCoarse = Boolean(
    env.isCoarsePointer ??
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  );
  const isMobileDevice = isCapacitorNative || isMobileUa || (maxTouchPoints > 0 && isCoarse);
  let tier = 'desktop';
  if (memory <= 2 || cores <= 2) tier = 'low-mobile';
  else if (isMobileDevice && (memory <= 4 || cores <= 4)) tier = 'mid-mobile';
  else if (isMobileDevice) tier = 'android-high';
  return {...DEVICE_PROFILES[tier]};
};
let ACTIVE_DEVICE_PROFILE = detectDeviceProfile();
if (typeof window !== 'undefined') {
  (window as any).__geovantaDeviceProfile = ACTIVE_DEVICE_PROFILE;
}
const setDeviceProfileTier = tier => {
  ACTIVE_DEVICE_PROFILE = detectDeviceProfile(tier);
  if (typeof window !== 'undefined') {
    (window as any).__geovantaDeviceProfile = ACTIVE_DEVICE_PROFILE;
  }
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

const computeSafeExportScale = (
  width: number,
  height: number,
  requestedScale: number,
  profile: any = ACTIVE_DEVICE_PROFILE
): number => {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const req = Math.max(0.25, Number(requestedScale) || 1);
  const prof = profile || ACTIVE_DEVICE_PROFILE;
  const maxDim = Math.max(256, Number(prof.maxExportDimension) || 4096);
  const maxPx = Math.max(65536, Number(prof.maxExportPixels) || 16777216);
  const capDim = Math.min(maxDim / w, maxDim / h);
  const capPx = Math.sqrt(maxPx / (w * h));
  return Math.max(0.25, Math.round(Math.min(req, capDim, capPx) * 100) / 100);
};

const shouldRejectPalmEvent = (
  pointerType: string,
  lastStylusTime: number,
  now: number,
  windowMs = 600
): boolean => {
  if (pointerType !== 'touch' || !lastStylusTime) return false;
  const dt = now - lastStylusTime;
  return dt >= 0 && dt <= windowMs;
};

export {
  DEVICE_PROFILES,
  detectDeviceProfile,
  ACTIVE_DEVICE_PROFILE,
  setDeviceProfileTier,
  computeSafeFramebufferSize,
  computeSafeExportScale,
  shouldRejectPalmEvent
};
