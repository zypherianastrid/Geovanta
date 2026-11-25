/**
 * @file src/components/editor/VectorEditor.tsx
 * @description Komponen ruang kerja utama Vector Editor interaktif (VectorEditor)
 */
import React, { useState, useEffect, useRef, startTransition } from 'react';
import ReactDOM from 'react-dom';
import { DEFAULT_PREFS, VZMIN, VZMAX } from '../../constants/themeAndPrefsConstants.tsx';
import { RENDER_CONFIG, updateRenderConfig, PERF_TELEMETRY } from '../../utils/renderConfigAndTelemetry.tsx';
import { VE } from '../../engine/vectorEngine.tsx';
import { docHasBackgroundBlur } from '../../engine/effectsEngine.tsx';
import { resolveExportArea } from '../../engine/svgDocumentSerializer.tsx';
import { zFmt, vzToSl } from '../../utils/zoomAndFormatHelpers.tsx';
import { clampN, hex2hsv, hsv2hex } from '../../utils/colorMath.tsx';
import { getAppStr, translateToast } from '../../constants/appI18n.tsx';
import { setSceneInteractingZoom, buildObjectGpuBuffers } from '../../renderer/polygonTriangulatorAndStroke.tsx';
import { DEFAULT_SNAP_CFG, VE_NODE_GROUP, VE_GEO_GROUP, VE_DRAW_GROUP, VE_DRAW_TOOLS, SHAPES, SHAPE_EN, SNAP_TOOL_CAPABILITIES, SNAP_OPTS } from '../../constants/editorToolsAndShapes.tsx';
import { ACTIVE_DEVICE_PROFILE } from '../../utils/deviceProfiles.tsx';
import { cssToHex, parseColorWithAlpha, formatColorWithAlpha } from '../../utils/colorParserAndFormatter.tsx';
import { vinfo } from '../../renderer/pathInfo.tsx';
import { LAYER_ROW_EST_PX } from './LayerTreeViewport.tsx';
import { SceneRenderer, calcGridStep } from '../../renderer/sceneRenderer.tsx';
import { AssetManager } from '../../workspace/assetManager.tsx';
import { shapeRect } from '../../utils/shapeGenerators.tsx';
import { blobNodes, regenBlob, DEFAULT_BLOB_PARAMS } from '../../engine/blobGenerator.tsx';
import { weaveStrips, DEFAULT_WEAVE_PARAMS, normalizeWeaveParams } from '../../engine/weaveGenerator.tsx';
import { lineSegmentNodes, arcNodes, DEFAULT_ARC_PARAMS, normalizeArcParams, regenArc, visibleStrokeStyle } from '../../engine/drawTools.tsx';
import { shapesCrossedByStroke, applyShapeBuilder } from '../../engine/shapeBuilder.tsx';
import { threePointArcFromPoints, constrainPoint45, findSelectedOpenEnd, reverseSubpathNodes, translateAnchorInDoc, applyShapeBuilderVectorcraft, makeNodeId } from '../../engine/drawToolsVectorcraft.tsx';
import { selectSame } from '../../engine/colorWalk.tsx';
import { directPaintEdit, paintSlot } from '../../engine/colorStyles.tsx';
import { ICONS } from '../../constants/brandAndIcons.tsx';
import { TIPS, TIPS_EN } from '../../constants/tooltipsCatalog.tsx';
import { Vi, Chev, Ico, ShapeGlyph } from '../ui/IconGlyphs.tsx';
import { Float } from '../ui/FloatPopover.tsx';
import { EditorActionRail } from './EditorActionRail.tsx';
import { EditorLeftSidebar } from './EditorLeftSidebar.tsx';
import { GradientCanvasGizmo } from './GradientCanvasGizmo.tsx';
import { SelectionRotationAndRedlines } from './SelectionRotationAndRedlines.tsx';
import { RenderDebugCanvasOverlay } from './RenderDebugCanvasOverlay.tsx';
import { DEBUG_LOG } from '../../utils/debugLogger.tsx';
import { DebugLogPanel } from './DebugLogPanel.tsx';
import { EditorSimplifyStrip } from './EditorSimplifyStrip.tsx';
import { EditorOffsetStrip } from './EditorOffsetStrip.tsx';
import { Slider } from '../ui/Slider.tsx';
import { XfField } from '../ui/TransformField.tsx';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';
import { EditorFloatingToolbar } from './EditorFloatingToolbar.tsx';
import { CanvasRulers, GuideLine, RulerUnit } from './CanvasRulers.tsx';
import { GEOVANTA_BENCHMARK_SUITE } from '../../renderer/benchmarkSuite.tsx';
import { GEOMETRY_CACHE } from '../../renderer/geometryCache.tsx';
import { getObjectTessellationLOD } from '../../renderer/objectTessellationLod.tsx';
import { EditorRightInspector } from './EditorRightInspector.tsx';
import { useEditorShortcuts } from './hooks/useEditorShortcuts.tsx';
import { useEditorExport } from './hooks/useEditorExport.tsx';
import { useCanvasWheelZoom } from './hooks/useCanvasWheelZoom.tsx';
import { IconifyModal } from '../modals/IconifyModal.tsx';
import { ChartsStudioModal } from '../modals/ChartsStudioModal.tsx';
import { SvgCodeInspectorModal } from '../modals/SvgCodeInspectorModal.tsx';
import { MobileEditorTopBar } from './MobileEditorTopBar.tsx';
import { MobileSelectionActionBar } from './MobileSelectionActionBar.tsx';
import { MobileBottomSheet } from './MobileBottomSheet.tsx';
import { useMobileViewport, isMobileViewportNow } from '../../hooks/useMobileViewport.ts';

/* C9: warna panduan snap per kind — sama dengan warna di menu checklist
   (SNAP_OPTS), supaya jenis snap terbaca dari warnanya. */
const SNAP_KIND_COLOR = Object.fromEntries(SNAP_OPTS.map(([k, , col]) => [k, col]));
/* T1 (audit UI/UX M4): warna kanvas bernama di satu tempat — jangan hardcode hex di bawah. */
const SNAP_GUIDE_COLOR_DEFAULT = '#F24822';
const NODE_HANDLE_COLOR = '#e88922';
const SNAP_GUIDE_COLOR = kind => SNAP_KIND_COLOR[kind] || SNAP_GUIDE_COLOR_DEFAULT;
import { CtxMenu } from '../ui/ContextMenu.tsx';
import { normalizeTextDocument, normalizeTextObject, isLegacyText, legacyTextSpec, textAutoName } from '../../engine/legacyText.tsx';
import { inspectFontBytes } from '../../renderer/textFontRegistry.tsx';
import { GOOGLE_FONTS, embedGoogleFont } from '../../renderer/googleFonts.tsx';
import { loadSet, buildIconSvg, isPaletteIcon, listCollections } from '../../renderer/iconifyClient.tsx';
import { pickFiles } from '../../utils/presenceAndFilePicker.tsx';
import { TextEditOverlay } from './TextEditOverlay.tsx';
import { TextInspector } from './TextInspector.tsx';
import { ChartInspectorPanel } from './ChartInspectorPanel.tsx';
import { ALL_ECHARTS_SERIES_TYPES, ChartConfig } from '../../engine/charts/chartTypes.ts';
import { buildChartVectorObjects, findSelectedChartAnchor, regenChartGroup } from '../../engine/charts/chartVectorRenderer.ts';
import { aiLiveConnector } from '../../bridge/aiLiveConnector.tsx';
import { registerAndroidBackHandler, triggerHaptic } from '../../bridge/androidNativeBridge.ts';

const VectorEditor = ({
  initialSvg,
  initialDoc = null,
  projectId = null,
  projectName = 'Untitled Project',
  saveStatus = 'saved',
  onDocumentCommit = null,
  onBackToWorkspace = null,
  onRenameProject = null,
  onExportBackup = null,
  onRetrySave = null,
  flash,
  active = true,
  full = true,
  prefs = DEFAULT_PREFS,
  setPrefs = null,
  onHelp = () => {},
  onSettings = () => {}
}) => {
  const [renderCfg, setRenderCfgState] = useState(() => ({
    ...RENDER_CONFIG
  }));
  const [diagOpen, setDiagOpen] = useState(false);
  /* Debugging Mode (Pendekatan A): default MATI; state + ref cermin agar
     toggle bisa dipanggil dari handler keyboard tanpa stale closure. */
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const debugEnabledRef = useRef(false);
  const [renderError, setRenderError] = useState(false);
  const [benchResults, setBenchResults] = useState(null);
  useEffect(() => {
    const onCfg = () => {
      setRenderCfgState({
        ...RENDER_CONFIG
      });
      if (sceneRendererRef.current) sceneRendererRef.current.requestRender(true);
    };
    const onAcc = () => {
      if (sceneRendererRef.current) sceneRendererRef.current.requestRender(true);
    };
    window.addEventListener('geovanta-render-config', onCfg);
    window.addEventListener('geovanta-accent-change', onAcc);
    return () => {
      window.removeEventListener('geovanta-render-config', onCfg);
      window.removeEventListener('geovanta-accent-change', onAcc);
    };
  }, []);
  const L = getAppStr(prefs && prefs.lang);
  const TT = prefs && prefs.lang === 'en' ? TIPS_EN : TIPS;
  const unsSummary = d => {
    if (d && d.unsupportedElements && d.unsupportedElements.length) return d.unsupportedElements.slice(0, 6).join(', ') + (d.unsupportedElements.length > 6 ? ' +' + (d.unsupportedElements.length - 6) + L.edUnsupportedMore : '');
    const s = d && d.unsupportedSummary;
    return s ? s.replace(' lainnya', L.edUnsupportedMore) : L.edUnsupportedDefault;
  };
  const say = (m: any, action: any = null) => {
    if (!full && flash) flash(m);
    /* Pesan status editor (ved-toast) diterjemahkan di sini; toast App
       diterjemahkan saat render di App.tsx. */
    setLmsg(translateToast(m, prefs && prefs.lang));
    setLmsgAct(action && typeof action.onClick === 'function' && typeof action.label === 'string' ? {
      label: translateToast(action.label, prefs && prefs.lang),
      onClick: action.onClick
    } : null);
    clearTimeout(lmT.current);
    lmT.current = setTimeout(() => {
      setLmsg('');
      setLmsgAct(null);
    }, 2200);
  };
  /* Warna terakhir (Task 3): 10 warna solid terakhir dari ColorField,
     disimpan di prefs.recentColors (App yang me-persist via savePrefs).
     Hanya warna solid alpha penuh yang dicatat; 'none' dan warna
     transparan dilewati. */
  const rememberRecentColor = v => {
    if (typeof setPrefs !== 'function' || typeof v !== 'string') return;
    const p = parseColorWithAlpha(v);
    if (p.isNone || p.a < 0.999) return;
    const hex = p.hex.toLowerCase();
    setPrefs(prev => {
      const cur = Array.isArray(prev && prev.recentColors) ? prev.recentColors : [];
      const next = [hex, ...cur.filter(c => c !== hex)].slice(0, 10);
      if (next.length === cur.length && next.every((c, i) => c === cur[i])) return prev;
      return { ...prev, recentColors: next };
    });
  };
  /* Ikon terakhir (Task 7, Iconify): maks. 12 nama PENUH "prefix:nama"
     dari sisipan yang berhasil, disimpan di prefs.recentIcons (App yang
     me-persist via savePrefs). Hanya nama penuh yang dicatat — nama
     pendek tanpa ":" tidak bisa di-resolve insert Task 6 (prefix
     diturunkan dari nama; tanpa ":" -> toast, nol objek), jadi nama
     seperti itu tidak pernah disimpan. Pola rememberRecentColor. */
  const rememberRecentIcon = fullName => {
    if (typeof setPrefs !== 'function' || typeof fullName !== 'string') return;
    const name = fullName.trim();
    if (!name.includes(':')) return;
    setPrefs(prev => {
      const cur = Array.isArray(prev && prev.recentIcons) ? prev.recentIcons : [];
      const next = [name, ...cur.filter(c => c !== name)].slice(0, 12);
      if (next.length === cur.length && next.every((c, i) => c === cur[i])) return prev;
      return { ...prev, recentIcons: next };
    });
  };
  const vectorDocument = normalizeTextDocument;
  const documentForExport = d => d;
  const first = React.useMemo(() => {
    if (initialDoc && Array.isArray(initialDoc.objects) && Array.isArray(initialDoc.viewBox)) return vectorDocument(initialDoc);
    return initialSvg ? VE.parseSVG(initialSvg) : {
      viewBox: [0, 0, 800, 600],
      objects: []
    };
  }, []);
  const initZ = 1;
  const initP = {x: 40, y: 40};
  const fitPendingRef = useRef(true);
  const [doc, setDocS] = useState(first);
  const docRef = useRef(first);
  const hist = useRef<Record<string, any>>({
    s: [first],
    p: 0,
    key: null,
    t: 0,
    sz: null
  });
  const userExplicitAreaRef = useRef(false);
  const [exportArea, setExportAreaState] = useState('board');
  const setExportArea = React.useCallback(val => {
    userExplicitAreaRef.current = true;
    setExportAreaState(val);
  }, []);
  const [sel, setSelS] = useState<{ objs: Set<any>; nodes: Set<any>; handles?: Set<any>; [key: string]: any }>({
    objs: new Set(),
    nodes: new Set()
  });
  const selRef = useRef(sel);
  const setSel = s => {
    selRef.current = s;
    setSelS(s);
    if (!userExplicitAreaRef.current) {
      if (s?.objs?.size > 0) setExportAreaState('sel');
      else setExportAreaState('board');
    } else if (!s?.objs?.size) {
      userExplicitAreaRef.current = false;
      setExportAreaState('board');
    }
  };
  const [tool, setTool] = useState('select');
  const [autoSimplifyOn, setAutoSimplifyOnState] = useState(false);
  const autoSimplifyOnRef = useRef(false);
  const setAutoSimplifyOn = React.useCallback(v => {
    const val = typeof v === 'function' ? v(autoSimplifyOnRef.current) : v;
    autoSimplifyOnRef.current = val;
    setAutoSimplifyOnState(val);
  }, []);
  const toggleAutoSimplify = React.useCallback(() => {
    const next = !autoSimplifyOnRef.current;
    setAutoSimplifyOn(next);
    say(next ? (prefs?.lang === 'en' ? 'Auto-Simplify enabled (100% curve precision)' : 'Auto-Simplify aktif (100% presisi kurva)') : (prefs?.lang === 'en' ? 'Auto-Simplify disabled' : 'Auto-Simplify dimatikan'));
  }, [prefs?.lang]);
  /* Task 5 (Iconify, R17): wrapper toggle untuk floating bar — klik tombol
     Ikon saat tool sudah 'iconify' kembali ke 'select'; semua tool lain
     pass-through. Hanya prop yang diteruskan ke EditorFloatingToolbar yang
     memakai wrapper ini; pemakaian setTool internal tidak berubah. */
  const setToolToggle = React.useCallback(k => {
    setTool(prev => ((k === 'iconify' && prev === 'iconify') || (k === 'charts' && prev === 'charts') ? 'select' : k));
  }, []);
  const [chartsEditTarget, setChartsEditTarget] = React.useState<{ groupId: string; config: ChartConfig } | null>(null);
  const onChartsClose = React.useCallback(() => {
    setChartsEditTarget(null);
    setTool(prev => (prev === 'charts' ? 'select' : prev));
  }, []);
  const onChartInsert = React.useCallback((cfg: ChartConfig) => {
    const cur = docRef.current;
    const usedGroups = new Set((cur.objects || []).map(o => o.group).filter(Boolean));
    const baseGid = `chart-${cfg.chartType}`;
    let gid = baseGid, gi = 1;
    while (usedGroups.has(gid)) gid = `${baseGid}-${++gi}`;
    const existingNames = new Set((cur.objects || []).map(o => o.name).filter(Boolean) as string[]);
    let originX = 100, originY = 100;
    if (boxRef.current) {
      const r = boxRef.current.getBoundingClientRect();
      const ctr = toDoc(r.left + r.width / 2, r.top + r.height / 2);
      originX = Math.round(ctr.x - (cfg.width || 600) / 2);
      originY = Math.round(ctr.y - (cfg.height || 400) / 2);
    }
    const { objects: chartObjs, error } = buildChartVectorObjects(cfg, {
      groupId: gid,
      originX,
      originY,
      existingNames,
    });
    if (error || !chartObjs.length) {
      say(error || 'Gagal membuat chart vektor');
      return;
    }
    commit({ ...cur, objects: [...cur.objects, ...chartObjs] });
    setSel({ objs: new Set(chartObjs.map(o => o.id)), nodes: new Set() });
    setChartsEditTarget(null);
    setTool('select');
    setRightOpen(true);
    say((prefs?.lang === 'en' ? 'Vector chart inserted: ' : 'Chart vektor ditambahkan: ') + cfg.chartType);
  }, [prefs?.lang]);

  const onChartConfigChange = React.useCallback((groupId: string, nextConfig: ChartConfig, meta?: { coalesce?: string }) => {
    const d = docRef.current;
    const members = (d.objects || []).filter(
      o => o && ((o.gen && (o.gen.kind === 'chart' || o.gen.kind === 'chart-member') && o.gen.chartGroupId === groupId) || o.group === groupId)
    );
    if (!members.length) return;
    const { objects: newObjs, error } = regenChartGroup(members, nextConfig, d.objects || []);
    if (error || !newObjs.length) {
      say(error || 'Gagal memperbarui chart');
      return;
    }
    const memberIds = new Set(members.map(m => m.id));
    const firstIdx = d.objects.findIndex(o => o && memberIds.has(o.id));
    const rest = d.objects.filter(o => o && !memberIds.has(o.id));
    rest.splice(Math.max(0, Math.min(firstIdx, rest.length)), 0, ...newObjs);
    commit({ ...d, objects: rest }, meta?.coalesce ? { coalesce: meta.coalesce } : undefined);
    setSel({ objs: new Set(newObjs.map(o => o.id)), nodes: new Set() });
  }, []);

  const onChartDetach = React.useCallback((groupId: string) => {
    const d = docRef.current;
    let changed = false;
    const nextObjects = (d.objects || []).map(o => {
      if (o && o.gen && (o.gen.kind === 'chart' || o.gen.kind === 'chart-member') && o.gen.chartGroupId === groupId) {
        changed = true;
        const { gen: _removed, ...rest } = o;
        return rest;
      }
      return o;
    });
    if (!changed) return;
    commit({ ...d, objects: nextObjects });
    say(prefs?.lang === 'en' ? 'Chart detached to pure vectors' : 'Chart dilepas menjadi vektor murni');
  }, [prefs?.lang]);
  /* Debugging Mode (Pendekatan A): toggle + pencatat transisi. setEnabled
     sendiri mencatat 'debug-mode-on/off'; snapshot perf dicatat sekali
     saat mode dinyalakan. */
  const debugPrevToolRef = useRef(tool);
  const debugPrevSelRef = useRef('');
  const debugZoomTimerRef = useRef(0);
  const toggleDebugMode = () => {
    const next = !debugEnabledRef.current;
    debugEnabledRef.current = next;
    setDebugEnabled(next);
    DEBUG_LOG.setEnabled(next);
    if (next) {
      setDebugOpen(true);
      try {
        DEBUG_LOG.log('perf', 'perf-snapshot', 'toggleDebugMode', 'src/components/editor/VectorEditor.tsx', PERF_TELEMETRY.getBadgeText());
      } catch (e) {}
    }
  };
  /* Task 5 (Iconify): onClose stabil — setTool adalah setter state React
     yang identitasnya stabil, jadi callback tidak pernah stale meskipun
     effect Esc panel hanya berdependensi [open]. */
  const onIconifyClose = React.useCallback(() => setTool('select'), []);
  /* Task 4 (Iconify modal): penghitung cascade sisipan berurutan —
     sisipan ke-n dari satu sesi modal bergeser +24*(n % 10) px ke
     kanan-bawah dalam koordinat dokumen (diterapkan di onIconifyInsert
     sebelum VE.translate). Hanya sisipan BERHASIL yang memajukan
     penghitung (increment sesudah commit; catch tidak menyentuh ref).
     Reset: modal tertutup ⟺ tool bukan 'iconify' (modal mount dengan
     open={tool === 'iconify'}), jadi saat tool berubah dari 'iconify'
     ke bukan-'iconify', penghitung kembali ke 0. */
  const iconifyCascadeRef = useRef(0);
  const iconifyPrevToolRef = useRef(tool);
  useEffect(() => {
    if (iconifyPrevToolRef.current === 'iconify' && tool !== 'iconify') iconifyCascadeRef.current = 0;
    iconifyPrevToolRef.current = tool;
  }, [tool]);
  /* Task 6 (Iconify): alur sisip — loadSet -> buildIconSvg -> aturan warna
     (isPaletteIcon) -> VE.parseSVG -> skala ke frame 96 px di tengah
     viewport, satu grup bernama, metadata icon, satu entri riwayat,
     langsung terseleksi. Gagal -> toast, nol objek dibuat (commit hanya
     terjadi sesudah parse + transform berhasil).
     Aturan warna (spec §7.5): ikon palette mempertahankan warna aslinya;
     ikon monokrom memakai gaya AKTIF (shapeSty — gaya yang sama dipakai
     makeShape untuk shape baru): path ber-fill memakai Fill aktif, path
     ber-stroke memakai warna + ketebalan Stroke aktif. Ketebalan aktif
     diterapkan dalam ruang ikon, lalu skala frame mengalikannya (skala
     artwork seragam — stroke native 2 pada 24 unit ter-render 8 pada 96,
     seperti yang diverifikasi Task 1; bila sw aktif <= 0, pakai lebar
     native ikon supaya ikon stroke-based tidak lenyap). Lisensi dari API
     berupa objek {title, spdx, url}; metadata menyimpan string SPDX
     (spec §7.6 mencontohkan string, mis. "Apache-2.0"). Nama grup =
     nama ikon penuh, diunikkan bila bentrok (pola grup- di importFiles).
     Ikon recent ({name} saja, tanpa prefix/license — Task 7): prefix
     diturunkan dari nama bila berbentuk "prefix:nama"; license dicari
     dari listCollections (best-effort, tidak pernah menggagalkan sisip).
     Nama tanpa prefix sama sekali tidak bisa di-resolve -> toast. */
  const onIconifyInsert = React.useCallback(async icon => {
    const fullName = typeof icon === 'string' ? icon : (icon && icon.name) || '';
    if (!fullName || typeof fullName !== 'string') return;
    const prefix = (icon && typeof icon === 'object' && icon.prefix)
      || (fullName.includes(':') ? fullName.split(':')[0] : '');
    if (!prefix) {
      say('Ikon tidak bisa disisipkan: nama set tidak diketahui');
      return;
    }
    if (!boxRef.current) return;
    try {
      const setData = await loadSet(prefix);
      const palette = isPaletteIcon(icon, setData);
      const st = shapeStyRef.current || { fill: '#18181b', stroke: '#18181b', sw: 2 };
      const parsed = VE.parseSVG(buildIconSvg(fullName, setData));
      if (parsed.error || !parsed.objects.length) throw new Error('Ikon tidak bisa diurai');
      const vb = parsed.viewBox || [0, 0, 24, 24];
      const targetSize = 96;
      const k = targetSize / (vb[2] || 24);
      const r = boxRef.current.getBoundingClientRect();
      const ctr = toDoc(r.left + r.width / 2, r.top + r.height / 2);
      const dx0 = ctr.x - (vb[0] + vb[2] / 2) * k;
      const dy0 = ctr.y - (vb[1] + vb[3] / 2) * k;
      /* Sisipan beruntun berjejer rapi dalam grid berbasis viewport aktif */
      const gap = 16;
      const stepX = targetSize + gap;
      const stepY = targetSize + gap;
      const colsPerRow = 8;
      const idx = iconifyCascadeRef.current;
      const col = idx % colsPerRow;
      const row = Math.floor(idx / colsPerRow);
      const dx = dx0 + col * stepX;
      const dy = dy0 + row * stepY;
      const cur = docRef.current;
      const existingFrames = cur.objects.filter(o => o.containerType === 'frame' || o.isIconFrame);

      let license = (icon && typeof icon === 'object') ? icon.license : null;
      if (license == null) {
        try {
          const cols = await listCollections();
          license = (cols.find(c => c.prefix === prefix) || {}).license ?? null;
        } catch (e) { license = null; }
      }
      license = typeof license === 'string' ? license : (license && (license.spdx || license.title)) || null;
      const usedNames = new Set(cur.objects.map(o => o.name));
      const usedGroups = new Set(cur.objects.map(o => o.group).filter(Boolean));
      const uniqName = n => {
        let c = n, i = 2;
        while (usedNames.has(c)) c = n + '-' + i++;
        usedNames.add(c);
        return c;
      };
      let gid = fullName, gi = 2;
      while (usedGroups.has(gid)) gid = fullName + '-' + gi++;

      /* Frame-split & Stitching:
         1. Terapkan warna aktif pada ikon monokrom (dengan mempertahankan alpha/fill-opacity asli bila ada).
         2. Jahit kuadran/segmen busur terbuka menjadi lingkaran tertutup utuh,
            dan pertahankan topologi kurva & fillRule asli SVG tanpa penyederhanaan yang merusak bentuk. */
      const styledObjects = parsed.objects.map(o => {
        let q = { ...o };
        if (!palette && !q.grad) {
          if (q.fill && q.fill !== 'none') {
            let nextFill = st.fill;
            if (typeof parseColorWithAlpha === 'function' && typeof formatColorWithAlpha === 'function') {
              const orig = parseColorWithAlpha(q.fill);
              const act = parseColorWithAlpha(st.fill);
              if (orig && !orig.isNone && orig.a < 0.999) {
                nextFill = formatColorWithAlpha(act.hex || st.fill, orig.a * (act.a ?? 1));
              }
            }
            q = { ...q, fill: nextFill };
          }
          if (q.stroke && q.stroke !== 'none') {
            q = { ...q, stroke: st.stroke, strokeWidth: st.sw > 0 ? st.sw : (q.strokeWidth || 0) };
          }
        }
        return q;
      });

      const cleaned = VE.cleanAndStitchIconObjects ? VE.cleanAndStitchIconObjects(styledObjects, 0.05) : styledObjects;

      const members = [];
      const fallback = [];
      cleaned.forEach((o, pi) => {
        let q = o;
        if (autoSimplifyOnRef.current) {
          const simplifiedSubs = (q.subs || []).map(sp => {
            try {
              const s = VE.simplifySubpath(sp, { tolerance: VE.simplifyLevelTolerance(100) / k });
              return s && s.nodes && s.nodes.length >= 2 ? s : sp;
            } catch (e) { return sp; }
          });
          q = { ...q, subs: simplifiedSubs };
        }
        q = VE.scaleObj(q, 0, 0, k);
        if (q.stroke && q.stroke !== 'none' && (q.strokeWidth || 0) > 0) q = { ...q, strokeWidth: q.strokeWidth * k };
        q = VE.translate(q, dx, dy);
        const objName = uniqName(q.name || (q.isCircle ? 'Lingkaran' : 'path'));
        const srcId = q.id || (fullName + '-p' + (pi + 1));
        const member = {
          ...q,
          id: VE.uid(),
          name: objName,
          group: gid,
          icon: { name: fullName, license },
          containerType: 'frame',
          isIconFrame: true,
          iconSrc: srcId,
        };
        members.push(member);
        fallback.push(member);
      });
      let finalDoc, selIds;
      if (members.length) {
        const res = VE.createFrame(
          { ...cur, objects: [...cur.objects, ...members] },
          new Set(members.map(m => m.id)),
          { rect: [dx, dy, dx + targetSize, dy + targetSize], fill: 'transparent', stroke: 'none' },
        );
        // createFrame memakai group 'Frame-N'; samakan ke gid (nama ikon)
        // dan tandai semua anggota sebagai frame ikon.
        finalDoc = {
          ...res.doc,
          objects: res.doc.objects.map(o => {
            if (o.group !== res.frameId) return o;
            const isBg = o.isFrameBg || o.isAutoFrame;
            return { ...o, group: gid, isIconFrame: true, ...(isBg ? { name: gid + '-bg' } : {}) };
          }),
        };
        selIds = new Set(res.selIds);
      } else {
        finalDoc = { ...cur, objects: [...cur.objects, ...fallback] };
        selIds = new Set(fallback.map(o => o.id));
      }
      commit(finalDoc, null);
      /* Task 4: hanya sisipan BERHASIL yang memajukan penghitung
         cascade — baris ini hanya tercapai bila commit di atas tidak
         melempar; throw di atas (loadSet / parse / transform) langsung
         ke catch tanpa menyentuh ref (Review Focus #5). */
      iconifyCascadeRef.current += 1;
      setSel({ objs: selIds, nodes: new Set() });
      say('Ikon ' + fullName + ' disisipkan');
      /* Task 7: hanya sisipan BERHASIL yang dicatat sebagai recent —
         nama penuh "prefix:nama" (rememberRecentIcon menolak nama
         tanpa ":"). setPrefs adalah setter state React App yang
         identitasnya stabil, jadi closure useCallback([]) di sini
         yang menangkap instans pertama tetap benar. */
      rememberRecentIcon(fullName);
    } catch (e) {
      say('Gagal menyisipkan ikon ' + fullName + ': ' + (e && e.message || 'kesalahan tidak diketahui'));
    }
  }, []);
  const [editingText, setEditingText] = useState(null);
  const textEditViewportRef = useRef(null);
  const [fontCatalogVer, setFontCatalogVer] = useState(0);
  // Google Fonts embed: keluarga yang sedang diunduh/dsematkan + peta job
  // berjalan (pilih keluarga yang sama 2x cepat tidak mengunduh 2x).
  const googleEmbedPending = useRef(new Map());
  const [googleFontStatus, setGoogleFontStatus] = useState(null);
  const [zoom, setZoom] = useState(initZ),
    [pan, setPan] = useState(initP);
  const [curveDragOn, setCurveDragOn] = useState(true); /* Aktif secara default agar handle No Mirroring bisa digeser melengkung */
  const zoomRef = useRef(initZ),
    panRef = useRef(initP),
    vpRef = useRef(null),
    boxRectRef = useRef<DOMRect | null>(null),
    viewPend = useRef(0),
    viewSettleTimer = useRef(0);
  const zoomPctRef = useRef(null),
    mobZoomPctRef = useRef(null),
    zoomSliderDomRef = useRef(null);
  const displayZoomRef = useRef(initZ);
  const lastPointerTypeRef = useRef<string>('mouse');
  const activeTouchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{ dist: number; midX: number; midY: number; startZoom: number; startPan: { x: number; y: number } } | null>(null);
  const multiTapRef = useRef<{ maxFingers: number; startTime: number; origins: Map<number, { x: number; y: number }>; moved: boolean } | null>(null);
  const longPressTimerRef = useRef<number>(0);
  const longPressOriginRef = useRef<{ pointerId: number; x: number; y: number; target: any } | null>(null);
  const sceneCanvasRef = useRef(null),
    cpuCanvasRef = useRef(null),
    sceneRendererRef = useRef(null),
    liveRafRef = useRef(0),
    isInteractingPaintRef = useRef(false),
    docRevRef = useRef(1);
  const syncZoomSidebarDom = zVal => {
    const fmt = zFmt(zVal);
    if (zoomPctRef.current) {
      zoomPctRef.current.textContent = fmt;
    }
    if (mobZoomPctRef.current) {
      mobZoomPctRef.current.textContent = fmt;
    }

    const slEl = zoomSliderDomRef.current;
    if (slEl && !slEl.classList.contains('drag')) {
      const slVal = clampN(vzToSl(zVal), 0, 1000);
      const pct = slVal / 1000 * 100;
      const fillEl = slEl.querySelector('.sl-f');
      const thumbEl = slEl.querySelector('.sl-h');
      if (fillEl) {
        fillEl.style.transition = 'none';
        fillEl.style.width = pct + '%';
      }
      if (thumbEl) {
        thumbEl.style.transition = 'none';
        thumbEl.style.left = pct + '%';
      }
    }
  };
  /* Helper format matriks kamera <g ref={vpRef}>:
     matrix(z 0 0 z px py) memetakan titik dokumen (x,y) -> (x*z + px, y*z + py)
     identik 100% dengan translate(px, py) scale(z) tanpa string parsing ganda. */
  const fmtVpMat = (z, px, py) => {
    return 'matrix(' + z + ' 0 0 ' + z + ' ' + px + ' ' + py + ')';
  };
  const applyVP = (syncRender = false, isPanOnly = false) => {
    const g = vpRef.current;
    const z = zoomRef.current,
      p = panRef.current;
    if (g) {
      g.setAttribute('transform', fmtVpMat(z, p.x, p.y));
      if (!isPanOnly) {
        const bbG = g.querySelector('.vc-bbox-overlay');
        if (bbG) {
          const hs = (isMobileRef.current ? 12 : 6) / z,
            h2 = hs * 0.5;
          const rects = bbG.querySelectorAll('rect[data-hx]');
          for (let i = 0; i < rects.length; i++) {
            const rEl = rects[i];
            const hx = parseFloat(rEl.getAttribute('data-hx'));
            const hy = parseFloat(rEl.getAttribute('data-hy'));
            if (isFinite(hx) && isFinite(hy)) {
              rEl.setAttribute('x', String(hx - h2));
              rEl.setAttribute('y', String(hy - h2));
              rEl.setAttribute('width', String(hs));
              rEl.setAttribute('height', String(hs));
            }
          }
        }
        const dashEls = g.querySelectorAll('[data-dash-overlay]');
        for (let i = 0; i < dashEls.length; i++) {
          const dEl = dashEls[i];
          const pat = dEl.getAttribute('data-dash-overlay');
          if (!pat) continue;
          const dw = parseFloat(dEl.getAttribute('width')) || 0;
          const dh = parseFloat(dEl.getAttribute('height')) || 0;
          if ((dw + dh) * 2 * z > 12000) {
            if (dEl.hasAttribute('stroke-dasharray')) dEl.removeAttribute('stroke-dasharray');
          } else if (dEl.getAttribute('stroke-dasharray') !== pat) {
            dEl.setAttribute('stroke-dasharray', pat);
          }
        }
        if (containerBoxes.length) {
          const zLbl = Math.max(1e-4, Math.min(1, z));
          const baseZoomFs = Math.min(36, Math.max(13, Math.round(13 / zLbl * 100) / 100));
          const fOff = Math.min(19.2, Math.max(6, Math.round(8 / zLbl * 100) / 100));
          const fLbls = g.querySelectorAll('text[data-frame-lbl]');
          for (let i = 0; i < fLbls.length; i++) {
            const tEl = fLbls[i];
            const fw = parseFloat(tEl.getAttribute('data-fw')) || 0;
            const baseFs = parseFloat(tEl.getAttribute('data-base-fs')) || 10;
            const textLen = (tEl.textContent || '').length;
            let targetFs = baseFs;
            if (fw > 0 && textLen > 0) {
              const maxFsByW = fw / (textLen * 0.72);
              targetFs = Math.min(fw < 200 ? baseFs : baseZoomFs, maxFsByW);
            }
            const finalFs = String(Math.max(6, Math.round(targetFs * 10) / 10));
            if (tEl.getAttribute('font-size') !== finalFs) tEl.setAttribute('font-size', finalFs);
            const by = parseFloat(tEl.getAttribute('data-by'));
            if (isFinite(by)) {
              const off = Math.min(fOff, Math.max(5, targetFs * 0.55));
              const nextY = String(Math.round((by - off) * 100) / 100);
              if (tEl.getAttribute('y') !== nextY) tEl.setAttribute('y', nextY);
            }
          }
        }
      }
    }
    if (displayZoomRef.current !== z) {
      displayZoomRef.current = z;
      syncZoomSidebarDom(z);
    }
    textEditViewportRef.current?.setCamera(z, p);
    if (boxRef.current) {
      if (sceneRendererRef.current) {
        const cw = boxRectRef.current && boxRectRef.current.width || boxRef.current.clientWidth || 1280;
        const ch = boxRectRef.current && boxRectRef.current.height || boxRef.current.clientHeight || 800;
        sceneRendererRef.current.setCamera(z, p.x, p.y, cw, ch);
        if (syncRender) sceneRendererRef.current.renderFrame();else sceneRendererRef.current.requestRender();
      }

    }
  };
  const flushView = (syncRender = false) => {
    if (viewPend.current) {
      cancelAnimationFrame(viewPend.current);
      viewPend.current = 0;
    }
    if (viewSettleTimer.current) {
      clearTimeout(viewSettleTimer.current);
      viewSettleTimer.current = 0;
    }

    setSceneInteractingZoom(false);
    sceneRendererRef.current?.setCameraInteracting(false);
    if (boxRef.current) boxRef.current.removeAttribute('data-zooming');
    const z = zoomRef.current,
      p = {
        x: panRef.current.x,
        y: panRef.current.y
      };
    applyVP(syncRender);
    displayZoomRef.current = z;
    syncZoomSidebarDom(z);
    setTimeout(() => {
      startTransition(() => {
        setZoom(prevZ => Math.abs(prevZ - z) > 1e-6 ? z : prevZ);
        // Pan state harus selalu sinkron dengan panRef (tanpa syarat): TextEditOverlay
        // memposisikan kotak edit dari state `pan`, sementara toDoc/renderer memakai
        // panRef.
        setPan(prevP => Math.abs(prevP.x - p.x) > 0.5 || Math.abs(prevP.y - p.y) > 0.5 ? p : prevP);
      });
    }, 0);
  };
  // Gabungkan perubahan kamera ke satu frame, lalu sinkronkan state React saat gestur berhenti.
  const softView = () => {
    PERF_TELEMETRY.markInteractionFrame();
    setSceneInteractingZoom(true);
    sceneRendererRef.current?.setCameraInteracting(true);
    if (boxRef.current && !boxRef.current.hasAttribute('data-zooming')) {
      boxRef.current.setAttribute('data-zooming', '1');
    }
    const scheduleSettle = (delayMs = 120) => {
      if (viewSettleTimer.current) clearTimeout(viewSettleTimer.current);
      const settleFn = () => {
        viewSettleTimer.current = 0;
        if (pinchStateRef.current) return;
        if (dragRef.current && dragRef.current.type === 'pan') return;
        const slNow = zoomSliderDomRef.current;
        if (slNow && slNow.classList.contains('drag')) {
          viewSettleTimer.current = setTimeout(settleFn, 60);
          return;
        }
        flushView(false);
      };
      viewSettleTimer.current = setTimeout(settleFn, delayMs);
    };
    if (!viewPend.current) {
      viewPend.current = requestAnimationFrame(() => {
        viewPend.current = 0;
        const isPanDrag = !!(dragRef.current && dragRef.current.type === 'pan');
        sceneRendererRef.current?.setCameraInteracting(true);
        applyVP(true, isPanDrag);
        // Re-arm settle timer AFTER the interactive frame finishes rendering so a busy
        // gesture frame never causes flushView() to fire mid-zoom.
        if (!isPanDrag) scheduleSettle(120);
      });
    }
    scheduleSettle(120);
  };
  /* ukuran grid adaptif: kelipatan 1, 2, 5 x 10^n yang sinkron dengan garis visual sceneRenderer */
  const gridStep = () => {
    return calcGridStep(zoomRef.current);
  };
  const [snapOn, setSnapOn] = useState(true),
    [gridOn, setGridOn] = useState(false),
    [rulersOn, setRulersOn] = useState(false),
    [rulerUnit, setRulerUnit] = useState<RulerUnit>('px'),
    [rulerOrigin, setRulerOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 }),
    [guides, setGuides] = useState<GuideLine[]>([]),
    [guidesVisible, setGuidesVisible] = useState(true),
    [guidesLocked, setGuidesLocked] = useState(false);
  const snapOnRef = useRef(snapOn);
  snapOnRef.current = snapOn;
  const gridOnRef = useRef(gridOn);
  gridOnRef.current = gridOn;
  const [snapCfg, setSnapCfgS] = useState(() => {
    const res = { ...DEFAULT_SNAP_CFG };
    try {
      const s = JSON.parse(localStorage.getItem('svgpeak-snap-cfg') || '{}');
      if (s && typeof s === 'object') {
        Object.keys(DEFAULT_SNAP_CFG).forEach(k => {
          if (typeof s[k] === 'boolean') res[k] = s[k];
        });
      }
    } catch (e) {}
    return res;
  });
  const snapCfgRef = useRef(snapCfg);
  snapCfgRef.current = snapCfg;
  const setSnapCfg = patch => setSnapCfgS(prev => {
    const next = {
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch)
    };
    try {
      localStorage.setItem('svgpeak-snap-cfg', JSON.stringify(next));
    } catch (e) {}
    return next;
  });
  const [snapMenuOpen, setSnapMenuOpen] = useState(false),
    snapMenuBtn = useRef(null),
    snapCacheRef = useRef(null);
  const [mirrorOpen, setMirrorOpen] = useState(false),
    mirrorBtn = useRef(null);
  const [boolOpen, setBoolOpen] = useState(false),
    boolBtn = useRef(null);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [activeGradSlot, setActiveGradSlot] = useState<'fill' | 'stroke'>('fill');
  const [activeStrokeStopId, setActiveStrokeStopId] = useState<string | null>(null);
  const [bg, setBg] = useState({
      mode: 'transparent',
      color: '#ffffff'
    });
  const [expFmt, setExpFmt] = useState('svg'),
    [expScale, setExpScale] = useState(2);
  /* Warna default shape & teks mengikuti accent color Pengaturan: fill = accent,
     stroke = varian gelap accent (value HSV x 0.45, senada aksen). */
  const accentStroke = acc => {
    try {
      if (typeof acc !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(acc)) return DEFAULT_PREFS.accent;
      const [h, sv, v] = hex2hsv(acc);
      return hsv2hex(h, sv, Math.max(0.05, v * 0.45));
    } catch (e) {
      return DEFAULT_PREFS.accent;
    }
  };
  const [shapeKind, setShapeKind] = useState('rect'),
    [shapeSty, setShapeSty] = useState(() => {
      const acc = prefs && prefs.accent || '#13b152';
      return {
        fill: acc,
        stroke: accentStroke(acc),
        sw: 2
      };
    });
  /* Task 6 (Iconify): shapeSty dibaca handler insert (useCallback [] —
     pola yang sama dengan blobParamsRef): ref selalu segar, callback
     tidak pernah stale. */
  const shapeStyRef = useRef(shapeSty);
  shapeStyRef.current = shapeSty;
  /* Sinkronkan warna default shape/teks saat accent color di Pengaturan berubah. */
  useEffect(() => {
    const acc = prefs && prefs.accent || '#13b152';
    setShapeSty(s => ({ ...s, fill: acc, stroke: accentStroke(acc) }));
  }, [prefs && prefs.accent]);
  /* Parameter Blob Generator (Task 2): nilai default untuk blob berikutnya;
     blobParamsRef dibaca handler pointer (drag) agar selalu segar. */
  const [blobParams, setBlobParams] = useState(() => ({
    ...DEFAULT_BLOB_PARAMS,
    seed: Math.floor(Math.random() * 100000)
  }));
  const blobParamsRef = useRef(blobParams);
  /* Perubahan parameter dari inspector: simpan sebagai default baru DAN
     regenerasi blob yang sedang terseleksi (objek yang sama, bukan baru).
     commitObjs key 'blob-param' -> riwayat ter-coalesce selama scrub slider.
     HANYA delta (next) yang diteruskan ke regenBlob: regenBlob sudah
     menggabungkan terhadap gen objek itu sendiri, jadi meneruskan set
     lengkap default sesi akan me-reset parameter blob yang berbeda dari
     default (I1 fix round 1). */
  const onBlobParams = (next, meta) => {
    const merged = { ...blobParamsRef.current, ...next };
    blobParamsRef.current = merged;
    setBlobParams(merged);
    const d = docRef.current;
    let ch = false;
    const objs = d.objects.map(o => {
      if (o && o.gen && o.gen.kind === 'blob' && selRef.current.objs.has(o.id)) {
        ch = true;
        return regenBlob(o, next);
      }
      return o;
    });
    if (!ch) return;
    const nextDoc = { ...d, objects: objs };
    if (meta && meta.isLive) {
      live(nextDoc, { isLive: true });
    } else {
      commit(nextDoc, 'blob-param');
    }
  };
  /* Parameter Weave Generator (Task 3): nilai default untuk weave berikutnya;
     weaveParamsRef dibaca handler pointer (drag) agar selalu segar. */
  const [weaveParams, setWeaveParams] = useState(() => ({ ...DEFAULT_WEAVE_PARAMS }));
  const weaveParamsRef = useRef(weaveParams);
  /* Perubahan parameter dari inspector: simpan sebagai default baru DAN
     regenerasi grup weave yang sedang terseleksi (objek yang sama, bukan baru).
     commit key 'weave-param' -> riwayat ter-coalesce selama scrub slider.
     HANYA delta (next) yang diteruskan ke regen: regen menggabungkan terhadap
     gen grup itu sendiri, jadi meneruskan set lengkap default sesi akan
     me-reset parameter grup yang berbeda dari default (pelajaran I1 Task 2).
     TIDAK bisa memakai commitObjs (map 1:1): perubahan Kolom/Baris mengubah
     JUMLAH strip, jadi dokumen baru dibangun lalu commit() penuh. */
  const onWeaveParams = (next, meta) => {
    const merged = { ...weaveParamsRef.current, ...next };
    weaveParamsRef.current = merged;
    setWeaveParams(merged);
    const d = docRef.current,
      selIds = selRef.current.objs;
    const first = d.objects.find(o => o && o.gen && o.gen.kind === 'weave' && selIds.has(o.id));
    if (!first || !first.group) return;
    const gid = first.group;
    const members = d.objects.filter(o => o && o.group === gid && o.gen && o.gen.kind === 'weave');
    if (!members.length) return;
    const newStrips = regenWeave(members, next);
    if (!newStrips.length) return;
    const firstIdx = d.objects.findIndex(o => o && o.group === gid);
    const rest = d.objects.filter(o => !(o && o.group === gid));
    rest.splice(Math.max(0, Math.min(firstIdx, rest.length)), 0, ...newStrips);
    const nextDoc = { ...d, objects: rest };
    if (meta && meta.isLive) {
      live(nextDoc, { isLive: true });
      selRef.current = { objs: new Set(newStrips.map(o => o.id)), nodes: new Set() };
    } else {
      commit(nextDoc, 'weave-param');
      setSel({ objs: new Set(newStrips.map(o => o.id)), nodes: new Set() });
    }
  };
  /* Info live Line Segment (Task 4, Ruling E): panjang + sudut garis yang
     sedang diseret, tampil di panel bantuan kiri (bukan inspector — nilai
     ini sementara dan read-only). null saat tidak ada drag garis. */
  const [lineInfo, setLineInfo] = useState(null);
  const [lineSizeDlg, setLineSizeDlg] = useState<{ x: number; y: number; sx: number; sy: number; len: string; ang: string } | null>(null);
  const arc3Ref = useRef<{ start: { x: number; y: number }; end: { x: number; y: number } | null; id: string; name: string; base: any } | null>(null);
  /* Parameter Arc (Task 5): nilai default untuk busur berikutnya; dipakai
     juga sebagai busur default saat klik tanpa seret (radius/sweep dari
     sini, bukan hardcode — default 50 / 90° sesuai brief).
     arcParamsRef dibaca handler pointer (drag) agar selalu segar. */
  const [arcParams, setArcParams] = useState(() => ({ ...DEFAULT_ARC_PARAMS }));
  const arcParamsRef = useRef(arcParams);
  /* Perubahan parameter dari inspector: simpan sebagai default baru DAN
     regenerasi busur yang sedang terseleksi (objek yang sama, bukan baru).
     commitObjs key 'arc-param' -> riwayat ter-coalesce selama scrub slider.
     HANYA delta (next) yang diteruskan ke regenArc: regenArc sudah
     menggabungkan terhadap gen objek itu sendiri, jadi meneruskan set
     lengkap default sesi akan me-reset parameter busur yang berbeda dari
     default (pelajaran I1 Task 2). commitObjs BOLEH dipakai di sini
     (berbeda dengan Weave): 1 objek tetap 1 objek, hanya jumlah node di
     dalamnya yang berubah. */
  const onArcParams = (next, meta) => {
    const merged = { ...arcParamsRef.current, ...next };
    arcParamsRef.current = merged;
    setArcParams(merged);
    const d = docRef.current;
    let ch = false;
    const objs = d.objects.map(o => {
      if (o && o.gen && o.gen.kind === 'arc' && selRef.current.objs.has(o.id)) {
        ch = true;
        return regenArc(o, next);
      }
      return o;
    });
    if (!ch) return;
    const nextDoc = { ...d, objects: objs };
    if (meta && meta.isLive) {
      live(nextDoc, { isLive: true });
    } else {
      commit(nextDoc, 'arc-param');
    }
  };
  const [openGrp, setOpenGrp] = useState(null);
  const [openRailGrp, setOpenRailGrp] = useState(null);
  const [lastRailAct, setLastRailAct] = useState({
    visGrp: 'veShowNodeGlobal',
    objGrp: 'veDup',
    pathGrp: 'veClose',
    shapeRailGrp: 'veShape',
    blobRailGrp: 'veBlob',
    waveRailGrp: 'veWeave'
  });
  const railGrpRefs = {
    visGrp: useRef(null),
    objGrp: useRef(null),
    pathGrp: useRef(null),
    shapeRailGrp: useRef(null),
    blobRailGrp: useRef(null),
    waveRailGrp: useRef(null)
  };
  const { isMobile } = useMobileViewport();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const [leftOpen, setLeftOpen] = useState(() => !isMobileViewportNow());
  const [rightOpen, setRightOpen] = useState(() => !isMobileViewportNow());
  const rightOpenRef = useRef(rightOpen);
  rightOpenRef.current = rightOpen;
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [mobileInspectorTab, setMobileInspectorTab] = useState<'style' | 'transform' | 'tools' | 'export'>('style');
  const [mobHintDismissed, setMobHintDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('geovanta-mob-hint-v1') === '1';
    } catch {
      return false;
    }
  });
  const prevIsMobileRef = useRef(isMobile);
  useEffect(() => {
    if (prevIsMobileRef.current === isMobile) return;
    prevIsMobileRef.current = isMobile;
    if (isMobile) {
      setLeftOpen(false);
      setRightOpen(false);
      setMobileRailOpen(false);
    } else {
      setLeftOpen(true);
      setRightOpen(true);
      setMobileRailOpen(false);
    }
  }, [isMobile]);
  const toggleMobileLeft = () => {
    setLeftOpen(o => {
      const next = !o;
      if (next) {
        setRightOpen(false);
        setMobileRailOpen(false);
      }
      return next;
    });
  };
  const toggleMobileRight = () => {
    setRightOpen(o => {
      const next = !o;
      if (next) {
        setLeftOpen(false);
        setMobileRailOpen(false);
      }
      return next;
    });
  };
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = 0;
      }
    };
  }, []);
  const toggleMobileRail = () => {
    setMobileRailOpen(o => {
      const next = !o;
      if (next) {
        setLeftOpen(false);
        setRightOpen(false);
      }
      return next;
    });
  };
  const [indivCornerOpen, setIndivCornerOpen] = useState(false);
  const [pickedCornerKeys, setPickedCornerKeys] = useState(() => new Set());
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pasteSvgDraft, setPasteSvgDraft] = useState('');
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState(false);
  const openCodeInspector = React.useCallback(() => setIsCodeInspectorOpen(true), []);
  const closeCodeInspector = React.useCallback(() => setIsCodeInspectorOpen(false), []);
  const toggleCodeInspector = React.useCallback(() => setIsCodeInspectorOpen(o => !o), []);
  useEffect(() => {
    const fn = () => setImportModalOpen(true);
    window.addEventListener('svgpeak-open-import', fn);
    return () => window.removeEventListener('svgpeak-open-import', fn);
  }, []);
  useEffect(() => {
    const fn = () => setIsCodeInspectorOpen(true);
    window.addEventListener('geovanta-open-code-inspector', fn);
    return () => window.removeEventListener('geovanta-open-code-inspector', fn);
  }, []);
  const [lastGrpTool, setLastGrpTool] = useState({
    nodeGrp: 'node',
    drawGrp: 'pen'
  });
  const grpBtnRefs = {
    nodeGrp: useRef(null),
    drawGrp: useRef(null)
  };
  useEffect(() => {
    if (VE_NODE_GROUP.some(x => x[0] === tool) || VE_GEO_GROUP.some(x => x[0] === tool)) setLastGrpTool(s => s.nodeGrp === tool ? s : {
      ...s,
      nodeGrp: tool
    });else if (VE_DRAW_GROUP.some(x => x[0] === tool) || tool === 'shape') setLastGrpTool(s => s.drawGrp === tool ? s : {
      ...s,
      drawGrp: tool
    });
  }, [tool]);
  /* Debugging Mode (Pendekatan A): catat perubahan tool / seleksi / zoom /
     edit-teks lewat effect — satu choke point, tanpa menyentuh tiap
     call-site. Log no-op saat mode MATI, jadi overhead ~nol. */
  useEffect(() => {
    if (debugPrevToolRef.current !== tool) {
      DEBUG_LOG.log('tool', 'tool:' + tool, 'setTool', 'src/components/editor/VectorEditor.tsx', 'tool ' + debugPrevToolRef.current + ' -> ' + tool);
      debugPrevToolRef.current = tool;
    }
  }, [tool]);
  useEffect(() => {
    const key = [...sel.objs].sort().join(',') + '|' + sel.nodes.size;
    if (debugPrevSelRef.current !== key) {
      debugPrevSelRef.current = key;
      if (sel.objs.size) DEBUG_LOG.log('selection', 'select:' + sel.objs.size + ' objek', 'setSel', 'src/components/editor/VectorEditor.tsx', 'objs=' + [...sel.objs].slice(0, 5).join(',') + (sel.objs.size > 5 ? ' +' + (sel.objs.size - 5) : '') + ' nodes=' + sel.nodes.size);
    }
  }, [sel]);
  useEffect(() => {
    if (debugZoomTimerRef.current) clearTimeout(debugZoomTimerRef.current);
    debugZoomTimerRef.current = setTimeout(() => {
      DEBUG_LOG.log('canvas', 'zoom:' + Math.round(zoom * 100) + '%', 'setZ', 'src/components/editor/VectorEditor.tsx', 'zoom=' + zoom);
    }, 400);
    return () => {
      if (debugZoomTimerRef.current) clearTimeout(debugZoomTimerRef.current);
    };
  }, [zoom]);
  useEffect(() => {
    if (editingText) DEBUG_LOG.log('edit', 'text-edit-open:' + editingText.id, 'setEditingText', 'src/components/editor/VectorEditor.tsx', 'id=' + editingText.id + ' isNew=' + !!editingText.isNew);
  }, [editingText]);
  useEffect(() => {
    if (!debugEnabled) return;
    const onErr = e => DEBUG_LOG.log('error', 'error:' + (e && e.message ? String(e.message).slice(0, 120) : 'unknown'), 'window.onerror', 'src/components/editor/VectorEditor.tsx', String(e && e.filename || ''));
    const onRej = e => DEBUG_LOG.log('error', 'unhandledrejection', 'window.onunhandledrejection', 'src/components/editor/VectorEditor.tsx', String(e && e.reason ? e.reason : '').slice(0, 120));
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, [debugEnabled]);
  const [addHov, setAddHov] = useState(null),
    addRaf = useRef(0),
    addEv = useRef(null);
  const [hhHov, setHhHov] = useState(null);
  /* ---- v4.6: Resize interaktif, Pen Tool, Auto-Handle ---- */
  const [ahHov, setAhHov] = useState(null),
    [ahOpt, setAhOpt] = useState({
      tau: 1 / 3,
      scope: 'sub',
      minAng: 0
    });
  const [boxHov, setBoxHov] = useState(null),
    [vcTransforming, setVcTransforming] = useState(false),
    [isMovingObj, setIsMovingObj] = useState(false),
    [measureBadge, setMeasureBadge] = useState(null);
  const [altMeasure, setAltMeasure] = useState(null),
    lastPtr = useRef(null),
    activeBoxRef = useRef(null);
  const [pen, setPenS] = useState(null),
    penRef = useRef(null),
    penRaf = useRef(0),
    penEv = useRef(null);
  const setPen = s => {
    penRef.current = s;
    setPenS(s);
  };
  /* Curvature (Task 6): state in-progress, pola penRef. pts = titik-titik
     { id, x, y, type: 'smooth' | 'corner' }; closed = path sudah ditutup
     via klik titik pertama; base = doc sebelum preview ditambahkan;
     obj = objek preview terakhir (untuk hit-test segmen); toggleTimer /
     togglePid = toggle smooth/corner yang dijadwalkan (anti double-click). */
  const curvatureRef = useRef(null);
  const [penSty, setPenSty] = useState({
    fill: 'none',
    stroke: '#111827',
    sw: 2
  });
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const multiSelectActiveRef = useRef(false);
  multiSelectActiveRef.current = multiSelectActive;
  useEffect(() => {
    if (tool !== 'addnode') setAddHov(null);
    if (tool !== 'addhandle') setHhHov(null);
    if (tool !== 'autohandle') setAhHov(null);
    if (tool !== 'select') {
      setBoxHov(null);
      setVcTransforming(false);
      setMeasureBadge(null);
    }
    if (tool !== 'pen' && penRef.current) finishPen();
    /* Task 2 (Ruling G): ganti tool saat drag Blob berjalan -> buang preview
       TANPA commit (kembalikan doc ke dg.base). */
    if (tool !== 'blob' && dragRef.current && dragRef.current.type === 'blob') {
      const dg = dragRef.current;
      dragRef.current = null;
      setSnapInd(null);
      live(dg.base);
    }
    /* Task 3 (Ruling G): sama untuk drag Weave. */
    if (tool !== 'weave' && dragRef.current && dragRef.current.type === 'weave') {
      const dg = dragRef.current;
      dragRef.current = null;
      setSnapInd(null);
      live(dg.base);
    }
    /* Task 4 (Ruling G): sama untuk drag Line. */
    if (tool !== 'line') {
      setLineSizeDlg(null);
      if (dragRef.current && dragRef.current.type === 'line') {
        const dg = dragRef.current;
        dragRef.current = null;
        setSnapInd(null);
        setLineInfo(null);
        live(dg.base);
      }
    }
    /* Task 5 (Ruling G): sama untuk drag Arc & Three-Point Arc. */
    if (tool !== 'arc') {
      if (arc3Ref.current) {
        const a3 = arc3Ref.current;
        arc3Ref.current = null;
        live(a3.base);
      }
      if (dragRef.current && dragRef.current.type === 'arc') {
        const dg = dragRef.current;
        dragRef.current = null;
        setSnapInd(null);
        live(dg.base);
      }
    }
    /* Task 6 (Ruling G): ganti tool saat menggambar Curvature -> buang
       preview TANPA commit (kembalikan doc ke s.base). */
    if (tool !== 'curvature' && curvatureRef.current) {
      const s = curvatureRef.current;
      if (s.toggleTimer) clearTimeout(s.toggleTimer);
      curvatureRef.current = null;
      live(s.base);
      setDocS(s.base);
    }
    /* Task 7 (Ruling G): ganti tool saat drag Shape Builder berjalan ->
       buang garis stroke sementara TANPA commit (kembalikan doc ke dg.base). */
    if (tool !== 'shapebuilder' && dragRef.current && dragRef.current.type === 'shapebuilder') {
      const dg = dragRef.current;
      dragRef.current = null;
      setSnapInd(null);
      live(dg.base);
    }
  }, [tool]);
  const [showSelNodes, setShowSelNodes] = useState(() => {
    try {
      const v = localStorage.getItem('ve-global-show-nodes');
      return v === null ? true : v === '1';
    } catch (e) {
      return true;
    }
  });
  const [showSelHandles, setShowSelHandles] = useState(() => {
    try {
      const v = localStorage.getItem('ve-global-show-handles');
      return v === null ? true : v === '1';
    } catch (e) {
      return true;
    }
  });
  const [nodeScale, setNodeScale] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('ve-node-scale'));
      return Number.isFinite(v) && v >= 0.4 && v <= 4 ? v : 1;
    } catch (e) {
      return 1;
    }
  });
  const nodeScaleRef = useRef(nodeScale);
  nodeScaleRef.current = nodeScale;
  const updateNodeScale = val => {
    const clamped = Math.max(0.4, Math.min(4, Math.round(Number(val) * 100) / 100));
    nodeScaleRef.current = clamped;
    setNodeScale(clamped);
    try {
      localStorage.setItem('ve-node-scale', String(clamped));
    } catch (e) {}
  };
  const [pruneOpt, setPruneOpt] = useState({
      tol: 0.75,
      cornerDeg: 28
    }),
    [sOpt, setSOpt] = useState({
      maxDev: 1,
      angTol: 3
    }),
    [cornerR, setCornerR] = useState(12),
    [cornerMode, setCornerMode] = useState('circular'),
    [cornerSm, setCornerSm] = useState(0.8);
  const [alOpt, setAlOpt] = useState({
      mode: 'custom',
      deg: 0,
      anchor: 'center',
      slide: true,
      collapse: false
    }),
    [bevelDeg, setBevelDeg] = useState(null);
  /* ---- Transform, Alignment & Auto Layout (v4.4) ---- */
  const [pin, setPin] = useState([0, 0]),
    [lockAR, setLockAR] = useState(false),
    [scaleStk, setScaleStk] = useState(false),
    [rotPivot, setRotPivot] = useState('center');
  const [lay, setLay] = useState({
      dir: 'row',
      cols: 3,
      gap: 12,
      pt: 0,
      pr: 0,
      pb: 0,
      pl: 0,
      split: false,
      ax: 0,
      ay: 0.5,
      frame: true,
      radius: 8
    }),
    alMem = useRef(null);
  const [collapsedGrps, setCollapsedGrps] = useState(new Set()),
    [layerLimit, setLayerLimit] = useState(150);
  const [groupSameColor, setGroupSameColor] = useState(false);
  const [clipFrames, setClipFrames] = useState(true);
  const layerAnchor = useRef(null),
    [layerIns, setLayerIns] = useState(null); /* jangkar Shift+klik & garis sisip drag-drop layer */
  const [dropFrameId, setDropFrameId] = useState(null),
    [dropNoNest, setDropNoNest] = useState(false),
    [renamingId, setRenamingId] = useState(null),
    [renameVal, setRenameVal] = useState('');
  const [dragLayerIds, setDragLayerIds] = useState(null),
    [overFrameId, setOverFrameId] = useState(null),
    renameSkip = useRef(false);
  const layerClickSkipExpandRef = useRef(false);
  const layerScrollRef = useRef(null);
  const layerTreeDomRef = useRef(null);
  const layerScrollRafRef = useRef(0);
  const toggleCollapseGrp = (gid, e) => {
    e.stopPropagation();
    setCollapsedGrps(prev => {
      const n = new Set(prev);
      n.has(gid) ? n.delete(gid) : n.add(gid);
      return n;
    });
  };
  /* ala Figma: memilih objek DI DALAM Frame/Group dari kanvas otomatis membuka Frame/Grup induknya di panel Layer
     (termasuk grup berisi 1 objek) dan menggulir panel Layer agar objek yang diklik langsung terlihat. */
  useEffect(() => {
    if (layerClickSkipExpandRef.current) {
      return;
    }
    if (!sel.objs.size || !collapsedGrps.size) return;
    const got = new Map(),
      hasBgSel = new Set();
    docRef.current.objects.forEach(o => {
      if (!o.group) return;
      if (o.isFrameBg || o.isAutoFrame) {
        if (sel.objs.has(o.id)) hasBgSel.add(o.group);
        return;
      }
      if (sel.objs.has(o.id)) got.set(o.group, (got.get(o.group) || 0) + 1);
    });
    const need = [...got.keys()].filter(g => !hasBgSel.has(g) && got.get(g) > 0);
    if (!need.length) return;
    setCollapsedGrps(prev => {
      if (!need.some(g => prev.has(g))) return prev;
      const n = new Set(prev);
      need.forEach(g => n.delete(g));
      return n;
    });
  }, [sel]);
  const [vcSimpRetain, setVcSimpRetain] = useState(() => {
    try {
      return localStorage.getItem('vc-simplify-retain') === '1';
    } catch (e) {
      return false;
    }
  });
  const [vcSimpSaved, setVcSimpSaved] = useState(() => {
    try {
      const r = JSON.parse(localStorage.getItem('vc-simplify-opts') || 'null');
      if (r && typeof r.tolerance === 'number') return {
        tolerance: clampN(r.tolerance, 0.001, 10000),
        angleThreshold: clampN(r.angleThreshold != null ? r.angleThreshold : 150, 0, 180),
        straightLines: !!r.straightLines,
        showOriginal: !!r.showOriginal
      };
    } catch (e) {}
    return {
      tolerance: 1.0,
      angleThreshold: 150.0,
      straightLines: false,
      showOriginal: false
    };
  });
  const [vcSimp, setVcSimp] = useState(null); /* { mode: 'slider' | 'dialog', baseDoc, baseSel, level, tolerance, angleThreshold, straightLines, showOriginal, retain, preview, before, after } */
  const vcSimpRef = useRef(null);
  vcSimpRef.current = vcSimp;
  const [offStrip, setOffStrip] = useState(null); /* { baseDoc, baseSel, dist, join, miterLimit, before, after, lastRes } */
  const offStripRef = useRef(null);
  offStripRef.current = offStrip;
  const [marq, setMarq] = useState(null),
    [snapInd, setSnapInd] = useState(null),
    [space, setSpace] = useState(false),
    [panning, setPanning] = useState(false);
  const boxRef = useRef(null),
    coordRef = useRef(null),
    dragRef = useRef(null),
    objDragRafRef = useRef(0),
    objDragPendingRef = useRef(null),
    spaceRef = useRef(false),
    loaded = useRef(initialSvg);
  useEffect(() => () => {
    if (objDragRafRef.current) {
      cancelAnimationFrame(objDragRafRef.current);
      objDragRafRef.current = 0;
    }
  }, []);
  const rootRef = useRef(null),
    [lmsg, setLmsg] = useState(''),
    [lmsgAct, setLmsgAct] = useState(null),
    lmT = useRef(0);
  /* Task 10 (B-F1): indikator loading dokumen — null bila tidak memuat,
     { loaded, total } selama muat chunked. Token membatalkan loop chunk
     yang sudah digantikan load yang lebih baru. */
  const [docLoading, setDocLoading] = useState(null),
    loadTokenRef = useRef(0);
  const fullInitRef = useRef(full);
  useEffect(() => {
    if (fullInitRef.current === full) return;
    fullInitRef.current = full;
    const id = requestAnimationFrame(() => api.current.fitView && api.current.fitView());
    return () => cancelAnimationFrame(id);
  }, [full]);
  const api = useRef<Record<string, any>>({});
  const [ctx, setCtx] = useState(null),
    clipRef = useRef(null);
  const editorBackStateRef = useRef({
    ctx: null as any,
    leftOpen: false,
    rightOpen: false,
    mobileRailOpen: false,
    importModalOpen: false,
    isCodeInspectorOpen: false,
    indivCornerOpen: false,
    tool: 'select',
    onBackToWorkspace: null as any,
  });
  editorBackStateRef.current = {
    ctx,
    leftOpen,
    rightOpen,
    mobileRailOpen,
    importModalOpen,
    isCodeInspectorOpen,
    indivCornerOpen,
    tool,
    onBackToWorkspace,
  };
  useEffect(() => {
    const unsubOverlayBack = registerAndroidBackHandler(100, () => {
      const st = editorBackStateRef.current;
      if (st.ctx) {
        setCtx(null);
        return true;
      }
      if (typeof document !== 'undefined' && document.querySelector('.flt')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        return true;
      }
      return false;
    });
    const unsubModalBack = registerAndroidBackHandler(75, () => {
      const st = editorBackStateRef.current;
      if (st.importModalOpen) {
        setImportModalOpen(false);
        return true;
      }
      if (st.isCodeInspectorOpen) {
        setIsCodeInspectorOpen(false);
        return true;
      }
      if (st.indivCornerOpen) {
        setIndivCornerOpen(false);
        return true;
      }
      if (st.tool === 'iconify' || st.tool === 'charts') {
        setChartsEditTarget(null);
        setTool('select');
        return true;
      }
      return false;
    });
    const unsubSheetBack = registerAndroidBackHandler(60, () => {
      const st = editorBackStateRef.current;
      if (isMobileRef.current && (st.leftOpen || st.rightOpen || st.mobileRailOpen)) {
        setLeftOpen(false);
        setRightOpen(false);
        setMobileRailOpen(false);
        return true;
      }
      return false;
    });
    const unsubExitEditorBack = registerAndroidBackHandler(40, () => {
      const st = editorBackStateRef.current;
      if (st.onBackToWorkspace) {
        st.onBackToWorkspace(docRef.current, { zoom: zoomRef.current, pan: { ...panRef.current } });
        return true;
      }
      return false;
    });
    return () => {
      unsubOverlayBack();
      unsubModalBack();
      unsubSheetBack();
      unsubExitEditorBack();
    };
  }, []);
  const [dock, setDockS] = useState(() => {
    try {
      const r = JSON.parse(localStorage.getItem('svgpeak-dock2') || 'null');
      if (r && (r.dir === 'h' || r.dir === 'v') && r.size >= 24 && r.size <= 56) return r;
    } catch (e) {}
    try {
      const o = JSON.parse(localStorage.getItem('svgpeak-dock') || 'null');
      if (o && o.size >= 24 && o.size <= 56) return {
        dir: 'v',
        size: o.size
      };
    } catch (e) {}
    return {
      dir: 'v',
      size: 34
    };
  });
  const setDock = p => setDockS(d => {
    const n = {
      ...d,
      ...p
    };
    try {
      localStorage.setItem('svgpeak-dock2', JSON.stringify(n));
    } catch (e) {}
    return n;
  });
  /* lebar panel Aksi (a) & Layer (l) yang bisa diseret; disimpan saat pointer dilepas */
  const PW_DEF = {
      a: 260,
      l: 250
    },
    PW_LIM: Record<string, [number, number]> = {
      a: [200, 480],
      l: [180, 520]
    };
  const [pw, setPwS] = useState(() => {
    try {
      const r = JSON.parse(localStorage.getItem('svgpeak-panelw') || 'null');
      if (r) return {
        a: clampN(+r.a || PW_DEF.a, ...PW_LIM.a),
        l: clampN(+r.l || PW_DEF.l, ...PW_LIM.l)
      };
    } catch (e) {}
    return {
      ...PW_DEF
    };
  });
  const pwRef = useRef(pw),
    rzRef = useRef(null);
  pwRef.current = pw;
  const savePw = () => {
    try {
      localStorage.setItem('svgpeak-panelw', JSON.stringify(pwRef.current));
    } catch (e) {}
  };
  const setPwNow = (k, v) => {
    const n = {
      ...pwRef.current,
      [k]: clampN(Math.round(v), ...PW_LIM[k])
    };
    pwRef.current = n;
    setPwS(n);
  };
  const rzProps = k => ({
    role: 'separator',
    'aria-orientation': 'vertical',
    'aria-valuenow': k === 'a' ? (pw.a || 52) : (pw.l || 240),
    'aria-valuemin': k === 'a' ? 44 : 180,
    'aria-valuemax': k === 'a' ? 120 : 480,
    tabIndex: 0,
    'aria-label': k === 'a' ? L.edResizeActions : L.edResizeLayers,
    'data-tip': 'veResizePanel',
    onPointerDown: e => {
      if (e.button !== 0) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (x) {}
      rzRef.current = {
        k,
        x: e.clientX,
        w: pwRef.current[k]
      };
    },
    onPointerMove: e => {
      const r = rzRef.current;
      if (r && r.k === k) setPwNow(k, r.w + e.clientX - r.x);
    },
    onPointerUp: e => {
      if (!rzRef.current) return;
      rzRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (x) {}
      savePw();
    },
    onPointerCancel: () => {
      rzRef.current = null;
      savePw();
    },
    onDoubleClick: () => {
      setPwNow(k, PW_DEF[k]);
      savePw();
    },
    onKeyDown: e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      setPwNow(k, pwRef.current[k] + (e.key === 'ArrowRight' ? 16 : -16) * (e.shiftKey ? 2 : 1));
      savePw();
    }
  });

  /* Tahap 1 (D): Satu scheduler RAF bersama untuk pembaruan dokumen, rendering CanvasKit <canvas>, dan overlay React!
     Saat drag node/handle, live(d) TIDAK merender sinkron di tiap pointermove, melainkan dijadwalkan tepat 1x per frame */
  const flushLive = () => {
    if (liveRafRef.current) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = 0;
    }
    if (sceneRendererRef.current) {
      sceneRendererRef.current.setScene(docRef.current, ++docRevRef.current);
      sceneRendererRef.current.renderFrame();
    }
    setDocS(docRef.current);
  };
  const live = (d: any, opts: Record<string, any> = {}) => {
    docRef.current = d;
    const rev = ++docRevRef.current;
    const isInteracting = !!dragRef.current || isInteractingPaintRef.current || !!opts.isLive;
    if (sceneRendererRef.current) {
      sceneRendererRef.current.setScene(d, rev, {
        deferSpatialIndex: isInteracting,
        onlyPaint: opts.onlyPaint || isInteractingPaintRef.current
      });
    }
    if (!isInteracting) {
      if (liveRafRef.current) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = 0;
      }
      if (sceneRendererRef.current) sceneRendererRef.current.requestRender();
      setDocS(d);
      return;
    }
    if (opts.paintPreviewOnly) {
      if (sceneRendererRef.current) {
        if (opts.syncRender) sceneRendererRef.current.renderFrame();
        else sceneRendererRef.current.requestRender();
      }
      return;
    }
    if (sceneRendererRef.current) sceneRendererRef.current.requestRender();
    if (!liveRafRef.current) {
      liveRafRef.current = requestAnimationFrame(() => {
        liveRafRef.current = 0;
        if (sceneRendererRef.current) sceneRendererRef.current.renderFrame();
        setDocS(docRef.current);
      });
    }
  };
  useEffect(() => () => {
    if (liveRafRef.current) cancelAnimationFrame(liveRafRef.current);
    if (viewSettleTimer.current) clearTimeout(viewSettleTimer.current);
  }, []);
  const notifyCommitRef = useRef(onDocumentCommit);
  notifyCommitRef.current = onDocumentCommit;
  const notifyDocCommit = d => {
    if (notifyCommitRef.current) {
      notifyCommitRef.current(d, {
        zoom: zoomRef.current,
        pan: {
          x: panRef.current.x,
          y: panRef.current.y
        }
      });
    }
  };
  /* GV-A24: Byte-budgeted Undo/Redo History Stack (max 100 steps AND max device history byte budget, min 5 steps retained) */
  const estimateDocSnapshotBytes = d => {
    if (!d || !Array.isArray(d.objects)) return 256;
    let bytes = 256;
    for (let i = 0; i < d.objects.length; i++) {
      const o = d.objects[i];
      if (!o) continue;
      bytes += 160;
      if (o.subs) {
        for (let s = 0; s < o.subs.length; s++) {
          const ns = o.subs[s] && o.subs[s].nodes;
          if (ns) bytes += ns.length * 64;
        }
      }
      if (o.clipPathD) bytes += o.clipPathD.length * 2;
    }
    return bytes;
  };
  const push = (d: any, key: any = null) => {
    const h = hist.current,
      now = Date.now();
    if (!h.sz) h.sz = h.s.map(estimateDocSnapshotBytes);
    const snapBytes = estimateDocSnapshotBytes(d);
    if (key && h.key === key && now - h.t < 900 && h.p === h.s.length - 1 && h.p > 0) {
      h.s[h.p] = d;
      h.sz[h.p] = snapBytes;
    } else {
      h.s = h.s.slice(0, h.p + 1);
      h.sz = h.sz.slice(0, h.p + 1);
      h.s.push(d);
      h.sz.push(snapBytes);
      const maxSteps = 100;
      const maxBytes = ACTIVE_DEVICE_PROFILE && ACTIVE_DEVICE_PROFILE.maxHistoryBytes || 32 * 1024 * 1024;
      let totalBytes = h.sz.reduce((a, b) => a + b, 0);
      while ((h.s.length > maxSteps || totalBytes > maxBytes) && h.s.length > 5) {
        h.s.shift();
        const removed = h.sz.shift() || 0;
        totalBytes = Math.max(0, totalBytes - removed);
      }
      h.p = h.s.length - 1;
      PERF_TELEMETRY.updateSceneMetrics({
        historyBytes: totalBytes
      });
    }
    h.key = key || null;
    h.t = now;
    notifyDocCommit(d);
  };
  const commit = (d: any, key: any = null) => {
    docRef.current = d;
    const rev = ++docRevRef.current;
    if (liveRafRef.current) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = 0;
    }
    if (sceneRendererRef.current) {
      sceneRendererRef.current.setDragOffset(null, 0, 0);
      sceneRendererRef.current.setScene(d, rev);
      sceneRendererRef.current.requestRender();
    }
    setDocS(d);
    push(d, key);
  };
  const commitObjs = (fn: any, key: any = null) => {
    const d = docRef.current;
    let ch = false;
    const objs = [];
    d.objects.forEach(o => {
      const r = fn(o);
      if (r !== o) ch = true;
      if (r) objs.push(r);
    });
    if (ch) commit({
      ...d,
      objects: objs
    }, key);
    return ch;
  };
  // Keluarga font teks terakhir yang dipakai (ronde 5, bug 1): teks baru
  // memakai keluarga ini, bukan selalu kembali ke Geovanta Sans. Disimpan
  // di localStorage agar tetap berlaku sesudah reload.
  const lastTextFamilyRef = useRef((() => {
    try {
      const v = localStorage.getItem('geovanta-last-text-family');
      if (typeof v === 'string' && v.trim() && v.trim() !== 'IBM Plex Sans') return v;
      return 'Geovanta Sans';
    } catch (e) { return 'Geovanta Sans'; }
  })());
  const rememberTextFamily = fam => {
    if (typeof fam !== 'string' || !fam.trim()) return;
    lastTextFamilyRef.current = fam;
    try { localStorage.setItem('geovanta-last-text-family', fam); } catch (e) {}
  };
  const updateText = (id, patch, key = 'text-style') => {
    if (patch && typeof patch.fontFamily === 'string') rememberTextFamily(patch.fontFamily);
    return commitObjs(o => {
    const isTarget = o.id === id || (patch.content === undefined && selRef.current.objs.has(o.id));
    if (!isTarget || o.type !== 'text' || o.locked) return o;
    return normalizeTextObject({
      ...o,
      ...(patch.fill != null ? {fill: patch.fill} : {}),
      text: {...o.text, ...patch}
    });
  }, key);
  };
  // Pratinjau live tanpa riwayat (untuk ketik isi teks & seret warna):
  // commit sejarah hanya terjadi sekali saat selesai edit (blur/Enter).
  const updateTextLive = (id, patch) => {
    if (patch && typeof patch.fontFamily === 'string') rememberTextFamily(patch.fontFamily);
    const d = docRef.current;
    live({
      ...d,
      objects: d.objects.map(o => {
        const isTarget = o.id === id || (patch.content === undefined && selRef.current.objs.has(o.id));
        if (!isTarget || o.type !== 'text' || o.locked) return o;
        return normalizeTextObject({
          ...o,
          ...(patch.fill != null ? {fill: patch.fill} : {}),
          text: {...o.text, ...patch}
        });
      })
    });
  };
  const finishTextEdit = value => {
    if (!editingText) return;
    const {id, isNew} = editingText;
    sceneRendererRef.current?.setTextPreview(null);
    setEditingText(null);
    if (!value.trim() && isNew) commitObjs(o => o.id === id ? null : o);
    else {
      const obj = docRef.current.objects.find(o => o.id === id);
      if (obj && obj.autoName && obj.type === 'text' && !obj.locked) {
        // G2: nama+isi satu commitObjs (satu push = satu langkah undo).
        commitObjs(o => o.id === id ? normalizeTextObject({...o, name: textAutoName(value), text: {...o.text, content: value}}) : o, 'text-content');
      } else updateText(id, {content: value}, 'text-content');
    }
  };
  const revealTextCaret = segment => {
    const viewport = boxRectRef.current;
    if (!segment || !viewport?.width || !viewport?.height) return;
    const [start, end] = segment;
    const zoom = zoomRef.current;
    const pan = panRef.current;
    const adjustAxis = (a, b, offset, size, firstInset, lastInset) => {
      const low = Math.min(a, b) * zoom + offset;
      const high = Math.max(a, b) * zoom + offset;
      const limit = size - lastInset;
      if (high - low > limit - firstInset) return (firstInset + limit - low - high) / 2;
      if (low < firstInset) return firstInset - low;
      if (high > limit) return limit - high;
      return 0;
    };
    const xInset = Math.min(24, viewport.width / 4);
    const yInset = Math.min(24, viewport.height / 4);
    const bottomInset = Math.min(72, viewport.height / 4);
    const dx = adjustAxis(start.x, end.x, pan.x, viewport.width, xInset, xInset);
    const dy = adjustAxis(start.y, end.y, pan.y, viewport.height, yInset, bottomInset);
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

    const p = {x: pan.x + dx, y: pan.y + dy};
    panRef.current = p;
    applyVP(false, true);
    setPan(prevP => Math.abs(prevP.x - p.x) > 0.5 || Math.abs(prevP.y - p.y) > 0.5 ? p : prevP);
  };
  const previewTextEdit = (next, caretOffset) => {
    if (!editingText) return;
    const d = docRef.current;
    const obj = d.objects.find(o => o.id === editingText.id);
    if (!obj || obj.type !== 'text' || obj.locked) return;
    const renderer = sceneRendererRef.current;
    const preview = renderer?.setTextPreview(obj, next);
    if (preview) revealTextCaret(renderer.scene?.getTextCaretSegment(preview, caretOffset));
    if (!obj.autoName) return;
    const name = textAutoName(next);
    if (obj.name === name) return;
    live({...d, objects: d.objects.map(o => o.id === obj.id ? {...o, name} : o)});
  };
  const convertTextSelectionToPath = async () => {
    const d = docRef.current;
    const S = selRef.current.objs;
    const targets = d.objects.filter(o => S.has(o.id) && !o.locked && isLegacyText(o));
    if (!targets.length) return say('Pilih objek teks dulu');
    const registry = sceneRendererRef.current?.scene?.fontRegistry || null;
    try {
      const convertedMap = new Map();
      for (const o of targets) {
        const spec = legacyTextSpec(o);
        // Muat seluruh keluarga sebelum konversi (bukan 1 face): bila hanya
        // regular yang dimuat, konversi teks bold memakai face regular.
        if ((spec.fontAssetId || spec.fontAssetIds) && registry) {
          await registry.ensureAssetFontFamily(spec);
        }
        const pathObj = await VE.textToPathObject(o, {registry});
        convertedMap.set(o.id, pathObj);
      }
      const nextObjects = d.objects.map(o => convertedMap.get(o.id) || o);
      commit({...d, objects: nextObjects}, 'text-to-path');
      setSel({objs: new Set(convertedMap.keys()), nodes: new Set()});
      say(convertedMap.size + ' objek teks diubah menjadi path vektor (Ctrl+Z untuk kembali)');
    } catch (e) {
      say('Gagal mengubah teks ke path: ' + (e && e.message || 'font tidak tersedia'));
    }
  };
  const autoTraceSelectedImages = async (opts: any = {}) => {
    const d = docRef.current;
    const S = selRef.current.objs;
    const targets = d.objects.filter(o => S.has(o.id) && !o.locked && !o.hidden && o.img);
    if (!targets.length) {
      say('Pilih objek gambar dulu untuk Auto Trace');
      return null;
    }
    try {
      let nextObjects = [...d.objects];
      const newIds: string[] = [];
      let totalNodes = 0;
      let totalPaths = 0;
      for (const imgObj of targets) {
        const res = await VE.traceImageObjectToVectorPaths(imgObj, opts);
        if (res.objects.length > 0) {
          totalNodes += res.nodeCount;
          totalPaths += res.pathCount;
          newIds.push(...res.objects.map((o: any) => o.id));
          const idx = nextObjects.findIndex(o => o.id === imgObj.id);
          if (idx >= 0) {
            if (opts && opts.keepOriginalImage) {
              nextObjects.splice(idx + 1, 0, ...res.objects);
            } else {
              nextObjects.splice(idx, 1, ...res.objects);
            }
          } else {
            nextObjects.push(...res.objects);
          }
        }
      }
      if (!newIds.length) {
        say('Auto Trace tidak menghasilkan path vektor — sesuaikan threshold atau jumlah warna');
        return null;
      }
      commit({ ...d, objects: nextObjects }, 'autotrace');
      setSel({ objs: new Set(newIds), nodes: new Set() });
      say(`Auto Trace selesai: ${totalPaths} path vektor, ${totalNodes} node`);
      return { ids: newIds, totalPaths, totalNodes };
    } catch (e: any) {
      say('Gagal Auto Trace: ' + (e?.message || 'kesalahan tidak diketahui'));
      return null;
    }
  };
  const importFontFiles = async fileList => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    const registry = sceneRendererRef.current?.scene?.fontRegistry || null;
    let lastInfo = null;
    let lastAssetId = null;
    let count = 0;
    // Peta aset per keluarga -> per face, agar buka ulang proyek memulihkan
    // semua face yang diimpor sekaligus (bukan hanya file terakhir).
    const assetIdsByFamily: Record<string, any> = {};
    for (const f of (files as any[])) {
      try {
        const buf = await f.arrayBuffer();
        const {bytes, info}: any = inspectFontBytes(buf, f.name || 'font.ttf');
        let assetId = null;
        if (projectId && typeof AssetManager !== 'undefined') {
          const saved = await AssetManager.ingestBlob(projectId, new Blob([bytes], {type: info.mimeType}), f.name || (info.family + '.' + info.ext));
          assetId = saved.assetId;
        }
        if (assetId) {
          (assetIdsByFamily[info.family] ??= {})[info.faceKey] = assetId;
        }
        if (registry) {
          // TextFontRegistry tidak punya registerFont/loadedAssets — API-nya
          // addFamily(family, faces, assetId). Memanggil registerFont selalu
          // throw dan membuat impor .ttf manual gagal ("Font tidak valid").
          registry.addFamily(info.family, {[info.faceKey]: bytes}, assetId);
        }
        lastInfo = info;
        lastAssetId = assetId;
        count++;
      } catch (e: any) {
        say('Font tidak valid (' + (f.name || 'font') + '): ' + (e && e.message || 'format tidak didukung'));
      }
    }
    if (!count || !lastInfo) return;
    // Impor font = pilihan keluarga: teks baru berikutnya memakai keluarga ini.
    rememberTextFamily(lastInfo.family);
    if (sceneRendererRef.current?.scene?.textLayouts) {
      sceneRendererRef.current.scene.textLayouts.clear();
    }
    setFontCatalogVer(v => v + 1);
    const hasSelectedText = docRef.current.objects.some(o => selRef.current.objs.has(o.id) && o.type === 'text' && !o.locked);
    if (hasSelectedText) {
      commitObjs(o => selRef.current.objs.has(o.id) && o.type === 'text' && !o.locked
        ? normalizeTextObject({
          ...o,
          text: {
            ...o.text,
            fontFamily: lastInfo.family,
            fontWeight: lastInfo.weight,
            fontStyle: lastInfo.style,
            fontAssetId: lastAssetId,
            ...(assetIdsByFamily[lastInfo.family] ? {fontAssetIds: assetIdsByFamily[lastInfo.family]} : {})
          }
        })
        : o, 'text-font-import');
    } else if (sceneRendererRef.current) {
      sceneRendererRef.current.requestRender(true);
    }
    say(`Font "${lastInfo.family}" (${lastInfo.weight}${lastInfo.style === 'italic' ? ' italic' : ''}) berhasil diimpor`);
  };
  // Google Fonts: memilih keluarga di picker otomatis mengunduh file TTF-nya,
  // mendaftarkannya ke registry, dan menyimpannya sebagai aset proyek (embed).
  // Dipakai TextInspector lewat prop onEmbedFont. URL TTF berasal dari peta
  // terbundel (src/data/googleFontUrls.json); peta bisa diarahkan lewat
  // window.GEOVANTA_GOOGLE_FONT_URLS (untuk tes lokal).
  const embedGoogleFontForSelection = async (familyName) => {
    const key = String(familyName).toLowerCase();
    if (googleEmbedPending.current.has(key)) return googleEmbedPending.current.get(key);
    const registry = sceneRendererRef.current?.scene?.fontRegistry || null;
    if (!registry) {
      setGoogleFontStatus({family: familyName, state: 'error', message: 'Font registry tidak tersedia'});
      return;
    }
    setGoogleFontStatus({family: familyName, state: 'loading', message: ''});
    // Optimistis: tampilkan keluarga yang dipilih langsung (live, tanpa
    // riwayat) — tanpa ini, status "Mengunduh…" tidak pernah tampil karena
    // TextInspector hanya menampilkannya bila keluarga teks == keluarga
    // yang di-embed, dan keluarga baru hanya di-commit SETELAH unduh selesai.
    // Gagal unduh pun keluarga tetap tersimpan (banner font-hilang yang
    // menjelaskan); commit riwayat dibuat sekali saat embed berhasil.
    // Bersihkan fontAssetId/fontAssetIds lama BERSAMAAN dengan ganti
    // keluarga: aset-aset itu milik keluarga LAMA. Bila dibiarkan, teks
    // membawa keluarga baru + aset keluarga lama — kanvas menampilkan
    // fallback (sans) sementara Ubah ke Path memakai outline keluarga lama
    // (serif). Aset baru diisi kembali oleh commit di bawah saat embed
    // berhasil; bila embed gagal, teks tetap tanpa aset (jujur: fallback +
    // error jelas, bukan font yang salah).
    if (primary && primary.type === 'text' && !primary.locked) {
      updateTextLive(primary.id, {fontFamily: familyName, fontAssetId: null, fontAssetIds: null});
    }
    const job = (async () => {
      try {
        // Peta URL TTF override untuk tes (Playwright mock lokal). Produksi
        // memakai peta terbundel; URL TTF diunduh dari fonts.gstatic.com.
        const urlMap = globalThis.GEOVANTA_GOOGLE_FONT_URLS || undefined;
        const res = await embedGoogleFont({registry, projectId, family: familyName, urlMap});
        if (sceneRendererRef.current?.scene?.textLayouts) sceneRendererRef.current.scene.textLayouts.clear();
        setFontCatalogVer(v => v + 1);
        const hasSelectedText = docRef.current.objects.some(o => selRef.current.objs.has(o.id) && o.type === 'text' && !o.locked);
        if (hasSelectedText) {
          commitObjs(o => selRef.current.objs.has(o.id) && o.type === 'text' && !o.locked
            ? normalizeTextObject({
              ...o,
              text: {
                ...o.text,
                fontFamily: res.family,
                fontAssetId: (res.assetIds as any).regular || (res.assetIds as any)[Object.keys(res.assetIds)[0]] || null,
                // Simpan semua face agar buka ulang proyek memulihkan bold/italic juga.
                ...(Object.keys(res.assetIds).length ? {fontAssetIds: res.assetIds} : {})
              }
            })
            : o, 'text-font-google-embed');
        } else if (sceneRendererRef.current) {
          sceneRendererRef.current.requestRender(true);
        }
        setGoogleFontStatus({family: res.family, state: 'done', message: ''});
        say(`Font "${res.family}" berhasil disematkan ke proyek`);
      } catch (e) {
        setGoogleFontStatus({family: familyName, state: 'error', message: e?.message || 'Gagal mengunduh font'});
        say('Gagal menyematkan font: ' + (e?.message || 'periksa koneksi internet'));
      } finally {
        googleEmbedPending.current.delete(key);
      }
    })();
    googleEmbedPending.current.set(key, job);
    return job;
  };
  const livePaint = (fn, opts: Record<string, any> = {}) => {
    isInteractingPaintRef.current = true;
    const d = docRef.current;
    let ch = false;
    const objs = [];
    d.objects.forEach(o => {
      const r = fn(o);
      if (r !== o) ch = true;
      if (r) objs.push(r);
    });
    if (ch) {
      const nextD = {
        ...d,
        objects: objs
      };
      live(nextD, {
        isLive: true,
        onlyPaint: true,
        paintPreviewOnly: !!opts.previewOnly
      });
    }
    return ch;
  };
  const commitPaint = (fn, key) => {
    isInteractingPaintRef.current = false;
    if (liveRafRef.current) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = 0;
    }
    const d = docRef.current;
    let ch = false;
    const objs = [];
    d.objects.forEach(o => {
      const r = fn ? fn(o) : o;
      if (r !== o) ch = true;
      if (r) objs.push(r);
    });
    const finalDoc = ch ? {
      ...d,
      objects: objs
    } : d;
    commit(finalDoc, key);
    return ch;
  };
  /* Find & Replace (Task 5): pratinjau modal memakai live() langsung —
     doc dasar dihitung ulang dari snapshot saat modal dibuka, jadi doc
     yang sedang dipratinjau tidak boleh menjadi dasar hitungan berikutnya.
     Commit memakai commitPaint(null, key): commit doc yang sedang
     dipratinjau apa adanya (fn limit:1 TIDAK boleh dijalankan ulang saat
     commit — sesudah pratinjau, "kecocokan pertama yang tersisa" sudah
     bergeser ke berikutnya). */
  /* Fix wave (final review Important 1): doc TERAKHIR YANG DI-COMMIT =
     entri riwayat saat ini (hist.current.s[hist.current.p]) — live()
     tidak pernah menyentuh history, jadi nilai ini stabil selama pratinjau
     live berjalan. Diteruskan ke inspector sebagai prop committedDoc agar
     kedua seksi warna mengambil snapshot base dari sini, bukan dari prop
     doc yang live (yang sudah tercemar pratinjau seksi lain). */
  const frPreviewDoc = d => live(d, {
    isLive: true,
    onlyPaint: true
  });
  const frCommitPreview = key => commitPaint(null, key);
  /* Recolor (Task 7): pratinjau/komit sama persis dengan Find & Replace
     (Task 5) — live() untuk pratinjau, commitPaint(null, key) untuk
     commit doc yang sedang dipratinjau apa adanya. */
  const rcPreviewDoc = (d, opts: Record<string, any> = {}) => {
    if (opts.interacting !== undefined) {
      sceneRendererRef.current?.setPaintInteracting?.(!!opts.interacting);
    }
    live(d, {
      isLive: true,
      onlyPaint: true,
      paintPreviewOnly: !!opts.previewOnly,
      syncRender: !!opts.syncRender
    });
  };
  const rcCommitPreview = key => {
    sceneRendererRef.current?.setPaintInteracting?.(false);
    return commitPaint(null, key);
  };
  /* ganti nama Frame/Group (isGroup) atau objek; nama group disanitasi sama seperti id SVG & dicek bentrok */
  const commitRename = (targetId, isGroup, directVal) => {
    setRenamingId(null);
    if (renameSkip.current) {
      renameSkip.current = false;
      return;
    } /* Escape = batal */
    const raw = String(directVal !== undefined ? directVal : renameVal).trim();
    if (!raw) return;
    const d = docRef.current;
    if (isGroup) {
      if (!d.objects.some(o => o.group === targetId)) return; /* sudah diganti (Enter lalu blur) */
      const name = raw.replace(/[^\w\-.:]/g, '-');
      if (name === targetId) return;
      if (d.objects.some(o => o.group === name)) {
        say('Nama "' + name + '" sudah dipakai Frame/Group lain');
        return;
      }
      commitObjs(o => o.group === targetId ? {
        ...o,
        group: name,
        name: o.isFrameBg ? name + '-bg' : o.name
      } : o);
      setCollapsedGrps(prev => {
        if (!prev.has(targetId)) return prev;
        const n = new Set(prev);
        n.delete(targetId);
        n.add(name);
        return n;
      });
    } else {
      commitObjs(o => o.id === targetId && o.name !== raw ? {
        ...o,
        name: raw,
        autoName: false
      } : o);
    }
  };
  /* pindahkan objek ke Frame/Group tujuan (targetGroup null = keluar ke kanvas) dari Panel Layer */
  const moveObjsToGroup = (ids, targetGroup) => {
    if (!ids || !ids.length) return;
    const S = new Set(ids),
      d = docRef.current;
    // Jangan pernah memindahkan latar Frame (isFrameBg / isAutoFrame) agar Frame kosong tetap di posisi awalnya
    const moving = d.objects.filter(o => S.has(o.id) && !o.isFrameBg && !o.isAutoFrame);
    if (!moving.length || moving.every(o => (o.group || null) === (targetGroup || null))) return;
    const isF = !!targetGroup && d.objects.some(o => o.group === targetGroup && (o.containerType === 'frame' || o.isFrameBg || o.isAutoFrame || /^frame/i.test(targetGroup)));

    // Jika dikeluarkan dari Frame (targetGroup === null), tetap taruh di posisi indeks aslinya (jangan dilempar ke ujung/tengah)
    if (!targetGroup) {
      const nextObjs = d.objects.map(o => S.has(o.id) && !o.isFrameBg && !o.isAutoFrame ? {
        ...o,
        group: null,
        containerType: null
      } : o);
      commit({
        ...d,
        objects: VE.compactGroups(nextObjs)
      });
      setSel({
        objs: new Set(moving.map(o => o.id)),
        nodes: new Set()
      });
      say(moving.length + ' objek dikeluarkan dari Frame');
      return;
    }
    const rest = d.objects.filter(o => !moving.includes(o));
    const updated = moving.map(o => ({
      ...o,
      group: targetGroup,
      containerType: isF ? 'frame' : null
    }));
    let last = -1;
    rest.forEach((o, i) => {
      if (o.group === targetGroup) last = i;
    });
    rest.splice(last + 1, 0, ...updated);
    commit({
      ...d,
      objects: VE.compactGroups(rest)
    });
    setSel({
      objs: new Set(updated.map(o => o.id)),
      nodes: new Set()
    });
    say(updated.length + ' objek dipindahkan ke ' + targetGroup);
  };
  /* Seret layer ke atas/bawah layer lain di panel: ubah urutan z DAN ikut Frame/Group layer tujuan.
     pos 'top' = di atas baris tujuan pada panel (indeks array lebih besar), 'bot' = di bawahnya */
  const reorderLayerTo = (ids, targetObj, pos) => {
    if (!ids || !ids.length || !targetObj) return;
    const S = new Set(ids),
      d = docRef.current;
    if (S.has(targetObj.id)) return;
    const moving = d.objects.filter(o => S.has(o.id) && !o.isFrameBg && !o.isAutoFrame);
    if (!moving.length) return;
    const tg = targetObj.group || null;
    const isF = !!tg && d.objects.some(o => o.group === tg && (o.containerType === 'frame' || o.isFrameBg || o.isAutoFrame || /^frame/i.test(tg)));
    const updated = moving.map(o => ({
      ...o,
      group: tg,
      containerType: isF ? 'frame' : null
    }));
    const rest = d.objects.filter(o => !S.has(o.id) || o.isFrameBg || o.isAutoFrame);
    const tIdx = rest.findIndex(o => o.id === targetObj.id);
    if (tIdx < 0) return;
    rest.splice(pos === 'top' ? tIdx + 1 : tIdx, 0, ...updated);
    const nd = VE.compactGroups(rest);
    if (nd.length === d.objects.length && nd.every((o, i) => o === d.objects[i])) return;
    commit({
      ...d,
      objects: nd
    });
    setSel({
      objs: new Set(updated.map(o => o.id)),
      nodes: new Set()
    });
    say(tg ? updated.length + ' layer dipindah di dalam ' + tg : updated.length + ' layer dipindah ke kanvas');
  };
  const undo = () => {
    const h = hist.current;
    if (h.p > 0) {
      h.p--;
      h.key = null;
      const nextD = h.s[h.p];
      live(nextD);
      notifyDocCommit(nextD);
      if (isMobileRef.current) triggerHaptic('light');
      DEBUG_LOG.log('document', 'undo', 'undo', 'src/components/editor/VectorEditor.tsx', 'hist p=' + h.p + '/' + (h.s.length - 1));
    }
  };
  const redo = () => {
    const h = hist.current;
    if (h.p < h.s.length - 1) {
      h.p++;
      h.key = null;
      const nextD = h.s[h.p];
      live(nextD);
      notifyDocCommit(nextD);
      if (isMobileRef.current) triggerHaptic('light');
      DEBUG_LOG.log('document', 'redo', 'redo', 'src/components/editor/VectorEditor.tsx', 'hist p=' + h.p + '/' + (h.s.length - 1));
    }
  };
  const canUndo = hist.current.p > 0,
    canRedo = hist.current.p < hist.current.s.length - 1;
  const selObjs = React.useMemo(() => doc.objects.filter(o => sel.objs.has(o.id)), [doc.objects, sel.objs]),
    primary = selObjs[0];
  /* pohon Layer ala Figma: Frame/Group + Color Bucket (objek sewarna dalam satu container jadi satu baris seleksi) */
  const layerTree = React.useMemo(() => {
    const items = [],
      grpMap = new Map(),
      objs = doc.objects;
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (!o.group) {
        items.push({
          kind: 'single',
          obj: o
        });
        continue;
      }
      let g = grpMap.get(o.group);
      if (!g) {
        g = {
          kind: 'container',
          id: o.group,
          isFrame: /^frame/i.test(o.group),
          objs: [],
          buckets: [],
          bg: null
        };
        grpMap.set(o.group, g);
        items.push(g);
      }
      g.objs.push(o);
      if (o.containerType === 'frame' || o.isAutoFrame || o.isFrameBg) g.isFrame = true;
      if (o.isFrameBg || o.isAutoFrame) g.bg = o;
    }
    grpMap.forEach(g => {
      const byHex = new Map(),
        gObjs = g.objs;
      for (let j = 0, L = gObjs.length; j < L; j++) {
        const o = gObjs[j];
        if (o === g.bg) continue;
        const hex = o.img ? 'IMAGE' : o.fill === 'none' ? 'NONE' : cssToHex(o.fill);
        let b = byHex.get(hex);
        if (!b) byHex.set(hex, b = {
          hex,
          fill: o.fill,
          objs: [],
          ids: [],
          nodes: 0
        });
        b.objs.push(o);
        b.ids.push(o.id);
        b.nodes += vinfo(o).n;
      }
      g.buckets = [...byHex.values()];
    });
    return items;
  }, [doc.objects]);
  /* GV-A20 + Isolated Flat Row Virtualization:
     State posisi scroll layer diisolasi sepenuhnya di dalam komponen <LayerTreeViewport> (bukan di VectorEditor!)
     sehingga saat pengguna melakukan scroll cepat di tab Layer, VectorEditor & Canvas TIDAK PERNAH re-render! */
  const layerViewportCtrlRef = useRef(null);
  const {
    virtualLayerRows,
    objIdToLayerRowIdx
  } = React.useMemo(() => {
    const rows = [];
    const idMap = new Map();
    for (let i = 0; i < layerTree.length; i++) {
      const it = layerTree[i];
      if (it.kind === 'single') {
        const rIdx = rows.length;
        rows.push({
          kind: 'single',
          key: it.obj.id,
          obj: it.obj,
          nodeCount: vinfo(it.obj).n
        });
        idMap.set(it.obj.id, rIdx);
      } else {
        const hdrIdx = rows.length;
        const gObjs = it.objs,
          gLen = gObjs.length;
        const allIds = new Array(gLen);
        const childObjs = [];
        let allHidden = gLen > 0,
          allLocked = gLen > 0;
        for (let gi = 0; gi < gLen; gi++) {
          const go = gObjs[gi];
          allIds[gi] = go.id;
          if (go !== it.bg) childObjs.push(go);
          if (!go.hidden) allHidden = false;
          if (!go.locked) allLocked = false;
        }
        const isCollapsed = collapsedGrps.has(it.id);
        rows.push({
          kind: 'group-hdr',
          key: 'grp-hdr-' + it.id,
          item: it,
          allIds,
          childCount: childObjs.length,
          gKey: 'grp:' + it.id,
          isCollapsed,
          allHidden,
          allLocked
        });
        if (it.bg) idMap.set(it.bg.id, hdrIdx);
        if (isCollapsed) {
          for (let k = 0; k < allIds.length; k++) idMap.set(allIds[k], hdrIdx);
        } else if (childObjs.length === 0) {
          rows.push({
            kind: 'group-empty',
            key: 'grp-empty-' + it.id,
            groupId: it.id
          });
        } else if (groupSameColor) {
          for (let bi = 0; bi < it.buckets.length; bi++) {
            const b = it.buckets[bi];
            const bIdx = rows.length;
            if (b.ids.length === 1) {
              rows.push({
                kind: 'child',
                key: b.objs[0].id,
                groupId: it.id,
                obj: b.objs[0],
                nodeCount: vinfo(b.objs[0]).n
              });
            } else {
              rows.push({
                kind: 'bucket',
                key: it.id + '-' + b.hex,
                groupId: it.id,
                bucket: b
              });
            }
            for (let k = 0; k < b.ids.length; k++) idMap.set(b.ids[k], bIdx);
          }
        } else {
          for (let ci = 0; ci < childObjs.length; ci++) {
            const co = childObjs[ci];
            const cIdx = rows.length;
            rows.push({
              kind: 'child',
              key: co.id,
              groupId: it.id,
              obj: co,
              nodeCount: vinfo(co).n
            });
            idMap.set(co.id, cIdx);
          }
        }
      }
    }
    return {
      virtualLayerRows: rows,
      objIdToLayerRowIdx: idMap
    };
  }, [layerTree, collapsedGrps, groupSameColor]);

  /* Auto-scroll panel Layer ke objek yang diklik di kanvas agar langsung terlihat & terpilih */
  useEffect(() => {
    if (layerClickSkipExpandRef.current) {
      layerClickSkipExpandRef.current = false;
      return;
    }
    if (!sel.objs.size || !leftOpen) return;
    const sc = layerScrollRef.current;
    if (!sc) return;
    const selArr = [...sel.objs];
    const targetId = selArr[selArr.length - 1] || selArr[0];
    if (!targetId) return;
    const rowIdx = objIdToLayerRowIdx.get(targetId);
    if (rowIdx == null || rowIdx < 0) return;
    const treeEl = layerTreeDomRef.current;
    const treeOffsetTop = treeEl ? treeEl.offsetTop : 0;
    const rowTop = treeOffsetTop + rowIdx * LAYER_ROW_EST_PX;
    const rowBot = rowTop + LAYER_ROW_EST_PX;
    const viewTop = sc.scrollTop;
    const viewH = sc.clientHeight || 360;
    const viewBot = viewTop + viewH;
    if (rowTop < viewTop + 12 || rowBot > viewBot - 12) {
      const nextScrollTop = Math.max(0, Math.round(rowTop - (viewH - LAYER_ROW_EST_PX) * 0.5));
      sc.scrollTop = nextScrollTop;
      if (layerViewportCtrlRef.current) {
        layerViewportCtrlRef.current.syncScroll(Math.max(0, nextScrollTop - treeOffsetTop));
      }
    }
  }, [sel.objs, leftOpen]);
  /* urutan datar layer sesuai tampilan panel (untuk Shift+klik range) */
  const layerFlatIds = React.useMemo(() => layerTree.flatMap(it => it.kind === 'single' ? [it.obj.id] : groupSameColor ? it.buckets.flatMap(b => b.ids) : it.objs.filter(o => o !== it.bg).map(o => o.id)), [layerTree, groupSameColor]);
  /* kotak Frame & Grup untuk label nama & highlight di kanvas (berfungsi untuk Frame maupun Group) */
  const containerBoxes = React.useMemo(() => layerTree.filter(it => it.kind === 'container').map(f => ({
    id: f.id,
    isFrame: !!f.isFrame,
    ids: f.objs.map(o => o.id),
    first: f.bg || f.objs[0],
    bb: f.bg ? VE.tightBBox(f.bg) : VE.docBounds({
      objects: f.objs
    })
  })).filter(f => f.bb && isFinite(f.bb[0]) && f.bb[2] > f.bb[0] && f.bb[3] > f.bb[1]), [layerTree]);
  const frameBoxes = React.useMemo(() => containerBoxes.filter(f => f.isFrame), [containerBoxes]);
  /* Selection Colors ala Figma: palet unik fill & stroke dari objek terpilih */
  const selectionColors = React.useMemo(() => {
    const map = new Map();
    for (let i = 0, L = selObjs.length; i < L; i++) {
      const o = selObjs[i];
      if (!o || o.img || o.locked) continue;
      if (VE.gradOn(o) && o.grad) {
        const stops = o.grad.rawStops && o.grad.rawStops.length ? o.grad.rawStops : o.grad.stops || [];
        for (let stIdx = 0; stIdx < stops.length; stIdx++) {
          const st = stops[stIdx];
          if (!st.color || st.color === 'none') continue;
          const hex = cssToHex(st.color),
            sid = o.id + '#' + (st.id || stIdx),
            k = 'grad:' + hex;
          let e = map.get(k);
          if (!e) map.set(k, e = {
            kind: 'grad',
            hex,
            raw: hex,
            ids: [],
            stopKeys: [],
            _idSet: new Set(),
            _skSet: new Set()
          });
          if (!e._idSet.has(o.id)) {
            e._idSet.add(o.id);
            e.ids.push(o.id);
          }
          if (!e._skSet.has(sid)) {
            e._skSet.add(sid);
            e.stopKeys.push(sid);
          }
        }
      } else {
        const fillVal = o.type === 'text' && o.text ? (o.text.fill || o.fill) : o.fill;
        if (fillVal && fillVal !== 'none') {
          const hex = cssToHex(fillVal),
            k = 'fill:' + fillVal.toLowerCase();
          let e = map.get(k);
          if (!e) map.set(k, e = {
            kind: 'fill',
            hex,
            raw: fillVal,
            ids: []
          });
          e.ids.push(o.id);
        }
      }
      if (VE.strokeGradOn(o) && o.strokeGrad) {
        const stops = o.strokeGrad.rawStops && o.strokeGrad.rawStops.length ? o.strokeGrad.rawStops : o.strokeGrad.stops || [];
        for (let stIdx = 0; stIdx < stops.length; stIdx++) {
          const st = stops[stIdx];
          if (!st.color || st.color === 'none') continue;
          const hex = cssToHex(st.color),
            sid = o.id + '#stroke#' + (st.id || stIdx),
            k = 'grad:' + hex;
          let e = map.get(k);
          if (!e) map.set(k, e = {
            kind: 'grad',
            hex,
            raw: hex,
            ids: [],
            stopKeys: [],
            _idSet: new Set(),
            _skSet: new Set()
          });
          if (!e._idSet.has(o.id)) {
            e._idSet.add(o.id);
            e.ids.push(o.id);
          }
          if (!e._skSet.has(sid)) {
            e._skSet.add(sid);
            e.stopKeys.push(sid);
          }
        }
      } else if (o.stroke && o.stroke !== 'none') {
        const hex = cssToHex(o.stroke),
          k = 'stroke:' + o.stroke.toLowerCase();
        let e = map.get(k);
        if (!e) map.set(k, e = {
          kind: 'stroke',
          hex,
          raw: o.stroke,
          ids: []
        });
        e.ids.push(o.id);
      }
    }
    const out = [];
    map.forEach(e => {
      out.push({
        kind: e.kind,
        hex: e.hex,
        raw: e.raw,
        ids: e.ids,
        ...(e.stopKeys ? { stopKeys: e.stopKeys } : {}),
        stableKey: e.kind + ':' + (e.stopKeys ? e.stopKeys[0] : e.ids[0])
      });
    });
    return out;
  }, [selObjs]);
  const selNodes = React.useMemo(() => {
    const s = new Set();
    if (sel.nodes.size) selObjs.forEach(o => o.subs.forEach(sp => sp.nodes.forEach(n => sel.nodes.has(n.id) && s.add(n.id))));
    return s;
  }, [selObjs, sel.nodes]);
  const selHandles = React.useMemo(() => {
    const s = new Set();
    if (sel.handles && sel.handles.size) selObjs.forEach(o => o.subs.forEach(sp => sp.nodes.forEach(n => {
      if (n.handleIn && sel.handles.has(n.id + ':in')) s.add(n.id + ':in');
      if (n.handleOut && sel.handles.has(n.id + ':out')) s.add(n.id + ':out');
    })));
    return s;
  }, [selObjs, sel.handles]);
  /* mode mirroring node terpilih: 'corner' | 'smooth' | 'symmetric' | null (campuran / tidak ada seleksi) */
  const mirrorCur = React.useMemo(() => {
    if (!selNodes.size) return null;
    const mirrorTypes = new Set();
    selObjs.forEach(o => o.subs.forEach(sp => sp.nodes.forEach(n => {
      if (selNodes.has(n.id)) mirrorTypes.add(n.type === 'smooth' || n.type === 'symmetric' ? n.type : 'corner');
    })));
    return mirrorTypes.size === 1 ? [...mirrorTypes][0] : null;
  }, [selObjs, selNodes]);
  /* kotak batas gabungan objek terpilih (dipakai untuk Resize, Rotate, & Multi-Object Selection Box) */
  const allSelBBox = React.useMemo(() => selObjs.length ? (() => {
    let b = null;
    for (let i = 0; i < selObjs.length; i++) {
      const t = VE.tightBBox(selObjs[i]);
      if (!isFinite(t[0]) || Math.abs(t[0]) > 1e15 || t[0] > t[2]) continue;
      if (!b) b = [t[0], t[1], t[2], t[3]];else {
        if (t[0] < b[0]) b[0] = t[0];
        if (t[1] < b[1]) b[1] = t[1];
        if (t[2] > b[2]) b[2] = t[2];
        if (t[3] > b[3]) b[3] = t[3];
      }
    }
    return b;
  })() : null, [selObjs]);
  // Bounds teks terukur dari layout CanvasKit (font asli) untuk selection box
  // + panel Transform — presisi render, bukan heuristik legacyTextBounds.
  // Stabil (hanya memakai ref) agar useMemo di bawah tetap berfungsi.
  const measuredTextBounds = React.useCallback(o => {
    if (!isLegacyText(o)) return null;
    const scene = sceneRendererRef.current?.scene;
    if (!scene || typeof scene.getMeasuredTextBounds !== 'function') return null;
    return scene.getMeasuredTextBounds(o);
  }, []);
  // Offset caret untuk klik pada teks (G4) — null bila layout gagal.
  const measureTextCaret = React.useCallback((o, docX, docY) => {
    if (!isLegacyText(o)) return null;
    const scene = sceneRendererRef.current?.scene;
    if (!scene || typeof scene.caretOffsetForText !== 'function') return null;
    return scene.caretOffsetForText(o, docX, docY);
  }, []);
  // Pengukuran bounds teks TANPA cache (untuk isi yang sedang diketik di
  // TextEditOverlay — previewObj baru tiap render; bila lewat cache,
  // tiap ketikan membuat entri baru dan mengusir layout objek asli).
  const measureTextBoundsCb = React.useCallback(o => {
    if (!isLegacyText(o)) return null;
    const scene = sceneRendererRef.current?.scene;
    if (!scene || typeof scene.measureTextBounds !== 'function') return null;
    return scene.measureTextBounds(o);
  }, []);
  const activeBox = React.useMemo(() => {
    // Saat teks sedang diedit, kotak seleksi DISEMBUNYIKAN: TextEditOverlay
    // sudah menampilkan kotaknya sendiri (border + 4 handle). Bila keduanya
    // tampil, pengguna melihat kotak ganda (bug double-click).
    if (editingText && selObjs.length === 1 && selObjs[0].id === editingText.id) return null;
    return tool === 'select' && selObjs.length > 0 && sel.nodes.size === 0 ? VE.selectionOrientedBox({
      objects: selObjs
    }, sel.objs, measuredTextBounds) : null;
  }, [tool, selObjs, sel.objs, sel.nodes, measuredTextBounds, fontCatalogVer, editingText]);
  activeBoxRef.current = activeBox;
  const imgSel = null;
  /* Penampil node dan Bézier handle berlaku global pada objek yang dipilih pengguna, termasuk saat dalam mode Pilih (select) */
  /* "Ikon meleyot" (2026-11-15, lanjutan): node & handle marker juga
     digambar di atas tiap objek terseleksi (default ON). Untuk anggota
     frame ikon yang terseleksi BERSAMA frame utuh, marker itu hanya
     menutupi ikon (puluhan titik putih + garis handle di atas kurva) —
     sembunyikan saat seleksi >1 objek. Anggota yang dipilih SENDIRI
     tetap menampilkan node/handle-nya (itu jalur edit per-bagian). */
  const shown = React.useMemo(() => (showSelNodes || showSelHandles) && !imgSel ? selObjs.filter(o => !o.img && !o.text && !o.hidden && !(o.isIconFrame && !o.isFrameBg && selObjs.length > 1)) : [], [showSelNodes, showSelHandles, imgSel, selObjs]);
  /* ---- logika panel Transform / Alignment / Auto Layout (v4.4) ---- */
  const xfNodes = selNodes.size ? selNodes : null;
  const xm = React.useMemo(() => selObjs.length ? VE.selectionMetrics({
    objects: selObjs
  }, sel.objs, xfNodes, measuredTextBounds) : null, [selObjs, sel.objs, sel.nodes, measuredTextBounds, fontCatalogVer]);
  const xp = xm ? VE.pinPoint(xm, pin) : null;
  const xfDone = (nd, key: any = 'xf') => {
    if (nd && nd !== docRef.current) commit(nd, key);
  };
  const alignDo = mode => {
    if (selNodes.size === 1) return say('Pilih 2+ node untuk meratakan node');
    const isDist = mode === 'distH' || mode === 'distV';
    if (isDist && (selNodes.size || selObjs.length < 3)) return say('Distribusi butuh minimal 3 objek');
    const nd = VE.alignSelection(docRef.current, sel.objs, selNodes.size >= 2 ? selNodes : null, mode);
    if (nd === docRef.current) return say(isDist ? 'Jarak sudah sama rata' : 'Sudah rata');
    commit(nd);
  };
  const setXfPos = (axis, v) => xfDone(VE.setSelectionPosition(docRef.current, sel.objs, xfNodes, axis, v, pin), 'xf');
  const setXfDim = (axis, v) => {
    if (!(v > 0)) return say(prefs?.lang === 'en' ? 'Size must be greater than 0' : 'Ukuran harus lebih dari 0');
    xfDone(VE.setSelectionDimension(docRef.current, sel.objs, axis, v, {
      pin,
      constrain: lockAR,
      scaleStroke: scaleStk
    }), 'xf');
  };
  const rotPin = () => rotPivot === 'pin' ? pin : [0.5, 0.5];
  const setXfRot = v => xfDone(VE.setSelectionRotation(docRef.current, sel.objs, v, false, rotPin(), measuredTextBounds), 'xf');
  const flipXf = axis => xfDone(VE.flipSelection(docRef.current, sel.objs, axis, rotPin()));
  const layItems = selObjs.filter(o => !o.isAutoFrame);
  /* Real-time: ada seleksi → slider Padding/Gap/arah langsung menata ulang (alMem diinisialisasi otomatis, riwayat digabung 'alayout');
     tanpa seleksi → HANYA slider padding yang mengubah Artboard secara langsung (gap/arah tidak menyentuh Artboard). */
  /* Sinkronkan nilai slider Padding dengan Frame terpilih saat seleksi berpindah */
  useEffect(() => {
    const d = docRef.current,
      S = sel.objs;
    if (!S.size) return;
    const picked = d.objects.filter(o => S.has(o.id));
    const fg = picked.find(o => o.group && d.objects.some(q => q.group === o.group && (q.isFrameBg || q.isAutoFrame)));
    if (!fg || !fg.group) return;
    const bgObj = d.objects.find(o => o.group === fg.group && (o.isFrameBg || o.isAutoFrame));
    const kids = d.objects.filter(o => o.group === fg.group && !o.isFrameBg && !o.isAutoFrame && !o.hidden);
    if (!bgObj || !kids.length) return;
    const fb = VE.tightBBox(bgObj),
      kb = VE.docBounds(d, new Set(kids.map(o => o.id)));
    if (!fb || !kb) return;
    const pl = Math.max(0, Math.round(kb[0] - fb[0]));
    const pt = Math.max(0, Math.round(kb[1] - fb[1]));
    const pr = Math.max(0, Math.round(fb[2] - kb[2]));
    const pb = Math.max(0, Math.round(fb[3] - kb[3]));
    setLay(prev => prev.pt === pt && prev.pr === pr && prev.pb === pb && prev.pl === pl ? prev : {
      ...prev,
      pt,
      pr,
      pb,
      pl,
      split: !(pt === pr && pr === pb && pb === pl)
    });
  }, [sel.objs]);
  const runLayout = (cfg, force, padOnly) => {
    const d = docRef.current,
      S = selRef.current.objs;
    if (!S.size) {
      if (!force && !padOnly) return;
      const nd = VE.applyArtboardPadding(d, null, cfg),
        a = nd.viewBox,
        b = d.viewBox;
      if (a.every((v, k) => v === b[k])) return;
      commit(nd, 'ab-pad');
      return;
    }
    /* Jika pengguna hanya mengubah Padding atau Radius pada Frame yang sudah ada (tanpa menekan tombol Terapkan Auto Layout),
       ubah ukuran kotak latar Frame saja mengelilingi objek anak TANPA mengacak posisi objek di dalamnya! */
    if (padOnly && !force) {
      const fp = VE.applyFramePadding(d, S, {
        pt: cfg.pt,
        pr: cfg.pr,
        pb: cfg.pb,
        pl: cfg.pl,
        frameRadius: cfg.radius
      });
      if (fp) {
        commit(fp.doc, 'frame-pad');
        return;
      }
      if (!alMem.current) return;
    }
    const items = d.objects.filter(o => S.has(o.id) && !o.isAutoFrame && !o.isFrameBg);
    if (!items.length && !d.objects.some(o => S.has(o.id) && (o.isAutoFrame || o.isFrameBg))) return;
    const key = items.map(o => o.id).sort().join(','),
      live = !!(alMem.current && alMem.current.key === key);
    if (!force && !live) return;
    const res = VE.applyAutoLayout(d, S, {
      dir: cfg.dir,
      cols: cfg.cols,
      gap: cfg.gap,
      pt: cfg.pt,
      pr: cfg.pr,
      pb: cfg.pb,
      pl: cfg.pl,
      alignX: cfg.ax,
      alignY: cfg.ay,
      frame: cfg.frame,
      frameRadius: cfg.radius,
      mem: live ? alMem.current : null
    });
    if (!res) return;
    alMem.current = res.mem;
    commit(res.doc, 'alayout');
    setSel({
      objs: res.selIds,
      nodes: new Set()
    });
    if (force) say('Auto Layout diterapkan · ' + (items.length || 1) + ' objek' + (cfg.frame ? ' + frame latar' : ''));
  };
  const layUpd = patch => {
    const n = {
      ...lay,
      ...patch
    };
    setLay(n);
    const isPadOrRad = Object.keys(patch).every(k => /^p[trbl]$|^radius$/.test(k));
    runLayout(n, false, isPadOrRad);
  };
  const layPad = (k, v) => {
    const val = Math.max(0, v);
    layUpd(k === 'all' ? {
      pt: val,
      pr: val,
      pb: val,
      pl: val
    } : {
      [k]: val
    });
  };
  const padToArtboard = () => {
    const nd = VE.applyArtboardPadding(docRef.current, selRef.current.objs, lay);
    if (nd === docRef.current) return say(prefs?.lang === 'en' ? 'No content' : 'Tidak ada konten');
    commit(nd, 'ab-pad');
    say(prefs?.lang === 'en' ? 'Padding applied to Artboard' : 'Padding diterapkan ke Artboard');
    requestAnimationFrame(() => api.current.fitView && api.current.fitView());
  };
  /* Fungsi baru Visibilitas Node & Handle Global:
     Menampilkan node dan handle Bézier pada objek yang dipilih pengguna (berlaku global untuk semua seleksi objek,
     dan berfungsi baik di mode Pilih / Select maupun mode Edit Node). */
  const hOk = (_o?: any, _n?: any) => true;
  const toggleGlobalNodes = () => {
    setShowSelNodes(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ve-global-show-nodes', next ? '1' : '0');
      } catch (e) {}
      say('Tampilan Node pada objek terpilih (Global): ' + (next ? 'AKTIF' : 'MATI'));
      return next;
    });
  };
  const toggleGlobalHandles = () => {
    setShowSelHandles(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ve-global-show-handles', next ? '1' : '0');
      } catch (e) {}
      say('Tampilan Handle Bézier pada objek terpilih (Global): ' + (next ? 'AKTIF' : 'MATI'));
      return next;
    });
  };
  /* ---- Alat Tambah Node: hover pada garis objek mana pun; snap ke titik tengah / grid / node & tepi objek lain ---- */
  const segAt = (a, b, p) => {
    if (!a.handleOut && !b.handleIn) {
      const ab = VE.sub(b, a),
        L2 = VE.dot(ab, ab),
        t = L2 < 1e-12 ? 0 : Math.max(0, Math.min(1, VE.dot(VE.sub(p, a), ab) / L2)),
        q = {
          x: a.x + ab.x * t,
          y: a.y + ab.y * t
        };
      return {
        t,
        x: q.x,
        y: q.y,
        d: VE.dist(p, q)
      };
    }
    let bt = 0,
      bd = 1e18;
    const N = 24;
    for (let k = 0; k <= N; k++) {
      const q = VE.segPoint(a, b, k / N),
        d = VE.dist(p, q);
      if (d < bd) {
        bd = d;
        bt = k / N;
      }
    }
    let lo = Math.max(0, bt - 1 / N),
      hi = Math.min(1, bt + 1 / N);
    for (let it = 0; it < 18; it++) {
      const m1 = lo + (hi - lo) / 3,
        m2 = hi - (hi - lo) / 3;
      if (VE.dist(p, VE.segPoint(a, b, m1)) < VE.dist(p, VE.segPoint(a, b, m2))) hi = m2;else lo = m1;
    }
    const t = (lo + hi) / 2,
      q = VE.segPoint(a, b, t);
    return {
      t,
      x: q.x,
      y: q.y,
      d: VE.dist(p, q)
    };
  };
  const findSegAt = (p, tol) => {
    let best = null;
    const os = docRef.current.objects;
    const searchObj = (o, maxDist) => {
      let localBest = null;
      o.subs.forEach(sp => {
        const ns = sp.nodes,
          n = ns.length;
        if (n < 2) return;
        for (let i = 0; i < (sp.closed ? n : n - 1); i++) {
          const a = ns[i],
            b = ns[(i + 1) % n];
          if (maxDist < 1e9) {
            let x0 = Math.min(a.x, b.x),
              x1 = Math.max(a.x, b.x),
              y0 = Math.min(a.y, b.y),
              y1 = Math.max(a.y, b.y);
            for (const q of [a.handleOut, b.handleIn]) {
              if (q) {
                x0 = Math.min(x0, q.x);
                x1 = Math.max(x1, q.x);
                y0 = Math.min(y0, q.y);
                y1 = Math.max(y1, q.y);
              }
            }
            if (p.x < x0 - maxDist || p.x > x1 + maxDist || p.y < y0 - maxDist || p.y > y1 + maxDist) continue;
          }
          const r = segAt(a, b, p);
          if (r.d < maxDist && (!localBest || r.d <= localBest.d + 1e-9)) {
            localBest = {
              ...r,
              o,
              sp,
              i,
              a,
              b
            };
          }
        }
      });
      return localBest;
    };

    /* 1. Prioritas utama: kursor berada dekat garis kontur objek (dalam toleransi piksel layar) */
    os.forEach(o => {
      if (o.hidden || o.locked || o.img) return;
      const bb = vinfo(o).bb;
      if (p.x < bb[0] - tol || p.x > bb[2] + tol || p.y < bb[1] - tol || p.y > bb[3] + tol) return;
      const cand = searchObj(o, tol);
      if (cand && (!best || cand.d <= best.d + 1e-9)) best = cand;
    });
    if (best) return best;

    /* 2. Jika kursor berada di bagian dalam/badan objek mana pun: proyeksikan ke segmen terdekat dari objek tersebut */
    const hit = hitObj(p);
    if (hit && !hit.img && !hit.locked && !hit.hidden && !hit.text && !hit.isFrameBg && hit.subs) {
      const cand = searchObj(hit, Infinity);
      if (cand) return cand;
    }

    /* 3. Jika ada objek yang sedang dipilih dan kursor di dekatnya, proyeksikan ke segmen terdekat objek terpilih */
    if (selRef.current.objs.size) {
      os.forEach(o => {
        if (!selRef.current.objs.has(o.id) || o.hidden || o.locked || o.img || !o.subs) return;
        const cand = searchObj(o, Infinity);
        if (cand && (!best || cand.d < best.d)) best = cand;
      });
    }
    return best;
  };
  const ADD_LBL = {
    mid: L.edSnapLblMid,
    grid: L.edSnapLblGrid,
    node: L.edSnapLblNode,
    edge: L.edSnapLblEdge
  };
  const addSnap = (sg, p, alt) => {
    const res = {
      t: sg.t,
      kind: null
    };
    if (!snapOn || alt) return res;
    const thr = VE.SNAP_PX / zoomRef.current,
      cs = [];
    if (snapCfg.midpoint) {
      const mid = VE.segPoint(sg.a, sg.b, .5);
      cs.push({
        t: .5,
        x: mid.x,
        y: mid.y,
        kind: 'mid',
        pr: 1
      });
    }
    /* Toggle Kontur (C3) kini hidup di sini: snapPt mencoba snapEdgePoint
       pada sumbu bebas bila edge diizinkan. Midpoint objek lain ikut jadi
       target bila toggle Midpoint menyala; garis kotak dihormati toggle
       Smart Guides (C4) — dengan kapabilitas alat (addnode: bbox mati). */
    if (snapCfg.node || snapCfg.edge || snapCfg.midpoint || snapCfg.bbox) {
      const toolCap = SNAP_TOOL_CAPABILITIES[tool] || SNAP_TOOL_CAPABILITIES.select;
      const r = VE.snapPt(p, docRef.current.objects, new Set([sg.o.id]), null, thr, 0, !snapCfg.edge, false, false, !snapCfg.node, !!snapCfg.midpoint, !(snapCfg.bbox && toolCap.bbox));
      if (r.ind) {
        const q = segAt(sg.a, sg.b, r);
        if (q.d < thr) cs.push({
          t: q.t,
          x: q.x,
          y: q.y,
          kind: r.kind,
          pr: r.kind === 'node' ? 0 : 3
        });
      }
    }
    if (gridOn && snapCfg.grid) {
      const G = gridStep(),
        N = 64,
        pts = [];
      for (let k = 0; k <= N; k++) pts.push(VE.segPoint(sg.a, sg.b, k / N));
      for (let k = 0; k < N; k++) {
        const p0 = pts[k],
          p1 = pts[k + 1];
        if (Math.min(p0.x, p1.x) - thr > p.x || Math.max(p0.x, p1.x) + thr < p.x || Math.min(p0.y, p1.y) - thr > p.y || Math.max(p0.y, p1.y) + thr < p.y) continue;
        for (const ax of ['x', 'y']) {
          const v0 = p0[ax],
            v1 = p1[ax];
          if (v0 === v1) continue;
          const lo = Math.min(v0, v1),
            hi = Math.max(v0, v1),
            up = v1 > v0;
          for (let g = Math.ceil(lo / G); g * G <= hi; g++) {
            const gv = g * G;
            let tl = k / N,
              th = (k + 1) / N;
            for (let it = 0; it < 20; it++) {
              const tm = (tl + th) / 2,
                vm = VE.segPoint(sg.a, sg.b, tm)[ax];
              if (vm < gv === up) tl = tm;else th = tm;
            }
            const t = (tl + th) / 2,
              q = VE.segPoint(sg.a, sg.b, t);
            cs.push({
              t,
              x: q.x,
              y: q.y,
              kind: 'grid',
              pr: 2
            });
          }
        }
      }
    }
    let best = null;
    for (const c of cs) {
      if (c.t < 0.02 || c.t > 0.98) continue;
      const d = VE.dist(c, p);
      if (d >= thr) continue;
      if (!best || c.pr < best.pr || c.pr === best.pr && d < best.d) best = {
        ...c,
        d
      };
    }
    return best ? {
      t: best.t,
      kind: best.kind
    } : res;
  };
  const computeAdd = ev => {
    const p = toDoc(ev.x, ev.y),
      sg = findSegAt(p, 10 / zoomRef.current);
    if (!sg) return null;
    const r = addSnap(sg, p, ev.alt),
      t = Math.max(0.02, Math.min(0.98, r.t)),
      q = VE.segPoint(sg.a, sg.b, t),
      h1 = sg.a.handleOut || sg.a,
      h2 = sg.b.handleIn || sg.b;
    const d = 'M' + sg.a.x + ' ' + sg.a.y + (sg.a.handleOut || sg.b.handleIn ? 'C' + h1.x + ' ' + h1.y + ' ' + h2.x + ' ' + h2.y + ' ' : 'L') + sg.b.x + ' ' + sg.b.y;
    return {
      oid: sg.o.id,
      spid: sg.sp.id,
      i: sg.i,
      t,
      x: q.x,
      y: q.y,
      kind: r.kind,
      label: r.kind ? ADD_LBL[r.kind] : '',
      d
    };
  };
  /* handle bawaan yang akan ditambahkan pada node ke-i (hanya sisi yang belum punya handle) */
  const defHandles = (sp, i) => {
    const ns = sp.nodes,
      n = ns.length,
      nd = ns[i];
    if (n < 2) return {};
    const pv = sp.closed || i > 0 ? ns[(i - 1 + n) % n] : null,
      nx = sp.closed || i < n - 1 ? ns[(i + 1) % n] : null;
    let dir;
    if (nd.handleOut && !nd.handleIn) dir = VE.nrm(VE.sub(nd.handleOut, nd));else if (nd.handleIn && !nd.handleOut) dir = VE.nrm(VE.sub(nd, nd.handleIn));else if (pv && nx) dir = VE.nrm(VE.sub(nx, pv));else if (nx) dir = VE.nrm(VE.sub(nx, nd));else if (pv) dir = VE.nrm(VE.sub(nd, pv));else return {};
    const r: Record<string, any> = {};
    if (pv && !nd.handleIn) {
      const l = VE.dist(pv, nd) / 3;
      if (l > 1e-6) r.in = {
        x: nd.x - dir.x * l,
        y: nd.y - dir.y * l
      };
    }
    if (nx && !nd.handleOut) {
      const l = VE.dist(nx, nd) / 3;
      if (l > 1e-6) r.out = {
        x: nd.x + dir.x * l,
        y: nd.y + dir.y * l
      };
    }
    return r;
  };
  const hoverNodeAt = ev => {
    const p = toDoc(ev.x, ev.y),
      tol = 10 / zoomRef.current;
    let best = null;
    docRef.current.objects.forEach(o => {
      if (o.hidden || o.locked || o.img || !o.subs) return;
      const bb = vinfo(o).bb;
      if (p.x < bb[0] - tol || p.x > bb[2] + tol || p.y < bb[1] - tol || p.y > bb[3] + tol) return;
      o.subs.forEach(sp => sp.nodes.forEach((nd, i) => {
        const d = VE.dist(p, nd);
        if (d < tol && (!best || d < best.d)) best = {
          d,
          o,
          sp,
          i,
          nd
        };
      }));
    });
    if (!best) return null;
    const prev = defHandles(best.sp, best.i);
    return {
      x: best.nd.x,
      y: best.nd.y,
      oid: best.o.id,
      spid: best.sp.id,
      nid: best.nd.id,
      prev,
      can: !!(prev.in || prev.out)
    };
  };
  const updateAddHover = e => {
    addEv.current = {
      x: e.clientX,
      y: e.clientY,
      alt: e.altKey || e.ctrlKey || e.metaKey
    };
    if (addRaf.current) return;
    addRaf.current = requestAnimationFrame(() => {
      addRaf.current = 0;
      const ev = addEv.current;
      if (ev && dragRef.current === null) {
        if (tool === 'addhandle') setHhHov(hoverNodeAt(ev));else if (tool === 'autohandle') setAhHov(hoverAuto(ev));else setAddHov(computeAdd(ev));
      }
    });
  };
  const makeShape = (kind, x, y, w, h, id: any = null) => {
    const S = SHAPES.find(q => q[0] === kind) || SHAPES[0],
      st = shapeSty;
    const r = VE.parseSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="' + S[2](x, y, w, h) + '" fill="' + st.fill + '" stroke="' + (st.sw > 0 ? st.stroke : 'none') + '" stroke-width="' + st.sw + '"' + (S[3] ? ' fill-rule="evenodd"' : '') + '/></svg>');
    const o = r.objects[0];
    if (!o) return null;
    const names = new Set(docRef.current.objects.map(q => q.name));
    let n = 1;
    while (names.has(S[1] + '-' + n)) n++;
    return {
      ...o,
      id: id || o.id,
      name: S[1] + '-' + n
    };
  };
  /* Blob Generator (Task 2): objek path tertutup dari blobNodes + metadata
     gen (parameter menempel, ikut save/load via data-gen). */
  /* Blob (Task 2): nama dihitung SEKALI di onPointerDown (nextBlobName) dan
     dibawa di dragRef — JANGAN hitung ulang di makeBlob tiap pointermove:
     objek preview sudah ada di docRef, jadi hitung ulang membuat nama
     bergantung pada paritas jumlah move (final review: dokumen 1 objek
     bernama "Blob-2"). Pola sama seperti makeLine/makeArc (Task 4). */
  const nextBlobName = () => {
    const names = new Set(docRef.current.objects.map(q => q.name));
    let n = 1;
    while (names.has('Blob-' + n)) n++;
    return 'Blob-' + n;
  };
  /* Freehand (Task 3: Pencil & Brush): nama unik dihitung sekali di onPointerDown */
  const nextFreehandName = (toolMode: string) => {
    const prefix = toolMode === 'brush' ? 'Brush-' : 'Pencil-';
    const names = new Set(docRef.current.objects.map(q => q.name));
    let n = 1;
    while (names.has(prefix + n)) n++;
    return prefix + n;
  };
  const makeBlob = (x, y, w, h, id, name) => {
    const p = blobParamsRef.current,
      st = shapeSty,
      cx = x + w / 2,
      cy = y + h / 2,
      rx = w / 2,
      ry = h / 2;
    const nodes = blobNodes(cx, cy, rx, ry, p).map(n => ({
      ...n,
      id: VE.uid()
    }));
    return {
      id: id || VE.uid(),
      name: name || nextBlobName(),
      type: 'path',
      fill: st.fill,
      stroke: st.sw > 0 ? st.stroke : 'none',
      strokeWidth: st.sw,
      opacity: 1,
      fillRule: 'nonzero',
      group: null,
      subs: [{
        id: VE.uid(),
        closed: true,
        nodes
      }],
      gen: {
        kind: 'blob',
        points: p.points,
        irregularity: p.irregularity,
        smoothness: p.smoothness,
        rotation: p.rotation || 0,
        spikiness: p.spikiness || 0,
        seed: p.seed,
        cx,
        cy,
        rx,
        ry
      }
    };
  };
  /* Materialisasi satu strip weave dari string d (pola makeShape: VE.parseSVG
     mengubah path string menjadi objek path standar dengan subs/nodes). */
  const materializeWeaveStrip = (s, k, p, gid, paint) => {
    const r = VE.parseSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="' + s.d + '" fill="' + paint.fill + '" stroke="' + (paint.sw > 0 ? paint.stroke : 'none') + '" stroke-width="' + paint.sw + '"/></svg>');
    const o = r.objects[0];
    if (!o) return null;
    const isH = k < p.rows,
      idx = isH ? k : k - p.rows;
    return {
      ...o,
      id: VE.uid(),
      name: gid + '-' + (isH ? 'H' : 'V') + (idx + 1),
      group: gid,
      gen: {
        kind: 'weave',
        cols: p.cols,
        rows: p.rows,
        amplitude: p.amplitude,
        thickness: p.thickness,
        waveType: p.waveType,
        gapSize: p.gapSize,
        frequency: p.frequency,
        phase: p.phase,
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h
      }
    };
  };
  /* Weave Generator (Task 3): grup strip dari weaveStrips + metadata gen
     (parameter menempel di TIAP strip; ikat grup = field `group` yang sama).
     groupId unik di antara grup yang sudah ada ('Weave-<n>'). */
  const makeWeave = (x, y, w, h, groupId) => {
    const p = normalizeWeaveParams(weaveParamsRef.current),
      st = shapeSty,
      gid = groupId || nextWeaveGroupId(),
      pg = { ...p, x, y, w, h };
    const strips = weaveStrips(x, y, w, h, p);
    return strips.map((s, k) => materializeWeaveStrip(s, k, pg, gid, st)).filter(Boolean);
  };
  const nextWeaveGroupId = () => {
    const used = new Set(docRef.current.objects.map(o => o.group).filter(Boolean));
    let n = 1;
    while (used.has('Weave-' + n)) n++;
    return 'Weave-' + n;
  };
  /* Regenerasi grup weave dari gen-nya sendiri + delta parameter baru
     (dipakai onWeaveParams). Id strip TIDAK dipertahankan (jumlah strip bisa
     berubah); onWeaveParams memilih ulang grup baru sesudah commit. Paint
     dipertahankan per orientasi H / V bila berbeda (dual-tone) atau dari
     strip pertama grup lama. */
  const regenWeave = (members, delta) => {
    const g0 = (members[0] && members[0].gen) || {};
    const p = normalizeWeaveParams({ ...g0, ...(delta || {}) });
    const gid = members[0].group;
    const st0 = members[0];
    const hMember = members.find(m => m.name && m.name.includes('-H')) || st0;
    const vMember = members.find(m => m.name && m.name.includes('-V')) || st0;
    const strips = weaveStrips(g0.x, g0.y, g0.w, g0.h, p);
    return strips.map((s, k) => {
      const isH = k < p.rows;
      const mem = isH ? hMember : vMember;
      return materializeWeaveStrip(s, k, { ...p, x: g0.x, y: g0.y, w: g0.w, h: g0.h }, gid, {
        fill: mem.fill,
        stroke: mem.stroke,
        sw: mem.strokeWidth
      });
    }).filter(Boolean);
  };
  /* Line Segment (Task 4): objek path 2 node terbuka, stroke saja (tanpa
     fill). Stroke diambil dari shapeSty saat ini, dijamin terlihat lewat
     visibleStrokeStyle (final review fix wave): bila stroke 'none' atau
     sw 0, pakai stroke aksen default cerminan shapeSty awal — garis tidak
     boleh tak terlihat.
     Nama dihitung SEKALI di onPointerDown (nextLineName) dan dibawa di
     dragRef — JANGAN hitung ulang di makeLine tiap pointermove: objek
     preview sudah ada di docRef, jadi hitung ulang membuat nama berkedip
     Garis-1 <-> Garis-2 dan hasil akhirnya tergantung paritas jumlah move. */
  const nextLineName = () => {
    const names = new Set(docRef.current.objects.map(q => q.name));
    let n = 1;
    while (names.has('Garis-' + n)) n++;
    return 'Garis-' + n;
  };
  const makeLine = (start, end, opts, id, name) => {
    const st = shapeSty,
      vs = visibleStrokeStyle(st, { stroke: accentStroke(prefs && prefs.accent || '#13b152'), sw: 2 }),
      nodes = lineSegmentNodes(start, end, opts).map(n => ({ ...n, id: VE.uid() }));
    return {
      id: id || VE.uid(),
      name: name || nextLineName(),
      type: 'path',
      fill: 'none',
      stroke: vs.stroke,
      strokeWidth: vs.sw,
      opacity: 1,
      fillRule: 'nonzero',
      group: null,
      subs: [{
        id: VE.uid(),
        closed: false,
        nodes
      }]
    };
  };
  /* Arc (Task 5): objek path terbuka berisi segmen Bézier kubik, stroke
     saja (tanpa fill), + metadata gen (pusat + radius + sudut awal +
     sweep — model kanonis §5.6, parameter menempel di objek seperti
     Blob/Weave, round-trip via data-gen). Stroke diambil dari shapeSty
     saat ini, dijamin terlihat lewat visibleStrokeStyle (final review fix
     wave — pola makeLine). Nama dihitung SEKALI di onPointerDown
     (nextArcName) dan dibawa di dragRef — JANGAN hitung ulang di makeArc
     tiap pointermove (pelajaran Task 4). */
  const nextArcName = () => {
    const names = new Set(docRef.current.objects.map(q => q.name));
    let n = 1;
    while (names.has('Busur-' + n)) n++;
    return 'Busur-' + n;
  };
  const makeArc = (cx, cy, r, startDeg, sweepDeg, id, name) => {
    const st = shapeSty,
      vs = visibleStrokeStyle(st, { stroke: accentStroke(prefs && prefs.accent || '#13b152'), sw: 2 }),
      p = normalizeArcParams({ r, startDeg, sweepDeg }),
      nodes = arcNodes(cx, cy, p.r, p.startDeg, p.sweepDeg).map(n => ({ ...n, id: VE.uid() }));
    return {
      id: id || VE.uid(),
      name: name || nextArcName(),
      type: 'path',
      fill: 'none',
      stroke: vs.stroke,
      strokeWidth: vs.sw,
      opacity: 1,
      fillRule: 'nonzero',
      group: null,
      subs: [{
        id: VE.uid(),
        closed: false,
        nodes
      }],
      gen: {
        kind: 'arc',
        cx,
        cy,
        r: p.r,
        startDeg: p.startDeg,
        sweepDeg: p.sweepDeg
      }
    };
  };
  /* Curvature (Task 6): nama dihitung SEKALI saat titik pertama ditaruh
     (pelajaran Task 4) dan dibawa di curvatureRef — JANGAN hitung ulang
     tiap pointermove: objek preview sudah ada di docRef, jadi hitung ulang
     membuat nama berkedip Kurva-1 <-> Kurva-2. */
  const nextCurvatureName = () => {
    const names = new Set(docRef.current.objects.map(q => q.name));
    let n = 1;
    while (names.has('Kurva-' + n)) n++;
    return 'Kurva-' + n;
  };
  /* Bangun objek path preview dari titik-titik curvatureRef. Node smooth
     mendapat handle Catmull-Rom via VE.autoHandles — hanya id smooth yang
     diproses (opt.ids), jadi node corner tetap tanpa handle. */
  const makeCurvatureObj = s => {
    const st = penSty,
      /* Stroke dijamin terlihat lewat visibleStrokeStyle (final review fix
         wave): panel Pen bisa menyetel stroke 'none'/lebar 0, dan kurva
         tidak boleh tak terlihat — fallback cerminan penSty awal. */
      vs = visibleStrokeStyle(st, { stroke: '#111827', sw: 2 });
    const nodes = s.pts.map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      type: p.type,
      handleIn: null,
      handleOut: null
    }));
    let obj = {
      id: s.oid,
      name: s.name,
      type: 'path',
      fill: st.fill,
      stroke: vs.stroke,
      strokeWidth: vs.sw,
      opacity: 1,
      fillRule: 'nonzero',
      group: null,
      subs: [{
        id: s.spid,
        closed: s.closed,
        nodes
      }]
    };
    const smoothIds = new Set(s.pts.filter(p => p.type !== 'corner').map(p => p.id));
    if (smoothIds.size) obj = VE.autoHandles(obj, null, {
      preserveShape: false,
      ids: smoothIds
    });
    return obj;
  };
  const [vx, vy, vw, vh] = doc.viewBox;

  /* ---- zoom / pan via modular useCanvasWheelZoom ---- */
  const {
    setZ,
    zoomBy,
    fitTo,
    fitView,
    fitSel,
    panTo,
  } = useCanvasWheelZoom({
    boxRef,
    boxRectRef,
    zoomRef,
    panRef,
    dragRef,
    viewPend,
    viewSettleTimer,
    fitPendingRef,
    docRef,
    getSelObjs: () => selObjs,
    softView,
    flushView,
  });
  const replaceDocument = nextDoc => {
    let validDoc = nextDoc && Array.isArray(nextDoc.objects) && Array.isArray(nextDoc.viewBox) ? nextDoc : {
      viewBox: [0, 0, 800, 600],
      objects: []
    };
    if (liveRafRef.current) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = 0;
    }
    validDoc = vectorDocument(validDoc);
    docRef.current = validDoc;
    const rev = ++docRevRef.current;
    hist.current = {
      s: [validDoc],
      p: 0,
      key: null,
      t: 0
    };
    setSel({
      objs: new Set(),
      nodes: new Set()
    });
    setPen(null);
    setVcSimp(null);
    alMem.current = null;
    snapCacheRef.current = null;
    loaded.current = null;
    setDocS(validDoc);
    if (sceneRendererRef.current) {
      sceneRendererRef.current.setDragOffset(null, 0, 0);
      sceneRendererRef.current.setScene(validDoc, rev);
    }
    fitPendingRef.current = true;
    requestAnimationFrame(() => api.current.fitView());
  };
  const createDocument = (vb = [0, 0, 800, 600]) => {
    const blank = {
      viewBox: Array.isArray(vb) && vb.length === 4 ? vb : [0, 0, 800, 600],
      objects: []
    };
    replaceDocument(blank);
    return blank;
  };
  const loadDocument = replaceDocument;
  const activeProjRef = useRef(projectId);
  useEffect(() => {
    if (projectId && projectId !== activeProjRef.current) {
      activeProjRef.current = projectId;
      if (initialDoc) replaceDocument(initialDoc);
    }
  }, [projectId, initialDoc]);
  api.current = {
    setZ,
    fitView,
    createDocument,
    loadDocument,
    replaceDocument,
    getDoc: () => docRef.current,
    getViewState: () => ({
      zoom: zoomRef.current,
      pan: {
        ...panRef.current
      }
    })
  };
  useEffect(() => {
    const b = boxRef.current;
    if (!b) return;
    const sr = new SceneRenderer().init(b, {
      canvasEl: sceneCanvasRef.current,
      cpuCanvasEl: cpuCanvasRef.current,
      onError: () => setRenderError(true)
    });
    sr.setScene(docRef.current, docRevRef.current);
    sr.setRenderEnv({
      bg,
      showGrid: gridOn,
      clipFrames,
      frameBoxes,
      frameBgByGroup
    });
    const viewport = boxRectRef.current = b.getBoundingClientRect();
    sr.setCamera(zoomRef.current, panRef.current.x, panRef.current.y, viewport.width, viewport.height);
    sr.renderFrame(true);
    sceneRendererRef.current = sr;
    sr.ready?.then?.(() => {
      if (!sr.disposed) setFontCatalogVer(v => v + 1);
    });
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (boxRef.current) boxRectRef.current = boxRef.current.getBoundingClientRect();
        if (sceneRendererRef.current && boxRef.current) {
          if (fitPendingRef.current && boxRef.current.clientWidth > 0 && boxRef.current.clientHeight > 0) {
            api.current.fitView();
            return;
          }
          const viewport = boxRectRef.current = boxRef.current.getBoundingClientRect();
          sceneRendererRef.current.setCamera(zoomRef.current, panRef.current.x, panRef.current.y, viewport.width, viewport.height);
          sceneRendererRef.current.requestRender();
        }
      });
      ro.observe(b);
    }
    return () => {
      if (ro) ro.disconnect();
      sr.dispose();
      sceneRendererRef.current = null;
    };
  }, []);

  React.useLayoutEffect(() => {
    if (active) {
      const id = requestAnimationFrame(() => api.current.fitView());
      return () => cancelAnimationFrame(id);
    }
  }, [active]);

  /* ---- muat dokumen baru dari Trace (jadi langkah undo, bukan reset) ---- */
  const loadDoc = (d, note) => {
    if (d.error) return say('File SVG tidak valid');
    commit(vectorDocument(d), null);
    setSel({
      objs: new Set(),
      nodes: new Set()
    });
    requestAnimationFrame(() => api.current.fitView());
    if (d.unsupported) say('Elemen SVG dilewati: ' + unsSummary(d));else if (note) say(note);
  };
  /* Task 10 (B-F1): muat dokumen besar tanpa memblokir main thread.
     Temuan ukur: parseSVG jagung hanya ~26 ms — blok ~700 ms adalah
     pembangunan path Skia + render pertama 129 path di satu frame
     (CanvasKitScene.path: serializePath + MakeFromSVGString per objek,
     pertama kali saja; draw berikutnya memakai cache this.paths). Karena itu chunking
     dilakukan pada COMMIT (live() per potongan, bukan pada parse).
     Dua mekanisme: (1) path Skia dicicil per chunk lewat pemanasan eksplisit
     scene.path(o) — mengisi cache this.paths yang sama dengan yang dibaca
     drawScene — sehingga pembangunan path tidak lagi menumpuk di draw akhir.
     CATATAN UKUR (headless SwiftShader): draw akhir masih ~340–690 ms —
     profil CPU menunjukkan kompilasi program WebGL pertama kali
     (getShaderParameter) + rasterisasi software; parse ~26 ms dan path
     sudah dipanaskan, jadi sisa ini BUKAN kerja JS. Bar 100 ms untuk draw
     pertama tidak tercapai di headless — lihat laporan T10. (2) render
     ditahan selama chunking (setSuspended) — kalau tidak, tiap chunk
     me-render ulang SEMUA objek yang sudah terakumulasi (biaya draw
     ~2 ms/objek di SwiftShader) dan gap membesar bersama akumulasi.
     (Koreksi dari percobaan pertama: pemanasan buildObjectGpuBuffers
     SALAH sasaran — jalur draw CanvasKit tidak memakainya; draw memakai
     CanvasKitScene.path, yakni serializePath + MakeFromSVGString.)
     Dokumen akhir IDENTIK dengan loadDoc (objek/nama/urutan
     sama) dan history tetap SATU langkah: live() tidak menyentuh history,
     push() hanya sekali di akhir. Ambang: dokumen ≤ CHUNK objek memakai
     jalur sinkron lama (tanpa indikator, tanpa async). setSuspended tidak
     dipakai tempat lain di src/ — tidak ada suspender lain yang bisa
     dilawan. Cleanup di finally dijaga token: bila load ini sudah digantikan
     load yang lebih baru, suspension + indikator menjadi milik load baru
     (finally-nya yang membersihkan). */
  const DOC_LOAD_CHUNK = 16;
  const yieldToMain = () => (typeof (window as any).scheduler?.yield === 'function'
    ? (window as any).scheduler.yield()
    : new Promise(r => setTimeout(r, 0)));
  const commitDocChunked = async fullDoc => {
    const token = ++loadTokenRef.current;
    const all = fullDoc.objects || [];
    const sr = sceneRendererRef.current;
    const scene = sr ? sr.scene : null;
    setDocLoading({ loaded: 0, total: all.length });
    /* Yield satu frame agar React sempat commit indikator SEBELUM kerja berat. */
    await new Promise(r => requestAnimationFrame(r));
    try {
      if (token !== loadTokenRef.current) return false;
      if (sr) sr.setSuspended(true);
      let i = 0;
      while (i < all.length) {
        if (token !== loadTokenRef.current) return false;
        const sliceStart = performance.now();
        let end = i;
        do {
          const nextEnd = Math.min(all.length, end + DOC_LOAD_CHUNK);
          for (let j = end; j < nextEnd; j++) {
            const o = all[j];
            /* Panaskan cache Skia-path; cerminkan drawScene: teks legacy
               lewat jalur drawText (tanpa path) dan tidak dipanaskan. */
            if (o && o.subs && o.subs.length && !isLegacyText(o) && scene) scene.path(o);
          }
          end = nextEnd;
        } while (end < all.length && (performance.now() - sliceStart) < 10);
        setDocLoading({ loaded: end, total: all.length });
        i = end;
        if (i < all.length) await yieldToMain();
      }
      if (token !== loadTokenRef.current) return false;
      live(fullDoc);
      push(fullDoc, null);
      return true;
    } finally {
      if (token === loadTokenRef.current) {
        if (sr) sr.setSuspended(false);
        setDocLoading(null);
      }
    }
  };
  /* Varian chunked dari loadDoc: pre-fit ke bounds dokumen penuh SEBELUM
     chunk pertama supaya semua chunk dirender pada zoom akhir (tanpa ini
     fitView di akhir memicu satu redraw penuh tambahan). */
  const loadDocChunked = async (d, note) => {
    if (d.error) return say('File SVG tidak valid');
    const full = vectorDocument(d);
    const bounds = VE.docBounds({ ...full, objects: full.objects.filter(o => o && !o.hidden && (o.opacity ?? 1) > 0 && (o.groupOpacity ?? 1) > 0) });
    if (bounds?.every(Number.isFinite)) {
      const [left, top, right, bottom] = bounds;
      fitTo(left, top, right - left, bottom - top, 24);
    }
    setSel({
      objs: new Set(),
      nodes: new Set()
    });
    const ok = await commitDocChunked(full);
    if (!ok) return;
    /* Samakan dengan loadDoc: fitView trailing (no-op bila pre-fit sudah
       tepat — fitTo yang sama menghasilkan zoom/pan yang sama — dan
       menyelamatkan bila pre-fit gagal karena box belum terukur). */
    requestAnimationFrame(() => api.current.fitView());
    if (d.unsupported) say('Elemen SVG dilewati: ' + unsSummary(d));else if (note) say(note);
  };
  useEffect(() => {
    if (initialSvg && initialSvg !== loaded.current) {
      loaded.current = initialSvg;
      const parsed = VE.parseSVG(initialSvg);
      const docToLoad = autoSimplifyOn ? VE.autoSimplifyDoc(parsed).doc : parsed;
      loadDoc(docToLoad, hist.current.p > 0 ? 'SVG baru dimuat (Ctrl+Z untuk kembali)' : null);
    }
  }, [initialSvg, autoSimplifyOn]);

  /* ---- impor banyak file (SVG + gambar) → ditambahkan ke kanvas, tidak menggantikan isi ---- */
  const readAs = (f, how) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    how === 'text' ? r.readAsText(f) : r.readAsDataURL(f);
  });
  const imgSize = url => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res({
      w: im.naturalWidth,
      h: im.naturalHeight
    });
    im.onerror = rej;
    im.src = url;
  });
  /* Magic-byte sniffer: tipe ditentukan dari isi file (bukan sekadar ekstensi), ekstensi/MIME hanya cadangan */
  const sniffKind = async f => {
    let u8 = new Uint8Array(0);
    try {
      u8 = new Uint8Array(await f.slice(0, 4096).arrayBuffer());
    } catch (e) {}
    const hd = String.fromCharCode.apply(null, u8.subarray(0, 16)),
      txt = new TextDecoder('utf-8').decode(u8.subarray(0, 2048));
    if (u8[0] === 0x89 && hd.slice(1, 4) === 'PNG') return 'img';
    if (u8[0] === 0xFF && u8[1] === 0xD8 && u8[2] === 0xFF) return 'img';
    if (hd.startsWith('GIF8') || hd.startsWith('RIFF') && hd.slice(8, 12) === 'WEBP') return 'img';
    if (u8[0] === 0x00 && u8[1] === 0x01 && u8[2] === 0x00 && u8[3] === 0x00 || hd.startsWith('OTTO') || hd.startsWith('true')) return 'font';
    if (hd.startsWith('%PDF-') || hd.startsWith('%!PS') || u8[0] === 0xC5 && u8[1] === 0xD0 && u8[2] === 0xD3 && u8[3] === 0xC6) return 'ps';
    if (/<svg[\s>]/i.test(txt)) return 'svg';
    const ext = ((f.name || '').split('.').pop() || '').toLowerCase(),
      ty = f.type || '';
    if (ext === 'ttf' || ext === 'otf' || ty.startsWith('font/')) return 'font';
    if (ext === 'svg' || ty === 'image/svg+xml') return 'svg';
    if (['ai', 'ps', 'eps', 'pdf'].includes(ext) || ty === 'application/postscript' || ty === 'application/pdf') return 'ps';
    if (ty.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'img';
    return null;
  };
  const importFiles = async (list: any, at: any = null) => {
    const files = (Array.from(list || []).filter(Boolean) as File[]);
    DEBUG_LOG.log('document', 'import:' + files.length + ' file', 'importFiles', 'src/components/editor/VectorEditor.tsx', files.slice(0, 5).map(f => f.name).join(', '));
    if (!files.length || !boxRef.current) return;
    say('Memuat ' + files.length + ' file…');
    const r = boxRef.current.getBoundingClientRect(),
      visW = r.width / zoomRef.current,
      visH = r.height / zoomRef.current;
    const ctr = toDoc(at ? at.x : r.left + r.width / 2, at ? at.y : r.top + r.height / 2),
      items = [],
      fontFiles = [];
    let bad = 0,
      warn = false;
    for (const f of files) {
      try {
        const base = (f.name || 'gambar').replace(/\.[^.]+$/, '') || 'gambar';
        const kind = await sniffKind(f);
        if (kind === 'font') {
          fontFiles.push(f);
          continue;
        }
        if (kind === 'svg') {
          const d = VE.parseSVG(await readAs(f, 'text'));
          if (d.error || !d.objects.length) {
            bad++;
            continue;
          }
          if (d.unsupported) warn = true;
          items.push({
            kind: 'svg',
            d,
            name: base,
            W: d.viewBox[2],
            H: d.viewBox[3]
          });
        } else if (kind === 'ps') {
          const d = await VE.parsePSorAI(await f.arrayBuffer());
          if (d.error || !d.objects.length) {
            bad++;
            continue;
          }
          if (d.unsupported) warn = true;
          items.push({
            kind: 'svg',
            d,
            name: base,
            W: d.viewBox[2],
            H: d.viewBox[3]
          });
        } else if (kind === 'img') {
          let url,
            assetId = null;
          if (projectId && typeof AssetManager !== 'undefined') {
            const saved = await AssetManager.ingestBlob(projectId, f, f.name || base + '.png');
            url = saved.href;
            assetId = saved.assetId;
          } else {
            url = await readAs(f, 'url');
          }
          const sz = (await imgSize(url)) as { w: number; h: number },
            k = Math.min(1, visW * 0.8 / sz.w, visH * 0.8 / sz.h);
          items.push({
            kind: 'img',
            url,
            assetId,
            name: base,
            w: sz.w,
            h: sz.h,
            k,
            W: sz.w * k,
            H: sz.h * k
          });
        } else bad++;
      } catch (x) {
        bad++;
      }
    }
    if (fontFiles.length) {
      await importFontFiles(fontFiles);
      if (!items.length) return;
    }
    if (!items.length) return say('Tidak ada file yang bisa dimuat (gunakan SVG, AI, EPS, PS, PDF, PNG, JPG, WebP, GIF, TTF, OTF)');
    const cur = docRef.current,
      empty = !cur.objects.length,
      gap = 16 / zoomRef.current;
    let base0 = cur;
    const first = items[0],
      useFrame = empty && first.kind === 'svg';
    if (useFrame) base0 = {
      ...cur,
      viewBox: first.d.viewBox
    };
    const total = items.reduce((a, it) => a + it.W, 0) + gap * (items.length - 1);
    let px = useFrame ? first.d.viewBox[0] : ctr.x - total / 2;
    const used = new Set(cur.objects.map(o => o.name)),
      uniq = n => {
        let k = n,
          i = 2;
        while (used.has(k)) k = n + '-' + i++;
        used.add(k);
        return k;
      },
      news = [];
    items.forEach((it, idx) => {
      const py = useFrame && idx === 0 ? first.d.viewBox[1] : ctr.y - it.H / 2;
      if (it.kind === 'img') {
        const o: any = VE.makeImageObj(it.url, it.w, it.h, 0, 0, uniq(it.name), 'none');
        if (it.assetId) o.img.assetId = it.assetId;
        news.push({
          ...VE.scaleObj(VE.translate(o, px, py), px, py, it.k),
          name: o.name
        });
      } else {
        const vb = it.d.viewBox,
          gm = new Map(),
          gused = new Set([...cur.objects, ...news].map(o => o.group).filter(Boolean));
        it.d.objects.forEach(o => {
          const dx = px - vb[0],
            dy = py - vb[1];
          const q = Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12 ? o : VE.translate(o, dx, dy);
          let g = null;
          if (o.group) {
            if (!gm.has(o.group)) {
              const isF = o.containerType === 'frame' || o.isFrameBg || o.isAutoFrame || /^frame/i.test(o.group);
              let cand = o.group;
              if (gused.has(cand)) {
                const prefix = isF ? 'Frame-' : 'grup-';
                let k = 1;
                while (gused.has(prefix + k)) k++;
                cand = prefix + k;
              }
              gused.add(cand);
              gm.set(o.group, cand);
            }
            g = gm.get(o.group);
          }
          const nextName = o.isFrameBg && g ? uniq(g + '-bg') : uniq(o.name);
          news.push({
            ...q,
            name: nextName,
            group: g
          });
        });
      }
      px += it.W + gap;
    });
    /* Task 10 (B-F1): gabungan besar dimuat chunked seperti loadTestSvg —
       teselasi + render pertama tersebar antar frame; gabungan kecil tetap
       commit sinkron lama persis. Bila digantikan load yang lebih baru,
       langkah akhir (seleksi/fit/pesan) tidak dijalankan. */
    let finalNews = news;
    if (autoSimplifyOnRef.current) {
      const simpNews = VE.autoSimplifyDoc({ viewBox: base0.viewBox, objects: news });
      finalNews = simpNews.doc.objects;
    }
    const merged = { ...base0, objects: [...cur.objects, ...finalNews] };
    if (merged.objects.length > DOC_LOAD_CHUNK) {
      const ok = await commitDocChunked(merged);
      if (!ok) return;
    } else {
      commit(merged, null);
    }
    setSel({
      objs: new Set(finalNews.length > 24 ? [] : finalNews.map(o => o.id)),
      nodes: new Set()
    });
    const bb = VE.docBounds({
        objects: finalNews
      }),
      vb = base0.viewBox;
    let note = '';
    if (bb) {
      if (bb[0] < vb[0] - 0.5 || bb[1] < vb[1] - 0.5 || bb[2] > vb[0] + vb[2] + 0.5 || bb[3] > vb[1] + vb[3] + 0.5) {
        setExportArea('content');
        note = prefs.lang === 'en' ? ' · export area: all content' : ' · area ekspor: semua konten';
      }
      if (empty || bb[2] - bb[0] > visW || bb[3] - bb[1] > visH) requestAnimationFrame(() => fitTo(empty ? Math.min(bb[0], vb[0]) : bb[0], empty ? Math.min(bb[1], vb[1]) : bb[1], Math.max(1e-6, empty ? Math.max(bb[2], vb[0] + vb[2]) - Math.min(bb[0], vb[0]) : bb[2] - bb[0]), Math.max(1e-6, empty ? Math.max(bb[3], vb[1] + vb[3]) - Math.min(bb[1], vb[1]) : bb[3] - bb[1]), 60));
    }
    const warnDetails = items.map(it => it.d && unsSummary(it.d)).filter(Boolean).join(', ');
    say(items.length + ' file ditambahkan' + (bad ? ' · ' + bad + ' dilewati' : '') + (warn ? ' · elemen dilewati: ' + (warnDetails || L.edUnsupportedDefault) : '') + note);
  };
  /* teks clipboard → objek internal / SVG / PostScript / data-URL gambar. true bila ditangani */
  const pasteText = (tx: any, at: any = null) => {
    tx = String(tx || '').replace(/^\uFEFF/, '').trim();
    if (!tx) return false;
    const c = clipRef.current;
    if (c && c.objs.length && (tx === c.svg || tx.startsWith('svgpeak-clip:'))) {
      pasteClip(at);
      return true;
    }
    const svgMatch = tx.match(/<svg[\s>][\s\S]*<\/svg>/i);
    if (svgMatch) {
      importFiles([new File([svgMatch[0]], 'tempel.svg', {
        type: 'image/svg+xml'
      })], at);
      return true;
    }
    if (/^%!PS-Adobe/.test(tx) || /\b(moveto|curveto|setrgbcolor|setcmykcolor)\b/.test(tx)) {
      importFiles([new File([tx], 'tempel.ps', {
        type: 'application/postscript'
      })], at);
      return true;
    }
    if (/^data:image\/svg\+xml/i.test(tx)) {
      try {
        const comma = tx.indexOf(',');
        if (comma > 0) {
          const meta = tx.slice(0, comma),
            raw = tx.slice(comma + 1);
          const decoded = /;base64/i.test(meta) ? atob(raw) : decodeURIComponent(raw);
          if (/<svg[\s>]/i.test(decoded)) {
            importFiles([new File([decoded], 'tempel.svg', {
              type: 'image/svg+xml'
            })], at);
            return true;
          }
        }
      } catch (e) {}
    }
    if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);/i.test(tx)) {
      fetch(tx).then(r => r.blob()).then(b => importFiles([new File([b], 'tempel.' + (b.type.split('/')[1] || 'png').replace('svg+xml', 'svg'), {
        type: b.type
      })], at)).catch(() => say('Data gambar tidak valid'));
      return true;
    }
    return false;
  };
  /* membaca clipboard sistem secara aktif (tombol Paste di menu klik-kanan) */
  const pasteFromSystem = async (at: any = null) => {
    const cb = navigator.clipboard;
    if (cb && cb.read) {
      try {
        const items = await cb.read();
        for (const it of items) {
          const tx = it.types.includes('text/plain') ? await (await it.getType('text/plain')).text() : '';
          if (pasteText(tx, at)) return;
          if (it.types.includes('image/svg+xml')) {
            const bl = await it.getType('image/svg+xml');
            return importFiles([new File([bl], 'clipboard.svg', {
              type: 'image/svg+xml'
            })], at);
          }
          const it0 = it.types.find(t => t === 'image/png' || t === 'image/jpeg' || t === 'image/webp');
          if (it0) {
            const bl = await it.getType(it0);
            return importFiles([new File([bl], 'clipboard.' + it0.split('/')[1], {
              type: it0
            })], at);
          }
        }
      } catch (e) {}
    }
    if (clipRef.current && clipRef.current.objs.length) return pasteClip(at);
    say('Tekan Ctrl+V untuk menempel gambar/vektor dari clipboard');
  };
  /* GV-007: Listener paste memakai ref stabil dan dependency [active] agar tidak dipasang ulang tiap render */
  const pasteHandlerRef = useRef(null);
  pasteHandlerRef.current = e => {
    const t = e.target;
    if (t && t.closest && t.closest('[data-custom-input="true"],[role="textbox"],[contenteditable="true"]')) return;
    const cd = e.clipboardData;
    if (!cd) return;
    const g = k => {
      try {
        return cd.getData(k) || '';
      } catch (x) {
        return '';
      }
    };
    let done = pasteText(g('text/plain')) || pasteText(g('image/svg+xml'));
    if (!done) {
      const hm = g('text/html').match(/<svg[\s\S]*<\/svg>/i);
      if (hm) done = pasteText(hm[0]);
    }
    if (!done) {
      let fl: any[] = Array.from(cd.files || []).filter((f: any) => (f.type || '').startsWith('image/') || /\.(svg|ai|ps|eps|pdf|png|jpe?g|webp|gif)$/i.test(f.name || ''));
      if (!fl.length && cd.items) fl = Array.from(cd.items).filter((i: any) => i.kind === 'file' && ((i.type || '').startsWith('image/') || i.type === 'application/pdf' || i.type === 'application/postscript')).map((i: any) => i.getAsFile()).filter(Boolean);
      const vecFl = fl.filter((f: any) => f.type === 'image/svg+xml' || f.type === 'application/postscript' || f.type === 'application/pdf' || /\.(svg|ai|ps|eps|pdf)$/i.test(f.name || ''));
      if (vecFl.length) fl = vecFl;
      if (fl.length) {
        importFiles(fl, null);
        done = true;
      }
    }
    if (!done && clipRef.current && clipRef.current.objs.length) {
      pasteClip();
      done = true;
    }
    if (done) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  useEffect(() => {
    if (!active) return;
    const ps = e => pasteHandlerRef.current && pasteHandlerRef.current(e);
    window.addEventListener('paste', ps, true);
    return () => window.removeEventListener('paste', ps, true);
  }, [active]);

  /* ---- hit-test via Spatial Index (GV-006) ---- */
  const toDoc = (cx, cy) => {
    const r = boxRectRef.current && boxRectRef.current.width > 0 ? boxRectRef.current : boxRectRef.current = boxRef.current.getBoundingClientRect(),
      p = panRef.current,
      s = zoomRef.current;
    return {
      x: (cx - r.left - p.x) / s,
      y: (cy - r.top - p.y) / s
    };
  };
  /* GV-A16: Hit-test kanonik yang menghormati opacity, groupOpacity, clipPathD & Frame clipping */
  const hitObj = pt => {
    const touchBoost = lastPointerTypeRef.current === 'touch' ? 2.25 : 1;
    const tol = (6 * touchBoost) / zoomRef.current,
      os = docRef.current.objects;
    const frameRectMap = new Map((frameBoxes || []).map(f => [f.id, f.bb]));
    const hitOpts = {
      clipFrames,
      frameRectMap,
      textBounds: measuredTextBounds
    };
    /* Slice 50 menit Q2(a): latar frame ikon transparan tidak hittable —
       klik area kosong di dalam batas frame (termasuk lubang) memilih frame
       utuh lewat bg-nya. Hanya bila tidak ada objek yang kena hit. */
    const hitIconFrameBg = () => {
      let best = null, bestArea = Infinity;
      for (const f of (frameBoxes || [])) {
        const bb = f.bb;
        if (!bb || pt.x < bb[0] - tol || pt.x > bb[2] + tol || pt.y < bb[1] - tol || pt.y > bb[3] + tol) continue;
        const area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
        if (area >= bestArea) continue;
        const bg = os.find(o => o.group === f.id && (o.isFrameBg || o.isAutoFrame));
        if (!bg || !bg.isIconFrame) continue;
        best = bg; bestArea = area;
      }
      return best;
    };
    const sIdx = VE.getDocSpatialIndex(os);
    const cands = sIdx ? sIdx.queryObjectsInRect(pt.x - tol, pt.y - tol, pt.x + tol, pt.y + tol) : null;
    /* Bila beberapa anggota frame ikon yang sama kena hit, pilih yang
       bbox-nya paling kecil — bagian lubang (mis. kepala) jadi bisa diklik
       meski tertutup cakram di atasnya. Di luar frame ikon, yang paling
       atas tetap menang. */
    const pickHit = (list) => {
      let best = null;
      for (let i = list.length - 1; i >= 0; i--) {
        const o = list[i];
        if (!VE.hitTestObject(o, pt, tol, hitOpts)) continue;
        if (!best) { best = o; continue; }
        if (best.isIconFrame && o.isIconFrame && best.group && o.group === best.group) {
          const bbO = VE.tightBBox(o), bbB = VE.tightBBox(best);
          if (bbO && bbB && (bbO[2] - bbO[0]) * (bbO[3] - bbO[1]) < (bbB[2] - bbB[0]) * (bbB[3] - bbB[1])) best = o;
          continue;
        }
        break;
      }
      return best;
    };
    if (cands) {
      const hit = pickHit(cands.map(c => c.o));
      if (hit) return hit;
      return hitIconFrameBg();
    }
    const hit = pickHit(os);
    if (hit) return hit;
    return hitIconFrameBg();
  };
  const pickNode = pt => {
    const z = Math.max(0.1, zoomRef.current || 1),
      touchBoost = lastPointerTypeRef.current === 'touch' ? 2.25 : 1,
      scaleFactor = Math.max(0.4, Math.min(3.0, Number(nodeScale) || 1)),
      hTol = (8 / z) * scaleFactor * touchBoost,
      nTol = (9 / z) * scaleFactor * touchBoost;
    if (showSelHandles) {
      for (let k = shown.length - 1; k >= 0; k--) {
        const o = shown[k];
        for (const sp of o.subs) for (const n of sp.nodes) for (const w of ['in', 'out']) {
          const h = w === 'in' ? n.handleIn : n.handleOut;
          if (h && hOk(o, n) && Math.abs(pt.x - h.x) <= hTol && Math.abs(pt.y - h.y) <= hTol && VE.dist(h, n) > 1e-6 && VE.dist(pt, h) < hTol) return {
            kind: 'handle',
            o,
            n,
            w,
            h
          };
        }
      }
    }
    if (showSelNodes) {
      for (let k = shown.length - 1; k >= 0; k--) {
        const o = shown[k];
        const bb = vinfo(o).bb;
        if (pt.x < bb[0] - nTol || pt.x > bb[2] + nTol || pt.y < bb[1] - nTol || pt.y > bb[3] + nTol) continue;
        for (const sp of o.subs) for (const n of sp.nodes) if (Math.abs(pt.x - n.x) <= nTol && Math.abs(pt.y - n.y) <= nTol && VE.dist(pt, n) < nTol) return {
          kind: 'node',
          o,
          n
        };
      }
    }
    return null;
  };
  const nearestSeg = (objs, pt, tol) => {
    let best = null;
    const sIdx = objs === docRef.current.objects ? VE.getDocSpatialIndex(objs) : null;
    if (sIdx) {
      sIdx.querySegments(pt.x, pt.y, tol, sg => {
        if (sg.o.hidden || sg.o.locked || sg.o.img) return;
        const r = VE.nearOnSeg(sg.a, sg.b, pt);
        if (r.d < tol && (!best || r.d < best.d)) best = {
          o: sg.o,
          sp: sg.sp,
          i: sg.i,
          t: Math.min(0.98, Math.max(0.02, r.t)),
          d: r.d
        };
      });
      return best;
    }
    objs.forEach(o => {
      const b = vinfo(o).bb;
      if (pt.x < b[0] - tol || pt.x > b[2] + tol || pt.y < b[1] - tol || pt.y > b[3] + tol) return;
      o.subs.forEach(sp => {
        const ns = sp.nodes,
          n = ns.length;
        for (let i = 0; i < (sp.closed ? n : n - 1); i++) {
          const r = VE.nearOnSeg(ns[i], ns[(i + 1) % n], pt);
          if (r.d < tol && (!best || r.d < best.d)) best = {
            o,
            sp,
            i,
            t: Math.min(0.98, Math.max(0.02, r.t)),
            d: r.d
          };
        }
      });
    });
    return best;
  };

  /* ---- pointer & SN-006 tool-aware snapAt ---- */
  const snapAt = (p: any, e: any, exObjs: any = null, exNodes: any = null, objs: any = null, opt: any = null) => {
    /* C2: tombol penekan snap = Ctrl/Cmd ATAU Alt (dulu hanya Ctrl/Cmd di
       jalur ini, padahal tooltip menyebut Alt dan alat lain memakai Alt). */
    if (!snapOn || e.ctrlKey || e.metaKey || e.altKey) {
      setSnapInd(null);
      return p;
    }
    opt = opt || {};
    const thr = VE.SNAP_PX / zoomRef.current,
      objects = objs || docRef.current.objects;
    const toolCap = SNAP_TOOL_CAPABILITIES[tool] || SNAP_TOOL_CAPABILITIES.select;
    const allowSpacing = !!(snapCfg.spacing && (opt.allowSpacing || toolCap.spacing) && opt.dragBBox);
    const allowPerp = !!(snapCfg.perp && (opt.allowPerp || toolCap.perp));
    const cfg = {
      ...snapCfg,
      bbox: !!(snapCfg.bbox && toolCap.bbox),
      spacing: allowSpacing,
      artboard: !!(snapCfg.artboard && toolCap.artboard),
      node: !!(snapCfg.node && toolCap.node),
      axial: !!(snapCfg.axial && toolCap.axial),
      midpoint: !!(snapCfg.midpoint && toolCap.midpoint),
      edge: !!(snapCfg.edge && toolCap.edge),
      perp: allowPerp,
      grid: !!(snapCfg.grid && gridOn && toolCap.grid),
      pixel: !!(snapCfg.pixel && toolCap.pixel)
    };
    /* C16: kunci cache mengurutkan id Set agar urutan sisip yang berbeda
       tidak memicu rebuild cache yang tidak perlu. */
    const key = ['bbox', 'spacing', 'artboard', 'node', 'axial', 'midpoint', 'perp'].map(k => +!!cfg[k]).join('') + '|' + (exObjs ? 'S' + [...exObjs].sort().join(',') : 'N') + '|' + (exNodes ? 'S' + [...exNodes].sort().join(',') : 'N');
    const vb = docRef.current.viewBox,
      c0 = snapCacheRef.current;
    let cache;
    if (c0 && c0.objects === objects && c0.vb === vb && c0.key === key) cache = c0.cache;else {
      cache = VE.buildSnapCache({
        viewBox: vb,
        objects
      }, exObjs, exNodes, cfg, null);
      snapCacheRef.current = {
        objects,
        vb,
        key,
        cache
      };
    }
    let extra = opt.extra || null;
    if (allowPerp && opt.perpAnchor && opt.perpPrev) {
      const u = VE.nrm(VE.sub(opt.perpAnchor, opt.perpPrev));
      const dynRays = [{
        o: opt.perpAnchor,
        d: u,
        src: p,
        label: '180°',
        kind: 'perp'
      }, {
        o: opt.perpAnchor,
        d: {
          x: -u.y,
          y: u.x
        },
        src: p,
        label: '90°',
        kind: 'perp'
      }];
      cache = {
        ...cache,
        rays: [...(cache.rays || []), ...dynRays]
      };
    }
    const r = VE.solveMultiSnap(p, cache, objects, exObjs, exNodes, thr, cfg.grid ? gridStep() : 0, cfg, opt.dragBBox || null, extra);
    setSnapInd(r.ind ? {
      x: r.ix,
      y: r.iy,
      kind: r.kind,
      cross: r.cross,
      guides: r.guides
    } : null);
    return r;
  };
  /* titik kandidat yang ikut bergerak: jika seluruh objek kanvas dipilih (!hasOtherObjs), cukup anchor + bbox;
     jika jumlah node sangat besar (> 48), ambil sampel merata + titik kunci bbox agar drag 9.000+ node tetap 60fps */
  const dragCands = dg => {
    const bbPts = [];
    if (dg.bb0) {
      const [x0, y0, x1, y1] = dg.bb0;
      const cx = (x0 + x1) * 0.5,
        cy = (y0 + y1) * 0.5;
      bbPts.push({
        x: cx,
        y: cy
      }, {
        x: x0,
        y: y0
      }, {
        x: x1,
        y: y0
      }, {
        x: x1,
        y: y1
      }, {
        x: x0,
        y: y1
      });
    }
    if (dg.hasOtherObjs === false) {
      return bbPts.length ? bbPts : dg.anchor ? [{
        x: dg.anchor.x,
        y: dg.anchor.y
      }] : [];
    }
    const allPts = [];
    dg.base.objects.forEach(o => {
      if (dg.type === 'obj' && !dg.ids.has(o.id)) return;
      o.subs.forEach(sp => sp.nodes.forEach(n => {
        if (dg.type === 'node' && !dg.ids.has(n.id)) return;
        allPts.push({
          x: n.x,
          y: n.y
        });
      }));
    });
    const MAX_CANDS = dg.type === 'obj' ? 12 : 48;
    if (allPts.length <= MAX_CANDS) {
      return dg.type === 'obj' ? bbPts.concat(allPts) : allPts;
    }
    const pts = bbPts.slice();
    if (dg.anchor && dg.type !== 'obj') pts.push({
      x: dg.anchor.x,
      y: dg.anchor.y
    });
    const step = allPts.length / MAX_CANDS;
    for (let i = 0; i < MAX_CANDS; i++) {
      pts.push(allPts[Math.min(allPts.length - 1, Math.floor(i * step))]);
    }
    return pts;
  };
  /* kontur objek yang digeser: dievaluasi untuk seleksi kecil/menengah agar tidak membekukan drag ribuan kurva */
  const dragOutline = dg => {
    if (dg.hasOtherObjs === false || dg.dragNodeCount > 24 || dg.ids && dg.ids.size > 2) {
      return {
        segs: [],
        samples: []
      };
    }
    const segs = [];
    dg.base.objects.forEach(o => {
      if (!dg.ids.has(o.id)) return;
      o.subs.forEach(sp => {
        const ns = sp.nodes,
          n = ns.length;
        for (let i = 0; i < (sp.closed ? n : n - 1); i++) {
          const a = ns[i],
            b = ns[(i + 1) % n];
          let x0 = Math.min(a.x, b.x),
            x1 = Math.max(a.x, b.x),
            y0 = Math.min(a.y, b.y),
            y1 = Math.max(a.y, b.y);
          for (const q of [a.handleOut, b.handleIn]) if (q) {
            x0 = Math.min(x0, q.x);
            x1 = Math.max(x1, q.x);
            y0 = Math.min(y0, q.y);
            y1 = Math.max(y1, q.y);
          }
          segs.push({
            a,
            b,
            bb: [x0, y0, x1, y1],
            curved: !!(a.handleOut || b.handleIn)
          });
        }
      });
    });
    const per = 4,
      samples = [];
    segs.forEach(sg => {
      const k = sg.curved ? per : 2;
      for (let j = 1; j < k; j++) samples.push(VE.segPoint(sg.a, sg.b, j / k));
    });
    return {
      segs,
      samples
    };
  };
  /* ================= v4.6: Resize interaktif · Pen Tool · Auto-Handle ================= */
  const quant45 = (a, p) => {
    const vx = p.x - a.x,
      vy = p.y - a.y,
      L = Math.hypot(vx, vy),
      g = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: a.x + Math.cos(g) * L,
      y: a.y + Math.sin(g) * L
    };
  };
  const penFind = (d, s) => {
    if (!s) return null;
    const o = d.objects.find(q => q.id === s.oid),
      sp = o && o.subs.find(q => q.id === s.spid);
    return sp ? {
      o,
      sp
    } : null;
  };
  const penMap = (d, oid, spid, fn) => ({
    ...d,
    objects: d.objects.map(o => o.id !== oid ? o : {
      ...o,
      subs: o.subs.map(sp => sp.id !== spid ? sp : fn(sp))
    })
  });
  const penNodeMap = (d, oid, spid, nid, fn) => penMap(d, oid, spid, sp => ({
    ...sp,
    nodes: sp.nodes.map(n => n.id === nid ? fn(n) : n)
  }));
  const replaceTop = d => {
    const h = hist.current;
    h.s[h.p] = d;
    h.key = null;
    notifyDocCommit(d);
  };
  /* titik target kursor Pen: menutup path (dekat node pertama) > Shift 45° > Multi-Snap */
  const penTarget = (e, pt, f) => {
    if (f && f.sp.nodes.length >= 2 && !f.sp.closed && VE.dist(pt, f.sp.nodes[0]) < 8 / zoomRef.current) {
      setSnapInd(null);
      return {
        x: f.sp.nodes[0].x,
        y: f.sp.nodes[0].y,
        close: true
      };
    }
    let q;
    if (e.shiftKey && f && f.sp.nodes.length) {
      q = quant45(f.sp.nodes[f.sp.nodes.length - 1], pt);
      setSnapInd(null);
    } else {
      const ns = f && f.sp && f.sp.nodes;
      const perpOpt = ns && ns.length >= 2 ? {
        allowPerp: true,
        perpAnchor: ns[ns.length - 1],
        perpPrev: ns[ns.length - 2]
      } : {
        allowPerp: true
      };
      /* C12: node terakhir path Pen (jangkar) dikecualikan dari target
         snap — draft Pen sudah ada di dokumen, dan tanpa ini titik baru
         bisa menempel tepat di atas jangkar (segmen panjang nol). Penutup
         ke node PERTAMA sudah ditangani khusus di atas. */
      const exNodes = ns && ns.length ? new Set([ns[ns.length - 1].id]) : null;
      q = snapAt(pt, e, null, exNodes, docRef.current.objects, perpOpt);
    }
    return {
      x: q.x,
      y: q.y,
      close: false
    };
  };
  const updatePenHover = e => {
    penEv.current = {
      x: e.clientX,
      y: e.clientY,
      shiftKey: e.shiftKey,
      altKey: e.altKey
    };
    if (penRaf.current) return;
    penRaf.current = requestAnimationFrame(() => {
      penRaf.current = 0;
      const ev = penEv.current;
      if (!ev || dragRef.current) return;
      const s = penRef.current,
        f = penFind(docRef.current, s),
        tg = penTarget(ev, toDoc(ev.x, ev.y), f);
      if (s && f) setPen({
        ...s,
        cur: {
          x: tg.x,
          y: tg.y
        },
        close: tg.close
      });
    });
  };
  /* Curvature (Task 6): bangun ulang preview dari curvatureRef dan
     tampilkan via live() (tanpa history — commit hanya di finish). */
  const rebuildCurvaturePreview = () => {
    const s = curvatureRef.current;
    if (!s) return;
    const o = makeCurvatureObj(s);
    s.obj = o;
    live({
      ...s.base,
      objects: [...s.base.objects, o]
    });
  };
  /* Hit-test segmen terdekat pada kurva preview (sampling VE.segPoint).
     Mengembalikan { seg, insIdx, at } atau null. insIdx = indeks sisip di
     s.pts (segmen penutup path tertutup -> sisip di akhir). */
  const curvatureSegHit = (s, pt, tol) => {
    const o = s.obj;
    if (!o) return null;
    const ns = o.subs[0].nodes,
      n = ns.length,
      segCount = o.subs[0].closed ? n : n - 1;
    if (segCount < 1) return null;
    let best = null;
    for (let i = 0; i < segCount; i++) {
      const a = ns[i],
        b = ns[(i + 1) % n];
      for (let k = 0; k <= 4; k++) {
        const p = VE.segPoint(a, b, k / 4),
          d = VE.dist(pt, p);
        if (d < tol && (!best || d < best.d)) best = {
          d,
          seg: i,
          insIdx: (i + 1) % n === 0 ? n : i + 1,
          at: p
        };
      }
    }
    return best;
  };
  /* Curvature (Task 6): double-click / Enter / Esc = selesai (pola
     finishPen). Esc membuang bila belum ada titik, commit bila sudah ada;
     path < 2 node dihapus (bukan path yang sah). Tool tetap aktif
     (seperti Pen) agar bisa langsung menggambar path berikutnya. */
  const finishCurvature = () => {
    const s = curvatureRef.current;
    if (!s) return;
    if (s.toggleTimer) {
      clearTimeout(s.toggleTimer);
      s.toggleTimer = null;
      s.togglePid = null;
    }
    curvatureRef.current = null;
    const d = docRef.current,
      o = d.objects.find(q => q.id === s.oid);
    if (!o) {
      live(s.base);
      setDocS(s.base);
      return;
    }
    const sp = o.subs[0];
    if (sp.nodes.length < 2) {
      commit({
        ...s.base,
        objects: s.base.objects.filter(q => q.id !== s.oid)
      });
      setSel({
        objs: new Set(),
        nodes: new Set()
      });
      return;
    }
    commit(d);
    setSel({
      objs: new Set([s.oid]),
      nodes: new Set()
    });
    say(sp.closed ? 'Path tertutup' : 'Path selesai (' + sp.nodes.length + ' node)');
  };
  const curvatureUndoLast = () => {
    const s = curvatureRef.current;
    if (!s) return;
    if (s.toggleTimer) {
      clearTimeout(s.toggleTimer);
      s.toggleTimer = null;
      s.togglePid = null;
    }
    if (s.pts.length <= 1) {
      curvatureRef.current = null;
      live(s.base);
      setDocS(s.base);
      setSel({
        objs: new Set(),
        nodes: new Set()
      });
      say('Gambar kurva dibatalkan');
      return;
    }
    s.pts.pop();
    if (s.closed && s.pts.length < 3) {
      s.closed = false;
    }
    rebuildCurvaturePreview();
    const lastPt = s.pts[s.pts.length - 1];
    setSel({
      objs: new Set([s.oid]),
      nodes: new Set([lastPt.id])
    });
    say('Titik kurva terakhir dibatalkan (' + s.pts.length + ' titik tersisa)');
  };
  const finishPen = () => {
    const s = penRef.current;
    if (!s) return;
    setPen(null);
    setSnapInd(null);
    const d = docRef.current,
      f = penFind(d, s);
    if (!f) return;
    if (f.sp.nodes.length < 2) {
      commit({
        ...d,
        objects: d.objects.filter(o => o.id !== s.oid)
      });
      setSel({
        objs: new Set(),
        nodes: new Set()
      });
      return;
    }
    let finalDoc = d;
    if (!f.sp.closed && f.sp.nodes[0].handleIn) {
      finalDoc = penNodeMap(d, s.oid, s.spid, f.sp.nodes[0].id, n => ({
        ...n,
        handleIn: null
      }));
    }
    commit(finalDoc);
    setSel({
      objs: new Set([s.oid]),
      nodes: new Set()
    });
    say(f.sp.closed ? 'Path tertutup' : 'Path selesai (' + f.sp.nodes.length + ' node)');
  };
  const penUndoLast = () => {
    const s = penRef.current,
      d = docRef.current,
      f = penFind(d, s);
    if (!f) {
      setPen(null);
      return;
    }
    if (f.sp.nodes.length <= 1) {
      setPen(null);
      commit({
        ...d,
        objects: d.objects.filter(o => o.id !== s.oid)
      });
      setSel({
        objs: new Set(),
        nodes: new Set()
      });
      return;
    }
    const nodes = f.sp.nodes.slice(0, -1);
    commit(penMap(d, s.oid, s.spid, sp => ({
      ...sp,
      closed: false,
      nodes
    })));
    setSel({
      objs: new Set([s.oid]),
      nodes: new Set([nodes[nodes.length - 1].id])
    });
  };
  const cancelPen = () => {
    const s = penRef.current;
    if (!s) return;
    setPen(null);
    setSnapInd(null);
    const d = docRef.current;
    commit({
      ...d,
      objects: d.objects.filter(o => o.id !== s.oid)
    });
    setSel({
      objs: new Set(),
      nodes: new Set()
    });
    say('Pen dibatalkan');
  };
  const closePenAndFinish = () => {
    const s = penRef.current;
    if (!s) return;
    const d = docRef.current;
    const f = penFind(d, s);
    if (!f || f.sp.nodes.length < 2) {
      finishPen();
      return;
    }
    const closedDoc = penMap(d, s.oid, s.spid, sp => ({
      ...sp,
      closed: true
    }));
    commit(closedDoc);
    finishPen();
  };
  /* FSM Pen: IDLE -> (down) DRAGGING_HANDLE -> (up) RUBBER_BAND -> CLOSING / FINISHING */
  const penDown = (e, pt, base) => {
    let s = penRef.current,
      f = penFind(base, s);
    if (!f) {
      s = null;
      f = null;
    }
    const tol = 8 / zoomRef.current,
      mk = (mode, oid, spid, n, nb) => ({
        type: 'pen',
        mode,
        base: nb,
        oid,
        spid,
        nid: n.id,
        P: {
          x: n.x,
          y: n.y
        },
        sx: e.clientX,
        sy: e.clientY,
        drag: false,
        moved: false
      });
    if (f) {
      const ns = f.sp.nodes,
        L = ns[ns.length - 1];
      if (ns.length >= 2 && !f.sp.closed && VE.dist(pt, ns[0]) < tol) {
        /* menutup path */
        const nd = penMap(base, s.oid, s.spid, sp => ({
          ...sp,
          closed: true
        }));
        commit(nd);
        setSel({
          objs: new Set([s.oid]),
          nodes: new Set([ns[0].id])
        });
        dragRef.current = mk('close', s.oid, s.spid, ns[0], nd);
        return;
      }
      if (VE.dist(pt, L) < tol) {
        setSel({
          objs: new Set([s.oid]),
          nodes: new Set([L.id])
        });
        dragRef.current = mk('last', s.oid, s.spid, L, base);
        return;
      } /* klik node terakhir */
    } else {
      /* VectorCraft Pen: klik ujung path terbuka yang terseleksi = lanjutkan path itu. */
      const openHit = findSelectedOpenEnd(base, selRef.current.objs, pt, tol);
      if (openHit) {
        let nb = base;
        let contNode = openHit.node;
        if (openHit.isStart) {
          nb = {
            ...base,
            objects: base.objects.map(o =>
              o.id !== openHit.obj.id
                ? o
                : { ...o, subs: o.subs.map(sp => sp.id === openHit.sp.id ? reverseSubpathNodes(sp) : sp) }
            )
          };
          const revSp = nb.objects.find(o => o.id === openHit.obj.id).subs.find(sp => sp.id === openHit.sp.id);
          contNode = revSp.nodes[revSp.nodes.length - 1];
          commit(nb);
        }
        setPen({ oid: openHit.obj.id, spid: openHit.sp.id, cur: null, close: false });
        setSel({ objs: new Set([openHit.obj.id]), nodes: new Set([contNode.id]) });
        dragRef.current = mk('last', openHit.obj.id, openHit.sp.id, contNode, nb);
        return;
      }
    }

    const tg = penTarget(e, pt, f),
      node = {
        id: VE.uid(),
        x: tg.x,
        y: tg.y,
        type: 'corner',
        handleIn: null,
        handleOut: null
      };
    let nd, oid, spid;
    if (f) {
      oid = s.oid;
      spid = s.spid;
      nd = penMap(base, oid, spid, sp => ({
        ...sp,
        nodes: [...sp.nodes, node]
      }));
    } else {
      const names = new Set(base.objects.map(q => q.name));
      let k = 1;
      while (names.has('Pen-' + k)) k++;
      oid = VE.uid();
      spid = VE.uid();
      nd = {
        ...base,
        objects: [...base.objects, {
          id: oid,
          name: 'Pen-' + k,
          type: 'path',
          fill: penSty.fill,
          stroke: penSty.stroke,
          strokeWidth: penSty.sw,
          opacity: 1,
          fillRule: 'nonzero',
          group: null,
          subs: [{
            id: spid,
            closed: false,
            nodes: [node]
          }]
        }]
      };
    }
    commit(nd);
    setPen({
      oid,
      spid,
      cur: null,
      close: false
    });
    setSel({
      objs: new Set([oid]),
      nodes: new Set([node.id])
    });
    dragRef.current = mk('new', oid, spid, node, nd);
  };
  const penMove = (e, pt, dg) => {
    if (spaceRef.current && dg.drag) {
      const prev = dg.lastPt || pt;
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      dg.lastPt = { x: pt.x, y: pt.y };
      dg.P = { x: dg.P.x + dx, y: dg.P.y + dy };
      dg.base = translateAnchorInDoc(dg.base, dg.oid, dg.spid, dg.nid, dx, dy);
      dg.moved = true;
      live(translateAnchorInDoc(docRef.current, dg.oid, dg.spid, dg.nid, dx, dy));
      return;
    }
    dg.lastPt = { x: pt.x, y: pt.y };
    if (!dg.drag && VE.dist(pt, dg.P) * zoomRef.current < 4) return; /* hysteresis jarak layar */
    dg.drag = true;
    let T = pt;
    if (e.shiftKey) {
      T = quant45(dg.P, pt);
      setSnapInd(null);
    } else T = snapAt(pt, e, null, new Set([dg.nid]), dg.base.objects);
    const out = {
        x: T.x,
        y: T.y
      },
      nd = penNodeMap(dg.base, dg.oid, dg.spid, dg.nid, n => {
        const mir = {
          x: 2 * n.x - T.x,
          y: 2 * n.y - T.y
        };
        if (dg.mode === 'close') return n.handleOut ? {
          ...n,
          fil: null,
          handleIn: mir,
          type: 'corner'
        } : {
          ...n,
          fil: null,
          handleIn: mir,
          handleOut: out,
          type: 'symmetric'
        };
        if (e.altKey) return {
          ...n,
          fil: null,
          handleOut: out,
          handleIn: dg.curIn !== undefined ? dg.curIn : n.handleIn,
          type: 'corner'
        }; /* Alt = cusp */
        dg.curIn = mir;
        return {
          ...n,
          fil: null,
          handleOut: out,
          handleIn: mir,
          type: 'symmetric'
        }; /* H_in = 2P - H_out */
      });

    dg.moved = true;
    live(nd);
  };
  const penUp = dg => {
    if (dg.moved) {
      if (dg.mode === 'last') commit(docRef.current);
      else {
        replaceTop(docRef.current);
        setDocS(docRef.current);
      }
    }
    if (dg.mode === 'close') {
      finishPen();
      return;
    }
    if (dg.mode === 'last' && !dg.moved) {
      /* klik node terakhir = putus handle keluar */
      const f = penFind(docRef.current, dg),
        nn = f && f.sp.nodes.find(n => n.id === dg.nid);
      if (nn && nn.handleOut) commit(penNodeMap(docRef.current, dg.oid, dg.spid, dg.nid, n => ({
        ...n,
        handleOut: null,
        type: 'corner'
      })));
    }
  };
  /* Auto-Handle */
  const hoverAuto = ev => {
    const p = toDoc(ev.x, ev.y),
      tol = 10 / zoomRef.current;
    let best = null;
    docRef.current.objects.forEach(o => {
      if (o.hidden || o.locked || o.img || !o.subs) return;
      const bb = vinfo(o).bb;
      if (p.x < bb[0] - tol || p.x > bb[2] + tol || p.y < bb[1] - tol || p.y > bb[3] + tol) return;
      o.subs.forEach(sp => sp.nodes.forEach(nd => {
        const d = VE.dist(p, nd);
        if (d < tol && (!best || d < best.d)) best = {
          d,
          o,
          sp,
          nd
        };
      }));
    });
    if (best) return {
      kind: 'node',
      oid: best.o.id,
      spid: best.sp.id,
      nid: best.nd.id,
      x: best.nd.x,
      y: best.nd.y
    };
    const o = hitObj(p);
    return o && !o.img && !o.locked && !o.hidden && !o.text && !o.isFrameBg && o.subs ? {
      kind: 'obj',
      oid: o.id,
      spid: null,
      nid: null,
      x: p.x,
      y: p.y
    } : null;
  };
  const ahDown = (e, base) => {
    const hv = hoverAuto({
      x: e.clientX,
      y: e.clientY
    });
    if (!hv) {
      say('Klik sebuah node atau badan objek (bukan gambar) untuk menambahkan handle otomatis');
      return;
    }
    const spid = ahOpt.scope === 'obj' ? null : hv.spid;
    const o0 = base.objects.find(q => q.id === hv.oid);
    if (!o0 || o0.locked || o0.hidden || o0.img) return;
    /* Klik langsung menambahkan handle Bézier TANPA mengubah bentuk objek (preserveShape: true) */
    const o1 = VE.autoHandles(o0, spid, {
      preserveShape: true
    });
    setSel({
      objs: new Set([hv.oid]),
      nodes: new Set(hv.nid ? [hv.nid] : [])
    });
    live({
      ...base,
      objects: base.objects.map(q => q.id === hv.oid ? o1 : q)
    });
    dragRef.current = {
      type: 'autoh',
      base,
      oid: hv.oid,
      spid,
      tau0: ahOpt.tau,
      sx: e.clientX,
      dragged: false,
      moved: o1 !== o0
    };
    if (o1 !== o0) say('Handle Bézier ditambahkan (bentuk tetap) · seret kanan/kiri bila ingin melengkungkan');
  };

  /* Terapkan Auto-Handle ke Objek Terpilih (preserveShape = true menjaga bentuk 100% tetap) */
  const autoSel = (clear, preserveShape = true) => {
    if (!selObjs.length) {
      say('Pilih objek terlebih dahulu');
      return;
    }
    const ids = selNodes.size ? selNodes : null;
    const ok = commitObjs(o => sel.objs.has(o.id) && !o.img ? VE.autoHandles(o, null, {
      tau: ahOpt.tau,
      minAngle: ahOpt.minAng,
      ids,
      clear,
      preserveShape
    }) : o);
    say(ok ? clear ? 'Handle dihapus dari objek terpilih' : preserveShape ? 'Handle Bézier ditambahkan ke objek terpilih (tanpa merubah bentuk)' : 'Kurva dihaluskan dengan Catmull-Rom' : 'Semua segmen pada objek terpilih sudah memiliki handle');
  };

  /* Terapkan Auto-Handle ke SEMUA Objek di Kanvas tanpa mengubah bentuk */
  const autoAll = (clear, preserveShape = true) => {
    if (!docRef.current.objects.length) {
      say('Kanvas masih kosong');
      return;
    }
    const ok = commitObjs(o => !o.img && !o.locked && !o.hidden && !o.isFrameBg && !o.isAutoFrame ? VE.autoHandles(o, null, {
      tau: ahOpt.tau,
      minAngle: ahOpt.minAng,
      clear,
      preserveShape
    }) : o);
    say(ok ? clear ? 'Handle dihapus dari semua objek' : 'Handle Bézier ditambahkan ke semua objek (tanpa merubah bentuk)' : 'Semua objek sudah memiliki handle Bézier');
  };
  /* ---- Figma: rotasi di kanvas, Alt+drag duplikat, Alt+hover redline, shortcut ---- */
  const selBoxNow = () => {
    let b = null;
    docRef.current.objects.forEach(o => {
      if (!selRef.current.objs.has(o.id)) return;
      const t = VE.tightBBox(o);
      if (!isFinite(t[0]) || Math.abs(t[0]) > 1e15 || t[0] > t[2]) return;
      b = b ? [Math.min(b[0], t[0]), Math.min(b[1], t[1]), Math.max(b[2], t[2]), Math.max(b[3], t[3])] : t.slice();
    });
    return b;
  };
  const updateAltMeasure = e => {
    lastPtr.current = {
      clientX: e.clientX,
      clientY: e.clientY
    };
    const pt = toDoc(e.clientX, e.clientY);
    const sb = e.altKey && tool === 'select' ? selBoxNow() : null;
    if (!sb) {
      setAltMeasure(m => m ? null : m);
      return;
    }
    const hov = hitObj(pt);
    if (hov && !selRef.current.objs.has(hov.id)) {
      const tb = VE.tightBBox(hov);
      setAltMeasure({
        targetBox: tb,
        lines: VE.measureDistanceGuides(sb, tb, false)
      });
    } else {
      const [vx, vy, vw, vh] = docRef.current.viewBox;
      setAltMeasure({
        targetBox: null,
        lines: VE.measureDistanceGuides(sb, [vx, vy, vx + vw, vy + vh], true)
      });
    }
  };
  /* Alt + drag objek = duplikat langsung (asli tetap, salinan mengikuti kursor) */
  const cloneWithGroups = (baseObjs, pickIds, offsetDx = 0, offsetDy = 0) => {
    const effIds = new Set(pickIds);
    baseObjs.forEach(o => {
      if (effIds.has(o.id) && (o.isFrameBg || o.isAutoFrame) && o.group) {
        baseObjs.forEach(ch => {
          if (ch.group === o.group) effIds.add(ch.id);
        });
      }
    });
    const picked = baseObjs.filter(o => effIds.has(o.id) && !o.locked);
    const used = new Set(baseObjs.map(o => o.name));
    const uniq = n => {
      let k = n + '-salin',
        i = 2;
      while (used.has(k)) k = n + '-salin-' + i++;
      used.add(k);
      return k;
    };
    const gused = new Set(baseObjs.map(o => o.group).filter(Boolean)),
      gm = new Map();
    const wholeGrps = new Set();
    picked.forEach(o => {
      if (!o.group) return;
      const allMem = baseObjs.filter(q => q.group === o.group);
      if (o.isFrameBg || o.isAutoFrame || allMem.every(q => effIds.has(q.id))) wholeGrps.add(o.group);
    });
    wholeGrps.forEach((g: any) => {
      const isF = /^frame/i.test(g) || baseObjs.some(q => q.group === g && (q.containerType === 'frame' || q.isFrameBg || q.isAutoFrame));
      const prefix = isF ? 'Frame-' : 'grup-';
      let k = 1;
      while (gused.has(prefix + k)) k++;
      gused.add(prefix + k);
      gm.set(g, prefix + k);
    });
    return picked.map(o => {
      const cl = VE.cloneObj(o);
      const moved = offsetDx || offsetDy ? VE.translate(cl, offsetDx, offsetDy) : cl;
      const ng = o.group && gm.has(o.group) ? gm.get(o.group) : o.group;
      let nm;
      if ((o.isFrameBg || o.isAutoFrame) && ng) {
        nm = ng + '-bg';
        used.add(nm);
      } else nm = uniq(o.name);
      return {
        ...moved,
        name: nm,
        group: ng
      };
    });
  };
  const clearFastDragDom = dg => {
    if (boxRef.current) {
      boxRef.current.removeAttribute('data-dragging');
      boxRef.current.removeAttribute('data-dragging-obj');
      boxRef.current.querySelectorAll('[data-drag-hidden-batch]').forEach(el => {
        el.removeAttribute('data-drag-hidden-batch');
        (el as HTMLElement).style.display = '';
      });
    }
    if (sceneRendererRef.current) sceneRendererRef.current.setDragOffset(null, 0, 0);
    if (!dg || !dg.domEls) return;
    for (let i = 0; i < dg.domEls.length; i++) {
      const {
        el,
        baseTf,
        clipGroupEl,
        baseClip
      } = dg.domEls[i];
      if (baseTf) el.setAttribute('transform', baseTf);else el.removeAttribute('transform');
      if (clipGroupEl && baseClip) clipGroupEl.setAttribute('clip-path', baseClip);
    }
  };
  const flushFastObjDrag = dg => {
    if (!dg || !dg.fastTx) return;
    const {
      dx,
      dy
    } = dg.fastTx;
    dg.fastTx = null;
    clearFastDragDom(dg);
    docRef.current = {
      ...dg.base,
      objects: dg.base.objects.map(o => dg.ids.has(o.id) ? VE.translate(o, dx, dy) : o)
    };
  };
  const queryFastDragDomEls = dg => {
    if (!boxRef.current || !dg) return null;
    let partialBatch = false;
    const els = [];
    boxRef.current.querySelectorAll('[data-drag-id]').forEach(el => {
      if (dg.ids.has(el.getAttribute('data-drag-id'))) {
        const p = el.parentElement;
        const pClip = p && p.tagName === 'g' ? p.getAttribute('clip-path') : null;
        const ownClip = el.getAttribute('clip-path');
        els.push({
          el,
          baseTf: el.getAttribute('data-base-tf') || '',
          clipGroupEl: pClip && /^url\(#ved-clip-/.test(pClip) ? p : ownClip ? el : null,
          baseClip: pClip && /^url\(#ved-clip-/.test(pClip) ? pClip : ownClip || ''
        });
      }
    });
    boxRef.current.querySelectorAll('[data-drag-batch]').forEach(el => {
      const p = el.parentElement;
      const pClip = p && p.tagName === 'g' ? p.getAttribute('clip-path') : null;
      const clipGroupEl = pClip && /^url\(#ved-clip-/.test(pClip) ? p : null;
      const baseClip = clipGroupEl ? pClip : '';
      if (dg.allObjsSelected) {
        els.push({
          el,
          baseTf: el.getAttribute('data-base-tf') || '',
          clipGroupEl,
          baseClip
        });
        return;
      }
      const ids = (el.getAttribute('data-drag-batch') || '').split(',').filter(Boolean);
      const hitCount = ids.reduce((c, id) => c + (dg.ids.has(id) ? 1 : 0), 0);
      if (hitCount === ids.length && ids.length > 0) {
        els.push({
          el,
          baseTf: el.getAttribute('data-base-tf') || '',
          clipGroupEl,
          baseClip
        });
      } else if (hitCount > 0) {
        // Sebagian batch yang bergerak: sembunyikan outline batch DOM selama drag
        // agar GPU CanvasKit menangani gerakan objek secara langsung tanpa lag React
        el.setAttribute('data-drag-hidden-batch', '1');
        (el as HTMLElement).style.display = 'none';
      }
    });
    boxRef.current.querySelectorAll('[data-drag-container]').forEach(el => {
      const ids = (el.getAttribute('data-drag-container') || '').split(',').filter(Boolean);
      if (ids.length > 0 && ids.every(id => dg.ids.has(id))) {
        els.push({
          el,
          baseTf: el.getAttribute('data-base-tf') || ''
        });
      }
    });
    boxRef.current.querySelectorAll('[data-drag-extra="1"]').forEach(el => {
      els.push({
        el,
        baseTf: el.getAttribute('data-base-tf') || ''
      });
    });
    boxRef.current.querySelectorAll('[data-drag-nodes="1"]').forEach(el => {
      els.push({
        el,
        baseTf: el.getAttribute('data-base-tf') || ''
      });
    });
    return {
      partialBatch: false,
      els
    };
  };
  const altDupMove = (e, dg, dx, dy, deferRender = false) => {
    if (e.altKey) {
      if (dg.fastTx) {
        dg.fastTx = null;
        clearFastDragDom(dg);
      }
      if (!dg.dupClones) {
        dg.dupClones = cloneWithGroups(dg.base.objects, dg.ids, 0, 0);
        dg.dupIds = new Set(dg.dupClones.map(o => o.id));
      }
      live({
        ...dg.base,
        objects: VE.compactGroups([...dg.base.objects, ...dg.dupClones.map(o => VE.translate(o, dx, dy))])
      });
      if (!dg.selSwitched) {
        dg.selSwitched = true;
        setSel({
          objs: dg.dupIds,
          nodes: new Set()
        });
      }
    } else {
      if (dg.selSwitched) {
        dg.selSwitched = false;
        dg.domEls = null;
        dg.domElsQueried = false;
        setSel({
          objs: dg.ids,
          nodes: new Set()
        });
        live({
          ...dg.base,
          objects: dg.base.objects.map(o => dg.ids.has(o.id) ? VE.translate(o, dx, dy) : o)
        });
        return;
      }
      /* Jika jumlah node yang digeser > 350 (mis. ilustrasi kompleks), sembunyikan overlay ribuan node/handle via CSS
         selama gerakan drag agar browser tidak merasterisasi ulang ribuan path SVG di CPU tiap frame */
      if (dg.hideHeavyOverlay === undefined) {
        dg.hideHeavyOverlay = (dg.dragNodeCount || 0) > 350 || dg.ids.size > 32;
        if (dg.hideHeavyOverlay && boxRef.current) {
          boxRef.current.setAttribute('data-dragging', '1');
        }
      }
      /* Fast GPU/DOM translation selama drag objek: mendukung elemen tunggal [data-drag-id] & batch komposit [data-drag-batch] */
      if (dg.domEls && (!dg.domEls.length || dg.domEls.some(x => !x.el.isConnected))) {
        dg.domEls = null;
        dg.domElsQueried = false;
      }
      if (!dg.domElsQueried && boxRef.current) {
        dg.domElsQueried = true;
        const q = queryFastDragDomEls(dg);
        dg.domEls = q && q.els && q.els.length ? q.els : null;
      }
      dg.fastTx = {
        dx,
        dy
      };
      if (sceneRendererRef.current) {
        sceneRendererRef.current.setDragOffset(dg.ids, dx, dy);
        if (!deferRender) sceneRendererRef.current.requestRender();
      }
      const tr = 'translate(' + VE.rd(dx) + ' ' + VE.rd(dy) + ')';
      if (dg.domEls) {
        for (let i = 0; i < dg.domEls.length; i++) {
          const {
            el,
            baseTf,
            clipGroupEl
          } = dg.domEls[i];
          el.setAttribute('transform', baseTf ? tr + ' ' + baseTf : tr);
          if (clipGroupEl) clipGroupEl.removeAttribute('clip-path');
        }
      }
    }
  };
  React.useLayoutEffect(() => {
    const dg = dragRef.current;
    if (!dg || dg.type !== 'obj' || !dg.moved) return;
    const q = queryFastDragDomEls(dg);
    dg.domEls = q && !q.partialBatch ? q.els : null;
    if (dg.fastTx && dg.domEls) {
      const tr = 'translate(' + VE.rd(dg.fastTx.dx) + ' ' + VE.rd(dg.fastTx.dy) + ')';
      for (let i = 0; i < dg.domEls.length; i++) {
        const {
          el,
          baseTf,
          clipGroupEl
        } = dg.domEls[i];
        el.setAttribute('transform', baseTf ? tr + ' ' + baseTf : tr);
        if (clipGroupEl) clipGroupEl.removeAttribute('clip-path');
      }
    }
  }, [doc, sel.objs]);
  /* Shortcut ala Figma (dikembalikan true jika ditangani) */
  const figmaKeys = e => {
    if (vcSimpRef.current || offStripRef.current) return false;
    if (e.key === 'Alt') {
      if (lastPtr.current) updateAltMeasure({
        altKey: true,
        ...lastPtr.current
      });
      return false;
    }
    const mod = e.ctrlKey || e.metaKey,
      shift = e.shiftKey,
      alt = e.altKey,
      k = e.key.toLowerCase(),
      S = selRef.current.objs,
      hasSel = S.size > 0;
    if (mod && alt && k === 'g') {
      e.preventDefault();
      createFrameSel();
      return true;
    }
    if (!mod && !alt && shift && k === 'a' && hasSel) {
      e.preventDefault();
      const fo = docRef.current.objects.find(o => S.has(o.id) && o.group);
      if (fo) convertFrameToAutoLayout(fo.group);else {
        createFrameSel();
        setTimeout(() => convertFrameToAutoLayout(), 0);
      }
      return true;
    }
    if (mod && shift && k === 'h' && hasSel) {
      e.preventDefault();
      const allHid = docRef.current.objects.filter(o => S.has(o.id)).every(o => o.hidden);
      commitObjs(o => S.has(o.id) ? {
        ...o,
        hidden: !allHid
      } : o);
      say(allHid ? 'Layer ditampilkan' : 'Layer disembunyikan');
      return true;
    }
    if (mod && shift && k === 'l' && hasSel) {
      e.preventDefault();
      const allLock = docRef.current.objects.filter(o => S.has(o.id)).every(o => o.locked);
      commitObjs(o => S.has(o.id) ? {
        ...o,
        locked: !allLock
      } : o);
      say(allLock ? 'Kunci layer dibuka' : 'Layer dikunci');
      return true;
    }
    if (mod && (e.key === ']' || e.key === '[') && hasSel) {
      e.preventDefault();
      const md = e.key === ']' ? 'front' : 'back';
      commit(VE.arrangeZOrder(docRef.current, S, md));
      say(md === 'front' ? 'Dipindah ke paling depan (Bring to Front)' : 'Dipindah ke paling belakang (Send to Back)');
      return true;
    }
    if (!mod && !alt && shift && (k === 'h' || k === 'v') && hasSel) {
      e.preventDefault();
      flipXf(k);
      say(k === 'h' ? 'Flip Horizontal' : 'Flip Vertikal');
      return true;
    }
    if (!mod && alt && !shift && hasSel) {
      const al = {
        w: 'top',
        a: 'left',
        s: 'bottom',
        d: 'right',
        h: 'hcenter',
        v: 'vcenter'
      };
      if (al[k]) {
        e.preventDefault();
        alignDo(al[k]);
        return true;
      }
    }
    if (!mod && !alt && shift && (e.code === 'Digit1' || e.code === 'Digit0')) {
      e.preventDefault();
      fitView();
      return true;
    }
    if (!mod && !alt && shift && e.code === 'Digit2') {
      e.preventDefault();
      fitSel();
      return true;
    }
    if (!mod && !alt && !shift && e.key === 'Enter' && hasSel && tool === 'select') {
      e.preventDefault();
      const text = S.size === 1 ? docRef.current.objects.find(o => S.has(o.id) && isLegacyText(o)) : null;
      if (text) {
        if (!text.locked) setEditingText({id: text.id, isNew: false});
      } else {
        setTool('node');
        say('Mode Edit Node (tekan Esc untuk kembali)');
      }
      return true;
    }
    if (!mod && !alt && !shift && hasSel && /^[0-9]$/.test(e.key) && !(tool === 'pen' && penRef.current)) {
      e.preventDefault();
      const d = parseInt(e.key, 10),
        op = d === 0 ? 1 : d / 10;
      commitObjs(o => S.has(o.id) ? {
        ...o,
        opacity: op
      } : o, 'p:opacity');
      say('Opacity ' + Math.round(op * 100) + '%');
      return true;
    }
    return false;
  };
  /* Native VectorCraft Resize & Rotate (crates/tools/src/bbox.rs & select.rs) */
  const vcBoxDown = (pt, base, e) => {
    const bx0 = activeBoxRef.current;
    if (tool !== 'select' || !bx0 || sel.nodes.size > 0) return false;
    const bh = VE.boxHit(bx0, pt, zoomRef.current);
    if (!bh) return false;
    const dragIds = new Set(sel.objs);
    base.objects.forEach(it => {
      if (sel.objs.has(it.id) && (it.isFrameBg || it.isAutoFrame) && it.group) {
        base.objects.forEach(ch => {
          if (ch.group === it.group && !ch.locked) dragIds.add(ch.id);
        });
      }
    });
    const bx = bx0;
    if (bh.kind === 'handle') {
      dragRef.current = {
        type: 'scale',
        base,
        ids: dragIds,
        bx,
        handle: bh.handle,
        start: pt,
        sx: e ? e.clientX : null,
        sy: e ? e.clientY : null,
        moved: false
      };
      setBoxHov({
        kind: 'handle',
        handle: bh.handle,
        cur: VE.handleCursor(bh.handle, bx.angle)
      });
      setAltMeasure(null);
      return true;
    }
    if (bh.kind === 'rotate') {
      const center = bx.center();
      dragRef.current = {
        type: 'rotate',
        base,
        ids: dragIds,
        bx,
        center,
        start: pt,
        sx: e ? e.clientX : null,
        sy: e ? e.clientY : null,
        moved: false
      };
      setBoxHov({
        kind: 'rotate',
        corner: bh.corner,
        cur: VE.rotateCursorForPt(center, pt)
      });
      setAltMeasure(null);
      return true;
    }
    return false;
  };
  const vcScaleMove = (e, pt, dg) => {
    if (!dg.moved && dg.sx != null && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 3) return;
    if (!dg.moved) {
      dg.moved = true;
      setVcTransforming(true);
    }
    const lp = dg.bx.toLocal(pt);
    let localA = VE.scaleForDrag(dg.bx.rect, dg.handle, lp, e.shiftKey, e.altKey);
    if (snapOn) {
      const rawDocPt = dg.bx.toDocPt(VE.affinePt(localA, dg.handle.pos(dg.bx.rect)));
      /* C11: teruskan bbox objek yang diubah ukurannya agar spacing +
         snap kotak tersedia saat scale (dulu tanpa dragBBox). Dihitung
         sekali per drag dari dokumen pra-drag (dg.base). */
      if (!dg.scaleBB) {
        let bb = null;
        for (const o of dg.base.objects) {
          if (!dg.ids.has(o.id)) continue;
          const b = VE.tightBBox(o);
          if (b[0] <= b[2] && b[1] <= b[3]) bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b.slice();
        }
        dg.scaleBB = bb;
      }
      const q = snapAt(rawDocPt, e, dg.ids, null, dg.base.objects, { allowSpacing: true, dragBBox: dg.scaleBB });
      if (Math.abs(q.x - rawDocPt.x) > 1e-6 || Math.abs(q.y - rawDocPt.y) > 1e-6) {
        localA = VE.scaleForDrag(dg.bx.rect, dg.handle, dg.bx.toLocal(q), e.shiftKey, e.altKey);
      }
    } else {
      setSnapInd(null);
    }
    const docM = dg.bx.conjugate(localA);
    // G5: injeksikan lebar terukur agar drag handle teks autoWidth memakai
    // lebar layout CanvasKit (bukan heuristik len*fontSize*0.65 di
    // transformObject). Hanya saat tepat satu objek teks autoWidth di-scale;
    // multi-seleksi / bukan teks / autoHeight / fixed -> null (heuristik).
    // measuredTextBounds mengembalikan ARRAY [x0,y0,x1,y1].
    let measuredW = null;
    if (dg.ids.size === 1) {
      const only = dg.base.objects.find(o => o.id === [...dg.ids][0]);
      if (only && isLegacyText(only) && only.text && only.text.resizing === 'autoWidth') {
        const mb = measuredTextBounds(only);
        if (mb && isFinite(mb[0]) && isFinite(mb[2]) && mb[2] > mb[0]) measuredW = mb[2] - mb[0];
      }
    }
    live({
      ...dg.base,
      objects: dg.base.objects.map(o => dg.ids.has(o.id) && !o.locked ? VE.transformObject(o, docM, scaleStk, measuredW) : o)
    });
    const nr = VE.transformRectBbox(localA, dg.bx.rect);
    const w = Math.abs(nr.x1 - nr.x0),
      h = Math.abs(nr.y1 - nr.y0);
    setMeasureBadge({
      x: pt.x,
      y: pt.y,
      text: 'W: ' + VE.rd(w) + '  H: ' + VE.rd(h)
    });
  };
  const vcRotateMove = (e, pt, dg) => {
    if (!dg.moved && dg.sx != null && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 3) return;
    if (!dg.moved) {
      dg.moved = true;
      setVcTransforming(true);
    }
    const {
      matrix,
      deg
    } = VE.rotateForDrag(dg.center, dg.start, pt, e.shiftKey);
    live({
      ...dg.base,
      objects: dg.base.objects.map(o => dg.ids.has(o.id) && !o.locked ? VE.transformObject(o, matrix, false) : o)
    });
    const c = VE.rotateCursorForPt(dg.center, pt);
    setBoxHov(prev => !prev || prev.cur !== c ? {
      kind: 'rotate',
      cur: c
    } : prev);
    const dispDeg = Math.round(-deg * 10) / 10;
    setMeasureBadge({
      x: pt.x,
      y: pt.y,
      text: dispDeg.toFixed(1) + '°'
    });
  };
  const onPointerDown = e => {
    DEBUG_LOG.log('pointer', 'pointer-down:' + tool, 'onPointerDown', 'src/components/editor/VectorEditor.tsx', 'button=' + e.button + ' x=' + Math.round(e.clientX) + ' y=' + Math.round(e.clientY));
    lastPointerTypeRef.current = e.pointerType || 'mouse';
    if (boxRef.current) boxRectRef.current = boxRef.current.getBoundingClientRect();
    if (e.pointerType === 'touch') {
      activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouchPointersRef.current.size === 1) {
        multiTapRef.current = {
          maxFingers: 1,
          startTime: performance.now(),
          origins: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
          moved: false,
        };
      } else if (multiTapRef.current) {
        multiTapRef.current.origins.set(e.pointerId, { x: e.clientX, y: e.clientY });
        multiTapRef.current.maxFingers = Math.max(
          multiTapRef.current.maxFingers,
          activeTouchPointersRef.current.size
        );
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = 0;
      }
      if (activeTouchPointersRef.current.size >= 2) {
        if (objDragRafRef.current) {
          cancelAnimationFrame(objDragRafRef.current);
          objDragRafRef.current = 0;
        }
        objDragPendingRef.current = null;
        dragRef.current = null;
        setMarq(null);
        setPanning(false);
        setAddHov(null);
        setHhHov(null);
        setDropFrameId(null);
        setMeasureBadge(null);
        const pts = Array.from(activeTouchPointersRef.current.values());
        const p1 = pts[0], p2 = pts[1];
        const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        pinchStateRef.current = {
          dist,
          midX: (p1.x + p2.x) * 0.5,
          midY: (p1.y + p2.y) * 0.5,
          startZoom: zoomRef.current,
          startPan: { x: panRef.current.x, y: panRef.current.y },
        };
        try {
          boxRef.current?.setPointerCapture(e.pointerId);
        } catch (x) {}
        return;
      }
      const lpX = e.clientX, lpY = e.clientY, lpTarget = e.target, lpPid = e.pointerId;
      longPressOriginRef.current = { pointerId: lpPid, x: lpX, y: lpY, target: lpTarget };
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = 0;
        if (pinchStateRef.current || activeTouchPointersRef.current.size !== 1) return;
        const dgCur = dragRef.current;
        if (dgCur && dgCur.moved) return;
        dragRef.current = null;
        setMarq(null);
        setPanning(false);
        triggerHaptic('medium');
        onCtx({
          preventDefault() {},
          clientX: lpX,
          clientY: lpY,
          target: lpTarget,
        });
      }, 550);
    }
    if (e.button === 1 || e.button === 0 && (tool === 'hand' || spaceRef.current)) {
      e.preventDefault();
      e.stopPropagation();
      if (viewSettleTimer.current) {
        clearTimeout(viewSettleTimer.current);
        viewSettleTimer.current = 0;
      }
      document.body.classList.add('grabbing');
      dragRef.current = {
        type: 'pan',
        button: e.button,
        pointerId: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        lx: e.clientX,
        ly: e.clientY,
        px: panRef.current.x,
        py: panRef.current.y,
        moved: false
      };
      try {
        boxRef.current.setPointerCapture(e.pointerId);
      } catch (x) {}
      return;
    }
    if (viewPend.current || viewSettleTimer.current) flushView();
    if (e.button !== 0) return;
    if (vcSimpRef.current && vcSimpRef.current.mode === 'slider') confirmVcSimplify();
    try {
      boxRef.current.setPointerCapture(e.pointerId);
    } catch (x) {}
    const pt = toDoc(e.clientX, e.clientY),
      add = e.shiftKey || e.ctrlKey || e.metaKey || multiSelectActiveRef.current,
      base = docRef.current;
    if (tool === 'text') {
      e.preventDefault();
      const p0 = snapAt(pt, e, null, null, base.objects);
      const hit = hitObj(pt);
      dragRef.current = {
        type: 'text',
        base,
        start: {x: p0.x, y: p0.y},
        cur: {x: p0.x, y: p0.y},
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
        hitTextId: hit && hit.type === 'text' ? hit.id : null,
        hitPt: {x: pt.x, y: pt.y}
      };
      return;
    }
    if (tool === 'addnode') {
      const h = computeAdd({
          x: e.clientX,
          y: e.clientY,
          alt: e.altKey || e.ctrlKey || e.metaKey
        }),
        o0 = h && base.objects.find(q => q.id === h.oid);
      if (!o0) return;
      const nn = VE.insertNode(o0, h.spid, h.i, h.t),
        old = o0.subs.find(q => q.id === h.spid),
        sp2 = nn.subs.find(q => q.id === h.spid),
        added = sp2.nodes.find(n => !old.nodes.some(m => m.id === n.id));
      const nd = {
        ...base,
        objects: base.objects.map(q => q.id === o0.id ? nn : q)
      };
      commit(nd);
      if (added) {
        setSel({
          objs: new Set([o0.id]),
          nodes: new Set([added.id])
        });
        dragRef.current = {
          type: 'node',
          base: nd,
          ids: new Set([added.id]),
          anchor: {
            x: added.x,
            y: added.y
          },
          start: pt,
          sx: e.clientX,
          sy: e.clientY,
          moved: false
        };
      }
      return;
    }
    if (tool === 'addhandle') {
      const hv = hoverNodeAt({
        x: e.clientX,
        y: e.clientY
      });
      if (!hv) return;
      setSel({
        objs: new Set([hv.oid]),
        nodes: new Set([hv.nid])
      });
      if (!hv.can) {
        say('Node ini sudah punya handle');
        return;
      }
      const nd = {
        ...base,
        objects: base.objects.map(q => q.id !== hv.oid ? q : {
          ...q,
          subs: q.subs.map(sp => sp.id !== hv.spid ? sp : {
            ...sp,
            nodes: sp.nodes.map(n => n.id !== hv.nid ? n : {
              ...n,
              fil: null,
              handleIn: hv.prev.in || n.handleIn,
              handleOut: hv.prev.out || n.handleOut,
              type: n.type === 'symmetric' ? 'symmetric' : 'smooth'
            })
          })
        })
      };
      commit(nd);
      const hp = hv.prev.out || hv.prev.in;
      dragRef.current = {
        type: 'handle',
        base: nd,
        objId: hv.oid,
        nodeId: hv.nid,
        w: hv.prev.out ? 'out' : 'in',
        initH: {
          x: hp.x,
          y: hp.y
        },
        off: {
          x: hp.x - pt.x,
          y: hp.y - pt.y
        },
        sx: e.clientX,
        sy: e.clientY,
        moved: false
      };
      return;
    }
    if (tool === 'pen') {
      penDown(e, pt, base);
      return;
    }
    if (tool === 'autohandle') {
      ahDown(e, base);
      return;
    }
    if (tool === 'shape') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      dragRef.current = {
        type: 'shape',
        base,
        start: {
          x: p0.x,
          y: p0.y
        },
        sx: e.clientX,
        sy: e.clientY,
        id: 'n' + Math.random().toString(36).slice(2, 9),
        moved: false
      };
      return;
    }
    if (tool === 'pencil' || tool === 'brush') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      dragRef.current = {
        type: 'freehand',
        toolMode: tool,
        base,
        straightShift: e.shiftKey && tool === 'pencil',
        points: [{ x: p0.x, y: p0.y, pressure: e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5, time: Date.now() }],
        id: VE.uid(),
        name: nextFreehandName(tool),
        moved: false,
        sx: e.clientX,
        sy: e.clientY
      };
      return;
    }
    if (tool === 'blob') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      dragRef.current = {
        type: 'blob',
        base,
        start: {
          x: p0.x,
          y: p0.y
        },
        sx: e.clientX,
        sy: e.clientY,
        id: VE.uid(),
        name: nextBlobName(),
        moved: false
      };
      return;
    }
    if (tool === 'weave') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      dragRef.current = {
        type: 'weave',
        base,
        start: {
          x: p0.x,
          y: p0.y
        },
        sx: e.clientX,
        sy: e.clientY,
        groupId: nextWeaveGroupId(),
        moved: false
      };
      return;
    }
    if (tool === 'line') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      dragRef.current = {
        type: 'line',
        base,
        start: {
          x: p0.x,
          y: p0.y
        },
        sx: e.clientX,
        sy: e.clientY,
        id: VE.uid(),
        name: nextLineName(),
        moved: false
      };
      return;
    }
    /* Arc (Task 5): klik = pusat busur; seret = radius + sweep dari 0°.
       Nama dihitung sekali di sini (pelajaran Task 4). */
    if (tool === 'arc') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      const a3 = arc3Ref.current;
      if (a3 && a3.end) {
        /* Tahap 2 (titik ke-3 Three-Point Arc): tentukan lengkungan busur */
        dragRef.current = {
          type: 'arc',
          stage: 'third',
          sx: e.clientX,
          sy: e.clientY,
          moved: true
        };
        return;
      }
      if (a3 && !a3.end) {
        /* Klik ke-2: tetapkan titik akhir (end) busur */
        a3.end = e.shiftKey ? constrainPoint45(a3.start, p0) : { x: p0.x, y: p0.y };
        dragRef.current = {
          type: 'arc',
          stage: 'endpoints',
          base: a3.base,
          center: a3.start,
          endPt: a3.end,
          sx: e.clientX,
          sy: e.clientY,
          id: a3.id,
          name: a3.name,
          moved: true
        };
        return;
      }
      arc3Ref.current = {
        start: { x: p0.x, y: p0.y },
        end: null,
        id: VE.uid(),
        name: nextArcName(),
        base
      };
      dragRef.current = {
        type: 'arc',
        stage: 'endpoints',
        base,
        center: { x: p0.x, y: p0.y },
        sx: e.clientX,
        sy: e.clientY,
        id: arc3Ref.current.id,
        name: arc3Ref.current.name,
        moved: false
      };
      return;
    }
    /* Shape Builder (VectorCraft): bekerja pada >= 1 objek terseleksi;
       mendukung klik tunggal region maupun seret lintas bentuk; Alt = hapus. */
    if (tool === 'shapebuilder') {
      const eligibleIds = new Set(
        (base.objects || [])
          .filter(o => selRef.current.objs.has(o.id) && !o.locked && !o.hidden && !o.img && !o.text && o.subs && o.subs.length > 0)
          .map(o => o.id)
      );
      if (eligibleIds.size < 1) {
        say(L.edShapeBuilderNeed2 || 'Pilih minimal 1 bentuk untuk Shape Builder');
        return;
      }
      dragRef.current = {
        type: 'shapebuilder',
        base,
        stroke: [{ x: pt.x, y: pt.y }],
        alt: e.altKey,
        shift: e.shiftKey,
        selIds: eligibleIds,
        strokeId: VE.uid(),
        sx: e.clientX,
        sy: e.clientY,
        moved: false
      };
      return;
    }
    /* Curvature (Task 6): klik menaruh titik (smooth default). Klik titik
       yang ada = potensi seret / toggle smooth-corner; klik titik pertama
       (>= 3 titik) = tutup path; klik segmen = potensi seret segmen.
       HANYA gambar baru (Q4 A): klik pada path lama tidak masuk mode
       edit — selalu mulai path baru. Titik ditambahkan di pointerdown
       (pola Pen) agar drag bisa langsung menggeser titik yang baru
       ditaruh. */
    if (tool === 'curvature') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      let s = curvatureRef.current;
      const tol = 8 / zoomRef.current;
      let noToggle = false;
      if (s) {
        /* Batalkan toggle yang tertunda bila klik kedua mendarat di titik
           yang sama (double-click untuk selesai, bukan toggle). */
        if (s.toggleTimer && s.togglePid) {
          const tp = s.pts.find(q => q.id === s.togglePid);
          if (tp && VE.dist(pt, tp) < tol) {
            clearTimeout(s.toggleTimer);
            s.toggleTimer = null;
            s.togglePid = null;
            noToggle = true;
          }
        }
        /* Klik titik pertama (>= 3 titik, belum tertutup) = tutup path.
           Menutup HANYA mengubah state (belum commit); selesai tetap via
           double-click / Enter / Esc — sesuai alur probe Step 5. */
        if (!s.closed && s.pts.length >= 3 && VE.dist(pt, s.pts[0]) < tol) {
          s.closed = true;
          rebuildCurvaturePreview();
          say('Path tertutup');
          dragRef.current = {
            type: 'curvature',
            mode: 'closed-click',
            sx: e.clientX,
            sy: e.clientY,
            moved: false
          };
          return;
        }
        /* Klik titik yang ada = potensi seret / toggle. */
        let hitIdx = -1;
        for (let i = 0; i < s.pts.length; i++) {
          if (VE.dist(pt, s.pts[i]) < tol) {
            hitIdx = i;
            break;
          }
        }
        if (hitIdx >= 0) {
          dragRef.current = {
            type: 'curvature',
            mode: 'point',
            idx: hitIdx,
            noToggle,
            /* Klik titik pertama dengan < 3 titik = percobaan tutup yang
               ditolak (Review Focus 4): bukan toggle — path tetap terbuka.
               Seret tetap jalan (menggeser titik). */
            refusedClose: hitIdx === 0 && s.pts.length < 3 && !s.closed,
            sx: e.clientX,
            sy: e.clientY,
            moved: false,
            base: s.base
          };
          return;
        }
        /* Klik segmen = potensi seret segmen (sisip + geser) / klik = sisip titik. */
        const segHit = curvatureSegHit(s, pt, tol);
        if (segHit) {
          dragRef.current = {
            type: 'curvature',
            mode: 'segment',
            seg: segHit.seg,
            insIdx: segHit.insIdx,
            at: segHit.at,
            noToggle,
            sx: e.clientX,
            sy: e.clientY,
            moved: false,
            base: s.base
          };
          return;
        }
        /* Klik di ruang kosong (path belum tertutup) = taruh titik baru.
           VectorCraft Curvature: Alt+klik = titik corner. */
        if (!s.closed) {
          const nid = VE.uid();
          s.pts.push({
            id: nid,
            x: p0.x,
            y: p0.y,
            type: e.altKey ? 'corner' : 'smooth'
          });
          rebuildCurvaturePreview();
          setSel({
            objs: new Set([s.oid]),
            nodes: new Set([nid])
          });
          dragRef.current = {
            type: 'curvature',
            mode: 'point',
            idx: s.pts.length - 1,
            added: true,
            noToggle,
            sx: e.clientX,
            sy: e.clientY,
            moved: false,
            base: s.base
          };
          return;
        }
        /* Path sudah tertutup: klik di ruang kosong tidak menambah titik. */
        dragRef.current = {
          type: 'curvature',
          mode: 'closed-click',
          sx: e.clientX,
          sy: e.clientY,
          moved: false
        };
        return;
      }
      /* Titik pertama: buat state in-progress (nama dihitung SEKALI di
         sini, pelajaran Task 4). */
      const oid = VE.uid(),
        spid = VE.uid(),
        nid = VE.uid();
      s = {
        oid,
        spid,
        name: nextCurvatureName(),
        pts: [{
          id: nid,
          x: p0.x,
          y: p0.y,
          type: e.altKey ? 'corner' : 'smooth'
        }],
        closed: false,
        base,
        obj: null,
        toggleTimer: null,
        togglePid: null
      };
      curvatureRef.current = s;
      rebuildCurvaturePreview();
      setSel({
        objs: new Set([oid]),
        nodes: new Set([nid])
      });
      dragRef.current = {
        type: 'curvature',
        mode: 'point',
        idx: 0,
        added: true,
        noToggle,
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
        base
      };
      return;
    }
    if (tool === 'frame') {
      const p0 = snapAt(pt, e, null, null, base.objects);
      dragRef.current = {
        type: 'frame',
        base,
        start: {
          x: p0.x,
          y: p0.y
        },
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
        rect: null
      };
      return;
    }
    if (vcBoxDown(pt, base, e)) return;
    if (imgSel) {
      const ns = imgSel.subs[0].nodes,
        tol = 9 / zoomRef.current;
      for (let i = 0; i < 4; i++) if (VE.dist(pt, ns[i]) < tol) {
        const A = ns[(i + 2) % 4];
        dragRef.current = {
          type: 'imgscale',
          base,
          objId: imgSel.id,
          ax: A.x,
          ay: A.y,
          cx0: ns[i].x - A.x,
          cy0: ns[i].y - A.y,
          sx: e.clientX,
          sy: e.clientY,
          moved: false
        };
        return;
      }
    }
    /* Di mode Pilih (select), jangan intersep klik dengan pickNode agar klik & geser pada objek terpilih
       (termasuk ilustrasi dengan ribuan node) selalu menggeser posisi objek, bukan menarik 1 node/handle! */
    const hit = tool === 'node' || tool === 'corner' ? pickNode(pt) : null;
    if (hit && hit.kind === 'handle') {
      const hkey = hit.n.id + ':' + hit.w,
        sameObj = sel.objs.size === 1 && sel.objs.has(hit.o.id);
      let hs = new Set(sameObj ? selHandles : []);
      if (add) {
        hs.has(hkey) ? hs.delete(hkey) : hs.add(hkey);
      } /* Shift/Ctrl+klik handle = tambah/lepas dari seleksi handle */else if (!hs.has(hkey)) hs = new Set([hkey]);
      const hn = new Set([...hs].map((k: any) => k.slice(0, k.lastIndexOf(':'))));
      setSel({
        objs: new Set([hit.o.id]),
        nodes: hn.size ? hn : new Set([hit.n.id]),
        handles: hs
      });
      if (add) {
        dragRef.current = null;
        return;
      }
      dragRef.current = {
        type: 'handle',
        base,
        objId: hit.o.id,
        nodeId: hit.n.id,
        w: hit.w,
        initH: {
          x: hit.h.x,
          y: hit.h.y
        },
        off: {
          x: hit.h.x - pt.x,
          y: hit.h.y - pt.y
        },
        sx: e.clientX,
        sy: e.clientY,
        moved: false
      };
      return;
    }
    if (hit && hit.kind === 'node') {
      let nodes = new Set(selNodes),
        objs = new Set(sel.objs),
        id = hit.n.id;
      if (add) {
        nodes.has(id) ? nodes.delete(id) : nodes.add(id);
        objs.add(hit.o.id);
      } else if (!nodes.has(id)) {
        nodes = new Set([id]);
        objs = new Set([hit.o.id]);
      }
      const sameSel = objs.size === sel.objs.size && nodes.size === sel.nodes.size && [...objs].every(k => sel.objs.has(k)) && [...nodes].every(k => sel.nodes.has(k));
      if (!sameSel) setSel({
        objs,
        nodes
      });
      if (!nodes.has(id)) {
        dragRef.current = null;
        return;
      }
      /* Jika seluruh node pada objek terpilih ikut dipilih (mis. Ctrl+A di mode Node), gunakan fast object drag */
      const allObjNodesSelected = objs.size > 0 && base.objects.every(q => !objs.has(q.id) || q.subs.every(sp => sp.nodes.every(nd => nodes.has(nd.id))));
      if (allObjNodesSelected) {
        dragRef.current = {
          type: 'obj',
          base,
          ids: objs,
          anchor: P2(hit.n),
          start: pt,
          sx: e.clientX,
          sy: e.clientY,
          moved: false,
          emptyBoxHit: false
        };
      } else {
        dragRef.current = {
          type: 'node',
          base,
          ids: nodes,
          anchor: P2(hit.n),
          start: pt,
          sx: e.clientX,
          sy: e.clientY,
          moved: false
        };
      }
      return;
    }
    const unlockedCount = base.objects.reduce((c, q) => c + (!q.hidden && !q.locked ? 1 : 0), 0);
    let o = hitObj(pt),
      emptyBoxHit = false;
    if (o) {
      let objs;
      if (add) {
        objs = new Set(sel.objs);
        objs.has(o.id) ? objs.delete(o.id) : objs.add(o.id);
      } else objs = sel.objs.has(o.id) ? sel.objs : new Set([o.id]);
      const nextNodes = !add && sel.objs.has(o.id) ? selNodes : new Set();
      const sameSel = objs === sel.objs && nextNodes.size === sel.nodes.size;
      if (!emptyBoxHit && !sameSel) setSel({
        objs: new Set(objs),
        nodes: nextNodes
      });
      if (!objs.has(o.id)) {
        dragRef.current = null;
        return;
      }
      /* klik latar Frame → seluruh isi Frame ikut bergeser (parent-child coupled drag) */
      const dragIds = new Set(objs);
      base.objects.forEach(it => {
        if (objs.has(it.id) && (it.isFrameBg || it.isAutoFrame) && it.group) base.objects.forEach(ch => {
          if (ch.group === it.group) dragIds.add(ch.id);
        });
      });
      dragRef.current = {
        type: 'obj',
        base,
        ids: dragIds,
        anchor: {
          x: pt.x,
          y: pt.y
        },
        start: pt,
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
        emptyBoxHit,
        allObjsSelected: dragIds.size >= unlockedCount
      };
      return;
    }
    const isNodeTool = tool === 'node' || tool === 'corner';
    const nodeTargets = isNodeTool ? shown.length ? shown.slice() : base.objects.filter(o => !o.hidden && !o.locked && !o.img && !o.isFrameBg && !o.isAutoFrame) : null;
    dragRef.current = {
      type: 'marquee',
      start: pt,
      cur: pt,
      add,
      sx: e.clientX,
      sy: e.clientY,
      prev: sel,
      nodeTargets
    };
    if (!add) {
      if (isNodeTool && shown.length) setSel({
        objs: new Set(shown.map(o => o.id)),
        nodes: new Set()
      });else setSel({
        objs: new Set(),
        nodes: new Set()
      });
    }
  };
  const P2 = n => ({
    x: n.x,
    y: n.y
  });
  const onPointerMove = e => {
    if (e.pointerType) lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === 'touch' && activeTouchPointersRef.current.has(e.pointerId)) {
      activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (multiTapRef.current && !multiTapRef.current.moved) {
        const orig = multiTapRef.current.origins.get(e.pointerId);
        if (orig && Math.hypot(e.clientX - orig.x, e.clientY - orig.y) > 14) {
          multiTapRef.current.moved = true;
        }
      }
      if (longPressTimerRef.current && longPressOriginRef.current && longPressOriginRef.current.pointerId === e.pointerId) {
        if (Math.hypot(e.clientX - longPressOriginRef.current.x, e.clientY - longPressOriginRef.current.y) > 10) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = 0;
        }
      }
      if (pinchStateRef.current && activeTouchPointersRef.current.size >= 2) {
        const pts = Array.from(activeTouchPointersRef.current.values());
        const p1 = pts[0], p2 = pts[1];
        const d1 = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        const mx1 = (p1.x + p2.x) * 0.5;
        const my1 = (p1.y + p2.y) * 0.5;
        const ps = pinchStateRef.current;
        const nz = clampN(ps.startZoom * (d1 / Math.max(10, ps.dist)), VZMIN, VZMAX);
        const b = boxRef.current;
        if (b) {
          const r = boxRectRef.current && boxRectRef.current.width > 0 ? boxRectRef.current : (boxRectRef.current = b.getBoundingClientRect());
          const wx = (ps.midX - r.left - ps.startPan.x) / ps.startZoom;
          const wy = (ps.midY - r.top - ps.startPan.y) / ps.startZoom;
          zoomRef.current = nz;
          panRef.current = {
            x: (mx1 - r.left) - wx * nz,
            y: (my1 - r.top) - wy * nz,
          };
          softView();
        }
        return;
      }
    }
    /* GV-A18 & Bab 6: Gunakan sampel terbaru dari getCoalescedEvents() untuk responsivitas drag 120Hz+ tanpa antrean event basi */
    const dg = dragRef.current;
    let ev = e;
    if (dg && typeof e.getCoalescedEvents === 'function') {
      const coal = e.getCoalescedEvents();
      if (coal && coal.length > 0) ev = coal[coal.length - 1];
    }
    if (dg && dg.type === 'pan') {
      const dx = ev.clientX - dg.lx,
        dy = ev.clientY - dg.ly;
      dg.lx = ev.clientX;
      dg.ly = ev.clientY;
      if (dx === 0 && dy === 0) return;
      if (!dg.moved) {
        dg.moved = true;
        sceneRendererRef.current?.setCameraInteracting(true);
        if (boxRef.current) {
          boxRef.current.setAttribute('data-fast-render', '1');
          const selCnt = selRef.current ? selRef.current.objs.size : 0;
          if ((selCnt > 0 || shown.length > 0) && !boxRef.current.hasAttribute('data-zooming')) {
            boxRef.current.setAttribute('data-zooming', '1');
          }
        }
      }
      panRef.current = {
        x: dg.px + (ev.clientX - dg.sx),
        y: dg.py + (ev.clientY - dg.sy)
      };
      if (!viewPend.current) {
        viewPend.current = requestAnimationFrame(() => {
          viewPend.current = 0;
          applyVP(true, true);
        });
      }
      return;
    }
    if (dg && dg.type === 'obj') {
      if (!dg.moved) {
        const distPx = dg.sx != null ? Math.hypot(ev.clientX - dg.sx, ev.clientY - dg.sy) : 99;
        if (distPx < 5) return;
      }
      objDragPendingRef.current = {
        clientX: ev.clientX,
        clientY: ev.clientY,
        shiftKey: !!e.shiftKey,
        altKey: !!e.altKey,
        ctrlKey: !!e.ctrlKey,
        metaKey: !!e.metaKey
      };
      if (!objDragRafRef.current) {
        objDragRafRef.current = requestAnimationFrame(() => {
          objDragRafRef.current = 0;
          const pEv = objDragPendingRef.current;
          objDragPendingRef.current = null;
          const curDg = dragRef.current;
          if (!pEv || !curDg || curDg.type !== 'obj') return;
          const pPt = boxRef.current ? toDoc(pEv.clientX, pEv.clientY) : { x: 0, y: 0 };
          if (coordRef.current) coordRef.current.textContent = 'X ' + Math.round(pPt.x * 10) / 10 + '  Y ' + Math.round(pPt.y * 10) / 10;
          runObjOrNodeDrag(pEv, pPt, curDg, true);
          if (curDg.fastTx && sceneRendererRef.current) sceneRendererRef.current.renderFrame();
        });
      }
      return;
    }
    const pt = boxRef.current ? toDoc(ev.clientX, ev.clientY) : {
      x: 0,
      y: 0
    };
    if (coordRef.current) coordRef.current.textContent = 'X ' + Math.round(pt.x * 10) / 10 + '  Y ' + Math.round(pt.y * 10) / 10;
    if (!dg) {
      if (tool === 'addnode' || tool === 'addhandle' || tool === 'autohandle') updateAddHover(e);else if (tool === 'pen') updatePenHover(e);
      if (tool === 'select' && activeBoxRef.current) {
        const bh = VE.boxHit(activeBoxRef.current, pt, zoomRef.current);
        if (bh && bh.kind === 'handle') {
          const c = VE.handleCursor(bh.handle, activeBoxRef.current.angle);
          setBoxHov(prev => prev && prev.kind === 'handle' && prev.handle.idx === bh.handle.idx && prev.cur === c ? prev : {
            kind: 'handle',
            handle: bh.handle,
            cur: c
          });
        } else if (bh && bh.kind === 'rotate') {
          const c = VE.rotateCursorForPt(activeBoxRef.current.center(), pt);
          setBoxHov(prev => prev && prev.kind === 'rotate' && prev.cur === c ? prev : {
            kind: 'rotate',
            corner: bh.corner,
            cur: c
          });
        } else {
          setBoxHov(prev => prev ? null : prev);
        }
      } else {
        setBoxHov(prev => prev ? null : prev);
      }
      updateAltMeasure(e);
      return;
    }
    if (dg.type === 'rotate') {
      sceneRendererRef.current?.setSceneInteracting?.(true);
      vcRotateMove(e, pt, dg);
      return;
    }
    if (dg.type === 'scale') {
      sceneRendererRef.current?.setSceneInteracting?.(true);
      vcScaleMove(e, pt, dg);
      return;
    }
    if (dg.type === 'text') {
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 6) return;
      dg.moved = true;
      dg.cur = pt;
      setMarq({
        x0: Math.min(dg.start.x, pt.x),
        y0: Math.min(dg.start.y, pt.y),
        x1: Math.max(dg.start.x, pt.x),
        y1: Math.max(dg.start.y, pt.y)
      });
      return;
    }
    if (dg.type === 'marquee') {
      dg.cur = pt;
      setMarq({
        x0: Math.min(dg.start.x, pt.x),
        y0: Math.min(dg.start.y, pt.y),
        x1: Math.max(dg.start.x, pt.x),
        y1: Math.max(dg.start.y, pt.y)
      });
      return;
    }
    if (dg.type === 'pen') {
      penMove(e, pt, dg);
      return;
    }
    if (dg.type === 'autoh') {
      const dxs = e.clientX - dg.sx;
      if (!dg.dragged && Math.abs(dxs) < 3) return;
      dg.dragged = true;
      dg.moved = true;
      const tau = clampN(dg.tau0 + dxs / 400, 0, 0.5);
      setAhOpt(o => ({
        ...o,
        tau: Math.round(tau * 100) / 100
      })); /* seret kanan/kiri = tension live */
      live({
        ...dg.base,
        objects: dg.base.objects.map(o => o.id === dg.oid ? VE.autoHandles(o, dg.spid, {
          tau,
          minAngle: ahOpt.minAng,
          preserveShape: false
        }) : o)
      });
      return;
    }
    if (dg.type === 'shape') {
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      const r0 = shapeRect(dg.start, pt, e.shiftKey);
      const q = snapAt(pt, e, null, null, dg.base.objects, {
        allowSpacing: true,
        dragBBox: [r0.x, r0.y, r0.x + r0.w, r0.y + r0.h]
      });
      const r = shapeRect(dg.start, q, e.shiftKey),
        o = makeShape(shapeKind, r.x, r.y, r.w, r.h, dg.id);
      dg.moved = true;
      if (o) live({
        ...dg.base,
        objects: [...dg.base.objects, o]
      });
      return;
    }
    if (dg.type === 'freehand') {
      if (dg.straightShift) {
        const p0 = dg.points[0];
        const q = constrainPoint45(p0, pt);
        dg.points = [p0, { x: q.x, y: q.y, pressure: 0.5, time: Date.now() }];
        dg.moved = Math.hypot(q.x - p0.x, q.y - p0.y) >= 2;
      } else {
        const lastPt = dg.points[dg.points.length - 1];
        const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
        if (dist >= 2.0 || !dg.moved) {
          dg.points.push({
            x: pt.x,
            y: pt.y,
            pressure: e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5,
            time: Date.now()
          });
          dg.moved = true;
        }
      }
      if (dg.points.length >= 2) {
        const previewObj = dg.toolMode === 'brush'
          ? VE.createBrushObject(
              dg.points,
              {
                fill: (shapeSty.fill && shapeSty.fill !== 'none') ? shapeSty.fill : (shapeSty.stroke && shapeSty.stroke !== 'none' ? shapeSty.stroke : '#000000'),
                stroke: 'none',
                strokeWidth: 0,
                opacity: 1
              },
              {
                id: dg.id,
                name: dg.name,
                tolerance: 1.5,
                baseWidth: 8,
                minWidth: 2,
                maxWidth: 24,
                taper: true
              }
            )
          : VE.createPencilObject(
              dg.points,
              {
                stroke: (shapeSty.sw > 0 && shapeSty.stroke && shapeSty.stroke !== 'none') ? shapeSty.stroke : (shapeSty.fill && shapeSty.fill !== 'none' ? shapeSty.fill : '#000000'),
                strokeWidth: shapeSty.sw > 0 ? shapeSty.sw : 2,
                opacity: 1
              },
              {
                id: dg.id,
                name: dg.name,
                tolerance: 1.5,
                minDistance: 2.0,
                smooth: true
              }
            );
        if (previewObj) {
          live({
            ...dg.base,
            objects: [...dg.base.objects, previewObj]
          });
        }
      }
      return;
    }
    if (dg.type === 'blob') {
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      const r0 = shapeRect(dg.start, pt, e.shiftKey);
      const q = snapAt(pt, e, null, null, dg.base.objects, {
        allowSpacing: true,
        dragBBox: [r0.x, r0.y, r0.x + r0.w, r0.y + r0.h]
      });
      const r = shapeRect(dg.start, q, e.shiftKey),
        o = makeBlob(r.x, r.y, r.w, r.h, dg.id, dg.name);
      dg.moved = true;
      if (o) live({
        ...dg.base,
        objects: [...dg.base.objects, o]
      });
      return;
    }
    if (dg.type === 'weave') {
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      const r0 = shapeRect(dg.start, pt, e.shiftKey);
      const q = snapAt(pt, e, null, null, dg.base.objects, {
        allowSpacing: true,
        dragBBox: [r0.x, r0.y, r0.x + r0.w, r0.y + r0.h]
      });
      const r = shapeRect(dg.start, q, e.shiftKey),
        strips = makeWeave(r.x, r.y, r.w, r.h, dg.groupId);
      dg.moved = true;
      if (strips.length) live({
        ...dg.base,
        objects: [...dg.base.objects, ...strips]
      });
      return;
    }
    if (dg.type === 'line') {
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      if (spaceRef.current) {
        const prev = dg.lastPt || pt;
        dg.start = { x: dg.start.x + (pt.x - prev.x), y: dg.start.y + (pt.y - prev.y) };
      }
      dg.lastPt = { x: pt.x, y: pt.y };
      const q = snapAt(pt, e, null, null, dg.base.objects),
        opts = {
          constrain45: e.shiftKey,
          fromCenter: e.altKey
        },
        o = makeLine(dg.start, q, opts, dg.id, dg.name);
      dg.moved = true;
      if (o) {
        const n0 = o.subs[0].nodes[0],
          n1 = o.subs[0].nodes[1];
        setLineInfo({
          length: Math.hypot(n1.x - n0.x, n1.y - n0.y),
          angle: Math.atan2(n1.y - n0.y, n1.x - n0.x) * 180 / Math.PI
        });
        live({
          ...dg.base,
          objects: [...dg.base.objects, o]
        });
      }
      return;
    }
    if (dg.type === 'arc') {
      const a3 = arc3Ref.current;
      if (dg.stage === 'third' && a3 && a3.end) {
        const q = snapAt(pt, e, null, null, a3.base.objects);
        const res = threePointArcFromPoints(a3.start, a3.end, q);
        const st = visibleStrokeStyle(shapeSty, { stroke: accentStroke(prefs && prefs.accent || '#13b152'), sw: 2 });
        const previewObj = {
          id: a3.id,
          name: a3.name,
          type: 'path',
          fill: 'none',
          stroke: st.stroke,
          strokeWidth: st.sw,
          opacity: 1,
          fillRule: 'nonzero',
          group: null,
          subs: [{ id: makeNodeId(), closed: false, nodes: res.nodes.map(n => ({ ...n, id: makeNodeId() })) }],
          gen: { kind: 'arc', cx: res.cx, cy: res.cy, r: res.r, startDeg: res.startDeg || 0, sweepDeg: res.sweepDeg || 90 }
        };
        live({ ...a3.base, objects: [...a3.base.objects, previewObj] });
        return;
      }
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      const q0 = snapAt(pt, e, null, null, dg.base.objects);
      const q = e.shiftKey ? constrainPoint45(dg.center, q0) : q0;
      dg.moved = true;
      dg.endPt = { x: q.x, y: q.y };
      const st = visibleStrokeStyle(shapeSty, { stroke: accentStroke(prefs && prefs.accent || '#13b152'), sw: 2 });
      const linePrev = {
        id: dg.id,
        name: dg.name,
        type: 'path',
        fill: 'none',
        stroke: st.stroke,
        strokeWidth: st.sw,
        opacity: 0.7,
        fillRule: 'nonzero',
        group: null,
        subs: [{ id: makeNodeId(), closed: false, nodes: [
          { id: makeNodeId(), x: dg.center.x, y: dg.center.y, type: 'corner', handleIn: null, handleOut: null },
          { id: makeNodeId(), x: q.x, y: q.y, type: 'corner', handleIn: null, handleOut: null }
        ] }]
      };
      live({ ...dg.base, objects: [...dg.base.objects, linePrev] });
      return;
    }
    if (dg.type === 'shapebuilder') {
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      if (e.shiftKey || dg.shift) {
        dg.stroke = [dg.stroke[0], { x: pt.x, y: pt.y }];
      } else {
        const last = dg.stroke[dg.stroke.length - 1];
        if (Math.hypot(pt.x - last.x, pt.y - last.y) > 0.5) dg.stroke.push({ x: pt.x, y: pt.y });
      }
      dg.moved = true;
      const preview = {
        id: dg.strokeId,
        name: 'ShapeBuilderStroke',
        type: 'path',
        fill: 'none',
        stroke: '#2563eb',
        strokeWidth: 2,
        subs: [{
          id: 's-' + dg.strokeId,
          closed: false,
          nodes: dg.stroke.map((p, i) => ({
            id: dg.strokeId + '-n' + i,
            x: p.x,
            y: p.y,
            type: 'corner',
            handleIn: null,
            handleOut: null
          }))
        }]
      };
      live({
        ...dg.base,
        objects: [...dg.base.objects, preview]
      });
      return;
    }
    /* Curvature (Task 6): seret titik / segmen. Seret segmen menyisip
       titik di segmen (reuse VE.segPoint untuk posisi sisip) lalu
       menggeser titik itu — satu gerakan, satu rebuild preview. */
    if (dg.type === 'curvature') {
      const s = curvatureRef.current;
      if (!s) return;
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      const q = snapAt(pt, e, null, null, dg.base.objects);
      if (dg.mode === 'segment' && !dg.moved) {
        const nid = VE.uid();
        s.pts.splice(dg.insIdx, 0, {
          id: nid,
          x: dg.at.x,
          y: dg.at.y,
          type: 'smooth'
        });
        dg.mode = 'point';
        dg.idx = dg.insIdx;
        setSel({
          objs: new Set([s.oid]),
          nodes: new Set([nid])
        });
      }
      if (dg.mode === 'point' && dg.idx >= 0 && dg.idx < s.pts.length) {
        s.pts[dg.idx].x = q.x;
        s.pts[dg.idx].y = q.y;
        dg.moved = true;
        rebuildCurvaturePreview();
      }
      return;
    }
    if (dg.type === 'frame') {
      if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) return;
      const r0 = shapeRect(dg.start, pt, e.shiftKey);
      const q = snapAt(pt, e, null, null, dg.base.objects, {
        allowSpacing: true,
        dragBBox: [r0.x, r0.y, r0.x + r0.w, r0.y + r0.h]
      });
      const r = shapeRect(dg.start, q, e.shiftKey);
      dg.rect = [r.x, r.y, r.x + r.w, r.y + r.h];
      dg.moved = true;
      live(VE.createFrame(dg.base, new Set(), {
        rect: dg.rect,
        radius: lay.radius
      }).doc);
      return;
    }
    if (dg.type === 'imgscale') {
      if (!dg.moved && dg.sx != null && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 5) return;
      let q = pt;
      /* C2: Alt juga menekan snap. C11: bbox objek agar spacing + snap
         kotak tersedia saat imgscale (dulu tanpa dragBBox). */
      if (snapOn && !(e.ctrlKey || e.metaKey || e.altKey)) {
        if (!dg.imgscaleBB) {
          const o = dg.base.objects.find(q2 => q2.id === dg.objId);
          const b = o ? VE.tightBBox(o) : null;
          dg.imgscaleBB = b && b[0] <= b[2] && b[1] <= b[3] ? b.slice() : null;
        }
        q = snapAt(pt, e, new Set([dg.objId]), null, dg.base.objects, { allowSpacing: true, dragBBox: dg.imgscaleBB });
      } else setSnapInd(null);
      const den = dg.cx0 * dg.cx0 + dg.cy0 * dg.cy0,
        k = Math.max(0.001, ((q.x - dg.ax) * dg.cx0 + (q.y - dg.ay) * dg.cy0) / den);
      dg.moved = true;
      live({
        ...dg.base,
        objects: dg.base.objects.map(o => o.id === dg.objId ? VE.scaleObj(o, dg.ax, dg.ay, k) : o)
      });
      return;
    }
    if (!dg.moved) {
      const distPx = dg.sx != null ? Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) : Math.hypot(pt.x - dg.start.x, pt.y - dg.start.y) * zoomRef.current;
      if (distPx < 5) return;
      /* Re-baseline titik awal drag tepat saat melewati deadzone 5px agar objek/node/handle tidak melompat */
      if (dg.type === 'handle' && dg.initH) {
        dg.off = {
          x: dg.initH.x - pt.x,
          y: dg.initH.y - pt.y
        };
      } else if (dg.start) {
        dg.start = {
          x: pt.x,
          y: pt.y
        };
      }
    }
    if (dg.type === 'handle') {
      let tg = {
        x: pt.x + dg.off.x,
        y: pt.y + dg.off.y
      };
      const alt = e.altKey,
        free = e.altKey;
      const hbuild = (n, t) => VE.rebuildHandle(n, dg.w, t, free);
      if (dg.parent === undefined) {
        dg.parent = null;
        const po = dg.base.objects.find(o => o.id === dg.objId);
        if (po) {
          for (const sp of po.subs) {
            const f = sp.nodes.find(n => n.id === dg.nodeId);
            if (f) {
              dg.parent = {
                x: f.x,
                y: f.y,
                type: f.type
              };
              break;
            }
          }
        }
      }
      const parentNode = dg.parent;
      if (e.shiftKey && parentNode) {
        /* Shift: kunci sudut handle ke kelipatan 45° terhadap node induk */
        const vx = tg.x - parentNode.x,
          vy = tg.y - parentNode.y,
          L = Math.hypot(vx, vy);
        const ang = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) * (Math.PI / 4);
        tg = {
          x: parentNode.x + Math.cos(ang) * L,
          y: parentNode.y + Math.sin(ang) * L
        };
        setSnapInd({
          x: tg.x,
          y: tg.y,
          kind: 'axial',
          guides: [{
            type: 'line',
            x1: parentNode.x,
            y1: parentNode.y,
            x2: tg.x,
            y2: tg.y,
            kind: 'axial'
          }]
        });
      } else if (!snapOn || alt || e.ctrlKey || e.metaKey) {
        setSnapInd(null);
      } else {
        const thr = VE.SNAP_PX / zoomRef.current,
          cfg = snapCfg,
          gOn = gridOn && cfg.grid,
          exN = new Set([dg.nodeId]);
        let activeSegNodes = exN;
        const po = dg.base.objects.find(o => o.id === dg.objId);
        if (po) {
          for (const sp of po.subs) {
            const ns = sp.nodes,
              L = ns.length,
              idx = ns.findIndex(n => n.id === dg.nodeId);
            if (idx >= 0) {
              const adj = new Set([dg.nodeId]);
              if (idx > 0 || sp.closed) adj.add(ns[(idx - 1 + L) % L].id);
              if (idx < L - 1 || sp.closed) adj.add(ns[(idx + 1) % L].id);
              activeSegNodes = adj;
              break;
            }
          }
        }
        /* hLines (garis handle) tidak ada di solver — handle tidak pernah
           terkunci ke garis handle (lihat header snapPt). Argumen hLines
           diteruskan `false` agar tidak ada yang mengira mekanisme itu ada. */
        const rN: any = cfg.node ? VE.snapPt(tg, dg.base.objects, new Set([dg.objId]), activeSegNodes, thr, 0, true, false, false, false, false, !cfg.bbox) : {
          ind: false
        };
        const r0: any = rN.ind ? rN : cfg.node || cfg.midpoint || cfg.edge ? VE.snapPt(tg, dg.base.objects, new Set([dg.objId]), activeSegNodes, thr, 0, !cfg.edge, false, false, !cfg.node, !!cfg.midpoint, !cfg.bbox) : {
          ind: false
        };
        if (r0.ind) {
          tg = {
            x: r0.x,
            y: r0.y
          };
          setSnapInd({
            x: r0.x,
            y: r0.y,
            kind: r0.kind,
            cross: true
          });
        } else {
          const cs = cfg.edge ? VE.snapHandleCurve(dg.base.objects, dg.objId, dg.nodeId, dg.w, tg, free, thr, !cfg.node, !!cfg.midpoint) : null;
          if (cs) {
            tg = cs.tg;
            setSnapInd({
              x: cs.x,
              y: cs.y,
              kind: cs.kind
            });
          } else {
            /* Saat mode Geser Melengkung (curveDragOn) aktif, jangan kunci sumbu axial ke parentNode sendiri
               kecuali sangat dekat (thr * 0.35), supaya gerakan melengkung bebas dan tidak patah ke garis lurus */
            const hCfg = {
              ...cfg,
              node: false,
              edge: false,
              perp: false,
              spacing: false,
              axial: curveDragOn ? false : cfg.axial,
              grid: gOn
            };
            if (!dg.sc || dg.scCurve !== curveDragOn) {
              dg.sc = VE.buildSnapCache(dg.base, new Set([dg.objId]), exN, hCfg, null);
              dg.scCurve = curveDragOn;
              if (hCfg.axial && parentNode) {
                dg.sc.xLines.unshift({
                  v: parentNode.x,
                  a: parentNode.y,
                  b: parentNode.y,
                  kind: 'axial'
                });
                dg.sc.yLines.unshift({
                  v: parentNode.y,
                  a: parentNode.x,
                  b: parentNode.x,
                  kind: 'axial'
                });
              }
            }
            const sr = VE.solveMultiSnap(tg, dg.sc, dg.base.objects, new Set([dg.objId]), exN, thr, gOn ? gridStep() : 0, hCfg, null, null);
            tg = {
              x: sr.x,
              y: sr.y
            };
            setSnapInd(sr.ind ? {
              x: sr.ix,
              y: sr.iy,
              kind: sr.kind,
              cross: sr.cross,
              guides: sr.guides
            } : null);
          }
        }
      }
      const objects = dg.base.objects.map(o => {
        if (o.id !== dg.objId) return o;
        return {
          ...o,
          subs: o.subs.map(sp => {
            const idx = sp.nodes.findIndex(n => n.id === dg.nodeId);
            if (idx < 0) return sp;
            const ns = sp.nodes.slice(),
              L = ns.length;
            const updatedNode = hbuild(ns[idx], tg);
            ns[idx] = updatedNode;

            /* FITUR GESER MELENGKUNG (AUTO-CURVE) PADA MODE NO MIRRORING:
               Jika curveDragOn aktif dan node berada dalam mode No Mirroring ('corner'),
               saat kita menggeser handle keluar/masuk, apabila node tetangga di ujung segmen
               itu belum punya handle (atau handle-nya masih kaku lurus di atas garis chord),
               bentuk busur kurva kuadratik-ke-kubik secara otomatis pada segmen tersebut
               TANPA mengubah handle di sisi belakang node! */
            if (curveDragOn && updatedNode.type === 'corner') {
              const isOut = dg.w === 'out';
              const nbIdx = isOut ? sp.closed || idx < L - 1 ? (idx + 1) % L : -1 : sp.closed || idx > 0 ? (idx - 1 + L) % L : -1;
              if (nbIdx >= 0 && nbIdx !== idx) {
                const nbOrig = sp.nodes[nbIdx];
                const oppKey = isOut ? 'handleIn' : 'handleOut';
                const origOpp = nbOrig[oppKey];
                /* Cek apakah ujung tetangga awalnya belum punya handle atau masih kolinier dengan chord */
                const chord = VE.sub(nbOrig, ns[idx]);
                const chordLen = Math.hypot(chord.x, chord.y) || 1;
                const wasCollinear = !origOpp || Math.abs(VE.cross(chord, VE.sub(origOpp, ns[idx]))) / chordLen < 0.5;
                if (wasCollinear) {
                  /* Proyeksi titik puncak kontrol kuadratik Q dari tarikan handle tg, lalu petakan
                     handle pendamping di node tetangga sebesar 1/2 vektor lengkung agar busur melengkung mulus */
                  const anchor = ns[idx];
                  const qCtrl = {
                    x: anchor.x + (tg.x - anchor.x) * 1.5,
                    y: anchor.y + (tg.y - anchor.y) * 1.5
                  };
                  const companion = {
                    x: nbOrig.x + (qCtrl.x - nbOrig.x) * 0.5,
                    y: nbOrig.y + (qCtrl.y - nbOrig.y) * 0.5
                  };
                  ns[nbIdx] = {
                    ...nbOrig,
                    fil: null,
                    [oppKey]: companion
                  };
                }
              }
            }
            return {
              ...sp,
              nodes: ns
            };
          })
        };
      });
      dg.moved = true;
      sceneRendererRef.current?.setSceneInteracting?.(true);
      live({
        ...dg.base,
        objects
      });
      return;
    }
    runObjOrNodeDrag(e, pt, dg);
  };
  const runObjOrNodeDrag = (e, pt, dg, deferRender = false) => {
    if (!dg.moved) {
      const distPx = dg.sx != null ? Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) : Math.hypot(pt.x - dg.start.x, pt.y - dg.start.y) * zoomRef.current;
      if (distPx < 5) return;
      if (dg.start) {
        dg.start = {
          x: pt.x,
          y: pt.y
        };
      }
    }
    let raw = {
      x: dg.anchor.x + pt.x - dg.start.x,
      y: dg.anchor.y + pt.y - dg.start.y
    };
    let shiftAxis = null;
    if (e.shiftKey) {
      if (Math.abs(raw.x - dg.anchor.x) > Math.abs(raw.y - dg.anchor.y)) {
        raw.y = dg.anchor.y;
        shiftAxis = 'x';
      } else {
        raw.x = dg.anchor.x;
        shiftAxis = 'y';
      }
    }
    let dx = raw.x - dg.anchor.x,
      dy = raw.y - dg.anchor.y;
    const isObj = dg.type === 'obj';
    if (dg.dragNodeCount === undefined) {
      let bb = null,
        k = 0,
        hasOtherObjs = false,
        dragNodeCount = 0;
      const grow = b => {
        if (!b || !isFinite(b[0]) || b[0] > b[2]) return;
        if (!bb) bb = [b[0], b[1], b[2], b[3]];else {
          if (b[0] < bb[0]) bb[0] = b[0];
          if (b[1] < bb[1]) bb[1] = b[1];
          if (b[2] > bb[2]) bb[2] = b[2];
          if (b[3] > bb[3]) bb[3] = b[3];
        }
      };
      const baseObjs = dg.base.objects;
      for (let oi = 0, L = baseObjs.length; oi < L; oi++) {
        const o = baseObjs[oi];
        if (isObj) {
          const inDrag = dg.ids.has(o.id);
          if (inDrag) {
            grow(VE.tightBBox(o));
            dragNodeCount += vinfo(o).n;
          } else if (!hasOtherObjs && !o.hidden && !o.isFrameBg && !o.isAutoFrame) {
            hasOtherObjs = true;
          }
        } else {
          let anyIn = false,
            allIn = true;
          for (let si = 0; si < o.subs.length; si++) {
            const ns = o.subs[si].nodes;
            for (let ni = 0; ni < ns.length; ni++) {
              const n = ns[ni];
              if (dg.ids.has(n.id)) {
                grow([n.x, n.y, n.x, n.y]);
                k++;
                anyIn = true;
              } else {
                allIn = false;
              }
            }
          }
          if (anyIn) dragNodeCount += vinfo(o).n;
          if (!hasOtherObjs && !o.hidden && !o.isFrameBg && !o.isAutoFrame && !allIn) {
            hasOtherObjs = true;
          }
        }
      }
      if (!isObj && k < 2) bb = null;
      dg.bb0 = bb;
      dg.hasOtherObjs = hasOtherObjs;
      dg.dragNodeCount = dragNodeCount;
    }
    /* C2: tombol penekan snap = Ctrl/Cmd ATAU Alt (dulu hanya Ctrl/Cmd). */
    if (!snapOn || e.ctrlKey || e.metaKey || e.altKey) {
      if (dg.lastSnapSig) {
        dg.lastSnapSig = null;
        setSnapInd(null);
      }
    } else {
      const thr = VE.SNAP_PX / zoomRef.current,
        gOn = gridOn && snapCfg.grid;
      const cfg = isObj ? snapCfg : {
        ...snapCfg,
        spacing: false
      };
      const exO = isObj ? dg.ids : null,
        exN = isObj ? null : dg.ids;
      if (!dg.sc) {
        /* Pre-drag spatial indexing: target statis dibangun SEKALI saat drag dimulai */
        let noBox = null;
        if (!isObj) {
          noBox = new Set();
          dg.base.objects.forEach(o => {
            if (o.subs.some(sp => sp.nodes.some(n => dg.ids.has(n.id)))) noBox.add(o.id);
          });
        }
        dg.sc = VE.buildSnapCache(dg.base, exO, exN, cfg, noBox);
      }
      if (!dg.cand) dg.cand = dragCands(dg);
      let probes = dg._probes;
      if (!probes || probes.length !== dg.cand.length) {
        probes = dg.cand.map(q => ({
          x: q.x + dx,
          y: q.y + dy
        }));
        dg._probes = probes;
      } else {
        for (let pi = 0; pi < dg.cand.length; pi++) {
          probes[pi].x = dg.cand[pi].x + dx;
          probes[pi].y = dg.cand[pi].y + dy;
        }
      }
      const bbx = dg.bb0 ? [dg.bb0[0] + dx, dg.bb0[1] + dy, dg.bb0[2] + dx, dg.bb0[3] + dy] : null;
      const edgeFn = !dg.hasOtherObjs ? null : () => {
        let m = cfg.edge ? VE.snapMany(probes, dg.base.objects, exO, exN, thr, {
          noNode: true,
          cachedTargets: dg.sc.getEdgeTargets ? dg.sc.getEdgeTargets(true) : undefined
        }) : null;
        if (isObj && (cfg.edge || cfg.node) && dg.dragNodeCount <= 24 && dg.ids.size <= 2) {
          if (!dg.outl) dg.outl = dragOutline(dg);
          if (dg.outl.samples.length || dg.outl.segs.length) {
            const m2 = VE.snapOutline(dg.outl.samples, dg.outl.segs, dg.base.objects, dg.ids, thr, dx, dy, {
              noNode: !cfg.node,
              noEdge: !cfg.edge,
              cachedTargets: dg.sc.getEdgeTargets ? dg.sc.getEdgeTargets(!cfg.node) : undefined
            });
            if (m2 && (!m || Math.hypot(m2.dx, m2.dy) < Math.hypot(m.dx, m.dy))) m = m2;
          }
        }
        return m;
      };
      const primarySnapPt = isObj && bbx ? {
        x: (bbx[0] + bbx[2]) * 0.5,
        y: (bbx[1] + bbx[3]) * 0.5
      } : {
        x: dg.anchor.x + dx,
        y: dg.anchor.y + dy
      };
      const r = VE.solveMultiSnap(primarySnapPt, dg.sc, dg.base.objects, exO, exN, thr, gOn ? gridStep() : 0, {
        ...cfg,
        grid: gOn
      }, bbx, {
        probes,
        delta: {
          dx,
          dy
        },
        edgeFn,
        lockAxis: shiftAxis,
        figmaObjectMode: isObj
      });
      dx += r.dx;
      dy += r.dy;
      const hasVisSnap = !!(r.ind && (r.guides && r.guides.length > 0 || r.cross !== false && r.ix != null));
      if (!hasVisSnap) {
        if (dg.lastSnapSig) {
          dg.lastSnapSig = null;
          setSnapInd(null);
        }
      } else {
        const g0 = r.guides && r.guides[0] ? VE.rd(r.guides[0].x1) + ':' + VE.rd(r.guides[0].y1) + ':' + VE.rd(r.guides[0].x2) + ':' + VE.rd(r.guides[0].y2) : '';
        const sig = VE.rd(r.ix) + ',' + VE.rd(r.iy) + ',' + r.kind + ',' + (r.guides ? r.guides.length : 0) + ',' + g0;
        if (dg.lastSnapSig !== sig) {
          dg.lastSnapSig = sig;
          setSnapInd({
            x: r.ix,
            y: r.iy,
            kind: r.kind,
            cross: r.cross,
            guides: r.guides
          });
        }
      }
    }
    if (!dg.moved && dg.type === 'obj') {
      if (boxRef.current) boxRef.current.setAttribute('data-dragging-obj', '1');
    }
    if (!dg.moved) {
      sceneRendererRef.current?.setSceneInteracting?.(true);
    }
    dg.moved = true;
    if (dg.type === 'obj') altDupMove(e, dg, dx, dy, deferRender);else live({
      ...dg.base,
      objects: dg.base.objects.map(o => VE.moveNodes(o, dg.ids, dx, dy))
    });
    if (dg.type === 'obj') {
      /* highlight Frame target: daftar Frame & bbox objek di-cache SEKALI per drag (tidak dihitung ulang tiap pointermove) */
      if (!dg.frm) {
        const hasAnyFrames = dg.base.objects.some(q => q.isFrameBg || q.isAutoFrame || q.containerType === 'frame' || /^frame/i.test(q.group || ''));
        if (!hasAnyFrames) {
          dg.frm = {
            frames: [],
            cand: [],
            bb: null
          };
        } else {
          const mv = dg.base.objects.filter(q => dg.ids.has(q.id)),
            bgG = new Set(mv.filter(q => (q.isFrameBg || q.isAutoFrame) && q.group).map(q => q.group));
          const cand = mv.filter(q => !q.isFrameBg && !q.isAutoFrame && !(q.group && bgG.has(q.group)));
          dg.frm = {
            frames: VE.listFrames(dg.base, dg.ids),
            cand,
            bb: cand.length ? dg.bb0 || VE.docBounds(dg.base, new Set(cand.map(q => q.id))) : null
          };
        }
      }
      let hid = null;
      if (dg.frm.bb) {
        const cx = (dg.frm.bb[0] + dg.frm.bb[2]) / 2 + dx,
          cy = (dg.frm.bb[1] + dg.frm.bb[3]) / 2 + dy;
        const hf = dg.frm.frames.find(f => cx >= f.bb[0] && cx <= f.bb[2] && cy >= f.bb[1] && cy <= f.bb[3]);
        if (hf && !dg.frm.cand.every(q => q.group === hf.id)) hid = hf.id;
      }
      const noNest = !!(e.ctrlKey || e.metaKey);
      if (dg.lastHid !== hid) {
        dg.lastHid = hid;
        setDropFrameId(hid);
      }
      if (dg.lastNoNest !== noNest) {
        dg.lastNoNest = noNest;
        setDropNoNest(noNest);
      }
    }
  };
  const onPointerUp = e => {
    DEBUG_LOG.log('pointer', 'pointer-up:' + tool, 'onPointerUp', 'src/components/editor/VectorEditor.tsx', 'x=' + Math.round(e.clientX) + ' y=' + Math.round(e.clientY));
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = 0;
    }
    if (e.pointerType === 'touch') {
      activeTouchPointersRef.current.delete(e.pointerId);
      if (e.type === 'pointercancel') {
        multiTapRef.current = null;
      } else if (activeTouchPointersRef.current.size === 0 && multiTapRef.current) {
        const mt = multiTapRef.current;
        multiTapRef.current = null;
        const elapsed = performance.now() - mt.startTime;
        if (!mt.moved && elapsed <= 320) {
          if (mt.maxFingers === 2 && canUndo) {
            undo();
            say(prefs && prefs.lang === 'en' ? 'Undo (2-finger tap)' : 'Urungkan (tap 2 jari)');
          } else if (mt.maxFingers >= 3 && canRedo) {
            redo();
            say(prefs && prefs.lang === 'en' ? 'Redo (3-finger tap)' : 'Ulangi (tap 3 jari)');
          }
        }
      }
      if (pinchStateRef.current) {
        try {
          boxRef.current?.releasePointerCapture(e.pointerId);
        } catch (x) {}
        if (activeTouchPointersRef.current.size < 2) {
          pinchStateRef.current = null;
          flushView();
        }
        return;
      }
    }
    const dg = dragRef.current;
    if (objDragRafRef.current) {
      cancelAnimationFrame(objDragRafRef.current);
      objDragRafRef.current = 0;
    }
    const pendingObjEv = objDragPendingRef.current;
    objDragPendingRef.current = null;
    if (dg && dg.type === 'obj' && pendingObjEv) {
      runObjOrNodeDrag(pendingObjEv, boxRef.current ? toDoc(pendingObjEv.clientX, pendingObjEv.clientY) : { x: 0, y: 0 }, dg);
    }
    dragRef.current = null;
    sceneRendererRef.current?.setSceneInteracting?.(false);
    sceneRendererRef.current?.setPaintInteracting?.(false);
    document.body.classList.remove('grabbing');
    if (boxRef.current) {
      boxRef.current.removeAttribute('data-dragging');
      boxRef.current.removeAttribute('data-dragging-obj');
    }
    try {
      boxRef.current.releasePointerCapture(e.pointerId);
    } catch (x) {}
    if (dg && dg.type === 'pan') {
      if (viewPend.current) {
        cancelAnimationFrame(viewPend.current);
        viewPend.current = 0;
      }
      if (viewSettleTimer.current) {
        clearTimeout(viewSettleTimer.current);
        viewSettleTimer.current = 0;
      }
      setSceneInteractingZoom(false);
      sceneRendererRef.current?.setCameraInteracting(false);

      if (boxRef.current) {
        boxRef.current.removeAttribute('data-zooming');
        boxRef.current.setAttribute('data-fast-render', nTotal > 800 ? '1' : '0');
      }
      if (dg.moved) {
        applyVP(true, true);
        // Pan state selalu disinkronkan saat drag-pan selesai (lihat flushView).
        const z = zoomRef.current;
        const p = {
          x: panRef.current.x,
          y: panRef.current.y
        };
        const syncCameraState = () => {
          setZoom(prevZ => Math.abs(prevZ - z) > 1e-6 ? z : prevZ);
          setPan(prevP => Math.abs(prevP.x - p.x) > 0.5 || Math.abs(prevP.y - p.y) > 0.5 ? p : prevP);
        };
        if (typeof (React as any).startTransition === 'function') {
          (React as any).startTransition(syncCameraState);
        } else {
          syncCameraState();
        }
      } else {
        const z = zoomRef.current;
        setZoom(prevZ => Math.abs(prevZ - z) > 1e-6 ? z : prevZ);
        sceneRendererRef.current?.requestRender();
      }
      return;
    }
    if (dg && dg.type === 'obj' && dg.fastTx) flushFastObjDrag(dg);
    if (liveRafRef.current) flushLive();
    if (viewPend.current || viewSettleTimer.current) flushView();
    setSnapInd(null);
    setPanning(false);
    setMarq(null);
    setAddHov(null);
    setHhHov(null);
    setVcTransforming(false);
    setIsMovingObj(false);
    setMeasureBadge(null);
    setDropFrameId(null);
    setDropNoNest(false);
    if (!dg) return;
    if (dg.type === 'pen') {
      penUp(dg);
      return;
    }
    if (dg.type === 'text') {
      // G4: klik (tanpa gerak) pada teks lama -> masuk edit, bukan buat baru.
      if (!dg.moved && dg.hitTextId) {
        const target = docRef.current.objects.find(o => o.id === dg.hitTextId);
        if (target && target.type === 'text') {
          const caret = measureTextCaret(target, dg.hitPt.x, dg.hitPt.y);
          setTool('select');
          setSel({objs: new Set([target.id]), nodes: new Set()});
          setEditingText({id: target.id, isNew: false, caret});
          return;
        }
      }
      const id = VE.uid();
      const used = new Set(dg.base.objects.map(q => q.name));
      let n = 1;
      while (used.has('Text-' + n)) n++;
      const fontSize = 32;
      const boxW = dg.moved ? Math.max(40, Math.round(Math.abs(dg.cur.x - dg.start.x))) : null;
      // Seret-buat kotak teks = lebar tetap + tinggi otomatis (ala Figma):
      // tinggi mengikuti isi saat mengetik. Sebelumnya drag membuat 'fixed'
      // dengan tinggi = tinggi seretan, sehingga teks panjang meluber keluar
      // kotak dan selection box tidak lagi menutupi isi (tinggi bounds = tinggi
      // seretan, bukan tinggi teks). Yang mau tinggi tetap bisa pilih "Tetap"
      // di inspector (Mode Kotak Teks).
      const tx = dg.moved ? Math.min(dg.start.x, dg.cur.x) : dg.start.x;
      const ty = dg.moved ? Math.min(dg.start.y, dg.cur.y) + fontSize : dg.start.y;
      const obj = normalizeTextObject({
        id,
        name: n === 1 && !used.has('Text') ? 'Text' : 'Text-' + n,
        autoName: true,
        type: 'text',
        subs: [],
        opacity: 1,
        fill: '#111827',
        text: {
          content: '',
          x: tx,
          y: ty,
          fontSize,
          fontFamily: lastTextFamilyRef.current || 'Geovanta Sans',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAnchor: 'start',
          verticalAlign: 'top',
          resizing: dg.moved ? 'autoHeight' : 'autoWidth',
          textDecoration: 'none',
          textCase: 'original',
          paragraphSpacing: 0,
          fill: '#111827',
          lineHeight: 1.2,
          letterSpacing: 0,
          width: boxW,
          height: null,
          fontAssetId: null
        }
      });
      commit({...dg.base, objects: [...dg.base.objects, obj]});
      setSel({objs: new Set([id]), nodes: new Set()});
      setTool('select');
      setEditingText({id, isNew: true});
      return;
    }
    if (dg.type === 'shape') {
      let o = null,
        inF = null;
      /* shape baru yang pusatnya jatuh di dalam Frame otomatis menjadi anak Frame itu (Ctrl/Cmd = jangan masuk) */
      const nest = d => {
        const r = VE.reparentDroppedObjects(d, new Set([o.id]), {
          preventNest: e.ctrlKey || e.metaKey
        });
        if (r.action === 'in') {
          inF = r.targetFrame;
          return r.doc;
        }
        return d;
      };
      if (dg.moved) {
        o = docRef.current.objects.find(q => q.id === dg.id) || null;
        if (o) {
          const nd = nest(docRef.current);
          commit(nd);
        }
      } else {
        const vb = dg.base.viewBox,
          sz = Math.max(10, Math.min(vb[2], vb[3]) * 0.2);
        o = makeShape(shapeKind, dg.start.x - sz / 2, dg.start.y - sz / 2, sz, sz, dg.id);
        if (o) commit(nest({
          ...dg.base,
          objects: [...dg.base.objects, o]
        }));
      }
      if (o) {
        setSel({
          objs: new Set([o.id]),
          nodes: new Set()
        });
        setTool('select');
        say(o.name + (inF ? ' ditambahkan ke ' + inF : ' ditambahkan'));
      }
      return;
    }
    if (dg.type === 'freehand') {
      let o = null;
      if (dg.moved && dg.points && dg.points.length >= 2) {
        const closeByEnd = dg.points.length >= 4 && Math.hypot(dg.points[dg.points.length - 1].x - dg.points[0].x, dg.points[dg.points.length - 1].y - dg.points[0].y) < 12 / zoomRef.current;
        const shouldClose = e.altKey || closeByEnd;
        o = dg.toolMode === 'brush'
          ? VE.createBrushObject(
              dg.points,
              {
                fill: (shapeSty.fill && shapeSty.fill !== 'none') ? shapeSty.fill : (shapeSty.stroke && shapeSty.stroke !== 'none' ? shapeSty.stroke : '#000000'),
                stroke: 'none',
                strokeWidth: 0,
                opacity: 1
              },
              {
                id: dg.id,
                name: dg.name,
                tolerance: 1.5,
                baseWidth: 8,
                minWidth: 2,
                maxWidth: 24,
                taper: true
              }
            )
          : VE.createPencilObject(
              dg.points,
              {
                stroke: (shapeSty.sw > 0 && shapeSty.stroke && shapeSty.stroke !== 'none') ? shapeSty.stroke : (shapeSty.fill && shapeSty.fill !== 'none' ? shapeSty.fill : '#000000'),
                strokeWidth: shapeSty.sw > 0 ? shapeSty.sw : 2,
                opacity: 1
              },
              {
                id: dg.id,
                name: dg.name,
                tolerance: 1.5,
                minDistance: 2.0,
                smooth: !dg.straightShift,
                closed: shouldClose
              }
            );
        if (o && shouldClose && o.subs && o.subs[0]) {
          o = { ...o, subs: [{ ...o.subs[0], closed: true }] };
        }
        if (o) {
          commit({
            ...dg.base,
            objects: [...dg.base.objects, o]
          });
          setSel({
            objs: new Set([o.id]),
            nodes: new Set()
          });
          say(o.name + ' ditambahkan');
        }
      }
      return;
    }
    if (dg.type === 'blob') {
      let o = null,
        inF = null;
      /* Blob baru yang pusatnya jatuh di dalam Frame otomatis menjadi anak
         Frame itu (Ctrl/Cmd = jangan masuk) — pola yang sama dengan shape. */
      const nest = d => {
        const r = VE.reparentDroppedObjects(d, new Set([o.id]), {
          preventNest: e.ctrlKey || e.metaKey
        });
        if (r.action === 'in') {
          inF = r.targetFrame;
          return r.doc;
        }
        return d;
      };
      if (dg.moved) {
        o = docRef.current.objects.find(q => q.id === dg.id) || null;
        if (o) {
          const nd = nest(docRef.current);
          commit(nd);
        }
      } else {
        const vb = dg.base.viewBox,
          sz = Math.max(10, Math.min(vb[2], vb[3]) * 0.2);
        o = makeBlob(dg.start.x - sz / 2, dg.start.y - sz / 2, sz, sz, dg.id, dg.name);
        if (o) commit(nest({
          ...dg.base,
          objects: [...dg.base.objects, o]
        }));
      }
      if (o) {
        setSel({
          objs: new Set([o.id]),
          nodes: new Set()
        });
        /* Sengaja TIDAK setTool('select') (berbeda dengan shape): tool Blob
           tetap aktif sesudah commit, supaya parameter di inspector tetap
           mengubah blob yang sama dan user bisa menggambar blob berikutnya. */
        say(o.name + (inF ? ' ditambahkan ke ' + inF : ' ditambahkan'));
      }
      return;
    }
    if (dg.type === 'weave') {
      let strips = null;
      if (dg.moved) {
        strips = docRef.current.objects.filter(q => q.group === dg.groupId) || [];
        if (strips.length) commit(docRef.current);
      } else {
        const vb = dg.base.viewBox,
          sz = Math.max(10, Math.min(vb[2], vb[3]) * 0.2);
        strips = makeWeave(dg.start.x - sz / 2, dg.start.y - sz / 2, sz, sz, dg.groupId);
        if (strips.length) commit({
          ...dg.base,
          objects: [...dg.base.objects, ...strips]
        });
      }
      if (strips && strips.length) {
        setSel({
          objs: new Set(strips.map(o => o.id)),
          nodes: new Set()
        });
        /* Sengaja TIDAK setTool('select') (seperti Blob): tool Weave tetap
           aktif sesudah commit, supaya parameter di inspector tetap mengubah
           grup yang sama dan user bisa menggambar weave berikutnya.
           SENGAJA TIDAK ada nesting Frame (berbeda dengan Blob/Shape):
           reparentDroppedObjects menimpa field `group` dengan id Frame dan
           akan menghancurkan grup weave (model grup datar hanya punya satu
           slot `group`); weave selalu menjadi grup tingkat atas. */
        say(dg.groupId + ' ditambahkan');
      }
      return;
    }
    if (dg.type === 'line') {
      setLineInfo(null);
      let o = null;
      if (dg.moved) {
        o = docRef.current.objects.find(q => q.id === dg.id) || null;
        if (o) commit(docRef.current);
      } else {
        /* VectorCraft Line: klik tanpa seret membuka dialog ukuran garis (panjang & sudut) */
        setLineSizeDlg({
          x: dg.start.x,
          y: dg.start.y,
          sx: dg.sx,
          sy: dg.sy,
          len: '100',
          ang: '0'
        });
        return;
      }
      if (o) {
        setSel({
          objs: new Set([o.id]),
          nodes: new Set()
        });
        setTool('select');
        say(o.name + ' ditambahkan');
      }
      return;
    }
    if (dg.type === 'arc') {
      const a3 = arc3Ref.current;
      if (dg.stage === 'third' && a3 && a3.end) {
        const q = snapAt(toDoc(e.clientX, e.clientY), e, null, null, a3.base.objects);
        const res = threePointArcFromPoints(a3.start, a3.end, q);
        const st = visibleStrokeStyle(shapeSty, { stroke: accentStroke(prefs && prefs.accent || '#13b152'), sw: 2 });
        const o = {
          id: a3.id,
          name: a3.name,
          type: 'path',
          fill: 'none',
          stroke: st.stroke,
          strokeWidth: st.sw,
          opacity: 1,
          fillRule: 'nonzero',
          group: null,
          subs: [{ id: makeNodeId(), closed: false, nodes: res.nodes.map(n => ({ ...n, id: makeNodeId() })) }],
          gen: { kind: 'arc', cx: res.cx, cy: res.cy, r: res.r, startDeg: res.startDeg || 0, sweepDeg: res.sweepDeg || 90 }
        };
        arc3Ref.current = null;
        commit({ ...a3.base, objects: [...a3.base.objects, o] });
        setSel({ objs: new Set([o.id]), nodes: new Set() });
        say(o.name + ' ditambahkan');
        return;
      }
      if (dg.stage === 'endpoints' && a3) {
        if (dg.moved && dg.endPt) {
          /* Drag dari start ke end selesai -> tunggu titik ke-3 */
          a3.end = dg.endPt;
          say('Klik titik ke-3 untuk membentuk busur');
        } else {
          /* Klik ke-1 hanya menetapkan start; tunggu klik ke-2 untuk end */
          say('Klik titik akhir busur');
        }
        return;
      }
      return;
    }
    if (dg.type === 'shapebuilder') {
      const sbRes = applyShapeBuilderVectorcraft(
        dg.base,
        dg.selIds,
        dg.stroke,
        { alt: dg.alt, shift: dg.shift },
        say
      );
      if (!sbRes.changed) {
        live(dg.base);
        if (sbRes.resultId) setSel({ objs: new Set([sbRes.resultId]), nodes: new Set() });
        return;
      }
      commit(sbRes.doc, null);
      if (sbRes.resultId) {
        setSel({ objs: new Set([sbRes.resultId]), nodes: new Set() });
      } else {
        setSel({ objs: new Set(), nodes: new Set() });
      }
      return;
    }
    /* Curvature (Task 6): klik (tanpa seret) = toggle smooth/corner atau
       sisip titik di segmen. Toggle dijadwalkan 250ms: bila klik kedua
       (double-click) mendarat di titik yang sama, pointerdown membatalkan
       jadwal ini sehingga double-click hanya menyelesaikan path tanpa
       men-toggle titiknya. */
    if (dg.type === 'curvature') {
      const s = curvatureRef.current;
      if (!s) return;
      if (!dg.moved) {
        if (dg.mode === 'segment') {
          const nid = VE.uid(),
            q = snapAt(toDoc(e.clientX, e.clientY), e, null, null, dg.base.objects);
          s.pts.splice(dg.insIdx, 0, {
            id: nid,
            x: q.x,
            y: q.y,
            type: 'smooth'
          });
          rebuildCurvaturePreview();
          setSel({
            objs: new Set([s.oid]),
            nodes: new Set([nid])
          });
        } else if (dg.mode === 'point' && !dg.added && !dg.noToggle && dg.idx >= 0 && dg.idx < s.pts.length) {
          if (dg.refusedClose) {
            say('Path butuh minimal 3 titik untuk ditutup');
          } else {
            if (s.toggleTimer) clearTimeout(s.toggleTimer);
            const pid = s.pts[dg.idx].id;
            s.togglePid = pid;
            s.toggleTimer = setTimeout(() => {
              const s2 = curvatureRef.current;
              if (!s2) return;
              s2.toggleTimer = null;
              s2.togglePid = null;
              const p2 = s2.pts.find(q => q.id === pid);
              if (!p2) return;
              p2.type = p2.type === 'corner' ? 'smooth' : 'corner';
              rebuildCurvaturePreview();
              say(p2.type === 'corner' ? 'Node jadi corner' : 'Node jadi smooth');
            }, 250);
          }
        }
      }
      return;
    }
    if (dg.type === 'autoh') {
      if (docRef.current !== dg.base) {
        commit(docRef.current);
        if (dg.dragged) {
          say(`Kelengkungan Bézier: ${Math.round(ahOpt.tau * 100)}%`);
        }
      }
      return;
    }
    if (dg.type === 'frame') {
      if (!dg.moved) {
        // Jika pengguna tidak sengaja mengklik di atas Frame yang sudah ada (termasuk Frame kosong),
        // cukup pilih Frame tersebut tanpa membuat/memindahkan posisi layer-nya!
        const hitF = VE.listFrames(dg.base, null).find(f => dg.start.x >= f.bb[0] && dg.start.x <= f.bb[2] && dg.start.y >= f.bb[1] && dg.start.y <= f.bb[3]);
        if (hitF && (!selRef.current.objs.size || selRef.current.objs.has(hitF.id) || (hitF.bg && selRef.current.objs.has(hitF.bg.id)))) {
          const fObjs = new Set(dg.base.objects.filter(o => o.group === hitF.id).map(o => o.id));
          if (hitF.bg) fObjs.add(hitF.bg.id);
          setSel({ objs: fObjs.size > 0 ? fObjs : new Set([hitF.bg ? hitF.bg.id : hitF.id]), nodes: new Set() });
          setTool('select');
          say(hitF.id + ' dipilih');
          return;
        }
        if (selRef.current.objs.size > 0) {
          createFrameSel();
          setTool('select');
          return;
        }
        const clickRect = [dg.start.x - 120, dg.start.y - 80, dg.start.x + 120, dg.start.y + 80];
        const res = VE.createFrame(dg.base, new Set(), {
          rect: clickRect,
          radius: lay.radius
        });
        commit(res.doc);
        setSel({
          objs: res.selIds,
          nodes: new Set()
        });
        alMem.current = null;
        setTool('select');
        say(res.frameId + ' dibuat');
        return;
      }
      const [fx0, fy0, fx1, fy1] = dg.rect;
      /* Tangkap semua objek tidak terkunci yang berada di dalam area tarikan Frame (termasuk objek dari grup SVG impor) */
      const ids = new Set();
      dg.base.objects.forEach(o => {
        if (o.isAutoFrame || o.isFrameBg || o.hidden || o.locked) return;
        const bb = vinfo(o).bb,
          cx = (bb[0] + bb[2]) / 2,
          cy = (bb[1] + bb[3]) / 2;
        if (cx >= fx0 && cx <= fx1 && cy >= fy0 && cy <= fy1) ids.add(o.id);
      });
      const res = VE.createFrame(dg.base, ids, {
        rect: dg.rect,
        radius: lay.radius
      });
      commit(res.doc);
      setSel({
        objs: res.selIds,
        nodes: new Set()
      });
      alMem.current = null;
      setTool('select');
      say(res.frameId + ' dibuat');
      return;
    }
    if (dg.type === 'marquee') {
      const a = dg.start,
        b = dg.cur;
      if (Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 4) {
        if (!dg.add && (tool === 'node' || tool === 'corner') && dg.prev && dg.prev.nodes.size === 0) {
          setSel({
            objs: new Set(),
            nodes: new Set()
          });
        }
        return;
      }
      const x0 = Math.min(a.x, b.x),
        x1 = Math.max(a.x, b.x),
        y0 = Math.min(a.y, b.y),
        y1 = Math.max(a.y, b.y);
      const inside = n => n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1;
      const nTargets = tool === 'node' || tool === 'corner' ? dg.nodeTargets && dg.nodeTargets.length ? dg.nodeTargets : shown : null;
      if (nTargets && nTargets.length) {
        const nodes = new Set(dg.add && dg.prev ? dg.prev.nodes : []);
        const hitObjIds = new Set(dg.add && dg.prev ? dg.prev.objs : shown.length ? shown.map(o => o.id) : []);
        nTargets.forEach(o => {
          if (!showSelNodes || o.hidden || o.locked) return;
          o.subs.forEach(sp => sp.nodes.forEach(n => {
            if (inside(n)) {
              nodes.add(n.id);
              hitObjIds.add(o.id);
            }
          }));
        });
        setSel({
          objs: hitObjIds,
          nodes
        });
      } else {
        const objs = new Set(dg.add && dg.prev ? dg.prev.objs : []);
        docRef.current.objects.forEach(o => {
          if (o.hidden || o.locked) return;
          const bb = vinfo(o).bb;
          if (bb[0] <= x1 && bb[2] >= x0 && bb[1] <= y1 && bb[3] >= y0) objs.add(o.id);
        });
        setSel({
          objs,
          nodes: new Set()
        });
      }
      return;
    }
    if (dg.type === 'obj' && !dg.moved && dg.emptyBoxHit) {
      setSel({
        objs: new Set(),
        nodes: new Set()
      });
      return;
    }
    if (dg.moved && docRef.current !== dg.base) {
      let curDoc = docRef.current;
      if (dg.type === 'obj') {
        const movedIds = dg.selSwitched && dg.dupIds ? dg.dupIds : dg.ids;
        if (curDoc.objects.some(q => q.isFrameBg || q.isAutoFrame || q.containerType === 'frame' || /^frame/i.test(q.group || ''))) {
          const rep = VE.reparentDroppedObjects(curDoc, movedIds, {
            preventNest: e.ctrlKey || e.metaKey
          });
          if (rep.action === 'in') {
            curDoc = rep.doc;
            say('Objek dimasukkan ke ' + rep.targetFrame);
          } else if (rep.action === 'out') {
            curDoc = rep.doc;
            say('Objek dikeluarkan dari Frame');
          }
        }
        /* Selalu posisikan objek yang dipindahkan ke tumpukan teratas (z-index front) */
        const arranged = VE.arrangeZOrder(curDoc, movedIds, 'front');
        if (arranged !== curDoc) {
          curDoc = arranged;
        }
        live(curDoc);
      }
      push(curDoc, null);
    }
  };
  const onDoubleClick = e => {
    if (e.button !== 0) return;
    if (tool === 'pen') {
      finishPen();
      return;
    }
    /* Curvature (Task 6): double-click = selesai (commit). Toggle yang
       dijadwalkan klik pertama dibatalkan di onPointerDown, jadi
       double-click tidak ikut men-toggle titiknya. */
    if (tool === 'curvature') {
      finishCurvature();
      return;
    }
    if (tool === 'autohandle') return;
    if (tool === 'hand' || tool === 'shape' || tool === 'frame' || tool === 'addnode' || tool === 'addhandle' || spaceRef.current) return;
    const pt = toDoc(e.clientX, e.clientY),
      hit = pickNode(pt);
    if (hit && hit.kind === 'node') {
      const t = hit.n.type === 'corner' ? 'smooth' : 'corner';
      commitObjs(o => o.id === hit.o.id ? VE.typeNodes(o, new Set([hit.n.id]), t) : o);
      return;
    }
    const sg = nearestSeg(selObjs, pt, 9 / zoomRef.current);
    if (sg) {
      const nn = VE.insertNode(sg.o, sg.sp.id, sg.i, sg.t);
      commitObjs(o => o.id === sg.o.id ? nn : o);
      const added = nn.subs.find(s => s.id === sg.sp.id).nodes.find(n => !sg.sp.nodes.some(m => m.id === n.id));
      if (added) setSel({
        objs: new Set([sg.o.id]),
        nodes: new Set([added.id])
      });
      return;
    }
    const o = hitObj(pt);
    if (o) {
      if (o.type === 'text') {
        setSel({objs: new Set([o.id]), nodes: new Set()});
        setEditingText({id: o.id, isNew: false});
        return;
      }
      setSel({
        objs: new Set([o.id]),
        nodes: new Set()
      });
      setTool('node');
    }
  };

  /* ---- aksi ---- */
  const setProp = (k, v) => commitObjs(o => sel.objs.has(o.id) && !o.locked && o[k] !== v ? {
    ...o,
    [k]: v
  } : o, 'p:' + k);
  const delSel = () => {
    const curSel = selRef.current;
    if (curSel.nodes.size) {
      const ok = commitObjs(o => curSel.objs.has(o.id) && !o.locked ? VE.deleteNodes(o, curSel.nodes) : o);
      if (ok) {
        const remainingObjIds = new Set();
        docRef.current.objects.forEach(o => {
          if (curSel.objs.has(o.id)) remainingObjIds.add(o.id);
        });
        setSel({
          objs: remainingObjIds,
          nodes: new Set()
        });
        say(curSel.nodes.size + (prefs && prefs.lang === 'en' ? ' nodes deleted' : ' node dihapus'), { label: prefs && prefs.lang === 'en' ? 'Undo' : 'Urungkan', onClick: undo });
      }
    } else if (curSel.objs.size) {
      const d = docRef.current;
      const delBgGrps = new Set();
      d.objects.forEach(o => {
        if (curSel.objs.has(o.id) && !o.locked && (o.isFrameBg || o.isAutoFrame) && o.group) delBgGrps.add(o.group);
      });
      const changed = commitObjs(o => {
        if (curSel.objs.has(o.id) && !o.locked) return null;
        if (o.group && delBgGrps.has(o.group)) return {
          ...o,
          group: null,
          containerType: null
        };
        return o;
      });
      setSel({
        objs: new Set(),
        nodes: new Set()
      });
      if (changed) say('Objek dihapus', { label: 'Urungkan', onClick: undo });
    }
  };
  const dup = () => {
    if (!selObjs.length) return;
    const d = docRef.current,
      cp = cloneWithGroups(d.objects, sel.objs, 10, 10);
    if (!cp.length) return;
    commit({
      ...d,
      objects: VE.compactGroups([...d.objects, ...cp])
    });
    setSel({
      objs: new Set(cp.map(o => o.id)),
      nodes: new Set()
    });
  };
  /* [ ] naik/turun satu langkah: menggunakan VE.arrangeZOrder('forward' / 'backward') yang sadar-Frame */
  const reorder = up => {
    const nd = VE.arrangeZOrder(docRef.current, sel.objs, up ? 'forward' : 'backward');
    if (nd !== docRef.current) commit(nd);
  };
  const cntNodes = () => docRef.current.objects.reduce((s, o) => s + vinfo(o).n, 0);
  /* Luruskan seleksi: handle terpilih → rapikan handle; ≥2 node terpilih → jajarkan node (dan luruskan segmen di antaranya) */
  const alignSel = soft => {
    if (selHandles.size) {
      const ok = commitObjs(o => sel.objs.has(o.id) ? VE.alignHandles(o, selHandles, {}) : o);
      say(ok ? selHandles.size + ' handle diluruskan' : 'Handle sudah lurus');
      return true;
    }
    if (selNodes.size >= 2) {
      const ok = commitObjs(o => sel.objs.has(o.id) ? VE.alignNodes(o, selNodes, {
        soft
      }) : o);
      say(ok ? selNodes.size + ' node diluruskan' : 'Node sudah lurus');
      return true;
    }
    return false;
  };
  const applyStraight = () => {
    if (!selObjs.length) return say('Pilih objek dulu');
    if (alignSel(false)) return;
    const b = cntNodes();
    commitObjs(o => sel.objs.has(o.id) ? VE.straighten(o, sOpt.maxDev, sOpt.angTol) : o);
    say('Garis diluruskan · ' + Math.max(0, b - cntNodes()) + ' node dihapus');
  };
  const applyAutoRefine = () => {
    if (!selObjs.length) return say('Pilih objek dulu');
    const res = VE.autoRefineGeometry(docRef.current, {
      only: sel.objs,
      lineTol: sOpt.maxDev
    });
    if (!res.changed) return say('Tidak ada segmen/sudut yang perlu dirapikan');
    const mp = new Map(res.doc.objects.map(o => [o.id, o]));
    commitObjs(o => mp.get(o.id) || o, 'auto-refine');
    say(`Dirapikan · ${res.straightenedCount} segmen diluruskan, ${res.smoothedCornerCount} sudut di-smooth`);
  };
  const applyPruneNodes = () => {
    if (!selObjs.length) return say('Pilih objek dulu');
    const before = cntNodes();
    const res = VE.deleteNonCornerNodes(docRef.current, {
      only: sel.objs,
      tol: pruneOpt.tol,
      cornerDeg: pruneOpt.cornerDeg
    });
    if (!res.changed) return say('Tidak ada node non-sudut yang bisa dihapus (' + res.cornerCount + ' sudut terdeteksi)');
    const mp = new Map(res.doc.objects.map(o => [o.id, o]));
    commitObjs(o => mp.get(o.id) || o, 'prune-non-corner');
    say(`${res.removedCount} node non-sudut dihapus · ${res.cornerCount} sudut dipertahankan · ${before} → ${cntNodes()} node`);
  };
  const applyNodeAngleAlign = (overrideDeg, overrideMode) => {
    if (!selObjs.length) return say('Pilih objek dulu');
    if (selHandles.size) {
      const ok = commitObjs(o => sel.objs.has(o.id) ? VE.alignHandles(o, selHandles, {}) : o);
      return say(ok ? selHandles.size + ' handle diluruskan' : 'Handle sudah lurus');
    }
    if (selNodes.size < 2) return say('Pilih minimal 2 node yang ingin disejajarkan');
    const mode = overrideMode || alOpt.mode;
    const deg = overrideDeg != null ? overrideDeg : alOpt.deg;
    const ok = commitObjs(o => sel.objs.has(o.id) ? VE.alignNodesAtAngle(o, selNodes, {
      angleMode: mode,
      angleDeg: deg,
      anchor: alOpt.anchor,
      slideEdges: alOpt.slide,
      collapse: alOpt.collapse
    }) : o, 'node-al');
    say(ok ? `${selNodes.size} node disejajarkan (${mode === 'custom' ? deg + '°' : mode === 'perp' ? (prefs.lang === 'en' ? '⊥ 90° Perpendicular' : '⊥ 90° Batang') : mode === 'parallel' ? (prefs.lang === 'en' ? '∥ Parallel' : '∥ Seberang') : 'Auto'})` : 'Node sudah sejajar pada sudut tersebut');
  };
  const applySharpen = () => {
    if (!selObjs.length) return say('Pilih objek / node sudut dulu');
    const ids = selNodes.size ? selNodes : null,
      b = cntNodes();
    commitObjs(o => sel.objs.has(o.id) ? VE.sharpenCorners(o, ids) : o);
    const k = b - cntNodes();
    say(k > 0 ? k + ' sudut tumpul dilancipkan' : ids ? 'Node dijadikan corner tajam' : 'Tidak ada sudut tumpul yang terdeteksi');
  };
  const applySmoothNodes = () => {
    if (!selNodes.size) return say('Pilih node yang mau dihaluskan');
    commitObjs(o => sel.objs.has(o.id) ? VE.smoothSelectedNodes(o, selNodes, .6) : o);
    say(selNodes.size + ' node dihaluskan (Taubin + handle G1)');
  };
  const applyType = t => {
    const curSel = selRef.current;
    if (!curSel.nodes.size) return say(prefs && prefs.lang === 'en' ? 'Select nodes first' : 'Pilih node dulu');
    if (t === 'corner' && selHandles.size) {
      alignSel(true);
      return;
    } /* Corner pada handle terpilih = luruskan handle */
    let al = false;
    const ok = commitObjs(o => {
      if (!curSel.objs.has(o.id) || o.locked) return o;
      const r = VE.typeNodes(o, curSel.nodes, t);
      if (t !== 'corner' || curSel.nodes.size < 2) return r;
      const r2 = VE.alignNodes(r, curSel.nodes, {
        soft: true
      });
      if (r2 !== r) al = true;
      return r2;
    });
    if (al) {
      say(curSel.nodes.size + (prefs && prefs.lang === 'en' ? ' nodes set to corner & aligned' : ' node dijadikan corner & diluruskan'));
    } else if (ok) {
      const typeLabel = t === 'corner'
        ? (prefs && prefs.lang === 'en' ? 'corner' : 'sudut (corner)')
        : t === 'smooth'
        ? (prefs && prefs.lang === 'en' ? 'smooth' : 'halus (smooth)')
        : (prefs && prefs.lang === 'en' ? 'symmetric' : 'simetris (symmetric)');
      say(curSel.nodes.size + (prefs && prefs.lang === 'en' ? ` nodes changed to ${typeLabel}` : ` node diubah menjadi ${typeLabel}`));
    }
  };
  const MIRROR_OPTS = [['corner', 'veMirrorNone', L.edMirrorFree, 'M4.5 7.5L10 11 M14 11l5.5-3.5 M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M3 6.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0 M18 6.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0'], ['freeCurve', 'veMirrorCurve', L.edMirrorCurve, 'M4 16.5C6.5 8.5 9.5 8.5 10.5 11 M13.5 13C15 16 18 16 20 7.5 M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0'], ['smooth', 'veMirrorAngle', 'Mirror angle', 'M3.5 14.5L10 12.4 M14 11.6L19.5 9.8 M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M2.5 15a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0'], ['symmetric', 'veMirrorAL', 'Mirror angle and length', 'M4.5 14.5L10 12.6 M14 11.4L19.5 9.5 M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M3 15a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0 M18 9a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0']];
  const applyMirror = m => {
    setMirrorOpen(false);
    const curSel = selRef.current;
    if (!curSel.nodes.size) return say(prefs && prefs.lang === 'en' ? 'Select nodes or handles first to set mirroring' : 'Pilih node atau handle dulu untuk mengatur mirroring');
    const nm = (MIRROR_OPTS.find(q => q[0] === m) || [])[2];
    const ok = commitObjs(o => curSel.objs.has(o.id) && !o.locked ? VE.mirrorNodes(o, curSel.nodes, m, selHandles) : o);
    say(ok ? nm + ': ' + curSel.nodes.size + ' node' : 'Sudah ' + nm);
  };
  const applyAutoSmooth = () => {
    const curSel = selRef.current;
    const ids = curSel.nodes.size ? curSel.nodes : null;
    const ok = commitObjs(o => curSel.objs.has(o.id) && !o.locked ? VE.autoHandles(o, null, { preserveShape: false, ids, tau: 1 / 3 }) : o);
    say(ok ? (curSel.nodes.size ? curSel.nodes.size + ' node dihaluskan otomatis' : 'Kurva dihaluskan otomatis') : 'Kurva sudah halus');
  };
  const applyConvertToCurves = () => {
    const curSel = selRef.current;
    const ids = curSel.nodes.size ? curSel.nodes : null;
    const ok = commitObjs(o => curSel.objs.has(o.id) && !o.locked ? VE.autoHandles(o, null, { preserveShape: true, ids }) : o);
    say(ok
      ? (curSel.nodes.size
          ? (prefs && prefs.lang === 'en' ? `${curSel.nodes.size} nodes converted to Bézier curves` : `${curSel.nodes.size} node diubah menjadi kurva Bézier`)
          : (prefs && prefs.lang === 'en' ? 'Shape converted to Bézier curves' : 'Bentuk diubah menjadi kurva Bézier'))
      : (prefs && prefs.lang === 'en' ? 'Already Bézier curves' : 'Bentuk sudah berupa kurva Bézier'));
  };
  const applyJoinNodes = () => {
    const curSel = selRef.current;
    if (curSel.nodes.size !== 2) return say(prefs && prefs.lang === 'en' ? 'Select exactly 2 nodes to join' : 'Pilih tepat 2 node untuk digabung');
    const ok = commitObjs(o => curSel.objs.has(o.id) && !o.locked ? VE.joinNodes(o, curSel.nodes) : o);
    if (ok) {
      const remainingNodeIds = new Set();
      docRef.current.objects.forEach(o => {
        if (!curSel.objs.has(o.id) || !o.subs) return;
        o.subs.forEach(sp => sp.nodes.forEach(n => {
          if (curSel.nodes.has(n.id)) remainingNodeIds.add(n.id);
        }));
      });
      setSel({ ...curSel, nodes: remainingNodeIds });
      say(prefs && prefs.lang === 'en' ? '2 nodes joined' : '2 node digabung');
    } else {
      say(prefs && prefs.lang === 'en' ? 'Nodes cannot be joined' : 'Node tidak dapat digabung');
    }
  };
  const applySplitPath = () => {
    const curSel = selRef.current;
    if (!curSel.nodes.size) return say('Pilih node tempat path dipotong');
    const ok = commitObjs(o => curSel.objs.has(o.id) && !o.locked ? VE.splitPath(o, curSel.nodes) : o);
    say(ok ? 'Path dipotong di node terpilih' : 'Path tidak dapat dipotong di node terpilih');
  };
  const applyReversePath = () => {
    const curSel = selRef.current;
    const ok = commitObjs(o => curSel.objs.has(o.id) && !o.locked ? VE.reversePath(o, curSel.nodes.size ? curSel.nodes : null) : o);
    say(ok ? 'Arah path dibalik' : 'Arah path tidak dapat dibalik');
  };
  const doInsert = () => {
    const curSel = selRef.current;
    if (curSel.nodes.size < 2) return say('Pilih dua node yang bersebelahan, atau klik dua kali pada garis path');
    let c = 0;
    commitObjs(o => {
      if (!curSel.objs.has(o.id)) return o;
      const r = VE.insertMid(o, curSel.nodes);
      c += r.cnt;
      return r.cnt ? r.o : o;
    });
    say(c ? c + ' node disisipkan' : 'Node terpilih tidak bersebelahan');
  };
  const setClosed = v => {
    const curSel = selRef.current;
    let anyChanged = false;
    commitObjs(o => {
      if (!curSel.objs.has(o.id) || o.locked || o.img || !o.subs) return o;
      let oChanged = false;
      const targetSubIds = new Set();
      if (curSel.nodes.size > 0) {
        o.subs.forEach(sp => {
          if (sp.nodes.some(n => curSel.nodes.has(n.id))) targetSubIds.add(sp.id);
        });
      }
      const newSubs = o.subs.map(sp => {
        if (targetSubIds.size > 0 && !targetSubIds.has(sp.id)) return sp;
        if (sp.closed !== v) {
          oChanged = true;
          return { ...sp, closed: v };
        }
        return sp;
      });
      if (oChanged) anyChanged = true;
      return oChanged ? { ...o, subs: newSubs } : o;
    });
    const label = v
      ? (prefs && prefs.lang === 'en' ? (anyChanged ? 'Path closed' : 'Path already closed') : (anyChanged ? 'Path ditutup' : 'Path sudah tertutup'))
      : (prefs && prefs.lang === 'en' ? (anyChanged ? 'Path opened' : 'Path already open') : (anyChanged ? 'Path dibuka' : 'Path sudah terbuka'));
    say(label);
  };
  const {
    exportSvg,
    downloadSvg,
    triggerDl,
    isRasterFmt,
    hasImgs,
    expOk,
  } = useEditorExport({
    docRef,
    selRef,
    expFmt,
    expScale,
    exportArea,
    bg,
    clipFrames,
    projectId,
    sceneRendererRef,
    say,
    documentForExport,
    prefs,
  });

  // Bind VectorEditor instance to AI Live Bridge
  useEffect(() => {
    aiLiveConnector.bindEditor({
      commit: (d, key) => commit(d, key),
      getDoc: () => docRef.current,
      setDoc: (d) => commit(d),
      setSelection: (ids) => setSel({ objs: new Set(ids), nodes: new Set() }),
      getSelection: () => Array.from(selRef.current?.objs || []),
      undo: () => undo(),
      redo: () => redo(),
      setTool: (t) => setTool(t),
      getTool: () => tool,
      setZoom: (z) => setZoom(Math.max(0.05, Math.min(64, Number(z) || 1))),
      getZoom: () => zoom,
      setArtboard: ({ width, height, bg: nextBg }) => {
        const cur = docRef.current;
        const w = Number(width || (cur.viewBox ? cur.viewBox[2] : 800));
        const h = Number(height || (cur.viewBox ? cur.viewBox[3] : 600));
        if (nextBg) {
          setBg({ mode: 'solid', color: nextBg });
        }
        commit({
          ...cur,
          viewBox: [0, 0, w, h]
        }, 'AI Resize Artboard');
      },
      insertIconify: async (iconName) => {
        await onIconifyInsert(iconName);
        return {
          success: true,
          icon: iconName,
          selection: Array.from(selRef.current?.objs || [])
        };
      },
      simplifyCurves: ({ level = 100, tolerance } = {}) => {
        const res = VE.simplifyDoc(docRef.current, { level, wholePaths: true, tolerance });
        if (res && res.doc) {
          commit(res.doc, 'AI Simplify Curves');
        }
        return {
          success: true,
          before: res?.before,
          after: res?.after
        };
      },
      booleanOperation: ({ op = 'union' }) => {
        const curDoc = docRef.current;
        const selIds = selRef.current?.objs?.size
          ? selRef.current.objs
          : new Set((curDoc.objects || []).map(o => o.id));
        const res = VE.booleanDoc(curDoc, op, selIds);
        if (res && res.doc) {
          commit(res.doc, `AI Boolean ${op}`);
        }
        return {
          success: true,
          op,
          objectsCount: res?.doc?.objects?.length || curDoc.objects.length
        };
      },
      cornerFillet: ({ radius = 12, mode = 'circular' }) => {
        const curDoc = docRef.current;
        const selIds = selRef.current?.objs || new Set();
        const nextObjects = (curDoc.objects || []).map(o => {
          if (selIds.size > 0 && !selIds.has(o.id)) return o;
          if (o.type !== 'path' || !o.subs || !o.subs.length) return o;
          return VE.setCornerRadius(o, Number(radius), { mode });
        });
        const nextDoc = { ...curDoc, objects: nextObjects };
        commit(nextDoc, 'AI Corner Fillet');
        return { success: true, radius, mode };
      },
      exportSvg: () => {
        try {
          return VE.serializeDoc(docRef.current, { bg, clipFrames });
        } catch (_) {
          return '';
        }
      }
    });
    return () => {
      aiLiveConnector.unbindEditor();
    };
  }, [onIconifyInsert]);



  /* ---- VectorCraft Object › Path › Simplify (Slider Strip + More Options Dialog + Live Preview) ---- */
  const computeVcSimpPreview = (baseDoc, baseSel, nextState) => {
    if (!nextState.preview) {
      const targetObjs = baseDoc.objects.filter(o => !o.hidden && !o.locked && !o.img && !o.isFrameBg && !o.isAutoFrame && (!baseSel.objs.size || baseSel.objs.has(o.id)));
      const cnt = targetObjs.reduce((s, o) => s + o.subs.reduce((a, sp) => a + sp.nodes.length, 0), 0);
      live(baseDoc);
      return {
        ...nextState,
        before: cnt,
        after: cnt,
        lastRes: null
      };
    }
    const params = nextState.mode === 'slider' ? {
      level: nextState.level,
      cornerAngle: 180.0 - nextState.angleThreshold,
      straightLines: nextState.straightLines
    } : {
      tolerance: nextState.tolerance,
      cornerAngle: 180.0 - nextState.angleThreshold,
      straightLines: nextState.straightLines
    };
    const res = VE.simplifyDoc(baseDoc, params, baseSel.objs, baseSel.nodes);
    live(res.doc);
    return {
      ...nextState,
      before: res.before,
      after: res.after,
      lastRes: res
    };
  };
  const openVcSimplify = (forceMode = null) => {
    const curS = vcSimpRef.current;
    const baseDoc = curS ? curS.baseDoc : docRef.current;
    const baseSel = curS ? curS.baseSel : {
      objs: new Set(selRef.current.objs),
      nodes: new Set(selRef.current.nodes)
    };
    const editableObjs = baseDoc.objects.filter(o => !o.hidden && !o.locked && !o.img && !o.isFrameBg && !o.isAutoFrame && (!baseSel.objs.size || baseSel.objs.has(o.id)));
    if (!editableObjs.length) {
      say('Pilih atau buat objek path vektor terlebih dahulu untuk Simplify');
      return;
    }
    const bb = VE.docBounds({
      objects: editableObjs
    });
    const size = bb ? Math.max(bb[2] - bb[0], bb[3] - bb[1]) : 0;
    const autoLvl = VE.autoSimplifyLevel(size);
    const mode = forceMode || (vcSimpRetain ? 'dialog' : 'slider');
    const tol = mode === 'dialog' && vcSimpRetain ? vcSimpSaved.tolerance : VE.simplifyLevelTolerance(autoLvl);
    const init = {
      mode,
      baseDoc,
      baseSel,
      autoLevel: autoLvl,
      level: autoLvl,
      tolerance: Math.round(tol * 1000) / 1000,
      angleThreshold: vcSimpRetain ? vcSimpSaved.angleThreshold : 150.0,
      straightLines: vcSimpRetain ? vcSimpSaved.straightLines : false,
      showOriginal: vcSimpRetain ? vcSimpSaved.showOriginal : false,
      retain: vcSimpRetain,
      preview: true,
      before: 0,
      after: 0,
      lastRes: null
    };
    const next = computeVcSimpPreview(baseDoc, baseSel, init);
    setVcSimp(next);
  };
  const updateVcSimplify = patch => {
    const curS = vcSimpRef.current;
    if (!curS) return;
    const merged = {
      ...curS,
      ...patch
    };
    if (patch.level !== undefined && patch.tolerance === undefined) {
      merged.tolerance = Math.round(VE.simplifyLevelTolerance(patch.level) * 1000) / 1000;
    } else if (patch.tolerance !== undefined && patch.level === undefined) {
      const l = 50.0 - 10.0 * Math.log2(Math.max(1e-4, patch.tolerance));
      merged.level = clampN(Math.round(l), 0, 100);
    }
    const next = computeVcSimpPreview(curS.baseDoc, curS.baseSel, merged);
    setVcSimp(next);
  };
  const triggerAutoSimplifyLevel = () => {
    const curS = vcSimpRef.current;
    if (!curS) {
      openVcSimplify('slider');
      return;
    }
    updateVcSimplify({
      level: 100,
      tolerance: Math.round(VE.simplifyLevelTolerance(100) * 1000) / 1000
    });
    say('Auto-Simplify: Level 100 (0.031 pt - 100% presisi kurva)');
  };
  const autoSimplifyAllCanvasObjects = () => {
    const curDoc = docRef.current;
    const res = VE.autoSimplifyDoc(curDoc);
    if (res.changed && res.count > 0) {
      commit(res.doc, null);
      say(`Auto-Simplify 100%: ${res.count} objek dioptimalkan · ${res.before} → ${res.after} node`);
      return res;
    }
    say('Auto-Simplify: semua objek di kanvas sudah optimal');
    return { ...res, count: 0, changed: false };
  };
  const openVcMoreOptions = () => {
    const curS = vcSimpRef.current;
    if (!curS) {
      openVcSimplify('dialog');
      return;
    }
    const tol = Math.round(VE.simplifyLevelTolerance(curS.level) * 1000) / 1000;
    const merged = {
      ...curS,
      mode: 'dialog',
      tolerance: tol,
      preview: true
    };
    const next = computeVcSimpPreview(curS.baseDoc, curS.baseSel, merged);
    setVcSimp(next);
  };
  const confirmVcSimplify = () => {
    const curS = vcSimpRef.current;
    if (!curS) return;
    const params = curS.mode === 'slider' ? {
      level: curS.level,
      cornerAngle: 180.0 - curS.angleThreshold,
      straightLines: curS.straightLines
    } : {
      tolerance: curS.tolerance,
      cornerAngle: 180.0 - curS.angleThreshold,
      straightLines: curS.straightLines
    };
    const res = VE.simplifyDoc(curS.baseDoc, params, curS.baseSel.objs, curS.baseSel.nodes);
    if (curS.mode === 'dialog') {
      setVcSimpRetain(curS.retain);
      try {
        localStorage.setItem('vc-simplify-retain', curS.retain ? '1' : '0');
      } catch (e) {}
      if (curS.retain) {
        const saved = {
          tolerance: curS.tolerance,
          angleThreshold: curS.angleThreshold,
          straightLines: curS.straightLines,
          showOriginal: curS.showOriginal
        };
        setVcSimpSaved(saved);
        try {
          localStorage.setItem('vc-simplify-opts', JSON.stringify(saved));
        } catch (e) {}
      }
    }
    setVcSimp(null);
    if (res.changed) {
      /* Reset ke baseDoc terlebih dahulu agar push() merekam baseDoc ke Undo stack dalam satu langkah */
      docRef.current = curS.baseDoc;
      const taggedObjs = res.doc.objects.map(o => (curS.baseSel.objs.size === 0 || curS.baseSel.objs.has(o.id)) ? { ...o, _autoSimplified: true } : o);
      commit({ ...res.doc, objects: taggedObjs }, null);
      setSel({
        objs: curS.baseSel.objs,
        nodes: res.nextSelNodes || new Set()
      });
      say(`Simplify diterapkan · Anchor Points: ${res.before} → ${res.after}`);
    } else {
      live(curS.baseDoc);
      say(`Simplify: tidak ada perubahan (${res.before} anchor points)`);
    }
    if (tool === 'simplify') setTool('select');
  };
  const cancelVcSimplify = () => {
    const curS = vcSimpRef.current;
    if (!curS) return;
    live(curS.baseDoc);
    setSel(curS.baseSel);
    setVcSimp(null);
    if (tool === 'simplify') setTool('select');
    say('Simplify dibatalkan');
  };

  /* ---- Boolean / Pathfinder: gabung 2+ objek path tertutup jadi satu ---- */
  const BOOL_LABEL: Record<string, string> = { union: 'Union', subtract: 'Subtract', intersect: 'Intersect', exclude: 'Exclude', divide: 'Divide' };
  const applyBoolean = op => {
    const res = VE.booleanDoc(docRef.current, op, selRef.current.objs);
    if (!res.changed) {
      if (res.reason === 'need2') return say('Pilih 2+ objek path untuk Boolean');
      if (res.reason === 'need2closed') return say('Boolean butuh 2+ objek path tertutup');
      if (res.reason === 'empty') return say('Boolean: hasil kosong (bentuk saling meniadakan)');
      return say('Boolean: tidak ada perubahan');
    }
    commit(res.doc, null);
    const nextSelIds = (res.resultIds && res.resultIds.length) ? res.resultIds : (res.resultId ? [res.resultId] : []);
    setSel({ objs: new Set(nextSelIds), nodes: new Set() });
    const st = res.stats;
    say(`Boolean ${BOOL_LABEL[op] || op}: ${st.inObjects} objek → ${st.outObjects || st.outRings} ${op === 'divide' ? 'objek terbagi' : 'ring'}${st.outNodes !== undefined ? `, ${st.outNodes} node` : ''}${st.skippedOpen ? ` · ${st.skippedOpen} subpath terbuka dilewati` : ''}`);
  };

  /* ---- Compound Path (Task 3): Make / Release Compound Path ---- */
  const applyMakeCompoundPath = () => {
    const res = VE.makeCompoundPathDoc(docRef.current, selRef.current.objs);
    if (!res.changed) {
      if (res.reason === 'need2') return say(prefs?.lang === 'en' ? 'Select 2+ path objects to make compound path' : 'Pilih 2+ objek path untuk Make Compound Path');
      return say(prefs?.lang === 'en' ? 'Make Compound Path: no changes' : 'Make Compound Path: tidak ada perubahan');
    }
    commit(res.doc, null);
    setSel({ objs: new Set([res.resultId]), nodes: new Set() });
    const st = res.stats;
    say(prefs?.lang === 'en' ? `Compound Path created (${st.inObjects} objects → 1 compound path, ${st.outSubs} subpaths)` : `Compound Path dibuat (${st.inObjects} objek → 1 compound path, ${st.outSubs} subpath)`);
  };

  const applyReleaseCompoundPath = () => {
    const res = VE.releaseCompoundPathDoc(docRef.current, selRef.current.objs);
    if (!res.changed) {
      if (res.reason === 'nocmp') return say(prefs?.lang === 'en' ? 'Select a compound path (with 2+ subpaths) to release' : 'Pilih compound path (dengan 2+ subpath) untuk dilepas');
      return say(prefs?.lang === 'en' ? 'Release Compound Path: no changes' : 'Release Compound Path: tidak ada perubahan');
    }
    commit(res.doc, null);
    setSel({ objs: new Set(res.resultIds), nodes: new Set() });
    const st = res.stats;
    say(prefs?.lang === 'en' ? `Compound Path released (${st.inObjects} compound → ${st.outObjects} objects)` : `Compound Path dilepas (${st.inObjects} compound → ${st.outObjects} objek)`);
  };

  /* ---- Separate Icon Objects: pisahkan bagian-bagian ikon menjadi objek terpisah (lubang tetap menyatu dengan induknya) ---- */
  const applySeparateIconObjects = () => {
    const res = VE.separateIconObjectsDoc(docRef.current, selRef.current.objs);
    if (!res.changed) {
      if (res.reason === 'singleisland') return say('Ikon ini hanya terdiri dari 1 bentuk utuh (tidak ada bagian terpisah)');
      return say('Pilih ikon atau objek dengan 2+ bagian terpisah terlebih dahulu');
    }
    commit(res.doc, 'separate-icon');
    setSel({ objs: new Set(res.resultIds), nodes: new Set() });
    const st = res.stats;
    say(`Ikon dipisahkan menjadi ${st.outObjects} objek mandiri`);
  };
  /* ---- Fill Empty Space (Isi Ruang Kosong): isi kantong ruang kosong tertutup yang terhubung langsung ke objek terpilih ---- */
  const applyFillEmptySpace = () => {
    const res = VE.fillEmptySpaceDoc(docRef.current, selRef.current.objs);
    const isEn = prefs?.lang === 'en';
    if (!res.changed) {
      if (res.reason === 'noempty') {
        return say(isEn ? 'No enclosed empty space found around selection' : 'Tidak ditemukan ruang kosong tertutup di sekitar objek terpilih');
      }
      if (res.reason === 'notouch') {
        return say(isEn ? 'Selected object is not directly connected to any empty space (separated by another object)' : 'Objek terpilih tidak terhubung langsung ke ruang kosong (terpisah oleh objek lain)');
      }
      return say(isEn ? 'Select at least one closed path object first' : 'Pilih minimal satu objek path tertutup terlebih dahulu');
    }
    commit(res.doc, 'fill-empty-space');
    if (res.resultIds && res.resultIds.length) {
      setSel({ objs: new Set(res.resultIds), nodes: new Set() });
    }
    const st = res.stats || { updatedObjects: 1, filledPockets: 1 };
    say(
      isEn
        ? `Filled ${st.filledPockets} empty space(s) into ${st.updatedObjects} object(s)`
        : `${st.filledPockets} ruang kosong berhasil diisi ke ${st.updatedObjects} objek`
    );
  };
  /* ---- Outline Stroke: ubah stroke jadi bentuk berisi (fill = warna stroke) ---- */
  const applyOutlineStroke = () => {
    const res = VE.outlineStrokeDoc(docRef.current, selRef.current.objs);
    if (!res.changed) {
      if (res.reason === 'nostroke') return say('Pilih objek dengan stroke (lebar > 0) untuk Outline Stroke');
      if (res.reason === 'needpath') return say('Pilih objek path dulu');
      return say('Outline Stroke: tidak ada perubahan');
    }
    commit(res.doc, null);
    setSel({ objs: new Set(selRef.current.objs), nodes: new Set() });
    const st = res.stats;
    say(`Outline Stroke: ${st.objects} objek → ${st.outSubs} subpath${st.droppedFill ? ` · fill lama ${st.droppedFill} objek dibuang` : ''}`);
  };
  /* ---- Offset Path: strip pratinjau langsung (mirip Simplify slider) ---- */
  const countNodesIn = (doc, ids) => doc.objects.filter(o => ids.has(o.id)).reduce((s, o) => s + (o.subs || []).reduce((a, sp) => a + (sp.nodes || []).length, 0), 0);
  const computeOffPreview = (baseDoc, baseSel, nextState) => {
    const res = VE.offsetDoc(baseDoc, baseSel.objs, nextState.dist, nextState.join, nextState.miterLimit);
    live(res.doc);
    return {
      ...nextState,
      before: countNodesIn(baseDoc, baseSel.objs),
      after: countNodesIn(res.doc, baseSel.objs),
      lastRes: res
    };
  };
  const openOffsetStrip = () => {
    const curS = offStripRef.current;
    const baseDoc = curS ? curS.baseDoc : docRef.current;
    const baseSel = curS ? curS.baseSel : { objs: new Set(selRef.current.objs), nodes: new Set() };
    const editableObjs = baseDoc.objects.filter(o => !o.hidden && !o.locked && !o.img && !o.text && o.subs && o.subs.length && (!baseSel.objs.size || baseSel.objs.has(o.id)));
    if (!editableObjs.length) {
      say('Pilih objek path dulu');
      return;
    }
    const init = {
      baseDoc,
      baseSel,
      dist: 10,
      join: 'miter',
      miterLimit: 4,
      before: 0,
      after: 0,
      lastRes: null
    };
    const next = computeOffPreview(baseDoc, baseSel, init);
    setOffStrip(next);
  };
  const updateOffsetStrip = patch => {
    const curS = offStripRef.current;
    if (!curS) return;
    const merged = { ...curS, ...patch };
    const next = computeOffPreview(curS.baseDoc, curS.baseSel, merged);
    setOffStrip(next);
  };
  const confirmOffsetStrip = () => {
    const curS = offStripRef.current;
    if (!curS) return;
    const res = VE.offsetDoc(curS.baseDoc, curS.baseSel.objs, curS.dist, curS.join, curS.miterLimit);
    setOffStrip(null);
    if (res.changed) {
      /* Reset ke baseDoc terlebih dahulu agar push() merekam baseDoc ke Undo stack dalam satu langkah */
      docRef.current = curS.baseDoc;
      commit(res.doc, null);
      setSel({ objs: curS.baseSel.objs, nodes: new Set() });
      const st = res.stats;
      say(`Offset ${curS.dist}pt diterapkan: ${st.objects} objek${st.droppedSubs ? ` · ${st.droppedSubs} subpath lenyap` : ''}`);
    } else {
      live(curS.baseDoc);
      say('Offset: tidak ada perubahan');
    }
  };
  const cancelOffsetStrip = () => {
    const curS = offStripRef.current;
    if (!curS) return;
    live(curS.baseDoc);
    setDocS(curS.baseDoc);
    setSel(curS.baseSel);
    setOffStrip(null);
    say('Offset dibatalkan');
  };

  /* ---- context menu: copy / paste / undo / redo / duplicate / flatten / group ---- */
  const selected = () => docRef.current.objects.filter(o => selRef.current.objs.has(o.id));
  /* Salin multi-MIME: text/plain (kode SVG) + image/png dalam SATU ClipboardItem; objek internal tetap utuh via clipRef */
  const writeSysClip = (txt, svg, ids) => {
    const cb = navigator.clipboard;
    if (!cb) return;
    const plain = () => {
      try {
        const p = cb.writeText(txt);
        p && p.catch && p.catch(() => {});
      } catch (x) {}
    };
    if (svg && window.ClipboardItem && cb.write) {
      try {
        const png = VE.exportRaster(docRef.current, {
          bg: {
            mode: 'transparent'
          },
          area: 'sel',
          clipFrames,
          only: ids
        }, 'png', 2);
        png.catch(() => {});
        cb.write([new ClipboardItem({
          'text/plain': new Blob([txt], {
            type: 'text/plain'
          }),
          'image/png': png as any
        })]).catch(plain);
        return;
      } catch (x) {}
    }
    plain();
  };
  const copySel = () => {
    const d = docRef.current,
      effIds = new Set(selRef.current.objs);
    d.objects.forEach(o => {
      if (effIds.has(o.id) && (o.isFrameBg || o.isAutoFrame) && o.group) {
        d.objects.forEach(ch => {
          if (ch.group === o.group) effIds.add(ch.id);
        });
      }
    });
    const s = d.objects.filter(o => effIds.has(o.id));
    if (!s.length) return say('Pilih objek dulu');
    const id = VE.uid(),
      ids = new Set(s.map(o => o.id));
    let svg = '';
    try {
      svg = VE.serializeDoc(d, {
        bg: {
          mode: 'transparent'
        },
        area: 'sel',
        only: ids
      }).trim();
    } catch (x) {}
    clipRef.current = {
      objs: s,
      id,
      n: 0,
      svg
    };
    writeSysClip(svg || 'svgpeak-clip:' + id, svg, ids);
    say(s.length + ' objek disalin (SVG + PNG)');
  };
  const pasteClip = (at: any = null) => {
    const c = clipRef.current;
    if (!c || !c.objs.length) return say('Clipboard kosong');
    const d = docRef.current,
      used = new Set(d.objects.map(o => o.name)),
      gused = new Set(d.objects.map(o => o.group).filter(Boolean)),
      gm = new Map();
    const uniq = n => {
      let k = n,
        i = 2;
      while (used.has(k)) k = n + '-' + i++;
      used.add(k);
      return k;
    };
    let dx = 10 * (c.n + 1),
      dy = dx;
    if (at) {
      const bb = VE.docBounds({
        objects: c.objs
      });
      if (bb) {
        dx = at.x - (bb[0] + bb[2]) / 2;
        dy = at.y - (bb[1] + bb[3]) / 2;
      }
    }
    c.n++;
    const cp = c.objs.map(o => {
      const q = VE.translate(VE.cloneObj(o), dx, dy);
      let g = null;
      if (o.group) {
        if (!gm.has(o.group)) {
          const isF = /^frame/i.test(o.group) || c.objs.some(it => it.group === o.group && (it.containerType === 'frame' || it.isFrameBg || it.isAutoFrame));
          const prefix = isF ? 'Frame-' : 'grup-';
          let k = 1;
          while (gused.has(prefix + k)) k++;
          gused.add(prefix + k);
          gm.set(o.group, prefix + k);
        }
        g = gm.get(o.group);
      }
      const nm = (o.isFrameBg || o.isAutoFrame) && g ? (used.add(g + '-bg'), g + '-bg') : uniq(o.name);
      return {
        ...q,
        name: nm,
        group: g
      };
    });
    let finalCp = cp;
    if (autoSimplifyOnRef.current) {
      const simpClip = VE.autoSimplifyDoc({ viewBox: d.viewBox, objects: cp });
      finalCp = simpClip.doc.objects;
    }
    commit({
      ...d,
      objects: VE.compactGroups([...d.objects, ...finalCp])
    });
    setSel({
      objs: new Set(finalCp.map(o => o.id)),
      nodes: new Set()
    });
    say(finalCp.length + ' objek ditempel');
  };
  /* Flatten: gabungkan objek path terpilih menjadi satu compound path (gaya objek paling atas); satu objek bergrup = lepas dari grup */
  const flattenSel = async () => {
    const d = docRef.current,
      S = selRef.current.objs,
      paths = d.objects.filter(o => S.has(o.id) && !o.img);
    if (!paths.length) return say('Pilih objek path dulu');
    if (paths.length < 2) {
      const o = paths[0];
      if (isLegacyText(o)) {
        await convertTextSelectionToPath();
        return;
      }
      if (o.group) {
        commitObjs(q => q.id === o.id ? {
          ...q,
          group: null
        } : q);
        say('Objek dilepas dari grup');
      } else say('Pilih 2+ objek untuk di-flatten');
      return;
    }
    let resolvedPaths = paths;
    if (paths.some(isLegacyText)) {
      try {
        const registry = sceneRendererRef.current?.scene?.fontRegistry || null;
        resolvedPaths = await Promise.all(paths.map(o => isLegacyText(o) ? VE.textToPathObject(o, {registry}) : o));
      } catch (e) {
        return say('Gagal mengonversi teks untuk flatten: ' + (e && e.message || 'font tidak tersedia'));
      }
    }
    const top = resolvedPaths[resolvedPaths.length - 1],
      merged = {
        ...top,
        id: VE.uid(),
        type: 'path',
        text: undefined,
        subs: resolvedPaths.flatMap(o => VE.cloneObj(o).subs),
        group: null
      },
      ids = new Set(paths.map(o => o.id)),
      out = [];
    d.objects.forEach(o => {
      if (o.id === top.id) out.push(merged);else if (!ids.has(o.id)) out.push(o);
    });
    commit({
      ...d,
      objects: out
    });
    setSel({
      objs: new Set([merged.id]),
      nodes: new Set()
    });
    say(paths.length + ' objek di-flatten menjadi 1 path');
  };
  /* Group: objek terpilih dijadikan satu grup (dikumpulkan berurutan di posisi objek paling atas); jika seleksi = satu grup utuh → Ungroup */
  /* Bungkus objek terpilih menjadi Frame ala Figma (atau Frame kosong bila tak ada seleksi) */
  const createFrameSel = () => {
    const res = VE.createFrame(docRef.current, selRef.current.objs, {
      pad: 0,
      radius: lay.radius
    });
    commit(res.doc);
    setSel({
      objs: res.selIds,
      nodes: new Set()
    });
    alMem.current = null;
    setLay(l => ({
      ...l,
      pt: 0,
      pr: 0,
      pb: 0,
      pl: 0
    }));
    say('Dibungkus ke dalam ' + res.frameId);
  };
  /* Frame terpilih → Auto Layout: arah/gap/padding disimpulkan dari posisi saat ini sehingga objek tidak melompat */
  const convertFrameToAutoLayout = (frameName: any = null) => {
    const d = docRef.current,
      fo = selRef.current.objs.size ? d.objects.find(o => selRef.current.objs.has(o.id) && o.group) : null;
    const targetGrp = frameName || fo && fo.group;
    if (!targetGrp) return say(prefs?.lang === 'en' ? 'Select or create a Frame first' : 'Pilih sebuah Frame atau buat Frame terlebih dahulu');
    const inf = VE.inferFrameAutoLayout(d, targetGrp);
    const nextLay = {
      ...lay,
      ...inf,
      split: !(inf.pt === inf.pr && inf.pr === inf.pb && inf.pb === inf.pl)
    };
    const memberIds = new Set(d.objects.filter(o => o.group === targetGrp).map(o => o.id));
    const res = VE.applyAutoLayout(d, memberIds, {
      dir: nextLay.dir,
      cols: nextLay.cols,
      gap: nextLay.gap,
      pt: nextLay.pt,
      pr: nextLay.pr,
      pb: nextLay.pb,
      pl: nextLay.pl,
      alignX: nextLay.ax,
      alignY: nextLay.ay,
      frame: true,
      frameRadius: nextLay.radius
    });
    if (!res) return say(prefs?.lang === 'en' ? 'Empty Frame' : 'Frame kosong');
    setLay(nextLay);
    alMem.current = res.mem;
    commit(res.doc, 'alayout');
    setSel({
      objs: res.selIds,
      nodes: new Set()
    });
    say(prefs?.lang === 'en' ? `${targetGrp} converted to Auto Layout (${nextLay.dir.toUpperCase()})` : `${targetGrp} diubah menjadi Auto Layout (${nextLay.dir.toUpperCase()})`);
  };
  const groupSel = (noToggle = false) => {
    const d = docRef.current,
      S = selRef.current.objs;
    const s = d.objects.filter(o => S.has(o.id) && !o.isFrameBg && !o.isAutoFrame);
    const g0 = s.length && s[0].group;
    if (noToggle !== true && g0 && s.every(o => o.group === g0) && d.objects.filter(o => o.group === g0 && !o.isFrameBg && !o.isAutoFrame).length === s.length) {
      return ungroupIds(new Set([g0]), (isFrameGid(d, g0) ? 'Frame "' : L.edGroupWord + ' "') + g0 + '"');
    }
    if (!s.length) return say('Pilih objek untuk dikelompokkan');
    const gu = new Set(d.objects.map(o => o.group).filter(Boolean));
    let k = 1;
    while (gu.has('grup-' + k)) k++;
    const gid = 'grup-' + k;
    const sIds = new Set(s.map(o => o.id));
    let last = 0;
    d.objects.forEach((o, i) => {
      if (sIds.has(o.id)) last = i;
    });
    const rest = d.objects.filter(o => !sIds.has(o.id));
    const at = d.objects.slice(0, last).filter(o => !sIds.has(o.id)).length;
    const grouped = s.map(o => ({
      ...o,
      group: gid,
      containerType: null
    }));
    rest.splice(at, 0, ...grouped);
    commit({
      ...d,
      objects: VE.compactGroups(rest)
    });
    setSel({
      objs: sIds,
      nodes: new Set()
    });
    say(s.length + ' objek dikelompokkan (' + gid + ')');
  };
  /* Ungroup (v7.1): mendukung grup biasa MAUPUN Frame; kotak latar otomatis Frame ikut dihapus, semua child tetap terpilih */
  const isFrameGid = (d, g) => /^frame/i.test(g) || d.objects.some(o => o.group === g && (o.containerType === 'frame' || o.isFrameBg || o.isAutoFrame));
  const ungroupIds = (gids, label) => {
    const d = docRef.current,
      fs = new Set(d.objects.filter(o => gids.has(o.group) && !o.isFrameBg && !o.isAutoFrame).map(o => o.id));
    const hasBg = d.objects.some(o => gids.has(o.group) && (o.isFrameBg || o.isAutoFrame));
    if (!fs.size && !hasBg) return false;
    commitObjs(o => {
      if (!gids.has(o.group)) return o;
      if (o.isFrameBg || o.isAutoFrame) return null;
      return {
        ...o,
        group: null,
        containerType: null
      };
    });
    setSel({
      objs: fs,
      nodes: new Set()
    });
    say((label || gids.size + ' kontainer') + ' dilepas (' + fs.size + ' objek)');
    return true;
  };
  const ungroupSel = () => {
    const d = docRef.current,
      S = selRef.current.objs,
      gids = new Set();
    d.objects.forEach(o => {
      if (S.has(o.id) && o.group) gids.add(o.group);
    });
    if (!gids.size) return say('Seleksi tidak berada di dalam Grup atau Frame');
    const g1 = [...gids][0];
    ungroupIds(gids, gids.size === 1 ? (isFrameGid(d, g1) ? 'Frame "' : L.edGroupWord + ' "') + g1 + '"' : null);
  };
  const onCtx = e => {
    if (viewPend.current) flushView();
    e.preventDefault();
    const pt = toDoc(e.clientX, e.clientY),
      o = hitObj(pt);
    if (o && !selRef.current.objs.has(o.id)) setSel({
      objs: new Set([o.id]),
      nodes: new Set()
    });
    setCtx({
      x: e.clientX,
      y: e.clientY,
      pt
    });
  };
  const openLayerCtx = (e, o) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selRef.current.objs.has(o.id)) setSel({
      objs: new Set([o.id]),
      nodes: new Set()
    });
    setCtx({
      x: e.clientX,
      y: e.clientY,
      pt: null
    });
  };

  /* ---- Hook Modular: Keyboard Shortcuts ---- */
  useEditorShortcuts({
    active,
    tool,
    setTool,
    docRef,
    selRef,
    sel,
    setSel,
    selNodes,
    selObjs,
    shown,
    undo,
    redo,
    dup,
    copySel,
    delSel,
    groupSel,
    ungroupSel,
    flattenSel,
    convertTextSelectionToPath,
    applyBoolean,
    applyMakeCompoundPath,
    applyReleaseCompoundPath,
    applyOutlineStroke,
    downloadSvg,
    setSnapOn,
    snapOnRef,
    setGridOn,
    gridOnRef,
    penRef,
    finishPen,
    penUndoLast,
    curvatureRef,
    editingText,
    finishCurvature,
    curvatureUndoLast,
    spaceRef,
    setSpace,
    vcSimpRef,
    confirmVcSimplify,
    cancelVcSimplify,
    openVcSimplify,
    offStripRef,
    confirmOffsetStrip,
    cancelOffsetStrip,
    openGrp,
    snapMenuOpen,
    boolOpen,
    mirrorOpen,
    reorder,
    zoomBy,
    fitView,
    fitSel,
    commitObjs,
    setAltMeasure,
    toggleDebugMode,
    say,
    figmaKeys,
    toggleCodeInspector,
    isCodeInspectorOpen
  });
  const grpUn = (() => {
    const g = selObjs.length && selObjs[0].group;
    return !!g && selObjs.every(o => o.group === g) && doc.objects.filter(o => o.group === g).length === selObjs.length;
  })();
  const canUngroup = selObjs.some(o => !!o.group);
  const IC_PASTE = 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6v4H9z M9 12h6 M9 16h4';
  const allSelHidden = selObjs.length > 0 && selObjs.every(o => o.hidden);
  const allSelLocked = selObjs.length > 0 && selObjs.every(o => o.locked);
  const toggleSelHidden = () => {
    if (!selObjs.length) return;
    commitObjs(o => sel.objs.has(o.id) ? {
      ...o,
      hidden: !allSelHidden
    } : o);
    say(allSelHidden ? 'Layer ditampilkan' : 'Layer disembunyikan');
  };
  const toggleSelLocked = () => {
    if (!selObjs.length) return;
    commitObjs(o => sel.objs.has(o.id) ? {
      ...o,
      locked: !allSelLocked
    } : o);
    say(allSelLocked ? 'Kunci layer dibuka' : 'Layer dikunci');
  };

  /* Context menu bergaya gelap Figma, HANYA berisi fitur nyata yang dimiliki Vector Editor ini */
  /* Select Same (Task 4): dari objek terpilih pertama, pilih semua objek
     lain yang fill/stroke/tipe-nya sama. selectSame mengembalikan objek
     LAIN saja (tanpa acuan); acuan ditambahkan kembali agar jumlah
     terseleksi = jumlah total objek yang cocok di dokumen (probe Task 4),
     dan toast N menghitung seleksi akhir yang terlihat pengguna. Bila
     tidak ada yang lain, seleksi dibiarkan dan hanya toast yang tampil. */
  const selectSameCriterion = criterion => {
    const ref = selObjs[0];
    if (!ref) return;
    const ids = selectSame(docRef.current, ref, criterion);
    if (!ids.length) return say('Tidak ada objek lain yang sama');
    const all = [ref.id, ...ids];
    setSel({ objs: new Set(all), nodes: new Set() });
    say(all.length + ' objek dipilih — ' + (criterion === 'fill' ? 'fill sama' : criterion === 'stroke' ? 'stroke sama' : 'tipe sama'));
  };
  const eligiblePaths = selObjs.filter(o => !o.locked && !o.hidden && !o.img && !o.text && o.subs && o.subs.length > 0);
  const canMakeCompound = eligiblePaths.length >= 2;
  const canReleaseCompound = eligiblePaths.some(o => o.subs && o.subs.length > 1);
  const selectedIconGroups = new Set(selObjs.filter(o => o.group && (o.isIconFrame || o.icon)).map(o => o.group));
  const canSeparateIcon = eligiblePaths.some(o => o.subs && o.subs.length > 1) ||
    doc.objects.some(o => !o.locked && !o.hidden && !o.isFrameBg && !o.isAutoFrame && o.group && selectedIconGroups.has(o.group) && o.subs && o.subs.length > 1);
  const canFillEmpty = eligiblePaths.some(o => o.subs.some(sp => sp && sp.closed));
  const canBool = eligiblePaths.length >= 2;
  const ctxItems = [{
    k: 'copy',
    label: 'Copy',
    ic: ICONS.copy,
    kbd: 'Ctrl+C',
    dis: !selObjs.length,
    act: copySel
  }, {
    k: 'paste',
    label: 'Paste',
    ic: IC_PASTE,
    kbd: 'Ctrl+V',
    dis: false,
    act: () => pasteFromSystem(ctx && ctx.pt)
  }, {
    k: 'dup',
    label: 'Duplicate',
    ic: 'M8 8h12v12H8z M4 16V4h12',
    kbd: 'Ctrl+D',
    dis: !selObjs.length,
    act: dup
  }, {
    k: 'del',
    label: selNodes.size ? L.edCtxDelNode : 'Delete',
    ic: ICONS.trash,
    kbd: 'Del',
    tip: 'veDelObj',
    dis: !selObjs.length && !selNodes.size,
    act: delSel
  }, {
    sep: 1
  }, {
    k: 'undo',
    label: 'Undo',
    ic: 'M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13',
    kbd: 'Ctrl+Z',
    dis: !canUndo,
    act: undo
  }, {
    k: 'redo',
    label: 'Redo',
    ic: 'M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 13',
    kbd: 'Ctrl+Y',
    dis: !canRedo,
    act: redo
  }, {
    sep: 1
  }, {
    k: 'front',
    label: 'Bring to front',
    ic: 'M12 19V5 M5 12l7-7 7 7',
    kbd: 'Ctrl+]',
    tip: 'veUp',
    dis: !selObjs.length,
    act: () => {
      commit(VE.arrangeZOrder(docRef.current, sel.objs, 'front'));
      say('Dipindah ke paling depan');
    }
  }, {
    k: 'up',
    label: 'Bring forward',
    ic: 'M12 19V5 M5 12l7-7 7 7',
    kbd: ']',
    tip: 'veUp',
    dis: !selObjs.length,
    act: () => reorder(true)
  }, {
    k: 'down',
    label: 'Send backward',
    ic: 'M12 5v14 M19 12l-7 7-7-7',
    kbd: '[',
    tip: 'veDown',
    dis: !selObjs.length,
    act: () => reorder(false)
  }, {
    k: 'back',
    label: 'Send to back',
    ic: 'M12 5v14 M19 12l-7 7-7-7',
    kbd: 'Ctrl+[',
    tip: 'veDown',
    dis: !selObjs.length,
    act: () => {
      commit(VE.arrangeZOrder(docRef.current, sel.objs, 'back'));
      say('Dipindah ke paling belakang');
    }
  }, {
    sep: 1
  }, {
    k: 'grp',
    label: 'Group selection',
    ic: 'M3 7V3h4 M17 3h4v4 M21 17v4h-4 M7 21H3v-4 M9 9h6v6H9z',
    kbd: 'Ctrl+G',
    tip: 'veCtxGroup',
    dis: !selObjs.length,
    act: () => groupSel(true)
  }, {
    k: 'frm-sel',
    label: 'Frame selection',
    ic: 'M6 2v20M18 2v20M2 6h20M2 18h20',
    kbd: 'Ctrl+Alt+G',
    tip: 'veFrameTool',
    dis: false,
    act: createFrameSel
  }, {
    k: 'ungrp',
    label: 'Ungroup',
    ic: 'M3 7V3h4 M17 3h4v4 M21 17v4h-4 M7 21H3v-4 M9 9h2v2H9z M13 13h2v2h-2z',
    kbd: 'Ctrl+Shift+G',
    tip: 'veCtxUngroup',
    dis: !canUngroup,
    act: ungroupSel
  }, {
    k: 'flat',
    label: 'Flatten',
    ic: 'M3 12h18 M12 3v6 M9 6l3 3 3-3 M12 21v-6 M9 18l3-3 3 3',
    kbd: 'Ctrl+E',
    tip: 'veCtxFlatten',
    dis: !selObjs.some(o => !o.img),
    act: flattenSel
  }, {
    k: 'make-compound',
    label: prefs?.lang === 'en' ? 'Make Compound Path' : (L.edMakeCompound || 'Buat Compound Path'),
    ic: 'M3 3h18v18H3z M7 7h10v10H7z',
    kbd: 'Ctrl+8',
    tip: 'veMakeCompound',
    dis: !canMakeCompound,
    act: applyMakeCompoundPath
  }, {
    k: 'release-compound',
    label: prefs?.lang === 'en' ? 'Release Compound Path' : (L.edReleaseCompound || 'Lepas Compound Path'),
    ic: 'M3 3h8v8H3z M13 13h8v8h-8z',
    kbd: 'Ctrl+Shift+8',
    tip: 'veReleaseCompound',
    dis: !canReleaseCompound,
    act: applyReleaseCompoundPath
  }, {
    k: 'separate-icon',
    label: L.edSeparateIcon || (prefs?.lang === 'en' ? 'Separate Icon Objects' : 'Pisahkan Objek Ikon'),
    ic: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    tip: 'veSeparateIcon',
    dis: !canSeparateIcon,
    act: applySeparateIconObjects
  }, {
    k: 'fill-empty',
    label: L.edFillEmpty || (prefs?.lang === 'en' ? 'Fill Empty Space' : 'Isi Ruang Kosong'),
    ic: 'M4 4h16v16H4z M8 8h8v8H8z M9 12h6 M12 9v6',
    tip: 'veFillEmpty',
    dis: !canFillEmpty,
    act: applyFillEmptySpace
  }, {
    sep: 1
  }, {
    k: 'bool-divide',
    label: prefs?.lang === 'en' ? 'Divide' : (L.edBoolDivide || 'Bagi (Divide)'),
    ic: 'M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z',
    kbd: 'Ctrl+Alt+D',
    tip: 'veBoolDivide',
    dis: !canBool,
    act: () => applyBoolean('divide')
  }, ...(selObjs.some(isLegacyText) ? [{
    k: 'text-to-path',
    label: prefs?.lang === 'en' ? 'Convert to Path (Outline)' : 'Ubah Teks ke Path',
    ic: 'M4 7V4h16v3M9 20h6M12 4v16',
    kbd: 'Ctrl+Shift+O',
    dis: false,
    act: convertTextSelectionToPath
  }] : []), ...(selObjs.some(o => o && o.img && !o.locked && !o.hidden) ? [{
    k: 'auto-trace-img',
    label: prefs?.lang === 'en' ? 'Auto Trace Image to SVG' : (L.atTitle || 'Auto Trace Gambar ke SVG'),
    ic: ICONS.wand,
    tip: 'veAutoTraceRun',
    dis: false,
    act: () => autoTraceSelectedImages({
      mode: 'ultra',
      colorCount: 32,
      despeckle: 2,
      smoothness: 0.66,
      gradientMode: 'auto',
      ignoreWhite: false,
      useGpu: true,
    })
  }] : []), {
    sep: 1
  }, {
    k: 'ah-sel',
    label: L.edAhSel,
    ic: 'M3 18C7 18 8 6 12 6s5 12 9 12 M9 6h6',
    tip: 'veAutoHandle',
    dis: !selObjs.some(o => !o.img),
    act: () => autoSel(false, true)
  }, {
    k: 'ah-all',
    label: L.edAhAll,
    ic: 'M3 18C7 18 8 6 12 6s5 12 9 12 M9 6h6 M3 21h4 M17 21h4',
    tip: 'veAutoHandle',
    dis: !doc.objects.some(o => !o.img),
    act: () => autoAll(false, true)
  }, {
    k: 'vc-simplify',
    label: 'Simplify…',
    ic: ICONS.wand,
    kbd: 'S',
    tip: 'veSimplify',
    dis: !selObjs.some(o => !o.img),
    act: () => {
      setTool('simplify');
      openVcSimplify();
    }
  }, {
    sep: 1
  }, {
    k: 'show-hide',
    label: 'Show/Hide',
    ic: ICONS.eye,
    kbd: 'Ctrl+Shift+H',
    dis: !selObjs.length,
    act: toggleSelHidden
  }, {
    k: 'lock-unlock',
    label: 'Lock/Unlock',
    ic: ICONS.settings,
    kbd: 'Ctrl+Shift+L',
    dis: !selObjs.length,
    act: toggleSelLocked
  }, {
    sep: 1
  }, {
    k: 'flip-h',
    label: 'Flip horizontal',
    ic: 'M12 3v18 M8 7 3 12l5 5V7z M16 7l5 5-5 5V7z',
    kbd: 'Shift+H',
    dis: !selObjs.length,
    act: () => flipXf('h')
  }, {
    k: 'flip-v',
    label: 'Flip vertical',
    ic: 'M3 12h18 M7 8l5-5 5 5H7z M7 16l5 5 5-5H7z',
    kbd: 'Shift+V',
    dis: !selObjs.length,
    act: () => flipXf('v')
  }];

  /* ---- render ---- */
  const cur = panning ? 'var(--cur-grabbing)' : tool === 'hand' || space ? 'var(--cur-grab)' : tool === 'select' && boxHov && boxHov.cur ? boxHov.cur : tool === 'text' ? 'text' : tool === 'shape' || tool === 'frame' || tool === 'addnode' || tool === 'addhandle' || tool === 'pen' || tool === 'autohandle' || VE_DRAW_TOOLS.includes(tool) ? 'var(--cur-crosshair)' : 'var(--cur-default)';
  const nsz = 2.5 / Math.max(2.5, zoom);
  const nTotal = React.useMemo(() => doc.objects.reduce((s, o) => s + vinfo(o).n, 0), [doc.objects]);
  /* GV-002 & GV-003: Viewport Frustum Culling Bounds + Memoized Defs & Scopes */
  const cullPanQx = Math.round((pan.x || 0) / 256);
  const cullPanQy = Math.round((pan.y || 0) / 256);
  const cullBounds = React.useMemo(() => {
    const zNow = zoomRef.current || zoom || 1;
    const pNow = panRef.current || pan || {
      x: 0,
      y: 0
    };
    const bw = boxRectRef.current && boxRectRef.current.width || boxRef.current && boxRef.current.clientWidth || 1920;
    const bh = boxRectRef.current && boxRectRef.current.height || boxRef.current && boxRef.current.clientHeight || 1080;
    /* Margin besar (65% ukuran layar di ruang dunia) agar pan cepat tidak berkedip sebelum state tenang */
    const padX = bw * 0.65 / zNow + 120 / zNow;
    const padY = bh * 0.65 / zNow + 120 / zNow;
    return [-pNow.x / zNow - padX, -pNow.y / zNow - padY, (bw - pNow.x) / zNow + padX, (bh - pNow.y) / zNow + padY];
  }, [zoom, cullPanQx, cullPanQy, doc.objects.length]);
  const frameBgByGroup = React.useMemo(() => {
    const map = new Map();
    for (let i = 0, L = doc.objects.length; i < L; i++) {
      const o = doc.objects[i];
      if (o.group && !o.hidden && (o.isFrameBg || o.isAutoFrame) && !map.has(o.group)) map.set(o.group, o);
    }
    return map;
  }, [doc.objects]);
  React.useLayoutEffect(() => {
    const sr = sceneRendererRef.current;
    if (!sr) return;
    sr.setRenderEnv({
      bg,
      showGrid: gridOn,
      clipFrames,
      frameBoxes,
      frameBgByGroup,
      editingTextId: editingText?.id || null,
      accent: prefs && prefs.accent || '#13b152'
    });
    sr.setScene(doc, docRevRef.current, {
      deferSpatialIndex: !!dragRef.current || isInteractingPaintRef.current,
      onlyPaint: isInteractingPaintRef.current
    });
    if (boxRef.current) {
      const viewport = boxRectRef.current = boxRef.current.getBoundingClientRect();
      sr.setCamera(zoomRef.current, panRef.current.x, panRef.current.y, viewport.width, viewport.height);
    }
    sr.requestRender();
  }, [doc, bg, gridOn, clipFrames, frameBoxes, frameBgByGroup, editingText, renamingId, prefs && prefs.accent, prefs && prefs.theme]);
  const isBgObj = o => o.isFrameBg || o.isAutoFrame;
  /* Deteksi semua sudut (tidak terbatas 4 sudut — mendukung segitiga, persegi, poligon, bintang, dan path kompleks) */
  const cornerTargets = React.useMemo(() => selObjs.some(o => !isBgObj(o) && !o.img && !o.text) ? selObjs.filter(o => !isBgObj(o) && !o.img && !o.text) : selObjs.filter(o => !o.img && !o.text), [selObjs]);
  /* Ronde 2 T2: deteksi sudut sebagai fungsi murni atas (targets, indivOpen)
     agar setRadius bisa menghitung ulang dari docRef/selRef saat dipanggil
     dari closure gesture lama (scrub label / tahan tombol step). Memo di
     bawah memakai fungsi yang sama sehingga perilaku render tidak berubah. */
  const buildDetectedCorners = (targets, indivOpen) => {
    const list = [];
    if (!targets.length) return list;
    /* Guard performa: jika panel Individual Corner tertutup dan seleksi punya >64 objek, cukup baca dari objek utama */
    const scanObjs = !indivOpen && targets.length > 16 ? targets.slice(0, 16) : targets;
    scanObjs.forEach(o => {
      const bb = vinfo(o).bb;
      const cx = (bb[0] + bb[2]) / 2,
        cy = (bb[1] + bb[3]) / 2;
      const dirArrow = (x, y) => {
        if (!indivOpen) return '';
        const dx = x - cx,
          dy = y - cy;
        if (Math.hypot(dx, dy) < 1e-3) return '•';
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        if (ang >= -22.5 && ang < 22.5) return '→';
        if (ang >= 22.5 && ang < 67.5) return '↘';
        if (ang >= 67.5 && ang < 112.5) return '↓';
        if (ang >= 112.5 && ang < 157.5) return '↙';
        if (ang >= -67.5 && ang < -22.5) return '↗';
        if (ang >= -112.5 && ang < -67.5) return '↑';
        if (ang >= -157.5 && ang < -112.5) return '↖';
        return '←';
      };
      o.subs.forEach(sp => {
        const ns = sp.nodes,
          n = ns.length;
        if (n < 3) return;
        const isPair = (A, B) => A && B && A.fil && B.fil && A.fil.role === 'a' && B.fil.role === 'b' && A.fil.gid === B.fil.gid;
        const wrapPair = sp.closed && n > 2 && isPair(ns[n - 1], ns[0]);
        let cIdx = 0;
        if (wrapPair) {
          const A = ns[n - 1],
            B = ns[0];
          const ap = A.fil.c || {
            x: (A.x + B.x) / 2,
            y: (A.y + B.y) / 2
          };
          const key = o.id + ':' + sp.id + ':' + cIdx++;
          list.push({
            idx: list.length + 1,
            key,
            objId: o.id,
            spId: sp.id,
            nodeIds: [A.id, B.id],
            r: Math.round((A.fil.r || 0) * 10) / 10,
            x: ap.x,
            y: ap.y,
            dir: dirArrow(ap.x, ap.y)
          });
        }
        const startI = wrapPair ? 1 : 0;
        const endI = wrapPair ? n - 1 : n;
        for (let i = startI; i < endI; i++) {
          if (i + 1 < endI && isPair(ns[i], ns[i + 1])) {
            const A = ns[i],
              B = ns[i + 1];
            const ap = A.fil.c || {
              x: (A.x + B.x) / 2,
              y: (A.y + B.y) / 2
            };
            const key = o.id + ':' + sp.id + ':' + cIdx++;
            list.push({
              idx: list.length + 1,
              key,
              objId: o.id,
              spId: sp.id,
              nodeIds: [A.id, B.id],
              r: Math.round((A.fil.r || 0) * 10) / 10,
              x: ap.x,
              y: ap.y,
              dir: dirArrow(ap.x, ap.y)
            });
            i++;
            continue;
          }
          if (!sp.closed && (i === 0 || i === n - 1)) continue;
          const nd = ns[i];
          if (nd.type === 'corner') {
            const key = o.id + ':' + sp.id + ':' + cIdx++;
            list.push({
              idx: list.length + 1,
              key,
              objId: o.id,
              spId: sp.id,
              nodeIds: [nd.id],
              r: 0,
              x: nd.x,
              y: nd.y,
              dir: dirArrow(nd.x, nd.y)
            });
          }
        }
      });
    });
    return list;
  };
  const detectedCorners = React.useMemo(() => buildDetectedCorners(cornerTargets, indivCornerOpen), [indivCornerOpen, cornerTargets]);

  /* Pastikan pilihan sudut tetap sinkron saat objek berganti */
  useEffect(() => {
    if (!indivCornerOpen) return;
    if (!detectedCorners.length) {
      if (pickedCornerKeys.size) setPickedCornerKeys(new Set());
      return;
    }
    const valid = new Set(detectedCorners.map(c => c.key));
    const filtered = [...pickedCornerKeys].filter(k => valid.has(k));
    if (!filtered.length) {
      setPickedCornerKeys(new Set(detectedCorners.map(c => c.key)));
    } else if (filtered.length !== pickedCornerKeys.size) {
      setPickedCornerKeys(new Set(filtered));
    }
  }, [indivCornerOpen, indivCornerOpen ? detectedCorners.map(c => c.key).join('|') : '']);
  const activeCorners = detectedCorners.filter(c => pickedCornerKeys.has(c.key));
  const curR = (() => {
    if (sel.nodes && sel.nodes.size > 0 && detectedCorners.length) {
      const nodeMatched = detectedCorners.filter(c => c.nodeIds.some(id => sel.nodes.has(id)));
      if (nodeMatched.length) {
        const pos = nodeMatched.filter(c => c.r > 0);
        if (pos.length) return Math.round(pos.reduce((s, c) => s + c.r, 0) / pos.length * 10) / 10;
        return 0;
      }
    }
    const pool = indivCornerOpen && activeCorners.length ? activeCorners : detectedCorners;
    const pos = pool.filter(c => c.r > 0);
    if (pos.length) return Math.round(pos.reduce((s, c) => s + c.r, 0) / pos.length * 10) / 10;
    return 0;
  })();
  const applyRadiusToCorners = (cornersList, r, histKey = 'cr-indiv') => {
    const rad = Math.max(0, Number(r) || 0);
    /* Re-query sudut segar dari docRef untuk mencegah bug node id usang
       saat drag / scrub / tahan stepper beruntun */
    const d = docRef.current;
    const freshSelObjs = d.objects.filter(o => selRef.current.objs.has(o.id));
    const freshTargets = freshSelObjs.some(o => !isBgObj(o) && !o.img && !o.text) ? freshSelObjs.filter(o => !isBgObj(o) && !o.img && !o.text) : freshSelObjs.filter(o => !o.img && !o.text);
    const freshCorners = buildDetectedCorners(freshTargets, true);
    const targetKeys = new Set((cornersList || []).map(c => c.key));
    let resolvedCorners = freshCorners.filter(fc => targetKeys.has(fc.key));
    if (!resolvedCorners.length && cornersList && cornersList.length) {
      const targetIndices = new Set(cornersList.map(c => c.idx));
      resolvedCorners = freshCorners.filter(fc => targetIndices.has(fc.idx));
    }
    if (!resolvedCorners.length) resolvedCorners = cornersList || [];
    const byObj = new Map();
    resolvedCorners.forEach(c => {
      let s = byObj.get(c.objId);
      if (!s) byObj.set(c.objId, s = new Set());
      (c.nodeIds || []).forEach(id => s.add(id));
    });
    if (!byObj.size) return;
    let nextSelNodes = new Set(selRef.current.nodes);
    let nodesChanged = false;
    const ch = commitObjs(o => {
      const nids = byObj.get(o.id);
      if (!nids || !nids.size || o.img || o.locked) return o;
      const res = VE.setSelectedNodesRadius(o, nids, rad, {
        mode: cornerMode,
        bevelDeg,
        smooth: cornerSm
      });
      if (nextSelNodes.size) {
        nids.forEach(id => {
          if (nextSelNodes.delete(id)) nodesChanged = true;
        });
        res.newSelIds.forEach(id => {
          if (!nextSelNodes.has(id)) {
            nextSelNodes.add(id);
            nodesChanged = true;
          }
        });
      }
      return res.o;
    }, histKey);
    if (nodesChanged || nextSelNodes.size !== selRef.current.nodes.size) {
      setSel({
        objs: selRef.current.objs,
        nodes: nextSelNodes
      });
    }
    if (!ch && rad > 0) say('Sudut tidak cukup panjang untuk radius tersebut');
  };
  const setRadius = r => {
    const rad = Math.max(0, Number(r) || 0);
    /* Ronde 2 T2 (akar drag-vs-ketik): scrub label / tahan tombol step
       memanggil setRadius dari closure render saat pointerdown. Sesudah
       pointermove pertama membuat fillet, id node apex lama sudah diganti
       pasangan fillet ber-id baru — sel.nodes & detectedCorners dari
       closure itu basi, engine tidak menemukan id (cnt=0, res.o===o),
       commitObjs false -> toast "Sudut tidak cukup panjang" + nilai
       mental. Ketik & klik step tunggal lolos karena tiap panggilan
       memakai closure render segar. Karena itu target di sini selalu
       diturunkan ulang dari docRef/selRef yang sinkron (bukan state
       render): nodeMatched, activeCorners, dan detectedCorners segar. */
    const d = docRef.current;
    const freshSelObjs = d.objects.filter(o => selRef.current.objs.has(o.id));
    const freshTargets = freshSelObjs.some(o => !isBgObj(o) && !o.img && !o.text) ? freshSelObjs.filter(o => !isBgObj(o) && !o.img && !o.text) : freshSelObjs.filter(o => !o.img && !o.text);
    const freshCorners = buildDetectedCorners(freshTargets, indivCornerOpen);
    const freshNodes = selRef.current.nodes;
    if (freshNodes && freshNodes.size > 0) {
      const nodeMatched = freshCorners.filter(c => c.nodeIds.some(id => freshNodes.has(id)));
      if (nodeMatched.length > 0) {
        applyRadiusToCorners(nodeMatched, rad, 'cr-nodes');
        return;
      }
    }
    if (indivCornerOpen) {
      const freshActive = freshCorners.filter(c => pickedCornerKeys.has(c.key));
      if (freshActive.length > 0) {
        applyRadiusToCorners(freshActive, rad, 'cr-sel');
        return;
      }
    }
    if (freshCorners.length > 0) {
      applyRadiusToCorners(freshCorners, rad, 'cr');
      return;
    }
    const targets = selObjs.some(o => !isBgObj(o)) ? new Set(selObjs.filter(o => !isBgObj(o)).map(o => o.id)) : sel.objs;
    const ch = commitObjs(o => targets.has(o.id) && !o.img ? VE.setCornerRadius(o, rad, {
      mode: cornerMode,
      bevelDeg,
      smooth: cornerSm
    }) : o, 'cr');
    if (!ch && rad > 0) say('Tidak ada sudut (node corner) yang bisa dibulatkan');
  };
  /* Jika seleksi berisi latar Frame sekaligus anak-anak Frame yang sama (saat memilih Frame utuh),
     targetkan perubahan Fill/Stroke/Gradient ke latar Frame agar tidak menimpa warna seluruh anak di dalamnya */
  const paintObjs = React.useMemo(() => {
    const unlocked = selObjs.filter(o => !o.locked);
    const bgs = unlocked.filter(isBgObj);
    // FRAME SPLIT 2026-11-15: bg frame ikon (isIconFrame, transparan)
    // adalah detail implementasi — bila anggota frame ikut terseleksi,
    // cat HANYA anggotanya, bukan bg. Kalau tidak, recolor grup malah
    // menggambar garis di sekeliling ikon (bg yang terwarnai) sementara
    // anggotanya tidak berubah. Aturan frame biasa (seleksi utuh -> cat
    // bg-nya) tetap berlaku untuk bg non-ikon; seleksi bg ikon saja
    // tetap bisa mengecat bg itu (fallback `unlocked` di bawah).
    const plainBgs = bgs.filter(o => !o.isIconFrame);
    if (plainBgs.length && unlocked.some(o => !isBgObj(o)) && unlocked.every(o => isBgObj(o) || o.group && plainBgs.some(b => b.group === o.group))) {
      return plainBgs;
    }
    if (bgs.some(o => o.isIconFrame) && unlocked.some(o => !isBgObj(o) && o.isIconFrame)) {
      return unlocked.filter(o => !isBgObj(o) || !o.isIconFrame);
    }
    return unlocked;
  }, [selObjs]);
  const paintTargetIds = React.useMemo(() => new Set(paintObjs.map(o => o.id)), [paintObjs]);
  const cp = paintObjs.find(o => !o.img) || selObjs.find(o => !o.img) || primary;
  const replaceSelectionColor = (sc, v, meta: Record<string, any> = {}) => {
    const S = new Set(sc.ids);
    const stopSet = sc.stopKeys && sc.stopKeys.length ? new Set(sc.stopKeys) : null;
    const fn = o => {
      if (!S.has(o.id) || o.locked) return o;
      if (sc.kind === 'grad') {
        let changed = false;
        let nextObj = o;
        if (VE.gradOn(o) && o.grad) {
          const m = VE.ensureGradModel(o);
          const p = v === 'none' ? {
            hex: sc.hex,
            a: 0
          } : parseColorWithAlpha(v);
          const nextRaw = m.grad.rawStops.map((st, stIdx) => {
            const match = stopSet ? stopSet.has(o.id + '#' + (st.id || stIdx)) : cssToHex(st.color) === sc.hex;
            if (match) changed = true;
            return match ? {
              ...st,
              color: p.hex,
              op: v === 'none' ? 0 : p.a < 1 ? p.a : st.op ?? 1
            } : st;
          });
          if (changed) nextObj = VE.updateGradStops(m, nextRaw);
        }
        if (VE.strokeGradOn(o) && o.strokeGrad) {
          const p = v === 'none' ? {
            hex: sc.hex,
            a: 0
          } : parseColorWithAlpha(v);
          const stops = o.strokeGrad.rawStops && o.strokeGrad.rawStops.length ? o.strokeGrad.rawStops : o.strokeGrad.stops || [];
          let stkChanged = false;
          const nextRaw = stops.map((st, stIdx) => {
            const match = stopSet ? stopSet.has(o.id + '#stroke#' + (st.id || stIdx)) : cssToHex(st.color) === sc.hex;
            if (match) stkChanged = true;
            return match ? {
              ...st,
              color: p.hex,
              op: v === 'none' ? 0 : p.a < 1 ? p.a : st.op ?? 1
            } : st;
          });
          if (stkChanged) {
            nextObj = {
              ...nextObj,
              strokeGrad: {
                ...o.strokeGrad,
                rawStops: nextRaw,
                stops: VE.compileGradStops(nextRaw)
              }
            };
          }
        }
        if (changed || nextObj !== o) return nextObj;
      }
      /* Fix wave F1 (Ruling N): perubahan warna via seksi Selection colors
         harus melepas tautan style (keputusan 2B/3A) — route lewat
         directPaintEdit (core per-objek yang sama dipakai ColorField dan
         unlinkOnDirectPaintEdit). directPaintEdit menerima OBJEK yang
         sudah dicat (bukan hex): paintSlot diterapkan dulu, lalu
         directPaintEdit melepas tautan bila nilai baru beda dari hex
         style / 'none' / alpha < 1. Objek teks: paintSlot menulis
         text.fill DAN fill bersamaan — kalau hanya o.fill yang berubah,
         o.text.fill basi dan slot teks colorWalk (yang membaca o.text.fill)
         menampilkan baris warna lama di Selection colors. kind 'grad'
         tidak disentuh (Ruling L). Guard no-change (identitas o
         dipertahankan) agar pratinjau live dengan nilai sama tidak membuat
         commit history palsu. */
      if (sc.kind === 'fill' || sc.kind === 'stroke') {
        const cur = sc.kind === 'stroke' ? o.stroke : (o.type === 'text' && o.text ? o.text.fill : o.fill);
        if (cur === v) return o;
        return directPaintEdit(o, paintSlot(o, sc.kind, v), sc.kind, docRef.current.styles || []);
      }
      return o[sc.kind] !== v ? {
        ...o,
        [sc.kind]: v
      } : o;
    };
    if (meta && meta.isLive) {
      livePaint(fn, {previewOnly: true});
    } else {
      commitPaint(fn, 'selcol:' + sc.kind + ':' + sc.ids[0]);
    }
  };

  /* 3 Grup Aksi Cepat dengan Dropdown (seperti Floating Bar) */
  const SL = ' M4 20L20 4',
    ND = 'M7 7h10v10H7z',
    HD = 'M4 20l7-7 M11 13a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    ALL = ' M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5';
  const hasObj = selObjs.length > 0;
  const railGroups = [{
    id: 'visGrp',
    title: L.edRailVis,
    items: [{
      tip: 'veShowNodeGlobal',
      d: ND + (showSelNodes ? '' : SL),
      act: toggleGlobalNodes,
      dis: false,
      on: showSelNodes
    }, {
      tip: 'veShowHandleGlobal',
      d: HD + (showSelHandles ? '' : SL),
      act: toggleGlobalHandles,
      dis: false,
      on: showSelHandles
    }]
  }, {
    id: 'objGrp',
    title: L.edRailObj,
    items: [{
      tip: 'veDup',
      d: 'M8 8h12v12H8z M4 16V4h12',
      act: dup,
      dis: !hasObj
    }, {
      tip: 'veDelObj',
      d: ICONS.trash,
      act: delSel,
      dis: !hasObj
    }, {
      tip: 'veUp',
      d: 'M12 19V5 M5 12l7-7 7 7',
      act: () => reorder(true),
      dis: !hasObj
    }, {
      tip: 'veDown',
      d: 'M12 5v14 M19 12l-7 7-7-7',
      act: () => reorder(false),
      dis: !hasObj
    }]
  }, {
    id: 'pathGrp',
    title: L.edRailPath,
    items: [{
      tip: 'veClose',
      d: 'M4 18L10 5L20 13L16 19Z',
      act: () => setClosed(true),
      dis: !hasObj
    }, {
      tip: 'veOpen',
      d: 'M4 18L10 5L20 13L16 19',
      act: () => setClosed(false),
      dis: !hasObj
    }, {
      tip: 'veInsert',
      d: 'M12 7v6 M9 10h6 M3 18h18',
      act: doInsert,
      dis: selNodes.size < 2
    }, {
      tip: 'veDelNode',
      d: 'M9 10h6 M3 18h18',
      act: delSel,
      dis: !selNodes.size
    }, {
      tip: 'veTypeCorner',
      d: 'M4 20L12 5l8 15',
      act: () => applyType('corner'),
      dis: !selNodes.size
    }, {
      tip: 'veAlignSel',
      d: 'M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4',
      act: () => alignSel(false),
      dis: selNodes.size < 2 && !selHandles.size
    }, {
      tip: 'veTypeSmooth',
      d: 'M3 15c3-9 15-9 18 0',
      act: () => applyType('smooth'),
      dis: !selNodes.size
    }, {
      tip: 'veTypeSym',
      d: 'M3 15c3-9 15-9 18 0 M12 6v14',
      act: () => applyType('symmetric'),
      dis: !selNodes.size
    }, {
      tip: 'veSharpen',
      d: 'M5 20V6l14 14',
      act: applySharpen,
      dis: !hasObj
    }, {
      tip: 'veSmoothTb',
      d: 'M3 16c4-10 6-10 9-4s5 6 9-4',
      act: applySmoothNodes,
      dis: !selNodes.size
    }]
  }, {
    id: 'shapeRailGrp',
    title: (prefs && prefs.lang === 'en') ? 'Shapes' : 'Bentuk',
    isShapeLibrary: true
  }, {
    id: 'blobRailGrp',
    title: 'Blob Generator',
    isDirectTool: true,
    toolKey: 'blob',
    tip: 'veBlob',
    d: 'M12 3c4.5 0 9 2.5 9 7s-2 10-8 10-10-3-10-8 4-9 9-9z'
  }, {
    id: 'waveRailGrp',
    title: 'Wave Generator',
    isDirectTool: true,
    toolKey: 'weave',
    tip: 'veWeave',
    d: 'M3 7c3-2.5 6 2.5 9 0s6-2.5 9 0 M3 17c3-2.5 6 2.5 9 0s6-2.5 9 0'
  }];
  const renderRailDropdowns = () => railGroups.map(grp => {
    const {
      id,
      title
    } = grp;
    const btnRef = railGrpRefs[id];
    const isOpen = openRailGrp === id;

    if (grp.isShapeLibrary) {
      const isShapeActive = tool === 'shape';
      return <React.Fragment key={id}><div ref={btnRef} className="fig-rail-grp"><button type="button" className={'dk-b' + (isShapeActive ? ' on' : '')} data-tip="veShape" aria-label={TT.veShape ? TT.veShape.t : title} aria-pressed={isShapeActive} onClick={() => {
            setTool('shape');
            setOpenRailGrp(null);
          }}><ShapeGlyph k={shapeKind} s={19} /></button><button type="button" className="dk-b chev-b" aria-label={L.edChoose + ' ' + title} data-tip-text={L.edChoose + ' ' + title} aria-expanded={isOpen} onClick={e => {
            e.stopPropagation();
            setOpenRailGrp(isOpen ? null : id);
          }}><Chev open={isOpen} /></button></div><Float anchor={btnRef} open={isOpen} onClose={() => setOpenRailGrp(null)} w={260}><div className="text-[11px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">{title}</div><div className="grid grid-cols-4 gap-1.5 p-2">{SHAPES.map(([k, lb]) => <button key={k} type="button" data-tip={'veShp_' + k} aria-label={(prefs && prefs.lang === 'en') ? (SHAPE_EN[k] || lb) : lb} className={'tool-btn flex items-center justify-center p-2 rounded' + (tool === 'shape' && shapeKind === k ? ' on' : '')} onClick={() => {
            setShapeKind(k);
            setTool('shape');
            setOpenRailGrp(null);
            say(((prefs && prefs.lang === 'en') ? (SHAPE_EN[k] || lb) : lb) + ((prefs && prefs.lang === 'en') ? ': drag on canvas to draw' : ': seret di kanvas untuk menggambar'));
          }}><ShapeGlyph k={k} s={22} /></button>)}</div></Float></React.Fragment>;
    }

    if (grp.isDirectTool) {
      const isToolActive = tool === grp.toolKey;
      return <div key={id} ref={btnRef} className="fig-rail-grp"><button type="button" className={'dk-b' + (isToolActive ? ' on' : '')} data-tip={grp.tip} aria-label={grp.title} aria-pressed={isToolActive} onClick={() => {
        setTool(tool === grp.toolKey ? 'select' : grp.toolKey);
      }}><Vi d={grp.d} s={19} /></button></div>;
    }

    const items = (grp as any).items || [];
    const curItem: any = items.find((x: any) => x.tip === lastRailAct[id]) || items.find((x: any) => x.on) || items[0];
    return <React.Fragment key={id}><div ref={btnRef} className="fig-rail-grp"><button type="button" className={'dk-b' + (curItem.on ? ' on' : '')} data-tip={curItem.tip} aria-label={TT[curItem.tip] ? TT[curItem.tip].t : curItem.tip} onClick={() => {
          if (curItem.dis) {
            setOpenRailGrp(isOpen ? null : id);
          } else {
            curItem.act();
            setOpenRailGrp(null);
          }
        }}><Vi d={curItem.d} s={19} /></button><button type="button" className="dk-b chev-b" aria-label={L.edChoose + ' ' + title} data-tip-text={L.edChoose + ' ' + title} aria-expanded={isOpen} onClick={e => {
          e.stopPropagation();
          setOpenRailGrp(isOpen ? null : id);
        }}><Chev open={isOpen} /></button></div><Float anchor={btnRef} open={isOpen} onClose={() => setOpenRailGrp(null)} w={252}><div className="text-[11px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">{title}</div>{items.map(it => {
          const info = TT[it.tip] || {
            t: it.tip
          };
          const isCur = curItem.tip === it.tip;
          return <div key={it.tip} role="option" aria-selected={!!it.on} className={'opt' + (it.on ? ' on' : '') + (it.dis ? ' opacity-40 pointer-events-none' : '')} data-tip={it.tip} onClick={() => {
            if (it.dis) return;
            setLastRailAct(s => ({
              ...s,
              [id]: it.tip
            }));
            it.act();
            setOpenRailGrp(null);
          }}><span className="sel-l"><Vi d={it.d} s={17} /><span>{info.t}</span></span><span className="flex items-center gap-1.5">{info.k && <span className="text-[10px] font-mono mut px-1.5 py-0.5 rounded bg-[var(--sub)]">{info.k}</span>}<svg className="ck" style={{
                opacity: it.on || isCur ? 1 : 0
              }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span></div>;
        })}</Float></React.Fragment>;
  });
  const leftSidebarNode = leftOpen ? <EditorLeftSidebar L={L} lang={prefs && prefs.lang || 'id'} onBackToWorkspace={onBackToWorkspace} docRef={docRef} zoomRef={zoomRef} panRef={panRef} saveStatus={saveStatus} onRetrySave={onRetrySave} onRenameProject={onRenameProject} projectName={projectName} doc={doc} nTotal={nTotal} sel={sel} selNodes={selNodes} createFrameSel={createFrameSel} groupSel={groupSel} clipFrames={clipFrames} setClipFrames={setClipFrames} groupSameColor={groupSameColor} setGroupSameColor={setGroupSameColor} layerScrollRef={layerScrollRef} layerTreeDomRef={layerTreeDomRef} layerViewportCtrlRef={layerViewportCtrlRef} tool={tool} pen={pen} penSty={penSty} setPenSty={setPenSty} penRef={penRef} lineInfo={lineInfo} commitObjs={commitObjs} finishPen={finishPen} selObjs={selObjs} autoSel={autoSel} autoAll={autoAll} ahOpt={ahOpt} setAhOpt={setAhOpt} primary={primary} alOpt={alOpt} setAlOpt={setAlOpt} applyNodeAngleAlign={applyNodeAngleAlign} selHandles={selHandles} applyStraight={applyStraight} applyAutoRefine={applyAutoRefine} applyPruneNodes={applyPruneNodes} pruneOpt={pruneOpt} setPruneOpt={setPruneOpt} sOpt={sOpt} setSOpt={setSOpt} vcSimp={vcSimp} vcSimpRetain={vcSimpRetain} openVcSimplify={openVcSimplify} triggerAutoSimplifyLevel={triggerAutoSimplifyLevel} openVcMoreOptions={openVcMoreOptions} updateVcSimplify={updateVcSimplify} cancelVcSimplify={cancelVcSimplify} confirmVcSimplify={confirmVcSimplify} virtualLayerRows={virtualLayerRows} dragLayerIds={dragLayerIds} moveObjsToGroup={moveObjsToGroup} setDragLayerIds={setDragLayerIds} setOverFrameId={setOverFrameId} layerAnchor={layerAnchor} layerFlatIds={layerFlatIds} setSel={setSel} setLayerIns={setLayerIns} renameVal={renameVal} setRenameVal={setRenameVal} renameSkip={renameSkip} setRenamingId={setRenamingId} renamingId={renamingId} layerIns={layerIns} openLayerCtx={openLayerCtx} overFrameId={overFrameId} reorderLayerTo={reorderLayerTo} layerClickSkipExpandRef={layerClickSkipExpandRef} commitRename={commitRename} say={say} dropFrameId={dropFrameId} toggleCollapseGrp={toggleCollapseGrp} ungroupIds={ungroupIds} rzProps={rzProps} /> : null;
  const chartMatch = findSelectedChartAnchor(selObjs, doc.objects || []);
  const chartControlsNode = chartMatch ? (() => {
    void fontCatalogVer;
    const reg = sceneRendererRef.current?.scene?.fontRegistry || null;
    const availFonts = reg && typeof reg.listFamilies === 'function' ? reg.listFamilies().map(f => typeof f === 'string' ? f : f && f.family).filter(Boolean) : ['Geovanta Sans'];
    return (
      <ChartInspectorPanel
        config={chartMatch.config}
        groupId={chartMatch.groupId}
        onChangeConfig={(nextCfg, meta) => onChartConfigChange(chartMatch.groupId, nextCfg, meta)}
        onOpenStudio={() => {
          setChartsEditTarget({ groupId: chartMatch.groupId, config: chartMatch.config });
          setTool('charts');
        }}
        onDetachToVector={() => onChartDetach(chartMatch.groupId)}
        availableFonts={availFonts}
        googleFonts={GOOGLE_FONTS.families.map(f => f.family)}
        L={L}
        lang={prefs?.lang || 'id'}
      />
    );
  })() : null;
  const rightInspectorNode = rightOpen ? <EditorRightInspector L={L} lang={prefs && prefs.lang || 'id'} onRecentColor={rememberRecentColor} recentColors={prefs && prefs.recentColors || []} canUndo={canUndo} undo={undo} canRedo={canRedo} redo={redo} zoomBy={zoomBy} zoomPctRef={zoomPctRef} displayZoomRef={displayZoomRef} zoom={zoom} zoomSliderDomRef={zoomSliderDomRef} setZ={setZ} fitView={fitView} selObjs={selObjs} selNodes={selNodes} alignDo={alignDo} xm={xm} xp={xp} setXfPos={setXfPos} xfNodes={xfNodes} setXfDim={setXfDim} lockAR={lockAR} setLockAR={setLockAR} setXfRot={setXfRot} flipXf={flipXf} pin={pin} setPin={setPin} rotPivot={rotPivot} setRotPivot={setRotPivot} scaleStk={scaleStk} setScaleStk={setScaleStk} commitObjs={commitObjs} livePaint={livePaint} commitPaint={commitPaint} docRef={docRef} primary={primary} commit={commit} setSel={setSel} say={say} toggleSelHidden={toggleSelHidden} allSelHidden={allSelHidden} setProp={setProp} indivCornerOpen={indivCornerOpen} activeCorners={activeCorners} detectedCorners={detectedCorners} curR={curR} setRadius={setRadius} setIndivCornerOpen={setIndivCornerOpen} cornerMode={cornerMode} setCornerMode={setCornerMode} applyRadiusToCorners={applyRadiusToCorners} setPickedCornerKeys={setPickedCornerKeys} pickedCornerKeys={pickedCornerKeys} paintObjs={paintObjs} isBgObj={isBgObj} paintTargetIds={paintTargetIds} cp={cp} activeStopId={activeStopId} setActiveStopId={setActiveStopId} activeGradSlot={activeGradSlot} setActiveGradSlot={setActiveGradSlot} activeStrokeStopId={activeStrokeStopId} setActiveStrokeStopId={setActiveStrokeStopId} selectionColors={selectionColors} replaceSelectionColor={replaceSelectionColor} onFrPreviewDoc={frPreviewDoc} onFrCommitPreview={frCommitPreview} onRcPreviewDoc={rcPreviewDoc} onRcCommitPreview={rcCommitPreview} onSelectSame={selectSameCriterion} convertFrameToAutoLayout={convertFrameToAutoLayout} onSeparateIconObjects={applySeparateIconObjects} canSeparateIcon={canSeparateIcon} onFillEmptySpace={applyFillEmptySpace} canFillEmpty={canFillEmpty} lay={lay} layUpd={layUpd} setLay={setLay} layPad={layPad} layItems={layItems} runLayout={runLayout} doc={doc} committedDoc={hist.current.s[hist.current.p]} padToArtboard={padToArtboard} bg={bg} setBg={setBg} importFiles={importFiles} expFmt={expFmt} setExpFmt={setExpFmt} isRasterFmt={isRasterFmt} expScale={expScale} setExpScale={setExpScale} exportArea={exportArea} setExportArea={setExportArea} exportSvg={exportSvg} downloadSvg={downloadSvg} onExportBackup={onExportBackup} onOpenCodeInspector={openCodeInspector} antialias={!!renderCfg.antialias} setAntialias={on => { updateRenderConfig({ antialias: on }); setPrefs?.(p => ({ ...p, antialias: on })); if (sceneRendererRef.current) sceneRendererRef.current.requestRender(true); }} chartControls={chartControlsNode} textControls={primary && primary.type === 'text' ? (() => {
            void fontCatalogVer;
            const reg = sceneRendererRef.current?.scene?.fontRegistry || null;
            const availFonts = reg && typeof reg.listFamilies === 'function' ? reg.listFamilies().map(f => typeof f === 'string' ? f : f && f.family).filter(Boolean) : ['Geovanta Sans'];
            const pSpec = legacyTextSpec(primary);
            const isFontAvail = reg ? !!reg.getFace(pSpec.fontFamily, pSpec.fontWeight, pSpec.fontStyle) : pSpec.fontFamily === 'Geovanta Sans';
            return <TextInspector
              object={primary}
              lang={prefs?.lang || 'id'}
              availableFonts={availFonts}
              googleFonts={GOOGLE_FONTS.families}
              embedStatus={googleFontStatus}
              onEmbedFont={embedGoogleFontForSelection}
              isFontAvailable={isFontAvail}
              update={patch => updateText(primary.id, patch)}
              updateLive={patch => updateTextLive(primary.id, patch)}
              edit={() => setEditingText({id: primary.id, isNew: false})}
              onImportFont={() => pickFiles('.ttf,.otf,font/ttf,font/otf', fs => importFontFiles(fs))}
              onConvertToPath={convertTextSelectionToPath}
            />;
          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} isMobile={isMobile} mobileTab={mobileInspectorTab} onMobileTabChange={setMobileInspectorTab} /> : null;
  return <div ref={rootRef} className={'ved-root' + (full ? ' ved-full' : '')}><div className="fig-workspace">{isMobile ? (
      <>
        <MobileEditorTopBar
          L={L}
          lang={prefs && prefs.lang || 'id'}
          projectName={projectName}
          saveStatus={saveStatus}
          onBackToWorkspace={onBackToWorkspace ? () => onBackToWorkspace(docRef.current, { zoom: zoomRef.current, pan: { ...panRef.current } }) : undefined}
          onRenameProject={onRenameProject}
          canUndo={canUndo}
          undo={undo}
          canRedo={canRedo}
          redo={redo}
          zoom={zoom}
          displayZoomRef={displayZoomRef}
          mobZoomPctRef={mobZoomPctRef}
          fitView={fitView}
          leftOpen={leftOpen}
          onToggleLeft={toggleMobileLeft}
          rightOpen={rightOpen}
          onToggleRight={toggleMobileRight}
          railOpen={mobileRailOpen}
          onToggleRail={toggleMobileRail}
          onQuickExport={() => {
            setMobileInspectorTab('export');
            setLeftOpen(false);
            setMobileRailOpen(false);
            setRightOpen(true);
          }}
          selCount={sel.objs.size}
        />
        {mobileRailOpen && (
          <div className="mob-rail-sheet" data-testid="mobile-rail-sheet" onPointerDown={e => e.stopPropagation()}>
            <EditorActionRail L={L} renderRailDropdowns={renderRailDropdowns} />
          </div>
        )}
        {!mobHintDismissed && !leftOpen && !rightOpen && !ctx && (
          <div className="mob-gesture-hint" data-testid="mobile-gesture-hint" role="status" onPointerDown={e => e.stopPropagation()}>
            <span>
              {prefs && prefs.lang === 'en'
                ? 'Pinch to Zoom • 2-finger tap = Undo • Hold object for menu'
                : 'Cubit untuk Zoom • Tap 2 jari = Undo • Tahan objek untuk menu'}
            </span>
            <button
              type="button"
              className="mob-hint-close"
              data-testid="mobile-gesture-hint-close"
              aria-label={L.cClose || 'Tutup'}
              onClick={() => {
                try {
                  localStorage.setItem('geovanta-mob-hint-v1', '1');
                } catch {}
                setMobHintDismissed(true);
              }}
            >
              <Ico n="x" size={13} />
            </button>
          </div>
        )}
        {!leftOpen && !rightOpen && selObjs.length > 0 && (
          <MobileSelectionActionBar
            count={selObjs.length}
            lang={prefs && prefs.lang || 'id'}
            onOpenStyle={() => {
              setMobileInspectorTab('style');
              setLeftOpen(false);
              setMobileRailOpen(false);
              setRightOpen(true);
            }}
            onDuplicate={dup}
            onOpenLayers={() => {
              setRightOpen(false);
              setMobileRailOpen(false);
              setLeftOpen(true);
            }}
            onDelete={delSel}
            onMore={e => {
              const r = e?.currentTarget?.getBoundingClientRect?.();
              onCtx({
                preventDefault() {},
                clientX: r ? r.left : window.innerWidth * 0.5,
                clientY: r ? r.top : window.innerHeight * 0.6,
                target: boxRef.current,
              });
            }}
          />
        )}
        {!leftOpen && !rightOpen && tool === 'pen' && pen && (
          <div className="mob-pen-actions fade" data-testid="mob-pen-actions">
            <button
              type="button"
              className="mob-pen-btn cancel"
              data-testid="mob-pen-cancel"
              onClick={cancelPen}
            >
              ✕ Batal
            </button>
            <button
              type="button"
              className="mob-pen-btn"
              data-testid="mob-pen-undo"
              onClick={penUndoLast}
            >
              ⤺ Titik
            </button>
            <button
              type="button"
              className="mob-pen-btn"
              data-testid="mob-pen-close"
              onClick={closePenAndFinish}
            >
              ☌ Tutup
            </button>
            <button
              type="button"
              className="mob-pen-btn finish"
              data-testid="mob-pen-finish"
              onClick={finishPen}
            >
              ✓ Selesai
            </button>
          </div>
        )}
        {!leftOpen && !rightOpen && (tool === 'node' || tool === 'corner') && selNodes && selNodes.size > 0 && (
          <div className="mob-node-actions fade" data-testid="mob-node-actions">
            <button
              type="button"
              className="mob-node-btn"
              data-testid="mob-node-corner"
              onClick={applyStraight}
            >
              Sudut
            </button>
            <button
              type="button"
              className="mob-node-btn"
              data-testid="mob-node-smooth"
              onClick={applySmoothNodes}
            >
              Lengkung
            </button>
            <button
              type="button"
              className="mob-node-btn danger"
              data-testid="mob-node-delete"
              onClick={delSel}
            >
              Hapus Node
            </button>
          </div>
        )}
        {!leftOpen && !rightOpen && (tool === 'select' || tool === 'node') && (
          <button
            type="button"
            className={'mob-multisel-toggle' + (multiSelectActive ? ' on' : '')}
            data-testid="mob-multisel-toggle"
            onClick={() => setMultiSelectActive(v => !v)}
          >
            {multiSelectActive ? '✓ Multi ON' : '☷ Multi'}
          </button>
        )}
      </>
    ) : (
      <div className="flex h-full min-h-0 relative select-none order-2 lg:order-none" style={{
        ['--lw' as any]: pw.l + 'px'
      }}><EditorActionRail L={L} renderRailDropdowns={renderRailDropdowns} />{leftSidebarNode}<button type="button" className={'fig-sidebar-edge-toggle' + (leftOpen ? ' on' : '')} data-tip={leftOpen ? 'veSidebarHide' : 'veSidebarShow'} aria-label={leftOpen ? L.edSidebarHide : L.edSidebarShow} aria-expanded={leftOpen} onPointerDown={e => e.stopPropagation()} onClick={e => {
          e.stopPropagation();
          setLeftOpen(o => !o);
        }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3.5" y="4" width="17" height="16" rx="3.2" /><path d="M9.5 4v16" /><path d={leftOpen ? 'M15 9.5L12.5 12l2.5 2.5' : 'M13 9.5L15.5 12 13 14.5'} /></svg></button></div>
    )}<div className={'min-w-0 relative order-1 lg:order-none' + (full ? ' ved-fmid' : '')}><div ref={boxRef} className="ved-canvas" data-renderer="canvaskit" aria-busy={docLoading ? true : undefined} data-fast-render={(panning || !!dragRef.current || nTotal > 800) ? '1' : '0'} style={{
          // A focused textarea can scroll an overflow:hidden canvas past its own edges.
          overflow: 'clip',
          flex: full ? 1 : undefined,
          minHeight: full ? 0 : undefined,
          height: full ? undefined : 'clamp(360px, 74vh, 840px)',
          cursor: cur,
          userSelect: 'none',
          backgroundSize: '16px 16px'
        }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={() => {
          setAddHov(null);
          setHhHov(null);
          setAhHov(null);
        }} onDoubleClick={onDoubleClick} onContextMenu={onCtx} onDragOver={e => {
          if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }} onDrop={e => {
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            e.preventDefault();
            importFiles(e.dataTransfer.files, {
              x: e.clientX,
              y: e.clientY
            });
          }
        }}><canvas ref={sceneCanvasRef} className="ved-scene-canvas" style={{
            zIndex: 0,
            backgroundImage: bg.mode === 'solid' ? 'none' : 'conic-gradient(var(--card) 25%, var(--line) 0 50%, var(--card) 0 75%, var(--line) 0)',
            backgroundSize: '16px 16px'
          }} /><canvas ref={cpuCanvasRef} className="ved-scene-canvas" style={{
            zIndex: 0,
            display: 'none',
            backgroundImage: bg.mode === 'solid' ? 'none' : 'conic-gradient(var(--card) 25%, var(--line) 0 50%, var(--card) 0 75%, var(--line) 0)',
            backgroundSize: '16px 16px'
          }} /><CanvasRulers visible={rulersOn} unit={rulerUnit} origin={rulerOrigin} zoom={zoomRef.current} pan={panRef.current} guides={guides} guidesVisible={guidesVisible} guidesLocked={guidesLocked} onAddGuide={(axis, pos) => setGuides(gs => [...gs, { id: VE.uid(), axis, pos }])} onMoveGuide={(id, pos) => setGuides(gs => gs.map(g => g.id === id ? { ...g, pos } : g))} onDeleteGuide={id => setGuides(gs => gs.filter(g => g.id !== id))} onSetOrigin={setRulerOrigin} onSetUnit={setRulerUnit} containerRef={boxRef} lang={prefs && prefs.lang || 'id'} />{docLoading && <div data-testid="doc-loading" role="progressbar" aria-label="Memuat dokumen" aria-valuemin={0} aria-valuemax={docLoading.total} aria-valuenow={docLoading.loaded} style={{
            position: 'absolute',
            inset: 0,
            /* zIndex 2: tepat di atas host SVG dalam-kanvas (zIndex 1),
               jauh di bawah UI transient (toast 40, error 44). */
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            /* Blokir input kanvas selama muat (dokumen belum lengkap);
               toolbar/inspector/layer di luar kontainer ini tetap aktif. */
            pointerEvents: 'auto',
            background: 'color-mix(in srgb, var(--bg) 55%, transparent)'
          }}><div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#18181b',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: 999
          }}><span>Memuat… {docLoading.loaded}/{docLoading.total}</span></div></div>}{editingText && (() => { const object = doc.objects.find(o => o.id === editingText.id); return object ? <TextEditOverlay key={object.id} ref={textEditViewportRef} object={object} zoom={zoomRef.current} pan={panRef.current} fontVersion={fontCatalogVer} renderGlyphsOnCanvas isNew={editingText.isNew} caret={editingText.caret ?? null} onCommit={finishTextEdit} onLiveChange={previewTextEdit} measureText={measureTextBoundsCb} lang={prefs && prefs.lang || 'id'} /> : null; })()}{renderError && <div role="alert" className="ved-panel" style={{position: 'absolute', zIndex: 44, top: 14, left: 14, padding: 10}}>{prefs?.lang === 'en' ? 'CanvasKit could not draw the canvas.' : 'CanvasKit gagal menggambar kanvas.'}</div>}<svg width="100%" height="100%" className="ved-svg-host" style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            zIndex: 1
          }}><defs><radialGradient id="hm-lo"><stop offset="0" stopColor="#10b981" stopOpacity="0.9" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></radialGradient><radialGradient id="hm-mid"><stop offset="0" stopColor="#f59e0b" stopOpacity="0.95" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient><radialGradient id="hm-hi"><stop offset="0" stopColor="#ef4444" stopOpacity="1" /><stop offset="1" stopColor="#ef4444" stopOpacity="0" /></radialGradient></defs><g ref={vpRef} className="ved-vp-gpu" transform={fmtVpMat(zoomRef.current, panRef.current.x, panRef.current.y)}>{containerBoxes.map(f => {
                const bb = f.bb,
                  isSel = f.ids.every(id => sel.objs.has(id)),
                  isDrop = dropFrameId === f.id;
                const strokeCol = isDrop ? dropNoNest ? '#f59e0b' : 'var(--acc)' : 'var(--acc)';
                /* Nama Frame & Group: ukuran font disesuaikan agar tidak melebihi panjang frame */
                const zLbl = Math.max(1e-4, Math.min(1, zoom));
                const frameW = Math.max(20, bb[2] - bb[0]);
                const prefix = f.isFrame ? '# ' : '⧉ ';
                const fullLabel = prefix + f.id;
                const nominalFs = frameW < 160 ? 10 : Math.min(14, Math.max(11, Math.round(13 / zLbl * 100) / 100));
                const maxChars = Math.max(5, Math.floor(frameW / (nominalFs * 0.75)));
                let displayLabel = fullLabel;
                if (displayLabel.length > maxChars) {
                  displayLabel = displayLabel.slice(0, Math.max(3, maxChars - 1)) + '…';
                }
                const maxFsByW = frameW / (Math.max(1, displayLabel.length) * 0.72);
                const autoFs = Math.min(nominalFs, Math.max(7.5, Math.round(maxFsByW * 10) / 10));
                const lblOff = Math.min(19.2, Math.max(5, Math.round(autoFs * 0.55 * 100) / 100));
                const dropScale = Math.min(2.4, 1 / zLbl);
                const rawDash = isDrop && dropNoNest ? '5 3' : undefined;
                const fwRect = bb[2] - bb[0], fhRect = bb[3] - bb[1];
                const effDash = rawDash && (fwRect + fhRect) * 2 * (zoomRef.current || zoom || 1) <= 12000 ? rawDash : undefined;
                return <g key={'fh-' + f.id} data-drag-container={f.ids.join(',')}><rect data-dash-overlay={rawDash} x={bb[0]} y={bb[1]} width={fwRect} height={fhRect} fill={isDrop && !dropNoNest ? 'var(--acc)' : 'none'} fillOpacity={isDrop && !dropNoNest ? 0.10 : 0} stroke={strokeCol} strokeOpacity={isSel || isDrop ? 1 : f.isFrame ? 0.45 : 0.32} strokeWidth={isDrop ? 1.8 : isSel ? 1.25 : 0.9} strokeDasharray={effDash} vectorEffect="non-scaling-stroke" pointerEvents="none" /><text {...({ "data-frame-lbl": "1", "data-by": bb[1], "data-fw": frameW, "data-base-fs": autoFs } as any)} x={bb[0]} y={bb[1] - lblOff} fontSize={autoFs} fontWeight="600" fontFamily="Inter, sans-serif" fill={isSel || isDrop ? strokeCol : 'var(--mut)'} style={{
                    cursor: 'pointer',
                    userSelect: 'none'
                  }} title={fullLabel} onDoubleClick={(e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      if (boxRef.current && e.pointerId != null) {
                        boxRef.current.releasePointerCapture(e.pointerId);
                      }
                    } catch (_) {}
                    dragRef.current = null;
                    renameSkip.current = false;
                    setRenamingId('cg:' + f.id);
                    setRenameVal(f.id);
                  }} onPointerDown={e => {
                    if (e.button !== 0 || !f.first) return;
                    e.stopPropagation();
                    if (e.detail >= 2) {
                      try {
                        if (boxRef.current && e.pointerId != null) {
                          boxRef.current.releasePointerCapture(e.pointerId);
                        }
                      } catch (_) {}
                      dragRef.current = null;
                      renameSkip.current = false;
                      setRenamingId('cg:' + f.id);
                      setRenameVal(f.id);
                      return;
                    }
                    if (tool !== 'select') return;
                    const objs = new Set(f.ids);
                    setSel({
                      objs,
                      nodes: new Set()
                    });
                    try {
                      boxRef.current.setPointerCapture(e.pointerId);
                    } catch (x) {}
                    if (viewPend.current || viewSettleTimer.current) flushView();
                    const pStart = toDoc(e.clientX, e.clientY);
                    dragRef.current = {
                      type: 'obj',
                      base: docRef.current,
                      ids: objs,
                      anchor: {
                        x: pStart.x,
                        y: pStart.y
                      },
                      start: pStart,
                      sx: e.clientX,
                      sy: e.clientY,
                      moved: false
                    };
                  }}>{displayLabel}</text>{isDrop && <g pointerEvents="none"><rect x={bb[0]} y={bb[1] - 32 * dropScale} width={(dropNoNest ? 240 : 190) * dropScale} height={22 * dropScale} rx={4 * dropScale} fill={dropNoNest ? '#f59e0b' : 'var(--acc)'} /><text x={bb[0] + 7 * dropScale} y={bb[1] - 17 * dropScale} fontSize={Math.min(28.8, 12 * dropScale)} fontWeight="600" fontFamily="sans-serif" fill="#ffffff">{dropNoNest ? 'Ctrl: tidak dimasukkan ke ' + f.id : 'Lepas untuk masuk ke ' + f.id}</text></g>}</g>;
              })}{imgSel && <g data-drag-extra="1" pointerEvents="none">{imgSel.subs[0].nodes.slice(0, 4).map((n, i) => <rect key={'is' + i} x={n.x - 4.5 / zoom} y={n.y - 4.5 / zoom} width={9 / zoom} height={9 / zoom} fill="#fff" stroke="var(--acc)" strokeWidth={1.5 / zoom} pointerEvents="none" />)}</g>}{React.useMemo(() => {
                if (!selObjs.length) return null;
                const [cx0, cy0, cx1, cy1] = cullBounds;
                const visSel = [];
                let visNodeTotal = 0;
                const skipSelCull = selObjs.length <= 64;
                for (let i = 0; i < selObjs.length; i++) {
                  const o = selObjs[i];
                  if (o.text) continue;
                  const info = vinfo(o),
                    bb = info.bb;
                  if (skipSelCull || bb[2] >= cx0 && bb[0] <= cx1 && bb[3] >= cy0 && bb[1] <= cy1) {
                    visSel.push(o);
                    visNodeTotal += info.n;
                  }
                }
                // groupBoxEl juga disembunyikan saat teks sedang diedit
                // (activeBox sudah null di keadaan itu — tanpa guard ini
                // groupBoxEl akan muncul menggantikan activeBox, kotak tetap ganda).
                const gbW = allSelBBox ? Math.max(0, allSelBBox[2] - allSelBBox[0]) : 0;
                const gbH = allSelBBox ? Math.max(0, allSelBBox[3] - allSelBBox[1]) : 0;
                const gbRawDash = selObjs.length > 1 ? '4 3' : undefined;
                const gbEffDash = gbRawDash && (gbW + gbH) * 2 * (zoomRef.current || zoom || 1) <= 12000 ? gbRawDash : undefined;
                const groupBoxEl = selObjs.length >= 1 && allSelBBox && !activeBox && !isMovingObj && !(editingText && selObjs.length === 1 && selObjs[0].id === editingText.id) ? <rect key="sel-group-bbox" data-drag-extra="1" data-dash-overlay={gbRawDash} x={allSelBBox[0]} y={allSelBBox[1]} width={gbW} height={gbH} fill="none" stroke="var(--acc)" strokeOpacity="0.85" strokeWidth="1" strokeDasharray={gbEffDash} vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null;
                if (!visSel.length) return groupBoxEl;
                if (visNodeTotal > 600) {
                  /* Untuk seleksi masif (mis. 455 objek / 9.200+ node), hindari merasterisasi 9.200 kurva Bézier non-scaling-stroke di CPU SVG:
                     cukup tampilkan group bounding box agar seleksi & drag tetap instan */
                  return groupBoxEl;
                }
                /* Fix "ikon meleyot" (2026-11-15): outline seleksi digambar
                   dengan warna aksen (var(--acc)). Untuk anggota frame
                   ikon, outline per-objek tidak pernah jadi penanda yang
                   baik — ia menebalkan fill (halo ~1 px) atau mewarnai
                   ulang stroke — sementara bbox frame + handle sudah
                   menandai seleksi. Untuk objek biasa, outline juga
                   dilewati bila fill-nya (solid, opak) sama dengan
                   aksen: warnanya sama dengan fill, jadi bukan penanda,
                   hanya halo. */
                const normFill = c => {
                  if (!c || typeof c !== 'string') return '';
                  let s = c.trim().toLowerCase();
                  const m = s.match(/^#([0-9a-f]{3})$/);
                  if (m) s = '#' + m[1].split('').map(ch => ch + ch).join('');
                  return s;
                };
                const accNow = normFill(prefs && prefs.accent || '#13b152');
                const isAccMatch = o => !VE.gradOn(o) && (o.opacity ?? 1) >= 0.999 && !!normFill(o.fill) && normFill(o.fill) === accNow;
                const hideSelOutline = o => {
                  if (!o || o.isFrameBg) return false;
                  if (o.isIconFrame) return true;
                  return false;
                };
                const visSelOutlined = visSel.filter(o => !hideSelOutline(o));
                if (!visSelOutlined.length) return groupBoxEl;
                if (visSelOutlined.length > 64) {
                  const dSelCombined = visSelOutlined.map(o => vinfo(o).d).join(' ');
                  const idsSelStr = visSelOutlined.map(o => o.id).join(',');
                  return <React.Fragment key="sel-batch-frag">{groupBoxEl}<path key="sel-batch-outline" data-drag-batch={idsSelStr} data-sel-heavy="1" d={dSelCombined} fill="none" stroke="var(--acc)" strokeOpacity={isMovingObj ? '1' : '0.75'} strokeWidth={isMovingObj ? '1.5' : '1'} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" /></React.Fragment>;
                }
                return <React.Fragment key="sel-indiv-frag">{groupBoxEl}{visSelOutlined.map(o => {
                  const accMatch = isAccMatch(o);
                  return <path key={'s' + o.id} data-drag-id={o.id} data-sel-heavy="1" d={vinfo(o).d} fill="none" stroke={accMatch ? '#ffffff' : 'var(--acc)'} strokeOpacity={accMatch ? '0.85' : '0.65'} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />;
                })}</React.Fragment>;
              }, [selObjs, selObjs.length > 64 ? cullBounds : null, allSelBBox, activeBox, renamingId, editingText, prefs && prefs.accent])}{selObjs.length === 1 && !pen && (tool === 'select' || tool === 'node') && !selObjs[0].img && (() => {
                const o = selObjs[0];
                let gizmoSlot: 'fill' | 'stroke' | null = null;
                if (o.type === 'text') {
                  if (VE.gradOn(o)) gizmoSlot = 'fill';
                } else {
                  if (activeGradSlot === 'stroke' && VE.strokeGradOn(o)) {
                    gizmoSlot = 'stroke';
                  } else if (VE.gradOn(o)) {
                    gizmoSlot = 'fill';
                  } else if (VE.strokeGradOn(o)) {
                    gizmoSlot = 'stroke';
                  }
                }
                if (!gizmoSlot) return null;
                const isStroke = gizmoSlot === 'stroke';
                return (
                  <GradientCanvasGizmo
                    obj={o}
                    slot={gizmoSlot}
                    zoom={zoomRef.current || zoom || 1}
                    toDoc={toDoc}
                    commitObjs={commitObjs}
                    live={live}
                    docRef={docRef}
                    push={push}
                    activeStopId={isStroke ? activeStrokeStopId : activeStopId}
                    setActiveStopId={isStroke ? setActiveStrokeStopId : setActiveStopId}
                  />
                );
              })()}{activeBox && !isMovingObj && (() => {
                const zNow = Math.max(1e-4, zoomRef.current || zoom || 1);
                const corners = activeBox.corners();
                const polyPts = corners.map(p => p.x + ',' + p.y).join(' ');
                const hs = (isMobile ? 12 : 6) / zNow,
                  hHalf = hs * 0.5;
                return <g className="vc-bbox-overlay" pointerEvents="none"><polygon points={polyPts} fill="none" stroke="var(--acc)" strokeWidth="1" vectorEffect="non-scaling-stroke" />{VE.VC_HANDLES.map(h => {
                    const p = activeBox.toDocPt(h.pos(activeBox.rect));
                    return <rect key={'vch-' + h.idx} data-hx={p.x} data-hy={p.y} x={p.x - hHalf} y={p.y - hHalf} width={hs} height={hs} fill="#ffffff" stroke="var(--acc)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                  })}</g>;
              })()}{tool === 'select' && <g data-drag-extra="1"><SelectionRotationAndRedlines zoom={zoom} measureBadge={measureBadge} altMeasure={altMeasure} /></g>}{tool === 'autohandle' && ahHov && (() => {
                const o = doc.objects.find(q => q.id === ahHov.oid);
                if (!o) return null;
                const subs = ahHov.spid && ahOpt.scope !== 'obj' ? o.subs.filter(s => s.id === ahHov.spid) : o.subs;
                return <g pointerEvents="none">{subs.map(sp => <path key={'ah' + sp.id} d={VE.serializeSub(sp)} fill="none" stroke="var(--acc)" strokeWidth={3 / zoom} strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />)}{ahHov.kind === 'node' && <circle cx={ahHov.x} cy={ahHov.y} r={9 / zoom} fill="var(--acc)" fillOpacity="0.16" stroke="var(--acc)" strokeWidth={1.5 / zoom} />}</g>;
              })()}{tool === 'pen' && pen && pen.cur && (() => {
                const f = penFind(doc, pen);
                if (!f || f.sp.closed || !f.sp.nodes.length) return null;
                const L = f.sp.nodes[f.sp.nodes.length - 1],
                  c = pen.cur,
                  P0 = f.sp.nodes[0];
                const d = L.handleOut ? 'M' + L.x + ' ' + L.y + 'C' + L.handleOut.x + ' ' + L.handleOut.y + ' ' + c.x + ' ' + c.y + ' ' + c.x + ' ' + c.y : 'M' + L.x + ' ' + L.y + 'L' + c.x + ' ' + c.y;
                return <g pointerEvents="none"><path d={d} fill="none" stroke="var(--acc)" strokeWidth={1.5 / zoom} strokeDasharray={4 / zoom + ' ' + 3 / zoom} opacity="0.85" /><circle cx={c.x} cy={c.y} r={3 / zoom} fill="var(--acc)" />{pen.close && <circle cx={P0.x} cy={P0.y} r={9 / zoom} fill="var(--acc)" fillOpacity="0.18" stroke="var(--acc)" strokeWidth={1.5 / zoom} />}</g>;
              })()}{React.useMemo(() => {
                if (!shown.length) return null;
                const zNow = Math.max(1e-4, zoomRef.current || zoom || 1);
                /* Ukuran node & bezier handle diperkecil dan dikunci dengan Math.max(2.5, zNow)
                   agar TIDAK PERNAH membesar baik saat di-zoom in maupun saat di-zoom out! */
                const zNodeScale = Math.max(2.5, zNow);
                const touchNodeBoost = isMobile ? 1.55 : 1;
                const scale = Math.max(0.4, Math.min(4.0, (Number(nodeScale) || 1) * touchNodeBoost));
                const r1 = v => Math.round(v * 1e6) / 1e6;
                const diamondPath = (x, y, r) => `M${x} ${r1(y - r)}L${r1(x + r)} ${y}L${x} ${r1(y + r)}L${r1(x - r)} ${y}Z`;
                const circlePath = (x, y, r) => `M${r1(x - r)} ${y}a${r} ${r} 0 1 0 ${r1(r * 2)} 0a${r} ${r} 0 1 0 ${r1(-r * 2)} 0Z`;
                const handleColor = NODE_HANDLE_COLOR;
                const nszNow = r1((2.5 * scale) / zNodeScale);
                const hr = r1((2.1 * scale) / zNodeScale),
                  hSelR = r1((2.8 * scale) / zNodeScale),
                  sr = r1((2.7 * scale) / zNodeScale);
                const lineSw = r1((0.85 * Math.max(0.7, Math.min(2.0, Math.sqrt(scale)))) / zNodeScale),
                  nodeSw = r1((1.0 * Math.max(0.7, Math.min(2.0, Math.sqrt(scale)))) / zNodeScale);
                const shownNodeCount = shown.reduce((acc, o) => acc + vinfo(o).n, 0);
                if (shownNodeCount > 0) {
                  const pNow = panRef.current || pan || {
                    x: 0,
                    y: 0
                  };
                  const bw = boxRef.current && boxRef.current.clientWidth || 1920;
                  const bh = boxRef.current && boxRef.current.clientHeight || 1080;
                  const padW = bw * 0.85 / zNow + 160 / zNow;
                  const padH = bh * 0.85 / zNow + 160 / zNow;
                  const cx0 = -pNow.x / zNow - padW,
                    cy0 = -pNow.y / zNow - padH;
                  const cx1 = (bw - pNow.x) / zNow + padW,
                    cy1 = (bh - pNow.y) / zNow + padH;
                  /* Deduplikasi sel layar aktif bila jumlah node padat (>800) untuk menjaga 60 FPS */
                  const useScreenDedup = shownNodeCount > 800;
                  const invNodeCell = useScreenDedup ? zNow / ((shownNodeCount > 3000 ? 4.5 : 2.8) * scale) : 0;
                  const invHandleCell = useScreenDedup ? zNow / ((shownNodeCount > 3000 ? 6.5 : 4.0) * scale) : 0;
                  const seenNodes = useScreenDedup ? new Set() : null;
                  const seenHandles = useScreenDedup ? new Set() : null;
                  const hLinesArr = [],
                    hDotsArr = [],
                    cRectsArr = [],
                    sCircsArr = [],
                    selRectsArr = [];
                  const selEls = [];
                  const nv = showSelNodes,
                    hVis = showSelHandles;
                  for (let oi = 0; oi < shown.length; oi++) {
                    const o = shown[oi];
                    const bb = vinfo(o).bb;
                    if (bb[2] < cx0 || bb[0] > cx1 || bb[3] < cy0 || bb[1] > cy1) continue;
                    for (let si = 0; si < o.subs.length; si++) {
                      const ns = o.subs[si].nodes;
                      for (let ni = 0; ni < ns.length; ni++) {
                        const n = ns[ni];
                        const on = selNodes.has(n.id);
                        if (!on && (n.x < cx0 || n.x > cx1 || n.y < cy0 || n.y > cy1)) continue;
                        if (useScreenDedup && !on) {
                          const nk = (Math.round(n.x * invNodeCell) & 0xffff) << 16 | Math.round(n.y * invNodeCell) & 0xffff;
                          if (seenNodes.has(nk)) continue;
                          seenNodes.add(nk);
                        }
                        const nx = r1(n.x),
                          ny = r1(n.y);
                        const hv = hVis && hOk(o, n);
                        if (hv && n.handleIn) {
                          const isSelH = selHandles.has(n.id + ':in');
                          let drawH = true;
                          if (useScreenDedup && !isSelH) {
                            const hk = (Math.round(n.handleIn.x * invHandleCell) & 0xffff) << 16 | Math.round(n.handleIn.y * invHandleCell) & 0xffff;
                            if (seenHandles.has(hk)) drawH = false;else seenHandles.add(hk);
                          }
                          if (drawH) {
                            const hx = r1(n.handleIn.x),
                              hy = r1(n.handleIn.y);
                            hLinesArr.push(`M${nx} ${ny}L${hx} ${hy}`);
                            if (isSelH) selEls.push(<circle key={n.id + ':in'} cx={hx} cy={hy} r={hSelR} fill={handleColor} stroke="#ffffff" strokeWidth={nodeSw} />);else hDotsArr.push(circlePath(hx, hy, hr));
                          }
                        }
                        if (hv && n.handleOut) {
                          const isSelH = selHandles.has(n.id + ':out');
                          let drawH = true;
                          if (useScreenDedup && !isSelH) {
                            const hk = (Math.round(n.handleOut.x * invHandleCell) & 0xffff) << 16 | Math.round(n.handleOut.y * invHandleCell) & 0xffff;
                            if (seenHandles.has(hk)) drawH = false;else seenHandles.add(hk);
                          }
                          if (drawH) {
                            const hx = r1(n.handleOut.x),
                              hy = r1(n.handleOut.y);
                            hLinesArr.push(`M${nx} ${ny}L${hx} ${hy}`);
                            if (isSelH) selEls.push(<circle key={n.id + ':out'} cx={hx} cy={hy} r={hSelR} fill={handleColor} stroke="#ffffff" strokeWidth={nodeSw} />);else hDotsArr.push(circlePath(hx, hy, hr));
                          }
                        }
                        if (nv) {
                          if (on) {
                            if (selNodes.size > 160) {
                              selRectsArr.push(n.type === 'corner' ? diamondPath(nx, ny, nszNow) : circlePath(nx, ny, sr));
                            } else {
                              selEls.push(n.type === 'corner' ? <path key={'sn-' + n.id} d={diamondPath(nx, ny, nszNow)} fill="var(--acc)" stroke="#fff" strokeWidth={nodeSw} /> : <circle key={'sn-' + n.id} cx={nx} cy={ny} r={sr} fill="var(--acc)" stroke="#fff" strokeWidth={nodeSw} />);
                            }
                          } else if (n.type === 'corner') {
                            cRectsArr.push(diamondPath(nx, ny, nszNow));
                          } else {
                            sCircsArr.push(circlePath(nx, ny, sr));
                          }
                        }
                      }
                    }
                  }
                  const hLines = hLinesArr.join('');
                  const hDots = hDotsArr.join('');
                  const cRects = cRectsArr.join('');
                  const sCircs = sCircsArr.join('');
                  const selRects = selRectsArr.join('');
                  return <g data-drag-nodes="1" pointerEvents="none">{hLines && <path d={hLines} fill="none" stroke={handleColor} strokeWidth={lineSw} />}{hDots && <path d={hDots} fill="#ffffff" stroke={handleColor} strokeWidth={nodeSw} />}{cRects && <path d={cRects} fill="#ffffff" stroke="var(--acc)" strokeWidth={nodeSw} />}{sCircs && <path d={sCircs} fill="#ffffff" stroke="var(--acc)" strokeWidth={nodeSw} />}{selRects && <path d={selRects} fill="var(--acc)" stroke="#ffffff" strokeWidth={nodeSw} />}{selEls}</g>;
                }
                return <g data-drag-nodes="1">{shown.map(o => o.subs.map(sp => sp.nodes.map(n => {
                    const on = selNodes.has(n.id),
                      hv = showSelHandles && hOk(o, n),
                      nv = showSelNodes;
                    return <g key={n.id}>{hv && n.handleIn && <><line x1={n.x} y1={n.y} x2={n.handleIn.x} y2={n.handleIn.y} stroke={handleColor} strokeWidth={lineSw} /><circle cx={n.handleIn.x} cy={n.handleIn.y} r={selHandles.has(n.id + ':in') ? hSelR : hr} fill={selHandles.has(n.id + ':in') ? handleColor : '#ffffff'} stroke={handleColor} strokeWidth={nodeSw} /></>}{hv && n.handleOut && <><line x1={n.x} y1={n.y} x2={n.handleOut.x} y2={n.handleOut.y} stroke={handleColor} strokeWidth={lineSw} /><circle cx={n.handleOut.x} cy={n.handleOut.y} r={selHandles.has(n.id + ':out') ? hSelR : hr} fill={selHandles.has(n.id + ':out') ? handleColor : '#ffffff'} stroke={handleColor} strokeWidth={nodeSw} /></>}{nv && (n.type === 'corner' ? <path d={diamondPath(n.x, n.y, nszNow)} fill={on ? 'var(--acc)' : '#fff'} stroke={on ? '#fff' : 'var(--acc)'} strokeWidth={nodeSw} /> : <circle cx={n.x} cy={n.y} r={sr} fill={on ? 'var(--acc)' : '#fff'} stroke={on ? '#fff' : 'var(--acc)'} strokeWidth={nodeSw} />)}</g>;
                  })))}</g>;
              }, [shown, Math.round(zoom * 2) / 2, cullBounds, showSelNodes, showSelHandles, selNodes, selHandles, nodeScale])}{tool === 'addnode' && addHov && <g pointerEvents="none"><path d={addHov.d} fill="none" stroke="var(--acc)" strokeWidth={3 / zoom} strokeLinecap="round" opacity="0.5" /><circle cx={addHov.x} cy={addHov.y} r={7 / zoom} fill={addHov.kind ? '#f43f5e' : 'var(--acc)'} fillOpacity="0.22" stroke={addHov.kind ? '#f43f5e' : 'var(--acc)'} strokeWidth={1.5 / zoom} /><circle cx={addHov.x} cy={addHov.y} r={2.4 / zoom} fill={addHov.kind ? '#f43f5e' : 'var(--acc)'} />{addHov.kind && <text x={addHov.x + 11 / zoom} y={addHov.y - 9 / zoom} fontSize={10.5 / zoom} fontWeight="600" fontFamily="sans-serif" fill="#f43f5e" stroke="#fff" strokeWidth={3 / zoom} paintOrder="stroke" strokeLinejoin="round">{addHov.label}</text>}</g>}{tool === 'addhandle' && hhHov && <g pointerEvents="none" opacity={hhHov.can ? 1 : 0.55}>{hhHov.prev.in && <><line x1={hhHov.x} y1={hhHov.y} x2={hhHov.prev.in.x} y2={hhHov.prev.in.y} stroke="var(--acc)" strokeWidth={1.2 / zoom} strokeDasharray={3 / zoom} /><circle cx={hhHov.prev.in.x} cy={hhHov.prev.in.y} r={3.5 / zoom} fill="#fff" stroke="var(--acc)" strokeWidth={1.2 / zoom} /></>}{hhHov.prev.out && <><line x1={hhHov.x} y1={hhHov.y} x2={hhHov.prev.out.x} y2={hhHov.prev.out.y} stroke="var(--acc)" strokeWidth={1.2 / zoom} strokeDasharray={3 / zoom} /><circle cx={hhHov.prev.out.x} cy={hhHov.prev.out.y} r={3.5 / zoom} fill="#fff" stroke="var(--acc)" strokeWidth={1.2 / zoom} /></>}<circle cx={hhHov.x} cy={hhHov.y} r={9 / zoom} fill="var(--acc)" fillOpacity="0.16" stroke="var(--acc)" strokeWidth={1.5 / zoom} /><circle cx={hhHov.x} cy={hhHov.y} r={2.6 / zoom} fill="var(--acc)" />{!hhHov.can && <text x={hhHov.x + 12 / zoom} y={hhHov.y - 10 / zoom} fontSize={10.5 / zoom} fontWeight="600" fontFamily="sans-serif" fill="var(--mut)" stroke="#fff" strokeWidth={3 / zoom} paintOrder="stroke" strokeLinejoin="round">Sudah punya handle</text>}</g>}{indivCornerOpen && detectedCorners.length > 0 && <g className="ved-corner-badges">{detectedCorners.map(c => {
                  const on = pickedCornerKeys.has(c.key);
                  const targetObj = doc.objects.find(o => o.id === c.objId);
                  const bb = targetObj ? VE.tightBBox(targetObj) : [0, 0, 100, 100];
                  const objDim = Math.max(16, Math.min(Math.abs(bb[2] - bb[0]), Math.abs(bb[3] - bb[1])));
                  const zEff = Math.max(0.85, zoom);
                  const maxBadgeR = Math.max(5, objDim * 0.22);
                  const rBadge = Math.min(9 / zEff, maxBadgeR, 14);
                  const badgeScale = rBadge / 9;
                  return <g key={'cb-' + c.key} data-drag-id={c.objId} style={{
                    cursor: 'pointer'
                  }} onPointerDown={e => {
                    e.stopPropagation();
                    setPickedCornerKeys(prev => {
                      const next = new Set(prev);
                      if (next.has(c.key) && next.size > 1) next.delete(c.key);else next.add(c.key);
                      return next;
                    });
                  }}><circle cx={c.x} cy={c.y} r={rBadge} fill={on ? 'var(--acc)' : 'var(--card)'} stroke="var(--acc)" strokeWidth={1.5 * badgeScale} /><text x={c.x} y={c.y + 3.2 * badgeScale} textAnchor="middle" fontSize={9.5 * badgeScale} fontWeight="700" fontFamily="Inter, sans-serif" fill={on ? '#ffffff' : 'var(--acc)'} style={{
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}>{c.idx}</text></g>;
                })}</g>}{renderCfg.debugMode !== 'none' && <RenderDebugCanvasOverlay doc={doc} zoom={zoom} debugMode={renderCfg.debugMode} cullBounds={cullBounds} />}{vcSimp && vcSimp.showOriginal && vcSimp.preview && vcSimp.baseDoc && <g className="vc-original-path-overlay" pointerEvents="none">{vcSimp.baseDoc.objects.filter(o => !o.hidden && !o.locked && !o.img && !o.isFrameBg && !o.isAutoFrame && (!vcSimp.baseSel.objs.size || vcSimp.baseSel.objs.has(o.id))).map(o => <path key={'vc-orig-' + o.id} d={VE.serializePath(o)} fill="none" stroke="#f97316" strokeOpacity="0.45" strokeWidth={3 / Math.max(1e-4, zoom)} strokeLinecap="round" strokeLinejoin="round" />)}</g>}{marq && <rect x={marq.x0} y={marq.y0} width={marq.x1 - marq.x0} height={marq.y1 - marq.y0} fill="var(--acc)" fillOpacity="0.12" stroke="var(--acc)" strokeWidth={1 / zoom} strokeDasharray={4 / zoom} pointerEvents="none" />}{snapInd && <g pointerEvents="none">{(snapInd.guides || []).map((g, gi) => {
                  /* C9: warna panduan mengikuti kind (sama dengan warna di
                     menu checklist), bukan merah semua. */
                  const col = SNAP_GUIDE_COLOR(g.kind);
                  if (g.type === 'line') {
                    const s = 3 / zoom,
                      ends = g.kind !== 'artboard' && g.kind !== 'grid',
                      mx = (g.x1 + g.x2) / 2,
                      my = (g.y1 + g.y2) / 2;
                    return <g key={'gl' + gi} stroke={col} strokeWidth={1 / zoom} fill="none" strokeLinecap="butt"><line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />{ends && <><path d={`M${g.x1 - s} ${g.y1 - s}L${g.x1 + s} ${g.y1 + s}M${g.x1 + s} ${g.y1 - s}L${g.x1 - s} ${g.y1 + s}`} /><path d={`M${g.x2 - s} ${g.y2 - s}L${g.x2 + s} ${g.y2 + s}M${g.x2 + s} ${g.y2 - s}L${g.x2 - s} ${g.y2 + s}`} /></>}{g.label && <><rect x={mx - 12 / zoom} y={my - 7 / zoom} width={24 / zoom} height={14 / zoom} rx={3 / zoom} fill={col} stroke="none" /><text x={mx} y={my + 3.2 / zoom} textAnchor="middle" fontSize={9 / zoom} fontWeight="600" fill="#fff" stroke="none" fontFamily="sans-serif">{g.label}</text></>}</g>;
                  }
                  if (g.type === 'spacing') {
                    const mx = (g.x1 + g.x2) / 2,
                      my = (g.y1 + g.y2) / 2,
                      horiz = Math.abs(g.y2 - g.y1) < 1e-4,
                      tick = 5 / zoom;
                    return <g key={'gs' + gi} stroke={col} strokeWidth={1 / zoom}><line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />{horiz ? <><line x1={g.x1} y1={g.y1 - tick} x2={g.x1} y2={g.y1 + tick} /><line x1={g.x2} y1={g.y2 - tick} x2={g.x2} y2={g.y2 + tick} /></> : <><line x1={g.x1 - tick} y1={g.y1} x2={g.x1 + tick} y2={g.y1} /><line x1={g.x2 - tick} y1={g.y2} x2={g.x2 + tick} y2={g.y2} /></>}<rect x={mx - 14 / zoom} y={my - 7 / zoom} width={28 / zoom} height={14 / zoom} rx={3 / zoom} fill={col} stroke="none" /><text x={mx} y={my + 3.2 / zoom} textAnchor="middle" fontSize={9.5 / zoom} fontWeight="600" fill="#fff" stroke="none" fontFamily="sans-serif">{g.label}</text></g>;
                  }
                  return null;
                })}{snapInd.cross !== false && snapInd.x != null && <g stroke={SNAP_GUIDE_COLOR(snapInd.kind)} fill="none" strokeWidth={1 / zoom}><path d={'M' + (snapInd.x - 7 / zoom) + ' ' + snapInd.y + 'H' + (snapInd.x + 7 / zoom) + 'M' + snapInd.x + ' ' + (snapInd.y - 7 / zoom) + 'V' + (snapInd.y + 7 / zoom)} />{(snapInd.kind === 'edge' || snapInd.kind === 'hline' || snapInd.kind === 'midpoint' || snapInd.kind === 'perp') && <path d={'M' + snapInd.x + ' ' + (snapInd.y - 6 / zoom) + 'L' + (snapInd.x + 6 / zoom) + ' ' + snapInd.y + 'L' + snapInd.x + ' ' + (snapInd.y + 6 / zoom) + 'L' + (snapInd.x - 6 / zoom) + ' ' + snapInd.y + 'Z'} />}{snapInd.kind === 'node' && <circle cx={snapInd.x} cy={snapInd.y} r={6 / zoom} />}</g>}</g>}</g></svg>{vcSimp && vcSimp.mode === 'slider' && (
            <EditorSimplifyStrip isFixedBottom={true} bottomPx={96} triggerAutoSimplifyLevel={triggerAutoSimplifyLevel} autoSimplifyAllCanvas={autoSimplifyAllCanvasObjects} autoSimplifyOn={autoSimplifyOn} toggleAutoSimplify={toggleAutoSimplify} vcSimp={vcSimp} updateVcSimplify={updateVcSimplify} openVcMoreOptions={openVcMoreOptions} confirmVcSimplify={confirmVcSimplify} cancelVcSimplify={cancelVcSimplify} />
          )}{offStrip && (() => {
            const targetObjs = doc.objects.filter(o => !o.hidden && !o.locked && !o.img && !o.text && o.subs && o.subs.length && (!offStrip.baseSel.objs.size || offStrip.baseSel.objs.has(o.id)));
            const bb = targetObjs.length ? VE.docBounds({
              objects: targetObjs
            }) : null;
            const bw = boxRef.current && boxRef.current.clientWidth || 800;
            const bh = boxRef.current && boxRef.current.clientHeight || 600;
            let leftPx = bw / 2,
              topPx = 64;
            if (bb) {
              const cx = (bb[0] + bb[2]) * 0.5 * zoom + pan.x;
              const by = bb[3] * zoom + pan.y + 18;
              leftPx = clampN(cx, 175, Math.max(175, bw - 175));
              topPx = clampN(by, 16, Math.max(16, bh - 128));
            }
            return <EditorOffsetStrip leftPx={leftPx} topPx={topPx} offStrip={offStrip} updateOffsetStrip={updateOffsetStrip} confirmOffsetStrip={confirmOffsetStrip} cancelOffsetStrip={cancelOffsetStrip} />;
          })()}{vcSimp && vcSimp.mode === 'dialog' && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
            if (e.target === e.currentTarget) cancelVcSimplify();
          }}><div className="hp" role="dialog" aria-label="Simplify" style={{
              maxWidth: 400,
              width: '92vw'
            }} onPointerDown={e => e.stopPropagation()}><div className="flex items-center justify-between mb-3 pb-2" style={{
                borderBottom: '1px solid var(--line)'
              }}><div><div className="text-sm font-semibold">Simplify</div><div className="text-[11px] mut">VectorCraft Least-Squares Cubic Bézier Fitting</div></div><button type="button" className="fig-ibtn" data-tip="uiClose" onClick={cancelVcSimplify} aria-label="Close"><Ico n="x" size={14} /></button></div><div className="space-y-3 text-xs"><div><div className="flex items-center justify-between mb-1"><span className="mut font-medium">Curve Precision / Tolerance</span><button type="button" className="ved-pill text-[11px] flex items-center gap-1" style={{
                      padding: '2px 8px'
                    }} onClick={triggerAutoSimplifyLevel}><Ico n="wand" size={12} /><span>Auto</span></button></div><div className="grid grid-cols-[1fr_110px] gap-2 items-center"><Slider min={0} max={100} step={1} value={vcSimp.level} on={lvl => updateVcSimplify({
                      level: lvl,
                      tolerance: Math.round(VE.simplifyLevelTolerance(lvl) * 1000) / 1000
                    })} label="Simplify Level" tip="veSimplifyLevel" /><XfField label="pt" value={vcSimp.tolerance} min={0.001} step={0.1} on={v => updateVcSimplify({
                      tolerance: clampN(v, 0.001, 10000)
                    })} tip="veSimplifyTol" /></div></div><div><div className="flex items-center justify-between mb-1"><span className="mut font-medium">Corner Point Angle Threshold</span><span className="font-mono text-[11px]">{Math.round(vcSimp.angleThreshold)}°</span></div><div className="grid grid-cols-[1fr_110px] gap-2 items-center"><Slider min={0} max={180} step={1} value={vcSimp.angleThreshold} on={v => updateVcSimplify({
                      angleThreshold: v
                    })} label="Angle Threshold" tip="veSimplifyAngle" /><XfField label="\xB0" value={vcSimp.angleThreshold} min={0} step={1} on={v => updateVcSimplify({
                      angleThreshold: clampN(v, 0, 180)
                    })} tip="veSimplifyAngle" /></div></div><div className="space-y-2 pt-1" style={{
                  borderTop: '1px solid var(--line)'
                }}><button type="button" role="checkbox" aria-checked={vcSimp.straightLines} className={'c-chk' + (vcSimp.straightLines ? ' on' : '')} onClick={() => updateVcSimplify({
                    straightLines: !vcSimp.straightLines
                  })}><span className="c-chk-box">{vcSimp.straightLines && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>Convert to Straight Lines</span></button><button type="button" role="checkbox" aria-checked={vcSimp.showOriginal} className={'c-chk' + (vcSimp.showOriginal ? ' on' : '')} onClick={() => updateVcSimplify({
                    showOriginal: !vcSimp.showOriginal
                  })}><span className="c-chk-box">{vcSimp.showOriginal && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>Show Original Path</span></button><button type="button" role="checkbox" aria-checked={vcSimp.retain} className={'c-chk' + (vcSimp.retain ? ' on' : '')} onClick={() => setVcSimp(s => s ? {
                    ...s,
                    retain: !s.retain
                  } : s)}><span className="c-chk-box">{vcSimp.retain && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>Open this dialog with these settings next time</span></button></div><div className="flex items-center justify-between pt-2" style={{
                  borderTop: '1px solid var(--line)'
                }}><div className="flex items-center gap-3"><button type="button" role="checkbox" aria-checked={vcSimp.preview} className={'c-chk' + (vcSimp.preview ? ' on' : '')} onClick={() => updateVcSimplify({
                      preview: !vcSimp.preview
                    })}><span className="c-chk-box">{vcSimp.preview && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>Preview</span></button><span className="text-[11px] mut font-mono">Anchor Points: {vcSimp.preview ? `${vcSimp.before} → ${vcSimp.after}` : `${vcSimp.before}`}</span></div><div className="flex items-center gap-1.5"><button type="button" className="btn sec text-xs px-3 py-1.5" onClick={cancelVcSimplify}>Cancel</button><button type="button" className="btn pri text-xs px-4 py-1.5" onClick={confirmVcSimplify}>OK</button></div></div></div></div></div>, document.body)}{renamingId && (renamingId.startsWith('cg:') || renamingId.startsWith('ct:')) && (() => {
            const zNow = zoomRef.current || zoom || 1;
            const pNow = panRef.current || pan || {
              x: 0,
              y: 0
            };
            if (renamingId.startsWith('cg:')) {
              const fid = renamingId.slice(3);
              const fBox = containerBoxes.find(f => f.id === fid);
              if (!fBox) return null;
              const sx = Math.max(8, fBox.bb[0] * zNow + pNow.x);
              const sy = Math.max(8, fBox.bb[1] * zNow + pNow.y - 32);
              return <div className="fld px-2.5 py-1 shadow-lg" style={{
                position: 'absolute',
                left: sx + 'px',
                top: sy + 'px',
                minWidth: 160,
                zIndex: 55,
                background: 'var(--card)',
                border: '1.5px solid var(--acc)'
              }} onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onPointerCancel={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onMouseMove={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}><CustomTextBox autoFocus={true} selectOnFocus={true} value={renameVal} ariaLabel={L.edRenameFrameGroup} onChange={v => setRenameVal(v)} onCommit={v => commitRename(fid, true, v)} onCancel={() => {
                  renameSkip.current = true;
                  setRenamingId(null);
                }} /></div>;
            }
          })()}<EditorFloatingToolbar L={L} lang={prefs && prefs.lang || 'id'} tool={tool} setOpenGrp={setOpenGrp} setTool={setToolToggle} lastGrpTool={lastGrpTool} openGrp={openGrp} grpBtnRefs={grpBtnRefs} autoSimplifyOn={autoSimplifyOn} toggleAutoSimplify={toggleAutoSimplify} setAutoSimplifyOn={setAutoSimplifyOn} vcSimpRef={vcSimpRef} openVcSimplify={openVcSimplify} say={say} shapeKind={shapeKind} setShapeKind={setShapeKind} snapMenuBtn={snapMenuBtn} snapOn={snapOn} setSnapOn={setSnapOn} snapMenuOpen={snapMenuOpen} setSnapMenuOpen={setSnapMenuOpen} setSnapCfg={setSnapCfg} snapCfg={snapCfg} gridOn={gridOn} setGridOn={setGridOn} rulersOn={rulersOn} setRulersOn={setRulersOn} rulerUnit={rulerUnit} setRulerUnit={setRulerUnit} guidesVisible={guidesVisible} setGuidesVisible={setGuidesVisible} guidesLocked={guidesLocked} setGuidesLocked={setGuidesLocked} onClearGuides={() => setGuides([])} onResetRulerOrigin={() => setRulerOrigin({ x: 0, y: 0 })} mirrorBtn={mirrorBtn} mirrorCur={mirrorCur} selNodes={selNodes} mirrorOpen={mirrorOpen} setMirrorOpen={setMirrorOpen} MIRROR_OPTS={MIRROR_OPTS} curveDragOn={curveDragOn} setCurveDragOn={setCurveDragOn} commitObjs={commitObjs} sel={sel} selHandles={selHandles} applyMirror={applyMirror} onSettings={onSettings} boolOpen={boolOpen} setBoolOpen={setBoolOpen} boolBtn={boolBtn} selObjs={selObjs} applyBoolean={applyBoolean} applyOutlineStroke={applyOutlineStroke} openOffsetStrip={openOffsetStrip} applySeparateIconObjects={applySeparateIconObjects} canSeparateIcon={canSeparateIcon} applyFillEmptySpace={applyFillEmptySpace} canFillEmpty={canFillEmpty} nodeScale={nodeScale} setNodeScale={updateNodeScale} delSel={delSel} applyType={applyType} applySmoothNodes={applySmoothNodes} setClosed={setClosed} applyAutoSmooth={applyAutoSmooth} applyConvertToCurves={applyConvertToCurves} applyJoinNodes={applyJoinNodes} applySplitPath={applySplitPath} applyReversePath={applyReversePath} onOpenCodeInspector={openCodeInspector} isCodeInspectorOpen={isCodeInspectorOpen} />{(() => {
            if (typeof window !== 'undefined') {
              Object.defineProperty(window, '__geovantaAutoSimplifyOn', {
                get: () => autoSimplifyOnRef.current,
                configurable: true
              });
              window.__geovantaSetAutoSimplifyOn = setAutoSimplifyOn;
              window.__geovantaToggleAutoSimplify = toggleAutoSimplify;
              window.__geovantaAutoSimplifyCanvas = autoSimplifyAllCanvasObjects;
              window.__geovantaEditorApi = {
                openCodeInspector,
                closeCodeInspector,
                toggleCodeInspector,
                isCodeInspectorOpen: () => isCodeInspectorOpen,
                getSelectionColors: () => selectionColors,
                setSelectionDimension: (axis, v) => setXfDim(axis, v),
                getSnapCfg: () => snapCfgRef.current,
                setSnapCfg,
                getGridOn: () => gridOnRef.current,
                setGridOn,
                getSnapOn: () => snapOnRef.current,
                setSnapOn,
                setSelObjs: (ids: string[]) => setSel({ objs: new Set(ids), nodes: new Set() }),
                triggerFrameClick: (x, y) => {
                  const base = docRef.current;
                  const hitF = VE.listFrames(base, null).find(f => x >= f.bb[0] && x <= f.bb[2] && y >= f.bb[1] && y <= f.bb[3]);
                  if (hitF) {
                    const fObjs = new Set(base.objects.filter(o => o.group === hitF.id).map(o => o.id));
                    if (hitF.bg) fObjs.add(hitF.bg.id);
                    setSel({ objs: fObjs.size > 0 ? fObjs : new Set([hitF.bg ? hitF.bg.id : hitF.id]), nodes: new Set() });
                    setTool('select');
                    return hitF.id;
                  }
                  return null;
                },
                createTestShape: (kind, x, y, w, h) => {
                  if (kind === 'text') {
                    const id = VE.uid();
                    const obj = normalizeTextObject({
                      id,
                      name: 'Text-Test',
                      type: 'text',
                      subs: [],
                      opacity: 1,
                      fill: '#111827',
                      text: {
                        content: 'Sample Text',
                        x: x || 50,
                        y: (y || 50) + 16,
                        fontSize: 16,
                        fontFamily: 'Geovanta Sans',
                        fontWeight: 'normal',
                        fontStyle: 'normal',
                        textAnchor: 'start',
                        verticalAlign: 'top',
                        resizing: 'autoWidth',
                        textDecoration: 'none',
                        textCase: 'original',
                        paragraphSpacing: 0,
                        fill: '#111827',
                        lineHeight: 1.2,
                        letterSpacing: 0,
                        width: w || 100,
                        height: null,
                        fontAssetId: null
                      }
                    });
                    commit({ ...docRef.current, objects: [...docRef.current.objects, obj] });
                    setSel({ objs: new Set([obj.id]), nodes: new Set() });
                    return obj;
                  }
                  const o = makeShape(kind || shapeKind, x, y, w, h);
                  if (o) {
                    commit({ ...docRef.current, objects: [...docRef.current.objects, o] });
                    setSel({ objs: new Set([o.id]), nodes: new Set() });
                  }
                  return o;
                },
                createTestImage: (x, y, w, h) => {
                  const href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
                  const imgObj = VE.makeImageObj(href, w || 100, h || 100, x || 50, y || 50, 'Image-Test');
                  commit({ ...docRef.current, objects: [...docRef.current.objects, imgObj] });
                  setSel({ objs: new Set([imgObj.id]), nodes: new Set() });
                  return imgObj;
                },
                autoSimplifyAllCanvasObjects,
                openVcSimplify,
                applyBoolean,
                applyMakeCompoundPath,
                applyReleaseCompoundPath,
                applySeparateIconObjects,
                fillEmptySpace: applyFillEmptySpace,
                applyFillEmptySpace,
                applyOutlineStroke,
                openOffsetStrip,
                updateOffsetStrip,
                confirmOffsetStrip,
                cancelOffsetStrip,
                getOffsetStripState: () => offStripRef.current,
                onIconifyInsert,
                getIconifyCascadeCount: () => iconifyCascadeRef.current,
                insertChart: onChartInsert,
                updateChartConfig: onChartConfigChange,
                detachChart: onChartDetach,
                getChartTypes: () => ALL_ECHARTS_SERIES_TYPES,
                autoTraceSelectedImages,
                openBoolPopup: () => setBoolOpen(true),
                closeBoolPopup: () => setBoolOpen(false),
                openNodeGrp: () => setOpenGrp('nodeGrp'),
                openDrawGrp: () => setOpenGrp('drawGrp'),
                getRightSidebarOpen: () => rightOpenRef.current,
                setRightSidebarOpen: v => setRightOpen(!!v),
                toggleRightSidebar: () => setRightOpen(o => !o),
                finishPen,
                cancelPen,
                closePenAndFinish,
                penUndoLast,
                getPenState: () => {
                  const s = penRef.current;
                  if (!s) return null;
                  const f = penFind(docRef.current, s);
                  return {
                    oid: s.oid,
                    nodesCount: f ? f.sp.nodes.length : 0,
                    closed: f ? f.sp.closed : false
                  };
                },
                startTestPenSession: pts => {
                  const oid = VE.uid(),
                    spid = VE.uid();
                  const nodes = pts.map(p => ({
                    id: VE.uid(),
                    x: p.x,
                    y: p.y,
                    type: 'corner',
                    handleIn: null,
                    handleOut: null
                  }));
                  const base = docRef.current;
                  const nd = {
                    ...base,
                    objects: [...base.objects, {
                      id: oid,
                      name: 'Pen-' + (base.objects.length + 1),
                      type: 'path',
                      fill: 'none',
                      stroke: '#000000',
                      strokeWidth: 2,
                      opacity: 1,
                      fillRule: 'nonzero',
                      group: null,
                      subs: [{ id: spid, closed: false, nodes }]
                    }]
                  };
                  commit(nd);
                  setPen({ oid, spid, cur: null, close: false });
                  setSel({ objs: new Set([oid]), nodes: new Set([nodes[nodes.length - 1].id]) });
                },
                finishCurvature,
                curvatureUndoLast,
                getCurvatureState: () => {
                  const s = curvatureRef.current;
                  if (!s) return null;
                  return {
                    oid: s.oid,
                    pts: s.pts.map(p => ({ ...p })),
                    closed: s.closed
                  };
                },
                startTestCurvatureSession: pts => {
                  const oid = VE.uid(),
                    spid = VE.uid();
                  const cPts = pts.map(p => ({
                    id: VE.uid(),
                    x: p.x,
                    y: p.y,
                    type: 'smooth'
                  }));
                  const s = {
                    oid,
                    spid,
                    name: nextCurvatureName(),
                    pts: cPts,
                    closed: false,
                    base: docRef.current,
                    obj: null,
                    toggleTimer: null,
                    togglePid: null
                  };
                  curvatureRef.current = s;
                  rebuildCurvaturePreview();
                  setSel({ objs: new Set([oid]), nodes: new Set([cPts[cPts.length - 1].id]) });
                },
                createTestLine: (p0, p1) => {
                  const id = VE.uid(),
                    name = nextLineName();
                  const o = makeLine(p0, p1, {}, id, name);
                  if (o) {
                    commit({
                      ...docRef.current,
                      objects: [...docRef.current.objects, o]
                    });
                    setSel({ objs: new Set([o.id]), nodes: new Set() });
                  }
                },
                createTestArc: (cx, cy, r, startDeg, sweepDeg) => {
                  const id = VE.uid(),
                    name = nextArcName();
                  const o = makeArc(cx, cy, r, startDeg, sweepDeg, id, name);
                  if (o) {
                    commit({
                      ...docRef.current,
                      objects: [...docRef.current.objects, o]
                    });
                    setSel({ objs: new Set([o.id]), nodes: new Set() });
                  }
                },
                createTestWeave: (x, y, w, h) => {
                  const gid = nextWeaveGroupId();
                  const strips = makeWeave(x, y, w, h, gid);
                  if (strips.length) {
                    commit({
                      ...docRef.current,
                      objects: [...docRef.current.objects, ...strips]
                    });
                    setSel({ objs: new Set(strips.map(s => s.id)), nodes: new Set() });
                  }
                },
                setTool: t => setToolToggle(t),
                getTool: () => tool,
                setSel: s => {
                  const oSet = s.objs instanceof Set ? s.objs : new Set(s.objs || []);
                  const nSet = s.nodes instanceof Set ? s.nodes : new Set(s.nodes || []);
                  setSel({ objs: oSet, nodes: nSet });
                },
                getSel: () => ({
                  objs: Array.from(selRef.current.objs),
                  nodes: Array.from(selRef.current.nodes)
                }),
                delSel,
                applyType,
                applyMirror,
                applyAutoSmooth,
                applyConvertToCurves,
                applyJoinNodes,
                applySplitPath,
                applyReversePath,
                setClosed,
                undo,
                canUndo: () => hist.current.p > 0,
                getNodeScale: () => nodeScaleRef.current,
                setNodeScale: updateNodeScale,
                triggerAutoHandleNode: (oid, spid, nid) => {
                  const base = docRef.current;
                  const o0 = base.objects.find(q => q.id === oid);
                  if (!o0 || o0.locked || o0.hidden || o0.img) return;
                  const o1 = VE.autoHandles(o0, spid, { preserveShape: true });
                  setSel({ objs: new Set([oid]), nodes: new Set(nid ? [nid] : []) });
                  commit({
                    ...base,
                    objects: base.objects.map(q => q.id === oid ? o1 : q)
                  });
                },
                loadTestSvg: (svgStr, label) => {
                  const parsed = VE.parseSVG(svgStr);
                  const finalDoc = autoSimplifyOnRef.current ? VE.autoSimplifyDoc(parsed).doc : parsed;
                  /* Dokumen kecil (≤1 chunk) tetap jalur sinkron lama persis;
                     dokumen besar dimuat chunked (Task 10, B-F1) — mengembalikan
                     promise yang resolve sesudah load selesai. */
                  if ((finalDoc.objects || []).length <= DOC_LOAD_CHUNK) return loadDoc(finalDoc, label + ' dimuat');
                  return loadDocChunked(finalDoc, label + ' dimuat');
                },
                loadTestDoc: (d, label) => {
                  loadDoc(d, label + ' dimuat');
                },
                setDoc: d => commit(d),
                commitDoc: commit,
                commit: (d, key) => commit(d, key),
                setSelection: ids => setSel({ objs: new Set(ids), nodes: new Set() }),
                startTextEdit: id => setEditingText({ id, isNew: false }),
                getEditingText: () => editingText,
                getSelection: () => Array.from(selRef.current?.objs || []),
                downloadSvg,
                exportSvg,
                setZ: (zf, cx = null, cy = null, soft = false) => setZ(zf, cx, cy, soft),
                zoomBy: (f, cx = null, cy = null) => zoomBy(f, cx, cy),
                fitView: () => fitView(),
                fitSel: () => fitSel(),
                panTo: (wx, wy) => panTo(wx, wy),
                getZoom: () => zoomRef.current,
                getDoc: () => docRef.current,
                getSceneRenderer: () => sceneRendererRef.current,
                readCanvasPixels: (x, y, w, h) => {
                  const sr = sceneRendererRef.current;
                  if (!sr || !sr.surface) return null;
                  const img = sr.surface.makeImageSnapshot();
                  try {
                    const kit = sr.scene.kit;
                    const info = {
                      width: w,
                      height: h,
                      colorType: kit.ColorType.RGBA_8888,
                      alphaType: kit.AlphaType.Premul,
                      colorSpace: kit.ColorSpace.SRGB
                    };
                    const pixels = img.readPixels(x, y, info);
                    return pixels ? Array.from(pixels) : null;
                  } finally {
                    img.delete();
                  }
                },
                getAntialias: () => !!RENDER_CONFIG.antialias,
                setAntialias: on => {
                  updateRenderConfig({ antialias: on });
                  setPrefs?.(p => ({ ...p, antialias: on }));
                  if (sceneRendererRef.current) sceneRendererRef.current.requestRender(true);
                },
                applyRadiusToCorners,
                setRadius,
                setIndivCornerOpen,
                getDetectedCorners: () => detectedCorners,
                getActiveCorners: () => activeCorners,
                runAutomatedBenchmarks: () => {
                  const suites: [string, () => any, number][] = [[L.edBenchTest01, () => VE.parseSVG(GEOVANTA_BENCHMARK_SUITE.buildCircleSvg()), 1], [L.edBenchTest02, () => VE.parseSVG(GEOVANTA_BENCHMARK_SUITE.buildBezierSvg()), 2], [L.edBenchTest03, () => VE.parseSVG(GEOVANTA_BENCHMARK_SUITE.buildDiagonalSvg()), 1], [L.edBenchTest04, () => VE.parseSVG(GEOVANTA_BENCHMARK_SUITE.buildCompoundSvg()), 1], [L.edBenchDensity1k, () => GEOVANTA_BENCHMARK_SUITE.buildNodeDensityDoc(1000), 1], [L.edBenchDensity10k, () => GEOVANTA_BENCHMARK_SUITE.buildNodeDensityDoc(10000), 1], [L.edBenchZoom, () => VE.parseSVG(GEOVANTA_BENCHMARK_SUITE.buildCircleSvg()), 256], [L.edBenchCoord, () => GEOVANTA_BENCHMARK_SUITE.buildExtremeCoordinateDoc(100000000), 1], [L.edBenchStress, () => GEOVANTA_BENCHMARK_SUITE.buildSeamMosaicDoc(240), 1]];
                  const rows = [];
                  suites.forEach(([name, makeFn, zTest]) => {
                    const d = makeFn();
                    const t0 = performance.now();
                    let verts = 0,
                      fillTris = 0,
                      strokeTris = 0,
                      tolMet = true;
                    d.objects.forEach(o => {
                      const gm = buildObjectGpuBuffers(o, zTest);
                      verts += gm.totalVerts;
                      fillTris += gm.fillTriCount || 0;
                      strokeTris += gm.strokeTriCount || 0;
                      if (gm.tessellationMetadata && !gm.tessellationMetadata.toleranceMet) tolMet = false;
                    });
                    const t1 = performance.now();
                    const hitsBefore = GEOMETRY_CACHE.getStats().hits;
                    if (d.objects[0]) {
                      const colorChangedObj = {
                        ...d.objects[0],
                        fill: '#ff0055'
                      };
                      getObjectTessellationLOD(colorChangedObj, zTest);
                    }
                    const cacheHitVerified = GEOMETRY_CACHE.getStats().hits > hitsBefore;
                    rows.push({
                      name,
                      objs: d.objects.length,
                      zoom: zTest * 100 + '%',
                      lod: Math.floor(Math.log2(zTest)),
                      verts,
                      tris: fillTris + strokeTris,
                      ms: Math.round((t1 - t0) * 100) / 100,
                      tolMet,
                      cacheHitVerified
                    });
                  });
                  setBenchResults(rows);
                  say('Benchmark selesai');
                  return rows;
                }
              };
            }
            return null;
          })()}</div></div>{isMobile ? (
      <>
        {(leftOpen || rightOpen) && (
          <div
            className="mob-sheet-backdrop"
            data-testid="mobile-sheet-backdrop"
            onPointerDown={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
          />
        )}
        {leftOpen && (
          <MobileBottomSheet
            testId="mobile-layers-sheet"
            title={`${L.edLayers || 'Layers'} (${doc.objects.length})`}
            closeTestId="mob-sheet-close-left"
            closeLabel={L.cClose || 'Tutup'}
            onClose={() => setLeftOpen(false)}
          >
            {leftSidebarNode}
          </MobileBottomSheet>
        )}
        {rightOpen && (
          <MobileBottomSheet
            testId="mobile-inspector-sheet"
            title={prefs && prefs.lang === 'en' ? 'Properties & Inspector' : 'Properti & Inspektor'}
            closeTestId="mob-sheet-close-right"
            closeLabel={L.cClose || 'Tutup'}
            onClose={() => setRightOpen(false)}
          >
            {rightInspectorNode}
          </MobileBottomSheet>
        )}
      </>
    ) : (
      <div className="flex h-full min-h-0 relative select-none order-3 lg:order-none"><button type="button" className={'fig-sidebar-edge-toggle fig-sidebar-edge-toggle-right' + (rightOpen ? ' on' : '')} data-tip={rightOpen ? 'veRightSidebarHide' : 'veRightSidebarShow'} aria-label={rightOpen ? L.edRightSidebarHide : L.edRightSidebarShow} aria-expanded={rightOpen} onPointerDown={e => e.stopPropagation()} onClick={e => {
            e.stopPropagation();
            setRightOpen(o => !o);
          }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3.5" y="4" width="17" height="16" rx="3.2" /><path d="M14.5 4v16" /><path d={rightOpen ? 'M9 9.5L11.5 12 9 14.5' : 'M11 9.5L8.5 12 11 14.5'} /></svg></button>{rightInspectorNode}</div>
    )}</div>{lineSizeDlg && <div data-testid="line-size-dialog" className="flt p-3 rounded-xl shadow-xl border border-[var(--line)] space-y-2" style={{
              position: 'fixed',
              left: Math.min(window.innerWidth - 230, Math.max(12, lineSizeDlg.sx + 10)),
              top: Math.min(window.innerHeight - 160, Math.max(12, lineSizeDlg.sy + 10)),
              width: 210,
              zIndex: 9999,
              background: 'var(--card)'
            }} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <div className="text-[11px] font-semibold uppercase mut">Line Segment</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] mut flex flex-col gap-0.5">
                  <span>Length</span>
                  <input data-testid="line-size-length" type="number" className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--sub)] text-[11px] text-[var(--ink)]" value={lineSizeDlg.len} onChange={e => setLineSizeDlg(d => d ? { ...d, len: e.target.value } : null)} />
                </label>
                <label className="text-[10px] mut flex flex-col gap-0.5">
                  <span>Angle (°)</span>
                  <input data-testid="line-size-angle" type="number" className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--sub)] text-[11px] text-[var(--ink)]" value={lineSizeDlg.ang} onChange={e => setLineSizeDlg(d => d ? { ...d, ang: e.target.value } : null)} />
                </label>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button type="button" className="ved-pill text-[10px]" onClick={() => setLineSizeDlg(null)}>Batal</button>
                <button type="button" data-testid="line-size-apply" className="btn pri text-[10px] px-2.5 py-1 rounded-lg" onClick={() => {
                  const len = Math.max(1, Number(lineSizeDlg.len) || 100);
                  const rad = ((Number(lineSizeDlg.ang) || 0) * Math.PI) / 180;
                  const endPt = { x: lineSizeDlg.x + len * Math.cos(rad), y: lineSizeDlg.y + len * Math.sin(rad) };
                  const o = makeLine({ x: lineSizeDlg.x, y: lineSizeDlg.y }, endPt, {}, VE.uid(), nextLineName());
                  setLineSizeDlg(null);
                  if (o) {
                    commit({ ...docRef.current, objects: [...docRef.current.objects, o] });
                    setSel({ objs: new Set([o.id]), nodes: new Set() });
                    setTool('select');
                    say(o.name + ' ditambahkan');
                  }
                }}>OK</button>
              </div>
            </div>}<IconifyModal open={tool === 'iconify'} onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={prefs && prefs.recentIcons || []} /><ChartsStudioModal open={tool === 'charts'} initialConfig={chartsEditTarget?.config || null} editingGroupId={chartsEditTarget?.groupId || null} onInsert={onChartInsert} onUpdate={(gid, cfg) => { onChartConfigChange(gid, cfg); onChartsClose(); }} onClose={onChartsClose} googleFonts={GOOGLE_FONTS.families.map(f => f.family)} L={L} lang={prefs && prefs.lang || 'id'} /><SvgCodeInspectorModal isOpen={isCodeInspectorOpen} onClose={() => setIsCodeInspectorOpen(false)} doc={doc} selIds={sel.objs} onUpdateDoc={(newDoc) => commit(newDoc)} lang={prefs && prefs.lang || 'id'} />{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
      if (e.target === e.currentTarget) setImportModalOpen(false);
    }}><div className="hp" role="dialog" aria-label="Impor Berkas" style={{
        maxWidth: 480
      }}><div className="flex items-center justify-between mb-3"><div><div className="text-sm font-semibold">{L.impTitle}</div><div className="text-[11px] mut mt-0.5">{L.impHint2}</div></div><button type="button" data-tip="uiClose" className="btn sec" style={{
            padding: 0,
            width: 32,
            height: 32,
            borderRadius: '50%'
          }} onClick={() => setImportModalOpen(false)}><Ico n="x" size={14} /></button></div><div className="drop p-6 rounded-2xl text-center cursor-pointer space-y-2" style={{
          border: '2px dashed var(--line)'
        }} onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }} onDrop={e => {
          e.preventDefault();
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            importFiles(e.dataTransfer.files);
            setImportModalOpen(false);
          }
        }} onClick={async () => {
          if (window.showOpenFilePicker) {
            try {
              const hs = await window.showOpenFilePicker({
                multiple: true
              });
              const fs = await Promise.all(hs.map(h => h.getFile()));
              if (fs.length) {
                importFiles(fs);
                setImportModalOpen(false);
              }
            } catch (e) {}
          } else {
            pasteFromSystem();
            setImportModalOpen(false);
          }
        }}><div className="drop-i inline-flex items-center justify-center w-11 h-11 rounded-xl" style={{
            background: 'var(--sub)',
            color: 'var(--acc)'
          }}><Ico n="upload" size={22} /></div><div className="text-xs font-semibold">{L.impDrop}</div><div className="text-[11px] mut">{L.impSupports}</div></div><div className="mt-3 space-y-2"><div className="text-[11px] mut font-medium">{L.impPaste}</div><div className="fld p-2" style={{
            minHeight: 42
          }}><CustomTextBox value={pasteSvgDraft} ariaLabel={L.impCodeAria} onChange={setPasteSvgDraft} onCommit={v => setPasteSvgDraft(v)} /></div><div className="flex gap-2"><button type="button" className="btn sec flex-1 text-xs" onClick={() => {
              pasteFromSystem();
              setImportModalOpen(false);
            }}><Ico n="copy" size={14} />{L.impPasteClip}</button><button type="button" className="btn pri flex-1 text-xs" disabled={!pasteSvgDraft.trim()} onClick={() => {
              if (pasteText(pasteSvgDraft)) {
                setPasteSvgDraft('');
                setImportModalOpen(false);
              } else say('Kode SVG tidak valid');
            }}>{L.impLoadCode}</button></div></div></div></div>, document.body)}<CtxMenu menu={ctx} items={ctxItems} onClose={() => setCtx(null)} />{!debugOpen && (!isMobile || debugEnabled) && (
            <button
              type="button"
              className="debug-launcher ved-debug-pill btn sec"
              style={{
                position: 'fixed',
                right: 12,
                bottom: 12,
                zIndex: 65,
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 20,
                background: 'var(--card)',
                border: '1px solid var(--line)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
              title="Debugging Mode (Ctrl+Shift+D)"
              aria-label="Debugging Mode (Ctrl+Shift+D)"
              onClick={toggleDebugMode}
            >
              <Ico n="code" size={13} />
              <span style={{ fontWeight: 600 }}>Debug</span>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: debugEnabled ? '#22c55e' : '#94a3b8',
                  display: 'inline-block'
                }}
              />
            </button>
          )}<DebugLogPanel open={debugOpen} enabled={debugEnabled} onToggle={toggleDebugMode} onClose={() => setDebugOpen(false)} />{full && lmsg && <div className="ved-toast" role="status" aria-live="polite">{lmsg}{lmsgAct && <button type="button" data-testid="toast-action" style={{pointerEvents: 'auto', marginLeft: 10, padding: '0 2px', font: 'inherit', color: '#fff', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', background: 'transparent', border: 0}} onClick={() => { const a = lmsgAct; clearTimeout(lmT.current); setLmsg(''); setLmsgAct(null); if (a) a.onClick(); }}>{lmsgAct.label}</button>}</div>}</div>;
};
/* ============================================================================
   GEOVANTA WORKSPACE — CORE STORAGE & DATA LAYER (PHASE 1, 2, 3, 7, 9, 10, 11)
   Modules:
   1. WorkspaceDB        — IndexedDB Engine (projects, documents, assets, snapshots, metadata)
   2. AssetManager       — Blob Storage, Object URL Cache, DataURL Migration & Hydration
   3. ThumbnailGenerator — Offscreen Canvas 2D / SVG WebP Preview Generator (max 320x240)
   4. ZipEngine          — Standalone CRC32 + ZIP Archive Reader/Writer for .geovanta
   5. ProjectRepository  — Transactional CRUD, Duplicate, Trash, Snapshots & Backup/Restore
   ============================================================================ */

export { VectorEditor };
export default VectorEditor;
