# Task 2 brief — Ronde 2: Corner radius drag mouse (systematic-debugging Fase 1 dulu)

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T2 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 275/275 PASS, 0 fail (terverifikasi sesudah T1); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
Field corner radius (`◜`) di inspector: ketik nilai BEKERJA normal, tapi drag mouse (scrub label + tombol step dua panah) TIDAK menambah radius dan memunculkan toast "Sudut tidak cukup panjang untuk radius tersebut" — padahal nilai yang sama bisa diketik.

## Yang harus dilakukan (verbatim dari plan)

### Step 1 — Reproduksi di browser asli (WAJIB sebelum edit apa pun; skill systematic-debugging Fase 1)
- (a) lingkaran 8 node seperti screenshot user (radius kecil), (b) rect kecil, (c) bintang 5 (regresi T1 ronde lalu — radius bintang harus bisa).
- Untuk tiap kasus: drag label `◜` (scrub) ke kanan/kiri + klik tombol step atas/bawah; catat nilai field, geometri, toast. Bandingkan dengan ketik nilai yang sama.
- Tulis HIPOTESIS TUNGGAL + bukti angka. Hipotesis awal plan (JANGAN dipercaya tanpa angka): scrub memanggil `setRadius` per-pointermove; begitu radius melewati maksimum SATU sudut, `commitObjs` mengembalikan false → toast + nilai mental; ATAU engine masih menolak di jalur itu. Buktikan lewat reproduksi kenapa drag gagal sementara ketik berhasil.

### Step 2 — Perbaiki di AKAR
- Kemungkinan arah (bukan perintah): scrub/drag harus menjepit per-sudut seperti jalur ketik, bukan ditolak mentah-mentah; toast penolakan hanya bila TIDAK ADA sudut yang bisa dijepit. `commitObjs` tetap mengembalikan true bila clamp diterapkan.
- Jangan rusak: ketik nilai, bintang (T1 ronde lalu), `autoRefineGeometry.jsx` (pemakai `setSelectedNodesRadius` lain), unit `tests/corner-clamp.test.cjs` (tambah kasus drag-path bila perlu).

### Lokasi (WAJIB verifikasi ulang via grep sebelum edit)
- Field: `EditorRightInspector.jsx:263` `XfField label="◜" on={setRadius}`.
- Scrub mouse: `src/components/ui/TransformField.jsx:57-146` (`startScrub` di `xf-l`, tombol step `xf-step` = "dua panah").
- `setRadius`/`applyRadiusToCorners`: `VectorEditor.jsx:8073-8110` (toast `:8107` bila `!ch && rad > 0`).
- Engine: `src/engine/cornerFilletEngine.jsx:278` `setSelectedNodesRadius`.
- Catatan: T1 ronde lalu memperbaiki bintang + clamp; drag vs ketik DIDUGA melewati jalur yang sama (`setRadius`).

## TDD (wajib, skill test-driven-development)
- **Probe RED dulu:** tulis probe Playwright baru `probes/probe-r2-t2-radius-drag.cjs` yang mereproduksi kegagalan drag (rect kecil + radius besar via drag: asersi sudut membulat pada maksimum, tanpa toast penolakan; plus kasus lingkaran 8 node + bintang 5). Jalankan dan PASTIKAN probe GAGAL pada asersi yang dituju (screenshot before ke `probes/shots/r2-t2-radius-before.png`). Baru lalu implementasi.
- **GREEN sesudah:** jalankan ulang probe sampai hijau + screenshot after `probes/shots/r2-t2-radius-after.png` (rect kecil + radius besar via drag: sudut membulat pada maksimum, tanpa toast penolakan).
- Regresi: `npm test` penuh (275 + tes baru, 0 fail).

## Harness probe
- Sajikan `web/` via server statis (mis. `cd web && python3 -m http.server 8931` — port bebas, catat di laporan; T1 memakai 8931/8932). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1 (`probes/probe-r2-t1-rail.cjs`) adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya.
- Probe harus deterministik + 0 pageerror. Drag mouse = gerakan pointer nyata (mouse.move/down/up atau dispatch pointer events seperti scrub handler mengharapkan — baca `TransformField.jsx` dulu untuk mengetahui event yang didengarkan).

## Aturan kerja
- **Backup `.bak-t2` per file SEBELUM edit pertama.** `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- Screenshot before/after WAJIB (path di atas).

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-2-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), hipotesis tunggal + bukti angka reproduksi, daftar file yang diubah + baris diff, angka probe (RED: x/y gagal; GREEN: x/y lolos), angka `npm test`, path screenshot before/after, dan concerns. Isi laporan: langkah reproduksi per kasus (nilai field, geometri, toast), akar masalah yang terbukti, langkah RED→GREEN, diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
