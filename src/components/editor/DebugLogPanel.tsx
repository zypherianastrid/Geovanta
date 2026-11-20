/**
 * @file src/components/editor/DebugLogPanel.tsx
 * @description Panel Debugging Mode Terpadu (0% Native HTML Input):
 * - Live interaction log stream dengan filter kategori (Select kustom) & pencarian (CustomTextBox).
 * - Konsol Fungsi realtime (active function + stream perubahan).
 * - Tab Engine & Visual: kontrol mesh/wireframe overlay, telemetri GPU/CPU, skenario uji & benchmark runner.
 * - Tombol ekspor JSON dan Markdown.
 */
import React, { useState, useEffect } from 'react';
import { DEBUG_LOG, DEBUG_CATEGORIES } from '../../utils/debugLogger.tsx';
import { DebugFunctionConsole } from './DebugFunctionConsole.tsx';
import { Select } from '../ui/SelectDropdown.tsx';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';
import { Ico } from '../ui/IconGlyphs.tsx';
import { updateRenderConfig, PERF_TELEMETRY, RENDER_CONFIG } from '../../utils/renderConfigAndTelemetry.tsx';
import { GEOMETRY_CACHE } from '../../renderer/geometryCache.tsx';
import { GEOVANTA_BENCHMARK_SUITE } from '../../renderer/benchmarkSuite.tsx';
import { VE } from '../../engine/vectorEngine.tsx';

const CATEGORY_OPTIONS = [
  ['all', 'Semua Kategori', 'layers'],
  ['tool', 'tool (Alat)', 'wand'],
  ['selection', 'selection (Seleksi)', 'shapes'],
  ['pointer', 'pointer (Kursor)', 'eye'],
  ['canvas', 'canvas (Kanvas)', 'grid'],
  ['edit', 'edit (Transformasi)', 'sliders'],
  ['document', 'document (Dokumen)', 'objects'],
  ['shortcut', 'shortcut (Pintasan)', 'keyboard'],
  ['error', 'error (Kesalahan)', 'x'],
  ['perf', 'perf (Telemetri)', 'bolt']
];

const OVERLAY_OPTIONS = [
  ['none', 'Normal'],
  ['original', '1. Original Path'],
  ['polyline', '2. Flattened Polyline'],
  ['mesh', '3. Tessellation Mesh'],
  ['fill_tris', '4. Fill Triangles'],
  ['stroke_tris', '5. Stroke Triangles'],
  ['seam_guard', '6. Seam Candidates']
];

const DebugLogPanel = ({
  open,
  enabled,
  onToggle,
  onClose
}) => {
  const [entries, setEntries] = useState(() => DEBUG_LOG.getEntries());
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('log');
  const [paused, setPaused] = useState(() => DEBUG_LOG.isPaused());
  const [renderCfg, setRenderCfgS] = useState(() => ({ ...RENDER_CONFIG }));
  const [benchResults, setBenchResults] = useState(null);

  useEffect(() => {
    if (!open) return;
    const refresh = () => setEntries(DEBUG_LOG.getEntries());
    refresh();
    const unsub = DEBUG_LOG.subscribe(refresh);
    return unsub;
  }, [open]);

  useEffect(() => {
    const onCfg = () => setRenderCfgS({ ...RENDER_CONFIG });
    window.addEventListener('geovanta-render-config', onCfg);
    return () => window.removeEventListener('geovanta-render-config', onCfg);
  }, []);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const shown = entries.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false;
    if (!q) return true;
    return (e.action + ' ' + e.fn + ' ' + e.file + ' ' + e.detail).toLowerCase().includes(q);
  });

  const togglePause = () => {
    const next = !paused;
    DEBUG_LOG.setPaused(next);
    setPaused(next);
  };

  const timeOf = ts => {
    try {
      return String(ts || '').slice(11, 19);
    } catch (e) {
      return '';
    }
  };

  const edApi = typeof window !== 'undefined' && window.__geovantaEditorApi ? window.__geovantaEditorApi : {};
  const snap = PERF_TELEMETRY.getSnapshot();
  const cacheStats = typeof GEOMETRY_CACHE !== 'undefined' && GEOMETRY_CACHE ? GEOMETRY_CACHE.getStats() : { hits: 0, misses: 0 };

  const loadTestSvg = (svgStr, label) => {
    if (edApi.loadTestSvg) edApi.loadTestSvg(svgStr, label);
  };
  const loadTestDoc = (d, label) => {
    if (edApi.loadTestDoc) edApi.loadTestDoc(d, label);
  };
  const runBenchmarks = () => {
    if (edApi.runAutomatedBenchmarks) {
      const rows = edApi.runAutomatedBenchmarks();
      if (rows) setBenchResults(rows);
    }
  };

  const isConsole = tab === 'console';

  return (
    <div
      className="ved-debug-panel"
      style={isConsole ? {
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 480,
        maxWidth: 'calc(100vw - 24px)',
        height: '100vh',
        maxHeight: '100vh',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card)',
        color: 'var(--ink)',
        border: '1px solid var(--line)',
        borderRight: 'none',
        borderRadius: 0,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.35)',
        overflow: 'hidden'
      } : {
        position: 'fixed',
        right: 12,
        bottom: 12,
        width: 480,
        maxWidth: 'calc(100vw - 24px)',
        height: 420,
        maxHeight: 'calc(100vh - 24px)',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card)',
        color: 'var(--ink)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: '0 10px 32px rgba(0,0,0,0.32)',
        overflow: 'hidden'
      }}
      role="complementary"
      aria-label="Panel Debugging Mode"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--sub)'
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: enabled ? '#22c55e' : '#94a3b8',
            flexShrink: 0
          }}
        />
        <strong style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ico n="code" size={13} />
          <span>Debugging Mode</span>
        </strong>
        <span style={{ fontSize: 11, opacity: 0.65 }}>
          {entries.length} entri{paused ? ' · paused' : ''}
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className={'btn ' + (enabled ? 'pri' : 'sec')}
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={onToggle}
        >
          {enabled ? 'Matikan' : 'Nyalakan'}
        </button>
        <button
          type="button"
          className="btn sec"
          style={{ fontSize: 11, padding: '2px 8px' }}
          aria-label="Tutup panel debug"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '6px 10px',
          borderBottom: '1px solid var(--line)',
          background: 'color-mix(in srgb, var(--sub) 45%, var(--card))'
        }}
        role="tablist"
        aria-label="Tab panel debug"
      >
        {[
          ['log', 'Log Live', 'layers'],
          ['console', 'Konsol Fungsi', 'code'],
          ['engine', 'Engine & Visual', 'shapes']
        ].map(([k, label, ic]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              className={'ved-pill text-xs flex items-center gap-1.5' + (active ? ' on' : '')}
              style={{
                padding: '3px 9px',
                fontWeight: active ? 600 : 400
              }}
              onClick={() => setTab(k)}
            >
              <Ico n={ic} size={12} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Log */}
      {tab === 'log' && (
        <React.Fragment>
          {/* Custom Input Filter Bar (0% Native HTML inputs) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--card)'
            }}
          >
            <div style={{ width: 140, flexShrink: 0 }}>
              <Select
                value={filter}
                options={CATEGORY_OPTIONS}
                on={v => setFilter(v)}
                tip="veDebugCategoryFilter"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CustomTextBox
                value={query}
                onChange={v => setQuery(v)}
                placeholder="Cari fungsi / aksi / file…"
                ariaLabel="Cari log"
                cls="w-full text-xs"
              />
            </div>
            {query && (
              <button
                type="button"
                className="btn sec"
                style={{ fontSize: 10, padding: '2px 6px', flexShrink: 0 }}
                onClick={() => setQuery('')}
                title="Hapus pencarian"
              >
                Clear
              </button>
            )}
          </div>

          {/* Log Items Stream */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '6px 10px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              lineHeight: 1.5
            }}
          >
            {!enabled && (
              <div style={{ opacity: 0.7, padding: '8px 0' }}>
                Mode mati — nyalakan untuk mulai mencatat. Log lama tetap tampil sampai dihapus.
              </div>
            )}
            {enabled && !shown.length && (
              <div style={{ opacity: 0.7, padding: '8px 0' }}>
                Belum ada entri untuk filter ini. Lakukan interaksi di kanvas (ganti tool, klik objek, zoom, dsb).
              </div>
            )}
            {shown.slice(-300).map(e => (
              <div
                key={e.seq}
                style={{
                  padding: '3px 0',
                  borderBottom: '1px solid var(--line)'
                }}
              >
                <div>
                  <span style={{ opacity: 0.55 }}>#{e.seq} {timeOf(e.ts)}</span>{' '}
                  <span style={{ fontWeight: 700, color: 'var(--acc)' }}>[{e.category}]</span>{' '}
                  <span style={{ fontWeight: 700 }}>{e.action}</span>
                </div>
                <div style={{ opacity: 0.85 }}>
                  {e.fn} <span style={{ opacity: 0.55 }}>· {e.file}</span>
                </div>
                {e.detail ? <div style={{ opacity: 0.7 }}>{e.detail}</div> : null}
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderTop: '1px solid var(--line)',
              background: 'var(--sub)'
            }}
          >
            <button
              type="button"
              className="btn sec"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={togglePause}
            >
              {paused ? 'Lanjutkan' : 'Pause'}
            </button>
            <button
              type="button"
              className="btn sec"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => {
                DEBUG_LOG.clear();
                setEntries([]);
              }}
            >
              Clear
            </button>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="btn sec"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => DEBUG_LOG.download('json')}
            >
              Unduh JSON
            </button>
            <button
              type="button"
              className="btn pri"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => DEBUG_LOG.download('md')}
            >
              Unduh MD
            </button>
          </div>
        </React.Fragment>
      )}

      {/* Tab: Konsol Fungsi */}
      {tab === 'console' && <DebugFunctionConsole entries={entries} />}

      {/* Tab: Engine & Visual Debug */}
      {tab === 'engine' && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 12px',
            fontSize: 11
          }}
          className="space-y-3"
        >
          {/* Visual Overlay Section */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-[11px] mut">
              <Ico n="layers" size={13} />
              <span>Geometri Render & Mesh Overlay</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {OVERLAY_OPTIONS.map(([k, lb]) => (
                <button
                  key={k}
                  type="button"
                  className={'ved-pill text-[11px]' + (renderCfg.debugMode === k ? ' on' : '')}
                  onClick={() => {
                    const next = updateRenderConfig({
                      debugMode: k,
                      debugGeometry: k !== 'none'
                    });
                    setRenderCfgS({ ...next });
                  }}
                >
                  {lb}
                </button>
              ))}
            </div>
          </div>

          {/* Telemetry Card */}
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              background: 'var(--sub)',
              border: '1px solid var(--line)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[11px] flex items-center gap-1">
                <Ico n="chip" size={13} />
                <span>Telemetri GPU & Pipeline</span>
              </span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--acc)' }}>
                {snap.activeBackend}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>LOD: <b>L{snap.lodLevel} · ε={VE.rd(snap.currentEpsilon)}</b></div>
              <div>Vertices: <b>{snap.totalVertices}v</b></div>
              <div>Frame Pass: <b>{snap.renderPassMs} ms (p95 {PERF_TELEMETRY.state.p95} ms)</b></div>
              <div>Cache: <b>{cacheStats.hits}H / {cacheStats.misses}M</b></div>
            </div>
          </div>

          {/* Test Scenarios */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-[11px] mut">
              <Ico n="shapes" size={13} />
              <span>Skenario Uji Render Benchmark</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestSvg(GEOVANTA_BENCHMARK_SUITE.buildCircleSvg(), 'Lingkaran')}
              >
                Lingkaran
              </button>
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestSvg(GEOVANTA_BENCHMARK_SUITE.buildBezierSvg(), 'Bézier Ekstrem')}
              >
                Bézier Ekstrem
              </button>
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestSvg(GEOVANTA_BENCHMARK_SUITE.buildDiagonalSvg(), 'Garis Diagonal')}
              >
                Diagonal
              </button>
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestSvg(GEOVANTA_BENCHMARK_SUITE.buildCompoundSvg(), 'Compound Path')}
              >
                Compound
              </button>
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestDoc(GEOVANTA_BENCHMARK_SUITE.buildNodeDensityDoc(1000), '1K Nodes')}
              >
                1.000 Nodes
              </button>
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestDoc(GEOVANTA_BENCHMARK_SUITE.buildNodeDensityDoc(10000), '10K Nodes')}
              >
                10.000 Nodes
              </button>
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestDoc(GEOVANTA_BENCHMARK_SUITE.buildExtremeCoordinateDoc(100000000), 'Ekstrem Koordinat')}
              >
                Ekstrem Koordinat
              </button>
              <button
                type="button"
                className="ved-pill text-[11px]"
                onClick={() => loadTestDoc(GEOVANTA_BENCHMARK_SUITE.buildSeamMosaicDoc(240), 'Mozaik 240')}
              >
                Mozaik 240
              </button>
            </div>
          </div>

          {/* Benchmark Runner */}
          <div className="pt-1">
            <button
              type="button"
              className="btn pri text-[11px] py-1.5 px-3 flex items-center gap-1.5"
              onClick={runBenchmarks}
            >
              <Ico n="play" size={12} />
              <span>Jalankan Benchmark Otomatis</span>
            </button>
          </div>
          {benchResults && (
            <div
              className="p-2 rounded-lg text-[10px] font-mono space-y-1"
              style={{
                background: 'var(--sub)',
                border: '1px solid var(--line)',
                maxHeight: 140,
                overflowY: 'auto'
              }}
            >
              <div className="font-bold text-[11px] mb-1" style={{ color: 'var(--acc)' }}>Hasil Benchmark Otomatis:</div>
              {benchResults.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5 border-b border-[var(--line)]">
                  <span>{r.name}</span>
                  <span>L{r.lod} · {r.verts}v · {r.ms}ms · {r.cacheHitVerified ? 'Cache✓' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { DebugLogPanel };
export default DebugLogPanel;
