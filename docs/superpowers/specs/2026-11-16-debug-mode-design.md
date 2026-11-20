# Design singkat — Debugging Mode (Pendekatan A, logger terpusat + panel)

Basis: ZIP user `Geovanta-TextBBox-TightWidth-FIX_4_eozn.zip` (SHA `a4a0b401…`, 635 entri).
Status: Pendekatan A dipilih user 2026-11-16 14:57 WIB. Deadline final user: 45 menit, selesai 15:42 WIB.

## Intent / why
Fitur advanced khusus developer bernama Debugging Mode: mencatat dan melihat
semua fitur, fungsi, dan interaksi yang dilakukan user, tampil lognya, dan
kodenya (nama fungsi + file + argumen ringkas), bisa diunduh JSON dan Markdown.

## Goals
- Default MATI; hanya merekam saat ON.
- Satu logger terpusat, panel log live (filter kategori + cari teks + pause + clear).
- Tiap entri: waktu, kategori, aksi, nama fungsi, file, detail/argumen ringkas.
- Export JSON + Markdown via unduhan file (Blob), tanpa kirim ke jaringan.
- Tidak mengubah engine / perilaku editor saat mode MATI (overhead ~nol).

## Non-goals / anti-goals
- Bukan instrumentasi semua fungsi engine (itu Pendekatan B, ditolak).
- Bukan dump source lengkap per aksi; hanya nama fungsi + file + argumen ringkas.
- Tidak mengubah `RENDER_CONFIG.debugMode` (debug geometri render) — fitur terpisah.
- Tidak merekam saat OFF; tidak mengirim log ke mana pun.

## Approaches (dipilih A)
- A — Logger terpusat + panel (dipilih): modul `debugLogger` + panel dock,
  instrumentasi hanya di choke point `VectorEditor.tsx`. Ringan, konflik kecil.
- B — Instrumentasi semua fungsi `VE.*`: log terlengkap, tapi puluhan file,
  risiko regresi + lambat. Ditolak.
- C — Console saja (`window.geovantaDebug`): tanpa panel UI, tidak memenuhi
  "tampil lognya". Ditolak.

## Design (Pendekatan A)
- Baru `src/utils/debugLogger.tsx`: singleton `DEBUG_LOG` — `log(category, action, fn, file, detail)`,
  `setEnabled`, `subscribe`, ring buffer maks 1000 entri, `toJSON()`, `toMarkdown()`,
  `window.geovantaDebug` (enable/disable/log/export) untuk pemakaian programatik.
- Baru `src/components/editor/DebugLogPanel.tsx`: panel dock kanan-bawah,
  daftar live, filter kategori, cari teks, Pause, Clear, tombol Unduh JSON + Unduh MD.
- Edit `src/components/editor/VectorEditor.tsx`: state `debugMode` + `debugOpen`,
  toggle `Ctrl+Shift+D` (bebas — terpakai: Ctrl+Shift+G/O/H/L, D belum dipakai),
  tombol Debug di rail, instrumentasi choke point: `setToolToggle`, seleksi,
  pointer down/up + drag, zoom/pan, undo/redo, edit teks, import/export,
  shortcut, error (window.onerror saat ON). Render panel saat `debugOpen`.
- Edit `src/constants/keyboardShortcuts.tsx`: tambah entri `Ctrl + Shift + D`.
- Baru `tests/debug-logger.test.cjs`: tes terarah — log hanya saat ON, cap 1000,
  filter kategori, export JSON valid + Markdown berisi tabel + blok kode fn/file.
- Skema entri: `{seq, ts, ms, category, action, fn, file, detail}`.
  Kategori: `tool|selection|pointer|canvas|edit|document|shortcut|error|perf`.
  `perf` = snapshot `PERF_TELEMETRY.getSnapshot()` saat mode dinyalakan.
- Export: `geovanta-debug-log-YYYYMMDD-HHmmss.json` dan `.md`
  (MD: header + ringkasan + tabel entri + blok kode per entri).

## Verifikasi (aturan ramping 2026-11-16, mengikat)
Hanya: (1) tes terarah kode yang diubah, (2) cek konflik, (3) cek syntax.
Tidak: full suite, build penuh, probe sweep, smoke — kecuali user minta eksplisit.

## Klasifikasi
Tingkat: Sedang. Alasan: 3–5 file, 1 fitur utuh, 1 integrasi baru (unduh file).
Rekomendasi: 45–60 menit, selesai ~15:56 WIB. Deadline final: menunggu user.

## Addendum — Tab Konsol Fungsi (Pendekatan A, 2026-11-16)
User memilih A (koreksi dari C; C dibatalkan tanpa kode diubah). Deadline final: 45 menit, selesai 15:54 WIB.
- Panel Debug dapat 2 tab: "Log" (lama, kotak kanan-bawah 460×380, tidak berubah) dan "Konsol Fungsi" (baru, dock kanan `right:0, top:0, bottom:0`, lebar 460, tinggi 100vh).
- Konsol: baris "SEDANG BERJALAN" = fungsi entri terbaru (`getActiveFunction`); stream "PERUBAHAN" = `describeDebugChange(prev, cur)` per pasangan entri berurutan (tool/zoom/seleksi/histori/edit/mode/export-import; pointer → null).
- Tanpa instrumentasi baru ke engine; helper murni di `debugLogger.tsx`, komponen `DebugFunctionConsole.tsx`, tab + geometri di `DebugLogPanel.tsx`.
- Plan: `docs/superpowers/plans/2026-11-16-debug-console.md`.
