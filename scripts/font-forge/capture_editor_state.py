import argparse
import functools
import http.server
import json
import socket
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parents[2]
WEB_DIR = ROOT_DIR / "web"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def start_server(directory: Path):
    port = get_free_port()
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{port}/"


def capture_state(out_png: Path, out_meta: Path) -> None:
    out_png.parent.mkdir(parents=True, exist_ok=True)
    out_meta.parent.mkdir(parents=True, exist_ok=True)
    server, url = start_server(WEB_DIR)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1440, "height": 900},
                device_scale_factor=2,
            )
            page = context.new_page()
            page.goto(url, wait_until="networkidle")

            open_btn = page.get_by_role("button", name="Buka Editor").first
            if open_btn.count() > 0 and open_btn.is_visible():
                open_btn.click()
            else:
                create_btn = page.get_by_role("button", name="Create New", exact=True)
                if create_btn.count() > 0 and create_btn.is_visible():
                    create_btn.click()
                    submit_btn = page.get_by_role("button", name="Buat & Buka Proyek")
                    submit_btn.wait_for(state="visible", timeout=10000)
                    submit_btn.click()

            page.wait_for_function("() => typeof window.__geovantaEditorApi !== 'undefined'", timeout=20000)
            page.wait_for_selector(".ved-canvas", state="visible", timeout=15000)
            page.wait_for_function("() => Boolean(globalThis.GEOVANTA_BUNDLED_TEXT_FONT)", timeout=15000)
            page.evaluate("() => document.fonts.ready")
            time.sleep(0.6)

            meta = page.evaluate(
                """() => {
                    const api = window.__geovantaEditorApi;
                    api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
                    api.setTool('select');
                    const probe = api.createTestShape('text', 80, 120, 400, 50);
                    const defaultFam = probe?.text?.fontFamily || probe?.fontFamily || 'IBM Plex Sans';
                    const doc = {
                        viewBox: [0, 0, 800, 600],
                        styles: [],
                        objects: [
                            {
                                id: 'bg-card',
                                name: 'Showcase Card',
                                type: 'rect',
                                x: 56,
                                y: 64,
                                width: 688,
                                height: 472,
                                rx: 28,
                                ry: 28,
                                fill: '#ffffff',
                                stroke: '#e2e8f0',
                                strokeWidth: 2,
                                opacity: 1,
                                subs: []
                            },
                            {
                                id: 'accent-pill',
                                name: 'Badge',
                                type: 'rect',
                                x: 96,
                                y: 106,
                                width: 176,
                                height: 34,
                                rx: 17,
                                ry: 17,
                                fill: '#dcfce7',
                                opacity: 1,
                                subs: []
                            },
                            {
                                id: 'txt-badge',
                                name: 'Badge Label',
                                type: 'text',
                                subs: [],
                                opacity: 1,
                                fill: '#15803d',
                                text: {
                                    content: 'DEFAULT TYPEFACE',
                                    x: 114,
                                    y: 128,
                                    fontSize: 13,
                                    fontFamily: defaultFam,
                                    fontWeight: 'bold',
                                    fontStyle: 'normal',
                                    textAnchor: 'start',
                                    verticalAlign: 'top',
                                    resizing: 'autoWidth',
                                    fill: '#15803d',
                                    lineHeight: 1.2,
                                    letterSpacing: 0.6,
                                    fontAssetId: null
                                }
                            },
                            {
                                id: 'txt-heading',
                                name: 'Heading',
                                type: 'text',
                                subs: [],
                                opacity: 1,
                                fill: '#0f172a',
                                text: {
                                    content: 'Geovanta Vector Studio',
                                    x: 96,
                                    y: 214,
                                    fontSize: 44,
                                    fontFamily: defaultFam,
                                    fontWeight: 'bold',
                                    fontStyle: 'normal',
                                    textAnchor: 'start',
                                    verticalAlign: 'top',
                                    resizing: 'autoWidth',
                                    fill: '#0f172a',
                                    lineHeight: 1.15,
                                    letterSpacing: 0,
                                    fontAssetId: null
                                }
                            },
                            {
                                id: 'txt-sub',
                                name: 'Subtitle',
                                type: 'text',
                                subs: [],
                                opacity: 1,
                                fill: '#334155',
                                text: {
                                    content: 'Modern Geometric Rounded Design  0123456789',
                                    x: 96,
                                    y: 274,
                                    fontSize: 22,
                                    fontFamily: defaultFam,
                                    fontWeight: 'normal',
                                    fontStyle: 'normal',
                                    textAnchor: 'start',
                                    verticalAlign: 'top',
                                    resizing: 'autoWidth',
                                    fill: '#334155',
                                    lineHeight: 1.3,
                                    letterSpacing: 0,
                                    fontAssetId: null
                                }
                            },
                            {
                                id: 'txt-alpha',
                                name: 'Alphabet',
                                type: 'text',
                                subs: [],
                                opacity: 1,
                                fill: '#475569',
                                text: {
                                    content: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq',
                                    x: 96,
                                    y: 336,
                                    fontSize: 18,
                                    fontFamily: defaultFam,
                                    fontWeight: 'normal',
                                    fontStyle: 'normal',
                                    textAnchor: 'start',
                                    verticalAlign: 'top',
                                    resizing: 'autoWidth',
                                    fill: '#475569',
                                    lineHeight: 1.4,
                                    letterSpacing: 0,
                                    fontAssetId: null
                                }
                            },
                            {
                                id: 'txt-italic',
                                name: 'Italic Sample',
                                type: 'text',
                                subs: [],
                                opacity: 1,
                                fill: '#13b152',
                                text: {
                                    content: 'Sphinx of black quartz, judge my vow! (Italic)',
                                    x: 96,
                                    y: 392,
                                    fontSize: 20,
                                    fontFamily: defaultFam,
                                    fontWeight: 'normal',
                                    fontStyle: 'italic',
                                    textAnchor: 'start',
                                    verticalAlign: 'top',
                                    resizing: 'autoWidth',
                                    fill: '#13b152',
                                    lineHeight: 1.35,
                                    letterSpacing: 0,
                                    fontAssetId: null
                                }
                            },
                            {
                                id: 'txt-bolditalic',
                                name: 'Bold Italic Sample',
                                type: 'text',
                                subs: [],
                                opacity: 1,
                                fill: '#64748b',
                                text: {
                                    content: 'Typography & Vector Precision — 100% Custom Font',
                                    x: 96,
                                    y: 448,
                                    fontSize: 18,
                                    fontFamily: defaultFam,
                                    fontWeight: 'bold',
                                    fontStyle: 'italic',
                                    textAnchor: 'start',
                                    verticalAlign: 'top',
                                    resizing: 'autoWidth',
                                    fill: '#64748b',
                                    lineHeight: 1.35,
                                    letterSpacing: 0,
                                    fontAssetId: null
                                }
                            }
                        ]
                    };
                    api.setDoc(doc);
                    api.setSelObjs(['txt-heading']);
                    const loadedFonts = [];
                    for (const f of document.fonts) {
                        if (f.status === 'loaded') loadedFonts.push(f.family + ':' + f.weight + ':' + f.style);
                    }
                    return {
                        bundledFamily: globalThis.GEOVANTA_BUNDLED_TEXT_FONT?.family || null,
                        defaultTextFontFamily: defaultFam,
                        bodyFontFamily: getComputedStyle(document.body).fontFamily,
                        loadedFonts
                    };
                }"""
            )
            time.sleep(1.0)
            page.screenshot(path=str(out_png), full_page=False)
            out_meta.write_text(json.dumps(meta, indent=2), encoding="utf-8")
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--meta", required=True)
    args = parser.parse_args()
    capture_state(Path(args.out), Path(args.meta))


if __name__ == "__main__":
    main()
