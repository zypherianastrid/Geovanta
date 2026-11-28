def test_boolean_skia_pathops_fast_path_and_repeated_ops(editor_page):
    page = editor_page

    result = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.createTestShape('rect', 100, 100, 100, 100);
        api.createTestShape('rect', 150, 130, 100, 100);
        const doc = api.getDoc();
        const ids = doc.objects.map(o => o.id);
        const unionRes = api.runBoolean('union', ids);
        const subRes = api.runBoolean('subtract', ids);
        const interRes = api.runBoolean('intersect', ids);
        const exclRes = api.runBoolean('exclude', ids);
        return {
            union: { changed: unionRes.changed, engine: unionRes.stats?.engine, outNodes: unionRes.stats?.outNodes },
            subtract: { changed: subRes.changed, engine: subRes.stats?.engine, outNodes: subRes.stats?.outNodes },
            intersect: { changed: interRes.changed, engine: interRes.stats?.engine, outNodes: interRes.stats?.outNodes },
            exclude: { changed: exclRes.changed, engine: exclRes.stats?.engine, outNodes: exclRes.stats?.outNodes }
        };
    }""")

    for op in ("union", "subtract", "intersect", "exclude"):
        assert result[op]["changed"] is True, f"{op} failed: {result[op]}"
        assert result[op]["engine"] == "skia-pathops", f"{op} used wrong engine: {result[op]}"
        assert result[op]["outNodes"] >= 4, f"{op} returned too few nodes: {result[op]}"
