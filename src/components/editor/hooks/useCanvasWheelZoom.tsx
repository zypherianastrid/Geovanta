/**
 * @file src/components/editor/hooks/useCanvasWheelZoom.tsx
 * @description Custom hook for canvas viewport navigation, wheel zooming,
 * smooth trackpad panning, bounds fitting, and coordinate centering.
 */

import React, { useEffect, useCallback } from 'react';
import { VZMIN, VZMAX } from '../../../constants/themeAndPrefsConstants.tsx';
import { vinfo } from '../../../renderer/pathInfo.tsx';
import { VE } from '../../../engine/vectorEngine.tsx';

export interface CanvasWheelZoomOptions {
  boxRef: React.MutableRefObject<HTMLDivElement | null>;
  boxRectRef: React.MutableRefObject<DOMRect | null>;
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  dragRef: React.MutableRefObject<any>;
  viewPend: React.MutableRefObject<any>;
  viewSettleTimer: React.MutableRefObject<any>;
  fitPendingRef?: React.MutableRefObject<boolean>;
  docRef: React.MutableRefObject<any>;
  getSelObjs?: () => any[];
  softView: () => void;
  flushView: (skipRaf?: boolean) => void;
}

export interface CanvasWheelZoomApi {
  setZ: (nz: number, cx?: number | null, cy?: number | null, soft?: boolean) => void;
  zoomBy: (f: number, cx?: number | null, cy?: number | null) => void;
  fitTo: (bx: number, by: number, bw: number, bh: number, pad: number) => boolean;
  fitView: () => void;
  fitSel: () => void;
  panTo: (wx: number, wy: number) => void;
}

export function useCanvasWheelZoom(options: CanvasWheelZoomOptions): CanvasWheelZoomApi {
  const {
    boxRef,
    boxRectRef,
    zoomRef,
    panRef,
    dragRef,
    viewPend,
    viewSettleTimer,
    fitPendingRef,
    docRef,
    getSelObjs,
    softView,
    flushView,
  } = options;

  const setZ = useCallback((nz: number, cx: number | null = null, cy: number | null = null, soft = false) => {
    if (!Number.isFinite(nz)) return;
    nz = Math.max(VZMIN, Math.min(VZMAX, nz));
    const s0 = zoomRef.current;
    if (nz === s0 && soft) return;
    const b = boxRef.current;
    if (!b) return;
    const r = soft && boxRectRef.current && boxRectRef.current.width > 0 && (viewPend.current || viewSettleTimer.current)
      ? boxRectRef.current
      : (boxRectRef.current = b.getBoundingClientRect());
    if (!r.width || !r.height) return;
    const px = cx == null ? r.width / 2 : cx - r.left;
    const py = cy == null ? r.height / 2 : cy - r.top;
    const p0 = panRef.current;
    const wx = (px - p0.x) / s0;
    const wy = (py - p0.y) / s0;
    const np = {
      x: px - wx * nz,
      y: py - wy * nz,
    };
    zoomRef.current = nz;
    panRef.current = np;
    if (dragRef.current && dragRef.current.type === 'pan') {
      dragRef.current.px = np.x;
      dragRef.current.py = np.y;
      if (cx != null) {
        dragRef.current.sx = cx;
        dragRef.current.lx = cx;
      }
      if (cy != null) {
        dragRef.current.sy = cy;
        dragRef.current.ly = cy;
      }
    }
    if (soft) softView();
    else flushView();
  }, [boxRef, boxRectRef, zoomRef, panRef, dragRef, viewPend, viewSettleTimer, softView, flushView]);

  const zoomBy = useCallback((f: number, cx: number | null = null, cy: number | null = null) => {
    setZ(zoomRef.current * f, cx, cy, true);
  }, [setZ, zoomRef]);

  const fitTo = useCallback((bx: number, by: number, bw: number, bh: number, pad: number): boolean => {
    const b = boxRef.current;
    if (!b || b.clientWidth <= 0 || b.clientHeight <= 0) return false;
    boxRectRef.current = b.getBoundingClientRect();
    if (![bx, by, bw, bh].every(Number.isFinite) || bw < 0 || bh < 0) return false;
    const inset = Math.min(pad, b.clientWidth / 4, b.clientHeight / 4);
    const s = Math.min(
      VZMAX,
      (b.clientWidth - inset * 2) / Math.max(1e-6, bw),
      (b.clientHeight - inset * 2) / Math.max(1e-6, bh)
    );
    const np = {
      x: (b.clientWidth - bw * s) / 2 - bx * s,
      y: (b.clientHeight - bh * s) / 2 - by * s,
    };
    zoomRef.current = s;
    panRef.current = np;
    flushView(true);
    return true;
  }, [boxRef, boxRectRef, zoomRef, panRef, flushView]);

  const fitView = useCallback(() => {
    const d = docRef.current;
    if (!d) return;
    const bounds = VE.docBounds({
      ...d,
      objects: (d.objects || []).filter((o: any) => o && !o.hidden && (o.opacity ?? 1) > 0 && (o.groupOpacity ?? 1) > 0),
    });
    let [x, y, w, h] = d.viewBox || [0, 0, 800, 600];
    if (bounds?.every(Number.isFinite)) {
      const [left, top, right, bottom] = bounds;
      [x, y, w, h] = [left, top, right - left, bottom - top];
    } else if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
      [x, y, w, h] = [0, 0, 800, 600];
    }
    const success = fitTo(x, y, w, h, 24);
    if (fitPendingRef) {
      fitPendingRef.current = !success;
    }
  }, [docRef, fitTo, fitPendingRef]);

  const fitSel = useCallback(() => {
    const selObjects = getSelObjs ? getSelObjs() : [];
    if (!selObjects || !selObjects.length) {
      return fitView();
    }
    let x0 = 1e18;
    let y0 = 1e18;
    let x1 = -1e18;
    let y1 = -1e18;
    selObjects.forEach((o: any) => {
      const b = vinfo(o).bb;
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    });
    fitTo(x0, y0, x1 - x0 || 1, y1 - y0 || 1, 60);
  }, [getSelObjs, fitView, fitTo]);

  const panTo = useCallback((wx: number, wy: number) => {
    const b = boxRef.current;
    if (!b || !b.clientWidth) return;
    const s = zoomRef.current;
    const np = {
      x: b.clientWidth / 2 - wx * s,
      y: b.clientHeight / 2 - wy * s,
    };
    panRef.current = np;
    flushView();
  }, [boxRef, zoomRef, panRef, flushView]);

  useEffect(() => {
    const b = boxRef.current;
    if (!b) return;
    const wh = (e: WheelEvent) => {
      e.preventDefault();
      if (dragRef.current && dragRef.current.type !== 'pan') return;
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= b.clientHeight;
      // Clamp single event delta to avoid violent zoom leaps
      const clampedDelta = Math.max(-120, Math.min(120, d));
      // Continuous, smooth exponential factor: trackpad pinch (e.ctrlKey) vs standard wheel
      const zoomFactor = e.ctrlKey
        ? Math.exp(-clampedDelta * 0.0035)
        : Math.exp(-clampedDelta * 0.0015);
      setZ(zoomRef.current * zoomFactor, e.clientX, e.clientY, true);
    };
    const noMidScroll = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    b.addEventListener('wheel', wh, { passive: false });
    b.addEventListener('mousedown', noMidScroll, { passive: false });
    b.addEventListener('auxclick', noMidScroll, { passive: false });
    return () => {
      b.removeEventListener('wheel', wh);
      b.removeEventListener('mousedown', noMidScroll);
      b.removeEventListener('auxclick', noMidScroll);
    };
  }, [boxRef, dragRef, zoomRef, setZ]);

  return {
    setZ,
    zoomBy,
    fitTo,
    fitView,
    fitSel,
    panTo,
  };
}
