/**
 * @file src/engine/gradientEngine.tsx
 * @description Mesin interpolasi gradien multi-stop OKLab/sRGB, kompilasi stop, & proyeksi sudut
 */
import { esc, rd, uid } from './vectorPrimitives.tsx';
import { cssToHex } from '../utils/colorParserAndFormatter.tsx';
import { rgb2ok, ok2hex } from '../utils/colorMath.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { isLegacyText, legacyTextBounds } from './legacyText.tsx';

/* opt: { bg:{mode:'transparent'|'solid',color}, area:'board'|'content' } */
/* ---- gradien per objek: o.grad disimpan dalam koordinat dokumen (userSpaceOnUse) supaya ikut translate/scale/rotate; valid selama o.fill masih sama dengan grad.base ---- */
const mapGrad = (g, f, k: any = 1) => {
  if (!g) return g;
  if (g.type === 'radial' || g.type === 'angular') {
    const c = f({
        x: g.cx,
        y: g.cy
      }),
      fc = g.fx != null ? f({
        x: g.fx,
        y: g.fy
      }) : null,
      r = g.r * (k || 1),
      out = {
        ...g,
        cx: c.x,
        cy: c.y,
        r
      };
    if (fc) {
      out.fx = fc.x;
      out.fy = fc.y;
    }
    const curAng = g.handleAng != null ? g.handleAng : (g.angle != null ? g.angle * Math.PI / 180 : null);
    if (curAng != null) {
      const h = f({
        x: g.cx + Math.cos(curAng) * g.r,
        y: g.cy + Math.sin(curAng) * g.r
      });
      const newAng = Math.atan2(h.y - c.y, h.x - c.x);
      out.handleAng = newAng;
      if (g.angle != null) out.angle = Math.round(newAng * 1800 / Math.PI) / 10;
    }
    return out;
  }
  const a = f({
      x: g.x1,
      y: g.y1
    }),
    b = f({
      x: g.x2,
      y: g.y2
    });
  return {
    ...g,
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y
  };
};
const gradOn = o => !!(o && o.grad && o.grad.base === o.fill);
const strokeGradOn = o => !!(o && o.strokeGrad && o.strokeGrad.base === o.stroke);
function isGradOnSlot(o: any, slot: 'fill' | 'stroke' = 'fill'): boolean {
  return slot === 'stroke' ? strokeGradOn(o) : gradOn(o);
}
function getGradForSlot(o: any, slot: 'fill' | 'stroke' = 'fill'): any | null {
  return isGradOnSlot(o, slot) ? (slot === 'stroke' ? o.strokeGrad : o.grad) : null;
}
const gradXml = (g, id, ox = 0, oy = 0) => {
  const r = v => Math.round(v * 1e4) / 1e4,
    sp = g.spread && g.spread !== 'pad' ? ' spreadMethod="' + g.spread + '"' : '';
  const st = g.stops.map(t => '<stop offset="' + r(t.offset) + '" stop-color="' + esc(t.color) + '"' + (t.op != null && t.op !== 1 ? ' stop-opacity="' + r(t.op) + '"' : '') + '/>').join('');
  if (g.type === 'radial' || g.type === 'angular') {
    const fx = g.fx != null ? ' fx="' + r(g.fx - ox) + '" fy="' + r(g.fy - oy) + '"' : '';
    return '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + r(g.cx - ox) + '" cy="' + r(g.cy - oy) + '" r="' + r(g.r) + '"' + fx + sp + '>' + st + '</radialGradient>';
  }
  return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + r(g.x1 - ox) + '" y1="' + r(g.y1 - oy) + '" x2="' + r(g.x2 - ox) + '" y2="' + r(g.y2 - oy) + '"' + sp + '>' + st + '</linearGradient>';
};
/* ---- Editor gradien tingkat lanjut (v4.9): multi-stop, midpoint, OKLab, focal point, spread ---- */
/* Konversi Hex (#rrggbb) ke OKLab [L, a, b] menggunakan rgb2ok global */
/* ---- Editor gradien tingkat lanjut (v4.9): multi-stop, midpoint, OKLab, focal point, spread ---- */
/* Konversi Hex (#rrggbb) ke OKLab [L, a, b] menggunakan rgb2ok global */
function hex2ok(hex) {
  const h = cssToHex(hex || '#000000');
  return rgb2ok(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
}

/* Sampling warna pada posisi t in [0,1] dari daftar stops (di ruang OKLab) */
/* Sampling warna pada posisi t in [0,1] dari daftar stops (di ruang OKLab) */
function sampleGradAt(stops, t) {
  if (!stops || !stops.length) return {
    color: '#000000',
    op: 1
  };
  const s = stops.slice().sort((a, b) => a.offset - b.offset);
  if (t <= s[0].offset) return {
    color: cssToHex(s[0].color),
    op: s[0].op ?? 1
  };
  if (t >= s[s.length - 1].offset) return {
    color: cssToHex(s[s.length - 1].color),
    op: s[s.length - 1].op ?? 1
  };
  let i = 0;
  while (i < s.length - 2 && t > s[i + 1].offset) i++;
  const a = s[i],
    b = s[i + 1];
  const span = Math.max(1e-6, b.offset - a.offset);
  let u = Math.max(0, Math.min(1, (t - a.offset) / span));
  /* Skew non-linear berdasarkan posisi berlian midpoint m in (0.15, 0.85) */
  const mid = a.mid != null ? Math.max(0.15, Math.min(0.85, a.mid)) : 0.5;
  if (Math.abs(mid - 0.5) > 1e-3 && u > 0 && u < 1) {
    u = Math.pow(u, -Math.LN2 / Math.log(mid));
  }
  const okA = hex2ok(a.color),
    okB = hex2ok(b.color);
  const col = ok2hex(okA[0] + (okB[0] - okA[0]) * u, okA[1] + (okB[1] - okA[1]) * u, okA[2] + (okB[2] - okA[2]) * u);
  const opA = a.op ?? 1,
    opB = b.op ?? 1;
  return {
    color: col,
    op: rd(opA + (opB - opA) * u)
  };
}

/* Kompilasi rawStops (stop kontrol UI) -> stops SVG (dengan sub-sampling OKLab & Midpoint) */
/* Kompilasi rawStops (stop kontrol UI) -> stops SVG (dengan sub-sampling OKLab & Midpoint) */
function compileGradStops(rawStops, useOklab = true) {
  const src = (rawStops || []).slice().sort((a, b) => a.offset - b.offset);
  if (src.length < 2) return src;
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const a = src[i];
    out.push({
      offset: rd(a.offset),
      color: cssToHex(a.color),
      op: a.op == null ? 1 : rd(a.op)
    });
    if (i + 1 < src.length) {
      const b = src[i + 1];
      const okA = hex2ok(a.color),
        okB = hex2ok(b.color);
      const dE = Math.hypot(okA[0] - okB[0], okA[1] - okB[1], okA[2] - okB[2]);
      const mid = a.mid != null ? Math.max(0.15, Math.min(0.85, a.mid)) : 0.5;
      const hasSkew = Math.abs(mid - 0.5) > 0.02;
      /* Sub-sampling jika mode OKLab aktif atau jika midpoint digeser dari 0.5 */
      if (useOklab && dE > 0.04 || hasSkew) {
        const steps = Math.min(7, Math.max(hasSkew ? 4 : 2, Math.ceil(dE / 0.045)));
        for (let k = 1; k < steps; k++) {
          const tLin = k / steps;
          const off = a.offset + (b.offset - a.offset) * tLin;
          const smp = sampleGradAt([a, b], off);
          out.push({
            offset: rd(off),
            color: smp.color,
            op: smp.op
          });
        }
      }
    }
  }
  return out;
}

/* Ramer-Douglas-Peucker (RDP) di ruang 4D (offset, L, a, b) untuk menyederhanakan stop gradien */
/* Ramer-Douglas-Peucker (RDP) di ruang 4D (offset, L, a, b) untuk menyederhanakan stop gradien */
function simplifyGradStops(stops, tol = 0.022) {
  const src = (stops || []).slice().sort((a, b) => a.offset - b.offset);
  if (src.length <= 3) return src.map(s => ({
    ...s,
    id: s.id || uid(),
    mid: 0.5
  }));
  const pts = src.map(s => ({
    s,
    ok: hex2ok(s.color),
    u: s.offset
  }));
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const rdp = (i, j) => {
    if (j - i <= 1) return;
    let maxD = tol,
      maxK = -1;
    const A = pts[i],
      B = pts[j],
      du = B.u - A.u || 1e-6;
    for (let k = i + 1; k < j; k++) {
      const t = (pts[k].u - A.u) / du;
      const dL = pts[k].ok[0] - (A.ok[0] + (B.ok[0] - A.ok[0]) * t);
      const da = pts[k].ok[1] - (A.ok[1] + (B.ok[1] - A.ok[1]) * t);
      const db = pts[k].ok[2] - (A.ok[2] + (B.ok[2] - A.ok[2]) * t);
      const d = Math.hypot(dL, da, db);
      if (d > maxD) {
        maxD = d;
        maxK = k;
      }
    }
    if (maxK >= 0) {
      keep[maxK] = 1;
      rdp(i, maxK);
      rdp(maxK, j);
    }
  };
  rdp(0, pts.length - 1);
  return pts.map((p, i) => ({
    p,
    i
  })).filter(x => keep[x.i]).map(({
    p,
    i
  }) => ({
    id: 'r' + i,
    offset: rd(p.s.offset),
    color: cssToHex(p.s.color),
    op: p.s.op ?? 1,
    mid: 0.5
  }));
}

/* Sederhanakan sampai maksimal maxN stop (cari toleransi RDP terkecil yang memenuhi batas) */
/* Sederhanakan sampai maksimal maxN stop (cari toleransi RDP terkecil yang memenuhi batas) */
function simplifyGradStopsTo(stops, maxN = 8, startTol = 0.012) {
  let tol = startTol,
    out = simplifyGradStops(stops, tol),
    guard = 0;
  while (out.length > maxN && guard++ < 24) {
    tol *= 1.35;
    out = simplifyGradStops(stops, tol);
  }
  return out;
}

/* Normalisasi & Pembangunan Objek Gradien (Memastikan rawStops dan stops sinkron) */
/* Normalisasi & Pembangunan Objek Gradien (Memastikan rawStops dan stops sinkron) */
function finalizeSlotGradObj(o: any, g: any, base: string, isStroke: boolean) {
  const next: any = {
    ...o,
    [isStroke ? 'stroke' : 'fill']: base,
    [isStroke ? 'strokeGrad' : 'grad']: g
  };
  if (isStroke) {
    next.strokeWidth = o && o.strokeWidth > 0 ? o.strokeWidth : 2;
    if (next.strokeStyleId) delete next.strokeStyleId;
  }
  return next;
}

function ensureGradModel(o: any, desiredType: string = 'linear', slot: 'fill' | 'stroke' = 'fill') {
  /* Teks legacy menyimpan geometri di o.text (tanpa x/y/width/height top-level),
     jadi fallback [o.x||0 ...] menghasilkan bbox [0,0,100,100] — gradient
     terpetakan jauh dari teks (linear/radial = warna ujung, angular = awal).
     Pakai legacyTextBounds untuk teks. */
  const textBb = isLegacyText(o) ? legacyTextBounds(o) : null;
  const bb = textBb || ((o && Array.isArray(o.subs) && o.subs.length > 0)
    ? tightBBox(o)
    : [o?.x || 0, o?.y || 0, (o?.x || 0) + (o?.width || 100), (o?.y || 0) + (o?.height || 100)]);
  const x0 = isFinite(bb[0]) ? bb[0] : 0,
    y0 = isFinite(bb[1]) ? bb[1] : 0;
  const x1 = isFinite(bb[2]) ? bb[2] : 100,
    y1 = isFinite(bb[3]) ? bb[3] : 100;
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    r = Math.max(10, Math.hypot(x1 - x0, y1 - y0) / 2);
  const isStroke = slot === 'stroke';
  const gradKey = isStroke ? 'strokeGrad' : 'grad';
  const rawPaint = o ? o[isStroke ? 'stroke' : 'fill'] : null;
  const baseCol = rawPaint && rawPaint !== 'none' && rawPaint !== 'transparent'
    ? cssToHex(rawPaint)
    : (isStroke ? '#111827' : '#4f46e5');
  const endCol = isStroke ? '#6366f1' : '#a855f7';
  const curGrad = o ? o[gradKey] : null;
  if (!curGrad || !isGradOnSlot(o, slot)) {
    const rawStops = [{
      id: uid(),
      offset: 0,
      color: baseCol,
      op: 1,
      mid: 0.5
    }, {
      id: uid(),
      offset: 1,
      color: endCol,
      op: 1,
      mid: 0.5
    }];
    const type = desiredType || 'linear';
    const g = type === 'angular' ? {
      type: 'angular',
      base: baseCol,
      cx,
      cy,
      r,
      angle: 0,
      handleAng: 0,
      oklab: true,
      spread: 'pad',
      rawStops,
      stops: compileGradStops(rawStops, true)
    } : type === 'radial' ? {
      type: 'radial',
      base: baseCol,
      cx,
      cy,
      r,
      fx: cx,
      fy: cy,
      oklab: true,
      spread: 'pad',
      rawStops,
      stops: compileGradStops(rawStops, true)
    } : {
      type: 'linear',
      base: baseCol,
      x1: x0,
      y1: cy,
      x2: x1,
      y2: cy,
      oklab: true,
      spread: 'pad',
      rawStops,
      stops: compileGradStops(rawStops, true)
    };
    return finalizeSlotGradObj(o, g, baseCol, isStroke);
  }
  let g = {
    ...curGrad
  };
  if (!g.rawStops || !g.rawStops.length) {
    /* Jika gradien memiliki > 5 stop, sederhanakan otomatis dengan RDP untuk dijadikan rawStops */
    g.rawStops = g.stops.length > 5 ? simplifyGradStopsTo(g.stops, 10, 0.018) : g.stops.map((s, i) => ({
      id: s.id || 's' + i,
      offset: s.offset,
      color: cssToHex(s.color),
      op: s.op ?? 1,
      mid: 0.5
    }));
    g.oklab = true;
  }
  if (desiredType && desiredType !== g.type) {
    const mCx = g.cx != null ? g.cx : (g.x1 != null ? (g.x1 + g.x2) / 2 : cx);
    const mCy = g.cy != null ? g.cy : (g.y1 != null ? (g.y1 + g.y2) / 2 : cy);
    const mR = g.r || (g.x1 != null ? Math.max(5, Math.hypot(g.x2 - g.x1, g.y2 - g.y1) / 2) : r);
    if (desiredType === 'angular') {
      const curAng = g.type === 'linear' ? gradAngleDeg(g) : (g.angle || 0);
      g = {
        ...g,
        type: 'angular',
        cx: rd(mCx),
        cy: rd(mCy),
        r: rd(mR),
        angle: rd(curAng),
        handleAng: rd(curAng * Math.PI / 180)
      };
    } else if (desiredType === 'radial') {
      g = {
        ...g,
        type: 'radial',
        cx: rd(mCx),
        cy: rd(mCy),
        r: rd(mR),
        fx: rd(mCx),
        fy: rd(mCy)
      };
    } else {
      const ang = (g.angle || 0) * Math.PI / 180;
      const dx = Math.cos(ang) * mR,
        dy = Math.sin(ang) * mR;
      g = {
        ...g,
        type: 'linear',
        x1: rd(mCx - dx),
        y1: rd(mCy - dy),
        x2: rd(mCx + dx),
        y2: rd(mCy + dy)
      };
    }
  }
  g.stops = g.rawStops === curGrad.rawStops && Array.isArray(curGrad.stops) && curGrad.stops.length
    ? curGrad.stops : compileGradStops(g.rawStops, g.oklab !== false);
  /* base = warna stop PERTAMA (offset 0), bukan stop tengah: base adalah
     warna solid objek (dipakai gradOn + kembali ke Solid) — harus sama
     dengan cabang pembuatan baru di atas (baseCol = stop pertama). */
  g.base = g.stops.length ? g.stops[0].color : g.base;
  return finalizeSlotGradObj(o, g, g.base, isStroke);
}

/* Update rawStops pada objek & kompilasi ulang ke stops SVG */
/* Update rawStops pada objek & kompilasi ulang ke stops SVG */
function updateGradStops(o: any, nextRawStops: any[], extraGradProps: any = null, slot: 'fill' | 'stroke' = 'fill') {
  const isStroke = slot === 'stroke';
  const gradKey = isStroke ? 'strokeGrad' : 'grad';
  const paintKey = isStroke ? 'stroke' : 'fill';
  const prevGrad = o && o[gradKey];
  if (!prevGrad) return o;
  const raw = nextRawStops.slice().sort((a, b) => a.offset - b.offset);
  const g = {
    ...prevGrad,
    ...(extraGradProps || {}),
    rawStops: raw
  };
  g.stops = compileGradStops(raw, g.oklab !== false);
  /* base = warna stop PERTAMA (offset 0): stop tengah hasil kompilasi OKLab
     merusak o.fill (teks jadi ungu solid + Solid kehilangan warna asli). */
  const base = g.stops.length ? g.stops[0].color : o[paintKey];
  g.base = base;
  return {
    ...o,
    [paintKey]: base,
    [gradKey]: g
  };
}

/* Hitung & atur sudut gradien (linear & angular) dalam derajat (-180 s/d 180 atau 0 s/d 360) */
function gradAngleDeg(g) {
  if (!g) return 0;
  if (g.type === 'angular') {
    return g.angle != null ? Math.round(g.angle * 10) / 10 : (g.handleAng != null ? Math.round(g.handleAng * 1800 / Math.PI) / 10 : 0);
  }
  if (g.type !== 'linear') return 0;
  return Math.round(Math.atan2(g.y2 - g.y1, g.x2 - g.x1) * 1800 / Math.PI) / 10;
}
function setGradAngleDeg(o: any, deg: number, slot: 'fill' | 'stroke' = 'fill') {
  if (!o) return o;
  const gradKey = slot === 'stroke' ? 'strokeGrad' : 'grad';
  const isDirectGrad = (o.type === 'linear' || o.type === 'angular' || o.type === 'radial') && !o.grad && !o.strokeGrad;
  const target = isDirectGrad ? o : o[gradKey];
  if (!target) return o;
  if (target.type === 'angular') {
    const rad = deg * Math.PI / 180;
    const nextGrad = {
      ...target,
      angle: deg,
      handleAng: rad
    };
    return isDirectGrad ? nextGrad : {
      ...o,
      [gradKey]: nextGrad
    };
  }
  if (target.type !== 'linear') return o;
  const g = target,
    cx = (g.x1 + g.x2) / 2,
    cy = (g.y1 + g.y2) / 2;
  const half = Math.max(5, Math.hypot(g.x2 - g.x1, g.y2 - g.y1) / 2);
  const rad = deg * Math.PI / 180,
    dx = Math.cos(rad) * half,
    dy = Math.sin(rad) * half;
  const nextGrad = {
    ...g,
    x1: rd(cx - dx),
    y1: rd(cy - dy),
    x2: rd(cx + dx),
    y2: rd(cy + dy)
  };
  return isDirectGrad ? nextGrad : {
    ...o,
    [gradKey]: nextGrad
  };
}

/* Proyeksi titik kanvas P ke garis/lingkaran gradien -> t in [0, 1] */
function projectPointToGrad(g, pt) {
  if (!g) return 0.5;
  if (g.type === 'angular') {
    const startRad = g.handleAng != null ? g.handleAng : (g.angle || 0) * Math.PI / 180;
    const curRad = Math.atan2(pt.y - g.cy, pt.x - g.cx);
    let diff = (curRad - startRad) % (2 * Math.PI);
    if (diff < 0) diff += 2 * Math.PI;
    return Math.max(0, Math.min(1, diff / (2 * Math.PI)));
  }
  if (g.type === 'radial') {
    const r = Math.max(1e-6, g.r);
    return Math.max(0, Math.min(1, Math.hypot(pt.x - g.cx, pt.y - g.cy) / r));
  }
  const vx = g.x2 - g.x1,
    vy = g.y2 - g.y1,
    L2 = vx * vx + vy * vy;
  if (L2 < 1e-9) return 0.5;
  return Math.max(0, Math.min(1, ((pt.x - g.x1) * vx + (pt.y - g.y1) * vy) / L2));
}

/* Koordinat kanvas (x, y) untuk posisi t in [0, 1] pada garis/lingkaran gizmo gradien */
function gradPointAt(g, t) {
  if (g.type === 'angular') {
    const startRad = g.handleAng != null ? g.handleAng : (g.angle || 0) * Math.PI / 180;
    const ang = startRad + t * 2 * Math.PI;
    return {
      x: g.cx + Math.cos(ang) * g.r,
      y: g.cy + Math.sin(ang) * g.r
    };
  }
  if (g.type === 'radial') {
    const ang = g.handleAng || 0;
    return {
      x: g.cx + Math.cos(ang) * g.r * t,
      y: g.cy + Math.sin(ang) * g.r * t
    };
  }
  return {
    x: g.x1 + (g.x2 - g.x1) * t,
    y: g.y1 + (g.y2 - g.y1) * t
  };
}

export { mapGrad, gradOn, strokeGradOn, isGradOnSlot, getGradForSlot, gradXml, hex2ok, sampleGradAt, compileGradStops, simplifyGradStops, simplifyGradStopsTo, ensureGradModel, updateGradStops, gradAngleDeg, setGradAngleDeg, projectPointToGrad, gradPointAt };
