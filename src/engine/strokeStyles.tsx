/**
 * @file src/engine/strokeStyles.tsx
 * @description Utilitas murni untuk visibilitas stroke, pola dash (dasharray/dashoffset), preset dash, dan stroke alignment
 */
import type { StrokeAlign, StrokeMarkerKind } from '../types/vectorTypes.ts';
import { rd } from './vectorPrimitives.tsx';
import { strokeGradOn } from './gradientEngine.tsx';

export type DashPresetName = 'solid' | 'dashed' | 'dotted' | 'dashdot';
export type DetectedDashPreset = DashPresetName | 'custom';

const MAX_DASH_ELEMENTS = 64;

/** Mengembalikan true bila objek memiliki stroke tampak (lebar > 0 dan warna solid atau gradien aktif). */
export function hasVisibleStroke(o: any): boolean {
  if (!o) return false;
  const sw = Number(o.strokeWidth ?? 0);
  if (!Number.isFinite(sw) || sw <= 0) return false;
  if (strokeGradOn(o)) return true;
  const s = typeof o.stroke === 'string' ? o.stroke.trim().toLowerCase() : o.stroke;
  return Boolean(s && s !== 'none' && s !== 'transparent');
}

/** Mengurai string atau array dasharray menjadi array angka non-negatif (maks 64 elemen); mengembalikan null bila tidak valid atau seluruhnya nol. */
export function parseDasharray(raw: string | number[] | null | undefined): number[] | null {
  if (raw == null) return null;

  let values: number[];
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    values = [];
    for (let i = 0; i < raw.length; i++) {
      const v = raw[i];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
      values.push(rd(v));
    }
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.toLowerCase() === 'none') return null;
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
  if (!capped.some(v => v > 0)) return null;
  return capped;
}

/** Memformat array dasharray menjadi string dipisahkan spasi, atau string kosong bila tidak ada pola dash aktif. */
export function formatDasharray(arr: number[] | null | undefined): string {
  const parsed = parseDasharray(arr);
  return parsed ? parsed.map(v => String(v)).join(' ') : '';
}

/** Mengonversi dasharray menjadi interval genap yang disyaratkan CanvasKit/Skia PathEffect.MakeDash. */
export function toSkiaDashIntervals(arr: number[] | null | undefined): number[] | null {
  const parsed = parseDasharray(arr);
  if (!parsed) return null;
  return parsed.length % 2 === 1 ? [...parsed, ...parsed] : [...parsed];
}

function normalizeStrokeWidthForPreset(strokeWidth: number): number {
  const w = Number(strokeWidth);
  return Number.isFinite(w) && w > 0 ? w : 1;
}

/** Menghasilkan nilai properti stroke untuk preset pola garis terhadap ketebalan stroke tertentu. */
export function dashPresetValues(
  preset: DashPresetName,
  strokeWidth: number
): { strokeDasharray: number[] | null; strokeDashoffset?: number; strokeLinecap?: 'round' } {
  const sw = normalizeStrokeWidthForPreset(strokeWidth);
  switch (preset) {
    case 'solid':
      return { strokeDasharray: null, strokeDashoffset: 0 };
    case 'dotted':
      return {
        strokeDasharray: [0, rd(sw * 2)],
        strokeLinecap: 'round'
      };
    case 'dashed':
      return {
        strokeDasharray: [rd(sw * 3), rd(sw * 2)]
      };
    case 'dashdot':
      return {
        strokeDasharray: [rd(sw * 3), rd(sw * 1.5), 0, rd(sw * 1.5)],
        strokeLinecap: 'round'
      };
  }
}

function dashArraysEqual(a: number[], b: number[] | null): boolean {
  if (!b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-3) return false;
  }
  return true;
}

/** Mendeteksi preset dash aktif berdasarkan dasharray dan strokeWidth, atau 'custom' bila tidak cocok dengan preset mana pun. */
export function getSubpathEndpointTangents(sp: any): {
  start: { x: number; y: number; angle: number };
  end: { x: number; y: number; angle: number };
} | null {
  const nodes = sp && sp.nodes;
  if (!nodes || nodes.length < 2) return null;
  const n0 = nodes[0];
  const n1 = nodes[1];
  const sCtrl = n0.handleOut || (n0.ox != null ? { x: n0.ox, y: n0.oy } : null) || n1;
  const startAngle = Math.atan2(n0.y - sCtrl.y, n0.x - sCtrl.x);

  const last = nodes[nodes.length - 1];
  const prev = nodes[nodes.length - 2];
  const eCtrl = last.handleIn || (last.ix != null ? { x: last.ix, y: last.iy } : null) || prev;
  const endAngle = Math.atan2(last.y - eCtrl.y, last.x - eCtrl.x);
  return {
    start: { x: n0.x, y: n0.y, angle: startAngle },
    end: { x: last.x, y: last.y, angle: endAngle },
  };
}

export function buildMarkerPolygonPoints(
  kind: StrokeMarkerKind | string | undefined,
  strokeWidth: number
): Array<[number, number]> | null {
  if (!kind || kind === 'none') return null;
  const s = Math.max(4, strokeWidth * 2.4);
  if (kind === 'arrow') {
    return [[0, 0], [-s * 1.4, -s * 0.7], [-s * 1.4, s * 0.7]];
  }
  if (kind === 'stealth') {
    return [[0, 0], [-s * 1.5, -s * 0.75], [-s * 0.95, 0], [-s * 1.5, s * 0.75]];
  }
  if (kind === 'diamond') {
    return [[0, 0], [-s * 0.8, -s * 0.55], [-s * 1.6, 0], [-s * 0.8, s * 0.55]];
  }
  if (kind === 'bar') {
    return [[-s * 0.25, -s * 0.8], [s * 0.25, -s * 0.8], [s * 0.25, s * 0.8], [-s * 0.25, s * 0.8]];
  }
  if (kind === 'dot') {
    const r = s * 0.5;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  return null;
}

export function buildMarkerSvgDef(
  id: string,
  kind: StrokeMarkerKind | string,
  color: string,
  strokeWidth: number
): string {
  const s = Math.max(4, strokeWidth * 2.4);
  const w = rd(s * 2);
  const h = rd(s * 2);
  const cy = rd(s);
  let inner = '';
  if (kind === 'dot') {
    inner = `<circle cx="${cy}" cy="${cy}" r="${rd(s * 0.45)}" fill="${color}"/>`;
  } else if (kind === 'diamond') {
    inner = `<path d="M 0 ${cy} L ${rd(s * 0.8)} ${rd(s * 0.4)} L ${rd(s * 1.6)} ${cy} L ${rd(s * 0.8)} ${rd(s * 1.6)} Z" fill="${color}"/>`;
  } else if (kind === 'bar') {
    inner = `<rect x="${rd(s * 0.7)}" y="${rd(s * 0.2)}" width="${rd(s * 0.4)}" height="${rd(s * 1.6)}" fill="${color}"/>`;
  } else if (kind === 'stealth') {
    inner = `<path d="M 0 ${rd(s * 0.25)} L ${rd(s * 1.5)} ${cy} L 0 ${rd(s * 1.75)} L ${rd(s * 0.45)} ${cy} Z" fill="${color}"/>`;
  } else {
    inner = `<path d="M 0 ${rd(s * 0.25)} L ${rd(s * 1.5)} ${cy} L 0 ${rd(s * 1.75)} Z" fill="${color}"/>`;
  }
  return `<marker id="${id}" markerWidth="${w}" markerHeight="${h}" refX="${rd(s * 0.8)}" refY="${cy}" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${inner}</marker>`;
}

export function detectDashPreset(
  arr: number[] | null | undefined,
  strokeWidth: number
): DetectedDashPreset {
  const parsed = parseDasharray(arr);
  if (!parsed) return 'solid';
  const presets: DashPresetName[] = ['dashed', 'dotted', 'dashdot'];
  for (const preset of presets) {
    if (dashArraysEqual(parsed, dashPresetValues(preset, strokeWidth).strokeDasharray)) {
      return preset;
    }
  }
  return 'custom';
}

/** Menentukan strokeAlign efektif: path terbuka, teks, dan gambar selalu fallback ke 'center'. */
export function effectiveStrokeAlign(o: any): StrokeAlign {
  if (!o) return 'center';
  const raw = o.strokeAlign;
  if (raw !== 'inside' && raw !== 'outside') return 'center';
  if (o.type === 'text' || o.text || o.img) return 'center';
  const subs = Array.isArray(o.subs) ? o.subs : [];
  if (subs.length === 0) return 'center';
  const hasClosed = subs.some((sp: any) => Boolean(sp && sp.closed));
  return hasClosed ? raw : 'center';
}

/** Menghitung perluasan keluar dari geometri dasar path akibat stroke dan strokeAlign (untuk BBox dan padding ekspor). */
export function strokeOutwardExtent(o: any): number {
  if (!hasVisibleStroke(o)) return 0;
  const sw = Number(o.strokeWidth);
  const align = effectiveStrokeAlign(o);
  if (align === 'inside') return 0;
  if (align === 'outside') return sw;
  return sw * 0.5;
}
