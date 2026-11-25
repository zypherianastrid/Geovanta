/**
 * @file src/main.tsx
 * @description Titik masuk utama (Entrypoint) aplikasi desktop Geovanta Tauri Windows 64-bit
 */
import './vendor/reactOfflineBundle.tsx';
import './vendor/tailwindOfflineBundle.tsx';
import './styles/mobileStyles.ts';
import { injectGeovantaSansUiFont } from './assets/fonts/geovantaSansUiFontCss.ts';
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App.tsx';
import { VE } from './engine/vectorEngine.tsx';
import { RENDER_CONFIG, PERF_TELEMETRY } from './utils/renderConfigAndTelemetry.tsx';
import { DEVICE_PROFILES, ACTIVE_DEVICE_PROFILE, setDeviceProfileTier, computeSafeFramebufferSize } from './utils/deviceProfiles.tsx';
import { GEOMETRY_CACHE } from './renderer/geometryCache.tsx';
import { flattenCubicAdaptive } from './renderer/adaptiveCubicFlattener.tsx';
import { getObjectTessellationLOD, IMG_ELEMENT_CACHE } from './renderer/objectTessellationLod.tsx';
import { SceneRenderer } from './renderer/sceneRenderer.tsx';
import { WorkspaceDB } from './workspace/workspaceDb.tsx';
import { AssetManager } from './workspace/assetManager.tsx';
import { ThumbnailGenerator } from './workspace/thumbnailGenerator.tsx';
import { ZipEngine } from './workspace/zipEngine.tsx';
import { ProjectRepository } from './workspace/projectRepository.tsx';
import { WorkspaceController } from './workspace/workspaceController.tsx';
import { isTauriDesktop, syncDesktopWindowTitle } from './vendor/tauriDesktopBridge.tsx';
import { initWasmEngine, wasmEngine } from './bridge/wasmEngineBridge.ts';

// Inisialisasi font UI Geovanta Sans & akselerasi Rust WebAssembly di background saat startup
injectGeovantaSansUiFont();
initWasmEngine().catch(err => console.warn('[Geovanta] WASM acceleration startup fallback:', err));

if (typeof window !== 'undefined') {
  window.__GEOVANTA_AUDIT__ = {
    VE,
    RENDER_CONFIG,
    DEVICE_PROFILES,
    ACTIVE_DEVICE_PROFILE: () => ACTIVE_DEVICE_PROFILE,
    setDeviceProfileTier,
    computeSafeFramebufferSize,
    PERF_TELEMETRY,
    GEOMETRY_CACHE,
    IMG_ELEMENT_CACHE,
    flattenCubicAdaptive,
    getObjectTessellationLOD,
    SceneRenderer,
    WorkspaceDB,
    AssetManager,
    ThumbnailGenerator,
    ZipEngine,
    ProjectRepository,
    WorkspaceController,
    isTauriDesktop,
    wasmEngine
  };
  syncDesktopWindowTitle(null, 'saved');
}

const rootElement = document.getElementById('root');
if (rootElement) {
  (ReactDOM as any).createRoot(rootElement).render(<App />);
}
