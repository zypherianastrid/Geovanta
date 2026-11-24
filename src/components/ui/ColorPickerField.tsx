/**
 * @file src/components/ui/ColorPickerField.tsx
 * @description Komponen pemilih warna HSV/OKLab lengkap dengan opasitas, pipet layar, & input kode warna
 */
import React, { useRef, useState, useEffect } from 'react';
import { parseColorWithAlpha, formatColorWithAlpha } from '../../utils/colorParserAndFormatter.tsx';
import { clampN, hex2hsv, hsv2hex } from '../../utils/colorMath.tsx';
import { pickScreenColor } from '../../utils/screenPipette.tsx';
import { getAppStr } from '../../constants/appI18n.tsx';
import { TIPS, TIPS_EN } from '../../constants/tooltipsCatalog.tsx';
import { readLangPref } from '../../utils/themeAndPrefsManager.tsx';
import { Float } from './FloatPopover.tsx';
import { Slider } from './Slider.tsx';
import { CustomTextBox } from './CustomTextBox.tsx';
import { Ico } from './IconGlyphs.tsx';
import { copySolidPaint, readPaintClipboard, useCopyFeedback } from '../../utils/colorClipboard.tsx';

export interface ColorFieldProps {
  value: any;
  on: (v: string, meta?: any) => void;
  onCommit?: (v: string, meta?: any) => void;
  tip?: string;
  opacity?: number;
  onOpacity?: (op: number, meta?: any) => void;
  onOpacityCommit?: (op: number) => void;
  L?: any;
  className?: string;
  label?: string;
}

const CP_PRESETS = [
  '#ffffff', '#e2e8f0', '#94a3b8', '#475569', '#1e293b', '#000000',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

/* Pemilih warna kustom lengkap: SV area, Hue slider, Slider Transparansi (0-100%), Hapus Warna (No Color), Hex & Opacity CustomTextBox, dan Eye Color Dropper */
const ColorField: React.FC<ColorFieldProps> = ({
  value,
  on,
  onCommit,
  tip,
  opacity,
  onOpacity,
  onOpacityCommit,
  L
}) => {
  const LL = L || getAppStr('id');
  const parsed = parseColorWithAlpha(value);
  const effAlpha = opacity !== undefined ? clampN(opacity, 0, 1) : parsed.a;
  const isNone = parsed.isNone && opacity === undefined;
  const btn = useRef(null),
    sv = useRef(null),
    act = useRef(false),
    raf = useRef(0),
    rectRef = useRef(null),
    last = useRef(value);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hex2hsv(parsed.hex));
  const [alpha, setAlpha] = useState(effAlpha);
  const [hx, setHx] = useState(null);
  const [hexHint, setHexHint] = useState(null);
  /* R3-T9 (F3): `typed` menerapkan warna ke dokumen begitu hex ke-6
     lengkap (live, via onChange) — Esc/onCancel yang hanya mereset draft
     `hx` tidak mengembalikan warna dokumen. Simpan warna pra-edit saat
     sesi ketik hex dimulai (ref sinkron, bukan state `hx` yang bisa basi
     di closure), dan kembalikan saat batal. */
  const hexPrevRef = useRef(null);
  const hexEditRef = useRef(false);
  const hexHintTimer = useRef(null);
  const [drg, setDrg] = useState(false);
  const cur = hsv2hex(hsv[0], hsv[1], hsv[2]);
  useEffect(() => {
    if (act.current) return;
    const p = parseColorWithAlpha(value);
    if (!p.isNone && p.hex.toLowerCase() !== cur.toLowerCase()) setHsv(hex2hsv(p.hex));
    setAlpha(opacity !== undefined ? clampN(opacity, 0, 1) : p.isNone ? 0 : p.a);
  }, [value, opacity]);
  const out = (c, isLive = false) => {
    last.current = c;
    if (isLive) {
      if (!raf.current) raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        if (on) on(last.current, { isLive: true });
      });
    } else {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = 0;
      }
      if (onCommit) onCommit(c);
      else if (on) on(c, { isLive: false });
    }
  };
  const emit = (h, s, v, a = alpha, isLive = false) => {
    const nextA = isNone && a === 0 ? 1 : a;
    if (isNone && a === 0) setAlpha(1);
    setHsv([h, s, v]);
    const hexCol = hsv2hex(h, s, v);
    if (onOpacity) {
      out(hexCol, isLive);
    } else {
      out(formatColorWithAlpha(hexCol, nextA), isLive);
    }
  };
  const emitAlpha = (pct, isLive = false) => {
    const nextA = clampN(pct / 100, 0, 1);
    setAlpha(nextA);
    if (onOpacity) {
      if (isLive) {
        onOpacity(nextA, { isLive: true });
      } else {
        if (onOpacityCommit) onOpacityCommit(nextA);
        else onOpacity(nextA, { isLive: false });
      }
    } else if (nextA <= 0) {
      out('none', isLive);
    } else {
      out(formatColorWithAlpha(cur, nextA), isLive);
    }
  };
  const clearColor = () => {
    setHx(null);
    if (onOpacity) {
      setAlpha(0);
      if (onOpacityCommit) onOpacityCommit(0);
      else onOpacity(0, { isLive: false });
    } else {
      setAlpha(0);
      out('none', false);
    }
  };
  const svFrom = (e, isLive = false) => {
    if (!sv.current) return;
    const r = rectRef.current || (rectRef.current = sv.current.getBoundingClientRect());
    let ev = e;
    if (typeof e.getCoalescedEvents === 'function') {
      const coal = e.getCoalescedEvents();
      if (coal && coal.length > 0) ev = coal[coal.length - 1];
    }
    const s = clampN((ev.clientX - r.left) / Math.max(1, r.width), 0, 1);
    const v = 1 - clampN((ev.clientY - r.top) / Math.max(1, r.height), 0, 1);
    emit(hsv[0], s, v, alpha, isLive);
  };
  const svDown = e => {
    try {
      sv.current.setPointerCapture(e.pointerId);
    } catch (x) {}
    act.current = true;
    rectRef.current = sv.current ? sv.current.getBoundingClientRect() : null;
    setDrg(true);
    svFrom(e, true);
  };
  const svMove = e => {
    if (act.current) svFrom(e, true);
  };
  const svUp = e => {
    if (!act.current) return;
    act.current = false;
    rectRef.current = null;
    setDrg(false);
    try {
      sv.current?.releasePointerCapture(e.pointerId);
    } catch (x) {}
    svFrom(e, false);
  };
  const [pk, setPk] = useState(false);
  const copyFb = useCopyFeedback();
  const copyColor = async () => {
    const res = await copySolidPaint(isNone ? 'none' : cur, alpha);
    copyFb.trigger(true, (LL.cpColorCopied || 'Copied').replace('{v}', res.text));
  };
  const pasteColor = async () => {
    const pasted = await readPaintClipboard('solid');
    if (!pasted || pasted.kind !== 'solid') {
      setHexHint(LL.cpPasteInvalid || 'Clipboard tidak berisi warna yang valid');
      if (hexHintTimer.current) clearTimeout(hexHintTimer.current);
      hexHintTimer.current = setTimeout(() => setHexHint(null), 3000);
      return;
    }
    clearHexHint();
    setHx(null);
    hexPrevRef.current = null;
    hexEditRef.current = false;
    if (pasted.isNone || pasted.alpha <= 0) {
      clearColor();
      return;
    }
    const nextHex = pasted.hex.toLowerCase();
    const nextA = clampN(pasted.alpha, 0, 1);
    setHsv(hex2hsv(nextHex));
    setAlpha(nextA);
    if (onOpacity) {
      if (Math.abs(nextA - alpha) > 1e-3) {
        if (onOpacityCommit) onOpacityCommit(nextA);
        else onOpacity(nextA, { isLive: false });
      }
      out(nextHex, false);
    } else {
      out(formatColorWithAlpha(nextHex, nextA), false);
    }
  };
  const pipe = async () => {
    if (pk) return;
    setPk(true);
    const c: any = await pickScreenColor();
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
  /* Hint singkat saat filterRe menolak karakter non-hex (C-9): karakter
     tetap ditolak, tapi penolakan kini dijelaskan, bukan diam-diam. */
  const showHexHint = () => {
    setHexHint('Hanya 0-9, a-f');
    if (hexHintTimer.current) clearTimeout(hexHintTimer.current);
    hexHintTimer.current = setTimeout(() => setHexHint(null), 3000);
  };
  const clearHexHint = () => {
    if (hexHintTimer.current) {
      clearTimeout(hexHintTimer.current);
      hexHintTimer.current = null;
    }
    setHexHint(null);
  };
  const typed = s => {
    clearHexHint();
    if (!hexEditRef.current) {
      hexEditRef.current = true;
      hexPrevRef.current = { hex: cur, alpha, isNone };
    }
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
  /* R3-T9 (F3): batalkan edit hex — kembalikan warna pra-edit HANYA bila
     sesi ketik sempat mengubah dokumen (hex/alpha berubah); bila hanya
     ketik parsial tanpa emit, jangan kirim commit redundan ke parent. */
  const cancelHex = () => {
    setHx(null);
    const prev = hexPrevRef.current;
    hexPrevRef.current = null;
    hexEditRef.current = false;
    if (!prev) return;
    if (!prev.isNone && prev.hex.toLowerCase() === cur.toLowerCase() && prev.alpha === alpha) return;
    if (prev.isNone) { clearColor(); return; }
    setHsv(hex2hsv(prev.hex));
    setAlpha(prev.alpha);
    /* R3-T9 fix1 (I1): cabang onOpacity harus mengembalikan opacity juga.
       `setAlpha` lokal saja tidak cukup: efek sinkron [value, opacity]
       menimpa alpha lokal dari prop parent yang sudah terlanjur 1 (promosi
       di `typed`). Re-emit non-live meniru jalur `emitAlpha`/`clearColor`. */
    if (onOpacity) {
      out(prev.hex);
      if (onOpacityCommit) onOpacityCommit(prev.alpha);
      else onOpacity(prev.alpha, { isLive: false });
    } else out(formatColorWithAlpha(prev.hex, prev.alpha));
  };
  const alphaPct = Math.round((isNone ? 0 : alpha) * 100);
  const previewCss = isNone || alpha <= 0 ? 'transparent' : formatColorWithAlpha(cur, alpha);
  const rgbStr = `${parseInt(cur.slice(1, 3), 16)}, ${parseInt(cur.slice(3, 5), 16)}, ${parseInt(cur.slice(5, 7), 16)}`;
  /* Task 11 (B-F4): tooltip swatch menampilkan nama field + nilai warna SAAT
     INI (live). Nama diambil dari katalog tooltip yang sama dengan data-tip
     (pola tipT Task 4); nilai dibaca dari `cur` — state warna yang sama
     dengan yang di-render swatch (ikut berubah saat drag SV/slider/ketik
     hex), bukan hardcode dan bukan prop `value` yang bisa tertinggal saat
     live-drag. Tanpa judul katalog (tip tak dikenal) atribut dihilangkan
     (React mengabaikan undefined) dan perilaku tooltip lama dipertahankan. */
  const tipTitle = tip ? ((readLangPref() === 'en' ? TIPS_EN : TIPS)[tip] || {}).t : null;
  const tipText = tipTitle ? tipTitle + ': ' + (isNone ? LL.cpNoColor : cur.toUpperCase()) : undefined;
  return <div className="inline-block"><button ref={btn} type="button" data-tip={tip} data-tip-text={tipText} className={'swatch' + (open ? ' open' : '') + (isNone || alpha <= 0 ? ' is-none' : alpha < 1 ? ' has-alpha' : '')} style={isNone || alpha <= 0 ? {} : alpha < 1 ? {
      backgroundColor: 'transparent',
      boxShadow: `inset 0 0 0 20px ${previewCss}`
    } : {
      background: cur
    }} aria-label={LL.cpColorAria.replace('{v}', isNone ? LL.cpNoColor : value)} onClick={() => setOpen(o => !o)} /><Float anchor={btn} open={open} onClose={() => {
      setOpen(false);
      setHx(null);
      clearHexHint();
      /* R3-T9 fix1 (M1): bersihkan snapshot sesi hex bila popover menutup
         tanpa commit/cancel, supaya sesi berikutnya tidak melewatkan
         snapshot (guard `hexEditRef`) lalu Esc mengembalikan warna basi. */
      hexPrevRef.current = null;
      hexEditRef.current = false;
    }} w={276} cls="cp"><div className="cp-mob-header"><span className="cp-mob-handle" /><div className="cp-mob-title-row"><span className="cp-mob-title">{LL.cpTitle || 'Pilih Warna'}</span><button type="button" className="cp-mob-close" onClick={() => setOpen(false)} aria-label="Tutup">✕</button></div></div><div ref={sv} className="sv" data-tip="cpSV" style={{
        background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${hsv2hex(hsv[0], 1, 1)})`
      }} onPointerDown={svDown} onPointerMove={svMove} onPointerUp={svUp} onPointerCancel={svUp}><div className={'sv-h' + (drg ? ' drag' : '')} style={{
          left: hsv[1] * 100 + '%',
          top: (1 - hsv[2]) * 100 + '%',
          background: cur
        }} /></div><Slider min={0} max={360} step={1} value={Math.round(hsv[0])} on={(h, meta) => emit(h, hsv[1], hsv[2], alpha, meta ? meta.isLive : true)} onCommit={h => emit(h, hsv[1], hsv[2], alpha, false)} label="Hue" tip="cpHue" style={{
        marginTop: 10
      }} thumb={hsv2hex(hsv[0], 1, 1)} track="linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" /><div className="mt-2.5"><div className="flex items-center justify-between text-[11px] mut mb-1"><span>{LL.cpTransparency}</span><span className="font-mono tabular-nums">{alphaPct}%</span></div><Slider min={0} max={100} step={1} value={alphaPct} on={(pct, meta) => emitAlpha(pct, meta ? meta.isLive : true)} onCommit={pct => emitAlpha(pct, false)} label={LL.cpTransparency} thumb={cur} track={`linear-gradient(to right, rgba(${rgbStr}, 0), rgb(${rgbStr})), repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 8px 8px`} /></div><div className="flex items-center gap-1.5 mt-3"><span className={'cp-prev' + (isNone || alpha <= 0 ? ' is-none' : alpha < 1 ? ' has-alpha' : '')} style={isNone || alpha <= 0 ? {} : alpha < 1 ? {
          boxShadow: `inset 0 0 0 20px ${previewCss}`
        } : {
          background: cur
        }} /><div className="fld hexf" style={{
          flex: '1 1 0',
          minWidth: 0
        }} data-tip="cpHex"><span className="mut">#</span><CustomTextBox value={isNone ? 'NONE' : (hx !== null ? hx : cur.slice(1)).toUpperCase()} ariaLabel={LL.cpHexCode} filterRe={/[^0-9a-fA-F]/g} onFilterReject={showHexHint} maxLen={6} upper={true} onChange={typed} onCommit={v => {
            typed(v);
            setHx(null);
            hexEditRef.current = false;
            hexPrevRef.current = null;
          }} onCancel={cancelHex} /></div><div className="fld hexf" style={{
          width: 54,
          flex: 'none',
          padding: '0 6px'
        }} data-tip="veAlphaPct"><CustomTextBox value={String(alphaPct)} ariaLabel={LL.cpAlphaPct} filterRe={/[^0-9]/g} maxLen={3} onCommit={v => {
            const n = parseInt(v, 10);
            if (!isNaN(n)) emitAlpha(clampN(n, 0, 100));
          }} /><span className="mut text-[10px]">%</span></div><button type="button" className={'eyed' + (pk ? ' on' : '')} data-tip="cpPipette" aria-label={LL.cpPipetteAria} onClick={pipe}><Ico n="pipette" size={15} /></button><button type="button" className={'eyed' + (isNone || alpha <= 0 ? ' on' : '')} data-tip="veNoColor" aria-label={LL.cpClearAria} onClick={clearColor}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg></button></div>{hexHint && <div data-testid="cp-hex-hint" style={{
          color: 'var(--danger)',
          fontSize: 11,
          marginTop: 6
        }}>{hexHint}</div>}<div className="cp-act-bar"><button type="button" className={'cp-act-btn' + (isNone || alpha <= 0 ? ' on' : '')} onClick={clearColor} data-tip="veNoColor"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg><span>{LL.cpNoColor}</span></button><button type="button" className={'cp-act-btn' + (pk ? ' on' : '')} onClick={pipe} data-tip="cpPipette"><Ico n="pipette" size={13} /><span>{LL.cpPipette}</span></button></div><div className="cp-act-bar" style={{ marginTop: 6, paddingTop: 6 }}><button type="button" className="cp-act-btn" data-testid="cp-copy-btn" data-tip="veCopyColor" data-copied={copyFb.status === 'copied' ? '' : undefined} aria-label={LL.cpCopyColorAria || LL.cpCopy} onClick={copyColor}><Ico n={copyFb.status === 'copied' ? 'check' : 'copy'} size={13} /><span>{LL.cpCopy || 'Salin'}</span></button><button type="button" className="cp-act-btn" data-testid="cp-paste-btn" data-tip="vePasteColor" aria-label={LL.cpPasteColorAria || LL.cpPaste} onClick={pasteColor}><Ico n="paste" size={13} /><span>{LL.cpPaste || 'Tempel'}</span></button><span role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0.001, pointerEvents: 'none' }}>{copyFb.liveMsg}</span></div><div className="cp-presets-grid" data-testid="cp-presets-grid">{CP_PRESETS.map(hex => <button key={hex} type="button" className="cp-preset-chip" style={{ background: hex }} aria-label={`Preset ${hex}`} data-hex={hex} onClick={() => {
        const nextA = alpha <= 0 ? 1 : alpha;
        setHsv(hex2hsv(hex));
        setAlpha(nextA);
        setHx(null);
        if (onOpacity) {
          if (alpha <= 0) onOpacity(1);
          out(hex);
        } else {
          out(formatColorWithAlpha(hex, nextA));
        }
      }} />)}</div></Float></div>;
};

export { ColorField };
export default ColorField;
