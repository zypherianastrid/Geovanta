from playwright.sync_api import expect


def test_effects_v2_inner_shadow_glow_and_noise_grain(editor_page):
    page = editor_page
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))

    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.createTestShape('rect', 80, 80, 120, 120);
    }""")

    # Add Inner Shadow, Outer Glow, and Noise/Grain via "+ Tambah efek"
    add_fx_btn = page.locator('[data-tip="veFxAdd"]')
    expect(add_fx_btn).to_be_visible()

    for testid in ("fx-add-innerShadow", "fx-add-outerGlow", "fx-add-noiseGrain"):
        add_fx_btn.click()
        opt = page.locator(f'[data-testid="{testid}"]')
        expect(opt).to_be_visible()
        opt.click()

    effects = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        return doc.objects[0]?.effects || [];
    }""")
    types = [e["type"] for e in effects]
    assert "innerShadow" in types, f"Missing innerShadow in {types}"
    assert "outerGlow" in types, f"Missing outerGlow in {types}"
    assert "noiseGrain" in types, f"Missing noiseGrain in {types}"
    assert not errors, f"Unexpected page errors: {errors}"
