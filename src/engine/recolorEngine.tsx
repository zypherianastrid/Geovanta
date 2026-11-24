/**
 * @file src/engine/recolorEngine.tsx
 * @description Recolor engine (Task 6): pengelompokan keluarga hue,
 * Shift Hue (delta seragam, keputusan user 1A) dan Palette Mapping.
 * Murni: tidak memutasi doc input; tidak ada React, tidak ada akses
 * document/window. Memakai mapDocumentColors (Task 1) sehingga aturan
 * unlink (keputusan user 2B) berlaku otomatis dan cakupan warnanya SAMA
 * dengan Task 1 (fill, stroke, stop gradien fill+stroke, fill teks,
 * background frame); locked/hidden dilewati.
 *
 * Ruling O (mengikat, adjudikasi controller 2026-11-13): hue untuk family
 * + keanggotaan hueRange = HSL (hex2hsl), BUKAN OKLCH — ekspektasi numerik
 * plan Step 1/6 hanya lolos di HSL. OKLCH dipakai untuk gate akromatik
 * (chroma < 0,03 → gray, Ruling G) dan urutan terang→gelap (L OKLCH
 * menurun). Array nama keluarga diperbaiki Ruling O agar indeks 7 = 'blue'.
 */
import { cssToHex } from '../utils/colorParserAndFormatter.tsx';
import { hex2hsl, hsl2hex, oklchHue, clampN } from '../utils/colorMath.tsx';
import { mapDocumentColors } from './colorWalk.tsx';

/* Nama keluarga per bucket hue HSL 30° (indeks = floor(h / 30)).
   Ruling O: indeks 7 = 'blue' (210–240°), indeks 4 = 'green',
   indeks 11 = 'rose'. */
const FAMILY_NAMES = ['red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'magenta', 'rose'];
/* Ambang akromatik OKLCH (Ruling G — sama dengan keluarga gray). */
const GRAY_CHROMA_MAX = 0.03;

function isGrayHex(hex) {
  return oklchHue(hex).c < GRAY_CHROMA_MAX;
}

/* Keluarga + indeks bucket dari satu hex: gray bila akromatik (indeks -1),
   selain itu bucket hue HSL. */
function familyIndexOfHex(hex) {
  if (isGrayHex(hex)) return { family: 'gray', index: -1 };
  const [h] = hex2hsl(hex);
  const index = Math.min(FAMILY_NAMES.length - 1, Math.max(0, Math.floor(h / 30)));
  return { family: FAMILY_NAMES[index], index };
}

/* Nama keluarga satu hex ('gray' untuk akromatik). */
function familyOfHex(hex) {
  return familyIndexOfHex(hex).family;
}

/* Kelompokkan entri collectDocumentColors per keluarga hue.
   Mengembalikan [{ family, hueCenter, colors }] — family = string nama
   (kunci familyTargets di paletteMapDoc); hueCenter = family*30+15
   (Ruling F; gray → null). Urutan hasil: red → rose (urutan array),
   gray terakhir. Tiap keluarga terurut terang→gelap (L OKLCH menurun). */
function hueFamilyGroup(colors) {
  const groups = new Map();
  for (const entry of colors || []) {
    const hex = typeof entry === 'string' ? entry : entry.hex;
    if (!hex) continue;
    const { family, index } = familyIndexOfHex(hex);
    let g = groups.get(family);
    if (!g) {
      g = { family, hueCenter: family === 'gray' ? null : index * 30 + 15, colors: [] };
      groups.set(family, g);
    }
    g.colors.push(entry);
  }
  const out = [...groups.values()];
  out.forEach(g => g.colors.sort((a, b) => oklchHue(typeof b === 'string' ? b : b.hex).l - oklchHue(typeof a === 'string' ? a : a.hex).l));
  out.sort((a, b) => {
    if (a.family === 'gray') return 1;
    if (b.family === 'gray') return -1;
    return FAMILY_NAMES.indexOf(a.family) - FAMILY_NAMES.indexOf(b.family);
  });
  return out;
}

/* Keanggotaan hue dalam rentang [min, max]; bila min > max berlaku wrap
   (h >= min || h <= max) — Review Focus 4. Batas inklusif di kedua ujung. */
function inHueRange(h, range) {
  const [min, max] = range;
  if (min > max) return h >= min || h <= max;
  return h >= min && h <= max;
}

/* Shift Hue (Mode 1, keputusan user 1A: delta SERAGAM). h' = (h + deltaHue)
   mod 360; s' = clamp(s * satMul, 0, 1); l' = clamp(l * lightMul, 0, 1)
   (HSL, via hex2hsl/hsl2hex). Hanya warna yang hue HSL-nya masuk hueRange
   yang digeser (Ruling O); warna akromatik dilewati (Ruling G) meskipun
   hue HSL-nya masuk rentang. hueRange default [0, 360] = semua hue.
   Mengembalikan { doc, changed, unlinked } dari mapDocumentColors —
   changed/unlinked dihitung PER SLOT (Ruling K). */
function shiftHueDoc(doc, opts: Record<string, any> = {}) {
  const deltaHue = Number.isFinite(opts.deltaHue) ? opts.deltaHue : 0;
  const satMul = Number.isFinite(opts.satMul) ? opts.satMul : 1;
  const lightMul = Number.isFinite(opts.lightMul) ? opts.lightMul : 1;
  const hueRange = Array.isArray(opts.hueRange) && opts.hueRange.length === 2 ? opts.hueRange : [0, 360];
  const cache = new Map<string, string | null>();
  const fn = slot => {
    const key = slot.hex;
    if (cache.has(key)) return cache.get(key);
    let out: string | null = null;
    if (!isGrayHex(key)) {
      const [h, s, l] = hex2hsl(key);
      if (inHueRange(h, hueRange)) {
        const h2 = (((h + deltaHue) % 360) + 360) % 360;
        out = hsl2hex(h2, clampN(s * satMul, 0, 1), clampN(l * lightMul, 0, 1));
      }
    }
    cache.set(key, out);
    return out;
  };
  return mapDocumentColors(doc, fn, opts.scope);
}

/* Palette Mapping (Mode 2). familyTargets: { [family]: hexTarget } —
   tiap warna dalam keluarga dipetakan ke hue HSL target DENGAN S dan L
   warna asal dipertahankan (urutan terang→gelap dipertahankan).
   overrides: { [hexAsalLowercase]: hexTarget } menimpa per warna dengan
   pemetaan penuh (hue+S+L dari hex target). Keluarga yang tidak ada di
   familyTargets TIDAK berubah. Mengembalikan { doc, changed, unlinked }
   dari mapDocumentColors (per-slot, Ruling K). */
function paletteMapDoc(doc, opts: Record<string, any> = {}) {
  const familyTargets = opts.familyTargets || {};
  const overrides = {};
  for (const [k, v] of Object.entries(opts.overrides || {})) {
    overrides[cssToHex(k)] = cssToHex(v);
  }
  const targetHue = {};
  for (const [fam, hex] of Object.entries(familyTargets)) {
    targetHue[fam] = hex2hsl(cssToHex(hex))[0];
  }
  const cache = new Map<string, string | null>();
  const fn = slot => {
    const key = slot.hex;
    if (cache.has(key)) return cache.get(key);
    let out: string | null = null;
    const over = overrides[key];
    if (over) {
      out = over;
    } else {
      const fam = familyOfHex(key);
      if (fam in targetHue) {
        const [, s, l] = hex2hsl(key);
        out = hsl2hex(targetHue[fam], s, l);
      }
    }
    cache.set(key, out);
    return out;
  };
  return mapDocumentColors(doc, fn, opts.scope);
}

export { FAMILY_NAMES, familyOfHex, hueFamilyGroup, shiftHueDoc, paletteMapDoc };
