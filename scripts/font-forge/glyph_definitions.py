"""
Complete neo-grotesque rounded glyph definitions & kerning pairs for Geovanta Sans v2.
Designed with grounded baselines/cap-heights, optical bowl/stem contrast,
double-story 'a', open apertures, and selective corner filleting.
"""
from __future__ import annotations

import math
from typing import Dict, List, Tuple

import pathops

from glyph_engine import FontParams, GlyphBuilder, KAPPA_CIRCLE


CODEPOINT_NAMES: Dict[int, str] = {
    0x0020: "space",
    0x00A0: "uni00A0",
    0x0021: "exclam",
    0x0022: "quotedbl",
    0x0023: "numbersign",
    0x0024: "dollar",
    0x0025: "percent",
    0x0026: "ampersand",
    0x0027: "quotesingle",
    0x0028: "parenleft",
    0x0029: "parenright",
    0x002A: "asterisk",
    0x002B: "plus",
    0x002C: "comma",
    0x002D: "hyphen",
    0x002E: "period",
    0x002F: "slash",
    0x0030: "zero",
    0x0031: "one",
    0x0032: "two",
    0x0033: "three",
    0x0034: "four",
    0x0035: "five",
    0x0036: "six",
    0x0037: "seven",
    0x0038: "eight",
    0x0039: "nine",
    0x003A: "colon",
    0x003B: "semicolon",
    0x003C: "less",
    0x003D: "equal",
    0x003E: "greater",
    0x003F: "question",
    0x0040: "at",
    0x005B: "bracketleft",
    0x005C: "backslash",
    0x005D: "bracketright",
    0x005E: "asciicircum",
    0x005F: "underscore",
    0x0060: "grave",
    0x007B: "braceleft",
    0x007C: "bar",
    0x007D: "braceright",
    0x007E: "asciitilde",
    0x2026: "ellipsis",
    0x2013: "endash",
    0x2014: "emdash",
    0x2018: "quoteleft",
    0x2019: "quoteright",
    0x201C: "quotedblleft",
    0x201D: "quotedblright",
    0x2022: "bullet",
    0x00B7: "periodcentered",
    0x00B0: "degree",
    0x00D7: "multiply",
    0x00F7: "divide",
    0x00B1: "plusminus",
    0x00A9: "copyright",
    0x00AE: "registered",
    0x2122: "trademark",
    0x20AC: "Euro",
    0x00A3: "sterling",
    0x00A5: "yen",
    0x2192: "arrowright",
    0x2190: "arrowleft",
    0x2191: "arrowup",
    0x2193: "arrowdown",
    0x2713: "uni2713",
}

for _cp in range(ord("A"), ord("Z") + 1):
    CODEPOINT_NAMES[_cp] = chr(_cp)
for _cp in range(ord("a"), ord("z") + 1):
    CODEPOINT_NAMES[_cp] = chr(_cp)

LATIN1_MAP: Dict[int, Tuple[str, str, str]] = {
    0x00C0: ("Agrave", "A", "grave"),
    0x00C1: ("Aacute", "A", "acute"),
    0x00C2: ("Acircumflex", "A", "circumflex"),
    0x00C3: ("Atilde", "A", "tilde"),
    0x00C4: ("Adieresis", "A", "dieresis"),
    0x00C5: ("Aring", "A", "ring"),
    0x00C7: ("Ccedilla", "C", "cedilla"),
    0x00C8: ("Egrave", "E", "grave"),
    0x00C9: ("Eacute", "E", "acute"),
    0x00CA: ("Ecircumflex", "E", "circumflex"),
    0x00CB: ("Edieresis", "E", "dieresis"),
    0x00CC: ("Igrave", "I", "grave"),
    0x00CD: ("Iacute", "I", "acute"),
    0x00CE: ("Icircumflex", "I", "circumflex"),
    0x00CF: ("Idieresis", "I", "dieresis"),
    0x00D1: ("Ntilde", "N", "tilde"),
    0x00D2: ("Ograve", "O", "grave"),
    0x00D3: ("Oacute", "O", "acute"),
    0x00D4: ("Ocircumflex", "O", "circumflex"),
    0x00D5: ("Otilde", "O", "tilde"),
    0x00D6: ("Odieresis", "O", "dieresis"),
    0x00D8: ("Oslash", "O", "slash"),
    0x00D9: ("Ugrave", "U", "grave"),
    0x00DA: ("Uacute", "U", "acute"),
    0x00DB: ("Ucircumflex", "U", "circumflex"),
    0x00DC: ("Udieresis", "U", "dieresis"),
    0x00DD: ("Yacute", "Y", "acute"),
    0x00E0: ("agrave", "a", "grave"),
    0x00E1: ("aacute", "a", "acute"),
    0x00E2: ("acircumflex", "a", "circumflex"),
    0x00E3: ("atilde", "a", "tilde"),
    0x00E4: ("adieresis", "a", "dieresis"),
    0x00E5: ("aring", "a", "ring"),
    0x00E7: ("ccedilla", "c", "cedilla"),
    0x00E8: ("egrave", "e", "grave"),
    0x00E9: ("eacute", "e", "acute"),
    0x00EA: ("ecircumflex", "e", "circumflex"),
    0x00EB: ("edieresis", "e", "dieresis"),
    0x00EC: ("igrave", "dotlessi", "grave"),
    0x00ED: ("iacute", "dotlessi", "acute"),
    0x00EE: ("icircumflex", "dotlessi", "circumflex"),
    0x00EF: ("idieresis", "dotlessi", "dieresis"),
    0x00F1: ("ntilde", "n", "tilde"),
    0x00F2: ("ograve", "o", "grave"),
    0x00F3: ("oacute", "o", "acute"),
    0x00F4: ("ocircumflex", "o", "circumflex"),
    0x00F5: ("otilde", "o", "tilde"),
    0x00F6: ("odieresis", "o", "dieresis"),
    0x00F8: ("oslash", "o", "slash"),
    0x00F9: ("ugrave", "u", "grave"),
    0x00FA: ("uacute", "u", "acute"),
    0x00FB: ("ucircumflex", "u", "circumflex"),
    0x00FC: ("udieresis", "u", "dieresis"),
    0x00FD: ("yacute", "y", "acute"),
    0x00FF: ("ydieresis", "y", "dieresis"),
}

for _cp, (_gname, _, _) in LATIN1_MAP.items():
    CODEPOINT_NAMES[_cp] = _gname


def _bw(p: FontParams, base_w: float, factor: float = 0.55) -> float:
    return round(base_w + (p.stem - 90.0) * factor)


def _draw_accent(g: GlyphBuilder, accent: str, cx: float, base_top: float) -> None:
    p = g.p
    sw = max(46.0, p.stem * 0.62)
    y0 = base_top + 64.0
    if accent == "acute":
        g.poly([(cx - 42, y0), (cx + 22, y0), (cx + 76, y0 + 114), (cx - 6, y0 + 114)])
    elif accent == "grave":
        g.poly([(cx - 22, y0), (cx + 42, y0), (cx + 6, y0 + 114), (cx - 76, y0 + 114)])
    elif accent == "circumflex":
        g.poly([(cx - 98, y0), (cx - 42, y0), (cx + 12, y0 + 106), (cx - 28, y0 + 106)])
        g.poly([(cx + 42, y0), (cx + 98, y0), (cx + 28, y0 + 106), (cx - 12, y0 + 106)])
    elif accent == "dieresis":
        dr = max(34.0, p.stem * 0.44)
        g.dot(cx - 72, y0 + 46, dr)
        g.dot(cx + 72, y0 + 46, dr)
    elif accent == "tilde":
        g.spline(
            [
                ((cx - 104, y0 + 24), (cx - 34, y0 + 96), (cx + 34, y0 - 10), (cx + 104, y0 + 58)),
            ],
            sw * 0.80,
            sw * 0.72,
        )
    elif accent == "ring":
        g.ring(cx, y0 + 62, 68, 68, sw * 0.68, sw * 0.68, KAPPA_CIRCLE)
    elif accent == "cedilla":
        g.arc(cx + 4, -84, 54, 54, 95, -145, sw * 0.74, sw * 0.68)


def _build_base_glyph(p: FontParams, name: str) -> Tuple[float, pathops.Path | None]:
    st = p.stem
    hb = p.hbar
    cap = p.cap
    xh = p.xh
    desc = p.desc
    ov = p.overshoot
    sb = p.sb
    asc_top = 758.0

    def make(adv: float, round_corners: bool = True) -> GlyphBuilder:
        return GlyphBuilder(p, adv, round_corners=round_corners)

    if name in ("space", "uni00A0"):
        return (255.0 if not p.is_bold else 272.0, pathops.Path())

    if name == ".notdef":
        adv = _bw(p, 560)
        g = make(adv)
        g.vstem(70, 0, cap, st * 0.8)
        g.vstem(adv - 70 - st * 0.8, 0, cap, st * 0.8)
        g.hstem(70, adv - 70, 0, hb * 0.8)
        g.hstem(70, adv - 70, cap - hb * 0.8, hb * 0.8)
        return (g.advance, g.build())

    # ================= UPPERCASE A-Z =================
    if name == "A":
        adv = _bw(p, 678, 0.56)
        g = make(adv)
        cx = adv * 0.5
        xl = sb - 6.0
        xr = adv - sb + 6.0
        w_leg = st * 1.02
        top_half = st * 0.56
        g.poly([(xl, 0), (xl + w_leg, 0), (cx + top_half * 0.35, cap), (cx - top_half, cap)])
        g.poly([(xr - w_leg, 0), (xr, 0), (cx + top_half, cap), (cx - top_half * 0.35, cap)])
        g.hstem(cx - (cx - xl) * 0.58, cx + (xr - cx) * 0.58, 178, hb * 0.94)
        return (g.advance, g.build())

    if name == "B":
        adv = _bw(p, 652, 0.58)
        g = make(adv)
        xl = sb
        y_mid = 374.0
        g.vstem(xl, 0, cap)
        g.d_bowl(xl, adv - sb - 22.0, y_mid - hb * 0.48, cap, st * 0.98, hb * 0.94)
        g.d_bowl(xl, adv - sb, 0, y_mid + hb * 0.48, st, hb * 0.96)
        return (g.advance, g.build())

    if name == "C":
        adv = _bw(p, 682, 0.50)
        g = make(adv)
        cx = adv * 0.5 + 16.0
        cy = cap * 0.5
        rx = cx - sb - st * 0.46
        ry = cap * 0.5 + ov - hb * 0.48
        g.arc(cx, cy, rx, ry, 34, 326, st, hb, cut_h0=True, cut_h1=True)
        return (g.advance, g.build())

    if name == "D":
        adv = _bw(p, 704, 0.54)
        g = make(adv)
        xl = sb
        g.vstem(xl, 0, cap)
        g.d_bowl(xl, adv - sb, 0, cap)
        return (g.advance, g.build())

    if name == "E":
        adv = _bw(p, 580, 0.46)
        g = make(adv)
        xl = sb
        xr = adv - sb
        g.vstem(xl, 0, cap)
        g.hstem(xl, xr, cap - hb)
        g.hstem(xl, xr - 36.0, 368.0 - hb * 0.5, hb * 0.94)
        g.hstem(xl, xr + 8.0, 0, hb)
        return (g.advance, g.build())

    if name == "F":
        adv = _bw(p, 550, 0.44)
        g = make(adv)
        xl = sb
        xr = adv - sb
        g.vstem(xl, 0, cap)
        g.hstem(xl, xr, cap - hb)
        g.hstem(xl, xr - 38.0, 360.0 - hb * 0.5, hb * 0.94)
        return (g.advance, g.build())

    if name == "G":
        adv = _bw(p, 728, 0.56)
        g = make(adv)
        cx = adv * 0.5 + 12.0
        cy = cap * 0.5
        rx = cx - sb - st * 0.46
        ry = cap * 0.5 + ov - hb * 0.48
        xr = adv - sb
        g.arc(cx, cy, rx, ry, 34, 342, st, hb, cut_h0=True)
        g.hstem(cx + 8.0, xr, 326.0 - hb * 0.5, hb * 0.96)
        g.vstem(xr - st * 0.96, 0, 326.0 + hb * 0.46, st * 0.96)
        return (g.advance, g.build())

    if name == "H":
        adv = _bw(p, 706, 0.56)
        g = make(adv)
        g.vstem(sb, 0, cap)
        g.vstem(adv - sb - st, 0, cap)
        g.hstem_c(sb, adv - sb, 368.0, hb * 0.96)
        return (g.advance, g.build())

    if name == "I":
        adv = _bw(p, 268, 0.45)
        g = make(adv)
        g.vstem_c(adv * 0.5, 0, cap)
        return (g.advance, g.build())

    if name == "J":
        adv = _bw(p, 512, 0.52)
        g = make(adv)
        xr = adv - sb
        y_arc = 220.0
        g.vstem(xr - st, y_arc, cap)
        g.arc(xr - 196.0, y_arc, 196.0 - st * 0.5, y_arc + ov - hb * 0.5, 0, -162, st, hb, cut_h1=True)
        return (g.advance, g.build())

    if name == "K":
        adv = _bw(p, 668, 0.56)
        g = make(adv)
        xl = sb
        xr = adv - sb
        w_d = st * 1.04
        x_join = xl + st
        g.vstem(xl, 0, cap)
        g.poly([(xr - w_d, cap), (xr, cap), (x_join + 24.0, 275.0), (x_join - 10.0, 355.0)])
        g.poly([(x_join - 4.0, 365.0), (x_join + 72.0, 412.0), (xr + 8.0, 0), (xr - w_d, 0)])
        return (g.advance, g.build())

    if name == "L":
        adv = _bw(p, 540, 0.44)
        g = make(adv)
        g.vstem(sb, 0, cap)
        g.hstem(sb, adv - sb, 0, hb)
        return (g.advance, g.build())

    if name == "M":
        adv = _bw(p, 876, 0.72)
        g = make(adv)
        xl = sb
        xr = adv - sb
        cx = adv * 0.5
        w_s = st * 0.90
        w_d = st * 0.84
        g.vstem(xl, 0, cap, w_s)
        g.vstem(xr - w_s, 0, cap, w_s)
        g.poly([(xl, cap), (xl + w_d, cap), (cx + w_d * 0.35, 36.0), (cx - w_d * 0.45, 36.0)])
        g.poly([(xr - w_d, cap), (xr, cap), (cx + w_d * 0.45, 36.0), (cx - w_d * 0.35, 36.0)])
        return (g.advance, g.build())

    if name == "N":
        adv = _bw(p, 718, 0.58)
        g = make(adv)
        xl = sb
        xr = adv - sb
        w_s = st * 0.94
        w_d = st * 0.98
        g.vstem(xl, 0, cap, w_s)
        g.vstem(xr - w_s, 0, cap, w_s)
        g.poly([(xl, cap), (xl + w_d, cap), (xr, 0), (xr - w_d, 0)])
        return (g.advance, g.build())

    if name == "O":
        adv = _bw(p, 754, 0.54)
        g = make(adv)
        cx = adv * 0.5
        g.ring(cx, cap * 0.5, cx - sb, cap * 0.5 + ov)
        return (g.advance, g.build())

    if name == "P":
        adv = _bw(p, 622, 0.54)
        g = make(adv)
        xl = sb
        g.vstem(xl, 0, cap)
        g.d_bowl(xl, adv - sb, 300.0, cap)
        return (g.advance, g.build())

    if name == "Q":
        adv = _bw(p, 754, 0.54)
        g = make(adv)
        cx = adv * 0.5
        g.ring(cx, cap * 0.5, cx - sb, cap * 0.5 + ov)
        g.poly([(cx + 68.0, 154.0), (cx + 158.0, 154.0), (adv - sb + 12.0, -56.0), (adv - sb - 74.0, -56.0)])
        return (g.advance, g.build())

    if name == "R":
        adv = _bw(p, 654, 0.56)
        g = make(adv)
        xl = sb
        xr = adv - sb
        y_mid = 318.0
        g.vstem(xl, 0, cap)
        g.d_bowl(xl, xr - 10.0, y_mid, cap)
        w_leg = st * 1.04
        g.poly([(xl + 190.0, y_mid + 34.0), (xl + 190.0 + w_leg, y_mid + 34.0), (xr + 4.0, 0), (xr + 4.0 - w_leg, 0)])
        return (g.advance, g.build())

    if name == "S":
        adv = _bw(p, 610, 0.54)
        g = make(adv)
        cx = adv * 0.5
        rx = cx - sb - st * 0.45
        top_y = cap + ov - hb * 0.48
        bot_y = -ov + hb * 0.48
        mid_y = cap * 0.525
        g.spline(
            [
                ((cx + rx * 0.88, top_y - 105.0), (cx + rx * 0.62, top_y), (cx + rx * 0.25, top_y), (cx - rx * 0.04, top_y)),
                ((cx - rx * 0.04, top_y), (cx - rx * 0.64, top_y), (cx - rx * 0.92, top_y - 68.0), (cx - rx * 0.92, mid_y + 155.0)),
                ((cx - rx * 0.92, mid_y + 155.0), (cx - rx * 0.92, mid_y + 38.0), (cx - rx * 0.34, mid_y + 24.0), (cx, mid_y)),
                ((cx, mid_y), (cx + rx * 0.38, mid_y - 22.0), (cx + rx * 0.96, mid_y - 40.0), (cx + rx * 0.96, mid_y - 158.0)),
                ((cx + rx * 0.96, mid_y - 158.0), (cx + rx * 0.96, bot_y + 60.0), (cx + rx * 0.62, bot_y), (cx + rx * 0.04, bot_y)),
                ((cx + rx * 0.04, bot_y), (cx - rx * 0.42, bot_y), (cx - rx * 0.78, bot_y + 28.0), (cx - rx * 0.94, bot_y + 108.0)),
            ],
            st * 0.96,
            hb * 0.95,
        )
        return (g.advance, g.build())

    if name == "T":
        adv = _bw(p, 594, 0.46)
        g = make(adv)
        g.vstem_c(adv * 0.5, 0, cap)
        g.hstem(sb - 8.0, adv - sb + 8.0, cap - hb, hb)
        return (g.advance, g.build())

    if name == "U":
        adv = _bw(p, 704, 0.56)
        g = make(adv)
        xl = sb
        xr = adv - sb
        cx = adv * 0.5
        y_arc = 246.0
        g.vstem(xl, y_arc, cap)
        g.vstem(xr - st, y_arc, cap)
        g.arc(cx, y_arc, (xr - xl - st) * 0.5, y_arc + ov - hb * 0.48, 180, 360)
        return (g.advance, g.build())

    if name == "V":
        adv = _bw(p, 668, 0.54)
        g = make(adv)
        cx = adv * 0.5
        xl = sb - 6.0
        xr = adv - sb + 6.0
        w_leg = st * 1.02
        bot_half = st * 0.56
        g.poly([(xl, cap), (xl + w_leg, cap), (cx + bot_half * 0.35, 0), (cx - bot_half, 0)])
        g.poly([(xr - w_leg, cap), (xr, cap), (cx + bot_half, 0), (cx - bot_half * 0.35, 0)])
        return (g.advance, g.build())

    if name == "W":
        adv = _bw(p, 968, 0.74)
        g = make(adv)
        xl = sb - 6.0
        xr = adv - sb + 6.0
        cx = adv * 0.5
        x_bl = (xl + cx) * 0.5 - 6.0
        x_br = (xr + cx) * 0.5 + 6.0
        w_leg = st * 0.88
        apex_h = st * 0.44
        g.poly([(xl, cap), (xl + w_leg, cap), (x_bl + apex_h * 0.4, 0), (x_bl - apex_h, 0)])
        g.poly([(x_bl - apex_h * 0.4, 0), (x_bl + apex_h, 0), (cx + apex_h * 0.72, cap - 12.0), (cx - apex_h * 0.72, cap - 12.0)])
        g.poly([(cx - apex_h * 0.72, cap - 12.0), (cx + apex_h * 0.72, cap - 12.0), (x_br + apex_h * 0.4, 0), (x_br - apex_h, 0)])
        g.poly([(x_br - apex_h * 0.4, 0), (x_br + apex_h, 0), (xr, cap), (xr - w_leg, cap)])
        return (g.advance, g.build())

    if name == "X":
        adv = _bw(p, 650, 0.52)
        g = make(adv)
        xl = sb - 2.0
        xr = adv - sb + 2.0
        w_d = st * 1.04
        g.poly([(xl, cap), (xl + w_d, cap), (xr, 0), (xr - w_d, 0)])
        g.poly([(xr - w_d, cap), (xr, cap), (xl + w_d, 0), (xl, 0)])
        return (g.advance, g.build())

    if name == "Y":
        adv = _bw(p, 628, 0.48)
        g = make(adv)
        cx = adv * 0.5
        xl = sb - 4.0
        xr = adv - sb + 4.0
        w_d = st * 1.00
        y_fork = 300.0
        g.vstem_c(cx, 0, y_fork + 40.0)
        g.poly([(xl, cap), (xl + w_d, cap), (cx + st * 0.42, y_fork), (cx - st * 0.48, y_fork)])
        g.poly([(xr - w_d, cap), (xr, cap), (cx + st * 0.48, y_fork), (cx - st * 0.42, y_fork)])
        return (g.advance, g.build())

    if name == "Z":
        adv = _bw(p, 608, 0.48)
        g = make(adv)
        xl = sb
        xr = adv - sb
        w_d = st * 1.04
        g.hstem(xl + 8.0, xr, cap - hb, hb)
        g.poly([(xr - w_d, cap), (xr, cap), (xl + w_d, 0), (xl, 0)])
        g.hstem(xl, xr - 8.0, 0, hb)
        return (g.advance, g.build())

    # ================= LOWERCASE a-z =================
    if name == "dotlessi":
        adv = _bw(p, 246, 0.45)
        g = make(adv)
        g.vstem_c(adv * 0.5, 0, xh)
        return (g.advance, g.build())

    if name == "a":
        # Classic modern double-story 'a' with smooth outer/inner arch (zero pinch in Bold)
        adv = _bw(p, 566, 0.58)
        g = make(adv)
        xr = adv - sb
        x_stem_l = xr - st * 0.94
        x_stem_c = xr - st * 0.47
        top_y = xh + ov - hb * 0.46
        x_peak = adv * 0.46
        # Top arch built cleanly with gentle curvature radius (> half stroke)
        g.spline(
            [
                ((sb + 40.0, 404.0), (sb + 66.0, top_y), (x_peak - 52.0, top_y), (x_peak, top_y)),
                ((x_peak, top_y), (x_peak + (x_stem_c - x_peak) * 0.62, top_y), (x_stem_c, top_y - 44.0), (x_stem_c, 330.0)),
            ],
            st * 0.94,
            hb * 0.92,
            steps_per_seg=24,
        )
        g.vstem(x_stem_l, 0, 350.0, st * 0.94)
        g.d_bowl(sb - 2.0, xr, -ov, 314.0, st * 0.92, hb * 0.88, left_side=True)
        return (g.advance, g.build())

    if name == "b":
        adv = _bw(p, 594, 0.56)
        g = make(adv)
        xl = sb
        g.vstem(xl, 0, asc_top)
        g.d_bowl(xl, adv - sb, -ov, xh + ov)
        return (g.advance, g.build())

    if name == "c":
        adv = _bw(p, 526, 0.48)
        g = make(adv)
        cx = adv * 0.5 + 18.0
        cy = xh * 0.5
        rx = cx - sb - st * 0.46
        ry = xh * 0.5 + ov - hb * 0.48
        g.arc(cx, cy, rx, ry, 38, 322, st, hb, cut_h0=True, cut_h1=True)
        return (g.advance, g.build())

    if name == "d":
        adv = _bw(p, 594, 0.56)
        g = make(adv)
        xr = adv - sb
        g.vstem(xr - st, 0, asc_top)
        g.d_bowl(sb, xr, -ov, xh + ov, left_side=True)
        return (g.advance, g.build())

    if name == "e":
        adv = _bw(p, 560, 0.54)
        g = make(adv)
        cx = adv * 0.5 + 2.0
        cy = xh * 0.5
        rx = cx - sb - st * 0.45
        ry = xh * 0.5 + ov - hb * 0.48
        g.arc(cx, cy, rx, ry, 2, 326, st * 0.96, hb * 0.92, cut_h0=True, cut_h1=True)
        g.hstem_c(cx - rx - 6.0, cx + rx + st * 0.45, cy + 12.0, hb * 0.86)
        return (g.advance, g.build())

    if name == "f":
        adv = _bw(p, 354, 0.48)
        g = make(adv)
        x_stem = sb + 44.0
        g.vstem(x_stem, 0, 565.0)
        g.spline(
            [
                ((x_stem + st * 0.5, 550.0), (x_stem + st * 0.5, asc_top - hb * 0.45), (x_stem + st * 0.5 + 88.0, asc_top - hb * 0.45), (adv - sb + 24.0, asc_top - hb * 0.55)),
            ],
            st,
            hb * 0.94,
        )
        g.hstem(sb - 12.0, adv - sb + 12.0, xh - hb, hb * 0.92)
        return (g.advance, g.build())

    if name == "g":
        adv = _bw(p, 588, 0.56)
        g = make(adv)
        xr = adv - sb
        g.d_bowl(sb, xr, 0.0, xh + ov, st * 0.96, hb * 0.94, left_side=True)
        g.vstem(xr - st * 0.96, -34.0, xh, st * 0.96)
        g.spline(
            [
                ((xr - st * 0.48, -24.0), (xr - st * 0.48, desc + hb * 0.48), (adv * 0.48, desc + hb * 0.48), (sb + 34.0, desc + 64.0)),
            ],
            st * 0.96,
            hb * 0.94,
        )
        return (g.advance, g.build())

    if name == "h":
        adv = _bw(p, 576, 0.56)
        g = make(adv)
        g.vstem(sb, 0, asc_top)
        g.shoulder_arch(sb + st, adv - sb, 0, xh + ov)
        return (g.advance, g.build())

    if name == "i":
        adv = _bw(p, 246, 0.45)
        g = make(adv)
        cx = adv * 0.5
        g.vstem_c(cx, 0, xh)
        g.dot(cx, xh + 120.0, st * 0.56)
        return (g.advance, g.build())

    if name == "j":
        adv = _bw(p, 256, 0.46)
        g = make(adv)
        cx = adv * 0.5 + 10.0
        g.vstem_c(cx, -54.0, xh)
        g.spline(
            [((cx, -44.0), (cx, desc + hb * 0.48), (cx - 54.0, desc + hb * 0.48), (cx - 118.0, desc + 22.0))],
            st,
            hb * 0.94,
        )
        g.dot(cx, xh + 120.0, st * 0.56)
        return (g.advance, g.build())

    if name == "k":
        adv = _bw(p, 560, 0.58)
        g = make(adv)
        xl = sb
        xr = adv - sb
        w_d = st * 0.98
        x_join = xl + st
        g.vstem(xl, 0, asc_top)
        g.poly([(xr - w_d, xh), (xr, xh), (x_join + 16.0, 186.0), (x_join - 10.0, 268.0)])
        g.poly([(x_join - 2.0, 276.0), (x_join + 56.0, 314.0), (xr + 10.0, 0), (xr - w_d, 0)])
        return (g.advance, g.build())

    if name == "l":
        adv = _bw(p, 246, 0.45)
        g = make(adv)
        g.vstem_c(adv * 0.5, 0, asc_top)
        return (g.advance, g.build())

    if name == "m":
        adv = _bw(p, 872, 0.74)
        g = make(adv)
        xl = sb
        xr = adv - sb
        xm_in = (xl + st + xr) * 0.5 - st * 0.48
        g.vstem(xl, 0, xh)
        g.shoulder_arch(xl + st, xm_in + st, 0, xh + ov)
        g.shoulder_arch(xm_in + st, xr, 0, xh + ov)
        return (g.advance, g.build())

    if name == "n":
        adv = _bw(p, 576, 0.56)
        g = make(adv)
        g.vstem(sb, 0, xh)
        g.shoulder_arch(sb + st, adv - sb, 0, xh + ov)
        return (g.advance, g.build())

    if name == "o":
        adv = _bw(p, 580, 0.52)
        g = make(adv)
        cx = adv * 0.5
        g.ring(cx, xh * 0.5, cx - sb, xh * 0.5 + ov)
        return (g.advance, g.build())

    if name == "p":
        adv = _bw(p, 594, 0.56)
        g = make(adv)
        xl = sb
        g.vstem(xl, desc + 16.0, xh)
        g.d_bowl(xl, adv - sb, -ov, xh + ov)
        return (g.advance, g.build())

    if name == "q":
        adv = _bw(p, 594, 0.56)
        g = make(adv)
        xr = adv - sb
        g.vstem(xr - st, desc + 16.0, xh)
        g.d_bowl(sb, xr, -ov, xh + ov, left_side=True)
        return (g.advance, g.build())

    if name == "r":
        adv = _bw(p, 388, 0.48)
        g = make(adv)
        xl = sb
        xr = adv - sb + 16.0
        top_y = xh + ov - hb * 0.48
        g.vstem(xl, 0, xh)
        g.spline(
            [
                ((xl + st * 0.38, xh - 105.0), (xl + st * 0.75, top_y), (xl + st + 82.0, top_y), (xr, top_y - 6.0)),
            ],
            st * 0.94,
            hb * 0.92,
        )
        return (g.advance, g.build())

    if name == "s":
        adv = _bw(p, 496, 0.52)
        g = make(adv)
        cx = adv * 0.5
        rx = cx - sb - st * 0.44
        top_y = xh + ov - hb * 0.48
        bot_y = -ov + hb * 0.48
        mid_y = xh * 0.52
        g.spline(
            [
                ((cx + rx * 0.88, top_y - 76.0), (cx + rx * 0.58, top_y), (cx + rx * 0.22, top_y), (cx - rx * 0.04, top_y)),
                ((cx - rx * 0.04, top_y), (cx - rx * 0.64, top_y), (cx - rx * 0.92, top_y - 52.0), (cx - rx * 0.92, mid_y + 112.0)),
                ((cx - rx * 0.92, mid_y + 112.0), (cx - rx * 0.92, mid_y + 28.0), (cx - rx * 0.34, mid_y + 18.0), (cx, mid_y)),
                ((cx, mid_y), (cx + rx * 0.38, mid_y - 18.0), (cx + rx * 0.96, mid_y - 30.0), (cx + rx * 0.96, mid_y - 114.0)),
                ((cx + rx * 0.96, mid_y - 114.0), (cx + rx * 0.96, bot_y + 44.0), (cx + rx * 0.62, bot_y), (cx + rx * 0.04, bot_y)),
                ((cx + rx * 0.04, bot_y), (cx - rx * 0.42, bot_y), (cx - rx * 0.78, bot_y + 22.0), (cx - rx * 0.92, bot_y + 78.0)),
            ],
            st * 0.94,
            hb * 0.90,
        )
        return (g.advance, g.build())

    if name == "t":
        adv = _bw(p, 366, 0.46)
        g = make(adv)
        x_stem = sb + 44.0
        g.vstem(x_stem, 146.0, cap - 56.0)
        g.spline(
            [
                ((x_stem + st * 0.5, 160.0), (x_stem + st * 0.5, -ov + hb * 0.48), (x_stem + st * 0.5 + 80.0, -ov + hb * 0.48), (adv - sb + 10.0, 2.0)),
            ],
            st,
            hb * 0.92,
        )
        g.hstem(sb - 12.0, adv - sb + 8.0, xh - hb, hb * 0.92)
        return (g.advance, g.build())

    if name == "u":
        adv = _bw(p, 576, 0.56)
        g = make(adv)
        xl = sb
        xr = adv - sb
        g.vstem(xr - st, 0, xh)
        # Inverted shoulder arch: left stem drops down and curves into right stem
        y_join = 185.0
        cx_bot = xl + (xr - st - xl) * 0.46
        x_left_in = xl + st
        x_right_in = xr - st
        outer = pathops.Path()
        outer.moveTo(xl, xh)
        outer.lineTo(x_left_in, xh)
        outer.lineTo(x_left_in, 160.0)
        outer.cubicTo(x_left_in, hb + 28.0, cx_bot - 42.0, hb, cx_bot, hb)
        outer.cubicTo(cx_bot + 44.0, hb, x_right_in - 2.0, hb + 26.0, x_right_in + st * 0.14, y_join - 24.0)
        outer.lineTo(x_right_in + st * 0.65, 96.0)
        outer.cubicTo(x_right_in + st * 0.12, -ov + 4.0, cx_bot + 64.0, -ov, cx_bot, -ov)
        outer.cubicTo(cx_bot - 64.0, -ov, xl, 44.0 - ov, xl, 154.0)
        outer.close()
        outer.simplify(fix_winding=True)
        g.add_path(outer)
        return (g.advance, g.build())

    if name == "v":
        adv = _bw(p, 536, 0.50)
        g = make(adv)
        cx = adv * 0.5
        xl = sb - 6.0
        xr = adv - sb + 6.0
        w_leg = st * 0.98
        bot_half = st * 0.52
        g.poly([(xl, xh), (xl + w_leg, xh), (cx + bot_half * 0.35, 0), (cx - bot_half, 0)])
        g.poly([(xr - w_leg, xh), (xr, xh), (cx + bot_half, 0), (cx - bot_half * 0.35, 0)])
        return (g.advance, g.build())

    if name == "w":
        adv = _bw(p, 782, 0.66)
        g = make(adv)
        xl = sb - 6.0
        xr = adv - sb + 6.0
        cx = adv * 0.5
        x_bl = (xl + cx) * 0.5 - 6.0
        x_br = (xr + cx) * 0.5 + 6.0
        w_leg = st * 0.94
        apex_h = st * 0.50
        g.poly([(xl, xh), (xl + w_leg, xh), (x_bl + apex_h * 0.4, 0), (x_bl - apex_h, 0)])
        g.poly([(x_bl - apex_h * 0.4, 0), (x_bl + apex_h, 0), (cx + apex_h * 0.65, xh), (cx - apex_h * 0.65, xh)])
        g.poly([(cx - apex_h * 0.65, xh), (cx + apex_h * 0.65, xh), (x_br + apex_h * 0.4, 0), (x_br - apex_h, 0)])
        g.poly([(x_br - apex_h * 0.4, 0), (x_br + apex_h, 0), (xr, xh), (xr - w_leg, xh)])
        return (g.advance, g.build())

    if name == "x":
        adv = _bw(p, 526, 0.48)
        g = make(adv)
        xl = sb - 2.0
        xr = adv - sb + 2.0
        w_d = st * 1.00
        g.poly([(xl, xh), (xl + w_d, xh), (xr, 0), (xr - w_d, 0)])
        g.poly([(xr - w_d, xh), (xr, xh), (xl + w_d, 0), (xl, 0)])
        return (g.advance, g.build())

    if name == "y":
        adv = _bw(p, 542, 0.52)
        g = make(adv)
        xl = sb - 4.0
        xr = adv - sb + 4.0
        cx = adv * 0.5
        w_leg = st * 0.94
        bot_half = st * 0.46
        g.poly([(xl, xh), (xl + w_leg, xh), (cx + bot_half * 0.45, 22.0), (cx - bot_half * 0.95, 22.0)])
        g.poly([(xr - w_leg, xh), (xr, xh), (cx + 12.0, 22.0), (cx - w_leg + 12.0, 22.0)])
        g.spline(
            [
                ((cx - w_leg * 0.35 + 6.0, 42.0), (cx - 26.0, -78.0), (cx - 64.0, desc + hb * 0.50), (sb + 14.0, desc + hb * 0.50)),
            ],
            st * 0.92,
            hb * 0.90,
        )
        return (g.advance, g.build())

    if name == "z":
        adv = _bw(p, 502, 0.46)
        g = make(adv)
        xl = sb
        xr = adv - sb
        w_d = st * 1.00
        g.hstem(xl + 6.0, xr, xh - hb, hb)
        g.poly([(xr - w_d, xh), (xr, xh), (xl + w_d, 0), (xl, 0)])
        g.hstem(xl, xr - 6.0, 0, hb)
        return (g.advance, g.build())

    # ================= NUMERALS 0-9 (tabular) =================
    num_adv = _bw(p, 596, 0.48)
    if name == "zero":
        g = make(num_adv)
        cx = num_adv * 0.5
        g.ring(cx, cap * 0.5, cx - sb - 6.0, cap * 0.5 + ov)
        return (g.advance, g.build())

    if name == "one":
        g = make(num_adv)
        cx = num_adv * 0.5 + 48.0
        g.vstem(cx - st * 0.5, 0, cap)
        # Clean neo-grotesque top flag
        g.poly([(cx - st * 0.5, cap), (cx + st * 0.42, cap), (cx - st * 0.5 - 118.0, cap - 165.0), (cx - st * 0.5 - 118.0, cap - 76.0)])
        return (g.advance, g.build())

    if name == "two":
        g = make(num_adv)
        cx = num_adv * 0.5
        xl = sb + 10.0
        xr = num_adv - sb - 10.0
        top_y = cap + ov - hb * 0.48
        g.spline(
            [
                ((xl + 16.0, 512.0), (xl + 34.0, top_y), (cx - 50.0, top_y), (cx + 12.0, top_y)),
                ((cx + 12.0, top_y), (xr - st * 0.46, top_y), (xr - st * 0.46, top_y - 76.0), (xr - st * 0.46, 512.0)),
                ((xr - st * 0.46, 512.0), (xr - st * 0.46, 390.0), (cx + 26.0, 286.0), (xl + 12.0, hb * 0.55)),
            ],
            st * 0.96,
            hb * 0.96,
        )
        g.hstem(xl, xr, 0, hb)
        return (g.advance, g.build())

    if name == "three":
        g = make(num_adv)
        cx = num_adv * 0.5 - 6.0
        xl = sb + 14.0
        xr = num_adv - sb - 12.0
        top_y = cap + ov - hb * 0.48
        bot_y = -ov + hb * 0.48
        mid_y = 380.0
        g.spline(
            [
                ((xl + 16.0, 540.0), (xl + 40.0, top_y), (cx - 28.0, top_y), (cx + 18.0, top_y)),
                ((cx + 18.0, top_y), (xr - st * 0.58, top_y), (xr - st * 0.58, top_y - 70.0), (xr - st * 0.58, 532.0)),
                ((xr - st * 0.58, 532.0), (xr - st * 0.58, 422.0), (cx + 42.0, mid_y), (cx - 32.0, mid_y)),
            ],
            st * 0.94,
            hb * 0.92,
        )
        g.spline(
            [
                ((cx - 32.0, mid_y), (cx + 46.0, mid_y), (xr - st * 0.46, mid_y - 44.0), (xr - st * 0.46, 200.0)),
                ((xr - st * 0.46, 200.0), (xr - st * 0.46, bot_y + 66.0), (xr - st * 0.46 - 24.0, bot_y), (cx + 10.0, bot_y)),
                ((cx + 10.0, bot_y), (cx - 64.0, bot_y), (xl + 16.0, bot_y + 42.0), (xl + 4.0, 148.0)),
            ],
            st * 0.96,
            hb * 0.94,
        )
        return (g.advance, g.build())

    if name == "four":
        g = make(num_adv)
        xl = sb + 2.0
        xr = num_adv - sb - 2.0
        x_stem = xr - 72.0 - st
        g.vstem(x_stem, 0, cap)
        g.hstem(xl, xr, 168.0, hb)
        g.poly([(x_stem, cap), (x_stem + st * 0.88, cap), (xl + st * 0.98, 168.0), (xl, 168.0)])
        return (g.advance, g.build())

    if name == "five":
        g = make(num_adv)
        xl = sb + 22.0
        xr = num_adv - sb - 10.0
        cx = (xl + xr) * 0.5
        bot_y = -ov + hb * 0.48
        g.hstem(xl + 14.0, xr - 16.0, cap - hb, hb)
        g.poly([(xl + 14.0, cap), (xl + 14.0 + st * 0.94, cap), (xl + st * 0.92, 388.0), (xl, 388.0)])
        g.spline(
            [
                ((xl + st * 0.46, 396.0), (cx - 20.0, 444.0), (cx + 48.0, 450.0), (cx + 68.0, 446.0)),
                ((cx + 68.0, 446.0), (xr - st * 0.46, 438.0), (xr - st * 0.46, 336.0), (xr - st * 0.46, 232.0)),
                ((xr - st * 0.46, 232.0), (xr - st * 0.46, 86.0), (xr - st * 0.46 - 40.0, bot_y), (cx, bot_y)),
                ((cx, bot_y), (cx - 72.0, bot_y), (xl + 20.0, bot_y + 46.0), (xl, 144.0)),
            ],
            st * 0.96,
            hb * 0.94,
        )
        return (g.advance, g.build())

    if name == "six":
        g = make(num_adv)
        cx = num_adv * 0.5
        cy_b = 224.0
        rx_b = cx - sb - 6.0
        ry_b = 224.0 + ov
        g.ring(cx, cy_b, rx_b, ry_b, st * 0.96, hb * 0.94)
        g.spline(
            [
                ((cx - rx_b + st * 0.46, cy_b + 30.0), (cx - rx_b + st * 0.46, 480.0), (cx - 54.0, cap + ov - hb * 0.48), (cx + 46.0, cap + ov - hb * 0.48)),
                ((cx + 46.0, cap + ov - hb * 0.48), (cx + 108.0, cap + ov - hb * 0.48), (cx + 146.0, cap - 56.0), (cx + 158.0, cap - 110.0)),
            ],
            st * 0.96,
            hb * 0.94,
        )
        return (g.advance, g.build())

    if name == "seven":
        g = make(num_adv)
        xl = sb + 12.0
        xr = num_adv - sb - 12.0
        g.hstem(xl, xr, cap - hb, hb)
        w_d = st * 1.00
        g.poly([(xr - w_d, cap), (xr, cap), (num_adv * 0.36 + w_d, 0), (num_adv * 0.36, 0)])
        return (g.advance, g.build())

    if name == "eight":
        g = make(num_adv)
        cx = num_adv * 0.5
        y_mid = 382.0
        ry_t = (cap + ov - y_mid) * 0.5
        cy_t = y_mid + ry_t
        rx_t = cx - sb - 24.0
        ry_b = (y_mid + ov) * 0.5
        cy_b = -ov + ry_b
        rx_b = cx - sb - 6.0
        sw_x = st * 0.92
        sw_y = hb * 0.90
        g.ring(cx, cy_t, rx_t, ry_t + hb * 0.44, sw_x, sw_y)
        g.ring(cx, cy_b, rx_b, ry_b + hb * 0.44, sw_x, sw_y)
        return (g.advance, g.build())

    if name == "nine":
        g = make(num_adv)
        cx = num_adv * 0.5
        cy_t = cap - 224.0
        rx_t = cx - sb - 6.0
        ry_t = 224.0 + ov
        g.ring(cx, cy_t, rx_t, ry_t, st * 0.96, hb * 0.94)
        g.spline(
            [
                ((cx + rx_t - st * 0.46, cy_t - 30.0), (cx + rx_t - st * 0.46, 240.0), (cx + 54.0, -ov + hb * 0.48), (cx - 46.0, -ov + hb * 0.48)),
                ((cx - 46.0, -ov + hb * 0.48), (cx - 108.0, -ov + hb * 0.48), (cx - 146.0, 56.0), (cx - 158.0, 110.0)),
            ],
            st * 0.96,
            hb * 0.94,
        )
        return (g.advance, g.build())

    # ================= PUNCTUATION & SYMBOLS =================
    if name == "period":
        adv = _bw(p, 246, 0.35)
        g = make(adv)
        g.dot(adv * 0.5, st * 0.58, st * 0.58)
        return (g.advance, g.build())

    if name == "comma":
        adv = _bw(p, 246, 0.35)
        g = make(adv)
        cx = adv * 0.5
        g.dot(cx + 8.0, st * 0.56, st * 0.56)
        g.spline(
            [((cx + 30.0, st * 0.54), (cx + 24.0, -4.0), (cx - 4.0, -68.0), (cx - 38.0, -108.0))],
            st * 0.62,
            hb * 0.62,
        )
        return (g.advance, g.build())

    if name == "colon":
        adv = _bw(p, 246, 0.35)
        g = make(adv)
        cx = adv * 0.5
        g.dot(cx, st * 0.58, st * 0.58)
        g.dot(cx, xh - st * 0.58, st * 0.58)
        return (g.advance, g.build())

    if name == "semicolon":
        adv = _bw(p, 246, 0.35)
        g = make(adv)
        cx = adv * 0.5
        g.dot(cx, xh - st * 0.58, st * 0.58)
        g.dot(cx + 6.0, st * 0.56, st * 0.56)
        g.spline(
            [((cx + 28.0, st * 0.54), (cx + 22.0, -4.0), (cx - 6.0, -68.0), (cx - 38.0, -108.0))],
            st * 0.62,
            hb * 0.62,
        )
        return (g.advance, g.build())

    if name == "exclam":
        adv = _bw(p, 266, 0.40)
        g = make(adv)
        cx = adv * 0.5
        g.dot(cx, st * 0.58, st * 0.58)
        g.poly([(cx - st * 0.40, 212.0), (cx + st * 0.40, 212.0), (cx + st * 0.52, cap), (cx - st * 0.52, cap)])
        return (g.advance, g.build())

    if name == "question":
        adv = _bw(p, 514, 0.46)
        g = make(adv)
        cx = adv * 0.5
        g.dot(cx, st * 0.58, st * 0.58)
        top_y = cap + ov - hb * 0.48
        g.spline(
            [
                ((sb + 48.0, 540.0), (sb + 62.0, top_y), (cx - 16.0, top_y), (cx + 16.0, top_y)),
                ((cx + 16.0, top_y), (adv - sb - 48.0, top_y), (adv - sb - 48.0, 620.0), (adv - sb - 48.0, 526.0)),
                ((adv - sb - 48.0, 526.0), (adv - sb - 48.0, 412.0), (cx, 376.0), (cx, 290.0)),
                ((cx, 290.0), (cx, 255.0), (cx, 232.0), (cx, 210.0)),
            ],
            st * 0.94,
            hb * 0.92,
        )
        return (g.advance, g.build())

    if name == "hyphen":
        adv = _bw(p, 356, 0.35)
        g = make(adv)
        g.hstem_c(sb + 8.0, adv - sb - 8.0, 298.0, hb * 0.90)
        return (g.advance, g.build())

    if name == "endash":
        adv = _bw(p, 520, 0.35)
        g = make(adv)
        g.hstem_c(sb + 4.0, adv - sb - 4.0, 298.0, hb * 0.88)
        return (g.advance, g.build())

    if name == "emdash":
        adv = _bw(p, 820, 0.35)
        g = make(adv)
        g.hstem_c(sb, adv - sb, 298.0, hb * 0.88)
        return (g.advance, g.build())

    if name == "underscore":
        adv = _bw(p, 500, 0.35)
        g = make(adv)
        g.hstem_c(16.0, adv - 16.0, -108.0, hb * 0.82)
        return (g.advance, g.build())

    if name == "ellipsis":
        adv = _bw(p, 690, 0.45)
        g = make(adv)
        dr = st * 0.56
        g.dot(adv * 0.20, dr, dr)
        g.dot(adv * 0.50, dr, dr)
        g.dot(adv * 0.80, dr, dr)
        return (g.advance, g.build())

    if name == "bullet":
        adv = _bw(p, 380, 0.40)
        g = make(adv)
        g.dot(adv * 0.5, xh * 0.52, st * 1.05)
        return (g.advance, g.build())

    if name == "periodcentered":
        adv = _bw(p, 260, 0.35)
        g = make(adv)
        g.dot(adv * 0.5, xh * 0.52, st * 0.58)
        return (g.advance, g.build())

    if name == "degree":
        adv = _bw(p, 410, 0.40)
        g = make(adv)
        g.ring(adv * 0.5, cap - 115.0, 128.0, 128.0, st * 0.65, hb * 0.65, KAPPA_CIRCLE)
        return (g.advance, g.build())

    if name == "plus":
        adv = _bw(p, 560, 0.40)
        g = make(adv)
        cx = adv * 0.5
        cy = 310.0
        arm = 195.0
        g.hstem_c(cx - arm, cx + arm, cy, hb * 0.92)
        g.vstem_c(cx, cy - arm, cy + arm, st * 0.90)
        return (g.advance, g.build())

    if name == "equal":
        adv = _bw(p, 560, 0.40)
        g = make(adv)
        g.hstem_c(sb + 20.0, adv - sb - 20.0, 405.0, hb * 0.90)
        g.hstem_c(sb + 20.0, adv - sb - 20.0, 215.0, hb * 0.90)
        return (g.advance, g.build())

    if name == "plusminus":
        adv = _bw(p, 560, 0.40)
        g = make(adv)
        cx = adv * 0.5
        g.hstem_c(sb + 20.0, adv - sb - 20.0, 395.0, hb * 0.88)
        g.vstem_c(cx, 230.0, 560.0, st * 0.86)
        g.hstem_c(sb + 20.0, adv - sb - 20.0, 110.0, hb * 0.88)
        return (g.advance, g.build())

    if name == "multiply":
        adv = _bw(p, 560, 0.40)
        g = make(adv)
        cx, cy, d = adv * 0.5, 310.0, 152.0
        g.bar(cx - d, cy - d, cx + d, cy + d, st * 0.86)
        g.bar(cx - d, cy + d, cx + d, cy - d, st * 0.86)
        return (g.advance, g.build())

    if name == "divide":
        adv = _bw(p, 560, 0.40)
        g = make(adv)
        cx = adv * 0.5
        g.hstem_c(sb + 20.0, adv - sb - 20.0, 310.0, hb * 0.90)
        g.dot(cx, 480.0, st * 0.56)
        g.dot(cx, 140.0, st * 0.56)
        return (g.advance, g.build())

    if name == "less":
        adv = _bw(p, 540, 0.40)
        g = make(adv)
        g.bar(adv - sb - 38.0, 520.0, sb + 38.0, 310.0, st * 0.88)
        g.bar(sb + 38.0, 310.0, adv - sb - 38.0, 100.0, st * 0.88)
        return (g.advance, g.build())

    if name == "greater":
        adv = _bw(p, 540, 0.40)
        g = make(adv)
        g.bar(sb + 38.0, 520.0, adv - sb - 38.0, 310.0, st * 0.88)
        g.bar(adv - sb - 38.0, 310.0, sb + 38.0, 100.0, st * 0.88)
        return (g.advance, g.build())

    if name == "slash":
        adv = _bw(p, 412, 0.40)
        g = make(adv)
        w_d = st * 0.88
        g.poly([(sb + 8.0, -76.0), (sb + 8.0 + w_d, -76.0), (adv - sb - 8.0, cap + 36.0), (adv - sb - 8.0 - w_d, cap + 36.0)])
        return (g.advance, g.build())

    if name == "backslash":
        adv = _bw(p, 412, 0.40)
        g = make(adv)
        w_d = st * 0.88
        g.poly([(sb + 8.0, cap + 36.0), (sb + 8.0 + w_d, cap + 36.0), (adv - sb - 8.0, -76.0), (adv - sb - 8.0 - w_d, -76.0)])
        return (g.advance, g.build())

    if name == "bar":
        adv = _bw(p, 250, 0.35)
        g = make(adv)
        g.vstem_c(adv * 0.5, -120.0, cap + 60.0, st * 0.84)
        return (g.advance, g.build())

    if name == "parenleft":
        adv = _bw(p, 344, 0.40)
        g = make(adv)
        g.spline(
            [((adv - sb - 10.0, cap + 36.0), (sb + 48.0, 550.0), (sb + 48.0, 110.0), (adv - sb - 10.0, -108.0))],
            st * 0.84,
            hb * 0.84,
        )
        return (g.advance, g.build())

    if name == "parenright":
        adv = _bw(p, 344, 0.40)
        g = make(adv)
        g.spline(
            [((sb + 10.0, cap + 36.0), (adv - sb - 48.0, 550.0), (adv - sb - 48.0, 110.0), (sb + 10.0, -108.0))],
            st * 0.84,
            hb * 0.84,
        )
        return (g.advance, g.build())

    if name == "bracketleft":
        adv = _bw(p, 336, 0.40)
        g = make(adv)
        xl = sb + 12.0
        xr = adv - sb - 4.0
        g.vstem(xl, -104.0, cap + 32.0, st * 0.84)
        g.hstem(xl, xr, cap + 32.0 - hb * 0.84, hb * 0.84)
        g.hstem(xl, xr, -104.0, hb * 0.84)
        return (g.advance, g.build())

    if name == "bracketright":
        adv = _bw(p, 336, 0.40)
        g = make(adv)
        xl = sb + 4.0
        xr = adv - sb - 12.0
        g.vstem(xr - st * 0.84, -104.0, cap + 32.0, st * 0.84)
        g.hstem(xl, xr, cap + 32.0 - hb * 0.84, hb * 0.84)
        g.hstem(xl, xr, -104.0, hb * 0.84)
        return (g.advance, g.build())

    if name == "braceleft":
        adv = _bw(p, 376, 0.42)
        g = make(adv)
        xm = adv * 0.48
        xr = adv - sb - 6.0
        xl = sb + 14.0
        ym = (cap + 32.0 - 104.0) * 0.5
        g.spline(
            [
                ((xr, cap + 32.0), (xm, cap + 32.0), (xm, cap - 40.0), (xm, ym + 68.0)),
                ((xm, ym + 68.0), (xm, ym + 14.0), (xl + 36.0, ym), (xl, ym)),
            ],
            st * 0.82,
            hb * 0.82,
        )
        g.spline(
            [
                ((xl, ym), (xl + 36.0, ym), (xm, ym - 14.0), (xm, ym - 68.0)),
                ((xm, ym - 68.0), (xm, -32.0), (xm, -104.0), (xr, -104.0)),
            ],
            st * 0.82,
            hb * 0.82,
        )
        return (g.advance, g.build())

    if name == "braceright":
        adv = _bw(p, 376, 0.42)
        g = make(adv)
        xm = adv * 0.52
        xl = sb + 6.0
        xr = adv - sb - 14.0
        ym = (cap + 32.0 - 104.0) * 0.5
        g.spline(
            [
                ((xl, cap + 32.0), (xm, cap + 32.0), (xm, cap - 40.0), (xm, ym + 68.0)),
                ((xm, ym + 68.0), (xm, ym + 14.0), (xr - 36.0, ym), (xr, ym)),
            ],
            st * 0.82,
            hb * 0.82,
        )
        g.spline(
            [
                ((xr, ym), (xr - 36.0, ym), (xm, ym - 14.0), (xm, ym - 68.0)),
                ((xm, ym - 68.0), (xm, -32.0), (xm, -104.0), (xl, -104.0)),
            ],
            st * 0.82,
            hb * 0.82,
        )
        return (g.advance, g.build())

    if name == "quotesingle":
        adv = _bw(p, 200, 0.35)
        g = make(adv)
        cx = adv * 0.5
        g.poly([(cx - st * 0.34, 510.0), (cx + st * 0.34, 510.0), (cx + st * 0.48, cap), (cx - st * 0.48, cap)])
        return (g.advance, g.build())

    if name == "quotedbl":
        adv = _bw(p, 368, 0.40)
        g = make(adv)
        for cx in (adv * 0.32, adv * 0.68):
            g.poly([(cx - st * 0.32, 510.0), (cx + st * 0.32, 510.0), (cx + st * 0.46, cap), (cx - st * 0.46, cap)])
        return (g.advance, g.build())

    if name in ("quoteleft", "quoteright"):
        adv = _bw(p, 230, 0.35)
        g = make(adv)
        cx = adv * 0.5
        if name == "quoteleft":
            g.dot(cx - 4.0, 540.0, st * 0.50)
            g.spline([((cx - 24.0, 548.0), (cx - 18.0, 636.0), (cx + 12.0, 686.0), (cx + 42.0, 720.0))], st * 0.60, hb * 0.60)
        else:
            g.dot(cx + 4.0, 680.0, st * 0.50)
            g.spline([((cx + 24.0, 672.0), (cx + 18.0, 584.0), (cx - 12.0, 534.0), (cx - 42.0, 500.0))], st * 0.60, hb * 0.60)
        return (g.advance, g.build())

    if name in ("quotedblleft", "quotedblright"):
        adv = _bw(p, 400, 0.42)
        g = make(adv)
        for cx in (adv * 0.31, adv * 0.69):
            if name == "quotedblleft":
                g.dot(cx - 4.0, 540.0, st * 0.46)
                g.spline([((cx - 20.0, 548.0), (cx - 14.0, 636.0), (cx + 10.0, 686.0), (cx + 36.0, 720.0))], st * 0.56, hb * 0.56)
            else:
                g.dot(cx + 4.0, 680.0, st * 0.46)
                g.spline([((cx + 20.0, 672.0), (cx + 14.0, 584.0), (cx - 10.0, 534.0), (cx - 36.0, 500.0))], st * 0.56, hb * 0.56)
        return (g.advance, g.build())

    if name == "asterisk":
        adv = _bw(p, 420, 0.40)
        g = make(adv)
        cx, cy = adv * 0.5, 560.0
        arm = 140.0
        sw = st * 0.64
        for deg in (90, 162, 234, 306, 18):
            rad = math.radians(deg)
            g.bar(cx, cy, cx + math.cos(rad) * arm, cy + math.sin(rad) * arm, sw * 0.68, sw * 0.94)
        return (g.advance, g.build())

    if name == "numbersign":
        adv = _bw(p, 640, 0.45)
        g = make(adv)
        sw = st * 0.78
        g.poly([(160.0, 70.0), (160.0 + sw, 70.0), (250.0 + sw, 650.0), (250.0, 650.0)])
        g.poly([(360.0, 70.0), (360.0 + sw, 70.0), (450.0 + sw, 650.0), (450.0, 650.0)])
        g.hstem_c(86.0, adv - 66.0, 456.0, hb * 0.78)
        g.hstem_c(66.0, adv - 86.0, 264.0, hb * 0.78)
        return (g.advance, g.build())

    if name == "dollar":
        adv = _bw(p, 600, 0.50)
        g = make(adv)
        cx = adv * 0.5
        rx = cx - sb - st * 0.44
        top_y = cap - 24.0
        bot_y = 24.0
        mid_y = cap * 0.5
        g.vstem_c(cx, -56.0, cap + 56.0, st * 0.74)
        g.spline(
            [
                ((cx + rx * 0.86, top_y - 86.0), (cx + rx * 0.56, top_y), (cx + rx * 0.20, top_y), (cx - rx * 0.04, top_y)),
                ((cx - rx * 0.04, top_y), (cx - rx * 0.64, top_y), (cx - rx * 0.92, top_y - 62.0), (cx - rx * 0.92, mid_y + 142.0)),
                ((cx - rx * 0.92, mid_y + 142.0), (cx - rx * 0.92, mid_y + 34.0), (cx - rx * 0.34, mid_y + 22.0), (cx, mid_y)),
                ((cx, mid_y), (cx + rx * 0.38, mid_y - 22.0), (cx + rx * 0.96, mid_y - 38.0), (cx + rx * 0.96, mid_y - 142.0)),
                ((cx + rx * 0.96, mid_y - 142.0), (cx + rx * 0.96, bot_y + 56.0), (cx + rx * 0.60, bot_y), (cx + rx * 0.04, bot_y)),
                ((cx + rx * 0.04, bot_y), (cx - rx * 0.42, bot_y), (cx - rx * 0.76, bot_y + 28.0), (cx - rx * 0.92, bot_y + 94.0)),
            ],
            st * 0.88,
            hb * 0.86,
        )
        return (g.advance, g.build())

    if name == "percent":
        adv = _bw(p, 780, 0.52)
        g = make(adv)
        sw = st * 0.72
        g.ring(196.0, 540.0, 134.0, 142.0, sw, sw * 0.90)
        g.ring(adv - 196.0, 178.0, 134.0, 142.0, sw, sw * 0.90)
        w_d = sw * 1.02
        g.poly([(160.0, 0.0), (160.0 + w_d, 0.0), (adv - 160.0, cap), (adv - 160.0 - w_d, cap)])
        return (g.advance, g.build())

    if name == "ampersand":
        adv = _bw(p, 690, 0.52)
        g = make(adv)
        cx_t = adv * 0.42
        g.spline(
            [
                ((adv - sb - st * 0.4, 0.0), (adv - sb - 110.0, 120.0), (cx_t - 108.0, 340.0), (cx_t - 108.0, 505.0)),
                ((cx_t - 108.0, 505.0), (cx_t - 108.0, cap + ov - hb * 0.48), (cx_t - 40.0, cap + ov - hb * 0.48), (cx_t + 16.0, cap + ov - hb * 0.48)),
                ((cx_t + 16.0, cap + ov - hb * 0.48), (cx_t + 148.0, cap + ov - hb * 0.48), (cx_t + 148.0, 520.0), (cx_t + 148.0, 495.0)),
                ((cx_t + 148.0, 495.0), (cx_t + 148.0, 370.0), (sb + st * 0.46, 320.0), (sb + st * 0.46, 184.0)),
                ((sb + st * 0.46, 184.0), (sb + st * 0.46, 48.0), (cx_t - 20.0, -ov + hb * 0.48), (cx_t + 56.0, -ov + hb * 0.48)),
                ((cx_t + 56.0, -ov + hb * 0.48), (adv - sb - 115.0, -ov + hb * 0.48), (adv - sb - 60.0, 118.0), (adv - sb - st * 0.44, 240.0)),
            ],
            st * 0.90,
            hb * 0.88,
        )
        return (g.advance, g.build())

    if name == "at":
        adv = _bw(p, 870, 0.55)
        g = make(adv)
        cx = adv * 0.5
        cy = 340.0
        sw = st * 0.68
        rx_out = adv * 0.5 - sb - 22.0
        x_stem = cx + 130.0
        g.ring(cx - 16.0, cy, 174.0, 182.0, sw, sw * 0.90)
        g.vstem_c(x_stem, 276.0, 476.0, sw * 0.94)
        g.arc(cx, cy, rx_out, 368.0, 0, 312, sw, sw * 0.90)
        hook_rx = (cx + rx_out - x_stem) * 0.5
        g.arc(x_stem + hook_rx, 276.0, hook_rx, 64.0, 180, 360, sw, sw * 0.90)
        g.vstem_c(cx + rx_out, 276.0, cy, sw * 0.94)
        return (g.advance, g.build())

    if name == "asciicircum":
        adv = _bw(p, 480, 0.40)
        g = make(adv)
        cx = adv * 0.5
        sw = st * 0.76
        g.bar(sb + 32.0, 470.0, cx, cap - 10.0, sw)
        g.bar(adv - sb - 32.0, 470.0, cx, cap - 10.0, sw)
        return (g.advance, g.build())

    if name == "grave":
        adv = _bw(p, 320, 0.35)
        g = make(adv)
        cx = adv * 0.5
        g.poly([(cx - 22, 560), (cx + 42, 560), (cx + 6, 700), (cx - 76, 700)])
        return (g.advance, g.build())

    if name == "asciitilde":
        adv = _bw(p, 540, 0.40)
        g = make(adv)
        cx = adv * 0.5
        g.spline(
            [((sb + 26.0, 290.0), (cx - 64.0, 415.0), (cx + 64.0, 195.0), (adv - sb - 26.0, 320.0))],
            st * 0.80,
            hb * 0.76,
        )
        return (g.advance, g.build())

    if name == "Euro":
        adv = _bw(p, 650, 0.45)
        g = make(adv)
        cx = adv * 0.5 + 36.0
        cy = cap * 0.5
        g.arc(cx, cy, cx - sb - st * 0.46 - 24.0, cap * 0.5 + ov - hb * 0.48, 38, 322, st, hb, cut_h0=True, cut_h1=True)
        g.hstem_c(sb + 10.0, cx + 62.0, 420.0, hb * 0.82)
        g.hstem_c(sb + 10.0, cx + 38.0, 295.0, hb * 0.82)
        return (g.advance, g.build())

    if name == "sterling":
        adv = _bw(p, 600, 0.45)
        g = make(adv)
        xl = sb + 56.0
        g.vstem(xl, 0, 535.0)
        g.arc(xl + 140.0 + st * 0.5, 535.0, 140.0, (cap + ov - hb * 0.48) - 535.0, 180, 16)
        g.hstem(sb, adv - sb, 0, hb)
        g.hstem_c(sb + 10.0, xl + st + 145.0, 345.0, hb * 0.84)
        return (g.advance, g.build())

    if name == "yen":
        adv = _bw(p, 620, 0.45)
        g = make(adv)
        cx = adv * 0.5
        w_leg = st * 0.94
        g.poly([(sb, cap), (sb + w_leg, cap), (cx + st * 0.42, 300.0), (cx - st * 0.48, 300.0)])
        g.poly([(adv - sb - w_leg, cap), (adv - sb, cap), (cx + st * 0.48, 300.0), (cx - st * 0.42, 300.0)])
        g.vstem_c(cx, 0, 330.0)
        g.hstem_c(sb + 54.0, adv - sb - 54.0, 286.0, hb * 0.80)
        g.hstem_c(sb + 54.0, adv - sb - 54.0, 174.0, hb * 0.80)
        return (g.advance, g.build())

    if name == "copyright":
        adv = _bw(p, 760, 0.50)
        g = make(adv)
        cx, cy = adv * 0.5, cap * 0.5
        sw = st * 0.68
        g.ring(cx, cy, cx - sb, cx - sb, sw, sw * 0.92, KAPPA_CIRCLE)
        g.arc(cx + 10.0, cy, 145.0, 165.0, 42, 318, sw, sw * 0.90)
        return (g.advance, g.build())

    if name == "registered":
        adv = _bw(p, 760, 0.50)
        g = make(adv)
        cx, cy = adv * 0.5, cap * 0.5
        sw = st * 0.60
        g.ring(cx, cy, cx - sb, cx - sb, sw, sw * 0.92, KAPPA_CIRCLE)
        xl = cx - 96.0
        g.vstem(xl, cy - 145.0, cy + 145.0, sw * 0.84)
        g.d_bowl(xl, cx + 108.0, cy - 10.0, cy + 145.0, sw * 0.82, sw * 0.78)
        g.poly([(cx - 10.0, cy - 10.0), (cx + 42.0, cy - 10.0), (cx + 114.0, cy - 145.0), (cx + 58.0, cy - 145.0)])
        return (g.advance, g.build())

    if name == "trademark":
        adv = _bw(p, 820, 0.50)
        g = make(adv)
        sw = st * 0.62
        g.hstem(sb + 16.0, 326.0, cap - sw * 0.92, sw * 0.92)
        g.vstem_c(171.0, 380.0, cap, sw)
        g.vstem(410.0, 380.0, cap, sw)
        g.vstem(adv - sb - 16.0 - sw, 380.0, cap, sw)
        mid = (410.0 + adv - sb - 16.0) * 0.5
        g.bar(410.0 + sw * 0.5, cap - 10.0, mid, 440.0, sw * 0.86)
        g.bar(adv - sb - 16.0 - sw * 0.5, cap - 10.0, mid, 440.0, sw * 0.86)
        return (g.advance, g.build())

    if name == "arrowright":
        adv = _bw(p, 760, 0.45)
        g = make(adv)
        cy = 340.0
        sw = st * 0.78
        xr = adv - sb - 20.0
        g.hstem_c(sb + 20.0, xr - 10.0, cy, sw)
        g.bar(xr - 180.0, cy + 180.0, xr, cy, sw)
        g.bar(xr - 180.0, cy - 180.0, xr, cy, sw)
        return (g.advance, g.build())

    if name == "arrowleft":
        adv = _bw(p, 760, 0.45)
        g = make(adv)
        cy = 340.0
        sw = st * 0.78
        xl = sb + 20.0
        g.hstem_c(xl + 10.0, adv - sb - 20.0, cy, sw)
        g.bar(xl + 180.0, cy + 180.0, xl, cy, sw)
        g.bar(xl + 180.0, cy - 180.0, xl, cy, sw)
        return (g.advance, g.build())

    if name == "arrowup":
        adv = _bw(p, 560, 0.45)
        g = make(adv)
        cx = adv * 0.5
        sw = st * 0.78
        yt = cap - 20.0
        g.vstem_c(cx, 20.0, yt - 10.0, sw)
        g.bar(cx - 175.0, yt - 175.0, cx, yt, sw)
        g.bar(cx + 175.0, yt - 175.0, cx, yt, sw)
        return (g.advance, g.build())

    if name == "arrowdown":
        adv = _bw(p, 560, 0.45)
        g = make(adv)
        cx = adv * 0.5
        sw = st * 0.78
        yb = 20.0
        g.vstem_c(cx, yb + 10.0, cap - 20.0, sw)
        g.bar(cx - 175.0, yb + 175.0, cx, yb, sw)
        g.bar(cx + 175.0, yb + 175.0, cx, yb, sw)
        return (g.advance, g.build())

    if name == "uni2713":
        adv = _bw(p, 720, 0.45)
        g = make(adv)
        sw = st * 0.84
        xm = adv * 0.38
        g.bar(sb + 26.0, 290.0, xm, 96.0, sw)
        g.bar(xm, 96.0, adv - sb - 26.0, cap - 60.0, sw)
        return (g.advance, g.build())

    return (0.0, None)


def build_all_glyphs(p: FontParams) -> Tuple[List[str], Dict[str, Tuple[float, pathops.Path]]]:
    glyph_order: List[str] = [".notdef", "space", "uni00A0", "dotlessi"]
    for cp, gname in sorted(CODEPOINT_NAMES.items()):
        if gname not in glyph_order:
            glyph_order.append(gname)

    glyphs: Dict[str, Tuple[float, pathops.Path]] = {}
    for gname in glyph_order:
        if any(info[0] == gname for info in LATIN1_MAP.values()):
            continue
        adv, path = _build_base_glyph(p, gname)
        if path is None:
            raise ValueError(f"Missing glyph definition: {gname}")
        glyphs[gname] = (adv, path)

    upright_p = FontParams(
        style_name=p.style_name,
        subfamily=p.subfamily,
        weight_class=p.weight_class,
        is_bold=p.is_bold,
        is_italic=False,
        slant_deg=0.0,
        stem=p.stem,
        hbar=p.hbar,
        r_outer=p.r_outer,
        r_inner=p.r_inner,
        cap=p.cap,
        xh=p.xh,
        asc=p.asc,
        desc=p.desc,
        overshoot=p.overshoot,
        sq_k=p.sq_k,
        sb=p.sb,
    )
    for cp, (gname, base_name, accent) in LATIN1_MAP.items():
        adv, base_path = _build_base_glyph(upright_p, base_name)
        if base_path is None:
            raise ValueError(f"Missing base glyph {base_name} for {gname}")
        g = GlyphBuilder(p, adv, round_corners=True)
        # Note: base_path is already corner-rounded; draw accents cleanly
        accent_builder = GlyphBuilder(upright_p, adv, round_corners=True)
        cx = adv * 0.5
        if accent == "slash":
            w_d = p.stem * 0.70
            if base_name == "O":
                accent_builder.poly([(p.sb + 16, -30), (p.sb + 16 + w_d, -30), (adv - p.sb - 16, p.cap + 30), (adv - p.sb - 16 - w_d, p.cap + 30)])
            else:
                accent_builder.poly([(p.sb + 10, -22), (p.sb + 10 + w_d, -22), (adv - p.sb - 10, p.xh + 22), (adv - p.sb - 10 - w_d, p.xh + 22)])
        elif accent == "cedilla":
            _draw_accent(accent_builder, "cedilla", cx, 0.0)
        else:
            base_top = p.cap if base_name.isupper() else p.xh
            _draw_accent(accent_builder, accent, cx, base_top)

        accent_path = accent_builder.build()
        g.round_corners = False
        g.add_path(base_path)
        g.add_path(accent_path)
        glyphs[gname] = (g.advance, g.build())

    return glyph_order, glyphs


KERN_PAIRS: Dict[Tuple[str, str], int] = {
    ("A", "V"): -48, ("A", "W"): -36, ("A", "T"): -46, ("A", "Y"): -50,
    ("A", "C"): -16, ("A", "G"): -16, ("A", "O"): -18, ("A", "Q"): -18,
    ("A", "v"): -22, ("A", "w"): -18, ("A", "y"): -24,
    ("F", "A"): -44, ("F", "a"): -20, ("F", "e"): -20, ("F", "o"): -22,
    ("F", "period"): -48, ("F", "comma"): -48,
    ("L", "T"): -48, ("L", "V"): -50, ("L", "W"): -38, ("L", "Y"): -54,
    ("L", "y"): -24, ("L", "quoteright"): -42,
    ("P", "A"): -46, ("P", "a"): -16, ("P", "e"): -16, ("P", "o"): -18,
    ("P", "period"): -56, ("P", "comma"): -56,
    ("T", "A"): -46, ("T", "O"): -20, ("T", "a"): -32, ("T", "e"): -34,
    ("T", "o"): -34, ("T", "r"): -28, ("T", "u"): -24, ("T", "y"): -24,
    ("T", "period"): -48, ("T", "comma"): -48,
    ("V", "A"): -48, ("V", "O"): -18, ("V", "a"): -34, ("V", "e"): -34,
    ("V", "o"): -36, ("V", "u"): -22, ("V", "period"): -48, ("V", "comma"): -48,
    ("W", "A"): -36, ("W", "a"): -24, ("W", "e"): -24, ("W", "o"): -26,
    ("W", "period"): -36, ("W", "comma"): -36,
    ("Y", "A"): -50, ("Y", "a"): -36, ("Y", "e"): -38, ("Y", "o"): -38,
    ("Y", "u"): -28, ("Y", "period"): -52, ("Y", "comma"): -52,
    ("f", "period"): -18, ("f", "comma"): -18,
    ("r", "a"): -12, ("r", "e"): -10, ("r", "o"): -10,
    ("r", "period"): -36, ("r", "comma"): -36,
    ("v", "a"): -16, ("v", "e"): -14, ("v", "o"): -14,
    ("v", "period"): -36, ("v", "comma"): -36,
    ("w", "a"): -14, ("w", "e"): -12, ("w", "o"): -12,
    ("w", "period"): -28, ("w", "comma"): -28,
    ("y", "a"): -16, ("y", "e"): -14, ("y", "o"): -14,
    ("y", "period"): -36, ("y", "comma"): -36,
    ("quoteleft", "A"): -36, ("quotedblleft", "A"): -36,
    ("A", "quoteright"): -38, ("A", "quotedblright"): -38,
}
