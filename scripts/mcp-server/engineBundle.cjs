var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// scripts/mcp-server/engineBundleEntry.ts
var engineBundleEntry_exports = {};
__export(engineBundleEntry_exports, {
  blobGenerator: () => blobGenerator_exports,
  cornerFilletModule: () => cornerFilletEngine_exports,
  pathBooleanModule: () => pathBoolean_exports,
  svgDocParser: () => svgDocumentParser_exports,
  svgDocSerializer: () => svgDocumentSerializer_exports,
  svgPathParser: () => svgPathParser_exports,
  topologicalSimplifier: () => topologicalCurveSimplifier_exports,
  weaveGenerator: () => weaveGenerator_exports
});
module.exports = __toCommonJS(engineBundleEntry_exports);

// src/engine/svgPathParser.tsx
var svgPathParser_exports = {};
__export(svgPathParser_exports, {
  default: () => svgPathParser_default,
  parsePath: () => parsePath
});

// src/engine/vectorPrimitives.tsx
var uid = () => "n" + Math.random().toString(36).slice(2, 9);
var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var lerp = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t
});
var sub = (a, b) => ({
  x: a.x - b.x,
  y: a.y - b.y
});
var nrm = (a) => {
  const l = Math.hypot(a.x, a.y) || 1;
  return {
    x: a.x / l,
    y: a.y / l
  };
};
var dot = (a, b) => a.x * b.x + a.y * b.y;
var cross = (a, b) => a.x * b.y - a.y * b.x;
var rd = (v) => Math.round(v * 1e4) / 1e4;
var P = (n) => ({
  x: n.x,
  y: n.y
});
var cl = (n) => ({
  ...n,
  handleIn: n.handleIn && {
    ...n.handleIn
  },
  handleOut: n.handleOut && {
    ...n.handleOut
  }
});
var NUM = "[-+]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][-+]?\\d+)?";
var nums = (s) => (s.match(new RegExp(NUM, "g")) || []).map(Number);
var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
var MAX_COORD_ABS = 1e7;
var isFiniteCoord = (v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= MAX_COORD_ABS;
var mmul = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];

// src/engine/arcToBezier.tsx
function arcToCubics(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!rx || !ry || x1 === x2 && y1 === y2) return null;
  const phi = phiDeg * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = c * dx + s * dy, yp = -s * dx + c * dy;
  const lam = xp * xp / (rx * rx) + yp * yp / (ry * ry);
  if (lam > 1) {
    const q = Math.sqrt(lam);
    rx *= q;
    ry *= q;
  }
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  let co = Math.sqrt(Math.max(0, (rx * rx * ry * ry - den) / (den || 1)));
  if (!!fa === !!fs) co = -co;
  const cxp = co * rx * yp / ry, cyp = -co * ry * xp / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const th1 = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx);
  const ux = (xp - cxp) / rx, uy = (yp - cyp) / ry, vx = (-xp - cxp) / rx, vy = (-yp - cyp) / ry;
  let dth = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!fs && dth > 0) dth -= 2 * Math.PI;
  else if (fs && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9)), dl = dth / n, t = 4 / 3 * Math.tan(dl / 4);
  const pt = (a2) => [cx + rx * Math.cos(a2) * c - ry * Math.sin(a2) * s, cy + rx * Math.cos(a2) * s + ry * Math.sin(a2) * c];
  const dv = (a2) => [-rx * Math.sin(a2) * c - ry * Math.cos(a2) * s, -rx * Math.sin(a2) * s + ry * Math.cos(a2) * c];
  const out = [];
  let a = th1;
  for (let i = 0; i < n; i++) {
    const b = a + dl, p0 = pt(a), d0 = dv(a), p1 = i === n - 1 ? [x2, y2] : pt(b), d1 = dv(b);
    out.push([p0[0] + t * d0[0], p0[1] + t * d0[1], p1[0] - t * d1[0], p1[1] - t * d1[1], p1[0], p1[1]]);
    a = b;
  }
  return out;
}
function arcArgs(str, warnCb) {
  const rn = new RegExp("\\s*,?\\s*(" + NUM + ")", "y"), rf = /\s*,?\s*([01])/y;
  let pos = 0;
  const out = [];
  const rdr = (r) => {
    r.lastIndex = pos;
    const m = r.exec(str);
    if (!m) return null;
    pos = r.lastIndex;
    return +m[1];
  };
  for (; ; ) {
    while (pos < str.length && /[\s,]/.test(str[pos])) pos++;
    if (pos >= str.length) break;
    const v = [];
    for (const k of "nnnffnn") {
      const t = rdr(k === "f" ? rf : rn);
      if (t === null || !isFiniteCoord(t)) {
        if (warnCb) warnCb("path", null, "invalid-arc-args");
        return out;
      }
      v.push(t);
    }
    out.push(v);
  }
  return out;
}

// src/engine/transformMatrixParser.tsx
function parseTransform(str, warnCb = null) {
  let m = [1, 0, 0, 1, 0, 0];
  if (!str || !String(str).trim()) return m;
  const raw = String(str).trim();
  const re = /([A-Za-z]+)\s*\(([^)]*)\)/g;
  let r, lastIdx = 0;
  const ops = [];
  while (r = re.exec(raw)) {
    const between = raw.slice(lastIdx, r.index).replace(/[\s,]+/g, "");
    if (between.length > 0) {
      if (warnCb) warnCb("transform", null, "unexpected-token:" + between);
      return [1, 0, 0, 1, 0, 0];
    }
    lastIdx = re.lastIndex;
    const fn = r[1];
    const argBody = r[2].trim();
    const stripped = argBody.replace(new RegExp(NUM, "g"), "").replace(/[\s,]+/g, "");
    if (stripped.length > 0 || !argBody.length) {
      if (warnCb) warnCb("transform", null, "invalid-args:" + fn);
      return [1, 0, 0, 1, 0, 0];
    }
    const a = nums(argBody);
    if (!a.length || !a.every(isFiniteCoord)) {
      if (warnCb) warnCb("transform", null, "non-finite-args:" + fn);
      return [1, 0, 0, 1, 0, 0];
    }
    let t = null;
    if (fn === "translate" && (a.length === 1 || a.length === 2)) {
      t = [1, 0, 0, 1, a[0], a.length === 2 ? a[1] : 0];
    } else if (fn === "scale" && (a.length === 1 || a.length === 2)) {
      t = [a[0], 0, 0, a.length === 2 ? a[1] : a[0], 0, 0];
    } else if (fn === "rotate" && (a.length === 1 || a.length === 3)) {
      const g = a[0] * Math.PI / 180, c = Math.cos(g), s = Math.sin(g);
      t = [c, s, -s, c, 0, 0];
      if (a.length === 3) t = mmul(mmul([1, 0, 0, 1, a[1], a[2]], t), [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (fn === "matrix" && a.length === 6) {
      t = a.slice(0, 6);
    } else if (fn === "skewX" && a.length === 1) {
      const tn = Math.tan(a[0] * Math.PI / 180);
      if (!isFiniteCoord(tn)) {
        if (warnCb) warnCb("transform", null, "singular-skewX");
        return [1, 0, 0, 1, 0, 0];
      }
      t = [1, 0, tn, 1, 0, 0];
    } else if (fn === "skewY" && a.length === 1) {
      const tn = Math.tan(a[0] * Math.PI / 180);
      if (!isFiniteCoord(tn)) {
        if (warnCb) warnCb("transform", null, "singular-skewY");
        return [1, 0, 0, 1, 0, 0];
      }
      t = [1, tn, 0, 1, 0, 0];
    } else {
      if (warnCb) warnCb("transform", null, "invalid-arity-or-fn:" + fn + "(" + a.length + ")");
      return [1, 0, 0, 1, 0, 0];
    }
    ops.push(t);
  }
  const tail = raw.slice(lastIdx).replace(/[\s,]+/g, "");
  if (tail.length > 0 || !ops.length) {
    if (warnCb) warnCb("transform", null, "malformed-transform");
    return [1, 0, 0, 1, 0, 0];
  }
  for (let i = 0; i < ops.length; i++) m = mmul(m, ops[i]);
  if (!m.every(isFiniteCoord)) return [1, 0, 0, 1, 0, 0];
  return m;
}
function computeViewBoxTransform(vb, viewportW, viewportH, parString = "xMidYMid meet", vpX = 0, vpY = 0) {
  const vx = Number(vb && vb[0]) || 0, vy = Number(vb && vb[1]) || 0;
  const vw = Number(vb && vb[2]) || 0, vh = Number(vb && vb[3]) || 0;
  const uw = Number(viewportW) || 0, uh = Number(viewportH) || 0;
  if (!(vw > 0) || !(vh > 0) || !(uw > 0) || !(uh > 0)) {
    return {
      matrix: [1, 0, 0, 1, vpX, vpY],
      sx: 1,
      sy: 1,
      tx: vpX,
      ty: vpY,
      clip: false,
      align: "none",
      meetOrSlice: "meet"
    };
  }
  const rawPar = String(parString || "xMidYMid meet").trim().replace(/^defer\s+/i, "");
  const parts = rawPar.split(/\s+/).filter(Boolean);
  const align = parts[0] || "xMidYMid";
  const meetOrSlice = parts[1] === "slice" ? "slice" : "meet";
  if (align === "none") {
    const sx = uw / vw, sy = uh / vh;
    const tx2 = vpX - vx * sx, ty2 = vpY - vy * sy;
    return {
      matrix: [sx, 0, 0, sy, tx2, ty2],
      sx,
      sy,
      tx: tx2,
      ty: ty2,
      clip: false,
      align: "none",
      meetOrSlice: "meet"
    };
  }
  const scaleX = uw / vw, scaleY = uh / vh;
  const sc = meetOrSlice === "slice" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const drawnW = vw * sc, drawnH = vh * sc;
  let offX = 0, offY = 0;
  if (align.startsWith("xMid")) offX = (uw - drawnW) * 0.5;
  else if (align.startsWith("xMax")) offX = uw - drawnW;
  if (align.endsWith("YMid")) offY = (uh - drawnH) * 0.5;
  else if (align.endsWith("YMax")) offY = uh - drawnH;
  const tx = vpX + offX - vx * sc;
  const ty = vpY + offY - vy * sc;
  return {
    matrix: [sc, 0, 0, sc, tx, ty],
    sx: sc,
    sy: sc,
    tx,
    ty,
    offX,
    offY,
    drawnW,
    drawnH,
    clip: meetOrSlice === "slice" && (drawnW > uw + 1e-5 || drawnH > uh + 1e-5),
    clipRect: [vpX, vpY, uw, uh],
    align,
    meetOrSlice
  };
}
var isId = (m) => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;
var tp = (m, p) => p && {
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5]
};
var bake = (subs, m) => isId(m) ? subs : subs.map((sp) => ({
  ...sp,
  nodes: sp.nodes.map((n) => ({
    ...n,
    ...tp(m, n),
    handleIn: tp(m, n.handleIn),
    handleOut: tp(m, n.handleOut)
  }))
}));

// src/engine/svgPathParser.tsx
function parsePath(d, mat = [1, 0, 0, 1, 0, 0], warnCb = null) {
  const subs = [];
  let cur = null, cx = 0, cy = 0, sx = 0, sy = 0, pc = null, pq = null, prev = "";
  const rawD = String(d || "").trim();
  if (!rawD) return subs;
  const mk = (x, y) => ({
    id: uid(),
    x,
    y,
    type: "corner",
    handleIn: null,
    handleOut: null
  });
  const begin = (x, y) => {
    cur = {
      id: uid(),
      closed: false,
      nodes: [mk(x, y)]
    };
    subs.push(cur);
  };
  const line = (x, y) => {
    if (!cur) begin(cx, cy);
    cur.nodes.push(mk(x, y));
    cx = x;
    cy = y;
  };
  const cubic = (x1, y1, x2, y2, x, y) => {
    if (!cur) begin(cx, cy);
    const L = cur.nodes[cur.nodes.length - 1];
    L.handleOut = x1 === L.x && y1 === L.y ? null : {
      x: x1,
      y: y1
    };
    const n = mk(x, y);
    n.handleIn = x2 === x && y2 === y ? null : {
      x: x2,
      y: y2
    };
    cur.nodes.push(n);
    cx = x;
    cy = y;
    pc = {
      x: x2,
      y: y2
    };
  };
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m, lastEnd = 0;
  while (m = re.exec(rawD)) {
    const gap = rawD.slice(lastEnd, m.index).trim();
    if (gap.length > 0) {
      if (warnCb) warnCb("path", null, "unexpected-command:" + gap.slice(0, 12));
      break;
    }
    lastEnd = re.lastIndex;
    const t = m[1], T = t.toUpperCase(), abs = t === T;
    if (T === "Z") {
      if (m[2] && m[2].trim().length > 0 && warnCb) warnCb("path", null, "unexpected-args-after-Z");
      if (cur) {
        cur.closed = true;
        const f = cur.nodes[0], l = cur.nodes[cur.nodes.length - 1];
        if (cur.nodes.length > 1 && Math.hypot(l.x - f.x, l.y - f.y) < 1e-6 && !l.handleOut && !f.handleIn) {
          if (l.handleIn) f.handleIn = l.handleIn;
          cur.nodes.pop();
        }
      }
      cx = sx;
      cy = sy;
      cur = null;
      pc = pq = null;
      prev = "Z";
      continue;
    }
    const cnt = {
      M: 2,
      L: 2,
      T: 2,
      H: 1,
      V: 1,
      C: 6,
      S: 4,
      Q: 4,
      A: 7
    }[T];
    const argStr = m[2] || "";
    if (T !== "A") {
      const leftover = argStr.replace(new RegExp(NUM, "g"), "").replace(/[\s,]+/g, "");
      if (leftover.length > 0) {
        if (warnCb) warnCb("path", null, "invalid-token-in-" + T + ":" + leftover.slice(0, 12));
        break;
      }
    }
    const a = T === "A" ? arcArgs(argStr, warnCb).flat() : nums(argStr);
    if (a.length === 0 || a.length % cnt !== 0 || !a.every(isFiniteCoord)) {
      if (warnCb) warnCb("path", null, "invalid-arity-or-finite-in-" + T);
      if (!a.every(isFiniteCoord)) break;
    }
    for (let i = 0, first = true; i + cnt <= a.length; i += cnt, first = false) {
      const ox = abs ? 0 : cx, oy = abs ? 0 : cy;
      if (T === "M") {
        const x = a[i] + ox, y = a[i + 1] + oy;
        if (first) {
          begin(x, y);
          sx = x;
          sy = y;
          cx = x;
          cy = y;
        } else line(x, y);
        pc = pq = null;
      } else if (T === "L") line(a[i] + ox, a[i + 1] + oy);
      else if (T === "H") line(a[i] + ox, cy);
      else if (T === "V") line(cx, a[i] + oy);
      else if (T === "C") cubic(a[i] + ox, a[i + 1] + oy, a[i + 2] + ox, a[i + 3] + oy, a[i + 4] + ox, a[i + 5] + oy);
      else if (T === "S") {
        const r = (prev === "C" || prev === "S") && pc ? {
          x: 2 * cx - pc.x,
          y: 2 * cy - pc.y
        } : {
          x: cx,
          y: cy
        };
        cubic(r.x, r.y, a[i] + ox, a[i + 1] + oy, a[i + 2] + ox, a[i + 3] + oy);
      } else if (T === "Q" || T === "T") {
        let qx, qy, x, y;
        if (T === "Q") {
          qx = a[i] + ox;
          qy = a[i + 1] + oy;
          x = a[i + 2] + ox;
          y = a[i + 3] + oy;
        } else {
          const r = (prev === "Q" || prev === "T") && pq ? {
            x: 2 * cx - pq.x,
            y: 2 * cy - pq.y
          } : {
            x: cx,
            y: cy
          };
          qx = r.x;
          qy = r.y;
          x = a[i] + ox;
          y = a[i + 1] + oy;
        }
        cubic(cx + 2 / 3 * (qx - cx), cy + 2 / 3 * (qy - cy), x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x, y);
        pq = {
          x: qx,
          y: qy
        };
      } else if (T === "A") {
        const x = a[i + 5] + ox, y = a[i + 6] + oy;
        if (Math.hypot(x - cx, y - cy) > 1e-9) {
          const segs = arcToCubics(cx, cy, a[i], a[i + 1], a[i + 2], a[i + 3], a[i + 4], x, y);
          if (segs) segs.forEach((s) => cubic(...s));
          else line(x, y);
        }
      }
      prev = T;
    }
    prev = T;
  }
  let out = bake(subs.filter((sp) => sp.nodes.length > 1), mat || [1, 0, 0, 1, 0, 0]);
  out.forEach((sp) => {
    const ns = sp.nodes, n = ns.length;
    ns.forEach((nd, i) => {
      if (nd.handleIn && nd.handleOut) {
        const vi = sub(nd, nd.handleIn), vo = sub(nd.handleOut, nd);
        if (Math.abs(Math.atan2(cross(vi, vo), dot(vi, vo))) < 0.08) nd.type = Math.abs(Math.hypot(vi.x, vi.y) - Math.hypot(vo.x, vo.y)) < 0.5 ? "symmetric" : "smooth";
        else nd.type = "corner";
      } else if (nd.handleIn || nd.handleOut) {
        const pv = sp.closed || i > 0 ? ns[(i - 1 + n) % n] : null;
        const nx = sp.closed || i < n - 1 ? ns[(i + 1) % n] : null;
        const vi = nd.handleIn ? sub(nd, nd.handleIn) : pv ? sub(nd, pv) : null;
        const vo = nd.handleOut ? sub(nd.handleOut, nd) : nx ? sub(nx, nd) : null;
        if (vi && vo && Math.hypot(vi.x, vi.y) > 1e-6 && Math.hypot(vo.x, vo.y) > 1e-6 && Math.abs(Math.atan2(cross(vi, vo), dot(vi, vo))) < 0.08) nd.type = "smooth";
        else nd.type = "corner";
      }
    });
  });
  return out;
}
var svgPathParser_default = parsePath;

// src/engine/svgDocumentParser.tsx
var svgDocumentParser_exports = {};
__export(svgDocumentParser_exports, {
  default: () => svgDocumentParser_default,
  parseSVG: () => parseSVG,
  parseSvgDocument: () => parseSvgDocument
});

// src/engine/svgPathSerializer.tsx
var SUB_D = /* @__PURE__ */ new WeakMap();
var rdCoord = (v) => {
  const r = Math.round(v * 1e7) / 1e7;
  return Object.is(r, -0) ? 0 : r;
};
var pc2 = (p, ox = 0, oy = 0) => rdCoord(p.x - ox) + " " + rdCoord(p.y - oy);
var seg = (a, b, ox = 0, oy = 0) => a.handleOut || b.handleIn ? " C " + pc2(a.handleOut || a, ox, oy) + " " + pc2(b.handleIn || b, ox, oy) + " " + pc2(b, ox, oy) : " L " + pc2(b, ox, oy);
function serializeSub(sp, ox = 0, oy = 0) {
  if (ox === 0 && oy === 0) {
    const c = SUB_D.get(sp);
    if (c !== void 0) return c;
  }
  const ns = sp.nodes;
  if (!ns.length) return "";
  let d = "M " + pc2(ns[0], ox, oy);
  for (let i = 1; i < ns.length; i++) d += seg(ns[i - 1], ns[i], ox, oy);
  if (sp.closed) {
    const a = ns[ns.length - 1], b = ns[0];
    if (a.handleOut || b.handleIn) d += seg(a, b, ox, oy);
    d += " Z";
  }
  if (ox === 0 && oy === 0) SUB_D.set(sp, d);
  return d;
}
var serializePath = (o, ox = 0, oy = 0) => o.subs.map((sp) => serializeSub(sp, ox, oy)).join(" ");
function shapeD(el) {
  const g = (k) => parseFloat(el.getAttribute(k)) || 0, t = el.tagName;
  if (t === "path") return el.getAttribute("d") || "";
  if (t === "rect") {
    const x = g("x"), y = g("y"), w = g("width"), h = g("height");
    let rx = g("rx"), ry = g("ry");
    if (!rx) rx = ry;
    if (!ry) ry = rx;
    rx = Math.min(rx, w / 2);
    ry = Math.min(ry, h / 2);
    if (!rx) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
  }
  if (t === "circle" || t === "ellipse") {
    const cx = g("cx"), cy = g("cy"), rx = t === "circle" ? g("r") : g("rx"), ry = t === "circle" ? g("r") : g("ry");
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
  }
  if (t === "line") return `M${g("x1")} ${g("y1")}L${g("x2")} ${g("y2")}`;
  if (t === "polyline" || t === "polygon") {
    const a = nums(el.getAttribute("points") || "");
    let d = "";
    for (let i = 0; i + 1 < a.length; i += 2) d += (i ? "L" : "M") + a[i] + " " + a[i + 1];
    return d + (t === "polygon" ? "Z" : "");
  }
  return null;
}

// src/utils/colorMath.tsx
var clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// src/utils/colorParserAndFormatter.tsx
var hex3b = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(+v))).toString(16).padStart(2, "0")).join("");
var parseColorWithAlpha = (val) => {
  const s = String(val ?? "").trim();
  if (!s || s.toLowerCase() === "none" || s.toLowerCase() === "transparent") {
    return {
      hex: "#0d99ff",
      a: 0,
      isNone: true
    };
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) return {
    hex: s.toLowerCase(),
    a: 1,
    isNone: false
  };
  if (/^#[0-9a-f]{8}$/i.test(s)) {
    const a = Math.round(parseInt(s.slice(7, 9), 16) / 255 * 100) / 100;
    return {
      hex: s.slice(0, 7).toLowerCase(),
      a: clampN(a, 0, 1),
      isNone: a <= 0
    };
  }
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return {
      hex: "#" + s.slice(1).split("").map((x) => x + x).join("").toLowerCase(),
      a: 1,
      isNone: false
    };
  }
  const m = /rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i.exec(s);
  if (m) {
    const hx = hex3b(m[1], m[2], m[3]);
    const rawA = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    const a = clampN(isNaN(rawA) ? 1 : rawA, 0, 1);
    return {
      hex: hx,
      a,
      isNone: false
    };
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) return {
    hex: s.toLowerCase(),
    a: 1,
    isNone: false
  };
  if (typeof cssToHex === "function" && (typeof validColor !== "function" || validColor(s))) {
    return {
      hex: cssToHex(s),
      a: 1,
      isNone: false
    };
  }
  return {
    hex: "#0d99ff",
    a: 1,
    isNone: false
  };
};
var formatColorWithAlpha = (hex, a) => {
  const cleanHex = (/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#0d99ff").toLowerCase();
  const alpha = clampN(a == null ? 1 : a, 0, 1);
  if (alpha >= 0.999) return cleanHex;
  const r = parseInt(cleanHex.slice(1, 3), 16), g = parseInt(cleanHex.slice(3, 5), 16), b = parseInt(cleanHex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
};
var VCTX = (() => {
  try {
    return document.createElement("canvas").getContext("2d");
  } catch (e) {
    return null;
  }
})();
var HEX_CACHE = /* @__PURE__ */ new Map();
var cssToHex = (c) => {
  if (!c) return "#000000";
  const hit = HEX_CACHE.get(c);
  if (hit) return hit;
  let out = "#000000";
  if (/^#[0-9a-f]{6}$/i.test(c)) out = c.toLowerCase();
  else if (/^#[0-9a-f]{3}$/i.test(c)) out = "#" + c.slice(1).split("").map((x) => x + x).join("").toLowerCase();
  else {
    try {
      VCTX.fillStyle = "#000000";
      VCTX.fillStyle = c;
      const v = String(VCTX.fillStyle);
      if (v[0] === "#") out = v;
      else {
        const m = v.match(/\d+/g);
        if (m) out = "#" + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {
    }
  }
  if (HEX_CACHE.size > 2e3) HEX_CACHE.clear();
  HEX_CACHE.set(c, out);
  return out;
};
var validColor = (s) => s === "none" || window.CSS && CSS.supports("color", s);

// src/engine/colorStyles.tsx
function isStyleHex(v) {
  if (typeof v !== "string") return false;
  if (v.toLowerCase() === "none") return false;
  if (/^#[0-9a-f]{3}$/i.test(v) || /^#[0-9a-f]{6}$/i.test(v)) return true;
  try {
    return !!validColor(v);
  } catch (e) {
    return false;
  }
}
function validateStyles(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.id !== "string" || e.id.length === 0) continue;
    if (typeof e.name !== "string") continue;
    if (!isStyleHex(e.hex)) continue;
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({ id: e.id, name: e.name, hex: cssToHex(e.hex) });
  }
  return out;
}
function parseDocStyles(svgEl) {
  try {
    const md = svgEl && svgEl.querySelector && svgEl.querySelector("metadata#geovanta-doc");
    if (!md) return [];
    const raw = JSON.parse(md.textContent || "");
    return validateStyles(Array.isArray(raw) ? raw : raw && raw.styles);
  } catch (e) {
    return [];
  }
}
function readStyleLinks(el, styleIds) {
  const out = {};
  if (!el || typeof el.getAttribute !== "function") return out;
  const has = (id) => styleIds instanceof Set ? styleIds.has(id) : false;
  const f = el.getAttribute("data-fill-style");
  if (f && has(f)) out.fillStyleId = f;
  const s = el.getAttribute("data-stroke-style");
  if (s && has(s)) out.strokeStyleId = s;
  return out;
}

// src/engine/effectsEngine.tsx
var EFFECT_TYPES = /* @__PURE__ */ new Set([
  "dropShadow",
  "innerShadow",
  "outerGlow",
  "innerGlow",
  "layerBlur",
  "backgroundBlur",
  "noiseGrain"
]);
var clampN2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);
function parseEffectColor(c) {
  if (typeof c !== "string") return null;
  const s = c.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return { hex: "#" + m[1].split("").map((x) => x + x).join("").toLowerCase(), alpha: 1 };
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) return { hex: "#" + m[1].toLowerCase(), alpha: 1 };
  m = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(s);
  if (m) return { hex: "#" + m[1].toLowerCase(), alpha: Math.round(parseInt(m[2], 16) / 255 * 100) / 100 };
  m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    const r = Math.max(0, Math.min(255, +m[1])), g = Math.max(0, Math.min(255, +m[2])), b = Math.max(0, Math.min(255, +m[3]));
    const rawA = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    const hex = "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
    return { hex, alpha: clampN2(Number.isFinite(rawA) ? rawA : 1, 0, 1) };
  }
  return null;
}
function validateOne(e) {
  if (!e || typeof e !== "object" || !EFFECT_TYPES.has(e.type)) return null;
  const disabled = e.disabled === true ? true : e.disabled === false ? false : void 0;
  if (e.type === "dropShadow" || e.type === "innerShadow") {
    if (!isFiniteNum(e.dx) || !isFiniteNum(e.dy) || !isFiniteNum(e.blur) || !isFiniteNum(e.opacity)) return null;
    if (e.blur < 0 || e.opacity < 0 || e.opacity > 1) return null;
    const col = parseEffectColor(e.color);
    if (!col) return null;
    const out2 = {
      type: e.type,
      dx: e.dx,
      dy: e.dy,
      blur: e.blur,
      spread: isFiniteNum(e.spread) ? Math.max(0, e.spread) : 0,
      color: col.hex,
      opacity: clampN2(e.opacity * col.alpha, 0, 1)
    };
    if (disabled !== void 0) out2.disabled = disabled;
    return out2;
  }
  if (e.type === "outerGlow" || e.type === "innerGlow") {
    if (!isFiniteNum(e.blur) || !isFiniteNum(e.opacity) || e.blur < 0 || e.opacity < 0 || e.opacity > 1) return null;
    const col = parseEffectColor(e.color);
    if (!col) return null;
    const out2 = {
      type: e.type,
      blur: e.blur,
      spread: isFiniteNum(e.spread) ? Math.max(0, e.spread) : 0,
      color: col.hex,
      opacity: clampN2(e.opacity * col.alpha, 0, 1)
    };
    if (disabled !== void 0) out2.disabled = disabled;
    return out2;
  }
  if (e.type === "noiseGrain") {
    if (!isFiniteNum(e.amount) || e.amount < 0 || e.amount > 1) return null;
    const out2 = {
      type: "noiseGrain",
      amount: e.amount,
      size: isFiniteNum(e.size) ? clampN2(e.size, 1, 8) : 2
    };
    if (disabled !== void 0) out2.disabled = disabled;
    return out2;
  }
  if (!isFiniteNum(e.radius) || e.radius < 0) return null;
  const out = { type: e.type, radius: e.radius };
  if (disabled !== void 0) out.disabled = disabled;
  return out;
}
function validateEffects(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const norm = validateOne(item);
    if (norm) out.push(norm);
  }
  return out;
}
function defEffects(effects) {
  return validateEffects(effects).filter((e) => !e.disabled && (e.type === "dropShadow" || e.type === "layerBlur"));
}
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
function effectsFilterId(effects, bbox) {
  const defs = defEffects(effects);
  if (!defs.length) return null;
  const region = filterRegion(bbox, effectExtent(defs));
  return "fx-" + fnv1a(JSON.stringify(defs) + (region ? "|" + fmt(region.x) + "," + fmt(region.y) + "," + fmt(region.width) + "," + fmt(region.height) : ""));
}
var fmt = (v) => String(Math.round(v * 1e6) / 1e6);
function effectExtent(defs) {
  let e = 0;
  for (const d of defs) {
    if (d.type === "dropShadow") e = Math.max(e, Math.max(Math.abs(d.dx), Math.abs(d.dy)) + 3 * d.blur);
    else if (d.type === "layerBlur") e = Math.max(e, 3 * d.radius);
  }
  return e;
}
function filterRegion(bbox, extent) {
  if (!bbox) return null;
  const w = bbox[2] - bbox[0], h = bbox[3] - bbox[1];
  if (!(w > 0) || !(h > 0) || !isFinite(w) || !isFinite(h) || !isFinite(extent)) return null;
  const px = extent / w * 100, py = extent / h * 100;
  return { x: -px, y: -py, width: 100 + 2 * px, height: 100 + 2 * py };
}
function effectsFilterDefs(effects, id, bbox) {
  const defs = defEffects(effects);
  if (!defs.length) return "";
  const shadows = defs.filter((e) => e.type === "dropShadow");
  const blurs = defs.filter((e) => e.type === "layerBlur");
  const blurRadius = blurs.length ? Math.max(...blurs.map((e) => e.radius)) : null;
  const region = filterRegion(bbox, effectExtent(defs));
  const open = region ? '<filter id="' + id + '" x="' + fmt(region.x) + '%" y="' + fmt(region.y) + '%" width="' + fmt(region.width) + '%" height="' + fmt(region.height) + '%" color-interpolation-filters="sRGB">' : '<filter id="' + id + '" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">';
  if (shadows.length + (blurs.length ? 1 : 0) === 1) {
    if (shadows.length) {
      const e = shadows[0];
      return open + '<feDropShadow dx="' + fmt(e.dx) + '" dy="' + fmt(e.dy) + '" stdDeviation="' + fmt(e.blur) + '" flood-color="' + e.color + '" flood-opacity="' + fmt(e.opacity) + '"/></filter>';
    }
    return open + '<feGaussianBlur stdDeviation="' + fmt(blurRadius) + '"/></filter>';
  }
  const parts = [];
  const merge = [];
  shadows.forEach((e, i) => {
    parts.push('<feDropShadow in="SourceGraphic" dx="' + fmt(e.dx) + '" dy="' + fmt(e.dy) + '" stdDeviation="' + fmt(e.blur) + '" flood-color="' + e.color + '" flood-opacity="' + fmt(e.opacity) + '" result="fxs' + i + '"/>');
    merge.push('<feMergeNode in="fxs' + i + '"/>');
  });
  if (blurs.length) {
    parts.push('<feGaussianBlur in="SourceGraphic" stdDeviation="' + fmt(blurRadius) + '" result="fxb"/>');
    merge.push('<feMergeNode in="fxb"/>');
  } else {
    merge.push('<feMergeNode in="SourceGraphic"/>');
  }
  parts.push("<feMerge>" + merge.join("") + "</feMerge>");
  return open + parts.join("") + "</filter>";
}

// src/engine/legacyText.tsx
var isLegacyText = (o) => !!o && (o.type === "text" || o.text != null);
function applyTextCase(content, textCase = "original") {
  const s = String(content ?? "");
  if (textCase === "upper") return s.toUpperCase();
  if (textCase === "lower") return s.toLowerCase();
  if (textCase === "title") {
    return s.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return s;
}
function legacyTextSpec(o) {
  if (!isLegacyText(o)) return null;
  const value = o.text && typeof o.text === "object" ? o.text : {};
  const content = typeof o.text === "string" ? o.text : String(value.content ?? value.value ?? value.text ?? o.content ?? "");
  const firstNode = o.subs?.[0]?.nodes?.[0];
  const size = Number(value.fontSize ?? o.fontSize ?? 16);
  const fontSize = Number.isFinite(size) && size > 0 ? Math.min(size, 1e4) : 16;
  const x = Number(value.x ?? o.x ?? firstNode?.x ?? 0);
  const y = Number(value.y ?? o.y ?? firstNode?.y ?? fontSize);
  const letterSpacing = Number(value.letterSpacing ?? o.letterSpacing ?? 0);
  const paragraphSpacing = Number(value.paragraphSpacing ?? o.paragraphSpacing ?? 0);
  const boxWidth = Number(value.width ?? o.width);
  const boxHeight = Number(value.height ?? o.height);
  const width = Number.isFinite(boxWidth) && boxWidth > 0 ? boxWidth : null;
  const height = Number.isFinite(boxHeight) && boxHeight > 0 ? boxHeight : null;
  const rawResizing = value.resizing ?? o.resizing;
  const resizing = ["autoWidth", "autoHeight", "fixed"].includes(rawResizing) ? rawResizing : width && height ? "fixed" : width ? "autoHeight" : "autoWidth";
  const rawVAlign = value.verticalAlign ?? o.verticalAlign;
  const verticalAlign = ["top", "middle", "bottom"].includes(rawVAlign) ? rawVAlign : "top";
  const rawDecoration = value.textDecoration ?? o.textDecoration;
  const textDecoration = ["none", "underline", "strikethrough"].includes(rawDecoration) ? rawDecoration : "none";
  const rawCase = value.textCase ?? o.textCase;
  const textCase = ["original", "upper", "lower", "title"].includes(rawCase) ? rawCase : "original";
  const topFill = typeof o.fill === "string" && o.fill.trim() ? o.fill : null;
  return {
    content,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : fontSize,
    fontSize,
    fontFamily: String(value.fontFamily ?? o.fontFamily ?? "sans-serif").split(",")[0].trim().replace(/^['"]+|['"]+$/g, "").replace(/\s+/g, " ").trim() || "sans-serif",
    fontWeight: String(value.fontWeight ?? o.fontWeight ?? "normal"),
    fontStyle: String(value.fontStyle ?? o.fontStyle ?? "normal"),
    textAnchor: String(value.textAnchor ?? o.textAnchor ?? "start"),
    verticalAlign,
    resizing,
    textDecoration,
    textCase,
    paragraphSpacing: Number.isFinite(paragraphSpacing) && paragraphSpacing >= 0 ? paragraphSpacing : 0,
    fill: String(topFill ?? value.fill ?? value.color ?? "#000000"),
    opacity: Math.max(0, Math.min(1, Number(o.opacity ?? 1) || 0)),
    lineHeight: Math.max(0.5, Math.min(5, Number(value.lineHeight ?? o.lineHeight ?? 1.2) || 1.2)),
    letterSpacing: Number.isFinite(letterSpacing) ? letterSpacing : 0,
    width,
    height,
    // null eksplisit di .text berarti "dibersihkan" (mis. keluarga diganti
    // sebelum embed selesai, atau tombol "Pakai IBM Plex Sans") — jangan
    // jatuh ke nilai top-level yang basi. Hanya bila kuncinya TIDAK ADA
    // (undefined) di .text, pakai top-level (data lama).
    fontAssetId: value.fontAssetId !== void 0 ? value.fontAssetId : o.fontAssetId ?? null,
    // Peta aset per face ({regular, bold, italic, boldItalic} -> assetId) —
    // Google Fonts embed menyimpan 1 aset per face agar semua face bisa
    // dimuat ulang saat proyek dibuka lagi (bukan hanya 1 face).
    // null eksplisit di .text berarti "dibersihkan" (mis. keluarga diganti
    // sebelum embed selesai) — jangan jatuh ke nilai top-level yang basi.
    // Hanya bila kuncinya TIDAK ADA (undefined) di .text, pakai top-level.
    fontAssetIds: value.fontAssetIds !== void 0 ? value.fontAssetIds : o.fontAssetIds ?? null
  };
}
function legacyTextBounds(o) {
  const text = legacyTextSpec(o);
  if (!text || !text.content && !(text.width > 0 && text.height > 0)) return null;
  const display = applyTextCase(text.content, text.textCase);
  const rawLines = display.split(/\r?\n/);
  let width = text.width > 0 ? text.width : 1;
  if (!(text.width > 0)) {
    for (const line of rawLines) {
      width = Math.max(width, textWidthOf(line, text.fontSize, text.letterSpacing));
    }
  }
  const left = text.textAnchor === "middle" ? text.x - width / 2 : text.textAnchor === "end" ? text.x - width : text.x;
  const top = text.y - text.fontSize;
  if (text.resizing === "fixed" && text.height > 0) {
    return [left, top, left + width, top + text.height];
  }
  let visualLines = 0;
  for (const p of rawLines) visualLines += wrapLineCount(p, text.width > 0 ? text.width : 0, text.fontSize, text.letterSpacing);
  const lineSpan = (visualLines - 1) * text.fontSize * text.lineHeight + Math.max(0, rawLines.length - 1) * (text.paragraphSpacing || 0);
  const bottom = text.height > 0 ? top + text.height : text.y + lineSpan + text.fontSize * 0.25;
  return [left, top, left + width, bottom];
}
function charWidthEm(ch) {
  const code = ch.codePointAt(0);
  if (code >= 11904 && code <= 40959 || code >= 63744 && code <= 64255 || code >= 65280 && code <= 65519 || code >= 131072 && code <= 195103 || code >= 127744 && code <= 129791) return 1;
  switch (ch) {
    case " ":
      return 0.3;
    case "i":
    case "l":
    case "j":
    case "t":
    case "f":
    case "I":
    case ".":
    case ",":
    case ":":
    case ";":
    case "'":
    case "!":
    case "|":
    case "(":
    case ")":
    case "[":
    case "]":
      return 0.32;
    case "r":
      return 0.38;
    case "a":
    case "c":
    case "e":
    case "o":
    case "n":
    case "s":
    case "u":
    case "v":
    case "x":
    case "z":
      return 0.56;
    case "b":
    case "d":
    case "g":
    case "h":
    case "k":
    case "p":
    case "q":
    case "y":
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      return 0.58;
    case "m":
    case "w":
      return 0.88;
    case "M":
      return 0.9;
    case "W":
      return 0.96;
    default:
      if (ch >= "A" && ch <= "Z") return 0.7;
      return 0.62;
  }
}
function textWidthOf(str, fontSize, letterSpacing) {
  let w = 0;
  for (const ch of str) w += charWidthEm(ch) * fontSize;
  return w + Math.max(0, str.length - 1) * letterSpacing;
}
function wrapLineCount(paragraph, maxWidth, fontSize, letterSpacing) {
  if (!(maxWidth > 0)) return 1;
  if (paragraph.length === 0) return 1;
  const words = paragraph.split(" ").filter((w) => w.length > 0);
  if (words.length === 0) return 1;
  const spaceW = textWidthOf(" ", fontSize, letterSpacing);
  let lines = 1;
  let cur = 0;
  for (const word of words) {
    let rest = word;
    while (rest.length > 0) {
      const wordW = textWidthOf(rest, fontSize, letterSpacing);
      const need = cur === 0 ? wordW : cur + spaceW + wordW;
      if (need <= maxWidth + 1e-9) {
        cur = need;
        rest = "";
        break;
      }
      if (cur === 0) {
        let take = 0;
        while (take < rest.length && textWidthOf(rest.slice(0, take + 1), fontSize, letterSpacing) <= maxWidth + 1e-9) take++;
        if (take === 0) take = 1;
        cur = textWidthOf(rest.slice(0, take), fontSize, letterSpacing);
        rest = rest.slice(take);
        if (rest.length > 0) {
          lines++;
          cur = 0;
        }
      } else {
        lines++;
        cur = 0;
      }
    }
  }
  return lines;
}

// src/engine/gradientEngine.tsx
var gradOn = (o) => !!(o && o.grad && o.grad.base === o.fill);
var strokeGradOn = (o) => !!(o && o.strokeGrad && o.strokeGrad.base === o.stroke);
var gradXml = (g, id, ox = 0, oy = 0) => {
  const r = (v) => Math.round(v * 1e4) / 1e4, sp = g.spread && g.spread !== "pad" ? ' spreadMethod="' + g.spread + '"' : "";
  const st = g.stops.map((t) => '<stop offset="' + r(t.offset) + '" stop-color="' + esc(t.color) + '"' + (t.op != null && t.op !== 1 ? ' stop-opacity="' + r(t.op) + '"' : "") + "/>").join("");
  if (g.type === "radial" || g.type === "angular") {
    const fx = g.fx != null ? ' fx="' + r(g.fx - ox) + '" fy="' + r(g.fy - oy) + '"' : "";
    return '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + r(g.cx - ox) + '" cy="' + r(g.cy - oy) + '" r="' + r(g.r) + '"' + fx + sp + ">" + st + "</radialGradient>";
  }
  return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + r(g.x1 - ox) + '" y1="' + r(g.y1 - oy) + '" x2="' + r(g.x2 - ox) + '" y2="' + r(g.y2 - oy) + '"' + sp + ">" + st + "</linearGradient>";
};

// src/utils/deviceProfiles.tsx
var DEVICE_PROFILES = {
  "low-mobile": {
    tier: "low-mobile",
    maxDpr: 1.5,
    interactiveDprCap: 1,
    maxBackingPixels: 4e6,
    // 4 MP
    maxExportPixels: 16777216,
    // 16 MP (4096x4096)
    maxExportDimension: 4096,
    maxVerticesPerObject: 16384,
    maxVerticesPerFrame: 12e4,
    maxGeometryCacheBytes: 16 * 1024 * 1024,
    maxImageCachePixels: 12e6,
    maxHistoryBytes: 12 * 1024 * 1024,
    targetPixelError: 0.35
  },
  "mid-mobile": {
    tier: "mid-mobile",
    maxDpr: 2,
    interactiveDprCap: 1.15,
    maxBackingPixels: 8e6,
    // 8 MP
    maxExportPixels: 33554432,
    // 32 MP
    maxExportDimension: 6144,
    maxVerticesPerObject: 32768,
    maxVerticesPerFrame: 25e4,
    maxGeometryCacheBytes: 32 * 1024 * 1024,
    maxImageCachePixels: 24e6,
    maxHistoryBytes: 20 * 1024 * 1024,
    targetPixelError: 0.28
  },
  "android-high": {
    tier: "android-high",
    maxDpr: 2,
    interactiveDprCap: 1.25,
    maxBackingPixels: 6e6,
    // 6 MP
    maxExportPixels: 33554432,
    // 32 MP
    maxExportDimension: 6144,
    maxVerticesPerObject: 32768,
    maxVerticesPerFrame: 22e4,
    maxGeometryCacheBytes: 24 * 1024 * 1024,
    maxImageCachePixels: 2e7,
    maxHistoryBytes: 16 * 1024 * 1024,
    targetPixelError: 0.28
  },
  "desktop": {
    tier: "desktop",
    maxDpr: 2,
    interactiveDprCap: null,
    maxBackingPixels: 16e6,
    // 16 MP
    maxExportPixels: 67108864,
    // 64 MP (8192x8192)
    maxExportDimension: 8192,
    maxVerticesPerObject: 49152,
    maxVerticesPerFrame: 5e5,
    maxGeometryCacheBytes: 48 * 1024 * 1024,
    maxImageCachePixels: 4e7,
    maxHistoryBytes: 32 * 1024 * 1024,
    targetPixelError: 0.25
  },
  "high-memory": {
    tier: "high-memory",
    maxDpr: 2.5,
    interactiveDprCap: null,
    maxBackingPixels: 24e6,
    // 24 MP
    maxExportPixels: 67108864,
    // 64 MP (8192x8192)
    maxExportDimension: 8192,
    maxVerticesPerObject: 65536,
    maxVerticesPerFrame: 8e5,
    maxGeometryCacheBytes: 64 * 1024 * 1024,
    maxImageCachePixels: 64e6,
    maxHistoryBytes: 48 * 1024 * 1024,
    targetPixelError: 0.22
  },
  "battery-saver": {
    tier: "battery-saver",
    maxDpr: 1.25,
    interactiveDprCap: 1,
    maxBackingPixels: 3e6,
    // 3 MP
    maxExportPixels: 16777216,
    // 16 MP
    maxExportDimension: 4096,
    maxVerticesPerObject: 16384,
    maxVerticesPerFrame: 1e5,
    maxGeometryCacheBytes: 16 * 1024 * 1024,
    maxImageCachePixels: 1e7,
    maxHistoryBytes: 12 * 1024 * 1024,
    targetPixelError: 0.4
  }
};
var detectDeviceProfile = (overrideTier = null, envOverride = null) => {
  if (overrideTier && DEVICE_PROFILES[overrideTier]) return { ...DEVICE_PROFILES[overrideTier] };
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const env = envOverride || {};
  const memory = Number(env.deviceMemory ?? nav.deviceMemory) || 4;
  const cores = Number(env.hardwareConcurrency ?? nav.hardwareConcurrency) || 4;
  const maxTouchPoints = Number(env.maxTouchPoints ?? nav.maxTouchPoints) || 0;
  const ua = String(env.userAgent ?? nav.userAgent ?? "");
  const isCapacitorNative = Boolean(
    env.isCapacitorNative ?? (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.())
  );
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isCoarse = Boolean(
    env.isCoarsePointer ?? (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches)
  );
  const isMobileDevice = isCapacitorNative || isMobileUa || maxTouchPoints > 0 && isCoarse;
  let tier = "desktop";
  if (memory <= 2 || cores <= 2) tier = "low-mobile";
  else if (isMobileDevice && (memory <= 4 || cores <= 4)) tier = "mid-mobile";
  else if (isMobileDevice) tier = "android-high";
  return { ...DEVICE_PROFILES[tier] };
};
var ACTIVE_DEVICE_PROFILE = detectDeviceProfile();
if (typeof window !== "undefined") {
  window.__geovantaDeviceProfile = ACTIVE_DEVICE_PROFILE;
}

// src/utils/renderConfigAndTelemetry.tsx
var _initDevProf = typeof ACTIVE_DEVICE_PROFILE !== "undefined" && ACTIVE_DEVICE_PROFILE ? ACTIVE_DEVICE_PROFILE : {
  tier: "mid-tier",
  maxDpr: 2,
  targetPixelError: 0.25,
  maxVerticesPerObject: 32768,
  vramBudgetBytes: 128 * 1024 * 1024
};
var MAX_RENDER_DPR = _initDevProf.maxDpr;
var RENDER_CONFIG = {
  targetPixelError: _initDevProf.targetPixelError || 0.25,
  maxBezierDepth: 16,
  minSegmentLengthPx: 0.01,
  vertexBudgetPerObject: _initDevProf.maxVerticesPerObject || 65536,
  maxRenderDpr: MAX_RENDER_DPR,
  deviceProfileTier: _initDevProf.tier,
  localCoordRebasing: true,
  debugGeometry: false,
  debugMode: "none",
  // 'none' | 'original' | 'polyline' | 'mesh' | 'fill_tris' | 'stroke_tris' | 'seam_guard'
  antialias: false
};
var PERF_TELEMETRY = (() => {
  const MAX_SAMPLES = 120;
  const renderDurations = new Float64Array(MAX_SAMPLES);
  const frameIntervals = new Float64Array(MAX_SAMPLES);
  let rHead = 0, rCount = 0, fHead = 0, fCount = 0, lastRenderTs = 0, droppedFrames = 0;
  let lastInteractionTs = 0, rafProbeActive = false;
  const state = {
    fps: 120,
    nativeHz: 120,
    targetFrameBudgetMs: 8.33,
    uncappedFps: true,
    renderPassMs: 0.4,
    tessellationTimeMs: 0.1,
    lastTessellationMs: 0.1,
    p50: 0.5,
    p95: 1.8,
    p99: 3.2,
    droppedFrames: 0,
    domNodeCount: 0,
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    domPathCount: 0,
    drawCalls: 0,
    snapQueryMs: 0,
    activeBackend: "CanvasKit CPU",
    lodLevel: 0,
    effectiveZoom: 1,
    currentEpsilon: 0.25,
    targetPixelError: 0.25,
    lodSegments: 0,
    totalVertices: 0,
    fillTriangleCount: 0,
    strokeTriangleCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cachedObjectsCount: 0,
    toleranceMet: true,
    maxDepthHitCount: 0,
    budgetHitCount: 0,
    geometryCacheBytes: 0,
    imageDecodedPixels: 0,
    historyBytes: 0,
    autosaveQueueLagMs: 0,
    lastImportParseMs: 0,
    deviceProfileTier: _initDevProf.tier,
    dpr: typeof window !== "undefined" && window.devicePixelRatio || 1,
    drawingBufferWidth: 0,
    drawingBufferHeight: 0
  };
  const recordFrameIntervalSample = (dt) => {
    if (dt >= 0.4 && dt < 120) {
      frameIntervals[fHead] = dt;
      fHead = (fHead + 1) % MAX_SAMPLES;
      if (fCount < MAX_SAMPLES) fCount++;
      if (fCount >= 3 && (fCount < 8 || (fHead & 15) === 0)) {
        const sub2 = Array.from(frameIntervals.subarray(0, fCount)).sort((a, b) => a - b);
        const fastCount = Math.max(1, Math.ceil(sub2.length * 0.45));
        let sum = 0;
        for (let i = 0; i < fastCount; i++) sum += sub2[i];
        const avgDt = sum / fastCount;
        const measuredFps = Math.max(1, Math.min(1e3, Math.round(1e3 / Math.max(0.4, avgDt))));
        state.fps = measuredFps;
        if (measuredFps > state.nativeHz || state.nativeHz === 120) {
          state.nativeHz = measuredFps;
          state.targetFrameBudgetMs = Math.round(1e3 / measuredFps * 100) / 100;
        }
      }
    }
  };
  const probeNativeRefreshRate = (framesToSample = 28) => {
    if (rafProbeActive || typeof requestAnimationFrame !== "function") return;
    rafProbeActive = true;
    let prevTs = 0, rem = framesToSample;
    const step = (ts) => {
      const now = ts || (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
      if (prevTs > 0) recordFrameIntervalSample(now - prevTs);
      prevTs = now;
      if (--rem > 0) requestAnimationFrame(step);
      else rafProbeActive = false;
    };
    requestAnimationFrame(step);
  };
  if (typeof window !== "undefined" && typeof requestAnimationFrame === "function") {
    probeNativeRefreshRate(32);
  }
  const recordRenderPass = (execMs, nowTs = null) => {
    const now = nowTs || (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
    if (execMs >= 0 && execMs < 2e3) {
      state.renderPassMs = Math.round(execMs * 100) / 100;
      renderDurations[rHead] = execMs;
      rHead = (rHead + 1) % MAX_SAMPLES;
      if (rCount < MAX_SAMPLES) rCount++;
      const budgetMs = Math.max(16.67, (state.targetFrameBudgetMs || 8.33) * 2);
      if (execMs > budgetMs) droppedFrames++;
      state.droppedFrames = droppedFrames;
      if (rCount >= 3 && (rCount < 8 || (rHead & 15) === 0)) {
        const arr = Array.from(renderDurations.subarray(0, rCount)).sort((a, b) => a - b);
        const pick = (q) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor((arr.length - 1) * q)))];
        state.p50 = Math.round(pick(0.5) * 100) / 100;
        state.p95 = Math.round(pick(0.95) * 100) / 100;
        state.p99 = Math.round(pick(0.99) * 100) / 100;
      }
    }
    if (lastRenderTs > 0) {
      recordFrameIntervalSample(now - lastRenderTs);
    }
    lastRenderTs = now;
  };
  const recordFrameDelta = (dt) => recordRenderPass(dt);
  const markInteractionFrame = () => {
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    if (lastInteractionTs > 0) {
      const dt = now - lastInteractionTs;
      if (dt >= 0.4 && dt < 60) recordFrameIntervalSample(dt);
    }
    lastInteractionTs = now;
    if (!rafProbeActive) probeNativeRefreshRate(12);
  };
  const updateSceneMetrics = (metrics) => {
    if (!metrics) return;
    if (metrics.totalObjects != null) state.totalObjects = metrics.totalObjects;
    if (metrics.visibleObjects != null) state.visibleObjects = metrics.visibleObjects;
    if (metrics.culledObjects != null) state.culledObjects = metrics.culledObjects;
    if (metrics.domNodeCount != null) state.domNodeCount = metrics.domNodeCount;
    if (metrics.snapQueryMs != null) state.snapQueryMs = Math.round(metrics.snapQueryMs * 100) / 100;
    if (metrics.activeBackend) state.activeBackend = metrics.activeBackend;
    if (metrics.lodLevel != null) state.lodLevel = metrics.lodLevel;
    if (metrics.effectiveZoom != null) state.effectiveZoom = metrics.effectiveZoom;
    if (metrics.currentEpsilon != null) state.currentEpsilon = metrics.currentEpsilon;
    if (metrics.targetPixelError != null) state.targetPixelError = metrics.targetPixelError;
    if (metrics.lodSegments != null) {
      state.lodSegments = metrics.lodSegments;
      state.totalVertices = metrics.lodSegments;
    }
    if (metrics.totalVertices != null) state.totalVertices = metrics.totalVertices;
    if (metrics.fillTriangleCount != null) state.fillTriangleCount = metrics.fillTriangleCount;
    if (metrics.strokeTriangleCount != null) state.strokeTriangleCount = metrics.strokeTriangleCount;
    if (metrics.tessellationTimeMs != null) {
      state.tessellationTimeMs = Math.round(metrics.tessellationTimeMs * 1e3) / 1e3;
      if (metrics.tessellationTimeMs > 0) state.lastTessellationMs = state.tessellationTimeMs;
    }
    if (metrics.cacheHits != null) state.cacheHits = metrics.cacheHits;
    if (metrics.cacheMisses != null) state.cacheMisses = metrics.cacheMisses;
    if (metrics.cachedObjectsCount != null) state.cachedObjectsCount = metrics.cachedObjectsCount;
    if (metrics.toleranceMet != null) state.toleranceMet = metrics.toleranceMet;
    if (metrics.maxDepthHitCount != null) state.maxDepthHitCount = metrics.maxDepthHitCount;
    if (metrics.budgetHitCount != null) state.budgetHitCount = metrics.budgetHitCount;
    if (metrics.dpr != null) state.dpr = Math.round(metrics.dpr * 100) / 100;
    if (metrics.drawingBufferWidth != null) state.drawingBufferWidth = metrics.drawingBufferWidth;
    if (metrics.drawingBufferHeight != null) state.drawingBufferHeight = metrics.drawingBufferHeight;
    if (metrics.domPathCount != null) state.domPathCount = metrics.domPathCount;
    if (metrics.drawCalls != null) state.drawCalls = metrics.drawCalls;
    if (metrics.geometryCacheBytes != null) state.geometryCacheBytes = metrics.geometryCacheBytes;
    if (metrics.imageDecodedPixels != null) state.imageDecodedPixels = metrics.imageDecodedPixels;
    if (metrics.historyBytes != null) state.historyBytes = metrics.historyBytes;
    if (metrics.autosaveQueueLagMs != null) state.autosaveQueueLagMs = metrics.autosaveQueueLagMs;
    if (metrics.lastImportParseMs != null) state.lastImportParseMs = metrics.lastImportParseMs;
    if (metrics.deviceProfileTier != null) state.deviceProfileTier = metrics.deviceProfileTier;
  };
  const getSnapshot = () => ({
    ...state,
    config: {
      ...RENDER_CONFIG
    }
  });
  const getBadgeText = () => `${state.fps} FPS \xB7 p95 ${state.p95.toFixed(2)}ms \xB7 ${state.activeBackend}`;
  return {
    recordRenderPass,
    recordFrameDelta,
    markInteractionFrame,
    updateSceneMetrics,
    getSnapshot,
    getBadgeText,
    state
  };
})();

// src/engine/strokeStyles.tsx
var MAX_DASH_ELEMENTS = 64;
function hasVisibleStroke(o) {
  if (!o) return false;
  const sw = Number(o.strokeWidth ?? 0);
  if (!Number.isFinite(sw) || sw <= 0) return false;
  if (strokeGradOn(o)) return true;
  const s = typeof o.stroke === "string" ? o.stroke.trim().toLowerCase() : o.stroke;
  return Boolean(s && s !== "none" && s !== "transparent");
}
function parseDasharray(raw) {
  if (raw == null) return null;
  let values;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    values = [];
    for (let i = 0; i < raw.length; i++) {
      const v = raw[i];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
      values.push(rd(v));
    }
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.toLowerCase() === "none") return null;
    const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
    if (tokens.length === 0) return null;
    values = [];
    for (let i = 0; i < tokens.length; i++) {
      const n = Number(tokens[i]);
      if (!Number.isFinite(n) || n < 0) return null;
      values.push(rd(n));
    }
  } else {
    return null;
  }
  const capped = values.slice(0, MAX_DASH_ELEMENTS);
  if (!capped.some((v) => v > 0)) return null;
  return capped;
}
function formatDasharray(arr) {
  const parsed = parseDasharray(arr);
  return parsed ? parsed.map((v) => String(v)).join(" ") : "";
}
function buildMarkerSvgDef(id, kind, color, strokeWidth) {
  const s = Math.max(4, strokeWidth * 2.4);
  const w = rd(s * 2);
  const h = rd(s * 2);
  const cy = rd(s);
  let inner = "";
  if (kind === "dot") {
    inner = `<circle cx="${cy}" cy="${cy}" r="${rd(s * 0.45)}" fill="${color}"/>`;
  } else if (kind === "diamond") {
    inner = `<path d="M 0 ${cy} L ${rd(s * 0.8)} ${rd(s * 0.4)} L ${rd(s * 1.6)} ${cy} L ${rd(s * 0.8)} ${rd(s * 1.6)} Z" fill="${color}"/>`;
  } else if (kind === "bar") {
    inner = `<rect x="${rd(s * 0.7)}" y="${rd(s * 0.2)}" width="${rd(s * 0.4)}" height="${rd(s * 1.6)}" fill="${color}"/>`;
  } else if (kind === "stealth") {
    inner = `<path d="M 0 ${rd(s * 0.25)} L ${rd(s * 1.5)} ${cy} L 0 ${rd(s * 1.75)} L ${rd(s * 0.45)} ${cy} Z" fill="${color}"/>`;
  } else {
    inner = `<path d="M 0 ${rd(s * 0.25)} L ${rd(s * 1.5)} ${cy} L 0 ${rd(s * 1.75)} Z" fill="${color}"/>`;
  }
  return `<marker id="${id}" markerWidth="${w}" markerHeight="${h}" refX="${rd(s * 0.8)}" refY="${cy}" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${inner}</marker>`;
}
function effectiveStrokeAlign(o) {
  if (!o) return "center";
  const raw = o.strokeAlign;
  if (raw !== "inside" && raw !== "outside") return "center";
  if (o.type === "text" || o.text || o.img) return "center";
  const subs = Array.isArray(o.subs) ? o.subs : [];
  if (subs.length === 0) return "center";
  const hasClosed = subs.some((sp) => Boolean(sp && sp.closed));
  return hasClosed ? raw : "center";
}
function strokeOutwardExtent(o) {
  if (!hasVisibleStroke(o)) return 0;
  const sw = Number(o.strokeWidth);
  const align = effectiveStrokeAlign(o);
  if (align === "inside") return 0;
  if (align === "outside") return sw;
  return sw * 0.5;
}

// src/engine/imageAndBounds.tsx
function isVisibleFrameBg(o) {
  if (!o) return false;
  if (!o.isFrameBg && !o.isAutoFrame) return true;
  const op = o.opacity ?? 1;
  if (op <= 0) return false;
  const hasFill = Boolean(o.fill && o.fill !== "none" && o.fill !== "transparent");
  const hasGrad = Boolean(gradOn(o));
  const hasStroke = hasVisibleStroke(o);
  const hasFx = Boolean(
    Array.isArray(o.effects) && o.effects.some((e) => e && !e.disabled && e.type !== "backgroundBlur")
  );
  return hasFill || hasGrad || hasStroke || hasFx;
}
function isSafeImageHref(href) {
  if (typeof href !== "string") return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (/^(javascript|vbscript):/i.test(trimmed)) return false;
  if (/^data:/i.test(trimmed)) {
    return /^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp|ico|avif);/i.test(trimmed);
  }
  return true;
}
function makeImageObj(href, w, h, x = 0, y = 0, name = "image", par = "xMidYMid meet", m = [1, 0, 0, 1, 0, 0], naturalW = w, naturalH = h) {
  if (!isSafeImageHref(href)) href = "";
  const d = "M" + x + " " + y + "L" + (x + w) + " " + y + "L" + (x + w) + " " + (y + h) + "L" + x + " " + (y + h) + "Z";
  return {
    id: uid(),
    name: name || "image",
    type: "image",
    fill: "#000000",
    stroke: "none",
    strokeWidth: 0,
    opacity: 1,
    fillRule: "nonzero",
    group: null,
    img: {
      href,
      w,
      h,
      naturalW: naturalW || w,
      naturalH: naturalH || h,
      par: par || "xMidYMid meet"
    },
    subs: parsePath(d, m || [1, 0, 0, 1, 0, 0])
  };
}
function imageMatrix(o) {
  const im = o.img, ns = o.subs[0] && o.subs[0].nodes;
  if (!im || !ns || ns.length < 2) return null;
  if (ns.length === 4 && !ns.some((n) => n.handleIn || n.handleOut)) {
    const p0 = ns[0], p1 = ns[1], p3 = ns[3];
    return [(p1.x - p0.x) / im.w, (p1.y - p0.y) / im.w, (p3.x - p0.x) / im.h, (p3.y - p0.y) / im.h, p0.x, p0.y];
  }
  let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
  ns.forEach((n) => {
    x0 = Math.min(x0, n.x);
    x1 = Math.max(x1, n.x);
    y0 = Math.min(y0, n.y);
    y1 = Math.max(y1, n.y);
  });
  return [(x1 - x0) / im.w, 0, 0, (y1 - y0) / im.h, x0, y0];
}
function objectVisualPad(o, isRaster = false) {
  if (!o) return 0;
  const stroke = hasVisibleStroke(o);
  const miter = o.strokeLinejoin === "miter" ? o.strokeMiterlimit || 4 : o.strokeLinecap === "square" ? Math.SQRT2 : 1;
  const strokePad = stroke ? strokeOutwardExtent(o) * Math.max(1, miter) : 0;
  let shadowPad = 0;
  if (Array.isArray(o.effects)) {
    for (const e of o.effects) {
      if (!e || e.disabled || e.type === "backgroundBlur") continue;
      if (e.type === "dropShadow") {
        const dx = Math.abs(Number(e.dx) || 0);
        const dy = Math.abs(Number(e.dy) || 0);
        const blur = Math.max(0, Number(e.blur) || 0);
        const sp = isRaster ? Math.max(dx, dy) + blur * 3 : Math.max(dx, dy) + Math.ceil(blur * 1.5);
        if (sp > shadowPad) shadowPad = sp;
      }
    }
  }
  let blurMargin = 0;
  if (Array.isArray(o.effects)) {
    for (const e of o.effects) {
      if (!e || e.disabled || e.type === "backgroundBlur") continue;
      if (e.type === "layerBlur") {
        const radius = Math.max(0, Number(e.radius) || 0);
        const bm = isRaster ? Math.ceil(3 * radius) : Math.ceil(1.5 * radius);
        if (bm > blurMargin) blurMargin = bm;
      }
    }
  }
  return strokePad + shadowPad + blurMargin;
}
function docBounds(doc, only = null, options = null) {
  let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
  const isRaster = Boolean(options && options.isRaster);
  const add2 = (x, y, pad) => {
    if (x - pad < x0) x0 = x - pad;
    if (x + pad > x1) x1 = x + pad;
    if (y - pad < y0) y0 = y - pad;
    if (y + pad > y1) y1 = y + pad;
  };
  (doc.objects || []).forEach((o) => {
    if (!o || o.hidden) return;
    if (only && !only.has(o.id)) return;
    if ((o.isFrameBg || o.isAutoFrame) && !isVisibleFrameBg(o)) return;
    const pad = objectVisualPad(o, isRaster);
    const b = isLegacyText(o) ? legacyTextBounds(o) : tightBBox(o);
    if (b && b[0] <= b[2] && b[1] <= b[3]) {
      add2(b[0], b[1], pad);
      add2(b[2], b[3], pad);
    }
  });
  return x0 > x1 ? null : [x0, y0, x1, y1];
}

// src/engine/cornerFilletEngine.tsx
var cornerFilletEngine_exports = {};
__export(cornerFilletEngine_exports, {
  bzSplit: () => bzSplit,
  fillet: () => fillet,
  filletCurveGeo: () => filletCurveGeo,
  filletGeo: () => filletGeo,
  hasFillet: () => hasFillet,
  refillet: () => refillet,
  restoreFillets: () => restoreFillets,
  setCornerRadius: () => setCornerRadius,
  setSelectedNodesRadius: () => setSelectedNodesRadius
});
var MERGE_MAX_TURN_RAD = 1;
function filletGeo(pv, cu, nx, radius, opt) {
  const l1 = dist(pv, cu), l2 = dist(cu, nx);
  if (l1 < 1e-6 || l2 < 1e-6) return null;
  const v1 = nrm(sub(cu, pv)), v2 = nrm(sub(nx, cu)), phi = Math.abs(Math.atan2(cross(v1, v2), dot(v1, v2)));
  if (phi < 0.02 || phi > Math.PI - 0.05) return null;
  const effPhi = opt && opt.bevelDeg ? (180 - Math.max(15, Math.min(165, opt.bevelDeg))) * Math.PI / 180 : phi;
  const tn = Math.tan(effPhi / 2), d = Math.min(radius * tn, l1 * 0.45, l2 * 0.45), r = d / Math.max(1e-4, Math.tan(phi / 2));
  const h = opt && opt.mode === "chamfer" ? 0 : opt && opt.mode === "bezier" ? d * Math.max(0.3, Math.min(1, opt.smooth == null ? 0.8 : opt.smooth)) : 4 / 3 * Math.tan(phi / 4) * r;
  const a = {
    x: cu.x - v1.x * d,
    y: cu.y - v1.y * d
  }, b = {
    x: cu.x + v2.x * d,
    y: cu.y + v2.y * d
  };
  return {
    a,
    b,
    ha: h > 0 ? {
      x: a.x + v1.x * h,
      y: a.y + v1.y * h
    } : null,
    hb: h > 0 ? {
      x: b.x - v2.x * h,
      y: b.y - v2.y * h
    } : null,
    rEff: r,
    clamped: d < radius * tn - 1e-9
  };
}
function bzSplit(p0, c1, c2, p3, t) {
  const L = (a2, b2) => lerp(a2, b2, t), a = L(p0, c1), b = L(c1, c2), c = L(c2, p3), d = L(a, b), e = L(b, c), m = L(d, e);
  return {
    l: [p0, a, d, m],
    r: [m, e, c, p3]
  };
}
function filletCurveGeo(pv, cu, nx, radius, opt) {
  const E = 0.2;
  const hIn = cu.handleIn && dist(cu.handleIn, cu) > E ? cu.handleIn : pv.handleOut && dist(pv.handleOut, pv) > E ? pv.handleOut : pv;
  const hOut = cu.handleOut && dist(cu.handleOut, cu) > E ? cu.handleOut : nx.handleIn && dist(nx.handleIn, nx) > E ? nx.handleIn : nx;
  const v1 = nrm(sub(cu, hIn)), v2 = nrm(sub(hOut, cu)), phi = Math.abs(Math.atan2(cross(v1, v2), dot(v1, v2)));
  if (phi < 0.05 || phi > Math.PI - 0.05) return null;
  const c1 = pv.handleOut || pv, c2 = cu.handleIn || cu, d1 = cu.handleOut || cu, d2 = nx.handleIn || nx;
  const L1 = (dist(pv, c1) + dist(c1, c2) + dist(c2, cu) + dist(pv, cu)) / 2;
  const L2 = (dist(cu, d1) + dist(d1, d2) + dist(d2, nx) + dist(cu, nx)) / 2;
  if (L1 < 1e-6 || L2 < 1e-6) return null;
  const effPhi = opt && opt.bevelDeg ? (180 - Math.max(15, Math.min(165, opt.bevelDeg))) * Math.PI / 180 : phi;
  const tn = Math.tan(effPhi / 2), d = Math.min(radius * tn, L1 * 0.45, L2 * 0.45);
  const sI = bzSplit(pv, c1, c2, cu, 1 - d / L1), sO = bzSplit(cu, d1, d2, nx, d / L2);
  const a = sI.l[3], b = sO.r[0];
  const TA = dist(sI.l[2], a) > 1e-6 ? nrm(sub(a, sI.l[2])) : v1;
  const TB = dist(sO.r[1], b) > 1e-6 ? nrm(sub(sO.r[1], b)) : v2;
  const phiEff = Math.abs(Math.atan2(cross(TA, TB), dot(TA, TB))) || phi;
  const rEff = d / Math.max(1e-4, Math.tan(phiEff / 2));
  const h = opt && opt.mode === "chamfer" ? 0 : opt && opt.mode === "bezier" ? d * Math.max(0.3, Math.min(1, opt.smooth == null ? 0.8 : opt.smooth)) : 4 / 3 * Math.tan(phiEff / 4) * rEff;
  return {
    a,
    b,
    TA,
    TB,
    h,
    sI,
    sO
  };
}
function fillet(o, ids, radius, opt) {
  const idSet = ids instanceof Set ? ids : new Set(ids || []);
  return setSelectedNodesRadius(o, idSet, radius, opt || {
    mode: "circular"
  }).o;
}
function refillet(o, gids, radius, opt) {
  opt = opt || {
    mode: "circular"
  };
  let cnt = 0;
  const subs = o.subs.map((sp) => {
    let nodes = sp.nodes.map(cl), n = nodes.length, ch = false;
    for (let i = 0; i < nodes.length; i++) {
      const A = nodes[i];
      if (!A.fil || A.fil.role !== "a" || gids && !gids.has(A.fil.gid)) continue;
      n = nodes.length;
      const j = (i + 1) % n, B = nodes[j];
      if (!B.fil || B.fil.role !== "b" || B.fil.gid !== A.fil.gid) continue;
      const pv = nodes[(i - 1 + n) % n], nx = nodes[(j + 1) % n];
      if (n < 4 && !sp.closed) continue;
      if (pv === B || nx === A) continue;
      if (A.fil.curved) {
        const pvOrig = {
          ...pv,
          handleOut: A.fil.pvOut ? {
            ...A.fil.pvOut
          } : null
        };
        const nxOrig = {
          ...nx,
          handleIn: A.fil.nxIn ? {
            ...A.fil.nxIn
          } : null
        };
        const cuOrig = A.fil.c;
        const sIn = !pvOrig.handleOut && !cuOrig.handleIn, sOut = !cuOrig.handleOut && !nxOrig.handleIn;
        const cg = filletCurveGeo(pvOrig, cuOrig, nxOrig, radius, opt);
        if (!cg) continue;
        const meta2 = {
          ...A.fil,
          r: radius,
          mode: opt.mode,
          smooth: opt.smooth == null ? 0.8 : opt.smooth,
          bevelDeg: opt.bevelDeg || null
        };
        const nT = opt.mode === "chamfer" ? "corner" : "smooth";
        if (!sIn) pv.handleOut = {
          x: cg.sI.l[1].x,
          y: cg.sI.l[1].y
        };
        if (!sOut) nx.handleIn = {
          x: cg.sO.r[2].x,
          y: cg.sO.r[2].y
        };
        nodes[i] = {
          ...A,
          x: cg.a.x,
          y: cg.a.y,
          handleIn: sIn ? null : {
            x: cg.sI.l[2].x,
            y: cg.sI.l[2].y
          },
          handleOut: cg.h > 0 ? {
            x: cg.a.x + cg.TA.x * cg.h,
            y: cg.a.y + cg.TA.y * cg.h
          } : null,
          type: nT,
          fil: {
            ...meta2,
            role: "a"
          }
        };
        nodes[j] = {
          ...B,
          x: cg.b.x,
          y: cg.b.y,
          handleIn: cg.h > 0 ? {
            x: cg.b.x - cg.TB.x * cg.h,
            y: cg.b.y - cg.TB.y * cg.h
          } : null,
          handleOut: sOut ? null : {
            x: cg.sO.r[1].x,
            y: cg.sO.r[1].y
          },
          type: nT,
          fil: {
            ...meta2,
            role: "b"
          }
        };
        ch = true;
        cnt++;
        continue;
      }
      if (pv.handleOut || nx.handleIn) continue;
      const g = filletGeo(pv, A.fil.c, nx, radius, opt);
      if (!g) continue;
      const meta = {
        gid: A.fil.gid,
        r: radius,
        mode: opt.mode,
        smooth: opt.smooth == null ? 0.8 : opt.smooth,
        bevelDeg: opt.bevelDeg || null,
        c: A.fil.c
      };
      const nT2 = opt.mode === "chamfer" ? "corner" : "smooth";
      nodes[i] = {
        ...A,
        ...g.a,
        handleIn: null,
        handleOut: g.ha,
        type: nT2,
        fil: {
          ...meta,
          role: "a"
        }
      };
      nodes[j] = {
        ...B,
        ...g.b,
        handleIn: g.hb,
        handleOut: null,
        type: nT2,
        fil: {
          ...meta,
          role: "b"
        }
      };
      ch = true;
      cnt++;
    }
    return ch ? {
      ...sp,
      nodes
    } : sp;
  });
  return {
    o: cnt ? {
      ...o,
      subs
    } : o,
    cnt
  };
}
function setSelectedNodesRadius(o, selIds, radius, opt) {
  opt = opt || {
    mode: "circular"
  };
  const newSelIds = /* @__PURE__ */ new Set();
  let cnt = 0;
  const subs = o.subs.map((sp) => {
    let ns = sp.nodes.map(cl), n = ns.length;
    if (n < 3) return sp;
    const pairGids = /* @__PURE__ */ new Set();
    ns.forEach((nd) => {
      if (selIds.has(nd.id) && nd.fil && nd.fil.gid) pairGids.add(nd.fil.gid);
    });
    if (pairGids.size > 0) {
      const pair = (A, B) => A && B && A.fil && B.fil && A.fil.role === "a" && B.fil.role === "b" && A.fil.gid === B.fil.gid && pairGids.has(A.fil.gid);
      const restoreOne = (pv, A, nx) => {
        if (A.fil.curved) {
          if (pv) pv.handleOut = A.fil.pvOut ? {
            ...A.fil.pvOut
          } : null;
          if (nx) nx.handleIn = A.fil.nxIn ? {
            ...A.fil.nxIn
          } : null;
        }
        const cid = uid();
        newSelIds.add(cid);
        return {
          id: cid,
          x: A.fil.c.x,
          y: A.fil.c.y,
          type: "corner",
          handleIn: A.fil.c.handleIn ? {
            ...A.fil.c.handleIn
          } : null,
          handleOut: A.fil.c.handleOut ? {
            ...A.fil.c.handleOut
          } : null
        };
      };
      if (sp.closed && ns.length > 2 && pair(ns[ns.length - 1], ns[0])) {
        const c = restoreOne(ns[ns.length - 2], ns[ns.length - 1], ns[1]);
        ns = ns.slice(1, -1).concat([c]);
        cnt++;
      }
      const out = [];
      for (let i = 0; i < ns.length; i++) {
        if (pair(ns[i], ns[i + 1])) {
          const pv = out.length ? out[out.length - 1] : sp.closed ? ns[ns.length - 1] : null;
          const nx = i + 2 < ns.length ? ns[i + 2] : sp.closed ? out[0] || ns[0] : null;
          out.push(restoreOne(pv, ns[i], nx));
          i++;
          cnt++;
        } else out.push(ns[i]);
      }
      ns = out;
      n = ns.length;
    } else {
      const drop = /* @__PURE__ */ new Set();
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        if (!sp.closed && i === n - 1) continue;
        if (!selIds.has(ns[i].id) || !selIds.has(ns[j].id) || drop.has(i) || drop.has(j) || n - drop.size <= 3) continue;
        const A = ns[i], B = ns[j], pv = ns[(i - 1 + n) % n], nx = ns[(j + 1) % n];
        const uIn = A.handleIn && dist(A.handleIn, A) > 0.05 ? nrm(sub(A, A.handleIn)) : nrm(sub(A, pv));
        const uOut = B.handleOut && dist(B.handleOut, B) > 0.05 ? nrm(sub(B.handleOut, B)) : nrm(sub(nx, B));
        const det = cross(uIn, uOut);
        if (Math.abs(det) > 0.12) {
          const abl = dist(A, B);
          if (abl > 1e-6) {
            const m = nrm(sub(B, A));
            const turnA = Math.abs(Math.atan2(cross(uIn, m), dot(uIn, m)));
            const turnB = Math.abs(Math.atan2(cross(m, uOut), dot(m, uOut)));
            if (turnA >= MERGE_MAX_TURN_RAD || turnB >= MERGE_MAX_TURN_RAD) continue;
          }
          const t = cross(sub(B, A), uOut) / det, pI = {
            x: A.x + uIn.x * t,
            y: A.y + uIn.y * t
          };
          if (dist(pI, lerp(A, B, 0.5)) <= dist(A, B) * 3.5 + 1e-6) {
            A.x = pI.x;
            A.y = pI.y;
            A.handleIn = null;
            A.handleOut = null;
            A.type = "corner";
            A.fil = null;
            newSelIds.add(A.id);
            drop.add(j);
            cnt++;
          }
        }
      }
      if (drop.size) {
        ns = ns.filter((_, i) => !drop.has(i));
        n = ns.length;
      }
    }
    ns.forEach((nd) => {
      if (selIds.has(nd.id)) newSelIds.add(nd.id);
    });
    if (!(radius > 0)) {
      ns.forEach((nd) => {
        if (newSelIds.has(nd.id)) {
          nd.type = "corner";
          nd.fil = null;
          cnt++;
        }
      });
      return {
        ...sp,
        nodes: ns
      };
    }
    const origNs = ns.map(cl);
    const origLen = origNs.length;
    const replacements = /* @__PURE__ */ new Map();
    const pvHandleUpdates = /* @__PURE__ */ new Map();
    const nxHandleUpdates = /* @__PURE__ */ new Map();
    for (let i = 0; i < origLen; i++) {
      const cu = origNs[i];
      if (!newSelIds.has(cu.id)) continue;
      if (origLen < 3 || !sp.closed && (i === 0 || i === origLen - 1)) continue;
      const pvIdx = (i - 1 + origLen) % origLen, nxIdx = (i + 1) % origLen;
      const pv = origNs[pvIdx], nx = origNs[nxIdx];
      const sIn = !pv.handleOut && !cu.handleIn, sOut = !cu.handleOut && !nx.handleIn;
      const gid = uid();
      if (sIn && sOut) {
        const l1 = dist(pv, cu), l2 = dist(cu, nx);
        if (l1 < 1e-6 || l2 < 1e-6) continue;
        const v1 = nrm(sub(cu, pv)), v2 = nrm(sub(nx, cu)), phi = Math.abs(Math.atan2(cross(v1, v2), dot(v1, v2)));
        if (phi < 0.02 || phi > Math.PI - 0.02) continue;
        const effPhi = opt.bevelDeg ? (180 - Math.max(15, Math.min(165, opt.bevelDeg))) * Math.PI / 180 : phi;
        const tn = Math.tan(effPhi / 2);
        const cap1 = newSelIds.has(pv.id) ? l1 * 0.49 : l1 * 0.92;
        const cap2 = newSelIds.has(nx.id) ? l2 * 0.49 : l2 * 0.92;
        const d = Math.min(radius * tn, cap1, cap2);
        const rEff = d / Math.max(1e-4, Math.tan(phi / 2));
        const h2 = opt.mode === "chamfer" ? 0 : opt.mode === "bezier" ? d * Math.max(0.3, Math.min(1, opt.smooth == null ? 0.8 : opt.smooth)) : 4 / 3 * Math.tan(phi / 4) * rEff;
        const a = {
          x: cu.x - v1.x * d,
          y: cu.y - v1.y * d
        }, b = {
          x: cu.x + v2.x * d,
          y: cu.y + v2.y * d
        };
        const meta2 = {
          gid,
          r: Math.round(rEff * 100) / 100,
          reqR: radius,
          mode: opt.mode,
          smooth: opt.smooth == null ? 0.8 : opt.smooth,
          bevelDeg: opt.bevelDeg || null,
          c: {
            x: cu.x,
            y: cu.y
          }
        };
        const nType2 = opt.mode === "chamfer" ? "corner" : "smooth";
        const A2 = {
          id: uid(),
          ...a,
          type: nType2,
          handleIn: null,
          handleOut: h2 > 0 ? {
            x: a.x + v1.x * h2,
            y: a.y + v1.y * h2
          } : null,
          fil: {
            ...meta2,
            role: "a"
          }
        };
        const B2 = {
          id: uid(),
          ...b,
          type: nType2,
          handleIn: h2 > 0 ? {
            x: b.x - v2.x * h2,
            y: b.y - v2.y * h2
          } : null,
          handleOut: null,
          fil: {
            ...meta2,
            role: "b"
          }
        };
        replacements.set(i, [A2, B2]);
        newSelIds.delete(cu.id);
        newSelIds.add(A2.id);
        newSelIds.add(B2.id);
        cnt++;
        continue;
      }
      const cg = filletCurveGeo(pv, cu, nx, radius, opt);
      if (!cg) continue;
      const meta = {
        gid,
        r: radius,
        reqR: radius,
        mode: opt.mode,
        smooth: opt.smooth == null ? 0.8 : opt.smooth,
        bevelDeg: opt.bevelDeg || null,
        c: {
          x: cu.x,
          y: cu.y,
          handleIn: cu.handleIn && {
            ...cu.handleIn
          },
          handleOut: cu.handleOut && {
            ...cu.handleOut
          }
        },
        pvOut: pv.handleOut ? {
          ...pv.handleOut
        } : null,
        nxIn: nx.handleIn ? {
          ...nx.handleIn
        } : null,
        curved: true
      };
      if (!sIn) pvHandleUpdates.set(pvIdx, {
        x: cg.sI.l[1].x,
        y: cg.sI.l[1].y
      });
      if (!sOut) nxHandleUpdates.set(nxIdx, {
        x: cg.sO.r[2].x,
        y: cg.sO.r[2].y
      });
      const h = opt.mode === "chamfer" ? 0 : cg.h;
      const nType = opt.mode === "chamfer" ? "corner" : "smooth";
      const A = {
        id: uid(),
        x: cg.a.x,
        y: cg.a.y,
        type: nType,
        handleIn: sIn ? null : {
          x: cg.sI.l[2].x,
          y: cg.sI.l[2].y
        },
        handleOut: h > 0 ? {
          x: cg.a.x + cg.TA.x * h,
          y: cg.a.y + cg.TA.y * h
        } : null,
        fil: {
          ...meta,
          role: "a"
        }
      };
      const B = {
        id: uid(),
        x: cg.b.x,
        y: cg.b.y,
        type: nType,
        handleIn: h > 0 ? {
          x: cg.b.x - cg.TB.x * h,
          y: cg.b.y - cg.TB.y * h
        } : null,
        handleOut: sOut ? null : {
          x: cg.sO.r[1].x,
          y: cg.sO.r[1].y
        },
        fil: {
          ...meta,
          role: "b"
        }
      };
      replacements.set(i, [A, B]);
      newSelIds.delete(cu.id);
      newSelIds.add(A.id);
      newSelIds.add(B.id);
      cnt++;
    }
    if (replacements.size > 0) {
      const finalNs = [];
      for (let i = 0; i < origLen; i++) {
        const rep = replacements.get(i);
        if (rep) {
          finalNs.push(rep[0], rep[1]);
        } else {
          const nd = {
            ...origNs[i]
          };
          if (pvHandleUpdates.has(i)) nd.handleOut = pvHandleUpdates.get(i);
          if (nxHandleUpdates.has(i)) nd.handleIn = nxHandleUpdates.get(i);
          finalNs.push(nd);
        }
      }
      ns = finalNs;
    }
    return {
      ...sp,
      nodes: ns
    };
  });
  return {
    o: cnt ? {
      ...o,
      subs
    } : o,
    newSelIds,
    cnt
  };
}
var hasFillet = (o) => o.subs.some((sp) => sp.nodes.some((n) => n.fil));
function restoreFillets(o) {
  let ch = false;
  const subs = o.subs.map((sp) => {
    let ns = sp.nodes.map(cl);
    if (!ns.some((n) => n.fil)) return sp;
    const pair = (A, B) => A && B && A.fil && B.fil && A.fil.role === "a" && B.fil.role === "b" && A.fil.gid === B.fil.gid;
    const restorePair = (pv, A, nx) => {
      if (A.fil.curved) {
        if (pv) pv.handleOut = A.fil.pvOut ? {
          ...A.fil.pvOut
        } : null;
        if (nx) nx.handleIn = A.fil.nxIn ? {
          ...A.fil.nxIn
        } : null;
      }
      return {
        id: uid(),
        x: A.fil.c.x,
        y: A.fil.c.y,
        type: "corner",
        handleIn: A.fil.c.handleIn ? {
          ...A.fil.c.handleIn
        } : null,
        handleOut: A.fil.c.handleOut ? {
          ...A.fil.c.handleOut
        } : null
      };
    };
    if (sp.closed && ns.length > 2 && pair(ns[ns.length - 1], ns[0])) {
      const c = restorePair(ns[ns.length - 2], ns[ns.length - 1], ns[1]);
      ns = ns.slice(1, -1).concat([c]);
      ch = true;
    }
    const out = [];
    for (let i = 0; i < ns.length; i++) {
      if (pair(ns[i], ns[i + 1])) {
        const pv = out.length ? out[out.length - 1] : sp.closed ? ns[ns.length - 1] : null;
        const nx = i + 2 < ns.length ? ns[i + 2] : sp.closed ? out[0] || ns[0] : null;
        out.push(restorePair(pv, ns[i], nx));
        i++;
        ch = true;
      } else out.push(ns[i]);
    }
    return {
      ...sp,
      nodes: out
    };
  });
  return ch ? {
    ...o,
    subs
  } : o;
}
function setCornerRadius(o, r, opt) {
  const base = restoreFillets(o);
  if (!(r > 0)) return base;
  const ids = /* @__PURE__ */ new Set();
  base.subs.forEach((sp) => sp.nodes.forEach((n) => {
    if (n.type === "corner") ids.add(n.id);
  }));
  return ids.size ? fillet(base, ids, r, opt || {
    mode: "circular"
  }) : base;
}

// src/engine/affineAndOrientedBox.tsx
function affineTranslate(dx, dy) {
  return [1, 0, 0, 1, dx, dy];
}
function affineRotate(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return [c, s, -s, c, 0, 0];
}
function affineMul(a, b) {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}
function affinePt(a, p) {
  return {
    x: a[0] * p.x + a[2] * p.y + a[4],
    y: a[1] * p.x + a[3] * p.y + a[5]
  };
}
function transformRectBbox(a, r) {
  const p0 = affinePt(a, {
    x: r.x0,
    y: r.y0
  });
  const p1 = affinePt(a, {
    x: r.x1,
    y: r.y0
  });
  const p2 = affinePt(a, {
    x: r.x1,
    y: r.y1
  });
  const p3 = affinePt(a, {
    x: r.x0,
    y: r.y1
  });
  return {
    x0: Math.min(p0.x, p1.x, p2.x, p3.x),
    y0: Math.min(p0.y, p1.y, p2.y, p3.y),
    x1: Math.max(p0.x, p1.x, p2.x, p3.x),
    y1: Math.max(p0.y, p1.y, p2.y, p3.y)
  };
}
function textRotationMatrix(o) {
  const { x, y } = legacyTextSpec(o);
  return affineMul(
    affineTranslate(x, y),
    affineMul(affineRotate(-(o.rot || 0) * Math.PI / 180), affineTranslate(-x, -y))
  );
}
function transformTextBounds(o, bounds, toLocal = null) {
  const world = textRotationMatrix(o);
  const { x0, y0, x1, y1 } = transformRectBbox(
    toLocal ? affineMul(toLocal, world) : world,
    { x0: bounds[0], y0: bounds[1], x1: bounds[2], y1: bounds[3] }
  );
  return [x0, y0, x1, y1];
}
var VC_HANDLES = [{
  idx: 0,
  name: "TopLeft",
  isCorner: true,
  axes: [true, true],
  pos: (r) => ({
    x: r.x0,
    y: r.y0
  })
}, {
  idx: 1,
  name: "Top",
  isCorner: false,
  axes: [false, true],
  pos: (r) => ({
    x: (r.x0 + r.x1) * 0.5,
    y: r.y0
  })
}, {
  idx: 2,
  name: "TopRight",
  isCorner: true,
  axes: [true, true],
  pos: (r) => ({
    x: r.x1,
    y: r.y0
  })
}, {
  idx: 3,
  name: "Right",
  isCorner: false,
  axes: [true, false],
  pos: (r) => ({
    x: r.x1,
    y: (r.y0 + r.y1) * 0.5
  })
}, {
  idx: 4,
  name: "BottomRight",
  isCorner: true,
  axes: [true, true],
  pos: (r) => ({
    x: r.x1,
    y: r.y1
  })
}, {
  idx: 5,
  name: "Bottom",
  isCorner: false,
  axes: [false, true],
  pos: (r) => ({
    x: (r.x0 + r.x1) * 0.5,
    y: r.y1
  })
}, {
  idx: 6,
  name: "BottomLeft",
  isCorner: true,
  axes: [true, true],
  pos: (r) => ({
    x: r.x0,
    y: r.y1
  })
}, {
  idx: 7,
  name: "Left",
  isCorner: false,
  axes: [true, false],
  pos: (r) => ({
    x: r.x0,
    y: (r.y0 + r.y1) * 0.5
  })
}];
VC_HANDLES.forEach((h, i) => {
  h.opposite = () => VC_HANDLES[(i + 4) % 8];
});
var VC_CORNERS = [VC_HANDLES[0], VC_HANDLES[2], VC_HANDLES[4], VC_HANDLES[6]];

// src/engine/spatialIndexAndHitTest.tsx
var TBB = /* @__PURE__ */ new WeakMap();
var TBB_SUBS = /* @__PURE__ */ new WeakMap();
function cubicExtrema1D(p0, p1, p2, p3, outT) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  if (Math.abs(a) < 1e-10) {
    if (Math.abs(b) > 1e-10) {
      const t = -c / b;
      if (t > 1e-7 && t < 1 - 1e-7) outT.push(t);
    }
    return;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  if (t1 > 1e-7 && t1 < 1 - 1e-7) outT.push(t1);
  if (t2 > 1e-7 && t2 < 1 - 1e-7 && Math.abs(t2 - t1) > 1e-7) outT.push(t2);
}
function segAnalyticBBox(a, b) {
  let x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
  let y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  if (!a.handleOut && !b.handleIn) return [x0, y0, x1, y1];
  const p1 = a.handleOut || a, p2 = b.handleIn || b;
  const ts = [];
  cubicExtrema1D(a.x, p1.x, p2.x, b.x, ts);
  cubicExtrema1D(a.y, p1.y, p2.y, b.y, ts);
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i], u = 1 - t, u2 = u * u, t2 = t * t, c0 = u2 * u, c1 = 3 * u2 * t, c2 = 3 * u * t2, c3 = t2 * t;
    const qx = c0 * a.x + c1 * p1.x + c2 * p2.x + c3 * b.x;
    const qy = c0 * a.y + c1 * p1.y + c2 * p2.y + c3 * b.y;
    if (qx < x0) x0 = qx;
    if (qx > x1) x1 = qx;
    if (qy < y0) y0 = qy;
    if (qy > y1) y1 = qy;
  }
  return [x0, y0, x1, y1];
}
function tightBBox(o) {
  if (isLegacyText(o)) {
    const bounds = legacyTextBounds(o) || [0, 0, 0, 0];
    if (!o.rot) return bounds;
    return transformTextBounds(o, bounds);
  }
  let r = TBB.get(o);
  if (r) return r;
  const subs = o && Array.isArray(o.subs) ? o.subs : [];
  if (subs.length === 0) {
    const fallback = [o?.x || 0, o?.y || 0, (o?.x || 0) + (o?.width || 0), (o?.y || 0) + (o?.height || 0)];
    TBB.set(o, fallback);
    return fallback;
  }
  r = TBB_SUBS.get(subs);
  if (r) {
    TBB.set(o, r);
    return r;
  }
  let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
  for (let si = 0, sLen = subs.length; si < sLen; si++) {
    const sp = subs[si], ns = sp.nodes, n = ns.length;
    if (n === 1) {
      const q = ns[0];
      if (q.x < x0) x0 = q.x;
      if (q.x > x1) x1 = q.x;
      if (q.y < y0) y0 = q.y;
      if (q.y > y1) y1 = q.y;
    }
    const lim = sp.closed ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const sb = segAnalyticBBox(ns[i], ns[(i + 1) % n]);
      if (sb[0] < x0) x0 = sb[0];
      if (sb[2] > x1) x1 = sb[2];
      if (sb[1] < y0) y0 = sb[1];
      if (sb[3] > y1) y1 = sb[3];
    }
  }
  r = [x0, y0, x1, y1];
  TBB.set(o, r);
  TBB_SUBS.set(subs, r);
  return r;
}

// src/utils/securityUtils.ts
var MAX_ALLOWED_FILE_SIZE_BYTES = 32 * 1024 * 1024;
function safeJsonParse(text, fallback = null) {
  if (typeof text !== "string" || !text.trim()) return fallback;
  try {
    return JSON.parse(text, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return void 0;
      }
      return value;
    });
  } catch {
    return fallback;
  }
}
function sanitizeSvgString(svg) {
  if (typeof svg !== "string") return "";
  let sanitized = svg;
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/<script\b[^>]*\/>/gi, "");
  sanitized = sanitized.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, "");
  sanitized = sanitized.replace(/<foreignObject\b[^>]*\/>/gi, "");
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "");
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^>]*\/>/gi, "");
  sanitized = sanitized.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  sanitized = sanitized.replace(/(href|xlink:href|src)\s*=\s*["']\s*(?:javascript|vbscript):[^"']*["']/gi, '$1=""');
  return sanitized;
}

// src/engine/blendModes.tsx
var BLEND_MODE_GROUPS = [
  {
    id: "normal",
    label: "Normal",
    modes: [{ key: "normal", label: "Normal" }]
  },
  {
    id: "darken",
    label: "Darken",
    modes: [
      { key: "darken", label: "Darken" },
      { key: "multiply", label: "Multiply" },
      { key: "color-burn", label: "Color Burn" }
    ]
  },
  {
    id: "lighten",
    label: "Lighten",
    modes: [
      { key: "lighten", label: "Lighten" },
      { key: "screen", label: "Screen" },
      { key: "color-dodge", label: "Color Dodge" }
    ]
  },
  {
    id: "contrast",
    label: "Contrast",
    modes: [
      { key: "overlay", label: "Overlay" },
      { key: "soft-light", label: "Soft Light" },
      { key: "hard-light", label: "Hard Light" }
    ]
  },
  {
    id: "inversion",
    label: "Comparative",
    modes: [
      { key: "difference", label: "Difference" },
      { key: "exclusion", label: "Exclusion" }
    ]
  },
  {
    id: "component",
    label: "Color",
    modes: [
      { key: "hue", label: "Hue" },
      { key: "saturation", label: "Saturation" },
      { key: "color", label: "Color" },
      { key: "luminosity", label: "Luminosity" }
    ]
  }
];
var BLEND_MODE_OPTIONS = BLEND_MODE_GROUPS.flatMap(
  (group, index) => {
    const items = group.modes.map((m) => [m.key, m.label]);
    if (index === 0) return items;
    return [
      [`__sep_${group.id}__`, `\u2500\u2500 ${group.label} \u2500\u2500`, null, { disabled: true }],
      ...items
    ];
  }
);
var VALID_BLEND_MODES = new Set(
  BLEND_MODE_GROUPS.flatMap((g) => g.modes.map((m) => m.key))
);
function normalizeBlendMode(raw) {
  if (typeof raw !== "string") return "normal";
  const normalized = raw.trim().toLowerCase();
  return VALID_BLEND_MODES.has(normalized) ? normalized : "normal";
}

// src/engine/svgDocumentParser.tsx
function readEffects(el) {
  const a = el.getAttribute("data-effects");
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
  const genAttr = el.getAttribute("data-gen");
  if (!genAttr) return null;
  try {
    const g = safeJsonParse(genAttr);
    const num = (v) => typeof v === "number" && Number.isFinite(v);
    if (g && typeof g === "object" && g.kind === "blob" && num(g.points) && num(g.irregularity) && num(g.smoothness) && num(g.seed) && num(g.cx) && num(g.cy) && num(g.rx) && num(g.ry)) return {
      kind: "blob",
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
    if (g && typeof g === "object" && g.kind === "weave" && num(g.cols) && num(g.rows) && num(g.amplitude) && num(g.thickness) && num(g.x) && num(g.y) && num(g.w) && num(g.h)) return {
      kind: "weave",
      cols: g.cols,
      rows: g.rows,
      amplitude: g.amplitude,
      thickness: g.thickness,
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      waveType: typeof g.waveType === "string" ? g.waveType : "sine",
      gapSize: num(g.gapSize) ? g.gapSize : 0.5,
      frequency: num(g.frequency) ? g.frequency : 1,
      phase: num(g.phase) ? g.phase : 0
    };
    if (g && typeof g === "object" && g.kind === "arc" && num(g.cx) && num(g.cy) && num(g.r) && num(g.startDeg) && num(g.sweepDeg)) return {
      kind: "arc",
      cx: g.cx,
      cy: g.cy,
      r: g.r,
      startDeg: g.startDeg,
      sweepDeg: g.sweepDeg
    };
    if (g && typeof g === "object" && g.kind === "chart" && typeof g.chartGroupId === "string" && g.config && typeof g.config === "object" && typeof g.config.chartType === "string") return {
      kind: "chart",
      version: num(g.version) ? g.version : 1,
      chartGroupId: g.chartGroupId,
      config: g.config,
      bounds: g.bounds && typeof g.bounds === "object" ? g.bounds : { x: 0, y: 0, w: 600, h: 400 }
    };
    if (g && typeof g === "object" && g.kind === "chart-member" && typeof g.chartGroupId === "string") return {
      kind: "chart-member",
      chartGroupId: g.chartGroupId
    };
  } catch (e) {
  }
  return null;
}
function parseSVG(str) {
  if (typeof str === "string") {
    str = sanitizeSvgString(str);
  }
  const dom = new DOMParser().parseFromString(str, "image/svg+xml"), svg = dom.querySelector("svg");
  if (!svg || dom.querySelector("parsererror")) return {
    viewBox: [0, 0, 100, 100],
    objects: [],
    styles: [],
    unsupported: false,
    unsupportedElements: [],
    unsupportedSummary: "",
    error: true
  };
  const rawVb = (svg.getAttribute("viewBox") || "").trim();
  let vb = rawVb ? rawVb.split(/[\s,]+/).map(Number) : [];
  const fallbackW = Math.min(MAX_COORD_ABS, Math.max(1, Number.isFinite(parseFloat(svg.getAttribute("width"))) && parseFloat(svg.getAttribute("width")) > 0 ? parseFloat(svg.getAttribute("width")) : 100));
  const fallbackH = Math.min(MAX_COORD_ABS, Math.max(1, Number.isFinite(parseFloat(svg.getAttribute("height"))) && parseFloat(svg.getAttribute("height")) > 0 ? parseFloat(svg.getAttribute("height")) : 100));
  const objects = [], used = /* @__PURE__ */ new Set(), frames = /* @__PURE__ */ new Set(), unsupportedElements = [], parseWarnings = [];
  let auto = 0, badGrad = false;
  const noteUnsupported = (tag, id = null, reason = null) => {
    const label = tag + (id ? "#" + id : "") + (reason ? " (" + reason + ")" : "");
    if (unsupportedElements.length < 32 && !unsupportedElements.includes(label)) unsupportedElements.push(label);
  };
  const noteWarn = (tag, id = null, reason = null) => {
    const label = tag + (id ? "#" + id : "") + (reason ? " (" + reason + ")" : "");
    if (parseWarnings.length < 48 && !parseWarnings.includes(label)) parseWarnings.push(label);
  };
  if (vb.length !== 4 || !vb.every(isFiniteCoord) || vb[2] <= 0 || vb[3] <= 0) {
    if (rawVb) noteWarn("viewBox", null, "invalid-viewBox");
    vb = [0, 0, fallbackW, fallbackH];
  }
  const gdefs = /* @__PURE__ */ new Map();
  svg.querySelectorAll("linearGradient,radialGradient").forEach((ge) => {
    const gid = ge.getAttribute("id");
    if (gid) gdefs.set(gid, ge);
  });
  const gHref = (e) => (e.getAttribute("href") || e.getAttribute("xlink:href") || "").replace(/^#/, "");
  const clipDefs = /* @__PURE__ */ new Map();
  const collectClipSubs = (node, mat, depth = 0, useSeen = /* @__PURE__ */ new Set()) => {
    if (!node || depth > 32) return [];
    const localM = node.getAttribute && node.getAttribute("transform") ? mmul(mat, parseTransform(node.getAttribute("transform"), noteWarn)) : mat;
    const tag = node.tagName;
    if (!tag) return [];
    if (tag === "g" || tag === "clipPath") {
      let acc = [];
      Array.from(node.children || []).forEach((ch) => {
        acc = acc.concat(collectClipSubs(ch, localM, depth + 1, useSeen));
      });
      return acc;
    }
    if (tag === "use") {
      const refId = gHref(node);
      if (!refId || useSeen.has(refId)) return [];
      const target = svg.querySelector("#" + (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(refId) : refId));
      if (!target) return [];
      const nextSeen = new Set(useSeen);
      nextSeen.add(refId);
      const ux = parseFloat(node.getAttribute("x")) || 0, uy = parseFloat(node.getAttribute("y")) || 0;
      const uMat = ux || uy ? mmul(localM, [1, 0, 0, 1, ux, uy]) : localM;
      return collectClipSubs(target, uMat, depth + 1, nextSeen);
    }
    const d = shapeD(node);
    if (!d) return [];
    return parsePath(d, localM, noteWarn);
  };
  svg.querySelectorAll("clipPath, mask").forEach((ce) => {
    const cid = ce.getAttribute("id");
    if (!cid) return;
    const cSubs = collectClipSubs(ce, [1, 0, 0, 1, 0, 0], 0, /* @__PURE__ */ new Set());
    if (cSubs.length) {
      clipDefs.set(cid, {
        subs: cSubs,
        d: cSubs.map((sp) => serializeSub(sp)).join(" "),
        units: ce.getAttribute("clipPathUnits") || ce.getAttribute("maskContentUnits") || "userSpaceOnUse"
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
      const st = Array.from(e.children).filter((c) => c.tagName === "stop");
      if (st.length) return st.map((t, idx) => {
        const so = (t.getAttribute("offset") || "0").trim(), st0 = t.getAttribute("style") || "";
        const pm = (k) => {
          const mm = st0.match(new RegExp("(?:^|;)\\s*" + k + "\\s*:\\s*([^;]+)"));
          return mm ? mm[1].trim() : t.getAttribute(k);
        };
        let rawC = (pm("stop-color") || "#000000").trim();
        if (/^currentColor$/i.test(rawC)) rawC = inheritedColor || "#18181b";
        return {
          id: "s" + idx + "_" + uid(),
          offset: Math.max(0, Math.min(1, so.endsWith("%") ? parseFloat(so) / 100 : parseFloat(so) || 0)),
          color: typeof cssToHex === "function" ? cssToHex(rawC) : rawC,
          op: pm("stop-opacity") != null ? parseFloat(pm("stop-opacity")) : 1,
          mid: 0.5
        };
      });
      const hr = gHref(e);
      e = hr ? gdefs.get(hr) : null;
    }
    return [];
  };
  const attachGrad = (po, paintStr, m, targetKey = "fill", inheritedColor = "#18181b") => {
    const mm = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(paintStr || "");
    if (!mm) return false;
    const ge = gdefs.get(mm[1]), stops = ge && gstops(ge, inheritedColor);
    if (!stops || !stops.length) {
      badGrad = true;
      noteUnsupported("gradient", mm[1], "missing-stops");
      return false;
    }
    const rawStops = stops.map((s) => ({
      ...s,
      id: s.id || uid(),
      mid: 0.5
    }));
    const rad = ge.tagName === "radialGradient", obb = (gattr(ge, "gradientUnits") || "objectBoundingBox") !== "userSpaceOnUse", gt = gattr(ge, "gradientTransform"), M = gt ? parseTransform(gt) : [1, 0, 0, 1, 0, 0];
    const tbb = obb ? tightBBox(po) : null, bb = tbb && isFinite(tbb[0]) && tbb[0] <= tbb[2] ? tbb : obb ? docBounds({
      objects: [po]
    }) : null;
    if (obb && !bb) {
      badGrad = true;
      noteUnsupported("gradient", mm[1], "empty-bbox");
      return false;
    }
    const num = (k, def) => {
      const v = gattr(ge, k);
      if (v == null) return def;
      const f = parseFloat(v);
      return isNaN(f) ? def : String(v).trim().endsWith("%") ? f / 100 : f;
    };
    const P2 = (x, y) => {
      let X = M[0] * x + M[2] * y + M[4], Y = M[1] * x + M[3] * y + M[5];
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
    const firstStop = stops.reduce((a, s) => !a || s.offset < a.offset ? s : a, null), base = (firstStop || stops[0]).color, bf = typeof cssToHex === "function" ? cssToHex(base) : base;
    let gradObj = null;
    if (rad) {
      const c = P2(num("cx", 0.5), num("cy", 0.5));
      const k = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) * (bb ? (bb[2] - bb[0] + (bb[3] - bb[1])) / 2 : Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1);
      gradObj = {
        type: "radial",
        base: bf,
        cx: c[0],
        cy: c[1],
        r: Math.max(1e-4, num("r", 0.5) * k),
        rawStops,
        stops
      };
      if (gattr(ge, "fx") != null || gattr(ge, "fy") != null) {
        const fp = P2(num("fx", num("cx", 0.5)), num("fy", num("cy", 0.5)));
        gradObj.fx = fp[0];
        gradObj.fy = fp[1];
      }
    } else {
      const a = P2(num("x1", 0), num("y1", 0)), b = P2(num("x2", 1), num("y2", 0));
      gradObj = {
        type: "linear",
        base: bf,
        x1: a[0],
        y1: a[1],
        x2: b[0],
        y2: b[1],
        rawStops,
        stops
      };
    }
    const spm = gattr(ge, "spreadMethod");
    if (gradObj && (spm === "reflect" || spm === "repeat")) gradObj.spread = spm;
    if (targetKey === "stroke") {
      po.stroke = bf;
      po.strokeGrad = gradObj;
    } else {
      po.fill = bf;
      po.grad = gradObj;
    }
    return true;
  };
  const cssRules = /* @__PURE__ */ new Map();
  svg.querySelectorAll("style").forEach((stEl) => {
    const rawCss = (stEl.textContent || "").replace(/\/\*[\s\S]*?\*\//g, "");
    const rRe = /([^{]+)\{([^}]*)\}/g;
    let rm;
    while (rm = rRe.exec(rawCss)) {
      const decls = {};
      rm[2].split(";").forEach((pair) => {
        const idx = pair.indexOf(":");
        if (idx > 0) decls[pair.slice(0, idx).trim().toLowerCase()] = pair.slice(idx + 1).trim().replace(/!important/i, "").trim();
      });
      rm[1].split(",").forEach((sel) => {
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
    const st = el.getAttribute("style");
    if (st) {
      const m = st.match(new RegExp("(?:^|;)\\s*" + k + "\\s*:\\s*([^;]+)", "i"));
      if (m) return m[1].trim().replace(/!important/i, "").trim();
    }
    if (cssRules.size) {
      const id = el.getAttribute("id");
      if (id && cssRules.has("#" + id) && cssRules.get("#" + id)[k] != null) return cssRules.get("#" + id)[k];
      const cls = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean);
      for (let ci = cls.length - 1; ci >= 0; ci--) {
        const cr = cssRules.get("." + cls[ci]) || cssRules.get(el.tagName + "." + cls[ci]);
        if (cr && cr[k] != null) return cr[k];
      }
      if (cssRules.has(el.tagName) && cssRules.get(el.tagName)[k] != null) return cssRules.get(el.tagName)[k];
    }
    return el.getAttribute(k);
  };
  const computeEffectiveStrokeScale = (m, subs) => {
    const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
    if (Math.abs(sx - sy) < 1e-4) return sx || 1;
    let wSum = 0, lenSum = 0;
    if (subs && subs.length) {
      for (let si = 0; si < subs.length; si++) {
        const ns = subs[si].nodes, n = ns.length;
        for (let i = 0; i < (subs[si].closed ? n : n - 1); i++) {
          const a = ns[i], b = ns[(i + 1) % n];
          const tx = b.x - a.x, ty = b.y - a.y, segL = Math.hypot(tx, ty);
          if (segL < 1e-6) continue;
          const nx = -ty / segL, ny = tx / segL;
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
      noteUnsupported(el.tagName || "node", el.getAttribute && el.getAttribute("id"), "max-depth>" + MAX_SVG_DEPTH);
      return;
    }
    const tag = el.tagName;
    if (!tag || ["defs", "clipPath", "style", "title", "desc", "metadata", "symbol"].includes(tag)) return;
    if (tag === "mask" && el.getAttribute("id")?.startsWith("sa-mask-")) return;
    if (["mask", "filter", "pattern", "marker", "foreignObject"].includes(tag)) {
      noteUnsupported(tag, el.getAttribute("id"));
      return;
    }
    if (prop(el, "display") === "none" || prop(el, "visibility") === "hidden") return;
    const cur = {
      ...inh
    };
    ["fill", "stroke", "stroke-width", "fill-rule", "fill-opacity", "stroke-opacity", "stroke-linejoin", "stroke-linecap", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "color", "vector-effect", "clip-path", "paint-order", "text-anchor", "font-family", "font-size", "font-weight", "letter-spacing"].forEach((k2) => {
      const v = prop(el, k2);
      if (v != null && v !== "inherit") cur[k2] = v;
    });
    if (cur.color && /^currentColor$/i.test(cur.color)) cur.color = inh.color || "#18181b";
    const rawOp = prop(el, "opacity");
    const localOp = rawOp != null && !isNaN(parseFloat(rawOp)) ? Math.max(0, Math.min(1, parseFloat(rawOp))) : 1;
    const isStrokeAlignWrapper = tag === "g" && Boolean(el.getAttribute("data-geovanta-stroke-align"));
    const isContainerTag = !isStrokeAlignWrapper && (tag === "g" || tag === "svg" || tag === "a" || tag === "use");
    if (isContainerTag) {
      const gBm = normalizeBlendMode(prop(el, "mix-blend-mode"));
      if (gBm !== "normal") {
        noteUnsupported(tag, el.getAttribute("id"), "mix-blend-mode");
      }
      cur.groupOpacity = (cur.groupOpacity ?? 1) * localOp;
      if (cur.groupOpacity <= 0) return;
    } else {
      cur.opacity = (cur.opacity ?? 1) * localOp;
      if (cur.opacity <= 0 || (cur.groupOpacity ?? 1) <= 0) return;
    }
    const filterAttr = prop(el, "filter"), maskAttr = prop(el, "mask");
    if (filterAttr && filterAttr !== "none" && !el.getAttribute("data-effects")) noteUnsupported("filter", el.getAttribute("id"));
    if (maskAttr && maskAttr !== "none") {
      const isSaMask = /^url\(\s*['"]?#sa-mask-/.test(maskAttr);
      if (!isSaMask) noteUnsupported("mask", el.getAttribute("id"));
    }
    let m = el.getAttribute("transform") ? mmul(mat, parseTransform(el.getAttribute("transform"), noteWarn)) : mat;
    if (tag === "use") {
      const refId = gHref(el);
      if (!refId) {
        noteUnsupported("use", el.getAttribute("id"), "empty-href");
        return;
      }
      const escId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(refId) : refId;
      const target = svg.querySelector("#" + escId);
      if (!target) {
        noteUnsupported("use", refId, "missing-target");
        return;
      }
      const stack = useStack ? new Set(useStack) : /* @__PURE__ */ new Set();
      if (stack.has(refId)) {
        noteUnsupported("use", refId, "cycle");
        return;
      }
      stack.add(refId);
      const ux = parseFloat(el.getAttribute("x")) || 0, uy = parseFloat(el.getAttribute("y")) || 0;
      if (ux || uy) m = mmul(m, [1, 0, 0, 1, ux, uy]);
      if (target.tagName === "symbol" || target.tagName === "svg") {
        const svb = (target.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
        const uw = parseFloat(el.getAttribute("width")) || parseFloat(target.getAttribute("width")) || (svb.length === 4 ? svb[2] : 0);
        const uh = parseFloat(el.getAttribute("height")) || parseFloat(target.getAttribute("height")) || (svb.length === 4 ? svb[3] : 0);
        let symClipD = null;
        if (svb.length === 4 && svb.every(isFiniteCoord) && svb[2] > 0 && svb[3] > 0 && uw > 0 && uh > 0) {
          const parAttr = target.getAttribute("preserveAspectRatio") || el.getAttribute("preserveAspectRatio") || "xMidYMid meet";
          const vbt = computeViewBoxTransform(svb, uw, uh, parAttr, 0, 0);
          if (vbt.clip) {
            const cSubs = parsePath(`M0 0L${uw} 0L${uw} ${uh}L0 ${uh}Z`, m, noteWarn);
            if (cSubs.length) symClipD = cSubs.map((sp) => serializeSub(sp)).join(" ");
          }
          m = mmul(m, vbt.matrix);
        }
        const nextCur = symClipD ? {
          ...cur,
          _symClipD: symClipD
        } : cur;
        Array.from(target.children).forEach((c) => walk(c, nextCur, grp, m, depth + 1, stack));
      } else {
        walk(target, cur, grp, m, depth + 1, stack);
      }
      return;
    }
    if (tag === "g" && el.getAttribute("data-geovanta-stroke-align")) {
      const align = el.getAttribute("data-geovanta-stroke-align");
      const id = el.getAttribute("id") || "path-" + ++auto;
      let name2 = id;
      const base2 = name2;
      let k2 = 2;
      while (used.has(name2)) name2 = base2 + "-" + k2++;
      used.add(name2);
      let swVal2 = parseFloat(el.getAttribute("data-stroke-width") || "1") || 0;
      const sCap2 = el.getAttribute("data-stroke-linecap") || "round";
      const sJoin2 = el.getAttribute("data-stroke-linejoin") || "round";
      const sMiter2 = el.getAttribute("data-stroke-miterlimit") ? parseFloat(el.getAttribute("data-stroke-miterlimit")) : void 0;
      const paintOrder = el.getAttribute("data-paint-order") || void 0;
      const nonScalingStroke2 = el.getAttribute("data-non-scaling-stroke") === "true";
      let rawDash2 = el.getAttribute("data-stroke-dasharray");
      let rawOff2 = el.getAttribute("data-stroke-dashoffset");
      const rawOp2 = el.getAttribute("opacity");
      const opacity = rawOp2 != null && !isNaN(parseFloat(rawOp2)) ? Math.max(0, Math.min(1, parseFloat(rawOp2))) : cur.opacity ?? 1;
      const blendMode = normalizeBlendMode(prop(el, "mix-blend-mode"));
      const effects = readEffects(el);
      const parsedGen2 = parseGenData(el);
      const styleLinks = readStyleLinks(el, styleIds);
      const allPaths = Array.from(el.getElementsByTagName("path"));
      const fillEl = allPaths.find((c) => c.getAttribute("data-geovanta-role") === "fill");
      const strokeEl = allPaths.find((c) => {
        const r = c.getAttribute("data-geovanta-role");
        return r === "stroke-outline" || r === "stroke-dashed" || r === "stroke-open";
      });
      const fillD = fillEl ? fillEl.getAttribute("d") || "" : "";
      const subs2 = parsePath(fillD, m, noteWarn);
      const fillVal2 = fillEl ? fillEl.getAttribute("fill") || "none" : "none";
      const fillRule = fillEl && fillEl.getAttribute("fill-rule") === "evenodd" ? "evenodd" : "nonzero";
      let strokeVal2 = "none";
      if (strokeEl) {
        const role = strokeEl.getAttribute("data-geovanta-role");
        if (role === "stroke-outline") {
          strokeVal2 = strokeEl.getAttribute("fill") || "none";
        } else {
          strokeVal2 = strokeEl.getAttribute("stroke") || "none";
          if (!rawDash2) rawDash2 = strokeEl.getAttribute("stroke-dasharray");
          if (!rawOff2) rawOff2 = strokeEl.getAttribute("stroke-dashoffset");
        }
      }
      const sc2 = nonScalingStroke2 ? 1 : computeEffectiveStrokeScale(m, subs2);
      swVal2 = rd(swVal2 * sc2);
      const parsedDash = parseDasharray(rawDash2);
      const finalDash = parsedDash ? parsedDash.map((v) => rd(v * sc2)) : null;
      const finalOff = rawOff2 ? rd(parseFloat(rawOff2) * sc2) : 0;
      const grpOp2 = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : void 0;
      const inheritedColor2 = cur.color || "#18181b";
      const po2 = {
        id: el.getAttribute("data-id") || el.getAttribute("id") || uid(),
        name: name2,
        type: "path",
        fill: fillVal2,
        stroke: strokeVal2,
        strokeWidth: swVal2,
        strokeAlign: align,
        strokeLinecap: sCap2,
        strokeLinejoin: sJoin2,
        ...sMiter2 ? { strokeMiterlimit: sMiter2 } : {},
        ...paintOrder ? { paintOrder } : {},
        ...finalDash ? { strokeDasharray: finalDash } : {},
        ...finalOff ? { strokeDashoffset: finalOff } : {},
        ...nonScalingStroke2 ? { nonScalingStroke: true } : {},
        ...blendMode !== "normal" ? { blendMode } : {},
        opacity,
        fillRule,
        ...effects ? { effects } : {},
        ...parsedGen2 ? { gen: parsedGen2 } : {},
        ...styleLinks.fillStyleId ? { fillStyleId: styleLinks.fillStyleId } : {},
        ...styleLinks.strokeStyleId ? { strokeStyleId: styleLinks.strokeStyleId } : {},
        ...grpOp2 != null ? { groupOpacity: grpOp2 } : {},
        group: grp,
        subs: subs2
      };
      if (/^url\(/.test(po2.fill)) {
        attachGrad(po2, po2.fill, m, "fill", inheritedColor2);
        if (!po2.grad) po2.fill = "#808080";
      }
      if (/^url\(/.test(po2.stroke)) {
        attachGrad(po2, po2.stroke, m, "stroke", inheritedColor2);
        if (!po2.strokeGrad) po2.stroke = "#808080";
      }
      objects.push(po2);
      return;
    }
    if (tag === "g" || tag === "svg" || tag === "a") {
      const gid = tag === "g" ? el.getAttribute("id") || grp || (localOp < 1 ? "grp-" + ++auto : null) : grp;
      if (el.getAttribute("data-container") === "frame" && gid) frames.add(gid);
      Array.from(el.children).forEach((c) => walk(c, cur, gid, m, depth + 1, useStack));
      return;
    }
    if (tag === "image") {
      const href = el.getAttribute("href") || el.getAttribute("xlink:href") || el.getAttributeNS("http://www.w3.org/1999/xlink", "href"), iw = parseFloat(el.getAttribute("width")), ih = parseFloat(el.getAttribute("height"));
      if (!href || !isSafeImageHref(href) || !(iw > 0) || !(ih > 0)) {
        if (href && !isSafeImageHref(href)) noteWarn("image", el.getAttribute("id"), "unsafe-href");
        return;
      }
      const io = makeImageObj(href, iw, ih, parseFloat(el.getAttribute("x")) || 0, parseFloat(el.getAttribute("y")) || 0, el.getAttribute("id") || "image-" + ++auto, el.getAttribute("preserveAspectRatio") || "xMidYMid meet", m);
      let name2 = io.name;
      const base2 = name2;
      let k2 = 2;
      while (used.has(name2)) name2 = base2 + "-" + k2++;
      used.add(name2);
      const grpOp2 = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : void 0;
      const imgFx = readEffects(el);
      const imgBm = normalizeBlendMode(prop(el, "mix-blend-mode"));
      objects.push({
        ...io,
        id: el.getAttribute("data-id") || el.getAttribute("id") || io.id,
        name: name2,
        opacity: cur.opacity ?? 1,
        ...imgBm !== "normal" ? { blendMode: imgBm } : {},
        ...grpOp2 != null ? {
          groupOpacity: grpOp2
        } : {},
        ...imgFx ? { effects: imgFx } : {},
        group: grp
      });
      return;
    }
    if (tag === "tspan") return;
    if (tag === "text") {
      const tspans = Array.from(el.children || []).filter((c) => (c.tagName || "").toLowerCase() === "tspan");
      const content = tspans.length ? tspans.map((ts) => ts.textContent || "").join("\n") : el.textContent || "";
      if (!content.trim()) return;
      const rawX = parseFloat(el.getAttribute("x") ?? tspans[0]?.getAttribute("x") ?? "0") || 0;
      const rawY = parseFloat(el.getAttribute("y") ?? tspans[0]?.getAttribute("y") ?? "16") || 16;
      const tx = m[0] * rawX + m[2] * rawY + m[4];
      const ty = m[1] * rawX + m[3] * rawY + m[5];
      const mScale = Math.hypot(m[0], m[1]) || 1;
      const rawFs = parseFloat(prop(el, "font-size") || el.getAttribute("font-size") || "16") || 16;
      const fontSize = Math.max(1, rd(rawFs * mScale));
      const rawFam = (prop(el, "font-family") || el.getAttribute("font-family") || "Geovanta Sans").split(",")[0].trim().replace(/^['"]+|['"]+$/g, "").replace(/\s+/g, " ").trim() || "Geovanta Sans";
      const fontWeight = prop(el, "font-weight") || el.getAttribute("font-weight") || "normal";
      const fontStyle = prop(el, "font-style") || el.getAttribute("font-style") || "normal";
      const textAnchor = prop(el, "text-anchor") || el.getAttribute("text-anchor") || cur["text-anchor"] || "start";
      const letterSpacing = parseFloat(prop(el, "letter-spacing") || el.getAttribute("letter-spacing") || "0") || 0;
      const rawDec = (prop(el, "text-decoration") || el.getAttribute("text-decoration") || "none").toLowerCase();
      const textDecoration = rawDec.includes("underline") ? "underline" : rawDec.includes("line-through") ? "strikethrough" : "none";
      let name2 = el.getAttribute("id") || "text-" + ++auto;
      const base2 = name2;
      let k2 = 2;
      while (used.has(name2)) name2 = base2 + "-" + k2++;
      used.add(name2);
      const fillVal2 = cur.fill && cur.fill !== "none" ? cur.fill : "#111827";
      const grpOp2 = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : void 0;
      const textStyleLinks = readStyleLinks(el, styleIds);
      const textFx = readEffects(el);
      const textGen = parseGenData(el);
      const textBm = normalizeBlendMode(prop(el, "mix-blend-mode"));
      objects.push({
        id: el.getAttribute("data-id") || el.getAttribute("id") || uid(),
        name: name2,
        ...textGen ? { gen: textGen } : {},
        type: "text",
        fill: fillVal2,
        ...textBm !== "normal" ? { blendMode: textBm } : {},
        ...textStyleLinks.fillStyleId ? { fillStyleId: textStyleLinks.fillStyleId } : {},
        ...textFx ? { effects: textFx } : {},
        opacity: cur.opacity ?? 1,
        ...grpOp2 != null ? { groupOpacity: grpOp2 } : {},
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
          verticalAlign: "top",
          resizing: "autoWidth",
          textDecoration,
          textCase: "original",
          paragraphSpacing: 0,
          fill: fillVal2,
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
    let name = el.getAttribute("id") || "path-" + ++auto;
    const base = name;
    let k = 2;
    while (used.has(name)) name = base + "-" + k++;
    used.add(name);
    const nonScalingStroke = cur["vector-effect"] === "non-scaling-stroke";
    const sc = nonScalingStroke ? 1 : computeEffectiveStrokeScale(m, subs);
    const inheritedColor = cur.color || "#18181b";
    let fillVal = cur.fill || "#000000", strokeVal = cur.stroke || "none";
    if (/^currentColor$/i.test(fillVal)) fillVal = inheritedColor;
    if (/^currentColor$/i.test(strokeVal)) strokeVal = inheritedColor;
    const fOp = cur["fill-opacity"] != null ? parseFloat(cur["fill-opacity"]) : 1;
    const sOp = cur["stroke-opacity"] != null ? parseFloat(cur["stroke-opacity"]) : 1;
    if (!/^url\(/.test(fillVal) && fillVal !== "none" && !isNaN(fOp) && fOp < 1 && typeof parseColorWithAlpha === "function") {
      const pf = parseColorWithAlpha(fillVal);
      fillVal = fOp <= 0 ? "none" : formatColorWithAlpha(pf.hex, pf.a * fOp);
    }
    if (!/^url\(/.test(strokeVal) && strokeVal !== "none" && !isNaN(sOp) && sOp < 1 && typeof parseColorWithAlpha === "function") {
      const ps = parseColorWithAlpha(strokeVal);
      strokeVal = sOp <= 0 ? "none" : formatColorWithAlpha(ps.hex, ps.a * sOp);
    }
    const swVal = (parseFloat(cur["stroke-width"] ?? "1") || 0) * sc;
    const sJoin = cur["stroke-linejoin"] || "round", sCap = cur["stroke-linecap"] || "round";
    const sMiter = cur["stroke-miterlimit"] != null && !isNaN(parseFloat(cur["stroke-miterlimit"])) ? parseFloat(cur["stroke-miterlimit"]) : void 0;
    const sxDir = Math.hypot(m[0], m[1]), syDir = Math.hypot(m[2], m[3]);
    const strokeScaleXY = Math.abs(sxDir - syDir) > 1e-3 ? [rd(sxDir), rd(syDir)] : void 0;
    let clipPathD = cur._symClipD || void 0;
    const clipOrMaskRef = cur["clip-path"] || cur["mask"];
    if (clipOrMaskRef) {
      const cm = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(clipOrMaskRef);
      if (cm && clipDefs.has(cm[1])) {
        const cd = clipDefs.get(cm[1]);
        let clipMat = m;
        if (cd.units === "objectBoundingBox") {
          const rawSubs = parsePath(d, [1, 0, 0, 1, 0, 0]);
          const lbb = rawSubs.length ? tightBBox({
            subs: rawSubs
          }) : null;
          if (lbb && isFinite(lbb[0]) && lbb[2] >= lbb[0] && lbb[3] >= lbb[1]) {
            const bw = Math.max(1e-6, lbb[2] - lbb[0]), bh = Math.max(1e-6, lbb[3] - lbb[1]);
            clipMat = mmul(m, [bw, 0, 0, bh, lbb[0], lbb[1]]);
          }
        }
        const cSubs = bake(cd.subs, clipMat);
        if (cSubs.length) clipPathD = cSubs.map((sp) => serializeSub(sp)).join(" ");
      } else if (cm) {
        noteUnsupported("clipPath", cm[1]);
      }
    }
    const grpOp = cur.groupOpacity != null && cur.groupOpacity < 1 ? rd(cur.groupOpacity) : void 0;
    const parsedGen = parseGenData(el);
    const parsedFx = readEffects(el);
    const pathBm = normalizeBlendMode(prop(el, "mix-blend-mode"));
    const po = {
      id: el.getAttribute("data-id") || el.getAttribute("id") || uid(),
      name,
      type: "path",
      fill: fillVal,
      stroke: strokeVal,
      strokeAlign: "center",
      ...pathBm !== "normal" ? { blendMode: pathBm } : {},
      ...readStyleLinks(el, styleIds),
      ...parsedFx ? { effects: parsedFx } : {},
      strokeWidth: swVal,
      strokeLinejoin: sJoin,
      strokeLinecap: sCap,
      ...cur["paint-order"] ? {
        paintOrder: cur["paint-order"]
      } : {},
      ...sMiter ? {
        strokeMiterlimit: sMiter
      } : {},
      ...nonScalingStroke ? {
        nonScalingStroke: true
      } : {},
      ...strokeScaleXY ? {
        strokeScaleXY
      } : {},
      ...clipPathD ? {
        clipPathD
      } : {},
      ...parsedGen ? {
        gen: parsedGen
      } : {},
      ...grpOp != null ? {
        groupOpacity: grpOp
      } : {},
      opacity: cur.opacity ?? 1,
      fillRule: cur["fill-rule"] === "evenodd" ? "evenodd" : "nonzero",
      group: grp,
      subs
    };
    const rawDash = cur["stroke-dasharray"];
    const pDash = parseDasharray(rawDash);
    if (pDash) {
      po.strokeDasharray = pDash.map((v) => rd(v * sc));
    }
    const rawOff = parseFloat(cur["stroke-dashoffset"] || "0");
    if (Number.isFinite(rawOff) && rawOff !== 0) {
      po.strokeDashoffset = rd(rawOff * sc);
    }
    if (/^url\(/.test(po.fill)) {
      attachGrad(po, po.fill, m, "fill", inheritedColor);
      if (!po.grad) po.fill = "#808080";
    }
    if (/^url\(/.test(po.stroke)) {
      attachGrad(po, po.stroke, m, "stroke", inheritedColor);
      if (!po.strokeGrad) po.stroke = "#808080";
    }
    if (po.fill === "none" && !po.grad && (po.stroke === "none" || po.strokeWidth <= 0) && !po.strokeGrad && !(grp && (frames.has(grp) || /^Frame-\d+$/.test(grp)))) return;
    objects.push(po);
  };
  const rootInh = {
    color: "#18181b"
  };
  ["fill", "stroke", "stroke-width", "fill-rule", "fill-opacity", "stroke-opacity", "stroke-linejoin", "stroke-linecap", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "color", "vector-effect", "clip-path", "paint-order"].forEach((k) => {
    const v = prop(svg, k);
    if (v != null && v !== "inherit") rootInh[k] = v;
  });
  const rootOp = prop(svg, "opacity");
  if (rootOp != null && !isNaN(parseFloat(rootOp))) rootInh.groupOpacity = Math.max(0, Math.min(1, parseFloat(rootOp)));
  const rootMat = svg.getAttribute("transform") ? parseTransform(svg.getAttribute("transform"), noteWarn) : [1, 0, 0, 1, 0, 0];
  const docStyles = parseDocStyles(svg);
  const styleIds = new Set(docStyles.map((s) => s.id));
  Array.from(svg.children).forEach((c) => walk(c, rootInh, null, rootMat, 0, null));
  objects.forEach((o) => {
    if (o.group && (frames.has(o.group) || /^Frame-\d+$/.test(o.group))) {
      o.containerType = "frame";
      if (o.name === o.group + "-bg") {
        o.isAutoFrame = true;
        o.isFrameBg = true;
      }
    }
  });
  const unsupported = badGrad || unsupportedElements.length > 0;
  const unsupportedSummary = unsupportedElements.slice(0, 6).join(", ") + (unsupportedElements.length > 6 ? " +" + (unsupportedElements.length - 6) + " lainnya" : "");
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
var parseSvgDocument = parseSVG;
var svgDocumentParser_default = parseSVG;

// src/engine/svgDocumentSerializer.tsx
var svgDocumentSerializer_exports = {};
__export(svgDocumentSerializer_exports, {
  default: () => svgDocumentSerializer_default,
  mergeIconFramesForExport: () => mergeIconFramesForExport,
  resolveExportArea: () => resolveExportArea,
  serializeDoc: () => serializeDoc
});

// src/bridge/wasmEngineBridge.ts
var wasmEngine = {
  isReady: false,
  flattenCubic: null,
  pointToChordDistSq: null,
  hasPolygonSelfIntersection: null,
  earClipPolygon: null,
  rdpSimplify: null,
  computeZoomAtAnchor: null,
  computeWheelZoomFactor: null,
  computeFitTo: null,
  screenToWorld: null,
  worldToScreen: null,
  computeVisibleBounds: null,
  zoomToSlider: null,
  sliderToZoom: null,
  traceImageRgbaToSvg: null
};

// src/renderer/adaptiveCubicFlattener.tsx
function pointToChordDistSq(px, py, x0, y0, dx, dy, chordLenSq) {
  if (wasmEngine.isReady && wasmEngine.pointToChordDistSq) {
    return wasmEngine.pointToChordDistSq(px, py, x0, y0, dx, dy, chordLenSq);
  }
  const vx = px - x0, vy = py - y0;
  if (chordLenSq <= 1e-12) return vx * vx + vy * vy;
  const crossVal = vx * dy - vy * dx;
  const perpSq = crossVal * crossVal / chordLenSq;
  const dotVal = vx * dx + vy * dy;
  if (dotVal < 0) return vx * vx + vy * vy;
  if (dotVal > chordLenSq) {
    const ex = px - (x0 + dx), ey = py - (y0 + dy);
    return ex * ex + ey * ey;
  }
  return perpSq;
}
var FLAT_CTX = {
  outPts: null,
  stats: null,
  tolSq: 0,
  minSegLenSq: 0,
  segVertexLimit: 0,
  maxDepth: 16
};
function flattenRec(x0, y0, x1, y1, x2, y2, x3, y3, d) {
  const ctx = FLAT_CTX, stats = ctx.stats, outPts = ctx.outPts;
  if (stats && d > stats.maxDepthReached) stats.maxDepthReached = d;
  const curTotal = stats ? stats.vertexCount : outPts.length >> 1;
  if (curTotal + 1 >= ctx.segVertexLimit) {
    if (stats) {
      stats.budgetHit = true;
      stats.toleranceMet = false;
      stats.vertexCount++;
      stats.segmentCount++;
    }
    outPts.push(x3, y3);
    return;
  }
  const dx = x3 - x0, dy = y3 - y0;
  const chordLenSq = dx * dx + dy * dy;
  const minSegLenSq = ctx.minSegLenSq;
  if (minSegLenSq > 0 && chordLenSq <= minSegLenSq) {
    const hullSq = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0) + (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) + (x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2);
    if (hullSq <= 4 * minSegLenSq) {
      outPts.push(x3, y3);
      if (stats) {
        stats.vertexCount++;
        stats.segmentCount++;
      }
      return;
    }
  }
  const x01 = (x0 + x1) * 0.5, y01 = (y0 + y1) * 0.5;
  const x12 = (x1 + x2) * 0.5, y12 = (y1 + y2) * 0.5;
  const x23 = (x2 + x3) * 0.5, y23 = (y2 + y3) * 0.5;
  const x012 = (x01 + x12) * 0.5, y012 = (y01 + y12) * 0.5;
  const x123 = (x12 + x23) * 0.5, y123 = (y12 + y23) * 0.5;
  const x0123 = (x012 + x123) * 0.5, y0123 = (y012 + y123) * 0.5;
  if (d < ctx.maxDepth) {
    const d1Sq = pointToChordDistSq(x1, y1, x0, y0, dx, dy, chordLenSq);
    const d2Sq = pointToChordDistSq(x2, y2, x0, y0, dx, dy, chordLenSq);
    const dmSq = pointToChordDistSq(x0123, y0123, x0, y0, dx, dy, chordLenSq);
    const errSq = Math.max(0.5625 * Math.max(d1Sq, d2Sq), dmSq);
    if (errSq <= ctx.tolSq) {
      outPts.push(x3, y3);
      if (stats) {
        stats.vertexCount++;
        stats.segmentCount++;
      }
      return;
    }
  } else {
    if (stats) {
      stats.maxDepthHit++;
      stats.toleranceMet = false;
      stats.vertexCount++;
      stats.segmentCount++;
    }
    outPts.push(x3, y3);
    return;
  }
  flattenRec(x0, y0, x01, y01, x012, y012, x0123, y0123, d + 1);
  flattenRec(x0123, y0123, x123, y123, x23, y23, x3, y3, d + 1);
}
function flattenCubicAdaptive(a, b, tolSq, outPts, depth = 0, minSegLenSq = 0, stats = null) {
  const vertexLimit = stats && stats.vertexLimit ? stats.vertexLimit : RENDER_CONFIG.vertexBudgetPerObject || 65536;
  const segVertexLimit = stats && stats.segVertexLimit ? Math.min(vertexLimit, stats.segVertexLimit) : vertexLimit;
  if (!a.handleOut && !b.handleIn) {
    outPts.push(b.x, b.y);
    if (stats) {
      stats.vertexCount++;
      stats.segmentCount++;
    }
    return;
  }
  const curTotal = stats ? stats.vertexCount : outPts.length >> 1;
  if (curTotal >= segVertexLimit) {
    outPts.push(b.x, b.y);
    if (stats) {
      stats.budgetHit = true;
      stats.toleranceMet = false;
      stats.vertexCount++;
      stats.segmentCount++;
    }
    return;
  }
  const cfgMaxDepth = Math.max(4, Math.min(24, RENDER_CONFIG.maxBezierDepth || 16));
  const effectiveMaxDepth = stats && stats.segMaxDepth != null ? Math.min(cfgMaxDepth, stats.segMaxDepth) : cfgMaxDepth;
  if (wasmEngine.isReady && wasmEngine.flattenCubic) {
    const x0 = a.x, y0 = a.y;
    const x1 = a.handleOut ? a.handleOut.x : a.x;
    const y1 = a.handleOut ? a.handleOut.y : a.y;
    const x2 = b.handleIn ? b.handleIn.x : b.x;
    const y2 = b.handleIn ? b.handleIn.y : b.y;
    const x3 = b.x, y3 = b.y;
    const remainingBudget = Math.max(1, segVertexLimit - curTotal);
    const pts = wasmEngine.flattenCubic(
      x0,
      y0,
      x1,
      y1,
      x2,
      y2,
      x3,
      y3,
      tolSq,
      effectiveMaxDepth,
      minSegLenSq,
      remainingBudget
    );
    if (pts && pts.length) {
      for (let i = 0; i < pts.length; i++) {
        outPts.push(pts[i]);
      }
      if (stats) {
        const added = pts.length >> 1;
        stats.vertexCount += added;
        stats.segmentCount += added;
        if (stats.vertexCount >= segVertexLimit) {
          stats.budgetHit = true;
          stats.toleranceMet = false;
        }
      }
      return;
    }
  }
  const ctx = FLAT_CTX;
  ctx.outPts = outPts;
  ctx.stats = stats;
  ctx.tolSq = tolSq;
  ctx.minSegLenSq = minSegLenSq;
  ctx.segVertexLimit = segVertexLimit;
  ctx.maxDepth = effectiveMaxDepth;
  flattenRec(a.x, a.y, a.handleOut ? a.handleOut.x : a.x, a.handleOut ? a.handleOut.y : a.y, b.handleIn ? b.handleIn.x : b.x, b.handleIn ? b.handleIn.y : b.y, b.x, b.y, depth);
  ctx.outPts = null;
  ctx.stats = null;
}

// src/engine/pathBoolean.tsx
var pathBoolean_exports = {};
__export(pathBoolean_exports, {
  FLAT_TOL: () => FLAT_TOL,
  REFIT_TOL: () => REFIT_TOL,
  booleanDoc: () => booleanDoc,
  cleanRing: () => cleanRing,
  clipRings: () => clipRings,
  default: () => pathBoolean_default,
  flattenObjToRings: () => flattenObjToRings,
  isInsideRings: () => isInsideRings,
  normalizeRingOrientations: () => normalizeRingOrientations,
  refitRingToSub: () => refitRingToSub,
  ringArea: () => ringArea,
  ringContainsPt: () => ringContainsPt,
  ringSelfIntersects: () => ringSelfIntersects,
  ringsToSubs: () => ringsToSubs,
  segSegIntersect: () => segSegIntersect,
  windingNumber: () => windingNumber
});

// src/engine/curveFittingAndAnomalies.tsx
function kasaFit(pts) {
  const m = pts.length;
  if (m < 3) return null;
  let sx = 0, sy = 0, sx2 = 0, sy2 = 0, sxy = 0, sx3 = 0, sy3 = 0, sx2y = 0, sxy2 = 0;
  for (const p of pts) {
    const x = p.x, y = p.y, x2 = x * x, y2 = y * y;
    sx += x;
    sy += y;
    sx2 += x2;
    sy2 += y2;
    sxy += x * y;
    sx3 += x2 * x;
    sy3 += y2 * y;
    sx2y += x2 * y;
    sxy2 += x * y2;
  }
  const C = m * sx2 - sx * sx, D = m * sxy - sx * sy, E = m * sy2 - sy * sy;
  const G = 0.5 * (m * sx3 + m * sxy2 - sx * sx2 - sx * sy2);
  const H = 0.5 * (m * sx2y + m * sy3 - sy * sx2 - sy * sy2);
  const det = C * E - D * D;
  if (Math.abs(det) < 1e-9) return null;
  const cx = (G * E - H * D) / det, cy = (C * H - D * G) / det;
  let rad = 0;
  for (const p of pts) rad += Math.hypot(p.x - cx, p.y - cy);
  rad /= m;
  let ss = 0, mx = 0;
  for (const p of pts) {
    const e = Math.abs(Math.hypot(p.x - cx, p.y - cy) - rad);
    if (e > mx) mx = e;
    ss += e * e;
  }
  const rms = Math.sqrt(ss / m);
  return {
    cx,
    cy,
    rad,
    rms,
    maxErr: mx
  };
}
function schneiderFit(points, t1, t2, tol) {
  const e2 = Math.max(0.01, tol * tol);
  const P2 = points.map((p) => [p.x, p.y]);
  const n = P2.length;
  if (n < 2) return [];
  const qb = (B, t) => {
    const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
    return [a * B[0][0] + b * B[1][0] + c * B[2][0] + d * B[3][0], a * B[0][1] + b * B[1][1] + c * B[2][1] + d * B[3][1]];
  };
  const q1b = (B, t) => {
    const m = 1 - t;
    return [0, 1].map((i) => 3 * (m * m * (B[1][i] - B[0][i]) + 2 * m * t * (B[2][i] - B[1][i]) + t * t * (B[3][i] - B[2][i])));
  };
  const q2b = (B, t) => {
    const m = 1 - t;
    return [0, 1].map((i) => 6 * (m * (B[2][i] - 2 * B[1][i] + B[0][i]) + t * (B[3][i] - 2 * B[2][i] + B[1][i])));
  };
  const genB = (pts, u, tan12, tan22) => {
    const len = pts.length, p0 = pts[0], p3 = pts[len - 1];
    let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
    for (let i = 0; i < len; i++) {
      const t = u[i], m = 1 - t, b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
      const a1 = [tan12[0] * b1, tan12[1] * b1], a2 = [tan22[0] * b2, tan22[1] * b2];
      c00 += a1[0] * a1[0] + a1[1] * a1[1];
      c01 += a1[0] * a2[0] + a1[1] * a2[1];
      c11 += a2[0] * a2[0] + a2[1] * a2[1];
      const tm = [pts[i][0] - (p0[0] * (b0 + b1) + p3[0] * (b2 + b3)), pts[i][1] - (p0[1] * (b0 + b1) + p3[1] * (b2 + b3))];
      x0 += a1[0] * tm[0] + a1[1] * tm[1];
      x1 += a2[0] * tm[0] + a2[1] * tm[1];
    }
    const det = c00 * c11 - c01 * c01;
    let a = det ? (x0 * c11 - x1 * c01) / det : 0, b = det ? (c00 * x1 - c01 * x0) / det : 0;
    const sd = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    if (a < 1e-6 * sd || b < 1e-6 * sd) a = b = sd / 3;
    return [p0, [p0[0] + tan12[0] * a, p0[1] + tan12[1] * a], [p3[0] + tan22[0] * b, p3[1] + tan22[1] * b], p3];
  };
  const maxErrB = (pts, B, u) => {
    let mx = 0, mi = Math.floor(pts.length / 2);
    for (let i = 1; i < pts.length - 1; i++) {
      const d = qb(B, u[i]), e = (d[0] - pts[i][0]) ** 2 + (d[1] - pts[i][1]) ** 2;
      if (e > mx) {
        mx = e;
        mi = i;
      }
    }
    return [mx, mi];
  };
  const repB = (pts, u, B) => {
    return u.map((t, i) => {
      const d = qb(B, t), d1 = q1b(B, t), d2 = q2b(B, t), dx = d[0] - pts[i][0], dy = d[1] - pts[i][1];
      const num = dx * d1[0] + dy * d1[1], den = d1[0] ** 2 + d1[1] ** 2 + dx * d2[0] + dy * d2[1];
      return den ? Math.max(0, Math.min(1, t - num / den)) : t;
    });
  };
  const out = [];
  const fitRec = (pts, tan12, tan22) => {
    const count = pts.length;
    if (count === 2) {
      const d = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) / 3;
      out.push([pts[0], [pts[0][0] + tan12[0] * d, pts[0][1] + tan12[1] * d], [pts[1][0] + tan22[0] * d, pts[1][1] + tan22[1] * d], pts[1]]);
      return;
    }
    let u = [0];
    for (let i = 1; i < count; i++) u.push(u[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = u[count - 1] || 1;
    u = u.map((v) => v / L);
    let B = genB(pts, u, tan12, tan22), [err, sp] = maxErrB(pts, B, u);
    for (let k = 0; k < 5 && err >= e2; k++) {
      if (err > e2 * 16) break;
      u = repB(pts, u, B);
      B = genB(pts, u, tan12, tan22);
      [err, sp] = maxErrB(pts, B, u);
    }
    if (err < e2) {
      out.push(B);
      return;
    }
    const fdx = pts[sp + 1][0] - pts[sp - 1][0], fdy = pts[sp + 1][1] - pts[sp - 1][1];
    const fl = Math.hypot(fdx, fdy) || 1;
    const f = [fdx / fl, fdy / fl];
    fitRec(pts.slice(0, sp + 1), tan12, [-f[0], -f[1]]);
    fitRec(pts.slice(sp), f, tan22);
  };
  const tan1 = [t1.x, t1.y], tan2 = [t2.x, t2.y];
  fitRec(P2, tan1, tan2);
  return out;
}
var HTOL = 0.35;
var hasH = (nd, h) => !!h && Math.hypot(h.x - nd.x, h.y - nd.y) > HTOL;
var segStraight = (a, b) => !hasH(a, a.handleOut) && !hasH(b, b.handleIn);
var chainStraight = (nodes, idxs) => {
  for (let k = 0; k < idxs.length - 1; k++) if (!segStraight(nodes[idxs[k]], nodes[idxs[k + 1]])) return false;
  return true;
};
var makeClaim = () => {
  const all = /* @__PURE__ */ new Set(), inner = /* @__PURE__ */ new Set();
  return {
    ok(idxs) {
      for (let k = 0; k < idxs.length; k++) {
        const i = idxs[k], end = k === 0 || k === idxs.length - 1;
        if (end ? inner.has(i) : all.has(i)) return false;
      }
      return true;
    },
    add(idxs) {
      idxs.forEach((i, k) => {
        all.add(i);
        if (k > 0 && k < idxs.length - 1) inner.add(i);
      });
    }
  };
};
var idIndex = (nodes) => {
  const m = /* @__PURE__ */ new Map();
  nodes.forEach((nd, i) => m.set(nd.id, i));
  return m;
};
function findCornerClusters(nodes, closed, eps = 4, minAngleDeg = 20) {
  const n = nodes.length;
  if (n < 4) return [];
  let start = 0;
  if (closed) {
    start = -1;
    for (let i = 0; i < n; i++) if (dist(nodes[(i - 1 + n) % n], nodes[i]) > eps) {
      start = i;
      break;
    }
    if (start < 0) return [];
  }
  const groups = [];
  let cur = [];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (cur.length && dist(nodes[cur[cur.length - 1]], nodes[i]) <= eps && dist(nodes[cur[0]], nodes[i]) <= eps * 1.5) cur.push(i);
    else {
      if (cur.length) groups.push(cur);
      cur = [i];
    }
  }
  if (cur.length) groups.push(cur);
  const clusters = [], minAng = minAngleDeg;
  for (const g of groups) {
    if (g.length < 2 || g.length > n - 2) continue;
    const f = g[0], l = g[g.length - 1];
    if (!closed && (g.indexOf(0) >= 0 || g.indexOf(n - 1) >= 0)) continue;
    if (g.some((i) => nodes[i].fil)) continue;
    const pi = (f - 1 + n) % n, ni = (l + 1) % n;
    const A = nodes[f], B = nodes[l], PV = nodes[pi], NX = nodes[ni];
    if (dist(PV, A) <= eps || dist(B, NX) <= eps) continue;
    const vIn = hasH(A, A.handleIn) ? nrm(sub(A, A.handleIn)) : hasH(PV, PV.handleOut) ? nrm(sub(A, PV.handleOut)) : nrm(sub(A, PV));
    const vOut = hasH(B, B.handleOut) ? nrm(sub(B.handleOut, B)) : hasH(NX, NX.handleIn) ? nrm(sub(NX.handleIn, B)) : nrm(sub(NX, B));
    const angDeg = Math.acos(Math.max(-1, Math.min(1, dot(vIn, vOut)))) * 180 / Math.PI;
    if (angDeg < minAng) continue;
    let cx = 0, cy = 0;
    g.forEach((i) => {
      cx += nodes[i].x;
      cy += nodes[i].y;
    });
    cx /= g.length;
    cy /= g.length;
    const centroid = {
      x: cx,
      y: cy
    };
    let inter = null;
    const det = cross(vIn, vOut);
    if (Math.abs(det) > 1e-4) {
      const w = sub(B, A), t = cross(w, vOut) / det, px = A.x + vIn.x * t, py = A.y + vIn.y * t;
      if (Math.hypot(px - cx, py - cy) <= Math.max(20, eps * 8)) inter = {
        x: px,
        y: py
      };
    }
    if (!inter) inter = centroid;
    let rMax = 0;
    g.forEach((i) => {
      const d = dist(nodes[i], centroid);
      if (d > rMax) rMax = d;
    });
    clusters.push({
      nodeIndices: g.slice(),
      nodeIds: g.map((i) => nodes[i].id),
      firstIdx: f,
      lastIdx: l,
      prevIdx: pi,
      nextIdx: ni,
      angleDeg: angDeg,
      centroid,
      radius: Math.max(rMax, eps),
      intersection: {
        x: rd(inter.x),
        y: rd(inter.y)
      }
    });
  }
  return clusters;
}
function findCollinearNodes(nodes, closed, tol = 0.25) {
  const n = nodes.length;
  if (n < 3) return [];
  const results = [];
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) continue;
    const prev = nodes[(i - 1 + n) % n], curr = nodes[i], next = nodes[(i + 1) % n];
    if (hasH(curr, curr.handleIn) || hasH(curr, curr.handleOut)) continue;
    if (hasH(prev, prev.handleOut) || hasH(next, next.handleIn)) continue;
    if (curr.fil) continue;
    const L = dist(prev, next);
    if (L < 1e-6) continue;
    const perpDist = Math.abs((next.x - prev.x) * (prev.y - curr.y) - (prev.x - curr.x) * (next.y - prev.y)) / L;
    const dotVal = (curr.x - prev.x) * (next.x - prev.x) + (curr.y - prev.y) * (next.y - prev.y);
    if (perpDist <= tol && dotVal > 0 && dotVal < L * L) results.push({
      index: i,
      nodeId: curr.id,
      perpDist: rd(perpDist),
      pt: {
        x: curr.x,
        y: curr.y
      }
    });
  }
  return results;
}
function findWobblySpans(nodes, closed) {
  const n = nodes.length;
  if (n < 4) return [];
  const results = [], claim = makeClaim(), maxSpan = Math.min(10, closed ? n - 1 : n);
  for (let spanLen = maxSpan; spanLen >= 4; spanLen--) {
    const lastStart = closed ? n - 1 : n - spanLen;
    for (let i = 0; i <= lastStart; i++) {
      const idxs = [];
      for (let k = 0; k < spanLen; k++) idxs.push((i + k) % n);
      if (!claim.ok(idxs) || !chainStraight(nodes, idxs)) continue;
      const pStart = nodes[idxs[0]], pEnd = nodes[idxs[idxs.length - 1]];
      const chordLen = dist(pStart, pEnd);
      if (chordLen < 15) continue;
      let arcLen = 0;
      for (let k = 0; k < idxs.length - 1; k++) arcLen += dist(nodes[idxs[k]], nodes[idxs[k + 1]]);
      const tortuosity = arcLen / chordLen;
      if (tortuosity < 1.002 || tortuosity > 1.15) continue;
      let crossings = 0, prevSign = 0, maxDev = 0;
      const ab = sub(pEnd, pStart);
      for (let k = 1; k < idxs.length - 1; k++) {
        const sd = cross(ab, sub(nodes[idxs[k]], pStart)) / chordLen, ad = Math.abs(sd);
        if (ad > maxDev) maxDev = ad;
        const sign = sd > 0.15 ? 1 : sd < -0.15 ? -1 : 0;
        if (sign !== 0) {
          if (prevSign !== 0 && sign !== prevSign) crossings++;
          prevSign = sign;
        }
      }
      if (crossings >= 2 && maxDev < Math.max(5, chordLen * 0.14)) {
        claim.add(idxs);
        let cx = 0, cy = 0;
        idxs.forEach((k) => {
          cx += nodes[k].x;
          cy += nodes[k].y;
        });
        cx /= idxs.length;
        cy /= idxs.length;
        results.push({
          nodeIndices: idxs,
          nodeIds: idxs.map((k) => nodes[k].id),
          pts: idxs.map((k) => ({
            x: nodes[k].x,
            y: nodes[k].y
          })),
          centroid: {
            x: cx,
            y: cy
          },
          chord: {
            p1: P(pStart),
            p2: P(pEnd)
          },
          chordLen: rd(chordLen),
          tortuosity: rd(tortuosity),
          crossings,
          maxDev: rd(maxDev)
        });
      }
    }
  }
  return results;
}
function findFacetedCurves(nodes, closed) {
  const n = nodes.length;
  if (n < 4) return [];
  const results = [], claim = makeClaim(), minChainLen = 4;
  for (let i = 0; i < (closed ? n : n - minChainLen + 1); i++) {
    const chain = [i];
    let prevSign = 0, total = 0;
    for (let k = 1; k < Math.min(12, n); k++) {
      if (!closed && i + k >= n) break;
      const cu = (i + k) % n, pv = (i + k - 1) % n, pp = (i + k - 2 + n) % n;
      const segLen = dist(nodes[pv], nodes[cu]);
      if (segLen > 55 || segLen < 1e-4 || !segStraight(nodes[pv], nodes[cu])) break;
      if (k >= 2) {
        const u = nrm(sub(nodes[pv], nodes[pp])), v = nrm(sub(nodes[cu], nodes[pv]));
        const turn = Math.atan2(cross(u, v), dot(u, v)), absAng = Math.abs(turn) * 180 / Math.PI;
        if (absAng < 2 || absAng > 42) break;
        const sign = turn > 0 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) break;
        prevSign = sign;
        total += absAng;
      }
      chain.push(cu);
    }
    if (chain.length < minChainLen || total < 26 || closed && chain.length >= n) continue;
    const fit = kasaFit(chain.map((k) => nodes[k]));
    if (!fit || fit.rad < 4 || fit.rad > 6e3 || fit.rms > Math.max(0.6, fit.rad * 0.04)) continue;
    if (!claim.ok(chain)) continue;
    claim.add(chain);
    let cx = 0, cy = 0;
    chain.forEach((k) => {
      cx += nodes[k].x;
      cy += nodes[k].y;
    });
    cx /= chain.length;
    cy /= chain.length;
    results.push({
      nodeIndices: chain,
      nodeIds: chain.map((k) => nodes[k].id),
      pts: chain.map((k) => ({
        x: nodes[k].x,
        y: nodes[k].y
      })),
      centroid: {
        x: cx,
        y: cy
      },
      center: {
        x: rd(fit.cx),
        y: rd(fit.cy)
      },
      radius: rd(fit.rad),
      rms: rd(fit.rms),
      totalAngleDeg: rd(total)
    });
    i += chain.length - 2;
  }
  return results;
}
function findDenseArcNodes(nodes, closed) {
  const n = nodes.length;
  if (n < 5) return [];
  const results = [], claim = makeClaim();
  for (let i = 0; i < (closed ? n : n - 4); i++) {
    const idxs = [];
    for (let k = 0; k < 5; k++) idxs.push((i + k) % n);
    if (closed && n < 6) break;
    if (!chainStraight(nodes, idxs)) continue;
    let ok = true, segSum = 0;
    for (let k = 0; k < 4; k++) {
      const d = dist(nodes[idxs[k]], nodes[idxs[k + 1]]);
      if (d > 35 || d < 0.5) {
        ok = false;
        break;
      }
      segSum += d;
    }
    if (!ok) continue;
    const ch = dist(nodes[idxs[0]], nodes[idxs[4]]);
    if (ch < 10 || segSum / ch > 1.45) continue;
    let sg = 0, tot = 0;
    for (let k = 1; k < 4; k++) {
      const u = nrm(sub(nodes[idxs[k]], nodes[idxs[k - 1]])), v = nrm(sub(nodes[idxs[k + 1]], nodes[idxs[k]]));
      const t = Math.atan2(cross(u, v), dot(u, v)), s = t > 35e-4 ? 1 : t < -35e-4 ? -1 : 0;
      if (s === 0 || sg && s !== sg) {
        ok = false;
        break;
      }
      sg = s;
      tot += Math.abs(t);
    }
    if (!ok || tot * 180 / Math.PI < 6) continue;
    const fit = kasaFit(idxs.map((k) => nodes[k]));
    if (!fit || fit.rms >= 1 || fit.rad >= 400 || !claim.ok(idxs)) continue;
    claim.add(idxs);
    let cx = 0, cy = 0;
    idxs.forEach((k) => {
      cx += nodes[k].x;
      cy += nodes[k].y;
    });
    results.push({
      nodeIndices: idxs,
      nodeIds: idxs.map((k) => nodes[k].id),
      pts: idxs.map((k) => ({
        x: nodes[k].x,
        y: nodes[k].y
      })),
      centroid: {
        x: cx / 5,
        y: cy / 5
      },
      fitRadius: rd(fit.rad),
      radius: rd(fit.rad)
    });
    i += 3;
  }
  return results;
}
function detectAnomalies(doc, opt = {}) {
  const eps = opt.cornerEps || 4, colTol = opt.collinearTol || 0.25, wantHeat = opt.heatmap !== false;
  const clusteredCorners = [], collinearNodes = [], wobblyLines = [], facetedCurves = [], denseArcNodes = [], allPts = [];
  doc.objects.forEach((o) => {
    if (o.hidden || o.locked || o.img || o.isFrameBg || o.isAutoFrame) return;
    o.subs.forEach((sp) => {
      const ns = sp.nodes;
      if (ns.length < 3) return;
      if (wantHeat) ns.forEach((n) => allPts.push({
        x: n.x,
        y: n.y
      }));
      const base = {
        objId: o.id,
        objName: o.name,
        subId: sp.id
      };
      findCornerClusters(ns, sp.closed, eps).forEach((c) => clusteredCorners.push({
        ...c,
        ...base,
        id: "cc:" + sp.id + ":" + c.nodeIds[0],
        type: "corner_cluster",
        message: `Sudut menumpuk (${c.nodeIndices.length} node)`
      }));
      findCollinearNodes(ns, sp.closed, colTol).forEach((c) => collinearNodes.push({
        ...c,
        ...base,
        id: "cl:" + c.nodeId,
        nodeIds: [c.nodeId],
        centroid: c.pt,
        type: "collinear",
        message: "Node redundan pada garis lurus"
      }));
      findWobblySpans(ns, sp.closed).forEach((w) => wobblyLines.push({
        ...w,
        ...base,
        id: "wb:" + sp.id + ":" + w.nodeIds[0],
        type: "wobbly",
        message: "Garis meleyot / bergelombang"
      }));
      const fc = findFacetedCurves(ns, sp.closed);
      fc.forEach((f) => facetedCurves.push({
        ...f,
        ...base,
        id: "fc:" + sp.id + ":" + f.nodeIds[0],
        type: "faceted",
        message: `Lengkungan faset (${f.nodeIndices.length - 1} segmen)`
      }));
      const fIds = /* @__PURE__ */ new Set();
      fc.forEach((f) => f.nodeIds.forEach((id) => fIds.add(id)));
      findDenseArcNodes(ns, sp.closed).forEach((d) => {
        if (d.nodeIds.some((id) => fIds.has(id))) return;
        denseArcNodes.push({
          ...d,
          ...base,
          id: "da:" + sp.id + ":" + d.nodeIds[0],
          type: "dense_arc",
          message: "Node berlebih pada lengkungan"
        });
      });
    });
  });
  const heatmap = [];
  if (wantHeat && allPts.length) {
    const R = Math.max(12, eps * 3.5), cell = R, grid = /* @__PURE__ */ new Map();
    allPts.forEach((p) => {
      const k = Math.floor(p.x / cell) + "," + Math.floor(p.y / cell);
      let a = grid.get(k);
      if (!a) grid.set(k, a = []);
      a.push(p);
    });
    const step = Math.max(1, Math.ceil(allPts.length / 200));
    for (let i = 0; i < allPts.length; i += step) {
      const p = allPts[i], gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
      let count = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const a = grid.get(gx + dx + "," + (gy + dy));
        if (a) {
          for (const q of a) if (Math.hypot(p.x - q.x, p.y - q.y) <= R) count++;
        }
      }
      if (count >= 3) {
        const intensity = Math.min(1, count / 10);
        heatmap.push({
          x: p.x,
          y: p.y,
          r: R * 0.9,
          level: count >= 7 ? "hi" : count >= 4 ? "mid" : "lo",
          opacity: 0.25 + intensity * 0.5,
          count
        });
      }
    }
  }
  const summary = {
    total: clusteredCorners.length + collinearNodes.length + wobblyLines.length + facetedCurves.length + denseArcNodes.length,
    cornerClusterCount: clusteredCorners.length,
    collinearCount: collinearNodes.length,
    wobblyCount: wobblyLines.length,
    facetedCount: facetedCurves.length,
    denseArcCount: denseArcNodes.length
  };
  return {
    summary,
    clusteredCorners,
    collinearNodes,
    wobblyLines,
    facetedCurves,
    denseArcNodes,
    heatmap
  };
}
function collapseClusters(nodes, clusters) {
  const idx = idIndex(nodes), byFirst = /* @__PURE__ */ new Map(), drop = /* @__PURE__ */ new Set();
  for (const c of clusters) {
    const ids = c.nodeIds.filter((id) => idx.has(id));
    if (ids.length < 2) continue;
    const A = nodes[idx.get(ids[0])], B = nodes[idx.get(ids[ids.length - 1])];
    byFirst.set(ids[0], {
      id: uid(),
      x: c.intersection.x,
      y: c.intersection.y,
      type: "corner",
      handleIn: hasH(A, A.handleIn) ? {
        ...A.handleIn
      } : null,
      handleOut: hasH(B, B.handleOut) ? {
        ...B.handleOut
      } : null
    });
    ids.forEach((id) => drop.add(id));
  }
  if (!drop.size) return null;
  const out = [];
  nodes.forEach((nd) => {
    if (byFirst.has(nd.id)) out.push(byFirst.get(nd.id));
    else if (!drop.has(nd.id)) out.push(nd);
  });
  return out;
}
function refitChain(nodes, closed, ids, tol) {
  const n = nodes.length, m = ids.length;
  if (m < 4 || m > n) return null;
  const i0 = nodes.findIndex((x) => x.id === ids[0]);
  if (i0 < 0) return null;
  for (let k = 0; k < m; k++) if (nodes[(i0 + k) % n].id !== ids[k]) return null;
  const wrap = i0 + m > n;
  if (wrap && !closed) return null;
  let arr = nodes.map(cl);
  if (wrap) arr = arr.slice(i0).concat(arr.slice(0, i0));
  const s = wrap ? 0 : i0, e = s + m - 1, A = arr[s], B = arr[e], idxs = [];
  for (let k = s; k <= e; k++) idxs.push(k);
  if (!chainStraight(arr, idxs)) return null;
  const pts = arr.slice(s, e + 1).map((q) => ({
    x: q.x,
    y: q.y
  }));
  const fitted = schneiderFit(pts, nrm(sub(arr[s + 1], A)), nrm(sub(arr[e - 1], B)), tol);
  if (!fitted.length || fitted.length >= m - 1) return null;
  A.handleOut = {
    x: rd(fitted[0][1][0]),
    y: rd(fitted[0][1][1])
  };
  B.handleIn = {
    x: rd(fitted[fitted.length - 1][2][0]),
    y: rd(fitted[fitted.length - 1][2][1])
  };
  const mids = [];
  for (let k = 0; k < fitted.length - 1; k++) {
    const c = fitted[k], d = fitted[k + 1];
    mids.push({
      id: uid(),
      x: rd(c[3][0]),
      y: rd(c[3][1]),
      type: "smooth",
      handleIn: {
        x: rd(c[2][0]),
        y: rd(c[2][1])
      },
      handleOut: {
        x: rd(d[1][0]),
        y: rd(d[1][1])
      }
    });
  }
  arr.splice(s + 1, m - 2, ...mids);
  return arr;
}

// src/engine/pathBoolean.tsx
var EPS = 1e-9;
var FLAT_TOL = 0.25;
var REFIT_TOL = 0.5;
var ringArea = (pts) => {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};
var cleanRing = (pts) => {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = out[out.length - 1];
    if (!q || (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]) > 1e-18) out.push(p);
  }
  if (out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if ((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]) <= 1e-18) out.pop();
  }
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const p = out[(i - 1 + out.length) % out.length], q = out[i], r = out[(i + 1) % out.length];
      const ux = q[0] - p[0], uy = q[1] - p[1], vx = r[0] - q[0], vy = r[1] - q[1];
      const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
      if (lu > 1e-12 && lv > 1e-12) {
        const cross2 = (ux * vy - uy * vx) / (lu * lv);
        const dot2 = (ux * vx + uy * vy) / (lu * lv);
        if (Math.abs(cross2) < 1e-9 && dot2 > 0) {
          out.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
  }
  return out;
};
var isValidRing = (pts) => pts.length >= 3 && Math.abs(ringArea(pts)) > 1e-9;
var windingNumber = (x, y, rings) => {
  let wn = 0;
  for (let r = 0; r < rings.length; r++) {
    const pts = rings[r];
    for (let i = 0, n = pts.length; i < n; i++) {
      const ax = pts[i][0], ay = pts[i][1];
      const bx = pts[(i + 1) % n][0], by = pts[(i + 1) % n][1];
      if (ay <= y) {
        if (by > y && (bx - ax) * (y - ay) - (by - ay) * (x - ax) > 0) wn++;
      } else if (by <= y && (bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) wn--;
    }
  }
  return wn;
};
var isInsideRings = (x, y, rings) => windingNumber(x, y, rings) !== 0;
var interiorNormal = (ax, ay, bx, by, area) => {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  return area > 0 ? [nx, ny] : [-nx, -ny];
};
var ringSelfIntersects = (pts) => {
  const n = pts.length;
  const segX = (ax, ay, bx, by, cx, cy) => {
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    return d;
  };
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = pts[j], d = pts[(j + 1) % n];
      const d1 = segX(a[0], a[1], b[0], b[1], c[0], c[1]);
      const d2 = segX(a[0], a[1], b[0], b[1], d[0], d[1]);
      const d3 = segX(c[0], c[1], d[0], d[1], a[0], a[1]);
      const d4 = segX(c[0], c[1], d[0], d[1], b[0], b[1]);
      if (d1 * d2 < -1e-18 && d3 * d4 < -1e-18) return true;
    }
  }
  return false;
};
var flattenObjToRings = (o, tol = FLAT_TOL) => {
  const rings = [];
  let skippedOpen = 0, skippedTiny = 0;
  const tolSq = tol * tol;
  for (const sp of o.subs || []) {
    if (!sp.closed) {
      skippedOpen++;
      continue;
    }
    const ns = sp.nodes || [];
    if (ns.length < 2) {
      skippedTiny++;
      continue;
    }
    const flat = [ns[0].x, ns[0].y];
    for (let i = 1; i <= ns.length; i++) {
      const a = ns[i - 1], b = ns[i % ns.length];
      flattenCubicAdaptive(a, b, tolSq, flat);
    }
    const pts = [];
    for (let k = 0; k + 1 < flat.length; k += 2) pts.push([flat[k], flat[k + 1]]);
    const cleaned = cleanRing(pts);
    if (isValidRing(cleaned)) rings.push(cleaned);
    else skippedTiny++;
  }
  return { rings, skippedOpen, skippedTiny };
};
var segSegIntersect = (ax, ay, bx, by, cx, cy, dx, dy) => {
  const rX = bx - ax, rY = by - ay;
  const sX = dx - cx, sY = dy - cy;
  const den = rX * sY - rY * sX;
  const qpx = cx - ax, qpy = cy - ay;
  if (Math.abs(den) < 1e-14) {
    if (Math.abs(qpx * rY - qpy * rX) > 1e-9 * Math.max(1, Math.hypot(rX, rY))) return null;
    const rLen2 = rX * rX + rY * rY;
    if (rLen2 < 1e-18) return null;
    const t0 = ((cx - ax) * rX + (cy - ay) * rY) / rLen2;
    const t1 = ((dx - ax) * rX + (dy - ay) * rY) / rLen2;
    const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
    if (hi - lo <= 1e-12) {
      if (hi < -EPS || lo > 1 + EPS) return null;
      const t2 = Math.max(0, Math.min(1, (lo + hi) / 2));
      return { kind: "touch", t: t2, u: null, x: ax + rX * t2, y: ay + rY * t2 };
    }
    const sLen2 = sX * sX + sY * sY || 1;
    const uOf = (t2) => ((ax + rX * t2 - cx) * sX + (ay + rY * t2 - cy) * sY) / sLen2;
    return { kind: "overlap", t0: lo, t1: hi, u0: uOf(lo), u1: uOf(hi) };
  }
  const t = (qpx * sY - qpy * sX) / den;
  const u = (qpx * rY - qpy * rX) / den;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  const tc = Math.max(0, Math.min(1, t)), uc = Math.max(0, Math.min(1, u));
  return { kind: "cross", t: tc, u: uc, x: ax + rX * tc, y: ay + rY * tc };
};
var buildPolyVerts = (rings) => {
  const allVerts = [];
  const ringList = [];
  for (let ri = 0; ri < rings.length; ri++) {
    const pts = rings[ri];
    const area = ringArea(pts);
    const vs = pts.map((p) => ({ x: p[0], y: p[1], next: null, prev: null, isX: false, other: null, entry: null, visited: false, ringArea: area, ringIdx: ri }));
    for (let i = 0; i < vs.length; i++) {
      vs[i].next = vs[(i + 1) % vs.length];
      vs[i].prev = vs[(i + vs.length - 1) % vs.length];
    }
    ringList.push(vs);
    allVerts.push(...vs);
  }
  return { ringList, allVerts };
};
var ringContainsPt = (px, py, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > py !== yj > py && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
var normalizeRingOrientations = (rings) => rings.map((r, i) => {
  let depth = 0;
  for (let j = 0; j < rings.length; j++) {
    if (i !== j && ringContainsPt(r[0][0], r[0][1], rings[j])) depth++;
  }
  const area = ringArea(r);
  const wantPositive = depth % 2 === 0;
  if (area > 0 !== wantPositive) return r.slice().reverse();
  return r;
});
var clipRings = (subjectRings, clipRingsIn, op) => {
  const subj = normalizeRingOrientations(subjectRings.map((r) => cleanRing(r)).filter(isValidRing));
  const clip = normalizeRingOrientations(clipRingsIn.map((r) => cleanRing(r)).filter(isValidRing));
  if (!subj.length || !clip.length) {
    if (op === "union") return [...subj, ...clip];
    if (op === "intersect") return [];
    if (op === "difference") return [...subj];
    return [...subj, ...clip];
  }
  if (op === "xor") {
    const a = clipRings(subj, clip, "difference");
    const b = clipRings(clip, subj, "difference");
    return [...a, ...b];
  }
  const S = buildPolyVerts(subj);
  const C = buildPolyVerts(clip);
  const sRecs = [];
  const cRecs = [];
  const keyPt = (x, y) => Math.round(x * 1e9) + ":" + Math.round(y * 1e9);
  const seenPt = /* @__PURE__ */ new Set();
  const dedupPt = (x, y) => {
    const k = keyPt(x, y);
    if (seenPt.has(k)) return true;
    seenPt.add(k);
    return false;
  };
  for (let si = 0; si < S.ringList.length; si++) {
    sRecs.push(S.ringList[si].map(() => []));
  }
  for (let ci = 0; ci < C.ringList.length; ci++) {
    cRecs.push(C.ringList[ci].map(() => []));
  }
  for (let si = 0; si < S.ringList.length; si++) {
    const sVs = S.ringList[si];
    for (let i = 0; i < sVs.length; i++) {
      const a = sVs[i], b = sVs[i].next;
      if (Math.abs(a.x - b.x) < 1e-12 && Math.abs(a.y - b.y) < 1e-12) continue;
      const minSx = Math.min(a.x, b.x), maxSx = Math.max(a.x, b.x);
      const minSy = Math.min(a.y, b.y), maxSy = Math.max(a.y, b.y);
      for (let ci = 0; ci < C.ringList.length; ci++) {
        const cVs = C.ringList[ci];
        for (let j = 0; j < cVs.length; j++) {
          const c = cVs[j], d = cVs[j].next;
          if (Math.abs(c.x - d.x) < 1e-12 && Math.abs(c.y - d.y) < 1e-12) continue;
          if (Math.max(c.x, d.x) < minSx - 1e-9 || Math.min(c.x, d.x) > maxSx + 1e-9 || Math.max(c.y, d.y) < minSy - 1e-9 || Math.min(c.y, d.y) > maxSy + 1e-9) continue;
          const hit = segSegIntersect(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
          if (!hit) continue;
          if (hit.kind === "overlap") {
            for (const [tt, uu] of [[hit.t0, hit.u0], [hit.t1, hit.u1]]) {
              const x = a.x + (b.x - a.x) * tt, y = a.y + (b.y - a.y) * tt;
              if (dedupPt(x, y)) continue;
              sRecs[si][i].push({ t: tt, x, y, cRing: ci, cEdge: j, u: uu });
              cRecs[ci][j].push({ t: uu, x, y, cRing: si, cEdge: i, u: tt });
            }
          } else {
            const { t, u, x, y } = hit;
            if (dedupPt(x, y)) continue;
            sRecs[si][i].push({ t, x, y, cRing: ci, cEdge: j, u });
            cRecs[ci][j].push({ t: u, x, y, cRing: si, cEdge: i, u: t });
          }
        }
      }
    }
  }
  const linkRec = (rec, sV, cV) => {
    sV.isX = true;
    cV.isX = true;
    sV.other = cV;
    cV.other = sV;
  };
  const insertRecs = (poly, recs, isSubj) => {
    for (let ri = 0; ri < poly.ringList.length; ri++) {
      const vs = poly.ringList[ri];
      const edgeRecs = recs[ri];
      for (let i = 0; i < vs.length; i++) {
        const list = edgeRecs[i].slice().sort((p, q) => p.t - q.t);
        if (!list.length) continue;
        const start = vs[i], end = vs[i].next;
        let prev = start;
        for (const rec of list) {
          if (rec.t <= 1e-9) {
            rec.v = start;
            continue;
          }
          if (rec.t >= 1 - 1e-9) {
            rec.v = end;
            continue;
          }
          const nv = { x: rec.x, y: rec.y, next: null, prev: null, isX: false, other: null, entry: null, visited: false, ringArea: start.ringArea, ringIdx: start.ringIdx };
          nv.prev = prev;
          nv.next = end;
          prev.next = nv;
          end.prev = nv;
          prev = nv;
          rec.v = nv;
          poly.allVerts.push(nv);
        }
      }
    }
  };
  insertRecs(S, sRecs, true);
  insertRecs(C, cRecs, false);
  for (let si = 0; si < sRecs.length; si++) {
    for (let i = 0; i < sRecs[si].length; i++) {
      for (const rec of sRecs[si][i]) {
        if (!rec.v) continue;
        const cList = cRecs[rec.cRing][rec.cEdge];
        const match = cList.find((r) => Math.abs(r.t - rec.u) < 1e-7 && Math.abs(r.x - rec.x) < 1e-7 && Math.abs(r.y - rec.y) < 1e-7);
        if (match && match.v) linkRec(rec, rec.v, match.v);
        else if (match && !match.v) {
        }
      }
    }
  }
  const cByPt = /* @__PURE__ */ new Map();
  for (const v of C.allVerts) if (v.isX || true) cByPt.set(keyPt(v.x, v.y), v);
  for (const v of S.allVerts) {
    if (!v.isX || v.other) continue;
    const m = cByPt.get(keyPt(v.x, v.y));
    if (m) linkRec(null, v, m);
  }
  const sByPt = /* @__PURE__ */ new Map();
  for (const v of S.allVerts) sByPt.set(keyPt(v.x, v.y), v);
  for (const v of C.allVerts) {
    if (!v.isX || v.other) continue;
    const m = sByPt.get(keyPt(v.x, v.y));
    if (m) linkRec(null, m, v);
  }
  const classify = (poly, otherRings) => {
    for (const v of poly.allVerts) {
      if (!v.isX || !v.other) continue;
      const inN = interiorNormal(v.prev.x, v.prev.y, v.x, v.y, v.ringArea);
      const outN = interiorNormal(v.x, v.y, v.next.x, v.next.y, v.ringArea);
      const e = 1e-7;
      const beforeX = (v.prev.x + v.x) / 2 + inN[0] * e, beforeY = (v.prev.y + v.y) / 2 + inN[1] * e;
      const afterX = (v.x + v.next.x) / 2 + outN[0] * e, afterY = (v.y + v.next.y) / 2 + outN[1] * e;
      const inBefore = isInsideRings(beforeX, beforeY, otherRings);
      const inAfter = isInsideRings(afterX, afterY, otherRings);
      v.entry = !inBefore && inAfter ? true : inBefore && !inAfter ? false : null;
    }
  };
  classify(S, clip);
  classify(C, subj);
  const result = [];
  const trace = (startV, startPoly, startDir) => {
    const ring = [];
    let v = startV, poly = startPoly, dir = startDir;
    let guard = 0;
    const startKey = v;
    while (guard++ < 2e5) {
      ring.push([v.x, v.y]);
      v.visited = true;
      if (v.other) v.other.visited = true;
      const nxt = dir > 0 ? v.next : v.prev;
      if ((nxt === startKey || startKey.other && nxt === startKey.other) && ring.length >= 3) {
        return cleanRing(ring);
      }
      if (nxt.isX && nxt.other) {
        let sw = false;
        if (op === "union") {
          if (nxt.entry === true) sw = true;
        } else if (op === "intersect") {
          if (nxt.entry === false) sw = true;
        } else if (op === "difference") {
          if (nxt.entry === true) sw = true;
        }
        if (sw) {
          v = nxt.other;
          poly = poly === "S" ? "C" : "S";
          if (op === "difference") dir = poly === "S" ? 1 : -1;
          continue;
        }
      }
      v = nxt;
    }
    return null;
  };
  const tryStart = (poly, v) => {
    if (v.visited || !v.isX || !v.other) return;
    if (op === "union" && v.entry !== false) return;
    if (op === "intersect" && v.entry !== true) return;
    if (op === "difference" && v.entry !== false) return;
    const dir = op === "difference" && poly === "C" ? -1 : 1;
    const ring = trace(v, poly, dir);
    if (ring && isValidRing(ring)) result.push(ring);
  };
  for (const v of S.allVerts) tryStart("S", v);
  for (const v of C.allVerts) tryStart("C", v);
  const insideResult = (sIn, cIn) => op === "union" ? sIn || cIn : op === "intersect" ? sIn && cIn : sIn && !cIn;
  const selectRing = (pts, ownRings, otherRings, isSubjRing) => {
    const area = ringArea(pts);
    const ax = pts[0][0], ay = pts[0][1], bx = pts[1][0], by = pts[1][1];
    const n = interiorNormal(ax, ay, bx, by, area);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const e = 1e-6;
    const inX = mx + n[0] * e, inY = my + n[1] * e;
    const outX = mx - n[0] * e, outY = my - n[1] * e;
    const sIn = isSubjRing ? isInsideRings(inX, inY, ownRings) : isInsideRings(inX, inY, otherRings);
    const sOut = isSubjRing ? isInsideRings(outX, outY, ownRings) : isInsideRings(outX, outY, otherRings);
    const cIn = isSubjRing ? isInsideRings(inX, inY, otherRings) : isInsideRings(inX, inY, ownRings);
    const cOut = isSubjRing ? isInsideRings(outX, outY, otherRings) : isInsideRings(outX, outY, ownRings);
    const rIn = insideResult(sIn, cIn), rOut = insideResult(sOut, cOut);
    return rIn !== rOut;
  };
  const markCrossed = (poly, rings) => {
    const flags = rings.map(() => false);
    for (const v of poly.allVerts) {
      if (!v.isX || !v.other || v.entry == null) continue;
      if (v.ringIdx != null) flags[v.ringIdx] = true;
    }
    return flags;
  };
  const sCrossed = markCrossed(S, subj);
  const cCrossed = markCrossed(C, clip);
  for (let ri = 0; ri < subj.length; ri++) {
    if (sCrossed[ri]) continue;
    if (selectRing(subj[ri], subj, clip, true)) result.push(cleanRing(subj[ri]));
  }
  for (let ri = 0; ri < clip.length; ri++) {
    if (cCrossed[ri]) continue;
    if (selectRing(clip[ri], clip, subj, false)) result.push(cleanRing(clip[ri]));
  }
  const isBoundaryRing = (pts) => {
    const area = ringArea(pts);
    const e = 1e-5;
    for (let i = 0; i < pts.length; i++) {
      const ax = pts[i][0], ay = pts[i][1];
      const bx = pts[(i + 1) % pts.length][0], by = pts[(i + 1) % pts.length][1];
      if (Math.hypot(bx - ax, by - ay) < 1e-6) continue;
      const n = interiorNormal(ax, ay, bx, by, area);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const inX = mx + n[0] * e, inY = my + n[1] * e;
      const outX = mx - n[0] * e, outY = my - n[1] * e;
      const sIn = isInsideRings(inX, inY, subj);
      const sOut = isInsideRings(outX, outY, subj);
      const cIn = isInsideRings(inX, inY, clip);
      const cOut = isInsideRings(outX, outY, clip);
      const rIn = insideResult(sIn, cIn), rOut = insideResult(sOut, cOut);
      if (rIn !== rOut) return true;
    }
    return false;
  };
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const r of result) {
    const c = cleanRing(r);
    if (!isValidRing(c)) continue;
    if (!isBoundaryRing(c)) continue;
    const k = c.map((p) => Math.round(p[0] * 1e6) + "," + Math.round(p[1] * 1e6)).join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return stitchRings(out);
};
var stitchRings = (rings) => {
  const key = (x, y) => Math.round(x * 1e9) + ":" + Math.round(y * 1e9);
  let list = rings.map((r) => r.slice());
  let changed = true;
  while (changed) {
    changed = false;
    outer:
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const A = list[i], B = list[j];
          for (let a = 0; a < A.length; a++) {
            const a0 = A[a], a1 = A[(a + 1) % A.length];
            for (let b = 0; b < B.length; b++) {
              const b0 = B[b], b1 = B[(b + 1) % B.length];
              if (key(a0[0], a0[1]) === key(b1[0], b1[1]) && key(a1[0], a1[1]) === key(b0[0], b0[1])) {
                const merged = [];
                for (let k = 0; k < A.length; k++) merged.push(A[(a + 1 + k) % A.length]);
                for (let k = 1; k < B.length - 1; k++) merged.push(B[(b + 1 + k) % B.length]);
                list.splice(j, 1);
                list.splice(i, 1, cleanRing(merged));
                changed = true;
                break outer;
              }
            }
          }
        }
      }
  }
  return list;
};
var CORNER_TURN_DEG = 30;
var refitRingToSub = (ptsIn, tol = REFIT_TOL) => {
  const pts = cleanRing(ptsIn);
  if (pts.length < 3) return null;
  const n = pts.length;
  const turnAt = (i) => {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1];
    const vx = p2[0] - p1[0], vy = p2[1] - p1[1];
    const lu = Math.hypot(ux, uy) || 1, lv = Math.hypot(vx, vy) || 1;
    const cross2 = (ux * vy - uy * vx) / (lu * lv);
    const dot2 = (ux * vx + uy * vy) / (lu * lv);
    return Math.abs(Math.atan2(cross2, dot2)) * 180 / Math.PI;
  };
  const isCorner = new Array(n).fill(false);
  for (let i = 0; i < n; i++) if (turnAt(i) > CORNER_TURN_DEG) isCorner[i] = true;
  const cornerIdx = [];
  for (let i = 0; i < n; i++) if (isCorner[i]) cornerIdx.push(i);
  const mkNode = (x, y, type, hIn, hOut) => ({
    id: uid(),
    x: rd(x),
    y: rd(y),
    type,
    handleIn: hIn ? { x: rd(hIn[0]), y: rd(hIn[1]) } : null,
    handleOut: hOut ? { x: rd(hOut[0]), y: rd(hOut[1]) } : null
  });
  const nrm22 = (ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  };
  const chainStraight2 = (a, b) => {
    const ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    let i = (a + 1) % n;
    while (i !== b) {
      const px = pts[i][0], py = pts[i][1];
      const cr = Math.abs((px - ax) * dy - (py - ay) * dx) / Math.sqrt(L2);
      if (cr > tol * 0.5) return false;
      i = (i + 1) % n;
    }
    return true;
  };
  const fitChain = (s, e) => {
    const idxs = [];
    let i = s;
    while (true) {
      idxs.push(i);
      if (i === e) break;
      i = (i + 1) % n;
    }
    if (idxs.length < 2) return null;
    const A = pts[s], B = pts[e];
    if (idxs.length === 2 || chainStraight2(s, e)) {
      return { start: null, mids: [], end: null, straight: true };
    }
    const chainPts = idxs.map((k) => ({ x: pts[k][0], y: pts[k][1] }));
    const t1 = nrm22(A[0], A[1], pts[(s + 1) % n][0], pts[(s + 1) % n][1]);
    const t2 = nrm22(B[0], B[1], pts[(e - 1 + n) % n][0], pts[(e - 1 + n) % n][1]);
    const fitted = schneiderFit(chainPts, { x: t1[0], y: t1[1] }, { x: t2[0], y: t2[1] }, tol);
    if (!fitted.length || fitted.length >= idxs.length - 1) {
      return { start: null, mids: idxs.slice(1, -1).map((k) => mkNode(pts[k][0], pts[k][1], "corner", null, null)), end: null, straight: false, polyline: true };
    }
    const mids = [];
    for (let k = 0; k < fitted.length - 1; k++) {
      const c = fitted[k], d = fitted[k + 1];
      mids.push(mkNode(c[3][0], c[3][1], "smooth", c[2], d[1]));
    }
    return { start: fitted[0][1], mids, end: fitted[fitted.length - 1][2], straight: false };
  };
  let nodes = [];
  if (!cornerIdx.length) {
    let s = 0;
    for (let i = 1; i < n; i++) if (pts[i][0] > pts[s][0]) s = i;
    const rot = [];
    for (let k = 0; k < n; k++) rot.push(pts[(s + k) % n]);
    rot.push(pts[s]);
    const t1 = nrm22(rot[0][0], rot[0][1], rot[1][0], rot[1][1]);
    const t2 = nrm22(rot[n][0], rot[n][1], rot[n - 1][0], rot[n - 1][1]);
    const fitted = schneiderFit(rot.map((p) => ({ x: p[0], y: p[1] })), { x: t1[0], y: t1[1] }, { x: t2[0], y: t2[1] }, tol);
    if (!fitted.length) return null;
    const startNode = mkNode(rot[0][0], rot[0][1], "smooth", fitted[fitted.length - 1][2], fitted[0][1]);
    nodes.push(startNode);
    for (let k = 0; k < fitted.length - 1; k++) {
      const c = fitted[k], d = fitted[k + 1];
      nodes.push(mkNode(c[3][0], c[3][1], "smooth", c[2], d[1]));
    }
    return { id: uid(), closed: true, nodes };
  }
  const cornerNodes = /* @__PURE__ */ new Map();
  for (const ci of cornerIdx) {
    cornerNodes.set(ci, mkNode(pts[ci][0], pts[ci][1], "corner", null, null));
  }
  const ordered = [];
  for (let k = 0; k < cornerIdx.length; k++) {
    const s = cornerIdx[k], e = cornerIdx[(k + 1) % cornerIdx.length];
    const res = fitChain(s, e);
    if (!res) continue;
    const nodeA = cornerNodes.get(s);
    const nodeB = cornerNodes.get(e);
    if (res.straight) {
    } else if (res.polyline) {
      if (res.start) nodeA.handleOut = { x: rd(res.start[0]), y: rd(res.start[1]) };
      if (res.end) nodeB.handleIn = { x: rd(res.end[0]), y: rd(res.end[1]) };
      ordered.push(nodeA, ...res.mids);
      continue;
    } else {
      if (res.start) nodeA.handleOut = { x: rd(res.start[0]), y: rd(res.start[1]) };
      if (res.end) nodeB.handleIn = { x: rd(res.end[0]), y: rd(res.end[1]) };
      ordered.push(nodeA, ...res.mids);
      continue;
    }
    ordered.push(nodeA);
  }
  if (ordered.length < 3) return null;
  return { id: uid(), closed: true, nodes: ordered };
};
var ringsToSubs = (rings, tol = REFIT_TOL) => {
  const subs = [];
  for (const r of rings) {
    const sub2 = refitRingToSub(r, tol);
    if (sub2) subs.push(sub2);
  }
  return subs;
};
var SKIA_VERBS = { MOVE: 0, LINE: 1, QUAD: 2, CONIC: 3, CUBIC: 4, CLOSE: 5 };
function objToSkiaPath(kit, obj) {
  const path = new kit.Path();
  if (obj.fillRule === "evenodd" && kit.FillType?.EvenOdd != null) {
    path.setFillType(kit.FillType.EvenOdd);
  } else if (kit.FillType?.Winding != null) {
    path.setFillType(kit.FillType.Winding);
  }
  for (const sp of obj.subs || []) {
    const nodes = sp && sp.nodes;
    if (!nodes || nodes.length < 3 || !sp.closed) continue;
    path.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      const ho = a.handleOut || (a.ox != null ? { x: a.ox, y: a.oy } : null);
      const hi = b.handleIn || (b.ix != null ? { x: b.ix, y: b.iy } : null);
      if (ho || hi) {
        path.cubicTo(
          ho ? ho.x : a.x,
          ho ? ho.y : a.y,
          hi ? hi.x : b.x,
          hi ? hi.y : b.y,
          b.x,
          b.y
        );
      } else {
        path.lineTo(b.x, b.y);
      }
    }
    path.close();
  }
  return path;
}
function skiaCmdsToSubs(cmds) {
  if (!cmds || !cmds.length) return [];
  const subs = [];
  let curNodes = [];
  let curPt = [0, 0];
  let i = 0;
  const finishSub = (closed) => {
    if (curNodes.length >= 2) {
      if (closed && curNodes.length > 1) {
        const first = curNodes[0];
        const last = curNodes[curNodes.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-4) {
          if (last.handleIn) first.handleIn = last.handleIn;
          curNodes.pop();
        }
      }
      if (curNodes.length >= 3) {
        subs.push({ id: uid(), closed: true, nodes: curNodes });
      }
    }
    curNodes = [];
  };
  while (i < cmds.length) {
    const verb = cmds[i++];
    if (verb === SKIA_VERBS.MOVE) {
      if (curNodes.length) finishSub(true);
      const x = rd(cmds[i++]), y = rd(cmds[i++]);
      curPt = [x, y];
      curNodes.push({ id: uid(), x, y, type: "corner", handleIn: null, handleOut: null });
    } else if (verb === SKIA_VERBS.LINE) {
      const x = rd(cmds[i++]), y = rd(cmds[i++]);
      curPt = [x, y];
      curNodes.push({ id: uid(), x, y, type: "corner", handleIn: null, handleOut: null });
    } else if (verb === SKIA_VERBS.QUAD) {
      const qx = cmds[i++], qy = cmds[i++], x = rd(cmds[i++]), y = rd(cmds[i++]);
      const prev = curNodes[curNodes.length - 1];
      if (prev) {
        prev.handleOut = { x: rd(curPt[0] + 2 / 3 * (qx - curPt[0])), y: rd(curPt[1] + 2 / 3 * (qy - curPt[1])) };
      }
      const hi = { x: rd(x + 2 / 3 * (qx - x)), y: rd(y + 2 / 3 * (qy - y)) };
      curPt = [x, y];
      curNodes.push({ id: uid(), x, y, type: "corner", handleIn: hi, handleOut: null });
    } else if (verb === SKIA_VERBS.CONIC) {
      const cx = cmds[i++], cy = cmds[i++], x = rd(cmds[i++]), y = rd(cmds[i++]);
      i++;
      const prev = curNodes[curNodes.length - 1];
      if (prev) {
        prev.handleOut = { x: rd(curPt[0] + 2 / 3 * (cx - curPt[0])), y: rd(curPt[1] + 2 / 3 * (cy - curPt[1])) };
      }
      const hi = { x: rd(x + 2 / 3 * (cx - x)), y: rd(y + 2 / 3 * (cy - y)) };
      curPt = [x, y];
      curNodes.push({ id: uid(), x, y, type: "corner", handleIn: hi, handleOut: null });
    } else if (verb === SKIA_VERBS.CUBIC) {
      const c1x = rd(cmds[i++]), c1y = rd(cmds[i++]);
      const c2x = rd(cmds[i++]), c2y = rd(cmds[i++]);
      const x = rd(cmds[i++]), y = rd(cmds[i++]);
      const prev = curNodes[curNodes.length - 1];
      if (prev) prev.handleOut = { x: c1x, y: c1y };
      curPt = [x, y];
      curNodes.push({ id: uid(), x, y, type: "corner", handleIn: { x: c2x, y: c2y }, handleOut: null });
    } else if (verb === SKIA_VERBS.CLOSE) {
      finishSub(true);
    } else {
      break;
    }
  }
  if (curNodes.length) finishSub(true);
  return subs;
}
function trySkiaBooleanSubs(usable, op) {
  const kit = typeof globalThis !== "undefined" ? globalThis.__geovantaCanvasKit : null;
  if (!kit || !kit.Path || typeof kit.Path.MakeFromOp !== "function" || !kit.PathOp) return null;
  const opMap = {
    union: kit.PathOp.Union,
    intersect: kit.PathOp.Intersect,
    subtract: kit.PathOp.Difference,
    exclude: kit.PathOp.XOR
  };
  const skiaOp = opMap[op];
  if (skiaOp === void 0) return null;
  const paths = [];
  let acc = null;
  try {
    for (const item of usable) paths.push(objToSkiaPath(kit, item.o));
    if (op === "subtract") {
      const topPath = paths[paths.length - 1];
      acc = paths[0].copy();
      for (let i = 1; i < paths.length - 1; i++) {
        const nextAcc = kit.Path.MakeFromOp(acc, paths[i], kit.PathOp.Union);
        acc.delete();
        acc = nextAcc;
        if (!acc) return null;
      }
      const diff = kit.Path.MakeFromOp(acc, topPath, kit.PathOp.Difference);
      acc.delete();
      acc = diff;
    } else {
      acc = paths[0].copy();
      for (let i = 1; i < paths.length; i++) {
        const nextAcc = kit.Path.MakeFromOp(acc, paths[i], skiaOp);
        acc.delete();
        acc = nextAcc;
        if (!acc) return null;
      }
    }
    if (!acc) return null;
    const cmds = acc.toCmds();
    const subs = skiaCmdsToSubs(cmds);
    return subs.length ? subs : null;
  } catch (_) {
    return null;
  } finally {
    for (const p of paths) p?.delete?.();
    acc?.delete?.();
  }
}
var booleanDoc = (doc, op, selIds) => {
  const targets = doc.objects.filter((o) => selIds.has(o.id) && !o.hidden && !o.locked && !o.img && !o.text && o.subs && o.subs.length);
  if (targets.length < 2) return { doc, changed: false, reason: "need2" };
  const perObj = targets.map((o) => ({ o, ...flattenObjToRings(o) }));
  const usable = perObj.filter((p) => p.rings.length > 0);
  if (usable.length < 2) return { doc, changed: false, reason: "need2closed" };
  let resultRings = null;
  let skiaSubs = null;
  if (op !== "divide") {
    skiaSubs = trySkiaBooleanSubs(usable, op);
  }
  if (skiaSubs) {
  } else if (op === "divide") {
    let regions = [{ rings: usable[0].rings, sourceObj: usable[0].o }];
    for (let k2 = 1; k2 < usable.length; k2++) {
      let remnantOfOk = usable[k2].rings;
      const nextRegions = [];
      for (const R of regions) {
        const inter = clipRings(R.rings, usable[k2].rings, "intersect").filter(isValidRing);
        const diff = clipRings(R.rings, usable[k2].rings, "difference").filter(isValidRing);
        if (inter.length > 0) {
          if (diff.length > 0) {
            nextRegions.push({ rings: diff, sourceObj: R.sourceObj });
          }
          nextRegions.push({ rings: inter, sourceObj: usable[k2].o });
          remnantOfOk = clipRings(remnantOfOk, R.rings, "difference").filter(isValidRing);
        } else {
          nextRegions.push(R);
        }
      }
      if (remnantOfOk.length > 0) {
        nextRegions.push({ rings: remnantOfOk, sourceObj: usable[k2].o });
      }
      regions = nextRegions;
    }
    const newObjs = [];
    const names2 = new Set(doc.objects.map((o) => o.name));
    let divCount = 1;
    for (const reg of regions) {
      const subs2 = ringsToSubs(reg.rings);
      if (!subs2.length) continue;
      while (names2.has("Divide-" + divCount)) divCount++;
      const name = "Divide-" + divCount;
      names2.add(name);
      const src = reg.sourceObj;
      const srcFill = src.fill !== void 0 ? src.fill : "#000000";
      const srcStroke = src.stroke !== void 0 ? src.stroke : "none";
      const srcStrokeWidth = src.strokeWidth !== void 0 ? src.strokeWidth : 0;
      newObjs.push({
        id: uid(),
        name,
        type: "path",
        fill: srcFill,
        stroke: srcStroke,
        strokeWidth: srcStrokeWidth,
        strokeLinecap: src.strokeLinecap,
        strokeLinejoin: src.strokeLinejoin,
        strokeMiterlimit: src.strokeMiterlimit,
        strokeDasharray: src.strokeDasharray,
        strokeDashoffset: src.strokeDashoffset,
        strokeAlign: src.strokeAlign,
        blendMode: src.blendMode,
        opacity: src.opacity !== void 0 ? src.opacity : 1,
        group: src.group || null,
        fillRule: "evenodd",
        subs: subs2
      });
    }
    if (!newObjs.length) return { doc, changed: false, reason: "empty" };
    const topObj2 = usable[usable.length - 1].o;
    const ids2 = new Set(usable.map((p) => p.o.id));
    const out2 = [];
    let inserted = false;
    doc.objects.forEach((o) => {
      if (o.id === topObj2.id) {
        out2.push(...newObjs);
        inserted = true;
      } else if (!ids2.has(o.id)) {
        out2.push(o);
      }
    });
    if (!inserted) {
      out2.push(...newObjs);
    }
    const resultIds = newObjs.map((o) => o.id);
    const outRings = newObjs.reduce((s, o) => s + (o.subs ? o.subs.length : 0), 0);
    const outNodes = newObjs.reduce((s, o) => s + (o.subs ? o.subs.reduce((sn, sp) => sn + (sp.nodes ? sp.nodes.length : 0), 0) : 0), 0);
    return {
      doc: { ...doc, objects: out2 },
      changed: true,
      resultIds,
      resultId: resultIds[0],
      stats: {
        inObjects: usable.length,
        outObjects: newObjs.length,
        outRings,
        outNodes,
        skippedOpen: perObj.reduce((s, p) => s + p.skippedOpen, 0)
      }
    };
  } else if (op === "union") {
    resultRings = usable[0].rings;
    for (let i = 1; i < usable.length; i++) resultRings = clipRings(resultRings, usable[i].rings, "union");
  } else if (op === "intersect") {
    resultRings = usable[0].rings;
    for (let i = 1; i < usable.length; i++) {
      resultRings = clipRings(resultRings, usable[i].rings, "intersect");
      if (!resultRings.length) break;
    }
  } else if (op === "subtract") {
    const top = usable[usable.length - 1];
    let base = usable[0].rings;
    for (let i = 1; i < usable.length - 1; i++) base = clipRings(base, usable[i].rings, "union");
    resultRings = clipRings(base, top.rings, "difference");
  } else if (op === "exclude") {
    resultRings = usable[0].rings;
    for (let i = 1; i < usable.length; i++) resultRings = clipRings(resultRings, usable[i].rings, "xor");
  } else {
    return { doc, changed: false, reason: "badop" };
  }
  if (!skiaSubs && (!resultRings || !resultRings.length)) return { doc, changed: false, reason: "empty" };
  const subs = skiaSubs || ringsToSubs(resultRings);
  if (!subs.length) return { doc, changed: false, reason: "empty" };
  const bottom = usable[0].o;
  const topObj = usable[usable.length - 1].o;
  const names = new Set(doc.objects.map((o) => o.name));
  let k = 1;
  while (names.has("Boolean-" + k)) k++;
  const bottomFill = bottom.fill != null && bottom.fill !== "none" ? bottom.fill : typeof bottom.stroke === "string" && bottom.stroke !== "none" ? bottom.stroke : "#000000";
  const bottomStroke = typeof bottom.stroke === "string" && bottom.stroke !== "none" ? bottom.stroke : "none";
  const bottomStrokeWidth = bottom.strokeWidth != null && bottom.strokeWidth > 0 ? bottom.strokeWidth : 0;
  const targetGroup = topObj.group || bottom.group || null;
  const merged = {
    id: uid(),
    name: "Boolean-" + k,
    type: "path",
    fill: bottomFill,
    stroke: bottomStroke,
    strokeWidth: bottomStrokeWidth,
    opacity: bottom.opacity != null ? bottom.opacity : 1,
    fillRule: "evenodd",
    group: targetGroup,
    subs
  };
  const ids = new Set(usable.map((p) => p.o.id));
  const out = [];
  doc.objects.forEach((o) => {
    if (o.id === topObj.id) out.push(merged);
    else if (!ids.has(o.id)) out.push(o);
  });
  return {
    doc: { ...doc, objects: out },
    changed: true,
    resultId: merged.id,
    resultIds: [merged.id],
    stats: {
      engine: skiaSubs ? "skia-pathops" : "greiner-hormann",
      inObjects: usable.length,
      inRings: usable.reduce((s, p) => s + p.rings.length, 0),
      outRings: skiaSubs ? subs.length : resultRings.length,
      outNodes: subs.reduce((s, sp) => s + sp.nodes.length, 0),
      skippedOpen: perObj.reduce((s, p) => s + p.skippedOpen, 0)
    }
  };
};
var pathBoolean_default = booleanDoc;

// src/engine/pathOffset.tsx
var nrm2 = (ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  return [dx / L, dy / L];
};
var lineIntersect = (px, py, ux, uy, qx, qy, vx, vy) => {
  const den = ux * vy - uy * vx;
  if (Math.abs(den) < 1e-14) return null;
  const t = ((qx - px) * vy - (qy - py) * vx) / den;
  return [px + ux * t, py + uy * t];
};
var isValidRingLocal = (pts) => pts.length >= 3 && Math.abs(ringArea(pts)) > 1e-9;
var arcPoints = (cx, cy, r, a0, a1, midAng) => {
  let da = a1 - a0;
  while (da <= -Math.PI) da += Math.PI * 2;
  while (da > Math.PI) da -= Math.PI * 2;
  if (midAng != null) {
    let dMid = midAng - a0;
    while (dMid <= -Math.PI) dMid += Math.PI * 2;
    while (dMid > Math.PI) dMid -= Math.PI * 2;
    if (da > 0 !== dMid > 0 && Math.abs(dMid) > 1e-9) da = da > 0 ? da - Math.PI * 2 : da + Math.PI * 2;
  }
  const steps = Math.max(2, Math.min(24, Math.ceil(Math.abs(da) / (Math.PI / 12))));
  const out = [];
  for (let s = 0; s <= steps; s++) {
    const ang = a0 + da * s / steps;
    out.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  return out;
};
var offsetRingDirect = (ringIn, d, join = "miter", miterLimit = 4) => {
  const ring = cleanRing(ringIn);
  const n = ring.length;
  if (n < 3 || d === 0) return d === 0 ? ring.slice() : null;
  const area = ringArea(ring);
  if (Math.abs(area) < 1e-9) return null;
  const ad = Math.abs(d);
  const sgn = d > 0 ? 1 : -1;
  const outN = (i) => {
    const a = ring[i], b = ring[(i + 1) % n];
    const [tx, ty] = nrm2(a[0], a[1], b[0], b[1]);
    const lx = -ty, ly = tx;
    return area > 0 ? [-lx, -ly] : [lx, ly];
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const prev = ring[(i - 1 + n) % n], next = ring[(i + 1) % n];
    const nIn = outN((i - 1 + n) % n), nOut = outN(i);
    const [tInX, tInY] = nrm2(prev[0], prev[1], p[0], p[1]);
    const [tOutX, tOutY] = nrm2(p[0], p[1], next[0], next[1]);
    const A = [p[0] + nIn[0] * d, p[1] + nIn[1] * d];
    const B = [p[0] + nOut[0] * d, p[1] + nOut[1] * d];
    const cross2 = tInX * tOutY - tInY * tOutX;
    const convexOut = area > 0 ? cross2 > 0 : cross2 < 0;
    const convex = d > 0 ? convexOut : !convexOut;
    const bis = [(nIn[0] + nOut[0]) * sgn, (nIn[1] + nOut[1]) * sgn];
    const bisL = Math.hypot(bis[0], bis[1]);
    const M = lineIntersect(A[0], A[1], tInX, tInY, B[0], B[1], tOutX, tOutY);
    const miterLen = M ? Math.hypot(M[0] - p[0], M[1] - p[1]) : Infinity;
    const miterOk = M && bisL > 1e-9 && (M[0] - p[0]) * bis[0] + (M[1] - p[1]) * bis[1] > 0 && miterLen <= miterLimit * ad + 1e-9;
    if (join === "round" && convex) {
      const a0 = Math.atan2(A[1] - p[1], A[0] - p[0]);
      const a1 = Math.atan2(B[1] - p[1], B[0] - p[0]);
      const midAng = bisL > 1e-9 ? Math.atan2(bis[1], bis[0]) : null;
      out.push(...arcPoints(p[0], p[1], ad, a0, a1, midAng));
    } else if (miterOk) {
      out.push(M);
    } else {
      out.push(A, B);
    }
  }
  const cleaned = cleanRing(out);
  return isValidRingLocal(cleaned) ? cleaned : null;
};
var minDistToRing = (x, y, ring) => {
  let best = Infinity;
  for (let i = 0, n = ring.length; i < n; i++) {
    const ax = ring[i][0], ay = ring[i][1], bx = ring[(i + 1) % n][0], by = ring[(i + 1) % n][1];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const ex = ax + dx * t - x, ey = ay + dy * t - y;
    const dd = ex * ex + ey * ey;
    if (dd < best) best = dd;
  }
  return Math.sqrt(best);
};
var validateOffsetRing = (orig, result, d) => {
  const ad = Math.abs(d);
  const eps = Math.max(0.1, 0.01 * ad);
  const samples = [];
  for (let i = 0, n = result.length; i < n; i++) {
    samples.push(result[i]);
    const q = result[(i + 1) % n];
    samples.push([(result[i][0] + q[0]) / 2, (result[i][1] + q[1]) / 2]);
  }
  for (const [x, y] of samples) {
    if (minDistToRing(x, y, orig) < ad - eps) return false;
    if (d < 0 && windingNumber(x, y, [orig]) === 0) return false;
  }
  if (d > 0) {
    for (const [x, y] of orig) {
      if (windingNumber(x, y, [result]) === 0) return false;
    }
  }
  return true;
};
var removeOffsetLoops = (ringIn, maxIter = 2e3) => {
  let pts = ringIn.slice();
  for (let iter = 0; iter < maxIter; iter++) {
    const n = pts.length;
    if (n < 3) return null;
    let cross2 = null;
    outer: for (let i2 = 0; i2 < n; i2++) {
      const ax = pts[i2][0], ay = pts[i2][1], bx = pts[(i2 + 1) % n][0], by = pts[(i2 + 1) % n][1];
      for (let j2 = i2 + 2; j2 < n; j2++) {
        if (i2 === 0 && j2 === n - 1) continue;
        const cx = pts[j2][0], cy = pts[j2][1], dx = pts[(j2 + 1) % n][0], dy = pts[(j2 + 1) % n][1];
        const hit = segSegIntersect(ax, ay, bx, by, cx, cy, dx, dy);
        if (hit && hit.kind === "cross" && hit.t > 1e-3 && hit.t < 0.999 && hit.u > 1e-3 && hit.u < 0.999) {
          cross2 = { i: i2, j: j2, x: hit.x, y: hit.y };
          break outer;
        }
      }
    }
    if (!cross2) return cleanRing(pts);
    const { i, j, x, y } = cross2;
    const p = [x, y];
    const loopA = [p];
    for (let k = i + 1; k <= j; k++) loopA.push(pts[k]);
    const loopB = [p];
    for (let k = j + 1; k < n; k++) loopB.push(pts[k]);
    for (let k = 0; k <= i; k++) loopB.push(pts[k]);
    const kept = Math.abs(ringArea(loopA)) <= Math.abs(ringArea(loopB)) ? loopB : loopA;
    pts = cleanRing(kept);
    if (!pts || pts.length < 3) return null;
  }
  return null;
};
var offsetRingSafe = (ring, d, join = "miter", miterLimit = 4) => {
  if (d === 0) return [cleanRing(ring)];
  const direct = offsetRingDirect(ring, d, join, miterLimit);
  if (direct && !ringSelfIntersects(direct) && validateOffsetRing(ring, direct, d)) return [direct];
  let cleaned = null;
  if (direct && ringSelfIntersects(direct)) {
    cleaned = removeOffsetLoops(direct);
    if (cleaned && !ringSelfIntersects(cleaned) && validateOffsetRing(ring, cleaned, d)) return [cleaned];
  }
  if (d < 0) return [];
  if (cleaned && !ringSelfIntersects(cleaned)) return [cleaned];
  if (direct && !ringSelfIntersects(direct)) return [direct];
  return [];
};
var ringBBoxLocal = (ring) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const x = ring[i][0], y = ring[i][1];
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
};
var ringInteriorPt = (ring) => {
  let sx = 0, sy = 0;
  for (let i = 0; i < ring.length; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
  }
  const cx = sx / ring.length, cy = sy / ring.length;
  if (ringContainsPt(cx, cy, ring)) return [cx, cy];
  const ys = Array.from(new Set(ring.map((p) => p[1]))).sort((a, b) => a - b);
  for (let k = 0; k + 1 < ys.length; k++) {
    const py = (ys[k] + ys[k + 1]) / 2;
    const xs = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (yi > py !== yj > py) {
        xs.push(xi + (xj - xi) * (py - yi) / (yj - yi));
      }
    }
    if (xs.length >= 2) {
      xs.sort((a, b) => a - b);
      const px = (xs[0] + xs[1]) / 2;
      if (ringContainsPt(px, py, ring)) return [px, py];
    }
  }
  return [ring[0][0], ring[0][1]];
};
var ringStrictlyContains = (outer, inner) => {
  if (Math.abs(ringArea(outer)) <= Math.abs(ringArea(inner)) + 1e-9) return false;
  const [ax0, ay0, ax1, ay1] = ringBBoxLocal(outer);
  const [bx0, by0, bx1, by1] = ringBBoxLocal(inner);
  if (bx0 < ax0 - 1e-6 || by0 < ay0 - 1e-6 || bx1 > ax1 + 1e-6 || by1 > ay1 + 1e-6) return false;
  for (let i = 0; i < outer.length; i++) {
    const a0 = outer[i], a1 = outer[(i + 1) % outer.length];
    for (let j = 0; j < inner.length; j++) {
      const b0 = inner[j], b1 = inner[(j + 1) % inner.length];
      const hit = segSegIntersect(a0[0], a0[1], a1[0], a1[1], b0[0], b0[1], b1[0], b1[1]);
      if (hit && hit.kind === "cross" && hit.t > 1e-6 && hit.t < 1 - 1e-6 && hit.u > 1e-6 && hit.u < 1 - 1e-6) {
        return false;
      }
    }
  }
  const [ix, iy] = ringInteriorPt(inner);
  if (!ringContainsPt(ix, iy, outer)) return false;
  for (let j = 0; j < inner.length; j++) {
    const b0 = inner[j], b1 = inner[(j + 1) % inner.length];
    const mx = (b0[0] + b1[0]) / 2, my = (b0[1] + b1[1]) / 2;
    if (minDistToRing(mx, my, outer) > 1e-5 && !ringContainsPt(mx, my, outer)) return false;
  }
  return true;
};
var ringsTouchOrCross = (a, b) => {
  const [ax0, ay0, ax1, ay1] = ringBBoxLocal(a);
  const [bx0, by0, bx1, by1] = ringBBoxLocal(b);
  if (bx1 < ax0 - 1e-6 || bx0 > ax1 + 1e-6 || by1 < ay0 - 1e-6 || by0 > ay1 + 1e-6) return false;
  for (let i = 0; i < a.length; i++) {
    const a0 = a[i], a1 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b0 = b[j], b1 = b[(j + 1) % b.length];
      if (segSegIntersect(a0[0], a0[1], a1[0], a1[1], b0[0], b0[1], b1[0], b1[1])) return true;
    }
  }
  const [iaX, iaY] = ringInteriorPt(a);
  if (ringContainsPt(iaX, iaY, b)) return true;
  const [ibX, ibY] = ringInteriorPt(b);
  return ringContainsPt(ibX, ibY, a);
};
var unionRingList = (rings) => {
  let acc = [];
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const pos = ringArea(r) > 0 ? r : r.slice().reverse();
    acc = acc.length ? clipRings(acc, [pos], "union") : [pos];
  }
  return acc;
};
var resolveOverlappingGroup = (group, op) => {
  if (group.length <= 1) return group;
  const n = group.length;
  const visited = new Array(n).fill(false);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const comp = [group[i]];
    const queue = [i];
    while (queue.length) {
      const cur = queue.shift();
      for (let j = 0; j < n; j++) {
        if (!visited[j] && ringsTouchOrCross(group[cur], group[j])) {
          visited[j] = true;
          comp.push(group[j]);
          queue.push(j);
        }
      }
    }
    if (comp.length === 1) {
      out.push(comp[0]);
    } else {
      let acc = [ringArea(comp[0]) > 0 ? comp[0] : comp[0].slice().reverse()];
      for (let k = 1; k < comp.length; k++) {
        const nextR = ringArea(comp[k]) > 0 ? comp[k] : comp[k].slice().reverse();
        acc = clipRings(acc, [nextR], op);
      }
      out.push(...acc);
    }
  }
  return out;
};
var computeExplicitDepths = (rings) => {
  return rings.map((r, i) => {
    let d = 0;
    for (let j = 0; j < rings.length; j++) {
      if (i !== j && ringStrictlyContains(rings[j], r)) d++;
    }
    return d;
  });
};
var resolveWorkingRings = (rawRings, fillRule) => {
  if (rawRings.length <= 1) return rawRings;
  if (fillRule === "nonzero") {
    const initDepths = computeExplicitDepths(rawRings);
    const outer0 = [];
    const nested = [];
    for (let i = 0; i < rawRings.length; i++) {
      if (initDepths[i] === 0) outer0.push(rawRings[i]);
      else nested.push(rawRings[i]);
    }
    let working = [...resolveOverlappingGroup(outer0, "union"), ...nested];
    if (working.length <= 1) return working;
    const d2 = computeExplicitDepths(working);
    const byD = /* @__PURE__ */ new Map();
    for (let i = 0; i < working.length; i++) {
      const arr = byD.get(d2[i]) || [];
      arr.push(working[i]);
      byD.set(d2[i], arr);
    }
    const cleaned = [];
    for (const grp of byD.values()) cleaned.push(...resolveOverlappingGroup(grp, "union"));
    return cleaned;
  }
  for (let i = 0; i < rawRings.length; i++) {
    for (let j = i + 1; j < rawRings.length; j++) {
      if (!ringStrictlyContains(rawRings[i], rawRings[j]) && !ringStrictlyContains(rawRings[j], rawRings[i]) && ringsTouchOrCross(rawRings[i], rawRings[j])) {
        return resolveOverlappingGroup(rawRings, "xor");
      }
    }
  }
  return rawRings;
};
var computeAlignedBand = (origRings, depths, align, w, join, miter) => {
  const maxDepth = Math.max(...depths);
  const evenDist = align === "outside" ? w : -w;
  const oddDist = -evenDist;
  let region = [];
  for (let d = 0; d <= maxDepth; d++) {
    const levelRings = origRings.filter((_, i) => depths[i] === d);
    if (!levelRings.length) continue;
    const isEven = d % 2 === 0;
    const pieces = [];
    for (const r of levelRings) pieces.push(...offsetRingSafe(r, isEven ? evenDist : oddDist, join, miter));
    const levelUnion = unionRingList(pieces);
    if (isEven) {
      if (d === 0) {
        if (align === "outside" && !levelUnion.length) return null;
        region = levelUnion;
      } else if (levelUnion.length) {
        region = region.length ? clipRings(region, levelUnion, "union") : levelUnion;
      }
    } else if (levelUnion.length && region.length) {
      region = clipRings(region, levelUnion, "difference");
    }
  }
  if (align === "outside") {
    return region.length ? clipRings(region, origRings, "difference") : null;
  }
  return region.length ? clipRings(origRings, region, "difference") : origRings;
};
var normalizeRingsByExplicitDepth = (rings) => {
  const depths = computeExplicitDepths(rings);
  const norm = normalizeRingOrientations(rings).map((r, i) => {
    const wantPos = depths[i] % 2 === 0;
    return ringArea(r) > 0 === wantPos ? r : r.slice().reverse();
  });
  return { rings: norm, depths };
};
var alignedStrokeOutlineSubs = (o, opts = {}) => {
  const allSubs = Array.isArray(o?.subs) ? o.subs : [];
  const closedSubs = [];
  const openSubs = [];
  for (const sp of allSubs) {
    if (!sp) continue;
    if (sp.closed) closedSubs.push(sp);
    else openSubs.push(sp);
  }
  if (!closedSubs.length) return { subs: [], openSubs, fallback: false };
  const align = effectiveStrokeAlign({ ...o, subs: closedSubs });
  const w = Number(o?.strokeWidth || 0);
  if (align === "center" || !Number.isFinite(w) || w <= 0) {
    return { subs: null, openSubs, fallback: true };
  }
  const { rings: rawRings } = flattenObjToRings({ subs: closedSubs });
  if (!rawRings.length) return { subs: null, openSubs, fallback: true };
  const maxRings = opts.maxRings ?? 64;
  if (rawRings.length > maxRings) return { subs: null, openSubs, fallback: true };
  const join = o.strokeLinejoin || "round";
  const miter = o.strokeMiterlimit || 4;
  const fillRule = o.fillRule === "evenodd" ? "evenodd" : "nonzero";
  const workingRings = resolveWorkingRings(rawRings, fillRule);
  if (!workingRings.length) return { subs: null, openSubs, fallback: true };
  const { rings: origRings, depths } = normalizeRingsByExplicitDepth(workingRings);
  if (origRings.length === 1) {
    const r = origRings[0];
    if (align === "outside") {
      const outer = offsetRingSafe(r, w, join, miter);
      if (!outer.length) return { subs: null, openSubs, fallback: true };
      const subs3 = ringsToSubs([...outer, r.slice().reverse()]);
      return subs3.length ? { subs: subs3, openSubs, fallback: false } : { subs: null, openSubs, fallback: true };
    }
    const inner = offsetRingSafe(r, -w, join, miter);
    const band2 = inner.length ? [r, ...inner.map((ir) => ir.slice().reverse())] : [r];
    const subs2 = ringsToSubs(band2);
    return subs2.length ? { subs: subs2, openSubs, fallback: false } : { subs: null, openSubs, fallback: true };
  }
  const band = computeAlignedBand(origRings, depths, align, w, join, miter);
  if (!band || !band.length) return { subs: null, openSubs, fallback: true };
  const subs = ringsToSubs(normalizeRingsByExplicitDepth(band).rings);
  if (!subs.length) return { subs: null, openSubs, fallback: true };
  return { subs, openSubs, fallback: false };
};

// src/engine/svgDocumentSerializer.tsx
function resolveExportArea(doc, opt = {}) {
  if (doc.objects.some((o) => o.hidden)) doc = {
    ...doc,
    objects: doc.objects.filter((o) => !o.hidden)
  };
  if (opt.area === "sel" && opt.only) {
    const targetIds = new Set(opt.only);
    for (const o of doc.objects) {
      if (opt.only.has(o.id)) {
        if ((o.isFrameBg || o.isAutoFrame) && o.group) {
          for (const ch of doc.objects) {
            if (ch.group === o.group) targetIds.add(ch.id);
          }
        } else if (o.isIconFrame && o.group) {
          for (const ch of doc.objects) {
            if (ch.group === o.group && ch.isIconFrame && !ch.isFrameBg && !ch.isAutoFrame) {
              targetIds.add(ch.id);
            }
          }
        }
      }
    }
    const matched = doc.objects.filter((o) => targetIds.has(o.id));
    if (matched.length > 0) {
      doc = {
        ...doc,
        objects: matched
      };
    }
  }
  let [vx, vy, vw, vh] = doc.viewBox;
  if (opt.area === "content" || opt.area === "sel") {
    const bb = docBounds(doc, null, opt);
    if (bb && bb[2] > bb[0] && bb[3] > bb[1]) {
      const bleed = opt.bleed != null ? opt.bleed : opt.isRaster ? 2 : 0;
      if (bleed > 0) {
        vx = Math.floor((bb[0] - bleed) * 100) / 100;
        vy = Math.floor((bb[1] - bleed) * 100) / 100;
        vw = Math.ceil((bb[2] + bleed - vx) * 100) / 100;
        vh = Math.ceil((bb[3] + bleed - vy) * 100) / 100;
      } else {
        vx = bb[0];
        vy = bb[1];
        vw = bb[2] - bb[0];
        vh = bb[3] - bb[1];
      }
    }
  }
  return { objects: doc.objects, bounds: [vx, vy, Math.max(1, rd(vw)), Math.max(1, rd(vh))] };
}
function effectBbox(o) {
  let b = null;
  try {
    b = tightBBox(o);
  } catch (e) {
    b = null;
  }
  if (!b || !(b[2] > b[0]) || !(b[3] > b[1])) return null;
  let [x0, y0, x1, y1] = b;
  const pad = hasVisibleStroke(o) ? strokeOutwardExtent(o) : 0;
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  if (isLegacyText(o) && o.rot && isFinite(o.rot) && o.rot % 360 !== 0) {
    const t = legacyTextSpec(o);
    const th = -o.rot * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
    let nx0 = 1e18, ny0 = 1e18, nx1 = -1e18, ny1 = -1e18;
    for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
      const rx = t.x + (px - t.x) * c - (py - t.y) * s;
      const ry = t.y + (px - t.x) * s + (py - t.y) * c;
      if (rx < nx0) nx0 = rx;
      if (rx > nx1) nx1 = rx;
      if (ry < ny0) ny0 = ry;
      if (ry > ny1) ny1 = ry;
    }
    return [nx0, ny0, nx1, ny1];
  }
  return [x0, y0, x1, y1];
}
var isVisiblePaintColor = (c) => Boolean(c && c !== "none" && c !== "transparent");
var isIconFrameExportMember = (o) => Boolean(o && !o.hidden && o.isIconFrame && o.group && !o.isFrameBg && !o.isAutoFrame && !o.img && !o.text && o.subs && o.subs.length);
function mergeIconFramesForExport(objects) {
  if (!Array.isArray(objects) || !objects.length) return objects || [];
  let hasIconMember = false;
  for (let i = 0; i < objects.length; i++) {
    if (isIconFrameExportMember(objects[i])) {
      hasIconMember = true;
      break;
    }
  }
  if (!hasIconMember) return objects;
  const gradIds = /* @__PURE__ */ new WeakMap();
  let gradN = 0;
  const gradKey = (g) => {
    if (!g) return "nograd";
    let id = gradIds.get(g);
    if (!id) {
      id = "g" + ++gradN;
      gradIds.set(g, id);
    }
    return id;
  };
  const strokeSig = (m) => {
    const sg = strokeGradOn(m) ? m.strokeGrad : null;
    const hasS = Boolean(sg || isVisiblePaintColor(m.stroke) && m.strokeWidth > 0);
    if (!hasS) return "";
    return [
      m.stroke ?? "",
      m.strokeWidth ?? 0,
      m.strokeLinejoin || "round",
      m.strokeLinecap || "round",
      m.strokeMiterlimit ?? "",
      m.nonScalingStroke ? 1 : 0,
      m.paintOrder || "",
      gradKey(sg),
      m.strokeStyleId || "",
      m.strokeAlign || "center",
      formatDasharray(m.strokeDasharray),
      m.strokeDashoffset ?? "",
      normalizeBlendMode(m.blendMode)
    ].join("\0");
  };
  const fillGroups = /* @__PURE__ */ new Map();
  const memberToGroup = /* @__PURE__ */ new Map();
  for (let i = 0; i < objects.length; i++) {
    const m = objects[i];
    if (!isIconFrameExportMember(m)) continue;
    const grad = gradOn(m) ? m.grad : null;
    if (!grad && !isVisiblePaintColor(m.fill)) continue;
    const src = m.iconSrc || m.id;
    const key = [
      m.group,
      src,
      m.fill ?? "",
      m.opacity ?? 1,
      m.fillRule || "nonzero",
      gradKey(grad),
      normalizeBlendMode(m.blendMode),
      m.strokeAlign || "center"
    ].join("\0");
    let g = fillGroups.get(key);
    if (!g) {
      g = { key, members: [], emitted: false };
      fillGroups.set(key, g);
    }
    g.members.push(m);
    memberToGroup.set(m, g);
  }
  const out = [];
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];
    const g = memberToGroup.get(o);
    if (!g) {
      out.push(o);
      continue;
    }
    if (g.emitted) continue;
    g.emitted = true;
    if (g.members.length === 1) {
      out.push(g.members[0]);
      continue;
    }
    const first = g.members[0];
    const mergedSubs = [];
    for (let j = 0; j < g.members.length; j++) {
      const ms = g.members[j].subs;
      if (ms) for (let k = 0; k < ms.length; k++) mergedSubs.push(ms[k]);
    }
    const firstStroke = strokeSig(first);
    let uniformStroke = true;
    for (let j = 1; j < g.members.length; j++) {
      if (strokeSig(g.members[j]) !== firstStroke) {
        uniformStroke = false;
        break;
      }
    }
    if (uniformStroke) {
      out.push({ ...first, subs: mergedSubs });
    } else {
      out.push({
        ...first,
        subs: mergedSubs,
        stroke: "none",
        strokeWidth: 0,
        strokeGrad: null,
        strokeStyleId: void 0
      });
      for (let j = 0; j < g.members.length; j++) {
        const m = g.members[j];
        if (strokeSig(m)) {
          out.push({
            ...m,
            fill: "none",
            grad: null,
            fillStyleId: void 0
          });
        }
      }
    }
  }
  return out;
}
function serializeDoc(doc, opt = {}) {
  const { objects: rawObjects, bounds: [ox, oy, vw, vh] } = resolveExportArea(doc, opt);
  const objects = mergeIconFramesForExport(rawObjects);
  let body = "", open = null, hasImg = false, gdefs = "", gn = 0;
  const fxDefs = /* @__PURE__ */ new Map();
  const fxAttrs = (o) => {
    if (!o.effects || !o.effects.length) return "";
    const bbox = effectBbox(o);
    const id = effectsFilterId(o.effects, bbox);
    if (id && !fxDefs.has(id)) fxDefs.set(id, effectsFilterDefs(o.effects, id, bbox));
    return ' data-effects="' + esc(JSON.stringify(o.effects)) + '"' + (id ? ' filter="url(#' + id + ')"' : "");
  };
  const dashAttrs = (o) => {
    if (hasVisibleStroke(o) && o.strokeDasharray && o.strokeDasharray.length) {
      const fd = formatDasharray(o.strokeDasharray);
      if (!fd) return "";
      const s = ' stroke-dasharray="' + fd + '"';
      return s + (o.strokeDashoffset ? ' stroke-dashoffset="' + rd(o.strokeDashoffset) + '"' : "");
    }
    return "";
  };
  const blendStyleAttr = (o) => {
    const bm = normalizeBlendMode(o.blendMode);
    return bm !== "normal" ? ' style="mix-blend-mode:' + bm + ';"' : "";
  };
  const used = /* @__PURE__ */ new Set(), gseen = /* @__PURE__ */ new Set();
  const uq = (b) => {
    b = String(b || "path").replace(/[^\w\-.:]/g, "-");
    if (!/^[A-Za-z_]/.test(b)) b = "id-" + b;
    let k = b, i = 2;
    while (used.has(k)) k = b + "-" + i++;
    used.add(k);
    return k;
  };
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  if (opt.bg && opt.bg.mode === "solid") body += '<rect x="0" y="0" width="' + vw + '" height="' + vh + '" fill="' + esc(opt.bg.color || "#ffffff") + '"/>';
  objects.forEach((o) => {
    if ((o.isFrameBg || o.isAutoFrame) && !isVisibleFrameBg(o)) return;
    if (o.group !== open) {
      if (open) body += "</g>";
      if (o.group) {
        const isF = o.containerType === "frame" || o.isAutoFrame || o.isFrameBg || /^frame/i.test(o.group);
        const gOp = o.groupOpacity != null && o.groupOpacity < 1 ? ' opacity="' + rd(o.groupOpacity) + '"' : "";
        body += "<g" + (gseen.has(o.group) ? "" : ' id="' + esc(o.group) + '"') + (isF ? ' data-container="frame"' : "") + gOp + ">";
        gseen.add(o.group);
      }
      open = o.group;
    }
    if (o.img) {
      const m = imageMatrix(o);
      if (!m || !isSafeImageHref(o.img.href)) return;
      hasImg = true;
      const mS = [m[0], m[1], m[2], m[3], m[4] - ox, m[5] - oy];
      body += '<image id="' + uq(o.name) + '" data-id="' + esc(o.id) + '" href="' + esc(o.img.href) + '" xlink:href="' + esc(o.img.href) + '" x="0" y="0" width="' + r6(o.img.w) + '" height="' + r6(o.img.h) + '" preserveAspectRatio="' + esc(o.img.par || "xMidYMid meet") + '" image-rendering="optimizeQuality" transform="matrix(' + mS.map(r6).join(" ") + ')"' + ((o.opacity ?? 1) !== 1 ? ' opacity="' + rd(o.opacity) + '"' : "") + blendStyleAttr(o) + fxAttrs(o) + "/>";
      return;
    }
    if (isLegacyText(o)) {
      const t = legacyTextSpec(o);
      if (!t?.content) return;
      const display = applyTextCase(t.content, t.textCase);
      const lines = display.split(/\r?\n/);
      const spans = lines.map((line, index) => '<tspan x="' + r6(t.x - ox) + '"' + (index ? ' dy="' + r6(t.fontSize * t.lineHeight + (t.paragraphSpacing || 0)) + '"' : "") + ">" + esc(line).replace(/>/g, "&gt;") + "</tspan>").join("");
      const lsAttr = t.letterSpacing ? ' letter-spacing="' + r6(t.letterSpacing) + '"' : "";
      const decAttr = t.textDecoration === "underline" ? ' text-decoration="underline"' : t.textDecoration === "strikethrough" ? ' text-decoration="line-through"' : "";
      const rotAttr = o.rot ? ' transform="rotate(' + r6(-o.rot) + " " + r6(t.x - ox) + " " + r6(t.y - oy) + ')"' : "";
      let textFillA = esc(t.fill);
      if (gradOn(o)) {
        const gid = "grad-" + ++gn;
        gdefs += gradXml(o.grad, gid, ox, oy);
        textFillA = "url(#" + gid + ")";
      }
      if (o.textOnPath?.pathD) {
        const tpId = "tp-" + ++gn;
        gdefs += `<path id="${tpId}" d="${esc(o.textOnPath.pathD)}"/>`;
        const tpOffset = o.textOnPath.startOffset ? ` startOffset="${rd(o.textOnPath.startOffset)}"` : "";
        body += '<text id="' + uq(o.name || o.id || "text") + '" data-id="' + esc(o.id) + '" font-size="' + r6(t.fontSize) + '" font-family="' + esc(t.fontFamily) + '" font-weight="' + esc(t.fontWeight) + '" font-style="' + esc(t.fontStyle) + '" fill="' + textFillA + '" opacity="' + r6(t.opacity) + '"' + blendStyleAttr(o) + fxAttrs(o) + '><textPath href="#' + tpId + '"' + tpOffset + ">" + esc(display) + "</textPath></text>";
        return;
      }
      body += '<text id="' + uq(o.name || o.id || "text") + '" data-id="' + esc(o.id) + '"' + (o.gen ? ' data-gen="' + esc(JSON.stringify(o.gen)) + '"' : "") + (o.fillStyleId ? ' data-fill-style="' + esc(o.fillStyleId) + '"' : "") + ' x="' + r6(t.x - ox) + '" y="' + r6(t.y - oy) + '" font-size="' + r6(t.fontSize) + '" font-family="' + esc(t.fontFamily) + '" font-weight="' + esc(t.fontWeight) + '" font-style="' + esc(t.fontStyle) + '" text-anchor="' + esc(t.textAnchor === "justify" ? "start" : t.textAnchor) + '"' + lsAttr + decAttr + rotAttr + ' fill="' + textFillA + '" opacity="' + r6(t.opacity) + '"' + blendStyleAttr(o) + fxAttrs(o) + ">" + spans + "</text>";
      return;
    }
    let fillA = esc(o.fill === "transparent" || !o.fill ? "none" : o.fill);
    if (gradOn(o)) {
      const gid = "grad-" + ++gn;
      gdefs += gradXml(o.grad, gid, ox, oy);
      fillA = "url(#" + gid + ")";
    }
    const strokeVisible = hasVisibleStroke(o);
    let strokeA = esc(o.stroke === "transparent" || !o.stroke ? "none" : o.stroke);
    if (strokeGradOn(o)) {
      const sgid = "sgrad-" + ++gn;
      gdefs += gradXml(o.strokeGrad, sgid, ox, oy);
      strokeA = "url(#" + sgid + ")";
    }
    let objClipAttr = "";
    if (o.clipPathD) {
      const objClipId = "clip-" + ++gn;
      gdefs += '<clipPath id="' + objClipId + '"><path d="' + esc(o.clipPathD) + '"' + (o.clipRule === "evenodd" ? ' clip-rule="evenodd"' : "") + "/></clipPath>";
      objClipAttr = ' clip-path="url(#' + objClipId + ')"';
    }
    let objMarkerAttrs = "";
    if (strokeVisible && (o.strokeMarkerStart && o.strokeMarkerStart !== "none" || o.strokeMarkerEnd && o.strokeMarkerEnd !== "none")) {
      const mColor = esc(o.stroke === "transparent" || !o.stroke ? "#000000" : o.stroke);
      if (o.strokeMarkerStart && o.strokeMarkerStart !== "none") {
        const msId = "mk-s-" + ++gn;
        gdefs += buildMarkerSvgDef(msId, o.strokeMarkerStart, mColor, o.strokeWidth || 1);
        objMarkerAttrs += ' marker-start="url(#' + msId + ')"';
      }
      if (o.strokeMarkerEnd && o.strokeMarkerEnd !== "none") {
        const meId = "mk-e-" + ++gn;
        gdefs += buildMarkerSvgDef(meId, o.strokeMarkerEnd, mColor, o.strokeWidth || 1);
        objMarkerAttrs += ' marker-end="url(#' + meId + ')"';
      }
    }
    let extraStackAttrs = "";
    if (Array.isArray(o.extraFills) && o.extraFills.length) {
      extraStackAttrs += ' data-extra-fills="' + esc(JSON.stringify(o.extraFills)) + '"';
      for (const ef of o.extraFills) {
        if (ef && !ef.disabled && ef.pattern && ef.pattern !== "none") {
          const patId = "pat-" + ++gn;
          const pCol = esc(ef.color || "#000000");
          const pBody = ef.pattern === "dots" ? `<circle cx="6" cy="6" r="2" fill="${pCol}"/>` : ef.pattern === "stripes" ? `<rect x="0" y="0" width="4" height="12" fill="${pCol}"/>` : `<rect x="0" y="0" width="6" height="6" fill="${pCol}"/>`;
          gdefs += `<pattern id="${patId}" width="12" height="12" patternUnits="userSpaceOnUse">${pBody}</pattern>`;
        }
      }
    }
    if (Array.isArray(o.extraStrokes) && o.extraStrokes.length) {
      extraStackAttrs += ' data-extra-strokes="' + esc(JSON.stringify(o.extraStrokes)) + '"';
    }
    const align = effectiveStrokeAlign(o);
    if (align === "center" || !strokeVisible) {
      body += '<path id="' + uq(o.name) + '" data-id="' + esc(o.id) + '"' + (o.gen ? ' data-gen="' + esc(JSON.stringify(o.gen)) + '"' : "") + (o.fillStyleId ? ' data-fill-style="' + esc(o.fillStyleId) + '"' : "") + (o.strokeStyleId ? ' data-stroke-style="' + esc(o.strokeStyleId) + '"' : "") + ' fill="' + fillA + '"' + (strokeVisible ? ' stroke="' + strokeA + '" stroke-width="' + rd(o.strokeWidth) + '" stroke-linejoin="' + esc(o.strokeLinejoin || "round") + '" stroke-linecap="' + esc(o.strokeLinecap || "round") + '"' + (o.strokeMiterlimit ? ' stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"' : "") + (o.nonScalingStroke ? ' vector-effect="non-scaling-stroke"' : "") + dashAttrs(o) : "") + (o.paintOrder ? ' paint-order="' + esc(o.paintOrder) + '"' : "") + ((o.opacity ?? 1) !== 1 ? ' opacity="' + rd(o.opacity) + '"' : "") + blendStyleAttr(o) + (o.fillRule === "evenodd" ? ' fill-rule="evenodd"' : "") + objClipAttr + objMarkerAttrs + extraStackAttrs + ' d="' + serializePath(o, ox, oy) + '"' + fxAttrs(o) + "/>";
    } else {
      const closedSubs = (o.subs || []).filter((sp) => sp.closed);
      const openSubs = (o.subs || []).filter((sp) => !sp.closed);
      const origD = serializePath(o, ox, oy);
      const closedOrigD = closedSubs.map((sp) => serializeSub(sp, ox, oy)).join(" ");
      const fillEl = '<path data-geovanta-role="fill" fill="' + fillA + '"' + (o.fillRule === "evenodd" ? ' fill-rule="evenodd"' : "") + ' stroke="none" d="' + origD + '"/>';
      let strokeClosedEl = "";
      const isDashed = parseDasharray(o.strokeDasharray) != null;
      if (!isDashed) {
        const exp = alignedStrokeOutlineSubs(o);
        if (exp.subs && !exp.fallback) {
          const expandedD = exp.subs.map((sp) => serializeSub(sp, ox, oy)).join(" ");
          strokeClosedEl = '<path data-geovanta-role="stroke-outline" fill="' + strokeA + '" fill-rule="evenodd" stroke="none" d="' + expandedD + '"/>';
        }
      }
      if (!strokeClosedEl) {
        const commonAttrs = ' fill="none" stroke="' + strokeA + '" stroke-width="' + rd(o.strokeWidth * 2) + '" stroke-linejoin="' + esc(o.strokeLinejoin || "round") + '" stroke-linecap="' + esc(o.strokeLinecap || "round") + '"' + (o.strokeMiterlimit ? ' stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"' : "") + (o.nonScalingStroke ? ' vector-effect="non-scaling-stroke"' : "") + dashAttrs(o);
        if (align === "inside") {
          const clipId = "sa-clip-" + ++gn;
          gdefs += '<clipPath id="' + clipId + '"><path d="' + closedOrigD + '"' + (o.fillRule === "evenodd" ? ' fill-rule="evenodd"' : "") + "/></clipPath>";
          strokeClosedEl = '<path data-geovanta-role="stroke-dashed"' + commonAttrs + ' clip-path="url(#' + clipId + ')" d="' + closedOrigD + '"/>';
        } else {
          let cbb = null;
          try {
            cbb = tightBBox({ subs: closedSubs });
          } catch (e) {
            cbb = null;
          }
          if (!cbb || !cbb.every((v) => Number.isFinite(v))) cbb = [0, 0, 100, 100];
          const mPad = (o.strokeWidth || 1) * (o.strokeMiterlimit || 4) + 8;
          const mx = cbb[0] - mPad, my = cbb[1] - mPad, mw = Math.max(1, cbb[2] - cbb[0] + mPad * 2), mh = Math.max(1, cbb[3] - cbb[1] + mPad * 2);
          const maskId = "sa-mask-" + ++gn;
          gdefs += '<mask id="' + maskId + '" maskUnits="userSpaceOnUse" x="' + rd(mx - ox) + '" y="' + rd(my - oy) + '" width="' + rd(mw) + '" height="' + rd(mh) + '"><rect x="' + rd(mx - ox) + '" y="' + rd(my - oy) + '" width="' + rd(mw) + '" height="' + rd(mh) + '" fill="#ffffff"/><path d="' + closedOrigD + '" fill="#000000"' + (o.fillRule === "evenodd" ? ' fill-rule="evenodd"' : "") + "/></mask>";
          strokeClosedEl = '<path data-geovanta-role="stroke-dashed"' + commonAttrs + ' mask="url(#' + maskId + ')" d="' + closedOrigD + '"/>';
        }
      }
      let strokeEl = strokeClosedEl;
      if (openSubs.length > 0) {
        const openD = openSubs.map((sp) => serializeSub(sp, ox, oy)).join(" ");
        const openEl = '<path data-geovanta-role="stroke-open" fill="none" stroke="' + strokeA + '" stroke-width="' + rd(o.strokeWidth) + '" stroke-linejoin="' + esc(o.strokeLinejoin || "round") + '" stroke-linecap="' + esc(o.strokeLinecap || "round") + '"' + (o.strokeMiterlimit ? ' stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"' : "") + (o.nonScalingStroke ? ' vector-effect="non-scaling-stroke"' : "") + dashAttrs(o) + ' d="' + openD + '"/>';
        strokeEl = strokeClosedEl + openEl;
      }
      let wrapperAttrs = ' data-stroke-width="' + rd(o.strokeWidth) + '" data-stroke-linecap="' + esc(o.strokeLinecap || "round") + '" data-stroke-linejoin="' + esc(o.strokeLinejoin || "round") + '"';
      if (o.strokeMiterlimit && Number.isFinite(o.strokeMiterlimit)) wrapperAttrs += ' data-stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"';
      if (o.paintOrder) wrapperAttrs += ' data-paint-order="' + esc(o.paintOrder) + '"';
      const fDash = formatDasharray(o.strokeDasharray);
      if (fDash) wrapperAttrs += ' data-stroke-dasharray="' + esc(fDash) + '"';
      if (o.strokeDashoffset && Number.isFinite(o.strokeDashoffset)) wrapperAttrs += ' data-stroke-dashoffset="' + rd(o.strokeDashoffset) + '"';
      if (o.nonScalingStroke) wrapperAttrs += ' data-non-scaling-stroke="true"';
      if (o.fillStyleId) wrapperAttrs += ' data-fill-style="' + esc(o.fillStyleId) + '"';
      if (o.strokeStyleId) wrapperAttrs += ' data-stroke-style="' + esc(o.strokeStyleId) + '"';
      if (o.gen) wrapperAttrs += ' data-gen="' + esc(JSON.stringify(o.gen)) + '"';
      if ((o.opacity ?? 1) !== 1) wrapperAttrs += ' opacity="' + rd(o.opacity) + '"';
      wrapperAttrs += blendStyleAttr(o);
      wrapperAttrs += fxAttrs(o);
      if (o.paintOrder === "stroke fill") {
        body += '<g id="' + uq(o.name) + '" data-id="' + esc(o.id) + '" data-geovanta-stroke-align="' + align + '"' + wrapperAttrs + ">" + strokeEl + fillEl + "</g>";
      } else {
        body += '<g id="' + uq(o.name) + '" data-id="' + esc(o.id) + '" data-geovanta-stroke-align="' + align + '"' + wrapperAttrs + ">" + fillEl + strokeEl + "</g>";
      }
    }
  });
  if (open) body += "</g>";
  const meta = doc.styles && doc.styles.length ? '<metadata id="geovanta-doc">' + esc(JSON.stringify({ styles: doc.styles })) + "</metadata>" : "";
  const allDefs = gdefs + [...fxDefs.values()].join("");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"' + (hasImg ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : "") + ' version="1.1" width="' + vw + '" height="' + vh + '" viewBox="0 0 ' + vw + " " + vh + '" shape-rendering="geometricPrecision">' + meta + (allDefs ? "<defs>" + allDefs + "</defs>" : "") + body + "</svg>";
}
var svgDocumentSerializer_default = serializeDoc;

// src/engine/topologicalCurveSimplifier.tsx
var topologicalCurveSimplifier_exports = {};
__export(topologicalCurveSimplifier_exports, {
  SIMPLIFY_LEVEL: () => SIMPLIFY_LEVEL,
  VC_GL5_W: () => VC_GL5_W,
  VC_GL5_X: () => VC_GL5_X,
  VC_MAX_REPARAM: () => VC_MAX_REPARAM,
  VC_MEASURE_LIMIT: () => VC_MEASURE_LIMIT,
  autoSimplifyDoc: () => autoSimplifyDoc,
  autoSimplifyLevel: () => autoSimplifyLevel,
  fixAllAnomalies: () => fixAllAnomalies,
  fixAnomaly: () => fixAnomaly,
  simplifyDoc: () => simplifyDoc,
  simplifyLevelTolerance: () => simplifyLevelTolerance,
  simplifyPart: () => simplifyPart,
  simplifyRun: () => simplifyRun,
  simplifySubpath: () => simplifySubpath,
  simplifyWith: () => simplifyWith,
  vcAnchorWithHandles: () => vcAnchorWithHandles,
  vcBern: () => vcBern,
  vcChordParams: () => vcChordParams,
  vcCollapseStackedCornerNodes: () => vcCollapseStackedCornerNodes,
  vcCubicSpeedAt: () => vcCubicSpeedAt,
  vcDedup: () => vcDedup,
  vcEndTangent: () => vcEndTangent,
  vcEvalCubic: () => vcEvalCubic,
  vcFitCubics: () => vcFitCubics,
  vcFitPieceShapePreserving: () => vcFitPieceShapePreserving,
  vcFitRec: () => vcFitRec,
  vcFitSingle: () => vcFitSingle,
  vcFitSingleFrom: () => vcFitSingleFrom,
  vcGaussArclenInterval: () => vcGaussArclenInterval,
  vcGenerate: () => vcGenerate,
  vcIsCollinearHandles: () => vcIsCollinearHandles,
  vcIsStraight: () => vcIsStraight,
  vcJoinSegSamples: () => vcJoinSegSamples,
  vcJointTurnDeg: () => vcJointTurnDeg,
  vcMaxError: () => vcMaxError,
  vcMeasuredArclen: () => vcMeasuredArclen,
  vcNewton: () => vcNewton,
  vcNoWorse: () => vcNoWorse,
  vcPreSamplePiece: () => vcPreSamplePiece,
  vcRdp: () => vcRdp,
  vcReverseCubicSeg: () => vcReverseCubicSeg,
  vcReverseSegList: () => vcReverseSegList,
  vcSample: () => vcSample,
  vcSegLine: () => vcSegLine,
  vcSegsToSubpath: () => vcSegsToSubpath,
  vcSimplifyOpenChainNodes: () => vcSimplifyOpenChainNodes,
  vcSimplifyRuns: () => vcSimplifyRuns,
  vcSmoothPoints: () => vcSmoothPoints,
  vcStartTangent: () => vcStartTangent,
  vcSubpathSegCount: () => vcSubpathSegCount,
  vcSubpathSegIsLine: () => vcSubpathSegIsLine,
  vcSubpathSegment: () => vcSubpathSegment,
  vcSubpathSegs: () => vcSubpathSegs,
  vcTopologicalSimplifyObjects: () => vcTopologicalSimplifyObjects,
  vcTurnDeg: () => vcTurnDeg,
  vcUnit: () => vcUnit,
  vcWithHandle: () => vcWithHandle
});

// src/engine/curveDeviation.tsx
function flatten(segments, error) {
  const points = [segments[0].c.p0.x, segments[0].c.p0.y];
  const stats = { vertexCount: 1, segmentCount: 0, maxDepthReached: 0, maxDepthHit: 0, toleranceMet: true };
  for (const { c, line } of segments) {
    if (line) {
      points.push(c.p3.x, c.p3.y);
      stats.vertexCount++;
    } else {
      flattenCubicAdaptive(
        { ...c.p0, handleOut: c.p1 },
        { ...c.p3, handleIn: c.p2 },
        error * error,
        points,
        0,
        0,
        stats
      );
      if (!stats.toleranceMet) return null;
    }
  }
  return points;
}
function edgesFor(points) {
  const edges = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const x = points[i], y = points[i + 1];
    const dx = points[i + 2] - x, dy = points[i + 3] - y;
    edges.push({ x, y, dx, dy, lengthSq: dx * dx + dy * dy });
  }
  return edges;
}
function edgeTree(edges, lo = 0, hi = edges.length) {
  if (hi - lo > 8) {
    const mid = lo + hi >> 1;
    const a = edgeTree(edges, lo, mid), b = edgeTree(edges, mid, hi);
    return {
      left: Math.min(a.left, b.left),
      top: Math.min(a.top, b.top),
      right: Math.max(a.right, b.right),
      bottom: Math.max(a.bottom, b.bottom),
      children: [a, b]
    };
  }
  const leaf = edges.slice(lo, hi);
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (const { x, y, dx, dy } of leaf) {
    bounds.left = Math.min(bounds.left, x, x + dx);
    bounds.top = Math.min(bounds.top, y, y + dy);
    bounds.right = Math.max(bounds.right, x, x + dx);
    bounds.bottom = Math.max(bounds.bottom, y, y + dy);
  }
  return { ...bounds, edges: leaf };
}
function containsChord(tree, ax, ay, bx, by, radius, radiusSq) {
  if (Math.min(ax, bx) < tree.left - radius || Math.max(ax, bx) > tree.right + radius || Math.min(ay, by) < tree.top - radius || Math.max(ay, by) > tree.bottom + radius) return false;
  if ("children" in tree) return tree.children.some((child) => containsChord(child, ax, ay, bx, by, radius, radiusSq));
  return tree.edges.some(({ x, y, dx, dy, lengthSq }) => pointToChordDistSq(ax, ay, x, y, dx, dy, lengthSq) <= radiusSq && pointToChordDistSq(bx, by, x, y, dx, dy, lengthSq) <= radiusSq);
}
function coveredBy(source, target, radius) {
  const tree = edgeTree(target);
  const radiusSq = radius * radius;
  let budget = 2e5;
  const covered = (ax, ay, bx, by, depth) => {
    if (--budget < 0) return false;
    if (containsChord(tree, ax, ay, bx, by, radius, radiusSq)) return true;
    if (depth === 22) return false;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    return containsChord(tree, mx, my, mx, my, radius, radiusSq) && covered(ax, ay, mx, my, depth + 1) && covered(mx, my, bx, by, depth + 1);
  };
  return source.every(({ x, y, dx, dy }) => covered(x, y, x + dx, y + dy, 0));
}
function withinCurveTolerance(source, candidate, tolerance) {
  if (source.length === candidate.length && source.every(({ c }, i) => {
    const other = candidate[i].c;
    return c.p0.x === other.p0.x && c.p0.y === other.p0.y && c.p1.x === other.p1.x && c.p1.y === other.p1.y && c.p2.x === other.p2.x && c.p2.y === other.p2.y && c.p3.x === other.p3.x && c.p3.y === other.p3.y;
  })) return true;
  if (!source.length || !candidate.length) return false;
  if (!(tolerance > 0) || !Number.isFinite(tolerance)) return false;
  const sourceError = source.every((segment) => segment.line) ? 0 : tolerance / 16;
  const candidateError = candidate.every((segment) => segment.line) ? 0 : tolerance / 16;
  const a = flatten(source, sourceError);
  const b = flatten(candidate, candidateError);
  if (!a || !b) return false;
  const radius = tolerance - sourceError - candidateError;
  const edgesA = edgesFor(a);
  const edgesB = edgesFor(b);
  return coveredBy(edgesA, edgesB, radius) && coveredBy(edgesB, edgesA, radius);
}

// src/engine/topologicalCurveSimplifier.tsx
var SIMPLIFY_LEVEL = 50;
var VC_MAX_REPARAM = 6;
var VC_MEASURE_LIMIT = 1e9;
function simplifyLevelTolerance(level) {
  const l = Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : SIMPLIFY_LEVEL;
  return Math.pow(2, (SIMPLIFY_LEVEL - l) / 10);
}
function autoSimplifyLevel(size) {
  if (!(Number.isFinite(size) && size > 0)) return 100;
  const target = Math.min(0.62, Math.max(0.08, size / 1600));
  return Math.max(0, Math.min(100, Math.ceil(SIMPLIFY_LEVEL - 10 * Math.log2(target))));
}
function vcUnit(v) {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-9 ? {
    x: v.x / l,
    y: v.y / l
  } : null;
}
function vcStartTangent(c) {
  return vcUnit(sub(c.p1, c.p0)) || vcUnit(sub(c.p2, c.p0)) || vcUnit(sub(c.p3, c.p0)) || {
    x: 1,
    y: 0
  };
}
function vcEndTangent(c) {
  return vcUnit(sub(c.p3, c.p2)) || vcUnit(sub(c.p3, c.p1)) || vcUnit(sub(c.p3, c.p0)) || {
    x: 1,
    y: 0
  };
}
function vcDedup(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (!out.length || dist(out[out.length - 1], p) > 1e-12) {
      out.push({
        x: p.x,
        y: p.y
      });
    }
  }
  return out;
}
function vcChordParams(pts) {
  const u = new Array(pts.length);
  u[0] = 0;
  for (let i = 1; i < pts.length; i++) {
    u[i] = u[i - 1] + dist(pts[i], pts[i - 1]);
  }
  const total = u[u.length - 1];
  if (total > 1e-12) {
    for (let i = 0; i < u.length; i++) u[i] /= total;
    u[u.length - 1] = 1;
  }
  return u;
}
function vcBern(u) {
  const v = 1 - u;
  return [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u];
}
function vcEvalCubic(c, t) {
  const [b0, b1, b2, b3] = vcBern(t);
  return {
    x: b0 * c.p0.x + b1 * c.p1.x + b2 * c.p2.x + b3 * c.p3.x,
    y: b0 * c.p0.y + b1 * c.p1.y + b2 * c.p2.y + b3 * c.p3.y
  };
}
function vcGenerate(pts, u, t0, t1) {
  const p0 = pts[0], p3 = pts[pts.length - 1];
  const seg2 = dist(p0, p3);
  const dirIn = {
    x: -t1.x,
    y: -t1.y
  };
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < pts.length; i++) {
    const [b0, b1, b2, b3] = vcBern(u[i]);
    const a1x = t0.x * b1, a1y = t0.y * b1;
    const a2x = dirIn.x * b2, a2y = dirIn.y * b2;
    c00 += a1x * a1x + a1y * a1y;
    c01 += a1x * a2x + a1y * a2y;
    c11 += a2x * a2x + a2y * a2y;
    const baseX = p0.x * (b0 + b1) + p3.x * (b2 + b3);
    const baseY = p0.y * (b0 + b1) + p3.y * (b2 + b3);
    const rhsX = pts[i].x - baseX;
    const rhsY = pts[i].y - baseY;
    x0 += a1x * rhsX + a1y * rhsY;
    x1 += a2x * rhsX + a2y * rhsY;
  }
  const det = c00 * c11 - c01 * c01;
  const fallback = seg2 / 3;
  let al = fallback, ar = fallback;
  if (Math.abs(det) > 1e-12) {
    al = (x0 * c11 - x1 * c01) / det;
    ar = (c00 * x1 - c01 * x0) / det;
  }
  const minA = 1e-6 * seg2;
  if (!Number.isFinite(al) || !Number.isFinite(ar) || al < minA || ar < minA) {
    al = fallback;
    ar = fallback;
  }
  const cap = seg2 * 1.15 + 1e-9;
  al = Math.min(al, cap);
  ar = Math.min(ar, cap);
  return {
    p0: {
      x: p0.x,
      y: p0.y
    },
    p1: {
      x: p0.x + t0.x * al,
      y: p0.y + t0.y * al
    },
    p2: {
      x: p3.x + dirIn.x * ar,
      y: p3.y + dirIn.y * ar
    },
    p3: {
      x: p3.x,
      y: p3.y
    }
  };
}
function vcMaxError(pts, c, u) {
  let maxD2 = 0, split = Math.floor(pts.length / 2);
  for (let i = 1; i < pts.length - 1; i++) {
    const q = vcEvalCubic(c, u[i]);
    const dx = pts[i].x - q.x, dy = pts[i].y - q.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxD2) {
      maxD2 = d2;
      split = i;
    }
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const qMid = vcEvalCubic(c, 0.5 * (u[i] + u[i + 1]));
    const mx = 0.5 * (pts[i].x + pts[i + 1].x), my = 0.5 * (pts[i].y + pts[i + 1].y);
    const dx = mx - qMid.x, dy = my - qMid.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxD2) {
      maxD2 = d2;
      split = Math.max(1, Math.min(pts.length - 2, i));
    }
  }
  return [Math.sqrt(maxD2), split];
}
function vcNewton(c, p, u) {
  const q = vcEvalCubic(c, u);
  const v = 1 - u;
  const q0x = 3 * (c.p1.x - c.p0.x), q0y = 3 * (c.p1.y - c.p0.y);
  const q1x = 3 * (c.p2.x - c.p1.x), q1y = 3 * (c.p2.y - c.p1.y);
  const q2x = 3 * (c.p3.x - c.p2.x), q2y = 3 * (c.p3.y - c.p2.y);
  const d1x = v * v * q0x + 2 * v * u * q1x + u * u * q2x;
  const d1y = v * v * q0y + 2 * v * u * q1y + u * u * q2y;
  const d2x = v * 2 * (q1x - q0x) + u * 2 * (q2x - q1x);
  const d2y = v * 2 * (q1y - q0y) + u * 2 * (q2y - q1y);
  const diffX = q.x - p.x, diffY = q.y - p.y;
  const num = diffX * d1x + diffY * d1y;
  const den = d1x * d1x + d1y * d1y + (diffX * d2x + diffY * d2y);
  if (Math.abs(den) <= 1e-12) return u;
  return Math.max(0, Math.min(1, u - num / den));
}
function vcFitSingleFrom(pts, uIn, t0, t1) {
  const u = uIn.slice();
  let best = vcGenerate(pts, u, t0, t1);
  let [bestErr, split] = vcMaxError(pts, best, u);
  for (let iter = 0; iter < VC_MAX_REPARAM; iter++) {
    for (let i = 1; i < pts.length - 1; i++) {
      u[i] = vcNewton(best, pts[i], u[i]);
    }
    for (let i = 1; i < u.length; i++) {
      if (u[i] < u[i - 1]) u[i] = u[i - 1];
    }
    const c = vcGenerate(pts, u, t0, t1);
    const [err, sp] = vcMaxError(pts, c, u);
    if (err < bestErr) {
      best = c;
      bestErr = err;
      split = sp;
    } else {
      break;
    }
  }
  return [best, bestErr, split];
}
function vcFitSingle(pts, t0, t1) {
  if (pts.length < 2) return null;
  const u = vcChordParams(pts);
  const [c, err] = vcFitSingleFrom(pts, u, t0, t1);
  return [c, err];
}
function vcFitRec(pts, t0, t1, tol, out, depth) {
  const n = pts.length;
  if (n < 2) return;
  if (n === 2) {
    const d = dist(pts[0], pts[1]) / 3;
    out.push({
      p0: {
        x: pts[0].x,
        y: pts[0].y
      },
      p1: {
        x: pts[0].x + t0.x * d,
        y: pts[0].y + t0.y * d
      },
      p2: {
        x: pts[1].x - t1.x * d,
        y: pts[1].y - t1.y * d
      },
      p3: {
        x: pts[1].x,
        y: pts[1].y
      }
    });
    return;
  }
  const u = vcChordParams(pts);
  let [c, err, split] = vcFitSingleFrom(pts, u, t0, t1);
  if (err <= tol || depth > 40) {
    out.push(c);
    return;
  }
  split = Math.max(1, Math.min(n - 2, split));
  const tc = vcUnit(sub(pts[split + 1], pts[split - 1])) || t0;
  vcFitRec(pts.slice(0, split + 1), t0, tc, tol, out, depth + 1);
  vcFitRec(pts.slice(split), tc, t1, tol, out, depth + 1);
}
function vcFitCubics(pts, t0, t1, tol) {
  const clean = vcDedup(pts);
  if (clean.length < 2) return [];
  const out = [];
  vcFitRec(clean, t0, t1, Math.max(tol, 1e-6), out, 0);
  return out;
}
function vcIsStraight(c, tol) {
  const chord = sub(c.p3, c.p0);
  const len = Math.hypot(chord.x, chord.y);
  if (len < 1e-12) {
    return dist(c.p1, c.p0) <= tol && dist(c.p2, c.p0) <= tol;
  }
  const dir = {
    x: chord.x / len,
    y: chord.y / len
  };
  for (const h of [c.p1, c.p2]) {
    const v = sub(h, c.p0);
    const perp = Math.abs(v.x * dir.y - v.y * dir.x);
    const along = v.x * dir.x + v.y * dir.y;
    if (perp > tol || along < -tol || along > len + tol) return false;
  }
  return true;
}
function vcSample(c, m, pts, includeStart) {
  const start = includeStart ? 0 : 1;
  const mUse = Math.max(m, 1);
  for (let i = start; i <= mUse; i++) {
    const t = i / mUse;
    pts.push(vcEvalCubic(c, t));
  }
}
var VC_GL5_X = [0, -0.5384693101056831, 0.5384693101056831, -0.906179845938664, 0.906179845938664];
var VC_GL5_W = [0.5688888888888889, 0.47862867049936647, 0.47862867049936647, 0.23692688505618908, 0.23692688505618908];
function vcCubicSpeedAt(c, t) {
  const v = 1 - t;
  const dx = 3 * (v * v * (c.p1.x - c.p0.x) + 2 * v * t * (c.p2.x - c.p1.x) + t * t * (c.p3.x - c.p2.x));
  const dy = 3 * (v * v * (c.p1.y - c.p0.y) + 2 * v * t * (c.p2.y - c.p1.y) + t * t * (c.p3.y - c.p2.y));
  return Math.hypot(dx, dy);
}
function vcGaussArclenInterval(c, t0, t1) {
  const half = 0.5 * (t1 - t0), mid = 0.5 * (t0 + t1);
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += VC_GL5_W[i] * vcCubicSpeedAt(c, mid + half * VC_GL5_X[i]);
  }
  return sum * half;
}
function vcMeasuredArclen(c, accuracy = 1e-6) {
  const ok = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= VC_MEASURE_LIMIT && Math.abs(p.y) <= VC_MEASURE_LIMIT;
  if (!ok(c.p0) || !ok(c.p1) || !ok(c.p2) || !ok(c.p3)) return 0;
  let total = 0;
  const stack = [[0, 1, vcGaussArclenInterval(c, 0, 1), 0]];
  while (stack.length) {
    const [t0, t1, est, depth] = stack.pop();
    const tm = 0.5 * (t0 + t1);
    const l = vcGaussArclenInterval(c, t0, tm);
    const r = vcGaussArclenInterval(c, tm, t1);
    if (Math.abs(l + r - est) <= accuracy || depth >= 10) {
      total += l + r;
    } else {
      stack.push([tm, t1, r, depth + 1]);
      stack.push([t0, tm, l, depth + 1]);
    }
  }
  return total;
}
function vcIsCollinearHandles(p, a, b) {
  const vax = a.x - p.x, vay = a.y - p.y;
  const vbx = b.x - p.x, vby = b.y - p.y;
  const cr = vax * vby - vay * vbx;
  const dt = vax * vbx + vay * vby;
  return Math.abs(cr) <= 1e-6 * Math.max(Math.hypot(vax, vay), 1) * Math.max(Math.hypot(vbx, vby), 1) && dt < 0;
}
function vcAnchorWithHandles(pos, hIn, hOut, keepId = null) {
  const p = {
    x: rdCoord(pos.x),
    y: rdCoord(pos.y)
  };
  const hi = hIn && dist(hIn, pos) > 1e-6 ? {
    x: rdCoord(hIn.x),
    y: rdCoord(hIn.y)
  } : null;
  const ho = hOut && dist(hOut, pos) > 1e-6 ? {
    x: rdCoord(hOut.x),
    y: rdCoord(hOut.y)
  } : null;
  const smooth = !!(hi && ho && vcIsCollinearHandles(pos, hi, ho));
  return {
    id: keepId || uid(),
    x: p.x,
    y: p.y,
    type: smooth ? "smooth" : "corner",
    handleIn: hi,
    handleOut: ho
  };
}
function vcWithHandle(node, out, h) {
  const pos = {
    x: node.x,
    y: node.y
  };
  const hIn = out ? node.handleIn ? {
    x: node.handleIn.x,
    y: node.handleIn.y
  } : pos : h || pos;
  const hOut = out ? h || pos : node.handleOut ? {
    x: node.handleOut.x,
    y: node.handleOut.y
  } : pos;
  const wasSmooth = node.type === "smooth" || node.type === "symmetric";
  const res = vcAnchorWithHandles(pos, hIn, hOut, node.id);
  if (!wasSmooth) res.type = "corner";
  return res;
}
function vcSubpathSegCount(sp) {
  const n = sp.nodes.length;
  return n < 2 ? 0 : sp.closed ? n : n - 1;
}
function vcSubpathSegment(sp, i) {
  const n = sp.nodes.length;
  const a = sp.nodes[i % n], b = sp.nodes[(i + 1) % n];
  const p0 = {
    x: a.x,
    y: a.y
  }, p3 = {
    x: b.x,
    y: b.y
  };
  const p1 = a.handleOut && dist(a.handleOut, p0) > 1e-9 ? {
    x: a.handleOut.x,
    y: a.handleOut.y
  } : p0;
  const p2 = b.handleIn && dist(b.handleIn, p3) > 1e-9 ? {
    x: b.handleIn.x,
    y: b.handleIn.y
  } : p3;
  return {
    p0,
    p1,
    p2,
    p3
  };
}
function vcSubpathSegIsLine(sp, i) {
  const n = sp.nodes.length;
  const a = sp.nodes[i % n], b = sp.nodes[(i + 1) % n];
  const hasOut = !!(a.handleOut && dist(a.handleOut, a) > 1e-9);
  const hasIn = !!(b.handleIn && dist(b.handleIn, b) > 1e-9);
  return !hasOut && !hasIn;
}
function vcSubpathSegs(sp) {
  const cnt = vcSubpathSegCount(sp), out = [];
  for (let i = 0; i < cnt; i++) {
    out.push({
      c: vcSubpathSegment(sp, i),
      line: vcSubpathSegIsLine(sp, i),
      forceCutStart: !!(sp.nodes[i] && sp.nodes[i]._forceCut)
    });
  }
  return out;
}
function vcSubpathWithinTolerance(original, candidate, tolerance) {
  if (original === candidate) return true;
  if (Boolean(original.closed) !== Boolean(candidate.closed)) return false;
  if (original.nodes.length < 2 || candidate.nodes.length < 2) {
    return original.nodes.length === candidate.nodes.length && (!original.nodes.length || dist(original.nodes[0], candidate.nodes[0]) <= tolerance);
  }
  return withinCurveTolerance(vcSubpathSegs(original), vcSubpathSegs(candidate), tolerance);
}
function vcSegLine(a, b) {
  return {
    c: {
      p0: {
        x: a.x,
        y: a.y
      },
      p1: {
        x: a.x,
        y: a.y
      },
      p2: {
        x: b.x,
        y: b.y
      },
      p3: {
        x: b.x,
        y: b.y
      }
    },
    line: true
  };
}
function vcSegsToSubpath(segs, closed, spId) {
  if (!segs || !segs.length) return null;
  const nodes = [];
  for (let i = 0; i < segs.length; i++) {
    const pos = segs[i].c.p0;
    const prevIdx = i > 0 ? i - 1 : closed ? segs.length - 1 : -1;
    const hIn = prevIdx >= 0 && !segs[prevIdx].line ? segs[prevIdx].c.p2 : pos;
    const hOut = !segs[i].line ? segs[i].c.p1 : pos;
    nodes.push(vcAnchorWithHandles(pos, hIn, hOut));
  }
  if (!closed) {
    const last = segs[segs.length - 1];
    const hIn = last.line ? last.c.p3 : last.c.p2;
    nodes.push(vcAnchorWithHandles(last.c.p3, hIn, last.c.p3));
  }
  return {
    id: spId || uid(),
    closed: !!closed,
    nodes
  };
}
function vcTurnDeg(a, b) {
  const tA = vcEndTangent(a.c), tB = vcStartTangent(b.c);
  const d = Math.max(-1, Math.min(1, tA.x * tB.x + tA.y * tB.y));
  return Math.acos(d) * 180 / Math.PI;
}
function vcJointTurnDeg(a, b) {
  const tanTurn = vcTurnDeg(a, b);
  const pPrev = vcEvalCubic(a.c, 0.75);
  const pJoint = a.c.p3;
  const pNext = vcEvalCubic(b.c, 0.25);
  const u1 = vcUnit(sub(pJoint, pPrev)), u2 = vcUnit(sub(pNext, pJoint));
  if (!u1 || !u2) return tanTurn;
  const secTurn = Math.acos(Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y))) * 180 / Math.PI;
  return Math.max(tanTurn, secTurn);
}
function vcSmoothPoints(pts, sigma) {
  if (pts.length < 3 || !(Number.isFinite(sigma) && sigma > 0)) {
    return pts.slice();
  }
  const s = new Array(pts.length);
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) total += dist(pts[i - 1], pts[i]);
    s[i] = total;
  }
  let lo = 0, hi = 0;
  return pts.map((p, i) => {
    const si = s[i];
    const reach = Math.min(3 * sigma, si, total - si);
    if (reach <= 1e-9) return p;
    const spread = reach / 3;
    while (lo < s.length && s[lo] < si - reach) lo++;
    while (hi + 1 < s.length && s[hi + 1] <= si + reach) hi++;
    let sumX = 0, sumY = 0, weight = 0;
    for (let j = lo; j <= hi; j++) {
      const ds = s[j] - si;
      const w = Math.exp(-(ds * ds) / (2 * spread * spread));
      sumX += pts[j].x * w;
      sumY += pts[j].y * w;
      weight += w;
    }
    return weight > 0 ? {
      x: sumX / weight,
      y: sumY / weight
    } : p;
  });
}
function vcRdp(pts, tol) {
  if (pts.length < 3) return pts.slice();
  if (wasmEngine.isReady && wasmEngine.rdpSimplify) {
    const coords = new Float64Array(pts.length * 2);
    for (let i = 0; i < pts.length; i++) {
      coords[i * 2] = pts[i].x;
      coords[i * 2 + 1] = pts[i].y;
    }
    const res = wasmEngine.rdpSimplify(coords, tol);
    if (res && res.length) {
      const out = [];
      const n = res.length >> 1;
      for (let i = 0; i < n; i++) {
        out.push({ x: res[i * 2], y: res[i * 2 + 1] });
      }
      return out;
    }
  }
  const keep = new Array(pts.length).fill(false);
  keep[0] = true;
  keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  let budget = pts.length * 64 + (1 << 20);
  while (stack.length) {
    const [a, b] = stack.pop();
    const span = b - a;
    if (budget < span) {
      for (let k = a; k <= b; k++) keep[k] = true;
      budget = 0;
      continue;
    }
    budget -= span;
    const pa = pts[a], pb = pts[b];
    const chord = sub(pb, pa);
    const len = Math.hypot(chord.x, chord.y);
    let bestD = 0, bestI = a;
    for (let i = a + 1; i < b; i++) {
      const p = pts[i];
      const d = len < 1e-12 ? dist(p, pa) : Math.abs((p.x - pa.x) * chord.y - (p.y - pa.y) * chord.x) / len;
      if (d > bestD) {
        bestD = d;
        bestI = i;
      }
    }
    if (bestD > tol) {
      keep[bestI] = true;
      stack.push([a, bestI]);
      stack.push([bestI, b]);
    }
  }
  return pts.filter((_, idx) => keep[idx]);
}
function vcCollapseStackedCornerNodes(sp, opts = {}, targetNodeIds = null) {
  const minKeep = sp?.closed ? 3 : 2;
  if (!sp || !sp.nodes || sp.nodes.length <= minKeep) return {
    sp,
    mergedIds: /* @__PURE__ */ new Set()
  };
  const tol = Math.max(opts.tolerance != null ? opts.tolerance : 0.5, 1e-4);
  const cornerAngleDeg = opts.cornerAngleDeg != null ? opts.cornerAngleDeg : 30;
  const eps = Math.min(4.2, Math.max(1.5, tol * 3.2));
  const microEps = Math.min(1.5, Math.max(0.4, tol * 1.2));
  const minAng = Math.max(15, Math.min(cornerAngleDeg, 35));
  let nodes = sp.nodes.map((nd) => ({
    ...cl(nd),
    _forceCut: !!nd._forceCut
  }));
  const mergedIds = /* @__PURE__ */ new Set();
  const okNode = (id) => !targetNodeIds || targetNodeIds.has(id);
  for (let pass = 0; pass < 10 && nodes.length > minKeep; pass++) {
    let mergedAny = false;
    const n = nodes.length;
    const limit = sp.closed ? n : n - 1;
    for (let i = 0; i < limit && nodes.length > minKeep; i++) {
      const j = (i + 1) % nodes.length;
      const A = nodes[i], B = nodes[j];
      if (!okNode(A.id) || !okNode(B.id)) continue;
      const dAB = dist(A, B);
      if (dAB > microEps) continue;
      if (A.type !== "corner" && B.type !== "corner") continue;
      const curveEps = Math.max(0.05, dAB * 0.25);
      if (hasH(A, A.handleOut) && dist(A.handleOut, A) > curveEps) continue;
      if (hasH(B, B.handleIn) && dist(B.handleIn, B) > curveEps) continue;
      if (hasH(A, A.handleOut) && dist(A.handleOut, A) > microEps * 1.5) continue;
      if (hasH(B, B.handleIn) && dist(B.handleIn, B) > microEps * 1.5) continue;
      let px = 0.5 * (A.x + B.x), py = 0.5 * (A.y + B.y);
      if (nodes.length >= 4) {
        const pi = (i - 1 + nodes.length) % nodes.length;
        const ni = (j + 1) % nodes.length;
        const PV = nodes[pi], NX = nodes[ni];
        const vIn = hasH(A, A.handleIn) ? nrm(sub(A, A.handleIn)) : hasH(PV, PV.handleOut) ? nrm(sub(A, PV.handleOut)) : nrm(sub(A, PV));
        const vOut = hasH(B, B.handleOut) ? nrm(sub(B.handleOut, B)) : hasH(NX, NX.handleIn) ? nrm(sub(NX.handleIn, B)) : nrm(sub(NX, B));
        const det = cross(vIn, vOut);
        if (Math.abs(det) > 0.15) {
          const w = sub(B, A), t = cross(w, vOut) / det;
          const ix = A.x + vIn.x * t, iy = A.y + vIn.y * t;
          if (t >= -dAB * 0.5 && Math.hypot(ix - px, iy - py) <= Math.max(1.2, dAB * 1.2)) {
            px = ix;
            py = iy;
          }
        }
      }
      const mNode = {
        id: A.id,
        x: rdCoord(px),
        y: rdCoord(py),
        type: "corner",
        handleIn: hasH(A, A.handleIn) ? {
          ...A.handleIn
        } : null,
        handleOut: hasH(B, B.handleOut) ? {
          ...B.handleOut
        } : null,
        _forceCut: true
      };
      mergedIds.add(mNode.id);
      nodes[i] = mNode;
      nodes.splice(j, 1);
      mergedAny = true;
      break;
    }
    if (!mergedAny) break;
  }
  for (let pass = 0; pass < 4 && nodes.length >= 4 && nodes.length > minKeep; pass++) {
    const n = nodes.length;
    let start = 0;
    if (sp.closed) {
      start = -1;
      for (let i = 0; i < n; i++) {
        if (dist(nodes[(i - 1 + n) % n], nodes[i]) > eps) {
          start = i;
          break;
        }
      }
      if (start < 0) break;
    }
    const groups = [];
    let cur = [];
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n;
      if (cur.length && okNode(nodes[cur[cur.length - 1]].id) && okNode(nodes[i].id) && dist(nodes[cur[cur.length - 1]], nodes[i]) <= eps && dist(nodes[cur[0]], nodes[i]) <= eps * 1.6) {
        cur.push(i);
      } else {
        if (cur.length >= 2) groups.push(cur);
        cur = okNode(nodes[i].id) ? [i] : [];
      }
    }
    if (cur.length >= 2) groups.push(cur);
    if (!groups.length) break;
    const byFirst = /* @__PURE__ */ new Map(), drop = /* @__PURE__ */ new Set();
    let leftCount = n;
    for (const g of groups) {
      if (g.length < 2 || g.length > 5 || leftCount - (g.length - 1) < minKeep) continue;
      if (!sp.closed && (g.includes(0) || g.includes(n - 1))) continue;
      if (g.some((i) => nodes[i].fil)) continue;
      const f = g[0], l = g[g.length - 1];
      const pi = (f - 1 + n) % n, ni = (l + 1) % n;
      if (g.includes(pi) || g.includes(ni)) continue;
      const A = nodes[f], B = nodes[l], PV = nodes[pi], NX = nodes[ni];
      const spanAB = dist(A, B);
      const dPrev = dist(PV, A), dNext = dist(B, NX);
      if (dPrev < Math.max(spanAB * 3, eps * 2) || dNext < Math.max(spanAB * 3, eps * 2)) continue;
      const vIn = hasH(A, A.handleIn) ? nrm(sub(A, A.handleIn)) : hasH(PV, PV.handleOut) ? nrm(sub(A, PV.handleOut)) : nrm(sub(A, PV));
      const vOut = hasH(B, B.handleOut) ? nrm(sub(B.handleOut, B)) : hasH(NX, NX.handleIn) ? nrm(sub(NX.handleIn, B)) : nrm(sub(NX, B));
      const angDeg = Math.acos(Math.max(-1, Math.min(1, dot(vIn, vOut)))) * 180 / Math.PI;
      if (angDeg < minAng || angDeg > 135) continue;
      let cx = 0, cy = 0;
      g.forEach((i) => {
        cx += nodes[i].x;
        cy += nodes[i].y;
      });
      cx /= g.length;
      cy /= g.length;
      let inter = null;
      const det = cross(vIn, vOut);
      if (Math.abs(det) > 0.15) {
        const w = sub(B, A), t = cross(w, vOut) / det;
        const px = A.x + vIn.x * t, py = A.y + vIn.y * t;
        if (t >= -spanAB * 0.25 && Math.hypot(px - cx, py - cy) <= Math.max(2.5, spanAB * 1.25)) {
          inter = {
            x: px,
            y: py
          };
        }
      }
      if (!inter) {
        let bestNode = {
          x: cx,
          y: cy
        }, bestTurn = -1;
        for (const idx of g) {
          const p0 = nodes[(idx - 1 + n) % n], p1 = nodes[idx], p2 = nodes[(idx + 1) % n];
          const u1 = nrm(sub(p1, p0)), u2 = nrm(sub(p2, p1));
          const tDeg = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2)))) * 180 / Math.PI;
          if (tDeg > bestTurn) {
            bestTurn = tDeg;
            bestNode = {
              x: p1.x,
              y: p1.y
            };
          }
        }
        inter = bestNode;
      }
      const keepId = A.id;
      byFirst.set(keepId, {
        id: keepId,
        x: rdCoord(inter.x),
        y: rdCoord(inter.y),
        type: "corner",
        handleIn: hasH(A, A.handleIn) ? {
          ...A.handleIn
        } : null,
        handleOut: hasH(B, B.handleOut) ? {
          ...B.handleOut
        } : null,
        _forceCut: true
      });
      mergedIds.add(keepId);
      g.forEach((i) => drop.add(nodes[i].id));
      leftCount -= g.length - 1;
    }
    if (!drop.size) break;
    const nextNodes = [];
    for (const nd of nodes) {
      if (byFirst.has(nd.id)) nextNodes.push(byFirst.get(nd.id));
      else if (!drop.has(nd.id)) nextNodes.push(nd);
    }
    nodes = nextNodes;
  }
  const candidate = { ...sp, nodes };
  return mergedIds.size && vcSubpathWithinTolerance(sp, candidate, tol) ? { sp: candidate, mergedIds } : { sp, mergedIds: /* @__PURE__ */ new Set() };
}
function vcPreSamplePiece(piece, tol) {
  return piece.map((s) => {
    const pts = [];
    const approx = dist(s.c.p0, s.c.p1) + dist(s.c.p1, s.c.p2) + dist(s.c.p2, s.c.p3);
    const m = Math.max(8, Math.min(36, Math.ceil(approx / Math.max(1, tol * 1.5)) || 8));
    for (let i = 0; i <= m; i++) pts.push(vcEvalCubic(s.c, i / m));
    return pts;
  });
}
function vcJoinSegSamples(segSamples, a, b) {
  const pts = [];
  for (let k = a; k < b; k++) {
    const arr = segSamples[k];
    for (let i = k === a ? 0 : 1; i < arr.length; i++) pts.push(arr[i]);
  }
  return pts;
}
function vcFitPieceShapePreserving(piece, tol, straightLines, smooth) {
  if (!piece.length) return [];
  const segSamples = vcPreSamplePiece(piece, tol);
  let ptsAll = vcJoinSegSamples(segSamples, 0, piece.length);
  if (smooth > 0) {
    ptsAll = vcSmoothPoints(ptsAll, smooth);
  }
  if (straightLines) {
    const keep = vcRdp(ptsAll, tol);
    const out2 = [];
    for (let j = 0; j < keep.length - 1; j++) out2.push(vcSegLine(keep[j], keep[j + 1]));
    return withinCurveTolerance(piece, out2, tol) ? out2 : piece;
  }
  if (piece.length === 1) {
    const c = piece[0].c;
    return [vcIsStraight(c, tol * 0.04) ? vcSegLine(c.p0, c.p3) : {
      c,
      line: false
    }];
  }
  const t0All = vcStartTangent(piece[0].c);
  const t1All = vcEndTangent(piece[piece.length - 1].c);
  const cubicsAll = vcFitCubics(ptsAll, t0All, t1All, tol);
  if (cubicsAll.length > 0 && cubicsAll.length < piece.length) {
    const candidate = cubicsAll.map((c) => vcIsStraight(c, tol * 0.04) ? vcSegLine(c.p0, c.p3) : {
      c,
      line: false
    });
    if (withinCurveTolerance(piece, candidate, tol)) return candidate;
  }
  const out = [];
  let i = 0;
  while (i < piece.length) {
    let merged = null, mergedSpan = 0;
    const maxSpan = Math.min(5, piece.length - i);
    for (let spanLen = maxSpan; spanLen >= 2; spanLen--) {
      const pts = vcJoinSegSamples(segSamples, i, i + spanLen);
      const t0 = vcStartTangent(piece[i].c);
      const t1 = vcEndTangent(piece[i + spanLen - 1].c);
      const u = vcChordParams(pts);
      const [c, err] = vcFitSingleFrom(pts, u, t0, t1);
      if (err <= tol) {
        const candidate = vcIsStraight(c, tol * 0.04) ? vcSegLine(c.p0, c.p3) : { c, line: false };
        if (withinCurveTolerance(piece.slice(i, i + spanLen), [candidate], tol)) {
          merged = candidate;
          mergedSpan = spanLen;
          break;
        }
      }
    }
    if (merged) {
      out.push(merged);
      i += mergedSpan;
    } else {
      const s = piece[i];
      out.push(vcIsStraight(s.c, tol * 0.04) ? vcSegLine(s.c.p0, s.c.p3) : s);
      i += 1;
    }
  }
  return out;
}
function simplifyRun(run, opts = {}) {
  const tol = Math.max(opts.tolerance != null ? opts.tolerance : 0.5, 1e-6);
  const cornerAngleDeg = opts.cornerAngleDeg != null ? opts.cornerAngleDeg : 30;
  const straightLines = !!opts.straightLines;
  const smooth = opts.smooth || 0;
  const cuts = [0];
  const MAX_NET_ROT_DEG = 95;
  let pieceT0 = run.length ? vcStartTangent(run[0].c) : { x: 1, y: 0 };
  for (let i = 1; i < run.length; i++) {
    const jointTurn = vcJointTurnDeg(run[i - 1], run[i]);
    const endT = vcEndTangent(run[i].c);
    const d = Math.max(-1, Math.min(1, pieceT0.x * endT.x + pieceT0.y * endT.y));
    const netRot = Math.acos(d) * 180 / Math.PI;
    if (run[i].forceCutStart || jointTurn > cornerAngleDeg || netRot > MAX_NET_ROT_DEG) {
      cuts.push(i);
      pieceT0 = vcStartTangent(run[i].c);
    }
  }
  cuts.push(run.length);
  const result = [];
  for (let w = 0; w < cuts.length - 1; w++) {
    const piece = run.slice(cuts[w], cuts[w + 1]);
    if (!piece.length) continue;
    const fitted = vcFitPieceShapePreserving(piece, tol, straightLines, smooth);
    for (let j = 0; j < fitted.length; j++) result.push(fitted[j]);
  }
  return result;
}
function vcNoWorse(originalSp, fittedSp) {
  return fittedSp.nodes.length > originalSp.nodes.length ? originalSp : fittedSp;
}
function simplifySubpath(sp, opts = {}) {
  const pre = vcCollapseStackedCornerNodes(sp, opts, null).sp;
  const segs = vcSubpathSegs(pre);
  const n = segs.length;
  if (n === 0) return pre;
  const cornerAngleDeg = opts.cornerAngleDeg != null ? opts.cornerAngleDeg : 30;
  let runSegs = segs;
  if (pre.closed) {
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (segs[i].forceCutStart || vcJointTurnDeg(segs[(i + n - 1) % n], segs[i]) > cornerAngleDeg) {
        k = i;
        break;
      }
    }
    if (k > 0) runSegs = segs.slice(k).concat(segs.slice(0, k));
  }
  const result = simplifyRun(runSegs, opts);
  const s = vcSegsToSubpath(result, pre.closed, sp.id);
  if (!s || !vcSubpathWithinTolerance(sp, s, opts.tolerance ?? 0.5)) return sp;
  return opts.straightLines ? s : vcNoWorse(sp, s);
}
function simplifyWith(obj, opts = {}) {
  if (!obj || !obj.subs || obj.img) return obj;
  const subs = [];
  for (let i = 0; i < obj.subs.length; i++) {
    const s = simplifySubpath(obj.subs[i], opts);
    if (s && s.nodes && s.nodes.length >= 2) subs.push(s);
  }
  if (!subs.length) return obj;
  return {
    ...obj,
    subs
  };
}
function vcSimplifyRuns(sp, picked, opts) {
  const m = sp.nodes.length;
  const n = picked.length;
  const inside = (a) => sp.closed && a === 0 && picked[n - 1] && picked[0] || a > 0 && a < n && picked[a - 1] && picked[a];
  let start = 0;
  for (let a = 0; a < m; a++) {
    if (!inside(a)) {
      start = a;
      break;
    }
  }
  const anchors = [cl(sp.nodes[start])];
  const kept = [[start, 0]];
  const runs = [];
  let k = 0;
  while (k < n) {
    const j = (start + k) % n;
    if (!picked[j]) {
      const next = (j + 1) % m;
      if (k + 1 < n || !sp.closed) {
        kept.push([next, anchors.length]);
        anchors.push(cl(sp.nodes[next]));
      }
      k += 1;
      continue;
    }
    let len = 0;
    while (k + len < n && picked[(start + k + len) % n]) len++;
    const run = [];
    for (let i = k; i < k + len; i++) {
      const segIdx = (start + i) % n;
      run.push({
        c: vcSubpathSegment(sp, segIdx),
        line: vcSubpathSegIsLine(sp, segIdx),
        forceCutStart: !!(sp.nodes[segIdx] && sp.nodes[segIdx]._forceCut)
      });
    }
    const end = (start + k + len) % m;
    const fitted = simplifyRun(run, opts);
    const keepOriginal = !fitted.length || !opts.straightLines && fitted.length > run.length;
    const first = anchors.length - 1;
    if (keepOriginal) {
      for (let i = k + 1; i < k + len; i++) {
        anchors.push(cl(sp.nodes[(start + i) % m]));
      }
    } else {
      const a = anchors[first];
      anchors[first] = vcWithHandle(a, true, fitted[0].line ? {
        x: a.x,
        y: a.y
      } : fitted[0].c.p1);
      for (let w = 0; w < fitted.length - 1; w++) {
        const p = fitted[w + 1].c.p0;
        const hIn = fitted[w].line ? p : fitted[w].c.p2;
        const hOut = fitted[w + 1].line ? p : fitted[w + 1].c.p1;
        anchors.push(vcAnchorWithHandles(p, hIn, hOut));
      }
    }
    const runSegLen = keepOriginal ? run.length : fitted.length;
    for (let rs = first; rs < first + runSegLen; rs++) runs.push(rs);
    const endSeg = !keepOriginal && fitted.length ? fitted[fitted.length - 1] : null;
    if (sp.closed && k + len === n) {
      if (endSeg) {
        anchors[0] = vcWithHandle(anchors[0], false, endSeg.line ? {
          x: anchors[0].x,
          y: anchors[0].y
        } : endSeg.c.p2);
      }
    } else {
      const a = cl(sp.nodes[end]);
      kept.push([end, anchors.length]);
      anchors.push(endSeg ? vcWithHandle(a, false, endSeg.line ? {
        x: a.x,
        y: a.y
      } : endSeg.c.p2) : a);
    }
    k += len;
  }
  return [{
    ...sp,
    nodes: anchors
  }, runs, kept];
}
function simplifyPart(obj, selectedSegSet, opts = {}) {
  const runs = [];
  const anchorMap = /* @__PURE__ */ new Map();
  const subs = [];
  for (let si = 0; si < obj.subs.length; si++) {
    const sp = obj.subs[si];
    const n = vcSubpathSegCount(sp);
    const picked = [];
    for (let i = 0; i < n; i++) picked.push(selectedSegSet.has(si + ":" + i));
    const ni = subs.length;
    if (!picked.includes(true)) {
      for (let ai = 0; ai < sp.nodes.length; ai++) anchorMap.set(si + ":" + ai, [ni, ai]);
      subs.push(sp);
    } else if (!picked.includes(false)) {
      const s = simplifySubpath(sp, opts);
      if (s && s.nodes && s.nodes.length >= 2) {
        const sc = vcSubpathSegCount(s);
        for (let i = 0; i < sc; i++) runs.push([ni, i]);
        subs.push(s);
      }
    } else {
      const [s, segs, kept] = vcSimplifyRuns(sp, picked, opts);
      segs.forEach((i) => runs.push([ni, i]));
      kept.forEach(([oldIdx, newIdx]) => anchorMap.set(si + ":" + oldIdx, [ni, newIdx]));
      subs.push(s);
    }
  }
  return {
    obj: {
      ...obj,
      subs
    },
    segments: runs,
    anchors: anchorMap
  };
}
function vcReverseCubicSeg(seg2) {
  const c = seg2.c;
  return {
    c: {
      p0: {
        x: c.p3.x,
        y: c.p3.y
      },
      p1: {
        x: c.p2.x,
        y: c.p2.y
      },
      p2: {
        x: c.p1.x,
        y: c.p1.y
      },
      p3: {
        x: c.p0.x,
        y: c.p0.y
      }
    },
    line: !!seg2.line,
    forceCutStart: false
  };
}
function vcReverseSegList(segs) {
  const out = new Array(segs.length);
  for (let i = 0; i < segs.length; i++) {
    out[i] = vcReverseCubicSeg(segs[segs.length - 1 - i]);
  }
  return out;
}
function vcSimplifyOpenChainNodes(chainNodes, opts, minSegs = 1) {
  if (!chainNodes || chainNodes.length < 2) return [];
  const origSegs = vcSubpathSegs({
    id: "ch",
    closed: false,
    nodes: chainNodes
  });
  if (origSegs.length <= minSegs) return origSegs;
  const interiorIds = /* @__PURE__ */ new Set();
  for (let i = 1; i < chainNodes.length - 1; i++) interiorIds.add(chainNodes[i].id);
  const tempSp = {
    id: "ch",
    closed: false,
    nodes: chainNodes.map(cl)
  };
  const pre = interiorIds.size >= 2 ? vcCollapseStackedCornerNodes(tempSp, opts, interiorIds).sp : tempSp;
  pre.nodes[0].x = chainNodes[0].x;
  pre.nodes[0].y = chainNodes[0].y;
  pre.nodes[pre.nodes.length - 1].x = chainNodes[chainNodes.length - 1].x;
  pre.nodes[pre.nodes.length - 1].y = chainNodes[chainNodes.length - 1].y;
  const runSegs = vcSubpathSegs(pre);
  const fitted = simplifyRun(runSegs, opts);
  if (!fitted.length || fitted.length < minSegs) return origSegs;
  if (!opts.straightLines && fitted.length > origSegs.length) return origSegs;
  fitted[0].c.p0 = {
    x: chainNodes[0].x,
    y: chainNodes[0].y
  };
  if (fitted[0].line) fitted[0].c.p1 = {
    x: chainNodes[0].x,
    y: chainNodes[0].y
  };
  const last = fitted[fitted.length - 1];
  last.c.p3 = {
    x: chainNodes[chainNodes.length - 1].x,
    y: chainNodes[chainNodes.length - 1].y
  };
  if (last.line) last.c.p2 = {
    x: last.c.p3.x,
    y: last.c.p3.y
  };
  return fitted;
}
function vcTopologicalSimplifyObjects(allObjects, targetIds, opts) {
  const oiToDocIdx = [];
  allObjects.forEach((o, docIdx) => {
    if (!o || o.hidden || o.locked || o.img || o.isFrameBg || o.isAutoFrame || !o.subs || !o.subs.length) return;
    oiToDocIdx.push(docIdx);
  });
  if (!oiToDocIdx.length) return null;
  const eps = Math.min(0.03, (opts.tolerance ?? 0.5) / 4), cell = eps * 2;
  const grid = /* @__PURE__ */ new Map(), clusters = [];
  const getCluster = (pt) => {
    const gx = Math.floor(pt.x / cell), gy = Math.floor(pt.y / cell);
    let bestC = -1, bestD = eps;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const b = grid.get(gx + dx + "," + (gy + dy));
        if (!b) continue;
        for (const cid of b) {
          const c = clusters[cid];
          const d = Math.hypot(pt.x - c.x, pt.y - c.y);
          if (d <= bestD) {
            bestD = d;
            bestC = cid;
          }
        }
      }
    }
    if (bestC < 0) {
      bestC = clusters.length;
      clusters.push({
        id: bestC,
        x: pt.x,
        y: pt.y,
        objs: /* @__PURE__ */ new Set(),
        subRefs: /* @__PURE__ */ new Set(),
        occCount: 0
      });
      const k = gx + "," + gy;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(bestC);
    }
    return bestC;
  };
  const workSubs = oiToDocIdx.map((docIdx, oi) => allObjects[docIdx].subs.map((sp, si) => ({
    id: sp.id,
    closed: !!sp.closed,
    nodes: sp.nodes.map((nd) => {
      const copy = cl(nd), cid = getCluster(copy);
      clusters[cid].objs.add(oi);
      clusters[cid].subRefs.add(oi + ":" + si);
      copy._cid = cid;
      return copy;
    })
  })));
  workSubs.forEach((subs, oi) => {
    const objId = allObjects[oiToDocIdx[oi]].id;
    subs.forEach((sp) => {
      const minKeep = sp.closed ? 3 : 2;
      if (sp.nodes.length <= minKeep) return;
      let ch = true;
      while (ch && sp.nodes.length > minKeep) {
        ch = false;
        const n = sp.nodes.length, limit = sp.closed ? n : n - 1;
        for (let i = 0; i < limit; i++) {
          const j = (i + 1) % n, a = sp.nodes[i], b = sp.nodes[j];
          if (!targetIds.has(objId) && ![...clusters[a._cid].objs].some((x) => targetIds.has(allObjects[oiToDocIdx[x]].id))) continue;
          if (a._cid === b._cid && dist(a, b) <= eps && !hasH(a, a.handleOut) && !hasH(b, b.handleIn)) {
            a.handleOut = b.handleOut;
            sp.nodes.splice(j, 1);
            ch = true;
            break;
          }
        }
      }
    });
  });
  const uKey = (c1, c2) => c1 < c2 ? c1 + "|" + c2 : c2 + "|" + c1;
  const directEdgeMap = /* @__PURE__ */ new Map();
  workSubs.forEach((subs, oi) => subs.forEach((sp, si) => {
    const n = sp.nodes.length, cnt = sp.closed ? n : n - 1;
    for (let i = 0; i < cnt; i++) {
      const a = sp.nodes[i], b = sp.nodes[(i + 1) % n];
      if (a._cid === b._cid) continue;
      const uk = uKey(a._cid, b._cid);
      if (!directEdgeMap.has(uk)) directEdgeMap.set(uk, []);
      directEdgeMap.get(uk).push({
        oi,
        si,
        a,
        b
      });
    }
  }));
  workSubs.forEach((subs, oi) => {
    const objId = allObjects[oiToDocIdx[oi]].id;
    subs.forEach((sp, si) => {
      const minKeep = sp.closed ? 3 : 2;
      if (sp.nodes.length <= minKeep) return;
      let changed = true;
      while (changed && sp.nodes.length > minKeep) {
        changed = false;
        const n = sp.nodes.length;
        for (let i = 0; i < n; i++) {
          if (!sp.closed && (i === 0 || i === n - 1)) continue;
          const mNode = sp.nodes[i];
          if (clusters[mNode._cid].objs.size > 1) continue;
          const pv = sp.nodes[(i - 1 + n) % n], nx = sp.nodes[(i + 1) % n];
          if (pv._cid === nx._cid || dist(pv, mNode) + dist(mNode, nx) > 3.5) continue;
          const matches = directEdgeMap.get(uKey(pv._cid, nx._cid));
          const ref = matches && matches.find((e) => e.oi !== oi || e.si !== si);
          if (ref) {
            const refObjId = allObjects[oiToDocIdx[ref.oi]].id;
            if (!targetIds.has(objId) && !targetIds.has(refObjId)) continue;
            if (ref.a._cid === pv._cid) {
              pv.handleOut = ref.a.handleOut ? {
                ...ref.a.handleOut
              } : null;
              nx.handleIn = ref.b.handleIn ? {
                ...ref.b.handleIn
              } : null;
            } else {
              pv.handleOut = ref.b.handleIn ? {
                ...ref.b.handleIn
              } : null;
              nx.handleIn = ref.a.handleOut ? {
                ...ref.a.handleOut
              } : null;
            }
            sp.nodes.splice(i, 1);
            changed = true;
            break;
          }
        }
      }
    });
  });
  clusters.forEach((c) => {
    c.objs.clear();
    c.subRefs.clear();
    c.occCount = 0;
  });
  workSubs.forEach((subs, oi) => subs.forEach((sp, si) => sp.nodes.forEach((nd) => {
    const c = clusters[nd._cid];
    c.objs.add(oi);
    c.subRefs.add(oi + ":" + si);
    c.occCount++;
  })));
  const activeCluster = (c) => {
    for (const oi of c.objs) if (targetIds.has(allObjects[oiToDocIdx[oi]].id)) return true;
    return false;
  };
  workSubs.forEach((subs) => subs.forEach((sp) => sp.nodes.forEach((nd) => {
    const c = clusters[nd._cid];
    if (c.subRefs.size > 1 && activeCluster(c)) {
      const dx = c.x - nd.x, dy = c.y - nd.y;
      nd.x = c.x;
      nd.y = c.y;
      if (nd.handleIn) {
        nd.handleIn.x += dx;
        nd.handleIn.y += dy;
      }
      if (nd.handleOut) {
        nd.handleOut.x += dx;
        nd.handleOut.y += dy;
      }
    }
  })));
  const edgeBuckets = /* @__PURE__ */ new Map();
  workSubs.forEach((subs, oi) => subs.forEach((sp, si) => {
    const n = sp.nodes.length, cnt = sp.closed ? n : n - 1;
    sp._segInfo = new Array(cnt);
    for (let i = 0; i < cnt; i++) {
      const a = sp.nodes[i], b = sp.nodes[(i + 1) % n];
      const seg2 = vcSubpathSegment(sp, i), mid = vcEvalCubic(seg2, 0.5);
      const info = {
        oi,
        si,
        i,
        cA: a._cid,
        cB: b._cid,
        mid,
        partner: null,
        locked: false
      };
      sp._segInfo[i] = info;
      if (a._cid === b._cid) {
        info.locked = true;
        continue;
      }
      const uk = uKey(a._cid, b._cid);
      if (!edgeBuckets.has(uk)) edgeBuckets.set(uk, []);
      edgeBuckets.get(uk).push(info);
    }
  }));
  for (const [, list] of edgeBuckets.entries()) {
    if (list.length === 2) {
      const e0 = list[0], e1 = list[1];
      if ((e0.oi !== e1.oi || e0.si !== e1.si) && dist(e0.mid, e1.mid) <= 1.5) {
        const relDir = e0.cA === e1.cB && e0.cB === e1.cA ? -1 : 1;
        e0.partner = {
          oi: e1.oi,
          si: e1.si,
          i: e1.i,
          relDir
        };
        e1.partner = {
          oi: e0.oi,
          si: e0.si,
          i: e0.i,
          relDir
        };
      }
    } else if (list.length > 2) {
      list.forEach((e) => {
        e.locked = true;
      });
    }
  }
  const areSegsChainContinuous = (sp, prevSegIdx, nextSegIdx, nodeCid) => {
    const sPrev = sp._segInfo[prevSegIdx], sNext = sp._segInfo[nextSegIdx];
    if (!sPrev || !sNext || sPrev.locked || sNext.locked) return false;
    const clRef = clusters[nodeCid];
    if (!sPrev.partner && !sNext.partner) return clRef.subRefs.size === 1 && clRef.occCount === 1;
    if (sPrev.partner && sNext.partner) {
      const p1 = sPrev.partner, p2 = sNext.partner;
      if (p1.oi !== p2.oi || p1.si !== p2.si || p1.relDir !== p2.relDir) return false;
      if (clRef.subRefs.size !== 2 || clRef.occCount !== 2) return false;
      const partSp = workSubs[p1.oi][p1.si], m2 = partSp._segInfo.length;
      if (p1.relDir === -1) {
        if (!partSp.closed && p1.i === 0) return false;
        return (p1.i - 1 + m2) % m2 === p2.i;
      } else {
        if (!partSp.closed && p1.i === m2 - 1) return false;
        return (p1.i + 1) % m2 === p2.i;
      }
    }
    return false;
  };
  const juncClusters = /* @__PURE__ */ new Set();
  workSubs.forEach((subs) => subs.forEach((sp) => {
    const n = sp.nodes.length, cnt = sp._segInfo.length;
    const isJunc = new Array(n).fill(false);
    if (sp.closed && n <= 3) {
      for (let i = 0; i < n; i++) {
        isJunc[i] = true;
        juncClusters.add(sp.nodes[i]._cid);
      }
    } else if (!sp.closed && n > 0) {
      isJunc[0] = true;
      isJunc[n - 1] = true;
      juncClusters.add(sp.nodes[0]._cid);
      juncClusters.add(sp.nodes[n - 1]._cid);
    }
    for (let i = 0; i < n; i++) {
      if (isJunc[i]) continue;
      if (!areSegsChainContinuous(sp, (i - 1 + cnt) % cnt, i, sp.nodes[i]._cid)) {
        isJunc[i] = true;
        juncClusters.add(sp.nodes[i]._cid);
      }
    }
    sp._isJunc = isJunc;
  }));
  workSubs.forEach((subs) => subs.forEach((sp) => sp.nodes.forEach((nd, i) => {
    if (juncClusters.has(nd._cid)) sp._isJunc[i] = true;
  })));
  workSubs.forEach((subs) => subs.forEach((sp) => {
    if (!sp.closed || sp._isJunc.includes(true) || !sp._segInfo.length) return;
    const p0 = sp._segInfo[0].partner;
    if (p0) {
      let bestIdx = 0;
      for (let i = 1; i < sp.nodes.length; i++) {
        const a = sp.nodes[i], b = sp.nodes[bestIdx];
        if (a.x < b.x - 1e-9 || Math.abs(a.x - b.x) <= 1e-9 && a.y < b.y) bestIdx = i;
      }
      const targetCid = sp.nodes[bestIdx]._cid;
      sp._isJunc[bestIdx] = true;
      const partSp = workSubs[p0.oi][p0.si];
      const partIdx = partSp.nodes.findIndex((nd) => nd._cid === targetCid);
      if (partIdx >= 0) partSp._isJunc[partIdx] = true;
    }
  }));
  workSubs.forEach((subs) => subs.forEach((sp) => {
    sp._juncCount = sp._isJunc.filter(Boolean).length;
  }));
  const sharedChainCache = /* @__PURE__ */ new Map();
  const getChainKey = (oi1, si1, startSeg1, len, oi2, si2, startSeg2, relDir) => {
    const m2 = workSubs[oi2][si2]._segInfo.length;
    const endSeg2 = relDir === -1 ? (startSeg2 - (len - 1) + m2 * 4) % m2 : startSeg2;
    const k1 = oi1 + ":" + si1 + ":" + startSeg1 + ":" + len;
    const k2 = oi2 + ":" + si2 + ":" + endSeg2 + ":" + len;
    return k1 < k2 ? {
      key: k1 + "<->" + k2,
      canonical: true
    } : {
      key: k2 + "<->" + k1,
      canonical: false
    };
  };
  const newSubsByOi = workSubs.map((subs, oi) => subs.map((sp, si) => {
    const docIdx = oiToDocIdx[oi], objId = allObjects[docIdx].id, isObjTarget = targetIds.has(objId);
    const n = sp.nodes.length, cnt = sp._segInfo.length;
    if (cnt === 0) return sp;
    const juncIndices = [];
    for (let i = 0; i < n; i++) if (sp._isJunc[i]) juncIndices.push(i);
    if (juncIndices.length === 0) {
      if (!isObjTarget) return allObjects[docIdx].subs[si];
      const s = simplifySubpath(sp, opts);
      return s && s.nodes && s.nodes.length >= 3 ? s : sp;
    }
    const numChains = sp.closed ? juncIndices.length : juncIndices.length - 1;
    const outSegs = [];
    let anyChainSimplified = false;
    for (let cIdx = 0; cIdx < numChains; cIdx++) {
      const startNodeIdx = juncIndices[cIdx], endNodeIdx = juncIndices[(cIdx + 1) % juncIndices.length];
      const chainNodes = [sp.nodes[startNodeIdx]], chainSegIndices = [];
      let cur = startNodeIdx, guard = 0;
      while (guard++ <= n) {
        chainSegIndices.push(cur);
        cur = (cur + 1) % n;
        chainNodes.push(sp.nodes[cur]);
        if (cur === endNodeIdx) break;
      }
      const firstSegInfo = sp._segInfo[chainSegIndices[0]], partner = firstSegInfo.partner;
      const partnerObjId = partner ? allObjects[oiToDocIdx[partner.oi]].id : null;
      const shouldSimplifyChain = !firstSegInfo.locked && (isObjTarget || partnerObjId && targetIds.has(partnerObjId));
      if (!shouldSimplifyChain) {
        for (const sIdx of chainSegIndices) {
          outSegs.push({
            c: vcSubpathSegment(sp, sIdx),
            line: vcSubpathSegIsLine(sp, sIdx)
          });
        }
        continue;
      }
      anyChainSimplified = true;
      let minSegs = sp.closed && juncIndices.length === 1 ? 3 : sp.closed && juncIndices.length === 2 ? 2 : 1;
      if (partner) {
        const partSp = workSubs[partner.oi][partner.si];
        const pMin = partSp.closed && partSp._juncCount === 1 ? 3 : partSp.closed && partSp._juncCount === 2 ? 2 : 1;
        minSegs = Math.max(minSegs, pMin);
      }
      if (!partner) {
        for (const f of vcSimplifyOpenChainNodes(chainNodes, opts, minSegs)) outSegs.push(f);
      } else {
        const {
          key,
          canonical
        } = getChainKey(oi, si, chainSegIndices[0], chainSegIndices.length, partner.oi, partner.si, partner.i, partner.relDir);
        let fitted;
        if (sharedChainCache.has(key)) {
          const cached = sharedChainCache.get(key);
          fitted = !canonical && partner.relDir === -1 ? vcReverseSegList(cached) : cached;
        } else {
          let canNodes = chainNodes;
          if (!canonical && partner.relDir === -1) {
            canNodes = chainNodes.slice().reverse().map((nd) => ({
              ...nd,
              handleIn: nd.handleOut ? {
                ...nd.handleOut
              } : null,
              handleOut: nd.handleIn ? {
                ...nd.handleIn
              } : null
            }));
          }
          const canFitted = vcSimplifyOpenChainNodes(canNodes, opts, minSegs);
          sharedChainCache.set(key, canFitted);
          fitted = !canonical && partner.relDir === -1 ? vcReverseSegList(canFitted) : canFitted;
        }
        for (const f of fitted) outSegs.push(f);
      }
    }
    const anyVertexTouched = sp.nodes.some((nd) => clusters[nd._cid].subRefs.size > 1 && activeCluster(clusters[nd._cid]));
    if (!anyChainSimplified && !anyVertexTouched) return allObjects[docIdx].subs[si];
    const built = vcSegsToSubpath(outSegs, sp.closed, sp.id);
    if (!built || built.nodes.length < (sp.closed ? 3 : 2)) return allObjects[docIdx].subs[si];
    return built;
  }));
  const rejected = /* @__PURE__ */ new Set();
  const pending = [];
  const reject = (key) => {
    if (rejected.has(key)) return;
    rejected.add(key);
    pending.push(key);
  };
  newSubsByOi.forEach((subs, oi) => subs.forEach((candidate, si) => {
    const original = allObjects[oiToDocIdx[oi]].subs[si];
    if (!vcSubpathWithinTolerance(original, candidate, opts.tolerance ?? 0.5)) {
      reject(oi + ":" + si);
    }
  }));
  const visitedClusters = /* @__PURE__ */ new Set();
  for (let i = 0; i < pending.length; i++) {
    const [oi, si] = pending[i].split(":").map(Number);
    for (const node of workSubs[oi][si].nodes) {
      if (visitedClusters.has(node._cid)) continue;
      visitedClusters.add(node._cid);
      for (const key of clusters[node._cid].subRefs) reject(key);
    }
    newSubsByOi[oi][si] = allObjects[oiToDocIdx[oi]].subs[si];
  }
  return {
    oiToDocIdx,
    newSubsByOi
  };
}
function simplifyDoc(doc, params = {}, selObjsSet = null, selNodesSet = null) {
  const hasSelObjs = selObjsSet && selObjsSet.size > 0;
  const targetObjs = doc.objects.filter((o) => !o.hidden && !o.locked && !o.img && !o.isFrameBg && !o.isAutoFrame && (!hasSelObjs || selObjsSet.has(o.id)));
  const bb = targetObjs.length ? docBounds({
    objects: targetObjs
  }) : null;
  const selSize = bb ? Math.max(bb[2] - bb[0], bb[3] - bb[1]) : 0;
  let level = null;
  if (params.auto) {
    level = autoSimplifyLevel(selSize);
  } else if (params.level != null && Number.isFinite(+params.level)) {
    level = Math.max(0, Math.min(100, Math.round(+params.level)));
  }
  const rawTol = level != null ? simplifyLevelTolerance(level) : params.tolerance != null ? +params.tolerance : 0.5;
  const tolerance = Math.max(1e-4, Math.min(1e4, Number.isFinite(rawTol) ? rawTol : 0.5));
  const cornerAngleDeg = params.cornerAngle != null ? Math.max(0, Math.min(180, +params.cornerAngle)) : params.angleThreshold != null ? Math.max(0, Math.min(180, 180 - +params.angleThreshold)) : 30;
  const opts = {
    tolerance,
    cornerAngleDeg,
    straightLines: !!params.straightLines,
    smooth: params.smooth != null ? +params.smooth : 0
  };
  const whole = !!params.wholePaths;
  const targetIds = new Set(targetObjs.map((o) => o.id));
  const hasPartialNodes = !whole && selNodesSet && selNodesSet.size > 0;
  let before = 0, after = 0, anyChanged = false;
  const nextSelNodes = /* @__PURE__ */ new Set();
  const changedIds = [];
  if (!hasPartialNodes) {
    const topo = vcTopologicalSimplifyObjects(doc.objects, targetIds, opts);
    if (!topo) {
      return {
        doc,
        changed: false,
        ids: [],
        before: 0,
        after: 0,
        level: level != null ? level : autoSimplifyLevel(selSize),
        tolerance,
        nextSelNodes
      };
    }
    const docIdxToOi = /* @__PURE__ */ new Map();
    topo.oiToDocIdx.forEach((docIdx, oi) => docIdxToOi.set(docIdx, oi));
    const objects2 = doc.objects.map((o, docIdx) => {
      const isTarget = targetIds.has(o.id);
      const nb = o.subs ? o.subs.reduce((s, sp) => s + sp.nodes.length, 0) : 0;
      if (isTarget) before += nb;
      if (!docIdxToOi.has(docIdx)) {
        if (isTarget) after += nb;
        return o;
      }
      const oi = docIdxToOi.get(docIdx);
      const nextSubs = topo.newSubsByOi[oi];
      const na = nextSubs.reduce((s, sp) => s + sp.nodes.length, 0);
      if (isTarget) after += na;
      const same = JSON.stringify(nextSubs.map((sp) => ({
        closed: sp.closed,
        nodes: sp.nodes.map((n) => [n.x, n.y, n.handleIn, n.handleOut, n.type])
      }))) === JSON.stringify(o.subs.map((sp) => ({
        closed: sp.closed,
        nodes: sp.nodes.map((n) => [n.x, n.y, n.handleIn, n.handleOut, n.type])
      })));
      if (!same) {
        anyChanged = true;
        changedIds.push(o.id);
        return {
          ...o,
          subs: nextSubs
        };
      }
      return o;
    });
    return {
      doc: anyChanged ? {
        ...doc,
        objects: objects2
      } : doc,
      changed: anyChanged,
      ids: changedIds,
      before,
      after,
      level: level != null ? level : autoSimplifyLevel(selSize),
      tolerance,
      nextSelNodes
    };
  }
  const sharedGrid = /* @__PURE__ */ new Map(), sharedEps = 0.03, sharedCell = sharedEps * 2;
  doc.objects.forEach((o) => {
    if (o.hidden || o.locked || o.img || o.isFrameBg || o.isAutoFrame || !o.subs) return;
    o.subs.forEach((sp) => sp.nodes.forEach((nd) => {
      const gx = Math.floor(nd.x / sharedCell), gy = Math.floor(nd.y / sharedCell);
      const k = gx + "," + gy;
      if (!sharedGrid.has(k)) sharedGrid.set(k, []);
      sharedGrid.get(k).push({
        objId: o.id,
        id: nd.id,
        x: nd.x,
        y: nd.y
      });
    }));
  });
  const isPinnedSharedNode = (nd, objId) => {
    const gx = Math.floor(nd.x / sharedCell), gy = Math.floor(nd.y / sharedCell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const b = sharedGrid.get(gx + dx + "," + (gy + dy));
        if (!b) continue;
        for (const item of b) {
          if (item.objId !== objId && Math.hypot(nd.x - item.x, nd.y - item.y) <= sharedEps) return true;
        }
      }
    }
    return false;
  };
  const objects = doc.objects.map((o) => {
    if (!targetIds.has(o.id)) return o;
    const nb = o.subs.reduce((s, sp) => s + sp.nodes.length, 0);
    before += nb;
    let workObj = o;
    let effSelNodes = selNodesSet;
    if (!whole && selNodesSet && selNodesSet.size > 0) {
      const nextSelSet = /* @__PURE__ */ new Set();
      o.subs.forEach((sp) => sp.nodes.forEach((nd) => {
        if (selNodesSet.has(nd.id) && !isPinnedSharedNode(nd, o.id)) nextSelSet.add(nd.id);
      }));
      const preSubs = o.subs.map((sp) => {
        const cRes = vcCollapseStackedCornerNodes(sp, opts, nextSelSet);
        cRes.mergedIds.forEach((id) => nextSelSet.add(id));
        return cRes.sp;
      });
      workObj = {
        ...o,
        subs: preSubs
      };
      effSelNodes = /* @__PURE__ */ new Set([...selNodesSet, ...nextSelSet]);
    }
    const pickedSegs = /* @__PURE__ */ new Set();
    const selAnchorPairs = [];
    if (!whole && effSelNodes && effSelNodes.size > 0) {
      workObj.subs.forEach((sp, si) => {
        sp.nodes.forEach((nd, ai) => {
          if (effSelNodes.has(nd.id)) selAnchorPairs.push([si, ai]);
        });
        const sc = vcSubpathSegCount(sp), m = sp.nodes.length;
        for (let i = 0; i < sc; i++) {
          const a = sp.nodes[i], b = sp.nodes[(i + 1) % m];
          if (effSelNodes.has(a.id) && effSelNodes.has(b.id) && !isPinnedSharedNode(a, o.id) && !isPinnedSharedNode(b, o.id)) {
            pickedSegs.add(si + ":" + i);
          }
        }
      });
    }
    let nextObj;
    const objectSelection = /* @__PURE__ */ new Set();
    if (pickedSegs.size > 0) {
      const part = simplifyPart(workObj, pickedSegs, opts);
      nextObj = part.obj;
      const keptRefs = [];
      selAnchorPairs.forEach(([si, ai]) => {
        const mapped = part.anchors.get(si + ":" + ai);
        if (mapped) keptRefs.push(mapped);
      });
      part.segments.forEach(([si, i]) => {
        const sp = nextObj.subs[si];
        const m = sp ? Math.max(1, sp.nodes.length) : 1;
        keptRefs.push([si, i], [si, (i + 1) % m]);
      });
      const totalNextNodes = nextObj.subs.reduce((s, sp) => s + sp.nodes.length, 0);
      const uqNodes = /* @__PURE__ */ new Set();
      keptRefs.forEach(([si, ai]) => {
        const nd = nextObj.subs[si] && nextObj.subs[si].nodes[ai];
        if (nd) uqNodes.add(nd.id);
      });
      if (uqNodes.size < totalNextNodes) {
        uqNodes.forEach((id) => objectSelection.add(id));
      }
    } else if (!whole && selNodesSet && selNodesSet.size > 0 && workObj !== o) {
      nextObj = workObj;
      workObj.subs.forEach((sp) => sp.nodes.forEach((nd) => {
        if (effSelNodes.has(nd.id)) objectSelection.add(nd.id);
      }));
    } else {
      nextObj = simplifyWith(workObj, opts);
    }
    const hasExcessDeviation = nextObj.subs.length !== o.subs.length || nextObj.subs.some((sp, si) => !vcSubpathWithinTolerance(o.subs[si], sp, tolerance));
    if (hasExcessDeviation) {
      after += nb;
      o.subs.forEach((sp) => sp.nodes.forEach((node) => {
        if (selNodesSet.has(node.id)) nextSelNodes.add(node.id);
      }));
      return o;
    }
    objectSelection.forEach((id) => nextSelNodes.add(id));
    const na = nextObj.subs.reduce((s, sp) => s + sp.nodes.length, 0);
    after += na;
    const same = JSON.stringify(nextObj.subs.map((sp) => ({
      closed: sp.closed,
      nodes: sp.nodes.map((n) => [n.x, n.y, n.handleIn, n.handleOut, n.type])
    }))) === JSON.stringify(o.subs.map((sp) => ({
      closed: sp.closed,
      nodes: sp.nodes.map((n) => [n.x, n.y, n.handleIn, n.handleOut, n.type])
    })));
    if (!same) {
      anyChanged = true;
      changedIds.push(o.id);
      return nextObj;
    }
    return o;
  });
  return {
    doc: anyChanged ? {
      ...doc,
      objects
    } : doc,
    changed: anyChanged,
    ids: changedIds,
    before,
    after,
    level: level != null ? level : autoSimplifyLevel(selSize),
    tolerance,
    nextSelNodes
  };
}
function fixAllAnomalies(doc, opt = {}) {
  let cur = doc;
  for (let pass = 0; pass < 4; pass++) {
    const insp = detectAnomalies(cur, opt);
    const all = [...insp.clusteredCorners, ...insp.collinearNodes, ...insp.facetedCurves, ...insp.denseArcNodes, ...insp.wobblyLines];
    if (!all.length) break;
    let prev = cur;
    for (const anom of all) {
      cur = fixAnomaly(cur, anom, opt);
    }
    if (cur === prev) break;
  }
  return cur;
}
function fixAnomaly(doc, anom, opt = {}) {
  if (!anom || !anom.objId || !anom.subId) return doc;
  const tol = opt.tol || 1;
  let changed = false;
  const objects = doc.objects.map((o) => {
    if (o.id !== anom.objId) return o;
    const subs = o.subs.map((sp) => {
      if (sp.id !== anom.subId) return sp;
      const closed = sp.closed, minKeep = closed ? 3 : 2;
      let nodes = null;
      if (anom.type === "corner_cluster") nodes = collapseClusters(sp.nodes.map(cl), [anom]);
      else if (anom.type === "collinear") {
        if (sp.nodes.length > minKeep && sp.nodes.some((n) => n.id === anom.nodeId)) nodes = sp.nodes.filter((n) => n.id !== anom.nodeId).map(cl);
      } else if (anom.type === "faceted" || anom.type === "dense_arc") nodes = refitChain(sp.nodes, closed, anom.nodeIds, tol);
      else if (anom.type === "wobbly") {
        const have = new Set(sp.nodes.map((n) => n.id));
        if (anom.nodeIds.every((id) => have.has(id))) {
          const drop = new Set(anom.nodeIds.slice(1, -1));
          nodes = sp.nodes.filter((n) => !drop.has(n.id)).map(cl);
        }
      }
      if (!nodes || nodes.length < minKeep || nodes.length >= sp.nodes.length) return sp;
      nodes.forEach((nd) => {
        if (!nd.handleIn && !nd.handleOut) nd.type = "corner";
      });
      changed = true;
      return {
        ...sp,
        nodes
      };
    });
    return changed ? {
      ...o,
      subs
    } : o;
  });
  return changed ? {
    ...doc,
    objects
  } : doc;
}
function autoSimplifyDoc(doc, targetIds = null) {
  if (!doc || !Array.isArray(doc.objects)) return { doc, changed: false, count: 0, before: 0, after: 0 };
  const targetFilter = targetIds ? ((id) => targetIds.has(id)) : (() => true);
  const eligibleObjs = doc.objects.filter(
    (o) => o && !o.hidden && !o.locked && !o.img && !o.text && !o.isLegacyText && !o.isFrameBg && !o.isAutoFrame && !o._autoSimplified && Array.isArray(o.subs) && o.subs.length > 0 && targetFilter(o.id)
  );
  if (!eligibleObjs.length) return { doc, changed: false, count: 0, before: 0, after: 0 };
  const eligibleIds = new Set(eligibleObjs.map((o) => o.id));
  const simpRes = simplifyDoc(doc, {
    level: 100,
    cornerAngle: 30,
    straightLines: false
  }, eligibleIds);
  const nextObjects = simpRes.doc.objects.map((o) => {
    if (eligibleIds.has(o.id)) {
      return { ...o, _autoSimplified: true };
    }
    return o;
  });
  return {
    doc: { ...simpRes.doc, objects: nextObjects },
    changed: simpRes.changed || true,
    count: eligibleObjs.length,
    before: simpRes.before,
    after: simpRes.after
  };
}

// src/engine/blobGenerator.tsx
var blobGenerator_exports = {};
__export(blobGenerator_exports, {
  DEFAULT_BLOB_PARAMS: () => DEFAULT_BLOB_PARAMS,
  blobNodes: () => blobNodes,
  default: () => blobGenerator_default,
  normalizeBlobParams: () => normalizeBlobParams,
  regenBlob: () => regenBlob,
  seededRandom: () => seededRandom
});

// src/engine/nodeEditingAndHandles.tsx
function autoHandles(o, spId, opt) {
  opt = opt || {};
  const tau = opt.tau == null ? 1 / 3 : opt.tau;
  const minA = (opt.minAngle || 0) * Math.PI / 180;
  const ids = opt.ids || null;
  const clear = !!opt.clear || !opt.preserveShape && tau < 5e-3;
  const preserve = opt.preserveShape !== false && !clear;
  let changed = false;
  const subs = o.subs.map((sp) => {
    const n = sp.nodes.length;
    if (spId && sp.id !== spId || n < 2) return sp;
    if (ids && !sp.nodes.some((q) => ids.has(q.id))) return sp;
    const src = sp.nodes;
    const out = src.map(cl);
    const closed = !!sp.closed;
    if (clear) {
      for (let i = 0; i < n; i++) {
        if (ids && !ids.has(src[i].id)) continue;
        const nd = out[i];
        if (nd.handleIn || nd.handleOut || nd.type !== "corner") changed = true;
        nd.handleIn = null;
        nd.handleOut = null;
        nd.type = "corner";
        nd.fil = null;
      }
      return {
        ...sp,
        nodes: out
      };
    }
    if (preserve) {
      const segCount = closed ? n : n - 1;
      for (let i = 0; i < segCount; i++) {
        const j = (i + 1) % n;
        const a = out[i], b = out[j];
        const touchA = !ids || ids.has(a.id);
        const touchB = !ids || ids.has(b.id);
        if (!touchA && !touchB) continue;
        if (!a.handleOut && !b.handleIn) {
          const d = dist(a, b);
          if (d > 1e-6) {
            if (touchA) {
              a.handleOut = lerp(a, b, 1 / 3);
              changed = true;
            }
            if (touchB) {
              b.handleIn = lerp(a, b, 2 / 3);
              changed = true;
            }
          }
        } else if (!a.handleOut && b.handleIn && touchA) {
          const d = dist(a, b.handleIn);
          if (d > 1e-6) {
            a.handleOut = lerp(a, b.handleIn, 1 / 3);
            changed = true;
          }
        } else if (a.handleOut && !b.handleIn && touchB) {
          const d = dist(b, a.handleOut);
          if (d > 1e-6) {
            b.handleIn = lerp(b, a.handleOut, 1 / 3);
            changed = true;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const nd = out[i];
        if (ids && !ids.has(nd.id)) continue;
        if (nd.handleIn && nd.handleOut) {
          const vi = sub(nd, nd.handleIn), vo = sub(nd.handleOut, nd);
          const li = Math.hypot(vi.x, vi.y), lo = Math.hypot(vo.x, vo.y);
          if (li > 1e-6 && lo > 1e-6 && Math.abs(Math.atan2(cross(vi, vo), dot(vi, vo))) < 0.05) {
            nd.type = Math.abs(li - lo) < 0.5 ? "symmetric" : "smooth";
          } else {
            nd.type = "corner";
          }
        }
      }
      return {
        ...sp,
        nodes: out
      };
    }
    if (closed && n < 3) return sp;
    for (let i = 0; i < n; i++) {
      const P2 = src[i];
      if (ids && !ids.has(P2.id)) continue;
      const nd = out[i];
      const hasPrev = closed || i > 0, hasNext = closed || i < n - 1;
      const Pp = hasPrev ? src[(i - 1 + n) % n] : {
        x: 2 * P2.x - src[1].x,
        y: 2 * P2.y - src[1].y
      };
      const Pn = hasNext ? src[(i + 1) % n] : {
        x: 2 * P2.x - src[n - 2].x,
        y: 2 * P2.y - src[n - 2].y
      };
      const d1 = Math.hypot(P2.x - Pp.x, P2.y - Pp.y), d2 = Math.hypot(Pn.x - P2.x, Pn.y - P2.y);
      const t1 = Math.sqrt(Math.max(d1, 1e-6)), t2 = Math.sqrt(Math.max(d2, 1e-6));
      if (minA > 0 && hasPrev && hasNext && d1 > 1e-9 && d2 > 1e-9) {
        const c = ((Pp.x - P2.x) * (Pn.x - P2.x) + (Pp.y - P2.y) * (Pn.y - P2.y)) / (d1 * d2);
        if (Math.acos(Math.max(-1, Math.min(1, c))) < minA) continue;
      }
      let vx = t2 * (P2.x - Pp.x) / (t1 * (t1 + t2)) + t1 * (Pn.x - P2.x) / (t2 * (t1 + t2));
      let vy = t2 * (P2.y - Pp.y) / (t1 * (t1 + t2)) + t1 * (Pn.y - P2.y) / (t2 * (t1 + t2));
      let L = Math.hypot(vx, vy);
      if (L < 1e-9) {
        vx = Pn.x - Pp.x;
        vy = Pn.y - Pp.y;
        L = Math.hypot(vx, vy);
      }
      if (L < 1e-9) continue;
      const tx = vx / L, ty = vy / L;
      nd.handleIn = hasPrev ? {
        x: P2.x - tx * tau * d1,
        y: P2.y - ty * tau * d1
      } : null;
      nd.handleOut = hasNext ? {
        x: P2.x + tx * tau * d2,
        y: P2.y + ty * tau * d2
      } : null;
      nd.type = hasPrev && hasNext && Math.abs(d1 - d2) < 0.5 ? "symmetric" : "smooth";
      nd.fil = null;
      changed = true;
    }
    return {
      ...sp,
      nodes: out
    };
  });
  return changed ? {
    ...o,
    subs
  } : o;
}

// src/engine/blobGenerator.tsx
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var DEFAULT_BLOB_PARAMS = { points: 8, irregularity: 0.35, smoothness: 0.7, seed: 0, rotation: 0, spikiness: 0 };
function normalizeBlobParams(p) {
  const q = { ...DEFAULT_BLOB_PARAMS, ...p || {} };
  q.points = Math.max(3, Math.min(48, Math.round(Number(q.points) || 8)));
  q.irregularity = Math.max(0, Math.min(1, Number(q.irregularity) || 0));
  q.smoothness = Math.max(0, Math.min(1, Number(q.smoothness) || 0));
  q.seed = Math.floor(Number(q.seed) || 0) >>> 0;
  q.rotation = Math.max(0, Math.min(360, Math.round(Number(q.rotation) || 0)));
  q.spikiness = Math.max(0, Math.min(1, Number(q.spikiness) || 0));
  return q;
}
function blobNodes(cx, cy, rx, ry, params) {
  const p = normalizeBlobParams(params);
  const rand = seededRandom(p.seed);
  const rotRad = p.rotation * Math.PI / 180;
  const pts = [];
  for (let i = 0; i < p.points; i++) {
    const ang = i / p.points * Math.PI * 2 - Math.PI / 2 + rotRad;
    let r = Math.max(0.05, 1 - rand() * p.irregularity);
    if (p.spikiness > 0) {
      const spikeFactor = i % 2 === 1 ? 1 - p.spikiness * 0.65 : 1;
      r = Math.max(0.05, r * spikeFactor);
    }
    pts.push({
      x: cx + Math.cos(ang) * rx * r,
      y: cy + Math.sin(ang) * ry * r,
      type: "corner",
      handleIn: null,
      handleOut: null
    });
  }
  const smoothed = autoHandles({ subs: [{ id: "blob-tmp", closed: true, nodes: pts }] }, null, {
    preserveShape: false,
    tau: p.smoothness * 0.5
  });
  return smoothed.subs[0].nodes;
}
function regenBlob(obj, newUiParams) {
  const g = obj.gen || {};
  const p = normalizeBlobParams({ ...g, ...newUiParams || {} });
  const cx = newUiParams && newUiParams.cx != null ? Number(newUiParams.cx) : Number(g.cx) || 0, cy = newUiParams && newUiParams.cy != null ? Number(newUiParams.cy) : Number(g.cy) || 0, rx = newUiParams && newUiParams.rx != null ? Number(newUiParams.rx) : Number(g.rx) || 50, ry = newUiParams && newUiParams.ry != null ? Number(newUiParams.ry) : Number(g.ry) || 50;
  const nodes = blobNodes(cx, cy, rx, ry, p);
  const oldNodes = obj.subs && obj.subs[0] && obj.subs[0].nodes || [];
  const withIds = nodes.map((n, i) => ({
    ...n,
    id: oldNodes[i] && oldNodes[i].id ? oldNodes[i].id : uid()
  }));
  return {
    ...obj,
    subs: [{ id: obj.subs && obj.subs[0] && obj.subs[0].id ? obj.subs[0].id : uid(), closed: true, nodes: withIds }],
    gen: {
      kind: "blob",
      points: p.points,
      irregularity: p.irregularity,
      smoothness: p.smoothness,
      seed: p.seed,
      ...p.rotation || g.rotation !== void 0 ? { rotation: p.rotation } : {},
      ...p.spikiness || g.spikiness !== void 0 ? { spikiness: p.spikiness } : {},
      cx,
      cy,
      rx,
      ry
    }
  };
}
var blobGenerator_default = blobNodes;

// src/engine/weaveGenerator.tsx
var weaveGenerator_exports = {};
__export(weaveGenerator_exports, {
  DEFAULT_WEAVE_PARAMS: () => DEFAULT_WEAVE_PARAMS,
  default: () => weaveGenerator_default,
  normalizeWeaveParams: () => normalizeWeaveParams,
  weaveStrips: () => weaveStrips
});
var DEFAULT_WEAVE_PARAMS = { cols: 6, rows: 4, amplitude: 0.25, thickness: 0.6 };
var r2 = (v) => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? 0 : r;
};
var f2 = (v) => r2(v).toFixed(2);
function normalizeWeaveParams(p) {
  const q = { ...DEFAULT_WEAVE_PARAMS, ...p || {} };
  const fin = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  q.cols = Math.max(2, Math.min(12, Math.round(fin(q.cols, 6))));
  q.rows = Math.max(2, Math.min(12, Math.round(fin(q.rows, 4))));
  q.amplitude = Math.max(0, Math.min(0.5, fin(q.amplitude, 0.25)));
  q.thickness = Math.max(0.2, Math.min(1, fin(q.thickness, 0.6)));
  if (p && p.waveType) q.waveType = p.waveType === "triangle" || p.waveType === "square" ? p.waveType : "sine";
  if (p && p.gapSize !== void 0) q.gapSize = Math.max(0, Math.min(1, fin(p.gapSize, 0.5)));
  if (p && p.frequency !== void 0) q.frequency = Math.max(1, Math.min(4, Math.round(fin(p.frequency, 1))));
  if (p && p.phase !== void 0) q.phase = Math.max(0, Math.min(360, Math.round(fin(p.phase, 0))));
  return q;
}
function calcWaveVal(u, vC, amp, period, phase0, waveType, freq, phaseOffset) {
  const f = Math.max(0.25, Math.min(8, Number(freq) || 1));
  const phRad = (Number(phaseOffset) || 0) * Math.PI / 180;
  const t = 2 * Math.PI * f * (u - phase0) / period + phRad;
  let w = 0;
  if (waveType === "triangle") {
    w = Math.asin(Math.sin(t)) * 2 / Math.PI;
  } else if (waveType === "square") {
    const s = Math.sin(t);
    w = Math.sign(s) * Math.min(1, Math.abs(s) * 1.5);
  } else {
    w = Math.sin(t);
  }
  return vC + amp * w;
}
function edgeCmds(pts, fmt2) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return "L" + fmt2(pts[1]);
  const ext = (i) => {
    if (i < 0) return [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]];
    if (i >= pts.length) {
      const n = pts.length - 1;
      return [2 * pts[n][0] - pts[n - 1][0], 2 * pts[n][1] - pts[n - 1][1]];
    }
    return pts[i];
  };
  let d = "";
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = ext(k - 1), p1 = pts[k], p2 = pts[k + 1], p3 = ext(k + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += "C" + fmt2(c1) + " " + fmt2(c2) + " " + fmt2(p2);
  }
  return d;
}
function bandPiece(uA, uB, vC, amp, thick, period, phase0, horizontal, waveType = "sine", freq = 1, phaseOffset = 0) {
  const wave = (u) => calcWaveVal(u, vC, amp, period, phase0, waveType, freq, phaseOffset);
  const f = Math.max(0.25, Math.min(8, Number(freq) || 1));
  const step = period / (4 * f);
  const us = [uA];
  for (let m = Math.floor((uA - phase0) / step) + 1; ; m++) {
    const u = phase0 + m * step;
    if (u >= uB - 1e-9) break;
    us.push(u);
  }
  us.push(uB);
  const top = us.map((u) => [u, wave(u) - thick / 2]);
  const bot = us.map((u) => [u, wave(u) + thick / 2]);
  const fmt2 = horizontal ? (p) => f2(p[0]) + " " + f2(p[1]) : (p) => f2(p[1]) + " " + f2(p[0]);
  let d = "M" + fmt2(top[0]);
  d += edgeCmds(top, fmt2);
  d += "L" + fmt2(bot[bot.length - 1]);
  d += edgeCmds(bot.slice().reverse(), fmt2);
  d += "Z";
  return d;
}
function subtractIntervals(interval, gaps) {
  const [lo, hi] = interval;
  const out = [];
  let cur = lo;
  const sorted = gaps.map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  for (const [a, b] of sorted) {
    if (a > cur + 0.01) out.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (hi > cur + 0.01) out.push([cur, hi]);
  return out.filter(([a, b]) => b - a >= 0.01);
}
function weaveStrips(x, y, w, h, params) {
  const p = normalizeWeaveParams(params);
  const cw = w / p.cols, ch = h / p.rows;
  const tH = p.thickness * ch, tV = p.thickness * cw;
  const aH = Math.min(p.amplitude * ch, Math.max(0, (ch - tH) / 2));
  const aV = Math.min(p.amplitude * cw, Math.max(0, (cw - tV) / 2));
  const gapFactor = p.gapSize !== void 0 ? Math.max(0.1, Math.min(2, Number(p.gapSize) * 2)) : 1;
  const waveType = p.waveType || "sine";
  const freq = p.frequency || 1;
  const phase = p.phase || 0;
  const out = [];
  for (let i = 0; i < p.rows; i++) {
    const yC = y + (i + 0.5) * ch;
    const gaps = [];
    for (let j = 0; j < p.cols; j++) {
      if ((i + j) % 2 === 1) {
        const xJ = x + (j + 0.5) * cw, eV = Math.min(cw * 0.5, (tV / 2 + aV) * gapFactor);
        gaps.push([xJ - eV, xJ + eV]);
      }
    }
    let pieces = subtractIntervals([x, x + w], gaps);
    if (!pieces.length) pieces = [[x, x + w]];
    const d = pieces.map(([a, b]) => bandPiece(a, b, yC, aH, tH, cw, x, true, waveType, freq, phase)).join(" ");
    out.push({ d, over: i % 2 === 0, bbox: [r2(x), r2(yC - tH / 2 - aH), r2(x + w), r2(yC + tH / 2 + aH)] });
  }
  for (let j = 0; j < p.cols; j++) {
    const xC = x + (j + 0.5) * cw;
    const gaps = [];
    for (let i = 0; i < p.rows; i++) {
      if ((i + j) % 2 === 0) {
        const yI = y + (i + 0.5) * ch, eH = Math.min(ch * 0.5, (tH / 2 + aH) * gapFactor);
        gaps.push([yI - eH, yI + eH]);
      }
    }
    let pieces = subtractIntervals([y, y + h], gaps);
    if (!pieces.length) pieces = [[y, y + h]];
    const d = pieces.map(([a, b]) => bandPiece(a, b, xC, aV, tV, ch, y, false, waveType, freq, phase)).join(" ");
    out.push({ d, over: j % 2 === 1, bbox: [r2(xC - tV / 2 - aV), r2(y), r2(xC + tV / 2 + aV), r2(y + h)] });
  }
  return out;
}
var weaveGenerator_default = weaveStrips;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  blobGenerator,
  cornerFilletModule,
  pathBooleanModule,
  svgDocParser,
  svgDocSerializer,
  svgPathParser,
  topologicalSimplifier,
  weaveGenerator
});
