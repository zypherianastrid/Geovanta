import functools
import http.server
import json
import socket
import subprocess
import threading
from pathlib import Path

from fontTools.ttLib import TTFont
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
ASSET_DIR = ROOT_DIR / "src" / "assets" / "fonts" / "geovanta-sans"
EXPORT_DIR = ROOT_DIR / "fonts" / "GeovantaSans"
WEB_DIR = ROOT_DIR / "web"

FACES = [
    ("Regular", 400, False),
    ("Bold", 700, False),
    ("Italic", 400, True),
    ("BoldItalic", 700, True),
]
FORMATS = ("ttf", "otf", "woff2")


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def _start_web_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    handler = functools.partial(_QuietHandler, directory=str(WEB_DIR))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{port}/"


def test_all_font_files_exist_in_assets_and_export():
    for folder in (ASSET_DIR, EXPORT_DIR):
        assert folder.is_dir(), f"Missing directory: {folder}"
        assert (folder / "Geovanta-Sans-LICENSE.txt").is_file()
        for style, _, _ in FACES:
            for ext in FORMATS:
                fpath = folder / f"GeovantaSans-{style}.{ext}"
                assert fpath.is_file(), f"Missing font file: {fpath}"
                assert fpath.stat().st_size > 5000, f"Font file unexpectedly small: {fpath}"


def test_fonttools_metadata_cmap_and_kerning():
    required_cps = list(range(ord("A"), ord("Z") + 1)) + list(range(ord("a"), ord("z") + 1)) + list(range(ord("0"), ord("9") + 1))
    for style, expected_weight, expected_italic in FACES:
        for ext in ("ttf", "otf"):
            fpath = ASSET_DIR / f"GeovantaSans-{style}.{ext}"
            tt = TTFont(str(fpath))
            try:
                family = tt["name"].getDebugName(1)
                assert family == "Geovanta Sans", f"{fpath} family={family}"
                assert tt["OS/2"].usWeightClass == expected_weight
                is_italic = bool(tt["OS/2"].fsSelection & 1) and bool(tt["head"].macStyle & 2)
                assert is_italic == expected_italic
                cmap = tt.getBestCmap()
                assert cmap is not None
                for cp in required_cps:
                    assert cp in cmap, f"Missing U+{cp:04X} in {fpath}"
                assert "kern" in tt, f"Missing kern table in {fpath}"
                assert len(tt["kern"].kernTables[0].kernTable) >= 20
            finally:
                tt.close()

        # Verify WOFF2 flavor opens cleanly
        woff2 = TTFont(str(ASSET_DIR / f"GeovantaSans-{style}.woff2"))
        try:
            assert woff2.flavor == "woff2"
            assert woff2["name"].getDebugName(1) == "Geovanta Sans"
        finally:
            woff2.close()


def test_opentype_js_parses_all_ttf_and_otf_faces():
    script = """
    const opentype = require('opentype.js');
    const fs = require('fs');
    const path = require('path');
    const dir = process.argv[1];
    const styles = ['Regular', 'Bold', 'Italic', 'BoldItalic'];
    const exts = ['ttf', 'otf'];
    const results = [];
    for (const s of styles) {
      for (const e of exts) {
        const p = path.join(dir, `GeovantaSans-${s}.${e}`);
        const buf = fs.readFileSync(p);
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const f = opentype.parse(ab);
        const fam = (f.names.windows?.fontFamily || f.names.unicode?.fontFamily || f.names.macintosh?.fontFamily || f.names.fontFamily)?.en;
        results.push({ file: `GeovantaSans-${s}.${e}`, family: fam, numGlyphs: f.numGlyphs });
      }
    }
    console.log(JSON.stringify(results));
    """
    proc = subprocess.run(
        ["node", "-e", script, str(ASSET_DIR)],
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
        check=True,
    )
    parsed = json.loads(proc.stdout.strip())
    assert len(parsed) == 8
    for item in parsed:
        assert item["family"] == "Geovanta Sans"
        assert item["numGlyphs"] >= 150


def test_geovanta_editor_uses_geovanta_sans_as_default_e2e():
    server, url = _start_web_server()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.goto(url, wait_until="networkidle")
            page.evaluate("() => document.fonts.ready")

            # Verify UI uses Geovanta Sans right from WorkspaceHome
            home_info = page.evaluate(
                """() => {
                    const loaded = [];
                    for (const f of document.fonts) {
                        if (f.status === 'loaded') loaded.push(f.family.replace(/['"]/g, ''));
                    }
                    return {
                        bodyFont: getComputedStyle(document.body).fontFamily,
                        loaded: Array.from(new Set(loaded))
                    };
                }"""
            )
            assert "Geovanta Sans" in home_info["bodyFont"]
            assert "Geovanta Sans" in home_info["loaded"]

            # Enter Vector Editor
            open_btn = page.get_by_role("button", name="Buka Editor").first
            if open_btn.count() > 0 and open_btn.is_visible():
                open_btn.click()
            else:
                create_btn = page.get_by_role("button", name="Create New", exact=True)
                create_btn.click()
                submit_btn = page.get_by_role("button", name="Buat & Buka Proyek")
                submit_btn.wait_for(state="visible", timeout=10000)
                submit_btn.click()

            page.wait_for_function("() => typeof window.__geovantaEditorApi !== 'undefined'", timeout=20000)
            page.wait_for_function("() => Boolean(globalThis.GEOVANTA_BUNDLED_TEXT_FONT)", timeout=15000)

            editor_info = page.evaluate(
                """() => {
                    const api = window.__geovantaEditorApi;
                    api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
                    const txt = api.createTestShape('text', 100, 120, 300, 48);
                    return {
                        bundledFamily: globalThis.GEOVANTA_BUNDLED_TEXT_FONT?.family || null,
                        bundledFaces: Object.keys(globalThis.GEOVANTA_BUNDLED_TEXT_FONT?.faces || {}),
                        createdTextFamily: txt?.text?.fontFamily || txt?.fontFamily || null,
                        bodyFont: getComputedStyle(document.body).fontFamily
                    };
                }"""
            )
            assert editor_info["bundledFamily"] == "Geovanta Sans"
            assert set(editor_info["bundledFaces"]) == {"regular", "bold", "italic", "boldItalic"}
            assert editor_info["createdTextFamily"] == "Geovanta Sans"
            assert "Geovanta Sans" in editor_info["bodyFont"]

            # Verify Text Inspector renders Geovanta Sans as active font family without missing warning
            page.wait_for_timeout(300)
            inspector_text = page.locator('[data-tip="veFontFamily"]').inner_text()
            assert "Geovanta Sans" in inspector_text
            assert "Belum ada" not in inspector_text
            assert "Missing" not in inspector_text
            assert page.locator('[data-testid="missing-font-warning"]').count() == 0

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    assert not errors, f"Page errors detected: {errors}"


def test_text_tool_editing_shows_geovanta_sans_available_and_reloads_stale_runtime():
    server, url = _start_web_server()
    errors = []
    font_runtime_requests = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.on("request", lambda req: font_runtime_requests.append(req.url) if "text-font-runtime.js" in req.url else None)

            # Simulate stale cached global from older IBM Plex Sans build before editor loads
            page.add_init_script(
                """() => {
                    globalThis.GEOVANTA_BUNDLED_TEXT_FONT = { family: 'IBM Plex Sans', faces: {} };
                    try { localStorage.setItem('geovanta-last-text-family', 'IBM Plex Sans'); } catch (e) {}
                }"""
            )
            page.goto(url, wait_until="networkidle")

            open_btn = page.get_by_role("button", name="Buka Editor").first
            if open_btn.count() > 0 and open_btn.is_visible():
                open_btn.click()
            else:
                create_btn = page.get_by_role("button", name="Create New", exact=True)
                create_btn.click()
                submit_btn = page.get_by_role("button", name="Buat & Buka Proyek")
                submit_btn.wait_for(state="visible", timeout=10000)
                submit_btn.click()

            page.wait_for_function("() => typeof window.__geovantaEditorApi !== 'undefined'", timeout=20000)
            page.wait_for_function("() => globalThis.GEOVANTA_BUNDLED_TEXT_FONT?.family === 'Geovanta Sans'", timeout=15000)

            assert any("text-font-runtime.js?v=" in u for u in font_runtime_requests), f"Expected ?v= cache-buster in {font_runtime_requests}"

            # Enter Text Tool and click on canvas to start text editing
            page.evaluate("() => window.__geovantaEditorApi.setTool('text')")
            canvas_box = page.locator(".ved-canvas").bounding_box()
            assert canvas_box is not None
            page.mouse.click(canvas_box["x"] + canvas_box["width"] * 0.45, canvas_box["y"] + canvas_box["height"] * 0.45)

            page.locator('[data-testid="text-edit-overlay"]').wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(300)

            assert page.locator('[data-testid="missing-font-warning"]').count() == 0
            picker_text = page.locator('[data-tip="veFontFamily"]').inner_text()
            assert "Geovanta Sans" in picker_text
            assert "Belum ada" not in picker_text
            assert "Missing" not in picker_text

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    assert not errors, f"Page errors detected: {errors}"
