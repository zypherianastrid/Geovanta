from playwright.sync_api import expect


def test_color_guide_border_radius_and_solid_to_gradient_100_presets(editor_page):
    page = editor_page
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
            api.setTool('select');
            api.createTestShape('rect', 120, 120, 140, 100);
        }"""
    )

    # 1. Color Guide default border-radius check
    page.locator('[data-testid="color-guide-toggle"]').click()
    strip_rad = page.locator('[data-testid="color-guide-strip"]').evaluate(
        "el => parseFloat(getComputedStyle(el).borderTopLeftRadius)"
    )
    assert strip_rad >= 8.0

    # 2. Solid to Gradient: 100 presets + scrollable container + Randomize button
    grid = page.locator('[data-testid="s2g-preset-grid"]')
    expect(grid).to_be_visible()
    presets = grid.locator('[data-testid^="s2g-preset-"]')
    expect(presets).to_have_count(100)

    scroll_box = page.locator('[data-testid="s2g-preset-scroll"]')
    expect(scroll_box).to_be_visible()
    dims = scroll_box.evaluate("el => ({ sh: el.scrollHeight, ch: el.clientHeight })")
    assert dims["sh"] > dims["ch"]

    rand_btn = page.locator('[data-testid="s2g-randomize"]')
    expect(rand_btn).to_be_visible()
    rand_btn.click()
    has_grad = page.evaluate("() => !!window.__geovantaEditorApi.getDoc().objects[0].grad")
    assert has_grad is True


def test_dev_mode_replaces_svg_code_inspector(editor_page):
    page = editor_page
    assert page.locator('[data-testid="toolbar-code"]').count() == 0
    assert page.locator('[data-testid="inspector-code-btn"]').count() == 0
    page.locator('[data-testid="toggle-dev-mode"]').click()
    expect(page.locator('[data-testid="dev-mode-inspector"]')).to_be_visible()
    page.locator('[data-testid="dev-mode-exit-btn"]').click()
    expect(page.locator('[data-testid="dev-mode-inspector"]')).to_have_count(0)
