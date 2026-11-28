def test_autolayout_v2_fill_absolute_minmax_and_constraints(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.applyAutoLayoutV2 !== 'function') {
            return { error: 'applyAutoLayoutV2/resizeFrameWithConstraints missing' };
        }
        // Create frame bg + 2 children
        api.createTestShape('rect', 0, 0, 300, 120);
        api.createTestShape('rect', 20, 20, 60, 40);
        api.createTestShape('rect', 220, 20, 40, 40);

        const doc0 = api.getDoc();
        const frameId = 'frm-v2';
        const bg = { ...doc0.objects[0], id: 'bg-v2', group: frameId, isFrameBg: true };
        const childFill = {
            ...doc0.objects[1],
            id: 'c-fill',
            group: frameId,
            layoutSizingH: 'fill',
            minWidth: 100,
            maxWidth: 180
        };
        const childAbs = {
            ...doc0.objects[2],
            id: 'c-abs',
            group: frameId,
            layoutPositioning: 'absolute',
            constraints: { horizontal: 'right', vertical: 'top' }
        };
        const doc1 = { ...doc0, objects: [bg, childFill, childAbs] };
        const alRes = api.applyAutoLayoutV2(doc1, frameId, { dir: 'row', gap: 10, padding: 20 });

        // Test resizeFrameWithConstraints on frame width 300 -> 400
        const rszRes = api.resizeFrameWithConstraints(alRes.doc, frameId, 400, 120);
        const absAfter = rszRes.doc.objects.find(o => o.id === 'c-abs');
        const fillAfter = alRes.doc.objects.find(o => o.id === 'c-fill');
        const xs = fillAfter.subs[0].nodes.map(n => n.x);
        const absXs = absAfter.subs[0].nodes.map(n => n.x);
        return {
            fillWidth: Math.round(Math.max(...xs) - Math.min(...xs)),
            absLeftBefore: 220,
            absLeftAfter: Math.round(Math.min(...absXs))
        };
    }""")

    assert "error" not in res, f"AutoLayout v2 error: {res}"
    assert 100 <= res["fillWidth"] <= 180, f"Expected fillWidth clamped [100,180], got {res['fillWidth']}"
    assert res["absLeftAfter"] == 320, f"Expected right-constrained child to shift +100px to 320, got {res['absLeftAfter']}"
