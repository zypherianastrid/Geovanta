/**
 * @file src/components/editor/devmode/DevModeInspector.tsx
 * @description Panel Inspeksi Kanan Figma Dev Mode (3 Tab: Inspect | Tokens | Assets):
 * Menggunakan sistem desain yang 100% konsisten dengan EditorRightInspector (Normal Mode),
 * mengikuti accent color `var(--acc)` dari Pengaturan, mendukung scroll penuh, dan Live SVG Code Editing.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  applyEditedSvgToDoc,
  computeContrastRatio,
  DevCodeLang,
  DevColorFormat,
  DevNodeType,
  DevTokenFormat,
  DevUnit,
  extractDesignTokens,
  extractDevNodeSpec,
  extractPageOverview,
  formatDevColor,
  formatUnit,
  generateDevCode,
  generateTokensCode,
  renderObjectMiniSvg,
} from '../../../engine/devModeCodeGen.ts';
import { serializeDoc } from '../../../engine/svgDocumentSerializer.tsx';
import { Ico } from '../../ui/IconGlyphs.tsx';
import { OverlayScrollbar } from '../../ui/OverlayScrollbar.tsx';
import { Slider } from '../../ui/Slider.tsx';
import { CustomTextBox } from '../../ui/CustomTextBox.tsx';
import { Select } from '../../ui/SelectDropdown.tsx';
import { zFmt, vzToSl, vslToZ } from '../../../utils/zoomAndFormatHelpers.tsx';
import { DevModeBoxModel } from './DevModeBoxModel.tsx';
import { DevModeCodeBlock } from './DevModeCodeBlock.tsx';

export interface DevModeInspectorProps {
  lang?: string;
  doc: any;
  selObjs: any[];
  primary: any;
  setSel?: (next: { objs: Set<string>; nodes: Set<string> }) => void;
  say?: (msg: string) => void;
  zoom: number;
  zoomBy: (factor: number) => void;
  setZ: (z: number, cx?: any, cy?: any, isLive?: boolean) => void;
  fitView: () => void;
  zoomPctRef?: React.RefObject<HTMLSpanElement | null>;
  displayZoomRef?: React.MutableRefObject<number>;
  zoomSliderDomRef?: React.RefObject<any>;
  devUnit: DevUnit;
  setDevUnit: (u: DevUnit) => void;
  devColorFormat: DevColorFormat;
  setDevColorFormat: (f: DevColorFormat) => void;
  devCodeLang: DevCodeLang;
  setDevCodeLang: (l: DevCodeLang) => void;
  onExitDevMode: () => void;
  onUpdateDoc?: (nextDoc: any, nextSelIds?: string[]) => void;
  downloadSvg?: (fmt?: any, scale?: number) => any;
  exportSvg?: () => any;
}

type DevInspectorTab = 'inspect' | 'tokens' | 'assets';

function computeAspectRatio(w: number, h: number): string {
  if (!w || !h || w <= 0 || h <= 0) return '—';
  const rw = Math.round(w);
  const rh = Math.round(h);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(rw, rh);
  const aw = rw / d;
  const ah = rh / d;
  if (aw > 32 || ah > 32) {
    return `${(w / h).toFixed(2)}:1`;
  }
  return `${aw}:${ah}`;
}

export const DevModeInspector: React.FC<DevModeInspectorProps> = ({
  lang = 'id',
  doc,
  selObjs,
  primary,
  setSel,
  say,
  zoom,
  zoomBy,
  setZ,
  fitView,
  zoomPctRef,
  displayZoomRef,
  zoomSliderDomRef,
  devUnit,
  setDevUnit,
  devColorFormat,
  setDevColorFormat,
  devCodeLang,
  setDevCodeLang,
  onExitDevMode,
  onUpdateDoc,
  downloadSvg,
  exportSvg,
}) => {
  const isEn = lang === 'en';
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<DevInspectorTab>('inspect');
  const [rootFontSize, setRootFontSize] = useState<number>(16);
  const [svgMinified, setSvgMinified] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportScale, setExportScale] = useState<number>(2);
  const [tokenFormat, setTokenFormat] = useState<DevTokenFormat>('css-vars');
  const [assetsSearch, setAssetsSearch] = useState<string>('');
  const [assetsFilter, setAssetsFilter] = useState<'ALL' | DevNodeType>('ALL');
  const [readyIds, setReadyIds] = useState<Record<string, boolean>>({});
  const [devNotes, setDevNotes] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const targetObj = primary || (selObjs && selObjs[0]) || null;

  const toggleSec = (k: string) => setCollapsed(prev => ({ ...prev, [k]: !prev[k] }));

  const copyValue = (text: string, id: string, feedbackLabel?: string) => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1100);
    if (say && feedbackLabel) {
      say(`${isEn ? 'Copied' : 'Disalin'}: ${feedbackLabel}`);
    }
  };

  const spec = useMemo(() => {
    if (!targetObj) return null;
    return extractDevNodeSpec(targetObj, doc);
  }, [targetObj, doc]);

  const generatedCode = useMemo(() => {
    if (!spec || !targetObj) return '';
    return generateDevCode(spec, targetObj, doc, {
      lang: devCodeLang,
      unit: devUnit,
      rootFontSize,
      colorFormat: devColorFormat,
      svgMinified,
    });
  }, [spec, targetObj, doc, devCodeLang, devUnit, rootFontSize, devColorFormat, svgMinified]);

  const overview = useMemo(() => {
    if (targetObj || activeTab !== 'inspect') return null;
    return extractPageOverview(doc);
  }, [targetObj, activeTab, doc]);

  const tokens = useMemo(() => {
    if (activeTab !== 'tokens') return null;
    return extractDesignTokens(doc, devUnit, rootFontSize, devColorFormat);
  }, [activeTab, doc, devUnit, rootFontSize, devColorFormat]);

  const tokensCode = useMemo(() => {
    if (!tokens) return '';
    return generateTokensCode(tokens, tokenFormat);
  }, [tokens, tokenFormat]);

  const assetItems = useMemo(() => {
    if (activeTab !== 'assets') return [];
    const objs = Array.isArray(doc?.objects) ? doc.objects.filter((o: any) => !o.hidden) : [];
    const q = assetsSearch.trim().toLowerCase();
    return objs
      .map((o: any) => {
        const s = extractDevNodeSpec(o, doc);
        return {
          obj: o,
          spec: s,
          miniSvg: renderObjectMiniSvg(o, doc),
        };
      })
      .filter(item => {
        if (assetsFilter !== 'ALL' && item.spec.nodeType !== assetsFilter) return false;
        if (q && !item.spec.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice(0, 50);
  }, [activeTab, doc, assetsSearch, assetsFilter]);

  const handleApplySvgCode = (nextSvgCode: string) => {
    const selIds = (selObjs || []).map((o: any) => o.id);
    const res = applyEditedSvgToDoc(nextSvgCode, doc, selIds);
    if (res.valid && res.nextDoc && onUpdateDoc) {
      onUpdateDoc(res.nextDoc, res.nextSelIds);
    }
    return { valid: res.valid, error: res.error };
  };

  const handleCopyAsSvg = (objOverride?: any) => {
    try {
      const target = objOverride || targetObj;
      const svgStr = target
        ? serializeDoc({ ...doc, objects: !objOverride && selObjs && selObjs.length > 0 ? selObjs : [target] })
        : exportSvg
          ? exportSvg()
          : serializeDoc(doc);
      copyValue(svgStr, objOverride ? `asset-svg-${objOverride.id}` : 'copy-as-svg', 'SVG');
    } catch {
      // ignore
    }
  };

  const handleDownloadTokens = () => {
    if (!tokensCode || typeof document === 'undefined') return;
    const ext = tokenFormat === 'css-vars' ? 'css' : tokenFormat === 'tailwind-config' ? 'js' : 'json';
    const blob = new Blob([tokensCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-tokens.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fmtU = (px: number) => formatUnit(px, devUnit, rootFontSize);

  const scaleOptions = useMemo(
    () => [
      [1, '1x'],
      [2, '2x'],
      [3, '3x'],
      [4, '4x'],
    ],
    []
  );

  const contrastInfo = useMemo(() => {
    if (!spec) return null;
    const fg = spec.typography?.color || spec.fills[0]?.color;
    if (!fg || fg === 'none') return null;
    const bg = doc?.bg && doc.bg !== 'none' ? doc.bg : '#FFFFFF';
    return computeContrastRatio(fg, bg);
  }, [spec, doc?.bg]);

  return (
    <aside className="fig-right-sidebar order-3 lg:order-none" data-testid="dev-mode-inspector">
      <style>{`
  .fig-right-sidebar .fig-r-scroll-wrap { flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column; overflow: hidden; }
  .fig-right-sidebar .fig-r-scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; scroll-padding-block: 10px; contain: layout style; will-change: scroll-position; overflow-anchor: none; padding-right: 4px; }
  .fig-right-sidebar .fig-r-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
  .fig-right-sidebar .gv-ov-sb-track { position: absolute; top: 2px; bottom: 2px; right: 1px; width: 10px; z-index: 25; border-radius: 999px; background: transparent; cursor: var(--cur-default) !important; user-select: none; touch-action: none; transition: opacity .16s ease; }
  .fig-right-sidebar .gv-ov-sb-thumb { position: absolute; top: 0; left: 2px; right: 2px; min-height: 28px; border-radius: 999px; background: color-mix(in srgb, var(--mut) 32%, transparent); cursor: var(--cur-pointer) !important; transition: background-color .16s ease; will-change: transform; }
  .fig-right-sidebar .gv-ov-sb-thumb:hover, .fig-right-sidebar .gv-ov-sb-thumb.dragging { background: color-mix(in srgb, var(--acc) 65%, var(--mut)); }
  .fig-right-sidebar .gv-ov-sb-track.dragging, .fig-right-sidebar .gv-ov-sb-thumb.dragging { cursor: var(--cur-grabbing) !important; }
  .fig-right-sidebar .fig-isec { contain: layout style; }
  .fig-right-sidebar .fig-ibtn, .fig-right-sidebar .ved-pill, .fig-right-sidebar .fig-aln-bar button, .fig-right-sidebar .seg button, .fig-right-sidebar .gch button, .fig-right-sidebar .opt, .fig-right-sidebar [role="switch"] { transition: background-color .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease, transform .16s ease; }
  .fig-right-sidebar .fig-ibtn:hover:not(:disabled), .fig-right-sidebar .ved-pill:hover:not(:disabled), .fig-right-sidebar .fig-aln-bar button:hover:not(:disabled), .fig-right-sidebar .seg button:hover:not(:disabled), .fig-right-sidebar .gch button:hover:not(:disabled), .fig-right-sidebar .opt:hover, .fig-right-sidebar [role="switch"]:hover:not(:disabled) { background-color: color-mix(in srgb, var(--acc) 10%, var(--card)); border-color: color-mix(in srgb, var(--acc) 28%, var(--line)); color: var(--ink); }
  .fig-right-sidebar .fig-input { transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease; caret-color: var(--acc); }
  .fig-right-sidebar .fig-input:focus { border-color: var(--acc) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 22%, transparent) !important; background: color-mix(in srgb, var(--acc) 5%, var(--sub)) !important; outline: none; }
  .fig-right-sidebar button:disabled { cursor: not-allowed; }
  .fig-right-sidebar .ved-pill:not(.flex-col),
  .fig-right-sidebar .btn:not(.flex-col),
  .fig-right-sidebar .fig-cta-btn:not(.flex-col),
  .fig-right-sidebar .seg button:not(.flex-col) {
    align-items: center !important;
  }
`}</style>

      {/* Top Bar: Konsisten dengan Normal Mode (.fig-r-topbar) */}
      <div className="fig-r-topbar space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className="ved-pill on text-[11px] inline-flex items-center gap-1.5 px-2 py-0.5"
          >
            <Ico n="code" size={12} />
            <span>Dev Mode</span>
          </span>
          <button
            type="button"
            data-testid="dev-mode-exit-btn"
            onClick={onExitDevMode}
            className="ved-pill text-[11px] px-2 py-0.5 cursor-pointer"
            title={isEn ? 'Exit Dev Mode (Shift+D)' : 'Keluar Dev Mode (Shift+D)'}
          >
            {isEn ? 'Exit' : 'Keluar'} <span className="font-mono mut ml-1 text-[10px]">Shift+D</span>
          </button>
        </div>

        {/* 3 Dev Mode Tabs menggunakan kelas .seg konsisten dengan Normal Mode */}
        <div role="tablist" className="seg w-full">
          {([
            ['inspect', isEn ? 'Inspect' : 'Inspeksi'],
            ['tokens', 'Tokens'],
            ['assets', isEn ? 'Assets' : 'Aset'],
          ] as Array<[DevInspectorTab, string]>).map(([tid, label]) => (
            <button
              key={tid}
              type="button"
              role="tab"
              aria-selected={activeTab === tid}
              data-testid={`dev-tab-${tid}`}
              className={activeTab === tid ? 'on' : ''}
              onClick={() => setActiveTab(tid)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Zoom controls identik dengan Normal Mode */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider mut">
            {isEn ? 'Inspect & SVG Edit' : 'Inspeksi & Edit SVG'}
          </span>
          <div className="flex items-center gap-1 min-w-0">
            <button type="button" className="fig-ibtn" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom Out">
              <Ico n="zoomOut" size={14} />
            </button>
            <span
              ref={zoomPctRef as any}
              className="text-[11px] font-semibold tabular-nums text-center"
              style={{ minWidth: 52, display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}
            >
              {zFmt(displayZoomRef?.current || zoom)}
            </span>
            <button type="button" className="fig-ibtn" onClick={() => zoomBy(1.25)} aria-label="Zoom In">
              <Ico n="zoomIn" size={14} />
            </button>
          </div>
        </div>

        <Slider
          domRef={zoomSliderDomRef}
          min={0}
          max={1000}
          step={1}
          value={vzToSl(displayZoomRef?.current || zoom)}
          on={(v: number, meta?: any) => setZ(vslToZ(v), null, null, meta?.isLive !== false)}
          label="Zoom"
        />

        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            className="ved-pill text-[11px] flex-1 justify-center"
            style={{ padding: '5px 10px' }}
            onClick={fitView}
          >
            Fit
          </button>
        </div>

        {/* Unit, rem base (CustomTextBox), & Color Format */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
          <div className="flex items-center gap-1">
            {(['px', 'rem', 'pt', 'dp'] as DevUnit[]).map(u => (
              <button
                key={u}
                type="button"
                data-testid={`dev-unit-${u}`}
                onClick={() => setDevUnit(u)}
                className={'ved-pill text-[10px] font-mono px-1.5 py-0.5' + (devUnit === u ? ' on' : '')}
              >
                {u}
              </button>
            ))}
          </div>

          {devUnit === 'rem' && (
            <div
              className="fld px-1.5 py-0.5 flex items-center gap-1 w-16"
              title={isEn ? 'Root font-size for rem (px)' : 'Base font-size rem (px)'}
              data-testid="dev-rem-base"
            >
              <span className="text-[9px] font-mono mut">1rem=</span>
              <CustomTextBox
                value={String(rootFontSize)}
                ariaLabel="Root font size px"
                filterRe={/[^0-9]/g}
                maxLen={3}
                onCommit={raw => {
                  const n = parseInt(raw, 10);
                  if (Number.isFinite(n) && n >= 4 && n <= 128) setRootFontSize(n);
                }}
                onBump={delta => setRootFontSize(prev => Math.max(4, Math.min(128, prev + delta)))}
              />
            </div>
          )}

          <div className="flex items-center gap-1">
            {(['hex', 'rgba', 'hsl'] as DevColorFormat[]).map(cf => (
              <button
                key={cf}
                type="button"
                data-testid={`dev-color-fmt-${cf}`}
                onClick={() => setDevColorFormat(cf)}
                className={'ved-pill text-[10px] font-mono uppercase px-1.5 py-0.5' + (devColorFormat === cf ? ' on' : '')}
              >
                {cf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Body (.fig-r-scroll-wrap > .fig-r-scroll > .fig-isec) */}
      <div className="fig-r-scroll-wrap">
        <div className="fig-r-scroll" ref={scrollRef}>
          {activeTab === 'tokens' && tokens && (
            <div data-testid="dev-mode-tokens-panel" className="fig-isec space-y-2.5">
              <div className="fig-isec-title">
                <span>Design Tokens</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="dev-download-tokens"
                    onClick={handleDownloadTokens}
                    className="fig-ibtn"
                    title={isEn ? 'Download tokens' : 'Unduh tokens'}
                  >
                    <Ico n="download" size={12} />
                  </button>
                  <button
                    type="button"
                    data-testid="dev-copy-tokens"
                    onClick={() => copyValue(tokensCode, 'tokens', 'Tokens')}
                    className={'ved-pill text-[10px] px-2 py-0.5' + (copiedId === 'tokens' ? ' on' : '')}
                  >
                    {copiedId === 'tokens' ? (isEn ? 'Copied!' : 'Disalin!') : (isEn ? 'Copy' : 'Salin')}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {([
                  ['css-vars', 'CSS Vars'],
                  ['tailwind-config', 'Tailwind'],
                  ['json-tokens', 'JSON'],
                ] as Array<[DevTokenFormat, string]>).map(([fid, lbl]) => (
                  <button
                    key={fid}
                    type="button"
                    data-testid={`dev-token-fmt-${fid}`}
                    onClick={() => setTokenFormat(fid)}
                    className={'ved-pill text-[10px] flex-1 justify-center py-1' + (tokenFormat === fid ? ' on' : '')}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {tokens.colors.length > 0 && (
                <div>
                  <div className="fig-sub-lbl">Color Tokens ({tokens.colors.length})</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {tokens.colors.slice(0, 12).map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => copyValue(c.value, `tok-${c.name}`, c.name)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-[10px] font-mono cursor-pointer text-left"
                      >
                        <span className="w-3 h-3 rounded-sm border border-black/20 shrink-0" style={{ background: c.hex }} />
                        <span className="truncate">{copiedId === `tok-${c.name}` ? '✓' : `--${c.name}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-[var(--line)] bg-[var(--sub)] p-2 max-h-72 overflow-auto font-mono text-[11px] leading-[1.45]">
                <pre className="m-0 whitespace-pre">
                  <code>{tokensCode}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div data-testid="dev-mode-assets-panel" className="fig-isec space-y-2.5">
              <div className="fig-isec-title">
                <span>{isEn ? 'Assets & Layers' : 'Aset & Layer'}</span>
                <span className="text-[10px] font-mono mut">{assetItems.length}</span>
              </div>

              <div className="fld px-2 py-1 flex items-center gap-1.5" data-testid="dev-assets-search">
                <Ico n="search" size={12} />
                <CustomTextBox
                  value={assetsSearch}
                  placeholder={isEn ? 'Search layers & assets...' : 'Cari layer & aset...'}
                  ariaLabel={isEn ? 'Search assets' : 'Cari aset'}
                  onChange={setAssetsSearch}
                  onCommit={setAssetsSearch}
                  selectOnFocus={false}
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {(['ALL', 'FRAME', 'VECTOR', 'TEXT', 'IMAGE'] as const).map(ft => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setAssetsFilter(ft)}
                    className={'ved-pill text-[10px] font-mono px-2 py-0.5' + (assetsFilter === ft ? ' on' : '')}
                  >
                    {ft}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {assetItems.length === 0 ? (
                  <div className="p-4 text-center text-[11px] mut rounded-lg border border-dashed border-[var(--line)]">
                    {isEn ? 'No matching assets' : 'Tidak ada aset cocok'}
                  </div>
                ) : (
                  assetItems.map(item => (
                    <div
                      key={item.spec.id}
                      data-testid={`dev-asset-card-${item.spec.id}`}
                      className="rounded-lg border border-[var(--line)] bg-[var(--sub)] p-2 flex items-center gap-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => setSel && setSel({ objs: new Set([item.spec.id]), nodes: new Set() })}
                        className="w-11 h-11 rounded bg-[var(--card)] border border-[var(--line)] shrink-0 p-1 flex items-center justify-center overflow-hidden cursor-pointer"
                        title={isEn ? 'Select on canvas' : 'Pilih di kanvas'}
                        dangerouslySetInnerHTML={{ __html: item.miniSvg }}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setSel && setSel({ objs: new Set([item.spec.id]), nodes: new Set() })}
                          className="text-[11px] font-semibold truncate block max-w-full text-left cursor-pointer"
                        >
                          {item.spec.name}
                        </button>
                        <div className="text-[10px] font-mono mut">
                          {item.spec.nodeType} · {fmtU(item.spec.boxModel.width)} × {fmtU(item.spec.boxModel.height)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAsSvg(item.obj)}
                        className="ved-pill text-[10px] px-2 py-1 shrink-0 cursor-pointer"
                        title="Copy SVG"
                      >
                        {copiedId === `asset-svg-${item.obj.id}` ? '✓' : 'SVG'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'inspect' && (spec && targetObj ? (
            <>
              {/* Identity + Ready for Dev */}
              <div className="fig-isec space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                        style={{
                          background: 'color-mix(in srgb, var(--acc) 16%, transparent)',
                          color: 'var(--acc)',
                        }}
                      >
                        {spec.nodeType}
                      </span>
                      {selObjs.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--sub)] mut">
                          +{selObjs.length - 1}
                        </span>
                      )}
                      <button
                        type="button"
                        data-testid="dev-ready-toggle"
                        onClick={() => setReadyIds(prev => ({ ...prev, [spec.id]: !prev[spec.id] }))}
                        className={'ved-pill text-[10px] px-2 py-0.5 inline-flex items-center gap-1' + (readyIds[spec.id] ? ' on' : '')}
                      >
                        <Ico n="check" size={9} />
                        <span>{readyIds[spec.id] ? 'Ready for Dev' : 'Mark Ready'}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyValue(spec.name, 'node-name', spec.name)}
                      className="mt-1.5 text-xs font-semibold text-left truncate max-w-[180px] cursor-pointer block"
                      title={isEn ? 'Click to copy layer name' : 'Klik untuk salin nama layer'}
                    >
                      {copiedId === 'node-name' ? (isEn ? 'Copied!' : 'Disalin!') : spec.name}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAsSvg()}
                    data-testid="dev-copy-svg"
                    className={'ved-pill text-[10px] px-2 py-1 inline-flex items-center gap-1 shrink-0' + (copiedId === 'copy-as-svg' ? ' on' : '')}
                  >
                    <Ico n={copiedId === 'copy-as-svg' ? 'check' : 'copy'} size={11} />
                    <span>SVG</span>
                  </button>
                </div>

                {/* Box Model */}
                <DevModeBoxModel
                  boxModel={spec.boxModel}
                  unit={devUnit}
                  rootFontSize={rootFontSize}
                  lang={lang}
                  onCopy={(val, lbl) => say?.(`${lbl}: ${val}`)}
                />
              </div>

              {/* Layout Properties */}
              <div className="fig-isec">
                <button
                  type="button"
                  onClick={() => toggleSec('layout')}
                  className="fig-isec-title w-full cursor-pointer"
                >
                  <span>{isEn ? 'Layout & Properties' : 'Layout & Properti'}</span>
                  <span className="font-mono text-[11px] mut">{collapsed.layout ? '+' : '−'}</span>
                </button>
                {!collapsed.layout && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                      {[
                        ['X', fmtU(spec.boxModel.x), 'x'],
                        ['Y', fmtU(spec.boxModel.y), 'y'],
                        ['W', fmtU(spec.boxModel.width), 'w'],
                        ['H', fmtU(spec.boxModel.height), 'h'],
                        ['Ratio', computeAspectRatio(spec.boxModel.width, spec.boxModel.height), 'ratio'],
                        ['Rot', `${spec.rotation}°`, 'rot'],
                        ['Opacity', `${Math.round(spec.opacity * 100)}%`, 'op'],
                        [
                          'Radius',
                          Array.isArray(spec.cornerRadius)
                            ? spec.cornerRadius.map(r => fmtU(r)).join(' ')
                            : fmtU(spec.cornerRadius),
                          'rad',
                        ],
                      ].map(([k, val, id]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => copyValue(String(val), `prop-${id}`, String(val))}
                          className="flex items-center justify-between px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-left cursor-pointer"
                        >
                          <span className="mut text-[10px]">{k}</span>
                          <span className="truncate font-medium">
                            {copiedId === `prop-${id}` ? '✓' : val}
                          </span>
                        </button>
                      ))}
                    </div>
                    {spec.autoLayout && (
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        <span className="ved-pill on px-1.5 py-0.5">
                          flex-{spec.autoLayout.direction}
                        </span>
                        <span className="ved-pill px-1.5 py-0.5">
                          gap: {fmtU(spec.autoLayout.gap)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Typography */}
              {spec.typography && (
                <div data-testid="dev-mode-typography" className="fig-isec space-y-2">
                  <div className="fig-isec-title">
                    <span>{isEn ? 'Typography' : 'Tipografi'}</span>
                    <button
                      type="button"
                      data-testid="dev-copy-text"
                      onClick={() => copyValue(spec.typography!.content, 'copy-text', 'Text')}
                      className={'ved-pill text-[10px] px-2 py-0.5 inline-flex items-center gap-1' + (copiedId === 'copy-text' ? ' on' : '')}
                    >
                      <Ico n={copiedId === 'copy-text' ? 'check' : 'copy'} size={10} />
                      <span>{copiedId === 'copy-text' ? (isEn ? 'Copied!' : 'Disalin!') : (isEn ? 'Copy Text' : 'Salin Teks')}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                    <div className="col-span-2 px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] flex justify-between">
                      <span className="mut text-[10px]">Font</span>
                      <span className="font-medium truncate max-w-[140px]">{spec.typography.fontFamily}</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] flex justify-between">
                      <span className="mut text-[10px]">Weight</span>
                      <span>{spec.typography.fontWeight}</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] flex justify-between">
                      <span className="mut text-[10px]">Size</span>
                      <span>{fmtU(spec.typography.fontSize)}</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] flex justify-between">
                      <span className="mut text-[10px]">Line</span>
                      <span>{fmtU(spec.typography.lineHeight)}</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] flex justify-between">
                      <span className="mut text-[10px]">Align</span>
                      <span>{spec.typography.textAlign}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[var(--sub)] text-[11px] border border-[var(--line)] break-words">
                    {spec.typography.content}
                  </div>
                </div>
              )}

              {/* Colors, Strokes, Effects & WCAG Contrast */}
              {(spec.fills.length > 0 || spec.strokes.length > 0 || spec.effects.length > 0) && (
                <div data-testid="dev-mode-colors" className="fig-isec space-y-2">
                  <div className="fig-isec-title">
                    <span>{isEn ? 'Colors & Effects' : 'Warna & Efek'}</span>
                    {contrastInfo && (
                      <span
                        data-testid="dev-wcag-badge"
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold"
                        style={
                          contrastInfo.aa
                            ? { background: 'color-mix(in srgb, var(--acc) 16%, transparent)', color: 'var(--acc)' }
                            : { background: 'rgba(245, 158, 11, 0.16)', color: '#d97706' }
                        }
                        title="WCAG 2.1 Contrast vs Background"
                      >
                        {contrastInfo.ratio}:1 {contrastInfo.aaa ? 'AAA' : contrastInfo.aa ? 'AA' : 'Low'}
                      </span>
                    )}
                  </div>

                  {spec.fills.map((f, i) => {
                    const formatted = formatDevColor(f.color, devColorFormat, f.opacity);
                    return (
                      <button
                        key={`fill-${i}`}
                        type="button"
                        onClick={() => copyValue(formatted, `fill-${i}`, formatted)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-[11px] font-mono cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-black/20 shrink-0"
                            style={{ background: f.color }}
                          />
                          <span className="truncate">
                            {copiedId === `fill-${i}` ? (isEn ? 'Copied!' : 'Disalin!') : formatted}
                          </span>
                        </span>
                        <span className="text-[9px] mut shrink-0">
                          {f.styleName || (f.kind === 'solid' ? 'Fill' : f.kind)}
                        </span>
                      </button>
                    );
                  })}

                  {spec.strokes.map((st, i) => {
                    const formatted = formatDevColor(st.color, devColorFormat, st.opacity);
                    return (
                      <button
                        key={`stroke-${i}`}
                        type="button"
                        onClick={() => copyValue(formatted, `stroke-${i}`, formatted)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-[11px] font-mono cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-sm border-2 shrink-0"
                            style={{ borderColor: st.color }}
                          />
                          <span className="truncate">
                            {copiedId === `stroke-${i}` ? '✓' : formatted}
                          </span>
                        </span>
                        <span className="text-[9px] mut shrink-0">
                          {fmtU(st.width)} · {st.align}
                        </span>
                      </button>
                    );
                  })}

                  {spec.effects.map((fx, i) => (
                    <div
                      key={`fx-${i}`}
                      className="flex items-center justify-between px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-[10px] font-mono"
                    >
                      <span>{fx.type}</span>
                      <span className="mut">
                        {fmtU(fx.x || 0)} {fmtU(fx.y || 0)} blur {fmtU(fx.blur || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Code & Live SVG Editor */}
              <div className="fig-isec space-y-2">
                <div className="fig-isec-title">
                  <span>{isEn ? 'Code & Live SVG Editor' : 'Kode & Editor SVG'}</span>
                </div>
                <DevModeCodeBlock
                  code={generatedCode}
                  codeLang={devCodeLang}
                  onChangeCodeLang={setDevCodeLang}
                  svgMinified={svgMinified}
                  onToggleSvgMinified={() => setSvgMinified(v => !v)}
                  onApplySvgCode={onUpdateDoc ? handleApplySvgCode : undefined}
                  fileNameBase={spec.name}
                  lang={lang}
                />
              </div>

              {/* Dev Handoff Note */}
              <div className="fig-isec space-y-1.5">
                <div className="fig-sub-lbl">{isEn ? 'Dev Handoff Note' : 'Catatan Developer'}</div>
                <div className="fld px-2 py-1 flex items-center" data-testid="dev-note-input">
                  <CustomTextBox
                    value={devNotes[spec.id] || ''}
                    placeholder={isEn ? 'Add implementation note...' : 'Tambah catatan implementasi...'}
                    ariaLabel={isEn ? 'Developer handoff note' : 'Catatan developer'}
                    onChange={val => setDevNotes(prev => ({ ...prev, [spec.id]: val }))}
                    onCommit={val => setDevNotes(prev => ({ ...prev, [spec.id]: val }))}
                    selectOnFocus={false}
                  />
                </div>
              </div>

              {/* Quick Assets Export */}
              {downloadSvg && (
                <div className="fig-isec space-y-2">
                  <div className="fig-isec-title">
                    <span>{isEn ? 'Assets & Export' : 'Aset & Ekspor'}</span>
                    <div className="w-16">
                      <Select
                        testId="dev-export-scale-select"
                        value={exportScale}
                        options={scaleOptions}
                        on={(v: number) => setExportScale(Number(v) || 1)}
                        lang={lang}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => downloadSvg('svg', 1)}
                      className="ved-pill text-[10px] py-1 justify-center cursor-pointer"
                    >
                      SVG
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSvg('png', exportScale)}
                      className="ved-pill text-[10px] py-1 justify-center cursor-pointer"
                    >
                      PNG {exportScale}x
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSvg('webp', exportScale)}
                      className="ved-pill text-[10px] py-1 justify-center cursor-pointer"
                    >
                      WEBP {exportScale}x
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State: Page Overview */
            <div data-testid="dev-mode-page-overview">
              <div className="fig-isec space-y-1.5">
                <div className="fig-isec-title">
                  <span style={{ color: 'var(--acc)' }}>
                    {isEn ? 'Page Overview' : 'Ringkasan Halaman'}
                  </span>
                </div>
                <p className="text-[11px] mut">
                  {isEn
                    ? 'Click any layer on canvas or in the sidebar to inspect code, edit SVG, and measure distances.'
                    : 'Klik layer mana pun di kanvas atau sidebar untuk inspeksi kode, edit SVG, dan ukur jarak.'}
                </p>
                {overview && (
                  <div className="pt-1 flex items-center gap-3 text-[11px] font-mono">
                    <span>
                      {fmtU(overview.width)} × {fmtU(overview.height)}
                    </span>
                    <span className="mut">•</span>
                    <span>
                      {overview.objectCount} {isEn ? 'layers' : 'layer'}
                    </span>
                  </div>
                )}
              </div>

              {overview && overview.colors.length > 0 && (
                <div className="fig-isec space-y-2">
                  <div className="fig-isec-title">
                    <span>{isEn ? 'Document Colors' : 'Warna Dokumen'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {overview.colors.slice(0, 12).map((c, idx) => {
                      const formatted = formatDevColor(c.color, devColorFormat, 1);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => copyValue(formatted, `ov-c-${idx}`, formatted)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-[10px] font-mono cursor-pointer"
                        >
                          <span
                            className="w-3 h-3 rounded-sm border border-black/20 shrink-0"
                            style={{ background: c.color }}
                          />
                          <span className="truncate">
                            {copiedId === `ov-c-${idx}` ? '✓' : formatted}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {overview && overview.fonts.length > 0 && (
                <div className="fig-isec space-y-1.5">
                  <div className="fig-isec-title">
                    <span>{isEn ? 'Typography Used' : 'Tipografi Digunakan'}</span>
                  </div>
                  {overview.fonts.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-[10px] font-mono"
                    >
                      <span className="truncate">{f.family}</span>
                      <span className="mut shrink-0">
                        {f.weight} · {fmtU(f.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {overview && overview.assets.length > 0 && (
                <div className="fig-isec space-y-1.5">
                  <div className="fig-isec-title">
                    <span>{isEn ? 'Layers' : 'Daftar Layer'}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {overview.assets.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSel && setSel({ objs: new Set([a.id]), nodes: new Set() })}
                        className="w-full flex items-center justify-between px-2 py-1 rounded bg-[var(--sub)] border border-[var(--line)] text-[11px] text-left cursor-pointer"
                      >
                        <span className="truncate">{a.name}</span>
                        <span className="text-[9px] font-mono mut">{a.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <OverlayScrollbar scrollRef={scrollRef} testIdPrefix="dev-mode-scrollbar" />
      </div>
    </aside>
  );
};

export default DevModeInspector;
