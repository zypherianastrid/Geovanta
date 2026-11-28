from playwright.sync_api import expect


def test_node_actions_scroll_caret_stability_docked_history_and_chart_recolor(editor_page):
    page = editor_page

    # 1. Node & Path actions scroll container limited to ~3 items (maxHeight: 108px)
    node_grp_chev = page.locator('.fig-floating-bar button.chev-btn').first
    node_grp_chev.click()
    node_scroll = page.locator('[data-testid="node-actions-scroll"]')
    expect(node_scroll).to_be_visible()
    scroll_metrics = node_scroll.evaluate("""(el) => ({
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
    })""")
    assert scroll_metrics['clientHeight'] <= 112
    assert scroll_metrics['scrollHeight'] > scroll_metrics['clientHeight']
    page.keyboard.press('Escape')

    # 2. CustomTextBox caret movement must NOT shift characters/numbers horizontally
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.createTestShape('rect', 120, 120, 140, 90);
    }""")
    page.wait_for_timeout(200)
    # Use X coordinate CustomTextBox in right inspector
    x_inp = page.locator('.fig-right-sidebar [data-tip="veXfX"] [role="textbox"]').first
    x_inp.click()
    page.wait_for_timeout(150)
    txt_span = x_inp.locator('.c-inp-txt').first
    expect(txt_span).to_be_visible()
    box_before = txt_span.bounding_box()
    assert box_before is not None
    # Move caret left multiple times
    page.keyboard.press('End')
    page.keyboard.press('ArrowLeft')
    page.keyboard.press('ArrowLeft')
    page.wait_for_timeout(100)
    box_after = txt_span.bounding_box()
    assert box_after is not None
    assert abs(box_before['x'] - box_after['x']) < 0.5
    assert abs(box_before['width'] - box_after['width']) < 0.5
    page.keyboard.press('Escape')

    # 3. Version History docked below button in right sidebar + mouse wheel scroll works
    for i in range(10):
        page.evaluate(f"() => window.__geovantaEditorApi.createTestShape('rect', {20 + i * 5}, 40, 30, 30)")
    history_btn = page.locator('.fig-right-sidebar [data-testid="toggle-history-panel"]')
    history_btn.click()
    history_panel = page.locator('.fig-right-sidebar [data-testid="history-timeline-panel"]')
    expect(history_panel).to_be_visible()

    btn_box = history_btn.bounding_box()
    panel_box = history_panel.bounding_box()
    right_box = page.locator('.fig-right-sidebar').bounding_box()
    assert btn_box and panel_box and right_box
    assert panel_box['y'] >= btn_box['y'] + btn_box['height'] - 2
    assert panel_box['x'] >= right_box['x'] - 2

    hist_list = history_panel.locator('.overflow-y-auto').first
    list_box = hist_list.bounding_box()
    assert list_box is not None
    can_scroll = hist_list.evaluate("(el) => el.scrollHeight > el.clientHeight")
    assert can_scroll
    page.mouse.move(list_box['x'] + list_box['width'] / 2, list_box['y'] + list_box['height'] / 2)
    page.mouse.wheel(0, 200)
    page.wait_for_timeout(150)
    scroll_top = hist_list.evaluate("(el) => el.scrollTop")
    assert scroll_top > 0
    history_btn.click()

    # 4. Chart Recolor updates vector fills, preserves alpha, and syncs anchor gen.config.colors
    page.locator('.fig-nav-rail [data-tip="veCharts"]').click()
    page.get_by_test_id('charts-studio-submit').click()
    page.get_by_test_id('charts-studio-modal').wait_for(state='hidden')
    page.wait_for_timeout(300)

    rc_btn = page.locator('[data-testid="rc-open-selcolors"]')
    rc_btn.scroll_into_view_if_needed()
    rc_btn.click()
    hue_sec = page.locator('[data-testid="rc-hue"]')
    hue_sec.scroll_into_view_if_needed()
    sl = hue_sec.locator('[role="slider"]')
    sb = sl.bounding_box()
    assert sb is not None
    page.mouse.move(sb['x'] + sb['width'] * 0.5, sb['y'] + sb['height'] / 2)
    page.mouse.down()
    page.mouse.move(sb['x'] + sb['width'] * 0.85, sb['y'] + sb['height'] / 2)
    page.mouse.up()
    page.wait_for_timeout(200)
    page.locator('[data-testid="rc-apply"]').click()
    page.wait_for_timeout(300)

    recolor_result = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const chartObjs = (doc.objects || []).filter(o => o.group && o.group.startsWith('chart-'));
        const anchor = chartObjs.find(o => o.gen && o.gen.kind === 'chart');
        const fills = chartObjs.map(o => o.fill).filter(Boolean);
        return {
            anchorFill: anchor ? anchor.fill : null,
            anchorColors: anchor && anchor.gen && anchor.gen.config ? anchor.gen.config.colors : [],
            hasOriginalIndigo: fills.includes('#6366F1') || fills.includes('#6366f1'),
        };
    }""")
    assert not recolor_result['hasOriginalIndigo']
    assert recolor_result['anchorFill'] is not None and '0.05' in recolor_result['anchorFill']
    assert '#6366F1' not in recolor_result['anchorColors'] and '#6366f1' not in recolor_result['anchorColors']
