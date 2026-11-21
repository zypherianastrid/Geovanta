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

