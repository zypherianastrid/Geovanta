# Review package — Task 4: Cascade sisipan berurutan

## Files changed
- src/components/editor/VectorEditor.jsx (vs .bak-modal-t4)
- probes/probe-iconify-modal.cjs (vs task-4-probe-base.cjs = isi Task 3, direkonstruksi dari task-3-review-package.md)

--- VectorEditor.jsx: 2 removed / 27 added
--- probe-iconify-modal.cjs: 0 removed / 163 added

## Full diff (base -> working copy, -U10)
=== src/components/editor/VectorEditor.jsx ===
--- /home/hatch/workspace/geovanta-round2/src/components/editor/VectorEditor.jsx.bak-modal-t4	2026-11-15 05:33:57.829284343 +0000
+++ /home/hatch/workspace/geovanta-round2/src/components/editor/VectorEditor.jsx	2026-11-15 05:35:15.340066260 +0000
@@ -195,20 +195,34 @@
      Ikon saat tool sudah 'iconify' kembali ke 'select'; semua tool lain
      pass-through. Hanya prop yang diteruskan ke EditorFloatingToolbar yang
      memakai wrapper ini; pemakaian setTool internal tidak berubah. */
   const setToolToggle = React.useCallback(k => {
     setTool(prev => (k === 'iconify' && prev === 'iconify' ? 'select' : k));
   }, []);
   /* Task 5 (Iconify): onClose stabil — setTool adalah setter state React
      yang identitasnya stabil, jadi callback tidak pernah stale meskipun
      effect Esc panel hanya berdependensi [open]. */
   const onIconifyClose = React.useCallback(() => setTool('select'), []);
+  /* Task 4 (Iconify modal): penghitung cascade sisipan berurutan —
+     sisipan ke-n dari satu sesi modal bergeser +24*(n % 10) px ke
+     kanan-bawah dalam koordinat dokumen (diterapkan di onIconifyInsert
+     sebelum VE.translate). Hanya sisipan BERHASIL yang memajukan
+     penghitung (increment sesudah commit; catch tidak menyentuh ref).
+     Reset: modal tertutup ⟺ tool bukan 'iconify' (modal mount dengan
+     open={tool === 'iconify'}), jadi saat tool berubah dari 'iconify'
+     ke bukan-'iconify', penghitung kembali ke 0. */
+  const iconifyCascadeRef = useRef(0);
+  const iconifyPrevToolRef = useRef(tool);
+  useEffect(() => {
+    if (iconifyPrevToolRef.current === 'iconify' && tool !== 'iconify') iconifyCascadeRef.current = 0;
+    iconifyPrevToolRef.current = tool;
+  }, [tool]);
   /* Task 6 (Iconify): alur sisip — loadSet -> buildIconSvg -> aturan warna
      (isPaletteIcon) -> VE.parseSVG -> skala ke frame 96 px di tengah
      viewport, satu grup bernama, metadata icon, satu entri riwayat,
      langsung terseleksi. Gagal -> toast, nol objek dibuat (commit hanya
      terjadi sesudah parse + transform berhasil).
      Aturan warna (spec §7.5): ikon palette mempertahankan warna aslinya;
      ikon monokrom memakai gaya AKTIF (shapeSty — gaya yang sama dipakai
      makeShape untuk shape baru): path ber-fill memakai Fill aktif, path
      ber-stroke memakai warna + ketebalan Stroke aktif. Ketebalan aktif
      diterapkan dalam ruang ikon, lalu skala frame mengalikannya (skala
@@ -235,22 +249,28 @@
     try {
       const setData = await loadSet(prefix);
       const palette = isPaletteIcon(icon, setData);
       const st = shapeStyRef.current || { fill: '#18181b', stroke: '#18181b', sw: 2 };
       const parsed = VE.parseSVG(buildIconSvg(fullName, setData));
       if (parsed.error || !parsed.objects.length) throw new Error('Ikon tidak bisa diurai');
       const vb = parsed.viewBox || [0, 0, 24, 24];
       const k = 96 / (vb[2] || 24);
       const r = boxRef.current.getBoundingClientRect();
       const ctr = toDoc(r.left + r.width / 2, r.top + r.height / 2);
-      const dx = ctr.x - (vb[0] + vb[2] / 2) * k;
-      const dy = ctr.y - (vb[1] + vb[3] / 2) * k;
+      const dx0 = ctr.x - (vb[0] + vb[2] / 2) * k;
+      const dy0 = ctr.y - (vb[1] + vb[3] / 2) * k;
+      /* Task 4 (Iconify modal): cascade — offset dalam koordinat
+         DOKUMEN, ditambah SEBELUM VE.translate di bawah (bukan piksel
+         layar, jadi tidak tergantung zoom — Review Focus #1). */
+      const cascadeOff = (iconifyCascadeRef.current % 10) * 24;
+      const dx = dx0 + cascadeOff;
+      const dy = dy0 + cascadeOff;
       let license = (icon && typeof icon === 'object') ? icon.license : null;
       if (license == null) {
         try {
           const cols = await listCollections();
           license = (cols.find(c => c.prefix === prefix) || {}).license ?? null;
         } catch (e) { license = null; }
       }
       license = typeof license === 'string' ? license : (license && (license.spdx || license.title)) || null;
       const cur = docRef.current;
       const usedNames = new Set(cur.objects.map(o => o.name));
@@ -270,20 +290,25 @@
           if (q.stroke && q.stroke !== 'none') {
             q = { ...q, stroke: st.stroke, strokeWidth: st.sw > 0 ? st.sw : (q.strokeWidth || 0) };
           }
         }
         q = VE.scaleObj(q, 0, 0, k);
         if (q.stroke && q.stroke !== 'none' && (q.strokeWidth || 0) > 0) q = { ...q, strokeWidth: q.strokeWidth * k };
         q = VE.translate(q, dx, dy);
         return { ...q, name: uniqName(o.name), group: gid, icon: { name: fullName, license } };
       });
       commit({ ...cur, objects: [...cur.objects, ...news] }, null);
+      /* Task 4: hanya sisipan BERHASIL yang memajukan penghitung
+         cascade — baris ini hanya tercapai bila commit di atas tidak
+         melempar; throw di atas (loadSet / parse / transform) langsung
+         ke catch tanpa menyentuh ref (Review Focus #5). */
+      iconifyCascadeRef.current += 1;
       setSel({ objs: new Set(news.map(o => o.id)), nodes: new Set() });
       say('Ikon ' + fullName + ' disisipkan');
       /* Task 7: hanya sisipan BERHASIL yang dicatat sebagai recent —
          nama penuh "prefix:nama" (rememberRecentIcon menolak nama
          tanpa ":"). setPrefs adalah setter state React App yang
          identitasnya stabil, jadi closure useCallback([]) di sini
          yang menangkap instans pertama tetap benar. */
       rememberRecentIcon(fullName);
     } catch (e) {
       say('Gagal menyisipkan ikon ' + fullName + ': ' + (e && e.message || 'kesalahan tidak diketahui'));

=== probes/probe-iconify-modal.cjs ===
--- task-4-probe-base.cjs	2026-11-15 05:37:11.040145418 +0000
+++ /home/hatch/workspace/geovanta-round2/probes/probe-iconify-modal.cjs	2026-11-15 05:34:30.647066604 +0000
@@ -141,20 +141,102 @@
     };
     const openModal = async () => {
       await toolBtn.click();
       try { await modal.waitFor({ state: 'visible', timeout: 10000 }); return true; }
       catch (e) { return false; }
     };
     // Titik backdrop: di luar dialog (maxWidth 960, terpusat -> tepi kiri
     // ~240 px pada viewport 1440), di tengah vertikal.
     const clickBackdrop = async () => { await page.mouse.click(60, 450); };
 
+    // ---- Helpers cascade (Task 4; pola probes/probe-iconify.cjs) ----
+    // bbox diukur dari model dokumen (koordinat dokumen, bukan piksel
+    // layar) — jadi M8 membuktikan pergeseran 24 DOC unit per langkah.
+    const NATIVE_BBOX_MDI_HOME = [2, 3, 22, 20];
+    const docSnap = () => page.evaluate(() => {
+      const d = window.__geovantaEditorApi.getDoc();
+      const bboxOf = (o) => {
+        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
+        const take = (x, y) => {
+          if (Number.isFinite(x) && Number.isFinite(y)) {
+            if (x < x0) x0 = x; if (y < y0) y0 = y;
+            if (x > x1) x1 = x; if (y > y1) y1 = y; n++;
+          }
+        };
+        for (const sp of (o.subs || [])) for (const nd of (sp.nodes || [])) {
+          take(nd.x, nd.y);
+          if (nd.in) take(nd.in.x, nd.in.y);
+          if (nd.out) take(nd.out.x, nd.out.y);
+        }
+        return n ? { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 } : null;
+      };
+      const objects = (d.objects || []).map(o => ({
+        id: o.id, name: o.name, group: o.group ?? null, bbox: bboxOf(o),
+      }));
+      return { viewBox: d.viewBox, objectCount: objects.length, objects };
+    });
+    const unionOf = (objs) => {
+      let u = null;
+      for (const o of objs) {
+        if (!o.bbox) continue;
+        u = u ? { x0: Math.min(u.x0, o.bbox.x0), y0: Math.min(u.y0, o.bbox.y0), x1: Math.max(u.x1, o.bbox.x1), y1: Math.max(u.y1, o.bbox.y1) }
+          : { x0: o.bbox.x0, y0: o.bbox.y0, x1: o.bbox.x1, y1: o.bbox.y1 };
+      }
+      if (u) { u.w = u.x1 - u.x0; u.h = u.y1 - u.y0; }
+      return u;
+    };
+    const waitForCount = async (n, timeout = 60000) => {
+      await page.waitForFunction(
+        (want) => window.__geovantaEditorApi && window.__geovantaEditorApi.getDoc().objects.length === want,
+        n, { timeout },
+      );
+    };
+    const searchBox = page.locator('[data-testid="ic-search"] [data-custom-input]');
+    const searchFor = async (q) => {
+      await searchBox.click();
+      await page.keyboard.press('ControlOrMeta+a');
+      await page.keyboard.type(q, { delay: 25 });
+    };
+    const clearSearch = async () => {
+      await searchBox.click();
+      await page.keyboard.press('ControlOrMeta+a');
+      await page.keyboard.press('Backspace');
+    };
+    const iconButton = (fullName) => page.locator(`[data-testid="ic-icon-${fullName}"]`);
+    const toastHas = async (text, timeout = 5000) => {
+      try {
+        await page.waitForFunction(
+          (t) => { const el = document.querySelector('.ved-toast'); return el && el.textContent.includes(t); },
+          text, { timeout },
+        );
+        return true;
+      } catch (e) { return false; }
+    };
+    // bbox1 absolut yang diharapkan: frame 96 px di tengah viewport
+    // (= tengah viewBox sesudah fitView); dipakai sebagai info saja —
+    // kriteria lolos M6–M9 adalah DELTA antar-bbox (±2 px).
+    const expectedBboxMdiHome = (vb) => {
+      const n = NATIVE_BBOX_MDI_HOME, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
+      return { x0: cx + (n[0] * 4 - 48), y0: cy + (n[1] * 4 - 48), x1: cx + (n[2] * 4 - 48), y1: cy + (n[3] * 4 - 48) };
+    };
+    const shiftClose = (a, b, dx, dy, tol = 2) => !!a && !!b
+      && Math.abs((a.x0 - b.x0) - dx) <= tol && Math.abs((a.y0 - b.y0) - dy) <= tol
+      && Math.abs((a.x1 - b.x1) - dx) <= tol && Math.abs((a.y1 - b.y1) - dy) <= tol;
+    const insertMdiHome = async () => {
+      const before = (await docSnap()).objectCount;
+      await iconButton('mdi:home').first().click();
+      await waitForCount(before + 1);
+      await page.waitForTimeout(300);
+      const snap = await docSnap();
+      return unionOf(snap.objects.slice(before));
+    };
+
     // ---- M1: modal terbuka dari tombol floating bar ----
     const m1 = await openModal();
     check('M1', 'modal terbuka dari tombol floating bar (ic-modal visible, ic-panel di dalamnya)',
       m1 && await modalVisible() && (await panelInModal.count()) > 0 && await panelInModal.first().isVisible(),
       `opened=${m1} modalVisible=${await modalVisible()} panelInModal=${await panelInModal.count()}`,
       'opened=true modalVisible=true panelInModal>=1');
     await shot('iconify-modal-open.png');
     if (!m1) {
       // Tanpa modal, M2–M5 tidak bisa jalan — catat sebagai FAIL, bukan skip diam-diam.
       for (const [id, label] of [
@@ -204,20 +286,101 @@
 
       // ---- RF4: tidak ada fetch Iconify baru sesudah modal tertutup penuh ----
       const n0 = iconifyReqs.length;
       await page.waitForTimeout(2500);
       const n1 = iconifyReqs.length;
       info('fetch Iconify total saat tutup', String(n0));
       info('fetch Iconify baru selama 2,5 dtk sesudah tutup', String(n1 - n0));
       check('RF4', 'tidak ada fetch Iconify baru sesudah modal tertutup (Review Focus #4)',
         n1 === n0, `before=${n0} after=${n1} new=${n1 - n0}`, 'new=0');
 
+      // ---- M6: sisip ikon yang sama 3x dari modal yang sama -> cascade ----
+      await openModal();
+      await searchFor('home');
+      await iconButton('mdi:home').first().waitFor({ state: 'visible', timeout: 60000 });
+      const cascadeBboxes = [await insertMdiHome(), await insertMdiHome(), await insertMdiHome()];
+      const snapM6 = await docSnap();
+      info('M6 bbox1 absolut', JSON.stringify(cascadeBboxes[0]));
+      info('M6 bbox1 yang diharapkan (tengah viewBox)', JSON.stringify(expectedBboxMdiHome(snapM6.viewBox)));
+      info('M6 bbox2', JSON.stringify(cascadeBboxes[1]));
+      info('M6 bbox3', JSON.stringify(cascadeBboxes[2]));
+      check('M6', 'sisip 3x ikon sama -> bbox ke-2 (+24,+24), ke-3 (+48,+48) dari bbox pertama (dok unit, tol ±2)',
+        shiftClose(cascadeBboxes[1], cascadeBboxes[0], 24, 24) && shiftClose(cascadeBboxes[2], cascadeBboxes[0], 48, 48),
+        `b1=${JSON.stringify(cascadeBboxes[0])} b2=${JSON.stringify(cascadeBboxes[1])} b3=${JSON.stringify(cascadeBboxes[2])}`,
+        'b2=b1+(24,24) b3=b1+(48,48)');
+
+      // ---- M7: tutup modal lalu buka lagi -> offset reset ke tengah ----
+      await page.locator('[data-testid="ic-close"]').click();
+      const m7closed = await modalGone();
+      await openModal();
+      await searchFor('home');
+      await iconButton('mdi:home').first().waitFor({ state: 'visible', timeout: 60000 });
+      const bboxM7 = await insertMdiHome();
+      check('M7', 'tutup + buka lagi modal -> sisipan kembali ke tengah (offset reset, bbox = bbox1)',
+        m7closed && shiftClose(bboxM7, cascadeBboxes[0], 0, 0),
+        `closed=${m7closed} bboxM7=${JSON.stringify(bboxM7)} baseline=${JSON.stringify(cascadeBboxes[0])}`,
+        'closed=true bboxM7=bbox1');
+
+      // ---- M8: zoom 200% -> pergeseran tetap 24 doc unit per langkah ----
+      await page.evaluate(() => window.__geovantaEditorApi.setZ(2));
+      const zoom2 = await page.evaluate(() => window.__geovantaEditorApi.getZoom());
+      const bboxM8a = await insertMdiHome();
+      const bboxM8b = await insertMdiHome();
+      check('M8', 'zoom 200% -> dua sisipan berurutan bergeser (+24,+24) doc unit (Review Focus #1)',
+        zoom2 === 2 && shiftClose(bboxM8b, bboxM8a, 24, 24),
+        `zoom=${zoom2} b8a=${JSON.stringify(bboxM8a)} b8b=${JSON.stringify(bboxM8b)}`,
+        'zoom=2 b8b=b8a+(24,24)');
+      await page.evaluate(() => window.__geovantaEditorApi.setZ(1));
+      const zoomBack = await page.evaluate(() => window.__geovantaEditorApi.getZoom());
+      info('zoom kembali ke 100%', String(zoomBack));
+
+      // ---- M9: sisipan gagal tidak memajukan penghitung ----
+      // loadSet di-memoize per set per sesi (iconifyClient.jsx): set yang
+      // sudah dimuat tidak bisa digagalkan lagi. Karena itu pakai prefix
+      // segar 'ph' yang belum pernah dimuat sesi ini, dan sabotase
+      // icons.json-nya LEWAT page.route SEBELUM panel memuatnya: set
+      // berisi satu ikon 'house' dengan body <g></g> — thumbnail
+      // ter-render (body non-kosong -> svgDataUri lolos) tapi
+      // VE.parseSVG menghasilkan 0 objek -> onIconifyInsert melempar
+      // -> toast gagal, nol objek, penghitung tidak maju. Sisipan
+      // berhasil berikutnya (recent mdi:home, counter masih 3) harus
+      // bergeser +72 (= 3x24) dari baseline, bukan +96 (= 4x24).
+      await page.route('**/cdn.jsdelivr.net/npm/@iconify-json/ph/icons.json',
+        route => route.fulfill({ status: 200, contentType: 'application/json',
+          body: JSON.stringify({ prefix: 'ph', width: 24, height: 24, icons: { house: { body: '<g></g>' } } }) }));
+      await clearSearch();
+      await page.waitForTimeout(500);
+      await page.locator('[data-testid="ic-collection"] button').first().click();
+      await page.waitForSelector('.flt', { state: 'visible', timeout: 10000 });
+      await page.locator('.flt input').first().fill('Phosphor');
+      await page.waitForTimeout(400);
+      await page.locator('.flt [role="option"]').first().click();
+      await iconButton('ph:house').first().waitFor({ state: 'visible', timeout: 60000 });
+      const countBeforeFail = (await docSnap()).objectCount;
+      await iconButton('ph:house').first().click();
+      const failToast = await toastHas('Gagal menyisipkan ikon ph:house');
+      await page.waitForTimeout(1000);
+      const countAfterFail = (await docSnap()).objectCount;
+      await page.locator('[data-testid="ic-recent-mdi:home"]').first().waitFor({ state: 'visible', timeout: 10000 });
+      const before9 = (await docSnap()).objectCount;
+      await page.locator('[data-testid="ic-recent-mdi:home"]').first().click();
+      await waitForCount(before9 + 1);
+      await page.waitForTimeout(300);
+      const snapM9 = await docSnap();
+      const bboxM9 = unionOf(snapM9.objects.slice(before9));
+      await page.unroute('**/cdn.jsdelivr.net/npm/@iconify-json/ph/icons.json');
+      check('M9', 'sisipan gagal tidak memajukan penghitung — sukses berikutnya +72 (counter 3), bukan +96 (Review Focus #5)',
+        failToast && countAfterFail === countBeforeFail && zoomBack === 1 && shiftClose(bboxM9, cascadeBboxes[0], 72, 72),
+        `failToast=${failToast} countBefore=${countBeforeFail} countAfter=${countAfterFail} zoomBack=${zoomBack} bboxM9=${JSON.stringify(bboxM9)} baseline=${JSON.stringify(cascadeBboxes[0])}`,
+        'failToast=true countAfter=countBefore zoomBack=1 bboxM9=baseline+(72,72)');
+      await shot('iconify-modal-cascade.png');
+
       check('PERR', '0 pageerror selama probe modal', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');
     }
   } catch (e) {
     console.log('PROBE ERROR: ' + (e && e.stack || e));
     process.exitCode = 1;
   } finally {
     if (browser) await browser.close();
     if (relay) await new Promise(r => relay.close(r));
   }
   const failed = results.filter(r => !r.pass);
