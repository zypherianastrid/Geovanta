from pathlib import Path
from playwright.sync_api import expect


def test_dev_mode_full_workflow(editor_page):
    page = editor_page

    # 1. Verify old SVG Code Inspector UI & Ctrl+Alt+C are completely removed
    assert page.locator('[data-testid="toolbar-code"]').count() == 0
    assert page.locator('[data-testid="inspector-code-btn"]').count() == 0
    page.keyboard.press("Control+Alt+c")
    assert page.locator('[data-testid="code-inspector-modal"]').count() == 0

    # 2. Seed two vector objects + one text object in Design Mode
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
            api.setTool('select');
            api.createTestShape('rect', 80, 100, 140, 90);
            api.createTestShape('rect', 300, 120, 120, 80);
            const d = api.getDoc();
            const textObj = {
                id: 'txt_dev_1',
                name: 'Hero Heading',
                type: 'text',
                fill: '#1E293B',
                opacity: 1,
                text: {
                    content: 'Hello Dev Mode',
                    x: 80,
                    y: 260,
                    fontSize: 24,
                    fontFamily: 'Geovanta Sans',
                    fontWeight: '700',
                    textAlign: 'left',
                    fill: '#1E293B',
                    width: 220,
                    height: 32,
                }
            };
            api.setDoc({ ...d, objects: [...d.objects, textObj] });
        }"""
    )

    # 3. Toggle Dev Mode via Shift+D and verify root attr + canvas banner + simplified toolbar + inspector
    page.keyboard.press("Shift+d")
    expect(page.locator('.ved-root[data-dev-mode="1"]')).to_be_visible()
    expect(page.locator('[data-testid="dev-mode-canvas-banner"]')).to_be_visible()
    expect(page.locator('[data-testid="dev-mode-inspector"]')).to_be_visible()
    expect(page.locator('[data-testid="toggle-dev-mode"]')).to_have_attribute("aria-pressed", "true")

    # Empty state: press Escape to clear selection -> Page Overview should be visible
    page.keyboard.press("Escape")
    expect(page.locator('[data-testid="dev-mode-page-overview"]')).to_be_visible()

    # 4. Select first rect and verify read-only protection (drag + Delete do NOT mutate)
    first_id, first_x_before, count_before = page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            const objs = api.getDoc().objects;
            api.setSel({ objs: [objs[0].id], nodes: [] });
            return [objs[0].id, objs[0].subs[0].nodes[0].x, objs.length];
        }"""
    )
    expect(page.locator('[data-testid="dev-mode-box-model"]')).to_be_visible()
    expect(page.locator('[data-testid="dev-sel-badge"]')).to_be_visible()

    # Try dragging directly on first object & pressing Delete (should stay selected & unmoved)
    pt1 = page.evaluate(
        """() => {
            const g = document.querySelector('.ved-devmode-overlays');
            const svg = g ? g.ownerSVGElement : document.querySelector('.ved-canvas svg');
            if (!svg) return null;
            const ctm = (g || svg).getScreenCTM();
            if (!ctm) return null;
            const p = svg.createSVGPoint();
            p.x = 150;
            p.y = 145;
            const sp = p.matrixTransform(ctm);
            return { x: sp.x, y: sp.y };
        }"""
    )
    if pt1:
        page.mouse.move(pt1["x"], pt1["y"])
        page.mouse.down()
        page.mouse.move(pt1["x"] + 80, pt1["y"] + 60)
        page.mouse.up()
    page.keyboard.press("Delete")

    first_x_after, count_after = page.evaluate(
        """(id) => {
            const objs = window.__geovantaEditorApi.getDoc().objects;
            const found = objs.find(o => o.id === id);
            return [found.subs[0].nodes[0].x, objs.length];
        }""",
        first_id,
    )
    assert count_after == count_before
    assert abs(first_x_after - first_x_before) < 1e-6

    # 5. Hover over second object without holding Alt -> automatic redline guides appear
    pt2 = page.evaluate(
        """() => {
            const g = document.querySelector('.ved-devmode-overlays');
            const svg = g ? g.ownerSVGElement : document.querySelector('.ved-canvas svg');
            if (!svg) return null;
            const ctm = (g || svg).getScreenCTM();
            if (!ctm) return null;
            const p = svg.createSVGPoint();
            p.x = 360;
            p.y = 160;
            const sp = p.matrixTransform(ctm);
            return { x: sp.x, y: sp.y };
        }"""
    )
    if pt2:
        page.mouse.move(pt2["x"], pt2["y"])
        page.wait_for_timeout(120)
        expect(page.locator('[data-testid="dev-redline-guides"]')).to_be_visible()

    # 6. Verify Code Panel across CSS, Tailwind, SVG, React JSX, SwiftUI, Compose + Unit switching
    code_block = page.locator('[data-testid="dev-mode-code-block"]')
    expect(code_block).to_be_visible()
    assert "width:" in code_block.inner_text()

    page.locator('[data-testid="dev-unit-rem"]').click()
    expect(page.locator('[data-testid="dev-rem-base"]')).to_be_visible()
    assert "rem" in code_block.inner_text()
    page.locator('[data-testid="dev-unit-px"]').click()

    for tab_id, expected_substr in [
        ("tailwind", "className="),
        ("svg", "<svg"),
        ("react-jsx", "export const SvgIcon"),
        ("vue-sfc", "<template>"),
        ("swiftui", "struct"),
        ("compose", "@Composable"),
    ]:
        page.locator(f'[data-testid="dev-code-tab-{tab_id}"]').click()
        assert expected_substr in code_block.inner_text()

    page.locator('[data-testid="dev-code-wrap-btn"]').click()
    page.locator('[data-testid="dev-mode-copy-code"]').click()
    expect(page.locator('[data-testid="dev-mode-copy-code"]')).to_contain_text("Disalin")

    # 6b. Verify Dev Mode right sidebar scrolls properly to the bottom
    scroll_info = page.evaluate(
        """() => {
            const sc = document.querySelector('.fig-right-sidebar .fig-r-scroll');
            if (!sc) return null;
            sc.scrollTop = 220;
            return { sh: sc.scrollHeight, ch: sc.clientHeight, st: sc.scrollTop };
        }"""
    )
    assert scroll_info is not None
    assert scroll_info["sh"] > scroll_info["ch"]
    assert scroll_info["st"] > 0

    # 6c. Verify Live SVG Code Editing in Dev Mode (invalid XML guard + valid apply)
    page.locator('[data-testid="dev-code-tab-svg"]').click()
    page.locator('[data-testid="dev-svg-edit-btn"]').click()
    svg_editor = page.locator('[data-testid="dev-svg-code-editor"]')
    expect(svg_editor).to_be_visible()

    # Invalid XML -> shows error without breaking canvas
    svg_editor.evaluate('el => { el.textContent = "<svg><broken"; el.dispatchEvent(new Event("input", { bubbles: true })); }')
    page.locator('[data-testid="dev-svg-apply-btn"]').click()
    expect(page.locator('[data-testid="dev-svg-error"]')).to_be_visible()

    # Valid XML edit -> updates object fill color on canvas
    svg_editor.evaluate('el => { el.textContent = "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 800 600\\"><rect x=\\"80\\" y=\\"100\\" width=\\"140\\" height=\\"90\\" fill=\\"#ff00aa\\" /></svg>"; }')
    page.locator('[data-testid="dev-svg-apply-btn"]').click()
    expect(page.locator('[data-testid="dev-svg-error"]')).to_have_count(0)
    updated_fill = page.evaluate("() => window.__geovantaEditorApi.getDoc().objects[0].fill")
    assert updated_fill.lower() == "#ff00aa"

    # 6d. Verify Dev Mode uses Settings accent color (not hardcoded #14AE5C)
    banner_border = page.locator('[data-testid="dev-mode-canvas-banner"]').evaluate("el => getComputedStyle(el).borderColor")
    assert banner_border != "rgb(20, 174, 92)"

    # 7. Select Text object & verify Typography + WCAG Contrast + Ready-for-Dev + Dev Note CustomTextBox
    page.evaluate(
        """() => {
            window.__geovantaEditorApi.setSel({ objs: ['txt_dev_1'], nodes: [] });
        }"""
    )
    typo = page.locator('[data-testid="dev-mode-typography"]')
    expect(typo).to_be_visible()
    assert "Hello Dev Mode" in typo.inner_text()
    expect(page.locator('[data-testid="dev-wcag-badge"]')).to_be_visible()

    ready_btn = page.locator('[data-testid="dev-ready-toggle"]')
    ready_btn.click()
    expect(ready_btn).to_contain_text("Ready for Dev")

    note_box = page.locator('[data-testid="dev-note-input"] [role="textbox"]')
    note_box.click()
    page.keyboard.type("Use primary-900 token")
    page.keyboard.press("Enter")

    # Capture screenshot for visual verification on Inspect tab
    shot_dir = Path(__file__).resolve().parent.parent / "scratch"
    shot_dir.mkdir(exist_ok=True)
    page.screenshot(path=str(shot_dir / "dev_mode_v3_verify.png"))

    # 8. Test Tokens Tab (CSS Vars / Tailwind / JSON)
    page.locator('[data-testid="dev-tab-tokens"]').click()
    tokens_panel = page.locator('[data-testid="dev-mode-tokens-panel"]')
    expect(tokens_panel).to_be_visible()
    assert ":root" in tokens_panel.inner_text()
    page.locator('[data-testid="dev-token-fmt-tailwind-config"]').click()
    assert "module.exports" in tokens_panel.inner_text()
    page.locator('[data-testid="dev-token-fmt-json-tokens"]').click()
    assert '"$type": "color"' in tokens_panel.inner_text()

    # 9. Test Assets Tab (CustomTextBox search + mini SVG thumbnail cards)
    page.locator('[data-testid="dev-tab-assets"]').click()
    assets_panel = page.locator('[data-testid="dev-mode-assets-panel"]')
    expect(assets_panel).to_be_visible()
    expect(page.locator('[data-testid="dev-asset-card-txt_dev_1"]')).to_be_visible()
    search_box = page.locator('[data-testid="dev-assets-search"] [role="textbox"]')
    search_box.click()
    page.keyboard.type("Hero")
    expect(page.locator('[data-testid="dev-asset-card-txt_dev_1"]')).to_be_visible()

    # 10. Exit Dev Mode via toggle button
    page.locator('[data-testid="toggle-dev-mode"]').click()
    expect(page.locator('.ved-root[data-dev-mode="0"]')).to_be_visible()
    expect(page.locator('[data-testid="dev-mode-inspector"]')).to_have_count(0)
