# Brief — Ronde 3, Final Review Whole-Branch

- Plan: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md`
- Ledger: `docs/superpowers/plans/2026-11-15-round3-ui-fixes-progress.md`
- Artefak per task: `docs/superpowers/plans/sdd-2026-11-15-round3/`
  (`task-N-brief.md`, `task-N-report.md`, `task-N-review-package.md`;
  plus `task-9-fix1-*` dan `task-12-fix1-*`)
- ZIP final: `~/workspace/your_files/Geovanta-Round3-UI-Fixes.zip`
  (SHA256 `97966e1e25a15ac8267c53565e4b825f3cde011370f51cc87a296851644f643f`,
  365 entri, 12.004.873 byte; ZIP Ronde 2 `c75e7a62…` harus tetap utuh)
- Suite baseline: `npm test` 277/277. Total probe T12: 196/196 (150 baru + 46 regresi R2).

## Tugas

Kamu adalah reviewer final whole-branch yang segar (bukan reviewer task
mana pun). Nilailah SELURUH cabang Ronde 3 sebagai satu kesatuan: apakah
11 task + pengemasan layak diserahkan ke user, dan apakah ada cacat
lintas-task yang luput dari review per task. Ini BUKAN review merge —
working copy BUKAN git repo (tidak ada git, tidak ada worktree; "diff"
adalah `.bak-r3tN` vs working copy, dan review package tiap task SUDAH
memuat diff itu). Jangan menjalankan perintah git.

## Yang harus diperiksa

### 1. Per task (verifikasi ulang dari artefak, jangan percaya laporan begitu saja)
- Baca tiap `task-N-report.md` + `task-N-review-package.md` (T1–T11,
  T9-fix1, T12, T12-fix1). Periksa apakah diff-nya minimal, sesuai brief,
  dan apakah verdict APPROVED tiap task masih berdiri.
- Tripwire bundle: parse `TAILWIND_PLUGIN_AST` di
  `src/vendor/tailwindOfflineBundle.jsx` dan hitung ulang — ekspektasi
  pasca-T7: **842 aturan / 356 `!important` / 5 `acc-deep`** (T8–T11
  tidak menyentuh bundle; T9 bundle diff kosong — verifikasi).
- Dua task investigasi: T2 (BUG NYATA — accent `.ws-nav-ico`) dan T10
  (BUG NYATA — eviksi load-path E1). Nilai apakah keduanya dibuktikan
  dengan RED→GREEN yang sah. Catatan: T10 MENUTUP pointer terbuka final
  review Ronde 2 ("kandidat belum teruji yang paling layak bila user
  melapor ulang: eviksi strip recent-colors di batas 10 warna") — sebutkan
  eksplisit bila penutupan ini sah.

### 2. Perburuan cacat lintas-task (wajib — ini nilai tambah final review)
Periksa interaksi berikut dengan bukti (kode dan/atau probe), bukan dugaan:
- a) T1 × T2 × T7: aturan bundle `.fig-rail-grp` / `.ws-nav-item.on
  .ws-nav-ico` / `[data-tip="veBgColor"] .hexf` — apakah ada yang saling
  menimpa atau tripwire bergeser?
- b) T3 × T4 × T8: satu baris `:509` (`EditorRightInspector.jsx`) memuat
  F&R/Recolor (T3 tukar, T4 gap) + Select Same (T8 flex) — apakah urutan,
  gap, dan flex ketiganya konsisten?
- c) T6 × T9: `.c-inp-txt.sel` width auto (T6) vs scroll-into-view +
  cancelHex (T9) — apakah fix T9 merusak width T6, dan sebaliknya?
- d) T9 × T11: `GradChoice` di `GradientEditorPanel` (T11) vs jalur stop
  gradient `cancelHex`/`onOpacity` (T9 fix1) — apakah ikon/flex-wrap T11
  mengganggu F3-op?
- e) T10 × T3/T8: normalisasi `loadPrefs` (T10) — apakah ada efek ke
  Selection Colors?
- f) T2 × T5: accent (T2) vs ikon Frame baru (T5) — apakah ada konflik
  visual/fungsional?
- g) T1 × T9: tombol rail (T1) vs `.c-inp` (T9) — apakah ada aturan yang
  bersinggungan?
- h) Scan probe lama + `src/`/`tests/`: apakah ada testid/handler yang
  dihapus atau diubah maknanya oleh Ronde 3 tanpa pembaruan probe?
- i) ZIP: verifikasi independen hash/entri/delta/exclude + salinan laporan
  dalam ZIP (harus = working copy kecuali 1 baris SHA §6) + smoke 6/6
  dari ekstrak ZIP. Apakah ZIP yang ada adalah ZIP yang layak diserahkan?

### 3. Verifikasi segar (bukan hanya baca laporan)
- `npm run build:web` (exit 0 + 0 warning) + `npm test` dari run baru.
- Jalankan ulang dari build segar (server port segar milikmu) MINIMAL:
  probe T9 (34), T10 (15), T11 (25) — tiga task dengan permukaan
  lintas-task terbesar — + bila waktu memungkinkan seluruh 196/196.
  Laporkan angka dari run-mu sendiri.
- Bila menjalankan probe R2-T8/T11, ingat keduanya menimpa screenshot:
  pulihkan artefak + verifikasi md5 sesudahnya (R2-T8 `93568db9…` /
  `84edc85e…`; T11-before `a0bf12c0…` dari
  `probes/shots/r3-t11-fill-before-genuine.png`).

### 4. Keputusan yang tertunda (nilai, jangan buat keputusan produk baru)
- Ruling controller yang mengikat (lihat ledger): T4 6px diterima; T5
  persegi ganda diterima; T8 per-baris; T10 tanpa kandidat gagal → ada
  kandidat gagal (E1); T11 hanya instance mode Fill. Nilai apakah tiap
  ruling diterapkan dengan benar.
- Daftar Minor yang di-park di ledger (T1–T12): apakah ada yang sebenarnya
  Important dan harus masuk fix wave? Sebutkan bila ada — bila tidak ada,
  nyatakan eksplisit.

## Aturan

- Skill (baca SKILL.md dulu): `requesting-code-review` (pola review
  menyeluruh) + `verification-before-completion` (klaim hanya dari run baru).
- JANGAN mengubah file produk. JANGAN spawn subagent/reviewer lain.
  Review ini read-only kecuali menjalankan build/probe (dan pemulihan
  screenshot bila perlu).
- Tulis laporan `final-review.md` di folder sdd yang sama, dengan format:
  `### Verdict` (APPROVED | With fixes), `### Per-task` (status tiap task
  + bukti singkat), `### Cacat lintas-task` (nomor a–i + hasil),
  `### Verifikasi segar` (angka run-mu), `### Issues` (Critical /
  Important / Minor, masing-masing file:baris + alasan + perbaikan),
  `### Assessment` (1–2 kalimat).
- Bila ada temuan Important/Critical, JANGAN perbaiki sendiri — laporkan
  sebagai fix wave (controller yang mengeksekusi). Bila 0 Important/
  Critical, nyatakan eksplisit "Tidak ada fix wave".
