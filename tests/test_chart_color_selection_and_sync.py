from playwright.sync_api import expect


def test_chart_canvas_click_selection_colors_and_layer_sync(editor_page):
    page = editor_page

    # 1. Insert a chart
    page.locator('.fig-nav-rail [data-tip="veCharts"]').click()
    page.get_by_test_id('charts-studio-submit').click()
    page.get_by_test_id('charts-studio-modal').wait_for(state='hidden')
    page.wait_for_timeout(300)

    # 2. Deselect all, then click the chart on canvas (center of viewport)
    page.evaluate("() => window.__geovantaEditorApi.setSelObjs([])")
    page.wait_for_timeout(150)
    box = page.locator('.ved-canvas').bounding_box()
    assert box is not None
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.wait_for_timeout(300)

    # Clicking chart on canvas must select the entire chart group, so Selection Colors
    # detects the series colors (#6366F1) and NOT only gray/white card colors!
    sel_cols = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('[data-testid="selection-colors-section"] .font-mono'))
            .map(el => (el.textContent || '').trim().toUpperCase());
    }""")
    assert '#6366F1' in sel_cols, f"Expected chart series color #6366F1 in Selection Colors after canvas click, got: {sel_cols}"

    # 3. Replace #6366F1 via Selection Colors UI -> #EF4444
    sc_row = page.locator('[data-testid="selection-colors-section"] .sel-col-list > div', has_text='#6366F1').first
    expect(sc_row).to_be_visible()
    sc_row.locator('.hexf, [data-tip="veSelColor"]').first.click()
    hex_input = page.locator('.flt [data-testid="color-text-input"], .flt input[type="text"], .flt [role="textbox"]').first
    if hex_input.count() > 0:
        hex_input.click()
        page.keyboard.press('Control+a')
        page.keyboard.type('#EF4444')
        page.keyboard.press('Enter')
    else:
        # Fallback: click a red swatch in the ColorField popover
        page.locator('.flt .cp-sw, .flt [data-color]').first.click()
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)

    # Verify doc objects, anchor config.colors, and Layer tab swatches all updated
    after_sc = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const anchor = (doc.objects || []).find(o => o && o.gen && o.gen.kind === 'chart');
        const hasRedObj = (doc.objects || []).some(o => (o.fill || '').toLowerCase() === '#ef4444');
        const hasOldIndigoObj = (doc.objects || []).some(o => (o.fill || '').toLowerCase() === '#6366f1');
        const layerSwatches = Array.from(document.querySelectorAll('.fig-layers-scroll .fig-row .ved-swatch'))
            .map(el => getComputedStyle(el).backgroundColor);
        return {
            hasRedObj,
            hasOldIndigoObj,
            anchorColors: (anchor?.gen?.config?.colors || []).map(c => c.toLowerCase()),
            layerSwatches,
        };
    }""")
    assert after_sc['hasRedObj'], "Expected #ef4444 on chart objects after Selection Colors edit"
    assert not after_sc['hasOldIndigoObj'], "Old #6366f1 should be replaced on chart objects"
    assert '#ef4444' in after_sc['anchorColors'], f"Anchor gen.config.colors not synced: {after_sc['anchorColors']}"
    assert 'rgb(239, 68, 68)' in after_sc['layerSwatches'], f"Layer tab swatch did not update to red: {after_sc['layerSwatches']}"

    # 4. Deselect and re-click the chart on canvas -> #EF4444 must still be detected
    page.evaluate("() => window.__geovantaEditorApi.setSelObjs([])")
    page.wait_for_timeout(150)
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.wait_for_timeout(300)
    sel_cols_after = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('[data-testid="selection-colors-section"] .font-mono'))
            .map(el => (el.textContent || '').trim().toUpperCase());
    }""")
    assert '#EF4444' in sel_cols_after, f"Expected #EF4444 after re-clicking chart, got: {sel_cols_after}"

    # 5. Also test Recolor (Selection scope) -> Apply -> Layer tab & anchor config sync
    page.get_by_test_id('rc-open-selcolors').click()
    page.get_by_test_id('rc-section').wait_for(state='visible')
    hue_slider = page.get_by_test_id('rc-hue').locator('[role="slider"]')
    hue_slider.focus()
    hue_slider.press('End')
    page.get_by_test_id('rc-apply').click()
    page.get_by_test_id('rc-section').wait_for(state='hidden')
    page.wait_for_timeout(300)

    after_rc = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const anchor = (doc.objects || []).find(o => o && o.gen && o.gen.kind === 'chart');
        const hasRedObj = (doc.objects || []).some(o => (o.fill || '').toLowerCase() === '#ef4444');
        const layerSwatches = Array.from(document.querySelectorAll('.fig-layers-scroll .fig-row .ved-swatch'))
            .map(el => getComputedStyle(el).backgroundColor);
        return {
            hasRedObj,
            anchorColors: (anchor?.gen?.config?.colors || []).map(c => c.toLowerCase()),
            hasRedSwatch: layerSwatches.includes('rgb(239, 68, 68)'),
        };
    }""")
    assert not after_rc['hasRedObj'], "Recolor should have shifted #ef4444 to a new color"
    assert not after_rc['hasRedSwatch'], "Layer tab swatch should have updated after Recolor"
    assert '#ef4444' not in after_rc['anchorColors'], f"Anchor config colors should have updated after Recolor: {after_rc['anchorColors']}"
