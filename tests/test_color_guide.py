from playwright.sync_api import expect


def test_color_guide_harmony_variations_and_apply(editor_page):
    page = editor_page
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
            api.setTool('select');
            api.createTestShape('rect', 120, 120, 140, 100);
        }"""
    )

    section = page.locator('[data-testid="color-guide-section"]')
    expect(section).to_be_visible()

    # Open Color Guide section
    page.locator('[data-testid="color-guide-toggle"]').click()

    # Ensure zero native <select> or <input type="range"> inside Color Guide
    assert section.locator("select").count() == 0
    assert section.locator('input[type="range"]').count() == 0

    # Pick "Triad" from custom SelectDropdown
    harmony_btn = page.locator('[data-testid="color-guide-harmony-select"]')
    expect(harmony_btn).to_be_visible()
    harmony_btn.click()
    page.locator('[role="option"][data-opt-key="triad"]').click()

    # Harmony strip should have 3 colors for Triad
    strip_swatches = page.locator('[data-testid="color-guide-strip"] button')
    expect(strip_swatches).to_have_count(3)

    # Switch variation mode to warmCool via custom SelectDropdown
    var_btn = page.locator('[data-testid="color-guide-variation-select"]')
    var_btn.click()
    page.locator('[role="option"][data-opt-key="warmCool"]').click()

    # Click a variation cell (non-center) and verify object fill updates without changing base color
    base_before = page.locator('[data-testid="color-guide-base-chip"]').get_attribute("data-color")
    cells = page.locator('[data-testid="color-guide-grid"] button')
    assert cells.count() >= 9
    target_cell = cells.nth(1)
    target_color = target_cell.get_attribute("data-color")
    target_cell.click()

    fill_after = page.evaluate("() => window.__geovantaEditorApi.getDoc().objects[0].fill")
    assert fill_after.lower() == target_color.lower()
    base_after = page.locator('[data-testid="color-guide-base-chip"]').get_attribute("data-color")
    assert base_after.lower() == base_before.lower()

    # Save harmony colors to document palette
    styles_before = page.evaluate("() => (window.__geovantaEditorApi.getDoc().styles || []).length")
    page.locator('[data-testid="color-guide-save-palette"]').click()
    styles_after = page.evaluate("() => (window.__geovantaEditorApi.getDoc().styles || []).length")
    assert styles_after > styles_before
