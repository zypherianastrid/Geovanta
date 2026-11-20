=== TASK 6 REVIEW PACKAGE ===

--- New files ---
docs/superpowers/plans/sdd-2026-11-15-iconify/task-6-report.md
probes/shots/iconify-t6-mdi.png
probes/shots/iconify-t6-multi.png
probes/shots/iconify-t6-after-reload.png

--- Modified files ---
src/components/editor/VectorEditor.jsx (backup .bak-iconify-t6, 359,380 B)
probes/probe-iconify.cjs (36,364 B; extended with T6-0..T6-8, P0-P7 unchanged in content)
tests/iconify-client.test.cjs UNCHANGED per R3

--- Backup ---
-rw-rw---- 1 root root 359380 Nov 15 02:57 src/components/editor/VectorEditor.jsx.bak-iconify-t6

--- Diff: VectorEditor.jsx ---
--- src/components/editor/VectorEditor.jsx.bak-iconify-t6	2026-11-15 02:57:04.349220087 +0000
+++ src/components/editor/VectorEditor.jsx	2026-11-15 02:57:12.698782246 +0000
@@ -58,6 +58,7 @@
 import { normalizeTextDocument, normalizeTextObject, isLegacyText, legacyTextSpec, textAutoName } from '../../engine/legacyText.jsx';
 import { inspectFontBytes } from '../../renderer/textFontRegistry.jsx';
 import { GOOGLE_FONTS, embedGoogleFont } from '../../renderer/googleFonts.jsx';
+import { loadSet, buildIconSvg, isPaletteIcon, listCollections } from '../../renderer/iconifyClient.jsx';
 import { pickFiles } from '../../utils/presenceAndFilePicker.jsx';
 import { TextEditOverlay } from './TextEditOverlay.jsx';
 import { TextInspector } from './TextInspector.jsx';
@@ -183,14 +184,90 @@
      yang identitasnya stabil, jadi callback tidak pernah stale meskipun
      effect Esc panel hanya berdependensi [open]. */
   const onIconifyClose = React.useCallback(() => setTool('select'), []);
-  /* Task 5 (Iconify): stub onInsert — Task 6 menggantinya dengan logika
-     sisip. Untuk sekarang hanya mencatat pemanggilan (probe/diagnostik),
-     tanpa logika sisip apa pun. */
-  const onIconifyInsert = React.useCallback(icon => {
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
     if (typeof window !== 'undefined') {
       window.__iconifyInsertCalls = window.__iconifyInsertCalls || [];
       window.__iconifyInsertCalls.push(icon);
     }
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
+    } catch (e) {
+      say('Gagal menyisipkan ikon ' + fullName + ': ' + (e && e.message || 'kesalahan tidak diketahui'));
+    }
   }, []);
   const [editingText, setEditingText] = useState(null);
   const [fontCatalogVer, setFontCatalogVer] = useState(0);
@@ -464,6 +541,11 @@
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

--- Summary (per report) ---
VectorEditor.jsx: +1 import (loadSet, buildIconSvg, isPaletteIcon, listCollections), +5 shapeStyRef, +~55 onIconifyInsert
Probe: 43/43 green in 2 identical runs; npm test 299/299; build exit 0 (per report).
Known deviations/limits in report: R6 literal red/blue values unreachable via UI (probe uses accent-derived #000073 vs #0000ff); failure->toast branch structural-only; panel license label renders [object Object] for live collections (Task 4 file, NOT fixed).
