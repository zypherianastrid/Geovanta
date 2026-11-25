/**
 * @file src/components/editor/CanvasRulers.tsx
 * @description Penggaris kanvas (Rulers), drag guide, drag/reset titik nol (origin), & menu unit mengacu ke VectorCraft
 */
import React, { useEffect, useRef, useState } from 'react';

export type RulerUnit = 'px' | 'pt' | 'mm' | 'cm' | 'in';

export interface GuideLine {
  id: string;
  axis: 'h' | 'v';
  pos: number;
}

export const RULER_UNITS: { id: RulerUnit; label: string; pxPerUnit: number }[] = [
  { id: 'px', label: 'px', pxPerUnit: 1 },
  { id: 'pt', label: 'pt', pxPerUnit: 96 / 72 },
  { id: 'mm', label: 'mm', pxPerUnit: 96 / 25.4 },
  { id: 'cm', label: 'cm', pxPerUnit: 96 / 2.54 },
  { id: 'in', label: 'in', pxPerUnit: 96 },
];

export const RULER_THICKNESS = 20;

export function getUnitMeta(unit: RulerUnit) {
  return RULER_UNITS.find(u => u.id === unit) || RULER_UNITS[0];
}

function niceStep(minUnitStep: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1e-6, minUnitStep))));
  const norm = minUnitStep / pow;
  if (norm <= 1) return pow;
  if (norm <= 2) return 2 * pow;
  if (norm <= 5) return 5 * pow;
  return 10 * pow;
}

interface CanvasRulersProps {
  visible: boolean;
  unit: RulerUnit;
  origin: { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
  guides: GuideLine[];
  guidesVisible: boolean;
  guidesLocked: boolean;
  onAddGuide: (axis: 'h' | 'v', pos: number) => void;
  onMoveGuide: (id: string, pos: number) => void;
  onDeleteGuide: (id: string) => void;
  onSetOrigin: (origin: { x: number; y: number }) => void;
  onSetUnit: (unit: RulerUnit) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  lang?: string;
}

export const CanvasRulers: React.FC<CanvasRulersProps> = ({
  visible,
  unit,
  origin,
  zoom,
  pan,
  guides,
  guidesVisible,
  guidesLocked,
  onAddGuide,
  onMoveGuide,
  onDeleteGuide,
  onSetOrigin,
  onSetUnit,
  containerRef,
  lang = 'id',
}) => {
  const hCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [guideDrag, setGuideDrag] = useState<{ axis: 'h' | 'v'; pos: number; id?: string } | null>(null);
  const [originDrag, setOriginDrag] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, visible]);

  // Paint horizontal & vertical ruler strips
  useEffect(() => {
    if (!visible) return;
    const unitMeta = getUnitMeta(unit);
    const pxPerDoc = zoom;
    const pxPerUnitOnScreen = unitMeta.pxPerUnit * pxPerDoc;
    const majorUnitStep = niceStep(64 / Math.max(0.01, pxPerUnitOnScreen));
    const minorDivs = majorUnitStep >= 10 || majorUnitStep === 1 ? 5 : 4;
    const minorUnitStep = majorUnitStep / minorDivs;

    const paintStrip = (canvas: HTMLCanvasElement | null, isH: boolean) => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const len = isH ? Math.max(1, size.w - RULER_THICKNESS) : Math.max(1, size.h - RULER_THICKNESS);
      const cw = isH ? len : RULER_THICKNESS;
      const ch = isH ? RULER_THICKNESS : len;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#1e1e22';
      ctx.fillRect(0, 0, cw, ch);

      const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#3f3f46';
      const inkColor = getComputedStyle(document.documentElement).getPropertyValue('--mut').trim() || '#a1a1aa';

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (isH) {
        ctx.moveTo(0, ch - 0.5);
        ctx.lineTo(cw, ch - 0.5);
      } else {
        ctx.moveTo(cw - 0.5, 0);
        ctx.lineTo(cw - 0.5, ch);
      }
      ctx.stroke();

      const panOffset = isH ? pan.x - RULER_THICKNESS : pan.y - RULER_THICKNESS;
      const origCoord = isH ? origin.x : origin.y;
      const startDoc = -panOffset / pxPerDoc;
      const endDoc = (len - panOffset) / pxPerDoc;
      const startUnit = Math.floor((startDoc - origCoord) / unitMeta.pxPerUnit / minorUnitStep) * minorUnitStep;
      const endUnit = Math.ceil((endDoc - origCoord) / unitMeta.pxPerUnit / minorUnitStep) * minorUnitStep;

      ctx.fillStyle = inkColor;
      ctx.strokeStyle = inkColor;
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'top';

      let guard = 0;
      for (let u = startUnit; u <= endUnit + minorUnitStep * 0.5 && guard < 2000; u += minorUnitStep, guard++) {
        const docPos = origCoord + u * unitMeta.pxPerUnit;
        const screenPos = docPos * pxPerDoc + panOffset;
        if (screenPos < -2 || screenPos > len + 2) continue;
        const ratio = Math.round(u / majorUnitStep) * majorUnitStep;
        const isMajor = Math.abs(u - ratio) < minorUnitStep * 0.15;
        const tickLen = isMajor ? 10 : 4;
        const p = Math.round(screenPos) + 0.5;
        ctx.beginPath();
        if (isH) {
          ctx.moveTo(p, ch - tickLen);
          ctx.lineTo(p, ch);
        } else {
          ctx.moveTo(cw - tickLen, p);
          ctx.lineTo(cw, p);
        }
        ctx.stroke();

        if (isMajor) {
          const label = Math.abs(ratio) < 1e-6 ? '0' : Number(ratio.toFixed(2)).toString();
          if (isH) {
            ctx.fillText(label, p + 3, 2);
          } else {
            ctx.save();
            ctx.translate(2, p + 3);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'right';
            ctx.fillText(label, 0, 0);
            ctx.restore();
          }
        }
      }
    };

    paintStrip(hCanvasRef.current, true);
    paintStrip(vCanvasRef.current, false);
  }, [visible, unit, origin, zoom, pan, size]);

  const clientToDoc = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, localX: 0, localY: 0 };
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return {
      x: (localX - pan.x) / zoom,
      y: (localY - pan.y) / zoom,
      localX,
      localY,
    };
  };

  const startGuideDrag = (axis: 'h' | 'v', e: React.PointerEvent, existingId?: string) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture?.(e.pointerId);
    const pt = clientToDoc(e.clientX, e.clientY);
    setGuideDrag({ axis, pos: axis === 'h' ? pt.y : pt.x, id: existingId });

    const onMove = (ev: PointerEvent) => {
      const p = clientToDoc(ev.clientX, ev.clientY);
      setGuideDrag({ axis, pos: axis === 'h' ? p.y : p.x, id: existingId });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const p = clientToDoc(ev.clientX, ev.clientY);
      const pos = axis === 'h' ? p.y : p.x;
      const droppedOnRuler = axis === 'h' ? p.localY <= RULER_THICKNESS : p.localX <= RULER_THICKNESS;
      setGuideDrag(null);
      if (droppedOnRuler) {
        if (existingId) onDeleteGuide(existingId);
        return;
      }
      if (existingId) onMoveGuide(existingId, pos);
      else onAddGuide(axis, pos);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startOriginDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const pt = clientToDoc(e.clientX, e.clientY);
    setOriginDrag({ x: pt.x, y: pt.y });

    const onMove = (ev: PointerEvent) => {
      const p = clientToDoc(ev.clientX, ev.clientY);
      setOriginDrag({ x: p.x, y: p.y });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const p = clientToDoc(ev.clientX, ev.clientY);
      setOriginDrag(null);
      if (p.localX > RULER_THICKNESS || p.localY > RULER_THICKNESS) {
        onSetOrigin({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <>
      {/* Guide lines on canvas */}
      {guidesVisible &&
        guides.map(g => {
          const screenPos = (g.pos * zoom) + (g.axis === 'h' ? pan.y : pan.x);
          return (
            <div
              key={g.id}
              data-testid="canvas-guide-line"
              data-axis={g.axis}
              style={{
                position: 'absolute',
                zIndex: 8,
                ...(g.axis === 'h'
                  ? { left: visible ? RULER_THICKNESS : 0, right: 0, top: screenPos - 1, height: 3, cursor: guidesLocked ? 'default' : 'ns-resize' }
                  : { top: visible ? RULER_THICKNESS : 0, bottom: 0, left: screenPos - 1, width: 3, cursor: guidesLocked ? 'default' : 'ew-resize' }),
                pointerEvents: guidesLocked ? 'none' : 'auto',
              }}
              onPointerDown={e => {
                if (!guidesLocked) startGuideDrag(g.axis, e, g.id);
              }}
              onDoubleClick={e => {
                e.stopPropagation();
                if (!guidesLocked) onDeleteGuide(g.id);
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  ...(g.axis === 'h' ? { left: 0, right: 0, top: 1, height: 1 } : { top: 0, bottom: 0, left: 1, width: 1 }),
                  background: '#0ea5e9',
                  opacity: 0.85,
                }}
              />
            </div>
          );
        })}

      {/* Live drag preview for guide */}
      {guideDrag && (
        <div
          style={{
            position: 'absolute',
            zIndex: 12,
            pointerEvents: 'none',
            ...(guideDrag.axis === 'h'
              ? { left: 0, right: 0, top: guideDrag.pos * zoom + pan.y, height: 1, borderTop: '1px dashed #38bdf8' }
              : { top: 0, bottom: 0, left: guideDrag.pos * zoom + pan.x, width: 1, borderLeft: '1px dashed #38bdf8' }),
          }}
        />
      )}

      {/* Live crosshair preview for origin */}
      {originDrag && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 12,
            pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'absolute', left: 0, right: 0, top: originDrag.y * zoom + pan.y, height: 1, borderTop: '1px dashed #f59e0b' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: originDrag.x * zoom + pan.x, width: 1, borderLeft: '1px dashed #f59e0b' }} />
        </div>
      )}

      {visible && (
        <>
          {/* Top-left corner (Origin drag & double-click reset) */}
          <div
            data-testid="canvas-ruler-corner"
            data-unit={unit}
            data-origin={`${Math.round(origin.x)},${Math.round(origin.y)}`}
            title={lang === 'en' ? 'Drag to move ruler origin · Double-click to reset' : 'Seret untuk ubah titik nol · Klik 2x untuk reset'}
            onPointerDown={startOriginDrag}
            onDoubleClick={e => {
              e.stopPropagation();
              onSetOrigin({ x: 0, y: 0 });
            }}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              setCtxMenu({ x: e.clientX, y: e.clientY });
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: RULER_THICKNESS,
              height: RULER_THICKNESS,
              zIndex: 15,
              background: 'var(--card)',
              borderRight: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontFamily: 'monospace',
              color: 'var(--mut)',
              cursor: 'crosshair',
              userSelect: 'none',
            }}
          >
            {unit}
          </div>

          {/* Horizontal ruler */}
          <canvas
            ref={hCanvasRef}
            data-testid="canvas-ruler-h"
            onPointerDown={e => {
              if (e.button === 0) startGuideDrag('h', e);
            }}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              setCtxMenu({ x: e.clientX, y: e.clientY });
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: RULER_THICKNESS,
              width: Math.max(1, size.w - RULER_THICKNESS),
              height: RULER_THICKNESS,
              zIndex: 14,
              cursor: 'ns-resize',
              userSelect: 'none',
            }}
          />

          {/* Vertical ruler */}
          <canvas
            ref={vCanvasRef}
            data-testid="canvas-ruler-v"
            onPointerDown={e => {
              if (e.button === 0) startGuideDrag('v', e);
            }}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              setCtxMenu({ x: e.clientX, y: e.clientY });
            }}
            style={{
              position: 'absolute',
              top: RULER_THICKNESS,
              left: 0,
              width: RULER_THICKNESS,
              height: Math.max(1, size.h - RULER_THICKNESS),
              zIndex: 14,
              cursor: 'ew-resize',
              userSelect: 'none',
            }}
          />
        </>
      )}

      {/* Right-click unit context menu */}
      {ctxMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          onPointerDown={() => setCtxMenu(null)}
          onContextMenu={e => {
            e.preventDefault();
            setCtxMenu(null);
          }}
        >
          <div
            className="flt p-1.5 rounded-xl shadow-xl border border-[var(--line)]"
            style={{
              position: 'fixed',
              left: ctxMenu.x,
              top: ctxMenu.y,
              minWidth: 140,
              background: 'var(--card)',
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div className="text-[10px] mut px-2 py-1 font-semibold uppercase">
              {lang === 'en' ? 'Ruler Units' : 'Satuan Penggaris'}
            </div>
            {RULER_UNITS.map(u => (
              <div
                key={u.id}
                className={'opt' + (unit === u.id ? ' on' : '')}
                onClick={() => {
                  onSetUnit(u.id);
                  setCtxMenu(null);
                }}
              >
                <span>{u.label.toUpperCase()}</span>
                {unit === u.id && <span>✓</span>}
              </div>
            ))}
            <div className="border-t border-[var(--line)] my-1" />
            <div
              className="opt"
              onClick={() => {
                onSetOrigin({ x: 0, y: 0 });
                setCtxMenu(null);
              }}
            >
              <span>{lang === 'en' ? 'Reset Origin (0,0)' : 'Reset Titik Nol (0,0)'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CanvasRulers;
