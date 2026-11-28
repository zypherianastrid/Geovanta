/**
 * @file src/engine/svgDocumentParser.tsx
 * @description Parser DOM dokumen SVG lengkap beserta pewarisan gaya, grup, teks, gambar, & gradien
 */
import { MAX_COORD_ABS, isFiniteCoord, mmul, uid, rd } from './vectorPrimitives.tsx';
import { parseTransform, computeViewBoxTransform, bake } from './transformMatrixParser.tsx';
import { shapeD, serializeSub } from './svgPathSerializer.tsx';
import { parsePath } from './svgPathParser.tsx';
import { cssToHex, parseColorWithAlpha, formatColorWithAlpha } from '../utils/colorParserAndFormatter.tsx';
import { parseDocStyles, readStyleLinks } from './colorStyles.tsx';
import { validateEffects } from './effectsEngine.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { docBounds, makeImageObj, isSafeImageHref } from './imageAndBounds.tsx';
import { sanitizeSvgString, safeJsonParse } from '../utils/securityUtils.ts';
import { normalizeBlendMode } from './blendModes.tsx';
import { parseDasharray, formatDasharray } from './strokeStyles.tsx';

/* Efek (Task 8): data-effects (JSON) dari export dibaca kembali menjadi
   o.effects — divalidasi ketat via validateEffects, nilai tak valid
   dibuang. Atribut tidak ada / JSON rusak / semua item tak valid -> null. */
function readEffects(el) {
  const a = el.getAttribute('data-effects');
  if (!a) return null;
  try {
    const raw = safeJsonParse(a);
    if (!raw) return null;
    const v = validateEffects(raw);
    return v.length ? v : null;
  } catch (e) {
    return null;
  }
}

function parseGenData(el) {
  const genAttr = el.getAttribute('data-gen');
  if (!genAttr) return null;
  try {
    const g = safeJsonParse(genAttr);
    const num = v => typeof v === 'number' && Number.isFinite(v);
    if (g && typeof g === 'object' && g.kind === 'blob' && num(g.points) && num(g.irregularity) && num(g.smoothness) && num(g.seed) && num(g.cx) && num(g.cy) && num(g.rx) && num(g.ry)) return {
      kind: 'blob',
      points: g.points,
      irregularity: g.irregularity,
      smoothness: g.smoothness,
      seed: g.seed,
      cx: g.cx,
      cy: g.cy,
      rx: g.rx,
      ry: g.ry,
      rotation: num(g.rotation) ? g.rotation : 0,
      spikiness: num(g.spikiness) ? g.spikiness : 0
    };
    if (g && typeof g === 'object' && g.kind === 'weave' && num(g.cols) && num(g.rows) && num(g.amplitude) && num(g.thickness) && num(g.x) && num(g.y) && num(g.w) && num(g.h)) return {
      kind: 'weave',
      cols: g.cols,
      rows: g.rows,
      amplitude: g.amplitude,
      thickness: g.thickness,
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      waveType: typeof g.waveType === 'string' ? g.waveType : 'sine',
      gapSize: num(g.gapSize) ? g.gapSize : 0.5,
      frequency: num(g.frequency) ? g.frequency : 1,
      phase: num(g.phase) ? g.phase : 0
    };
    if (g && typeof g === 'object' && g.kind === 'arc' && num(g.cx) && num(g.cy) && num(g.r) && num(g.startDeg) && num(g.sweepDeg)) return {
      kind: 'arc',
      cx: g.cx,
      cy: g.cy,
      r: g.r,
      startDeg: g.startDeg,
      sweepDeg: g.sweepDeg
    };
    if (g && typeof g === 'object' && g.kind === 'chart' && typeof g.chartGroupId === 'string' && g.config && typeof g.config === 'object' && typeof g.config.chartType === 'string') return {
      kind: 'chart',
      version: num(g.version) ? g.version : 1,
      chartGroupId: g.chartGroupId,
      config: g.config,
      bounds: g.bounds && typeof g.bounds === 'object' ? g.bounds : { x: 0, y: 0, w: 600, h: 400 }
    };
    if (g && typeof g === 'object' && g.kind === 'chart-member' && typeof g.chartGroupId === 'string') return {
      kind: 'chart-member',
      chartGroupId: g.chartGroupId
    };
  } catch (e) {}
  return null;
}

function parseSVG(str) {
  if (typeof str === 'string') {
    str = sanitizeSvgString(str);
  }
  const dom = new DOMParser().parseFromString(str, 'image/svg+xml'),
    svg = dom.querySelector('svg');
  if (!svg || dom.querySelector('parsererror')) return {
    viewBox: [0, 0, 100, 100],
    objects: [],
    styles: [],
    unsupported: false,
    unsupportedElements: [],
    unsupportedSummary: '',
    error: true
  };
  const rawVb = (svg.getAttribute('viewBox') || '').trim();
  let vb = rawVb ? rawVb.split(/[\s,]+/).map(Number) : [];
  const fallbackW = Math.min(MAX_COORD_ABS, Math.max(1, Number.isFinite(parseFloat(svg.getAttribute('width'))) && parseFloat(svg.getAttribute('width')) > 0 ? parseFloat(svg.getAttribute('width')) : 100));
  const fallbackH = Math.min(MAX_COORD_ABS, Math.max(1, Number.isFinite(parseFloat(svg.getAttribute('height'))) && parseFloat(svg.getAttribute('height')) > 0 ? parseFloat(svg.getAttribute('height')) : 100));
  const objects = [],
    used = new Set(),
    frames = new Set(),
    unsupportedElements = [],
    parseWarnings = [];
  let auto = 0,
    badGrad = false;
  const noteUnsupported = (tag, id: any = null, reason: any = null) => {
    const label = tag + (id ? '#' + id : '') + (reason ? ' (' + reason + ')' : '');
    if (unsupportedElements.length < 32 && !unsupportedElements.includes(label)) unsupportedElements.push(label);
  };
  const noteWarn = (tag, id: any = null, reason: any = null) => {
    const label = tag + (id ? '#' + id : '') + (reason ? ' (' + reason + ')' : '');
    if (parseWarnings.length < 48 && !parseWarnings.includes(label)) parseWarnings.push(label);
  };
  if (vb.length !== 4 || !vb.every(isFiniteCoord) || vb[2] <= 0 || vb[3] <= 0) {
    if (rawVb) noteWarn('viewBox', null, 'invalid-viewBox');
    vb = [0, 0, fallbackW, fallbackH];
  }
  const gdefs = new Map();
  svg.querySelectorAll('linearGradient,radialGradient').forEach(ge => {
    const gid = ge.getAttribute('id');
    if (gid) gdefs.set(gid, ge);
  });
  const gHref = e => (e.getAttribute('href') || e.getAttribute('xlink:href') || '').replace(/^#/, '');
  /* GV-A08: Recursively extract clipPath geometry including nested <g>, <use>, and local transforms */
  const clipDefs = new Map();
  const collectClipSubs = (node, mat, depth = 0, useSeen = new Set()) => {
    if (!node || depth > 32) return [];
    const localM = node.getAttribute && node.getAttribute('transform') ? mmul(mat, parseTransform(node.getAttribute('transform'), noteWarn)) : mat;
    const tag = node.tagName;
    if (!tag) return [];
    if (tag === 'g' || tag === 'clipPath') {
      let acc = [];
      Array.from(node.children || []).forEach(ch => {
        acc = acc.concat(collectClipSubs(ch, localM, depth + 1, useSeen));
      });
      return acc;
    }
    if (tag === 'use') {
      const refId = gHref(node);
      if (!refId || useSeen.has(refId)) return [];
      const target = svg.querySelector('#' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(refId) : refId));
      if (!target) return [];
      const nextSeen = new Set(useSeen);
      nextSeen.add(refId);
      const ux = parseFloat(node.getAttribute('x')) || 0,
        uy = parseFloat(node.getAttribute('y')) || 0;
      const uMat = ux || uy ? mmul(localM, [1, 0, 0, 1, ux, uy]) : localM;
      return collectClipSubs(target, uMat, depth + 1, nextSeen);
    }
    const d = shapeD(node);
    if (!d) return [];
    return parsePath(d, localM, noteWarn);
  };
  svg.querySelectorAll('clipPath, mask').forEach(ce => {
    const cid = ce.getAttribute('id');
    if (!cid) return;
    const cSubs = collectClipSubs(ce, [1, 0, 0, 1, 0, 0], 0, new Set());
    if (cSubs.length) {
      clipDefs.set(cid, {
        subs: cSubs,
        d: cSubs.map(sp => serializeSub(sp)).join(' '),
        units: ce.getAttribute('clipPathUnits') || ce.getAttribute('maskContentUnits') || 'userSpaceOnUse'
      });
    }
  });
  const gattr = (el, k) => {
    for (let e = el, i = 0; e && i < 8; i++) {
      const v = e.getAttribute(k);
      if (v != null) return v;
      const hr = gHref(e);
      e = hr ? gdefs.get(hr) : null;
    }
    return null;
  };
  const gstops = (el, inheritedColor) => {
    for (let e = el, i = 0; e && i < 8; i++) {
      const st = Array.from(e.children).filter((c: any) => c.tagName === 'stop');
      if (st.length) return st.map((t: any, idx) => {
        const so = (t.getAttribute('offset') || '0').trim(),
          st0 = t.getAttribute('style') || '';
        const pm = k => {
          const mm = st0.match(new RegExp('(?:^|;)\\s*' + k + '\\s*:\\s*([^;]+)'));
          return mm ? mm[1].trim() : t.getAttribute(k);
        };
        let rawC = (pm('stop-color') || '#000000').trim();
        if (/^currentColor$/i.test(rawC)) rawC = inheritedColor || '#18181b';
        return {
          id: 's' + idx + '_' + uid(),
          offset: Math.max(0, Math.min(1, so.endsWith('%') ? parseFloat(so) / 100 : parseFloat(so) || 0)),
          color: typeof cssToHex === 'function' ? cssToHex(rawC) : rawC,
          op: pm('stop-opacity') != null ? parseFloat(pm('stop-opacity')) : 1,
          mid: 0.5
        };
      });
      const hr = gHref(e);
      e = hr ? gdefs.get(hr) : null;
    }
    return [];
  };
  /* IM-004: attachGrad mendukung baik 'fill' (po.grad) maupun 'stroke' (po.strokeGrad) */
  const attachGrad = (po, paintStr, m, targetKey = 'fill', inheritedColor = '#18181b') => {
    const mm = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(paintStr || '');
    if (!mm) return false;
    const ge = gdefs.get(mm[1]),
      stops = ge && gstops(ge, inheritedColor);
    if (!stops || !stops.length) {
      badGrad = true;
      noteUnsupported('gradient', mm[1], 'missing-stops');
      return false;
    }
    const rawStops = stops.map(s => ({
      ...s,
      id: s.id || uid(),
      mid: 0.5
    }));
    const rad = ge.tagName === 'radialGradient',
      obb = (gattr(ge, 'gradientUnits') || 'objectBoundingBox') !== 'userSpaceOnUse',
      gt = gattr(ge, 'gradientTransform'),
      M = gt ? parseTransform(gt) : [1, 0, 0, 1, 0, 0];
    const tbb = obb ? tightBBox(po) : null,
      bb = tbb && isFinite(tbb[0]) && tbb[0] <= tbb[2] ? tbb : obb ? docBounds({
        objects: [po]
      }) : null;
    if (obb && !bb) {
      badGrad = true;
      noteUnsupported('gradient', mm[1], 'empty-bbox');
      return false;
    }
    const num = (k, def) => {
      const v = gattr(ge, k);
      if (v == null) return def;
      const f = parseFloat(v);
      return isNaN(f) ? def : String(v).trim().endsWith('%') ? f / 100 : f;
    };
    const P = (x, y) => {
      let X = M[0] * x + M[2] * y + M[4],
        Y = M[1] * x + M[3] * y + M[5];
      if (bb) {
        X = bb[0] + X * Math.max(1e-6, bb[2] - bb[0]);
        Y = bb[1] + Y * Math.max(1e-6, bb[3] - bb[1]);
      } else {
        const X2 = m[0] * X + m[2] * Y + m[4];
        Y = m[1] * X + m[3] * Y + m[5];
        X = X2;
      }
      return [X, Y];
    };
    /* base = warna stop offset TERKECIL (stop pertama): stop tengah hasil
       kompilasi merusak o.fill/o.stroke (teks jadi warna tengah solid). */
    const firstStop = stops.reduce((a, s) => (!a || s.offset < a.offset ? s : a), null),
      base = (firstStop || stops[0]).color,
      bf = typeof cssToHex === 'function' ? cssToHex(base) : base;
    let gradObj = null;
    if (rad) {
      const c = P(num('cx', 0.5), num('cy', 0.5));
      const k = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) * (bb ? (bb[2] - bb[0] + (bb[3] - bb[1])) / 2 : Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1);
      gradObj = {
        type: 'radial',
        base: bf,
        cx: c[0],
        cy: c[1],
        r: Math.max(1e-4, num('r', 0.5) * k),
        rawStops,
        stops
      };
      if (gattr(ge, 'fx') != null || gattr(ge, 'fy') != null) {
        const fp = P(num('fx', num('cx', 0.5)), num('fy', num('cy', 0.5)));
        gradObj.fx = fp[0];
        gradObj.fy = fp[1];
      }
    } else {
      const a = P(num('x1', 0), num('y1', 0)),
        b = P(num('x2', 1), num('y2', 0));
      gradObj = {
        type: 'linear',
        base: bf,
        x1: a[0],
        y1: a[1],
        x2: b[0],
        y2: b[1],
        rawStops,
        stops
      };
    }
    const spm = gattr(ge, 'spreadMethod');
    if (gradObj && (spm === 'reflect' || spm === 'repeat')) gradObj.spread = spm;
    if (targetKey === 'stroke') {
      po.stroke = bf;
      po.strokeGrad = gradObj;
    } else {
      po.fill = bf;
      po.grad = gradObj;
    }
    return true;
  };
  /* Parse <style> CSS rules (.class, #id, tag) agar SVG dari Illustrator/Inkscape/Figma/CorelDRAW tampil akurat tanpa artifact hitam */
  const cssRules = new Map();
  svg.querySelectorAll('style').forEach(stEl => {
    const rawCss = (stEl.textContent || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const rRe = /([^{]+)\{([^}]*)\}/g;
    let rm;
    while (rm = rRe.exec(rawCss)) {
      const decls = {};
      rm[2].split(';').forEach(pair => {
        const idx = pair.indexOf(':');
        if (idx > 0) decls[pair.slice(0, idx).trim().toLowerCase()] = pair.slice(idx + 1).trim().replace(/!important/i, '').trim();
      });
      rm[1].split(',').forEach(sel => {
        const s = sel.trim();
        if (!s) return;
        const prev = cssRules.get(s) || {};
        cssRules.set(s, {
          ...prev,
          ...decls
        });
      });
    }
  });
  const prop = (el, k) => {
    const st = el.getAttribute('style');
    if (st) {
      const m = st.match(new RegExp('(?:^|;)\\s*' + k + '\\s*:\\s*([^;]+)', 'i'));
      if (m) return m[1].trim().replace(/!important/i, '').trim();
    }
    if (cssRules.size) {
      const id = el.getAttribute('id');
      if (id && cssRules.has('#' + id) && cssRules.get('#' + id)[k] != null) return cssRules.get('#' + id)[k];
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
      for (let ci = cls.length - 1; ci >= 0; ci--) {
        const cr = cssRules.get('.' + cls[ci]) || cssRules.get(el.tagName + '.' + cls[ci]);
        if (cr && cr[k] != null) return cr[k];
      }
      if (cssRules.has(el.tagName) && cssRules.get(el.tagName)[k] != null) return cssRules.get(el.tagName)[k];
    }
    return el.getAttribute(k);
  };
  /* IM-005: Hitung skala efektif ketebalan stroke pada transformasi non-uniform [a,b,c,d,e,f] */
  const computeEffectiveStrokeScale = (m, subs) => {
    const sx = Math.hypot(m[0], m[1]),
      sy = Math.hypot(m[2], m[3]);
    if (Math.abs(sx - sy) < 1e-4) return sx || 1;
    let wSum = 0,
      lenSum = 0;
    if (subs && subs.length) {
      for (let si = 0; si < subs.length; si++) {
        const ns = subs[si].nodes,
          n = ns.length;
        for (let i = 0; i < (subs[si].closed ? n : n - 1); i++) {
          const a = ns[i],
            b = ns[(i + 1) % n];
          const tx = b.x - a.x,
            ty = b.y - a.y,
            segL = Math.hypot(tx, ty);
          if (segL < 1e-6) continue;
          /* Vektor normal satuan terhadap tangen segmen */
          const nx = -ty / segL,
            ny = tx / segL;
          const nScale = Math.hypot(sx * nx, sy * ny);
          wSum += nScale * segL;
          lenSum += segL;
        }
      }
    }
    if (lenSum > 1e-4) return wSum / lenSum;
    return Math.sqrt((sx * sx + sy * sy) * 0.5) || 1;
  };
  const MAX_SVG_DEPTH = 256;
  const walk = (el, inh, grp, mat, depth = 0, useStack = null) => {
    if (depth > MAX_SVG_DEPTH) {
      noteUnsupported(el.tagName || 'node', el.getAttribute && el.getAttribute('id'), 'max-depth>' + MAX_SVG_DEPTH);
      return;
    }
    const tag = el.tagName;
    if (!tag || ['defs', 'clipPath', 'style', 'title', 'desc', 'metadata', 'symbol'].includes(tag)) return;
    if (tag === 'mask' && el.getAttribute('id')?.startsWith('sa-mask-')) return;
    if (['mask', 'filter', 'pattern', 'marker', 'foreignObject'].includes(tag)) {
      noteUnsupported(tag, el.getAttribute('id'));
      return;
    }
    if (prop(el, 'display') === 'none' || prop(el, 'visibility') === 'hidden') return;
    const cur = {
      ...inh
    };
    ['fill', 'stroke', 'stroke-width', 'fill-rule', 'fill-opacity', 'stroke-opacity', 'stroke-linejoin', 'stroke-linecap', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'color', 'vector-effect', 'clip-path', 'paint-order', 'text-anchor', 'font-family', 'font-size', 'font-weight', 'letter-spacing'].forEach(k => {
      const v = prop(el, k);
      if (v != null && v !== 'inherit') cur[k] = v;
    });
    if (cur.color && /^currentColor$/i.test(cur.color)) cur.color = inh.color || '#18181b';
    const rawOp = prop(el, 'opacity');
    const localOp = rawOp != null && !isNaN(parseFloat(rawOp)) ? Math.max(0, Math.min(1, parseFloat(rawOp))) : 1;
    const isStrokeAlignWrapper = tag === 'g' && Boolean(el.getAttribute('data-geovanta-stroke-align'));
    const isContainerTag = !isStrokeAlignWrapper && (tag === 'g' || tag === 'svg' || tag === 'a' || tag === 'use');
    if (isContainerTag) {
      const gBm = normalizeBlendMode(prop(el, 'mix-blend-mode'));
      if (gBm !== 'normal') {
        noteUnsupported(tag, el.getAttribute('id'), 'mix-blend-mode');
      }
      cur.groupOpacity = (cur.groupOpacity ?? 1) * localOp;
      if (cur.groupOpacity <= 0) return;
    } else {
      cur.opacity = (cur.opacity ?? 1) * localOp;
      if (cur.opacity <= 0 || (cur.groupOpacity ?? 1) <= 0) return;
    }
    const filterAttr = prop(el, 'filter'),
      maskAttr = prop(el, 'mask');
    /* Efek (Task 8): atribut filter DIABAIKAN bila data-effects ada
       (filter itu milik efek kita sendiri) — tanpa noteUnsupported.
       Bila data-effects tidak ada tapi atribut filter ada -> perilaku
       lama (noteUnsupported). */
    if (filterAttr && filterAttr !== 'none' && !el.getAttribute('data-effects')) noteUnsupported('filter', el.getAttribute('id'));
    if (maskAttr && maskAttr !== 'none') {
      const isSaMask = /^url\(\s*['"]?#sa-mask-/.test(maskAttr);
      if (!isSaMask) noteUnsupported('mask', el.getAttribute('id'));
    }
    let m = el.getAttribute('transform') ? mmul(mat, parseTransform(el.getAttribute('transform'), noteWarn)) : mat;
    /* GV-A09 & IM-001: Resolusi <use> ke elemen target / <symbol> / <svg> dengan preserveAspectRatio akurat */
    if (tag === 'use') {
      const refId = gHref(el);
      if (!refId) {
        noteUnsupported('use', el.getAttribute('id'), 'empty-href');
        return;
      }
      const escId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(refId) : refId;
      const target = svg.querySelector('#' + escId);
      if (!target) {
        noteUnsupported('use', refId, 'missing-target');
        return;
      }
      const stack = useStack ? new Set(useStack) : new Set();
      if (stack.has(refId)) {
        noteUnsupported('use', refId, 'cycle');
        return;
      }
      stack.add(refId);
      const ux = parseFloat(el.getAttribute('x')) || 0,
        uy = parseFloat(el.getAttribute('y')) || 0;
      if (ux || uy) m = mmul(m, [1, 0, 0, 1, ux, uy]);
      if (target.tagName === 'symbol' || target.tagName === 'svg') {
        const svb = (target.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
        const uw = parseFloat(el.getAttribute('width')) || parseFloat(target.getAttribute('width')) || (svb.length === 4 ? svb[2] : 0);
        const uh = parseFloat(el.getAttribute('height')) || parseFloat(target.getAttribute('height')) || (svb.length === 4 ? svb[3] : 0);
        let symClipD = null;
        if (svb.length === 4 && svb.every(isFiniteCoord) && svb[2] > 0 && svb[3] > 0 && uw > 0 && uh > 0) {
          const parAttr = target.getAttribute('preserveAspectRatio') || el.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
          const vbt = computeViewBoxTransform(svb, uw, uh, parAttr, 0, 0);
          if (vbt.clip) {
            const cSubs = parsePath(`M0 0L${uw} 0L${uw} ${uh}L0 ${uh}Z`, m, noteWarn);
            if (cSubs.length) symClipD = cSubs.map(sp => serializeSub(sp)).join(' ');
          }
          m = mmul(m, vbt.matrix);
        }
        const nextCur = symClipD ? {
          ...cur,
          _symClipD: symClipD
        } : cur;
        Array.from(target.children).forEach(c => walk(c, nextCur, grp, m, depth + 1, stack));
      } else {
        walk(target, cur, grp, m, depth + 1, stack);
      }
      return;
    }
    if (tag === 'g' && el.getAttribute('data-geovanta-stroke-align')) {
      const align = el.getAttribute('data-geovanta-stroke-align');
      const id = el.getAttribute('id') || 'path-' + ++auto;
      let name = id;
      const base = name;
      let k = 2;
      while (used.has(name)) name = base + '-' + k++;
      used.add(name);

      let swVal = parseFloat(el.getAttribute('data-stroke-width') || '1') || 0;
      const sCap = el.getAttribute('data-stroke-linecap') || 'round';
      const sJoin = el.getAttribute('data-stroke-linejoin') || 'round';
      const sMiter = el.getAttribute('data-stroke-miterlimit') ? parseFloat(el.getAttribute('data-stroke-miterlimit')) : undefined;
      const paintOrder = el.getAttribute('data-paint-order') || undefined;
      const nonScalingStroke = el.getAttribute('data-non-scaling-stroke') === 'true';
      let rawDash = el.getAttribute('data-stroke-dasharray');
      let rawOff = el.getAttribute('data-stroke-dashoffset');
      const rawOp = el.getAttribute('opacity');
      const opacity = rawOp != null && !isNaN(parseFloat(rawOp)) ? Math.max(0, Math.min(1, parseFloat(rawOp))) : (cur.opacity ?? 1);
      const blendMode = normalizeBlendMode(prop(el, 'mix-blend-mode'));
      const effects = readEffects(el);
      const parsedGen = parseGenData(el);
      const styleLinks: any = readStyleLinks(el, styleIds);

      const allPaths: any[] = Array.from(el.getElementsByTagName('path'));
      const fillEl: any = allPaths.find((c: any) => c.getAttribute('data-geovanta-role') === 'fill');
      const strokeEl: any = allPaths.find((c: any) => {
        const r = c.getAttribute('data-geovanta-role');
        return r === 'stroke-outline' || r === 'stroke-dashed' || r === 'stroke-open';
      });

      const fillD = fillEl ? (fillEl.getAttribute('d') || '') : '';
      const subs = parsePath(fillD, m, noteWarn);
      const fillVal = fillEl ? (fillEl.getAttribute('fill') || 'none') : 'none';
      const fillRule = fillEl && fillEl.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero';

      let strokeVal = 'none';
      if (strokeEl) {
        const role = strokeEl.getAttribute('data-geovanta-role');
        if (role === 'stroke-outline') {
          strokeVal = strokeEl.getAttribute('fill') || 'none';
        } else {
          strokeVal = strokeEl.getAttribute('stroke') || 'none';
          if (!rawDash) rawDash = strokeEl.getAttribute('stroke-dasharray');
          if (!rawOff) rawOff = strokeEl.getAttribute('stroke-dashoffset');
        }
      }

      const sc = nonScalingStroke ? 1 : computeEffectiveStrokeScale(m, subs);
      swVal = rd(swVal * sc);
      const parsedDash = parseDasharray(rawDash);
      const finalDash = parsedDash ? parsedDash.map(v => rd(v * sc)) : null;
      const finalOff = rawOff ? rd(parseFloat(rawOff) * sc) : 0;

      const grpOp = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : undefined;
      const inheritedColor = cur.color || '#18181b';

      const po: any = {
        id: el.getAttribute('data-id') || el.getAttribute('id') || uid(),
        name,
        type: 'path',
        fill: fillVal,
        stroke: strokeVal,
        strokeWidth: swVal,
        strokeAlign: align,
        strokeLinecap: sCap,
        strokeLinejoin: sJoin,
        ...(sMiter ? { strokeMiterlimit: sMiter } : {}),
        ...(paintOrder ? { paintOrder } : {}),
        ...(finalDash ? { strokeDasharray: finalDash } : {}),
        ...(finalOff ? { strokeDashoffset: finalOff } : {}),
        ...(nonScalingStroke ? { nonScalingStroke: true } : {}),
        ...(blendMode !== 'normal' ? { blendMode } : {}),
        opacity,
        fillRule,
        ...(effects ? { effects } : {}),
        ...(parsedGen ? { gen: parsedGen } : {}),
        ...(styleLinks.fillStyleId ? { fillStyleId: styleLinks.fillStyleId } : {}),
        ...(styleLinks.strokeStyleId ? { strokeStyleId: styleLinks.strokeStyleId } : {}),
        ...(grpOp != null ? { groupOpacity: grpOp } : {}),
        group: grp,
        subs
      };

      if (/^url\(/.test(po.fill)) {
        attachGrad(po, po.fill, m, 'fill', inheritedColor);
        if (!po.grad) po.fill = '#808080';
      }
      if (/^url\(/.test(po.stroke)) {
        attachGrad(po, po.stroke, m, 'stroke', inheritedColor);
        if (!po.strokeGrad) po.stroke = '#808080';
      }

      objects.push(po);
      return;
    }
    if (tag === 'g' || tag === 'svg' || tag === 'a') {
      const gid = tag === 'g' ? el.getAttribute('id') || grp || (localOp < 1 ? 'grp-' + ++auto : null) : grp;
      if (el.getAttribute('data-container') === 'frame' && gid) frames.add(gid);
      Array.from(el.children).forEach(c => walk(c, cur, gid, m, depth + 1, useStack));
      return;
    }
    if (tag === 'image') {
      const href = el.getAttribute('href') || el.getAttribute('xlink:href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href'),
        iw = parseFloat(el.getAttribute('width')),
        ih = parseFloat(el.getAttribute('height'));
      if (!href || !isSafeImageHref(href) || !(iw > 0) || !(ih > 0)) {
        if (href && !isSafeImageHref(href)) noteWarn('image', el.getAttribute('id'), 'unsafe-href');
        return;
      }
      const io = makeImageObj(href, iw, ih, parseFloat(el.getAttribute('x')) || 0, parseFloat(el.getAttribute('y')) || 0, el.getAttribute('id') || 'image-' + ++auto, el.getAttribute('preserveAspectRatio') || 'xMidYMid meet', m);
      let name = io.name;
      const base = name;
      let k = 2;
      while (used.has(name)) name = base + '-' + k++;
      used.add(name);
      const grpOp = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : undefined;
      const imgFx = readEffects(el);
      const imgBm = normalizeBlendMode(prop(el, 'mix-blend-mode'));
      objects.push({
        ...io,
        id: el.getAttribute('data-id') || el.getAttribute('id') || io.id,
        name,
        opacity: cur.opacity ?? 1,
        ...(imgBm !== 'normal' ? { blendMode: imgBm } : {}),
        ...(grpOp != null ? {
          groupOpacity: grpOp
        } : {}),
        ...(imgFx ? { effects: imgFx } : {}),
        group: grp
      });
      return;
    }
    if (tag === 'tspan') return;
    if (tag === 'text') {
      const tspans = Array.from(el.children || []).filter((c: any) => (c.tagName || '').toLowerCase() === 'tspan');
      const content = tspans.length
        ? tspans.map((ts: any) => ts.textContent || '').join('\n')
        : (el.textContent || '');
      if (!content.trim()) return;
      const rawX = parseFloat(el.getAttribute('x') ?? (tspans[0] as any)?.getAttribute('x') ?? '0') || 0;
      const rawY = parseFloat(el.getAttribute('y') ?? (tspans[0] as any)?.getAttribute('y') ?? '16') || 16;
      const tx = m[0] * rawX + m[2] * rawY + m[4];
      const ty = m[1] * rawX + m[3] * rawY + m[5];
      const mScale = Math.hypot(m[0], m[1]) || 1;
      const rawFs = parseFloat(prop(el, 'font-size') || el.getAttribute('font-size') || '16') || 16;
      const fontSize = Math.max(1, rd(rawFs * mScale));
      const rawFam = (prop(el, 'font-family') || el.getAttribute('font-family') || 'Geovanta Sans')
        .split(',')[0]
        .trim()
        .replace(/^['"]+|['"]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Geovanta Sans';
      const fontWeight = prop(el, 'font-weight') || el.getAttribute('font-weight') || 'normal';
      const fontStyle = prop(el, 'font-style') || el.getAttribute('font-style') || 'normal';
      const textAnchor = prop(el, 'text-anchor') || el.getAttribute('text-anchor') || cur['text-anchor'] || 'start';
      const letterSpacing = parseFloat(prop(el, 'letter-spacing') || el.getAttribute('letter-spacing') || '0') || 0;
      const rawDec = (prop(el, 'text-decoration') || el.getAttribute('text-decoration') || 'none').toLowerCase();
      const textDecoration = rawDec.includes('underline') ? 'underline' : rawDec.includes('line-through') ? 'strikethrough' : 'none';
      let name = el.getAttribute('id') || 'text-' + ++auto;
      const base = name;
      let k = 2;
      while (used.has(name)) name = base + '-' + k++;
      used.add(name);
      const fillVal = cur.fill && cur.fill !== 'none' ? cur.fill : '#111827';
      const grpOp = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : undefined;
      /* Color Styles (Task 2): tautan fill dari data-fill-style; id yang
         tidak ada di doc.styles dibuang oleh readStyleLinks. */
      const textStyleLinks: any = readStyleLinks(el, styleIds);
      const textFx = readEffects(el);
      const textGen = parseGenData(el);
      const textBm = normalizeBlendMode(prop(el, 'mix-blend-mode'));
      objects.push({
        id: el.getAttribute('data-id') || el.getAttribute('id') || uid(),
        name,
        ...(textGen ? { gen: textGen } : {}),
        type: 'text',
        fill: fillVal,
        ...(textBm !== 'normal' ? { blendMode: textBm } : {}),
        ...(textStyleLinks.fillStyleId ? { fillStyleId: textStyleLinks.fillStyleId } : {}),
        ...(textFx ? { effects: textFx } : {}),
        opacity: cur.opacity ?? 1,
        ...(grpOp != null ? {groupOpacity: grpOp} : {}),
        group: grp,
        subs: [],
        text: {
          content,
          x: rd(tx),
          y: rd(ty),
          fontSize,
          fontFamily: rawFam,
          fontWeight,
          fontStyle,
          textAnchor,
          verticalAlign: 'top',
          resizing: 'autoWidth',
          textDecoration,
          textCase: 'original',
          paragraphSpacing: 0,
          fill: fillVal,
          lineHeight: 1.2,
          letterSpacing,
          width: null,
          height: null,
          fontAssetId: null
        }
      });
      return;
    }
    const d = shapeD(el);
    if (d == null) return;
    const subs = parsePath(d, m, noteWarn);
    if (!subs.length) return;
    let name = el.getAttribute('id') || 'path-' + ++auto;
    const base = name;
    let k = 2;
    while (used.has(name)) name = base + '-' + k++;
    used.add(name);
    const nonScalingStroke = cur['vector-effect'] === 'non-scaling-stroke';
    const sc = nonScalingStroke ? 1 : computeEffectiveStrokeScale(m, subs);
    const inheritedColor = cur.color || '#18181b';
    let fillVal = cur.fill || '#000000',
      strokeVal = cur.stroke || 'none';
    if (/^currentColor$/i.test(fillVal)) fillVal = inheritedColor;
    if (/^currentColor$/i.test(strokeVal)) strokeVal = inheritedColor;
    const fOp = cur['fill-opacity'] != null ? parseFloat(cur['fill-opacity']) : 1;
    const sOp = cur['stroke-opacity'] != null ? parseFloat(cur['stroke-opacity']) : 1;
    if (!/^url\(/.test(fillVal) && fillVal !== 'none' && !isNaN(fOp) && fOp < 1 && typeof parseColorWithAlpha === 'function') {
      const pf = parseColorWithAlpha(fillVal);
      fillVal = fOp <= 0 ? 'none' : formatColorWithAlpha(pf.hex, pf.a * fOp);
    }
    if (!/^url\(/.test(strokeVal) && strokeVal !== 'none' && !isNaN(sOp) && sOp < 1 && typeof parseColorWithAlpha === 'function') {
      const ps = parseColorWithAlpha(strokeVal);
      strokeVal = sOp <= 0 ? 'none' : formatColorWithAlpha(ps.hex, ps.a * sOp);
    }
    const swVal = (parseFloat(cur['stroke-width'] ?? '1') || 0) * sc;
    const sJoin = cur['stroke-linejoin'] || 'round',
      sCap = cur['stroke-linecap'] || 'round';
    const sMiter = cur['stroke-miterlimit'] != null && !isNaN(parseFloat(cur['stroke-miterlimit'])) ? parseFloat(cur['stroke-miterlimit']) : undefined;
    const sxDir = Math.hypot(m[0], m[1]),
      syDir = Math.hypot(m[2], m[3]);
    const strokeScaleXY = Math.abs(sxDir - syDir) > 1e-3 ? [rd(sxDir), rd(syDir)] : undefined;
    let clipPathD = cur._symClipD || undefined;
    const clipOrMaskRef = cur['clip-path'] || cur['mask'];
    if (clipOrMaskRef) {
      const cm = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(clipOrMaskRef);
      if (cm && clipDefs.has(cm[1])) {
        const cd = clipDefs.get(cm[1]);
        let clipMat = m;
        if (cd.units === 'objectBoundingBox') {
          const rawSubs = parsePath(d, [1, 0, 0, 1, 0, 0]);
          const lbb = rawSubs.length ? tightBBox({
            subs: rawSubs
          }) : null;
          if (lbb && isFinite(lbb[0]) && lbb[2] >= lbb[0] && lbb[3] >= lbb[1]) {
            const bw = Math.max(1e-6, lbb[2] - lbb[0]),
              bh = Math.max(1e-6, lbb[3] - lbb[1]);
            clipMat = mmul(m, [bw, 0, 0, bh, lbb[0], lbb[1]]);
          }
        }
        const cSubs = bake(cd.subs, clipMat);
        if (cSubs.length) clipPathD = cSubs.map(sp => serializeSub(sp)).join(' ');
      } else if (cm) {
        noteUnsupported('clipPath', cm[1]);
      }
    }
    const grpOp = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : undefined;
    /* Metadata generator (Task 2, diperluas Task 3 untuk weave, Task 5
       untuk arc): data-gen (JSON) dari export dibaca kembali menjadi
       o.gen — divalidasi ketat, nilai tak valid diabaikan. */
    const parsedGen = parseGenData(el);
    const parsedFx = readEffects(el);
    const pathBm = normalizeBlendMode(prop(el, 'mix-blend-mode'));
    const po: any = {
      id: el.getAttribute('data-id') || el.getAttribute('id') || uid(),
      name,
      type: 'path',
      fill: fillVal,
      stroke: strokeVal,
      strokeAlign: 'center',
      ...(pathBm !== 'normal' ? { blendMode: pathBm } : {}),
      ...(readStyleLinks(el, styleIds)),
      ...(parsedFx ? { effects: parsedFx } : {}),
      strokeWidth: swVal,
      strokeLinejoin: sJoin,
      strokeLinecap: sCap,
      ...(cur['paint-order'] ? {
        paintOrder: cur['paint-order']
      } : {}),
      ...(sMiter ? {
        strokeMiterlimit: sMiter
      } : {}),
      ...(nonScalingStroke ? {
        nonScalingStroke: true
      } : {}),
      ...(strokeScaleXY ? {
        strokeScaleXY
      } : {}),
      ...(clipPathD ? {
        clipPathD
      } : {}),
      ...(parsedGen ? {
        gen: parsedGen
      } : {}),
      ...(grpOp != null ? {
        groupOpacity: grpOp
      } : {}),
      opacity: cur.opacity ?? 1,
      fillRule: cur['fill-rule'] === 'evenodd' ? 'evenodd' : 'nonzero',
      group: grp,
      subs
    };
    const rawDash = cur['stroke-dasharray'];
    const pDash = parseDasharray(rawDash);
    if (pDash) {
      po.strokeDasharray = pDash.map(v => rd(v * sc));
    }
    const rawOff = parseFloat(cur['stroke-dashoffset'] || '0');
    if (Number.isFinite(rawOff) && rawOff !== 0) {
      po.strokeDashoffset = rd(rawOff * sc);
    }
    if (/^url\(/.test(po.fill)) {
      attachGrad(po, po.fill, m, 'fill', inheritedColor);
      if (!po.grad) po.fill = '#808080';
    }
    if (/^url\(/.test(po.stroke)) {
      attachGrad(po, po.stroke, m, 'stroke', inheritedColor);
      if (!po.strokeGrad) po.stroke = '#808080';
    }
    /* Abaikan kotak bounding-box transparan tak terlihat (fill=none & stroke=none) yang sering ada pada paket ikon SVG */
    if (po.fill === 'none' && !po.grad && (po.stroke === 'none' || po.strokeWidth <= 0) && !po.strokeGrad && !(grp && (frames.has(grp) || /^Frame-\d+$/.test(grp)))) return;
    objects.push(po);
  };
  const rootInh: Record<string, any> = {
    color: '#18181b'
  };
  ['fill', 'stroke', 'stroke-width', 'fill-rule', 'fill-opacity', 'stroke-opacity', 'stroke-linejoin', 'stroke-linecap', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'color', 'vector-effect', 'clip-path', 'paint-order'].forEach(k => {
    const v = prop(svg, k);
    if (v != null && v !== 'inherit') rootInh[k] = v;
  });
  const rootOp = prop(svg, 'opacity');
  if (rootOp != null && !isNaN(parseFloat(rootOp))) rootInh.groupOpacity = Math.max(0, Math.min(1, parseFloat(rootOp)));
  const rootMat = svg.getAttribute('transform') ? parseTransform(svg.getAttribute('transform'), noteWarn) : [1, 0, 0, 1, 0, 0];
  /* Color Styles (Task 2): baca metadata styles SEBELUM walk, supaya
     tautan per elemen bisa divalidasi terhadap id style yang ada. */
  const docStyles = parseDocStyles(svg);
  const styleIds = new Set(docStyles.map(s => s.id));
  Array.from(svg.children).forEach(c => walk(c, rootInh, null, rootMat, 0, null));
  objects.forEach(o => {
    if (o.group && (frames.has(o.group) || /^Frame-\d+$/.test(o.group))) {
      o.containerType = 'frame';
      if (o.name === o.group + '-bg') {
        o.isAutoFrame = true;
        o.isFrameBg = true;
      }
    }
  });
  const unsupported = badGrad || unsupportedElements.length > 0;
  const unsupportedSummary = unsupportedElements.slice(0, 6).join(', ') + (unsupportedElements.length > 6 ? ' +' + (unsupportedElements.length - 6) + ' lainnya' : '');
  return {
    viewBox: vb,
    objects,
    styles: docStyles,
    unsupported,
    unsupportedElements,
    unsupportedSummary,
    parseWarnings
  };
}

const parseSvgDocument = parseSVG;
export { parseSVG, parseSvgDocument };
export default parseSVG;
