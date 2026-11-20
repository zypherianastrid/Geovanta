# Task 9 brief — Ronde 2: Ikon snap floating bar jadi magnet yang relevan

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T9 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 277/277 PASS, 0 fail (terverifikasi sesudah T8: 275 + 2 tes T2); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Tombol snap di floating bar bawah-tengah memakai ikon busur magnet samar yang terbaca seperti headphone/arc — user minta ikon yang relevan dengan teks "snap" (standar industri = magnet).

## Yang harus dilakukan (verbatim dari plan)

1. Ganti path `d` tombol snap (`EditorFloatingToolbar.jsx:195`) dengan ikon magnet yang jelas (U-magnet + ujung kutub); bila memakai path baru, dokumentasikan sumbernya (set ikon internal / digambar mengikuti gaya stroke 1.8 yang sama).
2. `data-tip="veSnap"`, toggle `snapOn`, chevron menu, dan menu snap tidak berubah.
3. Lokasi (WAJIB verifikasi ulang via grep sebelum edit): `EditorFloatingToolbar.jsx:195`: `IconBtn ... d="M6 4v6a6 6 0 0 0 12 0V4 M6 7.5h3.5 M14.5 7.5H18"` (busur magnet samar). Cek dulu set ikon yang ada (`src/components/ui/IconGlyphs.jsx`, `brandAndIcons.jsx`); bila tidak ada magnet yang jelas, tambah satu path baru dan minta reviewer sahkan keterbacaannya di 22px. Scope HANYA tombol snap bar bawah; ikon baris menu snap (`SnapIcon`, `:16-28`) tidak disentuh kecuali memakai path yang sama persis.
4. JANGAN ubah perilaku snap apa pun (toggle, menu, preset, solver) — hanya path `d` ikon tombol floating bar.

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t9-snap-icon.cjs` yang mengukur: path `d` tombol snap floating bar BUKAN path lama (asersi identitas path baru), toggle on/off tetap jalan (klik tombol → `snapOn` berubah + menu snap tetap bisa dibuka via chevron), 0 pageerror. Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t9-snap-before.png` — close-up floating bar). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t9-snap-after.png` (close-up floating bar — controller AKAN MELIHAT langsung apakah ikon terbaca sebagai magnet pada 22px).
- Regresi: `npm test` penuh (277 + tes baru, 0 fail).

## Harness probe
- Sajikan `web/` via server statis di PORT BARU (mis. `cd web && python3 -m http.server 8961` — CATAT port di laporan; server 8931 sisa T2 sudah MATI, jangan mengandalkan 8931). Rebuild dulu bila perlu: `npm run build:web`. Matikan servermu sesudah selesai bila kamu yang menyalakannya, atau catat bila dibiarkan.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1–T8 adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya.
- Probe harus deterministik + 0 pageerror. Screenshot close-up: crop clip ke area floating bar bawah-tengah agar ikon 22px terbaca (bukan full-page saja).

## Aturan kerja
- **Backup `.bak-t9` per file SEBELUM edit pertama.** `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas, close-up floating bar).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-9-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), sumber path magnet + dokumentasi gaya stroke, daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
