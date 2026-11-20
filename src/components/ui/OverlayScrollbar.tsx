/**
 * @file src/components/ui/OverlayScrollbar.tsx
 * @description Custom DOM overlay scrollbar that preserves Geovanta's custom SVG cursor on hover and drag
 */
import React, { useEffect, useRef, useState } from 'react';

export interface OverlayScrollbarProps {
  scrollRef: React.RefObject<HTMLElement | null>;
  testIdPrefix?: string;
}

const MIN_THUMB_PX = 28;

const OverlayScrollbar: React.FC<OverlayScrollbarProps> = ({
  scrollRef,
  testIdPrefix = 'overlay-scrollbar'
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startY: number;
    startScrollTop: number;
    thumbHeight: number;
    trackHeight: number;
  }>({
    active: false,
    pointerId: -1,
    startY: 0,
    startScrollTop: 0,
    thumbHeight: MIN_THUMB_PX,
    trackHeight: 0
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const trackEl = trackRef.current;
    const thumbEl = thumbRef.current;
    if (!scrollEl || !trackEl || !thumbEl) return;

    let rafId = 0;

    const syncMetrics = () => {
      rafId = 0;
      const clientH = scrollEl.clientHeight;
      const scrollH = scrollEl.scrollHeight;
      const maxScroll = scrollH - clientH;

      if (maxScroll <= 1 || clientH <= 0) {
        trackEl.style.opacity = '0';
        trackEl.style.pointerEvents = 'none';
        return;
      }

      const trackH = trackEl.clientHeight || Math.max(0, clientH - 4);
      const thumbH = Math.max(MIN_THUMB_PX, Math.min(trackH, (clientH / scrollH) * trackH));
      const maxTravel = Math.max(0, trackH - thumbH);
      const ratio = Math.max(0, Math.min(1, scrollEl.scrollTop / maxScroll));
      const thumbTop = ratio * maxTravel;

      trackEl.style.opacity = '1';
      trackEl.style.pointerEvents = 'auto';
      thumbEl.style.height = `${thumbH.toFixed(2)}px`;
      thumbEl.style.transform = `translate3d(0, ${thumbTop.toFixed(2)}px, 0)`;
    };

    const scheduleSync = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(syncMetrics);
    };

    syncMetrics();

    scrollEl.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleSync);
      ro.observe(scrollEl);
    }

    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(scheduleSync);
      mo.observe(scrollEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden']
      });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      scrollEl.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
    };
  }, [scrollRef]);

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const scrollEl = scrollRef.current;
    const trackEl = trackRef.current;
    const thumbEl = thumbRef.current;
    if (!scrollEl || !trackEl || !thumbEl) return;

    const trackRect = trackEl.getBoundingClientRect();
    const thumbRect = thumbEl.getBoundingClientRect();
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      startScrollTop: scrollEl.scrollTop,
      thumbHeight: thumbRect.height,
      trackHeight: trackRect.height
    };
    setDragging(true);
    try {
      thumbEl.setPointerCapture(e.pointerId);
    } catch (_err) {}
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    const maxTravel = Math.max(1, d.trackHeight - d.thumbHeight);
    const dy = e.clientY - d.startY;
    scrollEl.scrollTop = Math.max(0, Math.min(maxScroll, d.startScrollTop + (dy / maxTravel) * maxScroll));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    d.active = false;
    d.pointerId = -1;
    setDragging(false);
    try {
      thumbRef.current?.releasePointerCapture(e.pointerId);
    } catch (_err) {}
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target === thumbRef.current) return;
    e.preventDefault();
    const scrollEl = scrollRef.current;
    const trackEl = trackRef.current;
    const thumbEl = thumbRef.current;
    if (!scrollEl || !trackEl || !thumbEl) return;

    const trackRect = trackEl.getBoundingClientRect();
    const thumbH = thumbEl.getBoundingClientRect().height || MIN_THUMB_PX;
    const clickY = e.clientY - trackRect.top;
    const maxTravel = Math.max(1, trackRect.height - thumbH);
    const ratio = Math.max(0, Math.min(1, (clickY - thumbH / 2) / maxTravel));
    const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    scrollEl.scrollTop = ratio * maxScroll;
  };

  return (
    <div
      ref={trackRef}
      className={'gv-ov-sb-track' + (dragging ? ' dragging' : '')}
      data-testid={testIdPrefix}
      aria-hidden="true"
      onPointerDown={onTrackPointerDown}
      style={{ opacity: 0, pointerEvents: 'none' }}
    >
      <div
        ref={thumbRef}
        className={'gv-ov-sb-thumb' + (dragging ? ' dragging' : '')}
        data-testid={`${testIdPrefix}-thumb`}
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </div>
  );
};

export { OverlayScrollbar };
export default OverlayScrollbar;
