# Task 10 brief — Ronde 2: Verifikasi akhir + ZIP final

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T10 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline suite:** `npm test` 277/277 PASS, 0 fail (275 + 2 tes T2). Total aturan bundle: **841**.

## Konteks (satu baris)
T1–T9 selesai + lolos review (T8 tanpa edit produk); tugas ini memverifikasi SELURUHNYA dari nol dan membangun ZIP final untuk diserahkan ke user.

## Yang harus dilakukan (verbatim dari plan T10)

1. `npm test` (277 + tes baru, 0 fail) + `npm run build:web` (exit 0, 0 warning) + seluruh probe baru T1–T9 hijau + regresi hijau, 0 pageerror.
2. Smoke 6/6 dari hasil EKSTRAK ZIP (bukan dari working copy).
3. Rebuild ZIP dengan aturan inklusi yang sama seperti ZIP masukan; catat SHA256 + jumlah entri + ukuran; screenshot after tiap task dilampirkan (sudah ada di `probes/shots/` — verifikasi keberadaannya, jangan buat ulang bila sudah ada).

## Rincian verifikasi (WAJIB — hitung ulang semua total dari addend-nya)

### A. Suite + build
- `npm test` penuh (segar) — laporkan pass/fail/total persis.
- `npm run build:web` (`node scripts/build-offline-bundle.js`) — exit 0, catat warning (harus 0).

### B. Seluruh probe baru T1–T9 hijau (jalankan SEMUA, dari working copy, server statis port baru — server 8931/8961 sudah mati; nyalakan sendiri, catat port, matikan sesudah selesai)
| Probe | Ekspektasi |
|---|---|
| `probes/probe-r2-t1-rail.cjs` | 7/7 |
| `probes/probe-r2-t2-radius-drag.cjs` | 12/12 |
| `probes/probe-r2-t3-selsame-buttons.cjs` | 11/11 |
| `probes/probe-r2-t4-recolor-layout.cjs` | 10/10 |
| `probes/probe-r2-t5-pingrid-square.cjs` | 6/6 |
| `probes/probe-r2-t6-color-styles.cjs` | 11/11 |
| `probes/probe-r2-t7-effects-button.cjs` | 9/9 |
| `probes/probe-r2-t8-last-color.cjs` | 22/22 |
| `probes/probe-r2-t9-snap-icon.cjs` | 6/6 |
- Total probe = 7+12+11+10+6+11+9+22+6 = **94** asersi — hitung ulang dari addend dan laporkan per-probe + total. 0 pageerror di semua run.
- Bila satu probe gagal: JANGAN menutupi — investigasi (systematic-debugging), perbaiki bila itu regresi dari T1–T9 (backup `.bak-t10` bila ada edit), dan laporkan dengan jujur. Bila gagal karena lingkungan (bukan produk), buktikan + catat.

### C. ZIP final (aturan inklusi = ZIP masukan)
- ZIP masukan: `~/workspace/your_files/Geovanta-ColorStyles-Recolor-Effects.zip` — SHA `4d04f5ac471846ee423a2db4b5a69cd56e238587a4f6ce414933db046acbb2aa`, 277 entri, 11.667.984 B.
- Turunkan aturan inklusi dengan membandingkan daftar entri ZIP masukan (`unzip -l`) vs `find` working copy. Fakta yang sudah diketahui controller (VERIFIKASI ULANG sendiri): ZIP masukan TIDAK berisi `probes/`, `*.bak-*`, `node_modules/`, atau folder `sdd-...`; TAPI berisi `dist/`, `web/`, `docs/superpowers/plans/` (termasuk ledger + plan ronde 2), `src/`, `tests/`, `src-tauri/` (termasuk `src-tauri/target/` — hanya `.rustc_info.json` + `CACHEDIR.TAG` + entri dir `debug/`).
- Build ZIP baru ke `~/workspace/your_files/Geovanta-Round2-UI-Fixes.zip` (nama final ini; JANGAN timpa ZIP masukan — ZIP masukan adalah arsip baseline dan sudah diserahkan ke user).
- Bandingkan daftar entri ZIP baru vs ZIP masukan: delta HANYA file yang diubah/ditambah oleh T1–T9 (+ file dokumentasi ronde 2 yang memang bagian dari `docs/superpowers/plans/`). `.bak` TIDAK ikut. `probes/` TIDAK ikut. `node_modules/` TIDAK ikut. Sebutkan delta entri satu per satu di laporan.
- Catat SHA256 + jumlah entri + ukuran byte persis ZIP baru.

### D. Smoke 6/6 dari hasil EKSTRAK ZIP
- Ekstrak ZIP baru ke direktori sementara DI LUAR working copy (mis. `/tmp/r2-zip-smoke/`), sajikan `web/`-nya via server statis, jalankan smoke 6/6 (buat proyek → buat objek → pilih → verifikasi app terbuka tanpa pageerror + 6 cek smoke yang sama seperti ronde lalu bila diketahui dari laporan T9 ronde lalu; bila tidak diketahui, definisikan 6 cek smoke eksplisit di laporan: app load, buat proyek, buat lingkaran, seleksi tampil, inspector tampil, 0 pageerror — dan jalankan semuanya dari hasil ekstrak).
- Smoke WAJIB dari hasil ekstrak, bukan working copy.

### E. Screenshot after tiap task
- Verifikasi keberadaan (bukan buat ulang): `probes/shots/r2-t1-rail-after.png`, `r2-t2-radius-after.png`, `r2-t3-selsame-after.png`, `r2-t4-recolor-after.png`, `r2-t5-pingrid-after.png` + `r2-t5-pingrid-align-after.png`, `r2-t6-colorstyles-after.png`, `r2-t7-effects-after.png`, `r2-t8-lastcolor-after.png`, `r2-t9-snap-after.png`. Laporkan yang ada/tidak ada; bila ada yang hilang, buat ulang dengan probe terkait dan catat.

## Aturan kerja
- **Backup `.bak-t10` per file SEBELUM edit pertama** (bila ada edit; bila tidak ada edit, tanpa backup — catat itu). `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- JANGAN timpa ZIP masukan. JANGAN sertakan `node_modules` ke ZIP.

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-10-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), angka suite, angka build, tabel probe per-task + total (hitung ulang), hasil smoke 6/6 (dari ekstrak ZIP), path + SHA256 + jumlah entri + ukuran ZIP final, daftar delta entri ZIP, daftar screenshot after (ada/tidak), dan concerns. Isi laporan: semua angka persis, delta entri satu per satu, hal yang belum terverifikasi.
