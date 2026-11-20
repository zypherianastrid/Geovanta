/**
 * @file src/utils/securityUtils.ts
 * @description Keamanan aplikasi: sanitasi SVG, mitigasi prototype pollution, dan batas ukuran file
 */

export const MAX_ALLOWED_FILE_SIZE_BYTES = 32 * 1024 * 1024; // 32 Megabytes

/**
 * Validasi batas ukuran file atau buffer.
 */
export function isFileSizeWithinLimit(fileOrSize: File | number, maxMb: number = 32): boolean {
  const maxBytes = maxMb * 1024 * 1024;
  const size = typeof fileOrSize === 'number' ? fileOrSize : fileOrSize?.size;
  if (typeof size !== 'number' || Number.isNaN(size) || size < 0) return false;
  return size <= maxBytes;
}

/**
 * JSON parser dengan proteksi prototype pollution.
 * Menghapus kunci yang berbahaya (__proto__, constructor, prototype).
 */
export function safeJsonParse<T = any>(text: string, fallback: T = null as unknown as T): T {
  if (typeof text !== 'string' || !text.trim()) return fallback;
  try {
    return JSON.parse(text, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
  } catch {
    return fallback;
  }
}

/**
 * Sanitasi string SVG sebelum diparsing ke DOM:
 * 1. Menghapus tag berbahaya: <script>, <foreignObject>, <iframe>, <object>, <embed>
 * 2. Menghapus semua handler event on* (onload, onclick, onerror, dll)
 * 3. Menghapus skema javascript: atau vbscript: pada atribut
 */
export function sanitizeSvgString(svg: string): string {
  if (typeof svg !== 'string') return '';

  let sanitized = svg;

  // 1. Hapus tag <script>...</script> beserta isinya (case insensitive, multiline)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Tag script mandiri / self-closing
  sanitized = sanitized.replace(/<script\b[^>]*\/>/gi, '');

  // 2. Hapus tag <foreignObject>...</foreignObject> beserta isinya
  sanitized = sanitized.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
  sanitized = sanitized.replace(/<foreignObject\b[^>]*\/>/gi, '');

  // 3. Hapus <iframe>, <object>, <embed>
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^>]*\/>/gi, '');

  // 4. Hapus atribut handler event inline: on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)
  sanitized = sanitized.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 5. Hapus javascript: atau vbscript: pada href / xlink:href / src
  sanitized = sanitized.replace(/(href|xlink:href|src)\s*=\s*["']\s*(?:javascript|vbscript):[^"']*["']/gi, '$1=""');

  return sanitized;
}
