/**
 * @file src/utils/colorClipboard.tsx
 * @description Utilitas salin & tempel warna solid maupun gradien untuk ColorPickerField, EditorRightInspector, dan GradientEditorPanel
 */
import React from 'react';
import { clampN } from './colorMath.tsx';
import { parseColorWithAlpha, formatColorWithAlpha, cssToHex, validColor, VCTX } from './colorParserAndFormatter.tsx';
import { gradAngleDeg, ensureGradModel, setGradAngleDeg, updateGradStops } from '../engine/gradientEngine.tsx';
import { uid, rd } from '../engine/vectorPrimitives.tsx';

export interface SolidClipboardPayload {
  kind: 'solid';
  text: string;
  color: string;
  hex: string;
  alpha: number;
  isNone: boolean;
}

export interface GradientClipboardStop {
  offset: number;
  color: string;
  op: number;
  mid: number;
}

export interface GradientClipboardPayload {
  kind: 'gradient';
  text: string;
  type: 'linear' | 'radial' | 'angular';
  angle: number;
  spread: 'pad' | 'reflect' | 'repeat';
  oklab: boolean;
  rawStops: GradientClipboardStop[];
}

export type PaintClipboardPayload = SolidClipboardPayload | GradientClipboardPayload;

const SS_KEY = 'geovanta-paint-clipboard-v1';
let _memoryPayload: PaintClipboardPayload | null = null;
let _lastSrAnnouncement = '';

function clonePayload<T extends PaintClipboardPayload>(p: T): T {
  if (p.kind === 'gradient') {
    return {
      ...p,
      rawStops: p.rawStops.map(s => ({ ...s })),
    };
  }
  return { ...p };
}

function saveBuffer(payload: PaintClipboardPayload) {
  _memoryPayload = clonePayload(payload);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SS_KEY, JSON.stringify(_memoryPayload));
    }
  } catch {
    /* Abaikan error storage (mis. private mode) */
  }
}

function loadBuffer(): PaintClipboardPayload | null {
  if (_memoryPayload) return clonePayload(_memoryPayload);
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.kind === 'solid' || parsed.kind === 'gradient')) {
          _memoryPayload = parsed;
          return clonePayload(parsed);
        }
      }
    }
  } catch {
    /* Abaikan JSON korup */
  }
  return null;
}

function legacyCopySync(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;inset-block-start:0;left:-9999px;opacity:0;pointer-events:none';
  document.body.append(field);
  field.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    field.remove();
  }
  return ok;
}

export async function writeTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return legacyCopySync(text);
    }
  }
  return legacyCopySync(text);
}

export async function readTextFromClipboard(): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }
  return null;
}

export function formatSolidCopyText(value: any, opacity?: number): string {
  const parsed = parseColorWithAlpha(value);
  const effAlpha = opacity !== undefined ? clampN(opacity, 0, 1) : parsed.a;
  if ((parsed.isNone && opacity === undefined) || effAlpha <= 0) {
    return 'none';
  }
  if (effAlpha >= 0.999) {
    return parsed.hex.toUpperCase();
  }
  return formatColorWithAlpha(parsed.hex, effAlpha);
}

export function parseSolidColorText(raw: string): SolidClipboardPayload | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'none' || lower === 'transparent') {
    return {
      kind: 'solid',
      text: 'none',
      color: 'none',
      hex: '#000000',
      alpha: 0,
      isNone: true,
    };
  }
  const candidate = /^[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(s) ? '#' + s : s;

  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(candidate) ||
      /^rgba?\(\s*[\d.]+\s*[, ]\s*[\d.]+\s*[, ]\s*[\d.]+(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i.test(candidate)) {
    const p = parseColorWithAlpha(candidate);
    if (p.isNone || p.a <= 0) {
      return {
        kind: 'solid',
        text: 'none',
        color: 'none',
        hex: '#000000',
        alpha: 0,
        isNone: true,
      };
    }
    const color = formatColorWithAlpha(p.hex, p.a);
    return {
      kind: 'solid',
      text: formatSolidCopyText(p.hex, p.a),
      color,
      hex: p.hex.toLowerCase(),
      alpha: p.a,
      isNone: false,
    };
  }

  if (typeof window !== 'undefined' && validColor(candidate)) {
    let resolved = candidate;
    if (VCTX) {
      try {
        VCTX.fillStyle = '#010203';
        VCTX.fillStyle = candidate;
        resolved = String(VCTX.fillStyle || candidate);
      } catch {
        resolved = candidate;
      }
    }
    const p = parseColorWithAlpha(resolved);
    if (p.isNone || p.a <= 0) {
      return {
        kind: 'solid',
        text: 'none',
        color: 'none',
        hex: '#000000',
        alpha: 0,
        isNone: true,
      };
    }
    const color = formatColorWithAlpha(p.hex, p.a);
    return {
      kind: 'solid',
      text: formatSolidCopyText(p.hex, p.a),
      color,
      hex: p.hex.toLowerCase(),
      alpha: p.a,
      isNone: false,
    };
  }
  return null;
}

function splitTopLevelCommas(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    else if (ch === ')' && depth > 0) depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = body.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function splitTopLevelTokens(arg: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < arg.length; i++) {
    const ch = arg[i];
    if (ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ')' && depth > 0) {
      depth--;
      cur += ch;
    } else if (/\s/.test(ch) && depth === 0) {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function parseCssAngleDeg(str: string): number | null {
  const m = /^([-+]?(?:\d*\.\d+|\d+))\s*(deg|rad|turn|grad)?$/i.exec(str.trim());
  if (!m) return null;
  const val = parseFloat(m[1]);
  if (!Number.isFinite(val)) return null;
  const unit = (m[2] || 'deg').toLowerCase();
  if (unit === 'rad') return Math.round((val * 180 / Math.PI) * 10) / 10;
  if (unit === 'turn') return Math.round((val * 360) * 10) / 10;
  if (unit === 'grad') return Math.round((val * 0.9) * 10) / 10;
  return Math.round(val * 10) / 10;
}

function parseLinearDirectionToken(arg: string): number | null {
  const s = arg.trim().toLowerCase();
  const deg = parseCssAngleDeg(s);
  if (deg !== null && /deg|rad|turn|grad$/i.test(s)) return deg;
  const dirMap: Record<string, number> = {
    'to right': 0,
    'to bottom right': 45,
    'to right bottom': 45,
    'to bottom': 90,
    'to bottom left': 135,
    'to left bottom': 135,
    'to left': 180,
    'to top left': -135,
    'to left top': -135,
    'to top': -90,
    'to top right': -45,
    'to right top': -45,
  };
  return Object.hasOwn(dirMap, s) ? dirMap[s] : null;
}

function parseStopOffset(tok: string): number | null {
  const s = tok.trim();
  if (s.endsWith('%')) {
    const v = parseFloat(s.slice(0, -1));
    return Number.isFinite(v) ? clampN(v / 100, 0, 1) : null;
  }
  if (/^[-+]?(?:\d*\.\d+|\d+)$/.test(s)) {
    const v = parseFloat(s);
    if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
  }
  return null;
}

export function formatGradientCss(grad: any): string {
  if (!grad) return '';
  const src = (grad.rawStops && grad.rawStops.length >= 2) ? grad.rawStops : (grad.stops || []);
  const sorted = src.slice().sort((a: any, b: any) => (a.offset ?? 0) - (b.offset ?? 0));
  const stopParts = sorted.map((s: any) => {
    const hex = cssToHex(s.color || '#000000');
    const op = s.op == null ? 1 : clampN(s.op, 0, 1);
    const colStr = op < 0.999 ? formatColorWithAlpha(hex, op) : hex.toUpperCase();
    const pct = Math.round(clampN(s.offset ?? 0, 0, 1) * 1000) / 10;
    return `${colStr} ${pct}%`;
  });
  const stopsStr = stopParts.join(', ');
  if (grad.type === 'radial') {
    return `radial-gradient(circle, ${stopsStr})`;
  }
  if (grad.type === 'angular') {
    const ang = Math.round(gradAngleDeg(grad) * 10) / 10;
    return `conic-gradient(from ${ang}deg, ${stopsStr})`;
  }
  const ang = Math.round(gradAngleDeg(grad) * 10) / 10;
  return `linear-gradient(${ang}deg, ${stopsStr})`;
}

export function parseGradientCssText(raw: string): GradientClipboardPayload | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const cached = loadBuffer();
  if (cached && cached.kind === 'gradient' && cached.text === s) {
    return cached;
  }

  if (s.startsWith('{')) {
    try {
      const obj = JSON.parse(s);
      const stopsInput = Array.isArray(obj?.rawStops) ? obj.rawStops : Array.isArray(obj?.stops) ? obj.stops : null;
      if (stopsInput && stopsInput.length >= 2) {
        const type = obj.type === 'radial' ? 'radial' : obj.type === 'angular' ? 'angular' : 'linear';
        const rawStops: GradientClipboardStop[] = stopsInput.map((st: any, idx: number) => {
          const parsedCol = parseSolidColorText(st.color || '#000000');
          return {
            offset: clampN(Number(st.offset ?? idx / (stopsInput.length - 1)), 0, 1),
            color: parsedCol && !parsedCol.isNone ? parsedCol.hex : '#000000',
            op: st.op != null ? clampN(Number(st.op), 0, 1) : (parsedCol ? parsedCol.alpha : 1),
            mid: st.mid != null ? clampN(Number(st.mid), 0.15, 0.85) : 0.5,
          };
        });
        const angle = Number.isFinite(Number(obj.angle)) ? Number(obj.angle) : 0;
        const spread = obj.spread === 'reflect' ? 'reflect' : obj.spread === 'repeat' ? 'repeat' : 'pad';
        const oklab = obj.oklab !== false;
        return {
          kind: 'gradient',
          text: formatGradientCss({ type, angle, rawStops }),
          type,
          angle,
          spread,
          oklab,
          rawStops,
        };
      }
    } catch {
      /* Bukan JSON gradien */
    }
  }

  const m = /^(linear-gradient|radial-gradient|conic-gradient)\s*\(([\s\S]+)\)\s*;?$/i.exec(s);
  if (!m) return null;
  const fn = m[1].toLowerCase();
  const type: 'linear' | 'radial' | 'angular' = fn === 'radial-gradient' ? 'radial' : fn === 'conic-gradient' ? 'angular' : 'linear';
  const args = splitTopLevelCommas(m[2]);
  if (args.length < 2) return null;

  let angle = 0;
  let startIdx = 0;
  if (type === 'linear') {
    const dir = parseLinearDirectionToken(args[0]);
    if (dir !== null) {
      angle = dir;
      startIdx = 1;
    }
  } else if (type === 'angular') {
    const firstLower = args[0].toLowerCase();
    const fromMatch = /^from\s+([-+]?(?:\d*\.\d+|\d+)\s*(?:deg|rad|turn|grad)?)(?:\s+at\s+[\s\S]+)?$/i.exec(firstLower);
    if (fromMatch) {
      angle = parseCssAngleDeg(fromMatch[1]) ?? 0;
      startIdx = 1;
    } else if (/^at\s+/i.test(firstLower)) {
      startIdx = 1;
    }
  } else if (type === 'radial') {
    if (!parseSolidColorText(splitTopLevelTokens(args[0])[0] || '')) {
      startIdx = 1;
    }
  }

  const stopArgs = args.slice(startIdx);
  if (stopArgs.length < 2) return null;

  const parsedStops: Array<{ color: string; op: number; offset: number | null }> = [];
  for (const rawStop of stopArgs) {
    const toks = splitTopLevelTokens(rawStop);
    if (!toks.length) return null;
    const col = parseSolidColorText(toks[0]);
    if (!col) return null;
    const off = toks.length >= 2 ? parseStopOffset(toks[1]) : null;
    if (toks.length >= 2 && off === null) return null;
    parsedStops.push({
      color: col.isNone ? '#000000' : col.hex,
      op: col.isNone ? 0 : col.alpha,
      offset: off,
    });
  }

  // Isi offset kosong secara merata antar tetangga yang diketahui
  if (parsedStops[0].offset === null) parsedStops[0].offset = 0;
  if (parsedStops[parsedStops.length - 1].offset === null) parsedStops[parsedStops.length - 1].offset = 1;
  let lastKnown = 0;
  for (let i = 1; i < parsedStops.length; i++) {
    if (parsedStops[i].offset !== null) {
      const span = i - lastKnown;
      if (span > 1) {
        const aOff = parsedStops[lastKnown].offset as number;
        const bOff = parsedStops[i].offset as number;
        for (let k = 1; k < span; k++) {
          parsedStops[lastKnown + k].offset = rd(aOff + (bOff - aOff) * (k / span));
        }
      }
      lastKnown = i;
    }
  }

  const rawStops: GradientClipboardStop[] = parsedStops.map(st => ({
    offset: clampN(st.offset ?? 0, 0, 1),
    color: st.color,
    op: st.op,
    mid: 0.5,
  }));

  return {
    kind: 'gradient',
    text: s,
    type,
    angle,
    spread: 'pad',
    oklab: true,
    rawStops,
  };
}

export async function copySolidPaint(value: any, opacity?: number): Promise<{ ok: boolean; text: string; payload: SolidClipboardPayload }> {
  const text = formatSolidCopyText(value, opacity);
  const parsed = parseColorWithAlpha(value);
  const effAlpha = opacity !== undefined ? clampN(opacity, 0, 1) : parsed.a;
  const isNone = (parsed.isNone && opacity === undefined) || effAlpha <= 0;
  const payload: SolidClipboardPayload = {
    kind: 'solid',
    text,
    color: isNone ? 'none' : formatColorWithAlpha(parsed.hex, effAlpha),
    hex: isNone ? '#000000' : parsed.hex.toLowerCase(),
    alpha: isNone ? 0 : effAlpha,
    isNone,
  };
  saveBuffer(payload);
  const ok = await writeTextToClipboard(text);
  return { ok, text, payload };
}

export async function copyGradientPaint(grad: any): Promise<{ ok: boolean; text: string; payload: GradientClipboardPayload } | null> {
  if (!grad) return null;
  const srcStops = (grad.rawStops && grad.rawStops.length >= 2) ? grad.rawStops : (grad.stops || []);
  if (srcStops.length < 2) return null;
  const type: 'linear' | 'radial' | 'angular' = grad.type === 'radial' ? 'radial' : grad.type === 'angular' ? 'angular' : 'linear';
  const angle = gradAngleDeg(grad);
  const spread: 'pad' | 'reflect' | 'repeat' = grad.spread === 'reflect' ? 'reflect' : grad.spread === 'repeat' ? 'repeat' : 'pad';
  const oklab = grad.oklab !== false;
  const rawStops: GradientClipboardStop[] = srcStops
    .slice()
    .sort((a: any, b: any) => (a.offset ?? 0) - (b.offset ?? 0))
    .map((s: any) => ({
      offset: clampN(s.offset ?? 0, 0, 1),
      color: cssToHex(s.color || '#000000'),
      op: s.op == null ? 1 : clampN(s.op, 0, 1),
      mid: s.mid == null ? 0.5 : clampN(s.mid, 0.15, 0.85),
    }));
  const text = formatGradientCss({ type, angle, rawStops });
  const payload: GradientClipboardPayload = {
    kind: 'gradient',
    text,
    type,
    angle,
    spread,
    oklab,
    rawStops,
  };
  saveBuffer(payload);
  const ok = await writeTextToClipboard(text);
  return { ok, text, payload };
}

export async function readPaintClipboard(accept: 'solid' | 'gradient' | 'any' = 'any'): Promise<PaintClipboardPayload | null> {
  const sysText = await readTextFromClipboard();
  const buf = loadBuffer();
  if (sysText !== null) {
    const trimmed = sysText.trim();
    if (trimmed) {
      if (buf && buf.text === trimmed && (accept === 'any' || buf.kind === accept)) {
        return buf;
      }
      if (accept === 'gradient' || accept === 'any') {
        const g = parseGradientCssText(trimmed);
        if (g) return g;
      }
      if (accept === 'solid' || accept === 'any') {
        const s = parseSolidColorText(trimmed);
        if (s) return s;
      }
      return null;
    }
  }
  if (buf && (accept === 'any' || buf.kind === accept)) {
    return buf;
  }
  return null;
}

export function applyGradientPayloadToObj(obj: any, payload: GradientClipboardPayload, slot: 'fill' | 'stroke' = 'fill'): any {
  if (!obj || obj.img || !payload || !payload.rawStops || payload.rawStops.length < 2) return obj;
  const isStroke = slot === 'stroke';
  let next = ensureGradModel(obj, payload.type, slot);
  if ((payload.type === 'linear' || payload.type === 'angular') && typeof payload.angle === 'number' && Number.isFinite(payload.angle)) {
    next = setGradAngleDeg(next, payload.angle, slot);
  }
  const clonedStops = payload.rawStops.map(s => ({
    id: uid(),
    offset: clampN(s.offset ?? 0, 0, 1),
    color: s.color,
    op: s.op == null ? 1 : clampN(s.op, 0, 1),
    mid: s.mid == null ? 0.5 : clampN(s.mid, 0.15, 0.85),
  }));
  next = updateGradStops(next, clonedStops, {
    spread: payload.spread || 'pad',
    oklab: payload.oklab !== false,
  }, slot);
  if (!isStroke && next.type === 'text' && next.text) {
    next = { ...next, text: { ...next.text, fill: next.fill } };
  }
  if (isStroke && !(next.strokeWidth > 0)) {
    next = { ...next, strokeWidth: 2 };
  }
  const styleKey = isStroke ? 'strokeStyleId' : 'fillStyleId';
  if (next[styleKey]) {
    const c = { ...next };
    delete c[styleKey];
    return c;
  }
  return next;
}

export function useCopyFeedback(timeoutMs = 1600) {
  const [status, setStatus] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const [liveMsg, setLiveMsg] = React.useState('');
  const timerRef = React.useRef<number>(0);

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const trigger = React.useCallback((ok: boolean, copiedLabel = 'Copied', failedLabel = 'Copy failed') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus(ok ? 'copied' : 'failed');
    let msg = ok ? copiedLabel : failedLabel;
    if (msg === _lastSrAnnouncement) msg += '\u00A0';
    _lastSrAnnouncement = msg;
    setLiveMsg('');
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setLiveMsg(msg));
    } else {
      setLiveMsg(msg);
    }
    timerRef.current = window.setTimeout(() => {
      setStatus('idle');
      setLiveMsg('');
    }, timeoutMs);
  }, [timeoutMs]);

  return { status, liveMsg, trigger };
}
