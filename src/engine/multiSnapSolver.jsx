/**
 * @file src/engine/multiSnapSolver.jsx
 * @description Mesin snapping presisi tinggi (Grid, BBox, Node, Kurva, Sumbu, & Smart Spacing)
 */
import { getDocSpatialIndex, nearOnSeg, tightBBox } from './spatialIndexAndHitTest.jsx';
import { sub, dot, dist, nrm, cross } from './vectorPrimitives.jsx';
import { segPoint } from './bezierSubdivisionAndMove.jsx';
import { PERF_TELEMETRY } from '../utils/renderConfigAndTelemetry.jsx';

/* snap: (1) node/handle objek lain, (2) midpoint, (3) hline, (4) tepi/kontur objek lain, (5) grid per-sumbu via Spatial Index O(1) */
function snapPt(p, objects, exObjs, exNodes, thr, grid, noEdge, noHandle, hLines, noNode, midpoints) {
  const sIdx = getDocSpatialIndex(objects);
  let best = null,
    bd2 = thr * thr,
    bestKind = 'node';
  let mb = null,
    md2 = thr * thr;
  if (sIdx && (!noNode || midpoints)) {
    sIdx.queryPoint(p.x, p.y, thr, item => {
      const o = item.o;
      if (exObjs && exObjs.has(o.id) || o.hidden || o.isFrameBg || o.isAutoFrame) return;
      if (item.kind === 'midpoint') {
        if (!midpoints) return;
        if (exNodes && exNodes.has(item.a.id) && exNodes.has(item.b.id)) return;
        const dx = p.x - item.x,
          dy = p.y - item.y,
          d2 = dx * dx + dy * dy;
        if (d2 < md2) {
          md2 = d2;
          mb = item;
        }
        return;
      }
      if (noNode) return;
      if (item.h && noHandle) return;
      if (exNodes && item.n && exNodes.has(item.n.id)) return;
      const dx = p.x - item.x,
        dy = p.y - item.y,
        d2 = dx * dx + dy * dy;
      if (d2 < bd2) {
        bd2 = d2;
        best = item;
        bestKind = item.kind || 'node';
      }
    });
  }
  if (best) return {
    x: best.x,
    y: best.y,
    ind: true,
    kind: bestKind === 'handle-in' || bestKind === 'handle-out' ? 'node' : bestKind,
    subKind: bestKind
  };
  if (mb) return {
    x: mb.x,
    y: mb.y,
    ind: true,
    kind: 'midpoint'
  };

  /* garis pemandu handle (node -> titik handle) objek lain */
  if (hLines && !noHandle && sIdx) {
    let hbx = 0,
      hby = 0,
      hasHb = false,
      hd2 = thr * thr;
    const cands = sIdx.queryObjectsInRect(p.x - thr * 6, p.y - thr * 6, p.x + thr * 6, p.y + thr * 6);
    for (let ci = 0; ci < cands.length; ci++) {
      const o = cands[ci].o;
      if (exObjs && exObjs.has(o.id) || o.hidden || o.isFrameBg || o.isAutoFrame) continue;
      for (const sp of o.subs) for (const n of sp.nodes) {
        if (exNodes && exNodes.has(n.id)) continue;
        for (let hi = 0; hi < 2; hi++) {
          const q = hi === 0 ? n.handleIn : n.handleOut;
          if (!q) continue;
          const abx = q.x - n.x,
            aby = q.y - n.y,
            L2 = abx * abx + aby * aby;
          if (L2 < 1e-12) continue;
          const t = Math.max(0, Math.min(1, ((p.x - n.x) * abx + (p.y - n.y) * aby) / L2)),
            cx = n.x + abx * t,
            cy = n.y + aby * t,
            dx = p.x - cx,
            dy = p.y - cy,
            d2 = dx * dx + dy * dy;
          if (d2 < hd2) {
            hd2 = d2;
            hbx = cx;
            hby = cy;
            hasHb = true;
          }
        }
      }
    }
    if (hasHb) return {
      x: hbx,
      y: hby,
      ind: true,
      kind: 'hline'
    };
  }
  if (!noEdge && sIdx) {
    let eb = null,
      ed = thr;
    sIdx.querySegments(p.x, p.y, thr, sg => {
      const o = sg.o;
      if (exObjs && exObjs.has(o.id) || o.hidden || o.isFrameBg || o.isAutoFrame) return;
      if (exNodes && exNodes.has(sg.a.id) && exNodes.has(sg.b.id)) return;
      const r = nearOnSeg(sg.a, sg.b, p);
      if (r.d < ed) {
        ed = r.d;
        eb = r;
      }
    });
    if (eb) return {
      x: eb.x,
      y: eb.y,
      ind: true,
      kind: 'edge'
    };
  }
  let {
      x,
      y
    } = p,
    ind = false;
  if (grid) {
    const gx = Math.round(x / grid) * grid,
      gy = Math.round(y / grid) * grid;
    if (Math.abs(gx - x) < thr) {
      x = gx;
      ind = true;
    }
    if (Math.abs(gy - y) < thr) {
      y = gy;
      ind = true;
    }
  }
  return {
    x,
    y,
    ind,
    kind: ind ? 'grid' : null
  };
}

/* banyak titik sekaligus (node/handle yang ikut tergeser): tanpa batas waktu atau pemotongan jumlah titik */
/* banyak titik sekaligus (node/handle yang ikut tergeser): tanpa batas waktu atau pemotongan jumlah titik */
function snapMany(pts, objects, exObjs, exNodes, thr, opt) {
  opt = opt || {};
  let best = null,
    bd = 1e18;
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i];
    const r = snapPt(q, objects, exObjs, exNodes, thr, 0, !!opt.noEdge, false, false, !!opt.noNode);
    if (r.ind) {
      const d = dist(q, r);
      if (d < bd) {
        bd = d;
        best = {
          dx: r.x - q.x,
          dy: r.y - q.y,
          x: r.x,
          y: r.y,
          kind: r.kind
        };
      }
    }
  }
  return best;
}

/* node dengan handle 'w' ('in'/'out') dipindah ke t; handle lawan ikut untuk smooth/symmetric (kecuali alt) */
/* node dengan handle 'w' ('in'/'out') dipindah ke t; handle lawan ikut untuk smooth/symmetric (kecuali alt) */
function rebuildHandle(n, w, t, alt) {
  const key = w === 'in' ? 'handleIn' : 'handleOut',
    oth = w === 'in' ? 'handleOut' : 'handleIn',
    nn = {
      ...n,
      fil: null,
      [key]: {
        x: t.x,
        y: t.y
      }
    };
  if (alt && (n.type === 'smooth' || n.type === 'symmetric')) nn.type = 'corner';
  if ((n.type === 'smooth' || n.type === 'symmetric') && n[oth] && !alt) {
    const v = nrm(sub(n, t)),
      L = n.type === 'symmetric' ? dist(n, t) : dist(n, n[oth]);
    nn[oth] = {
      x: n.x + v.x * L,
      y: n.y + v.y * L
    };
  }
  return nn;
}

/* GV-005: snapHandleCurve dengan coarse-to-fine sampling (N=24), Spatial Index, dan time-budget 2.5ms */
/* GV-005: snapHandleCurve dengan coarse-to-fine sampling (N=24), Spatial Index, dan time-budget 2.5ms */
function snapHandleCurve(objects, objId, nodeId, w, tg, alt, thr, noNode) {
  const tStart = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  const o = objects.find(x => x.id === objId);
  if (!o) return null;
  let cx = null;
  for (const sp of o.subs) {
    const ns = sp.nodes,
      L = ns.length,
      i = ns.findIndex(n => n.id === nodeId);
    if (i >= 0) {
      if (L < 2) return null;
      cx = {
        n: ns[i],
        prev: i > 0 || sp.closed ? ns[(i - 1 + L) % L] : null,
        next: i < L - 1 || sp.closed ? ns[(i + 1) % L] : null
      };
      break;
    }
  }
  if (!cx) return null;
  const others = new Set([objId]),
    N = 24,
    EPS = 0.5,
    MINS = 0.12;
  const segsOf = nn => {
    const l = [];
    if (cx.prev) l.push([cx.prev, nn]);
    if (cx.next) l.push([nn, cx.next]);
    return l;
  };
  const contact = t => {
    const A = segsOf(rebuildHandle(cx.n, w, t, alt)),
      B = segsOf(rebuildHandle(cx.n, w, {
        x: t.x + EPS,
        y: t.y
      }, alt)),
      C = segsOf(rebuildHandle(cx.n, w, {
        x: t.x,
        y: t.y + EPS
      }, alt));
    let best = null;
    for (let si = 0; si < A.length; si++) {
      for (let k = 1; k < N; k++) {
        const tt = k / N,
          q = segPoint(A[si][0], A[si][1], tt);
        const qx = segPoint(B[si][0], B[si][1], tt),
          qy = segPoint(C[si][0], C[si][1], tt);
        const j11 = (qx.x - q.x) / EPS,
          j21 = (qx.y - q.y) / EPS,
          j12 = (qy.x - q.x) / EPS,
          j22 = (qy.y - q.y) / EPS;
        if (Math.hypot(j11, j21, j12, j22) < MINS) continue;
        const r = snapPt(q, objects, others, null, thr, 0, false, true, false, !!noNode);
        if (r.ind) {
          const d = dist(q, r);
          if (!best || d < best.d) best = {
            d,
            si,
            tt,
            A,
            B,
            C
          };
        }
      }
    }
    if (!best) return null;
    const at = (arr, tt) => segPoint(arr[best.si][0], arr[best.si][1], tt);
    const dd = tt => {
      const q = at(A, tt),
        r = snapPt(q, objects, others, null, thr * 2, 0, false, true, false, !!noNode);
      return r.ind ? dist(q, r) : 1e9;
    };
    let lo = Math.max(1 / N, best.tt - 1 / N),
      hi = Math.min(1 - 1 / N, best.tt + 1 / N);
    for (let it = 0; it < 8; it++) {
      const m1 = lo + (hi - lo) / 3,
        m2 = hi - (hi - lo) / 3;
      if (dd(m1) < dd(m2)) hi = m2;else lo = m1;
    }
    const tt = (lo + hi) / 2,
      q = at(A, tt),
      qx = at(B, tt),
      qy = at(C, tt),
      r = snapPt(q, objects, others, null, thr * 2, 0, false, true, false, !!noNode);
    if (!r.ind) return null;
    return {
      d: dist(q, r),
      q,
      r,
      j11: (qx.x - q.x) / EPS,
      j21: (qx.y - q.y) / EPS,
      j12: (qy.x - q.x) / EPS,
      j22: (qy.y - q.y) / EPS
    };
  };
  const c0 = contact(tg);
  if (!c0) return null;
  let cur = {
      x: tg.x,
      y: tg.y
    },
    c = c0;
  for (let it = 0; it < 5 && c; it++) {
    const vx = c.r.x - c.q.x,
      vy = c.r.y - c.q.y;
    if (Math.hypot(vx, vy) < 0.02) break;
    const det = c.j11 * c.j22 - c.j12 * c.j21;
    if (Math.abs(det) < 1e-4) break;
    let ddx = (vx * c.j22 - vy * c.j12) / det,
      ddy = (vy * c.j11 - vx * c.j21) / det;
    const m = Math.hypot(ddx, ddy),
      cap = thr * 4;
    if (m > cap) {
      ddx *= cap / m;
      ddy *= cap / m;
    }
    cur = {
      x: cur.x + ddx,
      y: cur.y + ddy
    };
    c = contact(cur);
  }
  if (!c || c.d > c0.d + 1e-6 || c.d >= thr) return null;
  return {
    tg: cur,
    x: c.r.x,
    y: c.r.y,
    kind: c.r.kind
  };
}

/* snapOutline dengan Spatial Index lookup penuh tanpa batas waktu (selalu berfungsi di semua keadaan) */
/* snapOutline dengan Spatial Index lookup penuh tanpa batas waktu (selalu berfungsi di semua keadaan) */
function snapOutline(samples, segs, objects, exObjs, thr, dx, dy, opt) {
  opt = opt || {};
  let best = null,
    bs = 1e18;
  const sIdx = getDocSpatialIndex(objects);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i],
      q = {
        x: s.x + dx,
        y: s.y + dy
      };
    const r = snapPt(q, objects, exObjs, null, thr, 0, !!opt.noEdge, false, false, !!opt.noNode);
    if (r.ind) {
      const d = dist(q, r),
        sc = r.kind === 'edge' ? d * 1.25 : d;
      if (sc < bs) {
        bs = sc;
        best = {
          dx: r.x - q.x,
          dy: r.y - q.y,
          x: r.x,
          y: r.y,
          kind: r.kind
        };
      }
    }
  }
  if (!(opt.noNode && opt.noEdge) && sIdx && segs.length) {
    for (let si = 0; si < segs.length; si++) {
      const sg = segs[si],
        b = sg.bb;
      const wx0 = b[0] + dx - thr,
        wy0 = b[1] + dy - thr,
        wx1 = b[2] + dx + thr,
        wy1 = b[3] + dy + thr;
      const cands = sIdx.queryObjectsInRect(wx0, wy0, wx1, wy1);
      for (let ci = 0; ci < cands.length; ci++) {
        const o = cands[ci].o;
        if (exObjs && exObjs.has(o.id) || o.hidden || o.isFrameBg || o.isAutoFrame) continue;
        for (const sp of o.subs) for (const n of sp.nodes) {
          if (n.x < wx0 || n.x > wx1 || n.y < wy0 || n.y > wy1) continue;
          const px = n.x - dx,
            py = n.y - dy;
          const r = nearOnSeg(sg.a, sg.b, {
            x: px,
            y: py
          });
          if (r.d >= thr) continue;
          const mx = n.x - (r.x + dx),
            my = n.y - (r.y + dy),
            d = Math.hypot(mx, my);
          if (d < bs) {
            bs = d;
            best = {
              dx: mx,
              dy: my,
              x: n.x,
              y: n.y,
              kind: 'node'
            };
          }
        }
      }
    }
  }
  return best;
}

/* =========================================================================
   MULTI-SNAP SKALA BESAR (Full Spatial-Indexed TANPA BATAS JUMLAH / WAKTU)
   - Seluruh node, handleIn, handleOut, midpoint, ray, spacing, dan garis bantu
     dievaluasi secara penuh tanpa pemotongan MAX_LOCAL_PTS atau time-budget cutoff.
   ========================================================================= */
/* =========================================================================
   MULTI-SNAP SKALA BESAR (Full Spatial-Indexed TANPA BATAS JUMLAH / WAKTU)
   - Seluruh node, handleIn, handleOut, midpoint, ray, spacing, dan garis bantu
     dievaluasi secara penuh tanpa pemotongan MAX_LOCAL_PTS atau time-budget cutoff.
   ========================================================================= */
const LINE_BUCKET_SZ = 24;
function addLineToBuckets(buckets, ln) {
  const b = Math.floor(ln.v / LINE_BUCKET_SZ);
  let arr = buckets.get(b);
  if (!arr) {
    arr = [];
    buckets.set(b, arr);
  }
  arr.push(ln);
}
function queryLineBuckets(buckets, val, thr, fn) {
  if (!buckets || !buckets.size) return;
  const b0 = Math.floor((val - thr) / LINE_BUCKET_SZ);
  const b1 = Math.floor((val + thr) / LINE_BUCKET_SZ);
  for (let b = b0; b <= b1; b++) {
    const arr = buckets.get(b);
    if (!arr) continue;
    for (let i = 0; i < arr.length; i++) fn(arr[i]);
  }
}
function buildSnapCache(doc, exObjs, exNodes, cfg, noBoxObjs) {
  cfg = cfg || {};
  const xLines = [],
    yLines = [],
    pts = [],
    boxes = [],
    rays = [];
  const xBuckets = new Map(),
    yBuckets = new Map();
  const pushX = ln => {
    xLines.push(ln);
    addLineToBuckets(xBuckets, ln);
  };
  const pushY = ln => {
    yLines.push(ln);
    addLineToBuckets(yBuckets, ln);
  };
  const vb = doc.viewBox || [0, 0, 0, 0],
    vx = vb[0],
    vy = vb[1],
    vw = vb[2],
    vh = vb[3];
  if (cfg.artboard && vw > 0 && vh > 0) {
    [vx, vx + vw / 2, vx + vw].forEach(v => pushX({
      v,
      y0: vy,
      y1: vy + vh,
      kind: 'artboard'
    }));
    [vy, vy + vh / 2, vy + vh].forEach(v => pushY({
      v,
      x0: vx,
      x1: vx + vw,
      kind: 'artboard'
    }));
  }
  let hasTargetObjs = false;
  for (let oi = 0, L = doc.objects.length; oi < L; oi++) {
    const o = doc.objects[oi];
    if (!o || o.hidden || o.isFrameBg || o.isAutoFrame) continue;
    if (!(exObjs && exObjs.has(o.id))) {
      hasTargetObjs = true;
      break;
    }
  }
  const sIdx = hasTargetObjs ? getDocSpatialIndex(doc.objects) : null;
  for (let oi = 0, L = doc.objects.length; oi < L; oi++) {
    const o = doc.objects[oi];
    if (!o || o.hidden) continue;
    const isExObj = !!(exObjs && exObjs.has(o.id));
    const isBg = !!(o.isFrameBg || o.isAutoFrame);
    if (!isExObj && !(noBoxObjs && noBoxObjs.has(o.id)) && (cfg.bbox || cfg.spacing)) {
      const bb = tightBBox(o);
      if (bb[0] <= bb[2] && bb[1] <= bb[3]) {
        const cx = (bb[0] + bb[2]) / 2,
          cy = (bb[1] + bb[3]) / 2;
        if (cfg.bbox) {
          [bb[0], cx, bb[2]].forEach(v => pushX({
            v,
            y0: bb[1],
            y1: bb[3],
            kind: isBg ? 'artboard' : 'bbox'
          }));
          [bb[1], cy, bb[3]].forEach(v => pushY({
            v,
            x0: bb[0],
            x1: bb[2],
            kind: isBg ? 'artboard' : 'bbox'
          }));
        }
        if (cfg.spacing && !isBg) boxes.push({
          id: o.id,
          l: bb[0],
          t: bb[1],
          r: bb[2],
          b: bb[3],
          w: bb[2] - bb[0],
          h: bb[3] - bb[1]
        });
      }
    }
    if (isBg || !cfg.axial && !(cfg.perp && exNodes && exNodes.size) && sIdx) continue;
    for (let si = 0; si < o.subs.length; si++) {
      const sp = o.subs[si],
        ns = sp.nodes,
        n = ns.length;
      for (let i = 0; i < n; i++) {
        const nd = ns[i];
        const isExNode = isExObj || !!(exNodes && exNodes.has(nd.id));
        if (!isExNode) {
          if (cfg.node) {
            pts.push({
              x: nd.x,
              y: nd.y,
              kind: 'node'
            });
            if (nd.handleIn) pts.push({
              x: nd.handleIn.x,
              y: nd.handleIn.y,
              kind: 'handle-in'
            });
            if (nd.handleOut) pts.push({
              x: nd.handleOut.x,
              y: nd.handleOut.y,
              kind: 'handle-out'
            });
          }
          if (cfg.axial) {
            pushX({
              v: nd.x,
              y0: nd.y,
              y1: nd.y,
              kind: 'axial'
            });
            pushY({
              v: nd.y,
              x0: nd.x,
              x1: nd.x,
              kind: 'axial'
            });
          }
        } else if (cfg.perp && exNodes && exNodes.has(nd.id) && n >= 2) {
          for (const st of [-1, 1]) {
            if (!sp.closed && (i + st < 0 || i + st >= n)) continue;
            const nb = ns[(i + st + n) % n];
            if (exNodes.has(nb.id)) continue;
            if (n >= 3 && (sp.closed || i + 2 * st >= 0 && i + 2 * st < n)) {
              const nb2 = ns[(i + 2 * st + 2 * n) % n];
              if (!exNodes.has(nb2.id) && dist(nb, nb2) >= 1e-4) {
                const u = nrm(sub(nb, nb2));
                rays.push({
                  o: {
                    x: nb.x,
                    y: nb.y
                  },
                  d: u,
                  src: {
                    x: nd.x,
                    y: nd.y
                  },
                  label: '180°',
                  kind: 'perp'
                });
                rays.push({
                  o: {
                    x: nb.x,
                    y: nb.y
                  },
                  d: {
                    x: -u.y,
                    y: u.x
                  },
                  src: {
                    x: nd.x,
                    y: nd.y
                  },
                  label: '90°',
                  kind: 'perp'
                });
              }
            }
          }
        }
      }
      if (cfg.midpoint && !isExObj) {
        for (let i = 0; i < (sp.closed ? n : n - 1); i++) {
          const a = ns[i],
            b = ns[(i + 1) % n];
          if (exNodes && (exNodes.has(a.id) || exNodes.has(b.id))) continue;
          const mp = segPoint(a, b, 0.5);
          pts.push({
            x: mp.x,
            y: mp.y,
            kind: 'midpoint'
          });
        }
      }
    }
  }
  const boxesByX = cfg.spacing && boxes.length >= 2 ? boxes.slice().sort((a, b) => a.l - b.l) : [];
  const boxesByY = cfg.spacing && boxes.length >= 2 ? boxes.slice().sort((a, b) => a.t - b.t) : [];
  return {
    xLines,
    yLines,
    xBuckets,
    yBuckets,
    pts,
    boxes,
    boxesByX,
    boxesByY,
    rays,
    hash: null,
    spatialIndex: sIdx,
    hasTargetObjs
  };
}
function ptHash(C, cell) {
  const safeCell = Math.max(1e-4, cell || 8);
  if (C.hash && Math.abs(C.hash.cell - safeCell) < 1e-6) return C.hash;
  const map = new Map(),
    key = (ix, iy) => ix * 73856093 ^ iy * 19349663;
  for (const q of C.pts) {
    const k = key(Math.floor(q.x / safeCell), Math.floor(q.y / safeCell));
    const b = map.get(k);
    if (b) b.push(q);else map.set(k, [q]);
  }
  C.hash = {
    cell: safeCell,
    map,
    key
  };
  return C.hash;
}

/* solveMultiSnap dengan Spatial Index penuh tanpa batas waktu / kuota kandidat */
/* solveMultiSnap dengan Spatial Index penuh tanpa batas waktu / kuota kandidat */
function solveMultiSnap(p, cache, objects, exObjs, exNodes, thr, gridStep, cfg, dragBBox, extra) {
  const nowFn = () => typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  const tSnap0 = nowFn();
  cfg = cfg || {};
  extra = extra || {};
  const C = cache || {
    xLines: [],
    yLines: [],
    pts: [],
    boxes: [],
    rays: []
  };
  const hasTargets = C.hasTargetObjs !== false;
  const sIdx = hasTargets ? C.spatialIndex || (objects ? getDocSpatialIndex(objects) : null) : null;
  const probes = extra.probes && extra.probes.length ? extra.probes : [p],
    delta = extra.delta || null;
  const preX = extra.lockAxis === 'y',
    preY = extra.lockAxis === 'x';
  let dx = 0,
    dy = 0,
    lockX = preX,
    lockY = preY,
    kind = null,
    ptKind = null,
    ind = null;
  const guides = [],
    aX = [],
    aY = [],
    spc = [];
  let gxHit = null,
    gyHit = null;
  let xScore = 1e18,
    yScore = 1e18;

  /* 1. Kunci titik 2D via Spatial Hash pra-filter C.pts (hanya objek non-excluded dengan sel presisi thr) */
  if (hasTargets && !lockX && !lockY && (cfg.node || cfg.midpoint)) {
    let best = null,
      bp = null,
      bs = thr;
    if (C.pts && C.pts.length) {
      const H = ptHash(C, thr),
        thrSq = thr * thr;
      for (let pi = 0; pi < probes.length; pi++) {
        const q0 = probes[pi];
        const cx = Math.floor(q0.x / H.cell),
          cy = Math.floor(q0.y / H.cell);
        for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) {
          const b = H.map.get(H.key(ix, iy));
          if (!b) continue;
          for (let bi = 0; bi < b.length; bi++) {
            const q = b[bi],
              dx = q0.x - q.x,
              dy = q0.y - q.y,
              d2 = dx * dx + dy * dy;
            if (d2 >= thrSq) continue;
            const weight = q.kind === 'midpoint' ? 1.12 : q.kind === 'handle-in' || q.kind === 'handle-out' ? 1.04 : 1.0;
            const sc = Math.sqrt(d2) * weight;
            if (sc < bs) {
              bs = sc;
              best = q;
              bp = q0;
            }
          }
        }
      }
    } else if (sIdx) {
      for (let pi = 0; pi < probes.length; pi++) {
        const q0 = probes[pi];
        sIdx.queryPoint(q0.x, q0.y, thr, item => {
          const o = item.o;
          if (exObjs && exObjs.has(o.id) || o.hidden || o.isFrameBg || o.isAutoFrame) return;
          if (item.kind === 'midpoint') {
            if (!cfg.midpoint) return;
            if (exNodes && (exNodes.has(item.a.id) || exNodes.has(item.b.id))) return;
          } else {
            if (!cfg.node) return;
            if (exNodes && item.n && exNodes.has(item.n.id)) return;
          }
          const d = Math.hypot(q0.x - item.x, q0.y - item.y);
          if (d >= thr) return;
          const weight = item.kind === 'midpoint' ? 1.12 : item.kind === 'handle-in' || item.kind === 'handle-out' ? 1.04 : 1.0;
          const sc = d * weight;
          if (sc < bs) {
            bs = sc;
            best = item;
            bp = q0;
          }
        });
      }
    }
    if (best) {
      dx = best.x - bp.x;
      dy = best.y - bp.y;
      lockX = lockY = true;
      kind = ptKind = best.kind === 'handle-in' || best.kind === 'handle-out' ? 'node' : best.kind;
      ind = {
        x: best.x,
        y: best.y
      };
      xScore = yScore = bs;
    }
  }

  /* 2. Kunci sinar siku-siku (90°) & perpanjangan garis (180°) tanpa batas jumlah sinar */
  if (!lockX && !lockY && cfg.perp && C.rays && C.rays.length) {
    const hitRays = [];
    for (let ri = 0; ri < C.rays.length; ri++) {
      const r = C.rays[ri];
      const pr = r.src && delta ? {
        x: r.src.x + delta.dx,
        y: r.src.y + delta.dy
      } : p;
      const t = (pr.x - r.o.x) * r.d.x + (pr.y - r.o.y) * r.d.y,
        pj = {
          x: r.o.x + r.d.x * t,
          y: r.o.y + r.d.y * t
        };
      const d = Math.hypot(pr.x - pj.x, pr.y - pj.y);
      if (d < thr) hitRays.push({
        r,
        pr,
        pj,
        d
      });
    }
    hitRays.sort((a, b) => a.d - b.d);
    const rayLim = hitRays.length;
    if (rayLim >= 2) {
      let bi = null,
        bid = thr * 1.6;
      for (let i = 0; i < rayLim; i++) for (let j = i + 1; j < rayLim; j++) {
        const A = hitRays[i],
          B = hitRays[j];
        if (Math.abs(A.r.src.x - B.r.src.x) > 1e-6 || Math.abs(A.r.src.y - B.r.src.y) > 1e-6) continue;
        if (Math.hypot(A.r.o.x - B.r.o.x, A.r.o.y - B.r.o.y) < 1e-6) continue;
        const det = cross(A.r.d, B.r.d);
        if (Math.abs(det) <= 0.15) continue;
        const w = sub(B.r.o, A.r.o),
          t = cross(w, B.r.d) / det,
          inter = {
            x: A.r.o.x + A.r.d.x * t,
            y: A.r.o.y + A.r.d.y * t
          };
        const dd = Math.hypot(inter.x - A.pr.x, inter.y - A.pr.y);
        if (dd < bid) {
          bid = dd;
          bi = {
            A,
            B,
            inter
          };
        }
      }
      if (bi) {
        dx = bi.inter.x - bi.A.pr.x;
        dy = bi.inter.y - bi.A.pr.y;
        lockX = lockY = true;
        kind = ptKind = 'perp';
        ind = {
          x: bi.inter.x,
          y: bi.inter.y
        };
        guides.push({
          type: 'line',
          x1: bi.A.r.o.x,
          y1: bi.A.r.o.y,
          x2: bi.inter.x,
          y2: bi.inter.y,
          kind: 'perp',
          label: bi.A.r.label
        });
        guides.push({
          type: 'line',
          x1: bi.B.r.o.x,
          y1: bi.B.r.o.y,
          x2: bi.inter.x,
          y2: bi.inter.y,
          kind: 'perp',
          label: bi.B.r.label
        });
        xScore = yScore = bid;
      }
    }
    if (!lockX && !lockY && rayLim > 0) {
      const best = hitRays[0];
      dx = best.pj.x - best.pr.x;
      dy = best.pj.y - best.pr.y;
      lockX = lockY = true;
      kind = ptKind = 'perp';
      ind = {
        x: best.pj.x,
        y: best.pj.y
      };
      guides.push({
        type: 'line',
        x1: best.r.o.x,
        y1: best.r.o.y,
        x2: best.pj.x,
        y2: best.pj.y,
        kind: 'perp',
        label: best.r.label
      });
      xScore = yScore = best.d;
    }
  }

  /* 3. Equal Spacing menggunakan array pra-urut boxesByX & boxesByY tanpa batas 96 box */
  const srcBoxesX = C.boxesByX && C.boxesByX.length >= 2 ? C.boxesByX : C.boxes && C.boxes.length >= 2 ? C.boxes.slice().sort((a, b) => a.l - b.l) : null;
  const srcBoxesY = C.boxesByY && C.boxesByY.length >= 2 ? C.boxesByY : C.boxes && C.boxes.length >= 2 ? C.boxes.slice().sort((a, b) => a.t - b.t) : null;
  if (cfg.spacing && dragBBox && srcBoxesX) {
    const dl = dragBBox[0],
      dt = dragBBox[1],
      dr = dragBBox[2],
      db = dragBBox[3],
      dw = dr - dl,
      dh = db - dt;
    const rnd = v => Math.round(v * 10) / 10;
    if (!lockX) {
      const hb = [];
      for (let i = 0; i < srcBoxesX.length; i++) {
        const b = srcBoxesX[i];
        if (Math.min(b.b, db) - Math.max(b.t, dt) >= 0) hb.push(b);
      }
      let best = null,
        be = thr;
      for (let i = 0; i + 1 < hb.length; i++) {
        const A = hb[i],
          B = hb[i + 1],
          gap = B.l - A.r;
        if (gap > dw + 0.5 && dl >= A.r - thr && dr <= B.l + thr) {
          const tL = (A.r + B.l - dw) / 2,
            er = Math.abs(dl - tL);
          if (er < be) {
            be = er;
            best = {
              t: tL,
              segs: [[A.r, tL, rnd(tL - A.r)], [tL + dw, B.l, rnd(tL - A.r)]]
            };
          }
        }
        if (gap > 2) {
          if (dl >= B.r - thr) {
            const tR = B.r + gap,
              er = Math.abs(dl - tR);
            if (er < be) {
              be = er;
              best = {
                t: tR,
                segs: [[A.r, B.l, rnd(gap)], [B.r, tR, rnd(gap)]]
              };
            }
          }
          if (dr <= A.l + thr) {
            const tF = A.l - gap - dw,
              er = Math.abs(dl - tF);
            if (er < be) {
              be = er;
              best = {
                t: tF,
                segs: [[tF + dw, A.l, rnd(gap)], [A.r, B.l, rnd(gap)]]
              };
            }
          }
        }
      }
      if (best) {
        dx = best.t - dl;
        lockX = true;
        xScore = be * 1.05;
        kind = kind || 'spacing';
        spc.push({
          axis: 'x',
          segs: best.segs
        });
      }
    }
    if (!lockY && srcBoxesY) {
      const vbx = [];
      for (let i = 0; i < srcBoxesY.length; i++) {
        const b = srcBoxesY[i];
        if (Math.min(b.r, dr) - Math.max(b.l, dl) >= 0) vbx.push(b);
      }
      let best = null,
        be = thr;
      for (let i = 0; i + 1 < vbx.length; i++) {
        const A = vbx[i],
          B = vbx[i + 1],
          gap = B.t - A.b;
        if (gap > dh + 0.5 && dt >= A.b - thr && db <= B.t + thr) {
          const tT = (A.b + B.t - dh) / 2,
            er = Math.abs(dt - tT);
          if (er < be) {
            be = er;
            best = {
              t: tT,
              segs: [[A.b, tT, rnd(tT - A.b)], [tT + dh, B.t, rnd(tT - A.b)]]
            };
          }
        }
        if (gap > 2) {
          if (dt >= B.b - thr) {
            const tB = B.b + gap,
              er = Math.abs(dt - tB);
            if (er < be) {
              be = er;
              best = {
                t: tB,
                segs: [[A.b, B.t, rnd(gap)], [B.b, tB, rnd(gap)]]
              };
            }
          }
          if (db <= A.t + thr) {
            const tU = A.t - gap - dh,
              er = Math.abs(dt - tU);
            if (er < be) {
              be = er;
              best = {
                t: tU,
                segs: [[tU + dh, A.t, rnd(gap)], [A.b, B.t, rnd(gap)]]
              };
            }
          }
        }
      }
      if (best) {
        dy = best.t - dt;
        lockY = true;
        yScore = be * 1.05;
        kind = kind || 'spacing';
        spc.push({
          axis: 'y',
          segs: best.segs
        });
      }
    }
  }

  /* 4. Smart Guides via 1D Spatial Bucket Hash tanpa batas jumlah garis */
  const xT = dragBBox ? [dragBBox[0], (dragBBox[0] + dragBBox[2]) / 2, dragBBox[2]] : [p.x];
  const yT = dragBBox ? [dragBBox[1], (dragBBox[1] + dragBBox[3]) / 2, dragBBox[3]] : [p.y];
  if (!lockX && C.xLines && C.xLines.length) {
    let bd = thr,
      bsh = 0,
      hit = false;
    if (C.xBuckets && C.xBuckets.size) {
      for (const tx of xT) {
        queryLineBuckets(C.xBuckets, tx, thr, ln => {
          const d = Math.abs(tx - ln.v);
          if (d < bd) {
            bd = d;
            bsh = ln.v - tx;
            hit = true;
          }
        });
      }
      if (hit) {
        dx = bsh;
        lockX = true;
        xScore = bd * 1.15;
        for (const tx of xT) {
          queryLineBuckets(C.xBuckets, tx + dx, 0.05, ln => {
            if (Math.abs(tx + dx - ln.v) < 0.02 && !aX.includes(ln)) aX.push(ln);
          });
        }
        if (aX.length) kind = kind || aX[0].kind;
      }
    } else {
      for (const ln of C.xLines) for (const tx of xT) {
        const d = Math.abs(tx - ln.v);
        if (d < bd) {
          bd = d;
          bsh = ln.v - tx;
          hit = true;
        }
      }
      if (hit) {
        dx = bsh;
        lockX = true;
        xScore = bd * 1.15;
        for (const ln of C.xLines) {
          for (const tx of xT) if (Math.abs(tx + dx - ln.v) < 0.02) {
            aX.push(ln);
            break;
          }
        }
        if (aX.length) kind = kind || aX[0].kind;
      }
    }
  }
  if (!lockY && C.yLines && C.yLines.length) {
    let bd = thr,
      bsh = 0,
      hit = false;
    if (C.yBuckets && C.yBuckets.size) {
      for (const ty of yT) {
        queryLineBuckets(C.yBuckets, ty, thr, ln => {
          const d = Math.abs(ty - ln.v);
          if (d < bd) {
            bd = d;
            bsh = ln.v - ty;
            hit = true;
          }
        });
      }
      if (hit) {
        dy = bsh;
        lockY = true;
        yScore = bd * 1.15;
        for (const ty of yT) {
          queryLineBuckets(C.yBuckets, ty + dy, 0.05, ln => {
            if (Math.abs(ty + dy - ln.v) < 0.02 && !aY.includes(ln)) aY.push(ln);
          });
        }
        if (aY.length) kind = kind || aY[0].kind;
      }
    } else {
      for (const ln of C.yLines) for (const ty of yT) {
        const d = Math.abs(ty - ln.v);
        if (d < bd) {
          bd = d;
          bsh = ln.v - ty;
          hit = true;
        }
      }
      if (hit) {
        dy = bsh;
        lockY = true;
        yScore = bd * 1.15;
        for (const ln of C.yLines) {
          for (const ty of yT) if (Math.abs(ty + dy - ln.v) < 0.02) {
            aY.push(ln);
            break;
          }
        }
        if (aY.length) kind = kind || aY[0].kind;
      }
    }
  }

  /* 5. SN-004: Tepi / kontur path */
  if (hasTargets && cfg.edge && !ptKind) {
    let r = null;
    if (extra.edgeFn) r = extra.edgeFn();else {
      const q = snapPt({
        x: p.x,
        y: p.y
      }, objects || [], exObjs, exNodes, thr, 0, false, true, false, true);
      if (q.ind) r = {
        dx: q.x - p.x,
        dy: q.y - p.y,
        x: q.x,
        y: q.y,
        kind: q.kind
      };
    }
    if (r) {
      const edgeDist = Math.hypot(r.dx, r.dy),
        edgeScore = edgeDist * 1.12;
      const guideBest = Math.min(xScore, yScore);
      if (!lockX && !lockY) {
        dx = r.dx;
        dy = r.dy;
        lockX = lockY = true;
        kind = ptKind = r.kind || 'edge';
        ind = {
          x: r.x,
          y: r.y
        };
      } else if (!preX && !preY && edgeScore < guideBest * 0.85) {
        aX.length = 0;
        aY.length = 0;
        spc.length = 0;
        dx = r.dx;
        dy = r.dy;
        lockX = lockY = true;
        kind = ptKind = r.kind || 'edge';
        ind = {
          x: r.x,
          y: r.y
        };
      } else if (!lockX) {
        dx = r.dx;
        lockX = true;
        ptKind = r.kind || 'edge';
        kind = kind || ptKind;
        ind = {
          x: r.x,
          y: p.y + dy
        };
      } else if (!lockY) {
        dy = r.dy;
        lockY = true;
        ptKind = r.kind || 'edge';
        kind = kind || ptKind;
        ind = {
          x: p.x + dx,
          y: r.y
        };
      }
    }
  }

  /* 6. Grid adaptif per sumbu (mendukung tepi/pusat dragBBox maupun titik utama p) */
  if (cfg.grid && gridStep > 0) {
    const gThr = Math.min(thr, gridStep * 0.35);
    if (!lockX) {
      let bestDx = 0,
        bestGx = null,
        bestD = gThr;
      for (let i = 0; i < xT.length; i++) {
        const tx = xT[i],
          g = Math.round(tx / gridStep) * gridStep,
          d = Math.abs(g - tx);
        if (d < bestD) {
          bestD = d;
          bestDx = g - tx;
          bestGx = g;
        }
      }
      if (bestGx !== null) {
        dx = bestDx;
        gxHit = bestGx;
        lockX = true;
        kind = kind || 'grid';
      }
    }
    if (!lockY) {
      let bestDy = 0,
        bestGy = null,
        bestD = gThr;
      for (let i = 0; i < yT.length; i++) {
        const ty = yT[i],
          g = Math.round(ty / gridStep) * gridStep,
          d = Math.abs(g - ty);
        if (d < bestD) {
          bestD = d;
          bestDy = g - ty;
          bestGy = g;
        }
      }
      if (bestGy !== null) {
        dy = bestDy;
        gyHit = bestGy;
        lockY = true;
        kind = kind || 'grid';
      }
    }
  }

  /* 7. Pixel: bulatkan sumbu yang belum terkunci */
  if (cfg.pixel) {
    if (!lockX) dx = Math.round(p.x) - p.x;
    if (!lockY) dy = Math.round(p.y) - p.y;
  }

  /* Susun panduan visual pada posisi akhir */
  const px = p.x + dx,
    py = p.y + dy;
  const xr = dragBBox ? [dragBBox[0] + dx, dragBBox[2] + dx] : [px, px],
    yr = dragBBox ? [dragBBox[1] + dy, dragBBox[3] + dy] : [py, py];
  if (aX.length) {
    const v = aX[0].v;
    let y0 = yr[0],
      y1 = yr[1];
    aX.forEach(l => {
      y0 = Math.min(y0, l.y0, l.y1);
      y1 = Math.max(y1, l.y0, l.y1);
    });
    guides.push({
      type: 'line',
      x1: v,
      y1: y0,
      x2: v,
      y2: y1,
      kind: aX[0].kind
    });
  }
  if (aY.length) {
    const v = aY[0].v;
    let x0 = xr[0],
      x1 = xr[1];
    aY.forEach(l => {
      x0 = Math.min(x0, l.x0, l.x1);
      x1 = Math.max(x1, l.x0, l.x1);
    });
    guides.push({
      type: 'line',
      x1: x0,
      y1: v,
      x2: x1,
      y2: v,
      kind: aY[0].kind
    });
  }
  if (dragBBox) {
    const ext = thr * 2.5;
    if (gxHit !== null) guides.push({
      type: 'line',
      x1: gxHit,
      y1: yr[0] - ext,
      x2: gxHit,
      y2: yr[1] + ext,
      kind: 'artboard'
    });
    if (gyHit !== null) guides.push({
      type: 'line',
      x1: xr[0] - ext,
      y1: gyHit,
      x2: xr[1] + ext,
      y2: gyHit,
      kind: 'artboard'
    });
  }
  spc.forEach(sg => sg.segs.forEach(([a, b, val]) => {
    if (sg.axis === 'x') {
      const y = (yr[0] + yr[1]) / 2;
      guides.push({
        type: 'spacing',
        x1: a,
        y1: y,
        x2: b,
        y2: y,
        label: String(val)
      });
    } else {
      const x = (xr[0] + xr[1]) / 2;
      guides.push({
        type: 'spacing',
        x1: x,
        y1: a,
        x2: x,
        y2: b,
        label: String(val)
      });
    }
  }));
  const any = lockX && !preX || lockY && !preY;
  if (!ind) ind = {
    x: px,
    y: py
  };
  const tSnap1 = nowFn();
  PERF_TELEMETRY.updateSceneMetrics({
    snapQueryMs: tSnap1 - tSnap0
  });
  return {
    x: px,
    y: py,
    dx,
    dy,
    ix: ind.x,
    iy: ind.y,
    ind: any,
    kind,
    cross: !!ptKind || kind === 'grid' && !dragBBox,
    guides
  };
}

/* =========================================================================
   DETEKSI GEOMETRI (INSPECTION ONLY) & AUTO-SIMPLIFY NODE ALGORITHMS
   Berdasarkan rekomendasi: Ray-Intersection Collapse, Schneider Bézier Fit,
   Kåsa Circle Fit, Monotonic Exterior Angle, Curvature Sign Alternation, DBSCAN
   ========================================================================= */

/* 1. Kåsa Algebraic Circle Fit Test */

export { snapPt, snapMany, rebuildHandle, snapHandleCurve, snapOutline, LINE_BUCKET_SZ, addLineToBuckets, queryLineBuckets, buildSnapCache, ptHash, solveMultiSnap };
