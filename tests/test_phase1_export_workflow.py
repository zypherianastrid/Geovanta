import re
from playwright.sync_api import expect


def test_export_workflow_dynamic_filename_quality_and_svg_minify(editor_page):
    page = editor_page

    # Switch right inspector to Export / Canvas view (ensure no object is selected so Export panel shows)
    page.evaluate("() => window.__geovantaEditorApi.setSelObjs([])")

    # Filename preview must reflect project name, NOT hardcoded 'geovanta-edit'
    preview = page.locator('[data-testid="export-filename-preview"]')
    expect(preview).to_be_visible()
    preview_text = preview.inner_text().strip()
    assert preview_text.endswith(".svg"), f"Expected .svg preview, got: {preview_text}"
    assert "geovanta-edit" not in preview_text, f"Filename should be dynamic, got: {preview_text}"

    # SVG Minify toggle should be visible when SVG format is selected
    svg_minify = page.locator('[data-testid="export-svg-minify"]')
    expect(svg_minify).to_be_visible()

    # Switch to JPG format -> quality slider must appear, SVG minify must disappear
    page.locator('[data-tip="veExp_jpg"]').click()
    quality_slider = page.locator('[data-testid="export-quality-slider"]')
    expect(quality_slider).to_be_visible()
    expect(svg_minify).to_be_hidden()

    # Filename preview updates extension to .jpg
    assert preview.inner_text().strip().endswith(".jpg")

    # Switch back to SVG and trigger download -> verify downloaded filename matches preview
    page.locator('[data-tip="veExp_svg"]').click()
    expected_name = preview.inner_text().strip()
    with page.expect_download() as dl_info:
        page.locator('[data-tip="veDownload"]').click()
    download = dl_info.value
    assert download.suggested_filename == expected_name
    assert re.match(r"^[a-zA-Z0-9._-]+\.svg$", download.suggested_filename)

    # Batch export button must be visible
    batch_btn = page.locator('[data-testid="export-batch-btn"]')
    expect(batch_btn).to_be_visible()
