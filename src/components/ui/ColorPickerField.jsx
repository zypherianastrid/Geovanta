/**
 * @file src/components/ui/ColorPickerField.jsx
 * @description Komponen pemilih warna HSV/OKLab lengkap dengan opasitas, pipet layar, & input kode warna
 */
import React, { useRef, useState, useEffect } from 'react';
import { parseColorWithAlpha, formatColorWithAlpha } from '../../utils/colorParserAndFormatter.jsx';
import { clampN, hex2hsv, hsv2hex } from '../../utils/colorMath.jsx';
import { pickScreenColor } from '../../utils/screenPipette.jsx';
import { Float } from './FloatPopover.jsx';
import { Slider } from './Slider.jsx';
import { CustomTextBox } from './CustomTextBox.jsx';
import { Ico } from './IconGlyphs.jsx';

/* Pemilih warna kustom lengkap: SV area, Hue slider, Slider Transparansi (0-100%), Hapus Warna (No Color), Hex & Opacity CustomTextBox, dan Eye Color Dropper */
const ColorField = ({
  value,
  on,
  tip,
  opacity,
  onOpacity
}) => {
  const parsed = parseColorWithAlpha(value);
  const effAlpha = opacity !== undefined ? clampN(opacity, 0, 1) : parsed.a;
  const isNone = parsed.isNone && opacity === undefined;
  const btn = useRef(null),
    sv = useRef(null),
    act = useRef(false),
    raf = useRef(0),
    last = useRef(value);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hex2hsv(parsed.hex));
  const [alpha, setAlpha] = useState(effAlpha);
  const [hx, setHx] = useState(null);
  const [drg, setDrg] = useState(false);
  const cur = hsv2hex(hsv[0], hsv[1], hsv[2]);
  useEffect(() => {
    const p = parseColorWithAlpha(value);
    if (!p.isNone && p.hex.toLowerCase() !== cur.toLowerCase()) setHsv(hex2hsv(p.hex));
    setAlpha(opacity !== undefined ? clampN(opacity, 0, 1) : p.isNone ? 0 : p.a);
  }, [value, opacity]);
  const out = c => {
    last.current = c;
    if (!raf.current) raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      on(last.current);
    });
  };
  const emit = (h, s, v, a = alpha) => {
    const nextA = isNone && a === 0 ? 1 : a;
    if (isNone && a === 0) setAlpha(1);
    setHsv([h, s, v]);
    const hexCol = hsv2hex(h, s, v);
    if (onOpacity) out(hexCol);else out(formatColorWithAlpha(hexCol, nextA));
  };
  const emitAlpha = pct => {
    const nextA = clampN(pct / 100, 0, 1);
    setAlpha(nextA);
    if (onOpacity) {
      onOpacity(nextA);
    } else if (nextA <= 0) {
      out('none');
    } else {
      out(formatColorWithAlpha(cur, nextA));
    }
  };
  const clearColor = () => {
    setHx(null);
    if (onOpacity) {
      setAlpha(0);
      onOpacity(0);
    } else {
      setAlpha(0);
      out('none');
    }
  };
  const svFrom = e => {
    const r = sv.current.getBoundingClientRect();
    emit(hsv[0], clampN((e.clientX - r.left) / r.width, 0, 1), 1 - clampN((e.clientY - r.top) / r.height, 0, 1));
  };
  const svDown = e => {
    try {
      sv.current.setPointerCapture(e.pointerId);
    } catch (x) {}
    act.current = true;
    setDrg(true);
    svFrom(e);
  };
  const svMove = e => {
    if (act.current) svFrom(e);
  };
  const svUp = () => {
    act.current = false;
    setDrg(false);
  };
  const [pk, setPk] = useState(false);
  const pipe = async () => {
    if (pk) return;
    setPk(true);
    const c = await pickScreenColor();
    setPk(false);
    if (c && /^#[0-9a-f]{6}$/i.test(c)) {
      const n = c.toLowerCase();
      const nextA = alpha <= 0 ? 1 : alpha;
      setHsv(hex2hsv(n));
      setAlpha(nextA);
      setHx(null);
      if (onOpacity) {
        if (alpha <= 0) onOpacity(1);
        out(n);
      } else {
        out(formatColorWithAlpha(n, nextA));
      }
    }
  };
  const typed = s => {
    const d = s.replace(/[^0-9a-f]/gi, '').slice(0, 6);
    setHx(d);
    if (d.length === 6) {
      const n = '#' + d.toLowerCase();
      const nextA = alpha <= 0 ? 1 : alpha;
      setHsv(hex2hsv(n));
      setAlpha(nextA);
      if (onOpacity) out(n);else out(formatColorWithAlpha(n, nextA));
    }
  };
  const alphaPct = Math.round((isNone ? 0 : alpha) * 100);
  const previewCss = isNone || alpha <= 0 ? 'transparent' : formatColorWithAlpha(cur, alpha);
  const rgbStr = `${parseInt(cur.slice(1, 3), 16)}, ${parseInt(cur.slice(3, 5), 16)}, ${parseInt(cur.slice(5, 7), 16)}`;
  return <div className="inline-block"><button ref={btn} type="button" data-tip={tip} className={'swatch' + (open ? ' open' : '') + (isNone || alpha <= 0 ? ' is-none' : alpha < 1 ? ' has-alpha' : '')} style={isNone || alpha <= 0 ? {} : alpha < 1 ? {
      backgroundColor: 'transparent',
      boxShadow: `inset 0 0 0 20px ${previewCss}`
    } : {
      background: cur
    }} aria-label={'Warna ' + (isNone ? 'Tanpa Warna' : value)} onClick={() => setOpen(o => !o)} /><Float anchor={btn} open={open} onClose={() => {
      setOpen(false);
      setHx(null);
    }} w={276} cls="cp"><div ref={sv} className="sv" data-tip="cpSV" style={{
        background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${hsv2hex(hsv[0], 1, 1)})`
      }} onPointerDown={svDown} onPointerMove={svMove} onPointerUp={svUp} onPointerCancel={svUp}><div className={'sv-h' + (drg ? ' drag' : '')} style={{
          left: hsv[1] * 100 + '%',
          top: (1 - hsv[2]) * 100 + '%',
          background: cur
        }} /></div><Slider min={0} max={360} step={1} value={Math.round(hsv[0])} on={h => emit(h, hsv[1], hsv[2])} label="Hue" tip="cpHue" style={{
        marginTop: 10
      }} thumb={hsv2hex(hsv[0], 1, 1)} track="linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" /><div className="mt-2.5"><div className="flex items-center justify-between text-[11px] mut mb-1"><span>Transparansi</span><span className="font-mono tabular-nums">{alphaPct}%</span></div><Slider min={0} max={100} step={1} value={alphaPct} on={emitAlpha} label="Transparansi" thumb={cur} track={`linear-gradient(to right, rgba(${rgbStr}, 0), rgb(${rgbStr})), repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 8px 8px`} /></div><div className="flex items-center gap-1.5 mt-3"><span className={'cp-prev' + (isNone || alpha <= 0 ? ' is-none' : alpha < 1 ? ' has-alpha' : '')} style={isNone || alpha <= 0 ? {} : alpha < 1 ? {
          boxShadow: `inset 0 0 0 20px ${previewCss}`
        } : {
          background: cur
        }} /><div className="fld hexf" style={{
          flex: '1 1 0',
          minWidth: 0
        }} data-tip="cpHex"><span className="mut">#</span><CustomTextBox value={isNone ? 'NONE' : (hx !== null ? hx : cur.slice(1)).toUpperCase()} ariaLabel="Kode Hex" filterRe={/[^0-9a-fA-F]/g} maxLen={6} upper={true} onChange={typed} onCommit={v => {
            typed(v);
            setHx(null);
          }} onCancel={() => setHx(null)} /></div><div className="fld hexf" style={{
          width: 54,
          flex: 'none',
          padding: '0 6px'
        }} title="Transparansi (%)"><CustomTextBox value={String(alphaPct)} ariaLabel="Transparansi Persen" filterRe={/[^0-9]/g} maxLen={3} onCommit={v => {
            const n = parseInt(v, 10);
            if (!isNaN(n)) emitAlpha(clampN(n, 0, 100));
          }} /><span className="mut text-[10px]">%</span></div><button type="button" className={'eyed' + (pk ? ' on' : '')} data-tip="cpPipette" title="Pipet Warna (Eye Dropper)" aria-label="Pipet warna" onClick={pipe}><Ico n="pipette" size={15} /></button><button type="button" className={'eyed' + (isNone || alpha <= 0 ? ' on' : '')} title="Hapus Warna (No Color)" aria-label="Hapus warna" onClick={clearColor}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg></button></div><div className="cp-act-bar"><button type="button" className={'cp-act-btn' + (isNone || alpha <= 0 ? ' on' : '')} onClick={clearColor} title="Hapus warna / setel ke None (Transparan penuh)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg><span>Tanpa Warna</span></button><button type="button" className={'cp-act-btn' + (pk ? ' on' : '')} onClick={pipe} title="Ambil sampel warna dari kanvas atau layar"><Ico n="pipette" size={13} /><span>Pipet Warna</span></button></div></Float></div>;
};

export { ColorField };
export default ColorField;
