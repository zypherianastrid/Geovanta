/**
 * @file src/utils/themeAndPrefsManager.tsx
 * @description Manajer penyimpanan preferensi pengguna, tema gelap/terang, & reduksi gerak
 */
import { LS_KEY, DEFAULT_PREFS } from '../constants/themeAndPrefsConstants.tsx';
import { updateRenderConfig } from './renderConfigAndTelemetry.tsx';
import { hex2hsv, hsv2hex } from './colorMath.tsx';
import { isTauriDesktop, invokeTauriCommand } from '../vendor/tauriDesktopBridge.tsx';
import { isNativeAndroid, getAndroidMaterialYouAccent } from '../bridge/androidNativeBridge.ts';

let _lastSysAccent = '#0078d4';
let _cachedDesktopAccent: string | null = null;

export type AccentPlatformSource = 'desktop_windows' | 'mobile_android_material_you' | 'webapp_browser_chrome';

/**
 * Mendeteksi platform eksekusi untuk resolusi warna aksen otomatis:
 * - desktop_windows: Tauri x64 Desktop EXE (mengikuti aksen Windows DWM)
 * - mobile_android_material_you: Android Native Capacitor / WebView (mengikuti Material You Dynamic Color)
 * - webapp_browser_chrome: Web Browser / Google Chrome (mengikuti tema/aksen browser Chrome, atau sistem OS jika Chrome di-set otomatis)
 */
const getAccentPlatformSource = (): AccentPlatformSource => {
  if (isTauriDesktop()) return 'desktop_windows';
  if (isNativeAndroid()) return 'mobile_android_material_you';
  return 'webapp_browser_chrome';
};

const parseComputedCssColorToHex = (cssColor: string): string | null => {
  const s = String(cssColor || '').trim();
  if (!s) return null;
  let m = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (!Number.isFinite(a) || a <= 0.01) return null;
    const hex = '#' + [m[1], m[2], m[3]].map(v => Math.max(0, Math.min(255, Math.round(parseFloat(v)))).toString(16).padStart(2, '0')).join('');
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : null;
  }
  m = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (!Number.isFinite(a) || a <= 0.01) return null;
    const hex = '#' + [m[1], m[2], m[3]].map(v => Math.max(0, Math.min(255, Math.round(parseFloat(v) * 255))).toString(16).padStart(2, '0')).join('');
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : null;
  }
  return null;
};

const getEffectiveColorScheme = (): 'light' | 'dark' => {
  if (typeof document !== 'undefined') {
    const dt = document.documentElement.getAttribute('data-theme');
    if (dt === 'dark') return 'dark';
    if (dt === 'light') return 'light';
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const probeCssSystemColor = (keyword: string): string | null => {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return null;
  const host = document.body || document.documentElement;
  if (!host) return null;
  const probe = document.createElement('span');
  probe.style.cssText = `position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;color-scheme:inherit;accent-color:auto;color:${keyword}`;
  host.appendChild(probe);
  try {
    const computed = getComputedStyle(probe).color;
    const hex = parseComputedCssColorToHex(computed);
    if (hex && hex !== '#000000' && hex !== '#ffffff') return hex;
    return null;
  } catch (e) {
    return null;
  } finally {
    probe.remove();
  }
};

/**
 * Resolusi aksen Material You dinamis di Android (API 31+):
 * Memprioritaskan native bridge GeovantaAndroidTheme (system_accent1_600/200),
 * lalu fallback ke CSS AccentColor WebView dan warna standar Material 3.
 */
const detectAndroidMaterialYouAccent = (): string => {
  const fromNative = getAndroidMaterialYouAccent(getEffectiveColorScheme());
  if (fromNative) return fromNative;
  const fromAccent = probeCssSystemColor('AccentColor');
  if (fromAccent) return fromAccent;
  return '#006a6a'; // Standar Material 3 Dynamic Teal/Primary
};

/**
 * Resolusi aksen Web App (Google Chrome / modern browsers):
 * Di Google Chrome, CSS AccentColor memantulkan warna tema browser yang dipilih pengguna.
 * Jika Chrome diatur "Otomatis / Ikuti Perangkat", AccentColor otomatis memantulkan aksen OS sistem.
 */
const detectWebBrowserAccent = (): string => {
  if (typeof window !== 'undefined' && (window as any).__geovantaWebBrowserAccentColor) {
    const ov = (window as any).__geovantaWebBrowserAccentColor;
    if (typeof ov === 'string' && /^#[0-9a-f]{6}$/i.test(ov)) return ov.toLowerCase();
  }
  const fromAccent = probeCssSystemColor('AccentColor');
  if (fromAccent) return fromAccent;
  const fromHighlight = probeCssSystemColor('Highlight');
  if (fromHighlight) return fromHighlight;
  return '#0d99ff'; // Default aksen browser (Chrome/Figma Blue)
};

/**
 * Mendeteksi apakah browser desktop membatasi pembacaan aksen tema/OS demi anti-fingerprinting
 * sehingga CSS AccentColor selalu mengembalikan biru standar Chromium (#0075ff / #99c8ff).
 */
const isWebBrowserAccentRestricted = (): boolean => {
  if (typeof window === 'undefined' || getAccentPlatformSource() !== 'webapp_browser_chrome') return false;
  if ((window as any).__geovantaWebBrowserAccentColor) return false;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(forced-colors: active)').matches) return false;
  const fromAccent = probeCssSystemColor('AccentColor');
  return fromAccent === '#0075ff' || fromAccent === '#99c8ff';
};

/**
 * Resolusi aksen desktop Windows (Tauri Desktop App / EXE):
 * Mengambil nilai aksen sistem Windows dari DWM Registry via Tauri bridge.
 */
const detectDesktopWindowsAccent = async (): Promise<string> => {
  if (isTauriDesktop()) {
    try {
      const winColor = await invokeTauriCommand('get_windows_accent_color');
      if (typeof winColor === 'string' && /^#[0-9a-f]{6}$/i.test(winColor)) {
        _cachedDesktopAccent = winColor.toLowerCase();
        _lastSysAccent = _cachedDesktopAccent;
        return _cachedDesktopAccent;
      }
    } catch (e) {}
  }
  if (_cachedDesktopAccent) return _cachedDesktopAccent;
  const fromAccent = probeCssSystemColor('AccentColor');
  if (fromAccent) return fromAccent;
  const fromHighlight = probeCssSystemColor('Highlight');
  if (fromHighlight) return fromHighlight;
  return _lastSysAccent || '#0078d4'; // Windows Blue
};

/**
 * Deteksi sinkron langsung warna aksen otomatis sesuai platform saat ini.
 */
const detectSystemAccentColor = (): string => {
  if (typeof document === 'undefined') return _lastSysAccent || '#0078d4';
  const platform = getAccentPlatformSource();
  if (platform === 'mobile_android_material_you') {
    const col = detectAndroidMaterialYouAccent();
    _lastSysAccent = col;
    return col;
  }
  if (platform === 'webapp_browser_chrome') {
    const col = detectWebBrowserAccent();
    _lastSysAccent = col;
    return col;
  }
  // desktop_windows: prioritaskan nilai DWM Registry yang sudah di-cache agar tidak tertimpa #0075ff WebView2
  if (_cachedDesktopAccent) {
    return _cachedDesktopAccent;
  }
  const fromAccent = probeCssSystemColor('AccentColor') || probeCssSystemColor('Highlight') || _lastSysAccent || '#0078d4';
  _lastSysAccent = fromAccent;
  return fromAccent;
};

/**
 * Resolusi asinkron warna aksen otomatis (menunggu Tauri bridge bila berjalan di Desktop EXE).
 */
const resolveSystemAccentColorAsync = async (): Promise<string> => {
  const platform = getAccentPlatformSource();
  if (platform === 'desktop_windows') {
    return await detectDesktopWindowsAccent();
  }
  if (platform === 'mobile_android_material_you') {
    return detectAndroidMaterialYouAccent();
  }
  return detectWebBrowserAccent();
};

const generateRandomAccentColor = (excludeHex?: string): string => {
  let prevHue: number | null = null;
  if (excludeHex && /^#[0-9a-f]{6}$/i.test(excludeHex)) {
    prevHue = hex2hsv(excludeHex)[0];
  }
  let h = Math.random() * 360;
  if (prevHue !== null) {
    for (let i = 0; i < 12; i++) {
      const diff = Math.abs(((h - prevHue + 540) % 360) - 180);
      if (diff >= 30) break;
      h = Math.random() * 360;
    }
  }
  const s = 0.58 + Math.random() * 0.32;
  const v = 0.65 + Math.random() * 0.27;
  return hsv2hex(h, s, v).toLowerCase();
};

const previewAccent = acc => {
  const resolved = acc === 'system' ? detectSystemAccentColor() : acc;
  const col = resolved && /^#[0-9a-f]{6}$/i.test(resolved) ? resolved.toLowerCase() : '#13b152';
  const style = document.documentElement.style;
  style.setProperty('--acc', col);
  style.setProperty('--fig-sel', `color-mix(in srgb, ${col} 18%, var(--card))`);
};

const applyAccent = acc => {
  const resolved = acc === 'system' ? detectSystemAccentColor() : acc;
  const col = resolved && /^#[0-9a-f]{6}$/i.test(resolved) ? resolved.toLowerCase() : '#13b152';
  const enc = '%23' + col.slice(1);
  const root = document.documentElement;
  root.style.setProperty('--acc', col);
  root.style.setProperty('--fig-sel', `color-mix(in srgb, ${col} 18%, var(--card))`);
  root.style.setProperty('--cur-default', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4.5 3.2L19.2 10.6C20.1 11.05 20.02 12.38 19.06 12.7L12.8 14.75L10.35 20.82C9.97 21.75 8.65 21.72 8.32 20.77L3.35 4.45C3.08 3.55 3.66 2.78 4.5 3.2Z' fill='%2318181b' stroke='%23ffffff' stroke-width='1.8' stroke-linejoin='round'/%3E%3Ccircle cx='9.5' cy='9.5' r='1.7' fill='${enc}'/%3E%3C/svg%3E") 4 3, default`);
  root.style.setProperty('--cur-pointer', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4.5 3.2L19.2 10.6C20.1 11.05 20.02 12.38 19.06 12.7L12.8 14.75L10.35 20.82C9.97 21.75 8.65 21.72 8.32 20.77L3.35 4.45C3.08 3.55 3.66 2.78 4.5 3.2Z' fill='${enc}' stroke='%23ffffff' stroke-width='1.8' stroke-linejoin='round'/%3E%3Ccircle cx='17.5' cy='6.5' r='2.5' fill='${enc}' stroke='%23ffffff' stroke-width='1.4'/%3E%3C/svg%3E") 4 3, pointer`);
  root.style.setProperty('--cur-crosshair', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='5.5' stroke='%23ffffff' stroke-width='3'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5' stroke='%23ffffff' stroke-width='3'/%3E%3Ccircle cx='12' cy='12' r='5.5' stroke='${enc}' stroke-width='1.7'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5' stroke='%2318181b' stroke-width='1.6'/%3E%3Ccircle cx='12' cy='12' r='1.8' fill='${enc}'/%3E%3C/g%3E%3C/svg%3E") 12 12, crosshair`);
  root.style.setProperty('--cur-grab', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M18 11V7.5a1.75 1.75 0 0 0-3.5 0V10M14.5 9.5V5.75a1.75 1.75 0 0 0-3.5 0V9.5M11 9.5V6.5a1.75 1.75 0 0 0-3.5 0v7l-1.6-1.6a1.75 1.75 0 0 0-2.48 2.48l4.18 4.18A5.5 5.5 0 0 0 11.5 20.2h2A5.5 5.5 0 0 0 19 14.7V11a1.75 1.75 0 0 0-1-1.58Z' fill='%23ffffff' stroke='${enc}' stroke-width='1.85' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, grab`);
  root.style.setProperty('--cur-grabbing', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M18 12.5v-1a1.75 1.75 0 0 0-3.5 0v-.5a1.75 1.75 0 0 0-3.5 0v-.25a1.75 1.75 0 0 0-3.5 0V14l-1.4-.95a1.75 1.75 0 0 0-2.2 2.7l3.7 3.2A5.5 5.5 0 0 0 11.2 20.2h2.3A5.5 5.5 0 0 0 19 14.7v-2.2Z' fill='${enc}' stroke='%23ffffff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, grabbing`);
  root.style.setProperty('--cur-ew', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M7 8l-4 4 4 4M17 8l4 4-4 4M3 12h18' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M7 8l-4 4 4 4M17 8l4 4-4 4M3 12h18' fill='none' stroke='${enc}' stroke-width='1.85' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, ew-resize`);
  root.style.setProperty('--cur-ns', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M8 7l4-4 4 4M8 17l4 4 4-4M12 3v18' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M8 7l4-4 4 4M8 17l4 4 4-4M12 3v18' fill='none' stroke='${enc}' stroke-width='1.85' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, ns-resize`);
  root.style.setProperty('--cur-nwse', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M5 11V5h6M19 13v6h-6M5 5l14 14' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M5 11V5h6M19 13v6h-6M5 5l14 14' fill='none' stroke='${enc}' stroke-width='1.85' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, nwse-resize`);
  root.style.setProperty('--cur-nesw', `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M13 5h6v6M11 19H5v-6M19 5L5 19' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M13 5h6v6M11 19H5v-6M19 5L5 19' fill='none' stroke='${enc}' stroke-width='1.85' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, nesw-resize`);
  root.style.setProperty('--cur-rot-0', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M19.44 9.06L18.71 7.64L17.72 6.40L16.50 5.38L15.10 4.63L13.58 4.16L12.00 4.00L10.42 4.16L8.90 4.63L7.50 5.38L6.28 6.40L5.29 7.64L4.56 9.06' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M21.09 13.24L16.93 8.43L20.84 6.89ZM2.91 13.24L3.16 6.89L7.07 8.43Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M19.44 9.06L18.71 7.64L17.72 6.40L16.50 5.38L15.10 4.63L13.58 4.16L12.00 4.00L10.42 4.16L8.90 4.63L7.50 5.38L6.28 6.40L5.29 7.64L4.56 9.06' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M21.09 13.24L16.93 8.43L20.84 6.89ZM2.91 13.24L3.16 6.89L7.07 8.43Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  root.style.setProperty('--cur-rot-1', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M19.34 15.18L19.83 13.66L20.00 12.08L19.86 10.50L19.41 8.98L18.66 7.57L17.66 6.34L16.43 5.34L15.02 4.59L13.50 4.14L11.92 4.00L10.34 4.17L8.82 4.66' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M17.55 19.31L18.01 12.97L21.87 14.63ZM4.69 6.45L9.37 2.13L11.03 5.99Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M19.34 15.18L19.83 13.66L20.00 12.08L19.86 10.50L19.41 8.98L18.66 7.57L17.66 6.34L16.43 5.34L15.02 4.59L13.50 4.14L11.92 4.00L10.34 4.17L8.82 4.66' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M17.55 19.31L18.01 12.97L21.87 14.63ZM4.69 6.45L9.37 2.13L11.03 5.99Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  root.style.setProperty('--cur-rot-2', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M14.94 19.44L16.36 18.71L17.60 17.72L18.62 16.50L19.37 15.10L19.84 13.58L20.00 12.00L19.84 10.42L19.37 8.90L18.62 7.50L17.60 6.28L16.36 5.29L14.94 4.56' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M10.76 21.09L15.57 16.93L17.11 20.84ZM10.76 2.91L17.11 3.16L15.57 7.07Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M14.94 19.44L16.36 18.71L17.60 17.72L18.62 16.50L19.37 15.10L19.84 13.58L20.00 12.00L19.84 10.42L19.37 8.90L18.62 7.50L17.60 6.28L16.36 5.29L14.94 4.56' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M10.76 21.09L15.57 16.93L17.11 20.84ZM10.76 2.91L17.11 3.16L15.57 7.07Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  root.style.setProperty('--cur-rot-3', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M8.82 19.34L10.34 19.83L11.92 20.00L13.50 19.86L15.02 19.41L16.43 18.66L17.66 17.66L18.66 16.43L19.41 15.02L19.86 13.50L20.00 11.92L19.83 10.34L19.34 8.82' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M4.69 17.55L11.03 18.01L9.37 21.87ZM17.55 4.69L21.87 9.37L18.01 11.03Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M8.82 19.34L10.34 19.83L11.92 20.00L13.50 19.86L15.02 19.41L16.43 18.66L17.66 17.66L18.66 16.43L19.41 15.02L19.86 13.50L20.00 11.92L19.83 10.34L19.34 8.82' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M4.69 17.55L11.03 18.01L9.37 21.87ZM17.55 4.69L21.87 9.37L18.01 11.03Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  root.style.setProperty('--cur-rot-4', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M4.56 14.94L5.29 16.36L6.28 17.60L7.50 18.62L8.90 19.37L10.42 19.84L12.00 20.00L13.58 19.84L15.10 19.37L16.50 18.62L17.72 17.60L18.71 16.36L19.44 14.94' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M2.91 10.76L7.07 15.57L3.16 17.11ZM21.09 10.76L20.84 17.11L16.93 15.57Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M4.56 14.94L5.29 16.36L6.28 17.60L7.50 18.62L8.90 19.37L10.42 19.84L12.00 20.00L13.58 19.84L15.10 19.37L16.50 18.62L17.72 17.60L18.71 16.36L19.44 14.94' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M2.91 10.76L7.07 15.57L3.16 17.11ZM21.09 10.76L20.84 17.11L16.93 15.57Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  root.style.setProperty('--cur-rot-5', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M4.66 8.82L4.17 10.34L4.00 11.92L4.14 13.50L4.59 15.02L5.34 16.43L6.34 17.66L7.57 18.66L8.98 19.41L10.50 19.86L12.08 20.00L13.66 19.83L15.18 19.34' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M6.45 4.69L5.99 11.03L2.13 9.37ZM19.31 17.55L14.63 21.87L12.97 18.01Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M4.66 8.82L4.17 10.34L4.00 11.92L4.14 13.50L4.59 15.02L5.34 16.43L6.34 17.66L7.57 18.66L8.98 19.41L10.50 19.86L12.08 20.00L13.66 19.83L15.18 19.34' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M6.45 4.69L5.99 11.03L2.13 9.37ZM19.31 17.55L14.63 21.87L12.97 18.01Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  root.style.setProperty('--cur-rot-6', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M9.06 4.56L7.64 5.29L6.40 6.28L5.38 7.50L4.63 8.90L4.16 10.42L4.00 12.00L4.16 13.58L4.63 15.10L5.38 16.50L6.40 17.72L7.64 18.71L9.06 19.44' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M13.24 2.91L8.43 7.07L6.89 3.16ZM13.24 21.09L6.89 20.84L8.43 16.93Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M9.06 4.56L7.64 5.29L6.40 6.28L5.38 7.50L4.63 8.90L4.16 10.42L4.00 12.00L4.16 13.58L4.63 15.10L5.38 16.50L6.40 17.72L7.64 18.71L9.06 19.44' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M13.24 2.91L8.43 7.07L6.89 3.16ZM13.24 21.09L6.89 20.84L8.43 16.93Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  root.style.setProperty('--cur-rot-7', `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M15.18 4.66L13.66 4.17L12.08 4.00L10.50 4.14L8.98 4.59L7.57 5.34L6.34 6.34L5.34 7.57L4.59 8.98L4.14 10.50L4.00 12.08L4.17 13.66L4.66 15.18' fill='none' stroke='%23ffffff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M19.31 6.45L12.97 5.99L14.63 2.13ZM6.45 19.31L2.13 14.63L5.99 12.97Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2.6' stroke-linejoin='round'/><path d='M15.18 4.66L13.66 4.17L12.08 4.00L10.50 4.14L8.98 4.59L7.57 5.34L6.34 6.34L5.34 7.57L4.59 8.98L4.14 10.50L4.00 12.08L4.17 13.66L4.66 15.18' fill='none' stroke='${enc}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M19.31 6.45L12.97 5.99L14.63 2.13ZM6.45 19.31L2.13 14.63L5.99 12.97Z' fill='${enc}' stroke='${enc}' stroke-width='0.9' stroke-linejoin='round'/></svg>") 12 12, grab`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('geovanta-accent-change', {
      detail: {
        accent: col
      }
    }));
  }
};
const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {
      ...DEFAULT_PREFS
    };
    const p = JSON.parse(raw);
    /* T10: tegakkan batas 10 warna terakhir juga di jalur muat — daftar
       lebih panjang (seed/import/prefs lama) sebelumnya dirender apa adanya
       karena cap hanya ada di jalur tulis rememberRecentColor. */
    if (Array.isArray(p.recentColors)) {
      p.recentColors = p.recentColors.filter(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 10);
    }
    /* Task 7 (Iconify): tegakkan batas 12 nama PENUH "prefix:nama" juga
       di jalur muat — nama pendek tanpa ":" tidak bisa di-resolve
       insert (Task 6) dan tidak pernah ditulis rememberRecentIcon,
       jadi entri seperti itu (seed/prefs lama) dibuang di sini. */
    if (Array.isArray(p.recentIcons)) {
      p.recentIcons = p.recentIcons.filter(n => typeof n === 'string' && n.includes(':')).slice(0, 12);
    }
    if (!p.m3White) {
      p.theme = 'light';
      p.m3White = true;
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          ...DEFAULT_PREFS,
          ...p
        }));
      } catch (e) {}
    }
    if (typeof p.antialias === 'boolean') {
      updateRenderConfig({ antialias: p.antialias });
    } else {
      updateRenderConfig({ antialias: false });
    }
    const out = {
      ...DEFAULT_PREFS,
      ...p,
      accentMode: p.accentMode === 'system' ? 'system' : 'custom'
    };
    if (out.accentMode === 'system' && typeof document !== 'undefined') {
      out.accent = detectSystemAccentColor();
    }
    return out;
  } catch (e) {
    return {
      ...DEFAULT_PREFS
    };
  }
};
const savePrefs = p => {
  try {
    if (p.persist === false) {
      localStorage.removeItem(LS_KEY);
      return;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch (e) {}
};
const applyTheme = theme => {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'light dark';
  }
};
/* Preferensi OS `prefers-reduced-motion: reduce` menang atas pref manual `on`
   (Task 6 / C-5); pref manual `off` tetap menang. Listener didaftarkan sekali
   (module-level) agar perubahan OS tanpa reload ikut diterapkan. */
let motionMq = null;
let lastMotionPref = 'system';
const applyMotion = motion => {
  lastMotionPref = motion;
  const root = document.documentElement;
  if (motionMq === null && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onOsMotionChange = () => applyMotion(lastMotionPref);
    if (typeof motionMq.addEventListener === 'function') motionMq.addEventListener('change', onOsMotionChange);
    else if (typeof motionMq.addListener === 'function') motionMq.addListener(onOsMotionChange);
  }
  const osReduce = motionMq !== null && motionMq.matches;
  if (osReduce || motion === 'off') root.setAttribute('data-motion', 'off');
  else if (motion === 'on') root.setAttribute('data-motion', 'on');
  else root.removeAttribute('data-motion');
};

/* Bahasa antarmuka tab Pengaturan ('id' | 'en'); dibaca langsung dari
   localStorage agar komponen di luar pohon prefs (mis. TipHost) bisa
   mengikutinya tanpa prop drilling. */
const readLangPref = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return 'id';
    const p = JSON.parse(raw);
    return p.lang === 'en' ? 'en' : 'id';
  } catch (e) {
    return 'id';
  }
};

export {
  applyAccent,
  previewAccent,
  loadPrefs,
  savePrefs,
  applyTheme,
  applyMotion,
  readLangPref,
  detectSystemAccentColor,
  resolveSystemAccentColorAsync,
  generateRandomAccentColor,
  getAccentPlatformSource,
  isWebBrowserAccentRestricted
};
