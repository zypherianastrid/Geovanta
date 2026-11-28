from playwright.sync_api import expect


def test_visual_history_timeline_and_named_snapshots(editor_page):
    page = editor_page

    # 1. Create two shapes to populate history entries
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.createTestShape('rect', 40, 40, 80, 80);
        api.createTestShape('rect', 160, 40, 80, 80);
    }""")

    # 2. Open History Timeline Panel
    toggle_btn = page.locator('[data-testid="toggle-history-panel"]')
    expect(toggle_btn).to_be_visible()
    toggle_btn.click()

    panel = page.locator('[data-testid="history-timeline-panel"]')
    expect(panel).to_be_visible()

    # Click earlier history step (step 1 -> 1 object)
    step1 = page.locator('[data-testid="history-step-1"]')
    expect(step1).to_be_visible()
    step1.click()
    count_after_jump = page.evaluate("() => window.__geovantaEditorApi.getDoc().objects.length")
    assert count_after_jump == 1, f"Expected 1 object after jumping to step 1, got {count_after_jump}"

    # 3. Switch to Snapshots tab, save a named snapshot, mutate doc, and restore snapshot
    page.locator('[data-testid="history-tab-snapshots"]').click()
    snap_input = page.locator('[data-testid="snapshot-name-input"] [role="textbox"]')
    snap_input.click()
    page.keyboard.type('v1-one-rect')
    page.locator('[data-testid="save-snapshot-btn"]').click()

    # Add another shape
    page.evaluate("() => window.__geovantaEditorApi.createTestShape('rect', 280, 40, 80, 80)")
    assert page.evaluate("() => window.__geovantaEditorApi.getDoc().objects.length") == 2

    # Restore snapshot -> back to 1 object
    page.locator('[data-testid="restore-snapshot-btn"]').first.click()
    assert page.evaluate("() => window.__geovantaEditorApi.getDoc().objects.length") == 1
