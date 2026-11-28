def test_workspace_tags_templates_palm_rejection_and_memory_guard(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || !api.workspaceExtras || typeof api.computeSafeExportScale !== 'function') {
            return { error: 'workspaceExtras or mobile guards missing on __geovantaEditorApi' };
        }
        api.workspaceExtras.setProjectTags('proj-1', ['branding', 'logo']);
        const tags = api.workspaceExtras.getProjectTags('proj-1');
        const filtered = api.workspaceExtras.filterProjectsByTag(
            [{ id: 'proj-1', name: 'A' }, { id: 'proj-2', name: 'B' }],
            'branding'
        );

        const tpl = api.workspaceExtras.saveCustomTemplate('Poster A4', { viewBox: [0, 0, 1240, 1754], objects: [] });
        const tpls = api.workspaceExtras.listCustomTemplates();

        // Memory guard: 3000x3000 at 4x = 12000x12000 (exceeds low-mobile 4096 maxExportDimension)
        const safeScale = api.computeSafeExportScale(3000, 3000, 4, { maxExportDimension: 4096, maxExportPixels: 16777216 });
        // Palm rejection: touch within 600ms of pen -> rejected
        const rejectTouch = api.shouldRejectPalmEvent('touch', 1000, 1250, 600);
        const allowTouchAfter = api.shouldRejectPalmEvent('touch', 1000, 1800, 600);

        return {
            tags,
            filteredIds: filtered.map(p => p.id),
            tplName: tpl.name,
            tplCount: tpls.length,
            safeScale,
            rejectTouch,
            allowTouchAfter
        };
    }""")

    assert "error" not in res, f"Workspace/Mobile error: {res}"
    assert res["tags"] == ["branding", "logo"]
    assert res["filteredIds"] == ["proj-1"]
    assert res["tplName"] == "Poster A4"
    assert res["tplCount"] >= 1
    assert res["safeScale"] < 4 and res["safeScale"] <= 1.37
    assert res["rejectTouch"] is True
    assert res["allowTouchAfter"] is False
