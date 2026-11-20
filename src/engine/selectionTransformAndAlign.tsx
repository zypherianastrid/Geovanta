/**
 * @file src/engine/selectionTransformAndAlign.tsx
 * @description Operasi penjajaran objek (Alignment), distribusi, posisi, dimensi, rotasi, & pencerminan seleksi
 */
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { translate, moveNodes, mapFil } from './bezierSubdivisionAndMove.tsx';
import { mapGrad } from './gradientEngine.tsx';
import { rd } from './vectorPrimitives.tsx';
import { affineMul, affineTranslate, affineRotate, transformObject, affineScale, selectionOrientedBox } from './affineAndOrientedBox.tsx';
import { parsePath } from './svgPathParser.tsx';
import { serializePath } from './svgPathSerializer.tsx';
import { isLegacyText, legacyTextSpec } from './legacyText.tsx';

/* =========================================================================
   TRANSFORM, ALIGNMENT, AUTO LAYOUT & PADDING ALA FIGMA (v4.4)
   Semua operasi immutable dan memakai invariansi afin Bézier: node + handle + metadata fillet
   ditransformasikan dengan matriks yang sama, sehingga bentuk kurva tidak berubah.
   ========================================================================= */
/* Kotak pembatas gabungan untuk himpunan objek (atau node terpilih bila selNodes diberikan) */
function selectionMetrics(doc, selObjs, selNodes: any = null, bboxFor: any = null) {
  let x0 = 1e18,
    y0 = 1e18,
    x1 = -1e18,
    y1 = -1e18,
    count = 0,
    rot = 0;
  const grow = (a, b, c, d) => {
    if (a < x0) x0 = a;
    if (b < y0) y0 = b;
    if (c > x1) x1 = c;
    if (d > y1) y1 = d;
  };
  if (selNodes && selNodes.size > 0) {
    doc.objects.forEach(o => {
      if (!selObjs.has(o.id)) return;
      o.subs.forEach(sp => sp.nodes.forEach(n => {
        if (selNodes.has(n.id)) {
          grow(n.x, n.y, n.x, n.y);
          count++;
        }
      }));
    });
  } else {
    doc.objects.forEach(o => {
      if (!selObjs.has(o.id)) return;
      // bboxFor (opsional): bounds terukur (layout font asli) agar panel
      // Transform menampilkan W/H yang sama dengan selection box.
      const bb = (bboxFor && bboxFor(o)) || tightBBox(o);
      if (bb[0] <= bb[2]) {
        grow(bb[0], bb[1], bb[2], bb[3]);
        if (!count) rot = o.rot || 0;
        count++;
      }
    });
  }
  if (!count || x0 > x1) return null;
  /* Simpan & baca rot pada objek pertama walaupun memilih banyak objek agar nilai rotasi konsisten */
  return {
    x0,
    y0,
    x1,
    y1,
    w: x1 - x0,
    h: y1 - y0,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    rot: !(selNodes && selNodes.size) ? rot : 0,
    count
  };
}
/* Titik poros 9-titik: pin = [ux, uy] dengan ux, uy ∈ {0, 0.5, 1} */
/* Titik poros 9-titik: pin = [ux, uy] dengan ux, uy ∈ {0, 0.5, 1} */
function pinPoint(m, pin) {
  const ux = pin ? pin[0] : 0,
    uy = pin ? pin[1] : 0;
  return {
    x: m.x0 + ux * m.w,
    y: m.y0 + uy * m.h
  };
}
const shiftNode = (n, dx, dy) => ({
  ...n,
  fil: null,
  x: n.x + dx,
  y: n.y + dy,
  handleIn: n.handleIn && {
    x: n.handleIn.x + dx,
    y: n.handleIn.y + dy
  },
  handleOut: n.handleOut && {
    x: n.handleOut.x + dx,
    y: n.handleOut.y + dy
  }
});

/* 1. ALIGNMENT (6 mode) & DISTRIBUTION (2 mode, butuh ≥ 3 objek).
      1 objek → Artboard; ≥ 2 objek → kotak pembatas seleksi; ≥ 2 node → kotak pembatas node. */
/* 1. ALIGNMENT (6 mode) & DISTRIBUTION (2 mode, butuh ≥ 3 objek).
      1 objek → Artboard; ≥ 2 objek → kotak pembatas seleksi; ≥ 2 node → kotak pembatas node. */
function alignSelection(doc, selObjs, selNodes, mode) {
  if (selNodes && selNodes.size >= 2) {
    if (mode === 'distH' || mode === 'distV') return doc;
    const m = selectionMetrics(doc, selObjs, selNodes);
    if (!m) return doc;
    let changed = false;
    const objects = doc.objects.map(o => {
      if (!selObjs.has(o.id)) return o;
      return {
        ...o,
        subs: o.subs.map(sp => ({
          ...sp,
          nodes: sp.nodes.map(n => {
            if (!selNodes.has(n.id)) return n;
            let dx = 0,
              dy = 0;
            if (mode === 'left') dx = m.x0 - n.x;else if (mode === 'hcenter') dx = m.cx - n.x;else if (mode === 'right') dx = m.x1 - n.x;else if (mode === 'top') dy = m.y0 - n.y;else if (mode === 'vcenter') dy = m.cy - n.y;else if (mode === 'bottom') dy = m.y1 - n.y;
            if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return n;
            changed = true;
            return shiftNode(n, dx, dy);
          })
        }))
      };
    });
    return changed ? {
      ...doc,
      objects
    } : doc;
  }
  const picked = doc.objects.filter(o => selObjs.has(o.id));
  if (!picked.length) return doc;
  const boxes = picked.map(o => {
    const b = tightBBox(o);
    return {
      id: o.id,
      l: b[0],
      t: b[1],
      r: b[2],
      b: b[3],
      w: b[2] - b[0],
      h: b[3] - b[1],
      cx: (b[0] + b[2]) / 2,
      cy: (b[1] + b[3]) / 2
    };
  });
  if (mode === 'distH' || mode === 'distV') {
    if (boxes.length < 3) return doc;
    const isH = mode === 'distH';
    const sorted = boxes.slice().sort((a, b) => isH ? a.cx - b.cx : a.cy - b.cy);
    const minC = Math.min(...sorted.map(b => isH ? b.l : b.t)),
      maxC = Math.max(...sorted.map(b => isH ? b.r : b.b));
    const total = sorted.reduce((s, b) => s + (isH ? b.w : b.h), 0),
      gap = (maxC - minC - total) / (sorted.length - 1);
    const shifts = new Map();
    let cur = minC;
    sorted.forEach(b => {
      shifts.set(b.id, isH ? {
        dx: cur - b.l,
        dy: 0
      } : {
        dx: 0,
        dy: cur - b.t
      });
      cur += (isH ? b.w : b.h) + gap;
    });
    let ch = false;
    const objects = doc.objects.map(o => {
      const sh = shifts.get(o.id);
      if (sh && (Math.abs(sh.dx) > 1e-6 || Math.abs(sh.dy) > 1e-6)) {
        ch = true;
        return translate(o, sh.dx, sh.dy);
      }
      return o;
    });
    return ch ? {
      ...doc,
      objects
    } : doc;
  }
  const [vx, vy, vw, vh] = doc.viewBox;
  const m = picked.length === 1 ? {
    x0: vx,
    y0: vy,
    x1: vx + vw,
    y1: vy + vh,
    cx: vx + vw / 2,
    cy: vy + vh / 2
  } : selectionMetrics(doc, selObjs, null);
  if (!m) return doc;
  const byId = new Map<any, any>(boxes.map(b => [b.id, b]));
  let ch = false;
  const objects = doc.objects.map(o => {
    const b = byId.get(o.id);
    if (!b) return o;
    let dx = 0,
      dy = 0;
    if (mode === 'left') dx = m.x0 - b.l;else if (mode === 'hcenter') dx = m.cx - b.cx;else if (mode === 'right') dx = m.x1 - b.r;else if (mode === 'top') dy = m.y0 - b.t;else if (mode === 'vcenter') dy = m.cy - b.cy;else if (mode === 'bottom') dy = m.y1 - b.b;
    if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
      ch = true;
      return translate(o, dx, dy);
    }
    return o;
  });
  return ch ? {
    ...doc,
    objects
  } : doc;
}

/* 2. POSITION (X, Y): geser seleksi agar titik poros jatuh tepat di nilai baru */
/* 2. POSITION (X, Y): geser seleksi agar titik poros jatuh tepat di nilai baru */
function setSelectionPosition(doc, selObjs, selNodes, axis, val, pin) {
  const m = selectionMetrics(doc, selObjs, selNodes && selNodes.size ? selNodes : null);
  if (!m || !isFinite(val)) return doc;
  const p = pinPoint(m, pin),
    dx = axis === 'x' ? val - p.x : 0,
    dy = axis === 'y' ? val - p.y : 0;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return doc;
  const useNodes = selNodes && selNodes.size;
  return {
    ...doc,
    objects: doc.objects.map(o => !selObjs.has(o.id) ? o : useNodes ? moveNodes(o, selNodes, dx, dy) : translate(o, dx, dy))
  };
}

/* 3. DIMENSION (W, H): skala afin terhadap titik poros. Transformasi (sx, sy) diterapkan ke node, handle, dan metadata fillet. */
/* 3. DIMENSION (W, H): skala afin terhadap titik poros. Transformasi (sx, sy) diterapkan ke node, handle, dan metadata fillet. */
function scaleObjXY(o, px, py, sx, sy, scaleStroke) {
  if (isLegacyText(o)) {
    const spec = legacyTextSpec(o);
    const oldText = o.text && typeof o.text === 'object' ? o.text : {};
    const absX = Math.abs(sx) || 1;
    const absY = Math.abs(sy) || 1;
    const kFont = Math.abs(absX - absY) < 1e-4 ? absY : (spec.resizing === 'fixed' ? 1 : (absX + absY) * 0.5);
    const nextX = rd(px + (spec.x - px) * sx);
    const nextY = rd(py + (spec.y - py) * sy);
    const nextFontSize = Math.max(1, rd(spec.fontSize * kFont));
    const nextWidth = spec.width > 0 ? Math.max(1, rd(spec.width * absX)) : null;
    const nextHeight = spec.height > 0 ? Math.max(1, rd(spec.height * absY)) : null;
    return {
      ...o,
      text: {
        ...oldText,
        ...spec,
        x: nextX,
        y: nextY,
        fontSize: nextFontSize,
        width: nextWidth,
        height: nextHeight
      }
    };
  }
  const iso = Math.abs(Math.abs(sx) - Math.abs(sy)) < 1e-4; /* isometri (termasuk cermin): busur fillet tetap lingkaran */
  const tr = q => q && {
    x: px + (q.x - px) * sx,
    y: py + (q.y - py) * sy
  };
  const kStroke = Math.sqrt((sx * sx + sy * sy) * 0.5);
  let nextClipPathD = o.clipPathD;
  if (o.clipPathD) {
    try {
      const cSubs = parsePath(o.clipPathD);
      const tSubs = cSubs.map(sp => ({
        ...sp,
        nodes: sp.nodes.map(n => ({
          ...n,
          x: px + (n.x - px) * sx,
          y: py + (n.y - py) * sy,
          handleIn: tr(n.handleIn),
          handleOut: tr(n.handleOut)
        }))
      }));
      nextClipPathD = serializePath({
        subs: tSubs
      });
    } catch (e) {}
  }
  const next = {
    ...o,
    ...(nextClipPathD !== o.clipPathD ? {
      clipPathD: nextClipPathD
    } : {}),
    grad: mapGrad(o.grad, tr, kStroke),
    ...(o.strokeGrad ? {
      strokeGrad: mapGrad(o.strokeGrad, tr, kStroke)
    } : {}),
    strokeWidth: scaleStroke && o.strokeWidth && !o.nonScalingStroke ? rd(o.strokeWidth * kStroke) : o.strokeWidth,
    ...(scaleStroke && !o.nonScalingStroke && Array.isArray(o.strokeDasharray) ? {
      strokeDasharray: o.strokeDasharray.map((v: number) => rd(v * kStroke))
    } : {}),
    ...(scaleStroke && !o.nonScalingStroke && o.strokeDashoffset != null ? {
      strokeDashoffset: rd(Number(o.strokeDashoffset) * kStroke)
    } : {}),
    subs: o.subs.map(sp => ({
      ...sp,
      nodes: sp.nodes.map(n => ({
        ...n,
        x: px + (n.x - px) * sx,
        y: py + (n.y - py) * sy,
        handleIn: tr(n.handleIn),
        handleOut: tr(n.handleOut),
        fil: iso && n.fil ? mapFil(n.fil, tr, Math.abs(sx)) : null
      }))
    }))
  };
  if (o.gen && typeof o.gen === 'object') {
    if (o.gen.kind === 'blob') {
      const c = tr({ x: Number(o.gen.cx || 0), y: Number(o.gen.cy || 0) });
      next.gen = {
        ...o.gen,
        cx: rd(c.x),
        cy: rd(c.y),
        rx: rd(Math.max(1, Number(o.gen.rx || (o.gen.w ? Number(o.gen.w) / 2 : 50)) * Math.abs(sx))),
        ry: rd(Math.max(1, Number(o.gen.ry || (o.gen.h ? Number(o.gen.h) / 2 : 50)) * Math.abs(sy))),
        ...(o.gen.w ? { w: rd(Math.max(1, Number(o.gen.w) * Math.abs(sx))) } : {}),
        ...(o.gen.h ? { h: rd(Math.max(1, Number(o.gen.h) * Math.abs(sy))) } : {})
      };
    } else if (o.gen.kind === 'weave') {
      const p0 = tr({ x: Number(o.gen.x || 0), y: Number(o.gen.y || 0) });
      next.gen = {
        ...o.gen,
        x: rd(p0.x),
        y: rd(p0.y),
        w: rd(Math.max(1, Number(o.gen.w || 100) * Math.abs(sx))),
        h: rd(Math.max(1, Number(o.gen.h || 100) * Math.abs(sy)))
      };
    } else if (o.gen.kind === 'arc') {
      const c = tr({ x: Number(o.gen.cx || 0), y: Number(o.gen.cy || 0) });
      const k = Math.sqrt((sx * sx + sy * sy) * 0.5);
      next.gen = {
        ...o.gen,
        cx: rd(c.x),
        cy: rd(c.y),
        r: rd(Math.max(1, Number(o.gen.r || 50) * k))
      };
    }
  }
  return next;
}
function setSelectionDimension(doc, selObjs, axis, newVal, opt) {
  opt = opt || {};
  const m = selectionMetrics(doc, selObjs, null);
  if (!m || !(newVal > 0)) return doc;
  const p = pinPoint(m, opt.pin || [0, 0]);
  let sx = axis === 'w' ? Math.max(0.5, newVal) / Math.max(1e-6, m.w) : 1,
    sy = axis === 'h' ? Math.max(0.5, newVal) / Math.max(1e-6, m.h) : 1;
  if (opt.constrain) {
    if (axis === 'w') sy = sx;else sx = sy;
  }
  if (Math.abs(sx - 1) < 1e-9 && Math.abs(sy - 1) < 1e-9) return doc;
  return {
    ...doc,
    objects: doc.objects.map(o => selObjs.has(o.id) ? scaleObjXY(o, p.x, p.y, sx, sy, !!opt.scaleStroke) : o)
  };
}

/* 4. ROTATION & FLIP: menggunakan matriks afin terpadu (sinkron dengan bboxAngle VectorCraft) */
/* 4. ROTATION & FLIP: menggunakan matriks afin terpadu (sinkron dengan bboxAngle VectorCraft) */
function rotateObjAround(o, px, py, degDelta) {
  const rad = degDelta * Math.PI / 180;
  const mat = affineMul(affineTranslate(px, py), affineMul(affineRotate(rad), affineTranslate(-px, -py)));
  return transformObject(o, mat, false);
}
function setSelectionRotation(doc, selObjs, degTarget, isDelta, pin, bboxFor = null) {
  const m = selectionMetrics(doc, selObjs, null);
  if (!m || !isFinite(degTarget)) return doc;
  const anchor = pin || [0.5, 0.5];
  const text = selObjs.size === 1 && doc.objects.find(o => selObjs.has(o.id) && isLegacyText(o));
  const box = text && selectionOrientedBox(doc, selObjs, bboxFor);
  const p = box ? box.toDocPt({
    x: box.rect.x0 + anchor[0] * (box.rect.x1 - box.rect.x0),
    y: box.rect.y0 + anchor[1] * (box.rect.y1 - box.rect.y0)
  }) : pinPoint(m, anchor);
  let delta = isDelta ? degTarget : degTarget - (m.rot || 0);
  delta = (delta % 360 + 540) % 360 - 180;
  if (Math.abs(delta) < 1e-6) return doc;
  /* `rot` disimpan sebagai kebalikan sudut matriks (sesuai konvensi layar),
     jadi gerakan geometri harus memakai tanda berlawanan agar field mencapai target. */
  const geometryDelta = -delta;
  return {
    ...doc,
    objects: doc.objects.map(o => selObjs.has(o.id) ? rotateObjAround(o, p.x, p.y, geometryDelta) : o)
  };
}
function flipSelection(doc, selObjs, axis, pin) {
  const m = selectionMetrics(doc, selObjs, null);
  if (!m) return doc;
  const p = pinPoint(m, pin || [0.5, 0.5]),
    sx = axis === 'h' ? -1 : 1,
    sy = axis === 'v' ? -1 : 1;
  /* Flip around the selection's local axes. A world-axis reflection changes
     both orientation and placement for an already rotated object. */
  const rot = -(Number(m.rot) || 0) * Math.PI / 180,
    localFlip = affineMul(affineRotate(rot), affineMul(affineScale(sx, sy), affineRotate(-rot))),
    mat = affineMul(affineTranslate(p.x, p.y), affineMul(localFlip, affineTranslate(-p.x, -p.y)));
  return {
    ...doc,
    objects: doc.objects.map(o => selObjs.has(o.id) ? transformObject(o, mat, false) : o)
  };
}

/* 5. AUTO LAYOUT & PADDING: Row / Column / Wrap-Grid + padding 4 sisi + Auto-Frame latar.
      cfg: { dir, cols, gap, gapX, gapY, pt, pr, pb, pl, alignX, alignY, frame, frameRadius, frameFill, frameStroke, frameStrokeW, mem }
      mem (dari hasil sebelumnya) menjaga urutan item & titik asal agar reflow langsung tidak melayang/berubah urutan.
      Mengembalikan { doc, selIds, mem } atau null. */

export { selectionMetrics, pinPoint, shiftNode, alignSelection, setSelectionPosition, scaleObjXY, setSelectionDimension, rotateObjAround, setSelectionRotation, flipSelection };
