# Brief — Ronde 3, Task T6: `<span class="c-inp-txt sel">` width mengikuti isi teks

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T6 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Pada `<span class="c-inp-txt sel"></span>`, ubah width-nya agar mengikuti
otomatis isi teks yang ada di dalamnya (width intrinsik/auto, bukan fixed).

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

- `src/components/ui/CustomTextBox.jsx:236` — span tampil saat `editing &&
  selAll && shown`: `<span className={'c-inp-txt' + (editing && selAll &&
  shown ? ' sel' : '')}>{shown}</span>`. Root `.c-inp` di `:213`
  (`role="textbox"`, `data-custom-input="true"`).
- Aturan bundle `src/vendor/tailwindOfflineBundle.jsx`: `.c-inp`,
  `.c-inp-txt`, `.c-inp-txt.sel`, `.c-inp.ctr`, `.c-inp.dis`. Baca
  deklarasi ketiganya + parent flex sebelum memutuskan mekanisme.
- Selidiki rantai layout yang memaksa width tetap (kemungkinan `flex: 1` /
  `width: 100%` pada `.c-inp-txt` atau parent flex `.c-inp`); perbaiki di
  aturan yang tepat tanpa merusak mode non-`sel` (teks biasa saat tidak
  editing / editing tanpa select-all).

## Langkah

- Ubah width span `.c-inp-txt.sel` agar intrinsik/auto mengikuti isi teks
  (mis. `width: auto` + `flex: 0 0 auto` / `display: inline-block` —
  pilih mekanisme struktural, bukan magic number; reviewer sahkan).
- Perilaku edit (select-all saat editing, caret, commit Enter/blur, batal
  Esc) TIDAK berubah. Uji pada pemakaian nyata yang menampilkan state
  `sel`: kotak hex ColorText (`.fld.hexf`, dipakai probe R2 T8) + field
  lain yang memakai CustomTextBox — dengan teks pendek DAN panjang.
- Perhatian: T9 (berikutnya) menyentuh root `.c-inp` + fungsi CustomTextBox
  — T6 JANGAN mengubah perilaku root; T9 nanti JANGAN merusak width auto
  ini (probe T6 hijau sesudah T9).

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t6-cinp-txt-sel.cjs`: RED dulu — ukur
  `offsetWidth` span `.c-inp-txt.sel` vs lebar isi teks untuk 2 panjang
  teks berbeda (pendek mis. "12" / "FF" + panjang mis. "#ABCDEF" / angka
  panjang): sebelum fix lebar span SAMA untuk keduanya (atau tidak
  mengikuti isi — buktikan angkanya); sesudah fix lebar mengikuti isi
  (lebar panjang > lebar pendek, selisih ≈ selisih lebar teks ±2px).
  Gunakan pemakaian nyata (buka popover ColorField / ColorText, masuk
  mode editing + select-all — ikuti pola `setColorFieldHex` di
  `probes/probe-r2-t8-last-color.cjs`).
- Sertakan asersi: mode non-`sel` tak berubah (lebar/perilaku field biasa
  tetap), commit Enter tetap jalan, 0 pageerror.
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T6_URL`, mis.
  `http://127.0.0.1:8992/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after: `probes/shots/r3-t6-cinp-txt-sel-before.png` /
  `r3-t6-cinp-txt-sel-after.png` (close-up field yang sedang editing +
  select-all bila memungkinkan). Screenshot before WAJIB dari state
  pra-fix.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe yang menyentuh
  ColorText/hex (R2 T8 fase B/D) hijau bila sempat — minimal laporkan
  yang dijalankan.

## Aturan global yang mengikat

- Backup `.bak-r3t6` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle sesudah perubahan (aturan AST total,
  `!important`, `acc-deep`) + justifikasi bila aturan bertambah. Baseline
  berjalan: 841 aturan, `!important` 356, `acc-deep` 5 — verifikasi ulang
  sebelum melapor.

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-6-report.md` (rantai
layout penyebab + mekanisme fix, pengukuran lebar pendek/panjang pra &
pasca, bukti RED/GREEN probe + perintah + output, file yang diubah, hasil
`npm test`, angka tripwire, self-review, concern). Lalu laporkan kembali
dengan status singkat (DONE / DONE_WITH_CONCERNS / BLOCKED /
NEEDS_CONTEXT), ringkasan satu baris hasil tes, dan path laporan.
