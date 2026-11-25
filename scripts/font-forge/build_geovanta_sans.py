"""
Build Geovanta Sans (Regular, Bold, Italic, BoldItalic) in .otf, .ttf, and .woff2 formats,
and render a high-resolution font specimen sheet using Playwright.
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import Dict, Tuple

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._k_e_r_n import KernTable_format_0
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))

from glyph_definitions import CODEPOINT_NAMES, KERN_PAIRS, build_all_glyphs  # noqa: E402
from glyph_engine import FACES, FontParams, draw_pathops_to_cubic_pen  # noqa: E402

ROOT_DIR = Path(__file__).resolve().parents[2]
ASSET_FONTS_DIR = ROOT_DIR / "src" / "assets" / "fonts" / "geovanta-sans"
EXPORT_FONTS_DIR = ROOT_DIR / "fonts" / "GeovantaSans"
SCRATCH_DIR = ROOT_DIR / "scratch"

FAMILY_NAME = "Geovanta Sans"
VERSION_STR = "1.000"

LICENSE_TEXT = """Geovanta Sans Custom Font License (SIL Open Font License 1.1)
Copyright (c) 2026 Geovanta Vector Studio.

Geovanta Sans is a 100% custom geometric-humanist rounded typeface
designed exclusively for Geovanta Vector Editor.

Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the terms of the SIL Open Font License 1.1.
"""


def _build_name_table(p: FontParams) -> Dict[int, str]:
    ps_name = f"GeovantaSans-{p.style_name}"
    full_name = FAMILY_NAME if p.style_name == "Regular" else f"{FAMILY_NAME} {p.subfamily}"
    return {
        0: "Copyright 2026 Geovanta Vector Studio. All rights reserved.",
        1: FAMILY_NAME,
        2: p.subfamily,
        3: f"1.000;GVNT;{ps_name}",
        4: full_name,
        5: f"Version {VERSION_STR}",
        6: ps_name,
        8: "Geovanta Vector Studio",
        9: "Geovanta Typography Engine",
        11: "https://geovanta.app",
        13: "Licensed under the SIL Open Font License, Version 1.1.",
        16: FAMILY_NAME,
        17: p.subfamily,
    }


def _apply_common_tables(fb: FontBuilder, p: FontParams, metrics: Dict[str, Tuple[int, int]], cmap: Dict[int, str], glyph_set: set[str]) -> None:
    fb.setupCharacterMap(cmap)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=int(p.asc), descent=int(p.desc), lineGap=90)
    fb.setupNameTable(_build_name_table(p))

    fs_selection = 0
    if p.is_italic:
        fs_selection |= 1 << 0
    if p.is_bold:
        fs_selection |= 1 << 5
    if not p.is_bold and not p.is_italic:
        fs_selection |= 1 << 6
    fs_selection |= 1 << 7  # USE_TYPO_METRICS

    mac_style = 0
    if p.is_bold:
        mac_style |= 1 << 0
    if p.is_italic:
        mac_style |= 1 << 1

    fb.setupOS2(
        version=4,
        sTypoAscender=int(p.asc),
        sTypoDescender=int(p.desc),
        sTypoLineGap=90,
        usWinAscent=920,
        usWinDescent=240,
        sxHeight=int(p.xh),
        sCapHeight=int(p.cap),
        usWeightClass=p.weight_class,
        fsType=0,
        fsSelection=fs_selection,
        panose={
            "bFamilyType": 2,
            "bSerifStyle": 11,
            "bWeight": 7 if p.is_bold else 5,
            "bProportion": 3,
            "bContrast": 2,
            "bStrokeVariation": 2,
            "bArmStyle": 3,
            "bLetterForm": 8 if p.is_italic else 2,
            "bMidline": 2,
            "bXHeight": 4,
        },
    )
    fb.setupPost(italicAngle=-p.slant_deg if p.is_italic else 0.0, isFixedPitch=0)
    fb.font["head"].macStyle = mac_style

    # Add format-0 kern table
    valid_kern = {
        (left, right): val
        for (left, right), val in KERN_PAIRS.items()
        if left in glyph_set and right in glyph_set
    }
    if valid_kern:
        kern_table = newTable("kern")
        kern_table.version = 0
        subtable = KernTable_format_0(0)
        subtable.coverage = 1
        subtable.kernTable = valid_kern
        kern_table.kernTables = [subtable]
        fb.font["kern"] = kern_table


def compile_face(p: FontParams, out_dir: Path) -> Dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    glyph_order, glyphs = build_all_glyphs(p)
    glyph_set = set(glyph_order)
    cmap = {cp: name for cp, name in CODEPOINT_NAMES.items() if name in glyph_set}

    # --- 1. Build OTF (CFF cubic) ---
    fb_otf = FontBuilder(1000, isTTF=False)
    fb_otf.setupGlyphOrder(glyph_order)
    charstrings = {}
    metrics_otf: Dict[str, Tuple[int, int]] = {}
    for gname in glyph_order:
        adv, path = glyphs[gname]
        adv_int = int(round(adv))
        pen = T2CharStringPen(adv_int, None)
        draw_pathops_to_cubic_pen(path, pen)
        charstrings[gname] = pen.getCharString()
        bounds = path.bounds
        lsb = int(round(bounds[0])) if bounds is not None else 0
        metrics_otf[gname] = (adv_int, lsb)

    fb_otf.setupCFF(
        psName=f"GeovantaSans-{p.style_name}",
        fontInfo={
            "FullName": FAMILY_NAME if p.style_name == "Regular" else f"{FAMILY_NAME} {p.subfamily}",
            "FamilyName": FAMILY_NAME,
            "Weight": "Bold" if p.is_bold else "Regular",
        },
        charStringsDict=charstrings,
        privateDict={"defaultWidthX": 0, "nominalWidthX": 0},
    )
    _apply_common_tables(fb_otf, p, metrics_otf, cmap, glyph_set)
    otf_path = out_dir / f"GeovantaSans-{p.style_name}.otf"
    fb_otf.save(str(otf_path))

    # --- 2. Build TTF (TrueType quadratic, CW outer winding) ---
    fb_ttf = FontBuilder(1000, isTTF=True)
    fb_ttf.setupGlyphOrder(glyph_order)
    glyf_dict = {}
    metrics_ttf: Dict[str, Tuple[int, int]] = {}
    for gname in glyph_order:
        adv, path = glyphs[gname]
        adv_int = int(round(adv))
        tt_pen = TTGlyphPen(None)
        cu2qu_pen = Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=True)
        draw_pathops_to_cubic_pen(path, cu2qu_pen)
        glyf_dict[gname] = tt_pen.glyph()
        bounds = path.bounds
        lsb = int(round(bounds[0])) if bounds is not None else 0
        metrics_ttf[gname] = (adv_int, lsb)

    fb_ttf.setupGlyf(glyf_dict)
    _apply_common_tables(fb_ttf, p, metrics_ttf, cmap, glyph_set)
    fb_ttf.setupMaxp()
    ttf_path = out_dir / f"GeovantaSans-{p.style_name}.ttf"
    fb_ttf.save(str(ttf_path))

    # --- 3. Build WOFF2 from TTF ---
    woff2_path = out_dir / f"GeovantaSans-{p.style_name}.woff2"
    tt = TTFont(str(ttf_path))
    tt.flavor = "woff2"
    tt.save(str(woff2_path))
    tt.close()

    return {"otf": otf_path, "ttf": ttf_path, "woff2": woff2_path}


def generate_specimen_sheet(font_dir: Path, out_png: Path) -> None:
    out_png.parent.mkdir(parents=True, exist_ok=True)
    html_path = out_png.parent / "specimen_preview.html"
    rel_dir = Path(os.path.relpath(font_dir, html_path.parent)).as_posix()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
@font-face {{
  font-family: 'Geovanta Sans';
  src: url('{rel_dir}/GeovantaSans-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal;
}}
@font-face {{
  font-family: 'Geovanta Sans';
  src: url('{rel_dir}/GeovantaSans-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal;
}}
@font-face {{
  font-family: 'Geovanta Sans';
  src: url('{rel_dir}/GeovantaSans-Italic.woff2') format('woff2');
  font-weight: 400; font-style: italic;
}}
@font-face {{
  font-family: 'Geovanta Sans';
  src: url('{rel_dir}/GeovantaSans-BoldItalic.woff2') format('woff2');
  font-weight: 700; font-style: italic;
}}
* {{ box-sizing: border-box; }}
body {{
  margin: 0; padding: 36px 42px;
  font-family: 'Geovanta Sans', sans-serif;
  background: #f8fafc; color: #0f172a;
}}
.header {{
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 24px;
}}
.brand {{ display: flex; align-items: center; gap: 14px; }}
.badge {{
  background: #13b152; color: #fff; font-weight: 700; font-size: 13px;
  padding: 6px 14px; border-radius: 999px;
}}
.grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }}
.card {{
  background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px;
  padding: 20px 24px; box-shadow: 0 4px 16px rgba(15,23,42,0.04);
}}
.lbl {{ font-size: 11px; font-weight: 700; color: #13b152; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; }}
.big {{ font-size: 46px; font-weight: 700; line-height: 1.15; margin-bottom: 8px; }}
.sub {{ font-size: 22px; font-weight: 400; color: #334155; margin-bottom: 14px; }}
.chars {{ font-size: 23px; line-height: 1.5; letter-spacing: 0.02em; }}
.sizes div {{ margin-bottom: 7px; }}
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="badge">GEOVANTA SANS v1.0</div>
      <div style="font-size:26px;font-weight:700;">100% Custom Typeface Specimen</div>
    </div>
    <div style="font-size:13px;color:#475569;">Modern Geometric Rounded • .WOFF2 / .OTF / .TTF • 4 Faces</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="lbl">Hero Display &amp; Identity</div>
      <div class="big">Geovanta Studio</div>
      <div class="sub">Vector Precision, Rounded Warmth.</div>
      <div style="font-size:18px;font-style:italic;color:#13b152;margin-bottom:8px;">Regular Italic — Sphinx of black quartz, judge my vow!</div>
      <div style="font-size:18px;font-weight:700;font-style:italic;color:#475569;">Bold Italic — Design &amp; Vector Craft 2026</div>
    </div>

    <div class="card">
      <div class="lbl">Full Character Set (Regular 400)</div>
      <div class="chars">
        <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
        <div>abcdefghijklmnopqrstuvwxyz</div>
        <div>0123456789  !@#$%^&amp;*()-_+=</div>
        <div>[]{{}}|;:'",&lt;&gt;.?/  … – — • ° × ÷ ± → ← ✓</div>
      </div>
    </div>

    <div class="card">
      <div class="lbl">Bold 700 Character Set</div>
      <div class="chars" style="font-weight:700;">
        <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
        <div>abcdefghijklmnopqrstuvwxyz</div>
        <div>0123456789  €£¥©®™  ÀÁÂÄÅÇÉÊÑÓÖØÜ</div>
      </div>
    </div>

    <div class="card">
      <div class="lbl">UI &amp; Canvas Size Waterfall (11px – 32px)</div>
      <div class="sizes">
        <div style="font-size:11px;">11px UI Micro: Layer 1 • Opacity 100% • Corner Radius 18px • Geovanta Sans</div>
        <div style="font-size:12.5px;font-weight:700;">12.5px Inspector Label: Keluarga Font — Geovanta Sans (Default)</div>
        <div style="font-size:14px;">14px Body: Editor vektor modern berbasis kanvas GPU/WASM presisi.</div>
        <div style="font-size:20px;font-weight:700;">20px Section: AVATAR WAVEFORM TYPOGRAPHY</div>
        <div style="font-size:30px;font-weight:700;">30px Display: Geovanta 0123456789</div>
      </div>
    </div>
  </div>
</body>
</html>
"""
    html_path.write_text(html, encoding="utf-8")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 840}, device_scale_factor=2)
        page.goto(html_path.as_uri(), wait_until="networkidle")
        page.evaluate("() => document.fonts.ready")
        page.screenshot(path=str(out_png), full_page=True)
        browser.close()


def main() -> None:
    for d in (ASSET_FONTS_DIR, EXPORT_FONTS_DIR):
        d.mkdir(parents=True, exist_ok=True)

    for face in FACES:
        outputs = compile_face(face, ASSET_FONTS_DIR)
        for fmt, src_path in outputs.items():
            shutil.copy2(src_path, EXPORT_FONTS_DIR / src_path.name)
        print(
            f"[Geovanta Sans] Built {face.style_name}: "
            + ", ".join(f"{k}={v.stat().st_size}B" for k, v in outputs.items())
        )

    for d in (ASSET_FONTS_DIR, EXPORT_FONTS_DIR):
        (d / "Geovanta-Sans-LICENSE.txt").write_text(LICENSE_TEXT, encoding="utf-8")

    specimen_path = SCRATCH_DIR / "geovanta_sans_specimen.png"
    generate_specimen_sheet(ASSET_FONTS_DIR, specimen_path)
    print(f"[Geovanta Sans] Specimen rendered to {specimen_path}")


if __name__ == "__main__":
    main()
