# Laporan — Ronde 3, Task T7: Tab Canvas — tinggi nilai warna = tinggi warna latar

- **Status:** DONE
- **Tanggal:** 2026-11-15 (WIB)
- **Working copy:** `~/workspace/geovanta-round2/` (bukan git repo; "commit" = backup `.bak-r3t7` + laporan ini)
- **Skill yang dipakai:** `systematic-debugging` (ukur dulu, cari akar), `ui-ux-fixer-and-improvement`,
  `test-driven-development` (probe RED dulu), `browser_ui_fix_verification` (ukur tinggi render nyata di
  browser), `verification-before-completion` (klaim hanya dari perintah segar).

## 1. Hasil ukur pra/pasca (tinggi render nyata, Chromium headless 1440×900)

Seksi Canvas tampil **tanpa seleksi objek** (`needsSelection=false` di probe) — sesuai dugaan brief.

| Mode | Pra-fix: swatch (ColorField) | Pra-fix: field hex (ColorText) | Selisih pra | Pasca-fix: swatch | Pasca-fix: field hex | Selisih pasca |
| --- | --- | --- | --- | --- | --- | --- |
| Solid | 30 px | 24 px | **6 px** | 30 px | 30 px | **0 px** |
| Transparent | 30 px | 24 px | **6 px** | 30 px | 30 px | **0 px** |

Detail pasca-fix: kedua elemen `y = 533` (sejajar penuh, bukan hanya tinggi sama); **lebar tidak berubah**
(field hex tetap 205 px pra dan pasca — fix hanya menyentuh tinggi, sesuai brief).

## 2. Akar masalah (systematic-debugging Fase 1–2, terverifikasi di browser — bukan dugaan)

- Aturan bundle `.swatch` (plugin AST idx 164): `width: 30px; height: 30px` → swatch selalu 30 px.
- Aturan bundle `.hexf` (plugin AST idx 172): `display: flex; …; flex: 1; height: 34px; padding: 0 10px`.
- **Bukan 34 vs 30 seperti dugaan awal, melainkan 24 vs 30.** Penyebabnya: `flex: 1` adalah singkatan
  `flex: 1 1 0%` → `flex-basis: 0%`. Elemen `.fld.hexf` adalah flex item di dalam wrapper kolom ColorText
  (`src/components/ui/ColorHexInput.jsx`: `display: flex; flex-direction: column; flex: 1`), sehingga
  sumbu utama (main axis) adalah **vertikal** dan `flex-basis: 0%` **menimpa `height: 34px`** dalam
  perhitungan flex. Field pun menciut ke tinggi konten: `.c-inp` `min-height: 22px` + border 2 px = **24 px**.
- Bukti eksperimen langsung di browser (inline style sementara pada elemen yang sama, pre-fix):
  - baseline: hexf 24 px, swatch 30 px, wrapper luar 24 px;
  - `flex: 0 0 30px` → hexf **30 px**, lebar tetap 205 px, wrapper 30 px;
  - `flex-basis: auto; height: 30px` → hexf **30 px** (juga jalan, tapi 2 deklarasi);
  - **`height: 30px` saja → hexf TETAP 24 px** (kontrol negatif: membuktikan mekanisme "samakan `height`"
    yang disarankan brief saja **tidak akan bekerja** — `flex-basis: 0%` tetap menang);
  - `flex-basis: auto` saja → hexf 34 px (membuktikan `height: 34px` bundle memang ada, hanya tertutup
    `flex-basis`).
- Mode transparent/solid tidak memengaruhi tinggi (mode hanya mengubah nilai/background) — selisih 6 px
  sama di kedua mode, sesuai ukur.

## 3. Mekanisme fix yang dipilih

**Satu aturan AST baru, di-append di AKHIR `TAILWIND_PLUGIN_AST`** (bukan disisip di tengah):

```json
{"t":"r","s":"[data-tip=\"veBgColor\"] .hexf","d":[["flex","0 0 30px"]]}
```

- `flex: 0 0 30px` = grow 0 / shrink 0 / basis 30 px → ukuran main-axis (vertikal, di dalam wrapper kolom
  ColorText) menjadi 30 px, tepat sama dengan tinggi `.swatch` yang dideklarasikan bundle (AST idx 164).
  Angka 30 px **bukan magic number**: itu nilai tinggi swatch yang sama yang diminta brief untuk disamai.
- Satu deklarasi (dipilih atas kandidat 2-deklarasi `flex-basis: auto` + `height: 30px`); tidak bergantung
  pada properti `height`, sehingga kebal terhadap interaksi `flex-basis` vs `height` yang menjadi akar bug.
- Spesifisitas `(0,2,0)` (atribut + kelas) mengalahkan `.hexf` `(0,1,0)` **tanpa `!important`**.
- Scope hanya baris `veBg`: selektor hanya mengenai `.hexf` keturunan elemen ber-`data-tip="veBgColor"`
  (div baris + tombol swatch di dalamnya). Satu-satunya `.hexf` di situ adalah milik ColorText baris ini.
  Popover ColorField **aman**: `Float` di-portal ke `document.body`
  (`src/components/ui/FloatPopover.jsx`: `ReactDOM.createPortal(…, document.body)`), jadi `.hexf` popover
  bukan keturunan baris `veBg` dan tidak tersentuh aturan ini.
- **Tidak** mengubah `.hexf` global (itu akan mengubah baris fill/stroke/Recolor/FindReplace — di luar scope
  brief: "veBg row, nothing more"). **Tidak** mengubah logika `setBg`, nilai warna, commit, lebar, label/i18n.
- Posisi append di akhir array mengikuti konvensi T4 ronde 2 (lihat §6): agar indeks tripwire `[464]/[465]`
  tidak bergeser. Upaya pertama (sisip tepat setelah aturan `.hexf`, idx 173) **sengaja dibatalkan** setelah
  suite menunjukkan tripwire `accent-tokens` gagal — file di-restore byte-per-biji dari `.bak-r3t7` lalu
  aturan di-append di akhir; tidak ada jejak sisipan tengah yang tersisa.

## 4. Bukti TDD (RED → GREEN)

Probe baru: `probes/probe-r3-t7-canvas-heights.cjs` (pola harness `probe-r3-t3-swap-fr-rc.cjs`).
Server: `python3 -m http.server 8994 --directory web` (port segar milik T7, masih berjalan saat laporan ditulis).
URL: `R3_T7_URL=http://127.0.0.1:8994/`.

### RED (pra-fix, build pra-fix)

Perintah: `R3_T7_URL=http://127.0.0.1:8994/ node probes/probe-r3-t7-canvas-heights.cjs before` → **exit 1**

```text
  info needsSelection=false
  info solid: {"found":{"row":true,"swatch":true,"hexf":true},"swatch":{"h":30,"w":30,"y":533},"hexf":{"h":24,"w":205,"y":536},"text":"#ffffff","swatchIsNone":false,"mode":"solid"}
FAIL A1 mode solid: tinggi ColorText == tinggi swatch (±1px) | actual={"swatchH":30,"hexfH":24,"diff":6} expected=|swatchH-hexfH|<=1
  info transparent: {"found":{"row":true,"swatch":true,"hexf":true},"swatch":{"h":30,"w":30,"y":533},"hexf":{"h":24,"w":205,"y":536},"text":"none","swatchIsNone":true,"mode":"transparent"}
FAIL A2 mode transparent: tinggi ColorText == tinggi swatch (±1px) | actual={"swatchH":30,"hexfH":24,"diff":6} expected=|swatchH-hexfH|<=1
PASS A5 toggle transparent->solid jalan (mode=solid, teks hex, swatch bukan is-none)
PASS A3 ganti warna via ColorField (popover hex FF00FF) mengubah nilai latar | actual={"text":"#ff00ff"}
PASS A4 ganti warna via ColorText (ketik #00AA33 + Enter) mengubah nilai latar | actual={"text":"#00AA33"}
PASS A6 0 pageerror | actual=[]
R3-T7 before: 4/6 lolos | GAGAL: A1, A2
```

RED gagal tepat pada asersi tinggi (A1/A2, selisih 6 px), sementara asersi fungsional sudah hijau —
probe menguji hal yang benar.

### GREEN (pasca-fix, build ulang dari aturan akhir)

Perintah: `R3_T7_URL=http://127.0.0.1:8994/ node probes/probe-r3-t7-canvas-heights.cjs after` → **exit 0**

```text
  info needsSelection=false
  info solid: {"found":{"row":true,"swatch":true,"hexf":true},"swatch":{"h":30,"w":30,"y":533},"hexf":{"h":30,"w":205,"y":533},"text":"#ffffff","swatchIsNone":false,"mode":"solid"}
PASS A1 mode solid: tinggi ColorText == tinggi swatch (±1px) | actual={"swatchH":30,"hexfH":30,"diff":0}
  info transparent: {"found":{"row":true,"swatch":true,"hexf":true},"swatch":{"h":30,"w":30,"y":533},"hexf":{"h":30,"w":205,"y":533},"text":"none","swatchIsNone":true,"mode":"transparent"}
PASS A2 mode transparent: tinggi ColorText == tinggi swatch (±1px) | actual={"swatchH":30,"hexfH":30,"diff":0}
PASS A5 toggle transparent->solid jalan
PASS A3 ganti warna via ColorField (popover hex FF00FF) | actual={"text":"#ff00ff"}
PASS A4 ganti warna via ColorText (ketik #00AA33 + Enter) | actual={"text":"#00AA33"}
PASS A6 0 pageerror | actual=[]
R3-T7 after: 6/6 lolos | SEMUA LOLOS
```

Isi probe (6 asersi): A1 solid diff ≤ 1 px; A2 transparent diff ≤ 1 px; A3 ColorField via popover hex
`FF00FF` mengubah nilai; A4 ColorText ketik `#00AA33` + Enter mengubah nilai; A5 toggle
transparent→solid jalan; A6 0 pageerror. Lebar kedua elemen dicatat sebagai info (205 px, tak berubah).

### Screenshot (close-up seksi Canvas, `element.screenshot()` pada `[data-tip="veBg"]`)

- Before (state pra-fix, 22:39): `probes/shots/r3-t7-canvas-heights-before.png` (267×131)
- After (state pasca-fix, 22:44): `probes/shots/r3-t7-canvas-heights-after.png` (267×131)
- Keduanya menampilkan baris swatch + field hex; keduanya terambil sesudah A4 sehingga warnanya
  `#00AA33` (efek samping urutan asersi, bukan perbedaan fix). Perbedaan 6 px pra-fix nyaris tak terlihat
  mata pada skala ini — angka ukur di §1 adalah buktinya.

### Regresi

- `npm test` (penuh, pasca-fix, perintah segar): **277/277 PASS, 0 fail** (durasi ±22,5 dtk).
  Baseline pra-fix juga 277/277 (dijalankan di awal tugas).
- Probe T6 (ColorText dipakai di baris ini — `.c-inp-txt.sel` tak boleh rusak):
  `R3_T6_URL=http://127.0.0.1:8994/ node probes/probe-r3-t6-cinp-txt-sel.cjs after` →
  **R3-T6: 10/10 lolos, exit 0** (S0–S8 + E0). Efek samping: menjalankan probe T6 menimpa ulang
  `probes/shots/r3-t6-cinp-txt-sel-after.png` dengan tangkapan baru terhadap build pasca-T7 (isi setara).
- `npm run build:web`: exit 0 (`[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/`).

## 5. File yang diubah

| File | Perubahan | Backup `.bak-r3t7` |
| --- | --- | --- |
| `src/vendor/tailwindOfflineBundle.jsx` | +1 aturan AST di akhir `TAILWIND_PLUGIN_AST` (idx 841): `[data-tip="veBgColor"] .hexf { flex: 0 0 30px }` — delta tepat **+73 karakter**, tidak ada byte lain berubah (verifikasi via parse JSON AST; perbandingan teks baris raksasa via `difflib` ditinggalkan karena lambat, diganti verifikasi parse) | `src/vendor/tailwindOfflineBundle.jsx.bak-r3t7` (178.519 B, dibuat SEBELUM edit pertama; file di-restore dari backup ini saat membatalkan sisipan tengah, lalu append diterapkan) |
| `tests/accent-tokens.test.cjs` | Tripwire: komentar diperbarui + `assert.equal(ast.length, 841)` → `842` (hanya itu; diff 62,63c62,65) | `tests/accent-tokens.test.cjs.bak-r3t7` (dibuat SEBELUM edit) |

File baru (bukan edit produk): `probes/probe-r3-t7-canvas-heights.cjs`,
`probes/shots/r3-t7-canvas-heights-before.png`, `probes/shots/r3-t7-canvas-heights-after.png`, laporan ini.
Tidak ada file lain yang berubah.

## 6. Angka tripwire bundle (sesudah perubahan)

| Metrik | Baseline (brief) | Terverifikasi pra-fix | Pasca-fix |
| --- | --- | --- | --- |
| Aturan AST total (entri top-level `TAILWIND_PLUGIN_AST`) | 841 | 841 | **842** (+1, disengaja — lihat justifikasi) |
| `!important` (raw file, `str.count`) | 356 | 356 | **356** |
| `acc-deep` (raw file, `str.count`) | 5 | 5 | **5** |

**Justifikasi +1 aturan:** tidak ada aturan existing yang selektornya sudah mencakup *hanya* baris `veBg`
sehingga edit-in-place tidak mungkin tanpa meluaskan scope (mengubah `.hexf` global akan mengubah baris
fill/stroke/Recolor/FindReplace; menambah deklarasi pada aturan radius sidebar `.fig-right-sidebar .hexf`
juga mengenai semua `.hexf` di sidebar). Satu aturan scoped baru adalah perubahan minimal yang memenuhi
"veBg row, nothing more". Aturan di-append di akhir array mengikuti konvensi T4 ronde 2 agar indeks
`[464]/[465]` (`:root` tema) tidak bergeser — diverifikasi: `[464]` dan `[465]` tetap menunjuk aturan tema
yang sama, dan tes tripwire diperbarui ke 842 beserta komentarnya.

## 7. Self-review (baca ulang diff dengan mata segar)

- Diff produk hanya 73 karakter sisipan di satu tempat (akhir array AST, baris 437). Tidak ada
  `!important`/offset/z-index/klip baru, tanpa dependensi baru, tanpa ubah label/i18n/logika, tanpa text-wrap.
- Selektor `[data-tip="veBgColor"] .hexf`: `data-tip="veBgColor"` ada pada div baris DAN tombol swatch;
  keduanya hanya membungkus `.hexf` milik ColorText baris itu. Popover ter-portal ke `body` — di luar
  jangkauan selektor. Tidak ada `.hexf` lain di dalam baris.
- `flex: 0 0 30px` mematikan grow/shrink pada field ini; tidak ada ruang tumbuh yang hilang karena tinggi
  wrapper kolom memang `auto` (ditentukan konten). Lebar terbukti tak berubah (205 px).
- Keadaan error hex (input tidak valid → div `hex-error` muncul di bawah field) tidak diuji probe: field
  sendiri tetap 30 px, baris tumbuh ke bawah seperti sebelumnya. Di luar scope brief.
- Satu catatan proses: skrip debug sekali menulis build dengan JSON AST rusak (koma pemisah hilang saat
  append pertama yang salah hitung) — kesalahan tertangkap SEGERA oleh parse ulang sebelum build/probe
  apa pun dijalankan, lalu file di-restore dari `.bak-r3t7` dan append diulang dengan benar. Tidak ada
  artefak rusak yang tersisa (parse AST pasca-fix sukses, build exit 0, probe hijau).

## 8. Isu / concern

1. **Ketidakkonsistenan yang sama masih ada di baris lain — sengaja tidak disentuh.** Baris fill/stroke
   (`EditorRightInspector.jsx:398/435`) dan target Recolor memakai pasangan ColorField + ColorText yang
   sama, sehingga `.hexf` di sana juga 24 px vs swatch 30 px (akar yang sama persis). Brief T7 membatasi
   scope ke baris `veBg` saja, jadi dibiarkan. Bila controller menginginkan konsistensi global, opsi
   bersihnya adalah mengubah `.hexf` itu sendiri (mis. `flex-basis: auto` + samakan tinggi) — itu
   keputusan produk/scope untuk task terpisah, bukan T7.
2. **Ketergantungan pada struktur DOM ColorText.** `flex: 0 0 30px` menetapkan ukuran main-axis; nilainya
   benar sebagai *tinggi* hanya selama `.hexf` tetap flex item di dalam wrapper kolom ColorText. Bila
   struktur `ColorHexInput.jsx` berubah (mis. wrapper bukan kolom lagi), aturan ini perlu ditinjau ulang.
   Risiko dinilai rendah: selektor ter-scope ke baris `veBg` dan komponen itu stabil.
3. **Screenshot before/after nyaris identik secara visual** pada skala 267×131 (selisih 6 px). Bukti
   utama adalah angka `getBoundingClientRect()` di §1/§4, bukan perbandingan mata.
