# Laporan — Ronde 3, Task T9 Fix Round 1 (I1 + M1)

- Brief: `docs/superpowers/plans/sdd-2026-11-15-round3/task-9-fix1-brief.md`
- Review T9: verdict **Needs fixes** — 1 Important (I1), 2 Minor (M1 aksi, M2 catatan saja).
- Skill yang dipakai (SKILL.md dibaca dulu): `systematic-debugging`, `test-driven-development`,
  `browser_ui_fix_verification`, `verification-before-completion`.
- Status: **DONE** — I1 + M1 diperbaiki, probe RED → GREEN terbukti, semua regresi hijau.
- M2: tanpa aksi, sesuai brief.

## Root cause (terverifikasi di kode, bukan dugaan)

- `typed` (`ColorPickerField.jsx:181-195`): bila `alpha <= 0`, `nextA = 1` dan
  `out(n)` (hex polos) — mengetik hex ke-6 pada stop gradient ber-opacity 0
  mempromosikan opacity dokumen 0 → 1. Jalur yang sama di handler `on`
  `GradientEditorPanel.jsx:336` (`op: s.op === 0 && p.a > 0 ? p.a : …`).
- `cancelHex` pra-fix (`:210`): `if (onOpacity) out(prev.hex);` — hanya
  mengembalikan hex, tidak pernah me-re-emit `prev.alpha`.
- `setAlpha(prev.alpha)` lokal saja tidak cukup: efek sinkron `[value, opacity]`
  menimpa alpha lokal dari prop parent yang sudah terlanjur 1.
- Pemakai `onOpacity` tunggal: `GradientEditorPanel.jsx:336` (stop gradient).
  Panel ini tidak mengoper `onOpacityCommit`, jadi jalur fallback
  `onOpacity(prev.alpha, { isLive: false })` yang dipakai — handler-nya commit
  bila `meta.isLive` falsy (`applyGradCommit`).

## Diff (minimal — hanya 1 file produk, 2 hunk)

File: `src/components/ui/ColorPickerField.jsx`
Backup pra-edit: `src/components/ui/ColorPickerField.jsx.bak-r3t9f1`
(baseline pra-T9 `.bak-r3t9` tidak disentuh).

### I1 — `cancelHex`, baris 210-218

```diff
-    if (onOpacity) out(prev.hex);
-    else out(formatColorWithAlpha(prev.hex, prev.alpha));
+    if (onOpacity) {
+      out(prev.hex);
+      if (onOpacityCommit) onOpacityCommit(prev.alpha);
+      else onOpacity(prev.alpha, { isLive: false });
+    } else out(formatColorWithAlpha(prev.hex, prev.alpha));
```

Mengikuti persis fix yang disarankan reviewer: re-emit opacity non-live
meniru jalur `emitAlpha`/`clearColor`. Urutan dipertahankan: hex dulu, lalu
opacity (handler `on` panel gradient tidak lagi menurunkan opacity karena
`onOpacity` sesudahnya yang menentukan nilai akhir).

### M1 — `Float onClose`, baris 241-245

```diff
     }} onClose={() => {
       setOpen(false);
       setHx(null);
       clearHexHint();
+      hexPrevRef.current = null;
+      hexEditRef.current = false;
     }} w={276} cls="cp">
```

Tidak ada file lain yang disentuh. Tidak ada `!important`, offset magic,
dependensi baru, atau perubahan label/i18n. F10 dan aturan width tidak disentuh.

## Probe TDD — RED dulu, lalu GREEN

Probe diperluas di tempat yang sama (bukan probe baru — skenarionya kelanjutan
langsung F3 di file yang sama, memakai helper `openFillPopover`/`measureBox`
yang sudah ada):
`probes/probe-r3-t9-cinp.cjs` — 29 → **34 asersi** (+5).
Backup probe: `probes/probe-r3-t9-cinp.cjs.bak-r3t9f1`.

Skenario baru (FASE 5, F3-op): elips → mode Fill **Linear** → stop pertama
(hex pra-edit `#112233`) → opacity stop diset 0 via kotak alpha (Enter) →
ketik hex `AAAAAA` (live) → Esc → baca ulang hex + alpha stop dari popover.
Lingkungan: build `npm run build:web` + `python3 -m http.server` port **9001**,
Playwright-core + Chromium 1255, viewport 1440×900.

| Asersi | Pra-fix (RED) | Pasca-fix (GREEN) |
|---|---|---|
| F3op-setup — opacity stop diset 0 (alpha terbaca 0) | PASS (alpha=0) | PASS (alpha=0) |
| F3op-live — ketik hex 6 char mempromosikan op 0 → 1 (alpha terbaca 100) | PASS (alpha=100) | PASS (alpha=100) |
| F3op-a — Esc: hex kembali ke pra-edit | PASS (112233) | PASS (112233) |
| **F3op-b — Esc: opacity kembali ke 0** | **FAIL (alpha=100, expected 0)** | **PASS (alpha=0)** |
| F3op-m1 — M1 kontrol negatif (lihat bawah) | PASS | PASS |
| 29 asersi T9 lama (W-*, F1–F10, E0) | PASS semua | PASS semua |

**Hasil probe T9: pra-fix 33/34 (gagal: F3op-b) → pasca-fix 34/34, 0 pageerror.**

## Regresi (pasca-fix, melawan build yang sama, port 9001)

| Suite | Hasil |
|---|---|
| Probe T9 `probe-r3-t9-cinp.cjs` | **34/34**, 0 pageerror |
| Probe T6 `probe-r3-t6-cinp-txt-sel.cjs` (`R3_T6_URL=http://127.0.0.1:9001/`) | **10/10**, 0 pageerror |
| Probe R2-T8 `probe-r2-t8-last-color.cjs` (`R2_T8_URL=http://127.0.0.1:9001/`) | **22/22**, 0 pageerror |
| `npm test` | **277/277** (fail 0, durasi ±25 dtk) |

## Yang belum teruji — jujur

### M1: fix diterapkan, tapi TIDAK terbukti di browser
Penyelidikan jalur tutup popover (baca `FloatPopover.jsx` + `CustomTextBox.jsx`
+ `presenceAndFilePicker.jsx`):

- `Float onClose` dipicu (a) pointerdown di luar popover/anchor (capture),
  (b) keydown Escape di document.
- Setiap jalur itu ternyata tetap membersihkan refs lewat jalur lain:
  blur input → `finishEdit` → `onCommit` wrapper ColorPickerField
  (membersihkan kedua ref tanpa syarat); Esc di dalam kotak hex →
  `onCancel` → `cancelHex` (membersihkan kedua ref). `onKeyDown`
  CustomTextBox memakai `stopPropagation`, jadi Esc di kotak hex tidak
  sampai ke listener document Float.
- `usePresence` menahan konten popover tetap ter-mount 160 ms sesudah tutup,
  sehingga blur → commit tetap sempat jalan pada tutup-via-klik-luar.
- Satu-satunya jalur teoretis (unmount instan tanpa blur, mis. objek dihapus
  selagi popover terbuka) menghancurkan instance komponen beserta refs-nya,
  jadi tidak ada state basi yang bertahan ke sesi berikutnya.
- Skenario F3op-m1 ditambahkan sebagai **kontrol negatif** untuk mendokumentasikan
  jalur yang paling mungkin: ketik parsial `AB` (sesi aktif, snapshot diambil,
  tanpa emit) → klik kanvas di luar popover (onClose) → buka lagi → ketik
  `BBBBBB` → Esc → hex kembali ke nilai sesi baru (`112233`), bukan basi.
  Skenario ini **lolos baik pra- maupun pasca-fix** — sesuai prediksi, karena
  blur → commit sudah membersihkan refs. Skenario ini TIDAK membuktikan fix
  M1; fix M1 bersifat defensif (menutup celah bila ada jalur tutup-tanpa-commit
  di masa depan) dan diterapkan persis seperti diminta brief.

### Lainnya
- Verifikasi hanya di headless Chromium 1255 (viewport 1440×900), sesuai
  lingkungan probe ronde ini. Re-test manual user di browser asli tetap
  disarankan untuk skenario F3-op (stop gradient opacity 0 → ketik hex → Esc).
- Server port 9001 sudah dimatikan sesudah verifikasi. Build `web/` terakhir
  adalah hasil build pasca-fix.
