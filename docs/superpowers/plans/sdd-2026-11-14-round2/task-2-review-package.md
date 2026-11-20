# Task 2 review package — diff backup .bak-t2 vs current

## Files changed
-rw-rw---- 1 root root 356577 Nov 14 14:34 src/components/editor/VectorEditor.jsx.bak-t2
-rw-rw---- 1 root root   6531 Nov 14 14:34 tests/corner-clamp.test.cjs.bak-t2

## VectorEditor.jsx diff (unified, full)
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
## corner-clamp.test.cjs diff (unified, full)
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
