/**
 * @file src/engine/pdfVectorExporter.ts
 * @description 100% offline pure-vector PDF-1.4 exporter with RGB/CMYK color spaces, BleedBox, TrimBox, and Crop Marks.
 */
import { rd } from './vectorPrimitives.tsx';
import { resolveExportArea } from './svgDocumentSerializer.tsx';
import { isVisibleFrameBg } from './imageAndBounds.tsx';
import { isLegacyText } from './legacyText.tsx';
import { ensureArtboards } from './artboardEngine.ts';

export interface PdfExportOptions {
  area?: string;
  only?: Set<string>;
  bg?: { mode?: string; color?: string };
  clipFrames?: boolean;
  bleedMm?: number;
  cropMarks?: boolean;
  colorSpace?: 'rgb' | 'cmyk';
}

function parseRgb01(hex: string): [number, number, number] {
  const s = String(hex || '#000000').trim();
  const m6 = /^#([0-9a-f]{6})$/i.exec(s);
  if (m6) {
    const n = parseInt(m6[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m3 = /^#([0-9a-f]{3})$/i.exec(s);
  if (m3) {
    const h = m3[1];
    return [
      parseInt(h[0] + h[0], 16) / 255,
      parseInt(h[1] + h[1], 16) / 255,
      parseInt(h[2] + h[2], 16) / 255,
    ];
  }
  return [0, 0, 0];
}

export function rgbHexToCmyk(hex: string): [number, number, number, number] {
  const [r, g, b] = parseRgb01(hex);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - 1e-6) return [0, 0, 0, 1];
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [rd(c), rd(m), rd(y), rd(k)];
}

function pdfColorOp(hex: string, colorSpace: 'rgb' | 'cmyk', isStroke: boolean): string {
  if (colorSpace === 'cmyk') {
    const [c, m, y, k] = rgbHexToCmyk(hex);
    return `${c} ${m} ${y} ${k} ${isStroke ? 'K' : 'k'}`;
  }
  const [r, g, b] = parseRgb01(hex);
  return `${rd(r)} ${rd(g)} ${rd(b)} ${isStroke ? 'RG' : 'rg'}`;
}

function hasPaintColor(val: any): boolean {
  return typeof val === 'string' && val.trim() !== '' && val !== 'none' && val !== 'transparent';
}

function subsToPdfOps(subs: any[]): string {
  let out = '';
  for (const sp of subs || []) {
    const nodes = sp && sp.nodes;
    if (!nodes || !nodes.length) continue;
    out += `${rd(nodes[0].x)} ${rd(nodes[0].y)} m\n`;
    const count = sp.closed ? nodes.length : nodes.length - 1;
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      const ho = a.handleOut || (a.ox != null ? { x: a.ox, y: a.oy } : null);
      const hi = b.handleIn || (b.ix != null ? { x: b.ix, y: b.iy } : null);
      if (ho || hi) {
        const c1x = ho ? ho.x : a.x;
        const c1y = ho ? ho.y : a.y;
        const c2x = hi ? hi.x : b.x;
        const c2y = hi ? hi.y : b.y;
        out += `${rd(c1x)} ${rd(c1y)} ${rd(c2x)} ${rd(c2y)} ${rd(b.x)} ${rd(b.y)} c\n`;
      } else {
        out += `${rd(b.x)} ${rd(b.y)} l\n`;
      }
    }
    if (sp.closed) out += 'h\n';
  }
  return out;
}

export function exportPDF(doc: any, opt: PdfExportOptions = {}): string {
  const { objects, bounds } = resolveExportArea(doc, opt);
  const [vx, vy, vw, vh] = bounds;
  const bleedMm = Math.max(0, Number(opt.bleedMm || 0));
  const bleedPt = rd(bleedMm * 2.83464567);
  const cropMarks = Boolean(opt.cropMarks);
  const colorSpace: 'rgb' | 'cmyk' = opt.colorSpace === 'cmyk' ? 'cmyk' : 'rgb';
  const marginPt = cropMarks ? Math.max(18, bleedPt + 12) : bleedPt;

  const mediaW = rd(vw + marginPt * 2);
  const mediaH = rd(vh + marginPt * 2);
  const trimBox = `[${marginPt} ${marginPt} ${rd(marginPt + vw)} ${rd(marginPt + vh)}]`;
  const bleedBox = `[${rd(marginPt - bleedPt)} ${rd(marginPt - bleedPt)} ${rd(marginPt + vw + bleedPt)} ${rd(marginPt + vh + bleedPt)}]`;
  const mediaBox = `[0 0 ${mediaW} ${mediaH}]`;

  const gs: number[] = [];
  let stm = `q\n1 0 0 -1 ${rd(marginPt - vx)} ${rd(marginPt + vh + vy)} cm\n`;

  if (opt.bg && opt.bg.mode === 'solid' && hasPaintColor(opt.bg.color)) {
    stm += `${pdfColorOp(opt.bg.color!, colorSpace, false)}\n${rd(vx - bleedPt)} ${rd(vy - bleedPt)} ${rd(vw + bleedPt * 2)} ${rd(vh + bleedPt * 2)} re f\n`;
  }

  for (const o of objects) {
    if (!o || o.hidden || o.img || isLegacyText(o) || !o.subs || !o.subs.length) continue;
    if ((o.isFrameBg || o.isAutoFrame) && !isVisibleFrameBg(o)) continue;
    const f = hasPaintColor(o.fill);
    const s = (o.strokeWidth || 0) > 0 && hasPaintColor(o.stroke);
    if (!f && !s) continue;

    const op = o.opacity != null && o.opacity < 1;
    if (op) {
      gs.push(rd(o.opacity));
      stm += `q\n/GS${gs.length} gs\n`;
    }
    if (f) stm += `${pdfColorOp(o.fill, colorSpace, false)}\n`;
    if (s) stm += `${pdfColorOp(o.stroke, colorSpace, true)} ${rd(o.strokeWidth)} w\n`;
    stm += subsToPdfOps(o.subs);
    const eo = o.fillRule === 'evenodd';
    stm += (f && s ? (eo ? 'B*' : 'B') : f ? (eo ? 'f*' : 'f') : 'S') + '\n';
    if (op) stm += 'Q\n';
  }
  stm += 'Q\n';

  if (cropMarks) {
    const markLen = 10;
    const x0 = marginPt;
    const y0 = marginPt;
    const x1 = rd(marginPt + vw);
    const y1 = rd(marginPt + vh);
    const off = bleedPt + 2;
    stm += `q\n${colorSpace === 'cmyk' ? '0 0 0 1 K' : '0 0 0 RG'} 0.5 w\n`;
    // Bottom-left
    stm += `${rd(x0 - off - markLen)} ${y0} m ${rd(x0 - off)} ${y0} l S\n`;
    stm += `${x0} ${rd(y0 - off - markLen)} m ${x0} ${rd(y0 - off)} l S\n`;
    // Bottom-right
    stm += `${rd(x1 + off)} ${y0} m ${rd(x1 + off + markLen)} ${y0} l S\n`;
    stm += `${x1} ${rd(y0 - off - markLen)} m ${x1} ${rd(y0 - off)} l S\n`;
    // Top-left
    stm += `${rd(x0 - off - markLen)} ${y1} m ${rd(x0 - off)} ${y1} l S\n`;
    stm += `${x0} ${rd(y1 + off)} m ${x0} ${rd(y1 + off + markLen)} l S\n`;
    // Top-right
    stm += `${rd(x1 + off)} ${y1} m ${rd(x1 + off + markLen)} ${y1} l S\n`;
    stm += `${x1} ${rd(y1 + off)} m ${x1} ${rd(y1 + off + markLen)} l S\n`;
    stm += 'Q\n';
  }

  const res = gs.length
    ? '<< /ExtGState << ' + gs.map((a, i) => `/GS${i + 1} << /Type /ExtGState /ca ${a} /CA ${a} >>`).join(' ') + ' >> >>'
    : '<< >>';

  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} /TrimBox ${trimBox}${bleedPt > 0 ? ' /BleedBox ' + bleedBox : ''} /Contents 4 0 R /Resources ${res} >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stm.length} >>\nstream\n${stm}endstream\nendobj\n`,
    '5 0 obj\n<< /Producer (Geovanta Vector Editor PDF Exporter) /Creator (Geovanta) >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offs: number[] = [];
  for (const objStr of objs) {
    offs.push(pdf.length);
    pdf += objStr;
  }
  const xp = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offs) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  return `${pdf}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xp}\n%%EOF\n`;
}

export function exportMultiPagePDF(doc: any, opt: PdfExportOptions = {}): string {
  const artboards = ensureArtboards(doc);
  if (artboards.length <= 1) return exportPDF(doc, opt);

  const bleedMm = Math.max(0, Number(opt.bleedMm || 0));
  const bleedPt = rd(bleedMm * 2.83464567);
  const cropMarks = Boolean(opt.cropMarks);
  const colorSpace: 'rgb' | 'cmyk' = opt.colorSpace === 'cmyk' ? 'cmyk' : 'rgb';
  const marginPt = cropMarks ? Math.max(18, bleedPt + 12) : bleedPt;

  const pageObjIds: number[] = [];
  const pageEntries: string[] = [];
  let nextObjId = 3;
  const infoObjId = 3 + artboards.length * 2;

  for (const ab of artboards) {
    const pageId = nextObjId++;
    const contentId = nextObjId++;
    pageObjIds.push(pageId);

    const mediaW = rd(ab.width + marginPt * 2);
    const mediaH = rd(ab.height + marginPt * 2);
    const trimBox = `[${marginPt} ${marginPt} ${rd(marginPt + ab.width)} ${rd(marginPt + ab.height)}]`;
    const bleedBox = `[${rd(marginPt - bleedPt)} ${rd(marginPt - bleedPt)} ${rd(marginPt + ab.width + bleedPt)} ${rd(marginPt + ab.height + bleedPt)}]`;
    const mediaBox = `[0 0 ${mediaW} ${mediaH}]`;

    let stm = `q\n1 0 0 -1 ${rd(marginPt - ab.x)} ${rd(marginPt + ab.height + ab.y)} cm\n`;
    if (opt.bg && opt.bg.mode === 'solid' && hasPaintColor(opt.bg.color)) {
      stm += `${pdfColorOp(opt.bg.color!, colorSpace, false)}\n${rd(ab.x - bleedPt)} ${rd(ab.y - bleedPt)} ${rd(ab.width + bleedPt * 2)} ${rd(ab.height + bleedPt * 2)} re f\n`;
    }
    for (const o of (doc?.objects || [])) {
      if (!o || o.hidden || o.img || isLegacyText(o) || !o.subs || !o.subs.length) continue;
      if ((o.isFrameBg || o.isAutoFrame) && !isVisibleFrameBg(o)) continue;
      const f = hasPaintColor(o.fill);
      const s = (o.strokeWidth || 0) > 0 && hasPaintColor(o.stroke);
      if (!f && !s) continue;
      if (f) stm += `${pdfColorOp(o.fill, colorSpace, false)}\n`;
      if (s) stm += `${pdfColorOp(o.stroke, colorSpace, true)} ${rd(o.strokeWidth)} w\n`;
      stm += subsToPdfOps(o.subs);
      const eo = o.fillRule === 'evenodd';
      stm += (f && s ? (eo ? 'B*' : 'B') : f ? (eo ? 'f*' : 'f') : 'S') + '\n';
    }
    stm += 'Q\n';

    pageEntries.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} /TrimBox ${trimBox}${bleedPt > 0 ? ' /BleedBox ' + bleedBox : ''} /Contents ${contentId} 0 R /Resources << >> >>\nendobj\n`,
      `${contentId} 0 obj\n<< /Length ${stm.length} >>\nstream\n${stm}endstream\nendobj\n`
    );
  }

  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${artboards.length} >>\nendobj\n`,
    ...pageEntries,
    `${infoObjId} 0 obj\n<< /Producer (Geovanta Vector Editor Multi-Page PDF) /Creator (Geovanta) >>\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offs: number[] = [];
  for (const objStr of objs) {
    offs.push(pdf.length);
    pdf += objStr;
  }
  const xp = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offs) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  return `${pdf}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${infoObjId} 0 R >>\nstartxref\n${xp}\n%%EOF\n`;
}
