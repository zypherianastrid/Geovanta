from playwright.sync_api import expect


def test_wireframe_mode_layer_search_filter_and_isolation_mode(editor_page):
    page = editor_page

    # 1. Create a rect and a text object for testing
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.createTestShape('rect', 80, 80, 120, 80);
        api.createTestShape('text', 240, 100, 100, 30);
    }""")

    # 2. Wireframe Mode toggle button and data-wireframe attribute
    wireframe_btn = page.locator('[data-testid="toggle-wireframe"]')
    expect(wireframe_btn).to_be_visible()
    assert page.locator('.ved-root').get_attribute('data-wireframe') == '0'
    wireframe_btn.click()
    assert page.locator('.ved-root').get_attribute('data-wireframe') == '1'

    # Toggle back off via Shift+O
    page.keyboard.press('Shift+O')
    assert page.locator('.ved-root').get_attribute('data-wireframe') == '0'

    # 3. Layer Search removed & Type Filter uses flex-wrap
    search_input = page.locator('[data-testid="layer-search-input"]')
    expect(search_input).to_have_count(0)
    filter_bar = page.locator('[data-testid="layer-filter-bar"]')
    expect(filter_bar).to_be_visible()

    # Filter by text type
    page.locator('[data-testid="layer-filter-text"]').click()
    rows = page.locator('[role="listbox"] [role="option"]')
    expect(rows).to_have_count(1)

    # Reset to all
    page.locator('[data-testid="layer-filter-all"]').click()
    expect(rows).to_have_count(2)

    # 4. Isolation Mode on a group
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.setIsolatedGroup('grp-test-1');
    }""")
    banner = page.locator('[data-testid="isolation-mode-banner"]')
    expect(banner).to_be_visible()
    page.locator('[data-testid="exit-isolation-btn"]').click()
    expect(banner).to_be_hidden()
