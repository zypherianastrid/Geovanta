# Review package — Task 1: Spike 1 (CDN → parseSVG → canvas)

BASE: pre-Task 1 state (no src/ changes in this task; baseline npm test 277/277).
HEAD: Task 1 as reported (probe + report + 5 screenshots).

## Files changed

- NEW `probes/probe-iconify-spike1.cjs` (489 lines, sha256 f049bfa2430894dc37b95bae3913a8c4c0e84f4fc5478690064115f35f345dc2)
- NEW `docs/superpowers/plans/sdd-2026-11-15-iconify/task-1-report.md` (sha256 760f6146f38f87db56b5896a58005b9acda62294a9509c5a72ca2f570d7510f4)
- NEW `probes/shots/spike1-{mdi-home,mdi-home-recolor,tabler-home,multi,multi-recolor}.png` (5 screenshots)
- MODIFIED: none (no src/ changes; verified by implementer)

## Full diff (new files in full)

### probes/probe-iconify-spike1.cjs
```javascript
/**
 * @file probes/probe-iconify-spike1.cjs
 * @description Spike 1 (Iconify) — THROWAWAY probe, no product code.
 *   Proves (or disproves) in the real browser that icons fetched from the
 *   jsDelivr CDN (`@iconify-json` set JSON) go through the existing
 *   `VE.parseSVG` (via `window.__geovantaEditorApi.loadTestSvg`) into
 *   canvas objects, including a multi-element icon and a Fill/Stroke
 *   recolor check via the real inspector panel.
 *
 *   Icons (exact, from the plan):
 *   - `mdi:home` (fill-based, 1 path, fill="currentColor")
 *   - `tabler:home` (stroke-based, 2 paths inside one <g>)
 *   - one multi-element icon found AT RUNTIME in the loaded tabler set
 *     data: first icon (JSON order) with >= 2 leaf shape elements AND at
 *     least one non-path leaf (circle/rect/...). Its name + counts are
 *     recorded in the output — Tasks 3 and 6 depend on them.
 *
 *   Scaling method (probe-side, recorded): the product insert (Task 6)
 *   will scale parsed objects to 96x96 with VE.scaleObj, which is NOT
 *   exposed on window — only `loadTestSvg`/`getDoc` are. The probe
 *   therefore applies the identical affine scale inside the SVG string:
 *   `<svg viewBox="0 0 96 96"><g transform="scale(96/vb)">body</g></svg>`,
 *   so parseSVG itself bakes the scale into the geometry. The bbox
 *   assertion then measures real object node coordinates (not the
 *   viewBox) and checks the scaled tight bbox equals the native tight
 *   bbox x (96/vb) on every edge — the artwork does NOT fill the whole
 *   viewBox (e.g. mdi:home spans only 20x17 of 24x24), so "96x96
 *   insert size" means the 24-unit frame scaled to 96, not a 96x96
 *   tight bbox. A native-size load of each icon is measured first as
 *   the control for that comparison.
 *
 *   Recolor method (probe-side, real panel): Ctrl+A to select all
 *   inserted objects, then type a hex value + Enter into the Fill /
 *   Stroke ColorText custom input (`[data-tip="veFill"|"veStroke"]
 *   [data-testid="color-text"] [data-custom-input]`), exactly as a user
 *   would. The verdict reads the fill/stroke back from `getDoc()`.
 *
 * Usage: SPIKE1_URL=http://127.0.0.1:9031/ node probes/probe-iconify-spike1.cjs
 *   (serve web/ first: `cd web && python3 -m http.server 9031`)
 *   screenshots -> probes/shots/spike1-*.png
 *   exit 0 when all assertions pass, 1 otherwise.
 *
 *   Egress proxy (VM-only scaffolding, NOT product behavior): this VM
 *   reaches the public internet only through the egress proxy in
 *   HTTPS_PROXY/HTTP_PROXY, and headless Chromium's direct CONNECT to
 *   that proxy is rejected with `HTTP/1.1 403 Forbidden` (JSON, 81
 *   bytes) — reproduced twice and captured in a Chromium net log —
 *   while byte-identical CONNECTs from curl/python/Node succeed
 *   (tested: UA, auth, IPv4/IPv6, exact request bytes — none of them
 *   is the trigger). The probe therefore starts a tiny loopback
 *   CONNECT relay (in-process, below): the browser still performs the
 *   real `fetch()` to cdn.jsdelivr.net, so CORS/TLS semantics are
 *   end-to-end; the relay only forwards CONNECT bytes issued by Node.
 *   The egress proxy also MITMs TLS with a custom CA (curl/Node trust
 *   it via /etc/ssl/certs; headless Chromium does not), so the probe
 *   launches Chromium with `--ignore-certificate-errors` — probe-only,
 *   never a product flag. If no env proxy is set (direct internet),
 *   the relay is skipped. The relay never logs credentials.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { chromium } = require('/home/hatch/workspace/vector-editor/node_modules/playwright-core');

const BASE_URL = process.env.SPIKE1_URL || 'http://127.0.0.1:9031/';
const SHOT_DIR = path.join(__dirname, 'shots');
const PREFS = JSON.stringify({
  theme: 'light', motion: 'system', tips: true, persist: true,
  accent: '#0d99ff', m3White: true, lang: 'id', recentColors: [],
});

const CDI_MDI = 'https://cdn.jsdelivr.net/npm/@iconify-json/mdi/icons.json';
const CDI_TABLER = 'https://cdn.jsdelivr.net/npm/@iconify-json/tabler/icons.json';
const FILL_HEX = '#E60000';
const STROKE_HEX = '#0066FF';

const results = [];
function check(id, label, pass, actual, expected) {
  results.push({ id, label, pass, actual, expected });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${label} | actual=${actual} expected=${expected}`);
}
function info(label, value) { console.log(`  info ${label}: ${value}`); }

(async () => {
  const pageErrors = [];
  let relay = null; // loopback CONNECT relay (see header note); null = direct
  let browser = null;
  // Start the relay FIRST if this VM needs the egress proxy: Chromium's
  // own CONNECT to the egress proxy is 403-rejected (see header note),
  // while the same bytes issued by Node succeed. The relay only
  // forwards bytes; the browser still performs the real fetch().
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
    // --ignore-certificate-errors: probe-only. The VM egress proxy MITMs
    // TLS with a custom CA that headless Chromium does not trust
    // (curl/Node trust it via /etc/ssl/certs). Never a product flag.
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

    // ---- Step A: fetch both set JSONs IN THE BROWSER (real fetch/CORS) ----
    const sets = await page.evaluate(async ({ mdiUrl, tablerUrl }) => {
      const leafRe = /<(path|circle|rect|ellipse|polygon|polyline|line)\b/g;
      const load = async (url) => {
        const t0 = performance.now();
        const r = await fetch(url);
        const ms = Math.round(performance.now() - t0);
        if (!r.ok) throw new Error(`fetch ${url} -> HTTP ${r.status}`);
        const j = await r.json();
        return { ok: r.ok, status: r.status, ms, bytes: JSON.stringify(j).length, data: j };
      };
      const mdi = await load(mdiUrl);
      const tabler = await load(tablerUrl);
      const pick = (set, name) => {
        const ic = set.data.icons[name];
        if (!ic) throw new Error(`icon ${name} not in set`);
        const leaves = (ic.body.match(leafRe) || []).map(s => s.slice(1));
        return {
          name, body: ic.body,
          vbW: ic.width || set.data.width || 24,
          vbH: ic.height || set.data.height || 24,
          leafTags: leaves, leafCount: leaves.length,
        };
      };
      // Multi-element icon: first in JSON order with >=2 leaf shapes AND
      // at least one non-path leaf (circle/rect/...). Deterministic.
      let multi = null;
      for (const [nm, ic] of Object.entries(tabler.data.icons)) {
        const leaves = ((ic.body || '').match(leafRe) || []).map(s => s.slice(1));
        if (leaves.length >= 2 && leaves.some(t => t !== 'path')) {
          multi = {
            name: 'tabler:' + nm, body: ic.body,
            vbW: ic.width || tabler.data.width || 24,
            vbH: ic.height || tabler.data.height || 24,
            leafTags: leaves, leafCount: leaves.length,
          };
          break;
        }
      }
      if (!multi) throw new Error('no multi-element icon found in tabler set');
      return {
        mdiFetch: { status: mdi.status, ms: mdi.ms, bytes: mdi.bytes, icons: Object.keys(mdi.data.icons).length },
        tablerFetch: { status: tabler.status, ms: tabler.ms, bytes: tabler.bytes, icons: Object.keys(tabler.data.icons).length },
        mdiHome: pick(mdi, 'home'),
        tablerHome: pick(tabler, 'home'),
        multi,
      };
    }, { mdiUrl: CDI_MDI, tablerUrl: CDI_TABLER });

    info('CDN mdi icons.json', JSON.stringify(sets.mdiFetch));
    info('CDN tabler icons.json', JSON.stringify(sets.tablerFetch));
    check('C0', 'both icons.json fetch OK in the real browser (HTTP 200)',
      sets.mdiFetch.status === 200 && sets.tablerFetch.status === 200,
      `mdi=${sets.mdiFetch.status} tabler=${sets.tablerFetch.status}`, 'mdi=200 tabler=200');
    info('mdi:home', `leafTags=${JSON.stringify(sets.mdiHome.leafTags)} vb=${sets.mdiHome.vbW}x${sets.mdiHome.vbH}`);
    info('tabler:home', `leafTags=${JSON.stringify(sets.tablerHome.leafTags)} vb=${sets.tablerHome.vbW}x${sets.tablerHome.vbH}`);
    info('MULTI icon (runtime pick)', `${sets.multi.name} leafTags=${JSON.stringify(sets.multi.leafTags)} leafCount=${sets.multi.leafCount} vb=${sets.multi.vbW}x${sets.multi.vbH}`);
    info('MULTI body (first 300 chars)', JSON.stringify(sets.multi.body.slice(0, 300)));

    const loadIcon = async (icon, scaleTo96, label) => {
      const s = scaleTo96 ? 96 / icon.vbW : 1;
      const vb = scaleTo96 ? 96 : icon.vbW;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">`
        + `<g transform="scale(${s})">${icon.body}</g></svg>`;
      await page.evaluate(({ svgStr, lbl }) => {
        window.__geovantaEditorApi.loadTestSvg(svgStr, lbl);
      }, { svgStr: svg, lbl: label });
      await page.waitForTimeout(900); // React commit + fitView rAF + draw
      return page.evaluate(() => {
        const d = window.__geovantaEditorApi.getDoc();
        const bboxOf = (o) => {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
          const take = (x, y) => {
            if (Number.isFinite(x) && Number.isFinite(y)) {
              if (x < x0) x0 = x; if (y < y0) y0 = y;
              if (x > x1) x1 = x; if (y > y1) y1 = y; n++;
            }
          };
          for (const sp of (o.subs || [])) for (const nd of (sp.nodes || [])) {
            take(nd.x, nd.y);
            if (nd.in) take(nd.in.x, nd.in.y);
            if (nd.out) take(nd.out.x, nd.out.y);
          }
          return n ? { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 } : null;
        };
        const objs = (d.objects || []).map(o => ({
          id: o.id, name: o.name, group: o.group ?? null,
          fill: o.fill ?? null, stroke: o.stroke ?? null, sw: o.sw ?? null,
          subs: (o.subs || []).length,
          nodes: (o.subs || []).reduce((a, sp) => a + (sp.nodes || []).length, 0),
          bbox: bboxOf(o),
        }));
        let u = null;
        for (const o of objs) {
          if (!o.bbox) continue;
          u = u ? {
            x0: Math.min(u.x0, o.bbox.x0), y0: Math.min(u.y0, o.bbox.y0),
            x1: Math.max(u.x1, o.bbox.x1), y1: Math.max(u.y1, o.bbox.y1),
          } : { ...o.bbox };
        }
        if (u) { u.w = u.x1 - u.x0; u.h = u.y1 - u.y0; }
        return { viewBox: d.viewBox, objectCount: objs.length, unionBbox: u, objects: objs };
      });
    };

    const shot = async (name) => {
      const p = path.join(SHOT_DIR, name);
      fs.mkdirSync(SHOT_DIR, { recursive: true });
      const canvas = page.locator('.ved-scene-canvas').first();
      await canvas.screenshot({ path: p });
      console.log('screenshot: ' + p);
    };

    const selectAll = async () => {
      const canvas = page.locator('.ved-scene-canvas').first();
      const box = await canvas.boundingBox();
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(400);
    };

    const setColorViaPanel = async (tip, hex) => {
      const boxEl = page.locator(`[data-tip="${tip}"] [data-testid="color-text"] [data-custom-input]`).first();
      await boxEl.waitFor({ state: 'visible', timeout: 10000 });
      await boxEl.click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(hex, { delay: 30 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    };

    const readDocPaint = async () => page.evaluate(() => {
      const d = window.__geovantaEditorApi.getDoc();
      return (d.objects || []).map(o => ({
        name: o.name, group: o.group ?? null, fill: o.fill ?? null, stroke: o.stroke ?? null,
      }));
    });

    const readDocSummary = async () => page.evaluate(() => {
      const d = window.__geovantaEditorApi.getDoc();
      const bboxOf = (o) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
        const take = (x, y) => {
          if (Number.isFinite(x) && Number.isFinite(y)) {
            if (x < x0) x0 = x; if (y < y0) y0 = y;
            if (x > x1) x1 = x; if (y > y1) y1 = y; n++;
          }
        };
        for (const sp of (o.subs || [])) for (const nd of (sp.nodes || [])) {
          take(nd.x, nd.y);
          if (nd.in) take(nd.in.x, nd.in.y);
          if (nd.out) take(nd.out.x, nd.out.y);
        }
        return n ? { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 } : null;
      };
      const objs = (d.objects || []).map(o => ({
        name: o.name, group: o.group ?? null, fill: o.fill ?? null, stroke: o.stroke ?? null, bbox: bboxOf(o),
      }));
      let u = null;
      for (const o of objs) {
        if (!o.bbox) continue;
        u = u ? {
          x0: Math.min(u.x0, o.bbox.x0), y0: Math.min(u.y0, o.bbox.y0),
          x1: Math.max(u.x1, o.bbox.x1), y1: Math.max(u.y1, o.bbox.y1),
        } : { ...o.bbox };
      }
      if (u) { u.w = u.x1 - u.x0; u.h = u.y1 - u.y0; }
      return { objectCount: objs.length, unionBbox: u, objects: objs };
    });

    const close = (v, t) => Math.abs(v - t) <= 1;
    // Scaled bbox must equal the native tight bbox multiplied by the
    // insert scale (96/vb) on every edge — the icon artwork does NOT
    // fill the whole viewBox, so "96x96" means the 24-unit frame
    // scaled to 96, not a 96x96 tight bbox.
    const scaledEq = (scaled, native, k) => !!scaled && !!native
      && close(scaled.x0, native.x0 * k) && close(scaled.y0, native.y0 * k)
      && close(scaled.x1, native.x1 * k) && close(scaled.y1, native.y1 * k);
    const fmtBbox = (b) => (b ? `${b.x0.toFixed(2)},${b.y0.toFixed(2)}–${b.x1.toFixed(2)},${b.y1.toFixed(2)} (${b.w.toFixed(2)}x${b.h.toFixed(2)})` : 'null');

    // ---- Step B0: control — mdi:home at NATIVE size (no scale wrapper) ----
    const mdiNative = await loadIcon(sets.mdiHome, false, 'spike1 mdi:home native');
    info('mdi:home native', `objects=${mdiNative.objectCount} unionBbox=${JSON.stringify(mdiNative.unionBbox)} viewBox=${JSON.stringify(mdiNative.viewBox)}`);
    check('M0', 'mdi:home native: 1 object, tight bbox inside the 24x24 viewBox (control: artwork does not fill the frame)',
      mdiNative.objectCount === 1 && mdiNative.unionBbox
        && mdiNative.unionBbox.x0 >= -1 && mdiNative.unionBbox.y0 >= -1
        && mdiNative.unionBbox.x1 <= 25 && mdiNative.unionBbox.y1 <= 25
        && mdiNative.unionBbox.w > 0 && mdiNative.unionBbox.h > 0,
      `objects=${mdiNative.objectCount} bbox=${fmtBbox(mdiNative.unionBbox)}`,
      'objects=1, 0<=bbox<=24');

    // ---- Step B1: mdi:home scaled to 96 ----
    const mdi96 = await loadIcon(sets.mdiHome, true, 'spike1 mdi:home 96');
    info('mdi:home 96', `objects=${mdi96.objectCount} unionBbox=${JSON.stringify(mdi96.unionBbox)} objs=${JSON.stringify(mdi96.objects.map(o => ({ name: o.name, group: o.group, fill: o.fill, stroke: o.stroke, subs: o.subs, nodes: o.nodes })))}`);
    await shot('spike1-mdi-home.png');
    check('S1', 'mdi:home inserts: 1 object; scaled bbox == native tight bbox x4 (96-unit frame)',
      mdi96.objectCount === 1 && scaledEq(mdi96.unionBbox, mdiNative.unionBbox, 4),
      `objects=${mdi96.objectCount} bbox=${fmtBbox(mdi96.unionBbox)}`,
      `objects=1 bbox=native x4 = ${fmtBbox(mdiNative.unionBbox)} x4`);

    // ---- Step C1: recolor mdi:home via real Fill panel ----
    const mdiFillBefore = await readDocPaint();
    info('mdi:home fill BEFORE recolor', JSON.stringify(mdiFillBefore));
    await selectAll();
    await setColorViaPanel('veFill', FILL_HEX);
    const mdiFillAfter = await readDocPaint();
    info('mdi:home fill AFTER Fill=' + FILL_HEX, JSON.stringify(mdiFillAfter));
    await shot('spike1-mdi-home-recolor.png');
    check('R1', 'mdi:home recolors via real Fill panel (all inserted paths change fill)',
      mdiFillAfter.length > 0 && mdiFillAfter.every(o => String(o.fill).toLowerCase() === FILL_HEX.toLowerCase()),
      JSON.stringify(mdiFillAfter.map(o => o.fill)), `all fill=${FILL_HEX}`);

    // ---- Step B2: tabler:home native + scaled to 96 ----
    const tabNative = await loadIcon(sets.tablerHome, false, 'spike1 tabler:home native');
    info('tabler:home native', `objects=${tabNative.objectCount} unionBbox=${JSON.stringify(tabNative.unionBbox)}`);
    const tab96 = await loadIcon(sets.tablerHome, true, 'spike1 tabler:home 96');
    info('tabler:home 96', `objects=${tab96.objectCount} unionBbox=${JSON.stringify(tab96.unionBbox)} objs=${JSON.stringify(tab96.objects.map(o => ({ name: o.name, group: o.group, fill: o.fill, stroke: o.stroke, sw: o.sw, subs: o.subs, nodes: o.nodes })))}`);
    await shot('spike1-tabler-home.png');
    check('S2', 'tabler:home inserts: 2 objects (2 paths in one <g>); scaled bbox == native tight bbox x4',
      tab96.objectCount === 2 && tab96.objectCount === tabNative.objectCount
        && scaledEq(tab96.unionBbox, tabNative.unionBbox, 4),
      `objects=${tab96.objectCount} (native ${tabNative.objectCount}) bbox=${fmtBbox(tab96.unionBbox)}`,
      `objects=2 bbox=native x4 = ${fmtBbox(tabNative.unionBbox)} x4`);

    // ---- Step C2: recolor tabler:home via real Stroke panel ----
    const tabBefore = await readDocPaint();
    info('tabler:home paint BEFORE recolor', JSON.stringify(tabBefore));
    await selectAll();
    await setColorViaPanel('veStroke', STROKE_HEX);
    const tabAfterStroke = await readDocPaint();
    info('tabler:home paint AFTER Stroke=' + STROKE_HEX, JSON.stringify(tabAfterStroke));
    check('R2', 'tabler:home recolors via real Stroke panel (all inserted paths change stroke)',
      tabAfterStroke.length > 0 && tabAfterStroke.every(o => String(o.stroke).toLowerCase() === STROKE_HEX.toLowerCase()),
      JSON.stringify(tabAfterStroke.map(o => o.stroke)), `all stroke=${STROKE_HEX}`);

    // ---- Step C2b: Fill on the stroke icon (observation, not verdict-critical) ----
    await setColorViaPanel('veFill', FILL_HEX);
    const tabAfterFill = await readDocPaint();
    info('tabler:home paint AFTER Fill=' + FILL_HEX + ' (observation)', JSON.stringify(tabAfterFill));
    check('R2b', 'tabler:home Fill panel also writes fill to stroke-based paths (observation)',
      tabAfterFill.length > 0 && tabAfterFill.every(o => String(o.fill).toLowerCase() === FILL_HEX.toLowerCase()),
      JSON.stringify(tabAfterFill.map(o => o.fill)), `all fill=${FILL_HEX}`);

    // ---- Step B3: multi-element icon native + scaled to 96 ----
    const multiNative = await loadIcon(sets.multi, false, 'spike1 ' + sets.multi.name + ' native');
    info('MULTI ' + sets.multi.name + ' native',
      `objects=${multiNative.objectCount} expectedLeafCount=${sets.multi.leafCount} unionBbox=${JSON.stringify(multiNative.unionBbox)}`);
    const multi96 = await loadIcon(sets.multi, true, 'spike1 ' + sets.multi.name + ' 96');
    info('MULTI ' + sets.multi.name + ' 96',
      `objects=${multi96.objectCount} expectedLeafCount=${sets.multi.leafCount} unionBbox=${JSON.stringify(multi96.unionBbox)} `
      + `objs=${JSON.stringify(multi96.objects.map(o => ({ name: o.name, group: o.group, fill: o.fill, stroke: o.stroke, subs: o.subs, nodes: o.nodes, bbox: o.bbox })))}`);
    await shot('spike1-multi.png');
    check('S3', `multi-element ${sets.multi.name}: shape count == element count in body (${sets.multi.leafCount}: ${JSON.stringify(sets.multi.leafTags)}); scaled bbox == native tight bbox x4`,
      multi96.objectCount === sets.multi.leafCount && multi96.objectCount === multiNative.objectCount
        && scaledEq(multi96.unionBbox, multiNative.unionBbox, 4),
      `objects=${multi96.objectCount} leafCount=${sets.multi.leafCount} bbox=${fmtBbox(multi96.unionBbox)}`,
      `objects=${sets.multi.leafCount} bbox=native x4 = ${fmtBbox(multiNative.unionBbox)} x4`);
    // OBSERVATION (not a verdict assertion): design §7.4 says a
    // multi-path icon enters as ONE group. parseSVG only assigns a
    // group name when the <g> has an id / opacity<1, and the icon's
    // <g> has neither — so the inserted objects carry group=null.
    // Task 6 must assign the group at insert time (importFiles shows
    // the pattern: caller-side group mapping, not parseSVG).
    const multiGroups = [...new Set(multi96.objects.map(o => o.group))];
    info('OBSERVE MULTI group values on inserted objects (design §7.4 wants ONE group; parseSVG gives none)', JSON.stringify(multiGroups));

    // ---- Step C3: recolor multi icon via real Fill panel ----
    const multiBefore = await readDocPaint();
    info('MULTI paint BEFORE recolor', JSON.stringify(multiBefore));
    await selectAll();
    await setColorViaPanel('veFill', FILL_HEX);
    const multiAfter = await readDocPaint();
    info('MULTI paint AFTER Fill=' + FILL_HEX, JSON.stringify(multiAfter));
    await shot('spike1-multi-recolor.png');
    check('R3', `${sets.multi.name} recolors via real Fill panel (ALL sub-paths change fill, incl. circle/rect primitive)`,
      multiAfter.length === sets.multi.leafCount
      && multiAfter.every(o => String(o.fill).toLowerCase() === FILL_HEX.toLowerCase()),
      JSON.stringify(multiAfter.map(o => o.fill)), `all ${sets.multi.leafCount} fill=${FILL_HEX}`);

    // ---- Step D: one Ctrl+Z undoes one insert (global constraint) ----
    // Fresh single-history-step insert (mdi:home scaled), then ONE
    // Ctrl+Z must restore exactly the previous doc (multi, recolored).
    const undoBefore = await readDocSummary();
    await loadIcon(sets.mdiHome, true, 'spike1 mdi:home 96 (undo probe)');
    const undoInserted = await readDocSummary();
    info('UNDO before Ctrl+Z (fresh mdi:home insert)', `objects=${undoInserted.objectCount} bbox=${fmtBbox(undoInserted.unionBbox)}`);
    const canvas = page.locator('.ved-scene-canvas').first();
    const cbox = await canvas.boundingBox();
    if (cbox) await page.mouse.click(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(600);
    const undoAfter = await readDocSummary();
    info('UNDO after 1x Ctrl+Z', `objects=${undoAfter.objectCount} bbox=${fmtBbox(undoAfter.unionBbox)} fills=${JSON.stringify(undoAfter.objects.map(o => o.fill))}`);
    check('U1', 'one Ctrl+Z undoes one insert (doc restored to pre-insert state)',
      undoInserted.objectCount === 1
        && undoAfter.objectCount === undoBefore.objectCount
        && JSON.stringify(undoAfter.unionBbox) === JSON.stringify(undoBefore.unionBbox)
        && undoAfter.objects.every(o => String(o.fill).toLowerCase() === FILL_HEX.toLowerCase()),
      `after=${undoAfter.objectCount} objs bbox=${fmtBbox(undoAfter.unionBbox)}`,
      `before=${undoBefore.objectCount} objs bbox=${fmtBbox(undoBefore.unionBbox)} all fill=${FILL_HEX}`);

    check('E1', '0 pageerror', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');

    const failed = results.filter(r => !r.pass);
    console.log(`\nSPIKE1: ${results.length - failed.length}/${results.length} lolos`
      + (failed.length ? ` | GAGAL: ${failed.map(f => f.id).join(', ')}` : ' | SEMUA LOLOS'));
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    if (browser) await browser.close();
    if (relay) await new Promise(r => relay.close(r));
  }
})().catch(e => { console.error('PROBE ERROR: ' + (e && e.stack || e)); process.exit(2); });
```
