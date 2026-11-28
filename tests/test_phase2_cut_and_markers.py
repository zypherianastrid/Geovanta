from playwright.sync_api import expect


def test_knife_scissors_vector_eraser_and_line_markers(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.knifeCut !== 'function') {
            return { error: 'knifeCut/scissorsSplit/vectorErase missing on __geovantaEditorApi' };
        }
        // 1. Knife cut a 100x100 rect in half -> 2 objects
        api.createTestShape('rect', 100, 100, 100, 100);
        const doc1 = api.getDoc();
        const rectId = doc1.objects[0].id;
        const knifeRes = api.knifeCut({ x: 80, y: 150 }, { x: 220, y: 150 }, [rectId]);

        // 2. Vector erase across the first cut piece
        const firstId = knifeRes.doc.objects[0].id;
        const eraseRes = api.vectorErase([{ x: 120, y: 120 }, { x: 180, y: 120 }], 12, [firstId]);

        // 3. Scissors split on a closed rect
        api.createTestShape('rect', 300, 100, 80, 80);
        const doc3 = api.getDoc();
        const scTarget = doc3.objects[doc3.objects.length - 1];
        const scRes = api.scissorsSplit(scTarget.id, { x: 340, y: 100 });

        return {
            knifeChanged: knifeRes.changed,
            knifeOutCount: knifeRes.doc.objects.length,
            eraseChanged: eraseRes.changed,
            scissorsChanged: scRes.changed,
            scissorsClosed: scRes.doc.objects.find(o => o.id === scTarget.id)?.subs?.[0]?.closed
        };
    }""")

    assert "error" not in res, f"Cut API error: {res}"
    assert res["knifeChanged"] is True
    assert res["knifeOutCount"] >= 2
    assert res["eraseChanged"] is True
    assert res["scissorsChanged"] is True
    assert res["scissorsClosed"] is False

    # 4. Line markers in Stroke inspector & SVG export
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        const doc = api.getDoc();
        if (doc.objects.length) api.setSelObjs([doc.objects[0].id]);
    }""")
    end_marker = page.locator('[data-testid="stroke-marker-end"]')
    expect(end_marker).to_be_visible()
    end_marker.click()
    page.locator('[role="option"][data-opt-key="arrow"]').click()
    svg = page.evaluate("() => window.__geovantaEditorApi.serializeSvg()")
    assert '<marker' in svg and 'marker-end="url(#' in svg
