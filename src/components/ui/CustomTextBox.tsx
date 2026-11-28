/**
 * @file src/components/ui/CustomTextBox.tsx
 * @description Komponen kotak input teks & angka kustom (0% Native HTML Input) dengan pemilihan rentang & kursor
 */
import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';

/* Helper offscreen canvas untuk mengukur posisi horizontal tiap batas karakter */
let measureCtx = null;
function getCharPositions(text, font) {
  if (!text || text.length === 0) return [0];
  if (typeof document !== 'undefined') {
    if (!measureCtx) {
      const c = document.createElement('canvas');
      measureCtx = c.getContext('2d');
    }
    if (measureCtx) {
      measureCtx.font = font || '12px Inter, sans-serif';
      const positions = [0];
      for (let i = 1; i <= text.length; i++) {
        positions.push(measureCtx.measureText(text.slice(0, i)).width);
      }
      return positions;
    }
  }
  // Fallback proporsional bila di luar lingkungan DOM
  const avgW = 7.2;
  const positions = [0];
  for (let i = 1; i <= text.length; i++) {
    positions.push(i * avgW);
  }
  return positions;
}

function findClosestCharIndex(positions, relX) {
  if (!positions || positions.length <= 1 || relX <= 0) return 0;
  const n = positions.length - 1;
  if (relX >= positions[n]) return n;
  for (let i = 0; i < n; i++) {
    const mid = (positions[i] + positions[i + 1]) / 2;
    if (relX < mid) return i;
  }
  return n;
}

function getTextStartLeft(rootEl) {
  if (!rootEl || typeof window === 'undefined') return 0;
  const rect = rootEl.getBoundingClientRect();
  const style = window.getComputedStyle(rootEl);
  const pl = parseFloat(style.paddingLeft) || 0;
  const bl = parseFloat(style.borderLeftWidth) || 0;
  return rect.left + pl + bl;
}

export interface CustomTextBoxProps {
  value?: any;
  onChange?: (v: string) => void;
  onCommit?: (v: string) => void;
  onCancel?: () => void;
  onBump?: (delta: number, e?: any) => void;
  dis?: boolean;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  placeholder?: string;
  selectOnFocus?: boolean;
  filterRe?: RegExp;
  onFilterReject?: (char: string) => void;
  maxLen?: number;
  upper?: boolean;
  autoFocus?: boolean;
  cls?: string;
  style?: React.CSSProperties;
  domRef?: React.Ref<any>;
}

/* CustomTextBox: kontrol input teks & angka modern 100% kustom tanpa elemen input native */
const CustomTextBox: React.FC<CustomTextBoxProps> = ({
  value,
  onChange,
  onCommit,
  onCancel,
  onBump,
  dis,
  ariaLabel,
  ariaInvalid,
  placeholder,
  selectOnFocus = true,
  filterRe,
  onFilterReject,
  maxLen,
  upper,
  autoFocus,
  cls = ''
}) => {
  const ref = useRef(null);
  const txtRef = useRef<HTMLSpanElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [buf, setBuf] = useState(String(value ?? ''));
  const [caret, setCaret] = useState(String(value ?? '').length);
  const [caretX, setCaretX] = useState(0);
  const [selStart, setSelStart] = useState(0);
  const [selEnd, setSelEnd] = useState(0);
  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef(0);
  const dragPositionsRef = useRef([0]);
  const dragTextLeftRef = useRef(0);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const skipRef = useRef(false);
  const bufRef = useRef(String(value ?? ''));
  const bumpedRef = useRef(false);
  const justFocusedRef = useRef(false);
  const doneRef = useRef(false);
  const cleanDragRef = useRef(null);

  /* Menjaga scrollLeft tetap 0 agar isi teks tidak bergeser saat difokuskan atau diseleksi */
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = 0;
  }, [editing, value]);

  useEffect(() => {
    return () => {
      if (cleanDragRef.current) cleanDragRef.current();
    };
  }, []);
  useEffect(() => {
    const s = String(value ?? '');
    if (!editing || bumpedRef.current) {
      bumpedRef.current = false;
      setBuf(s);
      bufRef.current = s;
      setCaret(s.length);
      setSelStart(s.length);
      setSelEnd(s.length);
    }
  }, [value, editing]);
  useEffect(() => {
    if (autoFocus && ref.current && !dis) {
      const s = String(value ?? '');
      ref.current.focus({ preventScroll: true });
      if (ref.current) ref.current.scrollLeft = 0;
      setEditing(true);
      setBuf(s);
      bufRef.current = s;
      setCaret(s.length);
      if (selectOnFocus) {
        setSelStart(0);
        setSelEnd(s.length);
      } else {
        setSelStart(s.length);
        setSelEnd(s.length);
      }
    }
  }, [autoFocus]);
  const updateBuf = (nextStr, nextCaret) => {
    setBuf(nextStr);
    bufRef.current = nextStr;
    const pos = Math.max(0, Math.min(nextStr.length, nextCaret != null ? nextCaret : nextStr.length));
    setCaret(pos);
    setSelStart(pos);
    setSelEnd(pos);
    onChange && onChange(nextStr);
  };
  const startEdit = () => {
    if (dis) return;
    doneRef.current = false;
    const s = String(value ?? '');
    setEditing(true);
    setBuf(s);
    bufRef.current = s;
    setCaret(s.length);
    if (isDraggingRef.current) return;
    if (selectOnFocus) {
      setSelStart(0);
      setSelEnd(s.length);
      dragAnchorRef.current = 0;
    } else {
      setSelStart(s.length);
      setSelEnd(s.length);
      dragAnchorRef.current = s.length;
    }
  };
  const finishEdit = () => {
    if (!editing || doneRef.current) return;
    doneRef.current = true;
    setEditing(false);
    setSelStart(0);
    setSelEnd(0);
    isDraggingRef.current = false;
    if (ref.current) ref.current.scrollLeft = 0; /* R3-T9 (F10): reset scroll */
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
    const hasSel = selStart < selEnd;
    if (e.key === 'Enter') {
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
      if (e.shiftKey) {
        const nextC = Math.max(0, caret - 1);
        setCaret(nextC);
        setSelStart(Math.min(dragAnchorRef.current, nextC));
        setSelEnd(Math.max(dragAnchorRef.current, nextC));
      } else if (hasSel) {
        setCaret(selStart);
        setSelStart(selStart);
        setSelEnd(selStart);
        dragAnchorRef.current = selStart;
      } else {
        const nextC = Math.max(0, caret - 1);
        setCaret(nextC);
        setSelStart(nextC);
        setSelEnd(nextC);
        dragAnchorRef.current = nextC;
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.shiftKey) {
        const nextC = Math.min(curBuf.length, caret + 1);
        setCaret(nextC);
        setSelStart(Math.min(dragAnchorRef.current, nextC));
        setSelEnd(Math.max(dragAnchorRef.current, nextC));
      } else if (hasSel) {
        setCaret(selEnd);
        setSelStart(selEnd);
        setSelEnd(selEnd);
        dragAnchorRef.current = selEnd;
      } else {
        const nextC = Math.min(curBuf.length, caret + 1);
        setCaret(nextC);
        setSelStart(nextC);
        setSelEnd(nextC);
        dragAnchorRef.current = nextC;
      }
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setCaret(0);
      setSelStart(0);
      setSelEnd(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setCaret(curBuf.length);
      setSelStart(curBuf.length);
      setSelEnd(curBuf.length);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelStart(0);
      setSelEnd(curBuf.length);
      setCaret(curBuf.length);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (hasSel && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(curBuf.slice(selStart, selEnd)).catch(() => {});
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      if (hasSel) {
        e.preventDefault();
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(curBuf.slice(selStart, selEnd)).catch(() => {});
        }
        const next = curBuf.slice(0, selStart) + curBuf.slice(selEnd);
        updateBuf(next, selStart);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      /* Jangan panggil e.preventDefault() agar event native onPaste dari browser tetap berjalan di dalam iframe/Canvas! */
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (hasSel) {
        const next = curBuf.slice(0, selStart) + curBuf.slice(selEnd);
        updateBuf(next, selStart);
      } else if (caret > 0) {
        const next = curBuf.slice(0, caret - 1) + curBuf.slice(caret);
        updateBuf(next, caret - 1);
      }
      return;
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      if (hasSel) {
        const next = curBuf.slice(0, selStart) + curBuf.slice(selEnd);
        updateBuf(next, selStart);
      } else if (caret < curBuf.length) {
        const next = curBuf.slice(0, caret) + curBuf.slice(caret + 1);
        updateBuf(next, caret);
      }
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      let ch = e.key;
      if (filterRe) {
        /* filterRe global (/g) bersifat stateful (lastIndex) — reset agar
           tiap penolakan deterministik; tanpa ini penolakan berflip-flop
           (tolak, terima, tolak, ...) pada karakter yang sama. */
        filterRe.lastIndex = 0;
        if (filterRe.test(ch)) {
          onFilterReject && onFilterReject(ch);
          return;
        }
      }
      if (upper) ch = ch.toUpperCase();
      const base = hasSel ? curBuf.slice(0, selStart) + curBuf.slice(selEnd) : curBuf;
      const pos = hasSel ? selStart : caret;
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
    let s = String(raw).replace(/[\r\n]+/g, ' ');
    if (filterRe) s = s.replace(filterRe, '');
    const curBuf = bufRef.current;
    const hasSel = selStart < selEnd;
    const base = hasSel ? curBuf.slice(0, selStart) + curBuf.slice(selEnd) : curBuf;
    const pos = hasSel ? selStart : caret;
    let next = base.slice(0, pos) + s + base.slice(pos);
    if (maxLen) next = next.slice(0, maxLen);
    if (upper) next = next.toUpperCase();
    setEditing(true);
    updateBuf(next, Math.min(next.length, pos + s.length));
  };

  const onPointerDown = e => {
    if (dis || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof window !== 'undefined' && window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    } catch (_) {}
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.focus({ preventScroll: true });
    }
    setEditing(true);
    const s = bufRef.current;
    let font = '12px "Geovanta Sans", Inter, sans-serif';
    if (typeof window !== 'undefined' && ref.current) {
      const cs = window.getComputedStyle(ref.current);
      const fs = cs.fontSize || '12px';
      const ff = cs.fontFamily || '"Geovanta Sans", Inter, sans-serif';
      const fw = cs.fontWeight || '400';
      font = `${fw} ${fs} ${ff}`;
    }
    const positions = getCharPositions(s, font);
    dragPositionsRef.current = positions;
    const textLeft = getTextStartLeft(ref.current);
    dragTextLeftRef.current = textLeft;

    const currentScroll = ref.current ? ref.current.scrollLeft : 0;
    const relX = (e.clientX - textLeft) + currentScroll;
    const idx = findClosestCharIndex(positions, relX);
    dragAnchorRef.current = idx;
    setSelStart(idx);
    setSelEnd(idx);
    setCaret(idx);
    try {
      ref.current.setPointerCapture(e.pointerId);
    } catch (err) {}

    const onGlobalMove = ev => {
      if (!isDraggingRef.current) return;
      ev.stopPropagation();
      const root = ref.current;
      if (!root) return;
      const rR = root.getBoundingClientRect();
      const tLeft = dragTextLeftRef.current;

      // Auto-scroll saat seleksi mouse ditarik melebihi batas kotak input
      if (ev.clientX > rR.right - 10 && root.scrollLeft < root.scrollWidth - root.clientWidth) {
        root.scrollLeft = Math.min(root.scrollWidth - root.clientWidth, root.scrollLeft + 8);
      } else if (ev.clientX < rR.left + 10 && root.scrollLeft > 0) {
        root.scrollLeft = Math.max(0, root.scrollLeft - 8);
      }

      const relXDrag = (ev.clientX - tLeft) + root.scrollLeft;
      const currentIdx = findClosestCharIndex(dragPositionsRef.current, relXDrag);
      const anchor = dragAnchorRef.current;
      setSelStart(Math.min(anchor, currentIdx));
      setSelEnd(Math.max(anchor, currentIdx));
      setCaret(currentIdx);
    };

    const onGlobalUp = ev => {
      isDraggingRef.current = false;
      cleanDragRef.current = null;
      try {
        if (ref.current && ev && ev.pointerId != null) {
          ref.current.releasePointerCapture(ev.pointerId);
        }
      } catch (err) {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', onGlobalMove, true);
        window.removeEventListener('pointerup', onGlobalUp, true);
        window.removeEventListener('pointercancel', onGlobalUp, true);
      }
    };

    cleanDragRef.current = onGlobalUp;
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onGlobalMove, true);
      window.addEventListener('pointerup', onGlobalUp, true);
      window.addEventListener('pointercancel', onGlobalUp, true);
    }
  };

  const onPointerMove = e => {
    if (!isDraggingRef.current || dis) return;
    e.stopPropagation();
    const root = ref.current;
    if (!root) return;
    const rR = root.getBoundingClientRect();
    const positions = dragPositionsRef.current;
    const textLeft = dragTextLeftRef.current;

    if (e.clientX > rR.right - 10 && root.scrollLeft < root.scrollWidth - root.clientWidth) {
      root.scrollLeft = Math.min(root.scrollWidth - root.clientWidth, root.scrollLeft + 8);
    } else if (e.clientX < rR.left + 10 && root.scrollLeft > 0) {
      root.scrollLeft = Math.max(0, root.scrollLeft - 8);
    }

    const relX = (e.clientX - textLeft) + root.scrollLeft;
    const currentIdx = findClosestCharIndex(positions, relX);
    const anchor = dragAnchorRef.current;
    setSelStart(Math.min(anchor, currentIdx));
    setSelEnd(Math.max(anchor, currentIdx));
    setCaret(currentIdx);
  };

  const onPointerUp = e => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    cleanDragRef.current = null;
    try {
      ref.current.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onDoubleClick = e => {
    if (dis) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof window !== 'undefined' && window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    } catch (_) {}
    setEditing(true);
    const s = bufRef.current;
    setSelStart(0);
    setSelEnd(s.length);
    setCaret(s.length);
    dragAnchorRef.current = 0;
    if (ref.current) ref.current.scrollLeft = 0;
  };

  const shown = editing ? buf : String(value ?? '');
  const hasSel = editing && selStart < selEnd;
  const beforeSel = hasSel ? shown.slice(0, selStart) : '';
  const selText = hasSel ? shown.slice(selStart, selEnd) : '';
  const afterSel = hasSel ? shown.slice(selEnd) : '';

  useLayoutEffect(() => {
    if (!editing || hasSel) return;
    if (caret <= 0) {
      setCaretX(0);
      return;
    }
    const el = txtRef.current;
    const node = el && el.firstChild;
    if (node && node.nodeType === 3 && typeof document !== 'undefined' && document.createRange) {
      try {
        const len = (node.textContent || '').length;
        const idx = Math.max(0, Math.min(len, caret));
        if (idx === 0) {
          setCaretX(0);
          return;
        }
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, idx);
        const w = range.getBoundingClientRect().width;
        setCaretX(Number.isFinite(w) ? w : 0);
        return;
      } catch (_) {}
    }
    let font = '12px "Geovanta Sans", Inter, sans-serif';
    if (typeof window !== 'undefined' && ref.current) {
      const cs = window.getComputedStyle(ref.current);
      font = `${cs.fontWeight || '400'} ${cs.fontSize || '12px'} ${cs.fontFamily || '"Geovanta Sans", Inter, sans-serif'}`;
    }
    const positions = getCharPositions(shown, font);
    const idx = Math.max(0, Math.min(positions.length - 1, caret));
    setCaretX(positions[idx] || 0);
  }, [editing, hasSel, caret, shown]);

  return (
    <div
      ref={ref}
      role="textbox"
      tabIndex={dis ? -1 : 0}
      aria-label={ariaLabel || placeholder}
      aria-invalid={ariaInvalid ? 'true' : undefined}
      aria-disabled={!!dis}
      data-custom-input="true"
      className={'c-inp ' + cls + (dis ? ' dis' : '') + (editing ? ' ed' : '')}
      onFocus={startEdit}
      onBlur={finishEdit}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseDown={e => e.preventDefault()}
      onScroll={e => {
        if (!isDraggingRef.current && e.currentTarget) {
          e.currentTarget.scrollLeft = 0;
        }
      }}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden' }}
    >
      {!shown && !editing && placeholder ? (
        <span className="mut opacity-60 pointer-events-none select-none truncate">{placeholder}</span>
      ) : hasSel ? (
        <span className="c-inp-txt" style={{ display: 'inline-block', whiteSpace: 'pre', padding: 0, margin: 0 }}>
          {beforeSel}
          <span className="c-inp-txt sel" style={{ display: 'inline', padding: 0, margin: 0 }}>{selText}</span>
          {afterSel}
        </span>
      ) : editing ? (
        <span ref={txtRef} className="c-inp-txt" style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre', padding: 0, margin: 0 }}>
          {shown}
          <span className="c-caret" aria-hidden="true" style={{ position: 'absolute', left: `${caretX}px`, top: '50%', transform: 'translateY(-50%)', width: '1.5px', height: '14px', margin: 0, padding: 0, border: 0, background: 'var(--acc)', pointerEvents: 'none', zIndex: 1 }} />
        </span>
      ) : (
        <span className="c-inp-txt" style={{ display: 'inline-block', whiteSpace: 'pre', padding: 0, margin: 0 }}>{shown}</span>
      )}
    </div>
  );
};

/* Input angka kustom (scrubbable label + stepper ▲/▼ + ketik langsung tanpa elemen input native) */

export { CustomTextBox };
export default CustomTextBox;
