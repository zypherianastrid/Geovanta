/**
 * @file src/engine/charts/chartVectorRenderer.ts
 * @description Renderer SVG murni Apache ECharts + sanitizer SVG untuk Geovanta VE.parseSVG
 */
import * as echarts from 'echarts';
import { VE } from '../vectorEngine.tsx';
import { VectorObject } from '../../types/vectorTypes.ts';
import { ChartConfig } from './chartTypes.ts';
import { registerBuiltInGeoMaps } from './builtInGeoMaps.ts';
import { buildEChartsOption } from './echartsOptionBuilder.ts';

registerBuiltInGeoMaps(echarts);

export function getEChartsInstanceModule() {
  return echarts;
}

/**
 * Membersihkan SVG keluaran ECharts SSR agar 100% akurat saat diurai VE.parseSVG:
 * 1. Menghapus path kosong (d="") & elemen hit-box tak terlihat (fill-opacity="0" tanpa stroke).
 * 2. Mengubah fill-opacity="0" dengan stroke menjadi fill="none" agar tidak jadi kotak hitam.
 * 3. Menormalkan atribut x, y, & dominant-baseline pada <text> agar posisi label persis sama.
 */
export function sanitizeEChartsSvgForVectorParser(svg: string): string {
  if (!svg || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return svg;
  try {
    const dom = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const svgEl = dom.querySelector('svg');
    if (!svgEl || dom.querySelector('parsererror')) return svg;

    const shapes = Array.from(svgEl.querySelectorAll('path, rect, polygon, circle, ellipse'));
    for (const el of shapes) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'path') {
        const d = (el.getAttribute('d') || '').trim();
        if (!d) {
          el.remove();
          continue;
        }
      }
      const fill = (el.getAttribute('fill') || '').trim().toLowerCase();
      const fillOp = el.getAttribute('fill-opacity');
      const stroke = (el.getAttribute('stroke') || '').trim().toLowerCase();
      const strokeW = el.getAttribute('stroke-width');
      const strokeOp = el.getAttribute('stroke-opacity');

      const fillInvisible =
        fillOp === '0' || fillOp === '0.0' || fill === 'none' || fill === 'transparent';
      const strokeInvisible =
        !stroke || stroke === 'none' || stroke === 'transparent' || strokeW === '0' || strokeOp === '0';

      if (fillInvisible && strokeInvisible) {
        el.remove();
        continue;
      }
      if ((fillOp === '0' || fillOp === '0.0') && !strokeInvisible) {
        el.setAttribute('fill', 'none');
        el.removeAttribute('fill-opacity');
      }
    }

    const texts = Array.from(svgEl.querySelectorAll('text'));
    for (const t of texts) {
      const txtContent = (t.textContent || '').trim();
      if (!txtContent) {
        t.remove();
        continue;
      }
      if (!t.hasAttribute('x')) t.setAttribute('x', '0');
      let y = parseFloat(t.getAttribute('y') || '0');
      if (!Number.isFinite(y)) y = 0;

      let styleAttr = t.getAttribute('style') || '';
      let fs = parseFloat(t.getAttribute('font-size') || '') || 0;

      // Expand CSS shorthand `font: [italic] [weight] 28px Family...` so VE.parseSVG preserves exact hero size/weight/family
      const fontShort = styleAttr.match(/(?:^|;)\s*font\s*:\s*([^;]+)/i);
      if (fontShort) {
        const val = fontShort[1].trim();
        const sizeMatch = val.match(/([0-9.]+)px\s+(.+)$/i);
        if (sizeMatch) {
          fs = parseFloat(sizeMatch[1]) || 12;
          t.setAttribute('font-size', String(fs));
          const prefix = val.slice(0, sizeMatch.index).trim();
          if (/\bitalic\b/i.test(prefix)) t.setAttribute('font-style', 'italic');
          const wtMatch = prefix.match(/\b(bold|normal|[1-9]00)\b/i);
          if (wtMatch) t.setAttribute('font-weight', wtMatch[1]);
          const firstFam = sizeMatch[2].split(',')[0].trim().replace(/^['"]+|['"]+$/g, '').trim();
          if (firstFam) t.setAttribute('font-family', firstFam);
        }
      }

      // Normalize style="font-family:..." so it never leaves a trailing quote after splitting
      const famStyleMatch = styleAttr.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i);
      if (famStyleMatch) {
        const cleanFam = famStyleMatch[1].split(',')[0].trim().replace(/^['"]+|['"]+$/g, '').trim();
        if (cleanFam) {
          t.setAttribute('font-family', cleanFam);
          styleAttr = styleAttr.replace(/font-family\s*:\s*[^;]+/i, `font-family:${cleanFam}`);
          t.setAttribute('style', styleAttr);
        }
      } else if (t.hasAttribute('font-family')) {
        const cleanAttrFam = (t.getAttribute('font-family') || '').split(',')[0].trim().replace(/^['"]+|['"]+$/g, '').trim();
        if (cleanAttrFam) t.setAttribute('font-family', cleanAttrFam);
      }

      if (!fs) {
        const fsMatch = styleAttr.match(/font-size\s*:\s*([0-9.]+)px/i);
        fs = fsMatch ? parseFloat(fsMatch[1]) : 12;
      }

      const db = (t.getAttribute('dominant-baseline') || '').toLowerCase();
      if (db === 'central' || db === 'middle') {
        y += fs * 0.35;
        t.removeAttribute('dominant-baseline');
      } else if (db === 'hanging' || db === 'text-before-edge') {
        y += fs * 0.85;
        t.removeAttribute('dominant-baseline');
      }
      t.setAttribute('y', String(Math.round(y * 100) / 100));
    }

    return new XMLSerializer().serializeToString(svgEl);
  } catch (_e) {
    return svg;
  }
}

export function renderChartToSvgString(config: ChartConfig): { svg: string; error?: string } {
  const width = Math.max(120, Math.min(4000, Number(config.width) || 600));
  const height = Math.max(100, Math.min(4000, Number(config.height) || 420));
  let chart: any = null;
  try {
    registerBuiltInGeoMaps(echarts);
    chart = echarts.init(null as any, null, {
      renderer: 'svg',
      ssr: true,
      width,
      height,
    });
    const option = buildEChartsOption({ ...config, width, height });
    chart.setOption(option);
    const rawSvg = chart.renderToSVGString();
    return { svg: sanitizeEChartsSvgForVectorParser(rawSvg) };
  } catch (err: any) {
    return {
      svg: '',
      error: err && err.message ? String(err.message) : 'Gagal merender chart ECharts',
    };
  } finally {
    if (chart) {
      try {
        chart.dispose();
      } catch (_e) {}
    }
  }
}

function cloneConfig(cfg: ChartConfig): ChartConfig {
  try {
    return JSON.parse(JSON.stringify(cfg));
  } catch (_e) {
    return { ...cfg };
  }
}

function isInvisibleFullCanvasRect(o: VectorObject, w: number, h: number): boolean {
  if (!o || o.type === 'text' || o.type === 'image') return false;
  const fill = (o.fill || '').toLowerCase();
  const stroke = (o.stroke || '').toLowerCase();
  const noFill = !fill || fill === 'none' || fill === 'transparent';
  const noStroke = !stroke || stroke === 'none' || stroke === 'transparent' || !(o.strokeWidth && o.strokeWidth > 0);
  if (!noFill || !noStroke) return false;
  const bb = VE.tightBBox(o);
  if (!bb) return false;
  return (bb[2] - bb[0]) >= w * 0.92 && (bb[3] - bb[1]) >= h * 0.92;
}

export function buildChartVectorObjects(
  config: ChartConfig,
  opts: {
    groupId: string;
    originX: number;
    originY: number;
    existingNames?: Set<string>;
  }
): { objects: VectorObject[]; error?: string } {
  const { svg, error } = renderChartToSvgString(config);
  if (error || !svg) {
    return { objects: [], error: error || 'SVG chart kosong' };
  }

  const parsed = VE.parseSVG(svg);
  if (!parsed || parsed.error || !Array.isArray(parsed.objects) || !parsed.objects.length) {
    return { objects: [], error: 'Gagal mengurai SVG chart menjadi vektor' };
  }

  const w = Math.max(120, Number(config.width) || 600);
  const h = Math.max(100, Number(config.height) || 420);
  const usedNames = opts.existingNames ? new Set(opts.existingNames) : new Set<string>();
  const uniqName = (base: string) => {
    let n = base;
    let i = 2;
    while (usedNames.has(n)) n = base + '-' + i++;
    usedNames.add(n);
    return n;
  };

  let rawObjects: VectorObject[] = parsed.objects.filter(
    (o: VectorObject) => !(config.transparentBg && isInvisibleFullCanvasRect(o, w, h))
  );
  if (!rawObjects.length) {
    rawObjects = parsed.objects;
  }

  const translated = rawObjects.map((o: VectorObject) => VE.translate(o, opts.originX, opts.originY));

  let anchorIdx = translated.findIndex((o: VectorObject) => o && o.type !== 'text');
  if (anchorIdx < 0) anchorIdx = 0;

  const clonedCfg = cloneConfig(config);
  const out: VectorObject[] = translated.map((o: VectorObject, idx: number) => {
    const baseName = o.name || `${opts.groupId}-${idx + 1}`;
    const gen =
      idx === anchorIdx
        ? {
            kind: 'chart',
            version: 1,
            chartGroupId: opts.groupId,
            config: clonedCfg,
            bounds: { x: opts.originX, y: opts.originY, w, h },
          }
        : {
            kind: 'chart-member',
            chartGroupId: opts.groupId,
          };
    return {
      ...o,
      id: VE.uid(),
      name: uniqName(baseName),
      group: opts.groupId,
      gen,
    };
  });

  return { objects: out };
}

export function findSelectedChartAnchor(
  selObjs: VectorObject[],
  allObjects: VectorObject[]
): { anchor: VectorObject; groupId: string; members: VectorObject[]; config: ChartConfig } | null {
  if (!Array.isArray(selObjs) || !selObjs.length) return null;

  let targetGroupId: string | null = null;
  for (const o of selObjs) {
    if (!o) continue;
    if (o.gen && (o.gen.kind === 'chart' || o.gen.kind === 'chart-member') && o.gen.chartGroupId) {
      targetGroupId = o.gen.chartGroupId;
      break;
    }
  }
  if (!targetGroupId) return null;

  const members = (allObjects || []).filter(
    o =>
      o &&
      ((o.gen && (o.gen.kind === 'chart' || o.gen.kind === 'chart-member') && o.gen.chartGroupId === targetGroupId) ||
        o.group === targetGroupId)
  );
  if (!members.length) return null;

  const anchor = members.find(m => m.gen && m.gen.kind === 'chart' && m.gen.config);
  if (!anchor || !anchor.gen || !anchor.gen.config) return null;

  return {
    anchor,
    groupId: targetGroupId,
    members,
    config: anchor.gen.config as ChartConfig,
  };
}

export function regenChartGroup(
  members: VectorObject[],
  nextConfig: ChartConfig,
  allObjects: VectorObject[]
): { objects: VectorObject[]; error?: string } {
  if (!members.length) return { objects: [], error: 'Anggota grup chart kosong' };
  const anchor = members.find(m => m.gen && m.gen.kind === 'chart') || members[0];
  const groupId = (anchor.gen && anchor.gen.chartGroupId) || anchor.group || 'chart-1';

  let originX = anchor.gen && anchor.gen.bounds ? Number(anchor.gen.bounds.x) || 0 : 0;
  let originY = anchor.gen && anchor.gen.bounds ? Number(anchor.gen.bounds.y) || 0 : 0;
  try {
    // Only shift origin if the user dragged the chart on canvas (detected via anchor object bbox vs stored bounds)
    if (anchor.gen && anchor.gen.bounds) {
      let minX = Infinity;
      let minY = Infinity;
      for (const m of members) {
        const bb = VE.tightBBox(m);
        if (bb && Number.isFinite(bb[0]) && Number.isFinite(bb[1])) {
          if (bb[0] < minX) minX = bb[0];
          if (bb[1] < minY) minY = bb[1];
        }
      }
      // If card frame is disabled and bounds were from card, keep stable origin unless moved by > 8px
      if (Number.isFinite(minX) && Number.isFinite(minY)) {
        const dx = Math.abs(minX - originX);
        const dy = Math.abs(minY - originY);
        if (dx > 8 || dy > 8) {
          originX = minX;
          originY = minY;
        }
      }
    }
  } catch (_e) {}

  const memberIds = new Set(members.map(m => m.id));
  const existingNames = new Set(
    (allObjects || []).filter(o => o && !memberIds.has(o.id) && o.name).map(o => o.name as string)
  );

  return buildChartVectorObjects(nextConfig, {
    groupId,
    originX,
    originY,
    existingNames,
  });
}
