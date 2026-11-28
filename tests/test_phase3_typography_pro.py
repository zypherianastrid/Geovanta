from playwright.sync_api import expect


def test_text_on_path_rich_spans_lists_and_opentype(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.attachTextToPath !== 'function') {
            return { error: 'attachTextToPath/applyRichTextSpan missing on __geovantaEditorApi' };
        }
        api.createTestShape('rect', 50, 50, 200, 120);
        api.createTestShape('text', 80, 220, 140, 30);
        const doc = api.getDoc();
        const pathId = doc.objects[0].id;
        const textId = doc.objects[1].id;

        api.attachTextToPath(textId, pathId, { startOffset: 10 });
        api.applyRichTextSpan(textId, { start: 0, end: 6, fontWeight: 'bold', fill: '#ef4444' });

        const updated = api.getDoc().objects.find(o => o.id === textId);
        const svg = api.serializeSvg();
        return {
            hasTextOnPath: Boolean(updated?.textOnPath?.pathId === pathId),
            richSpansLen: updated?.text?.richSpans?.length || 0,
            svgHasTextPath: svg.includes('<textPath')
        };
    }""")

    assert "error" not in res, f"Typography Pro API error: {res}"
    assert res["hasTextOnPath"] is True
    assert res["richSpansLen"] == 1
    assert res["svgHasTextPath"] is True

    # Test UI controls in TextInspector (custom Select & ChartSwitch)
    list_sel = page.locator('[data-testid="text-list-style"]')
    expect(list_sel).to_be_visible()
    list_sel.click()
    page.locator('[role="option"][data-opt-key="bullet"]').click()

    liga_chk = page.locator('[data-testid="text-opentype-ligatures"]')
    expect(liga_chk).to_be_visible()
    liga_chk.click()

    persisted = page.evaluate("""() => {
        const doc = window.__geovantaEditorApi.getDoc();
        const txt = doc.objects.find(o => o.type === 'text');
        return { listStyle: txt?.text?.listStyle, ligatures: txt?.text?.openTypeLigatures };
    }""")
    assert persisted["listStyle"] == "bullet"
    assert persisted["ligatures"] is True
