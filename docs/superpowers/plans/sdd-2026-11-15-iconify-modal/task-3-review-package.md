# Review package — Task 3: Wrapper modal + pindah mount

## Files changed
- CREATE src/components/modals/IconifyModal.jsx (new file, full content below)
- src/components/editor/VectorEditor.jsx (vs .bak-modal-t3)
- src/components/editor/EditorRightInspector.jsx (vs .bak-modal-t3)
- CREATE probes/probe-iconify-modal.cjs (subset M1–M5, full content below)

--- src/components/editor/VectorEditor.jsx: 1 removed / 2 added
--- src/components/editor/EditorRightInspector.jsx: 11 removed / 2 added
--- new files:
   50 /home/hatch/workspace/geovanta-round2/src/components/modals/IconifyModal.jsx
  227 /home/hatch/workspace/geovanta-round2/probes/probe-iconify-modal.cjs
  277 total

## Full diff (backup -> working copy, -U10)
=== src/components/editor/VectorEditor.jsx ===
--- /home/hatch/workspace/geovanta-round2/src/components/editor/VectorEditor.jsx.bak-modal-t3	2026-11-15 05:27:57.876645153 +0000
+++ /home/hatch/workspace/geovanta-round2/src/components/editor/VectorEditor.jsx	2026-11-15 05:28:45.976069259 +0000
@@ -39,20 +39,21 @@
 import { EditorSimplifyStrip } from './EditorSimplifyStrip.jsx';
 import { EditorOffsetStrip } from './EditorOffsetStrip.jsx';
 import { Slider } from '../ui/Slider.jsx';
 import { XfField } from '../ui/TransformField.jsx';
 import { CustomTextBox } from '../ui/CustomTextBox.jsx';
 import { EditorFloatingToolbar } from './EditorFloatingToolbar.jsx';
 import { GEOVANTA_BENCHMARK_SUITE } from '../../renderer/benchmarkSuite.jsx';
 import { GEOMETRY_CACHE } from '../../renderer/geometryCache.jsx';
 import { getObjectTessellationLOD } from '../../renderer/objectTessellationLod.jsx';
 import { EditorRightInspector } from './EditorRightInspector.jsx';
+import { IconifyModal } from '../modals/IconifyModal.jsx';
 
 /* C9: warna panduan snap per kind — sama dengan warna di menu checklist
    (SNAP_OPTS), supaya jenis snap terbaca dari warnanya. */
 const SNAP_KIND_COLOR = Object.fromEntries(SNAP_OPTS.map(([k, , col]) => [k, col]));
 /* T1 (audit UI/UX M4): warna kanvas bernama di satu tempat — jangan hardcode hex di bawah. */
 const SNAP_GUIDE_COLOR_DEFAULT = '#F24822';
 const NODE_HANDLE_COLOR = '#e88922';
 const SNAP_GUIDE_COLOR = kind => SNAP_KIND_COLOR[kind] || SNAP_GUIDE_COLOR_DEFAULT;
 import { CtxMenu } from '../ui/ContextMenu.jsx';
 import { normalizeTextDocument, normalizeTextObject, isLegacyText, legacyTextSpec, textAutoName } from '../../engine/legacyText.jsx';
@@ -8980,21 +8981,21 @@
               googleFonts={GOOGLE_FONTS.families}
               embedStatus={googleFontStatus}
               onEmbedFont={embedGoogleFontForSelection}
               isFontAvailable={isFontAvail}
               update={patch => updateText(primary.id, patch)}
               updateLive={patch => updateTextLive(primary.id, patch)}
               edit={() => setEditingText({id: primary.id, isNew: false})}
               onImportFont={() => pickFiles('.ttf,.otf,font/ttf,font/otf', fs => importFontFiles(fs))}
               onConvertToPath={convertTextSelectionToPath}
             />;
-          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} onIconifyClose={onIconifyClose} onIconifyInsert={onIconifyInsert} recentIcons={prefs && prefs.recentIcons || []} /></div>{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
+          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} /></div><IconifyModal open={tool === 'iconify'} onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={prefs && prefs.recentIcons || []} />{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
       if (e.target === e.currentTarget) setImportModalOpen(false);
     }}><div className="hp" role="dialog" aria-label="Impor Berkas" style={{
         maxWidth: 480
       }}><div className="flex items-center justify-between mb-3"><div><div className="text-sm font-semibold">{L.impTitle}</div><div className="text-[11px] mut mt-0.5">{L.impHint2}</div></div><button type="button" data-tip="uiClose" className="btn sec" style={{
             padding: 0,
             width: 32,
             height: 32,
             borderRadius: '50%'
           }} onClick={() => setImportModalOpen(false)}><Ico n="x" size={14} /></button></div><div className="drop p-6 rounded-2xl text-center cursor-pointer space-y-2" style={{
           border: '2px dashed var(--line)'

=== src/components/editor/EditorRightInspector.jsx ===
--- /home/hatch/workspace/geovanta-round2/src/components/editor/EditorRightInspector.jsx.bak-modal-t3	2026-11-15 05:27:57.878364763 +0000
+++ /home/hatch/workspace/geovanta-round2/src/components/editor/EditorRightInspector.jsx	2026-11-15 05:28:41.499069294 +0000
@@ -15,21 +15,20 @@
 import { clampN } from '../../utils/colorMath.jsx';
 import { Range } from '../ui/RangeField.jsx';
 import { pickScreenColor } from '../../utils/screenPipette.jsx';
 import { GradientEditorPanel } from './GradientEditorPanel.jsx';
 import { ColorField } from '../ui/ColorPickerField.jsx';
 import { ColorText } from '../ui/ColorHexInput.jsx';
 import { CustomTextBox } from '../ui/CustomTextBox.jsx';
 import { createStyle, renameStyle, deleteStyle, linkStyle, unlinkStyle, applyStyleEdit, paintSlot, directPaintEdit } from '../../engine/colorStyles.jsx';
 import { FindReplaceSection } from './FindReplaceSection.jsx';
 import { RecolorSection } from './RecolorSection.jsx';
-import { IconifyPanel } from './IconifyPanel.jsx';
 import { addEffect, removeEffect, updateEffect, toggleEffect } from '../../engine/effectsEngine.jsx';
 import { Float } from '../ui/FloatPopover.jsx';
 import { parseColorWithAlpha } from '../../utils/colorParserAndFormatter.jsx';
 import { pickFiles } from '../../utils/presenceAndFilePicker.jsx';
 
 /* Keputusan user 3A + peringatan review Task 2: edit langsung fill/stroke
    objek tertaut melepas tautan slot itu dalam commit yang sama. Delegasi
    tipis ke directPaintEdit (colorStyles.jsx) — SATU-SATUNYA rumah aturan
    ini; unlinkOnDirectPaintEdit (model, dipakai Task 5/6) mendelegasikan
    ke fungsi yang sama. 'none' ditangani eksplisit di sana (unlink +
@@ -132,29 +131,21 @@
   exportSvg,
   downloadSvg,
   onExportBackup,
   textControls,
   tool,
   blobParams,
   onBlobParams,
   weaveParams,
   onWeaveParams,
   arcParams,
-  onArcParams,
-  /* Task 5 (Iconify, R17): panel dimount di sini (Opsi A) sebagai seksi
-     .fig-isec di .fig-r-scroll — lihat render di bawah. `recentIcons`
-     dipasok Task 7 dari prefs (nama penuh "prefix:nama", maks. 12);
-     `status` TIDAK dipasok — panel memiliki status online/offline
-     sendiri (R19 jalur internal, probeOnline + listener). */
-  onIconifyClose,
-  onIconifyInsert,
-  recentIcons = []
+  onArcParams
 }) => {
   /* T13 (D-I4): SATU primer per tampilan di inspector. "Terapkan" hanya
      primer bila ada perubahan auto-layout yang belum diterapkan; bila tidak
      ada perubahan tertunda, "Unduh .SVG" yang primer. Pelacak perubahan
      minimal di sini (state lokal): tidak ada state "pending" di props
      inspector (alMem hanya ada di VectorEditor sebagai ref, dan mem-nya
      tidak menyimpan konfigurasi yang diterapkan) — jadi perubahan dilacak
      lewat layUpd/layPad yang dipanggil dari kontrol seksi ini, dibersihkan
      saat "Terapkan" diklik dan saat seleksi berganti (sejalan dengan reset
      alMem di VectorEditor). PELINDUNG HOOKS: hooks ini mendahului return
@@ -200,21 +191,21 @@
           minWidth: 56,
           display: 'inline-block',
           fontVariantNumeric: 'tabular-nums'
         }}>{zFmt(displayZoomRef.current || zoom)}</span><button type="button" className="fig-ibtn" data-tip="veZoomIn" aria-label={(lang === 'en' ? TIPS_EN : TIPS).veZoomIn.t} onClick={() => zoomBy(1.25)}><Ico n="zoomIn" size={14} /></button></div></div><Slider domRef={zoomSliderDomRef} min={0} max={1000} step={0.05} value={vzToSl(displayZoomRef.current || zoom)} on={v => setZ(vslToZ(v), null, null, true)} label="Zoom" tip="veZoomSl" /><div className="flex items-center gap-1.5 w-full"><button type="button" className="ved-pill text-[11px] flex-1 justify-center" style={{
         padding: '5px 10px',
         flex: '1 1 0%',
         display: 'inline-flex',
         alignItems: 'center',
         justifyContent: 'center',
         textAlign: 'center'
-      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{tool === 'iconify' && <IconifyPanel open onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={recentIcons} />}{(() => {
+      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{(() => {
   /* Seksi "Parameter tool" (Task 2): switch per tool — Task 3 (Weave) dan
      Task 5 (Arc) menambahkan cabang mereka sendiri di sini. Tool AKTIF menang
      atas fallback seleksi (fix round 1 Task 3): bila tool adalah generator,
      tampilkan cabangnya meskipun ada objek generator lain yang terseleksi;
      bila tool bukan generator, fallback ke objek terseleksi (blob dulu, lalu
      weave, lalu arc). Nilai yang ditampilkan = gen objek terseleksi (parameter
      menempel), bila tidak ada = default blobParams/weaveParams/arcParams
      untuk objek berikutnya. */
   const selBlob = (selObjs || []).find(o => o && o.gen && o.gen.kind === 'blob');
   const selWeave = (selObjs || []).find(o => o && o.gen && o.gen.kind === 'weave');

=== CREATE src/components/modals/IconifyModal.jsx ===
/**
 * @file src/components/modals/IconifyModal.jsx
 * @description Wrapper modal untuk panel Iconify (Task 3 plan "Iconify
 * Pindah ke Modal Popup"). Komponen tipis saja — tanpa logika cari/sisip;
 * semua itu tetap di IconifyPanel.
 *
 * Pola SettingsModal: portal + `.ov` + `.hp` + `usePresence(open, 200)`.
 * - Mount TANPA bungkus kondisional (spec §6.2/Q5): `usePresence` hanya
 *   bisa memainkan animasi keluar bila komponen tetap ter-mount sementara
 *   `open` berubah ke `false`; bila `!m`, return `null`.
 * - `open` diteruskan apa adanya ke panel (ruling R2, bukan literal
 *   `open={true}`): efek panel yang di-gate `open` (probeOnline, listener
 *   Esc, fetch listCollections/loadSet) hanya jalan selama modal terbuka
 *   dan berhenti selama animasi keluar.
 * - Backdrop: `onPointerDown`, tutup hanya bila klik tepat di backdrop
 *   (`e.target === e.currentTarget`) DAN tidak ada dropdown/popover
 *   `.flt` yang terbuka (guard Q4, sama seperti handler Esc panel) —
 *   supaya klik di luar dropdown (cara normal menutup dropdown) tidak
 *   ikut menutup modal dan menghilangkan state panel (query, kategori,
 *   koleksi, halaman).
 * - Ukuran (design §6.1): maxWidth 960, maxHeight 85vh, badan modal bisa
 *   scroll sendiri (grid panjang tidak mendorong dialog keluar layar).
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { usePresence } from '../../utils/presenceAndFilePicker.jsx';
import { IconifyPanel } from '../editor/IconifyPanel.jsx';

const IconifyModal = ({
  open,
  onInsert,
  onClose,
  L,
  recentIcons = []
}) => {
  const [m, lv] = usePresence(open, 200);
  if (!m) return null;
  return ReactDOM.createPortal(<div className={'ov ' + (lv ? 'out' : 'in')} onPointerDown={e => {
    if (e.target !== e.currentTarget) return;
    if (document.querySelector('.flt')) return;
    onClose();
  }}><div className="hp" role="dialog" aria-label={L.icTitle} data-testid="ic-modal" style={{
      maxWidth: 960,
      maxHeight: '85vh',
      overflowY: 'auto'
    }}><IconifyPanel open={open} onInsert={onInsert} onClose={onClose} L={L} recentIcons={recentIcons} /></div></div>, document.fullscreenElement || document.body);
};

export { IconifyModal };
export default IconifyModal;

=== CREATE probes/probe-iconify-modal.cjs ===
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
