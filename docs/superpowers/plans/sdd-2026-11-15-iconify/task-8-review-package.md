=== TASK 8 REVIEW PACKAGE ===

--- New files ---
docs/superpowers/plans/sdd-2026-11-15-iconify/task-8-report.md

--- Modified files (probe-only; backups .bak-iconify-t8) ---
-rw-rw---- 1 root nogroup 19967 Nov 15 03:23 probes/probe-iconify-offline.cjs.bak-iconify-t8
-rw-rw---- 1 root nogroup 36364 Nov 15 03:23 probes/probe-iconify.cjs.bak-iconify-t8
No src/ file touched (find src -name '*.bak-iconify-t8' empty per report)

--- Diff: probe-iconify.cjs ---
--- probes/probe-iconify.cjs.bak-iconify-t8	2026-11-15 03:23:56.325769892 +0000
+++ probes/probe-iconify.cjs	2026-11-15 03:24:07.222026623 +0000
@@ -27,7 +27,10 @@
  *   - T6-8 R14: strokeWidth + icon metadata survive a JSON round-trip
  *     through loadTestDoc AND a real autosave -> reload -> reopen.
  *   Insert behavior is Task 6 (stub onInsert records the call only); browse
- *   grid / search / empty-state assertions are Task 8 (deferred from Task 4).
+ *   grid / search / empty-state assertions are Task 8 (deferred from Task 4,
+ *   ruling R5 — see the T8 section below), as is the stacked-sidebar check
+ *   (Task 5 deferred minor, T8-4) and the search-failure copy check in
+ *   probe-iconify-offline.cjs (Task 7 review minor M1, T8-5).
  *
  *   Panel open triggers network fetches (listCollections + loadSet
  *   material-symbols) — the probe therefore reuses the spike1 loopback
@@ -177,7 +180,7 @@
     if (toolCount !== 1) {
       check('P7', '0 pageerror', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');
       const failed = results.filter(r => !r.pass);
-      console.log(`\nPROBE-ICONIFY-T6: ${results.length - failed.length}/${results.length} lolos`
+      console.log(`\nPROBE-ICONIFY-T8: ${results.length - failed.length}/${results.length} lolos`
         + (failed.length ? ` | GAGAL: ${failed.map(f => f.id).join(', ')}` : ' | SEMUA LOLOS'));
       process.exitCode = 1;
       return;
@@ -235,6 +238,94 @@
     check('P6', 'activating the Select tool closes the panel', !(await panelVisible()), `visible=${await panelVisible()}`, 'visible=false');
     await shot('iconify-t5-closed.png');
 
+    // ================= Task 8 (R5 deferred assertions + stacked sidebar) =================
+    // R5 (Task 4): the component harness only does static render, so these
+    // three interactive assertions were deferred here (browser asli):
+    // (1) browse grid on open shows Material Symbols; (2) typing a
+    // debounced query switches to search results; (3) empty results show
+    // the explanatory empty state. Task 5 deferred minor: Recolor /
+    // FindReplace stay open stacked alongside Iconify (T8-4).
+    // ---- T8-4: Recolor + FindReplace stay open stacked alongside Iconify ----
+    await page.locator('[data-testid="fr-open-styles"]').first().click();
+    await page.locator('[data-testid="fr-section"]').waitFor({ state: 'visible', timeout: 15000 });
+    await page.locator('[data-testid="rc-open-styles"]').first().click();
+    await page.locator('[data-testid="rc-section"]').waitFor({ state: 'visible', timeout: 15000 });
+    await openPanel();
+    const t8FrVisible = await page.locator('[data-testid="fr-section"]').first().isVisible().catch(() => false);
+    const t8RcVisible = await page.locator('[data-testid="rc-section"]').first().isVisible().catch(() => false);
+    check('T8-4', 'Recolor + FindReplace stay open stacked alongside Iconify',
+      (await panelVisible()) && t8FrVisible && t8RcVisible,
+      `icPanel=${await panelVisible()} frSection=${t8FrVisible} rcSection=${t8RcVisible}`,
+      'icPanel=true frSection=true rcSection=true');
+    // Close FR/RC again so Task 6 runs in its baseline state (the Iconify
+    // panel stays open for T8-1).
+    await page.locator('[data-testid="fr-close"]').first().click();
+    await page.locator('[data-testid="rc-close"]').first().click();
+    await page.waitForTimeout(300);
+
+    // ---- T8-1 (R5.1): browse grid on open shows Material Symbols ----
+    await page.locator('[data-testid="ic-grid"]').first().waitFor({ state: 'visible', timeout: 60000 });
+    const t8MsCount = await page.locator('[data-testid^="ic-icon-material-symbols:"]').count();
+    const t8MsFirst = t8MsCount > 0
+      ? (await page.locator('[data-testid^="ic-icon-material-symbols:"]').first().getAttribute('data-testid'))
+      : null;
+    check('T8-1', 'browse grid on open shows Material Symbols icons',
+      t8MsCount >= 1,
+      `materialSymbolsIcons=${t8MsCount} first=${t8MsFirst}`, 'materialSymbolsIcons>=1');
+
+    // ---- T8-2 (R5.2): typing a debounced query switches to search results ----
+    const t8SearchBox = page.locator('[data-testid="ic-search"] [data-custom-input]');
+    await t8SearchBox.click();
+    await page.keyboard.type('home', { delay: 25 });
+    let t8MdiVisible = false;
+    try {
+      await page.locator('[data-testid="ic-icon-mdi:home"]').first().waitFor({ state: 'visible', timeout: 60000 });
+      t8MdiVisible = true;
+    } catch (e) { t8MdiVisible = false; }
+    check('T8-2a', 'typing "home" (debounced) shows search result mdi:home',
+      t8MdiVisible, `mdiHomeVisible=${t8MdiVisible}`, 'mdiHomeVisible=true');
+    const t8CountVisible = (await page.locator('[data-testid="ic-count"]').count()) > 0
+      && await page.locator('[data-testid="ic-count"]').first().isVisible().catch(() => false);
+    check('T8-2b', 'search mode shows the results count (browse mode has none)',
+      t8CountVisible, `icCountVisible=${t8CountVisible}`, 'icCountVisible=true');
+
+    // ---- T8-3 (R5.3): empty results show the explanatory empty state ----
+    const T8_GIBBERISH = 'zzzqqqxxyy-noicon';
+    await t8SearchBox.click();
+    await page.keyboard.press('ControlOrMeta+a');
+    await page.keyboard.type(T8_GIBBERISH, { delay: 25 });
+    let t8EmptyVisible = false;
+    try {
+      await page.locator('[data-testid="ic-empty-state"]').first().waitFor({ state: 'visible', timeout: 60000 });
+      t8EmptyVisible = true;
+    } catch (e) { t8EmptyVisible = false; }
+    const t8EmptyText = t8EmptyVisible
+      ? (await page.locator('[data-testid="ic-empty-state"]').first().textContent() || '') : '';
+    const t8GridAfterEmpty = await page.locator('[data-testid="ic-grid"]').count();
+    check('T8-3a', 'empty search shows the explanatory empty state naming the query',
+      t8EmptyVisible && t8EmptyText.includes(T8_GIBBERISH)
+        && t8EmptyText.includes('Coba kata kunci lain dalam bahasa Inggris'),
+      `visible=${t8EmptyVisible} text=${JSON.stringify(t8EmptyText)}`,
+      `visible=true text includes "${T8_GIBBERISH}" + "Coba kata kunci lain dalam bahasa Inggris"`);
+    check('T8-3b', 'empty search shows no icon grid',
+      t8GridAfterEmpty === 0, `icGridCount=${t8GridAfterEmpty}`, 'icGridCount=0');
+    // Clear the query so the panel returns to browse mode, then close it:
+    // Task 6 below assumes the panel starts closed (openPanel toggles).
+    await t8SearchBox.click();
+    await page.keyboard.press('ControlOrMeta+a');
+    await page.keyboard.press('Backspace');
+    let t8BrowseBack = false;
+    try {
+      await page.locator('[data-testid="ic-grid"]').first().waitFor({ state: 'visible', timeout: 60000 });
+      t8BrowseBack = true;
+    } catch (e) { t8BrowseBack = false; }
+    await page.locator('[data-testid="ic-close"]').click();
+    await panel.waitFor({ state: 'hidden', timeout: 10000 });
+    check('T8-3c', 'clearing the query returns to the browse grid and the panel closes cleanly',
+      t8BrowseBack && !(await panelVisible()),
+      `browseGridBack=${t8BrowseBack} panelVisible=${await panelVisible()}`,
+      'browseGridBack=true panelVisible=false');
+
     // ================= Task 6 (insert flow) =================
     // Active style (shapeSty) derives from the accent (see PREFS note).
     const ACTIVE_FILL = '#0000ff';
@@ -609,7 +700,7 @@
     check('P7', '0 pageerror', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');
 
     const failed = results.filter(r => !r.pass);
-    console.log(`\nPROBE-ICONIFY-T6: ${results.length - failed.length}/${results.length} lolos`
+    console.log(`\nPROBE-ICONIFY-T8: ${results.length - failed.length}/${results.length} lolos`
       + (failed.length ? ` | GAGAL: ${failed.map(f => f.id).join(', ')}` : ' | SEMUA LOLOS'));
     process.exitCode = failed.length ? 1 : 0;
   } finally {

--- Diff: probe-iconify-offline.cjs ---
--- probes/probe-iconify-offline.cjs.bak-iconify-t8	2026-11-15 03:23:56.330872936 +0000
+++ probes/probe-iconify-offline.cjs	2026-11-15 03:24:13.170804314 +0000
@@ -15,6 +15,11 @@
  *     pesan per-set untuk material-symbols, klik recent mdi:home
  *     menampilkan toast per-set 'Perlu internet untuk memuat set ikon "mdi"'
  *     dan membuat nol objek (kegagalan per-host independen, Task 2 A4).
+ *   Task 8 (T8-5, review minor M1 Task 7): hanya endpoint /search API
+ *   diblokir — kegagalan fetch cari menampilkan `ic-error` dengan copy
+ *   verbatim "Perlu internet untuk mencari ikon" tetapi TIDAK membalik
+ *   `netStatus` ke 'offline' (tidak ada `ic-offline`, grid telusur kembali
+ *   sesudah query dibersihkan).
  *
  *   Blokir = Playwright route abort per host (pola spike2:
  *   probe-iconify-spike2.cjs) — stand-in untuk offline; fetch() menolak
@@ -368,12 +373,75 @@
       'perSetToast=true before=0 after=0');
     await pageB.close();
 
+    // ================= Page C: hanya endpoint /search API diblokir (T8-5, M1) =================
+    // Review minor M1 (Task 7): a search-fetch failure sets `ic-error`
+    // with the verbatim copy "Perlu internet untuk mencari ikon" but does
+    // NOT flip `netStatus` to 'offline'. Assert the ACTUAL behavior: the
+    // error copy is shown, `ic-offline` never appears, and clearing the
+    // query returns to the browse grid (panel still online).
+    const pageC = await ctx.newPage();
+    pageC.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
+    await pageC.route('**/api.iconify.design/search**', r => r.abort());
+    await pageC.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
+    const emptyBtnC = pageC.locator('button:has-text("Create New Project")').first();
+    try {
+      await emptyBtnC.waitFor({ state: 'visible', timeout: 60000 });
+      await emptyBtnC.click();
+    } catch (e) {
+      await pageC.locator('button:has-text("Create New")').first().click();
+      const createOpen = pageC.locator('button:has-text("Buat & Buka Proyek")').first();
+      await createOpen.waitFor({ state: 'visible', timeout: 30000 });
+      await createOpen.click();
+    }
+    await pageC.waitForSelector('.fig-nav-dock', { state: 'attached', timeout: 60000 });
+    await pageC.waitForFunction(
+      () => window.__geovantaEditorApi && typeof window.__geovantaEditorApi.loadTestSvg === 'function',
+      { timeout: 30000 },
+    );
+    await pageC.waitForSelector('.fig-floating-bar', { state: 'visible', timeout: 30000 });
+    const toolBtnC = pageC.locator('.fig-floating-bar [data-tip="veIconify"]');
+    const panelC = pageC.locator('[data-testid="ic-panel"]');
+    await toolBtnC.click();
+    await panelC.waitFor({ state: 'visible', timeout: 15000 });
+    // Panel must be online: browse grid loads (/collections + CDN alive).
+    await pageC.locator('[data-testid="ic-grid"]').first().waitFor({ state: 'visible', timeout: 60000 });
+    const searchBoxC = pageC.locator('[data-testid="ic-search"] [data-custom-input]');
+    await searchBoxC.click();
+    await pageC.keyboard.type('home', { delay: 25 });
+    let searchErrText = '';
+    try {
+      await pageC.locator('[data-testid="ic-error"]').first().waitFor({ state: 'visible', timeout: 30000 });
+      searchErrText = (await pageC.locator('[data-testid="ic-error"]').first().textContent()) || '';
+    } catch (e) { searchErrText = ''; }
+    const offlineOnC = (await pageC.locator('[data-testid="ic-offline"]').count()) > 0
+      && await pageC.locator('[data-testid="ic-offline"]').first().isVisible().catch(() => false);
+    check('T8-5a', 'search-fetch fails: ic-error shows verbatim offline copy, panel does NOT flip to offline state',
+      searchErrText.includes('Perlu internet untuk mencari ikon') && offlineOnC === false,
+      `icError=${JSON.stringify(searchErrText)} icOfflineShown=${offlineOnC}`,
+      'icError="Perlu internet untuk mencari ikon" icOfflineShown=false');
+    // Clearing the query returns to browse (panel still online).
+    await searchBoxC.click();
+    await pageC.keyboard.press('ControlOrMeta+a');
+    await pageC.keyboard.press('Backspace');
+    let browseBackC = false;
+    try {
+      await pageC.locator('[data-testid="ic-grid"]').first().waitFor({ state: 'visible', timeout: 30000 });
+      browseBackC = true;
+    } catch (e) { browseBackC = false; }
+    const offlineAfterClearC = (await pageC.locator('[data-testid="ic-offline"]').count()) > 0
+      && await pageC.locator('[data-testid="ic-offline"]').first().isVisible().catch(() => false);
+    check('T8-5b', 'after clearing the failed search the browse grid returns (panel still online)',
+      browseBackC && offlineAfterClearC === false,
+      `browseGridBack=${browseBackC} icOfflineShown=${offlineAfterClearC}`,
+      'browseGridBack=true icOfflineShown=false');
+    await pageC.close();
+
     // ---- E1: 0 pageerror ----
     check('E1', '0 pageerror selama probe', pageErrors.length === 0,
       JSON.stringify(pageErrors), '[]');
 
     const failed = results.filter(r => !r.pass);
-    console.log(`\nPROBE-ICONIFY-OFFLINE-T7: ${results.length - failed.length}/${results.length} lolos`
+    console.log(`\nPROBE-ICONIFY-OFFLINE-T8: ${results.length - failed.length}/${results.length} lolos`
       + (failed.length ? ` | GAGAL: ${failed.map(f => f.id).join(', ')}` : ' | SEMUA LOLOS'));
     process.exitCode = failed.length ? 1 : 0;
   } catch (e) {

--- Summary (per report) ---
probe-iconify.cjs: +7 checks (T8-1, T8-2a/b, T8-3a/b/c, T8-4) — 43/43 -> 50/50
probe-iconify-offline.cjs: +2 checks (T8-5a/b, new Page C) — 12/12 -> 14/14
Full gate: npm test 299/299 (twice), build exit 0, both probes 0 pageerror.
Fix rounds: 0 of max 2. Zero defects exposed.
