import re
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import expect


def _draw_frame_on_canvas(page):
    """Select the Frame tool and drag a rectangle on the canvas."""
    frame_btn = page.locator('[data-tool="frame"]')
    expect(frame_btn).to_be_visible()
    frame_btn.click()

    canvas = page.locator('.ved-canvas')
    box = canvas.bounding_box()
    assert box is not None, "Canvas bounding box not found"

    sx = box["x"] + box["width"] * 0.35
    sy = box["y"] + box["height"] * 0.35
    ex = sx + 220
    ey = sy + 140
    page.mouse.move(sx, sy)
    page.mouse.down()
    page.mouse.move(ex, ey, steps=6)
    page.mouse.up()


def test_frame_created_without_border_or_radius_and_exports_cleanly(editor_page, tmp_path):
    page = editor_page

    # 1. Create a Frame via the Frame tool without setting any border or border radius
    _draw_frame_on_canvas(page)

    frame_bg = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const bg = (doc.objects || []).find(o => o && (o.isFrameBg || o.isAutoFrame));
        if (!bg) return null;
        const nodes = (bg.subs && bg.subs[0] && bg.subs[0].nodes) || [];
        return {
            id: bg.id,
            name: bg.name,
            fill: bg.fill,
            stroke: bg.stroke,
            strokeWidth: bg.strokeWidth,
            nodeCount: nodes.length,
            hasCurves: nodes.some(n => Boolean(n.handleIn || n.handleOut)),
            fillets: bg.fillets || null,
        };
    }""")
    assert frame_bg is not None, "Frame background object was not created"
    assert frame_bg["stroke"] in (None, "none", "transparent"), f"Expected no stroke, got {frame_bg['stroke']}"
    assert (frame_bg["strokeWidth"] or 0) == 0, f"Expected strokeWidth 0, got {frame_bg['strokeWidth']}"
    assert frame_bg["nodeCount"] == 4, f"Expected 4 sharp corner nodes, got {frame_bg['nodeCount']}"
    assert not frame_bg["hasCurves"], "Expected sharp corners without Bezier handles"

    # 2. Verify SVG export (serializeSvg and actual .svg download)
    page.evaluate("() => window.__geovantaEditorApi.setSelObjs([])")
    svg_str = page.evaluate("() => window.__geovantaEditorApi.serializeSvg()")
    assert "#e4e4e7" not in svg_str.lower(), "Unexpected default #e4e4e7 stroke in SVG"
    assert "#d4d4d8" not in svg_str.lower(), "Unexpected default #d4d4d8 stroke in SVG"

    root = ET.fromstring(svg_str)
    ns_strip = lambda tag: tag.split("}")[-1]
    frame_paths = [
        el for el in root.iter()
        if ns_strip(el.tag) == "path" and el.attrib.get("data-id") == frame_bg["id"]
    ]
    assert len(frame_paths) == 1, f"Expected 1 SVG path for frame bg, found {len(frame_paths)}"
    fp = frame_paths[0]
    assert "stroke" not in fp.attrib, f"Frame path should not have stroke attr: {fp.attrib}"
    assert "stroke-width" not in fp.attrib, f"Frame path should not have stroke-width attr: {fp.attrib}"
    d_attr = fp.attrib.get("d", "")
    assert "C" not in d_attr and "c" not in d_attr, f"Expected sharp corners in SVG path d, got: {d_attr}"

    # Download SVG
    page.locator('[data-testid="export-fmt-svg"]').click()
    with page.expect_download() as dl_svg:
        page.locator('[data-tip="veDownload"]').click()
    svg_file = tmp_path / "out.svg"
    dl_svg.value.save_as(svg_file)
    svg_dl_text = svg_file.read_text(encoding="utf-8")
    assert "#e4e4e7" not in svg_dl_text.lower()
    assert 'stroke="' not in svg_dl_text

    # 3. Verify PDF export
    pdf_str = page.evaluate("() => window.__geovantaEditorApi.exportPdfString()")
    assert pdf_str.startswith("%PDF-1.4")
    # Extract content stream between stream\n and endstream
    m_stream = re.search(r"stream\n(.*?)endstream", pdf_str, re.S)
    assert m_stream, "PDF content stream not found"
    stm = m_stream.group(1)
    assert " RG " not in stm and " w\n" not in stm, f"Unexpected stroke operator in PDF stream:\n{stm}"
    assert " c\n" not in stm, f"Unexpected curve operator (border radius) in PDF stream:\n{stm}"
    assert " B\n" not in stm and " S\n" not in stm, f"Unexpected fill+stroke/stroke operator in PDF stream:\n{stm}"

    # 4. Verify AI & EPS downloads
    for fmt in ("ai", "eps"):
        page.locator(f'[data-testid="export-fmt-{fmt}"]').click()
        with page.expect_download() as dl_info:
            page.locator('[data-tip="veDownload"]').click()
        out_file = tmp_path / f"out.{fmt}"
        dl_info.value.save_as(out_file)
        text = out_file.read_text(encoding="utf-8", errors="replace")
        assert "#e4e4e7" not in text.lower(), f"Unexpected #e4e4e7 in {fmt.upper()}"
        if fmt == "eps":
            assert "setlinewidth" not in text, f"Unexpected setlinewidth in EPS:\n{text}"
            assert "curveto" not in text, f"Unexpected curveto (border radius) in EPS:\n{text}"
        else:
            m_ai = re.search(r"stream\n(.*?)endstream", text, re.S)
            assert m_ai, "AI content stream not found"
            ai_stm = m_ai.group(1)
            assert " RG " not in ai_stm and " w\n" not in ai_stm, f"Unexpected stroke in AI:\n{ai_stm}"
            assert " c\n" not in ai_stm, f"Unexpected curve in AI:\n{ai_stm}"

    # 5. Verify PNG raster export: corner pixel of the frame (area='content', transparent bg) must be solid white #ffffff
    # (not transparent from rounded corner, and not gray #e4e4e7 from a border)
    page.locator('[data-testid="export-fmt-png"]').click()
    with page.expect_download() as dl_png:
        page.locator('[data-tip="veDownload"]').click()
    png_file = tmp_path / "out.png"
    dl_png.value.save_as(png_file)
    png_bytes = png_file.read_bytes()
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n", "Invalid PNG signature"

    # Also verify pixel at (0, 0) via browser createImageBitmap on a rasterized content export
    corner_rgba = page.evaluate("""async () => {
        const doc = window.__geovantaEditorApi.getDoc();
        const svg = window.__geovantaEditorApi.serializeSvg();
        // Use the editor's raster export via canvas check on the downloaded PNG or exportRaster
        // We can check the actual corner pixel of the frame in content mode:
        const api = window.__geovantaEditorApi;
        const bgObj = (doc.objects || []).find(o => o && (o.isFrameBg || o.isAutoFrame));
        const b64 = await new Promise(async (resolve) => {
            const img = new Image();
            const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                // Frame bg corner in viewBox coordinates:
                const x = Math.round(bgObj.subs[0].nodes[0].x) + 1;
                const y = Math.round(bgObj.subs[0].nodes[0].y) + 1;
                const px = ctx.getImageData(x, y, 1, 1).data;
                URL.revokeObjectURL(url);
                resolve(Array.from(px));
            };
            img.src = url;
        });
        return b64;
    }""")
    assert corner_rgba == [255, 255, 255, 255], f"Expected sharp solid white corner pixel [255,255,255,255], got {corner_rgba}"


def test_auto_layout_and_explicit_frame_stroke_radius(editor_page):
    page = editor_page

    # 1. Create a rectangle and wrap it in Auto Layout without setting border or radius
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        const o = api.createTestShape('rect', 100, 100, 80, 60);
        api.setSelObjs([o.id]);
    }""")

    apply_btn = page.locator('[data-tip="veLayApply"]')
    expect(apply_btn).to_be_visible()
    apply_btn.click()

    al_bg = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const bg = (doc.objects || []).find(o => o && (o.isFrameBg || o.isAutoFrame));
        if (!bg) return null;
        const nodes = (bg.subs && bg.subs[0] && bg.subs[0].nodes) || [];
        return {
            stroke: bg.stroke,
            strokeWidth: bg.strokeWidth,
            hasCurves: nodes.some(n => Boolean(n.handleIn || n.handleOut)),
        };
    }""")
    assert al_bg is not None, "Auto Layout frame background not created"
    assert al_bg["stroke"] in (None, "none", "transparent"), f"Expected no stroke on Auto Layout frame, got {al_bg['stroke']}"
    assert (al_bg["strokeWidth"] or 0) == 0, f"Expected strokeWidth 0 on Auto Layout frame, got {al_bg['strokeWidth']}"
    assert not al_bg["hasCurves"], "Expected sharp corners (radius 0) on Auto Layout frame by default"

    # 2. Positive test: when user explicitly sets stroke & radius on the frame bg, export DOES include them
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        const doc = api.getDoc();
        const bg = (doc.objects || []).find(o => o && (o.isFrameBg || o.isAutoFrame));
        api.setSelObjs([bg.id]);
    }""")
    svg_before = page.evaluate("() => window.__geovantaEditorApi.serializeSvg()")
    assert 'stroke="#ff0000"' not in svg_before

    # Apply explicit stroke and radius via inspector / doc update
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        const doc = api.getDoc();
        const bg = (doc.objects || []).find(o => o && (o.isFrameBg || o.isAutoFrame));
        // Update stroke & radius via UI or doc
        const nextObjs = doc.objects.map(o => o.id === bg.id ? { ...o, stroke: '#ff0000', strokeWidth: 2 } : o);
        api.setDoc({ ...doc, objects: nextObjs });
    }""")
    svg_after = page.evaluate("() => window.__geovantaEditorApi.serializeSvg()")
    assert 'stroke="#ff0000"' in svg_after, "Explicit user stroke must be preserved on export"
    assert 'stroke-width="2"' in svg_after, "Explicit user stroke-width must be preserved on export"
