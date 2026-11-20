=== WHOLE-BRANCH REVIEW PACKAGE — Geovanta Iconify (Tasks 1-9) ===

--- BASE (pre-Task 1 state) ---
Round 4 ZIP: ~/workspace/your_files/Geovanta-Round4-UI-Fixes.zip, 379 entries, SHA256 83a2348e70b15f96f8e00fad14e9bfca54a9426e3550afc558f32531b4b80978
The working copy before Task 1 == the R4 ZIP contents (verified by Task 9: all 337 R4 files still present byte-identical in the working copy except the 8 changed below; 0 R4 files missing).

--- HEAD (final ZIP) ---
~/workspace/your_files/Geovanta-Iconify.zip, 507 entries (462 files + 45 dirs), 16,142,024 B, SHA256 ba4b1223ea734f558cb90ed2d71c4c102f3290037bb0a4f27fbe46d6d34fb5aa
Full gate: npm test 299/299, probe-iconify 50/50, probe-offline 14/14, build exit 0 / 0 warnings, 0 pageerror; smoke from extracted candidate ZIP 50/50.

--- CHANGED files (8, CRC-verified vs R4) ---
web/assets/geovanta.bundle.js + dist/assets/geovanta.bundle.js: build outputs, +14,596 B total (2,006,042 -> 2,020,638); diff not included (minified bundle — size delta only).
src/vendor/tailwindOfflineBundle.jsx: UNCHANGED in the Iconify era.

--- Diff (R4 BASE -> HEAD): src/components/editor/VectorEditor.jsx ---
--- /tmp/iconify-base-r4/VectorEditor.jsx.r4	2026-11-15 03:40:51.553762070 +0000
+++ src/components/editor/VectorEditor.jsx	2026-11-15 03:10:03.782776305 +0000
@@ -58,6 +58,7 @@
 import { normalizeTextDocument, normalizeTextObject, isLegacyText, legacyTextSpec, textAutoName } from '../../engine/legacyText.jsx';
 import { inspectFontBytes } from '../../renderer/textFontRegistry.jsx';
 import { GOOGLE_FONTS, embedGoogleFont } from '../../renderer/googleFonts.jsx';
+import { loadSet, buildIconSvg, isPaletteIcon, listCollections } from '../../renderer/iconifyClient.jsx';
 import { pickFiles } from '../../utils/presenceAndFilePicker.jsx';
 import { TextEditOverlay } from './TextEditOverlay.jsx';
 import { TextInspector } from './TextInspector.jsx';
@@ -142,6 +143,23 @@
       return { ...prev, recentColors: next };
     });
   };
+  /* Ikon terakhir (Task 7, Iconify): maks. 12 nama PENUH "prefix:nama"
+     dari sisipan yang berhasil, disimpan di prefs.recentIcons (App yang
+     me-persist via savePrefs). Hanya nama penuh yang dicatat — nama
+     pendek tanpa ":" tidak bisa di-resolve insert Task 6 (prefix
+     diturunkan dari nama; tanpa ":" -> toast, nol objek), jadi nama
+     seperti itu tidak pernah disimpan. Pola rememberRecentColor. */
+  const rememberRecentIcon = fullName => {
+    if (typeof setPrefs !== 'function' || typeof fullName !== 'string') return;
+    const name = fullName.trim();
+    if (!name.includes(':')) return;
+    setPrefs(prev => {
+      const cur = Array.isArray(prev && prev.recentIcons) ? prev.recentIcons : [];
+      const next = [name, ...cur.filter(c => c !== name)].slice(0, 12);
+      if (next.length === cur.length && next.every((c, i) => c === cur[i])) return prev;
+      return { ...prev, recentIcons: next };
+    });
+  };
   const vectorDocument = normalizeTextDocument;
   const documentForExport = d => d;
   const first = React.useMemo(() => {
@@ -172,6 +190,108 @@
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
+  /* Task 6 (Iconify): alur sisip — loadSet -> buildIconSvg -> aturan warna
+     (isPaletteIcon) -> VE.parseSVG -> skala ke frame 96 px di tengah
+     viewport, satu grup bernama, metadata icon, satu entri riwayat,
+     langsung terseleksi. Gagal -> toast, nol objek dibuat (commit hanya
+     terjadi sesudah parse + transform berhasil).
+     Aturan warna (spec §7.5): ikon palette mempertahankan warna aslinya;
+     ikon monokrom memakai gaya AKTIF (shapeSty — gaya yang sama dipakai
+     makeShape untuk shape baru): path ber-fill memakai Fill aktif, path
+     ber-stroke memakai warna + ketebalan Stroke aktif. Ketebalan aktif
+     diterapkan dalam ruang ikon, lalu skala frame mengalikannya (skala
+     artwork seragam — stroke native 2 pada 24 unit ter-render 8 pada 96,
+     seperti yang diverifikasi Task 1; bila sw aktif <= 0, pakai lebar
+     native ikon supaya ikon stroke-based tidak lenyap). Lisensi dari API
+     berupa objek {title, spdx, url}; metadata menyimpan string SPDX
+     (spec §7.6 mencontohkan string, mis. "Apache-2.0"). Nama grup =
+     nama ikon penuh, diunikkan bila bentrok (pola grup- di importFiles).
+     Ikon recent ({name} saja, tanpa prefix/license — Task 7): prefix
+     diturunkan dari nama bila berbentuk "prefix:nama"; license dicari
+     dari listCollections (best-effort, tidak pernah menggagalkan sisip).
+     Nama tanpa prefix sama sekali tidak bisa di-resolve -> toast. */
+  const onIconifyInsert = React.useCallback(async icon => {
+    const fullName = typeof icon === 'string' ? icon : (icon && icon.name) || '';
+    if (!fullName || typeof fullName !== 'string') return;
+    const prefix = (icon && typeof icon === 'object' && icon.prefix)
+      || (fullName.includes(':') ? fullName.split(':')[0] : '');
+    if (typeof window !== 'undefined') {
+      window.__iconifyInsertCalls = window.__iconifyInsertCalls || [];
+      window.__iconifyInsertCalls.push(icon);
+    }
+    if (!prefix) {
+      say('Ikon tidak bisa disisipkan: nama set tidak diketahui');
+      return;
+    }
+    if (!boxRef.current) return;
+    try {
+      const setData = await loadSet(prefix);
+      const palette = isPaletteIcon(icon, setData);
+      const st = shapeStyRef.current || { fill: '#18181b', stroke: '#18181b', sw: 2 };
+      const parsed = VE.parseSVG(buildIconSvg(fullName, setData));
+      if (parsed.error || !parsed.objects.length) throw new Error('Ikon tidak bisa diurai');
+      const vb = parsed.viewBox || [0, 0, 24, 24];
+      const k = 96 / (vb[2] || 24);
+      const r = boxRef.current.getBoundingClientRect();
+      const ctr = toDoc(r.left + r.width / 2, r.top + r.height / 2);
+      const dx = ctr.x - (vb[0] + vb[2] / 2) * k;
+      const dy = ctr.y - (vb[1] + vb[3] / 2) * k;
+      let license = (icon && typeof icon === 'object') ? icon.license : null;
+      if (license == null) {
+        try {
+          const cols = await listCollections();
+          license = (cols.find(c => c.prefix === prefix) || {}).license ?? null;
+        } catch (e) { license = null; }
+      }
+      license = typeof license === 'string' ? license : (license && (license.spdx || license.title)) || null;
+      const cur = docRef.current;
+      const usedNames = new Set(cur.objects.map(o => o.name));
+      const usedGroups = new Set(cur.objects.map(o => o.group).filter(Boolean));
+      const uniqName = n => {
+        let c = n, i = 2;
+        while (usedNames.has(c)) c = n + '-' + i++;
+        usedNames.add(c);
+        return c;
+      };
+      let gid = fullName, gi = 2;
+      while (usedGroups.has(gid)) gid = fullName + '-' + gi++;
+      const news = parsed.objects.map(o => {
+        let q = o;
+        if (!palette) {
+          if (q.fill && q.fill !== 'none') q = { ...q, fill: st.fill };
+          if (q.stroke && q.stroke !== 'none') {
+            q = { ...q, stroke: st.stroke, strokeWidth: st.sw > 0 ? st.sw : (q.strokeWidth || 0) };
+          }
+        }
+        q = VE.scaleObj(q, 0, 0, k);
+        if (q.stroke && q.stroke !== 'none' && (q.strokeWidth || 0) > 0) q = { ...q, strokeWidth: q.strokeWidth * k };
+        q = VE.translate(q, dx, dy);
+        return { ...q, name: uniqName(o.name), group: gid, icon: { name: fullName, license } };
+      });
+      commit({ ...cur, objects: [...cur.objects, ...news] }, null);
+      setSel({ objs: new Set(news.map(o => o.id)), nodes: new Set() });
+      say('Ikon ' + fullName + ' disisipkan');
+      /* Task 7: hanya sisipan BERHASIL yang dicatat sebagai recent —
+         nama penuh "prefix:nama" (rememberRecentIcon menolak nama
+         tanpa ":"). setPrefs adalah setter state React App yang
+         identitasnya stabil, jadi closure useCallback([]) di sini
+         yang menangkap instans pertama tetap benar. */
+      rememberRecentIcon(fullName);
+    } catch (e) {
+      say('Gagal menyisipkan ikon ' + fullName + ': ' + (e && e.message || 'kesalahan tidak diketahui'));
+    }
+  }, []);
   const [editingText, setEditingText] = useState(null);
   const [fontCatalogVer, setFontCatalogVer] = useState(0);
   // Google Fonts embed: keluarga yang sedang diunduh/dsematkan + peta job
@@ -444,6 +564,11 @@
       };
     }),
     shapeBtn = useRef(null);
+  /* Task 6 (Iconify): shapeSty dibaca handler insert (useCallback [] —
+     pola yang sama dengan blobParamsRef): ref selalu segar, callback
+     tidak pernah stale. */
+  const shapeStyRef = useRef(shapeSty);
+  shapeStyRef.current = shapeSty;
   /* Sinkronkan warna default shape/teks saat accent color di Pengaturan berubah. */
   useEffect(() => {
     const acc = prefs && prefs.accent || '#13b152';
@@ -8783,7 +8908,7 @@
                   setRenamingId(null);
                 }} /></div>;
             }
-          })()}<EditorFloatingToolbar L={L} lang={prefs && prefs.lang || 'id'} tool={tool} setOpenGrp={setOpenGrp} setTool={setTool} lastGrpTool={lastGrpTool} openGrp={openGrp} grpBtnRefs={grpBtnRefs} vcSimpRef={vcSimpRef} openVcSimplify={openVcSimplify} setShapeOpen={setShapeOpen} say={say} shapeBtn={shapeBtn} shapeOpen={shapeOpen} shapeKind={shapeKind} setShapeKind={setShapeKind} snapMenuBtn={snapMenuBtn} snapOn={snapOn} setSnapOn={setSnapOn} snapMenuOpen={snapMenuOpen} setSnapMenuOpen={setSnapMenuOpen} setSnapCfg={setSnapCfg} snapCfg={snapCfg} gridOn={gridOn} setGridOn={setGridOn} mirrorBtn={mirrorBtn} mirrorCur={mirrorCur} selNodes={selNodes} mirrorOpen={mirrorOpen} setMirrorOpen={setMirrorOpen} MIRROR_OPTS={MIRROR_OPTS} curveDragOn={curveDragOn} setCurveDragOn={setCurveDragOn} commitObjs={commitObjs} sel={sel} selHandles={selHandles} applyMirror={applyMirror} onSettings={onSettings} boolOpen={boolOpen} setBoolOpen={setBoolOpen} boolBtn={boolBtn} selObjs={selObjs} applyBoolean={applyBoolean} applyOutlineStroke={applyOutlineStroke} openOffsetStrip={openOffsetStrip} nodeScale={nodeScale} setNodeScale={updateNodeScale} delSel={delSel} applyType={applyType} applySmoothNodes={applySmoothNodes} setClosed={setClosed} applyAutoSmooth={applyAutoSmooth} applyConvertToCurves={applyConvertToCurves} applyJoinNodes={applyJoinNodes} applySplitPath={applySplitPath} applyReversePath={applyReversePath} />{(() => {
+          })()}<EditorFloatingToolbar L={L} lang={prefs && prefs.lang || 'id'} tool={tool} setOpenGrp={setOpenGrp} setTool={setToolToggle} lastGrpTool={lastGrpTool} openGrp={openGrp} grpBtnRefs={grpBtnRefs} vcSimpRef={vcSimpRef} openVcSimplify={openVcSimplify} setShapeOpen={setShapeOpen} say={say} shapeBtn={shapeBtn} shapeOpen={shapeOpen} shapeKind={shapeKind} setShapeKind={setShapeKind} snapMenuBtn={snapMenuBtn} snapOn={snapOn} setSnapOn={setSnapOn} snapMenuOpen={snapMenuOpen} setSnapMenuOpen={setSnapMenuOpen} setSnapCfg={setSnapCfg} snapCfg={snapCfg} gridOn={gridOn} setGridOn={setGridOn} mirrorBtn={mirrorBtn} mirrorCur={mirrorCur} selNodes={selNodes} mirrorOpen={mirrorOpen} setMirrorOpen={setMirrorOpen} MIRROR_OPTS={MIRROR_OPTS} curveDragOn={curveDragOn} setCurveDragOn={setCurveDragOn} commitObjs={commitObjs} sel={sel} selHandles={selHandles} applyMirror={applyMirror} onSettings={onSettings} boolOpen={boolOpen} setBoolOpen={setBoolOpen} boolBtn={boolBtn} selObjs={selObjs} applyBoolean={applyBoolean} applyOutlineStroke={applyOutlineStroke} openOffsetStrip={openOffsetStrip} nodeScale={nodeScale} setNodeScale={updateNodeScale} delSel={delSel} applyType={applyType} applySmoothNodes={applySmoothNodes} setClosed={setClosed} applyAutoSmooth={applyAutoSmooth} applyConvertToCurves={applyConvertToCurves} applyJoinNodes={applyJoinNodes} applySplitPath={applySplitPath} applyReversePath={applyReversePath} />{(() => {
             if (typeof window !== 'undefined') {
               window.__geovantaEditorApi = {
                 loadTestSvg: (svgStr, label) => {
@@ -8866,7 +8991,7 @@
               onImportFont={() => pickFiles('.ttf,.otf,font/ttf,font/otf', fs => importFontFiles(fs))}
               onConvertToPath={convertTextSelectionToPath}
             />;
-          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} /></div>{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
+          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} onIconifyClose={onIconifyClose} onIconifyInsert={onIconifyInsert} recentIcons={prefs && prefs.recentIcons || []} /></div>{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
       if (e.target === e.currentTarget) setImportModalOpen(false);
     }}><div className="hp" role="dialog" aria-label="Impor Berkas" style={{
         maxWidth: 480

--- Diff (R4 BASE -> HEAD): src/components/editor/EditorRightInspector.jsx ---
--- /tmp/iconify-base-r4/EditorRightInspector.jsx.r4	2026-11-15 03:40:51.566762070 +0000
+++ src/components/editor/EditorRightInspector.jsx	2026-11-15 03:10:08.516776269 +0000
@@ -22,6 +22,7 @@
 import { createStyle, renameStyle, deleteStyle, linkStyle, unlinkStyle, applyStyleEdit, paintSlot, directPaintEdit } from '../../engine/colorStyles.jsx';
 import { FindReplaceSection } from './FindReplaceSection.jsx';
 import { RecolorSection } from './RecolorSection.jsx';
+import { IconifyPanel } from './IconifyPanel.jsx';
 import { addEffect, removeEffect, updateEffect, toggleEffect } from '../../engine/effectsEngine.jsx';
 import { Float } from '../ui/FloatPopover.jsx';
 import { parseColorWithAlpha } from '../../utils/colorParserAndFormatter.jsx';
@@ -138,7 +139,15 @@
   weaveParams,
   onWeaveParams,
   arcParams,
-  onArcParams
+  onArcParams,
+  /* Task 5 (Iconify, R17): panel dimount di sini (Opsi A) sebagai seksi
+     .fig-isec di .fig-r-scroll — lihat render di bawah. `recentIcons`
+     dipasok Task 7 dari prefs (nama penuh "prefix:nama", maks. 12);
+     `status` TIDAK dipasok — panel memiliki status online/offline
+     sendiri (R19 jalur internal, probeOnline + listener). */
+  onIconifyClose,
+  onIconifyInsert,
+  recentIcons = []
 }) => {
   /* T13 (D-I4): SATU primer per tampilan di inspector. "Terapkan" hanya
      primer bila ada perubahan auto-layout yang belum diterapkan; bila tidak
@@ -198,7 +207,7 @@
         alignItems: 'center',
         justifyContent: 'center',
         textAlign: 'center'
-      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{(() => {
+      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{tool === 'iconify' && <IconifyPanel open onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={recentIcons} />}{(() => {
   /* Seksi "Parameter tool" (Task 2): switch per tool — Task 3 (Weave) dan
      Task 5 (Arc) menambahkan cabang mereka sendiri di sini. Tool AKTIF menang
      atas fallback seleksi (fix round 1 Task 3): bila tool adalah generator,

--- Diff (R4 BASE -> HEAD): src/constants/appI18n.jsx ---
--- /tmp/iconify-base-r4/appI18n.jsx.r4	2026-11-15 03:40:51.573762070 +0000
+++ src/constants/appI18n.jsx	2026-11-15 02:35:19.896792359 +0000
@@ -394,6 +394,21 @@
     rcOverride: 'Override',
     rcRemoveOverride: 'Hapus override',
     rcEmpty: 'Tidak ada warna yang bisa diubah',
+    icTitle: 'Ikon',
+    icSearchPlaceholder: 'Cari ikon… contoh: home',
+    icSearchHint: 'Cari dalam bahasa Inggris',
+    icCollection: 'Koleksi',
+    icAllCollections: 'Semua koleksi',
+    icRecent: 'Terakhir dipakai',
+    icLicenseOne: '{name} — Lisensi: {license}',
+    icLicenseMany: 'Lisensi ikon yang tampil: {licenses}',
+    icEmptySearch: 'Tidak ada ikon yang cocok dengan "{q}". Coba kata kunci lain dalam bahasa Inggris.',
+    icEmptyBrowse: 'Koleksi ini belum memiliki ikon.',
+    icLoading: 'Memuat ikon…',
+    icOffline: 'Perlu internet untuk mencari ikon',
+    icErrorGeneric: 'Gagal memuat ikon. Periksa koneksi internet, lalu coba lagi.',
+    icLoadMore: 'Muat lagi',
+    icResults: '{n} ikon ditemukan',
     riAlignLbl: 'Perataan',
     riPad4Sides: '4 sisi',
     riPadSym: 'Simetris',
@@ -837,6 +852,21 @@
     rcOverride: 'Override',
     rcRemoveOverride: 'Remove override',
     rcEmpty: 'No colors to change',
+    icTitle: 'Icons',
+    icSearchPlaceholder: 'Search icons… e.g. home',
+    icSearchHint: 'Search in English',
+    icCollection: 'Collection',
+    icAllCollections: 'All collections',
+    icRecent: 'Recently used',
+    icLicenseOne: '{name} — License: {license}',
+    icLicenseMany: 'Licenses of icons shown: {licenses}',
+    icEmptySearch: 'No icons match "{q}". Try another keyword in English.',
+    icEmptyBrowse: 'This collection has no icons yet.',
+    icLoading: 'Loading icons…',
+    icOffline: 'Internet is required to search icons',
+    icErrorGeneric: 'Failed to load icons. Check your internet connection, then try again.',
+    icLoadMore: 'Load more',
+    icResults: '{n} icons found',
     riAlignLbl: 'Alignment',
     riPad4Sides: '4 sides',
     riPadSym: 'Symmetric',

--- Diff (R4 BASE -> HEAD): src/constants/editorToolsAndShapes.jsx ---
--- /tmp/iconify-base-r4/editorToolsAndShapes.jsx.r4	2026-11-15 03:40:51.579762070 +0000
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

--- Diff (R4 BASE -> HEAD): src/constants/themeAndPrefsConstants.jsx ---
--- /tmp/iconify-base-r4/themeAndPrefsConstants.jsx.r4	2026-11-15 03:40:51.588762070 +0000
+++ src/constants/themeAndPrefsConstants.jsx	2026-11-15 03:10:08.530776269 +0000
@@ -12,7 +12,8 @@
   accent: '#13b152',
   m3White: true,
   lang: 'id',
-  recentColors: []
+  recentColors: [],
+  recentIcons: []
 };
 const ACCENT_PALETTE = [['#13b152', 'Geovanta'], ['#0d99ff', 'Figma Blue'], ['#6366f1', 'Indigo'], ['#8b5cf6', 'Violet'], ['#ec4899', 'Pink'], ['#f43f5e', 'Rose'], ['#f97316', 'Orange'], ['#f59e0b', 'Amber'], ['#84cc16', 'Lime'], ['#10b981', 'Emerald'], ['#14b8a6', 'Teal'], ['#06b6d4', 'Cyan'], ['#ef4444', 'Red'], ['#eab308', 'Yellow'], ['#22c55e', 'Green'], ['#0ea5e9', 'Sky'], ['#3b82f6', 'Blue'], ['#a855f7', 'Purple'], ['#d946ef', 'Fuchsia'], ['#dc2626', 'Crimson'], ['#ff6b6b', 'Coral'], ['#4f46e5', 'Royal'], ['#65a30d', 'Olive'], ['#b45309', 'Bronze'], ['#475569', 'Slate']];
 const TECH = [{

--- Diff (R4 BASE -> HEAD): src/utils/themeAndPrefsManager.jsx ---
--- /tmp/iconify-base-r4/themeAndPrefsManager.jsx.r4	2026-11-15 03:40:51.596762070 +0000
+++ src/utils/themeAndPrefsManager.jsx	2026-11-15 03:10:08.532776269 +0000
@@ -55,6 +55,13 @@
     if (Array.isArray(p.recentColors)) {
       p.recentColors = p.recentColors.filter(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 10);
     }
+    /* Task 7 (Iconify): tegakkan batas 12 nama PENUH "prefix:nama" juga
+       di jalur muat — nama pendek tanpa ":" tidak bisa di-resolve
+       insert (Task 6) dan tidak pernah ditulis rememberRecentIcon,
+       jadi entri seperti itu (seed/prefs lama) dibuang di sini. */
+    if (Array.isArray(p.recentIcons)) {
+      p.recentIcons = p.recentIcons.filter(n => typeof n === 'string' && n.includes(':')).slice(0, 12);
+    }
     if (!p.m3White) {
       p.theme = 'light';
       p.m3White = true;

--- NEW files (55 Iconify) ---
src: src/components/editor/IconifyPanel.jsx, src/renderer/iconifyClient.jsx
tests: tests/iconify-client.test.cjs, tests/iconify-panel.test.cjs
probes: probes/probe-iconify.cjs, probes/probe-iconify-offline.cjs, probes/probe-iconify-spike1.cjs, probes/probe-iconify-spike2.cjs
probes/shots: 12 Iconify/spike screenshots
docs: plan + spec + 33 files under docs/superpowers/plans/sdd-2026-11-15-iconify/ (briefs, reports, reviews, packages, ledger)
PLUS 70 R2/R3/R4 probe artifacts (22 probe .cjs + 48 screenshots) newly INCLUDED in the ZIP per R8 probes/ rule — pre-existing working-copy files, NOT new code.
DELETED: 0 files.

--- Evidence index (read these) ---
Plan: docs/superpowers/plans/2026-11-15-iconify-icons.md
Spec (highest authority): docs/superpowers/specs/2026-11-15-iconify-icons-design.md
Ledger (rulings R1-R19 + deferred minors + task status): docs/superpowers/plans/sdd-2026-11-15-iconify/progress.md
Task reports: task-1-report.md ... task-9-report.md (same folder)
Task reviews: task-2-review.md, task-4-review.md, task-5-review.md, task-6-review.md, task-7-review.md, task-8-review.md (Task 1: review Approved 0/0/8 minors, no separate review file — see ledger; Task 3: review Approved 0/0/5 minors — see ledger; Task 9: no per-task review, this whole-branch review IS its review)
Per-task review packages: task-N-review-package.md (same folder).

--- Deferred minors + parked items for triage (full text in ledger progress.md) ---
90:- Task 1 minor (deferred): probe hardcodes scale factor `4` in `scaledEq` calls while `loadIcon` computes `96 / icon.vbW` — wrong for any non-24×24 icon. Fix in Task 6 product code (compute from viewBox); no probe change needed. Final review to triage.
91:- Task 1 minor (deferred): `bboxOf` helper duplicated verbatim inside `loadIcon` and `readDocSummary` (`probe-iconify-spike1.cjs:248`, `:318`). Throwaway probe; fix only if the probe is reused.
92:- Task 1 minor (deferred): fixed `waitForTimeout(900/400/500/600)` waits instead of state conditions (`probe-iconify-spike1.cjs:245`, `:296`, `:306`, `:468`) — timing-fragile on slower machines.
93:- Task 1 minor (deferred): relay + `--ignore-certificate-errors` means TLS trust chain unproven; re-check fetching without the flag on direct internet or in Tauri (Spike 2 / Task 6).
94:- Task 1 minor (deferred): report claim "no icon in either set contains `transform=`" is unproven (probe never searches for it). Do not repeat the claim; Task 6 does not depend on it.
95:- Task 1 minor (deferred): run-log evidence missing from the review package (only the final `11/11 lolos` line quoted). Probe can be re-run by Task 8 if evidence is ever needed.
96:- Task 1 minor (deferred): "web/ was fresh" rested on weak mtime evidence. Non-blocking: the probe ran against the built `web/` and passed.
97:- Task 1 minor (deferred): `sw: null` on stroke objects — RESOLVED by Task 6 (R14): probe artifact, the probe read field `o.sw` which does not exist; the real field is `strokeWidth` (svgDocumentParser.jsx:520,601), verified as 8 after JSON round-trip AND real autosave+reload+reopen. No further action.
98:- Ruling R18 (Task 6 review adjudication): the panel license label rendering `"[object Object]"` for live collections (`IconifyPanel.jsx:259,262`, client passes the license object raw at `iconifyClient.jsx:91,125`) does NOT block Task 6 — it lives in Task 4's file, Task 6's own metadata normalizes license correctly to SPDX, and fixing it inside Task 6 would be scope creep. DEFERRED to the final-review fix wave: normalize the license to an SPDX string once in the client (searchIcons/listCollections paths) before the final ZIP, so both the panel label and insert metadata consume a string. — Cost if wrong: the shipped panel shows "[object Object]" for live collections.
99:- Ruling R19 (Task 7 status ownership): the `status` prop is currently unpassed by Task 5's mount (panel uses its default). Prefer the solution inside the brief's file list — the panel owning its online/offline status internally (probeOnline on open + listeners) if the Task 4 panel code supports it. If the panel code proves the prop must be parent-driven, wiring `status` through `VectorEditor.jsx` → `EditorRightInspector.jsx` is PRE-AUTHORIZED (backups `.bak-iconify-t7` for each touched file, same R17 precedent); record which path was taken and why. Do not stall on NEEDS_CONTEXT for this. — Cost if wrong: status lives in the panel instead of the parent (or vice versa); behavior identical either way, only the owner differs.
101:- Task 2 minor (deferred): A4 check omits `searchStillOk` (only logged in `actual`) — a PASS could occur with `searchStillOk=false`, weakening the report's independence claim. Throwaway probe; final review to triage.
102:- Task 2 minor (deferred): report §7 probe size figure stale (15,324 vs 16,217 bytes on disk). Doc nit; correct or drop.
103:- Task 2 minor (deferred): fixed `waitForTimeout(600/900)` sleeps before reading object counts after insert attempts — prefer `waitForFunction` on the count.
104:- Task 2 minor (deferred): simulated-insert SVG hardcodes `viewBox="0 0 24 24"` instead of `j.width`/`j.height` from `icons.json` — correct for `mdi:home`, not generic.
105:- Task 2 minor (deferred): baseline object count printed but never asserted `=== 0`.
106:- Task 2 minor (deferred): fix report cites A4b evaluate as `:301-307`; in HEAD it spans `:297-310`. Citation imprecision only.
107:- Task 2 minor (deferred): RED check for the string pin described in prose only, no command/output pasted (unlike the two full probe runs).
108:- Task 3 minor (deferred): file header documents "never request limit < 32" but `searchIcons` passes any caller-supplied `limit` straight through with no clamp/validation. Fix: clamp `Math.max(32, limit)` or downgrade the comment. Final review to triage.
109:- Task 3 minor (deferred): corrupt `icons.json` surfaces a raw `SyntaxError` from `JSON.parse`, breaking the per-call-message convention. Fix: wrap parse in try/catch with a per-call message.
110:- Task 3 minor (deferred): `listCollections` failure-eviction branch untested (symmetric `loadSet` retry is tested). Fix: mirror test.
111:- Task 3 minor (deferred): several defensive branches untested (empty query, invalid/empty prefix, pre-aborted external signal, `setData.palette` check, string-icon / `icon.body` fallback in `isPaletteIcon`); `setData.palette` branch is dead for real data since `loadSet`'s return shape has no `palette` key. Fix: add tests for reachable branches or trim the dead check.
114:- Task 4 minor (deferred): `icResults` shows page count (≤48) while `searchTotal` is only used for the load-more condition — "48 ikon ditemukan" when the API found far more. Fix: show the total or reword the key. Final review to triage.
115:- Task 4 minor (deferred): `visibleBrowse` never reset when `browsePrefix` changes — switching collections after "Muat lagi" shows the new collection pre-expanded past 48. Fix: reset to PAGE_SIZE in the browse effect.
116:- Task 4 minor (deferred): partial set failure is silent — renderable subset shown with no indication icons are missing; `setsError` only displays when zero icons renderable. Fix: muted note when renderable < total and `setsError` set.
117:- Task 4 minor (deferred): `status="offline"` only switches the rendered branch; `listCollections`/`loadSet`/`searchIcons` effects still fire network requests while offline. Task 7 must gate these effects on `status` or explicitly accept the traffic.
118:- Task 4 minor (deferred): recent chips call `onInsert({name})` with no prefix/license — reuse depends entirely on Task 6 resolving a bare name to a set. Task 6/7: confirm prefs store full `prefix:name` values.
119:- Task 4 minor (deferred): "recent row has no `<img>`" test assertion is vacuous in SSR (browse grid never renders under `renderToStaticMarkup`). Move to the Task 8 probe or drop it.
120:- Task 4 minor (deferred): Esc effect depends only on `[open]` — `onClose` is the closure from the first render; if Task 5 passes an inline `onClose`, Esc may invoke a stale one. Fix: include `onClose` in deps or hold it in a ref.
122:- Task 5 minor (deferred): `probes/probe-iconify.cjs` has no assertion that Recolor/FindReplace stay open stacked alongside Iconify (behavior recorded in the report, not probe-verified). Candidate for the Task 8 probe or drop. Final review to triage.
123:- Task 5 minor (deferred): stub `onInsert` recording to `window.__iconifyInsertCalls` (`VectorEditor.jsx:188`) has no probe coverage — Task 6 placeholder, exercised/replaced by Task 6. No action unless Task 6 keeps a recording hook.
124:- Task 6 minor (deferred): `VectorEditor.jsx:207` — failure branch (toast + zero objects) verified structurally only; no runtime probe can trigger it via UI. Final review to triage.
128:- Task 8 minor (deferred): `probes/probe-iconify.cjs:289` (T8-2b) — label claims "(browse mode has none)" but the check only asserts `ic-count` visible in search mode; absence in browse mode is never asserted. Fix: assert count-absence before typing, or drop the parenthetical. Final review to triage.
