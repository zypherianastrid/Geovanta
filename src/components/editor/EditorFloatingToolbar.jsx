/**
 * @file src/components/editor/EditorFloatingToolbar.jsx
 * @description Komponen bilah alat melayang utama di bagian bawah kanvas (EditorFloatingToolbar)
 */
import React from 'react';
import { VE_TOOLS, SHAPES, DEFAULT_SNAP_CFG, SNAP_OPTS, SNAP_TOOL_CAPABILITIES } from '../../constants/editorToolsAndShapes.jsx';
import { TIPS } from '../../constants/tooltipsCatalog.jsx';
import { Vi, Chev, ShapeGlyph, IconBtn } from '../ui/IconGlyphs.jsx';
import { Float } from '../ui/FloatPopover.jsx';
import { VE } from '../../engine/vectorEngine.jsx';

const EditorFloatingToolbar = ({
  tool,
  setOpenGrp,
  setTool,
  lastGrpTool,
  openGrp,
  grpBtnRefs,
  vcSimpRef,
  openVcSimplify,
  setShapeOpen,
  say,
  shapeBtn,
  shapeOpen,
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
  onSettings
}) => <div className="fig-floating-bar" style={{
  background: 'var(--card)',
  opacity: 1,
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none'
}} onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>{VE_TOOLS.map(entry => {
    if (entry.type === 'single') {
      const [k, tip, d] = entry.item;
      return <button key={k} type="button" className={'tool-btn' + (tool === k ? ' on' : '')} data-tip={tip} aria-label={TIPS[tip] ? TIPS[tip].t : k} onClick={() => {
        setOpenGrp(null);
        setTool(k);
      }}><Vi d={d} s={24} /></button>;
    }
    const {
      id,
      items
    } = entry;
    const activeInGroup = items.find(x => x[0] === tool);
    const currentItem = activeInGroup || items.find(x => x[0] === lastGrpTool[id]) || items[0];
    const [curK, curTip, curD] = currentItem;
    const isOpen = openGrp === id;
    const btnRef = grpBtnRefs[id];
    return <React.Fragment key={id}><div ref={btnRef} className="inline-flex items-center"><button type="button" className={'tool-btn' + (activeInGroup ? ' on' : '')} data-tip={curTip} aria-label={TIPS[curTip] ? TIPS[curTip].t : curK} onClick={() => {
          if (activeInGroup) {
            if (curK === 'simplify' && !vcSimpRef.current) openVcSimplify();else setOpenGrp(isOpen ? null : id);
          } else {
            setTool(curK);
            setOpenGrp(null);
            if (curK === 'simplify') openVcSimplify();
          }
        }}><Vi d={curD} s={24} /></button><button type="button" className="tool-btn chev-btn" aria-label="Pilih alat dalam grup" data-tip="veToolGroup" aria-expanded={isOpen} onClick={e => {
          e.stopPropagation();
          setOpenGrp(isOpen ? null : id);
        }}><Chev open={isOpen} /></button></div><Float anchor={btnRef} open={isOpen} onClose={() => setOpenGrp(null)} w={236} preferUp={true}><div className="text-[10.5px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">{id === 'nodeGrp' ? 'Alat Node & Bézier' : 'Geometri & Optimasi'}</div>{items.map(([k, tip, d]) => {
          const info = TIPS[tip] || {
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
        })}</Float></React.Fragment>;
  })}<button type="button" className={'tool-btn' + (tool === 'frame' ? ' on' : '')} data-tip="veFrameTool" aria-label="Frame" onClick={() => {
    setShapeOpen(false);
    setTool('frame');
  }}><Vi d="M7.5 3.5v17 M16.5 3.5v17 M3.5 7.5h17 M3.5 16.5h17" s={22} /></button><button type="button" className={'tool-btn' + (tool === 'text' ? ' on' : '')} title="Alat Teks (T) \u2014 Klik di kanvas untuk membuat objek teks SVG" aria-label="Text" onClick={() => {
    setShapeOpen(false);
    setTool('text');
    say('Alat Teks (T): klik di kanvas untuk menambahkan teks');
  }}><Vi d="M4 7V4h16v3 M9 20h6 M12 4v16" s={22} /></button><div className="inline-flex items-center"><button ref={shapeBtn} type="button" className={'tool-btn' + (tool === 'shape' ? ' on' : '')} data-tip="veShape" aria-label="Shape" aria-expanded={shapeOpen} onClick={() => {
      if (tool !== 'shape') {
        setTool('shape');
        setShapeOpen(true);
      } else setShapeOpen(o => !o);
    }}><ShapeGlyph k={shapeKind} s={22} /></button><button type="button" className="tool-btn chev-btn" aria-label="Pilih bentuk" onClick={() => setShapeOpen(o => !o)}><Chev open={shapeOpen} /></button></div><Float anchor={shapeBtn} open={shapeOpen} onClose={() => setShapeOpen(false)} w={244} cls="cp" preferUp={true}><div className="text-[11px] mut mb-2 font-medium">Pilih bentuk</div><div className="grid grid-cols-5 gap-1.5">{SHAPES.map(([k, lb]) => <button key={k} type="button" data-tip={'veShp_' + k} aria-label={lb} className={'tool-btn' + (tool === 'shape' && shapeKind === k ? ' on' : '')} onClick={() => {
        setShapeKind(k);
        setTool('shape');
        setShapeOpen(false);
        say(lb + ': seret di kanvas untuk menggambar');
      }}><ShapeGlyph k={k} s={22} /></button>)}</div></Float><span className="fig-bar-sep" /><div ref={snapMenuBtn} className="inline-flex items-center"><IconBtn s={22} on={snapOn} tip="veSnap" act={() => setSnapOn(s => !s)} d="M6 4v6a6 6 0 0 0 12 0V4 M6 7.5h3.5 M14.5 7.5H18" /><button type="button" className="tool-btn chev-btn" data-tip="veSnapMenu" aria-label="Opsi Checklist Snap" aria-expanded={snapMenuOpen} onClick={() => setSnapMenuOpen(o => !o)}><Chev open={snapMenuOpen} /></button></div><Float anchor={snapMenuBtn} open={snapMenuOpen} onClose={() => setSnapMenuOpen(false)} w={272} cls="cp" preferUp={true}><div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold">Checklist Fitur Snap</span><div className="flex gap-1"><button type="button" className="ved-pill" data-tip="veSnapPresetDef" onClick={() => setSnapCfg({
          ...DEFAULT_SNAP_CFG
        })}>Bawaan</button><button type="button" className="ved-pill" data-tip="veSnapPresetAll" onClick={() => setSnapCfg({
          bbox: true,
          spacing: true,
          artboard: true,
          node: true,
          axial: true,
          midpoint: true,
          edge: true,
          perp: true,
          grid: true
        })}>Semua</button><button type="button" className="ved-pill" data-tip="veSnapPresetMin" onClick={() => setSnapCfg({
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
        })}>Minimal</button></div></div><div className="space-y-0.5" style={{
      maxHeight: 300,
      overflowY: 'auto',
      margin: '0 -4px',
      padding: '0 4px'
    }}>{SNAP_OPTS.map(([k, label, col]) => {
        const toolCap = SNAP_TOOL_CAPABILITIES[tool] || SNAP_TOOL_CAPABILITIES.select;
        const activeInTool = !!toolCap[k];
        return <button key={k} type="button" role="switch" data-tip={'veSnap_' + k} aria-checked={!!snapCfg[k]} className={'snp-row' + (snapCfg[k] ? ' on' : '')} style={{
          '--c': col,
          opacity: activeInTool ? 1 : 0.65
        }} onClick={() => setSnapCfg(c => ({
          [k]: !c[k]
        }))}><span className="snp-dot" /><span className="snp-lb">{label}{!activeInTool ? ' · (Alat lain)' : ''}</span><span className="snp-sw" aria-hidden="true" /></button>;
      })}</div></Float><IconBtn s={22} on={gridOn} tip="veGrid" act={() => setGridOn(g => !g)} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 10h16 M4 14h16 M10 4v16 M14 4v16" /><span className="fig-bar-sep" /><div ref={mirrorBtn} className="inline-flex items-center"><button type="button" className={'tool-btn' + (mirrorCur ? ' on' : '')} disabled={!selNodes.size} data-tip="veMirror" aria-label="Mirroring Handle" aria-haspopup="listbox" aria-expanded={mirrorOpen} onClick={() => setMirrorOpen(o => !o)}><Vi d={(MIRROR_OPTS.find(q => q[0] === (mirrorCur || 'symmetric')) || MIRROR_OPTS[3])[3]} s={22} /></button><button type="button" className="tool-btn chev-btn" disabled={!selNodes.size} data-tip="veMirror" aria-label="Pilih mode mirroring" aria-expanded={mirrorOpen} onClick={e => {
      e.stopPropagation();
      setMirrorOpen(o => !o);
    }}><Chev open={mirrorOpen} /></button></div><IconBtn s={22} on={curveDragOn} tip="veCurveDrag" act={() => {
    const next = !curveDragOn;
    setCurveDragOn(next);
    if (next && selNodes.size) commitObjs(o => sel.objs.has(o.id) ? VE.mirrorNodes(o, selNodes, 'freeCurve', selHandles) : o);
    say(next ? 'Geser Handle Melengkung: AKTIF' : 'Geser Handle Melengkung: MATI');
  }} d="M4 17C7 7 17 7 20 17 M10 9.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M5 9.5h5 M14 9.5h5" /><Float anchor={mirrorBtn} open={mirrorOpen && selNodes.size > 0} onClose={() => setMirrorOpen(false)} w={268} preferUp={true}><div className="text-[10.5px] mut px-2.5 py-1 font-semibold uppercase tracking-wider">Mirroring Handle</div>{MIRROR_OPTS.map(([k, tip, label, d]) => <div key={k} role="option" aria-selected={mirrorCur === k} className={'opt' + (mirrorCur === k ? ' on' : '')} data-tip={tip} onClick={() => applyMirror(k)}><span className="sel-l"><Vi d={d} s={17} /><span>{label}</span></span><svg className="ck" style={{
        opacity: mirrorCur === k ? 1 : 0
      }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></div>)}{!mirrorCur && <div className="text-[10.5px] mut px-2.5 py-1">Mixed: node terpilih memakai mode berbeda.</div>}</Float><span className="fig-bar-sep" /><IconBtn s={22} tip="settings" act={onSettings} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></div>;

export { EditorFloatingToolbar };
export default EditorFloatingToolbar;
