/* =====================================================================
 * JS Module 05: VMT Engine Part 1 — CIE-Lab / CIEDE2000 Color Space, Bilateral Filter & Scharr Edge Tensor
 * ===================================================================== */
'use strict';

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

