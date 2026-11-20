# Task 1 Report: Kategori di klien + label i18n

**Plan:** Iconify Pindah ke Modal Popup (`sdd-2026-11-15-iconify-modal`)
**Tanggal:** 2026-11-15
**Status:** DONE
**Skill dipakai:** `test-driven-development` (fast path percepatan 2026-11-15: 1 skill relevan; TDD RED → GREEN, verifikasi penuh `npm test` sekali sebelum lapor).

## Yang diimplementasikan

### 1. `src/renderer/iconifyClient.jsx`
- **`listCollections()`** — tiap koleksi kini mengembalikan satu field tambahan `category: c?.category ?? null` (satu baris, tidak ada perubahan lain).
- **`searchIconsFiltered(query, {category, collections, limit = 48, signal})`** — baru, memakai `searchIcons` yang sudah ada per halaman:
  - Tanpa kategori (`category` kosong): delegasi satu halaman `searchIcons` (`start: 0`), kembalikan `{icons, exhausted: icons.length >= total}`.
  - Kategori aktif: `allowedPrefixes` dari `collections` yang kategorinya sama; loop `searchIcons` halaman demi halaman (`start = 0`, naik `limit` tiap halaman) sampai `limit` kecocokan terkumpul atau `start >= total` API; kembalikan `{icons: icons.slice(0, limit), exhausted: start >= total}`.
  - **Ruling R1 (binding, menggantikan frasa Step 4 brief soal `category === 'Lainnya'`):** `category === '__other__'` berarti koleksi tanpa kategori (`!c?.category` — `null`/kosong/undefined). Tidak pernah membandingkan dengan label display "Lainnya"/"Other".
  - `AbortError` diteruskan apa adanya dan error lain memakai pesan kontekstual `searchIcons` — keduanya otomatis karena fungsi tidak menangkap error dari `searchIcons` sama sekali.

### 2. `src/constants/appI18n.jsx`
- Tiga label tepat sesudah `icAllCollections`, di blok ID dan EN:
  - ID: `icCategory: 'Kategori'`, `icAllCategories: 'Semua kategori'`, `icOtherCategory: 'Lainnya'`
  - EN: `icCategory: 'Category'`, `icAllCategories: 'All categories'`, `icOtherCategory: 'Other'`

### 3. `tests/iconify-client.test.cjs` — 6 tes baru
Sesuai Step 2 brief (4 skenario), ditambah 2 tes yang mematok perilaku yang dituntut Step 4 brief + ruling R1 secara eksplisit:
1. `listCollections()` mengembalikan `category: 'Material'` untuk `material-symbols` dan `category: null` bila field tidak ada.
2. `searchIconsFiltered` kategori `'Material'` hanya mengembalikan ikon ber-prefix `mdi` dari mock `/search` campuran `mdi:*` + `tabler:*`.
3. `searchIconsFiltered` berhenti setelah total API habis: 2 halaman tanpa kecocokan → `exhausted === true` dan `fetch` tepat 2 kali.
4. Label `icCategory` / `icAllCategories` / `icOtherCategory` ID + EN via `getAppStr`.
5. (Tambahan, R1) `category: '__other__'` hanya mengembalikan ikon dari koleksi berkategori `null`/`''` — bukan dari koleksi berkategori `'Material'`.
6. (Tambahan, Step 4) Tanpa kategori: delegasi tepat 1 halaman; `exhausted === false` saat `icons.length (48) < total (100)`.
- **Satu penyesuaian tes lama (wajib akibat field baru, bukan perubahan perilaku):** asersi `deepEqual` di tes memoize `listCollections()` ditambah `category: null` pada kedua koleksi (mock-nya tidak punya field `category`). Tanpa ini tes lama gagal karena bentuk objek berubah — itulah satu-satunya tes lama yang tersentuh.

## TDD Evidence

### RED — sebelum implementasi
Perintah: `node --test tests/iconify-client.test.cjs`
```
ℹ pass 15
ℹ fail 6
✖ searchIconsFiltered ... TypeError [Error]: mod.searchIconsFiltered is not a function
✖ appI18n: label kategori ... AssertionError: Expected values to be strictly equal: + undefined - 'Kategori'
```
Tepat 6 tes baru gagal, 15 tes lama lolos. Penyebab kegagalan sesuai harapan: fungsi belum ada (`is not a function`), field/label belum ada (`undefined`).

### GREEN — sesudah implementasi
Perintah: `node --test tests/iconify-client.test.cjs`
```
ℹ pass 21
ℹ fail 0
```
Perintah: `npm test` (full suite)
```
ℹ tests 306
ℹ suites 0
ℹ pass 306
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 22833.694106
```
**306/306 lolos (300 baseline + 6 tes baru).** Output file `tests/iconify-client.test.cjs` pristine: 0 baris `warning|deprecat` pada run file tersebut.

## File yang diubah
- `src/renderer/iconifyClient.jsx` — +32 baris (`searchIconsFiltered` + komentar), +1 baris (`category` di `listCollections`)
- `src/constants/appI18n.jsx` — +3 baris ID, +3 baris EN
- `tests/iconify-client.test.cjs` — +6 tes baru, +2 field `category: null` di asersi memoize lama
- Backup (Step 1): `src/renderer/iconifyClient.jsx.bak-modal-t1`, `src/constants/appI18n.jsx.bak-modal-t1`, `tests/iconify-client.test.cjs.bak-modal-t1`

## Self-review
- **Completeness:** semua langkah brief 1–7 dikerjakan; antarmuka persis seperti yang dibutuhkan Task 2/3 (`category` di `listCollections`, `searchIconsFiltered(query, {category, collections, limit = 48, signal}) -> {icons, exhausted}`, label `icCategory`/`icAllCategories`/`icOtherCategory` ID+EN).
- **Kualitas/disiplin:** kode minimal, memakai ulang `searchIcons` (timeout 10 dtk, pesan kontekstual, `AbortError`) tanpa duplikasi; tidak ada file lain disentuh; tidak ada YAGNI (tidak ada `total`/`limit` tambahan di return, tidak ada helper baru).
- **Konsumen lama aman:** `VectorEditor.jsx` dan `IconifyPanel.jsx` hanya memakai `prefix`/`name`/`total`/`license`/`palette` dari `listCollections` — field `category` aditif, tidak merusak. Tidak ada file tes lain yang mengasersi bentuk `listCollections` (dicek via `grep`).
- **Deviasi yang dicatat (bukan penyimpangan):** 2 tes tambahan di luar 4 skenario Step 2 (sentinel `'__other__'` R1 + cabang delegasi tanpa kategori) — keduanya mematok perilaku yang sudah dituntut Step 4 + ruling koordinator, jadi ditambahkan agar tidak ada perilaku kontrak yang tanpa tes.

## Isu / batasan
- **Output full suite tidak 100% pristine secara harfiah:** ada 30 baris peringatan React `useLayoutEffect does nothing on the server` dari file tes komponen lain (SSR `renderToStaticMarkup`) + 1 nama tes yang mengandung kata "warning". **Bukan dari perubahan ini:** 0 kemunculan `useLayoutEffect` di ketiga file yang saya sentuh, dan run `tests/iconify-client.test.cjs` sendiri 0 baris warning. Peringatan itu pra-ada di suite, tidak disentuh (di luar scope Task 1).
- **Tidak terverifikasi:** perilaku terhadap API Iconify asli (hanya mock `fetch`); Task 5 (probe) yang akan memverifikasi terhadap layanan nyata. `category` di respons `/collections` API diasumsikan berupa string sesuai brief; nilai non-string (jika ada) akan diteruskan apa adanya.
- **Tidak ada pertanyaan yang tertunda** — brief + ruling R1 cukup jelas; tidak ada asumsi yang ditebak di luar keduanya.
