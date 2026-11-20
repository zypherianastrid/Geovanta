# Redesign Modal Iconify (Dimensi Luas, Ikon Besar, Limit 10MB Dihapus, Pagination & Scrolling) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghilangkan batas ukuran 10 MB pada pemuatan set Iconify, memperbesar ukuran modal, memperbesar thumbnail ikon beserta padding dan jarak antar elemen, serta mengganti tombol "Muat lagi" dengan mekanisme kombinasi Pagination dan vertical Scrolling.

**Architecture:** 
1. Di `src/renderer/iconifyClient.jsx`, hilangkan `MAX_SET_BYTES` 10 MB agar set ikon berukuran besar seperti `material-symbols-light` (10,5 MB) tidak ditolak saat diunduh. Dukung parameter `start` pada `searchIconsFiltered` untuk pagination berhalaman.
2. Di `src/constants/appI18n.jsx`, tambahkan string i18n untuk pagination (`icPrevPage`, `icNextPage`, `icPageOf`).
3. Di `src/components/modals/IconifyModal.jsx`, perbesar modal menjadi lebar (`min(1100px, 94vw)`), tinggi (`min(820px, 86vh)`), dan tata letak flex kolum yang lapang dengan padding yang nyaman.
4. Di `src/components/editor/IconifyPanel.jsx`, tingkatkan ukuran elemen UI: input pencarian diperbesar (tinggi 40px, font 13px), tombol close diperbesar, dropdown diperluas, pill "Terakhir dipakai" lebih empuk (`px-3 py-1.5`). Ikon thumbnail diperbesar (`THUMB_PX = 48`, tombol 60×60 px atau 62×62 px, border-radius 10px), grid rapi (`repeat(auto-fill, minmax(62px, 1fr))`, `gap: 10px`). Kontainer grid memiliki scrolling vertikal internal (`overflow-y: auto`), disertai bar pagination modern di bawah grid (Sebelumnya, Halaman X dari Y, Selanjutnya) untuk mode telusur maupun mode pencarian.
5. Perbarui unit test di `tests/iconify-client.test.cjs` dan `tests/iconify-panel.test.cjs` agar selaras dengan spesifikasi baru dan verifikasi kelulusan 100% tes (312+ tes) serta bundle build.

**Tech Stack:** React 18, CanvasKit runtime, Tailwind offline AST tokens, Node.js native test runner (`node --test`), esbuild.

**Spec:** Desain yang disetujui pada sesi brainstorming 2026-11-15 (hapus batas 10 MB, perbesar modal, perbesar ikon & jarak, pagination + scrollable grid, perbesar tombol & padding kecil).

## Global Constraints
- Tidak menambahkan token CSS kelas baru di `tailwindOfflineBundle.jsx` tanpa memperbarui tripwire `tests/accent-tokens.test.cjs` (gunakan inline style dan kelas bawaan yang sudah ada).
- Mempertahankan backward compatibility untuk prop `open`, `onInsert`, `onClose`, `L`, `recentIcons`.
- Menjaga data URI SVG murni tanpa injeksi HTML mentah (`dangerouslySetInnerHTML`).
- Semua unit test harus lulus (`npm test` exit 0).

## Review Focus
1. **Set ikon > 10 MB:** Pemuatan `loadSet` untuk set berukuran besar (seperti `material-symbols-light` 10,5 MB) berhasil tanpa melempar error batas 10 MB.
2. **Kesesuaian Halaman (Pagination bounds):** Tombol "Sebelumnya" nonaktif pada halaman 1, tombol "Selanjutnya" nonaktif pada halaman terakhir, navigasi halaman tidak melebihi batas total.
3. **Scrolling Internal Grid:** Kontainer grid tetap dapat di-scroll secara vertikal (`overflowY: auto`) saat jumlah ikon dalam satu halaman banyak.
4. **Ukuran Thumbnail & Tombol:** Thumbnail <img> tampil dengan ukuran 48 px dan tombol pembungkus minimal 60 px dengan jarak/gap minimal 10 px.
5. **Escape & Modal Focus Safety:** Menekan Escape saat modal aktif tetap menutup modal, klik di luar modal tetap menutup modal (kecuali dropdown sedang terbuka).

---

### Task 1: Hapus Batas 10 MB dan Tambah Dukungan Pagination pada `iconifyClient.jsx`

**Files:**
- Modify: `src/renderer/iconifyClient.jsx:20-34, 102-132, 170-190`
- Modify: `tests/iconify-client.test.cjs:177-186`

**Interfaces:**
- `loadSet(prefix: string) -> Promise<{prefix, width, height, icons}>`: Memuat set JSON tanpa penolakan batas 10 MB.
- `searchIconsFiltered(query: string, {category, collections, limit = 48, start = 0, signal}) -> Promise<{icons, total, exhausted}>`: Mendukung `start` untuk paginasi pencarian terfilter.

- [ ] **Step 1: Update test `tests/iconify-client.test.cjs`**
Ubah tes yang sebelumnya mengharapkan penolakan 10 MB menjadi memastikan set besar (> 10 MB) berhasil dimuat tanpa error batas:
```javascript
test('loadSet tidak menolak saat respons melebihi 10 MB (batas 10 MB dihapus)', async (t) => {
  const mod = fresh();
  installFetch(t, async () => ({
    ok: true,
    status: 200,
    headers: {get: () => null},
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(MDI_SET)).buffer
  }));
  const res = await mod.loadSet('mdi');
  assert.equal(res.prefix, 'mdi');
});
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan atau status awal**
Jalankan: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; node --test tests/iconify-client.test.cjs`

- [ ] **Step 3: Hapus `MAX_SET_BYTES` di `src/renderer/iconifyClient.jsx` dan tambahkan `start` di `searchIconsFiltered`**
1. Hapus baris `const MAX_SET_BYTES = 10 * 1024 * 1024;` dan pengecekan `if (buf.byteLength > MAX_SET_BYTES) throw new Error(...)` di `loadSetUncached`.
2. Di `searchIconsFiltered`, tambahkan parameter `start = 0` dan logika offset `start` agar dapat mengambil halaman tertentu saat kategori aktif.

- [ ] **Step 4: Jalankan test untuk memastikan test lulus**
Jalankan: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; node --test tests/iconify-client.test.cjs`
Expected: PASS

---

### Task 2: Tambahkan Label Pagination di `appI18n.jsx` dan Perbesar Modal di `IconifyModal.jsx`

**Files:**
- Modify: `src/constants/appI18n.jsx:397-415, 858-876`
- Modify: `src/components/modals/IconifyModal.jsx:38-46`

**Interfaces:**
- `APP_STR.id` & `APP_STR.en`: menyertakan `icPrevPage`, `icNextPage`, `icPageOf`.
- `IconifyModal`: merender modal `.hp` dengan dimensi lebar `min(1100px, 94vw)` dan tinggi `min(820px, 86vh)` serta flex layout.

- [ ] **Step 1: Tambahkan kunci string i18n di `src/constants/appI18n.jsx`**
Di bagian ID:
```javascript
icPrevPage: 'Sebelumnya',
icNextPage: 'Selanjutnya',
icPageOf: 'Halaman {cur} dari {total}',
```
Di bagian EN:
```javascript
icPrevPage: 'Previous',
icNextPage: 'Next',
icPageOf: 'Page {cur} of {total}',
```

- [ ] **Step 2: Perbesar kontainer modal di `src/components/modals/IconifyModal.jsx`**
Ubah style `.hp` dari `maxWidth: 960, maxHeight: '85vh', overflowY: 'auto'` menjadi:
```javascript
style={{
  width: 'min(1100px, 94vw)',
  maxWidth: '94vw',
  height: 'min(820px, 86vh)',
  maxHeight: '88vh',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 28px',
  overflow: 'hidden'
}}
```

- [ ] **Step 3: Jalankan verifikasi sintaks**
Jalankan: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; node -e "require('./src/components/modals/IconifyModal.jsx'); console.log('OK');"`

---

### Task 3: Redesign `IconifyPanel.jsx` (Ikon Besar, Jarak Rapi, Elemen UI Nyaman, Pagination + Scrolling)

**Files:**
- Modify: `src/components/editor/IconifyPanel.jsx`

**Interfaces:**
- `IconifyPanel`: Komponen UI panel modal dengan:
  - `THUMB_PX = 48`
  - Tombol ikon 60×60 px, padding 4 px, border radius 10 px.
  - Grid: `gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))'`, `gap: '10px'`.
  - Kontainer grid scrollable vertikal: `overflowY: 'auto'`, fleksibel mengisi ruang modal.
  - Input pencarian: tinggi 40 px, teks 13.5 px, padding nyaman.
  - Dropdown Kategori & Koleksi: label jelas (font 12px font-medium), dropdown nyaman.
  - Baris "Terakhir dipakai": pill diperbesar dengan padding `6px 12px` dan border radius 8 px.
  - Pagination bar: tombol `Sebelumnya` & `Selanjutnya` (disabled saat di ujung), indikator halaman, dan info jumlah ikon.
  - Menghapus tombol "Muat lagi" lama.

- [ ] **Step 1: Implementasi perubahan di `src/components/editor/IconifyPanel.jsx`**
1. Atur konstanta:
   ```javascript
   const THUMB_PX = 48;
   const PAGE_SIZE = 72;
   ```
2. Tambahkan state pagination:
   - `const [browsePage, setBrowsePage] = useState(1);`
   - `const [searchPage, setSearchPage] = useState(1);`
   - Reset `browsePage` ke 1 saat `browsePrefix` atau `selectedCategory` berubah.
   - Reset `searchPage` ke 1 saat `query`, `selectedCategory`, atau `selectedPrefix` berubah.
3. Di mode Browse:
   - Potong daftar ikon berdasarkan halaman: `const pagedBrowseNames = browseNames.slice((browsePage - 1) * PAGE_SIZE, browsePage * PAGE_SIZE);`
   - Total halaman: `const totalBrowsePages = Math.max(1, Math.ceil(browseNames.length / PAGE_SIZE));`
4. Di mode Search:
   - Request search mengambil limit `PAGE_SIZE` dengan offset `start: (searchPage - 1) * PAGE_SIZE`.
   - Total halaman: `const totalSearchPages = Math.max(1, Math.ceil(searchTotal / PAGE_SIZE));`
5. Susun tampilan UI:
   - Header judul & tombol close nyaman (tinggi 34 px, radius 8 px).
   - Input cari 40 px.
   - Dropdown kategori & koleksi bersebelahan rapi.
   - Kontainer grid dengan `style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '6px 4px' }}`.
   - Grid dengan `style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: '10px' }}`.
   - Thumbnail button: `style={{ width: 62, height: 62, padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}`.
   - Pagination bar di bagian bawah grid dengan tombol Sebelumnya/Selanjutnya dan indikator halaman.

---

### Task 4: Perbarui Test Guard di `tests/iconify-panel.test.cjs` dan Jalankan Verifikasi Penuh

**Files:**
- Modify: `tests/iconify-panel.test.cjs`

- [ ] **Step 1: Perbarui asersi yang berkaitan dengan THUMB_PX dan tombol 44px di `tests/iconify-panel.test.cjs`**
Ubah regex guard agar mencerminkan ukuran baru:
- `THUMB_PX = 48`
- Ukuran tombol thumbnail 62 px
- Asersi pagination hadir (tombol sebelumnya, selanjutnya, indikator halaman) dan "Muat lagi" lama tidak lagi digunakan pada alur normal.

- [ ] **Step 2: Jalankan unit test spesifik `iconify-panel.test.cjs`**
Jalankan: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; node --test tests/iconify-panel.test.cjs`
Expected: PASS

- [ ] **Step 3: Jalankan seluruh test suite (312+ tes)**
Jalankan: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm test`
Expected: Seluruh 312+ tes PASS tanpa kegagalan.

- [ ] **Step 4: Jalankan build bundle web**
Jalankan: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm run build:web`
Expected: Exit 0, aset bundle ter-generate dengan benar.
