/**
 * @file src/components/editor/GradientCanvasGizmo.tsx
 * @description Gizmo interaktif manipulasi titik & stop gradien langsung di atas kanvas (GradientCanvasGizmo)
 */
import React from 'react';
import { VE } from '../../engine/vectorEngine.tsx';
import { clampN } from '../../utils/colorMath.tsx';

export interface GradientCanvasGizmoProps {
  obj: any;
  zoom: number;
  toDoc: (x: number, y: number) => { x: number; y: number };
  commitObjs: (mutator: (o: any) => any, histKey?: string) => void;
  live: (doc: any, opts?: any) => void;
  docRef: React.MutableRefObject<any>;
  push: (doc: any, key: string) => void;
  activeStopId: string | null;
  setActiveStopId?: (id: string | null) => void;
  slot?: 'fill' | 'stroke';
}

const GradientCanvasGizmo: React.FC<GradientCanvasGizmoProps> = ({
  obj,
  zoom,
  toDoc,
  commitObjs,
  live,
  docRef,
  push,
  activeStopId,
  setActiveStopId,
  slot = 'fill'
}) => {
  const isStroke = slot === 'stroke';
  if (!obj || (isStroke ? !VE.strokeGradOn(obj) : !VE.gradOn(obj))) return null;
  const g = isStroke ? obj.strokeGrad : obj.grad;
  if (!g) return null;

  const rawStops = g.rawStops && g.rawStops.length >= 2 ? g.rawStops : g.stops || [];
  const isRad = g.type === 'radial';
  const isAng = g.type === 'angular';
  const isCirc = isRad || isAng;
  const ang = g.handleAng != null ? g.handleAng : (g.angle != null ? g.angle * Math.PI / 180 : 0);
  const p1 = isCirc ? {
    x: g.cx,
    y: g.cy
  } : {
    x: g.x1,
    y: g.y1
  };
  const p2 = isCirc ? {
    x: g.cx + Math.cos(ang) * g.r,
    y: g.cy + Math.sin(ang) * g.r
  } : {
    x: g.x2,
    y: g.y2
  };
  const pf = isRad ? {
    x: g.fx != null ? g.fx : g.cx,
    y: g.fy != null ? g.fy : g.cy
  } : null;

  /* Drag handler langsung ke state dokumen tanpa lag (live preview + push history saat lepas) */
  const startGizmoDrag = (e: any, mode: string, stopPayload: any = null) => {
    e.stopPropagation();
    e.preventDefault();
    const baseDoc = docRef.current;
    let moved = false;
    const startPt = toDoc(e.clientX, e.clientY);
    const baseObj = baseDoc.objects.find(o => o.id === obj.id);
    const gradKey = isStroke ? 'strokeGrad' : 'grad';
    const baseG = baseObj && baseObj[gradKey] ? baseObj[gradKey] : g;

    const onMove = ev => {
      const pt = toDoc(ev.clientX, ev.clientY);
      moved = true;
      const nextObjects = baseDoc.objects.map(o => {
        if (o.id !== obj.id) return o;
        const m = VE.ensureGradModel(o, undefined, slot);
        const gg = {
          ...m[gradKey]
        };
        if (mode === 'move') {
          /* Geser seluruh gradient (posisi bebas): semua titik kontrol ikut bergeser sama */
          let dx = pt.x - startPt.x,
            dy = pt.y - startPt.y;
          if (ev.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
          }
          const B = baseG;
          if (isCirc) {
            gg.cx = VE.rd(B.cx + dx);
            gg.cy = VE.rd(B.cy + dy);
            if (B.fx != null) gg.fx = VE.rd(B.fx + dx);
            if (B.fy != null) gg.fy = VE.rd(B.fy + dy);
          } else {
            gg.x1 = VE.rd(B.x1 + dx);
            gg.y1 = VE.rd(B.y1 + dy);
            gg.x2 = VE.rd(B.x2 + dx);
            gg.y2 = VE.rd(B.y2 + dy);
          }
          return {
            ...m,
            [gradKey]: gg
          };
        }
        if (mode === 'p1') {
          if (isCirc) {
            const dx = pt.x - gg.cx,
              dy = pt.y - gg.cy,
              ofx = gg.fx ?? gg.cx,
              ofy = gg.fy ?? gg.cy;
            gg.cx = VE.rd(pt.x);
            gg.cy = VE.rd(pt.y);
            if (isRad) {
              gg.fx = VE.rd(ofx + dx);
              gg.fy = VE.rd(ofy + dy);
            }
          } else {
            let nx = pt.x,
              ny = pt.y;
            if (ev.shiftKey) {
              const L = Math.hypot(nx - gg.x2, ny - gg.y2),
                a = Math.round(Math.atan2(ny - gg.y2, nx - gg.x2) / (Math.PI / 12)) * (Math.PI / 12);
              nx = gg.x2 + Math.cos(a) * L;
              ny = gg.y2 + Math.sin(a) * L;
            }
            gg.x1 = VE.rd(nx);
            gg.y1 = VE.rd(ny);
          }
          return {
            ...m,
            [gradKey]: gg
          };
        }
        if (mode === 'p2') {
          if (isCirc) {
            gg.r = VE.rd(Math.max(2, Math.hypot(pt.x - gg.cx, pt.y - gg.cy)));
            const newAng = Math.atan2(pt.y - gg.cy, pt.x - gg.cx);
            gg.handleAng = newAng;
            if (isAng) {
              let deg = Math.round(newAng * 1800 / Math.PI) / 10;
              if (deg < 0) deg += 360;
              gg.angle = deg;
            }
          } else {
            let nx = pt.x,
              ny = pt.y;
            if (ev.shiftKey) {
              const L = Math.hypot(nx - gg.x1, ny - gg.y1),
                a = Math.round(Math.atan2(ny - gg.y1, nx - gg.x1) / (Math.PI / 12)) * (Math.PI / 12);
              nx = gg.x1 + Math.cos(a) * L;
              ny = gg.y1 + Math.sin(a) * L;
            }
            gg.x2 = VE.rd(nx);
            gg.y2 = VE.rd(ny);
          }
          return {
            ...m,
            [gradKey]: gg
          };
        }
        if (mode === 'focal' && isRad) {
          /* Batasi titik fokus (fx, fy) agar tetap berada di dalam lingkaran r (95%) */
          let dx = pt.x - gg.cx,
            dy = pt.y - gg.cy,
            d = Math.hypot(dx, dy),
            maxR = gg.r * 0.95;
          if (d > maxR) {
            dx = dx / d * maxR;
            dy = dy / d * maxR;
          }
          gg.fx = VE.rd(gg.cx + dx);
          gg.fy = VE.rd(gg.cy + dy);
          return {
            ...m,
            [gradKey]: gg
          };
        }
        if (mode === 'stop') {
          const t = VE.projectPointToGrad(gg, pt);
          const nextRaw = gg.rawStops.map((s, idx) => (stopPayload.id ? s.id === stopPayload.id : idx === stopPayload.idx) ? {
            ...s,
            offset: VE.rd(t)
          } : s);
          return VE.updateGradStops(m, nextRaw, null, slot);
        }
        if (mode === 'mid') {
          const t = VE.projectPointToGrad(gg, pt);
          const {
            a,
            b
          } = stopPayload;
          const span = Math.max(1e-4, b.offset - a.offset);
          const mid = clampN((t - a.offset) / span, 0.15, 0.85);
          const nextRaw = gg.rawStops.map(s => s.id === a.id ? {
            ...s,
            mid: VE.rd(mid)
          } : s);
          return VE.updateGradStops(m, nextRaw, null, slot);
        }
        return m;
      });
      live({
        ...baseDoc,
        objects: nextObjects
      }, {
        isLive: true,
        onlyPaint: true
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved && docRef.current !== baseDoc) push(docRef.current, 'grad-gizmo');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* Klik ganda pada garis gizmo di kanvas untuk menyisipkan stop baru tepat di titik tersebut */
  const onLineDblClick = e => {
    e.stopPropagation();
    const pt = toDoc(e.clientX, e.clientY);
    const t = VE.projectPointToGrad(g, pt);
    const smp = VE.sampleGradAt(rawStops, t);
    const newId = VE.uid();
    commitObjs(o => {
      if (o.id !== obj.id) return o;
      const m = VE.ensureGradModel(o, undefined, slot);
      const gradKey = isStroke ? 'strokeGrad' : 'grad';
      return VE.updateGradStops(m, [...(m[gradKey].rawStops || []), {
        id: newId,
        offset: VE.rd(t),
        color: smp.color,
        op: smp.op,
        mid: 0.5
      }], null, slot);
    });
    setActiveStopId && setActiveStopId(newId);
  };

  /* Ukuran gizmo dikunci proporsional agar tidak meledak saat zoom out */
  const bb = VE.tightBBox(obj);
  const objW = Math.abs(bb[2] - bb[0]);
  const objH = Math.abs(bb[3] - bb[1]);
  const objDim = Math.max(16, Math.min(objW, objH));
  const zEff = Math.max(0.85, zoom);
  const maxGzScale = Math.max(1.0, (objDim * 0.18) / 6.5);
  const gzScale = Math.min(1 / zEff, maxGzScale, 2.5);

  return (
    <g className="ved-grad-gizmo" data-grad-slot={slot} data-drag-id={obj.id}>
      {isCirc && (
        <circle
          cx={g.cx}
          cy={g.cy}
          r={g.r}
          fill="none"
          stroke={isStroke ? '#f59e0b' : 'var(--acc)'}
          strokeWidth={1.4 * gzScale}
          strokeDasharray={5 * gzScale + ' ' + 3 * gzScale}
          pointerEvents="none"
        />
      )}
      {isCirc && (
        <circle
          cx={g.cx}
          cy={g.cy}
          r={g.r}
          fill="none"
          stroke="transparent"
          strokeWidth={12 * gzScale}
          style={{ cursor: 'move' }}
          onPointerDown={e => startGizmoDrag(e, 'move')}
          onDoubleClick={onLineDblClick}
        />
      )}
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="#ffffff"
        strokeWidth={4 * gzScale}
        strokeLinecap="round"
        opacity="0.75"
        pointerEvents="none"
      />
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={isStroke ? '#f59e0b' : 'var(--acc)'}
        strokeWidth={2 * gzScale}
        strokeDasharray={isStroke ? 4 * gzScale + ' ' + 3 * gzScale : undefined}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="transparent"
        strokeWidth={14 * gzScale}
        strokeLinecap="round"
        style={{ cursor: 'move' }}
        onPointerDown={e => startGizmoDrag(e, 'move')}
        onDoubleClick={onLineDblClick}
      />
      {rawStops.slice(0, -1).map(a => {
        const b = rawStops[rawStops.indexOf(a) + 1];
        if (!b) return null;
        if (rawStops.length > 8 && !(a.id === activeStopId || b.id === activeStopId)) return null;
        const t = a.offset + (b.offset - a.offset) * (a.mid ?? 0.5);
        const mp = VE.gradPointAt(g, t),
          sz = 4.2 * gzScale;
        return (
          <rect
            key={'gm-' + a.id}
            x={mp.x - sz}
            y={mp.y - sz}
            width={sz * 2}
            height={sz * 2}
            transform={'rotate(45 ' + mp.x + ' ' + mp.y + ')'}
            fill="#ffffff"
            stroke={isStroke ? '#f59e0b' : 'var(--acc)'}
            strokeWidth={1.3 * gzScale}
            style={{ cursor: 'grab' }}
            onPointerDown={e => startGizmoDrag(e, 'mid', { a, b })}
          />
        );
      })}
      {rawStops.map((s, idx) => {
        const sp = VE.gradPointAt(g, s.offset),
          on = s.id ? s.id === activeStopId : idx === 0;
        return (
          <circle
            key={'gs-' + (s.id || idx)}
            cx={sp.x}
            cy={sp.y}
            r={(on ? 6.5 : rawStops.length > 8 ? 3.5 : 5) * gzScale}
            fill={s.color}
            stroke="#ffffff"
            strokeWidth={(on ? 2.2 : 1.5) * gzScale}
            style={{
              cursor: 'grab',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))'
            }}
            onPointerDown={e => {
              setActiveStopId && setActiveStopId(s.id);
              startGizmoDrag(e, 'stop', { ...s, idx });
            }}
          />
        );
      })}
      <circle
        cx={p1.x}
        cy={p1.y}
        r={6.5 * gzScale}
        fill="#ffffff"
        stroke={isStroke ? '#f59e0b' : 'var(--acc)'}
        strokeWidth={2.2 * gzScale}
        style={{ cursor: 'move' }}
        onPointerDown={e => startGizmoDrag(e, 'p1')}
      />
      <circle
        cx={p2.x}
        cy={p2.y}
        r={6.5 * gzScale}
        fill={isStroke ? '#f59e0b' : 'var(--acc)'}
        stroke="#ffffff"
        strokeWidth={2 * gzScale}
        style={{ cursor: 'move' }}
        onPointerDown={e => startGizmoDrag(e, 'p2')}
      />
      {isRad && pf && (
        <rect
          x={pf.x - 4.5 * gzScale}
          y={pf.y - 4.5 * gzScale}
          width={9 * gzScale}
          height={9 * gzScale}
          transform={'rotate(45 ' + pf.x + ' ' + pf.y + ')'}
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth={1.5 * gzScale}
          style={{ cursor: 'move' }}
          onPointerDown={e => startGizmoDrag(e, 'focal')}
        />
      )}
    </g>
  );
};

export { GradientCanvasGizmo };
export default GradientCanvasGizmo;
