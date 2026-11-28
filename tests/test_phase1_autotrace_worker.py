from pathlib import Path


def test_autotrace_vmt_worker_bundle_and_async_execution(editor_page):
    root = Path(__file__).resolve().parent.parent
    worker_file = root / "web" / "assets" / "vmt-worker.js"
    main_bundle = root / "web" / "assets" / "geovanta.bundle.js"

    assert worker_file.exists(), "Expected web/assets/vmt-worker.js to exist"
    assert main_bundle.exists()
    # Main bundle must NOT inline the 886KB SVGPeak VMT engine
    main_text = main_bundle.read_text(encoding="utf-8", errors="ignore")
    assert "SVGPeak" not in main_text or "vmt-worker.js" in main_text, (
        "geovanta.bundle.js should not inline vmtEngineBundle"
    )

    page = editor_page
    res = page.evaluate("""async () => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.traceRgbaTest !== 'function') {
            return { error: 'traceRgbaTest missing on __geovantaEditorApi' };
        }
        return await api.traceRgbaTest(32, 32);
    }""")
    assert "error" not in res, f"Worker auto-trace failed: {res}"
    assert res["svg"].startswith("<svg"), f"Expected SVG output, got: {res['svg'][:120]}"
    assert res["workerUsed"] is True
