# Task 7 review package — diff backup .bak-t7 vs current

## EditorRightInspector.jsx diff (baris 483-485)
--- src/components/editor/EditorRightInspector.jsx.bak-t7	2026-11-14 15:27:28.128317859 +0000
+++ src/components/editor/EditorRightInspector.jsx	2026-11-14 15:27:32.248656181 +0000
@@ -480,8 +480,9 @@
     else if (type === 'backgroundBlur') fxApply(o => addEffect(o, { type: 'backgroundBlur', radius: 12 }), 'fx:add');
   };
   return primary && <div className="fig-isec fade" data-testid="fx-section" data-tip="veFx">
-  <div className="fig-isec-title"><span>{L.fxTitle}{fxList.length ? ' (' + fxList.length + ')' : ''}</span><span ref={fxAddBtnRef} className="inline-flex items-center"><button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-tip="veFxAdd" data-testid="fx-add" aria-expanded={fxMenuOpen} onClick={() => setFxMenuOpen(o => !o)}>+ {L.fxAdd}</button></span></div>
-  <Float anchor={fxAddBtnRef} open={fxMenuOpen} onClose={() => setFxMenuOpen(false)} w={220} cls="cp" preferUp={true}><div className="space-y-1"><button type="button" className="ved-pill w-full" data-testid="fx-add-shadow" data-tip="veFxAddShadow" onClick={() => fxAdd('dropShadow')}>{L.fxDropShadow}</button><button type="button" className="ved-pill w-full" data-testid="fx-add-layerblur" data-tip="veFxAddLayerBlur" onClick={() => fxAdd('layerBlur')}>{L.fxLayerBlur}</button><button type="button" className="ved-pill w-full" data-testid="fx-add-bgblur" data-tip="veFxAddBgBlur" onClick={() => fxAdd('backgroundBlur')}>{L.fxBackgroundBlur}</button></div></Float>
+  <div className="fig-isec-title"><span>{L.fxTitle}{fxList.length ? ' (' + fxList.length + ')' : ''}</span></div>
+  <div className="flex flex-wrap gap-1.5 pb-1.5"><button type="button" ref={fxAddBtnRef} className="ved-pill text-[10px]" style={{ padding: '6px 12px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veFxAdd" data-testid="fx-add" aria-expanded={fxMenuOpen} onClick={() => setFxMenuOpen(o => !o)}>+ {L.fxAdd}</button></div>
+  <Float anchor={fxAddBtnRef} open={fxMenuOpen} onClose={() => setFxMenuOpen(false)} w={220} cls="cp" preferUp={true}><div className="space-y-1"><button type="button" className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-shadow" data-tip="veFxAddShadow" onClick={() => fxAdd('dropShadow')}>{L.fxDropShadow}</button><button type="button" className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-layerblur" data-tip="veFxAddLayerBlur" onClick={() => fxAdd('layerBlur')}>{L.fxLayerBlur}</button><button type="button" className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-bgblur" data-tip="veFxAddBgBlur" onClick={() => fxAdd('backgroundBlur')}>{L.fxBackgroundBlur}</button></div></Float>
   {fxList.length === 0 ? (
     <div className="text-[11px] mut">{L.fxEmpty}</div>
   ) : (
