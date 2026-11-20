# Task 3 review package — diff backup .bak-r3t3 vs current

## Files changed (diff -U10)
--- src/components/editor/EditorRightInspector.jsx.bak-r3t3	2026-11-14 22:10:35.752543596 +0000
+++ src/components/editor/EditorRightInspector.jsx	2026-11-14 22:10:39.317468591 +0000
@@ -499,21 +499,21 @@
               <div data-testid="fx-opacity"><Range l={L.fxOpacity} v={Math.round((fx.opacity ?? 1) * 100)} min={0} max={100} step={1} on={fxNum(i, v => ({ opacity: v / 100 }))} tip="veFxOpacity" f={v => v + '%' } /></div>
             </div>
           )}
           {(fx.type === 'layerBlur' || fx.type === 'backgroundBlur') && (
             <div data-testid="fx-radius"><Range l={L.fxRadius} v={fx.radius} min={0} max={100} step={1} on={fxNum(i, v => ({ radius: v }))} tip="veFxRadius" /></div>
           )}
         </div>
       ))}
     </div>
   )}
-</div>; })()}{selectionColors.length > 0 && <div className="fig-isec fade"><div className="fig-isec-title"><span>Selection colors ({selectionColors.length})</span><span className="text-[10px] mut font-normal">{L.riSelColorHint}</span></div><div className="flex flex-wrap gap-1.5 pb-1.5"><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="frOpen" data-testid="fr-open-selcolors" onClick={() => setFrOpen(v => !v)}><Ico n="refresh" size={11} /> {L.frOpenBtn}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="rcOpen" data-testid="rc-open-selcolors" onClick={() => setRcOpen(v => !v)}><Ico n="palette" size={11} /> {L.rcOpenBtn}</button></div><div className="flex flex-wrap items-center gap-1.5 pb-1.5"><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameFill" data-testid="sel-same-fill" onClick={() => onSelectSame('fill')}><Ico n="drop" size={11} /> {L.edCtxSelSameFill}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameStroke" data-testid="sel-same-stroke" onClick={() => onSelectSame('stroke')}><Ico n="pencil" size={11} /> {L.edCtxSelSameStroke}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameType" data-testid="sel-same-type" onClick={() => onSelectSame('type')}><Ico n="shapes" size={11} /> {L.edCtxSelSameType}</button></div><div className="sel-col-list space-y-1.5">{selectionColors.slice(0, 40).map(sc => <div key={sc.stableKey} className="flex items-center gap-2 p-1.5 rounded-xl" style={{
+</div>; })()}{selectionColors.length > 0 && <div className="fig-isec fade"><div className="fig-isec-title"><span>Selection colors ({selectionColors.length})</span><span className="text-[10px] mut font-normal">{L.riSelColorHint}</span></div><div className="flex flex-wrap gap-1.5 pb-1.5"><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="rcOpen" data-testid="rc-open-selcolors" onClick={() => setRcOpen(v => !v)}><Ico n="palette" size={11} /> {L.rcOpenBtn}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="frOpen" data-testid="fr-open-selcolors" onClick={() => setFrOpen(v => !v)}><Ico n="refresh" size={11} /> {L.frOpenBtn}</button></div><div className="flex flex-wrap items-center gap-1.5 pb-1.5"><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameFill" data-testid="sel-same-fill" onClick={() => onSelectSame('fill')}><Ico n="drop" size={11} /> {L.edCtxSelSameFill}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameStroke" data-testid="sel-same-stroke" onClick={() => onSelectSame('stroke')}><Ico n="pencil" size={11} /> {L.edCtxSelSameStroke}</button><button type="button" className="ved-pill text-[10px]" style={{ padding: '6px 10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veSelSameType" data-testid="sel-same-type" onClick={() => onSelectSame('type')}><Ico n="shapes" size={11} /> {L.edCtxSelSameType}</button></div><div className="sel-col-list space-y-1.5">{selectionColors.slice(0, 40).map(sc => <div key={sc.stableKey} className="flex items-center gap-2 p-1.5 rounded-xl" style={{
           background: 'var(--sub)'
         }}><ColorField L={L} tip="veSelColor" value={sc.raw || sc.hex} on={(v, meta) => replaceSelectionColor(sc, v, meta)} /><span className="text-[11px] font-mono flex-1 truncate">{(sc.raw || sc.hex).toUpperCase()}</span><span className="fig-badge">{sc.kind === 'grad' ? L.riKindGrad : sc.kind === 'fill' ? 'Fill' : 'Stroke'} · {sc.ids.length}</span><button type="button" className="ved-pill text-[10px]" style={{
             padding: '2px 6px'
           }} data-tip="veSelPick" onClick={() => {
             setSel({
               objs: new Set(sc.ids),
               nodes: new Set()
             });
             say(sc.ids.length + ' objek ' + sc.hex.toUpperCase() + ' dipilih');
           }}>◎</button></div>)}</div></div>}<FindReplaceSection open={frOpen} onClose={() => setFrOpen(false)} committedDoc={committedDoc} selIds={new Set(selObjs.map(o => o.id))} onPreviewDoc={onFrPreviewDoc} onCommitPreview={onFrCommitPreview} say={say} L={L} onRecentColor={onRecentColor} /><RecolorSection open={rcOpen} onClose={() => setRcOpen(false)} committedDoc={committedDoc} selIds={new Set(selObjs.map(o => o.id))} onPreviewDoc={onRcPreviewDoc} onCommitPreview={onRcCommitPreview} say={say} L={L} /><div className="fig-isec" data-tip="veLayPanel"><div className="fig-isec-title"><span>Auto layout</span><div className="flex items-center gap-1"><button type="button" className="ved-pill text-[10px]" style={{

## Stat
EditorRightInspector.jsx: 2 diff lines
Bundle tripwire (unchanged per report): AST 841, !important 356, acc-deep 5

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t3-swap-fr-rc.cjs (baru, probe TDD A1-A7)
- probes/shots/r3-t3-swap-fr-rc-before.png, r3-t3-swap-fr-rc-after.png
