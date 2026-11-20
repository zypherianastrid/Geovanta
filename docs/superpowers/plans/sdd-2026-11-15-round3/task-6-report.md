# Laporan — Ronde 3, Task T6: `<span class="c-inp-txt sel">` width mengikuti isi teks

- **Status:** DONE
- **Tanggal:** 2026-11-15
- **Working copy:** `~/workspace/geovanta-round2/` (bukan git repo — tanpa commit)
- **Skill yang dipakai:** `systematic-debugging` (tracing rantai layout),
  `ui-ux-fixer-and-improvement` (diagnosis layout struktural, tanpa magic
  number / override kosmetik), `test-driven-development` (probe RED dulu),
  `browser_ui_fix_verification` (ukur lebar render nyata di Chromium),
  `verification-before-completion` (klaim hanya dari run perintah segar).

## 1. Rantai layout penyebab width tetap (root cause)

Bukan `flex: 1` / `width: 100%` pada `.c-inp-txt` itu sendiri — melainkan
**tabrakan nama class `.sel`**:

1. Root `.c-inp` (AST #466): `display: inline-flex; width: 100%` — lebar
   root di kotak hex popover ColorField = **53,59 px**.
2. Span `.c-inp-txt.sel` adalah flex item dari root itu. Aturan
   `.c-inp-txt` (AST #468) tidak mendeklarasi `width`/`flex` apa pun;
   aturan `.c-inp-txt.sel` (AST #469) pra-fix hanya mendeklarasi
   `background` + `color`.
3. Aturan generik **`.sel`** (AST #145 — baris Selection-colors, bukan
   milik CustomTextBox) mendeklarasi
   `display: flex; align-items: center; justify-content: space-between;
   width: 100%; padding: 9px 12px; ...` dan **ikut match** pada span
   karena span membawa class `sel`. Spesifisitasnya (0,1,0) seri dengan
   `.c-inp-txt`, dan `.sel` adalah satu-satunya aturan yang menetapkan
   `width` pada span — jadi `width: 100%` menang.
4. Akibatnya flex-basis auto span = 100% lebar container → span selebar
   root dikurangi caret sibling (~2,4 px) = **51,17 px untuk teks apa pun**.
   Bukti pra-fix (Chromium 1255, diukur langsung): `FF` → 51 px,
   `0D99FF` → 51 px, `ABCDEF` → 51 px, padahal lebar render teks
   sebenarnya (Range atas isi span) masing-masing 12,47 / 41,81 /
   44,72 px. Kotak alpha (`width: 54px` fix): span 25 px untuk `5`
   maupun `100`.
5. Mode non-`sel` tidak kena: span tanpa class `.sel` tidak match aturan
   `.sel`, jadi sudah intrinsik (49 px untuk `ABCDEF` + caret di dalam).
   Padding `9px 12px` dari `.sel` tidak bocor karena `.c-inp-txt`
   (#468) datang sesudah `.sel` (#145) dengan spesifisitas sama →
   `padding: 0 1px` menang. Jadi satu-satunya kebocoran yang berdampak
   adalah `width: 100%` (+ `display: flex`/`justify-content` yang tidak
   berdampak pada lebar).

Hipotesis (Phase 3 systematic-debugging): "lebar span tetap karena
`width: 100%` dari `.sel` generik; `.c-inp-txt.sel` (0,2,0) dapat
meng-override-nya" — terkonfirmasi oleh pengukuran pra-fix dan oleh
`getComputedStyle` (`width: 51.1719px`, `flex: 0 1 auto`) serta daftar
aturan yang match pada span.

## 2. Mekanisme fix yang dipilih

Struktural, scoped hanya ke `.c-inp-txt.sel` (AST #469), tanpa menyentuh
root `.c-inp` (milik T9 nanti) dan tanpa menyentuh aturan `.sel` generik
(milik Selection-colors):

```json
{"t":"r","s":".c-inp-txt.sel","d":[
  ["background","color-mix(in srgb, var(--acc) 26%, transparent)"],
  ["color","var(--ink)"],
  ["width","auto"],
  ["flex","0 0 auto"]]}
```

- `width: auto` — spesifisitas (0,2,0) mengalahkan `width: 100%` dari
  `.sel` (0,1,0) apa pun urutan sumber; flex-basis auto kembali berarti
  ukuran konten.
- `flex: 0 0 auto` — sebagai flex item: tidak grow (tidak mengisi sisa
  container), tidak shrink (tidak terjepit di bawah ukuran konten saat
  teks panjang di field sempit); basis = konten. Teks yang lebih panjang
  dari root tetap terpotong oleh `overflow: hidden` root seperti semula.
- Tanpa `!important`, tanpa magic number, tanpa offset/z-index/klip baru,
  tanpa perubahan label/i18n, tanpa text-wrap, tanpa dependensi baru.

## 3. Pengukuran lebar pendek/panjang (Chromium 1255, viewport 1440×900)

Lebar teks = `Range.getBoundingClientRect()` atas isi span; ekspektasi
span = lebar teks + padding `0 1px` (= 2 px), toleransi ±2 px.

### Kotak hex ColorField (popover fill, root 53,59 px)

| Teks | Pra-fix span | Pra-fix teks | Pasca-fix span | Pasca-fix teks |
| --- | --- | --- | --- | --- |
| `FF` (pendek) | 51 px | 12,47 px | **14 px** | 12,47 px |
| `0D99FF` (default) | 51 px | 41,81 px | **44 px** | 41,81 px |
| `ABCDEF` (panjang) | 51 px | 44,72 px | **47 px** | 44,72 px |

Selisih span panjang−pendek: pra-fix **0 px** (teks 32,25 px) → pasca-fix
**33 px** (teks 32,25 px, selisih 0,75 px ≤ ±2).

### Kotak % alpha (field sempit, `width: 54px`, root 27,69 px)

| Teks | Pra-fix span | Pasca-fix span |
| --- | --- | --- |
| `5` (pendek) | 25 px | **9 px** (teks 6,88 px) |
| `100` (panjang) | 25 px | **23 px** (teks 20,59 px) |

### Kontrol non-`sel` (tidak berubah)

Span biasa `ABCDEF` + caret di dalam: **49 px pra-fix dan 49 px
pasca-fix** (ekspektasi 49,22 px) — mode non-`sel` tidak tersentuh.

## 4. Yang diimplementasikan

- Satu file diubah: `src/vendor/tailwindOfflineBundle.jsx` (baris 437,
  AST #469 `.c-inp-txt.sel`): tambah `["width","auto"]` dan
  `["flex","0 0 auto"]`. Backup:
  `src/vendor/tailwindOfflineBundle.jsx.bak-r3t6` (dibuat sebelum edit
  pertama).
- Probe baru: `probes/probe-r3-t6-cinp-txt-sel.cjs` (10 asersi).
- Screenshot: `probes/shots/r3-t6-cinp-txt-sel-before.png` (pra-fix,
  highlight memenuhi lebar field) dan
  `probes/shots/r3-t6-cinp-txt-sel-after.png` (pasca-fix, highlight
  menempel pada teks `ABCDEF`, caret terlihat di sebelahnya).
- Server statis sendiri: `python3 -m http.server 8992 --directory web`,
  URL via `R3_T6_URL=http://127.0.0.1:8992/`.

## 5. Pengujian + bukti TDD (RED → GREEN)

### RED (pra-fix, build lama)

Perintah:

```
R3_T6_URL=http://127.0.0.1:8992/ R3_T6_SHOT=probes/shots/r3-t6-cinp-txt-sel-before.png node probes/probe-r3-t6-cinp-txt-sel.cjs
```

Output (ringkas): **R3-T6: 5/10 lolos | GAGAL: S1, S2, S3, S6, S7**,
exit 1. Yang gagal tepat lima asersi lebar intrinsik (span 51 px untuk
`FF`/`ABCDEF`, 25 px untuk `5`/`100`, dSpan 0). Kontrol S4 (non-sel),
S0/S5 (masuk mode sel), S8 (commit Enter), E0 (0 pageerror) sudah lolos
pra-fix — probe mendiskriminasi dengan benar. (Catatan: run RED pertama
5→4/10 karena S4 memakai ekspektasi tanpa caret; diperbaiki di probe —
caret 2,5 px ada di dalam span mode non-sel — lalu RED kedua 5/10
dengan hanya S1/S2/S3/S6/S7 gagal.)

### GREEN (pasca-fix, sesudah `npm run build:web`)

Perintah:

```
npm run build:web
R3_T6_URL=http://127.0.0.1:8992/ node probes/probe-r3-t6-cinp-txt-sel.cjs
```

Output: **R3-T6: 10/10 lolos | SEMUA LOLOS**, exit 0. Detail: S0 sel
`0D99FF` tampil; S1 `FF` span 14 px; S2 `ABCDEF` span 47 px; S3 dSpan 33
vs dText 32,25; S4 non-sel 49 px tak berubah; S5 alpha sel `100`; S6
alpha `5` span 9 px; S7 alpha `100` span 23 px > 9 px; S8 commit Enter
`FF00FF` → fill `#FF00FF`; E0 0 pageerror.

### Regresi

- `npm test` (penuh, sesudah fix): **277/277 PASS, 0 fail**.
- Probe R2-T8 (menyentuh ColorField/hex, fase B/D): **22/22 lolos**
  (`R2_T8_URL=http://127.0.0.1:8992/ node probes/probe-r2-t8-last-color.cjs`,
  exit 0) — termasuk B1/B2 (ColorField baris terakhir), C2–C4 (Recolor
  Mode 2, ColorText override), D1/D2 (warna drop-shadow via ColorField),
  E0 0 pageerror. Tidak ada regresi pada Selection-colors maupun
  ColorText/hex.

## 6. Angka tripwire bundle (sesudah perubahan)

| Metrik | Baseline (brief) | Terverifikasi pra-fix | Pasca-fix |
| --- | --- | --- | --- |
| Aturan AST total | 841 | 841 | **841** (tidak ada aturan baru) |
| `!important` (raw file) | 356 | 356 | **356** |
| `acc-deep` (raw file) | 5 | 5 | **5** |

Tidak ada aturan bertambah (hanya +2 deklarasi di dalam aturan #469 yang
sudah ada); tidak ada `!important` baru. Verifikasi via parse JSON AST
(`json.loads` + hitung) dan `str.count` pada file.

## 7. Self-review (baca ulang diff dengan mata segar)

- Diff hanya satu baris (AST line 437): dua deklarasi baru di aturan
  `.c-inp-txt.sel`; tidak ada file lain yang berubah kecuali probe +
  screenshot + laporan baru. `diff` backup vs hasil edit menunjukkan
  hanya segmen aturan itu yang berbeda.
- Scope: tidak menyentuh root `.c-inp`, tidak menyentuh aturan `.sel`
  generik (Selection-colors tetap `width: 100%` seperti semula — tidak
  ada regresi visual di sana; dibuktikan R2-T8 bila hijau, § 8).
- `flex: 0 0 auto` + `width: auto` adalah kombinasi yang diminta brief
  secara verbatim sebagai opsi mekanisme; `display: inline-block` tidak
  ditambahkan karena sebagai flex item span sudah ter-blockify dan
  deklarasi itu tidak mengubah apa pun.
- Satu pertimbangan: `.sel` generik masih menyumbang `display: flex`
  dan `justify-content: space-between` pada span. Sebagai flex container
  dengan satu anonymous item teks, keduanya tidak memengaruhi lebar
  (terbukti pengukuran pasca-fix: span = teks + 2 px). Membersihkannya
  akan memperluas scope ke luar `.c-inp-txt.sel` — tidak dilakukan.
- Edge case: teks lebih panjang dari root (mis. ColorText `#ABCDEF12`
  di field sempit) — span mempertahankan lebar konten (`flex-shrink: 0`)
  dan root `overflow: hidden` memotong seperti perilaku pra-fix; tidak
  ada overflow baru ke luar field. Tidak diuji dengan teks sepanjang itu
  (hex maxLen 6, alpha maxLen 3) — dicatat sebagai batasan.

## 8. Isu / concern

- (R2-T8) Regresi ColorField/hex hijau penuh: **22/22 lolos** pasca-fix
  (termasuk fase B ColorField baris terakhir, fase C Recolor Mode 2 via
  ColorText, fase D drop-shadow). Aturan `.sel` generik tidak tersentuh
  dan Selection-colors tetap berfungsi.
- Screenshot before/after adalah close-up elemen `.fld.hexf` (±200×34
  px, ~1,5 KB per file) — perbedaan visualnya tipis pada skala itu
  (before: highlight sampai tepi kanan field; after: highlight berakhir
  setelah `F` + caret terlihat); angka pengukuran adalah bukti utama.
- Perilaku Esc: probe memakai Esc untuk membatalkan edit hex/alpha dan
  popover tetap terbuka (sesuai harapan); commit Enter terverifikasi
  (S8). Caret/blur tidak diuji di luar itu.
- T9 nanti menyentuh root `.c-inp` + fungsi CustomTextBox — probe T6
  ini (S1–S3, S6–S7) harus tetap hijau sesudah T9, sesuai catatan
  brief.
