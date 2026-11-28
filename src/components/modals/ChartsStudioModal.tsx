/**
 * @file src/components/modals/ChartsStudioModal.tsx
 * @description Modal Charts Studio: Katalog 22 tipe Apache ECharts, Live Vector Preview, & Komponen Lanjutan (0% native HTML input)
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { usePresence } from '../../utils/presenceAndFilePicker.tsx';
import {
  ChartConfig,
  CHART_PALETTES,
  CHART_THEMES,
  applyChartTheme,
  EChartsSeriesType,
} from '../../engine/charts/chartTypes.ts';
import {
  CHART_CATALOG,
  CHART_CATEGORIES,
  ChartCategoryId,
  createChartConfigForType,
  convertChartConfigType,
} from '../../engine/charts/chartCatalog.ts';
import {
  CHART_STYLES,
  CHART_STYLE_CATEGORIES,
  ChartStyleCategoryId,
  applyChartStyle,
} from '../../engine/charts/chartStyles.ts';
import { renderChartToSvgString } from '../../engine/charts/chartVectorRenderer.ts';
import { ChartDataEditor } from '../editor/ChartDataEditor.tsx';
import {
  ChartTextInput,
  ChartNumberInput,
  ChartSelect,
  ChartColorInput,
  ChartSwitch,
  ChartCodeBox,
} from '../editor/ChartCustomInputs.tsx';
import { Ico } from '../ui/IconGlyphs.tsx';

import { Seg } from '../ui/SegmentedControl.tsx';
import { Range } from '../ui/RangeField.tsx';

interface ChartsStudioModalProps {
  open: boolean;
  initialConfig?: ChartConfig | null;
  editingGroupId?: string | null;
  onInsert: (config: ChartConfig) => void;
  onUpdate?: (groupId: string, config: ChartConfig) => void;
  onClose: () => void;
  availableFonts?: string[];
  googleFonts?: string[];
  L?: any;
  lang?: string;
}

type StudioRightTab = 'theme' | 'components' | 'data' | 'color' | 'style' | 'font' | 'json';
type PreviewBackdrop = 'light' | 'dark' | 'grid';

const SIZE_PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: '600×420', w: 600, h: 420 },
  { label: '760×400', w: 760, h: 400 },
  { label: '480×480', w: 480, h: 480 },
  { label: '420×300', w: 420, h: 300 },
];

export const ChartsStudioModal: React.FC<ChartsStudioModalProps> = ({
  open,
  initialConfig = null,
  editingGroupId = null,
  onInsert,
  onUpdate,
  onClose,
  availableFonts = ['Geovanta Sans'],
  googleFonts = [],
  L,
  lang = 'id',
}) => {
  const isEn = lang === 'en';
  const [m, lv] = usePresence(open, 200);

  const [draft, setDraft] = useState<ChartConfig>(() =>
    initialConfig ? JSON.parse(JSON.stringify(initialConfig)) : createChartConfigForType('bar', 'bar')
  );
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ChartCategoryId>('all');
  const [rightTab, setRightTab] = useState<StudioRightTab>('theme');
  const [styleCat, setStyleCat] = useState<ChartStyleCategoryId>('all');
  const [backdrop, setBackdrop] = useState<PreviewBackdrop>('light');
  const [zoomMode, setZoomMode] = useState<'fit' | '100' | '150'>('fit');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 700, h: 520 });
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonErr, setJsonErr] = useState('');

  useEffect(() => {
    if (!open || !stageRef.current || typeof ResizeObserver === 'undefined') return;
    const el = stageRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, m]);

  useEffect(() => {
    if (!open) return;
    const next = initialConfig
      ? JSON.parse(JSON.stringify(initialConfig))
      : createChartConfigForType('bar', 'bar');
    setDraft(next);
    setJsonDraft(next.customOptionJson || '');
    setJsonErr('');
  }, [open, initialConfig, editingGroupId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.querySelector('.flt')) return;
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CHART_CATALOG.filter(item => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.labelId.toLowerCase().includes(q) ||
        item.labelEn.toLowerCase().includes(q) ||
        item.chartType.toLowerCase().includes(q) ||
        item.descId.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  const previewResult = useMemo(() => {
    if (!open) return { svg: '', error: '' };
    return renderChartToSvgString(draft);
  }, [open, draft]);

  const previewMetrics = useMemo(() => {
    const w = Math.max(120, Number(draft.width) || 600);
    const h = Math.max(100, Number(draft.height) || 420);
    const availW = Math.max(200, stageSize.w - 32);
    const availH = Math.max(160, stageSize.h - 32);
    const scale =
      zoomMode === '100'
        ? 1
        : zoomMode === '150'
          ? 1.5
          : Math.min(1, availW / w, availH / h);
    return {
      w,
      h,
      renderW: Math.max(120, Math.round(w * scale)),
      renderH: Math.max(100, Math.round(h * scale)),
    };
  }, [draft.width, draft.height, stageSize.w, stageSize.h, zoomMode]);

  const inlineSvgHtml = useMemo(() => {
    if (!previewResult.svg) return '';
    const { w, h, renderW, renderH } = previewMetrics;
    // Crisp explicit integer dimensions + geometricPrecision (zero fractional CSS scaling)
    return previewResult.svg.replace(
      /<svg\b([^>]*)>/i,
      (_match, attrs) => {
        const cleaned = attrs
          .replace(/\s+(?:width|height|style|preserveAspectRatio|shape-rendering|text-rendering)=["'][^"']*["']/gi, '')
          .trim();
        const hasVb = /\bviewBox=/i.test(cleaned);
        return `<svg ${cleaned}${hasVb ? '' : ` viewBox="0 0 ${w} ${h}"`} width="${renderW}" height="${renderH}" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" style="display:block;flex-shrink:0">`;
      }
    );
  }, [previewResult.svg, previewMetrics]);

  if (!m) return null;

  const isEditing = !!(editingGroupId && onUpdate);
  const allFontOptions = Array.from(
    new Set(['Geovanta Sans', 'IBM Plex Sans', 'Inter', 'Arial', 'Helvetica', 'Georgia', 'Courier New', ...availableFonts, ...googleFonts])
  ).slice(0, 80);

  const handleSubmit = () => {
    if (isEditing && editingGroupId && onUpdate) {
      onUpdate(editingGroupId, draft);
    } else {
      onInsert(draft);
    }
  };

  return ReactDOM.createPortal(
    <div
      className={'ov ' + (lv ? 'out' : 'in')}
      onPointerDown={e => {
        if (e.target !== e.currentTarget) return;
        if (document.querySelector('.flt')) return;
        onClose();
      }}
    >
      <div
        className="hp"
        role="dialog"
        aria-label="Charts Studio (Apache ECharts)"
        data-testid="charts-studio-modal"
        style={{
          width: 'min(1320px, 96vw)',
          maxWidth: '96vw',
          height: 'min(860px, 92vh)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
          overflow: 'hidden',
          transform: 'none',
          animation: 'none',
          willChange: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--line)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--acc)]/15 text-[var(--acc)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16 M7 16v-5 M12 16V7 M17 16v-8" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">
                {isEn ? 'Charts Studio — Apache ECharts Vector' : 'Charts Studio — Vektor Apache ECharts'}
              </div>
              <div className="text-[11px] mut">
                {isEn
                  ? 'All 22 ECharts chart types, modern SaaS card defaults, 100% editable pure vectors.'
                  : 'Semua 22 tipe chart ECharts, gaya kartu SaaS modern, 100% vektor murni yang bisa diedit bebas.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn sec"
            style={{ padding: 0, width: 32, height: 32, borderRadius: '50%' }}
            onClick={onClose}
            aria-label={isEn ? 'Close' : 'Tutup'}
          >
            <Ico n="x" size={14} />
          </button>
        </div>

        {/* 3-Column Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[240px_1fr_310px] gap-4 py-3 overflow-hidden">
          {/* Left: Catalog of 22 ECharts types + presets */}
          <div className="flex flex-col min-h-0 border border-[var(--line)] rounded-xl p-2.5 bg-[var(--card)]">
            <div className="mb-2 space-y-1.5">
              <ChartTextInput
                testId="charts-studio-search"
                value={search}
                placeholder={isEn ? 'Search 22+ chart types...' : 'Cari 22+ jenis chart...'}
                onChange={setSearch}
              />
              <ChartSelect
                value={category}
                options={CHART_CATEGORIES.map(c => [c.id, isEn ? c.labelEn : c.labelId])}
                onChange={v => setCategory(v)}
                lang={lang}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
              {filteredCatalog.map(item => {
                const active = draft.presetId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`chart-catalog-item-${item.id}`}
                    className={
                      'w-full flex items-start gap-2 p-2 rounded-lg border text-left transition-colors ' +
                      (active
                        ? 'border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_14%,var(--bg))]'
                        : 'border-transparent hover:border-[var(--line)] hover:bg-[var(--bg)]')
                    }
                    onClick={() =>
                      setDraft(prev => convertChartConfigType(prev, item.chartType as EChartsSeriesType, item.id))
                    }
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                      <path d={item.iconPath} />
                    </svg>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate">
                        {isEn ? item.labelEn : item.labelId}
                      </div>
                      <div className="text-[10px] mut line-clamp-2">
                        {isEn ? item.descEn : item.descId}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: Live Pure Vector SVG Preview */}
          <div className="flex flex-col min-h-0 border border-[var(--line)] rounded-xl bg-[var(--sub)] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--line)] bg-[var(--card)] text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {isEn ? 'Live Preview' : 'Pratinjau'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sub)] font-mono uppercase mut">
                  {draft.chartType}
                </span>
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--sub)]">
                  {(
                    [
                      ['light', isEn ? 'Light' : 'Terang'],
                      ['dark', isEn ? 'Dark' : 'Gelap'],
                      ['grid', 'Grid'],
                    ] as const
                  ).map(([id, lbl]) => (
                    <button
                      key={id}
                      type="button"
                      data-testid={`studio-backdrop-${id}`}
                      className={
                        'text-[10px] px-1.5 py-0.5 rounded-md transition-colors ' +
                        (backdrop === id
                          ? 'bg-[var(--card)] text-[var(--ink)] font-semibold shadow-sm'
                          : 'text-[var(--mut)] hover:text-[var(--ink)]')
                      }
                      onClick={() => setBackdrop(id)}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--sub)]">
                  {(
                    [
                      ['fit', 'Fit'],
                      ['100', '100%'],
                      ['150', '150%'],
                    ] as const
                  ).map(([id, lbl]) => (
                    <button
                      key={id}
                      type="button"
                      data-testid={`studio-zoom-${id}`}
                      className={
                        'text-[10px] px-1.5 py-0.5 rounded-md transition-colors ' +
                        (zoomMode === id
                          ? 'bg-[var(--card)] text-[var(--ink)] font-semibold shadow-sm'
                          : 'text-[var(--mut)] hover:text-[var(--ink)]')
                      }
                      onClick={() => setZoomMode(id)}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="hidden xl:flex items-center gap-1 mr-1">
                  {SIZE_PRESETS.map(sp => (
                    <button
                      key={sp.label}
                      type="button"
                      className={
                        'text-[9px] px-1.5 py-0.5 rounded border transition-colors ' +
                        (draft.width === sp.w && draft.height === sp.h
                          ? 'border-[var(--acc)] text-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_10%,transparent)] font-semibold'
                          : 'border-[var(--line)] mut hover:text-[var(--ink)]')
                      }
                      onClick={() => setDraft(p => ({ ...p, width: sp.w, height: sp.h }))}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
                <span className="mut">W</span>
                <ChartNumberInput
                  className="w-16"
                  value={draft.width}
                  min={160}
                  max={4000}
                  onCommit={v => setDraft(p => ({ ...p, width: Math.max(160, v) }))}
                />
                <span className="mut">× H</span>
                <ChartNumberInput
                  className="w-16"
                  value={draft.height}
                  min={120}
                  max={4000}
                  onCommit={v => setDraft(p => ({ ...p, height: Math.max(120, v) }))}
                />
              </div>
            </div>
            <div
              ref={stageRef}
              className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto transition-colors"
              style={{
                background:
                  backdrop === 'dark'
                    ? '#0b1120'
                    : backdrop === 'grid'
                      ? 'repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%) 50% / 18px 18px'
                      : '#f1f5f9',
              }}
            >
              {previewResult.error ? (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-md text-center">
                  {previewResult.error}
                </div>
              ) : inlineSvgHtml ? (
                <div
                  data-testid="charts-studio-preview"
                  data-svg-rendered="true"
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: previewMetrics.renderW,
                    height: previewMetrics.renderH,
                    transform: 'none',
                    willChange: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: inlineSvgHtml }}
                />
              ) : null}
            </div>
          </div>

          {/* Right: Quick Customize */}
          <div className="flex flex-col min-h-0 border border-[var(--line)] rounded-xl p-3 bg-[var(--card)]">
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--sub)] mb-3 shrink-0">
              {(
                [
                  ['theme', isEn ? 'Theme' : 'Tema'],
                  ['components', isEn ? 'Elements' : 'Elemen'],
                  ['data', 'Data'],
                  ['color', isEn ? 'Color' : 'Warna'],
                  ['style', isEn ? 'Style' : 'Gaya'],
                  ['font', 'Font'],
                  ['json', 'JSON'],
                ] as const
              ).map(([id, lbl]) => {
                const active = rightTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`studio-tab-${id}`}
                    className={
                      'text-[10px] py-1 px-1 rounded-lg text-center transition-all ' +
                      (active
                        ? 'bg-[var(--card)] text-[var(--ink)] font-semibold shadow-sm'
                        : 'text-[var(--mut)] hover:text-[var(--ink)] font-medium')
                    }
                    onClick={() => setRightTab(id)}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
              {rightTab === 'theme' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] mut font-semibold uppercase tracking-wider mb-1.5">
                      {isEn ? 'Modern Themes' : 'Tema Modern (1-Klik)'}
                    </div>
                    <div className="space-y-1.5">
                      {CHART_THEMES.map(th => {
                        const active = (draft.themeId || 'saas-light') === th.id;
                        return (
                          <button
                            key={th.id}
                            type="button"
                            data-testid={`studio-theme-${th.id}`}
                            className={
                              'w-full flex items-center justify-between gap-2 p-2 rounded-xl border text-left transition-all ' +
                              (active
                                ? 'border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_10%,var(--bg))]'
                                : 'border-[var(--line)] hover:border-[var(--acc)]')
                            }
                            onClick={() => {
                              setDraft(p => applyChartTheme(p, th.id));
                              setBackdrop(th.isDark ? 'dark' : 'light');
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center"
                                style={{ background: th.cardBg, borderColor: th.cardBorder }}
                              >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: th.colors[0] }} />
                              </span>
                              <span className="text-[11px] font-semibold truncate">
                                {isEn ? th.name : th.nameId}
                              </span>
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              {th.colors.slice(0, 4).map((c, idx) => (
                                <span key={idx} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-[var(--line)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold">{isEn ? 'Card Frame' : 'Bingkai Kartu'}</span>
                      <ChartSwitch
                        checked={draft.card.show}
                        onChange={v => setDraft(p => ({ ...p, card: { ...p.card, show: v } }))}
                      />
                    </div>
                    {draft.card.show && (
                      <>
                        <div>
                          <div className="text-[10px] mut mb-1">{isEn ? 'Elevation' : 'Bayangan Kartu'}</div>
                          <Seg
                            o={[
                              ['none', isEn ? 'Flat' : 'Datar'],
                              ['soft', isEn ? 'Soft' : 'Halus'],
                              ['elevated', isEn ? 'Deep' : 'Tinggi'],
                            ]}
                            v={draft.card.shadow ?? 'soft'}
                            on={v => setDraft(p => ({ ...p, card: { ...p.card, shadow: v as any } }))}
                          />
                        </div>
                        <Range
                          l={isEn ? 'Corner Radius' : 'Radius Sudut'}
                          v={draft.card.borderRadius}
                          min={0}
                          max={40}
                          step={1}
                          f={v => v + 'px'}
                          on={v => setDraft(p => ({ ...p, card: { ...p.card, borderRadius: v } }))}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {rightTab === 'components' && (
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] mut mb-0.5">{isEn ? 'Title' : 'Judul Chart'}</div>
                    <ChartTextInput
                      value={draft.title.text}
                      onCommit={v => setDraft(p => ({ ...p, title: { ...p.title, text: v } }))}
                      onChange={v => setDraft(p => ({ ...p, title: { ...p.title, text: v } }))}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] mut mb-0.5">{isEn ? 'Subtitle' : 'Subjudul'}</div>
                    <ChartTextInput
                      value={draft.title.subtext}
                      onCommit={v => setDraft(p => ({ ...p, title: { ...p.title, subtext: v } }))}
                      onChange={v => setDraft(p => ({ ...p, title: { ...p.title, subtext: v } }))}
                    />
                  </div>
                  <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">{isEn ? 'KPI Hero & Badge' : 'KPI Hero & Badge'}</span>
                      <ChartSwitch
                        checked={draft.kpi.show}
                        onChange={v => setDraft(p => ({ ...p, kpi: { ...p.kpi, show: v } }))}
                      />
                    </div>
                    {draft.kpi.show && (
                      <>
                        <div className="grid grid-cols-2 gap-1.5">
                          <ChartTextInput
                            value={draft.kpi.value}
                            placeholder="$23.700"
                            onChange={v => setDraft(p => ({ ...p, kpi: { ...p.kpi, value: v } }))}
                          />
                          <ChartTextInput
                            value={draft.kpi.delta}
                            placeholder="↗ 50%"
                            onChange={v => setDraft(p => ({ ...p, kpi: { ...p.kpi, delta: v } }))}
                          />
                        </div>
                        <Seg
                          o={[['positive', isEn ? 'Up' : 'Naik'], ['negative', isEn ? 'Down' : 'Turun'], ['neutral', isEn ? 'Flat' : 'Netral']]}
                          v={draft.kpi.deltaTone}
                          on={v => setDraft(p => ({ ...p, kpi: { ...p.kpi, deltaTone: v as any } }))}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">{isEn ? 'Period Pills' : 'Pil Periode'}</span>
                    <ChartSwitch
                      checked={draft.periodPills.show}
                      onChange={v => setDraft(p => ({ ...p, periodPills: { ...p.periodPills, show: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">{isEn ? 'Show Legend' : 'Tampilkan Legenda'}</span>
                    <ChartSwitch
                      checked={draft.legend.show}
                      onChange={v => setDraft(p => ({ ...p, legend: { ...p.legend, show: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">{isEn ? 'Show Data Labels' : 'Label Nilai Data'}</span>
                    <ChartSwitch
                      checked={draft.dataLabel.show}
                      onChange={v => setDraft(p => ({ ...p, dataLabel: { ...p.dataLabel, show: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">{isEn ? 'Average Line' : 'Garis Rata-rata'}</span>
                    <ChartSwitch
                      checked={draft.annotations.markLineAvg}
                      onChange={v => setDraft(p => ({ ...p, annotations: { ...p.annotations, markLineAvg: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">{isEn ? 'Footnote' : 'Catatan Kaki'}</span>
                    <ChartSwitch
                      checked={draft.footnote.show}
                      onChange={v => setDraft(p => ({ ...p, footnote: { ...p.footnote, show: v } }))}
                    />
                  </div>
                </div>
              )}

              {rightTab === 'data' && (
                <ChartDataEditor
                  lang={lang}
                  config={draft}
                  onChange={(nextData, extra) =>
                    setDraft(p => ({ ...p, ...(extra || {}), data: nextData }))
                  }
                />
              )}

              {rightTab === 'color' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {CHART_PALETTES.map(pal => (
                      <button
                        key={pal.id}
                        type="button"
                        className={
                          'p-1.5 rounded-lg border text-left ' +
                          (draft.paletteId === pal.id ? 'border-[var(--acc)] bg-[var(--sub)]' : 'border-[var(--line)]')
                        }
                        onClick={() => setDraft(p => ({ ...p, paletteId: pal.id, colors: [...pal.colors] }))}
                      >
                        <div className="text-[10px] font-medium truncate mb-1">{pal.name}</div>
                        <div className="flex gap-0.5">
                          {pal.colors.slice(0, 6).map((c, i) => (
                            <span key={i} className="h-2.5 flex-1 rounded-sm" style={{ background: c }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {draft.colors.map((c, idx) => (
                      <ChartColorInput
                        key={idx}
                        value={c}
                        L={L}
                        onChange={hex => {
                          const next = [...draft.colors];
                          next[idx] = hex;
                          setDraft(p => ({ ...p, paletteId: 'custom', colors: next }));
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span>{isEn ? 'Gradient Fill' : 'Isian Gradien'}</span>
                    <ChartSwitch
                      checked={draft.useGradient}
                      onChange={v => setDraft(p => ({ ...p, useGradient: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{isEn ? 'Transparent Background' : 'Latar Transparan'}</span>
                    <ChartSwitch
                      checked={draft.transparentBg}
                      onChange={v => setDraft(p => ({ ...p, transparentBg: v }))}
                    />
                  </div>
                </div>
              )}

              {rightTab === 'style' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] mut font-semibold uppercase tracking-wider mb-1.5">
                      {isEn ? '25 Chart Styles (Geometry & Layout)' : '25 Style Chart (Geometri & Tata Letak)'}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {CHART_STYLE_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={
                            'text-[9px] px-2 py-0.5 rounded-full border transition-colors ' +
                            (styleCat === cat.id
                              ? 'border-[var(--acc)] bg-[var(--acc)] text-white font-semibold'
                              : 'border-[var(--line)] mut hover:text-[var(--ink)]')
                          }
                          onClick={() => setStyleCat(cat.id)}
                        >
                          {isEn ? cat.labelEn : cat.labelId}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                      {CHART_STYLES.filter(st => styleCat === 'all' || st.category === styleCat).map(st => {
                        const active = (draft.chartStyleId || 'saas-clean') === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            data-testid={`studio-style-${st.id}`}
                            className={
                              'w-full flex items-start gap-2 p-1.5 rounded-lg border text-left transition-colors ' +
                              (active
                                ? 'border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_12%,var(--bg))]'
                                : 'border-[var(--line)] hover:border-[var(--acc)]')
                            }
                            onClick={() => setDraft(p => applyChartStyle(p, st.id))}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                              <path d={st.iconPath} />
                            </svg>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold leading-tight">
                                {isEn ? st.labelEn : st.labelId}
                              </div>
                              <div className="text-[9.5px] mut leading-snug">
                                {isEn ? st.descEn : st.descId}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--line)] space-y-2.5">
                  {draft.chartType === 'bar' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{isEn ? 'Stacked' : 'Bertumpuk'}</span>
                        <ChartSwitch checked={draft.seriesStyle.stack} onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, stack: v } }))} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{isEn ? 'Horizontal' : 'Horizontal'}</span>
                        <ChartSwitch checked={draft.seriesStyle.horizontal} onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, horizontal: v } }))} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{isEn ? 'Background Track' : 'Track Latar'}</span>
                        <ChartSwitch checked={draft.seriesStyle.showBarBackground} onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, showBarBackground: v } }))} />
                      </div>
                      <Range l={isEn ? 'Bar Width' : 'Lebar Batang'} v={draft.seriesStyle.barWidth || 16} min={4} max={48} step={1} f={v => v + 'px'} on={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, barWidth: v } }))} />
                      <Range l={isEn ? 'Corner Radius' : 'Radius Batang'} v={draft.seriesStyle.barBorderRadius} min={0} max={99} step={1} f={v => v + 'px'} on={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, barBorderRadius: v } }))} />
                    </>
                  )}
                  {draft.chartType === 'line' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{isEn ? 'Smooth Curve' : 'Kurva Halus'}</span>
                        <ChartSwitch checked={draft.seriesStyle.smooth} onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, smooth: v } }))} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{isEn ? 'Area Fill' : 'Isian Area'}</span>
                        <ChartSwitch checked={draft.seriesStyle.areaFill} onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, areaFill: v } }))} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{isEn ? 'Show Points' : 'Titik Simbol'}</span>
                        <ChartSwitch checked={draft.seriesStyle.showSymbol} onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, showSymbol: v } }))} />
                      </div>
                      <Range l={isEn ? 'Line Width' : 'Tebal Garis'} v={draft.seriesStyle.lineWidth} min={1} max={12} step={1} f={v => v + 'px'} on={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, lineWidth: v } }))} />
                    </>
                  )}
                  {draft.chartType === 'pie' && (
                    <>
                      <Range l={isEn ? 'Inner Radius' : 'Radius Dalam'} v={draft.seriesStyle.pieInnerRadius} min={0} max={80} step={1} f={v => v + '%'} on={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, pieInnerRadius: v } }))} />
                      <Range l={isEn ? 'Outer Radius' : 'Radius Luar'} v={draft.seriesStyle.pieOuterRadius} min={25} max={95} step={1} f={v => v + '%'} on={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, pieOuterRadius: v } }))} />
                      <Range l={isEn ? 'Pad Angle' : 'Celah Slice'} v={draft.seriesStyle.piePadAngle} min={0} max={12} step={1} f={v => v + '°'} on={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, piePadAngle: v } }))} />
                      {draft.seriesStyle.pieInnerRadius >= 30 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px]">{isEn ? 'Center Metric' : 'Angka Tengah'}</span>
                            <ChartSwitch checked={draft.seriesStyle.showDonutCenter !== false} onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, showDonutCenter: v } }))} />
                          </div>
                          {draft.seriesStyle.showDonutCenter !== false && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <ChartTextInput value={draft.seriesStyle.donutCenterValue || ''} placeholder="Auto" onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, donutCenterValue: v } }))} />
                              <ChartTextInput value={draft.seriesStyle.donutCenterLabel ?? 'Total'} placeholder="Total" onChange={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, donutCenterLabel: v } }))} />
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                  <Range l={isEn ? 'Opacity' : 'Opasitas'} v={Math.round((draft.seriesStyle.opacity ?? 1) * 100)} min={10} max={100} step={5} f={v => v + '%'} on={v => setDraft(p => ({ ...p, seriesStyle: { ...p.seriesStyle, opacity: v / 100 } }))} />
                  </div>
                </div>
              )}

              {rightTab === 'font' && (
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] mut mb-0.5">{isEn ? 'Global Font Family' : 'Font Utama'}</div>
                    <ChartSelect
                      searchable
                      value={draft.typography.global.family}
                      options={allFontOptions.map(f => [f, f, { fontFamily: f }])}
                      onChange={fam => {
                        setDraft(p => {
                          const nextTypo = { ...p.typography };
                          (Object.keys(nextTypo) as Array<keyof typeof nextTypo>).forEach(k => {
                            nextTypo[k] = { ...nextTypo[k], family: fam };
                          });
                          return { ...p, typography: nextTypo };
                        });
                      }}
                      lang={lang}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] mut mb-0.5">{isEn ? 'Title Size' : 'Ukuran Judul'}</div>
                    <ChartNumberInput
                      value={draft.typography.title.size}
                      min={10}
                      max={42}
                      onCommit={v =>
                        setDraft(p => ({
                          ...p,
                          typography: {
                            ...p.typography,
                            title: { ...p.typography.title, size: Math.max(10, v) },
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <div className="text-[10px] mut mb-0.5">{isEn ? 'Label Size' : 'Ukuran Label'}</div>
                    <ChartNumberInput
                      value={draft.typography.axisLabel.size}
                      min={8}
                      max={28}
                      onCommit={v =>
                        setDraft(p => ({
                          ...p,
                          typography: {
                            ...p.typography,
                            axisLabel: { ...p.typography.axisLabel, size: Math.max(8, v) },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {rightTab === 'json' && (
                <div className="space-y-2">
                  <div className="text-[10px] mut">
                    {isEn ? 'Custom EChartsOption JSON Override:' : 'Override JSON EChartsOption:'}
                  </div>
                  {jsonErr && <div className="text-[10px] text-red-500">{jsonErr}</div>}
                  <ChartCodeBox value={jsonDraft} onChange={setJsonDraft} minHeight={180} />
                  <button
                    type="button"
                    className="btn pri text-[11px] w-full py-1 rounded-lg"
                    onClick={() => {
                      if (!jsonDraft.trim()) {
                        setJsonErr('');
                        setDraft(p => ({ ...p, customOptionJson: '' }));
                        return;
                      }
                      try {
                        JSON.parse(jsonDraft);
                        setJsonErr('');
                        setDraft(p => ({ ...p, customOptionJson: jsonDraft }));
                      } catch (e: any) {
                        setJsonErr(e?.message || 'JSON tidak valid');
                      }
                    }}
                  >
                    {isEn ? 'Apply JSON' : 'Terapkan JSON'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)] shrink-0">
          <button type="button" className="btn sec px-4 py-1.5 rounded-xl text-xs" onClick={onClose}>
            {isEn ? 'Cancel' : 'Batal'}
          </button>
          <button
            type="button"
            data-testid="charts-studio-submit"
            disabled={!!previewResult.error}
            className="btn pri px-5 py-1.5 rounded-xl text-xs font-semibold"
            onClick={handleSubmit}
          >
            {isEditing
              ? isEn
                ? 'Apply to Canvas'
                : 'Terapkan ke Kanvas'
              : isEn
                ? 'Insert to Canvas'
                : 'Sisipkan ke Kanvas'}
          </button>
        </div>
      </div>
    </div>,
    document.fullscreenElement || document.body
  );
};

export default ChartsStudioModal;
