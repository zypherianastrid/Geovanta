/**
 * @file src/components/editor/EditorRightInspector.tsx
 * @description Komponen sidebar inspektor properti kanan: Transform, Alignment, Fill, Gradien, Stroke, & Ekspor (EditorRightInspector)
 */
import React, { useRef } from 'react';
import { Vi, Ico } from '../ui/IconGlyphs.tsx';
import { OverlayScrollbar } from '../ui/OverlayScrollbar.tsx';
import { zFmt, vzToSl, vslToZ } from '../../utils/zoomAndFormatHelpers.tsx';
import { Slider } from '../ui/Slider.tsx';
import { ALN_BTNS } from '../../constants/editorToolsAndShapes.tsx';
import { TIPS, TIPS_EN } from '../../constants/tooltipsCatalog.tsx';
import { XfField } from '../ui/TransformField.tsx';
import { PinGrid } from '../ui/PinGridSelector.tsx';
import { Seg } from '../ui/SegmentedControl.tsx';
import { VE } from '../../engine/vectorEngine.tsx';
import { clampN } from '../../utils/colorMath.tsx';
import { Range } from '../ui/RangeField.tsx';
import { pickScreenColor } from '../../utils/screenPipette.tsx';
import { GradientEditorPanel } from './GradientEditorPanel.tsx';
import { ColorField } from '../ui/ColorPickerField.tsx';
import { ColorText } from '../ui/ColorHexInput.tsx';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';
import { createStyle, renameStyle, deleteStyle, linkStyle, unlinkStyle, applyStyleEdit, paintSlot, directPaintEdit } from '../../engine/colorStyles.tsx';
import { FindReplaceSection } from './FindReplaceSection.tsx';
import { RecolorSection } from './RecolorSection.tsx';
import { addEffect, removeEffect, updateEffect, toggleEffect } from '../../engine/effectsEngine.tsx';
import { Float } from '../ui/FloatPopover.tsx';
import { Select } from '../ui/SelectDropdown.tsx';
import { BLEND_MODE_OPTIONS } from '../../engine/blendModes.tsx';
import { cssToHex, parseColorWithAlpha } from '../../utils/colorParserAndFormatter.tsx';
import { pickFiles } from '../../utils/presenceAndFilePicker.tsx';
import { copySolidPaint, readPaintClipboard, applyGradientPayloadToObj, useCopyFeedback } from '../../utils/colorClipboard.tsx';

/* Keputusan user 3A + peringatan review Task 2: edit langsung fill/stroke
   objek tertaut melepas tautan slot itu dalam commit yang sama. Delegasi
   tipis ke directPaintEdit (colorStyles.tsx) — SATU-SATUNYA rumah aturan
   ini; unlinkOnDirectPaintEdit (model, dipakai Task 5/6) mendelegasikan
   ke fungsi yang sama. 'none' ditangani eksplisit di sana (unlink +
   nilai 'none') dan JANGAN PERNAH diteruskan sebagai hex ke fungsi model
   (cssToHex('none') = '#000000'). Warna dengan alpha < 1 juga melepas
   tautan karena model style tidak menyimpan alpha. */
function directEditUnlink(o, next, slot, styles) {
  return directPaintEdit(o, next, slot, styles);
}

const EditorRightInspector = ({
  L,
  lang = 'id',
  onRecentColor,
  recentColors,
  canUndo,
  undo,
  canRedo,
  redo,
  zoomBy,
  zoomPctRef,
  displayZoomRef,
  zoom,
  zoomSliderDomRef,
  setZ,
  fitView,
  selObjs,
  selNodes,
  alignDo,
  xm,
  xp,
  setXfPos,
  xfNodes,
  setXfDim,
  lockAR,
  setLockAR,
  setXfRot,
  flipXf,
  pin,
  setPin,
  rotPivot,
  setRotPivot,
  scaleStk,
  setScaleStk,
  commitObjs,
  livePaint,
  commitPaint,
  docRef,
  primary,
  commit,
  setSel,
  say,
  toggleSelHidden,
  allSelHidden,
  setProp,
  indivCornerOpen,
  activeCorners,
  detectedCorners,
  curR,
  setRadius,
  setIndivCornerOpen,
  cornerMode,
  setCornerMode,
  applyRadiusToCorners,
  setPickedCornerKeys,
  pickedCornerKeys,
  paintObjs,
  isBgObj,
  paintTargetIds,
  cp,
  activeStopId,
  setActiveStopId,
  activeGradSlot,
  setActiveGradSlot,
  activeStrokeStopId,
  setActiveStrokeStopId,
  selectionColors,
  replaceSelectionColor,
  onFrPreviewDoc = (_d?: any) => {},
  onFrCommitPreview = (_key?: any) => {},
  onRcPreviewDoc = (_d?: any) => {},
  onRcCommitPreview = (_key?: any) => {},
  onSelectSame = (kind?: string) => {},
  convertFrameToAutoLayout,
  lay,
  layUpd,
  setLay,
  layPad,
  layItems,
  runLayout,
  doc,
  committedDoc = null,
  padToArtboard,
  bg,
  setBg,
  importFiles,
  expFmt,
  setExpFmt,
  isRasterFmt,
  expScale,
  setExpScale,
  exportArea,
  setExportArea,
  exportSvg,
  downloadSvg,
  onExportBackup,
  textControls,
  tool,
  blobParams,
  onBlobParams,
  weaveParams,
  onWeaveParams,
  arcParams,
  onArcParams,
  antialias,
  setAntialias,
  onOpenCodeInspector
}: any) => {
  /* T13 (D-I4): SATU primer per tampilan di inspector. "Terapkan" hanya
     primer bila ada perubahan auto-layout yang belum diterapkan; bila tidak
     ada perubahan tertunda, "Unduh .SVG" yang primer. Pelacak perubahan
     minimal di sini (state lokal): tidak ada state "pending" di props
     inspector (alMem hanya ada di VectorEditor sebagai ref, dan mem-nya
     tidak menyimpan konfigurasi yang diterapkan) — jadi perubahan dilacak
     lewat layUpd/layPad yang dipanggil dari kontrol seksi ini, dibersihkan
     saat "Terapkan" diklik dan saat seleksi berganti (sejalan dengan reset
     alMem di VectorEditor). PELINDUNG HOOKS: hooks ini mendahului return
     dan tidak bersyarat — urutan hooks stabil; IIFE fx di bawah tetap
     memanggil hooks-nya sebagai pernyataan pertama. JANGAN menambah
     early-return sebelum hooks ini. */
  const [layDirty, setLayDirty] = React.useState(false);
  /* Task 7: state buka/tutup seksi Find & Replace — LOKAL di inspector.
     Modal dihapus; kedua tombol pembuka (Color Styles + Selection Colors)
     me-toggle state ini. Prop onOpenFindReplace dari VectorEditor DIHAPUS
     (tidak ada pemanggil lain — hanya kedua tombol ini — mempertahankannya
     = dead code); pratinjau/commit diteruskan sebagai prop baru
     onFrPreviewDoc/onFrCommitPreview (frPreviewDoc/frCommitPreview di
     VectorEditor). */
  const [frOpen, setFrOpen] = React.useState(false);
  /* Task 8: state buka/tutup seksi Recolor — LOKAL di inspector (pola
     Task 7). Modal dihapus; kedua tombol pembuka (Color Styles +
     Selection Colors) me-toggle state ini. Prop onOpenRecolor dari
     VectorEditor DIHAPUS (ruling T7, mengikat: tidak ada pemanggil lain
     — hanya kedua tombol ini — mempertahankannya = dead code);
     pratinjau/commit diteruskan sebagai prop baru
     onRcPreviewDoc/onRcCommitPreview (rcPreviewDoc/rcCommitPreview di
     VectorEditor). */
  const [rcOpen, setRcOpen] = React.useState(false);
  const [dashCustomOpen, setDashCustomOpen] = React.useState(false);
  const [traceOpts, setTraceOpts] = React.useState<any>({
    mode: 'bw',
    threshold: 128,
    colorCount: 6,
    despeckle: 4,
    smoothness: 1.0,
    cornerThreshold: 60,
    ignoreWhite: true,
    keepOriginalImage: false
  });
  const [tracingBusy, setTracingBusy] = React.useState(false);
  const selImages = selObjs.filter(o => o && !o.locked && !o.hidden && o.img);
  const runAutoTrace = async () => {
    if (!selImages.length || tracingBusy) return;
    setTracingBusy(true);
    try {
      const curDoc = docRef.current;
      let nextObjects = [...curDoc.objects];
      const newIds: string[] = [];
      let totalNodes = 0;
      let totalPaths = 0;

      for (const imgObj of selImages) {
        const res = await VE.traceImageObjectToVectorPaths(imgObj, traceOpts);
        if (res.objects.length > 0) {
          totalNodes += res.nodeCount;
          totalPaths += res.pathCount;
          newIds.push(...res.objects.map((o: any) => o.id));
          const idx = nextObjects.findIndex(o => o.id === imgObj.id);
          if (idx >= 0) {
            if (traceOpts.keepOriginalImage) {
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
        say(L.atEmptyResult || (lang === 'en' ? 'Auto Trace produced no vector paths — adjust threshold or colors' : 'Auto Trace tidak menghasilkan path vektor — sesuaikan threshold atau jumlah warna'));
        return;
      }

      commit({ ...curDoc, objects: nextObjects }, 'autotrace');
      setSel({ objs: new Set(newIds), nodes: new Set() });
      const msg = (L.atSuccess || (lang === 'en' ? 'Auto Trace complete: {p} vector path(s), {n} nodes' : 'Auto Trace selesai: {p} path vektor, {n} node'))
        .replace('{p}', String(totalPaths))
        .replace('{n}', String(totalNodes));
      say(msg);
    } catch (err: any) {
      say((L.atFailed || (lang === 'en' ? 'Auto Trace failed: ' : 'Gagal Auto Trace: ')) + (err?.message || 'error'));
    } finally {
      setTracingBusy(false);
    }
  };
  const selIdsKey = selObjs.map(o => o.id).sort().join(',');
  React.useEffect(() => { setDashCustomOpen(false); }, [selIdsKey]);
  const strokeObjs = selObjs.filter(o => !o.img && o.type !== 'text');
  const strokeTargetIds = new Set(strokeObjs.map(o => o.id));
  const strokeCp = strokeObjs.find(o => o.id === primary?.id) || strokeObjs[0] || null;
  const fillCopyFb = useCopyFeedback();
  const strokeCopyFb = useCopyFeedback();
  const layKey = layItems.map(o => o.id).sort().join(',');
  React.useEffect(() => { setLayDirty(false); }, [layKey]);
  const layUpdD = patch => { setLayDirty(true); layUpd(patch); };
  const layPadD = (k, v) => { setLayDirty(true); layPad(k, v); };
  const applyLayoutD = () => { setLayDirty(false); runLayout(lay, true); };
  const rScrollRef = useRef<HTMLDivElement | null>(null);
  const applyPri = layDirty && layItems.length > 0;
  return (<aside className="fig-right-sidebar order-3 lg:order-none"><style>{`
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
  .fig-right-sidebar .seg.seg-wrap, .fig-right-sidebar .seg.flex-wrap { display: flex !important; flex-wrap: wrap !important; gap: 4px !important; height: auto !important; }
  .fig-right-sidebar .seg.seg-wrap > .seg-p, .fig-right-sidebar .seg.flex-wrap > .seg-p { display: none !important; }
  .fig-right-sidebar .seg.seg-wrap button, .fig-right-sidebar .seg.flex-wrap button { flex: 1 1 auto !important; min-width: fit-content !important; white-space: nowrap !important; padding: 5px 8px !important; }
  .fig-right-sidebar .seg.seg-wrap button span, .fig-right-sidebar .seg.flex-wrap button span { white-space: nowrap !important; overflow: visible !important; text-overflow: clip !important; }
  .fig-right-sidebar .seg.seg-wrap button.on, .fig-right-sidebar .seg.flex-wrap button.on { background: color-mix(in srgb, var(--acc) 18%, var(--card)) !important; color: var(--fig-sel-ink) !important; font-weight: 600 !important; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06) !important; }
  .fig-right-sidebar .fig-input { transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease; caret-color: var(--acc); }
  .fig-right-sidebar .fig-input:focus { border-color: var(--acc) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 22%, transparent) !important; background: color-mix(in srgb, var(--acc) 5%, var(--sub)) !important; outline: none; }
  .fig-right-sidebar button:disabled { cursor: not-allowed; }
`}</style><div className="fig-r-topbar space-y-2"><div className="flex items-center justify-between gap-1 min-w-0"><div className="flex items-center gap-1"><button type="button" className="fig-ibtn" disabled={!canUndo} data-tip="veUndo" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veUndo.t} onClick={undo}><Vi d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" s={15} /></button><button type="button" className="fig-ibtn" disabled={!canRedo} data-tip="veRedo" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veRedo.t} onClick={redo}><Vi d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 13" s={15} /></button></div><div className="flex items-center gap-1 min-w-0"><button type="button" className="fig-ibtn" data-tip="veZoomOut" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veZoomOut.t} onClick={() => zoomBy(1 / 1.25)}><Ico n="zoomOut" size={14} /></button><span ref={zoomPctRef} className="text-[11px] font-semibold tabular-nums text-center" data-tip="veZoomPct" style={{
          minWidth: 56,
          display: 'inline-block',
          fontVariantNumeric: 'tabular-nums'
        }}>{zFmt(displayZoomRef.current || zoom)}</span><button type="button" className="fig-ibtn" data-tip="veZoomIn" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veZoomIn.t} onClick={() => zoomBy(1.25)}><Ico n="zoomIn" size={14} /></button></div></div><Slider domRef={zoomSliderDomRef} min={0} max={1000} step={1} value={vzToSl(displayZoomRef.current || zoom)} on={(v, meta) => setZ(vslToZ(v), null, null, meta?.isLive !== false)} label="Zoom" tip="veZoomSl" /><div className="flex items-center gap-1.5 w-full"><button type="button" className="ved-pill text-[11px] flex-1 justify-center" style={{
        padding: '5px 10px',
        flex: '1 1 0%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll-wrap"><div className="fig-r-scroll" ref={rScrollRef}>{textControls}{(() => {
  /* Seksi "Parameter tool" (Task 2): switch per tool — Task 3 (Weave) dan
     Task 5 (Arc) menambahkan cabang mereka sendiri di sini. Tool AKTIF menang
     atas fallback seleksi (fix round 1 Task 3): bila tool adalah generator,
     tampilkan cabangnya meskipun ada objek generator lain yang terseleksi;
     bila tool bukan generator, fallback ke objek terseleksi (blob dulu, lalu
     weave, lalu arc). Nilai yang ditampilkan = gen objek terseleksi (parameter
     menempel), bila tidak ada = default blobParams/weaveParams/arcParams
     untuk objek berikutnya. */
  const selBlob = (selObjs || []).find(o => o && o.gen && o.gen.kind === 'blob');
  const selWeave = (selObjs || []).find(o => o && o.gen && o.gen.kind === 'weave');
  const selArc = (selObjs || []).find(o => o && o.gen && o.gen.kind === 'arc');
  const kind = tool === 'blob' ? 'blob' : tool === 'weave' ? 'weave' : tool === 'arc' ? 'arc' : selBlob ? 'blob' : selWeave ? 'weave' : selArc ? 'arc' : null;
  if (kind === 'blob') {
    const shown = selBlob ? selBlob.gen : blobParams;
    return <div className="fig-isec fade" data-tip="veToolParams"><div className="fig-isec-title"><span>{L.edBlob}</span></div><div className="space-y-2"><Range l={L.edBlobPoints} v={shown.points} min={3} max={48} step={1} on={(v, meta) => onBlobParams({ points: v }, meta)} tip="veBlobPoints" f={v => String(v)} /><Range l={L.edBlobIrregularity} v={Math.round(shown.irregularity * 100)} min={0} max={100} step={1} on={(v, meta) => onBlobParams({ irregularity: v / 100 }, meta)} tip="veBlobIrregularity" f={v => v + '%'} /><Range l={L.edBlobSmoothness} v={Math.round(shown.smoothness * 100)} min={0} max={100} step={1} on={(v, meta) => onBlobParams({ smoothness: v / 100 }, meta)} tip="veBlobSmoothness" f={v => v + '%'} /><Range l={L.edBlobRot} v={Math.round(shown.rotation || 0)} min={0} max={360} step={1} on={(v, meta) => onBlobParams({ rotation: v }, meta)} tip="veBlobRot" f={v => v + '°'} /><Range l={L.edBlobSpike} v={Math.round((shown.spikiness || 0) * 100)} min={0} max={100} step={1} on={(v, meta) => onBlobParams({ spikiness: v / 100 }, meta)} tip="veBlobSpike" f={v => v + '%'} /><div className="flex items-center justify-between gap-1.5"><span className="text-[11px] mut">{L.edBlobSeed}</span><span className="flex items-center gap-1.5"><div className="fld px-1.5 py-0.5" style={{ width: 72, height: 22 }}><CustomTextBox value={String(shown.seed ?? 0)} ariaLabel={L.edBlobSeed} filterRe={/[^0-9]/g} onCommit={raw => { const num = parseInt(raw, 10); if (Number.isFinite(num)) onBlobParams({ seed: Math.max(0, num) }); }} /></div><button type="button" className="ved-pill" data-tip="veBlobRandomSeed" onClick={() => onBlobParams({ seed: Math.floor(Math.random() * 100000) })}>{L.edBlobRandom}</button></span></div></div></div>;
  }
  /* Cabang Weave (Task 3): tampil saat tool weave aktif ATAU ada strip weave
     yang terseleksi; nilai = gen strip terseleksi (parameter menempel di
     grup), bila tidak ada = default weaveParams untuk weave berikutnya.
     Amplitudo disimpan fraksi 0-1 (UI 0-100%), ketebalan fraksi 0.1-1
     (UI 10-100%). */
  if (kind === 'weave') {
    const shown = selWeave ? selWeave.gen : weaveParams;
    return <div className="fig-isec fade" data-tip="veToolParams"><div className="fig-isec-title"><span>{L.edWeave}</span></div><div className="space-y-2"><div><div className="fig-sub-lbl" data-tip="veWeaveType">{L.edWeaveType}</div><Seg o={[['sine', L.edWeaveSine], ['triangle', L.edWeaveTriangle], ['square', L.edWeaveSquare]]} v={shown.waveType || 'sine'} on={wt => onWeaveParams({ waveType: wt })} tip="veWeaveType" /></div><Range l={L.edWeaveCols} v={shown.cols} min={2} max={16} step={1} on={(v, meta) => onWeaveParams({ cols: v }, meta)} tip="veWeaveCols" f={v => String(v)} /><Range l={L.edWeaveRows} v={shown.rows} min={2} max={16} step={1} on={(v, meta) => onWeaveParams({ rows: v }, meta)} tip="veWeaveRows" f={v => String(v)} /><Range l={L.edWeaveAmplitude} v={Math.round(shown.amplitude * 100)} min={0} max={100} step={1} on={(v, meta) => onWeaveParams({ amplitude: v / 100 }, meta)} tip="veWeaveAmplitude" f={v => v + '%'} /><Range l={L.edWeaveThickness} v={Math.round(shown.thickness * 100)} min={10} max={100} step={1} on={(v, meta) => onWeaveParams({ thickness: v / 100 }, meta)} tip="veWeaveThickness" f={v => v + '%'} /><Range l={L.edWeaveGap} v={Math.round((shown.gapSize ?? 0.5) * 100)} min={0} max={100} step={1} on={(v, meta) => onWeaveParams({ gapSize: v / 100 }, meta)} tip="veWeaveGap" f={v => v + '%'} /><Range l={L.edWeaveFreq} v={shown.frequency || 1} min={1} max={4} step={1} on={(v, meta) => onWeaveParams({ frequency: v }, meta)} tip="veWeaveFreq" f={v => v + 'x'} /><Range l={L.edWeavePhase} v={Math.round(shown.phase || 0)} min={0} max={360} step={1} on={(v, meta) => onWeaveParams({ phase: v }, meta)} tip="veWeavePhase" f={v => v + '°'} /></div></div>;
  }
  /* Cabang Arc (Task 5): tampil saat tool arc aktif ATAU ada busur yang
     terseleksi; nilai = gen busur terseleksi (parameter menempel), bila
     tidak ada = default arcParams untuk busur berikutnya. Edit angka
     mempertahankan pusat (regenArc hanya mengubah r/startDeg/sweepDeg)
     dan live-update via commitObjs key 'arc-param'. */
  if (kind === 'arc') {
    const shown = selArc ? selArc.gen : arcParams;
    return <div className="fig-isec fade" data-tip="veToolParams"><div className="fig-isec-title"><span>{L.edArc}</span></div><div className="space-y-2"><Range l={L.edArcRadius} v={shown.r} min={1} max={500} step={1} on={(v, meta) => onArcParams({ r: v }, meta)} tip="veArcRadius" f={v => String(Math.round(v * 100) / 100)} /><Range l={L.edArcStart} v={shown.startDeg} min={0} max={360} step={1} on={(v, meta) => onArcParams({ startDeg: v }, meta)} tip="veArcStart" f={v => Math.round(v * 100) / 100 + '°'} /><Range l={L.edArcSweep} v={shown.sweepDeg} min={0} max={360} step={1} on={(v, meta) => onArcParams({ sweepDeg: v }, meta)} tip="veArcSweep" f={v => Math.round(v * 100) / 100 + '°'} /></div></div>;
  }
  return null;
})()}<div className="fig-isec" data-tip="veXfPanel"><div className="fig-isec-title"><span>Position & Transform</span></div><div className="fig-sub-lbl" data-tip="veAlnPanel">{L.riAlignDist}</div><div className="flex items-center gap-1 mb-2.5"><div className="fig-aln-bar flex-1">{[0, 1, 2, 3, 4, 5].map(ix => {
            const [k, tip, d] = ALN_BTNS[ix];
            return <button key={k} type="button" data-tip={tip} aria-label={(lang === 'en' ? TIPS_EN : TIPS)[tip].t} disabled={!selObjs.length || selNodes.size === 1} onClick={() => alignDo(k)}><Vi d={d} s={14} /></button>;
          })}</div><button type="button" className="fig-ibtn" style={{
          background: 'var(--sub)',
          width: 30,
          height: 30
        }} data-tip="veAlnDistH" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veAlnDistH.t} disabled={!selObjs.length || selNodes.size > 0 || selObjs.length < 3} onClick={() => alignDo('distH')}><Vi d={ALN_BTNS[6][2]} s={14} /></button><button type="button" className="fig-ibtn" style={{
          background: 'var(--sub)',
          width: 30,
          height: 30
        }} data-tip="veAlnDistV" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veAlnDistV.t} disabled={!selObjs.length || selNodes.size > 0 || selObjs.length < 3} onClick={() => alignDo('distV')}><Vi d={ALN_BTNS[7][2]} s={14} /></button></div>{!xm ? <div className="text-[11px] mut">{L.riHintPos}</div> : <div className="space-y-2 fade"><div><div className="fig-sub-lbl">Position</div><div className="grid grid-cols-2 gap-1.5"><XfField label="X" value={xp.x} on={v => setXfPos('x', v)} tip="veXfX" /><XfField label="Y" value={xp.y} on={v => setXfPos('y', v)} tip="veXfY" /></div></div><div><div className="fig-sub-lbl">Dimensions</div><div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center"><XfField label="W" value={xm.w} min={0.5} dis={!!xfNodes} on={v => setXfDim('w', v)} tip="veXfW" /><XfField label="H" value={xm.h} min={0.5} dis={!!xfNodes} on={v => setXfDim('h', v)} tip="veXfH" /><button type="button" className={'fig-ibtn' + (lockAR ? ' on' : '')} style={{
              background: 'var(--sub)',
              width: 30,
              height: 30
            }} data-tip="veXfLock" aria-label={L.riLockAR} aria-pressed={lockAR} onClick={() => setLockAR(v => !v)}><Vi s={14} d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></button></div></div><div><div className="fig-sub-lbl">Rotation & Flip</div><div className="grid grid-cols-[1fr_auto] gap-1.5 items-center"><XfField label="∠" value={xm.rot} step={1} dis={!!xfNodes} on={setXfRot} tip="veXfRot" /><div className="flex items-center gap-1"><button type="button" className="fig-ibtn" style={{
                background: 'var(--sub)',
                width: 30,
                height: 30
              }} data-tip="veXfFlipH" aria-label={L.riFlipH} disabled={!!xfNodes} onClick={() => flipXf('h')}><Vi s={15} d="M12 3v18 M8 7 3 12l5 5V7z M16 7l5 5-5 5V7z" /></button><button type="button" className="fig-ibtn" style={{
                background: 'var(--sub)',
                width: 30,
                height: 30
              }} data-tip="veXfFlipV" aria-label={L.riFlipV} disabled={!!xfNodes} onClick={() => flipXf('v')}><Vi s={15} d="M3 12h18 M7 8l5-5 5 5H7z M7 16l5 5 5-5H7z" /></button></div></div></div><div className="grid grid-cols-[auto_1fr] items-stretch gap-2.5 pt-0.5"><PinGrid L={L} value={pin} on={setPin} tip="veXfPin" className="pin3-fill" /><div className="flex-1 space-y-1.5 min-w-0"><Seg o={[['center', L.riPivotCenter], ['pin', L.riPivotPin]]} v={rotPivot} on={setRotPivot} tip="veXfPivot" tips={{
              center: 'veXfPivC',
              pin: 'veXfPivP'
            }} /><button type="button" className={'ved-pill w-full' + (scaleStk ? ' on' : '')} data-tip="veXfStroke" aria-pressed={scaleStk} onClick={() => setScaleStk(v => !v)}>{L.riStrokeScale}</button></div></div></div>}</div><div className="fig-isec" data-tip="veAppear"><div className="fig-isec-title"><span>Appearance{selObjs.length > 1 ? ' (' + selObjs.length + ')' : ''}</span><button type="button" className="fig-ibtn" data-tip="veToggleHidden" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veToggleHidden.t} disabled={!selObjs.length} onClick={toggleSelHidden}><Ico n={allSelHidden ? 'eyeOff' : 'eye'} size={14} /></button></div>{primary ? <div className="space-y-2 fade"><div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-end"><div><div className="fig-sub-lbl">Opacity</div><XfField label="%" value={Math.round(primary.opacity * 100)} min={0} step={5} on={v => setProp('opacity', clampN(v / 100, 0, 1))} tip="veOpacity" /></div><div><div className="fig-sub-lbl">{indivCornerOpen && activeCorners.length < detectedCorners.length ? `Radius (${activeCorners.length}/${detectedCorners.length})` : 'Corner radius'}</div><XfField label="◜" value={curR} min={0} step={1} dis={!!(primary.img || primary.text)} on={setRadius} tip="veCornerRadius" /></div><button type="button" className={'fig-ibtn' + (indivCornerOpen ? ' on' : '')} style={{
            background: 'var(--sub)',
            width: 30,
            height: 30
          }} data-tip="veCorner" aria-pressed={indivCornerOpen} onClick={() => setIndivCornerOpen(v => !v)}><Vi s={14} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /></button></div>{indivCornerOpen && !primary.img && !primary.text && <div className="p-2.5 rounded-xl space-y-2 fade" style={{
          background: 'var(--sub)',
          border: '1px solid var(--line)'
        }}><div className="flex items-center justify-between gap-1"><span className="text-[11px] font-semibold">Individual Radius ({detectedCorners.length} {lang === 'en' ? 'corners' : 'sudut'})</span></div><Seg v={cornerMode} on={m => {
            setCornerMode(m);
            if (activeCorners.length) applyRadiusToCorners(activeCorners, curR, 'cr-mode');
          }} o={[['circular', 'Circular'], ['bezier', 'Squircle'], ['chamfer', 'Bevel']]} tip="veCornerMode" />{detectedCorners.length === 0 ? <div className="text-[11px] mut">{L.riNoCorners}</div> : <div className="space-y-2"><div className="flex flex-wrap gap-1"><button type="button" className={'ved-pill text-[10px]' + (activeCorners.length === detectedCorners.length ? ' on' : '')} onClick={() => setPickedCornerKeys(new Set(detectedCorners.map(c => c.key)))}>{L.riAllN.replace('{n}', detectedCorners.length)}</button><button type="button" className="ved-pill text-[10px]" onClick={() => setPickedCornerKeys(new Set(detectedCorners.filter((_, i) => i % 2 === 0).map(c => c.key)))}>{L.riOdd}</button><button type="button" className="ved-pill text-[10px]" onClick={() => setPickedCornerKeys(new Set(detectedCorners.filter((_, i) => i % 2 === 1).map(c => c.key)))}>{L.riEven}</button><button type="button" className="ved-pill text-[10px]" onClick={() => applyRadiusToCorners(activeCorners.length ? activeCorners : detectedCorners, 0, 'cr-reset')}>{L.riSharpen}</button></div><div className="text-[11px] mut">{L.riCornerPick}</div><div className="grid grid-cols-3 gap-1.5" style={{
              maxHeight: 132,
              overflowY: 'auto'
            }}>{detectedCorners.map(c => {
                const on = pickedCornerKeys.has(c.key);
                return <button key={c.key} type="button" className={'crn-chip' + (on ? ' on' : '')} data-tip-text={L.riCornerTip.replace('{idx}', c.idx).replace('{dir}', c.dir).replace('{r}', c.r)} onClick={e => {
                  setPickedCornerKeys(prev => {
                    if (e.shiftKey) {
                      const next = new Set(prev);
                      if (next.has(c.key) && next.size > 1) next.delete(c.key);
                      else next.add(c.key);
                      return next;
                    }
                    return new Set([c.key]);
                  });
                }}><span className="truncate min-w-0">#{c.idx}{c.dir}</span><span className="font-mono text-[10px] opacity-80 flex-none">{c.r}</span></button>;
              })}</div><Range l={L.riRadiusN.replace('{n}', activeCorners.length)} v={curR} min={0} max={100} step={0.5} on={r => applyRadiusToCorners(activeCorners.length ? activeCorners : detectedCorners, r, 'cr-sel')} f={v => v ? v + ' u' : L.riSharp0} /><div className="text-[11px] mut pt-1">{L.riCornerTitle}</div><div className="grid grid-cols-2 gap-1.5" style={{
              maxHeight: 168,
              overflowY: 'auto'
            }}>{detectedCorners.map(c => <XfField key={'xf-' + c.key} label={'#' + c.idx + c.dir} value={c.r} min={0} step={1} on={v => applyRadiusToCorners([c], v, 'cr-one-' + c.key)} />)}</div></div>}</div>}{!primary.img && <div><div className="fig-sub-lbl" data-tip="veFillRule">{L.riFillRule}</div><Seg o={[['nonzero', 'Nonzero'], ['evenodd', 'Even-odd']]} v={primary.fillRule || 'nonzero'} on={v => setProp('fillRule', v)} tip="veFillRule" tips={{
            nonzero: 'veFillNonzero',
            evenodd: 'veFillEvenodd'
          }} /></div>}<div><div className="fig-sub-lbl" data-tip="veBlendMode">{L.blendMode || (lang === 'en' ? 'Blend Mode' : 'Mode Campur')}</div><Select testId="blend-mode-select" value={primary.blendMode || 'normal'} options={BLEND_MODE_OPTIONS as any} on={v => setProp('blendMode', v === 'normal' ? undefined : v)} /></div></div> : <div className="text-[11px] mut">{L.riHintStyle}</div>}</div>{selImages.length > 0 && <div className="fig-isec fade" data-testid="auto-trace-section" data-tip="veAutoTrace"><div className="fig-isec-title"><span>{L.atTitle || (lang === 'en' ? 'Auto Trace Image to SVG' : 'Auto Trace Gambar ke SVG')}</span><span className="fig-badge">Rust WASM</span></div><div className="space-y-2.5"><div><div className="fig-sub-lbl" data-tip="veAutoTraceMode">{L.atMode || (lang === 'en' ? 'Trace Mode' : 'Mode Trace')}</div><Seg testId="auto-trace-mode" o={[['bw', L.atModeBw || (lang === 'en' ? 'Black & White' : 'Hitam Putih')], ['color', L.atModeColor || (lang === 'en' ? 'Color (Multi-Layer)' : 'Warna (Multi-Layer)')]]} v={traceOpts.mode} on={m => setTraceOpts((p: any) => ({ ...p, mode: m }))} tip="veAutoTraceMode" /></div>{traceOpts.mode === 'bw' ? <div data-testid="auto-trace-threshold"><Range l={L.atThreshold || (lang === 'en' ? 'Luminance Threshold' : 'Ambang Kecerahan (Threshold)')} v={traceOpts.threshold} min={8} max={248} step={1} on={v => setTraceOpts((p: any) => ({ ...p, threshold: v }))} tip="veAutoTraceThreshold" f={v => String(v)} /></div> : <div data-testid="auto-trace-colors"><Range l={L.atColors || (lang === 'en' ? 'Color Layers' : 'Jumlah Warna')} v={traceOpts.colorCount} min={2} max={16} step={1} on={v => setTraceOpts((p: any) => ({ ...p, colorCount: v }))} tip="veAutoTraceColors" f={v => String(v)} /></div>}<div data-testid="auto-trace-smoothness"><Range l={L.atSmoothness || (lang === 'en' ? 'Curve Smoothing' : 'Kehalusan Kurva Bézier')} v={Math.round(traceOpts.smoothness * 100)} min={0} max={135} step={5} on={v => setTraceOpts((p: any) => ({ ...p, smoothness: v / 100 }))} tip="veAutoTraceSmooth" f={v => v + '%'} /></div><div data-testid="auto-trace-corner"><Range l={L.atCornerAngle || (lang === 'en' ? 'Corner Threshold' : 'Ambang Sudut Tajam')} v={traceOpts.cornerThreshold} min={20} max={140} step={5} on={v => setTraceOpts((p: any) => ({ ...p, cornerThreshold: v }))} tip="veAutoTraceCorner" f={v => v + '°'} /></div><div data-testid="auto-trace-despeckle"><Range l={L.atDespeckle || (lang === 'en' ? 'Despeckle (Min Area)' : 'Hapus Bintik (Despeckle)')} v={traceOpts.despeckle} min={0} max={64} step={1} on={v => setTraceOpts((p: any) => ({ ...p, despeckle: v }))} tip="veAutoTraceDespeckle" f={v => v + ' px'} /></div><div className="space-y-1.5 pt-0.5"><button type="button" role="checkbox" aria-checked={traceOpts.ignoreWhite} data-testid="auto-trace-ignore-white" data-tip="veAutoTraceIgnoreWhite" className={'c-chk' + (traceOpts.ignoreWhite ? ' on' : '')} onClick={() => setTraceOpts((p: any) => ({ ...p, ignoreWhite: !p.ignoreWhite }))}><span className="c-chk-box">{traceOpts.ignoreWhite && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>{L.atIgnoreWhite || (lang === 'en' ? 'Ignore White Background' : 'Abaikan Latar Putih')}</span></button><button type="button" role="checkbox" aria-checked={traceOpts.keepOriginalImage} data-testid="auto-trace-keep-img" data-tip="veAutoTraceKeepImg" className={'c-chk' + (traceOpts.keepOriginalImage ? ' on' : '')} onClick={() => setTraceOpts((p: any) => ({ ...p, keepOriginalImage: !p.keepOriginalImage }))}><span className="c-chk-box">{traceOpts.keepOriginalImage && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>{L.atKeepOriginal || (lang === 'en' ? 'Keep Original Image' : 'Pertahankan Gambar Asli')}</span></button></div><button type="button" className="btn pri fig-cta-btn w-full" data-testid="auto-trace-run-btn" data-tip="veAutoTraceRun" disabled={tracingBusy} onClick={runAutoTrace}><Ico n="wand" size={14} /><span>{tracingBusy ? (L.atTracing || (lang === 'en' ? 'Tracing…' : 'Memproses Trace…')) : (L.atRunBtn || (lang === 'en' ? 'Trace Image to SVG' : 'Trace Gambar ke SVG'))}</span></button></div></div>}{(() => {
  const styles = doc && Array.isArray(doc.styles) ? doc.styles : [];
  const recents = Array.isArray(recentColors) ? recentColors : [];
  const srcHex = primary && primary.type === 'text' && primary.text ? primary.text.fill : cp && cp.fill;
  const canCreate = !!(primary && !primary.img && srcHex && srcHex !== 'none' && cp && !VE.gradOn(cp));
  const createStyleFromSelection = () => {
    const d = docRef.current;
    const src = cp;
    if (!src || src.img || !srcHex || srcHex === 'none' || VE.gradOn(src)) return;
    const hex = parseColorWithAlpha(srcHex).hex;
    let n = styles.length + 1;
    while (styles.some(s => s.name === 'Style ' + n)) n++;
    const created = createStyle(d, 'Style ' + n, hex);
    // Ruling L: hanya objek SOLID yang ditautkan — gradient/image dilewati,
    // persis seperti applyStyle di bawah (sebelumnya paintTargetIds tanpa
    // filter menautkan objek gradien dan meninggalkan fillStyleId hantu).
    const targets = paintObjs.filter(o => !o.img && !VE.gradOn(o));
    const linked = linkStyle(created.doc, new Set(targets.map(o => o.id)), 'fill', created.style.id);
    commit(linked, 'style:create');
    say(L.riStyleCreated.replace('{name}', created.style.name));
    if (onRecentColor) onRecentColor(hex);
  };
  const applyStyle = styleId => {
    const d = docRef.current;
    const style = (d.styles || []).find(x => x.id === styleId);
    if (!style) return;
    const targets = paintObjs.filter(o => !o.img && !VE.gradOn(o));
    if (!targets.length) { say(L.riStyleApplyNoTarget); return; }
    commit(linkStyle(d, new Set(targets.map(o => o.id)), 'fill', styleId), 'style:link');
    say(L.riStyleApplied.replace('{name}', style.name).replace('{n}', String(targets.length)));
  };
  const editStyleHex = (s, v, meta) => {
    if (v === 'none') { say(L.riStyleNoNone); return; }
    const p = parseColorWithAlpha(v);
    if (p.isNone || p.a < 0.999) return;
    const hex = p.hex;
    if (meta && meta.isLive && livePaint) {
      livePaint(o => {
        let out = o;
        if (o.fillStyleId === s.id) out = paintSlot(out, 'fill', hex);
        if (o.strokeStyleId === s.id) out = paintSlot(out, 'stroke', hex);
        return out;
      }, { previewOnly: true });
      return;
    }
    commit(applyStyleEdit(docRef.current, s.id, hex), 'style:edit');
    if (onRecentColor) onRecentColor(hex);
  };
  const renameStyleById = (s, v) => {
    const name = String(v || '').trim();
    if (!name || name === s.name) return;
    commit(renameStyle(docRef.current, s.id, name), 'style:rename');
  };
  const deleteStyleById = s => {
    commit(deleteStyle(docRef.current, s.id), 'style:delete');
    say(L.riStyleDeleted.replace('{name}', s.name));
  };
  const applyRecentColor = hex => {
    if (!paintTargetIds.size) return;
    commitObjs(o => paintTargetIds.has(o.id) && !o.img ? directEditUnlink(o, {
      ...o, fill: hex, grad: null,
      ...(o.type === 'text' && o.text ? { text: { ...o.text, fill: hex } } : {})
    }, 'fill', styles) : o, 'p:fill');
    if (onRecentColor) onRecentColor(hex);
  };
  return <div className="fig-isec fade" data-testid="color-styles-section" data-tip="veColorStyles" style={{ padding: '20px 18px' }}><div className="fig-isec-title"><span style={{ whiteSpace: 'nowrap' }}>{L.riColorStyles}</span></div><div className="flex flex-wrap gap-1.5 pb-1.5"><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veStyleCreate" disabled={!canCreate} onClick={createStyleFromSelection}><Ico n="plus" size={11} /> {L.riStyleCreate}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="frOpen" data-testid="fr-open-styles" onClick={() => { setRcOpen(false); setFrOpen(v => !v); }}><Ico n="refresh" size={11} /> {L.frOpenBtn}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="rcOpen" data-testid="rc-open-styles" onClick={() => { setFrOpen(false); setRcOpen(v => !v); }}><Ico n="palette" size={11} /> {L.rcOpenBtn}</button></div>{styles.length === 0 ? <div className="text-[11px] mut">{L.riStyleEmpty}</div> : <div className="space-y-1.5">{styles.map(s => {
    const linkedCount = (doc.objects || []).filter(o => o.fillStyleId === s.id || o.strokeStyleId === s.id).length;
    return <div key={s.id} className="flex items-center gap-2 p-1.5 rounded-xl" style={{ background: 'var(--sub)' }} data-testid="style-row" data-style-id={s.id}><button type="button" className="swatch" style={{ background: s.hex }} data-tip="veStyleApply" data-style-id={s.id} aria-label={L.riStyleApply + ': ' + s.name} onClick={() => applyStyle(s.id)} /><ColorField L={L} tip="veStyleHex" value={s.hex} on={(v, meta) => editStyleHex(s, v, meta)} /><div className="flex-1 min-w-0"><CustomTextBox value={s.name} ariaLabel={L.riStyleRename} onCommit={v => renameStyleById(s, v)} /></div><span className="fig-badge">{L.riStyleCount.replace('{n}', String(linkedCount))}</span><button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-tip="veStyleDelete" onClick={() => deleteStyleById(s)}>×</button></div>;
  })}</div>}{recents.length > 0 && <div className="pt-2"><div className="fig-sub-lbl">{L.riRecentColors}</div><div className="flex flex-wrap gap-1.5" data-testid="recent-colors">{recents.map(c => <button key={c} type="button" className="swatch" style={{ background: c, width: 22, height: 22 }} data-tip="veRecentColor" data-color={c} aria-label={c} disabled={!paintTargetIds.size} onClick={() => applyRecentColor(c)} />)}</div></div>}</div>;
})()}{primary && !primary.img && <div className="fig-isec fade" data-tip="veFill"><div className="fig-isec-title"><span>Fill{paintObjs.length === 1 && isBgObj(paintObjs[0]) && selObjs.length > 1 ? ' (Frame)' : ''}</span><div className="flex items-center gap-1"><button type="button" className="fig-ibtn" data-tip="vePipetteFill" onClick={async () => {
            const c = await pickScreenColor();
            if (c) {
              commitObjs(o => paintTargetIds.has(o.id) && !o.img ? directEditUnlink(o, {
                ...o,
                fill: c,
                grad: null,
                ...(o.type === 'text' && o.text ? {text: {...o.text, fill: c}} : {})
              }, 'fill', doc.styles) : o, 'p:fill');
              if (onRecentColor) onRecentColor(c);
            }
          }}><Ico n="pipette" size={13} /></button><button type="button" className="fig-ibtn" data-tip="veFillNone" onClick={() => {
            const nf = cp.fill === 'none' ? '#0d99ff' : 'none';
            commitObjs(o => paintTargetIds.has(o.id) && !o.img ? directEditUnlink(o, {
              ...o,
              fill: nf,
              grad: null,
              ...(o.type === 'text' && o.text ? {text: {...o.text, fill: nf}} : {})
            }, 'fill', doc.styles) : o, 'p:fill');
            /* Fix wave F12: restore '#0d99ff' dari toggle none juga dicatat
               sebagai recent color (mencerminkan cabang commitPaint) —
               'none' tidak dicatat (rememberRecentColor juga melewatinya). */
            if (nf === '#0d99ff' && onRecentColor) onRecentColor(nf);
          }}><Ico n={cp.fill !== 'none' ? 'minus' : 'plus'} size={14} /></button></div></div><div className="space-y-2"><GradientEditorPanel slot="fill" L={L} lang={lang} docStyles={doc && doc.styles ? doc.styles : []} obj={cp} selObjs={paintObjs} commitObjs={commitObjs} livePaint={livePaint} commitPaint={commitPaint} say={say} activeStopId={activeStopId} setActiveStopId={setActiveStopId} onActivateSlot={() => setActiveGradSlot?.('fill')} />{!VE.gradOn(cp) && <div className="flex items-center gap-1.5 py-1"><ColorField L={L} tip="veFill" value={cp.fill} on={(v, meta) => {
            const fn = o => paintTargetIds.has(o.id) && !o.img ? directEditUnlink(o, {
              ...o,
              fill: v,
              grad: null,
              ...(o.type === 'text' && o.text ? {text: {...o.text, fill: v}} : {})
            }, 'fill', doc.styles) : o;
            if (meta && meta.isLive && livePaint) livePaint(fn, {previewOnly: true});
            else if (commitPaint) {
              commitPaint(fn, 'p:fill');
              if (onRecentColor) onRecentColor(v);
            } else { commitObjs(fn, 'p:fill'); if (onRecentColor) onRecentColor(v); }
          }} /><ColorText L={L} value={cp.fill} on={v => {
            commitObjs(o => paintTargetIds.has(o.id) && !o.img ? directEditUnlink(o, {
              ...o,
              fill: v,
              grad: null,
              ...(o.type === 'text' && o.text ? {text: {...o.text, fill: v}} : {})
            }, 'fill', doc.styles) : o, 'p:fill');
            if (onRecentColor) onRecentColor(v);
          }} /><button type="button" className="fig-ibtn flex-none" style={{ background: 'var(--sub)' }} data-testid="fill-solid-copy" data-tip="veCopyColor" data-copied={fillCopyFb.status === 'copied' ? '' : undefined} aria-label={L.cpCopyColorAria || L.cpCopy} onClick={async () => {
            const res = await copySolidPaint(cp.fill);
            const msg = (L.cpColorCopied || 'Warna {v} disalin').replace('{v}', res.text);
            fillCopyFb.trigger(true, msg);
            say && say(msg);
          }}><Ico n={fillCopyFb.status === 'copied' ? 'check' : 'copy'} size={13} /></button><button type="button" className="fig-ibtn flex-none" style={{ background: 'var(--sub)' }} data-testid="fill-solid-paste" data-tip="vePasteColor" aria-label={L.cpPasteColorAria || L.cpPaste} onClick={async () => {
            const pasted = await readPaintClipboard('any');
            if (!pasted) {
              say && say(L.cpPasteInvalid || 'Clipboard tidak berisi warna yang valid');
              return;
            }
            if (pasted.kind === 'gradient') {
              commitObjs(o => paintTargetIds.has(o.id) && !o.img ? applyGradientPayloadToObj(o, pasted) : o, 'grad-paste');
              say && say(L.gradPasted || 'Gradien ditempel');
              return;
            }
            const nextVal = pasted.isNone ? 'none' : pasted.color;
            commitObjs(o => paintTargetIds.has(o.id) && !o.img ? directEditUnlink(o, {
              ...o,
              fill: nextVal,
              grad: null,
              ...(o.type === 'text' && o.text ? {text: {...o.text, fill: nextVal}} : {})
            }, 'fill', doc.styles) : o, 'p:fill');
            if (!pasted.isNone && onRecentColor) onRecentColor(pasted.hex);
            say && say((L.cpColorPasted || 'Warna {v} ditempel').replace('{v}', pasted.text));
          }}><Ico n="paste" size={13} /></button><span role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0.001, pointerEvents: 'none' }}>{fillCopyFb.liveMsg}</span></div>}{cp && cp.fillStyleId && (() => {
          const st = (doc.styles || []).find(x => x.id === cp.fillStyleId);
          if (!st) return null;
          return <div className="flex items-center gap-2 pt-1" data-testid="fill-style-link"><span className="fig-badge">Style · {st.name}</span><button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-tip="veStyleUnlinkFill" onClick={() => { commit(unlinkStyle(docRef.current, paintTargetIds, 'fill'), 'style:unlink'); say(L.riStyleUnlinked); }}>{L.riStyleUnlink}</button></div>;
        })()}</div></div>}{strokeCp && <div className="fig-isec fade" data-tip="veStroke"><div className="fig-isec-title"><span>Stroke{strokeObjs.length === 1 && isBgObj(strokeObjs[0]) && selObjs.length > 1 ? ' (Frame)' : ''}</span><div className="flex items-center gap-1"><button type="button" className="fig-ibtn" data-tip="vePipetteStroke" onClick={async () => {
            const c = await pickScreenColor();
            if (c) {
              commitObjs(o => strokeTargetIds.has(o.id) ? directEditUnlink(o, {
                ...o,
                stroke: c,
                strokeWidth: o.strokeWidth || 1
              }, 'stroke', doc.styles) : o, 'p:stroke');
              if (onRecentColor) onRecentColor(c);
            }
          }}><Ico n="pipette" size={13} /></button><button type="button" className="fig-ibtn" data-tip="veStrokeNone" onClick={() => commitObjs(o => strokeTargetIds.has(o.id) ? directEditUnlink(o, {
            ...o,
            stroke: (strokeCp.stroke === 'none' && !VE.strokeGradOn(strokeCp)) ? '#000000' : 'none',
            strokeWidth: (strokeCp.stroke === 'none' && !VE.strokeGradOn(strokeCp)) ? o.strokeWidth || 1 : o.strokeWidth
          }, 'stroke', doc.styles) : o, 'p:stroke')}><Ico n={(strokeCp.stroke !== 'none' || VE.strokeGradOn(strokeCp)) ? 'minus' : 'plus'} size={14} /></button></div></div><div className="space-y-2"><GradientEditorPanel slot="stroke" L={L} lang={lang} docStyles={doc.styles} obj={strokeCp} selObjs={strokeObjs} commitObjs={commitObjs} livePaint={livePaint} commitPaint={commitPaint} say={say} activeStopId={activeStrokeStopId} setActiveStopId={setActiveStrokeStopId} onActivateSlot={() => setActiveGradSlot?.('stroke')} showGizmoFocusToggle={Boolean(VE.strokeGradOn(strokeCp) && VE.gradOn(strokeCp))} isCanvasGizmoActive={activeGradSlot === 'stroke'} onFocusCanvasGizmo={() => setActiveGradSlot?.('stroke')} testIdPrefix="stroke-grad" />{!VE.strokeGradOn(strokeCp) && <div className="flex items-center gap-1.5 py-1"><ColorField L={L} tip="veStroke" value={strokeCp.stroke} on={(v, meta) => {
            const fn = o => strokeTargetIds.has(o.id) ? directEditUnlink(o, {
              ...o,
              stroke: v,
              strokeWidth: v !== 'none' && !o.strokeWidth ? 1 : o.strokeWidth
            }, 'stroke', doc.styles) : o;
            if (meta && meta.isLive && livePaint) livePaint(fn, {previewOnly: true});
            else if (commitPaint) {
              commitPaint(fn, 'p:stroke');
              if (onRecentColor) onRecentColor(v);
            } else { commitObjs(fn, 'p:stroke'); if (onRecentColor) onRecentColor(v); }
          }} /><ColorText L={L} value={strokeCp.stroke} on={v => {
            commitObjs(o => strokeTargetIds.has(o.id) ? directEditUnlink(o, {
              ...o,
              stroke: v,
              strokeWidth: v !== 'none' && !o.strokeWidth ? 1 : o.strokeWidth
            }, 'stroke', doc.styles) : o, 'p:stroke');
            if (onRecentColor) onRecentColor(v);
          }} /><button type="button" className="fig-ibtn flex-none" style={{ background: 'var(--sub)' }} data-testid="stroke-solid-copy" data-tip="veCopyColor" data-copied={strokeCopyFb.status === 'copied' ? '' : undefined} aria-label={L.cpCopyColorAria || L.cpCopy} onClick={async () => {
            const res = await copySolidPaint(strokeCp.stroke);
            const msg = (L.cpColorCopied || 'Warna {v} disalin').replace('{v}', res.text);
            strokeCopyFb.trigger(true, msg);
            say && say(msg);
          }}><Ico n={strokeCopyFb.status === 'copied' ? 'check' : 'copy'} size={13} /></button><button type="button" className="fig-ibtn flex-none" style={{ background: 'var(--sub)' }} data-testid="stroke-solid-paste" data-tip="vePasteColor" aria-label={L.cpPasteColorAria || L.cpPaste} onClick={async () => {
            const pasted = (await readPaintClipboard('any')) as any;
            if (!pasted || (!pasted.color && !pasted.hex)) {
              say && say(L.cpPasteInvalid || 'Clipboard tidak berisi warna yang valid');
              return;
            }
            const nextVal = pasted.isNone ? 'none' : (pasted.color || pasted.hex);
            commitObjs(o => strokeTargetIds.has(o.id) ? directEditUnlink(o, {
              ...o,
              stroke: nextVal,
              strokeWidth: nextVal !== 'none' && !o.strokeWidth ? 1 : o.strokeWidth
            }, 'stroke', doc.styles) : o, 'p:stroke');
            if (!pasted.isNone && onRecentColor && pasted.hex) onRecentColor(pasted.hex);
            say && say((L.cpColorPasted || 'Warna {v} ditempel').replace('{v}', pasted.text || nextVal));
          }}><Ico n="paste" size={13} /></button><span role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0.001, pointerEvents: 'none' }}>{strokeCopyFb.liveMsg}</span></div>}{strokeCp && strokeCp.strokeStyleId && (() => {
          const st = (doc.styles || []).find(x => x.id === strokeCp.strokeStyleId);
          if (!st) return null;
          return <div className="flex items-center gap-2 pt-1" data-testid="stroke-style-link"><span className="fig-badge">Style · {st.name}</span><button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-tip="veStyleUnlinkStroke" onClick={() => { commit(unlinkStyle(docRef.current, strokeTargetIds, 'stroke'), 'style:unlink'); say && say(L.riStyleUnlinked); }}>{L.riStyleUnlink}</button></div>;
        })()}{(strokeCp.stroke !== 'none' || VE.strokeGradOn(strokeCp)) && <div className="space-y-3 pt-1"><div data-tip="veStrokeW" className="space-y-1.5"><div className="flex items-center justify-between"><span className="fig-sub-lbl">{L.riStrokeWidth || 'Stroke width'}</span></div><div className="grid grid-cols-[1fr_auto] gap-2 items-center"><Range l="" v={Math.min(50, strokeCp.strokeWidth || 0)} min={0} max={50} step={0.5} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? {
          ...o,
          strokeWidth: v,
          stroke: v > 0 && o.stroke === 'none' && !VE.strokeGradOn(o) ? '#000000' : o.stroke
        } : o, 'p:sw')} f={v => v + ' px'} /><div data-testid="stroke-width-input" className="w-20" onClick={e => { const el = e.currentTarget.querySelector('[role="textbox"]') as HTMLElement; el?.focus(); }}><XfField label="px" value={strokeCp.strokeWidth || 0} min={0} step={0.5} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? {
          ...o,
          strokeWidth: Math.max(0, Math.min(10000, Number(v) || 0)),
          stroke: Number(v) > 0 && o.stroke === 'none' && !VE.strokeGradOn(o) ? '#000000' : o.stroke
        } : o, 'p:sw')} /></div></div></div>{(() => {
          const hasClosedTarget = strokeObjs.some(o => (o.subs || []).some(sp => sp.closed));
          return <div><div className="fig-sub-lbl" data-tip="veStrokeAlign">{L.strokeAlign || 'Posisi Garis'}</div><Seg testId="stroke-align-seg" o={[['center', L.alignCenter || 'Tengah', 'stkCenter'], ['inside', L.alignInside || 'Dalam', 'stkInside'], ['outside', L.alignOutside || 'Luar', 'stkOutside']]} v={strokeCp.strokeAlign || 'center'} disabledKeys={hasClosedTarget ? undefined : ['inside', 'outside']} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeAlign: v } : o, 'p:salign')} tip="veStrokeAlign" /></div>;
        })()}<div><div className="fig-sub-lbl" data-tip="vePaintOrder">{L.paintOrder || 'Urutan Gambar'}</div><Seg testId="stroke-paint-order-seg" o={[['fill stroke', L.paintOrderFillStroke || 'Fill Depan', 'paintOrderFillStroke'], ['stroke fill', L.paintOrderStrokeFill || 'Stroke Depan', 'paintOrderStrokeFill']]} v={strokeCp.paintOrder || 'fill stroke'} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, paintOrder: v } : o, 'p:paintorder')} tip="vePaintOrder" /></div><div className="grid grid-cols-2 gap-2"><div><div className="fig-sub-lbl" data-tip="veStrokeLinecap">{L.strokeLinecap || 'Ujung Garis (Cap)'}</div><Seg wrap cls="flex-wrap" testId="stroke-linecap-seg" o={[['round', 'Round'], ['butt', 'Butt'], ['square', 'Square']]} v={strokeCp.strokeLinecap || 'round'} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeLinecap: v } : o, 'p:linecap')} tip="veStrokeLinecap" /></div><div><div className="fig-sub-lbl" data-tip="veStrokeLinejoin">{L.strokeLinejoin || 'Sudut Garis (Join)'}</div><Seg wrap cls="flex-wrap" testId="stroke-linejoin-seg" o={[['round', 'Round'], ['miter', 'Miter'], ['bevel', 'Bevel']]} v={strokeCp.strokeLinejoin || 'round'} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeLinejoin: v } : o, 'p:linejoin')} tip="veStrokeLinejoin" /></div></div>{strokeCp.strokeLinejoin === 'miter' && <div className="flex items-center justify-between gap-2 pt-0.5"><span className="fig-sub-lbl" data-tip="veStrokeMiterlimit">{L.strokeMiterlimit || 'Batas Miter'}</span><div data-testid="stroke-miterlimit-input" className="w-24" onClick={e => { const el = e.currentTarget.querySelector('[role="textbox"]') as HTMLElement; el?.focus(); }}><XfField label="x" value={strokeCp.strokeMiterlimit ?? 4} min={1} step={1} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeMiterlimit: Math.max(1, Math.min(100, Number(v) || 4)) } : o, 'p:miterlimit')} tip="veStrokeMiterlimit" /></div></div>}<div><div className="fig-sub-lbl" data-tip="veStrokeDash">{L.dashPattern || 'Pola Garis Putus'}</div>{(() => {
          const detectedPreset = VE.detectDashPreset(strokeCp.strokeDasharray, strokeCp.strokeWidth || 1);
          const activePreset = dashCustomOpen ? 'custom' : (detectedPreset === 'dashdot' ? 'dash-dot' : detectedPreset);
          return <><Seg wrap cls="flex-wrap" testId="stroke-dash-preset" o={[['solid', L.dashPresetSolid || 'Solid'], ['dashed', L.dashPresetDashed || 'Dashed'], ['dotted', L.dashPresetDotted || 'Dotted'], ['dash-dot', L.dashPresetDashDot || 'Dash-dot'], ['custom', L.dashPresetCustom || 'Custom']]} v={activePreset} on={p => {
            if (p === 'solid') {
              setDashCustomOpen(false);
              commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeDasharray: null } : o, 'p:dash');
            } else if (p === 'dashed') {
              setDashCustomOpen(false);
              commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, ...VE.dashPresetValues('dashed', o.strokeWidth || 1) } : o, 'p:dash');
            } else if (p === 'dotted') {
              setDashCustomOpen(false);
              commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, ...VE.dashPresetValues('dotted', o.strokeWidth || 1) } : o, 'p:dash');
            } else if (p === 'dash-dot' || p === 'dashdot') {
              setDashCustomOpen(false);
              commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, ...VE.dashPresetValues('dashdot', o.strokeWidth || 1) } : o, 'p:dash');
            } else if (p === 'custom') {
              if (!strokeCp.strokeDasharray || !strokeCp.strokeDasharray.length) {
                commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeDasharray: [8, 4] } : o, 'p:dash');
              }
              setDashCustomOpen(true);
            }
          }} />{(dashCustomOpen || activePreset === 'custom') && <div className="space-y-2 pt-2"><div><div className="fig-sub-lbl mb-1">{L.dashPattern || 'Pola Garis Putus'}</div><div data-testid="stroke-dasharray-input" className="fld px-2.5 py-1.5" onClick={e => { const el = e.currentTarget.querySelector('[role="textbox"]') as HTMLElement; el?.focus(); }}><CustomTextBox value={VE.formatDasharray(strokeCp.strokeDasharray)} placeholder="8 4" ariaLabel={L.dashPattern || 'Pola Garis Putus'} filterRe={/[^0-9\s.,]/g} onCommit={txt => { const arr = VE.parseDasharray(txt); commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeDasharray: arr } : o, 'p:dash'); }} /></div></div><div data-testid="stroke-dashoffset-range"><Range tip="veStrokeDashOffset" l={L.dashOffset || 'Offset'} v={strokeCp.strokeDashoffset || 0} min={-100} max={100} step={1} on={v => commitObjs(o => strokeTargetIds.has(o.id) ? { ...o, strokeDashoffset: v } : o, 'p:dashoffset')} f={v => v + ' px'} /></div></div>}</>;
        })()}</div></div>}</div></div>}{(() => {
  /* Efek (Task 8): daftar efek cp; semua perubahan commit satu langkah
     (commitObjs). Pratinjau live saat slider digeser: meta.isLive ->
     livePaint(fn, {previewOnly: true}) — pola yang sama dengan ColorField
     fill/stroke; commit terjadi saat scrub dilepas (isLive false).
     Target = paintTargetIds (objek terseleksi tak terkunci, termasuk
     image — renderer me-render bayangan untuk path, teks, dan image).
     PELINDUNG HOOKS (fix wave F13): IIFE ini memanggil hooks
     (React.useState/useRef) sebagai pernyataan PERTAMA di dalam IIFE dan
     IIFE ini sendiri adalah anak JSX TANPA SYARAT — urutan hooks stabil
     hanya selama kedua syarat itu dipertahankan. JANGAN membuat IIFE ini
     bersyarat (mis. `primary && (() => {...})()`), JANGAN memindah
     hooks-nya ke setelah `return`/cabang, dan JANGAN menambahkan
     early-return sebelum hooks — ketiganya membuat React melempar
     "rendered more hooks than during the previous render" (atau
     sebaliknya) dan seluruh panel inspector crash. */
  const [fxMenuOpen, setFxMenuOpen] = React.useState(false);
  const fxAddBtnRef = React.useRef(null);
  const fxList = (cp && cp.effects) || [];
  const fxApply = (fn, key) => commitObjs(o => paintTargetIds.has(o.id) ? fn(o) : o, key);
  const fxLive = fn => { if (livePaint) livePaint(o => paintTargetIds.has(o.id) ? fn(o) : o, { previewOnly: true }); };
  const fxNum = (idx, patch) => (v, meta) => {
    const fn = o => updateEffect(o, idx, patch(v));
    if (meta && meta.isLive) fxLive(fn);
    else fxApply(fn, 'fx-param');
  };
  const fxAdd = type => {
    setFxMenuOpen(false);
    if (type === 'dropShadow') fxApply(o => addEffect(o, { type: 'dropShadow', dx: 12, dy: 12, blur: 4, color: '#000000', opacity: 0.8 }), 'fx:add');
    else if (type === 'layerBlur') fxApply(o => addEffect(o, { type: 'layerBlur', radius: 8 }), 'fx:add');
    else if (type === 'backgroundBlur') fxApply(o => addEffect(o, { type: 'backgroundBlur', radius: 12 }), 'fx:add');
  };
  return primary && <div className="fig-isec fade" data-testid="fx-section" data-tip="veFx">
  <div className="fig-isec-title"><span>{L.fxTitle}{fxList.length ? ' (' + fxList.length + ')' : ''}</span></div>
  <div className="flex flex-wrap gap-1.5 pb-1.5"><button type="button" ref={fxAddBtnRef} className="ved-pill text-[10px]" style={{ padding: '6px 12px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veFxAdd" data-testid="fx-add" aria-expanded={fxMenuOpen} onClick={() => setFxMenuOpen(o => !o)}>+ {L.fxAdd}</button></div>
  <Float anchor={fxAddBtnRef} open={fxMenuOpen} onClose={() => setFxMenuOpen(false)} w={220} cls="cp" preferUp={true}><div className="space-y-1"><button type="button" className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-shadow" data-tip="veFxAddShadow" onClick={() => fxAdd('dropShadow')}>{L.fxDropShadow}</button><button type="button" className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-layerblur" data-tip="veFxAddLayerBlur" onClick={() => fxAdd('layerBlur')}>{L.fxLayerBlur}</button><button type="button" className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-bgblur" data-tip="veFxAddBgBlur" onClick={() => fxAdd('backgroundBlur')}>{L.fxBackgroundBlur}</button></div></Float>
  {fxList.length === 0 ? (
    <div className="text-[11px] mut">{L.fxEmpty}</div>
  ) : (
    <div className="space-y-2">
      {fxList.map((fx, i) => (
        <div key={i} data-testid="fx-row" data-fx-idx={i} data-fx-type={fx.type} className="space-y-2" style={fx.disabled ? { opacity: 0.45 } : undefined}>
          <div className="flex items-center gap-1.5"><span className="text-[11px] font-medium flex-1 truncate">{fx.type === 'dropShadow' ? L.fxDropShadow : fx.type === 'layerBlur' ? L.fxLayerBlur : L.fxBackgroundBlur}</span><button type="button" className="fig-ibtn" data-tip="veFxToggle" data-testid="fx-toggle" aria-pressed={!fx.disabled} onClick={() => fxApply(o => toggleEffect(o, i), 'fx:toggle')}><Ico n={fx.disabled ? 'eyeOff' : 'eye'} size={14} /></button><button type="button" className="fig-ibtn" data-tip="veFxDelete" data-testid="fx-del" onClick={() => fxApply(o => removeEffect(o, i), 'fx:del')}>×</button></div>
          {fx.type === 'dropShadow' && (
            <div className="space-y-2">
              <div data-testid="fx-dx"><Range l={L.fxDx} v={fx.dx} min={-100} max={100} step={1} on={fxNum(i, v => ({ dx: v }))} tip="veFxDx" /></div>
              <div data-testid="fx-dy"><Range l={L.fxDy} v={fx.dy} min={-100} max={100} step={1} on={fxNum(i, v => ({ dy: v }))} tip="veFxDy" /></div>
              <div data-testid="fx-blur"><Range l={L.fxBlur} v={fx.blur} min={0} max={100} step={1} on={fxNum(i, v => ({ blur: v }))} tip="veFxBlur" /></div>
              <div className="flex items-center gap-2"><ColorField L={L} tip="veFxColor" value={fx.color} on={(v, meta) => { if (v === 'none') return; const fn = o => updateEffect(o, i, { color: v }); if (meta && meta.isLive) fxLive(fn); else fxApply(fn, 'fx-color'); }} /><span className="text-[11px] font-mono flex-1 truncate">{String(fx.color || '').toUpperCase()}</span></div>
              <div data-testid="fx-opacity"><Range l={L.fxOpacity} v={Math.round((fx.opacity ?? 1) * 100)} min={0} max={100} step={1} on={fxNum(i, v => ({ opacity: v / 100 }))} tip="veFxOpacity" f={v => v + '%' } /></div>
            </div>
          )}
          {(fx.type === 'layerBlur' || fx.type === 'backgroundBlur') && (
            <div data-testid="fx-radius"><Range l={L.fxRadius} v={fx.radius} min={0} max={100} step={1} on={fxNum(i, v => ({ radius: v }))} tip="veFxRadius" /></div>
          )}
        </div>
      ))}
    </div>
  )}
</div>; })()}{selectionColors.length > 0 && <div className="fig-isec fade" data-testid="selection-colors-section"><div className="fig-isec-title"><span>Selection colors ({selectionColors.length})</span><span className="text-[10px] mut font-normal">{L.riSelColorHint}</span></div><div className="flex flex-wrap gap-1.5 pb-1.5"><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="rcOpen" data-testid="rc-open-selcolors" onClick={() => { setFrOpen(false); setRcOpen(v => !v); }}><Ico n="palette" size={11} /> {L.rcOpenBtn}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} data-tip="frOpen" data-testid="fr-open-selcolors" onClick={() => { setRcOpen(false); setFrOpen(v => !v); }}><Ico n="refresh" size={11} /> {L.frOpenBtn}</button></div><div className="flex flex-wrap items-center gap-1.5 pb-1.5"><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameFill" data-testid="sel-same-fill" onClick={() => onSelectSame('fill')}><Ico n="drop" size={11} /> {L.edCtxSelSameFill}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameStroke" data-testid="sel-same-stroke" onClick={() => onSelectSame('stroke')}><Ico n="pencil" size={11} /> {L.edCtxSelSameStroke}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameType" data-testid="sel-same-type" onClick={() => onSelectSame('type')}><Ico n="shapes" size={11} /> {L.edCtxSelSameType}</button></div><div className="sel-col-list space-y-1.5">{selectionColors.slice(0, 40).map(sc => <div key={sc.stableKey} className="flex items-center gap-2 p-1.5 rounded-xl" style={{
          background: 'var(--sub)'
        }}><ColorField L={L} tip="veSelColor" value={sc.raw || sc.hex} on={(v, meta) => replaceSelectionColor(sc, v, meta)} /><span className="text-[11px] font-mono flex-1 truncate">{(sc.raw || sc.hex).toUpperCase()}</span><span className="fig-badge">{sc.kind === 'grad' ? L.riKindGrad : sc.kind === 'fill' ? 'Fill' : 'Stroke'} · {sc.ids.length}</span><button type="button" className="ved-pill text-[10px]" style={{
            padding: '2px 6px'
          }} data-tip="veSelPick" onClick={() => {
            setSel({
              objs: new Set(sc.ids),
              nodes: new Set()
            });
            say(sc.ids.length + ' objek ' + sc.hex.toUpperCase() + ' dipilih');
          }}>◎</button></div>)}</div></div>}<FindReplaceSection open={frOpen} onClose={() => setFrOpen(false)} committedDoc={committedDoc} selIds={new Set(selObjs.map(o => o.id))} onPreviewDoc={onFrPreviewDoc} onCommitPreview={onFrCommitPreview} say={say} L={L} onRecentColor={onRecentColor} /><RecolorSection open={rcOpen} onClose={() => setRcOpen(false)} committedDoc={committedDoc} selIds={new Set(selObjs.map(o => o.id))} onPreviewDoc={onRcPreviewDoc} onCommitPreview={onRcCommitPreview} say={say} L={L} /><div className="fig-isec" data-tip="veLayPanel"><div className="fig-isec-title"><span>Auto layout</span><div className="flex items-center gap-1"><button type="button" className="ved-pill text-[10px]" style={{
            padding: '2px 6px'
          }} data-tip="veFrameAuto" disabled={!selObjs.some(o => o.group)} onClick={() => convertFrameToAutoLayout()}>{L.riFrameToAuto}</button></div></div><div className="fig-sub-lbl" data-tip="veLayDir">Flow</div><div className="fig-flow-bar mb-2.5"><button type="button" className={lay.dir === 'row' ? 'on' : ''} data-tip="veLayRow" onClick={() => layUpdD({
          dir: 'row'
        })}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 12h16m-4-4 4 4-4 4" /></svg><span>{L.riRows}</span></button><button type="button" className={lay.dir === 'col' ? 'on' : ''} data-tip="veLayCol" onClick={() => layUpdD({
          dir: 'col'
        })}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 4v16m-4-4 4 4 4-4" /></svg><span>{L.riColumns}</span></button><button type="button" className={lay.dir === 'wrap' ? 'on' : ''} data-tip="veLayWrap" onClick={() => layUpdD({
          dir: 'wrap'
        })}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg><span>Grid</span></button></div>{lay.dir === 'wrap' && <div className="mb-2.5"><Range l={L.riColsPerRow} v={lay.cols} min={1} max={10} step={1} on={v => layUpdD({
          cols: v
        })} tip="veLayCols" /></div>}<div className="grid grid-cols-[auto_1fr] gap-2.5 items-start mb-2.5"><div><div className="fig-sub-lbl">Alignment</div><PinGrid L={L} value={[lay.ax, lay.ay]} on={p => layUpdD({
            ax: p[0],
            ay: p[1]
          })} tip="veLayAlign" label={L.riAlignLbl} /></div><div><div className="fig-sub-lbl">{L.riGap}</div><XfField label="][ " ariaLabel={L.riGap} value={lay.gap} min={0} on={v => layUpdD({
            gap: v
          })} tip="veLayGap" /></div></div><div className="flex items-center justify-between mb-1"><span className="fig-sub-lbl mb-0" data-tip="veLayPad">Padding</span><button type="button" className={'ved-pill text-[10px]' + (lay.split ? ' on' : '')} style={{
          padding: '1px 6px'
        }} data-tip="veLayPadMode" aria-pressed={lay.split} onClick={() => setLay(l => ({
          ...l,
          split: !l.split
        }))}>{lay.split ? L.riPad4Sides : L.riPadSym}</button></div>{lay.split ? <div className="grid grid-cols-2 gap-1.5 mb-2.5 fade"><XfField label="T" value={lay.pt} min={0} on={v => layPadD('pt', v)} tip="veLayPadT" /><XfField label="R" value={lay.pr} min={0} on={v => layPadD('pr', v)} tip="veLayPadR" /><XfField label="B" value={lay.pb} min={0} on={v => layPadD('pb', v)} tip="veLayPadB" /><XfField label="L" value={lay.pl} min={0} on={v => layPadD('pl', v)} tip="veLayPadL" /></div> : <div className="mb-2.5"><Range l={L.riPadAll} v={lay.pt === lay.pr && lay.pr === lay.pb && lay.pb === lay.pl ? lay.pt : Math.max(lay.pt, lay.pr, lay.pb, lay.pl)} min={0} max={120} step={1} on={v => layPadD('all', v)} tip="veLayPad" f={v => v + ' unit'} /></div>}<div className="space-y-2"><div className="flex items-center justify-between"><span className="text-[11px] mut" data-tip="veLayFrame">{L.riFrameBg}</span><Seg cls="eq" o={[['on', L.riFrameOn], ['off', L.riFrameOff]]} v={lay.frame ? 'on' : 'off'} on={v => layUpdD({
            frame: v === 'on'
          })} tip="veLayFrame" /></div>{lay.frame && <Range l={L.riFrameRadius} v={lay.radius} min={0} max={60} step={1} on={v => layUpdD({
          radius: v
        })} tip="veLayRadius" f={v => v ? v + ' unit' : L.riSharp} />}<div className="flex gap-2 pt-1.5"><button type="button" className={'btn ' + (applyPri ? 'pri' : 'sec') + ' fig-cta-btn flex-1'} data-tip="veLayApply" disabled={!layItems.length} onClick={applyLayoutD}>{L.riApply}{layItems.length ? ' (' + layItems.length + ')' : ''}</button><button type="button" className="btn sec fig-cta-btn" data-tip="veLayArtboard" disabled={!doc.objects.length} onClick={padToArtboard}>{L.riToArtboard}</button></div></div></div><div className="fig-isec" data-tip="veBg"><div className="fig-isec-title"><span>{L.riCanvas}</span></div><div className="space-y-2"><Seg o={[['transparent', L.riBgTransparent], ['solid', 'Solid']]} v={bg.mode} on={v => setBg(b => ({
          ...b,
          mode: v
        }))} tip="veBg" tips={{
          transparent: 'veBgTr',
          solid: 'veBgSolid'
        }} /><div className="flex items-center gap-2 fade" data-tip="veBgColor"><ColorField L={L} tip="veBgColor" value={bg.mode === 'transparent' ? 'none' : bg.color} on={v => setBg(b => v === 'none' ? {
            ...b,
            mode: 'transparent'
          } : {
            ...b,
            mode: 'solid',
            color: v
          })} /><ColorText L={L} value={bg.mode === 'transparent' ? 'none' : bg.color} on={v => setBg(b => v === 'none' ? {
            ...b,
            mode: 'transparent'
          } : {
            ...b,
            mode: 'solid',
            color: v
          })} /></div><div className="pt-1.5" data-tip="veAntialias"><div className="fig-sub-lbl">{(lang === 'en' ? TIPS_EN : TIPS).veAntialias.t}</div><Seg o={[['off', (lang === 'en' ? TIPS_EN : TIPS).veAntialiasOff.t], ['on', (lang === 'en' ? TIPS_EN : TIPS).veAntialiasOn.t]]} v={antialias ? 'on' : 'off'} on={v => setAntialias && setAntialias(v === 'on')} tip="veAntialias" tips={{
            off: 'veAntialiasOff',
            on: 'veAntialiasOn'
          }} /></div></div></div><div className="fig-isec" data-tip="veExpFmt"><div className="fig-isec-title"><span>{L.riExportImport}</span><button type="button" className="fig-ibtn" data-tip="veImport" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veImport.t} onClick={() => pickFiles('.svg,.ai,.ps,.eps,.pdf,.png,.jpg,.jpeg,.webp,.gif,.ttf,.otf,image/*,font/*,application/postscript,application/pdf', fs => importFiles(fs))}><Ico n="upload" size={14} /></button></div><div className="space-y-2"><div><div className="fig-sub-lbl">{L.riExportFmt}</div><div className="ved-pills">{[['svg', 'SVG'], ['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WEBP'], ['ai', 'AI'], ['eps', 'EPS']].map(([k, lb]) => <button key={k} type="button" data-tip={'veExp_' + k} className={'ved-pill' + (expFmt === k ? ' on' : '')} onClick={() => setExpFmt(k)}>{lb}</button>)}</div></div>{isRasterFmt(expFmt) && <div className="fade"><div className="fig-sub-lbl" data-tip="veExpScale">{L.riScaleRes}</div><Seg o={[[1, '1x'], [2, '2x (HD)'], [4, '4x (Ultra)']]} v={expScale} on={setExpScale} tip="veExpScale" tips={{
            1: 'veExpS_1',
            2: 'veExpS_2',
            4: 'veExpS_4'
          }} /></div>}<div><div className="fig-sub-lbl">{L.riExportArea}</div><Seg o={[['board', 'Artboard'], ['content', L.riAreaAll], ['sel', L.riAreaSel]]} v={exportArea} on={setExportArea} tip="veArea" tips={{
            board: 'veAreaBoard',
            content: 'veAreaAll',
            sel: 'veAreaSel'
          }} /></div><div className="flex gap-2 pt-1"><button type="button" className="btn sec fig-cta-btn flex-1" data-tip="veCopy" onClick={exportSvg}><Ico n="copy" size={14} />{L.riCopy} {expFmt.toUpperCase()}</button><button type="button" className={'btn ' + (applyPri ? 'sec' : 'pri') + ' fig-cta-btn flex-1'} data-tip="veDownload" onClick={downloadSvg}><Ico n="download" size={14} />{L.riDownload} .{expFmt.toUpperCase()}</button></div>{onOpenCodeInspector && <button type="button" className="btn sec fig-cta-btn w-full mt-1.5 text-xs flex items-center justify-between" data-tip="veSvgCodeInspector" data-testid="inspector-code-btn" onClick={() => onOpenCodeInspector()}><span className="flex items-center gap-1.5"><Ico n="code" size={13} /><span>{L.riInspectSvgCode || (lang === 'en' ? 'Inspect SVG Code' : 'Inspeksi Kode SVG')}</span></span><span className="text-[10px] font-mono mut px-1.5 py-0.5 rounded bg-[var(--sub)]">Ctrl+Alt+C</span></button>}{onExportBackup && <button type="button" className="btn sec fig-cta-btn w-full mt-1.5 text-xs" onClick={() => onExportBackup()}><Ico n="database" size={13} /><span>{L.riExportBackup}</span></button>}</div></div></div><OverlayScrollbar scrollRef={rScrollRef} testIdPrefix="right-sidebar-scrollbar" /></div></aside>);
};

export { EditorRightInspector };
export default EditorRightInspector;
