def test_skew_perspective_warp_blend_and_variable_width(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.skewSelection !== 'function') {
            return { error: 'warp/blend functions missing on __geovantaEditorApi' };
        }
        api.createTestShape('rect', 50, 50, 100, 100);
        api.createTestShape('rect', 250, 50, 100, 100);
        const doc = api.getDoc();
        const idA = doc.objects[0].id;
        const idB = doc.objects[1].id;

        const sk = api.skewSelection([idA], 15, 0);
        const pw = api.perspectiveDistort([idA], [[40, 40], [160, 60], [150, 150], [50, 140]]);
        const ew = api.envelopeWarp([idA], 'arc', 0.25);
        const bl = api.blendObjects(idA, idB, 3);
        const vw = api.applyVariableWidthProfile(idA, [
            { t: 0, width: 2 },
            { t: 0.5, width: 16 },
            { t: 1, width: 4 }
        ]);

        return {
            skewChanged: sk.changed,
            perspChanged: pw.changed,
            warpChanged: ew.changed,
            blendChanged: bl.changed,
            blendAdded: bl.addedIds?.length || 0,
            varWidthChanged: vw.changed,
            varWidthNodes: vw.doc.objects.find(o => o.id === idA)?.subs?.[0]?.nodes?.length || 0
        };
    }""")

    assert "error" not in res, f"Warp/Blend API error: {res}"
    assert res["skewChanged"] is True
    assert res["perspChanged"] is True
    assert res["warpChanged"] is True
    assert res["blendChanged"] is True
    assert res["blendAdded"] == 3
    assert res["varWidthChanged"] is True
    assert res["varWidthNodes"] >= 6
