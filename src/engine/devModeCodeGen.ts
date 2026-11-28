/**
 * @file src/engine/devModeCodeGen.ts
 * @description Engine ekstraksi spesifikasi node dan generator kode multi-bahasa untuk Figma-style Dev Mode.
 * Mendukung CSS, Tailwind, SVG, React JSX, SwiftUI (iOS), dan Jetpack Compose (Android),
 * beserta konversi unit (px / rem / pt / dp) dan format warna (HEX / RGBA / HSL).
 */
import { VE } from './vectorEngine.tsx';
import { serializeDoc } from './svgDocumentSerializer.tsx';
import { parseSVG } from './svgDocumentParser.tsx';
import { prettifyXml, optimizeSvg, generateExportCode } from './svgOptimizer.tsx';

export type DevCodeLang = 'css' | 'tailwind' | 'svg' | 'react-jsx' | 'vue-sfc' | 'swiftui' | 'compose';
export type DevUnit = 'px' | 'rem' | 'pt' | 'dp';
export type DevColorFormat = 'hex' | 'rgba' | 'hsl';
export type DevTokenFormat = 'css-vars' | 'tailwind-config' | 'json-tokens';

export interface DevCodeOptions {
  lang: DevCodeLang;
  unit: DevUnit;
  rootFontSize: number;
  colorFormat: DevColorFormat;
  svgMinified?: boolean;
}

export interface DevBoxModel {
  width: number;
  height: number;
  x: number;
  y: number;
  offsetTop: number;
  offsetRight: number;
  offsetBottom: number;
  offsetLeft: number;
  borderWidth: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export interface DevFillEntry {
  kind: 'solid' | 'linear' | 'radial' | 'angular';
  color: string;
  opacity: number;
  styleName?: string;
  stops?: Array<{ offset: number; color: string }>;
  angle?: number;
}

export interface DevStrokeEntry {
  color: string;
  width: number;
  opacity: number;
  align: 'center' | 'inside' | 'outside';
  linecap?: string;
  linejoin?: string;
  dasharray?: number[] | null;
  styleName?: string;
}

export interface DevEffectEntry {
  type: string;
  enabled: boolean;
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color?: string;
  opacity?: number;
}

export interface DevTypographySpec {
  content: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: string;
  textTransform?: string;
  textDecoration?: string;
  color: string;
}

export interface DevAutoLayoutSpec {
  direction: 'row' | 'column' | 'grid';
  gap: number;
  alignItems?: string;
  justifyContent?: string;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export type DevNodeType = 'FRAME' | 'VECTOR' | 'TEXT' | 'GROUP' | 'IMAGE' | 'CHART' | 'ARTBOARD';

export interface DevNodeSpec {
  id: string;
  name: string;
  nodeType: DevNodeType;
  boxModel: DevBoxModel;
  rotation: number;
  cornerRadius: number | [number, number, number, number];
  opacity: number;
  blendMode: string;
  fills: DevFillEntry[];
  strokes: DevStrokeEntry[];
  effects: DevEffectEntry[];
  typography: DevTypographySpec | null;
  autoLayout: DevAutoLayoutSpec | null;
}

export interface DevPageOverview {
  width: number;
  height: number;
  objectCount: number;
  colors: Array<{ color: string; count: number; styleName?: string }>;
  fonts: Array<{ family: string; weight: string; size: number; count: number }>;
  assets: Array<{ id: string; name: string; type: DevNodeType }>;
}

function roundNum(val: number, decimals = 2): number {
  if (!Number.isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function trimZeros(n: number, decimals = 3): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(decimals);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

/**
 * Konversi nilai px ke unit Dev Mode aktif (`px`, `rem`, `pt`, `dp`).
 */
export function formatUnit(px: number, unit: DevUnit, rootFontSize = 16): string {
  const safePx = Number.isFinite(px) ? px : 0;
  if (unit === 'rem') {
    const base = rootFontSize > 0 ? rootFontSize : 16;
    return `${trimZeros(safePx / base, 3)}rem`;
  }
  if (unit === 'pt') {
    return `${trimZeros(safePx * 0.75, 2)}pt`;
  }
  if (unit === 'dp') {
    return `${trimZeros(safePx, 1)}dp`;
  }
  return `${trimZeros(safePx, 1)}px`;
}

export function formatUnitNumber(px: number, unit: DevUnit, rootFontSize = 16): string {
  const safePx = Number.isFinite(px) ? px : 0;
  if (unit === 'rem') {
    const base = rootFontSize > 0 ? rootFontSize : 16;
    return trimZeros(safePx / base, 3);
  }
  if (unit === 'pt') return trimZeros(safePx * 0.75, 2);
  return trimZeros(safePx, 1);
}

interface ParsedRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColorRgba(color: string, extraAlpha = 1): ParsedRgba | null {
  if (!color || color === 'none' || color === 'transparent') return null;
  const c = String(color).trim();
  const hexMatch = /^#([0-9a-fA-F]{3,8})$/.exec(c);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3 || h.length === 4) {
      h = h.split('').map(ch => ch + ch).join('');
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a: Math.max(0, Math.min(1, a * extraAlpha)) };
    }
  }
  const rgbMatch = /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(c);
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, Math.round(Number(rgbMatch[1]))));
    const g = Math.max(0, Math.min(255, Math.round(Number(rgbMatch[2]))));
    const b = Math.max(0, Math.min(255, Math.round(Number(rgbMatch[3]))));
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%') ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]);
    }
    return { r, g, b, a: Math.max(0, Math.min(1, a * extraAlpha)) };
  }
  return null;
}

function toHexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Format warna ke HEX, RGBA, atau HSL sesuai preferensi Dev Mode.
 */
export function formatDevColor(color: string, format: DevColorFormat, opacity = 1): string {
  if (!color || color === 'none') return 'transparent';
  const parsed = parseColorRgba(color, opacity);
  if (!parsed) return color;
  const { r, g, b, a } = parsed;
  const alphaRounded = roundNum(a, 2);

  if (format === 'rgba') {
    return alphaRounded < 1 ? `rgba(${r}, ${g}, ${b}, ${alphaRounded})` : `rgb(${r}, ${g}, ${b})`;
  }
  if (format === 'hsl') {
    const [h, s, l] = rgbToHsl(r, g, b);
    return alphaRounded < 1 ? `hsla(${h}, ${s}%, ${l}%, ${alphaRounded})` : `hsl(${h}, ${s}%, ${l}%)`;
  }
  // HEX
  const hexBase = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  if (alphaRounded < 1) {
    return `${hexBase}${toHexByte(Math.round(a * 255))}`;
  }
  return hexBase;
}

function getObjectBBox(obj: any): [number, number, number, number] {
  if (!obj) return [0, 0, 0, 0];
  try {
    if (VE && typeof VE.tightBBox === 'function') {
      const b = VE.tightBBox(obj);
      if (Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[2] >= b[0] && b[3] >= b[1]) {
        return [b[0], b[1], b[2], b[3]];
      }
    }
  } catch {
    // fallback below
  }
  if (obj.text) {
    const tx = Number(obj.text.x) || 0;
    const ty = Number(obj.text.y) || 0;
    const tw = Number(obj.text.width) || 120;
    const th = Number(obj.text.height) || (Number(obj.text.fontSize) || 16) * 1.4;
    return [tx, ty, tx + tw, ty + th];
  }
  if (obj.img) {
    const ix = Number(obj.img.x) || 0;
    const iy = Number(obj.img.y) || 0;
    const iw = Number(obj.img.w ?? obj.img.width) || 100;
    const ih = Number(obj.img.h ?? obj.img.height) || 100;
    return [ix, iy, ix + iw, iy + ih];
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (obj.subs || []).forEach((sp: any) => {
    (sp.nodes || []).forEach((n: any) => {
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      }
    });
  });
  if (Number.isFinite(minX)) return [minX, minY, maxX, maxY];
  return [0, 0, 0, 0];
}

function detectNodeType(obj: any): DevNodeType {
  if (!obj) return 'VECTOR';
  if (obj.isFrameBg || obj.isAutoFrame || obj.containerType === 'frame') return 'FRAME';
  if (obj.type === 'text' || obj.text) return 'TEXT';
  if (obj.img) return 'IMAGE';
  if (obj.chartConfig || obj.type === 'chart') return 'CHART';
  if (obj.group && !obj.subs?.length) return 'GROUP';
  return 'VECTOR';
}

function findStyleName(doc: any, styleId?: string | null): string | undefined {
  if (!styleId || !doc || !Array.isArray(doc.styles)) return undefined;
  const st = doc.styles.find((s: any) => s && s.id === styleId);
  return st ? st.name : undefined;
}

function resolveParentBounds(obj: any, doc: any): [number, number, number, number] {
  if (obj?.group && doc && Array.isArray(doc.objects)) {
    const frameBg = doc.objects.find(
      (o: any) => o.id !== obj.id && o.group === obj.group && (o.isFrameBg || o.isAutoFrame)
    );
    if (frameBg) {
      return getObjectBBox(frameBg);
    }
  }
  if (doc && Array.isArray(doc.artboards) && doc.artboards.length > 0) {
    const ab = doc.artboards.find((a: any) => a.id === doc.activeArtboardId) || doc.artboards[0];
    if (ab) return [ab.x, ab.y, ab.x + ab.width, ab.y + ab.height];
  }
  const vb = Array.isArray(doc?.viewBox) ? doc.viewBox : [0, 0, 800, 600];
  return [vb[0] || 0, vb[1] || 0, (vb[0] || 0) + (vb[2] || 800), (vb[1] || 0) + (vb[3] || 600)];
}

function extractCornerRadius(obj: any): number | [number, number, number, number] {
  if (!obj) return 0;
  if (typeof obj.rx === 'number' && obj.rx > 0) return roundNum(obj.rx, 1);
  if (Array.isArray(obj.subs) && obj.subs.length === 1) {
    const nodes = obj.subs[0]?.nodes || [];
    const radii = nodes.map((n: any) => Number(n.radius) || 0).filter((r: number) => r > 0);
    if (radii.length > 0) {
      const allEqual = radii.every((r: number) => Math.abs(r - radii[0]) < 0.05);
      if (allEqual) return roundNum(radii[0], 1);
      if (nodes.length === 4) {
        return [
          roundNum(Number(nodes[0]?.radius) || 0, 1),
          roundNum(Number(nodes[1]?.radius) || 0, 1),
          roundNum(Number(nodes[2]?.radius) || 0, 1),
          roundNum(Number(nodes[3]?.radius) || 0, 1),
        ];
      }
      return roundNum(radii[0], 1);
    }
  }
  return 0;
}

/**
 * Ekstrak spesifikasi lengkap untuk objek terpilih di Dev Mode.
 */
export function extractDevNodeSpec(obj: any, doc: any): DevNodeSpec {
  const [x1, y1, x2, y2] = getObjectBBox(obj);
  const width = Math.max(0, roundNum(x2 - x1, 2));
  const height = Math.max(0, roundNum(y2 - y1, 2));
  const [px1, py1, px2, py2] = resolveParentBounds(obj, doc);

  const hasPrimaryStroke = obj?.stroke && obj.stroke !== 'none' && (Number(obj.strokeWidth) || 0) > 0;
  const borderWidth = hasPrimaryStroke ? roundNum(Number(obj.strokeWidth) || 0, 2) : 0;

  const autoCfg = obj?.autoLayout || obj?.layout || null;
  const padObj = autoCfg?.padding || obj?.layoutPadding || null;
  const padTop = roundNum(Number(padObj?.top ?? padObj?.y ?? autoCfg?.paddingTop ?? 0), 1);
  const padRight = roundNum(Number(padObj?.right ?? padObj?.x ?? autoCfg?.paddingRight ?? 0), 1);
  const padBottom = roundNum(Number(padObj?.bottom ?? padObj?.y ?? autoCfg?.paddingBottom ?? 0), 1);
  const padLeft = roundNum(Number(padObj?.left ?? padObj?.x ?? autoCfg?.paddingLeft ?? 0), 1);

  const boxModel: DevBoxModel = {
    x: roundNum(x1, 2),
    y: roundNum(y1, 2),
    width,
    height,
    offsetTop: roundNum(y1 - py1, 1),
    offsetRight: roundNum(px2 - x2, 1),
    offsetBottom: roundNum(py2 - y2, 1),
    offsetLeft: roundNum(x1 - px1, 1),
    borderWidth,
    paddingTop: padTop,
    paddingRight: padRight,
    paddingBottom: padBottom,
    paddingLeft: padLeft,
  };

  const fills: DevFillEntry[] = [];
  if (obj?.grad && Array.isArray(obj.grad.stops) && obj.grad.stops.length > 0) {
    const gType = obj.grad.type === 'radial' ? 'radial' : obj.grad.type === 'angular' ? 'angular' : 'linear';
    fills.push({
      kind: gType,
      color: obj.grad.stops[0]?.color || '#000000',
      opacity: roundNum(Number(obj.fillOpacity ?? obj.opacity ?? 1), 2),
      styleName: findStyleName(doc, obj.fillStyleId),
      stops: obj.grad.stops.map((s: any) => ({ offset: roundNum(Number(s.offset) || 0, 2), color: String(s.color || '#000000') })),
      angle: roundNum(Number(obj.grad.rotation ?? 90), 0),
    });
  } else if (obj?.fill && obj.fill !== 'none') {
    fills.push({
      kind: 'solid',
      color: String(obj.fill),
      opacity: roundNum(Number(obj.fillOpacity ?? 1), 2),
      styleName: findStyleName(doc, obj.fillStyleId),
    });
  }
  if (Array.isArray(obj?.extraFills)) {
    obj.extraFills.forEach((ef: any) => {
      if (ef && !ef.disabled && ef.color && ef.color !== 'none') {
        fills.push({
          kind: 'solid',
          color: String(ef.color),
          opacity: roundNum(Number(ef.opacity ?? 1), 2),
        });
      }
    });
  }

  const strokes: DevStrokeEntry[] = [];
  if (hasPrimaryStroke) {
    strokes.push({
      color: String(obj.stroke),
      width: borderWidth,
      opacity: roundNum(Number(obj.strokeOpacity ?? 1), 2),
      align: obj.strokeAlign === 'inside' || obj.strokeAlign === 'outside' ? obj.strokeAlign : 'center',
      linecap: obj.strokeLinecap,
      linejoin: obj.strokeLinejoin,
      dasharray: Array.isArray(obj.strokeDasharray) ? obj.strokeDasharray : null,
      styleName: findStyleName(doc, obj.strokeStyleId),
    });
  }
  if (Array.isArray(obj?.extraStrokes)) {
    obj.extraStrokes.forEach((es: any) => {
      if (es && !es.disabled && es.color && es.color !== 'none' && Number(es.width) > 0) {
        strokes.push({
          color: String(es.color),
          width: roundNum(Number(es.width), 2),
          opacity: roundNum(Number(es.opacity ?? 1), 2),
          align: 'center',
        });
      }
    });
  }

  const effects: DevEffectEntry[] = Array.isArray(obj?.effects)
    ? obj.effects.filter((fx: any) => fx && fx.enabled !== false).map((fx: any) => ({
        type: String(fx.type || 'dropShadow'),
        enabled: true,
        x: roundNum(Number(fx.x ?? fx.dx ?? 0), 1),
        y: roundNum(Number(fx.y ?? fx.dy ?? 4), 1),
        blur: roundNum(Number(fx.blur ?? fx.stdDeviation ?? 8), 1),
        spread: roundNum(Number(fx.spread ?? 0), 1),
        color: String(fx.color || '#000000'),
        opacity: roundNum(Number(fx.opacity ?? 0.25), 2),
      }))
    : [];

  let typography: DevTypographySpec | null = null;
  if (obj?.type === 'text' || obj?.text) {
    const t = obj.text || {};
    const fontSize = roundNum(Number(t.fontSize ?? obj.fontSize ?? 16), 1);
    const rawLh = Number(t.lineHeight ?? obj.lineHeight);
    const lineHeight = Number.isFinite(rawLh) && rawLh > 0
      ? (rawLh < 5 ? roundNum(fontSize * rawLh, 1) : roundNum(rawLh, 1))
      : roundNum(fontSize * 1.25, 1);
    typography = {
      content: String(t.content ?? t.text ?? obj.name ?? ''),
      fontFamily: String(t.fontFamily || 'Geovanta Sans'),
      fontWeight: String(t.fontWeight || '400'),
      fontStyle: String(t.fontStyle || 'normal'),
      fontSize,
      lineHeight,
      letterSpacing: roundNum(Number(t.letterSpacing ?? 0), 2),
      textAlign: String(t.textAlign || 'left'),
      textTransform: t.textTransform,
      textDecoration: t.textDecoration,
      color: String(t.fill || obj.fill || '#000000'),
    };
  }

  const autoLayout: DevAutoLayoutSpec | null = autoCfg
    ? {
        direction: autoCfg.direction === 'row' || autoCfg.direction === 'horizontal' ? 'row' : autoCfg.direction === 'grid' ? 'grid' : 'column',
        gap: roundNum(Number(autoCfg.gap ?? 0), 1),
        alignItems: autoCfg.alignItems,
        justifyContent: autoCfg.justifyContent,
        paddingTop: padTop,
        paddingRight: padRight,
        paddingBottom: padBottom,
        paddingLeft: padLeft,
      }
    : null;

  return {
    id: String(obj?.id || ''),
    name: String(obj?.name || obj?.type || 'Layer'),
    nodeType: detectNodeType(obj),
    boxModel,
    rotation: roundNum(Number(obj?.rotation ?? 0), 1),
    cornerRadius: extractCornerRadius(obj),
    opacity: roundNum(Number(obj?.opacity ?? 1), 2),
    blendMode: String(obj?.blendMode || 'normal'),
    fills,
    strokes,
    effects,
    typography,
    autoLayout,
  };
}

/**
 * Ringkasan halaman/artboard untuk empty-state Dev Mode saat tidak ada layer dipilih.
 */
export function extractPageOverview(doc: any): DevPageOverview {
  const vb = Array.isArray(doc?.viewBox) ? doc.viewBox : [0, 0, 800, 600];
  let width = vb[2] || 800;
  let height = vb[3] || 600;
  if (Array.isArray(doc?.artboards) && doc.artboards.length > 0) {
    const ab = doc.artboards.find((a: any) => a.id === doc.activeArtboardId) || doc.artboards[0];
    if (ab) {
      width = ab.width;
      height = ab.height;
    }
  }

  const objs = Array.isArray(doc?.objects) ? doc.objects.filter((o: any) => !o.hidden) : [];
  const colorMap = new Map<string, { color: string; count: number; styleName?: string }>();
  const fontMap = new Map<string, { family: string; weight: string; size: number; count: number }>();
  const assets: Array<{ id: string; name: string; type: DevNodeType }> = [];

  objs.forEach((o: any) => {
    const addColor = (col?: string, styleId?: string | null) => {
      if (!col || col === 'none' || col === 'transparent') return;
      const key = String(col).toUpperCase();
      const prev = colorMap.get(key);
      if (prev) prev.count += 1;
      else colorMap.set(key, { color: String(col), count: 1, styleName: findStyleName(doc, styleId) });
    };
    addColor(o.fill, o.fillStyleId);
    if (o.stroke && o.stroke !== 'none' && (Number(o.strokeWidth) || 0) > 0) {
      addColor(o.stroke, o.strokeStyleId);
    }
    if (o.grad && Array.isArray(o.grad.stops)) {
      o.grad.stops.forEach((s: any) => addColor(s.color));
    }
    if (o.type === 'text' || o.text) {
      const t = o.text || {};
      const fam = String(t.fontFamily || 'Geovanta Sans');
      const wt = String(t.fontWeight || '400');
      const sz = roundNum(Number(t.fontSize ?? 16), 1);
      const fk = `${fam}|${wt}|${sz}`;
      const prevF = fontMap.get(fk);
      if (prevF) prevF.count += 1;
      else fontMap.set(fk, { family: fam, weight: wt, size: sz, count: 1 });
    }
    assets.push({
      id: String(o.id),
      name: String(o.name || o.type || o.id),
      type: detectNodeType(o),
    });
  });

  return {
    width: roundNum(width, 1),
    height: roundNum(height, 1),
    objectCount: objs.length,
    colors: Array.from(colorMap.values()).sort((a, b) => b.count - a.count),
    fonts: Array.from(fontMap.values()).sort((a, b) => b.count - a.count),
    assets: assets.slice(0, 40),
  };
}

function formatCssGradient(fill: DevFillEntry, colorFormat: DevColorFormat): string {
  const stopsStr = (fill.stops || [])
    .map(s => `${formatDevColor(s.color, colorFormat, fill.opacity)} ${Math.round(s.offset * 100)}%`)
    .join(', ');
  if (fill.kind === 'radial') return `radial-gradient(circle, ${stopsStr})`;
  if (fill.kind === 'angular') return `conic-gradient(from ${fill.angle || 0}deg, ${stopsStr})`;
  return `linear-gradient(${fill.angle ?? 90}deg, ${stopsStr})`;
}

function formatCornerCss(cr: number | [number, number, number, number], unit: DevUnit, rootFontSize: number): string {
  if (Array.isArray(cr)) {
    if (cr.every(v => v === 0)) return '';
    return cr.map(v => formatUnit(v, unit, rootFontSize)).join(' ');
  }
  return cr > 0 ? formatUnit(cr, unit, rootFontSize) : '';
}

function sanitizeIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!cleaned) return 'DesignElement';
  return cleaned
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Hasilkan snippet kode Dev Mode yang akurat untuk bahasa yang dipilih.
 */
export function generateDevCode(
  spec: DevNodeSpec,
  obj: any,
  doc: any,
  opts: DevCodeOptions
): string {
  const { lang, unit, rootFontSize, colorFormat, svgMinified } = opts;

  if (lang === 'svg') {
    const scopedDoc = obj ? { ...doc, objects: [obj] } : doc;
    const raw = serializeDoc(scopedDoc);
    if (svgMinified) {
      return optimizeSvg(raw, { collapseWhitespace: true, removeComments: true }).svg;
    }
    return prettifyXml(raw);
  }

  if (lang === 'react-jsx') {
    const scopedDoc = obj ? { ...doc, objects: [obj] } : doc;
    return generateExportCode(scopedDoc, 'react-jsx');
  }

  if (lang === 'vue-sfc') {
    const scopedDoc = obj ? { ...doc, objects: [obj] } : doc;
    return generateExportCode(scopedDoc, 'vue-sfc');
  }

  if (lang === 'css') {
    const lines: string[] = [
      `/* ${spec.name} (${spec.nodeType}) */`,
      `width: ${formatUnit(spec.boxModel.width, unit, rootFontSize)};`,
      `height: ${formatUnit(spec.boxModel.height, unit, rootFontSize)};`,
    ];
    if (spec.autoLayout) {
      lines.push('display: flex;');
      lines.push(`flex-direction: ${spec.autoLayout.direction === 'row' ? 'row' : 'column'};`);
      if (spec.autoLayout.gap > 0) {
        lines.push(`gap: ${formatUnit(spec.autoLayout.gap, unit, rootFontSize)};`);
      }
      if (spec.boxModel.paddingTop || spec.boxModel.paddingRight || spec.boxModel.paddingBottom || spec.boxModel.paddingLeft) {
        lines.push(
          `padding: ${formatUnit(spec.boxModel.paddingTop, unit, rootFontSize)} ${formatUnit(spec.boxModel.paddingRight, unit, rootFontSize)} ${formatUnit(spec.boxModel.paddingBottom, unit, rootFontSize)} ${formatUnit(spec.boxModel.paddingLeft, unit, rootFontSize)};`
        );
      }
    }
    const radiusStr = formatCornerCss(spec.cornerRadius, unit, rootFontSize);
    if (radiusStr) lines.push(`border-radius: ${radiusStr};`);
    if (spec.rotation !== 0) lines.push(`transform: rotate(${spec.rotation}deg);`);
    if (spec.opacity < 1) lines.push(`opacity: ${spec.opacity};`);
    if (spec.blendMode && spec.blendMode !== 'normal') lines.push(`mix-blend-mode: ${spec.blendMode};`);

    if (spec.typography) {
      const t = spec.typography;
      lines.push(`color: ${formatDevColor(t.color, colorFormat, 1)};`);
      lines.push(`font-family: "${t.fontFamily}", sans-serif;`);
      lines.push(`font-size: ${formatUnit(t.fontSize, unit, rootFontSize)};`);
      lines.push(`font-weight: ${t.fontWeight};`);
      if (t.fontStyle !== 'normal') lines.push(`font-style: ${t.fontStyle};`);
      lines.push(`line-height: ${formatUnit(t.lineHeight, unit, rootFontSize)};`);
      if (t.letterSpacing !== 0) lines.push(`letter-spacing: ${formatUnit(t.letterSpacing, unit, rootFontSize)};`);
      lines.push(`text-align: ${t.textAlign};`);
    } else if (spec.fills.length > 0) {
      const primaryFill = spec.fills[0];
      if (primaryFill.kind === 'solid') {
        lines.push(`background: ${formatDevColor(primaryFill.color, colorFormat, primaryFill.opacity)};`);
      } else {
        lines.push(`background: ${formatCssGradient(primaryFill, colorFormat)};`);
      }
    }

    if (spec.strokes.length > 0) {
      const st = spec.strokes[0];
      const styleWord = st.dasharray && st.dasharray.length > 0 ? 'dashed' : 'solid';
      lines.push(`border: ${formatUnit(st.width, unit, rootFontSize)} ${styleWord} ${formatDevColor(st.color, colorFormat, st.opacity)};`);
    }

    const shadows = spec.effects.filter(fx => fx.type === 'dropShadow' || fx.type === 'innerShadow');
    if (shadows.length > 0) {
      const shadowVal = shadows
        .map(s => `${s.type === 'innerShadow' ? 'inset ' : ''}${formatUnit(s.x || 0, unit, rootFontSize)} ${formatUnit(s.y || 4, unit, rootFontSize)} ${formatUnit(s.blur || 8, unit, rootFontSize)} ${formatDevColor(s.color || '#000000', colorFormat, s.opacity ?? 0.25)}`)
        .join(', ');
      lines.push(`box-shadow: ${shadowVal};`);
    }
    const blurs = spec.effects.filter(fx => fx.type === 'layerBlur' || fx.type === 'blur');
    if (blurs.length > 0) {
      lines.push(`filter: blur(${formatUnit(blurs[0].blur || 4, unit, rootFontSize)});`);
    }
    return lines.join('\n');
  }

  if (lang === 'tailwind') {
    const classes: string[] = [
      `w-[${formatUnit(spec.boxModel.width, unit, rootFontSize)}]`,
      `h-[${formatUnit(spec.boxModel.height, unit, rootFontSize)}]`,
    ];
    if (spec.autoLayout) {
      classes.push('flex');
      classes.push(spec.autoLayout.direction === 'row' ? 'flex-row' : 'flex-col');
      if (spec.autoLayout.gap > 0) {
        classes.push(`gap-[${formatUnit(spec.autoLayout.gap, unit, rootFontSize)}]`);
      }
    }
    const singleRadius = Array.isArray(spec.cornerRadius) ? spec.cornerRadius[0] : spec.cornerRadius;
    if (singleRadius > 0) {
      classes.push(`rounded-[${formatUnit(singleRadius, unit, rootFontSize)}]`);
    }
    if (spec.rotation !== 0) {
      classes.push(`rotate-[${spec.rotation}deg]`);
    }
    if (spec.opacity < 1) {
      classes.push(`opacity-[${spec.opacity}]`);
    }
    if (spec.typography) {
      const t = spec.typography;
      classes.push(`text-[${formatDevColor(t.color, 'hex', 1)}]`);
      classes.push(`text-[${formatUnit(t.fontSize, unit, rootFontSize)}]`);
      classes.push(`leading-[${formatUnit(t.lineHeight, unit, rootFontSize)}]`);
      if (t.fontWeight === '700' || t.fontWeight === 'bold') classes.push('font-bold');
      else if (t.fontWeight === '600') classes.push('font-semibold');
      else if (t.fontWeight === '500') classes.push('font-medium');
      if (t.textAlign === 'center') classes.push('text-center');
      else if (t.textAlign === 'right') classes.push('text-right');
    } else if (spec.fills.length > 0) {
      const f = spec.fills[0];
      if (f.kind === 'solid') {
        classes.push(`bg-[${formatDevColor(f.color, 'hex', f.opacity)}]`);
      } else {
        classes.push('bg-gradient-to-r');
      }
    }
    if (spec.strokes.length > 0) {
      const st = spec.strokes[0];
      classes.push(`border-[${formatUnit(st.width, unit, rootFontSize)}]`);
      classes.push(`border-[${formatDevColor(st.color, 'hex', st.opacity)}]`);
    }
    return `<div className="${classes.join(' ')}">${spec.typography ? `\n  ${spec.typography.content}\n` : ''}</div>`;
  }

  if (lang === 'swiftui') {
    const structName = sanitizeIdentifier(spec.name);
    const w = trimZeros(spec.boxModel.width, 1);
    const h = trimZeros(spec.boxModel.height, 1);
    const lines: string[] = [`// ${spec.name} (${spec.nodeType})`, `struct ${structName}: View {`, '    var body: some View {'];
    if (spec.typography) {
      const t = spec.typography;
      lines.push(`        Text("${t.content.replace(/"/g, '\\"')}")`);
      lines.push(`            .font(.system(size: ${trimZeros(t.fontSize, 1)}))`);
      lines.push(`            .foregroundColor(Color(hex: "${formatDevColor(t.color, 'hex', 1)}"))`);
    } else {
      const r = Array.isArray(spec.cornerRadius) ? spec.cornerRadius[0] : spec.cornerRadius;
      lines.push(`        RoundedRectangle(cornerRadius: ${trimZeros(r, 1)})`);
      if (spec.fills.length > 0) {
        lines.push(`            .fill(Color(hex: "${formatDevColor(spec.fills[0].color, 'hex', spec.fills[0].opacity)}"))`);
      }
      if (spec.strokes.length > 0) {
        lines.push(`            .overlay(`);
        lines.push(`                RoundedRectangle(cornerRadius: ${trimZeros(r, 1)})`);
        lines.push(`                    .stroke(Color(hex: "${formatDevColor(spec.strokes[0].color, 'hex', spec.strokes[0].opacity)}"), lineWidth: ${trimZeros(spec.strokes[0].width, 1)})`);
        lines.push(`            )`);
      }
    }
    lines.push(`            .frame(width: ${w}, height: ${h})`);
    if (spec.rotation !== 0) lines.push(`            .rotationEffect(.degrees(${spec.rotation}))`);
    if (spec.opacity < 1) lines.push(`            .opacity(${spec.opacity})`);
    lines.push('    }', '}');
    return lines.join('\n');
  }

  // Jetpack Compose
  const fnName = sanitizeIdentifier(spec.name);
  const w = trimZeros(spec.boxModel.width, 1);
  const h = trimZeros(spec.boxModel.height, 1);
  const lines: string[] = [`// ${spec.name} (${spec.nodeType})`, `@Composable`, `fun ${fnName}() {`];
  const modParts = [`Modifier`, `    .size(width = ${w}.dp, height = ${h}.dp)`];
  const r = Array.isArray(spec.cornerRadius) ? spec.cornerRadius[0] : spec.cornerRadius;
  if (spec.fills.length > 0 && !spec.typography) {
    const hex6 = formatDevColor(spec.fills[0].color, 'hex', 1).replace('#', '');
    const shapeArg = r > 0 ? `, shape = RoundedCornerShape(${trimZeros(r, 1)}.dp)` : '';
    modParts.push(`    .background(color = Color(0xFF${hex6.slice(0, 6)})${shapeArg})`);
  }
  if (spec.strokes.length > 0) {
    const hex6 = formatDevColor(spec.strokes[0].color, 'hex', 1).replace('#', '');
    const shapeArg = r > 0 ? `, shape = RoundedCornerShape(${trimZeros(r, 1)}.dp)` : '';
    modParts.push(`    .border(width = ${trimZeros(spec.strokes[0].width, 1)}.dp, color = Color(0xFF${hex6.slice(0, 6)})${shapeArg})`);
  }
  if (spec.opacity < 1) {
    modParts.push(`    .alpha(${spec.opacity}f)`);
  }
  if (spec.typography) {
    const t = spec.typography;
    const hex6 = formatDevColor(t.color, 'hex', 1).replace('#', '');
    lines.push('    Text(');
    lines.push(`        text = "${t.content.replace(/"/g, '\\"')}",`);
    lines.push(`        color = Color(0xFF${hex6.slice(0, 6)}),`);
    lines.push(`        fontSize = ${trimZeros(t.fontSize, 1)}.sp,`);
    lines.push(`        modifier = ${modParts.join('\n        ')}`);
    lines.push('    )');
  } else {
    lines.push(`    Box(\n        modifier = ${modParts.join('\n        ')}\n    )`);
  }
  lines.push('}');
  return lines.join('\n');
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Hitung rasio kontras WCAG 2.1 antara dua warna (fg vs bg).
 */
export function computeContrastRatio(
  fgColor: string,
  bgColor = '#FFFFFF'
): { ratio: number; aa: boolean; aaa: boolean; aaLarge: boolean } {
  const fg = parseColorRgba(fgColor, 1) || { r: 0, g: 0, b: 0, a: 1 };
  const bg = parseColorRgba(bgColor, 1) || { r: 255, g: 255, b: 255, a: 1 };
  // Alpha composite fg over bg
  const a = fg.a;
  const rEff = Math.round(fg.r * a + bg.r * (1 - a));
  const gEff = Math.round(fg.g * a + bg.g * (1 - a));
  const bEff = Math.round(fg.b * a + bg.b * (1 - a));

  const l1 = relativeLuminance(rEff, gEff, bEff);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = roundNum((lighter + 0.05) / (darker + 0.05), 2);
  return {
    ratio,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3.0,
    aaa: ratio >= 7.0,
  };
}

export interface DevDesignTokens {
  colors: Array<{ name: string; value: string; hex: string; count: number }>;
  typography: Array<{ name: string; family: string; weight: string; size: string; lineHeight: string }>;
  radii: Array<{ name: string; value: string }>;
}

/**
 * Ekstrak Design Tokens (Colors, Typography, Radii) dari seluruh dokumen.
 */
export function extractDesignTokens(
  doc: any,
  unit: DevUnit,
  rootFontSize: number,
  colorFormat: DevColorFormat
): DevDesignTokens {
  const ov = extractPageOverview(doc);
  const colors = ov.colors.map((c, idx) => ({
    name: c.styleName
      ? c.styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : `color-${idx + 1}`,
    value: formatDevColor(c.color, colorFormat, 1),
    hex: formatDevColor(c.color, 'hex', 1),
    count: c.count,
  }));

  const typography = ov.fonts.map((f, idx) => ({
    name: `text-${idx + 1}`,
    family: f.family,
    weight: f.weight,
    size: formatUnit(f.size, unit, rootFontSize),
    lineHeight: formatUnit(roundNum(f.size * 1.25, 1), unit, rootFontSize),
  }));

  const radiusSet = new Set<number>();
  (doc?.objects || []).forEach((o: any) => {
    if (!o || o.hidden) return;
    const r = extractCornerRadius(o);
    if (typeof r === 'number' && r > 0) radiusSet.add(r);
    else if (Array.isArray(r)) r.forEach(v => { if (v > 0) radiusSet.add(v); });
  });
  const radii = Array.from(radiusSet)
    .sort((a, b) => a - b)
    .map((r, idx) => ({
      name: `radius-${idx + 1}`,
      value: formatUnit(r, unit, rootFontSize),
    }));

  return { colors, typography, radii };
}

/**
 * Hasilkan kode Design Tokens (CSS Variables, Tailwind Config, atau W3C JSON).
 */
export function generateTokensCode(tokens: DevDesignTokens, format: DevTokenFormat): string {
  if (format === 'css-vars') {
    const lines = [':root {'];
    tokens.colors.forEach(c => lines.push(`  --${c.name}: ${c.value};`));
    tokens.radii.forEach(r => lines.push(`  --${r.name}: ${r.value};`));
    tokens.typography.forEach(t => {
      lines.push(`  --${t.name}-family: "${t.family}", sans-serif;`);
      lines.push(`  --${t.name}-size: ${t.size};`);
      lines.push(`  --${t.name}-weight: ${t.weight};`);
    });
    lines.push('}');
    return lines.join('\n');
  }

  if (format === 'tailwind-config') {
    const colorObj = Object.fromEntries(tokens.colors.map(c => [c.name, c.value]));
    const radiusObj = Object.fromEntries(tokens.radii.map(r => [r.name, r.value]));
    const fontSizeObj = Object.fromEntries(
      tokens.typography.map(t => [t.name, [t.size, { lineHeight: t.lineHeight }]])
    );
    return `module.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colorObj, null, 6).replace(/\n/g, '\n      ')},\n      borderRadius: ${JSON.stringify(radiusObj, null, 6).replace(/\n/g, '\n      ')},\n      fontSize: ${JSON.stringify(fontSizeObj, null, 6).replace(/\n/g, '\n      ')},\n    },\n  },\n};`;
  }

  // W3C Design Tokens JSON
  const json: Record<string, any> = { color: {}, typography: {}, radius: {} };
  tokens.colors.forEach(c => {
    json.color[c.name] = { $value: c.value, $type: 'color' };
  });
  tokens.radii.forEach(r => {
    json.radius[r.name] = { $value: r.value, $type: 'dimension' };
  });
  tokens.typography.forEach(t => {
    json.typography[t.name] = {
      $value: { fontFamily: t.family, fontWeight: t.weight, fontSize: t.size, lineHeight: t.lineHeight },
      $type: 'typography',
    };
  });
  return JSON.stringify(json, null, 2);
}

export function getCodeFileExtension(lang: DevCodeLang): string {
  switch (lang) {
    case 'css': return 'css';
    case 'tailwind': return 'tsx';
    case 'svg': return 'svg';
    case 'react-jsx': return 'jsx';
    case 'vue-sfc': return 'vue';
    case 'swiftui': return 'swift';
    case 'compose': return 'kt';
    default: return 'txt';
  }
}

/**
 * Render mini SVG thumbnail yang di-crop rapat ke bounding box objek untuk tab Assets.
 */
export function renderObjectMiniSvg(obj: any, doc: any): string {
  if (!obj) return '';
  try {
    const [x1, y1, x2, y2] = getObjectBBox(obj);
    const w = Math.max(1, x2 - x1);
    const h = Math.max(1, y2 - y1);
    const pad = Math.max(w, h) * 0.1;
    const vx = roundNum(x1 - pad, 1);
    const vy = roundNum(y1 - pad, 1);
    const vw = roundNum(w + pad * 2, 1);
    const vh = roundNum(h + pad * 2, 1);
    const raw = serializeDoc({ ...doc, viewBox: [vx, vy, vw, vh], objects: [obj] });
    return raw.replace(/<svg\b([^>]*)>/i, '<svg$1 width="100%" height="100%">');
  } catch {
    return '';
  }
}

/**
 * Validasi sintaks XML SVG menggunakan DOMParser browser atau fallback ringan.
 */
export function validateSvgXml(code: string): { valid: boolean; error?: string } {
  const trimmed = (code || '').trim();
  if (!trimmed) return { valid: false, error: 'Empty SVG markup' };

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(trimmed, 'image/svg+xml');
      const parserError = parsed.querySelector('parsererror') || parsed.getElementsByTagName('parsererror')[0];
      if (parserError) {
        const firstLine = (parserError.textContent || 'XML syntax error')
          .split('\n')[0]
          .replace(/^error on line \d+ at column \d+:\s*/i, '')
          .trim();
        return { valid: false, error: firstLine || 'Invalid XML markup' };
      }
      if (!parsed.querySelector('svg')) {
        return { valid: false, error: 'Missing root <svg> element' };
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'XML parsing exception' };
    }
  }

  const lower = trimmed.toLowerCase();
  if (!lower.includes('<svg') || (!lower.includes('</svg>') && !lower.includes('/>'))) {
    return { valid: false, error: 'Invalid or incomplete <svg> markup' };
  }
  return { valid: true };
}

/**
 * Terapkan hasil edit kode SVG ke dokumen (scoped ke objek terpilih jika ada, atau seluruh dokumen).
 */
export function applyEditedSvgToDoc(
  code: string,
  doc: any,
  selIds?: Set<string> | string[]
): { valid: boolean; error?: string; nextDoc?: any; nextSelIds?: string[] } {
  const val = validateSvgXml(code);
  if (!val.valid) return { valid: false, error: val.error || 'Invalid SVG XML' };

  try {
    const parsed: any = VE && typeof VE.parseSVG === 'function' ? VE.parseSVG(code) : parseSVG(code);
    if (!parsed || parsed.error || !Array.isArray(parsed.objects)) {
      return { valid: false, error: typeof parsed?.error === 'string' ? parsed.error : 'Failed to parse SVG objects' };
    }

    const selSet = selIds instanceof Set ? selIds : new Set<string>(selIds || []);
    const origObjs = Array.isArray(doc?.objects) ? doc.objects : [];
    const scopedObjs = selSet.size > 0
      ? origObjs.filter((o: any) => selSet.has(o.id) || (o.group && selSet.has(o.group)))
      : [];

    if (selSet.size > 0 && scopedObjs.length > 0 && scopedObjs.length < origObjs.length) {
      const scopedIds = new Set(scopedObjs.map((o: any) => o.id));
      const firstIdx = origObjs.findIndex((o: any) => scopedIds.has(o.id));
      const kept = origObjs.filter((o: any) => !scopedIds.has(o.id));
      const insertAt = firstIdx >= 0 ? Math.min(firstIdx, kept.length) : kept.length;
      const mergedObjs = [
        ...kept.slice(0, insertAt),
        ...parsed.objects,
        ...kept.slice(insertAt),
      ];
      return {
        valid: true,
        nextDoc: { ...doc, objects: mergedObjs },
        nextSelIds: parsed.objects.map((o: any) => o.id),
      };
    }

    return {
      valid: true,
      nextDoc: {
        ...doc,
        viewBox: Array.isArray(parsed.viewBox) ? parsed.viewBox : doc?.viewBox,
        objects: parsed.objects,
      },
      nextSelIds: parsed.objects.map((o: any) => o.id),
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'SVG parse failed' };
  }
}
