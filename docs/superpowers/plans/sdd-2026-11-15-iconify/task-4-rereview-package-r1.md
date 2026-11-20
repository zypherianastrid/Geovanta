# Re-review package — Task 4 fix round 1/5

FIX_BASE: state the previous review saw — panel sha256 f7e806e91641941dea072edb30bbd78021e548b4cf7de0ccf213bd94631b6573, test sha256 2c260610933f6c8b38e45cc9396ea4871181665e22c60416b26da520d4e4e66f, appI18n sha256 a7b2a087f75914b1045d646fe6214557a06f23f166b34ed7d2189e8798258bbb.
HEAD: after fix round 1 — panel sha256 b7c7349806e55958311e3b21d6faccc52d992b64f28a3bd9daf84b73cbbcadd8, test sha256 e9a36bed4f8f726f4e7d442128397854e7b7bb79578b67065b9289b5333e3fb4, appI18n sha256 b8a71be85184b57e4638b348e28728594804eb7847656afc08dae139881f4315.

## Files changed in this round

- MODIFIED `src/components/editor/IconifyPanel.jsx` (diff below vs pre-fix backup `.bak-iconify-t4r1`)
- MODIFIED `src/constants/appI18n.jsx` (diff below vs pre-fix backup `.bak-iconify-t4r1`; only the new `icErrorGeneric` key)
- MODIFIED `tests/iconify-panel.test.cjs` (full current file below; no pre-fix backup exists — reviewer saw sha256 2c260610…; changed regions: guard at ~:134-157, new `toPanelError` test at ~:158-193, i18n assertions at ~:125-126)
- MODIFIED `docs/superpowers/plans/sdd-2026-11-15-iconify/task-4-report.md` (fix report appended under `## Fix round 1`)
- MODIFIED: nothing else

## Fix diff — panel
```diff
--- src/components/editor/IconifyPanel.jsx.bak-iconify-t4r1	2026-11-15 02:35:17.098387594 +0000
+++ src/components/editor/IconifyPanel.jsx	2026-11-15 02:35:29.394792286 +0000
@@ -29,10 +29,14 @@
  *   ({name, prefix, palette, license}) untuk ikon grid, atau
  *   {name, prefix, palette, license} yang dihitung dari set + daftar
  *   koleksi untuk ikon telusur; untuk recent hanya {name}.
- * - Error tidak pernah menampilkan string error mentah: pesan yang
- *   tampil berasal dari klien (sudah kontekstual per panggilan —
- *   Task 2/3) atau dari label i18n; TypeError "Failed to fetch"
- *   tidak pernah sampai ke UI.
+ * - Error tidak pernah menampilkan string error mentah: hanya pesan
+ *   klien yang dikenal kontekstual yang diteruskan verbatim (awalan di
+ *   CONTEXTUAL_ERROR_PREFIXES, lihat toPanelError); error lain —
+ *   mis. TypeError "Failed to fetch" yang lolos, atau SyntaxError dari
+ *   JSON.parse set korup di klien (iconifyClient.jsx:154, di luar
+ *   try/catch fetch-nya) — dipetakan ke label i18n icErrorGeneric.
+ *   Jadi klaim lama "TypeError tidak pernah sampai ke UI" kini
+ *   ditegakkan panel ini sendiri, bukan hanya diandalkan dari klien.
  * - Tidak ada aturan CSS baru di file ini (kelas yang sudah ada +
  *   inline style) — tripwire tests/accent-tokens.test.cjs tidak berubah.
  * - Panel TIDAK me-mount dirinya sendiri dan TIDAK berisi logika
@@ -61,6 +65,35 @@
   }
 };
 
+// Awalan pesan error klien yang DIJAMIN kontekstual per panggilan
+// (src/renderer/iconifyClient.jsx — pesan yang dilempar di dalam/di
+// sesudah try/catch fetch: searchIcons, listCollections, loadSet).
+// Pesan error lain (transport mentah, SyntaxError dari res.json() /
+// JSON.parse di luar try/catch klien) TIDAK ada di daftar ini.
+const CONTEXTUAL_ERROR_PREFIXES = [
+  'Perlu internet untuk ',
+  'Pencarian ikon ',
+  'Memuat daftar koleksi ikon ',
+  'Gagal memuat daftar koleksi ikon ',
+  'Memuat set ikon ',
+  'Gagal memuat set ikon ',
+  'Set ikon ',
+  'Prefix set ikon ',
+  'Kata kunci pencarian ikon '
+];
+
+// Petakan error ke pesan yang boleh tampil di UI: pesan klien yang
+// dikenal kontekstual diteruskan verbatim; sisanya (raw/unknown —
+// mis. TypeError "Failed to fetch", SyntaxError JSON korup) diganti
+// pesan generik i18n. Diekspor agar tes bisa membuktikannya langsung
+// (harness SSR tidak menjalankan effect, jadi jalur render error
+// tidak bisa diuji lewat renderToStaticMarkup).
+const toPanelError = (err, genericMessage) => {
+  const msg = err?.message;
+  if (typeof msg === 'string' && CONTEXTUAL_ERROR_PREFIXES.some(p => msg.startsWith(p))) return msg;
+  return genericMessage;
+};
+
 const IconifyPanel = ({
   open = true,
   onInsert,
@@ -124,7 +157,7 @@
     setBrowseError(null);
     loadSet(browsePrefix)
       .then(sd => { if (!cancelled) { setBrowseSet(sd); setBrowseLoading(false); } })
-      .catch(e => { if (!cancelled) { setBrowseError(e.message); setBrowseLoading(false); } });
+      .catch(e => { if (!cancelled) { setBrowseError(toPanelError(e, L.icErrorGeneric)); setBrowseLoading(false); } });
     return () => { cancelled = true; };
   }, [open, mode, browsePrefix]);
 
@@ -136,7 +169,7 @@
     if (!missing.length) return Promise.resolve([]);
     return Promise.all(missing.map(pfx => loadSet(pfx)
       .then(sd => { setsRef.current[pfx] = sd; return [pfx, sd]; })
-      .catch(e => { setSetsError(prev => prev || e.message); return null; })
+      .catch(e => { setSetsError(prev => prev || toPanelError(e, L.icErrorGeneric)); return null; })
     )).then(loaded => {
       const got = loaded.filter(Boolean);
       if (got.length) setSets(prev => { const next = {...prev}; for (const [p, sd] of got) next[p] = sd; return next; });
@@ -172,7 +205,7 @@
         })
         .catch(e => {
           if (e?.name === 'AbortError') return;
-          setSearchError(e.message);
+          setSearchError(toPanelError(e, L.icErrorGeneric));
           setSearchResults([]);
         })
         .finally(() => { if (searchAbortRef.current === controller) setSearching(false); });
@@ -201,7 +234,7 @@
       })
       .catch(e => {
         if (e?.name === 'AbortError') return;
-        setSearchError(e.message);
+        setSearchError(toPanelError(e, L.icErrorGeneric));
       })
       .finally(() => { if (searchAbortRef.current === controller) setSearching(false); });
   };
@@ -238,5 +271,5 @@
   return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...collections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div>{status === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(renderableSearch.length))}</span>{searchResults.length < searchTotal ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
 };
 
-export { IconifyPanel };
+export { IconifyPanel, toPanelError };
 export default IconifyPanel;
```

## Fix diff — i18n
```diff
--- src/constants/appI18n.jsx.bak-iconify-t4r1	2026-11-15 02:35:17.096657589 +0000
+++ src/constants/appI18n.jsx	2026-11-15 02:35:19.896792359 +0000
@@ -406,6 +406,7 @@
     icEmptyBrowse: 'Koleksi ini belum memiliki ikon.',
     icLoading: 'Memuat ikon…',
     icOffline: 'Perlu internet untuk mencari ikon',
+    icErrorGeneric: 'Gagal memuat ikon. Periksa koneksi internet, lalu coba lagi.',
     icLoadMore: 'Muat lagi',
     icResults: '{n} ikon ditemukan',
     riAlignLbl: 'Perataan',
@@ -863,6 +864,7 @@
     icEmptyBrowse: 'This collection has no icons yet.',
     icLoading: 'Loading icons…',
     icOffline: 'Internet is required to search icons',
+    icErrorGeneric: 'Failed to load icons. Check your internet connection, then try again.',
     icLoadMore: 'Load more',
     icResults: '{n} icons found',
     riAlignLbl: 'Alignment',
```

### tests/iconify-panel.test.cjs (current, full)
```javascript
/**
 * @file tests/iconify-panel.test.cjs
 * @description Tes komponen IconifyPanel (Task 4) dengan harness render
 * komponen yang ADA di repo ini: esbuild + ReactDOMServer.
 * renderToStaticMarkup (preseden: tests/text-tool.test.cjs).
 *
 * TEMUAN HARNESS (Step 1, dicatat untuk koordinator / R5): repo ini
 * TIDAK punya harness render komponen interaktif — tidak ada jsdom /
 * happy-dom, tidak ada createRoot / act, tidak ada DOM di node.
 * renderToStaticMarkup tidak menjalankan effects dan tidak bisa
 * mensimulasikan ketikan atau timer. Karena itu ketiga asersi Step 1
 * brief yang bersifat interaktif/async TIDAK dapat tinggal di file
 * ini tanpa mengarang harness (dilarang brief) dan DITUNDA eksplisit
 * ke probe Task 8 (probes/probe-iconify.cjs, Playwright, browser asli):
 *   (1) render dengan client ter-mock menampilkan grid telusur
 *       Material Symbols saat dibuka (butuh effect loadSet async);
 *   (2) mengetik query (debounce ~300 ms) beralih ke hasil cari
 *       (butuh event input + timer + fetch async);
 *   (3) hasil kosong menampilkan empty state yang menjelaskan
 *       (butuh search async selesai dengan 0 hasil).
 * Yang DAPAT diuji di sini (dan diuji): struktur statis panel,
 * label ID/EN, baris "Terakhir dipakai" (maks. 12 nama), slot
 * status offline/loading, serta guard sumber yang mematok wiring
 * yang tidak bisa dieksekusi harness ini (browse default
 * material-symbols, debounce 300 ms + AbortController, tidak ada
 * host API/CDN di panel, tidak ada dangerouslySetInnerHTML — §7.10).
 */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
const fs = require('node:fs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

function loadModule(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const code = esbuild.buildSync({
    entryPoints: [filename],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    external: ['react', 'react-dom', 'react-dom/server'],
    loader: {'.jsx': 'jsx', '.js': 'js'}
  }).outputFiles[0].text;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(code, filename);
  return mod.exports;
}

const render = (props) => {
  const {IconifyPanel} = loadModule('src/components/editor/IconifyPanel.jsx');
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconifyPanel, props)
  );
};
const baseProps = (over = {}) => ({
  onInsert: () => {},
  onClose: () => {},
  L: loadModule('src/constants/appI18n.jsx').APP_STR.id,
  recentIcons: [],
  ...over
});
const panelSrc = () => fs.readFileSync(
  path.resolve(__dirname, '../src/components/editor/IconifyPanel.jsx'), 'utf8'
);

test('IconifyPanel merender kolom cari + petunjuk Inggris + dropdown koleksi default "Semua koleksi"', () => {
  const html = render(baseProps());
  assert.match(html, /data-testid="ic-panel"/);
  assert.match(html, /data-testid="ic-search"/);
  assert.match(html, /Cari dalam bahasa Inggris/);
  assert.match(html, /data-testid="ic-collection"/);
  assert.match(html, />Semua koleksi</);
  assert.match(html, /data-testid="ic-close"/);
  assert.match(html, /aria-label="Tutup"/);
});

test('IconifyPanel merender baris "Terakhir dipakai" maks. 12 nama saja (nama saja, tanpa thumbnail)', () => {
  const names = Array.from({length: 13}, (_, i) => `mdi:icon-${i}`);
  const html = render(baseProps({recentIcons: names}));
  assert.match(html, /data-testid="ic-recent"/);
  assert.match(html, /Terakhir dipakai/);
  for (let i = 0; i < 12; i++) assert.ok(html.includes(`mdi:icon-${i}`), `nama ke-${i} tampil`);
  assert.ok(!html.includes('mdi:icon-12'), 'nama ke-13 TIDAK tampil (maks. 12)');
  assert.ok(!html.includes('<img'), 'baris recent hanya nama — tanpa <img>');
});

test('IconifyPanel status="offline" menampilkan state offline yang menjelaskan + baris recent tetap ada', () => {
  const html = render(baseProps({status: 'offline', recentIcons: ['mdi:home']}));
  assert.match(html, /data-testid="ic-offline"/);
  assert.match(html, /Perlu internet untuk mencari ikon/);
  assert.ok(html.includes('mdi:home'), 'nama recent tetap tampil saat offline');
});

test('IconifyPanel status default menampilkan loading untuk grid telusur (efek belum jalan di SSR)', () => {
  const html = render(baseProps());
  assert.match(html, /data-testid="ic-loading"/);
  assert.match(html, /Memuat ikon/);
  assert.ok(!html.includes('data-testid="ic-empty-state"'), 'bukan empty state saat loading');
});

test('IconifyPanel label EN: hint, dropdown, dan recent berbahasa Inggris', () => {
  const L = loadModule('src/constants/appI18n.jsx').APP_STR.en;
  const html = render(baseProps({L, recentIcons: ['mdi:home']}));
  assert.match(html, /Search in English/);
  assert.match(html, />All collections</);
  assert.match(html, /Recently used/);
});

test('appI18n: kunci panel Iconify ID/EN lengkap dengan nilai verbatim brief', () => {
  const {APP_STR} = loadModule('src/constants/appI18n.jsx');
  assert.equal(APP_STR.id.icSearchHint, 'Cari dalam bahasa Inggris');
  assert.equal(APP_STR.en.icSearchHint, 'Search in English');
  assert.equal(APP_STR.id.icAllCollections, 'Semua koleksi');
  assert.equal(APP_STR.en.icAllCollections, 'All collections');
  assert.equal(APP_STR.id.icRecent, 'Terakhir dipakai');
  assert.equal(APP_STR.en.icRecent, 'Recently used');
  assert.equal(APP_STR.id.icOffline, 'Perlu internet untuk mencari ikon');
  assert.equal(APP_STR.en.icOffline, 'Internet is required to search icons');
  assert.equal(APP_STR.id.icErrorGeneric, 'Gagal memuat ikon. Periksa koneksi internet, lalu coba lagi.');
  assert.equal(APP_STR.en.icErrorGeneric, 'Failed to load icons. Check your internet connection, then try again.');
  assert.match(APP_STR.id.icEmptySearch, /\{q\}/);
  assert.match(APP_STR.en.icEmptySearch, /\{q\}/);
  for (const k of ['icTitle', 'icSearchPlaceholder', 'icCollection', 'icLicenseOne',
    'icLicenseMany', 'icLoading', 'icLoadMore', 'icResults', 'icEmptyBrowse']) {
    assert.equal(typeof APP_STR.id[k], 'string', `id.${k} ada`);
    assert.equal(typeof APP_STR.en[k], 'string', `en.${k} ada`);
  }
});

test('IconifyPanel source: browse default material-symbols, debounce 300 ms + AbortController, tanpa host & tanpa innerHTML', () => {
  const src = panelSrc();
  // Fix round 1 (Important 1): guard LAMA di sini hanya mencocokkan
  // /loadSet("material-symbols")/ — yang juga cocok dengan komentar
  // header (:14) dan TIDAK mengasersi apa pun soal kode eksekusi
  // (kode memanggil loadSet(browsePrefix)). Guard baru mengasersi
  // KODE EKSEKUSI: nilai konstanta default, fallback saat dropdown
  // kembali ke "Semua koleksi", dan pemakaian browsePrefix di loadSet.
  // Mengganti default ke prefix lain, atau menghapus fallback,
  // membuat tes ini MERAH.
  assert.match(src, /BROWSE_DEFAULT_PREFIX\s*=\s*['"]material-symbols['"]/);
  assert.match(src, /selectedPrefix\s*\|\|\s*BROWSE_DEFAULT_PREFIX/);
  assert.match(src, /loadSet\(\s*browsePrefix\s*\)/);
  assert.match(src, /AbortController/);
  assert.match(src, /SEARCH_DEBOUNCE_MS\s*=\s*300/);
  assert.match(src, /setTimeout\([\s\S]{0,2000}?,\s*SEARCH_DEBOUNCE_MS\)/);
  assert.match(src, /ic-empty-state/);
  assert.doesNotMatch(src, /api\.iconify\.design/);
  assert.doesNotMatch(src, /cdn\.jsdelivr\.net/);
  assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
});

test('IconifyPanel toPanelError: error mentah dipetakan ke pesan generik i18n, pesan klien kontekstual diteruskan', () => {
  const {toPanelError} = loadModule('src/components/editor/IconifyPanel.jsx');
  const {APP_STR} = loadModule('src/constants/appI18n.jsx');
  const genericId = APP_STR.id.icErrorGeneric;
  const genericEn = APP_STR.en.icErrorGeneric;
  // Raw/unknown — inilah yang dulu bocor verbatim ke UI:
  // TypeError transport + SyntaxError dari JSON.parse set korup
  // (iconifyClient.jsx:154, di luar try/catch fetch klien) + error
  // tak dikenal + tanpa message. Semuanya HARUS jadi generik —
  // tes ini MERAH bila mapping dihapus / e.message diteruskan mentah.
  assert.equal(toPanelError(new TypeError('Failed to fetch'), genericId), genericId);
  assert.equal(toPanelError(new SyntaxError('Unexpected token < in JSON at position 0'), genericId), genericId);
  assert.equal(toPanelError(new Error('boom'), genericId), genericId);
  assert.equal(toPanelError(new Error(''), genericId), genericId);
  assert.equal(toPanelError(null, genericId), genericId);
  assert.equal(toPanelError(undefined, genericEn), genericEn);
  assert.ok(!toPanelError(new TypeError('Failed to fetch'), genericId).includes('Failed to fetch'));
  assert.ok(!toPanelError(new SyntaxError('Unexpected token'), genericId).includes('Unexpected token'));
  // Pesan klien yang DIJAMIN kontekstual (iconifyClient.jsx) tetap
  // diteruskan verbatim — satu contoh per jalur pemanggilan:
  assert.equal(toPanelError(new Error('Perlu internet untuk mencari ikon'), genericId), 'Perlu internet untuk mencari ikon');
  assert.equal(toPanelError(new Error('Pencarian ikon gagal (HTTP 500)'), genericId), 'Pencarian ikon gagal (HTTP 500)');
  assert.equal(toPanelError(new Error('Pencarian ikon kehabisan waktu (10 detik)'), genericId), 'Pencarian ikon kehabisan waktu (10 detik)');
  assert.equal(toPanelError(new Error('Memuat set ikon "mdi" kehabisan waktu (30 detik)'), genericId), 'Memuat set ikon "mdi" kehabisan waktu (30 detik)');
  assert.equal(toPanelError(new Error('Gagal memuat set ikon "mdi" (HTTP 404)'), genericId), 'Gagal memuat set ikon "mdi" (HTTP 404)');
  assert.equal(toPanelError(new Error('Set ikon "mdi" terlalu besar (maksimal 10 MB)'), genericId), 'Set ikon "mdi" terlalu besar (maksimal 10 MB)');
  assert.equal(toPanelError(new Error('Prefix set ikon tidak valid: foo_bar'), genericId), 'Prefix set ikon tidak valid: foo_bar');
  assert.equal(toPanelError(new Error('Kata kunci pencarian ikon kosong'), genericId), 'Kata kunci pencarian ikon kosong');
  // Guard sumber: tidak ada lagi jalur set*Error yang memakai
  // e.message mentah — keempat situs (:160, :172, :208, :237)
  // memanggil toPanelError dengan L.icErrorGeneric.
  const src = panelSrc();
  assert.doesNotMatch(src, /setBrowseError\(\s*e\.message\s*\)/);
  assert.doesNotMatch(src, /setSearchError\(\s*e\.message\s*\)/);
  assert.doesNotMatch(src, /setSetsError\(\s*prev\s*=>\s*prev\s*\|\|\s*e\.message\s*\)/);
  assert.match(src, /toPanelError\(\s*e\s*,\s*L\.icErrorGeneric\s*\)/);
});
```
