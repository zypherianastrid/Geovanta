# Re-review package — Task 2 fix round 1/5

FIX_BASE: state the previous review saw — probe sha256 0a4bcebe3462832728cbee25cc183edd03e3ec76a260170a6804aa2468e6340b, report sha256 7255471694c0b6fb5c3210f26136e0b6575b290167f90770a9c69a87f57a0692.
HEAD: after fix round 1 — probe sha256 18fbd82a24b90c0103801b473d828f9085215a47da4f2b5312267c6a8f34f9db, report sha256 a75cf9a568342c32ab9739ce1bbe6c655d3824ee406ad7244b0967ca2875f38d.

## Files changed in this round

- MODIFIED `probes/probe-iconify-spike2.cjs` (fix diff below, vs pre-fix backup `probes/probe-iconify-spike2.cjs.bak-2026-11-15`)
- MODIFIED `docs/superpowers/plans/sdd-2026-11-15-iconify/task-2-report.md` (fix report appended under `## Fix round 1`)
- MODIFIED: nothing else (no src/ changes)

## Fix diff
```diff
--- probes/probe-iconify-spike2.cjs.bak-2026-11-15	2026-11-15 02:17:46.186232338 +0000
+++ probes/probe-iconify-spike2.cjs	2026-11-15 02:18:14.000780708 +0000
@@ -154,15 +154,22 @@
 
     // ---- A1: API search via real browser fetch() ----
     const searchOk = await page.evaluate(async (url) => {
-      const t0 = performance.now();
-      const r = await fetch(url);
-      const ms = Math.round(performance.now() - t0);
-      const j = await r.json();
-      return {
-        ok: r.ok, status: r.status, ms,
-        acao: r.headers.get('access-control-allow-origin'),
-        icons: j.icons, total: j.total, limit: j.limit,
-      };
+      try {
+        const t0 = performance.now();
+        const r = await fetch(url);
+        const ms = Math.round(performance.now() - t0);
+        const j = await r.json();
+        return {
+          threw: false,
+          ok: r.ok, status: r.status, ms,
+          acao: r.headers.get('access-control-allow-origin'),
+          icons: j.icons, total: j.total, limit: j.limit,
+        };
+      } catch (e) {
+        // Fix round 1: a CORS rejection or bad body must record a clean
+        // FAIL via check(), not crash the probe via the outer catch.
+        return { threw: true, name: e.name, message: e.message, string: String(e) };
+      }
     }, SEARCH_URL);
     info('API search', JSON.stringify(searchOk));
     // NOTE (corrected after run 1): two probe assumptions were wrong,
@@ -178,29 +185,36 @@
     // would make fetch() reject with TypeError. The CDN DOES send
     // `access-control-expose-headers: *`, so its ACAO is JS-readable.
     check('A1', 'API search fetch succeeds in the real browser (HTTP 200, body readable = CORS-clean)',
-      searchOk.ok && searchOk.status === 200 && Array.isArray(searchOk.icons)
+      searchOk.threw === false && searchOk.ok && searchOk.status === 200 && Array.isArray(searchOk.icons)
         && searchOk.icons.length >= 1 && searchOk.icons.includes('mdi:home'),
-      `status=${searchOk.status} ms=${searchOk.ms} acao(js-visible)=${searchOk.acao} icons=${searchOk.icons.length} total=${searchOk.total} limit(resp)=${searchOk.limit} includes mdi:home=${searchOk.icons.includes('mdi:home')}`,
+      `threw=${searchOk.threw} status=${searchOk.status} ms=${searchOk.ms} acao(js-visible)=${searchOk.acao} icons=${(searchOk.icons || []).length} total=${searchOk.total} limit(resp)=${searchOk.limit} includes mdi:home=${(searchOk.icons || []).includes('mdi:home')}`,
       'status=200 icons>=1 includes mdi:home');
 
     // ---- A2: CDN icons.json via real browser fetch() ----
     const cdnOk = await page.evaluate(async (url) => {
-      const t0 = performance.now();
-      const r = await fetch(url);
-      const ms = Math.round(performance.now() - t0);
-      const j = await r.json();
-      return {
-        ok: r.ok, status: r.status, ms,
-        acao: r.headers.get('access-control-allow-origin'),
-        prefix: j.prefix, iconCount: Object.keys(j.icons || {}).length,
-        hasHome: Boolean(j.icons && j.icons.home),
-      };
+      try {
+        const t0 = performance.now();
+        const r = await fetch(url);
+        const ms = Math.round(performance.now() - t0);
+        const j = await r.json();
+        return {
+          threw: false,
+          ok: r.ok, status: r.status, ms,
+          acao: r.headers.get('access-control-allow-origin'),
+          prefix: j.prefix, iconCount: Object.keys(j.icons || {}).length,
+          hasHome: Boolean(j.icons && j.icons.home),
+        };
+      } catch (e) {
+        // Fix round 1: same as A1 — a CORS rejection or bad body must
+        // record a clean FAIL via check(), not crash the probe.
+        return { threw: true, name: e.name, message: e.message, string: String(e) };
+      }
     }, CDI_MDI);
     info('CDN icons.json', JSON.stringify(cdnOk));
     check('A2', 'CDN icons.json fetch succeeds in the real browser (HTTP 200, CORS header present)',
-      cdnOk.ok && cdnOk.status === 200 && cdnOk.prefix === 'mdi'
+      cdnOk.threw === false && cdnOk.ok && cdnOk.status === 200 && cdnOk.prefix === 'mdi'
         && cdnOk.iconCount > 7000 && cdnOk.hasHome && cdnOk.acao === '*',
-      `status=${cdnOk.status} ms=${cdnOk.ms} acao=${cdnOk.acao} prefix=${cdnOk.prefix} icons=${cdnOk.iconCount} hasHome=${cdnOk.hasHome}`,
+      `threw=${cdnOk.threw} status=${cdnOk.status} ms=${cdnOk.ms} acao=${cdnOk.acao} prefix=${cdnOk.prefix} icons=${cdnOk.iconCount} hasHome=${cdnOk.hasHome}`,
       'status=200 acao=* prefix=mdi icons>7000 hasHome=true');
 
     // ---- A3: BOTH hosts blocked (route abort) — search must fail catchably, 0 objects ----
@@ -220,21 +234,27 @@
     info('A3 both-blocked search error (verbatim)', JSON.stringify(bothBlocked));
     info('A3 object count after failed search', String(countAfterA3));
     check('A3', 'both hosts blocked: search fails with a catchable error and no object is created',
-      bothBlocked.threw === true && typeof bothBlocked.message === 'string'
-        && bothBlocked.message.length > 0 && countAfterA3 === 0,
-      `threw=${bothBlocked.threw} ${bothBlocked.name}: ${bothBlocked.message} objects=${countAfterA3}`,
-      'threw=true, catchable error, objects=0');
+      bothBlocked.threw === true && bothBlocked.string === 'TypeError: Failed to fetch'
+        && countAfterA3 === 0,
+      `threw=${bothBlocked.threw} ${bothBlocked.string} objects=${countAfterA3}`,
+      'threw=true string="TypeError: Failed to fetch" objects=0');
     await page.unrouteAll({ behavior: 'wait' });
 
     // Sanity after unblocking: search works again (proves the abort, not the app, caused A3).
     const searchRecovered = await page.evaluate(async (url) => {
-      const r = await fetch(url);
-      return { ok: r.ok, status: r.status };
+      try {
+        const r = await fetch(url);
+        return { threw: false, ok: r.ok, status: r.status };
+      } catch (e) {
+        // Fix round 1: a failure here must record a clean FAIL via
+        // check(), not crash the probe via the outer catch.
+        return { threw: true, name: e.name, message: e.message, string: String(e) };
+      }
     }, SEARCH_URL);
     info('search after unblocking both hosts (sanity)', JSON.stringify(searchRecovered));
     check('A3b', 'sanity: search succeeds again after unblocking (abort caused A3, not the app)',
-      searchRecovered.ok && searchRecovered.status === 200,
-      `status=${searchRecovered.status}`, 'status=200');
+      searchRecovered.threw === false && searchRecovered.ok && searchRecovered.status === 200,
+      `threw=${searchRecovered.threw} status=${searchRecovered.status}`, 'status=200');
 
     // ---- A4: ONLY CDN blocked — simulated insert (R1) must fail catchably, 0 objects ----
     await page.route('**/cdn.jsdelivr.net/**', (route) => route.abort());
@@ -267,10 +287,10 @@
     info('A4 object count after failed insert', String(countAfterA4));
     check('A4', 'CDN-only blocked: simulated insert fails with a catchable error and no object is created',
       cdnBlockedInsert.threw === true && cdnBlockedInsert.inserted === false
-        && typeof cdnBlockedInsert.message === 'string' && cdnBlockedInsert.message.length > 0
+        && cdnBlockedInsert.string === 'TypeError: Failed to fetch'
         && countAfterA4 === 0,
-      `threw=${cdnBlockedInsert.threw} inserted=${cdnBlockedInsert.inserted} ${cdnBlockedInsert.name}: ${cdnBlockedInsert.message} searchStillOk=${cdnBlockedInsert.searchStillOk} objects=${countAfterA4}`,
-      'threw=true inserted=false, catchable error, objects=0');
+      `threw=${cdnBlockedInsert.threw} inserted=${cdnBlockedInsert.inserted} ${cdnBlockedInsert.string} searchStillOk=${cdnBlockedInsert.searchStillOk} objects=${countAfterA4}`,
+      'threw=true inserted=false string="TypeError: Failed to fetch" objects=0');
     await page.unrouteAll({ behavior: 'wait' });
 
     // Sanity after unblocking: the same simulated insert now succeeds (proves the abort caused A4).
```
