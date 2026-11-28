def test_right_sidebar_all_icon_text_vertically_centered(editor_page):
    page = editor_page

    # Create & select a shape so Transform, Appearance, Color Styles, Color Guide,
    # Fill, Stroke, Selection Colors, Auto Layout, Canvas, and Export are all rendered.
    page.evaluate("""() => {
        const a = window.__geovantaEditorApi;
        const o = a.createTestShape('rect', 80, 80, 120, 90);
        a.setSelObjs([o.id]);
    }""")
    page.locator('[data-testid="toggle-history-panel"]').click()
    page.locator('[data-testid="color-guide-toggle"]').click()
    page.wait_for_timeout(200)

    rows = page.evaluate("""() => {
        const sidebar = document.querySelector('.fig-right-sidebar');
        if (!sidebar) return [];
        const results = [];
        const els = sidebar.querySelectorAll('button, a, div, span, label');
        for (const el of els) {
            if (el.classList && el.classList.contains('flex-col')) continue;
            const svgs = Array.from(el.children).filter(
                c => c.tagName && c.tagName.toLowerCase() === 'svg'
            );
            if (svgs.length !== 1) continue;
            const text = (el.innerText || '').trim();
            if (!text) continue;
            const svg = svgs[0];
            const sRect = svg.getBoundingClientRect();
            if (sRect.width <= 0 || sRect.height <= 0) continue;

            let tRect = null;
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                if (node.textContent && node.textContent.trim()) {
                    const range = document.createRange();
                    range.selectNodeContents(node);
                    const r = range.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        tRect = r;
                        break;
                    }
                }
            }
            if (!tRect) continue;
            // Only horizontal icon-left-of-text pairs
            if (sRect.right > tRect.left + 8) continue;

            const sCy = sRect.top + sRect.height / 2;
            const tCy = tRect.top + tRect.height / 2;
            results.push({
                tip: el.getAttribute('data-tip') || el.getAttribute('data-testid') || el.getAttribute('data-seg-val') || '',
                text: text.replace(/\\s+/g, ' ').slice(0, 40),
                deltaY: +(tCy - sCy).toFixed(2),
                elH: +el.getBoundingClientRect().height.toFixed(1),
                isPill: el.classList.contains('ved-pill'),
                isCta: el.classList.contains('fig-cta-btn'),
                svgW: +sRect.width.toFixed(1),
                svgH: +sRect.height.toFixed(1),
            });
        }
        return results;
    }""")

    assert len(rows) >= 20, f"Expected at least 20 icon+text items in right sidebar, found {len(rows)}"
    misaligned = [r for r in rows if abs(r["deltaY"]) > 0.5]
    assert not misaligned, f"Misaligned icon+text items in right sidebar (|deltaY| > 0.5px): {misaligned}"
    collapsed = [r for r in rows if r["svgW"] <= 0 or r["svgH"] <= 0]
    assert not collapsed, f"Collapsed SVGs found: {collapsed}"
    squished_pills = [r for r in rows if r["isPill"] and r["elH"] < 28]
    assert not squished_pills, f"Vertical padding too small on ved-pill: {squished_pills}"
    squished_ctas = [r for r in rows if r["isCta"] and r["elH"] < 32]
    assert not squished_ctas, f"Vertical padding too small on fig-cta-btn: {squished_ctas}"
