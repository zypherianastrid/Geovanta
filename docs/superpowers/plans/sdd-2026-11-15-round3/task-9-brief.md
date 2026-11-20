# Brief — Ronde 3, Task T9: `.c-inp` width mengikuti isi teks + perbaiki fungsinya (INVESTIGASI DULU)

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T9 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Pada class `.c-inp`, buat agar width-nya mengikuti otomatis isi teks di
dalamnya, dan perbaiki juga fungsinya.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

- `src/components/ui/CustomTextBox.jsx` — komponen lengkap (baca SELURUH
  file sebelum memutuskan apa pun; file ini kecil dan menentukan semua
  perilaku). Root `.c-inp` di `:213` (`role="textbox"`,
  `data-custom-input="true"`, `onFocus={startEdit} onBlur={finishEdit}
  onKeyDown={onKeyDown} onPaste={onPaste} onDoubleClick={...}`); render
  teks di `:236` (`.c-inp-txt` / `.c-inp-txt.sel` / `.c-caret`).
- Aturan bundle `src/vendor/tailwindOfflineBundle.jsx`: `.c-inp` (AST
  #466: `display: inline-flex; width: 100%; ...` — baca deklarasi lengkap),
  `.c-inp-txt` (#468), `.c-inp-txt.sel` (#469 — diubah T6: `width: auto;
  flex: 0 0 auto`), `.c-inp.ctr`, `.c-inp.dis`, `.c-caret` (#470).
- Pemakaian `.c-inp` (cari semua pemakai `CustomTextBox` / `data-custom-input`
  di `src/`): ColorText / `.fld.hexf` (kotak hex), kotak alpha, TransformField,
  dan field lain. Perilaku width + fungsi dapat berbeda per pemakaian —
  catat pemakaian mana yang diuji.
- RIWAYAT MENGIKAT: T6 membuktikan `.c-inp-txt.sel` lebar tetap karena
  tabrakan `.sel` generik (`width: 100%`); fix T6 scoped ke span itu dan
  probe T6 (10/10) HARUS tetap hijau sesudah T9. Jangan ulangi diagnosis
  T6 sebagai diagnosis T9 tanpa bukti baru.

## Langkah

### Step 1 — Investigasi (WAJIB sebelum edit apa pun)

Selidiki + reproduksi di browser asli (Playwright, Chromium 1255), DUA
sub-tugas:

(a) **Width root `.c-inp`:** ukur lebar render `.c-inp` vs lebar isi teks
    di tiap pemakaian nyata (kotak hex, alpha, TransformField, dsb.).
    Rantai apa yang memaksa lebar tetap (`width: 100%` #466? parent flex?
    `flex: 1` dari pemakai?). Catat angka per pemakaian.

(b) **FUNGSI** — uji tiap perilaku `CustomTextBox` di browser asli dan
    catat mana yang gagal (kriteria gagal: perilaku yang diharapkan dari
    kode/kontrak komponen tidak terjadi + tanpa penjelasan):
    - ketik + Enter commit (nilai diterapkan ke dokumen),
    - blur commit (klik di luar sesudah ketik),
    - Esc batal (nilai kembali ke semula, tanpa commit),
    - paste (tempel teks → nilai berubah),
    - Ctrl+A / Cmd+A select-all (masuk mode `sel`),
    - klik ganda (double-click → select-all / masuk edit),
    - mode `dis` (disabled: tidak bisa edit, tampilan muted),
    - `onClear` bila ada pemakaian (kosongkan field → nilai kembali Auto),
    - caret terlihat + bergerak saat ketik (mode editing non-`sel`),
    - nilai panjang (melebihi lebar field) — terpotong rapi atau meluber?
    Tulis hipotesis tunggal per kegagalan (systematic-debugging Fase 1–3).

### Step 2 — Perbaiki HANYA yang terbukti rusak

- (a) Width intrinsik/auto mengikuti isi teks — mekanisme struktural,
  tanpa magic number; JANGAN merusak width auto T6 (`.c-inp-txt.sel`).
  PERHATIAN: root `.c-inp` dipakai di banyak tempat dengan lebar
  container yang berbeda — bila width auto pada root akan memecahkan
  pemakaian tertentu (mis. field yang memang harus mengisi lebar
  parent), SCOPING ke pemakaian yang diminta user harus diputuskan +
  dicatat + disahkan reviewer. Jangan asal ubah `.c-inp` global bila
  buktinya menuntut scoping.
- (b) Fungsi yang rusak — perbaiki di AKAR (satu perubahan per akar
  masalah). JANGAN ubah perilaku yang terbukti benar; bila suatu
  kandidat terbukti berfungsi, catat buktinya, jangan edit.
- Bila TIDAK ADA fungsi yang terbukti rusak (hanya width), laporkan itu
  apa adanya + bukti per kandidat — jangan mengarang fix fungsi.

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t9-cinp.cjs`: RED dulu per sub-bukti —
  (a) width: 2 panjang teks di tiap pemakaian yang diubah (lebar root
  mengikuti isi sesudah fix); (b) fungsi: skenario yang TERBUKTI gagal
  di Step 1 (gagal pra-fix, hijau pasca-fix) + kandidat yang terbukti
  benar sebagai kontrol hijau pra/pasca. Sertakan 0 pageerror.
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T9_URL`, mis.
  `http://127.0.0.1:8998/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after: `probes/shots/r3-t9-cinp-before.png` /
  `r3-t9-cinp-after.png`. Screenshot before WAJIB dari state pra-fix.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe T6 hijau
  (10/10 — WAJIB); probe R2 T8 hijau (22/22 — ColorText/hex).

## Aturan global yang mengikat

- Backup `.bak-r3t9` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle sesudah perubahan (aturan AST total,
  `!important`, `acc-deep`) + justifikasi bila aturan bertambah. Baseline
  berjalan: 842 aturan, `!important` 356, `acc-deep` 5 — verifikasi ulang
  sebelum melapor.

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-9-report.md` (hasil
investigasi Step 1 per kandidat + angka, keputusan edit / tanpa-edit per
sub-tugas + alasannya, bukti RED/GREEN probe + perintah + output, file
yang diubah bila ada, hasil `npm test`, angka tripwire, self-review,
concern). Lalu laporkan kembali dengan status singkat (DONE /
DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), ringkasan satu baris hasil
tes, dan path laporan.
