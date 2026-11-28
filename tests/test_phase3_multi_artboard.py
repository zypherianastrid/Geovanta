from playwright.sync_api import expect


def test_multi_artboard_manager_and_multipage_pdf(editor_page):
    page = editor_page

    # Open Artboard Manager from Left Sidebar
    toggle_btn = page.locator('[data-testid="toggle-artboards-btn"]')
    expect(toggle_btn).to_be_visible()
    toggle_btn.click()

    panel = page.locator('[data-testid="artboard-manager-panel"]')
    expect(panel).to_be_visible()

    # Add a second artboard
    page.locator('[data-testid="add-artboard-btn"]').click()
    abs_list = page.evaluate("() => window.__geovantaEditorApi.getArtboards()")
    assert len(abs_list) == 2, f"Expected 2 artboards, got: {abs_list}"

    # Switch back to first artboard
    page.locator('[data-testid="artboard-item-0"]').click()
    active_id = page.evaluate("() => window.__geovantaEditorApi.getDoc().activeArtboardId")
    assert active_id == abs_list[0]["id"]

    # Export Multi-Page PDF and verify 2 pages
    pdf_str = page.evaluate("() => window.__geovantaEditorApi.exportMultiPagePdfString()")
    assert pdf_str.startswith("%PDF-1.4")
    assert "/Count 2" in pdf_str
