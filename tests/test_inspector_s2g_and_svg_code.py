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


def test_svg_code_inspector_selection_scope_and_hover_contrast(editor_page):
    page = editor_page
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
            api.createTestShape('rect', 50, 50, 100, 80);
            api.createTestShape('ellipse', 250, 150, 120, 90);
            const objs = api.getDoc().objects;
            // Select ONLY the first object (rect)
            api.setSel({ objs: [objs[0].id], nodes: [] });
        }"""
    )

    # Open SVG Code Inspector with 1 selected object
    page.locator('[data-testid="toolbar-code"]').click()
    modal = page.locator('[data-testid="code-inspector-modal"]')
    expect(modal).to_be_visible()

    ta = page.locator('[data-testid="code-inspector-modal"] textarea')
    val_selected = ta.input_value()
    # Should contain the selected object (1 path) and NOT both objects
    assert val_selected.count("<path") == 1

    # Hover an inactive tab and verify text color stays readable (not near-white on light bg)
    tab = page.locator('[data-testid="tab-react-jsx"]')
    tab.hover()
    tab_color = tab.evaluate("el => getComputedStyle(el).color")
    assert tab_color != "rgb(226, 232, 240)"

    # Close, clear selection, and reopen -> should show ALL objects (2 paths)
    page.locator('[data-testid="btn-close"]').click()
    page.evaluate("() => window.__geovantaEditorApi.setSel({ objs: [], nodes: [] })")
    page.locator('[data-testid="toolbar-code"]').click()
    expect(modal).to_be_visible()
    val_all = ta.input_value()
    assert val_all.count("<path") == 2
