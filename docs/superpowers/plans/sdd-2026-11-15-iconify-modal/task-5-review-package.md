# Task 5 review package

Plan: docs/superpowers/plans/2026-11-15-iconify-modal.md (Task 5 — probe end-to-end modal + regresi probe lama + fix wave F1/F2)
Brief: task-5-brief.md + Ruling R3 (M14–M16) + Ruling R4 (fix wave F1/F2)
Implementer report: task-5-report.md (DONE_WITH_CONCERNS: modal 17/19, M11b+M12 FAIL = F1/F2)
Fix report: task-5-fix-report.md (DONE: modal 19/19 sesudah fix)

## File berubah

- probes/probe-iconify-modal.cjs — diff vs probes/probe-iconify-modal.cjs.bak-modal-t5 (base = isi Task 3/4)
- probes/probe-iconify.cjs — diff vs probes/probe-iconify.cjs.bak-modal-t5
- src/components/editor/IconifyPanel.jsx — diff vs src/components/editor/IconifyPanel.jsx.bak-modal-t5fix (fix wave, 2 baris)
- tests/iconify-panel.test.cjs — diff vs tests/iconify-panel.test.cjs.bak-modal-t5fix (guard sumber F1/F2)

## Diff 1 — probe-iconify-modal.cjs vs .bak-modal-t5
```diff
--- ../../../../probes/probe-iconify-modal.cjs.bak-modal-t5	2026-11-15 05:39:37.797126741 +0000
+++ ../../../../probes/probe-iconify-modal.cjs	2026-11-15 05:44:52.701061812 +0000
@@ -1,23 +1,53 @@
 'use strict';
-// Probe buka/tutup modal Iconify — Task 3 plan "Iconify Pindah ke Modal
-// Popup" (subset M1–M5; Task 5 melengkapi suite + regresi probe lama).
+// Probe buka/tutup modal Iconify — Task 3–5 plan "Iconify Pindah ke Modal
+// Popup" (M1–M16 lengkap; Task 5 melengkapi M10–M16 + regresi probe lama).
 //   M1 modal terbuka dari tombol floating bar ([data-testid="ic-modal"]
 //      visible, [data-testid="ic-panel"] di dalamnya)
+//   M15 (Ruling R3b, Task 5) panel ABSEN dari sidebar (.fig-right-sidebar)
+//      dan tidak ada ic-panel di luar ic-modal saat modal terbuka
 //   M2 tombol X menutup
+//   M16 (Ruling R3c, Task 5) ic-panel hilang SEGERA saat tutup (<200 ms,
+//      sebelum animasi keluar .hp selesai — panel return null seketika,
+//      shell-nya yang fade 200 ms; observasi Task 3 minor M1, bukan bug)
 //   M3 Esc menutup
 //   M4 klik backdrop menutup
 //   M5 klik backdrop saat dropdown .flt terbuka -> modal TETAP terbuka
 //      (guard Q4, sama seperti handler Esc panel); dropdown sendiri
 //      tertutup oleh outside-click, dan klik backdrop kedua menutup modal
+//      CATATAN (reviewer Task 3): M5 lolos sebagian karena race timing
+//      same-dispatch — handler outside-click dropdown jalan sebelum
+//      handler backdrop, tapi React belum re-render sehingga .flt masih
+//      ditemukan guard. M5 BUKAN bukti guard bebas-race; jangan jadikan
+//      pegangan lebih dari itu. Guard Q4 sendiri tidak diubah (bentuk
+//      yang diresepkan design).
 //   RF4 (Review Focus #4): sesudah modal tertutup penuh, tidak ada fetch
 //      Iconify baru (api.iconify.design / cdn.jsdelivr.net) selama 2,5 dtk
+//   M6 sisip 3x ikon sama -> cascade +24/+48
+//   M7 tutup + buka lagi -> offset reset ke tengah
+//   M8 zoom 200% -> pergeseran tetap 24 doc unit per langkah
+//   M9 sisipan gagal tidak memajukan penghitung (+72, bukan +96)
+//   M10 (Task 5) tombol V (Select) saat modal terbuka TIDAK menutup modal
+//      dan TIDAK mengganti tool (guard .ov — tekan V, tunggu 500 ms,
+//      ic-modal masih visible, aria-pressed tombol Ikon masih true)
+//   M11 (Task 5) kategori memfilter dropdown koleksi (opsi koleksi hanya
+//      dalam kategori itu) dan grid telusur (ikon pertama dari koleksi
+//      dalam kategori itu); kategori runtime = kategori milik 'mdi'
+//      dari /collections hidup
+//   M11b (Task 5; Task 2 deferred (c)) thumbnail grid ter-render visual
+//      40 px: <img> pertama naturalWidth > 0 DAN lebar tampil 40 px
+//   M12 (Task 5) cari "home" dgn kategori aktif -> semua hasil dari
+//      koleksi dalam kategori itu, dan ic-count = jumlah ikon terfilter
+//      yang tampil (bukan total API)
+//   M13 0 pageerror selama seluruh probe modal (check PERR di akhir)
+//   M14 (Ruling R3a, Task 5) wrap % 10: 11 sisipan satu sesi modal baru
+//      -> sisipan ke-11 di offset +0 (sama dgn sisipan ke-1)
 //   PERR: 0 pageerror
 //
 // Panel open memicu fetch jaringan — probe memakai relay CONNECT loopback
 // + --ignore-certificate-errors yang sama seperti probes/probe-iconify.cjs
 // (VM egress proxy 403s CONNECT langsung Chromium).
 //
 // Usage: cd web && python3 -m http.server 9041
 //   lalu: PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
 //   screenshots -> probes/shots/iconify-modal-*.png
 //   exit 0 bila semua skenario lolos, 1 bila ada yang gagal.
@@ -229,33 +259,70 @@
       const snap = await docSnap();
       return unionOf(snap.objects.slice(before));
     };
 
     // ---- M1: modal terbuka dari tombol floating bar ----
     const m1 = await openModal();
     check('M1', 'modal terbuka dari tombol floating bar (ic-modal visible, ic-panel di dalamnya)',
       m1 && await modalVisible() && (await panelInModal.count()) > 0 && await panelInModal.first().isVisible(),
       `opened=${m1} modalVisible=${await modalVisible()} panelInModal=${await panelInModal.count()}`,
       'opened=true modalVisible=true panelInModal>=1');
+    // ---- M15 (Ruling R3b): panel ABSEN dari sidebar; tidak ada ic-panel di luar ic-modal ----
+    // M1 saja akan lolos sekalipun mount inspector lama tertinggal (reviewer
+    // Task 3) — M15 menutup celah itu: hitung panel di seluruh dokumen.
+    const m15 = await page.evaluate(() => {
+      const all = document.querySelectorAll('[data-testid="ic-panel"]').length;
+      const inModal = document.querySelectorAll('[data-testid="ic-modal"] [data-testid="ic-panel"]').length;
+      const inSidebar = document.querySelectorAll('.fig-right-sidebar [data-testid="ic-panel"]').length;
+      return { all, inModal, inSidebar, outsideModal: all - inModal };
+    });
+    check('M15', 'panel ABSEN dari sidebar + tidak ada ic-panel di luar ic-modal saat modal terbuka (Ruling R3b)',
+      m15.all >= 1 && m15.inModal === m15.all && m15.inSidebar === 0 && m15.outsideModal === 0,
+      `panels=${m15.all} inModal=${m15.inModal} inSidebar=${m15.inSidebar} outsideModal=${m15.outsideModal}`,
+      'panels>=1 inModal=panels inSidebar=0 outsideModal=0');
     await shot('iconify-modal-open.png');
     if (!m1) {
       // Tanpa modal, M2–M5 tidak bisa jalan — catat sebagai FAIL, bukan skip diam-diam.
       for (const [id, label] of [
         ['M2', 'tombol X menutup'],
+        ['M16', 'saat tutup, ic-panel hilang SEGERA (<200 ms)'],
         ['M3', 'Esc menutup'],
         ['M4', 'klik backdrop menutup'],
         ['M5', 'klik backdrop saat .flt terbuka -> modal TETAP terbuka'],
+        ['M10', 'tombol V saat modal terbuka TIDAK menutup modal'],
+        ['M11', 'kategori memfilter dropdown koleksi + grid telusur'],
+        ['M11b', 'thumbnail grid ter-render visual 40 px'],
+        ['M12', 'cari "home" dgn kategori aktif -> hasil terfilter + ic-count'],
+        ['M14', 'sisip 11x satu sesi modal -> sisipan ke-11 di offset +0'],
       ]) check(id, label, false, 'skipped: M1 gagal, modal tidak pernah terbuka', 'modal terbuka dulu');
       check('PERR', '0 pageerror', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');
     } else {
       // ---- M2: tombol X menutup ----
+      // ---- M16 (Ruling R3c): panel harus hilang SEGERA saat tutup ----
+      // IconifyPanel menerima open=false dan return null seketika,
+      // sementara shell .hp baru fade-out 200 ms (usePresence). RF4
+      // (tidak ada fetch baru sesudah tutup) hanya proksi lemah untuk
+      // ini — M16 mengukur langsung: dari klik sampai panel count 0
+      // harus < 200 ms (batas animasi keluar).
+      const m16t0 = Date.now();
       await page.locator('[data-testid="ic-close"]').click();
+      let m16ms = null;
+      try {
+        await page.waitForFunction(
+          () => document.querySelectorAll('[data-testid="ic-panel"]').length === 0,
+          null, { timeout: 190 });
+        m16ms = Date.now() - m16t0;
+      } catch (e) { m16ms = null; }
+      const m16panel = await page.locator('[data-testid="ic-panel"]').count();
+      check('M16', 'saat tutup, ic-panel hilang SEGERA (<200 ms, sebelum animasi keluar selesai) (Ruling R3c)',
+        m16ms !== null && m16ms < 200 && m16panel === 0,
+        `panelGoneInMs=${m16ms} panelCount=${m16panel}`, 'panelGoneInMs<200 panelCount=0');
       const m2 = await modalGone();
       check('M2', 'tombol X menutup modal', m2, `modalGone=${m2}`, 'modalGone=true');
 
       // ---- M3: Esc menutup ----
       await openModal();
       await page.keyboard.press('Escape');
       const m3 = await modalGone();
       check('M3', 'Esc menutup modal', m3, `modalGone=${m3}`, 'modalGone=true');
 
       // ---- M4: klik backdrop menutup ----
@@ -365,23 +432,168 @@
       await page.locator('[data-testid="ic-recent-mdi:home"]').first().click();
       await waitForCount(before9 + 1);
       await page.waitForTimeout(300);
       const snapM9 = await docSnap();
       const bboxM9 = unionOf(snapM9.objects.slice(before9));
       await page.unroute('**/cdn.jsdelivr.net/npm/@iconify-json/ph/icons.json');
       check('M9', 'sisipan gagal tidak memajukan penghitung — sukses berikutnya +72 (counter 3), bukan +96 (Review Focus #5)',
         failToast && countAfterFail === countBeforeFail && zoomBack === 1 && shiftClose(bboxM9, cascadeBboxes[0], 72, 72),
         `failToast=${failToast} countBefore=${countBeforeFail} countAfter=${countAfterFail} zoomBack=${zoomBack} bboxM9=${JSON.stringify(bboxM9)} baseline=${JSON.stringify(cascadeBboxes[0])}`,
         'failToast=true countAfter=countBefore zoomBack=1 bboxM9=baseline+(72,72)');
+
+      // ---- M10: tombol V (Select) saat modal terbuka TIDAK menutup modal ----
+      // Guard .ov di keyboard handler kanvas (VectorEditor.jsx) harus
+      // mengabaikan shortcut tool selama ada dialog/modal terbuka. Blur
+      // fokus dulu supaya satu-satunya yang menghalangi ganti tool
+      // adalah guard itu (bukan karena fokus sedang di input).
+      await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
+      await page.keyboard.press('v');
+      await page.waitForTimeout(500);
+      const m10visible = await modalVisible();
+      const m10pressed = await toolBtn.getAttribute('aria-pressed');
+      check('M10', 'tombol V saat modal terbuka TIDAK menutup modal dan TIDAK mengganti tool (guard .ov)',
+        m10visible && m10pressed === 'true',
+        `modalVisible=${m10visible} aria-pressed=${m10pressed}`, 'modalVisible=true aria-pressed=true');
+
+      // ---- M11: kategori memfilter dropdown koleksi + grid telusur ----
+      // (Task 2 deferred (a) opsi kategori di dropdown terbuka + (b)
+      // ic-count terfilter — (b) dibuktikan M12; (a) di sini.)
+      // Kategori runtime: kategori milik 'mdi' dari /collections hidup
+      // (saat probe ditulis: "Material", 6 koleksi) — bukan hardcode
+      // label display; urutan koleksi = urutan Object.entries API, sama
+      // seperti yang dipakai listCollections() panel.
+      await clearSearch();
+      await page.waitForTimeout(500);
+      const catData = await page.evaluate(async () => {
+        const cols = await (await fetch('https://api.iconify.design/collections')).json();
+        const list = Object.entries(cols).map(([prefix, c]) => ({ prefix, name: c?.name ?? prefix, category: c?.category ?? null }));
+        return { list, mdiCat: (cols.mdi && cols.mdi.category) || null };
+      });
+      const CAT = catData.mdiCat || 'Material';
+      const catPrefixes = catData.list.filter(c => c.category === CAT).map(c => c.prefix);
+      const catNames = catData.list.filter(c => c.category === CAT).map(c => c.name);
+      info('M11 kategori', `${CAT} prefixes=${JSON.stringify(catPrefixes)}`);
+      await page.locator('[data-testid="ic-category"] button').first().click();
+      await page.waitForSelector('.flt', { state: 'visible', timeout: 10000 });
+      await page.getByRole('option', { name: CAT, exact: true }).first().click();
+      await page.waitForTimeout(800);
+      // Opsi dropdown koleksi = hanya koleksi dalam kategori itu
+      // (+ opsi "Semua koleksi" yang selalu ada di urutan pertama).
+      await page.locator('[data-testid="ic-collection"] button').first().click();
+      await page.waitForSelector('.flt', { state: 'visible', timeout: 10000 });
+      const collLabels = (await page.locator('.flt [role="option"]').allTextContents()).map(s => s.trim());
+      const collInCat = catNames.every(n => collLabels.includes(n))
+        && collLabels.length === catNames.length + 1
+        && collLabels.every(l => l === 'Semua koleksi' || catNames.includes(l));
+      // Tutup dropdown koleksi (Esc di input filter Select) supaya grid
+      // bisa dibaca; bila Esc gagal, klik tombolnya (toggle).
+      await page.keyboard.press('Escape');
+      await page.waitForTimeout(300);
+      if ((await page.locator('.flt').count()) > 0) {
+        await page.locator('[data-testid="ic-collection"] button').first().click();
+        await page.waitForTimeout(300);
+      }
+      const fltClosed = (await page.locator('.flt').count()) === 0;
+      // Grid telusur: ikon pertama berasal dari koleksi dalam kategori.
+      await page.locator('[data-testid="ic-grid"]').first().waitFor({ state: 'visible', timeout: 30000 });
+      const firstGridId = await page.locator('[data-testid="ic-grid"] [data-testid^="ic-icon-"]').first().getAttribute('data-testid');
+      const firstGridPrefix = (firstGridId || '').replace('ic-icon-', '').split(':')[0];
+      check('M11', 'kategori memfilter dropdown koleksi + grid telusur (ikon pertama dari koleksi kategori itu)',
+        collInCat && fltClosed && catPrefixes.includes(firstGridPrefix),
+        `kategori=${CAT} collOptions=${JSON.stringify(collLabels)} expectedNames=${JSON.stringify(catNames)} fltClosed=${fltClosed} firstGrid=${firstGridId} firstPrefix=${firstGridPrefix}`,
+        `collOptions=Semua koleksi+${JSON.stringify(catNames)} fltClosed=true firstPrefix∈${JSON.stringify(catPrefixes)}`);
+
+      // ---- M11b (Task 2 deferred (c)): thumbnail grid ter-render 40 px ----
+      // Ukur <img> pertama grid apa adanya di browser: data URI harus
+      // ter-decode (naturalWidth > 0) DAN lebar tampil 40 px (THUMB_PX).
+      const firstThumb = page.locator('[data-testid="ic-grid"] [data-testid^="ic-icon-"] img').first();
+      await firstThumb.waitFor({ state: 'visible', timeout: 30000 });
+      const thumb = await firstThumb.evaluate(img => {
+        const btn = img.closest('button');
+        const csB = btn ? getComputedStyle(btn) : null;
+        const csI = getComputedStyle(img);
+        return {
+          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
+          displayedWidth: img.getBoundingClientRect().width,
+          displayedHeight: img.getBoundingClientRect().height,
+          attrW: img.getAttribute('width'), attrH: img.getAttribute('height'),
+          btnBox: btn ? btn.getBoundingClientRect().width : null,
+          btnBoxSizing: csB ? csB.boxSizing : null, btnBorder: csB ? csB.border : null,
+          btnPadding: csB ? csB.padding : null, imgMaxWidth: csI.maxWidth,
+        };
+      });
+      info('M11b gaya tombol/img', `btnBox=${thumb.btnBox} boxSizing=${thumb.btnBoxSizing} border=${thumb.btnBorder} padding=${thumb.btnPadding} imgMaxWidth=${thumb.imgMaxWidth}`);
+      check('M11b', 'thumbnail grid ter-render visual 40 px (naturalWidth>0 + lebar tampil 40) (Task 2 deferred (c))',
+        thumb.naturalWidth > 0 && Math.abs(thumb.displayedWidth - 40) <= 0.5 && Math.abs(thumb.displayedHeight - 40) <= 0.5,
+        `natural=${thumb.naturalWidth}x${thumb.naturalHeight} displayed=${thumb.displayedWidth}x${thumb.displayedHeight} attr=${thumb.attrW}x${thumb.attrH}`,
+        'natural>0 displayed=40x40');
+
+      // ---- M12: cari "home" dgn kategori aktif -> hasil terfilter + ic-count ----
+      // ic-count panel = searchResults.length saat kategori aktif (bukan
+      // total API). Tunggu sampai jumlah grid tampil == angka ic-count
+      // (set hasil selesai dimuat), lalu bandingkan dgn total API hidup.
+      await searchFor('home');
+      await page.locator('[data-testid="ic-count"]').first().waitFor({ state: 'visible', timeout: 60000 });
+      // Tunggu sampai jumlah grid tampil == angka ic-count (set hasil
+      // selesai dimuat). Sengaja try/catch: bila kesetaraan TIDAK PERNAH
+      // tercapai (mis. sebagian set hasil gagal dimuat sehingga grid
+      // lebih sedikit dari ic-count), probe harus mencatat M12 GAGAL
+      // dengan angka sebenarnya — bukan abort dan melewatkan M14/PERR.
+      let countReached = false;
+      try {
+        await page.waitForFunction(() => {
+          const c = document.querySelector('[data-testid="ic-count"]');
+          const g = document.querySelectorAll('[data-testid="ic-grid"] [data-testid^="ic-icon-"]').length;
+          if (!c) return false;
+          const n = parseInt(((c.textContent || '').match(/(\d+)/) || [])[1] || '', 10);
+          return Number.isFinite(n) && n > 0 && n === g;
+        }, null, { timeout: 30000 });
+        countReached = true;
+      } catch (e) {
+        info('M12 kesetaraan grid==ic-count TIDAK tercapai dalam 30 dtk', 'lanjut membaca angka sebenarnya');
+      }
+      const gridIds = await page.locator('[data-testid="ic-grid"] [data-testid^="ic-icon-"]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')));
+      const gridPrefixes = [...new Set(gridIds.map(id => (id || '').replace('ic-icon-', '').split(':')[0]))];
+      const countText = (await page.locator('[data-testid="ic-count"]').first().textContent()) || '';
+      const countNum = parseInt((countText.match(/(\d+)/) || [])[1] || 'NaN', 10);
+      const apiTotal = await page.evaluate(async () => {
+        const d = await (await fetch('https://api.iconify.design/search?query=home&limit=1')).json();
+        return d.total ?? null;
+      });
+      const allInCat = gridIds.length >= 1 && gridPrefixes.every(p => catPrefixes.includes(p));
+      check('M12', 'cari "home" dgn kategori aktif -> semua hasil dari koleksi kategori itu + ic-count = jml terfilter tampil (bukan total API)',
+        allInCat && countNum === gridIds.length && apiTotal !== null && countNum < apiTotal,
+        `shown=${gridIds.length} prefixes=${JSON.stringify(gridPrefixes)} icCount=${countNum} text=${JSON.stringify(countText)} apiTotal=${apiTotal} countReached=${countReached}`,
+        'shown>=1 prefixes⊆kategori icCount=shown icCount<apiTotal');
+      await shot('iconify-modal-category.png');
+
+      // ---- M14 (Ruling R3a): wrap % 10 — 11 sisipan satu sesi modal baru ----
+      // Sesi baru (tutup + buka lagi) supaya penghitung cascade reset ke 0:
+      // sisipan ke-11 memakai counter 10 -> (10 % 10) * 24 = +0, sama
+      // seperti sisipan pertama sesi ini.
+      await page.locator('[data-testid="ic-close"]').click();
+      await modalGone();
+      await openModal();
+      await searchFor('home');
+      await iconButton('mdi:home').first().waitFor({ state: 'visible', timeout: 60000 });
+      const wrapBboxes = [];
+      for (let i = 0; i < 11; i++) wrapBboxes.push(await insertMdiHome());
+      info('M14 bbox ke-7 (counter 6, +144)', JSON.stringify(wrapBboxes[6]));
+      info('M14 bbox ke-10 (counter 9, +216)', JSON.stringify(wrapBboxes[9]));
+      check('M14', 'sisip 11x satu sesi modal -> sisipan ke-11 di offset +0 (wrap % 10, sama dgn sisipan ke-1) (Ruling R3a)',
+        shiftClose(wrapBboxes[10], wrapBboxes[0], 0, 0),
+        `b1=${JSON.stringify(wrapBboxes[0])} b11=${JSON.stringify(wrapBboxes[10])}`,
+        'b11=b1');
       await shot('iconify-modal-cascade.png');
 
-      check('PERR', '0 pageerror selama probe modal', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');
+      // M13 = 0 pageerror selama seluruh probe modal (check PERR di bawah).
+      check('PERR', '0 pageerror selama probe modal (M13)', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');
     }
   } catch (e) {
     console.log('PROBE ERROR: ' + (e && e.stack || e));
     process.exitCode = 1;
   } finally {
     if (browser) await browser.close();
     if (relay) await new Promise(r => relay.close(r));
   }
   const failed = results.filter(r => !r.pass);
   console.log(`\nPROBE-ICONIFY-MODAL: ${results.length - failed.length}/${results.length} lolos`
```

## Diff 2 — probe-iconify.cjs vs .bak-modal-t5
```diff
--- ../../../../probes/probe-iconify.cjs.bak-modal-t5	2026-11-15 05:39:37.795122445 +0000
+++ ../../../../probes/probe-iconify.cjs	2026-11-15 05:50:33.820059184 +0000
@@ -1,42 +1,75 @@
 /**
  * @file probes/probe-iconify.cjs
  * @description Task 5 (Iconify) + Task 6 (insert flow) — probe Playwright, browser asli.
  *   Task 5 — tool wiring (floating bar -> panel):
  *   - P0 tool button [data-tip="veIconify"] exists in the floating bar
  *   - P1 clicking it opens the panel ([data-testid="ic-panel"]) + button aria-pressed
- *   - P2 clicking it again closes the panel (toggle)
+ *   - P2 DIHAPUS (Task 5 modal, 2026-11-15 — lihat catatan overlay di
+ *       bawah): toggle-close via tombol floating bar TIDAK TERJANGKAU
+ *       selama modal terbuka — overlay `.ov` menutupi floating bar
+ *       (keputusan user Q2: floating bar tak bisa diklik saat modal
+ *       terbuka; dibuktikan run probe: Playwright menolak klik P2 karena
+ *       `<div class="ov in">` intercepts pointer events). P2b ikut
+ *       dihapus (aria-pressed=false sesudah toggle yang sama). Jalur
+ *       tutup yang tersisa (X / Esc / backdrop) dicakup P3/P4 di sini
+ *       + M2/M3/M4 di probe modal; guard ganti-tool dicakup M10.
  *   - P3 the panel close control ([data-testid="ic-close"]) closes it
+ *       (Task 5 modal: tanpa openPanel() dulu — panel sudah terbuka
+ *       dari P1, karena P2 yang dulu menutupnya kini dihapus)
  *   - P4 Esc closes it
  *   - P5 opening it while a Float popover is open (shape picker) closes the
  *       popover (existing Float outside-click pattern — no new code)
- *   - P6 activating another tool (Select) closes the panel (one active tool)
+ *   - P6 DIHAPUS (Task 5 modal, 2026-11-15): "activating another tool
+ *       (Select) closes the panel" adalah perilaku panel sidebar lama.
+ *       Di design modal, tool lain TIDAK boleh menutup modal — keyboard
+ *       handler kanvas mengabaikan shortcut tool selama ada .ov/dialog
+ *       (guard .ov); modal hanya tutup via X / Esc / backdrop / toggle
+ *       tombol Ikon sendiri. Perilaku baru itu dibuktikan probe modal
+ *       M10 (tombol V saat modal terbuka tidak menutup modal). P6 yang
+ *       dipertahankan akan meng-assert kebalikan design baru.
  *   - P7 0 pageerror
+ *   CATATAN OVERLAY (Task 5 modal): sejak Task 3 panel tinggal di modal
+ *   (portal + overlay `.ov` fullscreen), SEMUA klik floating bar /
+ *   sidebar dan SEMUA shortcut kanvas (termasuk Ctrl+Z / Ctrl+A)
+ *   terblokir selama modal terbuka — handler keyboard global return
+ *   dini bila ada `.ov`/`[role="dialog"]`, dan Playwright menolak klik
+ *   karena `.ov` intercepts pointer events. Karena itu, selain P2/P2b
+ *   di atas, tiga penyesuaian mount terpaksa (bukan pilihan) di T6:
+ *   T6-2 tutup modal dulu baru Ctrl+Z; T6-4 buka ulang + cari "home"
+ *   lagi (remount mereset query); T6-7 tutup modal dulu baru sentuh
+ *   input Stroke sidebar. Tiap penyesuaian ditandai di tempatnya.
  *   Task 6 — insert flow (search "home" -> click icon -> object at viewport
  *   center, selected, 96 px frame -> Ctrl+Z removes it):
  *   - T6-0 palette icon discovered at runtime (palette:true collection)
  *   - T6-1 mdi:home (fill-based): 1 object, named group, active Fill,
  *     icon metadata, tight bbox = native x4 at viewport center, selected,
  *     success toast
  *   - T6-2 one Ctrl+Z removes the insert
  *   - T6-4 tabler:home (stroke-based): 2 objects, Stroke color (not Fill),
  *     strokeWidth = active sw x4, metadata, bbox
  *   - T6-5 palette icon: original colors kept (not active Fill), metadata
  *   - T6-6 tabler:arrow-bottom-circle (multi-element): both leaf shapes,
  *     node counts [4,5], bbox, stroke color/width
  *   - T6-7 R12: Fill/Stroke panel recolors the NAMED group (Ctrl+A + Stroke)
  *   - T6-8 R14: strokeWidth + icon metadata survive a JSON round-trip
  *     through loadTestDoc AND a real autosave -> reload -> reopen.
  *   Insert behavior is Task 6 (stub onInsert records the call only); browse
  *   grid / search / empty-state assertions are Task 8 (deferred from Task 4,
- *   ruling R5 — see the T8 section below), as is the stacked-sidebar check
- *   (Task 5 deferred minor, T8-4) and the search-failure copy check in
+ *   ruling R5 — see the T8 section below). The stacked-sidebar check
+ *   (Task 5 deferred minor, T8-4) was REMOVED in Task 5 modal (2026-11-15):
+ *   "Recolor + FindReplace stay open stacked alongside Iconify" hanya
+ *   bermakna bila panel Iconify tinggal di sidebar kanan; sejak Task 3
+ *   panel tinggal di modal (portal ke document.body), jadi "berdampingan
+ *   di sidebar" tidak lagi punya arti — seksi FR/RC dan modal hidup di
+ *   lapisan berbeda dan tidak bisa di-stack. Dihapus dengan alasan ini,
+ *   bukan diam-diam. The search-failure copy check lives in
  *   probe-iconify-offline.cjs (Task 7 review minor M1, T8-5).
  *
  *   Panel open triggers network fetches (listCollections + loadSet
  *   material-symbols) — the probe therefore reuses the spike1 loopback
  *   CONNECT relay + probe-only --ignore-certificate-errors (VM egress
  *   proxy 403s Chromium's direct CONNECT; see probes/probe-iconify-spike1.cjs
  *   header). Panel-root visibility does NOT depend on those fetches
  *   succeeding (loading/error states still render the panel).
  *
  * Usage: cd web && python3 -m http.server 9041   (run `npm run build:web` first if web/ is stale)
@@ -193,30 +226,29 @@
     };
 
     // ---- P1: click opens the panel; button shows active ----
     await openPanel();
     check('P1', 'clicking the tool opens the panel', await panelVisible(), `visible=${await panelVisible()}`, 'visible=true');
     check('P1b', 'tool button aria-pressed=true while panel is open',
       (await toolBtn.getAttribute('aria-pressed')) === 'true',
       `aria-pressed=${await toolBtn.getAttribute('aria-pressed')}`, 'aria-pressed=true');
     await shot('iconify-t5-open.png');
 
-    // ---- P2: clicking the tool again closes the panel (toggle) ----
-    await toolBtn.click();
-    await panel.waitFor({ state: 'hidden', timeout: 10000 });
-    check('P2', 'clicking the tool again closes the panel', !(await panelVisible()), `visible=${await panelVisible()}`, 'visible=false');
-    check('P2b', 'tool button aria-pressed=false after toggle-close',
-      (await toolBtn.getAttribute('aria-pressed')) === 'false',
-      `aria-pressed=${await toolBtn.getAttribute('aria-pressed')}`, 'aria-pressed=false');
+    // ---- P2 DIHAPUS (Task 5 modal): toggle-close via tombol floating bar
+    // tidak terjangkau selama modal terbuka — overlay `.ov` menutupi
+    // floating bar (run probe: klik ditolak karena `<div class="ov in">`
+    // intercepts pointer events; keputusan user Q2). P2b (aria-pressed
+    // sesudah toggle) ikut dihapus. Panel dibiarkan TERBUKA sesudah P1.
 
     // ---- P3: panel close control closes it ----
-    await openPanel();
+    // Tanpa openPanel() dulu: panel sudah terbuka dari P1 (P2 yang dulu
+    // menutupnya kini dihapus) — X diklik langsung.
     await page.locator('[data-testid="ic-close"]').click();
     await panel.waitFor({ state: 'hidden', timeout: 10000 });
     check('P3', 'panel close control (X) closes the panel', !(await panelVisible()), `visible=${await panelVisible()}`, 'visible=false');
 
     // ---- P4: Esc closes it ----
     await openPanel();
     await page.keyboard.press('Escape');
     await panel.waitFor({ state: 'hidden', timeout: 10000 });
     check('P4', 'Esc closes the panel', !(await panelVisible()), `visible=${await panelVisible()}`, 'visible=false');
 
@@ -225,52 +257,36 @@
     await page.waitForSelector('.flt', { state: 'visible', timeout: 10000 });
     const fltBefore = await page.locator('.flt').count();
     await openPanel();
     await page.waitForTimeout(500);
     const fltAfter = await page.locator('.flt').count();
     check('P5', 'opening the panel closes the open Float popover (shape picker)',
       fltBefore >= 1 && fltAfter === 0 && (await panelVisible()),
       `flt before=${fltBefore} after=${fltAfter} panelVisible=${await panelVisible()}`,
       'flt before>=1 after=0 panelVisible=true');
 
-    // ---- P6: activating another tool closes the panel (one active tool) ----
-    await page.locator('.fig-floating-bar [data-tip="veSelect"]').click();
-    await panel.waitFor({ state: 'hidden', timeout: 10000 });
-    check('P6', 'activating the Select tool closes the panel', !(await panelVisible()), `visible=${await panelVisible()}`, 'visible=false');
-    await shot('iconify-t5-closed.png');
+    // ---- P6 DIHAPUS (Task 5 modal): lihat header. Panel dibiarkan TERBUKA
+    // sesudah P5 — T8-1 di bawah mengasumsikan panel terbuka (dulu dibuka
+    // ulang oleh blok T8-4 yang kini juga dihapus). Tidak ada penanda
+    // pengganti: perilaku pengganti (V tidak menutup modal) dibuktikan
+    // M10 di probes/probe-iconify-modal.cjs.
 
-    // ================= Task 8 (R5 deferred assertions + stacked sidebar) =================
+    // ================= Task 8 (R5 deferred assertions) =================
     // R5 (Task 4): the component harness only does static render, so these
     // three interactive assertions were deferred here (browser asli):
     // (1) browse grid on open shows Material Symbols; (2) typing a
     // debounced query switches to search results; (3) empty results show
-    // the explanatory empty state. Task 5 deferred minor: Recolor /
-    // FindReplace stay open stacked alongside Iconify (T8-4).
-    // ---- T8-4: Recolor + FindReplace stay open stacked alongside Iconify ----
-    await page.locator('[data-testid="fr-open-styles"]').first().click();
-    await page.locator('[data-testid="fr-section"]').waitFor({ state: 'visible', timeout: 15000 });
-    await page.locator('[data-testid="rc-open-styles"]').first().click();
-    await page.locator('[data-testid="rc-section"]').waitFor({ state: 'visible', timeout: 15000 });
-    await openPanel();
-    const t8FrVisible = await page.locator('[data-testid="fr-section"]').first().isVisible().catch(() => false);
-    const t8RcVisible = await page.locator('[data-testid="rc-section"]').first().isVisible().catch(() => false);
-    check('T8-4', 'Recolor + FindReplace stay open stacked alongside Iconify',
-      (await panelVisible()) && t8FrVisible && t8RcVisible,
-      `icPanel=${await panelVisible()} frSection=${t8FrVisible} rcSection=${t8RcVisible}`,
-      'icPanel=true frSection=true rcSection=true');
-    // Close FR/RC again so Task 6 runs in its baseline state (the Iconify
-    // panel stays open for T8-1).
-    await page.locator('[data-testid="fr-close"]').first().click();
-    await page.locator('[data-testid="rc-close"]').first().click();
-    await page.waitForTimeout(300);
-
+    // the explanatory empty state. T8-4 (stacked sidebar) DIHAPUS Task 5
+    // modal — lihat header (panel tidak lagi di sidebar).
     // ---- T8-1 (R5.1): browse grid on open shows Material Symbols ----
+    // Panel masih terbuka dari P5 (P6 + T8-4 dihapus Task 5 modal — panel
+    // tidak lagi ditutup lalu dibuka ulang di antara keduanya).
     await page.locator('[data-testid="ic-grid"]').first().waitFor({ state: 'visible', timeout: 60000 });
     const t8MsCount = await page.locator('[data-testid^="ic-icon-material-symbols:"]').count();
     const t8MsFirst = t8MsCount > 0
       ? (await page.locator('[data-testid^="ic-icon-material-symbols:"]').first().getAttribute('data-testid'))
       : null;
     check('T8-1', 'browse grid on open shows Material Symbols icons',
       t8MsCount >= 1,
       `materialSymbolsIcons=${t8MsCount} first=${t8MsFirst}`, 'materialSymbolsIcons>=1');
 
     // ---- T8-1b (fix wave R18/I1): license label is a plain SPDX string ----
@@ -515,29 +531,41 @@
     check('T6-1f', 'mdi:home tight bbox = native x4 at viewport center (frame 96)',
       mdiObjs.length === 1 && bboxClose(unionOf(mdiObjs), mdiExp),
       `bbox=${JSON.stringify(unionOf(mdiObjs))}`, `bbox=${JSON.stringify(mdiExp)}`);
     check('T6-1g', 'mdi:home is selected (Fill section visible after insert)',
       (await page.locator('[data-tip="veFill"]').count()) >= 1,
       `veFill sections=${await page.locator('[data-tip="veFill"]').count()}`, 'veFill sections>=1');
     check('T6-1h', 'success toast names the inserted icon', toastOk, `toastHas(mdi:home)=${toastOk}`, 'toastHas(mdi:home)=true');
     await shot('iconify-t6-mdi.png');
 
     // ---- T6-2: one Ctrl+Z removes the insert ----
-    // Focus is on the clicked grid button (not a text input), so the
-    // window undo handler accepts Ctrl+Z here.
+    // ADAPTASI Task 5 modal: Ctrl+Z TIDAK jalan selama modal terbuka —
+    // keyboard handler kanvas return dini bila ada `.ov`/`[role="dialog"]`.
+    // Jadi tutup modal dulu (X), baru Ctrl+Z; fokus sesudah X unmount
+    // kembali ke body sehingga handler window menerima Ctrl+Z.
+    await page.locator('[data-testid="ic-close"]').click();
+    await panel.waitFor({ state: 'hidden', timeout: 10000 });
+    // Overlay `.ov` bertahan 200 ms sesudah panel hilang (usePresence)
+    // dan selama itu handler keyboard mengabaikan Ctrl+Z — tunggu
+    // sampai `.ov` benar-benar hilang sebelum undo.
+    await page.waitForFunction(() => !document.querySelector('.ov'), null, { timeout: 5000 });
     await page.keyboard.press('ControlOrMeta+z');
     await waitForCount(0);
     snap = await docSnap();
     check('T6-2', 'one Ctrl+Z removes the inserted icon', snap.objectCount === 0, `count=${snap.objectCount}`, 'count=0');
 
     // ---- T6-4: insert tabler:home (stroke-based) — R6 ----
-    // Search box still holds "home"; panel still open.
+    // ADAPTASI Task 5 modal: panel ditutup untuk T6-2, dan remount panel
+    // mereset query — jadi buka ulang + cari "home" lagi (bukan "search
+    // box masih memegang home" seperti dulu).
+    await openPanel();
+    await searchFor('home');
     snapBefore = await docSnap();
     await iconButton('tabler:home').first().waitFor({ state: 'visible', timeout: 60000 });
     await iconButton('tabler:home').first().click();
     await waitForCount(snapBefore.objectCount + 2);
     await page.waitForTimeout(300);
     snap = await docSnap();
     const tabObjs = snap.objects.slice(snapBefore.objectCount);
     const tabExp = expectedBbox('tabler:home', snap.viewBox);
     check('T6-4a', 'tabler:home inserts exactly 2 objects', tabObjs.length === 2, `new=${tabObjs.length}`, 'new=2');
     check('T6-4b', 'tabler:home objects share one named group',
@@ -588,20 +616,30 @@
         `fills=${JSON.stringify(palObjs.map(o => o.fill))} original=${JSON.stringify(pal.fills)}`, `one fill in ${JSON.stringify(pal.fills)}`);
       check('T6-5c', `palette ${pal.iconName} does NOT take the active Fill color`,
         palObjs.length >= 1 && palObjs.every(o => (o.fill || '').toLowerCase() !== ACTIVE_FILL),
         `fills=${JSON.stringify(palObjs.map(o => o.fill))}`, `no fill=${ACTIVE_FILL}`);
       check('T6-5d', `palette ${pal.iconName} carries icon metadata {name, license}`,
         palObjs.length >= 1 && palObjs.every(o => JSON.stringify(o.icon) === JSON.stringify({ name: pal.iconName, license: pal.license })),
         `icons=${JSON.stringify(palObjs.map(o => o.icon))}`, `icons=[{"name":"${pal.iconName}","license":"${pal.license}"} ...]`);
     }
 
     // ---- T6-6: multi-element icon (Task 1: tabler:arrow-bottom-circle) ----
+    // ADAPTASI Task 5 modal (cascade Task 4): sisipan T6-5 memajukan
+    // penghitung cascade ke 2 — bila T6-6 menyisip di sesi modal yang
+    // sama, bbox-nya bergeser +48 dan T6-6e (tengah viewport) gagal,
+    // padahal itu perilaku cascade yang benar, bukan bug. Tutup + buka
+    // ulang modal supaya penghitung reset ke 0 dan sisipan kembali ke
+    // tengah viewport; asersi T6-6a–f sendiri tidak berubah.
+    await page.locator('[data-testid="ic-close"]').click();
+    await panel.waitFor({ state: 'hidden', timeout: 10000 });
+    await page.waitForFunction(() => !document.querySelector('.ov'), null, { timeout: 5000 });
+    await openPanel();
     // The search API NEVER returns this icon (verified live: queries
     // "arrow-bottom-circle" / "arrow" / "circle" / "arrow-bottom" all
     // miss it), so it is reached via browse mode: filter to the tabler
     // collection and page with "Load more" — tabler keys are alphabetical
     // and arrow-bottom-circle is at index 268, i.e. past the first 48.
     await page.locator('[data-testid="ic-collection"] button').click();
     const collInputTab = page.locator('.flt input').first();
     await collInputTab.waitFor({ state: 'visible', timeout: 10000 });
     await collInputTab.fill('Tabler Icons');
     await page.getByRole('option', { name: 'Tabler Icons', exact: true }).first().click();
@@ -636,23 +674,31 @@
       `paint=${JSON.stringify(multiObjs.map(o => [o.fill, o.stroke, o.strokeWidth]))}`, "paint=[['none','#000073',8] x2]");
     check('T6-6e', 'multi-element tight bbox = native x4 at viewport center (frame 96)',
       multiObjs.length === 2 && bboxClose(unionOf(multiObjs), multiExp),
       `bbox=${JSON.stringify(unionOf(multiObjs))}`, `bbox=${JSON.stringify(multiExp)}`);
     check('T6-6f', 'multi-element carries icon metadata {name, license}',
       multiObjs.length === 2 && multiObjs.every(o => JSON.stringify(o.icon) === JSON.stringify({ name: 'tabler:arrow-bottom-circle', license: 'MIT' })),
       `icons=${JSON.stringify(multiObjs.map(o => o.icon))}`, 'icons=[{"name":"tabler:arrow-bottom-circle","license":"MIT"} x2]');
     await shot('iconify-t6-multi.png');
 
     // ---- T6-7 (R12): Fill/Stroke panel recolors the NAMED group ----
-    // Ctrl+A selects all objects (focus is on the grid button, not an
-    // input, so the window handler accepts it); then set Stroke via the
-    // inspector ColorText exactly like a user (Task 1 pattern).
+    // ADAPTASI Task 5 modal: input Stroke ada di sidebar inspector —
+    // di balik overlay `.ov` selama modal terbuka, jadi kliknya akan
+    // ditolak (`.ov` intercepts pointer events) dan Ctrl+A pun diblokir
+    // handler keyboard. Tutup modal dulu (X), baru Ctrl+A + set Stroke
+    // via inspector ColorText seperti user (pola Task 1). T6-7c di bawah
+    // (klik veSelect + Ctrl+Z) kini jalan karena modal sudah tertutup.
+    await page.locator('[data-testid="ic-close"]').click();
+    await panel.waitFor({ state: 'hidden', timeout: 10000 });
+    // Sama seperti T6-2: tunggu `.ov` benar-benar hilang (200 ms) supaya
+    // Ctrl+A tidak diabaikan handler keyboard.
+    await page.waitForFunction(() => !document.querySelector('.ov'), null, { timeout: 5000 });
     await page.keyboard.press('ControlOrMeta+a');
     await page.waitForTimeout(300);
     const strokeInput = page.locator('[data-tip="veStroke"] [data-testid="color-text"] [data-custom-input]');
     await strokeInput.click();
     await page.keyboard.press('ControlOrMeta+a');
     await page.keyboard.type('00aa00', { delay: 25 });
     await page.keyboard.press('Enter');
     await page.waitForTimeout(600);
     snap = await docSnap();
     const recolored = (group) => snap.objects.filter(o => o.group === group);
```

## Diff 3 — IconifyPanel.jsx vs .bak-modal-t5fix (fix wave F1/F2)
```diff
--- ../../../../src/components/editor/IconifyPanel.jsx.bak-modal-t5fix	2026-11-15 05:59:45.997833608 +0000
+++ ../../../../src/components/editor/IconifyPanel.jsx	2026-11-15 05:59:50.721054893 +0000
@@ -363,18 +363,18 @@
   if (singleCollection?.license) {
     licenseNote = L.icLicenseOne.replace('{name}', singleCollection.name).replace('{license}', singleCollection.license);
   } else if (mode === 'search' && !selectedPrefix && renderableSearch.length > 0) {
     const licenses = [...new Set(renderableSearch.map(r => r.license).filter(Boolean))];
     if (licenses.length) licenseNote = L.icLicenseMany.replace('{licenses}', licenses.join(', '));
   }
 
   const thumbButton = (fullName, setData, iconObj, testid) => {
     const uri = svgDataUri(fullName, setData);
     if (!uri) return null;
-    return <button key={fullName} type="button" className="ved-pill" style={{width: 44, height: 44, padding: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}} data-testid={testid} title={fullName} aria-label={fullName} onClick={() => onInsert(iconObj)}><img src={uri} alt={fullName} width={THUMB_PX} height={THUMB_PX} draggable={false} /></button>;
+    return <button key={fullName} type="button" className="ved-pill" style={{width: 44, height: 44, padding: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}} data-testid={testid} title={fullName} aria-label={fullName} onClick={() => onInsert(iconObj)}><img src={uri} alt={fullName} width={THUMB_PX} height={THUMB_PX} draggable={false} /></button>;
   };
 
-  return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}><div><div className="fig-sub-lbl">{L.icCategory}</div><div data-testid="ic-category"><Select value={selectedCategory} options={categoryOptions(collections, L)} on={handleCategoryChange} /></div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...visibleCollections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div></div>{netStatus === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(selectedCategory ? searchResults.length : searchTotal))}</span>{(selectedCategory ? !searchExhausted : searchResults.length < searchTotal) ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
+  return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}><div><div className="fig-sub-lbl">{L.icCategory}</div><div data-testid="ic-category"><Select value={selectedCategory} options={categoryOptions(collections, L)} on={handleCategoryChange} /></div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...visibleCollections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div></div>{netStatus === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(selectedCategory ? renderableSearch.length : searchTotal))}</span>{(selectedCategory ? !searchExhausted : searchResults.length < searchTotal) ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
 };
 
 export { IconifyPanel, toPanelError, categoryOptions, collectionsInCategory };
 export default IconifyPanel;
```

## Diff 4 — iconify-panel.test.cjs vs .bak-modal-t5fix (guard F1/F2)
```diff
--- ../../../../tests/iconify-panel.test.cjs.bak-modal-t5fix	2026-11-15 05:59:45.999508170 +0000
+++ ../../../../tests/iconify-panel.test.cjs	2026-11-15 05:59:57.676054840 +0000
@@ -29,21 +29,23 @@
  * koordinator / Task 5: dua asersi Step 2 brief TIDAK dapat
  * dibuktikan lewat SSR dan TIDAK dipalsukan di file ini:
  *   (a) opsi kategori di dalam dropdown (Select hanya me-render
  *       label nilai aktif saat tertutup; daftar opsi hidup di dalam
  *       <Float> yang me-return null saat tertutup — jadi markup SSR
  *       tidak pernah memuat opsi). Yang DAPAT diuji: dropdown
  *       kategori hadir + label default "Semua kategori", dan helper
  *       murni `categoryOptions` / `collectionsInCategory` yang
  *       diekspor panel (preseden: `toPanelError`) diuji langsung
  *       dengan collections yang dipasok;
- *   (b) `ic-count` = jumlah hasil TERFILTER saat kategori aktif
+ *   (b) `ic-count` = jumlah hasil TERFILTER yang benar-benar tampil
+ *       saat kategori aktif (renderableSearch — fix wave Task 5: set
+ *       yang gagal dimuat tidak lagi ikut dihitung)
  *       (butuh efek cari async + fetch). Wiring-nya dipatok guard
  *       sumber di bawah; perilaku hidupnya dibuktikan probe Task 5.
  *   (c) thumbnail `<img width=40 height=40>` juga tidak ada di
  *       markup SSR (grid hanya dirender sesudah efek loadSet/search
  *       — tidak jalan di SSR); dipatok guard sumber THUMB_PX = 40
  *       + tombol 44 px, dan diverifikasi visual oleh probe Task 5.
  */
 const {test} = require('node:test');
 const assert = require('node:assert/strict');
 const path = require('node:path');
@@ -301,37 +303,47 @@
   assert.equal(APP_STR.en.icOtherCategory, 'Other');
 });
 
 test('IconifyPanel source (Task 2): THUMB_PX 40, tombol thumb 44, searchIconsFiltered + ic-count terfilter + muat-lagi !exhausted + telusur koleksi pertama kategori', () => {
   const src = panelSrc();
   // Thumbnail 40 px (bukan 28), tombol 44 px (bukan 32).
   assert.match(src, /THUMB_PX\s*=\s*40/);
   assert.doesNotMatch(src, /THUMB_PX\s*=\s*28/);
   assert.match(src, /width:\s*44,\s*height:\s*44/);
   assert.doesNotMatch(src, /width:\s*32,\s*height:\s*32/);
+  // Fix wave Task 5 (F1): padding tombol thumb 1 px — content box
+  // 44 − 2×1 (border) − 2×1 (padding) = 40 px, jadi <img> 40 px tidak
+  // lagi dijepit max-width:100% ke 38 px. Tombol tetap 44 px.
+  assert.match(src, /width:\s*44,\s*height:\s*44,\s*padding:\s*1,/);
+  assert.doesNotMatch(src, /width:\s*44,\s*height:\s*44,\s*padding:\s*2,/);
   // State kategori + helper turunan dipakai panel (bukan label display).
   assert.match(src, /selectedCategory/);
   assert.match(src, /categoryOptions\(collections,\s*L\)/);
   assert.match(src, /collectionsInCategory\(collections,\s*selectedCategory\)/);
   assert.doesNotMatch(src, /category\s*===\s*['"]Lainnya['"]/);
   assert.doesNotMatch(src, /category\s*===\s*['"]Other['"]/);
   // Dua kolom sebaris (Kategori | Koleksi).
   assert.match(src, /gridTemplateColumns:\s*'1fr 1fr'/);
   // Ganti kategori mereset koleksi bila koleksi aktif di luar kategori baru.
   assert.match(src, /setSelectedCategory\(v\)/);
   assert.match(src, /setSelectedPrefix\(''\)/);
   // Telusur: kategori aktif → koleksi pertama dalam kategori itu.
   assert.match(src, /selectedCategory \? visibleCollections\[0\]\?\.prefix : undefined/);
   // Cari: kategori aktif → searchIconsFiltered; ic-count = hasil
   // terfilter yang dimuat; "Muat lagi" selama !exhausted.
+  // Fix wave Task 5 (F2): kategori aktif memakai renderableSearch
+  // (ikon yang benar-benar tampil — set yang gagal dimuat sudah
+  // difilter keluar), BUKAN searchResults.length; tanpa kategori
+  // tetap searchTotal (semantik pra-ada, dipertahankan).
   assert.match(src, /searchIconsFiltered\(q,\s*\{category: selectedCategory, collections, limit: SEARCH_LIMIT/);
-  assert.match(src, /selectedCategory \? searchResults\.length : searchTotal/);
+  assert.match(src, /selectedCategory \? renderableSearch\.length : searchTotal/);
+  assert.doesNotMatch(src, /selectedCategory \? searchResults\.length : searchTotal/);
   assert.match(src, /selectedCategory \? !searchExhausted : searchResults\.length < searchTotal/);
   assert.match(src, /searchIconsFiltered\(q,\s*\{category: selectedCategory, collections, limit: searchResults\.length \+ SEARCH_LIMIT/);
   // Tripwire (review round 1, Important): kondisi "Muat lagi"
   // !searchExhausted hanya bermakna bila kedua jalur cari benar-benar
   // menulis res.exhausted ke state — efek cari DAN handleLoadMoreSearch.
   // Tanpa salah satunya, tombol tampil selamanya (state awal false).
   // Hitung 2 agar penghapusan di salah satu call site membuat tes MERAH.
   assert.match(src, /setSearchExhausted\(res\.exhausted\)/);
   assert.equal((src.match(/setSearchExhausted\(res\.exhausted\)/g) || []).length, 2);
   // Jalur tanpa kategori tetap searchIcons lama (total API tetap tampil).
```
