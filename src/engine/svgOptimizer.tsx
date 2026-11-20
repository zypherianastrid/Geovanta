/**
 * @file src/engine/svgOptimizer.tsx
 * @description Engine optimasi ukuran berkas SVG murni dan generator preset ekspor kode modern
 * (Web Minified, React JSX, Vue SFC, CSS Data URI, serta Prettify XML).
 */
import { serializeDoc } from './svgDocumentSerializer.tsx';

export interface SvgOptimizerOptions {
  precision?: number;
  removeEditorData?: boolean;
  removeUnusedDefs?: boolean;
  collapseWhitespace?: boolean;
  removeComments?: boolean;
  shortenColors?: boolean;
}

export interface SvgOptimizationResult {
  svg: string;
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercent: number;
}

export type SvgExportFormat = 'svg-raw' | 'svg-minified' | 'react-jsx' | 'vue-sfc' | 'css-data-uri';

const DEFAULT_OPTIONS: Required<SvgOptimizerOptions> = {
  precision: 2,
  removeEditorData: true,
  removeUnusedDefs: true,
  collapseWhitespace: true,
  removeComments: true,
  shortenColors: true,
};

/** Escape special regex characters in string */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Check if ID is referenced via url(#id), href="#id", or xlink:href="#id" */
function isIdReferenced(id: string, text: string): boolean {
  const esc = escapeRegex(id);
  const pattern = new RegExp(
    '(?:url\\([\'"]?#' + esc + '[\'"]?\\)|href=[\'"]#' + esc + '[\'"]|xlink:href=[\'"]#' + esc + '[\'"])',
    'i'
  );
  return pattern.test(text);
}

/** Parse top-level XML elements inside a content string (e.g. inside <defs>) */
function parseXmlElements(content: string): Array<{ tag: string; id: string | null; raw: string }> {
  const elements: Array<{ tag: string; id: string | null; raw: string }> = [];
  let i = 0;
  const len = content.length;

  while (i < len) {
    const startTag = content.indexOf('<', i);
    if (startTag === -1) break;

    // Skip comments
    if (content.startsWith('<!--', startTag)) {
      const endComment = content.indexOf('-->', startTag);
      i = endComment === -1 ? len : endComment + 3;
      continue;
    }

    // Extract tag name
    const tagMatch = /^<([a-zA-Z0-9:-]+)/.exec(content.slice(startTag));
    if (!tagMatch) {
      i = startTag + 1;
      continue;
    }

    const tagName = tagMatch[1];
    const tagClose = content.indexOf('>', startTag);
    if (tagClose === -1) break;

    const isSelfClosing = content[tagClose - 1] === '/';
    let rawElement = '';

    if (isSelfClosing) {
      rawElement = content.slice(startTag, tagClose + 1);
      i = tagClose + 1;
    } else {
      const closeTagStr = '</' + tagName + '>';
      let depth = 1;
      let curr = tagClose + 1;
      let endElem = -1;

      while (curr < len) {
        const nextOpen = content.indexOf('<' + tagName, curr);
        const nextClose = content.indexOf(closeTagStr, curr);

        if (nextClose === -1) {
          endElem = len;
          break;
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          const charAfter = content[nextOpen + 1 + tagName.length];
          if (charAfter === ' ' || charAfter === '>' || charAfter === '/' || charAfter === '\n' || charAfter === '\t') {
            depth++;
          }
          curr = nextOpen + 1 + tagName.length;
        } else {
          depth--;
          if (depth === 0) {
            endElem = nextClose + closeTagStr.length;
            break;
          }
          curr = nextClose + closeTagStr.length;
        }
      }

      rawElement = endElem !== -1 ? content.slice(startTag, endElem) : content.slice(startTag);
      i = endElem !== -1 ? endElem : len;
    }

    const idMatch = /\bid\s*=\s*(["'])([\s\S]*?)\1/i.exec(rawElement);
    const id = idMatch ? idMatch[2] : null;
    elements.push({ tag: tagName, id, raw: rawElement });
  }

  return elements;
}

/** Prune unreferenced <defs> elements */
function pruneUnusedDefs(svg: string): string {
  let pruned = svg.replace(/<defs\b[^>]*>([\s\S]*?)<\/defs>/gi, (match, defsContent) => {
    const outerSvg = svg.replace(match, '');
    const elements = parseXmlElements(defsContent);
    if (elements.length === 0) return '';

    const usedIndices = new Set<number>();
    // Elements without an ID (e.g. <style>) are always kept
    elements.forEach((el, idx) => {
      if (!el.id) {
        usedIndices.add(idx);
      } else if (isIdReferenced(el.id, outerSvg)) {
        usedIndices.add(idx);
      }
    });

    // Resolve transitive dependencies (e.g., gradient referencing another gradient)
    let added = true;
    while (added) {
      added = false;
      elements.forEach((el, idx) => {
        if (!usedIndices.has(idx) && el.id) {
          for (const uIdx of usedIndices) {
            if (isIdReferenced(el.id, elements[uIdx].raw)) {
              usedIndices.add(idx);
              added = true;
              break;
            }
          }
        }
      });
    }

    const keptElements = elements.filter((_, idx) => usedIndices.has(idx));
    if (keptElements.length === 0) return '';
    return '<defs>' + keptElements.map(e => e.raw).join('') + '</defs>';
  });

  // Remove empty or self-closing defs
  pruned = pruned.replace(/<defs\s*>\s*<\/defs>/gi, '');
  pruned = pruned.replace(/<defs\s*\/>/gi, '');
  return pruned;
}

/** Round a floating-point number string to fixed decimal precision without trailing zeros */
function roundNumber(num: number, precision: number): string {
  const factor = Math.pow(10, precision);
  const rounded = Math.round(num * factor) / factor;
  return rounded === 0 ? '0' : String(rounded);
}

/** Calculate UTF-8 byte length across Node and Browser */
function getByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return str.length;
}

/**
 * Optimasi ukuran berkas SVG dengan memangkas komentar, metadata,
 * atribut editor internal, elemen defs tak terpakai, memperpendek kode warna,
 * membulatkan presisi desimal, dan memadatkan spasi putih.
 */
export function optimizeSvg(svgString: string, options?: SvgOptimizerOptions): SvgOptimizationResult {
  const opts: Required<SvgOptimizerOptions> = {
    ...DEFAULT_OPTIONS,
    ...(options || {})
  };

  let res = svgString;

  // 1. Pembersihan Komentar
  if (opts.removeComments) {
    res = res.replace(/<!--[\s\S]*?-->/g, '');
  }

  // 2. Pembersihan Metadata & Atribut Editor Internal
  if (opts.removeEditorData) {
    res = res.replace(/<\?xml[\s\S]*?\?>\s*/gi, '');
    res = res.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    // Hapus atribut internal editor: data-geovanta-*, data-fill-style, data-stroke-style, data-gen, data-effects, data-*
    res = res.replace(/\s+data-(?:geovanta-[a-zA-Z0-9_-]+|fill-style|stroke-style|gen|effects|[a-zA-Z0-9_-]+)=(["'])(?:(?!\1)[\s\S])*?\1/gi, '');
  }

  // 3. Pruning <defs> Tak Terpakai
  if (opts.removeUnusedDefs) {
    res = pruneUnusedDefs(res);
  }

  // 4. Pembulatan Presisi Desimal
  if (typeof opts.precision === 'number' && opts.precision >= 0) {
    const prec = opts.precision;
    const NUMERIC_ATTR_REGEX = /\b(d|transform|viewBox|x|y|width|height|x1|y1|x2|y2|cx|cy|r|rx|ry|stroke-width|stroke-dasharray|stroke-dashoffset|stroke-miterlimit|opacity|fill-opacity|stroke-opacity|stop-opacity|points|offset|dx|dy|font-size|stdDeviation|style)\s*=\s*(["'])([\s\S]*?)\2/gi;
    res = res.replace(NUMERIC_ATTR_REGEX, (m, attr, quote, val) => {
      const roundedVal = val.replace(/-?(?:\d*\.\d+|\d+e[+-]?\d+)/gi, (numStr) => {
        const n = parseFloat(numStr);
        return isNaN(n) ? numStr : roundNumber(n, prec);
      });
      return `${attr}=${quote}${roundedVal}${quote}`;
    });
  }

  // 5. Shorten Colors (#ffffff -> #fff, #ff33aa -> #f3a)
  if (opts.shortenColors) {
    res = res.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3(?![0-9a-fA-F])/g, (m, r, g, b) => '#' + (r + g + b).toLowerCase());
  }

  // 6. Whitespace Collapse
  if (opts.collapseWhitespace) {
    res = res.replace(/>\s+</g, '><');
    res = res.replace(/<[^>]+>/g, (tag) => {
      return tag.replace(/\s+/g, ' ').replace(/\s*=\s*/g, '=').replace(/\s+\/>/g, '/>');
    });
    res = res.trim();
  }

  const originalSize = getByteLength(svgString);
  const optimizedSize = getByteLength(res);
  const savingsBytes = Math.max(0, originalSize - optimizedSize);
  const savingsPercent = originalSize > 0 ? Number(((savingsBytes / originalSize) * 100).toFixed(1)) : 0;

  return {
    svg: res,
    originalSize,
    optimizedSize,
    savingsBytes,
    savingsPercent
  };
}

/**
 * Format XML string dengan indentasi hierarkis 2 spasi dan baris baru teratur.
 */
export function prettifyXml(xml: string): string {
  const trimmed = xml.trim().replace(/>\s*</g, '><');
  let formatted = '';
  let indent = 0;
  const pad = '  ';

  const regex = /(<\?xml[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->|<\/[a-zA-Z0-9:-]+>|<[a-zA-Z0-9:-]+(?:\s+[^"'>]*(?:(?:"[^"]*"|'[^']*')[^"'>]*)*)?\/>|<[a-zA-Z0-9:-]+(?:\s+[^"'>]*(?:(?:"[^"]*"|'[^']*')[^"'>]*)*)?>[^<]+<\/[a-zA-Z0-9:-]+>|<[a-zA-Z0-9:-]+(?:\s+[^"'>]*(?:(?:"[^"]*"|'[^']*')[^"'>]*)*)?>|[^<]+)/g;

  let match;
  while ((match = regex.exec(trimmed)) !== null) {
    const token = match[0].trim();
    if (!token) continue;

    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += pad.repeat(indent) + token + '\n';
    } else if (token.startsWith('<?') || token.startsWith('<!') || token.endsWith('/>')) {
      formatted += pad.repeat(indent) + token + '\n';
    } else if (/^<([a-zA-Z0-9:-]+)[^>]*>([\s\S]*?)<\/\1>$/.test(token)) {
      formatted += pad.repeat(indent) + token + '\n';
    } else if (token.startsWith('<')) {
      formatted += pad.repeat(indent) + token + '\n';
      indent++;
    } else {
      formatted += pad.repeat(indent) + token + '\n';
    }
  }

  return formatted.trim();
}

/** Mapping atribut SVG kebab-case ke camelCase untuk React JSX */
const JSX_ATTR_MAP: Record<string, string> = {
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'paint-order': 'paintOrder',
  'vector-effect': 'vectorEffect',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'shape-rendering': 'shapeRendering',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'letter-spacing': 'letterSpacing',
  'word-spacing': 'wordSpacing',
  'color-interpolation': 'colorInterpolation',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'lighting-color': 'lightingColor',
  'xlink:href': 'xlinkHref',
  'xmlns:xlink': 'xmlnsXlink',
  'xml:space': 'xmlSpace',
  'class': 'className'
};

/**
 * Pembangkit kode ekspor modern sesuai preset format:
 * - 'svg-raw': Serialisasi SVG normal.
 * - 'svg-minified': SVG terkompresi satu baris.
 * - 'react-jsx': Komponen React fungsional dengan atribut camelCase, className, dan {...props}.
 * - 'vue-sfc': Komponen Vue 3 Single File Component (<template> + <script setup>).
 * - 'css-data-uri': URL UTF-8 yang aman untuk properti CSS background-image.
 */
export function generateExportCode(
  doc: any,
  format: SvgExportFormat = 'svg-raw',
  options: Record<string, any> = {}
): string {
  const rawSvg = typeof doc === 'string' ? doc : serializeDoc(doc, options);

  switch (format) {
    case 'svg-raw':
      return rawSvg;

    case 'svg-minified': {
      const optResult = optimizeSvg(rawSvg, options);
      return optResult.svg;
    }

    case 'react-jsx': {
      const optResult = optimizeSvg(rawSvg, { ...options, collapseWhitespace: true });
      let cleanSvg = optResult.svg.replace(/<\?xml[\s\S]*?\?>\s*/gi, '').trim();

      // Convert kebab-case attributes to camelCase
      cleanSvg = cleanSvg.replace(/<[a-zA-Z0-9:-]+(?:\s+[^>]*?)?>/g, (tag) => {
        let updatedTag = tag;
        for (const [kebab, camel] of Object.entries(JSX_ATTR_MAP)) {
          const reg = new RegExp('\\b' + escapeRegex(kebab) + '(?=\\s*=)', 'g');
          updatedTag = updatedTag.replace(reg, camel);
        }
        return updatedTag;
      });

      // Inject {...props} into <svg ...>
      if (!/\{\.\.\.props\}/.test(cleanSvg)) {
        if (/<svg\b[^>]*\/>/i.test(cleanSvg)) {
          cleanSvg = cleanSvg.replace(/<svg\b([^>]*)\/>/i, (_, attrs) => {
            const a = attrs ? attrs.trim() : '';
            return '<svg' + (a ? ' ' + a : '') + ' {...props} />';
          });
        } else {
          cleanSvg = cleanSvg.replace(/<svg\b([^>]*)>/i, (_, attrs) => {
            const a = attrs ? attrs.trim() : '';
            return '<svg' + (a ? ' ' + a : '') + ' {...props}>';
          });
        }
      }

      // Prettify SVG content indented for component body
      const prettySvg = prettifyXml(cleanSvg);
      const indentedSvg = prettySvg
        .split('\n')
        .map(line => '  ' + line)
        .join('\n');

      const componentName = options.componentName || 'SvgIcon';

      return `import React from 'react';

export const ${componentName} = (props) => (
${indentedSvg}
);

export default ${componentName};`;
    }

    case 'vue-sfc': {
      const optResult = optimizeSvg(rawSvg, { ...options, collapseWhitespace: true });
      const cleanSvg = optResult.svg.replace(/<\?xml[\s\S]*?\?>\s*/gi, '').trim();
      const prettySvg = prettifyXml(cleanSvg);
      const indentedSvg = prettySvg
        .split('\n')
        .map(line => '  ' + line)
        .join('\n');

      return `<template>
${indentedSvg}
</template>

<script setup>
// Geovanta Vector Studio - Vue 3 Component
</script>`;
    }

    case 'css-data-uri': {
      const optResult = optimizeSvg(rawSvg, { ...options, collapseWhitespace: true });
      const cleanSvg = optResult.svg.replace(/<\?xml[\s\S]*?\?>\s*/gi, '').trim();

      const encoded = cleanSvg
        .replace(/[\r\n]+/g, '')
        .replace(/%/g, '%25')
        .replace(/#/g, '%23')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E')
        .replace(/"/g, '%22')
        .replace(/'/g, '%27');

      return `background-image: url("data:image/svg+xml;utf8,${encoded}");`;
    }

    default:
      return rawSvg;
  }
}
