export const isLegacyText = o => !!o && (o.type === 'text' || o.text != null);

// Nama layer otomatis dari isi teks (Figma-like, G2): baris pertama,
// dipotong keras 30 karakter; isi kosong -> 'Text'.
export function textAutoName(content) {
  const first = String(content ?? '').split(/\r?\n/)[0].trim();
  if (!first) return 'Text';
  return first.slice(0, 30);
}

export function applyTextCase(content, textCase = 'original') {
  const s = String(content ?? '');
  if (textCase === 'upper') return s.toUpperCase();
  if (textCase === 'lower') return s.toLowerCase();
  if (textCase === 'title') {
    return s.replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return s;
}

export function legacyTextSpec(o) {
  if (!isLegacyText(o)) return null;
  const value = o.text && typeof o.text === 'object' ? o.text : {};
  const content = typeof o.text === 'string' ? o.text : String(value.content ?? value.value ?? value.text ?? o.content ?? '');
  const firstNode = o.subs?.[0]?.nodes?.[0];
  const size = Number(value.fontSize ?? o.fontSize ?? 16);
  const fontSize = Number.isFinite(size) && size > 0 ? Math.min(size, 10000) : 16;
  const x = Number(value.x ?? o.x ?? firstNode?.x ?? 0);
  const y = Number(value.y ?? o.y ?? firstNode?.y ?? fontSize);
  const letterSpacing = Number(value.letterSpacing ?? o.letterSpacing ?? 0);
  const paragraphSpacing = Number(value.paragraphSpacing ?? o.paragraphSpacing ?? 0);
  const boxWidth = Number(value.width ?? o.width);
  const boxHeight = Number(value.height ?? o.height);
  const width = Number.isFinite(boxWidth) && boxWidth > 0 ? boxWidth : null;
  const height = Number.isFinite(boxHeight) && boxHeight > 0 ? boxHeight : null;
  const rawResizing = value.resizing ?? o.resizing;
  const resizing = ['autoWidth', 'autoHeight', 'fixed'].includes(rawResizing)
    ? rawResizing
    : (width && height ? 'fixed' : width ? 'autoHeight' : 'autoWidth');
  const rawVAlign = value.verticalAlign ?? o.verticalAlign;
  const verticalAlign = ['top', 'middle', 'bottom'].includes(rawVAlign) ? rawVAlign : 'top';
  const rawDecoration = value.textDecoration ?? o.textDecoration;
  const textDecoration = ['none', 'underline', 'strikethrough'].includes(rawDecoration) ? rawDecoration : 'none';
  const rawCase = value.textCase ?? o.textCase;
  const textCase = ['original', 'upper', 'lower', 'title'].includes(rawCase) ? rawCase : 'original';
  const topFill = typeof o.fill === 'string' && o.fill.trim() ? o.fill : null;
  return {
    content,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : fontSize,
    fontSize,
    fontFamily: (String(value.fontFamily ?? o.fontFamily ?? 'sans-serif')
      .split(',')[0]
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'sans-serif'),
    fontWeight: String(value.fontWeight ?? o.fontWeight ?? 'normal'),
    fontStyle: String(value.fontStyle ?? o.fontStyle ?? 'normal'),
    textAnchor: String(value.textAnchor ?? o.textAnchor ?? 'start'),
    verticalAlign,
    resizing,
    textDecoration,
    textCase,
    paragraphSpacing: Number.isFinite(paragraphSpacing) && paragraphSpacing >= 0 ? paragraphSpacing : 0,
    fill: String(topFill ?? value.fill ?? value.color ?? '#000000'),
    opacity: Math.max(0, Math.min(1, Number(o.opacity ?? 1) || 0)),
    lineHeight: Math.max(0.5, Math.min(5, Number(value.lineHeight ?? o.lineHeight ?? 1.2) || 1.2)),
    letterSpacing: Number.isFinite(letterSpacing) ? letterSpacing : 0,
    width,
    height,
    // null eksplisit di .text berarti "dibersihkan" (mis. keluarga diganti
    // sebelum embed selesai, atau tombol "Pakai IBM Plex Sans") — jangan
    // jatuh ke nilai top-level yang basi. Hanya bila kuncinya TIDAK ADA
    // (undefined) di .text, pakai top-level (data lama).
    fontAssetId: value.fontAssetId !== undefined ? value.fontAssetId : (o.fontAssetId ?? null),
    // Peta aset per face ({regular, bold, italic, boldItalic} -> assetId) —
    // Google Fonts embed menyimpan 1 aset per face agar semua face bisa
    // dimuat ulang saat proyek dibuka lagi (bukan hanya 1 face).
    // null eksplisit di .text berarti "dibersihkan" (mis. keluarga diganti
    // sebelum embed selesai) — jangan jatuh ke nilai top-level yang basi.
    // Hanya bila kuncinya TIDAK ADA (undefined) di .text, pakai top-level.
    fontAssetIds: value.fontAssetIds !== undefined ? value.fontAssetIds : (o.fontAssetIds ?? null)
  };
}

export function normalizeTextObject(o) {
  if (!isLegacyText(o)) return o;
  const spec = legacyTextSpec(o);
  const oldText = o.text && typeof o.text === 'object' ? o.text : {};
  const {opacity, ...text} = spec;
  const nextText: any = {...oldText, ...text};
  if ('text' in nextText) nextText.text = text.content;
  if ('value' in nextText) nextText.value = text.content;
  return {...o, type: 'text', subs: Array.isArray(o.subs) ? o.subs : [],
    opacity, text: nextText};
}

export function normalizeTextDocument(doc) {
  if (!doc?.objects?.some(isLegacyText)) return doc;
  return {...doc, objects: doc.objects.map(normalizeTextObject)};
}

export function mergeLegacyTextObjects(doc, original) {
  const legacy = (original?.objects || []).flatMap((o, index) => isLegacyText(o) ? [{o, index}] : []);
  if (!legacy.length) return doc;
  const ids = new Set(doc.objects.map(o => o.id));
  const objects = [...doc.objects];
  for (const {o, index} of legacy) {
    if (ids.has(o.id)) continue;
    objects.splice(Math.min(index, objects.length), 0, o);
  }
  return {...doc, objects};
}

export function legacyTextBounds(o) {
  const text = legacyTextSpec(o);
  if (!text || (!text.content && !(text.width > 0 && text.height > 0))) return null;
  const display = applyTextCase(text.content, text.textCase);
  const rawLines = display.split(/\r?\n/);
  let width = text.width > 0 ? text.width : 1;
  if (!(text.width > 0)) {
    for (const line of rawLines) {
      width = Math.max(width, textWidthOf(line, text.fontSize, text.letterSpacing));
    }
  }
  const left = text.textAnchor === 'middle' ? text.x - width / 2 : text.textAnchor === 'end' ? text.x - width : text.x;
  const top = text.y - text.fontSize;
  if (text.resizing === 'fixed' && text.height > 0) {
    return [left, top, left + width, top + text.height];
  }
  // Tinggi dihitung dari baris VISUAL, bukan jumlah \n: teks dengan lebar kotak
  // tetap (autoHeight) dibungkus renderer menjadi beberapa baris, dan bounds
  // lama yang hanya menghitung \n membuat selection box / inspector H / tinggi
  // overlay hanya setinggi 1 baris meski teks ter-render 3 baris.
  let visualLines = 0;
  for (const p of rawLines) visualLines += wrapLineCount(p, text.width > 0 ? text.width : 0, text.fontSize, text.letterSpacing);
  const lineSpan = (visualLines - 1) * text.fontSize * text.lineHeight + Math.max(0, rawLines.length - 1) * (text.paragraphSpacing || 0);
  const bottom = text.height > 0 ? top + text.height : text.y + lineSpan + text.fontSize * 0.25;
  return [left, top, left + width, bottom];
}

// Lebar per karakter (fraksi em) — satu model lebar untuk pengukuran autoWidth
// maupun penghitungan baris wrap, supaya keduanya konsisten. Nilai rata-rata
// sans-serif (IBM Plex Sans dkk.); CJK/emoji dihitung 1em. Ini heuristik:
// font display yang sangat lebar bisa membuat bounds ~1 baris lebih pendek
// dari render; font sempit membuat bounds sedikit lebih tinggi. Jauh lebih
// dekat ke renderer daripada flat 0,65em/karakter (yang membuat "sasas" 5
// huruf dihitung 104 px padahal render nyatanya ~90 px, sehingga wrap
// dihitung 3 baris padahal render 2 baris).
function charWidthEm(ch) {
  const code = ch.codePointAt(0);
  if (code >= 0x2E80 && code <= 0x9FFF || code >= 0xF900 && code <= 0xFAFF ||
      code >= 0xFF00 && code <= 0xFFEF || code >= 0x20000 && code <= 0x2FA1F ||
      code >= 0x1F300 && code <= 0x1FAFF) return 1;
  switch (ch) {
    case ' ': return 0.3;
    case 'i': case 'l': case 'j': case 't': case 'f': case 'I':
    case '.': case ',': case ':': case ';': case '\'': case '!': case '|':
    case '(': case ')': case '[': case ']': return 0.32;
    case 'r': return 0.38;
    case 'a': case 'c': case 'e': case 'o': case 'n': case 's': case 'u':
    case 'v': case 'x': case 'z': return 0.56;
    case 'b': case 'd': case 'g': case 'h': case 'k': case 'p': case 'q':
    case 'y': case '0': case '1': case '2': case '3': case '4': case '5':
    case '6': case '7': case '8': case '9': return 0.58;
    case 'm': case 'w': return 0.88;
    case 'M': return 0.9;
    case 'W': return 0.96;
    default:
      if (ch >= 'A' && ch <= 'Z') return 0.7;
      return 0.62;
  }
}

function textWidthOf(str, fontSize, letterSpacing) {
  let w = 0;
  for (const ch of str) w += charWidthEm(ch) * fontSize;
  return w + Math.max(0, str.length - 1) * letterSpacing;
}

// Jumlah baris visual sebuah paragraf bila dibungkus ke maxWidth (> 0).
// Tanpa lebar tetap tidak ada wrap (autoWidth) -> 1 baris. Kata dibungkus per
// kata (spasi); kata yang lebih panjang dari maxWidth dipecah per karakter —
// sama seperti word-wrap renderer (SkParagraph). Rangkaian spasi dihitung
// sebagai satu spasi untuk keperluan wrap.
function wrapLineCount(paragraph, maxWidth, fontSize, letterSpacing) {
  if (!(maxWidth > 0)) return 1;
  if (paragraph.length === 0) return 1;
  const words = paragraph.split(' ').filter(w => w.length > 0);
  if (words.length === 0) return 1;
  const spaceW = textWidthOf(' ', fontSize, letterSpacing);
  let lines = 1;
  let cur = 0;
  for (const word of words) {
    let rest = word;
    while (rest.length > 0) {
      const wordW = textWidthOf(rest, fontSize, letterSpacing);
      const need = cur === 0 ? wordW : cur + spaceW + wordW;
      if (need <= maxWidth + 1e-9) {
        cur = need;
        rest = '';
        break;
      }
      if (cur === 0) {
        // Kata (atau sisanya) tidak muat di baris kosong: isi baris dengan
        // karakter sebanyak yang muat, sisanya lanjut ke baris berikut.
        let take = 0;
        while (take < rest.length && textWidthOf(rest.slice(0, take + 1), fontSize, letterSpacing) <= maxWidth + 1e-9) take++;
        if (take === 0) take = 1; // satu karakter pun tidak muat: paksa 1 karakter/baris
        cur = textWidthOf(rest.slice(0, take), fontSize, letterSpacing);
        rest = rest.slice(take);
        if (rest.length > 0) {
          lines++;
          cur = 0;
        }
      } else {
        lines++;
        cur = 0;
      }
    }
  }
  return lines;
}
