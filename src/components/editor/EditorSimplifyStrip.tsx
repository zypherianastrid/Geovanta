/**
 * @file src/components/editor/EditorSimplifyStrip.tsx
 * @description Komponen bilah melayang penyederhanaan path cepat (EditorSimplifyStrip)
 * Terpasang tepat di atas tengah floating bar dengan jarak 24px (bottom 96px, left/right auto).
 */
import React from 'react';
import { Ico } from '../ui/IconGlyphs.tsx';
import { Slider } from '../ui/Slider.tsx';

export interface EditorSimplifyStripProps {
  leftPx?: number;
  topPx?: number;
  bottomPx?: number;
  isFixedBottom?: boolean;
  triggerAutoSimplifyLevel?: () => void;
  autoSimplifyAllCanvas?: () => void;
  autoSimplifyOn?: boolean;
  toggleAutoSimplify?: (() => void) | null;
  vcSimp: any;
  updateVcSimplify: (v: any) => void;
  openVcMoreOptions: () => void;
  confirmVcSimplify: () => void;
  cancelVcSimplify: () => void;
}

const EditorSimplifyStrip: React.FC<EditorSimplifyStripProps> = ({
  leftPx,
  topPx,
  bottomPx = 96,
  isFixedBottom = true,
  triggerAutoSimplifyLevel,
  autoSimplifyAllCanvas,
  autoSimplifyOn = false,
  toggleAutoSimplify = null,
  vcSimp,
  updateVcSimplify,
  openVcMoreOptions,
  confirmVcSimplify,
  cancelVcSimplify
}) => <div className="vc-simp-strip fade" style={isFixedBottom ? {
  position: 'absolute',
  left: 0,
  right: 0,
  marginLeft: 'auto',
  marginRight: 'auto',
  width: 'fit-content',
  bottom: bottomPx + 'px',
  top: 'auto',
  transform: 'none'
} : {
  left: (leftPx ?? 400) + 'px',
  top: (topPx ?? 64) + 'px'
}} onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}><button type="button" className="vc-ibtn" data-tip="veSimplifyAuto" onClick={triggerAutoSimplifyLevel}><Ico n="wand" size={15} /></button>{autoSimplifyAllCanvas && <button type="button" className="vc-ibtn" data-tip="veSimplifyAllCanvas" onClick={autoSimplifyAllCanvas}><Ico n="sparkle" size={15} /></button>}{toggleAutoSimplify && <button type="button" className={'vc-ibtn' + (autoSimplifyOn ? ' on' : '')} data-tip="veAutoSimplifyToggle" onClick={toggleAutoSimplify}><Ico n="bolt" size={14} /></button>}<div style={{
    width: 148
  }} className="px-1"><Slider min={0} max={100} step={1} value={vcSimp.level} on={lvl => updateVcSimplify({
      level: lvl
    })} label="Simplify" tip="veSimplifyLevel" /></div><span className="vc-simp-badge" data-tip="veSimpBadge">{vcSimp.before} → {vcSimp.after}</span><button type="button" className="vc-ibtn" data-tip="veSimplifyMore" onClick={openVcMoreOptions}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg></button><button type="button" className="vc-ibtn pri" data-tip="veApplySimplify" onClick={confirmVcSimplify}><Ico n="check" size={14} /></button><button type="button" className="vc-ibtn" data-tip="veSimpCancel" onClick={cancelVcSimplify}><Ico n="x" size={14} /></button></div>;

export { EditorSimplifyStrip };
export default EditorSimplifyStrip;
