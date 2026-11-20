# Task 3 brief — Ronde 2: 5 tombol Selection Colors: ikon + padding + flex-wrap

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T3 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 277/277 PASS, 0 fail (terverifikasi sesudah T2: 275 + 2 tes T2); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Di seksi Selection Colors (inspector kanan), 5 tombol (Find & Replace, Recolor, Select Same Fill/Stroke/Type) masih kecil (padding `2px 6px`), F&R + Recolor terjepit di dalam baris judul, dan 3 tombol Select Same tanpa ikon.

## Yang harus dilakukan (verbatim dari plan)

1. Pindahkan F&R + Recolor KELUAR dari `.fig-isec-title` ke baris sendiri di bawah judul (`flex-wrap`, `gap`), masing-masing `flex: 1`, ikon tetap `refresh`/`palette` 11px, padding vertikal ditambah (mis. `6px 10px` — ukur agar sejajar sistem `ved-pill` lain; label/`data-testid`/`data-tip`/`onClick` tidak berubah).
2. 3 tombol Select Same: tambah ikon dari set yang ada (isi = fill, stroke, type — pilih yang paling terbaca, TIDAK ada path baru kecuali reviewer setuju), padding yang sama, tetap `flex-wrap` (boleh membungkus ke 2 baris; JANGAN perkecil label di bawah 10px, JANGAN klip — preseden T3 ronde lalu).
3. Lokasi (WAJIB verifikasi ulang via grep sebelum edit): `EditorRightInspector.jsx:512-518`: F&R + Recolor ada DI DALAM `.fig-isec-title` (`flex:1`, padding inline `2px 6px`, ikon `refresh`/`palette` 11px — warisan T4/T6 ronde lalu); 3 Select Same di baris bawah (`flex flex-wrap gap-1.5`, padding `2px 6px`, TANPA ikon).
4. Ikon mengikat dari ronde lalu: F&R = `refresh`, Recolor = `palette`, Buat style = `plus`, semua size 11px. Ruling T6 ronde lalu (`justifyContent: 'center'` dipertahankan pada tombol F&R/Recolor) tetap berlaku — jangan hapus tanpa alasan.
5. JANGAN sentuh baris/seksi lain: T6 ronde 2 (Color Styles `:360`) dan T7 (Effects `:445-448`) adalah task terpisah; JANGAN ubah `.fig-isec` global.

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t3-selsame-buttons.cjs` yang mengukur: lebar baris tombol = lebar seksi (±1px), tidak ada overflow/clip, ikon ADA pada kelima tombol (asersi path `d` — pelajaran T6 ronde lalu: hitung path saja tidak cukup, identitas ikon harus diasersi), 2 baris warna + ◎ tidak berubah. Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t3-selsame-before.png`). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t3-selsame-after.png`.
- Regresi: `npm test` penuh (277 + tes baru, 0 fail) + probe T1 rail hijau (bila cepat) — tombol rail lain tetap berfungsi.

## Harness probe
- Sajikan `web/` via server statis (mis. `cd web && python3 -m http.server 8931` — port bebas, catat di laporan; T1/T2 memakai 8931/8932). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1/T2 (`probes/probe-r2-t1-rail.cjs`, `probes/probe-r2-t2-radius-drag.cjs`) adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya.
- Probe harus deterministik + 0 pageerror. Untuk melihat seksi Selection Colors, buat objek (mis. lingkaran biru #0D99FF seperti screenshot user) lalu pilih — ikuti pola pembuatan shape di probe T2.

## Aturan kerja
- **Backup `.bak-t3` per file SEBELUM edit pertama.** `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-3-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), ikon yang dipilih untuk ketiga tombol Select Same + alasan, daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
