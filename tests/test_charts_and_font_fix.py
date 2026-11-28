import functools
import http.server
import socket
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT_DIR / "web"


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


def _open_editor(page):
    open_btn = page.get_by_role("button", name="Buka Editor").first
    if open_btn.count() > 0 and open_btn.is_visible():
        open_btn.click()
    else:
        page.get_by_role("button", name="Create New", exact=True).click()
        submit_btn = page.get_by_role("button", name="Buat & Buka Proyek")
        submit_btn.wait_for(state="visible", timeout=10000)
        submit_btn.click()
    page.wait_for_function("() => typeof window.__geovantaEditorApi !== 'undefined'", timeout=20000)
    page.wait_for_function("() => Boolean(globalThis.GEOVANTA_BUNDLED_TEXT_FONT)", timeout=15000)


def test_chart_geovanta_sans_never_shows_belum_ada():
    server, url = _start_web_server()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.goto(url, wait_until="networkidle")
            _open_editor(page)

            # Open Charts Studio and insert default Bar chart
            page.locator('[data-tip="veCharts"]').click()
            page.get_by_test_id("charts-studio-modal").wait_for(state="visible")

            # Verify inline SVG preview renders with clean Geovanta Sans (no trailing apostrophe)
            preview_fonts = page.evaluate("""() => {
                const svg = document.querySelector('[data-testid="charts-studio-preview"] svg');
                if (!svg) return null;
                return Array.from(svg.querySelectorAll('text')).map(t => t.getAttribute('font-family') || '');
            }""")
            assert preview_fonts is not None and len(preview_fonts) > 0
            for fam in preview_fonts:
                assert "'" not in fam, f"Unexpected quote in SVG font-family: {fam}"
                assert fam == "Geovanta Sans"

            page.get_by_test_id("charts-studio-submit").click()
            page.get_by_test_id("charts-studio-modal").wait_for(state="hidden")

            # Check every text object inside the inserted chart on canvas
            text_info = page.evaluate("""() => {
                const doc = window.__geovantaEditorApi.getDoc();
                return doc.objects
                    .filter(o => o.type === 'text')
                    .map(o => ({ id: o.id, content: o.text?.content, fontFamily: o.text?.fontFamily }));
            }""")
            assert len(text_info) > 0
            for item in text_info:
                assert item["fontFamily"] == "Geovanta Sans", f"Bad fontFamily on {item}"

            # Select a chart text object directly to inspect TextInspector
            first_text_id = text_info[0]["id"]
            page.evaluate(f"() => window.__geovantaEditorApi.setSelection(['{first_text_id}'])")
            page.wait_for_timeout(200)

            assert page.locator('[data-testid="missing-font-warning"]').count() == 0
            picker_text = page.locator('[data-tip="veFontFamily"]').inner_text()
            assert "Geovanta Sans" in picker_text
            assert "Belum ada" not in picker_text
            assert "Missing" not in picker_text

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    assert not errors, f"Page errors: {errors}"


def test_modern_chart_themes_presets_and_ux_optimizations():
    server, url = _start_web_server()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.goto(url, wait_until="networkidle")
            _open_editor(page)

            # Open Charts Studio
            page.locator('[data-tip="veCharts"]').click()
            page.get_by_test_id("charts-studio-modal").wait_for(state="visible")

            # Verify 0 native HTML inputs in Studio
            native_studio = page.evaluate("""() => {
                const m = document.querySelector('[data-testid="charts-studio-modal"]');
                return m ? m.querySelectorAll('input, select, textarea').length : -1;
            }""")
            assert native_studio == 0

            # Switch to Donut preset -> verify Donut Center Metric & preset isolation (period pills off)
            page.get_by_test_id("chart-catalog-item-pie-donut").click()
            page.wait_for_timeout(150)
            donut_svg_text = page.evaluate("""() => {
                const svg = document.querySelector('[data-testid="charts-studio-preview"] svg');
                return svg ? svg.textContent : '';
            }""")
            assert "Total" in donut_svg_text
            assert "100" in donut_svg_text

            # Apply Obsidian Dark 1-click theme in Studio
            page.get_by_test_id("studio-tab-theme").click()
            page.get_by_test_id("studio-theme-obsidian-dark").click()
            page.wait_for_timeout(150)

            # Insert Donut Dark chart to canvas
            page.get_by_test_id("charts-studio-submit").click()
            page.get_by_test_id("charts-studio-modal").wait_for(state="hidden")

            # Verify chart theme & inspector panel
            inspector = page.get_by_test_id("chart-inspector-panel")
            inspector.wait_for(state="visible")
            cfg = page.evaluate("""() => {
                const doc = window.__geovantaEditorApi.getDoc();
                const anchor = doc.objects.find(o => o.gen && o.gen.kind === 'chart');
                return {
                    themeId: anchor?.gen?.config?.themeId,
                    cardBg: anchor?.gen?.config?.card?.backgroundColor,
                    bounds: anchor?.gen?.bounds,
                };
            }""")
            assert cfg["themeId"] == "obsidian-dark"
            assert cfg["cardBg"] == "#0f172a"

            # Verify 1-click theme switching in Right Sidebar Color tab preserves bounds (no drift)
            page.get_by_test_id("chart-tab-color").click()
            page.get_by_test_id("chart-theme-emerald-fintech").click()
            page.wait_for_timeout(150)
            cfg2 = page.evaluate("""() => {
                const doc = window.__geovantaEditorApi.getDoc();
                const anchor = doc.objects.find(o => o.gen && o.gen.kind === 'chart');
                return {
                    themeId: anchor?.gen?.config?.themeId,
                    bounds: anchor?.gen?.bounds,
                };
            }""")
            assert cfg2["themeId"] == "emerald-fintech"
            assert cfg2["bounds"] == cfg["bounds"]

            # Verify Data Editor Sort Desc quick action works
            page.get_by_test_id("chart-tab-data").click()
            page.get_by_test_id("chart-data-sort-desc").click()
            page.wait_for_timeout(150)
            sorted_vals = page.evaluate("""() => {
                const doc = window.__geovantaEditorApi.getDoc();
                const anchor = doc.objects.find(o => o.gen && o.gen.kind === 'chart');
                return (anchor?.gen?.config?.data?.items || []).map(x => x.value);
            }""")
            assert sorted_vals == sorted(sorted_vals, reverse=True)

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    assert not errors, f"Page errors: {errors}"


def test_studio_preview_is_crisp_unrasterized_vector():
    server, url = _start_web_server()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.goto(url, wait_until="networkidle")
            _open_editor(page)

            page.locator('[data-tip="veCharts"]').click()
            page.get_by_test_id("charts-studio-modal").wait_for(state="visible")
            page.wait_for_timeout(200)

            info = page.evaluate("""() => {
                const modal = document.querySelector('[data-testid="charts-studio-modal"]');
                const preview = document.querySelector('[data-testid="charts-studio-preview"]');
                const svg = preview?.querySelector('svg');
                const modalStyle = modal ? getComputedStyle(modal) : null;
                return {
                    widthAttr: svg?.getAttribute('width'),
                    heightAttr: svg?.getAttribute('height'),
                    viewBox: svg?.getAttribute('viewBox'),
                    shapeRendering: svg?.getAttribute('shape-rendering'),
                    textRendering: svg?.getAttribute('text-rendering'),
                    preserveAspectRatio: svg?.getAttribute('preserveAspectRatio'),
                    modalTransform: modalStyle?.transform,
                };
            }""")
            assert info["widthAttr"] == "600"
            assert info["heightAttr"] == "420"
            assert info["viewBox"] == "0 0 600 420"
            assert info["shapeRendering"] == "geometricPrecision"
            assert info["textRendering"] == "geometricPrecision"
            assert info["preserveAspectRatio"] == "xMidYMid meet"
            assert info["modalTransform"] in ("none", "")

            # Verify 150% zoom scales cleanly to exact integer 900x630
            page.get_by_test_id("studio-zoom-150").click()
            page.wait_for_timeout(100)
            zoomed = page.evaluate("""() => {
                const svg = document.querySelector('[data-testid="charts-studio-preview"] svg');
                return {
                    w: svg?.getAttribute('width'),
                    h: svg?.getAttribute('height'),
                };
            }""")
            assert zoomed == {"w": "900", "h": "630"}

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    assert not errors, f"Page errors: {errors}"


def test_25_distinct_chart_styles_preserve_colors():
    server, url = _start_web_server()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.goto(url, wait_until="networkidle")
            _open_editor(page)

            page.locator('[data-tip="veCharts"]').click()
            page.get_by_test_id("charts-studio-modal").wait_for(state="visible")

            # Set a distinct palette first (vivid-pop) to verify styles do NOT overwrite colors
            page.get_by_test_id("studio-tab-color").click()
            page.locator('[data-testid="charts-studio-modal"] button', has_text="Vivid Pop").click()
            page.get_by_test_id("studio-tab-style").click()
            page.wait_for_timeout(100)

            style_ids = page.evaluate("""() =>
                Array.from(document.querySelectorAll('[data-testid^="studio-style-"]')).map(el =>
                    el.getAttribute('data-testid').replace('studio-style-', '')
                )
            """)
            assert len(style_ids) == 25, f"Expected 25 styles in Studio, got {len(style_ids)}"

            for sid in style_ids:
                btn = page.get_by_test_id(f"studio-style-{sid}")
                btn.scroll_into_view_if_needed()
                btn.click()
                svg_ok = page.evaluate("""() => {
                    const svg = document.querySelector('[data-testid="charts-studio-preview"] svg');
                    if (!svg) return false;
                    const empty = Array.from(svg.querySelectorAll('path')).filter(p => !(p.getAttribute('d') || '').trim()).length;
                    return empty === 0 && svg.querySelectorAll('path, rect, circle').length >= 5;
                }""")
                assert svg_ok, f"Style {sid} rendered invalid SVG"

            # Insert with Neo-Brutalist style
            page.get_by_test_id("studio-style-neo-brutalist").scroll_into_view_if_needed()
            page.get_by_test_id("studio-style-neo-brutalist").click()
            page.get_by_test_id("charts-studio-submit").click()
            page.get_by_test_id("charts-studio-modal").wait_for(state="hidden")

            # Verify Neo-Brutalist structural config & preserved vivid-pop palette
            cfg = page.evaluate("""() => {
                const doc = window.__geovantaEditorApi.getDoc();
                const anchor = doc.objects.find(o => o.gen && o.gen.kind === 'chart');
                return anchor?.gen?.config;
            }""")
            assert cfg["chartStyleId"] == "neo-brutalist"
            assert cfg["paletteId"] == "vivid-pop"
            assert cfg["card"]["shadow"] == "hard"
            assert cfg["seriesStyle"]["barOutline"] is True

            # Verify 25 styles in Right Sidebar Inspector
            page.get_by_test_id("chart-tab-style").click()
            inspector_style_ids = page.evaluate("""() =>
                Array.from(document.querySelectorAll('[data-testid^="chart-style-"]')).map(el =>
                    el.getAttribute('data-testid').replace('chart-style-', '')
                )
            """)
            assert len(inspector_style_ids) == 25

            # Switch to wireframe-outline and verify structural change + preserved vivid-pop colors
            page.get_by_test_id("chart-style-wireframe-outline").scroll_into_view_if_needed()
            page.get_by_test_id("chart-style-wireframe-outline").click()
            page.wait_for_timeout(150)
            cfg2 = page.evaluate("""() => {
                const doc = window.__geovantaEditorApi.getDoc();
                const anchor = doc.objects.find(o => o.gen && o.gen.kind === 'chart');
                return anchor?.gen?.config;
            }""")
            assert cfg2["chartStyleId"] == "wireframe-outline"
            assert cfg2["paletteId"] == "vivid-pop"
            assert cfg2["seriesStyle"]["outlineOnly"] is True

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    assert not errors, f"Page errors: {errors}"
