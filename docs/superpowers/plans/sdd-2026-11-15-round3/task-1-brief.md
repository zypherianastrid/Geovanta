# Brief — Ronde 3, Task T1: Hapus border `.fig-rail-grp`

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T1 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Hapus border pada class `.fig-rail-grp`.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

`src/vendor/tailwindOfflineBundle.jsx`: 2 aturan `.fig-rail-grp` + 1
`.fig-rail-grp:hover`. Aturan dasar (idx 494 di Ronde 2): `border: 1px solid
transparent`, `border-radius: 12px` → Ronde 2 jadi `border-radius: 0`.
Override M3 (idx 794 di Ronde 2): `border: 1px solid rgba(15,23,42,0.06)
!important`, `border-radius: 14px !important` → Ronde 2 jadi
`border-radius: 0 !important`, `box-shadow: none !important`.

"Hapus border" = netralkan `border` di KEDUA aturan (jadi `none` / `0` / hapus
deklarasi — pilih yang tidak menambah `!important` baru; bila harus menyentuh
`!important` M3, sebutkan eksplisit di laporan).

## Langkah

- Netralkan `border` pada `.fig-rail-grp` di aturan dasar DAN override M3
  (verifikasi ulang nomor idx-nya — bila aturan bergeser dari Ronde 2,
  laporkan nomor baru).
- `border-radius: 0` + `box-shadow: none` warisan Ronde 2 JANGAN diubah.
- Tanpa `!important` baru.

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t1-rail-border.cjs` (ikuti pola
  `probes/probe-r2-t1-rail.cjs`): RED dulu — ukur computed `border-width` /
  `border-style` / `border-color` ketiga grup rail; asersi gagal sebelum fix
  (border masih ter-render), hijau sesudah (border `0px`/`none`, tak
  ter-render).
- Probe berjalan melawan hasil BUILD: jalankan `npm run build:web` dulu,
  lalu sajikan `web/` via server statis di port segar MILIKMU SENDIRI
  (jangan mengandalkan port sisa ronde lalu; port via env `R3_T1_URL`,
  mis. `http://127.0.0.1:8981/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, browser ter-cache di
  `~/.cache/ms-playwright` (chromium-1255).
- Screenshot before/after: `probes/shots/r3-t1-rail-border-before.png` /
  `r3-t1-rail-border-after.png`. Screenshot before WAJIB dari state pra-fix
  (jangan tulis ulang file before sesudah fix).
- Regresi: probe Ronde 2 T1 rail (`probes/probe-r2-t1-rail.cjs`) hijau
  (radius/shadow tetap 0/none); `npm test` tetap hijau (baseline 277/277).

## Aturan global yang mengikat

- Backup `.bak-r3t1` per file SEBELUM edit pertama (sufiks R3 agar tidak
  bentrok dengan `.bak-t1..t9` Ronde 2 yang masih ada di working copy).
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi
  baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle sesudah perubahan (aturan AST total,
  `!important`, `acc-deep`) + justifikasi bila aturan bertambah. Baseline
  awal Ronde 3: 841 aturan, `!important` 357, `acc-deep` 6.
- JANGAN sentuh selector lain (khususnya aturan `.ws-nav-item*` — itu ranah
  T2, dan `.dk-b.on` — sudah benar di Ronde 2).

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-1-report.md` (apa yang
diubah, bukti RED/GREEN probe + perintah + output, file yang diubah, hasil
`npm test`, angka tripwire, self-review, concern). Lalu laporkan kembali
dengan status singkat (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT),
ringkasan satu baris hasil tes, dan path laporan.
