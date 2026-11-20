# Task 1 brief — Ronde 2: Rail kiri: active = accent persis + hapus radius & shadow 3 grup

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T1 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 275/275 PASS, 0 fail; `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Geovanta vector editor (React + Tailwind offline bundle); rail kiri workspace punya 3 grup tombol (`dk-b` + `fig-rail-grp`); tombol aktif saat ini memakai warna gelap hasil color-mix, bukan accent persis; 3 grup masih punya border-radius + box-shadow.

## Yang harus dilakukan (verbatim dari plan)

1. Ubah `.dk-b.on` dari `var(--acc-deep)` menjadi `var(--acc)` (tepat, tanpa color-mix).
   `.tool-btn.on`, `.cp-act-btn.on`, `.ws-nav-item.on .ws-nav-ico` JANGAN disentuh.
2. `.fig-rail-grp`: `border-radius: 0`, `box-shadow: none` (hapus override `!important` 14px/shadow; bila aturan dasar 12px tersisa, netralkan juga di aturan yang sama — tanpa menambah `!important` baru; bila harus menyentuh aturan `!important` M3 yang sudah ada, sebutkan eksplisit di laporan).
3. Lokasi (WAJIB verifikasi ulang via grep sebelum edit): `src/vendor/tailwindOfflineBundle.jsx`: `--acc-deep: color-mix(in srgb, var(--acc) 45%, black)`; `.dk-b.on { background: var(--acc-deep) }`. Rail kiri = `VectorEditor.jsx:8307` (`dk-b` + `fig-rail-grp`, 3 grup). Accent diterapkan `src/utils/themeAndPrefsManager.jsx:14` (`--acc`).

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t1-rail.cjs` yang mengukur computed `background-color` `.dk-b.on` vs nilai `--acc` (set accent `#0d99ff` lewat Settings/prefs) + `border-radius`/`box-shadow` `.fig-rail-grp`. Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t1-rail-before.png`). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t1-rail-after.png`.
- Regresi: `npm test` penuh + probe snap/floating-bar bila sudah ada (tombol rail lain tetap berfungsi).

## Harness probe (dibuat ulang di ronde ini — `probes/` TIDAK ada di ZIP)
- Sajikan `web/` via server statis, mis. `cd web && python3 -m http.server 8931` (port bebas, catat di laporan). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: browser ter-cache di `~/.cache/ms-playwright` (chromium-1254/1255); paket `playwright-core` tersedia di `/home/hatch/workspace/vector-editor/node_modules/` — boleh `npm i -D playwright-core` di working copy (JANGAN commit `node_modules`), atau `require` langsung dari path itu. Pakai `executablePath` Chromium dari cache bila perlu.
- Probe harus: buka app, buat/buka proyek sampai rail kiri terlihat, set accent `#0d99ff`, ukur computed style, 0 pageerror. Tulis probe yang deterministik (tunggu elemen, bukan sleep buta).

## Aturan kerja
- **Backup `.bak-t1` per file SEBELUM edit pertama** (mis. `cp <file> <file>.bak-t1`). `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-1-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: hipotesis/temuan verifikasi grep, langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
