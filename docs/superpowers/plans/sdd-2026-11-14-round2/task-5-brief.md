# Task 5 brief — Ronde 2: PinGrid persegi di kedua pemakaian

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T5 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 277/277 PASS, 0 fail (terverifikasi sesudah T4: 275 + 2 tes T2); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Grid titik poros 9 titik tidak persegi: lebar ≠ tinggi, di kedua pemakaian (Transform dengan `.pin3-fill` dan Alignment Auto layout tanpa `.pin3-fill`).

## Yang harus dilakukan (verbatim dari plan)

1. `.pin3`: jadikan persegi (lebar = tinggi, mis. via `aspect-ratio: 1` + sesuaikan padding/gap/button agar terukur 62×62 ATAU ukuran persegi lain yang konsisten).
2. `.pin3-fill` (Transform): tetap merentang mengisi ruang bawah kolom kanan, TAPI lebar mengikuti tinggi (`aspect-ratio: 1`) sehingga tetap persegi.
3. Alignment Auto layout (tanpa `pin3-fill`): persegi juga; jangan ubah layout `fig-flow-bar`/tombol lain.
4. Lokasi (WAJIB verifikasi ulang via grep sebelum edit): `src/components/ui/PinGridSelector.jsx` (murni grid 3×3); bundle `.pin3 { width: 62px; padding: 5px; gap: 3px; button height: 14px }` → 62×58 (tidak persegi); `.pin3-fill { align-self: stretch; grid-template-rows: repeat(3,1fr) }` (Transform, `EditorRightInspector.jsx:260`) merentang ke tinggi kolom kanan; Alignment Auto layout (`:528`) tanpa `pin3-fill`.
5. Ruling T5 ronde lalu (MENGIKAT): total aturan bundle kini **841** (837 sesudah T1 + 4 aturan T4 ronde 2) — tripwire yang menghitung aturan WAJIB di-update dengan justifikasi bila aturan ditambah (lihat `tests/accent-tokens.test.cjs`, yang T4 baru saja update 837→841 dengan komentar riwayat). Bila aturan ditambah, append di AKHIR array agar indeks [464]/[465] tidak bergeser (preseden T5 ronde lalu + T4).
6. Preseden T5 ronde lalu (MENGIKAT): bottom-alignment Transform harus terjaga — ujung bawah grid sejajar ujung bawah tombol "Skala stroke" (±1px). Jangan rusak itu.

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t5-pingrid-square.cjs` yang mengukur `width === height (±1px)` di KEDUA pemakaian + bottom-alignment Transform vs kolom kanan tetap terjaga (ujung bawah grid sejajar ujung bawah tombol "Skala stroke"). Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t5-pingrid-before.png` — kedua pemakaian). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t5-pingrid-after.png` (kedua pemakaian).
- Regresi: `npm test` penuh (277 + tes baru, 0 fail).

## Harness probe
- Sajikan `web/` via server statis (mis. `cd web && python3 -m http.server 8931` — port bebas, catat di laporan; port 8931 sudah dipakai server sisa T2 yang menyajikan `web/` working copy ini — boleh dipakai ulang ATAU port lain; T4 memakai 8944/8951). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1–T4 adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya.
- Probe harus deterministik + 0 pageerror. Kedua pemakaian: (a) Transform — pilih objek apa pun (grid titik poros di seksi Position & Transform); (b) Alignment Auto layout — buat Frame auto layout (pola pembuatan frame ada di probe ronde lalu; bila sulit, cari cara termudah memunculkan seksi Auto layout — mis. pilih frame — dan dokumentasikan di laporan).

## Aturan kerja
- **Backup `.bak-t5` per file SEBELUM edit pertama.** `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas, kedua pemakaian).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-5-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), ukuran persegi yang dipilih + justifikasi tripwire (841→N), daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
