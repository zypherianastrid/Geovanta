def test_echarts_v2_tsv_import_color_styles_sync_and_detach_optimizer(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.syncChartPaletteFromStyles !== 'function') {
            return { error: 'Charts v2 helpers missing on __geovantaEditorApi' };
        }
        const csv = api.parseTsvOrCsvText("Month\\tSales\\nJan\\t100\\nFeb\\t200");
        const synced = api.syncChartPaletteFromStyles({ chartType: 'bar', palette: [] }, [
            { id: 's1', name: 'Brand1', color: '#13b152' },
            { id: 's2', name: 'Brand2', color: '#2563eb' }
        ]);
        const optRes = api.optimizeDetachedChartObjects([
            {
                id: 'p1',
                subs: [{
                    id: 's1',
                    closed: false,
                    nodes: [
                        { id: 'n1', x: 0, y: 0, handleIn: null, handleOut: null },
                        { id: 'n2', x: 50, y: 0, handleIn: null, handleOut: null },
                        { id: 'n3', x: 100, y: 0, handleIn: null, handleOut: null }
                    ]
                }]
            }
        ]);
        return {
            csv,
            palette: synced.palette,
            syncedFlag: synced.paletteSyncedFromStyles,
            removedNodes: optRes.removedNodes,
            remainingNodes: optRes.objects[0].subs[0].nodes.length
        };
    }""")

    assert "error" not in res, f"Charts v2 error: {res}"
    assert "Month,Sales" in res["csv"]
    assert res["palette"] == ["#13b152", "#2563eb"]
    assert res["syncedFlag"] is True
    assert res["removedNodes"] == 1
    assert res["remainingNodes"] == 2
