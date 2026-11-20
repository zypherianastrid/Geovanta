# Review package — Task 4: Panel UI + i18n

BASE: pre-Task 4 state (no IconifyPanel.jsx, no iconify-panel.test.cjs; baseline npm test 291/291).
HEAD: Task 4 as reported (new panel + 7 tests, full suite 298/298, build exit 0, tripwire 844).

## Files changed

- NEW `src/components/editor/IconifyPanel.jsx` (242 lines, sha256 f7e806e91641941dea072edb30bbd78021e548b4cf7de0ccf213bd94631b6573)
- NEW `tests/iconify-panel.test.cjs` (144 lines, sha256 2c260610933f6c8b38e45cc9396ea4871181665e22c60416b26da520d4e4e66f)
- MODIFIED `src/constants/appI18n.jsx` (+28 lines: 14 ic_* keys ID/EN; diff below vs backup `src/constants/appI18n.jsx.bak-iconify-t4`)
- NEW `docs/superpowers/plans/sdd-2026-11-15-iconify/task-4-report.md`

## Full diff (new files in full + i18n diff)

### src/components/editor/IconifyPanel.jsx
```jsx
/**
 * @file src/components/editor/IconifyPanel.jsx
 * @description Panel "Icons" Iconify (Task 4): kolom cari + dropdown
 * koleksi + grid thumbnail + baris "Terakhir dipakai" + catatan lisensi.
 * Mengikuti pola seksi RecolorSection.jsx / FindReplaceSection.jsx
 * (`.fig-isec`, header + tombol X, prop `L`, `open` + Esc menutup).
 *
 * Kontrak (design §7 butir 1, 2, 3, 7, 9; plan Task 4):
 * - Props: `onInsert(icon)`, `onClose()`, `status` ("online" | "offline"
 *   | "loading" — stub untuk Task 7, yang memasok status dari probe),
 *   `L` (label appI18n), `recentIcons` (nama ikon dari prefs, Task 7
 *   yang memasok; panel hanya menampilkan maks. 12 nama), `open`.
 * - State awal: mode telusur koleksi Material Symbols via
 *   loadSet("material-symbols"); begitu user mengetik, panel beralih
 *   ke mode cari lintas set via API.
 * - Cari: debounce ~300 ms; AbortController membatalkan request basi;
 *   limit 48 (API punya halaman minimum 32 — jangan pernah < 32);
 *   `&prefix=` bila filter koleksi aktif.
 * - Thumbnail 24–32 px (28 px) dirender dari data set yang sudah
 *   dimuat: string SVG dari buildIconSvg → data URI <img>. BUKAN
 *   <img> ke API (nol request tambahan, design §6 A2) dan BUKAN
 *   penyuntikan HTML mentah (design §7.10: SVG tidak pernah disuntik
 *   sebagai HTML). Ikon yang set-nya gagal dimuat / SVG-nya gagal
 *   dirakit tidak tampil — panel tidak menampilkan ikon yang tidak
 *   bisa disisipkan (anti-goal A4).
 * - "Terakhir dipakai": nama saja (tanpa thumbnail), klik →
 *   onInsert({name}) — Task 6 yang memuat set-nya bila perlu.
 * - onInsert dipanggil dengan objek ikon hasil searchIcons
 *   ({name, prefix, palette, license}) untuk ikon grid, atau
 *   {name, prefix, palette, license} yang dihitung dari set + daftar
 *   koleksi untuk ikon telusur; untuk recent hanya {name}.
 * - Error tidak pernah menampilkan string error mentah: pesan yang
 *   tampil berasal dari klien (sudah kontekstual per panggilan —
 *   Task 2/3) atau dari label i18n; TypeError "Failed to fetch"
 *   tidak pernah sampai ke UI.
 * - Tidak ada aturan CSS baru di file ini (kelas yang sudah ada +
 *   inline style) — tripwire tests/accent-tokens.test.cjs tidak berubah.
 * - Panel TIDAK me-mount dirinya sendiri dan TIDAK berisi logika
 *   sisip (Task 5 wiring, Task 6 insert).
 */
import React, { useState, useEffect, useRef } from 'react';
import { CustomTextBox } from '../ui/CustomTextBox.jsx';
import { Select } from '../ui/SelectDropdown.jsx';
import { searchIcons, listCollections, loadSet, buildIconSvg, isPaletteIcon } from '../../renderer/iconifyClient.jsx';

const BROWSE_DEFAULT_PREFIX = 'material-symbols';
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 48;
const PAGE_SIZE = 48;
const THUMB_PX = 28;
const RECENT_MAX = 12;

// Data URI dari string SVG (data, bukan HTML — §7.10). null bila ikon
// tidak ada di set / SVG gagal dirakit: ikon itu tidak dirender.
const svgDataUri = (fullName, setData) => {
  try {
    const svg = buildIconSvg(fullName, setData);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  } catch (e) {
    return null;
  }
};

const IconifyPanel = ({
  open = true,
  onInsert,
  onClose,
  status = 'loading',
  L,
  recentIcons = []
}) => {
  const [query, setQuery] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('');
  const [collections, setCollections] = useState([]);
  const [browseSet, setBrowseSet] = useState(null);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseError, setBrowseError] = useState(null);
  const [visibleBrowse, setVisibleBrowse] = useState(PAGE_SIZE);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sets, setSets] = useState({});
  const [setsError, setSetsError] = useState(null);
  const searchAbortRef = useRef(null);
  const setsRef = useRef({});

  const mode = query.trim() ? 'search' : 'browse';
  const browsePrefix = selectedPrefix || BROWSE_DEFAULT_PREFIX;
  const recentNames = (Array.isArray(recentIcons) ? recentIcons : []).slice(0, RECENT_MAX);

  /* Esc menutup panel (pola seksi): tidak saat overlay edit teks
     terbuka atau ada dropdown/popover (.flt) — Ruling J. */
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-testid="text-edit-overlay"]')) return;
      if (document.querySelector('.flt')) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Daftar koleksi sekali saat panel dibuka; gagal memuat tidak
     mematikan panel (dropdown fallback ke "Semua koleksi"). */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listCollections().then(cs => { if (!cancelled) setCollections(cs); }).catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  /* Muat set koleksi yang sedang ditelusur (default Material Symbols).
     loadSet di-memoize per set di klien — kembali ke telusur sesudah
     cari tidak mengunduh ulang. */
  useEffect(() => {
    if (!open || mode !== 'browse') return;
    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError(null);
    loadSet(browsePrefix)
      .then(sd => { if (!cancelled) { setBrowseSet(sd); setBrowseLoading(false); } })
      .catch(e => { if (!cancelled) { setBrowseError(e.message); setBrowseLoading(false); } });
    return () => { cancelled = true; };
  }, [open, mode, browsePrefix]);

  // Muat set JSON untuk prefix-prefix yang belum ada di cache sesi;
  // kegagalan per set dicatat (bukan dilempar) supaya ikon dari set
  // yang gagal tidak tampil diam-diam tanpa penjelasan.
  const ensureSets = prefixes => {
    const missing = prefixes.filter(p => p && !setsRef.current[p]);
    if (!missing.length) return Promise.resolve([]);
    return Promise.all(missing.map(pfx => loadSet(pfx)
      .then(sd => { setsRef.current[pfx] = sd; return [pfx, sd]; })
      .catch(e => { setSetsError(prev => prev || e.message); return null; })
    )).then(loaded => {
      const got = loaded.filter(Boolean);
      if (got.length) setSets(prev => { const next = {...prev}; for (const [p, sd] of got) next[p] = sd; return next; });
      return got;
    });
  };

  /* Cari (debounce ~300 ms, request basi dibatalkan). Query kosong =
     kembali ke mode telusur. AbortError diabaikan (bukan kegagalan). */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchError(null);
      setSetsError(null);
      setSearching(false);
      return;
    }
    const t = setTimeout(() => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearching(true);
      setSearchError(null);
      setSetsError(null);
      searchIcons(q, {prefix: selectedPrefix || undefined, limit: SEARCH_LIMIT, signal: controller.signal})
        .then(res => {
          if (controller.signal.aborted) return;
          setSearchResults(res.icons);
          setSearchTotal(res.total);
          return ensureSets([...new Set(res.icons.map(i => i.prefix).filter(Boolean))]);
        })
        .catch(e => {
          if (e?.name === 'AbortError') return;
          setSearchError(e.message);
          setSearchResults([]);
        })
        .finally(() => { if (searchAbortRef.current === controller) setSearching(false); });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, [query, selectedPrefix]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Muat lagi" hasil cari: halaman berikut via start (limit tetap 48).
  const handleLoadMoreSearch = () => {
    const q = query.trim();
    if (!q || searching || searchResults.length === 0) return;
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setSearchError(null);
    searchIcons(q, {prefix: selectedPrefix || undefined, limit: SEARCH_LIMIT, start: searchResults.length, signal: controller.signal})
      .then(res => {
        if (controller.signal.aborted) return;
        setSearchResults(prev => [...prev, ...res.icons]);
        setSearchTotal(res.total);
        return ensureSets([...new Set(res.icons.map(i => i.prefix).filter(Boolean))]);
      })
      .catch(e => {
        if (e?.name === 'AbortError') return;
        setSearchError(e.message);
      })
      .finally(() => { if (searchAbortRef.current === controller) setSearching(false); });
  };

  if (!open) return null;

  const collectionByPrefix = pfx => collections.find(c => c.prefix === pfx);
  const renderableSearch = searchResults
    .filter(r => sets[r.prefix])
    .map(r => ({...r, setData: sets[r.prefix]}));
  const browseNames = browseSet ? Object.keys(browseSet.icons || {}) : [];
  const visibleBrowseNames = browseNames.slice(0, visibleBrowse);

  // Catatan lisensi koleksi yang sedang tampil: satu koleksi (telusur
  // atau cari terfilter) → nama + lisensinya; cari lintas set → daftar
  // lisensi berbeda dari hasil yang tampil; bila tidak diketahui → tidak ada.
  let licenseNote = null;
  const singleCollection = mode === 'browse'
    ? collectionByPrefix(browsePrefix)
    : (selectedPrefix ? collectionByPrefix(selectedPrefix) : null);
  if (singleCollection?.license) {
    licenseNote = L.icLicenseOne.replace('{name}', singleCollection.name).replace('{license}', singleCollection.license);
  } else if (mode === 'search' && !selectedPrefix && renderableSearch.length > 0) {
    const licenses = [...new Set(renderableSearch.map(r => r.license).filter(Boolean))];
    if (licenses.length) licenseNote = L.icLicenseMany.replace('{licenses}', licenses.join(', '));
  }

  const thumbButton = (fullName, setData, iconObj, testid) => {
    const uri = svgDataUri(fullName, setData);
    if (!uri) return null;
    return <button key={fullName} type="button" className="ved-pill" style={{width: 32, height: 32, padding: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}} data-testid={testid} title={fullName} aria-label={fullName} onClick={() => onInsert(iconObj)}><img src={uri} alt={fullName} width={THUMB_PX} height={THUMB_PX} draggable={false} /></button>;
  };

  return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...collections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div>{status === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(renderableSearch.length))}</span>{searchResults.length < searchTotal ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
};

export { IconifyPanel };
export default IconifyPanel;
```

### tests/iconify-panel.test.cjs
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
  assert.match(src, /loadSet\(\s*['"]material-symbols['"]\)/);
  assert.match(src, /AbortController/);
  assert.match(src, /SEARCH_DEBOUNCE_MS\s*=\s*300/);
  assert.match(src, /setTimeout\([\s\S]{0,2000}?,\s*SEARCH_DEBOUNCE_MS\)/);
  assert.match(src, /ic-empty-state/);
  assert.doesNotMatch(src, /api\.iconify\.design/);
  assert.doesNotMatch(src, /cdn\.jsdelivr\.net/);
  assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
});
```

### src/constants/appI18n.jsx (diff vs backup)
```diff
--- src/constants/appI18n.jsx.bak-iconify-t4	2026-11-15 02:29:49.253896279 +0000
+++ src/constants/appI18n.jsx	2026-11-15 02:30:53.671126899 +0000
@@ -394,6 +394,20 @@
     rcOverride: 'Override',
     rcRemoveOverride: 'Hapus override',
     rcEmpty: 'Tidak ada warna yang bisa diubah',
+    icTitle: 'Ikon',
+    icSearchPlaceholder: 'Cari ikon… contoh: home',
+    icSearchHint: 'Cari dalam bahasa Inggris',
+    icCollection: 'Koleksi',
+    icAllCollections: 'Semua koleksi',
+    icRecent: 'Terakhir dipakai',
+    icLicenseOne: '{name} — Lisensi: {license}',
+    icLicenseMany: 'Lisensi ikon yang tampil: {licenses}',
+    icEmptySearch: 'Tidak ada ikon yang cocok dengan "{q}". Coba kata kunci lain dalam bahasa Inggris.',
+    icEmptyBrowse: 'Koleksi ini belum memiliki ikon.',
+    icLoading: 'Memuat ikon…',
+    icOffline: 'Perlu internet untuk mencari ikon',
+    icLoadMore: 'Muat lagi',
+    icResults: '{n} ikon ditemukan',
     riAlignLbl: 'Perataan',
     riPad4Sides: '4 sisi',
     riPadSym: 'Simetris',
@@ -837,6 +851,20 @@
     rcOverride: 'Override',
     rcRemoveOverride: 'Remove override',
     rcEmpty: 'No colors to change',
+    icTitle: 'Icons',
+    icSearchPlaceholder: 'Search icons… e.g. home',
+    icSearchHint: 'Search in English',
+    icCollection: 'Collection',
+    icAllCollections: 'All collections',
+    icRecent: 'Recently used',
+    icLicenseOne: '{name} — License: {license}',
+    icLicenseMany: 'Licenses of icons shown: {licenses}',
+    icEmptySearch: 'No icons match "{q}". Try another keyword in English.',
+    icEmptyBrowse: 'This collection has no icons yet.',
+    icLoading: 'Loading icons…',
+    icOffline: 'Internet is required to search icons',
+    icLoadMore: 'Load more',
+    icResults: '{n} icons found',
     riAlignLbl: 'Alignment',
     riPad4Sides: '4 sides',
     riPadSym: 'Symmetric',
```
