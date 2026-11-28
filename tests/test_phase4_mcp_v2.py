import subprocess
from pathlib import Path


def test_mcp_server_v2_tools_and_live_screenshot_api(editor_page):
    root = Path(__file__).resolve().parent.parent
    tools_text = (root / "scripts" / "mcp-server" / "tools.js").read_text(encoding="utf-8")
    for name in (
        "geovanta_live_screenshot",
        "geovanta_charts_create",
        "geovanta_effects_apply",
        "geovanta_autolayout_apply",
    ):
        assert name in tools_text, f"Missing MCP v2 tool: {name}"

    # Verify Node syntax of MCP server files
    for js_file in ("scripts/mcp-server/tools.js", "scripts/mcp-server/index.js"):
        chk = subprocess.run(["node", "--check", str(root / js_file)], capture_output=True, text=True)
        assert chk.returncode == 0, f"Syntax check failed for {js_file}: {chk.stderr}"

    # Verify live canvas screenshot capture in browser
    page = editor_page
    shot = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.captureCanvasScreenshot !== 'function') return null;
        return api.captureCanvasScreenshot();
    }""")
    assert isinstance(shot, str) and shot.startswith("data:image/png;base64,"), f"Invalid screenshot: {shot}"
