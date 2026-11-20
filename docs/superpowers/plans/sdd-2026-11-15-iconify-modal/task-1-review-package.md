# Review package — Task 1: Kategori di klien + label i18n

## Files changed
- src/renderer/iconifyClient.jsx (vs .bak-modal-t1)
- src/constants/appI18n.jsx (vs .bak-modal-t1)
- tests/iconify-client.test.cjs (vs .bak-modal-t1)

## Diff stat (added/deleted lines per file)
--- src/renderer/iconifyClient.jsx: 1 removed / 34 added
--- src/constants/appI18n.jsx: 0 removed / 6 added
--- tests/iconify-client.test.cjs: 2 removed / 122 added

## Full diff (backup -> working copy, -U10)
=== src/renderer/iconifyClient.jsx ===
--- /home/hatch/workspace/geovanta-round2/src/renderer/iconifyClient.jsx.bak-modal-t1	2026-11-15 05:14:15.286741215 +0000
+++ /home/hatch/workspace/geovanta-round2/src/renderer/iconifyClient.jsx	2026-11-15 05:14:49.940075700 +0000
@@ -92,20 +92,52 @@
   });
   return {
     icons,
     total: data?.total ?? icons.length,
     limit: data?.limit ?? limit,
     start: data?.start ?? start,
     collections
   };
 }
 
+// Cari ikon terfilter kategori (modal Iconify, Task 1). `category` adalah
+// string kategori mentah dari API, atau sentinel '__other__' untuk koleksi
+// tanpa kategori (ruling R1 — jangan bandingkan dengan label display
+// "Lainnya"/"Other" yang bergantung bahasa). Tanpa kategori: delegasi satu
+// halaman searchIcons. Dengan kategori: loop halaman demi halaman sampai
+// `limit` kecocokan terkumpul atau `start >= total` API. AbortError
+// diteruskan apa adanya; error lain memakai pesan kontekstual searchIcons.
+export async function searchIconsFiltered(query, {category, collections, limit = 48, signal} = {}) {
+  if (!category) {
+    const {icons, total} = await searchIcons(query, {limit, start: 0, signal});
+    return {icons, exhausted: icons.length >= total};
+  }
+  const allowedPrefixes = new Set(
+    (Array.isArray(collections) ? collections : [])
+      .filter((c) => (category === '__other__' ? !c?.category : c?.category === category))
+      .map((c) => c.prefix)
+  );
+  const icons = [];
+  let start = 0;
+  let total = Infinity;
+  while (icons.length < limit && start < total) {
+    const page = await searchIcons(query, {limit, start, signal});
+    total = page.total ?? page.icons.length;
+    for (const icon of page.icons) {
+      if (allowedPrefixes.has(icon.prefix)) icons.push(icon);
+      if (icons.length >= limit) break;
+    }
+    start += limit;
+  }
+  return {icons: icons.slice(0, limit), exhausted: start >= total};
+}
+
 // Daftar koleksi, diambil sekali per sesi (promise di-memoize; bila gagal,
 // cache dibersihkan agar percobaan berikutnya mencoba lagi).
 let collectionsPromise = null;
 export function listCollections() {
   if (!collectionsPromise) {
     collectionsPromise = (async () => {
       let res;
       try {
         res = await fetchWithTimeout(`${ICONIFY_API_BASE}/collections`, COLLECTIONS_TIMEOUT_MS);
       } catch (e) {
@@ -116,21 +148,22 @@
       if (!res.ok) throw new Error(`Gagal memuat daftar koleksi ikon (HTTP ${res.status})`);
       const data = await res.json();
       const entries = Array.isArray(data)
         ? data.map((c) => [c?.prefix, c])
         : Object.entries(data ?? {});
       return entries.map(([pfx, c]) => ({
         prefix: pfx,
         name: c?.name ?? pfx,
         total: c?.total ?? 0,
         license: typeof c?.license === 'string' ? c.license : (c?.license?.spdx || c?.license?.title || null),
-        palette: c?.palette === true
+        palette: c?.palette === true,
+        category: c?.category ?? null
       }));
     })();
     collectionsPromise.catch(() => { collectionsPromise = null; });
   }
   return collectionsPromise;
 }
 
 // Muat satu set JSON dari CDN, sekali per set per sesi (Map memori; bila
 // gagal, entri dibersihkan agar percobaan berikutnya mencoba lagi).
 // Menolak bila body > 10 MB (diukur dari byteLength arrayBuffer — R9)

=== src/constants/appI18n.jsx ===
--- /home/hatch/workspace/geovanta-round2/src/constants/appI18n.jsx.bak-modal-t1	2026-11-15 05:14:15.288436878 +0000
+++ /home/hatch/workspace/geovanta-round2/src/constants/appI18n.jsx	2026-11-15 05:14:51.223075690 +0000
@@ -392,20 +392,23 @@
     rcFamily_rose: 'Merah Muda',
     rcFamily_gray: 'Abu-abu',
     rcOverride: 'Override',
     rcRemoveOverride: 'Hapus override',
     rcEmpty: 'Tidak ada warna yang bisa diubah',
     icTitle: 'Ikon',
     icSearchPlaceholder: 'Cari ikon… contoh: home',
     icSearchHint: 'Cari dalam bahasa Inggris',
     icCollection: 'Koleksi',
     icAllCollections: 'Semua koleksi',
+    icCategory: 'Kategori',
+    icAllCategories: 'Semua kategori',
+    icOtherCategory: 'Lainnya',
     icRecent: 'Terakhir dipakai',
     icLicenseOne: '{name} — Lisensi: {license}',
     icLicenseMany: 'Lisensi ikon yang tampil: {licenses}',
     icEmptySearch: 'Tidak ada ikon yang cocok dengan "{q}". Coba kata kunci lain dalam bahasa Inggris.',
     icEmptyBrowse: 'Koleksi ini belum memiliki ikon.',
     icLoading: 'Memuat ikon…',
     icOffline: 'Perlu internet untuk mencari ikon',
     icErrorGeneric: 'Gagal memuat ikon. Periksa koneksi internet, lalu coba lagi.',
     icLoadMore: 'Muat lagi',
     icResults: '{n} ikon ditemukan',
@@ -850,20 +853,23 @@
     rcFamily_rose: 'Rose',
     rcFamily_gray: 'Gray',
     rcOverride: 'Override',
     rcRemoveOverride: 'Remove override',
     rcEmpty: 'No colors to change',
     icTitle: 'Icons',
     icSearchPlaceholder: 'Search icons… e.g. home',
     icSearchHint: 'Search in English',
     icCollection: 'Collection',
     icAllCollections: 'All collections',
+    icCategory: 'Category',
+    icAllCategories: 'All categories',
+    icOtherCategory: 'Other',
     icRecent: 'Recently used',
     icLicenseOne: '{name} — License: {license}',
     icLicenseMany: 'Licenses of icons shown: {licenses}',
     icEmptySearch: 'No icons match "{q}". Try another keyword in English.',
     icEmptyBrowse: 'This collection has no icons yet.',
     icLoading: 'Loading icons…',
     icOffline: 'Internet is required to search icons',
     icErrorGeneric: 'Failed to load icons. Check your internet connection, then try again.',
     icLoadMore: 'Load more',
     icResults: '{n} icons found',

=== tests/iconify-client.test.cjs ===
--- /home/hatch/workspace/geovanta-round2/tests/iconify-client.test.cjs.bak-modal-t1	2026-11-15 05:14:15.290175887 +0000
+++ /home/hatch/workspace/geovanta-round2/tests/iconify-client.test.cjs	2026-11-15 05:14:52.721075679 +0000
@@ -141,22 +141,22 @@
     return jsonResponse({
       mdi: {name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false},
       tabler: {name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false}
     });
   });
   const a = await mod.listCollections();
   const b = await mod.listCollections();
   assert.equal(calls, 1);
   assert.deepEqual(urls, [`${API}/collections`]);
   assert.deepEqual(a, [
-    {prefix: 'mdi', name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false},
-    {prefix: 'tabler', name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false}
+    {prefix: 'mdi', name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false, category: null},
+    {prefix: 'tabler', name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false, category: null}
   ]);
   assert.deepEqual(b, a);
 });
 
 test('loadSet("mdi") fetch icons.json CDN sekali untuk dua panggilan + mengembalikan width/height/icons', async (t) => {
   const mod = fresh();
   let calls = 0;
   const urls = [];
   installFetch(t, async (url) => {
     calls += 1;
@@ -272,10 +272,130 @@
     urls.push(url);
     throw new TypeError('Failed to fetch');
   });
   assert.equal(await mod.probeOnline(), false);
   assert.deepEqual(urls, [`${API}/version`]);
 
   const mod2 = fresh();
   installFetch(t, async () => ({ok: true, status: 200}));
   assert.equal(await mod2.probeOnline(), true);
 });
+
+// --- Task 1 (sdd-2026-11-15-iconify-modal): kategori di klien + label i18n ---
+
+test('listCollections() mengembalikan category dari API dan null bila field tidak ada', async (t) => {
+  const mod = fresh();
+  installFetch(t, async () => jsonResponse({
+    'material-symbols': {name: 'Material Symbols', total: 12000, license: 'Apache-2.0', palette: false, category: 'Material'},
+    mdi: {name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false}
+  }));
+  const cols = await mod.listCollections();
+  assert.equal(cols[0].category, 'Material');
+  assert.equal(cols[1].category, null);
+});
+
+test('searchIconsFiltered memfilter hasil /search ke prefix dalam kategori aktif', async (t) => {
+  const mod = fresh();
+  installFetch(t, async () => jsonResponse({
+    icons: ['mdi:home', 'tabler:home', 'mdi:account', 'tabler:settings'],
+    total: 4,
+    limit: 48,
+    start: 0,
+    collections: {
+      mdi: {name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false},
+      tabler: {name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false}
+    }
+  }));
+  const res = await mod.searchIconsFiltered('home', {
+    category: 'Material',
+    collections: [{prefix: 'mdi', category: 'Material'}, {prefix: 'tabler', category: 'General'}],
+    limit: 48
+  });
+  assert.deepEqual(res.icons.map((i) => i.name), ['mdi:home', 'mdi:account']);
+  assert.equal(res.exhausted, true);
+});
+
+test('searchIconsFiltered berhenti setelah total API habis: 2 halaman tanpa kecocokan -> exhausted true, fetch tepat 2 kali', async (t) => {
+  const mod = fresh();
+  let calls = 0;
+  installFetch(t, async (url) => {
+    calls += 1;
+    const start = Number(new URL(url).searchParams.get('start') || 0);
+    return jsonResponse({
+      icons: ['tabler:home', 'tabler:settings'],
+      total: 96,
+      limit: 48,
+      start,
+      collections: {
+        tabler: {name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false}
+      }
+    });
+  });
+  const res = await mod.searchIconsFiltered('home', {
+    category: 'Material',
+    collections: [{prefix: 'mdi', category: 'Material'}, {prefix: 'tabler', category: 'General'}],
+    limit: 48
+  });
+  assert.deepEqual(res.icons, []);
+  assert.equal(res.exhausted, true);
+  assert.equal(calls, 2);
+});
+
+test("searchIconsFiltered dengan kategori '__other__' hanya mengembalikan ikon dari koleksi tanpa kategori (R1)", async (t) => {
+  const mod = fresh();
+  installFetch(t, async () => jsonResponse({
+    icons: ['mdi:home', 'tabler:home', 'custom:home'],
+    total: 3,
+    limit: 48,
+    start: 0,
+    collections: {
+      mdi: {name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false},
+      tabler: {name: 'Tabler Icons', total: 6594, license: 'MIT', palette: false},
+      custom: {name: 'Custom Set', total: 10, license: 'MIT', palette: false}
+    }
+  }));
+  const res = await mod.searchIconsFiltered('home', {
+    category: '__other__',
+    collections: [
+      {prefix: 'mdi', category: 'Material'},
+      {prefix: 'tabler', category: null},
+      {prefix: 'custom', category: ''}
+    ],
+    limit: 48
+  });
+  assert.deepEqual(res.icons.map((i) => i.name), ['tabler:home', 'custom:home']);
+  assert.equal(res.exhausted, true);
+});
+
+test('searchIconsFiltered tanpa kategori mendelegasi satu halaman searchIcons (exhausted dari total)', async (t) => {
+  const mod = fresh();
+  let calls = 0;
+  installFetch(t, async () => {
+    calls += 1;
+    return jsonResponse({
+      icons: Array.from({length: 48}, (_, i) => `mdi:icon-${i}`),
+      total: 100,
+      limit: 48,
+      start: 0,
+      collections: {
+        mdi: {name: 'Material Design Icons', total: 7638, license: 'Apache-2.0', palette: false}
+      }
+    });
+  });
+  const res = await mod.searchIconsFiltered('home', {
+    collections: [{prefix: 'mdi', category: 'Material'}],
+    limit: 48
+  });
+  assert.equal(calls, 1);
+  assert.equal(res.icons.length, 48);
+  assert.equal(res.exhausted, false);
+});
+
+test('appI18n: label kategori Iconify ID/EN (icCategory/icAllCategories/icOtherCategory)', () => {
+  const {getAppStr} = loadModule('src/constants/appI18n.jsx');
+  assert.equal(getAppStr('id').icCategory, 'Kategori');
+  assert.equal(getAppStr('id').icAllCategories, 'Semua kategori');
+  assert.equal(getAppStr('id').icOtherCategory, 'Lainnya');
+  assert.equal(getAppStr('en').icCategory, 'Category');
+  assert.equal(getAppStr('en').icAllCategories, 'All categories');
+  assert.equal(getAppStr('en').icOtherCategory, 'Other');
+});

