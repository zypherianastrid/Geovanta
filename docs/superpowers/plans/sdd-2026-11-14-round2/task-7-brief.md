# Task 7 brief — Ronde 2: Effects: tombol Tambah efek di bawah judul + style sama untuk 3 tombol munculan

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T7 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 277/277 PASS, 0 fail (terverifikasi sesudah T6: 275 + 2 tes T2); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Tombol "+ Tambah efek" masih terjepit di kanan atas baris judul Effects (padding `2px 6px`), dan 3 tombol yang muncul saat diklik (Drop shadow / Layer blur / Background blur) harus punya style yang sama persis.

## Yang harus dilakukan (verbatim dari plan)

1. `+ Tambah efek`: pindah dari `.fig-isec-title` ke baris sendiri DI BAWAH teks "Effects" (full-width), padding atas-bawah + kiri-kanan (mis. `6px 12px`).
2. 3 tombol popover (Drop shadow / Layer blur / Background blur): padding yang SAMA persis; `data-testid` (`fx-add-shadow/layerblur/bgblur`) + perilaku tambah efek tidak berubah; anchor `Float` ikut tombol baru.
3. Lokasi (WAJIB verifikasi ulang via grep sebelum edit): `EditorRightInspector.jsx:445-448`: `+ Tambah efek` (`ved-pill`, padding `2px 6px`) DI DALAM `.fig-isec-title` (kanan atas); 3 tombol popover `fx-add-shadow/layerblur/bgblur` (`ved-pill w-full`, `space-y-1`) di `Float`. Anchor `Float` (`fxAddBtnRef`) ikut pindah ke tombol baru.
4. JANGAN sentuh baris T3 ronde 2 (Selection Colors `:508`), T6 (Color Styles `:360`), dan seksi lain; JANGAN ubah logika tambah efek (drop shadow / layer blur / background blur — termasuk resep render background blur dari ronde Color Styles). Pola T3/T6 ronde 2 (pindah tombol keluar dari `.fig-isec-title` ke baris sendiri, padding `6px 10px`, `flex: 1`) boleh dipakai ulang — tapi perhatikan: brief T7 meminta padding `6px 12px` untuk tombol Tambah efek; 3 tombol popover harus SAMA PERSIS dengan tombol Tambah efek (bukan dengan T3/T6).

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t7-effects-button.cjs` yang mengukur: tombol tambah efek di bawah judul (posisi Y > judul, lebar = lebar seksi), klik → popover muncul → ketiga tombol berpadding sama (terukur) → tambah tiap efek tetap jalan (drop shadow, layer blur, background blur — masing-masing menambah efek + tampil di daftar efek). Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t7-effects-before.png` — termasuk popover terbuka). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t7-effects-after.png` (termasuk popover terbuka).
- Regresi: `npm test` penuh (277 + tes baru, 0 fail) + probe T6 (11/11) sebagai regresi seksi tetangga bila cepat.

## Harness probe
- Sajikan `web/` via server statis (mis. `cd web && python3 -m http.server 8931` — port bebas, catat di laporan; port 8931 sudah dipakai server sisa T2 yang menyajikan `web/` working copy ini — boleh dipakai ulang ATAU port lain). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1–T6 adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya.
- Probe harus deterministik + 0 pageerror. Seksi Effects tampil saat objek dipilih (lihat screenshot user: Effects ada di inspector saat lingkaran dipilih) — buat + pilih objek seperti probe T3.

## Aturan kerja
- **Backup `.bak-t7` per file SEBELUM edit pertama.** `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas, termasuk popover terbuka).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-7-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), padding yang dipilih + alasan, daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
