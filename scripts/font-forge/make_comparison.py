"""
Compose a high-resolution visual comparison PNG comparing the OLD font
(Inter UI + IBM Plex Sans Canvas) vs the NEW custom font (Geovanta Sans UI + Canvas).
"""
from __future__ import annotations

import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRATCH_DIR = ROOT_DIR / "scratch"
ASSET_FONTS_DIR = ROOT_DIR / "src" / "assets" / "fonts" / "geovanta-sans"
LEGACY_FONTS_DIR = ROOT_DIR / "src" / "assets" / "fonts"


def build_comparison(
    before_png: Path,
    after_png: Path,
    out_png: Path,
) -> None:
    out_png.parent.mkdir(parents=True, exist_ok=True)
    html_path = SCRATCH_DIR / "comparison_compose.html"

    rel_before = Path(os.path.relpath(before_png, html_path.parent)).as_posix()
    rel_after = Path(os.path.relpath(after_png, html_path.parent)).as_posix()
    rel_new = Path(os.path.relpath(ASSET_FONTS_DIR, html_path.parent)).as_posix()
    rel_old = Path(os.path.relpath(LEGACY_FONTS_DIR, html_path.parent)).as_posix()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
@font-face {{
  font-family: 'Geovanta Sans';
  src: url('{rel_new}/GeovantaSans-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal;
}}
@font-face {{
  font-family: 'Geovanta Sans';
  src: url('{rel_new}/GeovantaSans-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal;
}}
@font-face {{
  font-family: 'Geovanta Sans';
  src: url('{rel_new}/GeovantaSans-Italic.woff2') format('woff2');
  font-weight: 400; font-style: italic;
}}
@font-face {{
  font-family: 'IBM Plex Sans';
  src: url('{rel_old}/IBMPlexSans-Regular.ttf') format('truetype');
  font-weight: 400; font-style: normal;
}}
@font-face {{
  font-family: 'IBM Plex Sans';
  src: url('{rel_old}/IBMPlexSans-Bold.ttf') format('truetype');
  font-weight: 700; font-style: normal;
}}
@font-face {{
  font-family: 'IBM Plex Sans';
  src: url('{rel_old}/IBMPlexSans-Italic.ttf') format('truetype');
  font-weight: 400; font-style: italic;
}}
* {{ box-sizing: border-box; }}
body {{
  margin: 0; padding: 28px 32px;
  background: #0f172a;
  color: #f8fafc;
  font-family: 'Geovanta Sans', sans-serif;
  width: 2100px;
}}
.top {{
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}}
.title {{ font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }}
.sub {{ font-size: 15px; color: #94a3b8; margin-top: 4px; }}
.pill-new {{
  background: #13b152; color: #fff; font-weight: 700; font-size: 13px;
  padding: 6px 14px; border-radius: 999px;
}}
.shots {{
  display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-bottom: 22px;
}}
.shot-card {{
  background: #1e293b; border: 1px solid #334155; border-radius: 18px;
  padding: 14px; overflow: hidden;
}}
.shot-card.new {{ border-color: #13b152; box-shadow: 0 0 0 1px rgba(19,177,82,0.35); }}
.shot-hdr {{
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}}
.tag-old {{
  background: #334155; color: #e2e8f0; font-size: 12px; font-weight: 700;
  padding: 4px 12px; border-radius: 999px;
}}
.tag-new {{
  background: #13b152; color: #fff; font-size: 12px; font-weight: 700;
  padding: 4px 12px; border-radius: 999px;
}}
.shot-meta {{ font-size: 13px; color: #cbd5e1; }}
.shot-img {{
  width: 100%; border-radius: 10px; display: block; border: 1px solid #0f172a;
}}
.strip {{
  display: grid; grid-template-columns: 1fr 1fr; gap: 22px;
}}
.typo-box {{
  background: #ffffff; color: #0f172a; border-radius: 16px; padding: 20px 24px;
}}
.typo-box.old {{ font-family: 'IBM Plex Sans', sans-serif; }}
.typo-box.new {{ font-family: 'Geovanta Sans', sans-serif; border: 3px solid #13b152; }}
.typo-label {{
  font-family: 'Geovanta Sans', sans-serif;
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  margin-bottom: 10px;
}}
.typo-label.old {{ color: #64748b; }}
.typo-label.new {{ color: #13b152; }}
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="title">Perbandingan Font Geovanta Vector Editor — Lama vs Geovanta Sans (Baru)</div>
      <div class="sub">100% Custom Geometric-Humanist Rounded Font (.woff2 / .otf / .ttf) — Aktif sebagai Default UI Editor + Canvas Text &amp; Charts</div>
    </div>
    <div class="pill-new">GEOVANTA SANS DEFAULT ACTIVE</div>
  </div>

  <div class="shots">
    <div class="shot-card">
      <div class="shot-hdr">
        <span class="tag-old">SEBELUM (FONT LAMA)</span>
        <span class="shot-meta">UI: Inter / System • Canvas Default: IBM Plex Sans</span>
      </div>
      <img class="shot-img" src="{rel_before}" />
    </div>
    <div class="shot-card new">
      <div class="shot-hdr">
        <span class="tag-new">SESUDAH (FONT BARU — GEOVANTA SANS)</span>
        <span class="shot-meta">UI: Geovanta Sans • Canvas &amp; Charts Default: Geovanta Sans</span>
      </div>
      <img class="shot-img" src="{rel_after}" />
    </div>
  </div>

  <div class="strip">
    <div class="typo-box old">
      <div class="typo-label old">Detail Karakter — Font Lama (IBM Plex Sans)</div>
      <div style="font-size:34px;font-weight:700;margin-bottom:4px;">Geovanta Vector Studio 0123456789</div>
      <div style="font-size:17px;margin-bottom:6px;">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz</div>
      <div style="font-size:16px;font-style:italic;color:#475569;">Italic: Desain vektor presisi dengan sudut tajam &amp; humanist konvensional.</div>
    </div>
    <div class="typo-box new">
      <div class="typo-label new">Detail Karakter — Font Baru (Geovanta Sans Custom Rounded)</div>
      <div style="font-size:34px;font-weight:700;margin-bottom:4px;">Geovanta Vector Studio 0123456789</div>
      <div style="font-size:17px;margin-bottom:6px;">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz</div>
      <div style="font-size:16px;font-style:italic;color:#13b152;">Italic: Desain vektor presisi modern dengan terminal rounded selaras Geovanta.</div>
    </div>
  </div>
</body>
</html>
"""
    html_path.write_text(html, encoding="utf-8")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 2100, "height": 1150}, device_scale_factor=1.5)
        page.goto(html_path.as_uri(), wait_until="networkidle")
        page.evaluate("() => document.fonts.ready")
        page.screenshot(path=str(out_png), full_page=True)
        browser.close()


def main() -> None:
    build_comparison(
        SCRATCH_DIR / "before_editor.png",
        SCRATCH_DIR / "after_editor.png",
        SCRATCH_DIR / "comparison_old_vs_new.png",
    )
    print("Composed comparison image:", SCRATCH_DIR / "comparison_old_vs_new.png")


if __name__ == "__main__":
    main()
