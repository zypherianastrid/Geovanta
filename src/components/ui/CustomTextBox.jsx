/**
 * @file src/components/ui/CustomTextBox.jsx
 * @description Komponen kotak input teks & angka kustom (0% Native HTML Input) dengan pemilihan rentang & kursor
 */
import React, { useRef, useState, useEffect } from 'react';

/* CustomTextBox: kontrol input teks & angka modern 100% kustom tanpa elemen input native */
const CustomTextBox = ({
  value,
  onChange,
  onCommit,
  onCancel,
  onBump,
  dis,
  ariaLabel,
  placeholder,
  multiline = false,
  selectOnFocus = true,
  filterRe,
  maxLen,
  upper,
  autoFocus,
  cls = ''
}) => {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const [buf, setBuf] = useState(String(value ?? ''));
  const [caret, setCaret] = useState(String(value ?? '').length);
  const [selAll, setSelAll] = useState(false);
  const skipRef = useRef(false);
  const bufRef = useRef(String(value ?? ''));
  const bumpedRef = useRef(false);
  const justFocusedRef = useRef(false);
  useEffect(() => {
    const s = String(value ?? '');
    if (!editing || bumpedRef.current) {
      bumpedRef.current = false;
      setBuf(s);
      bufRef.current = s;
      setCaret(s.length);
    }
  }, [value, editing]);
  useEffect(() => {
    if (autoFocus && ref.current && !dis) {
      const s = String(value ?? '');
      ref.current.focus();
      setEditing(true);
      setBuf(s);
      bufRef.current = s;
      setCaret(s.length);
      setSelAll(!!selectOnFocus);
    }
  }, [autoFocus]);
  const updateBuf = (nextStr, nextCaret) => {
    setBuf(nextStr);
    bufRef.current = nextStr;
    setCaret(Math.max(0, Math.min(nextStr.length, nextCaret != null ? nextCaret : nextStr.length)));
    setSelAll(false);
    onChange && onChange(nextStr);
  };
  const startEdit = () => {
    if (dis) return;
    const s = String(value ?? '');
    justFocusedRef.current = true;
    setEditing(true);
    setBuf(s);
    bufRef.current = s;
    setCaret(s.length);
    setSelAll(!!selectOnFocus);
  };
  const finishEdit = () => {
    if (!editing) return;
    setEditing(false);
    setSelAll(false);
    if (skipRef.current) {
      skipRef.current = false;
      const s = String(value ?? '');
      setBuf(s);
      bufRef.current = s;
      onCancel && onCancel();
      return;
    }
    onCommit && onCommit(bufRef.current);
  };
  const onKeyDown = e => {
    if (dis) return;
    e.stopPropagation();
    const curBuf = bufRef.current;
    if (e.key === 'Enter') {
      if (multiline && e.shiftKey) {
        e.preventDefault();
        const pos = selAll ? 0 : caret;
        const next = selAll ? '\n' : curBuf.slice(0, pos) + '\n' + curBuf.slice(pos);
        updateBuf(next, pos + 1);
        return;
      }
      e.preventDefault();
      finishEdit();
      ref.current && ref.current.blur();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      skipRef.current = true;
      finishEdit();
      ref.current && ref.current.blur();
      return;
    }
    if (onBump && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      bumpedRef.current = true;
      onBump(e.key === 'ArrowUp' ? 1 : -1, e);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (selAll) {
        setSelAll(false);
        setCaret(0);
      } else setCaret(c => Math.max(0, c - 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (selAll) {
        setSelAll(false);
        setCaret(curBuf.length);
      } else setCaret(c => Math.min(curBuf.length, c + 1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setSelAll(false);
      setCaret(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setSelAll(false);
      setCaret(curBuf.length);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelAll(true);
      setCaret(curBuf.length);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      /* Jangan panggil e.preventDefault() agar event native onPaste dari browser tetap berjalan di dalam iframe/Canvas! */
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (selAll || e.ctrlKey || e.metaKey) {
        updateBuf('', 0);
      } else if (caret > 0) {
        const next = curBuf.slice(0, caret - 1) + curBuf.slice(caret);
        updateBuf(next, caret - 1);
      }
      return;
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      if (selAll || e.ctrlKey || e.metaKey) {
        updateBuf('', 0);
      } else if (caret < curBuf.length) {
        const next = curBuf.slice(0, caret) + curBuf.slice(caret + 1);
        updateBuf(next, caret);
      }
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      let ch = e.key;
      if (filterRe && filterRe.test(ch)) return;
      if (upper) ch = ch.toUpperCase();
      const base = selAll ? '' : curBuf;
      const pos = selAll ? 0 : caret;
      if (maxLen && base.length >= maxLen) return;
      const next = base.slice(0, pos) + ch + base.slice(pos);
      updateBuf(next, pos + ch.length);
    }
  };
  const onPaste = e => {
    if (dis) return;
    const cd = e.clipboardData;
    if (!cd) return;
    const raw = cd.getData('text/plain');
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    let s = multiline ? String(raw).replace(/\r\n/g, '\n') : String(raw).replace(/[\r\n]+/g, ' ');
    if (filterRe) s = s.replace(filterRe, '');
    const curBuf = bufRef.current;
    const base = selAll ? '' : curBuf;
    const pos = selAll ? 0 : caret;
    let next = base.slice(0, pos) + s + base.slice(pos);
    if (maxLen) next = next.slice(0, maxLen);
    if (upper) next = next.toUpperCase();
    setEditing(true);
    updateBuf(next, Math.min(next.length, pos + s.length));
  };
  const shown = editing ? buf : String(value ?? '');
  const beforeCaret = editing && !selAll ? shown.slice(0, caret) : shown;
  const afterCaret = editing && !selAll ? shown.slice(caret) : '';
  const isCanvasInline = typeof cls === 'string' && cls.includes('ct-canvas-inline');
  const boxStyle = isCanvasInline ? {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    outline: 'none',
    padding: 0,
    margin: 0,
    height: 'auto',
    minHeight: '1em',
    font: 'inherit',
    color: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    wordSpacing: 'inherit',
    textAlign: 'inherit',
    textTransform: 'inherit',
    whiteSpace: 'pre'
  } : multiline ? {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    minHeight: 24
  } : undefined;
  return <div ref={ref} role="textbox" tabIndex={dis ? -1 : 0} aria-label={ariaLabel || placeholder} aria-disabled={!!dis} data-custom-input="true" className={'c-inp ' + cls + (dis ? ' dis' : '') + (editing ? ' ed' : '')} style={boxStyle} onFocus={startEdit} onBlur={finishEdit} onKeyDown={onKeyDown} onPaste={onPaste} onDoubleClick={e => {
    if (dis) return;
    e.stopPropagation();
    setEditing(true);
    setSelAll(true);
    setCaret(shown.length);
  }} onClick={e => {
    if (dis) return;
    e.stopPropagation();
    if (justFocusedRef.current) {
      justFocusedRef.current = false;
      return;
    }
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.focus();
    } else if (editing && selAll) {
      setSelAll(false);
      setCaret(shown.length);
    }
  }} onPointerDown={e => {
    if (dis) return;
    e.stopPropagation();
  }}>{!shown && !editing && placeholder ? <span className="mut opacity-60 pointer-events-none select-none truncate">{placeholder}</span> : editing && !selAll ? <span className="c-inp-txt">{beforeCaret}<span className="c-caret" aria-hidden="true" />{afterCaret}</span> : <><span className={'c-inp-txt' + (editing && selAll && shown ? ' sel' : '')}>{shown}</span>{editing && <span className="c-caret" aria-hidden="true" />}</>}</div>;
};

/* Input angka kustom (scrubbable label + stepper ▲/▼ + ketik langsung tanpa elemen input native) */

export { CustomTextBox };
export default CustomTextBox;
