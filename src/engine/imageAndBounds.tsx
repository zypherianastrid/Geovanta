/**
 * @file src/engine/imageAndBounds.tsx
 * @description Geometri gambar dan batas dokumen
 */
import { uid, rd, mmul } from './vectorPrimitives.tsx';
import { parsePath } from './svgPathParser.tsx';
import { serializePath } from './svgPathSerializer.tsx';
import { computeViewBoxTransform } from './transformMatrixParser.tsx';
import { mapGrad } from './gradientEngine.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { isLegacyText, legacyTextBounds } from './legacyText.tsx';
import { hasVisibleStroke, strokeOutwardExtent } from './strokeStyles.tsx';

function isSafeImageHref(href) {
  if (typeof href !== 'string') return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (/^(javascript|vbscript):/i.test(trimmed)) return false;
  if (/^data:/i.test(trimmed)) {
    return /^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp|ico|avif);/i.test(trimmed);
  }
  return true;
}

/* ---- Geometri gambar SVG preserveAspectRatio untuk editor dan ekspor ---- */
function makeImageObj(href: string, w: number, h: number, x: number = 0, y: number = 0, name: string = 'image', par: string = 'xMidYMid meet', m: any = [1, 0, 0, 1, 0, 0], naturalW: number = w, naturalH: number = h) {
  if (!isSafeImageHref(href)) href = '';
  const d = 'M' + x + ' ' + y + 'L' + (x + w) + ' ' + y + 'L' + (x + w) + ' ' + (y + h) + 'L' + x + ' ' + (y + h) + 'Z';
  return {
    id: uid(),
    name: name || 'image',
    type: 'image',
    fill: '#000000',
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
    fillRule: 'nonzero',
    group: null,
    img: {
      href,
      w,
      h,
      naturalW: naturalW || w,
      naturalH: naturalH || h,
      par: par || 'xMidYMid meet'
    },
    subs: parsePath(d, m || [1, 0, 0, 1, 0, 0])
  };
}
function imageMatrix(o) {
  const im = o.img,
    ns = o.subs[0] && o.subs[0].nodes;
  if (!im || !ns || ns.length < 2) return null;
  if (ns.length === 4 && !ns.some(n => n.handleIn || n.handleOut)) {
    const p0 = ns[0],
      p1 = ns[1],
      p3 = ns[3];
    return [(p1.x - p0.x) / im.w, (p1.y - p0.y) / im.w, (p3.x - p0.x) / im.h, (p3.y - p0.y) / im.h, p0.x, p0.y];
  }
  let x0 = 1e18,
    y0 = 1e18,
    x1 = -1e18,
    y1 = -1e18;
  ns.forEach(n => {
    x0 = Math.min(x0, n.x);
    x1 = Math.max(x1, n.x);
    y0 = Math.min(y0, n.y);
    y1 = Math.max(y1, n.y);
  });
  return [(x1 - x0) / im.w, 0, 0, (y1 - y0) / im.h, x0, y0];
}
/* GV-A10: Hitung matriks efektif & batas clip untuk objek gambar berdasarkan preserveAspectRatio & ukuran natural gambar */
/* GV-A10: Hitung matriks efektif & batas clip untuk objek gambar berdasarkan preserveAspectRatio & ukuran natural gambar */
function computeImageParGeometry(o, naturalW, naturalH) {
  const baseM = imageMatrix(o);
  if (!baseM || !o || !o.img) return null;
  const vw = o.img.w || 1,
    vh = o.img.h || 1;
  const nw = Number(naturalW) || Number(o.img.naturalW) || vw;
  const nh = Number(naturalH) || Number(o.img.naturalH) || vh;
  const par = o.img.par || 'xMidYMid meet';
  const vbt = computeViewBoxTransform([0, 0, nw, nh], vw, vh, par, 0, 0);
  /* vbt.matrix memetakan [0..nw, 0..nh] -> [0..vw, 0..vh]; baseM memetakan [0..vw, 0..vh] -> world */
  const drawW = nw * vbt.sx,
    drawH = nh * vbt.sy;
  const drawX = vbt.tx,
    drawY = vbt.ty;
  /* Matriks efektif untuk menggambar quad [0..vw, 0..vh] di ruang dunia */
  const subMat = [drawW / vw, 0, 0, drawH / vh, drawX, drawY];
  const effMatrix = mmul(baseM, subMat);
  return {
    baseMatrix: baseM,
    effMatrix,
    drawX,
    drawY,
    drawW,
    drawH,
    clip: vbt.clip,
    align: vbt.align,
    meetOrSlice: vbt.meetOrSlice
  };
}
/* skala objek terhadap titik tetap (ax,ay) dengan faktor k (node + handle) */
/* skala objek terhadap titik tetap (ax,ay) dengan faktor k (node + handle) */
function scaleObj(o, ax, ay, k) {
  const f = q => q && {
    x: ax + (q.x - ax) * k,
    y: ay + (q.y - ay) * k
  };
  let nextClipPathD = o.clipPathD;
  if (o.clipPathD) {
    try {
      const cSubs = parsePath(o.clipPathD);
      const sSubs = cSubs.map(sp => ({
        ...sp,
        nodes: sp.nodes.map(n => ({
          ...n,
          x: ax + (n.x - ax) * k,
          y: ay + (n.y - ay) * k,
          handleIn: f(n.handleIn),
          handleOut: f(n.handleOut)
        }))
      }));
      nextClipPathD = serializePath({ subs: sSubs });
    } catch (e) {}
  }
  const next = {
    ...o,
    ...(nextClipPathD !== o.clipPathD ? {
      clipPathD: nextClipPathD
    } : {}),
    grad: mapGrad(o.grad, f, k),
    ...(o.strokeGrad ? {
      strokeGrad: mapGrad(o.strokeGrad, f, k)
    } : {}),
    subs: o.subs.map(sp => ({
      ...sp,
      nodes: sp.nodes.map(n => ({
        ...n,
        fil: null,
        x: ax + (n.x - ax) * k,
        y: ay + (n.y - ay) * k,
        handleIn: f(n.handleIn),
        handleOut: f(n.handleOut)
      }))
    }))
  };
  return next;
}
/* Hitung padding visual objek (stroke miter, drop shadow, layer blur) */
function objectVisualPad(o) {
  if (!o) return 0;
  const stroke = hasVisibleStroke(o);
  const miter = o.strokeLinejoin === 'miter' ? (o.strokeMiterlimit || 4) : (o.strokeLinecap === 'square' ? Math.SQRT2 : 1);
  const strokePad = stroke ? strokeOutwardExtent(o) * Math.max(1, miter) : 0;
  let shadowPad = 0;
  if (Array.isArray(o.effects)) {
    for (const e of o.effects) {
      if (!e || e.disabled) continue;
      if (e.type === 'dropShadow') {
        const dx = Math.abs(Number(e.dx) || 0);
        const dy = Math.abs(Number(e.dy) || 0);
        const blur = Math.max(0, Number(e.blur) || 0);
        const sp = Math.max(dx, dy) + blur * 3;
        if (sp > shadowPad) shadowPad = sp;
      }
    }
  }
  let blurMargin = 0;
  if (Array.isArray(o.effects)) {
    for (const e of o.effects) {
      if (!e || e.disabled) continue;
      if (e.type === 'layerBlur') {
        const radius = Math.max(0, Number(e.radius) || 0);
        const bm = Math.ceil(3 * radius);
        if (bm > blurMargin) blurMargin = bm;
      }
    }
  }
  return strokePad + shadowPad + blurMargin;
}

/* kotak batas semua konten (kurva disampel, + stroke miter + efek visual) → [x0,y0,x1,y1] atau null */
function docBounds(doc: any, only: any = null) {
  let x0 = 1e18,
    y0 = 1e18,
    x1 = -1e18,
    y1 = -1e18;
  const add = (x, y, pad) => {
    if (x - pad < x0) x0 = x - pad;
    if (x + pad > x1) x1 = x + pad;
    if (y - pad < y0) y0 = y - pad;
    if (y + pad > y1) y1 = y + pad;
  };
  (doc.objects || []).forEach(o => {
    if (!o || o.hidden) return;
    if (only && !only.has(o.id)) return;
    const pad = objectVisualPad(o);
    const b = isLegacyText(o) ? legacyTextBounds(o) : tightBBox(o);
    if (b && b[0] <= b[2] && b[1] <= b[3]) {
      add(b[0], b[1], pad);
      add(b[2], b[3], pad);
    }
  });
  return x0 > x1 ? null : [x0, y0, x1, y1];
}
/* opt: { bg:{mode:'transparent'|'solid',color}, area:'board'|'content' } */
/* ---- gradien per objek: o.grad disimpan dalam koordinat dokumen (userSpaceOnUse) supaya ikut translate/scale/rotate; valid selama o.fill masih sama dengan grad.base ---- */

export { makeImageObj, isSafeImageHref, imageMatrix, computeImageParGeometry, scaleObj, docBounds, objectVisualPad };
