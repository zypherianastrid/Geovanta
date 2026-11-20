# Task 2 Report: Filter kategori + thumbnail 40 px di panel

**Plan:** Iconify Pindah ke Modal Popup (`sdd-2026-11-15-iconify-modal`)
**Tanggal:** 2026-11-15
**Status:** DONE_WITH_CONCERNS (selesai; 1 concern jujur soal output warning, lihat § Isu)
**Skill dipakai:** `test-driven-development` (fast path percepatan 2026-11-15: 1 skill relevan; TDD RED → GREEN, verifikasi penuh `npm test` sekali sebelum lapor).

## Yang diimplementasikan

Hanya `src/components/editor/IconifyPanel.jsx` (+ `tests/iconify-panel.test.cjs`). Tidak ada file lain disentuh.

### 1. `src/components/editor/IconifyPanel.jsx`
- **State baru:** `selectedCategory` (`''` = semua kategori) dan `searchExhausted` (bool, dari `searchIconsFiltered`).
- **Helper murni baru (diekspor, preseden `toPanelError`):**
  - `collectionsInCategory(collections, category)` — filter per kategori; `''`/falsy = semua; sentinel `'__other__'` (ruling R1) = koleksi tanpa kategori (`!c?.category`). Label display "Lainnya"/"Other" tidak pernah dipakai sebagai kunci (guard sumber melarang `category === 'Lainnya'` / `'Other'`).
  - `categoryOptions(collections, L)` — `[['', L.icAllCategories], ...kategoriUnikTerurutAbjad, ['__other__', L.icOtherCategory]]` (opsi `'__other__'` paling akhir, hanya bila ada koleksi tanpa kategori).
- **Dropdown kategori + koleksi sebaris dua kolom** (`display: grid; gridTemplateColumns: '1fr 1fr'`): `Select` kategori (`data-testid="ic-category"`, label `L.icCategory`) di kiri, koleksi (`data-testid="ic-collection"`) di kanan. Opsi koleksi = `visibleCollections` (hanya kategori terpilih, atau semua bila `''`).
- **Reset koleksi:** `handleCategoryChange(v)` — bila koleksi aktif tidak termasuk kategori baru, `setSelectedPrefix('')`.
- **Mode telusur:** `browsePrefix = selectedPrefix || (selectedCategory ? visibleCollections[0]?.prefix : undefined) || BROWSE_DEFAULT_PREFIX` — kategori aktif tanpa koleksi terpilih memakai koleksi pertama dalam kategori itu (bukan grid kosong); tanpa kategori tetap default Material Symbols.
- **Mode cari:** kategori aktif → `searchIconsFiltered(q, {category: selectedCategory, collections, limit: SEARCH_LIMIT, signal})`; `ic-count` = `searchResults.length` (jumlah ikon terfilter yang sudah dimuat, bukan total API). Tanpa kategori → jalur `searchIcons` lama tidak berubah (total API tetap tampil). Deps efek cari ditambah `selectedCategory, collections`.
- **"Muat lagi":** kategori aktif → `searchIconsFiltered(q, {category, collections, limit: searchResults.length + SEARCH_LIMIT, signal})` (helper Task 1 tidak punya `start`, jadi limit tumbuh dan hasil diganti daftar yang lebih panjang — bukan append); tampil selama `!searchExhausted`. Tanpa kategori → `start` lama, tampil selama `searchResults.length < searchTotal`.
- **Thumbnail:** `THUMB_PX` 28 → **40**; ukuran tombol `thumbButton` 32 → **44** (`width: 44, height: 44`). Komentar header file diperbarui (kontrak filter kategori + thumbnail 40 px).

### 2. `tests/iconify-panel.test.cjs` — 6 tes baru (+ 1 penyesuaian guard lama, lihat di bawah)
1. SSR: panel me-render dropdown kategori (`data-testid="ic-category"`, label "Kategori", default "Semua kategori") sebaris sebelum dropdown koleksi.
2. SSR EN: "Category" + "All categories".
3. `categoryOptions`: kategori unik terurut abjad + `'__other__'`/`'Lainnya'` (ID) / `'Other'` (EN); tanpa koleksi tanpa kategori → tanpa opsi `'__other__'`; `[]` → hanya "Semua kategori".
4. `collectionsInCategory`: filter 'Material' / 'General' / `'__other__'` / `''` / kategori tak ada.
5. Label `icCategory`/`icAllCategories`/`icOtherCategory` ID+EN verbatim Task 1 (sudah hijau sejak Task 1 — guard regresi).
6. Guard sumber: THUMB_PX 40 (bukan 28), tombol 44 (bukan 32), `searchIconsFiltered` saat kategori aktif, `ic-count` terfilter, "Muat lagi" `!exhausted`, telusur = koleksi pertama kategori, reset koleksi, tanpa banding label display.
- **Penyesuaian 1 tes lama (wajib akibat perubahan bentuk ekspresi, bukan perubahan perilaku):** guard `browse default material-symbols` memakai regex lama `/selectedPrefix\s*\|\|\s*BROWSE_DEFAULT_PREFIX/` yang tidak lagi cocok karena rantai fallback kini 3 tautan. Guard diperbarui mematok rantai lengkap `/selectedPrefix \|\| \(selectedCategory \? visibleCollections\[0\]\?\.prefix : undefined\) \|\| BROWSE_DEFAULT_PREFIX/` — lebih kuat (penghapusan fallback default tetap membuatnya MERAH), dengan komentar penjelasan di tes. Perilaku yang dijaga (default tetap Material Symbols) tidak berubah.

## TDD Evidence

### RED — sebelum implementasi
Perintah: `node --test tests/iconify-panel.test.cjs`
```
ℹ tests 14
ℹ pass 9
ℹ fail 5
✖ IconifyPanel (Task 2) merender dropdown kategori sebaris dengan dropdown koleksi (Kategori | Koleksi)
✖ IconifyPanel (Task 2) label EN: dropdown kategori "Category" + "All categories"
✖ IconifyPanel (Task 2) categoryOptions: kategori unik terurut abjad + "Lainnya" untuk koleksi tanpa kategori
✖ IconifyPanel (Task 2) collectionsInCategory: filter per kategori, sentinel __other__ untuk tanpa kategori
✖ IconifyPanel source (Task 2): THUMB_PX 40, tombol thumb 44, searchIconsFiltered + ic-count terfilter + muat-lagi !exhausted + telusur koleksi pertama kategori
```
Tepat 5 tes baru gagal, 8 tes lama + 1 tes label Task 1 lolos. Penyebab sesuai harapan: tidak ada `ic-category`, helper belum diekspor (`is not a function`), `THUMB_PX` masih 28 (contoh: `AssertionError ... expected: /THUMB_PX\s*=\s*40/`).

### GREEN — sesudah implementasi (setelah perbaikan guard lama, lihat § Self-review)
Perintah: `node --test tests/iconify-panel.test.cjs`
```
ℹ tests 14
ℹ pass 14
ℹ fail 0
```
Perintah: `npm test` (full suite)
```
ℹ tests 312
ℹ suites 0
ℹ pass 312
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 23745.740688
```
**312/312 lolos (306 baseline + 6 tes baru).**

## Yang TIDAK bisa dibuktikan lewat SSR (dicatat, tidak dipalsukan)

Sesuai Step 2 brief + catatan header file tes yang diperbarui:
- **(a) Opsi kategori di dalam dropdown:** `Select` hanya me-render label nilai aktif saat tertutup; daftar opsi hidup di dalam `<Float>` yang me-return `null` saat tertutup — markup SSR tidak pernah memuat opsi. Yang dibuktikan: dropdown hadir + label default, dan helper murni `categoryOptions`/`collectionsInCategory` diuji langsung dengan collections yang dipasok. Opsi di dropdown terbuka dibuktikan probe Task 5.
- **(b) `ic-count` = jumlah hasil TERFILTER saat kategori aktif:** butuh efek cari async + fetch (debounce, AbortController) — tidak terjangkau harness SSR. Wiring dipatok guard sumber; perilaku hidup dibuktikan probe Task 5.
- **(c) Thumbnail `<img width=40 height=40>`:** grid hanya dirender sesudah efek `loadSet`/search — tidak jalan di SSR. Dipatok guard sumber (`THUMB_PX = 40` + tombol 44 px); verifikasi visual oleh probe Task 5.
- **Keputusan desain yang TIDAK ditambah prop baru:** brief Step 2 menyebut "collections yang dipasok" — itu dipenuhi lewat helper yang diekspor (dites dengan collections yang dipasok langsung), mengikuti preseden `toPanelError` di file yang sama. Tidak ada prop `initialCollections` — tidak diminta brief, tidak dipakai pemanggil produksi (`EditorRightInspector.jsx` tidak memasoknya), dan tidak akan membuat SSR melihat opsi dropdown juga. Bila reviewer/koordinator menghendaki prop itu, itu perubahan kecil terpisah.

## File yang diubah
- `src/components/editor/IconifyPanel.jsx` — diff vs backup: 90 baris berubah (state + 2 helper + cabang cari/muat-lagi + JSX 2 kolom + THUMB 40/tombol 44 + komentar header)
- `tests/iconify-panel.test.cjs` — diff vs backup: 144 baris berubah (6 tes baru + 1 guard lama diperbarui + catatan header SSR)
- Backup (Step 1): `src/components/editor/IconifyPanel.jsx.bak-modal-t2`, `tests/iconify-panel.test.cjs.bak-modal-t2`
- Tidak ada file lain disentuh (dicek: hanya 2 file `.bak-modal-t2` yang ada).

## Self-review
- **Completeness:** semua butir Step 4 brief dikerjakan: state `selectedCategory`, daftar kategori unik terurut + `'__other__'`, dua kolom (Kategori | Koleksi), filter opsi koleksi, reset koleksi, telusur = koleksi pertama kategori, cari via `searchIconsFiltered`, `ic-count` terfilter, "Muat lagi" `!exhausted` via helper yang sama, jalur lama tanpa kategori tidak berubah, `THUMB_PX` 40, tombol 44.
- **Kualitas/disiplin:** memakai ulang `searchIconsFiltered` Task 1 tanpa duplikasi logika filter; sentinel `'__other__'` konsisten (R1); tidak ada YAGNI (tidak ada prop baru, tidak ada helper tak terpakai, tidak ada perubahan CSS).
- **Temuan saat GREEN pertama (diperbaiki sebelum lapor):** run GREEN pertama 13/14 — 1 tes LAMA merah (`browse default material-symbols`) karena regex-nya mematok bentuk ekspresi lama 2 tautan. Bukan regresi perilaku: fallback default tetap ada sebagai tautan terakhir rantai 3 tautan. Guard diperbarui ke rantai lengkap (lebih kuat), lalu 14/14 + full 312/312.
- **Satu detail implementasi yang dicatat:** "Muat lagi" kategori aktif memanggil ulang `searchIconsFiltered` dari `start: 0` dengan limit lebih besar (helper Task 1 tidak punya `start`) — benar tapi memuat ulang halaman awal; itu konsekuensi kontrak helper Task 1, bukan pilihan bebas. Bila koordinator menghendaki `start` di helper, itu perubahan Task 1.
- **Tidak terverifikasi di sini:** perilaku terhadap API Iconify asli (hanya guard sumber + unit helper); probe Task 5 yang memverifikasi dropdown terbuka, `ic-count` terfilter, thumbnail 40 px, dan telusur kategori di browser asli.

## Isu / batasan
- **Output full suite tidak 100% pristine secara harfiah:** ada 39 baris peringatan React `Warning: useLayoutEffect does nothing on the server` (Task 1 melaporkan 30). **Bukan warning baru:** sumbernya pra-ada — `useLayoutEffect` di `FloatPopover.jsx` yang dipakai `Select`. Kenaikan +9 terukur dan dijelaskan: file tes ini tadinya 5 warning (5 render × 1 Select) → kini 14 (7 render × 2 Select: dropdown kedua + 2 tes SSR render baru). Satu warning per instance `Select` per render SSR; kelas warning sama, tidak ada file saya yang memakai `useLayoutEffect`. Di luar scope Task 2 untuk memperbaiki `FloatPopover`.
- **Tidak ada pertanyaan yang tertunda** — brief + ruling R1 + antarmuka Task 1 cukup jelas; tidak ada asumsi yang ditebak di luar keduanya, kecuali keputusan "tanpa prop baru" di atas yang dicatat eksplisit untuk reviewer.

---

## Fix Report — Round 1/5 (review Important finding)

**Tanggal:** 2026-11-15
**Scope:** hanya finding Important dari `task-2-review.md`; Minor findings TIDAK disentuh (ditunda ke final review, sesuai instruksi).

### Finding yang diperbaiki
Review: guard sumber Task 2 (`tests/iconify-panel.test.cjs:304-333`) mematok kondisi "Muat lagi" (`selectedCategory ? !searchExhausted : ...`) dan kedua bentuk pemanggilan `searchIconsFiltered`, tetapi tidak mematok assignment yang membuat kondisi itu bermakna: `setSearchExhausted(res.exhausted)` di efek cari (`IconifyPanel.jsx:299`) dan di `handleLoadMoreSearch` (`IconifyPanel.jsx:337`). Menghapus salah satu baris tetap membuat suite hijau, padahal tombol "Muat lagi" lalu tampil selamanya (state awal `false`, `:152`). Kode produksi sudah benar; yang hilang hanya tripwire tes.

### Verifikasi kondisi awal (sebelum edit)
`grep -n "setSearchExhausted" src/components/editor/IconifyPanel.jsx` memastikan kode produksi sesuai deskripsi review — tidak ada perbedaan:
- `:152` — `const [searchExhausted, setSearchExhausted] = useState(false);`
- `:272` — `setSearchExhausted(false);` (reset di awal efek cari; BUKAN bagian dari tripwire)
- `:299` — `setSearchExhausted(res.exhausted);` (efek cari)
- `:337` — `setSearchExhausted(res.exhausted);` (`handleLoadMoreSearch`)

### Yang diubah (hanya 1 file tes)
`tests/iconify-panel.test.cjs` — di dalam tes guard sumber Task 2, sesudah assertion bentuk pemanggilan `searchIconsFiltered` "Muat lagi", ditambah 2 assertion + komentar penjelasan:
```js
assert.match(src, /setSearchExhausted\(res\.exhausted\)/);
assert.equal((src.match(/setSearchExhausted\(res\.exhausted\)/g) || []).length, 2);
```
Regex mematok bentuk persis `setSearchExhausted(res.exhausted)` (bukan reset `setSearchExhausted(false)` di `:272`), dan hitungan `=== 2` menutupi kedua call site — penghapusan di salah satu situs membuat tes MERAH. Tidak ada perubahan kode produksi.

### Bukti tripwire bekerja (demonstrasi, bukan state yang di-commit)
1. Hapus sementara baris 337 dari `IconifyPanel.jsx` (salinan produksi disimpan dulu di `/tmp/IconifyPanel.jsx.fix-r1`, lalu dipulihkan): `grep -c` = 1, lalu `node --test tests/iconify-panel.test.cjs` **GAGAL** pada assertion hitungan (`ERR_ASSERTION`, `actual: 1, expected: 2, operator: 'strictEqual'`).
2. Pulihkan file produksi dari `/tmp`; `grep -n` memastikan kedua baris kembali ada (`:299` dan `:337`).
3. `node --test tests/iconify-panel.test.cjs` sesudah pemulihan: **14/14 lolos, 0 gagal**.

### Verifikasi akhir
Perintah: `npm test`
```
ℹ tests 312
ℹ suites 0
ℹ pass 312
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 22371.918255
```
**312/312 lolos** (jumlah tes tidak berubah — fix ini hanya memperkuat guard yang sudah ada, tanpa tes baru).

### File yang diubah / backup
- Diubah: `tests/iconify-panel.test.cjs` (+7 baris: 2 assertion + 5 baris komentar).
- Backup baru: `tests/iconify-panel.test.cjs.bak-modal-t2-r1`.
- Tidak ada file lain disentuh; kode produksi tidak diubah (dipulihkan byte-per-byte dari `/tmp` sesudah demonstrasi tripwire; `grep` pasca-pemulihan mengonfirmasi `:299` + `:337` utuh).

### Isu / batasan
- Tidak ada concern baru. Minor findings review (stale-prefix reset, pinning effect-deps, wart `toPanelError`, kerapuhan format guard sumber, refetch-from-start "Muat lagi" terfilter) sengaja TIDAK diperbaiki di ronde ini, sesuai instruksi.
