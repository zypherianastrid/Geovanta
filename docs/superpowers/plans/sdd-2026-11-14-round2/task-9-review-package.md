# Task 9 review package — diff backup .bak-t9 vs current

## EditorFloatingToolbar.jsx diff
--- src/components/editor/EditorFloatingToolbar.jsx.bak-t9	2026-11-14 16:12:01.363481053 +0000
+++ src/components/editor/EditorFloatingToolbar.jsx	2026-11-14 16:12:10.532754923 +0000
@@ -192,7 +192,7 @@
         setTool('shape');
         setShapeOpen(false);
         say((lang === 'en' ? (SHAPE_EN[k] || lb) : lb) + (lang === 'en' ? ': drag on the canvas to draw' : ': seret di kanvas untuk menggambar'));
-      }}><ShapeGlyph k={k} s={22} /></button>)}</div></Float><span className="fig-bar-sep" /><div ref={snapMenuBtn} className="inline-flex items-center"><IconBtn lang={lang} s={22} on={snapOn} tip="veSnap" act={() => setSnapOn(s => !s)} d="M6 4v6a6 6 0 0 0 12 0V4 M6 7.5h3.5 M14.5 7.5H18" /><button type="button" className="tool-btn chev-btn" data-tip="veSnapMenu" aria-label={L.ftSnapOpts} aria-expanded={snapMenuOpen} onClick={() => setSnapMenuOpen(o => !o)}><Chev open={snapMenuOpen} /></button></div><Float anchor={snapMenuBtn} open={snapMenuOpen} onClose={() => setSnapMenuOpen(false)} w={272} cls="cp" preferUp={true}><div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold">{L.ftSnapChecklist}</span><div className="flex gap-1"><button type="button" className="ved-pill" data-tip="veSnapPresetAll" onClick={() => setSnapCfg({
+      }}><ShapeGlyph k={k} s={22} /></button>)}</div></Float><span className="fig-bar-sep" /><div ref={snapMenuBtn} className="inline-flex items-center">{/* T9: ikon magnet digambar baru (U-magnet + ujung kutub), mengikuti gaya set ikon internal: viewBox 24, stroke, round cap/join; dirender IconBtn -> Vi. */}<IconBtn lang={lang} s={22} on={snapOn} tip="veSnap" act={() => setSnapOn(s => !s)} d="M6 6v6a6 6 0 0 0 12 0V6 M4 9.5h4 M16 9.5h4" /><button type="button" className="tool-btn chev-btn" data-tip="veSnapMenu" aria-label={L.ftSnapOpts} aria-expanded={snapMenuOpen} onClick={() => setSnapMenuOpen(o => !o)}><Chev open={snapMenuOpen} /></button></div><Float anchor={snapMenuBtn} open={snapMenuOpen} onClose={() => setSnapMenuOpen(false)} w={272} cls="cp" preferUp={true}><div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold">{L.ftSnapChecklist}</span><
           bbox: true,
           spacing: true,
           artboard: true,

## grep path lama di src (di luar .bak)
0
## grep path baru
1
