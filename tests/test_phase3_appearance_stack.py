from playwright.sync_api import expect


def test_multiple_fills_strokes_and_pattern_fill(editor_page):
    page = editor_page
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))

    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.createTestShape('rect', 80, 80, 140, 100);
    }""")

    add_fill = page.locator('[data-testid="add-extra-fill-btn"]')
    add_stroke = page.locator('[data-testid="add-extra-stroke-btn"]')
    expect(add_fill).to_be_visible()
    expect(add_stroke).to_be_visible()

    add_fill.click()
    add_stroke.click()

    # Select pattern fill 'dots' on the extra fill via custom Select
    pat_sel = page.locator('[data-testid="extra-fill-pattern-0"]')
    expect(pat_sel).to_be_visible()
    pat_sel.click()
    page.locator('[role="option"][data-opt-key="dots"]').click()

    doc = page.evaluate("() => window.__geovantaEditorApi.getDoc()")
    obj = doc["objects"][0]
    assert len(obj.get("extraFills", [])) == 1
    assert obj["extraFills"][0]["pattern"] == "dots"
    assert len(obj.get("extraStrokes", [])) == 1

    svg = page.evaluate("() => window.__geovantaEditorApi.serializeSvg()")
    assert "<pattern" in svg
    assert "data-extra-fills" in svg
    assert not errors, f"Page errors: {errors}"
