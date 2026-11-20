# Brief — Ronde 3, Task T9 Fix Round 1 (I1 + M1)

- Laporan implementer T9: `docs/superpowers/plans/sdd-2026-11-15-round3/task-9-report.md`
- Review T9: verdict **Needs fixes** — 1 Important (I1), 2 Minor (M1 aksi, M2 catatan saja).
- Probe T9: `probes/probe-r3-t9-cinp.cjs` (29 asersi). Suite baseline: `npm test` 277/277.

## Temuan yang harus diperbaiki

### I1 — Important: `cancelHex` cabang `onOpacity` tidak mengembalikan opacity
`src/components/ui/ColorPickerField.jsx:210`: `if (onOpacity) out(prev.hex);`
hanya mengembalikan hex, tidak pernah me-re-emit `prev.alpha`.

Rantai yang diverifikasi controller di kode (bukan dugaan):
- `typed` (:181–195): bila `alpha <= 0`, `nextA = 1`, `setAlpha(1)`, lalu
  `out(n)` (hex polos, tanpa alpha) — jadi mengetik hex ke-6 pada stop
  gradient ber-opacity 0 mempromosikan opacity dokumen 0 → 1.
- `out(c, isLive=false)` (:60–71): non-live → `onCommit(c)` atau
  `on(c, {isLive:false})` — hex kembali ter-commit saat Esc.
- `emitAlpha` (:86–95) adalah pola non-live yang benar untuk opacity:
  `if (onOpacityCommit) onOpacityCommit(nextA); else onOpacity(nextA, { isLive: false });`
  (`clearColor` :104–107 memakai pola yang sama).
- Pemakai `onOpacity` tunggal: `src/components/editor/GradientEditorPanel.jsx:336`
  (stop gradient; handler `onOpacity` commit bila `meta.isLive` falsy).
  Kombinasi `prev.isNone + onOpacity` TIDAK terlibat: `isNone` false
  bila `opacity` terdefinisi (:31), dan panel gradient selalu mengoper `opacity`.

**Skenario gagal (harus direproduksi dulu sebagai probe RED):**
objek dengan fill gradient linear, satu stop opacity 0 → buka color picker
stop → ketik hex baru 6 karakter (live-apply) → Esc → stop HARUS kembali
ke hex pra-edit DAN opacity 0. Pra-fix: hex kembali, opacity tetap 1.

**Fix yang disarankan reviewer** (ikuti, kecuali probe membuktikan ada
yang lebih tepat): di cabang `onOpacity` pada `cancelHex`, sesudah
`out(prev.hex)`, kembalikan opacity meniru jalur non-live `emitAlpha`:
`if (onOpacityCommit) onOpacityCommit(prev.alpha); else onOpacity(prev.alpha, { isLive: false });`
Perhatian: `cancelHex` sudah memanggil `setAlpha(prev.alpha)` lokal (:209)
— itu saja tidak cukup karena efek sinkron `[value, opacity]` menimpa
alpha lokal dari prop parent yang sudah terlanjur 1.

### M1 — Minor: ref snapshot tidak dibersihkan bila popover menutup tanpa commit/cancel
`ColorPickerField.jsx:230-233`: `Float` `onClose` membersihkan `hx` tapi
tidak `hexEditRef`/`hexPrevRef` (yang selama ini hanya dibersihkan di
wrapper `onCommit` :252–253 dan `cancelHex` :203–204). Bila popover
unmount di tengah sesi hex tanpa blur/commit/cancel, sesi hex berikutnya
melewatkan snapshot (guard :183) dan Esc berikutnya mengembalikan warna
basi. Belum terbukti di browser (kebanyakan jalur tutup melakukan blur
dulu → commit → refs bersih). Fix: bersihkan kedua ref di `onClose`.
Buktikan dengan skenario probe bila ada jalur tutup-tanpa-commit yang
dapat direproduksi; bila tidak dapat direproduksi, lakukan fix-nya saja
dan catat sebagai belum-terbukti-di-browser.

### M2 — Minor (CATATAN SAJA, tanpa aksi)
Ukuran width hanya mencakup 5 pemakaian; tidak ada aksi. Jangan ubah
apa pun untuk M2.

## Aturan fix round
- TDD: tambah skenario probe F3-op (gradient stop opacity 0 → ketik hex → Esc)
  ke `probes/probe-r3-t9-cinp.cjs` (atau probe baru `probe-r3-t9f1-cinp.cjs`
  bila lebih bersih — putuskan sendiri, catat alasannya). Jalankan RED
  dulu (gagal pada asersi opacity), lalu fix, lalu GREEN.
- Backup SEBELUM edit pertama tiap file yang diubah, suffix `.bak-r3t9f1`
  (jangan timpa `.bak-r3t9` — itu baseline pra-T9).
- Diff minimal: hanya I1 (+ M1). Jangan sentuh F10, width, atau file lain.
- Verifikasi: probe T9 29/29 + skenario baru hijau; regresi T6 10/10,
  R2-T8 22/22; `npm test` 277/277; 0 pageerror. Probe melawan hasil BUILD
  (`npm run build:web` dulu, server statis port segar milikmu).
- Tulis laporan `task-9-fix1-report.md` di folder sdd yang sama: diff
  (file:baris), hasil probe RED→GREEN dengan angka, regresi, dan apa pun
  yang belum teruji (khususnya: bila skenario M1 tak dapat direproduksi
  di browser, katakan begitu).
- JANGAN spawn subagent/reviewer sendiri. JANGAN ubah scope.
