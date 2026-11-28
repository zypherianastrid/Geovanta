from playwright.sync_api import expect


def test_ui_layout_reorganization_tooltips_and_i18n(editor_page):
    page = editor_page

    # 1. Charts & Icons moved to left action rail (left of layer tab)
    rail = page.locator('.fig-nav-rail')
    floating_bar = page.locator('.fig-floating-bar')
    left_sidebar = page.locator('.fig-left-sidebar')
    right_sidebar = page.locator('.fig-right-sidebar')

    expect(rail.locator('[data-tip="veCharts"]')).to_be_visible()
    expect(rail.locator('[data-tip="veIconify"]')).to_be_visible()
    expect(floating_bar.locator('[data-tip="veCharts"]')).to_have_count(0)
    expect(floating_bar.locator('[data-tip="veIconify"]')).to_have_count(0)

    # Verify rail is to the left of left_sidebar
    rail_box = rail.bounding_box()
    left_box = left_sidebar.bounding_box()
    assert rail_box is not None and left_box is not None
    assert rail_box['x'] + rail_box['width'] <= left_box['x'] + 2

    # 2. Settings button moved to bottom of left action rail
    rail_settings = rail.locator('[data-testid="rail-settings-btn"]')
    expect(rail_settings).to_be_visible()
    expect(floating_bar.locator('[data-tip="settings"]')).to_have_count(0)

    charts_box = rail.locator('[data-tip="veCharts"]').bounding_box()
    settings_box = rail_settings.bounding_box()
    assert charts_box is not None and settings_box is not None
    assert settings_box['y'] > charts_box['y']

    # 3. Version History moved to top of right sidebar with full width
    history_btn = right_sidebar.locator('[data-testid="toggle-history-panel"]')
    expect(history_btn).to_be_visible()
    expect(floating_bar.locator('[data-testid="toggle-history-panel"]')).to_have_count(0)

    right_topbar_box = right_sidebar.locator('.fig-r-topbar').bounding_box()
    history_box = history_btn.bounding_box()
    undo_box = right_sidebar.locator('[data-tip="veUndo"]').bounding_box()
    assert right_topbar_box is not None and history_box is not None and undo_box is not None
    assert history_box['y'] < undo_box['y']
    assert history_box['width'] >= right_topbar_box['width'] - 32

    # Clicking Version History opens HistoryTimelinePanel
    history_btn.click()
    expect(page.locator('[data-testid="history-timeline-panel"]')).to_be_visible()
    history_btn.click()
    expect(page.locator('[data-testid="history-timeline-panel"]')).to_be_hidden()

    # 4. Outline Mode moved to right of Frame button in floating bar
    frame_btn = floating_bar.locator('[data-tool="frame"]')
    wireframe_btn = floating_bar.locator('[data-testid="toggle-wireframe"]')
    expect(frame_btn).to_be_visible()
    expect(wireframe_btn).to_be_visible()
    frame_box = frame_btn.bounding_box()
    wireframe_box = wireframe_btn.bounding_box()
    assert frame_box is not None and wireframe_box is not None
    assert wireframe_box['x'] >= frame_box['x'] + frame_box['width'] - 2

    # 5. Layer search removed & filter bar wraps without horizontal scrollbar
    expect(left_sidebar.locator('[data-testid="layer-search-input"]')).to_have_count(0)
    filter_bar = left_sidebar.locator('[data-testid="layer-filter-bar"]')
    expect(filter_bar).to_be_visible()
    filter_metrics = filter_bar.evaluate("""(el) => {
        const cs = getComputedStyle(el);
        return {
            flexWrap: cs.flexWrap,
            overflowX: cs.overflowX,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
        };
    }""")
    assert filter_metrics['flexWrap'] == 'wrap'
    assert filter_metrics['scrollWidth'] <= filter_metrics['clientWidth']

    # 6. Debug floating launcher removed; Debug is inside Settings modal
    expect(page.locator('.debug-launcher')).to_have_count(0)
    rail_settings.click()
    settings_dlg = page.locator('.stg-modal')
    expect(settings_dlg).to_be_visible()

    # Switch to English first to test English translations across all tabs
    settings_dlg.locator('[data-tip="setLang"] button', has_text='English').click()
    expect(settings_dlg.get_by_text('Settings', exact=True)).to_be_visible()

    # Open Debug tab in Settings
    settings_dlg.locator('[data-tip="setTabDebug"]').click()
    debug_tab = settings_dlg.locator('[data-testid="settings-debug-tab"]')
    expect(debug_tab).to_be_visible()
    expect(debug_tab.locator('text=Debugging Mode')).to_be_visible()
    expect(debug_tab.locator('text=Live Log')).to_be_visible()
    expect(debug_tab.locator('text=Function Console')).to_be_visible()
    expect(debug_tab.locator('text=Download JSON')).to_be_visible()

    # Toggle Debug Mode on & off inside Settings
    dbg_toggle = debug_tab.locator('[data-testid="debug-mode-toggle"]')
    expect(dbg_toggle).to_have_text('Turn On')
    dbg_toggle.click()
    expect(dbg_toggle).to_have_text('Turn Off')
    dbg_toggle.click()
    expect(dbg_toggle).to_have_text('Turn On')

    # Check AI & MCP tab English translation
    settings_dlg.locator('[data-tip="setTabAi"]').click()
    ai_tab = settings_dlg.locator('[data-testid="settings-ai-tab"]')
    expect(ai_tab).to_be_visible()
    expect(ai_tab.locator('text=Live AI & MCP Connection')).to_be_visible()
    expect(ai_tab.locator('text=AI & MCP Features')).to_be_visible()
    expect(ai_tab.locator('text=Connect Now')).to_be_visible()

    # Close settings
    settings_dlg.locator('[data-tip="closeDlg"]').click()
    expect(settings_dlg).to_be_hidden()

    # 7. Verify English UI in right sidebar & layer filters
    expect(history_btn).to_have_text('Version History')
    expect(left_sidebar.locator('[data-testid="layer-filter-all"]')).to_have_text('All')
    expect(left_sidebar.locator('[data-testid="layer-filter-text"]')).to_have_text('Text')
    expect(left_sidebar.locator('[data-testid="layer-filter-image"]')).to_have_text('Image')

    # 8. Verify tooltips exist on key moved/new buttons and render .tt on hover
    for sel in [
        '.fig-nav-rail [data-tip="veCharts"]',
        '.fig-nav-rail [data-tip="veIconify"]',
        '.fig-nav-rail [data-testid="rail-settings-btn"]',
        '.fig-right-sidebar [data-testid="toggle-history-panel"]',
        '.fig-floating-bar [data-testid="toggle-wireframe"]',
        '.fig-left-sidebar [data-testid="layer-filter-all"]',
        '.fig-left-sidebar [data-testid="toggle-artboards-btn"]',
    ]:
        loc = page.locator(sel)
        expect(loc).to_be_visible()
        assert loc.get_attribute('data-tip') or loc.get_attribute('data-tip-text')

    # Hover over Version History to confirm TooltipHost renders English tooltip
    history_btn.hover()
    page.wait_for_timeout(500)
    tt = page.locator('.tt')
    expect(tt).to_be_visible()
    expect(tt).to_contain_text('Version History')

    # 9. Verify vertical alignment of Workspace and Saved pills with their icons
    ws_svg_box = left_sidebar.locator('.ws-back-btn svg').bounding_box()
    ws_txt_box = left_sidebar.locator('.ws-back-btn > span').bounding_box()
    save_dot_box = left_sidebar.locator('.ws-save-pill .ws-save-dot').bounding_box()
    save_txt_box = left_sidebar.locator('.ws-save-pill > span:not(.ws-save-dot)').bounding_box()
    ws_btn_box = left_sidebar.locator('.ws-back-btn').bounding_box()
    save_pill_box = left_sidebar.locator('.ws-save-pill').bounding_box()
    assert all([ws_svg_box, ws_txt_box, save_dot_box, save_txt_box, ws_btn_box, save_pill_box])
    assert abs((ws_svg_box['y'] + ws_svg_box['height'] / 2) - (ws_txt_box['y'] + ws_txt_box['height'] / 2)) <= 1.5
    assert abs((save_dot_box['y'] + save_dot_box['height'] / 2) - (save_txt_box['y'] + save_txt_box['height'] / 2)) <= 1.5
    assert abs((ws_btn_box['y'] + ws_btn_box['height'] / 2) - (save_pill_box['y'] + save_pill_box['height'] / 2)) <= 1.5
