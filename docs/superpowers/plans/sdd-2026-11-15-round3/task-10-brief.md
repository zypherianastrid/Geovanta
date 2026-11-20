# Brief — Ronde 3, Task T10: Investigasi + perbaiki "warna terakhir" agar berfungsi 100%

- Plan: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` (§ T10, baris 51 + 99–102)
- Probe R2 T8: `probes/probe-r2-t8-last-color.cjs` (22 skenario, env `R2_T8_URL`)
- Suite baseline: `npm test` 277/277 (terverifikasi controller pasca-T9).

## RIWAYAT PENTING — baca dulu, jangan ulangi dari nol

Ronde 2 T8 menguji 4 kandidat satu per satu di browser asli, **22/22 LOLOS,
tanpa edit produk**:
- (a) strip recent-colors `EditorRightInspector.jsx:363`
  (`data-testid="recent-colors"`, `applyRecentColor`, `rememberRecentColor`
  `VectorEditor.jsx:133`, cap 10 via `[hex, ...cur].slice(0, 10)`) — tiap
  swatch pertama/tengah/terakhir (seed 3 warna via prefs).
- (b) baris TERAKHIR Selection colors `:514-518` + `replaceSelectionColor`
  `VectorEditor.jsx:8146` — ColorField + tombol ◎.
- (c) warna terakhir tiap keluarga Recolor Mode 2 `RecolorSection.jsx:310+`
  — target + override (termasuk elips gray `#808080` keluarga TERAKHIR
  Mode 2 + elips red kedua `#CC0000` supaya tiap keluarga tidak berisi 1 warna).
- (d) warna drop-shadow efek.
- Tiap fase dimulai dari proyek baru (reload) supaya independen. Kriteria
  gagal: klik tidak mengubah fill/seleksi/target + tanpa toast/error yang
  menjelaskan.

## Step 1 (WAJIB sebelum edit apa pun): reproduksi di browser asli

1. **Jalankan ulang probe R2 T8** pada build Ronde 3 saat ini
   (`npm run build:web` dulu, server statis port segar milikmu, URL via
   `R2_T8_URL`). Laporkan angka per fase (A–D), bukan hanya total.
2. **Probe BARU** `probes/probe-r3-t10-last-color.cjs` untuk kandidat baru:
   - (e) **Eviksi batas 10** — seed 11 warna recent (via prefs localStorage
     DAN via pemakaian nyata bila memungkinkan, mis. terapkan 11 warna
     berbeda ke objek satu per satu): verifikasi warna TERTUA tereviksi
     (tidak tampil di strip), warna TERBARU bertahan, dan klik warna terakhir
     tetap menerapkan fill ke objek. Uji juga urutan: warna yang baru dipakai
     naik ke depan.
   - (f) **Persistensi setelah reload** — recentColors di prefs localStorage:
     isi strip, reload halaman, strip tetap menampilkan warna terakhir yang
     sama; klik sesudah reload tetap menerapkan.
   - (g) Klik warna terakhir menerapkan ke objek — sudah tercakup fase A R2;
     laporkan ulang angkanya (jangan klaim tanpa run).
3. Bila menemukan kandidat lain yang dicurigai selama investigasi (mis.
   warna terakhir di tempat lain yang belum tercakup a–f), tambahkan sebagai
   kandidat (h), (i), … dengan langkah reproduksi persis — JANGAN diam-diam
   memperluas ke perbaikan di luar kandidat yang terbukti gagal.

## Step 2: perbaiki HANYA yang terbukti gagal

- Perbaiki AKAR dari SATU kandidat yang terbukti gagal (bila lebih dari satu,
  laporkan semuanya + perbaiki semuanya, satu per satu dengan probe RED→GREEN
  per kandidat).
- **Bila TIDAK ADA yang gagal: TUTUP task dengan laporan bukti lengkap +
  TANPA edit produk.** Jangan mengarang fix, jangan edit spekulatif.
  Controller yang memutuskan langkah berikut bersama user.
- Backup `.bak-r3t10` per file SEBELUM edit pertama (bila ada edit).
  Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi
  baru; tanpa ubah label/i18n.

## Regresi + verifikasi

- Bila ada fix: probe T3 (`probe-r3-t3-*.cjs`) + T8 (`probe-r3-t8-*.cjs`)
  hijau (Selection Colors tak rusak), R2-T8 tetap hijau, suite hijau.
- Bila tanpa edit: R2-T8 hijau + probe baru hijau + suite hijau sudah cukup.
- 0 pageerror di semua run. Screenshot before/after BILA ada perubahan visual;
  bila tanpa edit, screenshot strip recent-colors (sebelum/sesudah reload
  untuk kandidat f) sebagai bukti visual.
- Tulis laporan `task-10-report.md` di folder sdd yang sama: per kandidat
  (a)–(g) hasil + bukti angka/langkah persis; bila ada fix: diff (file:baris)
  + probe RED→GREEN; bila tanpa fix: katakan eksplisit "tidak ada kandidat
  yang terbukti gagal" + bukti. Catat jujur apa yang belum teruji
  (mis. hanya headless Chromium, hanya tema light).

## Aturan

- Skill (baca SKILL.md dulu): `systematic-debugging` (root cause dulu),
  `test-driven-development` (probe RED dulu per kandidat yang gagal),
  `browser_ui_fix_verification` (browser asli Playwright + ukur nyata),
  `verification-before-completion` (klaim hanya dari run baru).
- Probe berjalan melawan hasil BUILD (`npm run build:web` dulu, sajikan
  `web/` via server statis di port segar milikmu — port yang sudah dipakai:
  T1 8981, T2 8983, T3 8985, T4 8988, T5 8990, T6 8992, T7 8994, T8 8996,
  T9 8998, T9-fix1 9001, verifikasi controller T9 9003 — pilih yang belum
  dipakai, mis. 9005).
- JANGAN spawn subagent/reviewer sendiri. JANGAN ubah scope.
- JANGAN timpa screenshot `r2-t8-lastcolor-*.png` (artefak R2) — bila probe
  R2-T8 menulis screenshot, arahkan ke nama file Ronde 3
  (`r3-t10-lastcolor-*.png`) atau jalankan dengan env shot yang berbeda bila
  probe mendukung; bila probe R2-T8 hardcode path shot R2, catat di laporan
  bahwa file shot R2 tertimpa oleh run regresi (seperti preseden T1/T5/T8).
