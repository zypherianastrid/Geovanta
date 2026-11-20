# Final review package — whole-branch diff (earliest .bak per file vs current)

## Changed source files (vs ZIP input, verified by controller via ZIP diff)
- src/vendor/tailwindOfflineBundle.jsx (T1, T4, T5)
- src/components/editor/VectorEditor.jsx (T2)
- src/components/editor/EditorRightInspector.jsx (T3-T7)
- src/components/editor/RecolorSection.jsx (T4)
- src/components/editor/EditorFloatingToolbar.jsx (T9)
- tests/corner-clamp.test.cjs (T2)
- tests/accent-tokens.test.cjs (T4)
- dist/web bundle (build output)
- docs: plan + progress ledger (new)

## VectorEditor.jsx (bak-t2 vs current)
--- src/components/editor/VectorEditor.jsx.bak-t2	2026-11-14 14:34:13.215432013 +0000
+++ src/components/editor/VectorEditor.jsx	2026-11-14 14:34:25.565520545 +0000
@@ -7938,17 +7938,21 @@
   const isBgObj = o => o.isFrameBg || o.isAutoFrame;
   /* Deteksi semua sudut (tidak terbatas 4 sudut — mendukung segitiga, persegi, poligon, bintang, dan path kompleks) */
   const cornerTargets = React.useMemo(() => selObjs.some(o => !isBgObj(o) && !o.img && !o.text) ? selObjs.filter(o => !isBgObj(o) && !o.img && !o.text) : selObjs.filter(o => !o.img && !o.text), [selObjs]);
-  const detectedCorners = React.useMemo(() => {
+  /* Ronde 2 T2: deteksi sudut sebagai fungsi murni atas (targets, indivOpen)
+     agar setRadius bisa menghitung ulang dari docRef/selRef saat dipanggil
+     dari closure gesture lama (scrub label / tahan tombol step). Memo di
+     bawah memakai fungsi yang sama sehingga perilaku render tidak berubah. */
+  const buildDetectedCorners = (targets, indivOpen) => {
     const list = [];
-    if (!cornerTargets.length) return list;
+    if (!targets.length) return list;
     /* Guard performa: jika panel Individual Corner tertutup dan seleksi punya >64 objek, cukup baca dari objek utama */
-    const scanObjs = !indivCornerOpen && cornerTargets.length > 16 ? cornerTargets.slice(0, 16) : cornerTargets;
+    const scanObjs = !indivOpen && targets.length > 16 ? targets.slice(0, 16) : targets;
     scanObjs.forEach(o => {
       const bb = vinfo(o).bb;
       const cx = (bb[0] + bb[2]) / 2,
         cy = (bb[1] + bb[3]) / 2;
       const dirArrow = (x, y) => {
-        if (!indivCornerOpen) return '';
+        if (!indivOpen) return '';
         const dx = x - cx,
           dy = y - cy;
         if (Math.hypot(dx, dy) < 1e-3) return '•';
@@ -8034,7 +8038,8 @@
       });
     });
     return list;
-  }, [indivCornerOpen, cornerTargets]);
+  };
+  const detectedCorners = React.useMemo(() => buildDetectedCorners(cornerTargets, indivCornerOpen), [indivCornerOpen, cornerTargets]);
 
   /* Pastikan pilihan sudut tetap sinkron saat objek berganti */
   useEffect(() => {
@@ -8108,19 +8113,37 @@
   };
   const setRadius = r => {
     const rad = Math.max(0, Number(r) || 0);
-    if (sel.nodes && sel.nodes.size > 0) {
-      const nodeMatched = detectedCorners.filter(c => c.nodeIds.some(id => sel.nodes.has(id)));
+    /* Ronde 2 T2 (akar drag-vs-ketik): scrub label / tahan tombol step
+       memanggil setRadius dari closure render saat pointerdown. Sesudah
+       pointermove pertama membuat fillet, id node apex lama sudah diganti
+       pasangan fillet ber-id baru — sel.nodes & detectedCorners dari
+       closure itu basi, engine tidak menemukan id (cnt=0, res.o===o),
+       commitObjs false -> toast "Sudut tidak cukup panjang" + nilai
+       mental. Ketik & klik step tunggal lolos karena tiap panggilan
+       memakai closure render segar. Karena itu target di sini selalu
+       diturunkan ulang dari docRef/selRef yang sinkron (bukan state
+       render): nodeMatched, activeCorners, dan detectedCorners segar. */
+    const d = docRef.current;
+    const freshSelObjs = d.objects.filter(o => selRef.current.objs.has(o.id));
+    const freshTargets = freshSelObjs.some(o => !isBgObj(o) && !o.img && !o.text) ? freshSelObjs.filter(o => !isBgObj(o) && !o.img && !o.text) : freshSelObjs.filter(o => !o.img && !o.text);
+    const freshCorners = buildDetectedCorners(freshTargets, indivCornerOpen);
+    const freshNodes = selRef.current.nodes;
+    if (freshNodes && freshNodes.size > 0) {
+      const nodeMatched = freshCorners.filter(c => c.nodeIds.some(id => freshNodes.has(id)));
       if (nodeMatched.length > 0) {
         applyRadiusToCorners(nodeMatched, rad, 'cr-nodes');
         return;
       }
     }
-    if (indivCornerOpen && activeCorners.length > 0) {
-      applyRadiusToCorners(activeCorners, rad, 'cr-sel');
-      return;
+    if (indivCornerOpen) {
+      const freshActive = freshCorners.filter(c => pickedCornerKeys.has(c.key));
+      if (freshActive.length > 0) {
+        applyRadiusToCorners(freshActive, rad, 'cr-sel');
+        return;
+      }
     }
-    if (detectedCorners.length > 0) {
-      applyRadiusToCorners(detectedCorners, rad, 'cr');
+    if (freshCorners.length > 0) {
+      applyRadiusToCorners(freshCorners, rad, 'cr');
       return;
     }
     const targets = selObjs.some(o => !isBgObj(o)) ? new Set(selObjs.filter(o => !isBgObj(o)).map(o => o.id)) : sel.objs;

## EditorFloatingToolbar.jsx (bak-t9 vs current)
--- src/components/editor/EditorFloatingToolbar.jsx.bak-t9	2026-11-14 16:12:01.363481053 +0000
+++ src/components/editor/EditorFloatingToolbar.jsx	2026-11-14 16:12:10.532754923 +0000
@@ -192,7 +192,7 @@
         setTool('shape');
         setShapeOpen(false);
         say((lang === 'en' ? (SHAPE_EN[k] || lb) : lb) + (lang === 'en' ? ': drag on the canvas to draw' : ': seret di kanvas untuk menggambar'));
-      }}><ShapeGlyph k={k} s={22} /></button>)}</div></Float><span className="fig-bar-sep" /><div ref={snapMenuBtn} className="inline-flex items-center"><IconBtn lang={lang} s={22} on={snapOn} tip="veSnap" act={() => setSnapOn(s => !s)} d="M6 4v6a6 6 0 0 0 12 0V4 M6 7.5h3.5 M14.5 7.5H18" /><button type="button" className="tool-btn chev-btn" data-tip="veSnapMenu" aria-label={L.ftSnapOpts} aria-expanded={snapMenuOpen} onClick={() => setSnapMenuOpen(o => !o)}><Chev open={snapMenuOpen} /></button></div><Float anchor={snapMenuBtn} open={snapMenuOpen} onClose={() => setSnapMenuOpen(false)} w={272} 
+      }}><ShapeGlyph k={k} s={22} /></button>)}</div></Float><span className="fig-bar-sep" /><div ref={snapMenuBtn} className="inline-flex items-center">{/* T9: ikon magnet digambar baru (U-magnet + ujung kutub), mengikuti gaya set ikon internal: viewBox 24, stroke, round cap/join; dirender IconBtn -> Vi. */}<IconBtn lang={lang} s={22} on={snapOn} tip="veSnap" act={() => setSnapOn(s => !s)} d="M6 6v6a6 6 0 0 0 12 0V6 M4 9.5h4 M16 9.5h4" /><button type="button" className="tool-btn chev-btn" data-tip="veSnapMenu" aria-label={L.ftSnapOpts} aria-expanded={snapMenuOpen} onClick={() => setSnapMenuO
           bbox: true,
           spacing: true,
           artboard: true,

## tests/corner-clamp.test.cjs (bak-t2 vs current)
--- tests/corner-clamp.test.cjs.bak-t2	2026-11-14 14:34:13.225520020 +0000
+++ tests/corner-clamp.test.cjs	2026-11-14 14:35:06.258522277 +0000
@@ -133,3 +133,46 @@
   assert.equal(res.o.subs[0].nodes.length, 8, '5 node -> 4 apex (1 merge fail-open) -> 8 node fillet');
   assert.deepEqual(filRadii(res.o), [10, 10, 10, 10], 'keempat sudut efektif 10');
 });
+
+test('(g) Ronde 2 T2: id apex BASI sesudah fillet -> no-op (cnt 0, objek sama)', () => {
+  // Inilah yang terjadi pada drag scrub sebelum perbaikan: handler scrub
+  // memanggil setRadius dari closure render lama dengan id apex yang sudah
+  // diganti pasangan fillet ber-id baru. Engine TIDAK boleh menebak-nebak
+  // (fail-closed): pemanggil UI wajib me-resolve ulang id segar via
+  // detectedCorners dari docRef/selRef. Tes ini mengunci kontrak itu.
+  const o = pathObj([
+    { id: 'n1', x: 0, y: 0, type: 'corner' },
+    { id: 'n2', x: 40, y: 0, type: 'corner' },
+    { id: 'n3', x: 40, y: 40, type: 'corner' },
+    { id: 'n4', x: 0, y: 40, type: 'corner' }
+  ]);
+  const r1 = setSelectedNodesRadius(o, new Set(['n1', 'n2', 'n3', 'n4']), 10, { mode: 'circular' });
+  assert.equal(r1.o.subs[0].nodes.length, 8, 'fillet pertama: 4 sudut -> 8 node');
+  const r2 = setSelectedNodesRadius(r1.o, new Set(['n1', 'n2', 'n3', 'n4']), 20, { mode: 'circular' });
+  assert.equal(r2.o, r1.o, 'id basi: objek tidak berubah (commitObjs -> false -> toast)');
+  assert.equal(r2.cnt, 0, 'id basi: cnt 0');
+});
+
+test('(h) Ronde 2 T2: id pasangan fillet SEGAR -> refillet jalan (jalur drag sesudah fix)', () => {
+  // Simulasi pointermove ke-2 sesudah UI me-resolve ulang id: pasangan
+  // fillet hasil panggilan pertama dipakai sebagai target panggilan kedua.
+  const o = pathObj([
+    { id: 'n1', x: 0, y: 0, type: 'corner' },
+    { id: 'n2', x: 40, y: 0, type: 'corner' },
+    { id: 'n3', x: 40, y: 40, type: 'corner' },
+    { id: 'n4', x: 0, y: 40, type: 'corner' }
+  ]);
+  const r1 = setSelectedNodesRadius(o, new Set(['n1', 'n2', 'n3', 'n4']), 10, { mode: 'circular' });
+  const pairIds = new Set(r1.o.subs[0].nodes.filter(n => n.fil).map(n => n.id));
+  assert.equal(pairIds.size, 8, '4 pasangan fillet = 8 id baru');
+  const r2 = setSelectedNodesRadius(r1.o, pairIds, 20, { mode: 'circular' });
+  assert.notEqual(r2.o, r1.o, 'id segar: objek berubah');
+  assert.ok(r2.cnt > 0, 'id segar: cnt > 0');
+  // Cap 0.49*40=19.6 untuk 3 sudut; sudut terakhir yang diproses mendapat
+  // cap 0.92*40=36.8 (quirk urutan cap pra-ada, bukan bagian T2) -> 20.
+  assert.deepEqual(filRadii(r2.o), [19.6, 19.6, 19.6, 20], 'radius dijepit per-sudut, tanpa penolakan');
+  const pairIds2 = new Set(r2.o.subs[0].nodes.filter(n => n.fil).map(n => n.id));
+  const r3 = setSelectedNodesRadius(r2.o, pairIds2, 200, { mode: 'circular' });
+  assert.notEqual(r3.o, r2.o, 'radius di atas maksimum tetap menghasilkan objek baru (clamp, bukan tolak)');
+  assert.deepEqual(filRadii(r3.o), [19.6, 19.6, 19.6, 36.8], 'radius 200 dijepit ke maksimum per-sudut');
+});

## tests/accent-tokens.test.cjs (bak-t4 vs current)
--- tests/accent-tokens.test.cjs.bak-t4	2026-11-14 15:00:40.461059172 +0000
+++ tests/accent-tokens.test.cjs	2026-11-14 15:00:43.512587708 +0000
@@ -55,10 +55,12 @@
 
 test('aturan tema bundle mendefinisikan ink/deep sebagai color-mix dari --acc', () => {
   const ast = pluginAst();
-  // Tripwire jumlah aturan: 835 + 2 aturan .pin3-fill (Task 5, 2026-11-14 —
-  // varian scoped grid titik poros Transform; di-append di akhir array
-  // sehingga indeks [464]/[465] tidak bergeser).
-  assert.equal(ast.length, 837);
+  // Tripwire jumlah aturan: 837 + 4 aturan T4 ronde 2 (2026-11-14 —
+  // varian vertikal Seg Recolor + teks tengah range: .seg.vert,
+  // .seg.vert > .seg-p, .seg.vert button.on, .c-inp.ctr; di-append di
+  // akhir array seperti .pin3-fill sehingga indeks [464]/[465] tidak
+  // bergeser).
+  assert.equal(ast.length, 841);
   assert.equal(ast[464].s, ':root, :root[data-theme="light"]');
   assert.equal(ast[465].s, ':root[data-theme="dark"]');
   const light = decls(ast[464]);
--- EditorRightInspector (bak-t3 vs current): line counts ---
27
4

## Bundle AST diff (bak-t1 = pre-round-2 vs current)
rules bak=837 cur=841
CHANGED idx 311
BAK: {"t":"r","s":".pin3","d":[["display","grid"],["grid-template-columns","repeat(3,1fr)"],["gap","3px"],["padding","5px"],["border-radius","10px"],["background","var(--sub)"],["width","62px"],["flex","none"]]}
CUR: {"t":"r","s":".pin3","d":[["display","grid"],["grid-template-columns","repeat(3,1fr)"],["gap","3px"],["padding","5px"],["border-radius","10px"],["background","var(--sub)"],["width","62px"],["flex","none"],["aspect-ratio","1"],["grid-template-rows","repeat(3,1fr)"]]}
CHANGED idx 312
BAK: {"t":"r","s":".pin3 button","d":[["height","14px"],["border-radius","5px"],["background","var(--line)"],["border","0"],["padding","0"],["cursor","pointer"],["transition","background .15s,transform .15s"]]}
CUR: {"t":"r","s":".pin3 button","d":[["height","100%"],["border-radius","5px"],["background","var(--line)"],["border","0"],["padding","0"],["cursor","pointer"],["transition","background .15s,transform .15s"],["min-height","14px"]]}
CHANGED idx 428
BAK: {"t":"r","s":".dk-b.on","d":[["background","var(--acc-deep)"],["color","#fff"]]}
CUR: {"t":"r","s":".dk-b.on","d":[["background","var(--acc)"],["color","#fff"]]}
CHANGED idx 494
BAK: {"t":"r","s":".fig-rail-grp","d":[["display","flex"],["flex-direction","column"],["align-items","center"],["background","var(--sub)"],["border","1px solid transparent"],["border-radius","12px"],["padding","2px"],["gap","1px"],["transition","background-color .2s cubic-bezier(.22,1,.36,1), border-color .2s ease, transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s ease"]]}
CUR: {"t":"r","s":".fig-rail-grp","d":[["display","flex"],["flex-direction","column"],["align-items","center"],["background","var(--sub)"],["border","1px solid transparent"],["border-radius","0"],["padding","2px"],["gap","1px"],["transition","background-color .2s cubic-bezier(.22,1,.36,1), border-color .2s ease, transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s ease"]]}
CHANGED idx 794
BAK: {"t":"r","s":".fig-rail-grp","d":[["background","var(--sub) !important"],["border","1px solid rgba(15, 23, 42, 0.06) !important"],["box-shadow","var(--m3-shadow-xs) !important"],["border-radius","14px !important"]]}
CUR: {"t":"r","s":".fig-rail-grp","d":[["background","var(--sub) !important"],["border","1px solid rgba(15, 23, 42, 0.06) !important"],["box-shadow","none !important"],["border-radius","0 !important"]]}
CHANGED idx 835
BAK: {"t":"r","s":".pin3-fill","d":[["align-self","stretch"],["grid-template-rows","repeat(3,1fr)"]]}
CUR: {"t":"r","s":".pin3-fill","d":[["align-self","stretch"],["grid-template-rows","repeat(3,1fr)"],["width","auto"]]}
CHANGED idx 837
BAK: undefined
CUR: {"t":"r","s":".seg.vert","d":[["flex-direction","column"],["gap","6px"]]}
CHANGED idx 838
BAK: undefined
CUR: {"t":"r","s":".seg.vert > .seg-p","d":[["display","none"]]}
CHANGED idx 839
BAK: undefined
CUR: {"t":"r","s":".seg.vert button.on","d":[["background","color-mix(in srgb, var(--acc) 18%, var(--card))"],["color","var(--fig-sel-ink)"],["box-shadow","0 1px 4px rgba(15, 23, 42, 0.06)"]]}
CHANGED idx 840
BAK: undefined
CUR: {"t":"r","s":".c-inp.ctr","d":[["justify-content","center"]]}
total changed: 10

## EditorRightInspector.jsx full diff (bak-t3 vs current) — appended as separate lines count only; full diff in task-3..7 review packages
15
## RecolorSection.jsx full diff (bak-t4 vs current)
2
