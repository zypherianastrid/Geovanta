/**
 * @file src/components/modals/SettingsModal.tsx
 * @description Dialog modal pengaturan tampilan, aksen, performa GPU, & informasi aplikasi (Settings)
 */
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AboutVectorHeroBg, AboutAnimatedLogo } from './AboutVectorHeroBg.tsx';
import { RENDER_CONFIG, updateRenderConfig, PERF_TELEMETRY } from '../../utils/renderConfigAndTelemetry.tsx';
import { usePresence } from '../../utils/presenceAndFilePicker.tsx';
import { applyTheme, applyMotion, applyAccent, previewAccent, savePrefs, detectSystemAccentColor, resolveSystemAccentColorAsync, generateRandomAccentColor, getAccentPlatformSource, isWebBrowserAccentRestricted } from '../../utils/themeAndPrefsManager.tsx';
import { LS_KEY, DEFAULT_PREFS, ACCENT_PALETTE } from '../../constants/themeAndPrefsConstants.tsx';
import { GEOMETRY_CACHE } from '../../renderer/geometryCache.tsx';
import { Ico, Keys } from '../ui/IconGlyphs.tsx';
import { Seg } from '../ui/SegmentedControl.tsx';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';
import { ColorField } from '../ui/ColorPickerField.tsx';
import { parseColorWithAlpha } from '../../utils/colorParserAndFormatter.tsx';
import { ColorText } from '../ui/ColorHexInput.tsx';
import { pickScreenColor } from '../../utils/screenPipette.tsx';
import { VE } from '../../engine/vectorEngine.tsx';
import { Range } from '../ui/RangeField.tsx';
import { SC, SC_EN } from '../../constants/keyboardShortcuts.tsx';
import { getSettingsStr } from '../../constants/settingsI18n.tsx';
import { getAppStr } from '../../constants/appI18n.tsx';
import { aiLiveConnector } from '../../bridge/aiLiveConnector.tsx';
import { DebugLogPanel } from '../editor/DebugLogPanel.tsx';
import { DEBUG_LOG } from '../../utils/debugLogger.tsx';

const AI_TOOLS_LIST = [
  { name: 'geovanta_workspace_manage', mode: 'Live Full', desc: 'Mengelola ruang kerja & proyek: buat proyek baru, lihat daftar proyek, buka, ganti nama, duplikasi, favorit, pindahkan ke sampah, atau kembali ke layar Workspace.', descEn: 'Manage workspace & projects: create, list, open, rename, duplicate, favorite, move to trash, or return to the Workspace screen.' },
  { name: 'geovanta_shape_create', mode: 'Dual-Mode', desc: 'Membuat bentuk parametrik (bintang, poligon, lingkaran, kotak, spiral, blob, weave) langsung ke kanvas atau ke SVG.', descEn: 'Create parametric shapes (star, polygon, circle, rectangle, spiral, blob, weave) directly on the canvas or to SVG.' },
  { name: 'geovanta_text_create', mode: 'Dual-Mode', desc: 'Membuat dan mengatur tipografi / teks (font, ukuran, warna, ketebalan) langsung di kanvas aktif.', descEn: 'Create and style vector typography / text (font, size, color, weight) directly on the active canvas.' },
  { name: 'geovanta_iconify_insert', mode: 'Live Full', desc: 'Menyisipkan ribuan ikon vektor dari katalog Iconify (misal mdi:rocket, lucide:sparkles) langsung ke kanvas.', descEn: 'Insert thousands of vector icons from the Iconify catalog (e.g. mdi:rocket, lucide:sparkles) directly onto the canvas.' },
  { name: 'geovanta_layer_manage', mode: 'Live Full', desc: 'Mengelola layer di kanvas: ubah warna/stroke/opacity, geser/skala/putar, ubah urutan layer, duplikasi, kunci, sembunyikan, atau hapus.', descEn: 'Manage canvas layers: change fill/stroke/opacity, translate/scale/rotate, reorder layers, duplicate, lock, hide, or delete.' },
  { name: 'geovanta_artboard_and_view', mode: 'Live Full', desc: 'Mengubah ukuran & warna latar artboard, ganti tool aktif di toolbar, Undo/Redo, zoom kanvas, serta tema gelap/terang & warna aksen.', descEn: 'Change artboard size & background color, switch active toolbar tool, Undo/Redo, zoom canvas, and set dark/light theme & accent color.' },
  { name: 'geovanta_curve_simplify', mode: 'Dual-Mode', desc: 'Penyederhanaan kurva topologis (100% presisi) untuk merapikan anchor point berlebih.', descEn: 'Topological curve simplification (100% precision) to clean up redundant anchor points.' },
  { name: 'geovanta_boolean_operation', mode: 'Dual-Mode', desc: 'Operasi boolean path (union, subtract, intersect, exclude).', descEn: 'Boolean path operations (union, subtract, intersect, exclude).' },
  { name: 'geovanta_corner_fillet', mode: 'Dual-Mode', desc: 'Menerapkan radius fillet pembulatan sudut pada node kurva.', descEn: 'Apply corner rounding fillet radius to curve nodes.' },
  { name: 'geovanta_recolor', mode: 'Dual-Mode', desc: 'Mengubah palet warna atau find/replace warna pada objek vektor.', descEn: 'Recolor palettes or find/replace colors across vector objects.' },
  { name: 'geovanta_live_get_canvas', mode: 'Live Only', desc: 'Membaca layar aktif, daftar proyek, dokumen, layer, seleksi, dan artboard dari aplikasi.', descEn: 'Read active screen, project list, document, layers, selection, and artboard from the app.' },
  { name: 'geovanta_live_mutate_canvas', mode: 'Live Only', desc: 'Menambah, mengubah, atau menghapus objek kanvas secara langsung dengan riwayat Undo/Redo.', descEn: 'Add, update, or remove canvas objects directly with full Undo/Redo history.' },
  { name: 'geovanta_live_select_objects', mode: 'Live Only', desc: 'Memilih dan memfokuskan objek tertentu di kanvas berdasarkan ID.', descEn: 'Select and focus specific objects on the canvas by ID.' },
  { name: 'geovanta_live_export', mode: 'Live Only', desc: 'Memicu ekspor kanvas aktif ke format SVG atau raster.', descEn: 'Trigger export of the active canvas to SVG or raster formats.' },
  { name: 'geovanta_svg_parse', mode: 'Headless', desc: 'Mengurai markup XML SVG menjadi model dokumen JSON Geovanta.', descEn: 'Parse SVG XML markup into a Geovanta JSON document model.' },
  { name: 'geovanta_svg_serialize', mode: 'Headless', desc: 'Mengonversi model dokumen Geovanta kembali menjadi string SVG bersih.', descEn: 'Serialize a Geovanta document model back into a clean SVG string.' },
  { name: 'geovanta_status', mode: 'Universal', desc: 'Mengecek ketersediaan server MCP, mode bridge (WebSocket / Cloud Live), dan status koneksi aplikasi.', descEn: 'Check MCP server availability, bridge mode (WebSocket / Cloud Live), and app connection status.' }
];

const ANTIGRAVITY_SNIPPET = `{
  "mcpServers": {
    "geovanta": {
      "command": "node",
      "args": ["scripts/mcp-server/index.js"],
      "env": {
        "GEOVANTA_PORT": "38291"
      }
    }
  }
}`;

const GEMINI_CMD_SNIPPET = `node scripts/gemini-geovanta-connector.js "buat logo geometris bintang 8 sudut di kanvas"`;
const GEMINI_OAUTH_CLIENT_ID = 'geovanta-gemini-client';
const GEMINI_OAUTH_CLIENT_SECRET = 'geovanta-gemini-secret';
const GEMINI_TUNNEL_SNIPPET = `cloudflared tunnel --url http://127.0.0.1:38291`;

const Settings = ({
  open,
  onClose,
  prefs,
  setPrefs,
  flash
}) => {
  const [sTab, setSTab] = useState('umum');
  const [debugEnabled, setDebugEnabled] = useState(() => DEBUG_LOG.isEnabled());
  useEffect(() => {
    if (!open) return;
    setDebugEnabled(DEBUG_LOG.isEnabled());
  }, [open]);
  const toggleDebugMode = () => {
    const next = !DEBUG_LOG.isEnabled();
    DEBUG_LOG.setEnabled(next);
    setDebugEnabled(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('geovanta-debug-state-change', { detail: { enabled: next } }));
    }
    if (next) {
      try {
        DEBUG_LOG.log('perf', 'perf-snapshot', 'toggleDebugMode', 'src/components/modals/SettingsModal.tsx', PERF_TELEMETRY.getBadgeText());
      } catch (e) {}
    }
  };
  const aboutHeroRef = useRef<HTMLDivElement | null>(null);
  const [advRenderOpen, setAdvRenderOpen] = useState(false);
  const [renderCfg, setRenderCfgS] = useState(() => ({
    ...RENDER_CONFIG
  }));
  useEffect(() => {
    const onCfg = () => setRenderCfgS({
      ...RENDER_CONFIG
    });
    window.addEventListener('geovanta-render-config', onCfg);
    return () => window.removeEventListener('geovanta-render-config', onCfg);
  }, []);
  const setRenderCfg = patch => {
    const next = updateRenderConfig(patch);
    setRenderCfgS(next);
  };
  const [m, lv] = usePresence(open, 200);
  const L = getSettingsStr(prefs && prefs.lang);
  const scList: any[] = prefs && prefs.lang === 'en' ? SC_EN : SC;

  const [aiStatus, setAiStatus] = useState(() => aiLiveConnector.getConnectionStatus().status);
  const [aiPort, setAiPort] = useState(() => aiLiveConnector.getConnectionStatus().port);
  const [aiTransport, setAiTransport] = useState(() => aiLiveConnector.getConnectionStatus().transport);
  const [aiLastError, setAiLastError] = useState<string | null>(() => aiLiveConnector.getConnectionStatus().lastError);
  const [customWsInput, setCustomWsInput] = useState(() => aiLiveConnector.getCustomWsUrl());
  const [aiEnabled, setAiEnabled] = useState(() => aiLiveConnector.isEnabled());
  const [aiAutoConnect, setAiAutoConnect] = useState(() => {
    try {
      const val = localStorage.getItem('geovanta_ai_autoconnect');
      if (val === '1') return true;
      return false;
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    const unsub = aiLiveConnector.onStatusChange(st => {
      setAiStatus(st);
      const conn = aiLiveConnector.getConnectionStatus();
      setAiPort(conn.port);
      setAiTransport(conn.transport);
      setAiLastError(conn.lastError);
    });
    return () => unsub();
  }, []);

  const isEn = !!(prefs && prefs.lang === 'en');
  const toggleAiEnabled = (on: boolean) => {
    setAiEnabled(on);
    aiLiveConnector.setEnabled(on);
    if (!on) {
      setAiLastError(null);
      flash && flash(isEn ? 'AI & MCP features disabled' : 'Fungsi AI & MCP dinonaktifkan');
    } else {
      flash && flash(isEn ? 'AI & MCP features enabled — connecting to server...' : 'Fungsi AI & MCP diaktifkan — menghubungkan ke server...');
    }
  };

  const handleAiConnect = () => {
    if (!aiEnabled) {
      setAiEnabled(true);
      try {
        localStorage.setItem('geovanta_ai_enabled', '1');
      } catch (_) {}
    }
    if (customWsInput && customWsInput.trim()) {
      const norm = aiLiveConnector.setCustomWsUrl(customWsInput.trim());
      setCustomWsInput(norm);
    } else {
      aiLiveConnector.setCustomWsUrl('');
    }
    aiLiveConnector.connect();
    flash && flash(isEn ? 'Connecting to AI MCP server...' : 'Mencoba menghubungkan ke server AI MCP...');
  };

  const handleAiDisconnect = () => {
    aiLiveConnector.disconnect();
    flash && flash(isEn ? 'AI MCP connection disconnected' : 'Koneksi AI MCP diputuskan');
  };

  const toggleAiAuto = (on: boolean) => {
    setAiAutoConnect(on);
    try {
      if (on) {
        localStorage.setItem('geovanta_ai_autoconnect', '1');
        localStorage.setItem('geovanta_ai_enabled', '1');
        setAiEnabled(true);
        aiLiveConnector.connect();
      } else {
        localStorage.setItem('geovanta_ai_autoconnect', '0');
      }
    } catch (_) {}
  };

  const [sysAccentHex, setSysAccentHex] = useState(() => detectSystemAccentColor());
  useEffect(() => {
    if (!open) return;
    let active = true;
    const refreshSysAccent = () => {
      resolveSystemAccentColorAsync().then(c => {
        if (active && c) setSysAccentHex(c);
      });
    };
    refreshSysAccent();
    window.addEventListener('focus', refreshSysAccent);
    window.addEventListener('geovanta-android-theme-changed', refreshSysAccent);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshSysAccent);
      window.removeEventListener('geovanta-android-theme-changed', refreshSysAccent);
    };
  }, [open, prefs.theme, prefs.accent, prefs.accentMode]);

  const copyText = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      flash && flash(isEn ? `${label} copied to clipboard!` : `${label} disalin ke clipboard!`);
    }
  };
  if (!m) return null;
  const setAccentCustom = (hex: string) => {
    setPrefs(p => {
      const n = {
        ...p,
        accentMode: 'custom',
        accent: hex
      };
      if (n.persist) savePrefs(n);
      return n;
    });
  };
  const setAccentSystem = async () => {
    const immediate = detectSystemAccentColor();
    setSysAccentHex(immediate);
    setPrefs(p => {
      const n = {
        ...p,
        accentMode: 'system',
        accent: immediate
      };
      if (n.persist) savePrefs(n);
      return n;
    });
    const resolved = await resolveSystemAccentColorAsync();
    setSysAccentHex(resolved);
    setPrefs(p => {
      if (p.accentMode !== 'system') return p;
      const n = {
        ...p,
        accent: resolved
      };
      if (n.persist) savePrefs(n);
      return n;
    });
  };
  const set = k => v => {
    setPrefs(p => {
      const n = {
        ...p,
        [k]: v
      };
      if (k === 'theme') applyTheme(v);
      if (k === 'motion') applyMotion(v);
      if (k === 'persist' || n.persist) savePrefs(n);else if (k === 'persist' && !v) {
        try {
          localStorage.removeItem(LS_KEY);
        } catch (e) {}
      }
      return n;
    });
  };
  const reset = () => {
    const n = {
      ...DEFAULT_PREFS
    };
    setPrefs(n);
    applyTheme(n.theme);
    applyMotion(n.motion);
    applyAccent(n.accent);
    savePrefs(n);
    /* C8: Reset juga mengembalikan snap ke bawaan (berlaku penuh sesudah
       reload; status live dipegang tombol preset Bawaan di menu snap). */
    try {
      localStorage.removeItem('svgpeak-snap-cfg');
    } catch (e) {}
    flash && flash(L.resetFlash);
  };
  const snap = PERF_TELEMETRY.getSnapshot();
  const cacheStats = typeof GEOMETRY_CACHE !== 'undefined' && GEOMETRY_CACHE ? GEOMETRY_CACHE.getStats() : {
    hits: 0,
    misses: 0
  };
  const platform = getAccentPlatformSource();
  const platformIcon: 'windows' | 'sparkle' | 'auto' =
    platform === 'desktop_windows' ? 'windows' :
    platform === 'mobile_android_material_you' ? 'sparkle' :
    'auto';
  const autoAccentLabel = L.accentSystemAuto || 'Otomatis';
  const autoAccentSub =
    platform === 'desktop_windows'
      ? (L.accentSystemWinSub || L.accentSystemAutoSub)
      : platform === 'mobile_android_material_you'
      ? (L.accentSystemAndroidSub || L.accentSystemAutoSub)
      : (L.accentSystemWebSub || L.accentSystemAutoSub || (prefs.lang === 'en' ? 'Follow browser or system accent color automatically' : 'Mengikuti warna aksen browser atau sistem secara otomatis'));
  const platformSubText = `${autoAccentSub} (${sysAccentHex.toUpperCase()})`;
  const showWebAccentPrivacyNote = prefs.accentMode === 'system' && platform === 'webapp_browser_chrome' && isWebBrowserAccentRestricted();
  return ReactDOM.createPortal(<div className={'ov ' + (lv ? 'out' : 'in')} onPointerDown={e => {
    if (e.target === e.currentTarget) onClose();
  }}><div className="hp stg-modal" role="dialog" aria-label={L.title} style={{
      maxWidth: 740
    }}><div className="hp-head"><div className="stg-hdr"><div className="stg-title-blk"><span className="stg-title-ico"><Ico n="settings" size={17} /></span><div className="flex flex-wrap items-baseline gap-2"><span className="text-sm font-semibold">{L.title}</span><span className="text-[11px] mut">{L.subtitle}</span></div></div><div className="flex flex-wrap items-center gap-2"><Seg v={sTab} on={setSTab} cls="ic" o={[['umum', L.tabGeneral, 'sliders'], ['keys', L.tabShortcuts, 'keyboard'], ['ai', L.tabAi || 'AI & MCP', 'sparkle'], ['debug', L.tabDebug || 'Debug', 'code']]} tips={{
              umum: 'setTabUmum',
              keys: 'setTabKeys',
              ai: 'setTabAi',
              debug: 'setTabDebug'
            }} /><button className="btn sec" style={{
              padding: 0,
              width: 32,
              height: 32,
              borderRadius: 10,
              flex: 'none'
            }} onClick={onClose} aria-label={L.close} data-tip="closeDlg"><Ico n="x" size={14} /></button></div></div></div><div className="hp-body"><div className="stg-stack" style={{
          display: sTab === 'umum' ? 'flex' : 'none'
        }}><div className="stg-sec"><div className="stg-sec-hdr"><span className="stg-sec-lbl"><Ico n="palette" size={13} /><span>{L.secAppearance}</span></span><span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{
                background: 'var(--fig-sel)',
                color: 'var(--acc)'
              }}>{prefs.accentMode === 'system' ? `${autoAccentLabel} · ` : ''}{(prefs.accent || '#13b152').toUpperCase()}</span></div><div className="stg-group"><div className="stg-row" data-tip="setTheme"><div className="stg-meta"><span className="stg-ico"><Ico n="eye" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.themeLabel}</span><span className="stg-sub">{L.themeSub}</span></div></div><div className="stg-ctrl"><Seg v={prefs.theme} on={set('theme')} o={[['system', L.themeSystem], ['light', L.themeLight], ['dark', L.themeDark]]} tip="setTheme" /></div></div><div className="stg-row" data-tip="setLang"><div className="stg-meta"><span className="stg-ico"><Ico n="flow" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.langLabel}</span><span className="stg-sub">{L.langSub}</span></div></div><div className="stg-ctrl"><Seg v={prefs.lang === 'en' ? 'en' : 'id'} on={set('lang')} o={[['id', 'Indonesia'], ['en', 'English']]} tip="setLang" /></div></div><div className="stg-row-col"><div className="flex flex-wrap items-center justify-between gap-2"><div className="stg-meta"><span className="stg-ico"><Ico n="brush" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.accentLabel}</span><span className="stg-sub">{L.accentSub}</span></div></div><div className="stg-ctrl" style={{
                      alignItems: 'flex-start'
                    }}><ColorField L={getAppStr(prefs && prefs.lang)} value={prefs.accent || '#13b152'} on={(v, meta) => {
                      if (v && v !== 'none') {
                        const hex = parseColorWithAlpha(v).hex;
                        if (meta?.isLive) previewAccent(hex);
                        else setAccentCustom(hex);
                      }
                    }} /><div style={{
                      width: 104
            }}><ColorText L={getAppStr(prefs && prefs.lang)} value={prefs.accent || '#13b152'} on={v => {
                        if (v && v !== 'none') setAccentCustom(parseColorWithAlpha(v).hex);
                      }} /></div><button type="button" className="btn sec text-[11px]" data-tip="setAccentPipette" style={{
                      height: 30,
                      padding: '0 10px',
                      borderRadius: 9
                    }} onClick={async () => {
                      const c = await pickScreenColor();
                      if (typeof c === 'string' && c) setAccentCustom(c);
                    }}><Ico n="pipette" size={13} /><span>{L.pipetteBtn}</span></button><button type="button" className="btn sec text-[11px]" data-testid="accent-random-btn" data-tip="setAccentRandom" style={{
                      height: 30,
                      padding: '0 10px',
                      borderRadius: 9
                    }} onClick={() => setAccentCustom(generateRandomAccentColor(prefs.accent))}><Ico n="shuffle" size={13} /><span>{L.randomBtn}</span></button><button type="button" className="btn sec text-[11px]" data-tip="setAccentDefault" style={{
                      height: 30,
                      padding: '0 10px',
                      borderRadius: 9
                    }} onClick={() => setAccentCustom('#13b152')}><Ico n="reset" size={13} /><span>{L.defaultBtn}</span></button></div></div><div className="stg-pal-wrap"><button type="button" data-testid="accent-system-auto accent-system-windows" data-platform-source={platform} className={'stg-pal-chip' + (prefs.accentMode === 'system' ? ' on' : '')} data-tip-text={platformSubText} onClick={setAccentSystem}><span className="stg-pal-dot" style={{
                        background: sysAccentHex,
                        forcedColorAdjust: 'none'
                      }}>{prefs.accentMode === 'system' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><Ico n={platformIcon} size={12} /><span>{autoAccentLabel}</span></button>{ACCENT_PALETTE.map(([hex, name]) => {
                    const active = prefs.accentMode !== 'system' && (prefs.accent || '#13b152').toLowerCase() === hex.toLowerCase();
                    return <button key={hex} type="button" className={'stg-pal-chip' + (active ? ' on' : '')} data-tip-text={name + ' (' + hex.toUpperCase() + ')'} onClick={() => setAccentCustom(hex)}><span className="stg-pal-dot" style={{
                        background: hex,
                        forcedColorAdjust: 'none'
                      }}>{active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>{name}</span></button>;
                  })}</div>{showWebAccentPrivacyNote && <div data-testid="accent-web-privacy-note" className="text-[11px] leading-relaxed mut px-2.5 py-2 rounded-lg" style={{ background: 'var(--sub)', border: '1px solid var(--line)', marginTop: 6 }}>{L.accentWebPrivacyNote}</div>}</div></div></div><div className="stg-sec"><div className="stg-sec-hdr"><span className="stg-sec-lbl"><Ico n="sliders" size={13} /><span>{L.secInteraction}</span></span></div><div className="stg-group"><div className="stg-row" data-tip="setMotion"><div className="stg-meta"><span className="stg-ico"><Ico n="bolt" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.motionLabel}</span><span className="stg-sub">{L.motionSub}</span></div></div><div className="stg-ctrl"><Seg v={prefs.motion} on={set('motion')} o={[['system', L.themeSystem], ['on', L.on], ['off', L.off]]} tip="setMotion" /></div></div><div className="stg-row" data-tip="setTips"><div className="stg-meta"><span className="stg-ico"><Ico n="sparkle" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.tipsLabel}</span><span className="stg-sub">{L.tipsSub}</span></div></div><div className="stg-ctrl"><Seg v={prefs.tips ? 'on' : 'off'} on={k => set('tips')(k === 'on')} o={[['on', L.on], ['off', L.off]]} tip="setTips" /></div></div><div className="stg-row" data-tip="setAntialias"><div className="stg-meta"><span className="stg-ico"><Ico n="sparkle" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.antialiasLabel}</span><span className="stg-sub">{L.antialiasSub}</span></div></div><div className="stg-ctrl"><Seg v={prefs.antialias ? 'on' : 'off'} on={k => { const on = k === 'on'; set('antialias')(on); setRenderCfg({ antialias: on }); }} o={[['off', L.antialiasReduceSeams], ['on', L.antialiasStandard]]} tip="setAntialias" /></div></div><div className="stg-row" data-tip="setPersist"><div className="stg-meta"><span className="stg-ico"><Ico n="database" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.persistLabel}</span><span className="stg-sub">{L.persistSub}</span></div></div><div className="stg-ctrl"><Seg v={prefs.persist ? 'on' : 'off'} on={k => set('persist')(k === 'on')} o={[['on', L.yes], ['off', L.no]]} tip="setPersist" /></div></div><div className="stg-row"><div className="stg-meta"><span className="stg-ico"><Ico n="reset" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.resetLabel}</span><span className="stg-sub">{L.resetSub}</span></div></div><div className="stg-ctrl"><button type="button" className="btn sec text-xs" style={{
                    padding: '7px 11px',
                    borderRadius: 9
                  }} data-tip="setReset" onClick={reset}><Ico n="reset" size={13} /><span>{L.resetBtn}</span></button><button type="button" className="btn sec text-xs" style={{
                    padding: '7px 11px',
                    borderRadius: 9
                  }} data-tip="help" onClick={() => setSTab('keys')}><Ico n="keyboard" size={13} /><span>{L.shortcutsBtn}</span></button></div></div></div></div><div className="stg-sec"><div className="stg-sec-hdr"><span className="stg-sec-lbl"><Ico n="chip" size={13} /><span>{L.secEngine}</span></span><span className="abt-ver font-mono" style={{
                fontSize: 10,
                padding: '2px 8px'
              }}>{PERF_TELEMETRY.getBadgeText()}</span></div><div className="stg-group"><div className="stg-row"><div className="stg-meta"><span className="stg-ico"><Ico n="chip" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.statBackend}</span><span className="stg-sub font-mono" style={{
                      color: 'var(--acc)'
                    }}>{snap.activeBackend}</span></div></div><div className="stg-ctrl"><button type="button" data-tip="setEngineParams" className={'btn ' + (advRenderOpen ? 'pri' : 'sec') + ' text-[11px]'} style={{
                    padding: '6px 10px',
                    borderRadius: 9
                  }} onClick={() => setAdvRenderOpen(v => !v)}><Ico n="sliders" size={13} /><span>{L.paramsBtn}</span></button></div></div><div className="stg-row-col"><div className="stg-stat-wrap"><div className="stg-stat-pill"><span>{L.statBackend}</span><b style={{
                      color: 'var(--acc)'
                    }}>{snap.activeBackend}</b></div><div className="stg-stat-pill"><span>{L.statLOD}</span><b>L{snap.lodLevel} · ε={VE.rd(snap.currentEpsilon)}</b></div><div className="stg-stat-pill"><span>{L.statGeom}</span><b>{snap.totalVertices}v</b></div><div className="stg-stat-pill"><span>{L.statFrame}</span><b>{snap.renderPassMs} ms (p95 {PERF_TELEMETRY.state.p95} ms)</b></div><div className="stg-stat-pill"><span>{L.statCache}</span><b>{cacheStats.hits}H / {cacheStats.misses}M</b></div></div></div><div className="stg-row-col space-y-2.5" style={{
                display: advRenderOpen ? 'flex' : 'none',
                background: 'color-mix(in srgb, var(--sub) 35%, var(--card))'
              }}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium mut">{L.localCoord}</span><Seg v={renderCfg.localCoordRebasing ? 'on' : 'off'} on={k => setRenderCfg({
                      localCoordRebasing: k === 'on'
                    })} o={[['on', L.rebaseOn], ['off', L.rebaseOff]]} /></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"><Range l={L.targetPixelError} v={renderCfg.targetPixelError} min={0.05} max={1.5} step={0.05} on={v => setRenderCfg({
                    targetPixelError: v
                  })} f={v => v.toFixed(2) + ' px'} /><Range l={L.maxBezierDepth} v={renderCfg.maxBezierDepth} min={6} max={20} step={1} on={v => setRenderCfg({
                    maxBezierDepth: v
                  })} f={v => 'Depth ' + v} /></div></div></div></div><div className="stg-sec"><div className="stg-sec-hdr"><span className="stg-sec-lbl" data-tip="setAbout"><Ico n="sparkle" size={13} /><span>{L.aboutTitle}</span></span></div><div className="stg-about-hero" ref={aboutHeroRef}><AboutVectorHeroBg active={open && sTab === 'umum'} motionPref={prefs && prefs.motion} containerRef={aboutHeroRef} /><div className="stg-about-scrim" aria-hidden="true" /><div className="stg-about-top"><div className="stg-about-logo"><AboutAnimatedLogo active={open && sTab === 'umum'} motionPref={prefs && prefs.motion} /></div><div className="flex flex-wrap items-center gap-2"><span className="abt-ver" style={{
                    padding: '4px 11px',
                    fontSize: 11.5
                  }}><Ico n="sparkle" size={11} /><span>{L.version}</span></span></div></div></div><div className="stg-group" data-testid="about-credits-group"><div className="stg-row"><div className="stg-meta"><span className="stg-ico"><Ico n="sparkle" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.aboutCreatorLabel}</span><span className="stg-sub" style={{ color: 'var(--txt)', fontWeight: 500 }}>{L.aboutCreatorValue}</span></div></div></div><div className="stg-row"><div className="stg-meta"><span className="stg-ico"><Ico n="shield" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.aboutLicenseLabel}</span><span className="stg-sub">{L.aboutLicenseValue}</span></div></div><div className="stg-ctrl"><a href="https://github.com/zypherianastrid/Geovanta" target="_blank" rel="noreferrer" className="btn sec text-[11px]" style={{ padding: '5px 10px', borderRadius: 9, textDecoration: 'none' }}><Ico n="shield" size={13} /><span>{L.aboutLicenseValue}</span></a></div></div><div className="stg-row"><div className="stg-meta"><span className="stg-ico"><Ico n="github" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.aboutGithubLabel}</span><span className="stg-sub font-mono">https://github.com/zypherianastrid/Geovanta</span></div></div><div className="stg-ctrl"><a href="https://github.com/zypherianastrid/Geovanta" target="_blank" rel="noreferrer" className="btn sec text-[11px]" style={{ padding: '5px 10px', borderRadius: 9, textDecoration: 'none' }}><Ico n="github" size={13} /><span>GitHub</span><Ico n="externalLink" size={12} /></a></div></div></div></div></div>{sTab === 'keys' && <div className="space-y-4 fade" key="s-keys"><div className="stg-group"><div className="stg-row"><div className="stg-meta"><span className="stg-ico"><Ico n="keyboard" size={15} /></span><div className="stg-txt"><span className="stg-lbl">{L.keysTitle}</span><span className="stg-sub">{L.keysSubPrefix}<kbd className="kbd">?</kbd>{L.keysSubSuffix}</span></div></div></div></div><div className="hp-g">{scList.map(([g, rows]: any) => <div key={g} className="stg-group p-3"><div className="hp-t flex items-center gap-1.5"><Ico n="keyboard" size={12} /><span>{g}</span></div>{rows.map(([k, t]: any) => <div key={t} className="hp-r flex-wrap"><span>{t}</span><Keys s={k} /></div>)}</div>)}</div></div>}
{sTab === 'ai' && <div className="space-y-4 fade" key="s-ai" data-testid="settings-ai-tab">
  <div className="stg-sec">
    <div className="stg-sec-hdr">
      <div className="flex flex-wrap items-center gap-2">
        <span className="stg-sec-lbl"><Ico n="sparkle" size={13} /><span>{isEn ? 'Live AI & MCP Connection' : 'Koneksi AI & MCP Live'}</span></span>
        <span
          data-testid="ai-experimental-badge"
          className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: 'color-mix(in srgb, #f59e0b 16%, var(--card))',
            color: '#d97706',
            border: '1px solid color-mix(in srgb, #f59e0b 35%, var(--line))'
          }}
        >
          <Ico n="flask" size={11} />
          <span>{isEn ? 'Experimental' : 'Eksperimental'}</span>
        </span>
      </div>
      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5" style={{
        background: !aiEnabled
          ? 'var(--sub)'
          : aiStatus === 'connected'
          ? 'rgba(34, 197, 94, 0.15)'
          : 'var(--fig-sel)',
        color: !aiEnabled
          ? 'var(--mut)'
          : aiStatus === 'connected'
          ? '#22c55e'
          : 'var(--mut)'
      }}>
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: !aiEnabled ? '#94a3b8' : aiStatus === 'connected' ? '#22c55e' : '#94a3b8' }} />
        {!aiEnabled
          ? (isEn ? 'Disabled' : 'Nonaktif')
          : aiStatus === 'connected'
          ? aiTransport === 'http-bridge'
            ? (isEn ? 'Connected (Cloud Live)' : 'Terhubung (Cloud Live)')
            : (isEn ? `Connected (Port ${aiPort})` : `Terhubung (Port ${aiPort})`)
          : aiStatus === 'connecting'
          ? (isEn ? 'Connecting...' : 'Menghubungkan...')
          : 'Offline'}
      </span>
    </div>
    <div className="stg-group">
      <div className="stg-row">
        <div className="stg-meta" style={{ flex: '1 1 260px' }}>
          <span className="stg-ico"><Ico n="power" size={15} /></span>
          <div className="stg-txt" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="stg-lbl">{isEn ? 'AI & MCP Features' : 'Fungsi AI & MCP'}</span>
              <span
                className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--acc) 14%, var(--card))',
                  color: 'var(--acc)',
                  border: '1px solid color-mix(in srgb, var(--acc) 30%, var(--line))'
                }}
              >
                <Ico n="flask" size={10} />
                <span>{isEn ? 'Experimental' : 'Eksperimental'}</span>
              </span>
            </div>
            <span className="stg-sub ai-wrap" style={{ whiteSpace: 'normal', lineHeight: 1.45 }}>
              {isEn
                ? 'Enable or disable AI Assistant & Model Context Protocol (MCP) integration in Geovanta (default: Off).'
                : 'Aktifkan atau nonaktifkan fitur integrasi AI Assistant & Model Context Protocol (MCP) di Geovanta (default: Nonaktif).'}
            </span>
          </div>
        </div>
        <div className="stg-ctrl" data-testid="ai-mcp-toggle">
          <Seg
            v={aiEnabled ? 'on' : 'off'}
            on={k => toggleAiEnabled(k === 'on')}
            cls="ic"
            tip="setAiToggle"
            o={[
              ['on', isEn ? 'Enabled' : 'Aktif', 'check'],
              ['off', isEn ? 'Disabled' : 'Nonaktif', 'x']
            ]}
          />
        </div>
      </div>
      <div className="stg-row">
        <div className="stg-meta" style={{ flex: '1 1 260px' }}>
          <span className="stg-ico"><Ico n="sparkle" size={15} /></span>
          <div className="stg-txt" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span className="stg-lbl">Live In-App WebSocket Bridge</span>
            <span className="stg-sub ai-wrap" style={{ whiteSpace: 'normal', lineHeight: 1.45 }}>
              {isEn
                ? 'Real-time 2-way communication between AI (Gemini/Antigravity) and the Geovanta canvas'
                : 'Komunikasi 2 arah real-time antara AI (Gemini/Antigravity) dan kanvas Geovanta'}
            </span>
          </div>
        </div>
        <div className="stg-ctrl">
          {aiStatus === 'connected' ? (
            <button type="button" data-tip="setAiDisconnect" className="btn sec text-[11px]" style={{ padding: '6px 10px', borderRadius: 9 }} onClick={handleAiDisconnect}>
              <Ico n="x" size={13} />
              <span>{isEn ? 'Disconnect' : 'Putuskan'}</span>
            </button>
          ) : (
            <button type="button" data-tip="setAiConnect" className="btn pri text-[11px]" style={{ padding: '6px 10px', borderRadius: 9 }} onClick={handleAiConnect}>
              <Ico n="refresh" size={13} />
              <span>{isEn ? 'Connect Now' : 'Hubungkan Sekarang'}</span>
            </button>
          )}
        </div>
      </div>
      <div className="stg-row">
        <div className="stg-meta">
          <span className="stg-ico"><Ico n="chip" size={15} /></span>
          <div className="stg-txt">
            <span className="stg-lbl">{isEn ? 'WebSocket & HTTP Server Address' : 'Alamat Server WebSocket & HTTP'}</span>
            <span className="stg-sub ai-wrap" style={{ whiteSpace: 'normal' }}>{isEn ? 'Accessible from browser at ' : 'Bisa diakses dari browser di '}<code>http://127.0.0.1:{aiPort}</code></span>
          </div>
        </div>
        <div className="stg-ctrl flex items-center gap-2">
          <a
            href={`http://127.0.0.1:${aiPort}`}
            target="_blank"
            rel="noreferrer"
            data-tip="setAiOpenLocal"
            className="btn sec font-mono text-[11px]"
            style={{ padding: '5px 9px', borderRadius: 8, textDecoration: 'none' }}
          >
            {isEn ? `Open http://127.0.0.1:${aiPort}` : `Buka http://127.0.0.1:${aiPort}`}
          </a>
        </div>
      </div>
      <div className="stg-row">
        <div className="stg-meta">
          <span className="stg-ico"><Ico n="bolt" size={15} /></span>
          <div className="stg-txt">
            <span className="stg-lbl">{isEn ? 'Auto-Connect on Startup' : 'Auto-Connect Otomatis'}</span>
            <span className="stg-sub ai-wrap" style={{ whiteSpace: 'normal' }}>{isEn ? 'Automatically connect bridge when Geovanta opens' : 'Otomatis menyambungkan bridge saat Geovanta dibuka'}</span>
          </div>
        </div>
        <div className="stg-ctrl">
          <Seg v={aiAutoConnect ? 'on' : 'off'} on={k => toggleAiAuto(k === 'on')} tip="setAiAutoConnect" o={[['on', L.on], ['off', L.off]]} />
        </div>
      </div>
      <div className="stg-row-col space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] font-medium ai-wrap" style={{ whiteSpace: 'normal' }}>{isEn ? 'Custom Tunnel / WebSocket Server URL (For Netlify / Online Web)' : 'URL Server Tunnel / WebSocket Kustom (Untuk Netlify / Online Web)'}</span>
          <span className="text-[10.5px] mut ai-wrap" style={{ whiteSpace: 'normal' }}>{isEn ? `Leave blank for default localhost:${aiPort}` : `Kosongkan untuk default localhost:${aiPort}`}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            data-testid="custom-ws-url-input"
            className="fld font-mono text-[11.5px] px-2.5 py-1.5 flex-1 flex items-center"
            style={{ minWidth: 220, minHeight: 30 }}
            onClick={e => {
              const el = e.currentTarget.querySelector('[role="textbox"]') as HTMLElement | null;
              el?.focus();
            }}
          >
            <CustomTextBox
              value={customWsInput}
              onChange={v => setCustomWsInput(v)}
              onCommit={v => setCustomWsInput(v)}
              placeholder={isEn ? 'Example: wss://your-tunnel.trycloudflare.com or ws://127.0.0.1:38291' : 'Contoh: wss://your-tunnel.trycloudflare.com atau ws://127.0.0.1:38291'}
              ariaLabel={isEn ? 'Custom Tunnel / WebSocket Server URL' : 'URL Server Tunnel / WebSocket Kustom'}
            />
          </div>
          <button
            type="button"
            data-tip="setAiSaveConnect"
            className="btn pri inline-flex items-center justify-center gap-1.5 text-[11px]"
            style={{ padding: '6px 12px', borderRadius: 8 }}
            onClick={handleAiConnect}
          >
            <span>{isEn ? 'Save & Connect' : 'Simpan & Hubungkan'}</span>
          </button>
        </div>
      </div>
      {aiEnabled && aiLastError && aiStatus !== 'connected' && (
        <div
          data-testid="ai-error-alert"
          className="ai-wrap text-[11.5px] rounded-xl flex items-start gap-2.5"
          style={{
            margin: '10px 14px 14px',
            padding: '12px 14px',
            lineHeight: 1.55,
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}
        >
          <span style={{ flex: 'none', marginTop: 2 }}><Ico n="alert" size={14} /></span>
          <div className="ai-wrap" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', flex: 1, minWidth: 0 }}>
            {aiLastError}. {isEn ? 'If your browser restricts socket access from ' : 'Jika peramban Anda membatasi akses socket dari '}<code>file://</code>{isEn ? ', open the app via the local web server link above.' : ', buka aplikasi melalui tautan web server lokal di atas.'}
          </div>
        </div>
      )}
    </div>
  </div>

  <div className="stg-sec">
    <div className="stg-sec-hdr">
      <span className="stg-sec-lbl"><Ico n="sparkle" size={13} /><span>{isEn ? 'Google Gemini Web (Connected to MCP Server)' : 'Google Gemini Web (Terhubung ke Server MCP)'}</span></span>
      <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-[var(--fig-sel)] text-[var(--acc)]">Streamable HTTP + OAuth 2.1</span>
    </div>
    <div className="p-3.5 text-[12px] leading-relaxed mut space-y-3" style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line)' }}>
      <p className="ai-wrap" style={{ whiteSpace: 'normal', lineHeight: 1.55 }}>
        {isEn
          ? <>Connect Geovanta directly to <b>Connectors &rarr; + Custom (Connect to MCP server)</b> on <code>gemini.google.com</code>:</>
          : <>Hubungkan Geovanta langsung ke menu <b>Konektor &rarr; + Kustom (Terhubung ke server MCP)</b> di <code>gemini.google.com</code>:</>}
      </p>
      <div className="grid grid-cols-1 gap-2.5">
        <div className="p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2" style={{ background: 'var(--sub)', border: '1px solid var(--line)' }}>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--mut)]">{isEn ? 'MCP Server URL (HTTPS Required)' : 'URL Server MCP (Wajib HTTPS)'}</div>
            <code className="font-mono text-[11.5px] text-[var(--acc)] select-all ai-wrap" style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>
              {typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
                ? `${window.location.origin}/mcp`
                : 'https://your-tunnel-or-domain.com/mcp'}
            </code>
          </div>
          <button
            type="button"
            data-tip="setAiCopy"
            className="btn sec text-[11px]"
            style={{ padding: '4px 8px', borderRadius: 7 }}
            onClick={() =>
              copyText(
                typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
                  ? `${window.location.origin}/mcp`
                  : `http://127.0.0.1:${aiPort}/mcp`,
                'Endpoint /mcp'
              )
            }
          >
            <Ico n="copy" size={12} />
            <span>{isEn ? 'Copy /mcp Path' : 'Salin Path /mcp'}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg flex items-center justify-between gap-2" style={{ background: 'var(--sub)', border: '1px solid var(--line)' }}>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--mut)]">OAuth Client ID</div>
              <code className="font-mono text-[11.5px] text-[var(--acc)] select-all">{GEMINI_OAUTH_CLIENT_ID}</code>
            </div>
            <button type="button" data-tip="setAiCopy" className="btn sec text-[11px]" style={{ padding: '4px 8px', borderRadius: 7 }} onClick={() => copyText(GEMINI_OAUTH_CLIENT_ID, 'OAuth Client ID')}>
              <Ico n="copy" size={12} />
              <span>{isEn ? 'Copy' : 'Salin'}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-lg flex items-center justify-between gap-2" style={{ background: 'var(--sub)', border: '1px solid var(--line)' }}>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--mut)]">{isEn ? 'OAuth Client Secret' : 'Rahasia Klien OAuth'}</div>
              <code className="font-mono text-[11.5px] text-[var(--acc)] select-all">{GEMINI_OAUTH_CLIENT_SECRET}</code>
            </div>
            <button type="button" data-tip="setAiCopy" className="btn sec text-[11px]" style={{ padding: '4px 8px', borderRadius: 7 }} onClick={() => copyText(GEMINI_OAUTH_CLIENT_SECRET, isEn ? 'OAuth Client Secret' : 'Rahasia Klien OAuth')}>
              <Ico n="copy" size={12} />
              <span>{isEn ? 'Copy' : 'Salin'}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="text-[11.5px]" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
        <div
          data-testid="ai-scenario-1"
          className="ai-wrap rounded-lg"
          style={{
            padding: '10px 12px',
            lineHeight: 1.6,
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            background: 'var(--sub)',
            border: '1px solid var(--line)'
          }}
        >
          {isEn ? (
            <><b>Scenario 1 (Localhost):</b> Start the MCP server on port <code>{aiPort}</code>, open a free HTTPS tunnel with <code style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{GEMINI_TUNNEL_SNIPPET}</code> (or <code>ngrok http {aiPort}</code>), and paste the generated <code>https://.../mcp</code> URL into Gemini Web.</>
          ) : (
            <><b>Skenario 1 (Localhost):</b> Jalankan server MCP di port <code>{aiPort}</code>, lalu buka tunnel HTTPS gratis dengan perintah <code style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{GEMINI_TUNNEL_SNIPPET}</code> (atau <code>ngrok http {aiPort}</code>), dan tempel URL <code>https://.../mcp</code> yang dihasilkan ke Gemini Web.</>
          )}
        </div>
        <div
          data-testid="ai-scenario-2"
          className="ai-wrap rounded-lg"
          style={{
            padding: '10px 12px',
            lineHeight: 1.6,
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            background: 'var(--sub)',
            border: '1px solid var(--line)'
          }}
        >
          {isEn ? (
            <><b>Scenario 2 (Online Web):</b> Deploy the Geovanta server to Cloud Run / Railway / Render, open <code style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>https://your-domain.com/?ai=1</code>, then enter <code style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>https://your-domain.com/mcp</code> into Gemini Web.</>
          ) : (
            <><b>Skenario 2 (Web Online):</b> Deploy server Geovanta ke Cloud Run / Railway / Render, buka <code style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>https://domain-anda.com/?ai=1</code>, lalu masukkan <code style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>https://domain-anda.com/mcp</code> ke Gemini Web.</>
          )}
        </div>
      </div>
    </div>
  </div>

  <div className="stg-sec">
    <div className="stg-sec-hdr">
      <span className="stg-sec-lbl"><Ico n="code" size={13} /><span>Google Antigravity (MCP Server)</span></span>
      <button type="button" data-tip="setAiCopy" className="btn sec text-[11px]" style={{ padding: '4px 8px', borderRadius: 7 }} onClick={() => copyText(ANTIGRAVITY_SNIPPET, isEn ? 'Antigravity Config' : 'Konfigurasi Antigravity')}>
        <Ico n="copy" size={12} />
        <span>{isEn ? 'Copy Config' : 'Salin Konfigurasi'}</span>
      </button>
    </div>
    <div className="p-3.5 text-[12px] leading-relaxed mut" style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line)' }}>
      <p className="mb-2.5 ai-wrap" style={{ whiteSpace: 'normal', lineHeight: 1.55 }}>{isEn ? <>Add the following configuration snippet to your Antigravity MCP settings (also available in <code>antigravity-mcp.json</code>):</> : <>Tambahkan snippet konfigurasi berikut ke pengaturan MCP Antigravity Anda (tersedia juga di file <code>antigravity-mcp.json</code>):</>}</p>
      <pre className="font-mono text-[11px] p-3 rounded-lg overflow-x-auto text-[var(--acc)] select-all" style={{ background: 'var(--sub)', border: '1px solid var(--line)', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
{ANTIGRAVITY_SNIPPET}
      </pre>
    </div>
  </div>

  <div className="stg-sec">
    <div className="stg-sec-hdr">
      <span className="stg-sec-lbl"><Ico n="bolt" size={13} /><span>Google Gemini (CLI &amp; API Connector)</span></span>
      <button type="button" data-tip="setAiCopy" className="btn sec text-[11px]" style={{ padding: '4px 8px', borderRadius: 7 }} onClick={() => copyText(GEMINI_CMD_SNIPPET, isEn ? 'Gemini CLI Command' : 'Perintah Gemini CLI')}>
        <Ico n="copy" size={12} />
        <span>{isEn ? 'Copy Command' : 'Salin Perintah'}</span>
      </button>
    </div>
    <div className="p-3.5 text-[12px] leading-relaxed mut" style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line)' }}>
      <p className="mb-2.5 ai-wrap" style={{ whiteSpace: 'normal', lineHeight: 1.55 }}>{isEn ? 'Run vector instructions directly with the Gemini SDK using the Geovanta connector script:' : 'Jalankan instruksi vektor langsung dengan Gemini SDK menggunakan skrip konektor Geovanta:'}</p>
      <pre className="font-mono text-[11px] p-3 rounded-lg overflow-x-auto text-[var(--acc)] select-all" style={{ background: 'var(--sub)', border: '1px solid var(--line)', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
{GEMINI_CMD_SNIPPET}
      </pre>
      <p className="mt-2.5 text-[11px] text-[var(--mut)] ai-wrap" style={{ whiteSpace: 'normal', lineHeight: 1.55 }}>
        {isEn ? <>Use the <code>--simulate</code> flag to run an offline simulation without a Gemini API Key.</> : <>Gunakan flag <code>--simulate</code> jika ingin menjalankan simulasi offline tanpa Gemini API Key.</>}
      </p>
    </div>
  </div>

  <div className="stg-sec">
    <div className="stg-sec-hdr">
      <span className="stg-sec-lbl"><Ico n="shapes" size={13} /><span>{prefs?.lang === 'en' ? `Geovanta AI Tools Catalog (${AI_TOOLS_LIST.length})` : `Katalog ${AI_TOOLS_LIST.length} Tools AI Geovanta`}</span></span>
      <span className="text-[11px] mut">{AI_TOOLS_LIST.length} {prefs?.lang === 'en' ? 'Registered Tools' : 'Tools Terdaftar'}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
      {AI_TOOLS_LIST.map(t => (
        <div key={t.name} className="p-3 rounded-xl text-left flex flex-col gap-1.5" style={{ background: 'var(--sub)', border: '1px solid var(--line)' }}>
          <div className="font-mono text-[11.5px] font-semibold text-[var(--acc)] flex flex-wrap items-center justify-between gap-1.5">
            <span className="ai-wrap" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{t.name}</span>
            <span className="text-[9.5px] font-normal px-2 py-0.5 rounded-md bg-[var(--fig-sel)] text-[var(--mut)]" style={{ flex: 'none' }}>{t.mode}</span>
          </div>
          <div
            data-testid="ai-tool-desc"
            className="ai-wrap text-[11px] text-[var(--mut)] leading-relaxed"
            style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.55 }}
          >
            {prefs?.lang === 'en' ? (t.descEn || t.desc) : t.desc}
          </div>
        </div>
      ))}
    </div>
  </div>
</div>}
{sTab === 'debug' && <div className="space-y-3 fade" key="s-debug" data-testid="settings-debug-tab">
  <DebugLogPanel embedded={true} open={true} enabled={debugEnabled} onToggle={toggleDebugMode} onClose={onClose} lang={prefs?.lang || 'id'} />
</div>}</div></div></div>, document.fullscreenElement || document.body);
};

export { Settings };
export default Settings;
