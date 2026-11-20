# Brief — Ronde 3, Task T11: Mode Fill — ikon 5 tombol + width 100% + flex-wrap

- Plan: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` (§ T11, baris 52 + 104–107)
- Lokasi: `src/components/editor/GradientEditorPanel.jsx:244` — `GradChoice`
  (komponen `../ui/SegmentedControl.jsx`), `cols={3}`, opsi:
  `[['solid','Solid'], ['linear','Linear'], ['radial','Radial'],
  ['angular', L.gradAngular], ['none', L.gradNone]]` (`L.gradNone` = 'Kosong').
- Suite baseline: `npm test` 277/277 (terverifikasi controller pasca-T10).

## Yang diminta user

1. **Tambah ikon pada SEMUA tombol** — Solid, Linear, Radial, Angular,
   Kosong (`none`). Pilih dari set ikon yang SUDAH ADA (pilih yang paling
   terbaca per mode); dokumentasikan pilihan ikon per tombol + alasannya di
   laporan. **TIDAK ada path ikon baru kecuali reviewer setuju** — bila set
   yang ada tak punya ikon yang cocok untuk satu mode, catat di laporan dan
   biarkan tombol itu tanpa ikon (atau pakai yang paling dekat + jelaskan),
   JANGAN menggambar path baru diam-diam.
2. **Isi semua ruang kosong** — tombol mengisi lebar container (width 100%
   tanpa sisa, mis. via `flex: 1` per tombol + `flex-wrap` pada container
   instance `GradChoice` ini).
3. **JANGAN PERNAH text-wrap pada label** — bungkus di level flex, bukan teks
   (label tetap satu baris; tombol membungkus ke baris berikut bila perlu).

## SKOP — batas keras

- **HANYA instance mode Fill.** `GradChoice` dipakai juga untuk gradInterp
  (`cols={2}`, sekitar `:417`) dan Spread Method (`cols={3}`) — kedua
  instance lain JANGAN berubah (tanpa ikon baru, tanpa flex-wrap baru,
  tanpa perubahan lebar).
- Bila `GradChoice`/`SegmentedControl.jsx` perlu diubah, buat **varian/prop
  baru khusus mode Fill**; jangan ubah perilaku default komponen bersama.
- Probe harus mengasersi KETIGA instance: mode Fill berubah (ikon + penuh
  lebar + wrap), gradInterp + Spread Method TIDAK berubah.

## Cara kerja (TDD)

- Probe RED dulu: `probes/probe-r3-t11-fill-icons.cjs` — asersi per tombol
  mode Fill (ikon ada + terbaca, lebar tombol mengisi container tanpa sisa,
  label tak ter-wrap, container membungkus bila perlu) + kontrol negatif
  (gradInterp/Spread tak berubah). Screenshot before WAJIB dari state pra-fix
  (close-up panel Mode Fill).
- Implementasi minimal, lalu probe GREEN. Screenshot after (close-up yang sama).
- Backup `.bak-r3t11` per file SEBELUM edit pertama. Diff minimal; tanpa
  `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah
  label/i18n (ikon saja, teks label tetap).

## Regresi + verifikasi

- Probe T9 (`probe-r3-t9-cinp.cjs`, 34 asersi — GradChoice ada di
  GradientEditorPanel yang sama, jalur stop gradient tak boleh rusak) hijau;
  probe T10 (`probe-r3-t10-last-color.cjs`, 15 asersi) hijau; `npm test`
  277/277; 0 pageerror.
- Tulis laporan `task-11-report.md` di folder sdd yang sama: pilihan ikon per
  tombol + alasan, diff (file:baris), hasil probe RED→GREEN dengan angka,
  regresi, dan apa pun yang belum teruji (mis. hanya headless, hanya ID/EN).

## Aturan

- Skill (baca SKILL.md dulu): `ui-ux-fixer-and-improvement` (audit 7 pilar;
  JANGAN text-wrap, JANGAN magic offset), `test-driven-development` (probe RED
  dulu), `browser_ui_fix_verification` (browser asli Playwright + ukur layout
  nyata — lebar tombol/container diukur, bukan ditebak),
  `verification-before-completion` (klaim hanya dari run baru).
- Probe berjalan melawan hasil BUILD (`npm run build:web` dulu, sajikan
  `web/` via server statis di port segar milikmu — port yang sudah dipakai:
  T1 8981, T2 8983, T3 8985, T4 8988, T5 8990, T6 8992, T7 8994, T8 8996,
  T9 8998, T9-fix1 9001, verifikasi T9 9003, T10 9005, verifikasi T10 9007 —
  pilih yang belum dipakai, mis. 9009).
- JANGAN spawn subagent/reviewer sendiri. JANGAN ubah scope.
