/**
 * @file src/components/editor/EditorLeftSidebar.jsx
 * @description Komponen sidebar kiri: header proyek, pohon layer, & panel alat kontekstual (EditorLeftSidebar)
 */
import React from 'react';
import { LOGO_INNER } from '../../constants/brandAndIcons.jsx';
import { SAVE_STATUS_LABELS } from '../../constants/workspaceConstants.jsx';
import { Ico, Vi } from '../ui/IconGlyphs.jsx';
import { ColorField } from '../ui/ColorPickerField.jsx';
import { Range } from '../ui/RangeField.jsx';
import { VE } from '../../engine/vectorEngine.jsx';
import { Seg } from '../ui/SegmentedControl.jsx';
import { Select } from '../ui/SelectDropdown.jsx';
import { XfField } from '../ui/TransformField.jsx';
import { clampN } from '../../utils/colorMath.jsx';
import { LayerTreeViewport } from './LayerTreeViewport.jsx';
import { CustomTextBox } from '../ui/CustomTextBox.jsx';
import { LayerSvgPreview } from './CanvasVectorObjects.jsx';
import { vinfo } from '../../renderer/pathWindingAndBatching.jsx';

const FLAT_ID_MAP_CACHE = new WeakMap();
const getFlatIdMap = flatIds => {
  let m = FLAT_ID_MAP_CACHE.get(flatIds);
  if (!m) {
    m = new Map();
    for (let i = 0, L = flatIds.length; i < L; i++) m.set(flatIds[i], i);
    FLAT_ID_MAP_CACHE.set(flatIds, m);
  }
  return m;
};
const EditorLeftSidebar = ({
  onBackToWorkspace,
  docRef,
  zoomRef,
  panRef,
  saveStatus,
  onRetrySave,
  onRenameProject,
  projectName,
  doc,
  nTotal,
  sel,
  selNodes,
  createFrameSel,
  groupSel,
  clipFrames,
  setClipFrames,
  groupSameColor,
  setGroupSameColor,
  layerScrollRef,
  layerTreeDomRef,
  layerViewportCtrlRef,
  tool,
  pen,
  penSty,
  setPenSty,
  penRef,
  commitObjs,
  finishPen,
  selObjs,
  autoSel,
  autoAll,
  ahOpt,
  setAhOpt,
  primary,
  alOpt,
  setAlOpt,
  applyNodeAngleAlign,
  selHandles,
  applyStraight,
  applyAutoRefine,
  applyPruneNodes,
  pruneOpt,
  setPruneOpt,
  sOpt,
  setSOpt,
  inspection,
  inspectOverlay,
  setInspectOverlay,
  showHeatmap,
  setShowHeatmap,
  anomFilter,
  setAnomFilter,
  inspectOpts,
  setInspectOpts,
  cleanAllAnomalies,
  visibleAnoms,
  selAnomId,
  selectAnomaly,
  fixAnomaly,
  vcSimp,
  vcSimpRetain,
  openVcSimplify,
  triggerAutoSimplifyLevel,
  openVcMoreOptions,
  updateVcSimplify,
  cancelVcSimplify,
  confirmVcSimplify,
  virtualLayerRows,
  dragLayerIds,
  moveObjsToGroup,
  setDragLayerIds,
  setOverFrameId,
  layerAnchor,
  layerFlatIds,
  setSel,
  setLayerIns,
  renameVal,
  setRenameVal,
  renameSkip,
  setRenamingId,
  renamingId,
  layerIns,
  openLayerCtx,
  overFrameId,
  reorderLayerTo,
  layerClickSkipExpandRef,
  commitRename,
  say,
  dropFrameId,
  toggleCollapseGrp,
  ungroupIds,
  rzProps
}) => <aside className="fig-left-sidebar"><div className="fig-doc-hdr"><div className="ws-ed-proj-bar min-w-0 flex-1"><div className="ws-ed-top-row">{onBackToWorkspace ? <button type="button" className="ws-back-btn" title="Kembali ke Workspace (Simpan Otomatis)" onClick={() => onBackToWorkspace(docRef.current, {
          zoom: zoomRef.current,
          pan: {
            ...panRef.current
          }
        })}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg><span>Workspace</span></button> : <svg role="img" aria-label="Geovanta" viewBox="150 180 1750 380" style={{
          height: 20,
          width: 'auto',
          display: 'block',
          color: 'var(--acc)'
        }} dangerouslySetInnerHTML={{
          __html: LOGO_INNER
        }} />}<span className={'ws-save-pill st-' + (saveStatus || 'saved')} title={saveStatus === 'error' ? 'Klik untuk mencoba menyimpan kembali' : 'Status penyimpanan proyek lokal (IndexedDB)'} onClick={() => {
          if (saveStatus === 'error' && onRetrySave) onRetrySave();
        }}><span className="ws-save-dot" /><span>{SAVE_STATUS_LABELS[saveStatus] || 'Tersimpan'}</span></span></div><div className="flex items-center justify-between gap-1.5 min-w-0"><button type="button" className="ws-ed-proj-name-btn" title="Klik untuk mengganti nama proyek" onClick={() => onRenameProject && onRenameProject()}><span className="truncate">{projectName || 'Untitled Project'}</span><Ico n="pencil" size={11} /></button></div><div className="text-[11px] mut truncate" data-tip="veStats">{doc.objects.length} objek · {nTotal} node · {sel.objs.size} dipilih{selNodes.size ? ' · ' + selNodes.size + 'n' : ''}</div></div></div><div className="fig-sec-hdr flex-wrap gap-1.5"><span className="whitespace-nowrap" data-tip="veLayers">Layers ({doc.objects.length})</span><div className="flex flex-wrap items-center gap-1"><button type="button" className="ved-pill text-[10.5px]" style={{
        padding: '3px 7px'
      }} data-tip="veFrameTool" onClick={createFrameSel}>+ Frame</button><button type="button" className="ved-pill text-[10.5px]" style={{
        padding: '3px 7px'
      }} data-tip="veCtxGroup" onClick={() => groupSel(true)}>+ Grup</button><button type="button" className={'ved-pill text-[10.5px]' + (clipFrames ? ' on' : '')} style={{
        padding: '3px 7px'
      }} aria-pressed={clipFrames} data-tip="veClipFrames" onClick={() => setClipFrames(v => !v)}>Clip Frame</button><button type="button" className={'ved-pill text-[10.5px]' + (groupSameColor ? ' on' : '')} style={{
        padding: '3px 7px'
      }} aria-pressed={groupSameColor} data-tip="veLayBucket" onClick={() => setGroupSameColor(v => !v)}>Gabung Warna</button></div></div><div ref={layerScrollRef} className="fig-layers-scroll space-y-2" onScroll={e => {
    const ctrl = layerViewportCtrlRef.current;
    if (!ctrl) return;
    const st = e.currentTarget.scrollTop;
    if (ctrl.syncScrollFromContainer) {
      ctrl.syncScrollFromContainer(st);
    } else {
      const treeEl = layerTreeDomRef.current;
      ctrl.syncScroll(Math.max(0, st - (treeEl ? treeEl.offsetTop : 0)));
    }
  }}>{tool === 'addnode' && <div className="ved-panel fade"><div className="text-xs mut mb-1.5 font-medium">Tambah Node</div><div className="text-[11px] mut leading-relaxed">Arahkan kursor ke garis objek mana pun, lalu klik untuk menambah node. Seret setelah klik untuk langsung memindahkannya.</div></div>}{tool === 'addhandle' && <div className="ved-panel fade"><div className="text-xs mut mb-1.5 font-medium">Tambah Handle Bézier</div><div className="text-[11px] mut leading-relaxed">Arahkan kursor ke sebuah node pada objek mana pun, lalu klik untuk menambahkan handle Bézier.</div></div>}{tool === 'pen' && <div className="ved-panel fade"><div className="text-xs mut mb-2 font-medium">Pen Tool{pen ? ' · menggambar' : ''}</div><div className="text-[11px] mut leading-relaxed"><b>Klik</b> = node sudut. <b>Seret</b> = kurva halus. <b>Alt</b> = patahkan sudut. <b>Enter/Esc</b> = selesai.</div><div className="space-y-2.5 mt-2.5"><div className="flex flex-wrap gap-1.5"><button type="button" data-tip="vePenNoFill" className={'ved-pill' + (penSty.fill === 'none' ? ' on' : '')} onClick={() => {
            setPenSty(s => ({
              ...s,
              fill: 'none'
            }));
            if (penRef.current) commitObjs(o => o.id === penRef.current.oid ? {
              ...o,
              fill: 'none'
            } : o, 'pen-sty');
          }}>Tanpa isi</button><button type="button" data-tip="vePenFill" className={'ved-pill' + (penSty.fill !== 'none' ? ' on' : '')} onClick={() => {
            const nf = penSty.fill === 'none' ? '#0d99ff' : penSty.fill;
            setPenSty(s => ({
              ...s,
              fill: nf
            }));
            if (penRef.current) commitObjs(o => o.id === penRef.current.oid ? {
              ...o,
              fill: nf
            } : o, 'pen-sty');
          }}>Dengan isi</button></div><div><div className="text-[11px] mut mb-1">Fill</div><ColorField tip="veFill" value={penSty.fill} on={v => {
            setPenSty(s => ({
              ...s,
              fill: v
            }));
            if (penRef.current) commitObjs(o => o.id === penRef.current.oid ? {
              ...o,
              fill: v
            } : o, 'pen-sty');
          }} /></div><div><div className="text-[11px] mut mb-1">Stroke</div><ColorField tip="veStroke" value={penSty.stroke} on={v => {
            setPenSty(s => ({
              ...s,
              stroke: v
            }));
            if (penRef.current) commitObjs(o => o.id === penRef.current.oid ? {
              ...o,
              stroke: v
            } : o, 'pen-sty');
          }} /></div><Range l="Stroke width" v={penSty.sw} min={0} max={20} step={0.5} on={v => {
          setPenSty(s => ({
            ...s,
            sw: v
          }));
          if (penRef.current) commitObjs(o => o.id === penRef.current.oid ? {
            ...o,
            strokeWidth: v
          } : o, 'pen-sty');
        }} tip="veStrokeW" /></div>{pen && <button type="button" className="btn sec text-[11px] mt-2.5 w-full" style={{
        padding: '6px 8px'
      }} onClick={finishPen} data-tip="vePenFinish">Selesai (Enter)</button>}</div>}{tool === 'autohandle' && <div className="ved-panel fade"><div className="text-xs mut mb-2 font-medium">Auto Handle Bézier</div><div className="space-y-2.5"><button type="button" className="btn pri w-full text-[11px]" style={{
          padding: '7px 8px'
        }} disabled={!selObjs.length} data-tip="veAhAddSel" onClick={() => autoSel(false, true)}>{selNodes.size ? 'Tambah Handle ke ' + selNodes.size + ' Node' : 'Tambah Handle ke Terpilih'}</button><button type="button" className="btn sec w-full text-[11px]" style={{
          padding: '7px 8px'
        }} disabled={!doc.objects.length} data-tip="veAhAddAll" onClick={() => autoAll(false, true)}>Tambah Handle ke Semua Objek</button><div className="flex gap-1.5"><button type="button" className="btn sec flex-1 text-[10.5px]" style={{
            padding: '6px'
          }} disabled={!selObjs.length} data-tip="veAhDelSel" onClick={() => autoSel(true)}>Hapus (Terpilih)</button><button type="button" className="btn sec flex-1 text-[10.5px]" style={{
            padding: '6px'
          }} disabled={!doc.objects.length} data-tip="veAhDelAll" onClick={() => autoAll(true)}>Hapus (Semua)</button></div><Range l="Ketegangan (\u03C4)" v={ahOpt.tau} min={0} max={0.5} step={0.01} on={v => setAhOpt(o => ({
          ...o,
          tau: v
        }))} tip="veAhTension" f={v => v < 0.005 ? '0 (tajam)' : v.toFixed(2)} /><Range l="Lewati sudut lancip" v={ahOpt.minAng} min={0} max={150} step={5} on={v => setAhOpt(o => ({
          ...o,
          minAng: v
        }))} tip="veAhAngle" f={v => v ? '< ' + v + '°' : 'Mati'} /><div className="flex gap-1.5"><button type="button" data-tip="veAhScopeSub" className={'ved-pill' + (ahOpt.scope === 'sub' ? ' on' : '')} onClick={() => setAhOpt(o => ({
            ...o,
            scope: 'sub'
          }))}>Subpath</button><button type="button" data-tip="veAhScopeObj" className={'ved-pill' + (ahOpt.scope === 'obj' ? ' on' : '')} onClick={() => setAhOpt(o => ({
            ...o,
            scope: 'obj'
          }))}>Seluruh objek</button></div></div></div>}{tool === 'straighten' && <div className="ved-panel ved-straight-panel fade"><div className="text-xs mut mb-2 font-medium whitespace-nowrap">Sejajarkan Node & Pelurusan</div><div className="space-y-3"><div><div className="ved-straight-row text-[11px] mut mb-1"><span>Mode sudut</span>{selNodes.size >= 2 && primary && <span className="font-mono text-[10px]" data-tip="veCurAngle" style={{
              color: 'var(--acc)'
            }}>{VE.measureSelectedNodesAngle(primary, selNodes)}°</span>}</div><Seg v={alOpt.mode} on={m => setAlOpt(o => ({
            ...o,
            mode: m
          }))} o={[['auto', 'Auto'], ['custom', 'Derajat'], ['perp', '⊥ 90°'], ['parallel', '∥']]} tip="veAlMode" tips={{
            auto: 'veAlAuto',
            custom: 'veAlCustom',
            perp: 'veAlPerp',
            parallel: 'veAlPar'
          }} /></div>{alOpt.mode === 'custom' && <div className="space-y-2 fade"><Range l="Sudut garis" v={alOpt.deg} min={-180} max={180} step={0.5} on={v => {
            setAlOpt(o => ({
              ...o,
              deg: v
            }));
            if (selNodes.size >= 2) applyNodeAngleAlign(v, 'custom');
          }} f={v => v + '°'} tip="veAlDeg" /><div className="ved-pills">{[0, 15, 30, 45, 60, 90, -30, -45, -60, -90].map(d => <button key={d} type="button" data-tip="veAlPreset" className={'ved-pill' + (alOpt.deg === d ? ' on' : '')} onClick={() => {
              setAlOpt(o => ({
                ...o,
                mode: 'custom',
                deg: d
              }));
              if (selNodes.size >= 2) applyNodeAngleAlign(d, 'custom');
            }}>{d}°</button>)}</div></div>}<div><div className="text-[11px] mut mb-1 whitespace-nowrap" data-tip="veAlAnchor">Titik patokan</div><Seg v={alOpt.anchor} on={a => setAlOpt(o => ({
            ...o,
            anchor: a
          }))} o={[['center', 'Tengah'], ['first', 'Awal'], ['last', 'Akhir']]} tip="veAlAnchor" tips={{
            center: 'veAlAncCenter',
            first: 'veAlAncFirst',
            last: 'veAlAncLast'
          }} /></div><div><div className="text-[11px] mut mb-1 whitespace-nowrap" data-tip="veAlSlide">Cara geser ujung</div><Seg v={alOpt.slide ? 'slide' : 'ortho'} on={k => setAlOpt(o => ({
            ...o,
            slide: k === 'slide'
          }))} o={[['slide', 'Rel Sisi'], ['ortho', 'Tegak Lurus']]} tip="veAlSlide" tips={{
            slide: 'veAlSlideOn',
            ortho: 'veAlSlideOff'
          }} /></div>{selNodes.size >= 3 && <div><div className="text-[11px] mut mb-1 whitespace-nowrap" data-tip="veAlCollapse">Node perantara</div><Seg v={alOpt.collapse ? 'on' : 'off'} on={k => setAlOpt(o => ({
            ...o,
            collapse: k === 'on'
          }))} o={[['off', 'Simpan'], ['on', 'Lebur']]} tip="veAlCollapse" tips={{
            off: 'veAlKeep',
            on: 'veAlMerge'
          }} /></div>}<div className="ved-straight-acts"><button type="button" className="btn pri text-xs" data-tip="veApplyStraight" disabled={!selObjs.length} onClick={() => selNodes.size >= 2 || selHandles.size ? applyNodeAngleAlign() : applyStraight()}>{selHandles.size ? 'Luruskan ' + selHandles.size + ' handle' : selNodes.size >= 2 ? 'Sejajarkan ' + selNodes.size + ' node' : 'Luruskan seluruh path'}</button><button type="button" className="btn sec text-xs" data-tip="veAutoRefine" disabled={!selObjs.length} onClick={applyAutoRefine}>Auto Rapikan: luruskan + smooth</button><button type="button" className="btn sec text-xs" data-tip="vePruneNodes" disabled={!selObjs.length} onClick={applyPruneNodes}>Hapus node non-sudut</button></div><Range l="Toleransi hapus node" v={pruneOpt.tol} min={0.2} max={3} step={0.05} on={v => setPruneOpt(o => ({
          ...o,
          tol: v
        }))} tip="vePruneTol" f={v => v.toFixed(2)} /><Range l="Sudut minimal" v={pruneOpt.cornerDeg} min={12} max={70} step={1} on={v => setPruneOpt(o => ({
          ...o,
          cornerDeg: v
        }))} tip="vePruneAng" f={v => v + '°'} /><Range l="Ambang penyimpangan" v={sOpt.maxDev} min={0.2} max={5} step={0.1} on={v => setSOpt(o => ({
          ...o,
          maxDev: v
        }))} tip="veMaxDev" f={v => v.toFixed(1)} /><Range l="Toleransi arah" v={sOpt.angTol} min={0} max={15} step={0.5} on={v => setSOpt(o => ({
          ...o,
          angTol: v
        }))} tip="veAngTol" f={v => v + '°'} /></div></div>}{tool === 'inspect' && <div className="ved-panel fade"><div className="flex items-center justify-between mb-2"><div className="text-xs mut font-medium">Inspeksi Geometri</div><span className={'ved-anom-badge ' + (inspection.summary.total ? 'corner' : 'sec')} data-tip="veAnomBadge">{inspection.summary.total} Anomali</span></div><div className="space-y-2.5"><div className="flex gap-1.5"><button type="button" className={'btn flex-1 text-[11px] ' + (inspectOverlay ? 'pri' : 'sec')} data-tip="veInspectOverlay" onClick={() => setInspectOverlay(o => !o)}>{inspectOverlay ? 'Indikator On' : 'Indikator Off'}</button><button type="button" className={'btn flex-1 text-[11px] ' + (showHeatmap ? 'pri' : 'sec')} data-tip="veInspectHeatmap" onClick={() => setShowHeatmap(h => !h)}>{showHeatmap ? 'Heatmap On' : 'Heatmap Off'}</button></div><Select tip="veAnomFilter" value={anomFilter} on={setAnomFilter} options={[['all', 'Semua (' + inspection.summary.total + ')'], ['corner', 'Sudut (' + inspection.summary.cornerClusterCount + ')'], ['collinear', 'Kolinier (' + inspection.summary.collinearCount + ')'], ['wobbly', 'Meleyot (' + inspection.summary.wobblyCount + ')'], ['faceted', 'Faset (' + inspection.summary.facetedCount + ')'], ['arc', 'Arc (' + inspection.summary.denseArcCount + ')']]} /><Range l="Radius sudut (\u03B5)" v={inspectOpts.cornerEps} min={1} max={10} step={0.5} on={v => setInspectOpts(o => ({
          ...o,
          cornerEps: v
        }))} tip="veCornerEps" f={v => v.toFixed(1)} /><Range l="Toleransi kolinier" v={inspectOpts.collinearTol} min={0.05} max={0.8} step={0.05} on={v => setInspectOpts(o => ({
          ...o,
          collinearTol: v
        }))} tip="veCollinearTol" f={v => v.toFixed(2)} /><button type="button" className="btn pri w-full text-xs" data-tip="veCleanAll" disabled={inspection.summary.total === 0} onClick={cleanAllAnomalies}>Bersihkan Semua ({inspection.summary.total})</button><div className="space-y-1.5" style={{
          maxHeight: 150,
          overflowY: 'auto'
        }}>{visibleAnoms().map(item => <div key={item.id} className={'ved-anom-card' + (selAnomId === item.id ? ' on' : '')}><div className="flex items-center justify-between gap-1 mb-1"><span className="text-[10.5px] font-semibold">{item.message}</span><span className="text-[10px] mut truncate max-w-[70px]">{item.objName}</span></div><div className="flex gap-1"><button type="button" className="btn sec text-[10px] flex-1 py-1" data-tip="veAnomFocus" onClick={() => selectAnomaly(item)}>Fokus</button><button type="button" className="btn pri text-[10px] flex-1 py-1" data-tip="veAnomFix" onClick={() => fixAnomaly(item)}>Perbaiki</button></div></div>)}</div></div></div>}{tool === 'simplify' && (() => {
      const s = vcSimp || {
        mode: 'slider',
        level: 50,
        tolerance: 1.0,
        angleThreshold: 150,
        straightLines: false,
        showOriginal: false,
        retain: vcSimpRetain,
        preview: true,
        before: nTotal,
        after: nTotal
      };
      return <div className="ved-panel fade"><div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold">Simplify</div><span className="vc-simp-badge" title="Anchor Points (Before \u2192 After)">{s.preview ? `${s.before} → ${s.after} pts` : `${s.before} pts`}</span></div><div className="space-y-2.5"><div className="flex items-center gap-1.5"><button type="button" className="btn sec text-[11px] flex-1 flex items-center justify-center gap-1.5" data-tip="veSimplifyAuto" onClick={() => {
              if (!vcSimp) openVcSimplify('slider');else triggerAutoSimplifyLevel();
            }}><Ico n="wand" size={13} /><span>Auto-Simplify</span></button><button type="button" className="btn sec text-[11px] px-2.5" data-tip="veSimplifyMore" title="More Options" onClick={() => openVcMoreOptions()}>•••</button></div><Range l="Curve Precision (Level)" v={s.level} min={0} max={100} step={1} on={v => {
            if (!vcSimp) openVcSimplify('slider');
            updateVcSimplify({
              level: v
            });
          }} tip="veSimplifyLevel" f={v => `${v}% (${VE.rd(VE.simplifyLevelTolerance(v))} pt)`} /><div><div className="fig-sub-lbl">Tolerance (pt)</div><XfField label="Tol" value={s.tolerance} min={0.001} step={0.1} on={v => {
              if (!vcSimp) openVcSimplify('dialog');
              updateVcSimplify({
                mode: 'dialog',
                tolerance: clampN(v, 0.001, 10000)
              });
            }} tip="veSimplifyTol" /></div><Range l="Angle Threshold" v={s.angleThreshold} min={0} max={180} step={1} on={v => {
            if (!vcSimp) openVcSimplify();
            updateVcSimplify({
              angleThreshold: v
            });
          }} tip="veSimplifyAngle" f={v => `${Math.round(v)}°`} /><div className="space-y-1.5 pt-0.5"><button type="button" role="checkbox" aria-checked={s.straightLines} className={'c-chk' + (s.straightLines ? ' on' : '')} data-tip="veSimplifyStraight" onClick={() => {
              if (!vcSimp) openVcSimplify();
              updateVcSimplify({
                straightLines: !s.straightLines
              });
            }}><span className="c-chk-box">{s.straightLines && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>Convert to Straight Lines</span></button><button type="button" role="checkbox" aria-checked={s.showOriginal} className={'c-chk' + (s.showOriginal ? ' on' : '')} data-tip="veSimplifyOrig" onClick={() => {
              if (!vcSimp) openVcSimplify();
              updateVcSimplify({
                showOriginal: !s.showOriginal
              });
            }}><span className="c-chk-box">{s.showOriginal && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>Show Original Path</span></button><button type="button" role="checkbox" aria-checked={s.preview} className={'c-chk' + (s.preview ? ' on' : '')} onClick={() => {
              if (!vcSimp) openVcSimplify();
              updateVcSimplify({
                preview: !s.preview
              });
            }}><span className="c-chk-box">{s.preview && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span><span>Preview</span></button></div><div className="flex gap-1.5 pt-1">{vcSimp ? <><button type="button" className="btn sec flex-1 text-xs" onClick={cancelVcSimplify}>Cancel</button><button type="button" className="btn pri flex-1 text-xs" data-tip="veApplySimplify" onClick={confirmVcSimplify}>OK</button></> : <button type="button" className="btn pri w-full text-xs" data-tip="veApplySimplify" onClick={() => openVcSimplify()}>Buka Simplify</button>}</div></div></div>;
    })()}<LayerTreeViewport virtualLayerRows={virtualLayerRows} hasObjects={doc.objects.length > 0} layerTreeDomRef={layerTreeDomRef} layerViewportCtrlRef={layerViewportCtrlRef} dragLayerIds={dragLayerIds} moveObjsToGroup={moveObjsToGroup} setDragLayerIds={setDragLayerIds} setOverFrameId={setOverFrameId} renderRowFn={row => {
      const pick = (ids, e, allOn) => {
        if (e.shiftKey && layerAnchor.current) {
          const idxMap = getFlatIdMap(layerFlatIds);
          const ai = idxMap.get(layerAnchor.current);
          if (ai !== undefined) {
            let lo = ai,
              hi = ai,
              found = false;
            for (let i = 0, L = ids.length; i < L; i++) {
              const bi = idxMap.get(ids[i]);
              if (bi !== undefined) {
                if (bi < lo) lo = bi;
                if (bi > hi) hi = bi;
                found = true;
              }
            }
            if (found) {
              const objs = new Set(e.ctrlKey || e.metaKey ? sel.objs : []);
              for (let k = lo; k <= hi; k++) objs.add(layerFlatIds[k]);
              setSel({
                objs,
                nodes: new Set()
              });
              return;
            }
          }
        }
        const multi = e.ctrlKey || e.metaKey || e.shiftKey;
        const objs = multi ? new Set(sel.objs) : new Set();
        for (let i = 0, L = ids.length; i < L; i++) {
          const id = ids[i];
          if (multi && allOn) objs.delete(id);else objs.add(id);
        }
        layerAnchor.current = ids[0] || null;
        setSel({
          objs,
          nodes: new Set()
        });
      };
      const dStart = (e, ids) => {
        e.stopPropagation();
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', ids.join(','));
        } catch (x) {}
        setDragLayerIds(ids);
      };
      const dEnd = () => {
        setDragLayerIds(null);
        setOverFrameId(null);
        setLayerIns(null);
      };
      const renInput = (rid, commitFn) => <div className="fig-ren-box" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}><CustomTextBox autoFocus={true} value={renameVal} ariaLabel="Nama layer" onChange={v => setRenameVal(v)} onCommit={v => commitFn(v)} onCancel={() => {
          renameSkip.current = true;
          setRenamingId(null);
        }} /></div>;
      const objRow = (o, child, nodeCnt) => <div key={o.id} data-layer-id={o.id} draggable={renamingId !== o.id} onDragStart={e => dStart(e, [o.id])} onDragEnd={dEnd} style={child ? {
        marginLeft: 14,
        paddingLeft: 10
      } : undefined} className={'fig-row' + (child ? ' child' : ' root-item') + (sel.objs.has(o.id) ? ' on' : '') + (o.hidden ? ' dim' : '') + (layerIns && layerIns.id === o.id ? layerIns.pos === 'top' ? ' ins-top' : ' ins-bot' : '')} data-tip="veLayer" onContextMenu={e => openLayerCtx(e, o)} onDragOver={e => {
        if (!dragLayerIds || dragLayerIds.includes(o.id)) return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect(),
          pos = e.clientY - r.top < r.height / 2 ? 'top' : 'bot';
        if (!layerIns || layerIns.id !== o.id || layerIns.pos !== pos) setLayerIns({
          id: o.id,
          pos
        });
        if (overFrameId) setOverFrameId(null);
      }} onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget) && layerIns && layerIns.id === o.id) setLayerIns(null);
      }} onDrop={e => {
        if (!dragLayerIds) return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        reorderLayerTo(dragLayerIds, o, e.clientY - r.top < r.height / 2 ? 'top' : 'bot');
        setDragLayerIds(null);
        setOverFrameId(null);
        setLayerIns(null);
      }} onClick={e => {
        if (e.detail > 1 || renamingId === o.id) return;
        layerClickSkipExpandRef.current = true;
        pick([o.id], e, sel.objs.has(o.id));
      }} onDoubleClick={e => {
        e.preventDefault();
        e.stopPropagation();
        layerClickSkipExpandRef.current = true;
        renameSkip.current = false;
        setRenamingId(o.id);
        setRenameVal(o.name);
      }}><span className="fig-lay-ico" title={o.text ? 'Objek Teks SVG' : o.img ? 'Objek Gambar' : 'Pratinjau Bentuk SVG'}><LayerSvgPreview o={o} /></span><span className="ved-swatch" style={o.img ? {
          width: 15,
          height: 15,
          backgroundImage: 'url(' + o.img.href + ')',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {
          width: 15,
          height: 15,
          background: o.fill === 'none' ? 'transparent' : o.fill
        }} />{renamingId === o.id ? renInput(o.id, v => commitRename(o.id, false, v)) : <span className="truncate flex-1" onDoubleClick={e => {
          e.preventDefault();
          e.stopPropagation();
          layerClickSkipExpandRef.current = true;
          renameSkip.current = false;
          setRenamingId(o.id);
          setRenameVal(o.name);
        }}>{o.name}</span>}<button type="button" className={'fig-eject' + (o.locked ? ' act' : '')} data-tip={o.locked ? 'layUnlock' : 'layLock'} onClick={e => {
          e.stopPropagation();
          commitObjs(q => q.id === o.id ? {
            ...q,
            locked: !q.locked
          } : q);
        }}><Vi s={14} d={o.locked ? 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4' : 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 7.8-1.2'} /></button><button type="button" className={'fig-eject' + (o.hidden ? ' act' : '')} data-tip={o.hidden ? 'layShow' : 'layHide'} onClick={e => {
          e.stopPropagation();
          commitObjs(q => q.id === o.id ? {
            ...q,
            hidden: !q.hidden
          } : q);
        }}><Ico n={o.hidden ? 'eyeOff' : 'eye'} size={14} /></button>{child && <button type="button" className="fig-eject" data-tip="layEject" onClick={e => {
          e.stopPropagation();
          moveObjsToGroup([o.id], null);
        }}><Vi s={14} d="M7 17L17 7M9 7h8v8" /></button>}<span className="fig-badge">{o.text ? (o.text.content || '').length + 'c' : (nodeCnt != null ? nodeCnt : vinfo(o).n) + 'n'}</span></div>;
      if (row.kind === 'single') return objRow(row.obj, false, row.nodeCount);
      if (row.kind === 'child') return objRow(row.obj, true, row.nodeCount);
      if (row.kind === 'group-empty') {
        return <div key={row.key} className="fig-row child text-[10.5px] mut italic" style={{
          marginLeft: 14,
          paddingLeft: 10
        }}>Frame kosong</div>;
      }
      if (row.kind === 'bucket') {
        const b = row.bucket;
        const bucketSel = b.ids.every(id => sel.objs.has(id));
        const label = b.hex === 'IMAGE' ? 'Gambar' : b.hex === 'NONE' ? 'Tanpa Fill' : b.hex.toUpperCase();
        return <div key={row.key} data-layer-id={b.ids[0]} draggable={true} onDragStart={e => dStart(e, b.ids)} onDragEnd={dEnd} style={{
          marginLeft: 14,
          paddingLeft: 10
        }} className={'fig-row child' + (bucketSel ? ' on' : '')} onClick={e => {
          layerClickSkipExpandRef.current = true;
          pick(b.ids, e, bucketSel);
          say(b.ids.length + ' objek (' + label + ') dipilih');
        }}><span className="ved-swatch" style={{
            width: 15,
            height: 15,
            background: b.fill === 'none' ? 'transparent' : b.fill
          }} /><span className="truncate flex-1">{'Warna ' + label}</span><button type="button" className="fig-eject" data-tip="layEjectBucket" onClick={e => {
            e.stopPropagation();
            moveObjsToGroup(b.ids, null);
          }}><Vi s={14} d="M7 17L17 7M9 7h8v8" /></button><span className="fig-badge">{b.ids.length}</span></div>;
      }
      const {
        item,
        allIds,
        gKey,
        isCollapsed,
        allHidden,
        allLocked
      } = row;
      const isAllSel = allIds.length > 0 && allIds.every(id => sel.objs.has(id));
      const isSomeSel = !isAllSel && allIds.some(id => sel.objs.has(id));
      return <div key={row.key} data-layer-id={item.id} className={'fig-row frame-hdr' + (isAllSel || isCollapsed && isSomeSel ? ' on' : '') + (overFrameId === item.id || dropFrameId === item.id ? ' drop-on' : '')} onDragOver={e => {
        if (!dragLayerIds) return;
        e.preventDefault();
        e.stopPropagation();
        setOverFrameId(item.id);
      }} onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget) && overFrameId === item.id) setOverFrameId(null);
      }} onDrop={e => {
        if (!dragLayerIds) return;
        e.preventDefault();
        e.stopPropagation();
        moveObjsToGroup(dragLayerIds, item.id);
        setDragLayerIds(null);
        setOverFrameId(null);
      }} onClick={e => {
        if (e.detail > 1 || renamingId === gKey) return;
        layerClickSkipExpandRef.current = true;
        pick(allIds, e, isAllSel);
      }} onDoubleClick={e => {
        e.preventDefault();
        e.stopPropagation();
        layerClickSkipExpandRef.current = true;
        renameSkip.current = false;
        setRenamingId(gKey);
        setRenameVal(item.id);
      }}><span className="fig-chev" role="button" aria-expanded={!isCollapsed} data-tip={isCollapsed ? 'layOpenFrame' : 'layCloseFrame'} style={{
          transform: isCollapsed ? 'rotate(-90deg)' : 'none'
        }} onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onClick={e => toggleCollapseGrp(item.id, e)}><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4.5L6 7.5L9 4.5" /></svg></span><span className="fig-lay-ico"><Ico n={item.isFrame ? 'hash' : 'objects'} size={15} /></span>{item.bg && <span className="ved-swatch" style={{
          width: 14,
          height: 14,
          cursor: 'pointer',
          background: item.bg.fill === 'none' ? 'transparent' : item.bg.fill
        }} data-tip="layFrameBg" onDoubleClick={e => e.stopPropagation()} onClick={e => {
          e.stopPropagation();
          layerClickSkipExpandRef.current = true;
          setSel({
            objs: new Set([item.bg.id]),
            nodes: new Set()
          });
        }} />}{renamingId === gKey ? renInput(gKey, v => commitRename(item.id, true, v)) : <span className="truncate flex-1" onDoubleClick={e => {
          e.preventDefault();
          e.stopPropagation();
          layerClickSkipExpandRef.current = true;
          renameSkip.current = false;
          setRenamingId(gKey);
          setRenameVal(item.id);
        }}>{item.id}</span>}<button type="button" className={'fig-eject' + (allLocked ? ' act' : '')} data-tip={allLocked ? 'layFrameUnlock' : 'layFrameLock'} onClick={e => {
          e.stopPropagation();
          commitObjs(q => q.group === item.id ? {
            ...q,
            locked: !allLocked
          } : q);
        }}><Vi s={14} d={allLocked ? 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4' : 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 7.8-1.2'} /></button><button type="button" className={'fig-eject' + (allHidden ? ' act' : '')} data-tip={allHidden ? 'layFrameShow' : 'layFrameHide'} onClick={e => {
          e.stopPropagation();
          commitObjs(q => q.group === item.id ? {
            ...q,
            hidden: !allHidden
          } : q);
        }}><Ico n={allHidden ? 'eyeOff' : 'eye'} size={14} /></button><button type="button" className="fig-eject" data-tip="veCtxUngroup" aria-label="Ungroup" onClick={e => {
          e.stopPropagation();
          ungroupIds(new Set([item.id]), (item.isFrame ? 'Frame "' : 'Grup "') + item.id + '"');
        }}><Ico n="objects" size={14} /></button></div>;
    }} /></div><div className="ved-rz" {...rzProps('l')} /></aside>;

export { EditorLeftSidebar };
export default EditorLeftSidebar;
