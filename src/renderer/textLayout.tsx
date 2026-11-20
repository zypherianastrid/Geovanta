import { legacyTextSpec, applyTextCase } from '../engine/legacyText.tsx';
import { parsePaintRgba01 } from '../utils/colorParserAndFormatter.tsx';

// Klik -> offset karakter (G4). Koordinat x,y dalam ruang layout paragraph
// (0,0 = kiri-atas kotak layout; pemanggil mengonversi dari koordinat
// dokumen dengan layout.x / layout.drawY). Runtime SkParagraph
// mengembalikan {pos, affinity} — BUKAN {position} seperti klaim .d.ts
// (terverifikasi terhadap canvaskit-wasm default build yang sama dengan
// aplikasi). pos adalah indeks unit kode UTF-16 dan sudah di-clamp Skia ke
// [0, panjang teks]; clamp di sini hanya pengaman bila length diberikan.
export function caretOffsetForPoint(paragraph, x, y, length) {
  if (!paragraph || typeof paragraph.getGlyphPositionAtCoordinate !== 'function') return 0;
  let pos = 0;
  try {
    const r = paragraph.getGlyphPositionAtCoordinate(x, y);
    pos = r && typeof r.pos === 'number' ? r.pos : (r && typeof r.position === 'number' ? r.position : 0);
  } catch (e) { pos = 0; }
  if (typeof length === 'number' && Number.isFinite(length)) return Math.max(0, Math.min(length, pos));
  return Math.max(0, pos);
}

// Batas TINTA asli sebuah paragraf Skia (bukan line box): union rect
// getRectsForRange(Tight, Tight) dalam koordinat paragraf (0,0 = kiri-atas
// kotak layout), digeser ke koordinat dokumen dengan (offsetX, offsetY).
// Dipakai kotak seleksi + panel Transform agar menempel ke huruf — line box
// (ascent + descent + leading) membuat "sasa" 96px punya gap atas ~0,43em
// dan bawah ~0,25em, serta lebar kotak tersimpan yang jauh lebih lebar dari
// teks (autoHeight). Gagal / kosong / API tak ada -> null -> pemanggil
// memakai bounds line box seperti sebelumnya. Rect SkRect CanvasKit adalah
// [left, top, right, bottom]; item bisa berupa rect langsung atau
// {rect} (TextBox) — keduanya diterima. Rect kosong (spasi/tanpa tinta)
// dilewati.
export function tightBoundsFromParagraph(paragraph, kit, offsetX, offsetY, endIndex) {
  if (!paragraph || typeof paragraph.getRectsForRange !== 'function') return null;
  if (!(endIndex > 0)) return null;
  const hStyle = kit && kit.RectHeightStyle && kit.RectHeightStyle.Tight !== undefined ? kit.RectHeightStyle.Tight : 0;
  const wStyle = kit && kit.RectWidthStyle && kit.RectWidthStyle.Tight !== undefined ? kit.RectWidthStyle.Tight : 0;
  let rects;
  try {
    rects = paragraph.getRectsForRange(0, endIndex, hStyle, wStyle);
  } catch (e) {
    return null;
  }
  if (!Array.isArray(rects) || rects.length === 0) return null;
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const item of rects) {
    const rc = item && item.rect ? item.rect : item;
    if (!rc || typeof rc.length !== 'number' || rc.length < 4) continue;
    const rl = rc[0], rt = rc[1], rr = rc[2], rb = rc[3];
    if (![rl, rt, rr, rb].every(Number.isFinite)) continue;
    if (rr <= rl || rb <= rt) continue;
    if (rl < l) l = rl;
    if (rt < t) t = rt;
    if (rr > r) r = rr;
    if (rb > b) b = rb;
  }
  if (!Number.isFinite(l) || !Number.isFinite(t) || r <= l || b <= t) return null;
  return [offsetX + l, offsetY + t, offsetX + r, offsetY + b];
}

// Return the caret before the next cluster, or after the final cluster.
export function caretSegmentForLayout(kit, layout, offset) {
  const {paragraph, spec, displayContent, drawX, drawY} = layout;
  const index = Math.min(displayContent.length, applyTextCase(spec.content.slice(0, offset), spec.textCase).length);
  const atEnd = index === displayContent.length;
  const glyph = displayContent.length && !(atEnd && displayContent.endsWith('\n'))
    ? paragraph.getGlyphInfoAt?.(atEnd ? index - 1 : index)
    : null;
  if (glyph) {
    const [left, top, right, bottom] = glyph.graphemeLayoutBounds;
    const rtl = glyph.dir === kit.TextDirection.RTL;
    const x = drawX + (atEnd !== rtl ? right : left);
    return [{x, y: drawY + top}, {x, y: drawY + bottom}];
  }

  // Empty paragraphs and the blank line after Enter have no glyph at the caret.
  const line = paragraph.getLineMetricsAt?.(atEnd ? paragraph.getNumberOfLines() - 1 : paragraph.getLineNumberAt(index));
  if (!line) return null;
  const top = drawY + line.baseline - line.ascent;
  const x = drawX + line.left + (atEnd ? line.width : 0);
  return [{x, y: top}, {x, y: top + line.height}];
}

export function makeTextLayout(kit, registry, object) {
  const spec = legacyTextSpec(object);
  if (!spec) throw new Error('Objek teks tidak valid');
  const requestedFamily = spec.fontFamily;
  const missingFont = !registry.getFace(requestedFamily, spec.fontWeight, spec.fontStyle);
  const family = missingFont ? (registry.defaultFamily || 'IBM Plex Sans') : requestedFamily;
  if (!registry.getFace(family, spec.fontWeight, spec.fontStyle)) {
    throw new Error('Face font untuk teks tidak tersedia');
  }
  const bold = spec.fontWeight === 'bold' || Number(spec.fontWeight) >= 600;
  const italic = spec.fontStyle === 'italic' || spec.fontStyle === 'oblique';
  const textAlign = spec.textAnchor === 'middle' ? kit.TextAlign.Center :
    spec.textAnchor === 'end' ? kit.TextAlign.Right :
    (spec.textAnchor === 'justify' && kit.TextAlign.Justify !== undefined) ? kit.TextAlign.Justify :
    kit.TextAlign.Left;
  const decoration = spec.textDecoration === 'underline' ? (kit.UnderlineDecoration ?? 1) :
    spec.textDecoration === 'strikethrough' ? (kit.LineThroughDecoration ?? 4) :
    (kit.NoDecoration ?? 0);
  const resolvedLineHeightPx = spec.fontSize * spec.lineHeight;
  const fontStyleSpec = {
    weight: bold ? kit.FontWeight.Bold : kit.FontWeight.Normal,
    width: kit.FontWidth.Normal,
    slant: italic ? kit.FontSlant.Italic : kit.FontSlant.Upright
  };
  const style = {
    textAlign,
    textStyle: {
      fontFamilies: [family],
      fontSize: spec.fontSize,
      fontStyle: fontStyleSpec,
      heightMultiplier: spec.lineHeight,
      halfLeading: true,
      letterSpacing: spec.letterSpacing,
      ...(decoration ? {decoration} : {}),
      ...(kit.Color4f ? {color: kit.Color4f(...parsePaintRgba01(spec.fill, spec.opacity))} : {})
    },
    strutStyle: {
      strutEnabled: true,
      fontFamilies: [family],
      fontSize: spec.fontSize,
      fontStyle: fontStyleSpec,
      heightMultiplier: spec.lineHeight,
      halfLeading: true,
      forceStrutHeight: true
    }
  };
  const paragraphStyle = kit.ParagraphStyle ? new kit.ParagraphStyle(style) : style;
  const builder = kit.ParagraphBuilder.MakeFromFontProvider(paragraphStyle, registry.provider);
  let paragraph;
  const displayContent = applyTextCase(spec.content, spec.textCase);
  try {
    builder.addText(displayContent || ' ');
    paragraph = builder.build();
  } finally {
    builder.delete();
  }
  paragraph.layout(1e6);
  const intrinsicWidth = Math.max(1, paragraph.getMaxIntrinsicWidth());
  // SkParagraph rounds wrap widths; a small whole-pixel allowance keeps an
  // intrinsic single line from wrapping at its own measured width.
  const useBoxWidth = spec.resizing !== 'autoWidth' && spec.width > 0;
  const width = useBoxWidth ? spec.width : (spec.width || Math.ceil(intrinsicWidth) + 1);
  paragraph.layout(width);
  const measuredHeight = paragraph.getHeight();
  const height = spec.resizing === 'fixed' && spec.height > 0 ? spec.height : measuredHeight;
  const x = spec.x - (spec.textAnchor === 'middle' ? width / 2 : spec.textAnchor === 'end' ? width : 0);
  const rawBaseline = paragraph.getAlphabeticBaseline();
  const firstLineBaselineY = Number.isFinite(rawBaseline) && rawBaseline > 0 ? rawBaseline : resolvedLineHeightPx * 0.8;
  const y = spec.y - firstLineBaselineY;
  let drawY = y;
  if (spec.resizing === 'fixed' && spec.height > 0) {
    if (spec.verticalAlign === 'middle') drawY = y + (height - measuredHeight) / 2;
    else if (spec.verticalAlign === 'bottom') drawY = y + (height - measuredHeight);
  }
  // Batas tinta (tight) — dihitung dari layout AKHIR (setelah layout(width),
  // supaya wrap sudah final). null bila API tak ada / tanpa tinta.
  // 2026-11-16 (terukur di browser): rect Skia MENGABAIKAN gaya Tight —
  // semua kombinasi gaya memberi rect garis penuh (untuk "sasa" 96px:
  // [0,-7.77,196.03,117.03], tinggi 124,8 doc — LEBIH longgar dari line box
  // 115,2). Jadi pakai LEBAR rect saja (lebar intrinsik teks — ini yang
  // memperbaiki gap kanan autoHeight/fixed) dengan TINGGI line box (tidak
  // berubah, tanpa regresi). Tinggi tinta per-glyph (gap atas) butuh
  // getShapedLines + Font.getGlyphBounds — follow-up terpisah.
  const tightRaw = tightBoundsFromParagraph(paragraph, kit, x, drawY, displayContent.length);
  const tightBounds = tightRaw ? [tightRaw[0], y, tightRaw[2], y + height] : null;
  return {
    paragraph,
    displayContent,
    x,
    y,
    drawX: x,
    drawY,
    width,
    height,
    measuredHeight,
    resolvedLineHeightPx,
    firstLineBaselineY,
    bounds: [x, y, x + width, y + height],
    tightBounds,
    spec,
    family,
    missingFont,
    dispose: () => paragraph.delete()
  };
}
