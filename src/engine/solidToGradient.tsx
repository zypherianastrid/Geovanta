/**
 * @file src/engine/solidToGradient.tsx
 * @description Generator gradien halus (Linear, Radial, Angular) berbasis OKLab/OKLCH
 * yang relevan dari warna solid objek terpilih (1 warna atau multi-warna).
 */
import { rd, uid } from './vectorPrimitives.tsx';
import { cssToHex } from '../utils/colorParserAndFormatter.tsx';
import { clampN, ok2hex, oklchHue } from '../utils/colorMath.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { isLegacyText, legacyTextBounds } from './legacyText.tsx';
import { compileGradStops, gradOn } from './gradientEngine.tsx';

export type RelevantGradType = 'linear' | 'radial' | 'angular';

export interface RelevantRawStop {
  id: string;
  offset: number;
  color: string;
  op: number;
  mid: number;
}

export interface RelevantGradientPreset {
  id: string;
  labelKey: string;
  type: RelevantGradType;
  angle: number;
  rawStops: RelevantRawStop[];
  cssPreview: string;
}

const ACHROMATIC_CHROMA = 0.025;

/** Konversi OKLCH (L in [0,1], C >= 0, H in degrees) ke hex sRGB terklamp. */
export function oklch2hex(L: number, C: number, H: number): string {
  const l = clampN(L, 0.02, 0.99);
  const c = clampN(C, 0, 0.37);
  const hNorm = ((H % 360) + 360) % 360;
  const rad = (hNorm * Math.PI) / 180;
  return ok2hex(l, c * Math.cos(rad), c * Math.sin(rad));
}

function shortestHueLerp(h0: number, h1: number, t: number): number {
  let diff = ((h1 - h0 + 540) % 360) - 180;
  return (((h0 + diff * t) % 360) + 360) % 360;
}

function interpolateBridgeColor(
  hexA: string,
  hexB: string,
  opts: { deltaL?: number; chromaScale?: number } = {}
): string {
  const a = oklchHue(hexA);
  const b = oklchHue(hexB);
  const L = clampN((a.l + b.l) * 0.5 + (opts.deltaL || 0), 0.14, 0.95);
  const scale = opts.chromaScale ?? 1;
  if (a.c < ACHROMATIC_CHROMA && b.c < ACHROMATIC_CHROMA) {
    return oklch2hex(L, 0, 0);
  }
  const c = clampN((a.c + b.c) * 0.5 * scale, 0, 0.34);
  const h = a.c < ACHROMATIC_CHROMA ? b.h : b.c < ACHROMATIC_CHROMA ? a.h : shortestHueLerp(a.h, b.h, 0.5);
  return oklch2hex(L, c, h);
}

/** Ekstrak daftar warna solid unik dari objek terseleksi; fallback ke warna dasar gradien bila semua sudah gradien. */
export function extractSourceSolidColors(objs: any[]): string[] {
  const list = Array.isArray(objs) ? objs : [];
  const seen = new Set<string>();
  const solidOut: string[] = [];

  for (const o of list) {
    if (!o || o.img || o.locked) continue;
    if (gradOn(o)) continue;
    const raw = o.type === 'text' && o.text ? (o.text.fill || o.fill) : o.fill;
    if (!raw || raw === 'none' || raw === 'transparent') continue;
    const hex = cssToHex(raw);
    if (!seen.has(hex)) {
      seen.add(hex);
      solidOut.push(hex);
    }
  }
  if (solidOut.length > 0) return solidOut;

  const gradOut: string[] = [];
  for (const o of list) {
    if (!o || o.img || o.locked) continue;
    if (!gradOn(o) || !o.grad) continue;
    const raw = o.grad.base || o.grad.rawStops?.[0]?.color || o.grad.stops?.[0]?.color || o.fill;
    if (!raw || raw === 'none' || raw === 'transparent') continue;
    const hex = cssToHex(raw);
    if (!seen.has(hex)) {
      seen.add(hex);
      gradOut.push(hex);
    }
  }
  return gradOut;
}

function buildStopsFromPalette(
  palette: string[],
  gradType: RelevantGradType
): RelevantRawStop[] {
  const clean = palette.map(c => cssToHex(c));
  const seq =
    gradType === 'angular' &&
    clean.length >= 2 &&
    clean[clean.length - 1].toLowerCase() !== clean[0].toLowerCase()
      ? [...clean, clean[0]]
      : clean;
  const n = seq.length;
  return seq.map((color, idx) => ({
    id: `s2g-${idx}`,
    offset: n <= 1 ? 0 : rd(idx / (n - 1)),
    color,
    op: 1,
    mid: 0.5
  }));
}

function buildCssPreview(
  rawStops: RelevantRawStop[],
  gradType: RelevantGradType,
  angleDeg: number
): string {
  const compiled = compileGradStops(rawStops, true);
  const stopsStr = compiled
    .map(s => `${s.color} ${Math.round((s.offset ?? 0) * 1000) / 10}%`)
    .join(', ');
  if (gradType === 'radial') {
    return `radial-gradient(circle at 50% 50%, ${stopsStr})`;
  }
  if (gradType === 'angular') {
    const cssAng = ((angleDeg + 90) % 360 + 360) % 360;
    return `conic-gradient(from ${cssAng}deg at 50% 50%, ${stopsStr})`;
  }
  const cssAng = ((angleDeg + 90) % 360 + 360) % 360;
  return `linear-gradient(${cssAng}deg, ${stopsStr})`;
}

/** Bangun 6 preset gradien halus (OKLab) yang relevan dari 1 atau lebih warna solid sumber. */
export function generateRelevantGradients(
  sourceColors: string[],
  gradType: RelevantGradType,
  angleDeg: number = 135
): RelevantGradientPreset[] {
  const norm = (sourceColors || [])
    .filter(c => c && c !== 'none' && c !== 'transparent')
    .map(c => cssToHex(c));
  if (!norm.length) return [];

  const angle = Number.isFinite(angleDeg) ? angleDeg : 135;
  let recipes: Array<{ id: string; labelKey: string; colors: string[] }>;

  if (norm.length === 1) {
    const baseHex = norm[0];
    const ok = oklchHue(baseHex);
    const achromatic = ok.c < ACHROMATIC_CHROMA;

    if (achromatic) {
      const hi = oklch2hex(Math.min(0.96, ok.l + 0.22), ok.c * 0.6, ok.h);
      const lo = oklch2hex(Math.max(0.14, ok.l - 0.22), ok.c * 0.8, ok.h);
      const midHi = oklch2hex(Math.min(0.92, ok.l + 0.11), ok.c * 0.7, ok.h);
      const midLo = oklch2hex(Math.max(0.22, ok.l - 0.11), ok.c * 0.9, ok.h);
      recipes = [
        { id: 'tonalGlow', labelKey: 's2gTonalGlow', colors: [hi, baseHex, lo] },
        { id: 'warmFlow', labelKey: 's2gWarmFlow', colors: [baseHex, oklch2hex(clampN(ok.l + 0.08, 0.2, 0.92), 0.018, 65), oklch2hex(clampN(ok.l + 0.16, 0.28, 0.95), 0.022, 75)] },
        { id: 'coolFlow', labelKey: 's2gCoolFlow', colors: [oklch2hex(clampN(ok.l - 0.08, 0.18, 0.85), 0.02, 245), baseHex, oklch2hex(clampN(ok.l + 0.12, 0.26, 0.94), 0.018, 235)] },
        { id: 'silkTint', labelKey: 's2gSilkTint', colors: [hi, midHi, baseHex] },
        { id: 'deepVelvet', labelKey: 's2gDeepVelvet', colors: [baseHex, midLo, lo] },
        { id: 'vividBloom', labelKey: 's2gVividBloom', colors: [midHi, baseHex, midLo] }
      ];
    } else {
      recipes = [
        {
          id: 'tonalGlow',
          labelKey: 's2gTonalGlow',
          colors: [
            oklch2hex(clampN(ok.l + 0.17, 0.28, 0.95), ok.c * 0.68, ok.h),
            baseHex,
            oklch2hex(clampN(ok.l - 0.19, 0.18, 0.82), Math.min(0.34, ok.c * 1.05), ok.h)
          ]
        },
        {
          id: 'warmFlow',
          labelKey: 's2gWarmFlow',
          colors: [
            baseHex,
            oklch2hex(clampN(ok.l + 0.07, 0.28, 0.90), Math.max(0.06, ok.c * 0.92), ok.h + 24),
            oklch2hex(clampN(ok.l + 0.14, 0.35, 0.94), Math.max(0.05, ok.c * 0.84), ok.h + 44)
          ]
        },
        {
          id: 'coolFlow',
          labelKey: 's2gCoolFlow',
          colors: [
            oklch2hex(clampN(ok.l - 0.06, 0.25, 0.85), Math.max(0.06, ok.c * 0.95), ok.h - 32),
            baseHex,
            oklch2hex(clampN(ok.l + 0.11, 0.35, 0.94), Math.max(0.05, ok.c * 0.82), ok.h - 14)
          ]
        },
        {
          id: 'silkTint',
          labelKey: 's2gSilkTint',
          colors: [
            oklch2hex(Math.min(0.96, Math.max(0.80, ok.l + 0.24)), ok.c * 0.36, ok.h + 6),
            oklch2hex(Math.min(0.90, ok.l + 0.11), ok.c * 0.72, ok.h),
            baseHex
          ]
        },
        {
          id: 'deepVelvet',
          labelKey: 's2gDeepVelvet',
          colors: [
            baseHex,
            oklch2hex(clampN(ok.l - 0.14, 0.20, 0.78), ok.c * 0.98, ok.h - 14),
            oklch2hex(clampN(ok.l - 0.27, 0.14, 0.62), ok.c * 0.82, ok.h - 26)
          ]
        },
        {
          id: 'vividBloom',
          labelKey: 's2gVividBloom',
          colors: [
            oklch2hex(clampN(ok.l + 0.11, 0.32, 0.92), Math.min(0.32, ok.c * 0.88), ok.h + 20),
            baseHex,
            oklch2hex(clampN(ok.l - 0.08, 0.24, 0.84), Math.min(0.34, ok.c * 1.06), ok.h - 24)
          ]
        }
      ];
    }
  } else {
    const baseColors = norm.slice(0, 6);
    const reversed = [...baseColors].reverse();
    const luminousStops: string[] = [];
    const richStops: string[] = [];
    const softStops: string[] = [];
    const vividStops: string[] = [];

    for (let i = 0; i < baseColors.length; i++) {
      const cur = baseColors[i];
      luminousStops.push(cur);
      richStops.push(cur);
      softStops.push(cur);
      vividStops.push(cur);
      if (i + 1 < baseColors.length) {
        const nxt = baseColors[i + 1];
        luminousStops.push(interpolateBridgeColor(cur, nxt, { deltaL: 0.09, chromaScale: 0.92 }));
        richStops.push(interpolateBridgeColor(cur, nxt, { deltaL: -0.11, chromaScale: 1.04 }));
        softStops.push(interpolateBridgeColor(cur, nxt, { deltaL: 0.14, chromaScale: 0.68 }));
        vividStops.push(interpolateBridgeColor(cur, nxt, { deltaL: 0.02, chromaScale: 1.15 }));
      }
    }

    recipes = [
      { id: 'directBlend', labelKey: 's2gDirectBlend', colors: baseColors },
      { id: 'reverseBlend', labelKey: 's2gReverseBlend', colors: reversed },
      { id: 'luminousBridge', labelKey: 's2gLuminousBridge', colors: luminousStops },
      { id: 'richDepth', labelKey: 's2gRichDepth', colors: richStops },
      { id: 'softSilk', labelKey: 's2gSoftSilk', colors: softStops },
      { id: 'vividFlow', labelKey: 's2gVividFlow', colors: vividStops }
    ];
  }

  return recipes.map(r => {
    const rawStops = buildStopsFromPalette(r.colors, gradType);
    return {
      id: r.id,
      labelKey: r.labelKey,
      type: gradType,
      angle,
      rawStops,
      cssPreview: buildCssPreview(rawStops, gradType, angle)
    };
  });
}

function objectBounds(o: any): [number, number, number, number] {
  const textBb = isLegacyText(o) ? legacyTextBounds(o) : null;
  const bb =
    textBb ||
    (o && Array.isArray(o.subs) && o.subs.length > 0
      ? tightBBox(o)
      : [o?.x || 0, o?.y || 0, (o?.x || 0) + (o?.width || 100), (o?.y || 0) + (o?.height || 100)]);
  const x0 = isFinite(bb[0]) ? bb[0] : 0;
  const y0 = isFinite(bb[1]) ? bb[1] : 0;
  const x1 = isFinite(bb[2]) ? bb[2] : x0 + 100;
  const y1 = isFinite(bb[3]) ? bb[3] : y0 + 100;
  return [x0, y0, x1, y1];
}

/** Terapkan preset gradien halus (Linear / Radial / Angular) secara native ke slot fill objek. */
export function applyRelevantGradientToObject(
  o: any,
  preset: RelevantGradientPreset
): any {
  if (!o || !preset) return o;
  const [x0, y0, x1, y1] = objectBounds(o);
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const r = rd(Math.max(10, Math.hypot(w, h) * 0.5));
  const rawStops = (preset.rawStops || []).map(s => ({
    ...s,
    id: uid()
  }));
  const stops = compileGradStops(rawStops, true);
  const base = stops.length ? stops[0].color : rawStops[0]?.color || '#4f46e5';

  let grad: any;
  if (preset.type === 'angular') {
    const ang = Number.isFinite(preset.angle) ? preset.angle : 0;
    grad = {
      type: 'angular',
      base,
      cx: rd(cx),
      cy: rd(cy),
      r,
      angle: rd(ang),
      handleAng: rd((ang * Math.PI) / 180),
      oklab: true,
      spread: 'pad',
      rawStops,
      stops
    };
  } else if (preset.type === 'radial') {
    grad = {
      type: 'radial',
      base,
      cx: rd(cx),
      cy: rd(cy),
      r,
      fx: rd(cx),
      fy: rd(cy),
      oklab: true,
      spread: 'pad',
      rawStops,
      stops
    };
  } else {
    const ang = Number.isFinite(preset.angle) ? preset.angle : 135;
    const rad = (ang * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const half = Math.max(5, (Math.abs(ux) * w + Math.abs(uy) * h) * 0.5);
    grad = {
      type: 'linear',
      base,
      x1: rd(cx - ux * half),
      y1: rd(cy - uy * half),
      x2: rd(cx + ux * half),
      y2: rd(cy + uy * half),
      oklab: true,
      spread: 'pad',
      rawStops,
      stops
    };
  }

  const next: any = {
    ...o,
    fill: base,
    grad,
    ...(o.type === 'text' && o.text ? { text: { ...o.text, fill: base } } : {})
  };
  if (next.fillStyleId) delete next.fillStyleId;
  return next;
}
