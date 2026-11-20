# Task 6 brief — Ronde 2: Color Styles: padding lega + 3 tombol di bawah judul, flex-wrap saja

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T6 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 277/277 PASS, 0 fail (terverifikasi sesudah T5: 275 + 2 tes T2); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Seksi Color Styles sempit (padding standar `.fig-isec`) dan 3 tombolnya (Buat style / Find & Replace / Recolor) terjepit sebaris dengan judul — user minta padding lega + tombol di baris sendiri di bawah judul, dengan flex-wrap SAJA (tanpa text-wrap pada label).

## Yang harus dilakukan (verbatim dari plan)

1. Seksi `color-styles-section`: padding atas-bawah + kiri-kanan LEBIH lega dari `.fig-isec` standar (khusus seksi ini saja — class/inline baru; JANGAN ubah `.fig-isec` global).
2. 3 tombol (Buat style / F&R / Recolor) pindah ke baris sendiri DI BAWAH teks judul, container `flex-wrap` + `gap`; label tombol `whiteSpace: nowrap` (TIDAK ada text-wrap pada label — bungkus terjadi di level flex, bukan teks).
3. Ikon T4 ronde lalu dipertahankan (`plus`/`refresh`/`palette` 11px); `data-testid` tidak berubah.
4. Lokasi (WAJIB verifikasi ulang via grep sebelum edit): `EditorRightInspector.jsx:360`: judul + 3 tombol (Buat style/F&R/Recolor) SEBARIS di `.fig-isec-title` (`flexWrap: 'nowrap'`, `whiteSpace: 'nowrap'`, `ved-pill--compact`); `.fig-isec` global `padding: 14px 12px` — JANGAN ubah global, beri padding khusus seksi ini saja.
5. JANGAN sentuh baris T3 ronde 2 (Selection Colors `:508` — F&R/Recolor + Select Same) dan T7 (Effects `:445-448`); JANGAN ubah `.fig-isec` global. Pola yang sama dengan T3 ronde 2 (pindah tombol keluar dari `.fig-isec-title` ke baris sendiri) boleh dipakai ulang — konsisten dengan T3.

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t6-color-styles.cjs` yang mengukur: tidak ada overflow/clip, 3 tombol tidak terpotong, judul 1 baris, tombol di baris sendiri di bawah judul (posisi Y tombol > Y judul), padding seksi LEBIH lega dari standar (ukur computed padding vs `.fig-isec` lain), label tombol `whiteSpace: nowrap` + membungkus di level flex bila perlu. Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t6-colorstyles-before.png`). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t6-colorstyles-after.png`.
- Regresi: `npm test` penuh (277 + tes baru, 0 fail) + probe T3 (11/11) sebagai regresi seksi tetangga bila cepat.

## Harness probe
- Sajikan `web/` via server statis (mis. `cd web && python3 -m http.server 8931` — port bebas, catat di laporan; port 8931 sudah dipakai server sisa T2 yang menyajikan `web/` working copy ini — boleh dipakai ulang ATAU port lain). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1–T5 adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya.
- Probe harus deterministik + 0 pageerror. Seksi Color Styles tampil saat tidak ada seleksi pun (lihat screenshot T1: Color Styles terlihat di inspector kanan saat 0 objek) — tidak perlu membuat objek.

## Aturan kerja
- **Backup `.bak-t6` per file SEBELUM edit pertama.** `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-6-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), padding yang dipilih + alasan, daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
