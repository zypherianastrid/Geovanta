/**
 * @file src/testing/autotraceCorpus500.ts
 * @description Deterministic 500-image multi-category benchmark corpus (10 categories x 50 images),
 * SVG node/geometry auditor, and perceptual pixel-similarity evaluator for Auto Trace calibration.
 */

export const CORPUS_CATEGORIES = [
  { id: '01_flat_logos', label: 'Flat Logos & Icons' },
  { id: '02_typography', label: 'Typography & Text' },
  { id: '03_geometric_sharp', label: 'Sharp Geometric' },
  { id: '04_line_art', label: 'Line Art & Sketches' },
  { id: '05_anime_cel', label: 'Anime Cel-Shaded' },
  { id: '06_smooth_3d_gradients', label: '3D Smooth Gradients (Baymax-Style)' },
  { id: '07_photo_textures', label: 'Photo & Natural Gradients' },
  { id: '08_transparent_stickers', label: 'Transparent Alpha Stickers' },
  { id: '09_micro_details', label: 'Micro Details & Thin Bars' },
  { id: '10_high_contrast_patterns', label: 'High-Contrast Patterns' },
] as const;

export type CorpusCategoryId = typeof CORPUS_CATEGORIES[number]['id'];

export interface CorpusImageSample {
  id: string;
  category: CorpusCategoryId;
  categoryIndex: number;
  variantIndex: number;
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  opaqueBg: boolean;
}

export interface SvgGeometryStats {
  paths: number;
  subpaths: number;
  totalNodes: number;
  cubicCount: number;
  lineCount: number;
  quadCount: number;
  bezierRatio: number;
  staircaseSteps: number;
  collinearNodes: number;
  svgBytes: number;
  hasNaN: boolean;
}

export interface ImageCompareMetrics {
  mae: number;
  rmse: number;
  simPct: number;
  psnr: number;
  within5Pct: number;
  within15Pct: number;
  alphaMismatchPct: number;
  whiteHolePct: number;
}

function createRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${Math.round(h % 360)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
}

/**
 * Generates one of the 500 deterministic RGBA images across 10 categories (50 variants each).
 */
export function generateCorpusImage(categoryIndex: number, variantIndex: number): CorpusImageSample {
  const cat = CORPUS_CATEGORIES[categoryIndex % CORPUS_CATEGORIES.length];
  const seed = (categoryIndex + 1) * 10007 + (variantIndex + 1) * 7919;
  const rng = createRng(seed);

  // Varied compact dimensions (160..240px) so 500 images x 2 engines (1000 traces!) finish smoothly
  const w = 160 + (variantIndex % 5) * 16;
  const h = 160 + ((variantIndex * 3) % 5) * 16;

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;

  const baseHue = Math.floor(rng() * 360);
  let opaqueBg = true;

  if (cat.id !== '08_transparent_stickers') {
    ctx.fillStyle = rng() > 0.3 ? '#ffffff' : hsl(baseHue, 25, 96);
    ctx.fillRect(0, 0, w, h);
  } else {
    opaqueBg = false;
    ctx.clearRect(0, 0, w, h);
  }

  switch (cat.id) {
    case '01_flat_logos': {
      ctx.fillStyle = hsl(baseHue, 65, 95);
      ctx.fillRect(0, 0, w, h);
      const count = 3 + (variantIndex % 4);
      const cx = w * 0.5;
      const cy = h * 0.5;
      // Shield or rounded container
      ctx.fillStyle = hsl(baseHue, 78, 48);
      ctx.beginPath();
      ctx.roundRect(w * 0.16, h * 0.16, w * 0.68, h * 0.68, w * (0.12 + rng() * 0.25));
      ctx.fill();
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : hsl((baseHue + 45 + i * 60) % 360, 82, 56);
        ctx.beginPath();
        const r = w * (0.28 - i * 0.05);
        ctx.arc(cx + (rng() - 0.5) * w * 0.14, cy + (rng() - 0.5) * h * 0.14, Math.max(8, r), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case '02_typography': {
      const darkBg = variantIndex % 3 === 0;
      ctx.fillStyle = darkBg ? hsl(baseHue, 55, 16) : '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = hsl(baseHue, 75, 45);
      ctx.beginPath();
      ctx.roundRect(w * 0.08, h * 0.22, w * 0.84, h * 0.56, 18);
      ctx.fill();
      const words = ['HELLO~', 'GEOVANTA', 'SVG 99%', 'TRACE', 'VECTOR', 'STUDIO'];
      const text = words[variantIndex % words.length];
      ctx.save();
      ctx.translate(w * 0.5, h * 0.52);
      ctx.rotate((variantIndex % 5 - 2) * 0.07);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(w * 0.17)}px sans-serif`;
      ctx.lineWidth = Math.max(2, w * 0.025);
      ctx.strokeStyle = darkBg ? '#0f172a' : '#1e293b';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
      ctx.font = `700 ${Math.round(w * 0.085)}px sans-serif`;
      ctx.fillStyle = hsl((baseHue + 180) % 360, 90, 72);
      ctx.fillText(`#${variantIndex + 1} VECTOR`, 0, h * 0.22);
      ctx.restore();
      break;
    }

    case '03_geometric_sharp': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const sides = 3 + (variantIndex % 6);
      const cx = w * 0.5;
      const cy = h * 0.5;
      const outerR = w * 0.39;
      const innerR = outerR * (0.42 + (variantIndex % 4) * 0.12);
      ctx.fillStyle = hsl(baseHue, 80, 48);
      ctx.beginPath();
      for (let i = 0; i < sides * 2; i++) {
        const ang = (i * Math.PI) / sides - Math.PI / 2 + (variantIndex * 0.11);
        const r = i % 2 === 0 ? outerR : innerR;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // Sharp inner polygon & diagonal bars
      ctx.fillStyle = hsl((baseHue + 140) % 360, 85, 55);
      ctx.beginPath();
      ctx.moveTo(w * 0.12, h * 0.12);
      ctx.lineTo(w * 0.42, h * 0.12);
      ctx.lineTo(w * 0.28, h * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.fillRect(w * 0.65, h * 0.68, w * 0.22, h * 0.18);
      break;
    }

    case '04_line_art': {
      const inv = variantIndex % 4 === 0;
      ctx.fillStyle = inv ? '#111827' : '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = inv ? '#ffffff' : '#0f172a';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const lw = 1.6 + (variantIndex % 4) * 0.8;
      ctx.lineWidth = lw;
      // Draw spiral & smooth Bézier flourishes
      ctx.beginPath();
      const cx = w * 0.5;
      const cy = h * 0.5;
      for (let t = 0; t <= 42; t++) {
        const ang = t * 0.35 + variantIndex * 0.2;
        const r = (t / 42) * w * 0.38;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = hsl(baseHue, 85, 45);
      ctx.lineWidth = Math.max(1.5, lw * 0.85);
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.25);
      ctx.bezierCurveTo(w * 0.4, h * 0.05, w * 0.6, h * 0.95, w * 0.85, h * 0.72);
      ctx.stroke();
      break;
    }

    case '05_anime_cel': {
      // Soft window / sky backdrop
      const sky = ctx.createLinearGradient(0, 0, w, h);
      sky.addColorStop(0, hsl(baseHue, 55, 86));
      sky.addColorStop(1, hsl((baseHue + 35) % 360, 45, 72));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Back hair silhouette
      const hairCol = hsl((baseHue + 195) % 360, 72, 65);
      const hairShade = hsl((baseHue + 195) % 360, 68, 46);
      ctx.fillStyle = hairShade;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.52, w * 0.36, h * 0.40, 0, 0, Math.PI * 2);
      ctx.fill();

      // White shirt / collar (tests interior white preservation!)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(w * 0.22, h);
      ctx.quadraticCurveTo(w * 0.5, h * 0.68, w * 0.78, h);
      ctx.fill();

      // Face base skin
      ctx.fillStyle = '#fde6dc';
      ctx.strokeStyle = '#33292a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.48, w * 0.21, h * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cheek blush
      ctx.fillStyle = 'rgba(244, 114, 132, 0.35)';
      ctx.beginPath();
      ctx.ellipse(w * 0.38, h * 0.53, w * 0.05, h * 0.025, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.62, h * 0.53, w * 0.05, h * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (white sclera + colored iris + black pupil + tiny white specular dot!)
      for (const ex of [0.41, 0.59]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(w * ex, h * 0.47, w * 0.048, h * 0.042, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hsl((baseHue + 210) % 360, 82, 48);
        ctx.beginPath();
        ctx.arc(w * ex, h * 0.475, w * 0.032, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(w * ex, h * 0.478, w * 0.015, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w * ex - w * 0.012, h * 0.462, Math.max(1.5, w * 0.008), 0, Math.PI * 2);
        ctx.fill();
      }

      // Front hair bangs + bright highlight ribbon
      ctx.fillStyle = hairCol;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, h * 0.42);
      ctx.quadraticCurveTo(w * 0.5, h * 0.14, w * 0.75, h * 0.42);
      ctx.lineTo(w * 0.62, h * 0.36);
      ctx.lineTo(w * 0.5, h * 0.44);
      ctx.lineTo(w * 0.38, h * 0.36);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case '06_smooth_3d_gradients': {
      // Baymax-inspired 3D white figure on rich blue sky gradient + white bubble text!
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, hsl((205 + (variantIndex % 40)) % 360, 82, 26));
      bg.addColorStop(0.7, hsl((205 + (variantIndex % 40)) % 360, 72, 54));
      bg.addColorStop(1, '#eef6ff');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Soft 3D white body
      const cx = w * (0.56 + (rng() - 0.5) * 0.12);
      const cy = h * (0.52 + (rng() - 0.5) * 0.10);
      const bodyGrad = ctx.createRadialGradient(cx - w * 0.08, cy - h * 0.08, w * 0.04, cx, cy, w * 0.42);
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.75, '#eef1f6');
      bodyGrad.addColorStop(1, '#9ca8ba');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.06, cy + h * 0.22, w * 0.30, h * 0.26, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // 3D Head capsule
      const headGrad = ctx.createRadialGradient(cx - w * 0.06, cy - h * 0.07, w * 0.02, cx, cy, w * 0.22);
      headGrad.addColorStop(0, '#ffffff');
      headGrad.addColorStop(0.75, '#f0f3f8');
      headGrad.addColorStop(1, '#a8b4c4');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.20, h * 0.14, -0.25 + rng() * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Tiny black eyes & thin 1.5px connector line
      ctx.strokeStyle = '#050505';
      ctx.fillStyle = '#050505';
      ctx.lineWidth = Math.max(1.4, w * 0.008);
      const ex1 = cx - w * 0.075, ey1 = cy - h * 0.01;
      const ex2 = cx + w * 0.075, ey2 = cy + h * 0.015;
      ctx.beginPath();
      ctx.moveTo(ex1, ey1);
      ctx.lineTo(ex2, ey2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex1, ey1, Math.max(4, w * 0.028), 0, Math.PI * 2);
      ctx.arc(ex2, ey2, Math.max(4, w * 0.028), 0, Math.PI * 2);
      ctx.fill();

      // White text "HELLO~" on blue gradient
      ctx.save();
      ctx.translate(w * 0.18, h * 0.65);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(w * 0.095)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('HELLO~', 0, 0);
      ctx.restore();
      break;
    }

    case '07_photo_textures': {
      // Sunset horizon + mountain layers + sun bokeh + subtle texture dots
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
      sky.addColorStop(0, hsl(baseHue, 65, 28));
      sky.addColorStop(0.55, hsl((baseHue + 35) % 360, 82, 55));
      sky.addColorStop(1, hsl((baseHue + 55) % 360, 92, 76));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Glowing sun disc
      const sx = w * (0.25 + rng() * 0.5);
      const sy = h * (0.28 + rng() * 0.18);
      const sunG = ctx.createRadialGradient(sx, sy, 2, sx, sy, w * 0.26);
      sunG.addColorStop(0, '#fffbeb');
      sunG.addColorStop(0.35, 'rgba(253, 224, 71, 0.8)');
      sunG.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = sunG;
      ctx.beginPath();
      ctx.arc(sx, sy, w * 0.26, 0, Math.PI * 2);
      ctx.fill();

      // Layered ridges
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = hsl((baseHue + 20 + layer * 10) % 360, 48, 38 - layer * 10);
        ctx.beginPath();
        ctx.moveTo(0, h);
        const baseY = h * (0.48 + layer * 0.14);
        for (let x = 0; x <= w; x += 12) {
          const y = baseY - Math.sin(x * 0.04 + layer + variantIndex) * h * 0.08 - rng() * 6;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case '08_transparent_stickers': {
      // Alpha transparent sticker with outer white border + inner white cloud + saturated character
      const cx = w * 0.5, cy = h * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hsl(baseHue, 85, 52);
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.29, 0, Math.PI * 2);
      ctx.fill();
      // White inner emblem (must NEVER become transparent hole!)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.14, cy - h * 0.11, w * 0.28, h * 0.22, 10);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx - w * 0.05, cy, w * 0.035, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.05, cy, w * 0.035, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case '09_micro_details': {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, w, h);
      // Nested concentric frames + 1.5px bars + micro dots
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = i % 2 === 0 ? '#0f172a' : hsl(baseHue, 85, 45);
        ctx.lineWidth = i === 1 ? 1.5 : 2.5;
        const pad = w * (0.1 + i * 0.07);
        ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      }
      // Micro 2px dots & hairlines
      ctx.fillStyle = '#09090b';
      for (let k = 0; k < 6; k++) {
        const x = w * (0.38 + (k % 3) * 0.12);
        const y = h * (0.42 + Math.floor(k / 3) * 0.16);
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + (variantIndex % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(w * 0.36, h * 0.5);
      ctx.lineTo(w * 0.64, h * 0.5);
      ctx.stroke();
      break;
    }

    case '10_high_contrast_patterns': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const cell = 14 + (variantIndex % 4) * 4;
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const check = ((Math.floor(x / cell) + Math.floor(y / cell)) % 2) === 0;
          if (check) {
            ctx.fillStyle = hsl(baseHue, 75, 42);
            ctx.beginPath();
            if (variantIndex % 2 === 0) {
              ctx.arc(x + cell * 0.5, y + cell * 0.5, cell * 0.42, 0, Math.PI * 2);
            } else {
              ctx.rect(x + 1, y + 1, cell - 2, cell - 2);
            }
            ctx.fill();
          }
        }
      }
      // Overlaying high-contrast white ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, w * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }

  const rgba = ctx.getImageData(0, 0, w, h).data;
  return {
    id: `${cat.id}_${String(variantIndex + 1).padStart(2, '0')}`,
    category: cat.id,
    categoryIndex,
    variantIndex,
    w,
    h,
    rgba,
    opaqueBg,
  };
}

/**
 * Parses SVG `<path d="...">` strings to audit node counts, Cubic Bézier ratio,
 * orthogonal staircase artifacts, and degenerate NaNs.
 */
export function inspectSvgGeometry(svg: string): SvgGeometryStats {
  const pathMatches = svg.match(/\sd="([^"]*)"/g) || [];
  let subpaths = 0;
  let totalNodes = 0;
  let cubicCount = 0;
  let lineCount = 0;
  let quadCount = 0;
  let staircaseSteps = 0;
  let collinearNodes = 0;
  const hasNaN = /\bNaN\b|\bInfinity\b/i.test(svg);

  for (const attr of pathMatches) {
    const d = attr.slice(4, -1);
    const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    if (!tokens) continue;

    let idx = 0;
    let cmd = '';
    let cx = 0, cy = 0;
    let prevOrthoLen = -1;
    let prevOrthoAxis = '';
    let ptsInSub: Array<[number, number, string]> = [];

    const flushSub = () => {
      for (let i = 1; i + 1 < ptsInSub.length; i++) {
        const [x0, y0, c0] = ptsInSub[i - 1];
        const [x1, y1, c1] = ptsInSub[i];
        const [x2, y2, c2] = ptsInSub[i + 1];
        if (c0 === 'L' && c1 === 'L' && c2 === 'L') {
          const cross = Math.abs((x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1));
          const len = Math.hypot(x2 - x0, y2 - y0);
          if (len > 1e-4 && cross / len < 0.05) collinearNodes++;
        }
      }
      ptsInSub = [];
    };

    const nextNum = () => (idx < tokens.length ? parseFloat(tokens[idx++]) : 0);

    while (idx < tokens.length) {
      if (/^[a-zA-Z]$/.test(tokens[idx])) {
        cmd = tokens[idx++];
      }
      if (cmd === 'M') {
        flushSub();
        subpaths++;
        cx = nextNum();
        cy = nextNum();
        totalNodes++;
        ptsInSub.push([cx, cy, 'M']);
        prevOrthoLen = -1;
        cmd = 'L';
      } else if (cmd === 'L') {
        const nx = nextNum();
        const ny = nextNum();
        const dx = Math.abs(nx - cx);
        const dy = Math.abs(ny - cy);
        lineCount++;
        totalNodes++;
        ptsInSub.push([nx, ny, 'L']);
        const isH = dy < 1e-3 && dx > 0 && dx <= 2.1;
        const isV = dx < 1e-3 && dy > 0 && dy <= 2.1;
        if (isH || isV) {
          const axis = isH ? 'H' : 'V';
          if (prevOrthoLen > 0 && prevOrthoAxis !== axis) staircaseSteps++;
          prevOrthoLen = isH ? dx : dy;
          prevOrthoAxis = axis;
        } else {
          prevOrthoLen = -1;
        }
        cx = nx;
        cy = ny;
      } else if (cmd === 'C') {
        nextNum(); nextNum(); nextNum(); nextNum();
        const nx = nextNum();
        const ny = nextNum();
        cubicCount++;
        totalNodes++;
        ptsInSub.push([nx, ny, 'C']);
        prevOrthoLen = -1;
        cx = nx;
        cy = ny;
      } else if (cmd === 'Q') {
        nextNum(); nextNum();
        const nx = nextNum();
        const ny = nextNum();
        quadCount++;
        totalNodes++;
        ptsInSub.push([nx, ny, 'Q']);
        prevOrthoLen = -1;
        cx = nx;
        cy = ny;
      } else if (cmd === 'Z' || cmd === 'z') {
        flushSub();
        prevOrthoLen = -1;
        cmd = '';
      } else {
        idx++;
      }
    }
    flushSub();
  }

  const segTotal = cubicCount + quadCount + lineCount;
  return {
    paths: pathMatches.length,
    subpaths,
    totalNodes,
    cubicCount,
    lineCount,
    quadCount,
    bezierRatio: segTotal > 0 ? +((cubicCount + quadCount) / segTotal).toFixed(4) : 0,
    staircaseSteps,
    collinearNodes,
    svgBytes: svg.length,
    hasNaN,
  };
}

/**
 * Renders an SVG string onto a fixed-dimension Canvas2D and returns RGBA pixel buffer.
 */
export async function rasterizeSvgInBrowser(
  svg: string,
  w: number,
  h: number,
  opaqueBg = true
): Promise<Uint8ClampedArray> {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  if (opaqueBg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  return ctx.getImageData(0, 0, w, h).data;
}

/**
 * Computes pixel-level fidelity and white-hole preservation metrics between original & traced RGBA.
 */
export function computeImageMetrics(
  origRgba: Uint8ClampedArray | Uint8Array,
  tracedRgba: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  opaqueBg = true
): ImageCompareMetrics {
  const n = w * h;
  let sumAbs = 0;
  let sumSq = 0;
  let w5 = 0;
  let w15 = 0;
  let alphaMismatch = 0;
  let opaqueWhiteCount = 0;
  let whiteHoleCount = 0;

  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const oa = origRgba[i + 3];
    const ta = tracedRgba[i + 3];
    if (!opaqueBg && Math.abs(oa - ta) > 128) alphaMismatch++;
    if (oa >= 220 && origRgba[i] >= 235 && origRgba[i + 1] >= 235 && origRgba[i + 2] >= 235) {
      opaqueWhiteCount++;
      if (!opaqueBg && ta < 100) whiteHoleCount++;
    }

    const or = opaqueBg ? origRgba[i] : (origRgba[i] * oa) / 255;
    const og = opaqueBg ? origRgba[i + 1] : (origRgba[i + 1] * oa) / 255;
    const ob = opaqueBg ? origRgba[i + 2] : (origRgba[i + 2] * oa) / 255;
    const tr = opaqueBg ? tracedRgba[i] : (tracedRgba[i] * ta) / 255;
    const tg = opaqueBg ? tracedRgba[i + 1] : (tracedRgba[i + 1] * ta) / 255;
    const tb = opaqueBg ? tracedRgba[i + 2] : (tracedRgba[i + 2] * ta) / 255;

    const dr = Math.abs(or - tr);
    const dg = Math.abs(og - tg);
    const db = Math.abs(ob - tb);
    const da = opaqueBg ? 0 : Math.abs(oa - ta);
    const d = (dr + dg + db + da) / (opaqueBg ? 3 : 4);
    sumAbs += d;
    sumSq += (dr * dr + dg * dg + db * db + da * da) / (opaqueBg ? 3 : 4);
    if (d <= 5) w5++;
    if (d <= 15) w15++;
  }

  const mae = sumAbs / n;
  const rmse = Math.sqrt(sumSq / n);
  return {
    mae: +mae.toFixed(2),
    rmse: +rmse.toFixed(2),
    simPct: +(100 * (1 - mae / 255)).toFixed(2),
    psnr: +(rmse > 0 ? 20 * Math.log10(255 / rmse) : 99).toFixed(2),
    within5Pct: +((w5 / n) * 100).toFixed(2),
    within15Pct: +((w15 / n) * 100).toFixed(2),
    alphaMismatchPct: +((alphaMismatch / n) * 100).toFixed(2),
    whiteHolePct: opaqueWhiteCount > 0 ? +((whiteHoleCount / opaqueWhiteCount) * 100).toFixed(2) : 0,
  };
}
