/**
 * @file src/components/ui/SelectDropdown.tsx
 * @description Komponen menu pilihan (Select Dropdown) kustom berbasis FloatPopover
 */
import React, { useRef, useState } from 'react';
import { Ico, Chev } from './IconGlyphs.tsx';
import { Float } from './FloatPopover.tsx';
import { CustomTextBox } from './CustomTextBox.tsx';

const SELECT_SEARCH_CAP = 100;

// Saring opsi untuk mode searchable: cocokkan label (case-insensitive),
// tampilkan maks `cap` opsi; separator (disabled) hanya tampil saat tidak filter.
function filterSelectOptions(options, q, cap = SELECT_SEARCH_CAP) {
  const list = Array.isArray(options) ? options : [];
  const seps = list.filter(o => o[3] && o[3].disabled);
  const items = list.filter(o => !(o[3] && o[3].disabled));
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [...seps, ...items.slice(0, cap)];
  return items.filter(o => String(o[1] || '').toLowerCase().includes(query)).slice(0, cap);
}

export interface SelectProps {
  value: any;
  options: any[];
  on: (v: any) => void;
  tip?: string;
  lang?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onOptionVisible?: (opt: any) => void;
  testId?: string;
}

/* Dropdown kustom (pengganti <select>) */
const Select: React.FC<SelectProps> = ({
  value,
  options,
  on,
  tip,
  lang = 'id',
  searchable = false,
  searchPlaceholder,
  onOptionVisible,
  testId
}) => {
  const btn = useRef(null),
    listRef = useRef(null),
    [open, setOpen] = useState(false),
    [hi, setHi] = useState(0),
    [q, setQ] = useState(''),
    idx = options.findIndex(o => o[0] === value),
    cur = options[idx] || options[0];
  const shown = searchable ? filterSelectOptions(options, q) : options;
  const totalItems = options.filter(o => !(o[3] && o[3].disabled)).length;
  // Preview font (2026-11-16): opsi boleh membawa meta.fontFamily (nama
  // keluarga). Label dirender dengan family itu + fallback stack UI, jadi
  // tiap font terlihat gayanya sendiri. Font yang belum ter-load di dokumen
  // tampil dengan fallback dulu, lalu berganti otomatis saat FontFace-nya
  // masuk (tanpa render ulang React).
  const previewFontStack = fam => {
    const name = String(fam || '').replace(/"/g, '');
    return name ? `"${name}", "Geovanta Sans", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` : undefined;
  };
  // Beri tahu pemanggil opsi mana yang terlihat (saat dibuka + saat scroll
  // + saat daftar berubah) agar pemanggil bisa memuat font preview-nya
  // secara malas. Loader melakukan dedupe sendiri, jadi panggilan berulang
  // murah. Timeout 100ms menutupi mount Float yang tertunda (usePresence).
  const fireVisible = () => {
    if (!onOptionVisible || !listRef.current) return;
    const box = listRef.current.getBoundingClientRect();
    const els = listRef.current.querySelectorAll('[role="option"]');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom > box.top && r.top < box.bottom) {
        const k = el.getAttribute('data-opt-key');
        if (k) onOptionVisible(k);
      }
    }
  };
  React.useEffect(() => {
    if (!open) return undefined;
    fireVisible();
    const t = setTimeout(fireVisible, 100);
    return () => clearTimeout(t);
  }, [open, shown]);
  const close = () => {
    setOpen(false);
    setQ('');
  };
  const toggle = () => {
    setHi(Math.max(0, shown.findIndex(o => o[0] === value)));
    if (open) setQ('');
    setOpen(o => !o);
  };
  const choose = k => {
    const opt = shown.find(o => o[0] === k);
    if (!opt || (opt[3] && opt[3].disabled)) return;
    on(k);
    close();
    btn.current && btn.current.focus();
  };
  // Geser highlight, lewati separator (disabled); mentok di ujung (tidak wrap).
  const stepHi = d => {
    setHi(h => {
      let n = h + d;
      while (n >= 0 && n < shown.length && shown[n][3] && shown[n][3].disabled) n += d;
      if (n < 0 || n >= shown.length) return h;
      return n;
    });
  };
  const key = e => {
    // Semua tombol di sini ditangani sendiri; jangan biarkan lolos ke
    // shortcut global kanvas (mis. panah = nudge objek, Esc = batal pilih).
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return toggle();
      stepHi(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open ? (shown[hi] && choose(shown[hi][0])) : toggle();
    } else if (e.key === 'Escape') close();
  };
  const inputKey = e => {
    // Ketikan filter tidak boleh membajak shortcut kanvas; panah/Enter
    // menggerakkan highlight di daftar (bukan menggeser objek).
    e.stopPropagation();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepHi(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepHi(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (shown[hi]) choose(shown[hi][0]);
    } else if (e.key === 'Escape') {
      close();
      btn.current && btn.current.focus();
    }
  };
  return <div><button ref={btn} type="button" data-testid={testId} data-tip={tip} className={'fld sel' + (open ? ' open' : '')} onClick={toggle} onKeyDown={key} aria-haspopup="listbox" aria-expanded={open}><span className="sel-l inline-flex items-center gap-1.5">{cur[2] && <Ico n={cur[2]} size={14} />}<span style={cur[3] && cur[3].fontFamily ? {fontFamily: previewFontStack(cur[3].fontFamily)} : undefined}>{cur[1]}</span></span><Chev open={open} /></button><Float anchor={btn} open={open} onClose={close} minW={120}>{searchable && <div style={{padding: '6px 6px 4px'}} onKeyDown={inputKey} onClick={e => e.stopPropagation()}><div className="fld flex items-center px-2 py-1" style={{minHeight: 28}}><CustomTextBox value={q} placeholder={searchPlaceholder || 'Cari…'} ariaLabel={searchPlaceholder || 'Cari'} autoFocus={true} onChange={val => {
          setQ(val);
          setHi(0);
        }} onCommit={val => {
          setQ(val);
        }} /></div></div>}<div ref={listRef} onScroll={fireVisible} style={{maxHeight: 340, overflowY: 'auto', overscrollBehavior: 'contain'}}>{shown.map(([k, t, ic, meta], i) => <div key={k} role="option" data-testid={testId ? `${testId}-option-${k}` : undefined} data-opt-key={k} aria-selected={k === value} aria-disabled={!!(meta && meta.disabled)} className={'opt' + (i === hi ? ' hi' : '') + (k === value ? ' on' : '') + (meta && meta.disabled ? ' dis' : '')} onMouseEnter={() => {
          if (!(meta && meta.disabled)) setHi(i);
        }} onClick={() => choose(k)} style={{gap: 8}}><span className="sel-l inline-flex items-center gap-1.5">{ic && <Ico n={ic} size={14} />}<span style={meta && meta.fontFamily ? {fontFamily: previewFontStack(meta.fontFamily)} : undefined}>{t}</span></span><svg className="ck" style={{
          opacity: k === value ? 1 : 0,
          flexShrink: 0
        }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></div>)}</div>{searchable && totalItems > shown.length && <div className="mut" style={{padding: '6px 10px', fontSize: 11}}>{lang === 'en' ? `Showing ${shown.length} of ${totalItems} — type to filter` : `Menampilkan ${shown.length} dari ${totalItems} — ketik untuk menyaring`}</div>}</Float></div>;
};

/* CustomTextBox: kontrol input teks & angka modern 100% kustom tanpa elemen input native */

export { Select, filterSelectOptions, SELECT_SEARCH_CAP };
export default Select;
