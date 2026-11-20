/**
 * @file src/engine/weaveGenerator.tsx
 * @description Generator anyaman (weave) parametrik (Task 3, plan 2026-11-13-new-tools):
 * strip horizontal + vertikal bergelombang sinus dalam satu kotak, pola anyam
 * over-under berselang-seling. Strip yang "di bawah" TERPOTONG di persilangan
 * (bukan sekadar tertutup z-order): tiap strip adalah SATU path string yang
 * berisi beberapa subpath tertutup (M...Z M...Z) — satu subpath per potongan
 * yang terlihat di antara gap persilangan.
 *
 * Geometri:
 * - Sel (lebar cw = w/cols, tinggi ch = h/rows). Strip horizontal i berpusat
 *   di y_i, tebal tH = thickness*ch; strip vertikal j berpusat di x_j, tebal
 *   tV = thickness*cw.
 * - Amplitudo gelombang (fraksi tinggi/lebar sel) DIJEPIT ke (sel-tebal)/2
 *   supaya strip tidak pernah keluar dari jalurnya sendiri — dan dengan
 *   begitu tidak pernah keluar dari kotak pembatas (tes brief menuntut ini
 *   bahkan untuk amplitudo 0.5 + tebal 1.0, yang bila tidak dijepit akan
 *   meluber setengah sel ke luar kotak).
 * - Gelombang sinus: satu periode penuh per sel (lambda = cw untuk strip
 *   horizontal, ch untuk vertikal), digambar sebagai segmen Bezier kubik
 *   (Catmull-Rom -> Bezier pada sampel tiap seperempat periode) agar tepinya
 *   halus, bukan polyline.
 * - Over/under pola papan catur: strip horizontal i OVER strip vertikal j
 *   bila (i+j) genap. Gap pada strip yang under menutupi lebar MAKSIMUM strip
 *   yang over di persilangan itu (setengah tebal + amplitudo efektif), jadi
 *   kedua strip tidak pernah saling tumpang tindih.
 * - Flag `over` per strip = apakah strip itu over di persilangan pertamanya
 *   (H_i: i genap; V_j: j ganjil) — hanya metadata untuk tes/UI.
 *
 * CATATAN ID: weaveStrips() adalah fungsi geometri murni (tanpa id, tanpa
 * subs) — materialisasi menjadi objek path dilakukan di VectorEditor.tsx
 * (makeWeave / regenWeave) via VE.parseSVG, pola yang sama dengan makeShape.
 * Metadata gen menempel di TIAP strip (bukan di <g>): model dokumen tidak
 * punya objek grup — grup hanyalah field `group` yang sama pada beberapa
 * objek, dan <g> di SVG hanyalah artefak serialisasi field itu. Serializer
 * sudah menulis data-gen di tiap <path> (Task 2); parser divalidasi untuk
 * kind 'weave' (Task 3).
 */
const DEFAULT_WEAVE_PARAMS = { cols: 6, rows: 4, amplitude: 0.25, thickness: 0.6 };

/* Pembulatan 2 desimal (angka untuk bbox, string untuk path). */
const r2 = v => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? 0 : r;
};
const f2 = v => r2(v).toFixed(2);

/* Jepit parameter ke rentang yang diizinkan UI (kolom/baris 2-12,
   amplitudo 0-0.5, ketebalan 0.2-1). */
function normalizeWeaveParams(p) {
  const q = { ...DEFAULT_WEAVE_PARAMS, ...(p || {}) };
  const fin = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  q.cols = Math.max(2, Math.min(12, Math.round(fin(q.cols, 6))));
  q.rows = Math.max(2, Math.min(12, Math.round(fin(q.rows, 4))));
  q.amplitude = Math.max(0, Math.min(0.5, fin(q.amplitude, 0.25)));
  q.thickness = Math.max(0.2, Math.min(1, fin(q.thickness, 0.6)));
  if (p && p.waveType) q.waveType = p.waveType === 'triangle' || p.waveType === 'square' ? p.waveType : 'sine';
  if (p && p.gapSize !== undefined) q.gapSize = Math.max(0, Math.min(1, fin(p.gapSize, 0.5)));
  if (p && p.frequency !== undefined) q.frequency = Math.max(1, Math.min(4, Math.round(fin(p.frequency, 1))));
  if (p && p.phase !== undefined) q.phase = Math.max(0, Math.min(360, Math.round(fin(p.phase, 0))));
  return q;
}

/*
 * calcWaveVal: evaluasi gelombang pada posisi u.
 * Mendukung tipe 'sine', 'triangle', dan 'square' dengan pengali frekuensi dan offset fase.
 */
function calcWaveVal(u, vC, amp, period, phase0, waveType, freq, phaseOffset) {
  const f = Math.max(0.25, Math.min(8, Number(freq) || 1));
  const phRad = ((Number(phaseOffset) || 0) * Math.PI) / 180;
  const t = (2 * Math.PI * f * (u - phase0)) / period + phRad;
  let w = 0;
  if (waveType === 'triangle') {
    w = (Math.asin(Math.sin(t)) * 2) / Math.PI;
  } else if (waveType === 'square') {
    const s = Math.sin(t);
    w = Math.sign(s) * Math.min(1, Math.abs(s) * 1.5);
  } else {
    w = Math.sin(t);
  }
  return vC + amp * w;
}

/*
 * edgeCmds(pts, fmt) -> perintah path untuk kurva halus melalui pts.
 * pts = array [u, v] (koordinat sepanjang / melintang pita); fmt memetakan
 * satu titik ke "x y" sesuai orientasi. Catmull-Rom -> Bezier kubik
 * (kontrol = tetangga/6); ujung memakai cerminan titik tetangga.
 * < 3 titik -> garis lurus (fallback; dalam praktik potongan selalu punya
 * >= 3 sampel karena lebar potongan >= setengah periode).
 */
function edgeCmds(pts, fmt) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return 'L' + fmt(pts[1]);
  const ext = i => {
    if (i < 0) return [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]];
    if (i >= pts.length) {
      const n = pts.length - 1;
      return [2 * pts[n][0] - pts[n - 1][0], 2 * pts[n][1] - pts[n - 1][1]];
    }
    return pts[i];
  };
  let d = '';
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = ext(k - 1),
      p1 = pts[k],
      p2 = pts[k + 1],
      p3 = ext(k + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += 'C' + fmt(c1) + ' ' + fmt(c2) + ' ' + fmt(p2);
  }
  return d;
}

/*
 * bandPiece(uA, uB, vC, amp, thick, period, phase0, horizontal, waveType, freq, phaseOffset) -> satu
 * subpath tertutup (satu potongan pita yang terlihat).
 */
function bandPiece(uA, uB, vC, amp, thick, period, phase0, horizontal, waveType = 'sine', freq = 1, phaseOffset = 0) {
  const wave = u => calcWaveVal(u, vC, amp, period, phase0, waveType, freq, phaseOffset);
  const f = Math.max(0.25, Math.min(8, Number(freq) || 1));
  const step = period / (4 * f);
  const us = [uA];
  for (let m = Math.floor((uA - phase0) / step) + 1; ; m++) {
    const u = phase0 + m * step;
    if (u >= uB - 1e-9) break;
    us.push(u);
  }
  us.push(uB);
  const top = us.map(u => [u, wave(u) - thick / 2]);
  const bot = us.map(u => [u, wave(u) + thick / 2]);
  const fmt = horizontal ? p => f2(p[0]) + ' ' + f2(p[1]) : p => f2(p[1]) + ' ' + f2(p[0]);
  let d = 'M' + fmt(top[0]);
  d += edgeCmds(top, fmt);
  d += 'L' + fmt(bot[bot.length - 1]);
  d += edgeCmds(bot.slice().reverse(), fmt);
  d += 'Z';
  return d;
}

/* Kurangi interval [lo, hi] dengan gap-gap (terurut, dijepit ke interval). */
function subtractIntervals(interval, gaps) {
  const [lo, hi] = interval;
  const out = [];
  let cur = lo;
  const sorted = gaps
    .map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  for (const [a, b] of sorted) {
    if (a > cur + 0.01) out.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (hi > cur + 0.01) out.push([cur, hi]);
  return out.filter(([a, b]) => b - a >= 0.01);
}

/*
 * weaveStrips(x, y, w, h, params) -> array strip { d, over, bbox }.
 * Urutan: strip horizontal (baris 0..rows-1) dulu, lalu vertikal
 * (kolom 0..cols-1). bbox = pita penuh strip (termasuk gelombang).
 */
function weaveStrips(x, y, w, h, params) {
  const p = normalizeWeaveParams(params);
  const cw = w / p.cols,
    ch = h / p.rows;
  const tH = p.thickness * ch,
    tV = p.thickness * cw;
  /* Amplitudo efektif: dijepit supaya tepi strip tidak keluar dari jalurnya
     (dan dari kotak). t/2 + A <= sel/2. */
  const aH = Math.min(p.amplitude * ch, Math.max(0, (ch - tH) / 2));
  const aV = Math.min(p.amplitude * cw, Math.max(0, (cw - tV) / 2));
  const gapFactor = p.gapSize !== undefined ? Math.max(0.1, Math.min(2.0, Number(p.gapSize) * 2.0)) : 1.0;
  const waveType = p.waveType || 'sine';
  const freq = p.frequency || 1;
  const phase = p.phase || 0;
  const out = [];
  for (let i = 0; i < p.rows; i++) {
    const yC = y + (i + 0.5) * ch;
    const gaps = [];
    for (let j = 0; j < p.cols; j++) {
      if ((i + j) % 2 === 1) {
        const xJ = x + (j + 0.5) * cw,
          eV = Math.min(cw * 0.5, (tV / 2 + aV) * gapFactor);
        gaps.push([xJ - eV, xJ + eV]);
      }
    }
    let pieces = subtractIntervals([x, x + w], gaps);
    if (!pieces.length) pieces = [[x, x + w]];
    const d = pieces.map(([a, b]) => bandPiece(a, b, yC, aH, tH, cw, x, true, waveType, freq, phase)).join(' ');
    out.push({ d, over: i % 2 === 0, bbox: [r2(x), r2(yC - tH / 2 - aH), r2(x + w), r2(yC + tH / 2 + aH)] });
  }
  for (let j = 0; j < p.cols; j++) {
    const xC = x + (j + 0.5) * cw;
    const gaps = [];
    for (let i = 0; i < p.rows; i++) {
      if ((i + j) % 2 === 0) {
        const yI = y + (i + 0.5) * ch,
          eH = Math.min(ch * 0.5, (tH / 2 + aH) * gapFactor);
        gaps.push([yI - eH, yI + eH]);
      }
    }
    let pieces = subtractIntervals([y, y + h], gaps);
    if (!pieces.length) pieces = [[y, y + h]];
    const d = pieces.map(([a, b]) => bandPiece(a, b, xC, aV, tV, ch, y, false, waveType, freq, phase)).join(' ');
    out.push({ d, over: j % 2 === 1, bbox: [r2(xC - tV / 2 - aV), r2(y), r2(xC + tV / 2 + aV), r2(y + h)] });
  }
  return out;
}

export { DEFAULT_WEAVE_PARAMS, normalizeWeaveParams, weaveStrips };
export default weaveStrips;
