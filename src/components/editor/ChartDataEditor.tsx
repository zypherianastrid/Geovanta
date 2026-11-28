/**
 * @file src/components/editor/ChartDataEditor.tsx
 * @description Editor data interaktif (Tabel, CSV/JSON, & GeoJSON) 100% kontrol kustom Geovanta
 */
import React, { useState, useEffect } from 'react';
import { ChartConfig, ChartDataPayload } from '../../engine/charts/chartTypes.ts';
import { DATA_KIND_BY_TYPE } from '../../engine/charts/chartCatalog.ts';
import { chartDataToCsv, parseCsvToChartData } from '../../engine/charts/echartsOptionBuilder.ts';
import { registerCustomGeoMap, listRegisteredGeoMaps } from '../../engine/charts/builtInGeoMaps.ts';
import { getEChartsInstanceModule } from '../../engine/charts/chartVectorRenderer.ts';
import { parseTsvOrCsvText } from '../../engine/charts/chartV2Helpers.ts';
import { pickFiles } from '../../utils/presenceAndFilePicker.tsx';
import { ChartTextInput, ChartNumberInput, ChartSelect, ChartCodeBox } from './ChartCustomInputs.tsx';

interface ChartDataEditorProps {
  config: ChartConfig;
  onChange: (nextData: ChartDataPayload, extraPatch?: Partial<ChartConfig>) => void;
  compact?: boolean;
  lang?: string;
}

export const ChartDataEditor: React.FC<ChartDataEditorProps> = ({
  config,
  onChange,
  compact = false,
  lang = 'id',
}) => {
  const isEn = lang === 'en';
  const kind = DATA_KIND_BY_TYPE[config.chartType] || 'tabular';
  const d = config.data;

  const [mode, setMode] = useState<'table' | 'csv' | 'json'>('table');
  const [csvText, setCsvText] = useState(() => chartDataToCsv(config));
  const [jsonText, setJsonText] = useState(() => JSON.stringify(d, null, 2));
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    setCsvText(chartDataToCsv(config));
    setJsonText(JSON.stringify(config.data, null, 2));
    setErrMsg('');
  }, [config.chartType, config.data]);

  const applyCsv = () => {
    try {
      const next = parseCsvToChartData(csvText, config.chartType, d);
      onChange(next);
      setErrMsg('');
    } catch (e: any) {
      setErrMsg(e?.message || 'CSV error');
    }
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object') throw new Error('JSON harus berupa objek');
      onChange({ ...d, ...parsed });
      setErrMsg('');
    } catch (e: any) {
      setErrMsg(e?.message || 'JSON tidak valid');
    }
  };

  const handlePickGeoJson = () => {
    pickFiles('.json,.geojson,application/json', (files: FileList | File[]) => {
      const file = files && files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const geo = JSON.parse(String(reader.result || ''));
          const baseName = file.name.replace(/\.(geo)?json$/i, '');
          const registeredName = registerCustomGeoMap(getEChartsInstanceModule(), baseName, geo);
          const features: any[] = Array.isArray(geo.features) ? geo.features : [];
          const newMapData = features.slice(0, 24).map((f, i) => ({
            name: String(f?.properties?.name || f?.properties?.NAME || f?.id || `Area ${i + 1}`),
            value: Math.round(30 + ((i * 17) % 70)),
          }));
          onChange(
            newMapData.length ? { ...d, mapData: newMapData } : d,
            { seriesStyle: { ...config.seriesStyle, mapName: registeredName } }
          );
          setErrMsg('');
        } catch (err: any) {
          setErrMsg(err?.message || 'GeoJSON tidak valid');
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="space-y-2" data-testid="chart-data-editor">
      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {(['table', 'csv', 'json'] as const).map(m => (
            <button
              key={m}
              type="button"
              className={'ved-pill text-[10px] px-2 py-0.5 ' + (mode === m ? 'on' : '')}
              onClick={() => setMode(m)}
            >
              {m === 'table' ? (isEn ? 'Table' : 'Tabel') : m.toUpperCase()}
            </button>
          ))}
        </div>
        {(kind === 'map' || kind === 'lines') && (
          <button
            type="button"
            className="ved-pill text-[10px] px-2 py-0.5"
            onClick={handlePickGeoJson}
          >
            + GeoJSON
          </button>
        )}
      </div>

      {errMsg && (
        <div className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
          {errMsg}
        </div>
      )}

      {mode === 'csv' && (
        <div className="space-y-1.5">
          <ChartCodeBox
            value={csvText}
            onChange={setCsvText}
            ariaLabel="CSV Data"
            minHeight={compact ? 110 : 180}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              data-testid="chart-import-csv-file"
              className="btn sec text-[11px] flex-1 py-1 rounded-lg"
              onClick={() => {
                pickFiles('.csv,.tsv,text/csv,text/tab-separated-values', (files: FileList | File[]) => {
                  const file = files && files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const normalized = parseTsvOrCsvText(String(reader.result || ''));
                    setCsvText(normalized);
                    try {
                      onChange(parseCsvToChartData(normalized, config.chartType, d));
                      setErrMsg('');
                    } catch (e: any) {
                      setErrMsg(e?.message || 'CSV/TSV error');
                    }
                  };
                  reader.readAsText(file);
                });
              }}
            >
              {isEn ? 'Import CSV/TSV' : 'Impor CSV/TSV'}
            </button>
            <button type="button" className="btn pri text-[11px] flex-1 py-1 rounded-lg" onClick={applyCsv}>
              {isEn ? 'Apply CSV' : 'Terapkan CSV'}
            </button>
          </div>
        </div>
      )}

      {mode === 'json' && (
        <div className="space-y-1.5">
          <ChartCodeBox
            value={jsonText}
            onChange={setJsonText}
            ariaLabel="JSON Data"
            minHeight={compact ? 130 : 210}
          />
          <button type="button" className="btn pri text-[11px] w-full py-1 rounded-lg" onClick={applyJson}>
            {isEn ? 'Apply JSON Data' : 'Terapkan Data JSON'}
          </button>
        </div>
      )}

      {mode === 'table' && kind === 'tabular' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="chart-data-sort-asc"
              className="ved-pill text-[9px] px-1.5 py-0.5 flex-1"
              onClick={() => {
                const order = d.categories.map((_, i) => i).sort((a, b) => (d.series[0]?.data[a] ?? 0) - (d.series[0]?.data[b] ?? 0));
                onChange({
                  ...d,
                  categories: order.map(i => d.categories[i]),
                  series: d.series.map(sr => ({ ...sr, data: order.map(i => sr.data[i] ?? 0) })),
                });
              }}
            >
              {isEn ? 'Sort ↑' : 'Urut ↑'}
            </button>
            <button
              type="button"
              data-testid="chart-data-sort-desc"
              className="ved-pill text-[9px] px-1.5 py-0.5 flex-1"
              onClick={() => {
                const order = d.categories.map((_, i) => i).sort((a, b) => (d.series[0]?.data[b] ?? 0) - (d.series[0]?.data[a] ?? 0));
                onChange({
                  ...d,
                  categories: order.map(i => d.categories[i]),
                  series: d.series.map(sr => ({ ...sr, data: order.map(i => sr.data[i] ?? 0) })),
                });
              }}
            >
              {isEn ? 'Sort ↓' : 'Urut ↓'}
            </button>
            <button
              type="button"
              data-testid="chart-data-transpose"
              className="ved-pill text-[9px] px-1.5 py-0.5 flex-1"
              onClick={() => {
                if (!d.categories.length || !d.series.length) return;
                const nextCats = d.series.map(s => s.name);
                const nextSeries = d.categories.map((cat, ci) => ({
                  name: cat,
                  data: d.series.map(s => s.data[ci] ?? 0),
                }));
                onChange({ ...d, categories: nextCats, series: nextSeries });
              }}
            >
              {isEn ? 'Swap' : 'Tukar'}
            </button>
          </div>
          <div className="overflow-x-auto max-h-56 overflow-y-auto border border-[var(--line)] rounded-lg">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-[var(--sub)]">
                  <th className="p-1 text-left font-medium">{isEn ? 'Label' : 'Kategori'}</th>
                  {d.series.map((s, si) => (
                    <th key={si} className="p-1 text-left font-medium min-w-[74px]">
                      <div className="flex items-center gap-0.5">
                        <ChartTextInput
                          value={s.name}
                          className="flex-1"
                          onCommit={val => {
                            const nextSeries = d.series.map((sr, i) =>
                              i === si ? { ...sr, name: val } : sr
                            );
                            onChange({ ...d, series: nextSeries });
                          }}
                        />
                        {d.series.length > 1 && (
                          <button
                            type="button"
                            className="text-[10px] px-1 mut hover:text-red-500"
                            title={isEn ? 'Remove series' : 'Hapus seri'}
                            onClick={() => {
                              const nextSeries = d.series.filter((_, i) => i !== si);
                              onChange({ ...d, series: nextSeries });
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-5"></th>
                </tr>
              </thead>
              <tbody>
                {d.categories.map((cat, ri) => (
                  <tr key={ri} className="border-t border-[var(--line)]">
                    <td className="p-1">
                      <ChartTextInput
                        value={cat}
                        onCommit={val => {
                          const cats = [...d.categories];
                          cats[ri] = val;
                          onChange({ ...d, categories: cats });
                        }}
                      />
                    </td>
                    {d.series.map((s, si) => (
                      <td key={si} className="p-1">
                        <ChartNumberInput
                          testId={`chart-cell-${ri}-${si}`}
                          value={s.data[ri] ?? 0}
                          onCommit={val => {
                            const nextSeries = d.series.map((sr, idx) => {
                              if (idx !== si) return sr;
                              const nd = [...sr.data];
                              nd[ri] = val;
                              return { ...sr, data: nd };
                            });
                            onChange({ ...d, series: nextSeries });
                          }}
                        />
                      </td>
                    ))}
                    <td className="p-0.5 text-center">
                      {d.categories.length > 1 && (
                        <button
                          type="button"
                          className="text-[11px] mut hover:text-red-500"
                          onClick={() => {
                            const cats = d.categories.filter((_, i) => i !== ri);
                            const nextSeries = d.series.map(sr => ({
                              ...sr,
                              data: sr.data.filter((_, i) => i !== ri),
                            }));
                            onChange({ ...d, categories: cats, series: nextSeries });
                          }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="ved-pill text-[10px] flex-1"
              onClick={() => {
                const cats = [...d.categories, `Item ${d.categories.length + 1}`];
                const nextSeries = d.series.map(sr => ({
                  ...sr,
                  data: [...sr.data, Math.round(25 + Math.random() * 60)],
                }));
                onChange({ ...d, categories: cats, series: nextSeries });
              }}
            >
              + {isEn ? 'Row' : 'Baris'}
            </button>
            <button
              type="button"
              className="ved-pill text-[10px] flex-1"
              onClick={() => {
                const nextSeries = [
                  ...d.series,
                  {
                    name: `Seri ${d.series.length + 1}`,
                    data: d.categories.map(() => Math.round(20 + Math.random() * 60)),
                  },
                ];
                onChange({ ...d, series: nextSeries });
              }}
            >
              + {isEn ? 'Series' : 'Seri'}
            </button>
          </div>
        </div>
      )}

      {mode === 'table' && (kind === 'pie' || kind === 'map') && (() => {
        const list = kind === 'map' ? d.mapData : d.items;
        const updateList = (nextList: Array<{ name: string; value: number }>) => {
          onChange(kind === 'map' ? { ...d, mapData: nextList } : { ...d, items: nextList });
        };
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="chart-data-sort-asc"
                className="ved-pill text-[9px] px-1.5 py-0.5 flex-1"
                onClick={() => updateList([...list].sort((a, b) => a.value - b.value))}
              >
                {isEn ? 'Sort ↑' : 'Urut ↑'}
              </button>
              <button
                type="button"
                data-testid="chart-data-sort-desc"
                className="ved-pill text-[9px] px-1.5 py-0.5 flex-1"
                onClick={() => updateList([...list].sort((a, b) => b.value - a.value))}
              >
                {isEn ? 'Sort ↓' : 'Urut ↓'}
              </button>
            </div>
            {kind === 'map' && (
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] mut">{isEn ? 'Region Map' : 'Peta Wilayah'}</span>
                <div className="w-36">
                  <ChartSelect
                    value={config.seriesStyle.mapName || 'indonesia'}
                    options={listRegisteredGeoMaps().map(m => [m, m])}
                    onChange={val =>
                      onChange(d, {
                        seriesStyle: { ...config.seriesStyle, mapName: val },
                      })
                    }
                    lang={lang}
                  />
                </div>
              </div>
            )}
            <div className="max-h-56 overflow-y-auto space-y-1 border border-[var(--line)] rounded-lg p-1.5">
              {list.map((it, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <ChartTextInput
                    value={it.name}
                    className="flex-1"
                    onCommit={val => {
                      const next = list.map((x, i) => (i === idx ? { ...x, name: val } : x));
                      updateList(next);
                    }}
                  />
                  <ChartNumberInput
                    value={it.value}
                    className="w-20"
                    onCommit={val => {
                      const next = list.map((x, i) => (i === idx ? { ...x, value: val } : x));
                      updateList(next);
                    }}
                  />
                  {list.length > 1 && (
                    <button
                      type="button"
                      className="text-[11px] px-1 mut hover:text-red-500"
                      onClick={() => updateList(list.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="ved-pill text-[10px] w-full"
              onClick={() =>
                updateList([
                  ...list,
                  { name: `Item ${list.length + 1}`, value: Math.round(20 + Math.random() * 80) },
                ])
              }
            >
              + {isEn ? 'Add Item' : 'Tambah Item'}
            </button>
          </div>
        );
      })()}

      {mode === 'table' && kind === 'gauge' && (
        <div className="space-y-2 border border-[var(--line)] rounded-lg p-2">
          <div>
            <div className="text-[10px] mut mb-0.5">{isEn ? 'Label' : 'Label Indikator'}</div>
            <ChartTextInput
              value={d.gaugeName}
              onCommit={val => onChange({ ...d, gaugeName: val })}
            />
          </div>
          <div>
            <div className="text-[10px] mut mb-0.5">{isEn ? 'Value' : 'Nilai'}</div>
            <ChartNumberInput
              value={d.gaugeValue}
              onCommit={val => onChange({ ...d, gaugeValue: val })}
            />
          </div>
        </div>
      )}

      {mode === 'table' && kind === 'radar' && (
        <div className="space-y-2">
          <div className="text-[10px] mut font-semibold">{isEn ? 'Indicators' : 'Indikator'}</div>
          <div className="max-h-32 overflow-y-auto space-y-1 border border-[var(--line)] rounded-lg p-1.5">
            {d.radarIndicators.map((ind, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <ChartTextInput
                  value={ind.name}
                  className="flex-1"
                  onCommit={val => {
                    const next = d.radarIndicators.map((x, i) => (i === idx ? { ...x, name: val } : x));
                    onChange({ ...d, radarIndicators: next });
                  }}
                />
                <ChartNumberInput
                  value={ind.max}
                  min={1}
                  className="w-16"
                  onCommit={val => {
                    const next = d.radarIndicators.map((x, i) => (i === idx ? { ...x, max: Math.max(1, val) } : x));
                    onChange({ ...d, radarIndicators: next });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="text-[10px] mut font-semibold">{isEn ? 'Series Values' : 'Nilai Seri'}</div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 border border-[var(--line)] rounded-lg p-1.5">
            {d.radarSeries.map((rs, si) => (
              <div key={si} className="space-y-1">
                <ChartTextInput
                  value={rs.name}
                  onCommit={val => {
                    const next = d.radarSeries.map((x, i) => (i === si ? { ...x, name: val } : x));
                    onChange({ ...d, radarSeries: next });
                  }}
                />
                <ChartTextInput
                  value={rs.value.join(', ')}
                  onCommit={val => {
                    const nums = val.split(',').map(v => parseFloat(v.trim()) || 0);
                    const next = d.radarSeries.map((x, i) => (i === si ? { ...x, value: nums } : x));
                    onChange({ ...d, radarSeries: next });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'table' && !['tabular', 'pie', 'map', 'gauge', 'radar'].includes(kind) && (
        <div className="space-y-1.5">
          <div className="text-[10px] mut">
            {isEn
              ? 'Edit structured data below (JSON) and click Apply:'
              : 'Edit struktur data langsung di bawah ini (JSON) lalu klik Terapkan:'}
          </div>
          <ChartCodeBox
            value={jsonText}
            onChange={setJsonText}
            minHeight={compact ? 130 : 210}
          />
          <button type="button" className="btn pri text-[11px] w-full py-1 rounded-lg" onClick={applyJson}>
            {isEn ? 'Apply Data' : 'Terapkan Data'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChartDataEditor;
