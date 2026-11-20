### Task 2: Filter kategori + thumbnail 40 px di panel

**Files:**
- Modify: `src/components/editor/IconifyPanel.jsx`
- Test: `tests/iconify-panel.test.cjs`

**Interfaces:**
- Consumes: `listCollections()` (dengan `category`, dari Task 1), `searchIconsFiltered()` (dari Task 1), label `icCategory` / `icAllCategories` / `icOtherCategory` (dari Task 1), komponen `Select` (sudah dipakai dropdown koleksi).
- Produces: panel dengan state `selectedCategory` (`''` = semua kategori); dropdown kategori + koleksi sebaris; `THUMB_PX = 40` (tombol 44 px).

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/components/editor/IconifyPanel.jsx src/components/editor/IconifyPanel.jsx.bak-modal-t2
cp tests/iconify-panel.test.cjs tests/iconify-panel.test.cjs.bak-modal-t2
```

- [ ] **Step 2: Write the failing test** — di `tests/iconify-panel.test.cjs` (SSR `renderToStaticMarkup`, pola yang sudah ada):
  - Panel me-render dropdown kategori (`data-testid="ic-category"`) dengan opsi "Semua kategori" + kategori unik dari `collections` yang dipasok (termasuk "Lainnya" bila ada koleksi tanpa `category`).
  - `THUMB_PX` — thumbnail `<img>` di-render dengan `width={40} height={40}` (bukan 28).
  - Bila `selectedCategory` aktif, `ic-count` menampilkan jumlah hasil **terfilter** (bukan total API) — uji lewat helper/props yang sama dengan pola tes panel yang sudah ada; bila pola SSR tidak bisa mencapai efek cari, buktikan lewat probe Task 5 dan catat di laporan (jangan memalsukan tes SSR).

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test 2>&1 | tail -5`
Expected: FAIL — tidak ada `ic-category`, thumb masih 28.

- [ ] **Step 4: Implement di `src/components/editor/IconifyPanel.jsx`**
  - State `selectedCategory` (`''` default). Daftar kategori = nilai `category` unik dari `collections` (terurut abjad), koleksi tanpa `category` digabung di bawah label `L.icOtherCategory`.
  - Dropdown kategori (`Select`, `data-testid="ic-category"`) sebaris dua kolom dengan dropdown koleksi (Kategori | Koleksi). Opsi dropdown koleksi = hanya koleksi dalam kategori terpilih (atau semua bila `''`); bila koleksi aktif tidak termasuk kategori yang baru dipilih, reset koleksi ke `''`.
  - Mode telusur: bila kategori terpilih tidak memuat Material Symbols, telusur memakai koleksi pertama dalam kategori itu (bukan grid kosong).
  - Mode cari: bila kategori aktif, pakai `searchIconsFiltered` (Task 1) dan tampilkan `ic-count` = jumlah ikon terfilter yang sudah dimuat; "Muat lagi" tampil selama `!exhausted` dan mengambil halaman berikut lewat helper yang sama. Bila kategori tidak aktif, jalur `searchIcons` lama tidak berubah (total API tetap tampil).
  - `THUMB_PX`: 28 → 40; ukuran tombol di `thumbButton` 32 → 44 (`width: 44, height: 44`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test 2>&1 | tail -5`
Expected: PASS, suite hijau (sebutkan jumlah di laporan).

- [ ] **Step 6: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-2-report.md`.

