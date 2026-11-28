/**
 * @file src/components/editor/EditorFloatingToolbar.tsx
 * @description Komponen bilah alat melayang utama di bagian bawah kanvas (EditorFloatingToolbar)
 */
import React from 'react';
import { ICONS } from '../../constants/brandAndIcons.tsx';
import { VE_TOOLS, VE_GEO_GROUP, SHAPES, SHAPE_EN, SNAP_OPTS, SNAP_OPTS_EN, SNAP_TOOL_CAPABILITIES, DEFAULT_SNAP_CFG } from '../../constants/editorToolsAndShapes.tsx';
import { TIPS, TIPS_EN } from '../../constants/tooltipsCatalog.tsx';
import { Vi, Chev, ShapeGlyph, IconBtn, Ico } from '../ui/IconGlyphs.tsx';
import { Float } from '../ui/FloatPopover.tsx';
import { Slider } from '../ui/Slider.tsx';
import { VE } from '../../engine/vectorEngine.tsx';
import { RULER_UNITS, RulerUnit } from './CanvasRulers.tsx';

const FrameToolGlyph = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1" /><rect x="7.5" y="7.5" width="9" height="9" rx="0.5" /></svg>;
const NodeSizeGlyph = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" /><line x1="5.5" y1="18.5" x2="18.5" y2="5.5" stroke="currentColor" strokeWidth="1.6" /><circle cx="5.5" cy="18.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="18.5" cy="5.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M4 8V4h4 M20 16v4h-4" stroke="currentColor" strokeWidth="1.6" /></svg>;

const SNAP_ICON_PATHS = {
  bbox: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M12 2v4 M12 18v4 M2 12h4 M18 12h4" /></>,
  spacing: <><path d="M3 5v14 M21 5v14 M7 12h10 M7 12l2.5-2.5 M7 12l2.5 2.5 M17 12l-2.5-2.5 M17 12l-2.5 2.5" /></>,
  artboard: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M12 3v18 M3 12h18" /></>,
  node: <><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M4 20 9 15 M20 4l-5 5" /><circle cx="3.5" cy="20.5" r="1.3" /><circle cx="20.5" cy="3.5" r="1.3" /></>,
  axial: <><path d="M4 20V4 M4 20h16" /><circle cx="12" cy="12" r="2" /><path d="M12 14v6 M10 12H4" strokeDasharray="2 2.4" /></>,
  midpoint: <><path d="M3 18 21 6" /><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /><path d="M12 3.5v3 M12 17.5v3" /></>,
  edge: <><path d="M3 17C7 17 7 7 12 7s5 10 9 10" /><circle cx="12" cy="7" r="1.8" fill="currentColor" stroke="none" /></>,
  perp: <><path d="M5 4v15h15" /><path d="M5 14h5v5" /><path d="M15 4h5v5" strokeDasharray="2 2.4" /></>,
  grid: <><rect x="3" y="3" width="18" height="18" rx="1.5" /><path d="M9 3v18 M15 3v18 M3 9h18 M3 15h18" /></>,
  pixel: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" fill="currentColor" stroke="none" /></>
};
const SnapIcon = ({ k }) => <svg className="snp-custom-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SNAP_ICON_PATHS[k] || <circle cx="12" cy="12" r="6" />}</svg>;

const EditorFloatingToolbar = ({
  L,
  lang = 'id',
  tool,
  setOpenGrp,
  setTool,
  lastGrpTool,
  openGrp,
  grpBtnRefs,
  autoSimplifyOn = false,
  toggleAutoSimplify = null,
  setAutoSimplifyOn = null,
  vcSimpRef,
  openVcSimplify,
  say,
  shapeKind,
  setShapeKind,
  snapMenuBtn,
  snapOn,
  setSnapOn,
  snapMenuOpen,
  setSnapMenuOpen,
  setSnapCfg,
  snapCfg,
  gridOn,
  setGridOn,
  rulersOn = false,
  setRulersOn,
  rulerUnit = 'px',
  setRulerUnit,
  guidesVisible = true,
  setGuidesVisible,
  guidesLocked = false,
  setGuidesLocked,
  onClearGuides,
  onResetRulerOrigin,
  mirrorBtn,
  mirrorCur,
  selNodes,
  mirrorOpen,
  setMirrorOpen,
  MIRROR_OPTS,
  curveDragOn,
  setCurveDragOn,
  commitObjs,
  sel,
  selHandles,
  applyMirror,
  onSettings,
  boolOpen,
  setBoolOpen,
  boolBtn,
  selObjs,
  applyBoolean,
  applyOutlineStroke,
  openOffsetStrip,
  applySeparateIconObjects,
  canSeparateIcon = false,
  applyFillEmptySpace,
  canFillEmpty = false,
  nodeScale = 1,
  setNodeScale,
  delSel,
  applyType,
  applySmoothNodes,
  setClosed,
  applyAutoSmooth,
  applyConvertToCurves,
  applyJoinNodes,
  applySplitPath,
  applyReversePath,
  devMode = false,
  onToggleDevMode,
  wireframeMode = false,
  onToggleWireframe
}: any) => {
  /* Boolean / Pathfinder: syarat seleksi (sama seperti menu konteks). */
  const [lastBoolOp, setLastBoolOp] = React.useState('union');
  const [gridMenuOpen, setGridMenuOpen] = React.useState(false);
  const gridMenuBtn = React.useRef<HTMLDivElement | null>(null);
  const isMob = typeof document !== 'undefined' && document.documentElement.getAttribute('data-mobile') === '1';
  const isEn = lang === 'en';
  const MOB_LABELS: Record<string, string> = {
    select: isEn ? 'Select' : 'Pilih',
    nodeGrp: 'Node',
    drawGrp: isEn ? 'Draw' : 'Gambar',
    text: isEn ? 'Text' : 'Teks',
    hand: isEn ? 'Pan' : 'Geser',
    shape: isEn ? 'Shape' : 'Bentuk',
    iconify: isEn ? 'Icons' : 'Ikon',
  };
  const mobLbl = (text: string) => (isMob ? <span className="mob-tool-lbl">{text}</span> : null);
  const lpTimerRef = React.useRef<number>(0);
  const lpFiredRef = React.useRef<boolean>(false);
  const startLongPress = (e: any, onFire: () => void) => {
    if (e.pointerType !== 'touch') return;
    lpFiredRef.current = false;
    if (lpTimerRef.current) clearTimeout(lpTimerRef.current);
    lpTimerRef.current = window.setTimeout(() => {
      lpTimerRef.current = 0;
      lpFiredRef.current = true;
      onFire();
    }, 350);
  };
  const cancelLongPress = () => {
    if (lpTimerRef.current) {
      clearTimeout(lpTimerRef.current);
      lpTimerRef.current = 0;
    }
  };
  const unlockedSelObjs = (selObjs || []).filter(o => !o.locked && !o.hidden);
  const eligiblePaths = unlockedSelObjs.filter(o => !o.img && !o.text && o.subs && o.subs.length > 0);
  const canBool = eligiblePaths.length >= 2;
  const canOutline = eligiblePaths.some(o => o.stroke && o.stroke !== 'none' && o.strokeWidth > 0);
  const canOffset = eligiblePaths.length > 0;
  const TT = lang === 'en' ? TIPS_EN : TIPS;
  const BOOL_ITEMS = [
    ['union', 'veBoolUnion', L.edBoolUnion, 'M3 3h10v10H3z M11 11h10v10H11z', 'Ctrl+Alt+U', !canBool, () => { setLastBoolOp('union'); applyBoolean('union'); }],
    ['subtract', 'veBoolSubtract', L.edBoolSubtract, 'M3 3h18v18H3z M10 10h8v8h-8z', 'Ctrl+Alt+S', !canBool, () => { setLastBoolOp('subtract'); applyBoolean('subtract'); }],
    ['intersect', 'veBoolIntersect', L.edBoolIntersect, 'M8 3h8v18H8z M3 8h18v8H3z', 'Ctrl+Alt+I', !canBool, () => { setLastBoolOp('intersect'); applyBoolean('intersect'); }],
    ['exclude', 'veBoolExclude', L.edBoolExclude, 'M3 3h8v8H3z M13 13h8v8h-8z', 'Ctrl+Alt+X', !canBool, () => { setLastBoolOp('exclude'); applyBoolean('exclude'); }],
    ['divide', 'veBoolDivide', L.edBoolDivide, 'M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z', 'Ctrl+Alt+D', !canBool, () => { setLastBoolOp('divide'); applyBoolean('divide'); }],
    ['outline', 'veOutlineStroke', L.edOutlineStroke, 'M4 4h16v16H4z M8 8h8v8H8z', 'Ctrl+Alt+O', !canOutline, applyOutlineStroke],
    ['offset', 'veOffsetPath', L.edOffsetPath, 'M7 7h10v10H7z M3 3h18v18H3z', '', !canOffset, openOffsetStrip],
    ['separateIcon', 'veSeparateIcon', L.edSeparateIcon || (lang === 'en' ? 'Separate Icon Objects' : 'Pisahkan Objek Ikon'), 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', '', !canSeparateIcon, () => { if (applySeparateIconObjects) applySeparateIconObjects(); }],
    ['fillEmpty', 'veFillEmpty', L.edFillEmpty || (lang === 'en' ? 'Fill Empty Space' : 'Isi Ruang Kosong'), 'M4 4h16v16H4z M8 8h8v8H8z M9 12h6 M12 9v6', '', !canFillEmpty, () => { if (applyFillEmptySpace) applyFillEmptySpace(); }]
  ];
  const activeBool = BOOL_ITEMS.find(x => x[0] === lastBoolOp) || BOOL_ITEMS[0];
  /* Aksi Node & Path (seksi bawah dropdown nodeGrp): [kunci, tip tooltip, ikon, nonaktif, aksi].
     Label diambil dari katalog tooltip (TT[tip].t), pola yang sama seperti baris alat. */
  const hasPath = unlockedSelObjs.some(o => !o.img && !o.text && o.subs && o.subs.length > 0);
  const needsNodes = selNodes.size > 0 && unlockedSelObjs.length > 0;
  const canJoin = selNodes.size === 2 && unlockedSelObjs.length > 0;
  const NODE_ACTIONS = [['delNode', 'veDelNode', 'M9 10h6 M3 18h18', !needsNodes, () => delSel()], ['smooth', 'veTypeSmooth', 'M3 15c3-9 15-9 18 0', !needsNodes, () => applyType('smooth')], ['corner', 'veTypeCorner', 'M4 20L12 5l8 15', !needsNodes, () => applyType('corner')], ['symmetric', 'veTypeSym', 'M3 15c3-9 15-9 18 0 M12 6v14', !needsNodes, () => applyType('symmetric')], ['autoSmooth', 'veNodeAutoSmooth', 'M3 16c4-10 6-10 9-4s5 6 9-4 M18.5 4l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z', !hasPath, applyAutoSmooth], ['breakHandles', 'veNodeBreakHandles', 'M10 10h4v4h-4z M10 12L4 8 M14 14l4 6 M4 8a1.5 1.5 0 1 0 0.01 0 M18 20a1.5 1.5 0 1 0 0.01 0', !needsNodes, () => applyMirror('freeCurve')], ['join', 'veNodeJoin', 'M6 5a1.5 1.5 0 1 0 0.01 0 M18 5a1.5 1.5 0 1 0 0.01 0 M12 19a1.5 1.5 0 1 0 0.01 0 M6 5l6 14 M18 5l-6 14', !canJoin, applyJoinNodes], ['split', 'veNodeSplit', 'M3 12h6 M15 12h6 M12 5v14', !needsNodes, applySplitPath], ['close', 'veClose', 'M4 18L10 5L20 13L16 19Z', !hasPath, () => setClosed(true)], ['open', 'veOpen', 'M4 18L10 5L20 13L16 19', !hasPath, () => setClosed(false)], ['reverse', 'veNodeReverse', 'M20 7H10a4 4 0 0 0 0 8h8 M15 12l3 3-3 3', !hasPath, applyReversePath], ['straighten', 'veStraight', VE_GEO_GROUP[0][2], false, () => setTool('straighten')], ['simplify', 'veSimplify', VE_GEO_GROUP[1][2], false, () => {
    setTool('simplify');
    openVcSimplify();
  }], ['toCurves', 'veNodeToCurves', 'M3 8h18 M3 16c3-6 15-6 18 0', !hasPath, applyConvertToCurves], ['outline', 'veOutlineStroke', 'M4 4h16v16H4z M8 8h8v8H8z', !canOutline, applyOutlineStroke], ['offset', 'veOffsetPath', 'M7 7h10v10H7z M3 3h18v18H3z', !canOffset, openOffsetStrip]];
  return <div className="fig-floating-bar" style={{
  background: 'var(--card)',
  opacity: 1,
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none'
}} onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}><style>{`
  .fig-floating-bar .tool-btn, .flt .opt, .flt .tool-btn, .flt .ved-pill, .flt .snp-row { transition: background-color .16s ease, color .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
  .fig-floating-bar .tool-btn.chev-btn { min-width: 24px; width: 24px; }
  .fig-floating-bar .tool-btn:hover:not(:disabled), .flt .opt:hover, .flt .tool-btn:hover:not(:disabled), .flt .ved-pill:hover:not(:disabled), .flt .snp-row:hover:not(:disabled) { background-color: color-mix(in srgb, var(--acc) 12%, var(--card)); color: var(--ink); border-color: color-mix(in srgb, var(--acc) 32%, var(--line)); }
  .fig-floating-bar .tool-btn:focus-visible, .flt .opt:focus-visible, .flt button:focus-visible { outline: 2px solid color-mix(in srgb, var(--acc) 72%, transparent); outline-offset: 1px; }
  .flt .snp-row, .flt .snp-row:hover:not(:disabled), .flt .snp-row.on, .flt .snp-row:focus-visible { background: transparent !important; border: 0 !important; box-shadow: none !important; outline: none; }
  .flt .snp-row { color: var(--ink); }
  .flt .snp-row .snp-custom-icon { color: var(--mut); flex: none; transition: color .16s ease; }
  .flt .snp-row:hover:not(:disabled) .snp-custom-icon, .flt .snp-row.on .snp-custom-icon { color: var(--acc); }
  .flt .snp-row:hover:not(:disabled) .snp-lb { color: var(--ink); }
  .flt .snp-row .snp-sw { background: color-mix(in srgb, var(--acc) 22%, var(--line)) !important; }
  .flt .snp-row.on .snp-sw { background: var(--acc) !important; }
  .flt .snp-row .snp-sw::after { background: #fff !important; }
  .flt .opt { cursor: pointer; }
`}</style>{devMode ? (
    <>
      {[['select', 'veSelect', 'M4 3l14 9.5-6.5 1.8L8.2 20z'], ['hand', 'veHand', 'M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2 M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6 M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8 M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15']].map(([k, tip, d]) => (
        <button key={k} type="button" className={'tool-btn' + (tool === k ? ' on' : '')} data-tip={tip} aria-label={TT[tip] ? TT[tip].t : k} aria-pressed={tool === k} onClick={() => { setOpenGrp(null); setTool(k); }}>
          <Vi d={d} s={isMob ? 20 : 22} />{mobLbl(MOB_LABELS[k] || k)}
        </button>
      ))}
      {onToggleWireframe && <button type="button" className={'tool-btn' + (wireframeMode ? ' on' : '')} data-testid="toggle-wireframe" data-tip="veWireframe" aria-label={isEn ? 'Outline / Wireframe Mode (Shift+O)' : 'Mode Outline / Wireframe (Shift+O)'} aria-pressed={wireframeMode} onClick={onToggleWireframe}><Vi d="M4 5h16v14H4z M4 5l16 14 M20 5L4 19" s={isMob ? 19 : 22} />{mobLbl(isEn ? 'Outline' : 'Outline')}</button>}
      <button type="button" className={'tool-btn' + (gridOn || rulersOn ? ' on' : '')} data-tip="veGrid" aria-label="Grid & Rulers" aria-pressed={gridOn} onClick={() => setGridOn((g: boolean) => !g)}><Vi d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 10h16 M4 14h16 M10 4v16 M14 4v16" s={isMob ? 19 : 22} />{mobLbl('Grid')}</button>
    </>
  ) : (<>{VE_TOOLS.map(entry => {
    if (entry.type === 'single') {
      const [k, tip, d] = entry.item;
      const isShape = k === 'shape';
      return <button key={k} type="button" className={'tool-btn' + (tool === k ? ' on' : '')} data-tip={tip} aria-label={TT[tip] ? TT[tip].t : (isShape ? (lang === 'en' ? 'Shape' : 'Bentuk') : k)} aria-pressed={tool === k} onClick={() => {
        setOpenGrp(null);
        setTool(k);
      }}>{isShape ? <ShapeGlyph k={shapeKind} s={isMob ? 20 : 22} /> : <Vi d={d} s={isMob ? 20 : 24} />}{mobLbl(MOB_LABELS[k] || k)}</button>;
    }
    const {
      id,
      items
    } = entry;
    const lookupItems = id === 'nodeGrp' ? [...items, ...VE_GEO_GROUP] : items;
    const activeInGroup = lookupItems.find(x => x[0] === tool);
    const isGroupActive = !!activeInGroup;
    const currentItem = activeInGroup || lookupItems.find(x => x[0] === lastGrpTool[id]) || items[0];
    const [curK, curTip, curD] = currentItem;
    const isOpen = openGrp === id;
    const btnRef = grpBtnRefs[id];
    return <React.Fragment key={id}><div ref={btnRef} className="inline-flex items-center"><button type="button" className={'tool-btn has-sub' + (isGroupActive ? ' on' : '')} data-tip={curTip} aria-label={TT[curTip] ? TT[curTip].t : curK} aria-pressed={isGroupActive} onPointerDown={e => startLongPress(e, () => setOpenGrp(id))} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerMove={cancelLongPress} onClick={() => {
          if (lpFiredRef.current) {
            lpFiredRef.current = false;
            return;
          }
          if (activeInGroup) {
            if (curK === 'simplify' && !vcSimpRef.current) openVcSimplify();else setOpenGrp(isOpen ? null : id);
          } else {
            setTool(curK);
            setOpenGrp(null);
            if (curK === 'simplify') openVcSimplify();
          }
        }}><Vi d={curD} s={isMob ? 20 : 24} />{mobLbl(MOB_LABELS[id] || id)}</button><button type="button" className="tool-btn chev-btn" aria-label={L.ftPickToolGroup} data-tip="veToolGroup" aria-expanded={isOpen} onClick={e => {
          e.stopPropagation();
          setOpenGrp(isOpen ? null : id);
        }}><Chev open={isOpen} /></button></div><Float anchor={btnRef} open={isOpen} onClose={() => setOpenGrp(null)} w={id === 'nodeGrp' ? 260 : 256} preferUp={true}><div className="text-[11px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">{id === 'nodeGrp' ? L.ftNodeGroup : L.ftDrawGroup}</div>{items.map(([k, tip, d]) => {
          const info = TT[tip] || {
            t: k
          };
          const on = tool === k;
          return <div key={k} role="option" aria-selected={on} className={'opt' + (on ? ' on' : '')} data-tip={tip} onClick={() => {
            setTool(k);
            setOpenGrp(null);
            if (k === 'simplify') openVcSimplify();
          }}><span className="sel-l"><Vi d={d} s={17} /><span>{info.t}</span></span><span className="flex items-center gap-1.5">{info.k && <span className="text-[10px] font-mono mut px-1.5 py-0.5 rounded bg-[var(--sub)]">{info.k}</span>}<svg className="ck" style={{
                opacity: on ? 1 : 0
              }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span></div>;
        })}{id === 'nodeGrp' && <div className="pt-2 mt-2 border-t border-[var(--line)]"><div className="text-[11px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">{L.ftNodeActions || 'Aksi Node & Path'}</div><div data-testid="node-actions-scroll" style={{ maxHeight: 108, overflowY: 'auto' }}>{NODE_ACTIONS.map(([k, tip, d, dis, act]) => {
          const info = TT[tip] || {
            t: k
          };
          const isActTool = k === 'straighten' || k === 'simplify';
          const on = isActTool && tool === k;
          return <div key={k} role="option" aria-selected={isActTool ? on : undefined} aria-disabled={dis} className={'opt' + (on ? ' on' : '')} data-tip={tip} style={dis ? {
            opacity: 0.45
          } : undefined} onClick={() => {
            if (dis) return;
            setOpenGrp(null);
            act();
          }}><span className="sel-l"><Vi d={d} s={17} /><span>{info.t}</span></span>{isActTool && <span className="flex items-center gap-1.5">{info.k && <span className="text-[10px] font-mono mut px-1.5 py-0.5 rounded bg-[var(--sub)]">{info.k}</span>}<svg className="ck" style={{
                opacity: on ? 1 : 0
              }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>}</div>;
        })}</div><div className="pt-2 mt-2 border-t border-[var(--line)]"><button type="button" role="switch" data-tip="veAutoSimplifyToggle" aria-checked={autoSimplifyOn} className={'snp-row' + (autoSimplifyOn ? ' on' : '')} style={{ ['--c' as any]: 'var(--acc)' }} onClick={e => {
            e.stopPropagation();
            if (toggleAutoSimplify) toggleAutoSimplify();
            else if (setAutoSimplifyOn) setAutoSimplifyOn(v => !v);
          }}><span className="snp-custom-icon"><Ico n="sparkle" size={15} /></span><span className="snp-lb">{lang === 'en' ? 'Auto-Simplify' : 'Auto-Simplify'}</span><span className="snp-sw" aria-hidden="true" /></button></div></div>}{id === 'nodeGrp' && <div className="pt-2 mt-2 border-t border-[var(--line)] select-none" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}><div className="flex items-center justify-between px-2.5 mb-1.5"><span className="text-[10px] mut font-semibold uppercase tracking-wider flex items-center gap-1.5"><NodeSizeGlyph s={15} /><span>{L.ftNodeSize || 'Ukuran Node & Handle'}</span></span><span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--sub)]">{Math.round((nodeScale || 1) * 100)}%</span></div><div className="px-2.5 py-1"><Slider min={0.5} max={3.0} step={0.05} value={nodeScale || 1} on={v => setNodeScale && setNodeScale(v)} /></div><div className="flex items-center justify-between px-2.5 mt-2 pt-2 border-t border-[var(--line)]"><div className="flex gap-1">{[0.5, 1.0, 1.5, 2.0].map(s => <button key={s} type="button" className={'ved-pill text-[10px] px-1.5 py-0.5' + (Math.abs((nodeScale || 1) - s) < 0.04 ? ' on' : '')} onClick={() => setNodeScale && setNodeScale(s)}>{Math.round(s * 100)}%</button>)}</div><button type="button" className="text-[11px] mut hover:text-[var(--ink)] px-1 py-0.5 cursor-pointer" onClick={() => setNodeScale && setNodeScale(1.0)}>{L.ftResetNodeSize ? 'Reset' : 'Reset'}</button></div></div>}</Float></React.Fragment>;
  })}<span className="fig-bar-sep" /><div ref={boolBtn} className="inline-flex items-center"><button type="button" className={'tool-btn has-sub' + (boolOpen ? ' on' : '')} disabled={!isMob && activeBool[5]} data-tip={activeBool[1]} aria-label={activeBool[2] || 'Boolean'} aria-haspopup="listbox" aria-expanded={boolOpen} onClick={() => {
      if (isMob) {
        setBoolOpen(o => !o);
        return;
      }
      if (activeBool[5]) return;
      setBoolOpen(false);
      activeBool[6]();
    }}><Vi d={activeBool[3]} s={isMob ? 19 : 22} />{mobLbl('Bool')}</button><button type="button" className="tool-btn chev-btn" data-tip="vePickBool" aria-label={L.ftPickBool} aria-expanded={boolOpen} onClick={e => {
      e.stopPropagation();
      setBoolOpen(o => !o);
    }}><Chev open={boolOpen} /></button></div><Float anchor={boolBtn} open={boolOpen} onClose={() => setBoolOpen(false)} w={268} preferUp={true}><div className="text-[11px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">Boolean / Pathfinder</div>{BOOL_ITEMS.map(([k, tip, label, d, kbd, dis, act]) => <div key={k} role="option" aria-disabled={dis} className={'opt' + (k === lastBoolOp ? ' font-semibold' : '')} data-tip={tip} style={dis ? {
        opacity: 0.45
      } : undefined} onClick={() => {
        if (dis) return;
        setBoolOpen(false);
        act();
      }}><span className="sel-l"><Vi d={d} s={17} /><span>{label}</span></span>{kbd && <span className="text-[10px] font-mono mut px-1.5 py-0.5 rounded bg-[var(--sub)]">{kbd}</span>}</div>)}</Float><span className="fig-bar-sep" /><button type="button" className={'tool-btn' + (tool === 'frame' ? ' on' : '')} data-tool="frame" data-tip="veFrameTool" aria-label="Frame" aria-pressed={tool === 'frame'} onClick={() => {
    setOpenGrp(null);
    setTool('frame');
  }}><FrameToolGlyph />{mobLbl('Frame')}</button>{onToggleWireframe && <button type="button" className={'tool-btn' + (wireframeMode ? ' on' : '')} data-testid="toggle-wireframe" data-tip="veWireframe" aria-label={isEn ? 'Outline / Wireframe Mode (Shift+O)' : 'Mode Outline / Wireframe (Shift+O)'} aria-pressed={wireframeMode} onClick={onToggleWireframe}><Vi d="M4 5h16v14H4z M4 5l16 14 M20 5L4 19" s={isMob ? 19 : 22} />{mobLbl(isEn ? 'Outline' : 'Outline')}</button>}<span className="fig-bar-sep" /><div ref={snapMenuBtn} className="inline-flex items-center">{/* T9: ikon magnet digambar baru (U-magnet + ujung kutub), mengikuti gaya set ikon internal: viewBox 24, stroke, round cap/join; dirender IconBtn -> Vi. */}<button type="button" className={'tool-btn has-sub' + (snapOn ? ' on' : '')} data-tip="veSnap" aria-label={TT.veSnap ? TT.veSnap.t : 'Snap'} aria-expanded={isMob ? snapMenuOpen : undefined} onClick={() => {
      if (isMob) setSnapMenuOpen(o => !o);
      else setSnapOn(s => !s);
    }}><Vi d="M6 6v6a6 6 0 0 0 12 0V6 M4 9.5h4 M16 9.5h4" s={isMob ? 19 : 22} />{mobLbl('Snap')}</button><button type="button" className="tool-btn chev-btn" data-tip="veSnapMenu" aria-label={L.ftSnapOpts} aria-expanded={snapMenuOpen} onClick={() => setSnapMenuOpen(o => !o)}><Chev open={snapMenuOpen} /></button></div><Float anchor={snapMenuBtn} open={snapMenuOpen} onClose={() => setSnapMenuOpen(false)} w={272} cls="cp" preferUp={true}>{isMob && <div className="pb-2 mb-2 border-b border-[var(--line)]"><button type="button" role="switch" aria-checked={snapOn} className={'snp-row' + (snapOn ? ' on' : '')} style={{ ['--c' as any]: 'var(--acc)' }} onClick={() => setSnapOn(s => !s)}><SnapIcon k="bbox" /><span className="snp-lb font-semibold">{lang === 'en' ? 'Master Snap' : 'Snap Aktif'}</span><span className="snp-sw" aria-hidden="true" /></button></div>}<div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold">{L.ftSnapChecklist}</span><div className="flex gap-1"><button type="button" className="ved-pill" data-tip="veSnapPresetAll" onClick={() => setSnapCfg({
          bbox: true,
          spacing: true,
          artboard: true,
          node: true,
          axial: true,
          midpoint: true,
          edge: true,
          perp: true,
          grid: true,
          pixel: true
        })}>{L.ftAll}</button><button type="button" className="ved-pill" data-tip="veSnapPresetMin" onClick={() => setSnapCfg({
          bbox: false,
          spacing: false,
          artboard: false,
          node: true,
          axial: false,
          midpoint: false,
          edge: false,
          perp: false,
          grid: false,
          pixel: false
        })}>{L.ftMinimal}</button><button type="button" className="ved-pill" data-tip="veSnapPresetDef" onClick={() => setSnapCfg({
          ...DEFAULT_SNAP_CFG
        })}>{L.ftDefault}</button></div></div><div className="space-y-0.5" style={{
      maxHeight: 300,
      overflowY: 'auto',
      margin: '0 -4px',
      padding: '0 4px'
    }}>{(lang === 'en' ? SNAP_OPTS_EN : SNAP_OPTS).map(([k, label, col]) => {
        const toolCap = SNAP_TOOL_CAPABILITIES[tool] || SNAP_TOOL_CAPABILITIES.select;
        const activeInTool = !!toolCap[k];
        /* C13: baris Grid menampilkan status EFEKTIF — snap grid butuh
           tombol Grid aktif (gridOn), bukan hanya toggle checklist. */
        const checked = k === 'grid' ? !!(snapCfg[k] && gridOn) : !!snapCfg[k];
        return <button key={k} type="button" role="switch" data-tip={'veSnap_' + k} aria-checked={checked} className={'snp-row' + (checked ? ' on' : '')} style={{
          ['--c' as any]: col,
          opacity: activeInTool ? 1 : 0.65
        }} onClick={() => setSnapCfg(c => ({
          ...c,
          [k]: !c[k]
        }))}><SnapIcon k={k} /><span className="snp-lb">{label}{!activeInTool ? L.ftOtherTool : ''}</span><span className="snp-sw" aria-hidden="true" /></button>;
      })}</div></Float><div ref={gridMenuBtn} className="inline-flex items-center"><button type="button" className={'tool-btn has-sub' + (gridOn || rulersOn ? ' on' : '')} data-tip="veGrid" aria-label={isMob ? 'Grid' : 'Grid & Rulers'} aria-pressed={gridOn} onClick={() => setGridOn((g: boolean) => !g)}><Vi d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 10h16 M4 14h16 M10 4v16 M14 4v16" s={isMob ? 19 : 22} />{mobLbl('Grid')}</button><button type="button" className="tool-btn chev-btn" data-testid="grid-rulers-chevron" aria-label={isEn ? 'Grid & Rulers Options' : 'Opsi Grid & Rulers'} aria-expanded={gridMenuOpen} onClick={e => {
        e.stopPropagation();
        setGridMenuOpen(o => !o);
      }}><Chev open={gridMenuOpen} /></button></div><Float anchor={gridMenuBtn} open={gridMenuOpen} onClose={() => setGridMenuOpen(false)} w={248} cls="cp" preferUp={true}><div className="text-[11px] mut px-1 pb-1.5 font-semibold uppercase tracking-wider">{isEn ? 'Grid & Rulers' : 'Grid & Rulers'}</div><div className="space-y-1"><button type="button" role="switch" data-testid="toggle-grid" aria-checked={gridOn} className={'snp-row' + (gridOn ? ' on' : '')} style={{ ['--c' as any]: 'var(--acc)' }} onClick={() => setGridOn((g: boolean) => !g)}><SnapIcon k="grid" /><span className="snp-lb">{isEn ? 'Show Grid' : 'Tampilkan Grid'}</span><span className="snp-sw" aria-hidden="true" /></button><button type="button" role="switch" data-testid="toggle-rulers" aria-checked={rulersOn} className={'snp-row' + (rulersOn ? ' on' : '')} style={{ ['--c' as any]: 'var(--acc)' }} onClick={() => setRulersOn && setRulersOn((r: boolean) => !r)}><SnapIcon k="spacing" /><span className="snp-lb">{isEn ? 'Show Rulers' : 'Tampilkan Rulers'}</span><span className="snp-sw" aria-hidden="true" /></button><button type="button" role="switch" data-testid="toggle-guides" aria-checked={guidesVisible} className={'snp-row' + (guidesVisible ? ' on' : '')} style={{ ['--c' as any]: '#0ea5e9' }} onClick={() => setGuidesVisible && setGuidesVisible((v: boolean) => !v)}><SnapIcon k="axial" /><span className="snp-lb">{isEn ? 'Show Guides' : 'Tampilkan Guides'}</span><span className="snp-sw" aria-hidden="true" /></button><button type="button" role="switch" data-testid="toggle-guides-lock" aria-checked={guidesLocked} className={'snp-row' + (guidesLocked ? ' on' : '')} style={{ ['--c' as any]: '#f59e0b' }} onClick={() => setGuidesLocked && setGuidesLocked((v: boolean) => !v)}><SnapIcon k="perp" /><span className="snp-lb">{isEn ? 'Lock Guides' : 'Kunci Guides'}</span><span className="snp-sw" aria-hidden="true" /></button></div><div className="pt-2 mt-2 border-t border-[var(--line)]"><div className="text-[10px] mut font-semibold uppercase tracking-wider mb-1.5">{isEn ? 'Ruler Unit' : 'Satuan Ruler'}</div><div className="flex gap-1">{RULER_UNITS.map(u => <button key={u.id} type="button" data-testid={`ruler-unit-${u.id}`} className={'ved-pill flex-1 text-[10px] py-0.5' + (rulerUnit === u.id ? ' on' : '')} onClick={() => setRulerUnit && setRulerUnit(u.id as RulerUnit)}>{u.label}</button>)}</div></div><div className="flex gap-1.5 pt-2 mt-2 border-t border-[var(--line)]"><button type="button" className="ved-pill flex-1 text-[10px]" onClick={() => { onResetRulerOrigin && onResetRulerOrigin(); }}>{isEn ? 'Reset Origin' : 'Reset Origin'}</button><button type="button" className="ved-pill flex-1 text-[10px]" onClick={() => { onClearGuides && onClearGuides(); }}>{isEn ? 'Clear Guides' : 'Hapus Guides'}</button></div></Float><span className="fig-bar-sep" /><div ref={mirrorBtn} className="inline-flex items-center"><button type="button" className={'tool-btn has-sub' + (mirrorCur ? ' on' : '')} disabled={!selNodes.size} data-tip="veMirror" aria-label="Mirroring Handle" aria-haspopup="listbox" aria-expanded={mirrorOpen} onClick={() => setMirrorOpen(o => !o)}><Vi d={(MIRROR_OPTS.find(q => q[0] === (mirrorCur || 'symmetric')) || MIRROR_OPTS[3])[3]} s={isMob ? 19 : 22} />{mobLbl('Mirror')}</button><button type="button" className="tool-btn chev-btn" disabled={!selNodes.size} data-tip="veMirror" aria-label={L.ftPickMirror} aria-expanded={mirrorOpen} onClick={e => {
      e.stopPropagation();
      setMirrorOpen(o => !o);
    }}><Chev open={mirrorOpen} /></button></div><IconBtn lang={lang} label={isMob ? (isEn ? 'Curve' : 'Kurva') : undefined} s={isMob ? 19 : 22} on={curveDragOn} tip="veCurveDrag" act={() => {
    const next = !curveDragOn;
    setCurveDragOn(next);
    if (next && selNodes.size) commitObjs(o => sel.objs.has(o.id) ? VE.mirrorNodes(o, selNodes, 'freeCurve', selHandles) : o);
    say(next ? (isEn ? 'Drag Curved Handle: ON' : 'Geser Handle Melengkung: AKTIF') : (isEn ? 'Drag Curved Handle: OFF' : 'Geser Handle Melengkung: MATI'));
  }} d="M4 17C7 7 17 7 20 17 M10 9.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M5 9.5h5 M14 9.5h5" /><Float anchor={mirrorBtn} open={mirrorOpen && selNodes.size > 0} onClose={() => setMirrorOpen(false)} w={268} preferUp={true}><div className="text-[11px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">Mirroring Handle</div>{MIRROR_OPTS.map(([k, tip, label, d]) => <div key={k} role="option" aria-selected={mirrorCur === k} className={'opt' + (mirrorCur === k ? ' on' : '')} data-tip={tip} onClick={() => applyMirror(k)}><span className="sel-l"><Vi d={d} s={17} /><span>{label}</span></span><svg className="ck" style={{
        opacity: mirrorCur === k ? 1 : 0
      }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></div>)}{!mirrorCur && <div className="text-[11px] mut px-2.5 py-1">{L.ftMixed}</div>}</Float></>)}
  {onToggleDevMode && (
    <>
      <span className="fig-bar-sep" />
      <button
        type="button"
        className={'tool-btn dev-mode-switch' + (devMode ? ' on' : '')}
        data-tip="veDevMode"
        data-testid="toggle-dev-mode"
        aria-label={isEn ? 'Dev Mode (Shift+D)' : 'Dev Mode (Shift+D)'}
        aria-pressed={devMode}
        onClick={onToggleDevMode}
      >
        <Vi d={ICONS.code} s={isMob ? 19 : 22} />
        {mobLbl('Dev')}
      </button>
    </>
  )}
</div>;
};

export { EditorFloatingToolbar };
export default EditorFloatingToolbar;
