from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def test_workspace_card_dropdown_above_second_row(app_url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(app_url, wait_until="networkidle")
        expect(page.locator(".ws-home-root")).to_be_visible(timeout=15000)

        # Create 1 project via UI so WorkspaceDB is guaranteed initialized, then return to Workspace
        create_btn = page.get_by_role("button", name="Create New", exact=True)
        create_btn.click()
        submit_btn = page.get_by_role("button", name="Buat & Buka Proyek")
        submit_btn.wait_for(state="visible", timeout=10000)
        submit_btn.click()
        page.wait_for_function("() => typeof window.__geovantaEditorApi !== 'undefined'", timeout=15000)
        page.get_by_role("button", name="Workspace").first.click()
        expect(page.locator(".ws-home-root")).to_be_visible(timeout=10000)

        # Duplicate 5 times via UI so there are 6 cards (2 rows)
        for idx in range(5):
            page.locator(".ws-project-card").first.locator(".ws-card-menu-btn").click()
            page.locator("body > .ws-card-dropdown").get_by_role("button", name="Duplicate").click()
            expect(page.locator(".ws-project-card")).to_have_count(idx + 2, timeout=10000)

        # Open menu on the first card (row 1)
        page.locator(".ws-project-card").first.locator(".ws-card-menu-btn").click()
        dropdown = page.locator("body > .ws-card-dropdown")
        expect(dropdown).to_be_visible()

        # Verify every menu item (including bottom ones overlapping row 2) is top-most via elementFromPoint
        blocked = page.evaluate(
            """() => {
                const dd = document.querySelector('body > .ws-card-dropdown');
                if (!dd) return ['missing dropdown'];
                const items = Array.from(dd.querySelectorAll('.ws-menu-item'));
                const issues = [];
                for (const item of items) {
                    const r = item.getBoundingClientRect();
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;
                    const topEl = document.elementFromPoint(cx, cy);
                    if (!topEl || (!item.contains(topEl) && topEl !== item)) {
                        issues.push({ text: item.textContent, topTag: topEl ? topEl.className : null });
                    }
                }
                return issues;
            }"""
        )
        assert blocked == [], f"Menu items covered by another element: {blocked}"

        shot_dir = Path(__file__).resolve().parent.parent / "scratch"
        shot_dir.mkdir(exist_ok=True)
        page.screenshot(path=str(shot_dir / "workspace_menu_zindex_verify.png"))

        # Escape closes the portal menu
        page.keyboard.press("Escape")
        expect(dropdown).to_have_count(0)
        browser.close()
