/**
 * @file src/engine/textOnPathEngine.ts
 * @description Text on Path attachment, Rich Text Spans, and List/OpenType formatting helpers.
 */
import { serializePath } from './svgPathSerializer.tsx';

export interface RichTextSpan {
  start: number;
  end: number;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  fontSize?: number;
  textDecoration?: string;
}

export function attachTextToPathDoc(
  doc: any,
  textId: string,
  pathId: string,
  opts: { startOffset?: number; flipSide?: boolean } = {}
): { doc: any; changed: boolean } {
  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const pathObj = objects.find(o => o.id === pathId && o.subs && o.subs.length);
  const textObj = objects.find(o => o.id === textId && (o.type === 'text' || o.text));
  if (!pathObj || !textObj) return { doc, changed: false };

  const pathD = serializePath(pathObj, 0, 0);
  const nextObjects = objects.map(o =>
    o.id === textId
      ? {
          ...o,
          textOnPath: {
            pathId,
            pathD,
            startOffset: Number(opts.startOffset) || 0,
            flipSide: Boolean(opts.flipSide),
          },
        }
      : o
  );
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}

export function applyRichTextSpanDoc(
  doc: any,
  textId: string,
  span: RichTextSpan
): { doc: any; changed: boolean } {
  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const idx = objects.findIndex(o => o.id === textId && (o.type === 'text' || o.text));
  if (idx === -1) return { doc, changed: false };
  const o = objects[idx];
  const prevSpans: RichTextSpan[] = Array.isArray(o.text?.richSpans) ? o.text.richSpans : [];
  const nextObj = {
    ...o,
    text: {
      ...(o.text || {}),
      richSpans: [...prevSpans, { ...span }],
    },
  };
  const nextObjects = objects.slice();
  nextObjects[idx] = nextObj;
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}

export function formatListTextContent(content: string, listStyle?: string): string {
  if (!listStyle || listStyle === 'none') return content;
  const lines = String(content || '').split(/\r?\n/);
  return lines
    .map((line, i) => (listStyle === 'bullet' ? `• ${line}` : listStyle === 'numbered' ? `${i + 1}. ${line}` : line))
    .join('\n');
}
