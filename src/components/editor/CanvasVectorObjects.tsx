/**
 * @file src/components/editor/CanvasVectorObjects.tsx
 * @description Komponen memoized perender elemen SVG kanvas & pratinjau ikon layer (LayerSvgPreview)
 */
import React from 'react';
import { vinfo } from '../../renderer/pathInfo.tsx';
import { Ico } from '../ui/IconGlyphs.tsx';
import { VE } from '../../engine/vectorEngine.tsx';

/* ============================================================================
   PHASE 3 — LAYER PANEL: LIVE SVG SHAPE PREVIEW
   - Menampilkan bentuk miniatur nyata dari objek SVG di setiap baris Layer
   - Menggunakan cache vinfo(o) (WeakMap) & React.memo agar tetap 60fps
   - Mendukung Path, Circle, Rect, Star, Polygon, Image, dan Text
   ============================================================================ */
interface LayerSvgPreviewProps {
  o: any;
  fastScroll?: boolean;
}

const LAYER_PREVIEW_JSX_CACHE = new WeakMap();
const LayerSvgPreview = React.memo<LayerSvgPreviewProps>(({
  o,
  /* SCROLLFIX: true selama scroll layer aktif — dicek SEBELUM cache, supaya
     baris yang masuk kembali ke window saat scroll juga mount ikon generik
     (bukan preview penuh dari cache). Prop ini juga yang menginvalidasi memo
     saat settle, jadi preview penuh benar-benar kembali setelah scroll
     berhenti (sebelumnya: memo bail-out membuat ikon generik menempel
     permanen pada baris yang ke-mount saat fast-scroll). */
  fastScroll
}) => {
  if (!o) return null;
  if (fastScroll) return <Ico n="shapes" size={15} />;
  const cachedEl = LAYER_PREVIEW_JSX_CACHE.get(o);
  if (cachedEl !== undefined) return cachedEl;
  if (o.img) {
    const el = <svg width="16" height="16" viewBox="0 0 16 16" className="block flex-none" style={{
      borderRadius: 3,
      overflow: 'hidden',
      background: 'var(--sub)'
    }}><image href={o.img.href} x="1" y="1" width="14" height="14" preserveAspectRatio="xMidYMid slice" /></svg>;
    LAYER_PREVIEW_JSX_CACHE.set(o, el);
    return el;
  }
  if (o.type === 'text' || o.text != null) {
    const el = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="block flex-none"><path d="M4 5h16M12 5v15M8 20h8M5 5v3M19 5v3" /></svg>;
    LAYER_PREVIEW_JSX_CACHE.set(o, el);
    return el;
  }
  const info = vinfo(o);
  const bb = info && info.bb;
  if (!bb || info.n > 120 || !isFinite(bb[0]) || bb[2] < bb[0] || bb[3] < bb[1]) {
    const fallbackEl = <Ico n="shapes" size={15} />;
    LAYER_PREVIEW_JSX_CACHE.set(o, fallbackEl);
    return fallbackEl;
  }
  const bw = Math.max(1e-3, bb[2] - bb[0]);
  const bh = Math.max(1e-3, bb[3] - bb[1]);
  const maxDim = Math.max(bw, bh);
  const pad = maxDim * 0.14;
  const cx = (bb[0] + bb[2]) * 0.5;
  const cy = (bb[1] + bb[3]) * 0.5;
  const vbSize = maxDim + pad * 2;
  const vx = cx - vbSize * 0.5;
  const vy = cy - vbSize * 0.5;
  const hasFill = o.fill && o.fill !== 'none' && o.fill !== 'transparent';
  const hasStroke = o.stroke && o.stroke !== 'none' && o.stroke !== 'transparent' && (o.strokeWidth || 0) > 0;
  const fillCol = hasFill ? o.fill : 'none';
  const strokeCol = hasStroke ? o.stroke : !hasFill ? 'currentColor' : 'none';
  const sw = hasStroke ? Math.min(2.2, Math.max(1.1, o.strokeWidth ? 1.35 : 1.2)) : !hasFill ? 1.4 : 0;
  const swVb = sw > 0 ? sw * (vbSize / 16) : 0;
  const el = <svg width="16" height="16" viewBox={`${vx} ${vy} ${vbSize} ${vbSize}`} className="block flex-none" style={{
    overflow: 'visible'
  }}><path d={info.d} fill={fillCol} fillRule={o.fillRule || 'nonzero'} stroke={strokeCol} strokeWidth={swVb} strokeLinejoin={o.strokeLinejoin || 'round'} strokeLinecap={o.strokeLinecap || 'round'} opacity={Math.max(0.35, o.opacity ?? 1)} /></svg>;
  LAYER_PREVIEW_JSX_CACHE.set(o, el);
  return el;
}, (prev, next) => prev.o === next.o && prev.fastScroll === next.fastScroll);

export { LayerSvgPreview };
