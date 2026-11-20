# Task 4 brief — Ronde 2: Recolor: hue-range center + mode vertikal + padding Fill/Stroke

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T4 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 277/277 PASS, 0 fail (terverifikasi sesudah T3: 275 + 2 tes T2); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Di seksi Recolor: field rentang hue sumber teksnya rata kiri dan tidak mengisi lebar baris; Mode 1/Mode 2 horizontal; baris nilai warna Fill solid + Stroke tanpa padding atas-bawah.

## Yang harus dilakukan (verbatim dari plan)

1. `rc-range-min/max`: masing-masing `flex: 1` (isi lebar baris), teks rata tengah, padding atas-bawah ditambah (tinggi ~30px, sejajar field lain); separator `–` tetap.
2. `rc-mode-seg`: Mode 1 + Mode 2 bertumpuk VERTIKAL dengan gap (mis. `gap: 6px`), masing-masing full-width + padding atas-bawah; perilaku (preview live, commit, `data-testid="rc-mode-seg"`) tidak berubah. Mekanisme (varian vertikal `Seg` vs dua tombol toggle) diputuskan implementer + disahkan reviewer.
3. Baris nilai warna Fill solid + Stroke (`ColorField` + `ColorText`): tambah padding atas-bawah (mis. `py-1`) — JANGAN ubah logika commit/livePaint/unlink.
4. Lokasi (WAJIB verifikasi ulang via grep sebelum edit): `RecolorSection.jsx:303-308` (`rc-range-min/max`): `.fld px-1.5 py-0.5`, `width: 68, height: 22`, teks rata kiri (default). `RecolorSection.jsx:292` (`rc-mode-seg`, `Seg` horizontal + indikator geser `.seg-p` absolute — varian vertikal TIDAK ADA). Fill `EditorRightInspector.jsx:388-397` dan Stroke `:408-418` (baris `flex items-center gap-2` `ColorField` + `ColorText`, tanpa padding vertikal).
5. JANGAN ubah logika Recolor apa pun (preview/commit/unlink/shift-hue/palette-map). JANGAN ubah mekanisme snapshot/preview F&R/Recolor dari fix wave ronde lalu (base = doc ter-commit). T8 ronde 2 (investigasi bug warna terakhir) juga menyentuh `RecolorSection.jsx` — T4 hanya restyle layout, bukan logika.

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t4-recolor-layout.cjs` yang mengukur: `rc-hue` drag masih jalan, mode 1/2 toggle + preview benar, range min/max ketik + center terukur (`text-align: center` + posisi teks di tengah field), Mode 1/2 bertumpuk vertikal (posisi Y Mode 2 > Mode 1, full-width, gap terukur), Fill/Stroke berpadding atas-bawah. Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t4-recolor-before.png`). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t4-recolor-after.png`.
- Regresi: `npm test` penuh (277 + tes baru, 0 fail). Catatan: `probe-recolor` ronde lalu TIDAK ada di working copy ini (`probes/` dibuat ulang di ronde 2) — JANGAN klaim menjalankannya; regresi perilaku Recolor dicakup probe baru T4 (toggle + preview + drag hue) + suite. Bila sempat, jalankan juga probe T3 (11/11) sebagai regresi seksi tetangga.

## Harness probe
- Sajikan `web/` via server statis (mis. `cd web && python3 -m http.server 8931` — port bebas, catat di laporan; T1–T3 memakai 8931/8932/8943). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1–T3 (`probes/probe-r2-t1-rail.cjs`, `probe-r2-t2-radius-drag.cjs`, `probe-r2-t3-selsame-buttons.cjs`) adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya. Untuk membuka seksi Recolor: pilih objek berwarna lalu klik tombol Recolor (pola klik tombol inspector ada di probe T3 B11).
- Probe harus deterministik + 0 pageerror.

## Aturan kerja
- **Backup `.bak-t4` per file SEBELUM edit pertama.** `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-4-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), mekanisme vertikal yang dipilih + alasan, daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
