from playwright.sync_api import expect


def _insert_default_chart(page):
    page.locator('.fig-nav-rail [data-tip="veCharts"]').click()
    page.get_by_test_id("charts-studio-submit").click()
    page.get_by_test_id("charts-studio-modal").wait_for(state="hidden")
    page.wait_for_timeout(300)


def test_chart_selection_colors_sv_drag_syncs_objects_layers_and_anchor(editor_page):
    """SV live-drag in Selection Colors must sync vector fills, Layer tab swatches,
    and chart anchor config.colors to the EXACT final color (not stuck on first drag frame),
    and clear permanent themeId."""
    page = editor_page
    _insert_default_chart(page)

    # Deselect and click chart on canvas
    page.evaluate("() => window.__geovantaEditorApi.setSelObjs([])")
    page.wait_for_timeout(120)
    box = page.locator(".ved-canvas").bounding_box()
    assert box is not None
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.wait_for_timeout(250)

    # Open Selection Colors for #6366F1 and perform a multi-step SV drag
    sc_row = page.locator('[data-testid="selection-colors-section"] .sel-col-list > div', has_text="#6366F1").first
    expect(sc_row).to_be_visible()
    sc_row.scroll_into_view_if_needed()
    sc_row.locator("button.swatch").click()
    page.wait_for_timeout(150)

    sv = page.locator(".flt .sv").first
    sb = sv.bounding_box()
    assert sb is not None
    page.mouse.move(sb["x"] + sb["width"] * 0.9, sb["y"] + sb["height"] * 0.1)
    page.mouse.down()
    page.wait_for_timeout(60)
    page.mouse.move(sb["x"] + sb["width"] * 0.35, sb["y"] + sb["height"] * 0.45)
    page.wait_for_timeout(60)
    page.mouse.move(sb["x"] + sb["width"] * 0.75, sb["y"] + sb["height"] * 0.25)
    page.mouse.up()
    page.wait_for_timeout(300)
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)

    state = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const objs = doc.objects || [];
        const anchor = objs.find(o => o && o.gen && o.gen.kind === 'chart');
        const barFills = [...new Set(
            objs.filter(o => o.group && o.group.startsWith('chart-') && o.type !== 'text')
                .map(o => (o.fill || '').toLowerCase())
                .filter(Boolean)
        )];
        const anchorColors = (anchor?.gen?.config?.colors || []).map(c => c.toLowerCase());
        return {
            barFills,
            anchorColors,
            themeId: anchor?.gen?.config?.themeId ?? null,
        };
    }""")
    # Old #6366f1 must be gone from both objects and anchor config
    assert "#6366f1" not in state["barFills"], f"Old #6366f1 still on bar objects: {state['barFills']}"
    assert "#6366f1" not in state["anchorColors"], f"Old #6366f1 still in anchor config: {state['anchorColors']}"
    # Anchor config color MUST match the actual final fill on the bar objects (not an intermediate live frame!)
    matching_final = [c for c in state["anchorColors"] if c in state["barFills"]]
    assert len(matching_final) > 0, (
        f"Anchor config colors {state['anchorColors']} drifted from actual bar fills {state['barFills']}"
    )
    # Theme should no longer be permanently locked after custom color edit
    assert state["themeId"] is None, f"Expected themeId to be cleared after manual color edit, got: {state['themeId']}"


def test_gradient_chart_color_change_syncs_layers_and_anchor(editor_page):
    """Editing a gradient chart (e.g. Glass Aurora) via Selection Colors must update
    gradient stops, Layer tab swatches, and chart anchor config.colors."""
    page = editor_page
    _insert_default_chart(page)

    # Apply Glass Aurora theme (uses linear gradients on bars)
    page.get_by_test_id("chart-tab-color").click()
    page.wait_for_timeout(120)
    page.get_by_test_id("chart-theme-glass-aurora").click()
    page.wait_for_timeout(300)

    # Replace #6366F1 via Selection Colors -> #EF4444
    sc_row = page.locator('[data-testid="selection-colors-section"] .sel-col-list > div', has_text="#6366F1").first
    expect(sc_row).to_be_visible()
    sc_row.scroll_into_view_if_needed()
    sc_row.locator("button.swatch").click()
    page.wait_for_timeout(150)
    page.locator('.flt [data-hex="#ef4444"]').click()
    page.wait_for_timeout(300)
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)

    res = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const objs = doc.objects || [];
        const anchor = objs.find(o => o && o.gen && o.gen.kind === 'chart');
        const gradObjs = objs.filter(o => o.grad && o.grad.type && o.grad.type !== 'none');
        const hasRedStop = gradObjs.some(o => (o.grad.stops || []).some(s => (s.color || '').toLowerCase() === '#ef4444'));
        const layerSwatches = Array.from(document.querySelectorAll('.fig-layers-scroll .fig-row .ved-swatch'))
            .map(el => getComputedStyle(el).backgroundImage + ' ' + getComputedStyle(el).backgroundColor);
        const hasRedSwatch = layerSwatches.some(s => s.includes('239, 68, 68'));
        return {
            hasRedStop,
            hasRedSwatch,
            anchorColors: (anchor?.gen?.config?.colors || []).map(c => c.toLowerCase()),
            themeId: anchor?.gen?.config?.themeId ?? null,
        };
    }""")
    assert res["hasRedStop"], "Expected gradient stops to update to #ef4444"
    assert res["hasRedSwatch"], "Expected Layer tab swatch to reflect #ef4444 for gradient chart"
    assert "#ef4444" in res["anchorColors"], f"Anchor config.colors not synced for gradient chart: {res['anchorColors']}"
    assert "#6366f1" not in res["anchorColors"], f"Old #6366f1 remained in gradient chart anchor config: {res['anchorColors']}"


def test_chart_isolation_mode_and_unrestricted_individual_bar_edit(editor_page):
    """Once inserted on canvas, user can freely edit individual chart elements
    (e.g. in Isolation Mode or via Layer tab) and re-clicking the chart preserves all edits."""
    page = editor_page
    _insert_default_chart(page)

    info = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const bar = doc.objects.find(o => (o.fill || '').toLowerCase() === '#6366f1' && o.type !== 'text');
        return { barId: bar?.id, groupId: bar?.group };
    }""")
    assert info["barId"] and info["groupId"]

    # Enter isolation mode for chart group -> clicking canvas must allow single-object selection
    page.evaluate(f"() => window.__geovantaEditorApi.setIsolatedGroup('{info['groupId']}')")
    page.evaluate("() => window.__geovantaEditorApi.setSelObjs([])")
    page.wait_for_timeout(150)

    box = page.locator(".ved-canvas").bounding_box()
    assert box is not None
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.wait_for_timeout(200)
    sel_count = page.evaluate("""() => {
        return document.querySelectorAll('.fig-layers-scroll .fig-row.on').length;
    }""")
    assert sel_count == 1, f"Expected single-element selection inside chart Isolation Mode, got {sel_count}"

    # Exit isolation, select single bar, change its Fill to #22c55e, deselect, re-click chart
    page.evaluate("() => window.__geovantaEditorApi.setIsolatedGroup(null)")
    page.evaluate(f"() => window.__geovantaEditorApi.setSelObjs(['{info['barId']}'])")
    page.wait_for_timeout(150)
    fill_sw = page.locator('[data-tip="veFill"] button.swatch').first
    fill_sw.scroll_into_view_if_needed()
    fill_sw.click()
    page.wait_for_timeout(150)
    page.locator('.flt [data-hex="#22c55e"]').click()
    page.wait_for_timeout(250)
    page.keyboard.press("Escape")
    page.wait_for_timeout(150)

    # Deselect and re-click chart on canvas -> #22C55E must still be present
    page.evaluate("() => window.__geovantaEditorApi.setSelObjs([])")
    page.wait_for_timeout(120)
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.wait_for_timeout(250)

    sel_cols = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('[data-testid="selection-colors-section"] .font-mono'))
            .map(el => (el.textContent || '').trim().toUpperCase());
    }""")
    assert "#22C55E" in sel_cols, f"Expected custom bar color #22C55E preserved after re-clicking chart, got: {sel_cols}"
