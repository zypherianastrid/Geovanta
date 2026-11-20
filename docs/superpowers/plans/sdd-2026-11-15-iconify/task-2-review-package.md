# Review package — Task 2: Spike 2 (CORS + offline)

BASE: pre-Task 2 state (Task 1 complete; no src/ changes in this task; baseline npm test 277/277).
HEAD: Task 2 as reported (probe + report).

## Files changed

- NEW `probes/probe-iconify-spike2.cjs` (306 lines, sha256 0a4bcebe3462832728cbee25cc183edd03e3ec76a260170a6804aa2468e6340b)
- NEW `docs/superpowers/plans/sdd-2026-11-15-iconify/task-2-report.md` (sha256 7255471694c0b6fb5c3210f26136e0b6575b290167f90770a9c69a87f57a0692)
- MODIFIED: none (no src/ changes; verified by implementer)

## Full diff (new files in full)

### probes/probe-iconify-spike2.cjs
```javascript
/**
 * @file probes/probe-iconify-spike2.cjs
 * @description Spike 2 (Iconify) — THROWAWAY probe, no product code.
 *   Proves (or disproves) in the real browser:
 *   - A1: GET https://api.iconify.design/search?query=home&limit=5
 *         succeeds via real browser fetch() (CORS-clean).
 *   - A2: GET https://cdn.jsdelivr.net/npm/@iconify-json/mdi/icons.json
 *         succeeds via real browser fetch() (CORS-clean).
 *   - A3: with BOTH hosts blocked (Playwright route abort), search
 *         fails with a catchable error and no object is created.
 *   - A4: with ONLY the CDN blocked, a probe-level simulated insert
 *         (coordinator ruling R1: fetch icons.json -> build SVG string
 *         -> VE.parseSVG via loadTestSvg -> insert attempt) fails with
 *         a catchable error and no object is created.
 *   Exact error strings are recorded verbatim — Tasks 3 and 7 reuse
 *   them for user-facing copy.
 *
 * Usage: SPIKE2_URL=http://127.0.0.1:9032/ node probes/probe-iconify-spike2.cjs
 *   (serve web/ first: `cd web && python3 -m http.server 9032`)
 *   exit 0 when all assertions pass, 1 otherwise.
 *
 *   Egress proxy (VM-only scaffolding, NOT product behavior): same
 *   situation as Spike 1 — headless Chromium's direct CONNECT to the
 *   egress proxy is rejected with `HTTP/1.1 403 Forbidden`, while
 *   byte-identical CONNECTs from curl/python/Node succeed. The probe
 *   therefore reuses Spike 1's in-process loopback CONNECT relay
 *   (probes/probe-iconify-spike1.cjs lines ~89-149): the browser still
 *   performs the real fetch() to both hosts, so CORS semantics are
 *   end-to-end; the relay only forwards CONNECT bytes issued by Node.
 *   The egress proxy also MITMs TLS with a custom CA (curl/Node trust
 *   it via /etc/ssl/certs; headless Chromium does not), so the probe
 *   launches Chromium with probe-only `--ignore-certificate-errors`.
 *   Consequence, recorded honestly: TLS certificate validation is
 *   DISABLED by that flag, so the TLS trust chain is NOT proven by
 *   this probe. What IS proven: CORS (a CORS rejection would make
 *   fetch() reject even with the flag) and the catchable offline
 *   failure behaviour. If no env proxy is set (direct internet),
 *   the relay is skipped. The relay never logs credentials.
 */
'use strict';

const path = require('path');
const http = require('http');
const net = require('net');
const { chromium } = require('/home/hatch/workspace/vector-editor/node_modules/playwright-core');

const BASE_URL = process.env.SPIKE2_URL || 'http://127.0.0.1:9032/';
const PREFS = JSON.stringify({
  theme: 'light', motion: 'system', tips: true, persist: true,
  accent: '#0d99ff', m3White: true, lang: 'id', recentColors: [],
});

const ICONIFY_API_BASE = 'https://api.iconify.design';
const ICONIFY_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@iconify-json';
const SEARCH_URL = `${ICONIFY_API_BASE}/search?query=home&limit=5`;
const CDI_MDI = `${ICONIFY_CDN_BASE}/mdi/icons.json`;

const results = [];
function check(id, label, pass, actual, expected) {
  results.push({ id, label, pass, actual, expected });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${label} | actual=${actual} expected=${expected}`);
}
function info(label, value) { console.log(`  info ${label}: ${value}`); }

const objectCount = (page) => page.evaluate(() => {
  const d = window.__geovantaEditorApi.getDoc();
  return (d.objects || []).length;
});

(async () => {
  const pageErrors = [];
  let relay = null;
  let browser = null;
  const envProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
  if (envProxy) {
    const u = new URL(envProxy);
    const egress = {
      host: u.hostname, port: Number(u.port) || 3128,
      auth: u.username
        ? 'Basic ' + Buffer.from(decodeURIComponent(u.username) + ':' + decodeURIComponent(u.password || '')).toString('base64')
        : null,
    };
    console.log(`  info egress proxy from env: yes (${egress.host}:${egress.port}, auth ${egress.auth ? 'present' : 'absent'} — values never logged)`);
    relay = await new Promise((resolve, reject) => {
      const srv = http.createServer();
      srv.on('connect', (req, clientSocket, head) => {
        const up = net.connect(egress.port, egress.host, () => {
          let out = `CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\nProxy-Connection: Keep-Alive\r\n`;
          if (egress.auth) out += `Proxy-Authorization: ${egress.auth}\r\n`;
          up.write(out + '\r\n');
        });
        let buf = Buffer.alloc(0), established = false;
        up.on('data', (chunk) => {
          if (established) return;
          buf = Buffer.concat([buf, chunk]);
          const idx = buf.indexOf('\r\n\r\n');
          if (idx === -1) return;
          const headPart = buf.subarray(0, idx).toString();
          const rest = buf.subarray(idx + 4);
          if (!/^HTTP\/1\.[01] 200/.test(headPart)) {
            clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
            up.destroy();
            return;
          }
          established = true;
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          if (head.length) up.write(head);
          if (rest.length) up.write(rest);
          up.pipe(clientSocket);
          clientSocket.pipe(up);
        });
        up.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => up.destroy());
      });
      srv.on('error', reject);
      srv.listen(0, '127.0.0.1', () => resolve(srv));
    });
    console.log(`  info CONNECT relay listening on 127.0.0.1:${relay.address().port}`);
  } else {
    console.log('  info egress proxy from env: no — direct connection');
  }
  browser = await chromium.launch({
    executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
    ...(relay ? { proxy: { server: `http://127.0.0.1:${relay.address().port}`, bypass: 'localhost,127.0.0.1' } } : {}),
  });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(p => {
      localStorage.setItem('trace-svg-settings-v1', p);
    }, PREFS);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const emptyBtn = page.locator('button:has-text("Create New Project")').first();
    const headerBtn = page.locator('button:has-text("Create New")').first();
    try {
      await emptyBtn.waitFor({ state: 'visible', timeout: 60000 });
      await emptyBtn.click();
    } catch (e) {
      await headerBtn.waitFor({ state: 'visible', timeout: 30000 });
      await headerBtn.click();
      const createOpen = page.locator('button:has-text("Buat & Buka Proyek")').first();
      await createOpen.waitFor({ state: 'visible', timeout: 30000 });
      await createOpen.click();
    }
    await page.waitForSelector('.fig-nav-dock', { state: 'attached', timeout: 60000 });
    await page.waitForFunction(
      () => window.__geovantaEditorApi && typeof window.__geovantaEditorApi.loadTestSvg === 'function',
      { timeout: 30000 },
    );
    info('baseline object count (fresh project)', String(await objectCount(page)));

    // ---- A1: API search via real browser fetch() ----
    const searchOk = await page.evaluate(async (url) => {
      const t0 = performance.now();
      const r = await fetch(url);
      const ms = Math.round(performance.now() - t0);
      const j = await r.json();
      return {
        ok: r.ok, status: r.status, ms,
        acao: r.headers.get('access-control-allow-origin'),
        icons: j.icons, total: j.total, limit: j.limit,
      };
    }, SEARCH_URL);
    info('API search', JSON.stringify(searchOk));
    // NOTE (corrected after run 1): two probe assumptions were wrong,
    // not the API. (1) The API does NOT honour limit<32: it returns
    // limit=32 / all 32 matches for limit=1,2,5 (verified via curl;
    // limit=48 IS honoured). So the assertion is ">=1 icon, includes
    // mdi:home", not "exactly 5". (2) The API sends
    // `access-control-allow-origin: *` (verified via curl response
    // headers) but does NOT send `access-control-expose-headers`, so
    // JS `headers.get()` returns null — that null means "not exposed
    // to JS", not "CORS blocked". The CORS proof is that fetch()
    // resolved and the body was readable at all: a CORS rejection
    // would make fetch() reject with TypeError. The CDN DOES send
    // `access-control-expose-headers: *`, so its ACAO is JS-readable.
    check('A1', 'API search fetch succeeds in the real browser (HTTP 200, body readable = CORS-clean)',
      searchOk.ok && searchOk.status === 200 && Array.isArray(searchOk.icons)
        && searchOk.icons.length >= 1 && searchOk.icons.includes('mdi:home'),
      `status=${searchOk.status} ms=${searchOk.ms} acao(js-visible)=${searchOk.acao} icons=${searchOk.icons.length} total=${searchOk.total} limit(resp)=${searchOk.limit} includes mdi:home=${searchOk.icons.includes('mdi:home')}`,
      'status=200 icons>=1 includes mdi:home');

    // ---- A2: CDN icons.json via real browser fetch() ----
    const cdnOk = await page.evaluate(async (url) => {
      const t0 = performance.now();
      const r = await fetch(url);
      const ms = Math.round(performance.now() - t0);
      const j = await r.json();
      return {
        ok: r.ok, status: r.status, ms,
        acao: r.headers.get('access-control-allow-origin'),
        prefix: j.prefix, iconCount: Object.keys(j.icons || {}).length,
        hasHome: Boolean(j.icons && j.icons.home),
      };
    }, CDI_MDI);
    info('CDN icons.json', JSON.stringify(cdnOk));
    check('A2', 'CDN icons.json fetch succeeds in the real browser (HTTP 200, CORS header present)',
      cdnOk.ok && cdnOk.status === 200 && cdnOk.prefix === 'mdi'
        && cdnOk.iconCount > 7000 && cdnOk.hasHome && cdnOk.acao === '*',
      `status=${cdnOk.status} ms=${cdnOk.ms} acao=${cdnOk.acao} prefix=${cdnOk.prefix} icons=${cdnOk.iconCount} hasHome=${cdnOk.hasHome}`,
      'status=200 acao=* prefix=mdi icons>7000 hasHome=true');

    // ---- A3: BOTH hosts blocked (route abort) — search must fail catchably, 0 objects ----
    await page.route('**/api.iconify.design/**', (route) => route.abort());
    await page.route('**/cdn.jsdelivr.net/**', (route) => route.abort());
    const bothBlocked = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url);
        const j = await r.json().catch(() => null);
        return { threw: false, status: r.status, icons: j && j.icons ? j.icons.length : null };
      } catch (e) {
        // Verbatim error — Tasks 3 and 7 reuse these strings.
        return { threw: true, name: e.name, message: e.message, string: String(e) };
      }
    }, SEARCH_URL);
    const countAfterA3 = await objectCount(page);
    info('A3 both-blocked search error (verbatim)', JSON.stringify(bothBlocked));
    info('A3 object count after failed search', String(countAfterA3));
    check('A3', 'both hosts blocked: search fails with a catchable error and no object is created',
      bothBlocked.threw === true && typeof bothBlocked.message === 'string'
        && bothBlocked.message.length > 0 && countAfterA3 === 0,
      `threw=${bothBlocked.threw} ${bothBlocked.name}: ${bothBlocked.message} objects=${countAfterA3}`,
      'threw=true, catchable error, objects=0');
    await page.unrouteAll({ behavior: 'wait' });

    // Sanity after unblocking: search works again (proves the abort, not the app, caused A3).
    const searchRecovered = await page.evaluate(async (url) => {
      const r = await fetch(url);
      return { ok: r.ok, status: r.status };
    }, SEARCH_URL);
    info('search after unblocking both hosts (sanity)', JSON.stringify(searchRecovered));
    check('A3b', 'sanity: search succeeds again after unblocking (abort caused A3, not the app)',
      searchRecovered.ok && searchRecovered.status === 200,
      `status=${searchRecovered.status}`, 'status=200');

    // ---- A4: ONLY CDN blocked — simulated insert (R1) must fail catchably, 0 objects ----
    await page.route('**/cdn.jsdelivr.net/**', (route) => route.abort());
    const cdnBlockedInsert = await page.evaluate(async ({ cdnUrl, searchUrl }) => {
      // Isolation check: API search still works while the CDN is blocked.
      let searchStillOk = null;
      try {
        const rs = await fetch(searchUrl);
        searchStillOk = rs.ok && rs.status === 200;
      } catch (e) { searchStillOk = false; }
      // Simulated insert (R1): fetch icons.json -> build SVG -> parseSVG -> insert.
      // loadTestSvg is called ONLY on fetch success, so a fetch failure
      // must leave the document untouched.
      try {
        const r = await fetch(cdnUrl);
        if (!r.ok) throw new Error(`fetch ${cdnUrl} -> HTTP ${r.status}`);
        const j = await r.json();
        const ic = j.icons.home;
        if (!ic) throw new Error('icon home not in set');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${ic.body}</svg>`;
        window.__geovantaEditorApi.loadTestSvg(svg, 'spike2 mdi:home');
        return { threw: false, inserted: true, searchStillOk };
      } catch (e) {
        return { threw: true, inserted: false, searchStillOk, name: e.name, message: e.message, string: String(e) };
      }
    }, { cdnUrl: CDI_MDI, searchUrl: SEARCH_URL });
    await page.waitForTimeout(600);
    const countAfterA4 = await objectCount(page);
    info('A4 CDN-blocked insert error (verbatim)', JSON.stringify(cdnBlockedInsert));
    info('A4 object count after failed insert', String(countAfterA4));
    check('A4', 'CDN-only blocked: simulated insert fails with a catchable error and no object is created',
      cdnBlockedInsert.threw === true && cdnBlockedInsert.inserted === false
        && typeof cdnBlockedInsert.message === 'string' && cdnBlockedInsert.message.length > 0
        && countAfterA4 === 0,
      `threw=${cdnBlockedInsert.threw} inserted=${cdnBlockedInsert.inserted} ${cdnBlockedInsert.name}: ${cdnBlockedInsert.message} searchStillOk=${cdnBlockedInsert.searchStillOk} objects=${countAfterA4}`,
      'threw=true inserted=false, catchable error, objects=0');
    await page.unrouteAll({ behavior: 'wait' });

    // Sanity after unblocking: the same simulated insert now succeeds (proves the abort caused A4).
    const insertRecovered = await page.evaluate(async (cdnUrl) => {
      try {
        const r = await fetch(cdnUrl);
        if (!r.ok) throw new Error(`fetch -> HTTP ${r.status}`);
        const j = await r.json();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${j.icons.home.body}</svg>`;
        window.__geovantaEditorApi.loadTestSvg(svg, 'spike2 mdi:home recovered');
        return { threw: false, inserted: true };
      } catch (e) {
        return { threw: true, inserted: false, name: e.name, message: e.message };
      }
    }, CDI_MDI);
    await page.waitForTimeout(900);
    const countAfterRecovery = await objectCount(page);
    info('insert after unblocking CDN (sanity)', JSON.stringify({ ...insertRecovered, objects: countAfterRecovery }));
    check('A4b', 'sanity: same simulated insert succeeds after unblocking (abort caused A4, not the parser)',
      insertRecovered.threw === false && insertRecovered.inserted === true && countAfterRecovery === 1,
      `inserted=${insertRecovered.inserted} objects=${countAfterRecovery}`, 'inserted=true objects=1');

    check('E1', '0 pageerror', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');

    const failed = results.filter(r => !r.pass);
    console.log(`\nSPIKE2: ${results.length - failed.length}/${results.length} lolos`
      + (failed.length ? ` | GAGAL: ${failed.map(f => f.id).join(', ')}` : ' | SEMUA LOLOS'));
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    if (browser) await browser.close();
    if (relay) await new Promise(r => relay.close(r));
  }
})().catch(e => { console.error('PROBE ERROR: ' + (e && e.stack || e)); process.exit(2); });
```
