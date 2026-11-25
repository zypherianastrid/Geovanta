/**
 * @file src/utils/colorHarmony.tsx
 * @description Mesin harmoni warna & grid variasi bergaya VectorCraft (21 aturan harmoni + 3 mode variasi)
 */

export type HarmonyRuleId =
  | 'complementary'
  | 'complementary2'
  | 'splitComplementary'
  | 'leftComplement'
  | 'rightComplement'
  | 'analogous'
  | 'analogous2'
  | 'monochromatic'
  | 'shades'
  | 'triad'
  | 'triad2'
  | 'triad3'
  | 'tetrad'
  | 'tetrad2'
  | 'tetrad3'
  | 'compound'
  | 'compound2'
  | 'highContrast'
  | 'highContrast2'
  | 'highContrast3'
  | 'pentagram';

export type VariationMode = 'tintsShades' | 'warmCool' | 'vividMuted';

export interface GuideOptions {
  steps: number; // 2..6
  amount: number; // 10..100
  variation: VariationMode;
}

export interface HarmonyRuleMeta {
  id: HarmonyRuleId;
  label: string;
}

export const HARMONY_RULES: HarmonyRuleMeta[] = [
  { id: 'complementary', label: 'Complementary' },
  { id: 'complementary2', label: 'Complementary 2' },
  { id: 'splitComplementary', label: 'Split Complementary' },
  { id: 'leftComplement', label: 'Left Complement' },
  { id: 'rightComplement', label: 'Right Complement' },
  { id: 'analogous', label: 'Analogous' },
  { id: 'analogous2', label: 'Analogous 2' },
  { id: 'monochromatic', label: 'Monochromatic' },
  { id: 'shades', label: 'Shades' },
  { id: 'triad', label: 'Triad' },
  { id: 'triad2', label: 'Triad 2' },
  { id: 'triad3', label: 'Triad 3' },
  { id: 'tetrad', label: 'Tetrad' },
  { id: 'tetrad2', label: 'Tetrad 2' },
  { id: 'tetrad3', label: 'Tetrad 3' },
  { id: 'compound', label: 'Compound' },
  { id: 'compound2', label: 'Compound 2' },
  { id: 'highContrast', label: 'High Contrast' },
  { id: 'highContrast2', label: 'High Contrast 2' },
  { id: 'highContrast3', label: 'High Contrast 3' },
  { id: 'pentagram', label: 'Pentagram' },
];

export const DEFAULT_GUIDE_OPTIONS: GuideOptions = {
  steps: 4,
  amount: 100,
  variation: 'tintsShades',
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const wrapHue = (h: number) => ((h % 360) + 360) % 360;

export function hexToRgb01(hex: string): [number, number, number] {
  const clean = (hex || '').trim().replace(/^#/, '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    if (!Number.isNaN(r + g + b)) return [r, g, b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    if (!Number.isNaN(r + g + b)) return [r, g, b];
  }
  return [230 / 255, 120 / 255, 40 / 255];
}

export function rgb01ToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 1e-6) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  const s = max > 1e-6 ? d / max : 0;
  return [wrapHue(h), clamp01(s), clamp01(max)];
}

export function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  const hh = wrapHue(h) / 60;
  const ss = clamp01(s);
  const vv = clamp01(b);
  const i = Math.floor(hh);
  const f = hh - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - ss * f);
  const t = vv * (1 - ss * (1 - f));
  switch (i % 6) {
    case 0: return [vv, t, p];
    case 1: return [q, vv, p];
    case 2: return [p, vv, t];
    case 3: return [p, q, vv];
    case 4: return [t, p, vv];
    default: return [vv, p, q];
  }
}

function fromHsb(h: number, s: number, b: number): string {
  const [r, g, bl] = hsbToRgb(h, s, b);
  return rgb01ToHex(r, g, bl);
}

/** Menghasilkan daftar warna harmoni dari warna dasar (elemen ke-0 selalu baseHex). */
export function applyHarmony(rule: HarmonyRuleId, baseHex: string): string[] {
  const [r, g, b] = hexToRgb01(baseHex);
  const [h, s, v] = rgbToHsb(r, g, b);
  const base = rgb01ToHex(r, g, b);
  const rot = (deg: number, satMul = 1, valMul = 1) =>
    fromHsb(h + deg, clamp01(s * satMul), clamp01(v * valMul));

  switch (rule) {
    case 'complementary':
      return [base, rot(180)];
    case 'complementary2':
      return [base, rot(180), rot(0, 0.55, Math.min(1, v * 1.15)), rot(180, 0.55, Math.min(1, v * 1.15)), rot(180, 1, 0.65)];
    case 'splitComplementary':
      return [base, rot(150), rot(210)];
    case 'leftComplement':
      return [base, rot(150), rot(180), rot(30, 0.85, 0.9), rot(180, 0.6, 0.75)];
    case 'rightComplement':
      return [base, rot(180), rot(210), rot(-30, 0.85, 0.9), rot(180, 0.6, 0.75)];
    case 'analogous':
      return [base, rot(-30), rot(30), rot(-60, 0.9, 0.95), rot(60, 0.9, 0.95)];
    case 'analogous2':
      return [base, rot(-20), rot(20), rot(-40, 0.75, 1.05), rot(40, 0.75, 1.05)];
    case 'monochromatic':
      return [
        base,
        fromHsb(h, clamp01(s * 0.65), clamp01(Math.min(1, v + 0.2))),
        fromHsb(h, clamp01(s * 0.35), clamp01(Math.min(1, v + 0.35))),
        fromHsb(h, clamp01(s * 1.1), clamp01(v * 0.7)),
        fromHsb(h, clamp01(s * 0.9), clamp01(v * 0.45)),
      ];
    case 'shades':
      return [
        base,
        fromHsb(h, s, clamp01(v * 0.82)),
        fromHsb(h, s, clamp01(v * 0.64)),
        fromHsb(h, s, clamp01(v * 0.46)),
        fromHsb(h, s, clamp01(v * 0.28)),
      ];
    case 'triad':
      return [base, rot(120), rot(240)];
    case 'triad2':
      return [base, rot(120), rot(240), rot(120, 0.6, 0.85), rot(240, 0.6, 0.85)];
    case 'triad3':
      return [base, rot(120, 0.85, 1.05), rot(240, 0.85, 1.05), rot(0, 0.55, 0.85), rot(180, 0.4, 0.9)];
    case 'tetrad':
      return [base, rot(90), rot(180), rot(270)];
    case 'tetrad2':
      return [base, rot(60), rot(180), rot(240)];
    case 'tetrad3':
      return [base, rot(60), rot(180), rot(240), rot(0, 0.5, 0.85)];
    case 'compound':
      return [base, rot(30), rot(150), rot(180), rot(210)];
    case 'compound2':
      return [base, rot(-30), rot(145), rot(180), rot(225)];
    case 'highContrast':
      return [base, rot(180, 1, 0.35), rot(150, 0.9, 1), rot(210, 0.9, 1), fromHsb(h, s * 0.3, 0.95)];
    case 'highContrast2':
      return [base, rot(135), rot(225), rot(180, 0.8, 0.4), fromHsb(h, s * 0.2, 0.98)];
    case 'highContrast3':
      return [base, rot(90, 1, 0.95), rot(180, 1, 0.3), rot(270, 0.9, 0.95), fromHsb(h, s * 0.25, 0.96)];
    case 'pentagram':
      return [base, rot(72), rot(144), rot(216), rot(288)];
  }
}

export function stepFraction(opts: GuideOptions, step: number): number {
  const steps = Math.max(1, Math.round(opts.steps));
  const amount = Math.max(10, Math.min(100, opts.amount));
  const reach = 0.1 + (0.8 * amount) / 100;
  return Math.min(1, Math.abs(step) / steps) * reach;
}

/** Menghitung warna variasi pada langkah tertentu (-steps .. +steps; 0 = warna itu sendiri). */
export function computeVariation(hex: string, opts: GuideOptions, step: number): string {
  if (step === 0) return hex;
  const t = stepFraction(opts, step);
  const [r, g, b] = hexToRgb01(hex);

  if (opts.variation === 'tintsShades') {
    // Kiri (<0): Shades menuju hitam; Kanan (>0): Tints menuju putih
    if (step < 0) return rgb01ToHex(r * (1 - t), g * (1 - t), b * (1 - t));
    return rgb01ToHex(r + (1 - r) * t, g + (1 - g) * t, b + (1 - b) * t);
  }

  const [h, s, v] = rgbToHsb(r, g, b);
  if (opts.variation === 'warmCool') {
    // Kiri (<0): Cool (tarik hue ke biru ~210°); Kanan (>0): Warm (tarik hue ke oranye ~30°)
    const targetHue = step < 0 ? 210 : 30;
    let dh = targetHue - h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    return fromHsb(h + dh * t * 0.65, clamp01(s + (0.75 - s) * t * 0.25), clamp01(v + (step > 0 ? 0.08 * t : -0.06 * t)));
  }

  // vividMuted: Kiri (<0): Muted (kurangi saturasi); Kanan (>0): Vivid (naikkan saturasi & brightness)
  if (step < 0) {
    return fromHsb(h, clamp01(s * (1 - t * 0.85)), clamp01(v + (0.55 - v) * t * 0.25));
  }
  return fromHsb(h, clamp01(s + (1 - s) * t * 0.85), clamp01(v + (1 - v) * t * 0.45));
}

export interface ColorGuideMatrix {
  colors: string[];
  grid: string[][];
  centerIndex: number;
}

export function buildColorGuide(baseHex: string, rule: HarmonyRuleId, opts: GuideOptions): ColorGuideMatrix {
  const n = Math.max(1, Math.min(6, Math.round(opts.steps)));
  const colors = applyHarmony(rule, baseHex);
  const grid = colors.map(col => {
    const row: string[] = [];
    for (let s = -n; s <= n; s++) {
      row.push(computeVariation(col, { ...opts, steps: n }, s));
    }
    return row;
  });
  return { colors, grid, centerIndex: n };
}
