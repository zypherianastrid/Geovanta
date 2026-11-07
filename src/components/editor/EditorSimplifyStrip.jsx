/**
 * @file src/components/editor/EditorSimplifyStrip.jsx
 * @description Komponen bilah melayang penyederhanaan path cepat (EditorSimplifyStrip)
 */
import React from 'react';
import { Ico } from '../ui/IconGlyphs.jsx';
import { Slider } from '../ui/Slider.jsx';

const EditorSimplifyStrip = ({
  leftPx = 400,
  topPx = 64,
  triggerAutoSimplifyLevel,
  vcSimp,
  updateVcSimplify,
  openVcMoreOptions,
  confirmVcSimplify,
  cancelVcSimplify
}) => <div className="vc-simp-strip fade" style={{
  left: leftPx + 'px',
  top: topPx + 'px'
}} onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}><button type="button" className="vc-ibtn" data-tip="veSimplifyAuto" title="Auto-Simplify" onClick={triggerAutoSimplifyLevel}><Ico n="wand" size={15} /></button><div style={{
    width: 148
  }} className="px-1"><Slider min={0} max={100} step={1} value={vcSimp.level} on={lvl => updateVcSimplify({
      level: lvl
    })} label="Simplify" tip="veSimplifyLevel" /></div><span className="vc-simp-badge" title="Anchor Points: Before \u2192 After">{vcSimp.before} → {vcSimp.after}</span><button type="button" className="vc-ibtn" data-tip="veSimplifyMore" title="More Options" onClick={openVcMoreOptions}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg></button><button type="button" className="vc-ibtn pri" data-tip="veApplySimplify" title="Apply Simplify (Enter)" onClick={confirmVcSimplify}><Ico n="check" size={14} /></button><button type="button" className="vc-ibtn" title="Cancel (Esc)" onClick={cancelVcSimplify}><Ico n="x" size={14} /></button></div>;

export { EditorSimplifyStrip };
export default EditorSimplifyStrip;
