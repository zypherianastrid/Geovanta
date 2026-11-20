### Task 1: Kategori di klien + label i18n

**Files:**
- Modify: `src/renderer/iconifyClient.jsx`
- Modify: `src/constants/appI18n.jsx`
- Test: `tests/iconify-client.test.cjs`

**Interfaces:**
- Consumes: `ICONIFY_API_BASE` (sudah ada), `searchIcons(query, {prefix, limit, start, signal})` (sudah ada).
- Produces: `listCollections()` mengembalikan tiap koleksi dengan `category: string | null` tambahan; `searchIconsFiltered(query, {category, collections, limit = 48, signal}) -> Promise<{icons, exhausted}>` — `icons` = hasil terfilter (maks. 48), `exhausted` = true bila sudah tidak ada halaman API lagi; label `icCategory` / `icAllCategories` / `icOtherCategory` (ID + EN).

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/renderer/iconifyClient.jsx src/renderer/iconifyClient.jsx.bak-modal-t1
cp src/constants/appI18n.jsx src/constants/appI18n.jsx.bak-modal-t1
cp tests/iconify-client.test.cjs tests/iconify-client.test.cjs.bak-modal-t1
```

- [ ] **Step 2: Write the failing test** — di `tests/iconify-client.test.cjs`, dengan `fetch` mock seperti tes yang sudah ada:
  - `listCollections` mengembalikan `category: 'Material'` untuk `material-symbols` dan `category: null` bila field tidak ada di respons API.
  - `searchIconsFiltered('home', {category: 'Material', collections: [{prefix: 'mdi', category: 'Material'}, {prefix: 'tabler', category: 'General'}], limit: 48})` hanya mengembalikan ikon ber-prefix `mdi` bila mock `/search` mengembalikan campuran `mdi:*` + `tabler:*`.
  - `searchIconsFiltered` berhenti setelah total API habis: mock `/search` mengembalikan 2 halaman tanpa satu pun kecocokan dalam kategori → `exhausted === true` dan jumlah pemanggilan `fetch` tepat 2 (Review Focus #3).
  - Label: `getAppStr('id').icCategory === 'Kategori'`, `icAllCategories === 'Semua kategori'`, `icOtherCategory === 'Lainnya'`; EN: `'Category'`, `'All categories'`, `'Other'`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test 2>&1 | tail -5`
Expected: FAIL — `listCollections` belum punya `category`, `searchIconsFiltered` belum ada, label belum ada.

- [ ] **Step 4: Implement di `src/renderer/iconifyClient.jsx`**
  - `listCollections()`: tambah `category: c?.category ?? null` pada objek yang dikembalikan (satu field, tidak ada perubahan lain).
  - `searchIconsFiltered(query, {category, collections, limit = 48, signal})`: bila `category` kosong, delegasi langsung ke `searchIcons` satu halaman (start 0) dan kembalikan `{icons, exhausted: icons.length >= total}`; bila kategori aktif, hitung `allowedPrefixes` dari `collections` yang `category`-nya sama (koleksi tanpa `category` masuk `'Lainnya'` — bandingkan dengan `category === 'Lainnya'` bila yang dipilih adalah label Lainnya, bukan string mentah), lalu loop `searchIcons` halaman demi halaman (mulai `start = 0`, naik `limit` tiap halaman) sambil mengumpulkan kecocokan sampai 48 terkumpul atau `start >= total` API. Aborsi (`AbortError`) diteruskan apa adanya; timeout/error lain mengikuti pesan kontekstual `searchIcons` yang sudah ada.

- [ ] **Step 5: Implement label di `src/constants/appI18n.jsx`** — tambah ketiga label tepat sesudah `icAllCollections` di blok ID dan blok EN (nilai persis seperti Step 2).

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test 2>&1 | tail -5`
Expected: PASS, suite tetap 300/300 + tes baru (sebutkan jumlah baru di laporan).

- [ ] **Step 7: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-1-report.md` (file diubah, hasil tes, batasan).

