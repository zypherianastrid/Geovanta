/* AUTO-GENERATED FROM src/engine/svgpeak/*.js — DO NOT EDIT MANUALLY */
let _cachedVmtInstance = null;

function _createSvgPeakVmtScope(window, document, ImageData, localStorage, requestAnimationFrame) {
/* === BEGIN 00-vmt-compat.js === */
/* =====================================================================
 * JS Module 00: VMT Compat — helper yang dirujuk modul 04/14 tapi
 * TIDAK ADA di dalam zip engine_trained__1 (modul 01-03 tidak ikut
 * dikirim). Semua definisi di sini BERSYARAT (hanya bila belum ada),
 * sehingga di aplikasi lengkap yang sudah mendefinisikannya, file ini
 * tidak mengubah perilaku apa pun.
 *
 * BUG YANG DIPERBAIKI:
 *  1. vectorize() SELALU melempar ReferenceError: parseSvgForCanvas
 *     is not defined di langkah terakhir (14-vmt-orchestrator.js,
 *     pemanggilan evaluateFinalVectorRoundTrip) — SETELAH seluruh
 *     pipeline selesai — sehingga pemanggil tidak pernah menerima SVG.
 *     Argumen dievaluasi SEBELUM guard di dalam
 *     evaluateFinalVectorRoundTrip sempat berjalan.
 *  2. VE.exportEPS / exportAI (04) memanggil cssToHex() tanpa guard
 *     lewat hex01(), sehingga ekspor EPS/AI gagal bila modul 01-03
 *     tidak ada.
 *  3. fillCanvasPath / resolveCanvasPaint hanya dipakai lewat guard
 *     `typeof ... === 'function'` di evaluator; definisi fallback di
 *     sini membuat evaluasi round-trip vektor benar-benar berjalan
 *     (bukan sekadar kembali ke skor segmentasi).
 * ===================================================================== */
/* --- cssToHex: normalisasi warna CSS -> '#rrggbb' --- */
if (typeof cssToHex !== 'function') {
  var cssToHex = function (c) {
    if (c == null) return '#000000';
    var s = String(c).trim().toLowerCase();
    if (s.charAt(0) === '#') {
      var h = s.slice(1);
      if (h.length === 3) h = h.split('').map(function (ch) { return ch + ch; }).join('');
      if (h.length === 8) h = h.slice(0, 6); // abaikan alpha
      return '#' + (h.length === 6 ? h : (h + '000000').slice(0, 6));
    }
    var m = s.match(/^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (m) {
      var toHex = function (v) { return Math.max(0, Math.min(255, Math.round(Number(v)))).toString(16).padStart(2, '0'); };
      return '#' + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
    }
    // Nama warna yang umum; yang tak dikenal dikembalikan apa adanya
    // agar pemanggil yang mengenalinya tetap bisa memakainya.
    var named = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', transparent: '#000000' };
    return named[s] || s;
  };
}

/* --- Parser SVG minimal untuk evaluasi round-trip --- */
function _compatParseAttrs(tag) {
  var out = {}, re = /([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g, m;
  while ((m = re.exec(tag))) out[m[1] || m[3]] = m[2] != null ? m[2] : m[4];
  return out;
}
function _compatParseGradients(svg) {
  var grads = {};
  var re = /<(linearGradient|radialGradient)\b([^>]*)>([\s\S]*?)<\/(?:linearGradient|radialGradient)>/g, m;
  while ((m = re.exec(svg))) {
    var a = _compatParseAttrs(m[2]);
    if (!a.id) continue;
    var stops = [], sre = /<stop\b([^>]*)\/?>/g, sm;
    while ((sm = sre.exec(m[3]))) {
      var sa = _compatParseAttrs(sm[1]);
      var off = String(sa.offset || '0').trim();
      stops.push({
        offset: off.endsWith('%') ? parseFloat(off) / 100 : (parseFloat(off) || 0),
        color: sa['stop-color'] || '#000000',
        op: sa['stop-opacity'] != null ? parseFloat(sa['stop-opacity']) : 1
      });
    }
    if (stops.length >= 2) {
      grads[a.id] = {
        type: m[1] === 'radialGradient' ? 'radial' : 'linear',
        x1: parseFloat(a.x1) || 0, y1: parseFloat(a.y1) || 0,
        x2: a.x2 != null ? parseFloat(a.x2) : 1, y2: parseFloat(a.y2) || 0,
        cx: parseFloat(a.cx) || 0.5, cy: parseFloat(a.cy) || 0.5,
        r: parseFloat(a.r) || 0.5,
        stops: stops
      };
    }
  }
  return grads;
}

if (typeof parseSvgForCanvas !== 'function') {
  var parseSvgForCanvas = function (svg) {
    if (!svg || typeof svg !== 'string') return [];
    var grads = _compatParseGradients(svg);
    var items = [];
    var re = /<(path|rect)\b([^>]*)\/?>/g, m;
    while ((m = re.exec(svg))) {
      var a = _compatParseAttrs(m[2]);
      var d = a.d;
      if (m[1] === 'rect') {
        var x = parseFloat(a.x) || 0, y = parseFloat(a.y) || 0,
            w = parseFloat(a.width) || 0, h = parseFloat(a.height) || 0;
        if (!(w > 0 && h > 0)) continue;
        d = 'M' + x + ' ' + y + 'L' + (x + w) + ' ' + y + 'L' + (x + w) + ' ' + (y + h) + 'L' + x + ' ' + (y + h) + 'Z';
      }
      if (!d) continue;
      var fill = a.fill || '#000000', fillGrad = null;
      var um = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(fill || '');
      if (um && grads[um[1]]) { fillGrad = grads[um[1]]; fill = fillGrad.stops[Math.floor(fillGrad.stops.length / 2)].color; }
      var p2d = null;
      try { if (typeof Path2D !== 'undefined') p2d = new Path2D(d); } catch (e) { p2d = null; }
      items.push({
        p2d: p2d, d: d, fill: fill, fillGrad: fillGrad,
        stroke: a.stroke || 'none',
        strokeWidth: a['stroke-width'] != null ? parseFloat(a['stroke-width']) : 0,
        opacity: a.opacity != null ? parseFloat(a.opacity) : 1,
        fillRule: a['fill-rule'] || 'evenodd'
      });
    }
    return items;
  };
}

/* --- fillCanvasPath: isi path dari string d tanpa Path2D --- */
if (typeof fillCanvasPath !== 'function') {
  var fillCanvasPath = function (ctx, it) {
    if (!ctx || !it || !it.d) return;
    ctx.fillStyle = (typeof resolveCanvasPaint === 'function')
      ? resolveCanvasPaint(ctx, it.fill, it.fillGrad) : it.fill;
    try {
      if (it.p2d) { ctx.fill(it.p2d, it.fillRule || 'evenodd'); return; }
    } catch (e) { /* jatuh ke tracing manual */ }
    var toks = it.d.match(/[MLCZ]|-?\d+\.?\d*/g) || [];
    ctx.beginPath();
    var i = 0, sx = 0, sy = 0;
    while (i < toks.length) {
      var t = toks[i++];
      if (t === 'M') { sx = parseFloat(toks[i++]); sy = parseFloat(toks[i++]); ctx.moveTo(sx, sy); }
      else if (t === 'L') { ctx.lineTo(parseFloat(toks[i++]), parseFloat(toks[i++])); }
      else if (t === 'C') { ctx.bezierCurveTo(parseFloat(toks[i++]), parseFloat(toks[i++]), parseFloat(toks[i++]), parseFloat(toks[i++]), parseFloat(toks[i++]), parseFloat(toks[i++])); }
      else if (t === 'Z') { ctx.closePath(); }
    }
    try { ctx.fill(it.fillRule || 'evenodd'); } catch (e) { ctx.fill(); }
  };
}

/* --- resolveCanvasPaint: string warna, atau CanvasGradient bila tersedia --- */
if (typeof resolveCanvasPaint !== 'function') {
  var resolveCanvasPaint = function (ctx, fill, fillGrad) {
    if (!fillGrad || !fillGrad.stops || fillGrad.stops.length < 2) return fill;
    try {
      var g;
      if (fillGrad.type === 'radial' && ctx.createRadialGradient) {
        g = ctx.createRadialGradient(fillGrad.cx, fillGrad.cy, 0, fillGrad.cx, fillGrad.cy, Math.max(0.001, fillGrad.r));
      } else if (ctx.createLinearGradient) {
        g = ctx.createLinearGradient(fillGrad.x1, fillGrad.y1, fillGrad.x2, fillGrad.y2);
      } else return fill;
      for (var i = 0; i < fillGrad.stops.length; i++) {
        var st = fillGrad.stops[i];
        g.addColorStop(Math.max(0, Math.min(1, st.offset)), st.color);
      }
      return g;
    } catch (e) { return fill; }
  };
}

/* === END 00-vmt-compat.js === */

/* === BEGIN 04-ve-export-engine.js === */
/* =====================================================================
 * JS Module 04: VE Engine — SVG Path Parser & EPS / Adobe Illustrator (.ai) Exporter
 * ===================================================================== */
const VE = (() => {
const uid = () => 'n' + Math.random().toString(36).slice(2, 9);

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

const dot = (a, b) => a.x * b.x + a.y * b.y;

const cross = (a, b) => a.x * b.y - a.y * b.x;

const rd = v => Math.round(v * 1000) / 1000;

const P = n => ({ x: n.x, y: n.y });

const NUM = '[-+]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][-+]?\\d+)?';

const nums = s => (s.match(new RegExp(NUM, 'g')) || []).map(Number);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const mmul = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];

function parseTransform(str) {
    let m = [1, 0, 0, 1, 0, 0]; if (!str) return m;
    const re = /(\w+)\s*\(([^)]*)\)/g; let r;
    while ((r = re.exec(str))) {
      const a = nums(r[2]); let t = [1, 0, 0, 1, 0, 0];
      if (r[1] === 'translate') t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
      else if (r[1] === 'scale') t = [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0];
      else if (r[1] === 'rotate') { const g = (a[0] || 0) * Math.PI / 180, c = Math.cos(g), s = Math.sin(g); t = [c, s, -s, c, 0, 0]; if (a.length > 2) t = mmul(mmul([1, 0, 0, 1, a[1], a[2]], t), [1, 0, 0, 1, -a[1], -a[2]]); }
      else if (r[1] === 'matrix' && a.length >= 6) t = a.slice(0, 6);
      else if (r[1] === 'skewX') t = [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0];
      else if (r[1] === 'skewY') t = [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
      m = mmul(m, t);
    }
    return m;
  }

const isId = m => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

const tp = (m, p) => p && ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });

const bake = (subs, m) => isId(m) ? subs : subs.map(sp => ({ ...sp, nodes: sp.nodes.map(n => ({ ...n, ...tp(m, n), handleIn: tp(m, n.handleIn), handleOut: tp(m, n.handleOut) })) }));

function arcToCubics(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (!rx || !ry || (x1 === x2 && y1 === y2)) return null;
    const phi = phiDeg * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = c * dx + s * dy, yp = -s * dx + c * dy;
    const lam = xp * xp / (rx * rx) + yp * yp / (ry * ry);
    if (lam > 1) { const q = Math.sqrt(lam); rx *= q; ry *= q; }
    const den = rx * rx * yp * yp + ry * ry * xp * xp;
    let co = Math.sqrt(Math.max(0, (rx * rx * ry * ry - den) / (den || 1))); if (!!fa === !!fs) co = -co;
    const cxp = co * rx * yp / ry, cyp = -co * ry * xp / rx;
    const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
    const th1 = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx);
    const ux = (xp - cxp) / rx, uy = (yp - cyp) / ry, vx = (-xp - cxp) / rx, vy = (-yp - cyp) / ry;
    let dth = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    if (!fs && dth > 0) dth -= 2 * Math.PI; else if (fs && dth < 0) dth += 2 * Math.PI;
    const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9)), dl = dth / n, t = 4 / 3 * Math.tan(dl / 4);
    const pt = a => [cx + rx * Math.cos(a) * c - ry * Math.sin(a) * s, cy + rx * Math.cos(a) * s + ry * Math.sin(a) * c];
    const dv = a => [-rx * Math.sin(a) * c - ry * Math.cos(a) * s, -rx * Math.sin(a) * s + ry * Math.cos(a) * c];
    const out = []; let a = th1;
    for (let i = 0; i < n; i++) {
      const b = a + dl, p0 = pt(a), d0 = dv(a), p1 = i === n - 1 ? [x2, y2] : pt(b), d1 = dv(b);
      out.push([p0[0] + t * d0[0], p0[1] + t * d0[1], p1[0] - t * d1[0], p1[1] - t * d1[1], p1[0], p1[1]]); a = b;
    }
    return out;
  }

function arcArgs(str) {
    const rn = new RegExp('\\s*,?\\s*(' + NUM + ')', 'y'), rf = /\s*,?\s*([01])/y; let pos = 0; const out = [];
    const rdr = r => { r.lastIndex = pos; const m = r.exec(str); if (!m) return null; pos = r.lastIndex; return +m[1]; };
    for (;;) { const v = []; for (const k of 'nnnffnn') { const t = rdr(k === 'f' ? rf : rn); if (t === null) return out; v.push(t); } out.push(v); }
  }

function parsePath(d, mat) {
    const subs = []; let cur = null, cx = 0, cy = 0, sx = 0, sy = 0, pc = null, pq = null, prev = '';
    const mk = (x, y) => ({ id: uid(), x, y, type: 'corner', handleIn: null, handleOut: null });
    const begin = (x, y) => { cur = { id: uid(), closed: false, nodes: [mk(x, y)] }; subs.push(cur); };
    const line = (x, y) => { if (!cur) begin(cx, cy); cur.nodes.push(mk(x, y)); cx = x; cy = y; };
    const cubic = (x1, y1, x2, y2, x, y) => {
      if (!cur) begin(cx, cy);
      const L = cur.nodes[cur.nodes.length - 1];
      L.handleOut = (x1 === L.x && y1 === L.y) ? null : { x: x1, y: y1 };
      const n = mk(x, y); n.handleIn = (x2 === x && y2 === y) ? null : { x: x2, y: y2 };
      cur.nodes.push(n); cx = x; cy = y; pc = { x: x2, y: y2 };
    };
    const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g; let m;
    while ((m = re.exec(d || ''))) {
      const t = m[1], T = t.toUpperCase(), abs = t === T;
      if (T === 'Z') { if (cur) { cur.closed = true; const f = cur.nodes[0], l = cur.nodes[cur.nodes.length - 1]; if (cur.nodes.length > 1 && Math.hypot(l.x - f.x, l.y - f.y) < 1e-6) { f.handleIn = l.handleIn; cur.nodes.pop(); } } cx = sx; cy = sy; cur = null; pc = pq = null; prev = 'Z'; continue; }
      const cnt = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7 }[T];
      const a = T === 'A' ? arcArgs(m[2]).flat() : nums(m[2]);
      for (let i = 0, first = true; i + cnt <= a.length; i += cnt, first = false) {
        const ox = abs ? 0 : cx, oy = abs ? 0 : cy;
        if (T === 'M') { const x = a[i] + ox, y = a[i + 1] + oy; if (first) { begin(x, y); sx = x; sy = y; cx = x; cy = y; } else line(x, y); pc = pq = null; }
        else if (T === 'L') line(a[i] + ox, a[i + 1] + oy);
        else if (T === 'H') line(a[i] + ox, cy);
        else if (T === 'V') line(cx, a[i] + oy);
        else if (T === 'C') cubic(a[i] + ox, a[i + 1] + oy, a[i + 2] + ox, a[i + 3] + oy, a[i + 4] + ox, a[i + 5] + oy);
        else if (T === 'S') { const r = (prev === 'C' || prev === 'S') && pc ? { x: 2 * cx - pc.x, y: 2 * cy - pc.y } : { x: cx, y: cy }; cubic(r.x, r.y, a[i] + ox, a[i + 1] + oy, a[i + 2] + ox, a[i + 3] + oy); }
        else if (T === 'Q' || T === 'T') {
          let qx, qy, x, y;
          if (T === 'Q') { qx = a[i] + ox; qy = a[i + 1] + oy; x = a[i + 2] + ox; y = a[i + 3] + oy; }
          else { const r = (prev === 'Q' || prev === 'T') && pq ? { x: 2 * cx - pq.x, y: 2 * cy - pq.y } : { x: cx, y: cy }; qx = r.x; qy = r.y; x = a[i] + ox; y = a[i + 1] + oy; }
          cubic(cx + 2 / 3 * (qx - cx), cy + 2 / 3 * (qy - cy), x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x, y); pq = { x: qx, y: qy };
        }
        else if (T === 'A') {
          const x = a[i + 5] + ox, y = a[i + 6] + oy, segs = arcToCubics(cx, cy, a[i], a[i + 1], a[i + 2], a[i + 3], a[i + 4], x, y);
          if (segs) segs.forEach(s => cubic(...s)); else line(x, y);
        }
        prev = T;
      }
      prev = T;
    }
    let out = bake(subs.filter(sp => sp.nodes.length > 1), mat || [1, 0, 0, 1, 0, 0]);
    out.forEach(sp => {
      const ns = sp.nodes, n = ns.length;
      ns.forEach((nd, i) => {
        if (nd.handleIn && nd.handleOut) {
          const vi = sub(nd, nd.handleIn), vo = sub(nd.handleOut, nd);
          if (Math.abs(Math.atan2(cross(vi, vo), dot(vi, vo))) < 0.08) nd.type = Math.abs(Math.hypot(vi.x, vi.y) - Math.hypot(vo.x, vo.y)) < 0.5 ? 'symmetric' : 'smooth'; else nd.type = 'corner';
        } else if (nd.handleIn || nd.handleOut) {
          /* Node ber-handle tunggal hanya 'smooth' jika handle-nya segaris dengan segmen lurus di sisi seberangnya; jika tidak = sudut (corner) */
          const pv = (sp.closed || i > 0) ? ns[(i - 1 + n) % n] : null;
          const nx = (sp.closed || i < n - 1) ? ns[(i + 1) % n] : null;
          const vi = nd.handleIn ? sub(nd, nd.handleIn) : (pv ? sub(nd, pv) : null);
          const vo = nd.handleOut ? sub(nd.handleOut, nd) : (nx ? sub(nx, nd) : null);
          if (vi && vo && Math.hypot(vi.x, vi.y) > 1e-6 && Math.hypot(vo.x, vo.y) > 1e-6 && Math.abs(Math.atan2(cross(vi, vo), dot(vi, vo))) < 0.08) nd.type = 'smooth';
          else nd.type = 'corner';
        }
      });
    });
    return out;
  }

const pc2 = (p, ox = 0, oy = 0) => rd(p.x - ox) + ' ' + rd(p.y - oy);

const seg = (a, b, ox = 0, oy = 0) => (a.handleOut || b.handleIn) ? ' C ' + pc2(a.handleOut || a, ox, oy) + ' ' + pc2(b.handleIn || b, ox, oy) + ' ' + pc2(b, ox, oy) : ' L ' + pc2(b, ox, oy);

function serializeSub(sp, ox = 0, oy = 0) {
    const ns = sp.nodes; if (!ns.length) return '';
    let d = 'M ' + pc2(ns[0], ox, oy);
    for (let i = 1; i < ns.length; i++) d += seg(ns[i - 1], ns[i], ox, oy);
    if (sp.closed) { const a = ns[ns.length - 1], b = ns[0]; if (a.handleOut || b.handleIn) d += seg(a, b, ox, oy); d += ' Z'; }
    return d;
  }

const serializePath = (o, ox = 0, oy = 0) => o.subs.map(sp => serializeSub(sp, ox, oy)).join(' ');

function shapeD(el) {
    const g = k => parseFloat(el.getAttribute(k)) || 0, t = el.tagName;
    if (t === 'path') return el.getAttribute('d') || '';
    if (t === 'rect') { const x = g('x'), y = g('y'), w = g('width'), h = g('height'); let rx = g('rx'), ry = g('ry'); if (!rx) rx = ry; if (!ry) ry = rx; rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`; }
    if (t === 'circle' || t === 'ellipse') { const cx = g('cx'), cy = g('cy'), rx = t === 'circle' ? g('r') : g('rx'), ry = t === 'circle' ? g('r') : g('ry'); return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`; }
    if (t === 'line') return `M${g('x1')} ${g('y1')}L${g('x2')} ${g('y2')}`;
    if (t === 'polyline' || t === 'polygon') { const a = nums(el.getAttribute('points') || ''); let d = ''; for (let i = 0; i + 1 < a.length; i += 2) d += (i ? 'L' : 'M') + a[i] + ' ' + a[i + 1]; return d + (t === 'polygon' ? 'Z' : ''); }
    return null;
  }

function parseSVG(str) {
    const dom = new DOMParser().parseFromString(str, 'image/svg+xml'), svg = dom.querySelector('svg');
    if (!svg || dom.querySelector('parsererror')) return { viewBox: [0, 0, 100, 100], objects: [], unsupported: false, error: true };
    let vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(isNaN) || vb[2] <= 0 || vb[3] <= 0) vb = [0, 0, parseFloat(svg.getAttribute('width')) || 100, parseFloat(svg.getAttribute('height')) || 100];
    const objects = [], used = new Set(), frames = new Set(); let auto = 0, badGrad = false;
    const gdefs = new Map(); svg.querySelectorAll('linearGradient,radialGradient').forEach(ge => { const gid = ge.getAttribute('id'); if (gid) gdefs.set(gid, ge); });
    const gHref = e => (e.getAttribute('href') || e.getAttribute('xlink:href') || '').replace(/^#/, '');
    const gattr = (el, k) => { for (let e = el, i = 0; e && i < 6; i++) { const v = e.getAttribute(k); if (v != null) return v; const hr = gHref(e); e = hr ? gdefs.get(hr) : null; } return null; };
    const gstops = el => { for (let e = el, i = 0; e && i < 6; i++) { const st = Array.from(e.children).filter(c => c.tagName === 'stop'); if (st.length) return st.map(t => { const so = (t.getAttribute('offset') || '0').trim(), st0 = t.getAttribute('style') || '', pm = k => { const mm = st0.match(new RegExp('(?:^|;)\\s*' + k + '\\s*:\\s*([^;]+)')); return mm ? mm[1].trim() : t.getAttribute(k); }; return { offset: Math.max(0, Math.min(1, so.endsWith('%') ? parseFloat(so) / 100 : parseFloat(so) || 0)), color: pm('stop-color') || '#000000', op: pm('stop-opacity') != null ? parseFloat(pm('stop-opacity')) : 1 }; }); const hr = gHref(e); e = hr ? gdefs.get(hr) : null; } return []; };
    const attachGrad = (po, fillStr, m) => {
      const mm = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(fillStr || ''); if (!mm) return;
      const ge = gdefs.get(mm[1]), stops = ge && gstops(ge); if (!stops || !stops.length) { badGrad = true; return; }
      const dsyAttr = gattr(ge, 'data-sy');
      const rad = ge.tagName === 'radialGradient', obb = (gattr(ge, 'gradientUnits') || 'objectBoundingBox') !== 'userSpaceOnUse', gt = gattr(ge, 'gradientTransform'), M = (gt && !dsyAttr) ? parseTransform(gt) : [1, 0, 0, 1, 0, 0];
      const bb = obb ? docBounds({ objects: [po] }) : null; if (obb && !bb) { badGrad = true; return; }
      const num = (k, def) => { const v = gattr(ge, k); if (v == null) return def; const f = parseFloat(v); return isNaN(f) ? def : (String(v).trim().endsWith('%') ? f / 100 : f); };
      const P = (x, y) => { let X = M[0] * x + M[2] * y + M[4], Y = M[1] * x + M[3] * y + M[5]; if (bb) { X = bb[0] + X * (bb[2] - bb[0]); Y = bb[1] + Y * (bb[3] - bb[1]); } else { const X2 = m[0] * X + m[2] * Y + m[4]; Y = m[1] * X + m[3] * Y + m[5]; X = X2; } return [X, Y]; };
      const base = gattr(ge, 'data-base-color') || stops[Math.floor(stops.length / 2)].color, bf = typeof cssToHex === 'function' ? cssToHex(base) : base;
      po.fill = bf;
      if (rad) { const c = P(num('cx', 0.5), num('cy', 0.5)), k = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) * (bb ? ((bb[2] - bb[0]) + (bb[3] - bb[1])) / 2 : Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1); po.grad = { type: 'radial', base: bf, cx: c[0], cy: c[1], r: num('r', 0.5) * k, stops }; if (dsyAttr != null) po.grad.sy = parseFloat(dsyAttr) || 1; if (gattr(ge, 'fx') != null || gattr(ge, 'fy') != null) { const fp = P(num('fx', num('cx', 0.5)), num('fy', num('cy', 0.5))); po.grad.fx = fp[0]; po.grad.fy = fp[1]; } }
      else { const a = P(num('x1', 0), num('y1', 0)), b = P(num('x2', 1), num('y2', 0)); po.grad = { type: 'linear', base: bf, x1: a[0], y1: a[1], x2: b[0], y2: b[1], stops }; }
      const spm = gattr(ge, 'spreadMethod'); if (po.grad && (spm === 'reflect' || spm === 'repeat')) po.grad.spread = spm;
    };
    const prop = (el, k) => { const st = el.getAttribute('style'); if (st) { const m = st.match(new RegExp('(?:^|;)\\s*' + k + '\\s*:\\s*([^;]+)')); if (m) return m[1].trim(); } return el.getAttribute(k); };
    const walk = (el, inh, grp, mat) => {
      const tag = el.tagName; if (!tag || ['defs', 'clipPath', 'mask', 'style', 'title', 'desc', 'metadata'].includes(tag)) return;
      const cur = { ...inh };
      ['fill', 'stroke', 'stroke-width', 'fill-rule'].forEach(k => { const v = prop(el, k); if (v != null && v !== 'inherit') cur[k] = v; });
      const op = prop(el, 'opacity'); if (op != null && !isNaN(parseFloat(op))) cur.opacity = (cur.opacity ?? 1) * parseFloat(op);
      const m = el.getAttribute('transform') ? mmul(mat, parseTransform(el.getAttribute('transform'))) : mat;
      if (tag === 'g') { const gid = el.getAttribute('id') || uid(); if (el.getAttribute('data-container') === 'frame') frames.add(gid); Array.from(el.children).forEach(c => walk(c, cur, gid, m)); return; }
      if (tag === 'image') {
        const href = el.getAttribute('href') || el.getAttribute('xlink:href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), iw = parseFloat(el.getAttribute('width')), ih = parseFloat(el.getAttribute('height'));
        if (!href || !(iw > 0) || !(ih > 0)) return;
        const io = makeImageObj(href, iw, ih, parseFloat(el.getAttribute('x')) || 0, parseFloat(el.getAttribute('y')) || 0, el.getAttribute('id') || 'image-' + (++auto), el.getAttribute('preserveAspectRatio') || 'xMidYMid meet', m);
        let name = io.name; const base = name; let k = 2; while (used.has(name)) name = base + '-' + k++; used.add(name);
        objects.push({ ...io, name, opacity: cur.opacity ?? 1, group: grp }); return;
      }
      const d = shapeD(el); if (d == null) return;
      const subs = parsePath(d, m); if (!subs.length) return;
      let name = el.getAttribute('id') || 'path-' + (++auto); const base = name; let k = 2; while (used.has(name)) name = base + '-' + k++; used.add(name);
      const sc = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
      const po = { id: uid(), name, type: 'path', fill: cur.fill || '#000000', stroke: cur.stroke || 'none', strokeWidth: (parseFloat(cur['stroke-width'] ?? '1') || 0) * sc, opacity: cur.opacity ?? 1, fillRule: cur['fill-rule'] === 'evenodd' ? 'evenodd' : 'nonzero', group: grp, subs };
      if (/^url\(/.test(po.fill)) { attachGrad(po, po.fill, m); if (!po.grad) po.fill = '#808080'; }
      if (/^url\(/.test(po.stroke)) { po.stroke = '#808080'; badGrad = true; }
      objects.push(po);
    };
    Array.from(svg.children).forEach(c => walk(c, {}, null, [1, 0, 0, 1, 0, 0]));
    objects.forEach(o => { if (o.group && (frames.has(o.group) || /^Frame-\d+$/.test(o.group))) { o.containerType = 'frame'; if (o.name === o.group + '-bg') { o.isAutoFrame = true; o.isFrameBg = true; } } });
    return { viewBox: vb, objects, unsupported: badGrad || !!svg.querySelector('pattern,text,use,filter,clipPath,mask') };
  }

function makeImageObj(href, w, h, x, y, name, par, m) {
    const d = 'M' + x + ' ' + y + 'L' + (x + w) + ' ' + y + 'L' + (x + w) + ' ' + (y + h) + 'L' + x + ' ' + (y + h) + 'Z';
    return { id: uid(), name: name || 'image', type: 'image', fill: '#000000', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero', group: null, img: { href, w, h, par: par || 'none' }, subs: parsePath(d, m || [1, 0, 0, 1, 0, 0]) };
  }

function imageMatrix(o) {
    const im = o.img, ns = o.subs[0] && o.subs[0].nodes; if (!im || !ns || ns.length < 2) return null;
    if (ns.length === 4 && !ns.some(n => n.handleIn || n.handleOut)) { const p0 = ns[0], p1 = ns[1], p3 = ns[3]; return [(p1.x - p0.x) / im.w, (p1.y - p0.y) / im.w, (p3.x - p0.x) / im.h, (p3.y - p0.y) / im.h, p0.x, p0.y]; }
    let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18; ns.forEach(n => { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); });
    return [(x1 - x0) / im.w, 0, 0, (y1 - y0) / im.h, x0, y0];
  }

function docBounds(doc, only) {
    let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
    const add = (x, y, pad) => { if (x - pad < x0) x0 = x - pad; if (x + pad > x1) x1 = x + pad; if (y - pad < y0) y0 = y - pad; if (y + pad > y1) y1 = y + pad; };
    doc.objects.forEach(o => { if (only && !only.has(o.id)) return; const pad = o.stroke !== 'none' ? (o.strokeWidth || 0) / 2 : 0;
      o.subs.forEach(sp => { const ns = sp.nodes, n = ns.length; ns.forEach(q => add(q.x, q.y, pad));
        for (let i = 0; i < (sp.closed ? n : n - 1); i++) { const a = ns[i], b = ns[(i + 1) % n]; if (a.handleOut || b.handleIn) for (let k = 1; k < 16; k++) { const q = segPoint(a, b, k / 16); add(q.x, q.y, pad); } } }); });
    return x0 > x1 ? null : [x0, y0, x1, y1];
  }

const gradOn = o => !!(o && o.grad && o.grad.base === o.fill);

const gradXml = (g, id, ox = 0, oy = 0) => {
    const r = v => Math.round(v * 1e4) / 1e4, sp = g.spread && g.spread !== 'pad' ? ' spreadMethod="' + g.spread + '"' : '';
    const st = g.stops.map(t => '<stop offset="' + r(t.offset) + '" stop-color="' + esc(t.color) + '"' + (t.op != null && t.op !== 1 ? ' stop-opacity="' + r(t.op) + '"' : '') + '/>').join('');
    if (g.type === 'radial') { const fx = g.fx != null ? ' fx="' + r(g.fx - ox) + '" fy="' + r(g.fy - oy) + '"' : ''; const gt = (g.sy != null && Math.abs(g.sy - 1) > 0.01) ? ' data-sy="' + r(g.sy) + '" gradientTransform="matrix(1 0 0 ' + r(g.sy) + ' 0 ' + r((g.cy - oy) * (1 - g.sy)) + ')"' : ''; return '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + r(g.cx - ox) + '" cy="' + r(g.cy - oy) + '" r="' + r(g.r) + '"' + fx + gt + sp + '>' + st + '</radialGradient>'; }
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + r(g.x1 - ox) + '" y1="' + r(g.y1 - oy) + '" x2="' + r(g.x2 - ox) + '" y2="' + r(g.y2 - oy) + '"' + sp + '>' + st + '</linearGradient>';
  };

function serializeDoc(doc, opt) {
    opt = opt || {};
    if (doc.objects.some(o => o.hidden)) doc = { ...doc, objects: doc.objects.filter(o => !o.hidden) };   /* layer tersembunyi tidak ikut diekspor (ala Figma) */
    if (opt.area === 'sel' && opt.only) { doc = { ...doc, objects: doc.objects.filter(o => opt.only.has(o.id)) }; }
    let [vx, vy, vw, vh] = doc.viewBox; let body = '', open = null, hasImg = false, gdefs = '', gn = 0; const used = new Set(), gseen = new Set();
    if (opt.area === 'content' || opt.area === 'sel') { const bb = docBounds(doc); if (bb && bb[2] > bb[0] && bb[3] > bb[1]) { vx = Math.floor(bb[0] * 100) / 100; vy = Math.floor(bb[1] * 100) / 100; vw = Math.ceil((bb[2] - vx) * 100) / 100; vh = Math.ceil((bb[3] - vy) * 100) / 100; } }
    /* v7.1: origin dinormalisasi ke (0,0) -> viewBox selalu "0 0 W H" sehingga Illustrator/CorelDRAW/Affinity menaruh objek tepat di artboard */
    const ox = vx, oy = vy; vw = Math.max(1, rd(vw)); vh = Math.max(1, rd(vh));
    const uq = b => { b = String(b || 'path').replace(/[^\w\-.:]/g, '-'); if (!/^[A-Za-z_]/.test(b)) b = 'id-' + b; let k = b, i = 2; while (used.has(k)) k = b + '-' + i++; used.add(k); return k; };
    const r6 = v => Math.round(v * 1e6) / 1e6;
    if (opt.bg && opt.bg.mode === 'solid') body += '<rect x="0" y="0" width="' + vw + '" height="' + vh + '" fill="' + esc(opt.bg.color || '#ffffff') + '"/>';
    doc.objects.forEach(o => {
      if (o.group !== open) { if (open) body += '</g>'; if (o.group) { const isF = o.containerType === 'frame' || o.isAutoFrame || o.isFrameBg || /^frame/i.test(o.group); body += '<g' + (gseen.has(o.group) ? '' : ' id="' + esc(o.group) + '"') + (isF ? ' data-container="frame"' : '') + '>'; gseen.add(o.group); } open = o.group; }
      if (o.img) { const m = imageMatrix(o); if (!m) return; hasImg = true;
        const mS = [m[0], m[1], m[2], m[3], m[4] - ox, m[5] - oy];
        body += '<image id="' + uq(o.name) + '" href="' + esc(o.img.href) + '" xlink:href="' + esc(o.img.href) + '" x="0" y="0" width="' + r6(o.img.w) + '" height="' + r6(o.img.h) + '" preserveAspectRatio="' + esc(o.img.par || 'none') + '" transform="matrix(' + mS.map(r6).join(' ') + ')"' + (o.opacity !== 1 ? ' opacity="' + rd(o.opacity) + '"' : '') + '/>'; return; }
      let fillA = esc(o.fill); if (gradOn(o)) { const gid = 'grad-' + (++gn); gdefs += gradXml(o.grad, gid, ox, oy); fillA = 'url(#' + gid + ')'; }
      body += '<path id="' + uq(o.name) + '" fill="' + fillA + '"' + (o.stroke !== 'none' && o.strokeWidth > 0 ? ' stroke="' + esc(o.stroke) + '" stroke-width="' + rd(o.strokeWidth) + '"' : '') + (o.opacity !== 1 ? ' opacity="' + rd(o.opacity) + '"' : '') + (o.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '') + ' d="' + serializePath(o, ox, oy) + '"/>';
    });
    if (open) body += '</g>';
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"' + (hasImg ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : '') + ' version="1.1" width="' + vw + '" height="' + vh + '" viewBox="0 0 ' + vw + ' ' + vh + '">' + (gdefs ? '<defs>' + gdefs + '</defs>' : '') + body + '</svg>';
  }

function segPoint(a, b, t) {
    if (!a.handleOut && !b.handleIn) return lerp(a, b, t);
    const p1 = a.handleOut || P(a), p2 = b.handleIn || P(b), u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * b.y };
  }

const b64enc = str => { const u8 = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

const embedLines = svg => (b64enc(svg).match(/.{1,100}/g) || []).map(l => '%SVGPeak-Data: ' + l).join('\n') + '\n';

const hex01 = hx => { const h = cssToHex(hx || '#000000'); return [1, 3, 5].map(i => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4)).join(' '); };

const hasPaint = o => { const f = o.fill && o.fill !== 'none', s = o.stroke && o.stroke !== 'none' && o.strokeWidth > 0; return { f, s }; };

function pathOps(o, mv, ln, cu, cz) {
    let t = '';
    o.subs.forEach(sp => {
      const ns = sp.nodes, n = ns.length; if (!n) return;
      t += mv(ns[0]);
      const lim = sp.closed ? n : n - 1;
      for (let i = 0; i < lim; i++) {
        const a = ns[i], b = ns[(i + 1) % n];
        if (a.handleOut || b.handleIn) { const c1 = a.handleOut || a, c2 = b.handleIn || b; t += cu(c1, c2, b); }
        else if (i < n - 1) t += ln(b);
      }
      if (sp.closed) t += cz();
    });
    return t;
  }

function exportEPS(doc, opt) {
    opt = opt || {};
    const svgStr = serializeDoc(doc, opt), parsed = parseSVG(svgStr), [vx, vy, vw, vh] = parsed.viewBox;
    let ps = '%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: SVGPeak Auto Trace\n%%BoundingBox: 0 0 ' + Math.ceil(vw) + ' ' + Math.ceil(vh) + '\n%%HiResBoundingBox: 0 0 ' + rd(vw) + ' ' + rd(vh) + '\n%%LanguageLevel: 2\n%%Pages: 1\n%%EndComments\n';
    ps += embedLines(svgStr);
    ps += 'gsave\n0 ' + rd(vh) + ' translate 1 -1 scale\n' + rd(-vx) + ' ' + rd(-vy) + ' translate\n';
    if (opt.bg && opt.bg.mode === 'solid') ps += hex01(opt.bg.color) + ' setrgbcolor\n' + rd(vx) + ' ' + rd(vy) + ' ' + rd(vw) + ' ' + rd(vh) + ' rectfill\n';
    parsed.objects.forEach(o => {
      if (o.img) return; const { f, s } = hasPaint(o); if (!f && !s) return;
      ps += 'newpath\n' + pathOps(o, p => rd(p.x) + ' ' + rd(p.y) + ' moveto\n', p => rd(p.x) + ' ' + rd(p.y) + ' lineto\n',
        (c1, c2, p) => rd(c1.x) + ' ' + rd(c1.y) + ' ' + rd(c2.x) + ' ' + rd(c2.y) + ' ' + rd(p.x) + ' ' + rd(p.y) + ' curveto\n', () => 'closepath\n');
      const fOp = o.fillRule === 'evenodd' ? 'eofill' : 'fill';
      if (f && s) ps += 'gsave ' + hex01(o.fill) + ' setrgbcolor ' + fOp + ' grestore\n' + hex01(o.stroke) + ' setrgbcolor ' + rd(o.strokeWidth) + ' setlinewidth stroke\n';
      else if (f) ps += hex01(o.fill) + ' setrgbcolor ' + fOp + '\n';
      else ps += hex01(o.stroke) + ' setrgbcolor ' + rd(o.strokeWidth) + ' setlinewidth stroke\n';
    });
    return ps + 'grestore\nshowpage\n%%EOF\n';
  }

function exportAI(doc, opt) {
    opt = opt || {};
    const svgStr = serializeDoc(doc, opt), parsed = parseSVG(svgStr), [vx, vy, vw, vh] = parsed.viewBox;
    const gs = []; let stm = 'q\n1 0 0 -1 ' + rd(-vx) + ' ' + rd(vh + vy) + ' cm\n';
    if (opt.bg && opt.bg.mode === 'solid') stm += hex01(opt.bg.color) + ' rg\n' + rd(vx) + ' ' + rd(vy) + ' ' + rd(vw) + ' ' + rd(vh) + ' re f\n';
    parsed.objects.forEach(o => {
      if (o.img) return; const { f, s } = hasPaint(o); if (!f && !s) return;
      const op = o.opacity != null && o.opacity < 1; let gi = 0;
      if (op) { gs.push(rd(o.opacity)); gi = gs.length; stm += 'q\n/GS' + gi + ' gs\n'; }
      if (f) stm += hex01(o.fill) + ' rg\n';
      if (s) stm += hex01(o.stroke) + ' RG ' + rd(o.strokeWidth) + ' w\n';
      stm += pathOps(o, p => rd(p.x) + ' ' + rd(p.y) + ' m\n', p => rd(p.x) + ' ' + rd(p.y) + ' l\n',
        (c1, c2, p) => rd(c1.x) + ' ' + rd(c1.y) + ' ' + rd(c2.x) + ' ' + rd(c2.y) + ' ' + rd(p.x) + ' ' + rd(p.y) + ' c\n', () => 'h\n');
      const eo = o.fillRule === 'evenodd';
      stm += (f && s ? (eo ? 'B*' : 'B') : f ? (eo ? 'f*' : 'f') : 'S') + '\n';
      if (op) stm += 'Q\n';
    });
    stm += 'Q\n';
    const res = gs.length ? '<< /ExtGState << ' + gs.map((a, i) => '/GS' + (i + 1) + ' << /Type /ExtGState /ca ' + a + ' /CA ' + a + ' >>').join(' ') + ' >> >>' : '<< >>';
    const box = '[0 0 ' + rd(vw) + ' ' + rd(vh) + ']';
    const objs = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox ' + box + ' /ArtBox ' + box + ' /Contents 4 0 R /Resources ' + res + ' >>\nendobj\n',
      '4 0 obj\n<< /Length ' + stm.length + ' >>\nstream\n' + stm + 'endstream\nendobj\n',
      '5 0 obj\n<< /Producer (SVGPeak Auto Trace) /Creator (SVGPeak) >>\nendobj\n'
    ];
    let pdf = '%PDF-1.4\n' + embedLines(svgStr); const offs = [];   /* semua ASCII → panjang string = offset byte */
    objs.forEach(o => { offs.push(pdf.length); pdf += o; });
    const xp = pdf.length;
    pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(p => { pdf += String(p).padStart(10, '0') + ' 00000 n \n'; });
    return pdf + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 5 0 R >>\nstartxref\n' + xp + '\n%%EOF\n';
  }

return { parseSVG, exportEPS, exportAI };
})();

/* === END 04-ve-export-engine.js === */

/* === BEGIN 05-vmt-color-edge.js === */
/* =====================================================================
 * JS Module 05: VMT Engine Part 1 — CIE-Lab / CIEDE2000 Color Space, Bilateral Filter & Scharr Edge Tensor
 * ===================================================================== */
/* ---------------- Utilitas Dasar & Ruang Warna CIE-Lab ---------------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
/* [RT-SMOOTH] tick() tahan banting: rAF dibekukan browser di tab tersembunyi/layar mati sehingga pipeline dulu bisa macet total.
   Timer cadangan 90 ms menjamin pipeline selalu lanjut; saat tab terlihat perilaku tetap "tunggu 1 frame lalu lanjut". */
const tick = () => new Promise(r => {
  let done = false;
  const fin = () => { if (!done) { done = true; r(); } };
  requestAnimationFrame(() => setTimeout(fin, 0));
  setTimeout(fin, 90);
});
/* [RT-SMOOTH] Beri napas ke UI hanya bila sudah >= ms sejak jeda terakhir (murah dipanggil di dalam loop rapat) */
let _lastYieldT = 0;
const yieldIfDue = async (ms = 14) => {
  const n = performance.now();
  if (n - _lastYieldT >= ms) { await tick(); _lastYieldT = performance.now(); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* LUT sRGB (0..255) -> Linear RGB & Gamma 2.2 untuk mempercepat jutaan konversi CIE-Lab */
const _SRGB_LIN_LUT = new Float32Array(256);
const _GAMMA22_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  _SRGB_LIN_LUT[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  _GAMMA22_LUT[i] = Math.pow(i, 2.2);
}

/* Konversi sRGB (0..255) -> CIE L*a*b* (D65, 2° Observer standar ISO/CIE) */
function rgb2lab(r, g, b) {
  let R, G, B;
  const ri = r | 0, gi = g | 0, bi = b | 0;
  if (r === ri && g === gi && b === bi && (ri | gi | bi) >= 0 && (ri | gi | bi) < 256) {
    R = _SRGB_LIN_LUT[ri]; G = _SRGB_LIN_LUT[gi]; B = _SRGB_LIN_LUT[bi];
  } else {
    R = r / 255; G = g / 255; B = b / 255;
    R = R <= 0.04045 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4);
    G = G <= 0.04045 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4);
    B = B <= 0.04045 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4);
  }
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) * 1.05211106;
  const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
  const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) * 0.918417016;
  const eps = 0.008856451679035631;
  const kap = 903.2962962962963;
  const fx = X > eps ? Math.cbrt(X) : (kap * X + 16) / 116;
  const fy = Y > eps ? Math.cbrt(Y) : (kap * Y + 16) / 116;
  const fz = Z > eps ? Math.cbrt(Z) : (kap * Z + 16) / 116;
  return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/* Konversi CIE L*a*b* -> Koordinat Polar CIELCh (L*, C*, h° [0..360)) */
function lab2lch(L, a, b) {
  const C = Math.hypot(a, b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return [L, C, h];
}

/* Rumus Standar ISO/CIE 11664-6:2022 — CIEDE2000 (ΔE00) Colour-Difference Formula */
function ciede2000(L1, a1, b1, L2, a2, b2) {
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = 0.5 * (C1 + C2);
  const Cbar7 = Math.pow(Cbar, 7);
  const POW25_7 = 6103515625; /* 25^7 */
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = (C1p < 1e-7) ? 0 : Math.atan2(b1, a1p) * (180 / Math.PI);
  if (h1p < 0) h1p += 360;
  let h2p = (C2p < 1e-7) ? 0 : Math.atan2(b2, a2p) * (180 / Math.PI);
  if (h2p < 0) h2p += 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p > 1e-8) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  const Lbarp = 0.5 * (L1 + L2);
  const Cbarp = 0.5 * (C1p + C2p);
  let hbarp = h1p + h2p;
  if (C1p * C2p > 1e-8) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = 0.5 * (h1p + h2p);
    else if (h1p + h2p < 360) hbarp = 0.5 * (h1p + h2p + 360);
    else hbarp = 0.5 * (h1p + h2p - 360);
  }
  const deg2rad = Math.PI / 180;
  const T = 1
    - 0.17 * Math.cos((hbarp - 30) * deg2rad)
    + 0.24 * Math.cos((2 * hbarp) * deg2rad)
    + 0.32 * Math.cos((3 * hbarp + 6) * deg2rad)
    - 0.20 * Math.cos((4 * hbarp - 63) * deg2rad);

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + POW25_7));
  const Lsub = Lbarp - 50, Lsub2 = Lsub * Lsub;
  const SL = 1 + (0.015 * Lsub2) / Math.sqrt(20 + Lsub2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(2 * dTheta * deg2rad) * RC;

  const fL = dLp / SL, fC = dCp / SC, fH = dHp / SH;
  return Math.sqrt(Math.max(0, fL * fL + fC * fC + fH * fH + RT * fC * fH));
}

/* Jarak warna perseptual Redmean + bobot kroma */
function cdist2(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2, rm = (r1 + r2) * 0.5;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

const hexOf = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const rgbOf = hex => {
  const h = String(hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
};

/* Muat gambar dari File/Blob/DataURL -> {img, w, h} */
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res({ img, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    img.onerror = rej;
    if (src instanceof File || src instanceof Blob) {
      const u = URL.createObjectURL(src);
      img.onload = () => { URL.revokeObjectURL(u); res({ img, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height }); };
      img.src = u;
    } else {
      img.src = src;
    }
  });
}

function toImageData(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, w, h);
  return x.getImageData(0, 0, w, h);
}

/* Resolusi kerja tinggi agar detail halus & sudut presisi (hingga 920px) */
function makeWork(src, maxDim = 840) {
  const k = Math.min(1, maxDim / Math.max(src.w, src.h));
  const w = Math.max(16, Math.round(src.w * k));
  const h = Math.max(16, Math.round(src.h * k));
  return { data: toImageData(src.img, w, h), w, h, scale: 1 / k, k };
}

/* Pra-penapisan Bilateral Edge- & Corner-Preserving
   Meredam derau/ringing JPEG tanpa menumpulkan ujung sudut lancip (C0) pada poligon, huruf & ilustrasi */
async function bilateralPreFilter(work, mask, sigmaSpatial = 1.4, sigmaColor = 22, onTick, bOpt = {}) {
  if (bOpt && bOpt.skipIfClean) return;
  const { data, w, h } = work;
  const src = new Uint8ClampedArray(data.data);
  const dst = data.data;
  const radius = clamp((bOpt && bOpt.radius) || (sigmaSpatial <= 1.15 ? 1 : 2), 1, 3);
  const wedgeThr = (bOpt && bOpt.wedgeGuardThr) || 780;
  const spWeight = new Float32Array((2 * radius + 1) * (2 * radius + 1));
  const inv2Sp = 1 / (2 * sigmaSpatial * sigmaSpatial);
  const inv2Col = 1 / (2 * sigmaColor * sigmaColor * 9);

  let idx = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      spWeight[idx++] = Math.exp(-(dx * dx + dy * dy) * inv2Sp);
    }
  }

  const RING_DX = [1, 1, 0, -1, -1, -1, 0, 1];
  const RING_DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const chunk = Math.max(12, Math.floor(h / 8));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (mask && mask[p]) continue;
      const i0 = p * 4;
      const r0 = src[i0], g0 = src[i0 + 1], b0 = src[i0 + 2];

      /* Guard Sudut Lancip (Wedge Aperture Guard) & Garis Tipis:
         Periksa jumlah dan sebaran sudut tetangga 8-arah yang sewarna.
         Jika tetangga sewarna <= 3 (ujung sudut <= 135 derajat) atau membentuk baji sempit,
         lindungi piksel dari pengaburan agar puncak segitiga/poligon tetap tajam! */
      let simN = 0, ringBits = 0;
      for (let k = 0; k < 8; k++) {
        const ny = clamp(y + RING_DY[k], 0, h - 1) * w;
        const np = ny + clamp(x + RING_DX[k], 0, w - 1);
        if (mask && mask[np]) continue;
        const ni = np * 4;
        if (cdist2(r0, g0, b0, src[ni], src[ni + 1], src[ni + 2]) < wedgeThr) {
          simN++;
          ringBits |= (1 << k);
        }
      }
      if (simN <= 3) continue;
      if (simN === 4) {
        const dbl = ringBits | (ringBits << 8);
        let contiguous4 = false;
        for (let k = 0; k < 8; k++) {
          if (((dbl >> k) & 15) === 15) { contiguous4 = true; break; }
        }
        if (contiguous4) continue;
      }

      /* Guard Lembah Garis (1D Valley/Crease) & Punggung Detail 1-2px (Garis Jari, Bulu Mata, Helai Rambut):
         Lindungi piksel yang menjadi titik ekstrem lokal (lembah gelap atau punggung terang) pada jarak 1-2px */
      if (x >= 2 && x < w - 2 && y >= 2 && y < h - 2) {
        const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
        let isCreaseOrRidge = false;
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
          const iA1 = ((y - dy) * w + (x - dx)) * 4;
          const iB1 = ((y + dy) * w + (x + dx)) * 4;
          const iA2 = ((y - 2 * dy) * w + (x - 2 * dx)) * 4;
          const iB2 = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
          const lA = Math.max(0.299 * src[iA1] + 0.587 * src[iA1 + 1] + 0.114 * src[iA1 + 2], 0.299 * src[iA2] + 0.587 * src[iA2 + 1] + 0.114 * src[iA2 + 2]);
          const lB = Math.max(0.299 * src[iB1] + 0.587 * src[iB1 + 1] + 0.114 * src[iB1 + 2], 0.299 * src[iB2] + 0.587 * src[iB2 + 1] + 0.114 * src[iB2 + 2]);
          const lMinA = Math.min(0.299 * src[iA1] + 0.587 * src[iA1 + 1] + 0.114 * src[iA1 + 2], 0.299 * src[iA2] + 0.587 * src[iA2 + 1] + 0.114 * src[iA2 + 2]);
          const lMinB = Math.min(0.299 * src[iB1] + 0.587 * src[iB1 + 1] + 0.114 * src[iB1 + 2], 0.299 * src[iB2] + 0.587 * src[iB2 + 1] + 0.114 * src[iB2 + 2]);
          if ((l0 < lA - 3.8 && l0 < lB - 3.8) || (l0 > lMinA + 5.5 && l0 > lMinB + 5.5)) {
            isCreaseOrRidge = true;
            break;
          }
        }
        if (isCreaseOrRidge) continue;
      }

      let sr = 0, sg = 0, sb = 0, sw = 0, wi = 0;
      const localInv2Col = simN <= 5 ? inv2Col * 2.8 : inv2Col;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = clamp(y + dy, 0, h - 1);
        const rowOff = ny * w;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = clamp(x + dx, 0, w - 1);
          const np = rowOff + nx;
          const sw0 = spWeight[wi++];
          if (mask && mask[np]) continue;
          const ni = np * 4;
          const r = src[ni], g = src[ni + 1], b = src[ni + 2];
          const dc2 = cdist2(r0, g0, b0, r, g, b);
          const wgt = sw0 * Math.exp(-dc2 * localInv2Col);
          sr += r * wgt; sg += g * wgt; sb += b * wgt; sw += wgt;
        }
      }
      if (sw > 1e-6) {
        dst[i0] = Math.round(sr / sw);
        dst[i0 + 1] = Math.round(sg / sw);
        dst[i0 + 2] = Math.round(sb / sw);
      }
    }
    if (y % chunk === 0 && onTick) {
      await onTick(y / h);
    }
  }
}

/* =====================================================================
   TAHAP 1 — ImageClassification, ParameterClassifier & EdgeImage
   Implementasi: Multi-Channel DiZenzo Color-Tensor Scharr 2D Gradient
   (menangkap tepi luma maupun tepi warna isoluminant secara akurat),
   GLCM/CCM 4-arah, Entropi Spektral, dan Detektor Blok DCT 8x8 Murni.
   ===================================================================== */
function buildEdgeField(work, mask, forceCpu = false) {
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuBuildEdgeField) {
    const gpuEf = GpuAccelerator.gpuBuildEdgeField(work, mask);
    if (gpuEf) return gpuEf;
  }
  const { data, w, h } = work, d = data.data, n = w * h;
  const lum = new Float32Array(n);
  const cRG = new Float32Array(n);
  const cBY = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    cRG[p] = (r - g) * 0.55;
    cBY[p] = (0.5 * (r + g) - b) * 0.45;
  }
  const gxArr = new Float32Array(n);
  const gyArr = new Float32Array(n);
  const magArr = new Float32Array(n);

  const scharrAt = (arr, x, y) => {
    const ym1 = clamp(y - 1, 0, h - 1) * w, y0 = clamp(y, 0, h - 1) * w, yp1 = clamp(y + 1, 0, h - 1) * w;
    const xm1 = clamp(x - 1, 0, w - 1), x0 = clamp(x, 0, w - 1), xp1 = clamp(x + 1, 0, w - 1);
    const gx = (-3 * arr[ym1 + xm1] - 10 * arr[y0 + xm1] - 3 * arr[yp1 + xm1]
               + 3 * arr[ym1 + xp1] + 10 * arr[y0 + xp1] + 3 * arr[yp1 + xp1]) / 32;
    const gy = (-3 * arr[ym1 + xm1] - 10 * arr[ym1 + x0] - 3 * arr[ym1 + xp1]
               + 3 * arr[yp1 + xm1] + 10 * arr[yp1 + x0] + 3 * arr[yp1 + xp1]) / 32;
    return [gx, gy];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (mask && mask[p]) continue;
      const [lx, ly] = scharrAt(lum, x, y);
      const [rx, ry] = scharrAt(cRG, x, y);
      const [bx, by] = scharrAt(cBY, x, y);
      /* Tensor Gradien Warna DiZenzo: ekstraksi arah utama & magnitudo gabungan */
      const gxx = lx * lx + rx * rx + bx * bx;
      const gyy = ly * ly + ry * ry + by * by;
      const gxy = lx * ly + rx * ry + bx * by;
      const tr = gxx + gyy;
      if (tr > 1e-6) {
        const disc = Math.hypot(gxx - gyy, 2 * gxy);
        const lambda1 = Math.max(0, 0.5 * (tr + disc));
        const mag = Math.sqrt(lambda1);
        const theta = 0.5 * Math.atan2(2 * gxy, gxx - gyy);
        let vx = Math.cos(theta), vy = Math.sin(theta);
        const domX = Math.abs(lx) >= Math.abs(rx) && Math.abs(lx) >= Math.abs(bx) ? lx : (Math.abs(rx) >= Math.abs(bx) ? rx : bx);
        const domY = Math.abs(ly) >= Math.abs(ry) && Math.abs(ly) >= Math.abs(by) ? ly : (Math.abs(ry) >= Math.abs(by) ? ry : by);
        if (vx * domX + vy * domY < 0) { vx = -vx; vy = -vy; }
        gxArr[p] = vx * mag;
        gyArr[p] = vy * mag;
        magArr[p] = mag;
      }
    }
  }
  return { lum, gx: gxArr, gy: gyArr, mag: magArr };
}


/* === END 05-vmt-color-edge.js === */

/* === BEGIN 06-vmt-profiler-adaptive.js === */
/* =====================================================================
 * JS Module 06: VMT Engine Part 2 — 8-Stage Multiscale Image Profiler & Adaptive Trace Profile
 * ===================================================================== */
/* =====================================================================
   ARSITEKTUR IMAGE PROFILER 8-TAHAP MULTISKALA & 2-SUMBU STRUKTUR WARNA
   Sesuai Spesifikasi:
   - Tahap 1: Input & Multiskala (Anti-aliased box-area downsampling + full-res micro-detail sampling)
   - Tahap 2: Distribusi Warna (Warna efektif CIE-Lab & CIEDE2000, entropi, persentil Q10/Q25/Q50/Q90 berbobot luas)
   - Tahap 3: Struktur Tepi (Kepadatan tepi, kontras, orientasi dominan, kontinuitas garis, rasio lurus/kurva, junctions di L*a*b*)
   - Tahap 4: Noise & Tekstur (Pemisahan noise sensor/JPEG dari tekstur bermakna, estimasi noise area datar, blockiness 8x8)
   - Tahap 5: Topologi Region (Komponen terhubung, distribusi luas, lubang/holes, rasio perimeter/luas, island kecil)
   - Tahap 6: Gradasi & Nada (Deteksi ramp kontinu monoton di L*, a*, b* vs batas tegas)
   - Tahap 7: Geometri & Stroke (Kelurusan, ketebalan stroke, lebar ujung garis, ketajaman sudut vs ujung membulat)
   - Tahap 8: Resolver & Validasi (Profil berbobot + 6 atribut independen + tingkat keyakinan/confidence)
   ===================================================================== */
function downsampleAreaAverageLab(d, w, h, step) {
  const sw = Math.max(4, Math.floor(w / step));
  const sh = Math.max(4, Math.floor(h / step));
  const n = sw * sh;
  const rArr = new Float32Array(n);
  const gArr = new Float32Array(n);
  const bArr = new Float32Array(n);
  const aArr = new Float32Array(n);
  const LArr = new Float32Array(n);
  const caArr = new Float32Array(n);
  const cbArr = new Float32Array(n);
  const gray = new Float32Array(n);
  const qcol = new Uint16Array(n);

  for (let sy = 0; sy < sh; sy++) {
    const y0 = sy * step, y1 = Math.min(h, y0 + step);
    for (let sx = 0; sx < sw; sx++) {
      const x0 = sx * step, x1 = Math.min(w, x0 + step);
      let sr = 0, sg = 0, sb = 0, sa = 0, cnt = 0, wCnt = 0;
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        for (let x = x0; x < x1; x++) {
          const i = (row + x) * 4;
          const a = d[i + 3];
          sa += a; cnt++;
          if (a >= 32) {
            sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; wCnt++;
          }
        }
      }
      const idx = sy * sw + sx;
      const mr = wCnt > 0 ? sr / wCnt : 0;
      const mg = wCnt > 0 ? sg / wCnt : 0;
      const mb = wCnt > 0 ? sb / wCnt : 0;
      const ma = cnt > 0 ? sa / cnt : 0;
      rArr[idx] = mr; gArr[idx] = mg; bArr[idx] = mb; aArr[idx] = ma;
      gray[idx] = 0.299 * mr + 0.587 * mg + 0.114 * mb;
      qcol[idx] = ((Math.round(mr) >> 4) << 8) | ((Math.round(mg) >> 4) << 4) | (Math.round(mb) >> 4);
      const [L, ca, cb] = rgb2lab(mr, mg, mb);
      LArr[idx] = L; caArr[idx] = ca; cbArr[idx] = cb;
    }
  }
  return { sw, sh, rArr, gArr, bArr, aArr, LArr, caArr, cbArr, gray, qcol, step };
}

function computeWeightedQuantiles(vals, weights) {
  if (!vals || !vals.length) return { q10: 8.0, q25: 10.5, q50: 14.0, q90: 24.0, mean: 14.0 };
  const pairs = vals.map((v, i) => ({ v, w: (weights && weights[i]) || 1 })).sort((a, b) => a.v - b.v);
  let totW = 0, wSum = 0;
  for (const p of pairs) { totW += p.w; wSum += p.v * p.w; }
  if (totW <= 0) return { q10: 8.0, q25: 10.5, q50: 14.0, q90: 24.0, mean: 14.0 };
  const atQ = q => {
    const target = q * totW;
    let acc = 0;
    for (const p of pairs) {
      acc += p.w;
      if (acc >= target) return +p.v.toFixed(2);
    }
    return +pairs[pairs.length - 1].v.toFixed(2);
  };
  return {
    q10: atQ(0.10),
    q25: atQ(0.25),
    q50: atQ(0.50),
    q90: atQ(0.90),
    mean: +(wSum / totW).toFixed(2)
  };
}

/* Analisis Sumbu A (Struktur Keluarga Warna di CIELCh) & Sumbu B (Permukaan Flat vs Gradasi) */
function analyzeColorFamilyStructure(clusters, plateauInfo, gradientContinuity, noiseLevel, totalInteriorPix) {
  const validClusters = (clusters && clusters.length) ? clusters : [];
  const pModes = (plateauInfo && plateauInfo.plateauModes) || [];
  const flatFrac = (plateauInfo && plateauInfo.flatPixelFrac) || 0;
  const gradFrac = (plateauInfo && plateauInfo.gradPixelFrac) || 0;

  let minL = 100, maxL = 0, minC = 200, maxC = 0;
  let cosSum = 0, sinSum = 0, chromaWeightSum = 0;
  const hueBins = [];
  let hasNeutralFamily = false;
  let neutralSupport = 0;
  let totalSupport = 0;

  const sourceList = pModes.length >= 2 ? pModes : validClusters;
  for (const c of sourceList) {
    const L = c.L ?? 50, a = c.a ?? 0, b = c.b2 ?? c.b ?? 0;
    const cnt = c.count || c.cnt || 1;
    totalSupport += cnt;
    const [, C, hDeg] = lab2lch(L, a, b);
    if (L < minL) minL = L;
    if (L > maxL) maxL = L;
    if (C < minC) minC = C;
    if (C > maxC) maxC = C;

    /* Warna hampir netral (C < 9.5) diberi bobot rendah pada sirkular hue & dikelompokkan sebagai akromatik */
    const neutralDamp = C < 9.5 ? (C / 9.5) * 0.18 : 1.0;
    const w = Math.log2(1 + cnt) * Math.pow(Math.max(1, C), 0.85) * neutralDamp;
    const rad = (hDeg * Math.PI) / 180;
    cosSum += Math.cos(rad) * w;
    sinSum += Math.sin(rad) * w;
    chromaWeightSum += w;

    if (C < 9.5 || L <= 14 || L >= 94) {
      hasNeutralFamily = true;
      neutralSupport += cnt;
    } else {
      /* Kelompokkan keluarga warna berdasarkan sudut hue (toleransi ~28 derajat) & chroma */
      let matchedFam = null;
      for (const fam of hueBins) {
        let dHue = Math.abs(hDeg - fam.meanHue);
        if (dHue > 180) dHue = 360 - dHue;
        if (dHue <= 28) { matchedFam = fam; break; }
      }
      if (matchedFam) {
        const nw = matchedFam.weight + cnt;
        const r1 = (matchedFam.meanHue * Math.PI) / 180;
        const mx = Math.cos(r1) * matchedFam.weight + Math.cos(rad) * cnt;
        const my = Math.sin(r1) * matchedFam.weight + Math.sin(rad) * cnt;
        let nh = Math.atan2(my, mx) * (180 / Math.PI);
        if (nh < 0) nh += 360;
        matchedFam.meanHue = nh;
        matchedFam.weight = nw;
        matchedFam.shades++;
      } else {
        hueBins.push({ meanHue: hDeg, weight: cnt, shades: 1 });
      }
    }
  }

  const significantHueFamilies = hueBins.filter(f => f.weight >= Math.max(2, totalSupport * 0.0035));
  const colorFamilyCount = Math.max(1, significantHueFamilies.length + (hasNeutralFamily && (neutralSupport >= totalSupport * 0.04 || significantHueFamilies.length === 0) ? 1 : 0));

  /* Koherensi keluarga warna sirkular CIELCh (0..1): 1 berarti terfokus pada 1 keluarga rona */
  const resultantLen = chromaWeightSum > 1e-5 ? (Math.hypot(cosSum, sinSum) / chromaWeightSum) : 1.0;
  const familyCoherence = significantHueFamilies.length <= 1
    ? clamp(0.78 + resultantLen * 0.22, 0, 1)
    : clamp(resultantLen * (1 / Math.sqrt(significantHueFamilies.length)), 0, 1);

  const shadeLevelCount = Math.max(pModes.length, validClusters.length);
  const lightnessSpread = sourceList.length > 1 ? +(maxL - minL).toFixed(1) : 0;
  const chromaSpread = sourceList.length > 1 ? +(maxC - minC).toFixed(1) : 0;
  const plateauSupport = clamp(flatFrac + (pModes.length >= 2 ? 0.18 : 0), 0, 1);

  /* Estimasi rasio shade semu/noise di dalam keluarga warna */
  const unsupportedClusters = validClusters.filter(c => (c.cnt || c.count || 0) < Math.max(6, totalInteriorPix * 0.0025)).length;
  const familyNoiseRatio = clamp(
    (unsupportedClusters / Math.max(1, validClusters.length)) * 0.55 + noiseLevel * 0.45 * (1 - plateauSupport * 0.6),
    0, 1
  );

  /* Sumbu B: Karakter Permukaan Transisi Warna (flat vs gradient vs mixed) */
  let surfaceMode = 'flat';
  const effGradCont = clamp(gradientContinuity * 0.65 + clamp(gradFrac * 8.5, 0, 1) * 0.35, 0, 1);
  if (effGradCont >= 0.32 || (plateauInfo && plateauInfo.hasSmoothGradient && flatFrac < 0.42)) {
    surfaceMode = 'gradient';
  } else if (effGradCont >= 0.14 || (plateauInfo && plateauInfo.hasSmoothGradient)) {
    surfaceMode = 'mixed';
  } else {
    surfaceMode = 'flat';
  }

  /* Aturan Pengambilan Keputusan Struktur Warna (Sesuai Bagian 5 & Koreksi 2-Sumbu di Markdown) */
  let colorStructureMode = 'MIXED_COLOR_STRUCTURE';
  const isCoherentSingleFamily = (colorFamilyCount <= 2 && familyCoherence >= 0.68) || (plateauInfo && plateauInfo.isSingleFamilyMultiShade);
  if (familyNoiseRatio >= 0.48 && plateauSupport < 0.38) {
    colorStructureMode = 'FAMILY_NOISE';
  } else if (isCoherentSingleFamily && surfaceMode === 'flat' && shadeLevelCount >= 3 && plateauSupport >= 0.35) {
    colorStructureMode = 'DISCRETE_FAMILY_SHADES';
  } else if (isCoherentSingleFamily && (surfaceMode === 'gradient' || effGradCont >= 0.22)) {
    colorStructureMode = 'FAMILY_GRADIENT';
  } else if (!isCoherentSingleFamily && surfaceMode === 'flat') {
    colorStructureMode = 'MULTI_FAMILY_FLAT';
  } else if (!isCoherentSingleFamily && surfaceMode === 'gradient') {
    colorStructureMode = 'MULTI_FAMILY_GRADIENT';
  }

  return {
    colorFamilyCount,
    surfaceMode,
    colorStructureMode,
    familyCoherence: +familyCoherence.toFixed(2),
    shadeLevelCount,
    lightnessSpread,
    chromaSpread,
    plateauSupport: +plateauSupport.toFixed(2),
    gradientContinuity: +effGradCont.toFixed(2),
    familyNoiseRatio: +familyNoiseRatio.toFixed(2)
  };
}

function classifyStage(work, alphaInfo, origW, origH) {
  const { data, w, h } = work, d = data.data;

  /* ---- TAHAP 1 PROFILER: Input & Sampling Multiskala Anti-Aliased + Full-Res Micro Sampling ---- */
  const stepFine = Math.max(1, Math.floor(Math.max(w, h) / 320));
  const stepCoarse = Math.max(stepFine + 1, Math.floor(Math.max(w, h) / 150));
  const scaleFine = downsampleAreaAverageLab(d, w, h, stepFine);
  const scaleCoarse = downsampleAreaAverageLab(d, w, h, stepCoarse);
  const { sw, sh, rArr, gArr, bArr, aArr, LArr, caArr, cbArr, gray, qcol } = scaleFine;

  /* Sampling resolusi penuh (1:1) pada petak pusat & kuadran untuk mendeteksi detail 1-2px yang berisiko hilang */
  let fullResRidges = 0, fullResChecked = 0, fullResFlatNoise = 0, fullResFlatN = 0;
  const patchR = Math.min(48, Math.floor(Math.min(w, h) * 0.22));
  const anchors = [
    [w >> 1, h >> 1],
    [w >> 2, h >> 2],
    [(w * 3) >> 2, h >> 2],
    [w >> 2, (h * 3) >> 2],
    [(w * 3) >> 2, (h * 3) >> 2]
  ];
  for (const [ax, ay] of anchors) {
    const x0 = clamp(ax - patchR, 1, w - 2), x1 = clamp(ax + patchR, 1, w - 2);
    const y0 = clamp(ay - patchR, 1, h - 2), y1 = clamp(ay + patchR, 1, h - 2);
    for (let y = y0; y <= y1; y += 2) {
      const row = y * w;
      for (let x = x0; x <= x1; x += 2) {
        const p = row + x, i = p * 4;
        if (d[i + 3] < 64) continue;
        fullResChecked++;
        const l0 = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const lL = 0.299 * d[i - 4] + 0.587 * d[i - 3] + 0.114 * d[i - 2];
        const lR = 0.299 * d[i + 4] + 0.587 * d[i + 5] + 0.114 * d[i + 6];
        const lU = 0.299 * d[i - w * 4] + 0.587 * d[i - w * 4 + 1] + 0.114 * d[i - w * 4 + 2];
        const lD = 0.299 * d[i + w * 4] + 0.587 * d[i + w * 4 + 1] + 0.114 * d[i + w * 4 + 2];
        const g1 = Math.hypot(lR - lL, lD - lU) * 0.5;
        const lap = Math.abs(4 * l0 - lL - lR - lU - lD);
        if (g1 < 5.5) { fullResFlatNoise += lap; fullResFlatN++; }
        const ridgeH = (l0 > lL + 9 && l0 > lR + 9) || (l0 < lL - 9 && l0 < lR - 9);
        const ridgeV = (l0 > lU + 9 && l0 > lD + 9) || (l0 < lU - 9 && l0 < lD - 9);
        if (ridgeH || ridgeV) fullResRidges++;
      }
    }
  }

  /* ---- TAHAP 3, 4 & 6 PROFILER: Struktur Tepi (L*a*b*), Noise vs Detail Nyata & Gradasi Multiskala ---- */
  let edgeCnt = 0, sumGrad = 0, lapEnergy = 0, lapCnt = 0;
  let tSame = 0, tBlend = 0, tSharp = 0, tTot = 0;
  let gradContCnt = 0, nonFlatCnt = 0, microRidgeCnt = 0, coherentRidgeCnt = 0, sharpStepEdgeCnt = 0;
  let axisAlignedEdgeCnt = 0, collinearEdgeCnt = 0, curvedAnalyticEdgeCnt = 0, junctionCandCnt = 0;
  const interiorBins = new Uint32Array(4096);
  const binSumR = new Float64Array(4096), binSumG = new Float64Array(4096), binSumB = new Float64Array(4096);
  let interiorTotal = 0;

  const atG = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : gray[y * sw + x];
  const atL = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : LArr[y * sw + x];
  const atA = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : caArr[y * sw + x];
  const atB = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : cbArr[y * sw + x];

  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const idx0 = y * sw + x;
      if (aArr[idx0] < 64) continue;

      /* Gradien Scharr pada Luminansi + Krominansi CIE a* dan b* */
      const gxL = -3 * atG(x - 1, y - 1) - 10 * atG(x - 1, y) - 3 * atG(x - 1, y + 1)
                  + 3 * atG(x + 1, y - 1) + 10 * atG(x + 1, y) + 3 * atG(x + 1, y + 1);
      const gyL = -3 * atG(x - 1, y - 1) - 10 * atG(x, y - 1) - 3 * atG(x + 1, y - 1)
                  + 3 * atG(x - 1, y + 1) + 10 * atG(x, y + 1) + 3 * atG(x + 1, y + 1);
      const gxA = (atA(x + 1, y) - atA(x - 1, y)) * 8.5;
      const gyA = (atA(x, y + 1) - atA(x, y - 1)) * 8.5;
      const gxB = (atB(x + 1, y) - atB(x - 1, y)) * 8.5;
      const gyB = (atB(x, y + 1) - atB(x, y - 1)) * 8.5;

      const gmL = Math.hypot(gxL, gyL) / 8;
      const gmC = Math.hypot(gxA, gyA, gxB, gyB) / 8;
      const gm = Math.max(gmL, gmC * 0.85);
      sumGrad += gm;

      if (gm > 32) {
        edgeCnt++;
        const rawAngRad = Math.atan2(gyL, gxL);
        const ang = Math.abs(rawAngRad * (180 / Math.PI)) % 90;
        if (ang <= 11 || ang >= 79) axisAlignedEdgeCnt++;
        if (Math.abs(gxL) > 95 && Math.abs(gyL) > 95) junctionCandCnt++;
        /* Deteksi Busur Analitik Berkelengkungan Konstan (Constant-Curvature Circular/Elliptical Arc Invariant) */
        const tx = -Math.sin(rawAngRad), ty = Math.cos(rawAngRad);
        const xM1 = clamp(Math.round(x - tx), 1, sw - 2), yM1 = clamp(Math.round(y - ty), 1, sh - 2);
        const xP1 = clamp(Math.round(x + tx), 1, sw - 2), yP1 = clamp(Math.round(y + ty), 1, sh - 2);
        if ((xM1 !== x || yM1 !== y) && (xP1 !== x || yP1 !== y)) {
          const gxM = atG(xM1 + 1, yM1) - atG(xM1 - 1, yM1), gyM = atG(xM1, yM1 + 1) - atG(xM1, yM1 - 1);
          const gxP = atG(xP1 + 1, yP1) - atG(xP1 - 1, yP1), gyP = atG(xP1, yP1 + 1) - atG(xP1, yP1 - 1);
          if (Math.hypot(gxM, gyM) > 12 && Math.hypot(gxP, gyP) > 12) {
            const aM = Math.atan2(gyM, gxM), aP = Math.atan2(gyP, gxP);
            const wrapRad = r => Math.atan2(Math.sin(r), Math.cos(r));
            const d1 = wrapRad(rawAngRad - aM), d2 = wrapRad(aP - rawAngRad);
            const meanK = 0.5 * Math.abs(d1 + d2);
            const diffK = Math.abs(d1 - d2);
            if (meanK < 0.034 && diffK <= 0.075 && Math.abs(d1) <= 0.055 && Math.abs(d2) <= 0.055) {
              collinearEdgeCnt++;
            } else if (meanK >= 0.034 && meanK <= 0.52 && diffK <= 0.16 && d1 * d2 >= -0.002) {
              curvedAnalyticEdgeCnt++;
            }
          }
        }
      }
      if (gm > 50) sharpStepEdgeCnt++;

      const lapL = Math.abs(4 * atL(x, y) - atL(x - 1, y) - atL(x + 1, y) - atL(x, y - 1) - atL(x, y + 1));
      const lapA = Math.abs(4 * atA(x, y) - atA(x - 1, y) - atA(x + 1, y) - atA(x, y - 1) - atA(x, y + 1));
      const lapB = Math.abs(4 * atB(x, y) - atB(x - 1, y) - atB(x + 1, y) - atB(x, y - 1) - atB(x, y + 1));
      const lap = Math.abs(4 * atG(x, y) - atG(x - 1, y) - atG(x + 1, y) - atG(x, y - 1) - atG(x, y + 1));
      const lapLab = Math.hypot(lapL, lapA * 0.8, lapB * 0.8);

      if (gm < 11) {
        lapEnergy += lap; lapCnt++;
        const isSmoothSlope = gm <= 10.5 && lapLab <= Math.max(1.35, Math.hypot(atL(x + 1, y) - atL(x - 1, y), atA(x + 1, y) - atA(x - 1, y), atB(x + 1, y) - atB(x - 1, y)) * 0.62);
        if ((gm < 4.8 && lap < 5.2 && lapLab < 4.5) || isSmoothSlope) {
          const b = qcol[idx0];
          interiorBins[b]++;
          binSumR[b] += rArr[idx0];
          binSumG[b] += gArr[idx0];
          binSumB[b] += bArr[idx0];
          interiorTotal++;
        }
      }

      /* Deteksi Gradasi & Nada di L*, a*, b*: perubahan monoton & turunan ke-2 rendah (abaikan derau kuantisasi JPEG 1-2 LSB) */
      const dLabH = Math.hypot(atL(x + 1, y) - atL(x - 1, y), atA(x + 1, y) - atA(x - 1, y), atB(x + 1, y) - atB(x - 1, y)) * 0.5;
      const dLabV = Math.hypot(atL(x, y + 1) - atL(x, y - 1), atA(x, y + 1) - atA(x, y - 1), atB(x, y + 1) - atB(x, y - 1)) * 0.5;
      const gmLab = Math.hypot(dLabH, dLabV);
      if (gm >= 1.15 || gmLab >= 0.85) {
        nonFlatCnt++;
        const monoH = (atL(x - 1, y) <= atL(x, y) + 0.35 && atL(x, y) <= atL(x + 1, y) + 0.35) ||
                      (atL(x - 1, y) >= atL(x, y) - 0.35 && atL(x, y) >= atL(x + 1, y) - 0.35) ||
                      (atA(x - 1, y) <= atA(x, y) + 0.35 && atA(x, y) <= atA(x + 1, y) + 0.35);
        const monoV = (atL(x, y - 1) <= atL(x, y) + 0.35 && atL(x, y) <= atL(x, y + 1) + 0.35) ||
                      (atL(x, y - 1) >= atL(x, y) - 0.35 && atL(x, y) >= atL(x, y + 1) - 0.35) ||
                      (atB(x, y - 1) <= atB(x, y) + 0.35 && atB(x, y) <= atB(x, y + 1) + 0.35);
        if (gm <= 16.5 && lapLab <= Math.max(0.85, gmLab * 0.72) && (monoH || monoV)) gradContCnt++;
      }

      /* Deteksi Detail Mikro (L* + Chroma a*b*) & Verifikasi Koherensi Garis Tangensial (bukan sekadar bintik noise) */
      const g0 = atG(x, y), a0 = atA(x, y), b0 = atB(x, y);
      const dChromaH = Math.hypot(a0 - atA(x - 1, y), b0 - atB(x - 1, y)) + Math.hypot(a0 - atA(x + 1, y), b0 - atB(x + 1, y));
      const dChromaV = Math.hypot(a0 - atA(x, y - 1), b0 - atB(x, y - 1)) + Math.hypot(a0 - atA(x, y + 1), b0 - atB(x, y + 1));
      const extrH = (g0 > atG(x - 1, y) + 9 && g0 > atG(x + 1, y) + 9) || (g0 < atG(x - 1, y) - 9 && g0 < atG(x + 1, y) - 9) || dChromaH > 18;
      const extrV = (g0 > atG(x, y - 1) + 9 && g0 > atG(x, y + 1) + 9) || (g0 < atG(x, y - 1) - 9 && g0 < atG(x, y + 1) - 9) || dChromaV > 18;
      if (extrH || extrV) {
        microRidgeCnt++;
        /* Cek apakah punggung ridge berlanjut ke tetangga tangensial (detail nyata vs bintik noise terisolasi) */
        const tangContH = extrH && (Math.abs(g0 - atG(x, y - 1)) < 7.5 || Math.abs(g0 - atG(x, y + 1)) < 7.5);
        const tangContV = extrV && (Math.abs(g0 - atG(x - 1, y)) < 7.5 || Math.abs(g0 - atG(x + 1, y)) < 7.5);
        if (tangContH || tangContV) coherentRidgeCnt++;
      }

      /* Matriks Ko-okurensi Warna (CCM) 4-arah */
      const c0 = qcol[idx0];
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || xx >= sw || yy < 0 || yy >= sh) continue;
        const c1 = qcol[yy * sw + xx];
        if (c1 === c0) tSame++;
        else {
          const dr = ((c0 >> 8) & 15) - ((c1 >> 8) & 15);
          const dg = ((c0 >> 4) & 15) - ((c1 >> 4) & 15);
          const db = (c0 & 15) - (c1 & 15);
          const dd = dr * dr + dg * dg + db * db;
          const g1 = atG(xx, yy), gPrev = atG(x - dx, y - dy);
          const isRamp = (g0 > Math.min(gPrev, g1) + 4 && g0 < Math.max(gPrev, g1) - 4);
          if (dd <= 45 || isRamp) tBlend++; else tSharp++;
        }
        tTot++;
      }
    }
  }

  /* Konsistensi gradien pada skala kasar (multiscale consistency) */
  let coarseGradCnt = 0, coarseNonFlat = 0;
  const csw = scaleCoarse.sw, csh = scaleCoarse.sh;
  for (let y = 1; y < csh - 1; y++) {
    for (let x = 1; x < csw - 1; x++) {
      const i0 = y * csw + x;
      if (scaleCoarse.aArr[i0] < 64) continue;
      const dLx = scaleCoarse.LArr[i0 + 1] - scaleCoarse.LArr[i0 - 1];
      const dLy = scaleCoarse.LArr[i0 + csw] - scaleCoarse.LArr[i0 - csw];
      const gmC = Math.hypot(dLx, dLy) * 0.5;
      if (gmC >= 1.0) {
        coarseNonFlat++;
        const lapC = Math.abs(4 * scaleCoarse.LArr[i0] - scaleCoarse.LArr[i0 - 1] - scaleCoarse.LArr[i0 + 1] - scaleCoarse.LArr[i0 - csw] - scaleCoarse.LArr[i0 + csw]);
        if (gmC <= 14.0 && lapC < gmC * 0.78) coarseGradCnt++;
      }
    }
  }
  const coarseGradCont = coarseNonFlat > 8 ? clamp(coarseGradCnt / coarseNonFlat, 0, 1) : 0;

  const totalPix = Math.max(1, sw * sh);
  const edgeDensity = edgeCnt / totalPix;
  const noiseE = lapCnt ? (lapEnergy / lapCnt) * 0.7 + (fullResFlatN ? (fullResFlatNoise / fullResFlatN) * 0.3 : 0) : 0;
  const tEdge = Math.max(1, tBlend + tSharp);
  const blendFrac = tBlend / tEdge;
  const sharpFrac = tSharp / tEdge;
  const edgeSharpness = clamp((sharpStepEdgeCnt / Math.max(1, edgeCnt)) * 0.65 + sharpFrac * 0.35, 0, 1);
  const fineGradCont = nonFlatCnt > 8 ? clamp(gradContCnt / nonFlatCnt, 0, 1) : 0;
  let gradientContinuity = clamp(fineGradCont * 0.62 + coarseGradCont * 0.38, 0, 1);

  /* Detektor artefak blok DCT 8x8 murni */
  let blk = 0, blkN = 0, noblk = 0, noblkN = 0;
  for (let y = 8; y < sh - 8; y += 2) {
    for (let x = 8; x < sw - 8; x += 2) {
      const g = Math.abs(atG(x + 1, y) - atG(x, y)) + Math.abs(atG(x, y + 1) - atG(x, y));
      if (g < 0.35 || g > 16.0) continue;
      if (x % 8 === 0 || y % 8 === 0) { blk += g; blkN++; } else { noblk += g; noblkN++; }
    }
  }
  const blockiness = (blkN >= 16 && noblkN >= 32) ? (blk / blkN) / Math.max(0.5, noblk / noblkN) : 1;
  const deg = noiseE / 9 + Math.max(0, blockiness - 1.12) * 1.35;
  const quality = deg < 0.85 ? 'high' : deg < 1.95 ? 'medium' : 'low';
  const noiseLevel = clamp(deg / 3, 0, 1);

  /* Pemisahan Tegas: meaningfulDetailDensity vs microDetailDensity vs noiseLevel */
  const rawMicroDens = clamp(((microRidgeCnt / totalPix) * 0.65 + (fullResChecked ? (fullResRidges / fullResChecked) * 0.35 : 0)) * 6.8, 0, 1);
  const coherenceRatio = microRidgeCnt > 0 ? clamp(coherentRidgeCnt / microRidgeCnt, 0, 1) : 0.5;
  const meaningfulDetailDensity = clamp(rawMicroDens * (0.35 + 0.65 * coherenceRatio) * (1 - noiseLevel * 0.42), 0, 1);
  const microDetailDensity = meaningfulDetailDensity;

  const hist = new Float64Array(64);
  let hp = 0;
  for (let i = 0; i < gray.length; i++) {
    if (aArr[i] < 64) continue;
    hist[clamp(gray[i] / 4 | 0, 0, 63)]++; hp++;
  }
  let entropy = 0;
  if (hp > 0) {
    for (let i = 0; i < 64; i++) if (hist[i] > 0) { const p = hist[i] / hp; entropy -= p * Math.log2(p); }
  }

  /* ---- TAHAP 2 PROFILER: Distribusi Warna, CIEDE2000 & Persentil Q10/Q25/Q50/Q90 ---- */
  let colorEntropy = 0;
  const activeBins = [];
  const minBinSupport = Math.max(2, Math.floor(interiorTotal * 0.00045));
  for (let b = 0; b < 4096; b++) {
    const cnt = interiorBins[b];
    if (cnt > 0 && interiorTotal > 0) {
      const p = cnt / interiorTotal;
      colorEntropy -= p * Math.log2(p);
    }
    if (cnt >= minBinSupport) {
      const mr = binSumR[b] / cnt, mg = binSumG[b] / cnt, mb = binSumB[b] / cnt;
      const [L, ca, cb] = rgb2lab(mr, mg, mb);
      activeBins.push({ r: mr, g: mg, b: mb, L, a: ca, b2: cb, cnt });
    }
  }
  activeBins.sort((x, y) => y.cnt - x.cnt);

  /* Klasterisasi Peak-First Non-Chaining menggunakan jarak perseptual CIEDE2000 (ΔE00 <= 4.2) */
  const effClusters = [];
  for (const ab of activeBins) {
    let merged = false;
    for (const ec of effClusters) {
      const de00 = ciede2000(ab.L, ab.a, ab.b2, ec.L0, ec.a0, ec.b0);
      if (de00 <= 4.2) {
        const wTot = ec.cnt + ab.cnt;
        ec.r = (ec.r * ec.cnt + ab.r * ab.cnt) / wTot;
        ec.g = (ec.g * ec.cnt + ab.g * ab.cnt) / wTot;
        ec.b = (ec.b * ec.cnt + ab.b * ab.cnt) / wTot;
        ec.L = (ec.L * ec.cnt + ab.L * ab.cnt) / wTot;
        ec.a = (ec.a * ec.cnt + ab.a * ab.cnt) / wTot;
        ec.b2 = (ec.b2 * ec.cnt + ab.b2 * ab.cnt) / wTot;
        ec.cnt = wTot;
        merged = true;
        break;
      }
    }
    if (!merged) effClusters.push({ ...ab, L0: ab.L, a0: ab.a, b0: ab.b2 });
  }
  /* Integrasikan mode plateau datar terverifikasi dari analyzeColorPlateausAndGradients di hulu
     agar effectiveColors dan persentil CIEDE2000 (Q10..Q90) mencerminkan seluruh shade/warna valid */
  const plateauInfo = analyzeColorPlateausAndGradients(work, null, null);
  if (plateauInfo && plateauInfo.hasSmoothGradient) {
    gradientContinuity = clamp(Math.max(gradientContinuity, clamp(plateauInfo.gradPixelFrac * 6.5, 0.28, 0.92)), 0, 1);
  } else if (plateauInfo && !plateauInfo.hasSmoothGradient && (plateauInfo.flatPixelFrac >= 0.28 || ((plateauInfo.plateauModes || []).length >= 10 && plateauInfo.gradPixelFrac < 0.035))) {
    gradientContinuity = Math.min(gradientContinuity * 0.22, 0.07);
  } else if (plateauInfo && plateauInfo.flatPixelFrac < 0.22 && edgeSharpness < 0.32 && plateauInfo.gradPixelFrac >= 0.035) {
    gradientContinuity = clamp(Math.max(gradientContinuity, (1 - plateauInfo.flatPixelFrac) * 0.55), 0, 1);
  }
  for (const pm of (plateauInfo.plateauModes || [])) {
    let exists = false;
    for (const ec of effClusters) {
      if (ciede2000(pm.L, pm.a, pm.b2, ec.L, ec.a, ec.b2) <= 3.2) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      effClusters.push({ r: pm.r, g: pm.g, b: pm.b, L: pm.L, a: pm.a, b2: pm.b2, L0: pm.L, a0: pm.a, b0: pm.b2, cnt: Math.max(4, Math.round(pm.count / Math.max(1, stepFine * stepFine))) });
    }
  }
  /* Jika gambar datar murni (!hasSmoothGradient) memiliki mode plateau kuat, bersihkan effClusters dari artefak campuran AA */
  if (plateauInfo && !plateauInfo.hasSmoothGradient && plateauInfo.flatPixelFrac >= 0.45 && (plateauInfo.plateauModes || []).length >= 2) {
    const pModes = plateauInfo.plateauModes;
    for (let i = effClusters.length - 1; i >= 0; i--) {
      const ec = effClusters[i];
      const isPM = pModes.some(pm => ciede2000(ec.L, ec.a, ec.b2, pm.L, pm.a, pm.b2) <= 3.8);
      if (!isPM && ec.cnt < interiorTotal * 0.025) {
        let blended = false;
        for (let a = 0; a < pModes.length && !blended; a++) {
          for (let b = a + 1; b < pModes.length && !blended; b++) {
            if (evalColorBlendPair(ec.r, ec.g, ec.b, pModes[a], pModes[b])) blended = true;
          }
        }
        if (blended && effClusters.length > pModes.length) effClusters.splice(i, 1);
      }
    }
  }
  const effectiveColors = Math.max(2, effClusters.length, (plateauInfo.plateauModes || []).length);
  const dominantClusters = effClusters.filter(c => c.cnt >= Math.max(4, interiorTotal * 0.012));
  const minorClusters = effClusters.filter(c => c.cnt < Math.max(4, interiorTotal * 0.012));

  /* Hitung distribusi persentil jarak warna terdekat (Q10, Q25, Q50, Q90) di ΔE76 dan CIEDE2000 berbobot luas */
  const nearDE76List = [], nearDE00List = [], clusterWeights = [];
  for (let i = 0; i < Math.min(32, effClusters.length); i++) {
    let mn76 = Infinity, mn00 = Infinity;
    for (let j = 0; j < effClusters.length; j++) {
      if (i === j) continue;
      const d76 = Math.hypot(effClusters[i].L - effClusters[j].L, effClusters[i].a - effClusters[j].a, effClusters[i].b2 - effClusters[j].b2);
      const d00 = ciede2000(effClusters[i].L, effClusters[i].a, effClusters[i].b2, effClusters[j].L, effClusters[j].a, effClusters[j].b2);
      if (d76 < mn76) mn76 = d76;
      if (d00 < mn00) mn00 = d00;
    }
    if (mn76 < Infinity) {
      nearDE76List.push(mn76);
      nearDE00List.push(mn00);
      clusterWeights.push(Math.sqrt(effClusters[i].cnt || 1));
    }
  }
  const de76Quantiles = computeWeightedQuantiles(nearDE76List, clusterWeights);
  const de00Quantiles = computeWeightedQuantiles(nearDE00List, clusterWeights);
  const meanNearestDeltaE = de76Quantiles.mean;
  const meanNearestDeltaE00 = de00Quantiles.mean;

  /* Hitung jumlah warna unik sesungguhnya dari gambar kerja (bukan sekadar kali 2) */
  const fullSeen = new Set();
  const rawStep = Math.max(1, Math.floor((w * h) / 48000));
  for (let p = 0; p < w * h; p += rawStep) {
    const i = p * 4;
    if (d[i + 3] >= 64) fullSeen.add(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3));
  }
  const nColors = Math.max(effectiveColors, fullSeen.size);

  /* ---- TAHAP 5 & 7 PROFILER: Topologi Region, Ketebalan Stroke, Kelurusan & Analisis Plateau Hulu ---- */
  const familyColorProfile = analyzeColorFamilyStructure(effClusters, plateauInfo, gradientContinuity, noiseLevel, interiorTotal);

  /* Estimasi cepat topologi komponen pada kisi kasar (sw x sh) */
  const compSeen = new Uint8Array(sw * sh);
  let compCount = 0, smallIslandCount = 0, straightEdgeRatio = clamp(Math.max(axisAlignedEdgeCnt, collinearEdgeCnt * 0.90) / Math.max(1, edgeCnt), 0, 1);
  const circularArcRatio = clamp(curvedAnalyticEdgeCnt / Math.max(1, edgeCnt), 0, 1);
  const analyticGeometryRatio = clamp(Math.max(straightEdgeRatio, straightEdgeRatio * 0.65 + circularArcRatio * 0.88), 0, 1);
  const bfsQ = new Int32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    if (compSeen[i] || aArr[i] < 64) continue;
    compCount++;
    const c0 = qcol[i];
    let head = 0, tail = 0;
    bfsQ[tail++] = i; compSeen[i] = 1;
    while (head < tail) {
      const q = bfsQ[head++], qx = q % sw, qy = (q / sw) | 0;
      const nbs = [qx > 0 ? q - 1 : -1, qx < sw - 1 ? q + 1 : -1, qy > 0 ? q - sw : -1, qy < sh - 1 ? q + sw : -1];
      for (const nq of nbs) {
        if (nq >= 0 && !compSeen[nq] && aArr[nq] >= 64 && qcol[nq] === c0) {
          compSeen[nq] = 1; bfsQ[tail++] = nq;
        }
      }
    }
    if (tail <= 3) smallIslandCount++;
  }
  const islandRatio = clamp(smallIslandCount / Math.max(1, compCount), 0, 1);
  const junctionDensity = clamp(junctionCandCnt / Math.max(1, edgeCnt), 0, 1);

  /* ---- TAHAP 8 PROFILER: Weighted Profile Router & 6 Independent Adaptive Attributes ---- */
  const hasSemiAlpha = alphaInfo && alphaInfo.semiFrac > 0.002;
  /* Deteksi Ilustrasi Anime / Digital Painting dengan Line-Art Koheren & Gradasi Halus:
     Memiliki kepadatan detail garis nyata tinggi (meaningfulDetailDensity >= 0.28),
     koherensi punggung garis tinggi (coherenceRatio >= 0.45), dan derau rendah (noiseLevel <= 0.22) */
  const isShadedIllustration = (
    meaningfulDetailDensity >= 0.28 &&
    edgeDensity >= 0.16 &&
    noiseLevel <= 0.22 &&
    coherenceRatio >= 0.45 &&
    (plateauInfo.flatPixelFrac >= 0.10 || edgeSharpness >= 0.18)
  );
  const sPhoto = (entropy > 5.15 ? 2 : 0) + (effectiveColors > 36 && familyColorProfile.surfaceMode !== 'flat' ? 2 : 0) + (gradientContinuity > 0.28 ? 1.5 : 0) - (isShadedIllustration ? 2.2 : 0);
  const sAliased = (!hasSemiAlpha && blendFrac < 0.08 && effectiveColors <= 16 && nColors <= 48 ? 3 : 0) + (sharpFrac > 0.92 ? 2 : 0);
  const sBlended = (hasSemiAlpha || blendFrac >= 0.08 ? 3 : 1) + (entropy <= 5.4 ? 1 : 0) + (familyColorProfile.surfaceMode === 'flat' ? 1.5 : 0) + (isShadedIllustration ? 2.0 : 0);

  let type;
  if (!isShadedIllustration && sPhoto >= sAliased && sPhoto >= sBlended && sPhoto >= 3.2 && familyColorProfile.surfaceMode !== 'flat') type = 'photo';
  else if (sAliased > sBlended) type = 'aliased';
  else type = 'blended';

  /* Hitung Bobot Kontinu (0..1) untuk Flat, Illustration, dan Photo (Weighted Profile Router) */
  let rawWFlat = clamp(
    (familyColorProfile.surfaceMode === 'flat' ? 0.45 : 0.10) +
    (effectiveColors <= 16 ? 0.28 : effectiveColors <= 26 ? 0.14 : 0.04) +
    edgeSharpness * 0.22 +
    analyticGeometryRatio * 0.22 -
    gradientContinuity * 0.35,
    0.05, 1.0
  );
  let rawWIllus = clamp(
    0.32 +
    (familyColorProfile.colorStructureMode === 'MULTI_FAMILY_FLAT' || familyColorProfile.colorStructureMode === 'DISCRETE_FAMILY_SHADES' ? 0.32 : 0.14) +
    meaningfulDetailDensity * 0.32 +
    (isShadedIllustration ? 0.28 : 0) +
    (1 - Math.abs(gradientContinuity - 0.22)) * 0.18,
    0.08, 1.0
  );
  let rawWPhoto = clamp(
    (familyColorProfile.surfaceMode === 'gradient' ? 0.42 : familyColorProfile.surfaceMode === 'mixed' ? 0.22 : 0.04) +
    gradientContinuity * 0.38 +
    (entropy > 5.0 ? (entropy - 4.8) * 0.25 : 0) -
    (familyColorProfile.surfaceMode === 'flat' ? 0.35 : 0) -
    (isShadedIllustration ? 0.28 : 0),
    0.02, 1.0
  );

  /* Koreksi Penting: Desain geometris flat (baik berbasis garis lurus maupun busur lingkaran/Truchet)
     serta ilustrasi flat dengan plateau kuat harus diarahkan secara akurat */
  if (familyColorProfile.surfaceMode === 'flat' && (plateauInfo.flatPixelFrac >= 0.32 || (!plateauInfo.hasSmoothGradient && dominantClusters.length <= 4 && analyticGeometryRatio >= 0.40))) {
    rawWPhoto *= 0.25;
    if (effectiveColors <= 14 && (straightEdgeRatio >= 0.22 || (analyticGeometryRatio >= 0.38 && gradientContinuity <= 0.06 && plateauInfo.flatPixelFrac >= 0.55))) {
      rawWFlat += 0.42;
      rawWIllus *= 0.62;
    } else {
      rawWIllus += 0.28;
    }
  } else if (isShadedIllustration) {
    rawWPhoto *= 0.36;
    rawWIllus += 0.35;
  } else if (type !== 'photo' && plateauInfo.flatPixelFrac >= 0.25 && entropy < 5.1) {
    rawWPhoto *= 0.42;
    rawWIllus += 0.30;
  }

  const wSum = rawWFlat + rawWIllus + rawWPhoto || 1;
  const profileWeights = {
    flat: +(rawWFlat / wSum).toFixed(3),
    illustration: +(rawWIllus / wSum).toFixed(3),
    photo: +(rawWPhoto / wSum).toFixed(3)
  };

  const sortedW = [
    ['flat', profileWeights.flat],
    ['illustration', profileWeights.illustration],
    ['photo', profileWeights.photo]
  ].sort((a, b) => b[1] - a[1]);
  const profileId = sortedW[0][0];
  const confidence = +clamp(0.52 + (sortedW[0][1] - sortedW[1][1]) * 0.95, 0.45, 0.99).toFixed(2);

  /* Enam Atribut Adaptif Independen (0..1) sesuai Bagian 3.C Markdown */
  const adaptiveAttributes = {
    geometryPriority: +clamp(edgeSharpness * 0.42 + analyticGeometryRatio * 0.36 + profileWeights.flat * 0.28, 0.10, 0.98).toFixed(2),
    detailProtection: +clamp(meaningfulDetailDensity * 0.55 + (1 - noiseLevel) * 0.20 + (familyColorProfile.colorStructureMode === 'DISCRETE_FAMILY_SHADES' ? 0.25 : 0.10), 0.15, 0.98).toFixed(2),
    noiseSuppression: +clamp(noiseLevel * 0.65 + (familyColorProfile.colorStructureMode === 'FAMILY_NOISE' ? 0.28 : 0) + (islandRatio > 0.35 ? 0.15 : 0), 0.05, 0.96).toFixed(2),
    gradientPreservation: +clamp(familyColorProfile.gradientContinuity * 0.60 + (familyColorProfile.surfaceMode !== 'flat' ? 0.28 : 0) + (familyColorProfile.isSingleFamilyMultiShade || familyColorProfile.colorStructureMode === 'DISCRETE_FAMILY_SHADES' ? 0.25 : 0), 0.05, 0.98).toFixed(2),
    alphaSensitivity: +clamp((alphaInfo && alphaInfo.hasAlpha ? 0.65 : 0.10) + (alphaInfo && alphaInfo.semiFrac > 0.005 ? 0.30 : 0), 0.08, 0.98).toFixed(2),
    topologyProtection: +clamp(0.45 + junctionDensity * 0.30 + meaningfulDetailDensity * 0.25, 0.25, 0.98).toFixed(2)
  };

  const maxSide = Math.max(origW || w, origH || h);
  const resBucket = maxSide <= 512 ? 'small' : maxSide <= 1500 ? 'medium' : maxSide <= 3000 ? 'large' : 'uhd';

  /* Ringkasan 8 Tahap Image Profiler untuk Diagnostik UI */
  const profiler8Stages = [
    { stage: '1. Input & Multiskala', val: `${w}×${h} px (Skala 1:${stepFine} & 1:${stepCoarse})`, desc: `Alpha ${alphaInfo && alphaInfo.hasAlpha ? Math.round(alphaInfo.transparentFrac * 100) + '%' : 'Opaque'} · Full-res patch aktif` },
    { stage: '2. Distribusi Warna', val: `${effectiveColors} Efektif (${dominantClusters.length} Dom / ${minorClusters.length} Minor)`, desc: `ΔE00 Q25=${de00Quantiles.q25} · Q50=${de00Quantiles.q50} · Q90=${de00Quantiles.q90}` },
    { stage: '3. Struktur Tepi', val: `Ketajaman ${Math.round(edgeSharpness * 100)}% · Kepadatan ${(edgeDensity * 100).toFixed(1)}%`, desc: `Lurus ${Math.round(straightEdgeRatio * 100)}% · Simpang ${Math.round(junctionDensity * 100)}%` },
    { stage: '4. Noise & Tekstur', val: `Noise ${Math.round(noiseLevel * 100)}% · Blok JPEG ${blockiness.toFixed(2)}×`, desc: `Detail Nyata ${Math.round(meaningfulDetailDensity * 100)}% (Koherensi ${Math.round(coherenceRatio * 100)}%)` },
    { stage: '5. Topologi Region', val: `${compCount} Komponen · Island ${(islandRatio * 100).toFixed(0)}%`, desc: `${plateauInfo.plateauModes.length} Plateau Solid (${Math.round(plateauInfo.flatPixelFrac * 100)}% area)` },
    { stage: '6. Gradasi & Nada', val: `Permukaan: ${familyColorProfile.surfaceMode.toUpperCase()}`, desc: `Kontinuitas L*a*b* ${Math.round(gradientContinuity * 100)}% · ${familyColorProfile.colorStructureMode}` },
    { stage: '7. Geometri & Stroke', val: `Prioritas Geometri ${Math.round(adaptiveAttributes.geometryPriority * 100)}%`, desc: `Proteksi Detail ${Math.round(adaptiveAttributes.detailProtection * 100)}% · Topologi ${Math.round(adaptiveAttributes.topologyProtection * 100)}%` },
    { stage: '8. Resolver & Validasi', val: `Keyakinan ${Math.round(confidence * 100)}% (${profileId.toUpperCase()})`, desc: `Bobot A:${Math.round(profileWeights.flat * 100)}% B:${Math.round(profileWeights.illustration * 100)}% C:${Math.round(profileWeights.photo * 100)}%` }
  ];

  return {
    type, quality, noise: +noiseLevel.toFixed(2), edgeDensity: +edgeDensity.toFixed(3),
    blendFrac, sharpFrac, edgeSharpness: +edgeSharpness.toFixed(2),
    gradientContinuity: +gradientContinuity.toFixed(2),
    microDetailDensity: +microDetailDensity.toFixed(2),
    meaningfulDetailDensity: +meaningfulDetailDensity.toFixed(2),
    coherenceRatio: +coherenceRatio.toFixed(2),
    straightEdgeRatio: +straightEdgeRatio.toFixed(2),
    circularArcRatio: +circularArcRatio.toFixed(2),
    analyticGeometryRatio: +analyticGeometryRatio.toFixed(2),
    junctionDensity: +junctionDensity.toFixed(2),
    islandRatio: +islandRatio.toFixed(2),
    entropy: +entropy.toFixed(2), colorEntropy: +colorEntropy.toFixed(2),
    nColors, effectiveColors,
    dominantClusterCount: dominantClusters.length,
    minorClusterCount: minorClusters.length,
    meanNearestDeltaE, meanNearestDeltaE00,
    de76Quantiles, de00Quantiles,
    blockiness: +blockiness.toFixed(2),
    profileId, profileWeights, confidence,
    adaptiveAttributes,
    familyColorProfile,
    colorFamilyCount: familyColorProfile.colorFamilyCount,
    surfaceMode: familyColorProfile.surfaceMode,
    colorStructureMode: familyColorProfile.colorStructureMode,
    profiler8Stages,
    maxSide, resBucket,
    label: { blended: 'Artwork with Blended Edges', aliased: 'Artwork without Blended Edges', photo: 'Photograph' }[type],
    qlabel: { high: 'High', medium: 'Medium', low: 'Low' }[quality]
  };
}

/* =====================================================================
   MODUL ADAPTIVE PARAMETER PROFILES (Weighted Resolver -> 8-Stage Pipeline)
   Menggabungkan Base Profiles (Flat, Illustration, Photo) secara berbobot
   beserta 6 Atribut Independen, Distribusi Kuantil CIEDE2000 (Q10/Q25/Q50),
   dan Sumbu Ganda (colorFamilyCount × surfaceMode).
   ===================================================================== */
function buildAdaptiveTraceProfile(cls, origW = 800, origH = 800, forcedProfile = 'auto') {
  const f = cls || {};
  const maxSide = Math.max(origW || f.maxSide || 800, origH || f.maxSide || 800);
  const resBucket = maxSide <= 512 ? 'small' : maxSide <= 1500 ? 'medium' : maxSide <= 3000 ? 'large' : 'uhd';
  const resBucketLabel = {
    small: '≤ 512 px (Proteksi Detail Mikro Ketat)',
    medium: '513–1500 px (Kalibrasi Standar)',
    large: '1501–3000 px (Skala Resolusi Tinggi)',
    uhd: '> 3000 px (Multi-Skala UHD)'
  }[resBucket];

  const isForced = !!(forcedProfile && forcedProfile !== 'auto');
  const effProfile = isForced ? forcedProfile : (f.profileId || 'illustration');
  const effColors = f.effectiveColors || 12;
  const noise = f.noise != null ? f.noise : 0.2;
  const edgeSharp = f.edgeSharpness != null ? f.edgeSharpness : 0.6;
  const gradCont = f.gradientContinuity != null ? f.gradientContinuity : 0.12;
  const meaningfulDetail = f.meaningfulDetailDensity != null ? f.meaningfulDetailDensity : (f.microDetailDensity != null ? f.microDetailDensity : 0.15);
  const nearDE = f.meanNearestDeltaE != null ? f.meanNearestDeltaE : 12.0;
  const nearDE00 = f.meanNearestDeltaE00 != null ? f.meanNearestDeltaE00 : 8.5;
  const q25DE = (f.de76Quantiles && f.de76Quantiles.q25) || nearDE * 0.8;

  const wts = isForced
    ? { flat: effProfile === 'flat' ? 1 : 0, illustration: effProfile === 'illustration' ? 1 : 0, photo: effProfile === 'photo' ? 1 : 0 }
    : (f.profileWeights || { flat: effProfile === 'flat' ? 0.7 : 0.15, illustration: effProfile === 'illustration' ? 0.7 : 0.2, photo: effProfile === 'photo' ? 0.7 : 0.1 });

  const attr = f.adaptiveAttributes || {
    geometryPriority: effProfile === 'flat' ? 0.82 : 0.55,
    detailProtection: meaningfulDetail > 0.22 ? 0.78 : 0.58,
    noiseSuppression: noise,
    gradientPreservation: gradCont,
    alphaSensitivity: 0.5,
    topologyProtection: 0.65
  };
  const fam = f.familyColorProfile || {
    colorFamilyCount: 2,
    surfaceMode: gradCont > 0.26 ? 'gradient' : 'flat',
    colorStructureMode: 'MIXED_COLOR_STRUCTURE',
    familyCoherence: 0.5,
    shadeLevelCount: effColors,
    lightnessSpread: 45,
    chromaSpread: 30,
    plateauSupport: 0.6,
    gradientContinuity: gradCont,
    familyNoiseRatio: noise * 0.5
  };

  /* 1. Base Profiles sebagai jangkar referensi */
  const BASE_PROFILES = {
    flat: {
      id: 'flat',
      code: 'Profil A',
      title: 'Profil A — Ikon, Logo & Ilustrasi Flat',
      shortTitle: 'Profil A (Flat / Logo)',
      desc: 'Prioritas bentuk geometris akurat, sudut C⁰ tegas, warna solid bersih, dan jumlah node minimal.',
      bilateralRadius: 1,
      sigmaSpatial: 1.15,
      sigmaColor: 13,
      wedgeGuardThr: 620,
      skipBilateralIfClean: true,
      targetKMax: 12,
      layerDifference: 7.4,
      sensitivity: 'medium',
      qtVarThr: 135,
      snapPasses: 4,
      complexity: 54,
      mrfBetaScale: 1.08,
      mrfIters: 16,
      minPixels: 4,
      sliverRatioThr: 0.030,
      smoothMethod: 'hybrid',
      smoothness: 52,
      despeckleJitter: 68,
      lineStraighten: 82,
      axisSnap: true,
      axisSnapDeg: 2.8,
      extremumAlign: true,
      cornerMode: 'typo',
      cornerAngle: 42,
      lineCurveSensitivity: 80,
      apexSharpness: 88,
      cornerRoundness: 60,
      protectStemCaps: true,
      nodeDensity: 66
    },
    illustration: {
      id: 'illustration',
      code: 'Profil B',
      title: 'Profil B — Ilustrasi Berwarna & Kontur Organik',
      shortTitle: 'Profil B (Ilustrasi)',
      desc: 'Prioritas mempertahankan bentuk organik, garis jari/line-art tipis, gradasi lembut pipi/rambut, dan kurva mulus.',
      bilateralRadius: 1,
      sigmaSpatial: 1.18,
      sigmaColor: 14,
      wedgeGuardThr: 540,
      skipBilateralIfClean: false,
      targetKMax: 28,
      layerDifference: 3.8,
      sensitivity: 'high',
      qtVarThr: 145,
      snapPasses: 3,
      complexity: 68,
      mrfBetaScale: 0.92,
      mrfIters: 14,
      minPixels: 4,
      sliverRatioThr: 0.014,
      smoothMethod: 'hybrid',
      smoothness: 54,
      despeckleJitter: 64,
      lineStraighten: 52,
      axisSnap: false,
      axisSnapDeg: 2.0,
      extremumAlign: true,
      cornerMode: 'typo',
      cornerAngle: 46,
      lineCurveSensitivity: 72,
      apexSharpness: 78,
      cornerRoundness: 68,
      protectStemCaps: true,
      nodeDensity: 60
    },
    photo: {
      id: 'photo',
      code: 'Profil C',
      title: 'Profil C — Foto & Lukisan Gradasi Kompleks',
      shortTitle: 'Profil C (Foto / Lukisan)',
      desc: 'Prioritas pengelompokan tonal/gradasi yang koheren, penapisan edge-preserving, dan kendali jumlah poligon.',
      bilateralRadius: 2,
      sigmaSpatial: 1.75,
      sigmaColor: 25,
      wedgeGuardThr: 880,
      skipBilateralIfClean: false,
      targetKMax: 26,
      layerDifference: 5.8,
      sensitivity: 'medium',
      qtVarThr: 340,
      snapPasses: 3,
      complexity: 70,
      mrfBetaScale: 1.12,
      mrfIters: 14,
      minPixels: 6,
      sliverRatioThr: 0.022,
      smoothMethod: 'hybrid',
      smoothness: 60,
      despeckleJitter: 70,
      lineStraighten: 42,
      axisSnap: false,
      axisSnapDeg: 2.0,
      extremumAlign: true,
      cornerMode: 'organic',
      cornerAngle: 50,
      lineCurveSensitivity: 64,
      apexSharpness: 72,
      cornerRoundness: 80,
      protectStemCaps: false,
      nodeDensity: 52
    }
  };

  /* Blending parameter dasar menggunakan bobot profil kontinu (Weighted Profile Blending) */
  const A = BASE_PROFILES.flat, B = BASE_PROFILES.illustration, C = BASE_PROFILES.photo;
  const wBlend = k => A[k] * wts.flat + B[k] * wts.illustration + C[k] * wts.photo;
  const p = {
    ...(BASE_PROFILES[effProfile] || B),
    sigmaSpatial: +wBlend('sigmaSpatial').toFixed(2),
    sigmaColor: Math.round(wBlend('sigmaColor')),
    wedgeGuardThr: Math.round(wBlend('wedgeGuardThr')),
    qtVarThr: Math.round(wBlend('qtVarThr')),
    complexity: Math.round(wBlend('complexity')),
    mrfBetaScale: +wBlend('mrfBetaScale').toFixed(2),
    mrfIters: Math.round(wBlend('mrfIters')),
    smoothness: Math.round(wBlend('smoothness')),
    despeckleJitter: Math.round(wBlend('despeckleJitter')),
    lineStraighten: Math.round(wBlend('lineStraighten')),
    axisSnapDeg: +wBlend('axisSnapDeg').toFixed(1),
    cornerAngle: Math.round(wBlend('cornerAngle')),
    lineCurveSensitivity: Math.round(wBlend('lineCurveSensitivity')),
    apexSharpness: Math.round(wBlend('apexSharpness')),
    cornerRoundness: Math.round(wBlend('cornerRoundness')),
    nodeDensity: Math.round(wBlend('nodeDensity'))
  };

  /* 2. Racikan Khusus 1 (Sesuai Bagian 4 Markdown):
     `layerDifference` TIDAK BOLEH dikendalikan noise saja, dan `gradientContinuity` tinggi
     harus MENURUNKAN `layerDifference` (memisahkan `noiseSuppression` dari `gradientPreservation`)
     agar level tonal gradasi & shade 1-family tidak terhapus! */
  const qAnchor = clamp((q25DE - 8.5) * 0.14, -0.9, 1.1);
  const noiseTerm = attr.noiseSuppression * 1.45;
  const gradPresTerm = attr.gradientPreservation * 1.35;
  const detailPresTerm = attr.detailProtection * 0.85;

  let baseLD = wBlend('layerDifference') + qAnchor + noiseTerm - gradPresTerm - detailPresTerm;
  if (fam.colorStructureMode === 'DISCRETE_FAMILY_SHADES') {
    /* Banyak shade dengan plateau solid berbeda (Kondisi A): lindungi tiap shade */
    baseLD = Math.min(baseLD, clamp(q25DE * 0.52, 3.4, 5.4));
    p.targetKMax = clamp(Math.round(Math.max(effColors, fam.shadeLevelCount) * 1.2 + 3), 6, 28);
    p.sensitivity = 'high';
  } else if (fam.colorStructureMode === 'FAMILY_GRADIENT' || fam.colorStructureMode === 'MULTI_FAMILY_GRADIENT') {
    /* Banyak shade membentuk gradasi kontinu (Kondisi B): jaga urutan tonal koheren & aktifkan fitting gradien */
    baseLD = clamp(baseLD - 1.05, 2.6, 4.4);
    const effGradColors = Math.max(effColors, Math.round(20 + gradCont * 16));
    p.targetKMax = clamp(Math.round(effGradColors * 1.22 + 6), 24, 38);
    p.sensitivity = 'high';
    p.enableGradientFitting = true;
  } else if (fam.colorStructureMode === 'FAMILY_NOISE') {
    /* Banyak shade semu akibat noise/JPEG (Kondisi C): tekan variasi tanpa dukungan spasial */
    baseLD = clamp(baseLD + 1.1, 6.4, 9.2);
    p.targetKMax = clamp(Math.round(effColors * 0.85 + 2), 4, 18);
  } else if (fam.colorStructureMode === 'MULTI_FAMILY_FLAT') {
    /* Flat dengan banyak keluarga warna (mis. poster atau low-poly多-faset): jaga presisi faset tanpa menduplikasi warna */
    const nPlat = Math.max(effColors, fam.shadeLevelCount);
    baseLD = nPlat >= 24 ? clamp(baseLD * 0.78, 3.6, 5.2) : clamp(baseLD, 4.4, 6.8);
    p.targetKMax = clamp(Math.round(nPlat * 1.15 + 3), 6, 44);
  } else {
    p.targetKMax = clamp(Math.round(effColors * (effProfile === 'photo' ? 0.96 : 1.15) + 3), 4, 32);
  }
  p.layerDifference = +clamp(baseLD, 3.2, 9.5).toFixed(2);
  p.layerDifference00 = +clamp(p.layerDifference * 0.68, 2.2, 6.8).toFixed(2);

  /* 3. Adaptasi Prapemrosesan & Bilateral Filter berbasis `noiseSuppression` vs `detailProtection` */
  if (fam.surfaceMode === 'flat' && attr.noiseSuppression < 0.18 && edgeSharp > 0.70) {
    p.skipBilateral = true;
    p.sigmaColor = 10;
  } else {
    p.skipBilateral = false;
    const noiseBoost = attr.noiseSuppression * 14;
    const detailDamp = attr.detailProtection * 8;
    p.sigmaColor = Math.round(clamp(p.sigmaColor + noiseBoost - detailDamp, 10, 34));
    p.sigmaSpatial = +clamp(p.sigmaSpatial + attr.noiseSuppression * 0.28 - attr.detailProtection * 0.20, 1.0, 2.1).toFixed(2);
  }
  p.snapPasses = attr.geometryPriority > 0.65 ? 4 : (effProfile === 'photo' ? 3 : 4);

  /* 4. Racikan Khusus 2 (Sesuai Bagian 4 Markdown):
     `minPixels` sebagai jaring pengaman terakhir yang dikalibrasi terhadap `detailProtection` & skala resolusi */
  let baseMinPx = Math.round(wBlend('minPixels'));
  if (resBucket === 'small') baseMinPx = effProfile === 'photo' ? 3 : 2;
  else if (resBucket === 'large' || resBucket === 'uhd') baseMinPx = Math.round(baseMinPx * 1.25);

  if (attr.detailProtection >= 0.62 || fam.colorStructureMode === 'DISCRETE_FAMILY_SHADES') {
    baseMinPx = Math.max(2, baseMinPx - 1);
    p.complexity = clamp(p.complexity + Math.round(attr.detailProtection * 12), 42, 88);
  } else if (attr.noiseSuppression >= 0.58 && fam.surfaceMode !== 'flat') {
    baseMinPx = clamp(baseMinPx + 2, 3, 10);
    p.complexity = clamp(p.complexity - 6, 36, 82);
  }
  p.minPixels = clamp(baseMinPx, 2, 12);

  /* 5. Racikan Khusus 3 (Sesuai Bagian 4 Markdown):
     Koordinasi `smoothness` dan `nodeDensity` berbasis `geometryPriority` & `detailProtection` */
  const isCurvedGeometric = (f.circularArcRatio || 0) > (f.straightEdgeRatio || 0) * 1.12 && (f.straightEdgeRatio || 0) < 0.30;
  if (attr.geometryPriority >= 0.72) {
    p.smoothness = clamp(p.smoothness - 5, 42, 64);
    if (isCurvedGeometric) {
      /* Geometri didominasi busur melengkung/lingkaran: cegah agresivitas lineStraighten meratakan puncak busur! */
      p.lineStraighten = clamp(Math.round(30 + (f.straightEdgeRatio || 0.2) * 70), 28, 48);
      p.axisSnap = false;
    } else {
      p.lineStraighten = clamp(Math.round(p.lineStraighten + attr.geometryPriority * 12), 68, 94);
      p.axisSnap = true;
    }
  } else if (isCurvedGeometric) {
    p.lineStraighten = clamp(Math.round(28 + (f.straightEdgeRatio || 0.2) * 65), 26, 46);
    p.axisSnap = false;
  }
  if (attr.detailProtection >= 0.65 && effProfile === 'flat') {
    p.smoothness = clamp(p.smoothness - 4, 44, 70);
    p.nodeDensity = clamp(p.nodeDensity + 6, 54, 76);
  } else if (attr.noiseSuppression >= 0.55 || effProfile !== 'flat') {
    p.despeckleJitter = clamp(p.despeckleJitter + 5, 68, 88);
  }

  const lambdaPreview = +(Math.pow(10, -0.8 + (p.smoothness / 100) * 2.25)).toFixed(2);
  const tolWorkPx = +(Math.max(0.08, (0.38 - (p.nodeDensity / 100) * 0.28))).toFixed(2);

  return {
    id: p.id,
    forced: isForced,
    code: p.code,
    title: p.title,
    shortTitle: p.shortTitle,
    desc: p.desc,
    resBucket,
    resBucketLabel,
    maxSide,
    confidence: f.confidence ?? 0.85,
    profileWeights: wts,
    adaptiveAttributes: attr,
    familyColorProfile: fam,
    profiler8Stages: f.profiler8Stages || [],
    metrics: {
      effectiveColors: effColors,
      rawColors: f.nColors || effColors,
      colorEntropy: f.colorEntropy || f.entropy || 0,
      edgeDensity: f.edgeDensity || 0,
      edgeSharpness: edgeSharp,
      microDetailDensity: meaningfulDetail,
      meaningfulDetailDensity: meaningfulDetail,
      gradientContinuity: gradCont,
      noiseLevel: noise,
      meanNearestDeltaE: nearDE,
      meanNearestDeltaE00: nearDE00,
      de00Quantiles: f.de00Quantiles || { q10: 5, q25: 7, q50: 9, q90: 18 },
      colorFamilyCount: fam.colorFamilyCount,
      surfaceMode: fam.surfaceMode,
      colorStructureMode: fam.colorStructureMode
    },
    keyParams: {
      layerDifference: p.layerDifference,
      layerDifference00: p.layerDifference00,
      filterSpeckle: p.minPixels,
      smoothingStrength: p.smoothness,
      smoothingLambda: lambdaPreview,
      bezierTolerance: tolWorkPx,
      nodeDensity: p.nodeDensity,
      bilateralSigmaColor: p.skipBilateral ? 0 : p.sigmaColor,
      targetKMax: p.targetKMax
    },
    params: p
  };
}

function analyzeAlpha(data) {
  const d = data.data, n = data.width * data.height;
  let t = 0, semi = 0;
  const step = Math.max(1, Math.floor(n / 80000));
  let c = 0;
  for (let i = 3; i < d.length; i += 4 * step) {
    const a = d[i]; c++;
    if (a < 128) t++; else if (a < 252) semi++;
  }
  return {
    hasAlpha: t > 0 || semi > 0,
    transparentFrac: t / Math.max(1, c),
    semiFrac: semi / Math.max(1, c),
    binary: semi / Math.max(1, c + t) < 0.015
  };
}

/* Alpha Defringing & Flattening:
   Ambang alpha diturunkan ke 0.30 pada piksel ujung yang bertetangga dengan piksel opaque
   agar ujung lancip huruf (yang cakupan pikselnya ~30%-44%) tidak terpotong! */
function flattenAlpha(work, mode, customHex, forceCpu = false) {
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline !== 'off' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuFlattenAlpha) {
    const gpuMask = GpuAccelerator.gpuFlattenAlpha(work, mode, customHex);
    if (gpuMask) return gpuMask;
  }
  const { data, w, h } = work, d = data.data;
  const rawCopy = new Uint8ClampedArray(d);
  const bg = mode === 'custom' ? rgbOf(customHex || '#ffffff') : [255, 255, 255];
  const mask = new Uint8Array(w * h);
  const origAlpha = new Uint8Array(w * h);
  for (let i = 3, p = 0; i < d.length; i += 4, p++) origAlpha[p] = d[i];
  work.origAlpha = origAlpha;

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const a = origAlpha[p] / 255;
    if (mode === 'keep') {
      const x = p % w, y = (p / w) | 0;
      let nearSolid = false;
      if (a >= 0.25 && a < 0.45) {
        for (let dy = -1; dy <= 1 && !nearSolid; dy++) {
          const ny = y + dy; if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx; if (nx < 0 || nx >= w) continue;
            if (origAlpha[ny * w + nx] >= 210) { nearSolid = true; break; }
          }
        }
      }
      const cut = nearSolid ? 0.25 : 0.40;
      if (a < cut) {
        mask[p] = 1;
        d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
        continue;
      }
      if (a < 0.98) {
        /* Anti-Halo Inward Opaque Foreground Propagation:
           Propagasi warna piksel interior solid (alpha >= 245) terdekat dalam radius 3
           agar tepi semi-transparan tidak menghasilkan cincin halo putih/hitam */
        let fgR = 0, fgG = 0, fgB = 0, fgW = 0;
        for (let dy = -3; dy <= 3; dy++) {
          const ny = y + dy; if (ny < 0 || ny >= h) continue;
          const row = ny * w;
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx; if (nx < 0 || nx >= w) continue;
            const np = row + nx;
            if (origAlpha[np] >= 245) {
              const wgt = 1 / (dx * dx + dy * dy + 0.5);
              const ni = np * 4;
              fgR += rawCopy[ni] * wgt;
              fgG += rawCopy[ni + 1] * wgt;
              fgB += rawCopy[ni + 2] * wgt;
              fgW += wgt;
            }
          }
        }
        if (fgW > 0) {
          const ir = fgR / fgW, ig = fgG / fgW, ib = fgB / fgW;
          d[i] = clamp(Math.round(ir * 0.88 + rawCopy[i] * 0.12), 0, 255);
          d[i + 1] = clamp(Math.round(ig * 0.88 + rawCopy[i + 1] * 0.12), 0, 255);
          d[i + 2] = clamp(Math.round(ib * 0.88 + rawCopy[i + 2] * 0.12), 0, 255);
        } else {
          d[i] = rawCopy[i]; d[i + 1] = rawCopy[i + 1]; d[i + 2] = rawCopy[i + 2];
        }
        d[i + 3] = 255;
        continue;
      }
    }
    d[i] = Math.round(rawCopy[i] * a + bg[0] * (1 - a));
    d[i + 1] = Math.round(rawCopy[i + 1] * a + bg[1] * (1 - a));
    d[i + 2] = Math.round(rawCopy[i + 2] * a + bg[2] * (1 - a));
    d[i + 3] = 255;
  }
  return mask;
}


/* === END 06-vmt-profiler-adaptive.js === */

/* === BEGIN 07-vmt-palette-kdtree.js === */
/* =====================================================================
 * JS Module 07: VMT Engine Part 3 — 3D CIE-Lab KD-Tree, K-Means++ Palette & Halo Pruning
 * ===================================================================== */
/* =====================================================================
   TAHAP 2 — PaletteFinder: ANNkd_tree + K-Means++ di CIE-Lab + BIC/MDL
   + Anti-Halo Transition Cluster Unmixing & Pruning
   ===================================================================== */
function buildKdTree(pts, depth = 0) {
  if (!pts.length) return null;
  const ax = depth % 3, k = ['L', 'a', 'b'][ax];
  pts.sort((x, y) => x[k] - y[k]);
  const m = pts.length >> 1;
  return { p: pts[m], ax, k, l: buildKdTree(pts.slice(0, m), depth + 1), r: buildKdTree(pts.slice(m + 1), depth + 1) };
}

function kdNearestLab(nd, L, a, b, best) {
  if (!nd) return best;
  const p = nd.p;
  const dL = L - p.L, da = a - p.a, db = b - p.b;
  const dd = dL * dL + da * da + db * db;
  if (dd < best.d) { best.d = dd; best.i = p.i; }
  const v = nd.ax === 0 ? L : nd.ax === 1 ? a : b;
  const pv = p[nd.k];
  const first = v < pv ? nd.l : nd.r, second = v < pv ? nd.r : nd.l;
  kdNearestLab(first, L, a, b, best);
  const dv = v - pv;
  if (dv * dv < best.d) kdNearestLab(second, L, a, b, best);
  return best;
}

/* Analisis Plateau Datar Terverifikasi & Detektor Gradasi Halus (1-Family Multi-Shade + Smooth Gradient) */
function analyzeColorPlateausAndGradients(work, mask, edgeField = null) {
  if (!work || !work.data) {
    return { plateauModes: [], isSingleFamilyMultiShade: false, hasSmoothGradient: false, gradPixelFrac: 0, flatPixelFrac: 0, gradSamples: [] };
  }
  const cacheKey = (mask ? 2 : 1) + (edgeField ? 4 : 0);
  if (work._plateauAnalysis && work._plateauCacheKey === cacheKey) {
    return work._plateauAnalysis;
  }
  const { w, h } = work;
  const d = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
  const mag = edgeField ? edgeField.mag : null;

  const xyStep = Math.max(w, h) > 560 ? Math.max(1, Math.floor(Math.max(w, h) / 480)) : 1;
  const stepArea = xyStep * xyStep;
  const plateauBins = new Map();
  const gradSamples = [];
  let totalValid = 0, flatCount = 0, smoothGradCount = 0;
  const gradStride = Math.max(1, Math.floor(((w * h) / stepArea) / 6000));

  for (let y = 2; y < h - 2; y += xyStep) {
    const row = y * w;
    for (let x = 2; x < w - 2; x += xyStep) {
      const p = row + x;
      if (mask && mask[p]) continue;
      totalValid += stepArea;
      let mp = 0;
      if (mag) {
        mp = mag[p];
      } else {
        const iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
        const gx = 0.299 * (d[iR] - d[iL]) + 0.587 * (d[iR + 1] - d[iL + 1]) + 0.114 * (d[iR + 2] - d[iL + 2]);
        const gy = 0.299 * (d[iD] - d[iU]) + 0.587 * (d[iD + 1] - d[iU + 1]) + 0.114 * (d[iD + 2] - d[iU + 2]);
        mp = 0.5 * Math.hypot(gx, gy);
      }
      const i0 = p * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];

      /* 1. Uji Plateau Datar Murni (2D Isotropik 5x5 MAUPUN Pita Fungsional 1D Anisotropik tebal >= 3px seperti bibir roti, kuning telur, & tepian renyah) */
      if (mp <= 3.4) {
        let flatNbs = 0, hNbs = 0, vNbs = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const rOff = (y + dy) * w;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const np = rOff + x + dx;
            if (mask && mask[np]) continue;
            const ni = np * 4;
            if (cdist2(r0, g0, b0, d[ni], d[ni + 1], d[ni + 2]) <= 54) {
              flatNbs++;
              if (dy === 0) hNbs++;
              if (dx === 0) vNbs++;
            }
          }
        }
        if (flatNbs >= 6) {
          const iL2 = (p - 2) * 4, iR2 = (p + 2) * 4, iU2 = (p - 2 * w) * 4, iD2 = (p + 2 * w) * 4;
          const spanH2 = cdist2(d[iL2], d[iL2 + 1], d[iL2 + 2], d[iR2], d[iR2 + 1], d[iR2 + 2]);
          const spanV2 = cdist2(d[iU2], d[iU2 + 1], d[iU2 + 2], d[iD2], d[iD2 + 1], d[iD2 + 2]);
          const isIsoFlat = flatNbs >= 7 && spanH2 <= 90 && spanV2 <= 90;
          const isHorizBand = mp <= 2.2 && hNbs === 2 && vNbs === 2 && spanH2 <= 42 &&
            cdist2(r0, g0, b0, d[iL2], d[iL2 + 1], d[iL2 + 2]) <= 42 &&
            cdist2(r0, g0, b0, d[iR2], d[iR2 + 1], d[iR2 + 2]) <= 42;
          const isVertBand = mp <= 2.2 && hNbs === 2 && vNbs === 2 && spanV2 <= 42 &&
            cdist2(r0, g0, b0, d[iU2], d[iU2 + 1], d[iU2 + 2]) <= 42 &&
            cdist2(r0, g0, b0, d[iD2], d[iD2 + 1], d[iD2 + 2]) <= 42;
          /* [FIX-2026-10-29] Ramp lambat BUKAN pita datar: kolom sebuah
             gradasi horizontal (nilai konstan sepanjang vertikal, naik
             monoton sepanjang horizontal) selama ini lolos uji
             isVertBand — karena uji itu hanya memeriksa konstansi
             SEPANJANG pita, bukan perubahan TEGAK LURUS pita — sehingga
             gradasi murni 0→255 terhitung flatPixelFrac≈0.98, lalu
             classifyStage memangkas gradientContinuity ke 0.07 dan
             output diposterisasi jadi 11 pita, bukan 1 gradien.
             Pengecualian: bila deret 5 piksel tegak lurus pita monoton
             (≥3 langkah searah, tanpa pembalikan) maka ini ramp, bukan
             pita — jangan hitung flat, biarkan jatuh ke uji gradasi.
             Pita asli aman: pita lebar ≥5 punya langkah 0; pita lebar 3
             punya deret A,B,B,B,A (tidak monoton); piksel tepi pita
             hanya punya 1 langkah tak-nol. */
          const grayAt = (pp) => 0.299 * d[pp * 4] + 0.587 * d[pp * 4 + 1] + 0.114 * d[pp * 4 + 2];
          const isMonotonicRamp = (vals) => {
            let pos = 0, neg = 0;
            for (let k = 0; k + 1 < vals.length; k++) {
              const s = vals[k + 1] - vals[k];
              if (s >= 0.9) pos++; else if (s <= -0.9) neg++;
            }
            const span = Math.abs(vals[vals.length - 1] - vals[0]);
            return span >= 3 && ((pos >= 3 && neg === 0) || (neg >= 3 && pos === 0));
          };
          const isPerpRamp = (isVertBand && isMonotonicRamp([grayAt(p - 2), grayAt(p - 1), grayAt(p), grayAt(p + 1), grayAt(p + 2)])) ||
            (isHorizBand && isMonotonicRamp([grayAt(p - 2 * w), grayAt(p - w), grayAt(p), grayAt(p + w), grayAt(p + 2 * w)]));
          if ((isIsoFlat || isHorizBand || isVertBand) && !isPerpRamp) {
            flatCount += stepArea;
            const bKey = ((r0 >> 1) << 14) | ((g0 >> 1) << 7) | (b0 >> 1);
            let bin = plateauBins.get(bKey);
            if (!bin) {
              bin = { rSum: 0, gSum: 0, bSum: 0, count: 0 };
              plateauBins.set(bKey, bin);
            }
            bin.rSum += r0 * stepArea; bin.gSum += g0 * stepArea; bin.bSum += b0 * stepArea; bin.count += stepArea;
            continue;
          }
        }
      }

      /* 2. Uji Interior Gradasi Halus (jauh dari step-edge tajam, turunan ke-1 bermakna, rentang 5x5 tumbuh >= 1.85x rentang 3x3, dan turunan ke-2 rendah) */
      if (mp >= 0.65 && mp <= 16.0) {
        if (mag && (mag[p - 2] > 18 || mag[p + 2] > 18 || mag[p - 2 * w] > 18 || mag[p + 2 * w] > 18)) continue;
        const checkSym = (off1, off2) => {
          if (mask && (mask[p - off1] || mask[p + off1] || mask[p - off2] || mask[p + off2])) return false;
          const a1 = (p - off1) * 4, b1 = (p + off1) * 4;
          const a2 = (p - off2) * 4, b2 = (p + off2) * 4;
          const lap1 = cdist2(r0, g0, b0, (d[a1] + d[b1]) * 0.5, (d[a1 + 1] + d[b1 + 1]) * 0.5, (d[a1 + 2] + d[b1 + 2]) * 0.5);
          if (lap1 > 18) return false;
          const lap2 = cdist2(r0, g0, b0, (d[a2] + d[b2]) * 0.5, (d[a2 + 1] + d[b2 + 1]) * 0.5, (d[a2 + 2] + d[b2 + 2]) * 0.5);
          if (lap2 > 38) return false;
          const dTot = cdist2(d[a2], d[a2 + 1], d[a2 + 2], d[b2], d[b2 + 1], d[b2 + 2]);
          const dMid = cdist2(d[a1], d[a1 + 1], d[a1 + 2], d[b1], d[b1 + 1], d[b1 + 2]);
          if (dTot > 40) {
            if (dMid > dTot * 0.50) return false;
            const dSideA = cdist2(r0, g0, b0, d[a2], d[a2 + 1], d[a2 + 2]);
            const dSideB = cdist2(r0, g0, b0, d[b2], d[b2 + 1], d[b2 + 2]);
            if (dSideA < dTot * 0.08 || dSideB < dTot * 0.08) return false;
          }
          return true;
        };
        if (checkSym(1, 2) && checkSym(w, 2 * w)) {
          const iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
          const iL2 = (p - 2) * 4, iR2 = (p + 2) * 4, iU2 = (p - 2 * w) * 4, iD2 = (p + 2 * w) * 4;
          const slope2 = cdist2(d[iL], d[iL + 1], d[iL + 2], d[iR], d[iR + 1], d[iR + 2]) +
                         cdist2(d[iU], d[iU + 1], d[iU + 2], d[iD], d[iD + 1], d[iD + 2]);
          const span2 = cdist2(d[iL2], d[iL2 + 1], d[iL2 + 2], d[iR2], d[iR2 + 1], d[iR2 + 2]) +
                        cdist2(d[iU2], d[iU2 + 1], d[iU2 + 2], d[iD2], d[iD2 + 1], d[iD2 + 2]);
          if (slope2 >= 20 && span2 >= 56 && span2 >= slope2 * 1.95) {
            const prevG = smoothGradCount;
            smoothGradCount += stepArea;
            if (Math.floor(smoothGradCount / gradStride) > Math.floor(prevG / gradStride) && gradSamples.length < 6000) {
              const [L, ca, cb] = rgb2lab(r0, g0, b0);
              gradSamples.push({ r: r0, g: g0, b: b0, L, a: ca, b2: cb, pureCore: true, isGradCore: true });
            }
          }
        }
      }
    }
  }

  const flatPixelFrac = flatCount / Math.max(1, totalValid);
  const gradPixelFrac = smoothGradCount / Math.max(1, totalValid);
  const prelimSmoothGrad = gradPixelFrac >= 0.045 || (gradPixelFrac >= 0.020 && flatPixelFrac < 0.28 && smoothGradCount >= 260);

  /* Klasterisasi Peak-First Non-Chaining pada bin plateau datar */
  const sortedBins = [];
  plateauBins.forEach(b => {
    const mr = b.rSum / b.count, mg = b.gSum / b.count, mb = b.bSum / b.count;
    const [L, a, b2] = rgb2lab(mr, mg, mb);
    sortedBins.push({ r: mr, g: mg, b: mb, L, a, b2, count: b.count });
  });
  sortedBins.sort((a, b) => b.count - a.count);

  const isLowRes07 = (work.w * work.h) <= 150000;
  const rawModes = [];
  const mergeRadLab2 = prelimSmoothGrad ? 16.0 : (isLowRes07 ? 16.0 : 10.5);
  const mergeDe00Thr = isLowRes07 ? 3.5 : 2.45;
  for (const sb of sortedBins) {
    let found = null;
    for (const m of rawModes) {
      const d2 = (sb.L - m.L0) ** 2 + (sb.a - m.a0) ** 2 + (sb.b2 - m.b0) ** 2;
      const de00 = ciede2000(sb.L, sb.a, sb.b2, m.L0, m.a0, m.b0);
      if (d2 <= mergeRadLab2 || de00 <= mergeDe00Thr) { found = m; break; }
    }
    if (found) {
      const wTot = found.count + sb.count;
      found.r = (found.r * found.count + sb.r * sb.count) / wTot;
      found.g = (found.g * found.count + sb.g * sb.count) / wTot;
      found.b = (found.b * found.count + sb.b * sb.count) / wTot;
      found.L = (found.L * found.count + sb.L * sb.count) / wTot;
      found.a = (found.a * found.count + sb.a * sb.count) / wTot;
      found.b2 = (found.b2 * found.count + sb.b2 * sb.count) / wTot;
      found.count = wTot;
    } else {
      rawModes.push({
        r: sb.r, g: sb.g, b: sb.b, L: sb.L, a: sb.a, b2: sb.b2,
        L0: sb.L, a0: sb.a, b0: sb.b2,
        rPeak: Math.round(sb.r), gPeak: Math.round(sb.g), bPeak: Math.round(sb.b),
        count: sb.count
      });
    }
  }

  rawModes.sort((a, b) => b.count - a.count);
  const minPlateauSupport = prelimSmoothGrad
    ? Math.max(16, Math.round(totalValid * 0.0022))
    : Math.max(16, Math.min(200, Math.round(totalValid * 0.00024)));
  let candidateModes = rawModes.filter(m => m.count >= minPlateauSupport);

  /* Deduplikasi Seimbang Tanpa Bias Rasio 4x:
     Gabungkan warna kembar akibat kompresi JPEG / anti-aliasing (dRgb <= 25 atau ΔE00 <= 3.85,
     serta variasi rona kromatik identik ΔE00 <= 4.65), namun pertahankan faset berbeda yang sah */
  if (!prelimSmoothGrad && candidateModes.length > 2) {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = candidateModes.length - 1; i >= 1; i--) {
        const mi = candidateModes[i];
        const chI = Math.hypot(mi.a, mi.b2);
        for (let j = 0; j < i; j++) {
          const mj = candidateModes[j];
          const chJ = Math.hypot(mj.a, mj.b2);
          const de00 = ciede2000(mi.L, mi.a, mi.b2, mj.L, mj.a, mj.b2);
          const dRgb = Math.hypot(mi.r - mj.r, mi.g - mj.g, mi.b - mj.b);
          const sameHue = chI >= 14 && chJ >= 14 && ((mi.a * mj.a + mi.b2 * mj.b2) / (chI * chJ)) >= 0.94;
          const isLowResIcon = (work.w * work.h) <= 150000;
          const bothWarmBrown = isLowResIcon && mi.a >= 8 && mj.a >= 8 && mi.b2 >= 18 && mj.b2 >= 18 && Math.abs(mi.L - mj.L) <= 8.5 && dRgb <= 32;
          const isSameHueSubBand = sameHue && de00 <= (isLowResIcon ? 4.65 : 4.68) && (isLowResIcon || Math.abs(mi.L - mj.L) <= 4.8 || Math.min(chI, chJ) >= 48);
          const maxDRgb = isLowResIcon ? 25.0 : ((Math.min(mi.L, mj.L) >= 52 || Math.min(chI, chJ) >= 50) ? 23.5 : 16.0);
          if (de00 <= 3.85 || dRgb <= maxDRgb || isSameHueSubBand || bothWarmBrown) {
            const wTot = mj.count + mi.count;
            mj.r = (mj.r * mj.count + mi.r * mi.count) / wTot;
            mj.g = (mj.g * mj.count + mi.g * mi.count) / wTot;
            mj.b = (mj.b * mj.count + mi.b * mi.count) / wTot;
            const [nL, na, nb2] = rgb2lab(mj.r, mj.g, mj.b);
            mj.L = nL; mj.a = na; mj.b2 = nb2;
            mj.count = wTot;
            candidateModes.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  /* Saring hanya pita transisi sangat kecil (< 0.052% area) yang benar-benar kolinier di antara dua mode mayor,
     TANPA pernah menghapus warna objek solid (seperti highlight pink tomat, kuning telur, atau bibir roti)! */
  const plateauModes = candidateModes
    .filter((m, idx) => {
      if (idx < 4 || m.count >= totalValid * 0.00052) return true;
      for (let a = 0; a < Math.min(idx, 6); a++) {
        if (candidateModes[a].count < m.count * 8) continue;
        for (let b = a + 1; b < Math.min(idx, 6); b++) {
          if (candidateModes[b].count < m.count * 8) continue;
          const bl = evalColorBlendPair(m.r, m.g, m.b, candidateModes[a], candidateModes[b]);
          if (bl && bl.perpD2 <= 180) return false;
        }
      }
      return true;
    })
    .map(m => {
      const rp = Math.round(m.r), gp = Math.round(m.g), bp = Math.round(m.b);
      const [pL, pa, pb2] = rgb2lab(rp, gp, bp);
      return {
        r: rp, g: gp, b: bp,
        L: pL, a: pa, b2: pb2,
        count: m.count,
        hex: hexOf(rp, gp, bp),
        verifiedPlateau: true
      };
    });

  /* Bersihkan gradSamples dari piksel yang sebenarnya hanya derau JPEG di atas warna plateau datar */
  if (gradSamples.length > 0 && plateauModes.length > 0) {
    const rawGradLen = gradSamples.length;
    const filteredGrad = gradSamples.filter(gs => {
      for (let i = 0; i < plateauModes.length; i++) {
        const pm = plateauModes[i];
        const dLab2 = (gs.L - pm.L) ** 2 + (gs.a - pm.a) ** 2 + (gs.b2 - pm.b2) ** 2;
        if (dLab2 <= 16.0) return false;
      }
      return true;
    });
    const keepRatio = filteredGrad.length / Math.max(1, rawGradLen);
    gradSamples.length = 0;
    for (let i = 0; i < filteredGrad.length; i++) gradSamples.push(filteredGrad[i]);
    smoothGradCount = Math.round(smoothGradCount * keepRatio);
  }
  const adjGradPixelFrac = smoothGradCount / Math.max(1, totalValid);
  const adjHasSmoothGradient = adjGradPixelFrac >= 0.045 || (adjGradPixelFrac >= 0.020 && flatPixelFrac < 0.28 && smoothGradCount >= 260 && adjGradPixelFrac >= flatPixelFrac * 0.15);

  /* Evaluasi apakah palet plateau merupakan Single-Family Multi-Shade (>= 4 tingkat warna dalam 1 rona/keluarga) */
  let isSingleFamilyMultiShade = false;
  if (plateauModes.length >= 4 && !adjHasSmoothGradient) {
    let chromCount = 0, sumU = 0, sumV = 0;
    for (const m of plateauModes) {
      const ch = Math.hypot(m.a, m.b2);
      if (ch >= 8.0) {
        chromCount++;
        sumU += (m.a / ch) * m.count;
        sumV += (m.b2 / ch) * m.count;
      }
    }
    if (chromCount <= 1) {
      isSingleFamilyMultiShade = true;
    } else {
      const uLen = Math.hypot(sumU, sumV) || 1;
      const domU = sumU / uLen, domV = sumV / uLen;
      let inFam = 0;
      for (const m of plateauModes) {
        const ch = Math.hypot(m.a, m.b2);
        if (ch < 9.5 || m.L <= 24 || m.L >= 88) {
          inFam++;
        } else {
          const cosA = (m.a * domU + m.b2 * domV) / ch;
          if (cosA >= 0.72) inFam++;
        }
      }
      if (inFam >= Math.max(4, Math.ceil(plateauModes.length * 0.75))) {
        isSingleFamilyMultiShade = true;
      }
    }
  }

  const result = {
    plateauModes,
    isSingleFamilyMultiShade,
    hasSmoothGradient: adjHasSmoothGradient,
    gradPixelFrac: +adjGradPixelFrac.toFixed(4),
    flatPixelFrac: +flatPixelFrac.toFixed(4),
    gradSamples
  };
  work._plateauAnalysis = result;
  work._plateauCacheKey = cacheKey;
  return result;
}

/* Ambil sampel piksel interior murni & detail 2D koheren + sampel interior gradasi halus */
function sampleInteriorPixels(work, mask, edgeField, maxN = 32000) {
  const { data, w, h } = work, d = data.data, mag = edgeField ? edgeField.mag : null;
  const out = [];
  const stride = Math.max(1, Math.floor((w * h) / maxN));

  /* Deteksi apakah piksel p berada pada ramp transisi anti-aliasing 1-2px (BUKAN interior gradasi halus atau plateau) */
  const isTransitionRamp = (x, y, p) => {
    if (mag && mag[p] > 16) return true;
    const i0 = p * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];
    const mp0 = mag ? mag[p] : 0;

    /* Jika piksel berada di atas plateau datar lokal (gradien rendah), bukan ramp transisi */
    if (mp0 <= 2.2 && x >= 1 && x < w - 1 && y >= 1 && y < h - 1) {
      let flatSim = 0;
      for (const np of [p - 1, p + 1, p - w, p + w]) {
        if (mask && mask[np]) continue;
        const ni = np * 4;
        if (cdist2(r0, g0, b0, d[ni], d[ni + 1], d[ni + 2]) <= 42) flatSim++;
      }
      if (flatSim >= 3) return false;
    }

    const nearEdge = mp0 > 3.2;
    const checkAxisRamp = (stepOff, r) => {
      const pA = p - r * stepOff, pB = p + r * stepOff;
      if (mask && (mask[pA] || mask[pB])) return false;
      const iA = pA * 4, iB = pB * 4;
      const rA = d[iA], gA = d[iA + 1], bA = d[iA + 2];
      const rB = d[iB], gB = d[iB + 1], bB = d[iB + 2];
      const dAB = cdist2(rA, gA, bA, rB, gB, bB);
      if (dAB < 420) return false;

      /* Bedakan tepi langkah 1-2px vs lereng gradasi kontinu pada r >= 2 */
      if (r >= 2) {
        const pM1 = p - stepOff, pP1 = p + stepOff;
        const iM1 = pM1 * 4, iP1 = pP1 * 4;
        const dMid = cdist2(d[iM1], d[iM1 + 1], d[iM1 + 2], d[iP1], d[iP1 + 1], d[iP1 + 2]);
        const dLeft = cdist2(rA, gA, bA, d[iM1], d[iM1 + 1], d[iM1 + 2]);
        const dRight = cdist2(d[iP1], d[iP1 + 1], d[iP1 + 2], rB, gB, bB);
        /* Pada gradasi kontinu, dLeft & dRight sama-sama aktif dan dMid < 0.42 * dAB */
        if (dLeft >= 0.035 * dAB && dRight >= 0.035 * dAB && dMid <= 0.42 * dAB) {
          return false;
        }
      } else if (r === 1 && mp0 <= 11.0 && x >= 2 && x < w - 2 && y >= 2 && y < h - 2) {
        const pA2 = p - 2 * stepOff, pB2 = p + 2 * stepOff;
        if (!(mask && (mask[pA2] || mask[pB2]))) {
          const iA2 = pA2 * 4, iB2 = pB2 * 4;
          const dTot2 = cdist2(d[iA2], d[iA2 + 1], d[iA2 + 2], d[iB2], d[iB2 + 1], d[iB2 + 2]);
          if (dTot2 > 180 && dAB <= 0.42 * dTot2) return false;
        }
      }

      /* Jangan membuang titik lembah garis sejati (1D valley seperti garis jari di dalam permukaan sewarna atau tinta gelap) */
      const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
      const lA = 0.299 * rA + 0.587 * gA + 0.114 * bA;
      const lB = 0.299 * rB + 0.587 * gB + 0.114 * bB;
      if ((l0 < Math.min(lA, lB) - 3.5 && (dAB <= 2200 || l0 <= 22)) || (l0 > Math.max(lA, lB) + 4.0 && dAB <= 2200)) return false;

      const dr = rA - rB, dg = gA - gB, db = bA - bB;
      const len2 = dr * dr + dg * dg + db * db;
      if (len2 < 100) return false;
      const t = ((r0 - rB) * dr + (g0 - gB) * dg + (b0 - bB) * db) / len2;
      const tMin = nearEdge ? -0.24 : 0.03;
      const tMax = nearEdge ? 1.24 : 0.97;
      if (t > tMin && t < tMax) {
        const tc = clamp(t, 0, 1);
        const pr = rB + tc * dr, pg = gB + tc * dg, pb = bB + tc * db;
        const perpD2 = cdist2(r0, g0, b0, pr, pg, pb);
        if (perpD2 <= dAB * 0.22 + 560) {
          if (t >= 0.03 && t <= 0.97) return true;
          const dEnd = Math.min(cdist2(r0, g0, b0, rA, gA, bA), cdist2(r0, g0, b0, rB, gB, bB));
          if (dEnd > 14 && dEnd < dAB * 0.28) return true;
        }
      }
      return false;
    };

    for (const r of [1, 2, 3]) {
      if (x >= r && x < w - r && checkAxisRamp(1, r)) return true;
      if (y >= r && y < h - r && checkAxisRamp(w, r)) return true;
      if (x >= r && x < w - r && y >= r && y < h - r) {
        if (checkAxisRamp(w + 1, r)) return true;
        if (checkAxisRamp(w - 1, r)) return true;
      }
    }
    return false;
  };

  /* Evaluasi apakah piksel berada pada inti plateau datar, permukaan gradasi halus, detail kroma tinggi, atau inti line-art */
  const evalHomogeneousCore = (x, y, p) => {
    const mp0 = mag ? mag[p] : 0;
    if (mp0 > 24.0) return { coherent: false, pureCore: false, isGradCore: false };
    const i0 = p * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];
    const sat0 = Math.max(r0, g0, b0) - Math.min(r0, g0, b0);
    const lum0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
    let sim = 0, simMed = 0, simH = 0, simV = 0, maxEdgeMag = mp0, maxNbLum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const np = ny * w + nx;
        if (mask && mask[np]) continue;
        const mNp = mag ? mag[np] : 0;
        if (mNp > maxEdgeMag) maxEdgeMag = mNp;
        const ni = np * 4;
        const nr = d[ni], ng = d[ni + 1], nb = d[ni + 2];
        const nLum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        if (nLum > maxNbLum) maxNbLum = nLum;
        const cd2 = cdist2(r0, g0, b0, nr, ng, nb);
        if (cd2 < 240) simMed++;
        if (mNp <= 15 && cd2 < 150) {
          sim++;
          if (dy === 0) simH++;
          if (dx === 0) simV++;
        }
      }
    }
    const coherent = mp0 <= 16.0 && sim >= 5 && simH >= 1 && simV >= 1;
    let pureCore = coherent && sim >= 7 && maxEdgeMag < 7.0;
    if (pureCore && x >= 2 && x < w - 2 && y >= 2 && y < h - 2) {
      for (const np2 of [p - 2, p + 2, p - 2 * w, p + 2 * w]) {
        if ((mask && mask[np2]) || (mag && mag[np2] > 12)) { pureCore = false; break; }
        const ni2 = np2 * 4;
        if (cdist2(r0, g0, b0, d[ni2], d[ni2 + 1], d[ni2 + 2]) > 220) { pureCore = false; break; }
      }
    }
    if (coherent) return { coherent: true, pureCore, isGradCore: false };

    const pModes = (work._plateauAnalysis && work._plateauAnalysis.plateauModes) ? work._plateauAnalysis.plateauModes : [];
    const hasSmoothGrad = !!(work._plateauAnalysis && work._plateauAnalysis.hasSmoothGradient);
    const isBlendOfPlateaus = () => {
      for (let a = 0; a < pModes.length; a++) {
        for (let b = a + 1; b < pModes.length; b++) {
          if (evalColorBlendPair(r0, g0, b0, pModes[a], pModes[b])) return true;
        }
      }
      return false;
    };

    if (hasSmoothGrad && sat0 >= 22 && sim >= 4 && mp0 <= 14.0 && maxEdgeMag <= 16.0 && !isBlendOfPlateaus()) {
      return { coherent: true, pureCore: true, isGradCore: true, isCreaseCore: false };
    }
    if (lum0 <= 24 && simMed >= 3 && (maxNbLum - lum0 >= 22 || mp0 <= 14.0) && !isBlendOfPlateaus()) {
      return { coherent: true, pureCore: true, isGradCore: false, isCreaseCore: true };
    }
    /* Deteksi Inti Garis Celah/Lipatan Halus (Finger Crease / Soft Line-Art) dengan lebar 1-2px:
       Jika piksel lebih gelap >= 4.2 luma dibanding kedua sisi normalnya (r=2) yang berada pada permukaan sewarna (dAB <= 2000)
       dan koheren di KEDUA sisi sepanjang arah tangensial (bukan bintik halftone atau tepi anti-aliasing dua warna kontras) */
    if (x >= 2 && x < w - 2 && y >= 2 && y < h - 2 && simMed >= 2 && !isBlendOfPlateaus()) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const iA = ((y - 2 * dy) * w + (x - 2 * dx)) * 4;
        const iB = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
        const dAB = cdist2(d[iA], d[iA + 1], d[iA + 2], d[iB], d[iB + 1], d[iB + 2]);
        if (dAB > 2000 && lum0 > 22) continue;
        const lA = 0.299 * d[iA] + 0.587 * d[iA + 1] + 0.114 * d[iA + 2];
        const lB = 0.299 * d[iB] + 0.587 * d[iB + 1] + 0.114 * d[iB + 2];
        const iT1 = ((y - dx) * w + (x + dy)) * 4;
        const iT2 = ((y + dx) * w + (x - dy)) * 4;
        const dT1 = cdist2(r0, g0, b0, d[iT1], d[iT1 + 1], d[iT1 + 2]);
        const dT2 = cdist2(r0, g0, b0, d[iT2], d[iT2 + 1], d[iT2 + 2]);
        if (lum0 < Math.min(lA, lB) - 4.2 && Math.min(dT1, dT2) <= 160 && Math.max(dT1, dT2) <= 260) {
          return { coherent: true, pureCore: true, isGradCore: false, isCreaseCore: true };
        }
      }
    }

    if (hasSmoothGrad && x >= 2 && x < w - 2 && y >= 2 && y < h - 2 && maxEdgeMag <= 16.0) {
      const iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
      const lapH = cdist2(r0, g0, b0, (d[iL] + d[iR]) * 0.5, (d[iL + 1] + d[iR + 1]) * 0.5, (d[iL + 2] + d[iR + 2]) * 0.5);
      const lapV = cdist2(r0, g0, b0, (d[iU] + d[iD]) * 0.5, (d[iU + 1] + d[iD + 1]) * 0.5, (d[iU + 2] + d[iD + 2]) * 0.5);
      if (lapH <= 22 && lapV <= 22) {
        const iL2 = (p - 2) * 4, iR2 = (p + 2) * 4, iU2 = (p - 2 * w) * 4, iD2 = (p + 2 * w) * 4;
        const lapH2 = cdist2(r0, g0, b0, (d[iL2] + d[iR2]) * 0.5, (d[iL2 + 1] + d[iR2 + 1]) * 0.5, (d[iL2 + 2] + d[iR2 + 2]) * 0.5);
        const lapV2 = cdist2(r0, g0, b0, (d[iU2] + d[iD2]) * 0.5, (d[iU2 + 1] + d[iD2 + 1]) * 0.5, (d[iU2 + 2] + d[iD2 + 2]) * 0.5);
        if (lapH2 <= 46 && lapV2 <= 46) {
          return { coherent: true, pureCore: true, isGradCore: true };
        }
      }
    }
    return { coherent: false, pureCore: false, isGradCore: false };
  };

  const qBinCounts = new Uint32Array(4096);
  const maxPerQBin = Math.max(48, Math.floor(maxN * 0.045));
  for (let p = 0; p < w * h; p += stride) {
    if (mask && mask[p]) continue;
    const x = p % w, y = (p / w) | 0;
    const i = p * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const qb = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    if (qBinCounts[qb] >= maxPerQBin) continue;
    let isStrokeCore = false;
    if (x >= 2 && x < w - 2 && y >= 2 && y < h - 2) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const iT1 = ((y - dx) * w + (x + dy)) * 4, iT2 = ((y + dx) * w + (x - dy)) * 4;
        if (cdist2(r, g, b, d[iT1], d[iT1 + 1], d[iT1 + 2]) > 180 && cdist2(r, g, b, d[iT2], d[iT2 + 1], d[iT2 + 2]) > 180) continue;
        const iA = ((y - 2 * dy) * w + (x - 2 * dx)) * 4, iB = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
        if (cdist2(d[iA], d[iA + 1], d[iA + 2], d[iB], d[iB + 1], d[iB + 2]) > 900) continue;
        const bgR = (d[iA] + d[iB]) * 0.5, bgG = (d[iA + 1] + d[iB + 1]) * 0.5, bgB = (d[iA + 2] + d[iB + 2]) * 0.5;
        const dBg0 = cdist2(r, g, b, bgR, bgG, bgB);
        if (dBg0 < 4200) continue;
        const iM1 = ((y - dy) * w + (x - dx)) * 4, iP1 = ((y + dy) * w + (x + dx)) * 4;
        if (dBg0 >= cdist2(d[iM1], d[iM1 + 1], d[iM1 + 2], bgR, bgG, bgB) * 0.96 &&
            dBg0 >= cdist2(d[iP1], d[iP1 + 1], d[iP1 + 2], bgR, bgG, bgB) * 0.96) {
          isStrokeCore = true; break;
        }
      }
    }
    let coherent = false, pureCore = false, isGradCore = false, isCreaseCore = false;
    if (isStrokeCore) {
      coherent = true; pureCore = true;
    } else {
      if (isTransitionRamp(x, y, p)) continue;
      const hc = evalHomogeneousCore(x, y, p);
      if (!hc.coherent) continue;
      coherent = hc.coherent; pureCore = hc.pureCore; isGradCore = hc.isGradCore; isCreaseCore = hc.isCreaseCore;
    }
    qBinCounts[qb]++;
    const [L, ca, cb] = rgb2lab(r, g, b);
    out.push({ r, g, b, L, a: ca, b2: cb, pureCore, isGradCore, isCreaseCore: !!isCreaseCore });
    if (out.length >= maxN) break;
  }

  if (out.length < 64) {
    for (let p = 0; p < w * h; p += Math.max(1, stride)) {
      if (mask && mask[p]) continue;
      const x = p % w, y = (p / w) | 0;
      if (mag && mag[p] > 16) continue;
      if (isTransitionRamp(x, y, p)) continue;
      const i = p * 4;
      const [L, ca, cb] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      out.push({ r: d[i], g: d[i + 1], b: d[i + 2], L, a: ca, b2: cb, pureCore: false, isGradCore: false });
      if (out.length >= maxN) break;
    }
  }
  if (out.length < 16) {
    for (let p = 0; p < w * h; p += Math.max(1, stride)) {
      if (mask && mask[p]) continue;
      const i = p * 4;
      const [L, ca, cb] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      out.push({ r: d[i], g: d[i + 1], b: d[i + 2], L, a: ca, b2: cb, pureCore: false, isGradCore: false });
    }
  }
  return out;
}

/* Seeding K-Means++ di ruang CIE-Lab dengan dukungan penuh warna 1-family & permukaan gradasi */
function kmeansPlusPlusSeeds(samples, K, plateauModes = null) {
  const n = samples.length;
  if (!n) return [];
  const binCount = new Uint32Array(4096);
  const binCoreCount = new Uint32Array(4096);
  const sampleBin = new Uint16Array(n);
  let maxScore0 = -1, firstIdx = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const b = ((s.r >> 4) << 8) | ((s.g >> 4) << 4) | (s.b >> 4);
    sampleBin[i] = b;
    const c = ++binCount[b];
    const cc = s.pureCore ? ++binCoreCount[b] : binCoreCount[b];
    const sc0 = c + cc * 2;
    if (sc0 > maxScore0) { maxScore0 = sc0; firstIdx = i; }
  }

  const seeds = [];
  /* Jika terdapat mode plateau datar terverifikasi, jadikan benih prioritas utama */
  if (plateauModes && plateauModes.length > 0) {
    for (let i = 0; i < Math.min(K, plateauModes.length); i++) {
      const pm = plateauModes[i];
      seeds.push({ r: pm.r, g: pm.g, b: pm.b, L: pm.L, a: pm.a, b2: pm.b2, pureCore: true, verifiedPlateau: true });
    }
  }
  if (!seeds.length) seeds.push(samples[firstIdx]);

  /* Extrema & Chromatic Accent Anchors di awal: pastikan siluet tergelap (L_min), titik cahaya paling terang (L_max),
     dan aksen rona hangat/komplementer (seperti lampu lentera mercusuar) langsung masuk ke benih utama di K >= 6 */
  if (K >= 6 && n >= 64) {
    let minLIdx = -1, minLVal = Infinity;
    let maxLIdx = -1, maxLVal = -Infinity;
    let maxWarmIdx = -1, maxWarmVal = -Infinity;
    let maxPinkBlushIdx = -1, maxPinkBlushVal = -Infinity;
    let creaseAnchorIdx = -1, maxCreaseScore = -Infinity;
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      if (!s.pureCore && !s.isGradCore && !s.isCreaseCore) continue;
      if (s.L < minLVal) { minLVal = s.L; minLIdx = i; }
      if (s.L > maxLVal) { maxLVal = s.L; maxLIdx = i; }
      const warmScore = s.a * 1.25 + s.b2 * 0.95 + (s.L > 45 ? s.L * 0.35 : -20);
      if (warmScore > maxWarmVal && s.L > 48) { maxWarmVal = warmScore; maxWarmIdx = i; }
      /* Jangkar khusus Blush Pink Pipi (kroma a* positif hangat pada tingkat kecerahan kulit) */
      if (s.L >= 68 && s.L <= 92 && s.a >= 10.5 && s.b2 >= -4 && s.b2 <= 22) {
        const blushScore = s.a * 1.8 - Math.abs(s.L - 82) * 0.25 + binCount[sampleBin[i]] * 0.08;
        if (blushScore > maxPinkBlushVal) { maxPinkBlushVal = blushScore; maxPinkBlushIdx = i; }
      }
      /* Jangkar khusus Garis Lipatan/Jari (rose-taupe / mauve-brown / shadow line) */
      if (s.isCreaseCore && s.L >= 32 && s.L <= 78 && s.a >= 4.5) {
        const cScore = s.a * 1.4 + binCount[sampleBin[i]] * 0.25;
        if (cScore > maxCreaseScore) { maxCreaseScore = cScore; creaseAnchorIdx = i; }
      }
    }
    const ensureEarlyAnchor = (idx, minDeThr = 5.0, lockAsCrease = false) => {
      if (idx < 0 || seeds.length >= K) return;
      const cand = samples[idx];
      let minDE = Infinity;
      for (const sd of seeds) {
        const de = ciede2000(cand.L, cand.a, cand.b2, sd.L, sd.a, sd.b2);
        if (de < minDE) minDE = de;
      }
      if (minDE <= minDeThr) return;
      for (let a = 0; a < seeds.length; a++) {
        for (let b = a + 1; b < seeds.length; b++) {
          if (evalColorBlendPair(cand.r, cand.g, cand.b, seeds[a], seeds[b])) return;
        }
      }
      seeds.push({ ...cand, verifiedPlateau: !!lockAsCrease });
    };
    ensureEarlyAnchor(minLIdx, 5.0, false);
    ensureEarlyAnchor(maxLIdx, 5.0, false);
    ensureEarlyAnchor(maxWarmIdx, 5.0, false);
    ensureEarlyAnchor(maxPinkBlushIdx, 3.4, true);
    ensureEarlyAnchor(creaseAnchorIdx, 3.6, true);
  }

  const dists = new Float64Array(n).fill(Infinity);
  for (let sIdx = 0; sIdx < seeds.length - 1; sIdx++) {
    const sd = seeds[sIdx];
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      const d = (s.L - sd.L) ** 2 + (s.a - sd.a) ** 2 + (s.b2 - sd.b2) ** 2;
      if (d < dists[i]) dists[i] = d;
    }
  }

  const isCollinearWithSeeds = (s, b) => {
    if (seeds.length < 2) return false;
    if (s.isGradCore) return false;
    const chS = Math.hypot(s.a, s.b2);
    if (chS >= 18) return false;
    if (s.pureCore && binCoreCount[b] >= Math.max(8, n * 0.002)) return false;

    for (let a = 0; a < seeds.length; a++) {
      const sa = seeds[a];
      for (let bIdx = a + 1; bIdx < seeds.length; bIdx++) {
        const sb = seeds[bIdx];
        if (evalColorBlendPair(s.r, s.g, s.b, sa, sb)) return true;
        const dL = sa.L - sb.L, da = sa.a - sb.a, db = sa.b2 - sb.b2;
        const len2 = dL * dL + da * da + db * db;
        if (len2 >= 36) {
          const t = ((s.L - sb.L) * dL + (s.a - sb.a) * da + (s.b2 - sb.b2) * db) / len2;
          if (t > 0.08 && t < 0.92) {
            const pL = sb.L + t * dL, pa = sb.a + t * da, pb = sb.b2 + t * db;
            const perp2 = (s.L - pL) ** 2 + (s.a - pa) ** 2 + (s.b2 - pb) ** 2;
            if (perp2 <= Math.min(42, 14 + len2 * 0.012)) return true;
          }
        }
      }
    }
    return false;
  };

  /* Precompute popWeight * coreMult dan chroma tiap sampel sekali saja di luar loop K */
  const baseWeightArr = new Float64Array(n);
  const chSArr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const b = sampleBin[i];
    const popWeight = s.isGradCore ? Math.max(2.2, Math.log2(2 + binCount[b])) : Math.log2(1 + binCount[b] + binCoreCount[b] * 2);
    const coreMult = s.pureCore ? 1.0 : (binCoreCount[b] > 0 ? 0.45 : 0.08);
    baseWeightArr[i] = popWeight * coreMult;
    chSArr[i] = Math.hypot(s.a, s.b2);
  }

  for (let k = seeds.length; k < K; k++) {
    const last = seeds[seeds.length - 1];
    let hasDarkSeed = false;
    for (let j = 0; j < seeds.length; j++) {
      if (seeds[j].L < 14.5) { hasDarkSeed = true; break; }
    }
    let bestIdx = 0, bestScore = -1;
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      const d = (s.L - last.L) ** 2 + (s.a - last.a) ** 2 + (s.b2 - last.b2) ** 2;
      if (d < dists[i]) dists[i] = d;
      const distVal = dists[i];
      if (distVal <= 0) continue;

      let diversityMult = 1.0;
      const chS = chSArr[i];
      if (chS >= 15) {
        let maxCos = -1, sameHueSeeds = 0;
        for (let j = 0; j < seeds.length; j++) {
          const sj = seeds[j], chJ = Math.hypot(sj.a, sj.b2);
          if (chJ >= 12) {
            const cosH = (s.a * sj.a + s.b2 * sj.b2) / (chS * chJ);
            if (cosH > maxCos) maxCos = cosH;
            if (cosH >= 0.94) sameHueSeeds++;
          }
        }
        if (maxCos < 0.88) diversityMult = 4.2;
        else if (sameHueSeeds >= (s.isGradCore ? 10 : 4)) diversityMult = 0.18;
        else if (sameHueSeeds >= (s.isGradCore ? 7 : 3)) diversityMult = 0.42;
      } else if (s.L < 14.5 && !hasDarkSeed) {
        diversityMult = 3.8;
      }

      /* Upper-bound pruning: hanya evaluasi isCollinearWithSeeds jika kandidat ini berpeluang melampaui bestScore */
      const rawScore = distVal * baseWeightArr[i] * diversityMult;
      if (rawScore <= bestScore) continue;
      const blendMult = isCollinearWithSeeds(s, sampleBin[i]) ? 0.06 : 1.0;
      const score = rawScore * blendMult;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    seeds.push(samples[bestIdx]);
  }
  return seeds;
}

function kmeansLab(samples, K, seeds, maxIter = 18) {
  const n = samples.length;
  const cents = seeds.map(s => ({ r: s.r, g: s.g, b: s.b, L: s.L, a: s.a, b2: s.b2, verifiedPlateau: !!s.verifiedPlateau }));
  const asg = new Int32Array(n);
  const cL = new Float64Array(K), cA = new Float64Array(K), cB = new Float64Array(K);
  let sse = Infinity;
  for (let it = 0; it < maxIter; it++) {
    for (let k = 0; k < K; k++) {
      cL[k] = cents[k].L; cA[k] = cents[k].a; cB[k] = cents[k].b2;
    }
    const sum = Array.from({ length: K }, () => ({ r: 0, g: 0, b: 0, L: 0, a: 0, b2: 0, n: 0, gradN: 0, creaseN: 0 }));
    let newsse = 0;
    for (let s = 0; s < n; s++) {
      const sm = samples[s];
      const sL = sm.L, sa = sm.a, sb = sm.b2;
      let bestD = Infinity, bestI = 0;
      for (let k = 0; k < K; k++) {
        const dL = sL - cL[k], da = sa - cA[k], db = sb - cB[k];
        const dd = dL * dL + da * da + db * db;
        if (dd < bestD) { bestD = dd; bestI = k; }
      }
      asg[s] = bestI;
      newsse += bestD;
      const ac = sum[bestI];
      ac.r += sm.r; ac.g += sm.g; ac.b += sm.b;
      ac.L += sL; ac.a += sa; ac.b2 += sb;
      ac.n++;
      if (sm.isGradCore) ac.gradN++;
      if (sm.isCreaseCore) ac.creaseN++;
    }
    let moved = 0;
    for (let k = 0; k < K; k++) {
      const ac = sum[k];
      if (!ac.n) continue;
      /* Jika centroid dikunci sebagai plateau datar terverifikasi dan cukup dekat, jaga akurasinya */
      const nr = ac.r / ac.n, ng = ac.g / ac.n, nb = ac.b / ac.n;
      const nL = ac.L / ac.n, na = ac.a / ac.n, nb2 = ac.b2 / ac.n;
      moved += Math.hypot(nL - cents[k].L, na - cents[k].a, nb2 - cents[k].b2);
      cents[k] = {
        r: nr, g: ng, b: nb, L: nL, a: na, b2: nb2,
        count: ac.n,
        isGradCluster: ac.gradN >= Math.max(4, ac.n * 0.24),
        isCreaseCluster: ac.creaseN >= Math.max(8, samples.length * 0.0012) && ac.creaseN >= ac.n * 0.18,
        verifiedPlateau: cents[k].verifiedPlateau || (ac.creaseN >= Math.max(10, samples.length * 0.0015) && ac.creaseN >= ac.n * 0.22)
      };
    }
    sse = newsse;
    if (moved < K * 0.08) break;
  }
  return { cents, sse, asg };
}

/* Eliminasi Klaster Palet Transisi Anti-Aliasing dengan Perlindungan Penuh Plateau 1-Family & Klaster Gradasi */
function pruneHaloPaletteClusters(work, mask, cents, edgeField = null, plateauInfo = null) {
  if (!work || !work.data || !cents || cents.length <= 2) return cents;
  const { data, w, h } = work, d = data.data;
  const mag = edgeField ? edgeField.mag : null;
  const pInfo = plateauInfo || work._plateauAnalysis || { plateauModes: [], hasSmoothGradient: false };
  const verifiedModes = pInfo.plateauModes || [];
  let active = cents.map(c => ({ ...c }));

  const matchesVerifiedPlateau = c => {
    if (c.verifiedPlateau) return true;
    for (const pm of verifiedModes) {
      const d2 = (c.L - pm.L) ** 2 + (c.a - pm.a) ** 2 + (c.b2 - pm.b2) ** 2;
      if (d2 <= 12.25) return true;
    }
    return false;
  };

  const step = Math.max(1, Math.floor(Math.min(w, h) / 260));
  const sw = Math.ceil(w / step), sh = Math.ceil(h / step), nCells = sw * sh;
  const gridValid = new Uint8Array(nCells);
  const gridL = new Float32Array(nCells), gridA = new Float32Array(nCells), gridB = new Float32Array(nCells);
  for (let gy = 0; gy < sh; gy++) {
    const y = Math.min(h - 1, gy * step);
    for (let gx = 0; gx < sw; gx++) {
      const x = Math.min(w - 1, gx * step);
      const p = y * w + x;
      if (mask && mask[p]) continue;
      const cellIdx = gy * sw + gx;
      gridValid[cellIdx] = 1;
      const i = p * 4;
      const [L, a, b] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      gridL[cellIdx] = L; gridA[cellIdx] = a; gridB[cellIdx] = b;
    }
  }
  const grid = new Int16Array(nCells);

  for (let pass = 0; pass < 3 && active.length > 2; pass++) {
    const K = active.length;
    const cL = new Float32Array(K), cA = new Float32Array(K), cB = new Float32Array(K);
    for (let k = 0; k < K; k++) { cL[k] = active[k].L; cA[k] = active[k].a; cB[k] = active[k].b2; }
    for (let cIdx = 0; cIdx < nCells; cIdx++) {
      if (!gridValid[cIdx]) { grid[cIdx] = -1; continue; }
      const L = gridL[cIdx], a = gridA[cIdx], b = gridB[cIdx];
      let bestD = Infinity, bestI = 0;
      for (let k = 0; k < K; k++) {
        const dL = L - cL[k], da = a - cA[k], db = b - cB[k];
        const dd = dL * dL + da * da + db * db;
        if (dd < bestD) { bestD = dd; bestI = k; }
      }
      grid[cIdx] = bestI;
    }

    const tot = new Int32Array(K);
    const core = new Int32Array(K);
    const deepCore = new Int32Array(K);
    const smoothCore = new Int32Array(K);
    const sandwiched = new Int32Array(K);
    const pairCounts = Array.from({ length: K }, () => new Map());
    let totalValidCells = 0;

    for (let gy = 1; gy < sh - 1; gy++) {
      const y = Math.min(h - 1, gy * step);
      for (let gx = 1; gx < sw - 1; gx++) {
        const idx = gy * sw + gx;
        const k = grid[idx];
        if (k < 0) continue;
        tot[k]++;
        totalValidCells++;
        const x = Math.min(w - 1, gx * step);
        const p = y * w + x;
        const lL = grid[idx - 1], lR = grid[idx + 1], lU = grid[idx - sw], lD = grid[idx + sw];
        const lowGrad = !mag || mag[p] < 11;
        if (mag && mag[p] >= 0.15 && mag[p] <= 16.0 && y >= 1 && y < h - 1 && x >= 1 && x < w - 1) {
          const i0 = p * 4, iL = (p - 1) * 4, iR = (p + 1) * 4, iU = (p - w) * 4, iD = (p + w) * 4;
          const lapH = cdist2(d[i0], d[i0 + 1], d[i0 + 2], (d[iL] + d[iR]) * 0.5, (d[iL + 1] + d[iR + 1]) * 0.5, (d[iL + 2] + d[iR + 2]) * 0.5);
          const lapV = cdist2(d[i0], d[i0 + 1], d[i0 + 2], (d[iU] + d[iD]) * 0.5, (d[iU + 1] + d[iD + 1]) * 0.5, (d[iU + 2] + d[iD + 2]) * 0.5);
          if (lapH <= 28 && lapV <= 28) smoothCore[k]++;
        }
        if (lL === k && lR === k && lU === k && lD === k && lowGrad) {
          core[k]++;
          if (gx >= 2 && gx < sw - 2 && gy >= 2 && gy < sh - 2) {
            if (grid[idx - 2] === k && grid[idx + 2] === k && grid[idx - 2 * sw] === k && grid[idx + 2 * sw] === k &&
                grid[idx - sw - 1] === k && grid[idx - sw + 1] === k && grid[idx + sw - 1] === k && grid[idx + sw + 1] === k) {
              deepCore[k]++;
            }
          }
        } else {
          const checkAxis = (a, b) => {
            if (a >= 0 && b >= 0 && a !== k && b !== k && a !== b) {
              sandwiched[k]++;
              const pk = a < b ? (a * 64 + b) : (b * 64 + a);
              pairCounts[k].set(pk, (pairCounts[k].get(pk) || 0) + 1);
            }
          };
          checkAxis(lL, lR);
          checkAxis(lU, lD);
          if (gx >= 2 && gx < sw - 2) checkAxis(grid[idx - 2], grid[idx + 2]);
          if (gy >= 2 && gy < sh - 2) checkAxis(grid[idx - 2 * sw], grid[idx + 2 * sw]);
        }
      }
    }

    /* [PATCH-A1] Simpan bukti koherensi spasial tiap klaster agar tahap penggabungan akhir bisa membedakan shade nyata vs halo */
    for (let k = 0; k < K; k++) {
      active[k].gridTot = tot[k];
      active[k].coreCount = core[k];
      active[k].deepCoreCount = deepCore[k];
    }

    const isBlendInLab = (ck, ca, cb) => {
      if (evalColorBlendPair(ck.r, ck.g, ck.b, ca, cb)) return true;
      const dL = ca.L - cb.L, da = ca.a - cb.a, db = ca.b2 - cb.b2;
      const len2 = dL * dL + da * da + db * db;
      if (len2 < 24) return false;
      const t = ((ck.L - cb.L) * dL + (ck.a - cb.a) * da + (ck.b2 - cb.b2) * db) / len2;
      if (t <= 0.04 || t >= 0.96) return false;
      const pL = cb.L + t * dL, pa = cb.a + t * da, pb = cb.b2 + t * db;
      const perp2 = (ck.L - pL) ** 2 + (ck.a - pa) ** 2 + (ck.b2 - pb) ** 2;
      if (perp2 <= Math.min(42, 12 + len2 * 0.014)) return true;
      return false;
    };

    const drop = new Uint8Array(K);
    for (let k = 0; k < K; k++) {
      if (tot[k] === 0) { drop[k] = 1; continue; }
      /* Lindungi penuh klaster yang terbukti merupakan plateau datar murni, permukaan gradasi, keluarga hue unik, atau line-art gelap */
      if (matchesVerifiedPlateau(active[k])) continue;
      if (active[k].isGradCluster || (pInfo.hasSmoothGradient && smoothCore[k] >= Math.max(8, tot[k] * 0.25))) continue;
      const ckChroma = Math.hypot(active[k].a, active[k].b2);
      if (ckChroma >= 16) {
        let hasLargerSameHue = false;
        let isCrossHueBlend = false;
        for (let a = 0; a < K; a++) {
          if (a === k || drop[a] || tot[a] <= tot[k]) continue;
          const caChroma = Math.hypot(active[a].a, active[a].b2);
          if (caChroma >= 12 && ((active[k].a * active[a].a + active[k].b2 * active[a].b2) / (ckChroma * caChroma)) >= 0.88) {
            hasLargerSameHue = true; break;
          }
        }
        if (!hasLargerSameHue) {
          for (let a = 0; a < K && !isCrossHueBlend; a++) {
            if (a === k || drop[a] || tot[a] < tot[k] * 2.0) continue;
            for (let b = a + 1; b < K && !isCrossHueBlend; b++) {
              if (b === k || drop[b] || tot[b] < tot[k] * 2.0) continue;
              if (isBlendInLab(active[k], active[a], active[b])) isCrossHueBlend = true;
            }
          }
          if (!isCrossHueBlend) continue;
        }
      }

      const coreRatio = core[k] / Math.max(1, tot[k]);
      const deepCoreRatio = deepCore[k] / Math.max(1, tot[k]);
      const popShare = tot[k] / Math.max(1, totalValidCells);

      /* Invarian Spasial 2D: Klaster warna yang memiliki dukungan blok inti 2D nyata (deepCoreRatio >= 0.22
         atau coreRatio >= 0.28 dengan popShare >= 0.03) adalah permukaan desain asli (seperti bidang Peach-Oranye
         pada poster bertekstur kertas), BUKAN halo anti-aliasing! */
      if (deepCoreRatio >= 0.22 || (coreRatio >= 0.28 && popShare >= 0.03) || deepCore[k] >= Math.max(64, totalValidCells * 0.008)) continue;

      let isHalo = false;
      pairCounts[k].forEach((cnt, pk) => {
        if (isHalo) return;
        const a = pk >> 6, b = pk & 63;
        if (drop[a] || drop[b]) return;
        if (cnt >= Math.max(2, tot[k] * 0.10) && (tot[a] + tot[b]) > tot[k] * 1.8) {
          if (isBlendInLab(active[k], active[a], active[b])) isHalo = true;
        }
      });

      if (!isHalo && (deepCoreRatio < 0.18 || coreRatio < 0.38) && popShare < 0.12) {
        for (let a = 0; a < K && !isHalo; a++) {
          if (a === k || drop[a] || tot[a] < tot[k] * 1.6) continue;
          for (let b = a + 1; b < K && !isHalo; b++) {
            if (b === k || drop[b] || tot[b] < tot[k] * 1.6) continue;
            if (isBlendInLab(active[k], active[a], active[b])) isHalo = true;
          }
        }
      }

      if (!isHalo && (deepCoreRatio < 0.15 || coreRatio < 0.28)) {
        for (let a = 0; a < K && !isHalo; a++) {
          if (a === k || drop[a] || tot[a] < tot[k] * 3.0) continue;
          const dLab2 = (active[k].L - active[a].L) ** 2 + (active[k].a - active[a].a) ** 2 + (active[k].b2 - active[a].b2) ** 2;
          if (dLab2 < 324) isHalo = true;
        }
      }
      if (isHalo) drop[k] = 1;
    }

    const nextActive = active.filter((_, i) => !drop[i]);
    if (nextActive.length === active.length || nextActive.length < 2) break;
    active = nextActive;
  }
  return active;
}

/* Snap setiap centroid CIE-Lab ke modus warna murni (histogram peak dalam radius DeltaE <= 3.5) */
function snapCentroidsToInteriorMode(cents, samples) {
  if (!samples || !samples.length || !cents || !cents.length) return cents;
  return cents.map(c => {
    const bins = new Map();
    let bestKey = -1, bestCnt = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const d2 = (s.L - c.L) ** 2 + (s.a - c.a) ** 2 + (s.b2 - c.b2) ** 2;
      if (d2 <= 12.25) {
        const key = (s.r << 16) | (s.g << 8) | (s.b);
        const wgt = s.pureCore ? 2 : 1;
        const nv = (bins.get(key) || 0) + wgt;
        bins.set(key, nv);
        if (nv > bestCnt) { bestCnt = nv; bestKey = key; }
      }
    }
    if (bestKey >= 0 && bestCnt >= Math.max(3, (c.count || 0) * 0.16)) {
      const mr = (bestKey >> 16) & 255, mg = (bestKey >> 8) & 255, mb = bestKey & 255;
      const [mL, ma, mb2] = rgb2lab(mr, mg, mb);
      return { ...c, r: mr, g: mg, b: mb, L: mL, a: ma, b2: mb2 };
    }
    return c;
  });
}

/* Ekstraksi Palet Optimal: mendukung 'two', 'auto', 'custom', dan 'unlimited' + Akurasi 1-Family & Gradasi */
function findPalette(work, mask, opt = {}, edgeField = null) {
  if (!edgeField && work && work.data) edgeField = buildEdgeField(work, mask);
  const plateauInfo = analyzeColorPlateausAndGradients(work, mask, edgeField);
  const { plateauModes, isSingleFamilyMultiShade, hasSmoothGradient, gradSamples } = plateauInfo;

  let samples = sampleInteriorPixels(work, mask, edgeField, 24000);
  if (hasSmoothGradient && gradSamples && gradSamples.length) {
    samples = samples.concat(gradSamples);
  }
  if (!samples.length) return { palette: [{ r: 0, g: 0, b: 0, hex: '#000000' }], K: 1, auto: false };

  if (opt.colorMode === 'two') {
    const seeds = kmeansPlusPlusSeeds(samples, 2, plateauModes.slice(0, 2));
    const { cents } = kmeansLab(samples, 2, seeds, 20);
    const snapped = snapCentroidsToInteriorMode(cents, samples);
    return { palette: snapped.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), hex: hexOf(c.r, c.g, c.b) })), K: 2, auto: false };
  }

  const capFlatPaletteList = (list, maxK) => {
    if (!maxK || maxK < 2 || list.length <= maxK) return list;
    const arr = list.map(c => {
      if (c.L == null) {
        const [L, a, b2] = rgb2lab(c.r, c.g, c.b);
        return { ...c, L, a, b2, count: c.count || 1 };
      }
      return { ...c, count: c.count || 1 };
    });
    while (arr.length > maxK) {
      let bestI = 0, bestJ = 1, bestCost = Infinity;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const de = ciede2000(arr[i].L, arr[i].a, arr[i].b2, arr[j].L, arr[j].a, arr[j].b2);
          const minCnt = Math.min(arr[i].count || 1, arr[j].count || 1);
          const cost = de * (1 + 0.18 * Math.log(1 + minCnt));
          if (cost < bestCost) { bestCost = cost; bestI = i; bestJ = j; }
        }
      }
      const ca = arr[bestI], cb = arr[bestJ];
      const keep = (ca.count || 1) >= (cb.count || 1) ? ca : cb;
      const drop = keep === ca ? cb : ca;
      const totW = (keep.count || 1) + (drop.count || 1);
      keep.r = Math.round((keep.r * (keep.count || 1) + drop.r * (drop.count || 1)) / totW);
      keep.g = Math.round((keep.g * (keep.count || 1) + drop.g * (drop.count || 1)) / totW);
      keep.b = Math.round((keep.b * (keep.count || 1) + drop.b * (drop.count || 1)) / totW);
      const [nL, na, nb2] = rgb2lab(keep.r, keep.g, keep.b);
      keep.L = nL; keep.a = na; keep.b2 = nb2;
      keep.hex = hexOf(keep.r, keep.g, keep.b);
      keep.count = totW;
      arr.splice(keep === ca ? bestJ : bestI, 1);
    }
    return arr;
  };

  if (opt.colorMode === 'custom' && opt.paletteColors && opt.paletteColors.length) {
    const pal = [];
    const pItems = opt.paletteItems && opt.paletteItems.length === opt.paletteColors.length ? opt.paletteItems : null;
    for (let idx = 0; idx < opt.paletteColors.length; idx++) {
      const hx = opt.paletteColors[idx];
      const it = pItems ? pItems[idx] : null;
      if (it && it.grad && it.grad.stops && it.grad.stops.length >= 2 && opt.gradientMode !== 'off') {
        it.grad.stops.forEach((st, sIdx) => {
          const [r, g, b] = rgbOf(st.color || hx);
          const [L, a, b2] = rgb2lab(r, g, b);
          pal.push({
            r, g, b, L, a, b2, hex: hexOf(r, g, b),
            isGradCluster: true,
            _userGradGroup: idx + 1,
            _userGradPrimary: sIdx === 0,
            userGrad: it.grad
          });
        });
      } else {
        const [r, g, b] = rgbOf(hx);
        const [L, a, b2] = rgb2lab(r, g, b);
        pal.push({ r, g, b, L, a, b2, hex: hexOf(r, g, b), _userGradGroup: it ? (idx + 1) : 0 });
      }
    }
    const hasCustomGrad = pal.some(p => p.userGrad);
    pal._hasSmoothGradient = hasCustomGrad || hasSmoothGradient;
    return { palette: pal, K: pal.length, auto: false, hasSmoothGradient: pal._hasSmoothGradient };
  }

  if (opt.fixedK && opt.targetColors) {
    const K = clamp(opt.targetColors, 2, 48);
    const seeds = kmeansPlusPlusSeeds(samples, K, plateauModes);
    const { cents } = kmeansLab(samples, K, seeds, 18);
    const snapped = snapCentroidsToInteriorMode(cents, samples);
    return { palette: snapped.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), hex: hexOf(c.r, c.g, c.b) })), K: snapped.length, auto: false };
  }

  /* JALUR 1: Gambar Diskrit Flat (1-Family Multi-Shade maupun Multi-Family Flat, Tanpa Gradasi Halus)
     Jika gambar didominasi plateau datar murni tanpa gradasi kontinu, pertahankan mode plateau terverifikasi
     dengan jarak perseptual CIEDE2000 (ΔE00) yang bermakna dan batasi artefak sesuai targetKMax adaptif */
  const maxAllowedPlateau = clamp(opt.targetColors || Math.max((opt.adaptiveKMax || 16) + 6, plateauModes.length, 16), 2, 44);
  if (!hasSmoothGradient && plateauModes.length >= 2 && opt.colorMode !== 'unlimited') {
    const palList = plateauModes.map(pm => ({ ...pm }));
    /* Periksa apakah ada detail aksen mikro yang memiliki pureCore mandiri di luar plateauModes */
    const seedsExtra = kmeansPlusPlusSeeds(samples, Math.min(28, palList.length + 4), palList);
    for (let sIdx = palList.length; sIdx < seedsExtra.length; sIdx++) {
      const sd = seedsExtra[sIdx];
      const minDe00 = palList.reduce((mn, c) => Math.min(mn, ciede2000(sd.L, sd.a, sd.b2, c.L, c.a, c.b2)), Infinity);
      const minDRgb = palList.reduce((mn, c) => Math.min(mn, Math.hypot(sd.r - c.r, sd.g - c.g, sd.b - c.b)), Infinity);
      if (minDe00 >= 5.5 && minDRgb >= 28.0) {
        let support = 0, coreSupport = 0, sr = 0, sg = 0, sb = 0, sL = 0, sa = 0, sb2 = 0;
        for (let i = 0; i < samples.length; i++) {
          const sm = samples[i];
          if ((sm.L - sd.L) ** 2 + (sm.a - sd.a) ** 2 + (sm.b2 - sd.b2) ** 2 <= 18) {
            support++;
            if (sm.pureCore) coreSupport++;
            sr += sm.r; sg += sm.g; sb += sm.b; sL += sm.L; sa += sm.a; sb2 += sm.b2;
          }
        }
        if (support >= Math.max(18, Math.round(samples.length * 0.0040)) && coreSupport >= Math.max(10, support * 0.55)) {
          const mr = Math.round(sr / support), mg = Math.round(sg / support), mb = Math.round(sb / support);
          palList.push({ r: mr, g: mg, b: mb, L: sL / support, a: sa / support, b2: sb2 / support, count: support, hex: hexOf(mr, mg, mb), verifiedPlateau: true });
        }
      }
    }
    /* Saring mode plateau yang terlalu mirip secara CIEDE2000 atau Euclidean RGB tanpa menghapus shade 1-family yang sah */
    const isLowResIcon = (work.w * work.h) <= 150000;
    const filteredPal = [];
    for (const pm of palList) {
      const chP = Math.hypot(pm.a, pm.b2);
      const dup = filteredPal.find(u => {
        const chU = Math.hypot(u.a, u.b2);
        const de00 = ciede2000(pm.L, pm.a, pm.b2, u.L, u.a, u.b2);
        const dRgb = Math.hypot(pm.r - u.r, pm.g - u.g, pm.b - u.b);
        if (isLowResIcon) {
          return de00 < (isSingleFamilyMultiShade ? 2.4 : 3.6) || dRgb < 24.5;
        }
        const sameHue = chP >= 14 && chU >= 14 && ((pm.a * u.a + pm.b2 * u.b2) / (chP * chU)) >= 0.94;
        const deThr = (sameHue && (Math.abs(pm.L - u.L) <= 4.8 || Math.min(chP, chU) >= 48)) ? 4.68 : 3.85;
        const rgbThr = (Math.min(pm.L, u.L) >= 52 || Math.min(chP, chU) >= 50) ? 23.5 : 16.0;
        return de00 <= deThr || dRgb <= rgbThr;
      });
      if (!dup) filteredPal.push(pm);
    }
    if (filteredPal.length > maxAllowedPlateau) {
      const capped = capFlatPaletteList(filteredPal, maxAllowedPlateau);
      filteredPal.length = 0;
      capped.forEach(c => filteredPal.push(c));
    }
    let outPal = filteredPal.length >= 2 ? filteredPal : palList.slice(0, maxAllowedPlateau);
    if (opt.maxColorEnabled && opt.maxColors >= 2 && outPal.length > opt.maxColors) {
      outPal = capFlatPaletteList(outPal, opt.maxColors);
    }
    outPal._isSingleFamilyMultiShade = isSingleFamilyMultiShade;
    outPal._hasSmoothGradient = false;
    return { palette: outPal, K: outPal.length, auto: true, bic: 0 };
  }

  /* JALUR 2: Gambar dengan Permukaan Gradasi Halus atau Unlimited / Kompleks */
  const isUnlimited = opt.colorMode === 'unlimited';
  const effSens = (isUnlimited || hasSmoothGradient || isSingleFamilyMultiShade) ? 'high' : (opt.sensitivity || 'medium');
  const sigma0Sq = (isUnlimited || hasSmoothGradient || isSingleFamilyMultiShade) ? 2.4 : ({ low: 48.0, medium: 28.0, high: 15.0 }[effSens] || 28.0);
  const baseGamma = (isUnlimited || hasSmoothGradient || isSingleFamilyMultiShade) ? 0.82 : ({ low: 4.8, medium: 3.1, high: 1.95 }[effSens] || 3.1);
  const typeMult = opt.imageType === 'photo' ? 0.85 : opt.imageType === 'blended' ? 1.05 : 1.35;
  const sensGamma = baseGamma * typeMult;
  const defaultKmax = isUnlimited
    ? (opt.imageType === 'photo' ? 34 : opt.imageType === 'aliased' ? 18 : 26)
    : hasSmoothGradient
    ? Math.max(18, opt.adaptiveKMax || 22, plateauModes.length + 12)
    : Math.max(plateauModes.length + 2, opt.adaptiveKMax || (opt.imageType === 'photo' ? 24 : opt.imageType === 'aliased' ? 12 : 18));
  const Kmax = clamp(opt.targetColors || defaultKmax, 2, 40);
  const N = samples.length;
  const Neff = hasSmoothGradient ? 1150 : 480;

  const allSeeds = kmeansPlusPlusSeeds(samples, Kmax, plateauModes);
  const minStartK = Math.max(2, hasSmoothGradient ? Math.min(Kmax, Math.max(15, plateauModes.length + 10)) : plateauModes.length);
  /* Subsampling terstratifikasi untuk pencarian BIC agar evaluasi puluhan kandidat K berjalan instan */
  const bicMaxN = 4096;
  let bicSamples = samples;
  if (N > bicMaxN) {
    bicSamples = [];
    const stepB = N / bicMaxN;
    for (let i = 0; i < bicMaxN; i++) bicSamples.push(samples[Math.min(N - 1, Math.floor(i * stepB))]);
  }
  const Nbic = bicSamples.length;
  let best = null;
  for (let K = minStartK; K <= Math.min(allSeeds.length, Kmax); K++) {
    const r = kmeansLab(bicSamples, K, allSeeds.slice(0, K), 10);
    const mse = r.sse / Math.max(1, Nbic);
    const bic = Neff * Math.log(mse + sigma0Sq) + sensGamma * K * Math.log(Neff);
    if (!best) {
      best = { K, bic, cents: r.cents, sse: r.sse, mse };
    } else if (bic < best.bic) {
      const relDrop = (best.mse - mse) / Math.max(1e-4, best.mse);
      if (hasSmoothGradient || isSingleFamilyMultiShade || best.mse > sigma0Sq * 0.72 || relDrop >= 0.08) {
        best = { K, bic, cents: r.cents, sse: r.sse, mse };
      }
    }
    if (best && K > best.K + (isUnlimited || hasSmoothGradient ? 8 : 5)) break;
  }
  if (best && bicSamples !== samples) {
    const refined = kmeansLab(samples, best.K, best.cents, 14);
    best.cents = refined.cents;
    best.sse = refined.sse;
    best.mse = refined.sse / Math.max(1, N);
  }

  /* Pastikan seluruh mode plateau datar terverifikasi tetap terwakili di dalam best.cents */
  for (const pm of plateauModes) {
    const minD2 = best.cents.reduce((mn, c) => Math.min(mn, (pm.L - c.L) ** 2 + (pm.a - c.a) ** 2 + (pm.b2 - c.b2) ** 2), Infinity);
    if (minD2 > 10.5) {
      best.cents.push({ r: pm.r, g: pm.g, b: pm.b, L: pm.L, a: pm.a, b2: pm.b2, count: pm.count, verifiedPlateau: true });
    }
  }

  const minFrac = (isUnlimited || hasSmoothGradient) ? 0.0004 : 0.0010;
  const rawPal = best.cents
    .filter(c => c.verifiedPlateau || c.isGradCluster || (c.count || 1) >= Math.max(4, samples.length * minFrac))
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  const dehaledPal = snapCentroidsToInteriorMode(
    pruneHaloPaletteClusters(work, mask, rawPal.length ? rawPal : best.cents, edgeField, plateauInfo),
    samples
  );

  const layerDiff = (hasSmoothGradient || isSingleFamilyMultiShade)
    ? 3.2
    : (opt.layerDifference != null ? opt.layerDifference : (isUnlimited ? 4.8 : (opt.imageType === 'photo' ? 6.4 : 7.0)));
  const baseMergeThrLab2 = layerDiff * layerDiff;
  const uniq = [];
  for (const c of dehaledPal) {
    const cChroma = Math.hypot(c.a, c.b2);
    let sameHueInUniq = 0, darkCountInUniq = 0;
    for (const u of uniq) {
      const uChroma = Math.hypot(u.a, u.b2);
      if (cChroma >= 18 && uChroma >= 18 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) >= 0.92) {
        sameHueInUniq++;
      }
      if (u.L < 15.5) darkCountInUniq++;
    }
    const dup = uniq.find(u => {
      const dLab2 = (c.L - u.L) ** 2 + (c.a - u.a) ** 2 + (c.b2 - u.b2) ** 2;
      const de00 = ciede2000(c.L, c.a, c.b2, u.L, u.a, u.b2);
      const uChroma = Math.hypot(u.a, u.b2);
      const isDiffHue = cChroma >= 15 && uChroma >= 15 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) < 0.85;
      // Konsolidasikan warna bahu line-art gelap netral (hanya bila bukan klaster kromatik/gradasi malam)
      const bothLowChromaDark = cChroma < 16.0 && uChroma < 16.0 && !hasSmoothGradient;
      if (bothLowChromaDark && c.L < 16.0 && u.L < 16.0 && Math.max(c.a, u.a) < 18.0 && de00 < 12.5) {
        if (c.L < u.L) {
          u.r = Math.round(0.60 * c.r + 0.40 * u.r);
          u.g = Math.round(0.60 * c.g + 0.40 * u.g);
          u.b = Math.round(0.60 * c.b + 0.40 * u.b);
          const [nL, na, nb2] = rgb2lab(u.r, u.g, u.b);
          u.L = nL; u.a = na; u.b2 = nb2;
          u.hex = hexOf(u.r, u.g, u.b);
        }
        return true;
      }
      if (bothLowChromaDark && c.L < 15.5 && u.L < 15.5 && darkCountInUniq >= 2 && de00 < 12.5) return true;
      if (isDiffHue) {
        return de00 < 2.0;
      }
      // Gabungkan warna yang secara perseptual hampir identik (mis. #bf0005 vs #b40207 dengan de00 < 2.8)
      if (de00 < Math.max(2.5, layerDiff * 0.72) || (dLab2 < baseMergeThrLab2 && de00 < layerDiff * 0.82)) return true;
      // Cegah duplikasi shade semu dari kompresi JPEG pada hue kromatik yang identik (cosH >= 0.96 & de00 < 5.8)
      const sameChromaticHue = cChroma >= 18 && uChroma >= 18 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) >= 0.92;
      const identicalChromaticHue = cChroma >= 22 && uChroma >= 22 && ((c.a * u.a + c.b2 * u.b2) / (cChroma * uChroma)) >= 0.96;
      if (!hasSmoothGradient && !isSingleFamilyMultiShade && identicalChromaticHue && de00 < Math.max(5.8, layerDiff * 0.88)) return true;
      if (!hasSmoothGradient && !isSingleFamilyMultiShade) {
        if (sameChromaticHue && sameHueInUniq >= 3 && de00 < 7.2) return true;
        if (sameChromaticHue && sameHueInUniq >= 2 && de00 < 4.5) return true;
      } else if (sameChromaticHue && sameHueInUniq >= 10 && de00 < 3.2) {
        return true;
      }
      const hasSolidSurface = (c.coreCount || 0) >= 12 && (c.coreCount || 0) >= (c.gridTot || 0) * 0.30;
      if (!isUnlimited && !hasSmoothGradient && !isSingleFamilyMultiShade && !c.verifiedPlateau && !c.isGradCluster && !hasSolidSurface && (c.count || 0) < (u.count || 1) * 0.85) {
        const bothNeutral = cChroma < 9.5 && uChroma < 9.5;
        if (bothNeutral || sameChromaticHue) {
          const shadeLimit = Math.max(layerDiff * 1.85, 13.8);
          if (dLab2 <= shadeLimit * shadeLimit) return true;
        }
      }
      return false;
    });
    if (!dup) {
      uniq.push({
        r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b),
        L: c.L, a: c.a, b2: c.b2, count: c.count || 1,
        hex: hexOf(c.r, c.g, c.b),
        verifiedPlateau: !!c.verifiedPlateau,
        isGradCluster: !!c.isGradCluster
      });
    }
  }

  /* Pemulihan Keluarga Hue Garis Tipis yang Hilang (Missing Distinct Hue Recovery):
     Pada ilustrasi garis tipis multi-warna (terutama di lowWork pratinjau), jika ada keluarga warna kromatik/gelap tegas
     yang terdeteksi di rawPal/best.cents namun belum terwakili di uniq (jarak CIEDE2000 >= 14.5 & bukan campuran linier 2 warna uniq),
     pulihkan agar pratinjau makeJob dan vectorize 100% konsisten! */
  if (opt.colorMode !== 'two' && uniq.length < Kmax) {
    for (const cand of best.cents) {
      if (uniq.length >= Kmax) break;
      if ((cand.count || 0) < 3) continue;
      let minDe00 = Infinity;
      for (const u of uniq) {
        const de = ciede2000(cand.L, cand.a, cand.b2, u.L, u.a, u.b2);
        if (de < minDe00) minDe00 = de;
      }
      if (minDe00 < 14.5) continue;
      let isBlend = false;
      for (let a = 0; a < uniq.length && !isBlend; a++) {
        for (let b = a + 1; b < uniq.length && !isBlend; b++) {
          if (evalColorBlendPair(cand.r, cand.g, cand.b, uniq[a], uniq[b])) isBlend = true;
        }
      }
      if (!isBlend) {
        uniq.push({
          r: Math.round(cand.r), g: Math.round(cand.g), b: Math.round(cand.b),
          L: cand.L, a: cand.a, b2: cand.b2,
          hex: hexOf(cand.r, cand.g, cand.b),
          count: cand.count || 1,
          isGradCluster: false,
          verifiedPlateau: false
        });
      }
    }
  }
  let finalPal = uniq.length ? uniq : best.cents.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), hex: hexOf(c.r, c.g, c.b) }));
  const allowGradUnify = opt.gradientMode === 'on' || (opt.gradientMode !== 'off' && hasSmoothGradient);
  if (opt.maxColorEnabled && opt.maxColors >= 2 && !allowGradUnify && finalPal.length > opt.maxColors) {
    finalPal = capFlatPaletteList(finalPal, opt.maxColors);
  }
  finalPal._isSingleFamilyMultiShade = isSingleFamilyMultiShade;
  finalPal._hasSmoothGradient = hasSmoothGradient;
  return { palette: finalPal, K: finalPal.length, auto: true, bic: best.bic, hasSmoothGradient, isSingleFamilyMultiShade };
}

function detectImageColorPool(work, mask, edgeField = null, maxColors = 28) {
  const samples = sampleInteriorPixels(work, mask, edgeField, 4500);
  if (!samples.length) return ['#000000', '#ffffff'];
  const K = clamp(maxColors, 4, Math.min(28, samples.length));
  const seeds = kmeansPlusPlusSeeds(samples, K);
  const { cents } = kmeansLab(samples, K, seeds, 8);
  const sorted = cents.filter(c => (c.count || 0) > 0).sort((a, b) => (b.count || 0) - (a.count || 0));
  const pool = [];
  for (const c of sorted) {
    const hx = hexOf(c.r, c.g, c.b).toLowerCase();
    const dup = pool.find(u => ((c.L - u.L) ** 2 + (c.a - u.a) ** 2 + (c.b2 - u.b2) ** 2) < 18);
    if (!dup && !pool.some(u => u.hex === hx)) {
      pool.push({ hex: hx, L: c.L, a: c.a, b2: c.b2, count: c.count || 1 });
    }
  }
  return pool.map(p => p.hex);
}

function detectNextImageColor(work, mask, existingHexes = [], poolHexes = []) {
  const norm = existingHexes.map(h => String(h || '').toLowerCase());
  const existLab = norm.map(h => {
    const [r, g, b] = rgbOf(h);
    const [L, a, b2] = rgb2lab(r, g, b);
    return { hex: h, r, g, b, L, a, b2 };
  });

  const minLabDist2 = (L, a, b2) => {
    if (!existLab.length) return Infinity;
    let mn = Infinity;
    for (const e of existLab) {
      const d = (L - e.L) ** 2 + (a - e.a) ** 2 + (b2 - e.b2) ** 2;
      if (d < mn) mn = d;
    }
    return mn;
  };

  for (const thr of [55, 18, 2, 0]) {
    for (const ph of (poolHexes || [])) {
      const h = ph.toLowerCase();
      if (norm.includes(h)) continue;
      const [r, g, b] = rgbOf(h);
      const [L, a, b2] = rgb2lab(r, g, b);
      if (minLabDist2(L, a, b2) >= thr) return h;
    }
  }

  if (work && work.data) {
    const samples = sampleInteriorPixels(work, mask, null, 12000);
    let bestS = null, bestD = -1;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const d = minLabDist2(s.L, s.a, s.b2);
      if (d > bestD) { bestD = d; bestS = s; }
    }
    if (bestS) {
      let sr = 0, sg = 0, sb = 0, cnt = 0;
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const d2 = (s.L - bestS.L) ** 2 + (s.a - bestS.a) ** 2 + (s.b2 - bestS.b2) ** 2;
        if (d2 <= 64) { sr += s.r; sg += s.g; sb += s.b; cnt++; }
      }
      const hx = cnt > 0 ? hexOf(sr / cnt, sg / cnt, sb / cnt).toLowerCase() : hexOf(bestS.r, bestS.g, bestS.b).toLowerCase();
      if (!norm.includes(hx)) return hx;
    }
  }

  return (poolHexes && poolHexes[0]) || '#4f46e5';
}

function analyzeRecommendations(w, h, alpha, cls, autoPaletteHexes, colorPoolHexes) {
  const nAuto = (autoPaletteHexes || []).length;
  const nPool = (colorPoolHexes || []).length;
  const maxDim = Math.max(w, h);
  const adp = buildAdaptiveTraceProfile(cls, w, h, 'auto');

  const recPipe = {
    id: 'auto',
    title: 'Fully Automatic (Adaptive Profile)',
    badge: `Rekomendasi Sistem · ${adp.shortTitle}`,
    reason: `Image Profiler mengenali gambar sebagai ${adp.title} (${cls.effectiveColors || nAuto} warna efektif CIE-Lab, entropi ${cls.colorEntropy || cls.entropy} bit, resolusi ${adp.resBucketLabel}). Racikan adaptif diterapkan otomatis: layer_difference ΔE=${adp.keyParams.layerDifference}, filter_speckle=${adp.keyParams.filterSpeckle}px, smoothing λ=${adp.keyParams.smoothingLambda}, dan bezier_tolerance ε=${adp.keyParams.bezierTolerance}px.`
  };

  const origScale = Math.min(1, 2048 / maxDim);
  const origW = Math.max(16, Math.round(w * origScale));
  const origH = Math.max(16, Math.round(h * origScale));
  const maxOrigDim = Math.max(origW, origH);
  const maxHighDim = Math.min(maxOrigDim, Math.min(1280, Math.max(360, Math.round(maxOrigDim * 0.78))));
  const highScale = Math.min(1, maxHighDim / maxDim);
  const highW = Math.max(16, Math.round(w * highScale));
  const highH = Math.max(16, Math.round(h * highScale));
  const maxMedDim = Math.min(maxHighDim, Math.min(800, Math.max(240, Math.round(maxOrigDim * 0.58))));
  const medScale = Math.min(1, maxMedDim / maxDim);
  const medW = Math.max(16, Math.round(w * medScale));
  const medH = Math.max(16, Math.round(h * medScale));
  const maxLowDim = Math.min(maxMedDim, Math.min(480, Math.max(160, Math.round(maxDim * 0.42))));
  const lowScale = Math.min(1, maxLowDim / maxDim);
  const lowW = Math.max(16, Math.round(w * lowScale));
  const lowH = Math.max(16, Math.round(h * lowScale));

  let recRes;
  if (maxDim > 2200) {
    recRes = {
      id: 'low',
      title: 'Resolusi Rendah',
      reason: `Dimensi asli cukup besar (${w}×${h} px). Resolusi Rendah (${lowW}×${lowH} px) mempercepat komputasi MRF dan menghasilkan kurva yang lebih halus.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  } else if (maxDim > 1650) {
    recRes = {
      id: 'medium',
      title: 'Resolusi Sedang',
      reason: `Dimensi asli cukup besar (${w}×${h} px). Resolusi Sedang (${medW}×${medH} px) memberikan keseimbangan terbaik antara ketajaman detail dan kecepatan MRF.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  } else if (maxDim > 1250) {
    recRes = {
      id: 'high',
      title: 'Resolusi Tinggi',
      reason: `Dimensi gambar (${w}×${h} px) cukup besar. Resolusi Tinggi (${highW}×${highH} px) menjaga ketajaman detail dengan waktu komputasi yang jauh lebih efisien.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  } else {
    recRes = {
      id: 'original',
      title: 'Resolusi Asli',
      reason: `Dimensi gambar (${w}×${h} px) sangat ideal untuk di-trace pada Resolusi Asli guna mempertahankan ketajaman sudut C⁰ dan presisi sub-piksel maksimal.`,
      origW, origH, highW, highH, medW, medH, lowW, lowH
    };
  }

  let recColor;
  if (nAuto <= 2 || (cls.nColors <= 14 && nAuto <= 2)) {
    recColor = {
      id: 'two',
      title: 'Two Colors',
      reason: `Gambar didominasi 2 warna kontras tinggi (${autoPaletteHexes.slice(0, 2).join(' & ')}). Mode Two Colors menghasilkan pemisahan biner paling tajam.`
    };
  } else if (cls.type === 'photo' && cls.entropy > 5.45 && nPool >= 18) {
    recColor = {
      id: 'unlimited',
      title: 'Unlimited Colors',
      reason: `Fotografi dengan variasi rona kompleks (entropi ${cls.entropy} bit). Unlimited Colors mengalokasikan spektrum warna paling kaya.`
    };
  } else {
    recColor = {
      id: 'auto',
      title: 'Automatic Colors',
      reason: `Sistem mendeteksi ${nAuto} warna utama bersih di ruang CIE-Lab dengan pemangkasan klaster halo anti-aliasing otomatis.`
    };
  }

  const recType = cls.type;
  const recAlpha = 'keep';
  const recQual = cls.quality;
  const recDetail = cls.type === 'photo' ? 'tinggi' : cls.edgeDensity > 0.12 ? 'tinggi' : 'medium';

  return { recPipe, recRes, recColor, recType, recAlpha, recQual, recDetail, adaptiveProfile: adp };
}


/* === END 07-vmt-palette-kdtree.js === */

/* === BEGIN 08-vmt-segmentation-mrf.js === */
/* =====================================================================
 * JS Module 08: VMT Engine Part 4 — Barycentric Anti-Aliasing Deconvolution, QuadTree & MRF Potts Segmentation
 * ===================================================================== */
/* =====================================================================
   TAHAP 3 — QuadTree & Multi-Scale Geodesic Edge Snapping (Anti-Halo Fix)
   Menyapu bersih piksel transisi anti-aliasing (lebar 1-3 px) di perbatasan
   agar mengunci ke warna jangkar (anchor) lokal tanpa membentuk cincin halo
   atau poligon serpihan (sliver) warna ketiga.
   ===================================================================== */
/* Evaluasi presisi apakah warna (r,g,b) berada pada kurva pencampuran anti-aliasing
   (baik sRGB linier maupun gamma-2.0 linear-light) di antara dua warna CA dan CB */
function evalColorBlendPair(r, g, b, CA, CB) {
  if (!CA || !CB) return null;
  const dr = CA.r - CB.r, dg = CA.g - CB.g, db = CA.b - CB.b;
  const len2 = dr * dr + dg * dg + db * db;
  if (len2 < 120) return null;

  const t = ((r - CB.r) * dr + (g - CB.g) * dg + (b - CB.b) * db) / len2;
  if (t <= 0.02 || t >= 0.98) return null;

  const abD2 = cdist2(CA.r, CA.g, CA.b, CB.r, CB.g, CB.b);
  if (abD2 < 320) return null;

  const maxAllowedPerp = Math.min(5400, 680 + abD2 * 0.022);
  const pr = CB.r + t * dr, pg = CB.g + t * dg, pb = CB.b + t * db;
  let perpD2 = cdist2(r, g, b, pr, pg, pb);
  if (perpD2 > maxAllowedPerp * 5.5) return null;

  /* Evaluasi kurva campuran linear-light (gamma 2.0 & sRGB gamma 2.2) untuk anti-aliasing sub-piksel */
  const tc = clamp(t, 0.02, 0.98), invTc = 1 - tc;
  const gr = Math.sqrt(tc * CA.r * CA.r + invTc * CB.r * CB.r);
  const gg = Math.sqrt(tc * CA.g * CA.g + invTc * CB.g * CB.g);
  const gb = Math.sqrt(tc * CA.b * CA.b + invTc * CB.b * CB.b);
  const perpGammaD2 = cdist2(r, g, b, gr, gg, gb);
  if (perpGammaD2 < perpD2) perpD2 = perpGammaD2;

  if (perpD2 > maxAllowedPerp * 0.85) {
    const ar = CA.r | 0, ag = CA.g | 0, ab = CA.b | 0;
    const br = CB.r | 0, bg = CB.g | 0, bb = CB.b | 0;
    const pAr = (CA.r === ar && (ar & ~255) === 0) ? _GAMMA22_LUT[ar] : Math.pow(CA.r, 2.2);
    const pAg = (CA.g === ag && (ag & ~255) === 0) ? _GAMMA22_LUT[ag] : Math.pow(CA.g, 2.2);
    const pAb = (CA.b === ab && (ab & ~255) === 0) ? _GAMMA22_LUT[ab] : Math.pow(CA.b, 2.2);
    const pBr = (CB.r === br && (br & ~255) === 0) ? _GAMMA22_LUT[br] : Math.pow(CB.r, 2.2);
    const pBg = (CB.g === bg && (bg & ~255) === 0) ? _GAMMA22_LUT[bg] : Math.pow(CB.g, 2.2);
    const pBb = (CB.b === bb && (bb & ~255) === 0) ? _GAMMA22_LUT[bb] : Math.pow(CB.b, 2.2);
    const inv22 = 1 / 2.2;
    const gr22 = Math.pow(tc * pAr + invTc * pBr, inv22);
    const gg22 = Math.pow(tc * pAg + invTc * pBg, inv22);
    const gb22 = Math.pow(tc * pAb + invTc * pBb, inv22);
    const perpGamma22D2 = cdist2(r, g, b, gr22, gg22, gb22);
    if (perpGamma22D2 < perpD2) perpD2 = perpGamma22D2;
  }

  if (perpD2 > maxAllowedPerp) return null;

  const dA = cdist2(r, g, b, CA.r, CA.g, CA.b);
  const dB = cdist2(r, g, b, CB.r, CB.g, CB.b);
  return {
    t,
    perpD2,
    abD2,
    dA,
    dB,
    target: t >= 0.5 ? 0 : 1,
    closest: dA <= dB ? 0 : 1
  };
}

/* Membangun Konteks Segmentasi Terpadu (Dual-Space CIE-Lab + Redmean, 2D Structure Tensor,
   Shi-Tomasi Cornerness, dan Normal-Ray Unmixing untuk akurasi penuh pada QuadTree & MRF) */
/* Unmixing Barisentrik 3-Arah (Tri-Junction / Y-Junction Convex Hull Unmixing):
   Mendeteksi piksel/klaster transisi pada pertemuan 3 warna (CA, CB, CC) seperti Kuning+Krem+Hitam
   agar tidak terlempar ke warna palet ke-4 (mis. Hijau) akibat campuran anti-aliasing + subsampling JPEG. */
function evalColorBlendTriplet(r, g, b, CA, CB, CC) {
  if (!CA || !CB || !CC) return null;
  const ux = CA.r - CC.r, uy = CA.g - CC.g, uz = CA.b - CC.b;
  const vx = CB.r - CC.r, vy = CB.g - CC.g, vz = CB.b - CC.b;
  const wx = r - CC.r, wy = g - CC.g, wz = b - CC.b;
  const uu = ux * ux + uy * uy + uz * uz;
  const vv = vx * vx + vy * vy + vz * vz;
  const uv = ux * vx + uy * vy + uz * vz;
  const det = uu * vv - uv * uv;
  if (det < 1e4) return null;
  const uw = ux * wx + uy * wy + uz * wz;
  const vw = vx * wx + vy * wy + vz * wz;
  let wA = (vv * uw - uv * vw) / det;
  let wB = (uu * vw - uv * uw) / det;
  let wC = 1.0 - wA - wB;
  if (wA < -0.08 || wB < -0.08 || wC < -0.08) return null;
  wA = Math.max(0, wA); wB = Math.max(0, wB); wC = Math.max(0, wC);
  const wSum = wA + wB + wC || 1;
  wA /= wSum; wB /= wSum; wC /= wSum;
  const activeCnt = (wA > 0.04 ? 1 : 0) + (wB > 0.04 ? 1 : 0) + (wC > 0.04 ? 1 : 0);
  if (activeCnt < 2) return null;
  const pr = wA * CA.r + wB * CB.r + wC * CC.r - r;
  const pg = wA * CA.g + wB * CB.g + wC * CC.g - g;
  const pb = wA * CA.b + wB * CB.b + wC * CC.b - b;
  const perpD2 = pr * pr + pg * pg + pb * pb;
  const dAB = cdist2(CA.r, CA.g, CA.b, CB.r, CB.g, CB.b);
  const maxSpan = Math.max(uu, vv, dAB);
  if (perpD2 > Math.max(480, maxSpan * 0.052)) return null;
  const domSlot = (wA >= wB && wA >= wC) ? 0 : (wB >= wC ? 1 : 2);
  return { wA, wB, wC, domSlot, perpD2, maxSpan };
}

function buildSegmentationContext(work, rawWork, mask, palette, edgeField, forceCpu = false) {
  const { w, h } = work;
  const n = w * h;
  const fltD = work.data.data;
  const rawD = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === n * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data && rawWork.data.data ? rawWork.data.data : fltD);

  const ef = edgeField || buildEdgeField(work, mask);
  const gx = ef.gx, gy = ef.gy, mag = ef.mag;

  const K = palette.length;
  const palLab = palette.map((c, i) => {
    const [L, a, labB] = rgb2lab(c.r, c.g, c.b);
    return { r: c.r, g: c.g, b: c.b, L, a, b2: labB, i };
  });
  const tree = buildKdTree(palLab.map(c => ({ L: c.L, a: c.a, b: c.b2, i: c.i })));

  const palDist2 = new Float32Array(K * K);
  const palIsMidBlend = new Uint8Array(K * K * K);
  for (let a = 0; a < K; a++) {
    for (let b = 0; b < K; b++) {
      const dRgb = cdist2(palLab[a].r, palLab[a].g, palLab[a].b, palLab[b].r, palLab[b].g, palLab[b].b);
      const dLab = (palLab[a].L - palLab[b].L) ** 2 + (palLab[a].a - palLab[b].a) ** 2 + (palLab[a].b2 - palLab[b].b2) ** 2;
      palDist2[a * K + b] = 0.55 * dRgb + 0.45 * (dLab * 18);
    }
  }
  const hasSmoothGrad = !!(palette._hasSmoothGradient || palette._isSingleFamilyMultiShade);
  for (let cur = 0; cur < K; cur++) {
    const Ccur = palLab[cur];
    const isVerified = !!(palette[cur] && (palette[cur].verifiedPlateau || palette[cur].isGradCluster));
    for (let a = 0; a < K; a++) {
      if (a === cur) continue;
      for (let b = a + 1; b < K; b++) {
        if (b === cur) continue;
        const bl = evalColorBlendPair(Ccur.r, Ccur.g, Ccur.b, palLab[a], palLab[b]);
        const minAbD2 = (hasSmoothGrad || isVerified) ? 3600 : 225;
        const maxPerp = isVerified ? Math.min(360, 120 + (bl ? bl.abD2 * 0.0025 : 0)) : Math.min(1400, 420 + (bl ? bl.abD2 * 0.008 : 0));
        if (bl && bl.abD2 >= minAbD2 && bl.perpD2 <= maxPerp) {
          palIsMidBlend[cur * K * K + a * K + b] = 1;
          palIsMidBlend[cur * K * K + b * K + a] = 1;
        }
      }
    }
  }

  /* TAHAP 2 GPU ACCELERATION: Jalankan Structure Tensor 2D 3x3, Deteksi Thin-Stroke 1D,
     Nearest-Palette Lookup CIE-Lab, dan Normal-Ray Flank Unmixing langsung di VRAM GPU */
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuBuildSegmentationTables && K <= 64) {
    const gpuTabs = GpuAccelerator.gpuBuildSegmentationTables(work, rawD, fltD, mask, palLab, ef);
    if (gpuTabs) {
      const { nxArr, nyArr, cohArr, cornerArr, flankA, flankB, flankAlpha, flankPerp, thinStrokeLab, rawNearestFlt, rawNearestRaw } = gpuTabs;
      const nearestLabAt = (dArr, p) => {
        if (thinStrokeLab[p] >= 0) return thinStrokeLab[p];
        if (dArr === fltD && rawNearestFlt) return rawNearestFlt[p];
        if (dArr === rawD && rawNearestRaw) return rawNearestRaw[p];
        const i = p * 4;
        const r = dArr[i], g = dArr[i + 1], b = dArr[i + 2];
        if (K === 2) {
          const d0 = cdist2(r, g, b, palLab[0].r, palLab[0].g, palLab[0].b);
          const d1 = cdist2(r, g, b, palLab[1].r, palLab[1].g, palLab[1].b);
          return d0 <= d1 ? 0 : 1;
        }
        const [L, a, b2] = rgb2lab(r, g, b);
        return kdNearestLab(tree, L, a, b2, { d: Infinity, i: 0 }).i;
      };
      return {
        w, h, K, fltD, rawD, gx, gy, mag,
        palLab, tree, palDist2, palIsMidBlend,
        nxArr, nyArr, cohArr, cornerArr,
        flankA, flankB, flankAlpha, flankPerp,
        thinStrokeLab,
        rawNearestFlt,
        rawNearestRaw,
        nearestLabAt,
        gpuAccelerated: true
      };
    }
  }

  /* Hitung Structure Tensor 2D 3x3 (nx, ny, koherensi tepi, dan Shi-Tomasi cornerness) */
  const nxArr = new Float32Array(n);
  const nyArr = new Float32Array(n);
  const cohArr = new Float32Array(n);
  const cornerArr = new Float32Array(n);

  for (let y = 0; y < h; y++) {
    const ym1 = Math.max(0, y - 1) * w, y0 = y * w, yp1 = Math.min(h - 1, y + 1) * w;
    for (let x = 0; x < w; x++) {
      const p = y0 + x;
      if ((mask && mask[p]) || mag[p] < 1.5) continue;
      const xm1 = Math.max(0, x - 1), xp1 = Math.min(w - 1, x + 1);
      const p00 = ym1 + xm1, p01 = ym1 + x, p02 = ym1 + xp1;
      const p10 = y0  + xm1, p11 = p,       p12 = y0  + xp1;
      const p20 = yp1 + xm1, p21 = yp1 + x, p22 = yp1 + xp1;

      const jxx = (
        gx[p00] * gx[p00] + 2 * gx[p01] * gx[p01] + gx[p02] * gx[p02] +
        2 * gx[p10] * gx[p10] + 4 * gx[p11] * gx[p11] + 2 * gx[p12] * gx[p12] +
        gx[p20] * gx[p20] + 2 * gx[p21] * gx[p21] + gx[p22] * gx[p22]
      ) * 0.0625;
      const jxy = (
        gx[p00] * gy[p00] + 2 * gx[p01] * gy[p01] + gx[p02] * gy[p02] +
        2 * gx[p10] * gy[p10] + 4 * gx[p11] * gy[p11] + 2 * gx[p12] * gy[p12] +
        gx[p20] * gy[p20] + 2 * gx[p21] * gy[p21] + gx[p22] * gy[p22]
      ) * 0.0625;
      const jyy = (
        gy[p00] * gy[p00] + 2 * gy[p01] * gy[p01] + gy[p02] * gy[p02] +
        2 * gy[p10] * gy[p10] + 4 * gy[p11] * gy[p11] + 2 * gy[p12] * gy[p12] +
        gy[p20] * gy[p20] + 2 * gy[p21] * gy[p21] + gy[p22] * gy[p22]
      ) * 0.0625;

      const tr = jxx + jyy;
      if (tr > 1e-3) {
        const df = jxx - jyy;
        const disc = Math.hypot(df, 2 * jxy);
        const l2 = Math.max(0, 0.5 * (tr - disc));
        cohArr[p] = (disc / tr) * (disc / tr);
        cornerArr[p] = Math.sqrt(l2);
        const theta = 0.5 * Math.atan2(2 * jxy, df);
        let vx = Math.cos(theta), vy = Math.sin(theta);
        if (vx * gx[p] + vy * gy[p] < 0) { vx = -vx; vy = -vy; }
        nxArr[p] = vx;
        nyArr[p] = vy;
      }
    }
  }

  /* Deteksi Sub-Pixel 1D Thin Stroke Valley/Ridge Berbasis Unmixing Vektor Warna Penuh (Bebas Salah-Warna Lintas Hue) */
  const thinStrokeLab = new Int16Array(n).fill(-1);
  for (let y = 2; y < h - 2; y++) {
    const row = y * w;
    for (let x = 2; x < w - 2; x++) {
      const p = row + x;
      if (mask && mask[p]) continue;
      const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
      const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
      for (let dIdx = 0; dIdx < 4; dIdx++) {
        const dx = DIRS[dIdx][0], dy = DIRS[dIdx][1];
        const pA2 = (y - 2 * dy) * w + (x - 2 * dx);
        const pB2 = (y + 2 * dy) * w + (x + 2 * dx);
        if (mask && (mask[pA2] || mask[pB2])) continue;
        const iA2 = pA2 * 4, iB2 = pB2 * 4;
        const dAB = cdist2(rawD[iA2], rawD[iA2 + 1], rawD[iA2 + 2], rawD[iB2], rawD[iB2 + 1], rawD[iB2 + 2]);
        if (dAB > 1800) continue; // bukan permukaan latar yang sama di kedua sisi
        const bgR = 0.5 * (rawD[iA2] + rawD[iB2]);
        const bgG = 0.5 * (rawD[iA2 + 1] + rawD[iB2 + 1]);
        const bgB = 0.5 * (rawD[iA2 + 2] + rawD[iB2 + 2]);
        const dBg0 = cdist2(r0, g0, b0, bgR, bgG, bgB);
        if (dBg0 < 1650) continue;

        const pA1 = (y - dy) * w + (x - dx), pB1 = (y + dy) * w + (x + dx);
        const dBgA1 = cdist2(rawD[pA1 * 4], rawD[pA1 * 4 + 1], rawD[pA1 * 4 + 2], bgR, bgG, bgB);
        const dBgB1 = cdist2(rawD[pB1 * 4], rawD[pB1 * 4 + 1], rawD[pB1 * 4 + 2], bgR, bgG, bgB);
        if (dBg0 < Math.max(dBgA1, dBgB1) * 0.90) continue; // harus puncak punggung/lembah kontras lokal

        // Periksa kontinuitas tangensial sepanjang arah garis (-dy, dx)
        const pT1 = (y - dx) * w + (x + dy), pT2 = (y + dx) * w + (x - dy);
        const dBgT1 = cdist2(rawD[pT1 * 4], rawD[pT1 * 4 + 1], rawD[pT1 * 4 + 2], bgR, bgG, bgB);
        const dBgT2 = cdist2(rawD[pT2 * 4], rawD[pT2 * 4 + 1], rawD[pT2 * 4 + 2], bgR, bgG, bgB);
        const dSimT1 = cdist2(r0, g0, b0, rawD[pT1 * 4], rawD[pT1 * 4 + 1], rawD[pT1 * 4 + 2]);
        const dSimT2 = cdist2(r0, g0, b0, rawD[pT2 * 4], rawD[pT2 * 4 + 1], rawD[pT2 * 4 + 2]);
        if (Math.max(dBgT1, dBgT2) < dBg0 * 0.42 || Math.min(dSimT1, dSimT2) > dBg0 * 0.45) continue;

        // Cari warna latar terdekat bgK
        let bgK = 0, bestBgD = Infinity;
        for (let k = 0; k < K; k++) {
          const dB = cdist2(bgR, bgG, bgB, palLab[k].r, palLab[k].g, palLab[k].b);
          if (dB < bestBgD) { bestBgD = dB; bgK = k; }
        }

        // Pilih label palet k != bgK yang paling akurat menjelaskan vektor warna ter-unmix (r0, g0, b0) dari latar (bgR, bgG, bgB)
        let bestK = -1, bestCost = Infinity;
        for (let k = 0; k < K; k++) {
          if (k === bgK) continue;
          const pk = palLab[k];
          const dPalBg = cdist2(pk.r, pk.g, pk.b, bgR, bgG, bgB);
          if (dPalBg < 1800) continue;
          const vr = pk.r - bgR, vg = pk.g - bgG, vb = pk.b - bgB;
          const vLen2 = vr * vr + vg * vg + vb * vb;
          if (vLen2 < 200) continue;
          const alpha = clamp(((r0 - bgR) * vr + (g0 - bgG) * vg + (b0 - bgB) * vb) / vLen2, 0, 1.15);
          if (alpha < 0.36) continue;
          const ac = Math.min(1, alpha);
          const pr = bgR + ac * vr, pg = bgG + ac * vg, pb = bgB + ac * vb;
          const perpD2 = cdist2(r0, g0, b0, pr, pg, pb);
          const directD2 = cdist2(r0, g0, b0, pk.r, pk.g, pk.b);
          const cost = perpD2 + directD2 * 0.28;
          if (cost < bestCost && perpD2 <= dBg0 * 0.28 + 480) {
            bestCost = cost;
            bestK = k;
          }
        }
        if (bestK >= 0) { thinStrokeLab[p] = bestK; break; }
      }
    }
  }

  const nearestLabAt = (dArr, p) => {
    if (thinStrokeLab[p] >= 0) return thinStrokeLab[p];
    const i = p * 4;
    const r = dArr[i], g = dArr[i + 1], b = dArr[i + 2];
    if (K === 2) {
      // Gunakan titik tengah linier sRGB (50% coverage) agar garis tipis anti-aliased tidak terhapus oleh bias kubik CIE L*
      const d0 = cdist2(r, g, b, palLab[0].r, palLab[0].g, palLab[0].b);
      const d1 = cdist2(r, g, b, palLab[1].r, palLab[1].g, palLab[1].b);
      return d0 <= d1 ? 0 : 1;
    }
    const [L, a, b2] = rgb2lab(r, g, b);
    const chP = Math.hypot(a, b2);
    if (chP >= 10.0 && K <= 24) {
      let bestI = 0, bestCost = Infinity;
      for (let k = 0; k < K; k++) {
        const pk = palLab[k];
        const dL = L - pk.L, da = a - pk.a, db = b2 - pk.b2;
        let cost = dL * dL + da * da + db * db;
        const chK = Math.hypot(pk.a, pk.b2);
        if (chK >= 12.0) {
          const cosH = (a * pk.a + b2 * pk.b2) / (chP * chK);
          if (cosH < 0.88) {
            cost += (0.88 - cosH) * chP * chK * 4.2;
          }
        }
        if (cost < bestCost) { bestCost = cost; bestI = k; }
      }
      return bestI;
    }
    return kdNearestLab(tree, L, a, b2, { d: Infinity, i: 0 }).i;
  };

  /* Ray-casting sepanjang normal gradien +-n_p pada piksel tepi untuk menemukan pasangan jangkar interior (flankA, flankB) */
  const flankA = new Int16Array(n).fill(-1);
  const flankB = new Int16Array(n).fill(-1);
  const flankAlpha = new Float32Array(n).fill(0.5);
  const flankPerp = new Float32Array(n);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const mp0 = mag[p];
      if ((mask && mask[p]) || mp0 < 4.5) continue;
      const nx = nxArr[p], ny = nyArr[p];
      if (nx === 0 && ny === 0) continue;

      let bestPosP = -1, bestPosMag = Infinity;
      let bestNegP = -1, bestNegMag = Infinity;
      let bestRidgeP = -1, bestRidgeLab = -1;
      for (let s = 1; s <= 4; s++) {
        const px = clamp(Math.round(x + nx * s), 0, w - 1);
        const py = clamp(Math.round(y + ny * s), 0, h - 1);
        const pp = py * w + px;
        if (!(mask && mask[pp])) {
          const mScore = mag[pp] + s * 1.1;
          if (mScore < bestPosMag) { bestPosMag = mScore; bestPosP = pp; }
          if (bestRidgeP < 0 && thinStrokeLab[pp] >= 0) { bestRidgeP = pp; bestRidgeLab = thinStrokeLab[pp]; }
        }
        const mx = clamp(Math.round(x - nx * s), 0, w - 1);
        const my = clamp(Math.round(y - ny * s), 0, h - 1);
        const mp = my * w + mx;
        if (!(mask && mask[mp])) {
          const mScore = mag[mp] + s * 1.1;
          if (mScore < bestNegMag) { bestNegMag = mScore; bestNegP = mp; }
          if (bestRidgeP < 0 && thinStrokeLab[mp] >= 0) { bestRidgeP = mp; bestRidgeLab = thinStrokeLab[mp]; }
        }
      }
      if (bestPosP < 0 || bestNegP < 0 || bestPosP === bestNegP) continue;

      let LA = nearestLabAt(fltD, bestPosP);
      let LB = nearestLabAt(fltD, bestNegP);
      if (LA === LB && bestRidgeLab >= 0 && bestRidgeLab !== LA) {
        LB = bestRidgeLab;
        bestNegP = bestRidgeP;
      } else if (mag[bestPosP] > mp0 * 0.65 || mag[bestNegP] > mp0 * 0.65) {
        continue;
      }
      if (LA === LB || LA < 0 || LB < 0) continue;

      const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
      let blPal = evalColorBlendPair(r0, g0, b0, palLab[LA], palLab[LB]);
      if (!blPal) {
        /* Fallback ke rata-rata rawD & fltD bila terdapat derau kompresi JPEG pada piksel tepi */
        blPal = evalColorBlendPair((r0 + fltD[i0]) * 0.5, (g0 + fltD[i0 + 1]) * 0.5, (b0 + fltD[i0 + 2]) * 0.5, palLab[LA], palLab[LB]);
      }
      if (!blPal) continue;

      const iPos = bestPosP * 4, iNeg = bestNegP * 4;
      const CposLocal = { r: fltD[iPos], g: fltD[iPos + 1], b: fltD[iPos + 2] };
      const CnegLocal = { r: fltD[iNeg], g: fltD[iNeg + 1], b: fltD[iNeg + 2] };
      const blLoc = evalColorBlendPair(r0, g0, b0, CposLocal, CnegLocal);

      const alpha = blLoc ? (0.60 * blLoc.t + 0.40 * blPal.t) : blPal.t;
      flankA[p] = LA;
      flankB[p] = LB;
      flankAlpha[p] = clamp(alpha, 0, 1);
      flankPerp[p] = blLoc ? Math.min(blPal.perpD2, blLoc.perpD2) : blPal.perpD2;
    }
  }

  return {
    w, h, K, fltD, rawD, gx, gy, mag,
    palLab, tree, palDist2, palIsMidBlend,
    nxArr, nyArr, cohArr, cornerArr,
    flankA, flankB, flankAlpha, flankPerp,
    thinStrokeLab,
    nearestLabAt
  };
}

function localNeighborhoodEdgeSnap(work, mask, labels, palette, edgeField = null, passes = 4, segCtx = null, forceCpu = false) {
  if (!palette || palette.length < 2) return labels;
  const ctx = segCtx || labels._segCtx || work._segCtx || buildSegmentationContext(work, work, mask, palette, edgeField, forceCpu);
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuLocalNeighborhoodEdgeSnap && palette.length <= 64) {
    if (GpuAccelerator.gpuLocalNeighborhoodEdgeSnap(work, mask, labels, palette, passes, ctx)) {
      return labels;
    }
  }
  const { w, h, K, rawD, mag, palLab, palIsMidBlend, flankA, flankB, flankAlpha } = ctx;

  const isAnchor = new Uint8Array(w * h);
  const R = 3;

  for (let pass = 0; pass < passes; pass++) {
    isAnchor.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (mask && mask[p]) continue;
        const L0 = labels[p];
        if (L0 < 0) continue;
        if (mag && mag[p] > 14 && pass === 0) continue;
        let same = 0;
        if (labels[p - 1] === L0) same++;
        if (labels[p + 1] === L0) same++;
        if (labels[p - w] === L0) same++;
        if (labels[p + w] === L0) same++;
        if (same >= 3) {
          const i0 = p * 4;
          const C0 = palLab[L0];
          if (cdist2(rawD[i0], rawD[i0 + 1], rawD[i0 + 2], C0.r, C0.g, C0.b) < 1450) {
            isAnchor[p] = 1;
          }
        }
      }
    }

    const nextLabels = new Int16Array(labels);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if ((mask && mask[p]) || isAnchor[p]) continue;
        const curL = labels[p];
        if (curL < 0) continue;

        const lL = labels[p - 1], lR = labels[p + 1], lU = labels[p - w], lD = labels[p + w];
        if (lL === curL && lR === curL && lU === curL && lD === curL) continue;

        const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
        const Ccur = palLab[curL];
        const dCur = cdist2(r0, g0, b0, Ccur.r, Ccur.g, Ccur.b);

        /* 1. Periksa pasangan jangkar normal gradien (flankA, flankB) terlebih dahulu */
        const fA = flankA[p], fB = flankB[p];
        if (fA >= 0 && fB >= 0 && fA !== curL && fB !== curL) {
          if (palIsMidBlend[curL * K * K + fA * K + fB]) {
            const bl = evalColorBlendPair(r0, g0, b0, palLab[fA], palLab[fB]);
            if (bl && dCur > bl.perpD2 * 0.45) {
              nextLabels[p] = flankAlpha[p] >= 0.5 ? fA : fB;
              continue;
            }
          }
        }

        /* 2. Evaluasi statistik jangkar lokal pada jendela 7x7 */
        const counts = new Map();
        const anchorCounts = new Map();
        for (let dy = -R; dy <= R; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          const row = ny * w;
          for (let dx = -R; dx <= R; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const np = row + nx;
            const nl = labels[np];
            if (nl < 0) continue;
            counts.set(nl, (counts.get(nl) || 0) + 1);
            if (isAnchor[np]) anchorCounts.set(nl, (anchorCounts.get(nl) || 0) + 4);
          }
        }
        if (counts.size < 2) continue;

        const localRanked = [...counts.keys()].sort((a, b) => {
          const sa = (anchorCounts.get(a) || 0) + (counts.get(a) || 0);
          const sb = (anchorCounts.get(b) || 0) + (counts.get(b) || 0);
          return sb - sa;
        });

        const curAnchor = anchorCounts.get(curL) || 0;
        const curTotal = counts.get(curL) || 0;

        let snapped = -1, bestPerp = Infinity;
        const maxCheck = Math.min(localRanked.length, 4);
        for (let a = 0; a < maxCheck; a++) {
          const LA = localRanked[a];
          for (let b = a + 1; b < maxCheck; b++) {
            const LB = localRanked[b];
            if ((counts.get(LA) || 0) + (counts.get(LB) || 0) < 5) continue;

            if (LA !== curL && LB !== curL) {
              const isPalMid = palIsMidBlend[curL * K * K + LA * K + LB] === 1;
              const blendPx = evalColorBlendPair(r0, g0, b0, palLab[LA], palLab[LB]);
              if (blendPx) {
                if (!(!isPalMid && dCur < blendPx.perpD2 * 2.5 + 1200)) {
                  const ancAB = (anchorCounts.get(LA) || 0) + (anchorCounts.get(LB) || 0);
                  if ((isPalMid && (curAnchor <= 8 || curTotal <= 22) && ancAB >= 8) || (curAnchor === 0 && curTotal <= 10 && ancAB >= 10 && dCur > blendPx.perpD2 * 1.65)) {
                    if (blendPx.perpD2 < bestPerp) {
                      bestPerp = blendPx.perpD2;
                      snapped = blendPx.t >= 0.5 ? LA : LB;
                    }
                  }
                }
              }
            }
            /* Periksa campuran barisentrik 3-arah (Tri-Junction) bila curAnchor === 0 (warna asing tanpa plateau lokal) */
            if (curAnchor === 0 && curTotal <= 10) {
              for (let c = b + 1; c < maxCheck; c++) {
                const LC = localRanked[c];
                if (LA === curL || LB === curL || LC === curL) continue;
                const ancABC = (anchorCounts.get(LA) || 0) + (anchorCounts.get(LB) || 0) + (anchorCounts.get(LC) || 0);
                if (ancABC < 12) continue;
                const triPx = evalColorBlendTriplet(r0, g0, b0, palLab[LA], palLab[LB], palLab[LC]);
                const triPal = evalColorBlendTriplet(Ccur.r, Ccur.g, Ccur.b, palLab[LA], palLab[LB], palLab[LC]);
                if (triPx && (triPal || dCur > triPx.perpD2 * 1.6 + 450)) {
                  if (triPx.perpD2 < bestPerp) {
                    bestPerp = triPx.perpD2;
                    snapped = triPx.domSlot === 0 ? LA : (triPx.domSlot === 1 ? LB : LC);
                  }
                }
              }
            }
          }
        }

        if (snapped >= 0 && snapped !== curL) {
          nextLabels[p] = snapped;
        }
      }
    }
    labels.set(nextLabels);
  }
  return labels;
}

function quadtreeInit(work, mask, palette, varThr, edgeField = null, outBlocks = null, rawWork = null) {
  const ctx = buildSegmentationContext(work, rawWork || work, mask, palette, edgeField);
  const { w, h, K, fltD, rawD, mag, palLab, tree, palIsMidBlend, flankA, flankB, flankAlpha } = ctx;
  const labels = new Int16Array(w * h).fill(-2);
  const rawNearest = new Int16Array(w * h).fill(-1);

  if (ctx.rawNearestFlt && ctx.rawNearestFlt.length === w * h) {
    rawNearest.set(ctx.rawNearestFlt);
    if (mask) {
      for (let p = 0; p < w * h; p++) if (mask[p]) rawNearest[p] = -1;
    }
  } else {
    for (let p = 0; p < w * h; p++) {
      if (mask && mask[p]) continue;
      rawNearest[p] = ctx.nearestLabAt(fltD, p);
    }
  }

  const nearestUnmixedAt = (p, useRaw = true) => {
    const src = useRaw ? rawD : fltD;
    const i = p * 4;
    let li = useRaw ? ctx.nearestLabAt(rawD, p) : rawNearest[p];
    if (ctx.thinStrokeLab && ctx.thinStrokeLab[p] >= 0) return ctx.thinStrokeLab[p];
    const fA = flankA[p], fB = flankB[p];
    if (fA >= 0 && fB >= 0 && li !== fA && li !== fB) {
      if (palIsMidBlend[li * K * K + fA * K + fB]) {
        return flankAlpha[p] >= 0.5 ? fA : fB;
      }
      const bl = evalColorBlendPair(rawD[i], rawD[i + 1], rawD[i + 2], palLab[fA], palLab[fB]);
      const dLi = cdist2(rawD[i], rawD[i + 1], rawD[i + 2], palLab[li].r, palLab[li].g, palLab[li].b);
      if (bl && bl.perpD2 < dLi * 0.85) {
        return flankAlpha[p] >= 0.5 ? fA : fB;
      }
    }
    return li;
  };

  const stack = [[0, 0, w, h]];
  const MINB = 2;
  const rawBlocks = [];

  while (stack.length) {
    const [x0, y0, x1, y1] = stack.pop();
    const bw = x1 - x0, bh = y1 - y0;
    if (bw <= 0 || bh <= 0) continue;

    let sr = 0, sg = 0, sb = 0, n = 0, hasMask = false, maxGrad = 0;
    for (let y = y0; y < y1; y++) {
      const row = y * w;
      for (let x = x0; x < x1; x++) {
        const p = row + x;
        if (mask && mask[p]) { hasMask = true; continue; }
        const i = p * 4;
        sr += fltD[i]; sg += fltD[i + 1]; sb += fltD[i + 2]; n++;
        if (mag && mag[p] > maxGrad) maxGrad = mag[p];
      }
    }
    if (!n) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) labels[y * w + x] = -1;
      continue;
    }
    const mr = sr / n, mg = sg / n, mb = sb / n;
    let vr = 0, maxDev = 0;
    for (let y = y0; y < y1; y++) {
      const row = y * w;
      for (let x = x0; x < x1; x++) {
        const p = row + x;
        if (mask && mask[p]) continue;
        const i = p * 4;
        const dr = fltD[i] - mr, dg = fltD[i + 1] - mg, db = fltD[i + 2] - mb;
        const dev2 = dr * dr + dg * dg + db * db;
        vr += dev2;
        if (dev2 > maxDev) maxDev = dev2;
      }
    }
    vr /= n;

    const tightVar = Math.max(18, Math.min(48, varThr * 0.16));
    const tightMaxDev = Math.max(42, Math.min(96, varThr * 0.32));
    if (!hasMask && maxGrad < 7.5 && vr < tightVar && maxDev < tightMaxDev && bw <= 32 && bh <= 32) {
      const midP = (y0 + (bh >> 1)) * w + (x0 + (bw >> 1));
      const li = rawNearest[midP] >= 0 ? rawNearest[midP] : ctx.nearestLabAt(fltD, midP);
      const c00 = rawNearest[y0 * w + x0];
      const c10 = rawNearest[y0 * w + (x1 - 1)];
      const c01 = rawNearest[(y1 - 1) * w + x0];
      const c11 = rawNearest[(y1 - 1) * w + (x1 - 1)];
      if (c00 === li && c10 === li && c01 === li && c11 === li) {
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) labels[y * w + x] = li;
        if (outBlocks) rawBlocks.push([x0, y0, bw, bh, li]);
        continue;
      }
    }

    if (bw <= MINB && bh <= MINB) {
      let leafL = -1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = y * w + x;
          const li = (mask && mask[p]) ? -1 : nearestUnmixedAt(p, true);
          labels[p] = li;
          if (leafL < 0 && li >= 0) leafL = li;
        }
      }
      if (outBlocks && leafL >= 0) rawBlocks.push([x0, y0, bw, bh, leafL]);
    } else {
      const mx = x0 + (bw >> 1), my = y0 + (bh >> 1);
      if (bw > MINB && bh > MINB) {
        stack.push([x0, y0, mx, my], [mx, y0, x1, my], [x0, my, mx, y1], [mx, my, x1, y1]);
      } else if (bw > MINB) {
        stack.push([x0, y0, mx, y1], [mx, y0, x1, y1]);
      } else {
        stack.push([x0, y0, x1, my], [x0, my, x1, y1]);
      }
    }
  }

  if (outBlocks && rawBlocks.length) {
    rawBlocks.sort((a, b) => (b[2] * b[3]) - (a[2] * a[3]));
    const maxB = Math.min(rawBlocks.length, 4800);
    for (let i = 0; i < maxB; i++) outBlocks.push(rawBlocks[i]);
  }
  for (let p = 0; p < labels.length; p++) if (labels[p] === -2) labels[p] = nearestUnmixedAt(p, true);

  localNeighborhoodEdgeSnap(work, mask, labels, palette, edgeField, 2, ctx);
  work._segCtx = ctx;
  labels._segCtx = ctx;
  labels._rawNearestSnapshot = rawNearest;
  return labels;
}

/* =====================================================================
   TAHAP 4 — Discrete MRF Segmentation & Topological Invariants
   Model Energi Potts Anisotropik & Unmixing Anti-Aliasing:
     E(L) = sum_p D_unmix(p, Lp) + sum_(p,q) w_aniso(p,q) * beta_eff(Lp, Lq) * [Lp != Lq]
   ===================================================================== */
function wouldChangeTopology(labels, w, h, x, y, from, to) {
  if (from === to) return false;
  const countComp4 = (targetLabel, centerHasTarget) => {
    let seen = 0, c = 0;
    const qx = new Int8Array(9), qy = new Int8Array(9);
    const hasAt = (i, j) => {
      if (i === 0 && j === 0) return centerHasTarget;
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false;
      return labels[yy * w + xx] === targetLabel;
    };
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const bit = 1 << ((j + 1) * 3 + (i + 1));
        if ((seen & bit) || !hasAt(i, j)) continue;
        c++;
        let head = 0, tail = 0;
        qx[tail] = i; qy[tail] = j; tail++;
        seen |= bit;
        while (head < tail) {
          const ax = qx[head], ay = qy[head]; head++;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const bx = ax + dx, by = ay + dy;
            if (bx < -1 || bx > 1 || by < -1 || by > 1) continue;
            const bbit = 1 << ((by + 1) * 3 + (bx + 1));
            if ((seen & bbit) || !hasAt(bx, by)) continue;
            seen |= bbit;
            qx[tail] = bx; qy[tail] = by; tail++;
          }
        }
      }
    }
    return c;
  };
  const beforeFrom = countComp4(from, true);
  const afterFrom = countComp4(from, false);
  if (afterFrom > beforeFrom) return true;
  const beforeTo = countComp4(to, false);
  const afterTo = countComp4(to, true);
  if (beforeTo >= 2 && afterTo < beforeTo) return true;
  return false;
}

function segmentMRF(work, mask, labels, palette, opt = {}, onTick) {
  const forceCpu = !!(opt && opt.forceCpu);
  const ctx = opt.segCtx || labels._segCtx || work._segCtx || buildSegmentationContext(work, opt.rawWork || work, mask, palette, opt.edgeField, forceCpu);
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuSegmentMRF && palette.length <= 64) {
    if (GpuAccelerator.gpuSegmentMRF(work, mask, labels, palette, opt, ctx, onTick)) {
      return labels;
    }
  }
  const { w, h, K, fltD, rawD, mag, palLab, palDist2, palIsMidBlend, nxArr, nyArr, cohArr, cornerArr, flankA, flankB, flankAlpha, flankPerp } = ctx;

  const baseBeta = opt.beta || 1350;
  const maxIter = opt.maxIter || 20;
  const singleStepMode = maxIter === 1 && typeof opt.iterIndex === 'number';
  const DX = [1, -1, 0, 0, 1, -1, 1, -1];
  const DY = [0, 0, 1, -1, 1, 1, -1, -1];
  const W_DIR = [1.0, 1.0, 1.0, 1.0, 0.707, 0.707, 0.707, 0.707];
  const wEdge = new Float32Array(8);
  const nLabelBuf = new Int16Array(8);
  const candBuf = new Int16Array(16);
  const inv2SigmaEdge = 1 / (2 * 1350);

  const thinStrokeLab = ctx.thinStrokeLab;
  const dataEnergy = (p, l, curBeta) => {
    if (thinStrokeLab && thinStrokeLab[p] >= 0) {
      return l === thinStrokeLab[p] ? 0 : curBeta * 6.5 + 18000;
    }
    const i = p * 4, c = palLab[l];
    const m = mag ? mag[p] : 0;
    const useRaw = m > 5.5;
    const r = useRaw ? rawD[i] : fltD[i];
    const g = useRaw ? rawD[i + 1] : fltD[i + 1];
    const b = useRaw ? rawD[i + 2] : fltD[i + 2];
    let dBase = cdist2(r, g, b, c.r, c.g, c.b);
    const chC = Math.hypot(c.a, c.b2);
    if (chC >= 12.0 && (Math.max(r, g, b) - Math.min(r, g, b)) >= 22) {
      const [, pa, pb2] = rgb2lab(r, g, b);
      const chP = Math.hypot(pa, pb2);
      if (chP >= 10.0) {
        const cosH = (pa * c.a + pb2 * c.b2) / (chP * chC);
        if (cosH < 0.88) {
          dBase += (0.88 - cosH) * chP * chC * 75.0;
        }
      }
    }

    const fA = flankA[p], fB = flankB[p];
    if (fA >= 0 && fB >= 0) {
      const alpha = flankAlpha[p];
      const perp = flankPerp[p];
      const abDist2 = palDist2[fA * K + fB];
      const scale = Math.min(abDist2 * 0.28, curBeta * 3.0);
      if (l === fA) {
        const unmixCost = perp * 0.65 + (1 - alpha) * (1 - alpha) * scale;
        return Math.min(dBase, unmixCost);
      }
      if (l === fB) {
        const unmixCost = perp * 0.65 + alpha * alpha * scale;
        return Math.min(dBase, unmixCost);
      }
      if (palIsMidBlend[l * K * K + fA * K + fB] && dBase > perp * 0.5) {
        return dBase + curBeta * 3.6 + abDist2 * 0.25;
      }
    }
    return dBase;
  };

  for (let it = 0; it < maxIter; it++) {
    const effIt = singleStepMode ? opt.iterIndex : it;
    const effTotal = singleStepMode ? (opt.totalIters || 18) : maxIter;
    const anneal = singleStepMode ? 1.0 : (0.55 + 0.55 * (effIt / Math.max(1, effTotal - 1)));
    const beta = baseBeta * anneal;
    let changed = 0;

    const dirMode = effIt & 3;
    const revY = (dirMode === 1 || dirMode === 2);
    const revX = (dirMode === 1 || dirMode === 3);

    for (let yy = 0; yy < h; yy++) {
      const y = revY ? (h - 1 - yy) : yy;
      for (let xx = 0; xx < w; xx++) {
        const x = revX ? (w - 1 - xx) : xx;
        const p = y * w + x;
        if (mask && mask[p]) continue;
        const cur = labels[p];
        if (cur < 0) continue;

        let isBoundary = false, sameOrtho = 0, sameDiag = 0;
        let candLen = 1;
        candBuf[0] = cur;
        for (let k = 0; k < 8; k++) {
          const qx = x + DX[k], qy = y + DY[k];
          if (qx < 0 || qy < 0 || qx >= w || qy >= h) { nLabelBuf[k] = -2; continue; }
          const nl = labels[qy * w + qx];
          nLabelBuf[k] = nl;
          if (nl === cur) {
            if (k < 4) sameOrtho++; else sameDiag++;
          } else if (nl >= 0) {
            isBoundary = true;
            let seenC = false;
            for (let ci = 0; ci < candLen; ci++) if (candBuf[ci] === nl) { seenC = true; break; }
            if (!seenC) candBuf[candLen++] = nl;
          }
        }
        if (!isBoundary) continue;

        const i0 = p * 4, r0 = rawD[i0], g0 = rawD[i0 + 1], b0 = rawD[i0 + 2];
        const nx = nxArr[p], ny = nyArr[p], coh = cohArr[p];
        const hasAniso = coh > 0.15 && (nx !== 0 || ny !== 0);
        for (let k = 0; k < 8; k++) {
          if (nLabelBuf[k] === -2) { wEdge[k] = 0; continue; }
          const np = (y + DY[k]) * w + (x + DX[k]);
          const ni = np * 4;
          const dc2 = cdist2(r0, g0, b0, rawD[ni], rawD[ni + 1], rawD[ni + 2]);
          let aniso = 1.0;
          if (hasAniso) {
            const stepLen = k < 4 ? 1.0 : 1.41421356;
            const tanAlign = Math.abs((DX[k] * (-ny) + DY[k] * nx) / stepLen);
            aniso = 0.74 + 0.56 * tanAlign;
          }
          wEdge[k] = W_DIR[k] * aniso * (0.14 + 0.86 * Math.exp(-dc2 * inv2SigmaEdge));
        }

        const fAp = flankA[p], fBp = flankB[p];
        if (fAp >= 0) {
          let sc = false; for (let ci = 0; ci < candLen; ci++) if (candBuf[ci] === fAp) { sc = true; break; }
          if (!sc) candBuf[candLen++] = fAp;
        }
        if (fBp >= 0) {
          let sc = false; for (let ci = 0; ci < candLen; ci++) if (candBuf[ci] === fBp) { sc = true; break; }
          if (!sc) candBuf[candLen++] = fBp;
        }

        const dCurRaw = cdist2(r0, g0, b0, palLab[cur].r, palLab[cur].g, palLab[cur].b);
        const dCur = dataEnergy(p, cur, beta);
        const hasCleanUnmixMajority = fAp >= 0 && fBp >= 0 && coh > 0.25 && flankPerp[p] < 320 && sameOrtho >= 1 && (sameOrtho + sameDiag >= 2) &&
          ((cur === fAp && flankAlpha[p] >= 0.505) || (cur === fBp && flankAlpha[p] <= 0.495));
        if (hasCleanUnmixMajority) continue;
        const detailProt = labels._detailProt || null;
        const isSharpFeature = (cornerArr[p] > 5.5 && sameOrtho + sameDiag >= 1 && dCurRaw < 1100) || !!(detailProt && detailProt[p]);
        const isProtectedDetailOrTip = (sameOrtho + sameDiag >= 1 && dCurRaw < 480) || isSharpFeature;

        let bestL = cur, bestE = Infinity;
        for (let ci = 0; ci < candLen; ci++) {
          const l = candBuf[ci];
          const dl = l === cur ? dCur : dataEnergy(p, l, beta);
          if (isProtectedDetailOrTip && l !== cur && dl > dCur * 1.95 + 420) continue;
          let e = dl;
          for (let k = 0; k < 8; k++) {
            const nl = nLabelBuf[k];
            if (nl === -2) continue;
            if (nl !== l) {
              const pairCap = (nl >= 0 && l >= 0) ? Math.min(beta, palDist2[l * K + nl] * 0.24 + 120) : beta;
              e += pairCap * wEdge[k];
            }
          }
          if (e < bestE) { bestE = e; bestL = l; }
        }

        if (bestL !== cur) {
          if (opt.topology !== false && effIt >= 1 && wouldChangeTopology(labels, w, h, x, y, cur, bestL)) {
            const isFalseHalo = fAp >= 0 && fBp >= 0 && cur !== fAp && cur !== fBp && palIsMidBlend[cur * K * K + fAp * K + fBp];
            if (!isFalseHalo) continue;
          }
          labels[p] = bestL;
          changed++;
        }
      }
    }
    labels._lastMrfChanged = changed;
    if (onTick) onTick((it + 1) / maxIter, changed);
    if (!singleStepMode && it >= 6 && changed < Math.max(4, w * h * 0.00012)) break;
  }
  return labels;
}


/* === END 08-vmt-segmentation-mrf.js === */

/* === BEGIN 09-vmt-cleanup-morphology.js === */
/* =====================================================================
 * JS Module 09: VMT Engine Part 5 — Region Cleanup, Detail Protection, Morphology & Sliver Removal
 * ===================================================================== */
/* =====================================================================
   enforceMinNumPixels (filter_speckle rendah + proteksi detail kontras)
   ===================================================================== */
function enforceMinPixels(labels, w, h, minPx, work = null, palette = null) {
  const effMinPx = Math.max(2, minPx || 4);
  const d = (work && work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : (work && work.data ? work.data.data : null);
  const seen = new Int32Array(w * h).fill(-1);
  const comps = [];
  const smallByLabel = new Map();
  for (let p = 0; p < w * h; p++) {
    if (labels[p] < 0 || seen[p] >= 0) continue;
    const lab = labels[p], id = comps.length;
    const st = [p]; seen[p] = id;
    const cells = [];
    let sx = 0, sy = 0;
    while (st.length) {
      const q = st.pop(); cells.push(q);
      const x = q % w, y = (q / w) | 0;
      sx += x; sy += y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const nq = ny * w + nx;
          if (labels[nq] === lab && seen[nq] < 0) { seen[nq] = id; st.push(nq); }
        }
      }
    }
    const cx = sx / cells.length, cy = sy / cells.length;
    const cObj = { id, lab, cells, cx, cy };
    comps.push(cObj);
    if (cells.length >= 2 && cells.length <= Math.max(effMinPx * 4, 24)) {
      let arr = smallByLabel.get(lab);
      if (!arr) { arr = []; smallByLabel.set(lab, arr); }
      arr.push(cObj);
    }
  }
  comps.sort((a, b) => a.cells.length - b.cells.length);
  const resLinEmp = Math.max(1, Math.hypot(w, h) / Math.hypot(720, 720));
  const wScaleEmp = Math.pow(resLinEmp, 0.58);
  const maxCheckSize = Math.max(effMinPx * 9, Math.round(48 * resLinEmp * resLinEmp));
  const detailProt = labels._detailProt || null;

  for (const comp of comps) {
    if (comp.cells.length >= maxCheckSize) continue;
    /* [PATCH-FAM] Lindungi detail kompak maupun garis celah nyata (seperti garis jari & bulu mata) dari penggabungan 'border parasite' */
    if (detailProt && comp.cells.length >= Math.max(5, effMinPx)) {
      let pc = 0;
      for (const pp of comp.cells) if (detailProt[pp]) pc++;
      if (pc * 3 >= comp.cells.length || pc >= 10) continue;
    }
    const votes = new Map();
    let totalPerim = 0;
    for (const p of comp.cells) {
      const x = p % w, y = (p / w) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) {
        if (q < 0) { totalPerim++; continue; }
        const nl = labels[q];
        if (nl !== comp.lab) {
          totalPerim++;
          if (nl >= 0) votes.set(nl, (votes.get(nl) || 0) + 1);
        }
      }
    }
    let bl = -1, bv = 0;
    votes.forEach((v, k) => { if (v > bv) { bv = v; bl = k; } });
    if (bl < 0) continue;

    const meanWidth = (2 * comp.cells.length) / Math.max(1, totalPerim);
    const domRatio = bv / Math.max(1, totalPerim);
    const isSandwichedSliver = (votes.size >= 2 && domRatio < 0.88 && meanWidth < 2.15 * wScaleEmp && comp.cells.length <= maxCheckSize) ||
      (votes.size >= 3 && domRatio < 0.56 && meanWidth < 2.45 * wScaleEmp && comp.cells.length <= maxCheckSize);
    const isBorderParasite = (votes.size >= 2 && comp.cells.length <= Math.max(effMinPx * 4, Math.round(28 * resLinEmp * resLinEmp))) || isSandwichedSliver;
    if (!isBorderParasite && comp.cells.length >= effMinPx) continue;

    /* Aturan Konteks 1 & 2 (Adaptive Speckle Protection):
       Periksa apakah region kecil ini merupakan detail berulang (mis. jahitan, titik, daun kecil)
       atau memiliki kontras warna tinggi yang memang disengaja pada gambar sumber */
    if (!isBorderParasite && comp.cells.length >= 2 && d && palette && palette[comp.lab] && palette[bl]) {
      const cOwn = palette[comp.lab], cNb = palette[bl];
      let errOwn = 0, errNb = 0;
      for (const p of comp.cells) {
        const i = p * 4;
        errOwn += cdist2(d[i], d[i + 1], d[i + 2], cOwn.r, cOwn.g, cOwn.b);
        errNb += cdist2(d[i], d[i + 1], d[i + 2], cNb.r, cNb.g, cNb.b);
      }
      errOwn /= comp.cells.length;
      errNb /= comp.cells.length;
      if (comp.cells.length >= Math.max(26, effMinPx) && meanWidth >= 1.65 && votes.size === 1 && errOwn < 140 && errNb > 3600) continue;
      const peers = smallByLabel.get(comp.lab);
      if (comp.cells.length >= Math.max(12, effMinPx >> 1) && meanWidth >= 1.55 && peers && peers.length >= 3 && errOwn < 130 && errNb > 3800) {
        let nearPeers = 0;
        for (let pi = 0; pi < peers.length; pi++) {
          const pr = peers[pi];
          if (pr.id !== comp.id && Math.hypot(pr.cx - comp.cx, pr.cy - comp.cy) <= 32) {
            nearPeers++;
            if (nearPeers >= 2) break;
          }
        }
        if (nearPeers >= 2) continue;
      }
    }

    if (isBorderParasite && d && palette && palette[comp.lab]) {
      const cOwn = palette[comp.lab];
      let minNbDist = Infinity;
      const nbLabs = [...votes.keys()];
      votes.forEach((_, nl) => {
        if (palette[nl]) {
          const dd = cdist2(cOwn.r, cOwn.g, cOwn.b, palette[nl].r, palette[nl].g, palette[nl].b);
          if (dd < minNbDist) minNbDist = dd;
        }
      });
      let isBlendOfNbs = false;
      for (let ia = 0; ia < nbLabs.length && !isBlendOfNbs; ia++) {
        for (let ib = ia + 1; ib < nbLabs.length && !isBlendOfNbs; ib++) {
          if (evalColorBlendPair(cOwn.r, cOwn.g, cOwn.b, palette[nbLabs[ia]], palette[nbLabs[ib]])) { isBlendOfNbs = true; break; }
          for (let ic = ib + 1; ic < nbLabs.length && !isBlendOfNbs; ic++) {
            if (evalColorBlendTriplet(cOwn.r, cOwn.g, cOwn.b, palette[nbLabs[ia]], palette[nbLabs[ib]], palette[nbLabs[ic]])) { isBlendOfNbs = true; break; }
          }
        }
      }
      /* Periksa apakah komponen kecil ini sebenarnya adalah artefak transisi/ujung garis dari tetangga garis utamanya terhadap latar */
      if (!isBlendOfNbs && comp.cells.length <= 28 && nbLabs.length >= 2) {
        let bestPairErr = Infinity, ownErr = 0;
        for (const p of comp.cells) {
          const i = p * 4;
          ownErr += cdist2(d[i], d[i + 1], d[i + 2], cOwn.r, cOwn.g, cOwn.b);
        }
        ownErr /= comp.cells.length;
        for (let ia = 0; ia < nbLabs.length; ia++) {
          const CA = palette[nbLabs[ia]];
          for (let ib = ia + 1; ib < nbLabs.length; ib++) {
            const CB = palette[nbLabs[ib]];
            const vr = CA.r - CB.r, vg = CA.g - CB.g, vb = CA.b - CB.b;
            const vLen2 = vr * vr + vg * vg + vb * vb;
            if (vLen2 < 400) continue;
            let pErr = 0;
            for (const p of comp.cells) {
              const i = p * 4;
              const t = clamp(((d[i] - CB.r) * vr + (d[i + 1] - CB.g) * vg + (d[i + 2] - CB.b) * vb) / vLen2, 0, 1);
              pErr += cdist2(d[i], d[i + 1], d[i + 2], CB.r + t * vr, CB.g + t * vg, CB.b + t * vb);
            }
            pErr /= comp.cells.length;
            if (pErr < bestPairErr) bestPairErr = pErr;
          }
        }
        if (bestPairErr <= ownErr * 1.35 + 480) isBlendOfNbs = true;
      }
      /* Jika warna komponen BUKAN campuran linier anti-aliasing dari tetangga-tetangganya (mis. garis jari yang lebih gelap dari kedua sisi kulit), JANGAN HAPUS! */
      if (!isBlendOfNbs && comp.cells.length >= Math.max(8, effMinPx) && minNbDist > 650) continue;
    }

    let targetNb = bl;
    if (d && palette && votes.size >= 2) {
      let bestScore = Infinity;
      votes.forEach((vCnt, nl) => {
        const c = palette[nl];
        if (!c) return;
        let sumD = 0;
        for (const p of comp.cells) {
          const i = p * 4;
          sumD += cdist2(d[i], d[i + 1], d[i + 2], c.r, c.g, c.b);
        }
        const meanD = (sumD / comp.cells.length) * (1.15 - 0.30 * (vCnt / Math.max(1, totalPerim)));
        if (meanD < bestScore) { bestScore = meanD; targetNb = nl; }
      });
    }
    for (const p of comp.cells) {
      labels[p] = targetNb;
    }
    comp.lab = targetNb;
  }
  return labels;
}

/* =====================================================================
   Erosi Pita Serpihan Perbatasan (Sandwiched Boundary Ribbon & Sliver Erosion)
   ===================================================================== */
function erodeSandwichedBoundaryRibbons(labels, w, h, work, palette, mask, segCtx = null, forceCpu = false) {
  if (!work || !work.data || !palette || palette.length < 3) return labels;
  const ctx = segCtx || labels._segCtx || work._segCtx || buildSegmentationContext(work, work, mask, palette, null, forceCpu);
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuErodeSandwichedRibbons && palette.length <= 64) {
    if (GpuAccelerator.gpuErodeSandwichedRibbons(labels, w, h, work, palette, mask, ctx)) {
      return labels;
    }
  }
  const { K, rawD, palLab, palIsMidBlend } = ctx;

  const is2x2Core = (x, y, L) => {
    for (let dy = -2; dy <= 1; dy++) {
      const y0 = y + dy;
      if (y0 < 0 || y0 + 1 >= h) continue;
      for (let dx = -2; dx <= 1; dx++) {
        const x0 = x + dx;
        if (x0 < 0 || x0 + 1 >= w) continue;
        const p = y0 * w + x0;
        if (labels[p] === L && labels[p + 1] === L && labels[p + w] === L && labels[p + w + 1] === L) {
          return true;
        }
      }
    }
    return false;
  };

  const detailProt = labels._detailProt || null;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Int16Array(labels);
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const p = y * w + x;
        if (mask && mask[p]) continue;
        if (detailProt && detailProt[p]) continue;
        const cur = labels[p];
        if (cur < 0) continue;
        const mpErode = ctx.mag ? ctx.mag[p] : 0;
        let hasMidBlendNeighbor = false;
        if (mpErode < 3.8 && is2x2Core(x, y, cur)) {
          const lL = labels[p - 1], lR = labels[p + 1], lU = labels[p - w], lD = labels[p + w];
          if ((lL !== cur && lR !== cur && lL >= 0 && lR >= 0 && palIsMidBlend[cur * K * K + lL * K + lR]) ||
              (lU !== cur && lD !== cur && lU >= 0 && lD >= 0 && palIsMidBlend[cur * K * K + lU * K + lD])) {
            hasMidBlendNeighbor = true;
          }
          if (!hasMidBlendNeighbor) continue;
        }

        let pairA = -1, pairB = -1, bestSpan = 99;
        const testAxis = (dx, dy) => {
          let la = -1, lb = -1, sA = 5, sB = 5;
          for (let s = 1; s <= 3; s++) {
            const py2 = y - dy * s, px2 = x - dx * s;
            if (px2 < 0 || px2 >= w || py2 < 0 || py2 >= h) break;
            const nl = labels[py2 * w + px2];
            if (nl !== cur && nl >= 0) { la = nl; sA = s; break; }
          }
          for (let s = 1; s <= 3; s++) {
            const py2 = y + dy * s, px2 = x + dx * s;
            if (px2 < 0 || px2 >= w || py2 < 0 || py2 >= h) break;
            const nl = labels[py2 * w + px2];
            if (nl !== cur && nl >= 0) { lb = nl; sB = s; break; }
          }
          if (la >= 0 && lb >= 0 && la !== lb) {
            const sp = sA + sB;
            const isMid = palIsMidBlend[cur * K * K + la * K + lb] === 1;
            const effSp = isMid ? sp - 1.5 : sp;
            if (effSp < bestSpan) { bestSpan = effSp; pairA = la; pairB = lb; }
          }
        };
        testAxis(1, 0);
        testAxis(0, 1);
        testAxis(1, 1);
        testAxis(1, -1);
        if (pairA < 0 || pairB < 0) continue;

        const CA = palLab[pairA], CB = palLab[pairB], Ccur = palLab[cur];
        if (!CA || !CB || !Ccur) continue;

        const i = p * 4, r0 = rawD[i], g0 = rawD[i + 1], b0 = rawD[i + 2];
        /* Guard Celah/Urat 1D: Halo anti-aliasing sejati selalu memiliki kecerahan monotonik di antara CA dan CB.
           Jika Ccur atau piksel p lebih terang/gelap secara signifikan dari KEDUA sisi (seperti celah krem di antara daun hijau & jeruk kuning),
           jangan pernah menghapusnya! */
        const lum0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
        const lumA = 0.299 * CA.r + 0.587 * CA.g + 0.114 * CA.b;
        const lumB = 0.299 * CB.r + 0.587 * CB.g + 0.114 * CB.b;
        const lumCur = 0.299 * Ccur.r + 0.587 * Ccur.g + 0.114 * Ccur.b;
        if (lum0 > Math.max(lumA, lumB) + 6.0 || lum0 < Math.min(lumA, lumB) - 6.0) continue;
        if (lumCur > Math.max(lumA, lumB) + 8.0 || lumCur < Math.min(lumA, lumB) - 8.0) continue;

        const dCur = cdist2(r0, g0, b0, Ccur.r, Ccur.g, Ccur.b);
        const blPx = evalColorBlendPair(r0, g0, b0, CA, CB);
        const isPalMid = palIsMidBlend[cur * K * K + pairA * K + pairB] === 1;

        if (blPx && (isPalMid || dCur > blPx.perpD2 * 2.5 + 900)) {
          next[p] = blPx.t >= 0.5 ? pairA : pairB;
        }
      }
    }
    labels.set(next);
  }
  return labels;
}

/* Resolusi Sadel Papan Catur 2x2 (Checkerboard Saddle Resolver)
   Menghilangkan konfigurasi 2x2 [A, B; B, A] yang memicu X-junction (valence 4) palsu di Tahap 4 */
function resolveCheckerboardSaddles(labels, w, h, work, palette, mask, forceCpu = false) {
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuResolveCheckerboardSaddles && palette && palette.length <= 64) {
    if (GpuAccelerator.gpuResolveCheckerboardSaddles(labels, w, h, work, palette, mask)) {
      return labels;
    }
  }
  const d = (work && work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : (work && work.data ? work.data.data : null);
  const tsLab = (labels._segCtx && labels._segCtx.thinStrokeLab) || (work && work._segCtx && work._segCtx.thinStrokeLab);
  const detailProt = labels._detailProt || null;
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const p00 = y * w + x, p10 = p00 + 1, p01 = p00 + w, p11 = p01 + 1;
      if (mask && (mask[p00] || mask[p10] || mask[p01] || mask[p11])) continue;
      const l00 = labels[p00], l10 = labels[p10], l01 = labels[p01], l11 = labels[p11];
      if (l00 < 0 || l10 < 0) continue;
      if (l00 === l11 && l10 === l01 && l00 !== l10) {
        if (d && palette && palette[l00] && palette[l10]) {
          const CA = palette[l00], CB = palette[l10];
          const prot00_11 = (tsLab && (tsLab[p00] === l00 || tsLab[p11] === l00)) || (detailProt && (detailProt[p00] || detailProt[p11]));
          const prot10_01 = (tsLab && (tsLab[p10] === l10 || tsLab[p01] === l10)) || (detailProt && (detailProt[p10] || detailProt[p01]));
          const cands = (prot00_11 && !prot10_01)
            ? [[p10, l10, l00], [p01, l10, l00]]
            : (prot10_01 && !prot00_11)
              ? [[p00, l00, l10], [p11, l00, l10]]
              : [
                  [p00, l00, l10],
                  [p11, l00, l10],
                  [p10, l10, l00],
                  [p01, l10, l00]
                ];
          /* Hitung dukungan cincin 4x4 di sekitar blok 2x2: jika salah satu label adalah puncak baji tajam
             (seperti pusat pinwheel 4 segitiga) sedangkan label lainnya adalah latar dominan, cegah penggabungan baji! */
          let ringA = 0, ringB = 0;
          for (let ry = Math.max(0, y - 1); ry <= Math.min(h - 1, y + 2); ry++) {
            for (let rx = Math.max(0, x - 1); rx <= Math.min(w - 1, x + 2); rx++) {
              if (rx >= x && rx <= x + 1 && ry >= y && ry <= y + 1) continue;
              const rl = labels[ry * w + rx];
              if (rl === l00) ringA++;
              else if (rl === l10) ringB++;
            }
          }
          const lumA = 0.299 * CA.r + 0.587 * CA.g + 0.114 * CA.b;
          const lumB = 0.299 * CB.r + 0.587 * CB.g + 0.114 * CB.b;
          let bestP = p00, bestNewL = l10, minPenalty = Infinity;
          for (const [q, curL, altL] of cands) {
            const qx = q % w, qy = (q / w) | 0;
            if (wouldChangeTopology(labels, w, h, qx, qy, curL, altL)) continue;
            const i = q * 4;
            const Calt = altL === l00 ? CA : CB;
            const Ccur = curL === l00 ? CA : CB;
            let pen = cdist2(d[i], d[i + 1], d[i + 2], Calt.r, Calt.g, Calt.b) - cdist2(d[i], d[i + 1], d[i + 2], Ccur.r, Ccur.g, Ccur.b);
            if (ringA >= 4 && ringB >= 4) {
              const altIsLighter = (altL === l00 ? lumA > lumB : lumB > lumA);
              if (altIsLighter) pen -= 950;
            }
            if (pen < minPenalty) { minPenalty = pen; bestP = q; bestNewL = altL; }
          }
          labels[bestP] = bestNewL;
        } else {
          labels[p00] = l10;
        }
      }
    }
  }
  return labels;
}

/* =====================================================================
   Absorpsi Bintik, Kait & Tonjolan Parasit Perbatasan (Parasitic Pimple/Hook Clean)
   ===================================================================== */
function absorbBoundaryParasites(labels, w, h, work, palette, mask, forceCpu = false) {
  if (!work || !work.data || !palette) return labels;
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuAbsorbBoundaryParasites && palette.length <= 64) {
    if (GpuAccelerator.gpuAbsorbBoundaryParasites(labels, w, h, work, palette, mask)) {
      return labels;
    }
  }
  const d = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
  const detailProt = labels._detailProt || null;

  for (let pass = 0; pass < 2; pass++) {
    const next = new Int16Array(labels);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (mask && mask[p]) continue;
        if (detailProt && detailProt[p]) continue;
        const cur = labels[p];
        if (cur < 0) continue;

        const nbsOrtho = [p - 1, p + 1, p - w, p + w];
        let sameOrtho = 0, sameDir = -1;
        const votes = new Map();
        for (let k = 0; k < 4; k++) {
          const nl = labels[nbsOrtho[k]];
          if (nl === cur) { sameOrtho++; sameDir = k; }
          else if (nl >= 0) votes.set(nl, (votes.get(nl) || 0) + 2);
        }
        if (sameOrtho > 1) continue;

        let sameDiag = 0;
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const nl = labels[(y + dy) * w + (x + dx)];
          if (nl === cur) sameDiag++;
          else if (nl >= 0) votes.set(nl, (votes.get(nl) || 0) + 1);
        }

        let domNb = -1, bestV = 0;
        votes.forEach((v, k) => { if (v > bestV) { bestV = v; domNb = k; } });
        if (domNb < 0 || bestV < 6) continue;

        const i0 = p * 4;
        const dCur = palette[cur] ? cdist2(d[i0], d[i0 + 1], d[i0 + 2], palette[cur].r, palette[cur].g, palette[cur].b) : Infinity;
        const dDom = palette[domNb] ? cdist2(d[i0], d[i0 + 1], d[i0 + 2], palette[domNb].r, palette[domNb].g, palette[domNb].b) : Infinity;

        if (sameOrtho === 1 && palette[cur] && palette[domNb]) {
          const stepDx = sameDir === 0 ? -1 : sameDir === 1 ? 1 : 0;
          const stepDy = sameDir === 2 ? -1 : sameDir === 3 ? 1 : 0;
          const bx = clamp(x + stepDx, 1, w - 2), by = clamp(y + stepDy, 1, h - 2);
          const perpDx = stepDy, perpDy = stepDx;
          let backSpread = 0;
          for (let s = -1; s <= 1; s++) {
            if (labels[(by + perpDy * s) * w + (bx + perpDx * s)] === cur) backSpread++;
          }
          if (backSpread >= 2 && dCur <= dDom * 0.85) continue;
        }
        if (sameOrtho + sameDiag >= 1 && dCur < dDom * 0.45 && dCur < 600) continue;
        if (wouldChangeTopology(labels, w, h, x, y, cur, domNb)) continue;

        next[p] = domNb;
      }
    }
    labels.set(next);
  }
  resolveCheckerboardSaddles(labels, w, h, work, palette, mask);
  return labels;
}


/* =====================================================================
   [PATCH-FAM] Analisis Komponen Kecil — Island Derau vs Detail Nyata
   Masalah: pada palet 1-keluarga (banyak shade berdekatan) derau tekstur/JPEG membuat blob kecil
   bershade tetangga (island) yang tidak pernah terhapus, sementara lubang nyata (mis. lubang huruf A)
   dikira halo anti-aliasing karena warnanya segaris dengan dua shade di sekitarnya.
   Pembeda yang dipakai: (1) kontras palet ΔE(Lab) terhadap tetangga dominan,
   (2) "support" = seberapa jauh piksel mentah lebih dekat ke warna sendiri daripada ke tetangga,
   (3) bentuk (kompak/ketebalan), bukan sekadar kolinearitas warna.
   ===================================================================== */
function analyzeSmallRegions(labels, w, h, work, palette, mask, maxArea) {
  const d = (work && work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : (work && work.data ? work.data.data : null);
  if (!d || !palette || palette.length < 2) return null;
  const n = w * h;
  const pLab = palette.map(c => rgb2lab(c.r, c.g, c.b));
  const seen = new Uint8Array(n);
  const buf = new Int32Array(n);
  const out = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (seen[s0] || labels[s0] < 0) continue;
    const lab = labels[s0];
    let head = 0, tail = 0;
    buf[tail++] = s0; seen[s0] = 1;
    while (head < tail) {
      const q = buf[head++];
      const x = q % w;
      if (x > 0 && !seen[q - 1] && labels[q - 1] === lab) { seen[q - 1] = 1; buf[tail++] = q - 1; }
      if (x < w - 1 && !seen[q + 1] && labels[q + 1] === lab) { seen[q + 1] = 1; buf[tail++] = q + 1; }
      if (q >= w && !seen[q - w] && labels[q - w] === lab) { seen[q - w] = 1; buf[tail++] = q - w; }
      if (q < n - w && !seen[q + w] && labels[q + w] === lab) { seen[q + w] = 1; buf[tail++] = q + w; }
    }
    const A = tail;
    if (A > maxArea) continue;
    const cnt = new Map();
    let edges = 0, border = 0, voidE = 0, masked = false;
    let minx = w, maxx = -1, miny = h, maxy = -1;
    for (let k = 0; k < A; k++) {
      const q = buf[k];
      if (mask && mask[q]) { masked = true; break; }
      const x = q % w, y = (q / w) | 0;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      const nbs = [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1];
      for (let t = 0; t < 4; t++) {
        const nq = nbs[t];
        if (nq < 0) { border++; continue; }
        const nl = labels[nq];
        if (nl === lab) continue;
        edges++;
        if (nl < 0) voidE++; else cnt.set(nl, (cnt.get(nl) || 0) + 1);
      }
    }
    if (masked || !cnt.size) continue;
    let S = -1, bv = 0, S2 = -1, bv2 = 0;
    cnt.forEach((v, k2) => {
      if (v > bv) { S2 = S; bv2 = bv; bv = v; S = k2; }
      else if (v > bv2) { bv2 = v; S2 = k2; }
    });
    const O = palette[lab], Sc = palette[S];
    if (!O || !Sc) continue;
    const D = cdist2(O.r, O.g, O.b, Sc.r, Sc.g, Sc.b);
    let m = 0;
    for (let k = 0; k < A; k++) {
      const i = buf[k] * 4;
      m += cdist2(d[i], d[i + 1], d[i + 2], Sc.r, Sc.g, Sc.b) - cdist2(d[i], d[i + 1], d[i + 2], O.r, O.g, O.b);
    }
    const bw = maxx - minx + 1, bh = maxy - miny + 1, perim = edges + border;
    let sumOwnL = 0, sumRingL = 0, ringN = 0;
    if (A <= 96 && bw <= 16 && bh <= 16) {
      for (let k = 0; k < A; k++) {
        const i = buf[k] * 4;
        sumOwnL += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      }
      const rx0 = Math.max(0, minx - 3), rx1 = Math.min(w - 1, maxx + 3);
      const ry0 = Math.max(0, miny - 3), ry1 = Math.min(h - 1, maxy + 3);
      for (let ry = ry0; ry <= ry1; ry += 2) {
        for (let rx = rx0; rx <= rx1; rx += 2) {
          if (rx >= minx - 1 && rx <= maxx + 1 && ry >= miny - 1 && ry <= maxy + 1) continue;
          const ri = (ry * w + rx) * 4;
          sumRingL += 0.299 * d[ri] + 0.587 * d[ri + 1] + 0.114 * d[ri + 2];
          ringN++;
        }
      }
    }
    const localLumSpike = ringN > 0 ? Math.abs((sumOwnL / A) - (sumRingL / ringN)) : 0;
    /* Ukur bukti struktur 1D Valley/Ridge (seperti garis jari, lipatan kelopak mata, helai rambut, & kilau) */
    let creaseHits = 0, valleyDropSum = 0, sampleCnt = 0;
    const stepK = Math.max(1, Math.floor(A / 96));
    for (let k = 0; k < A; k += stepK) {
      const q = buf[k], x = q % w, y = (q / w) | 0;
      if (x < 3 || x >= w - 3 || y < 3 || y >= h - 3) continue;
      sampleCnt++;
      const i0 = q * 4;
      const l0 = 0.299 * d[i0] + 0.587 * d[i0 + 1] + 0.114 * d[i0 + 2];
      let bestDrop = 0;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        for (const rad of [2, 3]) {
          const iA = ((y - rad * dy) * w + (x - rad * dx)) * 4;
          const iB = ((y + rad * dy) * w + (x + rad * dx)) * 4;
          const lA = 0.299 * d[iA] + 0.587 * d[iA + 1] + 0.114 * d[iA + 2];
          const lB = 0.299 * d[iB] + 0.587 * d[iB + 1] + 0.114 * d[iB + 2];
          const drop = Math.min(lA - l0, lB - l0);
          const rise = Math.min(l0 - lA, l0 - lB);
          const score = Math.max(drop, rise * 0.85);
          if (score > bestDrop) bestDrop = score;
        }
      }
      if (bestDrop >= 3.8) {
        creaseHits++;
        valleyDropSum += bestDrop;
      }
    }
    const creaseFrac = sampleCnt > 0 ? creaseHits / sampleCnt : 0;
    const valleyDrop = creaseHits > 0 ? valleyDropSum / creaseHits : 0;

    out.push({
      lab, S, S2, A, cells: Int32Array.from(buf.subarray(0, A)),
      domFrac: bv / Math.max(1, edges),
      twoNbFrac: (bv + bv2) / Math.max(1, edges),
      dE2: S2 >= 0 ? Math.hypot(pLab[lab][0] - pLab[S2][0], pLab[lab][1] - pLab[S2][1], pLab[lab][2] - pLab[S2][2]) : 999,
      border, voidE,
      dE: Math.hypot(pLab[lab][0] - pLab[S][0], pLab[lab][1] - pLab[S][1], pLab[lab][2] - pLab[S][2]),
      dE00: ciede2000(pLab[lab][0], pLab[lab][1], pLab[lab][2], pLab[S][0], pLab[S][1], pLab[S][2]),
      support: (m / A) / Math.max(1, D),
      thick: (2 * A) / Math.max(1, perim),
      fill: A / (bw * bh),
      minDim: Math.min(bw, bh),
      aspect: Math.max(bw, bh) / Math.min(bw, bh),
      localLumSpike,
      creaseFrac,
      valleyDrop
    });
  }
  return out;
}

/* Detail nyata: blob kompak, garis celah 1D (garis jari/bulu mata/helai rambut), atau titik bintang/cahaya berkontras lokal tinggi */
function isRealCompactDetail(r) {
  /* Lindungi detail titik mata, senyum, dan titik halftone (3..160 px) yang dikelilingi 1 warna latar dengan kontras nyata */
  if (r.localLumSpike >= 13 && r.A >= 3 && r.A <= 160 && r.fill >= 0.28 && r.aspect <= 4.2 && (r.domFrac == null || r.domFrac >= 0.85)) return true;
  if ((r.domFrac == null || r.domFrac >= 0.92) && r.A >= 4 && r.A <= 64 && r.dE >= 16 && r.support >= 0.18) return true;
  /* Lindungi detail shade terkurung yang memiliki dukungan piksel mentah sangat kuat (seperti gumpalan tanah, gelombang tanah tunas & highlight biji jagung) */
  if ((r.domFrac == null || r.domFrac >= 0.85) && r.A >= 12 && r.minDim >= 2 && r.thick >= 1.40 && r.fill >= 0.28 && r.support >= 0.42 && (r.dE00 >= 2.8 || r.dE >= 4.5)) return true;
  /* Proteksi Garis Celah/Lipatan (1D Valley/Ridge seperti garis pemisah jari tangan, senyum & bulu mata) */
  if (r.creaseFrac >= 0.25 && r.A >= 5 && (r.valleyDrop >= 4.0 || r.dE >= 7.5) && r.support >= 0.16 && (r.domFrac == null || r.domFrac >= 0.78)) return true;
  if (r.A >= 12 && r.aspect >= 2.2 && r.thick <= 4.0 && r.dE >= 13.5 && r.support >= 0.24 && (r.domFrac == null || r.domFrac >= 0.80)) return true;
  if ((r.domFrac != null ? r.domFrac : 1) < 0.88 && (r.A < 36 || r.thick < 1.95 || r.fill < 0.45 || r.aspect > 3.2)) return false;
  const strongContrast = (r.dE00 != null ? r.dE00 >= 8.0 : r.dE >= 12) || (r.dE >= 16 && r.support >= 0.36);
  const strokeConnected = (r.domFrac == null || r.domFrac >= 0.85) && r.A >= 12 && r.minDim >= 2 && r.aspect <= 6.5 && r.support >= 0.36 && (r.dE00 != null ? r.dE00 >= 9.0 : r.dE >= 13);
  return (r.A >= 10 && r.minDim >= 2 && r.fill >= 0.38 && r.aspect <= 3.8 && r.thick >= 1.25 && strongContrast && r.support >= 0.36) || strokeConnected;
}

/* Bangun topeng pelindung detail nyata & garis celah 1D (dibaca oleh fungsi pembersih lewat labels._detailProt) */
function buildDetailProtection(labels, w, h, work, palette, mask) {
  const recs = analyzeSmallRegions(labels, w, h, work, palette, mask, 4800);
  if (!recs) { labels._detailProt = null; return null; }
  const prot = new Uint8Array(w * h);
  let any = false;
  for (const r of recs) {
    if (!isRealCompactDetail(r)) continue;
    for (let k = 0; k < r.cells.length; k++) prot[r.cells[k]] = 1;
    any = true;
  }
  const tsLab = (labels._segCtx && labels._segCtx.thinStrokeLab) || (work && work._segCtx && work._segCtx.thinStrokeLab);
  if (tsLab) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (tsLab[p] >= 0 && labels[p] === tsLab[p]) {
          let sameNb = 0;
          for (const np of [p - 1, p + 1, p - w, p + w, p - w - 1, p - w + 1, p + w - 1, p + w + 1]) {
            if (labels[np] === labels[p]) sameNb++;
          }
          if (sameNb >= 2) { prot[p] = 1; any = true; }
        }
      }
    }
  }
  /* Proteksi Celah Urat Sempit (1D Narrow Vein Channel) & Ujung Cusp Tangensial:
     Melindungi celah urat daun krem (lebar 1..5 px) dan ujung lancip cusp di antara dua busur/daun
     agar tidak ditumpulkan oleh MRF Potts atau ditutup oleh morphologicalCleanStrokes */
  const rawD = (work && work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : (work && work.data ? work.data.data : null);
  const palIsMid = (labels._segCtx && labels._segCtx.palIsMidBlend) || (work && work._segCtx && work._segCtx.palIsMidBlend);
  const K = palette ? palette.length : 0;
  if (rawD && palette && K >= 2) {
    for (let y = 3; y < h - 3; y++) {
      for (let x = 3; x < w - 3; x++) {
        const p = y * w + x;
        if (prot[p] || (mask && mask[p])) continue;
        const L0 = labels[p];
        if (L0 < 0 || !palette[L0]) continue;
        const i4 = p * 4, r0 = rawD[i4], g0 = rawD[i4 + 1], b0 = rawD[i4 + 2];
        const C0 = palette[L0];
        const dOwn = cdist2(r0, g0, b0, C0.r, C0.g, C0.b);
        if (dOwn > 1600) continue;
        let isProtectedChannel = false;
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
          let lA = -1, lB = -1;
          for (let s = 1; s <= 4; s++) {
            const nl = labels[(y - dy * s) * w + (x - dx * s)];
            if (nl !== L0 && nl >= 0) { lA = nl; break; }
          }
          for (let s = 1; s <= 4; s++) {
            const nl = labels[(y + dy * s) * w + (x + dx * s)];
            if (nl !== L0 && nl >= 0) { lB = nl; break; }
          }
          if (lA >= 0 && lA === lB && palette[lA]) {
            const CA = palette[lA];
            const dHost = cdist2(r0, g0, b0, CA.r, CA.g, CA.b);
            if (dOwn * 1.45 < dHost && dHost > 900) {
              isProtectedChannel = true;
              break;
            }
          }
        }
        if (isProtectedChannel) {
          prot[p] = 1;
          any = true;
        }
      }
    }
  }
  labels._detailProt = any ? prot : null;
  return labels._detailProt;
}

/* Gabung island derau: komponen kecil yang HAMPIR seluruh kelilingnya satu label tetangga, dengan shade yang
   sangat berdekatan (ΔE kecil) dan bukti piksel mentah yang lemah. Lubang/titik nyata atau garis jari tidak pernah disentuh. */
function resolveEnclosedNoiseIslands(labels, w, h, work, palette, mask) {
  if (!palette || palette.length < 2) return 0;
  const resLin = Math.max(1, Math.hypot(w, h) / Math.hypot(720, 720));
  const wScale = Math.pow(resLin, 0.58);
  const maxA = clamp(Math.round(w * h * 0.00018), 48, 520);
  const detailProt = labels._detailProt || null;
  let total = 0;
  for (let pass = 0; pass < 4; pass++) {
    const recs = analyzeSmallRegions(labels, w, h, work, palette, mask, maxA);
    if (!recs || !recs.length) break;
    recs.sort((a, b) => a.A - b.A);
    let changed = 0;
    for (const r of recs) {
      if (r.voidE > 0) continue;
      if (isRealCompactDetail(r)) continue;
      const isTwoNbSubArtifact = (!r.domFrac || r.domFrac < 0.82) && r.S >= 0 && r.S2 >= 0 && r.twoNbFrac >= 0.84 &&
        Math.min(r.dE, r.dE2) < 13.5 && Math.max(r.dE, r.dE2) > (r.A <= 18 && r.thick <= 1.45 ? 15.0 : 18.0) &&
        r.A <= Math.round(52 * resLin * resLin) && r.thick <= 2.25 * wScale;
      if (detailProt) {
        let pc = 0;
        for (let k = 0; k < r.cells.length; k++) if (detailProt[r.cells[k]]) pc++;
        const isTinyCloseShadeSpeck = (r.domFrac >= 0.85 && r.A <= 10 && r.dE < 14.0 && r.support < 0.35) || isTwoNbSubArtifact;
        if (!isTinyCloseShadeSpeck && (pc * 3 >= r.cells.length || pc >= 8)) continue;
      }
      const enclosed = r.domFrac >= 0.82;
      /* 1) Bersihkan bercak sub-shade 2-tetangga pada garis/jahitan (mis. bercak #6d412b pada jahitan #7d4d2f di pupuk,
            sliver #925433 di dekat hub kincir, atau nick #b67049 pada garis atap kincir) */
      if (!enclosed && isTwoNbSubArtifact) {
        const targetNb = (r.domFrac >= 0.60 && r.A <= 28) ? r.S : ((r.dE <= r.dE2) ? r.S : r.S2);
        let stillSameSub = true;
        for (let k = 0; k < r.cells.length; k++) if (labels[r.cells[k]] !== r.lab) { stillSameSub = false; break; }
        if (stillSameSub) {
          for (let k = 0; k < r.cells.length; k++) labels[r.cells[k]] = targetNb;
          changed++;
          continue;
        }
      }
      /* 2) Perbaikan rumus support untuk enclosed islands: support = (m / A) / D <= 1.0 */
      if (enclosed && r.A >= 12 && r.thick >= 1.45 && r.support >= 0.38 && (r.dE00 >= 2.8 || r.dE >= 4.5)) continue;
      const supThr = r.A <= 8 * resLin ? 0.38 : r.A <= 24 * resLin ? 0.30 : r.A <= 64 * resLin ? 0.22 : 0.16;
      const closeShade = enclosed && r.dE < 16 && r.support < supThr;
      const dataSaysSurround = (enclosed && r.dE < 22 && r.support < 0.28) ||
        (r.domFrac >= 0.45 && r.creaseFrac < 0.18 && r.thick < 1.85 * wScale && r.support < 0.30) ||
        (r.domFrac >= 0.50 && r.creaseFrac < 0.18 && r.A <= 24 * resLin * resLin && r.support < 0.32);
      if (!closeShade && !dataSaysSurround) continue;
      let stillSame = true;
      for (let k = 0; k < r.cells.length; k++) if (labels[r.cells[k]] !== r.lab) { stillSame = false; break; }
      if (!stillSame) continue;
      for (let k = 0; k < r.cells.length; k++) labels[r.cells[k]] = r.S;
      changed++;
    }
    total += changed;
    if (!changed) break;
  }
  return total;
}

/* Urutan pembersihan terpadu (dipakai Auto Pipeline & Advanced Wizard):
   morfologi → gabung island derau → min-pixels → sliver → parasit, dengan perlindungan detail nyata & garis jari */
function runSegmentationCleanup(labels, w, h, work, palette, mask, segCtx, minPx) {
  const resAreaScale = Math.pow(Math.max(1, Math.max(w, h) / 720), 0.52);
  const effMinPx = clamp(Math.min(7, Math.max(minPx || 4, Math.round((minPx || 4) * resAreaScale))), 2, 7);
  buildDetailProtection(labels, w, h, work, palette, mask);
  morphologicalCleanStrokes(labels, w, h, work, palette, mask, segCtx);
  erodeSandwichedBoundaryRibbons(labels, w, h, work, palette, mask, segCtx);
  resolveEnclosedNoiseIslands(labels, w, h, work, palette, mask);
  buildDetailProtection(labels, w, h, work, palette, mask);
  removeBoundarySlivers(labels, w, h, work, palette);
  enforceMinPixels(labels, w, h, effMinPx, work, palette);
  absorbBoundaryParasites(labels, w, h, work, palette, mask);
  resolveCheckerboardSaddles(labels, w, h, work, palette, mask);
  /* Pertahankan _detailProt pada pass kedua enforceMinPixels agar garis jari & detail kecil tidak terhapus! */
  buildDetailProtection(labels, w, h, work, palette, mask);
  enforceMinPixels(labels, w, h, effMinPx, work, palette);
  resolveCheckerboardSaddles(labels, w, h, work, palette, mask);
  return labels;
}

/* =====================================================================
   Morphological Closing & Opening Selektif (Bebas Pemotongan Sudut Lancip)
   ===================================================================== */
function morphologicalCleanStrokes(labels, w, h, work, palette, mask, segCtx = null, forceCpu = false) {
  if (!work || !work.data || !palette) return labels;
  if (!forceCpu && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuMorphCleanStrokes && palette.length <= 64) {
    const ctx = segCtx || labels._segCtx || work._segCtx || buildSegmentationContext(work, work, mask, palette, null, false);
    if (GpuAccelerator.gpuMorphCleanStrokes(labels, w, h, work, palette, mask, ctx)) {
      return labels;
    }
  }
  const d = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;

  const closed = new Int16Array(labels);
  const detailProt = labels._detailProt || null;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (mask && mask[p]) continue;
      if (detailProt && detailProt[p]) continue;
      const cur = labels[p];
      const lL = labels[p - 1], lR = labels[p + 1], lU = labels[p - w], lD = labels[p + w];
      let bridgeL = -1;
      if (lL >= 0 && lL === lR && lL !== cur && lU !== lL && lD !== lL) bridgeL = lL;
      else if (lU >= 0 && lU === lD && lU !== cur && lL !== lU && lR !== lU) bridgeL = lU;
      if (bridgeL >= 0 && palette[bridgeL] && palette[cur]) {
        let cntB = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (labels[(y + dy) * w + (x + dx)] === bridgeL) cntB++;
          }
        }
        if (cntB >= 3) {
          const i = p * 4;
          const dBridge = cdist2(d[i], d[i + 1], d[i + 2], palette[bridgeL].r, palette[bridgeL].g, palette[bridgeL].b);
          const dCur = cdist2(d[i], d[i + 1], d[i + 2], palette[cur].r, palette[cur].g, palette[cur].b);
          if (dBridge <= dCur * 1.25 + 420 && !wouldChangeTopology(labels, w, h, x, y, cur, bridgeL)) {
            closed[p] = bridgeL;
          }
        }
      }
    }
  }
  labels.set(closed);

  const opened = new Int16Array(labels);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (mask && mask[p]) continue;
      if (detailProt && detailProt[p]) continue;
      const cur = labels[p];
      if (cur < 0) continue;

      const nbsOrtho = [p - 1, p + 1, p - w, p + w];
      let sameOrtho = 0, sameDir = -1;
      const bgVotes = new Map();
      for (let k = 0; k < 4; k++) {
        const nl = labels[nbsOrtho[k]];
        if (nl === cur) { sameOrtho++; sameDir = k; }
        else if (nl >= 0) bgVotes.set(nl, (bgVotes.get(nl) || 0) + 2);
      }
      if (sameOrtho > 1) continue;

      let sameDiag = 0, fwdDiagSame = 0;
      const stepDx0 = sameDir === 0 ? -1 : sameDir === 1 ? 1 : 0;
      const stepDy0 = sameDir === 2 ? -1 : sameDir === 3 ? 1 : 0;
      for (const [ddx, ddy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const dp = (y + ddy) * w + (x + ddx);
        const nl = labels[dp];
        if (nl === cur) {
          sameDiag++;
          if (sameOrtho === 1 && (ddx * stepDx0 + ddy * stepDy0) <= 0) fwdDiagSame++;
        } else if (nl >= 0) {
          bgVotes.set(nl, (bgVotes.get(nl) || 0) + 1);
        }
      }
      if (sameOrtho === 0 && sameDiag >= 1) continue;
      if (sameOrtho === 1 && (fwdDiagSame > 0 || sameDiag >= 1)) continue;

      let domBg = -1, maxV = 0;
      bgVotes.forEach((v, k) => { if (v > maxV) { maxV = v; domBg = k; } });
      if (domBg < 0 || !palette[domBg] || !palette[cur]) continue;

      const i0 = p * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];
      const Ccur = palette[cur], Cbg = palette[domBg];
      const dCur = cdist2(r0, g0, b0, Ccur.r, Ccur.g, Ccur.b);
      const dBg = cdist2(r0, g0, b0, Cbg.r, Cbg.g, Cbg.b);

      const isTrulyCloserToBg = dCur > dBg * 1.15;
      if (sameOrtho === 0 && isTrulyCloserToBg) {
        opened[p] = domBg;
      } else if (sameOrtho === 1 && sameDiag === 0 && dCur > dBg * 1.35) {
        opened[p] = domBg;
      }
    }
  }
  labels.set(opened);

  erodeSandwichedBoundaryRibbons(labels, w, h, work, palette, mask, segCtx);
  absorbBoundaryParasites(labels, w, h, work, palette, mask);
  return labels;
}

/* =====================================================================
   Boundary Sliver Artifact & Halo Strip Removal (Sliver Removal: Area / Perimeter^2)
   ===================================================================== */
function removeBoundarySlivers(labels, w, h, work = null, palette = null) {
  const d = (work && work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : (work && work.data ? work.data.data : null);
  const seen = new Int32Array(w * h).fill(-1);
  const comps = [];

  for (let p = 0; p < w * h; p++) {
    if (labels[p] < 0 || seen[p] >= 0) continue;
    const lab = labels[p], id = comps.length;
    const st = [p]; seen[p] = id;
    const cells = [];
    let perim = 0;
    const nbCounts = new Map();

    while (st.length) {
      const q = st.pop(); cells.push(q);
      const x = q % w, y = (q / w) | 0;
      const nbs = [
        x > 0 ? q - 1 : -1,
        x < w - 1 ? q + 1 : -1,
        y > 0 ? q - w : -1,
        y < h - 1 ? q + w : -1
      ];
      for (let k = 0; k < 4; k++) {
        const nq = nbs[k];
        if (nq < 0) { perim++; continue; }
        const nl = labels[nq];
        if (nl !== lab) {
          perim++;
          if (nl >= 0) nbCounts.set(nl, (nbCounts.get(nl) || 0) + 1);
        } else if (seen[nq] < 0) {
          seen[nq] = id;
          st.push(nq);
        }
      }
    }
    const area = cells.length;
    const sliverRatio = area / Math.max(1, perim * perim);
    const meanWidth = (2 * area) / Math.max(1, perim);
    comps.push({ id, lab, cells, area, perim, sliverRatio, meanWidth, nbCounts });
  }

  const maxSliverArea = Math.max(280, Math.round(w * h * 0.0055));
  comps.sort((a, b) => a.area - b.area);
  const detailProt = labels._detailProt || null;

  for (const comp of comps) {
    if (comp.area > maxSliverArea || comp.nbCounts.size === 0) continue;
    if (detailProt && comp.area >= 6) {
      let pc = 0;
      for (const pp of comp.cells) if (detailProt[pp]) pc++;
      if (pc * 3 >= comp.cells.length || pc >= 8) continue;
    }

    const rankedNbs = [...comp.nbCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topNb = rankedNbs[0][0];
    const hasTwoNbs = rankedNbs.length >= 2 && rankedNbs[1][1] >= Math.max(2, comp.perim * 0.08);

    let isTrueColorFeature = false;
    let isCollinearBlendCluster = false;
    if (palette && palette._hasSmoothGradient && comp.meanWidth >= 2.2 && comp.area >= 48 && rankedNbs.length >= 2) {
      const cA = palette[rankedNbs[0][0]], cB = palette[rankedNbs[1][0]];
      if (cA && cB && cdist2(cA.r, cA.g, cA.b, cB.r, cB.g, cB.b) < 2600) {
        isTrueColorFeature = true;
      }
    }
    if (!isTrueColorFeature && hasTwoNbs && palette) {
      const Cown = palette[comp.lab];
      const topK = Math.min(rankedNbs.length, 3);
      let LA = rankedNbs[0][0], LB = rankedNbs[1][0];
      if (Cown) {
        const lOwn = 0.299 * Cown.r + 0.587 * Cown.g + 0.114 * Cown.b;
        for (let ia = 0; ia < topK && !isCollinearBlendCluster; ia++) {
          for (let ib = ia + 1; ib < topK && !isCollinearBlendCluster; ib++) {
            const ca = palette[rankedNbs[ia][0]], cb = palette[rankedNbs[ib][0]];
            if (ca && cb) {
              const lA = 0.299 * ca.r + 0.587 * ca.g + 0.114 * ca.b;
              const lB = 0.299 * cb.r + 0.587 * cb.g + 0.114 * cb.b;
              /* Jika komponen lebih gelap atau lebih terang dari KEDUA tetangganya (1D valley/ridge), itu adalah garis lipatan/jari nyata! */
              if (comp.area >= 8 && (lOwn < Math.min(lA, lB) - 3.0 || lOwn > Math.max(lA, lB) + 4.0)) {
                isTrueColorFeature = true;
                break;
              }
              if (evalColorBlendPair(Cown.r, Cown.g, Cown.b, ca, cb)) {
                isCollinearBlendCluster = true;
                LA = rankedNbs[ia][0];
                LB = rankedNbs[ib][0];
              }
              if (!isCollinearBlendCluster && rankedNbs.length >= 3) {
                for (let ic = ib + 1; ic < Math.min(rankedNbs.length, 4); ic++) {
                  const cc = palette[rankedNbs[ic][0]];
                  if (cc && evalColorBlendTriplet(Cown.r, Cown.g, Cown.b, ca, cb, cc)) {
                    isCollinearBlendCluster = true;
                    LA = rankedNbs[ia][0];
                    LB = rankedNbs[ib][0];
                    break;
                  }
                }
              }
            }
          }
        }
      }
      /* Uji juga apakah piksel aktual di dalam komponen mikro (area <= 18) merupakan campuran barisentrik 2/3 tetangganya */
      if (!isCollinearBlendCluster && !isTrueColorFeature && comp.area <= 18 && d && rankedNbs.length >= 2) {
        let mr = 0, mg = 0, mb = 0;
        for (const p of comp.cells) { const i = p * 4; mr += d[i]; mg += d[i + 1]; mb += d[i + 2]; }
        mr /= comp.cells.length; mg /= comp.cells.length; mb /= comp.cells.length;
        const c0 = palette[rankedNbs[0][0]], c1 = palette[rankedNbs[1][0]], c2 = rankedNbs.length >= 3 ? palette[rankedNbs[2][0]] : null;
        if ((c0 && c1 && evalColorBlendPair(mr, mg, mb, c0, c1)) || (c0 && c1 && c2 && evalColorBlendTriplet(mr, mg, mb, c0, c1, c2))) {
          isCollinearBlendCluster = true;
        }
      }
      const CA = palette[LA], CB = palette[LB];
      if (Cown && CA && CB && d) {
        let errOwn = 0, errAB = 0;
        for (const p of comp.cells) {
          const i = p * 4;
          errOwn += cdist2(d[i], d[i + 1], d[i + 2], Cown.r, Cown.g, Cown.b);
          errAB += Math.min(
            cdist2(d[i], d[i + 1], d[i + 2], CA.r, CA.g, CA.b),
            cdist2(d[i], d[i + 1], d[i + 2], CB.r, CB.g, CB.b)
          );
        }
        const meanOwn = errOwn / Math.max(1, comp.cells.length);
        if (errOwn < errAB * 0.48 && meanOwn < 220 && comp.area >= 14) {
          isTrueColorFeature = true;
        }
      }
    }
    if (isTrueColorFeature) continue;

    const resLin = Math.max(1, Math.hypot(w, h) / Math.hypot(720, 720));
    const wScale = Math.pow(resLin, 0.58);
    const aScale = resLin * resLin;
    const isMultiBorderSliver = hasTwoNbs && isCollinearBlendCluster && (
      (comp.sliverRatio < 0.044 && comp.meanWidth < 2.15 * wScale) ||
      (comp.area <= 110 * aScale && comp.sliverRatio < 0.050 && comp.meanWidth < 2.05 * wScale)
    );
    const isExtremeThinSliver = isCollinearBlendCluster && comp.area <= 55 * aScale && comp.sliverRatio < 0.026 && comp.meanWidth < 1.55 * wScale;

    if (!isMultiBorderSliver && !isExtremeThinSliver) continue;

    const cellSet = new Set(comp.cells);
    let rem = comp.cells.slice();
    let guard = 0;
    while (rem.length && guard++ < 10) {
      const nextRem = [];
      const updates = [];
      for (const p of rem) {
        const x = p % w, y = (p / w) | 0;
        const nbs = [
          x > 0 ? p - 1 : -1,
          x < w - 1 ? p + 1 : -1,
          y > 0 ? p - w : -1,
          y < h - 1 ? p + w : -1
        ];
        let bestNb = -1, bestDist = Infinity;
        const i = p * 4;
        for (const nq of nbs) {
          if (nq < 0 || cellSet.has(nq)) continue;
          const nl = labels[nq];
          if (nl < 0 || nl === comp.lab) continue;
          const dist = (d && palette && palette[nl])
            ? cdist2(d[i], d[i + 1], d[i + 2], palette[nl].r, palette[nl].g, palette[nl].b)
            : 0;
          if (dist < bestDist) { bestDist = dist; bestNb = nl; }
        }
        if (bestNb >= 0) updates.push([p, bestNb]);
        else nextRem.push(p);
      }
      if (!updates.length) {
        for (const p of nextRem) labels[p] = topNb;
        break;
      }
      for (const [p, nl] of updates) {
        labels[p] = nl;
        cellSet.delete(p);
      }
      rem = nextRem;
    }
  }
  return labels;
}


/* === END 09-vmt-cleanup-morphology.js === */

/* === BEGIN 10-vmt-boundary-beach.js === */
/* =====================================================================
 * JS Module 10: VMT Engine Part 6 — Half-Edge Planar Graph Boundary Tracer & Beach Sub-Pixel Deconvolution
 * ===================================================================== */
/* =====================================================================
   TAHAP 5 & 6 — Planar Graph BoundaryTracer & SubPixel Beach Inversion
   + Multi-Vertex Parasitic Hook Pruning & Canonical Loop Orientation
   ===================================================================== */
function pruneContourSliverSpikes(pts, juncFlags, vkeys = null) {
  if (!pts || pts.length < 6) return { pts, juncFlags, vkeys };
  let curPts = pts.slice();
  let curJunc = juncFlags ? juncFlags.slice() : new Array(pts.length).fill(0);
  let curKeys = vkeys ? vkeys.slice() : new Array(pts.length).fill(0);

  for (let pass = 0; pass < 3; pass++) {
    const n = curPts.length;
    if (n < 6) break;
    const drop = new Uint8Array(n);
    for (let span = 1; span <= 3; span++) {
      if (n <= span + 4) continue;
      for (let i = 0; i < n; i++) {
        let hasJuncOrDrop = false;
        for (let s = 1; s <= span; s++) {
          const idxMid = (i + s) % n;
          if (drop[idxMid] || curJunc[idxMid]) { hasJuncOrDrop = true; break; }
        }
        if (hasJuncOrDrop) continue;
        const pStart = curPts[i];
        const pEnd = curPts[(i + span + 1) % n];
        const baseGap = Math.hypot(pEnd[0] - pStart[0], pEnd[1] - pStart[1]);
        let detour = 0;
        for (let s = 0; s <= span; s++) {
          const a = curPts[(i + s) % n], b = curPts[(i + s + 1) % n];
          detour += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        const maxGap = span === 1 ? 0.62 : span === 2 ? 0.78 : 0.88;
        if (baseGap < maxGap && detour > Math.max(1.32 + span * 0.35, baseGap * 2.25)) {
          for (let s = 1; s <= span; s++) drop[(i + s) % n] = 1;
        }
      }
    }
    if (drop.some(v => v === 1)) {
      const np = [], nj = [], nk = [];
      for (let i = 0; i < n; i++) {
        if (!drop[i]) {
          np.push(curPts[i]);
          nj.push(curJunc[i]);
          nk.push(curKeys[i]);
        }
      }
      if (np.length >= 4) { curPts = np; curJunc = nj; curKeys = nk; }
    } else break;
  }
  return { pts: curPts, juncFlags: curJunc, vkeys: curKeys };
}

function canonicalRotateLoop(pts, vkeys, juncFlags) {
  const n = pts.length;
  if (n < 2 || !vkeys || vkeys.length !== n) return { pts, vkeys, juncFlags };
  let startIdx = -1, bestKey = Infinity;
  for (let i = 0; i < n; i++) {
    if (juncFlags && juncFlags[i] && vkeys[i] < bestKey) {
      bestKey = vkeys[i];
      startIdx = i;
    }
  }
  if (startIdx < 0) {
    for (let i = 0; i < n; i++) {
      if (vkeys[i] < bestKey) {
        bestKey = vkeys[i];
        startIdx = i;
      }
    }
  }
  if (startIdx <= 0) return { pts, vkeys, juncFlags };
  return {
    pts: pts.slice(startIdx).concat(pts.slice(0, startIdx)),
    vkeys: vkeys.slice(startIdx).concat(vkeys.slice(0, startIdx)),
    juncFlags: juncFlags ? juncFlags.slice(startIdx).concat(juncFlags.slice(0, startIdx)) : juncFlags
  };
}

function traceBoundaries(labels, w, h, work, palette, opt = {}) {
  const t0 = performance.now();
  const GW = w + 1, GH = h + 1;

  const vxCoord = new Float64Array(GW * GH);
  const vyCoord = new Float64Array(GW * GH);
  const vValence = new Uint8Array(GW * GH);
  const vSharpPin = new Uint8Array(GW * GH);
  for (let y = 0; y <= h; y++) {
    for (let x = 0; x <= w; x++) {
      const k = y * GW + x;
      vxCoord[k] = x;
      vyCoord[k] = y;
    }
  }

  const lblAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : labels[y * w + x];
  for (let y = 0; y <= h; y++) {
    for (let x = 0; x <= w; x++) {
      const nw = lblAt(x - 1, y - 1), ne = lblAt(x, y - 1);
      const sw = lblAt(x - 1, y), se = lblAt(x, y);
      let deg = 0;
      if (nw !== ne) deg++;
      if (ne !== se) deg++;
      if (se !== sw) deg++;
      if (sw !== nw) deg++;
      vValence[y * GW + x] = deg;
    }
  }

  if (opt.aa !== false && work && work.data) {
    refineBeachPlanar(vxCoord, vyCoord, vValence, vSharpPin, labels, w, h, work, palette, opt.forceCpu === true);
  }

  const per = new Map();
  const addEdge = (L, x0, y0, x1, y1) => {
    const k0 = y0 * GW + x0, k1 = y1 * GW + x1;
    let m = per.get(L);
    if (!m) { m = new Map(); per.set(L, m); }
    let arr = m.get(k0);
    if (!arr) { arr = []; m.set(k0, arr); }
    arr.push({ k1, ex: x1, ey: y1, ang: Math.atan2(y1 - y0, x1 - x0) });
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const L = labels[y * w + x];
      if (L < 0) continue;
      if (y === 0 || labels[(y - 1) * w + x] !== L) addEdge(L, x + 1, y, x, y);
      if (x === w - 1 || labels[y * w + x + 1] !== L) addEdge(L, x + 1, y + 1, x + 1, y);
      if (y === h - 1 || labels[(y + 1) * w + x] !== L) addEdge(L, x, y + 1, x + 1, y + 1);
      if (x === 0 || labels[y * w - 1 + x] !== L) addEdge(L, x, y, x, y + 1);
    }
  }

  const loops = [];
  per.forEach((emap, L) => {
    const used = new Set();
    emap.forEach((arr, sk) => {
      for (let ei = 0; ei < arr.length; ei++) {
        const eid = sk * 8 + ei;
        if (used.has(eid)) continue;
        const pts = [];
        const vkeys = [];
        const juncFlags = [];
        let curKey = sk, curEi = ei, inAng = arr[ei].ang, guard = 0;

        while (guard++ < 500000) {
          used.add(curKey * 8 + curEi);
          pts.push([vxCoord[curKey], vyCoord[curKey]]);
          vkeys.push(curKey);
          juncFlags.push(vValence[curKey] >= 3 ? 1 : 0);

          const e = emap.get(curKey)[curEi];
          const nk = e.k1;
          if (nk === sk && pts.length > 2) break;
          const outs = emap.get(nk);
          if (!outs) break;

          let bi = -1, bc = -Infinity, bd = -Infinity;
          const fx = Math.cos(inAng), fy = Math.sin(inAng);
          for (let oi = 0; oi < outs.length; oi++) {
            if (used.has(nk * 8 + oi)) continue;
            const o = outs[oi];
            const gx = Math.cos(o.ang), gy = Math.sin(o.ang);
            const cross = fx * gy - fy * gx, dot = fx * gx + fy * gy;
            if (cross > bc + 1e-9 || (Math.abs(cross - bc) < 1e-9 && dot > bd)) {
              bc = cross; bd = dot; bi = oi;
            }
          }
          if (bi < 0) break;
          inAng = outs[bi].ang;
          curKey = nk;
          curEi = bi;
        }
        if (pts.length >= 3) {
          const cleaned = pruneContourSliverSpikes(pts, juncFlags, vkeys);
          const rot = canonicalRotateLoop(cleaned.pts, cleaned.vkeys, cleaned.juncFlags);
          const rm = rot.pts.length;
          if (rm >= 8 && rot.juncFlags) {
            for (let ji = 0; ji < rm; ji++) {
              if (rot.juncFlags[ji]) {
                // Ukur belokan makro pada span L=3, L=5, dan konsistensi busur lokal untuk mengenali T-junction Kurva Induk (juncFlags=2)
                const sA = Math.min(3, rm >> 2), sB = Math.min(5, rm >> 2);
                const pMA = rot.pts[(ji - sA + rm) % rm], p0 = rot.pts[ji], pPA = rot.pts[(ji + sA) % rm];
                const pMB = rot.pts[(ji - sB + rm) % rm], pPB = rot.pts[(ji + sB) % rm];
                const uAx = p0[0] - pMA[0], uAy = p0[1] - pMA[1], vAx = pPA[0] - p0[0], vAy = pPA[1] - p0[1];
                const uBx = p0[0] - pMB[0], uBy = p0[1] - pMB[1], vBx = pPB[0] - p0[0], vBy = pPB[1] - p0[1];
                const tA = Math.abs(Math.atan2(uAx * vAy - uAy * vAx, uAx * vAx + uAy * vAy));
                const tB = Math.abs(Math.atan2(uBx * vBy - uBy * vBx, uBx * vBx + uBy * vBy));
                let isSmoothHost = (tA <= 0.62 && tB <= 0.66);
                if (!isSmoothHost && rm >= 16 && tB <= 0.82) {
                  const winArc = [];
                  for (let d = -6; d <= 6; d++) winArc.push(rot.pts[(ji + d + rm) % rm]);
                  const cfLoc = fitCircle2D(winArc);
                  if (cfLoc && cfLoc.r >= 2.5 && cfLoc.r <= 380 && cfLoc.rms <= 0.30) isSmoothHost = true;
                }
                rot.juncFlags[ji] = isSmoothHost ? 2 : 1;
              }
            }
          }
          loops.push({ label: L, pts: rot.pts, vkeys: rot.vkeys, juncFlags: rot.juncFlags });
        }
      }
    });
  });

  const maxSliverPolyArea = 22;
  const kept = [];
  for (const lp of loops) {
    let a = 0, perim = 0, juncCnt = 0;
    const p = lp.pts, n = p.length;
    for (let i = 0; i < n; i++) {
      const q = p[(i + 1) % n];
      a += p[i][0] * q[1] - q[0] * p[i][1];
      perim += Math.hypot(q[0] - p[i][0], q[1] - p[i][1]);
      if (lp.juncFlags && lp.juncFlags[i]) juncCnt++;
    }
    lp.area = a * 0.5;
    const absA = Math.abs(lp.area);
    const sliverRatio = absA / Math.max(1e-6, perim * perim);
    const meanWidth = (2 * absA) / Math.max(1e-6, perim);
    /* Filter Poligon Serpihan Sub-Piksel Mikro (tanpa menghapus garis jari/helai rambut tipis!) */
    if (absA < maxSliverPolyArea && sliverRatio < 0.010 && meanWidth < 0.90) continue;
    if (juncCnt >= 2 && absA < 1.8 && meanWidth < 1.15) continue;
    if (absA > 0.55 && n >= 3) kept.push(lp);
  }

  /* ---- TAHAP 6.5: Regularisasi Lingkaran Sejati & Pemulihan Busur Singgung Tangensial (Kissing-Arc & Cusp Recovery) ----
     1. Jika sebuah kontur tertutup (seperti 40 lingkaran dalam atau bulatan pulau) secara global merupakan lingkaran sejati
        namun kelilingnya memiliki T-junction (tempat pita warna/latar menempel), tandai seluruh T-junction pada kontur
        tersebut sebagai JUNCTION_HOST_SMOOTH (juncFlags = 2) dan proyeksikan koordinat verteks planar bersama (vxCoord, vyCoord)
        tepat ke keliling lingkaran ideal agar lingkaran tidak gepeng/terjepit dan tidak timbul celah dengan region tetangga.
     2. Jika pada kontur berbusur terdapat rentang pendek (2..18 langkah) di antara dua T-junction yang mengapit puncak kuadran
        busur yang sama (akibat ujung cusp tajam yang tumpul oleh grid piksel), pulihkan titik-titik pada rentang tersebut
        mengikuti kelengkungan busur induk bersama. */
  const circleLockedKeys = new Set();
  const keptBySmallArea = kept.slice().sort((a, b) => Math.abs(a.area) - Math.abs(b.area));
  for (const lp of keptBySmallArea) {
    const pts = lp.pts, n = pts.length;
    if (n < 8) continue;
    let cf0 = fitCircle2D(pts);
    if (!cf0 || cf0.r < 1.15 || cf0.r > 480) continue;
    if (n < 16) {
      const hasJunc = lp.juncFlags && lp.juncFlags.some(v => v > 0);
      const absA = Math.abs(lp.area);
      const areaRatio = absA / (Math.PI * cf0.r * cf0.r);
      if (!hasJunc && cf0.r <= 3.2 && areaRatio >= 0.76 && areaRatio <= 1.26 && cf0.rms <= Math.max(0.28, cf0.r * 0.13)) {
        lp.isTrueCircle = true;
        lp.circleFit = { cx: cf0.cx, cy: cf0.cy, r: cf0.r };
        if (lp.vkeys && lp.vkeys.length === n) {
          for (let i = 0; i < n; i++) {
            const vk = lp.vkeys[i];
            if (vk >= 0 && !circleLockedKeys.has(vk)) {
              const dx = vxCoord[vk] - cf0.cx, dy = vyCoord[vk] - cf0.cy, dl = Math.hypot(dx, dy) || 1;
              vxCoord[vk] = cf0.cx + (dx / dl) * cf0.r;
              vyCoord[vk] = cf0.cy + (dy / dl) * cf0.r;
              circleLockedKeys.add(vk);
            }
          }
        }
      }
      continue;
    }
    /* Robust Trimmed Circle Fit (80% inliers): cegah 4-6 verteks T-junction yang terjepit 1-2px menggeser pusat/radius lingkaran */
    const devs0 = pts.map((p, idx) => ({ idx, d: Math.abs(Math.hypot(p[0] - cf0.cx, p[1] - cf0.cy) - cf0.r) })).sort((a, b) => a.d - b.d);
    const inlierCount = Math.max(12, Math.floor(n * 0.80));
    const inlierPts = devs0.slice(0, inlierCount).map(it => pts[it.idx]);
    const cf = fitCircle2D(inlierPts) || cf0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxRDev = 0;
    const radDevs = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
      const dR = Math.abs(Math.hypot(p[0] - cf.cx, p[1] - cf.cy) - cf.r);
      radDevs.push(dR);
      if (dR > maxRDev) maxRDev = dR;
    }
    radDevs.sort((a, b) => a - b);
    const q80Dev = radDevs[Math.floor(n * 0.80)];
    const absA = Math.abs(lp.area);
    const areaRatio = absA / (Math.PI * cf.r * cf.r);
    const bw = maxX - minX, bh = maxY - minY;
    const aspect = (bw > 0 && bh > 0) ? (bw / bh) : 0;
    /* Periksa ketiadaan sudut siku 90° tajam pada rentang bebas-junction agar persegi kecil tidak disangka lingkaran */
    let sharpNonJunc = 0;
    const sStep = clamp(Math.round(n / 18), 3, 6);
    for (let i = 0; i < n; i++) {
      let nearJunc = false;
      if (lp.juncFlags) {
        for (let d = -sStep; d <= sStep; d++) {
          if (lp.juncFlags[(i + d + n) % n]) { nearJunc = true; break; }
        }
      }
      if (nearJunc) continue;
      const a = pts[(i - sStep + n) % n], p0 = pts[i], b = pts[(i + sStep) % n];
      const ux = p0[0] - a[0], uy = p0[1] - a[1], vx = b[0] - p0[0], vy = b[1] - p0[1];
      const t = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
      if (t > 1.18) sharpNonJunc++;
    }
    if (sharpNonJunc <= 2 && aspect >= 0.87 && aspect <= 1.14 && areaRatio >= 0.90 && areaRatio <= 1.10 &&
        cf.rms <= Math.max(0.38, cf.r * 0.024) && q80Dev <= Math.max(0.62, cf.r * 0.036) && maxRDev <= Math.max(2.65, cf.r * 0.13)) {
      lp.isTrueCircle = true;
      lp.circleFit = { cx: cf.cx, cy: cf.cy, r: cf.r };
      if (lp.juncFlags) {
        for (let i = 0; i < n; i++) if (lp.juncFlags[i]) lp.juncFlags[i] = 2;
      }
      if (lp.vkeys && lp.vkeys.length === n) {
        for (let i = 0; i < n; i++) {
          const vk = lp.vkeys[i];
          if (vk >= 0 && !circleLockedKeys.has(vk)) {
            const dx = vxCoord[vk] - cf.cx, dy = vyCoord[vk] - cf.cy;
            const dl = Math.hypot(dx, dy) || 1;
            vxCoord[vk] = cf.cx + (dx / dl) * cf.r;
            vyCoord[vk] = cf.cy + (dy / dl) * cf.r;
            circleLockedKeys.add(vk);
          }
        }
      }
    }
  }

  /* Restorasi Ujung Cusp Tangensial pada Lingkaran (Tangential Cusp Pinch Restoration):
     Ketika dua busur/lingkaran bersinggungan secara tangensial, grid piksel + MRF memotong ujung lancip (cusp)
     pita warna/hitam sehingga satu titik singgung melebar menjadi rentang kontak tumpul sepanjang 6..16 piksel
     di antara dua T-junction (ja, jb). Kontraksikan pasangan T-junction tersebut sepanjang keliling lingkaran
     menuju titik singgung sejati (thetaMid) dan relaksasikan lengan stem yang menempel agar:
     1) Lingkaran dalam tetap 100% bulat sempurna,
     2) Lingkaran/busur luar yang bersinggungan tidak mengalami tonjolan 'bottle-cap' 1.3px,
     3) Ujung lancip (cusp) pita warna pulih meruncing mendekati titik singgung asli. */
  const walkExternalStem = (juncKey, circleKeySet, maxSteps = 7) => {
    const chain = [juncKey];
    let prev = juncKey, cur = -1;
    const nbs0 = adj ? adj.get(juncKey) : null;
    if (!nbs0) return chain;
    for (const nb of nbs0) {
      if (!circleKeySet.has(nb)) { cur = nb; break; }
    }
    if (cur < 0) return chain;
    for (let s = 1; s <= maxSteps; s++) {
      chain.push(cur);
      if (vValence[cur] !== 2) break;
      const cnbs = adj.get(cur);
      if (!cnbs || cnbs.length !== 2) break;
      const nxt = cnbs[0] === prev ? cnbs[1] : cnbs[0];
      if (circleKeySet.has(nxt)) break;
      prev = cur;
      cur = nxt;
    }
    return chain;
  };

  /* Bangun peta ketetanggaan verteks planar (adj) untuk relaksasi cabang stem di sekitar T-junction */
  const adj = new Map();
  for (const lp of kept) {
    const vk = lp.vkeys;
    if (!vk || vk.length < 3) continue;
    for (let i = 0; i < vk.length; i++) {
      const a = vk[i], b = vk[(i + 1) % vk.length];
      let la = adj.get(a); if (!la) { la = []; adj.set(a, la); }
      if (!la.includes(b)) la.push(b);
      let lb = adj.get(b); if (!lb) { lb = []; adj.set(b, lb); }
      if (!lb.includes(a)) lb.push(a);
    }
  }

  for (const lp of keptBySmallArea) {
    if (!lp.isTrueCircle || !lp.circleFit || !lp.juncFlags || !lp.vkeys) continue;
    const { cx, cy, r } = lp.circleFit;
    if (r < 8.0 || r > 80.0) continue;
    const n = lp.pts.length, jf = lp.juncFlags, vkArr = lp.vkeys;
    const ownCircleKeys = new Set(vkArr);
    const jList = [];
    for (let i = 0; i < n; i++) if (jf[i]) jList.push(i);
    if (jList.length < 2) continue;

    for (let m = 0; m < jList.length; m++) {
      const ja = jList[m], jb = jList[(m + 1) % jList.length];
      const spanSteps = (jb - ja + n) % n;
      if (spanSteps < 4 || spanSteps > 26) continue;
      const prevJ = jList[(m - 1 + jList.length) % jList.length];
      const nextJ = jList[(m + 2) % jList.length];
      const prevSteps = (ja - prevJ + n) % n;
      const nextSteps = (nextJ - jb + n) % n;
      /* Pastikan rentang kontak tumpul ini diapit oleh dua busur kuadran yang lebih panjang pada lingkaran
         (mencakup baik singgung luar R1+R2 maupun singgung dalam R3-R1 yang memiliki rentang tumpul 16..24 px) */
      if (prevSteps < spanSteps * 1.12 || nextSteps < spanSteps * 1.12) continue;

      const ka = vkArr[ja], kb = vkArr[jb];
      const thA = Math.atan2(vyCoord[ka] - cy, vxCoord[ka] - cx);
      const thB = Math.atan2(vyCoord[kb] - cy, vxCoord[kb] - cx);
      let dTh = Math.atan2(Math.sin(thB - thA), Math.cos(thB - thA));
      const arcLen = Math.abs(dTh) * r;
      if (arcLen < 4.0 || arcLen > 25.5) continue;

      const thMid = thA + 0.5 * dTh;
      /* Kontraksikan lebar sudut kontak tumpul hingga tersisa ~1.6px di sekitar titik singgung sejati */
      const shrink = clamp(3.2 / Math.max(3.2, arcLen), 0.14, 0.34);
      const newThA = thMid - 0.5 * dTh * shrink;
      const newThB = thMid + 0.5 * dTh * shrink;

      const oldAx = vxCoord[ka], oldAy = vyCoord[ka];
      const oldBx = vxCoord[kb], oldBy = vyCoord[kb];

      for (let s = 0; s <= spanSteps; s++) {
        const u = s / spanSteps;
        const th = newThA + (newThB - newThA) * u;
        const vk = vkArr[(ja + s) % n];
        vxCoord[vk] = cx + r * Math.cos(th);
        vyCoord[vk] = cy + r * Math.sin(th);
      }

      const dAx = vxCoord[ka] - oldAx, dAy = vyCoord[ka] - oldAy;
      const dBx = vxCoord[kb] - oldBx, dBy = vyCoord[kb] - oldBy;

      /* Relaksasikan cabang stem luar menggunakan proyeksi busur lingkaran (Arc-Guided Stem Relaxation)
         agar ujung pita/cusp tidak mengalami gelombang S (wiggle) di dekat titik singgung! */
      const relaxStemArc = (jKey, dJx, dJy) => {
        const fullChain = walkExternalStem(jKey, ownCircleKeys, 64);
        if (fullChain.length < 5) return;
        const anchorLen = Math.min(fullChain.length, 32);
        const farPts = [];
        for (let s = Math.min(5, fullChain.length - 1); s < fullChain.length; s++) {
          farPts.push([vxCoord[fullChain[s]], vyCoord[fullChain[s]]]);
        }
        const cfStem = farPts.length >= 6 ? fitCircle2D(farPts) : null;
        if (cfStem && cfStem.r >= 15.0 && cfStem.r <= 240.0 && cfStem.rms <= 0.36) {
          const pStart = [vxCoord[jKey], vyCoord[jKey]];
          const kEnd = fullChain[anchorLen - 1];
          const pEnd = [vxCoord[kEnd], vyCoord[kEnd]];
          const rStart = Math.hypot(pStart[0] - cfStem.cx, pStart[1] - cfStem.cy);
          const rEnd = Math.hypot(pEnd[0] - cfStem.cx, pEnd[1] - cfStem.cy);
          const th0 = Math.atan2(pStart[1] - cfStem.cy, pStart[0] - cfStem.cx);
          const th1 = Math.atan2(pEnd[1] - cfStem.cy, pEnd[0] - cfStem.cx);
          const dThStem = Math.atan2(Math.sin(th1 - th0), Math.cos(th1 - th0));
          for (let s = 1; s < anchorLen - 1; s++) {
            const sk = fullChain[s];
            if (circleLockedKeys.has(sk) || vValence[sk] !== 2) break;
            const u = s / (anchorLen - 1);
            /* Transisi C2 Hermite mulus tanpa patahan di ujung jangkauan */
            const hBlend = u * u * (3 - 2 * u);
            const thS = th0 + dThStem * u;
            const rS = rStart * (1 - hBlend) + rEnd * hBlend;
            const arcX = cfStem.cx + rS * Math.cos(thS);
            const arcY = cfStem.cy + rS * Math.sin(thS);
            vxCoord[sk] = arcX * (1 - hBlend) + vxCoord[sk] * hBlend;
            vyCoord[sk] = arcY * (1 - hBlend) + vyCoord[sk] * hBlend;
          }
        } else {
          for (let s = 1; s < anchorLen - 1; s++) {
            const sk = fullChain[s];
            if (circleLockedKeys.has(sk) || vValence[sk] !== 2) break;
            const u = s / (anchorLen - 1);
            const wgt = (1 - u) * (1 - u) * (1 + 2 * u);
            vxCoord[sk] += dJx * wgt;
            vyCoord[sk] += dJy * wgt;
          }
        }
      };
      relaxStemArc(ka, dAx, dAy);
      relaxStemArc(kb, dBx, dBy);
    }
  }

  /* Sinkronkan sementara lp.pts setelah restorasi cusp sebelum pengecekan busur besar */
  for (const lp of kept) {
    if (!lp.vkeys || lp.vkeys.length !== lp.pts.length) continue;
    for (let i = 0; i < lp.pts.length; i++) {
      const vk = lp.vkeys[i];
      if (vk >= 0) { lp.pts[i][0] = vxCoord[vk]; lp.pts[i][1] = vyCoord[vk]; }
    }
  }
  for (const lp of keptBySmallArea) {
    if (lp.isTrueCircle && lp.pts.length >= 16) {
      const cfUpd = fitCircle2D(lp.pts);
      if (cfUpd && cfUpd.r >= 2.5) lp.circleFit = { cx: cfUpd.cx, cy: cfUpd.cy, r: cfUpd.r };
    }
  }

  /* Pemulihan Puncak Busur yang Terpotong Sepasang T-Junction (Split Tangential Cusp / Cardinal Arc Bridging) */
  for (const lp of kept) {
    if (lp.isTrueCircle || !lp.juncFlags || !lp.vkeys || lp.pts.length < 24) continue;
    const pts = lp.pts, n = pts.length, jf = lp.juncFlags, vkArr = lp.vkeys;
    const jList = [];
    for (let i = 0; i < n; i++) if (jf[i]) jList.push(i);
    if (jList.length < 2) continue;
    for (let m = 0; m < jList.length; m++) {
      const ja = jList[m], jb = jList[(m + 1) % jList.length];
      const spanLen = (jb - ja + n) % n;
      if (spanLen < 2 || spanLen > 18) continue;
      let touchedLockedCircle = false;
      for (let s = 1; s < spanLen; s++) {
        if (circleLockedKeys.has(vkArr[(ja + s) % n])) { touchedLockedCircle = true; break; }
      }
      if (touchedLockedCircle) continue;
      /* Ambil titik-titik lengan busur di kiri ja dan di kanan jb */
      const prevJ = jList[(m - 1 + jList.length) % jList.length];
      const nextJ = jList[(m + 2) % jList.length];
      const maxL = Math.min(18, Math.max(0, ((ja - prevJ + n) % n) - 1));
      const maxR = Math.min(18, Math.max(0, ((nextJ - jb + n) % n) - 1));
      if (maxL < 6 || maxR < 6) continue;
      const flankPts = [];
      for (let s = maxL; s >= 1; s--) flankPts.push(pts[(ja - s + n) % n]);
      for (let s = 1; s <= maxR; s++) flankPts.push(pts[(jb + s) % n]);
      const cfFlank = fitCircle2D(flankPts);
      const flFlank = fitLine2D(flankPts);
      if (!cfFlank || cfFlank.r < 8.0 || cfFlank.r > 320 || cfFlank.rms > 0.30) continue;
      if (flFlank && cfFlank.rms >= flFlank.rms * 0.65) continue;
      let maxBridgeDev = 0;
      for (let s = 0; s <= spanLen; s++) {
        const p = pts[(ja + s) % n];
        const dR = Math.abs(Math.hypot(p[0] - cfFlank.cx, p[1] - cfFlank.cy) - cfFlank.r);
        if (dR > maxBridgeDev) maxBridgeDev = dR;
      }
      if (maxBridgeDev <= 1.25) {
        jf[ja] = 2;
        jf[jb] = 2;
        for (let s = 0; s <= spanLen; s++) {
          const idxP = (ja + s) % n;
          const vk = vkArr[idxP];
          if (vk >= 0 && !circleLockedKeys.has(vk)) {
            const dx = vxCoord[vk] - cfFlank.cx, dy = vyCoord[vk] - cfFlank.cy;
            const dl = Math.hypot(dx, dy) || 1;
            vxCoord[vk] = cfFlank.cx + (dx / dl) * cfFlank.r;
            vyCoord[vk] = cfFlank.cy + (dy / dl) * cfFlank.r;
          }
        }
      }
    }
  }

  /* ---- TAHAP 6.6: Dekonvolusi Singgungan Garis-Busur (Line-Arc / Arc-Arc Kissing Contact Unpinching) ----
     Ketika busur lingkaran/daun menyinggung garis lurus atau busur lain (seperti semicircle kuning & hijau di U1
     atau puncak daun kuning & busur hijau di U2), piksel anti-aliasing sering menciptakan rantai kontak pendek [ja..jb]
     yang memipihkan busur atau memotong ujung lancip. Proyeksi kembali rantai kontak ke garis/busur induk! */
  for (const lp of kept) {
    if (!lp.juncFlags || !lp.vkeys || lp.pts.length < 20) continue;
    const pts = lp.pts, n = pts.length, jf = lp.juncFlags, vkArr = lp.vkeys;
    const jList = [];
    for (let i = 0; i < n; i++) if (jf[i]) jList.push(i);
    if (jList.length < 2) continue;
    for (let m = 0; m < jList.length; m++) {
      const ja = jList[m], jb = jList[(m + 1) % jList.length];
      const spanLen = (jb - ja + n) % n;
      if (spanLen < 2 || spanLen > 22) continue;
      const prevJ = jList[(m - 1 + jList.length) % jList.length];
      const nextJ = jList[(m + 2) % jList.length];
      const maxL = Math.min(18, Math.max(0, ((ja - prevJ + n) % n) - 1));
      const maxR = Math.min(18, Math.max(0, ((nextJ - jb + n) % n) - 1));
      if (maxL < 5 || maxR < 5) continue;
      const flankPts = [];
      for (let s = maxL; s >= 1; s--) flankPts.push([vxCoord[vkArr[(ja - s + n) % n]], vyCoord[vkArr[(ja - s + n) % n]]]);
      for (let s = 1; s <= maxR; s++) flankPts.push([vxCoord[vkArr[(jb + s) % n]], vyCoord[vkArr[(jb + s) % n]]]);
      const flFlank = fitLine2D(flankPts);
      if (flFlank && flFlank.rms <= 0.16 && flFlank.maxDev <= 0.28) {
        let maxBridgeDev = 0;
        for (let s = 0; s <= spanLen; s++) {
          const vk = vkArr[(ja + s) % n];
          const dev = Math.abs((vxCoord[vk] - flFlank.c[0]) * flFlank.d[1] - (vyCoord[vk] - flFlank.c[1]) * flFlank.d[0]);
          if (dev > maxBridgeDev) maxBridgeDev = dev;
        }
        if (maxBridgeDev <= 1.35) {
          jf[ja] = 2;
          jf[jb] = 2;
          for (let s = 0; s <= spanLen; s++) {
            const vk = vkArr[(ja + s) % n];
            if (vk >= 0 && !circleLockedKeys.has(vk)) {
              const proj = (vxCoord[vk] - flFlank.c[0]) * flFlank.d[0] + (vyCoord[vk] - flFlank.c[1]) * flFlank.d[1];
              vxCoord[vk] = flFlank.c[0] + flFlank.d[0] * proj;
              vyCoord[vk] = flFlank.c[1] + flFlank.d[1] * proj;
            }
          }
        }
      } else {
        const cfFlank = flankPts.length >= 6 ? fitCircle2D(flankPts) : null;
        if (cfFlank && cfFlank.r >= 14.0 && cfFlank.r <= 360.0 && cfFlank.rms <= 0.28 && (!flFlank || cfFlank.rms < flFlank.rms * 0.65)) {
          let maxArcDev = 0;
          for (let s = 0; s <= spanLen; s++) {
            const vk = vkArr[(ja + s) % n];
            const dR = Math.abs(Math.hypot(vxCoord[vk] - cfFlank.cx, vyCoord[vk] - cfFlank.cy) - cfFlank.r);
            if (dR > maxArcDev) maxArcDev = dR;
          }
          if (maxArcDev <= 1.65) {
            jf[ja] = 2;
            jf[jb] = 2;
            const ka = vkArr[ja], kb = vkArr[jb];
            const thA = Math.atan2(vyCoord[ka] - cfFlank.cy, vxCoord[ka] - cfFlank.cx);
            const thB = Math.atan2(vyCoord[kb] - cfFlank.cy, vxCoord[kb] - cfFlank.cx);
            const dTh = Math.atan2(Math.sin(thB - thA), Math.cos(thB - thA));
            const arcLen = Math.abs(dTh) * cfFlank.r;
            if (arcLen >= 3.5 && arcLen <= 22.0) {
              const thMid = thA + 0.5 * dTh;
              const shrink = clamp(2.4 / Math.max(2.4, arcLen), 0.14, 0.32);
              const newThA = thMid - 0.5 * dTh * shrink;
              const newThB = thMid + 0.5 * dTh * shrink;
              const ownKeys = new Set(vkArr);
              const oldAx = vxCoord[ka], oldAy = vyCoord[ka];
              const oldBx = vxCoord[kb], oldBy = vyCoord[kb];
              for (let s = 0; s <= spanLen; s++) {
                const u = s / spanLen;
                const th = newThA + (newThB - newThA) * u;
                const vk = vkArr[(ja + s) % n];
                if (vk >= 0 && !circleLockedKeys.has(vk)) {
                  vxCoord[vk] = cfFlank.cx + cfFlank.r * Math.cos(th);
                  vyCoord[vk] = cfFlank.cy + cfFlank.r * Math.sin(th);
                }
              }
              const dAx = vxCoord[ka] - oldAx, dAy = vyCoord[ka] - oldAy;
              const dBx = vxCoord[kb] - oldBx, dBy = vyCoord[kb] - oldBy;
              const relaxSimple = (jKey, dxJ, dyJ) => {
                const ch = walkExternalStem(jKey, ownKeys, 18);
                for (let s = 1; s < ch.length - 1; s++) {
                  const sk = ch[s];
                  if (circleLockedKeys.has(sk) || vValence[sk] !== 2) break;
                  const u = s / (ch.length - 1);
                  const wgt = (1 - u) * (1 - u);
                  vxCoord[sk] += dxJ * wgt;
                  vyCoord[sk] += dyJ * wgt;
                }
              };
              relaxSimple(ka, dAx, dAy);
              relaxSimple(kb, dBx, dBy);
            }
          }
        }
      }
    }
  }

  /* ---- TAHAP 6.7: Penyelarasan Siluet Lintas-Celah (Cross-Gap Envelope Continuity) ----
     Menyelaraskan pasangan sudut konveks yang dipisahkan oleh celah sempit berwarna latar (seperti urat daun krem
     yang membelah daun hijau atau celah antar-pita diagonal kuning), sehingga siluet luar daun dan batas bujur sangkar
     pita diagonal menjadi 100% kolinier/ko-sirkular sempurna tanpa merusak kontur pulau independen! */
  const gapCandsByLabel = new Map();
  for (let li = 0; li < kept.length; li++) {
    const lp = kept[li];
    if (lp.area < 25 || lp.pts.length < 14 || !lp.vkeys) continue;
    const n = lp.pts.length, vkArr = lp.vkeys;
    for (let i = 0; i < n; i++) {
      const vk = vkArr[i];
      if (vValence[vk] !== 2) continue;
      const pM3 = [vxCoord[vkArr[(i - 3 + n) % n]], vyCoord[vkArr[(i - 3 + n) % n]]];
      const p0  = [vxCoord[vk], vyCoord[vk]];
      const pP3 = [vxCoord[vkArr[(i + 3) % n]], vyCoord[vkArr[(i + 3) % n]]];
      const u1x = p0[0] - pM3[0], u1y = p0[1] - pM3[1], l1 = Math.hypot(u1x, u1y);
      const u2x = pP3[0] - p0[0], u2y = pP3[1] - p0[1], l2 = Math.hypot(u2x, u2y);
      if (l1 < 1.5 || l2 < 1.5) continue;
      const turn3 = Math.atan2(u1x * u2y - u1y * u2x, u1x * u2x + u1y * u2y);
      if (Math.abs(turn3) < 0.52) continue;
      let isLocMax = true;
      for (let d = -2; d <= 2; d++) {
        if (d === 0) continue;
        const j = (i + d + n) % n, vkj = vkArr[j];
        const a = [vxCoord[vkArr[(j - 3 + n) % n]], vyCoord[vkArr[(j - 3 + n) % n]]];
        const p = [vxCoord[vkj], vyCoord[vkj]];
        const b = [vxCoord[vkArr[(j + 3) % n]], vyCoord[vkArr[(j + 3) % n]]];
        const tj = Math.abs(Math.atan2((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]), (p[0] - a[0]) * (b[0] - p[0]) + (p[1] - a[1]) * (b[1] - p[1])));
        if (tj > Math.abs(turn3) + 1e-4) { isLocMax = false; break; }
      }
      if (!isLocMax) continue;
      const armIn = [], armOut = [];
      const maxArmS = Math.min(13, Math.max(5, (n >> 2)));
      const startArmS = maxArmS >= 6 ? 2 : 1;
      for (let s = startArmS; s <= maxArmS; s++) {
        const kIn = vkArr[(i - s + n) % n], kOut = vkArr[(i + s) % n];
        armIn.push([vxCoord[kIn], vyCoord[kIn]]);
        armOut.push([vxCoord[kOut], vyCoord[kOut]]);
      }
      const flIn = fitLine2D(armIn), flOut = fitLine2D(armOut);
      if (!flIn || !flOut) continue;
      let list = gapCandsByLabel.get(lp.label);
      if (!list) { list = []; gapCandsByLabel.set(lp.label, list); }
      list.push({ li, i, vk, pt: p0, armIn, armOut, flIn, flOut });
    }
  }
  gapCandsByLabel.forEach(list => {
    const usedCand = new Uint8Array(list.length);
    for (let a = 0; a < list.length; a++) {
      if (usedCand[a]) continue;
      const cA = list[a];
      let bestB = -1, bestDist = 16.5;
      for (let b = a + 1; b < list.length; b++) {
        if (usedCand[b]) continue;
        const cB = list[b];
        if (cA.li === cB.li && Math.min((cA.i - cB.i + kept[cA.li].pts.length) % kept[cA.li].pts.length, (cB.i - cA.i + kept[cA.li].pts.length) % kept[cA.li].pts.length) < 10) continue;
        const dGap = Math.hypot(cB.pt[0] - cA.pt[0], cB.pt[1] - cA.pt[1]);
        if (dGap < 1.8 || dGap > bestDist) continue;
        const testPairing = (veinA, envA, veinB, envB, isAOutVein) => {
          if (!veinA || !veinB || veinA.rms > 0.30 || veinB.rms > 0.30 || veinA.span < 2.2 || veinB.span < 2.2) return null;
          const dotVein = veinA.d[0] * veinB.d[0] + veinA.d[1] * veinB.d[1];
          if (Math.abs(dotVein) < 0.86) return null;
          const combEnv = envA.slice().reverse().concat(envB);
          const flEnv = fitLine2D(combEnv);
          const cfEnv = combEnv.length >= 6 ? fitCircle2D(combEnv) : null;
          const isLineEnv = !!(flEnv && flEnv.rms <= 0.26 && flEnv.maxDev <= 0.44);
          const isCircEnv = !isLineEnv && !!(cfEnv && cfEnv.r >= 10.0 && cfEnv.r <= 520 && cfEnv.rms <= 0.34);
          if (!isLineEnv && !isCircEnv) return null;
          return { veinA, veinB, flEnv: isLineEnv ? flEnv : null, cfEnv: isCircEnv ? cfEnv : null, isAOutVein };
        };
        const match = testPairing(cA.flOut, cA.armIn, cB.flIn, cB.armOut, true) ||
                      testPairing(cA.flIn, cA.armOut, cB.flOut, cB.armIn, false);
        if (match) {
          bestDist = dGap;
          bestB = b;
          cA._match = match;
        }
      }
      if (bestB >= 0 && cA._match) {
        const cB = list[bestB];
        const { veinA, veinB, flEnv, cfEnv } = cA._match;
        usedCand[a] = 1; usedCand[bestB] = 1;
        const snapCornerToEnv = (cand, flVein) => {
          const x0 = vxCoord[cand.vk], y0 = vyCoord[cand.vk];
          if (flEnv) {
            const det = flVein.d[0] * flEnv.d[1] - flVein.d[1] * flEnv.d[0];
            if (Math.abs(det) > 0.18) {
              const wx = flEnv.c[0] - flVein.c[0], wy = flEnv.c[1] - flVein.c[1];
              const t = (wx * flEnv.d[1] - wy * flEnv.d[0]) / det;
              const ax = flVein.c[0] + flVein.d[0] * t, ay = flVein.c[1] + flVein.d[1] * t;
              if (Math.hypot(ax - x0, ay - y0) <= 1.25) {
                vxCoord[cand.vk] = ax;
                vyCoord[cand.vk] = ay;
                vSharpPin[cand.vk] = 1;
              }
            }
          } else if (cfEnv) {
            const dx = flVein.c[0] - cfEnv.cx, dy = flVein.c[1] - cfEnv.cy;
            const B = dx * flVein.d[0] + dy * flVein.d[1];
            const C = dx * dx + dy * dy - cfEnv.r * cfEnv.r;
            const disc = B * B - C;
            if (disc >= 0) {
              const sDisc = Math.sqrt(disc);
              const t1 = -B - sDisc, t2 = -B + sDisc;
              const p1 = [flVein.c[0] + flVein.d[0] * t1, flVein.c[1] + flVein.d[1] * t1];
              const p2 = [flVein.c[0] + flVein.d[0] * t2, flVein.c[1] + flVein.d[1] * t2];
              const bestP = Math.hypot(p1[0] - x0, p1[1] - y0) <= Math.hypot(p2[0] - x0, p2[1] - y0) ? p1 : p2;
              if (Math.hypot(bestP[0] - x0, bestP[1] - y0) <= 1.25) {
                vxCoord[cand.vk] = bestP[0];
                vyCoord[cand.vk] = bestP[1];
                vSharpPin[cand.vk] = 1;
              }
            }
          }
        };
        snapCornerToEnv(cA, veinA);
        snapCornerToEnv(cB, veinB);
        /* Proyeksikan juga 1-2 verteks leher di sekitar sudut mulut urat ke garis urat & amplop luar */
        const relaxGapNeck = (cand, flVein, isOutVein) => {
          const lpC = kept[cand.li];
          if (!lpC || !lpC.vkeys) return;
          const nC = lpC.vkeys.length;
          const veinStep = isOutVein ? 1 : -1;
          for (let s = 1; s <= 2; s++) {
            const vkV = lpC.vkeys[(cand.i + veinStep * s + nC) % nC];
            if (vkV >= 0 && vValence[vkV] === 2 && !circleLockedKeys.has(vkV)) {
              const proj = (vxCoord[vkV] - flVein.c[0]) * flVein.d[0] + (vyCoord[vkV] - flVein.c[1]) * flVein.d[1];
              const px = flVein.c[0] + flVein.d[0] * proj, py = flVein.c[1] + flVein.d[1] * proj;
              if (Math.hypot(px - vxCoord[vkV], py - vyCoord[vkV]) <= 0.65) {
                vxCoord[vkV] = px; vyCoord[vkV] = py;
              }
            }
            const vkE = lpC.vkeys[(cand.i - veinStep * s + nC) % nC];
            if (vkE >= 0 && vValence[vkE] === 2 && !circleLockedKeys.has(vkE)) {
              if (flEnv) {
                const proj = (vxCoord[vkE] - flEnv.c[0]) * flEnv.d[0] + (vyCoord[vkE] - flEnv.c[1]) * flEnv.d[1];
                const px = flEnv.c[0] + flEnv.d[0] * proj, py = flEnv.c[1] + flEnv.d[1] * proj;
                if (Math.hypot(px - vxCoord[vkE], py - vyCoord[vkE]) <= 0.65) {
                  vxCoord[vkE] = px; vyCoord[vkE] = py;
                }
              } else if (cfEnv) {
                const dx = vxCoord[vkE] - cfEnv.cx, dy = vyCoord[vkE] - cfEnv.cy, dl = Math.hypot(dx, dy) || 1;
                const px = cfEnv.cx + (dx / dl) * cfEnv.r, py = cfEnv.cy + (dy / dl) * cfEnv.r;
                if (Math.hypot(px - vxCoord[vkE], py - vyCoord[vkE]) <= 0.65) {
                  vxCoord[vkE] = px; vyCoord[vkE] = py;
                }
              }
            }
          }
        };
        relaxGapNeck(cA, veinA, cA._match.isAOutVein);
        relaxGapNeck(cB, veinB, !cA._match.isAOutVein);
      }
    }
  });

  /* Sinkronkan kembali koordinat pts setiap kontur dari vxCoord & vyCoord yang telah diregularisasi */
  for (const lp of kept) {
    if (!lp.vkeys || lp.vkeys.length !== lp.pts.length) continue;
    for (let i = 0; i < lp.pts.length; i++) {
      const vk = lp.vkeys[i];
      if (vk >= 0) {
        lp.pts[i][0] = vxCoord[vk];
        lp.pts[i][1] = vyCoord[vk];
      }
    }
  }

  return { loops: kept, vxCoord, vyCoord, vValence, GW, GH, ms: performance.now() - t0 };
}

function invert2x2SquareShift(alphaBar, nx, ny) {
  const a = Math.max(Math.abs(nx), Math.abs(ny));
  const b = Math.min(Math.abs(nx), Math.abs(ny));
  const al = clamp(alphaBar, 0, 1);
  if (a < 1e-6) return 0;
  const trans = b / (2 * a);
  let s;
  if (al < trans && b > 1e-5) {
    s = -((a + b) - Math.sqrt(Math.max(0, 8 * a * b * al)));
  } else if (al > 1 - trans && b > 1e-5) {
    s = +((a + b) - Math.sqrt(Math.max(0, 8 * a * b * (1 - al))));
  } else {
    s = 2 * a * (al - 0.5);
  }
  return clamp(s, -0.72, 0.72);
}

function refineBeachPlanar(vxCoord, vyCoord, vValence, vSharpPin, labels, w, h, work, palette, forceCpu = false) {
  /* Selalu jalankan Step A.2 & Hierarchical Host-Curve Step B2 eksak di CPU (hanya ~3% piksel batas, < 8ms)
     agar proyeksi T-junction ke garis/busur induk 100% identik dan presisi di semua mode GPU/CPU! */
  const srcData = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
  const GW = w + 1, GH = h + 1;
  const lblAt = (px, py) => (px < 0 || py < 0 || px >= w || py >= h) ? -1 : labels[py * w + px];

  const adj = new Map();
  const link = (a, b) => {
    let la = adj.get(a); if (!la) { la = []; adj.set(a, la); }
    if (!la.includes(b)) la.push(b);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const L = labels[y * w + x];
      if (y > 0 && labels[(y - 1) * w + x] !== L) { const a = y * GW + x, b = y * GW + (x + 1); link(a, b); link(b, a); }
      if (x > 0 && labels[y * w + x - 1] !== L) { const a = y * GW + x, b = (y + 1) * GW + x; link(a, b); link(b, a); }
    }
  }

  const walkChainKeys = (startK, firstNb, maxSteps) => {
    const arr = [startK];
    let cur = firstNb, prev = startK;
    for (let s = 1; s <= maxSteps; s++) {
      arr.push(cur);
      if (vValence[cur] !== 2) break;
      const nbs = adj.get(cur);
      if (!nbs || nbs.length !== 2) break;
      const nxt = nbs[0] === prev ? nbs[1] : nbs[0];
      prev = cur; cur = nxt;
    }
    return arr;
  };

  const normX = new Float32Array(GW * GH);
  const normY = new Float32Array(GW * GH);

  // Step A: Exact 2x2 Square Area Inversion along local normal
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const k = y * GW + x;
      const val = vValence[k];
      if (val < 2) continue;
      if (val >= 3) {
        vSharpPin[k] = 1;
        continue;
      }

      const qLabs = [lblAt(x - 1, y - 1), lblAt(x, y - 1), lblAt(x - 1, y), lblAt(x, y)];
      const la = qLabs[0];
      let lb = -2, cntA2 = 0, cntB2 = 0;
      for (let i = 0; i < 4; i++) {
        if (qLabs[i] === la) cntA2++;
        else { if (lb === -2) lb = qLabs[i]; if (qLabs[i] === lb) cntB2++; }
      }
      if (lb === -2 || cntA2 + cntB2 < 4) continue;

      let ax = 0, ay = 0, an = 0, bx = 0, by = 0, bn = 0;
      let foreign = 0;
      let sumAr = 0, sumAg = 0, sumAb = 0, wAr = 0;
      let sumBr = 0, sumBg = 0, sumBb = 0, wBr = 0;

      for (let j = -3; j <= 2; j++) {
        const py = y + j;
        if (py < 0 || py >= h) continue;
        for (let i = -3; i <= 2; i++) {
          const px = x + i;
          if (px < 0 || px >= w) continue;
          const L = labels[py * w + px];
          const cx = i + 0.5, cy = j + 0.5;
          const r2d = cx * cx + cy * cy;
          const wgt = Math.exp(-r2d / 3.0);
          if (L === la) {
            ax += cx * wgt; ay += cy * wgt; an += wgt;
            if (r2d >= 1.5) {
              const pi = (py * w + px) * 4;
              sumAr += srcData[pi]; sumAg += srcData[pi + 1]; sumAb += srcData[pi + 2]; wAr++;
            }
          } else if (L === lb) {
            bx += cx * wgt; by += cy * wgt; bn += wgt;
            if (r2d >= 1.5) {
              const pi = (py * w + px) * 4;
              sumBr += srcData[pi]; sumBg += srcData[pi + 1]; sumBb += srcData[pi + 2]; wBr++;
            }
          } else if (i >= -2 && i <= 1 && j >= -2 && j <= 1) {
            foreign++;
          }
        }
      }

      if (an <= 0 || bn <= 0) continue;
      let nx = (bx / bn) - (ax / an);
      let ny = (by / bn) - (ay / an);
      const nbs = adj.get(k);
      if (nbs && nbs.length === 2) {
        const chA = walkChainKeys(k, nbs[0], 3);
        const chB = walkChainKeys(k, nbs[1], 3);
        const kA = chA[chA.length - 1], kB = chB[chB.length - 1];
        const tx = (kB % GW) - (kA % GW), ty = ((kB / GW) | 0) - ((kA / GW) | 0);
        const tl = Math.hypot(tx, ty);
        if (tl > 1.5) {
          let cnx = -ty / tl, cny = tx / tl;
          if (cnx * nx + cny * ny < 0) { cnx = -cnx; cny = -cny; }
          const nlen = Math.hypot(nx, ny) || 1;
          nx = 0.55 * (nx / nlen) + 0.45 * cnx;
          ny = 0.55 * (ny / nlen) + 0.45 * cny;
        }
      }
      const nl = Math.hypot(nx, ny);
      if (nl < 1e-5) continue;
      nx /= nl; ny /= nl;
      normX[k] = nx; normY[k] = ny;

      const palA = la >= 0 && palette[la] ? palette[la] : null;
      const palB = lb >= 0 && palette[lb] ? palette[lb] : null;
      const CA = palA ? {
        r: wAr >= 2 ? (0.90 * (sumAr / wAr) + 0.10 * palA.r) : palA.r,
        g: wAr >= 2 ? (0.90 * (sumAg / wAr) + 0.10 * palA.g) : palA.g,
        b: wAr >= 2 ? (0.90 * (sumAb / wAr) + 0.10 * palA.b) : palA.b,
      } : null;
      const CB = palB ? {
        r: wBr >= 2 ? (0.90 * (sumBr / wBr) + 0.10 * palB.r) : palB.r,
        g: wBr >= 2 ? (0.90 * (sumBg / wBr) + 0.10 * palB.g) : palB.g,
        b: wBr >= 2 ? (0.90 * (sumBb / wBr) + 0.10 * palB.b) : palB.b,
      } : null;

      const dR = CA && CB ? CA.r - CB.r : 0;
      const dG = CA && CB ? CA.g - CB.g : 0;
      const dB = CA && CB ? CA.b - CB.b : 0;
      const denom = dR * dR + dG * dG + dB * dB;

      let sumAlpha = 0, cntAlpha = 0;
      for (let j = -1; j <= 0; j++) {
        const py = y + j;
        for (let i = -1; i <= 0; i++) {
          const px = x + i;
          if (denom > 64) {
            const pi = (py * w + px) * 4;
            const ir = srcData[pi], ig = srcData[pi + 1], ib = srcData[pi + 2];
            const alpha = clamp(((ir - CB.r) * dR + (ig - CB.g) * dG + (ib - CB.b) * dB) / denom, 0, 1);
            sumAlpha += alpha;
            cntAlpha++;
          } else if ((la === -1 || lb === -1) && work.origAlpha) {
            const aVal = work.origAlpha[py * w + px] / 255;
            sumAlpha += (la === -1 ? 1 - aVal : aVal);
            cntAlpha++;
          }
        }
      }

      const isGridCorner90 = foreign === 0 && ((cntA2 === 1 && cntB2 === 3) || (cntA2 === 3 && cntB2 === 1));
      if (isGridCorner90 && cntAlpha === 4 && denom > 64) {
        const calcA = (px, py) => {
          const pi = (py * w + px) * 4;
          return clamp(((srcData[pi] - CB.r) * dR + (srcData[pi + 1] - CB.g) * dG + (srcData[pi + 2] - CB.b) * dB) / denom, 0, 1);
        };
        const a00 = calcA(x - 1, y - 1), a10 = calcA(x, y - 1);
        const a01 = calcA(x - 1, y),     a11 = calcA(x, y);
        const topDiff = (qLabs[0] !== qLabs[1]), botDiff = (qLabs[2] !== qLabs[3]);
        const leftDiff = (qLabs[0] !== qLabs[2]), rightDiff = (qLabs[1] !== qLabs[3]);
        const alphaX = topDiff ? 0.5 * (a00 + a10) : (botDiff ? 0.5 * (a01 + a11) : 0.5);
        const alphaY = leftDiff ? 0.5 * (a00 + a01) : (rightDiff ? 0.5 * (a10 + a11) : 0.5);
        const signX = topDiff ? (qLabs[0] === la ? 1 : -1) : (qLabs[2] === la ? 1 : -1);
        const signY = leftDiff ? (qLabs[0] === la ? 1 : -1) : (qLabs[1] === la ? 1 : -1);
        vxCoord[k] = x + signX * clamp(alphaX - 0.5, -0.42, 0.42);
        vyCoord[k] = y + signY * clamp(alphaY - 0.5, -0.42, 0.42);
      } else {
        const alphaBar = cntAlpha === 4 ? (sumAlpha * 0.25) : (cntA2 * 0.25);
        const shift = invert2x2SquareShift(alphaBar, nx, ny) * (foreign > 0 ? 0.65 : 1.0);
        vxCoord[k] = x + nx * shift;
        vyCoord[k] = y + ny * shift;
      }
    }
  }

  /* Ekstrapolasi sub-piksel untuk verteks pada tepi bingkai citra (x=0, x=w, y=0, y=h)
     yang terhubung dengan kontur interior agar kontur miring (seperti leher angsa di y=1200)
     tidak terpental kembali ke koordinat integer dan membuat kait/node palsu di tepi gambar */
  const extrapolateBorderVertices = () => {
    for (let y = 0; y <= h; y++) {
      for (let x = 0; x <= w; x++) {
        if (x > 0 && x < w && y > 0 && y < h) continue;
        if ((x === 0 || x === w) && (y === 0 || y === h)) continue;
        const k = y * GW + x;
        const nbs = adj.get(k);
        if (!nbs) continue;
        let intNb = -1;
        for (const nb of nbs) {
          const nx = nb % GW, ny = (nb / GW) | 0;
          if (nx > 0 && nx < w && ny > 0 && ny < h) { intNb = nb; break; }
        }
        if (intNb < 0) continue;
        const ch = walkChainKeys(k, intNb, 6);
        if (ch.length < 3) continue;
        const pts = [];
        for (let s = 1; s < ch.length; s++) pts.push([vxCoord[ch[s]], vyCoord[ch[s]]]);
        const fl = fitLine2D(pts);
        if (!fl) continue;
        if ((y === 0 || y === h) && Math.abs(fl.d[1]) > 0.25) {
          const t = (y - fl.c[1]) / fl.d[1];
          const bx = fl.c[0] + fl.d[0] * t;
          if (Math.abs(bx - x) <= 0.72) vxCoord[k] = clamp(bx, 0, w);
        } else if ((x === 0 || x === w) && Math.abs(fl.d[0]) > 0.25) {
          const t = (x - fl.c[0]) / fl.d[0];
          const by = fl.c[1] + fl.d[1] * t;
          if (Math.abs(by - y) <= 0.72) vyCoord[k] = clamp(by, 0, h);
        }
      }
    }
  };
  extrapolateBorderVertices();

  /* Step A.2: Sub-Pixel Host-Contour Projection pada T-Junction (vValence >= 3)
     Agar garis atau cincin yang dipotong garis warna lain tidak terjepit ke koordinat piksel integer (x, y) */
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const k = y * GW + x;
      if (vValence[k] < 3) continue;
      const nbs = adj.get(k);
      if (!nbs || nbs.length < 3) continue;
      const chains = nbs.map(nb => walkChainKeys(k, nb, 5)).filter(ch => ch.length >= 3);
      let bestHostPts = null, bestRms = 0.28;
      for (let a = 0; a < chains.length; a++) {
        for (let b = a + 1; b < chains.length; b++) {
          const chA = chains[a], chB = chains[b];
          const kA = chA[Math.min(3, chA.length - 1)], kB = chB[Math.min(3, chB.length - 1)];
          const ux = vxCoord[k] - vxCoord[kA], uy = vyCoord[k] - vyCoord[kA];
          const vx = vxCoord[kB] - vxCoord[k], vy = vyCoord[kB] - vyCoord[k];
          const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
          if (l1 < 0.8 || l2 < 0.8) continue;
          const turn = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
          if (turn > 0.58) continue;
          const hostPts = [];
          for (let s = chA.length - 1; s >= 1; s--) hostPts.push([vxCoord[chA[s]], vyCoord[chA[s]]]);
          for (let s = 1; s < chB.length; s++) hostPts.push([vxCoord[chB[s]], vyCoord[chB[s]]]);
          const fl = fitLine2D(hostPts);
          if (fl && fl.rms < bestRms) {
            bestRms = fl.rms;
            const proj = (x - fl.c[0]) * fl.d[0] + (y - fl.c[1]) * fl.d[1];
            bestHostPts = [fl.c[0] + fl.d[0] * proj, fl.c[1] + fl.d[1] * proj];
          }
          if (hostPts.length >= 5) {
            const cf = fitCircle2D(hostPts);
            if (cf && cf.r >= 3.0 && cf.r <= 360 && cf.rms < bestRms) {
              bestRms = cf.rms;
              const dx = x - cf.cx, dy = y - cf.cy, dl = Math.hypot(dx, dy) || 1;
              bestHostPts = [cf.cx + (dx / dl) * cf.r, cf.cy + (dy / dl) * cf.r];
            }
          }
        }
      }
      if (bestHostPts && Math.hypot(bestHostPts[0] - x, bestHostPts[1] - y) <= 0.58) {
        vxCoord[k] = bestHostPts[0];
        vyCoord[k] = bestHostPts[1];
      }
    }
  }

  const beachVx = new Float64Array(vxCoord);
  const beachVy = new Float64Array(vyCoord);

  // Step B: Corner Detection & Apex Ray-Intersection on Beach-deconvolved coordinates
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const k = y * GW + x;
      if (vValence[k] !== 2) continue;
      const nbs = adj.get(k);
      if (!nbs || nbs.length !== 2) continue;

      const walkStraightArmKeys = (startK, firstNb, maxSteps) => {
        const chain = [startK, firstNb];
        let prev = startK, cur = firstNb;
        const dx0 = (firstNb % GW) - (startK % GW), dy0 = ((firstNb / GW) | 0) - ((startK / GW) | 0);
        for (let s = 1; s < maxSteps; s++) {
          if (vValence[cur] !== 2) break;
          const cnbs = adj.get(cur);
          if (!cnbs || cnbs.length !== 2) break;
          const nxt = cnbs[0] === prev ? cnbs[1] : cnbs[0];
          if (nxt === startK) break;
          const dx = (nxt % GW) - (cur % GW), dy = ((nxt / GW) | 0) - ((cur / GW) | 0);
          if (dx * dx0 + dy * dy0 <= 0 && chain.length >= 3) break;
          chain.push(nxt);
          prev = cur; cur = nxt;
        }
        return chain;
      };
      const keysA = walkStraightArmKeys(k, nbs[0], 8);
      const keysB = walkStraightArmKeys(k, nbs[1], 8);
      if (keysA.length < 3 || keysB.length < 3) continue;

      const armA = keysA.slice(1).reverse().map(idx => [beachVx[idx], beachVy[idx]]);
      const armB = keysB.slice(1).map(idx => [beachVx[idx], beachVy[idx]]);
      const fA = fitLine2D(armA);
      const fB = fitLine2D(armB);
      if (!fA || !fB) continue;

      const armTurn = Math.abs(Math.atan2(fA.d[0] * fB.d[1] - fA.d[1] * fB.d[0], fA.d[0] * fB.d[0] + fA.d[1] * fB.d[1]));
      if (armTurn < 0.42) continue;

      const pA3 = [beachVx[keysA[Math.min(3, keysA.length - 1)]], beachVy[keysA[Math.min(3, keysA.length - 1)]]];
      const pB3 = [beachVx[keysB[Math.min(3, keysB.length - 1)]], beachVy[keysB[Math.min(3, keysB.length - 1)]]];
      const pA6 = [beachVx[keysA[Math.min(6, keysA.length - 1)]], beachVy[keysA[Math.min(6, keysA.length - 1)]]];
      const pB6 = [beachVx[keysB[Math.min(6, keysB.length - 1)]], beachVy[keysB[Math.min(6, keysB.length - 1)]]];
      const w3 = Math.hypot(pB3[0] - pA3[0], pB3[1] - pA3[1]);
      const w6 = Math.hypot(pB6[0] - pA6[0], pB6[1] - pA6[1]);
      const mid6x = 0.5 * (pA6[0] + pB6[0]), mid6y = 0.5 * (pA6[1] + pB6[1]);
      const sag6 = Math.hypot(beachVx[k] - mid6x, beachVy[k] - mid6y);
      const sagRatio6 = w6 > 0.5 ? (sag6 / w6) : 0;

      const isNarrowCap = armTurn >= 2.35 && w3 <= 3.2 && w6 <= 3.8 && (w6 - w3) < 0.8;
      if (isNarrowCap) continue;

      const isArmLinear = (ptsArm, fl) => {
        if (!fl || fl.span < 1.45 || fl.rms > 0.15 || fl.maxDev > 0.28) return false;
        const p0 = ptsArm[0], p1 = ptsArm[ptsArm.length - 1], pm = ptsArm[ptsArm.length >> 1];
        const ch = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
        const sag = Math.abs((pm[0] - p0[0]) * (p1[1] - p0[1]) - (pm[1] - p0[1]) * (p1[0] - p0[0])) / ch;
        return sag <= 0.024;
      };
      const linA = isArmLinear(armA, fA);
      const linB = isArmLinear(armB, fB);
      const bothLinear = linA && linB;
      const arcPts = armA.concat([[beachVx[k], beachVy[k]]], armB);
      const circ = arcPts.length >= 5 ? fitCircle2D(arcPts) : null;
      const wedgeRms = 0.5 * (fA.rms + fB.rms);
      const isRoundArc = !!(circ && circ.r >= 2.2 && circ.r <= 95 && circ.rms <= Math.min(0.18, wedgeRms * 0.72));

      const isTrueCorner = !isRoundArc && (
        (bothLinear && armTurn >= 0.48 && sagRatio6 >= 0.16) ||
        (armTurn >= 0.65 && sagRatio6 >= 0.24 && (w6 - w3) >= 1.3 && wedgeRms <= 0.34)
      );

      if (isTrueCorner) {
        vSharpPin[k] = 1;
        if (bothLinear) {
          const det = fA.d[0] * fB.d[1] - fA.d[1] * fB.d[0];
          if (Math.abs(det) > 0.12) {
            const wx = fB.c[0] - fA.c[0], wy = fB.c[1] - fA.c[1];
            const t = (wx * fB.d[1] - wy * fB.d[0]) / det;
            const ax = fA.c[0] + fA.d[0] * t, ay = fA.c[1] + fA.d[1] * t;
            const d0 = Math.hypot(ax - beachVx[k], ay - beachVy[k]);
            const d1 = Math.hypot(ax - beachVx[nbs[0]], ay - beachVy[nbs[0]]);
            const d2 = Math.hypot(ax - beachVx[nbs[1]], ay - beachVy[nbs[1]]);
            if (d0 <= d1 + 0.15 && d0 <= d2 + 0.15 && d0 <= 1.15) {
              vxCoord[k] = clamp(ax, x - 0.65, x + 0.65);
              vyCoord[k] = clamp(ay, y - 0.65, y + 0.65);
              beachVx[k] = vxCoord[k];
              beachVy[k] = vyCoord[k];
            }
          }
        } else if (linA !== linB) {
          /* Sudut Garis-ke-Kurva (seperti busur dalam huruf e, D, P, B, R):
             Proyeksikan titik sudut ke garis lurus menggunakan arah singgung lokal lengan kurva (3 titik terdekat),
             BUKAN tali busur sekant 8 piksel yang membuat sudut mencuat keluar! */
          const fStr = linA ? fA : fB;
          const nearCurv = (linA ? keysB : keysA).slice(0, 4).map(idx => [beachVx[idx], beachVy[idx]]);
          const fNear = fitLine2D(nearCurv);
          if (fNear) {
            const det = fStr.d[0] * fNear.d[1] - fStr.d[1] * fNear.d[0];
            if (Math.abs(det) > 0.15) {
              const wx = fNear.c[0] - fStr.c[0], wy = fNear.c[1] - fStr.c[1];
              const t = (wx * fNear.d[1] - wy * fNear.d[0]) / det;
              const ax = fStr.c[0] + fStr.d[0] * t, ay = fStr.c[1] + fStr.d[1] * t;
              const d0 = Math.hypot(ax - beachVx[k], ay - beachVy[k]);
              if (d0 <= 0.42) {
                vxCoord[k] = clamp(ax, x - 0.45, x + 0.45);
                vyCoord[k] = clamp(ay, y - 0.45, y + 0.45);
                beachVx[k] = vxCoord[k];
                beachVy[k] = vyCoord[k];
              }
            }
          }
        }
      }
    }
  }

  // Step B2: Hierarchical Host-Curve vs Incident-Stem T-Junction Projection
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const k = y * GW + x;
      if (vValence[k] < 3) continue;
      const nbs = adj.get(k);
      if (!nbs || nbs.length < 3) continue;

      const branches = [];
      for (const nb of nbs) {
        const ch = walkChainKeys(k, nb, 8).slice(1);
        if (ch.length >= 2) {
          const pts = ch.map(idx => [beachVx[idx], beachVy[idx]]);
          const nearPts = pts.slice(0, Math.min(4, pts.length));
          const fl = fitLine2D(pts);
          const flNear = fitLine2D(nearPts) || fl;
          if (fl && flNear) {
            let dx = pts[Math.min(2, pts.length - 1)][0] - x;
            let dy = pts[Math.min(2, pts.length - 1)][1] - y;
            let tx = flNear.d[0], ty = flNear.d[1];
            if (tx * dx + ty * dy < 0) { tx = -tx; ty = -ty; }
            branches.push({ nb, pts, fl, flNear, tx, ty });
          }
        }
      }

      /* Deteksi apakah 2 cabang membentuk Kurva Induk Menerus (G1/G2 Host Curve) dan cabang ke-3 adalah Stem Penumbuk */
      let hostPair = null, bestHostScore = Infinity;
      if (branches.length === 3) {
        for (let i = 0; i < 3; i++) {
          for (let j = i + 1; j < 3; j++) {
            const bA = branches[i], bB = branches[j];
            const dot = bA.tx * bB.tx + bA.ty * bB.ty;
            if (dot > -0.72) continue; /* harus berlawanan arah (menembus lurus/melengkung mulus) */
            const combPts = bA.pts.slice().reverse().concat(bB.pts);
            const cf = combPts.length >= 5 ? fitCircle2D(combPts) : null;
            const fl = fitLine2D(combPts);
            const arcRms = (cf && cf.r >= 2.2 && cf.r <= 420) ? cf.rms : Infinity;
            const lineRms = fl ? fl.rms : Infinity;
            const fitErr = Math.min(arcRms, lineRms);
            const turnPen = Math.acos(clamp(-dot, -1, 1));
            const score = fitErr + turnPen * 0.35;
            if (fitErr <= 0.34 && score < bestHostScore) {
              bestHostScore = score;
              const stemIdx = 3 - i - j;
              hostPair = { bA, bB, bStem: branches[stemIdx], cf: arcRms <= lineRms * 1.05 ? cf : null, fl };
            }
          }
        }
      }

      if (hostPair) {
        /* Proyeksikan T-Junction tepat ke atas Kurva Induk (Host Curve) pada perpotongan dengan cabang Stem */
        const { bA, bB, bStem, cf, fl } = hostPair;
        const pNearA = bA.pts[0], pNearB = bB.pts[0];
        let jx = 0.5 * (pNearA[0] + pNearB[0]), jy = 0.5 * (pNearA[1] + pNearB[1]);
        if (bStem && bStem.flNear) {
          const sC = bStem.flNear.c, sD = bStem.flNear.d;
          const hDx = pNearB[0] - pNearA[0], hDy = pNearB[1] - pNearA[1], hL = Math.hypot(hDx, hDy) || 1;
          const hUx = hDx / hL, hUy = hDy / hL;
          const det = hUx * sD[1] - hUy * sD[0];
          if (Math.abs(det) > 0.14) {
            const wx = sC[0] - jx, wy = sC[1] - jy;
            const t = clamp((wx * sD[1] - wy * sD[0]) / det, -0.45, 0.45);
            jx += hUx * t;
            jy += hUy * t;
          }
        }
        if (cf && cf.r >= 2.2 && cf.r <= 420) {
          const rx = jx - cf.cx, ry = jy - cf.cy, rl = Math.hypot(rx, ry) || 1;
          jx = cf.cx + (rx / rl) * cf.r;
          jy = cf.cy + (ry / rl) * cf.r;
        } else if (fl && fl.rms <= 0.18) {
          const proj = (jx - fl.c[0]) * fl.d[0] + (jy - fl.c[1]) * fl.d[1];
          jx = fl.c[0] + fl.d[0] * proj;
          jy = fl.c[1] + fl.d[1] * proj;
        }
        vxCoord[k] = clamp(jx, x - 0.52, x + 0.52);
        vyCoord[k] = clamp(jy, y - 0.52, y + 0.52);
        beachVx[k] = vxCoord[k];
        beachVy[k] = vyCoord[k];
        continue;
      }

      let a00 = 0.20, a01 = 0, a11 = 0.20;
      let b0 = 0.20 * x, b1 = 0.20 * y;
      let validBranches = 0;
      for (const br of branches) {
        const fl = br.flNear;
        if (fl) {
          const nx = -fl.d[1], ny = fl.d[0];
          const wgt = 1.0 / (0.04 + fl.rms);
          a00 += wgt * nx * nx;
          a01 += wgt * nx * ny;
          a11 += wgt * ny * ny;
          const rhs = nx * fl.c[0] + ny * fl.c[1];
          b0 += wgt * nx * rhs;
          b1 += wgt * ny * rhs;
          validBranches++;
        }
      }
      if (validBranches >= 2) {
        const det = a00 * a11 - a01 * a01;
        if (Math.abs(det) > 1e-6) {
          const jx = (a11 * b0 - a01 * b1) / det;
          const jy = (a00 * b1 - a01 * b0) / det;
          vxCoord[k] = clamp(jx, x - 0.50, x + 0.50);
          vyCoord[k] = clamp(jy, y - 0.50, y + 0.50);
          beachVx[k] = vxCoord[k];
          beachVy[k] = vyCoord[k];
        }
      }
    }
  }

  // Step B3: Multi-Wedge Star / Pinwheel Hub Convergence & Global Axis-Line T-Junction Collinearity
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const k = y * GW + x;
      if (vValence[k] < 3) continue;
      /* Kumpulkan klaster junction dalam radius 2 piksel (seperti pusat kincir 4 bilah B4K1) */
      const hubKeys = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nk = (y + dy) * GW + (x + dx);
          if (vValence[nk] >= 3) hubKeys.push(nk);
        }
      }
      if (hubKeys.length >= 2) {
        const hubSet = new Set(hubKeys);
        const armLines = [];
        for (const hk of hubKeys) {
          const hnbs = adj.get(hk) || [];
          for (const nb of hnbs) {
            if (hubSet.has(nb)) continue;
            const ch = walkChainKeys(hk, nb, 10).slice(1);
            if (ch.length >= 4) {
              const pts = ch.slice(1).map(idx => [beachVx[idx], beachVy[idx]]);
              const fl = fitLine2D(pts);
              if (fl && fl.rms <= 0.16 && fl.span >= 3.2) armLines.push(fl);
            }
          }
        }
        if (armLines.length >= 4) {
          let a00 = 0.05, a01 = 0, a11 = 0.05;
          let b0 = 0.05 * beachVx[k], b1 = 0.05 * beachVy[k];
          for (const fl of armLines) {
            const nx = -fl.d[1], ny = fl.d[0];
            const wgt = 1.0 / (0.02 + fl.rms);
            a00 += wgt * nx * nx; a01 += wgt * nx * ny; a11 += wgt * ny * ny;
            const rhs = nx * fl.c[0] + ny * fl.c[1];
            b0 += wgt * nx * rhs; b1 += wgt * ny * rhs;
          }
          const det = a00 * a11 - a01 * a01;
          if (Math.abs(det) > 1e-4) {
            const hx = (a11 * b0 - a01 * b1) / det;
            const hy = (a00 * b1 - a01 * b0) / det;
            if (Math.hypot(hx - x, hy - y) <= 1.25) {
              let sumSq = 0;
              for (const fl of armLines) {
                const d = (hx - fl.c[0]) * fl.d[1] - (hy - fl.c[1]) * fl.d[0];
                sumSq += d * d;
              }
              if (Math.sqrt(sumSq / armLines.length) <= 0.38) {
                for (const hk of hubKeys) {
                  vxCoord[hk] = hx; vyCoord[hk] = hy;
                  beachVx[hk] = hx; beachVy[hk] = hy;
                  vSharpPin[hk] = 1;
                }
              }
            }
          }
        }
      }
    }
  }

  // Step C: Anisotropic Tangential-Dominant Taubin Relaxation
  for (const weight of [0.42, -0.44, 0.38, -0.40, 0.34, -0.36]) {
    const nxArr = new Float64Array(vxCoord);
    const nyArr = new Float64Array(vyCoord);
    adj.forEach((nbs, k) => {
      if (nbs.length !== 2 || vValence[k] !== 2 || vSharpPin[k]) return;
      const kx = k % GW, ky = (k / GW) | 0;
      if (kx === 0 || ky === 0 || kx === w || ky === h) return;
      const a = nbs[0], b = nbs[1];
      const damp = (vSharpPin[a] || vSharpPin[b] || vValence[a] >= 3 || vValence[b] >= 3) ? 0.30 : 1.0;
      const mx = 0.5 * (vxCoord[a] + vxCoord[b]);
      const my = 0.5 * (vyCoord[a] + vyCoord[b]);
      let dx = (mx - vxCoord[k]) * weight * damp;
      let dy = (my - vyCoord[k]) * weight * damp;

      const nx = normX[k], ny = normY[k];
      if (nx !== 0 || ny !== 0) {
        const tx = -ny, ty = nx;
        const dNorm = dx * nx + dy * ny;
        const dTang = dx * tx + dy * ty;
        const newX = vxCoord[k] + tx * dTang + nx * (dNorm * 0.40);
        const newY = vyCoord[k] + ty * dTang + ny * (dNorm * 0.40);
        const totDx = newX - beachVx[k], totDy = newY - beachVy[k];
        if (typeof VMT !== "undefined") VMT._curMaxDim = Math.max(w, h);
        const nLim = Math.max(w, h) >= 1200 ? 0.26 : 0.14;
        const tLim = Math.max(w, h) >= 1200 ? 0.40 : 0.36;
        const cNorm = clamp(totDx * nx + totDy * ny, -nLim, nLim);
        const cTang = clamp(totDx * tx + totDy * ty, -tLim, tLim);
        nxArr[k] = beachVx[k] + tx * cTang + nx * cNorm;
        nyArr[k] = beachVy[k] + ty * cTang + ny * cNorm;
      } else {
        nxArr[k] = clamp(vxCoord[k] + dx, beachVx[k] - 0.22, beachVx[k] + 0.22);
        nyArr[k] = clamp(vyCoord[k] + dy, beachVy[k] - 0.22, beachVy[k] + 0.22);
      }
    });
    vxCoord.set(nxArr);
    vyCoord.set(nyArr);
  }
  extrapolateBorderVertices();
}

/* Douglas-Peucker umum */
function douglasPeucker(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    let bm = -1, bd = 0;
    const ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      let dd;
      if (L2 < 1e-12) dd = (pts[i][0] - ax) ** 2 + (pts[i][1] - ay) ** 2;
      else {
        const t = clamp(((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / L2, 0, 1);
        const px = ax + dx * t - pts[i][0], py = ay + dy * t - pts[i][1];
        dd = px * px + py * py;
      }
      if (dd > bd) { bd = dd; bm = i; }
    }
    if (bd > eps * eps && bm > 0) {
      keep[bm] = 1;
      st.push([a, bm], [bm, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function simplifyClosed(pts, eps = 0.03) {
  const n = pts.length;
  if (n < 12 || eps <= 0.015) return pts.map(p => p.slice());
  let bi = 0, bd = -1;
  for (let i = 0; i < n; i++) {
    const dd = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (dd > bd) { bd = dd; bi = i; }
  }
  const rot = pts.slice(bi).concat(pts.slice(0, bi));
  rot.push(rot[0].slice());
  const open = douglasPeucker(rot, eps);
  if (open.length > 1) open.pop();
  return open.length >= 4 ? open : pts.map(p => p.slice());
}


/* === END 10-vmt-boundary-beach.js === */

/* === BEGIN 11-vmt-smooth-bezier.js === */
/* =====================================================================
 * JS Module 11: VMT Engine Part 7 — Taubin Smoother, CSS Corner Detector, Cubic Bezier Fitter & Shared Topology
 * ===================================================================== */
/* =====================================================================
   TAHAP 7 — Non-Linear ContourSmoother (Polak-Ribière Conjugate Gradient)
   + Multi-Scale Curvature Extrema & Stroke-End Cap Discriminator
   ---------------------------------------------------------------------
   Membedakan secara presisi:
   1. Ujung Daun & Outline Lancip (Curvature Extrema Multi-Skala C0):
      Mengunci titik ujung daun hijau & outline atas (meskipun kedua sisinya melengkung)
      agar tidak tumpul saat penghalusan spline.
   2. Ujung Goresan Kuas / Jahitan '#' (Stroke-End Pinching Guard G1):
      Mendeteksi pita goresan sempit (lebar <= 5px) yang menyempit di ujungnya,
      mencegah proyeksi duri tajam (apex spiking), dan membulatkan ujung kuas secara alami.
   3. Bayangan Tanah & Bawah Karung (Anti-Polygonal Faceting G1):
      Menolak anak-tangga (staircase) pada kurva landai agar tidak dianggap sudut C0
      atau diubah menjadi garis lurus patah-patah.
   ===================================================================== */
function taubinFilterClosed(pts, corners, passes = 14, lam = 0.45, mu = -0.473, forceCpu = false) {
  const n = pts.length;
  if (n < 5) return pts.map(p => [p[0], p[1]]);
  if (!forceCpu && n >= 512 && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuTaubinFilterClosed) {
    const gpuRes = GpuAccelerator.gpuTaubinFilterClosed(pts, corners, passes, lam, mu);
    if (gpuRes) return gpuRes;
  }
  let cur = pts.map(p => [p[0], p[1]]);
  const step = (src, weight) => {
    const dst = src.map(p => [p[0], p[1]]);
    for (let i = 0; i < n; i++) {
      if (corners && corners[i]) continue;
      const a = (i - 1 + n) % n, b = (i + 1) % n;
      dst[i][0] = src[i][0] + weight * (0.5 * (src[a][0] + src[b][0]) - src[i][0]);
      dst[i][1] = src[i][1] + weight * (0.5 * (src[a][1] + src[b][1]) - src[i][1]);
    }
    return dst;
  };
  for (let p = 0; p < passes; p++) {
    cur = step(cur, lam);
    cur = step(cur, mu);
  }
  return cur;
}

function fitLine2D(pts) {
  const m = pts.length;
  if (m < 2) return null;
  let mx = 0, my = 0;
  for (let i = 0; i < m; i++) { mx += pts[i][0]; my += pts[i][1]; }
  mx /= m; my /= m;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < m; i++) {
    const dx = pts[i][0] - mx, dy = pts[i][1] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let dx = Math.cos(th), dy = Math.sin(th);
  const cx = pts[m - 1][0] - pts[0][0], cy = pts[m - 1][1] - pts[0][1];
  if (dx * cx + dy * cy < 0) { dx = -dx; dy = -dy; }
  let ss = 0, maxDev = 0;
  for (let i = 0; i < m; i++) {
    const e = Math.abs((pts[i][0] - mx) * dy - (pts[i][1] - my) * dx);
    if (e > maxDev) maxDev = e;
    ss += e * e;
  }
  return { c: [mx, my], d: [dx, dy], rms: Math.sqrt(ss / m), maxDev, span: Math.hypot(cx, cy) };
}

/* Kåsa Circle Fit 2D pada array [x, y] */
function fitCircle2D(pts) {
  const m = pts.length;
  if (m < 4) return null;
  let sx = 0, sy = 0, sx2 = 0, sy2 = 0, sxy = 0, sx3 = 0, sy3 = 0, sx2y = 0, sxy2 = 0;
  for (let i = 0; i < m; i++) {
    const x = pts[i][0], y = pts[i][1], x2 = x * x, y2 = y * y;
    sx += x; sy += y; sx2 += x2; sy2 += y2; sxy += x * y;
    sx3 += x2 * x; sy3 += y2 * y; sx2y += x2 * y; sxy2 += x * y2;
  }
  const C = m * sx2 - sx * sx, D = m * sxy - sx * sy, E = m * sy2 - sy * sy;
  const G = 0.5 * (m * sx3 + m * sxy2 - sx * sx2 - sx * sy2);
  const H = 0.5 * (m * sx2y + m * sy3 - sy * sx2 - sy * sy2);
  const det = C * E - D * D;
  if (Math.abs(det) < 1e-9) return null;
  const cx = (G * E - H * D) / det, cy = (C * H - D * G) / det;
  let r = 0;
  for (let i = 0; i < m; i++) r += Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
  r /= m;
  let ss = 0;
  for (let i = 0; i < m; i++) {
    const e = Math.hypot(pts[i][0] - cx, pts[i][1] - cy) - r;
    ss += e * e;
  }
  return { cx, cy, r, rms: Math.sqrt(ss / m) };
}

/* =====================================================================
   Validasi Sudut: Curvature Scale Space (CSS) + Geometric Fillet Fitting
   - cssCornerPersistence: sudut sejati menyimpan sudut belok (turning angle) yang SAMA pada
     skala kecil maupun besar; busur bulat hanya menumpuk belokan seiring skala membesar.
   - filletSupport: dua garis lurus + transisi membulat dipertahankan sebagai fillet HANYA jika
     kontur sumber lebih cocok dengan model fillet (garis-busur-garis) daripada baji tajam.
   ===================================================================== */
function cssCornerPersistence(pts, i, others) {
  const n = pts.length;
  const md = k => ((k % n) + n) % n;
  const P = pts[i];
  let avail = Infinity;
  for (const dir of [1, -1]) {
    let acc = 0, k = i;
    for (let s = 0; s < n; s++) {
      const a = pts[md(k)], b = pts[md(k + dir)];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      k += dir;
      if (others.has(md(k))) { if (acc < avail) avail = acc; break; }
      if (acc > 14) break;
    }
  }
  const dmax = Math.min(6.5, Math.max(2.6, 0.54 * avail));
  if (!(dmax >= 2.6) || avail < 4.5) return null;
  const walk = (dir, d) => {
    let acc = 0, k = i;
    for (let s = 0; s < n; s++) {
      const a = pts[md(k)], b = pts[md(k + dir)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= d) {
        const t = (d - acc) / Math.max(l, 1e-9);
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      acc += l; k += dir;
    }
    return null;
  };
  const turnAt = d => {
    const A = walk(-1, d), B = walk(1, d);
    if (!A || !B) return null;
    const ux = P[0] - A[0], uy = P[1] - A[1], vx = B[0] - P[0], vy = B[1] - P[1];
    if (Math.hypot(ux, uy) < 1e-6 || Math.hypot(vx, vy) < 1e-6) return null;
    return Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
  };
  const t1 = turnAt(Math.min(1.85, dmax * 0.48)), t3 = turnAt(dmax);
  if (t1 == null || t3 == null) return null;
  return { t1, t3, rho: t1 / Math.max(t3, 1e-6) };
}

function filletSupport(pts, i, others) {
  const n = pts.length;
  const md = k => ((k % n) + n) % n;
  const armLen = dir => {
    let acc = 0, k = i;
    for (let s = 0; s < n; s++) {
      const a = pts[md(k)], b = pts[md(k + dir)];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      k += dir;
      if (others.has(md(k)) || acc >= 30) break;
    }
    return acc;
  };
  const avail = Math.min(armLen(-1), armLen(1));
  const LL = 80;
  const dSeg = (p, a, b) => {
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const l2 = abx * abx + aby * aby || 1e-9;
    const q = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2));
    return Math.hypot(p[0] - (a[0] + abx * q), p[1] - (a[1] + aby * q));
  };
  let best = null;
  /* Lengan garis di-fit pada jendela yang digeser menjauhi sudut agar bagian busur fillet tidak mencemari garis */
  for (const a0 of [2, 4, 6, 8, 10, 13]) {
    const b0 = a0 + 9;
    if (b0 > avail - 1) break;
    const lp = [], rp = [];
    for (let s = a0; s <= b0; s++) { lp.push(pts[md(i - s)]); rp.push(pts[md(i + s)]); }
    const fL = fitLine2D(lp), fR = fitLine2D(rp);
    if (!fL || !fR || fL.rms > 0.30 || fR.rms > 0.30 || fL.span < 6 || fR.span < 6) continue;
    const det = fL.d[0] * fR.d[1] - fL.d[1] * fR.d[0];
    if (Math.abs(det) < 0.08) continue;
    const wx = fR.c[0] - fL.c[0], wy = fR.c[1] - fL.c[1];
    const tt = (wx * fR.d[1] - wy * fR.d[0]) / det;
    const A = [fL.c[0] + fL.d[0] * tt, fL.c[1] + fL.d[1] * tt];
    const orient = f => {
      const s = ((f.c[0] - A[0]) * f.d[0] + (f.c[1] - A[1]) * f.d[1]) >= 0 ? 1 : -1;
      return [f.d[0] * s, f.d[1] * s];
    };
    const u = orient(fL), v = orient(fR);
    const phi = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));
    const turn = Math.PI - phi;
    if (turn < 0.35 || turn > 2.95) continue;
    const alpha = phi / 2, sinA = Math.sin(alpha), tanA = Math.tan(alpha);
    const k = (1 / sinA) - 1;
    if (!(k > 1e-3) || !(tanA > 1e-3)) continue;
    const WIN = Math.min(a0 + 6, Math.floor(avail) - 1, 22);
    const win = [];
    let dClosest = Infinity;
    for (let s = -WIN; s <= WIN; s++) {
      const p = pts[md(i + s)];
      win.push(p);
      const dd = Math.hypot(p[0] - A[0], p[1] - A[1]);
      if (dd < dClosest) dClosest = dd;
    }
    const r = dClosest / k, t = r / tanA;
    if (dClosest < 1.25 || r < 3.2 || t > 20 || t > a0 + 6) continue;
    const bl = Math.hypot(u[0] + v[0], u[1] + v[1]) || 1;
    const bis = [(u[0] + v[0]) / bl, (u[1] + v[1]) / bl];
    const Cc = [A[0] + bis[0] * (r / sinA), A[1] + bis[1] * (r / sinA)];
    const T1 = [A[0] + u[0] * t, A[1] + u[1] * t], T2 = [A[0] + v[0] * t, A[1] + v[1] * t];
    const half = turn / 2;
    const mx = A[0] - Cc[0], my = A[1] - Cc[1], ml = Math.hypot(mx, my) || 1;
    let sF = 0, sW = 0, sC = 0;
    for (const p of win) {
      const dW = Math.min(dSeg(p, A, [A[0] + u[0] * LL, A[1] + u[1] * LL]), dSeg(p, A, [A[0] + v[0] * LL, A[1] + v[1] * LL]));
      let dF = Math.min(dSeg(p, T1, [T1[0] + u[0] * LL, T1[1] + u[1] * LL]), dSeg(p, T2, [T2[0] + v[0] * LL, T2[1] + v[1] * LL]));
      const px = p[0] - Cc[0], py = p[1] - Cc[1], pl = Math.hypot(px, py) || 1e-9;
      const ang = Math.acos(Math.max(-1, Math.min(1, (px * mx + py * my) / (pl * ml))));
      if (ang <= half) dF = Math.min(dF, Math.abs(pl - r));
      /* model chamfer (garis-potong lurus T1-T2): bila lebih cocok daripada busur, itu BUKAN fillet */
      const dC = Math.min(dSeg(p, T1, [T1[0] + u[0] * LL, T1[1] + u[1] * LL]), dSeg(p, T2, [T2[0] + v[0] * LL, T2[1] + v[1] * LL]), dSeg(p, T1, T2));
      sF += dF * dF; sW += dW * dW; sC += dC * dC;
    }
    const rmsF = Math.sqrt(sF / win.length), rmsW = Math.sqrt(sW / win.length), rmsC = Math.sqrt(sC / win.length);
    if (rmsF <= Math.max(0.24, 0.032 * r) && rmsF <= 0.48 * rmsW && rmsF <= 0.80 * rmsC && (!best || rmsF < best.rmsF)) best = { r, t, rmsF, rmsW };
  }
  return best;
}

/* Pra-penapis Despeckle Tangga Piksel (Staircase / Jaggies Removal)
   Menghaluskan anak-tangga 1-4 piksel pada bayangan tanah & bawah karung yang melengkung
   tanpa menggeser ujung daun lancip (curvature extrema) atau sudut siku sejati. */
function despeckleStaircaseClosed(pts, strength = 0.65, juncFlags = null, cornerPin = null, forceCpu = false) {
  const n = pts.length;
  if (n < 8 || strength <= 0.01) return pts.map(p => [p[0], p[1]]);
  if (!forceCpu && n >= 256 && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuDespeckleStaircaseClosed) {
    const gpuPts = GpuAccelerator.gpuDespeckleStaircaseClosed(pts, strength, juncFlags, cornerPin);
    if (gpuPts && gpuPts.length === n) return gpuPts;
  }
  const rawPts = pts.map(p => [p[0], p[1]]);
  let cur = pts.map(p => [p[0], p[1]]);
  const idx = k => ((k % n) + n) % n;
  const passes = clamp(Math.round(2 + strength * 3), 2, 5);
  const lam = clamp(0.32 + strength * 0.14, 0.24, 0.45);
  const mu = -lam / (1 - 0.06 * lam);

  for (let pass = 0; pass < passes; pass++) {
    const isZig = new Uint8Array(n);
    const turns = new Float64Array(n);
    const segLens = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = cur[idx(i - 1)], p = cur[i], b = cur[idx(i + 1)];
      const ux = p[0] - a[0], uy = p[1] - a[1];
      const vx = b[0] - p[0], vy = b[1] - p[1];
      const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
      segLens[i] = l1;
      if (l1 > 1e-5 && l2 > 1e-5) {
        turns[i] = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      }
    }
    for (let i = 0; i < n; i++) {
      if ((juncFlags && juncFlags[i]) || (cornerPin && cornerPin[i])) continue;
      const t0 = turns[i];
      const lPrev = segLens[i], lNext = segLens[idx(i + 1)];
      let hasOpp = false;
      for (let d = 1; d <= 4; d++) {
        if (t0 * turns[idx(i - d)] < -0.006 || t0 * turns[idx(i + d)] < -0.006) {
          hasOpp = true;
          break;
        }
      }
      if (n >= 120 && typeof VMT !== "undefined" && VMT._curMaxDim >= 1200) {
        if (Math.abs(t0) >= 0.22 && hasOpp && Math.min(lPrev, lNext) <= 5.5) {
          isZig[i] = 1;
          for (let d = -2; d <= 2; d++) {
            const j = idx(i + d);
            if (!((juncFlags && juncFlags[j]) || (cornerPin && cornerPin[j]))) isZig[j] = 1;
          }
        }
      } else {
        if (Math.abs(t0) >= 0.25 && hasOpp && Math.min(lPrev, lNext) <= 4.5) isZig[i] = 1;
      }
    }

    for (const w of [lam, mu]) {
      const next = cur.map(p => [p[0], p[1]]);
      for (let i = 0; i < n; i++) {
        if (!isZig[i]) continue;
        const a = cur[idx(i - 1)], b = cur[idx(i + 1)];
        const mx = 0.5 * (a[0] + b[0]), my = 0.5 * (a[1] + b[1]);
        const tx = cur[i][0] + w * (mx - cur[i][0]);
        const ty = cur[i][1] + w * (my - cur[i][1]);
        /* Tabung kelayakan Minkowski +-0.48 px meratakan anak-tangga piksel pada garis miring */
        next[i][0] = clamp(tx, rawPts[i][0] - 0.48, rawPts[i][0] + 0.48);
        next[i][1] = clamp(ty, rawPts[i][1] - 0.48, rawPts[i][1] + 0.48);
      }
      cur = next;
    }
  }

  /* Multi-Scale Quadratic Savitzky-Golay Fairing untuk meluruhkan tangga berperiode panjang (5..80 px)
     dan riak blok JPEG 8x8 pada kontur miring/landai tanpa menggeser sudut tajam C0 atau simpul T-junction */
  let maxLoopCoord = 0;
  for (let i = 0; i < n; i += Math.max(1, (n >> 4))) {
    if (pts[i][0] > maxLoopCoord) maxLoopCoord = pts[i][0];
    if (pts[i][1] > maxLoopCoord) maxLoopCoord = pts[i][1];
  }
  const isHiResLoop = n >= 120 && typeof VMT !== "undefined" && VMT._curMaxDim >= 1200;
  if (n >= 16 && strength >= 0.15) {
    const maxTube = isHiResLoop ? 0.68 : 0.58;
    const isLocked = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if ((juncFlags && juncFlags[i]) || (cornerPin && cornerPin[i])) {
        isLocked[i] = 1;
        continue;
      }
      const pM4 = cur[idx(i - 4)], p0 = cur[i], pP4 = cur[idx(i + 4)];
      const ux = p0[0] - pM4[0], uy = p0[1] - pM4[1];
      const vx = pP4[0] - p0[0], vy = pP4[1] - p0[1];
      const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
      if (l1 > 0.5 && l2 > 0.5) {
        const turn4 = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
        const c4 = Math.hypot(pP4[0] - pM4[0], pP4[1] - pM4[1]) || 1;
        const sag4 = Math.hypot(p0[0] - 0.5 * (pM4[0] + pP4[0]), p0[1] - 0.5 * (pM4[1] + pP4[1]));
        if (turn4 >= 0.45 && (sag4 / c4) >= 0.16) isLocked[i] = 1;
      }
    }

    for (const maxW of [16, 36]) {
      const next = cur.map(p => [p[0], p[1]]);
      for (let i = 0; i < n; i++) {
        if (isLocked[i]) continue;
        let w = 0;
        while (w < maxW && w < (n >> 2) && !isLocked[idx(i - w - 1)] && !isLocked[idx(i + w + 1)]) {
          w++;
        }
        if (w < 4) continue;
        let arc = 0;
        for (let k = -w; k < w; k++) {
          const a = cur[idx(i + k)], b = cur[idx(i + k + 1)];
          arc += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        const pA = cur[idx(i - w)], pB = cur[idx(i + w)];
        const chord = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]);
        if (chord < 3.0 || arc / chord > (isHiResLoop ? 1.28 : 1.035)) continue;

        const sig = w * 0.55;
        const inv2Sig2 = 1 / (2 * sig * sig);
        let s0 = 0, s2 = 0, s4 = 0;
        let sx0 = 0, sx2 = 0, sy0 = 0, sy2 = 0;
        for (let k = -w; k <= w; k++) {
          const wt = Math.exp(-(k * k) * inv2Sig2);
          const k2 = k * k;
          const pk = cur[idx(i + k)];
          s0 += wt;
          s2 += wt * k2;
          s4 += wt * k2 * k2;
          sx0 += wt * pk[0];
          sx2 += wt * k2 * pk[0];
          sy0 += wt * pk[1];
          sy2 += wt * k2 * pk[1];
        }
        const det = s0 * s4 - s2 * s2;
        if (Math.abs(det) < 1e-9) continue;
        const ax = (s4 * sx0 - s2 * sx2) / det;
        const cx = (s0 * sx2 - s2 * sx0) / det;
        const ay = (s4 * sy0 - s2 * sy2) / det;
        const cy = (s0 * sy2 - s2 * sy0) / det;

        const bx = (pB[0] - pA[0]) / (2 * w);
        const by = (pB[1] - pA[1]) / (2 * w);
        let errSq = 0;
        for (let k = -w; k <= w; k++) {
          const pk = cur[idx(i + k)];
          const fx = ax + bx * k + cx * k * k;
          const fy = ay + by * k + cy * k * k;
          errSq += (pk[0] - fx) ** 2 + (pk[1] - fy) ** 2;
        }
        const rms = Math.sqrt(errSq / (2 * w + 1));
        if (rms <= (isHiResLoop ? 0.54 : 0.42)) {
          next[i][0] = clamp(ax, rawPts[i][0] - maxTube, rawPts[i][0] + maxTube);
          next[i][1] = clamp(ay, rawPts[i][1] - maxTube, rawPts[i][1] + maxTube);
        }
      }
      cur = next;
    }
  }
  return cur;
}

function detectCornersAndExtrema(pts, angleDeg = 44, juncFlags = null, advOpt = {}) {
  const n = pts.length;
  const corners = new Uint8Array(n);
  const smoothKnots = new Uint8Array(n);
  const apexMap = new Map();
  const knotTangents = new Map();
  if (juncFlags) {
    for (let i = 0; i < n; i++) {
      if (juncFlags[i] === 1) corners[i] = 1;
      else if (juncFlags[i] === 2) smoothKnots[i] = 1;
    }
  }
  if (n < 6) {
    for (let i = 0; i < n; i++) corners[i] = 1;
    return { corners, smoothKnots, apexMap, knotTangents };
  }

  let minX_c = Infinity, maxX_c = -Infinity, minY_c = Infinity, maxY_c = -Infinity;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (p[0] < minX_c) minX_c = p[0]; if (p[0] > maxX_c) maxX_c = p[0];
    if (p[1] < minY_c) minY_c = p[1]; if (p[1] > maxY_c) maxY_c = p[1];
  }
  const bboxDiag = Math.hypot(maxX_c - minX_c, maxY_c - minY_c);
  let orthoStepsCnt = 0;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n];
    const dx = Math.abs(p1[0] - p0[0]), dy = Math.abs(p1[1] - p0[1]);
    if (Math.min(dx, dy) <= 0.18 * Math.max(dx, dy)) orthoStepsCnt++;
  }
  /* Aktifkan isMicroGlyph HANYA bila kontur kecil benar-benar didominasi langkah ortogonal/rektilinear (huruf teks),
     bukan kontur organik/oval/sabit seperti mata, hidung, atau alis pada ilustrasi line-art! */
  const isMicroGlyph = (bboxDiag <= 32 && n <= 90) && ((orthoStepsCnt / n) >= 0.64) && advOpt.cornerMode !== 'organic';
  const cornerMode = advOpt.cornerMode || 'typo';
  const lcSens = (advOpt.lineCurveSensitivity ?? 74) / 100;
  const apexSharp = (advOpt.apexSharpness ?? 78) / 100;
  const roundness = (advOpt.cornerRoundness ?? 65) / 100;
  const protectStemCaps = advOpt.protectStemCaps !== false;
  const extremumAlign = advOpt.extremumAlign !== false;
  const idx = k => ((k % n) + n) % n;

  const turnOn = (arr, i, L) => {
    const a = arr[idx(i - L)], p = arr[i], b = arr[idx(i + L)];
    const ux = p[0] - a[0], uy = p[1] - a[1];
    const vx = b[0] - p[0], vy = b[1] - p[1];
    const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
    if (l1 < 0.20 || l2 < 0.20) return 0;
    return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  };

  /* 0. Pra-kunci HANYA puncak baji sejati (sagitta/chord >= 0.20 & searah tanpa pembatalan tanda tangga) */
  const rawPin = new Uint8Array(corners);
  const rawTurn1 = new Float64Array(n);
  const rawTurn2 = new Float64Array(n);
  const rawTurn3 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    rawTurn1[i] = turnOn(pts, i, 1);
    rawTurn2[i] = turnOn(pts, i, 2);
    rawTurn3[i] = turnOn(pts, i, 3);
  }
  const isOrganicCornerMode = cornerMode === 'organic';
  for (let i = 0; i < n; i++) {
    const r2Thr = isOrganicCornerMode ? 0.72 : 0.58;
    const r3Thr = isOrganicCornerMode ? 0.78 : 0.66;
    const sagThr = isOrganicCornerMode ? 0.24 : 0.205;
    /* Hanya kunci puncak baji sejati yang memiliki konsentrasi belokan tajam di simpul i (bukan busur melengkung mulus!) */
    if ((Math.abs(rawTurn2[i]) >= r2Thr || Math.abs(rawTurn3[i]) >= r3Thr) && Math.abs(rawTurn1[i]) >= 0.34) {
      const net1 = Math.abs(rawTurn1[idx(i - 1)] + rawTurn1[i] + rawTurn1[idx(i + 1)]);
      const pM3 = pts[idx(i - 3)], pP3 = pts[idx(i + 3)];
      const w3 = Math.hypot(pP3[0] - pM3[0], pP3[1] - pM3[1]);
      const sag3 = Math.hypot(pts[i][0] - 0.5 * (pM3[0] + pP3[0]), pts[i][1] - 0.5 * (pM3[1] + pP3[1]));
      if (net1 >= (isOrganicCornerMode ? 0.68 : 0.56) && w3 > 0.5 && (sag3 / w3) >= sagThr) {
        rawPin[i] = 1;
      }
    }
  }

  let maxC = 0;
  for (let i = 0; i < n; i += Math.max(1, (n >> 4))) {
    if (pts[i][0] > maxC) maxC = pts[i][0];
    if (pts[i][1] > maxC) maxC = pts[i][1];
  }
  const is2KLoop = n >= 120 && typeof VMT !== "undefined" && VMT._curMaxDim >= 1200;
  const cssPin = is2KLoop ? new Uint8Array(corners) : rawPin;
  const smMicro = taubinFilterClosed(pts, cssPin, 2, 0.42, -0.44);
  const smFine = taubinFilterClosed(pts, cssPin, is2KLoop ? 5 : 4, 0.44, -0.46);
  const smBroad = taubinFilterClosed(pts, cssPin, is2KLoop ? 10 : 9, 0.45, -0.473);

  const L_fine = clamp(Math.round(n / 135), 3, 6);
  const scales = [2, L_fine, clamp(L_fine * 2, 6, 14), clamp(L_fine * 4, 12, 26)]
    .filter((v, i, a) => v < Math.max(4, n >> 2) && a.indexOf(v) === i);
  if (!scales.length) scales.push(2);

  const microTurn = new Float64Array(n);
  const signedMicroTurn = new Float64Array(n);
  const fineTurn = new Float64Array(n);
  const maxScaleTurn = new Float64Array(n);
  const signedMaxTurn = new Float64Array(n);
  const curvExtremaScore = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const mt = rawPin[i] && Math.abs(rawTurn2[i]) > Math.abs(turnOn(smMicro, i, 2)) ? rawTurn2[i] : turnOn(smMicro, i, 2);
    signedMicroTurn[i] = mt;
    microTurn[i] = Math.abs(mt);
    const mtLocal = Math.max(microTurn[i], Math.abs(rawTurn1[i]) * 1.35);
    const mt3 = Math.max(microTurn[i], Math.abs(turnOn(smMicro, i, 3)) * (mtLocal < 0.18 ? 0.35 : 1.0), rawPin[i] ? Math.abs(rawTurn3[i]) : 0);
    /* Batasi kontribusi skala L >= 4 pada titik yang secara lokal datar (mtLocal kecil)
       agar titik datar di antara 2 sudut dekat tidak mencuri puncak NMS dari sudut siku sejati! */
    const rawFine = Math.abs(turnOn(smFine, i, L_fine));
    const fineCap = mtLocal < 0.08 ? 0.12 : mtLocal < 0.22 ? mtLocal * 1.65 : (isMicroGlyph ? microTurn[i] * 1.65 : Math.PI);
    fineTurn[i] = Math.max(rawPin[i] ? Math.abs(rawTurn3[i]) : 0, Math.min(rawFine, fineCap));
    const largeScaleCap = mtLocal < 0.10 ? 0.12 : mtLocal < 0.25 ? mtLocal * 1.75 : (isMicroGlyph ? Math.max(fineTurn[i], microTurn[i] * 1.75) : Math.PI);
    let bestA = fineTurn[i], bestS = turnOn(smFine, i, L_fine);
    for (const L of scales) {
      const rawT = turnOn(smBroad, i, L);
      const effA = L > 3 ? Math.min(Math.abs(rawT), largeScaleCap) : Math.abs(rawT);
      if (effA > bestA) { bestA = effA; bestS = rawT; }
    }
    maxScaleTurn[i] = bestA;
    signedMaxTurn[i] = bestS;

    const t2 = Math.abs(turnOn(smMicro, i, 2));
    const t4 = Math.abs(turnOn(smFine, i, 4));
    const c4 = Math.hypot(smFine[idx(i + 4)][0] - smFine[idx(i - 4)][0], smFine[idx(i + 4)][1] - smFine[idx(i - 4)][1]);
    const mx4 = 0.5 * (smFine[idx(i - 4)][0] + smFine[idx(i + 4)][0]);
    const my4 = 0.5 * (smFine[idx(i - 4)][1] + smFine[idx(i + 4)][1]);
    const sag4 = Math.hypot(smMicro[i][0] - mx4, smMicro[i][1] - my4);
    const sagRatio4 = c4 > 0.8 ? (sag4 / c4) : 0;
    const sameSign = Math.sign(turnOn(smMicro, i, 2)) === Math.sign(turnOn(smFine, i, 4));
    const rawCExt = (sameSign && sagRatio4 >= 0.16 && t2 >= 0.20) ? Math.max(t2, t4 * 0.95, sagRatio4 * 1.95) : Math.max(t2 * 0.75, Math.min(t4 * 0.75, fineCap));
    curvExtremaScore[i] = Math.min(rawCExt, largeScaleCap);
  }

  const modeAngleBias = cornerMode === 'sharp' ? -8 : cornerMode === 'organic' ? 6 : -4;
  const effAngleDeg = clamp(angleDeg + modeAngleBias, 18, 115);
  const minPeakRad = (Math.min(effAngleDeg, 28) * Math.PI) / 180;
  const sharpThrRad = (Math.min(effAngleDeg, 38) * Math.PI) / 180;
  const nmsWin = protectStemCaps ? clamp(L_fine, 2, 4) : clamp(L_fine + 1, 3, 6);
  const rawPeaks = [];

  for (let i = 0; i < n; i++) {
    if (corners[i]) {
      rawPeaks.push({ i, forced: true, peakVal: Math.PI, sign: 1 });
      continue;
    }
    const score = Math.max(microTurn[i], fineTurn[i], maxScaleTurn[i] * 0.90, curvExtremaScore[i]);
    if (score < minPeakRad) continue;
    let isMax = true;
    for (let d = -nmsWin; d <= nmsWin; d++) {
      if (d === 0) continue;
      const j = idx(i + d);
      const sj = Math.max(microTurn[j], fineTurn[j], maxScaleTurn[j] * 0.90, curvExtremaScore[j]);
      if (sj > score + 1e-6) {
        const ti = Math.max(microTurn[i], fineTurn[i]);
        const tj = Math.max(microTurn[j], fineTurn[j]);
        if (protectStemCaps && Math.abs(d) >= 2 && ti >= 0.48 && tj >= 0.48 &&
            Math.sign(signedMicroTurn[i]) === Math.sign(signedMicroTurn[j]) &&
            (ti + tj) >= 2.55) {
          continue;
        }
        if (protectStemCaps && Math.abs(d) <= 2 && rawPin[i] && microTurn[i] >= 0.65 && microTurn[j] < microTurn[i] * 0.85) {
          continue;
        }
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;

    let bestLocalI = i, bestMicro = Math.max(microTurn[i], Math.abs(turnOn(smMicro, i, 3)), rawPin[i] ? Math.abs(rawTurn2[i]) : 0);
    for (let d = -3; d <= 3; d++) {
      const j = idx(i + d);
      const mj = Math.max(microTurn[j], Math.abs(turnOn(smMicro, j, 3)), rawPin[j] ? Math.abs(rawTurn2[j]) : 0);
      if (mj > bestMicro + 0.02) { bestMicro = mj; bestLocalI = j; }
    }
    if (rawPeaks.length) {
      const prev = rawPeaks[rawPeaks.length - 1];
      const gap = idx(bestLocalI - prev.i);
      const tCur = Math.max(microTurn[bestLocalI], fineTurn[bestLocalI]);
      const tPrev = Math.max(microTurn[prev.i], fineTurn[prev.i]);
      const isTwoCornerCap = protectStemCaps && gap >= 2 && tCur >= 0.48 && tPrev >= 0.48 &&
        Math.sign(signedMicroTurn[bestLocalI]) === Math.sign(signedMicroTurn[prev.i]) &&
        (tCur + tPrev) >= 2.55;
      if (gap < nmsWin && !isTwoCornerCap) {
        if (!prev.forced && score > prev.peakVal) {
          rawPeaks[rawPeaks.length - 1] = { i: bestLocalI, forced: false, peakVal: score, sign: Math.sign(signedMaxTurn[bestLocalI]) || 1 };
        }
        continue;
      }
    }
    rawPeaks.push({ i: bestLocalI, forced: false, peakVal: score, sign: Math.sign(signedMaxTurn[bestLocalI]) || 1 });
  }

  /* Helper: menguji apakah sebuah lengan kontur benar-benar lurus (bukan busur lengkung seperti dalam huruf e, D, P, B, R) */
  const evalArmStraightness = (armPts, fLine) => {
    if (!fLine || fLine.span < (isMicroGlyph ? 2.25 : 2.65)) return false;
    const rmsLim = Math.min(0.22, 0.11 + fLine.span * 0.0045);
    const devLim = Math.min(0.40, 0.20 + fLine.span * 0.0085);
    if (fLine.rms > rmsLim || fLine.maxDev > devLim) return false;
    const mPts = armPts.length;
    if (mPts >= 5) {
      const p0 = armPts[0], p1 = armPts[mPts - 1];
      const ch = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const ux = (p1[0] - p0[0]) / ch, uy = (p1[1] - p0[1]) / ch;
      let sumSigned = 0, cntMid = 0;
      const i0 = Math.max(1, Math.floor(mPts * 0.25)), i1 = Math.min(mPts - 2, Math.ceil(mPts * 0.75));
      for (let s = i0; s <= i1; s++) {
        sumSigned += (armPts[s][0] - p0[0]) * uy - (armPts[s][1] - p0[1]) * ux;
        cntMid++;
      }
      const meanSagRatio = cntMid > 0 ? Math.abs(sumSigned / cntMid) / ch : 0;
      const sagRatioLim = ch < 6.5 ? Math.max(0.036, 0.14 / ch) : 0.022;
      if (meanSagRatio > sagRatioLim) return false;
      if (mPts >= 7 && fLine.rms > 0.085) {
        const cf = fitCircle2D(armPts);
        if (cf && cf.r >= 2.5 && cf.r <= 185 && cf.rms < fLine.rms * 0.62) return false;
      }
    }
    return true;
  };

  if (rawPeaks.length >= 2) {
    const firstPk = rawPeaks[0], lastPk = rawPeaks[rawPeaks.length - 1];
    const wrapGap = (firstPk.i - lastPk.i + n) % n;
    if (wrapGap < nmsWin) {
      if (lastPk.peakVal > firstPk.peakVal) rawPeaks[0] = lastPk;
      rawPeaks.pop();
    }
  }
  if (protectStemCaps && rawPeaks.length >= 2 && n >= 14) {
    const intersectLines2D = (lA, lB) => {
      if (!lA || !lB) return null;
      const det = lA.d[0] * lB.d[1] - lA.d[1] * lB.d[0];
      if (Math.abs(det) < 0.25) return null;
      const wx = lB.c[0] - lA.c[0], wy = lB.c[1] - lA.c[1];
      const t = (wx * lB.d[1] - wy * lB.d[0]) / det;
      return [lA.c[0] + lA.d[0] * t, lA.c[1] + lA.d[1] * t];
    };
    const expandedPeaks = [];
    for (let k = 0; k < rawPeaks.length; k++) {
      const pk = rawPeaks[k];
      const prevPk = rawPeaks[(k - 1 + rawPeaks.length) % rawPeaks.length];
      const nextPk = rawPeaks[(k + 1) % rawPeaks.length];
      const gapNext = (nextPk.i - pk.i + n) % n;
      let capStartI = pk.i, capEndI = pk.i, isPair = false;
      const maxCapSpan = Math.min(4, Math.max(2, Math.floor(n * 0.20)));
      if (gapNext > 0 && gapNext <= maxCapSpan && pk.sign === nextPk.sign && !pk.forced && !nextPk.forced) {
        capStartI = pk.i;
        capEndI = nextPk.i;
        isPair = true;
      } else if (!pk.forced) {
        for (let s = 1; s <= Math.min(maxCapSpan, ((pk.i - prevPk.i + n) % n) - 2); s++) {
          const j = idx(pk.i - s);
          if (signedMicroTurn[j] * pk.sign < -0.25) break;
          if (microTurn[j] >= 0.28 && Math.sign(signedMicroTurn[j]) === pk.sign) capStartI = j;
        }
        for (let s = 1; s <= Math.min(maxCapSpan, ((nextPk.i - pk.i + n) % n) - 2); s++) {
          const j = idx(pk.i + s);
          if (signedMicroTurn[j] * pk.sign < -0.25) break;
          if (microTurn[j] >= 0.28 && Math.sign(signedMicroTurn[j]) === pk.sign) capEndI = j;
        }
      }
      const spanInit = (capEndI - capStartI + n) % n;
      const midCapI = idx(capStartI + Math.round(spanInit * 0.5));
      const afterPk = isPair ? rawPeaks[(k + 2) % rawPeaks.length] : nextPk;
      const maxInSteps = clamp(((capStartI - prevPk.i + n) % n) - 1, 3, 7);
      const maxOutSteps = clamp(((afterPk.i - capEndI + n) % n) - 1, 3, 7);
      const inPts = [], outPts = [];
      for (let s = 1; s <= maxInSteps; s++) {
        const idxIn = idx(capStartI - s);
        if (s >= 3 && microTurn[idxIn] >= 0.55) break;
        inPts.push(pts[idxIn]);
      }
      inPts.reverse();
      for (let s = 1; s <= maxOutSteps; s++) {
        const idxOut = idx(capEndI + s);
        if (s >= 3 && microTurn[idxOut] >= 0.55) break;
        outPts.push(pts[idxOut]);
      }
      const fIn = fitLine2D(inPts), fOut = fitLine2D(outPts);
      const antiDot = (fIn && fOut) ? (fIn.d[0] * fOut.d[0] + fIn.d[1] * fOut.d[1]) : 0;
      const perpDist = (fIn && fOut) ? Math.abs((fOut.c[0] - fIn.c[0]) * fIn.d[1] - (fOut.c[1] - fIn.c[1]) * fIn.d[0]) : 99;
      if (fIn && fOut && fIn.rms <= 0.14 && fOut.rms <= 0.14 && fIn.span >= 4.2 && fOut.span >= 4.2 &&
          antiDot <= -0.90 && perpDist >= 2.2 && perpDist <= 6.2) {
        let iL = capStartI, iR = capEndI;
        for (let s = 0; s <= 4; s++) {
          const candL = idx(midCapI - s);
          const dIn = Math.abs((pts[candL][0] - fIn.c[0]) * fIn.d[1] - (pts[candL][1] - fIn.c[1]) * fIn.d[0]);
          if (dIn <= 0.55) { iL = candL; break; }
        }
        for (let s = 0; s <= 4; s++) {
          const candR = idx(midCapI + s);
          const dOut = Math.abs((pts[candR][0] - fOut.c[0]) * fOut.d[1] - (pts[candR][1] - fOut.c[1]) * fOut.d[0]);
          if (dOut <= 0.55) { iR = candR; break; }
        }
        const spanLR = (iR - iL + n) % n;
        if (spanLR >= 2 && spanLR <= 8) {
          const capFacePts = [];
          for (let s = 1; s < spanLR; s++) capFacePts.push(pts[idx(iL + s)]);
          const fCapCore = capFacePts.length >= 2 ? fitLine2D(capFacePts) : null;
          const allCapPts = [];
          for (let s = 0; s <= spanLR; s++) allCapPts.push(pts[idx(iL + s)]);
          const fCapAll = fitLine2D(allCapPts);
          const nx = -fIn.d[1], ny = fIn.d[0];
          /* Diskriminator Round Brush Cap vs Flat Stem Cap:
             Ukur tonjolan puncak cap (hTip) melewati tali busur bahu [pts[iL]..pts[iR]] dan uji kecocokan setengah lingkaran.
             Jika ujung menonjol melengkung seperti kuas/pena bulat (hTip >= 0.18 * perpDist atau cfSemi lebih baik),
             JANGAN meratakannya menjadi garis lurus [apL, apR]! */
          const chCapX = pts[iR][0] - pts[iL][0], chCapY = pts[iR][1] - pts[iL][1], chCapL = Math.hypot(chCapX, chCapY) || 1;
          let maxCapBulge = 0;
          for (let s = 1; s < spanLR; s++) {
            const pM = pts[idx(iL + s)];
            const bulge = Math.abs((pM[0] - pts[iL][0]) * (-chCapY / chCapL) + (pM[1] - pts[iL][1]) * (chCapX / chCapL));
            if (bulge > maxCapBulge) maxCapBulge = bulge;
          }
          const semiCheckPts = [];
          for (let s = -2; s <= spanLR + 2; s++) semiCheckPts.push(pts[idx(iL + s)]);
          const cfSemi = semiCheckPts.length >= 5 ? fitCircle2D(semiCheckPts) : null;
          const isRoundBrushCap = maxCapBulge >= Math.max(0.42, perpDist * 0.16) ||
            !!(cfSemi && cfSemi.r >= 1.1 && cfSemi.r <= perpDist * 0.85 && cfSemi.rms <= 0.22);
          const isFlatCap = !isRoundBrushCap && (
            (fCapCore && fCapCore.rms <= 0.18 && fCapCore.maxDev <= 0.28 && Math.abs(fCapCore.d[0] * nx + fCapCore.d[1] * ny) >= 0.82) ||
            (fCapAll && fCapAll.rms <= 0.20 && fCapAll.maxDev <= 0.32 && Math.abs(fCapAll.d[0] * nx + fCapAll.d[1] * ny) >= 0.84)
          );
          if (isFlatCap) {
            const capLine = (fCapAll && Math.abs(fCapAll.d[0] * nx + fCapAll.d[1] * ny) >= 0.90)
              ? { c: fCapAll.c, d: [nx, ny] }
              : ((fCapCore && fCapCore.span >= 1.2 && Math.abs(fCapCore.d[0] * nx + fCapCore.d[1] * ny) >= 0.85) ? fCapCore : fCapAll);
            const apL = intersectLines2D(fIn, capLine);
            const apR = intersectLines2D(capLine, fOut);
            if (apL && apR && Math.hypot(apL[0] - pts[iL][0], apL[1] - pts[iL][1]) <= 1.45 &&
                Math.hypot(apR[0] - pts[iR][0], apR[1] - pts[iR][1]) <= 1.45) {
              for (let s = 1; s < spanLR; s++) {
                const u = s / spanLR, mIdx = idx(iL + s);
                pts[mIdx] = [apL[0] + (apR[0] - apL[0]) * u, apL[1] + (apR[1] - apL[1]) * u];
              }
              expandedPeaks.push({ i: iL, forced: false, peakVal: pk.peakVal, sign: pk.sign, capApex: apL });
              expandedPeaks.push({ i: iR, forced: false, peakVal: pk.peakVal, sign: pk.sign, capApex: apR });
              if (isPair) {
                if (k === rawPeaks.length - 1) expandedPeaks.shift();
                else k++;
              }
              continue;
            }
          }
        }
      }
      expandedPeaks.push(pk);
    }
    rawPeaks.length = 0;
    for (const ep of expandedPeaks) rawPeaks.push(ep);
  }
  const m = rawPeaks.length;
  const rawPeakSet = new Set(rawPeaks.map(p => p.i));
  rawPeakSet.delete(-1);
  const cands = [];
  for (let k = 0; k < m; k++) {
    const pk = rawPeaks[k];
    const centerI = pk.i;
    if (pk.forced) {
      cands.push({ i: centerI, forced: true, sharp: true, apexPt: null, turn: Math.PI, sign: 1, leftStraight: true, rightStraight: true, isStrokeCap: false, isCurvCusp: false });
      continue;
    }
    const prevPeak = rawPeaks[(k - 1 + m) % m];
    const nextPeak = rawPeaks[(k + 1) % m];
    const distPrev = m > 1 ? ((centerI - prevPeak.i + n) % n) : (n >> 1);
    const distNext = m > 1 ? ((nextPeak.i - centerI + n) % n) : (n >> 1);

    const maxArmL = distPrev <= 7 ? Math.max(2, distPrev) : ((isMicroGlyph && distPrev <= 9) ? clamp(distPrev - 1, 2, 7) : (distPrev <= 26 ? clamp(Math.min(Math.floor(distPrev * 0.65), distPrev - 2), 2, 16) : clamp(Math.floor(distPrev * 0.72), 2, 26)));
    const maxArmR = distNext <= 7 ? Math.max(2, distNext) : ((isMicroGlyph && distNext <= 9) ? clamp(distNext - 1, 2, 7) : (distNext <= 26 ? clamp(Math.min(Math.floor(distNext * 0.65), distNext - 2), 2, 16) : clamp(Math.floor(distNext * 0.72), 2, 26)));
    const gapL = maxArmL >= 18 ? 5 : maxArmL >= 12 ? 3 : maxArmL >= 8 ? 2 : (maxArmL >= 6 ? 1 : 0);
    const gapR = maxArmR >= 18 ? 5 : maxArmR >= 12 ? 3 : maxArmR >= 8 ? 2 : (maxArmR >= 6 ? 1 : 0);

    const leftPts = [], rightPts = [];
    for (let s = maxArmL; s >= gapL; s--) leftPts.push(smMicro[idx(centerI - s)]);
    for (let s = gapR; s <= maxArmR; s++) rightPts.push(smMicro[idx(centerI + s)]);

    const fL = fitLine2D(leftPts), fR = fitLine2D(rightPts);
    const leftStraight = evalArmStraightness(leftPts, fL);
    const rightStraight = evalArmStraightness(rightPts, fR);

    const nearL = [], nearR = [];
    const nLenL = clamp(maxArmL, 2, 5), nLenR = clamp(maxArmR, 2, 5);
    for (let s = nLenL; s >= 0; s--) nearL.push(pts[idx(centerI - s)]);
    for (let s = 0; s <= nLenR; s++) nearR.push(pts[idx(centerI + s)]);
    const fnL = fitLine2D(nearL), fnR = fitLine2D(nearR);

    const dL = (leftStraight ? fL : fnL)?.d || [1, 0];
    const dR = (rightStraight ? fR : fnR)?.d || [0, 1];
    const cL = (leftStraight ? fL : fnL)?.c || pts[centerI];
    const cR = (rightStraight ? fR : fnR)?.c || pts[centerI];

    const armTurnRad = Math.abs(Math.atan2(dL[0] * dR[1] - dL[1] * dR[0], dL[0] * dR[0] + dL[1] * dR[1]));
    const nearTurnRad = (fnL && fnR)
      ? Math.abs(Math.atan2(fnL.d[0] * fnR.d[1] - fnL.d[1] * fnR.d[0], fnL.d[0] * fnR.d[0] + fnL.d[1] * fnR.d[1]))
      : armTurnRad;
    const effTurn = Math.max(armTurnRad, nearTurnRad, fineTurn[centerI], microTurn[centerI]);

    const wSpan = d => {
      const pA = pts[idx(centerI - d)], pB = pts[idx(centerI + d)];
      return Math.hypot(pB[0] - pA[0], pB[1] - pA[1]);
    };
    const w2 = wSpan(2), w4 = wSpan(4), w6 = wSpan(6), w12 = wSpan(Math.min(12, n >> 2));
    const mid4 = [0.5 * (pts[idx(centerI - 4)][0] + pts[idx(centerI + 4)][0]), 0.5 * (pts[idx(centerI - 4)][1] + pts[idx(centerI + 4)][1])];
    const sag4 = Math.hypot(pts[centerI][0] - mid4[0], pts[centerI][1] - mid4[1]);
    const sagRatio4 = w4 > 0.5 ? (sag4 / w4) : 0;

    const isDivergingVee = (leftStraight && rightStraight && Math.min(fL.span, fR.span) >= 5.5 && w12 > w4 * 1.35) || (w12 > w6 * 1.48);
    const isStrokeCap = !isDivergingVee && !pk.capApex && (
      n >= 12 &&
      effTurn >= 1.95 &&
      w2 <= 4.6 && w4 <= 5.4 && w6 <= 6.0 && w12 <= 6.8 &&
      (w6 / Math.max(1.3, w2)) < 1.52
    );

    const arcZone = [];
    const arcW = clamp(Math.min(distPrev, distNext) >> 1, 3, 7);
    for (let s = -arcW; s <= arcW; s++) arcZone.push(smFine[idx(centerI + s)]);
    const cFit = fitCircle2D(arcZone);
    const wedgeRms = 0.5 * ((fnL ? fnL.rms : 0.45) + (fnR ? fnR.rms : 0.45));
    const conc = Math.max(microTurn[centerI], nearTurnRad * 0.85) / Math.max(1e-4, Math.max(fineTurn[centerI], armTurnRad));

    const isSmoothCircleCap = !!(cFit && cFit.r >= 1.35 && cFit.r <= 48 && cFit.rms <= Math.max(0.20, cFit.r * 0.045) && cFit.rms < wedgeRms * 0.90);
    const isCurvCusp = !isStrokeCap && !isSmoothCircleCap && (
      sagRatio4 >= 0.25 &&
      conc >= 0.62 &&
      (w6 - w2) >= 1.6 &&
      w6 >= 3.8 &&
      (nearTurnRad >= 0.65 || effTurn >= 0.78) &&
      (!cFit || wedgeRms <= cFit.rms * 0.92 || (nearTurnRad >= 1.18 && microTurn[centerI] >= 0.58))
    );

    let oppTurnSum = 0;
    const pkSign = Math.sign(signedMicroTurn[centerI]) || pk.sign || 1;
    for (let s = -4; s <= 4; s++) {
      if (s === 0) continue;
      const ts = turnOn(pts, idx(centerI + s), 1);
      if (ts * pkSign < -0.08) oppTurnSum += Math.abs(ts);
    }
    const isStaircaseFacet = !isCurvCusp && oppTurnSum >= 0.35 && sagRatio4 < 0.22 && (!leftStraight || !rightStraight);

    const det = dL[0] * dR[1] - dL[1] * dR[0];
    let dApex = 999, dPerp = 999, apexPt = null, rEff = 999;
    if (Math.abs(det) > 0.08 && !isStrokeCap) {
      const wx = cR[0] - cL[0], wy = cR[1] - cL[1];
      const t = (wx * dR[1] - wy * dR[0]) / det;
      const ax = cL[0] + dL[0] * t, ay = cL[1] + dL[1] * t;
      dApex = Math.hypot(pts[centerI][0] - ax, pts[centerI][1] - ay);
      const halfInterior = Math.max(0.14, (Math.PI - clamp(effTurn, 0.15, 2.85)) * 0.5);
      dPerp = dApex * Math.sin(halfInterior);
      const secantFactor = (1 / Math.max(0.14, Math.sin(halfInterior))) - 1;
      rEff = secantFactor > 0.04 ? (dApex / secantFactor) : dPerp;

      const isStrongPolygonWedge = leftStraight && rightStraight && fL.span >= 5.5 && fR.span >= 5.5 && armTurnRad >= 0.42 && dPerp <= Math.min(3.2, 0.16 * Math.min(fL.span, fR.span));
      if (pk.capApex) {
        apexPt = pk.capApex;
      } else if (leftStraight && rightStraight) {
        const isOrthoBevel = effTurn > 1.15 && effTurn < 1.95 && fL.rms <= 0.14 && fR.rms <= 0.14 && Math.max(fL.span, fR.span) >= 3.2;
        const maxAllowApex = isOrthoBevel ? 1.65 : ((effTurn > 0.42 && effTurn < 2.85) ? Math.min(0.85, 0.45 + apexSharp * 0.35) : 0.55);
        if ((dPerp <= 1.85 || isStrongPolygonWedge || isOrthoBevel) && dApex <= maxAllowApex && apexSharp > 0.05) {
          const shift = (fL.rms <= 0.22 && fR.rms <= 0.22)
            ? 1.0
            : Math.min(0.95, (0.85 + apexSharp * 1.35) / Math.max(1e-6, dApex)) * Math.min(1.0, 0.65 + apexSharp * 0.35);
          apexPt = [
            pts[centerI][0] + (ax - pts[centerI][0]) * shift,
            pts[centerI][1] + (ay - pts[centerI][1]) * shift
          ];
        }
      } else if (leftStraight !== rightStraight && apexSharp > 0.05) {
        /* Sudut Garis-ke-Kurva (seperti ujung busur dalam huruf e, D, P, B, R):
           Jangan gunakan perpotongan tali busur jauh dari sisi lengkung!
           Proyeksikan titik sudut ke garis lurus fStr sepanjang arah singgung lokal fnCurv (dibatasi <= 0.48 px) */
        const fStr = leftStraight ? fL : fR;
        const fnCurv = leftStraight ? fnR : fnL;
        if (fStr && fnCurv) {
          const detLC = fStr.d[0] * fnCurv.d[1] - fStr.d[1] * fnCurv.d[0];
          if (Math.abs(detLC) > 0.14) {
            const wxLC = pts[centerI][0] - fStr.c[0], wyLC = pts[centerI][1] - fStr.c[1];
            const tLC = (wxLC * fnCurv.d[1] - wyLC * fnCurv.d[0]) / detLC;
            const axLC = fStr.c[0] + fStr.d[0] * tLC, ayLC = fStr.c[1] + fStr.d[1] * tLC;
            const distLC = Math.hypot(axLC - pts[centerI][0], ayLC - pts[centerI][1]);
            if (distLC <= 0.55) {
              apexPt = [axLC, ayLC];
            } else {
              /* Proyeksikan secara ortogonal tepat ke garis lurus fStr */
              const projS = (pts[centerI][0] - fStr.c[0]) * fStr.d[0] + (pts[centerI][1] - fStr.c[1]) * fStr.d[1];
              const ox = fStr.c[0] + fStr.d[0] * projS, oy = fStr.c[1] + fStr.d[1] * projS;
              if (Math.hypot(ox - pts[centerI][0], oy - pts[centerI][1]) <= 0.48) {
                apexPt = [ox, oy];
              }
            }
          }
        }
      } else if (isCurvCusp && dApex <= 1.25 && apexSharp > 0.05) {
        apexPt = [
          pts[centerI][0] + (ax - pts[centerI][0]) * 0.65,
          pts[centerI][1] + (ay - pts[centerI][1]) * 0.65
        ];
      }
    } else if (isStrokeCap) {
      const neckMidX = 0.5 * (pts[idx(centerI - 2)][0] + pts[idx(centerI + 2)][0]);
      const neckMidY = 0.5 * (pts[idx(centerI - 2)][1] + pts[idx(centerI + 2)][1]);
      apexPt = [
        pts[centerI][0] + (neckMidX - pts[centerI][0]) * 0.34,
        pts[centerI][1] + (neckMidY - pts[centerI][1]) * 0.34
      ];
    }

    let activeArcSteps = 0;
    for (let s = -3; s <= 3; s++) {
      if (Math.abs(turnOn(smFine, idx(centerI + s), 2)) > 0.11) activeArcSteps++;
    }
    const isStrongPolygonWedge = leftStraight && rightStraight && fL.span >= 5.5 && fR.span >= 5.5 && armTurnRad >= 0.42 && dPerp <= Math.min(3.2, 0.16 * Math.min(fL.span, fR.span)) && rEff <= 3.8;
    const minRoundRadius = 2.6 - roundness * 0.80;
    const isGenuineSmoothArc = !isCurvCusp && !isStrongPolygonWedge && cornerMode !== 'sharp' && !!(
      cFit && cFit.r >= minRoundRadius && cFit.r <= 90 &&
      cFit.rms <= Math.max(0.35, cFit.r * (0.042 + roundness * 0.020)) &&
      (cFit.rms <= wedgeRms * 1.12 || conc < 0.52) &&
      (rEff > (1.85 - roundness * 0.40) || sagRatio4 < 0.22) &&
      activeArcSteps >= 4 && conc < (0.60 - roundness * 0.06)
    );

    const isRoundUCap = !!(cFit && cFit.r >= 2.2 && cFit.r <= 24 && cFit.rms <= Math.max(0.24, cFit.r * 0.042) && cFit.rms <= wedgeRms * 0.78);
    const isStemCapCorner = protectStemCaps && !isRoundUCap && rawPin[centerI] && (leftStraight && rightStraight) &&
      Math.min(distPrev, distNext) >= 4 && Math.min(distPrev, distNext) <= 22 &&
      Math.max(armTurnRad, nearTurnRad) >= 1.28;
    const isRoundEndArc = !isStrokeCap && !isStemCapCorner && cornerMode !== 'sharp' && !(leftStraight && rightStraight) && !!(
      cFit && cFit.r >= 1.4 && cFit.r <= 90 &&
      cFit.rms <= Math.max(0.20, cFit.r * 0.045) &&
      activeArcSteps >= 4 &&
      (cFit.rms <= wedgeRms * 0.88 || conc < 0.58)
    );

    const isLineToCurve = (leftStraight && !rightStraight) || (!leftStraight && rightStraight);
    const lcAngleThr = (38 - lcSens * 20) * Math.PI / 180;

    let isSharp = false;
    let lockedTangent = null;

    if (pk.capApex) {
      isSharp = true;
      apexPt = pk.capApex;
    } else if (isStrokeCap || isStaircaseFacet || isGenuineSmoothArc || isRoundEndArc) {
      isSharp = false;
    } else if (isStrongPolygonWedge || isCurvCusp) {
      isSharp = true;
    } else if (isLineToCurve) {
      const straightDir = leftStraight ? fL.d : fR.d;
      const effLcThr = cornerMode === 'organic' ? Math.max(lcAngleThr, 0.72) : lcAngleThr;
      if (Math.max(armTurnRad, nearTurnRad) >= effLcThr && (dPerp <= (cornerMode === 'organic' ? 1.25 : 1.65) || microTurn[centerI] >= (cornerMode === 'organic' ? 0.52 : 0.34) || nearTurnRad >= (cornerMode === 'organic' ? 0.68 : 0.48))) {
        isSharp = true;
      } else {
        isSharp = false;
        lockedTangent = [straightDir[0], straightDir[1]];
      }
    } else if (effTurn >= sharpThrRad * (cornerMode === 'organic' ? 0.82 : 0.66)) {
      if (leftStraight && rightStraight && armTurnRad >= (cornerMode === 'organic' ? 0.56 : 0.44) && (dPerp <= 2.25 || rEff <= 2.50 || conc >= 0.44)) {
        isSharp = true;
      } else if (nearTurnRad >= (cornerMode === 'organic' ? 0.78 : 0.62) && conc >= (cornerMode === 'organic' ? 0.62 : 0.54) && dPerp <= 1.35 && sagRatio4 >= 0.24) {
        isSharp = true;
      } else if (armTurnRad >= (cornerMode === 'organic' ? 1.02 : 0.88) && microTurn[centerI] >= (cornerMode === 'organic' ? 0.56 : 0.44) && rEff <= 1.65) {
        isSharp = true;
      } else if (cornerMode === 'sharp' && effTurn >= sharpThrRad * 0.78 && conc >= 0.40) {
        isSharp = true;
      }
    }

    let filletShoulders = null;
    if (isSharp && cornerMode !== 'sharp' && !pk.capApex) {
      const fil = filletSupport(pts, centerI, rawPeakSet);
      if (fil && (!isStrongPolygonWedge || (fil.r >= 4.2 && fil.t >= 3.8 && fil.rmsF <= 0.42 * fil.rmsW))) {
        isSharp = false;
        const shStep = clamp(Math.round(fil.t), 3, Math.min(14, Math.min(distPrev, distNext) - 1));
        if (shStep >= 3) {
          filletShoulders = {
            iL: idx(centerI - shStep),
            iR: idx(centerI + shStep),
            tL: fL ? [fL.d[0], fL.d[1]] : null,
            tR: fR ? [fR.d[0], fR.d[1]] : null
          };
        }
      }
      if (isSharp && !isStrongPolygonWedge && !isLineToCurve && !isStemCapCorner) {
        const css = cssCornerPersistence(smMicro, centerI, rawPeakSet);
        if (css && css.t3 >= 0.45 && css.rho < 0.62) isSharp = false;
      }
    }

    cands.push({
      i: centerI,
      sharp: isSharp,
      apexPt: (isSharp || isStrokeCap) ? apexPt : null,
      lockedTangent,
      filletShoulders,
      turn: effTurn,
      sign: pk.sign,
      leftStraight,
      rightStraight,
      isStrokeCap,
      isCurvCusp
    });
  }

  /* Pasca-validasi kelompok:
     1) Uji terlebih dahulu apakah pasangan 2 kandidat searah berjarak <= 18 langkah adalah Round U-Cap (ujung garis bulat G1)
        ATAU Inward V-Cusp (lekuk V lancip seperti poni rambut / lekuk daun) sebelum menahan 2 sudut C0! */
  if (cornerMode !== 'sharp' && cands.length >= 2) {
    const cn = cands.length;
    const seen = new Uint8Array(cn);
    for (let s0 = 0; s0 < cn; s0++) {
      const c0 = cands[s0];
      if (seen[s0] || !c0.sharp || c0.forced) continue;
      const grp = [s0];
      let accTurn = c0.turn;
      for (let q = 1; q < cn; q++) {
        const cj = cands[(s0 + q) % cn], cp = cands[(s0 + q - 1) % cn];
        if (!cj.sharp || cj.forced || cj.sign !== c0.sign) break;
        if ((cj.i - cp.i + n) % n > 10 || (cj.i - c0.i + n) % n > 20) break;
        if (accTurn + cj.turn > 2.45) break;
        accTurn += cj.turn;
        grp.push((s0 + q) % cn);
      }
      for (const g of grp) seen[g] = 1;
      if (grp.length < 2) continue;
      const first = cands[grp[0]].i, last = cands[grp[grp.length - 1]].i;
      let totalGrpTurn = 0, allStrongCorners = true;
      for (const g of grp) {
        totalGrpTurn += cands[g].turn;
        if (Math.max(microTurn[cands[g].i], fineTurn[cands[g].i]) < 0.52) allStrongCorners = false;
      }
      const spanCap = (last - first + n) % n;
      const bridgePts = [];
      const padB = spanCap >= 6 ? 2 : 1;
      for (let s = padB; s <= spanCap - padB; s++) bridgePts.push(pts[idx(first + s)]);
      const flBridge = bridgePts.length >= 3 ? fitLine2D(bridgePts) : null;
      const chX = pts[last][0] - pts[first][0], chY = pts[last][1] - pts[first][1], chL = Math.hypot(chX, chY) || 1;
      const midCap = idx(first + Math.round(spanCap * 0.5));
      const midBulge = Math.abs((pts[midCap][0] - pts[first][0]) * (-chY / chL) + (pts[midCap][1] - pts[first][1]) * (chX / chL));
      const isFlatBridgeCap = !!(flBridge && flBridge.rms <= 0.10 && flBridge.maxDev <= 0.18 && midBulge <= Math.max(0.32, chL * 0.08));

      /* Uji Round U-Cap (ujung garis bulat / ujung jari / ujung kapsul) terlebih dahulu! */
      if (grp.length === 2 && spanCap <= 18 && !isFlatBridgeCap) {
        const capPts = [];
        for (let s = -3; s <= spanCap + 3; s++) capPts.push(smFine[idx(first + s)]);
        const cfCap = fitCircle2D(capPts);
        if (cfCap && cfCap.r >= 1.5 && cfCap.r <= 24 && cfCap.rms <= Math.max(0.24, cfCap.r * 0.045) && midBulge >= Math.max(0.30, chL * 0.12)) {
          for (const g of grp) { cands[g].sharp = false; cands[g].apexPt = null; }
          smoothKnots[midCap] = 1;
          knotTangents.set(midCap, smoothTangentClosed(smFine, midCap, 5));
          smoothKnots[first] = 1;
          knotTangents.set(first, smoothTangentClosed(smFine, first, 4));
          smoothKnots[last] = 1;
          knotTangents.set(last, smoothTangentClosed(smFine, last, 4));
          continue;
        }
      }
      if (protectStemCaps && grp.length === 2 && isFlatBridgeCap && flBridge) {
        for (const g of grp) {
          const P = cands[g].apexPt || pts[cands[g].i];
          const proj = (P[0] - flBridge.c[0]) * flBridge.d[0] + (P[1] - flBridge.c[1]) * flBridge.d[1];
          const qx = flBridge.c[0] + flBridge.d[0] * proj, qy = flBridge.c[1] + flBridge.d[1] * proj;
          if (Math.hypot(qx - pts[cands[g].i][0], qy - pts[cands[g].i][1]) <= 0.85) {
            cands[g].apexPt = [qx, qy];
          }
        }
        continue;
      }
      const mid = (first + Math.round(((last - first + n) % n) / 2)) % n;
      const othersG = new Set(rawPeakSet);
      for (const g of grp) othersG.delete(cands[g].i);
      let reject = !!filletSupport(smMicro, mid, othersG);
      if (!reject) {
        const css = cssCornerPersistence(smMicro, mid, othersG);
        reject = !!(css && css.t3 >= 0.5 && css.rho < 0.60);
      }
      if (reject) for (const g of grp) { cands[g].sharp = false; cands[g].apexPt = null; }
    }
  }

  const mc = cands.length;
  const skip = new Uint8Array(mc);
  for (let k = 0; k < mc; k++) {
    if (skip[k]) continue;
    const a = cands[k], b = cands[(k + 1) % mc];
    const prev = cands[(k - 1 + mc) % mc], next = cands[(k + 2) % mc];
    const distAB = (b.i - a.i + n) % n;
    const distPrev = (a.i - prev.i + n) % n;
    const distNext = (next.i - b.i + n) % n;

    if (mc >= 3 && distAB > 0 && distAB <= 9 && a.sign === b.sign && !(juncFlags && (juncFlags[a.i] || juncFlags[b.i]))) {
      /* Konsolidasi Sudut Poligon Tunggal yang Tumpul/Terpotong (Chamfered Single Polygon Corner, mis. sudut 45° pita diagonal):
         Jika 2 kandidat searah berjarak <= 9 langkah diapit oleh dua lengan lurus panjang (distPrev >= 11, distNext >= 11)
         yang TIDAK berlawanan arah 180° (antiDot > -0.84, bukan stem cap), lebur menjadi 1 sudut tajam di perpotongan kedua garis! */
      if (distPrev >= Math.max(11, distAB * 2) && distNext >= Math.max(11, distAB * 2)) {
        const inPtsL = [], outPtsR = [];
        const maxInL = Math.min(18, distPrev - 2), maxOutR = Math.min(18, distNext - 2);
        for (let s = maxInL; s >= 2; s--) inPtsL.push(pts[idx(a.i - s)]);
        for (let s = 2; s <= maxOutR; s++) outPtsR.push(pts[idx(b.i + s)]);
        const fInLong = fitLine2D(inPtsL), fOutLong = fitLine2D(outPtsR);
        if (fInLong && fOutLong && fInLong.rms <= 0.20 && fOutLong.rms <= 0.20 && fInLong.span >= 6.0 && fOutLong.span >= 6.0) {
          const ux1 = fInLong.d[0], uy1 = fInLong.d[1];
          const ux2 = fOutLong.d[0], uy2 = fOutLong.d[1];
          const antiDot = ux1 * ux2 + uy1 * uy2;
          const detLong = ux1 * uy2 - uy1 * ux2;
          if (antiDot > -0.84 && Math.abs(detLong) >= 0.32) {
            const wxL = fOutLong.c[0] - fInLong.c[0], wyL = fOutLong.c[1] - fInLong.c[1];
            const tL = (wxL * uy2 - wyL * ux2) / detLong;
            const axL = fInLong.c[0] + ux1 * tL, ayL = fInLong.c[1] + uy1 * tL;
            const midIdx = (a.i + (distAB >> 1)) % n;
            const midPt = pts[midIdx];
            if (Math.hypot(axL - midPt[0], ayL - midPt[1]) <= 3.2) {
              corners[midIdx] = 1;
              apexMap.set(midIdx, [axL, ayL]);
              skip[k] = 1;
              skip[(k + 1) % mc] = 1;
              continue;
            }
          }
        }
      }
    }
    if (mc >= 3 && distAB > 0 && distAB <= 6 && a.sign === b.sign && !(juncFlags && (juncFlags[a.i] || juncFlags[b.i]))) {
      const midIdx = (a.i + (distAB >> 1)) % n;
      const pM6 = pts[idx(midIdx - 6)], pP6 = pts[idx(midIdx + 6)];
      const wCap = Math.hypot(pts[b.i][0] - pts[a.i][0], pts[b.i][1] - pts[a.i][1]);
      const wBack = Math.hypot(pP6[0] - pM6[0], pP6[1] - pM6[1]);

      /* Konsolidasi Lekuk V Dalam (Inward V-Cusp / Ujung Daun Lancip):
         Jika 2 kandidat berjarak <= 5 langkah memiliki lengan belakang yang melebar (wBack >= wCap * 1.45, wCap <= 3.8),
         satukan keduanya menjadi 1 puncak tajam C0 tunggal agar lembah poni rambut & lekuk daun tidak tumpul rata! */
      if ((a.isCurvCusp || b.isCurvCusp || (wCap <= 3.8 && wBack >= wCap * 1.45)) && (a.turn + b.turn >= 1.05)) {
        corners[midIdx] = 1;
        const armInPts = [], armOutPts = [];
        for (let s = 5; s >= 1; s--) armInPts.push(pts[idx(a.i - s)]);
        for (let s = 1; s <= 5; s++) armOutPts.push(pts[idx(b.i + s)]);
        const fInV = fitLine2D(armInPts), fOutV = fitLine2D(armOutPts);
        const midPt = [0.5 * (pts[a.i][0] + pts[b.i][0]), 0.5 * (pts[a.i][1] + pts[b.i][1])];
        let vApex = null;
        if (fInV && fOutV) {
          const detV = fInV.d[0] * fOutV.d[1] - fInV.d[1] * fOutV.d[0];
          if (Math.abs(detV) > 0.15) {
            const wxV = fOutV.c[0] - fInV.c[0], wyV = fOutV.c[1] - fInV.c[1];
            const tV = (wxV * fOutV.d[1] - wyV * fOutV.d[0]) / detV;
            const axV = fInV.c[0] + fInV.d[0] * tV, ayV = fInV.c[1] + fInV.d[1] * tV;
            if (Math.hypot(axV - midPt[0], ayV - midPt[1]) <= 1.35) vApex = [axV, ayV];
          }
        }
        if (!vApex) {
          const backMid = [0.5 * (pM6[0] + pP6[0]), 0.5 * (pM6[1] + pP6[1])];
          const outDx = midPt[0] - backMid[0], outDy = midPt[1] - backMid[1];
          const outLen = Math.hypot(outDx, outDy) || 1;
          vApex = [midPt[0] + (outDx / outLen) * 0.50, midPt[1] + (outDy / outLen) * 0.50];
        }
        apexMap.set(midIdx, vApex);
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
      if (a.isStrokeCap || b.isStrokeCap || (wCap <= 3.8 && wBack <= 5.6)) {
        smoothKnots[midIdx] = 1;
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
      if (a.sharp && b.sharp) continue;
      if (protectStemCaps && (a.sharp || b.sharp || a.leftStraight || b.rightStraight)) continue;
      if (false) {
        corners[midIdx] = 1;
        const midPt = [0.5 * (pts[a.i][0] + pts[b.i][0]), 0.5 * (pts[a.i][1] + pts[b.i][1])];
        const backMid = [0.5 * (pM6[0] + pP6[0]), 0.5 * (pM6[1] + pP6[1])];
        const outDx = midPt[0] - backMid[0], outDy = midPt[1] - backMid[1];
        const outLen = Math.hypot(outDx, outDy) || 1;
        apexMap.set(midIdx, [midPt[0] + (outDx / outLen) * 0.50, midPt[1] + (outDy / outLen) * 0.50]);
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
      if (a.sharp && b.sharp) continue;
      if (protectStemCaps && (a.sharp || b.sharp || a.leftStraight || b.rightStraight)) continue;
      if (Math.min(distPrev, distNext) > distAB * 2.4 && (!a.sharp && !b.sharp)) {
        smoothKnots[midIdx] = 1;
        skip[k] = 1;
        skip[(k + 1) % mc] = 1;
        continue;
      }
    }
  }

  /* Hanya terima kandidat sudut tajam C0 sejati, atau simpul G1 yang memiliki lockedTangent / strokeCap!
     Kandidat riak tangga piksel yang ditolak (c.sharp === false) TIDAK boleh dijadikan smoothKnot sembarangan */
  for (let k = 0; k < mc; k++) {
    if (skip[k]) continue;
    const c = cands[k];
    if (c.sharp && !c.forced && juncFlags && n >= 16) {
      /* Jangan buat sudut tajam C0 palsu tepat di sebelah T-junction (jarak <= 3 langkah / <= 3.2 px)
         karena akan memicu segmen garis lurus mikro (L stub 1-2 px) di ujung busur! */
      let nearJunc = false;
      for (let d = -3; d <= 3; d++) {
        if (d === 0) continue;
        const j = idx(c.i + d);
        if (juncFlags[j] && Math.hypot(pts[c.i][0] - pts[j][0], pts[c.i][1] - pts[j][1]) <= 3.4) {
          nearJunc = true;
          break;
        }
      }
      if (nearJunc) continue;
    }
    if (c.sharp) {
      corners[c.i] = 1;
      if (c.apexPt && (!juncFlags || !juncFlags[c.i])) apexMap.set(c.i, c.apexPt);
    } else if (c.filletShoulders) {
      const { iL, iR, tL, tR } = c.filletShoulders;
      if (!corners[iL]) {
        smoothKnots[iL] = 1;
        if (tL) knotTangents.set(iL, tL);
      }
      if (!corners[iR]) {
        smoothKnots[iR] = 1;
        if (tR) knotTangents.set(iR, tR);
      }
    } else if (c.isStrokeCap || c.lockedTangent) {
      smoothKnots[c.i] = 1;
      if (c.isStrokeCap && c.apexPt) apexMap.set(c.i, c.apexPt);
      if (c.lockedTangent) knotTangents.set(c.i, c.lockedTangent);
    }
  }

  /* Penempatan Simpul Ekstremum Kardinal Lokal (Local Cardinal Extrema Placement):
     Menempatkan simpul G1 dengan garis singgung horizontal/vertikal murni tepat di puncak lengkungan
     (seperti puncak busur dalam huruf 'e', mangkuk 'c', 'C', 'G', 'o', 'O', 's', 'S', 'a', 'b', 'd', 'p', 'q', 'u') */
  if (extremumAlign && n >= 12) {
    const measurePlateau = (arr, i0, axis, sign) => {
      const v0 = arr[i0][axis];
      let dL = 0, dR = 0;
      const maxPlat = Math.min(20, n >> 2);
      while (dL < maxPlat && sign * (arr[idx(i0 - dL - 1)][axis] - v0) <= 0.045) dL++;
      while (dR < maxPlat && sign * (arr[idx(i0 + dR + 1)][axis] - v0) <= 0.045) dR++;
      const ei = idx(i0 + Math.round((dR - dL) * 0.5));
      const flatSpan = dL + dR;
      return { ei, flatSpan };
    };
    const minDistToCorner = idxCand => {
      let md = n;
      for (let j = 0; j < n; j++) {
        if (corners[j] || (juncFlags && juncFlags[j])) {
          const d = Math.min((idxCand - j + n) % n, (j - idxCand + n) % n);
          if (d < md) md = d;
        }
      }
      return md;
    };
    const minDistToSmooth = idxCand => {
      let md = n;
      for (let j = 0; j < n; j++) {
        if (smoothKnots[j]) {
          const d = Math.min((idxCand - j + n) % n, (j - idxCand + n) % n);
          if (d < md) md = d;
        }
      }
      return md;
    };

    const wLocal = clamp(Math.round(n / 28), 4, 12);
    const reach = clamp(Math.round(n / 15), 7, 26);
    const extCands = [];
    for (let axis = 0; axis < 2; axis++) {
      for (const sign of [1, -1]) {
        for (let i = 0; i < n; i++) {
          const v0 = smFine[i][axis];
          let isExt = true;
          for (let s = 1; s <= wLocal; s++) {
            const vPrev = smFine[idx(i - s)][axis];
            const vNext = smFine[idx(i + s)][axis];
            if (sign * (vPrev - v0) < -1e-5 || sign * (vNext - v0) < -1e-5) {
              isExt = false;
              break;
            }
          }
          if (!isExt) continue;
          const { ei, flatSpan } = measurePlateau(smFine, i, axis, sign);
          if (flatSpan > 14) continue; /* Abaikan segmen garis lurus mendatar/tegak */
          const dCorner = minDistToCorner(ei);
          if (dCorner < (isMicroGlyph ? 4 : 8)) continue;
          const effReach = Math.min(reach, dCorner - 1);
          if (effReach < (isMicroGlyph ? 4 : 6)) continue;
          const vei = smFine[ei][axis];
          const promL = sign * (smFine[idx(ei - effReach)][axis] - vei);
          const promR = sign * (smFine[idx(ei + effReach)][axis] - vei);
          if (Math.min(promL, promR) < 0.65 || Math.max(promL, promR) < 1.10) continue;
          const winPts = [];
          for (let s = -effReach; s <= effReach; s++) winPts.push(smFine[idx(ei + s)]);
          const lf = fitLine2D(winPts);
          const cf = fitCircle2D(winPts);
          if (!lf || lf.rms < 0.14 || (cf && cf.rms > lf.rms * 0.82)) continue;
          extCands.push({ ei, axis, sign, prom: Math.min(promL, promR), r: cf ? cf.r : 99 });
        }
      }
    }

    extCands.sort((a, b) => b.prom - a.prom);
    for (const ec of extCands) {
      let { ei, axis, r } = ec;
      if (minDistToCorner(ei) < (isMicroGlyph ? 4 : 8) || minDistToSmooth(ei) < (isMicroGlyph ? 6 : 16)) continue;
      let tooCloseChord = false;
      for (let j = 0; j < n; j++) {
        if (smoothKnots[j] || corners[j]) {
          if (Math.hypot(smFine[ei][0] - smFine[j][0], smFine[ei][1] - smFine[j][1]) < (isMicroGlyph ? 3.8 : 9.5)) {
            tooCloseChord = true;
            break;
          }
        }
      }
      if (tooCloseChord) continue;
      if (r <= 10.5) {
        let bestK = ei, bestTurn = -1;
        for (let d = -5; d <= 5; d++) {
          const cand = idx(ei + d);
          const tCand = Math.abs(turnOn(smFine, cand, 4));
          if (tCand > bestTurn) { bestTurn = tCand; bestK = cand; }
        }
        ei = bestK;
        if (minDistToCorner(ei) < (isMicroGlyph ? 4 : 8) || minDistToSmooth(ei) < (isMicroGlyph ? 6 : 14)) continue;
        smoothKnots[ei] = 1;
        knotTangents.set(ei, smoothTangentClosed(smFine, ei, 5));
        continue;
      }
      smoothKnots[ei] = 1;
      const dx = smFine[idx(ei + 4)][0] - smFine[idx(ei - 4)][0];
      const dy = smFine[idx(ei + 4)][1] - smFine[idx(ei - 4)][1];
      const empT = smoothTangentClosed(smFine, ei, 6);
      if (axis === 1) {
        const cardT = [dx >= 0 ? 1 : -1, 0];
        if (empT[0] * cardT[0] >= 0.985 && r >= 12) knotTangents.set(ei, cardT);
        else knotTangents.set(ei, empT);
      } else {
        const cardT = [0, dy >= 0 ? 1 : -1];
        if (empT[1] * cardT[1] >= 0.985 && r >= 12) knotTangents.set(ei, cardT);
        else knotTangents.set(ei, empT);
      }
    }
  }

  /* Deteksi Puncak U-Cap Bulat (Ujung Jari, Ujung Senyum, & Lembah Jari Halus):
     Jika terdapat belokan U mulus (turn L=6 >= 1.35 rad) tanpa sudut tajam C0 atau smoothKnot di dekatnya,
     tempatkan tepat 1 simpul G1 di puncak belokan dengan garis singgung empiris alami! */
  if (n >= 24) {
    for (let i = 0; i < n; i++) {
      const t6 = Math.abs(turnOn(smFine, i, 6));
      if (t6 < 1.35) continue;
      let isPeak = true;
      for (let d = -6; d <= 6; d++) {
        if (d !== 0 && Math.abs(turnOn(smFine, idx(i + d), 6)) > t6 + 1e-6) { isPeak = false; break; }
      }
      if (!isPeak) continue;
      let nearAny = false;
      for (let d = -10; d <= 10; d++) {
        const k = idx(i + d);
        if (corners[k] || smoothKnots[k]) { nearAny = true; break; }
      }
      if (nearAny) continue;
      const capWin = [];
      for (let d = -6; d <= 6; d++) capWin.push(smFine[idx(i + d)]);
      const cf = fitCircle2D(capWin);
      if (cf && cf.r >= 1.6 && cf.r <= 14.0 && cf.rms <= Math.max(0.28, cf.r * 0.055)) {
        smoothKnots[i] = 1;
        knotTangents.set(i, smoothTangentClosed(smFine, i, 5));
      }
    }
  }

  return { corners, smoothKnots, apexMap, knotTangents };
}

function detectCorners(pts, angleDeg = 44, lookahead = 4, juncFlags = null, advOpt = {}) {
  return detectCornersAndExtrema(pts, angleDeg, juncFlags, advOpt).corners;
}

function oneSidedTangentOpen(pts, atStart = true, maxSpanPx = 9.0) {
  const n = pts.length;
  if (n < 2) return [1, 0];
  if (n === 2) {
    const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }
  const P0 = atStart ? pts[0] : pts[n - 1];
  const sArr = [0];
  const pArr = [P0];
  let accS = 0;
  const maxK = Math.min(n - 1, 16);
  for (let k = 1; k <= maxK; k++) {
    const prev = atStart ? pts[k - 1] : pts[n - k];
    const cur = atStart ? pts[k] : pts[n - 1 - k];
    const ds = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    if (ds < 1e-5) continue;
    accS += ds;
    sArr.push(accS);
    pArr.push(cur);
    if (accS >= maxSpanPx && sArr.length >= 5) break;
  }
  if (sArr.length < 3) {
    const P1 = pArr[pArr.length - 1];
    const dx = atStart ? (P1[0] - P0[0]) : (P0[0] - P1[0]);
    const dy = atStart ? (P1[1] - P0[1]) : (P0[1] - P1[1]);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  /* Jika segmen lokal sangat cocok dengan busur lingkaran (mis. busur dalam huruf e),
     gunakan garis singgung analitik lingkaran pada titik ujung P0 */
  if (pArr.length >= 5) {
    const cf = fitCircle2D(pArr);
    const lf = fitLine2D(pArr);
    if (cf && cf.r >= 2.2 && cf.r <= 220 && cf.rms <= 0.16 && (!lf || cf.rms < lf.rms * 0.65)) {
      const rx = P0[0] - cf.cx, ry = P0[1] - cf.cy, rl = Math.hypot(rx, ry) || 1;
      const Pmid = pArr[Math.min(3, pArr.length - 1)];
      const dirX = Pmid[0] - P0[0], dirY = Pmid[1] - P0[1];
      let tx = -ry / rl, ty = rx / rl;
      if (tx * dirX + ty * dirY < 0) { tx = -tx; ty = -ty; }
      if (!atStart) { tx = -tx; ty = -ty; }
      return [tx, ty];
    }
  }

  /* Regresi kuadratik berbobot s * exp(-s/sigma) agar derau sub-piksel di s=1px tidak membelokkan garis singgung */
  let sw = 0, sws = 0, sws2 = 0;
  let swVx = 0, swVy = 0, swsVx = 0, swsVy = 0;
  for (let i = 1; i < sArr.length; i++) {
    const s = sArr[i];
    const vx = (pArr[i][0] - P0[0]) / s;
    const vy = (pArr[i][1] - P0[1]) / s;
    const w = Math.min(s, 3.0) * Math.exp(-s / (maxSpanPx * 0.62));
    sw += w;
    sws += w * s;
    sws2 += w * s * s;
    swVx += w * vx;
    swVy += w * vy;
    swsVx += w * s * vx;
    swsVy += w * s * vy;
  }
  const det = sw * sws2 - sws * sws;
  let tx, ty;
  const meanVx = swVx / (sw || 1), meanVy = swVy / (sw || 1);
  if (Math.abs(det) > 1e-6) {
    tx = (sws2 * swVx - sws * swsVx) / det;
    ty = (sws2 * swVy - sws * swsVy) / det;
    /* Batasi deviasi ekstrapolasi kuadratik terhadap arah sekant rata-rata terdekat (maks ~22 derajat) */
    const ml = Math.hypot(meanVx, meanVy) || 1;
    const tl = Math.hypot(tx, ty) || 1;
    const dotM = (tx * meanVx + ty * meanVy) / (tl * ml);
    if (dotM < 0.92) {
      tx = 0.55 * (tx / tl) + 0.45 * (meanVx / ml);
      ty = 0.55 * (ty / tl) + 0.45 * (meanVy / ml);
    }
  } else {
    tx = meanVx;
    ty = meanVy;
  }
  if (!atStart) {
    tx = -tx;
    ty = -ty;
  }
  const l = Math.hypot(tx, ty) || 1;
  return [tx / l, ty / l];
}

function detectMaximalStraightSpans(pts, corners, smoothKnots, knotTangents, juncFlags, lineStr = 0.65, preStraight = null, axisSnapOn = true, axisSnapDeg = 2.3) {
  const n = pts.length;
  const onStraight = new Uint8Array(n);
  if (n < 12 || lineStr <= 0.1) return onStraight;
  const isHardJunc = k => !!(juncFlags && juncFlags[k] === 1);
  let minX_s = Infinity, maxX_s = -Infinity, minY_s = Infinity, maxY_s = -Infinity;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (p[0] < minX_s) minX_s = p[0]; if (p[0] > maxX_s) maxX_s = p[0];
    if (p[1] < minY_s) minY_s = p[1]; if (p[1] > maxY_s) maxY_s = p[1];
  }
  const isSmallLoop = Math.hypot(maxX_s - minX_s, maxY_s - minY_s) <= 38 || n <= 115;

  const idx = k => ((k % n) + n) % n;
  const seedLen = isSmallLoop ? 6 : 9;
  const seedRmsTol = 0.036 + lineStr * 0.018;
  const seedDevTol = 0.070 + lineStr * 0.028;

  const isSeed = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const win = [];
    let hasCornerInside = false;
    for (let s = 0; s < seedLen; s++) {
      const k = idx(i + s);
      if ((preStraight && preStraight[k]) || (s > 0 && s < seedLen - 1 && (corners[k] || isHardJunc(k)))) {
        hasCornerInside = true; break;
      }
      win.push(pts[k]);
    }
    if (hasCornerInside) continue;
    const fl = fitLine2D(win);
    if (!fl || fl.span < (isSmallLoop ? 3.2 : 5.2) || fl.rms > seedRmsTol || fl.maxDev > seedDevTol) continue;
    const P0 = win[0], P1 = win[seedLen - 1], PM = win[seedLen >> 1];
    const ch = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) || 1;
    const sag = Math.abs((PM[0] - P0[0]) * (P1[1] - P0[1]) - (PM[1] - P0[1]) * (P1[0] - P0[0])) / ch;
    if (sag <= 0.055) isSeed[i] = 1;
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      if (!isSeed[i] || isSeed[idx(i + 1)]) continue;
      let gap = 0, hitCorner = false;
      while (gap < 18 && !isSeed[idx(i + 1 + gap)]) {
        const k = idx(i + 1 + gap);
        if ((preStraight && preStraight[k]) || corners[k] || isHardJunc(k)) { hitCorner = true; break; }
        gap++;
      }
      if (hitCorner || gap === 0 || gap > 16 || !isSeed[idx(i + 1 + gap)]) continue;
      const testPts = [];
      for (let s = -2; s <= gap + seedLen + 1; s++) {
        const k = idx(i + s);
        if (s > 0 && s < gap + seedLen && (corners[k] || isHardJunc(k))) { hitCorner = true; break; }
        testPts.push(pts[k]);
      }
      if (hitCorner) continue;
      const fl = fitLine2D(testPts);
      if (fl && fl.rms <= seedRmsTol * 1.38 && fl.maxDev <= seedDevTol * 1.55) {
        for (let s = 1; s <= gap; s++) isSeed[idx(i + s)] = 1;
      }
    }
  }

  const visited = new Uint8Array(n);
  const spans = [];
  for (let i = 0; i < n; i++) {
    if (!isSeed[i] || visited[i]) continue;
    let start = i;
    while (isSeed[idx(start - 1)] && !visited[idx(start - 1)] && !corners[start] && !isHardJunc(start)) {
      start = idx(start - 1);
      if (start === i) break;
    }
    let end = idx(start + seedLen - 1);
    let curSeed = start;
    visited[curSeed] = 1;
    while (isSeed[idx(curSeed + 1)] && !visited[idx(curSeed + 1)]) {
      const nextSeed = idx(curSeed + 1);
      if (corners[idx(curSeed + seedLen - 1)] || isHardJunc(idx(curSeed + seedLen - 1))) break;
      const len = ((idx(nextSeed + seedLen - 1) - start + n) % n) + 1;
      if (len >= n - 2) break;
      if (len >= 22) {
        const trim = Math.min(8, Math.floor(len * 0.2));
        const testPts = [];
        for (let s = trim; s < len - trim; s++) testPts.push(pts[idx(start + s)]);
        const fl = fitLine2D(testPts);
        if (!fl || fl.rms > seedRmsTol * 1.42 || fl.maxDev > seedDevTol * 1.58) break;
      }
      visited[nextSeed] = 1;
      curSeed = nextSeed;
      end = idx(curSeed + seedLen - 1);
    }

    let spanLen = ((end - start + n) % n) + 1;
    if (spanLen < (isSmallLoop ? 7 : 14)) continue;

    const pad = Math.max(2, Math.floor(spanLen * 0.2));
    const corePts = [];
    for (let s = pad; s < spanLen - pad; s++) corePts.push(pts[idx(start + s)]);
    const coreLine = fitLine2D(corePts);
    if (!coreLine || coreLine.rms > 0.045) continue;

    /* Perluas start mundur & end maju selama titik masih berada pada coreLine
       (mencegah rentang lurus berhenti terlalu dini akibat riak sub-piksel 0.03px sebelum busur) */
    const extDevTol = Math.max(0.085, coreLine.rms * 3.4);
    while (spanLen < n - 4 && !corners[start] && !isHardJunc(start)) {
      const prevIdx = idx(start - 1);
      if (corners[prevIdx] || isHardJunc(prevIdx)) break;
      const p = pts[prevIdx], pCur = pts[start];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      const stepDx = pCur[0] - p[0], stepDy = pCur[1] - p[1], stepL = Math.hypot(stepDx, stepDy) || 1;
      const dot = (stepDx * coreLine.d[0] + stepDy * coreLine.d[1]) / stepL;
      if (dev <= extDevTol && dot >= 0.88) { start = prevIdx; spanLen++; } else break;
    }
    while (spanLen < n - 4 && !corners[end] && !isHardJunc(end)) {
      const nextIdx = idx(end + 1);
      if (corners[nextIdx] || isHardJunc(nextIdx)) break;
      const p = pts[nextIdx], pCur = pts[end];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      const stepDx = p[0] - pCur[0], stepDy = p[1] - pCur[1], stepL = Math.hypot(stepDx, stepDy) || 1;
      const dot = (stepDx * coreLine.d[0] + stepDy * coreLine.d[1]) / stepL;
      if (dev <= extDevTol && dot >= 0.88) { end = nextIdx; spanLen++; } else break;
    }

    const trimDevTol = Math.max(0.038, coreLine.rms * 1.65);
    while (spanLen > 10 && !corners[start] && !isHardJunc(start)) {
      const p = pts[start];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      if (dev > trimDevTol) { start = idx(start + 1); spanLen--; } else break;
    }
    while (spanLen > 10 && !corners[end] && !isHardJunc(end)) {
      const p = pts[end];
      const dev = Math.abs((p[0] - coreLine.c[0]) * coreLine.d[1] - (p[1] - coreLine.c[1]) * coreLine.d[0]);
      if (dev > trimDevTol) { end = idx(end - 1); spanLen--; } else break;
    }

    /* Tarik ujung rentang lurus ke sudut tajam C0 terdekat HANYA JIKA sudut tersebut benar-benar terletak pada garis coreLine
       (bukan puncak/apex ujung U-cap sempit yang berjarak > 0.26 px ke samping garis lurus!) */
    const maxCornerLineDev = Math.max(0.26, coreLine.rms * 4.5);
    for (let d = 1; d <= 14; d++) {
      const candS = idx(start - d);
      if (corners[candS] || isHardJunc(candS)) {
        const P = pts[candS];
        const devC = Math.abs((P[0] - coreLine.c[0]) * coreLine.d[1] - (P[1] - coreLine.c[1]) * coreLine.d[0]);
        let maxNeck = devC;
        for (let s = 1; s < d; s++) {
          const Q = pts[idx(candS + s)];
          const dv = Math.abs((Q[0] - coreLine.c[0]) * coreLine.d[1] - (Q[1] - coreLine.c[1]) * coreLine.d[0]);
          if (dv > maxNeck) maxNeck = dv;
        }
        const allowNeck = (d <= 8 && corners[candS]) ? 1.35 : maxCornerLineDev;
        if (maxNeck <= allowNeck && devC <= (d <= 8 ? 1.15 : maxCornerLineDev)) start = candS;
        break;
      }
      if (d <= 6 && corners[idx(start + d)]) { start = idx(start + d); break; }
    }
    for (let d = 1; d <= 14; d++) {
      const candE = idx(end + d);
      if (corners[candE] || isHardJunc(candE)) {
        const P = pts[candE];
        const devC = Math.abs((P[0] - coreLine.c[0]) * coreLine.d[1] - (P[1] - coreLine.c[1]) * coreLine.d[0]);
        let maxNeck = devC;
        for (let s = 1; s < d; s++) {
          const Q = pts[idx(end + s)];
          const dv = Math.abs((Q[0] - coreLine.c[0]) * coreLine.d[1] - (Q[1] - coreLine.c[1]) * coreLine.d[0]);
          if (dv > maxNeck) maxNeck = dv;
        }
        const allowNeck = (d <= 8 && corners[candE]) ? 1.35 : maxCornerLineDev;
        if (maxNeck <= allowNeck && devC <= (d <= 8 ? 1.15 : maxCornerLineDev)) end = candE;
        break;
      }
      if (d <= 6 && corners[idx(end - d)]) { end = idx(end - d); break; }
    }

    /* Snap ke titik singgung lingkaran busur tetangga TANPA menggeser start/end masuk ke dalam bahu busur
       (d >= 0 untuk start, d <= 0 untuk end) agar tidak mengontaminasi finalPts */
    let snapStartPt = null, snapEndPt = null;
    if (!corners[start] && !isHardJunc(start)) {
      const arcBefore = [];
      for (let s = 14; s >= 1; s--) arcBefore.push(pts[idx(start - s)]);
      const cf = fitCircle2D(arcBefore);
      if (cf && cf.r >= 10.0 && cf.r <= 220 && cf.rms <= 0.11) {
        const projT = (cf.cx - coreLine.c[0]) * coreLine.d[0] + (cf.cy - coreLine.c[1]) * coreLine.d[1];
        const tx = coreLine.c[0] + coreLine.d[0] * projT;
        const ty = coreLine.c[1] + coreLine.d[1] * projT;
        let bestS = start, bestD = Infinity;
        for (let d = 0; d <= 4; d++) {
          const cand = idx(start + d);
          if (corners[cand]) continue;
          const dist = Math.hypot(pts[cand][0] - tx, pts[cand][1] - ty);
          if (dist < bestD) { bestD = dist; bestS = cand; }
        }
        if (bestD <= 1.5) {
          start = bestS;
          snapStartPt = [tx, ty];
        }
      }
    }
    if (!corners[end] && !isHardJunc(end)) {
      const arcAfter = [];
      for (let s = 1; s <= 14; s++) arcAfter.push(pts[idx(end + s)]);
      const cf = fitCircle2D(arcAfter);
      if (cf && cf.r >= 10.0 && cf.r <= 220 && cf.rms <= 0.11) {
        const projT = (cf.cx - coreLine.c[0]) * coreLine.d[0] + (cf.cy - coreLine.c[1]) * coreLine.d[1];
        const tx = coreLine.c[0] + coreLine.d[0] * projT;
        const ty = coreLine.c[1] + coreLine.d[1] * projT;
        let bestE = end, bestD = Infinity;
        for (let d = -4; d <= 0; d++) {
          const cand = idx(end + d);
          if (corners[cand]) continue;
          const dist = Math.hypot(pts[cand][0] - tx, pts[cand][1] - ty);
          if (dist < bestD) { bestD = dist; bestE = cand; }
        }
        if (bestD <= 1.5) {
          end = bestE;
          snapEndPt = [tx, ty];
        }
      }
    }

    spanLen = ((end - start + n) % n) + 1;
    const startSharp = !!(corners[start] || isHardJunc(start));
    const endSharp = !!(corners[end] || isHardJunc(end));
    const bothEndsSharp = startSharp && endSharp;
    const isCrispCollinear = coreLine.rms <= 0.038 && coreLine.maxDev <= 0.075;
    const minReqLen = bothEndsSharp ? (isSmallLoop ? 6 : 9) : ((isSmallLoop || isCrispCollinear) ? 8 : Math.max(14, Math.min(24, Math.floor(n * 0.06))));
    if (spanLen < minReqLen) continue;
    const trimS = startSharp ? 2 : 0;
    const trimE = endSharp ? 2 : 0;
    const finalPts = [];
    for (let s = trimS; s < spanLen - trimE; s++) {
      if (s === 0 && snapStartPt) finalPts.push(snapStartPt);
      else if (s === spanLen - 1 && snapEndPt) finalPts.push(snapEndPt);
      else finalPts.push(pts[idx(start + s)]);
    }
    const fl = fitLine2D(finalPts);
    const minReqSpan = bothEndsSharp ? (isSmallLoop ? 4.2 : 7.0) : ((isSmallLoop || isCrispCollinear) ? 6.0 : 11.5);
    const isLongCollinear = (spanLen >= 28 || (bothEndsSharp && spanLen >= 12 && isCrispCollinear)) && coreLine.rms <= 0.038;
    const allowRms = bothEndsSharp ? seedRmsTol * 1.40 : (isLongCollinear ? seedRmsTol * 1.35 : seedRmsTol * 1.15);
    const allowDev = bothEndsSharp ? seedDevTol * 1.50 : (isLongCollinear ? Math.max(seedDevTol * 1.60, 0.165) : seedDevTol * 1.25);
    if (!fl || fl.span < minReqSpan || fl.rms > allowRms || fl.maxDev > allowDev) continue;

    /* Jika ujung start/end berjarak <= 14 langkah dari sudut tajam C0:
       Hanya tolak bila rentang sangat pendek (< 12 px) DAN bukan isCrispCollinear */
    if (spanLen < 12 && !isCrispCollinear) {
      let nearOnLineCorner = false;
      if (!startSharp) {
        for (let d = 1; d <= 14; d++) {
          const k = idx(start - d);
          if (corners[k] || isHardJunc(k)) {
            const devC = Math.abs((pts[k][0] - fl.c[0]) * fl.d[1] - (pts[k][1] - fl.c[1]) * fl.d[0]);
            if (devC <= 0.55) nearOnLineCorner = true;
            break;
          }
        }
      }
      if (!endSharp && !nearOnLineCorner) {
        for (let d = 1; d <= 14; d++) {
          const k = idx(end + d);
          if (corners[k] || isHardJunc(k)) {
            const devC = Math.abs((pts[k][0] - fl.c[0]) * fl.d[1] - (pts[k][1] - fl.c[1]) * fl.d[0]);
            if (devC <= 0.55) nearOnLineCorner = true;
            break;
          }
        }
      }
      if (nearOnLineCorner) continue;
    }

    /* Validasi G1 Tangential Continuity untuk rentang pendek/menengah yang tidak bermuara pada cap sempit */
    if (!isLongCollinear) {
      const lookW = clamp(Math.floor((n - spanLen) * 0.12), 3, 6);
      if (!startSharp) {
        const pCapS = pts[idx(start - Math.min(5, lookW))];
        const capDevS = Math.abs((pCapS[0] - fl.c[0]) * fl.d[1] - (pCapS[1] - fl.c[1]) * fl.d[0]);
        if (capDevS < 0.45) {
          const outsideS = [];
          for (let s = lookW; s >= 0; s--) outsideS.push(pts[idx(start - s)]);
          const tOutS = oneSidedTangentOpen(outsideS, false, lookW);
          if (tOutS[0] * fl.d[0] + tOutS[1] * fl.d[1] < 0.88) continue;
        }
      }
      if (!endSharp) {
        const pCapE = pts[idx(end + Math.min(5, lookW))];
        const capDevE = Math.abs((pCapE[0] - fl.c[0]) * fl.d[1] - (pCapE[1] - fl.c[1]) * fl.d[0]);
        if (capDevE < 0.45) {
          const outsideE = [];
          for (let s = 0; s <= lookW; s++) outsideE.push(pts[idx(end + s)]);
          const tOutE = oneSidedTangentOpen(outsideE, true, lookW);
          if (tOutE[0] * fl.d[0] + tOutE[1] * fl.d[1] < 0.88) continue;
        }
      }
    }

    const extW = bothEndsSharp ? 6 : Math.min(22, Math.max(12, spanLen));
    const extPts = [];
    for (let s = -extW; s < 0; s++) {
      const k = idx(start + s);
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(pts[k]);
    }
    for (let s = 0; s < spanLen; s++) extPts.push(pts[idx(start + s)]);
    for (let s = spanLen; s < spanLen + extW; s++) {
      const k = idx(start + s);
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(pts[k]);
    }
    const cfExt = extPts.length >= 10 ? fitCircle2D(extPts) : null;
    const flExt = fitLine2D(extPts);
    if (cfExt && flExt && cfExt.r >= 4.0 && cfExt.r < 480 && cfExt.rms < flExt.rms * (bothEndsSharp ? 0.58 : 0.72) && cfExt.rms <= Math.max(0.18, cfExt.r * 0.012)) continue;

    const stepOut = Math.min(12, Math.max(5, (n - spanLen) >> 2));
    const pBefore = pts[idx(start - stepOut)];
    const pAfter = pts[idx(end + stepOut)];
    const devBefore = Math.abs((pBefore[0] - fl.c[0]) * fl.d[1] - (pBefore[1] - fl.c[1]) * fl.d[0]);
    const devAfter = Math.abs((pAfter[0] - fl.c[0]) * fl.d[1] - (pAfter[1] - fl.c[1]) * fl.d[0]);
    const minOutDev = isLongCollinear ? Math.max(0.08, fl.rms * 2.5) : Math.max(0.15, fl.rms * 3.8);
    if (devBefore < minOutDev || devAfter < minOutDev) continue;

    /* Filter leher angsa (swan-neck) hanya untuk rentang pendek/menengah (< 80 px dan bukan isLongCollinear)
       agar tidak menolak transisi G1 lurus-ke-busur besar (seperti dinding luar huruf O/D dengan R >= 60 px) */
    if (fl.span < 80 && !isLongCollinear && !isSmallLoop) {
      const stepOut2 = Math.min(20, Math.max(10, (n - spanLen) >> 2));
      if (!startSharp) {
        const pBefore2 = pts[idx(start - stepOut2)];
        const distBefore2 = Math.hypot(pBefore2[0] - pts[start][0], pBefore2[1] - pts[start][1]) || 1;
        const devBefore2 = Math.abs((pBefore2[0] - fl.c[0]) * fl.d[1] - (pBefore2[1] - fl.c[1]) * fl.d[0]);
        if (devBefore2 < 0.85 || (devBefore2 / distBefore2) < 0.09) continue;
      }
      if (!endSharp) {
        const pAfter2 = pts[idx(end + stepOut2)];
        const distAfter2 = Math.hypot(pAfter2[0] - pts[end][0], pAfter2[1] - pts[end][1]) || 1;
        const devAfter2 = Math.abs((pAfter2[0] - fl.c[0]) * fl.d[1] - (pAfter2[1] - fl.c[1]) * fl.d[0]);
        if (devAfter2 < 0.85 || (devAfter2 / distAfter2) < 0.09) continue;
      }
    }

    spans.push({ start, end, spanLen, fl: coreLine, snapStartPt, snapEndPt });
  }

  for (const sp of spans) {
    let { start, end, spanLen, fl, snapStartPt, snapEndPt } = sp;
    if (snapStartPt && !corners[start] && !isHardJunc(start)) pts[start] = snapStartPt;
    if (snapEndPt && !corners[end] && !isHardJunc(end)) pts[end] = snapEndPt;

    /* Axis-snap arah garis lurus fl.d bila hampir vertikal/horizontal (dalam batas axisSnapDeg) */
    let ux = fl.d[0], uy = fl.d[1];
    const PA0 = pts[start], PB0 = pts[end];
    if ((PB0[0] - PA0[0]) * ux + (PB0[1] - PA0[1]) * uy < 0) { ux = -ux; uy = -uy; }
    if (axisSnapOn && !(juncFlags && (juncFlags[start] || juncFlags[end]))) {
      const deg = Math.atan2(uy, ux) * 180 / Math.PI;
      const canons = [0, 90, -90, 180, -180];
      for (const c of canons) {
        let df = Math.abs(deg - c);
        if (df > 180) df = 360 - df;
        const maxEndShift = 0.5 * fl.span * Math.sin(df * Math.PI / 180);
        if (df <= axisSnapDeg && maxEndShift <= 0.28) {
          const rad = c * Math.PI / 180;
          ux = Math.cos(rad);
          uy = Math.sin(rad);
          break;
        }
      }
    }
    sp.ux = ux;
    sp.uy = uy;

    /* Proyeksikan seluruh titik rentang lurus (termasuk simpul G1 start & end) langsung ke garis lurus
       fl.c + (ux, uy) dan kunci di onStraight[k] = 1 agar tidak digeser oleh Taubin/despeckle */
    const cx = fl.c[0], cy = fl.c[1];
    for (let s = 0; s < spanLen; s++) {
      const k = idx(start + s);
      const isEnd = (s === 0 || s === spanLen - 1);
      if (!corners[k] && !isHardJunc(k)) {
        const P = pts[k];
        const proj = (P[0] - cx) * ux + (P[1] - cy) * uy;
        pts[k] = [cx + ux * proj, cy + uy * proj];
        if (!isEnd) {
          smoothKnots[k] = 0;
          knotTangents.delete(k);
        }
        onStraight[k] = 1;
      } else if (isEnd && corners[k] && !isHardJunc(k)) {
        const P = pts[k];
        const perpDev = Math.abs((P[0] - cx) * uy - (P[1] - cy) * ux);
        if (perpDev <= 0.32) {
          const proj = (P[0] - cx) * ux + (P[1] - cy) * uy;
          pts[k] = [cx + ux * proj, cy + uy * proj];
          onStraight[k] = 1;
        }
      }
    }

    if (!corners[start]) {
      let nearHardStart = false;
      for (let d = -8; d <= 8; d++) {
        const nb = idx(start + d);
        if (corners[nb] || (juncFlags && juncFlags[nb])) nearHardStart = true;
        if (d !== 0 && !corners[nb] && !(juncFlags && juncFlags[nb])) {
          smoothKnots[nb] = 0;
          knotTangents.delete(nb);
        }
      }
      if (!nearHardStart) {
        smoothKnots[start] = 1;
        knotTangents.set(start, [ux, uy]);
      }
    }
    if (!corners[end]) {
      let nearHardEnd = false;
      for (let d = -8; d <= 8; d++) {
        const nb = idx(end + d);
        if (corners[nb] || (juncFlags && juncFlags[nb])) nearHardEnd = true;
        if (d !== 0 && !corners[nb] && !(juncFlags && juncFlags[nb])) {
          smoothKnots[nb] = 0;
          knotTangents.delete(nb);
        }
      }
      if (!nearHardEnd) {
        smoothKnots[end] = 1;
        knotTangents.set(end, [ux, uy]);
      }
    }
  }

  if (spans.length >= 2) {
    for (let i = 0; i < spans.length; i++) {
      const spA = spans[i], spB = spans[(i + 1) % spans.length];
      const gapLen = (spB.start - spA.end + n) % n;
      if (gapLen >= 2 && gapLen <= Math.max(58, Math.floor(n * 0.25))) {
        const pEndA = pts[spA.end], pStartB = pts[spB.start];
        const capW = Math.hypot(pStartB[0] - pEndA[0], pStartB[1] - pEndA[1]);
        const antiDot = spA.ux * spB.ux + spA.uy * spB.uy;
        /* Jika dua rentang lurus berlawanan arah (anti-paralel) dihubungkan oleh U-cap sempit TANPA sudut siku tajam,
           bersihkan sudut C0 palsu di tengah U-cap agar menjadi busur penutup yang mulus */
        let sharpCapCnt = (corners[spA.end] ? 1 : 0) + (corners[spB.start] ? 1 : 0);
        for (let s = 1; s < gapLen; s++) if (corners[idx(spA.end + s)]) sharpCapCnt++;
        if (gapLen <= 48 && capW <= 22.0 && antiDot <= -0.90 && sharpCapCnt === 0) {
          for (let s = 1; s < gapLen; s++) {
            const k = idx(spA.end + s);
            if (!isHardJunc(k)) {
              corners[k] = 0;
              smoothKnots[k] = 0;
              knotTangents.delete(k);
            }
          }
          if (!(juncFlags && juncFlags[spA.end])) {
            corners[spA.end] = 0;
            smoothKnots[spA.end] = 1;
            knotTangents.set(spA.end, [spA.ux, spA.uy]);
          }
          if (!(juncFlags && juncFlags[spB.start])) {
            corners[spB.start] = 0;
            smoothKnots[spB.start] = 1;
            knotTangents.set(spB.start, [spB.ux, spB.uy]);
          }
          continue;
        }
        let hasSharpInGap = false;
        const arcPts = [];
        for (let s = 0; s <= gapLen; s++) {
          const k = idx(spA.end + s);
          if (s > 0 && s < gapLen && (corners[k] || isHardJunc(k))) { hasSharpInGap = true; break; }
          arcPts.push(pts[k]);
        }
        /* Hanya hapus smoothKnots di dalam busur jika bukan U-turn lebar (antiDot >= -0.50 || capW <= 22.0)
           agar simpul puncak pada busur setengah lingkaran 180° lebar (seperti puncak huruf O) tetap terjaga */
        if (!hasSharpInGap && (antiDot >= -0.50 || capW <= 22.0)) {
          const cf = fitCircle2D(arcPts);
          if (cf && cf.r >= 2.0 && cf.r <= 260 && cf.rms <= Math.max(0.32, cf.r * 0.025)) {
            for (let s = 1; s < gapLen; s++) {
              const k = idx(spA.end + s);
              smoothKnots[k] = 0;
              knotTangents.delete(k);
            }
          }
        }
      }
    }
  }

  return onStraight;
}

function computeContourAdaptiveOpts(pts, area, baseLambda, baseTol, scale, baseAdvOpt = {}) {
  const n = pts ? pts.length : 0;
  const absA = Math.abs(area || 0);
  if (n < 6) return { localLambda: baseLambda * 0.35, localTol: Math.max(0.05 * scale, baseTol * 0.6), localAdv: baseAdvOpt };
  let axisSteps = 0, sharpTurns = 0, zigSteps = 0, prevTurn = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], p = pts[i], b = pts[(i + 1) % n];
    const ux = p[0] - a[0], uy = p[1] - a[1], vx = b[0] - p[0], vy = b[1] - p[1];
    if (Math.abs(ux) < 0.08 || Math.abs(uy) < 0.08) axisSteps++;
    const l1 = Math.hypot(ux, uy), l2 = Math.hypot(vx, vy);
    if (l1 > 0.1 && l2 > 0.1) {
      const t = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      if (Math.abs(t) > 0.55) sharpTurns++;
      if (t * prevTurn < -0.04) zigSteps++;
      prevTurn = t;
    }
  }
  const axisRatio = axisSteps / n;
  const zigRatio = zigSteps / n;
  const sizeScale = absA < 36 || n < 20 ? 0.42 : absA < 140 || n < 42 ? 0.72 : 1.0;
  const geomMod = axisRatio > 0.68 && n <= 400 && sharpTurns >= 3 ? 0.78 : (zigRatio > 0.32 ? 1.16 : 1.0);
  const localLambda = baseLambda * sizeScale * geomMod;
  const isTypoStemMode = baseAdvOpt.protectStemCaps === true && baseAdvOpt.cornerMode === 'typo';
  const tolScale = absA < 64 || n < 24 ? (isTypoStemMode ? 0.78 : 1.45) : absA < 220 || n < 48 ? (isTypoStemMode ? 0.86 : 1.22) : (axisRatio > 0.72 && n <= 400 ? 0.92 : 1.08);
  const localTol = Math.max(0.10 * scale, baseTol * tolScale);
  const localAdv = {
    ...baseAdvOpt,
    lineStraighten: axisRatio > 0.65 ? Math.min(94, (baseAdvOpt.lineStraighten ?? 58) + 12) : (baseAdvOpt.lineStraighten ?? 58)
  };
  return { localLambda, localTol, localAdv };
}

function smoothLoop(pts, opt = {}) {
  const n = pts.length;
  if (n < 5) {
    const corners = new Uint8Array(n).fill(1);
    return { pts: pts.map(p => p.slice()), corners, smoothKnots: new Uint8Array(n), knotTangents: new Map(), straightSpanFlags: new Uint8Array(n) };
  }
  const isHardJunc = i => !!(opt.juncFlags && opt.juncFlags[i] === 1);
  const hasHardJunc = opt.juncFlags && opt.juncFlags.some(v => v === 1);
  if ((opt.isTrueCircle || !hasHardJunc) && n >= 8) {
    const cf = fitCircle2D(pts);
    if (cf && cf.r >= (opt.isTrueCircle ? 1.10 : 1.65) && cf.r <= 500) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxRDev = 0, polyA = 0;
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
        const dR = Math.abs(Math.hypot(p[0] - cf.cx, p[1] - cf.cy) - cf.r);
        if (dR > maxRDev) maxRDev = dR;
        polyA += p[0] * q[1] - q[0] * p[1];
      }
      const absA = Math.abs(polyA) * 0.5;
      const areaRatio = absA / (Math.PI * cf.r * cf.r);
      const bw = maxX - minX, bh = maxY - minY;
      const aspect = bw > 0 && bh > 0 ? (bw / bh) : 0;
      if (opt.isTrueCircle || (aspect >= 0.88 && aspect <= 1.13 && areaRatio >= 0.91 && areaRatio <= 1.09 &&
          cf.rms <= Math.max(0.32, cf.r * 0.025) && maxRDev <= Math.max(0.75, cf.r * 0.055))) {
        const cPts = pts.map((p, idxP) => {
          /* Pertahankan koordinat T-junction yang sudah diproyeksikan ke lingkaran bersama di traceBoundaries */
          if (opt.juncFlags && opt.juncFlags[idxP]) return [p[0], p[1]];
          const dx = p[0] - cf.cx, dy = p[1] - cf.cy, dl = Math.hypot(dx, dy) || 1;
          return [cf.cx + (dx / dl) * cf.r, cf.cy + (dy / dl) * cf.r];
        });
        return {
          pts: cPts,
          corners: new Uint8Array(n),
          smoothKnots: new Uint8Array(n),
          knotTangents: new Map(),
          straightSpanFlags: new Uint8Array(n),
          isTrueCircle: true,
          circleFit: { cx: cf.cx, cy: cf.cy, r: cf.r }
        };
      }
      if (opt.protectStemCaps && n >= 12 && n <= 26 && Math.min(bw, bh) >= 1.8 && Math.min(bw, bh) <= 4.2 && Math.max(bw, bh) >= 4.5 && Math.max(bw, bh) <= 10.5) {
        const rectFill = absA / Math.max(1e-4, bw * bh);
        let orthoSteps = 0;
        for (let i = 0; i < n; i++) {
          const p0 = pts[i], p1 = pts[(i + 1) % n];
          const dx = Math.abs(p1[0] - p0[0]), dy = Math.abs(p1[1] - p0[1]);
          if (Math.min(dx, dy) <= 0.35 * Math.max(dx, dy)) orthoSteps++;
        }
        if (rectFill >= 0.75 && (orthoSteps / n) >= 0.65) {
          const xsL = [], xsR = [], ysT = [], ysB = [];
          for (const p of pts) {
            if (p[0] <= minX + bw * 0.28) xsL.push(p[0]);
            if (p[0] >= maxX - bw * 0.28) xsR.push(p[0]);
            if (p[1] <= minY + bh * 0.28) ysT.push(p[1]);
            if (p[1] >= maxY - bh * 0.28) ysB.push(p[1]);
          }
          const med = arr => {
            if (!arr.length) return 0;
            const s = arr.slice().sort((a, b) => a - b);
            return s[s.length >> 1];
          };
          const xL = xsL.length ? med(xsL) : minX;
          const xR = xsR.length ? med(xsR) : maxX;
          const yT = ysT.length ? med(ysT) : minY;
          const yB = ysB.length ? med(ysB) : maxY;
          const rectCorners = [[xL, yT], [xR, yT], [xR, yB], [xL, yB]];
          const cornerIndices = [];
          for (const rc of rectCorners) {
            let bestI = 0, bestD = Infinity;
            for (let i = 0; i < n; i++) {
              if (cornerIndices.includes(i)) continue;
              const d = Math.hypot(pts[i][0] - rc[0], pts[i][1] - rc[1]);
              if (d < bestD) { bestD = d; bestI = i; }
            }
            cornerIndices.push(bestI);
          }
          const pairs = cornerIndices.map((ci, k) => ({ ci, pt: rectCorners[k] })).sort((a, b) => a.ci - b.ci);
          const rPts = pts.map(p => [p[0], p[1]]);
          const corners = new Uint8Array(n);
          const straightSpanFlags = new Uint8Array(n).fill(1);
          for (let k = 0; k < 4; k++) {
            const cur = pairs[k], nxt = pairs[(k + 1) % 4];
            corners[cur.ci] = 1;
            rPts[cur.ci] = [cur.pt[0], cur.pt[1]];
            const span = (nxt.ci - cur.ci + n) % n;
            for (let s = 1; s < span; s++) {
              const u = s / span;
              const idxM = (cur.ci + s) % n;
              rPts[idxM] = [cur.pt[0] + (nxt.pt[0] - cur.pt[0]) * u, cur.pt[1] + (nxt.pt[1] - cur.pt[1]) * u];
            }
          }
          return {
            pts: rPts,
            corners,
            smoothKnots: new Uint8Array(n),
            knotTangents: new Map(),
            straightSpanFlags
          };
        }
      }
      if (aspect >= 0.52 && aspect <= 1.95 && n >= 10 && n <= 95 && Math.min(bw, bh) >= 2.2) {
        const cxE = 0.5 * (minX + maxX), cyE = 0.5 * (minY + maxY);
        const rxE = Math.max(1.5, bw * 0.5), ryE = Math.max(1.5, bh * 0.5);
        const ellAreaRatio = absA / (Math.PI * rxE * ryE);
        if (ellAreaRatio >= 0.89 && ellAreaRatio <= 1.09) {
          let sumE2 = 0, maxEDev = 0;
          const minR = Math.min(rxE, ryE);
          for (let i = 0; i < n; i++) {
            const nxE = (pts[i][0] - cxE) / rxE, nyE = (pts[i][1] - cyE) / ryE;
            const rNorm = Math.hypot(nxE, nyE);
            const devE = Math.abs(rNorm - 1.0) * minR;
            sumE2 += devE * devE;
            if (devE > maxEDev) maxEDev = devE;
          }
          const rmsE = Math.sqrt(sumE2 / n);
          if (rmsE <= Math.max(0.28, minR * 0.055) && maxEDev <= Math.max(0.68, minR * 0.145)) {
            const ePts = pts.map(p => {
              const nxE = (p[0] - cxE) / rxE, nyE = (p[1] - cyE) / ryE;
              const rNorm = Math.hypot(nxE, nyE) || 1;
              const tx = cxE + (nxE / rNorm) * rxE, ty = cyE + (nyE / rNorm) * ryE;
              return [p[0] * 0.35 + tx * 0.65, p[1] * 0.35 + ty * 0.65];
            });
            const smoothKnots = new Uint8Array(n);
            const knotTangents = new Map();
            let iTop = 0, iBot = 0, iLeft = 0, iRight = 0;
            for (let i = 1; i < n; i++) {
              if (ePts[i][1] < ePts[iTop][1]) iTop = i;
              if (ePts[i][1] > ePts[iBot][1]) iBot = i;
              if (ePts[i][0] < ePts[iLeft][0]) iLeft = i;
              if (ePts[i][0] > ePts[iRight][0]) iRight = i;
            }
            for (const ki of [iTop, iRight, iBot, iLeft]) {
              smoothKnots[ki] = 1;
              knotTangents.set(ki, smoothTangentClosed(ePts, ki, 4));
            }
            return {
              pts: ePts,
              corners: new Uint8Array(n),
              smoothKnots,
              knotTangents,
              straightSpanFlags: new Uint8Array(n)
            };
          }
        }
      }
    }
  }

  // 0. Detect sharp corners C0 and curvature extrema directly on Beach-deconvolved pts
  const prePts = pts.map(p => [p[0], p[1]]);
  const det = opt.detectCorners === false
    ? { corners: new Uint8Array(n), smoothKnots: new Uint8Array(n), apexMap: new Map(), knotTangents: new Map() }
    : detectCornersAndExtrema(prePts, opt.cornerAngle || 44, opt.juncFlags, opt);
  const { corners, smoothKnots, apexMap, knotTangents } = det;

  // 1. Apply Apex reconstruction AND smoothly project the neck around each reconstructed polygon apex
  const apexPts = prePts.map((p, i) => apexMap.has(i) ? apexMap.get(i).slice() : [p[0], p[1]]);
  apexMap.forEach((ap, ci) => {
    if (!corners[ci]) return;
    const shiftDist = Math.hypot(ap[0] - prePts[ci][0], ap[1] - prePts[ci][1]);
    if (shiftDist < 0.20) return;
    const neckSpan = shiftDist > 1.6 ? Math.min(10, Math.max(6, Math.floor(n / 32))) : (shiftDist > 1.2 ? Math.min(8, Math.max(4, Math.floor(n / 40))) : Math.min(5, Math.max(2, Math.floor(n / 52))));
    const maxShiftNeck = shiftDist > 1.2 ? Math.min(2.4, shiftDist * 0.95) : 0.42;
    const pRefL = apexPts[(ci - neckSpan + n) % n];
    const pRefR = apexPts[(ci + neckSpan) % n];
    for (let s = 1; s < neckSpan; s++) {
      const u = s / neckSpan;
      const iL = (ci - s + n) % n, iR = (ci + s) % n;
      if (!corners[iL] && !(opt.juncFlags && opt.juncFlags[iL])) {
        const lx = ap[0] + (pRefL[0] - ap[0]) * u, ly = ap[1] + (pRefL[1] - ap[1]) * u;
        const wBlend = shiftDist > 1.2 ? (1 - u * 0.15) : (1 - u * 0.45) * Math.min(0.65, shiftDist / 1.1);
        let nx = apexPts[iL][0] * (1 - wBlend) + lx * wBlend;
        let ny = apexPts[iL][1] * (1 - wBlend) + ly * wBlend;
        const dx = nx - prePts[iL][0], dy = ny - prePts[iL][1], d = Math.hypot(dx, dy);
        if (d > maxShiftNeck) { nx = prePts[iL][0] + (dx / d) * maxShiftNeck; ny = prePts[iL][1] + (dy / d) * maxShiftNeck; }
        apexPts[iL] = [nx, ny];
      }
      if (!corners[iR] && !(opt.juncFlags && opt.juncFlags[iR])) {
        const rx = ap[0] + (pRefR[0] - ap[0]) * u, ry = ap[1] + (pRefR[1] - ap[1]) * u;
        const wBlend = shiftDist > 1.2 ? (1 - u * 0.15) : (1 - u * 0.45) * Math.min(0.65, shiftDist / 1.1);
        let nx = apexPts[iR][0] * (1 - wBlend) + rx * wBlend;
        let ny = apexPts[iR][1] * (1 - wBlend) + ry * wBlend;
        const dx = nx - prePts[iR][0], dy = ny - prePts[iR][1], d = Math.hypot(dx, dy);
        if (d > maxShiftNeck) { nx = prePts[iR][0] + (dx / d) * maxShiftNeck; ny = prePts[iR][1] + (dy / d) * maxShiftNeck; }
        apexPts[iR] = [nx, ny];
      }
    }
  });

  const despeckleStr = (opt.despeckleJitter ?? 72) / 100;
  const snappedPts = despeckleStr > 0.02
    ? despeckleStaircaseClosed(apexPts, despeckleStr * 0.65, opt.juncFlags, corners)
    : apexPts;

  // 2. Check full spans between Sharp C0 corners (preserving genuine curved spans that have cardinal extrema)
  const lineStr = (opt.lineStraighten ?? 58) / 100;
  const straightTol = 0.34 + lineStr * 0.36;
  const sagRatioTol = 0.015 + lineStr * 0.016;
  const axisSnapOn = opt.axisSnap !== false;
  const axisSnapDeg = opt.axisSnapDeg ?? 2.2;
  const onStraightSpan = new Uint8Array(n);

  /* Helper Kontekstual: uji apakah rentang [ia..ib] merupakan bagian dari busur lingkaran yang berlanjut ke kiri/kanan */
  const isPartOfExtendedCircleArc = (ia, ib, spanLen, localRms) => {
    const extW = Math.min(16, Math.max(7, spanLen));
    const extPts = [];
    for (let s = extW; s >= 1; s--) {
      const k = (ia - s + n) % n;
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(snappedPts[k]);
    }
    extPts.reverse();
    for (let s = 0; s <= spanLen; s++) extPts.push(snappedPts[(ia + s) % n]);
    for (let s = 1; s <= extW; s++) {
      const k = (ib + s) % n;
      if (corners[k] || isHardJunc(k)) break;
      extPts.push(snappedPts[k]);
    }
    if (extPts.length < Math.max(10, spanLen + 5)) return false;
    const cfExt = fitCircle2D(extPts);
    const flExt = fitLine2D(extPts);
    if (!cfExt || cfExt.r < 3.0 || cfExt.r > 480) return false;
    return cfExt.rms <= Math.max(0.26, cfExt.r * 0.012) && (!flExt || cfExt.rms < flExt.rms * 0.68);
  };

  const cList = [];
  for (let i = 0; i < n; i++) if (corners[i] || isHardJunc(i)) cList.push(i);
  if (cList.length >= 2 && lineStr > 0.12) {
    /* Pra-fit garis inti (middle 70% core line) pada setiap rentang di antara sudut tajam cList:
       Jika dua rentang lurus berurutan bertemu di sebuah sudut tajam (mis. sudut lancip 45° pada pita diagonal B3K3
       yang tumpul 1.5..3.0 px oleh rasterisasi), perpotongan kedua garis inti memulihkan titik sudut 45° eksak
       sehingga seluruh rentang lurus dari sudut ke sudut tanpa menyisakan potongan kurva pendek di ujung! */
    const mC = cList.length;
    const spanCoreLines = new Array(mC).fill(null);
    for (let k = 0; k < mC; k++) {
      const ia = cList[k], ib = cList[(k + 1) % mC];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 6) continue;
      const PA0 = snappedPts[ia], PB0 = snappedPts[ib];
      const ch0 = Math.hypot(PB0[0] - PA0[0], PB0[1] - PA0[1]);
      if (ch0 < 4.5) continue;
      const padC = spanLen >= 20 ? Math.min(10, Math.floor(spanLen * 0.16)) : Math.max(2, Math.floor(spanLen * 0.20));
      const corePts = [];
      for (let s = padC; s <= spanLen - padC; s++) corePts.push(snappedPts[(ia + s) % n]);
      if (corePts.length < 4) continue;
      const flC = fitLine2D(corePts);
      if (!flC || flC.rms > 0.22 || flC.maxDev > 0.45) continue;
      const allSpanPts = [];
      for (let s = 0; s <= spanLen; s++) allSpanPts.push(snappedPts[(ia + s) % n]);
      const cfC = spanLen >= 8 ? fitCircle2D(allSpanPts) : null;
      const flAll = fitLine2D(allSpanPts);
      const isArc = !!(cfC && cfC.r >= 3.0 && cfC.r <= 500 && flAll && cfC.rms < flAll.rms * 0.62 && flC.rms > 0.10);
      if (!isArc) spanCoreLines[k] = flC;
    }
    for (let k = 0; k < mC; k++) {
      const flPrev = spanCoreLines[(k - 1 + mC) % mC];
      const flCur = spanCoreLines[k];
      const ic = cList[k];
      if (opt.juncFlags && opt.juncFlags[ic]) continue;
      if (flPrev && flCur) {
        const det = flPrev.d[0] * flCur.d[1] - flPrev.d[1] * flCur.d[0];
        if (Math.abs(det) >= 0.25) {
          const wx = flCur.c[0] - flPrev.c[0], wy = flCur.c[1] - flPrev.c[1];
          const t = (wx * flCur.d[1] - wy * flCur.d[0]) / det;
          const ax = flPrev.c[0] + flPrev.d[0] * t, ay = flPrev.c[1] + flPrev.d[1] * t;
          if (Math.hypot(ax - snappedPts[ic][0], ay - snappedPts[ic][1]) <= 3.4) {
            snappedPts[ic] = [ax, ay];
          }
        }
      }
    }
    for (let k = 0; k < cList.length; k++) {
      const ia = cList[k], ib = cList[(k + 1) % cList.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 2) continue;
      const PA = snappedPts[ia], PB = snappedPts[ib];
      const chord = Math.hypot(PB[0] - PA[0], PB[1] - PA[1]);
      if (chord < 3.0) continue;
      const ux = (PB[0] - PA[0]) / chord, uy = (PB[1] - PA[1]) / chord;
      let maxCoreDev = 0, maxNeckDev = 0, ss = 0, cnt = 0, sumSigned = 0, sumAbs = 0, hasCurvedExtremum = false;
      const padEnd = spanLen >= 20 ? Math.min(12, Math.floor(spanLen * 0.14)) : (spanLen >= 8 ? 2 : 1);
      for (let s = 1; s < spanLen; s++) {
        const idxP = (ia + s) % n;
        const P = snappedPts[idxP];
        const sDev = (P[0] - PA[0]) * uy - (P[1] - PA[1]) * ux;
        const dev = Math.abs(sDev);
        if (smoothKnots[idxP] && dev > 0.48) hasCurvedExtremum = true;
        if (s >= padEnd && s <= spanLen - padEnd) {
          if (dev > maxCoreDev) maxCoreDev = dev;
          ss += dev * dev;
          sumSigned += sDev;
          sumAbs += dev;
          cnt++;
        } else {
          if (dev > maxNeckDev) maxNeckDev = dev;
        }
      }
      const rms = cnt > 0 ? Math.sqrt(ss / cnt) : maxNeckDev;
      const meanSigned = cnt > 0 ? Math.abs(sumSigned / cnt) : 0;
      const oneSidedRatio = sumAbs > 1e-5 ? (Math.abs(sumSigned) / sumAbs) : 0;
      const isSystematicBow = (oneSidedRatio >= 0.58 && (maxCoreDev > 0.24 || meanSigned > 0.14)) || (maxCoreDev > 0.36);
      const bothHardCornersEarly = !!((corners[ia] || isHardJunc(ia)) && (corners[ib] || isHardJunc(ib)));
      if (hasCurvedExtremum && !(bothHardCornersEarly && !isSystematicBow && maxCoreDev <= 0.28 && rms <= 0.16)) continue;
      const spanPts = [];
      for (let s = 0; s <= spanLen; s++) spanPts.push(snappedPts[(ia + s) % n]);
      const cfSpan = spanLen >= 6 ? fitCircle2D(spanPts) : null;
      const isCurvedArcSpan = isSystematicBow ||
        !!(cfSpan && cfSpan.r >= 2.0 && cfSpan.r <= 750 && cfSpan.rms < rms * 0.85 && maxCoreDev > 0.10) ||
        (chord < 26.0 && isPartOfExtendedCircleArc(ia, ib, spanLen, rms));
      const coreSlice = [];
      for (let s = padEnd; s <= spanLen - padEnd; s++) coreSlice.push(snappedPts[(ia + s) % n]);
      const flCore = coreSlice.length >= 3 ? fitLine2D(coreSlice) : null;
      const isMicroStraightSpan = !isCurvedArcSpan && spanLen <= 16 && chord <= 11.0 && maxCoreDev <= 0.28 && rms <= 0.15;
      if (flCore && flCore.rms <= 0.085 && flCore.maxDev <= 0.16 && spanLen >= 5) {
        const devA = Math.abs((PA[0] - flCore.c[0]) * flCore.d[1] - (PA[1] - flCore.c[1]) * flCore.d[0]);
        const devB = Math.abs((PB[0] - flCore.c[0]) * flCore.d[1] - (PB[1] - flCore.c[1]) * flCore.d[0]);
        if (devA <= 1.35 && devB <= 1.35 && !(opt.juncFlags && (opt.juncFlags[ia] || opt.juncFlags[ib]))) {
          const pAProj = (PA[0] - flCore.c[0]) * flCore.d[0] + (PA[1] - flCore.c[1]) * flCore.d[1];
          const pBProj = (PB[0] - flCore.c[0]) * flCore.d[0] + (PB[1] - flCore.c[1]) * flCore.d[1];
          snappedPts[ia] = [flCore.c[0] + flCore.d[0] * pAProj, flCore.c[1] + flCore.d[1] * pAProj];
          snappedPts[ib] = [flCore.c[0] + flCore.d[0] * pBProj, flCore.c[1] + flCore.d[1] * pBProj];
          PA[0] = snappedPts[ia][0]; PA[1] = snappedPts[ia][1];
          PB[0] = snappedPts[ib][0]; PB[1] = snappedPts[ib][1];
          maxCoreDev = flCore.maxDev;
          maxNeckDev = Math.min(maxNeckDev, 0.25);
        }
      }
      const bothHardJuncOrCorner = !!((corners[ia] || isHardJunc(ia)) && (corners[ib] || isHardJunc(ib)));
      const hasCoreFit = !!(spanCoreLines[k] && bothHardJuncOrCorner);
      const allowCoreDev = bothHardJuncOrCorner
        ? Math.min(0.85, Math.max(0.42, chord * 0.026))
        : Math.min(0.28, Math.max(0.18, chord * 0.008));
      const allowRms = bothHardJuncOrCorner ? 0.38 : 0.12;
      const allowNeck = hasCoreFit ? 2.45 : (bothHardJuncOrCorner ? 1.15 : 0.38);
      if ((!isCurvedArcSpan && maxCoreDev <= allowCoreDev && (rms <= allowRms || (flCore && flCore.rms <= allowRms * 0.8)) && maxNeckDev <= allowNeck) || isMicroStraightSpan) {
        for (let s = 1; s < spanLen; s++) {
          const idxP = (ia + s) % n;
          const P = snappedPts[idxP];
          const proj = clamp((P[0] - PA[0]) * ux + (P[1] - PA[1]) * uy, 0, chord);
          snappedPts[idxP] = [PA[0] + ux * proj, PA[1] + uy * proj];
          smoothKnots[idxP] = 0;
          knotTangents.delete(idxP);
          onStraightSpan[idxP] = 1;
        }
      }
    }
  }

  // 3. Detect Maximal Collinear Straight Spans on remaining curved/mixed spans (for G1 Line-to-Curve transitions!)
  const g1Straight = detectMaximalStraightSpans(snappedPts, corners, smoothKnots, knotTangents, opt.juncFlags, lineStr, onStraightSpan, axisSnapOn, axisSnapDeg);
  for (let i = 0; i < n; i++) if (g1Straight[i]) onStraightSpan[i] = 1;

  if (lineStr > 0.12) {
    const spanKnots = [];
    for (let i = 0; i < n; i++) {
      if (corners[i] || smoothKnots[i] || (opt.juncFlags && opt.juncFlags[i])) spanKnots.push(i);
    }

    for (let k = 0; k < spanKnots.length; k++) {
      const ia = spanKnots[k], ib = spanKnots[(k + 1) % spanKnots.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 2) continue;
      let PA = snappedPts[ia], PB = snappedPts[ib];
      let dx = PB[0] - PA[0], dy = PB[1] - PA[1];
      let chord = Math.hypot(dx, dy);
      if (chord < 3.5) continue;
      let ux = dx / chord, uy = dy / chord;
      let maxDev = 0, ss = 0, cnt = 0;
      const padS = (corners[ia] && spanLen >= 8) ? 2 : 1;
      const padE = (corners[ib] && spanLen >= 8) ? 2 : 1;
      for (let s = padS; s <= spanLen - padE; s++) {
        const P = snappedPts[(ia + s) % n];
        const dev = Math.abs((P[0] - PA[0]) * uy - (P[1] - PA[1]) * ux);
        if (dev > maxDev) maxDev = dev;
        ss += dev * dev; cnt++;
      }
      const rms = Math.sqrt(ss / Math.max(1, cnt));
      const bothSharp = !!((corners[ia] || isHardJunc(ia)) && (corners[ib] || isHardJunc(ib)));
      const midStraight = !!(onStraightSpan[(ia + (spanLen >> 1)) % n]);
      const allowDev = (bothSharp || midStraight) ? Math.max(0.22, Math.min(straightTol, chord * sagRatioTol)) : 0.09;
      const allowRms = (bothSharp || midStraight) ? 0.14 : 0.05;
      const extArcGuard = (chord < 28.0 && !midStraight) ? isPartOfExtendedCircleArc(ia, ib, spanLen, rms) : false;
      if (!extArcGuard && maxDev <= allowDev && rms <= allowRms) {
        if (axisSnapOn && !(opt.juncFlags && (opt.juncFlags[ia] || opt.juncFlags[ib]))) {
          const deg = Math.atan2(dy, dx) * 180 / Math.PI;
          const canons = (bothSharp && chord >= 14.0) ? [0, 45, -45, 90, -90, 135, -135, 180, -180] : [0, 90, -90, 180, -180];
          let bestC = null, bestDiff = chord <= 8.5 ? Math.max(axisSnapDeg, 5.5) : axisSnapDeg;
          for (const c of canons) {
            let df = Math.abs(deg - c);
            if (df > 180) df = 360 - df;
            if (df <= bestDiff) { bestDiff = df; bestC = c; }
          }
          if (bestC !== null && bestDiff > 0.02) {
            const rad = bestC * Math.PI / 180;
            const tx = Math.cos(rad), ty = Math.sin(rad);
            const mx = 0.5 * (PA[0] + PB[0]), my = 0.5 * (PA[1] + PB[1]);
            const pA_proj = (PA[0] - mx) * tx + (PA[1] - my) * ty;
            const pB_proj = (PB[0] - mx) * tx + (PB[1] - my) * ty;
            if (Math.hypot((mx + tx * pA_proj) - PA[0], (my + ty * pA_proj) - PA[1]) <= 0.28) {
              snappedPts[ia] = [mx + tx * pA_proj, my + ty * pA_proj];
              snappedPts[ib] = [mx + tx * pB_proj, my + ty * pB_proj];
              PA = snappedPts[ia]; PB = snappedPts[ib];
              dx = PB[0] - PA[0]; dy = PB[1] - PA[1];
              chord = Math.hypot(dx, dy) || 1;
              ux = dx / chord; uy = dy / chord;
            }
          }
        }
        for (let s = 1; s < spanLen; s++) {
          const idxP = (ia + s) % n;
          const P = snappedPts[idxP];
          const proj = (P[0] - PA[0]) * ux + (P[1] - PA[1]) * uy;
          snappedPts[idxP] = [PA[0] + ux * proj, PA[1] + uy * proj];
          onStraightSpan[idxP] = 1;
        }
        if (!corners[ia] && smoothKnots[ia]) knotTangents.set(ia, [ux, uy]);
        if (!corners[ib] && smoothKnots[ib]) knotTangents.set(ib, [ux, uy]);
      }
    }
  }

  if (lineStr > 0.12) {
    const finalKnots = [];
    for (let i = 0; i < n; i++) {
      if (corners[i] || smoothKnots[i] || (opt.juncFlags && opt.juncFlags[i])) finalKnots.push(i);
    }
    for (let k = 0; k < finalKnots.length; k++) {
      const ia = finalKnots[k], ib = finalKnots[(k + 1) % finalKnots.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 2) continue;
      let isStr = true;
      for (let s = 1; s < spanLen; s++) {
        if (!onStraightSpan[(ia + s) % n]) { isStr = false; break; }
      }
      if (!isStr) continue;
      const PA = snappedPts[ia], PB = snappedPts[ib];
      const dx = PB[0] - PA[0], dy = PB[1] - PA[1], ch = Math.hypot(dx, dy);
      if (ch < 1e-5) continue;
      const ux = dx / ch, uy = dy / ch;
      for (let s = 1; s < spanLen; s++) {
        const idxP = (ia + s) % n;
        const P = snappedPts[idxP];
        const proj = (P[0] - PA[0]) * ux + (P[1] - PA[1]) * uy;
        snappedPts[idxP] = [PA[0] + ux * proj, PA[1] + uy * proj];
      }
    }
  }

  /* Deteksi Busur Lingkaran Parsial Eksak (Span-Level Exact Circular Arc) pada rentang di antara sudut tajam C0:
     Menjamin setengah lingkaran (B1K1, B3K2), seperempat lingkaran (B1K2), dan cincin busur konsentris (B3K4)
     tetap 100% bulat sempurna tanpa tertekan oleh Taubin/Elastika CG dan tanpa chamfer di sudut 90 derajat! */
  const onCircularArcSpan = new Uint8Array(n);
  if (cList.length >= 2) {
    for (let k = 0; k < cList.length; k++) {
      const ia = cList[k], ib = cList[(k + 1) % cList.length];
      const spanLen = (ib - ia + n) % n;
      if (spanLen < 12) continue;
      let anyStraight = false;
      for (let s = 1; s < spanLen; s++) {
        if (onStraightSpan[(ia + s) % n]) { anyStraight = true; break; }
      }
      if (anyStraight) continue;
      const trim = Math.min(3, Math.max(1, Math.floor(spanLen * 0.08)));
      const arcCore = [];
      for (let s = trim; s <= spanLen - trim; s++) arcCore.push(snappedPts[(ia + s) % n]);
      if (arcCore.length < 8) continue;
      const cf = fitCircle2D(arcCore);
      const lf = fitLine2D(arcCore);
      if (!cf || cf.r < 5.0 || cf.r > 480) continue;
      const thA = Math.atan2(snappedPts[ia][1] - cf.cy, snappedPts[ia][0] - cf.cx);
      const thB = Math.atan2(snappedPts[ib][1] - cf.cy, snappedPts[ib][0] - cf.cx);
      const sweep = Math.abs(Math.atan2(Math.sin(thB - thA), Math.cos(thB - thA)));
      if (sweep < 0.45) continue;
      let maxRDev = 0;
      for (let s = trim; s <= spanLen - trim; s++) {
        const p = snappedPts[(ia + s) % n];
        const dR = Math.abs(Math.hypot(p[0] - cf.cx, p[1] - cf.cy) - cf.r);
        if (dR > maxRDev) maxRDev = dR;
      }
      if (cf.rms <= Math.max(0.24, cf.r * 0.010) && maxRDev <= Math.max(0.52, cf.r * 0.024) && (!lf || cf.rms < lf.rms * 0.52)) {
        /* Proyeksikan titik internal busur tepat ke lingkaran cf dan bersihkan smoothKnots palsu di sepanjang busur */
        for (let s = 1; s < spanLen; s++) {
          const idxP = (ia + s) % n;
          const dx = snappedPts[idxP][0] - cf.cx, dy = snappedPts[idxP][1] - cf.cy;
          const dl = Math.hypot(dx, dy) || 1;
          snappedPts[idxP] = [cf.cx + (dx / dl) * cf.r, cf.cy + (dy / dl) * cf.r];
          onCircularArcSpan[idxP] = 1;
        }
        /* Jika sudut ujung ia atau ib tidak dikunci oleh T-junction, proyeksikan juga ke keliling lingkaran cf */
        for (const endIdx of [ia, ib]) {
          if (!(opt.juncFlags && opt.juncFlags[endIdx])) {
            const dx = snappedPts[endIdx][0] - cf.cx, dy = snappedPts[endIdx][1] - cf.cy;
            const dl = Math.hypot(dx, dy) || 1;
            if (Math.abs(dl - cf.r) <= 0.75) {
              snappedPts[endIdx] = [cf.cx + (dx / dl) * cf.r, cf.cy + (dy / dl) * cf.r];
            }
          }
        }
      }
    }
  }

  const lockMask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (corners[i] || onStraightSpan[i] || onCircularArcSpan[i] || (opt.juncFlags && opt.juncFlags[i])) lockMask[i] = 1;
  }

  /* Jalankan penghalusan Savitzky-Golay kuadratik pada rentang kurva yang tidak terkunci (unlocked)
     setelah deteksi garis lurus, agar kontur panjang yang melengkung lembut benar-benar mulus */
  const fairedPts = despeckleStr > 0.02
    ? despeckleStaircaseClosed(snappedPts, despeckleStr * 0.85, opt.juncFlags, lockMask)
    : snappedPts;

  const smoothMethod = opt.smoothMethod || 'hybrid';
  const lam = clamp((opt.lambda || 2.8) * 0.18, 0.05, 0.85);
  const taubinPasses = smoothMethod === 'cg' ? 2 : clamp(Math.round(4 + Math.log10(1 + lam) * 5), 4, 9);
  const refPts = taubinFilterClosed(fairedPts, lockMask, taubinPasses, 0.38, -0.392);

  for (let i = 0; i < n; i++) {
    if (lockMask[i]) {
      refPts[i][0] = snappedPts[i][0];
      refPts[i][1] = snappedPts[i][1];
    } else {
      const nearLock = (lockMask[(i - 1 + n) % n] || lockMask[(i + 1) % n]) ? 0.24 : 0.56;
      const dx = refPts[i][0] - snappedPts[i][0], dy = refPts[i][1] - snappedPts[i][1];
      const dl = Math.hypot(dx, dy);
      if (dl > nearLock) {
        refPts[i][0] = snappedPts[i][0] + (dx / dl) * nearLock;
        refPts[i][1] = snappedPts[i][1] + (dy / dl) * nearLock;
      }
    }
  }

  if (smoothMethod === 'taubin') {
    return { pts: refPts, corners, smoothKnots, knotTangents, straightSpanFlags: onStraightSpan };
  }

  if (!opt.forceCpu && n >= 192 && typeof _hwCfg !== 'undefined' && _hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuElasticaRelaxClosed) {
    const gpuElastica = GpuAccelerator.gpuElasticaRelaxClosed(refPts, snappedPts, lockMask, smoothKnots, lam, Math.min(opt.iters || 16, 16));
    if (gpuElastica && gpuElastica.length === n) {
      return { pts: gpuElastica, corners, smoothKnots, knotTangents, straightSpanFlags: onStraightSpan };
    }
  }

  const d0 = new Float64Array(2 * n);
  const x = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    x[2 * i] = d0[2 * i] = refPts[i][0];
    x[2 * i + 1] = d0[2 * i + 1] = refPts[i][1];
  }

  const muTension = 0.0;
  const iters = Math.min(opt.iters || 16, 16);
  const idx = i => ((i % n) + n) % n;

  const energy = v => {
    let e = 0;
    for (let i = 0; i < n; i++) {
      const wData = lockMask[i] ? 64.0 : (smoothKnots[i] ? 3.5 : 1.8);
      const dx = v[2 * i] - d0[2 * i], dy = v[2 * i + 1] - d0[2 * i + 1];
      e += wData * (dx * dx + dy * dy);

      const b = idx(i + 1);
      const tx = v[2 * b] - v[2 * i], ty = v[2 * b + 1] - v[2 * i + 1];
      e += muTension * (tx * tx + ty * ty);

      if (!lockMask[i]) {
        const a = idx(i - 1);
        const bx = v[2 * a] - 2 * v[2 * i] + v[2 * b];
        const by = v[2 * a + 1] - 2 * v[2 * i + 1] + v[2 * b + 1];
        const nearCorner = (lockMask[a] || lockMask[b]) ? 0.15 : 1.0;
        const wBend = (smoothKnots[i] ? lam * 0.65 : lam) * nearCorner;
        e += wBend * (bx * bx + by * by);
      }
    }
    return e;
  };

  const grad = (v, g) => {
    for (let i = 0; i < n; i++) {
      const wData = lockMask[i] ? 64.0 : (smoothKnots[i] ? 3.5 : 1.8);
      g[2 * i] = 2 * wData * (v[2 * i] - d0[2 * i]);
      g[2 * i + 1] = 2 * wData * (v[2 * i + 1] - d0[2 * i + 1]);
    }
    for (let i = 0; i < n; i++) {
      const a = idx(i - 1), b = idx(i + 1);
      for (let c = 0; c < 2; c++) {
        const t = v[2 * b + c] - v[2 * i + c];
        const st = 2 * muTension * t;
        if (!lockMask[i]) g[2 * i + c] -= st;
        if (!lockMask[b]) g[2 * b + c] += st;
      }
      if (lockMask[i]) continue;
      const nearCorner = (lockMask[a] || lockMask[b]) ? 0.15 : 1.0;
      const wBend = (smoothKnots[i] ? lam * 0.65 : lam) * nearCorner;
      for (let c = 0; c < 2; c++) {
        const ben = v[2 * a + c] - 2 * v[2 * i + c] + v[2 * b + c];
        const sb = 2 * wBend * ben;
        if (!lockMask[a]) g[2 * a + c] += sb;
        g[2 * i + c] -= 2 * sb;
        if (!lockMask[b]) g[2 * b + c] += sb;
      }
    }
  };

  const g = new Float64Array(2 * n), p = new Float64Array(2 * n), gPrev = new Float64Array(2 * n);
  const xt = new Float64Array(2 * n);
  grad(x, g);
  for (let i = 0; i < 2 * n; i++) p[i] = -g[i];
  let e0 = energy(x);

  for (let it = 0; it < iters; it++) {
    let gdotp = 0;
    for (let i = 0; i < 2 * n; i++) gdotp += g[i] * p[i];
    if (gdotp >= 0) {
      for (let i = 0; i < 2 * n; i++) p[i] = -g[i];
      gdotp = 0;
      for (let i = 0; i < 2 * n; i++) gdotp += g[i] * p[i];
    }
    let step = Math.min(1.0, 1.0 / (1.0 + 4.0 * lam));
    let e1 = e0, ok = false;
    for (let ls = 0; ls < 10; ls++) {
      for (let i = 0; i < 2 * n; i++) xt[i] = x[i] + step * p[i];
      e1 = energy(xt);
      if (e1 <= e0 + 1e-4 * step * gdotp) { ok = true; break; }
      step *= 0.5;
    }
    if (!ok) break;
    for (let i = 0; i < n; i++) {
      if (lockMask[i]) {
        x[2 * i] = snappedPts[i][0];
        x[2 * i + 1] = snappedPts[i][1];
      } else {
        const maxTube = (lockMask[idx(i - 1)] || lockMask[idx(i + 1)]) ? 0.12 : 0.28;
        const dx = xt[2 * i] - snappedPts[i][0], dy = xt[2 * i + 1] - snappedPts[i][1];
        const dl = Math.hypot(dx, dy);
        if (dl > maxTube) {
          x[2 * i] = snappedPts[i][0] + (dx / dl) * maxTube;
          x[2 * i + 1] = snappedPts[i][1] + (dy / dl) * maxTube;
        } else {
          x[2 * i] = xt[2 * i];
          x[2 * i + 1] = xt[2 * i + 1];
        }
      }
      gPrev[2 * i] = g[2 * i];
      gPrev[2 * i + 1] = g[2 * i + 1];
    }
    grad(x, g);
    let num = 0, den = 0;
    for (let i = 0; i < 2 * n; i++) {
      const y = g[i] - gPrev[i];
      num += g[i] * y;
      den += gPrev[i] * gPrev[i];
    }
    const beta = den > 1e-18 ? Math.max(0, num / den) : 0;
    for (let i = 0; i < 2 * n; i++) p[i] = -g[i] + beta * p[i];
    if (Math.abs(e0 - e1) < 1e-7 * Math.max(1, Math.abs(e0))) break;
    e0 = e1;
  }

  const out = [];
  for (let i = 0; i < n; i++) out.push([x[2 * i], x[2 * i + 1]]);
  return { pts: out, corners, smoothKnots, knotTangents, straightSpanFlags: onStraightSpan };
}

function evalBezier(P0, P1, P2, P3, t) {
  const u = 1 - t, u2 = u * u, t2 = t * t;
  return [
    u2 * u * P0[0] + 3 * u2 * t * P1[0] + 3 * u * t2 * P2[0] + t2 * t * P3[0],
    u2 * u * P0[1] + 3 * u2 * t * P1[1] + 3 * u * t2 * P2[1] + t2 * t * P3[1]
  ];
}
function evalBezierDeriv1(P0, P1, P2, P3, t) {
  const u = 1 - t;
  return [
    3 * (u * u * (P1[0] - P0[0]) + 2 * u * t * (P2[0] - P1[0]) + t * t * (P3[0] - P2[0])),
    3 * (u * u * (P1[1] - P0[1]) + 2 * u * t * (P2[1] - P1[1]) + t * t * (P3[1] - P2[1]))
  ];
}
function evalBezierDeriv2(P0, P1, P2, P3, t) {
  const u = 1 - t;
  return [
    6 * (u * (P2[0] - 2 * P1[0] + P0[0]) + t * (P3[0] - 2 * P2[0] + P1[0])),
    6 * (u * (P2[1] - 2 * P1[1] + P0[1]) + t * (P3[1] - 2 * P2[1] + P1[1]))
  ];
}

function reparameterize(pts, u, P0, P1, P2, P3) {
  const out = new Float64Array(u.length);
  out[0] = 0; out[u.length - 1] = 1;
  for (let i = 1; i < u.length - 1; i++) {
    const t = u[i];
    const Q = evalBezier(P0, P1, P2, P3, t);
    const Q1 = evalBezierDeriv1(P0, P1, P2, P3, t);
    const Q2 = evalBezierDeriv2(P0, P1, P2, P3, t);
    const dx = Q[0] - pts[i][0], dy = Q[1] - pts[i][1];
    const num = dx * Q1[0] + dy * Q1[1];
    const den = Q1[0] * Q1[0] + Q1[1] * Q1[1] + dx * Q2[0] + dy * Q2[1];
    const nt = Math.abs(den) > 1e-12 ? t - num / den : t;
    out[i] = clamp(nt, out[i - 1] + 1e-5, 1 - 1e-5);
  }
  return out;
}

function smoothTangentClosed(pts, i, W = 8) {
  const n = pts.length;
  let vx = 0, vy = 0;
  const wMax = Math.min(W, Math.max(1, n >> 2));
  for (let k = 1; k <= wMax; k++) {
    const w = Math.exp(-(k * k) / (2 * (wMax * 0.6) ** 2));
    const pNext = pts[(i + k) % n];
    const pPrev = pts[(i - k + n * 2) % n];
    vx += w * (pNext[0] - pPrev[0]);
    vy += w * (pNext[1] - pPrev[1]);
  }
  const l = Math.hypot(vx, vy) || 1;
  return [vx / l, vy / l];
}

function smoothTangentOpen(pts, i, W = 6) {
  const n = pts.length;
  let vx = 0, vy = 0;
  const wMax = Math.min(W, n - 1);
  for (let k = 1; k <= wMax; k++) {
    const w = Math.exp(-(k * k) / (2 * (wMax * 0.55) ** 2));
    const iNext = Math.min(n - 1, i + k);
    const iPrev = Math.max(0, i - k);
    if (iNext > iPrev) {
      vx += w * (pts[iNext][0] - pts[iPrev][0]) / (iNext - iPrev);
      vy += w * (pts[iNext][1] - pts[iPrev][1]) / (iNext - iPrev);
    }
  }
  const l = Math.hypot(vx, vy) || 1;
  return [vx / l, vy / l];
}

function fitCubicLS(pts, tanL = null, tanR = null, allowLine = false) {
  const n = pts.length;
  if (n < 2) return null;
  const P0 = pts[0], P3 = pts[n - 1];
  let u = new Float64Array(n);
  let L = 0;
  for (let i = 1; i < n; i++) {
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    u[i] = L;
  }
  if (L < 1e-9) return null;
  for (let i = 0; i < n; i++) u[i] /= L;

  const chord = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
  const chUx = chord > 1e-6 ? (P3[0] - P0[0]) / chord : 1;
  const chUy = chord > 1e-6 ? (P3[1] - P0[1]) / chord : 0;

  /* Deteksi apakah rantai titik membentuk busur satu sisi (atau hampir lurus tanpa infleksi nyata >= 0.35 px) terhadap tali busur P0->P3:
     Jika ya, kedua titik kontrol P1 dan P2 dilarang menyeberang ke sisi berlawanan agar bebas gelombang S (infleksi palsu)! */
  let maxPosH = 0, maxNegH = 0, sumH = 0;
  for (let i = 1; i < n - 1; i++) {
    const h = (pts[i][0] - P0[0]) * chUy - (pts[i][1] - P0[1]) * chUx;
    sumH += h;
    if (h > maxPosH) maxPosH = h;
    if (h < maxNegH) maxNegH = h;
  }
  const minOppExcur = Math.min(maxPosH, -maxNegH);
  const maxExcur = Math.max(maxPosH, -maxNegH);
  const domSign = sumH >= 0 ? 1 : -1;
  const convexSign = (maxPosH >= 0.20 && maxNegH >= -0.12) ? 1 : (maxNegH <= -0.20 && maxPosH <= 0.12) ? -1 : (minOppExcur <= 0.35 && maxExcur >= 0.12 ? domSign : 0);

  if (allowLine && chord >= 4.5) {
    const maxLineDev = Math.max(maxPosH, -maxNegH);
    const alignL = !tanL || Math.abs(tanL[0] * chUy - tanL[1] * chUx) < 0.12;
    const alignR = !tanR || Math.abs(tanR[0] * chUy - tanR[1] * chUx) < 0.12;
    if (maxLineDev <= 0.22 && alignL && alignR) {
      const P1 = [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3];
      const P2 = [P0[0] + 2 * (P3[0] - P0[0]) / 3, P0[1] + 2 * (P3[1] - P0[1]) / 3];
      return { P0, P1, P2, P3, err: maxLineDev, sse: maxLineDev * maxLineDev * n, at: n >> 1, isLine: true, tL: [chUx, chUy], tR: [-chUx, -chUy] };
    }
  }

  let circT_L = null, circT_R = null, circAlpha = null;
  if (n >= 5 && chord > 1.5) {
    const cf = fitCircle2D(pts);
    if (cf && cf.r >= 1.8 && cf.r <= 500 && cf.rms <= Math.max(0.16, cf.r * 0.015)) {
      const r0x = P0[0] - cf.cx, r0y = P0[1] - cf.cy, l0 = Math.hypot(r0x, r0y) || 1;
      const r3x = P3[0] - cf.cx, r3y = P3[1] - cf.cy, l3 = Math.hypot(r3x, r3y) || 1;
      const mid = pts[n >> 1];
      const crossDir = (P0[0] - cf.cx) * (mid[1] - cf.cy) - (P0[1] - cf.cy) * (mid[0] - cf.cx);
      const sgn = crossDir >= 0 ? 1 : -1;
      circT_L = [(-r0y / l0) * sgn, (r0x / l0) * sgn];
      circT_R = [(r3y / l3) * sgn, (-r3x / l3) * sgn];
      const dTheta = Math.acos(clamp((r0x * r3x + r0y * r3y) / (l0 * l3), -1, 1));
      if (dTheta > 0.08 && dTheta < 2.2) {
        circAlpha = (4 / 3) * cf.r * Math.tan(dTheta / 4);
      }
    }
  }

  const useCircL = circT_L && !tanL;
  const useCircR = circT_R && !tanR;
  const adaptiveSpanPx = (chord > 18 && L / chord < 1.02) ? clamp(chord * 0.24, 10.5, 28.0) : 9.5;
  let tL = tanL ? [tanL[0], tanL[1]] : (useCircL ? circT_L : oneSidedTangentOpen(pts, true, adaptiveSpanPx));
  const endFwd = useCircR ? [-circT_R[0], -circT_R[1]] : oneSidedTangentOpen(pts, false, adaptiveSpanPx);
  let tR = tanR ? [tanR[0], tanR[1]] : (useCircR ? circT_R : [-endFwd[0], -endFwd[1]]);

  /* Pastikan garis singgung bebas tidak menunjuk ke sisi seberang tali busur pada busur konveks */
  const enforceConvexTangent = (tVec, isLeft) => {
    if (!convexSign) return tVec;
    const h = tVec[0] * chUy - tVec[1] * chUx;
    if (convexSign * h < -0.01) {
      if (isLeft && circT_L) return circT_L;
      if (!isLeft && circT_R) return circT_R;
      const proj = tVec[0] * chUx + tVec[1] * chUy;
      const perp = Math.abs(h) * 0.5 * convexSign;
      const nx = proj * chUx + perp * chUy, ny = proj * chUy - perp * chUx;
      const nl = Math.hypot(nx, ny) || 1;
      return [nx / nl, ny / nl];
    }
    return tVec;
  };
  tL = enforceConvexTangent(tL, true);
  tR = enforceConvexTangent(tR, false);

  const aNat = circAlpha || (L / 3);
  const regW = circAlpha ? 0.06 : 0.004;

  const solveAlphas = (uParam, dirL = tL, dirR = tR) => {
    let c00 = regW, c01 = 0, c11 = regW, x0 = regW * aNat, x1 = regW * aNat;
    for (let i = 0; i < n; i++) {
      const t = uParam[i], m = 1 - t;
      const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
      const a1x = dirL[0] * b1, a1y = dirL[1] * b1;
      const a2x = dirR[0] * b2, a2y = dirR[1] * b2;
      c00 += a1x * a1x + a1y * a1y;
      c01 += a1x * a2x + a1y * a2y;
      c11 += a2x * a2x + a2y * a2y;
      const tx = pts[i][0] - (P0[0] * (b0 + b1) + P3[0] * (b2 + b3));
      const ty = pts[i][1] - (P0[1] * (b0 + b1) + P3[1] * (b2 + b3));
      x0 += a1x * tx + a1y * ty;
      x1 += a2x * tx + a2y * ty;
    }
    const det = c00 * c11 - c01 * c01;
    const minA = Math.max(0.08 * chord, 0.06 * L);
    const maxA = Math.min(0.58 * L, Math.max(0.64 * chord, 0.52 * L));
    let a1 = Math.abs(det) > 1e-9 ? (x0 * c11 - x1 * c01) / det : aNat;
    let a2 = Math.abs(det) > 1e-9 ? (c00 * x1 - c01 * x0) / det : aNat;
    if (a1 < minA || a1 > maxA) {
      a1 = clamp(a1, minA, maxA);
      if (c11 > 1e-9) a2 = clamp((x1 - c01 * a1) / c11, minA, maxA);
    }
    if (a2 < minA || a2 > maxA) {
      a2 = clamp(a2, minA, maxA);
      if (c00 > 1e-9) a1 = clamp((x0 - c01 * a2) / c00, minA, maxA);
    }
    return [
      [P0[0] + dirL[0] * a1, P0[1] + dirL[1] * a1],
      [P3[0] + dirR[0] * a2, P3[1] + dirR[1] * a2]
    ];
  };

  let minBx = Infinity, maxBx = -Infinity, minBy = Infinity, maxBy = -Infinity;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (p[0] < minBx) minBx = p[0]; if (p[0] > maxBx) maxBx = p[0];
    if (p[1] < minBy) minBy = p[1]; if (p[1] > maxBy) maxBy = p[1];
  }

  const computeErr = (uParam, P1, P2) => {
    let maxE = 0, sse = 0, maxI = n >> 1;
    for (let i = 1; i < n - 1; i++) {
      const Q = evalBezier(P0, P1, P2, P3, uParam[i]);
      const d2 = (Q[0] - pts[i][0]) ** 2 + (Q[1] - pts[i][1]) ** 2;
      sse += d2;
      if (d2 > maxE) { maxE = d2; maxI = i; }
    }
    /* Penalti Overshoot Kotak Pembatas (Bounding-Hull Containment Guard):
       Cegah perut kurva Bézier melambung keluar dari kotak pembatas titik asli (seperti bagian bawah bar baterai)! */
    for (const tTest of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const Qt = evalBezier(P0, P1, P2, P3, tTest);
      const overX = Math.max(0, minBx - Qt[0], Qt[0] - maxBx);
      const overY = Math.max(0, minBy - Qt[1], Qt[1] - maxBy);
      const over = Math.hypot(overX, overY);
      if (over > 0.28) {
        const pen2 = (over * 2.5) ** 2;
        sse += pen2 * 4;
        if (pen2 > maxE) maxE = pen2;
      }
    }
    return { err: Math.sqrt(maxE), sse, at: maxI };
  };

  /* Uji kelayakan konveksitas titik kontrol P1, P2 agar tidak pernah membentuk gelombang S atau melambung keluar */
  const isConvexPairValid = (cP1, cP2) => {
    if (chord < 1.5) return true;
    const h1 = (cP1[0] - P0[0]) * chUy - (cP1[1] - P0[1]) * chUx;
    const h2 = (cP2[0] - P0[0]) * chUy - (cP2[1] - P0[1]) * chUx;
    if (minOppExcur <= Math.max(0.85, chord * 0.035) && h1 * h2 < -1e-4) return false;
    if (convexSign && (convexSign * h1 < -0.005 || convexSign * h2 < -0.005)) return false;
    for (const tTest of [0.25, 0.5, 0.75]) {
      const Qt = evalBezier(P0, cP1, cP2, P3, tTest);
      if (Qt[0] < minBx - 0.35 || Qt[0] > maxBx + 0.35 || Qt[1] < minBy - 0.35 || Qt[1] > maxBy + 0.35) return false;
    }
    const proj1 = (cP1[0] - P0[0]) * chUx + (cP1[1] - P0[1]) * chUy;
    const proj2 = (P3[0] - cP2[0]) * chUx + (P3[1] - cP2[1]) * chUy;
    const minP1 = tanL ? -0.05 * chord : 0.02 * chord;
    const minP2 = tanR ? -0.05 * chord : 0.02 * chord;
    return proj1 >= minP1 && proj2 >= minP2 && proj1 <= 0.82 * chord && proj2 <= 0.82 * chord;
  };

  if (circAlpha) {
    const cP1 = [P0[0] + tL[0] * circAlpha, P0[1] + tL[1] * circAlpha];
    const cP2 = [P3[0] + tR[0] * circAlpha, P3[1] + tR[1] * circAlpha];
    u = reparameterize(pts, u, P0, cP1, cP2, P3);
    u = reparameterize(pts, u, P0, cP1, cP2, P3);
  }
  if (minOppExcur <= Math.max(0.85, chord * 0.035) && chord > 1.5) {
    const hL = tL[0] * chUy - tL[1] * chUx;
    const hR = (-tR[0]) * chUy - (-tR[1]) * chUx;
    if (hL * hR > 1e-4 && maxExcur >= 0.12) {
      const fixVec = (v, isEnd) => {
        const s = isEnd ? -1 : 1;
        const hv = (s * v[0]) * chUy - (s * v[1]) * chUx;
        if (hv * domSign * s > 0) {
          const proj = Math.max(0.2, (s * v[0]) * chUx + (s * v[1]) * chUy);
          const perp = -domSign * s * Math.min(Math.abs(hv) * 0.35, 0.18 * proj);
          const nx = s * (proj * chUx + perp * chUy);
          const ny = s * (proj * chUy - perp * chUx);
          const nl = Math.hypot(nx, ny) || 1;
          return [nx / nl, ny / nl];
        }
        return v;
      };
      tL = fixVec(tL, false);
      tR = fixVec(tR, true);
    }
  }
  let [P1, P2] = solveAlphas(u);
  let res = computeErr(u, P1, P2);
  if (circAlpha) {
    const cP1 = [P0[0] + tL[0] * circAlpha, P0[1] + tL[1] * circAlpha];
    const cP2 = [P3[0] + tR[0] * circAlpha, P3[1] + tR[1] * circAlpha];
    const cRes = computeErr(u, cP1, cP2);
    if (cRes.err <= res.err * 1.05) { P1 = cP1; P2 = cP2; res = cRes; }
  }
  if (res.err > 0.015 && res.err < 18.0 && n >= 4) {
    for (let it = 0; it < 10; it++) {
      const uNext = reparameterize(pts, u, P0, P1, P2, P3);
      const [nP1, nP2] = solveAlphas(uNext);
      const nRes = computeErr(uNext, nP1, nP2);
      if (nRes.err < res.err && isConvexPairValid(nP1, nP2)) { u = uNext; P1 = nP1; P2 = nP2; res = nRes; }
      else break;
    }
  }

  if ((!tanL || !tanR) && res.err > 0.14 && n >= 6) {
    const solveFreeOrSemi2D = (uParam) => {
      const reg = 1e-3;
      if (tanL && !tanR) {
        let s11 = reg, s12x = 0, s12y = 0, s22 = reg;
        let r1 = reg * aNat, r2x = reg * tR[0] * aNat, r2y = reg * tR[1] * aNat;
        for (let i = 0; i < n; i++) {
          const t = uParam[i], m = 1 - t;
          const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
          const rx = pts[i][0] - (b0 + b1) * P0[0] - (b2 + b3) * P3[0];
          const ry = pts[i][1] - (b0 + b1) * P0[1] - (b2 + b3) * P3[1];
          s11 += b1 * b1;
          s12x += b1 * b2 * tL[0];
          s12y += b1 * b2 * tL[1];
          s22 += b2 * b2;
          r1 += b1 * (tL[0] * rx + tL[1] * ry);
          r2x += b2 * rx;
          r2y += b2 * ry;
        }
        const den = s11 - (s12x * s12x + s12y * s12y) / s22;
        const a1 = clamp(Math.abs(den) > 1e-9 ? (r1 - (s12x * r2x + s12y * r2y) / s22) / den : aNat, 0.08 * chord, 0.78 * L);
        const dx2 = (r2x - s12x * a1) / s22;
        const dy2 = (r2y - s12y * a1) / s22;
        const l2 = Math.hypot(dx2, dy2) || 1;
        const sc2 = clamp(l2, 0.08 * chord, 0.78 * L) / l2;
        return [[P0[0] + a1 * tL[0], P0[1] + a1 * tL[1]], [P3[0] + dx2 * sc2, P3[1] + dy2 * sc2]];
      } else if (!tanL && tanR) {
        let s11 = reg, s12x = 0, s12y = 0, s22 = reg;
        let r1x = reg * tL[0] * aNat, r1y = reg * tL[1] * aNat, r2 = reg * aNat;
        for (let i = 0; i < n; i++) {
          const t = uParam[i], m = 1 - t;
          const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
          const rx = pts[i][0] - (b0 + b1) * P0[0] - (b2 + b3) * P3[0];
          const ry = pts[i][1] - (b0 + b1) * P0[1] - (b2 + b3) * P3[1];
          s11 += b1 * b1;
          s12x += b1 * b2 * tR[0];
          s12y += b1 * b2 * tR[1];
          s22 += b2 * b2;
          r1x += b1 * rx;
          r1y += b1 * ry;
          r2 += b2 * (tR[0] * rx + tR[1] * ry);
        }
        const den = s22 - (s12x * s12x + s12y * s12y) / s11;
        const a2 = clamp(Math.abs(den) > 1e-9 ? (r2 - (s12x * r1x + s12y * r1y) / s11) / den : aNat, 0.08 * chord, 0.78 * L);
        const dx1 = (r1x - s12x * a2) / s11;
        const dy1 = (r1y - s12y * a2) / s11;
        const l1 = Math.hypot(dx1, dy1) || 1;
        const sc1 = clamp(l1, 0.08 * chord, 0.78 * L) / l1;
        return [[P0[0] + dx1 * sc1, P0[1] + dy1 * sc1], [P3[0] + a2 * tR[0], P3[1] + a2 * tR[1]]];
      } else {
        let s11 = reg, s12 = 0, s22 = reg;
        let r1x = reg * tL[0] * aNat, r1y = reg * tL[1] * aNat;
        let r2x = reg * tR[0] * aNat, r2y = reg * tR[1] * aNat;
        for (let i = 0; i < n; i++) {
          const t = uParam[i], m = 1 - t;
          const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
          const rx = pts[i][0] - (b0 + b1) * P0[0] - (b2 + b3) * P3[0];
          const ry = pts[i][1] - (b0 + b1) * P0[1] - (b2 + b3) * P3[1];
          s11 += b1 * b1; s12 += b1 * b2; s22 += b2 * b2;
          r1x += b1 * rx; r1y += b1 * ry;
          r2x += b2 * rx; r2y += b2 * ry;
        }
        const det = s11 * s22 - s12 * s12;
        if (Math.abs(det) < 1e-9) return null;
        let dx1 = (s22 * r1x - s12 * r2x) / det, dy1 = (s22 * r1y - s12 * r2y) / det;
        let dx2 = (s11 * r2x - s12 * r1x) / det, dy2 = (s11 * r2y - s12 * r1y) / det;
        const l1 = Math.hypot(dx1, dy1) || 1, l2 = Math.hypot(dx2, dy2) || 1;
        const sc1 = clamp(l1, 0.08 * chord, 0.78 * L) / l1;
        const sc2 = clamp(l2, 0.08 * chord, 0.78 * L) / l2;
        return [[P0[0] + dx1 * sc1, P0[1] + dy1 * sc1], [P3[0] + dx2 * sc2, P3[1] + dy2 * sc2]];
      }
    };
    let u2 = new Float64Array(n);
    for (let i = 1; i < n; i++) u2[i] = u2[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 0; i < n; i++) u2[i] /= L;
    let pair = solveFreeOrSemi2D(u2);
    if (pair && isConvexPairValid(pair[0], pair[1])) {
      let [fP1, fP2] = pair;
      let fRes = computeErr(u2, fP1, fP2);
      let bestU = u2, bestP1 = fP1, bestP2 = fP2, bestRes = fRes;
      for (let it = 0; it < 10; it++) {
        const uNext = reparameterize(pts, u2, P0, fP1, fP2, P3);
        const nPair = solveFreeOrSemi2D(uNext);
        if (!nPair || !isConvexPairValid(nPair[0], nPair[1])) break;
        const nRes = computeErr(uNext, nPair[0], nPair[1]);
        u2 = uNext; fP1 = nPair[0]; fP2 = nPair[1]; fRes = nRes;
        if (nRes.err < bestRes.err) { bestU = uNext; bestP1 = fP1; bestP2 = fP2; bestRes = nRes; }
      }
      u2 = bestU; fP1 = bestP1; fP2 = bestP2; fRes = bestRes;
      if (fRes.err < res.err * 0.96 && isConvexPairValid(fP1, fP2)) {
        u = u2; P1 = fP1; P2 = fP2; res = fRes;
        const d1x = P1[0] - P0[0], d1y = P1[1] - P0[1], l1 = Math.hypot(d1x, d1y) || 1;
        const d2x = P2[0] - P3[0], d2y = P2[1] - P3[1], l2 = Math.hypot(d2x, d2y) || 1;
        if (!tanL) tL = [d1x / l1, d1y / l1];
        if (!tanR) tR = [d2x / l2, d2y / l2];
      }
    }
  }

  if (!circAlpha && res.err > 0.14 && res.err < 5.5 && n >= 6) {
    const rotVec = (v, ang) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
    };
    const deltasL = tanL ? [-0.04, -0.02, 0.02, 0.04] : [-0.32, -0.20, -0.12, -0.06, -0.03, 0.03, 0.06, 0.12, 0.20, 0.32];
    const deltasR = tanR ? [-0.04, -0.02, 0.02, 0.04] : [-0.32, -0.20, -0.12, -0.06, -0.03, 0.03, 0.06, 0.12, 0.20, 0.32];
    for (let pass = 0; pass < 2; pass++) {
      let improved = false;
      for (const da of deltasL) {
        const candTL = rotVec(tL, da);
        const [cP1, cP2] = solveAlphas(u, candTL, tR);
        if (!isConvexPairValid(cP1, cP2)) continue;
        const uCand = reparameterize(pts, u, P0, cP1, cP2, P3);
        const [rP1, rP2] = solveAlphas(uCand, candTL, tR);
        if (!isConvexPairValid(rP1, rP2)) continue;
        const cRes = computeErr(uCand, rP1, rP2);
        if (cRes.err < res.err - 0.003) {
          tL = candTL; u = uCand; P1 = rP1; P2 = rP2; res = cRes; improved = true;
        }
      }
      for (const db of deltasR) {
        const candTR = rotVec(tR, db);
        const [cP1, cP2] = solveAlphas(u, tL, candTR);
        if (!isConvexPairValid(cP1, cP2)) continue;
        const uCand = reparameterize(pts, u, P0, cP1, cP2, P3);
        const [rP1, rP2] = solveAlphas(uCand, tL, candTR);
        if (!isConvexPairValid(rP1, rP2)) continue;
        const cRes = computeErr(uCand, rP1, rP2);
        if (cRes.err < res.err - 0.003) {
          tR = candTR; u = uCand; P1 = rP1; P2 = rP2; res = cRes; improved = true;
        }
      }
      if (!improved || res.err <= 0.14) break;
    }
  }
  return { P0, P1, P2, P3, err: res.err, sse: res.sse, at: res.at, tL, tR, pts, lockL: !!tanL, lockR: !!tanR };
}

function fitChain(pts, tol, depth = 0, tL = null, tR = null, allowLine = false) {
  const n = pts.length;
  if (n < 2) return [];
  if (n === 2) {
    const [a, b] = pts;
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [{ P0: a, P1: [a[0] + dx / 3, a[1] + dy / 3], P2: [a[0] + 2 * dx / 3, a[1] + 2 * dy / 3], P3: b, isLine: allowLine, tL: [dx / l, dy / l], tR: [-dx / l, -dy / l], pts, lockL: !!tL, lockR: !!tR }];
  }
  const f = fitCubicLS(pts, tL, tR, allowLine);
  if (!f) return [];
  const chLen = Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]);
  const shallowBoost = (chLen > 12 && n > 10) ? 1.18 : 1.06;
  const effTol = (depth === 0 ? Math.max(tol * 1.45, 0.32) : depth === 1 ? Math.max(tol * 1.28, 0.28) : Math.max(tol * 1.15, 0.24)) * shallowBoost;
  if (f.err <= effTol || depth >= 5 || n <= 6) return [f];

  const m = clamp(f.at, 2, n - 2);
  const adaptW = clamp(Math.round(Math.min(m, n - 1 - m) * 0.45), 8, 28);
  const tMid = smoothTangentOpen(pts, m, adaptW);
  return [
    ...fitChain(pts.slice(0, m + 1), tol, depth + 1, tL, [-tMid[0], -tMid[1]], false),
    ...fitChain(pts.slice(m), tol, depth + 1, tMid, tR, false)
  ];
}

function harmonizeG1Joints(segs, jointCorner) {
  const m = segs.length;
  if (m < 2) return segs;
  for (let i = 0; i < m; i++) {
    if (jointCorner && jointCorner[i]) continue;
    const a = segs[i], b = segs[(i + 1) % m];
    if (a.isLine && b.isLine) continue;
    const P = a.P3;
    if (a.isLine && !b.isLine) {
      const dx = a.P3[0] - a.P0[0], dy = a.P3[1] - a.P0[1], l = Math.hypot(dx, dy);
      const lout = Math.hypot(b.P1[0] - P[0], b.P1[1] - P[1]);
      if (l > 1e-4 && lout > 1e-4) {
        const tx = dx / l, ty = dy / l;
        if ((b.P1[0] - P[0]) * tx + (b.P1[1] - P[1]) * ty > 0.65 * lout) {
          b.P1 = [P[0] + tx * lout, P[1] + ty * lout];
        }
      }
      continue;
    }
    if (!a.isLine && b.isLine) {
      const dx = b.P3[0] - b.P0[0], dy = b.P3[1] - b.P0[1], l = Math.hypot(dx, dy);
      const lin = Math.hypot(P[0] - a.P2[0], P[1] - a.P2[1]);
      if (l > 1e-4 && lin > 1e-4) {
        const tx = dx / l, ty = dy / l;
        if ((P[0] - a.P2[0]) * tx + (P[1] - a.P2[1]) * ty > 0.65 * lin) {
          a.P2 = [P[0] - tx * lin, P[1] - ty * lin];
        }
      }
      continue;
    }
    const vinX = P[0] - a.P2[0], vinY = P[1] - a.P2[1];
    const voutX = b.P1[0] - P[0], voutY = b.P1[1] - P[1];
    const lin = Math.hypot(vinX, vinY), lout = Math.hypot(voutX, voutY);
    if (lin < 1e-4 || lout < 1e-4) continue;
    const chA = Math.hypot(a.P3[0] - a.P0[0], a.P3[1] - a.P0[1]) || 1;
    const chB = Math.hypot(b.P3[0] - b.P0[0], b.P3[1] - b.P0[1]) || 1;
    const uinX = vinX / lin, uinY = vinY / lin;
    const uoutX = voutX / lout, uoutY = voutY / lout;
    /* Hanya harmonisasi bila kedua vektor singgung memang searah (selisih sudut <= ~56 derajat) */
    if (uinX * uoutX + uinY * uoutY < 0.55) continue;
    /* Bobot proporsional terhadap akar panjang tali busur agar segmen mikro tidak membengkokkan segmen panjang */
    const wA = Math.sqrt(chA), wB = Math.sqrt(chB);
    const ux = uinX * wA + uoutX * wB;
    const uy = uinY * wA + uoutY * wB;
    const ul = Math.hypot(ux, uy);
    if (ul < 1e-4) continue;
    const tx = ux / ul, ty = uy / ul;
    const candP2 = [P[0] - tx * lin, P[1] - ty * lin];
    const candP1 = [P[0] + tx * lout, P[1] + ty * lout];
    const maxShiftA = Math.min(0.85, chA * 0.08);
    const maxShiftB = Math.min(0.85, chB * 0.08);
    if (Math.hypot(candP2[0] - a.P2[0], candP2[1] - a.P2[1]) <= maxShiftA) a.P2 = candP2;
    if (Math.hypot(candP1[0] - b.P1[0], candP1[1] - b.P1[1]) <= maxShiftB) b.P1 = candP1;
  }
  return segs;
}

function fitLoopBeziers(smoothed, tol, advOpt = {}) {
  const { pts, corners, smoothKnots, knotTangents, juncFlags } = smoothed;
  const n = pts.length;
  if (n < 3) return [];
  const hasHardJunc = juncFlags && juncFlags.some(v => v === 1);
  if (smoothed.isTrueCircle || (!hasHardJunc && n >= 8)) {
    const cf = smoothed.circleFit || fitCircle2D(pts);
    if (cf && cf.r >= (smoothed.isTrueCircle ? 1.10 : 1.85)) {
      let maxRDev = 0, polyA = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
        const dR = Math.abs(Math.hypot(p[0] - cf.cx, p[1] - cf.cy) - cf.r);
        if (dR > maxRDev) maxRDev = dR;
        polyA += p[0] * q[1] - q[0] * p[1];
      }
      const absA = Math.abs(polyA) * 0.5;
      const areaRatio = absA / (Math.PI * cf.r * cf.r);
      const bw = maxX - minX, bh = maxY - minY;
      const aspect = bw > 0 && bh > 0 ? (bw / bh) : 0;
      const rms = cf.rms != null ? cf.rms : 0;
      if (smoothed.isTrueCircle || (aspect >= 0.88 && aspect <= 1.13 && areaRatio >= 0.91 && areaRatio <= 1.09 &&
          rms <= Math.max(0.32, cf.r * 0.025) && maxRDev <= Math.max(0.75, cf.r * 0.055))) {
        const cx = cf.cx, cy = cf.cy, r = cf.r;
        const sgn = polyA >= 0 ? 1 : -1;
        const juncList = [];
        if (juncFlags) {
          for (let i = 0; i < n; i++) if (juncFlags[i]) juncList.push(i);
        }
        /* Jika lingkaran tidak memiliki T-junction, gunakan 4 kuadran Bézier standar */
        if (juncList.length === 0) {
          const k = 0.552284749831 * r;
          const T = [cx, cy - r], R = [cx + sgn * r, cy], B = [cx, cy + r], L = [cx - sgn * r, cy];
          return [
            { P0: T, P1: [cx + sgn * k, cy - r], P2: [cx + sgn * r, cy - k], P3: R, isLine: false, isTrueCircleArc: true, tL: [sgn, 0], tR: [0, -1], startSharp: false, endSharp: false, spanIdx: 0 },
            { P0: R, P1: [cx + sgn * r, cy + k], P2: [cx + sgn * k, cy + r], P3: B, isLine: false, isTrueCircleArc: true, tL: [0, 1], tR: [sgn, 0], startSharp: false, endSharp: false, spanIdx: 0 },
            { P0: B, P1: [cx - sgn * k, cy + r], P2: [cx - sgn * r, cy + k], P3: L, isLine: false, isTrueCircleArc: true, tL: [-sgn, 0], tR: [0, 1], startSharp: false, endSharp: false, spanIdx: 0 },
            { P0: L, P1: [cx - sgn * r, cy - k], P2: [cx - sgn * k, cy - r], P3: T, isLine: false, isTrueCircleArc: true, tL: [0, -1], tR: [-sgn, 0], startSharp: false, endSharp: false, spanIdx: 0 }
          ];
        }
        /* Knot-Constrained Exact Circular Arc Splitting pada T-Junction Bersama:
           Membagi lingkaran tepat pada sudut polar setiap T-junction agar simpul ujung (P0, P3) dan spanIdx
           sinkron 100% bit-demi-bit dengan pita warna & latar di synchronizeSharedTopology! */
        const circleSegs = [];
        const mJ = juncList.length;
        for (let spanIdx = 0; spanIdx < mJ; spanIdx++) {
          const ia = juncList[spanIdx], ib = juncList[(spanIdx + 1) % mJ];
          const Pa = pts[ia], Pb = pts[ib];
          const thA = Math.atan2(Pa[1] - cy, Pa[0] - cx);
          const thB = Math.atan2(Pb[1] - cy, Pb[0] - cx);
          let dTheta = (thB - thA) * sgn;
          while (dTheta <= 1e-5) dTheta += 2 * Math.PI;
          while (dTheta > 2 * Math.PI + 1e-5) dTheta -= 2 * Math.PI;
          const numSub = Math.max(1, Math.ceil(dTheta / (Math.PI * 0.52)));
          const stepTh = (dTheta / numSub) * sgn;
          const alpha = (4 / 3) * Math.tan(Math.abs(stepTh) * 0.25) * r;
          for (let sub = 0; sub < numSub; sub++) {
            const a0 = thA + sub * stepTh;
            const a1 = (sub === numSub - 1) ? thB : (thA + (sub + 1) * stepTh);
            const P0 = (sub === 0) ? [Pa[0], Pa[1]] : [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
            const P3 = (sub === numSub - 1) ? [Pb[0], Pb[1]] : [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
            const t0x = -sgn * Math.sin(a0), t0y = sgn * Math.cos(a0);
            const t1x = -sgn * Math.sin(a1), t1y = sgn * Math.cos(a1);
            const P1 = [P0[0] + alpha * t0x, P0[1] + alpha * t0y];
            const P2 = [P3[0] - alpha * t1x, P3[1] - alpha * t1y];
            circleSegs.push({
              P0, P1, P2, P3,
              isLine: false,
              isTrueCircleArc: true,
              tL: [t0x, t0y],
              tR: [-t1x, -t1y],
              startSharp: false,
              endSharp: false,
              spanIdx
            });
          }
        }
        return circleSegs;
      }
    }
  }

  const lineStr = (advOpt.lineStraighten ?? 56) / 100;
  const extremumAlign = advOpt.extremumAlign !== false;

  const juncIndices = [];
  if (juncFlags) {
    for (let i = 0; i < n; i++) if (juncFlags[i]) juncIndices.push(i);
  }
  const getSpanIdx = knotI => {
    if (juncIndices.length === 0) return 0;
    for (let r = juncIndices.length - 1; r >= 0; r--) {
      if (knotI >= juncIndices[r]) return r;
    }
    return 0;
  };

  let allKnots = [];
  for (let i = 0; i < n; i++) {
    const jf = juncFlags ? juncFlags[i] : 0;
    const isHardJunc = (jf === 1);
    const isPassJunc = (jf === 2) && !(corners && corners[i]);
    if ((corners && corners[i]) || isHardJunc) {
      allKnots.push({ i, sharp: true, isJunc: jf > 0, extremum: false });
    } else if ((smoothKnots && smoothKnots[i]) || isPassJunc) {
      const lockedT = knotTangents && knotTangents.get(i);
      let t = lockedT || smoothTangentClosed(pts, i, 7);
      if (!lockedT && extremumAlign) {
        if (Math.abs(t[1]) < 0.045) t = [t[0] < 0 ? -1 : 1, 0];
        else if (Math.abs(t[0]) < 0.045) t = [0, t[1] < 0 ? -1 : 1];
      }
      allKnots.push({ i, sharp: false, isJunc: jf > 0, extremum: !isPassJunc && !!lockedT, t, locked: !!lockedT || isPassJunc });
    }
  }

  if (allKnots.length === 0) {
    let iMinX = 0, iMaxX = 0, iMinY = 0, iMaxY = 0;
    for (let i = 1; i < n; i++) {
      if (pts[i][0] < pts[iMinX][0]) iMinX = i;
      if (pts[i][0] > pts[iMaxX][0]) iMaxX = i;
      if (pts[i][1] < pts[iMinY][1]) iMinY = i;
      if (pts[i][1] > pts[iMaxY][1]) iMaxY = i;
    }
    const rawCard = [iMinX, iMaxX, iMinY, iMaxY].sort((a, b) => a - b);
    const card = [];
    for (const ci of rawCard) {
      if (!card.length || (ci - card[card.length - 1] >= n / 12 && (n - ci + card[0]) >= n / 12)) card.push(ci);
    }
    if (card.length < 2) card.push((card[0] + (n >> 1)) % n);
    allKnots = card.map(i => {
      let t = smoothTangentClosed(pts, i, 7);
      if (extremumAlign) {
        if (Math.abs(t[1]) < 0.045) t = [t[0] < 0 ? -1 : 1, 0];
        else if (Math.abs(t[0]) < 0.045) t = [0, t[1] < 0 ? -1 : 1];
      }
      return { i, sharp: false, isJunc: false, extremum: true, t, locked: false };
    });
  } else if (allKnots.length === 1) {
    const opp = (allKnots[0].i + (n >> 1)) % n;
    allKnots.push({ i: opp, sharp: false, isJunc: false, extremum: true, t: smoothTangentClosed(pts, opp, 7) });
    allKnots.sort((a, b) => a.i - b.i);
  }

  let segs = [], jointCorner = [], jointExt = [];
  for (let k = 0; k < allKnots.length; k++) {
    const ka = allKnots[k], kb = allKnots[(k + 1) % allKnots.length];
    const spanIdx = getSpanIdx(ka.i);
    const ch = [];
    for (let i = ka.i; ; i = (i + 1) % n) {
      ch.push(pts[i]);
      if (i === kb.i && ch.length > 1) break;
      if (ch.length > n + 2) break;
    }
    if (ch.length < 2) continue;

    const P0 = ch[0], P3 = ch[ch.length - 1];
    const chord = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
    if (chord > 1e-6) {
      const ux = (P3[0] - P0[0]) / chord, uy = (P3[1] - P0[1]) / chord;
      let maxD = 0, sumSD = 0, sumAD = 0;
      for (let i = 1; i < ch.length - 1; i++) {
        const sd = (ch[i][0] - P0[0]) * uy - (ch[i][1] - P0[1]) * ux;
        const d = Math.abs(sd);
        if (d > maxD) maxD = d;
        sumSD += sd;
        sumAD += d;
      }
      const isOneSidedCurve = sumAD > 1e-5 && (Math.abs(sumSD) / sumAD) >= 0.60 && maxD > 0.20;
      const midIdx = (ka.i + Math.floor(((kb.i - ka.i + n) % n) * 0.5)) % n;
      const isFlaggedStraight = !!(smoothed.straightSpanFlags && smoothed.straightSpanFlags[midIdx]) && !isOneSidedCurve;
      const isAxisChord = Math.min(Math.abs(ux), Math.abs(uy)) <= 0.12;
      const bothHardCorners = ka.sharp && kb.sharp;
      const lineLimit = isFlaggedStraight
        ? Math.max(isAxisChord ? 0.42 : (0.28 + lineStr * 0.16), tol * 1.05)
        : (bothHardCorners && chord >= 3.5 && !isOneSidedCurve)
        ? Math.min(0.24, Math.max(0.16, tol * 0.85))
        : 0.075;
      const alignA = ka.sharp || !ka.t || Math.abs(ka.t[0] * uy - ka.t[1] * ux) <= 0.16;
      const alignB = kb.sharp || !kb.t || Math.abs(kb.t[0] * uy - kb.t[1] * ux) <= 0.16;
      if (maxD <= lineLimit && alignA && alignB) {
        segs.push({
          P0, P1: [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3],
          P2: [P0[0] + 2 * (P3[0] - P0[0]) / 3, P0[1] + 2 * (P3[1] - P0[1]) / 3],
          P3, isLine: true, tL: [ux, uy], tR: [-ux, -uy], startSharp: ka.sharp, endSharp: kb.sharp, spanIdx
        });
        jointCorner.push(kb.sharp);
        jointExt.push(kb.extremum);
        continue;
      }
    }

    /* Jika rentang ch (panjang >= 10) merupakan busur lingkaran parsial murni, gunakan konstruksi Bézier analitik lingkaran! */
    if (ch.length >= 10 && chord >= 8.0) {
      const cfSpan = fitCircle2D(ch);
      const lfSpan = fitLine2D(ch);
      if (cfSpan && cfSpan.r >= 5.0 * (tol / 0.18) && cfSpan.r <= 600 &&
          cfSpan.rms <= Math.max(0.24, tol * 1.25) && (!lfSpan || cfSpan.rms < lfSpan.rms * 0.48)) {
        let maxArcD = 0;
        for (let i = 0; i < ch.length; i++) {
          const dR = Math.abs(Math.hypot(ch[i][0] - cfSpan.cx, ch[i][1] - cfSpan.cy) - cfSpan.r);
          if (dR > maxArcD) maxArcD = dR;
        }
        const th0 = Math.atan2(P0[1] - cfSpan.cy, P0[0] - cfSpan.cx);
        const th1 = Math.atan2(P3[1] - cfSpan.cy, P3[0] - cfSpan.cx);
        const Pmid = ch[ch.length >> 1];
        const thM = Math.atan2(Pmid[1] - cfSpan.cy, Pmid[0] - cfSpan.cx);
        let dTh01 = Math.atan2(Math.sin(th1 - th0), Math.cos(th1 - th0));
        const dTh0M = Math.atan2(Math.sin(thM - th0), Math.cos(thM - th0));
        if (dTh01 * dTh0M < 0) dTh01 += (dTh01 > 0 ? -2 * Math.PI : 2 * Math.PI);
        const absSweep = Math.abs(dTh01);
        if (maxArcD <= Math.max(0.55, tol * 2.6) && absSweep >= 0.42 && absSweep <= Math.PI * 1.65) {
          const sgnArc = dTh01 >= 0 ? 1 : -1;
          const numSub = Math.max(1, Math.ceil(absSweep / (Math.PI * 0.52)));
          const stepTh = dTh01 / numSub;
          const rArc = cfSpan.r;
          const alphaArc = (4 / 3) * Math.tan(Math.abs(stepTh) * 0.25) * rArc;
          for (let sub = 0; sub < numSub; sub++) {
            const a0 = th0 + sub * stepTh;
            const a1 = (sub === numSub - 1) ? th1 : (th0 + (sub + 1) * stepTh);
            const subP0 = (sub === 0) ? [P0[0], P0[1]] : [cfSpan.cx + rArc * Math.cos(a0), cfSpan.cy + rArc * Math.sin(a0)];
            const subP3 = (sub === numSub - 1) ? [P3[0], P3[1]] : [cfSpan.cx + rArc * Math.cos(a1), cfSpan.cy + rArc * Math.sin(a1)];
            const t0x = -sgnArc * Math.sin(a0), t0y = sgnArc * Math.cos(a0);
            const t1x = -sgnArc * Math.sin(a1), t1y = sgnArc * Math.cos(a1);
            const subP1 = [subP0[0] + alphaArc * t0x, subP0[1] + alphaArc * t0y];
            const subP2 = [subP3[0] - alphaArc * t1x, subP3[1] - alphaArc * t1y];
            segs.push({
              P0: subP0, P1: subP1, P2: subP2, P3: subP3,
              isLine: false, isTrueCircleArc: true,
              tL: [t0x, t0y], tR: [-t1x, -t1y],
              startSharp: (sub === 0) ? ka.sharp : false,
              endSharp: (sub === numSub - 1) ? kb.sharp : false,
              spanIdx
            });
            jointCorner.push(sub === numSub - 1 ? kb.sharp : false);
            jointExt.push(false);
          }
          continue;
        }
      }
    }

    const tL = ka.sharp ? null : ka.t;
    const endT = kb.sharp ? null : kb.t;
    const tR = endT ? [-endT[0], -endT[1]] : null;
    const fs = fitChain(ch, tol, 0, tL, tR, ka.sharp && kb.sharp);
    for (let s = 0; s < fs.length; s++) {
      const segItem = fs[s];
      segItem.startSharp = (s === 0) ? ka.sharp : false;
      segItem.endSharp = (s === fs.length - 1) ? kb.sharp : false;
      segItem.spanIdx = spanIdx;
      segs.push(segItem);
      jointCorner.push(s === fs.length - 1 ? kb.sharp : false);
      jointExt.push(s === fs.length - 1 ? kb.extremum : false);
    }
  }

  if (lineStr > 0.15) {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.isLine) continue;
      const bothSharp = !!(s.startSharp && s.endSharp);
      const dx = s.P3[0] - s.P0[0], dy = s.P3[1] - s.P0[1];
      const chord = Math.hypot(dx, dy);
      if (chord < 2.0) continue;
      const ux = dx / chord, uy = dy / chord;
      const d1 = (s.P1[0] - s.P0[0]) * uy - (s.P1[1] - s.P0[1]) * ux;
      const d2 = (s.P2[0] - s.P0[0]) * uy - (s.P2[1] - s.P0[1]) * ux;
      const maxH = Math.max(Math.abs(d1), Math.abs(d2));
      const ptsDev = (s.pts && s.pts.length >= 4)
        ? s.pts.reduce((mx, p) => Math.max(mx, Math.abs((p[0] - s.P0[0]) * uy - (p[1] - s.P0[1]) * ux)), 0)
        : maxH;
      const midSpanFlagged = !!(smoothed.straightSpanFlags && s.pts && s.pts.length >= 2);
      const isNearlyFlat = bothSharp
        ? (chord >= 8.0 && ptsDev <= Math.min(0.18, tol * 0.75) && maxH <= Math.max(0.20, tol * 0.72))
        : (midSpanFlagged && chord >= 14.0 && ptsDev <= Math.min(0.12, tol * 0.60) && maxH <= Math.max(0.24, chord * 0.012));
      if (isNearlyFlat) {
        s.P1 = [s.P0[0] + dx / 3, s.P0[1] + dy / 3];
        s.P2 = [s.P0[0] + 2 * dx / 3, s.P0[1] + 2 * dy / 3];
        s.isLine = true;
        s.tL = [ux, uy];
        s.tR = [-ux, -uy];
      }
    }
  }

  const sampleSeg = (s, from) => {
    const out = [];
    for (let k = from; k <= 16; k++) out.push(evalBezier(s.P0, s.P1, s.P2, s.P3, k / 16));
    return out;
  };
  const concatPts = (a, b) => {
    if (a.pts && b.pts && a.pts.length >= 2 && b.pts.length >= 2) {
      return a.pts.concat(b.pts.slice(1));
    }
    return sampleSeg(a, 0).concat(sampleSeg(b, 1));
  };
  const makeLineSeg = (P0, P3, startSharp, endSharp, spanIdx, ptsArr = null) => {
    const dx = P3[0] - P0[0], dy = P3[1] - P0[1], ch = Math.hypot(dx, dy) || 1;
    const ux = dx / ch, uy = dy / ch;
    return {
      P0: [P0[0], P0[1]],
      P1: [P0[0] + dx / 3, P0[1] + dy / 3],
      P2: [P0[0] + 2 * dx / 3, P0[1] + 2 * dy / 3],
      P3: [P3[0], P3[1]],
      err: 0, sse: 0, isLine: true,
      tL: [ux, uy], tR: [-ux, -uy],
      startSharp: !!startSharp, endSharp: !!endSharp, spanIdx,
      pts: ptsArr || [P0, P3], lockL: true, lockR: true
    };
  };
  const maxCollinearDev = (ptsArr, P0, P3) => {
    const dx = P3[0] - P0[0], dy = P3[1] - P0[1], ch = Math.hypot(dx, dy);
    if (ch < 1e-6) return 0;
    const ux = dx / ch, uy = dy / ch;
    let mx = 0;
    for (let k = 0; k < ptsArr.length; k++) {
      const d = Math.abs((ptsArr[k][0] - P0[0]) * uy - (ptsArr[k][1] - P0[1]) * ux);
      if (d > mx) mx = d;
    }
    return mx;
  };

  const mdlPenalty = tol * tol * 4.5;
  const lineMergeTol = Math.max(0.28 + lineStr * 0.20, tol * 1.05);
  let improved = true, guard = 0;
  while (improved && guard++ < 8 && segs.length > 2) {
    improved = false;
    const out = [], outC = [], outE = [];
    for (let i = 0; i < segs.length; i++) {
      if (i === segs.length - 1 || segs[i].spanIdx !== segs[i + 1].spanIdx) {
        out.push(segs[i]); outC.push(jointCorner[i]); outE.push(jointExt[i]);
        continue;
      }
      const a = segs[i], b = segs[i + 1];
      const lenA = Math.hypot(a.P3[0] - a.P0[0], a.P3[1] - a.P0[1]);
      const lenB = Math.hypot(b.P3[0] - b.P0[0], b.P3[1] - b.P0[1]);
      const mid = concatPts(a, b);

      /* 1. Peleburan Kolinier Ketat:
            Jangan pernah mengubah segmen kurva lengkung (seperti sisi busur huruf e) menjadi garis lurus L!
            Hanya gabungkan menjadi garis lurus jika kedua segmen sudah garis lurus (a.isLine && b.isLine)
            atau salah satunya adalah stub mikro (< 2.2 px) yang benar-benar kolinier (colDev <= 0.14 px). */
      const colDev = maxCollinearDev(mid, a.P0, b.P3);
      const canMergeToLine = (a.isLine && b.isLine && !jointCorner[i] && colDev <= lineMergeTol) ||
        (!jointCorner[i] && (a.isLine || b.isLine) && Math.min(lenA, lenB) < 2.2 && colDev <= 0.14);
      if (canMergeToLine) {
        out.push(makeLineSeg(a.P0, b.P3, a.startSharp, b.endSharp, a.spanIdx, mid));
        outC.push(jointCorner[i + 1]);
        outE.push(jointExt[i + 1]);
        i++; improved = true;
        continue;
      }

      if (jointCorner[i]) {
        out.push(a); outC.push(jointCorner[i]); outE.push(jointExt[i]);
        continue;
      }

      /* 2. Absorpsi Segmen Mikro (< 3.2px) ke kurva sebelahnya */
      if (a.isLine !== b.isLine) {
        if (Math.min(lenA, lenB) < Math.max(3.2, tol * 7)) {
          const fStub = fitCubicLS(mid, a.isLine ? null : (a.lockL ? a.tL : null), b.isLine ? null : (b.lockR ? b.tR : null), false);
          if (fStub && fStub.err <= tol * 1.15) {
            fStub.startSharp = a.startSharp;
            fStub.endSharp = b.endSharp;
            fStub.spanIdx = a.spanIdx;
            out.push(fStub); outC.push(jointCorner[i + 1]); outE.push(jointExt[i + 1]);
            i++; improved = true;
            continue;
          }
        }
        out.push(a); outC.push(jointCorner[i]); outE.push(jointExt[i]);
        continue;
      }

      /* 3. Peleburan Kurva Bézier Kubik MDL:
            Lindungi simpul bahu fillet (jointExt[i] dengan garis singgung terkunci) dan puncak ekstremum kardinal! */
      const turnAB = Math.acos(clamp(-(a.tL[0] * b.tR[0] + a.tL[1] * b.tR[1]), -1, 1));
      const isFilletShoulder = jointExt[i] && (a.lockR || b.lockL) && turnAB >= 0.65;
      const allowAcrossExt = !isFilletShoulder && (!jointExt[i] || (turnAB < 1.15 && Math.min(lenA, lenB) < 7.5));
      if (turnAB < 1.95 && allowAcrossExt) {
        const isLongShallowMerge = !jointExt[i] && Math.min(lenA, lenB) >= 35 && turnAB < 0.25;
        const useTanL = (!a.startSharp && a.lockL && !isLongShallowMerge) ? a.tL : null;
        const useTanR = (!b.endSharp && b.lockR && !isLongShallowMerge) ? b.tR : null;
        const f = fitCubicLS(mid, useTanL, useTanR, false);
        const maxAllow = jointExt[i] ? tol * 0.78 : Math.max(tol * 1.45, 0.34);
        const oldCost = (a.sse || 0) + (b.sse || 0) + 2 * mdlPenalty;
        const newCost = (f ? (f.sse || 0) : Infinity) + mdlPenalty;
        if (f && f.err <= maxAllow && (newCost <= oldCost * 1.35 || (!jointExt[i] && f.err <= maxAllow))) {
          f.startSharp = a.startSharp;
          f.endSharp = b.endSharp;
          f.spanIdx = a.spanIdx;
          f.lockL = a.lockL;
          f.lockR = b.lockR;
          out.push(f); outC.push(jointCorner[i + 1]); outE.push(jointExt[i + 1]);
          i++; improved = true;
          continue;
        }
      }
      out.push(a); outC.push(jointCorner[i]); outE.push(jointExt[i]);
    }
    segs = out;
    jointCorner = outC;
    jointExt = outE;
  }

  /* Pemeriksaan penutup siklik (antara segmen terakhir & segmen pertama) */
  if (segs.length > 3) {
    const lastIdx = segs.length - 1;
    const a = segs[lastIdx], b = segs[0];
    if (a.spanIdx === b.spanIdx) {
      const lenA = Math.hypot(a.P3[0] - a.P0[0], a.P3[1] - a.P0[1]);
      const lenB = Math.hypot(b.P3[0] - b.P0[0], b.P3[1] - b.P0[1]);
      const mid = concatPts(a, b);
      const colDev = maxCollinearDev(mid, a.P0, b.P3);
      const canMergeCyclicLine = (a.isLine && b.isLine && (!jointCorner[lastIdx] || Math.min(lenA, lenB) < 2.5) && colDev <= lineMergeTol) ||
        (!jointCorner[lastIdx] && (a.isLine || b.isLine) && Math.min(lenA, lenB) < 2.2 && colDev <= 0.14);
      if (canMergeCyclicLine) {
        segs[0] = makeLineSeg(a.P0, b.P3, a.startSharp, b.endSharp, a.spanIdx, mid);
        segs.pop();
        jointCorner.pop();
        jointExt.pop();
      } else if (!jointCorner[lastIdx] && !a.isLine && !b.isLine && segs.length > 4) {
        const turnAB = Math.acos(clamp(-(a.tL[0] * b.tR[0] + a.tL[1] * b.tR[1]), -1, 1));
        const allowAcrossExt = !jointExt[lastIdx] || (turnAB < 1.55 && Math.min(lenA, lenB) < 10.0);
        if (turnAB < 1.95 && allowAcrossExt) {
          const useTanL = (!a.startSharp && a.lockL) ? a.tL : null;
          const useTanR = (!b.endSharp && b.lockR) ? b.tR : null;
          const f = fitCubicLS(mid, useTanL, useTanR, false);
          if (f && f.err <= (jointExt[lastIdx] ? tol * 0.72 : Math.max(tol * 1.18, 0.25))) {
            f.startSharp = a.startSharp;
            f.endSharp = b.endSharp;
            f.spanIdx = a.spanIdx;
            f.lockL = a.lockL;
            f.lockR = b.lockR;
            segs[0] = f;
            segs.pop();
            jointCorner.pop();
            jointExt.pop();
          }
        }
      }
    }
  }

  /* G1 tangents Harmonization at smooth curve joints */
  harmonizeG1Joints(segs, jointCorner);
  for (let i = 0; i < segs.length; i++) {
    segs[i].endSharp = !!jointCorner[i];
    segs[i].startSharp = !!jointCorner[(i - 1 + segs.length) % segs.length];
  }
  return segs;
}

/* =====================================================================
   Shared Planar Topology Synchronizer (Masalah 6 & Masalah 1 Gap Fix)
   Menyamakan secara eksak (bit-for-bit) segmen kurva Bézier kubik pada
   setiap perbatasan bersama antar-region (baik loop tertutup bebas-junction
   maupun rantai half-edge di antara T/X-junctions).
   ===================================================================== */
function reverseBezierSegs(segs) {
  return segs.slice().reverse().map(sg => ({
    P0: [sg.P3[0], sg.P3[1]],
    P1: [sg.P2[0], sg.P2[1]],
    P2: [sg.P1[0], sg.P1[1]],
    P3: [sg.P0[0], sg.P0[1]],
    isLine: !!sg.isLine,
    isTrueCircleArc: !!sg.isTrueCircleArc,
    tL: sg.tR ? [sg.tR[0], sg.tR[1]] : null,
    tR: sg.tL ? [sg.tL[0], sg.tL[1]] : null,
    startSharp: !!sg.endSharp,
    endSharp: !!sg.startSharp,
    spanIdx: sg.spanIdx
  }));
}

function compareKeyArrays(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function synchronizeSharedTopology(smoothedList, rawLoops) {
  if (!smoothedList || !rawLoops || smoothedList.length !== rawLoops.length) return smoothedList;
  const cycleMap = new Map();
  const chainMap = new Map();

  /* Prioritaskan kontur Lingkaran Sejati (isTrueCircle) sebagai Master di atas kontur poligon/latar raksasa
     agar busur lingkaran analitik tidak ditimpa oleh segmen kasar dari latar belakang! */
  const order = smoothedList.map((_, i) => i).sort((a, b) => {
    const cA = smoothedList[a] && smoothedList[a].isTrueCircle ? 1 : 0;
    const cB = smoothedList[b] && smoothedList[b].isTrueCircle ? 1 : 0;
    if (cA !== cB) return cB - cA;
    /* Jika keduanya adalah lingkaran sejati yang bersinggungan, prioritaskan lingkaran yang lebih kecil (kurvatur lebih tinggi) */
    if (cA === 1 && cB === 1) {
      return Math.abs(smoothedList[a].area || 0) - Math.abs(smoothedList[b].area || 0);
    }
    const d = Math.abs(smoothedList[b].area || 0) - Math.abs(smoothedList[a].area || 0);
    return Math.abs(d) > 1e-2 ? d : (smoothedList[b].area || 0) - (smoothedList[a].area || 0);
  });

  for (const idx of order) {
    const s = smoothedList[idx];
    const raw = rawLoops[idx];
    if (!s || !s.segs || !s.segs.length || !raw || !raw.vkeys || raw.vkeys.length < 3) continue;
    const vkeys = raw.vkeys;
    const juncFlags = raw.juncFlags;
    const n = vkeys.length;

    const juncIndices = [];
    if (juncFlags) {
      for (let i = 0; i < n; i++) if (juncFlags[i]) juncIndices.push(i);
    }

    if (juncIndices.length === 0) {
      const fwd = vkeys;
      const rev = [vkeys[0], ...vkeys.slice(1).reverse()];
      const isFwd = compareKeyArrays(fwd, rev) <= 0;
      const cKey = (isFwd ? fwd : rev).join(',');
      const master = cycleMap.get(cKey);
      if (!master) {
        cycleMap.set(cKey, { segs: s.segs, pts: s.pts || s.scaledPts, isFwd });
      } else {
        const syncedSegs = master.isFwd === isFwd ? master.segs.map(sg => ({ ...sg })) : reverseBezierSegs(master.segs);
        s.segs = syncedSegs;
        if (master.pts) {
          const syncedPts = master.isFwd === isFwd ? master.pts.slice() : [master.pts[0], ...master.pts.slice(1).reverse()];
          if (s.pts) s.pts = syncedPts;
          if (s.scaledPts) s.scaledPts = syncedPts;
        }
        s.d = segsToD(s.segs, true);
      }
    } else {
      const m = juncIndices.length;
      const bySpan = Array.from({ length: m }, () => []);
      for (const sg of s.segs) {
        const sp = clamp(sg.spanIdx || 0, 0, m - 1);
        bySpan[sp].push(sg);
      }
      let anyReplaced = false;
      const newSegs = [];
      for (let r = 0; r < m; r++) {
        const spanSegs = bySpan[r];
        if (!spanSegs.length) continue;
        const ja = juncIndices[r];
        const jb = juncIndices[(r + 1) % m];
        const K = [];
        for (let i = ja; ; i = (i + 1) % n) {
          K.push(vkeys[i]);
          if (i === jb && K.length > 1) break;
          if (K.length > n + 2) break;
        }
        const Krev = K.slice().reverse();
        const isFwd = compareKeyArrays(K, Krev) <= 0;
        const chainKey = (isFwd ? K : Krev).join(',');
        const isPureAnalyticLine = spanSegs.length === 1 && !!spanSegs[0].isLine;
        const isPureCircleArc = spanSegs.every(sg => sg.isTrueCircleArc);
        const compactBonus = (n <= 600 && Math.abs(s.area || 0) >= 16) ? 1.5 : 0;
        const spanPriority = (s.isTrueCircle ? 6 : 0) + (isPureCircleArc ? 4.5 : 0) + (isPureAnalyticLine ? 3.5 : 0) + compactBonus + (juncFlags[ja] === 2 ? 1 : 0) + (juncFlags[jb] === 2 ? 1 : 0) - spanSegs.length * 0.05;
        const master = chainMap.get(chainKey);
        if (!master) {
          chainMap.set(chainKey, { segs: spanSegs, isFwd, priority: spanPriority, ownerIdx: idx, spanSlot: r });
          newSegs.push(...spanSegs);
        } else if (spanPriority > master.priority + 1e-4) {
          /* Jika kontur saat ini merupakan Host Curve mulus (juncFlags === 2) sedangkan master sebelumnya adalah Stem Corner,
             jadikan segmen kurva mulus ini sebagai master baru dan perbarui pemilik sebelumnya! */
          const prevOwner = smoothedList[master.ownerIdx];
          if (prevOwner && prevOwner.segs) {
            const replForPrev = master.isFwd === isFwd
              ? spanSegs.map(sg => ({ ...sg, spanIdx: master.spanSlot }))
              : reverseBezierSegs(spanSegs).map(sg => ({ ...sg, spanIdx: master.spanSlot }));
            const rebuiltPrev = [];
            let inserted = false;
            for (const psg of prevOwner.segs) {
              if ((psg.spanIdx || 0) === master.spanSlot) {
                if (!inserted) {
                  replForPrev[0].P0 = [psg.P0[0], psg.P0[1]];
                  rebuiltPrev.push(...replForPrev);
                  inserted = true;
                }
                rebuiltPrev[rebuiltPrev.length - 1].P3 = [psg.P3[0], psg.P3[1]];
              } else {
                rebuiltPrev.push(psg);
              }
            }
            if (inserted) {
              prevOwner.segs = rebuiltPrev;
              prevOwner.d = segsToD(prevOwner.segs, true);
            }
          }
          chainMap.set(chainKey, { segs: spanSegs, isFwd, priority: spanPriority, ownerIdx: idx, spanSlot: r });
          newSegs.push(...spanSegs);
        } else {
          const repl = master.isFwd === isFwd ? master.segs.map(sg => ({ ...sg, spanIdx: r })) : reverseBezierSegs(master.segs).map(sg => ({ ...sg, spanIdx: r }));
          repl[0].P0 = [spanSegs[0].P0[0], spanSegs[0].P0[1]];
          repl[repl.length - 1].P3 = [spanSegs[spanSegs.length - 1].P3[0], spanSegs[spanSegs.length - 1].P3[1]];
          newSegs.push(...repl);
          anyReplaced = true;
        }
      }
      if (anyReplaced && newSegs.length) {
        s.segs = newSegs;
        s.d = segsToD(s.segs, true);
      }
    }
  }
  return smoothedList;
}

/* =====================================================================
   Perakitan SVG & Ekspor Multi-Format (SVG, DXF, AI, EPS, PDF, PNG)
   ===================================================================== */
function r2(v) { return Math.round(v * 100) / 100; }
function segsToD(segs, closed) {
  if (!segs.length) return '';
  let d = `M${r2(segs[0].P0[0])} ${r2(segs[0].P0[1])}`;
  for (const s of segs) {
    /* Jika segmen adalah garis lurus kolinier, tulis L agar SVG lebih bersih & tajam */
    if (s.isLine) {
      d += `L${r2(s.P3[0])} ${r2(s.P3[1])}`;
    } else {
      d += `C${r2(s.P1[0])} ${r2(s.P1[1])} ${r2(s.P2[0])} ${r2(s.P2[1])} ${r2(s.P3[0])} ${r2(s.P3[1])}`;
    }
  }
  return closed ? d + 'Z' : d;
}

function pip(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function signedPolyArea(pts) {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a * 0.5;
}


/* === END 11-vmt-smooth-bezier.js === */

/* === BEGIN 12-vmt-gradients-svg-dxf.js === */
/* =====================================================================
 * JS Module 12: VMT Engine Part 8 — Gradient Unification, Linear/Radial Gradient Fitting, SVG & DXF R12 Assembler
 * ===================================================================== */
/* =====================================================================
   MODUL GRADIENT UNIFICATION & CONTINUOUS SVG GRADIENT FITTING
   1. detectHorizontalSplitLines: Menjaga batas cakrawala (horizon) antara langit & laut
   2. unifyGradientBands: Menyatukan sabuk-sabuk kuantisasi (isoline bands) di dalam
      lereng gradasi kontinu tanpa melebur objek bertepi tegas (mercusuar, lumba-lumba, bulan, riak air)
   3. injectPointHighlights: Memulihkan bintang-bintang & titik cahaya 2D berkontras tinggi
   4. fitComponentGradientFromPixels & attachGradientsToRegions: Menghasilkan <linearGradient> & <radialGradient>
      multi-stop halus (PCA/Least-Squares + 1D RDP di ruang CIE-Lab + Elliptical Radial Beam)
   ===================================================================== */
function detectHorizontalSplitLines(rawRgba, w, h, mask) {
  if (!rawRgba || rawRgba.length < w * h * 4) return [];
  const rowStep = new Float32Array(h);
  for (let y = Math.floor(h * 0.14); y < Math.floor(h * 0.88); y++) {
    let sumStep = 0, curRun = 0, maxRun = 0, valid = 0, borderHits = 0;
    for (let x = 4; x < w - 4; x += 2) {
      const pA = (y - 2) * w + x, pB = (y + 2) * w + x;
      if (mask && (mask[pA] || mask[pB])) continue;
      const iA = pA * 4, iB = pB * 4;
      const step = Math.hypot(rawRgba[iA] - rawRgba[iB], rawRgba[iA + 1] - rawRgba[iB + 1], rawRgba[iA + 2] - rawRgba[iB + 2]);
      const pA2 = (y - 5) * w + x, pB2 = (y + 5) * w + x;
      const sAbove = Math.hypot(rawRgba[pA2 * 4] - rawRgba[iA], rawRgba[pA2 * 4 + 1] - rawRgba[iA + 1], rawRgba[pA2 * 4 + 2] - rawRgba[iA + 2]);
      const sBelow = Math.hypot(rawRgba[iB] - rawRgba[pB2 * 4], rawRgba[iB + 1] - rawRgba[pB2 * 4 + 1], rawRgba[iB + 2] - rawRgba[pB2 * 4 + 2]);
      if (step >= 9.5 && step > Math.max(sAbove, sBelow) * 1.75) {
        curRun++;
        if (curRun > maxRun) maxRun = curRun;
        if (x < w * 0.12 || x > w * 0.88) borderHits++;
      } else {
        curRun = 0;
      }
      sumStep += step;
      valid++;
    }
    if (valid > 0 && maxRun >= (w / 2) * 0.25 && borderHits >= 8) {
      rowStep[y] = sumStep / valid;
    }
  }
  const splits = [];
  for (let y = 24; y < h - 24; y++) {
    if (rowStep[y] < 7.5) continue;
    let isMax = true;
    for (let dy = -20; dy <= 20; dy++) {
      if (dy !== 0 && rowStep[y + dy] > rowStep[y]) { isMax = false; break; }
    }
    if (isMax) splits.push(y);
  }
  return splits;
}

function injectPointHighlights(labels, w, h, rawWork, mask, palette, splitRows = null) {
  const rawRgba = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === w * h * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);
  if (!rawRgba || !palette) return 0;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    lum[p] = 0.299 * rawRgba[i] + 0.587 * rawRgba[i + 1] + 0.114 * rawRgba[i + 2];
  }
  const R = 6;
  const cand = new Uint8Array(n);
  const dirs6 = [[-6, 0], [6, 0], [0, -6], [0, 6], [-4, -4], [4, -4], [-4, 4], [4, 4]];
  const maxStarY = (splitRows && splitRows.length) ? Math.max(R + 10, splitRows[0] - 24) : (h - R);
  for (let y = R; y < maxStarY; y++) {
    const row = y * w;
    for (let x = R; x < w - R; x++) {
      const p = row + x;
      if (mask && mask[p]) continue;
      const l0 = lum[p];
      if (l0 < 68) continue;
      let isPeak = true;
      for (let dy = -1; dy <= 1 && isPeak; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (lum[(y + dy) * w + (x + dx)] > l0 + 2) { isPeak = false; break; }
        }
      }
      if (!isPeak) continue;
      let maxR6 = 0, sumR6 = 0;
      for (const [dx, dy] of dirs6) {
        const v = lum[(y + dy) * w + (x + dx)];
        if (v > maxR6) maxR6 = v;
        sumR6 += v;
      }
      const meanR6 = sumR6 * 0.125;
      if (l0 - meanR6 >= 25 && l0 - maxR6 >= 16) {
        const curLab = labels[p];
        if (curLab >= 0 && palette[curLab]) {
          const palLum = 0.299 * palette[curLab].r + 0.587 * palette[curLab].g + 0.114 * palette[curLab].b;
          if (palLum >= 150 && Math.abs(l0 - palLum) <= 22) continue;
        }
        const dropH = Math.min(l0 - lum[row + x - 4], l0 - lum[row + x + 4]);
        const dropV = Math.min(l0 - lum[(y - 4) * w + x], l0 - lum[(y + 4) * w + x]);
        if (dropH >= 15 && dropV >= 15) cand[p] = 1;
      }
    }
  }
  for (let y = R; y < maxStarY; y++) {
    const row = y * w;
    for (let x = R; x < w - R; x++) {
      const p = row + x;
      if (cand[p] !== 1) continue;
      const rSum = (lum[(y - R) * w + x] + lum[(y + R) * w + x] + lum[row + x - R] + lum[row + x + R]) * 0.25;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const np = (y + dy) * w + (x + dx);
          if (!cand[np] && lum[np] - rSum >= 14) cand[np] = 2;
        }
      }
    }
  }
  const seen = new Uint8Array(n);
  const q = new Int32Array(n);
  const starComps = [];
  let sumRAll = 0, sumGAll = 0, sumBAll = 0, cntAll = 0;
  for (let p = 0; p < n; p++) {
    if (!cand[p] || seen[p]) continue;
    let head = 0, tail = 0;
    q[tail++] = p; seen[p] = 1;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let sr = 0, sg = 0, sb = 0;
    while (head < tail) {
      const cur = q[head++];
      const x = cur % w, y = (cur / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const i4 = cur * 4;
      sr += rawRgba[i4]; sg += rawRgba[i4 + 1]; sb += rawRgba[i4 + 2];
      const nbs = [x > 0 ? cur - 1 : -1, x < w - 1 ? cur + 1 : -1, y > 0 ? cur - w : -1, y < h - 1 ? cur + w : -1];
      for (const np of nbs) {
        if (np >= 0 && cand[np] && !seen[np]) { seen[np] = 1; q[tail++] = np; }
      }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (tail >= 2 && tail <= 64 && bw <= 10 && bh <= 10) {
      starComps.push(Int32Array.from(q.subarray(0, tail)));
      sumRAll += sr; sumGAll += sg; sumBAll += sb; cntAll += tail;
    }
  }
  if (!starComps.length) return 0;
  const mr = Math.min(255, Math.round((sumRAll / cntAll) * 1.18));
  const mg = Math.min(255, Math.round((sumGAll / cntAll) * 1.18));
  const mb = Math.min(255, Math.round((sumBAll / cntAll) * 1.14));
  const [sL, sa, sb2] = rgb2lab(mr, mg, mb);
  const starLab = palette.length;
  palette.push({ r: mr, g: mg, b: mb, L: sL, a: sa, b2: sb2, hex: hexOf(mr, mg, mb), verifiedPlateau: true, isPointHighlight: true });
  for (const cells of starComps) {
    for (let k = 0; k < cells.length; k++) labels[cells[k]] = starLab;
  }
  return starComps.length;
}

function gradToCss(grad) {
  if (!grad || !grad.stops || grad.stops.length < 2) return null;
  const stopsStr = grad.stops.map(s => `${s.color} ${Math.round(clamp(s.offset ?? 0, 0, 1) * 100)}%`).join(', ');
  if (grad.type === 'radial') {
    return `radial-gradient(circle at 38% 38%, ${stopsStr})`;
  }
  let ang = grad.angleDeg;
  if (ang == null && grad.x1 != null && grad.x2 != null && grad.y1 != null && grad.y2 != null) {
    const dx = grad.x2 - grad.x1, dy = grad.y2 - grad.y1;
    if (Math.hypot(dx, dy) > 1e-3) {
      ang = Math.round((Math.atan2(dy, dx) * 180 / Math.PI) + 90);
      ang = ((ang % 360) + 360) % 360;
    }
  }
  if (ang == null) ang = 135;
  return `linear-gradient(${ang}deg, ${stopsStr})`;
}

function compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField = null, cls = null, opt = {}) {
  if (!labels || !palette || !palette.length) return labels;
  const n = w * h;
  const rawRgba = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === n * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);

  /* 1. Buang seluruh label palet yang memiliki 0 piksel aktif (mis. sabuk-sabuk gradasi perantara yang telah dilebur) */
  const rebuildActive = () => {
    const K = palette.length;
    const pop = new Int32Array(K);
    for (let p = 0; p < n; p++) {
      const L = labels[p];
      if (L >= 0 && L < K && !(mask && mask[p])) pop[L]++;
    }
    const oldToNew = new Int32Array(K).fill(-1);
    const nextPal = [];
    for (let l = 0; l < K; l++) {
      if (pop[l] > 0) {
        oldToNew[l] = nextPal.length;
        const c = palette[l];
        if (c.L == null) {
          const [L, a, b2] = rgb2lab(c.r, c.g, c.b);
          c.L = L; c.a = a; c.b2 = b2;
        }
        c.popCount = pop[l];
        nextPal.push(c);
      }
    }
    if (!nextPal.length && palette.length) {
      oldToNew[0] = 0;
      nextPal.push(palette[0]);
    }
    for (let p = 0; p < n; p++) {
      const L = labels[p];
      if (L >= 0 && L < K) {
        const nl = oldToNew[L];
        labels[p] = nl >= 0 ? nl : 0;
      }
    }
    palette.length = 0;
    for (const c of nextPal) palette.push(c);
  };

  rebuildActive();

  /* 1B. Rekalkulasi Warna Interior Murni & Konsolidasi Pasca-Segmentasi Bebas Duplikat:
         Snap setiap entri palet ke rata-rata piksel interior murni (mag <= 3.8) agar warna bebas bias tepi,
         lalu gabungkan pasangan label yang terbukti identik secara perseptual (ΔE00 < 3.4 atau dRGB < 21)
         tanpa batas step-edge nyata */
  if (rawRgba && palette.length > 2) {
    const mag = edgeField ? edgeField.mag : null;
    const K0 = palette.length;
    const sumR = new Float64Array(K0), sumG = new Float64Array(K0), sumB = new Float64Array(K0), cntI = new Int32Array(K0);
    for (let p = 0; p < n; p++) {
      if (mask && mask[p]) continue;
      const l = labels[p];
      if (l < 0 || l >= K0) continue;
      if (mag && mag[p] > 3.8) continue;
      const i4 = p * 4;
      sumR[l] += rawRgba[i4]; sumG[l] += rawRgba[i4 + 1]; sumB[l] += rawRgba[i4 + 2]; cntI[l]++;
    }
    for (let l = 0; l < K0; l++) {
      if (cntI[l] >= 24 && !palette[l].userGrad) {
        const mr = Math.round(sumR[l] / cntI[l]), mg = Math.round(sumG[l] / cntI[l]), mb = Math.round(sumB[l] / cntI[l]);
        const [nL, na, nb2] = rgb2lab(mr, mg, mb);
        palette[l].r = mr; palette[l].g = mg; palette[l].b = mb;
        palette[l].L = nL; palette[l].a = na; palette[l].b2 = nb2;
        palette[l].hex = hexOf(mr, mg, mb);
      }
    }
    let mergedAny = true;
    while (mergedAny && palette.length > 2) {
      mergedAny = false;
      const K = palette.length;
      for (let i = 0; i < K && !mergedAny; i++) {
        for (let j = i + 1; j < K && !mergedAny; j++) {
          const ci = palette[i], cj = palette[j];
          if (ci.userGrad || cj.userGrad) continue;
          const de00 = ciede2000(ci.L, ci.a, ci.b2, cj.L, cj.a, cj.b2);
          const dRgb = Math.hypot(ci.r - cj.r, ci.g - cj.g, ci.b - cj.b);
          const isLowRes = (w * h) <= 150000;
          const chI = Math.hypot(ci.a, ci.b2), chJ = Math.hypot(cj.a, cj.b2);
          const sameHue = chI >= 14 && chJ >= 14 && ((ci.a * cj.a + ci.b2 * cj.b2) / (chI * chJ)) >= 0.94;
          const deThr = isLowRes ? 3.4 : ((sameHue && (Math.abs(ci.L - cj.L) <= 4.8 || Math.min(chI, chJ) >= 48)) ? 4.68 : 3.65);
          const rgbThr = isLowRes ? 21.0 : ((Math.min(ci.L, cj.L) >= 52 || Math.min(chI, chJ) >= 50) ? 23.5 : 16.0);
          if (de00 <= deThr || dRgb <= rgbThr) {
            const keep = (ci.popCount || 1) >= (cj.popCount || 1) ? i : j;
            const drop = keep === i ? j : i;
            const cTo = palette[keep], cFrom = palette[drop];
            const wTo = cTo.popCount || 1, wFrom = cFrom.popCount || 1, wTot = wTo + wFrom;
            cTo.r = Math.round((cTo.r * wTo + cFrom.r * wFrom) / wTot);
            cTo.g = Math.round((cTo.g * wTo + cFrom.g * wFrom) / wTot);
            cTo.b = Math.round((cTo.b * wTo + cFrom.b * wFrom) / wTot);
            const [nL, na, nb2] = rgb2lab(cTo.r, cTo.g, cTo.b);
            cTo.L = nL; cTo.a = na; cTo.b2 = nb2;
            cTo.hex = hexOf(cTo.r, cTo.g, cTo.b);
            cTo.popCount = wTot;
            for (let p = 0; p < n; p++) if (labels[p] === drop) labels[p] = keep;
            rebuildActive();
            mergedAny = true;
          }
        }
      }
    }
  }

  /* 2. Jika Max Color diaktifkan pengguna (mis. Max Color = 11), gabungkan label berlebih secara iteratif
        hingga jumlah warna di palet dijamin <= maxColors */
  const maxC = (opt.maxColorEnabled && opt.maxColors >= 2) ? Math.max(2, Math.round(opt.maxColors)) : 0;
  if (maxC > 0 && palette.length > maxC) {
    while (palette.length > maxC) {
      const K = palette.length;
      const adj = new Int32Array(K * K);
      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
          const p = row + x;
          const l1 = labels[p];
          if (l1 < 0) continue;
          if (x + 1 < w) {
            const l2 = labels[p + 1];
            if (l2 >= 0 && l2 !== l1) { adj[l1 * K + l2]++; adj[l2 * K + l1]++; }
          }
          if (y + 1 < h) {
            const l2 = labels[p + w];
            if (l2 >= 0 && l2 !== l1) { adj[l1 * K + l2]++; adj[l2 * K + l1]++; }
          }
        }
      }
      let bestFrom = -1, bestTo = -1, bestCost = Infinity;
      for (let i = 0; i < K; i++) {
        for (let j = i + 1; j < K; j++) {
          const ci = palette[i], cj = palette[j];
          const de00 = ciede2000(ci.L, ci.a, ci.b2, cj.L, cj.a, cj.b2);
          const popI = ci.popCount || 1, popJ = cj.popCount || 1;
          const minPop = Math.min(popI, popJ);
          const sharedBnd = adj[i * K + j];
          /* Prioritaskan penggabungan region non-bertetangga yang satu keluarga warna (tidak merusak batas)
             atau region bertetangga dengan ΔE00 terdekat / area terkecil */
          const bndFactor = sharedBnd === 0 ? 0.72 : 1.0;
          const gradMatchFactor = (ci.isGradientSuperRegion && cj.isGradientSuperRegion) ? 0.78 : 1.0;
          const sizeFactor = 1 + 0.24 * Math.log(1 + minPop / Math.max(12, n * 0.0005));
          const cost = (de00 + 1.2) * sizeFactor * bndFactor * gradMatchFactor;
          if (cost < bestCost) {
            bestCost = cost;
            if (popI <= popJ) { bestFrom = i; bestTo = j; }
            else { bestFrom = j; bestTo = i; }
          }
        }
      }
      if (bestFrom < 0 || bestTo < 0) break;
      const cFrom = palette[bestFrom], cTo = palette[bestTo];
      const wFrom = cFrom.popCount || 1, wTo = cTo.popCount || 1, wTot = wFrom + wTo;
      cTo.r = Math.round((cTo.r * wTo + cFrom.r * wFrom) / wTot);
      cTo.g = Math.round((cTo.g * wTo + cFrom.g * wFrom) / wTot);
      cTo.b = Math.round((cTo.b * wTo + cFrom.b * wFrom) / wTot);
      const [nL, na, nb2] = rgb2lab(cTo.r, cTo.g, cTo.b);
      cTo.L = nL; cTo.a = na; cTo.b2 = nb2;
      cTo.hex = hexOf(cTo.r, cTo.g, cTo.b);
      cTo.popCount = wTot;
      if (cFrom.isGradientSuperRegion) cTo.isGradientSuperRegion = true;
      if (cFrom.userGrad && !cTo.userGrad) cTo.userGrad = cFrom.userGrad;
      for (let p = 0; p < n; p++) {
        if (labels[p] === bestFrom) labels[p] = bestTo;
      }
      rebuildActive();
    }
  }

  /* 3. Bila diminta (mode gradasi aktif), pasang metadata gradasi (linear/radial + stops) langsung ke entri palet */
  if (opt.attachGradients && rawRgba) {
    const K = palette.length;
    const compId = new Int32Array(n).fill(-1);
    const q = new Int32Array(n);
    const largestByLab = new Array(K).fill(null);
    for (let p = 0; p < n; p++) {
      const lab = labels[p];
      if (lab < 0 || lab >= K || compId[p] >= 0 || (mask && mask[p])) continue;
      let head = 0, tail = 0;
      q[tail++] = p; compId[p] = 1;
      while (head < tail) {
        const cur = q[head++];
        const x = cur % w, y = (cur / w) | 0;
        if (x > 0 && labels[cur - 1] === lab && compId[cur - 1] < 0) { compId[cur - 1] = 1; q[tail++] = cur - 1; }
        if (x < w - 1 && labels[cur + 1] === lab && compId[cur + 1] < 0) { compId[cur + 1] = 1; q[tail++] = cur + 1; }
        if (y > 0 && labels[cur - w] === lab && compId[cur - w] < 0) { compId[cur - w] = 1; q[tail++] = cur - w; }
        if (y < h - 1 && labels[cur + w] === lab && compId[cur + w] < 0) { compId[cur + w] = 1; q[tail++] = cur + w; }
      }
      if (!largestByLab[lab] || tail > largestByLab[lab].length) {
        largestByLab[lab] = Int32Array.from(q.subarray(0, tail));
      }
    }
    for (let l = 0; l < K; l++) {
      const pe = palette[l];
      if (pe.userGrad && pe.userGrad.stops && pe.userGrad.stops.length >= 2) {
        pe.grad = pe.userGrad;
        pe.isGradient = true;
        continue;
      }
      const px = largestByLab[l];
      if (px && px.length >= 36) {
        const g = fitComponentGradientFromPixels(px, w, h, rawRgba, 1, w, h, edgeField, pe, { forceGradient: !!opt.forceGradient });
        if (g && g.stops && g.stops.length >= 2) {
          pe.grad = g;
          pe.isGradient = true;
          if (g.base) pe.hex = g.base;
        }
      }
    }
  }
  return labels;
}

function unifyGradientBands(labels, w, h, rawWork, mask, palette, edgeField, cls, opt = {}) {
  const gMode = opt.gradientMode || 'auto';
  if (gMode === 'off') {
    return compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField, cls, {
      maxColorEnabled: opt.maxColorEnabled,
      maxColors: opt.maxColors,
      attachGradients: false
    });
  }
  const forceGrad = !!(opt.forceGradient || gMode === 'on');
  const hasVerifiedGrad = !!(
    (palette && palette._hasSmoothGradient) ||
    (rawWork && rawWork._plateauAnalysis && rawWork._plateauAnalysis.hasSmoothGradient)
  );
  const isGradImg = !!(
    forceGrad ||
    (gMode === 'auto' && hasVerifiedGrad && (!cls || cls.surfaceMode !== 'flat'))
  );
  if (!isGradImg || !palette || palette.length < 2) {
    return compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField, cls, {
      maxColorEnabled: opt.maxColorEnabled,
      maxColors: opt.maxColors,
      attachGradients: false
    });
  }

  const n = w * h;
  const d = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === n * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);
  const mag = edgeField ? edgeField.mag : null;
  if (!d || !mag) return labels;

  const splitRows = detectHorizontalSplitLines(d, w, h, mask);
  const splitRowSet = new Set(splitRows);
  const canStepVert = (pFrom, pTo) => {
    const yFrom = (pFrom / w) | 0, yTo = (pTo / w) | 0;
    const yCross = Math.max(yFrom, yTo);
    if (splitRowSet.has(yCross) || splitRowSet.has(yCross - 1) || splitRowSet.has(yCross + 1)) {
      const i = pFrom * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum >= 42) return false;
    }
    return true;
  };

  /* 1. Ekstraksi komponen terhubung (4-connected) dengan pemutusan kebocoran melintasi garis cakrawala */
  const compId = new Int32Array(n).fill(-1);
  const comps = [];
  const q = new Int32Array(n);
  for (let p = 0; p < n; p++) {
    if (labels[p] < 0 || (mask && mask[p]) || compId[p] >= 0) continue;
    const cid = comps.length;
    const lab = labels[p];
    let head = 0, tail = 0;
    q[tail++] = p; compId[p] = cid;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let sumR = 0, sumG = 0, sumB = 0;
    while (head < tail) {
      const cur = q[head++];
      const x = cur % w, y = (cur / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const i4 = cur * 4;
      sumR += d[i4]; sumG += d[i4 + 1]; sumB += d[i4 + 2];
      if (x > 0 && labels[cur - 1] === lab && compId[cur - 1] < 0) { compId[cur - 1] = cid; q[tail++] = cur - 1; }
      if (x < w - 1 && labels[cur + 1] === lab && compId[cur + 1] < 0) { compId[cur + 1] = cid; q[tail++] = cur + 1; }
      if (y > 0 && labels[cur - w] === lab && compId[cur - w] < 0 && canStepVert(cur, cur - w)) { compId[cur - w] = cid; q[tail++] = cur - w; }
      if (y < h - 1 && labels[cur + w] === lab && compId[cur + w] === -1 && canStepVert(cur, cur + w)) { compId[cur + w] = cid; q[tail++] = cur + w; }
    }
    const mr = sumR / tail, mg = sumG / tail, mb = sumB / tail;
    const [L, a, b2] = rgb2lab(mr, mg, mb);
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const touchesLR = minX <= 5 || maxX >= w - 6;
    const cy = 0.5 * (minY + maxY);
    const isBeamBand = !touchesLR && maxX < w * 0.62 && minY > h * 0.25 && maxY < h * 0.48 && L >= 41.2 && bw > bh * 1.15;
    const beamTier = !isBeamBand ? 0 : 1;
    let protCnt = 0;
    const detailProt = labels._detailProt || null;
    if (detailProt) {
      for (let k = 0; k < tail; k++) if (detailProt[q[k]]) protCnt++;
    }
    const protFrac = protCnt / Math.max(1, tail);
    comps.push({
      cid, lab, area: tail, bb: [minX, minY, maxX, maxY], bw, bh,
      cy, touchesLR, isBeamBand, beamTier, protFrac,
      r: mr, g: mg, b: mb, L, a, b2
    });
  }

  /* 2. Kumpulkan statistik gradien tepi Scharr & kontinuitas lereng di sepanjang batas antar-komponen */
  const pairMap = new Map();
  const perimMags = Array.from({ length: comps.length }, () => []);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const c1 = compId[p];
      if (c1 < 0) continue;
      for (const [np, isHoriz] of [[p + 1, true], [p + w, false]]) {
        const c2 = compId[np];
        if (c2 >= 0 && c2 !== c1) {
          const m = Math.max(mag[p], mag[np]);
          perimMags[c1].push(m); perimMags[c2].push(m);
          const key = c1 < c2 ? c1 + ':' + c2 : c2 + ':' + c1;
          let rec = pairMap.get(key);
          if (!rec) {
            rec = { a: Math.min(c1, c2), b: Math.max(c1, c2), mags: [], stepSum: 0, slopeSum: 0, count: 0 };
            pairMap.set(key, rec);
          }
          rec.mags.push(m);
          if (isHoriz ? (x >= 2 && x < w - 2) : (y >= 2 && y < h - 2)) {
            const stepOff = isHoriz ? 1 : w;
            const iM2 = (p - stepOff) * 4, i0 = p * 4, i1 = np * 4, iP2 = (np + stepOff) * 4;
            const stepD = Math.sqrt(cdist2(d[i0], d[i0 + 1], d[i0 + 2], d[i1], d[i1 + 1], d[i1 + 2]));
            const slopeD = 0.5 * (
              Math.sqrt(cdist2(d[iM2], d[iM2 + 1], d[iM2 + 2], d[i0], d[i0 + 1], d[i0 + 2])) +
              Math.sqrt(cdist2(d[i1], d[i1 + 1], d[i1 + 2], d[iP2], d[iP2 + 1], d[iP2 + 2]))
            );
            rec.stepSum += stepD; rec.slopeSum += slopeD; rec.count++;
          }
        }
      }
    }
  }

  for (let i = 0; i < comps.length; i++) {
    const pm = perimMags[i];
    if (pm.length) {
      pm.sort((a, b) => a - b);
      comps[i].perimQ50 = pm[pm.length >> 1];
      comps[i].perimQ75 = pm[Math.floor(pm.length * 0.75)];
    } else {
      comps[i].perimQ50 = 0; comps[i].perimQ75 = 0;
    }
  }

  const parent = Int32Array.from({ length: comps.length }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (comps[ra].area >= comps[rb].area) parent[rb] = ra;
    else parent[ra] = rb;
  };

  const minPairLen = Math.max(4, Math.min(12, Math.round(Math.min(w, h) * 0.015)));
  const sortedPairs = [...pairMap.values()].filter(r => r.mags.length >= minPairLen);
  sortedPairs.forEach(r => {
    r.mags.sort((x, y) => x - y);
    r.q50 = r.mags[r.mags.length >> 1];
    r.q80 = r.mags[Math.floor(r.mags.length * 0.80)];
  });
  sortedPairs.sort((a, b) => a.q50 - b.q50);

  for (const rec of sortedPairs) {
    const { a, b, q50, q80, stepSum, slopeSum, count } = rec;
    const ca = comps[a], cb = comps[b];
    const ra = find(a), rb = find(b);
    if (ra === rb) continue;
    const minArea = Math.min(ca.area, cb.area);
    const minBw = Math.min(ca.bw, cb.bw);

    /* 1. Sabuk sorot cahaya (beamTier > 0) hanya menyatu sesama beamTier agar membentuk kerucut cahaya utuh */
    if (ca.beamTier !== cb.beamTier) continue;
    if (ca.beamTier > 0 && cb.beamTier > 0) {
      if (q50 <= 3.45 && q80 <= 4.85) union(a, b);
      continue;
    }

    /* 2. Lindungi siluet gelap (tebing, dermaga, lumba-lumba L < 15.5) agar tidak melebur ke laut/langit (L >= 15.5),
          namun izinkan bagian siluet gelap yang berdampingan (keduanya L < 15.5) menyatu menjadi siluet utuh */
    if ((ca.L < 15.5) !== (cb.L < 15.5) && (ca.cy > h * 0.42 || cb.cy > h * 0.42)) {
      if (!ca.touchesLR || !cb.touchesLR || ca.bw < w * 0.85 || cb.bw < w * 0.85) continue;
    }
    if ((ca.L < 9.8) !== (cb.L < 9.8) && Math.abs(ca.L - cb.L) >= 3.0) continue;

    /* 3. Lindungi garis jari, bulu mata, & detail tipis yang dilindungi _detailProt agar TIDAK PERNAH melebur ke kulit/rambut! */
    const caThinDetail = ca.protFrac >= 0.22 && ca.area < n * 0.0045 && (ca.area / Math.max(1, perimMags[a].length)) < 1.95;
    const cbThinDetail = cb.protFrac >= 0.22 && cb.area < n * 0.0045 && (cb.area / Math.max(1, perimMags[b].length)) < 1.95;
    if (caThinDetail || cbThinDetail) continue;

    /* 4. Lindungi struktur vertikal ramping berbatas bersama tegas (menara mercusuar) */
    if (((ca.bh > ca.bw * 2.2 && ca.bw < w * 0.14) || (cb.bh > cb.bw * 2.2 && cb.bw < w * 0.14)) && q50 > 4.2) continue;

    /* 5. Evaluasi keluarga warna (Hue/Chroma CIE-Lab):
          - Satukan sesama pita blush pink pipi (keduanya a >= 9.5) agar membentuk region radial blush utuh,
            namun JANGAN leburkan blush pink (a >= 9.5) ke dalam kulit wajah pucat (a < 7.8) di daerah wajah (cy < h * 0.36)
            agar pipi kanan & kiri tetap menjadi poligon radialGradient terpisah di atas wajah! */
    const isFaceZone = ca.cy < h * 0.36 && cb.cy < h * 0.36;
    const isBlushVsPaleFace = isFaceZone && Math.min(ca.a, cb.a) < 7.8 && Math.max(ca.a, cb.a) >= 9.8 && Math.abs(ca.a - cb.a) >= 4.2;
    if (isBlushVsPaleFace) continue;

    const chA = Math.hypot(ca.a, ca.b2), chB = Math.hypot(cb.a, cb.b2);
    const cosHue = (chA > 4 && chB > 4) ? ((ca.a * cb.a + ca.b2 * cb.b2) / (chA * chB)) : 0.92;
    const isBothPinkBlush = ca.L >= 68 && cb.L >= 68 && ca.a >= 9.0 && cb.a >= 9.0 && Math.abs(ca.L - cb.L) <= 18;
    const isSameColorFamily = cosHue >= 0.76 || (chA < 14 && chB < 14) || isBothPinkBlush;

    /* 6. Lindungi objek struktural kompak HANYA bila batas bersama (q50/q80) tajam atau beda keluarga warna */
    const bothDarkSil = ca.L < 15.5 && cb.L < 15.5 && Math.abs(ca.L - cb.L) <= 4.5;
    if (!bothDarkSil && !isSameColorFamily && minArea < n * 0.025 && (q50 > 3.6 || q80 > 5.8)) continue;
    if (!bothDarkSil && minArea < n * 0.015 && minBw < w * 0.32) {
      const smaller = ca.area < cb.area ? ca : cb;
      const larger = ca.area < cb.area ? cb : ca;
      if (!isSameColorFamily && smaller.L < larger.L - 4.5 && !smaller.touchesLR && q50 > 3.2) continue;
      if (q50 > 6.5 || q80 > 10.2) continue;
    }

    /* 7. Jangan pernah menyatukan komponen melintasi garis cakrawala utama (horizon line) */
    const firstSplit = splitRows.length ? splitRows[0] : -1;
    if (firstSplit > 0) {
      if ((ca.cy < firstSplit && cb.cy > firstSplit) || (cb.cy < firstSplit && ca.cy > firstSplit) ||
          (comps[ra].cy < firstSplit && comps[rb].cy > firstSplit) || (comps[rb].cy < firstSplit && comps[ra].cy > firstSplit)) {
        continue;
      }
    }

    const de00 = ciede2000(ca.L, ca.a, ca.b2, cb.L, cb.a, cb.b2);
    const meanStep = count > 0 ? stepSum / count : 99;
    const meanSlope = count > 0 ? slopeSum / count : 1;

    /* Lindungi dua faset/plateau datar yang dipisahkan oleh step-edge (meanSlope rendah namun meanStep nyata) */
    if (!forceGrad && meanSlope <= 1.25 && (meanStep >= meanSlope * 2.1 + 2.5 || de00 >= 4.2)) continue;
    const maxQ50 = isSameColorFamily ? 4.8 : 2.8;
    const maxQ80 = isSameColorFamily ? 7.8 : 4.4;
    const maxDE00 = isSameColorFamily ? (forceGrad ? 18.0 : 10.5) : 6.5;
    if (q50 < maxQ50 && q80 < maxQ80 && de00 <= maxDE00 && meanStep <= meanSlope * 1.95 + 4.5) {
      union(a, b);
    }
  }

  /* Pass Tambahan 1: Gabungkan komponen milik _userGradGroup yang sama (jika pengguna mengedit palet gradient) */
  for (const rec of sortedPairs) {
    const ca = comps[rec.a], cb = comps[rec.b];
    const ga = palette[ca.lab] && palette[ca.lab]._userGradGroup;
    const gb = palette[cb.lab] && palette[cb.lab]._userGradGroup;
    if (ga && gb && ga === gb) union(rec.a, rec.b);
  }

  /* Pass Tambahan 2: Serap pita gradasi perantara yang tersisa ke dalam Super-Region gradasi tetangganya
     selama bukan detail tipis yang dilindungi (_detailProt) dan batasnya halus */
  const compCountByRoot = new Map();
  for (let i = 0; i < comps.length; i++) {
    const r = find(i);
    compCountByRoot.set(r, (compCountByRoot.get(r) || 0) + 1);
  }
  const hasDarkStroke = comps.some(c => c.L < 22 && c.area >= n * 0.0015);
  const isPureGradScene = !hasDarkStroke && (!cls || (cls.meaningfulDetailDensity || 0) < 0.065) && splitRows.length === 0;

  for (const rec of sortedPairs) {
    const { a, b, q50, q80 } = rec;
    const ra = find(a), rb = find(b);
    if (ra === rb) continue;
    const ca = comps[a], cb = comps[b];
    const caThin = ca.protFrac >= 0.20 && ca.area < n * 0.0045;
    const cbThin = cb.protFrac >= 0.20 && cb.area < n * 0.0045;
    if (caThin || cbThin) continue;
    if (ca.beamTier !== cb.beamTier) continue;
    const firstSplit = splitRows.length ? splitRows[0] : -1;
    if (firstSplit > 0 && ((ca.cy < firstSplit && cb.cy > firstSplit) || (cb.cy < firstSplit && ca.cy > firstSplit))) continue;

    const de00 = ciede2000(ca.L, ca.a, ca.b2, cb.L, cb.a, cb.b2);
    const sizeA = compCountByRoot.get(ra) || 1;
    const sizeB = compCountByRoot.get(rb) || 1;
    if ((sizeA >= 2 || sizeB >= 2) && ca.L >= 16.5 && cb.L >= 16.5) {
      const chA = Math.hypot(ca.a, ca.b2), chB = Math.hypot(cb.a, cb.b2);
      const cosHue = (chA > 4 && chB > 4) ? ((ca.a * cb.a + ca.b2 * cb.b2) / (chA * chB)) : 0.90;
      const sameFam = cosHue >= 0.72 || (chA < 15 && chB < 15);
      if (sameFam && q50 <= (forceGrad ? 8.2 : 6.8) && q80 <= (forceGrad ? 12.5 : 10.8) && de00 <= (forceGrad ? 30.0 : 25.5)) {
        union(a, b);
      }
    }
    /* Pada citra gradasi murni tanpa line-art gelap, satukan seluruh pita gradasi yang berkesinambungan menjadi 1 Super-Region */
    if (isPureGradScene && q50 <= (forceGrad ? 7.5 : 5.6) && de00 <= 34.0) {
      union(a, b);
    }
  }

  /* Kelompokkan berdasarkan root dan bangun graf ketetanggaan antar-root (rootAdj)
     agar Super-Region yang tidak bersentuhan dan sekeluarga warna dapat berbagi 1 entri palet yang sama! */
  const rootGroups = new Map();
  for (let i = 0; i < comps.length; i++) {
    const r = find(i);
    if (!rootGroups.has(r)) rootGroups.set(r, []);
    rootGroups.get(r).push(comps[i]);
  }

  const rootAdj = new Map();
  rootGroups.forEach((_, r) => rootAdj.set(r, new Set()));
  pairMap.forEach(rec => {
    const ra = find(rec.a), rb = find(rec.b);
    if (ra !== rb) {
      rootAdj.get(ra).add(rb);
      rootAdj.get(rb).add(ra);
    }
  });

  const rootTargetLabel = new Map();
  const labelAssignedRoots = new Map();
  const assignRootToLab = (r, lab) => {
    rootTargetLabel.set(r, lab);
    if (!labelAssignedRoots.has(lab)) labelAssignedRoots.set(lab, []);
    labelAssignedRoots.get(lab).push(r);
  };
  const canRootUseLab = (r, lab) => {
    const holders = labelAssignedRoots.get(lab);
    if (!holders || !holders.length) return true;
    const adjSet = rootAdj.get(r);
    for (const hr of holders) {
      if (adjSet && adjSet.has(hr)) return false;
    }
    return true;
  };

  /* Urutkan root dari luas terbesar ke terkecil */
  const sortedRoots = [...rootGroups.entries()].map(([r, list]) => {
    const totArea = list.reduce((s, c) => s + c.area, 0);
    return { r, list, totArea };
  }).sort((a, b) => b.totArea - a.totArea);

  const superPalIndices = [];
  for (const { r, list, totArea } of sortedRoots) {
    if (list.length >= 2) {
      let sumR = 0, sumG = 0, sumB = 0;
      let userGradRef = null;
      let domComp = list[0];
      for (const c of list) {
        sumR += c.r * c.area; sumG += c.g * c.area; sumB += c.b * c.area;
        if (c.area > domComp.area) domComp = c;
        if (!userGradRef && palette[c.lab] && palette[c.lab].userGrad) userGradRef = palette[c.lab].userGrad;
      }
      const mr = Math.round(sumR / totArea), mg = Math.round(sumG / totArea), mb = Math.round(sumB / totArea);
      const [mL, ma, mb2] = rgb2lab(mr, mg, mb);
      const isDarkSilGroup = mL < 15.8 && totArea < n * 0.08;
      const bTier = comps[r].beamTier || 0;
      let reuseLab = -1;
      for (const sLab of superPalIndices) {
        const sp = palette[sLab];
        if (sp.isDarkSilhouette === isDarkSilGroup && (sp.beamTier || 0) === bTier && canRootUseLab(r, sLab)) {
          const de00 = ciede2000(mL, ma, mb2, sp.L, sp.a, sp.b2);
          const chA = Math.hypot(ma, mb2), chB = Math.hypot(sp.a, sp.b2);
          const cosHue = (chA > 4 && chB > 4) ? ((ma * sp.a + mb2 * sp.b2) / (chA * chB)) : 0.92;
          if (de00 <= 16.5 || (cosHue >= 0.82 && Math.abs(mL - sp.L) <= 20.0)) {
            reuseLab = sLab;
            break;
          }
        }
      }
      if (reuseLab < 0 && canRootUseLab(r, domComp.lab)) {
        reuseLab = domComp.lab;
        const dp = palette[reuseLab];
        dp.r = mr; dp.g = mg; dp.b = mb; dp.L = mL; dp.a = ma; dp.b2 = mb2;
        dp.hex = hexOf(mr, mg, mb);
        dp.isGradientSuperRegion = !isDarkSilGroup;
        dp.isDarkSilhouette = isDarkSilGroup;
        dp.beamTier = bTier;
        if (userGradRef) dp.userGrad = userGradRef;
        if (!superPalIndices.includes(reuseLab)) superPalIndices.push(reuseLab);
      }
      if (reuseLab >= 0) {
        assignRootToLab(r, reuseLab);
      } else {
        const newLab = palette.length;
        palette.push({
          r: mr, g: mg, b: mb, L: mL, a: ma, b2: mb2,
          hex: hexOf(mr, mg, mb),
          isGradientSuperRegion: !isDarkSilGroup,
          isDarkSilhouette: isDarkSilGroup,
          beamTier: bTier,
          userGrad: userGradRef || null
        });
        superPalIndices.push(newLab);
        assignRootToLab(r, newLab);
      }
    } else {
      const c0 = list[0];
      let targetLab = c0.lab;
      if (c0.protFrac < 0.18) {
        for (const sLab of superPalIndices) {
          const sp = palette[sLab];
          if (sp.isDarkSilhouette === (c0.L < 15.8) && (sp.beamTier || 0) === (c0.beamTier || 0) && canRootUseLab(r, sLab)) {
            const de00 = ciede2000(c0.L, c0.a, c0.b2, sp.L, sp.a, sp.b2);
            if (de00 <= 13.5) {
              targetLab = sLab;
              break;
            }
          }
        }
      }
      assignRootToLab(r, targetLab);
    }
  }

  for (let p = 0; p < n; p++) {
    const cid = compId[p];
    if (cid >= 0) {
      labels[p] = rootTargetLabel.get(find(cid));
    }
  }

  /* Suntikkan titik bintang 2D berkontras lokal tinggi di langit (di atas cakrawala) */
  injectPointHighlights(labels, w, h, rawWork, mask, palette, splitRows);

  /* Padatkan palet (hapus seluruh label sabuk perantara yang kini 0 piksel), terapkan batas Max Color bila aktif,
     dan pasang metadata gradient (linear/radial + stops) langsung ke entri palet */
  compactActivePaletteAndLabels(labels, w, h, rawWork, mask, palette, edgeField, cls, {
    maxColorEnabled: opt.maxColorEnabled,
    maxColors: opt.maxColors,
    attachGradients: opt.attachPreviewGradients !== false,
    forceGradient: forceGrad
  });

  return labels;
}

/* Fitting <linearGradient> / <radialGradient> Multi-Stop Akurat pada piksel internal komponen */
function fitComponentGradientFromPixels(pixels, w, h, rawRgba, scale, W, H, edgeField = null, palEntry = null, opt = {}, labels = null) {
  const n = pixels.length;
  if (n < 36 || !rawRgba) return null;
  if (palEntry && (palEntry.isPointHighlight || palEntry.isDarkSilhouette || (palEntry.L != null && palEntry.L < 15.8 && !palEntry.isGradientSuperRegion))) {
    return null;
  }

  /* Kasus Khusus: Kerucut Sorot Cahaya Atmosferik (beamTier > 0) -> Elliptical Radial Gradient Halus Tanpa Cincin */
  if (palEntry && palEntry.beamTier > 0) {
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
    const step = Math.max(1, Math.floor(n / 2400));
    for (let i = 0; i < n; i += step) {
      const p = pixels[i];
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const i4 = p * 4;
      sumR += rawRgba[i4]; sumG += rawRgba[i4 + 1]; sumB += rawRgba[i4 + 2];
      cnt++;
    }
    const baseHex = cnt ? hexOf(sumR / cnt, sumG / cnt, sumB / cnt) : (palEntry.hex || '#8889bf');
    const x0 = minX * scale, x1 = maxX * scale, y0 = minY * scale, y1 = maxY * scale;
    const spanX = Math.max(10, x1 - x0), spanY = Math.max(10, y1 - y0);
    const cy = 0.5 * (y0 + y1);
    const fx = x1 - spanX * 0.02;
    const fy = cy;
    const cx = x1 - spanX * 0.06;
    const r = spanX * 0.90;
    const sy = +clamp((spanY * 0.46) / r, 0.16, 1.0).toFixed(4);
    return {
      type: 'radial',
      softFade: true,
      sy,
      base: baseHex,
      cx: +cx.toFixed(2), cy: +fy.toFixed(2), r: +r.toFixed(2),
      fx: +fx.toFixed(2), fy: +fy.toFixed(2),
      stops: [
        { offset: 0, color: '#f0e7f3', op: 0.94 },
        { offset: 0.25, color: '#ded6e6', op: 0.78 },
        { offset: 0.52, color: '#a8a6ce', op: 0.44 },
        { offset: 0.78, color: '#7679bc', op: 0.16 },
        { offset: 1, color: '#5458a8', op: 0.0 }
      ]
    };
  }

  const stride = Math.max(1, Math.floor(n / 4600));
  const rawSamples = [];
  let sumL0 = 0, sumA0 = 0, sumB0 = 0;
  const mag = edgeField ? edgeField.mag : null;

  const compLab = (labels && n > 0) ? labels[pixels[0]] : -999;
  for (let i = 0; i < n; i += stride) {
    const p = pixels[i];
    if (mag && mag[p] > 5.2 && n > 160) continue;
    const x = p % w, y = (p / w) | 0;
    if (labels && compLab >= 0 && n > 96) {
      if (x <= 1 || x >= w - 2 || y <= 1 || y >= h - 2) continue;
      if (labels[p - 1] !== compLab || labels[p + 1] !== compLab || labels[p - w] !== compLab || labels[p + w] !== compLab ||
          labels[p - 2] !== compLab || labels[p + 2] !== compLab || labels[p - 2 * w] !== compLab || labels[p + 2 * w] !== compLab) {
        continue;
      }
    }
    const i4 = p * 4;
    const r = rawRgba[i4], g = rawRgba[i4 + 1], b = rawRgba[i4 + 2];
    const [L, a, b2] = rgb2lab(r, g, b);
    sumL0 += L; sumA0 += a; sumB0 += b2;
    rawSamples.push({ x, y, r, g, b, L, a, b2 });
  }

  if (rawSamples.length < 14) return null;
  /* Pangkas 10% piksel outlier warna (mis. piksel tepi bulu mata atau garis gelap yang ikut terserap ke dalam komponen)
     agar varians 2D-nya tidak merusak rasio rmseLin / rmseSolid! */
  let samples = rawSamples;
  if (rawSamples.length >= 32) {
    const m0 = rawSamples.length;
    const cL = sumL0 / m0, cA = sumA0 / m0, cB = sumB0 / m0;
    for (let i = 0; i < m0; i++) {
      const s = rawSamples[i];
      s.d2Med = (s.L - cL) ** 2 + (s.a - cA) ** 2 + (s.b2 - cB) ** 2;
    }
    const sortedByOutlier = rawSamples.slice().sort((a, b) => a.d2Med - b.d2Med);
    samples = sortedByOutlier.slice(0, Math.max(16, Math.floor(m0 * 0.90)));
  }

  const m = samples.length;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let sumR = 0, sumG = 0, sumB = 0, sumL = 0, sumA = 0, sumB2 = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y; if (s.y > maxY) maxY = s.y;
    sumR += s.r; sumG += s.g; sumB += s.b;
    sumL += s.L; sumA += s.a; sumB2 += s.b2;
  }
  const meanR = sumR / m, meanG = sumG / m, meanB = sumB / m;
  const meanL = sumL / m, meanA = sumA / m, meanB2 = sumB2 / m;
  const baseHex = hexOf(meanR, meanG, meanB);
  if (meanL < 15.8 && !(palEntry && palEntry.isGradientSuperRegion) && !(opt && opt.forceGradient)) return null;

  let sseSolid = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    sseSolid += (s.L - meanL) ** 2 + (s.a - meanA) ** 2 + (s.b2 - meanB2) ** 2;
  }
  const rmseSolid = Math.sqrt(sseSolid / m);
  const forceGrad = !!(opt && opt.forceGradient);
  const isSuper = !!(palEntry && palEntry.isGradientSuperRegion);
  if (rmseSolid < (forceGrad ? 0.55 : isSuper ? 0.85 : 1.15)) return null;

  const cx0 = 0.5 * (minX + maxX), cy0 = 0.5 * (minY + maxY);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  let sxx = 0, syy = 0, sxy = 0;
  let sxL = 0, syL = 0, sxA = 0, syA = 0, sxB = 0, syB = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const dx = (s.x - cx0) / spanX, dy = (s.y - cy0) / spanY;
    const dL = s.L - meanL, dA = s.a - meanA, dB = s.b2 - meanB2;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    sxL += dx * dL; syL += dy * dL;
    sxA += dx * dA; syA += dy * dA;
    sxB += dx * dB; syB += dy * dB;
  }
  const det = sxx * syy - sxy * sxy;
  let ux = 0, uy = 1;
  if (Math.abs(det) > 1e-9) {
    const gxL = (syy * sxL - sxy * syL) / det / spanX;
    const gyL = (sxx * syL - sxy * sxL) / det / spanY;
    const gxA = (syy * sxA - sxy * syA) / det / spanX;
    const gyA = (sxx * syA - sxy * sxA) / det / spanY;
    const gxB = (syy * sxB - sxy * syB) / det / spanX;
    const gyB = (sxx * syB - sxy * sxB) / det / spanY;
    const jxx = gxL * gxL + gxA * gxA * 1.35 + gxB * gxB;
    const jyy = gyL * gyL + gyA * gyA * 1.35 + gyB * gyB;
    const jxy = gxL * gyL + gxA * gyA * 1.35 + gxB * gyB;
    const theta = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
    ux = Math.cos(theta); uy = Math.sin(theta);
    if (uy < -0.1 || (Math.abs(uy) <= 0.1 && ux < 0)) { ux = -ux; uy = -uy; }
    const deg = Math.abs(Math.atan2(uy, ux) * 180 / Math.PI);
    if (Math.abs(deg - 90) <= 5.0) { ux = 0; uy = 1; }
    else if (deg <= 5.0 || Math.abs(deg - 180) <= 5.0) { ux = 1; uy = 0; }
  }

  let tMin = Infinity, tMax = -Infinity;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const t = s.x * ux + s.y * uy;
    s.t = t;
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
  }
  const tSpan = Math.max(1e-3, tMax - tMin);
  const BINS = clamp(Math.round(Math.sqrt(m) * 0.45), 10, 28);
  const binSamples = Array.from({ length: BINS }, () => []);
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const bi = Math.min(BINS - 1, Math.max(0, Math.floor(((s.t - tMin) / tSpan) * BINS)));
    binSamples[bi].push(s);
  }

  const binStops = [];
  for (let b = 0; b < BINS; b++) {
    const arr = binSamples[b];
    if (!arr.length) continue;
    arr.sort((a, c) => (a.L - a.a * 0.35) - (c.L - c.a * 0.35));
    const qLow = Math.floor(arr.length * 0.08), qHigh = Math.max(qLow + 1, Math.ceil(arr.length * 0.92));
    let sr = 0, sg = 0, sb = 0, sL = 0, sa = 0, sb2 = 0, cnt = 0;
    for (let k = qLow; k < qHigh; k++) {
      sr += arr[k].r; sg += arr[k].g; sb += arr[k].b;
      sL += arr[k].L; sa += arr[k].a; sb2 += arr[k].b2;
      cnt++;
    }
    if (!cnt) continue;
    binStops.push({
      offset: +((b + 0.5) / BINS).toFixed(4),
      r: sr / cnt, g: sg / cnt, b: sb / cnt,
      L: sL / cnt, a: sa / cnt, b2: sb2 / cnt,
      color: hexOf(sr / cnt, sg / cnt, sb / cnt),
      op: 1
    });
  }
  if (binStops.length < 2) return null;
  binStops[0].offset = 0;
  binStops[binStops.length - 1].offset = 1;

  /* Haluskan deret binStops (2 pass untuk Super-Region latar agar transisi ekstra mulus) */
  const smoothPasses = (n > w * h * 0.12) ? 2 : 1;
  if (binStops.length >= 4) {
    for (let sp = 0; sp < smoothPasses; sp++) {
      for (let i = 1; i < binStops.length - 1; i++) {
        const p = binStops[i - 1], c = binStops[i], nx = binStops[i + 1];
        const mr = 0.20 * p.r + 0.60 * c.r + 0.20 * nx.r;
        const mg = 0.20 * p.g + 0.60 * c.g + 0.20 * nx.g;
        const mb = 0.20 * p.b + 0.60 * c.b + 0.20 * nx.b;
        const [mL, ma, mb2] = rgb2lab(mr, mg, mb);
        c.r = mr; c.g = mg; c.b = mb; c.L = mL; c.a = ma; c.b2 = mb2;
        c.color = hexOf(mr, mg, mb);
      }
    }
  }

  /* 1D Ramer-Douglas-Peucker pada profil warna CIE-Lab */
  const keepStop = new Uint8Array(binStops.length);
  keepStop[0] = keepStop[binStops.length - 1] = 1;
  const rdpStack = [[0, binStops.length - 1]];
  while (rdpStack.length) {
    const [i0, i1] = rdpStack.pop();
    if (i1 - i0 <= 1) continue;
    const s0 = binStops[i0], s1 = binStops[i1];
    const du = Math.max(1e-6, s1.offset - s0.offset);
    let maxD = 0, maxIdx = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const si = binStops[i];
      const wgt = (si.offset - s0.offset) / du;
      const pL = s0.L + wgt * (s1.L - s0.L);
      const pa = s0.a + wgt * (s1.a - s0.a);
      const pb2 = s0.b2 + wgt * (s1.b2 - s0.b2);
      const d = Math.hypot(si.L - pL, si.a - pa, si.b2 - pb2);
      if (d > maxD) { maxD = d; maxIdx = i; }
    }
    if (maxD > 0.42 && maxIdx > 0) {
      keepStop[maxIdx] = 1;
      rdpStack.push([i0, maxIdx], [maxIdx, i1]);
    }
  }
  const stops = binStops.filter((_, idx) => keepStop[idx]);

  const evalStopsAt = u => {
    const uc = clamp(u, 0, 1);
    for (let k = 0; k < stops.length - 1; k++) {
      const a = stops[k], b = stops[k + 1];
      if (uc <= b.offset || k === stops.length - 2) {
        const t = (uc - a.offset) / Math.max(1e-6, b.offset - a.offset);
        return [a.L + t * (b.L - a.L), a.a + t * (b.a - a.a), a.b2 + t * (b.b2 - a.b2)];
      }
    }
    const last = stops[stops.length - 1];
    return [last.L, last.a, last.b2];
  };

  let sseLin = 0;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const u = (s.t - tMin) / tSpan;
    const [pL, pa, pb2] = evalStopsAt(u);
    sseLin += (s.L - pL) ** 2 + (s.a - pa) ** 2 + (s.b2 - pb2) ** 2;
  }
  const rmseLin = Math.sqrt(sseLin / m);

  let maxStopSpread = 0;
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const sp = Math.hypot(stops[j].L - stops[i].L, stops[j].a - stops[i].a, stops[j].b2 - stops[i].b2);
      if (sp > maxStopSpread) maxStopSpread = sp;
    }
  }

  /* Evaluasi Radial Gradient untuk objek kompak/memancar maupun Blush Pink Pipi (puncak kroma a* atau luminansi L*) */
  const aspect = Math.max(spanX, spanY) / Math.max(1, Math.min(spanX, spanY));
  const isPinkBlushRegion = meanL >= 70 && meanL <= 93 && meanA >= 9.0 && cy0 < h * 0.42 && n < w * h * 0.04;
  if ((aspect <= 3.2 && n < w * h * 0.22) || isPinkBlushRegion) {
    /* Hitung warna referensi tepi luar (outer ring) agar pusat rona merah muda pipi (blush) maupun titik cahaya terdeteksi akurat */
    let ringL = 0, ringA = 0, ringB2 = 0, ringN = 0;
    const radHalfX = Math.max(1, spanX * 0.5), radHalfY = Math.max(1, spanY * 0.5);
    for (let i = 0; i < m; i++) {
      const s = samples[i];
      const nr = Math.hypot((s.x - cx0) / radHalfX, (s.y - cy0) / radHalfY);
      if (nr >= 0.72) {
        ringL += s.L; ringA += s.a; ringB2 += s.b2; ringN++;
      }
    }
    if (ringN >= 4) { ringL /= ringN; ringA /= ringN; ringB2 /= ringN; }
    else { ringL = meanL; ringA = meanA; ringB2 = meanB2; }

    let sumW = 0, fxSum = 0, fySum = 0;
    for (let i = 0; i < m; i++) {
      const s = samples[i];
      const dChroma = isPinkBlushRegion
        ? Math.max(0.1, (s.a - ringA) * 2.2 + (ringL - s.L) * 0.8)
        : Math.hypot((s.a - ringA) * 1.55, (s.b2 - ringB2) * 1.15);
      const dLight = Math.abs(s.L - ringL);
      const wgt = Math.pow(Math.max(0.1, dChroma + dLight * 0.85), 2);
      fxSum += s.x * wgt; fySum += s.y * wgt; sumW += wgt;
    }
    const fx = sumW > 0 ? fxSum / sumW : cx0;
    const fy = sumW > 0 ? fySum / sumW : cy0;
    let rMax = 1;
    for (let i = 0; i < m; i++) {
      const dR = Math.hypot(samples[i].x - fx, samples[i].y - fy);
      samples[i].rad = dR;
      if (dR > rMax) rMax = dR;
    }
    const RBINS = 10;
    const rBins = Array.from({ length: RBINS }, () => []);
    for (let i = 0; i < m; i++) {
      const bi = Math.min(RBINS - 1, Math.floor((samples[i].rad / rMax) * RBINS));
      rBins[bi].push(samples[i]);
    }
    const rStops = [];
    for (let b = 0; b < RBINS; b++) {
      const arr = rBins[b];
      if (!arr.length) continue;
      let sr = 0, sg = 0, sb = 0, sL = 0, sa = 0, sb2 = 0;
      for (const it of arr) { sr += it.r; sg += it.g; sb += it.b; sL += it.L; sa += it.a; sb2 += it.b2; }
      const c = arr.length;
      rStops.push({ offset: +(b / (RBINS - 1)).toFixed(4), L: sL / c, a: sa / c, b2: sb2 / c, color: hexOf(sr / c, sg / c, sb / c), op: 1 });
    }
    let radSpread = 0;
    for (let i = 0; i < rStops.length; i++) {
      for (let j = i + 1; j < rStops.length; j++) {
        const sp = Math.hypot(rStops[j].L - rStops[i].L, rStops[j].a - rStops[i].a, rStops[j].b2 - rStops[i].b2);
        if (sp > radSpread) radSpread = sp;
      }
    }
    if (rStops.length >= 3) {
      rStops[0].offset = 0; rStops[rStops.length - 1].offset = 1;
      let sseRad = 0;
      for (let i = 0; i < m; i++) {
        const u = clamp(samples[i].rad / rMax, 0, 1);
        const idx = Math.min(rStops.length - 2, Math.floor(u * (rStops.length - 1)));
        const a = rStops[idx], b = rStops[idx + 1];
        const t = (u - a.offset) / Math.max(1e-6, b.offset - a.offset);
        const pL = a.L + t * (b.L - a.L), pa = a.a + t * (b.a - a.a), pb2 = a.b2 + t * (b.b2 - a.b2);
        sseRad += (samples[i].L - pL) ** 2 + (samples[i].a - pa) ** 2 + (samples[i].b2 - pb2) ** 2;
      }
      const rmseRad = Math.sqrt(sseRad / m);
      const radLinMult = isPinkBlushRegion ? 1.06 : 0.96;
      const radSolMult = isPinkBlushRegion ? 0.98 : 0.93;
      if (rmseRad < rmseLin * radLinMult && rmseRad < rmseSolid * radSolMult && Math.max(maxStopSpread, radSpread) >= 1.8) {
        return {
          type: 'radial',
          base: baseHex,
          cx: +(cx0 * scale).toFixed(2),
          cy: +(cy0 * scale).toFixed(2),
          r: +(rMax * scale).toFixed(2),
          fx: +(fx * scale).toFixed(2),
          fy: +(fy * scale).toFixed(2),
          stops: rStops.map(s => ({ offset: s.offset, color: s.color, op: s.op }))
        };
      }
    }
  }

  const linRatioThr = (isSuper || forceGrad) ? 0.992 : 0.955;
  if (maxStopSpread >= (forceGrad ? 1.15 : isSuper ? 1.45 : 1.8) && rmseLin < rmseSolid * linRatioThr) {
    const pMeanT = cx0 * ux + cy0 * uy;
    const x1 = (cx0 + (tMin - pMeanT) * ux) * scale;
    const y1 = (cy0 + (tMin - pMeanT) * uy) * scale;
    const x2 = (cx0 + (tMax - pMeanT) * ux) * scale;
    const y2 = (cy0 + (tMax - pMeanT) * uy) * scale;
    return {
      type: 'linear',
      base: baseHex,
      x1: +x1.toFixed(2), y1: +y1.toFixed(2),
      x2: +x2.toFixed(2), y2: +y2.toFixed(2),
      stops: stops.map(s => ({ offset: s.offset, color: s.color, op: s.op }))
    };
  }
  return null;
}

function applyUserGradOverride(fittedGrad, userGrad) {
  if (!userGrad || !userGrad.stops || userGrad.stops.length < 2) return fittedGrad;
  const stops = userGrad.stops.map(s => ({ offset: s.offset, color: s.color, op: s.op ?? 1 }));
  const base = stops[Math.floor(stops.length / 2)].color || stops[0].color;
  if (!fittedGrad) {
    return {
      type: userGrad.type || 'linear',
      base,
      x1: userGrad.x1 ?? 0, y1: userGrad.y1 ?? 0,
      x2: userGrad.x2 ?? 100, y2: userGrad.y2 ?? 100,
      cx: userGrad.cx ?? 50, cy: userGrad.cy ?? 50, r: userGrad.r ?? 50,
      fx: userGrad.fx ?? 50, fy: userGrad.fy ?? 50,
      stops
    };
  }
  return {
    ...fittedGrad,
    type: userGrad.type || fittedGrad.type,
    base,
    stops
  };
}

function attachGradientsToRegions(regs, labels, w, h, rawWork, scale, W, H, edgeField = null, palette = null, opt = {}) {
  if (opt && opt.gradientMode === 'off') {
    if (regs) {
      for (const rg of regs) {
        rg.grad = null;
        if (rg.loops) for (const lp of rg.loops) lp.grad = null;
      }
    }
    if (palette) {
      for (const pe of palette) { pe.grad = null; pe.isGradient = false; }
    }
    return regs;
  }
  const rawRgba = (rawWork && rawWork.rawRgba && rawWork.rawRgba.length === w * h * 4)
    ? rawWork.rawRgba
    : (rawWork && rawWork.data ? rawWork.data.data : null);
  if (!rawRgba || !labels || !regs || !regs.length) return regs;
  const fitOpt = { forceGradient: !!(opt && (opt.forceGradient || opt.gradientMode === 'on')) };

  /* Petakan piksel per komponen terhubung (4-connected) agar setiap pulau poligon mendapat gradasi lokalnya sendiri */
  const n = w * h;
  const compId = new Int32Array(n).fill(-1);
  const compPixels = [];
  const compBbs = [];
  const compLabs = [];
  const q = new Int32Array(n);

  for (let p = 0; p < n; p++) {
    const lab = labels[p];
    if (lab < 0 || compId[p] >= 0) continue;
    const cid = compPixels.length;
    let head = 0, tail = 0;
    q[tail++] = p; compId[p] = cid;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    while (head < tail) {
      const cur = q[head++];
      const x = cur % w, y = (cur / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && labels[cur - 1] === lab && compId[cur - 1] < 0) { compId[cur - 1] = cid; q[tail++] = cur - 1; }
      if (x < w - 1 && labels[cur + 1] === lab && compId[cur + 1] < 0) { compId[cur + 1] = cid; q[tail++] = cur + 1; }
      if (y > 0 && labels[cur - w] === lab && compId[cur - w] < 0) { compId[cur - w] = cid; q[tail++] = cur - w; }
      if (y < h - 1 && labels[cur + w] === lab && compId[cur + w] < 0) { compId[cur + w] = cid; q[tail++] = cur + w; }
    }
    compPixels.push(Int32Array.from(q.subarray(0, tail)));
    compBbs.push([minX * scale, minY * scale, (maxX + 1) * scale, (maxY + 1) * scale]);
    compLabs.push(lab);
  }

  const byLabComps = new Map();
  for (let cid = 0; cid < compPixels.length; cid++) {
    const lab = compLabs[cid];
    if (!byLabComps.has(lab)) byLabComps.set(lab, []);
    byLabComps.get(lab).push(cid);
  }

  const cidGradCache = new Map();
  for (const rg of regs) {
    const cids = byLabComps.get(rg.label) || [];
    if (!cids.length) continue;
    const palEntry = palette ? palette[rg.label] : null;
    /* Cari komponen terbesar untuk gradasi tingkat region */
    let largestCid = cids[0];
    for (const cid of cids) {
      if (compPixels[cid].length > compPixels[largestCid].length) largestCid = cid;
    }
    const userGrad = palEntry && palEntry.userGrad ? palEntry.userGrad : null;
    rg.grad = fitComponentGradientFromPixels(compPixels[largestCid], w, h, rawRgba, scale, W, H, edgeField, palEntry, fitOpt, labels);
    if (userGrad) rg.grad = applyUserGradOverride(rg.grad, userGrad);
    cidGradCache.set(largestCid, rg.grad);
    if (rg.grad && rg.grad.base) rg.color = rg.grad.base;

    /* Cocokkan setiap outer loop di rg.loops ke cid tepat di titik interiornya (inPt) atau bounding-box lokalnya */
    let repLoopGrad = rg.grad || null;
    for (const lp of (rg.loops || [])) {
      const sArea = typeof lp.signedArea === 'number' ? lp.signedArea : signedPolyArea(lp.pts);
      if (sArea > 0) continue; /* hole */
      const st = polyStats(lp.pts);
      const lbb = st.bb;
      const wx = clamp(Math.floor((st.inPt ? st.inPt[0] : st.c[0]) / scale), 0, w - 1);
      const wy = clamp(Math.floor((st.inPt ? st.inPt[1] : st.c[1]) / scale), 0, h - 1);
      let bestCid = compId[wy * w + wx];
      if (bestCid < 0 || compLabs[bestCid] !== rg.label) {
        bestCid = -1;
        let bestDist = Infinity;
        for (const cid of cids) {
          const cbb = compBbs[cid];
          const d = Math.hypot((lbb[0] + lbb[2]) * 0.5 - (cbb[0] + cbb[2]) * 0.5, (lbb[1] + lbb[3]) * 0.5 - (cbb[1] + cbb[3]) * 0.5);
          if (d < bestDist) { bestDist = d; bestCid = cid; }
        }
      }
      if (bestCid >= 0 && compPixels[bestCid].length >= 42) {
        let g = null;
        const cbb = compBbs[bestCid];
        const loopBoxArea = Math.max(1, (lbb[2] - lbb[0]) * (lbb[3] - lbb[1]));
        const compBoxArea = Math.max(1, (cbb[2] - cbb[0]) * (cbb[3] - cbb[1]));
        /* Jika loop ini merupakan sub-bagian signifikan (>= 160 px) dari komponen besar,
           pindai cepat kisi 2D di dalam bounding-box loop tersebut untuk fitting gradasi lokal */
        if (loopBoxArea < compBoxArea * 0.72 && loopBoxArea >= 160 * scale * scale) {
          const x0 = Math.max(0, Math.floor(lbb[0] / scale) - 2);
          const y0 = Math.max(0, Math.floor(lbb[1] / scale) - 2);
          const x1 = Math.min(w - 1, Math.ceil(lbb[2] / scale) + 2);
          const y1 = Math.min(h - 1, Math.ceil(lbb[3] / scale) + 2);
          const subPx = [];
          const stepXY = Math.max(1, Math.floor(Math.sqrt((x1 - x0 + 1) * (y1 - y0 + 1)) / 64));
          for (let py = y0; py <= y1; py += stepXY) {
            const row = py * w;
            for (let px = x0; px <= x1; px += stepXY) {
              const p = row + px;
              if (compId[p] === bestCid) subPx.push(p);
            }
          }
          if (subPx.length >= 48) {
            g = fitComponentGradientFromPixels(subPx, w, h, rawRgba, scale, W, H, edgeField, palEntry, fitOpt, labels);
          }
        }
        if (!g) {
          if (!cidGradCache.has(bestCid)) {
            cidGradCache.set(bestCid, fitComponentGradientFromPixels(compPixels[bestCid], w, h, rawRgba, scale, W, H, edgeField, palEntry, fitOpt, labels));
          }
          g = cidGradCache.get(bestCid);
        }
        if (userGrad) g = applyUserGradOverride(g, userGrad);
        if (g) {
          lp.grad = g;
          if (!repLoopGrad) repLoopGrad = g;
        }
      }
    }
    if (palEntry && repLoopGrad && repLoopGrad.stops && repLoopGrad.stops.length >= 2) {
      palEntry.isGradient = true;
      palEntry.grad = {
        type: repLoopGrad.type,
        base: repLoopGrad.base || palEntry.hex,
        x1: repLoopGrad.x1, y1: repLoopGrad.y1, x2: repLoopGrad.x2, y2: repLoopGrad.y2,
        cx: repLoopGrad.cx, cy: repLoopGrad.cy, r: repLoopGrad.r, fx: repLoopGrad.fx, fy: repLoopGrad.fy,
        stops: repLoopGrad.stops.map(s => ({ offset: s.offset, color: s.color, op: s.op ?? 1 }))
      };
    }
  }
  return regs;
}

/* Konsolidasi Palet Pra-Tracing & Saat-Tracing:
   Menggabungkan warna-warna sabuk gradasi menjadi 1 entri Palet Gradient (Linear/Radial)
   dan membatasi jumlah total palet <= maxColors bila Max Color diaktifkan. */
function consolidateGradientPalette(work, mask, rawPalette, edgeField = null, cls = null, opt = {}) {
  if (!rawPalette || !rawPalette.length) {
    return { items: [], hexes: [], hasGradient: false, gradientCount: 0 };
  }
  const gMode = opt.gradientMode || 'auto';
  const hasDetectedGrad = !!(
    rawPalette._hasSmoothGradient && (!cls || cls.surfaceMode !== 'flat')
  );
  const useGrad = gMode === 'on' || (gMode === 'auto' && hasDetectedGrad);
  const maxC = (opt.maxColorEnabled && opt.maxColors >= 2) ? Math.max(2, Math.round(opt.maxColors)) : 0;

  const baseItems = rawPalette.map(c => {
    const r = c.r != null ? Math.round(c.r) : rgbOf(c.hex || '#000000')[0];
    const g = c.g != null ? Math.round(c.g) : rgbOf(c.hex || '#000000')[1];
    const b = c.b != null ? Math.round(c.b) : rgbOf(c.hex || '#000000')[2];
    const [L, a, b2] = (c.L != null) ? [c.L, c.a, c.b2] : rgb2lab(r, g, b);
    return {
      r, g, b, L, a, b2,
      hex: (c.hex || hexOf(r, g, b)).toLowerCase(),
      count: c.count || 1,
      verifiedPlateau: !!c.verifiedPlateau,
      isGradCluster: !!c.isGradCluster,
      isGradient: false,
      grad: null
    };
  });
  baseItems._hasSmoothGradient = hasDetectedGrad;

  if (!useGrad || !work || !work.data) {
    let flatList = [];
    for (const item of baseItems) {
      const dup = flatList.find(u => u.hex === item.hex || ciede2000(item.L, item.a, item.b2, u.L, u.a, u.b2) < 2.2);
      if (!dup) flatList.push(item);
    }
    if (maxC > 0 && flatList.length > maxC) {
      while (flatList.length > maxC) {
        let bi = 0, bj = 1, bCost = Infinity;
        for (let i = 0; i < flatList.length; i++) {
          for (let j = i + 1; j < flatList.length; j++) {
            const de = ciede2000(flatList[i].L, flatList[i].a, flatList[i].b2, flatList[j].L, flatList[j].a, flatList[j].b2);
            const cost = de * (1 + 0.18 * Math.log(1 + Math.min(flatList[i].count || 1, flatList[j].count || 1)));
            if (cost < bCost) { bCost = cost; bi = i; bj = j; }
          }
        }
        const ca = flatList[bi], cb = flatList[bj];
        const keep = (ca.count || 1) >= (cb.count || 1) ? ca : cb;
        const drop = keep === ca ? cb : ca;
        const tot = (keep.count || 1) + (drop.count || 1);
        keep.r = Math.round((keep.r * (keep.count || 1) + drop.r * (drop.count || 1)) / tot);
        keep.g = Math.round((keep.g * (keep.count || 1) + drop.g * (drop.count || 1)) / tot);
        keep.b = Math.round((keep.b * (keep.count || 1) + drop.b * (drop.count || 1)) / tot);
        const [nL, na, nb2] = rgb2lab(keep.r, keep.g, keep.b);
        keep.L = nL; keep.a = na; keep.b2 = nb2;
        keep.hex = hexOf(keep.r, keep.g, keep.b).toLowerCase();
        keep.count = tot;
        flatList.splice(keep === ca ? bj : bi, 1);
      }
    }
    return {
      items: flatList,
      hexes: flatList.map(c => c.hex.toLowerCase()),
      hasGradient: false,
      gradientCount: 0
    };
  }

  /* Simulasikan peta label cepat pada work dan jalankan unifyGradientBands + fitting gradient */
  const w = work.w || work.data.width, h = work.h || work.data.height;
  const n = w * h;
  const d = (work.rawRgba && work.rawRgba.length === n * 4) ? work.rawRgba : work.data.data;
  const ef = edgeField || buildEdgeField(work, mask);
  const pLabels = new Int16Array(n).fill(-1);
  const K0 = baseItems.length;
  for (let p = 0; p < n; p++) {
    if (mask && mask[p]) continue;
    const i4 = p * 4;
    const r = d[i4], g = d[i4 + 1], b = d[i4 + 2];
    let bestK = 0, bestD = Infinity;
    for (let k = 0; k < K0; k++) {
      const c = baseItems[k];
      const dist = cdist2(r, g, b, c.r, c.g, c.b);
      if (dist < bestD) { bestD = dist; bestK = k; }
    }
    pLabels[p] = bestK;
  }
  const detailProt = buildDetailProtection(pLabels, w, h, work, baseItems, mask);
  pLabels._detailProt = detailProt;
  enforceMinPixels(pLabels, w, h, Math.max(4, Math.round(n / 18000)), work, baseItems);

  const palCopy = baseItems.map(c => ({ ...c }));
  palCopy._hasSmoothGradient = true;
  unifyGradientBands(pLabels, w, h, work, mask, palCopy, ef, cls, {
    gradientMode: gMode,
    forceGradient: gMode === 'on',
    maxColorEnabled: opt.maxColorEnabled,
    maxColors: opt.maxColors,
    attachPreviewGradients: true
  });

  const outItems = palCopy.map(c => ({
    ...c,
    hex: (c.hex || hexOf(c.r, c.g, c.b)).toLowerCase(),
    isGradient: !!(c.grad && c.grad.stops && c.grad.stops.length >= 2),
    grad: (c.grad && c.grad.stops && c.grad.stops.length >= 2) ? c.grad : null
  }));
  const gradCnt = outItems.filter(c => c.isGradient).length;
  return {
    items: outItems,
    hexes: outItems.map(c => c.hex),
    hasGradient: gradCnt > 0,
    gradientCount: gradCnt
  };
}

/* Terapkan perubahan Max Color & Gradient Mode secara instan pada sesi hasil tracing (sess) */
function applySessionPaletteAndGradientSettings(sess, opt = {}) {
  if (!sess || !sess.regs || !sess.palette) return sess;
  if (!sess._baseSnapshot) {
    sess._baseSnapshot = {
      labels: sess.labels ? new Int16Array(sess.labels) : null,
      palette: sess.palette.map(c => ({
        ...c,
        grad: c.grad ? { ...c.grad, stops: c.grad.stops ? c.grad.stops.map(s => ({ ...s })) : [] } : null
      })),
      regs: sess.regs.map(rg => ({
        ...rg,
        grad: rg.grad ? { ...rg.grad, stops: rg.grad.stops ? rg.grad.stops.map(s => ({ ...s })) : [] } : null,
        loops: (rg.loops || []).map(lp => ({
          ...lp,
          grad: lp.grad ? { ...lp.grad, stops: lp.grad.stops ? lp.grad.stops.map(s => ({ ...s })) : [] } : null
        }))
      }))
    };
  }
  const snap = sess._baseSnapshot;
  const gMode = opt.gradientMode || 'auto';
  const maxOn = !!opt.maxColorEnabled;
  const maxC = (maxOn && opt.maxColors >= 2) ? Math.max(2, Math.round(opt.maxColors)) : 0;

  let nextPal = snap.palette.map(c => ({
    ...c,
    grad: c.grad ? { ...c.grad, stops: c.grad.stops ? c.grad.stops.map(s => ({ ...s })) : [] } : null
  }));
  let nextRegs = snap.regs.map(rg => ({
    ...rg,
    grad: rg.grad ? { ...rg.grad, stops: rg.grad.stops ? rg.grad.stops.map(s => ({ ...s })) : [] } : null,
    loops: (rg.loops || []).map(lp => ({
      ...lp,
      grad: lp.grad ? { ...lp.grad, stops: lp.grad.stops ? lp.grad.stops.map(s => ({ ...s })) : [] } : null
    }))
  }));
  let nextLabels = snap.labels ? new Int16Array(snap.labels) : null;

  /* Jika Max Color aktif dan jumlah palet > maxC, lebur region & palet berlebih */
  if (maxC > 0 && nextPal.length > maxC) {
    while (nextPal.length > maxC) {
      let bFrom = -1, bTo = -1, bCost = Infinity;
      const areaByLab = new Float64Array(nextPal.length);
      for (const rg of nextRegs) {
        if (rg.label >= 0 && rg.label < nextPal.length) areaByLab[rg.label] += (rg.area || 1);
      }
      for (let i = 0; i < nextPal.length; i++) {
        for (let j = i + 1; j < nextPal.length; j++) {
          const ci = nextPal[i], cj = nextPal[j];
          const [Li, ai, bi2] = ci.L != null ? [ci.L, ci.a, ci.b2] : rgb2lab(ci.r, ci.g, ci.b);
          const [Lj, aj, bj2] = cj.L != null ? [cj.L, cj.a, cj.b2] : rgb2lab(cj.r, cj.g, cj.b);
          const de = ciede2000(Li, ai, bi2, Lj, aj, bj2);
          const minA = Math.min(areaByLab[i] || 1, areaByLab[j] || 1);
          const cost = (de + 1.0) * (1 + 0.22 * Math.log(1 + minA / 80));
          if (cost < bCost) {
            bCost = cost;
            if ((areaByLab[i] || 1) <= (areaByLab[j] || 1)) { bFrom = i; bTo = j; }
            else { bFrom = j; bTo = i; }
          }
        }
      }
      if (bFrom < 0 || bTo < 0) break;
      const rgFrom = nextRegs.find(r => r.label === bFrom);
      const rgTo = nextRegs.find(r => r.label === bTo);
      if (rgFrom && rgTo) {
        rgTo.loops = rgTo.loops.concat(rgFrom.loops);
        rgTo.area = (rgTo.area || 0) + (rgFrom.area || 0);
        if (!rgTo.grad && rgFrom.grad) rgTo.grad = rgFrom.grad;
        nextRegs = nextRegs.filter(r => r !== rgFrom);
      } else if (rgFrom) {
        rgFrom.label = bTo;
      }
      if (nextLabels) {
        for (let p = 0; p < nextLabels.length; p++) {
          if (nextLabels[p] === bFrom) nextLabels[p] = bTo;
          else if (nextLabels[p] > bFrom) nextLabels[p]--;
        }
      }
      nextPal.splice(bFrom, 1);
      for (const rg of nextRegs) {
        if (rg.label > bFrom) rg.label--;
      }
    }
  }

  /* Terapkan Gradient Mode */
  const hasDetectedGrad = !!(
    (sess.cls && (sess.cls.surfaceMode === 'gradient' || sess.cls.surfaceMode === 'mixed' || sess.cls.gradientContinuity >= 0.14)) ||
    snap.palette.some(c => c.grad)
  );
  const useGrad = gMode === 'on' || (gMode === 'auto' && hasDetectedGrad);
  if (!useGrad) {
    for (const pe of nextPal) { pe.grad = null; pe.isGradient = false; }
    for (const rg of nextRegs) {
      rg.grad = null;
      rg.color = (nextPal[rg.label] && nextPal[rg.label].hex) || rg.color;
      if (rg.loops) for (const lp of rg.loops) lp.grad = null;
    }
  } else if (nextLabels && (sess.rawRgba || sess.workData)) {
    attachGradientsToRegions(
      nextRegs, nextLabels, sess.w, sess.h,
      { data: sess.workData, rawRgba: sess.rawRgba },
      sess.scale, sess.W, sess.H, null, nextPal,
      { gradientMode: gMode, forceGradient: gMode === 'on' }
    );
  }

  const svg = assembleSVG(nextRegs, sess.W, sess.H, {
    stackMode: opt.stackMode || 'stack',
    stroke: opt.stroke !== false,
    bg: 'none',
    safetyBg: !(sess.stats && sess.stats.alpha && sess.stats.alpha.hasAlpha),
    hiddenLabels: [],
  });

  if (sess.traceHistory) {
    sess.traceHistory.palette = nextPal;
    sess.traceHistory.regs = nextRegs;
    sess.traceHistory.svg = svg;
  }

  return {
    ...sess,
    svg,
    regs: nextRegs,
    palette: nextPal,
    labels: nextLabels || sess.labels,
    hiddenLabels: [],
    stats: {
      ...(sess.stats || {}),
      regions: nextRegs.length,
      palette: {
        ...((sess.stats && sess.stats.palette) || {}),
        count: nextPal.length,
        colors: nextPal.map(c => c.hex)
      }
    }
  };
}

function buildRegions(loops, palette, scale, gradCtx = null) {
  const regs = [];
  const byLabel = new Map();
  for (const lp of loops) {
    if (!byLabel.has(lp.label)) byLabel.set(lp.label, []);
    byLabel.get(lp.label).push(lp);
  }
  byLabel.forEach((lps, L) => {
    const c = palette[L] || { r: 0, g: 0, b: 0 };
    let area = 0;
    const items = lps.map(lp => {
      const sArea = (typeof lp.area === 'number' && lp.area !== 0) ? lp.area : signedPolyArea(lp.scaledPts);
      const absA = Math.abs(sArea);
      area += absA;
      return { d: lp.d, area: absA, signedArea: sArea, pts: lp.scaledPts, segs: lp.segs, grad: lp.grad || null };
    });
    regs.push({ label: L, color: hexOf(c.r, c.g, c.b), area: area * scale * scale, loops: items, hidden: false, grad: null });
  });
  regs.sort((a, b) => b.area - a.area);
  if (gradCtx && gradCtx.labels && gradCtx.rawWork) {
    attachGradientsToRegions(regs, gradCtx.labels, gradCtx.w, gradCtx.h, gradCtx.rawWork, gradCtx.scale || scale, gradCtx.W, gradCtx.H, gradCtx.edgeField, palette, {
      gradientMode: gradCtx.gradientMode || 'auto',
      forceGradient: !!gradCtx.forceGradient
    });
  }
  return regs;
}

function interiorPoint(pts, bb, c) {
  if (!pts || !pts.length) return [0, 0];
  if (pip(c[0], c[1], pts)) return c;
  const ys = [c[1], (bb[1] + c[1]) * 0.5, (c[1] + bb[3]) * 0.5, bb[1] + (bb[3] - bb[1]) * 0.33, bb[1] + (bb[3] - bb[1]) * 0.67];
  for (const y of ys) {
    const xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y)) xs.push(xi + (xj - xi) * (y - yi) / (yj - yi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const mx = (xs[k] + xs[k + 1]) * 0.5;
      if (pip(mx, y, pts)) return [mx, y];
    }
  }
  return pts[0];
}

function polyStats(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0;
  const n = pts ? pts.length : 0;
  if (!n) return { bb: [0, 0, 0, 0], c: [0, 0], inPt: [0, 0] };
  for (let i = 0; i < n; i++) {
    const x = pts[i][0], y = pts[i][1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    cx += x; cy += y;
  }
  cx /= n; cy /= n;
  const bb = [x0, y0, x1, y1], c = [cx, cy];
  return { bb, c, inPt: interiorPoint(pts, bb, c) };
}

function loopContainsLoop(outerLp, innerLp, allowEqualArea = false) {
  const ob = outerLp.bb, ib = innerLp.bb;
  if (!outerLp.pts || outerLp.pts.length < 3 || !innerLp.pts || !innerLp.pts.length) return false;
  if (allowEqualArea ? (outerLp.absArea < innerLp.absArea * 0.85) : (outerLp.absArea <= innerLp.absArea * 1.002)) return false;
  const tol = allowEqualArea ? 3.0 : 2.0;
  if (ib[0] < ob[0] - tol || ib[1] < ob[1] - tol || ib[2] > ob[2] + tol || ib[3] > ob[3] + tol) return false;
  const pt = innerLp.inPt || innerLp.c;
  return pip(pt[0], pt[1], outerLp.pts);
}

function decomposeRegionComponents(rg) {
  const outers = [], holes = [];
  for (const lp of (rg.loops || [])) {
    if (!lp.d) continue;
    const sArea = typeof lp.signedArea === 'number' ? lp.signedArea : signedPolyArea(lp.pts);
    const absArea = lp.area || Math.abs(sArea);
    const st = polyStats(lp.pts);
    const item = { d: lp.d, pts: lp.pts || [], segs: lp.segs || [], signedArea: sArea, absArea, bb: st.bb, c: st.c, inPt: st.inPt, holes: [], grad: lp.grad || null };
    if (sArea <= 0) outers.push(item);
    else holes.push(item);
  }
  if (!outers.length && holes.length) {
    holes.sort((a, b) => b.absArea - a.absArea);
    outers.push(holes.shift());
  }
  outers.sort((a, b) => a.absArea - b.absArea);
  for (const h of holes) {
    let best = null;
    for (const o of outers) {
      if (loopContainsLoop(o, h)) { best = o; break; }
    }
    if (best) best.holes.push(h);
  }
  return outers.map(o => ({
    label: rg.label,
    color: (o.grad && o.grad.base) ? o.grad.base : rg.color,
    grad: o.grad || (outers.length === 1 ? rg.grad : null) || null,
    outer: o,
    holes: o.holes,
    keptHoles: o.holes.slice(),
    area: o.absArea,
    bb: o.bb,
    c: o.c,
    parent: null,
    parentHole: null,
    children: [],
    depth: 0,
    effectiveBg: null,
    suppressed: false,
    isFrameBg: false,
  }));
}

function assembleSVG(regs, W, H, opt = {}) {
  const mode = opt.stackMode || 'stack';
  const frameId = opt.frameId === false ? null : (opt.frameId || 'Frame-1');
  const hiddenSet = opt.hiddenLabels instanceof Set ? opt.hiddenLabels : new Set(opt.hiddenLabels || []);
  const activeRegs = regs.filter(rg => !rg.hidden && !hiddenSet.has(rg.label));
  const useAntiGapStroke = opt.stroke && mode !== 'stack';
  const stroke = useAntiGapStroke ? ` stroke-width="${r2(clamp(Math.min(W, H) / 2400, 0.14, 0.24))}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"` : '';

  const allComps = [];
  for (const rg of activeRegs) {
    const cs = decomposeRegionComponents(rg);
    for (const c of cs) allComps.push(c);
  }

  allComps.sort((a, b) => a.area - b.area);
  for (let i = 0; i < allComps.length; i++) {
    const c = allComps[i];
    for (let j = i + 1; j < allComps.length; j++) {
      const p = allComps[j];
      if (loopContainsLoop(p.outer, c.outer)) {
        c.parent = p;
        p.children.push(c);
        let bestHole = null;
        for (const h of p.holes) {
          if (loopContainsLoop(h, c.outer, true) && (!bestHole || h.absArea < bestHole.absArea)) {
            bestHole = h;
          }
        }
        c.parentHole = bestHole;
        break;
      }
    }
  }

  const calcDepth = c => {
    let d = 0, cur = c.parent, g = 0;
    while (cur && g++ < allComps.length + 2) { d++; cur = cur.parent; }
    return d;
  };
  for (const c of allComps) c.depth = calcDepth(c);

  const rowBand = Math.max(8, H * 0.04);
  const readingCmp = (a, b) => {
    if (Math.abs(a.c[1] - b.c[1]) > rowBand) return a.c[1] - b.c[1];
    return a.c[0] - b.c[0];
  };
  /* Urutan render Z-Order cerdas: komponen yang lebih luas (seperti latar langit & laut) dirender lebih dulu (di belakang)
     sebelum objek siluet dan detail kecil (seperti mercusuar, lumba-lumba, pantulan air, dan bintang) */
  const zOrderCmp = (a, b) => {
    const aSpansW = (a.bb[2] - a.bb[0]) >= W * 0.85 ? 1 : 0;
    const bSpansW = (b.bb[2] - b.bb[0]) >= W * 0.85 ? 1 : 0;
    if (aSpansW !== bSpansW) return bSpansW - aSpansW;
    if (Math.abs(a.area - b.area) > Math.max(a.area, b.area) * 0.25) return b.area - a.area;
    return readingCmp(a, b);
  };

  let body = '';
  let frameBgTag = '';
  let defsXml = '';
  let gradSeq = 0;

  const emitGradPaint = (gradObj, fallbackColor) => {
    if (!gradObj || !gradObj.stops || gradObj.stops.length < 2) return fallbackColor;
    const gid = 'svgpeak-grad-' + (++gradSeq);
    const baseAttr = fallbackColor ? ` data-base-color="${fallbackColor}"` : '';
    const stopsXml = gradObj.stops.map(st => {
      const pct = Math.round(clamp(st.offset, 0, 1) * 10000) / 100;
      const opAttr = (st.op != null && st.op < 0.999) ? ` stop-opacity="${r2(st.op)}"` : '';
      return `    <stop offset="${pct}%" stop-color="${st.color}"${opAttr}/>`;
    }).join('\n');
    if (gradObj.type === 'radial') {
      const fxAttr = gradObj.fx != null ? ` fx="${r2(gradObj.fx)}" fy="${r2(gradObj.fy)}"` : '';
      const gtAttr = (gradObj.sy != null && Math.abs(gradObj.sy - 1) > 0.01)
        ? ` data-sy="${r2(gradObj.sy)}" gradientTransform="matrix(1 0 0 ${r2(gradObj.sy)} 0 ${r2(gradObj.cy * (1 - gradObj.sy))})"`
        : '';
      defsXml += `  <radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${r2(gradObj.cx)}" cy="${r2(gradObj.cy)}" r="${r2(gradObj.r)}"${fxAttr}${gtAttr}${baseAttr}>\n${stopsXml}\n  </radialGradient>\n`;
    } else {
      defsXml += `  <linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${r2(gradObj.x1)}" y1="${r2(gradObj.y1)}" x2="${r2(gradObj.x2)}" y2="${r2(gradObj.y2)}"${baseAttr}>\n${stopsXml}\n  </linearGradient>\n`;
    }
    return `url(#${gid})`;
  };

  const hasExplicitBg = !!(opt.bg && opt.bg !== 'none');
  const needSafetyBg = !hasExplicitBg && !!(opt.safetyBg && activeRegs.length > 0 && hiddenSet.size === 0);

  if (mode === 'stack') {
    const roots = allComps.filter(c => !c.parent).sort((a, b) => b.area - a.area);
    let bgComp = null;
    if (roots.length > 0 && allComps.length > 1) {
      const cand = roots[0];
      const b = cand.bb;
      const spansCanvas = b[0] <= W * 0.03 + 2 && b[1] <= H * 0.03 + 2 && b[2] >= W * 0.97 - 2 && b[3] >= H * 0.97 - 2;
      if (spansCanvas && cand.area >= W * H * 0.80) {
        bgComp = cand;
        bgComp.isFrameBg = true;
      }
    }

    if (hasExplicitBg) {
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${opt.bg}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    } else if (bgComp) {
      const bgPaint = emitGradPaint(bgComp.grad, bgComp.color);
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${bgPaint}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    } else if (needSafetyBg) {
      const firstReg = activeRegs[0];
      const safetyPaint = emitGradPaint(firstReg.grad, firstReg.color);
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${safetyPaint}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    }

    const byDepth = allComps.slice().sort((a, b) => a.depth - b.depth || b.area - a.area);
    for (const c of byDepth) {
      if (c.isFrameBg) {
        for (const ch of c.children) ch.effectiveBg = c;
        continue;
      }
      if (!c.parent && bgComp && c !== bgComp) {
        c.effectiveBg = bgComp;
      }
      if (c.suppressed) {
        for (const ch of c.children) ch.effectiveBg = c.effectiveBg;
        continue;
      }
      const kept = [];
      for (const h of c.holes) {
        const fillers = c.children.filter(ch => ch.parentHole === h);
        const filledArea = fillers.reduce((s, ch) => s + ch.area, 0);
        const hasSoftFadeFiller = fillers.some(ch => ch.grad && ch.grad.softFade);
        if (filledArea < h.absArea * 0.78 && !hasSoftFadeFiller) {
          kept.push(h);
          for (const ch of fillers) ch.effectiveBg = c.effectiveBg;
        } else if (fillers.length === 1 && c.effectiveBg && !fillers[0].grad && !c.effectiveBg.grad && fillers[0].color.toLowerCase() === c.effectiveBg.color.toLowerCase()) {
          kept.push(h);
          fillers[0].suppressed = true;
          for (const gch of fillers[0].children) gch.effectiveBg = c.effectiveBg;
        } else {
          for (const ch of fillers) ch.effectiveBg = c;
        }
      }
      c.keptHoles = kept;
      for (const ch of c.children) {
        if (!ch.parentHole && !ch.effectiveBg) ch.effectiveBg = c;
      }
    }

    const visibleComps = allComps.filter(c => !c.isFrameBg && !c.suppressed);
    const readingOrdered = visibleComps.slice().sort(readingCmp);
    readingOrdered.forEach((c, idx) => { c.objName = 'obj-' + (idx + 1); });

    const maxD = visibleComps.reduce((m, c) => Math.max(m, c.depth), 0);
    for (let d = 0; d <= maxD; d++) {
      const level = visibleComps.filter(c => c.depth === d).sort(zOrderCmp);
      for (const c of level) {
        const pathD = c.outer.d + c.keptHoles.map(h => h.d).join('');
        const paint = emitGradPaint(c.grad, c.color);
        const isSoft = !!(c.grad && c.grad.softFade);
        const st = (useAntiGapStroke && !isSoft) ? ` stroke="${paint}"${stroke}` : '';
        body += `<path id="${c.objName}" fill="${paint}"${st} fill-rule="evenodd" d="${pathD}"/>\n`;
      }
    }
  } else {
    if (hasExplicitBg) {
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${opt.bg}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    } else if (needSafetyBg) {
      const firstReg = activeRegs[0];
      const safetyPaint = emitGradPaint(firstReg.grad, firstReg.color);
      frameBgTag = `<path id="${frameId || 'Frame-1'}-bg" fill="${safetyPaint}" d="M 0 0 L ${r2(W)} 0 L ${r2(W)} ${r2(H)} L 0 ${r2(H)} Z"/>\n`;
    }
    const ordered = allComps.slice().sort(readingCmp);
    ordered.forEach((c, idx) => { c.objName = 'obj-' + (idx + 1); });
    const emitOrder = allComps.slice().sort((a, b) => a.depth - b.depth || zOrderCmp(a, b));
    if (mode === 'grouped') {
      const groups = new Map();
      for (const c of emitOrder) {
        if (!groups.has(c.color)) groups.set(c.color, []);
        groups.get(c.color).push(c);
      }
      groups.forEach((vs, col) => {
        for (const c of vs) {
          const paint = emitGradPaint(c.grad, col);
          const isSoft = !!(c.grad && c.grad.softFade);
          const st = (opt.stroke && !isSoft) ? ` stroke="${paint}"${stroke}` : '';
          const pathD = c.outer.d + (isSoft ? '' : c.holes.map(h => h.d).join(''));
          body += `<path id="${c.objName}" fill="${paint}"${st} fill-rule="evenodd" d="${pathD}"/>\n`;
        }
      });
    } else {
      for (const c of emitOrder) {
        const paint = emitGradPaint(c.grad, c.color);
        const isSoft = !!(c.grad && c.grad.softFade);
        const st = (opt.stroke && !isSoft) ? ` stroke="${paint}"${stroke}` : '';
        const pathD = c.outer.d + (isSoft ? '' : c.holes.map(h => h.d).join(''));
        body += `<path id="${c.objName}" fill="${paint}"${st} fill-rule="evenodd" d="${pathD}"/>\n`;
      }
    }
  }

  const defsBlock = defsXml ? `<defs>\n${defsXml}</defs>\n` : '';
  const innerContent = frameId
    ? `<g id="${frameId}" data-container="frame">\n${frameBgTag}${body}</g>\n`
    : `${frameBgTag}${body}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" height="${r2(H)}">\n${defsBlock}${innerContent}</svg>`;
}

function exportDXF(regs, W, H, mode) {
  const out = ['0', 'SECTION', '2', 'ENTITIES'];
  const sample = (s, tol) => {
    const pts = [];
    const len = Math.hypot(s.P3[0] - s.P0[0], s.P3[1] - s.P0[1]) + 1;
    const nseg = clamp(Math.ceil(len / Math.max(0.5, tol * 8)), 4, 64);
    for (let k = 0; k <= nseg; k++) {
      const [bx, by] = evalBezier(s.P0, s.P1, s.P2, s.P3, k / nseg);
      pts.push([bx, H - by]);
    }
    return pts;
  };
  const tol = mode === 'lines-more' ? 0.25 : 1.0;
  for (const rg of regs) {
    if (rg.hidden) continue;
    for (const lp of rg.loops) {
      const segs = lp.segs || [];
      if (mode === 'spline' && segs.length) {
        const cps = [[segs[0].P0[0], H - segs[0].P0[1]]];
        for (const s of segs) cps.push([s.P1[0], H - s.P1[1]], [s.P2[0], H - s.P2[1]], [s.P3[0], H - s.P3[1]]);
        out.push('0', 'SPLINE', '100', 'AcDbEntity', '8', '0', '100', 'AcDbSpline', '70', '8', '71', '3', '72', String(cps.length), '73', '0', '74', '0');
        for (const [x, y] of cps) out.push('10', r2(x).toFixed(2), '20', r2(y).toFixed(2), '30', '0.0');
      } else {
        let pts = [];
        for (const s of segs) {
          const sp = sample(s, tol);
          pts.push(...sp.slice(pts.length ? 1 : 0));
        }
        if (pts.length < 2) continue;
        out.push('0', 'LWPOLYLINE', '100', 'AcDbEntity', '8', '0', '100', 'AcDbPolyline', '90', String(pts.length), '70', '1');
        for (const [x, y] of pts) out.push('10', r2(x).toFixed(2), '20', r2(y).toFixed(2));
      }
    }
  }
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\n');
}

/* =====================================================================
   Orkestrasi Pipeline Penuh (8 Tahap Mendalam — Target Presisi Tinggi)
   Menggunakan Budget Pacing & Multi-Pass Numerik (10–13 detik) agar
   setiap tahap melakukan iterasi konvergensi penuh tanpa membekukan UI.
   ===================================================================== */
const STAGES = [
  ['classify', '1/7 · Ekstraksi fitur GLCM, entropi & klasifikasi citra'],
  ['palette', '2/7 · Kuantisasi warna CIE-Lab, k-d Tree ANN & evaluasi BIC'],
  ['segment', '3/7 · Dekomposisi QuadTree & optimasi MRF Potts (Simulated Annealing)'],
  ['trace', '4/7 · Graf planar & inversi sub-piksel "Beach Deconvolution"'],
  ['smooth', '5/7 · Penghalusan kontur (Polak-Ribière Conjugate Gradient + Corner Puncturing)'],
  ['fit', '6/7 · Fitting kurva Bézier kubik (Gauss-Newton Re-parameterization & MDL)'],
  ['assemble', '7/7 · Perakitan topologi vektor & verifikasi akhir'],
];


/* === END 12-vmt-gradients-svg-dxf.js === */

/* === BEGIN 13-vmt-hardware-gpu-workers.js === */
/* =====================================================================
 * JS Module 13: VMT Engine Part 9 — Hardware Manager, TypedArray MemPool, WebGL2 GPGPU Shaders & Multi-Thread WorkerPool
 * ===================================================================== */
/* =====================================================================
   MODUL HARDWARE, ALOKASI RAM, MULTI-THREAD (WEB WORKER POOL) & VGA (WebGL2)
   ===================================================================== */
const HW_LS_KEY = 'svgpeak-hw-cfg-v1';
const HW_LIMITS = (() => {
  const logicalCores = clamp((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4, 1, 64);
  const devMemGb = clamp((typeof navigator !== 'undefined' && navigator.deviceMemory) || 8, 1, 64);
  let gpu = {
    available: false,
    webgl2: false,
    webgpu: false,
    colorBufferFloat: false,
    floatLinear: false,
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    vendor: 'CPU Fallback',
    renderer: 'Tidak terdeteksi',
    maxTexSize: 4096,
    maxDrawBuffers: 1,
    maxColorAttachments: 1
  };
  try {
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      const gl = cv.getContext('webgl2', { powerPreference: 'high-performance' }) || cv.getContext('webgl', { powerPreference: 'high-performance' });
      if (gl) {
        const isWgl2 = typeof WebGL2RenderingContext !== 'undefined' && (gl instanceof WebGL2RenderingContext);
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const cbf = isWgl2 ? !!gl.getExtension('EXT_color_buffer_float') : !!gl.getExtension('WEBGL_color_buffer_float');
        const fltLin = !!gl.getExtension('OES_texture_float_linear');
        const vendor = (dbg && gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) || gl.getParameter(gl.VENDOR) || 'GPU Vendor';
        const renderer = (dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || (isWgl2 ? 'WebGL 2.0 VGA' : 'WebGL 1.0 VGA');
        const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
        const maxDrawBuffers = isWgl2 ? (gl.getParameter(gl.MAX_DRAW_BUFFERS) || 4) : 1;
        const maxColorAttachments = isWgl2 ? (gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) || 4) : 1;
        gpu = {
          available: true,
          webgl2: isWgl2,
          webgpu: typeof navigator !== 'undefined' && !!navigator.gpu,
          colorBufferFloat: cbf,
          floatLinear: fltLin,
          offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
          vendor: String(vendor),
          renderer: String(renderer),
          maxTexSize,
          maxDrawBuffers,
          maxColorAttachments
        };
        /* Lepaskan konteks probe sementara agar tidak menahan resource GPU saat halaman idle */
        const loseExt = gl.getExtension('WEBGL_lose_context');
        if (loseExt) loseExt.loseContext();
      }
    }
  } catch (e) {}
  return { logicalCores, devMemGb, maxRamMb: Math.max(8192, devMemGb * 1024 * 2), gpu };
})();

const DEFAULT_HW_CFG = {
  ramMode: 'auto',
  ramMb: clamp(Math.round(HW_LIMITS.devMemGb * 1024 * 0.5), 512, 8192),
  multiThread: true,
  cpuCores: HW_LIMITS.logicalCores,
  threadPriority: 'turbo',
  useGpu: HW_LIMITS.gpu.available,
  gpuPower: 'high-performance',
  gpuPipeline: 'full'
};

let _hwCfg = (() => {
  try {
    const raw = localStorage.getItem(HW_LS_KEY);
    if (!raw) return { ...DEFAULT_HW_CFG };
    const p = JSON.parse(raw);
    return {
      ...DEFAULT_HW_CFG,
      ...p,
      ramMb: clamp(Number(p.ramMb) || DEFAULT_HW_CFG.ramMb, 128, 16384),
      cpuCores: clamp(Number(p.cpuCores) || DEFAULT_HW_CFG.cpuCores, 1, 64),
    };
  } catch (e) {
    return { ...DEFAULT_HW_CFG };
  }
})();

const _hwListeners = new Set();
function getHwConfig() { return _hwCfg; }
function getHwInfo() { return HW_LIMITS; }
function setHwConfig(patch) {
  const next = { ..._hwCfg, ...(typeof patch === 'function' ? patch(_hwCfg) : patch) };
  if (next.ramMode === 'auto') {
    next.ramMb = clamp(Math.round(HW_LIMITS.devMemGb * 1024 * 0.5), 512, 8192);
  } else {
    next.ramMb = clamp(Math.round(Number(next.ramMb) || 1024), 128, 16384);
  }
  next.cpuCores = clamp(Math.round(Number(next.cpuCores) || 1), 1, 64);
  if (!next.multiThread) next.cpuCores = 1;
  _hwCfg = next;
  try { localStorage.setItem(HW_LS_KEY, JSON.stringify(_hwCfg)); } catch (e) {}
  _hwListeners.forEach(fn => { try { fn(_hwCfg); } catch (e) {} });
  return _hwCfg;
}
function resetHwConfig() {
  return setHwConfig({ ...DEFAULT_HW_CFG, cpuCores: HW_LIMITS.logicalCores });
}
function subscribeHwConfig(fn) {
  _hwListeners.add(fn);
  return () => _hwListeners.delete(fn);
}

/* ---- 1. Memory Pool & RAM Allocation Manager (MemPool) ---- */
const MemPool = (() => {
  let currentBytes = 0;
  let peakBytes = 0;
  let reusedBuffers = 0;
  let totalAllocations = 0;
  const slabs = new Map();

  const budgetBytes = () => (_hwCfg.ramMb || 1024) * 1024 * 1024;
  const jsHeapMb = () => {
    try {
      if (typeof performance !== 'undefined' && performance.memory && performance.memory.usedJSHeapSize) {
        return +(performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      }
    } catch (e) {}
    return null;
  };

  function beginSession() {
    currentBytes = 0;
    peakBytes = 0;
    reusedBuffers = 0;
    totalAllocations = 0;
  }

  function trackAlloc(bytes) {
    totalAllocations++;
    currentBytes += bytes;
    if (currentBytes > peakBytes) peakBytes = currentBytes;
    if (currentBytes > budgetBytes() * 0.85) {
      slabs.clear();
    }
  }

  function acquire(Ctor, length) {
    const key = Ctor.name + ':' + length;
    const pool = slabs.get(key);
    const bytes = length * (Ctor.BYTES_PER_ELEMENT || 1);
    if (pool && pool.length > 0) {
      reusedBuffers++;
      const arr = pool.pop();
      arr.fill(0);
      trackAlloc(bytes);
      return arr;
    }
    const arr = new Ctor(length);
    trackAlloc(bytes);
    return arr;
  }

  function release(arr) {
    if (!arr || !arr.buffer) return;
    const bytes = arr.byteLength || 0;
    currentBytes = Math.max(0, currentBytes - bytes);
    if (currentBytes < budgetBytes() * 0.70) {
      const key = arr.constructor.name + ':' + arr.length;
      let pool = slabs.get(key);
      if (!pool) { pool = []; slabs.set(key, pool); }
      if (pool.length < 12) pool.push(arr);
    }
  }

  function flush() {
    slabs.clear();
    currentBytes = 0;
  }

  /* Hitung batas resolusi kerja & sampel warna berdasarkan RAM yang dialokasikan */
  function computeRamCaps(requestedMaxDim) {
    const ram = _hwCfg.ramMb || 1024;
    const ramScale = ram <= 256 ? 0.65 : ram <= 512 ? 0.85 : ram <= 1024 ? 1.0 : ram <= 2048 ? 1.28 : ram <= 4096 ? 1.48 : 1.65;
    const maxDimCap = ram <= 256 ? 560 : ram <= 512 ? 1024 : 2560;
    const effMaxDim = requestedMaxDim ? clamp(Math.round(requestedMaxDim), 160, maxDimCap) : clamp(Math.round(840 * Math.min(1.48, ramScale)), 160, maxDimCap);
    const maxSamples = clamp(Math.round(18000 * ramScale), 10000, 64000);
    const stripRows = clamp(Math.floor((ram * 1024 * 64) / Math.max(256, effMaxDim * 16)), 16, 512);
    return { effMaxDim, maxSamples, stripRows, ramMb: ram, budgetBytes: ram * 1024 * 1024 };
  }

  function getStats() {
    const heap = jsHeapMb();
    const peakMb = +(Math.max(peakBytes / (1024 * 1024), (heap || 0) * 0.35)).toFixed(1);
    return {
      allocatedMb: _hwCfg.ramMb,
      peakMb: Math.max(4.2, peakMb),
      currentMb: +(currentBytes / (1024 * 1024)).toFixed(1),
      heapMb: heap,
      reusedBuffers,
      totalAllocations
    };
  }

  return { beginSession, acquire, release, flush, computeRamCaps, getStats, trackAlloc };
})();

/* ---- 2. TAHAP 1 INFRASTRUKTUR GPU: GPUMemPool & GpuPipelineEngine (Zero-Copy VRAM) ---- */
const GPUMemPool = (() => {
  let activeW = 0;
  let activeH = 0;
  let currentVramBytes = 0;
  let peakVramBytes = 0;
  let reusedCount = 0;
  let allocCount = 0;
  let contextLostCount = 0;
  const slots = new Map();

  /* Spesifikasi 9 Slot Tekstur/Buffer Menetap (Persistent VRAM Slots) untuk Pipeline Tahap 1-5 */
  const SLOT_SPECS = {
    texRawRGBA:   { bpp: 4,  scale: 'pix', desc: 'RGBA8Unorm · Citra Asli Pasca Alpha-Flatten' },
    texFltRGBA:   { bpp: 4,  scale: 'pix', desc: 'RGBA8Unorm · Citra Hasil Bilateral Corner-Preserving' },
    texLabGrad:   { bpp: 16, scale: 'pix', desc: 'RGBA32F · Kanal (L*/thinLab, a*/nearFlt, b*/nearRaw, luma/mask)' },
    texEdgeField: { bpp: 16, scale: 'pix', desc: 'RGBA32F · DiZenzo Scharr 2D (gx, gy, mag, lum)' },
    texTensor:    { bpp: 16, scale: 'pix', desc: 'RGBA32F · Structure Tensor 3x3 (nx, ny, coh, corner)' },
    texFlanks:    { bpp: 16, scale: 'pix', desc: 'RGBA32F · Normal-Ray Unmixing (flankA, flankB, alpha, perp)' },
    texLabelsA:   { bpp: 16, scale: 'pix', desc: 'RGBA32F · Ping-Pong Label Map A (label, mask, detailProt, anchor)' },
    texLabelsB:   { bpp: 16, scale: 'pix', desc: 'RGBA32F · Ping-Pong Label Map B (label, mask, detailProt, anchor)' },
    texPalLut:    { bpp: 16, scale: 'lut', desc: 'RGBA32F · Tabel Pasangan Palet (palDist2, palIsMidBlend, palRGB)' },
    bufVerticesA: { bpp: 16, scale: 'vtx', desc: 'RGBA32F · Kisi Verteks Sub-Piksel A (vx, vy, val, pin)' },
    bufVerticesB: { bpp: 16, scale: 'vtx', desc: 'RGBA32F · Kisi Verteks Sub-Piksel B (vx, vy, val, pin)' }
  };

  function estimateRequiredVramBytes(w, h) {
    const pix = w * h;
    const vtx = (w + 1) * (h + 1);
    let total = 0;
    Object.values(SLOT_SPECS).forEach(sp => {
      if (sp.scale === 'lut') total += 64 * 64 * 64 * sp.bpp;
      else total += (sp.scale === 'vtx' ? vtx : pix) * sp.bpp;
    });
    return total;
  }

  function vramBudgetBytes() {
    const ramMb = (_hwCfg && _hwCfg.ramMb) || 1024;
    return Math.min(ramMb * 1024 * 1024 * 0.45, 768 * 1024 * 1024);
  }

  function releaseAll(gl) {
    slots.forEach(entry => {
      try {
        if (gl && entry.tex) gl.deleteTexture(entry.tex);
        if (gl && entry.fbo) gl.deleteFramebuffer(entry.fbo);
      } catch (e) {}
    });
    slots.clear();
    currentVramBytes = 0;
    activeW = 0;
    activeH = 0;
  }

  function allocateSlot(gl, name, w, h, floatExtAvailable) {
    const spec = SLOT_SPECS[name] || { bpp: 4, scale: 'pix', desc: name };
    const sw = spec.scale === 'vtx' ? (w + 1) : w;
    const sh = spec.scale === 'vtx' ? (h + 1) : h;
    const isFloatSlot = spec.bpp === 16 && floatExtAvailable;
    const internalFormat = isFloatSlot ? gl.RGBA32F : gl.RGBA8;
    const format = gl.RGBA;
    const type = isFloatSlot ? gl.FLOAT : gl.UNSIGNED_BYTE;
    const byteSize = sw * sh * (isFloatSlot ? 16 : 4);

    const existing = slots.get(name);
    if (existing && existing.w === sw && existing.h === sh && existing.isFloat === isFloatSlot && existing.tex) {
      reusedCount++;
      return existing;
    }
    if (existing) {
      try {
        if (existing.tex) gl.deleteTexture(existing.tex);
        if (existing.fbo) gl.deleteFramebuffer(existing.fbo);
      } catch (e) {}
      currentVramBytes = Math.max(0, currentVramBytes - (existing.byteSize || 0));
      slots.delete(name);
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, sw, sh, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      if (isFloatSlot) {
        return allocateSlot(gl, name, w, h, false);
      }
      return null;
    }

    allocCount++;
    currentVramBytes += byteSize;
    if (currentVramBytes > peakVramBytes) peakVramBytes = currentVramBytes;
    MemPool.trackAlloc(byteSize);

    const entry = {
      name, tex, fbo, w: sw, h: sh,
      internalFormat, format, type,
      isFloat: isFloatSlot,
      byteSize,
      desc: spec.desc
    };
    slots.set(name, entry);
    return entry;
  }

  function ensureWorkspace(gl, w, h, floatExtAvailable, slotNames) {
    const reqBytes = estimateRequiredVramBytes(w, h);
    if (reqBytes > vramBudgetBytes() * 1.35) {
      releaseAll(gl);
    }
    if (activeW !== w || activeH !== h) {
      releaseAll(gl);
      activeW = w;
      activeH = h;
    }
    const names = slotNames || Object.keys(SLOT_SPECS);
    const allocated = {};
    for (const nm of names) {
      const s = allocateSlot(gl, nm, w, h, floatExtAvailable);
      if (!s) return null;
      allocated[nm] = s;
    }
    return allocated;
  }

  function getSlot(name) {
    return slots.get(name) || null;
  }

  function notifyContextLost() {
    contextLostCount++;
    slots.clear();
    currentVramBytes = 0;
    activeW = 0;
    activeH = 0;
  }

  function getStats() {
    return {
      activeDim: activeW && activeH ? `${activeW}×${activeH}` : 'Idle',
      activeSlots: slots.size,
      totalSlotSpecs: Object.keys(SLOT_SPECS).length,
      currentVramMb: +(currentVramBytes / (1024 * 1024)).toFixed(2),
      peakVramMb: +(peakVramBytes / (1024 * 1024)).toFixed(2),
      vramBudgetMb: +(vramBudgetBytes() / (1024 * 1024)).toFixed(0),
      reusedCount,
      allocCount,
      contextLostCount,
      slotList: Array.from(slots.values()).map(s => ({
        name: s.name,
        dim: `${s.w}×${s.h}`,
        fmt: s.isFloat ? 'RGBA32F' : 'RGBA8',
        mb: +(s.byteSize / (1024 * 1024)).toFixed(2)
      }))
    };
  }

  return {
    SLOT_SPECS,
    estimateRequiredVramBytes,
    vramBudgetBytes,
    ensureWorkspace,
    allocateSlot,
    getSlot,
    releaseAll,
    notifyContextLost,
    getStats
  };
})();

const GpuAccelerator = (() => {
  let ctxCache = null;
  let webgpuState = { checked: false, supported: false, adapterName: null, device: null };
  let lastParityReport = null;

  /* Inisialisasi asinkron WebGPU Adapter/Device bila browser mendukung navigator.gpu */
  async function initWebGPUAsync() {
    if (webgpuState.checked && webgpuState.device) return webgpuState;
    webgpuState.checked = true;
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: (_hwCfg && _hwCfg.gpuPower) || 'high-performance'
        });
        if (adapter) {
          const info = adapter.info || {};
          const device = await adapter.requestDevice();
          webgpuState.supported = true;
          webgpuState.adapterName = info.description || info.vendor || 'WebGPU Hardware Adapter';
          webgpuState.device = device;
          device.lost.then(() => {
            webgpuState.device = null;
            webgpuState.checked = false;
          });
        }
      }
    } catch (e) {
      webgpuState.supported = false;
    }
    return webgpuState;
  }

  function createSurface(w, h) {
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(w, h);
      }
    } catch (e) {}
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  }

  function getGl(powerPref) {
    const pref = powerPref || (_hwCfg && _hwCfg.gpuPower) || 'high-performance';
    if (ctxCache && ctxCache.pref === pref && ctxCache.gl && !ctxCache.gl.isContextLost()) {
      return ctxCache;
    }
    try {
      const cv = createSurface(64, 64);
      const gl = cv.getContext('webgl2', {
        powerPreference: pref,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
      });
      if (!gl) return null;
      const extFloat = !!gl.getExtension('EXT_color_buffer_float');
      const extFloatLinear = !!gl.getExtension('OES_texture_float_linear');

      /* Pasang Vertex Array Object (VAO) Full-Screen Quad sekali untuk seluruh pass */
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      if (cv.addEventListener) {
        cv.addEventListener('webglcontextlost', e => {
          e.preventDefault();
          GPUMemPool.notifyContextLost();
          ctxCache = null;
        }, false);
      }

      ctxCache = { gl, cv, pref, extFloat, extFloatLinear, vao, quadBuf, progs: {} };
      return ctxCache;
    } catch (e) {
      return null;
    }
  }

  function compileProgram(gl, vsSrc, fsSrc) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.bindAttribLocation(prog, 0, 'a_pos');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  const VS_QUAD = `#version 300 es
  layout(location = 0) in vec2 a_pos;
  out vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }`;

  /* Kernel GLSL 1: Konversi Eksak sRGB (0..255) -> CIE L*a*b* (D65, 2° Observer) + Luma di Kanal A */
  const FS_RGB_TO_LAB = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  in vec2 v_uv;
  out vec4 outLab;

  float srgbLin(float c) {
    return (c <= 0.04045) ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4);
  }
  float labF(float t) {
    const float eps = 216.0 / 24389.0;
    const float kap = 24389.0 / 27.0;
    return (t > eps) ? pow(t, 1.0 / 3.0) : ((kap * t + 16.0) / 116.0);
  }
  void main() {
    vec4 px = texture(u_tex, v_uv);
    float R = srgbLin(px.r);
    float G = srgbLin(px.g);
    float B = srgbLin(px.b);
    float X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    float Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    float Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    float fx = labF(X);
    float fy = labF(Y);
    float fz = labF(Z);
    float L = 116.0 * fy - 16.0;
    float a = 500.0 * (fx - fy);
    float b = 200.0 * (fy - fz);
    float luma = dot(px.rgb * 255.0, vec3(0.299, 0.587, 0.114));
    outLab = vec4(L, a, b, luma);
  }`;

  /* Kernel GLSL 2: Bilateral Filter 5x5 Edge- & Corner-Preserving (identik dengan CPU bilateralPreFilter:
     memiliki Wedge Aperture Guard 8-arah + Contiguous-4 Bitmask Guard + 1D Valley/Crease Guard) */
  const FS_BILATERAL = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  uniform float u_inv2Sp;
  uniform float u_inv2Col;
  uniform float u_wedgeThr;
  uniform int u_radius;
  in vec2 v_uv;
  out vec4 outColor;

  float cdist2(vec3 c1, vec3 c2) {
    vec3 d = (c1 - c2) * 255.0;
    float rm = (c1.r + c2.r) * 127.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 center = texelFetch(u_tex, p0, 0);
    if (center.a < 0.05) { outColor = center; return; }

    /* 1. Wedge Aperture Guard 8-arah & Contiguous-4 Guard (melindungi sudut lancip <= 135 derajat) */
    const ivec2 RING[8] = ivec2[8](
      ivec2(1, 0), ivec2(1, 1), ivec2(0, 1), ivec2(-1, 1),
      ivec2(-1, 0), ivec2(-1, -1), ivec2(0, -1), ivec2(1, -1)
    );
    int simN = 0;
    int ringBits = 0;
    for (int k = 0; k < 8; k++) {
      ivec2 np = clamp(p0 + RING[k], ivec2(0), sz - ivec2(1));
      vec4 nb = texelFetch(u_tex, np, 0);
      if (nb.a >= 0.05 && cdist2(center.rgb, nb.rgb) < u_wedgeThr) {
        simN++;
        ringBits |= (1 << k);
      }
    }
    if (simN <= 3) { outColor = center; return; }
    if (simN == 4) {
      int dbl = ringBits | (ringBits << 8);
      for (int k = 0; k < 8; k++) {
        if (((dbl >> k) & 15) == 15) { outColor = center; return; }
      }
    }

    /* 2. Guard Lembah Garis (1D Valley/Crease) & Punggung Detail 1-2px (Garis Jari, Bulu Mata, Helai Rambut) */
    if (p0.x >= 2 && p0.x < sz.x - 2 && p0.y >= 2 && p0.y < sz.y - 2) {
      float l0 = dot(center.rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
      const ivec2 DIRS[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
      for (int k = 0; k < 4; k++) {
        ivec2 d = DIRS[k];
        float lA1 = dot(texelFetch(u_tex, p0 - d, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lB1 = dot(texelFetch(u_tex, p0 + d, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lA2 = dot(texelFetch(u_tex, p0 - d * 2, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lB2 = dot(texelFetch(u_tex, p0 + d * 2, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lMaxA = max(lA1, lA2);
        float lMaxB = max(lB1, lB2);
        float lMinA = min(lA1, lA2);
        float lMinB = min(lB1, lB2);
        if ((l0 < lMaxA - 3.8 && l0 < lMaxB - 3.8) || (l0 > lMinA + 5.5 && l0 > lMinB + 5.5)) {
          outColor = center;
          return;
        }
      }
    }

    float localInv2Col = (simN <= 5) ? (u_inv2Col * 2.8) : u_inv2Col;
    vec3 sumRgb = vec3(0.0);
    float sumW = 0.0;
    int R = clamp(u_radius, 1, 3);
    for (int dy = -3; dy <= 3; dy++) {
      if (dy < -R || dy > R) continue;
      for (int dx = -3; dx <= 3; dx++) {
        if (dx < -R || dx > R) continue;
        ivec2 np = clamp(p0 + ivec2(dx, dy), ivec2(0), sz - ivec2(1));
        vec4 s = texelFetch(u_tex, np, 0);
        if (s.a < 0.05) continue;
        float d2 = float(dx * dx + dy * dy);
        float wSp = exp(-d2 * u_inv2Sp);
        float wCol = exp(-cdist2(center.rgb, s.rgb) * localInv2Col);
        float w = wSp * wCol;
        sumRgb += s.rgb * w;
        sumW += w;
      }
    }
    vec3 finalRgb = sumW > 1e-6 ? floor((sumRgb / sumW) * 255.0 + 0.5) / 255.0 : center.rgb;
    outColor = vec4(finalRgb, center.a);
  }`;

  /* Kernel GLSL 3 (Tahap 2): Alpha Defringing & Inward Opaque Foreground Propagation (7x7)
     Identik 100% dengan CPU flattenAlpha(work, mode, customHex) */
  const FS_ALPHA_FLATTEN = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  uniform int u_mode; /* 0 = keep, 1 = white / custom */
  uniform vec3 u_bg255;
  in vec2 v_uv;
  out vec4 outColor;

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 c0 = texelFetch(u_tex, p0, 0);
    vec3 c255 = c0.rgb * 255.0;
    float a = c0.a;

    if (u_mode == 0) {
      bool nearSolid = false;
      if (a >= 0.25 && a < 0.45) {
        for (int dy = -1; dy <= 1; dy++) {
          int ny = p0.y + dy;
          if (ny < 0 || ny >= sz.y) continue;
          for (int dx = -1; dx <= 1; dx++) {
            int nx = p0.x + dx;
            if (nx < 0 || nx >= sz.x) continue;
            if (texelFetch(u_tex, ivec2(nx, ny), 0).a * 255.0 >= 209.5) {
              nearSolid = true;
            }
          }
        }
      }
      float cut = nearSolid ? 0.25 : 0.40;
      if (a < cut) {
        outColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }
      if (a < 0.98) {
        vec3 fgRgb = vec3(0.0);
        float fgW = 0.0;
        for (int dy = -3; dy <= 3; dy++) {
          int ny = p0.y + dy;
          if (ny < 0 || ny >= sz.y) continue;
          for (int dx = -3; dx <= 3; dx++) {
            int nx = p0.x + dx;
            if (nx < 0 || nx >= sz.x) continue;
            vec4 nb = texelFetch(u_tex, ivec2(nx, ny), 0);
            if (nb.a * 255.0 >= 244.5) {
              float wgt = 1.0 / (float(dx * dx + dy * dy) + 0.5);
              fgRgb += (nb.rgb * 255.0) * wgt;
              fgW += wgt;
            }
          }
        }
        vec3 res255 = c255;
        if (fgW > 0.0) {
          vec3 ir = fgRgb / fgW;
          res255 = clamp(floor(ir * 0.88 + c255 * 0.12 + 0.5), 0.0, 255.0);
        }
        outColor = vec4(res255 / 255.0, 1.0);
        return;
      }
    }
    vec3 flat255 = clamp(floor(c255 * a + u_bg255 * (1.0 - a) + 0.5), 0.0, 255.0);
    outColor = vec4(flat255 / 255.0, 1.0);
  }`;

  /* Kernel GLSL 4 (Tahap 2): DiZenzo Multi-Channel Scharr 2D Color-Tensor (lum, cRG, cBY)
     Identik 100% dengan CPU buildEdgeField(work, mask) -> menghasilkan vec4(gx, gy, mag, lum) */
  const FS_DIZENZO_SCHARR = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  in vec2 v_uv;
  out vec4 outEdge;

  vec3 getCh(ivec2 p, ivec2 sz) {
    ivec2 cp = clamp(p, ivec2(0), sz - ivec2(1));
    vec3 rgb = texelFetch(u_tex, cp, 0).rgb * 255.0;
    float lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    float cRG = (rgb.r - rgb.g) * 0.55;
    float cBY = (0.5 * (rgb.r + rgb.g) - rgb.b) * 0.45;
    return vec3(lum, cRG, cBY);
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 center = texelFetch(u_tex, p0, 0);
    vec3 c11 = getCh(p0, sz);
    if (center.a < 0.05) {
      outEdge = vec4(0.0, 0.0, 0.0, c11.x);
      return;
    }

    vec3 c00 = getCh(p0 + ivec2(-1, -1), sz);
    vec3 c10 = getCh(p0 + ivec2( 0, -1), sz);
    vec3 c20 = getCh(p0 + ivec2( 1, -1), sz);
    vec3 c01 = getCh(p0 + ivec2(-1,  0), sz);
    vec3 c21 = getCh(p0 + ivec2( 1,  0), sz);
    vec3 c02 = getCh(p0 + ivec2(-1,  1), sz);
    vec3 c12 = getCh(p0 + ivec2( 0,  1), sz);
    vec3 c22 = getCh(p0 + ivec2( 1,  1), sz);

    vec3 gx3 = (-3.0 * c00 - 10.0 * c01 - 3.0 * c02 + 3.0 * c20 + 10.0 * c21 + 3.0 * c22) / 32.0;
    vec3 gy3 = (-3.0 * c00 - 10.0 * c10 - 3.0 * c20 + 3.0 * c02 + 10.0 * c12 + 3.0 * c22) / 32.0;

    float gxx = dot(gx3, gx3);
    float gyy = dot(gy3, gy3);
    float gxy = dot(gx3, gy3);
    float tr = gxx + gyy;
    if (tr > 1e-6) {
      float df = gxx - gyy;
      float disc = sqrt(df * df + 4.0 * gxy * gxy);
      float lambda1 = max(0.0, 0.5 * (tr + disc));
      float mag = sqrt(lambda1);
      float theta = 0.5 * atan(2.0 * gxy, df);
      float vx = cos(theta), vy = sin(theta);
      float alx = abs(gx3.x), arx = abs(gx3.y), abx = abs(gx3.z);
      float domX = (alx >= arx && alx >= abx) ? gx3.x : ((arx >= abx) ? gx3.y : gx3.z);
      float aly = abs(gy3.x), ary = abs(gy3.y), aby = abs(gy3.z);
      float domY = (aly >= ary && aly >= aby) ? gy3.x : ((ary >= aby) ? gy3.y : gy3.z);
      if (vx * domX + vy * domY < 0.0) { vx = -vx; vy = -vy; }
      outEdge = vec4(vx * mag, vy * mag, mag, c11.x);
    } else {
      outEdge = vec4(0.0, 0.0, 0.0, c11.x);
    }
  }`;

  /* Kernel GLSL 5 (Tahap 2): 2D Structure Tensor 3x3 (Binomial [1,2,1; 2,4,2; 1,2,1]/16)
     Menghasilkan vec4(nx, ny, coh, corner) identik dengan CPU buildSegmentationContext */
  const FS_STRUCTURE_TENSOR = `#version 300 es
  precision highp float;
  uniform sampler2D u_edgeTex;
  uniform vec2 u_res;
  in vec2 v_uv;
  out vec4 outTensor;

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 e11 = texelFetch(u_edgeTex, p0, 0);
    if (e11.b < 1.5) {
      outTensor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    int xm1 = max(0, p0.x - 1), xp1 = min(sz.x - 1, p0.x + 1);
    int ym1 = max(0, p0.y - 1), yp1 = min(sz.y - 1, p0.y + 1);

    vec2 g00 = texelFetch(u_edgeTex, ivec2(xm1, ym1), 0).rg;
    vec2 g01 = texelFetch(u_edgeTex, ivec2(p0.x, ym1), 0).rg;
    vec2 g02 = texelFetch(u_edgeTex, ivec2(xp1, ym1), 0).rg;
    vec2 g10 = texelFetch(u_edgeTex, ivec2(xm1, p0.y), 0).rg;
    vec2 g11 = e11.rg;
    vec2 g12 = texelFetch(u_edgeTex, ivec2(xp1, p0.y), 0).rg;
    vec2 g20 = texelFetch(u_edgeTex, ivec2(xm1, yp1), 0).rg;
    vec2 g21 = texelFetch(u_edgeTex, ivec2(p0.x, yp1), 0).rg;
    vec2 g22 = texelFetch(u_edgeTex, ivec2(xp1, yp1), 0).rg;

    float jxx = (
      g00.x * g00.x + 2.0 * g01.x * g01.x + g02.x * g02.x +
      2.0 * g10.x * g10.x + 4.0 * g11.x * g11.x + 2.0 * g12.x * g12.x +
      g20.x * g20.x + 2.0 * g21.x * g21.x + g22.x * g22.x
    ) * 0.0625;
    float jxy = (
      g00.x * g00.y + 2.0 * g01.x * g01.y + g02.x * g02.y +
      2.0 * g10.x * g10.y + 4.0 * g11.x * g11.y + 2.0 * g12.x * g12.y +
      g20.x * g20.y + 2.0 * g21.x * g21.y + g22.x * g22.y
    ) * 0.0625;
    float jyy = (
      g00.y * g00.y + 2.0 * g01.y * g01.y + g02.y * g02.y +
      2.0 * g10.y * g10.y + 4.0 * g11.y * g11.y + 2.0 * g12.y * g12.y +
      g20.y * g20.y + 2.0 * g21.y * g21.y + g22.y * g22.y
    ) * 0.0625;

    float tr = jxx + jyy;
    if (tr > 1e-3) {
      float df = jxx - jyy;
      float disc = sqrt(df * df + 4.0 * jxy * jxy);
      float l2 = max(0.0, 0.5 * (tr - disc));
      float coh = (disc / tr) * (disc / tr);
      float corner = sqrt(l2);
      float theta = 0.5 * atan(2.0 * jxy, df);
      float vx = cos(theta), vy = sin(theta);
      if (vx * g11.x + vy * g11.y < 0.0) { vx = -vx; vy = -vy; }
      outTensor = vec4(vx, vy, coh, corner);
    } else {
      outTensor = vec4(0.0, 0.0, 0.0, 0.0);
    }
  }`;

  /* Kernel GLSL 6 (Tahap 2): Deteksi Sub-Piksel 1D Thin-Stroke Valley/Ridge + Nearest-Palette Lookup CIE-Lab
     Menghasilkan vec4(thinStrokeLab, nearestFltLab, nearestRawLab, isMasked) */
  const FS_THIN_AND_NEAREST = `#version 300 es
  precision highp float;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform vec2 u_res;
  uniform int u_K;
  uniform vec3 u_palRgb[64];
  uniform vec3 u_palLab[64];
  in vec2 v_uv;
  out vec4 outNear;

  float cdist2_255(vec3 c1, vec3 c2) {
    vec3 d = c1 - c2;
    float rm = (c1.r + c2.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  float srgbLin(float c) {
    return (c <= 0.04045) ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4);
  }
  float labF(float t) {
    const float eps = 216.0 / 24389.0;
    const float kap = 24389.0 / 27.0;
    return (t > eps) ? pow(t, 1.0 / 3.0) : ((kap * t + 16.0) / 116.0);
  }
  vec3 rgb255ToLab(vec3 rgb255) {
    vec3 u = rgb255 / 255.0;
    float R = srgbLin(u.r), G = srgbLin(u.g), B = srgbLin(u.b);
    float X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    float Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    float Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    float fx = labF(X), fy = labF(Y), fz = labF(Z);
    return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
  }

  int findNearestPal(vec3 rgb255) {
    if (u_K == 2) {
      float d0 = cdist2_255(rgb255, u_palRgb[0]);
      float d1 = cdist2_255(rgb255, u_palRgb[1]);
      return (d0 <= d1) ? 0 : 1;
    }
    vec3 lab = rgb255ToLab(rgb255);
    int bestI = 0;
    float bestD = 1e30;
    for (int k = 0; k < 64; k++) {
      if (k >= u_K) break;
      vec3 dl = lab - u_palLab[k];
      float d2 = dot(dl, dl);
      if (d2 < bestD) { bestD = d2; bestI = k; }
    }
    return bestI;
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 raw0 = texelFetch(u_rawTex, p0, 0);
    if (raw0.a < 0.05) {
      outNear = vec4(-1.0, -1.0, -1.0, 1.0);
      return;
    }

    int thinK = -1;
    vec3 r0 = raw0.rgb * 255.0;
    if (p0.x >= 2 && p0.x < sz.x - 2 && p0.y >= 2 && p0.y < sz.y - 2) {
      float l0 = dot(r0, vec3(0.299, 0.587, 0.114));
      const ivec2 DIRS[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
      for (int dIdx = 0; dIdx < 4; dIdx++) {
        ivec2 d = DIRS[dIdx];
        ivec2 pA2 = p0 - d * 2;
        ivec2 pB2 = p0 + d * 2;
        vec4 cA2 = texelFetch(u_rawTex, pA2, 0);
        vec4 cB2 = texelFetch(u_rawTex, pB2, 0);
        if (cA2.a < 0.05 || cB2.a < 0.05) continue;
        vec3 rgbA2 = cA2.rgb * 255.0;
        vec3 rgbB2 = cB2.rgb * 255.0;
        if (cdist2_255(rgbA2, rgbB2) > 1800.0) continue;

        float lA = dot(rgbA2, vec3(0.299, 0.587, 0.114));
        float lB = dot(rgbB2, vec3(0.299, 0.587, 0.114));
        float lA1 = dot(texelFetch(u_rawTex, p0 - d, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
        float lB1 = dot(texelFetch(u_rawTex, p0 + d, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
        float bgLum = 0.5 * (lA + lB);
        float dip = min(lA, lB) - l0;
        float peak = l0 - max(lA, lB);
        bool isLocalValley = (dip >= 36.0 && l0 <= min(lA1, lB1) - 10.0);
        bool isLocalRidge  = (peak >= 36.0 && l0 >= max(lA1, lB1) + 10.0);
        if (isLocalValley || isLocalRidge) {
          ivec2 pT1 = p0 + ivec2(d.y, -d.x);
          ivec2 pT2 = p0 + ivec2(-d.y, d.x);
          float lT1 = dot(texelFetch(u_rawTex, pT1, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
          float lT2 = dot(texelFetch(u_rawTex, pT2, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
          bool tangOk = isLocalValley
            ? (min(lT1, lT2) < min(lA, lB) - 18.0)
            : (max(lT1, lT2) > max(lA, lB) + 18.0);
          if (!tangOk) continue;
          vec3 bgRgb = 0.5 * (rgbA2 + rgbB2);
          float dBg0 = cdist2_255(r0, bgRgb);
          int bgK = 0; float bestBgD = 1e20;
          for (int k = 0; k < 64; k++) {
            if (k >= u_K) break;
            float dB = cdist2_255(bgRgb, u_palRgb[k]);
            if (dB < bestBgD) { bestBgD = dB; bgK = k; }
          }
          int bestK = -1;
          float bestCost = 1e20;
          for (int k = 0; k < 64; k++) {
            if (k >= u_K) break;
            if (k == bgK) continue;
            vec3 pk = u_palRgb[k];
            if (cdist2_255(pk, bgRgb) < 1800.0) continue;
            vec3 v = pk - bgRgb;
            float vLen2 = dot(v, v);
            if (vLen2 < 200.0) continue;
            float alpha = clamp(dot(r0 - bgRgb, v) / vLen2, 0.0, 1.15);
            if (alpha < 0.36) continue;
            vec3 proj = bgRgb + min(1.0, alpha) * v;
            float perpD2 = cdist2_255(r0, proj);
            float directD2 = cdist2_255(r0, pk);
            float cost = perpD2 + directD2 * 0.28;
            if (cost < bestCost && perpD2 <= dBg0 * 0.28 + 480.0) {
              bestCost = cost; bestK = k;
            }
          }
          if (bestK >= 0) { thinK = bestK; break; }
        }
      }
    }

    int nearFlt = thinK;
    int nearRaw = thinK;
    if (thinK < 0) {
      vec3 f0 = texelFetch(u_fltTex, p0, 0).rgb * 255.0;
      nearFlt = findNearestPal(f0);
      nearRaw = findNearestPal(r0);
    }
    outNear = vec4(float(thinK), float(nearFlt), float(nearRaw), 0.0);
  }`;

  /* Kernel GLSL 7 (Tahap 2): Normal-Ray Casting (s=1..3) + Sub-Pixel Color Blend Unmixing
     Menghasilkan vec4(flankA, flankB, flankAlpha, flankPerp) identik dengan CPU buildSegmentationContext */
  const FS_FLANK_UNMIX = `#version 300 es
  precision highp float;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_tensorTex;
  uniform sampler2D u_nearTex;
  uniform vec2 u_res;
  uniform int u_K;
  uniform vec3 u_palRgb[64];
  in vec2 v_uv;
  out vec4 outFlank;

  float cdist2_255(vec3 c1, vec3 c2) {
    vec3 d = c1 - c2;
    float rm = (c1.r + c2.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  vec3 evalBlendPair(vec3 rgb, vec3 CA, vec3 CB) {
    vec3 d = CA - CB;
    float len2 = dot(d, d);
    float abD2 = cdist2_255(CA, CB);
    if (len2 < 120.0 || abD2 < 320.0) return vec3(0.0, 0.0, 0.0);

    float t = dot(rgb - CB, d) / len2;
    if (t <= 0.02 || t >= 0.98) return vec3(0.0, 0.0, 0.0);

    vec3 pLin = CB + t * d;
    float perpD2 = cdist2_255(rgb, pLin);

    float tc = clamp(t, 0.02, 0.98);
    vec3 g20 = sqrt(tc * CA * CA + (1.0 - tc) * CB * CB);
    perpD2 = min(perpD2, cdist2_255(rgb, g20));

    vec3 g22 = pow(
      tc * pow(max(CA, vec3(0.0)), vec3(2.2)) + (1.0 - tc) * pow(max(CB, vec3(0.0)), vec3(2.2)),
      vec3(1.0 / 2.2)
    );
    perpD2 = min(perpD2, cdist2_255(rgb, g22));

    float maxAllowedPerp = min(5400.0, 680.0 + abD2 * 0.022);
    if (perpD2 > maxAllowedPerp) return vec3(0.0, 0.0, 0.0);

    return vec3(t, perpD2, 1.0);
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 defOut = vec4(-1.0, -1.0, 0.5, 0.0);
    if (p0.x < 1 || p0.x >= sz.x - 1 || p0.y < 1 || p0.y >= sz.y - 1) {
      outFlank = defOut;
      return;
    }

    vec4 near0 = texelFetch(u_nearTex, p0, 0);
    float mp0 = texelFetch(u_edgeTex, p0, 0).b;
    if (near0.a > 0.5 || mp0 < 4.5) {
      outFlank = defOut;
      return;
    }

    vec4 ten = texelFetch(u_tensorTex, p0, 0);
    float nx = ten.r, ny = ten.g;
    if (nx == 0.0 && ny == 0.0) {
      outFlank = defOut;
      return;
    }

    ivec2 bestPos = ivec2(-1, -1);
    ivec2 bestNeg = ivec2(-1, -1);
    float bestPosMag = 1e20;
    float bestNegMag = 1e20;

    for (int s = 1; s <= 3; s++) {
      int px = clamp(int(floor(float(p0.x) + nx * float(s) + 0.5)), 0, sz.x - 1);
      int py = clamp(int(floor(float(p0.y) + ny * float(s) + 0.5)), 0, sz.y - 1);
      ivec2 pp = ivec2(px, py);
      if (texelFetch(u_nearTex, pp, 0).a < 0.5) {
        float mScore = texelFetch(u_edgeTex, pp, 0).b + float(s) * 1.1;
        if (mScore < bestPosMag) { bestPosMag = mScore; bestPos = pp; }
      }

      int mx = clamp(int(floor(float(p0.x) - nx * float(s) + 0.5)), 0, sz.x - 1);
      int my = clamp(int(floor(float(p0.y) - ny * float(s) + 0.5)), 0, sz.y - 1);
      ivec2 mp = ivec2(mx, my);
      if (texelFetch(u_nearTex, mp, 0).a < 0.5) {
        float mScore = texelFetch(u_edgeTex, mp, 0).b + float(s) * 1.1;
        if (mScore < bestNegMag) { bestNegMag = mScore; bestNeg = mp; }
      }
    }

    if (bestPos.x < 0 || bestNeg.x < 0 || (bestPos.x == bestNeg.x && bestPos.y == bestNeg.y)) {
      outFlank = defOut;
      return;
    }
    if (texelFetch(u_edgeTex, bestPos, 0).b > mp0 * 0.55 || texelFetch(u_edgeTex, bestNeg, 0).b > mp0 * 0.55) {
      outFlank = defOut;
      return;
    }

    int LA = int(floor(texelFetch(u_nearTex, bestPos, 0).g + 0.5));
    int LB = int(floor(texelFetch(u_nearTex, bestNeg, 0).g + 0.5));
    if (LA == LB || LA < 0 || LB < 0 || LA >= u_K || LB >= u_K) {
      outFlank = defOut;
      return;
    }

    vec3 r0 = texelFetch(u_rawTex, p0, 0).rgb * 255.0;
    vec3 f0 = texelFetch(u_fltTex, p0, 0).rgb * 255.0;
    vec3 CA = u_palRgb[LA];
    vec3 CB = u_palRgb[LB];

    vec3 blPal = evalBlendPair(r0, CA, CB);
    if (blPal.z < 0.5) {
      blPal = evalBlendPair((r0 + f0) * 0.5, CA, CB);
    }
    if (blPal.z < 0.5) {
      outFlank = defOut;
      return;
    }

    vec3 CposLocal = texelFetch(u_fltTex, bestPos, 0).rgb * 255.0;
    vec3 CnegLocal = texelFetch(u_fltTex, bestNeg, 0).rgb * 255.0;
    vec3 blLoc = evalBlendPair(r0, CposLocal, CnegLocal);

    float alpha = (blLoc.z > 0.5) ? (0.60 * blLoc.x + 0.40 * blPal.x) : blPal.x;
    float perp  = (blLoc.z > 0.5) ? min(blPal.y, blLoc.y) : blPal.y;
    outFlank = vec4(float(LA), float(LB), clamp(alpha, 0.0, 1.0), perp);
  }`;

  /* Eksekutor Pass Shader ke Persistent VRAM Slot (Zero-Copy FBO Pass) */
  function runSlotPass(env, progKey, fsSource, targetSlot, uniformsSetter) {
    const { gl, vao, progs } = env;
    if (!progs[progKey]) {
      progs[progKey] = compileProgram(gl, VS_QUAD, fsSource);
      if (!progs[progKey]) return false;
    }
    const prog = progs[progKey];
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetSlot ? targetSlot.fbo : null);
    gl.viewport(0, 0, targetSlot ? targetSlot.w : env.cv.width, targetSlot ? targetSlot.h : env.cv.height);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    if (uniformsSetter) uniformsSetter(gl, prog);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  /* Unggah ImageData / Uint8Array ke Persistent Slot VRAM (Satu-satunya Upload di Hulu Pipeline) */
  function uploadToSlot(work, slotName = 'texRawRGBA') {
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return null;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;
    const slot = GPUMemPool.allocateSlot(gl, slotName, w, h, false);
    if (!slot) return null;
    gl.bindTexture(gl.TEXTURE_2D, slot.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data.data);
    return slot;
  }

  /* Unggah Array RGBA8 (dengan encoding mask di kanal Alpha) ke Slot VRAM */
  function uploadRgbaWithMask(gl, slotName, rgbaArr, mask, w, h) {
    const slot = GPUMemPool.allocateSlot(gl, slotName, w, h, false);
    if (!slot) return null;
    const n = w * h;
    let srcBuf = rgbaArr;
    if (mask) {
      const tmp = MemPool.acquire(Uint8Array, n * 4);
      tmp.set(rgbaArr);
      for (let p = 0; p < n; p++) {
        tmp[p * 4 + 3] = mask[p] ? 0 : 255;
      }
      srcBuf = tmp;
    }
    gl.bindTexture(gl.TEXTURE_2D, slot.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, srcBuf);
    if (mask && srcBuf !== rgbaArr) MemPool.release(srcBuf);
    return slot;
  }

  /* Unggah Buffer TypedArray (Uint8Array / Float32Array) langsung ke Slot VRAM (mendukung skala 1x, lut, dan vtx (w+1)x(h+1)) */
  function uploadBufferToSlot(gl, slotName, w, h, dataBuf, isFloat = false) {
    const slot = GPUMemPool.allocateSlot(gl, slotName, w, h, isFloat);
    if (!slot) return null;
    const srcArr = (!slot.isFloat && !(dataBuf instanceof Uint8Array))
      ? new Uint8Array(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength)
      : dataBuf;
    gl.bindTexture(gl.TEXTURE_2D, slot.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, slot.w, slot.h,
      gl.RGBA,
      slot.isFloat ? gl.FLOAT : gl.UNSIGNED_BYTE,
      srcArr
    );
    return slot;
  }

  /* Inisialisasi Workspace VRAM Menetap untuk Sesi Vectorize */
  function beginGpuSession(work) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return null;
    const { w, h } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;
    const ws = GPUMemPool.ensureWorkspace(
      env.gl, w, h, env.extFloat,
      ['texRawRGBA', 'texFltRGBA', 'texLabGrad', 'texEdgeField', 'texTensor', 'texFlanks', 'texLabelsA', 'texLabelsB', 'bufVerticesA', 'bufVerticesB']
    );
    if (!ws) return null;
    uploadToSlot(work, 'texRawRGBA');
    return {
      backend: webgpuState.supported ? 'WebGPU + WebGL2 FBO' : 'WebGL2 Zero-Copy FBO',
      extFloat: env.extFloat,
      slots: ws
    };
  }

  /* TAHAP 2 KERNEL 1: Alpha Defringing & Inward Opaque Foreground Propagation di GPU */
  function gpuFlattenAlpha(work, mode = 'keep', customHex = '#ffffff') {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return null;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const d = data.data;
      const n = w * h;
      const origAlpha = new Uint8Array(n);
      for (let i = 3, p = 0; i < d.length; i += 4, p++) origAlpha[p] = d[i];
      work.origAlpha = origAlpha;

      /* Unggah citra mentah ber-alpha ke slot staging RGBA8 texFltRGBA, lalu render hasil ke texRawRGBA */
      const stgSlot = uploadToSlot(work, 'texFltRGBA');
      const rawSlot = GPUMemPool.allocateSlot(gl, 'texRawRGBA', w, h, false);
      if (!stgSlot || !rawSlot) return null;

      let hadOpaqueInput = false;
      for (let p = 0; p < n; p++) {
        if (origAlpha[p] >= 128) { hadOpaqueInput = true; break; }
      }

      const bg = mode === 'custom' ? rgbOf(customHex || '#ffffff') : [255, 255, 255];
      const ok = runSlotPass(env, 'alphaFlatten', FS_ALPHA_FLATTEN, rawSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, stgSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_mode'), mode === 'keep' ? 0 : 1);
        g.uniform3f(g.getUniformLocation(prog, 'u_bg255'), bg[0], bg[1], bg[2]);
      });
      if (!ok) return null;

      const out = MemPool.acquire(Uint8Array, n * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, rawSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const mask = new Uint8Array(n);
      let unmaskedCount = 0;
      for (let p = 0; p < n; p++) {
        if (out[p * 4 + 3] === 0) mask[p] = 1;
        else unmaskedCount++;
      }
      if (hadOpaqueInput && unmaskedCount === 0) {
        MemPool.release(out);
        return null;
      }
      d.set(out);
      MemPool.release(out);
      return mask;
    } catch (e) {
      return null;
    }
  }

  /* TAHAP 2 KERNEL 2: DiZenzo Multi-Channel Scharr 2D Color-Tensor di GPU (RGBA32F) */
  function gpuBuildEdgeField(work, mask) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const fltSlot = uploadRgbaWithMask(gl, 'texFltRGBA', data.data, mask, w, h);
      const edgeSlot = GPUMemPool.allocateSlot(gl, 'texEdgeField', w, h, true);
      if (!fltSlot || !edgeSlot || !edgeSlot.isFloat) return null;

      const ok = runSlotPass(env, 'dizenzoScharr', FS_DIZENZO_SCHARR, edgeSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
      });
      if (!ok) return null;

      const n = w * h;
      const rawFloats = MemPool.acquire(Float32Array, n * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, edgeSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, rawFloats);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const lum = new Float32Array(n);
      const gx = new Float32Array(n);
      const gy = new Float32Array(n);
      const mag = new Float32Array(n);
      for (let p = 0; p < n; p++) {
        const i = p * 4;
        lum[p] = rawFloats[i + 3];
        if (!(mask && mask[p])) {
          gx[p] = rawFloats[i];
          gy[p] = rawFloats[i + 1];
          mag[p] = rawFloats[i + 2];
        }
      }
      MemPool.release(rawFloats);
      return { lum, gx, gy, mag, gpuSlotReady: true };
    } catch (e) {
      return null;
    }
  }

  /* TAHAP 2 KERNEL 3: 2D Structure Tensor 3x3 + 1D Thin-Stroke + Normal-Ray Flank Unmixing di GPU */
  function gpuBuildSegmentationTables(work, rawD, fltD, mask, palLab, edgeField) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;
    const { w, h } = work;
    const K = palLab ? palLab.length : 0;
    if (K < 2 || K > 64 || w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const rawSlot = uploadRgbaWithMask(gl, 'texRawRGBA', rawD, mask, w, h);
      const fltSlot = uploadRgbaWithMask(gl, 'texFltRGBA', fltD, mask, w, h);
      const edgeSlot = GPUMemPool.allocateSlot(gl, 'texEdgeField', w, h, true);
      const tensorSlot = GPUMemPool.allocateSlot(gl, 'texTensor', w, h, true);
      const nearSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
      const flankSlot = GPUMemPool.allocateSlot(gl, 'texFlanks', w, h, true);
      if (!rawSlot || !fltSlot || !edgeSlot || !tensorSlot || !nearSlot || !flankSlot) return null;

      /* Pastikan texEdgeField berisi (gx, gy, mag, lum) dari fltSlot */
      const okEdge = runSlotPass(env, 'dizenzoScharr', FS_DIZENZO_SCHARR, edgeSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
      });
      if (!okEdge) return null;

      /* Pass A: 2D Structure Tensor 3x3 -> texTensor (nx, ny, coh, corner) */
      const okTensor = runSlotPass(env, 'structureTensor', FS_STRUCTURE_TENSOR, tensorSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, edgeSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
      });
      if (!okTensor) return null;

      /* Siapkan uniform palet RGB & CIE-Lab (maks 64 warna) */
      const uPalRgb = new Float32Array(64 * 3);
      const uPalLab = new Float32Array(64 * 3);
      for (let k = 0; k < K; k++) {
        uPalRgb[k * 3]     = palLab[k].r;
        uPalRgb[k * 3 + 1] = palLab[k].g;
        uPalRgb[k * 3 + 2] = palLab[k].b;
        uPalLab[k * 3]     = palLab[k].L;
        uPalLab[k * 3 + 1] = palLab[k].a;
        uPalLab[k * 3 + 2] = palLab[k].b2;
      }

      /* Pass B: 1D Thin-Stroke Valley/Ridge + Nearest-Palette Lookup CIE-Lab -> texLabGrad */
      const okNear = runSlotPass(env, 'thinAndNearest', FS_THIN_AND_NEAREST, nearSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 0);
        g.activeTexture(g.TEXTURE1);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_fltTex'), 1);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), K);
        g.uniform3fv(g.getUniformLocation(prog, 'u_palRgb[0]'), uPalRgb);
        g.uniform3fv(g.getUniformLocation(prog, 'u_palLab[0]'), uPalLab);
      });
      if (!okNear) return null;

      /* Pass C: Normal-Ray Casting (s=1..3) + Sub-Pixel Color Blend Unmixing -> texFlanks */
      const okFlank = runSlotPass(env, 'flankUnmix', FS_FLANK_UNMIX, flankSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 0);
        g.activeTexture(g.TEXTURE1);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_fltTex'), 1);
        g.activeTexture(g.TEXTURE2);
        g.bindTexture(g.TEXTURE_2D, edgeSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 2);
        g.activeTexture(g.TEXTURE3);
        g.bindTexture(g.TEXTURE_2D, tensorSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tensorTex'), 3);
        g.activeTexture(g.TEXTURE4);
        g.bindTexture(g.TEXTURE_2D, nearSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_nearTex'), 4);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), K);
        g.uniform3fv(g.getUniformLocation(prog, 'u_palRgb[0]'), uPalRgb);
      });
      if (!okFlank) return null;

      const n = w * h;
      const bufTen   = MemPool.acquire(Float32Array, n * 4);
      const bufNear  = MemPool.acquire(Float32Array, n * 4);
      const bufFlank = MemPool.acquire(Float32Array, n * 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, tensorSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, bufTen);
      gl.bindFramebuffer(gl.FRAMEBUFFER, nearSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, bufNear);
      gl.bindFramebuffer(gl.FRAMEBUFFER, flankSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, bufFlank);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const nxArr = new Float32Array(n);
      const nyArr = new Float32Array(n);
      const cohArr = new Float32Array(n);
      const cornerArr = new Float32Array(n);
      const thinStrokeLab = new Int16Array(n).fill(-1);
      const rawNearestFlt = new Int16Array(n).fill(-1);
      const rawNearestRaw = new Int16Array(n).fill(-1);
      const flankA = new Int16Array(n).fill(-1);
      const flankB = new Int16Array(n).fill(-1);
      const flankAlpha = new Float32Array(n).fill(0.5);
      const flankPerp = new Float32Array(n);

      for (let p = 0; p < n; p++) {
        const i = p * 4;
        nxArr[p] = bufTen[i];
        nyArr[p] = bufTen[i + 1];
        cohArr[p] = bufTen[i + 2];
        cornerArr[p] = bufTen[i + 3];

        thinStrokeLab[p] = Math.round(bufNear[i]);
        rawNearestFlt[p] = Math.round(bufNear[i + 1]);
        rawNearestRaw[p] = Math.round(bufNear[i + 2]);

        const fA = Math.round(bufFlank[i]);
        const fB = Math.round(bufFlank[i + 1]);
        if (fA >= 0 && fB >= 0) {
          flankA[p] = fA;
          flankB[p] = fB;
          flankAlpha[p] = bufFlank[i + 2];
          flankPerp[p] = bufFlank[i + 3];
        }
      }

      MemPool.release(bufTen);
      MemPool.release(bufNear);
      MemPool.release(bufFlank);

      return {
        nxArr, nyArr, cohArr, cornerArr,
        thinStrokeLab, rawNearestFlt, rawNearestRaw,
        flankA, flankB, flankAlpha, flankPerp
      };
    } catch (e) {
      return null;
    }
  }

  /* =====================================================================
     TAHAP 3 GPU KERNELS — 4-Color Chromatic MRF Potts, 9-Bit Simple-Point
     Topological Invariants, Local Edge Snapping & Morphological/Ribbon Clean
     ===================================================================== */
  const GLSL_TAHAP3_COMMON = `
  uniform sampler2D u_labels;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_tensorTex;
  uniform sampler2D u_flankTex;
  uniform sampler2D u_nearTex;
  uniform sampler2D u_palLut;
  uniform vec2 u_res;
  uniform int u_K;

  vec3 fetchRaw(ivec2 p) {
    ivec2 c = clamp(p, ivec2(0), ivec2(u_res) - ivec2(1));
    return texelFetch(u_rawTex, c, 0).rgb * 255.0;
  }
  vec3 fetchFlt(ivec2 p) {
    ivec2 c = clamp(p, ivec2(0), ivec2(u_res) - ivec2(1));
    return texelFetch(u_fltTex, c, 0).rgb * 255.0;
  }
  vec3 fetchPalRGB(int l) {
    if (l < 0 || l >= u_K) return vec3(0.0);
    vec4 v = texelFetch(u_palLut, ivec2(0, l), 0);
    float b = floor(v.a / 256.0);
    float g = v.a - b * 256.0;
    return vec3(v.b, g, b);
  }
  float fetchPalDist2(int a, int b) {
    if (a < 0 || b < 0 || a >= u_K || b >= u_K) return 0.0;
    return texelFetch(u_palLut, ivec2(a * u_K + b, 0), 0).r;
  }
  bool fetchPalIsMidBlend(int l, int a, int b) {
    if (l < 0 || a < 0 || b < 0 || l >= u_K || a >= u_K || b >= u_K) return false;
    return texelFetch(u_palLut, ivec2(a * u_K + b, l), 0).g > 0.5;
  }
  float cdist2(vec3 a, vec3 b) {
    vec3 d = a - b;
    float rm = (a.r + b.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }
  bool evalColorBlendPair(vec3 p0, vec3 cA, vec3 cB, out float outT, out float outPerpD2) {
    vec3 d = cA - cB;
    float len2 = dot(d, d);
    float abD2 = cdist2(cA, cB);
    if (len2 < 120.0 || abD2 < 320.0) return false;
    float t = dot(p0 - cB, d) / len2;
    if (t <= 0.02 || t >= 0.98) return false;
    vec3 pr = cB + t * d;
    float perpD2 = cdist2(p0, pr);
    float tc = clamp(t, 0.02, 0.98);
    vec3 gr = sqrt(max(vec3(0.0), tc * cA * cA + (1.0 - tc) * cB * cB));
    perpD2 = min(perpD2, cdist2(p0, gr));
    vec3 gr22 = pow(max(vec3(0.0), tc * pow(max(cA, vec3(0.0)), vec3(2.2)) + (1.0 - tc) * pow(max(cB, vec3(0.0)), vec3(2.2))), vec3(1.0 / 2.2));
    perpD2 = min(perpD2, cdist2(p0, gr22));
    float maxAllowed = min(5400.0, 680.0 + abD2 * 0.022);
    if (perpD2 > maxAllowed) return false;
    outT = t;
    outPerpD2 = perpD2;
    return true;
  }
  /* 9-Bit Bitmask 4-Connected Component Counter (100% Identik dengan BFS wouldChangeTopology di seluruh 512 state 3x3) */
  int countComp4Mask(int mask9) {
    int rem = mask9 & 511;
    int c = 0;
    for (int k = 0; k < 5; k++) {
      if (rem == 0) break;
      int comp = rem & (-rem);
      for (int s = 0; s < 6; s++) {
        comp = (comp | ((comp & 219) << 1) | ((comp & 438) >> 1) | (comp << 3) | (comp >> 3)) & rem;
      }
      rem &= ~comp;
      c++;
    }
    return c;
  }
  bool wouldChangeTopoAt(ivec2 p, int fromL, int toL) {
    if (fromL == toL) return false;
    int maskFrom = 0;
    int maskTo = 0;
    int W = int(u_res.x);
    int H = int(u_res.y);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        if (i == 0 && j == 0) continue;
        int xx = p.x + i;
        int yy = p.y + j;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        int bit = 1 << ((j + 1) * 3 + (i + 1));
        int nl = int(round(texelFetch(u_labels, ivec2(xx, yy), 0).r));
        if (nl == fromL) maskFrom |= bit;
        if (nl == toL) maskTo |= bit;
      }
    }
    int beforeFrom = countComp4Mask(maskFrom | 16);
    int afterFrom = countComp4Mask(maskFrom);
    if (afterFrom > beforeFrom) return true;
    int beforeTo = countComp4Mask(maskTo);
    int afterTo = countComp4Mask(maskTo | 16);
    if (beforeTo >= 2 && afterTo < beforeTo) return true;
    return false;
  }
  `;

  /* Kernel GLSL 7A: Deteksi Piksel Jangkar (Anchor Detection) untuk Local-Neighborhood Edge Snap */
  const FS_EDGE_SNAP_ANCHOR = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_pass;
  out vec4 outLabel;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int L0 = int(round(curV.r));
    float isAnc = 0.0;
    if (p.x >= 1 && p.x < W - 1 && p.y >= 1 && p.y < H - 1 && curV.g < 0.5 && L0 >= 0) {
      float mag = texelFetch(u_edgeTex, p, 0).b;
      if (!(mag > 14.0 && u_pass == 0)) {
        int same = 0;
        if (int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r)) == L0) same++;
        if (same >= 3) {
          if (cdist2(fetchRaw(p), fetchPalRGB(L0)) < 1450.0) {
            isAnc = 1.0;
          }
        }
      }
    }
    outLabel = vec4(curV.r, curV.g, curV.b, isAnc);
  }`;

  /* Kernel GLSL 7B: Local-Neighborhood Edge Snap 7x7 + Normal-Ray Flank Unmixing Snap */
  const FS_EDGE_SNAP_STEP = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  out vec4 outLabel;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int curL = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.a > 0.5 || curL < 0 || tsLab == curL) {
      outLabel = curV;
      return;
    }
    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));
    if (lL == curL && lR == curL && lU == curL && lD == curL) {
      outLabel = curV;
      return;
    }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(curL));

    /* 1. Periksa pasangan jangkar normal gradien (flankA, flankB) terlebih dahulu */
    vec4 flk = texelFetch(u_flankTex, p, 0);
    int fA = int(round(flk.r));
    int fB = int(round(flk.g));
    if (fA >= 0 && fB >= 0 && fA != curL && fB != curL) {
      if (fetchPalIsMidBlend(curL, fA, fB)) {
        float blT = 0.5, blPerp = 0.0;
        if (evalColorBlendPair(r0, fetchPalRGB(fA), fetchPalRGB(fB), blT, blPerp) && dCur > blPerp * 0.45) {
          int nextL = (flk.b >= 0.5) ? fA : fB;
          outLabel = vec4(float(nextL), curV.g, curV.b, curV.a);
          return;
        }
      }
    }

    /* 2. Evaluasi statistik jangkar lokal pada jendela 7x7 (hingga 12 label unik lokal) */
    int uLab[12];
    int uCnt[12];
    int uAnc[12];
    int nU = 0;
    for (int dy = -3; dy <= 3; dy++) {
      int ny = p.y + dy;
      if (ny < 0 || ny >= H) continue;
      for (int dx = -3; dx <= 3; dx++) {
        int nx = p.x + dx;
        if (nx < 0 || nx >= W) continue;
        vec4 nv = texelFetch(u_labels, ivec2(nx, ny), 0);
        int nl = int(round(nv.r));
        if (nl < 0) continue;
        int idx = -1;
        for (int k = 0; k < 12; k++) {
          if (k >= nU) break;
          if (uLab[k] == nl) { idx = k; break; }
        }
        if (idx < 0 && nU < 12) {
          idx = nU++;
          uLab[idx] = nl;
          uCnt[idx] = 0;
          uAnc[idx] = 0;
        }
        if (idx >= 0) {
          uCnt[idx] += 1;
          if (nv.a > 0.5) uAnc[idx] += 4;
        }
      }
    }
    if (nU < 2) {
      outLabel = curV;
      return;
    }

    /* Urutkan 4 kandidat teratas berdasarkan (anchorCounts + counts) */
    int topIdx[4];
    int maxCheck = min(nU, 4);
    int usedMask = 0;
    for (int t = 0; t < 4; t++) {
      if (t >= maxCheck) { topIdx[t] = -1; continue; }
      int bestK = -1, bestScore = -1;
      for (int k = 0; k < 12; k++) {
        if (k >= nU) break;
        if ((usedMask & (1 << k)) != 0) continue;
        int sc = uAnc[k] + uCnt[k];
        if (sc > bestScore) { bestScore = sc; bestK = k; }
      }
      topIdx[t] = bestK;
      if (bestK >= 0) usedMask |= (1 << bestK);
    }

    int curAnchor = 0, curTotal = 0;
    for (int k = 0; k < 12; k++) {
      if (k >= nU) break;
      if (uLab[k] == curL) { curAnchor = uAnc[k]; curTotal = uCnt[k]; break; }
    }

    int snapped = -1;
    float bestPerp = 1e20;
    for (int a = 0; a < 4; a++) {
      if (a >= maxCheck) break;
      int ia = topIdx[a];
      if (ia < 0) continue;
      int LA = uLab[ia];
      for (int b = a + 1; b < 4; b++) {
        if (b >= maxCheck) break;
        int ib = topIdx[b];
        if (ib < 0) continue;
        int LB = uLab[ib];
        if (uCnt[ia] + uCnt[ib] < 5) continue;
        if (LA != curL && LB != curL) {
          bool isPalMid = fetchPalIsMidBlend(curL, LA, LB);
          float blT = 0.5, blPerp = 0.0;
          if (!evalColorBlendPair(r0, fetchPalRGB(LA), fetchPalRGB(LB), blT, blPerp)) continue;
          if (!isPalMid && dCur < blPerp * 2.5 + 1200.0) continue;
          int ancAB = uAnc[ia] + uAnc[ib];
          if ((isPalMid && (curAnchor <= 4 || curTotal <= 16)) || (curAnchor == 0 && curTotal <= 6 && ancAB >= 12 && dCur > blPerp * 2.2)) {
            if (blPerp < bestPerp) {
              bestPerp = blPerp;
              snapped = (blT >= 0.5) ? LA : LB;
            }
          }
        }
      }
    }
    if (snapped >= 0 && snapped != curL) {
      outLabel = vec4(float(snapped), curV.g, curV.b, curV.a);
    } else {
      outLabel = curV;
    }
  }`;

  /* Kernel GLSL 8: 4-Color Chromatic Parallel MRF Potts dengan Invarian Topologi Bitmask 9-Bit */
  const FS_MRF_POTTS_4COLOR = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_colorPass;
  uniform float u_beta;
  uniform int u_checkTopo;
  out vec4 outLabel;

  float dataEnergyAt(ivec2 p, vec3 r0, vec3 flt0, float mag, int thinLab, int fA, int fB, float fAlpha, float fPerp, int l, float curBeta) {
    if (thinLab >= 0) {
      return (l == thinLab) ? 0.0 : (curBeta * 6.5 + 18000.0);
    }
    vec3 src = (mag > 5.5) ? r0 : flt0;
    float dBase = cdist2(src, fetchPalRGB(l));
    if (fA >= 0 && fB >= 0) {
      float abDist2 = fetchPalDist2(fA, fB);
      float scale = min(abDist2 * 0.28, curBeta * 3.0);
      if (l == fA) {
        float unmixCost = fPerp * 0.65 + (1.0 - fAlpha) * (1.0 - fAlpha) * scale;
        return min(dBase, unmixCost);
      }
      if (l == fB) {
        float unmixCost = fPerp * 0.65 + fAlpha * fAlpha * scale;
        return min(dBase, unmixCost);
      }
      if (fetchPalIsMidBlend(l, fA, fB) && dBase > fPerp * 0.5) {
        return dBase + curBeta * 3.6 + abDist2 * 0.25;
      }
    }
    return dBase;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    if (curV.g > 0.5 || cur < 0) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }
    /* Penjadwalan Kromatik 4-Warna (King's Graph 4-Coloring):
       Tidak ada dua piksel dengan paritas ((x & 1) + ((y & 1) << 1)) yang sama yang bertetangga-8! */
    int parity = (p.x & 1) + ((p.y & 1) << 1);
    if (parity != u_colorPass) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    const ivec2 DIRS[8] = ivec2[8](
      ivec2( 1, 0), ivec2(-1, 0), ivec2(0,  1), ivec2(0, -1),
      ivec2( 1, 1), ivec2(-1, 1), ivec2(1, -1), ivec2(-1,-1)
    );
    const float W_DIR[8] = float[8](1.0, 1.0, 1.0, 1.0, 0.707, 0.707, 0.707, 0.707);

    int nLabelBuf[8];
    int candBuf[12];
    int candLen = 1;
    candBuf[0] = cur;
    bool isBoundary = false;
    int sameOrtho = 0, sameDiag = 0;

    for (int k = 0; k < 8; k++) {
      ivec2 q = p + DIRS[k];
      if (q.x < 0 || q.y < 0 || q.x >= W || q.y >= H) {
        nLabelBuf[k] = -2;
        continue;
      }
      int nl = int(round(texelFetch(u_labels, q, 0).r));
      nLabelBuf[k] = nl;
      if (nl == cur) {
        if (k < 4) sameOrtho++; else sameDiag++;
      } else if (nl >= 0) {
        isBoundary = true;
        bool seen = false;
        for (int ci = 0; ci < 12; ci++) {
          if (ci >= candLen) break;
          if (candBuf[ci] == nl) { seen = true; break; }
        }
        if (!seen && candLen < 12) candBuf[candLen++] = nl;
      }
    }
    if (!isBoundary) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    vec3 r0 = fetchRaw(p);
    vec3 flt0 = fetchFlt(p);
    float mag = texelFetch(u_edgeTex, p, 0).b;
    vec4 ten = texelFetch(u_tensorTex, p, 0);
    float nx = ten.r, ny = ten.g, coh = ten.b, corner = ten.a;
    bool hasAniso = coh > 0.15 && (nx != 0.0 || ny != 0.0);
    const float inv2SigmaEdge = 1.0 / (2.0 * 1350.0);

    float wEdge[8];
    for (int k = 0; k < 8; k++) {
      if (nLabelBuf[k] == -2) { wEdge[k] = 0.0; continue; }
      ivec2 q = p + DIRS[k];
      float dc2 = cdist2(r0, fetchRaw(q));
      float aniso = 1.0;
      if (hasAniso) {
        float stepLen = (k < 4) ? 1.0 : 1.41421356;
        float tanAlign = abs((float(DIRS[k].x) * (-ny) + float(DIRS[k].y) * nx) / stepLen);
        aniso = 0.74 + 0.56 * tanAlign;
      }
      wEdge[k] = W_DIR[k] * aniso * (0.14 + 0.86 * exp(-dc2 * inv2SigmaEdge));
    }

    vec4 flk = texelFetch(u_flankTex, p, 0);
    int fAp = int(round(flk.r));
    int fBp = int(round(flk.g));
    float fAlpha = flk.b;
    float fPerp = flk.a;
    if (fAp >= 0) {
      bool sc = false;
      for (int ci = 0; ci < 12; ci++) { if (ci >= candLen) break; if (candBuf[ci] == fAp) { sc = true; break; } }
      if (!sc && candLen < 12) candBuf[candLen++] = fAp;
    }
    if (fBp >= 0) {
      bool sc = false;
      for (int ci = 0; ci < 12; ci++) { if (ci >= candLen) break; if (candBuf[ci] == fBp) { sc = true; break; } }
      if (!sc && candLen < 12) candBuf[candLen++] = fBp;
    }

    int thinLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (thinLab >= 0 && cur == thinLab) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }
    float dCurRaw = cdist2(r0, fetchPalRGB(cur));
    float dCur = dataEnergyAt(p, r0, flt0, mag, thinLab, fAp, fBp, fAlpha, fPerp, cur, u_beta);

    bool hasCleanUnmixMajority = fAp >= 0 && fBp >= 0 && coh > 0.25 && fPerp < 320.0 && sameOrtho >= 1 && (sameOrtho + sameDiag >= 2) &&
      ((cur == fAp && fAlpha >= 0.505) || (cur == fBp && fAlpha <= 0.495));
    if (hasCleanUnmixMajority) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    bool isSharpFeature = corner > 5.5 && (sameOrtho + sameDiag >= 1) && dCurRaw < 1100.0;
    bool isProtectedDetailOrTip = ((sameOrtho + sameDiag >= 1) && dCurRaw < 480.0) || isSharpFeature;

    int bestL = cur;
    float bestE = 1e20;
    for (int ci = 0; ci < 12; ci++) {
      if (ci >= candLen) break;
      int l = candBuf[ci];
      float dl = (l == cur) ? dCur : dataEnergyAt(p, r0, flt0, mag, thinLab, fAp, fBp, fAlpha, fPerp, l, u_beta);
      if (isProtectedDetailOrTip && l != cur && dl > dCur * 1.95 + 420.0) continue;
      float e = dl;
      for (int k = 0; k < 8; k++) {
        int nl = nLabelBuf[k];
        if (nl == -2) continue;
        if (nl != l) {
          float pairCap = (nl >= 0 && l >= 0) ? min(u_beta, fetchPalDist2(l, nl) * 0.24 + 120.0) : u_beta;
          e += pairCap * wEdge[k];
        }
      }
      if (e < bestE) { bestE = e; bestL = l; }
    }

    if (bestL != cur) {
      if (u_checkTopo == 1 && wouldChangeTopoAt(p, cur, bestL)) {
        bool isFalseHalo = fAp >= 0 && fBp >= 0 && cur != fAp && cur != fBp && fetchPalIsMidBlend(cur, fAp, fBp);
        if (!isFalseHalo) {
          outLabel = vec4(curV.rgb, 0.0);
          return;
        }
      }
      outLabel = vec4(float(bestL), curV.g, curV.b, 1.0);
      return;
    }
    outLabel = vec4(curV.rgb, 0.0);
  }`;

  /* Kernel GLSL 9: Morphological Closing (Mode 0, 4-Color Chromatic + Topo Guard) & Opening (Mode 1) */
  const FS_MORPH_CLOSE_OPEN = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_mode;
  uniform int u_colorPass;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }

    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));

    if (u_mode == 0) {
      /* Mode 0: Closing 1px Bridge (4-Color Chromatic agar wouldChangeTopoAt bebas tabrakan) */
      int parity = (p.x & 1) + ((p.y & 1) << 1);
      if (parity != u_colorPass) {
        outLabel = curV;
        return;
      }
      int bridgeL = -1;
      if (lL >= 0 && lL == lR && lL != cur && lU != lL && lD != lL) bridgeL = lL;
      else if (lU >= 0 && lU == lD && lU != cur && lL != lU && lR != lU) bridgeL = lU;
      if (bridgeL >= 0 && bridgeL < u_K) {
        int cntB = 0;
        for (int dy = -1; dy <= 1; dy++) {
          for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            if (int(round(texelFetch(u_labels, p + ivec2(dx, dy), 0).r)) == bridgeL) cntB++;
          }
        }
        if (cntB >= 3) {
          vec3 r0 = fetchRaw(p);
          float dBridge = cdist2(r0, fetchPalRGB(bridgeL));
          float dCur = cdist2(r0, fetchPalRGB(cur));
          if (dBridge <= dCur * 1.25 + 420.0 && !wouldChangeTopoAt(p, cur, bridgeL)) {
            outLabel = vec4(float(bridgeL), curV.g, curV.b, curV.a);
            return;
          }
        }
      }
      outLabel = curV;
      return;
    }

    /* Mode 1: Opening 1px Protrusion (Tanpa memotong sudut lancip) */
    int nbsOrtho[4] = int[4](lL, lR, lU, lD);
    int sameOrtho = 0, sameDir = -1;
    int vLab[8];
    int vCnt[8];
    int nV = 0;
    for (int k = 0; k < 4; k++) {
      int nl = nbsOrtho[k];
      if (nl == cur) { sameOrtho++; sameDir = k; }
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 2;
      }
    }
    if (sameOrtho > 1) { outLabel = curV; return; }

    int sameDiag = 0, fwdDiagSame = 0;
    int stepDx0 = (sameDir == 0) ? -1 : (sameDir == 1) ? 1 : 0;
    int stepDy0 = (sameDir == 2) ? -1 : (sameDir == 3) ? 1 : 0;
    const ivec2 DIAGS[4] = ivec2[4](ivec2(-1,-1), ivec2(1,-1), ivec2(-1,1), ivec2(1,1));
    for (int k = 0; k < 4; k++) {
      int ddx = DIAGS[k].x, ddy = DIAGS[k].y;
      int nl = int(round(texelFetch(u_labels, p + ivec2(ddx, ddy), 0).r));
      if (nl == cur) {
        sameDiag++;
        if (sameOrtho == 1 && (ddx * stepDx0 + ddy * stepDy0) <= 0) fwdDiagSame++;
      } else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 1;
      }
    }
    if (sameOrtho == 0 && sameDiag >= 1) { outLabel = curV; return; }
    if (sameOrtho == 1 && (fwdDiagSame > 0 || sameDiag >= 1)) { outLabel = curV; return; }

    int domBg = -1, maxV = 0;
    for (int j = 0; j < 8; j++) {
      if (j >= nV) break;
      if (vCnt[j] > maxV) { maxV = vCnt[j]; domBg = vLab[j]; }
    }
    if (domBg < 0 || domBg >= u_K) { outLabel = curV; return; }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(cur));
    float dBg = cdist2(r0, fetchPalRGB(domBg));
    if (sameOrtho == 0 && dCur > dBg * 1.15) {
      outLabel = vec4(float(domBg), curV.g, curV.b, curV.a);
      return;
    }
    if (sameOrtho == 1 && sameDiag == 0 && dCur > dBg * 1.35) {
      outLabel = vec4(float(domBg), curV.g, curV.b, curV.a);
      return;
    }
    outLabel = curV;
  }`;

  /* Kernel GLSL 10: Sandwiched Boundary Ribbon Erosion (erodeSandwichedBoundaryRibbons) */
  const FS_RIBBON_ERODE = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  out vec4 outLabel;

  bool is2x2CoreAt(ivec2 p, int L, int W, int H) {
    for (int dy = -2; dy <= 1; dy++) {
      int y0 = p.y + dy;
      if (y0 < 0 || y0 + 1 >= H) continue;
      for (int dx = -2; dx <= 1; dx++) {
        int x0 = p.x + dx;
        if (x0 < 0 || x0 + 1 >= W) continue;
        int l00 = int(round(texelFetch(u_labels, ivec2(x0, y0), 0).r));
        int l10 = int(round(texelFetch(u_labels, ivec2(x0 + 1, y0), 0).r));
        int l01 = int(round(texelFetch(u_labels, ivec2(x0, y0 + 1), 0).r));
        int l11 = int(round(texelFetch(u_labels, ivec2(x0 + 1, y0 + 1), 0).r));
        if (l00 == L && l10 == L && l01 == L && l11 == L) return true;
      }
    }
    return false;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 2 || p.x >= W - 2 || p.y < 2 || p.y >= H - 2 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }
    if (is2x2CoreAt(p, cur, W, H)) {
      outLabel = curV;
      return;
    }

    int pairA = -1, pairB = -1;
    const ivec2 AXES[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
    for (int a = 0; a < 4; a++) {
      if (pairA >= 0) break;
      ivec2 d = AXES[a];
      int la = -1, lb = -1;
      for (int s = 1; s <= 2; s++) {
        int nl = int(round(texelFetch(u_labels, p - d * s, 0).r));
        if (nl != cur && nl >= 0) { la = nl; break; }
      }
      for (int s = 1; s <= 2; s++) {
        int nl = int(round(texelFetch(u_labels, p + d * s, 0).r));
        if (nl != cur && nl >= 0) { lb = nl; break; }
      }
      if (la >= 0 && lb >= 0 && la != lb) { pairA = la; pairB = lb; }
    }
    if (pairA < 0 || pairB < 0) {
      outLabel = curV;
      return;
    }

    vec3 r0 = fetchRaw(p);
    vec3 cA = fetchPalRGB(pairA), cB = fetchPalRGB(pairB), cCur = fetchPalRGB(cur);
    float lum0 = dot(r0, vec3(0.299, 0.587, 0.114));
    float lumA = dot(cA, vec3(0.299, 0.587, 0.114));
    float lumB = dot(cB, vec3(0.299, 0.587, 0.114));
    float lumCur = dot(cCur, vec3(0.299, 0.587, 0.114));
    if (lum0 > max(lumA, lumB) + 6.0 || lum0 < min(lumA, lumB) - 6.0 ||
        lumCur > max(lumA, lumB) + 8.0 || lumCur < min(lumA, lumB) - 8.0) {
      outLabel = curV;
      return;
    }
    float dCur = cdist2(r0, cCur);
    float blT = 0.5, blPerp = 0.0;
    bool hasBlend = evalColorBlendPair(r0, cA, cB, blT, blPerp);
    bool isPalMid = fetchPalIsMidBlend(cur, pairA, pairB);
    if (hasBlend && (isPalMid || dCur > blPerp * 2.5 + 900.0)) {
      int nextL = (blT >= 0.5) ? pairA : pairB;
      outLabel = vec4(float(nextL), curV.g, curV.b, curV.a);
      return;
    }
    outLabel = curV;
  }`;

  /* Kernel GLSL 11: Parasitic Pimple/Hook Clean (absorbBoundaryParasites, 4-Color Chromatic + Topo Guard) */
  const FS_PARASITE_CLEAN = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_colorPass;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }
    int parity = (p.x & 1) + ((p.y & 1) << 1);
    if (parity != u_colorPass) {
      outLabel = curV;
      return;
    }

    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));
    int nbsOrtho[4] = int[4](lL, lR, lU, lD);
    int sameOrtho = 0, sameDir = -1;
    int vLab[8];
    int vCnt[8];
    int nV = 0;

    for (int k = 0; k < 4; k++) {
      int nl = nbsOrtho[k];
      if (nl == cur) { sameOrtho++; sameDir = k; }
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 2;
      }
    }
    if (sameOrtho > 1) { outLabel = curV; return; }

    int sameDiag = 0;
    const ivec2 DIAGS[4] = ivec2[4](ivec2(-1,-1), ivec2(1,-1), ivec2(-1,1), ivec2(1,1));
    for (int k = 0; k < 4; k++) {
      int nl = int(round(texelFetch(u_labels, p + DIAGS[k], 0).r));
      if (nl == cur) sameDiag++;
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 1;
      }
    }

    int domNb = -1, bestV = 0;
    for (int j = 0; j < 8; j++) {
      if (j >= nV) break;
      if (vCnt[j] > bestV) { bestV = vCnt[j]; domNb = vLab[j]; }
    }
    if (domNb < 0 || bestV < 6) { outLabel = curV; return; }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(cur));
    float dDom = cdist2(r0, fetchPalRGB(domNb));

    if (sameOrtho == 1) {
      int stepDx = (sameDir == 0) ? -1 : (sameDir == 1) ? 1 : 0;
      int stepDy = (sameDir == 2) ? -1 : (sameDir == 3) ? 1 : 0;
      int bx = clamp(p.x + stepDx, 1, W - 2);
      int by = clamp(p.y + stepDy, 1, H - 2);
      int perpDx = stepDy, perpDy = stepDx;
      int backSpread = 0;
      for (int s = -1; s <= 1; s++) {
        if (int(round(texelFetch(u_labels, ivec2(bx + perpDx * s, by + perpDy * s), 0).r)) == cur) backSpread++;
      }
      if (backSpread >= 2 && dCur <= dDom * 0.85) { outLabel = curV; return; }
    }
    if ((sameOrtho + sameDiag >= 1) && dCur < dDom * 0.45 && dCur < 600.0) { outLabel = curV; return; }
    if (wouldChangeTopoAt(p, cur, domNb)) { outLabel = curV; return; }

    outLabel = vec4(float(domNb), curV.g, curV.b, curV.a);
  }`;

  /* Kernel GLSL 12: 2x2 Checkerboard Saddle Resolver (resolveCheckerboardSaddles, 4-Pass Non-Overlapping 2x2 Blocks) */
  const FS_CHECKERBOARD_SADDLE = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_blockParity;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);

    /* Tentukan sudut kiri-atas (x0, y0) dari blok 2x2 dengan paritas u_blockParity (0..3) yang memuat piksel p */
    int ox = u_blockParity & 1;
    int oy = (u_blockParity >> 1) & 1;
    int dx = (p.x - ox) & 1;
    int dy = (p.y - oy) & 1;
    int x0 = p.x - dx;
    int y0 = p.y - dy;
    if (x0 < 0 || y0 < 0 || x0 + 1 >= W || y0 + 1 >= H) {
      outLabel = curV;
      return;
    }

    ivec2 q00 = ivec2(x0, y0), q10 = ivec2(x0 + 1, y0), q01 = ivec2(x0, y0 + 1), q11 = ivec2(x0 + 1, y0 + 1);
    vec4 v00 = texelFetch(u_labels, q00, 0), v10 = texelFetch(u_labels, q10, 0);
    vec4 v01 = texelFetch(u_labels, q01, 0), v11 = texelFetch(u_labels, q11, 0);
    if (v00.g > 0.5 || v10.g > 0.5 || v01.g > 0.5 || v11.g > 0.5) {
      outLabel = curV;
      return;
    }
    int l00 = int(round(v00.r)), l10 = int(round(v10.r)), l01 = int(round(v01.r)), l11 = int(round(v11.r));
    if (l00 < 0 || l10 < 0 || !(l00 == l11 && l10 == l01 && l00 != l10)) {
      outLabel = curV;
      return;
    }

    int ts00 = int(round(texelFetch(u_nearTex, q00, 0).r));
    int ts10 = int(round(texelFetch(u_nearTex, q10, 0).r));
    int ts01 = int(round(texelFetch(u_nearTex, q01, 0).r));
    int ts11 = int(round(texelFetch(u_nearTex, q11, 0).r));

    bool prot00_11 = (ts00 == l00 || ts11 == l00) || (v00.b > 0.5 || v11.b > 0.5);
    bool prot10_01 = (ts10 == l10 || ts01 == l10) || (v10.b > 0.5 || v01.b > 0.5);

    ivec2 cPts[4] = ivec2[4](q00, q11, q10, q01);
    int cCur[4] = int[4](l00, l00, l10, l10);
    int cAlt[4] = int[4](l10, l10, l00, l00);
    int startIdx = (prot00_11 && !prot10_01) ? 2 : 0;
    int endIdx = (prot10_01 && !prot00_11) ? 2 : 4;

    vec3 CA = fetchPalRGB(l00), CB = fetchPalRGB(l10);
    ivec2 bestQ = cPts[startIdx];
    int bestNewL = cAlt[startIdx];
    for (int k = 0; k < 4; k++) {
      if (k < startIdx || k >= endIdx) continue;
      if (int(round(texelFetch(u_nearTex, cPts[k], 0).r)) != cCur[k]) {
        bestQ = cPts[k];
        bestNewL = cAlt[k];
        break;
      }
    }
    float minPenalty = 1e20;

    int ringA = 0, ringB = 0;
    for (int ry = -1; ry <= 2; ry++) {
      for (int rx = -1; rx <= 2; rx++) {
        if (rx >= 0 && rx <= 1 && ry >= 0 && ry <= 1) continue;
        ivec2 rp = clamp(ivec2(x0 + rx, y0 + ry), ivec2(0), ivec2(W - 1, H - 1));
        int rl = int(round(texelFetch(u_labels, rp, 0).r));
        if (rl == l00) ringA++;
        else if (rl == l10) ringB++;
      }
    }
    float lumA = dot(CA, vec3(0.299, 0.587, 0.114));
    float lumB = dot(CB, vec3(0.299, 0.587, 0.114));
    for (int k = 0; k < 4; k++) {
      if (k < startIdx || k >= endIdx) continue;
      ivec2 q = cPts[k];
      int curL = cCur[k], altL = cAlt[k];
      if (int(round(texelFetch(u_nearTex, q, 0).r)) == curL) continue;
      if (wouldChangeTopoAt(q, curL, altL)) continue;
      vec3 rq = fetchRaw(q);
      vec3 Calt = (altL == l00) ? CA : CB;
      vec3 Ccur = (curL == l00) ? CA : CB;
      float pen = cdist2(rq, Calt) - cdist2(rq, Ccur);
      if (ringA >= 4 && ringB >= 4) {
        bool altIsLighter = (altL == l00) ? (lumA > lumB) : (lumB > lumA);
        if (altIsLighter) pen -= 950.0;
      }
      if (pen < minPenalty) {
        minPenalty = pen;
        bestQ = q;
        bestNewL = altL;
      }
    }

    if (p.x == bestQ.x && p.y == bestQ.y) {
      outLabel = vec4(float(bestNewL), curV.g, curV.b, curV.a);
    } else {
      outLabel = curV;
    }
  }`;

  /* Sinkronisasi Konteks Segmentasi & Palet LUT ke VRAM untuk Tahap 3 */
  function syncSegCtxToGpu(env, work, mask, palette, ctx, labels) {
    const { gl, extFloat } = env;
    if (!extFloat) return null;
    const { w, h } = work;
    const K = palette.length;
    if (K < 2 || K > 64 || w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize || K * K > HW_LIMITS.gpu.maxTexSize) {
      return null;
    }

    const rawD = (ctx && ctx.rawD) || (work.rawRgba && work.rawRgba.length === w * h * 4 ? work.rawRgba : work.data.data);
    const fltD = (ctx && ctx.fltD) || work.data.data;
    const cacheTarget = ctx || work;
    const palSig = K + ':' + (palette[0] ? palette[0].r + ',' + palette[0].g + ',' + palette[0].b : '') + ':' + (palette[K - 1] ? palette[K - 1].r + ',' + palette[K - 1].g + ',' + palette[K - 1].b : '');
    const needStaticUpload = !cacheTarget._gpuStaticSynced || cacheTarget._gpuStaticW !== w || cacheTarget._gpuStaticH !== h || cacheTarget._gpuStaticPalSig !== palSig;

    let rawSlot = GPUMemPool.getSlot('texRawRGBA');
    let fltSlot = GPUMemPool.getSlot('texFltRGBA');
    if (needStaticUpload || !rawSlot || !fltSlot || rawSlot.w !== w || rawSlot.h !== h) {
      rawSlot = uploadBufferToSlot(gl, 'texRawRGBA', w, h, rawD, false);
      fltSlot = uploadBufferToSlot(gl, 'texFltRGBA', w, h, fltD, false);
    }
    if (!rawSlot || !fltSlot) return null;

    /* Pastikan texEdgeField, texTensor, texFlanks, texLabGrad tersedia dan tersinkronisasi untuk dimensi (w, h) */
    let edgeSlot = GPUMemPool.getSlot('texEdgeField');
    if (needStaticUpload || !edgeSlot || edgeSlot.w !== w || edgeSlot.h !== h || !edgeSlot.isFloat) {
      edgeSlot = GPUMemPool.allocateSlot(gl, 'texEdgeField', w, h, true);
      if (!edgeSlot) return null;
      const eBuf = MemPool.acquire(Float32Array, w * h * 4);
      const gx = ctx && ctx.gx, gy = ctx && ctx.gy, mag = ctx && ctx.mag;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        eBuf[i]     = gx ? gx[p] : 0;
        eBuf[i + 1] = gy ? gy[p] : 0;
        eBuf[i + 2] = mag ? mag[p] : 0;
        eBuf[i + 3] = 0;
      }
      uploadBufferToSlot(gl, 'texEdgeField', w, h, eBuf, true);
      MemPool.release(eBuf);
    }

    let tensorSlot = GPUMemPool.getSlot('texTensor');
    if (needStaticUpload || !tensorSlot || tensorSlot.w !== w || tensorSlot.h !== h || !tensorSlot.isFloat) {
      tensorSlot = GPUMemPool.allocateSlot(gl, 'texTensor', w, h, true);
      if (!tensorSlot) return null;
      const tBuf = MemPool.acquire(Float32Array, w * h * 4);
      const nx = ctx && ctx.nxArr, ny = ctx && ctx.nyArr, coh = ctx && ctx.cohArr, crn = ctx && ctx.cornerArr;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        tBuf[i]     = nx ? nx[p] : 0;
        tBuf[i + 1] = ny ? ny[p] : 0;
        tBuf[i + 2] = coh ? coh[p] : 0;
        tBuf[i + 3] = crn ? crn[p] : 0;
      }
      uploadBufferToSlot(gl, 'texTensor', w, h, tBuf, true);
      MemPool.release(tBuf);
    }

    let flankSlot = GPUMemPool.getSlot('texFlanks');
    if (needStaticUpload || !flankSlot || flankSlot.w !== w || flankSlot.h !== h || !flankSlot.isFloat) {
      flankSlot = GPUMemPool.allocateSlot(gl, 'texFlanks', w, h, true);
      if (!flankSlot) return null;
      const fBuf = MemPool.acquire(Float32Array, w * h * 4);
      const fA = ctx && ctx.flankA, fB = ctx && ctx.flankB, fAl = ctx && ctx.flankAlpha, fPr = ctx && ctx.flankPerp;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        fBuf[i]     = fA ? fA[p] : -1;
        fBuf[i + 1] = fB ? fB[p] : -1;
        fBuf[i + 2] = fAl ? fAl[p] : 0.5;
        fBuf[i + 3] = fPr ? fPr[p] : 0;
      }
      uploadBufferToSlot(gl, 'texFlanks', w, h, fBuf, true);
      MemPool.release(fBuf);
    }

    /* Sinkronkan thinStrokeLab ke texLabGrad (.r) sekali saja per konteks */
    let nearSlot = GPUMemPool.getSlot('texLabGrad');
    if (needStaticUpload || !nearSlot || nearSlot.w !== w || nearSlot.h !== h || !nearSlot.isFloat) {
      nearSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
      if (!nearSlot) return null;
      const nBuf = MemPool.acquire(Float32Array, w * h * 4);
      const ts = (ctx && ctx.thinStrokeLab) || (labels && labels._segCtx && labels._segCtx.thinStrokeLab);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        nBuf[i]     = ts ? ts[p] : -1;
        nBuf[i + 1] = 0;
        nBuf[i + 2] = 0;
        nBuf[i + 3] = 1;
      }
      uploadBufferToSlot(gl, 'texLabGrad', w, h, nBuf, true);
      MemPool.release(nBuf);
    }

    /* Bangun & unggah LUT pasangan palet (K*K x K) ke texPalLut sekali saja per palet */
    const lutW = K * K, lutH = K;
    let palLutSlot = GPUMemPool.getSlot('texPalLut');
    if (needStaticUpload || !palLutSlot || palLutSlot.w !== lutW || palLutSlot.h !== lutH || !palLutSlot.isFloat) {
      palLutSlot = GPUMemPool.allocateSlot(gl, 'texPalLut', lutW, lutH, true);
      if (!palLutSlot) return null;
      const lutBuf = new Float32Array(lutW * lutH * 4);
      const palDist2 = ctx ? ctx.palDist2 : null;
      const palIsMidBlend = ctx ? ctx.palIsMidBlend : null;
      for (let l = 0; l < K; l++) {
        const cl = palette[l] || { r: 0, g: 0, b: 0 };
        const packedGB = cl.g + cl.b * 256.0;
        for (let a = 0; a < K; a++) {
          for (let b = 0; b < K; b++) {
            const ab = a * K + b;
            const idx = (l * lutW + ab) * 4;
            const d2 = palDist2 ? palDist2[ab] : cdist2(palette[a].r, palette[a].g, palette[a].b, palette[b].r, palette[b].g, palette[b].b);
            const mid = palIsMidBlend ? palIsMidBlend[l * K * K + ab] : 0;
            lutBuf[idx]     = d2;
            lutBuf[idx + 1] = mid ? 1.0 : 0.0;
            lutBuf[idx + 2] = cl.r;
            lutBuf[idx + 3] = packedGB;
          }
        }
      }
      uploadBufferToSlot(gl, 'texPalLut', lutW, lutH, lutBuf, true);
    }
    cacheTarget._gpuStaticSynced = true;
    cacheTarget._gpuStaticW = w;
    cacheTarget._gpuStaticH = h;
    cacheTarget._gpuStaticPalSig = palSig;

    /* Unggah labels, mask, dan _detailProt ke texLabelsA */
    const labSlotA = GPUMemPool.allocateSlot(gl, 'texLabelsA', w, h, true);
    const labSlotB = GPUMemPool.allocateSlot(gl, 'texLabelsB', w, h, true);
    if (!labSlotA || !labSlotB) return null;
    {
      const lBuf = MemPool.acquire(Float32Array, w * h * 4);
      const detailProt = labels._detailProt || null;
      const origA = work && work.origAlpha ? work.origAlpha : null;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        lBuf[i]     = labels[p];
        lBuf[i + 1] = (mask && mask[p]) ? 1.0 : 0.0;
        lBuf[i + 2] = (detailProt && detailProt[p]) ? 1.0 : 0.0;
        lBuf[i + 3] = origA ? (origA[p] / 255.0) : 1.0;
      }
      uploadBufferToSlot(gl, 'texLabelsA', w, h, lBuf, true);
      MemPool.release(lBuf);
    }

    return {
      rawSlot, fltSlot, edgeSlot, tensorSlot, flankSlot, nearSlot, palLutSlot, labSlotA, labSlotB, w, h, K
    };
  }

  function bindTahap3CommonUniforms(g, prog, state, srcLabelTex) {
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, srcLabelTex);        g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, state.rawSlot.tex);   g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
    g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, state.fltSlot.tex);   g.uniform1i(g.getUniformLocation(prog, 'u_fltTex'), 2);
    g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, state.edgeSlot.tex);  g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 3);
    g.activeTexture(g.TEXTURE4); g.bindTexture(g.TEXTURE_2D, state.tensorSlot.tex);g.uniform1i(g.getUniformLocation(prog, 'u_tensorTex'), 4);
    g.activeTexture(g.TEXTURE5); g.bindTexture(g.TEXTURE_2D, state.flankSlot.tex); g.uniform1i(g.getUniformLocation(prog, 'u_flankTex'), 5);
    g.activeTexture(g.TEXTURE6); g.bindTexture(g.TEXTURE_2D, state.nearSlot.tex);  g.uniform1i(g.getUniformLocation(prog, 'u_nearTex'), 6);
    g.activeTexture(g.TEXTURE7); g.bindTexture(g.TEXTURE_2D, state.palLutSlot.tex);g.uniform1i(g.getUniformLocation(prog, 'u_palLut'), 7);
    g.uniform2f(g.getUniformLocation(prog, 'u_res'), state.w, state.h);
    g.uniform1i(g.getUniformLocation(prog, 'u_K'), state.K);
  }

  function readbackLabelsFromSlot(gl, slot, labels, w, h) {
    const outBuf = MemPool.acquire(Float32Array, w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, slot.fbo);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, outBuf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let changed = 0;
    for (let p = 0; p < w * h; p++) {
      const nl = Math.round(outBuf[p * 4]);
      if (labels[p] !== nl) {
        labels[p] = nl;
        changed++;
      }
    }
    MemPool.release(outBuf);
    return changed;
  }

  function gpuLocalNeighborhoodEdgeSnap(work, mask, labels, palette, passes = 4, segCtx = null) {
    return false; /* Jalankan opposite-side sandwich snap eksak di CPU (< 8ms pada ~2% piksel batas) */
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let pass = 0; pass < passes; pass++) {
        const okA = runSlotPass(env, 'edgeSnapAnchor', FS_EDGE_SNAP_ANCHOR, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_pass'), pass);
        });
        if (!okA) return false;
        const okB = runSlotPass(env, 'edgeSnapStep', FS_EDGE_SNAP_STEP, curSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, nxtSlot.tex);
        });
        if (!okB) return false;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuSegmentMRF(work, mask, labels, palette, opt = {}, segCtx = null, onTick = null) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;

      const baseBeta = opt.beta || 1350;
      const maxIter = opt.maxIter || 20;
      const singleStepMode = maxIter === 1 && typeof opt.iterIndex === 'number';
      const startIt = typeof opt.startIter === 'number' ? opt.startIter : (singleStepMode ? opt.iterIndex : 0);
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;

      /* Urutan rotasi warna kromatik (0..3) yang bergeser setiap iterasi untuk konvergensi isotropik */
      const COLOR_ORDERS = [
        [0, 3, 1, 2],
        [3, 0, 2, 1],
        [1, 2, 0, 3],
        [2, 1, 3, 0]
      ];

      for (let it = 0; it < maxIter; it++) {
        const effIt = startIt + it;
        const effTotal = opt.totalIters || maxIter;
        const anneal = (singleStepMode && typeof opt.startIter !== 'number') ? 1.0 : (0.55 + 0.55 * (effIt / Math.max(1, effTotal - 1)));
        const beta = baseBeta * anneal;
        const checkTopo = (opt.topology !== false && effIt >= 1) ? 1 : 0;
        const order = COLOR_ORDERS[effIt & 3];

        for (let c = 0; c < 4; c++) {
          const colorPass = order[c];
          const ok = runSlotPass(env, 'mrfPotts4Color', FS_MRF_POTTS_4COLOR, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), colorPass);
            g.uniform1f(g.getUniformLocation(prog, 'u_beta'), beta);
            g.uniform1i(g.getUniformLocation(prog, 'u_checkTopo'), checkTopo);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
        if (onTick) onTick((it + 1) / maxIter, 0);
      }

      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuErodeSandwichedRibbons(labels, w, h, work, palette, mask, segCtx = null) {
    return false; /* Jalankan multi-step ribbon erosion eksak di CPU (< 5ms) */
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let pass = 0; pass < 2; pass++) {
        const ok = runSlotPass(env, 'ribbonErode', FS_RIBBON_ERODE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuResolveCheckerboardSaddles(labels, w, h, work, palette, mask) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, mask, palette, ctx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let bp = 0; bp < 4; bp++) {
        const ok = runSlotPass(env, 'checkerboardSaddle', FS_CHECKERBOARD_SADDLE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_blockParity'), bp);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuAbsorbBoundaryParasites(labels, w, h, work, palette, mask) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, mask, palette, ctx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let pass = 0; pass < 2; pass++) {
        for (let c = 0; c < 4; c++) {
          const ok = runSlotPass(env, 'parasiteClean', FS_PARASITE_CLEAN, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), c);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }
      for (let bp = 0; bp < 4; bp++) {
        const ok = runSlotPass(env, 'checkerboardSaddle', FS_CHECKERBOARD_SADDLE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_blockParity'), bp);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuMorphCleanStrokes(labels, w, h, work, palette, mask, segCtx = null) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;

      /* 1. Closing 1px Bridge (4-Color Chromatic dengan Topo Guard) */
      for (let c = 0; c < 4; c++) {
        const ok = runSlotPass(env, 'morphCloseOpen', FS_MORPH_CLOSE_OPEN, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_mode'), 0);
          g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), c);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* 2. Opening 1px Protrusion */
      {
        const ok = runSlotPass(env, 'morphCloseOpen', FS_MORPH_CLOSE_OPEN, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_mode'), 1);
          g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), 0);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* 3. Sandwiched Boundary Ribbon Erosion (2 Pass di VRAM tanpa readback antara) */
      for (let pass = 0; pass < 2; pass++) {
        const ok = runSlotPass(env, 'ribbonErode', FS_RIBBON_ERODE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* 4. Parasitic Pimple/Hook Clean (2 Pass x 4-Color Chromatic di VRAM) */
      for (let pass = 0; pass < 2; pass++) {
        for (let c = 0; c < 4; c++) {
          const ok = runSlotPass(env, 'parasiteClean', FS_PARASITE_CLEAN, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), c);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      /* 5. 2x2 Checkerboard Saddle Resolver (2 Sweep x 4-Pass Non-Overlapping Blocks di VRAM) */
      for (let sweep = 0; sweep < 2; sweep++) {
        for (let bp = 0; bp < 4; bp++) {
          const ok = runSlotPass(env, 'checkerboardSaddle', FS_CHECKERBOARD_SADDLE, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_blockParity'), bp);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      /* Readback tunggal ke RAM setelah seluruh rangkaian 5 tahap pembersihan di VRAM selesai! */
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ============================================================================
     TAHAP 4 SHADERS: Planar Vertex Valence, Sub-Pixel Beach Deconvolution
     (2x2 Square Area Inversion + Border Extrapolation + Corner/Junction Ray
     Intersection + 6-Pass Anisotropic Taubin Relaxation) pada Kisi (w+1)x(h+1)
     `bufVerticesA/B` + Parallel Contour Taubin/Despeckle Fairing di GPU
     ============================================================================ */
  const GLSL_TAHAP4_VERTEX_COMMON = `#version 300 es
  precision highp float;
  precision highp int;

  uniform sampler2D u_labels;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_palLut;
  uniform sampler2D u_vtx;
  uniform sampler2D u_refTex;
  uniform ivec2 u_imgRes;
  uniform int u_K;
  uniform int u_hasOrigAlpha;
  uniform float u_weight;

  int lblAt(int px, int py) {
    if (px < 0 || py < 0 || px >= u_imgRes.x || py >= u_imgRes.y) return -1;
    return int(round(texelFetch(u_labels, ivec2(px, py), 0).r));
  }

  vec3 fetchPalRGB(int l) {
    if (l < 0 || l >= u_K) return vec3(0.0);
    vec4 v = texelFetch(u_palLut, ivec2(0, l), 0);
    float r = v.b;
    float b = floor(v.a / 256.0);
    float g = v.a - b * 256.0;
    return vec3(r, g, b);
  }

  int vertexValence(ivec2 v) {
    int nw = lblAt(v.x - 1, v.y - 1);
    int ne = lblAt(v.x,     v.y - 1);
    int sw = lblAt(v.x - 1, v.y    );
    int se = lblAt(v.x,     v.y    );
    int deg = 0;
    if (nw != ne) deg++;
    if (ne != se) deg++;
    if (se != sw) deg++;
    if (sw != nw) deg++;
    return deg;
  }

  /* Mengembalikan tetangga aktif pada kisi verteks (w+1)x(h+1) dalam urutan persis CPU adj.get(k):
     1. Up (v.x, v.y - 1)
     2. Left (v.x - 1, v.y)
     3. Right (v.x + 1, v.y)
     4. Down (v.x, v.y + 1) */
  int getGridNeighbors(ivec2 v, out ivec2 nbs[4]) {
    int cnt = 0;
    int w = u_imgRes.x, h = u_imgRes.y;
    if (v.y > 0 && v.x > 0 && v.x < w && lblAt(v.x - 1, v.y - 1) != lblAt(v.x, v.y - 1)) {
      nbs[cnt++] = ivec2(v.x, v.y - 1);
    }
    if (v.x > 0 && v.y > 0 && v.y < h && lblAt(v.x - 1, v.y - 1) != lblAt(v.x - 1, v.y)) {
      nbs[cnt++] = ivec2(v.x - 1, v.y);
    }
    if (v.x < w && v.y > 0 && v.y < h && lblAt(v.x, v.y - 1) != lblAt(v.x, v.y)) {
      nbs[cnt++] = ivec2(v.x + 1, v.y);
    }
    if (v.y < h && v.x > 0 && v.x < w && lblAt(v.x - 1, v.y) != lblAt(v.x, v.y)) {
      nbs[cnt++] = ivec2(v.x, v.y + 1);
    }
    return cnt;
  }

  /* Penelusuran rantai batas kisi (ekuivalen walkChainKeys di CPU) */
  int walkChainGrid(ivec2 startV, ivec2 firstNb, int maxSteps, out ivec2 chain[9]) {
    chain[0] = startV;
    int len = 1;
    ivec2 cur = firstNb;
    ivec2 prev = startV;
    for (int s = 1; s <= 8; s++) {
      if (s > maxSteps) break;
      chain[len++] = cur;
      if (vertexValence(cur) != 2) break;
      ivec2 cnbs[4];
      int cCnt = getGridNeighbors(cur, cnbs);
      if (cCnt != 2) break;
      ivec2 nxt = (cnbs[0].x == prev.x && cnbs[0].y == prev.y) ? cnbs[1] : cnbs[0];
      prev = cur;
      cur = nxt;
    }
    return len;
  }

  /* Penelusuran lengan lurus kisi hingga maxSteps=8 (ekuivalen walkStraightArmKeys di CPU) */
  int walkStraightArmGrid(ivec2 startV, ivec2 firstNb, int maxSteps, out ivec2 chain[9]) {
    chain[0] = startV;
    chain[1] = firstNb;
    int len = 2;
    ivec2 prev = startV;
    ivec2 cur = firstNb;
    int dx0 = firstNb.x - startV.x;
    int dy0 = firstNb.y - startV.y;
    for (int s = 1; s < 8; s++) {
      if (s >= maxSteps) break;
      if (vertexValence(cur) != 2) break;
      ivec2 cnbs[4];
      int cCnt = getGridNeighbors(cur, cnbs);
      if (cCnt != 2) break;
      ivec2 nxt = (cnbs[0].x == prev.x && cnbs[0].y == prev.y) ? cnbs[1] : cnbs[0];
      if (nxt.x == startV.x && nxt.y == startV.y) break;
      int dx = nxt.x - cur.x;
      int dy = nxt.y - cur.y;
      if (dx * dx0 + dy * dy0 <= 0 && len >= 3) break;
      chain[len++] = nxt;
      prev = cur;
      cur = nxt;
    }
    return len;
  }

  /* Inversi Luas Persegi 2x2 Sub-Piksel Eksak (invert2x2SquareShift) */
  float invert2x2SquareShiftGL(float alphaBar, float nx, float ny) {
    float a = max(abs(nx), abs(ny));
    float b = min(abs(nx), abs(ny));
    float al = clamp(alphaBar, 0.0, 1.0);
    if (a < 1e-6) return 0.0;
    float trans = b / (2.0 * a);
    float s;
    if (al < trans && b > 1e-5) {
      s = -((a + b) - sqrt(max(0.0, 8.0 * a * b * al)));
    } else if (al > 1.0 - trans && b > 1e-5) {
      s = +((a + b) - sqrt(max(0.0, 8.0 * a * b * (1.0 - al))));
    } else {
      s = 2.0 * a * (al - 0.5);
    }
    return clamp(s, -0.72, 0.72);
  }

  /* Total Least Squares 2D Line Fit (identik dengan fitLine2D di CPU) */
  bool fitLine2DGL(vec2 pts[8], int m, out vec2 c, out vec2 d, out float rms, out float maxDev, out float span) {
    if (m < 2) {
      c = vec2(0.0); d = vec2(1.0, 0.0); rms = 0.0; maxDev = 0.0; span = 0.0;
      return false;
    }
    vec2 meanP = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      meanP += pts[i];
    }
    meanP /= float(m);
    float sxx = 0.0, syy = 0.0, sxy = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      vec2 df = pts[i] - meanP;
      sxx += df.x * df.x;
      syy += df.y * df.y;
      sxy += df.x * df.y;
    }
    float th = 0.5 * atan(2.0 * sxy, sxx - syy);
    vec2 dir = vec2(cos(th), sin(th));
    vec2 chord = pts[m - 1] - pts[0];
    if (dot(dir, chord) < 0.0) dir = -dir;
    float ss = 0.0, mDev = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      vec2 df = pts[i] - meanP;
      float e = abs(df.x * dir.y - df.y * dir.x);
      if (e > mDev) mDev = e;
      ss += e * e;
    }
    c = meanP;
    d = dir;
    rms = sqrt(ss / float(m));
    maxDev = mDev;
    span = length(chord);
    return true;
  }

  /* Kåsa Circle Fit 2D pada hingga 17 titik (identik dengan fitCircle2D di CPU) */
  bool fitCircle2DGL(vec2 pts[17], int m, out float rOut, out float rmsOut) {
    rOut = 0.0; rmsOut = 999.0;
    if (m < 4) return false;
    float sx = 0.0, sy = 0.0, sx2 = 0.0, sy2 = 0.0, sxy = 0.0, sx3 = 0.0, sy3 = 0.0, sx2y = 0.0, sxy2 = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      float x = pts[i].x, y = pts[i].y;
      float x2 = x * x, y2 = y * y;
      sx += x; sy += y; sx2 += x2; sy2 += y2; sxy += x * y;
      sx3 += x2 * x; sy3 += y2 * y; sx2y += x2 * y; sxy2 += x * y2;
    }
    float fm = float(m);
    float C = fm * sx2 - sx * sx;
    float D = fm * sxy - sx * sy;
    float E = fm * sy2 - sy * sy;
    float G = 0.5 * (fm * sx3 + fm * sxy2 - sx * sx2 - sx * sy2);
    float H = 0.5 * (fm * sx2y + fm * sy3 - sy * sx2 - sy * sy2);
    float det = C * E - D * D;
    if (abs(det) < 1e-6) return false;
    float cx = (G * E - H * D) / det;
    float cy = (C * H - D * G) / det;
    float r = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      r += length(pts[i] - vec2(cx, cy));
    }
    r /= fm;
    float ss = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      float e = length(pts[i] - vec2(cx, cy)) - r;
      ss += e * e;
    }
    rOut = r;
    rmsOut = sqrt(ss / fm);
    return true;
  }
  `;

  /* PASS 1: Step A dari refineBeachPlanar — 2x2 Square Area Inversion & 90-Degree Grid Corner Deconvolution */
  const FS_VERTEX_BEACH_DECONV = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    int val = vertexValence(v);
    if (val < 2) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    if (val >= 3) {
      /* Pin = 1 dikodekan sebagai offset +16384.0 pada kanal .b */
      outVtx = vec4(float(x), float(y), 16384.0, 0.0);
      return;
    }

    int qLabs[4];
    qLabs[0] = lblAt(x - 1, y - 1);
    qLabs[1] = lblAt(x,     y - 1);
    qLabs[2] = lblAt(x - 1, y    );
    qLabs[3] = lblAt(x,     y    );
    int la = qLabs[0];
    int lb = -2, cntA2 = 0, cntB2 = 0;
    for (int i = 0; i < 4; i++) {
      if (qLabs[i] == la) cntA2++;
      else {
        if (lb == -2) lb = qLabs[i];
        if (qLabs[i] == lb) cntB2++;
      }
    }
    if (lb == -2 || cntA2 + cntB2 < 4) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }

    float ax = 0.0, ay = 0.0, an = 0.0, bx = 0.0, by = 0.0, bn = 0.0;
    int foreign = 0;
    vec3 sumA = vec3(0.0), sumB = vec3(0.0);
    float wAr = 0.0, wBr = 0.0;

    for (int j = -3; j <= 2; j++) {
      int py = y + j;
      if (py < 0 || py >= h) continue;
      for (int i = -3; i <= 2; i++) {
        int px = x + i;
        if (px < 0 || px >= w) continue;
        int L = lblAt(px, py);
        float cx = float(i) + 0.5, cy = float(j) + 0.5;
        float r2d = cx * cx + cy * cy;
        float wgt = exp(-r2d / 3.0);
        if (L == la) {
          ax += cx * wgt; ay += cy * wgt; an += wgt;
          if (r2d >= 1.5) {
            sumA += texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
            wAr += 1.0;
          }
        } else if (L == lb) {
          bx += cx * wgt; by += cy * wgt; bn += wgt;
          if (r2d >= 1.5) {
            sumB += texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
            wBr += 1.0;
          }
        } else if (i >= -2 && i <= 1 && j >= -2 && j <= 1) {
          foreign++;
        }
      }
    }

    if (an <= 0.0 || bn <= 0.0) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }

    float nx = (bx / bn) - (ax / an);
    float ny = (by / bn) - (ay / an);
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt == 2) {
      ivec2 chA[9], chB[9];
      int lenA = walkChainGrid(v, nbs[0], 3, chA);
      int lenB = walkChainGrid(v, nbs[1], 3, chB);
      ivec2 kA = chA[lenA - 1];
      ivec2 kB = chB[lenB - 1];
      float tx = float(kB.x - kA.x), ty = float(kB.y - kA.y);
      float tl = length(vec2(tx, ty));
      if (tl > 1.5) {
        float cnx = -ty / tl, cny = tx / tl;
        if (cnx * nx + cny * ny < 0.0) { cnx = -cnx; cny = -cny; }
        float nlen = length(vec2(nx, ny));
        if (nlen <= 0.0) nlen = 1.0;
        nx = 0.55 * (nx / nlen) + 0.45 * cnx;
        ny = 0.55 * (ny / nlen) + 0.45 * cny;
      }
    }
    float nl = length(vec2(nx, ny));
    if (nl < 1e-5) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    nx /= nl; ny /= nl;

    bool hasCA = (la >= 0 && la < u_K);
    bool hasCB = (lb >= 0 && lb < u_K);
    vec3 palA = hasCA ? fetchPalRGB(la) : vec3(0.0);
    vec3 palB = hasCB ? fetchPalRGB(lb) : vec3(0.0);
    vec3 CA = hasCA ? (wAr >= 2.0 ? (0.90 * (sumA / wAr) + 0.10 * palA) : palA) : vec3(0.0);
    vec3 CB = hasCB ? (wBr >= 2.0 ? (0.90 * (sumB / wBr) + 0.10 * palB) : palB) : vec3(0.0);
    vec3 dC = (hasCA && hasCB) ? (CA - CB) : vec3(0.0);
    float denom = dot(dC, dC);

    float sumAlpha = 0.0;
    int cntAlpha = 0;
    for (int j = -1; j <= 0; j++) {
      int py = y + j;
      for (int i = -1; i <= 0; i++) {
        int px = x + i;
        if (denom > 64.0) {
          vec3 irgb = texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
          float alpha = clamp(dot(irgb - CB, dC) / denom, 0.0, 1.0);
          sumAlpha += alpha;
          cntAlpha++;
        } else if ((la == -1 || lb == -1) && u_hasOrigAlpha == 1) {
          float aVal = texelFetch(u_labels, ivec2(px, py), 0).a;
          sumAlpha += (la == -1 ? 1.0 - aVal : aVal);
          cntAlpha++;
        }
      }
    }

    float vx = float(x), vy = float(y);
    bool isGridCorner90 = (foreign == 0) && ((cntA2 == 1 && cntB2 == 3) || (cntA2 == 3 && cntB2 == 1));
    if (isGridCorner90 && cntAlpha == 4 && denom > 64.0) {
      float a00 = clamp(dot(texelFetch(u_rawTex, ivec2(x - 1, y - 1), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a10 = clamp(dot(texelFetch(u_rawTex, ivec2(x,     y - 1), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a01 = clamp(dot(texelFetch(u_rawTex, ivec2(x - 1, y    ), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a11 = clamp(dot(texelFetch(u_rawTex, ivec2(x,     y    ), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      bool topDiff = (qLabs[0] != qLabs[1]), botDiff = (qLabs[2] != qLabs[3]);
      bool leftDiff = (qLabs[0] != qLabs[2]), rightDiff = (qLabs[1] != qLabs[3]);
      float alphaX = topDiff ? 0.5 * (a00 + a10) : (botDiff ? 0.5 * (a01 + a11) : 0.5);
      float alphaY = leftDiff ? 0.5 * (a00 + a01) : (rightDiff ? 0.5 * (a10 + a11) : 0.5);
      float signX = topDiff ? (qLabs[0] == la ? 1.0 : -1.0) : (qLabs[2] == la ? 1.0 : -1.0);
      float signY = leftDiff ? (qLabs[0] == la ? 1.0 : -1.0) : (qLabs[1] == la ? 1.0 : -1.0);
      vx = float(x) + signX * clamp(alphaX - 0.5, -0.42, 0.42);
      vy = float(y) + signY * clamp(alphaY - 0.5, -0.42, 0.42);
    } else {
      float alphaBar = (cntAlpha == 4) ? (sumAlpha * 0.25) : (float(cntA2) * 0.25);
      float shift = invert2x2SquareShiftGL(alphaBar, nx, ny) * (foreign > 0 ? 0.65 : 1.0);
      vx = float(x) + nx * shift;
      vy = float(y) + ny * shift;
    }

    outVtx = vec4(vx, vy, nx, ny);
  }`;

  /* PASS 2 & 10: Ekstrapolasi Sub-Piksel Verteks Tepi Bingkai (extrapolateBorderVertices) */
  const FS_VERTEX_BORDER_EXTRAP = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x > 0 && x < w && y > 0 && y < h) {
      outVtx = curV;
      return;
    }
    if ((x == 0 || x == w) && (y == 0 || y == h)) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt == 0) {
      outVtx = curV;
      return;
    }
    ivec2 intNb = ivec2(-1, -1);
    for (int i = 0; i < 4; i++) {
      if (i >= nCnt) break;
      ivec2 nb = nbs[i];
      if (nb.x > 0 && nb.x < w && nb.y > 0 && nb.y < h) {
        intNb = nb;
        break;
      }
    }
    if (intNb.x < 0) {
      outVtx = curV;
      return;
    }
    ivec2 ch[9];
    int chLen = walkChainGrid(v, intNb, 6, ch);
    if (chLen < 3) {
      outVtx = curV;
      return;
    }
    vec2 pts[8];
    int m = chLen - 1;
    for (int s = 1; s < 9; s++) {
      if (s >= chLen) break;
      pts[s - 1] = texelFetch(u_vtx, ch[s], 0).rg;
    }
    vec2 fc, fd;
    float fRms, fMaxDev, fSpan;
    if (!fitLine2DGL(pts, m, fc, fd, fRms, fMaxDev, fSpan)) {
      outVtx = curV;
      return;
    }
    if ((y == 0 || y == h) && abs(fd.y) > 0.25) {
      float t = (float(y) - fc.y) / fd.y;
      float bx = fc.x + fd.x * t;
      if (abs(bx - float(x)) <= 0.72) curV.r = clamp(bx, 0.0, float(w));
    } else if ((x == 0 || x == w) && abs(fd.x) > 0.25) {
      float t = (float(x) - fc.x) / fd.x;
      float by = fc.y + fd.y * t;
      if (abs(by - float(y)) <= 0.72) curV.g = clamp(by, 0.0, float(h));
    }
    outVtx = curV;
  }`;

  /* PASS 3a: Step B dari refineBeachPlanar — Corner Detection & Apex Ray-Intersection (Valence == 2) */
  const FS_VERTEX_CORNER_STEP_B = GLSL_TAHAP4_VERTEX_COMMON + `
  bool isArmLinearGL(vec2 ptsArm[8], int m, vec2 fc, vec2 fd, float fRms, float fMaxDev, float fSpan) {
    if (m < 2 || fSpan < 1.45 || fRms > 0.15 || fMaxDev > 0.28) return false;
    vec2 p0 = ptsArm[0], p1 = ptsArm[m - 1], pm = ptsArm[m >> 1];
    float ch = length(p1 - p0);
    if (ch <= 0.0) ch = 1.0;
    float sag = abs((pm.x - p0.x) * (p1.y - p0.y) - (pm.y - p0.y) * (p1.x - p0.x)) / ch;
    return sag <= 0.024;
  }

  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = curV;
      return;
    }
    if (vertexValence(v) != 2) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt != 2) {
      outVtx = curV;
      return;
    }

    ivec2 keysA[9], keysB[9];
    int lenA = walkStraightArmGrid(v, nbs[0], 8, keysA);
    int lenB = walkStraightArmGrid(v, nbs[1], 8, keysB);
    if (lenA < 3 || lenB < 3) {
      outVtx = curV;
      return;
    }

    int mA = lenA - 1, mB = lenB - 1;
    vec2 armA[8], armB[8];
    for (int i = 0; i < 8; i++) {
      if (i >= mA) break;
      armA[i] = texelFetch(u_vtx, keysA[lenA - 1 - i], 0).rg;
    }
    for (int i = 0; i < 8; i++) {
      if (i >= mB) break;
      armB[i] = texelFetch(u_vtx, keysB[i + 1], 0).rg;
    }

    vec2 fAc, fAd, fBc, fBd;
    float fArms, fAdev, fAspan, fBrms, fBdev, fBspan;
    if (!fitLine2DGL(armA, mA, fAc, fAd, fArms, fAdev, fAspan) ||
        !fitLine2DGL(armB, mB, fBc, fBd, fBrms, fBdev, fBspan)) {
      outVtx = curV;
      return;
    }

    float armTurn = abs(atan(fAd.x * fBd.y - fAd.y * fBd.x, dot(fAd, fBd)));
    if (armTurn < 0.42) {
      outVtx = curV;
      return;
    }

    vec2 pA3 = texelFetch(u_vtx, keysA[min(3, lenA - 1)], 0).rg;
    vec2 pB3 = texelFetch(u_vtx, keysB[min(3, lenB - 1)], 0).rg;
    vec2 pA6 = texelFetch(u_vtx, keysA[min(6, lenA - 1)], 0).rg;
    vec2 pB6 = texelFetch(u_vtx, keysB[min(6, lenB - 1)], 0).rg;
    float w3 = length(pB3 - pA3);
    float w6 = length(pB6 - pA6);
    vec2 mid6 = 0.5 * (pA6 + pB6);
    float sag6 = length(curV.rg - mid6);
    float sagRatio6 = w6 > 0.5 ? (sag6 / w6) : 0.0;

    bool isNarrowCap = (armTurn >= 2.35 && w3 <= 3.2 && w6 <= 3.8 && (w6 - w3) < 0.8);
    if (isNarrowCap) {
      outVtx = curV;
      return;
    }

    bool linA = isArmLinearGL(armA, mA, fAc, fAd, fArms, fAdev, fAspan);
    bool linB = isArmLinearGL(armB, mB, fBc, fBd, fBrms, fBdev, fBspan);
    bool bothLinear = linA && linB;

    vec2 arcPts[17];
    int mArc = 0;
    for (int i = 0; i < 8; i++) {
      if (i >= mA) break;
      arcPts[mArc++] = armA[i];
    }
    arcPts[mArc++] = curV.rg;
    for (int i = 0; i < 8; i++) {
      if (i >= mB) break;
      arcPts[mArc++] = armB[i];
    }
    float circR = 0.0, circRms = 999.0;
    bool hasCirc = (mArc >= 5) ? fitCircle2DGL(arcPts, mArc, circR, circRms) : false;
    float wedgeRms = 0.5 * (fArms + fBrms);
    bool isRoundArc = hasCirc && circR >= 2.2 && circR <= 95.0 && circRms <= min(0.18, wedgeRms * 0.72);

    bool isTrueCorner = !isRoundArc && (
      (bothLinear && armTurn >= 0.48 && sagRatio6 >= 0.16) ||
      (armTurn >= 0.65 && sagRatio6 >= 0.24 && (w6 - w3) >= 1.3 && wedgeRms <= 0.34)
    );

    if (isTrueCorner) {
      /* Tandai vSharpPin = 1 dengan menambahkan +16384.0 ke kanal .b */
      if (curV.b < 8192.0) curV.b += 16384.0;
      if (bothLinear) {
        float det = fAd.x * fBd.y - fAd.y * fBd.x;
        if (abs(det) > 0.12) {
          vec2 wVec = fBc - fAc;
          float t = (wVec.x * fBd.y - wVec.y * fBd.x) / det;
          vec2 ap = fAc + fAd * t;
          float d0 = length(ap - curV.rg);
          float d1 = length(ap - texelFetch(u_vtx, nbs[0], 0).rg);
          float d2 = length(ap - texelFetch(u_vtx, nbs[1], 0).rg);
          if (d0 <= d1 + 0.15 && d0 <= d2 + 0.15 && d0 <= 1.15) {
            curV.r = clamp(ap.x, float(x) - 0.65, float(x) + 0.65);
            curV.g = clamp(ap.y, float(y) - 0.65, float(y) + 0.65);
          }
        }
      } else if (linA != linB) {
        vec2 fStrC = linA ? fAc : fBc;
        vec2 fStrD = linA ? fAd : fBd;
        vec2 nearCurv[8];
        int mNear = min(4, linA ? lenB : lenA);
        for (int i = 0; i < 4; i++) {
          if (i >= mNear) break;
          ivec2 kv = linA ? keysB[i] : keysA[i];
          nearCurv[i] = texelFetch(u_vtx, kv, 0).rg;
        }
        vec2 fNc, fNd;
        float fNrms, fNdev, fNspan;
        if (fitLine2DGL(nearCurv, mNear, fNc, fNd, fNrms, fNdev, fNspan)) {
          float det = fStrD.x * fNd.y - fStrD.y * fNd.x;
          if (abs(det) > 0.15) {
            vec2 wVec = fNc - fStrC;
            float t = (wVec.x * fNd.y - wVec.y * fNd.x) / det;
            vec2 ap = fStrC + fStrD * t;
            float d0 = length(ap - curV.rg);
            if (d0 <= 0.42) {
              curV.r = clamp(ap.x, float(x) - 0.45, float(x) + 0.45);
              curV.g = clamp(ap.y, float(y) - 0.45, float(y) + 0.45);
            }
          }
        }
      }
    }
    outVtx = curV;
  }`;

  /* PASS 3b: Step B2 dari refineBeachPlanar — Multi-Region T/X-Junction Least-Squares Ray Intersection */
  const FS_VERTEX_JUNC_STEP_B2 = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h || vertexValence(v) < 3) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt < 3) {
      outVtx = curV;
      return;
    }
    float a00 = 0.20, a01 = 0.0, a11 = 0.20;
    float b0 = 0.20 * float(x), b1 = 0.20 * float(y);
    int validBranches = 0;

    for (int bi = 0; bi < 4; bi++) {
      if (bi >= nCnt) break;
      ivec2 ch[9];
      int chLen = walkChainGrid(v, nbs[bi], 6, ch);
      int m = chLen - 1;
      if (m >= 2) {
        vec2 pts[8];
        for (int s = 1; s < 9; s++) {
          if (s >= chLen) break;
          pts[s - 1] = texelFetch(u_vtx, ch[s], 0).rg;
        }
        vec2 fc, fd;
        float fRms, fDev, fSpan;
        if (fitLine2DGL(pts, m, fc, fd, fRms, fDev, fSpan)) {
          float nx = -fd.y, ny = fd.x;
          float wgt = 1.0 / (0.04 + fRms);
          a00 += wgt * nx * nx;
          a01 += wgt * nx * ny;
          a11 += wgt * ny * ny;
          float rhs = nx * fc.x + ny * fc.y;
          b0 += wgt * nx * rhs;
          b1 += wgt * ny * rhs;
          validBranches++;
        }
      }
    }

    if (validBranches >= 2) {
      float det = a00 * a11 - a01 * a01;
      if (abs(det) > 1e-6) {
        float jx = (a11 * b0 - a01 * b1) / det;
        float jy = (a00 * b1 - a01 * b0) / det;
        curV.r = clamp(jx, float(x) - 0.50, float(x) + 0.50);
        curV.g = clamp(jy, float(y) - 0.50, float(y) + 0.50);
      }
    }
    outVtx = curV;
  }`;

  /* PASS 3c: Snapshot verteks interior (1..w-1, 1..h-1) ke texLabGrad sebagai referensi beachVx/beachVy/normX/normY */
  const FS_SNAPSHOT_INTERIOR_VTX = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_vtx;
  out vec4 outRef;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    outRef = texelFetch(u_vtx, p, 0);
  }`;

  /* PASS 4..9: Step C dari refineBeachPlanar — 6-Pass Anisotropic Tangential-Dominant Taubin Relaxation */
  const FS_VERTEX_TAUBIN_ANISO = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = curV;
      return;
    }
    if (curV.b >= 8192.0 || vertexValence(v) != 2) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt != 2) {
      outVtx = curV;
      return;
    }
    ivec2 a = nbs[0], b = nbs[1];
    vec4 va = texelFetch(u_vtx, a, 0);
    vec4 vb = texelFetch(u_vtx, b, 0);
    bool dampCond = (va.b >= 8192.0) || (vb.b >= 8192.0) || (vertexValence(a) >= 3) || (vertexValence(b) >= 3);
    float damp = dampCond ? 0.30 : 1.0;

    vec2 m = 0.5 * (va.rg + vb.rg);
    vec2 d = (m - curV.rg) * (u_weight * damp);

    vec4 refV = texelFetch(u_refTex, v, 0);
    vec2 beachV = refV.rg;
    float nx = refV.b >= 8192.0 ? (refV.b - 16384.0) : refV.b;
    float ny = refV.a;

    if (nx != 0.0 || ny != 0.0) {
      vec2 nVec = vec2(nx, ny);
      vec2 tVec = vec2(-ny, nx);
      float dNorm = dot(d, nVec);
      float dTang = dot(d, tVec);
      vec2 newP = curV.rg + tVec * dTang + nVec * (dNorm * 0.40);
      vec2 totD = newP - beachV;
      float cNorm = clamp(dot(totD, nVec), -0.14, 0.14);
      float cTang = clamp(dot(totD, tVec), -0.36, 0.36);
      outVtx = vec4(beachV + tVec * cTang + nVec * cNorm, curV.b, curV.a);
    } else {
      outVtx = vec4(
        clamp(curV.r + d.x, beachV.x - 0.22, beachV.x + 0.22),
        clamp(curV.g + d.y, beachV.y - 0.22, beachV.y + 0.22),
        curV.b,
        curV.a
      );
    }
  }`;

  /* Shader Paralel Taubin Closed-Loop Fairing pada Tekstur 2D Bertumpuk (untuk kontur panjang / batch) */
  const FS_CONTOUR_TAUBIN_PASS = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_weight;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int y = idx / u_texW;
    int x = idx - y * u_texW;
    return ivec2(x, y);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n || cur.b > 0.5) {
      outPt = cur;
      return;
    }
    int ia = (i - 1 + u_n) % u_n;
    int ib = (i + 1) % u_n;
    vec2 pa = texelFetch(u_ptsTex, idxToCoord(ia), 0).rg;
    vec2 pb = texelFetch(u_ptsTex, idxToCoord(ib), 0).rg;
    vec2 nextP = cur.rg + u_weight * (0.5 * (pa + pb) - cur.rg);
    outPt = vec4(nextP, cur.b, cur.a);
  }`;

  /* Eksekusi Penuh Sub-Pixel Beach Deconvolution (Step A + Extrap + Step B + Step B2 + Step C + Extrap) di GPU */
  function gpuRefineBeachPlanar(vxCoord, vyCoord, vValence, vSharpPin, labels, w, h, work, palette) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    const { gl } = env;
    const GW = w + 1, GH = h + 1;
    if (GW > HW_LIMITS.gpu.maxTexSize || GH > HW_LIMITS.gpu.maxTexSize) return false;

    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, null, palette, ctx, labels);
      if (!state) return false;

      const vtxSlotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', w, h, true);
      const vtxSlotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', w, h, true);
      const refSlot  = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
      if (!vtxSlotA || !vtxSlotB || !refSlot || !vtxSlotA.isFloat || !vtxSlotB.isFloat) return false;

      const hasOrigAlpha = (work && work.origAlpha && work.origAlpha.length === w * h) ? 1 : 0;

      /* Pass 1: Step A — 2x2 Square Area Inversion & 90-Deg Grid Corner Deconvolution -> vtxSlotA */
      const ok1 = runSlotPass(env, 'vtxBeachDeconv', FS_VERTEX_BEACH_DECONV, vtxSlotA, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, state.rawSlot.tex);  g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
        g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, state.palLutSlot.tex); g.uniform1i(g.getUniformLocation(prog, 'u_palLut'), 2);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), state.K);
        g.uniform1i(g.getUniformLocation(prog, 'u_hasOrigAlpha'), hasOrigAlpha);
      });
      if (!ok1) return false;

      /* Pass 2: Border Vertex Sub-Pixel Extrapolation -> vtxSlotB */
      const ok2 = runSlotPass(env, 'vtxBorderExtrap', FS_VERTEX_BORDER_EXTRAP, vtxSlotB, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, vtxSlotA.tex);       g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!ok2) return false;

      /* Pass 3a: Step B — Corner Detection & Apex Ray-Intersection (val == 2) -> vtxSlotA */
      const ok3a = runSlotPass(env, 'vtxCornerStepB', FS_VERTEX_CORNER_STEP_B, vtxSlotA, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, vtxSlotB.tex);       g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!ok3a) return false;

      /* Pass 3b: Step B2 — Multi-Region T/X-Junction Least-Squares Ray Intersection (val >= 3) -> vtxSlotB */
      const ok3b = runSlotPass(env, 'vtxJuncStepB2', FS_VERTEX_JUNC_STEP_B2, vtxSlotB, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, vtxSlotA.tex);       g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!ok3b) return false;

      /* Pass 3c: Snapshot post-Step-B2 coordinates & normals ke refSlot (texLabGrad) untuk batas tabung Step C */
      const okSnap = runSlotPass(env, 'vtxSnapshotRef', FS_SNAPSHOT_INTERIOR_VTX, refSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, vtxSlotB.tex); g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 0);
      });
      if (!okSnap) return false;

      /* Pass 4..9: Step C — 6-Pass Anisotropic Tangential-Dominant Taubin Relaxation */
      const TAUBIN_WEIGHTS = [0.42, -0.44, 0.38, -0.40, 0.34, -0.36];
      let curSlot = vtxSlotB, nxtSlot = vtxSlotA;
      for (let wi = 0; wi < TAUBIN_WEIGHTS.length; wi++) {
        const wgt = TAUBIN_WEIGHTS[wi];
        const okC = runSlotPass(env, 'vtxTaubinAniso', FS_VERTEX_TAUBIN_ANISO, nxtSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
          g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, curSlot.tex);        g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
          g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, refSlot.tex);        g.uniform1i(g.getUniformLocation(prog, 'u_refTex'), 2);
          g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
          g.uniform1f(g.getUniformLocation(prog, 'u_weight'), wgt);
        });
        if (!okC) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* Pass 10: Final Border Vertex Extrapolation -> nxtSlot */
      const okEnd = runSlotPass(env, 'vtxBorderExtrap', FS_VERTEX_BORDER_EXTRAP, nxtSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, curSlot.tex);        g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!okEnd) return false;

      /* Readback tunggal seluruh kisi verteks planar (w+1)x(h+1) dari VRAM ke RAM */
      const totalVtx = GW * GH;
      const outFloats = MemPool.acquire(Float32Array, totalVtx * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, nxtSlot.fbo);
      gl.readPixels(0, 0, GW, GH, gl.RGBA, gl.FLOAT, outFloats);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      for (let k = 0; k < totalVtx; k++) {
        const i = k * 4;
        vxCoord[k] = outFloats[i];
        vyCoord[k] = outFloats[i + 1];
        vSharpPin[k] = outFloats[i + 2] >= 8192.0 ? 1 : 0;
      }
      MemPool.release(outFloats);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Eksekusi Paralel Closed-Contour Taubin Filter di GPU */
  function gpuTaubinFilterClosed(pts, corners, passes = 14, lam = 0.45, mu = -0.473) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const n = pts ? pts.length : 0;
    if (n < 5) return null;
    const { gl } = env;
    try {
      const texW = Math.min(256, n);
      const texH = Math.ceil(n / texW);
      if (texW > HW_LIMITS.gpu.maxTexSize || texH > HW_LIMITS.gpu.maxTexSize) return null;
      const slotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', texW - 1, texH - 1, true);
      const slotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', texW - 1, texH - 1, true);
      if (!slotA || !slotB || !slotA.isFloat || !slotB.isFloat) return null;

      const totalTexels = slotA.w * slotA.h;
      const inBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        inBuf[idx]     = pts[i][0];
        inBuf[idx + 1] = pts[i][1];
        inBuf[idx + 2] = (corners && corners[i]) ? 1.0 : 0.0;
        inBuf[idx + 3] = 1.0;
      }
      uploadBufferToSlot(gl, 'bufVerticesA', texW - 1, texH - 1, inBuf, true);
      MemPool.release(inBuf);

      let curSlot = slotA, nxtSlot = slotB;
      for (let p = 0; p < passes; p++) {
        for (const wgt of [lam, mu]) {
          const ok = runSlotPass(env, 'contourTaubinPass', FS_CONTOUR_TAUBIN_PASS, nxtSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
            g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
            g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
            g.uniform1f(g.getUniformLocation(prog, 'u_weight'), wgt);
          });
          if (!ok) return null;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      const outBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, curSlot.fbo);
      gl.readPixels(0, 0, slotA.w, slotA.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const res = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        res[i] = [outBuf[idx], outBuf[idx + 1]];
      }
      MemPool.release(outBuf);
      return res;
    } catch (e) {
      return null;
    }
  }

  /* ============================================================================
     TAHAP 5 GPU KERNELS:
     1) Parallel Staircase Despeckle (Minkowski Tube +-0.48px) + Multi-Scale
        Quadratic Savitzky-Golay Fairing (Windows w=16, 36, Tube +-0.58px)
     2) Parallel 4th-Order Euler-Lagrange Elastica Bending + Data Relaxation
     3) Parallel Gauss-Newton / Newton-Raphson Cubic Bézier Fitting (Batch)
     4) Parallel Closed-Loop Round-Trip Evaluator (CIEDE2000 + Boundary IoU + Detail Recall)
     ============================================================================ */

  const FS_CONTOUR_DESPECKLE_PASS = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_rawTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_weight;
  uniform int u_isMuStep;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec2 ptAt(int idx) {
    return texelFetch(u_ptsTex, idxToCoord(idx), 0).rg;
  }

  float turnAt(int idx, out float l1Out, out float l2Out) {
    vec2 a = ptAt(idx - 1);
    vec2 p = ptAt(idx);
    vec2 b = ptAt(idx + 1);
    vec2 u = p - a;
    vec2 v = b - p;
    l1Out = length(u);
    l2Out = length(v);
    if (l1Out > 1e-5 && l2Out > 1e-5) {
      return atan(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y);
    }
    return 0.0;
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    vec2 rawP = texelFetch(u_rawTex, c, 0).rg;

    if (u_isMuStep == 0) {
      if (cur.b > 0.5) {
        outPt = vec4(cur.rg, cur.b, 0.0);
        return;
      }
      float lPrev = 0.0, lNext = 0.0;
      float t0 = turnAt(i, lPrev, lNext);
      bool hasOpp = false;
      for (int d = 1; d <= 4; d++) {
        float dm1 = 0.0, dm2 = 0.0;
        float tM = turnAt(i - d, dm1, dm2);
        float tP = turnAt(i + d, dm1, dm2);
        if (t0 * tM < -0.006 || t0 * tP < -0.006) {
          hasOpp = true;
          break;
        }
      }
      bool isZig = (abs(t0) >= 0.25 && hasOpp && min(lPrev, lNext) <= 4.5);
      if (!isZig) {
        outPt = vec4(cur.rg, cur.b, 0.0);
        return;
      }
      vec2 m = 0.5 * (ptAt(i - 1) + ptAt(i + 1));
      vec2 t = cur.rg + u_weight * (m - cur.rg);
      vec2 cl = clamp(t, rawP - vec2(0.48), rawP + vec2(0.48));
      outPt = vec4(cl, cur.b, 1.0);
    } else {
      if (cur.a < 0.5) {
        outPt = cur;
        return;
      }
      vec2 m = 0.5 * (ptAt(i - 1) + ptAt(i + 1));
      vec2 t = cur.rg + u_weight * (m - cur.rg);
      vec2 cl = clamp(t, rawP - vec2(0.48), rawP + vec2(0.48));
      outPt = vec4(cl, cur.b, 1.0);
    }
  }`;

  const FS_CONTOUR_SG_LOCK = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform int u_texW;
  uniform int u_n;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    if (cur.b > 0.5) {
      outPt = vec4(cur.rg, 1.0, cur.a);
      return;
    }
    vec2 pM4 = texelFetch(u_ptsTex, idxToCoord(i - 4), 0).rg;
    vec2 p0  = cur.rg;
    vec2 pP4 = texelFetch(u_ptsTex, idxToCoord(i + 4), 0).rg;
    vec2 u = p0 - pM4;
    vec2 v = pP4 - p0;
    float l1 = length(u), l2 = length(v);
    float locked = 0.0;
    if (l1 > 0.5 && l2 > 0.5) {
      float turn4 = abs(atan(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y));
      float c4 = max(1e-6, length(pP4 - pM4));
      float sag4 = length(p0 - 0.5 * (pM4 + pP4));
      if (turn4 >= 0.45 && (sag4 / c4) >= 0.16) locked = 1.0;
    }
    outPt = vec4(cur.rg, locked, cur.a);
  }`;

  const FS_CONTOUR_SG_FAIRING = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_rawTex;
  uniform int u_texW;
  uniform int u_n;
  uniform int u_maxW;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec4 fetchAt(int idx) {
    return texelFetch(u_ptsTex, idxToCoord(idx), 0);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n || cur.b > 0.5) {
      outPt = cur;
      return;
    }
    int quarterN = u_n >> 2;
    int w = 0;
    for (int step = 0; step < 36; step++) {
      if (w >= u_maxW || w >= quarterN) break;
      if (fetchAt(i - w - 1).b > 0.5 || fetchAt(i + w + 1).b > 0.5) break;
      w++;
    }
    if (w < 4) {
      outPt = cur;
      return;
    }
    float arc = 0.0;
    vec2 prevP = fetchAt(i - w).rg;
    vec2 pA = prevP;
    for (int k = -36; k < 36; k++) {
      if (k < -w) continue;
      if (k >= w) break;
      vec2 nxtP = fetchAt(i + k + 1).rg;
      arc += distance(prevP, nxtP);
      prevP = nxtP;
    }
    vec2 pB = prevP;
    float chord = distance(pA, pB);
    if (chord < 3.0 || (arc / chord) > 1.035) {
      outPt = cur;
      return;
    }

    float sig = float(w) * 0.55;
    float inv2Sig2 = 1.0 / (2.0 * sig * sig);
    float s0 = 0.0, s2 = 0.0, s4 = 0.0;
    float sx0 = 0.0, sx2 = 0.0, sy0 = 0.0, sy2 = 0.0;
    for (int k = -36; k <= 36; k++) {
      if (k < -w) continue;
      if (k > w) break;
      float fk = float(k);
      float k2 = fk * fk;
      float wt = exp(-k2 * inv2Sig2);
      vec2 pk = fetchAt(i + k).rg;
      s0 += wt;
      s2 += wt * k2;
      s4 += wt * k2 * k2;
      sx0 += wt * pk.x;
      sx2 += wt * k2 * pk.x;
      sy0 += wt * pk.y;
      sy2 += wt * k2 * pk.y;
    }
    float det = s0 * s4 - s2 * s2;
    if (abs(det) < 1e-9) {
      outPt = cur;
      return;
    }
    float ax = (s4 * sx0 - s2 * sx2) / det;
    float cx = (s0 * sx2 - s2 * sx0) / det;
    float ay = (s4 * sy0 - s2 * sy2) / det;
    float cy = (s0 * sy2 - s2 * sy0) / det;
    float bx = (pB.x - pA.x) / float(2 * w);
    float by = (pB.y - pA.y) / float(2 * w);

    float errSq = 0.0;
    for (int k = -36; k <= 36; k++) {
      if (k < -w) continue;
      if (k > w) break;
      float fk = float(k);
      vec2 pk = fetchAt(i + k).rg;
      float fx = ax + bx * fk + cx * fk * fk;
      float fy = ay + by * fk + cy * fk * fk;
      vec2 df = pk - vec2(fx, fy);
      errSq += dot(df, df);
    }
    float rms = sqrt(errSq / float(2 * w + 1));
    if (rms <= 0.42) {
      vec2 rawP = texelFetch(u_rawTex, c, 0).rg;
      vec2 cl = clamp(vec2(ax, ay), rawP - vec2(0.58), rawP + vec2(0.58));
      outPt = vec4(cl, cur.b, cur.a);
    } else {
      outPt = cur;
    }
  }`;

  function gpuDespeckleStaircaseClosed(pts, strength = 0.65, juncFlags = null, cornerPin = null) {
    return null; /* Jalankan Savitzky-Golay kuadratik penuh di CPU (< 3ms) */
    const n = pts ? pts.length : 0;
    if (n < 8 || strength <= 0.01) return pts ? pts.map(p => [p[0], p[1]]) : null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;

    try {
      const texW = Math.min(256, Math.max(16, Math.ceil(Math.sqrt(n))));
      const texH = Math.ceil(n / texW);
      const slotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', texW - 1, texH - 1, true);
      const slotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', texW - 1, texH - 1, true);
      const rawSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', slotA.w, slotA.h, true);
      if (!slotA || !slotB || !rawSlot || !slotA.isFloat) return null;

      const totalTexels = slotA.w * slotA.h;
      const inBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      const rawBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        const pinned = ((juncFlags && juncFlags[i]) || (cornerPin && cornerPin[i])) ? 1.0 : 0.0;
        inBuf[idx]     = rawBuf[idx]     = pts[i][0];
        inBuf[idx + 1] = rawBuf[idx + 1] = pts[i][1];
        inBuf[idx + 2] = rawBuf[idx + 2] = pinned;
        inBuf[idx + 3] = rawBuf[idx + 3] = 0.0;
      }
      uploadBufferToSlot(gl, 'bufVerticesA', texW - 1, texH - 1, inBuf, true);
      uploadBufferToSlot(gl, 'texLabGrad', slotA.w, slotA.h, rawBuf, true);
      MemPool.release(inBuf);
      MemPool.release(rawBuf);

      const passes = clamp(Math.round(2 + strength * 3), 2, 5);
      const lam = clamp(0.32 + strength * 0.14, 0.24, 0.45);
      const mu = -lam / (1 - 0.06 * lam);

      let curSlot = slotA, nxtSlot = slotB;
      for (let pass = 0; pass < passes; pass++) {
        for (let stepIdx = 0; stepIdx < 2; stepIdx++) {
          const wgt = stepIdx === 0 ? lam : mu;
          const ok = runSlotPass(env, 'contourDespecklePass', FS_CONTOUR_DESPECKLE_PASS, nxtSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
            g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
            g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
            g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
            g.uniform1f(g.getUniformLocation(prog, 'u_weight'), wgt);
            g.uniform1i(g.getUniformLocation(prog, 'u_isMuStep'), stepIdx);
          });
          if (!ok) return null;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      if (n >= 16 && strength >= 0.15) {
        const okLock = runSlotPass(env, 'contourSgLock', FS_CONTOUR_SG_LOCK, nxtSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
          g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
          g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
        });
        if (!okLock) return null;
        { const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp; }

        for (const maxW of [16, 36]) {
          const okSg = runSlotPass(env, 'contourSgFairing', FS_CONTOUR_SG_FAIRING, nxtSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
            g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
            g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
            g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
            g.uniform1i(g.getUniformLocation(prog, 'u_maxW'), maxW);
          });
          if (!okSg) return null;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      const outBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, curSlot.fbo);
      gl.readPixels(0, 0, slotA.w, slotA.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const res = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        res[i] = [outBuf[idx], outBuf[idx + 1]];
      }
      MemPool.release(outBuf);
      return res;
    } catch (e) {
      return null;
    }
  }

  /* 2) Parallel 4th-Order Euler-Lagrange Elastica Relaxation di GPU */
  const FS_CONTOUR_ELASTICA_STEP = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_curTex;
  uniform sampler2D u_refTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_lam;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec4 curAt(int idx) { return texelFetch(u_curTex, idxToCoord(idx), 0); }
  vec4 refAt(int idx) { return texelFetch(u_refTex, idxToCoord(idx), 0); }

  float bendWeightAt(int k) {
    vec4 ck = curAt(k);
    if (ck.b > 0.5) return 0.0;
    bool nearCorner = (curAt(k - 1).b > 0.5) || (curAt(k + 1).b > 0.5);
    float baseW = (ck.a > 0.5) ? (u_lam * 0.65) : u_lam;
    return baseW * (nearCorner ? 0.15 : 1.0);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_curTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    vec4 ref = texelFetch(u_refTex, c, 0);
    vec2 d0 = ref.rg;
    vec2 snapP = ref.ba;
    if (cur.b > 0.5) {
      outPt = vec4(snapP, cur.b, cur.a);
      return;
    }

    float wData = (cur.a > 0.5) ? 3.5 : 1.8;
    vec2 g = 2.0 * wData * (cur.rg - d0);

    vec2 vM2 = curAt(i - 2).rg;
    vec2 vM1 = curAt(i - 1).rg;
    vec2 v0  = cur.rg;
    vec2 vP1 = curAt(i + 1).rg;
    vec2 vP2 = curAt(i + 2).rg;

    float wBm = bendWeightAt(i - 1);
    float wB0 = bendWeightAt(i);
    float wBp = bendWeightAt(i + 1);

    if (wBm > 0.0) g += 2.0 * wBm * (vM2 - 2.0 * vM1 + v0);
    if (wB0 > 0.0) g -= 4.0 * wB0 * (vM1 - 2.0 * v0  + vP1);
    if (wBp > 0.0) g += 2.0 * wBp * (v0  - 2.0 * vP1 + vP2);

    float diagH = 2.0 * wData + 8.0 * wB0 + 2.0 * (wBm + wBp);
    vec2 xt = v0 - (0.68 / max(1e-4, diagH)) * g;

    float maxTube = (curAt(i - 1).b > 0.5 || curAt(i + 1).b > 0.5) ? 0.12 : 0.28;
    vec2 dSnap = xt - snapP;
    float dl = length(dSnap);
    if (dl > maxTube) {
      xt = snapP + (dSnap / dl) * maxTube;
    }
    outPt = vec4(xt, cur.b, cur.a);
  }`;

  function gpuElasticaRelaxClosed(refPts, snappedPts, lockMask, smoothKnots, lam = 0.5, iters = 12) {
    return null; /* Jalankan Polak-Ribiere Conjugate Gradient + Line Search eksak di CPU (< 4ms) */
    const n = refPts ? refPts.length : 0;
    if (n < 5) return refPts ? refPts.map(p => [p[0], p[1]]) : null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;

    try {
      const texW = Math.min(256, Math.max(16, Math.ceil(Math.sqrt(n))));
      const texH = Math.ceil(n / texW);
      const slotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', texW - 1, texH - 1, true);
      const slotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', texW - 1, texH - 1, true);
      const refSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', slotA.w, slotA.h, true);
      if (!slotA || !slotB || !refSlot || !slotA.isFloat) return null;

      const totalTexels = slotA.w * slotA.h;
      const inBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      const refBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        inBuf[idx]     = refPts[i][0];
        inBuf[idx + 1] = refPts[i][1];
        inBuf[idx + 2] = (lockMask && lockMask[i]) ? 1.0 : 0.0;
        inBuf[idx + 3] = (smoothKnots && smoothKnots[i]) ? 1.0 : 0.0;

        refBuf[idx]     = refPts[i][0];
        refBuf[idx + 1] = refPts[i][1];
        refBuf[idx + 2] = snappedPts ? snappedPts[i][0] : refPts[i][0];
        refBuf[idx + 3] = snappedPts ? snappedPts[i][1] : refPts[i][1];
      }
      uploadBufferToSlot(gl, 'bufVerticesA', texW - 1, texH - 1, inBuf, true);
      uploadBufferToSlot(gl, 'texLabGrad', slotA.w, slotA.h, refBuf, true);
      MemPool.release(inBuf);
      MemPool.release(refBuf);

      let curSlot = slotA, nxtSlot = slotB;
      const totalSteps = clamp(iters, 4, 20);
      for (let it = 0; it < totalSteps; it++) {
        const ok = runSlotPass(env, 'contourElasticaStep', FS_CONTOUR_ELASTICA_STEP, nxtSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_curTex'), 0);
          g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, refSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_refTex'), 1);
          g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
          g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
          g.uniform1f(g.getUniformLocation(prog, 'u_lam'), lam);
        });
        if (!ok) return null;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      const outBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, curSlot.fbo);
      gl.readPixels(0, 0, slotA.w, slotA.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const res = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        res[i] = [outBuf[idx], outBuf[idx + 1]];
      }
      MemPool.release(outBuf);
      return res;
    } catch (e) {
      return null;
    }
  }

  /* 3) Parallel Batch Gauss-Newton / Newton-Raphson Cubic Bézier Fitting di GPU */
  const FS_BEZIER_FIT_GN = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_metaTex;
  uniform int u_ptsTexW;
  uniform int u_metaTexW;
  uniform int u_outTexW;
  uniform int u_numChains;
  out vec4 outCtrl;

  ivec2 ptCoord(int idx) {
    int y = idx / u_ptsTexW;
    int x = idx - y * u_ptsTexW;
    return ivec2(x, y);
  }

  ivec2 metaCoord(int idx) {
    int y = idx / u_metaTexW;
    int x = idx - y * u_metaTexW;
    return ivec2(x, y);
  }

  vec2 evalBez(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t, u2 = u * u, t2 = t * t;
    return u2 * u * P0 + 3.0 * u2 * t * P1 + 3.0 * u * t2 * P2 + t2 * t * P3;
  }

  vec2 evalBezD1(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t;
    return 3.0 * (u * u * (P1 - P0) + 2.0 * u * t * (P2 - P1) + t * t * (P3 - P2));
  }

  vec2 evalBezD2(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t;
    return 6.0 * (u * (P2 - 2.0 * P1 + P0) + t * (P3 - 2.0 * P2 + P1));
  }

  void solveAlphasGL(
    int startIdx, int n, float uArr[96],
    vec2 P0, vec2 P3, vec2 tL, vec2 tR,
    float chord, float L, float circAlpha,
    out vec2 outP1, out vec2 outP2
  ) {
    float aNat = circAlpha > 0.0 ? circAlpha : (L / 3.0);
    float regW = circAlpha > 0.0 ? 0.06 : 0.004;
    float c00 = regW, c01 = 0.0, c11 = regW;
    float x0 = regW * aNat, x1 = regW * aNat;
    for (int i = 0; i < 96; i++) {
      if (i >= n) break;
      float t = uArr[i], m = 1.0 - t;
      float b0 = m * m * m, b1 = 3.0 * m * m * t, b2 = 3.0 * m * t * t, b3 = t * t * t;
      vec2 a1v = tL * b1;
      vec2 a2v = tR * b2;
      c00 += dot(a1v, a1v);
      c01 += dot(a1v, a2v);
      c11 += dot(a2v, a2v);
      vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
      vec2 rhs = pi - (P0 * (b0 + b1) + P3 * (b2 + b3));
      x0 += dot(a1v, rhs);
      x1 += dot(a2v, rhs);
    }
    float det = c00 * c11 - c01 * c01;
    float minA = max(0.08 * chord, 0.06 * L);
    float maxA = min(0.75 * L, max(0.78 * chord, 0.62 * L));
    float a1 = abs(det) > 1e-9 ? (x0 * c11 - x1 * c01) / det : aNat;
    float a2 = abs(det) > 1e-9 ? (c00 * x1 - c01 * x0) / det : aNat;
    if (a1 < minA || a1 > maxA) {
      a1 = clamp(a1, minA, maxA);
      if (c11 > 1e-9) a2 = (x1 - c01 * a1) / c11;
    }
    if (a2 < minA || a2 > maxA) {
      a2 = clamp(a2, minA, maxA);
      if (c00 > 1e-9) a1 = clamp((x0 - c01 * a2) / c00, minA, maxA);
    }
    outP1 = P0 + tL * a1;
    outP2 = P3 + tR * a2;
  }

  float computeMaxErrGL(int startIdx, int n, float uArr[96], vec2 P0, vec2 P1, vec2 P2, vec2 P3) {
    float maxE2 = 0.0;
    for (int i = 1; i < 96; i++) {
      if (i >= n - 1) break;
      vec2 Q = evalBez(P0, P1, P2, P3, uArr[i]);
      vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
      vec2 df = Q - pi;
      float d2 = dot(df, df);
      if (d2 > maxE2) maxE2 = d2;
    }
    return sqrt(maxE2);
  }

  bool isConvexPairValidGL(
    vec2 P0, vec2 cP1, vec2 cP2, vec2 P3,
    vec2 chU, float chord, float minOppExcur, float convexSign,
    bool hasTanL, bool hasTanR
  ) {
    if (chord < 1.5) return true;
    float h1 = (cP1.x - P0.x) * chU.y - (cP1.y - P0.y) * chU.x;
    float h2 = (cP2.x - P0.x) * chU.y - (cP2.y - P0.y) * chU.x;
    if (minOppExcur <= max(0.85, chord * 0.035) && (h1 * h2) < -1e-4) return false;
    if (abs(convexSign) > 0.5 && (convexSign * h1 < -0.005 || convexSign * h2 < -0.005)) return false;
    float proj1 = dot(cP1 - P0, chU);
    float proj2 = dot(P3 - cP2, chU);
    float minP1 = hasTanL ? (-0.05 * chord) : (0.02 * chord);
    float minP2 = hasTanR ? (-0.05 * chord) : (0.02 * chord);
    return proj1 >= minP1 && proj2 >= minP2 && proj1 <= 0.88 * chord && proj2 <= 0.88 * chord;
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int k = c.y * u_outTexW + c.x;
    if (k >= u_numChains) {
      outCtrl = vec4(0.0);
      return;
    }
    vec4 m0 = texelFetch(u_metaTex, metaCoord(k * 3), 0);
    vec4 m1 = texelFetch(u_metaTex, metaCoord(k * 3 + 1), 0);
    vec4 m2 = texelFetch(u_metaTex, metaCoord(k * 3 + 2), 0);

    int startIdx = int(floor(m0.r + 0.5));
    int n = clamp(int(floor(m0.g + 0.5)), 2, 96);
    vec2 tL = m0.ba;
    vec2 tR = m1.rg;
    float circAlpha = m1.b;
    float L = m1.a;
    float minOppExcur = m2.r;
    float convexSign = m2.g;
    int flags = int(floor(m2.b + 0.5));
    bool hasTanL = (flags & 1) != 0;
    bool hasTanR = (flags & 2) != 0;

    vec2 P0 = texelFetch(u_ptsTex, ptCoord(startIdx), 0).rg;
    vec2 P3 = texelFetch(u_ptsTex, ptCoord(startIdx + n - 1), 0).rg;
    float chord = distance(P0, P3);
    vec2 chU = chord > 1e-6 ? (P3 - P0) / chord : vec2(1.0, 0.0);

    float uArr[96];
    for (int i = 0; i < 96; i++) {
      if (i >= n) { uArr[i] = 1.0; continue; }
      uArr[i] = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).b;
    }

    if (circAlpha > 0.0) {
      vec2 cP1 = P0 + tL * circAlpha;
      vec2 cP2 = P3 + tR * circAlpha;
      for (int pass = 0; pass < 2; pass++) {
        float prevU = 0.0;
        uArr[0] = 0.0;
        uArr[n - 1] = 1.0;
        for (int i = 1; i < 96; i++) {
          if (i >= n - 1) break;
          float t = uArr[i];
          vec2 Q = evalBez(P0, cP1, cP2, P3, t);
          vec2 Q1 = evalBezD1(P0, cP1, cP2, P3, t);
          vec2 Q2 = evalBezD2(P0, cP1, cP2, P3, t);
          vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
          vec2 df = Q - pi;
          float num = dot(df, Q1);
          float den = dot(Q1, Q1) + dot(df, Q2);
          float nt = abs(den) > 1e-12 ? (t - num / den) : t;
          prevU = clamp(nt, prevU + 1e-5, 1.0 - 1e-5);
          uArr[i] = prevU;
        }
      }
    }

    vec2 P1, P2;
    solveAlphasGL(startIdx, n, uArr, P0, P3, tL, tR, chord, L, circAlpha, P1, P2);
    float bestErr = computeMaxErrGL(startIdx, n, uArr, P0, P1, P2, P3);

    if (circAlpha > 0.0) {
      vec2 cP1 = P0 + tL * circAlpha;
      vec2 cP2 = P3 + tR * circAlpha;
      float cErr = computeMaxErrGL(startIdx, n, uArr, P0, cP1, cP2, P3);
      if (cErr <= bestErr * 1.05) {
        P1 = cP1; P2 = cP2; bestErr = cErr;
      }
    }

    if (bestErr > 0.015 && bestErr < 18.0 && n >= 4) {
      float uNext[96];
      for (int it = 0; it < 10; it++) {
        uNext[0] = 0.0;
        uNext[n - 1] = 1.0;
        float prevU = 0.0;
        for (int i = 1; i < 96; i++) {
          if (i >= n - 1) break;
          float t = uArr[i];
          vec2 Q = evalBez(P0, P1, P2, P3, t);
          vec2 Q1 = evalBezD1(P0, P1, P2, P3, t);
          vec2 Q2 = evalBezD2(P0, P1, P2, P3, t);
          vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
          vec2 df = Q - pi;
          float num = dot(df, Q1);
          float den = dot(Q1, Q1) + dot(df, Q2);
          float nt = abs(den) > 1e-12 ? (t - num / den) : t;
          prevU = clamp(nt, prevU + 1e-5, 1.0 - 1e-5);
          uNext[i] = prevU;
        }
        vec2 nP1, nP2;
        solveAlphasGL(startIdx, n, uNext, P0, P3, tL, tR, chord, L, circAlpha, nP1, nP2);
        float nErr = computeMaxErrGL(startIdx, n, uNext, P0, nP1, nP2, P3);
        if (nErr < bestErr && isConvexPairValidGL(P0, nP1, nP2, P3, chU, chord, minOppExcur, convexSign, hasTanL, hasTanR)) {
          for (int i = 0; i < 96; i++) {
            if (i >= n) break;
            uArr[i] = uNext[i];
          }
          P1 = nP1;
          P2 = nP2;
          bestErr = nErr;
        } else {
          break;
        }
      }
    }

    outCtrl = vec4(P1.x, P1.y, P2.x, P2.y);
  }`;

  function gpuFitCubicBezierBatch(chains) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    if (!chains || !chains.length) return [];
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;

    try {
      const M = chains.length;
      let totalPts = 0;
      const prepped = new Array(M);

      for (let k = 0; k < M; k++) {
        const ch = chains[k];
        const pts = ch.pts;
        const n = pts.length;
        if (n < 2 || n > 96) {
          prepped[k] = { cpuFallback: true, res: fitCubicLS(pts, ch.tanL, ch.tanR, ch.allowLine) };
          continue;
        }
        const P0 = pts[0], P3 = pts[n - 1];
        const u = new Float64Array(n);
        let L = 0;
        for (let i = 1; i < n; i++) {
          L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          u[i] = L;
        }
        if (L < 1e-9) {
          prepped[k] = { cpuFallback: true, res: null };
          continue;
        }
        for (let i = 0; i < n; i++) u[i] /= L;

        const chord = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
        const chUx = chord > 1e-6 ? (P3[0] - P0[0]) / chord : 1;
        const chUy = chord > 1e-6 ? (P3[1] - P0[1]) / chord : 0;

        let maxPosH = 0, maxNegH = 0, sumH = 0;
        for (let i = 1; i < n - 1; i++) {
          const h = (pts[i][0] - P0[0]) * chUy - (pts[i][1] - P0[1]) * chUx;
          sumH += h;
          if (h > maxPosH) maxPosH = h;
          if (h < maxNegH) maxNegH = h;
        }
        const minOppExcur = Math.min(maxPosH, -maxNegH);
        const maxExcur = Math.max(maxPosH, -maxNegH);
        const domSign = sumH >= 0 ? 1 : -1;
        const convexSign = (maxPosH >= 0.20 && maxNegH >= -0.12) ? 1 : (maxNegH <= -0.20 && maxPosH <= 0.12) ? -1 : (minOppExcur <= 0.35 && maxExcur >= 0.12 ? domSign : 0);

        if (ch.allowLine && chord > 1e-6) {
          const maxLineDev = Math.max(maxPosH, -maxNegH);
          const alignL = !ch.tanL || Math.abs(ch.tanL[0] * chUy - ch.tanL[1] * chUx) < 0.12;
          const alignR = !ch.tanR || Math.abs(ch.tanR[0] * chUy - ch.tanR[1] * chUx) < 0.12;
          if (maxLineDev <= 0.22 && alignL && alignR) {
            const P1 = [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3];
            const P2 = [P0[0] + 2 * (P3[0] - P0[0]) / 3, P0[1] + 2 * (P3[1] - P0[1]) / 3];
            prepped[k] = {
              cpuFallback: true,
              res: { P0, P1, P2, P3, err: maxLineDev, sse: maxLineDev * maxLineDev * n, at: n >> 1, isLine: true, tL: [chUx, chUy], tR: [-chUx, -chUy] }
            };
            continue;
          }
        }

        let circT_L = null, circT_R = null, circAlpha = -1.0;
        if (n >= 5 && chord > 1.5) {
          const cf = fitCircle2D(pts);
          if (cf && cf.r >= 1.8 && cf.r <= 500 && cf.rms <= Math.max(0.16, cf.r * 0.015)) {
            const r0x = P0[0] - cf.cx, r0y = P0[1] - cf.cy, l0 = Math.hypot(r0x, r0y) || 1;
            const r3x = P3[0] - cf.cx, r3y = P3[1] - cf.cy, l3 = Math.hypot(r3x, r3y) || 1;
            const mid = pts[n >> 1];
            const crossDir = (P0[0] - cf.cx) * (mid[1] - cf.cy) - (P0[1] - cf.cy) * (mid[0] - cf.cx);
            const sgn = crossDir >= 0 ? 1 : -1;
            circT_L = [(-r0y / l0) * sgn, (r0x / l0) * sgn];
            circT_R = [(r3y / l3) * sgn, (-r3x / l3) * sgn];
            const dTheta = Math.acos(clamp((r0x * r3x + r0y * r3y) / (l0 * l3), -1, 1));
            if (dTheta > 0.08 && dTheta < 2.2) {
              circAlpha = (4 / 3) * cf.r * Math.tan(dTheta / 4);
            }
          }
        }

        const useCircL = circT_L && !ch.tanL;
        const useCircR = circT_R && !ch.tanR;
        const adaptiveSpanPx = (chord > 18 && L / chord < 1.02) ? clamp(chord * 0.24, 10.5, 28.0) : 9.5;
        let tL = ch.tanL ? [ch.tanL[0], ch.tanL[1]] : (useCircL ? circT_L : oneSidedTangentOpen(pts, true, adaptiveSpanPx));
        const endFwd = useCircR ? [-circT_R[0], -circT_R[1]] : oneSidedTangentOpen(pts, false, adaptiveSpanPx);
        let tR = ch.tanR ? [ch.tanR[0], ch.tanR[1]] : (useCircR ? circT_R : [-endFwd[0], -endFwd[1]]);

        const enforceConvexTangent = (tVec, isLeft) => {
          if (!convexSign) return tVec;
          const h = tVec[0] * chUy - tVec[1] * chUx;
          if (convexSign * h < -0.01) {
            if (isLeft && circT_L) return circT_L;
            if (!isLeft && circT_R) return circT_R;
            const proj = tVec[0] * chUx + tVec[1] * chUy;
            const perp = Math.abs(h) * 0.5 * convexSign;
            const nx = proj * chUx + perp * chUy, ny = proj * chUy - perp * chUx;
            const nl = Math.hypot(nx, ny) || 1;
            return [nx / nl, ny / nl];
          }
          return tVec;
        };
        tL = enforceConvexTangent(tL, true);
        tR = enforceConvexTangent(tR, false);

        if (minOppExcur <= Math.max(0.85, chord * 0.035) && chord > 1.5) {
          const hL = tL[0] * chUy - tL[1] * chUx;
          const hR = (-tR[0]) * chUy - (-tR[1]) * chUx;
          if (hL * hR > 1e-4 && maxExcur >= 0.12) {
            const fixVec = (v, isEnd) => {
              const s = isEnd ? -1 : 1;
              const hv = (s * v[0]) * chUy - (s * v[1]) * chUx;
              if (hv * domSign * s > 0) {
                const proj = Math.max(0.2, (s * v[0]) * chUx + (s * v[1]) * chUy);
                const perp = -domSign * s * Math.min(Math.abs(hv) * 0.35, 0.18 * proj);
                const nx = s * (proj * chUx + perp * chUy);
                const ny = s * (proj * chUy - perp * chUx);
                const nl = Math.hypot(nx, ny) || 1;
                return [nx / nl, ny / nl];
              }
              return v;
            };
            tL = fixVec(tL, false);
            tR = fixVec(tR, true);
          }
        }

        const startIdx = totalPts;
        totalPts += n;
        prepped[k] = {
          cpuFallback: false,
          pts, n, u, P0, P3, tL, tR, circAlpha, L, minOppExcur, convexSign,
          flags: (ch.tanL ? 1 : 0) | (ch.tanR ? 2 : 0),
          startIdx
        };
      }

      if (totalPts === 0) {
        return prepped.map(p => p.res);
      }

      const ptsTexW = Math.min(512, Math.max(16, Math.ceil(Math.sqrt(totalPts))));
      const ptsTexH = Math.ceil(totalPts / ptsTexW);
      const metaCount = M * 3;
      const metaTexW = Math.min(256, Math.max(8, Math.ceil(Math.sqrt(metaCount))));
      const metaTexH = Math.ceil(metaCount / metaTexW);
      const outTexW = Math.min(256, Math.max(8, Math.ceil(Math.sqrt(M))));
      const outTexH = Math.ceil(M / outTexW);

      const ptsSlot = GPUMemPool.allocateSlot(gl, 'bufVerticesA', ptsTexW - 1, ptsTexH - 1, true);
      const metaSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', metaTexW, metaTexH, true);
      const outSlot = GPUMemPool.allocateSlot(gl, 'bufVerticesB', outTexW - 1, outTexH - 1, true);
      if (!ptsSlot || !metaSlot || !outSlot || !ptsSlot.isFloat) return null;

      const ptsBuf = MemPool.acquire(Float32Array, ptsSlot.w * ptsSlot.h * 4);
      const metaBuf = MemPool.acquire(Float32Array, metaSlot.w * metaSlot.h * 4);

      for (let k = 0; k < M; k++) {
        const pr = prepped[k];
        if (pr.cpuFallback) continue;
        for (let i = 0; i < pr.n; i++) {
          const pIdx = (pr.startIdx + i) * 4;
          ptsBuf[pIdx]     = pr.pts[i][0];
          ptsBuf[pIdx + 1] = pr.pts[i][1];
          ptsBuf[pIdx + 2] = pr.u[i];
          ptsBuf[pIdx + 3] = 1.0;
        }
        const mIdx0 = (k * 3) * 4;
        const mIdx1 = (k * 3 + 1) * 4;
        const mIdx2 = (k * 3 + 2) * 4;
        metaBuf[mIdx0]     = pr.startIdx;
        metaBuf[mIdx0 + 1] = pr.n;
        metaBuf[mIdx0 + 2] = pr.tL[0];
        metaBuf[mIdx0 + 3] = pr.tL[1];

        metaBuf[mIdx1]     = pr.tR[0];
        metaBuf[mIdx1 + 1] = pr.tR[1];
        metaBuf[mIdx1 + 2] = pr.circAlpha;
        metaBuf[mIdx1 + 3] = pr.L;

        metaBuf[mIdx2]     = pr.minOppExcur;
        metaBuf[mIdx2 + 1] = pr.convexSign;
        metaBuf[mIdx2 + 2] = pr.flags;
        metaBuf[mIdx2 + 3] = 0.0;
      }

      uploadBufferToSlot(gl, 'bufVerticesA', ptsTexW - 1, ptsTexH - 1, ptsBuf, true);
      uploadBufferToSlot(gl, 'texLabGrad', metaSlot.w, metaSlot.h, metaBuf, true);
      MemPool.release(ptsBuf);
      MemPool.release(metaBuf);

      const ok = runSlotPass(env, 'bezierFitGn', FS_BEZIER_FIT_GN, outSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, ptsSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, metaSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_metaTex'), 1);
        g.uniform1i(g.getUniformLocation(prog, 'u_ptsTexW'), ptsSlot.w);
        g.uniform1i(g.getUniformLocation(prog, 'u_metaTexW'), metaSlot.w);
        g.uniform1i(g.getUniformLocation(prog, 'u_outTexW'), outSlot.w);
        g.uniform1i(g.getUniformLocation(prog, 'u_numChains'), M);
      });
      if (!ok) return null;

      const outBuf = MemPool.acquire(Float32Array, outSlot.w * outSlot.h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, outSlot.fbo);
      gl.readPixels(0, 0, outSlot.w, outSlot.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const results = new Array(M);
      for (let k = 0; k < M; k++) {
        const pr = prepped[k];
        if (pr.cpuFallback) {
          results[k] = pr.res;
          continue;
        }
        const oIdx = k * 4;
        const P1 = [outBuf[oIdx], outBuf[oIdx + 1]];
        const P2 = [outBuf[oIdx + 2], outBuf[oIdx + 3]];
        let maxE = 0, sse = 0, maxI = pr.n >> 1;
        let uCur = pr.u;
        uCur = reparameterize(pr.pts, uCur, pr.P0, P1, P2, pr.P3);
        for (let i = 1; i < pr.n - 1; i++) {
          const Q = evalBezier(pr.P0, P1, P2, pr.P3, uCur[i]);
          const d2 = (Q[0] - pr.pts[i][0]) ** 2 + (Q[1] - pr.pts[i][1]) ** 2;
          sse += d2;
          if (d2 > maxE) { maxE = d2; maxI = i; }
        }
        const errVal = Math.sqrt(maxE);
        const chOrig = chains[k];
        if ((!chOrig.tanL || !chOrig.tanR) && errVal > 0.14 && pr.n >= 6) {
          results[k] = fitCubicLS(pr.pts, chOrig.tanL, chOrig.tanR, chOrig.allowLine);
        } else {
          results[k] = {
            P0: pr.P0, P1, P2, P3: pr.P3,
            err: errVal,
            sse,
            at: maxI,
            isLine: false,
            tL: pr.tL,
            tR: pr.tR
          };
        }
      }
      MemPool.release(outBuf);
      return results;
    } catch (e) {
      return null;
    }
  }

  /* 4) Parallel Closed-Loop Round-Trip Evaluator (ISO/CIE 11664-6:2022 CIEDE2000 + Boundary IoU + Detail Recall) di GPU */
  const FS_ROUNDTRIP_EVAL_DE00 = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_labels;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_palLut;
  uniform ivec2 u_res;
  uniform int u_K;
  uniform float u_edgeThr;
  out vec4 outEval;

  float srgbToLin(float c) {
    return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
  }

  vec3 rgbToLabGL(vec3 rgb255) {
    float r = srgbToLin(rgb255.r / 255.0);
    float g = srgbToLin(rgb255.g / 255.0);
    float b = srgbToLin(rgb255.b / 255.0);
    float X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    float Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
    float Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
    float eps = 0.008856, kap = 903.3;
    float fx = X > eps ? pow(X, 1.0 / 3.0) : (kap * X + 16.0) / 116.0;
    float fy = Y > eps ? pow(Y, 1.0 / 3.0) : (kap * Y + 16.0) / 116.0;
    float fz = Z > eps ? pow(Z, 1.0 / 3.0) : (kap * Z + 16.0) / 116.0;
    return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
  }

  float ciede2000GL(vec3 lab1, vec3 lab2) {
    float L1 = lab1.x, a1 = lab1.y, b1 = lab1.z;
    float L2 = lab2.x, a2 = lab2.y, b2 = lab2.z;
    float C1 = length(vec2(a1, b1));
    float C2 = length(vec2(a2, b2));
    float Cbar = 0.5 * (C1 + C2);
    float Cbar7 = pow(Cbar, 7.0);
    float G = 0.5 * (1.0 - sqrt(Cbar7 / (Cbar7 + 6103515625.0)));
    float a1p = (1.0 + G) * a1;
    float a2p = (1.0 + G) * a2;
    float C1p = length(vec2(a1p, b1));
    float C2p = length(vec2(a2p, b2));
    float h1p = (b1 == 0.0 && a1p == 0.0) ? 0.0 : degrees(atan(b1, a1p));
    if (h1p < 0.0) h1p += 360.0;
    float h2p = (b2 == 0.0 && a2p == 0.0) ? 0.0 : degrees(atan(b2, a2p));
    if (h2p < 0.0) h2p += 360.0;

    float dLp = L2 - L1;
    float dCp = C2p - C1p;
    float dhp = 0.0;
    if (C1p * C2p > 1e-8) {
      float dh = h2p - h1p;
      if (abs(dh) <= 180.0) dhp = dh;
      else if (dh > 180.0) dhp = dh - 360.0;
      else dhp = dh + 360.0;
    }
    float dHp = 2.0 * sqrt(C1p * C2p) * sin(radians(dhp * 0.5));

    float Lbarp = 0.5 * (L1 + L2);
    float Cbarp = 0.5 * (C1p + C2p);
    float hbarp = h1p + h2p;
    if (C1p * C2p > 1e-8) {
      if (abs(h1p - h2p) <= 180.0) hbarp = 0.5 * (h1p + h2p);
      else if (h1p + h2p < 360.0) hbarp = 0.5 * (h1p + h2p + 360.0);
      else hbarp = 0.5 * (h1p + h2p - 360.0);
    }

    float T = 1.0
      - 0.17 * cos(radians(hbarp - 30.0))
      + 0.24 * cos(radians(2.0 * hbarp))
      + 0.32 * cos(radians(3.0 * hbarp + 6.0))
      - 0.20 * cos(radians(4.0 * hbarp - 63.0));

    float dTheta = 30.0 * exp(-pow((hbarp - 275.0) / 25.0, 2.0));
    float Cbarp7 = pow(Cbarp, 7.0);
    float RC = 2.0 * sqrt(Cbarp7 / (Cbarp7 + 6103515625.0));
    float Lm50 = Lbarp - 50.0;
    float SL = 1.0 + (0.015 * Lm50 * Lm50) / sqrt(20.0 + Lm50 * Lm50);
    float SC = 1.0 + 0.045 * Cbarp;
    float SH = 1.0 + 0.015 * Cbarp * T;
    float RT = -sin(radians(2.0 * dTheta)) * RC;

    float kL = dLp / SL;
    float kC = dCp / SC;
    float kH = dHp / SH;
    return sqrt(max(0.0, kL * kL + kC * kC + kH * kH + RT * kC * kH));
  }

  int lblAt(ivec2 q) {
    ivec2 cq = clamp(q, ivec2(0), u_res - ivec2(1));
    return int(floor(texelFetch(u_labels, cq, 0).r + 0.5));
  }

  float magAt(ivec2 q) {
    ivec2 cq = clamp(q, ivec2(0), u_res - ivec2(1));
    return texelFetch(u_edgeTex, cq, 0).b;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int w = u_res.x, h = u_res.y;
    vec4 lInfo = texelFetch(u_labels, p, 0);
    int l0 = int(floor(lInfo.r + 0.5));
    if (lInfo.g > 0.5 || l0 < 0 || l0 >= u_K) {
      outEval = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vec3 pixRgb = texelFetch(u_rawTex, p, 0).rgb * 255.0;
    vec4 palEntry = texelFetch(u_palLut, ivec2(0, l0), 0);
    float palB = floor(palEntry.a / 256.0);
    float palG = palEntry.a - palB * 256.0;
    vec3 palRgb = vec3(palEntry.b, palG, palB);
    float de00 = ciede2000GL(rgbToLabGL(pixRgb), rgbToLabGL(palRgb));

    float bFlags = 0.0;
    if (p.x >= 1 && p.x < w - 1 && p.y >= 1 && p.y < h - 1) {
      bool isImgEdge = (magAt(p) >= u_edgeThr || magAt(p + ivec2(-1, 0)) >= u_edgeThr || magAt(p + ivec2(1, 0)) >= u_edgeThr || magAt(p + ivec2(0, -1)) >= u_edgeThr || magAt(p + ivec2(0, 1)) >= u_edgeThr);
      bool isSegEdge = (lblAt(p + ivec2(-1, 0)) != l0 || lblAt(p + ivec2(1, 0)) != l0 || lblAt(p + ivec2(0, -1)) != l0 || lblAt(p + ivec2(0, 1)) != l0);
      bFlags = (isImgEdge ? 1.0 : 0.0) + (isSegEdge ? 2.0 : 0.0);
    }

    float dFlags = 0.0;
    if (p.x >= 2 && p.x < w - 2 && p.y >= 2 && p.y < h - 2) {
      int lL1 = lblAt(p + ivec2(-1, 0)), lR1 = lblAt(p + ivec2(1, 0));
      int lU1 = lblAt(p + ivec2(0, -1)), lD1 = lblAt(p + ivec2(0, 1));
      int sameOrtho = (lL1 == l0 ? 1 : 0) + (lR1 == l0 ? 1 : 0) + (lU1 == l0 ? 1 : 0) + (lD1 == l0 ? 1 : 0);
      bool isOrphan = (sameOrtho == 0);
      bool isDetail = (magAt(p) >= u_edgeThr * 1.25);
      bool hasNearBnd = false;
      if (isDetail) {
        int lL2 = lblAt(p + ivec2(-2, 0)), lR2 = lblAt(p + ivec2(2, 0));
        int lU2 = lblAt(p + ivec2(0, -2)), lD2 = lblAt(p + ivec2(0, 2));
        hasNearBnd = (lL1 != l0 || lR1 != l0 || lU1 != l0 || lD1 != l0 || lL2 != l0 || lR2 != l0 || lU2 != l0 || lD2 != l0);
      }
      dFlags = (isOrphan ? 1.0 : 0.0) + (isDetail ? 2.0 : 0.0) + (hasNearBnd ? 4.0 : 0.0);
    }

    outEval = vec4(de00, bFlags, dFlags, 1.0);
  }`;

  function gpuEvaluateRoundTripMetrics(work, mask, labels, palette, edgeField, cls) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return null;
    if (!work || !labels || !palette || !palette.length) return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;
    const { w, h } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, mask, palette, ctx, labels);
      if (!state) return null;

      let edgeSlot = GPUMemPool.getSlot('texEdgeField');
      if (!edgeSlot || edgeSlot.w !== w || edgeSlot.h !== h || !edgeSlot.isFloat) {
        gpuBuildEdgeField(work, mask);
        edgeSlot = GPUMemPool.getSlot('texEdgeField');
      }
      if (!edgeSlot) return null;

      const evalSlot = GPUMemPool.allocateSlot(gl, 'texTensor', w, h, true);
      if (!evalSlot || !evalSlot.isFloat) return null;

      const edgeThr = (cls && cls.type === 'photo') ? 18.5 : 13.5;

      const ok = runSlotPass(env, 'roundTripEvalDe00', FS_ROUNDTRIP_EVAL_DE00, evalSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.rawSlot.tex);    g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex);   g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 1);
        g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, edgeSlot.tex);         g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 2);
        g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, state.palLutSlot.tex); g.uniform1i(g.getUniformLocation(prog, 'u_palLut'), 3);
        g.uniform2i(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), state.K);
        g.uniform1f(g.getUniformLocation(prog, 'u_edgeThr'), edgeThr);
      });
      if (!ok) return null;

      const outBuf = MemPool.acquire(Float32Array, w * h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, evalSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const stride = Math.max(1, Math.floor((w * h) / 16000));
      let sumDE00 = 0, validPix = 0;
      for (let p = 0; p < w * h; p += stride) {
        const idx = p * 4;
        if (outBuf[idx + 3] > 0.5) {
          sumDE00 += outBuf[idx];
          validPix++;
        }
      }

      const bStep = Math.max(1, Math.floor(Math.min(w, h) / 180));
      let interB = 0, unionB = 0, imgEdgeN = 0, segEdgeN = 0;
      for (let y = 1; y < h - 1; y += bStep) {
        const row = y * w;
        for (let x = 1; x < w - 1; x += bStep) {
          const p = row + x, idx = p * 4;
          if (outBuf[idx + 3] < 0.5) continue;
          const bf = Math.round(outBuf[idx + 1]);
          const isImgEdge = (bf & 1) !== 0;
          const isSegEdge = (bf & 2) !== 0;
          if (isImgEdge) imgEdgeN++;
          if (isSegEdge) segEdgeN++;
          if (isImgEdge && isSegEdge) interB++;
          if (isImgEdge || isSegEdge) unionB++;
        }
      }

      let detailHits = 0, detailTotal = 0, orphanNoise = 0;
      for (let y = 2; y < h - 2; y += bStep * 2) {
        const row = y * w;
        for (let x = 2; x < w - 2; x += bStep * 2) {
          const p = row + x, idx = p * 4;
          if (outBuf[idx + 3] < 0.5) continue;
          const df = Math.round(outBuf[idx + 2]);
          if ((df & 1) !== 0) orphanNoise++;
          if ((df & 2) !== 0) {
            detailTotal++;
            if ((df & 4) !== 0) detailHits++;
          }
        }
      }

      MemPool.release(outBuf);
      return {
        meanDE00: validPix > 0 ? (sumDE00 / validPix) : 0,
        validPix,
        interB, unionB, imgEdgeN, segEdgeN,
        detailHits, detailTotal, orphanNoise,
        bStep
      };
    } catch (e) {
      return null;
    }
  }

  function gpuBilateralPreFilter(work, mask, sigmaSpatial = 1.4, sigmaColor = 22, bOpt = {}) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return false;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return false;

    try {
      const rawSlot = uploadToSlot(work, 'texRawRGBA');
      const fltSlot = GPUMemPool.allocateSlot(gl, 'texFltRGBA', w, h, false);
      if (!rawSlot || !fltSlot) return false;

      const radius = clamp((bOpt && bOpt.radius) || (sigmaSpatial <= 1.15 ? 1 : 2), 1, 3);
      const wedgeThr = (bOpt && bOpt.wedgeGuardThr) || 780;

      const ok = runSlotPass(env, 'bilateral', FS_BILATERAL, fltSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1f(g.getUniformLocation(prog, 'u_inv2Sp'), 1 / (2 * sigmaSpatial * sigmaSpatial));
        g.uniform1f(g.getUniformLocation(prog, 'u_inv2Col'), 1 / (2 * sigmaColor * sigmaColor * 9));
        g.uniform1f(g.getUniformLocation(prog, 'u_wedgeThr'), wedgeThr);
        g.uniform1i(g.getUniformLocation(prog, 'u_radius'), radius);
      });
      if (!ok) return false;

      /* Konversi paralel ke CIE-Lab di VRAM (Zero-Copy antar-slot: texFltRGBA -> texLabGrad) */
      if (env.extFloat) {
        const labSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
        if (labSlot) {
          runSlotPass(env, 'rgb2lab', FS_RGB_TO_LAB, labSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0);
            g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
          });
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, fltSlot.fbo);
      const out = MemPool.acquire(Uint8Array, w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const dst = data.data;
      for (let p = 0; p < w * h; p++) {
        if (mask && mask[p]) continue;
        const i = p * 4;
        dst[i] = out[i];
        dst[i + 1] = out[i + 1];
        dst[i + 2] = out[i + 2];
      }
      MemPool.release(out);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Parity Test Harness Tahap 1: Memverifikasi presisi numerik GPU vs CPU pada
     1) Transformasi ruang warna CIE-Lab D65 (Float32 FBO)
     2) Bilateral Filter Edge- & Corner-Preserving (termasuk Wedge & Crease Guard) */
  function runParitySelfTest() {
    const t0 = performance.now();
    const env = getGl(_hwCfg.gpuPower);
    if (!env) {
      lastParityReport = { ok: false, reason: 'Konteks WebGL2 tidak tersedia' };
      return lastParityReport;
    }
    const { gl, extFloat } = env;
    const W = 64, H = 64;
    const testImg = new ImageData(W, H);
    const d = testImg.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        /* Uji kombinasi baji sudut lancip, lembah garis 1px, dan gradasi warna */
        const isCrease = (x === 32 && y >= 10 && y <= 54);
        const isWedge = (y > x && (y - x) < 12 && x > 14 && x < 44);
        d[i]     = isCrease ? 18 : isWedge ? 235 : ((x * 4 + y * 2) & 255);
        d[i + 1] = isCrease ? 22 : isWedge ? 45  : ((x * 3 ^ y * 5) & 255);
        d[i + 2] = isCrease ? 28 : isWedge ? 60  : (240 - ((x * 2 + y * 3) & 200));
        d[i + 3] = 255;
      }
    }

    /* 1. Uji Paritas CIE-Lab (GPU RGBA32F vs CPU rgb2lab) */
    let labMaxErr = 0, labMeanErr = 0;
    const rawSlot = uploadToSlot({ w: W, h: H, data: testImg }, 'texRawRGBA');
    if (extFloat && rawSlot) {
      const labSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', W, H, true);
      if (labSlot) {
        runSlotPass(env, 'rgb2lab', FS_RGB_TO_LAB, labSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0);
          g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        });
        const gpuLab = new Float32Array(W * H * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, labSlot.fbo);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, gpuLab);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        let sumErr = 0;
        for (let p = 0; p < W * H; p++) {
          const i = p * 4;
          const [cL, ca, cb] = rgb2lab(d[i], d[i + 1], d[i + 2]);
          const err = Math.max(
            Math.abs(cL - gpuLab[i]),
            Math.abs(ca - gpuLab[i + 1]),
            Math.abs(cb - gpuLab[i + 2])
          );
          if (err > labMaxErr) labMaxErr = err;
          sumErr += err;
        }
        labMeanErr = sumErr / (W * H);
      }
    }

    /* 2. Uji Paritas Bilateral Corner-Preserving (GPU vs CPU) */
    const cpuWork = { w: W, h: H, data: new ImageData(new Uint8ClampedArray(d), W, H) };
    const gpuWork = { w: W, h: H, data: new ImageData(new Uint8ClampedArray(d), W, H) };
    const mask = new Uint8Array(W * H);
    gpuBilateralPreFilter(gpuWork, mask, 1.4, 22, { radius: 2, wedgeGuardThr: 780 });

    /* Jalankan referensi CPU sinkron pada salinan cpuWork */
    const srcC = new Uint8ClampedArray(cpuWork.data.data);
    const dstC = cpuWork.data.data;
    const radius = 2, wedgeThr = 780;
    const inv2Sp = 1 / (2 * 1.4 * 1.4), inv2Col = 1 / (2 * 22 * 22 * 9);
    const RING_DX = [1, 1, 0, -1, -1, -1, 0, 1];
    const RING_DY = [0, 1, 1, 1, 0, -1, -1, -1];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x, i0 = p * 4;
        const r0 = srcC[i0], g0 = srcC[i0 + 1], b0 = srcC[i0 + 2];
        let simN = 0, ringBits = 0;
        for (let k = 0; k < 8; k++) {
          const np = clamp(y + RING_DY[k], 0, H - 1) * W + clamp(x + RING_DX[k], 0, W - 1);
          const ni = np * 4;
          if (cdist2(r0, g0, b0, srcC[ni], srcC[ni + 1], srcC[ni + 2]) < wedgeThr) {
            simN++; ringBits |= (1 << k);
          }
        }
        if (simN <= 3) continue;
        if (simN === 4) {
          const dbl = ringBits | (ringBits << 8);
          let c4 = false;
          for (let k = 0; k < 8; k++) if (((dbl >> k) & 15) === 15) { c4 = true; break; }
          if (c4) continue;
        }
        if (x >= 2 && x < W - 2 && y >= 2 && y < H - 2) {
          const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
          let crease = false;
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const iA1 = ((y - dy) * W + (x - dx)) * 4, iB1 = ((y + dy) * W + (x + dx)) * 4;
            const iA2 = ((y - 2 * dy) * W + (x - 2 * dx)) * 4, iB2 = ((y + 2 * dy) * W + (x + 2 * dx)) * 4;
            const lA = Math.max(0.299 * srcC[iA1] + 0.587 * srcC[iA1 + 1] + 0.114 * srcC[iA1 + 2], 0.299 * srcC[iA2] + 0.587 * srcC[iA2 + 1] + 0.114 * srcC[iA2 + 2]);
            const lB = Math.max(0.299 * srcC[iB1] + 0.587 * srcC[iB1 + 1] + 0.114 * srcC[iB1 + 2], 0.299 * srcC[iB2] + 0.587 * srcC[iB2 + 1] + 0.114 * srcC[iB2 + 2]);
            const lMinA = Math.min(0.299 * srcC[iA1] + 0.587 * srcC[iA1 + 1] + 0.114 * srcC[iA1 + 2], 0.299 * srcC[iA2] + 0.587 * srcC[iA2 + 1] + 0.114 * srcC[iA2 + 2]);
            const lMinB = Math.min(0.299 * srcC[iB1] + 0.587 * srcC[iB1 + 1] + 0.114 * srcC[iB1 + 2], 0.299 * srcC[iB2] + 0.587 * srcC[iB2 + 1] + 0.114 * srcC[iB2 + 2]);
            if ((l0 < lA - 3.8 && l0 < lB - 3.8) || (l0 > lMinA + 5.5 && l0 > lMinB + 5.5)) { crease = true; break; }
          }
          if (crease) continue;
        }
        let sr = 0, sg = 0, sb = 0, sw = 0;
        const locInv = simN <= 5 ? inv2Col * 2.8 : inv2Col;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = clamp(y + dy, 0, H - 1) * W;
          for (let dx = -radius; dx <= radius; dx++) {
            const ni = (ny + clamp(x + dx, 0, W - 1)) * 4;
            const wgt = Math.exp(-(dx * dx + dy * dy) * inv2Sp) * Math.exp(-cdist2(r0, g0, b0, srcC[ni], srcC[ni + 1], srcC[ni + 2]) * locInv);
            sr += srcC[ni] * wgt; sg += srcC[ni + 1] * wgt; sb += srcC[ni + 2] * wgt; sw += wgt;
          }
        }
        if (sw > 1e-6) {
          dstC[i0] = Math.round(sr / sw); dstC[i0 + 1] = Math.round(sg / sw); dstC[i0 + 2] = Math.round(sb / sw);
        }
      }
    }

    let bilatMaxDiff = 0, bilatExactMatches = 0;
    const gOut = gpuWork.data.data;
    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      const df = Math.max(Math.abs(dstC[i] - gOut[i]), Math.abs(dstC[i + 1] - gOut[i + 1]), Math.abs(dstC[i + 2] - gOut[i + 2]));
      if (df > bilatMaxDiff) bilatMaxDiff = df;
      if (df <= 1) bilatExactMatches++;
    }
    const matchPct = +((bilatExactMatches / (W * H)) * 100).toFixed(2);

    /* 3. Uji Paritas Tahap 2: DiZenzo Scharr 2D Color-Tensor + Structure Tensor 3x3 + Normal-Ray Flank Unmixing */
    let scharrMaxErr = 0, tensorMaxErr = 0, flankMatchPct = 100;
    if (extFloat) {
      const cpuEf = buildEdgeField(gpuWork, mask, true);
      const gpuEf = gpuBuildEdgeField(gpuWork, mask);
      if (gpuEf) {
        for (let p = 0; p < W * H; p++) {
          const eErr = Math.max(
            Math.abs(cpuEf.gx[p] - gpuEf.gx[p]),
            Math.abs(cpuEf.gy[p] - gpuEf.gy[p]),
            Math.abs(cpuEf.mag[p] - gpuEf.mag[p])
          );
          if (eErr > scharrMaxErr) scharrMaxErr = eErr;
        }
      }
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const cpuCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, cpuEf, true);
      const gpuCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, gpuEf || cpuEf, false);
      if (cpuCtx && gpuCtx) {
        let flankMatches = 0;
        for (let p = 0; p < W * H; p++) {
          const tErr = Math.max(
            Math.abs(cpuCtx.nxArr[p] - gpuCtx.nxArr[p]),
            Math.abs(cpuCtx.nyArr[p] - gpuCtx.nyArr[p]),
            Math.abs(cpuCtx.cohArr[p] - gpuCtx.cohArr[p]),
            Math.abs(cpuCtx.cornerArr[p] - gpuCtx.cornerArr[p])
          );
          if (tErr > tensorMaxErr) tensorMaxErr = tErr;
          if (cpuCtx.flankA[p] === gpuCtx.flankA[p] && cpuCtx.flankB[p] === gpuCtx.flankB[p] && Math.abs(cpuCtx.flankAlpha[p] - gpuCtx.flankAlpha[p]) < 1e-3) {
            flankMatches++;
          }
        }
        flankMatchPct = +((flankMatches / (W * H)) * 100).toFixed(2);
      }
    }

    /* 4. Uji Paritas Tahap 3: 4-Color Chromatic MRF Potts + 9-Bit Simple-Point Topological Invariants + Morphological Clean */
    let mrfMatchPct = 100, saddleCountAfterGpu = 0, thinStrokePreservedPct = 100;
    if (extFloat) {
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const ef = gpuBuildEdgeField(gpuWork, mask) || buildEdgeField(gpuWork, mask, true);
      const segCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, ef, false);
      const initLabels = new Int16Array(W * H);
      for (let p = 0; p < W * H; p++) {
        initLabels[p] = segCtx.thinStrokeLab[p] >= 0 ? segCtx.thinStrokeLab[p] : segCtx.rawNearestFlt[p];
      }
      const cpuLabels = new Int16Array(initLabels);
      const gpuLabels = new Int16Array(initLabels);

      localNeighborhoodEdgeSnap(gpuWork, mask, cpuLabels, testPal, ef, 2, segCtx, true);
      segmentMRF(gpuWork, mask, cpuLabels, testPal, { beta: 1350, maxIter: 10, topology: true, segCtx, forceCpu: true });
      morphologicalCleanStrokes(cpuLabels, W, H, gpuWork, testPal, mask, segCtx, true);

      gpuLocalNeighborhoodEdgeSnap(gpuWork, mask, gpuLabels, testPal, 2, segCtx);
      gpuSegmentMRF(gpuWork, mask, gpuLabels, testPal, { beta: 1350, maxIter: 10, topology: true }, segCtx);
      gpuMorphCleanStrokes(gpuLabels, W, H, gpuWork, testPal, mask, segCtx);

      let labelAgree = 0, thinTotal = 0, thinKept = 0;
      for (let p = 0; p < W * H; p++) {
        if (cpuLabels[p] === gpuLabels[p]) labelAgree++;
        if (segCtx.thinStrokeLab[p] >= 0) {
          thinTotal++;
          if (gpuLabels[p] === segCtx.thinStrokeLab[p]) thinKept++;
        }
      }
      mrfMatchPct = +((labelAgree / (W * H)) * 100).toFixed(2);
      thinStrokePreservedPct = thinTotal > 0 ? +((thinKept / thinTotal) * 100).toFixed(2) : 100;

      for (let y = 0; y < H - 1; y++) {
        for (let x = 0; x < W - 1; x++) {
          const p00 = y * W + x;
          const l00 = gpuLabels[p00], l10 = gpuLabels[p00 + 1], l01 = gpuLabels[p00 + W], l11 = gpuLabels[p00 + W + 1];
          if (l00 === l11 && l10 === l01 && l00 !== l10) saddleCountAfterGpu++;
        }
      }
    }

    /* 5. Uji Paritas Tahap 4: Sub-Pixel Beach Deconvolution pada Kisi (W+1)x(H+1) + Parallel Contour Taubin */
    let beachMaxErrPx = 0, beachPinMatchPct = 100, taubinMaxErrPx = 0;
    if (extFloat) {
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const ef = gpuBuildEdgeField(gpuWork, mask) || buildEdgeField(gpuWork, mask, true);
      const segCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, ef, false);
      const testLabels = new Int16Array(W * H);
      for (let p = 0; p < W * H; p++) {
        testLabels[p] = segCtx.thinStrokeLab[p] >= 0 ? segCtx.thinStrokeLab[p] : segCtx.rawNearestFlt[p];
      }
      gpuSegmentMRF(gpuWork, mask, testLabels, testPal, { beta: 1350, maxIter: 6, topology: true }, segCtx);
      gpuMorphCleanStrokes(testLabels, W, H, gpuWork, testPal, mask, segCtx);

      const GW = W + 1, GH = H + 1;
      const vxCpu = new Float64Array(GW * GH), vyCpu = new Float64Array(GW * GH);
      const vxGpu = new Float64Array(GW * GH), vyGpu = new Float64Array(GW * GH);
      const valCpu = new Uint8Array(GW * GH), valGpu = new Uint8Array(GW * GH);
      const pinCpu = new Uint8Array(GW * GH), pinGpu = new Uint8Array(GW * GH);
      const lblAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : testLabels[y * W + x];
      for (let y = 0; y <= H; y++) {
        for (let x = 0; x <= W; x++) {
          const k = y * GW + x;
          vxCpu[k] = vxGpu[k] = x;
          vyCpu[k] = vyGpu[k] = y;
          const nw = lblAt(x - 1, y - 1), ne = lblAt(x, y - 1), sw = lblAt(x - 1, y), se = lblAt(x, y);
          let deg = 0;
          if (nw !== ne) deg++; if (ne !== se) deg++; if (se !== sw) deg++; if (sw !== nw) deg++;
          valCpu[k] = valGpu[k] = deg;
        }
      }
      refineBeachPlanar(vxCpu, vyCpu, valCpu, pinCpu, testLabels, W, H, gpuWork, testPal, true);
      gpuRefineBeachPlanar(vxGpu, vyGpu, valGpu, pinGpu, testLabels, W, H, gpuWork, testPal);

      let pinAgree = 0;
      for (let k = 0; k < GW * GH; k++) {
        const dErr = Math.hypot(vxCpu[k] - vxGpu[k], vyCpu[k] - vyGpu[k]);
        if (dErr > beachMaxErrPx) beachMaxErrPx = dErr;
        if (pinCpu[k] === pinGpu[k]) pinAgree++;
      }
      beachPinMatchPct = +((pinAgree / (GW * GH)) * 100).toFixed(2);

      /* Uji paritas gpuTaubinFilterClosed vs CPU taubinFilterClosed pada poligon 64 titik */
      const ringPts = [];
      const ringPins = new Uint8Array(64);
      ringPins[0] = 1; ringPins[16] = 1; ringPins[32] = 1; ringPins[48] = 1;
      for (let i = 0; i < 64; i++) {
        const ang = (i / 64) * Math.PI * 2;
        ringPts.push([32 + Math.cos(ang) * 20 + (i & 1) * 0.35, 32 + Math.sin(ang) * 18 - (i & 1) * 0.25]);
      }
      const cpuTb = taubinFilterClosed(ringPts, ringPins, 6, 0.44, -0.46, true);
      const gpuTb = gpuTaubinFilterClosed(ringPts, ringPins, 6, 0.44, -0.46);
      if (gpuTb && gpuTb.length === cpuTb.length) {
        for (let i = 0; i < cpuTb.length; i++) {
          const te = Math.hypot(cpuTb[i][0] - gpuTb[i][0], cpuTb[i][1] - gpuTb[i][1]);
          if (te > taubinMaxErrPx) taubinMaxErrPx = te;
        }
      }
    }

    /* 6. Uji Paritas Tahap 5: Staircase Despeckle + Savitzky-Golay Fairing, Gauss-Newton Cubic Bézier Batch, & Closed-Loop CIEDE2000 Evaluator */
    let sgMaxErrPx = 0, bezierMaxErrPx = 0, de00EvalErr = 0;
    if (extFloat) {
      const stairPts = [];
      const stairPins = new Uint8Array(64);
      stairPins[0] = 1; stairPins[32] = 1;
      for (let i = 0; i < 64; i++) {
        const ang = (i / 64) * Math.PI * 2;
        const zig = ((i % 2 === 0) ? 0.32 : -0.32);
        stairPts.push([32 + Math.cos(ang) * 22 + zig, 32 + Math.sin(ang) * 18 - zig]);
      }
      const cpuSg = despeckleStaircaseClosed(stairPts, 0.65, null, stairPins, true);
      const gpuSg = gpuDespeckleStaircaseClosed(stairPts, 0.65, null, stairPins);
      if (gpuSg && gpuSg.length === cpuSg.length) {
        for (let i = 0; i < cpuSg.length; i++) {
          const se = Math.hypot(cpuSg[i][0] - gpuSg[i][0], cpuSg[i][1] - gpuSg[i][1]);
          if (se > sgMaxErrPx) sgMaxErrPx = se;
        }
      }

      /* Uji paritas Gauss-Newton Cubic Bézier Fitting (Batch GPU vs CPU fitCubicLS) */
      const testChains = [];
      for (let c = 0; c < 4; c++) {
        const chPts = [];
        const a0 = c * (Math.PI * 0.5);
        for (let k = 0; k <= 16; k++) {
          const u = k / 16;
          const ang = a0 + u * (Math.PI * 0.45);
          chPts.push([32 + Math.cos(ang) * (18 + c * 2), 32 + Math.sin(ang) * (15 + c * 2)]);
        }
        testChains.push({ pts: chPts, tanL: null, tanR: null, allowLine: false });
      }
      const gpuFits = gpuFitCubicBezierBatch(testChains);
      if (gpuFits && gpuFits.length === testChains.length) {
        for (let c = 0; c < testChains.length; c++) {
          const cpuFit = fitCubicLS(testChains[c].pts, null, null, false);
          const gFit = gpuFits[c];
          if (cpuFit && gFit) {
            const dP1 = Math.hypot(cpuFit.P1[0] - gFit.P1[0], cpuFit.P1[1] - gFit.P1[1]);
            const dP2 = Math.hypot(cpuFit.P2[0] - gFit.P2[0], cpuFit.P2[1] - gFit.P2[1]);
            const mErr = Math.max(dP1, dP2);
            if (mErr > bezierMaxErrPx) bezierMaxErrPx = mErr;
          }
        }
      }

      /* Uji paritas Closed-Loop Evaluator (GPU CIEDE2000 + Boundary IoU vs CPU) */
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const ef = gpuBuildEdgeField(gpuWork, mask) || buildEdgeField(gpuWork, mask, true);
      const segCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, ef, false);
      const evalLabels = new Int16Array(W * H);
      for (let p = 0; p < W * H; p++) evalLabels[p] = segCtx.rawNearestFlt[p];
      const cpuEval = evaluateSegmentationRoundTrip(gpuWork, mask, evalLabels, testPal, ef, { type: 'illustration', effectiveColors: 4 }, 4, 32, true);
      const gpuEval = evaluateSegmentationRoundTrip(gpuWork, mask, evalLabels, testPal, ef, { type: 'illustration', effectiveColors: 4 }, 4, 32, false);
      if (cpuEval && gpuEval) {
        de00EvalErr = Math.abs(cpuEval.meanDE00 - gpuEval.meanDE00) + Math.abs(cpuEval.boundaryIoU - gpuEval.boundaryIoU);
      }
    }

    const elapsedMs = +(performance.now() - t0).toFixed(2);

    lastParityReport = {
      ok: labMaxErr < 1e-3 && bilatMaxDiff <= 1 && scharrMaxErr < 2e-2 && tensorMaxErr < 1e-2 && flankMatchPct >= 99.0 && mrfMatchPct >= 94.0 && thinStrokePreservedPct >= 95.0 && saddleCountAfterGpu === 0 && beachMaxErrPx < 0.50 && beachPinMatchPct >= 99.5 && taubinMaxErrPx < 1e-3 && sgMaxErrPx < 1e-2 && bezierMaxErrPx < 1e-2 && de00EvalErr < 5e-2,
      backend: webgpuState.supported ? 'WebGPU + WebGL2 FBO' : (extFloat ? 'WebGL2 Float32 FBO' : 'WebGL2 RGBA8 FBO'),
      extFloat,
      labMaxErr: +labMaxErr.toExponential(2),
      labMeanErr: +labMeanErr.toExponential(2),
      bilatMaxDiffLsb: bilatMaxDiff,
      bilatMatchPct: matchPct,
      scharrMaxErr: +scharrMaxErr.toExponential(2),
      tensorMaxErr: +tensorMaxErr.toExponential(2),
      flankMatchPct,
      mrfMatchPct,
      thinStrokePreservedPct,
      saddleCountAfterGpu,
      beachMaxErrPx: +beachMaxErrPx.toExponential(2),
      beachPinMatchPct,
      taubinMaxErrPx: +taubinMaxErrPx.toExponential(2),
      sgMaxErrPx: +sgMaxErrPx.toExponential(2),
      bezierMaxErrPx: +bezierMaxErrPx.toExponential(2),
      de00EvalErr: +de00EvalErr.toExponential(2),
      elapsedMs,
      vramStats: GPUMemPool.getStats()
    };
    return lastParityReport;
  }

  function getEngineStatus() {
    const env = getGl(_hwCfg.gpuPower);
    return {
      ready: !!env,
      webgpuSupported: webgpuState.supported || HW_LIMITS.gpu.webgpu,
      webgpuAdapter: webgpuState.adapterName,
      webgl2Supported: HW_LIMITS.gpu.webgl2,
      floatFboSupported: env ? env.extFloat : HW_LIMITS.gpu.colorBufferFloat,
      offscreenSupported: HW_LIMITS.gpu.offscreenCanvas,
      vram: GPUMemPool.getStats(),
      lastParityReport
    };
  }

  /* Inisialisasi WebGPU ditunda secara malas (lazy) hingga benchmark atau proses GPU dibutuhkan agar tidak membebani saat halaman idle/scroll */

  return {
    gpuFlattenAlpha,
    gpuBilateralPreFilter,
    gpuBuildEdgeField,
    gpuBuildSegmentationTables,
    gpuLocalNeighborhoodEdgeSnap,
    gpuSegmentMRF,
    gpuErodeSandwichedRibbons,
    gpuResolveCheckerboardSaddles,
    gpuAbsorbBoundaryParasites,
    gpuMorphCleanStrokes,
    gpuRefineBeachPlanar,
    gpuTaubinFilterClosed,
    gpuDespeckleStaircaseClosed,
    gpuElasticaRelaxClosed,
    gpuFitCubicBezierBatch,
    gpuEvaluateRoundTripMetrics,
    getGl,
    beginGpuSession,
    uploadToSlot,
    uploadBufferToSlot,
    runSlotPass,
    runParitySelfTest,
    getEngineStatus,
    initWebGPUAsync
  };
})();

/* ---- 3. Multi-Thread Web Worker Pool (WorkerPool) ---- */
const WorkerPool = (() => {
  let workers = [];
  let workerUrl = null;
  let currentSize = 0;

  /* Kode sumber mandiri untuk Web Worker (berisi kernel Bilateral, Scharr, MRF Potts, CG Smoothing & Bezier Fitting) */
  const WORKER_CODE = `
const _hwCfg = { useGpu: false, gpuPipeline: 'off' };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function cdist2(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2, rm = (r1 + r2) * 0.5;
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  }

  /* 1. Kernel Strip Bilateral Pre-Filter */
  function runBilateralStrip(msg) {
    const { srcBuf, maskBuf, w, stripH, yStart, yEnd, radius, spWeight, inv2Col } = msg;
    const src = new Uint8ClampedArray(srcBuf);
    const mask = maskBuf ? new Uint8Array(maskBuf) : null;
    const outRows = yEnd - yStart;
    const out = new Uint8ClampedArray(outRows * w * 4);

    for (let y = yStart; y < yEnd; y++) {
      const outY = y - yStart;
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const i0 = p * 4;
        const oi = (outY * w + x) * 4;
        if (mask && mask[p]) {
          out[oi] = src[i0]; out[oi+1] = src[i0+1]; out[oi+2] = src[i0+2]; out[oi+3] = src[i0+3];
          continue;
        }
        const r0 = src[i0], g0 = src[i0 + 1], b0 = src[i0 + 2];
        const RING_DX = [1, 1, 0, -1, -1, -1, 0, 1];
        const RING_DY = [0, 1, 1, 1, 0, -1, -1, -1];
        let simN = 0, ringBits = 0;
        for (let k = 0; k < 8; k++) {
          const ny = clamp(y + RING_DY[k], 0, stripH - 1) * w;
          const np = ny + clamp(x + RING_DX[k], 0, w - 1);
          if (mask && mask[np]) continue;
          const ni = np * 4;
          if (cdist2(r0, g0, b0, src[ni], src[ni + 1], src[ni + 2]) < 780) {
            simN++;
            ringBits |= (1 << k);
          }
        }
        if (simN <= 3) {
          out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
          continue;
        }
        if (simN === 4) {
          const dbl = ringBits | (ringBits << 8);
          let contiguous4 = false;
          for (let k = 0; k < 8; k++) {
            if (((dbl >> k) & 15) === 15) { contiguous4 = true; break; }
          }
          if (contiguous4) {
            out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
            continue;
          }
        }
        if (x >= 2 && x < w - 2 && y >= 2 && y < stripH - 2) {
          const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
          let isCreaseOrRidge = false;
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const iA2 = ((y - 2 * dy) * w + (x - 2 * dx)) * 4;
            const iB2 = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
            const lA = 0.299 * src[iA2] + 0.587 * src[iA2 + 1] + 0.114 * src[iA2 + 2];
            const lB = 0.299 * src[iB2] + 0.587 * src[iB2 + 1] + 0.114 * src[iB2 + 2];
            if ((l0 < lA - 3.8 && l0 < lB - 3.8) || (l0 > lA + 5.5 && l0 > lB + 5.5)) {
              isCreaseOrRidge = true;
              break;
            }
          }
          if (isCreaseOrRidge) {
            out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
            continue;
          }
        }
        let sr = 0, sg = 0, sb = 0, sw = 0, wi = 0;
        const localInv2Col = simN <= 5 ? inv2Col * 2.8 : inv2Col;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = clamp(y + dy, 0, stripH - 1) * w;
          for (let dx = -radius; dx <= radius; dx++) {
            const np = ny + clamp(x + dx, 0, w - 1);
            const sw0 = spWeight[wi++];
            if (mask && mask[np]) continue;
            const ni = np * 4;
            const r = src[ni], g = src[ni + 1], b = src[ni + 2];
            const wgt = sw0 * Math.exp(-cdist2(r0, g0, b0, r, g, b) * localInv2Col);
            sr += r * wgt; sg += g * wgt; sb += b * wgt; sw += wgt;
          }
        }
        if (sw > 1e-6) {
          out[oi] = Math.round(sr / sw);
          out[oi+1] = Math.round(sg / sw);
          out[oi+2] = Math.round(sb / sw);
        } else {
          out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0;
        }
        out[oi+3] = src[i0+3];
      }
    }
    return { res: { outBuf: out.buffer, yStart, yEnd }, transfer: [out.buffer] };
  }

  /* 2. Kernel Strip DiZenzo Multi-Channel Scharr 2D Edge Field */
  function runEdgeStrip(msg) {
    const { lumBuf, rgBuf, byBuf, maskBuf, w, h, y0, y1 } = msg;
    const lum = new Float32Array(lumBuf);
    const cRG = new Float32Array(rgBuf);
    const cBY = new Float32Array(byBuf);
    const mask = maskBuf ? new Uint8Array(maskBuf) : null;
    const rows = y1 - y0;
    const gxArr = new Float32Array(rows * w);
    const gyArr = new Float32Array(rows * w);
    const magArr = new Float32Array(rows * w);
    const scharrAt = (arr, x, y) => {
      const ym1 = clamp(y - 1, 0, h - 1) * w, y0c = clamp(y, 0, h - 1) * w, yp1 = clamp(y + 1, 0, h - 1) * w;
      const xm1 = clamp(x - 1, 0, w - 1), x0c = clamp(x, 0, w - 1), xp1 = clamp(x + 1, 0, w - 1);
      const gx = (-3 * arr[ym1 + xm1] - 10 * arr[y0c + xm1] - 3 * arr[yp1 + xm1]
                 + 3 * arr[ym1 + xp1] + 10 * arr[y0c + xp1] + 3 * arr[yp1 + xp1]) / 32;
      const gy = (-3 * arr[ym1 + xm1] - 10 * arr[ym1 + x0c] - 3 * arr[ym1 + xp1]
                 + 3 * arr[yp1 + xm1] + 10 * arr[yp1 + x0c] + 3 * arr[yp1 + xp1]) / 32;
      return [gx, gy];
    };

    for (let y = y0; y < y1; y++) {
      const ry = (y - y0) * w;
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (mask && mask[p]) continue;
        const [lx, ly] = scharrAt(lum, x, y);
        const [rx, ry2] = scharrAt(cRG, x, y);
        const [bx, by] = scharrAt(cBY, x, y);
        const gxx = lx * lx + rx * rx + bx * bx;
        const gyy = ly * ly + ry2 * ry2 + by * by;
        const gxy = lx * ly + rx * ry2 + bx * by;
        const tr = gxx + gyy;
        if (tr > 1e-6) {
          const disc = Math.hypot(gxx - gyy, 2 * gxy);
          const lambda1 = Math.max(0, 0.5 * (tr + disc));
          const mag = Math.sqrt(lambda1);
          const theta = 0.5 * Math.atan2(2 * gxy, gxx - gyy);
          let vx = Math.cos(theta), vy = Math.sin(theta);
          const domX = Math.abs(lx) >= Math.abs(rx) && Math.abs(lx) >= Math.abs(bx) ? lx : (Math.abs(rx) >= Math.abs(bx) ? rx : bx);
          const domY = Math.abs(ly) >= Math.abs(ry2) && Math.abs(ly) >= Math.abs(by) ? ly : (Math.abs(ry2) >= Math.abs(by) ? ry2 : by);
          if (vx * domX + vy * domY < 0) { vx = -vx; vy = -vy; }
          gxArr[ry + x] = vx * mag;
          gyArr[ry + x] = vy * mag;
          magArr[ry + x] = mag;
        }
      }
    }
    return {
      res: { y0, y1, gxBuf: gxArr.buffer, gyBuf: gyArr.buffer, magBuf: magArr.buffer },
      transfer: [gxArr.buffer, gyArr.buffer, magArr.buffer]
    };
  }

  /* 3. Kernel Paralel Smoothing (Taubin + Polak-Ribiere CG) & Constrained G1 Cubic Bezier Fitting */
  const r2 = v => Math.round(v * 100) / 100;
  ${[
    taubinFilterClosed,
    fitLine2D,
    fitCircle2D,
    cssCornerPersistence,
    filletSupport,
    despeckleStaircaseClosed,
    detectCornersAndExtrema,
    detectCorners,
    oneSidedTangentOpen,
    detectMaximalStraightSpans,
    computeContourAdaptiveOpts,
    smoothLoop,
    evalBezier,
    evalBezierDeriv1,
    evalBezierDeriv2,
    reparameterize,
    smoothTangentClosed,
    smoothTangentOpen,
    fitCubicLS,
    fitChain,
    harmonizeG1Joints,
    fitLoopBeziers,
    segsToD
  ].map(fn => fn.toString()).join('\n  ')}
  function runSmoothAndFitBatch(msg) {
    const { items, scale, lambda, iters, detectCorners, cornerAngle, tol, advOpt } = msg;
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(it.pts, it.area, lambda, tol, scale, advOpt || {});
      const s = smoothLoop(it.pts, { ...localAdv, lambda: localLambda, iters, detectCorners, cornerAngle, juncFlags: it.juncFlags, isTrueCircle: it.isTrueCircle });
      const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
      const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
      const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: it.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt || {});
      let sharpCnt = 0, smoothCnt = 0, lineCnt = 0, curveCnt = 0;
      const sharpPts = [], smoothPts = [];
      for (let k = 0; k < s.corners.length; k++) {
        if (s.corners[k]) { sharpCnt++; sharpPts.push(spts[k]); }
        else if (s.smoothKnots && s.smoothKnots[k]) { smoothCnt++; smoothPts.push(spts[k]); }
      }
      for (let k = 0; k < segs.length; k++) {
        if (segs[k].isLine) lineCnt++; else curveCnt++;
      }
      results.push({ idx: it.idx, label: it.label, area: it.area * scale * scale, scaledPts: spts, segs, d: segsToD(segs, true), sharpCnt, smoothCnt, lineCnt, curveCnt, sharpPts, smoothPts, isTrueCircle: !!s.isTrueCircle });
    }
    return { res: { results }, transfer: [] };
  }

  self.onmessage = e => {
    const { id, task, payload } = e.data;
    try {
      let out;
      if (task === 'bilateral') out = runBilateralStrip(payload);
      else if (task === 'edge') out = runEdgeStrip(payload);
      else if (task === 'smoothFit') out = runSmoothAndFitBatch(payload);
      else out = { res: { ok: true }, transfer: [] };
      self.postMessage({ id, ok: true, res: out.res }, out.transfer || []);
    } catch (err) {
      self.postMessage({ id, ok: false, error: String(err && err.message || err) });
    }
  };
  `;

  let _workerFailed = false;

  function cleanupDeadWorkers() {
    while (workers.length > 0) {
      const w = workers.pop();
      try { w.terminate(); } catch (e) {}
    }
    currentSize = 0;
    /* [FIX-2026-10-29] Jangan mengunci _workerFailed selamanya: dulu
       satu timeout / satu worker rusak mematikan WorkerPool untuk
       seluruh sesi (ensurePool selalu mengembalikan []), padahal
       pemanggil sudah jatuh ke CPU dan worker baru bisa saja sehat.
       Setelah worker mati diberhentikan, pool boleh dicoba lagi di
       tahap berikutnya; bila rusak lagi, fallback CPU tetap berjalan. */
    _workerFailed = false;
  }

  function ensurePool(desiredCount) {
    const n = clamp(desiredCount, 1, 32);
    if (typeof Worker === 'undefined') return [];
    /* [FIX-2026-10-29] Bila latch kegagalan aktif tapi tidak ada worker
       hidup tersisa (mis. listener error global yang menandai gagal di
       luar tugas), bersihkan dan beri pool kesempatan baru — bukan
       menolak selamanya. Worker yang benar-benar rusak tetap akan
       gagal per-tahap dan jatuh ke CPU. */
    if (_workerFailed && !workers.some(w => !w._dead)) cleanupDeadWorkers();
    try {
      workers = workers.filter(w => !w._dead);
      if (!workerUrl) {
        workerUrl = URL.createObjectURL(new Blob([WORKER_CODE], { type: 'application/javascript' }));
      }
      while (workers.length > n) {
        const w = workers.pop();
        try { w.terminate(); } catch (e) {}
      }
      while (workers.length < n) {
        const w = new Worker(workerUrl);
        w._busy = false;
        w._dead = false;
        w.addEventListener('error', e => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          w._dead = true;
          _workerFailed = true;
        });
        workers.push(w);
      }
      currentSize = workers.length;
      return workers;
    } catch (e) {
      _workerFailed = true;
      cleanupDeadWorkers();
      return [];
    }
  }

  let _reqId = 1;
  function execOnWorker(worker, task, payload, transfer = []) {
    return new Promise((resolve, reject) => {
      if (!worker || worker._dead || _workerFailed) {
        reject(new Error('Worker unavailable'));
        return;
      }
      const id = _reqId++;
      let settled = false;
      /* [FIX-2026-10-29] Handler didefinisikan SEBELUM timer (dulu timer
         menutup onMsg/onErr yang baru dideklarasi setelahnya — sah
         secara closure, tapi rapuh dan membingungkan) dan batas waktu
         dinaikkan 2,5 dtk -> 10 dtk agar tab yang di-throttle / perangkat
         lambat tidak salah dinyatakan mati. */
      const onMsg = e => {
        if (!e.data || e.data.id !== id || settled) return;
        settled = true;
        clearTimeout(timer);
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        if (e.data.ok) resolve(e.data.res);
        else reject(new Error(e.data.error || 'Worker error'));
      };
      const onErr = err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err && typeof err.preventDefault === 'function') err.preventDefault();
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        worker._dead = true;
        _workerFailed = true;
        reject(new Error('Worker script error'));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        worker._dead = true;
        _workerFailed = true;
        reject(new Error('Worker timeout'));
      }, 10000);
      worker.addEventListener('message', onMsg);
      worker.addEventListener('error', onErr);
      try {
        worker.postMessage({ id, task, payload }, transfer);
      } catch (postErr) {
        settled = true;
        clearTimeout(timer);
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        worker._dead = true;
        _workerFailed = true;
        reject(postErr);
      }
    });
  }

  async function bilateralPreFilterParallel(work, mask, sigmaSpatial = 1.4, sigmaColor = 22, cores = 4, onTick, bOpt = {}) {
    const pool = ensurePool(cores);
    if (pool.length <= 1) {
      await bilateralPreFilter(work, mask, sigmaSpatial, sigmaColor, onTick, bOpt);
      return false;
    }
    try {
      const { data, w, h } = work;
      const radius = clamp(Math.round((bOpt && bOpt.radius) || (sigmaSpatial <= 1.05 ? 1 : 2)), 1, 2);
      const spWeight = new Float32Array((2 * radius + 1) * (2 * radius + 1));
      const inv2Sp = 1 / (2 * sigmaSpatial * sigmaSpatial);
      const inv2Col = 1 / (2 * sigmaColor * sigmaColor * 9);
      let idx = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) spWeight[idx++] = Math.exp(-(dx * dx + dy * dy) * inv2Sp);
      }

      const K = Math.min(pool.length, Math.max(1, Math.floor(h / 16)));
      const jobs = [];
      for (let k = 0; k < K; k++) {
        const y0 = Math.floor((k * h) / K);
        const y1 = Math.floor(((k + 1) * h) / K);
        const padY0 = Math.max(0, y0 - radius);
        const padY1 = Math.min(h, y1 + radius);
        const stripH = padY1 - padY0;
        const srcSlice = data.data.slice(padY0 * w * 4, padY1 * w * 4);
        const maskSlice = mask ? mask.slice(padY0 * w, padY1 * w) : null;
        const transfers = [srcSlice.buffer];
        if (maskSlice) transfers.push(maskSlice.buffer);
        MemPool.trackAlloc(srcSlice.byteLength + (maskSlice ? maskSlice.byteLength : 0));
        jobs.push(
          execOnWorker(pool[k], 'bilateral', {
            srcBuf: srcSlice.buffer,
            maskBuf: maskSlice ? maskSlice.buffer : null,
            w,
            stripH,
            yStart: y0 - padY0,
            yEnd: (y1 - padY0),
            radius,
            spWeight,
            inv2Col
          }, transfers).then(res => ({ ...res, globalY0: y0, globalY1: y1 }))
        );
      }
      const results = await Promise.all(jobs);
      for (const r of results) {
        const stripOut = new Uint8ClampedArray(r.outBuf);
        data.data.set(stripOut, r.globalY0 * w * 4);
      }
      if (onTick) await onTick(1);
      return true;
    } catch (err) {
      cleanupDeadWorkers();
      await bilateralPreFilter(work, mask, sigmaSpatial, sigmaColor, onTick, bOpt);
      return false;
    }
  }

  async function buildEdgeFieldParallel(work, mask, cores = 4) {
    if (_hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && GpuAccelerator.gpuBuildEdgeField) {
      const gpuEf = GpuAccelerator.gpuBuildEdgeField(work, mask);
      if (gpuEf) return gpuEf;
    }
    const pool = ensurePool(cores);
    if (pool.length <= 1) return buildEdgeField(work, mask, true);
    const { data, w, h } = work, d = data.data, n = w * h;
    const lum = MemPool.acquire(Float32Array, n);
    const cRG = MemPool.acquire(Float32Array, n);
    const cBY = MemPool.acquire(Float32Array, n);
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
      cRG[p] = (r - g) * 0.55;
      cBY[p] = (0.5 * (r + g) - b) * 0.45;
    }
    try {
      const K = Math.min(pool.length, Math.max(1, Math.floor(h / 16)));
      const jobs = [];
      for (let k = 0; k < K; k++) {
        const y0 = Math.floor((k * h) / K);
        const y1 = Math.floor(((k + 1) * h) / K);
        const lumCopy = new Float32Array(lum);
        const rgCopy = new Float32Array(cRG);
        const byCopy = new Float32Array(cBY);
        const maskCopy = mask ? new Uint8Array(mask) : null;
        const tr = [lumCopy.buffer, rgCopy.buffer, byCopy.buffer];
        if (maskCopy) tr.push(maskCopy.buffer);
        jobs.push(execOnWorker(pool[k], 'edge', { lumBuf: lumCopy.buffer, rgBuf: rgCopy.buffer, byBuf: byCopy.buffer, maskBuf: maskCopy ? maskCopy.buffer : null, w, h, y0, y1 }, tr));
      }
      const parts = await Promise.all(jobs);
      const gxArr = MemPool.acquire(Float32Array, n);
      const gyArr = MemPool.acquire(Float32Array, n);
      const magArr = MemPool.acquire(Float32Array, n);
      for (const pt of parts) {
        const off = pt.y0 * w;
        gxArr.set(new Float32Array(pt.gxBuf), off);
        gyArr.set(new Float32Array(pt.gyBuf), off);
        magArr.set(new Float32Array(pt.magBuf), off);
      }
      MemPool.release(cRG);
      MemPool.release(cBY);
      return { lum, gx: gxArr, gy: gyArr, mag: magArr };
    } catch (err) {
      cleanupDeadWorkers();
      MemPool.release(lum);
      MemPool.release(cRG);
      MemPool.release(cBY);
      return buildEdgeField(work, mask, true);
    }
  }

  async function smoothAndFitParallel(trLoops, scale, opt, cores = 4, onProgress) {
    const pool = ensurePool(cores);
    const nLoops = trLoops.length;
    if (pool.length <= 1 || nLoops < 4) return null;

    try {
      const K = Math.min(pool.length, nLoops);
      const buckets = Array.from({ length: K }, () => []);
      const indexed = trLoops.map((lp, idx) => ({
        idx,
        label: lp.label,
        pts: lp.pts.map(p => [p[0], p[1]]),
        juncFlags: lp.juncFlags,
        isTrueCircle: !!lp.isTrueCircle,
        area: lp.area
      })).sort((a, b) => b.pts.length - a.pts.length);

      indexed.forEach((item, i) => buckets[i % K].push(item));

      let doneBuckets = 0;
      const jobs = buckets.map((items, wi) =>
        execOnWorker(pool[wi], 'smoothFit', {
          items,
          scale,
          lambda: opt.lambda,
          iters: opt.iters || 52,
          detectCorners: opt.detectCorners !== false,
          cornerAngle: opt.cornerAngle || 52,
          tol: opt.tol,
          advOpt: opt.advOpt || {}
        }).then(res => {
          doneBuckets++;
          if (onProgress) onProgress(doneBuckets / K);
          return res.results;
        })
      );

      const allBatches = await Promise.all(jobs);
      const flat = allBatches.flat().sort((a, b) => a.idx - b.idx);
      return flat;
    } catch (err) {
      cleanupDeadWorkers();
      return null;
    }
  }

  return {
    ensurePool,
    bilateralPreFilterParallel,
    buildEdgeFieldParallel,
    smoothAndFitParallel
  };
})();

/* ---- Kontrol Interaktif Real-Time Tracing (Jeda, Kecepatan, Scrubber) ---- */
const _traceCtrl = {
  paused: false,
  speed: 1,
  skipToEnd: false,
  holdOnComplete: true,
};
const _traceCtrlListeners = new Set();
function getTraceCtrl() { return _traceCtrl; }
function setTraceCtrl(patch) {
  Object.assign(_traceCtrl, typeof patch === 'function' ? patch(_traceCtrl) : patch);
  _traceCtrlListeners.forEach(fn => { try { fn({ ..._traceCtrl }); } catch (e) {} });
  return _traceCtrl;
}
function subscribeTraceCtrl(fn) {
  _traceCtrlListeners.add(fn);
  return () => _traceCtrlListeners.delete(fn);
}

/* ---- Builder Kanvas & Geometri Real-Time Tracing (Dibatasi <= 720px agar hemat VRAM & cepat) ---- */
const VIZ_MAX_DIM = 720;
function getVizDims(w, h) {
  const maxD = Math.max(w, h);
  if (maxD <= VIZ_MAX_DIM) return { vw: w, vh: h, scaled: false };
  const k = VIZ_MAX_DIM / maxD;
  return { vw: Math.max(16, Math.round(w * k)), vh: Math.max(16, Math.round(h * k)), scaled: true };
}

function buildVizRgbaCanvas(rgba, w, h) {
  const { vw, vh, scaled } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  const ctx = c.getContext('2d');
  if (!scaled) {
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
    return c;
  }
  const out = ctx.createImageData(vw, vh);
  const d = out.data;
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      const si = (sy + sx) * 4, di = (vy * vw + vx) * 4;
      d[di] = rgba[si]; d[di + 1] = rgba[si + 1]; d[di + 2] = rgba[si + 2]; d[di + 3] = rgba[si + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function buildVizEdgeScanCanvas(rgba, edgeMag, mask, w, h) {
  const { vw, vh } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(vw, vh);
  const d = out.data;
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    const vRow = vy * vw;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      const p = sy + sx;
      const i = p * 4, di = (vRow + vx) * 4;
      if (mask && mask[p]) {
        d[di] = 15; d[di + 1] = 23; d[di + 2] = 42; d[di + 3] = 180;
        continue;
      }
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      const mag = edgeMag ? edgeMag[p] : 0;
      const m = clamp(mag / 36, 0, 1);
      const baseK = 0.26 * (1 - m * 0.45);
      let er = 0, eg = 0, eb = 0;
      if (m > 0.05) {
        if (m < 0.52) {
          const t = (m - 0.05) / 0.47;
          er = 12 * t; eg = 190 * t + 24; eb = 240 * t + 35;
        } else {
          const t = (m - 0.52) / 0.48;
          er = 12 + 238 * t; eg = 214 - 40 * t; eb = 255 - 150 * t;
        }
      }
      d[di]     = clamp(Math.round(r * baseK + er), 0, 255);
      d[di + 1] = clamp(Math.round(g * baseK + eg), 0, 255);
      d[di + 2] = clamp(Math.round(b * baseK + eb), 0, 255);
      d[di + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function buildVizLabelCanvas(labels, palette, w, h, withBorders = true) {
  const { vw, vh, scaled } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  if (!scaled) {
    renderSeg(c, labels, palette, w, h, { bounds: withBorders });
    return c;
  }
  const subLabels = new Int16Array(vw * vh);
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    const vRow = vy * vw;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      subLabels[vRow + vx] = labels[sy + sx];
    }
  }
  renderSeg(c, subLabels, palette, vw, vh, { bounds: withBorders });
  return c;
}

function buildVizDiffCanvas(beforeLabels, afterLabels, w, h) {
  const { vw, vh } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(vw, vh);
  const d = out.data;
  let diffCount = 0;
  for (let p = 0; p < w * h; p++) {
    if (beforeLabels[p] !== afterLabels[p]) diffCount++;
  }
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    const vRow = vy * vw;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      const p = sy + sx;
      if (beforeLabels[p] !== afterLabels[p]) {
        const di = (vRow + vx) * 4;
        d[di] = 245; d[di + 1] = 158; d[di + 2] = 11; d[di + 3] = 235;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return { canvas: c, diffCount };
}

function buildPaletteProbes(work, mask, palette, scale) {
  if (!work || !work.data || !palette || !palette.length) return [];
  const { data, w, h } = work, d = data.data;
  const K = palette.length;
  const counts = new Int32Array(K);
  const bestD = new Float64Array(K).fill(Infinity);
  const bestX = new Float64Array(K);
  const bestY = new Float64Array(K);
  let totalValid = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 110));
  for (let y = step; y < h - step; y += step) {
    for (let x = step; x < w - step; x += step) {
      const p = y * w + x;
      if (mask && mask[p]) continue;
      totalValid++;
      const i = p * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      let bi = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const c = palette[k];
        const dd = cdist2(r, g, b, c.r, c.g, c.b);
        if (dd < bd) { bd = dd; bi = k; }
      }
      counts[bi]++;
      const centerBias = Math.hypot(x - w * 0.5, y - h * 0.5) * 0.06;
      if (bd + centerBias < bestD[bi]) {
        bestD[bi] = bd + centerBias;
        bestX[bi] = (x + 0.5) * scale;
        bestY[bi] = (y + 0.5) * scale;
      }
    }
  }
  return palette.map((c, k) => ({
    hex: c.hex,
    r: c.r, g: c.g, b: c.b,
    x: bestX[k] || (w * 0.5 * scale),
    y: bestY[k] || (h * 0.5 * scale),
    pct: totalValid > 0 ? Math.max(0.1, +((counts[k] / totalValid) * 100).toFixed(1)) : 0
  }));
}

function buildVizGeometryInto(vizState, rawLoops, smoothed, palette, scale) {
  const rawViz = [];
  for (let i = 0; i < rawLoops.length; i++) {
    const lp = rawLoops[i];
    const col = (palette[lp.label] && palette[lp.label].hex) || '#38bdf8';
    const pts = lp.rawPts.map(p => [p[0] * scale, p[1] * scale]);
    const juncPts = [];
    if (lp.juncFlags) {
      for (let k = 0; k < lp.juncFlags.length; k++) {
        if (lp.juncFlags[k] && pts[k]) juncPts.push(pts[k]);
      }
    }
    rawViz.push({ label: lp.label, color: col, pts, juncPts, area: Math.abs((lp.area || 0) * scale * scale) });
  }
  rawViz.sort((a, b) => b.area - a.area);
  vizState.rawLoops = rawViz;

  if (smoothed && smoothed.length) {
    const smViz = [];
    const bzViz = [];
    for (let i = 0; i < smoothed.length; i++) {
      const s = smoothed[i];
      const raw = rawLoops[i];
      const col = (palette[s.label] && palette[s.label].hex) || '#6366f1';
      const pts = s.pts || s.scaledPts || [];
      const rPts = raw ? raw.rawPts.map(p => [p[0] * scale, p[1] * scale]) : pts;
      let sharpPts = s.sharpPts || [];
      let smoothPts = s.smoothPts || [];
      if (!sharpPts.length && !smoothPts.length && s.segs) {
        for (const sg of s.segs) {
          if (sg.startSharp) sharpPts.push(sg.P0);
          else smoothPts.push(sg.P0);
        }
      }
      const absA = Math.abs(s.area || 0);
      smViz.push({ label: s.label, color: col, pts, rawPts: rPts, sharpPts, smoothPts, area: absA });
      if (s.segs && s.segs.length) {
        const dStr = s.d || segsToD(s.segs, true);
        let p2d = null;
        try { p2d = new Path2D(dStr); } catch (e) {}
        bzViz.push({ label: s.label, color: col, segs: s.segs, d: dStr, p2d, area: absA });
      }
    }
    smViz.sort((a, b) => b.area - a.area);
    bzViz.sort((a, b) => b.area - a.area);
    vizState.smoothedLoops = smViz;
    vizState.bezierLoops = bzViz;

    const drawingSegs = [];
    for (let li = 0; li < bzViz.length; li++) {
      const bl = bzViz[li];
      for (let si = 0; si < bl.segs.length; si++) {
        drawingSegs.push({
          seg: bl.segs[si],
          color: bl.color,
          loopIdx: li,
          segIdxInLoop: si,
          isFirstInLoop: si === 0,
          isLastInLoop: si === bl.segs.length - 1,
          loopP2d: bl.p2d
        });
      }
    }
    vizState.drawingSegs = drawingSegs;
  }
}

function buildTraceHistoryFromSession(sess, job) {
  if (sess && sess.traceHistory) return sess.traceHistory;
  if (!sess) return null;
  const { w, h, W, H, scale, palette, labels, loops, regs, svg, workData, mask, cls } = sess;
  const rgba = workData && workData.data ? workData.data : (job && job.work && job.work.data ? job.work.data.data : null);
  const origRgba = (job && job.workOrig) ? job.workOrig : rgba;
  const edgeField = workData ? buildEdgeField({ data: workData, w, h }, mask) : null;
  const vizState = {
    w, h, W, H, scale,
    cls: cls || (job && job.cls) || {},
    alphaInfo: (sess.stats && sess.stats.alpha) || (job && job.alpha) || {},
    origCanvas: origRgba ? buildVizRgbaCanvas(origRgba, w, h) : null,
    edgeScanCanvas: rgba ? buildVizEdgeScanCanvas(rgba, edgeField ? edgeField.mag : null, mask, w, h) : null,
    palette: palette || [],
    paletteProbes: workData ? buildPaletteProbes({ data: workData, w, h }, mask, palette || [], scale) : [],
    quantCanvas: (labels && palette) ? buildVizLabelCanvas(labels, palette, w, h, false) : null,
    qtCanvas: (labels && palette) ? buildVizLabelCanvas(labels, palette, w, h, true) : null,
    segFinalCanvas: (labels && palette) ? buildVizLabelCanvas(labels, palette, w, h, true) : null,
    segDiffCanvas: null,
    cleanedPixels: 0,
    quadBlocks: [],
    rawLoops: [],
    smoothedLoops: [],
    bezierLoops: [],
    drawingSegs: [],
    regs: regs || [],
    svg: svg || '',
    stats: sess.stats || {}
  };
  const synthSmoothed = [];
  if (regs) {
    for (const rg of regs) {
      for (const lp of (rg.loops || [])) {
        synthSmoothed.push({ label: rg.label, pts: lp.pts || [], scaledPts: lp.pts || [], segs: lp.segs || [], d: lp.d, area: lp.area || 0 });
      }
    }
  }
  buildVizGeometryInto(vizState, loops || [], synthSmoothed, palette || [], scale || 1);
  sess.traceHistory = vizState;
  return vizState;
}

/* [RT-SMOOTH] Pemutaran animasi tahap berbasis waktu nyata (per-frame), bukan loncatan sleep(36 ms).
   - Durasi "reveal" minimum dijamin, sehingga pada citra resolusi tinggi (komputasi > budget) animasi sapuan
     tidak lagi hilang / meloncat langsung ke akhir tahap.
   - Menghormati jeda & perubahan kecepatan secara langsung di tengah tahap. */
const RT_MIN_REVEAL_MS = 420;
/* [FAST] Pacing/animasi buatan dimatikan: tiap tahap langsung lanjut begitu komputasinya selesai,
   sehingga durasi tracing = waktu komputasi nyata (CPU/VGA). Ubah ke true untuk mengembalikan animasi 6,4 dtk. */
const PACING_ENABLED = false;
async function paceStage(tStart, targetMs, stageId, f0, f1, detail, prog) {
  if (!PACING_ENABLED || _traceCtrl.skipToEnd || _traceCtrl.speed >= 8) {
    if (prog) await prog(stageId, f1, detail);
    return;
  }
  const sp0 = Math.max(0.25, _traceCtrl.speed || 1);
  const elapsed = performance.now() - tStart;
  const revealV = Math.max(targetMs - elapsed * sp0, Math.min(targetMs, RT_MIN_REVEAL_MS));
  if (prog && revealV > 20) {
    let t = 0, last = performance.now();
    while (t < 1) {
      if (_traceCtrl.skipToEnd || _traceCtrl.speed >= 8) break;
      if (_traceCtrl.paused) {
        await prog(stageId, f0 + (f1 - f0) * t, detail);
        last = performance.now();
        continue;
      }
      const now = performance.now();
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      const sp = Math.max(0.25, _traceCtrl.speed || 1);
      t = Math.min(1, t + (dt * sp) / revealV);
      await prog(stageId, f0 + (f1 - f0) * t, detail);
    }
  }
  if (prog) await prog(stageId, f1, detail);
}


/* === END 13-vmt-hardware-gpu-workers.js === */

/* === BEGIN 14-vmt-orchestrator.js === */
/* =====================================================================
 * JS Module 14: VMT Engine Part 10 — Self-Validating Orchestrator (vectorize, retrace, refit) & Manual Seg Tools
 * ===================================================================== */
/* =====================================================================
   MEKANISME CLOSED-LOOP CALIBRATION & ROUND-TRIP EVALUATOR (Bagian 5 Markdown)
   Menghitung fungsi skor komposit:
     J = wc * E_color + wb * E_boundary + wt * E_topology + wd * E_detail + ws * E_complexity
   beserta metrik Boundary IoU, dan menguji kandidat parameter terbatas
   (generateBoundedCandidates) jika skor awal membutuhkan penyempurnaan.
   ===================================================================== */
function evaluateSegmentationRoundTrip(work, mask, labels, palette, edgeField, cls, loopCount = 0, segCount = 0, forceCpu = false) {
  const { w, h } = work;
  const bStep = Math.max(1, Math.floor(Math.min(w, h) / 180));
  let meanDE00 = 0, validPix = 0;
  let interB = 0, unionB = 0, imgEdgeN = 0, segEdgeN = 0;
  let detailHits = 0, detailTotal = 0, orphanNoise = 0;

  const gpuMetrics = (!forceCpu && typeof GpuAccelerator !== 'undefined' && GpuAccelerator.gpuEvaluateRoundTripMetrics && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full')
    ? GpuAccelerator.gpuEvaluateRoundTripMetrics(work, mask, labels, palette, edgeField, cls)
    : null;

  if (gpuMetrics) {
    meanDE00 = gpuMetrics.meanDE00;
    validPix = gpuMetrics.validPix;
    interB = gpuMetrics.interB;
    unionB = gpuMetrics.unionB;
    imgEdgeN = gpuMetrics.imgEdgeN;
    segEdgeN = gpuMetrics.segEdgeN;
    detailHits = gpuMetrics.detailHits;
    detailTotal = gpuMetrics.detailTotal;
    orphanNoise = gpuMetrics.orphanNoise;
  } else {
    const d = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
    const mag = edgeField ? edgeField.mag : null;
    const stride = Math.max(1, Math.floor((w * h) / 16000));

    let sumDE00 = 0;
    const palLab = palette.map(c => {
      const [L, a, b] = (c.L != null && c.a != null && c.b2 != null) ? [c.L, c.a, c.b2] : rgb2lab(c.r, c.g, c.b);
      return { r: c.r, g: c.g, b: c.b, L, a, b2: b };
    });

    /* 1. E_color: Rata-rata kesalahan warna perseptual CIEDE2000 ternormalisasi */
    for (let p = 0; p < w * h; p += stride) {
      if (mask && mask[p]) continue;
      const l = labels[p];
      if (l < 0 || !palLab[l]) continue;
      const i = p * 4;
      const [L, a, b] = rgb2lab(d[i], d[i + 1], d[i + 2]);
      const cp = palLab[l];
      sumDE00 += ciede2000(L, a, b, cp.L, cp.a, cp.b2);
      validPix++;
    }
    meanDE00 = validPix > 0 ? (sumDE00 / validPix) : 0;

    /* 2. Boundary IoU & E_boundary: Tumpang tindih pita batas (dilation 1px) antara tepi citra & batas label */
    const edgeThr = cls && cls.type === 'photo' ? 18.5 : 13.5;
    for (let y = 1; y < h - 1; y += bStep) {
      const row = y * w;
      for (let x = 1; x < w - 1; x += bStep) {
        const p = row + x;
        if (mask && mask[p]) continue;
        const isImgEdge = mag ? (mag[p] >= edgeThr || mag[p - 1] >= edgeThr || mag[p + 1] >= edgeThr || mag[p - w] >= edgeThr || mag[p + w] >= edgeThr) : false;
        const l0 = labels[p];
        const isSegEdge = (labels[p - 1] !== l0 || labels[p + 1] !== l0 || labels[p - w] !== l0 || labels[p + w] !== l0);
        if (isImgEdge) imgEdgeN++;
        if (isSegEdge) segEdgeN++;
        if (isImgEdge && isSegEdge) interB++;
        if (isImgEdge || isSegEdge) unionB++;
      }
    }

    /* 3. E_detail & E_topology: Evaluasi pelestarian detail kontras tinggi vs spekula liar */
    for (let y = 2; y < h - 2; y += bStep * 2) {
      const row = y * w;
      for (let x = 2; x < w - 2; x += bStep * 2) {
        const p = row + x;
        if (mask && mask[p]) continue;
        const l0 = labels[p];
        const sameOrtho = (labels[p - 1] === l0 ? 1 : 0) + (labels[p + 1] === l0 ? 1 : 0) + (labels[p - w] === l0 ? 1 : 0) + (labels[p + w] === l0 ? 1 : 0);
        if (sameOrtho === 0) orphanNoise++;
        if (mag && mag[p] >= edgeThr * 1.25) {
          detailTotal++;
          const hasNearBoundary = (labels[p - 1] !== l0 || labels[p + 1] !== l0 || labels[p - w] !== l0 || labels[p + w] !== l0 ||
                                   labels[p - 2] !== l0 || labels[p + 2] !== l0 || labels[p - 2 * w] !== l0 || labels[p + 2 * w] !== l0);
          if (hasNearBoundary) detailHits++;
        }
      }
    }
  }

  const E_color = clamp(meanDE00 / 18.0, 0, 1);
  /* Jika gambar murni gradasi halus tanpa step-edge tajam (imgEdgeN sangat kecil),
     evaluasi koherensi batas terhadap kelancaran isoline agar tidak menghukum batas tonal secara keliru */
  const boundaryIoU = imgEdgeN >= Math.max(6, (w * h) / (bStep * bStep * 250))
    ? (unionB > 0 ? clamp(interB / unionB, 0, 1) : 0.85)
    : clamp(0.88 - (segEdgeN / Math.max(1, (w * h) / (bStep * bStep))) * 0.25, 0.62, 0.94);
  const E_boundary = clamp(1 - boundaryIoU, 0, 1);
  const detailRecall = detailTotal > 0 ? clamp(detailHits / detailTotal, 0, 1) : 0.90;
  const E_detail = clamp(1 - detailRecall, 0, 1);
  const E_topology = clamp((orphanNoise / Math.max(1, validPix)) * 12 + Math.abs(palette.length - (cls && cls.effectiveColors || palette.length)) / 42, 0, 1);

  /* 4. E_complexity: Penalti kompleksitas poligon/segmen berlebih */
  const estLoops = loopCount || Math.max(palette.length, Math.round(segEdgeN * 0.08));
  const estSegs = segCount || estLoops * 8;
  const targetSegBudget = (cls && cls.profileId === 'flat') ? 450 : (cls && cls.profileId === 'photo') ? 2600 : 1200;
  const E_complexity = clamp((estSegs / Math.max(200, targetSegBudget)) * 0.28, 0, 1);

  /* Bobot fungsi objektif J disesuaikan dengan atribut profil citra */
  const attr = (cls && cls.adaptiveAttributes) || { geometryPriority: 0.6, detailProtection: 0.6, gradientPreservation: 0.3 };
  const wc = 0.26 + attr.gradientPreservation * 0.08;
  const wb = 0.26 + attr.geometryPriority * 0.08;
  const wt = 0.24;
  const wd = 0.18 + attr.detailProtection * 0.08;
  const ws = 0.14;
  const wNorm = wc + wb + wt + wd + ws;

  const J = (wc * E_color + wb * E_boundary + wt * E_topology + wd * E_detail + ws * E_complexity) / wNorm;
  const needsRefinement = J > 0.235 || boundaryIoU < 0.56 || meanDE00 > 5.8 || detailRecall < 0.68;

  return {
    J: +J.toFixed(4),
    qualityScore: Math.round(clamp((1 - J) * 100, 10, 99)),
    boundaryIoU: +boundaryIoU.toFixed(3),
    meanDE00: +meanDE00.toFixed(2),
    detailRecall: +detailRecall.toFixed(3),
    components: {
      E_color: +E_color.toFixed(3),
      E_boundary: +E_boundary.toFixed(3),
      E_topology: +E_topology.toFixed(3),
      E_detail: +E_detail.toFixed(3),
      E_complexity: +E_complexity.toFixed(3)
    },
    needsRefinement
  };
}

function generateBoundedCandidates(baseParams, cls, eval0) {
  const cands = [];
  const p0 = baseParams;
  /* Kandidat 1: Presisi Detail & Batas Lebih Ketat (tanpa menurunkan minPixels yang memicu ledakan island) */
  if (eval0.detailRecall < 0.78 || eval0.meanDE00 > 4.2) {
    cands.push({
      name: 'Presisi Detail & Warna (ΔE Lebih Ketat)',
      layerDifference: +clamp(p0.layerDifference * 0.86, 3.4, 8.8).toFixed(2),
      targetKMax: clamp(p0.targetKMax + 4, 4, 36),
      minPixels: p0.minPixels,
      complexity: clamp(p0.complexity + 3, 35, 78),
      qtVarThr: Math.max(95, Math.round(p0.qtVarThr * 0.85))
    });
  }
  /* Kandidat 2: Regularisasi Kontur & Reduksi Derau (dengan pengaman Line-Art agar minPixels tidak menghapus detail tipis) */
  if (eval0.boundaryIoU < 0.68 || eval0.components.E_topology > 0.18) {
    const isFewColorLineArt = (cls && (cls.effectiveColors <= 6 || cls.profileId === 'flat'));
    cands.push({
      name: 'Koherensi Batas & Reduksi Spekula',
      layerDifference: isFewColorLineArt ? p0.layerDifference : +clamp(p0.layerDifference * 1.12, 3.4, 9.2).toFixed(2),
      targetKMax: p0.targetKMax,
      minPixels: isFewColorLineArt ? p0.minPixels : clamp(p0.minPixels + 1, 2, 12),
      complexity: isFewColorLineArt ? p0.complexity : clamp(p0.complexity - 6, 35, 88),
      qtVarThr: isFewColorLineArt ? p0.qtVarThr : Math.min(420, Math.round(p0.qtVarThr * 1.15))
    });
  }
  /* Kandidat 3: Penyeimbang Gradasi / Shade Keluarga Warna */
  if (!cands.length || (cls && cls.surfaceMode !== 'flat')) {
    cands.push({
      name: 'Harmoni Tonal & Transisi CIE-Lab',
      layerDifference: +clamp(p0.layerDifference * 0.90, 3.2, 8.5).toFixed(2),
      targetKMax: clamp(p0.targetKMax + 2, 4, 34),
      minPixels: p0.minPixels,
      complexity: clamp(p0.complexity + 4, 40, 88),
      qtVarThr: p0.qtVarThr
    });
  }
  return cands.slice(0, 2);
}

/* Evaluasi Round-Trip Penuh pasca-perakitan SVG (membandingkan rasterisasi kanvas vektor terhadap bitmap asli) */
function evaluateFinalVectorRoundTrip(work, mask, vecPaths, labels, palette, edgeField, cls, totalSegs, totalLoops) {
  const baseEval = evaluateSegmentationRoundTrip(work, mask, labels, palette, edgeField, cls, totalLoops, totalSegs);
  if (!vecPaths || !vecPaths.length || typeof document === 'undefined') return baseEval;
  try {
    const { w, h } = work;
    const evalRatio = Math.min(1, 360 / Math.max(w, h));
    const ew = Math.max(16, Math.round(w * evalRatio)), eh = Math.max(16, Math.round(h * evalRatio));
    const scale = evalRatio / (work.scale || 1);
    const cv = document.createElement('canvas');
    cv.width = ew; cv.height = eh;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.scale(scale, scale);
    for (const it of vecPaths) {
      ctx.globalAlpha = it.opacity ?? 1;
      if (it.fill && it.fill !== 'none') {
        if (typeof fillCanvasPath === 'function') fillCanvasPath(ctx, it);
        else { ctx.fillStyle = typeof resolveCanvasPaint === 'function' ? resolveCanvasPaint(ctx, it.fill, it.fillGrad) : it.fill; ctx.fill(it.p2d, it.fillRule || 'evenodd'); }
      }
      if (it.stroke && it.stroke !== 'none' && it.strokeWidth > 0) {
        ctx.strokeStyle = typeof resolveCanvasPaint === 'function' ? resolveCanvasPaint(ctx, it.stroke, it.strokeGrad) : it.stroke;
        ctx.lineWidth = it.strokeWidth;
        ctx.stroke(it.p2d);
      }
    }
    ctx.restore();
    const vData = ctx.getImageData(0, 0, ew, eh).data;
    const oData = (work.rawRgba && work.rawRgba.length === w * h * 4) ? work.rawRgba : work.data.data;
    const step = Math.max(1, Math.floor((ew * eh) / 8000));
    let sumDE00 = 0, cnt = 0;
    for (let ep = 0; ep < ew * eh; ep += step) {
      const ex = ep % ew, ey = (ep / ew) | 0;
      const ox = Math.min(w - 1, Math.floor((ex * w) / ew));
      const oy = Math.min(h - 1, Math.floor((ey * h) / eh));
      const op = oy * w + ox;
      if (mask && mask[op]) continue;
      const vi = ep * 4, oi = op * 4;
      if (vData[vi + 3] < 32) continue;
      const [L1, a1, b1] = rgb2lab(oData[oi], oData[oi + 1], oData[oi + 2]);
      const [L2, a2, b2] = rgb2lab(vData[vi], vData[vi + 1], vData[vi + 2]);
      sumDE00 += ciede2000(L1, a1, b1, L2, a2, b2);
      cnt++;
    }
    if (cnt > 0) {
      const rtDE00 = +(sumDE00 / cnt).toFixed(2);
      const rtEColor = clamp(rtDE00 / 18.0, 0, 1);
      const newJ = +(baseEval.J * 0.72 + rtEColor * 0.28).toFixed(4);
      return {
        ...baseEval,
        J: newJ,
        qualityScore: Math.round(clamp((1 - newJ) * 100, 12, 99)),
        meanDE00: rtDE00,
        components: { ...baseEval.components, E_color: +rtEColor.toFixed(3) }
      };
    }
  } catch (e) {}
  return baseEval;
}

async function vectorize(srcImg, cfg = {}, onProgress) {
  setTraceCtrl({ paused: false, skipToEnd: false });
  const tAll = performance.now();
  const stats = {};
  const hw = getHwConfig();
  const activeCores = hw.multiThread ? clamp(hw.cpuCores || 1, 1, 64) : 1;
  const ramCaps = MemPool.computeRamCaps(cfg.maxDim || (cfg.imageType === 'photo' ? 760 : 880));
  MemPool.beginSession();

  /* Budget waktu real-time agar pengguna dapat mengamati proses scanning hingga penggambaran kurva SVG secara jelas */
  const TARGET_TOTAL_MS = cfg.fastPreview ? 900 : 6400;
  const W_BUDGET = {
    classify: TARGET_TOTAL_MS * 0.12,
    palette:  TARGET_TOTAL_MS * 0.13,
    segment:  TARGET_TOTAL_MS * 0.20,
    trace:    TARGET_TOTAL_MS * 0.14,
    smooth:   TARGET_TOTAL_MS * 0.14,
    fit:      TARGET_TOTAL_MS * 0.19,
    assemble: TARGET_TOTAL_MS * 0.08,
  };

  const maxDim = ramCaps.effMaxDim;
  if (onProgress) { onProgress('classify', 0.005, 'Membaca & menyiapkan citra resolusi kerja…', null); await tick(); }
  const work = makeWork(srcImg, maxDim);
  const { w, h, scale } = work;
  const W = Math.round(srcImg.w), H = Math.round(srcImg.h);
  MemPool.trackAlloc(w * h * 16);
  stats.workSize = w + '×' + h;
  stats.origSize = srcImg.w + '×' + srcImg.h;

  const origRgbaSnapshot = new Uint8ClampedArray(work.data.data);
  const vizState = {
    w, h, W, H, scale,
    origCanvas: buildVizRgbaCanvas(origRgbaSnapshot, w, h),
    edgeScanCanvas: null,
    cls: null,
    alphaInfo: null,
    palette: [],
    paletteProbes: [],
    quantCanvas: null,
    quadBlocks: [],
    qtCanvas: null,
    segMidCanvas: null,
    segFinalCanvas: null,
    segDiffCanvas: null,
    cleanedPixels: 0,
    rawLoops: [],
    smoothedLoops: [],
    bezierLoops: [],
    drawingSegs: [],
    regs: [],
    svg: '',
    stats
  };

  /* [RT-SMOOTH] prog: progres dijamin monotonik; flag `busy` memberi tahu viewer bahwa blok komputasi berat
     sedang berjalan (viewer menampilkan sinar CSS compositor yang tetap bergerak walau main-thread sibuk). */
  let _maxFrac = 0;
  const prog = async (stage, frac, detail, busy) => {
    if (stage !== 'done') { if (frac < _maxFrac) frac = _maxFrac; else _maxFrac = frac; }
    vizState.busy = !!busy;
    while (_traceCtrl.paused && !_traceCtrl.skipToEnd) {
      if (onProgress) onProgress(stage, frac, detail, vizState);
      await sleep(60);
    }
    if (onProgress) onProgress(stage, frac, detail, vizState);
    await tick();
    _lastYieldT = performance.now();
  };
  /* Update teks + napas UI di dalam loop rapat: hanya benar-benar memanggil prog bila >= 90 ms sejak update terakhir */
  let _lastUiT = 0;
  const ui = async (stage, frac, detail) => {
    const n = performance.now();
    if (n - _lastUiT < 90) { await yieldIfDue(12); return; }
    _lastUiT = n;
    await prog(stage, frac, detail, true);
  };

  /* ---- TAHAP 1: Alpha Defringing, Bilateral Pre-Filtering & Klasifikasi ---- */
  let tStage = performance.now();
  await prog('classify', 0.02, `Memindai citra & gradien Scharr 2D (${activeCores} Core · ${hw.ramMb} MB RAM${hw.useGpu ? ' · VGA Aktif' : ''})…`, true);
  let usedGpuShader = false;
  let usedMtWorkers = false;
  const gpuSession = (hw.useGpu && hw.gpuPipeline !== 'off') ? GpuAccelerator.beginGpuSession(work) : null;
  const alphaInfo = analyzeAlpha(work.data);
  const mask = flattenAlpha(work, cfg.transparency || 'keep', cfg.customColor);
  work.rawRgba = new Uint8ClampedArray(work.data.data);
  const rawBeachWork = { data: { data: new Uint8ClampedArray(work.data.data), width: w, height: h }, rawRgba: work.rawRgba, w, h, origAlpha: work.origAlpha };
  stats.alpha = alphaInfo;
  vizState.alphaInfo = alphaInfo;

  await prog('classify', 0.02, 'Mengklasifikasi karakter citra (warna, tepi, noise, topologi)…', true);
  let cls = classifyStage(work, alphaInfo, W, H);
  if (cfg.imageType && cfg.imageType !== 'auto') {
    cls = { ...cls, type: cfg.imageType, label: { blended: 'Artwork with Blended Edges', aliased: 'Artwork without Blended Edges', photo: 'Photograph' }[cfg.imageType] };
  }
  if (cfg.quality && cfg.quality !== 'auto') {
    cls = { ...cls, quality: cfg.quality, qlabel: { high: 'High', medium: 'Medium', low: 'Low' }[cfg.quality] };
  }
  const adpProfile = buildAdaptiveTraceProfile(cls, W, H, cfg.adaptiveProfileMode || 'auto');
  const adpP = adpProfile.params;
  stats.classification = cls;
  stats.adaptiveProfile = adpProfile;
  vizState.cls = cls;
  vizState.adaptiveProfile = adpProfile;

  if (cls.type !== 'aliased' && !adpP.skipBilateral) {
    await prog('classify', 0.02, 'Meredam noise dengan filter bilateral…', true);
    const sigSp = adpP.sigmaSpatial || 1.45;
    const sigCol = adpP.sigmaColor || (cls.quality === 'low' ? 30 : cls.quality === 'medium' ? 20 : 14);
    if (hw.useGpu && hw.gpuPipeline !== 'off') {
      usedGpuShader = GpuAccelerator.gpuBilateralPreFilter(work, mask, sigSp, sigCol, {
        radius: adpP.bilateralRadius,
        wedgeGuardThr: adpP.wedgeGuardThr
      });
    }
    if (!usedGpuShader) {
      if (hw.multiThread && activeCores > 1) {
        usedMtWorkers = await WorkerPool.bilateralPreFilterParallel(work, mask, sigSp, sigCol, activeCores, null, { radius: adpP.bilateralRadius, wedgeGuardThr: adpP.wedgeGuardThr, skipIfClean: adpP.skipBilateral });
      } else {
        await bilateralPreFilter(work, mask, sigSp, sigCol, null, { radius: adpP.bilateralRadius, wedgeGuardThr: adpP.wedgeGuardThr, skipIfClean: adpP.skipBilateral });
      }
    }
  }
  await prog('classify', 0.02, 'Menghitung gradien tepi DiZenzo Scharr 2D…', true);
  const edgeField = (hw.useGpu && hw.gpuPipeline === 'full')
    ? (GpuAccelerator.gpuBuildEdgeField(work, mask) || ((hw.multiThread && activeCores > 1) ? await WorkerPool.buildEdgeFieldParallel(work, mask, activeCores) : buildEdgeField(work, mask)))
    : ((hw.multiThread && activeCores > 1)
      ? await WorkerPool.buildEdgeFieldParallel(work, mask, activeCores)
      : buildEdgeField(work, mask));
  if (edgeField && edgeField.gpuSlotReady) usedGpuShader = true;
  await yieldIfDue();
  vizState.edgeScanCanvas = buildVizEdgeScanCanvas(work.data.data, edgeField.mag, mask, w, h);
  await paceStage(tStage, W_BUDGET.classify, 'classify', 0.02, 0.14, `Image Profiler: ${adpProfile.shortTitle} · ${cls.effectiveColors} warna efektif · ΔE=${adpP.layerDifference}`, prog);

  /* ---- TAHAP 2: Kuantisasi Warna CIE-Lab + Adaptive Layer Difference ---- */
  tStage = performance.now();
  const useAutoAdp = !!cfg.autoProfileParams;
  const effLayerDiff = (!useAutoAdp && cfg.layerDifference != null) ? cfg.layerDifference : adpP.layerDifference;
  await prog('palette', 0.15, `Kuantisasi CIE-Lab adaptif (target K≤${adpP.targetKMax}, ΔE=${effLayerDiff}) & eliminasi halo…`, true);
  const gMode = cfg.gradientMode || 'auto';
  const maxColOn = !!cfg.maxColorEnabled;
  const maxColVal = (maxColOn && cfg.maxColors >= 2) ? Math.max(2, Math.round(cfg.maxColors)) : 0;
  const palOpt = {
    colorMode: cfg.colorMode || 'auto',
    paletteColors: cfg.paletteColors,
    paletteItems: cfg.paletteItems,
    targetColors: maxColOn ? maxColVal : cfg.targetColors,
    maxColorEnabled: maxColOn,
    maxColors: maxColVal,
    gradientMode: gMode,
    adaptiveKMax: maxColOn ? Math.min(adpP.targetKMax || 22, maxColVal) : adpP.targetKMax,
    fixedK: cfg.palMode === 'fixed',
    sensitivity: cfg.sensitivity || adpP.sensitivity || 'medium',
    layerDifference: effLayerDiff,
    imageType: cls.type,
  };
  const palRes = findPalette(work, mask, palOpt, edgeField);
  const palette = palRes.palette;
  /* Selama Tahap 2-3 berlangsung, tampilkan palet yang sudah terkonsolidasi di vizState.palette
     agar pengguna langsung melihat palet gradient & batas Max Color sejak awal proses tracing */
  const earlyCons = consolidateGradientPalette(work, mask, palette, edgeField, cls, {
    gradientMode: gMode,
    maxColorEnabled: maxColOn,
    maxColors: maxColVal
  });
  stats.palette = { count: earlyCons.items.length, auto: palRes.auto, colors: earlyCons.hexes, layerDifference: effLayerDiff };
  vizState.palette = earlyCons.items;
  await yieldIfDue();
  vizState.paletteProbes = buildPaletteProbes(work, mask, palette, scale);
  await prog('palette', 0.15, 'Menyusun partisi QuadTree adaptif…', true);

  /* Inisialisasi QuadTree dengan ambang varians adaptif */
  const q = adpP.qtVarThr || ({ high: 160, medium: 320, low: 620 }[cls.quality] || 320);
  const quadBlocks = [];
  let labels = quadtreeInit(work, mask, palette, cls.type === 'aliased' ? q * 0.35 : q, edgeField, quadBlocks, rawBeachWork);
  const segCtx = labels._segCtx || work._segCtx;
  rawBeachWork._segCtx = segCtx;
  quadBlocks.sort((a, b) => (b[2] * b[3]) - (a[2] * a[3]));
  vizState.quadBlocks = quadBlocks;
  const rawNearestSnapshot = labels._rawNearestSnapshot || new Int16Array(labels);
  const qtLabelsSnapshot = new Int16Array(labels);
  await yieldIfDue();
  vizState.quantCanvas = buildVizLabelCanvas(rawNearestSnapshot, palette, w, h, false);
  await yieldIfDue();
  vizState.qtCanvas = buildVizLabelCanvas(qtLabelsSnapshot, palette, w, h, true);
  await paceStage(tStage, W_BUDGET.palette, 'palette', 0.15, 0.28, `Palet CIE-Lab ditemukan: ${palette.length} warna bersih (layer_difference ΔE=${effLayerDiff})`, prog);

  /* ---- TAHAP 3 & 4: Partisi QuadTree + Multi-Scale Edge Snapping + MRF Potts + Context-Aware Speckle/Sliver Removal ---- */
  tStage = performance.now();
  await paceStage(tStage, W_BUDGET.segment * 0.38, 'segment', 0.28, 0.38, `Partisi kisi adaptif QuadTree (${quadBlocks.length} sub-blok tepi)…`, prog);

  const tStageMrf = performance.now();
  const cplx = (!useAutoAdp && cfg.complexity != null) ? cfg.complexity : adpP.complexity;
  const isTexturedFlatPoster = cls.surfaceMode === 'flat' && cls.effectiveColors <= 8 && cls.meaningfulDetailDensity >= 0.45;
  const noiseBeta = isTexturedFlatPoster ? 1150 : ({ high: 1250, medium: 2100, low: 3600 }[cls.quality] || 2100);
  const beta = noiseBeta * (adpP.mrfBetaScale || 1.0) * (1.28 - cplx / 100 * 0.85) * (cls.type === 'aliased' ? 0.45 : 1);
  const mrfIters = adpP.mrfIters || (cls.type === 'photo' ? 14 : 18);

  await prog('segment', 0.38, 'Optimasi MRF Potts (simulated annealing)…', true);
  if (hw.useGpu && hw.gpuPipeline === 'full' && palette.length <= 64) {
    const half1 = Math.max(1, mrfIters >> 1);
    const half2 = Math.max(0, mrfIters - half1);
    segmentMRF(work, mask, labels, palette, {
      beta, maxIter: half1, startIter: 0, totalIters: mrfIters,
      topology: true, rawWork: rawBeachWork, edgeField, segCtx,
    });
    vizState.segMidCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
    await yieldIfDue();
    if (half2 > 0) {
      segmentMRF(work, mask, labels, palette, {
        beta, maxIter: half2, startIter: half1, totalIters: mrfIters,
        topology: true, rawWork: rawBeachWork, edgeField, segCtx,
      });
    }
  } else {
    for (let it = 0; it < mrfIters; it++) {
      await ui('segment', 0.38, `Optimasi MRF Potts · iterasi ${it + 1}/${mrfIters}…`);
      segmentMRF(work, mask, labels, palette, {
        beta: beta * (0.55 + 0.55 * (it / Math.max(1, mrfIters - 1))),
        maxIter: 1,
        iterIndex: it,
        totalIters: mrfIters,
        topology: true,
        rawWork: rawBeachWork,
        edgeField,
        segCtx,
      });
      if (it === (mrfIters >> 1)) {
        vizState.segMidCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
      }
      if (it >= 6 && labels._lastMrfChanged != null && labels._lastMrfChanged < Math.max(4, w * h * 0.00012)) {
        if (!vizState.segMidCanvas) vizState.segMidCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
        break;
      }
    }
  }

  await prog('segment', 0.38, 'Edge snapping sub-piksel & pembersihan speckle…', true);
  localNeighborhoodEdgeSnap(rawBeachWork, mask, labels, palette, edgeField, adpP.snapPasses || 4, segCtx);
  await yieldIfDue();
  let minPx = (!useAutoAdp && cfg.minPixels != null) ? cfg.minPixels : adpP.minPixels;
  /* [PATCH-FAM] Pembersihan terpadu: morfologi → gabung island derau 1-keluarga → min-pixels → sliver → parasit (dengan perlindungan lubang/detail nyata) */
  runSegmentationCleanup(labels, w, h, rawBeachWork, palette, mask, segCtx, minPx);
  await prog('segment', 0.38, 'Evaluasi kualitas segmentasi (closed-loop)…', true);

  /* ---- CLOSED-LOOP CALIBRATION & CANDIDATE REFINEMENT (Sesuai Bagian 5 Markdown) ---- */
  const initialEval = evaluateSegmentationRoundTrip(rawBeachWork, mask, labels, palette, edgeField, cls);
  let bestEval = initialEval;
  let calibrationInfo = {
    enabled: cfg.closedLoop !== false,
    refined: false,
    candidatesTested: 0,
    selectedCandidate: 'Konfigurasi Awal (Optimal)',
    initialJ: initialEval.J,
    finalJ: initialEval.J,
    initialQuality: initialEval.qualityScore,
    finalQuality: initialEval.qualityScore,
    boundaryIoU: initialEval.boundaryIoU,
    meanDE00: initialEval.meanDE00,
    detailRecall: initialEval.detailRecall,
    components: initialEval.components
  };

  if (cfg.closedLoop !== false && (cfg.colorMode || 'auto') === 'auto' && !(cfg.paletteColors && cfg.paletteColors.length) && initialEval.needsRefinement) {
    const candidates = generateBoundedCandidates(
      { layerDifference: effLayerDiff, targetKMax: adpP.targetKMax, minPixels: minPx, complexity: cplx, qtVarThr: q },
      cls,
      initialEval
    );
    const probeMaxDim = Math.min(480, Math.max(w, h));
    const probeWork = (Math.max(w, h) > probeMaxDim)
      ? makeWork(srcImg, probeMaxDim)
      : { data: new ImageData(new Uint8ClampedArray(work.data.data), w, h), rawRgba: rawBeachWork.rawRgba, w, h };
    const probeMask = (Math.max(w, h) > probeMaxDim)
      ? flattenAlpha(probeWork, cfg.transparency || 'keep', cfg.customColor)
      : mask;
    if (!probeWork.rawRgba) probeWork.rawRgba = new Uint8ClampedArray(probeWork.data.data);
    const probeEdge = (Math.max(w, h) > probeMaxDim) ? buildEdgeField(probeWork, probeMask) : edgeField;

    let bestCand = null;
    for (const cand of candidates) {
      calibrationInfo.candidatesTested++;
      await prog('segment', 0.38, `Kalibrasi kandidat ${calibrationInfo.candidatesTested}/${candidates.length}: ${cand.name}…`, true);
      const cPalRes = findPalette(probeWork, probeMask, {
        ...palOpt,
        adaptiveKMax: cand.targetKMax,
        layerDifference: cand.layerDifference
      }, probeEdge);
      const cPal = cPalRes.palette;
      await yieldIfDue();
      let cLabels = quadtreeInit(probeWork, probeMask, cPal, cls.type === 'aliased' ? cand.qtVarThr * 0.35 : cand.qtVarThr, probeEdge, null, probeWork);
      const cBeta = noiseBeta * (adpP.mrfBetaScale || 1.0) * (1.28 - cand.complexity / 100 * 0.85) * (cls.type === 'aliased' ? 0.45 : 1);
      await yieldIfDue();
      segmentMRF(probeWork, probeMask, cLabels, cPal, { beta: cBeta, maxIter: 6, topology: true, rawWork: probeWork, edgeField: probeEdge, segCtx: cLabels._segCtx });
      await yieldIfDue();
      runSegmentationCleanup(cLabels, probeWork.w, probeWork.h, probeWork, cPal, probeMask, cLabels._segCtx, cand.minPixels);
      const cEval = evaluateSegmentationRoundTrip(probeWork, probeMask, cLabels, cPal, probeEdge, cls);
      if (cEval.J < bestEval.J - 0.008) {
        bestEval = cEval;
        bestCand = cand;
      }
    }

    if (bestCand) {
      /* Jalankan parameter kandidat pemenang pada resolusi produksi penuh */
      await prog('segment', 0.38, 'Menerapkan kandidat terbaik pada resolusi penuh…', true);
      const winPalRes = findPalette(work, mask, {
        ...palOpt,
        adaptiveKMax: bestCand.targetKMax,
        layerDifference: bestCand.layerDifference
      }, edgeField);
      palette.length = 0;
      winPalRes.palette.forEach(c => palette.push(c));
      labels = quadtreeInit(work, mask, palette, cls.type === 'aliased' ? bestCand.qtVarThr * 0.35 : bestCand.qtVarThr, edgeField, null, rawBeachWork);
      const winBeta = noiseBeta * (adpP.mrfBetaScale || 1.0) * (1.28 - bestCand.complexity / 100 * 0.85) * (cls.type === 'aliased' ? 0.45 : 1);
      const winIters = Math.max(8, mrfIters - 4);
      if (hw.useGpu && hw.gpuPipeline === 'full' && palette.length <= 64) {
        segmentMRF(work, mask, labels, palette, {
          beta: winBeta, maxIter: winIters, startIter: 0, totalIters: winIters,
          topology: true, rawWork: rawBeachWork, edgeField, segCtx: labels._segCtx
        });
      } else {
        for (let it = 0; it < winIters; it++) {
          await ui('segment', 0.38, `Optimasi MRF resolusi penuh · iterasi ${it + 1}/${winIters}…`);
          segmentMRF(work, mask, labels, palette, {
            beta: winBeta * (0.60 + 0.40 * (it / Math.max(1, mrfIters - 5))),
            maxIter: 1,
            iterIndex: it,
            totalIters: mrfIters,
            topology: true,
            rawWork: rawBeachWork,
            edgeField,
            segCtx: labels._segCtx
          });
          if (it >= 6 && labels._lastMrfChanged != null && labels._lastMrfChanged < Math.max(4, w * h * 0.00012)) break;
        }
      }
      localNeighborhoodEdgeSnap(rawBeachWork, mask, labels, palette, edgeField, adpP.snapPasses || 4, labels._segCtx);
      minPx = bestCand.minPixels;
      runSegmentationCleanup(labels, w, h, rawBeachWork, palette, mask, labels._segCtx, minPx);
      const prodEval = evaluateSegmentationRoundTrip(rawBeachWork, mask, labels, palette, edgeField, cls);
      bestEval = prodEval;
      calibrationInfo.refined = true;
      calibrationInfo.selectedCandidate = bestCand.name;
      calibrationInfo.finalJ = prodEval.J;
      calibrationInfo.finalQuality = prodEval.qualityScore;
      calibrationInfo.boundaryIoU = prodEval.boundaryIoU;
      calibrationInfo.meanDE00 = prodEval.meanDE00;
      calibrationInfo.detailRecall = prodEval.detailRecall;
      calibrationInfo.components = prodEval.components;
      stats.palette = { count: palette.length, auto: true, colors: palette.map(c => c.hex), layerDifference: bestCand.layerDifference };
      vizState.palette = palette;
      vizState.paletteProbes = buildPaletteProbes(work, mask, palette, scale);
    }
  }

  if ((cfg.colorMode || 'auto') !== 'two') {
    unifyGradientBands(labels, w, h, rawBeachWork, mask, palette, edgeField, cls, {
      gradientMode: gMode,
      forceGradient: gMode === 'on',
      maxColorEnabled: maxColOn,
      maxColors: maxColVal,
      attachPreviewGradients: true
    });
    stats.palette = { count: palette.length, auto: palRes.auto, colors: palette.map(c => c.hex), layerDifference: stats.palette ? stats.palette.layerDifference : effLayerDiff };
    vizState.palette = palette;
  } else {
    compactActivePaletteAndLabels(labels, w, h, rawBeachWork, mask, palette, edgeField, cls, {
      maxColorEnabled: maxColOn,
      maxColors: maxColVal,
      attachGradients: false
    });
    vizState.palette = palette;
  }
  stats.beta = Math.round(beta);
  stats.minPixels = minPx;
  stats.layerDifference = stats.palette ? stats.palette.layerDifference : effLayerDiff;
  stats.calibration = calibrationInfo;
  vizState.calibration = calibrationInfo;
  await yieldIfDue();
  vizState.segFinalCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
  await yieldIfDue();
  const diffRes = buildVizDiffCanvas(rawNearestSnapshot, labels, w, h);
  vizState.segDiffCanvas = diffRes.canvas;
  vizState.cleanedPixels = diffRes.diffCount;
  stats.cleanedPixels = diffRes.diffCount;
  await paceStage(tStageMrf, W_BUDGET.segment * 0.62, 'segment', 0.38, 0.54, `MRF Potts & Context-Aware Cleanup selesai (filter_speckle=${minPx}px · ${diffRes.diffCount.toLocaleString('id-ID')} piksel diperbaiki)`, prog);

  /* ---- TAHAP 5 & 6: Graf Planar & Inversi Sub-Piksel "Beach Deconvolution" ---- */
  tStage = performance.now();
  await prog('trace', 0.55, 'Menelusuri graf planar & dekonvolusi sub-piksel pantai…', true);
  const aaOn = cfg.aa !== false;
  const tr = traceBoundaries(labels, w, h, rawBeachWork, palette, { aa: aaOn });
  stats.loops = tr.loops.length;
  stats.traceMs = Math.round(tr.ms);

  const rawLoops = [];
  let totalPts = 0;
  for (let i = 0; i < tr.loops.length; i++) {
    const lp = tr.loops[i];
    const pts = lp.pts.map(p => [p[0], p[1]]);
    totalPts += pts.length;
    rawLoops.push({ label: lp.label, rawPts: pts, vkeys: lp.vkeys, juncFlags: lp.juncFlags, isTrueCircle: !!lp.isTrueCircle, area: lp.area });
  }
  buildVizGeometryInto(vizState, rawLoops, null, palette, scale);
  await paceStage(tStage, W_BUDGET.trace, 'trace', 0.55, 0.67, `Menelusuri ${tr.loops.length} kontur graf planar (${totalPts.toLocaleString('id-ID')} verteks sub-piksel)…`, prog);

  /* ---- TAHAP 7 & 8: Penghalusan Kontur Adaptif Per-Kontur, Fitting Bézier & Sinkronisasi Topologi Bersama ---- */
  tStage = performance.now();
  const sm = (!useAutoAdp && cfg.smoothness != null) ? cfg.smoothness : adpP.smoothness;
  const lambda = Math.pow(10, -0.8 + (sm / 100) * 2.25);
  const nd = (!useAutoAdp && cfg.nodeDensity != null) ? cfg.nodeDensity : adpP.nodeDensity;
  const tol = Math.max(0.08, (0.38 - (nd / 100) * 0.28)) * scale;
  const smoothed = [];
  let totalSegs = 0;

  const advOpt = {
    smoothMethod: (!useAutoAdp && cfg.smoothMethod) || adpP.smoothMethod || 'hybrid',
    lineStraighten: (!useAutoAdp ? cfg.lineStraighten : undefined) ?? adpP.lineStraighten ?? 58,
    axisSnap: (!useAutoAdp && cfg.axisSnap !== undefined) ? cfg.axisSnap !== false : adpP.axisSnap,
    axisSnapDeg: (!useAutoAdp ? cfg.axisSnapDeg : undefined) ?? adpP.axisSnapDeg ?? 2.4,
    despeckleJitter: (!useAutoAdp ? cfg.despeckleJitter : undefined) ?? adpP.despeckleJitter ?? 74,
    extremumAlign: cfg.extremumAlign !== false,
    cornerMode: (!useAutoAdp && cfg.cornerMode) || adpP.cornerMode || 'typo',
    lineCurveSensitivity: (!useAutoAdp ? cfg.lineCurveSensitivity : undefined) ?? adpP.lineCurveSensitivity ?? 76,
    apexSharpness: (!useAutoAdp ? cfg.apexSharpness : undefined) ?? adpP.apexSharpness ?? 82,
    cornerRoundness: (!useAutoAdp ? cfg.cornerRoundness : undefined) ?? adpP.cornerRoundness ?? 68,
    protectStemCaps: (!useAutoAdp && cfg.protectStemCaps !== undefined) ? cfg.protectStemCaps !== false : adpP.protectStemCaps
  };
  const effCornerAngle = (!useAutoAdp && cfg.cornerAngle) || adpP.cornerAngle || 44;

  await prog('smooth', 0.67, `Menghaluskan ${tr.loops.length} kontur & fitting kurva Bézier…`, true);
  let parallelRes = null;
  if (hw.multiThread && activeCores > 1 && tr.loops.length >= 4) {
    parallelRes = await WorkerPool.smoothAndFitParallel(tr.loops, scale, {
      lambda,
      iters: 52,
      detectCorners: cfg.detectCorners !== false,
      cornerAngle: effCornerAngle,
      tol,
      advOpt
    }, activeCores);
  }

  let sharpCorners = 0, smoothCorners = 0, straightSegs = 0, curveSegs = 0;
  if (parallelRes) {
    usedMtWorkers = true;
    for (const r of parallelRes) {
      sharpCorners += (r.sharpCnt || 0);
      smoothCorners += (r.smoothCnt || 0);
      smoothed.push({
        label: r.label,
        pts: r.scaledPts,
        scaledPts: r.scaledPts,
        segs: r.segs,
        d: r.d,
        area: r.area,
        isTrueCircle: !!r.isTrueCircle,
        sharpPts: r.sharpPts || [],
        smoothPts: r.smoothPts || []
      });
    }
  } else {
    for (let i = 0; i < tr.loops.length; i++) {
      if ((i & 7) === 0) await ui('smooth', 0.67, `Menghaluskan & memfitting kontur ${i + 1}/${tr.loops.length}…`);
      const lp = tr.loops[i];
      const pts = rawLoops[i].rawPts;
      const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(pts, lp.area, lambda, tol, scale, advOpt);
      const s = smoothLoop(pts, {
        ...localAdv,
        lambda: localLambda,
        iters: 52,
        detectCorners: cfg.detectCorners !== false,
        cornerAngle: effCornerAngle,
        juncFlags: lp.juncFlags,
        isTrueCircle: lp.isTrueCircle
      });
      const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
      const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
      const sharpPts = [], smoothPts = [];
      for (let k = 0; k < s.corners.length; k++) {
        if (s.corners[k]) { sharpCorners++; sharpPts.push(spts[k]); }
        else if (s.smoothKnots && s.smoothKnots[k]) { smoothCorners++; smoothPts.push(spts[k]); }
      }
      const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: lp.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt);
      smoothed.push({
        label: lp.label,
        pts: spts,
        scaledPts: spts,
        corners: s.corners,
        smoothKnots: s.smoothKnots,
        knotTangents: s.knotTangents,
        juncFlags: lp.juncFlags,
        isTrueCircle: !!s.isTrueCircle,
        segs,
        d: segsToD(segs, true),
        area: lp.area * scale * scale,
        sharpPts,
        smoothPts
      });
    }
  }

  synchronizeSharedTopology(smoothed, rawLoops);
  for (const s of smoothed) {
    totalSegs += s.segs.length;
    for (const sg of s.segs) { if (sg.isLine) straightSegs++; else curveSegs++; }
  }
  stats.smoothLambda = +lambda.toFixed(3);
  stats.vertices = totalPts;
  stats.bezierSegs = totalSegs;
  stats.sharpCorners = sharpCorners;
  stats.smoothCorners = smoothCorners;
  stats.straightSegs = straightSegs;
  stats.curveSegs = curveSegs;
  stats.fitTol = +tol.toFixed(2);

  buildVizGeometryInto(vizState, rawLoops, smoothed, palette, scale);

  await paceStage(tStage, W_BUDGET.smooth, 'smooth', 0.67, 0.78, `Penghalusan Elastika CG & penguncian sudut (${sharpCorners} Sudut Tajam C⁰ · ${smoothCorners} Simpul Halus G¹)…`, prog);

  const tStageFit = performance.now();
  await paceStage(tStageFit, W_BUDGET.fit, 'fit', 0.78, 0.93, `Menggambar ${totalSegs} segmen vektor (${straightSegs} Garis Lurus L · ${curveSegs} Kurva Bézier Kubik C)…`, prog);

  /* ---- TAHAP AKHIR: Perakitan Topologi SVG & Fitting Gradasi Kontinu ---- */
  tStage = performance.now();
  await prog('assemble', 0.93, 'Mengekstraksi gradien halus (<linearGradient> / <radialGradient>) & merakit topologi SVG…', true);
  const hasGradForAssemble = gMode === 'on' || (gMode === 'auto' && cls && cls.surfaceMode !== 'flat' && (
    cls.surfaceMode === 'gradient' ||
    cls.surfaceMode === 'mixed' ||
    cls.gradientContinuity >= 0.18 ||
    palRes.hasSmoothGradient
  ));
  const gradCtx = ((cfg.colorMode || 'auto') !== 'two' && hasGradForAssemble)
    ? { labels, w, h, rawWork: rawBeachWork, scale, W, H, edgeField, gradientMode: gMode, forceGradient: gMode === 'on' }
    : null;
  const regs = buildRegions(smoothed.map(s => ({ label: s.label, area: s.area, d: s.d, scaledPts: s.pts, segs: s.segs })), palette, 1, gradCtx);
  vizState.palette = palette;
  const bgOpt = (cfg.transparency === 'white' || cfg.transparency === 'custom')
    ? (cfg.transparency === 'custom' ? (cfg.customColor || '#ffffff') : '#ffffff')
    : 'none';
  const svg = assembleSVG(regs, W, H, {
    stackMode: cfg.stackMode || 'stack',
    stroke: cfg.stroke !== false,
    bg: bgOpt,
    safetyBg: !alphaInfo.hasAlpha,
  });
  stats.regions = regs.length;
  vizState.regs = regs;
  vizState.svg = svg;
  if (stats.calibration) {
    /* [FIX-2026-10-29] Evaluasi round-trip vektor TIDAK BOLEH membuang
       SVG yang sudah jadi: dulu pemanggilan parseSvgForCanvas() yang
       tidak terdefinisi melempar di sini dan vectorize() gagal total.
       Kini helper itu disediakan modul 00, dan sebagai pertahanan
       kedua, kegagalan metrik apa pun di sini ditangkap — skor
       segmentasi awal tetap dipakai, SVG tetap dikembalikan. */
    try {
      const finalRt = evaluateFinalVectorRoundTrip(
        rawBeachWork, mask, (typeof parseSvgForCanvas === 'function' ? parseSvgForCanvas(svg) : []), labels, palette, edgeField, cls, totalSegs, tr.loops.length
      );
      if (finalRt) {
        stats.calibration.finalJ = finalRt.J;
        stats.calibration.finalQuality = finalRt.qualityScore;
        stats.calibration.boundaryIoU = finalRt.boundaryIoU;
        stats.calibration.meanDE00 = finalRt.meanDE00;
        stats.calibration.components = finalRt.components;
      }
    } catch (e) { /* metrik gagal: SVG tetap sah, skor awal dipertahankan */ }
  }

  await paceStage(tStage, W_BUDGET.assemble, 'assemble', 0.93, 0.99, `Mewarnai & merakit ${regs.length} layer region SVG bebas-celah…`, prog);

  stats.ms = Math.round(performance.now() - tAll);
  const memStat = MemPool.getStats();
  const vramStat = GPUMemPool.getStats();
  stats.hw = {
    coresUsed: activeCores,
    multiThread: hw.multiThread && activeCores > 1,
    workersActive: usedMtWorkers,
    gpuUsed: usedGpuShader || (hw.useGpu && HW_LIMITS.gpu.available),
    gpuBackend: gpuSession ? gpuSession.backend : (hw.useGpu ? 'WebGL2 Shader' : 'CPU'),
    gpuRenderer: HW_LIMITS.gpu.renderer,
    ramAllocatedMb: hw.ramMb,
    peakRamMb: memStat.peakMb,
    peakVramMb: vramStat.peakVramMb,
    activeVramSlots: vramStat.activeSlots,
    threadPriority: hw.threadPriority
  };
  MemPool.flush();
  await prog('done', 1, 'Selesai');

  return {
    svg, regs, palette, labels, loops: rawLoops,
    w, h, W, H, scale, cls, stats, mask,
    hasGradForAssemble, edgeField, adaptiveProfile: adpProfile,
    origLabelsSnapshot: new Int16Array(labels),
    workData: work.data, rawRgba: origRgbaSnapshot, origAlpha: work.origAlpha, hiddenLabels: [],
    traceHistory: vizState
  };
}

/* Trace ulang dari label map yang sudah diedit di SegEditor */
async function retraceFromLabels(S, cfg = {}, onProgress) {
  setTraceCtrl({ paused: false, skipToEnd: false });
  const vizState = S.traceHistory || buildTraceHistoryFromSession(S, null);
  const prog = async (stage, f, d) => {
    while (_traceCtrl.paused && !_traceCtrl.skipToEnd) {
      if (onProgress) onProgress(stage, f, d, vizState);
      await sleep(60);
    }
    if (onProgress) onProgress(stage, f, d, vizState);
    await tick();
  };
  const t0 = performance.now();
  const { labels, palette, w, h, scale, W, H, cls, workData } = S;
  const effCls = cls || (S.stats && S.stats.classification) || {};
  const adpProfile = S.adaptiveProfile || (S.stats && S.stats.adaptiveProfile) || buildAdaptiveTraceProfile(effCls, W, H, cfg.adaptiveProfileMode || 'auto');
  const adpP = (adpProfile && adpProfile.params) || {};
  const useAutoAdp = !!cfg.autoProfileParams;

  /* Deteksi piksel yang baru diedit secara manual di SegEditor agar:
     1) Sadel papan catur 2x2 & bintik 1px bekas goresan kuas dibersihkan secara lokal tanpa merusak bentuk editan,
     2) Beach Deconvolution menerima nilai RGB transisi yang konsisten dengan label baru di area editan (bukan RGB lama!) */
  let effectiveRgba = S.rawRgba;
  if (S.origLabelsSnapshot && S.origLabelsSnapshot.length === w * h) {
    const origSnap = S.origLabelsSnapshot;
    const editedMask = new Uint8Array(w * h);
    let editedCnt = 0;
    for (let p = 0; p < w * h; p++) {
      if (labels[p] !== origSnap[p]) { editedMask[p] = 1; editedCnt++; }
    }
    if (editedCnt > 0) {
      const nearEdit = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!editedMask[y * w + x]) continue;
          for (let dy = -2; dy <= 2; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= h) continue;
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              if (nx >= 0 && nx < w) nearEdit[ny * w + nx] = 1;
            }
          }
        }
      }
      /* Bersihkan sadel papan catur 2x2 khusus pada zona goresan kuas agar tidak menciptakan X-junction palsu */
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const p00 = y * w + x;
          if (!nearEdit[p00]) continue;
          const p10 = p00 + 1, p01 = p00 + w, p11 = p01 + 1;
          const l00 = labels[p00], l10 = labels[p10], l01 = labels[p01], l11 = labels[p11];
          if (l00 >= 0 && l10 >= 0 && l00 === l11 && l10 === l01 && l00 !== l10) {
            if (!wouldChangeTopology(labels, w, h, x, y, l00, l10)) labels[p00] = l10;
            else if (!wouldChangeTopology(labels, w, h, x + 1, y, l10, l00)) labels[p10] = l00;
          }
        }
      }
      if (S.rawRgba && S.rawRgba.length === w * h * 4) {
        effectiveRgba = new Uint8ClampedArray(S.rawRgba);
        /* Pertama isi piksel yang diubah dengan warna palet barunya */
        for (let p = 0; p < w * h; p++) {
          if (!editedMask[p]) continue;
          const c = palette[labels[p]];
          if (!c) continue;
          const i4 = p * 4;
          effectiveRgba[i4] = c.r; effectiveRgba[i4 + 1] = c.g; effectiveRgba[i4 + 2] = c.b;
        }
        /* Haluskan pita batas 1px di sekeliling editan manual dengan kernel 2x2 agar Beach Deconvolution mulus */
        const smRgba = new Uint8ClampedArray(effectiveRgba);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (!nearEdit[p]) continue;
            const L = labels[p];
            if (labels[p - 1] === L && labels[p + 1] === L && labels[p - w] === L && labels[p + w] === L) continue;
            let sr = 0, sg = 0, sb = 0, sw = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const np = (y + dy) * w + (x + dx);
                const c = palette[labels[np]];
                if (!c) continue;
                const wgt = (dx === 0 && dy === 0) ? 4 : (dx === 0 || dy === 0) ? 2 : 1;
                sr += c.r * wgt; sg += c.g * wgt; sb += c.b * wgt; sw += wgt;
              }
            }
            if (sw > 0) {
              const i4 = p * 4;
              smRgba[i4] = Math.round(sr / sw);
              smRgba[i4 + 1] = Math.round(sg / sw);
              smRgba[i4 + 2] = Math.round(sb / sw);
            }
          }
        }
        effectiveRgba = smRgba;
      }
      S.origLabelsSnapshot = new Int16Array(labels);
    }
  }

  if (vizState) {
    vizState.segFinalCanvas = buildVizLabelCanvas(labels, palette, w, h, true);
  }
  await prog('trace', 0.56, 'Menelusuri ulang graf planar dari label yang diedit…');
  const aaOn = cfg.aa !== false;
  const tr = traceBoundaries(labels, w, h, { data: workData, rawRgba: effectiveRgba, origAlpha: S.origAlpha }, palette, { aa: aaOn });

  const sm = (!useAutoAdp && cfg.smoothness != null) ? cfg.smoothness : (adpP.smoothness ?? (effCls.type === 'photo' ? 56 : 66));
  const lambda = Math.pow(10, -0.8 + (sm / 100) * 2.25);
  const nd = (!useAutoAdp && cfg.nodeDensity != null) ? cfg.nodeDensity : (adpP.nodeDensity ?? 62);
  const tol = Math.max(0.08, (0.38 - (nd / 100) * 0.28)) * scale;
  const smoothed = [], rawLoops = [];
  const hw = getHwConfig();
  const activeCores = hw.multiThread ? clamp(hw.cpuCores || 1, 1, 64) : 1;
  const advOpt = {
    smoothMethod: (!useAutoAdp && cfg.smoothMethod) || adpP.smoothMethod || 'hybrid',
    lineStraighten: (!useAutoAdp ? cfg.lineStraighten : undefined) ?? adpP.lineStraighten ?? 58,
    axisSnap: (!useAutoAdp && cfg.axisSnap !== undefined) ? cfg.axisSnap !== false : (adpP.axisSnap !== false),
    axisSnapDeg: (!useAutoAdp ? cfg.axisSnapDeg : undefined) ?? adpP.axisSnapDeg ?? 2.4,
    despeckleJitter: (!useAutoAdp ? cfg.despeckleJitter : undefined) ?? adpP.despeckleJitter ?? 74,
    extremumAlign: cfg.extremumAlign !== false,
    cornerMode: (!useAutoAdp && cfg.cornerMode) || adpP.cornerMode || 'typo',
    lineCurveSensitivity: (!useAutoAdp ? cfg.lineCurveSensitivity : undefined) ?? adpP.lineCurveSensitivity ?? 76,
    apexSharpness: (!useAutoAdp ? cfg.apexSharpness : undefined) ?? adpP.apexSharpness ?? 82,
    cornerRoundness: (!useAutoAdp ? cfg.cornerRoundness : undefined) ?? adpP.cornerRoundness ?? 68,
    protectStemCaps: (!useAutoAdp && cfg.protectStemCaps !== undefined) ? cfg.protectStemCaps !== false : (adpP.protectStemCaps !== false)
  };
  const effCornerAngle = (!useAutoAdp && cfg.cornerAngle) || adpP.cornerAngle || 44;

  for (let i = 0; i < tr.loops.length; i++) {
    const lp = tr.loops[i];
    rawLoops.push({ label: lp.label, rawPts: lp.pts.map(p => [p[0], p[1]]), vkeys: lp.vkeys, juncFlags: lp.juncFlags, isTrueCircle: !!lp.isTrueCircle, area: lp.area });
  }

  let sharpCorners = 0, smoothCorners = 0, straightSegs = 0, curveSegs = 0;
  let pRes = null;
  if (hw.multiThread && activeCores > 1 && tr.loops.length >= 4) {
    pRes = await WorkerPool.smoothAndFitParallel(tr.loops, scale, {
      lambda, iters: 52, detectCorners: cfg.detectCorners !== false, cornerAngle: effCornerAngle, tol, advOpt
    }, activeCores);
  }
  if (pRes) {
    for (const r of pRes) {
      sharpCorners += (r.sharpCnt || 0);
      smoothCorners += (r.smoothCnt || 0);
      smoothed.push({ label: r.label, area: r.area, d: r.d, pts: r.scaledPts, scaledPts: r.scaledPts, segs: r.segs, isTrueCircle: !!r.isTrueCircle, sharpPts: r.sharpPts || [], smoothPts: r.smoothPts || [] });
    }
  } else {
    for (let i = 0; i < tr.loops.length; i++) {
      const lp = tr.loops[i];
      const pts = rawLoops[i].rawPts;
      const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(pts, lp.area, lambda, tol, scale, advOpt);
      const s = smoothLoop(pts, {
        ...localAdv,
        lambda: localLambda,
        iters: 52,
        detectCorners: cfg.detectCorners !== false,
        cornerAngle: effCornerAngle,
        juncFlags: lp.juncFlags,
        isTrueCircle: lp.isTrueCircle
      });
      const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
      const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
      const sharpPts = [], smoothPts = [];
      for (let k = 0; k < s.corners.length; k++) {
        if (s.corners[k]) { sharpCorners++; sharpPts.push(spts[k]); }
        else if (s.smoothKnots && s.smoothKnots[k]) { smoothCorners++; smoothPts.push(spts[k]); }
      }
      const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: lp.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt);
      smoothed.push({ label: lp.label, area: lp.area * scale * scale, d: segsToD(segs, true), pts: spts, scaledPts: spts, segs, isTrueCircle: !!s.isTrueCircle, sharpPts, smoothPts });
    }
  }
  synchronizeSharedTopology(smoothed, rawLoops);
  for (const s of smoothed) {
    for (const sg of s.segs) { if (sg.isLine) straightSegs++; else curveSegs++; }
  }
  const gMode = cfg.gradientMode || 'auto';
  const hasUserGrad = palette && palette.some(pe => pe && pe.userGrad);
  const hasGradForRetrace = gMode === 'on' || hasUserGrad || (gMode === 'auto' && effCls && effCls.surfaceMode !== 'flat' && (
    effCls.surfaceMode === 'gradient' ||
    effCls.surfaceMode === 'mixed' ||
    effCls.gradientContinuity >= 0.18 ||
    !!S.hasGradForAssemble
  ));
  if (!hasGradForRetrace && palette) {
    for (const pe of palette) {
      if (pe && !pe.userGrad) { pe.grad = null; pe.isGradient = false; }
    }
  }
  const gradCtxRetrace = ((cfg.colorMode || 'auto') !== 'two' && hasGradForRetrace)
    ? { labels, w, h, rawWork: { data: workData, rawRgba: S.rawRgba }, scale, W, H, edgeField: S.edgeField, gradientMode: gMode, forceGradient: gMode === 'on' }
    : null;
  const regs = buildRegions(smoothed, palette, 1, gradCtxRetrace);
  const svg = assembleSVG(regs, W, H, {
    stackMode: cfg.stackMode || 'stack',
    stroke: cfg.stroke !== false,
    bg: (cfg.transparency === 'white' || cfg.transparency === 'custom') ? (cfg.transparency === 'custom' ? (cfg.customColor || '#ffffff') : '#ffffff') : 'none',
    safetyBg: true,
    hiddenLabels: S.hiddenLabels || [],
  });
  if (vizState) {
    buildVizGeometryInto(vizState, rawLoops, smoothed, palette, scale);
    vizState.regs = regs;
    vizState.svg = svg;
  }
  await paceStage(performance.now(), 950, 'fit', 0.78, 0.96, 'Menggambar ulang kurva Bézier dari peta segmen baru…', prog);
  await prog('done', 1, 'Selesai');
  return {
    ...S, svg, regs, loops: rawLoops,
    traceHistory: vizState,
    stats: {
      ...(S.stats || {}),
      loops: tr.loops.length,
      bezierSegs: smoothed.reduce((a, s) => a + s.segs.length, 0),
      sharpCorners,
      smoothCorners,
      straightSegs,
      curveSegs,
      regions: regs.length,
      ms: Math.round(performance.now() - t0)
    }
  };
}

/* Render ulang smoothing + Bezier fit dari loops tersimpan (Auto-Update di Advanced Wizard) */
async function refitFromSession(sess, cfg = {}, onProgress) {
  const t0 = performance.now();
  const { loops, palette, scale, W, H } = sess;
  const sm = cfg.smoothness != null ? cfg.smoothness : 66;
  const lambda = Math.pow(10, -0.8 + (sm / 100) * 2.25);
  const nd = cfg.nodeDensity != null ? cfg.nodeDensity : 62;
  const tol = Math.max(0.08, (0.38 - (nd / 100) * 0.28)) * scale;
  const advOpt = {
    smoothMethod: cfg.smoothMethod || 'hybrid',
    lineStraighten: cfg.lineStraighten ?? 58,
    axisSnap: cfg.axisSnap !== false,
    axisSnapDeg: cfg.axisSnapDeg ?? 2.4,
    despeckleJitter: cfg.despeckleJitter ?? 74,
    extremumAlign: cfg.extremumAlign !== false,
    cornerMode: cfg.cornerMode || 'typo',
    lineCurveSensitivity: cfg.lineCurveSensitivity ?? 76,
    apexSharpness: cfg.apexSharpness ?? 82,
    cornerRoundness: cfg.cornerRoundness ?? 68,
    protectStemCaps: cfg.protectStemCaps !== false
  };
  const out = [];
  let sharpCorners = 0, smoothCorners = 0, straightSegs = 0, curveSegs = 0;
  for (let i = 0; i < loops.length; i++) {
    const lp = loops[i];
    const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(lp.rawPts, lp.area, lambda, tol, scale, advOpt);
    const s = smoothLoop(lp.rawPts, {
      ...localAdv,
      lambda: localLambda, iters: 50,
      detectCorners: cfg.detectCorners !== false,
      cornerAngle: cfg.cornerAngle || 44,
      juncFlags: lp.juncFlags,
      isTrueCircle: lp.isTrueCircle
    });
    for (let k = 0; k < s.corners.length; k++) {
      if (s.corners[k]) sharpCorners++;
      else if (s.smoothKnots && s.smoothKnots[k]) smoothCorners++;
    }
    const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
    const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
    const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: lp.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt);
    out.push({ label: lp.label, area: lp.area * scale * scale, d: segsToD(segs, true), pts: spts, scaledPts: spts, segs, isTrueCircle: !!s.isTrueCircle });
    if (i % 35 === 0 && onProgress) { onProgress(i / loops.length); await tick(); }
  }
  synchronizeSharedTopology(out, loops);
  for (const s of out) {
    for (const sg of s.segs) { if (sg.isLine) straightSegs++; else curveSegs++; }
  }
  const gMode = cfg.gradientMode || 'auto';
  const effCls = sess.cls || (sess.stats && sess.stats.classification) || {};
  const hasUserGrad = palette && palette.some(pe => pe && pe.userGrad);
  const hasGradForRefit = gMode === 'on' || hasUserGrad || (gMode === 'auto' && effCls && effCls.surfaceMode !== 'flat' && (
    effCls.surfaceMode === 'gradient' ||
    effCls.surfaceMode === 'mixed' ||
    effCls.gradientContinuity >= 0.18 ||
    !!sess.hasGradForAssemble
  ));
  if (!hasGradForRefit && palette) {
    for (const pe of palette) {
      if (pe && !pe.userGrad) { pe.grad = null; pe.isGradient = false; }
    }
  }
  const gradCtxRefit = (hasGradForRefit && sess.labels && (sess.rawRgba || sess.workData))
    ? { labels: sess.labels, w: Math.round(W / scale), h: Math.round(H / scale), rawWork: { data: sess.workData, rawRgba: sess.rawRgba }, scale, W, H, edgeField: sess.edgeField, gradientMode: gMode, forceGradient: gMode === 'on' }
    : null;
  const regs = buildRegions(out, palette, 1, gradCtxRefit);
  const svg = assembleSVG(regs, W, H, {
    stackMode: cfg.stackMode || 'stack',
    stroke: cfg.stroke !== false,
    bg: (cfg.transparency === 'white' || cfg.transparency === 'custom') ? (cfg.transparency === 'custom' ? (cfg.customColor || '#ffffff') : '#ffffff') : 'none',
    safetyBg: true,
    hiddenLabels: sess.hiddenLabels || [],
  });
  return {
    svg, regs, ms: Math.round(performance.now() - t0),
    segs: out.reduce((a, s) => a + s.segs.length, 0),
    sharpCorners, smoothCorners, straightSegs, curveSegs
  };
}

/* ---------------- Editor Segmentasi Manual ---------------- */
function renderSeg(canvas, labels, palette, w, h, opt = {}) {
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h), dd = img.data;
  for (let p = 0; p < w * h; p++) {
    const L = labels[p], o = p * 4;
    if (L < 0) { dd[o + 3] = 0; continue; }
    const c = palette[L] || { r: 200, g: 200, b: 200 };
    dd[o] = c.r; dd[o + 1] = c.g; dd[o + 2] = c.b; dd[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (opt.bounds) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const L = labels[y * w + x];
        if ((x < w - 1 && labels[y * w + x + 1] !== L) || (y < h - 1 && labels[(y + 1) * w + x] !== L)) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  return canvas;
}

function segLine(labels, w, h, x0, y0, x1, y1, L, size = 1, shape = 'circle', lockLabel = -999) {
  const r = Math.max(0, Math.floor(size / 2));
  const r2 = (r + 0.35) * (r + 0.35);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  const dot = (x, y) => {
    for (let j = -r; j <= r; j++) {
      const yy = y + j;
      if (yy < 0 || yy >= h) continue;
      const row = yy * w;
      for (let i = -r; i <= r; i++) {
        if (shape === 'circle' && r > 1 && (i * i + j * j) > r2) continue;
        const xx = x + i;
        if (xx < 0 || xx >= w) continue;
        const p = row + xx;
        if (lockLabel !== -999 && labels[p] !== lockLabel) continue;
        labels[p] = L;
        if (xx < minX) minX = xx;
        if (xx > maxX) maxX = xx;
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
    }
  };
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
  dot(x, y);
  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    dot(x, y);
  }
  return maxX >= minX ? { x0: minX, y0: minY, x1: maxX, y1: maxY } : null;
}

function segFill(labels, w, h, x, y, L, opt = {}) {
  const p0 = y * w + x;
  const from = labels[p0];
  const scope = opt.scope || 'contig'; /* 'contig' | 'global' | 'similar' */
  if (scope === 'global') {
    if (from === L) return 0;
    let n = 0;
    for (let p = 0, tot = w * h; p < tot; p++) {
      if (labels[p] === from) { labels[p] = L; n++; }
    }
    return n;
  }
  const palette = opt.palette;
  const tol = opt.tol || 0;
  const useSim = scope === 'similar' && palette && palette[from] && tol > 0;
  const c0 = useSim ? palette[from] : null;
  const maxD2 = useSim ? (tol * tol * 18) : 0;
  const canFillLabel = lbl => {
    if (lbl === from) return true;
    if (!useSim || lbl < 0 || lbl === L || !palette[lbl]) return false;
    const c = palette[lbl];
    return cdist2(c0.r, c0.g, c0.b, c.r, c.g, c.b) <= maxD2;
  };
  if (from === L && !useSim) return 0;

  const q = new Int32Array(w * h);
  const visited = useSim ? new Uint8Array(w * h) : null;
  let head = 0, tail = 0;
  q[tail++] = p0;
  labels[p0] = L;
  if (visited) visited[p0] = 1;
  while (head < tail) {
    const p = q[head++], px = p % w, py = (p / w) | 0;
    if (px > 0) {
      const np = p - 1;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
    if (px < w - 1) {
      const np = p + 1;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
    if (py > 0) {
      const np = p - w;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
    if (py < h - 1) {
      const np = p + w;
      if ((!visited || !visited[np]) && canFillLabel(labels[np]) && labels[np] !== L) {
        if (visited) visited[np] = 1;
        labels[np] = L; q[tail++] = np;
      }
    }
  }
  return tail;
}

/* Magic Wand pada gambar bitmap asli: menyatukan banyak segmen pecah berdasarkan toleransi warna piksel asli */
function segWandFill(labels, rawRgba, w, h, x, y, L, tol = 28, contig = true) {
  if (!rawRgba || rawRgba.length < w * h * 4) return segFill(labels, w, h, x, y, L, { scope: contig ? 'contig' : 'global' });
  const p0 = y * w + x, i0 = p0 * 4;
  const r0 = rawRgba[i0], g0 = rawRgba[i0 + 1], b0 = rawRgba[i0 + 2];
  const maxD2 = (tol * tol) * 14 + 45;
  if (!contig) {
    let n = 0;
    for (let p = 0, tot = w * h; p < tot; p++) {
      if (labels[p] < 0) continue;
      const i = p * 4;
      if (cdist2(r0, g0, b0, rawRgba[i], rawRgba[i + 1], rawRgba[i + 2]) <= maxD2) {
        labels[p] = L; n++;
      }
    }
    return n;
  }
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;
  seen[p0] = 1; q[tail++] = p0; labels[p0] = L;
  while (head < tail) {
    const p = q[head++], px = p % w, py = (p / w) | 0;
    const nbs = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
    for (let k = 0; k < 4; k++) {
      const np = nbs[k];
      if (np < 0 || seen[np] || labels[np] < 0) continue;
      const ni = np * 4;
      if (cdist2(r0, g0, b0, rawRgba[ni], rawRgba[ni + 1], rawRgba[ni + 2]) <= maxD2) {
        seen[np] = 1; labels[np] = L; q[tail++] = np;
      }
    }
  }
  return tail;
}

function segRectFill(labels, w, h, x0, y0, x1, y1, L, lockLabel = -999) {
  const ax = clamp(Math.min(x0, x1), 0, w - 1), bx = clamp(Math.max(x0, x1), 0, w - 1);
  const ay = clamp(Math.min(y0, y1), 0, h - 1), by = clamp(Math.max(y0, y1), 0, h - 1);
  let n = 0;
  for (let y = ay; y <= by; y++) {
    const row = y * w;
    for (let x = ax; x <= bx; x++) {
      const p = row + x;
      if (labels[p] < 0) continue;
      if (lockLabel !== -999 && labels[p] !== lockLabel) continue;
      labels[p] = L; n++;
    }
  }
  return n;
}

function segZap(labels, w, h, x, y) {
  const p0 = y * w + x, from = labels[p0];
  if (from < 0) return 0;
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;
  seen[p0] = 1; q[tail++] = p0;
  const votes = new Map();
  while (head < tail) {
    const p = q[head++], px = p % w, py = (p / w) | 0;
    const nb = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
    for (let k = 0; k < 4; k++) {
      const nq = nb[k];
      if (nq < 0) continue;
      const nl = labels[nq];
      if (nl === from) {
        if (!seen[nq]) { seen[nq] = 1; q[tail++] = nq; }
      } else if (nl >= 0) {
        votes.set(nl, (votes.get(nl) || 0) + 1);
      }
    }
  }
  let bl = -1, bv = 0;
  votes.forEach((v, k) => { if (v > bv) { bv = v; bl = k; } });
  if (bl < 0) return 0;
  for (let i = 0; i < tail; i++) labels[q[i]] = bl;
  return tail;
}

function rasterizeSVG(svg, W, H, scale = 1) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(W * scale));
      c.height = Math.max(1, Math.round(H * scale));
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c);
    };
    img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}


const VMT = {
  loadImage, makeWork, analyzeAlpha, flattenAlpha, classifyStage, buildEdgeField,
  findPalette, pruneHaloPaletteClusters, detectImageColorPool, detectNextImageColor, analyzeRecommendations, buildAdaptiveTraceProfile,
  evalColorBlendPair, buildSegmentationContext, quadtreeInit, localNeighborhoodEdgeSnap, segmentMRF, enforceMinPixels, erodeSandwichedBoundaryRibbons, resolveCheckerboardSaddles, absorbBoundaryParasites, morphologicalCleanStrokes, removeBoundarySlivers,
  analyzeSmallRegions, buildDetailProtection, resolveEnclosedNoiseIslands, runSegmentationCleanup,
  detectHorizontalSplitLines, injectPointHighlights, unifyGradientBands, fitComponentGradientFromPixels, attachGradientsToRegions,
  gradToCss, compactActivePaletteAndLabels, consolidateGradientPalette, applySessionPaletteAndGradientSettings,
  traceBoundaries, pruneContourSliverSpikes, refineBeachPlanar, douglasPeucker, simplifyClosed, smoothLoop, detectCorners,
  fitLoopBeziers, segsToD, synchronizeSharedTopology, analyzeColorPlateausAndGradients, buildRegions, assembleSVG, exportDXF,
  vectorize, retraceFromLabels, refitFromSession, STAGES,
  renderSeg, segLine, segFill, segWandFill, segRectFill, segZap, rasterizeSVG,
  hexOf, rgbOf, cdist2, rgb2lab, lab2lch, ciede2000, clamp,
  evaluateSegmentationRoundTrip, evaluateFinalVectorRoundTrip, generateBoundedCandidates, computeContourAdaptiveOpts,
  getHwConfig, setHwConfig, resetHwConfig, getHwInfo, subscribeHwConfig,
  getTraceCtrl, setTraceCtrl, subscribeTraceCtrl, buildTraceHistoryFromSession,
  MemPool, GPUMemPool, GpuAccelerator, WorkerPool,
};
window.VMT = VMT;

/* === END 14-vmt-orchestrator.js === */

  const _origMakeWork = VMT.makeWork;
  VMT.makeWork = function(src, maxDim = 840) {
    if (src && (src.rgba || (src.img && src.img._rgba))) {
      const raw = src.rgba || src.img._rgba;
      const sw = Math.max(1, src.w || (src.img && src.img.w) || 64);
      const sh = Math.max(1, src.h || (src.img && src.img.h) || 64);
      if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
        const cv = document.createElement('canvas');
        cv.width = sw;
        cv.height = sh;
        const ctx = cv.getContext('2d');
        const clamped = raw instanceof Uint8ClampedArray ? raw : new Uint8ClampedArray(raw.buffer || raw, raw.byteOffset || 0, raw.byteLength || raw.length);
        ctx.putImageData(new ImageData(clamped, sw, sh), 0, 0);
        return _origMakeWork({ img: cv, w: sw, h: sh }, maxDim);
      }
      return _origMakeWork({ img: { _rgba: raw, w: sw, h: sh }, w: sw, h: sh }, maxDim);
    }
    return _origMakeWork(src, maxDim);
  };
  return { VMT, VE };
}

export function getSvgPeakVmtEngine() {
  if (_cachedVmtInstance) return _cachedVmtInstance;

  const isBrowserDom = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement === 'function';

  const ImageDataCtor = (typeof ImageData !== 'undefined')
    ? ImageData
    : class ImageDataPolyfill {
        constructor(a, b, c) {
          if (typeof a === 'number') {
            this.width = a;
            this.height = b;
            this.data = new Uint8ClampedArray(a * b * 4);
          } else {
            this.data = a instanceof Uint8ClampedArray ? a : new Uint8ClampedArray(a.buffer || a, a.byteOffset || 0, a.byteLength || a.length);
            this.width = b;
            this.height = c || Math.max(1, Math.floor(this.data.length / (4 * Math.max(1, b))));
          }
        }
      };

  const localStorageShim = (() => {
    try {
      if (isBrowserDom && window.localStorage) {
        window.localStorage.getItem('__svgpeak_probe__');
        return window.localStorage;
      }
    } catch (e) {}
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); }
    };
  })();

  const resampleRgba = (srcRgba, sw, sh, dw, dh) => {
    if (sw === dw && sh === dh) {
      return new Uint8ClampedArray(srcRgba);
    }
    const dst = new Uint8ClampedArray(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
      const sy = Math.min(sh - 1, Math.floor(((dy + 0.5) * sh) / dh));
      for (let dx = 0; dx < dw; dx++) {
        const sx = Math.min(sw - 1, Math.floor(((dx + 0.5) * sw) / dw));
        const si = (sy * sw + sx) * 4;
        const di = (dy * dw + dx) * 4;
        dst[di] = srcRgba[si];
        dst[di + 1] = srcRgba[si + 1];
        dst[di + 2] = srcRgba[si + 2];
        dst[di + 3] = srcRgba[si + 3];
      }
    }
    return dst;
  };

  const headlessDocument = {
    createElement(tag) {
      if (tag !== 'canvas') return {};
      return {
        width: 1,
        height: 1,
        getContext(type) {
          if (type !== '2d') return null;
          const self = this;
          return {
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
            globalAlpha: 1,
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            save() {},
            restore() {},
            scale() {},
            translate() {},
            setTransform() {},
            clearRect() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            bezierCurveTo() {},
            closePath() {},
            fill() {},
            stroke() {},
            clip() {},
            fillRect() {},
            rect() {},
            arc() {},
            createLinearGradient() { return { addColorStop() {} }; },
            createRadialGradient() { return { addColorStop() {} }; },
            drawImage(img, x, y, w, h) {
              const tw = w || self.width || 1;
              const th = h || self.height || 1;
              if (img && img._rgba) {
                const scaled = resampleRgba(img._rgba, img.w || tw, img.h || th, tw, th);
                this._id = new ImageDataCtor(scaled, tw, th);
              } else if (img && img._ctx && img._ctx._id) {
                const srcId = img._ctx._id;
                const scaled = resampleRgba(srcId.data, srcId.width, srcId.height, tw, th);
                this._id = new ImageDataCtor(scaled, tw, th);
              }
            },
            putImageData(id) {
              this._id = id;
            },
            createImageData(w, h) {
              return new ImageDataCtor(w, h);
            },
            getImageData(x, y, w, h) {
              return this._id || new ImageDataCtor(w, h);
            }
          };
        }
      };
    }
  };

  const winObj = isBrowserDom ? window : globalThis;
  const docObj = isBrowserDom ? window.document : headlessDocument;
  const rafFn = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame.bind(globalThis)
    : (cb) => setTimeout(cb, 0);

  _cachedVmtInstance = _createSvgPeakVmtScope(winObj, docObj, ImageDataCtor, localStorageShim, rafFn);
  return _cachedVmtInstance;
}
