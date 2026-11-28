/**
 * @file src/components/editor/ChartInspectorPanel.tsx
 * @description Panel kustomisasi Chart super-lengkap di Sidebar Kanan paling atas (0% native HTML input + Advanced Component Builder)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  ChartConfig,
  ChartFontStyle,
  CHART_PALETTES,
  CHART_THEMES,
  applyChartTheme,
  EChartsSeriesType,
} from '../../engine/charts/chartTypes.ts';
import {
  CHART_CATALOG,
  CHART_CATEGORIES,
  convertChartConfigType,
} from '../../engine/charts/chartCatalog.ts';
import {
  CHART_STYLES,
  CHART_STYLE_CATEGORIES,
  ChartStyleCategoryId,
  applyChartStyle,
} from '../../engine/charts/chartStyles.ts';
import { ChartDataEditor } from './ChartDataEditor.tsx';
import {
  ChartTextInput,
  ChartNumberInput,
  ChartSelect,
  ChartColorInput,
  ChartSwitch,
  ChartCodeBox,
} from './ChartCustomInputs.tsx';
import { Range } from '../ui/RangeField.tsx';
import { Seg } from '../ui/SegmentedControl.tsx';

interface ChartInspectorPanelProps {
  config: ChartConfig;
  groupId: string;
  onChangeConfig: (nextConfig: ChartConfig, meta?: { coalesce?: string }) => void;
  onOpenStudio: () => void;
  onDetachToVector: () => void;
  availableFonts?: string[];
  googleFonts?: string[];
  L?: any;
  lang?: string;
}

type InspectorTab = 'type' | 'components' | 'data' | 'color' | 'font' | 'style' | 'layout' | 'json';
type FontTarget = keyof ChartConfig['typography'];

export const ChartInspectorPanel: React.FC<ChartInspectorPanelProps> = ({
  config,
  groupId,
  onChangeConfig,
  onOpenStudio,
  onDetachToVector,
  availableFonts = ['Geovanta Sans'],
  googleFonts = [],
  L,
  lang = 'id',
}) => {
  const isEn = lang === 'en';
  const [tab, setTab] = useState<InspectorTab>('type');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [styleCatFilter, setStyleCatFilter] = useState<ChartStyleCategoryId>('all');
  const [fontTarget, setFontTarget] = useState<FontTarget>('global');
  const [jsonDraft, setJsonDraft] = useState(config.customOptionJson || '');
  const [jsonErr, setJsonErr] = useState('');
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    setJsonDraft(config.customOptionJson || '');
    setJsonErr('');
  }, [groupId, config.customOptionJson]);

  const commitPatch = (patch: Partial<ChartConfig>, coalesceKey?: string) => {
    const next: ChartConfig = { ...config, ...patch };
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (coalesceKey) {
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onChangeConfig(next, { coalesce: coalesceKey });
      }, 45);
    } else {
      onChangeConfig(next);
    }
  };

  const updateSeriesStyle = (patch: Partial<ChartConfig['seriesStyle']>, coalesce?: string) => {
    commitPatch({ seriesStyle: { ...config.seriesStyle, ...patch } }, coalesce);
  };

  const updateCard = (patch: Partial<ChartConfig['card']>, coalesce?: string) => {
    commitPatch({ card: { ...config.card, ...patch } }, coalesce);
  };

  const updateKpi = (patch: Partial<ChartConfig['kpi']>, coalesce?: string) => {
    commitPatch({ kpi: { ...config.kpi, ...patch } }, coalesce);
  };

  const updatePills = (patch: Partial<ChartConfig['periodPills']>) => {
    commitPatch({ periodPills: { ...config.periodPills, ...patch } });
  };

  const updateFootnote = (patch: Partial<ChartConfig['footnote']>, coalesce?: string) => {
    commitPatch({ footnote: { ...config.footnote, ...patch } }, coalesce);
  };

  const updateTitle = (patch: Partial<ChartConfig['title']>, coalesce?: string) => {
    commitPatch({ title: { ...config.title, ...patch } }, coalesce);
  };

  const updateLegend = (patch: Partial<ChartConfig['legend']>) => {
    commitPatch({ legend: { ...config.legend, ...patch } });
  };

  const updateGrid = (patch: Partial<ChartConfig['grid']>, coalesce?: string) => {
    commitPatch({ grid: { ...config.grid, ...patch } }, coalesce);
  };

  const updateFont = (target: FontTarget, patch: Partial<ChartFontStyle>, coalesce?: string) => {
    const cur = config.typography[target];
    const nextTypo = {
      ...config.typography,
      [target]: { ...cur, ...patch },
    };
    if (target === 'global') {
      (Object.keys(nextTypo) as FontTarget[]).forEach(k => {
        if (k !== 'global' && patch.family !== undefined) {
          nextTypo[k] = { ...nextTypo[k], family: patch.family };
        }
      });
    }
    commitPatch({ typography: nextTypo }, coalesce);
  };

  const allFontOptions = Array.from(
    new Set(['Geovanta Sans', 'IBM Plex Sans', 'Inter', 'Arial', 'Helvetica', 'Georgia', 'Courier New', ...availableFonts, ...googleFonts])
  ).slice(0, 80);

  const currentFont = config.typography[fontTarget] || config.typography.global;
  const filteredCatalog = CHART_CATALOG.filter(
    item => catFilter === 'all' || item.category === catFilter
  );

  const TABS: Array<{ id: InspectorTab; label: string }> = [
    { id: 'type', label: isEn ? 'Type' : 'Tipe' },
    { id: 'components', label: isEn ? 'Elements' : 'Elemen' },
    { id: 'data', label: 'Data' },
    { id: 'color', label: isEn ? 'Color' : 'Warna' },
    { id: 'font', label: 'Font' },
    { id: 'style', label: isEn ? 'Style' : 'Gaya' },
    { id: 'layout', label: isEn ? 'Size' : 'Ukuran' },
    { id: 'json', label: 'JSON' },
  ];

  return (
    <div
      className="fig-isec fade"
      data-testid="chart-inspector-panel"
      style={{ borderBottom: '2px solid color-mix(in srgb, var(--acc) 35%, var(--line))' }}
    >
      <div className="fig-isec-title" style={{ marginBottom: 8 }}>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16 M7 16v-5 M12 16V7 M17 16v-8" />
          </svg>
          <span>{isEn ? 'Chart Customization' : 'Kustomisasi Chart'}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--sub)] font-mono uppercase">
            {config.chartType}
          </span>
        </span>
      </div>

      {/* Quick Top Actions */}
      <div className="flex gap-1.5 mb-2.5">
        <button
          type="button"
          data-testid="chart-open-studio-btn"
          className="btn pri text-[10px] px-2 py-1 rounded-lg flex-1"
          onClick={onOpenStudio}
        >
          {isEn ? 'Open Charts Studio' : 'Buka Charts Studio'}
        </button>
        <button
          type="button"
          data-testid="chart-detach-btn"
          className="ved-pill text-[10px] px-2 py-1"
          title={isEn ? 'Detach chart link and keep pure vector shapes' : 'Lepas tautan chart menjadi vektor murni biasa'}
          onClick={onDetachToVector}
        >
          {isEn ? 'Detach' : 'Lepas Vektor'}
        </button>
      </div>

      {/* 8-Tab Segmented Grid (4x2) */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--sub)] mb-3"
        role="tablist"
      >
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`chart-tab-${t.id}`}
              className={
                'text-[10px] py-1 px-1 rounded-lg text-center transition-all ' +
                (active
                  ? 'bg-[var(--card)] text-[var(--ink)] font-semibold shadow-sm'
                  : 'text-[var(--mut)] hover:text-[var(--ink)] font-medium')
              }
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB: TYPE */}
      {tab === 'type' && (
        <div className="space-y-2">
          <ChartSelect
            value={catFilter}
            options={CHART_CATEGORIES.map(c => [c.id, isEn ? c.labelEn : c.labelId])}
            onChange={v => setCatFilter(v)}
            lang={lang}
          />
          <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
            {filteredCatalog.map(item => {
              const active = config.presetId === item.id || (config.chartType === item.chartType && !config.presetId);
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`chart-inspector-type-${item.id}`}
                  className={
                    'w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-colors ' +
                    (active
                      ? 'border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_14%,var(--card))]'
                      : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)]')
                  }
                  onClick={() => {
                    const next = convertChartConfigType(config, item.chartType as EChartsSeriesType, item.id);
                    onChangeConfig(next);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d={item.iconPath} />
                  </svg>
                  <span className="text-[11px] font-medium flex-1">
                    {isEn ? item.labelEn : item.labelId}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: ADVANCED COMPONENT BUILDER */}
      {tab === 'components' && (
        <div className="space-y-2.5">
          {/* Card Frame */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{isEn ? 'Card Frame' : 'Bingkai Kartu (Card)'}</span>
              <ChartSwitch testId="chart-comp-card" checked={config.card.show} onChange={v => updateCard({ show: v })} />
            </div>
            {config.card.show && (
              <>
                <div>
                  <div className="text-[10px] mut mb-0.5">{isEn ? 'Elevation' : 'Bayangan Kartu'}</div>
                  <Seg
                    o={[
                      ['none', isEn ? 'Flat' : 'Datar'],
                      ['soft', isEn ? 'Soft' : 'Halus'],
                      ['elevated', isEn ? 'Deep' : 'Tinggi'],
                    ]}
                    v={config.card.shadow ?? 'soft'}
                    on={v => updateCard({ shadow: v as any })}
                  />
                </div>
                <Range
                  l={isEn ? 'Corner Radius' : 'Radius Sudut'}
                  v={config.card.borderRadius}
                  min={0}
                  max={40}
                  step={1}
                  f={v => v + 'px'}
                  on={(v, m) => updateCard({ borderRadius: v }, m?.live ? 'chart-param' : undefined)}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] mut">{isEn ? 'Card Fill / Border' : 'Warna Kartu / Garis'}</span>
                  <div className="flex items-center gap-1.5">
                    <ChartColorInput value={config.card.backgroundColor} onChange={c => updateCard({ backgroundColor: c }, 'chart-param')} L={L} />
                    <ChartColorInput value={config.card.borderColor} onChange={c => updateCard({ borderColor: c }, 'chart-param')} L={L} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{isEn ? 'Title & Header' : 'Judul & Header'}</span>
              <ChartSwitch checked={config.title.show} onChange={v => updateTitle({ show: v })} />
            </div>
            {config.title.show && (
              <>
                <ChartTextInput
                  testId="chart-title-input"
                  value={config.title.text}
                  placeholder={isEn ? 'Chart title' : 'Judul chart'}
                  onCommit={val => updateTitle({ text: val })}
                  onChange={val => updateTitle({ text: val }, 'chart-param')}
                />
                <ChartTextInput
                  value={config.title.subtext}
                  placeholder={isEn ? 'Subtitle (e.g. Apr 30 - May 30)' : 'Subjudul (mis. Apr 30 - Mei 30)'}
                  onCommit={val => updateTitle({ subtext: val })}
                  onChange={val => updateTitle({ subtext: val }, 'chart-param')}
                />
                <Seg
                  o={[['left', isEn ? 'Left' : 'Kiri'], ['center', isEn ? 'Center' : 'Tengah'], ['right', isEn ? 'Right' : 'Kanan']]}
                  v={config.title.left}
                  on={v => updateTitle({ left: v as any })}
                />
              </>
            )}
          </div>

          {/* KPI Hero & Delta Badge */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{isEn ? 'KPI Hero & Badge' : 'KPI Hero & Badge'}</span>
              <ChartSwitch testId="chart-comp-kpi" checked={config.kpi.show} onChange={v => updateKpi({ show: v })} />
            </div>
            {config.kpi.show && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <ChartTextInput
                    testId="chart-kpi-value"
                    value={config.kpi.value}
                    placeholder="$23.700"
                    onCommit={val => updateKpi({ value: val })}
                    onChange={val => updateKpi({ value: val }, 'chart-param')}
                  />
                  <ChartTextInput
                    value={config.kpi.delta}
                    placeholder="↗ 50%"
                    onCommit={val => updateKpi({ delta: val })}
                    onChange={val => updateKpi({ delta: val }, 'chart-param')}
                  />
                </div>
                <Seg
                  o={[['positive', isEn ? 'Positive' : 'Naik'], ['negative', isEn ? 'Negative' : 'Turun'], ['neutral', isEn ? 'Neutral' : 'Netral']]}
                  v={config.kpi.deltaTone}
                  on={v => updateKpi({ deltaTone: v as any })}
                />
                <ChartTextInput
                  value={config.kpi.caption}
                  placeholder={isEn ? 'Caption' : 'Keterangan'}
                  onCommit={val => updateKpi({ caption: val })}
                  onChange={val => updateKpi({ caption: val }, 'chart-param')}
                />
              </>
            )}
          </div>

          {/* Period Pills */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{isEn ? 'Period Pills' : 'Pil Periode (Monthly/Yearly)'}</span>
              <ChartSwitch testId="chart-comp-pills" checked={config.periodPills.show} onChange={v => updatePills({ show: v })} />
            </div>
            {config.periodPills.show && (
              <div className="space-y-1.5">
                <ChartTextInput
                  value={config.periodPills.items.join(', ')}
                  placeholder="Monthly, Yearly"
                  onCommit={val =>
                    updatePills({ items: val.split(',').map(s => s.trim()).filter(Boolean) })
                  }
                />
                {config.periodPills.items.length > 1 && (
                  <Seg
                    o={config.periodPills.items.slice(0, 4).map((lbl, idx) => [String(idx), lbl])}
                    v={String(config.periodPills.activeIndex || 0)}
                    on={v => updatePills({ activeIndex: Number(v) || 0 })}
                  />
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{isEn ? 'Legend' : 'Legenda'}</span>
              <ChartSwitch testId="chart-comp-legend" checked={config.legend.show} onChange={v => updateLegend({ show: v })} />
            </div>
            {config.legend.show && (
              <>
                <Seg
                  o={[['top', isEn ? 'Top' : 'Atas'], ['bottom', isEn ? 'Bottom' : 'Bawah'], ['left', isEn ? 'Left' : 'Kiri'], ['right', isEn ? 'Right' : 'Kanan']]}
                  v={config.legend.position}
                  on={v =>
                    updateLegend({
                      position: v as any,
                      orient: v === 'left' || v === 'right' ? 'vertical' : 'horizontal',
                    })
                  }
                />
                <ChartSelect
                  value={config.legend.icon}
                  options={[
                    ['circle', isEn ? 'Circle Dot' : 'Titik Lingkaran'],
                    ['roundRect', isEn ? 'Rounded Pill' : 'Kapsul Bulat'],
                    ['rect', isEn ? 'Square' : 'Kotak'],
                    ['triangle', isEn ? 'Triangle' : 'Segitiga'],
                    ['diamond', isEn ? 'Diamond' : 'Berlian'],
                  ]}
                  onChange={v => updateLegend({ icon: v })}
                  lang={lang}
                />
              </>
            )}
          </div>

          {/* Data Labels & Callout Pills */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{isEn ? 'Data Labels' : 'Label Nilai Data'}</span>
              <ChartSwitch
                testId="chart-comp-datalabel"
                checked={config.dataLabel.show}
                onChange={v => commitPatch({ dataLabel: { ...config.dataLabel, show: v } })}
              />
            </div>
            {config.dataLabel.show && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] mut">{isEn ? 'White Pill Badge (35%)' : 'Badge Kapsul Putih (35%)'}</span>
                <ChartSwitch
                  checked={config.dataLabel.pillBadge}
                  onChange={v => commitPatch({ dataLabel: { ...config.dataLabel, pillBadge: v } })}
                />
              </div>
            )}
          </div>

          {/* Axes Format & Reference Lines */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="text-[11px] font-semibold">{isEn ? 'Axes & Reference Lines' : 'Sumbu & Garis Referensi'}</div>
            <div className="grid grid-cols-2 gap-1.5">
              <ChartTextInput
                value={config.yAxis.valuePrefix}
                placeholder={isEn ? 'Prefix ($)' : 'Awalan ($)'}
                onCommit={val => commitPatch({ yAxis: { ...config.yAxis, valuePrefix: val } })}
              />
              <ChartTextInput
                value={config.yAxis.valueSuffix}
                placeholder={isEn ? 'Suffix (k / %)' : 'Akhiran (k / %)'}
                onCommit={val => commitPatch({ yAxis: { ...config.yAxis, valueSuffix: val } })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] mut">{isEn ? 'Average Dashed Line' : 'Garis Rata-rata (Avg)'}</span>
              <ChartSwitch
                testId="chart-comp-markline"
                checked={config.annotations.markLineAvg}
                onChange={v => commitPatch({ annotations: { ...config.annotations, markLineAvg: v } })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] mut">MarkPoint Max / Min</span>
              <ChartSwitch
                checked={config.annotations.markPointMax}
                onChange={v =>
                  commitPatch({ annotations: { ...config.annotations, markPointMax: v, markPointMin: v } })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] mut">{isEn ? 'VisualMap Scale' : 'Skala VisualMap'}</span>
              <ChartSwitch
                checked={config.visualMap.show}
                onChange={v => commitPatch({ visualMap: { ...config.visualMap, show: v } })}
              />
            </div>
          </div>

          {/* Footnote */}
          <div className="p-2 rounded-lg border border-[var(--line)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{isEn ? 'Footnote' : 'Catatan Kaki'}</span>
              <ChartSwitch checked={config.footnote.show} onChange={v => updateFootnote({ show: v })} />
            </div>
            {config.footnote.show && (
              <ChartTextInput
                value={config.footnote.text}
                placeholder="Source: Geovanta"
                onCommit={val => updateFootnote({ text: val })}
                onChange={val => updateFootnote({ text: val }, 'chart-param')}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB: DATA */}
      {tab === 'data' && (
        <ChartDataEditor
          compact
          lang={lang}
          config={config}
          onChange={(nextData, extra) =>
            commitPatch({ ...(extra || {}), data: nextData }, 'chart-param')
          }
        />
      )}

      {/* TAB: COLOR */}
      {tab === 'color' && (
        <div className="space-y-2.5">
          <div>
            <div className="fig-sub-lbl mb-1">{isEn ? '1-Click Themes' : 'Tema 1-Klik'}</div>
            <div className="grid grid-cols-2 gap-1">
              {CHART_THEMES.map(th => (
                <button
                  key={th.id}
                  type="button"
                  data-testid={`chart-theme-${th.id}`}
                  className={
                    'flex items-center gap-1.5 p-1.5 rounded-lg border text-left ' +
                    (config.themeId === th.id ? 'border-[var(--acc)] bg-[var(--sub)]' : 'border-[var(--line)]')
                  }
                  onClick={() => onChangeConfig(applyChartTheme(config, th.id))}
                >
                  <span className="w-3.5 h-3.5 rounded border shrink-0" style={{ background: th.cardBg, borderColor: th.cardBorder }} />
                  <span className="text-[10px] font-medium truncate">{isEn ? th.name : th.nameId}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="fig-sub-lbl mb-1">{isEn ? 'Color Palettes' : 'Palet Warna'}</div>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {CHART_PALETTES.map(pal => (
                <button
                  key={pal.id}
                  type="button"
                  data-testid={`chart-palette-${pal.id}`}
                  className={
                    'p-1.5 rounded-lg border text-left ' +
                    (config.paletteId === pal.id ? 'border-[var(--acc)] bg-[var(--sub)]' : 'border-[var(--line)]')
                  }
                  onClick={() => commitPatch({ paletteId: pal.id, colors: [...pal.colors] })}
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
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="fig-sub-lbl">{isEn ? 'Series Colors' : 'Warna Seri / Item'}</span>
              <button
                type="button"
                className="ved-pill text-[9px] px-1.5 py-0.5"
                onClick={() => commitPatch({ colors: [...config.colors, '#6C5CE7'] })}
              >
                + {isEn ? 'Add' : 'Tambah'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {config.colors.map((c, idx) => (
                <div key={idx} className="flex items-center gap-0.5 border border-[var(--line)] rounded p-0.5 bg-[var(--bg)]">
                  <ChartColorInput
                    testId={`chart-color-input-${idx}`}
                    value={c}
                    L={L}
                    onChange={(hex, meta) => {
                      const next = [...config.colors];
                      next[idx] = hex;
                      commitPatch({ paletteId: 'custom', colors: next }, meta?.isLive ? 'chart-param' : undefined);
                    }}
                  />
                  {config.colors.length > 2 && (
                    <button
                      type="button"
                      className="text-[10px] px-0.5 mut hover:text-red-500"
                      onClick={() =>
                        commitPatch({ colors: config.colors.filter((_, i) => i !== idx) })
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] mut">{isEn ? 'Gradient Fill' : 'Isian Gradien'}</span>
            <ChartSwitch checked={config.useGradient} onChange={v => commitPatch({ useGradient: v })} />
          </div>
          {config.useGradient && (
            <Seg
              o={[
                ['vertical', isEn ? 'Vertical' : 'Vertikal'],
                ['horizontal', isEn ? 'Horiz' : 'Horizontal'],
                ['diagonal', 'Diagonal'],
              ]}
              v={config.gradientDirection}
              on={dir => commitPatch({ gradientDirection: dir as any })}
            />
          )}

          <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
            <span className="text-[11px] mut">{isEn ? 'Transparent BG' : 'Latar Transparan'}</span>
            <ChartSwitch checked={config.transparentBg} onChange={v => commitPatch({ transparentBg: v })} />
          </div>
          {!config.transparentBg && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] mut">{isEn ? 'Background' : 'Warna Latar'}</span>
              <ChartColorInput
                value={config.backgroundColor || '#ffffff'}
                L={L}
                onChange={(hex, meta) => commitPatch({ backgroundColor: hex }, meta?.isLive ? 'chart-param' : undefined)}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB: FONT & TYPOGRAPHY */}
      {tab === 'font' && (
        <div className="space-y-2.5">
          <div>
            <div className="fig-sub-lbl mb-1">{isEn ? 'Target Element' : 'Elemen Teks'}</div>
            <ChartSelect
              testId="chart-font-target"
              value={fontTarget}
              options={[
                ['global', isEn ? 'Global (All Text)' : 'Global (Semua Teks)'],
                ['title', isEn ? 'Chart Title' : 'Judul Chart'],
                ['subtitle', isEn ? 'Subtitle' : 'Subjudul'],
                ['axisLabel', isEn ? 'Axis Labels' : 'Label Sumbu'],
                ['axisName', isEn ? 'Axis Name' : 'Nama Sumbu'],
                ['dataLabel', isEn ? 'Data Labels' : 'Label Data'],
                ['legend', isEn ? 'Legend' : 'Legenda'],
              ]}
              onChange={v => setFontTarget(v as FontTarget)}
              lang={lang}
            />
          </div>

          <div>
            <div className="fig-sub-lbl mb-1">{isEn ? 'Font Family' : 'Jenis Huruf (Font)'}</div>
            <ChartSelect
              testId="chart-font-family"
              searchable
              value={currentFont.family}
              options={allFontOptions.map(f => [f, f, { fontFamily: f }])}
              onChange={v => updateFont(fontTarget, { family: v })}
              lang={lang}
            />
          </div>

          <Range
            l={isEn ? 'Font Size' : 'Ukuran Font'}
            v={currentFont.size}
            min={8}
            max={42}
            step={1}
            f={v => v + 'px'}
            on={(v, meta) => updateFont(fontTarget, { size: v }, meta?.live ? 'chart-param' : undefined)}
          />

          <div className="space-y-1.5">
            <div className="fig-sub-lbl">{isEn ? 'Weight' : 'Ketebalan'}</div>
            <ChartSelect
              value={currentFont.weight}
              options={[
                ['normal', 'Regular'],
                ['500', 'Medium (500)'],
                ['600', 'SemiBold (600)'],
                ['bold', 'Bold'],
              ]}
              onChange={v => updateFont(fontTarget, { weight: v })}
              lang={lang}
            />
          </div>

          <Seg
            o={[['normal', 'Normal'], ['italic', 'Italic']]}
            v={currentFont.style}
            on={st => updateFont(fontTarget, { style: st as any })}
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] mut">{isEn ? 'Text Color' : 'Warna Teks'}</span>
            <ChartColorInput
              testId="chart-font-color"
              value={currentFont.color || '#334155'}
              L={L}
              onChange={(hex, meta) => updateFont(fontTarget, { color: hex }, meta?.isLive ? 'chart-param' : undefined)}
            />
          </div>
        </div>
      )}

      {/* TAB: STYLE */}
      {tab === 'style' && (
        <div className="space-y-2.5">
          <div>
            <div className="fig-sub-lbl mb-1">{isEn ? '25 Chart Styles' : '25 Style Chart (Geometri)'}</div>
            <ChartSelect
              value={styleCatFilter}
              options={CHART_STYLE_CATEGORIES.map(c => [c.id, isEn ? c.labelEn : c.labelId])}
              onChange={v => setStyleCatFilter(v as ChartStyleCategoryId)}
              lang={lang}
            />
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5 mt-1.5">
              {CHART_STYLES.filter(st => styleCatFilter === 'all' || st.category === styleCatFilter).map(st => {
                const active = (config.chartStyleId || 'saas-clean') === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    data-testid={`chart-style-${st.id}`}
                    className={
                      'w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-colors ' +
                      (active
                        ? 'border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_14%,var(--card))]'
                        : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)]')
                    }
                    onClick={() => onChangeConfig(applyChartStyle(config, st.id))}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d={st.iconPath} />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-semibold truncate">{isEn ? st.labelEn : st.labelId}</div>
                      <div className="text-[9px] mut truncate">{isEn ? st.descEn : st.descId}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pt-1.5 border-t border-[var(--line)] space-y-2.5">
          {config.chartType === 'line' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Smooth Curve' : 'Kurva Halus'}</span>
                <ChartSwitch checked={config.seriesStyle.smooth} onChange={v => updateSeriesStyle({ smooth: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Area Fill' : 'Isian Area'}</span>
                <ChartSwitch checked={config.seriesStyle.areaFill} onChange={v => updateSeriesStyle({ areaFill: v })} />
              </div>
              <Range
                l={isEn ? 'Line Width' : 'Tebal Garis'}
                v={config.seriesStyle.lineWidth}
                min={1}
                max={12}
                step={1}
                f={v => v + 'px'}
                on={(v, m) => updateSeriesStyle({ lineWidth: v }, m?.live ? 'chart-param' : undefined)}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Show Points' : 'Titik Simbol'}</span>
                <ChartSwitch checked={config.seriesStyle.showSymbol} onChange={v => updateSeriesStyle({ showSymbol: v })} />
              </div>
            </>
          )}

          {config.chartType === 'bar' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Stacked' : 'Bertumpuk (Stack)'}</span>
                <ChartSwitch checked={config.seriesStyle.stack} onChange={v => updateSeriesStyle({ stack: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Horizontal' : 'Horizontal'}</span>
                <ChartSwitch checked={config.seriesStyle.horizontal} onChange={v => updateSeriesStyle({ horizontal: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Polar Bar' : 'Koordinat Polar'}</span>
                <ChartSwitch checked={config.seriesStyle.polar} onChange={v => updateSeriesStyle({ polar: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Background Track' : 'Track Latar'}</span>
                <ChartSwitch checked={config.seriesStyle.showBarBackground} onChange={v => updateSeriesStyle({ showBarBackground: v })} />
              </div>
              <Range
                l={isEn ? 'Bar Width' : 'Lebar Batang'}
                v={config.seriesStyle.barWidth || 12}
                min={4}
                max={48}
                step={1}
                f={v => v + 'px'}
                on={(v, m) => updateSeriesStyle({ barWidth: v }, m?.live ? 'chart-param' : undefined)}
              />
              <Range
                l={isEn ? 'Pill Radius' : 'Radius Kapsul'}
                v={config.seriesStyle.barBorderRadius}
                min={0}
                max={99}
                step={1}
                f={v => v + 'px'}
                on={(v, m) => updateSeriesStyle({ barBorderRadius: v }, m?.live ? 'chart-param' : undefined)}
              />
            </>
          )}

          {config.chartType === 'pie' && (
            <>
              <Range
                l={isEn ? 'Inner Radius' : 'Radius Dalam (Donat)'}
                v={config.seriesStyle.pieInnerRadius}
                min={0}
                max={80}
                step={1}
                f={v => v + '%'}
                on={(v, m) => updateSeriesStyle({ pieInnerRadius: v }, m?.live ? 'chart-param' : undefined)}
              />
              <Range
                l={isEn ? 'Outer Radius' : 'Radius Luar'}
                v={config.seriesStyle.pieOuterRadius}
                min={25}
                max={95}
                step={1}
                f={v => v + '%'}
                on={(v, m) => updateSeriesStyle({ pieOuterRadius: v }, m?.live ? 'chart-param' : undefined)}
              />
              <Range
                l={isEn ? 'Pad Angle' : 'Celah Slice'}
                v={config.seriesStyle.piePadAngle}
                min={0}
                max={12}
                step={1}
                f={v => v + '°'}
                on={(v, m) => updateSeriesStyle({ piePadAngle: v }, m?.live ? 'chart-param' : undefined)}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Half Pie' : 'Setengah Lingkaran'}</span>
                <ChartSwitch checked={config.seriesStyle.pieHalf} onChange={v => updateSeriesStyle({ pieHalf: v })} />
              </div>
              <div>
                <div className="text-[10px] mut mb-0.5">Rose Mode</div>
                <Seg
                  o={[['off', 'Normal'], ['radius', 'Radius'], ['area', 'Area']]}
                  v={config.seriesStyle.pieRoseType || 'off'}
                  on={v => updateSeriesStyle({ pieRoseType: v === 'off' ? false : (v as any) })}
                />
              </div>
              {config.seriesStyle.pieInnerRadius >= 30 && (
                <div className="pt-1.5 border-t border-[var(--line)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] mut">{isEn ? 'Donut Center Metric' : 'Angka Tengah Donat'}</span>
                    <ChartSwitch checked={config.seriesStyle.showDonutCenter !== false} onChange={v => updateSeriesStyle({ showDonutCenter: v })} />
                  </div>
                  {config.seriesStyle.showDonutCenter !== false && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <ChartTextInput
                        value={config.seriesStyle.donutCenterValue || ''}
                        placeholder={isEn ? 'Auto sum' : 'Otomatis'}
                        onCommit={val => updateSeriesStyle({ donutCenterValue: val })}
                        onChange={val => updateSeriesStyle({ donutCenterValue: val }, 'chart-param')}
                      />
                      <ChartTextInput
                        value={config.seriesStyle.donutCenterLabel ?? 'Total'}
                        placeholder="Total"
                        onCommit={val => updateSeriesStyle({ donutCenterLabel: val })}
                        onChange={val => updateSeriesStyle({ donutCenterLabel: val }, 'chart-param')}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {config.chartType === 'gauge' && (
            <>
              <Range
                l={isEn ? 'Start Angle' : 'Sudut Awal'}
                v={config.seriesStyle.gaugeStartAngle}
                min={0}
                max={360}
                step={5}
                f={v => v + '°'}
                on={(v, m) => updateSeriesStyle({ gaugeStartAngle: v }, m?.live ? 'chart-param' : undefined)}
              />
              <Range
                l={isEn ? 'End Angle' : 'Sudut Akhir'}
                v={config.seriesStyle.gaugeEndAngle}
                min={-180}
                max={180}
                step={5}
                f={v => v + '°'}
                on={(v, m) => updateSeriesStyle({ gaugeEndAngle: v }, m?.live ? 'chart-param' : undefined)}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Progress Arc' : 'Busur Progres'}</span>
                <ChartSwitch checked={config.seriesStyle.gaugeProgress} onChange={v => updateSeriesStyle({ gaugeProgress: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] mut">{isEn ? 'Pointer Needle' : 'Jarum Penunjuk'}</span>
                <ChartSwitch checked={config.seriesStyle.gaugePointer} onChange={v => updateSeriesStyle({ gaugePointer: v })} />
              </div>
            </>
          )}

          {config.chartType === 'radar' && (
            <Seg
              o={[['polygon', 'Polygon'], ['circle', isEn ? 'Circle' : 'Lingkaran']]}
              v={config.seriesStyle.radarShape}
              on={v => updateSeriesStyle({ radarShape: v as any })}
            />
          )}

          {config.chartType === 'tree' && (
            <Seg
              o={[['LR', 'LR'], ['TB', 'TB'], ['RL', 'RL'], ['radial', 'Radial']]}
              v={config.seriesStyle.treeOrient}
              on={v => updateSeriesStyle({ treeOrient: v as any })}
            />
          )}

          {config.chartType === 'sankey' && (
            <>
              <Range
                l={isEn ? 'Node Width' : 'Lebar Simpul'}
                v={config.seriesStyle.sankeyNodeWidth}
                min={6}
                max={40}
                step={1}
                f={v => v + 'px'}
                on={(v, m) => updateSeriesStyle({ sankeyNodeWidth: v }, m?.live ? 'chart-param' : undefined)}
              />
              <Range
                l={isEn ? 'Curveness' : 'Kelengkungan'}
                v={Math.round(config.seriesStyle.sankeyCurveness * 100)}
                min={0}
                max={100}
                step={5}
                f={v => v + '%'}
                on={(v, m) => updateSeriesStyle({ sankeyCurveness: v / 100 }, m?.live ? 'chart-param' : undefined)}
              />
            </>
          )}

          <Range
            l={isEn ? 'Series Opacity' : 'Opasitas Seri'}
            v={Math.round((config.seriesStyle.opacity ?? 1) * 100)}
            min={10}
            max={100}
            step={5}
            f={v => v + '%'}
            on={(v, m) => updateSeriesStyle({ opacity: v / 100 }, m?.live ? 'chart-param' : undefined)}
          />
          </div>
        </div>
      )}

      {/* TAB: LAYOUT & SIZE */}
      {tab === 'layout' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[10px] mut mb-0.5">{isEn ? 'Width' : 'Lebar'}</div>
              <ChartNumberInput
                value={config.width}
                min={160}
                max={4000}
                onCommit={v => commitPatch({ width: Math.max(160, v) })}
              />
            </div>
            <div>
              <div className="text-[10px] mut mb-0.5">{isEn ? 'Height' : 'Tinggi'}</div>
              <ChartNumberInput
                value={config.height}
                min={120}
                max={4000}
                onCommit={v => commitPatch({ height: Math.max(120, v) })}
              />
            </div>
          </div>

          <div className="pt-1.5 border-t border-[var(--line)] space-y-1.5">
            <div className="text-[11px] font-medium">{isEn ? 'Axes & Grid' : 'Sumbu & Grid'}</div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] mut">{isEn ? 'Show X Axis' : 'Tampilkan Sumbu X'}</span>
              <ChartSwitch checked={config.xAxis.show} onChange={v => commitPatch({ xAxis: { ...config.xAxis, show: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] mut">{isEn ? 'Show Y Axis' : 'Tampilkan Sumbu Y'}</span>
              <ChartSwitch checked={config.yAxis.show} onChange={v => commitPatch({ yAxis: { ...config.yAxis, show: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] mut">{isEn ? 'Y Split Lines' : 'Garis Grid Horizontal'}</span>
              <ChartSwitch checked={config.yAxis.splitLine} onChange={v => commitPatch({ yAxis: { ...config.yAxis, splitLine: v } })} />
            </div>
            <Range
              l={isEn ? 'Grid Top' : 'Margin Atas'}
              v={config.grid.top}
              min={10}
              max={150}
              step={2}
              f={v => v + 'px'}
              on={(v, m) => updateGrid({ top: v }, m?.live ? 'chart-param' : undefined)}
            />
            <Range
              l={isEn ? 'Grid Bottom' : 'Margin Bawah'}
              v={config.grid.bottom}
              min={10}
              max={120}
              step={2}
              f={v => v + 'px'}
              on={(v, m) => updateGrid({ bottom: v }, m?.live ? 'chart-param' : undefined)}
            />
          </div>
        </div>
      )}

      {/* TAB: RAW ECHARTS JSON */}
      {tab === 'json' && (
        <div className="space-y-1.5">
          <div className="text-[10px] mut">
            {isEn
              ? 'Override any Apache ECharts option JSON (deep-merged):'
              : 'Override JSON opsi Apache ECharts bebas (deep-merge):'}
          </div>
          {jsonErr && (
            <div className="text-[10px] text-red-500 bg-red-500/10 rounded px-1.5 py-1">{jsonErr}</div>
          )}
          <ChartCodeBox
            value={jsonDraft}
            onChange={setJsonDraft}
            placeholder={'{\n  "title": { "textStyle": { "letterSpacing": 2 } }\n}'}
            minHeight={130}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn pri text-[10px] flex-1 py-1 rounded-lg"
              onClick={() => {
                if (!jsonDraft.trim()) {
                  setJsonErr('');
                  commitPatch({ customOptionJson: '' });
                  return;
                }
                try {
                  JSON.parse(jsonDraft);
                  setJsonErr('');
                  commitPatch({ customOptionJson: jsonDraft });
                } catch (e: any) {
                  setJsonErr(e?.message || 'JSON tidak valid');
                }
              }}
            >
              {isEn ? 'Apply JSON' : 'Terapkan JSON'}
            </button>
            <button
              type="button"
              className="ved-pill text-[10px] px-2 py-1"
              onClick={() => {
                setJsonDraft('');
                setJsonErr('');
                commitPatch({ customOptionJson: '' });
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartInspectorPanel;
