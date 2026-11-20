# Task 5 review package — diff backup .bak-t5 vs current

## EditorRightInspector.jsx diff
--- src/components/editor/EditorRightInspector.jsx.bak-t5	2026-11-14 15:13:04.697519215 +0000
+++ src/components/editor/EditorRightInspector.jsx	2026-11-14 15:13:12.775199634 +0000
@@ -257,7 +257,7 @@
                 background: 'var(--sub)',
                 width: 30,
                 height: 30
-              }} data-tip="veXfFlipV" aria-label={L.riFlipV} disabled={!!xfNodes} onClick={() => flipXf('v')}><Vi s={15} d="M3 12h18 M7 8l5-5 5 5H7z M7 16l5 5 5-5H7z" /></button></div></div></div><div className="flex items-start gap-2.5 pt-0.5"><PinGrid L={L} value={pin} on={setPin} tip="veXfPin" className="pin3-fill" /><div className="flex-1 space-y-1.5 min-w-0"><Seg o={[['center', L.riPivotCenter], ['pin', L.riPivotPin]]} v={rotPivot} on={setRotPivot} tip="veXfPivot" tips={{
+              }} data-tip="veXfFlipV" aria-label={L.riFlipV} disabled={!!xfNodes} onClick={() => flipXf('v')}><Vi s={15} d="M3 12h18 M7 8l5-5 5 5H7z M7 16l5 5 5-5H7z" /></button></div></div></div><div className="grid grid-cols-[auto_1fr] items-stretch gap-2.5 pt-0.5"><PinGrid L={L} value={pin} on={setPin} tip="veXfPin" className="pin3-fill" /><div className="flex-1 space-y-1.5 min-w-0"><Seg o={[['center', L.riPivotCenter], ['pin', L.riPivotPin]]} v={rotPivot} on={setRotPivot} tip="veXfPivot" tips={{
               center: 'veXfPivC',
               pin: 'veXfPivP'
             }} /><button type="button" className={'ved-pill w-full' + (scaleStk ? ' on' : '')} data-tip="veXfStroke" aria-pressed={scaleStk} onClick={() => setScaleStk(v => !v)}>{L.riStrokeScale}</button></div></div></div>}</div><div className="fig-isec" data-tip="veAppear"><div className="fig-isec-title"><span>Appearance{selObjs.length > 1 ? ' (' + selObjs.length + ')' : ''}</span><button type="button" className="fig-ibtn" data-tip="veToggleHidden" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veToggleHidden.t} disabled={!selObjs.length} onClick={toggleSelHidden}><Ico n={allSelHidden ? 'eyeOff' : 'eye'} size={14} /></button></div>{primary ? <div className="space-y-2 fade"><div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-end"><div><div className="fig-sub-lbl">Opacity</div><XfField label="%" value={Math.round(primary.opacity * 100)} min={0} step={5} on={v => setProp('opacity', clampN(v / 100, 0, 1))} tip="veOpacity" /></div><div><div className="fig-sub-lbl">{indivCornerOpen && activeCorners.length < detectedCorners.length ? `Radius (${activeCorners.length}/${detectedCorners.length})` : 'Corner radius'}</div><XfField label="◜" value={curR} min={0} step={1} dis={!!(primary.img || primary.text)} on={setRadius} tip="veCornerRadius" /></div><button type="button" className={'fig-ibtn' + (indivCornerOpen ? ' on' : '')} style={{

## Bundle AST diff (bak-t5 vs current)
rules bak=841 cur=841
CHANGED idx 311
BAK: {"t":"r","s":".pin3","d":[["display","grid"],["grid-template-columns","repeat(3,1fr)"],["gap","3px"],["padding","5px"],["border-radius","10px"],["background","var(--sub)"],["width","62px"],["flex","none"]]}
CUR: {"t":"r","s":".pin3","d":[["display","grid"],["grid-template-columns","repeat(3,1fr)"],["gap","3px"],["padding","5px"],["border-radius","10px"],["background","var(--sub)"],["width","62px"],["flex","none"],["aspect-ratio","1"],["grid-template-rows","repeat(3,1fr)"]]}
CHANGED idx 312
BAK: {"t":"r","s":".pin3 button","d":[["height","14px"],["border-radius","5px"],["background","var(--line)"],["border","0"],["padding","0"],["cursor","pointer"],["transition","background .15s,transform .15s"]]}
CUR: {"t":"r","s":".pin3 button","d":[["height","100%"],["border-radius","5px"],["background","var(--line)"],["border","0"],["padding","0"],["cursor","pointer"],["transition","background .15s,transform .15s"],["min-height","14px"]]}
CHANGED idx 835
BAK: {"t":"r","s":".pin3-fill","d":[["align-self","stretch"],["grid-template-rows","repeat(3,1fr)"]]}
CUR: {"t":"r","s":".pin3-fill","d":[["align-self","stretch"],["grid-template-rows","repeat(3,1fr)"],["width","auto"]]}
total changed: 3
