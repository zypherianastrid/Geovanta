'use strict';
// Probe buka/tutup modal Iconify — Task 3 plan "Iconify Pindah ke Modal
// Popup" (subset M1–M5; Task 5 melengkapi suite + regresi probe lama).
//   M1 modal terbuka dari tombol floating bar ([data-testid="ic-modal"]
//      visible, [data-testid="ic-panel"] di dalamnya)
//   M2 tombol X menutup
//   M3 Esc menutup
//   M4 klik backdrop menutup
//   M5 klik backdrop saat dropdown .flt terbuka -> modal TETAP terbuka
//      (guard Q4, sama seperti handler Esc panel); dropdown sendiri
//      tertutup oleh outside-click, dan klik backdrop kedua menutup modal
//   RF4 (Review Focus #4): sesudah modal tertutup penuh, tidak ada fetch
//      Iconify baru (api.iconify.design / cdn.jsdelivr.net) selama 2,5 dtk
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
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { chromium } = require('/home/hatch/workspace/vector-editor/node_modules/playwright-core');

const BASE_URL = process.env.PROBE_THUMB_URL || 'http://127.0.0.1:9041/';
const SHOT_DIR = path.join(__dirname, 'shots');
const PREFS = JSON.stringify({
  theme: 'light', motion: 'system', tips: true, persist: true,
  accent: '#0000ff', m3White: true, lang: 'id', recentColors: [],
});
const results = [];
function check(id, label, pass, actual, expected) {
  results.push({ id, label, pass, actual, expected });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${label} | actual=${actual} expected=${expected}`);
}
function info(label, value) { console.log(`  info ${label}: ${value}`); }

const isIconifyReq = url => url.includes('api.iconify.design') || url.includes('cdn.jsdelivr.net');

(async () => {
  const pageErrors = [];
  const iconifyReqs = [];
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
  try {
    browser = await chromium.launch({
      executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
      ...(relay ? { proxy: { server: `http://127.0.0.1:${relay.address().port}`, bypass: 'localhost,127.0.0.1' } } : {}),
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(p => {
      localStorage.setItem('trace-svg-settings-v1', p);
    }, PREFS);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
    page.on('request', req => { if (isIconifyReq(req.url())) iconifyReqs.push(req.url()); });
    const shot = async name => {
      try { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name) }); } catch (e) { /* best-effort */ }
    };

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
    await page.waitForSelector('.fig-floating-bar', { state: 'visible', timeout: 30000 });

    const toolBtn = page.locator('.fig-floating-bar [data-tip="veIconify"]');
    const modal = page.locator('[data-testid="ic-modal"]');
    const panelInModal = page.locator('[data-testid="ic-modal"] [data-testid="ic-panel"]');
    const modalVisible = async () => (await modal.count()) > 0 && await modal.first().isVisible();
    const modalGone = async () => {
      try { await modal.waitFor({ state: 'hidden', timeout: 10000 }); return true; }
      catch (e) { return false; }
    };
    const openModal = async () => {
      await toolBtn.click();
      try { await modal.waitFor({ state: 'visible', timeout: 10000 }); return true; }
      catch (e) { return false; }
    };
    // Titik backdrop: di luar dialog (maxWidth 960, terpusat -> tepi kiri
    // ~240 px pada viewport 1440), di tengah vertikal.
    const clickBackdrop = async () => { await page.mouse.click(60, 450); };

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
        ['M2', 'tombol X menutup'],
        ['M3', 'Esc menutup'],
        ['M4', 'klik backdrop menutup'],
        ['M5', 'klik backdrop saat .flt terbuka -> modal TETAP terbuka'],
      ]) check(id, label, false, 'skipped: M1 gagal, modal tidak pernah terbuka', 'modal terbuka dulu');
      check('PERR', '0 pageerror', pageErrors.length === 0, JSON.stringify(pageErrors), '[]');
    } else {
      // ---- M2: tombol X menutup ----
      await page.locator('[data-testid="ic-close"]').click();
      const m2 = await modalGone();
      check('M2', 'tombol X menutup modal', m2, `modalGone=${m2}`, 'modalGone=true');

      // ---- M3: Esc menutup ----
      await openModal();
      await page.keyboard.press('Escape');
      const m3 = await modalGone();
      check('M3', 'Esc menutup modal', m3, `modalGone=${m3}`, 'modalGone=true');

      // ---- M4: klik backdrop menutup ----
      await openModal();
      await clickBackdrop();
      const m4 = await modalGone();
      check('M4', 'klik backdrop menutup modal', m4, `modalGone=${m4}`, 'modalGone=true');

      // ---- M5: klik backdrop saat dropdown .flt terbuka -> modal TETAP terbuka ----
      await openModal();
      await page.locator('[data-testid="ic-category"] button').first().click();
      await page.waitForSelector('.flt', { state: 'visible', timeout: 10000 });
      const fltBefore = await page.locator('.flt').count();
      await clickBackdrop();
      await page.waitForTimeout(700);
      const m5stillOpen = await modalVisible();
      const fltAfter = await page.locator('.flt').count();
      check('M5', 'klik backdrop saat .flt terbuka -> modal TETAP terbuka',
        m5stillOpen && fltBefore >= 1,
        `modalVisible=${m5stillOpen} fltBefore=${fltBefore} fltAfter=${fltAfter}`,
        'modalVisible=true fltBefore>=1');
      // Dropdown sendiri harus tertutup oleh outside-click; klik backdrop
      // kedua (tanpa .flt) harus menutup modal.
      check('M5b', 'dropdown .flt tertutup sesudah klik backdrop + klik backdrop kedua menutup modal',
        fltAfter === 0 && (await (async () => { await clickBackdrop(); return modalGone(); })()),
        `fltAfter=${fltAfter}`, 'fltAfter=0 + modal tertutup');
      await shot('iconify-modal-closed.png');

      // ---- RF4: tidak ada fetch Iconify baru sesudah modal tertutup penuh ----
      const n0 = iconifyReqs.length;
      await page.waitForTimeout(2500);
      const n1 = iconifyReqs.length;
      info('fetch Iconify total saat tutup', String(n0));
      info('fetch Iconify baru selama 2,5 dtk sesudah tutup', String(n1 - n0));
      check('RF4', 'tidak ada fetch Iconify baru sesudah modal tertutup (Review Focus #4)',
        n1 === n0, `before=${n0} after=${n1} new=${n1 - n0}`, 'new=0');

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
  console.log(`\nPROBE-ICONIFY-MODAL: ${results.length - failed.length}/${results.length} lolos`
    + (failed.length ? ` | GAGAL: ${failed.map(f => f.id).join(', ')}` : ' | SEMUA LOLOS'));
  if (failed.length) process.exitCode = 1;
})();
