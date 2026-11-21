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

