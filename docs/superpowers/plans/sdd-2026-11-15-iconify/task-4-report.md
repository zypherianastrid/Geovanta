# Task 4 Report — Panel UI (`IconifyPanel.jsx`) + i18n

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 1, 2, 3, 7, 9)
**Date:** 2026-11-15
**Verdict: DONE** — semua elemen brief Step 3 ada; 7/7 tes baru hijau,
full suite 298/298, `build:web` exit 0.

No questions were raised before starting: brief, design doc, dan
laporan Task 3 tidak meninggalkan ambiguitas yang butuh klarifikasi
(satu-satunya pilihan desain — thumbnail data URI vs injeksi HTML —
diputuskan dari spec §7.10 yang mengikat; lihat §5).

Skill yang dipakai (aturan `AGENTS.md`): `test-driven-development`
(RED → GREEN sesuai langkah brief; skill lain tidak relevan — brief
+ design doc sudah menjadi plan yang eksak).

## 1. Apakah harness tes komponen ada? — YA, tapi hanya render statis

**Ada.** Preseden: `tests/text-tool.test.cjs` — esbuild + `ReactDOMServer.
renderToStaticMarkup`. Tidak ada jsdom / happy-dom, tidak ada
`createRoot` / `act`, tidak ada DOM di node (dicek: `grep` di
`tests/*.cjs` + `package.json` + `node_modules` — nol hasil).

Konsekuensi yang dicatat jujur: `renderToStaticMarkup` **tidak
menjalankan effects dan tidak bisa mensimulasikan ketikan atau
timer**. Maka ketiga asersi Step 1 brief yang bersifat
interaktif/async **TIDAK dapat tinggal di
`tests/iconify-panel.test.cjs`** tanpa mengarang harness (dilarang
brief) — ketiganya **DITUNDA EKSPLISIT ke probe Task 8**
(`probes/probe-iconify.cjs`, Playwright, browser asli), sesuai
ruling koordinator **R5**:

1. Render dengan client ter-mock menampilkan grid telusur Material
   Symbols saat dibuka (butuh effect `loadSet` async).
2. Mengetik query (debounce ~300 ms) beralih ke hasil cari (butuh
   event input + timer + fetch async).
3. Hasil kosong menampilkan empty state yang menjelaskan (butuh
   search async selesai dengan 0 hasil).

Yang DAPAT dan SUDAH diuji di file tes ini: struktur statis panel,
label ID/EN, baris "Terakhir dipakai" (maks. 12 nama), slot status
offline/loading, plus guard sumber yang mematok wiring yang tidak
bisa dieksekusi harness ini (browse default `material-symbols`,
debounce 300 ms + `AbortController`, tidak ada host API/CDN di
panel, tidak ada injeksi HTML mentah — §7.10). Header file tes
mencatat temuan harness + deferral ini kata demi kata.

## 2. What was implemented

### `src/components/editor/IconifyPanel.jsx` (baru, 14.284 byte)

Mengikuti pola seksi `RecolorSection.jsx` / `FindReplaceSection.jsx`
(`.fig-isec`, header + tombol X, prop `L`, `open` + Esc menutup).
Props: `onInsert(icon)`, `onClose()`, `status` (`"online" |
"offline" | "loading"` — stub untuk Task 7), `L`, `recentIcons`
(nama dari prefs — Task 7 yang memasok), `open` (default `true`).

| Elemen brief Step 3 | Implementasi |
| --- | --- |
| Search + debounce ~300 ms + AbortController | `CustomTextBox` (input kustom, bukan native — sesuai permintaan user yang tercatat di memori) → effect debounce `SEARCH_DEBOUNCE_MS = 300`; `AbortController` per pencarian, request basi dibatalkan; `AbortError` diabaikan (bukan kegagalan); cleanup effect membatalkan saat query/filter berubah & unmount |
| Collection dropdown, default "Semua koleksi" | `Select` searchable (`SelectDropdown.jsx`) dari `listCollections()`; opsi `[['', L.icAllCollections], ...]`; filter aktif diteruskan sebagai `&prefix=` ke `searchIcons` |
| Grid thumbnail 24–32 px dari set data via `buildIconSvg`, never `<img>` ke API | 28 px; `buildIconSvg` → **data URI `<img>`** (nol request tambahan). Bukan injeksi HTML mentah (§7.10 mengikat — lihat §5) |
| Browse mode on open | `loadSet("material-symbols")` saat dibuka; koleksi telusur = `selectedPrefix \|\| 'material-symbols'` (pilih koleksi di dropdown saat mode telusur → telusur koleksi itu; kembali ke "Semua koleksi" → Material Symbols) |
| "Terakhir dipakai" maks. 12 nama dari prefs, nama saja | `recentIcons.slice(0, 12)`, chip nama saja (tanpa thumbnail), klik → `onInsert({name})` — Task 6 yang memuat set-nya bila perlu |
| License note koleksi yang tampil | Satu koleksi (telusur / cari terfilter) → `icLicenseOne` (nama + lisensi dari `listCollections`); cari lintas set → `icLicenseMany` (lisensi berbeda dari hasil yang tampil); bila tak diketahui → tidak tampil |
| Hint "Cari dalam bahasa Inggris" / "Search in English" | Di bawah kolom cari + placeholder contoh berbahasa Inggris (`home`) — design §7.3 |
| Slot offline (`status` prop) | `status === 'offline'` → state `ic-offline` ("Perlu internet untuk mencari ikon") + baris recent tetap tampil; `status` default `'loading'` → state loading; Task 7 memasok status dari probe |

Perilaku lain yang diimplementasikan (tercatat jujur, bukan klaim
tersembunyi):

- **Limit 48** untuk search (`SEARCH_LIMIT = 48`, ≥ halaman minimum
  API 32 — tidak ada jalur yang meminta limit < 32); `start` untuk
  "Muat lagi" hasil cari.
- **Set per prefix dimuat malas untuk hasil cari**: sesudah
  `searchIcons`, prefix berbeda dari hasil dimuat via `loadSet`
  (di-memoize klien); hanya ikon yang set-nya berhasil dimuat DAN
  SVG-nya berhasil dirakit yang tampil (anti-goal A4 — panel tidak
  menampilkan ikon yang tidak bisa disisipkan). Bila set gagal,
  pesannya dicatat di `setsError` dan tampil bila grid kosong.
- **Empty state yang menjelaskan, bukan grid kosong diam-diam**:
  cari 0 hasil → `icEmptySearch` ("…Coba kata kunci lain dalam
  bahasa Inggris."); telusur koleksi kosong → `icEmptyBrowse`;
  gagal muat → pesan kontekstual dari klien (per panggilan —
  Task 2/3). String error mentah (`TypeError: Failed to fetch`)
  tidak pernah sampai ke UI.
- **`onInsert` payload**: ikon grid → objek hasil `searchIcons`
  (`{name, prefix, palette, license}`) atau `{name, prefix,
  palette: isPaletteIcon(...), license}` untuk ikon telusur;
  recent → `{name}` saja.
- **"Muat lagi"**: telusur dibatasi 48 ikon pertama + tombol
  (+48 per klik) — Material Symbols berisi ribuan ikon; me-render
  semuanya akan membekukan panel. Cari: halaman berikut via
  `start` (design §7.2 menyebut paginasi/`load more` sebagai isi
  panel). Ini satu-satunya tambahan di luar kalimat brief Step 3,
  dan keduanya didokumentasikan di header file.
- **Esc menutup panel** (pola seksi, guard Ruling J: tidak saat
  overlay edit teks terbuka atau ada popover `.flt`).
- **Tidak ada aturan CSS baru** — kelas yang sudah ada +
  inline style; `src/vendor/tailwindOfflineBundle.jsx` tidak
  disentuh, tripwire tetap **844**.
- Panel **tidak** me-mount dirinya sendiri dan **tidak** berisi
  logika sisip (Task 5 wiring, Task 6 insert).

### `src/constants/appI18n.jsx` (diubah, +28 baris)

14 kunci `ic_*` baru, ID + EN (diff vs backup: hanya baris-baris
ini, tidak ada yang lain):

`icTitle`, `icSearchPlaceholder`, `icSearchHint` ("Cari dalam bahasa
Inggris" / "Search in English" — verbatim brief), `icCollection`,
`icAllCollections` ("Semua koleksi" / "All collections"),
`icRecent` ("Terakhir dipakai" / "Recently used"), `icLicenseOne`,
`icLicenseMany`, `icEmptySearch` (dengan placeholder `{q}`),
`icEmptyBrowse`, `icLoading`, `icOffline` ("Perlu internet untuk
mencari ikon" / "Internet is required to search icons"),
`icLoadMore`, `icResults`. Tombol tutup memakai ulang `L.frClose`
seperti `RecolorSection` (tidak ada kunci duplikat).

### `tests/iconify-panel.test.cjs` (baru, 7 tes)

Lihat §1 untuk batas harness. Tujuh tes (semua via
`renderToStaticMarkup` + guard sumber):

1. Merender kolom cari + petunjuk Inggris + dropdown default
   "Semua koleksi" + tombol tutup.
2. Baris "Terakhir dipakai" maks. 12 nama (13 nama masuk, nama
   ke-13 tidak tampil; tanpa `<img>`).
3. `status="offline"` → state offline yang menjelaskan + recent
   tetap ada.
4. Status default → state loading untuk grid telusur (efek belum
   jalan di SSR) dan bukan empty state.
5. Label EN (hint, dropdown, recent).
6. Kunci `appI18n` ID/EN lengkap, nilai verbatim brief.
7. Guard sumber: `loadSet("material-symbols")`, `AbortController`,
   `SEARCH_DEBOUNCE_MS = 300` + `setTimeout(..., SEARCH_DEBOUNCE_MS)`,
   `ic-empty-state` ada; tidak ada `api.iconify.design`,
   `cdn.jsdelivr.net`, injeksi HTML mentah.

## 3. TDD Evidence

### RED — sebelum implementasi

```text
$ node --test tests/iconify-panel.test.cjs
ℹ tests 7
ℹ pass 0
ℹ fail 7
```

Semua 7 gagal karena komponen belum ada (`ENOENT` /
esbuild tidak bisa me-resolve `IconifyPanel.jsx`) dan kunci i18n
`undefined` — kegagalan yang diharapkan.

### GREEN — setelah implementasi

```text
$ node --test tests/iconify-panel.test.cjs
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

Dua perbaikan tes selama perjalanan ke hijau (keduanya koreksi
tes, bukan koreksi produk):
- Regex debounce awal mengharapkan literal `300` di `setTimeout`,
  padahal sumber memakai konstanta bernama `SEARCH_DEBOUNCE_MS =
  300` — tes diperbaiki mengasersi nilai konstanta DAN pemakaiannya
  di `setTimeout` (asersi lebih tepat, bukan lebih longgar).
- Guard `dangerouslySetInnerHTML` tersandung komentar header file
  yang menyebut nama API itu sambil menjelaskan bahwa panel TIDAK
  memakainya — komentar diparafrase ("penyuntikan HTML mentah"),
  guard tetap ketat.

### Full suite + build

```text
$ npm test
ℹ tests 298
ℹ pass 298
ℹ fail 0

$ npm run build:web
exit 0 — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."
```

Baseline suite sebelum task ini 291 tes (298 − 7 tes baru = 291;
tidak ada tes lama yang diubah atau dihapus — kecuali 1 baris
tambahan di daftar kunci tes baru sendiri, lihat §6).

Satu catatan jujur soal output: run focused `tests/iconify-panel.
test.cjs` memunculkan 5 baris `Warning: useLayoutEffect does
nothing on the server`. Sumbernya **bukan** `IconifyPanel.jsx`
(file itu hanya memakai `useEffect` — `grep useLayoutEffect`
nol hasil) melainkan `src/components/ui/FloatPopover.jsx:24`
(yang diimpor lewat `SelectDropdown`), komponen bersama yang
sudah ada — kelas warning yang sama dengan yang sudah ada di
tes React lain (laporan Task 3 mencatat 28 baris serupa).
Bukan regresi dari task ini; tidak ada warning baru dari kode
yang saya tulis.

## 4. Files changed / created

Dibuat:

- `src/components/editor/IconifyPanel.jsx` (14.284 byte) — komponen panel.
- `tests/iconify-panel.test.cjs` (6.729 byte) — 7 tes.
- `docs/superpowers/plans/sdd-2026-11-15-iconify/task-4-report.md` — laporan ini.

Diubah:

- `src/constants/appI18n.jsx` (+28 baris: 14 kunci `ic_*` × ID/EN).
- Backup: `src/constants/appI18n.jsx.bak-iconify-t4` (54.929 byte,
  dibuat SEBELUM edit, sesuai brief Step 5).

Tidak diubah: `src/vendor/tailwindOfflineBundle.jsx` (tripwire tetap
844), tidak ada file `src/` lain. Bukan repo git — tidak ada commit.

## 5. Keputusan desain yang perlu diketahui reviewer/koordinator

1. **Thumbnail = data URI `<img>`, bukan inline SVG mentah.**
   Brief Step 3 berkata "inline SVG built by `buildIconSvg`, never
   `<img>` to the API"; design §6 A2 mengizinkan "inline SVG /
   data URI dari `body`", dan §7.10 (spec — otoritas mengikat)
   melarang SVG disuntik sebagai HTML. Data URI memenuhi ketiganya:
   berasal dari `buildIconSvg`, nol request ke API, dan di-parse
   sebagai data (konteks gambar), bukan HTML. Bila koordinator
   menginginkan `<svg>` inline harfiah, itu berarti menerima
   injeksi HTML — perlu ruling eksplisit yang mengesampingkan §7.10.
2. **Tiga asersi Step 1 yang interaktif ditunda ke probe Task 8**
   (lihat §1 + R5). File tes + header-nya mencatat ini eksplisit;
   Task 8 HARUS memasukkan ketiganya (browse grid Material Symbols
   saat dibuka; ketik → hasil cari; hasil kosong → empty state
   yang menjelaskan).
3. **Input kustom, bukan native**: kolom cari memakai
   `CustomTextBox` (live `onChange`) dan dropdown memakai `Select`
   searchable — sesuai pola codebase (tidak ada `<select>` /
   `<input>` native di editor) dan permintaan user yang tercatat
   (panel memakai input kustom yang sama seperti fungsi lain).
4. **`recentIcons` adalah prop, bukan baca prefs langsung** —
   prefs key untuk nama ikon recent belum ada; Task 7 ("offline
   panel behavior + recent reuse") yang memasoknya. Panel hanya
   memotong ke 12 dan menampilkan nama.
5. **`status` default `'loading'`** — bila Task 7 belum memasok
   status, panel tetap menampilkan state loading browse-nya
   sendiri; tidak ada klaim online palsu.

## 6. Self-review

- **Completeness:** semua elemen brief Step 3 ada (cari +
  debounce + AbortController, dropdown default "Semua koleksi",
  thumbnail 28 px dari set data via `buildIconSvg`, browse
  `loadSet("material-symbols")`, recent maks. 12 nama, license
  note, hint ID/EN, prop `status`). Tiga asersi interaktif
  didefer ke probe Task 8 secara eksplisit (§1).
- **Quality:** nama jelas; pola seksi diikuti (`.fig-isec`,
  header + X, prop `L`, `open` + Esc); label ID/EN lengkap
  (14 kunci, diff terverifikasi hanya berisi kunci itu).
- **Discipline:** hanya yang diminta brief + 2 tambahan yang
  didokumentasikan (cap browse 48 + "Muat lagi", dan kunci
  `icEmptyBrowse`) — keduanya diperlukan agar panel berfungsi /
  jujur, bukan perluasan scope. Tidak ada panel-mounting, tidak
  ada logika insert (Task 5–6).
- **Testing:** RED 0/7 → GREEN 7/7 ditonton; `npm test` 298/298;
  `build:web` exit 0. Koreksi tes selama GREEN dicatat di §3
  (keduanya memperkuat/memperjelas asersi, tidak melonggarkan).
- **Perbaikan saat self-review:** tidak ada perubahan kode dari
  self-review; verifikasi diff `appI18n` dan asal warning SSR
  dilakukan sebelum laporan ditulis (hasilnya di §3–§4).

## 7. Issues / concerns

- Tidak ada blocker. Dua hal untuk Task 5/7/8:
  1. **Task 8 WAJIB** memverifikasi tiga asersi yang didefer (§1) —
     tanpa itu, perilaku render panel (grid browse, debounce cari,
     empty state) tidak pernah terbukti di browser.
  2. **Ruling diminta** bila koordinator menginginkan thumbnail
     `<svg>` inline harfiah alih-alih data URI — itu bertentangan
     dengan §7.10 (lihat §5 butir 1).
- Terbuka (bukan blocker): lisensi di mode cari lintas set hanya
  menampilkan lisensi berbeda dari hasil yang tampil (bukan
  per-koleksi per ikon); tombol "Muat lagi" telusur tidak mengingat
  posisi scroll (grid di-render ulang dari awal daftar yang
  diperpanjang — posisi tetap, karena item lama tidak berubah).

## Fix round 1

**Tanggal:** 2026-11-15 — perbaikan atas 2 temuan Important dari review
tugas (ronde fix 1 dari maks. 5). Verdict Task 4 tidak berubah; tidak
ada redesign panel, tidak ada file di luar yang diizinkan task fix
(`IconifyPanel.jsx`, `tests/iconify-panel.test.cjs`, `appI18n.jsx`).
Backup dibuat SEBELUM edit: `src/components/editor/IconifyPanel.jsx.bak-iconify-t4r1`
(14.284 byte) dan `src/constants/appI18n.jsx.bak-iconify-t4r1` (56.187 byte).
Skill: `test-driven-development` (sesuai aturan `AGENTS.md`; fix kecil
terarah — bukan engine/arsitektur — jadi jalur cepat percepatan
2026-11-15 berlaku: 1 skill relevan, tes terarah + full suite).

### Important 1 — Browse-default guard asserts nothing (FIXED)

**Akar (terverifikasi):** guard lama `tests/iconify-panel.test.cjs:136`
`/loadSet\(\s*['"]material-symbols['"]\)/` juga cocok dengan komentar
header `IconifyPanel.jsx:14` (`loadSet("material-symbols");` dalam
prosa), sementara kode eksekusi memanggil `loadSet(browsePrefix)`
(`:158` sebelum fix) dengan default tidak langsung via
`BROWSE_DEFAULT_PREFIX` (`:46`) dan `browsePrefix` (`:89`). Dibuktikan
di node: regex lama MATCH pada teks yang hanya berisi baris komentar
tersebut — guard lama memang tidak mengasersi apa pun.

**Perubahan — `tests/iconify-panel.test.cjs:134-157` (tes guard, nama
tes sama):** regex lama DIHAPUS, diganti tiga asersi atas KODE EKSEKUSI:
- `/BROWSE_DEFAULT_PREFIX\s*=\s*['"]material-symbols['"]/` — nilai
  konstanta default (`IconifyPanel.jsx:50`);
- `/selectedPrefix\s*\|\|\s*BROWSE_DEFAULT_PREFIX/` — fallback saat
  dropdown kembali ke "Semua koleksi" (`IconifyPanel.jsx:122`);
- `/loadSet\(\s*browsePrefix\s*\)/` — pemakaian `browsePrefix` di
  `loadSet` (`IconifyPanel.jsx:158`).
Tidak ada perubahan kode produk untuk temuan ini — yang salah adalah
tesnya, bukan default-nya (default memang sudah `material-symbols`).

**Bukti guard baru menggigit (mutasi in-memory, tanpa mengubah file):**
mengganti nilai konstanta menjadi `'mdi'` → asersi 1 GAGAL; mengganti
fallback menjadi `selectedPrefix || 'mdi'` → asersi 2 GAGAL.

### Important 2 — Raw client error strings reach the UI (FIXED, rute MAPPING)

**Rute yang dipilih: mapping di panel (bukan "verify and cite").**
Alasan — rute "verify and cite" DITELITI dan GAGAL dibuktikan. Klien
Task 3 memang memetakan kegagalan fetch ke pesan kontekstual per
panggilan (`src/renderer/iconifyClient.jsx`: `searchIcons` catch
`~:78-83`, `listCollections` `~:110-115`, `loadSet` `~:146-151`),
TETAPI dua jalur parse berada DI LUAR try/catch fetch dan dapat
melempar error mentah ke panel:
- `iconifyClient.jsx:85` — `const data = await res.json();` di
  `searchIcons` (di luar try/catch; `SyntaxError` dari body bukan-JSON
  lolos mentah → `setSearchError` panel);
- `iconifyClient.jsx:154` — `const data = JSON.parse(...)` di
  `loadSetUncached` (di luar try/catch fetch; `SyntaxError` dari
  `icons.json` korup lolos mentah → `setBrowseError` / `setSetsError`
  panel; `listCollections.jsx:117` `res.json()` sama, tetapi panel
  menelan error itu dengan `.catch(() => {})` sehingga bukan jalur UI).
Karena itu klaim laporan awal "TypeError: Failed to fetch tidak pernah
sampai ke UI" TIDAK dapat ditegakkan hanya dari kontrak klien — panel
sendiri yang sekarang menegakkannya. Klien TIDAK diubah (di luar scope
fix Task 4; celah parse klien tetap ada tetapi kini tidak berdampak
ke UI panel).

**Perubahan:**

1. `src/constants/appI18n.jsx:409` (ID) + `:867` (EN) — SATU kunci
   generik baru (satu-satunya kunci baru ronde ini):
   - `icErrorGeneric: 'Gagal memuat ikon. Periksa koneksi internet, lalu coba lagi.'`
   - `icErrorGeneric: 'Failed to load icons. Check your internet connection, then try again.'`
   Diff vs backup `.bak-iconify-t4r1`: hanya 2 baris ini.
2. `src/components/editor/IconifyPanel.jsx:73-96` — allowlist
   `CONTEXTUAL_ERROR_PREFIXES` (9 awalan pesan klien yang dijamin
   kontekstual — `'Perlu internet untuk '`, `'Pencarian ikon '`,
   `'Memuat daftar koleksi ikon '`, `'Gagal memuat daftar koleksi ikon '`,
   `'Memuat set ikon '`, `'Gagal memuat set ikon '`, `'Set ikon '`,
   `'Prefix set ikon '`, `'Kata kunci pencarian ikon '`) + helper
   `toPanelError(err, genericMessage)`: pesan yang diawali salah satu
   awalan diteruskan verbatim, sisanya (termasuk `TypeError`,
   `SyntaxError`, pesan kosong, `null`/`undefined`) diganti pesan
   generik. Diekspor (`:274`, `export { IconifyPanel, toPanelError }`)
   agar tes dapat membuktikannya langsung — harness SSR tidak
   menjalankan effect, jadi jalur render error tidak bisa diuji lewat
   `renderToStaticMarkup`.
3. Keempat situs raw diganti (`:160` browse, `:172` ensureSets,
   `:208` search effect, `:237` load-more): `set*Error(e.message)` →
   `set*Error(toPanelError(e, L.icErrorGeneric))`. `grep e.message`
   pada file kini NOL hasil di kode eksekusi. `AbortError` tetap
   diabaikan sebelum mapping (bukan kegagalan) — tidak berubah.
4. Komentar header `:32-39` dikoreksi: klaim lama ("pesan tampil
   berasal dari klien … TypeError tidak pernah sampai ke UI") diganti
   penjelasan mapping + sitasi lubang `JSON.parse` klien (`:154`).
   Tidak ada perubahan tampilan error (tetap `{browseError}` /
   `{searchError}` / `{setsError}` di `data-testid="ic-error"`),
   tidak ada redesign panel.

**Bukti tes baru menggigit:** tes `toPanelError`
(`tests/iconify-panel.test.cjs:158-193`, baru) mengasersi
`TypeError('Failed to fetch')`, `SyntaxError('Unexpected token…')`,
`Error('boom')`, pesan kosong, dan `null`/`undefined` semuanya →
pesan generik (plus asersi negatif: hasil TIDAK mengandung
`'Failed to fetch'` / `'Unexpected token'`), dan 8 pesan kontekstual
klien (satu per jalur pemanggilan) diteruskan verbatim; guard sumber
menegaskan tidak ada lagi `setBrowseError(e.message)` /
`setSearchError(e.message)` / `setSetsError(prev => prev || e.message)`.
Mutasi in-memory: helper passthrough mentah `e => e.message` GAGAL
pada asersi `TypeError` — tes ini merah bila mapping dihapus.
Tes i18n (`:125-126`) kini juga mengasersi nilai verbatim
`icErrorGeneric` ID/EN.

### Verifikasi (covering tests)

```text
$ node --test tests/iconify-panel.test.cjs
ℹ tests 8
ℹ pass 8
ℹ fail 0

$ npm test
ℹ tests 299
ℹ pass 299
ℹ fail 0

$ npm run build:web
exit 0 — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."
```

Baseline sebelum fix ini 298/298 (7 tes panel + 291 lainnya); sesudah
fix 299/299 (8 tes panel: 7 lama + 1 tes `toPanelError` baru; tidak ada
tes lama yang diubah maknanya — hanya guard browse-default yang
diperketat dan 2 baris asersi `icErrorGeneric` di tes i18n). Tidak ada
aturan CSS baru; tripwire tetap 844.

### Self-review (fix round 1)

- **Completeness:** kedua temuan diperbaiki tepat seperti yang
  diminta — Important 1: guard kini mengasersi kode eksekusi
  (konstanta + fallback + pemakaian); Important 2: rute mapping
  dengan SATU kunci i18n baru, keempat situs raw dipetakan, tes yang
  membuktikan jaminan (gagal bila `TypeError: Failed to fetch`
  mencapai output).
- **Discipline:** hanya 3 file yang diizinkan yang disentuh; klien
  Task 3 tidak diubah (lubang parse-nya didokumentasikan, bukan
  diperbaiki di sini — itu milik Task 3); tidak ada perubahan
  perilaku selain pemetaan error dan pengetatan tes.
- **Risiko sisa (jujur):** allowlist berbasis awalan string — bila
  Task 3 mengubah redaksi pesan kontekstualnya di masa depan tanpa
  memperbarui `CONTEXTUAL_ERROR_PREFIXES`, pesan baru itu akan
  jatuh ke generik (aman: tidak pernah bocor mentah, hanya kurang
  spesifik). `listCollections` gagal tetap ditelan panel
  (`.catch(() => {})`, perilaku pra-ada — bukan jalur UI).
- **Catatan di luar scope:** selama ronde ini file `~/MEMORY.md`
  berubah di luar percakapan ini (watcher sistem: 2 baris dihapus,
  tidak terkait Iconify) — dicatat di sini saja, tidak ditindaklanjuti.
