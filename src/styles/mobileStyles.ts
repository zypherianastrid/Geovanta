/**
 * @file src/styles/mobileStyles.ts
 * @description Gaya CSS khusus Mode Mobile (html[data-mobile="1"]) termasuk orientasi portrait & landscape
 * serta target sentuh >= 44-48px, diisolasi agar tidak mengubah tata letak desktop.
 */

const MOBILE_STYLE_ID = 'geovanta-mobile-styles';

const MOBILE_CSS = `
@keyframes mobSheetUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes mobSheetLeft {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes mobFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mob-home-fab {
  display: none;
}

.fig-nav-dock .dk-b.chev-b {
  min-height: 24px !important;
}

.ws-nav-item .ws-nav-sub {
  color: var(--ink) !important;
  opacity: 0.72;
}

@media (max-width: 1180px) {
  .fig-floating-bar,
  .fig-tabbar-fixed.fig-floating-bar {
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scrollbar-width: thin !important;
    scrollbar-color: color-mix(in srgb, var(--mut) 52%, transparent) transparent !important;
    padding-bottom: 8px !important;
    -webkit-overflow-scrolling: touch;
  }

  .fig-floating-bar::-webkit-scrollbar,
  .fig-tabbar-fixed.fig-floating-bar::-webkit-scrollbar {
    display: block !important;
    height: 5px !important;
  }

  .fig-floating-bar::-webkit-scrollbar-track,
  .fig-tabbar-fixed.fig-floating-bar::-webkit-scrollbar-track {
    background: transparent !important;
    margin: 0 12px !important;
    border-radius: 999px !important;
  }

  .fig-floating-bar::-webkit-scrollbar-thumb,
  .fig-tabbar-fixed.fig-floating-bar::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--mut) 48%, transparent) !important;
    border-radius: 999px !important;
  }

  .fig-floating-bar::-webkit-scrollbar-thumb:hover,
  .fig-floating-bar::-webkit-scrollbar-thumb:active,
  .fig-tabbar-fixed.fig-floating-bar::-webkit-scrollbar-thumb:hover,
  .fig-tabbar-fixed.fig-floating-bar::-webkit-scrollbar-thumb:active {
    background: var(--acc) !important;
  }
}

/* ---- Dedicated Mobile & Android Mode (Portrait + Touch Landscape) ---- */
html[data-mobile="1"],
html[data-mobile="1"] body {
  height: var(--app-dvh, 100dvh);
  max-width: 100vw;
  overflow-x: hidden;
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

html[data-mobile="1"] .app-ws.app-full {
  display: flex !important;
  flex-direction: column !important;
  height: var(--app-dvh, 100dvh) !important;
  max-width: 100vw !important;
  overflow: hidden !important;
}

html[data-mobile="1"] .ws-fin {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  padding: 0 !important;
  height: 100% !important;
  min-height: 0 !important;
}

html[data-mobile="1"] .ws-body {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  overflow: hidden !important;
  min-height: 0 !important;
  height: 100% !important;
}

html[data-mobile="1"] .ws-fill {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* ---- WorkspaceHome Mobile ---- */
html[data-mobile="1"] .ws-home-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

html[data-mobile="1"] .ws-home-header {
  padding: 10px 12px !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
  align-items: center !important;
}

html[data-mobile="1"] .ws-home-brand {
  gap: 8px !important;
}

html[data-mobile="1"] .ws-home-header-actions {
  width: 100%;
  justify-content: flex-start !important;
  gap: 6px !important;
  flex-wrap: wrap !important;
}

html[data-mobile="1"] .ws-hdr-btn {
  padding: 8px 14px !important;
  font-size: 12px !important;
  min-height: 44px;
}

html[data-mobile="1"] .ws-hdr-icon-btn {
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  padding: 0 !important;
}

html[data-mobile="1"] .ws-home-header [data-tip="help"] {
  display: none !important;
}

html[data-mobile="1"] .mob-home-fab {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 48;
  height: 52px;
  min-width: 56px;
  padding: 0 18px;
  border-radius: 16px;
  background: var(--acc);
  color: #fff;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
  cursor: pointer;
}

html[data-mobile="1"] .mob-home-fab:active {
  transform: scale(0.96);
}

html[data-mobile="1"] .ws-session-ram-banner,
html[data-mobile="1"] .ws-recovery-banner {
  margin: 8px 12px 0 !important;
  padding: 8px 12px !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}

html[data-mobile="1"] .ws-home-body {
  flex-direction: column !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

html[data-mobile="1"] .ws-home-nav {
  width: 100% !important;
  flex: none !important;
  flex-direction: row !important;
  border-right: 0 !important;
  border-bottom: 1px solid var(--line) !important;
  box-shadow: none !important;
  padding: 8px 12px !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

html[data-mobile="1"] .ws-home-nav::-webkit-scrollbar {
  display: none;
}

html[data-mobile="1"] .ws-nav-list {
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  gap: 6px !important;
  width: max-content;
}

html[data-mobile="1"] .ws-nav-item {
  width: auto !important;
  flex: none !important;
  padding: 6px 14px !important;
  min-height: 44px;
  border-radius: 999px !important;
  gap: 7px !important;
  white-space: nowrap;
}

html[data-mobile="1"] .ws-nav-ico {
  width: 24px !important;
  height: 24px !important;
  border-radius: 8px !important;
}

html[data-mobile="1"] .ws-nav-sub,
html[data-mobile="1"] .ws-nav-storage-card {
  display: none !important;
}

html[data-mobile="1"] .ws-home-main {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding: 12px 12px 84px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch;
}

html[data-mobile="1"] .ws-home-toolbar {
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 10px !important;
  margin-bottom: 14px !important;
}

html[data-mobile="1"] .ws-toolbar-controls {
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 8px !important;
  width: 100%;
}

html[data-mobile="1"] .ws-search-box {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 44px !important;
}

html[data-mobile="1"] .ws-sort-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

html[data-mobile="1"] .ws-sort-wrap > div {
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

html[data-mobile="1"] .ws-project-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 10px !important;
  padding-bottom: 24px !important;
}

html[data-mobile="1"] .ws-card-fav-btn {
  opacity: 1 !important;
  width: 40px !important;
  height: 40px !important;
}

html[data-mobile="1"] .ws-card-menu-btn {
  width: 40px !important;
  height: 40px !important;
}

html[data-mobile="1"] .ws-card-thumb-overlay {
  display: none !important;
}

/* ---- VectorEditor Mobile Studio Layout ---- */
html[data-mobile="1"] .ved-root.ved-full {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

html[data-mobile="1"] .fig-workspace {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

html[data-mobile="1"] .ved-fmid {
  position: absolute !important;
  top: calc(52px + env(safe-area-inset-top, 0px)) !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  z-index: 1 !important;
}

html[data-mobile="1"] .ved-canvas {
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  border-radius: 0 !important;
  touch-action: none !important;
}

html[data-mobile="1"] .fig-sidebar-edge-toggle,
html[data-mobile="1"] .ved-rz {
  display: none !important;
}

/* Mobile Top Bar (>= 44dp touch targets) */
html[data-mobile="1"] .mob-editor-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 56;
  height: calc(52px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 6px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  max-width: 100vw;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  background: color-mix(in srgb, var(--card) 92%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  user-select: none;
}

html[data-mobile="1"] .mob-editor-topbar::-webkit-scrollbar {
  display: none;
}

html[data-mobile="1"] .mob-top-grp {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  min-width: 0;
}

html[data-mobile="1"] .mob-top-btn {
  position: relative;
  min-width: 44px;
  height: 44px;
  padding: 0 8px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  flex: none;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

html[data-mobile="1"] .mob-top-btn:active:not(:disabled) {
  transform: scale(0.94);
}

html[data-mobile="1"] .mob-top-btn.on {
  background: color-mix(in srgb, var(--acc) 16%, var(--sub));
  color: var(--acc);
  border-color: color-mix(in srgb, var(--acc) 35%, transparent);
}

html[data-mobile="1"] .mob-top-btn:disabled {
  opacity: 0.36;
  cursor: not-allowed;
}

html[data-mobile="1"] .mob-top-btn.mob-export-btn {
  background: color-mix(in srgb, var(--acc) 14%, var(--sub));
  color: var(--acc);
  border-color: color-mix(in srgb, var(--acc) 32%, transparent);
  padding: 0 10px;
  height: 44px;
  min-height: 44px;
}

html[data-mobile="1"] .mob-proj-btn {
  min-width: 68px;
  max-width: 116px;
  height: 40px;
  min-height: 40px;
  padding: 0 9px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--sub);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  flex: none;
}

html[data-mobile="1"] .mob-save-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
  background: #10b981;
}

html[data-mobile="1"] .mob-save-dot.st-dirty,
html[data-mobile="1"] .mob-save-dot.st-saving {
  background: #f59e0b;
}

html[data-mobile="1"] .mob-save-dot.st-error {
  background: #ef4444;
}

html[data-mobile="1"] .mob-zoom-pill {
  min-width: 48px;
  height: 44px;
  padding: 0 8px;
  border-radius: 10px;
  background: var(--sub);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
}

html[data-mobile="1"] .mob-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--acc);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
}

/* Mobile Quick Actions Horizontal Strip */
html[data-mobile="1"] .mob-rail-sheet {
  position: fixed;
  top: calc(58px + env(safe-area-inset-top, 0px));
  left: 8px;
  right: 8px;
  z-index: 46;
  display: flex;
  align-items: center;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 5px 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  animation: mobFadeIn 0.16s ease both;
}

html[data-mobile="1"] .mob-rail-sheet::-webkit-scrollbar {
  display: none;
}

html[data-mobile="1"] .mob-rail-sheet .fig-nav-rail {
  width: max-content !important;
  height: auto !important;
  border-right: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  background: transparent !important;
  flex-direction: row !important;
  overflow: visible !important;
}

html[data-mobile="1"] .mob-rail-sheet .fig-nav-dock {
  flex-direction: row !important;
  align-items: center !important;
  gap: 6px !important;
}

html[data-mobile="1"] .mob-rail-sheet .fig-rail-grp {
  flex-direction: row !important;
  border-radius: 10px !important;
  padding: 2px !important;
}

html[data-mobile="1"] .mob-rail-sheet .fig-nav-dock .dk-b {
  width: 44px !important;
  height: 44px !important;
}

html[data-mobile="1"] .mob-rail-sheet .fig-nav-dock .dk-b.chev-b {
  width: 26px !important;
  height: 44px !important;
}

/* Mobile Bottom Sheets (Layers & Inspector) */
html[data-mobile="1"] .mob-sheet-backdrop {
  position: fixed;
  top: calc(52px + env(safe-area-inset-top, 0px));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 54;
  background: rgba(0, 0, 0, 0.36);
  animation: mobFadeIn 0.18s ease both;
}

html[data-mobile="1"] .mob-sheet-wrap {
  position: fixed !important;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 55;
  width: 100% !important;
  max-width: 100vw !important;
  height: min(58dvh, 520px);
  max-height: min(88dvh, calc(var(--app-dvh, 100dvh) - 52px - env(safe-area-inset-top, 0px)));
  display: flex;
  flex-direction: column;
  background: var(--card);
  border-top: 1px solid var(--line);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -14px 42px rgba(0, 0, 0, 0.28);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  overflow: hidden;
  transition: height 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  animation: mobSheetUp 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

html[data-mobile="1"] .mob-sheet-wrap.expanded {
  height: min(84dvh, calc(var(--app-dvh, 100dvh) - 52px - env(safe-area-inset-top, 0px))) !important;
}

html[data-mobile="1"] .mob-sheet-header {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  border-bottom: 1px solid var(--line);
  background: var(--card);
  cursor: grab;
  touch-action: none;
}

html[data-mobile="1"] .mob-insp-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--line);
  background: var(--card);
  flex: none;
}

html[data-mobile="1"] .mob-insp-tab {
  flex: 1 1 0%;
  min-height: 40px;
  padding: 0 8px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--mut);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

html[data-mobile="1"] .mob-insp-tab.on {
  background: color-mix(in srgb, var(--acc) 15%, var(--sub));
  color: var(--acc);
  border-color: color-mix(in srgb, var(--acc) 32%, transparent);
}

html[data-mobile="1"] .mob-sheet-pill {
  position: absolute;
  left: 50%;
  top: 6px;
  transform: translateX(-50%);
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: var(--line);
}

html[data-mobile="1"] .mob-sheet-wrap .fig-left-sidebar,
html[data-mobile="1"] .mob-sheet-wrap .fig-right-sidebar {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  animation: none !important;
}

html[data-mobile="1"] .mob-sheet-wrap .fig-left-sidebar .fig-doc-hdr {
  display: none !important;
}

html[data-mobile="1"] .mob-sheet-wrap .fig-doc-hdr,
html[data-mobile="1"] .mob-sheet-wrap .fig-sec-hdr,
html[data-mobile="1"] .mob-sheet-wrap .fig-layers-scroll {
  margin-right: 0 !important;
}

html[data-mobile="1"] .mob-sheet-wrap .fig-layers-scroll,
html[data-mobile="1"] .mob-sheet-wrap .fig-r-scroll {
  padding-bottom: 24px !important;
}

/* Scrollable Bottom Floating Tool Dock (>= 48dp buttons, no cramped 20px chevrons) */
html[data-mobile="1"] .fig-floating-bar,
html[data-mobile="1"] .fig-tabbar-fixed.fig-floating-bar {
  position: fixed !important;
  left: 8px !important;
  right: 8px !important;
  bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
  transform: none !important;
  margin: 0 !important;
  width: auto !important;
  max-width: calc(100vw - 16px) !important;
  flex-wrap: nowrap !important;
  justify-content: flex-start !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  padding: 5px 8px 8px !important;
  gap: 4px !important;
  border-radius: 16px !important;
  z-index: 45 !important;
  scrollbar-width: thin !important;
  -webkit-overflow-scrolling: touch;
}

html[data-mobile="1"] .fig-floating-bar .tool-btn {
  min-width: 54px !important;
  width: auto !important;
  height: 52px !important;
  padding: 4px 7px !important;
  flex-direction: column !important;
  gap: 2px !important;
  flex: none !important;
  position: relative;
}

html[data-mobile="1"] .mob-tool-lbl {
  display: block;
  font-size: 9.5px;
  font-weight: 600;
  line-height: 1.05;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

html[data-mobile="1"] .fig-floating-bar .tool-btn.chev-btn {
  display: none !important;
}

html[data-mobile="1"] .fig-floating-bar .tool-btn.has-sub::after {
  content: '';
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-bottom: 5px solid currentColor;
  opacity: 0.55;
  pointer-events: none;
}

html[data-mobile="1"] .fig-floating-bar .fig-bar-sep {
  flex: none !important;
}

/* Contextual Strips, Debug Launcher, and Toasts */
html[data-mobile="1"] .vc-simp-strip {
  position: fixed !important;
  left: 10px !important;
  right: 10px !important;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  top: auto !important;
  transform: none !important;
  margin: 0 auto !important;
  width: auto !important;
  max-width: calc(100vw - 20px) !important;
  padding: 10px 14px !important;
  border-radius: 16px !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.32) !important;
  z-index: 9980 !important;
}

html[data-mobile="1"] .vc-simp-strip .vc-ibtn {
  min-width: 42px !important;
  min-height: 42px !important;
  border-radius: 10px !important;
}

html[data-mobile="1"] .vc-simp-strip .ved-pill {
  min-height: 36px !important;
  padding: 6px 10px !important;
  font-size: 11.5px !important;
}

html[data-mobile="1"] .vc-simp-strip .vc-simp-badge {
  font-size: 11px !important;
  padding: 4px 8px !important;
  border-radius: 8px !important;
}

html[data-mobile="1"] .ved-debug-pill {
  right: 8px !important;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px)) !important;
  z-index: 40 !important;
  padding: 6px 12px !important;
  font-size: 11px !important;
}

html[data-mobile="1"] .ved-toast {
  bottom: calc(134px + env(safe-area-inset-bottom, 0px)) !important;
  max-width: calc(100vw - 24px) !important;
  white-space: normal !important;
  text-align: center;
}

/* Mobile Floating Selection Bar & Gesture Coachmark */
html[data-mobile="1"] .mob-sel-bar {
  position: fixed;
  left: 50%;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 46;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  max-width: calc(100vw - 16px);
  overflow-x: auto;
  scrollbar-width: none;
  background: color-mix(in srgb, var(--card) 94%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  animation: mobSheetUp 0.16s ease both;
}

html[data-mobile="1"] .mob-sel-bar::-webkit-scrollbar {
  display: none;
}

html[data-mobile="1"] .mob-sel-btn {
  min-width: 56px;
  height: 44px;
  padding: 0 9px;
  border-radius: 11px;
  border: 0;
  background: transparent;
  color: var(--ink);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  flex: none;
}

html[data-mobile="1"] .mob-sel-btn:active {
  background: var(--sub);
}

html[data-mobile="1"] .mob-sel-btn.danger {
  color: #ef4444;
}

html[data-mobile="1"] .mob-gesture-hint {
  position: fixed;
  top: calc(58px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 44;
  max-width: calc(100vw - 24px);
  padding: 6px 10px 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--card) 92%, transparent);
  border: 1px solid var(--line);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
}

html[data-mobile="1"] .mob-gesture-hint > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

html[data-mobile="1"] .mob-hint-close {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 0;
  background: var(--sub);
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  cursor: pointer;
}

/* Mobile Context Menu -> Material 3 Action Sheet */
html[data-mobile="1"] .mob-ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 94;
  background: rgba(0, 0, 0, 0.38);
  animation: mobFadeIn 0.16s ease both;
}

html[data-mobile="1"] .ctx.mob-action-sheet {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  top: auto !important;
  width: 100% !important;
  max-width: 100vw !important;
  max-height: 78dvh !important;
  z-index: 95 !important;
  border-radius: 20px 20px 0 0 !important;
  padding: 0 0 calc(14px + env(safe-area-inset-bottom, 0px)) !important;
  display: flex;
  flex-direction: column;
  overflow: hidden !important;
  transform: none !important;
  animation: mobSheetUp 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

html[data-mobile="1"] .mob-ctx-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  flex: none;
}

html[data-mobile="1"] .mob-ctx-card {
  min-height: 54px;
  padding: 8px 4px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--sub);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

html[data-mobile="1"] .mob-ctx-card:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

html[data-mobile="1"] .mob-ctx-card.danger {
  color: #ef4444;
}

html[data-mobile="1"] .mob-ctx-list {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px 8px;
  -webkit-overflow-scrolling: touch;
}

html[data-mobile="1"] .ctx.mob-action-sheet .ctx-k {
  display: none !important;
}

/* Touch Sliders, Popovers, Context Menus */
html[data-mobile="1"] .sl {
  height: 36px !important;
}

html[data-mobile="1"] .sl-h {
  width: 24px !important;
  height: 24px !important;
  margin: -12px 0 0 -12px !important;
}

html[data-mobile="1"] .opt {
  min-height: 46px;
  padding: 10px 12px !important;
}

html[data-mobile="1"] .flt {
  max-width: calc(100vw - 16px) !important;
  max-height: 62dvh !important;
  overflow-y: auto !important;
  overscroll-behavior: contain;
}

/* Color Picker Mobile Bottom Sheet */
.cp-mob-header {
  display: none;
}

html[data-mobile="1"] .flt.cp {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  top: auto !important;
  width: 100% !important;
  max-width: 100vw !important;
  border-radius: 20px 20px 0 0 !important;
  z-index: 10050 !important;
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom, 0px)) !important;
  background: var(--card) !important;
  border: 1px solid var(--line) !important;
  border-bottom: 0 !important;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45) !important;
  max-height: 82dvh !important;
  overflow-y: auto !important;
  animation: mobSheetUp 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both !important;
}

html[data-mobile="1"] .cp-mob-header {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

html[data-mobile="1"] .cp-mob-handle {
  width: 38px;
  height: 4px;
  border-radius: 999px;
  background: var(--line);
}

html[data-mobile="1"] .cp-mob-title-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

html[data-mobile="1"] .cp-mob-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

html[data-mobile="1"] .cp-mob-close {
  min-width: 36px;
  min-height: 36px;
  border-radius: 999px;
  background: var(--sub);
  border: 1px solid var(--line);
  color: var(--mut);
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

html[data-mobile="1"] .cp .sv {
  height: 140px !important;
  border-radius: 12px !important;
}

html[data-mobile="1"] .cp .sv-h {
  width: 26px !important;
  height: 26px !important;
  border: 3px solid #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45) !important;
  margin-left: -13px !important;
  margin-top: -13px !important;
}

.cp-presets-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.cp-preset-chip {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  border-radius: 6px;
  border: 1px solid var(--line);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

html[data-mobile="1"] .cp-presets-grid {
  gap: 8px !important;
}

html[data-mobile="1"] .cp-preset-chip {
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  min-height: 34px !important;
  border-radius: 999px !important;
  border: 2px solid var(--line) !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.14) !important;
}

html[data-mobile="1"] .cp-act-bar {
  min-height: 44px;
}

html[data-mobile="1"] .cp-act-btn {
  min-height: 42px !important;
  padding: 8px 12px !important;
  font-size: 12px !important;
}

/* Mobile Text Edit Accessory Bar */
.mob-text-accessory-bar {
  display: none;
}

html[data-mobile="1"] .mob-text-accessory-bar {
  position: fixed !important;
  left: 12px !important;
  right: 12px !important;
  bottom: calc(max(var(--android-kb-height, 0px), 74px) + 10px) !important;
  z-index: 10050 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 8px 12px !important;
  background: var(--card) !important;
  border-radius: 14px !important;
  border: 1px solid var(--line) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28) !important;
  animation: mobSheetUp 0.18s cubic-bezier(0.2, 0.8, 0.2, 1) both !important;
}

html[data-mobile="1"] .mob-text-done-btn {
  min-height: 40px !important;
  padding: 0 18px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
}

/* Mobile Pen & Node Actions, Multi-Select */
.mob-pen-actions,
.mob-node-actions,
.mob-multisel-toggle {
  display: none;
}

html[data-mobile="1"] .mob-pen-actions,
html[data-mobile="1"] .mob-node-actions {
  position: fixed !important;
  left: 12px !important;
  right: 12px !important;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  z-index: 9980 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  padding: 8px 12px !important;
  background: var(--card) !important;
  border-radius: 16px !important;
  border: 1px solid var(--line) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28) !important;
  animation: mobSheetUp 0.18s cubic-bezier(0.2, 0.8, 0.2, 1) both !important;
}

html[data-mobile="1"] .mob-pen-btn,
html[data-mobile="1"] .mob-node-btn {
  flex: 1 1 auto;
  min-height: 42px !important;
  padding: 8px 12px !important;
  border-radius: 10px !important;
  border: 1px solid var(--line) !important;
  background: var(--sub) !important;
  color: var(--ink) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer;
}

html[data-mobile="1"] .mob-pen-btn.finish {
  background: var(--acc) !important;
  color: #ffffff !important;
  border-color: transparent !important;
}

html[data-mobile="1"] .mob-pen-btn.cancel,
html[data-mobile="1"] .mob-node-btn.danger {
  color: #ef4444 !important;
}

html[data-mobile="1"] .mob-multisel-toggle {
  position: fixed !important;
  right: 14px !important;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px)) !important;
  z-index: 9970 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 38px !important;
  padding: 6px 14px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  border-radius: 999px !important;
  border: 1px solid var(--line) !important;
  background: var(--card) !important;
  color: var(--ink) !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.16) !important;
  cursor: pointer;
}

html[data-mobile="1"] .mob-multisel-toggle.on {
  background: var(--acc) !important;
  color: #ffffff !important;
  border-color: transparent !important;
}

/* Mobile Layer Tree Ergonomics */
.mob-lay-drag-handle,
.mob-lay-more {
  display: none;
}

html[data-mobile="1"] .mob-lay-drag-handle {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 38px;
  font-size: 18px;
  color: var(--mut);
  user-select: none;
  touch-action: none;
  flex: none;
}

html[data-mobile="1"] .mob-lay-more {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 40px !important;
  min-height: 40px !important;
  border-radius: 8px !important;
  color: var(--mut);
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  flex: none;
  margin-left: auto;
}

html[data-mobile="1"] .fig-row {
  min-height: 48px !important;
  padding: 8px 10px !important;
  gap: 8px !important;
  align-items: center !important;
}

html[data-mobile="1"] .fig-eject {
  min-width: 40px !important;
  min-height: 40px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 8px !important;
  opacity: 1 !important;
}

html[data-mobile="1"] .ctx {
  max-width: calc(100vw - 16px) !important;
  max-height: 65dvh !important;
  overflow-y: auto !important;
}

html[data-mobile="1"] .ctx-i {
  min-height: 46px;
  padding: 10px 12px !important;
}

/* Modals -> Bottom Sheet Dialogs on Mobile */
html[data-mobile="1"] .ov {
  padding: 0 !important;
  align-items: flex-end !important;
}

html[data-mobile="1"] .hp {
  width: 100% !important;
  max-width: 100vw !important;
  max-height: 92dvh !important;
  border-radius: 20px 20px 0 0 !important;
  padding: 16px 14px calc(16px + env(safe-area-inset-bottom, 0px)) !important;
  border-bottom: 0 !important;
  overflow-x: hidden !important;
}

html[data-mobile="1"] .hp-g {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 14px !important;
}

html[data-mobile="1"] .stg-modal {
  padding: 16px 12px calc(16px + env(safe-area-inset-bottom, 0px)) !important;
}

html[data-mobile="1"] .stg-modal,
html[data-mobile="1"] .stg-modal * {
  white-space: normal !important;
}

html[data-mobile="1"] .stg-modal .seg {
  max-width: 100%;
  overflow-x: auto;
  flex-wrap: nowrap !important;
  scrollbar-width: none;
}

html[data-mobile="1"] .stg-modal .seg button {
  white-space: nowrap !important;
  min-height: 40px;
}

html[data-mobile="1"] .stg-row {
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 8px !important;
}

html[data-mobile="1"] .stg-ctrl {
  width: 100%;
  flex-wrap: wrap;
}

html[data-mobile="1"] [data-testid="ic-modal"],
html[data-mobile="1"] [data-testid="code-inspector-modal"] {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 92dvh !important;
  max-height: 92dvh !important;
  border-radius: 20px 20px 0 0 !important;
  padding: 14px 12px calc(14px + env(safe-area-inset-bottom, 0px)) !important;
}

html[data-mobile="1"] [data-testid="code-inspector-modal"] .flex.items-center.gap-1 {
  overflow-x: auto;
  max-width: 100%;
  scrollbar-width: none;
}

/* ---- Android Touch Landscape (e.g. 800x360) ---- */
html[data-mobile="1"][data-orientation="landscape"] .mob-editor-topbar {
  height: calc(48px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 10px 0;
}

html[data-mobile="1"][data-orientation="landscape"] .ved-fmid {
  top: calc(48px + env(safe-area-inset-top, 0px)) !important;
}

html[data-mobile="1"][data-orientation="landscape"] .mob-sheet-backdrop {
  top: calc(48px + env(safe-area-inset-top, 0px));
}

html[data-mobile="1"][data-orientation="landscape"] .mob-rail-sheet {
  top: calc(54px + env(safe-area-inset-top, 0px));
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  max-width: calc(100vw - 24px);
}

html[data-mobile="1"][data-orientation="landscape"] .mob-sheet-wrap {
  left: auto !important;
  right: 0 !important;
  top: calc(48px + env(safe-area-inset-top, 0px)) !important;
  bottom: 0 !important;
  width: min(360px, 52vw) !important;
  max-width: 52vw !important;
  height: auto !important;
  max-height: none !important;
  border-radius: 16px 0 0 0 !important;
  border-top: 0 !important;
  border-left: 1px solid var(--line) !important;
  box-shadow: -10px 0 32px rgba(0, 0, 0, 0.24);
  animation: mobSheetLeft 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

html[data-mobile="1"][data-orientation="landscape"] .mob-sheet-pill {
  display: none !important;
}

html[data-mobile="1"][data-orientation="landscape"] .fig-floating-bar,
html[data-mobile="1"][data-orientation="landscape"] .fig-tabbar-fixed.fig-floating-bar {
  left: 50% !important;
  right: auto !important;
  transform: translateX(-50%) !important;
  width: auto !important;
  max-width: calc(100vw - 24px) !important;
}

html[data-mobile="1"][data-orientation="landscape"] .ws-project-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
}

html[data-mobile="1"][data-orientation="landscape"] .ctx.mob-action-sheet {
  left: 0 !important;
  right: 0 !important;
  margin: 0 auto !important;
  width: min(520px, 84vw) !important;
}

@media (max-width: 480px) {
  html[data-mobile="1"] .ws-project-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  html[data-mobile="1"] .ws-home-badge,
  html[data-mobile="1"] .ws-storage-pill {
    display: none !important;
  }

  html[data-mobile="1"] .mob-proj-btn {
    max-width: 92px;
  }
}
`;

export function injectMobileStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MOBILE_STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = MOBILE_STYLE_ID;
  styleEl.textContent = MOBILE_CSS;
  document.head.appendChild(styleEl);
}

injectMobileStyles();
