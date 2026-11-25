import functools
import http.server
import socket
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

DIST_DIR = Path(__file__).resolve().parent.parent / "web"


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


@pytest.fixture(scope="session")
def app_url():
    port = _free_port()
    handler = functools.partial(_QuietHandler, directory=str(DIST_DIR))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}/"
    finally:
        server.shutdown()
        server.server_close()


@pytest.fixture
def editor_page(app_url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(app_url, wait_until="networkidle")

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

        page.wait_for_function("() => typeof window.__geovantaEditorApi !== 'undefined'", timeout=15000)
        yield page
        browser.close()
