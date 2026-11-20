# Task 3 Report — Hybrid icon client (`iconifyClient.jsx`) + unit tests

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 0, 3, 5, 8, 10)
**Date:** 2026-11-15
**Verdict: DONE** — all brief exports implemented, 14/14 new tests pass, full suite 291/291, build exit 0.

No questions were raised before starting: the brief, the design doc, and
the Task 1/2 reports left no ambiguity that required clarification
(the one open choice — the R9 10 MB method — was explicitly delegated
to me; see §4).

## 1. What was implemented

### `src/renderer/iconifyClient.jsx` (new, 9.942 byte)

Klien hybrid tanpa UI, mengikuti preseden fetch online
`src/renderer/googleFonts.jsx`. Semua delapan item yang didaftar brief
sebagai "produces" diimplementasikan dengan nama dan signature persis
(catatan: brief menyebut "tujuh exports" di narasi, tetapi mendaftar
**delapan** item — 2 konstanta + 6 fungsi — dan kedelapan item itulah
yang dibuat; tidak ada yang dihilangkan):

| Export | Perilaku |
| --- | --- |
| `ICONIFY_API_BASE = "https://api.iconify.design"` | Konstanta tunggal |
| `ICONIFY_CDN_BASE = "https://cdn.jsdelivr.net/npm/@iconify-json"` | Konstanta tunggal; semua URL diturunkan dari kedua konstanta ini, tidak ada host lain |
| `searchIcons(query, {prefix, limit = 48, start = 0, signal})` | `GET /search?query={q}&limit=48` (+ `&prefix=` bila ada, `&start=` bila non-nol); timeout 10 detik; memetakan `icons: ["mdi:home", …]` + `collections` respons menjadi `[{name, prefix, palette, license}]`; mengembalikan `{icons, total, limit, start, collections}` |
| `listCollections()` | `GET /collections`, sekali per sesi (promise di-memoize); mengembalikan `[{prefix, name, total, license, palette}]` |
| `loadSet(prefix)` | `GET {CDN}/{prefix}/icons.json`, sekali per set per sesi (Map memori); mengembalikan `{prefix, width, height, icons}`; menolak bila body > 10 MB atau 30 detik (lihat §4) |
| `buildIconSvg(name, setData)` | `<svg viewBox="0 0 {width} {height}">{body}</svg>`; nama boleh `"home"` atau `"mdi:home"`; menolak SVG > 256 KB (design §7.10) dan ikon yang tidak ada di set |
| `isPaletteIcon(icon, setData)` | `true` bila `palette: true` (dari objek ikon atau dari `setData.palette`), atau body mengandung fill eksplisit selain `currentColor` |
| `probeOnline(timeoutMs = 3000)` | `GET /version`; `true` hanya bila HTTP OK, `false` untuk timeout / gagal jaringan / non-OK; tidak pernah melempar |

Detail desain yang mengikuti carry notes Task 1–2:

- **Paginasi minimum 32:** default `limit = 48` (dihormati API); tidak ada jalur yang meminta limit < 32.
- **Kegagalan dibedakan dari konteks pemanggilan, bukan teks error**
  (Task 2): `fetch` yang menolak dengan `TypeError: Failed to fetch`
  maupun status non-OK dipetakan ke pesan per panggilan —
  "Perlu internet untuk mencari ikon" / "…memuat daftar koleksi ikon" /
  "…memuat set ikon …" — tanpa pernah memeriksa isi string error.
  Timeout dibedakan dari abort eksternal: helper internal
  `fetchWithTimeout` memakai `AbortController` + `setTimeout`, menandai
  `timedOut` sebelum abort, dan mengubah timeout menjadi Error berkode
  `ICONIFY_TIMEOUT` ("…kehabisan waktu (N detik)"); abort dari `signal`
  eksternal diteruskan apa adanya sebagai `AbortError` agar UI bisa
  mengabaikannya (penting untuk pembatalan request basi, design §7.3).
- **Memoize + retry:** `listCollections` memegang satu promise;
  `loadSet` memegang Map prefix → promise. Bila promise gagal, entri
  cache-nya dihapus sehingga percobaan berikutnya mencoba lagi (bukan
  meng-cache kegagalan selamanya) — diverifikasi oleh tes "mencoba lagi
  setelah gagal".
- **`isPaletteIcon` dan `fill="none"`:** spesifikasi harfiah ("fill
  eksplisit selain `currentColor`") akan salah mengklasifikasi ikon
  stroke-based Tabler (`<g fill="none" stroke="currentColor" …>`,
  Task 1) sebagai palette — akibatnya Task 6 tidak akan menerapkan
  Fill/Stroke aktif ke ikon itu. Implementasi mengecualikan `none`
  (juga `transparent`, `inherit`, dan string kosong) dari "fill
  eksplisit", dan memeriksa atribut `fill="…"` maupun `fill: …` di
  `style="…"`. Diverifikasi oleh tes: `tabler:home` → `false`.
- **Validasi defensif minimal** (di luar brief, 3 baris): query kosong
  dan prefix kosong/invalid ditolak sebelum fetch, agar tidak ada URL
  yang terbentuk dari input sembarangan.

Tidak ada kode UI, tidak ada mutasi dokumen, tidak ada dependensi npm
baru, tidak ada host selain kedua konstanta di atas.

## 2. TDD Evidence

### RED — sebelum implementasi

```text
$ node --test tests/iconify-client.test.cjs
ℹ tests 12
ℹ pass 0
ℹ fail 12
✖ … (12/12) Error: Build failed with 1 error:
  error: Could not resolve "/home/hatch/workspace/geovanta-round2/src/renderer/iconifyClient.jsx"
```

Kegagalan diharapkan: modul belum ada, jadi pemuat esbuild di tes
gagal di `fresh()` pada tiap tes (bukan kegagalan asersi — memang
belum ada kode yang bisa diasersi).

### GREEN — setelah implementasi

```text
$ node --test tests/iconify-client.test.cjs
ℹ tests 12
ℹ pass 12
ℹ fail 0
```

Lalu 2 tes tambahan ditambahkan saat self-review (signal eksternal
dan retry setelah gagal — §6), dan hasil akhir:

```text
$ node --test tests/iconify-client.test.cjs
ℹ tests 14
ℹ pass 14
ℹ fail 0
```

### Full suite + build

```text
$ npm test
ℹ tests 291
ℹ pass 291
ℹ fail 0

$ npm run build:web
exit 0 — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."
```

Baseline suite sebelum task ini adalah 277 tes (291 − 14 tes baru =
277; tidak ada tes lama yang diubah atau dihapus). Output `npm test`
mengandung 28 baris `Warning: useLayoutEffect …` dari tes React
lain yang sudah ada — 0 di antaranya berasal dari file tes ini
(focused run `tests/iconify-client.test.cjs` bersih: 0 warning).
`node --check` tidak berlaku untuk `.jsx` (`ERR_UNKNOWN_FILE_EXTENSION`);
sintaks dibuktikan oleh bundel esbuild saat tes dimuat dan oleh
`build:web` exit 0.

Satu gangguan selama verifikasi: satu pemanggilan tool yang
menjalankan focused + full suite terputus karena service restart di
tengah jalan (tidak menulis file output apa pun). Tidak ada pekerjaan
yang hilang — edit tes sudah tersimpan di disk; focused (14/14) dan
full suite (291/291) dijalankan ulang secara terpisah dan keduanya
hijau.

## 3. Tests

File: `tests/iconify-client.test.cjs` — 14 tes, `fetch` global di-mock
per tes (pola pemuat esbuild yang sama dengan
`tests/google-fonts.test.cjs`). Modul dimuat **fresh per tes** karena
memoize per sesi akan mengotori hitungan fetch antar tes bila modul
hanya dimuat sekali.

Sembilan tes dari Step 1 brief (semua ada):

1. `searchIcons("home")` memanggil URL persis
   `{API}/search?query=home&limit=48` dan mem-parse ikon
   (`name`/`prefix`/`palette`/`license` dari `collections` respons).
2. `searchIcons("home", {prefix: "mdi"})` menambahkan `&prefix=mdi`;
   `start: 48` menambahkan `&start=48`.
3. `listCollections()` fetch `/collections` sekali untuk dua panggilan.
4. `loadSet("mdi")` fetch `{CDN}/mdi/icons.json` sekali untuk dua
   panggilan, mengembalikan `width`/`height`/`icons`.
5. `buildIconSvg("home", setData)` mengembalikan string SVG berisi body
   + viewBox set (juga menerima nama `"mdi:home"`; melempar bila ikon
   tidak ada).
6. `isPaletteIcon`: `true` untuk `palette: true` dan untuk
   `fill="#ff0000"`; `false` untuk body `currentColor`-only di koleksi
   non-palette (plus `fill="none"` → `false`, lihat §1).
7. `loadSet` menolak saat respons > 10 MB.
8. `loadSet` menolak saat fetch tidak pernah resolve (fake timers,
   timeout 30 detik).
9. `probeOnline` mengembalikan `false` saat fetch reject (dan `true`
   saat `/version` OK).

Lima tes tambahan (di luar brief, memverifikasi perilaku nyata yang
diimplementasikan):

10. `searchIcons` menolak dengan pesan offline saat fetch melempar
    `TypeError: Failed to fetch` (carry note Task 2).
11. `loadSet` menolak saat HTTP 404.
12. `buildIconSvg` menolak SVG ikon > 256 KB (design §7.10).
13. `searchIcons` meneruskan `AbortError` saat `signal` eksternal
    dibatalkan.
14. `loadSet` mencoba lagi setelah gagal (cache kegagalan tidak
    dipertahankan).

Catatan implementasi tes timeout: API mock timers Node v24 di VM ini
hanya menyediakan `tick` sinkron (`tickAsync` **tidak ada** —
`TypeError: t.mock.timers.tickAsync is not a function` pada run hijau
pertama, 11/12). Tes diperbaiki memakai `t.mock.timers.tick(30000)`
sinkron diikuti `await pending` untuk menguras microtask penolakan;
setelah itu 12/12 hijau. Ini koreksi tes, bukan koreksi produk.

## 4. Metode penolakan 10 MB (ruling R9)

**Dipilih: ukuran body terakumulasi** — `loadSet` membaca respons
lewat `res.arrayBuffer()` dan menolak bila
`buf.byteLength > 10 * 1024 * 1024`, sebelum `JSON.parse`.
Header `Content-Length` **tidak** dibaca sama sekali.

Alasan: berlaku juga bila header tidak ada (respons chunked) atau
tidak jujur; satu-satunya jalur baca set JSON adalah `arrayBuffer`
ini, jadi tidak ada jalur lain yang bisa lolos dari batas. Tes
memock hal yang sama: `arrayBuffer` mengembalikan
`ArrayBuffer(10 MB + 1)` dan asersi penolakan `/terlalu besar.*10 MB/i`.
Konsekuensi yang dicatat jujur: body 10 MB+ tetap diunduh penuh
sebelum ditolak (tidak ada pembatalan dini berbasis header) — dapat
diterima karena set Iconify terbesar yang teramati ~3 MB dan batas ini
adalah pengaman, bukan jalur normal.

## 5. Files changed / created

Dibuat:

- `src/renderer/iconifyClient.jsx` (9.942 byte) — klien hybrid, 8 exports.
- `tests/iconify-client.test.cjs` (10.108 byte) — 14 tes, fetch di-mock.
- `docs/superpowers/plans/sdd-2026-11-15-iconify/task-3-report.md` — laporan ini.

Diubah: tidak ada (tidak ada file `src/` lain yang disentuh; tidak
ada backup karena `iconifyClient.jsx` baru). Bukan repo git — tidak
ada commit.

## 6. Self-review

- **Completeness:** kedelapan item "produces" brief ada dengan
  signature persis (termasuk `signal` di `searchIcons` dan
  `timeoutMs = 3000` di `probeOnline`); kesembilan tes Step 1 ada.
  Satu ketidaksesuaian penamaan dicatat jujur: narasi brief menyebut
  "tujuh exports" tetapi mendaftar delapan item — kedelapan item
  diimplementasikan, tidak ada yang dihilangkan.
- **Quality:** timeout via `AbortController` (bukan `Promise.race`
  yang membiarkan fetch menggantung); tidak ada kode UI; fetch hanya
  ke dua host konstanta; memoize sesuai brief (promise koleksi, Map
  set) + eviksi saat gagal.
- **Discipline:** hanya yang diminta brief + batas 256 KB dari
  design §7.10 (constraint global brief) + validasi input minimal.
  Tidak ada ekspor tambahan (tidak ada fungsi reset cache untuk tes —
  tes memakai modul fresh sebagai gantinya).
- **Testing:** logika nyata diuji dengan fetch di-mock di boundary
  (URL persis, pemetaan respons, memoize, batas byte, timeout,
  abort); `npm test` 291/291, `build:web` exit 0, focused run tanpa
  warning.
- **Perbaikan saat self-review:** 2 tes tambahan (signal eksternal,
  retry setelah gagal) ditambahkan karena keduanya adalah perilaku
  yang dijanjikan signature/kode tetapi belum terbukti oleh tes —
  keduanya hijau pada run pertama (14/14).

## 7. Issues / concerns

- Tidak ada blocker. Dua hal untuk Task 4/6/7:
  1. `searchIcons` mengembalikan `collections` mentah (objek keyed by
     prefix) persis seperti respons API, bukan array — bila Task 4
     mengharapkan array, ia harus memetakannya sendiri (atau memakai
     `listCollections()` yang sudah mengembalikan array).
  2. `isPaletteIcon` mengecualikan `fill="none"` dari "fill eksplisit"
     (lihat §1) — ini interpretasi spesifikasi yang disengaja agar
     ikon stroke-based Tabler tetap monokrom; bila koordinator
     menginginkan pembacaan harfiah ("selain currentColor" saja),
     satu baris di `hasExplicitFill` yang berubah.
- `probeOnline` memperlakukan HTTP non-OK sebagai offline (`false`);
  itu konsisten dengan "false on timeout or network error" tetapi
  status 5xx dari API yang hidup juga terbaca offline — dapat
  diterima untuk probe status (panel hanya butuh ya/tidak).
