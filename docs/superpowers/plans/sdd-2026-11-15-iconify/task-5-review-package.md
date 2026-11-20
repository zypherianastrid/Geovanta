=== TASK 5 REVIEW PACKAGE ===

--- New files ---
probes/probe-iconify.cjs (11,582 B, assertions P0-P7)
probes/shots/iconify-t5-open.png (92,432 B)
probes/shots/iconify-t5-closed.png (91,841 B)
docs/superpowers/plans/sdd-2026-11-15-iconify/task-5-report.md

--- Backups (pre-edit, .bak-iconify-t5) ---
-rw-rw---- 1 root root  53361 Nov 15 02:43 src/components/editor/EditorRightInspector.jsx.bak-iconify-t5
-rw-rw---- 1 root root 358186 Nov 15 02:43 src/components/editor/VectorEditor.jsx.bak-iconify-t5
-rw-rw---- 1 root root  12606 Nov 15 02:43 src/constants/editorToolsAndShapes.jsx.bak-iconify-t5

--- Diff 1: editorToolsAndShapes.jsx ---
--- src/constants/editorToolsAndShapes.jsx.bak-iconify-t5	2026-11-15 02:43:01.492483415 +0000
+++ src/constants/editorToolsAndShapes.jsx	2026-11-15 02:43:08.145788752 +0000
@@ -4,6 +4,7 @@
  */
 import { shPoly, SHK, shUnit, K2, shNgon, shStar } from '../utils/shapeGenerators.jsx';
 import { TIPS, TIPS_EN } from './tooltipsCatalog.jsx';
+import { ICONS } from './brandAndIcons.jsx';
 
 /* Grup 1: Alat Node & Handle — Set Ikon Geometris Terpadu (24x24, radius & stroke selaras) */
 const VE_NODE_GROUP = [['node', 'veNode', 'M4 19C6.5 11 11 6.5 19 4 M9.5 10.5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2z M5.5 5.5h3v3h-3z M15.5 15.5h3v3h-3z M8.5 7L10 9.5 M14 14.5L15.5 17'], ['addnode', 'veAddNode', 'M4 18C6 10 10 6 18 4 M9.5 9.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0 M17.5 14.5v5 M15 17h5'], ['addhandle', 'veAddHandle', 'M4 18C8 10 16 10 20 18 M5 9h14 M10 9a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M3.5 9a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0 M17.5 9a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0'], ['autohandle', 'veAutoHandle', 'M3.5 16.5C7 7.5 11 7.5 12 12s5 4.5 8.5-4.5 M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M5 6.5h4 M15 17.5h4']];
@@ -44,6 +45,11 @@
   type: 'group',
   id: 'geoGrp',
   items: VE_GEO_GROUP
+}, {
+  /* Task 5 (Iconify): entri tunggal — glyph ICONS.shapes yang sudah ada
+     (segitiga + kotak + lingkaran = "ikon"), tanpa ikon baru yang dibundel. */
+  type: 'single',
+  item: ['iconify', 'veIconify', ICONS.shapes]
 }];
 /* ---------- Pustaka shape: setiap generator mengembalikan path M/L/C/Z di kotak (x, y, w, h) ---------- */
 
@@ -93,6 +99,17 @@
     d: TIPS_EN.veShapeItem.d
   };
 });
+/* Task 5 (Iconify): tooltip tombol Ikon — mengikuti pola mutasi TIPS di
+   file ini (lihat SHAPES.forEach di atas). Tanpa `k`: tidak ada shortcut
+   keyboard baru untuk tool ini. */
+TIPS.veIconify = {
+  t: 'Ikon',
+  d: 'Cari dan sisipkan ikon vektor dari Iconify. Klik lagi untuk menutup panel.'
+};
+TIPS_EN.veIconify = {
+  t: 'Icons',
+  d: 'Search and insert vector icons from Iconify. Click again to close the panel.'
+};
 /* Daftar opsi Snap (Custom Checklist) + warna penanda + matriks kapabilitas per alat (SN-006) */
 const DEFAULT_SNAP_CFG = {
   bbox: true,
--- Diff 2: VectorEditor.jsx ---
--- src/components/editor/VectorEditor.jsx.bak-iconify-t5	2026-11-15 02:43:01.494333661 +0000
+++ src/components/editor/VectorEditor.jsx	2026-11-15 02:43:14.339788704 +0000
@@ -172,6 +172,26 @@
     setSelS(s);
   };
   const [tool, setTool] = useState('select');
+  /* Task 5 (Iconify, R17): wrapper toggle untuk floating bar — klik tombol
+     Ikon saat tool sudah 'iconify' kembali ke 'select'; semua tool lain
+     pass-through. Hanya prop yang diteruskan ke EditorFloatingToolbar yang
+     memakai wrapper ini; pemakaian setTool internal tidak berubah. */
+  const setToolToggle = React.useCallback(k => {
+    setTool(prev => (k === 'iconify' && prev === 'iconify' ? 'select' : k));
+  }, []);
+  /* Task 5 (Iconify): onClose stabil — setTool adalah setter state React
+     yang identitasnya stabil, jadi callback tidak pernah stale meskipun
+     effect Esc panel hanya berdependensi [open]. */
+  const onIconifyClose = React.useCallback(() => setTool('select'), []);
+  /* Task 5 (Iconify): stub onInsert — Task 6 menggantinya dengan logika
+     sisip. Untuk sekarang hanya mencatat pemanggilan (probe/diagnostik),
+     tanpa logika sisip apa pun. */
+  const onIconifyInsert = React.useCallback(icon => {
+    if (typeof window !== 'undefined') {
+      window.__iconifyInsertCalls = window.__iconifyInsertCalls || [];
+      window.__iconifyInsertCalls.push(icon);
+    }
+  }, []);
   const [editingText, setEditingText] = useState(null);
   const [fontCatalogVer, setFontCatalogVer] = useState(0);
   // Google Fonts embed: keluarga yang sedang diunduh/dsematkan + peta job
@@ -8783,7 +8803,7 @@
                   setRenamingId(null);
                 }} /></div>;
             }
-          })()}<EditorFloatingToolbar L={L} lang={prefs && prefs.lang || 'id'} tool={tool} setOpenGrp={setOpenGrp} setTool={setTool} lastGrpTool={lastGrpTool} openGrp={openGrp} grpBtnRefs={grpBtnRefs} vcSimpRef={vcSimpRef} openVcSimplify={openVcSimplify} setShapeOpen={setShapeOpen} say={say} shapeBtn={shapeBtn} shapeOpen={shapeOpen} shapeKind={shapeKind} setShapeKind={setShapeKind} snapMenuBtn={snapMenuBtn} snapOn={snapOn} setSnapOn={setSnapOn} snapMenuOpen={snapMenuOpen} setSnapMenuOpen={setSnapMenuOpen} setSnapCfg={setSnapCfg} snapCfg={snapCfg} gridOn={gridOn} setGridOn={setGridOn} mirrorBtn={mirrorBtn} mirrorCur={mirrorCur} selNodes={selNodes} mirrorOpen={mirrorOpen} setMirrorOpen={setMirrorOpen} MIRROR_OPTS={MIRROR_OPTS} curveDragOn={curveDragOn} setCurveDragOn={setCurveDragOn} commitObjs={commitObjs} sel={sel} selHandles={selHandles} applyMirror={applyMirror} onSettings={onSettings} boolOpen={boolOpen} setBoolOpen={setBoolOpen} boolBtn={boolBtn} selObjs={selObjs} applyBoolean={applyBoolean} applyOutlineStroke={applyOutlineStroke} openOffsetStrip={openOffsetStrip} nodeScale={nodeScale} setNodeScale={updateNodeScale} delSel={delSel} applyType={applyType} applySmoothNodes={applySmoothNodes} setClosed={setClosed} applyAutoSmooth={applyAutoSmooth} applyConvertToCurves={applyConvertToCurves} applyJoinNodes={applyJoinNodes} applySplitPath={applySplitPath} applyReversePath={applyReversePath} />{(() => {
+          })()}<EditorFloatingToolbar L={L} lang={prefs && prefs.lang || 'id'} tool={tool} setOpenGrp={setOpenGrp} setTool={setToolToggle} lastGrpTool={lastGrpTool} openGrp={openGrp} grpBtnRefs={grpBtnRefs} vcSimpRef={vcSimpRef} openVcSimplify={openVcSimplify} setShapeOpen={setShapeOpen} say={say} shapeBtn={shapeBtn} shapeOpen={shapeOpen} shapeKind={shapeKind} setShapeKind={setShapeKind} snapMenuBtn={snapMenuBtn} snapOn={snapOn} setSnapOn={setSnapOn} snapMenuOpen={snapMenuOpen} setSnapMenuOpen={setSnapMenuOpen} setSnapCfg={setSnapCfg} snapCfg={snapCfg} gridOn={gridOn} setGridOn={setGridOn} mirrorBtn={mirrorBtn} mirrorCur={mirrorCur} selNodes={selNodes} mirrorOpen={mirrorOpen} setMirrorOpen={setMirrorOpen} MIRROR_OPTS={MIRROR_OPTS} curveDragOn={curveDragOn} setCurveDragOn={setCurveDragOn} commitObjs={commitObjs} sel={sel} selHandles={selHandles} applyMirror={applyMirror} onSettings={onSettings} boolOpen={boolOpen} setBoolOpen={setBoolOpen} boolBtn={boolBtn} selObjs={selObjs} applyBoolean={applyBoolean} applyOutlineStroke={applyOutlineStroke} openOffsetStrip={openOffsetStrip} nodeScale={nodeScale} setNodeScale={updateNodeScale} delSel={delSel} applyType={applyType} applySmoothNodes={applySmoothNodes} setClosed={setClosed} applyAutoSmooth={applyAutoSmooth} applyConvertToCurves={applyConvertToCurves} applyJoinNodes={applyJoinNodes} applySplitPath={applySplitPath} applyReversePath={applyReversePath} />{(() => {
             if (typeof window !== 'undefined') {
               window.__geovantaEditorApi = {
                 loadTestSvg: (svgStr, label) => {
@@ -8866,7 +8886,7 @@
               onImportFont={() => pickFiles('.ttf,.otf,font/ttf,font/otf', fs => importFontFiles(fs))}
               onConvertToPath={convertTextSelectionToPath}
             />;
-          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} /></div>{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
+          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} onIconifyClose={onIconifyClose} onIconifyInsert={onIconifyInsert} /></div>{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
       if (e.target === e.currentTarget) setImportModalOpen(false);
     }}><div className="hp" role="dialog" aria-label="Impor Berkas" style={{
         maxWidth: 480
--- Diff 3: EditorRightInspector.jsx ---
--- src/components/editor/EditorRightInspector.jsx.bak-iconify-t5	2026-11-15 02:43:01.495930676 +0000
+++ src/components/editor/EditorRightInspector.jsx	2026-11-15 02:43:19.963788661 +0000
@@ -22,6 +22,7 @@
 import { createStyle, renameStyle, deleteStyle, linkStyle, unlinkStyle, applyStyleEdit, paintSlot, directPaintEdit } from '../../engine/colorStyles.jsx';
 import { FindReplaceSection } from './FindReplaceSection.jsx';
 import { RecolorSection } from './RecolorSection.jsx';
+import { IconifyPanel } from './IconifyPanel.jsx';
 import { addEffect, removeEffect, updateEffect, toggleEffect } from '../../engine/effectsEngine.jsx';
 import { Float } from '../ui/FloatPopover.jsx';
 import { parseColorWithAlpha } from '../../utils/colorParserAndFormatter.jsx';
@@ -138,7 +139,12 @@
   weaveParams,
   onWeaveParams,
   arcParams,
-  onArcParams
+  onArcParams,
+  /* Task 5 (Iconify, R17): panel dimount di sini (Opsi A) sebagai seksi
+     .fig-isec di .fig-r-scroll — lihat render di bawah. `status` /
+     `recentIcons` baru dipasok Task 7 (panel memakai default-nya). */
+  onIconifyClose,
+  onIconifyInsert
 }) => {
   /* T13 (D-I4): SATU primer per tampilan di inspector. "Terapkan" hanya
      primer bila ada perubahan auto-layout yang belum diterapkan; bila tidak
@@ -198,7 +204,7 @@
         alignItems: 'center',
         justifyContent: 'center',
         textAlign: 'center'
-      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{(() => {
+      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{tool === 'iconify' && <IconifyPanel open onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} />}{(() => {
   /* Seksi "Parameter tool" (Task 2): switch per tool — Task 3 (Weave) dan
      Task 5 (Arc) menambahkan cabang mereka sendiri di sini. Tool AKTIF menang
      atas fallback seleksi (fix round 1 Task 3): bila tool adalah generator,

--- Summary ---
editorToolsAndShapes.jsx: +18 (VE_TOOLS entry + TIPS/TIPS_EN)
VectorEditor.jsx: +20 (setToolToggle, stable onIconifyClose, onInsert stub, 2 inspector props)
EditorRightInspector.jsx: +8 (import + 2 props + mount in .fig-r-scroll)
Probe: 11/11 green; npm test 299/299; build exit 0 (per report).
