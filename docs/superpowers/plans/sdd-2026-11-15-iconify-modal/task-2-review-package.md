# Review package — Task 2: Filter kategori + thumbnail 40 px di panel

## Files changed
- src/components/editor/IconifyPanel.jsx (vs .bak-modal-t2)
- tests/iconify-panel.test.cjs (vs .bak-modal-t2)

## Diff stat (added/deleted lines per file)
--- src/components/editor/IconifyPanel.jsx: 12 removed / 78 added
--- tests/iconify-panel.test.cjs: 3 removed / 141 added

## Full diff (backup -> working copy, -U10)
=== src/components/editor/IconifyPanel.jsx ===
--- /home/hatch/workspace/geovanta-round2/src/components/editor/IconifyPanel.jsx.bak-modal-t2	2026-11-15 05:19:28.137073557 +0000
+++ /home/hatch/workspace/geovanta-round2/src/components/editor/IconifyPanel.jsx	2026-11-15 05:21:21.254988098 +0000
@@ -17,21 +17,28 @@
  *   dibuka); saat 'offline' panel menampilkan L.icOffline
  *   ("Perlu internet untuk mencari ikon", Task 2) dan baris recent
  *   tetap tampil nama saja; klik recent memakai cache set di memori
  *   bila ada (loadSet Task 3) dan gagal lewat toast Task 6 bila tidak.
  * - State awal: mode telusur koleksi Material Symbols via
  *   loadSet("material-symbols"); begitu user mengetik, panel beralih
  *   ke mode cari lintas set via API.
  * - Cari: debounce ~300 ms; AbortController membatalkan request basi;
  *   limit 48 (API punya halaman minimum 32 — jangan pernah < 32);
  *   `&prefix=` bila filter koleksi aktif.
- * - Thumbnail 24–32 px (28 px) dirender dari data set yang sudah
+ * - Filter kategori (Task 2 modal): dropdown kategori di samping
+ *   dropdown koleksi; kategori aktif memakai `searchIconsFiltered`
+ *   (Task 1) dan `ic-count` = jumlah ikon terfilter yang dimuat;
+ *   "Muat lagi" selama `!exhausted` (limit tumbuh, bukan `start` —
+ *   helper Task 1 tidak punya `start`); tanpa kategori, jalur
+ *   `searchIcons` lama tidak berubah. Telusur dengan kategori aktif
+ *   memakai koleksi pertama dalam kategori itu (bukan grid kosong).
+ * - Thumbnail 40 px dirender dari data set yang sudah
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
@@ -46,27 +53,27 @@
  *   Jadi klaim lama "TypeError tidak pernah sampai ke UI" kini
  *   ditegakkan panel ini sendiri, bukan hanya diandalkan dari klien.
  * - Tidak ada aturan CSS baru di file ini (kelas yang sudah ada +
  *   inline style) — tripwire tests/accent-tokens.test.cjs tidak berubah.
  * - Panel TIDAK me-mount dirinya sendiri dan TIDAK berisi logika
  *   sisip (Task 5 wiring, Task 6 insert).
  */
 import React, { useState, useEffect, useRef } from 'react';
 import { CustomTextBox } from '../ui/CustomTextBox.jsx';
 import { Select } from '../ui/SelectDropdown.jsx';
-import { searchIcons, listCollections, loadSet, buildIconSvg, isPaletteIcon, probeOnline } from '../../renderer/iconifyClient.jsx';
+import { searchIcons, searchIconsFiltered, listCollections, loadSet, buildIconSvg, isPaletteIcon, probeOnline } from '../../renderer/iconifyClient.jsx';
 
 const BROWSE_DEFAULT_PREFIX = 'material-symbols';
 const SEARCH_DEBOUNCE_MS = 300;
 const SEARCH_LIMIT = 48;
 const PAGE_SIZE = 48;
-const THUMB_PX = 28;
+const THUMB_PX = 40;
 const RECENT_MAX = 12;
 
 // Data URI dari string SVG (data, bukan HTML — §7.10). null bila ikon
 // tidak ada di set / SVG gagal dirakit: ikon itu tidak dirender.
 const svgDataUri = (fullName, setData) => {
   try {
     const svg = buildIconSvg(fullName, setData);
     return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
   } catch (e) {
     return null;
@@ -95,37 +102,61 @@
 // mis. TypeError "Failed to fetch", SyntaxError JSON korup) diganti
 // pesan generik i18n. Diekspor agar tes bisa membuktikannya langsung
 // (harness SSR tidak menjalankan effect, jadi jalur render error
 // tidak bisa diuji lewat renderToStaticMarkup).
 const toPanelError = (err, genericMessage) => {
   const msg = err?.message;
   if (typeof msg === 'string' && CONTEXTUAL_ERROR_PREFIXES.some(p => msg.startsWith(p))) return msg;
   return genericMessage;
 };
 
+// Koleksi dalam satu kategori (Task 2 modal). `category` adalah string
+// kategori mentah API atau sentinel '__other__' untuk koleksi tanpa
+// kategori (ruling R1 — jangan pernah bandingkan dengan label display
+// "Lainnya"/"Other"). Tanpa kategori: semua koleksi, apa adanya.
+const collectionsInCategory = (collections, category) => {
+  const list = Array.isArray(collections) ? collections : [];
+  if (!category) return list;
+  return list.filter(c => (category === '__other__' ? !c?.category : c?.category === category));
+};
+
+// Opsi dropdown kategori (Task 2 modal): '' = semua kategori, lalu
+// nilai `category` unik terurut abjad; koleksi tanpa kategori digabung
+// di bawah sentinel '__other__' (label L.icOtherCategory), paling akhir.
+const categoryOptions = (collections, L) => {
+  const list = Array.isArray(collections) ? collections : [];
+  const cats = [...new Set(list.map(c => c?.category).filter(c => typeof c === 'string' && c))]
+    .sort((a, b) => a.localeCompare(b));
+  const opts = [['', L.icAllCategories], ...cats.map(c => [c, c])];
+  if (list.some(c => !c?.category)) opts.push(['__other__', L.icOtherCategory]);
+  return opts;
+};
+
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
+  const [selectedCategory, setSelectedCategory] = useState('');
   const [collections, setCollections] = useState([]);
   const [browseSet, setBrowseSet] = useState(null);
   const [browseLoading, setBrowseLoading] = useState(true);
   const [browseError, setBrowseError] = useState(null);
   const [visibleBrowse, setVisibleBrowse] = useState(PAGE_SIZE);
   const [searchResults, setSearchResults] = useState([]);
   const [searchTotal, setSearchTotal] = useState(0);
+  const [searchExhausted, setSearchExhausted] = useState(false);
   const [searching, setSearching] = useState(false);
   const [searchError, setSearchError] = useState(null);
   const [sets, setSets] = useState({});
   const [setsError, setSetsError] = useState(null);
   const searchAbortRef = useRef(null);
   const setsRef = useRef({});
 
   /* Task 7 (R19 jalur internal): panel memiliki status online/offline
      sendiri — prop `status` hanya nilai awal (Task 5 tidak memasoknya;
      tes SSR Task 4 mengandalkan nilai awal ini). Saat dibuka,
@@ -143,23 +174,39 @@
     window.addEventListener('online', onOn);
     window.addEventListener('offline', onOff);
     return () => {
       cancelled = true;
       window.removeEventListener('online', onOn);
       window.removeEventListener('offline', onOff);
     };
   }, [open]);
 
   const mode = query.trim() ? 'search' : 'browse';
-  const browsePrefix = selectedPrefix || BROWSE_DEFAULT_PREFIX;
+  // Opsi dropdown koleksi = hanya koleksi dalam kategori terpilih
+  // (atau semua bila ''). Telusur: kategori aktif tanpa koleksi
+  // terpilih memakai koleksi pertama dalam kategori itu — bukan grid
+  // kosong — bila kategori tidak memuat Material Symbols.
+  const visibleCollections = collectionsInCategory(collections, selectedCategory);
+  const browsePrefix = selectedPrefix || (selectedCategory ? visibleCollections[0]?.prefix : undefined) || BROWSE_DEFAULT_PREFIX;
   const recentNames = (Array.isArray(recentIcons) ? recentIcons : []).slice(0, RECENT_MAX);
 
+  // Ganti kategori: koleksi aktif yang tidak termasuk kategori baru
+  // direset ke '' (semua koleksi dalam kategori itu).
+  const handleCategoryChange = v => {
+    setSelectedCategory(v);
+    if (v && selectedPrefix) {
+      const col = collections.find(c => c.prefix === selectedPrefix);
+      const inNewCategory = v === '__other__' ? !col?.category : col?.category === v;
+      if (!inNewCategory) setSelectedPrefix('');
+    }
+  };
+
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
@@ -215,67 +262,86 @@
 
   /* Cari (debounce ~300 ms, request basi dibatalkan). Query kosong =
      kembali ke mode telusur. AbortError diabaikan (bukan kegagalan).
      Task 7: di-gate — tidak ada request cari saat offline / masih
      probing; efek jalan ulang saat probe selesai (dep netStatus). */
   useEffect(() => {
     const q = query.trim();
     if (!q) {
       setSearchResults([]);
       setSearchTotal(0);
+      setSearchExhausted(false);
       setSearchError(null);
       setSetsError(null);
       setSearching(false);
       return;
     }
     if (netStatus !== 'online') return;
     const t = setTimeout(() => {
       if (searchAbortRef.current) searchAbortRef.current.abort();
       const controller = new AbortController();
       searchAbortRef.current = controller;
       setSearching(true);
       setSearchError(null);
       setSetsError(null);
-      searchIcons(q, {prefix: selectedPrefix || undefined, limit: SEARCH_LIMIT, signal: controller.signal})
+      // Kategori aktif: cari terfilter (Task 1) — ic-count = jumlah
+      // ikon terfilter yang dimuat, bukan total API. Tanpa kategori:
+      // jalur searchIcons lama tidak berubah (total API tetap tampil).
+      const runSearch = selectedCategory
+        ? searchIconsFiltered(q, {category: selectedCategory, collections, limit: SEARCH_LIMIT, signal: controller.signal})
+            .then(res => ({icons: res.icons, total: res.icons.length, exhausted: res.exhausted}))
+        : searchIcons(q, {prefix: selectedPrefix || undefined, limit: SEARCH_LIMIT, signal: controller.signal})
+            .then(res => ({icons: res.icons, total: res.total, exhausted: res.icons.length >= res.total}));
+      runSearch
         .then(res => {
           if (controller.signal.aborted) return;
           setSearchResults(res.icons);
           setSearchTotal(res.total);
+          setSearchExhausted(res.exhausted);
           return ensureSets([...new Set(res.icons.map(i => i.prefix).filter(Boolean))]);
         })
         .catch(e => {
           if (e?.name === 'AbortError') return;
           setSearchError(toPanelError(e, L.icErrorGeneric));
           setSearchResults([]);
         })
         .finally(() => { if (searchAbortRef.current === controller) setSearching(false); });
     }, SEARCH_DEBOUNCE_MS);
     return () => {
       clearTimeout(t);
       if (searchAbortRef.current) searchAbortRef.current.abort();
     };
-  }, [query, selectedPrefix, netStatus]); // eslint-disable-line react-hooks/exhaustive-deps
+  }, [query, selectedPrefix, selectedCategory, collections, netStatus]); // eslint-disable-line react-hooks/exhaustive-deps
 
-  // "Muat lagi" hasil cari: halaman berikut via start (limit tetap 48).
+  // "Muat lagi" hasil cari: halaman berikut. Kategori aktif: helper
+  // Task 1 tidak punya `start`, jadi limit tumbuh (ambil ulang dari
+  // awal sampai hasil yang sudah dimuat + 48) lewat helper yang sama;
+  // tampil selama !exhausted. Tanpa kategori: `start` lama.
   const handleLoadMoreSearch = () => {
     const q = query.trim();
     if (!q || searching || searchResults.length === 0) return;
     if (searchAbortRef.current) searchAbortRef.current.abort();
     const controller = new AbortController();
     searchAbortRef.current = controller;
     setSearching(true);
     setSearchError(null);
-    searchIcons(q, {prefix: selectedPrefix || undefined, limit: SEARCH_LIMIT, start: searchResults.length, signal: controller.signal})
+    const runMore = selectedCategory
+      ? searchIconsFiltered(q, {category: selectedCategory, collections, limit: searchResults.length + SEARCH_LIMIT, signal: controller.signal})
+          .then(res => ({icons: res.icons, total: res.icons.length, exhausted: res.exhausted}))
+      : searchIcons(q, {prefix: selectedPrefix || undefined, limit: SEARCH_LIMIT, start: searchResults.length, signal: controller.signal})
+          .then(res => ({icons: [...searchResults, ...res.icons], total: res.total, exhausted: (searchResults.length + res.icons.length) >= res.total}));
+    runMore
       .then(res => {
         if (controller.signal.aborted) return;
-        setSearchResults(prev => [...prev, ...res.icons]);
+        setSearchResults(res.icons);
         setSearchTotal(res.total);
+        setSearchExhausted(res.exhausted);
         return ensureSets([...new Set(res.icons.map(i => i.prefix).filter(Boolean))]);
       })
       .catch(e => {
         if (e?.name === 'AbortError') return;
         setSearchError(toPanelError(e, L.icErrorGeneric));
       })
       .finally(() => { if (searchAbortRef.current === controller) setSearching(false); });
   };
 
   if (!open) return null;
@@ -297,18 +363,18 @@
   if (singleCollection?.license) {
     licenseNote = L.icLicenseOne.replace('{name}', singleCollection.name).replace('{license}', singleCollection.license);
   } else if (mode === 'search' && !selectedPrefix && renderableSearch.length > 0) {
     const licenses = [...new Set(renderableSearch.map(r => r.license).filter(Boolean))];
     if (licenses.length) licenseNote = L.icLicenseMany.replace('{licenses}', licenses.join(', '));
   }
 
   const thumbButton = (fullName, setData, iconObj, testid) => {
     const uri = svgDataUri(fullName, setData);
     if (!uri) return null;
-    return <button key={fullName} type="button" className="ved-pill" style={{width: 32, height: 32, padding: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}} data-testid={testid} title={fullName} aria-label={fullName} onClick={() => onInsert(iconObj)}><img src={uri} alt={fullName} width={THUMB_PX} height={THUMB_PX} draggable={false} /></button>;
+    return <button key={fullName} type="button" className="ved-pill" style={{width: 44, height: 44, padding: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}} data-testid={testid} title={fullName} aria-label={fullName} onClick={() => onInsert(iconObj)}><img src={uri} alt={fullName} width={THUMB_PX} height={THUMB_PX} draggable={false} /></button>;
   };
 
-  return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...collections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div>{netStatus === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(searchTotal))}</span>{searchResults.length < searchTotal ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
+  return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}><div><div className="fig-sub-lbl">{L.icCategory}</div><div data-testid="ic-category"><Select value={selectedCategory} options={categoryOptions(collections, L)} on={handleCategoryChange} /></div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...visibleCollections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div></div>{netStatus === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(selectedCategory ? searchResults.length : searchTotal))}</span>{(selectedCategory ? !searchExhausted : searchResults.length < searchTotal) ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
 };
 
-export { IconifyPanel, toPanelError };
+export { IconifyPanel, toPanelError, categoryOptions, collectionsInCategory };
 export default IconifyPanel;

=== tests/iconify-panel.test.cjs ===
--- /home/hatch/workspace/geovanta-round2/tests/iconify-panel.test.cjs.bak-modal-t2	2026-11-15 05:19:28.139731664 +0000
+++ /home/hatch/workspace/geovanta-round2/tests/iconify-panel.test.cjs	2026-11-15 05:21:21.257233356 +0000
@@ -17,20 +17,39 @@
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
+ *
+ * TASK 2 (modal Iconify) — tambahan, dicatat eksplisit untuk
+ * koordinator / Task 5: dua asersi Step 2 brief TIDAK dapat
+ * dibuktikan lewat SSR dan TIDAK dipalsukan di file ini:
+ *   (a) opsi kategori di dalam dropdown (Select hanya me-render
+ *       label nilai aktif saat tertutup; daftar opsi hidup di dalam
+ *       <Float> yang me-return null saat tertutup — jadi markup SSR
+ *       tidak pernah memuat opsi). Yang DAPAT diuji: dropdown
+ *       kategori hadir + label default "Semua kategori", dan helper
+ *       murni `categoryOptions` / `collectionsInCategory` yang
+ *       diekspor panel (preseden: `toPanelError`) diuji langsung
+ *       dengan collections yang dipasok;
+ *   (b) `ic-count` = jumlah hasil TERFILTER saat kategori aktif
+ *       (butuh efek cari async + fetch). Wiring-nya dipatok guard
+ *       sumber di bawah; perilaku hidupnya dibuktikan probe Task 5.
+ *   (c) thumbnail `<img width=40 height=40>` juga tidak ada di
+ *       markup SSR (grid hanya dirender sesudah efek loadSet/search
+ *       — tidak jalan di SSR); dipatok guard sumber THUMB_PX = 40
+ *       + tombol 44 px, dan diverifikasi visual oleh probe Task 5.
  */
 const {test} = require('node:test');
 const assert = require('node:assert/strict');
 const path = require('node:path');
 const Module = require('node:module');
 const esbuild = require('esbuild');
 const fs = require('node:fs');
 const React = require('react');
 const ReactDOMServer = require('react-dom/server');
 
@@ -136,34 +155,38 @@
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
+  // Task 2 (modal): rantai fallback browsePrefix kini 3 tautan —
+  // koleksi terpilih, lalu koleksi pertama kategori terpilih, lalu
+  // default material-symbols. Guard di bawah mematok rantai lengkap
+  // itu (bukan bentuk lama 2 tautan), supaya penghapusan fallback
+  // default tetap membuat tes ini MERAH.
   assert.match(src, /BROWSE_DEFAULT_PREFIX\s*=\s*['"]material-symbols['"]/);
-  assert.match(src, /selectedPrefix\s*\|\|\s*BROWSE_DEFAULT_PREFIX/);
+  assert.match(src, /selectedPrefix \|\| \(selectedCategory \? visibleCollections\[0\]\?\.prefix : undefined\) \|\| BROWSE_DEFAULT_PREFIX/);
   assert.match(src, /loadSet\(\s*browsePrefix\s*\)/);
   assert.match(src, /AbortController/);
   assert.match(src, /SEARCH_DEBOUNCE_MS\s*=\s*300/);
   assert.match(src, /setTimeout\([\s\S]{0,2000}?,\s*SEARCH_DEBOUNCE_MS\)/);
   assert.match(src, /ic-empty-state/);
   assert.doesNotMatch(src, /api\.iconify\.design/);
   assert.doesNotMatch(src, /cdn\.jsdelivr\.net/);
   assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
 });
 
-test('IconifyPanel toPanelError: error mentah dipetakan ke pesan generik i18n, pesan klien kontekstual diteruskan', () => {
-  const {toPanelError} = loadModule('src/components/editor/IconifyPanel.jsx');
+test('IconifyPanel toPanelError: error mentah dipetakan ke pesan generik i18n, pesan klien kontekstual diteruskan', () => {  const {toPanelError} = loadModule('src/components/editor/IconifyPanel.jsx');
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
@@ -185,10 +208,125 @@
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
+
+/* ===== Task 2 (modal Iconify): filter kategori + thumbnail 40 px ===== */
+
+const sampleCollections = [
+  {prefix: 'mdi', name: 'Material Design Icons', category: 'Material'},
+  {prefix: 'material-symbols', name: 'Material Symbols', category: 'Material'},
+  {prefix: 'tabler', name: 'Tabler Icons', category: 'General'},
+  {prefix: 'fa', name: 'Font Awesome', category: ''},
+  {prefix: 'custom', name: 'Custom Set', category: null}
+];
+
+test('IconifyPanel (Task 2) merender dropdown kategori sebaris dengan dropdown koleksi (Kategori | Koleksi)', () => {
+  const html = render(baseProps());
+  assert.match(html, /data-testid="ic-category"/);
+  assert.match(html, /Kategori/);
+  assert.match(html, />Semua kategori</);
+  assert.match(html, /data-testid="ic-collection"/);
+  assert.ok(
+    html.indexOf('data-testid="ic-category"') < html.indexOf('data-testid="ic-collection"'),
+    'dropdown kategori tampil SEBELUM (sebaris, kolom kiri) dropdown koleksi'
+  );
+});
+
+test('IconifyPanel (Task 2) label EN: dropdown kategori "Category" + "All categories"', () => {
+  const L = loadModule('src/constants/appI18n.jsx').APP_STR.en;
+  const html = render(baseProps({L}));
+  assert.match(html, /data-testid="ic-category"/);
+  assert.match(html, /Category/);
+  assert.match(html, />All categories</);
+});
+
+test('IconifyPanel (Task 2) categoryOptions: kategori unik terurut abjad + "Lainnya" untuk koleksi tanpa kategori', () => {
+  const {categoryOptions} = loadModule('src/components/editor/IconifyPanel.jsx');
+  const {APP_STR} = loadModule('src/constants/appI18n.jsx');
+  assert.deepEqual(categoryOptions(sampleCollections, APP_STR.id), [
+    ['', 'Semua kategori'],
+    ['General', 'General'],
+    ['Material', 'Material'],
+    ['__other__', 'Lainnya']
+  ]);
+  assert.deepEqual(categoryOptions(sampleCollections, APP_STR.en), [
+    ['', 'All categories'],
+    ['General', 'General'],
+    ['Material', 'Material'],
+    ['__other__', 'Other']
+  ]);
+  // Tanpa koleksi tanpa kategori: tidak ada opsi '__other__'.
+  assert.deepEqual(
+    categoryOptions(sampleCollections.slice(0, 3), APP_STR.id),
+    [['', 'Semua kategori'], ['General', 'General'], ['Material', 'Material']]
+  );
+  // Duplikat kategori hanya muncul sekali; koleksi kosong → hanya "Semua kategori".
+  assert.deepEqual(categoryOptions([], APP_STR.id), [['', 'Semua kategori']]);
+});
+
+test('IconifyPanel (Task 2) collectionsInCategory: filter per kategori, sentinel __other__ untuk tanpa kategori', () => {
+  const {collectionsInCategory} = loadModule('src/components/editor/IconifyPanel.jsx');
+  assert.deepEqual(
+    collectionsInCategory(sampleCollections, 'Material').map(c => c.prefix),
+    ['mdi', 'material-symbols']
+  );
+  assert.deepEqual(
+    collectionsInCategory(sampleCollections, 'General').map(c => c.prefix),
+    ['tabler']
+  );
+  assert.deepEqual(
+    collectionsInCategory(sampleCollections, '__other__').map(c => c.prefix),
+    ['fa', 'custom']
+  );
+  assert.deepEqual(
+    collectionsInCategory(sampleCollections, '').map(c => c.prefix),
+    ['mdi', 'material-symbols', 'tabler', 'fa', 'custom']
+  );
+  assert.deepEqual(collectionsInCategory(sampleCollections, 'TidakAda'), []);
+});
+
+test('appI18n (Task 2): kunci kategori panel Iconify ID/EN lengkap dengan nilai verbatim Task 1', () => {
+  const {APP_STR} = loadModule('src/constants/appI18n.jsx');
+  assert.equal(APP_STR.id.icCategory, 'Kategori');
+  assert.equal(APP_STR.en.icCategory, 'Category');
+  assert.equal(APP_STR.id.icAllCategories, 'Semua kategori');
+  assert.equal(APP_STR.en.icAllCategories, 'All categories');
+  assert.equal(APP_STR.id.icOtherCategory, 'Lainnya');
+  assert.equal(APP_STR.en.icOtherCategory, 'Other');
+});
+
+test('IconifyPanel source (Task 2): THUMB_PX 40, tombol thumb 44, searchIconsFiltered + ic-count terfilter + muat-lagi !exhausted + telusur koleksi pertama kategori', () => {
+  const src = panelSrc();
+  // Thumbnail 40 px (bukan 28), tombol 44 px (bukan 32).
+  assert.match(src, /THUMB_PX\s*=\s*40/);
+  assert.doesNotMatch(src, /THUMB_PX\s*=\s*28/);
+  assert.match(src, /width:\s*44,\s*height:\s*44/);
+  assert.doesNotMatch(src, /width:\s*32,\s*height:\s*32/);
+  // State kategori + helper turunan dipakai panel (bukan label display).
+  assert.match(src, /selectedCategory/);
+  assert.match(src, /categoryOptions\(collections,\s*L\)/);
+  assert.match(src, /collectionsInCategory\(collections,\s*selectedCategory\)/);
+  assert.doesNotMatch(src, /category\s*===\s*['"]Lainnya['"]/);
+  assert.doesNotMatch(src, /category\s*===\s*['"]Other['"]/);
+  // Dua kolom sebaris (Kategori | Koleksi).
+  assert.match(src, /gridTemplateColumns:\s*'1fr 1fr'/);
+  // Ganti kategori mereset koleksi bila koleksi aktif di luar kategori baru.
+  assert.match(src, /setSelectedCategory\(v\)/);
+  assert.match(src, /setSelectedPrefix\(''\)/);
+  // Telusur: kategori aktif → koleksi pertama dalam kategori itu.
+  assert.match(src, /selectedCategory \? visibleCollections\[0\]\?\.prefix : undefined/);
+  // Cari: kategori aktif → searchIconsFiltered; ic-count = hasil
+  // terfilter yang dimuat; "Muat lagi" selama !exhausted.
+  assert.match(src, /searchIconsFiltered\(q,\s*\{category: selectedCategory, collections, limit: SEARCH_LIMIT/);
+  assert.match(src, /selectedCategory \? searchResults\.length : searchTotal/);
+  assert.match(src, /selectedCategory \? !searchExhausted : searchResults\.length < searchTotal/);
+  assert.match(src, /searchIconsFiltered\(q,\s*\{category: selectedCategory, collections, limit: searchResults\.length \+ SEARCH_LIMIT/);
+  // Jalur tanpa kategori tetap searchIcons lama (total API tetap tampil).
+  assert.match(src, /searchIcons\(q,\s*\{prefix: selectedPrefix \|\| undefined, limit: SEARCH_LIMIT, signal: controller\.signal\}\)/);
+});

