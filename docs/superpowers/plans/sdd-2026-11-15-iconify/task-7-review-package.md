=== TASK 7 REVIEW PACKAGE ===

--- New files ---
probes/probe-iconify-offline.cjs (12 assertions)
probes/shots/iconify-t7-offline.png
probes/shots/iconify-t7-offline-reinsert.png
docs/superpowers/plans/sdd-2026-11-15-iconify/task-7-report.md

--- Modified files (each with .bak-iconify-t7 backup) ---
-rw-rw---- 1 root root  53766 Nov 15 03:09 src/components/editor/EditorRightInspector.jsx.bak-iconify-t7
-rw-rw---- 1 root root  15927 Nov 15 03:09 src/components/editor/IconifyPanel.jsx.bak-iconify-t7
-rw-rw---- 1 root root 363852 Nov 15 03:09 src/components/editor/VectorEditor.jsx.bak-iconify-t7
-rw-rw---- 1 root root   1941 Nov 15 03:09 src/constants/themeAndPrefsConstants.jsx.bak-iconify-t7
-rw-rw---- 1 root root  16345 Nov 15 03:09 src/utils/themeAndPrefsManager.jsx.bak-iconify-t7
src/renderer/iconifyClient.jsx UNCHANGED per R4

--- Diff: src/components/editor/IconifyPanel.jsx ---
--- src/components/editor/IconifyPanel.jsx.bak-iconify-t7	2026-11-15 03:09:36.944809031 +0000
+++ src/components/editor/IconifyPanel.jsx	2026-11-15 03:09:53.945776381 +0000
@@ -7,9 +7,17 @@
  *
  * Kontrak (design §7 butir 1, 2, 3, 7, 9; plan Task 4):
  * - Props: `onInsert(icon)`, `onClose()`, `status` ("online" | "offline"
- *   | "loading" — stub untuk Task 7, yang memasok status dari probe),
+ *   | "loading" — nilai AWAL saja; Task 7: panel memiliki status
+ *   online/offline sendiri via probeOnline + listener online/offline,
+ *   karena Task 5 tidak memasok prop ini — R19 jalur internal),
  *   `L` (label appI18n), `recentIcons` (nama ikon dari prefs, Task 7
  *   yang memasok; panel hanya menampilkan maks. 12 nama), `open`.
+ * - Offline (Task 7): efek listCollections/loadSet/searchIcons hanya
+ *   jalan saat status internal 'online' (probeOnline 3 detik saat
+ *   dibuka); saat 'offline' panel menampilkan L.icOffline
+ *   ("Perlu internet untuk mencari ikon", Task 2) dan baris recent
+ *   tetap tampil nama saja; klik recent memakai cache set di memori
+ *   bila ada (loadSet Task 3) dan gagal lewat toast Task 6 bila tidak.
  * - State awal: mode telusur koleksi Material Symbols via
  *   loadSet("material-symbols"); begitu user mengetik, panel beralih
  *   ke mode cari lintas set via API.
@@ -45,7 +53,7 @@
 import React, { useState, useEffect, useRef } from 'react';
 import { CustomTextBox } from '../ui/CustomTextBox.jsx';
 import { Select } from '../ui/SelectDropdown.jsx';
-import { searchIcons, listCollections, loadSet, buildIconSvg, isPaletteIcon } from '../../renderer/iconifyClient.jsx';
+import { searchIcons, listCollections, loadSet, buildIconSvg, isPaletteIcon, probeOnline } from '../../renderer/iconifyClient.jsx';
 
 const BROWSE_DEFAULT_PREFIX = 'material-symbols';
 const SEARCH_DEBOUNCE_MS = 300;
@@ -118,6 +126,29 @@
   const searchAbortRef = useRef(null);
   const setsRef = useRef({});
 
+  /* Task 7 (R19 jalur internal): panel memiliki status online/offline
+     sendiri — prop `status` hanya nilai awal (Task 5 tidak memasoknya;
+     tes SSR Task 4 mengandalkan nilai awal ini). Saat dibuka,
+     probeOnline() (3 detik, Task 3) menentukan status; listener
+     online/offline memperbaruinya saat koneksi berubah. Efek jaringan
+     di bawah di-gate pada netStatus === 'online' — saat offline atau
+     masih probing, tidak ada request listCollections/loadSet/search. */
+  const [netStatus, setNetStatus] = useState(status);
+  useEffect(() => {
+    if (!open) return;
+    let cancelled = false;
+    probeOnline().then(ok => { if (!cancelled) setNetStatus(ok ? 'online' : 'offline'); });
+    const onOn = () => setNetStatus('online');
+    const onOff = () => setNetStatus('offline');
+    window.addEventListener('online', onOn);
+    window.addEventListener('offline', onOff);
+    return () => {
+      cancelled = true;
+      window.removeEventListener('online', onOn);
+      window.removeEventListener('offline', onOff);
+    };
+  }, [open]);
+
   const mode = query.trim() ? 'search' : 'browse';
   const browsePrefix = selectedPrefix || BROWSE_DEFAULT_PREFIX;
   const recentNames = (Array.isArray(recentIcons) ? recentIcons : []).slice(0, RECENT_MAX);
@@ -139,19 +170,23 @@
   }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
 
   /* Daftar koleksi sekali saat panel dibuka; gagal memuat tidak
-     mematikan panel (dropdown fallback ke "Semua koleksi"). */
+     mematikan panel (dropdown fallback ke "Semua koleksi").
+     Task 7: di-gate — hanya saat online (probe selesai). */
   useEffect(() => {
-    if (!open) return;
+    if (!open || netStatus !== 'online') return;
     let cancelled = false;
     listCollections().then(cs => { if (!cancelled) setCollections(cs); }).catch(() => {});
     return () => { cancelled = true; };
-  }, [open]);
+  }, [open, netStatus]);
 
   /* Muat set koleksi yang sedang ditelusur (default Material Symbols).
      loadSet di-memoize per set di klien — kembali ke telusur sesudah
-     cari tidak mengunduh ulang. */
+     cari tidak mengunduh ulang. Task 7: di-gate — hanya saat online;
+     gagal memuat menampilkan pesan per-set (browseError) tanpa
+     mematikan panel (Task 2: pesan per-set memang dibutuhkan, bukan
+     satu pesan global — API bisa hidup saat CDN mati). */
   useEffect(() => {
-    if (!open || mode !== 'browse') return;
+    if (!open || mode !== 'browse' || netStatus !== 'online') return;
     let cancelled = false;
     setBrowseLoading(true);
     setBrowseError(null);
@@ -159,7 +194,7 @@
       .then(sd => { if (!cancelled) { setBrowseSet(sd); setBrowseLoading(false); } })
       .catch(e => { if (!cancelled) { setBrowseError(toPanelError(e, L.icErrorGeneric)); setBrowseLoading(false); } });
     return () => { cancelled = true; };
-  }, [open, mode, browsePrefix]);
+  }, [open, mode, browsePrefix, netStatus]);
 
   // Muat set JSON untuk prefix-prefix yang belum ada di cache sesi;
   // kegagalan per set dicatat (bukan dilempar) supaya ikon dari set
@@ -178,7 +213,9 @@
   };
 
   /* Cari (debounce ~300 ms, request basi dibatalkan). Query kosong =
-     kembali ke mode telusur. AbortError diabaikan (bukan kegagalan). */
+     kembali ke mode telusur. AbortError diabaikan (bukan kegagalan).
+     Task 7: di-gate — tidak ada request cari saat offline / masih
+     probing; efek jalan ulang saat probe selesai (dep netStatus). */
   useEffect(() => {
     const q = query.trim();
     if (!q) {
@@ -189,6 +226,7 @@
       setSearching(false);
       return;
     }
+    if (netStatus !== 'online') return;
     const t = setTimeout(() => {
       if (searchAbortRef.current) searchAbortRef.current.abort();
       const controller = new AbortController();
@@ -214,7 +252,7 @@
       clearTimeout(t);
       if (searchAbortRef.current) searchAbortRef.current.abort();
     };
-  }, [query, selectedPrefix]); // eslint-disable-line react-hooks/exhaustive-deps
+  }, [query, selectedPrefix, netStatus]); // eslint-disable-line react-hooks/exhaustive-deps
 
   // "Muat lagi" hasil cari: halaman berikut via start (limit tetap 48).
   const handleLoadMoreSearch = () => {
@@ -268,7 +306,7 @@
     return <button key={fullName} type="button" className="ved-pill" style={{width: 32, height: 32, padding: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}} data-testid={testid} title={fullName} aria-label={fullName} onClick={() => onInsert(iconObj)}><img src={uri} alt={fullName} width={THUMB_PX} height={THUMB_PX} draggable={false} /></button>;
   };
 
-  return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...collections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div>{status === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(renderableSearch.length))}</span>{searchResults.length < searchTotal ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
+  return <div className="fig-isec fade" data-testid="ic-panel"><div className="fig-isec-title"><span>{L.icTitle}</span><button type="button" className="fig-ibtn" onClick={onClose} aria-label={L.frClose} data-testid="ic-close">×</button></div><div className="space-y-3"><div><div className="fld flex items-center px-1.5 py-1" style={{height: 30}} data-testid="ic-search"><CustomTextBox value={query} ariaLabel={L.icSearchPlaceholder} placeholder={L.icSearchPlaceholder} onChange={v => setQuery(v)} /></div><div className="text-[11px] mut mt-1">{L.icSearchHint}</div></div><div><div className="fig-sub-lbl">{L.icCollection}</div><div data-testid="ic-collection"><Select value={selectedPrefix} searchable searchPlaceholder={L.icCollection} options={[['', L.icAllCollections], ...collections.map(c => [c.prefix, c.name])]} on={v => setSelectedPrefix(v)} /></div></div>{netStatus === 'offline' ? <div data-testid="ic-offline" className="text-[11px]">{L.icOffline}</div> : mode === 'search' ? <div>{searching ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : searchError ? <div data-testid="ic-error" className="text-[11px]">{searchError}</div> : searchResults.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptySearch.replace('{q}', query.trim())}</div> : renderableSearch.length === 0 ? <div data-testid="ic-error" className="text-[11px]">{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}</div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] mut" data-testid="ic-count">{L.icResults.replace('{n}', String(renderableSearch.length))}</span>{searchResults.length < searchTotal ? <button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={handleLoadMoreSearch}>{L.icLoadMore}</button> : null}</div></>}</div> : browseLoading ? <div data-testid="ic-loading" className="text-[11px] mut">{L.icLoading}</div> : browseError ? <div data-testid="ic-error" className="text-[11px]">{browseError}</div> : browseNames.length === 0 ? <div data-testid="ic-empty-state" className="text-[11px] mut">{L.icEmptyBrowse}</div> : <><div className="flex flex-wrap gap-1" data-testid="ic-grid">{visibleBrowseNames.map(short => thumbButton(`${browsePrefix}:${short}`, browseSet, {name: `${browsePrefix}:${short}`, prefix: browsePrefix, palette: isPaletteIcon(short, browseSet), license: collectionByPrefix(browsePrefix)?.license ?? null}, `ic-icon-${browsePrefix}:${short}`))}</div>{browseNames.length > visibleBrowse ? <div className="pt-1"><button type="button" className="ved-pill text-[10px]" style={{padding: '2px 6px'}} data-testid="ic-load-more" onClick={() => setVisibleBrowse(v => v + PAGE_SIZE)}>{L.icLoadMore}</button></div> : null}</>}{recentNames.length > 0 ? <div data-testid="ic-recent"><div className="fig-sub-lbl">{L.icRecent}</div><div className="flex flex-wrap gap-1">{recentNames.map(name => <button key={name} type="button" className="ved-pill text-[11px]" style={{padding: '2px 6px'}} data-testid={`ic-recent-${name}`} title={name} onClick={() => onInsert({name})}>{name}</button>)}</div></div> : null}{licenseNote ? <div data-testid="ic-license" className="text-[11px] mut">{licenseNote}</div> : null}</div></div>;
 };
 
 export { IconifyPanel, toPanelError };
--- Diff: src/components/editor/VectorEditor.jsx ---
--- src/components/editor/VectorEditor.jsx.bak-iconify-t7	2026-11-15 03:09:36.949187669 +0000
+++ src/components/editor/VectorEditor.jsx	2026-11-15 03:10:03.782776305 +0000
@@ -143,6 +143,23 @@
       return { ...prev, recentColors: next };
     });
   };
+  /* Ikon terakhir (Task 7, Iconify): maks. 12 nama PENUH "prefix:nama"
+     dari sisipan yang berhasil, disimpan di prefs.recentIcons (App yang
+     me-persist via savePrefs). Hanya nama penuh yang dicatat — nama
+     pendek tanpa ":" tidak bisa di-resolve insert Task 6 (prefix
+     diturunkan dari nama; tanpa ":" -> toast, nol objek), jadi nama
+     seperti itu tidak pernah disimpan. Pola rememberRecentColor. */
+  const rememberRecentIcon = fullName => {
+    if (typeof setPrefs !== 'function' || typeof fullName !== 'string') return;
+    const name = fullName.trim();
+    if (!name.includes(':')) return;
+    setPrefs(prev => {
+      const cur = Array.isArray(prev && prev.recentIcons) ? prev.recentIcons : [];
+      const next = [name, ...cur.filter(c => c !== name)].slice(0, 12);
+      if (next.length === cur.length && next.every((c, i) => c === cur[i])) return prev;
+      return { ...prev, recentIcons: next };
+    });
+  };
   const vectorDocument = normalizeTextDocument;
   const documentForExport = d => d;
   const first = React.useMemo(() => {
@@ -265,6 +282,12 @@
       commit({ ...cur, objects: [...cur.objects, ...news] }, null);
       setSel({ objs: new Set(news.map(o => o.id)), nodes: new Set() });
       say('Ikon ' + fullName + ' disisipkan');
+      /* Task 7: hanya sisipan BERHASIL yang dicatat sebagai recent —
+         nama penuh "prefix:nama" (rememberRecentIcon menolak nama
+         tanpa ":"). setPrefs adalah setter state React App yang
+         identitasnya stabil, jadi closure useCallback([]) di sini
+         yang menangkap instans pertama tetap benar. */
+      rememberRecentIcon(fullName);
     } catch (e) {
       say('Gagal menyisipkan ikon ' + fullName + ': ' + (e && e.message || 'kesalahan tidak diketahui'));
     }
@@ -8968,7 +8991,7 @@
               onImportFont={() => pickFiles('.ttf,.otf,font/ttf,font/otf', fs => importFontFiles(fs))}
               onConvertToPath={convertTextSelectionToPath}
             />;
-          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} onIconifyClose={onIconifyClose} onIconifyInsert={onIconifyInsert} /></div>{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
+          })() : null} tool={tool} blobParams={blobParams} onBlobParams={onBlobParams} weaveParams={weaveParams} onWeaveParams={onWeaveParams} arcParams={arcParams} onArcParams={onArcParams} onIconifyClose={onIconifyClose} onIconifyInsert={onIconifyInsert} recentIcons={prefs && prefs.recentIcons || []} /></div>{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
       if (e.target === e.currentTarget) setImportModalOpen(false);
     }}><div className="hp" role="dialog" aria-label="Impor Berkas" style={{
         maxWidth: 480
--- Diff: src/components/editor/EditorRightInspector.jsx ---
--- src/components/editor/EditorRightInspector.jsx.bak-iconify-t7	2026-11-15 03:09:36.950879507 +0000
+++ src/components/editor/EditorRightInspector.jsx	2026-11-15 03:10:08.516776269 +0000
@@ -141,10 +141,13 @@
   arcParams,
   onArcParams,
   /* Task 5 (Iconify, R17): panel dimount di sini (Opsi A) sebagai seksi
-     .fig-isec di .fig-r-scroll — lihat render di bawah. `status` /
-     `recentIcons` baru dipasok Task 7 (panel memakai default-nya). */
+     .fig-isec di .fig-r-scroll — lihat render di bawah. `recentIcons`
+     dipasok Task 7 dari prefs (nama penuh "prefix:nama", maks. 12);
+     `status` TIDAK dipasok — panel memiliki status online/offline
+     sendiri (R19 jalur internal, probeOnline + listener). */
   onIconifyClose,
-  onIconifyInsert
+  onIconifyInsert,
+  recentIcons = []
 }) => {
   /* T13 (D-I4): SATU primer per tampilan di inspector. "Terapkan" hanya
      primer bila ada perubahan auto-layout yang belum diterapkan; bila tidak
@@ -204,7 +207,7 @@
         alignItems: 'center',
         justifyContent: 'center',
         textAlign: 'center'
-      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{tool === 'iconify' && <IconifyPanel open onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} />}{(() => {
+      }} data-tip="veZoomFit" onClick={fitView}>{L.riFit}</button></div></div><div className="fig-r-scroll">{textControls}{tool === 'iconify' && <IconifyPanel open onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={recentIcons} />}{(() => {
   /* Seksi "Parameter tool" (Task 2): switch per tool — Task 3 (Weave) dan
      Task 5 (Arc) menambahkan cabang mereka sendiri di sini. Tool AKTIF menang
      atas fallback seleksi (fix round 1 Task 3): bila tool adalah generator,
--- Diff: src/constants/themeAndPrefsConstants.jsx ---
--- src/constants/themeAndPrefsConstants.jsx.bak-iconify-t7	2026-11-15 03:09:36.951776512 +0000
+++ src/constants/themeAndPrefsConstants.jsx	2026-11-15 03:10:08.530776269 +0000
@@ -12,7 +12,8 @@
   accent: '#13b152',
   m3White: true,
   lang: 'id',
-  recentColors: []
+  recentColors: [],
+  recentIcons: []
 };
 const ACCENT_PALETTE = [['#13b152', 'Geovanta'], ['#0d99ff', 'Figma Blue'], ['#6366f1', 'Indigo'], ['#8b5cf6', 'Violet'], ['#ec4899', 'Pink'], ['#f43f5e', 'Rose'], ['#f97316', 'Orange'], ['#f59e0b', 'Amber'], ['#84cc16', 'Lime'], ['#10b981', 'Emerald'], ['#14b8a6', 'Teal'], ['#06b6d4', 'Cyan'], ['#ef4444', 'Red'], ['#eab308', 'Yellow'], ['#22c55e', 'Green'], ['#0ea5e9', 'Sky'], ['#3b82f6', 'Blue'], ['#a855f7', 'Purple'], ['#d946ef', 'Fuchsia'], ['#dc2626', 'Crimson'], ['#ff6b6b', 'Coral'], ['#4f46e5', 'Royal'], ['#65a30d', 'Olive'], ['#b45309', 'Bronze'], ['#475569', 'Slate']];
 const TECH = [{
--- Diff: src/utils/themeAndPrefsManager.jsx ---
--- src/utils/themeAndPrefsManager.jsx.bak-iconify-t7	2026-11-15 03:09:36.956443963 +0000
+++ src/utils/themeAndPrefsManager.jsx	2026-11-15 03:10:08.532776269 +0000
@@ -55,6 +55,13 @@
     if (Array.isArray(p.recentColors)) {
       p.recentColors = p.recentColors.filter(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 10);
     }
+    /* Task 7 (Iconify): tegakkan batas 12 nama PENUH "prefix:nama" juga
+       di jalur muat — nama pendek tanpa ":" tidak bisa di-resolve
+       insert (Task 6) dan tidak pernah ditulis rememberRecentIcon,
+       jadi entri seperti itu (seed/prefs lama) dibuang di sini. */
+    if (Array.isArray(p.recentIcons)) {
+      p.recentIcons = p.recentIcons.filter(n => typeof n === 'string' && n.includes(':')).slice(0, 12);
+    }
     if (!p.m3White) {
       p.theme = 'light';
       p.m3White = true;

--- Summary (per report) ---
IconifyPanel.jsx: +~40 (netStatus internal, probeOnline+listeners, gating 3 effects, offline render, per-set error)
VectorEditor.jsx: rememberRecentIcon (+17), call after successful commit, recentIcons prop to inspector
EditorRightInspector.jsx: recentIcons=[] prop passthrough to IconifyPanel
themeAndPrefsConstants.jsx: DEFAULT_PREFS.recentIcons: []
themeAndPrefsManager.jsx: loadPrefs sanitization (only ':' names, cap 12)
Offline probe: 12/12 green in 2 identical runs; npm test 299/299; build exit 0 (per report).
R19: internal-panel path taken; parent-driven wiring NOT used.
