# Brief — Ronde 3, Task T2: `.ws-nav-item.on .ws-nav-ico` accent persis + hapus border-color (INVESTIGASI DULU)

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T2 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Pada `.ws-nav-item.on .ws-nav-ico`, background HARUS benar-benar mengikuti
accent color dari tab Pengaturan (pakai `var(--acc)` persis, bukan
`--acc-deep` / campuran), dan hapus juga border-color-nya.

## Peringatan riwayat (baca baik-baik)

Ronde 2 T1 membuktikan tombol aktif rail `.dk-b.on` SUDAH accent persis
sebelum fix karena override M3 — asumsi "masih salah" terbukti keliru di
sana. JANGAN ulangi asumsi di sini: buktikan dulu dengan computed style di
browser asli apakah `.ws-nav-item.on .ws-nav-ico` ini memang masih salah.
Bila terbukti SUDAH BENAR, tutup task TANPA edit produk (laporan bukti
lengkap); bila terbukti salah, perbaiki di akar.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

- `src/vendor/tailwindOfflineBundle.jsx`: 2 aturan `.ws-nav-item.on
  .ws-nav-ico` (Ronde 2: idx 694 DAN 771, keduanya masih
  `var(--acc-deep)`), 2 aturan `.ws-nav-item.on`, 1 aturan
  `.ws-nav-item.on .ws-nav-cnt`. Verifikasi ulang nomor idx-nya.
- Dipakai di `src/components/workspace/WorkspaceHome.jsx` (nav workspace
  home — BUKAN rail editor). Cari tahu di mana tepatnya `.ws-nav-item`
  dirender dan kapan ia mendapat class `.on`.
- Accent `--acc` diterapkan `src/utils/themeAndPrefsManager.jsx:14`
  (dari prefs; nilai disimpan di localStorage key
  `trace-svg-settings-v1` — lihat pola seed prefs di
  `probes/probe-r2-t1-rail.cjs`).
- JANGAN sentuh `.dk-b.on` / `.tool-btn.on` / `.cp-act-btn.on` /
  `.fig-rail-grp`.

## Langkah

### Step 1 — Investigasi (WAJIB sebelum edit apa pun)

Reproduksi di browser asli (Playwright, Chromium ter-cache):

1. Buka WorkspaceHome (tempat `.ws-nav-item` dirender), temukan elemen
   `.ws-nav-item.on .ws-nav-ico` yang aktif.
2. Ukur computed `background-color` + `border-color` (dan
   `border-width`/`border-style`) elemen itu pada accent default `#0d99ff`.
   Bandingkan dengan computed `--acc` di `:root` dan dengan nilai
   `rgb(13, 153, 255)`.
3. Ganti accent via tab Pengaturan ke DUA warna berbeda (mis. oranye
   `#ff8800` lalu hijau `#00aa55`) — lewat UI Pengaturan yang asli (bukan
   hanya seed localStorage; bila UI Pengaturan tidak dapat dipakai di
   headless, seed via prefs + catat itu sebagai batasan jujur dan ukur
   tetap pada 3 nilai accent). Ukur lagi computed background/border-color
   tiap kali; bandingkan dengan `--acc` tiap kali.
4. Tulis hipotesis tunggal + bukti angka: apakah computed background ==
   `--acc` pada ketiga accent? Apakah ada `border-color` yang ter-render
   (`border-width` > 0 + `border-style` bukan `none`)?

### Step 2 — Perbaiki HANYA bila terbukti salah

- Bila TERBUKTI salah: `background: var(--acc)` persis (bukan `--acc-deep`,
  bukan color-mix) + hapus/netralkan `border-color` (di kedua aturan
  `.ws-nav-item.on .ws-nav-ico` bila keduanya berperan). Tanpa
  `!important` baru.
- Bila TERBUKTI SUDAH BENAR (computed = `--acc` pada ketiga accent +
  tanpa border-color yang ter-render): TUTUP task dengan laporan bukti
  lengkap + TANPA edit produk. Jangan mengarang fix.

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t2-wsnav-accent.cjs` (ikuti pola probe Ronde
  2): asersi = computed background `.ws-nav-item.on .ws-nav-ico` ==
  computed `--acc` pada 3 accent + border tak ter-render. RED = probe
  gagal pada build pra-fix BILA memang ada bug (bila tidak ada bug, probe
  HIJAU sejak awal — itu HASIL yang sah, bukan kegagalan TDD; laporkan
  apa adanya).
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T2_URL`, mis.
  `http://127.0.0.1:8983/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after (bila ada edit) atau screenshot bukti pengukuran
  3 accent (bila tanpa edit): `probes/shots/r3-t2-wsnav-accent-before.png`
  / `r3-t2-wsnav-accent-after.png`. Screenshot before WAJIB dari state
  pra-fix.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe Ronde 2 T1
  rail hijau (`.dk-b.on` tak tersentuh).

## Aturan global yang mengikat

- Backup `.bak-r3t2` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle sesudah perubahan (aturan AST total,
  `!important`, `acc-deep`) + justifikasi bila aturan bertambah. Baseline
  awal Ronde 3: 841 aturan, `!important` 357 (kini 356 sesudah T1 —
  verifikasi ulang angka berjalan sebelum melapor), `acc-deep` 6.

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-2-report.md` (hasil
investigasi Step 1 dengan angka computed per accent, keputusan edit /
tanpa-edit + alasannya, bukti probe + perintah + output, file yang diubah
bila ada, hasil `npm test`, angka tripwire, self-review, concern). Lalu
laporkan kembali dengan status singkat (DONE / DONE_WITH_CONCERNS /
BLOCKED / NEEDS_CONTEXT), ringkasan satu baris hasil tes, dan path
laporan.
