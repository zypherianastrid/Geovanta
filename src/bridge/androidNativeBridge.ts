/**
 * @file src/bridge/androidNativeBridge.ts
 * @description Bridge integrasi native Android (Capacitor Back Button, StatusBar, Haptics, Keyboard, & Filesystem/Share)
 * dengan fallback aman untuk Web/Desktop serta hook diagnostik untuk pengujian otomatis.
 */
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Keyboard } from '@capacitor/keyboard';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection';
export type StatusBarTheme = 'light' | 'dark';

export interface NativeExportRecord {
  filename: string;
  size: number;
  mime: string;
  title: string;
}

export interface AndroidBridgeDiagnostics {
  lastStatusBar: StatusBarTheme | null;
  haptics: HapticStyle[];
  exports: NativeExportRecord[];
  exitCount: number;
  keyboardHeight: number;
}

type BackEntry = {
  id: number;
  priority: number;
  handler: () => boolean;
};

let nextHandlerId = 1;
const backHandlers: BackEntry[] = [];

const diagnostics: AndroidBridgeDiagnostics = {
  lastStatusBar: null,
  haptics: [],
  exports: [],
  exitCount: 0,
  keyboardHeight: 0,
};

function isRealNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/** Returns true when running inside Capacitor Android or forced into Android native test mode. */
export function isNativeAndroid(): boolean {
  if (typeof window !== 'undefined' && (window as any).__geovantaForceAndroidNative === true) {
    return true;
  }
  return isRealNativeAndroid();
}

/** Registers a hardware Back button handler ordered by descending priority. */
export function registerAndroidBackHandler(priority: number, handler: () => boolean): () => void {
  const entry: BackEntry = { id: nextHandlerId++, priority, handler };
  backHandlers.push(entry);
  return () => {
    const idx = backHandlers.findIndex(item => item.id === entry.id);
    if (idx >= 0) backHandlers.splice(idx, 1);
  };
}

/** Dispatches a hardware Back event to registered handlers highest priority first. */
export function dispatchAndroidBack(): boolean {
  const ordered = [...backHandlers].sort((a, b) => b.priority - a.priority || b.id - a.id);
  for (const entry of ordered) {
    try {
      if (entry.handler()) return true;
    } catch (err) {
      console.warn('[AndroidBridge] Back handler error:', err);
    }
  }
  return false;
}

/** Attaches the Capacitor App backButton listener on native Android and returns an unsubscribe callback. */
export function initAndroidBackButton(): () => void {
  if (!isRealNativeAndroid()) return () => {};
  let removed = false;
  let listenerHandle: { remove: () => Promise<void> } | null = null;
  CapApp.addListener('backButton', () => {
    dispatchAndroidBack();
  })
    .then(handle => {
      if (removed) {
        handle.remove().catch(() => {});
      } else {
        listenerHandle = handle;
      }
    })
    .catch(() => {});

  return () => {
    removed = true;
    listenerHandle?.remove().catch(() => {});
  };
}

/** Exits the Android application cleanly (or increments exitCount in diagnostic test mode). */
export async function exitAndroidApp(): Promise<void> {
  diagnostics.exitCount += 1;
  if (isRealNativeAndroid()) {
    try {
      await CapApp.exitApp();
    } catch {
      // Ignore exit errors outside active Activity lifecycle
    }
  }
}

/** Triggers tactile haptic feedback on Android and records the event for diagnostics. */
export async function triggerHaptic(style: HapticStyle = 'light'): Promise<void> {
  diagnostics.haptics.push(style);
  if (diagnostics.haptics.length > 50) {
    diagnostics.haptics.shift();
  }
  if (!isRealNativeAndroid()) return;
  try {
    if (style === 'selection') {
      await Haptics.selectionChanged();
      return;
    }
    const impact =
      style === 'heavy'
        ? ImpactStyle.Heavy
        : style === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    await Haptics.impact({ style: impact });
  } catch {
    // Ignore haptic errors on devices without vibrator support
  }
}

/** Synchronizes the Android system status bar icons and background with app light/dark theme. */
export async function syncStatusBar(theme: StatusBarTheme): Promise<void> {
  diagnostics.lastStatusBar = theme;
  if (!isRealNativeAndroid()) return;
  try {
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? '#0f172a' : '#f8fafc',
    });
  } catch {
    // Ignore status bar errors on unsupported Android WebViews
  }
}

/** Listens to native Android soft keyboard show/hide events and updates CSS custom properties. */
export function initAndroidKeyboardSync(): () => void {
  if (typeof document === 'undefined') return () => {};
  const applyHeight = (px: number) => {
    const clean = Math.max(0, Math.round(px || 0));
    diagnostics.keyboardHeight = clean;
    const root = document.documentElement;
    root.style.setProperty('--android-kb-height', `${clean}px`);
    if (clean > 0) {
      root.setAttribute('data-keyboard-open', '1');
    } else {
      root.removeAttribute('data-keyboard-open');
    }
  };

  if (!isRealNativeAndroid()) {
    return () => {
      applyHeight(0);
    };
  }

  let removed = false;
  const handles: Array<{ remove: () => Promise<void> }> = [];
  const attach = (eventName: 'keyboardWillShow' | 'keyboardDidShow' | 'keyboardWillHide' | 'keyboardDidHide', isShow: boolean) => {
    Keyboard.addListener(eventName as any, (info: any) => {
      applyHeight(isShow ? Number(info?.keyboardHeight) || 0 : 0);
    })
      .then(handle => {
        if (removed) {
          handle.remove().catch(() => {});
        } else {
          handles.push(handle);
        }
      })
      .catch(() => {});
  };

  attach('keyboardWillShow', true);
  attach('keyboardDidShow', true);
  attach('keyboardWillHide', false);
  attach('keyboardDidHide', false);

  return () => {
    removed = true;
    for (const h of handles) {
      h.remove().catch(() => {});
    }
    applyHeight(0);
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca data blob'));
    reader.readAsDataURL(blob);
  });
}

/** Exports a generated Blob to Android Cache Filesystem and launches the system Share sheet. */
export async function exportBlobNative(blob: Blob, filename: string, title?: string): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const base64 = await blobToBase64(blob);
  const safeName = String(filename || 'geovanta-export.svg').replace(/[/\\]+/g, '_');
  const shareTitle = title || safeName;
  diagnostics.exports.push({
    filename: safeName,
    size: blob.size,
    mime: blob.type || 'application/octet-stream',
    title: shareTitle,
  });

  if (!isRealNativeAndroid() && (window as any).__geovantaForceAndroidNative === true) {
    return true;
  }

  await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
  });
  const uriResult = await Filesystem.getUri({
    path: safeName,
    directory: Directory.Cache,
  });
  await Share.share({
    title: shareTitle,
    url: uriResult.uri,
    dialogTitle: title || 'Bagikan / Simpan File',
  });
  return true;
}

/** Returns a snapshot of recorded Android bridge diagnostics for verification. */
export function getAndroidBridgeDiagnostics(): AndroidBridgeDiagnostics {
  return {
    lastStatusBar: diagnostics.lastStatusBar,
    haptics: [...diagnostics.haptics],
    exports: [...diagnostics.exports],
    exitCount: diagnostics.exitCount,
    keyboardHeight: diagnostics.keyboardHeight,
  };
}

if (typeof window !== 'undefined') {
  (window as any).__geovantaAndroidBridge = {
    isNativeAndroid,
    dispatchBack: dispatchAndroidBack,
    triggerHaptic,
    syncStatusBar,
    exportBlobNative,
    getDiagnostics: getAndroidBridgeDiagnostics,
  };
}
