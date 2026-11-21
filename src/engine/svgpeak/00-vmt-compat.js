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
'use strict';

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
