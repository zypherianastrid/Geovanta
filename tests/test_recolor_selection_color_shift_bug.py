from pathlib import Path

import pytest


USER_SVG_PATH = (
    Path(__file__).resolve().parent.parent
    / "svg-test"
    / "Pasted-20261128-030727 - Vectorizer.AI.svg"
)


def _load_user_svg(page):
    if USER_SVG_PATH.exists():
        svg_text = USER_SVG_PATH.read_text(encoding="utf-8")
        min_count = 750
        idx_p392 = 391
        idx_p396 = 395
    else:
        # CI/clean-repo fallback with the exact same path fills (#cea9a2 & #3b3961)
        rects = ['<rect x="0" y="0" width="20" height="20" fill="#cea9a2"/>' for _ in range(392)]
        rects += ['<rect x="30" y="0" width="20" height="20" fill="#3b3961"/>' for _ in range(4)]
        svg_text = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280">' + "".join(rects) + "</svg>"
        min_count = 396
        idx_p392 = 391
        idx_p396 = 395
    page.evaluate(
        "(svg) => window.__geovantaEditorApi.loadTestSvg(svg, 'user-bug-repro')",
        svg_text,
    )
    page.wait_for_function(
        f"() => (window.__geovantaEditorApi.getDoc()?.objects?.length || 0) >= {min_count} && !document.querySelector('[data-testid=\"doc-loading\"]')",
        timeout=30000,
    )
    page.wait_for_timeout(300)
    return idx_p392, idx_p396


def test_recolor_preview_does_not_shift_on_selection_or_override_fill(editor_page):
    page = editor_page
    _load_user_svg(page)

    # 1. Open Recolor with empty selection and shift Hue +43 deg across the document
    page.locator('[data-testid="rc-open-styles"]').click()
    page.locator('[data-testid="rc-section"]').wait_for(state="visible", timeout=5000)

    hue_slider = page.locator('[data-testid="rc-hue"] [role="slider"]')
    hue_slider.focus()
    for _ in range(43):
        page.keyboard.press("ArrowRight")
    page.wait_for_timeout(150)

    before_sel = page.evaluate(
        """() => {
            const objs = window.__geovantaEditorApi.getDoc().objects;
            return { p392: objs[391].fill, p396: objs[395].fill };
        }"""
    )
    assert before_sel["p392"] == "#cec9a2"
    assert before_sel["p396"] == "#583961"

    # Sticky pending banner should be visible at top of right sidebar
    banner = page.locator('[data-testid="rc-pending-banner"]')
    assert banner.is_visible()

    # 2. Select path-392: document-wide Recolor preview MUST NOT snap back!
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            const o = api.getDoc().objects[391];
            api.setSel({ objs: new Set([o.id]), nodes: new Set() });
        }"""
    )
    page.wait_for_timeout(200)

    during_sel = page.evaluate(
        """() => {
            const objs = window.__geovantaEditorApi.getDoc().objects;
            return { p392: objs[391].fill, p396: objs[395].fill };
        }"""
    )
    assert during_sel["p392"] == "#cec9a2"
    assert during_sel["p396"] == "#583961", (
        f"Selecting path-392 caused path-396 to revert to {during_sel['p396']}"
    )

    # 3. Edit path-392's Fill directly to #ff0000 while Recolor is still open
    fill_input = page.locator('[data-tip="veFill"] [data-custom-input="true"]').first
    fill_input.click()
    page.keyboard.press("Control+a")
    page.keyboard.type("#ff0000")
    page.keyboard.press("Enter")
    page.wait_for_timeout(200)

    after_fill_edit = page.evaluate(
        "() => window.__geovantaEditorApi.getDoc().objects[391].fill"
    )
    assert after_fill_edit == "#ff0000", (
        f"Direct Fill edit #ff0000 was overwritten to {after_fill_edit}"
    )

    # Deselect path-392 -> external Fill edit cleared stale Recolor preview & banner
    page.evaluate(
        "() => window.__geovantaEditorApi.setSel({ objs: new Set(), nodes: new Set() })"
    )
    page.wait_for_timeout(150)
    assert (
        page.evaluate("() => window.__geovantaEditorApi.getDoc().objects[391].fill")
        == "#ff0000"
    )
    assert not banner.is_visible()

    # Re-shift Hue +20 deg and test discarding via sticky banner
    hue_slider.focus()
    for _ in range(20):
        page.keyboard.press("ArrowRight")
    page.wait_for_timeout(150)
    banner.wait_for(state="visible", timeout=5000)
    page.locator('[data-testid="rc-pending-discard"]').click()
    page.locator('[data-testid="rc-section"]').wait_for(state="hidden", timeout=5000)
    assert (
        page.evaluate("() => window.__geovantaEditorApi.getDoc().objects[391].fill")
        == "#ff0000"
    )


def test_recolor_empty_selection_then_select_before_edit_targets_selection(editor_page):
    page = editor_page
    _load_user_svg(page)

    # Open Recolor with empty selection and NO slider changes yet
    page.locator('[data-testid="rc-open-styles"]').click()
    page.locator('[data-testid="rc-section"]').wait_for(state="visible", timeout=5000)

    # Now select path-392 BEFORE editing any slider -> scope should switch to selection
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            const o = api.getDoc().objects[391];
            api.setSel({ objs: new Set([o.id]), nodes: new Set() });
        }"""
    )
    page.wait_for_timeout(150)

    hue_slider = page.locator('[data-testid="rc-hue"] [role="slider"]')
    hue_slider.focus()
    for _ in range(43):
        page.keyboard.press("ArrowRight")
    page.wait_for_timeout(150)

    page.locator('[data-testid="rc-apply"]').click()
    page.locator('[data-testid="rc-section"]').wait_for(state="hidden", timeout=5000)

    after_apply = page.evaluate(
        """() => {
            const objs = window.__geovantaEditorApi.getDoc().objects;
            return { p392: objs[391].fill, p396: objs[395].fill };
        }"""
    )
    assert after_apply["p392"] == "#cec9a2"
    assert after_apply["p396"] == "#3b3961"
