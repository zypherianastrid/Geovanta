def test_components_instances_overrides_and_text_effect_styles(editor_page):
    page = editor_page

    res = page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        if (!api || typeof api.createComponentMaster !== 'function') {
            return { error: 'Component/Style APIs missing on __geovantaEditorApi' };
        }
        api.createTestShape('rect', 40, 40, 80, 80);
        api.createTestShape('text', 40, 160, 120, 30);
        const doc0 = api.getDoc();
        const rectId = doc0.objects[0].id;
        const textId = doc0.objects[1].id;

        const m = api.createComponentMaster(rectId, 'PrimaryBtn');
        const inst1 = api.instantiateComponent(m.component.id, 120, 0);
        const inst2 = api.instantiateComponent(m.component.id, 240, 0);

        // Override fill on inst2
        api.setInstanceOverride(inst2.instanceId, 'fill', '#3b82f6');
        // Update Master fill -> propagates to inst1, NOT inst2
        api.updateComponentMaster(m.component.id, { fill: '#ef4444' });

        // Text Style & Effect Style
        const ts = api.createTextStyle('Heading1', { fontSize: 32, fontWeight: 'bold' });
        api.applyTextStyle(ts.style.id, [textId]);
        const es = api.createEffectStyle('CardShadow', [{ type: 'dropShadow', dx: 0, dy: 4, blur: 12, color: '#000000', opacity: 0.25 }]);
        api.applyEffectStyle(es.style.id, [rectId]);

        const finalDoc = api.getDoc();
        const masterObj = finalDoc.objects.find(o => o.id === rectId);
        const obj1 = finalDoc.objects.find(o => o.id === inst1.instanceId);
        const obj2 = finalDoc.objects.find(o => o.id === inst2.instanceId);
        const txtObj = finalDoc.objects.find(o => o.id === textId);

        return {
            masterFill: masterObj?.fill,
            inst1Fill: obj1?.fill,
            inst2Fill: obj2?.fill,
            textFontSize: txtObj?.text?.fontSize,
            masterEffectsLen: masterObj?.effects?.length || 0,
            componentsCount: finalDoc.components?.length || 0,
            textStylesCount: finalDoc.textStyles?.length || 0,
            effectStylesCount: finalDoc.effectStyles?.length || 0
        };
    }""")

    assert "error" not in res, f"Component API error: {res}"
    assert res["masterFill"] == "#ef4444"
    assert res["inst1Fill"] == "#ef4444"
    assert res["inst2Fill"] == "#3b82f6"
    assert res["textFontSize"] == 32
    assert res["masterEffectsLen"] == 1
    assert res["componentsCount"] == 1
    assert res["textStylesCount"] == 1
    assert res["effectStylesCount"] == 1
