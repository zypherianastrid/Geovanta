/**
 * @file src/components/ui/Slider.tsx
 * @description Komponen slider geser interaktif kustom dengan dukungan papan ketik & pointer capture
 */
import React, { useRef, useState } from 'react';
import { clampN } from '../../utils/colorMath.tsx';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  on: (v: number, meta?: any) => void;
  onCommit?: (v: number, meta?: any) => void;
  style?: React.CSSProperties;
  track?: string;
  thumb?: string;
  label?: string;
  tip?: string;
  domRef?: any;
}

/* Slider kustom: track + thumb, pointer drag, klik-lompat halus, keyboard (panah, PageUp/Down, Home/End) */
const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  on,
  onCommit,
  style,
  track,
  thumb,
  label,
  tip,
  domRef
}) => {
  const ref = useRef(null),
    fillRef = useRef(null),
    thumbRef = useRef(null),
    rectRef = useRef(null),
    lastValRef = useRef(value),
    dragValRef = useRef(null),
    pendingCommitRef = useRef<{ target: number; propAtCommit: number } | null>(null);
  const act = useRef(false),
    [dr, setDr] = useState(false);
  if (pendingCommitRef.current && value !== pendingCommitRef.current.propAtCommit) {
    pendingCommitRef.current = null;
  }
  const effVal = act.current && dragValRef.current != null
    ? dragValRef.current
    : (pendingCommitRef.current && pendingCommitRef.current.propAtCommit === value
        ? pendingCommitRef.current.target
        : value);
  const v = clampN(effVal, min, max),
    pct = (v - min) / (max - min) * 100;
  const noTr = dr || !!domRef;
  if (!act.current) lastValRef.current = v;
  const setRefs = el => {
    ref.current = el;
    if (domRef) domRef.current = el;
  };
  const from = e => {
    if (!ref.current) return;
    const r = rectRef.current || (rectRef.current = ref.current.getBoundingClientRect());
    const t = clampN((e.clientX - r.left - 8) / Math.max(1, r.width - 16), 0, 1);
    const x = clampN(+(Math.round((min + t * (max - min) - min) / step) * step + min).toFixed(6), min, max);
    dragValRef.current = x;
    const nextPct = (x - min) / Math.max(1e-9, max - min) * 100;
    if (fillRef.current) {
      fillRef.current.style.transition = 'none';
      fillRef.current.style.width = nextPct + '%';
    }
    if (thumbRef.current) {
      thumbRef.current.style.transition = 'none';
      thumbRef.current.style.left = nextPct + '%';
    }
    if (x !== lastValRef.current) {
      lastValRef.current = x;
      if (on) on(x, { isLive: true });
    }
  };
  const down = e => {
    if (e.button > 0) return;
    pendingCommitRef.current = null;
    try {
      ref.current.setPointerCapture(e.pointerId);
    } catch (x) {}
    act.current = true;
    if (ref.current) {
      rectRef.current = ref.current.getBoundingClientRect();
      ref.current.classList.add('drag');
    }
    from(e);
    setDr(true);
    ref.current.focus({
      preventScroll: true
    });
  };
  const mv = e => {
    if (!act.current) return;
    let ev = e;
    if (typeof e.getCoalescedEvents === 'function') {
      const coal = e.getCoalescedEvents();
      if (coal && coal.length > 0) ev = coal[coal.length - 1];
    }
    from(ev);
  };
  const end = e => {
    if (!act.current) return;
    act.current = false;
    rectRef.current = null;
    try {
      if (e && e.pointerId != null && ref.current && ref.current.hasPointerCapture && ref.current.hasPointerCapture(e.pointerId)) {
        ref.current.releasePointerCapture(e.pointerId);
      }
    } catch (x) {}
    const finalVal = dragValRef.current != null ? dragValRef.current : lastValRef.current;
    dragValRef.current = null;
    pendingCommitRef.current = finalVal !== value ? { target: finalVal, propAtCommit: value } : null;
    if (ref.current) ref.current.classList.remove('drag');
    setDr(false);
    if (!domRef) {
      if (fillRef.current) fillRef.current.style.transition = '';
      if (thumbRef.current) thumbRef.current.style.transition = '';
    }
    if (onCommit) onCommit(finalVal);
    else if (on) on(finalVal, { isLive: false });
  };
  const key = e => {
    const k = e.key,
      big = Math.max(step, (max - min) / 10);
    let x = null;
    if (k === 'ArrowRight' || k === 'ArrowUp') x = v + step;else if (k === 'ArrowLeft' || k === 'ArrowDown') x = v - step;else if (k === 'PageUp') x = v + big;else if (k === 'PageDown') x = v - big;else if (k === 'Home') x = min;else if (k === 'End') x = max;
    if (x !== null) {
      e.preventDefault();
      x = clampN(+(Math.round((min + (x - min)) / step) * step).toFixed(6), min, max);
      lastValRef.current = x;
      pendingCommitRef.current = x !== value ? { target: x, propAtCommit: value } : null;
      if (on) on(x, { isLive: false });
      if (onCommit) onCommit(x);
    }
  };
  return <div ref={setRefs} className={'sl' + (dr ? ' drag' : '') + (track ? ' hue' : '')} tabIndex={0} role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} style={style} data-tip={tip} onPointerDown={down} onPointerMove={mv} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={key}><div className="sl-r"><div className="sl-t" style={track ? {
        background: track
      } : null}>{!track && <div ref={fillRef} className="sl-f" style={{
          width: pct + '%',
          transition: noTr ? 'none' : undefined
        }} />}</div><div ref={thumbRef} className="sl-h" style={{
        left: pct + '%',
        transition: noTr ? 'none' : undefined,
        ...(thumb ? {
          background: thumb
        } : null)
      }} /></div></div>;
};

/* Panel mengambang (portal) + animasi masuk/keluar, posisi otomatis (flip ke atas), tutup via klik luar / Esc */

export { Slider };
export default Slider;
