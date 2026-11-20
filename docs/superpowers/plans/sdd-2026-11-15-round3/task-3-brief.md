# Brief — Ronde 3, Task T3: Tukar posisi tombol Find and Replace ↔ Recolor

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T3 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Di sidebar kanan, TUKAR posisi tombol Find and Replace dengan tombol Recolor.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

`src/components/editor/EditorRightInspector.jsx:509` — baris
`flex flex-wrap gap-1.5` berisi dua tombol (warisan Ronde 2 T3):

1. Find and Replace — `data-testid="fr-open-selcolors"`, `data-tip="frOpen"`,
   ikon `refresh` 11px, label `{L.frOpenBtn}`, `onClick={() =>
   setFrOpen(v => !v)}`.
2. Recolor — `data-testid="rc-open-selcolors"`, `data-tip="rcOpen"`, ikon
   `palette` 11px, label `{L.rcOpenBtn}`, `onClick={() => setRcOpen(v =>
   !v)}`.

Keduanya `flex: 1`, padding `6px 10px`, `whiteSpace: 'nowrap'`,
`display: 'inline-flex'`, `alignItems: 'center'`, `justifyContent:
'center'`, `gap: 2`.

## Langkah

- Tukar urutan DOM kedua tombol di baris tersebut (Recolor dulu, Find and
  Replace sesudah).
- `data-testid`, `data-tip`, ikon, label, handler, `flex: 1`, padding
  `6px 10px` TIDAK berubah. Jangan sentuh baris Select Same di bawahnya
  (`:514-518` — ranah T8) dan jangan sentuh logika buka/tutup seksi
  F&R/Recolor (snapshot/preview/commit — warisan fix wave ronde lalu).

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t3-swap-fr-rc.cjs` (ikuti pola
  `probes/probe-r2-t3-selsame-buttons.cjs` + `probe-r2-t8-last-color.cjs`
  untuk harness: buat proyek baru, gambar 1 elips agar Selection Colors
  tampil): RED dulu — asersi urutan DOM + posisi X Recolor < posisi X
  F&R gagal sebelum fix, hijau sesudah.
- Sertakan asersi perilaku: klik Recolor membuka seksi Recolor
  (`[data-testid="rc-section"]` tampil); klik F&R membuka seksi Find &
  Replace (tutup Recolor dulu bila perlu — perhatikan mekanisme
  snapshot/preview lintas seksi: jangan ubah logika itu, hanya verifikasi
  buka/tutup tetap jalan).
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T3_URL`, mis.
  `http://127.0.0.1:8985/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after: `probes/shots/r3-t3-swap-fr-rc-before.png` /
  `r3-t3-swap-fr-rc-after.png`. Screenshot before WAJIB dari state pra-fix.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe R2 T3
  (`probes/probe-r2-t3-selsame-buttons.cjs`) — perhatikan: probe R2 T3
  mungkin mengasersi urutan lama; bila asersinya memang mengunci urutan
  F&R-dulu, CATAT itu sebagai regresi yang diharapkan (bukan kegagalan)
  dan laporkan nomor asersinya — JANGAN ubah probe R2 T3 untuk
  menyembunyikan perubahan urutan. Probe R3 T1/T2 tetap hijau.

## Aturan global yang mengikat

- Backup `.bak-r3t3` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle bila berubah (baseline berjalan: 841
  aturan, `!important` 356, `acc-deep` 5 — verifikasi ulang sebelum
  melapor).

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-3-report.md` (apa yang
diubah, bukti RED/GREEN probe + perintah + output, file yang diubah, hasil
`npm test`, angka tripwire, status probe R2 T3 bila mengunci urutan lama,
self-review, concern). Lalu laporkan kembali dengan status singkat (DONE /
DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), ringkasan satu baris hasil
tes, dan path laporan.
