import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {legacyTextSpec, legacyTextBounds} from '../../engine/legacyText.tsx';

type TextEditCamera = { zoom: number; pan: { x: number; y: number } };
type TextEditViewport = { setCamera: (zoom: number, pan: TextEditCamera['pan']) => void };
type TextEditBounds = number[] & { lineAdvancePx?: number; resolvedLineHeightPx?: number; family?: string; drawY?: number };
type TextEditOverlayProps = TextEditCamera & {
  object: any;
  fontVersion?: number;
  renderGlyphsOnCanvas?: boolean;
  isNew?: boolean;
  caret?: number;
  onCommit: (value: string) => void;
  onLiveChange?: (value: string, caretOffset: number) => void;
  measureText?: (object: any) => TextEditBounds | null;
  lang?: string;
};

export const TextEditOverlay = forwardRef<TextEditViewport, TextEditOverlayProps>(function TextEditOverlay({
  object, zoom: initialZoom, pan: initialPan, fontVersion = 0, renderGlyphsOnCanvas = false, isNew, caret, onCommit, onLiveChange, measureText, lang = 'id'
}, viewportRef) {
  const [camera, setCamera] = useState<TextEditCamera | null>(null);
  const {zoom, pan} = camera || {zoom: initialZoom, pan: initialPan};
  useImperativeHandle(viewportRef, () => ({
    setCamera(zoom, pan) {
      setCamera(previous => previous?.zoom === zoom && previous.pan.x === pan.x && previous.pan.y === pan.y
        ? previous
        : {zoom, pan: {x: pan.x, y: pan.y}});
    }
  }), []);
  const spec = legacyTextSpec(object);
  const [value, setValue] = useState(spec.content);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    setValue(spec.content);
  }, [object.id]);

  useEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    editor.focus({preventScroll: true});
    if (caret != null) editor.setSelectionRange(caret, caret);
    else if (!isNew) {
      editor.setSelectionRange(0, editor.value.length, 'backward');
      editor.scrollTop = 0;
      editor.scrollLeft = 0;
    }
  }, [object.id, caret]);

  const finish = () => {
    if (!done.current) {
      done.current = true;
      onCommit(value);
    }
  };

  const {measuredBounds, bounds} = useMemo(() => {
    const preview = {...object, text: {...legacyTextSpec(object), content: value}};
    let measuredBounds = null;
    try { measuredBounds = measureText?.(preview); } catch {
      // An unavailable CanvasKit layout still allows text editing.
    }
    return {measuredBounds, bounds: measuredBounds || legacyTextBounds(preview)};
  }, [object, value, measureText, fontVersion]);
  const useCanvasGlyphs = renderGlyphsOnCanvas && Boolean(measuredBounds);
  const [bx0, by0, bx1, by1] = bounds || [
    spec.x,
    spec.y - spec.fontSize,
    spec.x + spec.fontSize * 2,
    spec.y + spec.fontSize * 0.25
  ];
  const resolvedLineHeightPx = (measuredBounds && typeof measuredBounds.resolvedLineHeightPx === 'number' && Number.isFinite(measuredBounds.resolvedLineHeightPx))
    ? measuredBounds.resolvedLineHeightPx
    : spec.fontSize * spec.lineHeight;
  const activeFamily = (measuredBounds && typeof measuredBounds.family === 'string' && measuredBounds.family)
    ? measuredBounds.family
    : spec.fontFamily;
  const screenLeft = pan.x + bx0 * zoom;
  const screenTop = pan.y + by0 * zoom;
  const screenW = Math.max(1, (bx1 - bx0) * zoom);
  const screenH = Math.max(1, (by1 - by0) * zoom);
  const textOffset = ((measuredBounds?.drawY ?? by0) - by0) * zoom;
  const rotationOrigin = `${(spec.x - bx0) * zoom}px ${(spec.y - by0) * zoom}px`;

  const textTransform = spec.textCase === 'upper'
    ? 'uppercase'
    : spec.textCase === 'lower'
      ? 'lowercase'
      : spec.textCase === 'title'
        ? 'capitalize'
        : 'none';

  const textDecoration = spec.textDecoration === 'underline'
    ? 'underline'
    : spec.textDecoration === 'strikethrough'
      ? 'line-through'
      : 'none';

  const textAlign = spec.textAnchor === 'middle'
    ? 'center'
    : spec.textAnchor === 'end'
      ? 'right'
      : spec.textAnchor === 'justify'
        ? 'justify'
        : 'left';

  const effFontSize = spec.fontSize * zoom;
  const lineAdvance = measuredBounds?.lineAdvancePx;
  const effLineHeightPx = (lineAdvance > 0 ? lineAdvance : resolvedLineHeightPx) * zoom;
  const fontFamilyCss = activeFamily !== spec.fontFamily
    ? `"${activeFamily}", "${spec.fontFamily}", sans-serif`
    : `"${spec.fontFamily}", "IBM Plex Sans", sans-serif`;

  const isMobile = typeof document !== 'undefined' && (
    document.documentElement.dataset.mobile === '1' ||
    (typeof window !== 'undefined' && window.innerWidth <= 800)
  );

  return (
    <div
      data-testid="text-edit-overlay"
      onPointerDown={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        zIndex: 45,
        left: `${screenLeft}px`,
        top: `${screenTop}px`,
        width: `${screenW}px`,
        height: `${screenH}px`,
        transform: object.rot ? `rotate(${-object.rot}deg)` : undefined,
        transformOrigin: rotationOrigin,
        border: 'none',
        boxSizing: 'border-box',
        background: 'transparent',
        pointerEvents: 'auto'
      }}
    >
      {/* Seleksi teks di dalam overlay JANGAN membalik warna (putih di atas
          biru): itu membuat font terlihat "berubah" saat double-click
          (select-all). ::selection tidak bisa inline, jadi via <style>
          ter-scope pada class textarea ini. */}
      <style>{`
        .ve-text-edit-textarea::selection { background: var(--fig-sel); color: inherit; }
        .ve-text-edit-textarea[data-canvas-glyphs]::selection {
          background: color-mix(in srgb, var(--acc) 18%, transparent);
          color: transparent;
        }
      `}</style>
      <textarea
        ref={ref}
        className="ve-text-edit-textarea"
        data-canvas-glyphs={useCanvasGlyphs ? true : undefined}
        aria-label="Edit text"
        value={value}
        // G6: spellcheck eksplisit (ala Figma) + lang mengikuti bahasa
        // aplikasi ('id' default) agar kamus yang dipakai benar.
        spellCheck
        lang={lang}
        rows={1}
        onChange={e => {
          const next = e.target.value;
          setValue(next);
          onLiveChange?.(next, e.target.selectionEnd);
        }}
        onPointerDown={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            finish();
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            finish();
          }
        }}
        onBlur={finish}
        style={{
          position: 'absolute',
          top: `${textOffset}px`,
          display: 'block',
          width: '100%',
          height: `${Math.max(effLineHeightPx, screenH - textOffset)}px`,
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          verticalAlign: 'top',
          fontFamily: fontFamilyCss,
          fontSize: `${effFontSize}px`,
          lineHeight: `${effLineHeightPx}px`,
          letterSpacing: `${spec.letterSpacing * zoom}px`,
          fontWeight: spec.fontWeight,
          fontStyle: spec.fontStyle,
          color: useCanvasGlyphs ? 'transparent' : spec.fill,
          textAlign,
          textTransform,
          textDecoration,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          whiteSpace: spec.resizing === 'autoWidth' ? 'pre' : 'pre-wrap',
          wordBreak: 'break-word',
          caretColor: 'var(--acc)'
        }}
      />
      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        outline: '1px solid var(--acc)',
        outlineOffset: '-0.5px',
        pointerEvents: 'none'
      }}>
        {[
          {left: -3, top: -3},
          {right: -3, top: -3},
          {left: -3, bottom: -3},
          {right: -3, bottom: -3}
        ].map((pos, idx) => (
          <span
            key={idx}
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              boxSizing: 'border-box',
              background: '#ffffff',
              border: '1px solid var(--acc)',
              pointerEvents: 'none',
              ...pos
            }}
          />
        ))}
      </div>
      {isMobile && (
        <div
          data-testid="text-edit-accessory-bar"
          className="mob-text-accessory-bar fade"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold mut px-1">Teks</span>
            <span className="text-[11px] mut font-mono">{value.length} kar</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="text-edit-done-btn"
              className="btn pri mob-text-done-btn"
              onClick={finish}
            >
              ✓ Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
export default TextEditOverlay;
