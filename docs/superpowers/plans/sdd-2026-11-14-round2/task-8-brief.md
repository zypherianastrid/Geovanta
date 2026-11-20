# Task 8 brief — Ronde 2: Investigasi + perbaiki bug "warna terakhir tidak berfungsi"

**Sumber kebenaran tunggal task ini adalah brief ini.** Plan induk: `docs/superpowers/plans/2026-11-14-round2-ui-fixes.md` (baca T8 di sana bila perlu konteks, tapi nilai/aturan di brief ini yang berlaku).
**Working copy (satu-satunya tempat kerja):** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. "Commit" = backup `.bak` + laporan. JANGAN ubah file di luar working copy ini. JANGAN sertakan `node_modules` ke ZIP apa pun.
**Baseline:** `npm test` 277/277 PASS, 0 fail (terverifikasi sesudah T7: 275 + 2 tes T2); `npm run build:web` = `node scripts/build-offline-bundle.js` (exit 0). Bila baseline berubah karena kerjamu, sebutkan di laporan.

## Konteks (satu baris)
User melaporkan "warna terakhir tidak berfungsi" — belum terpetakan kandidat mana yang gagal; task ini WAJIB membuktikan dulu lewat reproduksi sebelum memperbaiki apa pun.

## Yang harus dilakukan (verbatim dari plan)

### Step 1 — Investigasi dulu (WAJIB sebelum edit; skill systematic-debugging Fase 1)
Tulis probe Playwright baru `probes/probe-r2-t8-last-color.cjs` yang mengklik SEMUA kandidat dan mencatat mana yang gagal:
- (a) tiap swatch recent-colors — pertama/tengah/terakhir, setelah seed 3+ warna (`EditorRightInspector.jsx:367`, `recents.map`, `applyRecentColor`, `rememberRecentColor` `VectorEditor.jsx:133` — 10 warna terakhir).
- (b) baris TERAKHIR Selection colors — ColorField + tombol ◎ (`EditorRightInspector.jsx:514-518`, `replaceSelectionColor` `VectorEditor.jsx:8169`).
- (c) warna terakhir tiap keluarga Recolor Mode 2 — target + override (`RecolorSection.jsx:310+`).
- (d) warna drop-shadow efek.
- Kriteria gagal: klik tidak mengubah fill/seleksi/target + tanpa toast/error yang menjelaskan.
- Screenshot before ke `probes/shots/r2-t8-lastcolor-before.png` (dan screenshot tiap kandidat yang diuji bila perlu).

### Step 2 — Perbaiki AKAR masalah dari SATU kandidat yang terbukti gagal
- Bila lebih dari satu kandidat gagal, laporkan semuanya (perbaiki yang terbukti, sebutkan sisanya).
- **Bila TIDAK ADA yang gagal, TUTUP task dengan laporan bukti lengkap + TANPA edit spekulatif** — controller yang memutuskan langkah berikut bersama user. Status laporan dalam hal ini: DONE_WITH_CONCERNS (bukan DONE), dengan bukti lengkap.
- Bila ada yang gagal: ikuti TDD (probe RED dulu — probe Step 1 SUDAH menjadi RED-nya — baru GREEN sesudah fix), screenshot after `probes/shots/r2-t8-lastcolor-after.png`.
- Regresi: suite + probe color-styles/recolor/find-replace hijau. Catatan: probe-probe ronde lalu (`probe-recolor` dkk.) TIDAK ada di working copy ini — regresi yang tersedia: `npm test` penuh + probe baru T3 (Selection Colors, 11/11), T4 (Recolor layout, 10/10), T6 (Color Styles, 11/11), T7 (Effects, 9/9). Jalankan yang relevan dengan kandidat yang diperbaiki; JANGAN klaim menjalankan probe yang tidak ada.

### Lokasi kandidat (WAJIB verifikasi ulang via grep sebelum edit)
- (a) strip recent-colors `EditorRightInspector.jsx:367` (`recents.map`, `applyRecentColor`, `rememberRecentColor` `VectorEditor.jsx:133` — 10 warna terakhir).
- (b) baris TERAKHIR Selection colors (`:514-518`, `replaceSelectionColor` `VectorEditor.jsx:8169`).
- (c) Recolor Mode 2 keluarga/warna terakhir (`RecolorSection.jsx:310+`).
- (d) warna drop-shadow efek.
- Perhatian: T4 ronde 2 baru saja me-restlye `RecolorSection.jsx` (cls vert + range + `py-1` Fill/Stroke) — JANGAN rusak hasil T4; bila akar ada di `RecolorSection.jsx`, diff harus minimal dan tidak mengembalikan restyle T4. T7 juga menyentuh Effects — bila akar ada di warna drop-shadow, JANGAN rusak hasil T7.

## Aturan kerja
- **Backup `.bak-t8` per file SEBELUM edit pertama** (bila ada edit; bila tidak ada yang gagal, tidak ada backup — catat itu di laporan). `.bak` TIDAK ikut ZIP final.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent (kamu implementer; review datang dari controller sesudah laporan).
- JANGAN membuat edit spekulatif. JANGAN "memperbaiki" kandidat yang tidak terbukti gagal.

## Harness probe
- Sajikan `web/` via server statis (mis. `cd web && python3 -m http.server 8931` — port bebas, catat di laporan; port 8931 sudah dipakai server sisa T2 yang menyajikan `web/` working copy ini — boleh dipakai ulang ATAU port lain). Rebuild dulu bila perlu: `npm run build:web`.
- Playwright: `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/` (tanpa `npm i` bila memungkinkan; JANGAN commit `node_modules`), browser cache `~/.cache/ms-playwright` (chromium-1255). Probe T1–T7 adalah contoh pola yang bekerja (seed localStorage prefs, condition-based waits, tanpa sleep buta) — baca dan ikuti polanya.
- Probe harus deterministik + 0 pageerror.

## Laporan
Tulis laporan lengkap di `docs/superpowers/plans/sdd-2026-11-14-round2/task-8-report.md`, lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), hasil tiap kandidat (a)–(d) dengan bukti angka (lolos/gagal + apa yang terukur), kandidat yang terbukti gagal (atau "TIDAK ADA"), daftar file yang diubah + baris diff (atau "TANPA EDIT"), angka probe (RED/GREEN), angka `npm test`, path screenshot, dan concerns. Isi laporan: tabel reproduksi per kandidat, hipotesis + bukti, langkah RED→GREEN (bila ada fix), diff ringkas, angka persis (hitung ulang dari addend), regresi, hal yang belum terverifikasi.
