import opentype from 'opentype.js';
import { isLegacyText, legacyTextSpec, applyTextCase } from './legacyText.tsx';
import { faceKey, validateFontBytes } from '../renderer/textFontRegistry.tsx';
import { AssetManager } from '../workspace/assetManager.tsx';
import { uid, rd, sub, cross, dot } from './vectorPrimitives.tsx';
import { rotateObjAround } from './selectionTransformAndAlign.tsx';

const parsedFontCache = new WeakMap();

function getParsedFont(bytes) {
  let font = parsedFontCache.get(bytes);
  if (font) return font;
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  font = opentype.parse(ab);
  parsedFontCache.set(bytes, font);
  return font;
}

async function resolveFontBytes(spec, options: Record<string, any> = {}) {
  const { registry = null, bundledFont = globalThis.GEOVANTA_BUNDLED_TEXT_FONT } = options;
  if (registry) {
    // Muat SELURUH keluarga (regular/bold/italic/boldItalic) dari asetnya.
    // ensureAssetFont(fontAssetId) saja hanya memulihkan 1 face (regular,
    // karena fontAssetId menunjuk aset regular) — lalu getFace(bold) jatuh
    // ke regular dan path hasil konversi berwajah regular untuk teks bold.
    // ensureAssetFontFamily memuat tiap face dari fontAssetIds-nya.
    if (spec.fontAssetId || spec.fontAssetIds) {
      await registry.ensureAssetFontFamily(spec);
    }
    // Face persis dulu; fallback ke face lain hanya bila face yang diminta
    // memang tidak ada asetnya (mis. impor .ttf tunggal).
    const face = registry.getExactFace(spec.fontFamily, spec.fontWeight, spec.fontStyle)
      || registry.getFace(spec.fontFamily, spec.fontWeight, spec.fontStyle);
    if (face) return face;
  }
  if (spec.fontAssetId) {
    const record = await AssetManager.getAsset(spec.fontAssetId);
    if (record?.blob) {
      const bytes = new Uint8Array(await record.blob.arrayBuffer());
      validateFontBytes(bytes, record.name);
      return bytes;
    }
  }
  if (bundledFont?.family && String(bundledFont.family).toLowerCase() === String(spec.fontFamily).toLowerCase()) {
    const key = faceKey(spec.fontWeight, spec.fontStyle);
    const face = bundledFont.faces?.[key] || bundledFont.faces?.regular;
    if (face) return face instanceof Uint8Array ? face : new Uint8Array(face);
  }
  throw new Error(`Font tidak tersedia untuk konversi ke path: ${spec.fontFamily}. Pilih pengganti atau impor font tersebut.`);
}

/**
 * Resolusi glyph aman terhadap tabel layout OpenType (GSUB/GPOS) yang belum didukung oleh opentype.js
 * (mis. error 'substitutionType : 62 lookupType: 6 - substFormat: 2 is not yet supported' pada font Oswald).
 */
function safeStringToGlyphs(font, text) {
  if (!font || !text) return [];
  try {
    return font.stringToGlyphs(text);
  } catch (err) {
    // Fallback 1: nonaktifkan fitur substitusi GSUB yang memicu lookup format tak didukung
    try {
      if (typeof font.stringToGlyphs === 'function') {
        return font.stringToGlyphs(text, { features: [] });
      }
    } catch (_) {}
    // Fallback 2: ambil glyph per karakter langsung dari tabel cmap
    return Array.from(String(text)).map(ch => {
      try {
        return font.charToGlyph(ch) || (font.glyphs && font.glyphs.get(0));
      } catch (_) {
        return font.glyphs && font.glyphs.get(0);
      }
    }).filter(Boolean);
  }
}

function measureGlyphRun(font, text, fontSize, letterSpacing) {
  const scale = fontSize / (font.unitsPerEm || 1000);
  const glyphs = safeStringToGlyphs(font, text);
  const positions = [];
  let x = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    if (i > 0) {
      const kern = font.getKerningValue(glyphs[i - 1], g);
      x += kern * scale;
    }
    positions.push({ glyph: g, x });
    x += (g.advanceWidth || 0) * scale;
    if (i < glyphs.length - 1) x += letterSpacing;
  }
  return { glyphs, positions, width: x };
}

function wrapParagraphLines(font, rawParagraphs, fontSize, letterSpacing, maxWidth) {
  const lines = [];
  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const raw = rawParagraphs[pIdx];
    if (!maxWidth || !(maxWidth > 0) || !raw.trim()) {
      lines.push({ text: raw, isParagraphEnd: true });
      continue;
    }
    const words = raw.split(/(\s+)/);
    let current = '';
    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const token = words[wIdx];
      if (!token) continue;
      const candidate = current + token;
      const measured = measureGlyphRun(font, candidate.trimEnd(), fontSize, letterSpacing);
      if (current.trim() && measured.width > maxWidth) {
        lines.push({ text: current.trimEnd(), isParagraphEnd: false });
        current = token.trimStart();
      } else {
        current = candidate;
      }
    }
    lines.push({ text: current, isParagraphEnd: true });
  }
  return lines;
}

function commandsToSubpaths(commands) {
  const subs = [];
  let cur = null;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const mk = (x, y) => ({
    id: uid(),
    x: rd(x),
    y: rd(y),
    type: 'corner',
    handleIn: null,
    handleOut: null
  });
  const closeCurrent = () => {
    if (!cur) return;
    cur.closed = true;
    if (cur.nodes.length > 2) {
      const f = cur.nodes[0];
      const l = cur.nodes[cur.nodes.length - 1];
      if (Math.hypot(l.x - f.x, l.y - f.y) < 1e-4 && !l.handleOut && !f.handleIn) {
        if (l.handleIn) f.handleIn = l.handleIn;
        cur.nodes.pop();
      }
    }
    cur = null;
  };
  for (const cmd of commands || []) {
    if (cmd.type === 'M') {
      if (cur) closeCurrent();
      cur = { id: uid(), closed: true, nodes: [mk(cmd.x, cmd.y)] };
      subs.push(cur);
      cx = sx = cmd.x;
      cy = sy = cmd.y;
    } else if (cmd.type === 'L') {
      if (!cur) {
        cur = { id: uid(), closed: true, nodes: [mk(cx, cy)] };
        subs.push(cur);
      }
      cur.nodes.push(mk(cmd.x, cmd.y));
      cx = cmd.x;
      cy = cmd.y;
    } else if (cmd.type === 'Q') {
      if (!cur) {
        cur = { id: uid(), closed: true, nodes: [mk(cx, cy)] };
        subs.push(cur);
      }
      const prev = cur.nodes[cur.nodes.length - 1];
      const c1x = rd(cx + (2 / 3) * (cmd.x1 - cx));
      const c1y = rd(cy + (2 / 3) * (cmd.y1 - cy));
      const c2x = rd(cmd.x + (2 / 3) * (cmd.x1 - cmd.x));
      const c2y = rd(cmd.y + (2 / 3) * (cmd.y1 - cmd.y));
      prev.handleOut = (c1x === prev.x && c1y === prev.y) ? null : { x: c1x, y: c1y };
      const next = mk(cmd.x, cmd.y);
      next.handleIn = (c2x === next.x && c2y === next.y) ? null : { x: c2x, y: c2y };
      cur.nodes.push(next);
      cx = cmd.x;
      cy = cmd.y;
    } else if (cmd.type === 'C') {
      if (!cur) {
        cur = { id: uid(), closed: true, nodes: [mk(cx, cy)] };
        subs.push(cur);
      }
      const prev = cur.nodes[cur.nodes.length - 1];
      const c1x = rd(cmd.x1), c1y = rd(cmd.y1);
      const c2x = rd(cmd.x2), c2y = rd(cmd.y2);
      prev.handleOut = (c1x === prev.x && c1y === prev.y) ? null : { x: c1x, y: c1y };
      const next = mk(cmd.x, cmd.y);
      next.handleIn = (c2x === next.x && c2y === next.y) ? null : { x: c2x, y: c2y };
      cur.nodes.push(next);
      cx = cmd.x;
      cy = cmd.y;
    } else if (cmd.type === 'Z') {
      closeCurrent();
      cx = sx;
      cy = sy;
    }
  }
  if (cur) closeCurrent();
  const valid = subs.filter(sp => sp.nodes.length >= 2);
  valid.forEach(sp => {
    sp.nodes.forEach(nd => {
      if (nd.handleIn && nd.handleOut) {
        const vi = sub(nd, nd.handleIn);
        const vo = sub(nd.handleOut, nd);
        if (Math.abs(Math.atan2(cross(vi, vo), dot(vi, vo))) < 0.08) {
          nd.type = Math.abs(Math.hypot(vi.x, vi.y) - Math.hypot(vo.x, vo.y)) < 0.5 ? 'symmetric' : 'smooth';
        }
      }
    });
  });
  return valid;
}

export async function textToPathObject(object, options = {}) {
  const spec = legacyTextSpec(object);
  if (!spec) throw new Error('Objek teks tidak valid');
  const bytes = await resolveFontBytes(spec, options);
  const font = getParsedFont(bytes);
  const displayContent = applyTextCase(spec.content, spec.textCase);

  for (const ch of displayContent) {
    if (/\s/.test(ch)) continue;
    const glyph = font.charToGlyph(ch);
    if (!glyph || glyph.index === 0) {
      const cp = ch.codePointAt(0).toString(16).toUpperCase();
      throw new Error(`Font "${spec.fontFamily}" tidak memiliki glyph untuk karakter "${ch}" (U+${cp})`);
    }
  }

  const rawParagraphs = displayContent.split(/\r?\n/);
  const wrapWidth = spec.resizing !== 'autoWidth' && spec.width > 0 ? spec.width : null;
  const wrappedLines = wrapParagraphLines(font, rawParagraphs, spec.fontSize, spec.letterSpacing, wrapWidth);
  const measuredLines = wrappedLines.map(item => ({
    ...item,
    ...measureGlyphRun(font, item.text, spec.fontSize, spec.letterSpacing)
  }));

  const maxLineWidth = Math.max(1, ...measuredLines.map(l => l.width));
  const boxWidth = wrapWidth || maxLineWidth;
  const boxLeft = spec.textAnchor === 'middle'
    ? spec.x - boxWidth / 2
    : spec.textAnchor === 'end'
      ? spec.x - boxWidth
      : spec.x;

  const lineStep = spec.fontSize * spec.lineHeight;
  let totalTextHeight = spec.fontSize;
  for (let i = 0; i < measuredLines.length - 1; i++) {
    totalTextHeight += lineStep + (measuredLines[i].isParagraphEnd ? (spec.paragraphSpacing || 0) : 0);
  }
  let yOffset = 0;
  if (spec.resizing === 'fixed' && spec.height > 0) {
    if (spec.verticalAlign === 'middle') yOffset = (spec.height - totalTextHeight) / 2;
    else if (spec.verticalAlign === 'bottom') yOffset = spec.height - totalTextHeight;
  }

  const subs = [];
  let cursorY = spec.y + yOffset;
  for (let lineIdx = 0; lineIdx < measuredLines.length; lineIdx++) {
    const line = measuredLines[lineIdx];
    const lineStartX = spec.textAnchor === 'middle'
      ? boxLeft + (boxWidth - line.width) / 2
      : spec.textAnchor === 'end'
        ? boxLeft + (boxWidth - line.width)
        : boxLeft;

    for (const { glyph, x } of line.positions) {
      const gPath = glyph.getPath(lineStartX + x, cursorY, spec.fontSize);
      if (gPath?.commands?.length) {
        subs.push(...commandsToSubpaths(gPath.commands));
      }
    }

    if (line.width > 0 && (spec.textDecoration === 'underline' || spec.textDecoration === 'strikethrough')) {
      const thickness = Math.max(1, rd(spec.fontSize * 0.065));
      const decY = spec.textDecoration === 'underline'
        ? cursorY + spec.fontSize * 0.12
        : cursorY - spec.fontSize * 0.3;
      const x0 = rd(lineStartX);
      const x1 = rd(lineStartX + line.width);
      const y0 = rd(decY - thickness / 2);
      const y1 = rd(decY + thickness / 2);
      subs.push(...commandsToSubpaths([
        { type: 'M', x: x0, y: y0 },
        { type: 'L', x: x1, y: y0 },
        { type: 'L', x: x1, y: y1 },
        { type: 'L', x: x0, y: y1 },
        { type: 'Z' }
      ]));
    }

    cursorY += lineStep + (line.isParagraphEnd ? (spec.paragraphSpacing || 0) : 0);
  }

  const { text: _removedText, type: _removedType, ...rest } = object;
  let pathObj = {
    ...rest,
    id: object.id || uid(),
    name: object.name || (spec.content ? spec.content.slice(0, 24).trim() : 'Text Path') || 'Text Path',
    type: 'path',
    fill: spec.fill || '#111827',
    stroke: object.stroke || 'none',
    strokeWidth: object.strokeWidth || 0,
    strokeLinejoin: object.strokeLinejoin || 'round',
    strokeLinecap: object.strokeLinecap || 'round',
    opacity: spec.opacity,
    fillRule: 'nonzero',
    subs
  };

  if (object.rot && subs.length) {
    pathObj = rotateObjAround({...pathObj, rot: 0, bboxAngle: 0}, spec.x, spec.y, -object.rot);
  }
  return pathObj;
}

export async function convertDocumentTextToPaths(doc, options: Record<string, any> = {}) {
  if (!doc?.objects?.some(isLegacyText)) return doc;
  const onlyIds = options.only instanceof Set ? options.only : null;
  let changed = false;
  const nextObjects = [];
  for (const obj of doc.objects) {
    if (isLegacyText(obj) && (!onlyIds || onlyIds.has(obj.id))) {
      const converted = await textToPathObject(obj, options);
      nextObjects.push(converted);
      changed = true;
    } else {
      nextObjects.push(obj);
    }
  }
  return changed ? { ...doc, objects: nextObjects } : doc;
}
