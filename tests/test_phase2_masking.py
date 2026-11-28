def test_clipping_mask_make_svg_roundtrip_and_release(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.makeClippingMask !== 'function') {
            return { error: 'makeClippingMask missing on __geovantaEditorApi' };
        }
        api.createTestShape('rect', 50, 50, 160, 160);
        api.createTestShape('rect', 90, 90, 80, 80);
        const doc = api.getDoc();
        const ids = doc.objects.map(o => o.id);
        const mk = api.makeClippingMask(ids);
        const svg = api.serializeSvg();
        const parsed = api.parseSvg(svg);
        const rel = api.releaseClippingMask([mk.maskedIds[0]]);
        return {
            changed: mk.changed,
            maskedCount: mk.maskedIds.length,
            hasClipPathInDoc: Boolean(mk.doc.objects.find(o => o.id === mk.maskedIds[0])?.clipPathD),
            hasClipDefInSvg: svg.includes('<clipPath') && svg.includes('clip-path="url(#'),
            parsedHasClip: Boolean(parsed.objects.find(o => o.clipPathD)),
            released: rel.changed,
            afterReleaseHasClip: Boolean(rel.doc.objects.find(o => o.clipPathD)),
            afterReleaseCount: rel.doc.objects.length
        };
    }""")

    assert "error" not in res, f"Masking API error: {res}"
    assert res["changed"] is True
    assert res["maskedCount"] == 1
    assert res["hasClipPathInDoc"] is True
    assert res["hasClipDefInSvg"] is True
    assert res["parsedHasClip"] is True
    assert res["released"] is True
    assert res["afterReleaseHasClip"] is False
    assert res["afterReleaseCount"] == 2
