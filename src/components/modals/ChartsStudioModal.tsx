/**
 * @file src/components/modals/ChartsStudioModal.tsx
 * @description Modal Charts Studio: Katalog 22 tipe Apache ECharts, Live Vector Preview, & Komponen Lanjutan (0% native HTML input)
 */
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { usePresence } from '../../utils/presenceAndFilePicker.tsx';
import { ChartConfig, CHART_PALETTES, EChartsSeriesType } from '../../engine/charts/chartTypes.ts';
import {
  CHART_CATALOG,
  CHART_CATEGORIES,
  ChartCategoryId,
  createChartConfigForType,
  convertChartConfigType,
} from '../../engine/charts/chartCatalog.ts';
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

type StudioRightTab = 'components' | 'data' | 'color' | 'font' | 'json';

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
  const [rightTab, setRightTab] = useState<StudioRightTab>('components');
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonErr, setJsonErr] = useState('');

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

  const previewUri = useMemo(() => {
    if (!previewResult.svg) return '';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(previewResult.svg);
  }, [previewResult.svg]);

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
          width: 'min(1240px, 95vw)',
          maxWidth: '95vw',
          height: 'min(850px, 90vh)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
          overflow: 'hidden',
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
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[265px_1fr_320px] gap-4 py-3 overflow-hidden">
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
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--line)] bg-[var(--card)] text-[11px]">
              <span className="font-medium">
                {isEn ? 'Live Vector Preview' : 'Pratinjau Vektor Langsung'} ({draft.chartType})
              </span>
              <div className="flex items-center gap-1.5">
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
            <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto">
              {previewResult.error ? (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-md text-center">
                  {previewResult.error}
                </div>
              ) : previewUri ? (
                <img
                  src={previewUri}
                  alt="Chart Preview"
                  data-testid="charts-studio-preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: draft.card.show ? draft.card.borderRadius : 8,
                    boxShadow: '0 8px 28px rgba(15,23,42,0.08)',
                    background: draft.transparentBg && !draft.card.show
                      ? 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px'
                      : 'transparent',
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* Right: Quick Customize */}
          <div className="flex flex-col min-h-0 border border-[var(--line)] rounded-xl p-3 bg-[var(--card)]">
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-[var(--sub)] mb-3 shrink-0">
              {(
                [
                  ['components', isEn ? 'Comp' : 'Komponen'],
                  ['data', 'Data'],
                  ['color', isEn ? 'Color' : 'Warna'],
                  ['font', 'Font'],
                  ['json', 'JSON'],
                ] as const
              ).map(([id, lbl]) => {
                const active = rightTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={
                      'text-[10px] py-1 px-1 rounded-lg text-center transition-all truncate ' +
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
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">{isEn ? 'Card Frame' : 'Bingkai Kartu'}</span>
                    <ChartSwitch
                      checked={draft.card.show}
                      onChange={v => setDraft(p => ({ ...p, card: { ...p.card, show: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">{isEn ? 'KPI Hero & Badge' : 'KPI Hero & Badge'}</span>
                    <ChartSwitch
                      checked={draft.kpi.show}
                      onChange={v => setDraft(p => ({ ...p, kpi: { ...p.kpi, show: v } }))}
                    />
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
                    <span className="text-[11px]">{isEn ? 'Show Data Labels' : 'Tampilkan Label Nilai'}</span>
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
