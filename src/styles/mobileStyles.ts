/**
 * @file src/styles/mobileStyles.ts
 * @description Gaya CSS khusus Mode Mobile (<= 768px) yang disuntikkan secara terisolasi tanpa mengubah tata letak desktop (> 768px).
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

@keyframes mobFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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

@media (max-width: 768px) {
  html, body {
    height: var(--app-dvh, 100dvh);
    max-width: 100vw;
    overflow-x: hidden;
    overscroll-behavior: none;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  .app-ws.app-full {
    display: flex !important;
    flex-direction: column !important;
    height: var(--app-dvh, 100dvh) !important;
    max-width: 100vw !important;
    overflow: hidden !important;
  }

  .ws-fin {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto !important;
    padding: 0 !important;
    height: 100% !important;
    min-height: 0 !important;
  }

  .ws-body {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto !important;
    overflow: hidden !important;
    min-height: 0 !important;
    height: 100% !important;
  }

  .ws-fill {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  /* ---- WorkspaceHome Mobile (<= 768px) ---- */
  .ws-home-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .ws-home-header {
    padding: 10px 12px !important;
    gap: 8px !important;
    flex-wrap: wrap !important;
    align-items: center !important;
  }

  .ws-home-brand {
    gap: 8px !important;
  }

  .ws-home-header-actions {
    width: 100%;
    justify-content: flex-start !important;
    gap: 6px !important;
    flex-wrap: wrap !important;
  }

  .ws-hdr-btn {
    padding: 7px 11px !important;
    font-size: 11.5px !important;
    min-height: 36px;
  }

  .ws-hdr-icon-btn {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    padding: 0 !important;
  }

  .ws-session-ram-banner,
  .ws-recovery-banner {
    margin: 8px 12px 0 !important;
    padding: 8px 12px !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .ws-home-body {
    flex-direction: column !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  .ws-home-nav {
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

  .ws-home-nav::-webkit-scrollbar {
    display: none;
  }

  .ws-nav-list {
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    width: max-content;
  }

  .ws-nav-item {
    width: auto !important;
    flex: none !important;
    padding: 6px 12px !important;
    min-height: 36px;
    border-radius: 999px !important;
    gap: 7px !important;
    white-space: nowrap;
  }

  .ws-nav-ico {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px !important;
  }

  .ws-nav-sub,
  .ws-nav-storage-card {
    display: none !important;
  }

  .ws-home-main {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    padding: 12px !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch;
  }

  .ws-home-toolbar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 10px !important;
    margin-bottom: 14px !important;
  }

  .ws-toolbar-controls {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
    width: 100%;
  }

  .ws-search-box {
    width: 100% !important;
    min-width: 0 !important;
  }

  .ws-sort-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }

  .ws-sort-wrap > div {
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }

  .ws-project-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    padding-bottom: 24px !important;
  }

  .ws-card-fav-btn {
    opacity: 1 !important;
    width: 34px !important;
    height: 34px !important;
  }

  .ws-card-menu-btn {
    width: 34px !important;
    height: 34px !important;
  }

  .ws-card-thumb-overlay {
    display: none !important;
  }

  /* ---- VectorEditor Mobile Studio Layout (<= 768px) ---- */
  .ved-root.ved-full {
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  .fig-workspace {
    position: relative !important;
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  .ved-fmid {
    position: absolute !important;
    top: calc(48px + env(safe-area-inset-top, 0px)) !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    z-index: 1 !important;
  }

  .ved-canvas {
    width: 100% !important;
    height: 100% !important;
    border: 0 !important;
    border-radius: 0 !important;
    touch-action: none !important;
  }

  .fig-sidebar-edge-toggle,
  .ved-rz {
    display: none !important;
  }

  /* Mobile Top Bar */
  .mob-editor-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 56;
    height: calc(48px + env(safe-area-inset-top, 0px));
    padding: env(safe-area-inset-top, 0px) 8px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    background: color-mix(in srgb, var(--card) 92%, transparent);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--line);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    user-select: none;
  }

  .mob-top-grp {
    display: flex;
    align-items: center;
    gap: 3px;
    min-width: 0;
  }

  .mob-top-btn {
    position: relative;
    min-width: 34px;
    height: 34px;
    padding: 0 7px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    flex: none;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .mob-top-btn:active:not(:disabled) {
    transform: scale(0.94);
  }

  .mob-top-btn.on {
    background: color-mix(in srgb, var(--acc) 16%, var(--sub));
    color: var(--acc);
    border-color: color-mix(in srgb, var(--acc) 35%, transparent);
  }

  .mob-top-btn:disabled {
    opacity: 0.36;
    cursor: not-allowed;
  }

  .mob-proj-btn {
    min-width: 0;
    max-width: 116px;
    height: 32px;
    padding: 0 8px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--sub);
    border: 1px solid var(--line);
    color: var(--ink);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
  }

  .mob-save-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex: none;
    background: #10b981;
  }

  .mob-save-dot.st-dirty,
  .mob-save-dot.st-saving {
    background: #f59e0b;
  }

  .mob-save-dot.st-error {
    background: #ef4444;
  }

  .mob-zoom-pill {
    min-width: 42px;
    height: 30px;
    padding: 0 7px;
    border-radius: 8px;
    background: var(--sub);
    border: 1px solid var(--line);
    color: var(--ink);
    font-size: 10.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: none;
  }

  .mob-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
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
  .mob-rail-sheet {
    position: fixed;
    top: calc(54px + env(safe-area-inset-top, 0px));
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

  .mob-rail-sheet::-webkit-scrollbar {
    display: none;
  }

  .mob-rail-sheet .fig-nav-rail {
    width: max-content !important;
    height: auto !important;
    border-right: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    background: transparent !important;
    flex-direction: row !important;
    overflow: visible !important;
  }

  .mob-rail-sheet .fig-nav-dock {
    flex-direction: row !important;
    align-items: center !important;
    gap: 6px !important;
  }

  .mob-rail-sheet .fig-rail-grp {
    flex-direction: row !important;
    border-radius: 10px !important;
    padding: 2px !important;
  }

  .mob-rail-sheet .fig-nav-dock .dk-b {
    width: 36px !important;
    height: 36px !important;
  }

  .mob-rail-sheet .fig-nav-dock .dk-b.chev-b {
    width: 22px !important;
    height: 36px !important;
  }

  /* Mobile Bottom Sheets (Layers & Inspector) */
  .mob-sheet-backdrop {
    position: fixed;
    top: calc(48px + env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 54;
    background: rgba(0, 0, 0, 0.36);
    animation: mobFadeIn 0.18s ease both;
  }

  .mob-sheet-wrap {
    position: fixed !important;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 55;
    width: 100% !important;
    max-width: 100vw !important;
    height: min(70dvh, 580px);
    max-height: min(76dvh, calc(var(--app-dvh, 100dvh) - 48px - env(safe-area-inset-top, 0px)));
    display: flex;
    flex-direction: column;
    background: var(--card);
    border-top: 1px solid var(--line);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -14px 42px rgba(0, 0, 0, 0.28);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    overflow: hidden;
    animation: mobSheetUp 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .mob-sheet-header {
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 8px;
    border-bottom: 1px solid var(--line);
    background: var(--card);
  }

  .mob-sheet-pill {
    position: absolute;
    left: 50%;
    top: 6px;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--line);
  }

  .mob-sheet-wrap .fig-left-sidebar,
  .mob-sheet-wrap .fig-right-sidebar {
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

  .mob-sheet-wrap .fig-left-sidebar .fig-doc-hdr {
    display: none !important;
  }

  .mob-sheet-wrap .fig-doc-hdr,
  .mob-sheet-wrap .fig-sec-hdr,
  .mob-sheet-wrap .fig-layers-scroll {
    margin-right: 0 !important;
  }

  .mob-sheet-wrap .fig-layers-scroll,
  .mob-sheet-wrap .fig-r-scroll {
    padding-bottom: 24px !important;
  }

  /* Scrollable Bottom Floating Tool Dock */
  .fig-floating-bar,
  .fig-tabbar-fixed.fig-floating-bar {
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
    padding: 5px 7px 8px !important;
    gap: 3px !important;
    border-radius: 16px !important;
    z-index: 45 !important;
    scrollbar-width: thin !important;
    -webkit-overflow-scrolling: touch;
  }

  .fig-floating-bar .tool-btn {
    min-width: 38px !important;
    width: 38px !important;
    height: 38px !important;
    flex: none !important;
  }

  .fig-floating-bar .tool-btn.chev-btn {
    min-width: 20px !important;
    width: 20px !important;
    height: 38px !important;
    padding: 0 !important;
  }

  .fig-floating-bar .fig-bar-sep {
    flex: none !important;
  }

  /* Contextual Strips, Debug Launcher, and Toasts */
  .vc-simp-strip {
    left: 8px !important;
    right: 8px !important;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    top: auto !important;
    transform: none !important;
    margin: 0 auto !important;
    max-width: calc(100vw - 16px) !important;
    flex-wrap: wrap;
    justify-content: center;
  }

  .ved-debug-pill {
    right: 8px !important;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    z-index: 40 !important;
    padding: 4px 10px !important;
    font-size: 10.5px !important;
  }

  .ved-toast {
    bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
    max-width: calc(100vw - 24px) !important;
    white-space: normal !important;
    text-align: center;
  }

  /* Touch Sliders, Popovers, Context Menus */
  .sl {
    height: 30px !important;
  }

  .sl-h {
    width: 20px !important;
    height: 20px !important;
    margin: -10px 0 0 -10px !important;
  }

  .opt {
    min-height: 40px;
    padding: 8px 10px !important;
  }

  .flt {
    max-width: calc(100vw - 16px) !important;
    max-height: 62dvh !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }

  .ctx {
    max-width: calc(100vw - 16px) !important;
    max-height: 65dvh !important;
    overflow-y: auto !important;
  }

  .ctx-i {
    min-height: 36px;
    padding: 7px 10px !important;
  }

  /* Modals -> Bottom Sheet Dialogs on Mobile */
  .ov {
    padding: 0 !important;
    align-items: flex-end !important;
  }

  .hp {
    width: 100% !important;
    max-width: 100vw !important;
    max-height: 92dvh !important;
    border-radius: 20px 20px 0 0 !important;
    padding: 16px 14px calc(16px + env(safe-area-inset-bottom, 0px)) !important;
    border-bottom: 0 !important;
    overflow-x: hidden !important;
  }

  .hp-g {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 14px !important;
  }

  .stg-modal {
    padding: 16px 12px calc(16px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .stg-modal,
  .stg-modal * {
    white-space: normal !important;
  }

  .stg-modal .seg {
    max-width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap !important;
    scrollbar-width: none;
  }

  .stg-modal .seg button {
    white-space: nowrap !important;
  }

  .stg-row {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
  }

  .stg-ctrl {
    width: 100%;
    flex-wrap: wrap;
  }

  [data-testid="ic-modal"],
  [data-testid="code-inspector-modal"] {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 92dvh !important;
    max-height: 92dvh !important;
    border-radius: 20px 20px 0 0 !important;
    padding: 14px 12px calc(14px + env(safe-area-inset-bottom, 0px)) !important;
  }

  [data-testid="code-inspector-modal"] .flex.items-center.gap-1 {
    overflow-x: auto;
    max-width: 100%;
    scrollbar-width: none;
  }
}

@media (max-width: 480px) {
  .ws-project-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ws-home-badge,
  .ws-storage-pill {
    display: none !important;
  }

  .mob-proj-btn {
    max-width: 84px;
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
