# Review Task 2 — Ronde 2: Corner radius drag mouse (T2)

- **Reviewer:** fresh reviewer (bukan implementer, bukan koordinator); tanpa subagent.
- **Skill dipakai:** `requesting-code-review`, `verification-before-completion`
  (semua klaim di bawah dari run segar oleh reviewer), `systematic-debugging`
  (uji hipotesis, bukan asumsi).
- **Dokumen yang dibaca:** `task-2-brief.md`, `task-2-report.md`,
  `task-2-review-package.md`, diff aktual `.bak-t2` vs current,
  `probes/probe-r2-t2-radius-drag.cjs`, `tests/corner-clamp.test.cjs`,
  `src/components/editor/VectorEditor.jsx` (+ `.bak-t2`),
  `src/components/ui/TransformField.jsx`, `src/engine/cornerFilletEngine.jsx`.
- **Verdict: APPROVED**
- **Spec: ✅** (semua poin brief terpenuhi; lihat §1)

## 1. Spec compliance (brief → bukti)

| Brief | Status | Bukti |
|---|---|---|
| Step 1: reproduksi 3 kasus + hipotesis tunggal + bukti angka | ✅ | Probe RED direproduksi reviewer di scratch copy (lihat §3): rect scrub 10 (bukan 46,8), bintang 9,9, oktagon 10, toast penolakan; ketik 200 → 46,8/29/93,8. Hipotesis awal plan (clamp) terbukti salah sebagai mekanisme utama — gagal sejak pointermove ke-2 di radius 10, jauh di bawah maksimum 46,8. |
| Step 2: perbaiki di akar, toast hanya bila tak ada sudut bisa dijepit | ✅ | `setRadius` me-resolve ulang dari `docRef`/`selRef`; `commitObjs` tetap true bila clamp diterapkan (engine clamp terbukti §3); toast penolakan hilang di semua asersi drag GREEN. |
| Jangan rusak: ketik, bintang, autoRefineGeometry, tes unit | ✅ | Ketik T0 lolos di RED maupun GREEN; bintang T5 GREEN 29 == 29; `autoRefineGeometry.jsx` tidak tersentuh (diff hanya 2 file); `npm test` 277/277. |
| TDD: probe RED dulu, gagal pada asersi drag yang dituju | ✅ | RED diverifikasi independen reviewer: 5/12, tepat 7 asersi drag/tahan-step gagal (T1, T2, T4, T5, T7a, T6, T7b); ketik/klik-step/pageerror lolos. |
| GREEN + screenshot before/after | ✅ | GREEN 12/12 (2× oleh implementer, 1× segar oleh reviewer); `probes/shots/r2-t2-radius-before.png` + `r2-t2-radius-after.png` ada. |
| Regresi `npm test` penuh | ✅ | 277/277 PASS, 0 fail — run segar reviewer (275 baseline + 2 baru). |
| Backup `.bak-t2` per file sebelum edit | ✅ | `VectorEditor.jsx.bak-t2`, `corner-clamp.test.cjs.bak-t2` ada; hanya 2 file itu yang berubah. |
| Diff minimal; tanpa `!important`/offset/z-index/klip/label/i18n/dep baru | ✅ | Diff aktual = 83 baris (VectorEditor) + 49 baris (tes); tidak ada pola terlarang; `TransformField.jsx`, engine, `autoRefineGeometry.jsx` tidak disentuh. |

## 2. Verifikasi independen reviewer (run segar, bukan dari laporan)

1. **Diff package lengkap.** Setiap baris `+`/`-`/`@@` dari `diff -u` aktual
   (VectorEditor 83 baris, tes 49 baris) ada di `task-2-review-package.md`
   (0 baris hilang). Scope perubahan = tepat 2 file; tidak ada file lain
   yang berubah (hanya 2 file `.bak-t2` di seluruh working copy).
2. **Ekstraksi `buildDetectedCorners` identik.** Badan fungsi lama (memo,
   96 baris) vs fungsi baru: **byte-identik sesudah normalisasi rename**
   (`cornerTargets`→`targets`, `indivCornerOpen`→`indivOpen`).
   Memo `VectorEditor.jsx:8042` memakai fungsi yang sama dengan deps yang
   sama. Perilaku render tidak berubah — klaim laporan benar.
3. **Hipotesis stale-closure TERBUKTI (bukan sekadar plausibel).**
   - `TransformField.jsx:116-127`: `startScrub` menutup `on` (= `setRadius`
     render saat pointerdown) dan memanggil `on(next)` tiap pointermove;
     `startStepHold` (`:98`, via `bump` `:90-96`) menutup `on` yang sama
     untuk tick interval 55 ms.
   - `setRadius` lama memakai `sel.nodes` + `detectedCorners` dari closure
     render — basi sesudah fillet pertama mengganti id apex.
   - Reproduksi level engine oleh reviewer (`/tmp`, esbuild dari
     `cornerFilletEngine.jsx`, rect 40×40): fillet r=10 → `cnt=4`, 8 node,
     `filR=[10,10,10,10]`; r=20 id apex BASI → **`cnt=0`, `sameObj=true`**
     (= `commitObjs` false → toast); r=20 id pasangan SEGAR → `cnt=8`,
     `filR=[19,6,19,6,19,6,20]`; r=200 id segar → `filR=[19,6,19,6,19,6,36,8]`.
     Semua angka sama persis dengan tabel laporan §2.
   - Rantai `commitObjs` (`VectorEditor.jsx:1079`, `r !== o` → `ch`) dan
     toast (`:8112`, `if (!ch && rad > 0)`) sesuai laporan.
   - Bukti pembeda ketik-vs-drag: klik step tunggal lolos di run RED
     (T3 PASS) karena tiap klik mengambil closure segar — konsisten dengan
     hipotesis.
4. **Perbaikan di akar benar.** `commit` menulis `docRef.current`
   sinkron (`VectorEditor.jsx:1064-1065`); `setSel` menulis
   `selRef.current` sinkron (`:170-173`); `applyRadiusToCorners`
   memperbarui `selRef` via `setSel` tiap commit (`:8103-8108`).
   Jadi `freshSelObjs`/`freshCorners`/`freshNodes` di `setRadius`
   (`:8126-8130`) memang segar di tiap pointermove, termasuk di dalam
   closure gesture lama. Cabang fallback `setCornerRadius` (`:8151-8157`)
   tidak diubah — benar, karena di jalur tanpa sudut terdeteksi belum ada
   fillet sehingga tidak ada pergantian id.
5. **Probe RED direproduksi reviewer.** Salinan working copy di
   `/tmp/r2-t2-red-check`, `VectorEditor.jsx` dikembalikan ke `.bak-t2`,
   `npm run build:web` exit 0, probe `before`: **5/12 lolos, gagal
   T1, T2, T4, T5, T7a, T6, T7b** — angka sama persis dengan laporan
   (rect scrub 10 + toast, bintang 9,9, oktagon 10, tahan-step field 1).
   Working copy asli TIDAK disentuh eksperimen ini (copy dihapus sesudahnya;
   server 8941/8942 dimatikan).
6. **Probe GREEN dijalankan ulang reviewer** (server statis port 8941,
   bundle `web/` bertimestamp sesudah edit sumber): **12/12 lolos**,
   nilai sama persis dengan laporan — ketik 46,8; scrub rect 46,8;
   tahan-step field 8 tanpa toast; bintang 29 == 29; oktagon 93,8 == 93,8;
   0 pageerror.
7. **Tes baru (g)/(h) mengunci kontrak yang benar.**
   - (g) id basi → no-op (`cnt=0`, objek sama): mengunci kontrak engine
     fail-closed yang membuat UI wajib me-resolve ulang. Benar sebagai
     spesifikasi, bukan sebagai "perilaku yang diinginkan" engine.
   - (h) id segar → refillet + clamp; ekspektasi `[19,6,19,6,19,6,20]`
     dan `[19,6,19,6,19,6,36,8]` direproduksi persis oleh reviewer di §2.3.
   - `corner-clamp.test.cjs` 8/8 di dalam suite 277/277.
8. **Quirk cap asimetris (concern 1 laporan) BENAR ADA dan BENAR pra-ada.**
   `cornerFilletEngine.jsx:440-441`: `cap1/cap2` memakai
   `newSelIds.has(...)` (0,49 vs 0,92), sementara loop memutasi
   `newSelIds` (`:495-497`, `:575-577`: hapus id apex, tambah id pasangan).
   Sudut yang diproses belakangan melihat tetangga yang sudah diganti →
   cap 0,92. Engine TIDAK disentuh T2 (bukan bagian diff), jadi quirk ini
   pra-ada. Di luar scope T2 — penempatan sudah benar; butuh keputusan
   produk bila ingin cap simetris.

## 3. Temuan

### Critical
- (tidak ada)

### Important
- (tidak ada)

### Minor

1. **Cabang Individual Corner (`freshActive`) masih memakai
   `pickedCornerKeys` dari closure render** —
   `src/components/editor/VectorEditor.jsx:8139`.
   Analisis reviewer: kunci sudut berbentuk `o.id:sp.id:cIdx`
   (`:7983`, `:8006`, `:8024`) dengan `cIdx` urutan scan; fillet mengganti
   apex dengan pasangan *di tempat yang sama* sehingga urutan/jumlah sudut
   stabil untuk rect/bintang/oktagon — kunci lama tetap cocok dengan
   `freshCorners`, dan cabang ini **lebih baik** dari kode lama (kode lama
   memakai `activeCorners` dari closure yang sama tapi dengan `nodeIds`
   basi → `cnt=0`). Risiko sisa hanya bila jumlah/urutan sudut berubah
   di tengah gesture (mis. merge engine meruntuhkan sudut terbelah):
   `freshActive` kosong → jatuh ke `freshCorners` (SEMUA sudut), padahal
   user hanya memilih subset — perluasan scope diam-diam vs kode lama
   yang memakai subset dari memo. Sempit, tidak ter-probe, sesuai concern 2
   laporan. **Tidak memicu fix loop; cukup re-test user bila panel itu
   dipakai saat scrub.**
2. **`setRadius` menghitung ulang `buildDetectedCorners` di tiap
   pointermove** (tanpa memo di jalur gesture) —
   `src/components/editor/VectorEditor.jsx:8129`. Biaya O(sudut) per
   gerakan; guard >16 objek saat panel tertutup tetap berlaku (`:7949`).
   Untuk seleksi normal tidak terasa (probe 20 langkah lolos deterministik),
   tapi ini beban baru yang sebanding dengan ukuran seleksi. Observasi saja.
3. **Cabang fallback `setCornerRadius` masih memakai `selObjs`/`sel` dari
   closure** — `src/components/editor/VectorEditor.jsx:8151-8152`.
   Dinilai benign: di jalur tanpa sudut terdeteksi tidak ada pergantian id
   objek, dan `commitObjs` mencocokkan berdasarkan id terhadap objek segar
   dari `docRef`. Dicatat agar tidak dibaca sebagai "semua closure
   dibersihkan". Jalur ellipse (tanpa corner) tetap belum ter-probe,
   sesuai concern 5 laporan.

## 4. Hal yang dikonfirmasi dari concerns laporan (§7)

- Concern 3 (kelas laten `TransformField.jsx` untuk field lain): benar,
  `startScrub`/`startStepHold` tetap menutup `on` dari render pointerdown
  (`TransformField.jsx:116-127`, `:98`). Untuk radius sudah tidak berbahaya
  karena fix di `setRadius`; field lain (W/H/Opacity via `setProp` dkk.)
  belum diverifikasi — di luar scope T2, benar diparkir.
- Concern 4 (bacaan toast T3 ambigu): terkonfirmasi di run RED reviewer —
  toast "Sudut tidak cukup panjang…" tersampel sesudah 5× klik step
  (sisa toast scrub, hidup 2200 ms). T3 tidak mengasersi toast, jadi tidak
  memengaruhi verdict.
- Concern 5 (ellipse 4 node smooth): di luar laporan user; jalur
  `setCornerRadius` + toast "Tidak ada sudut…" tidak di-probe. Benar di luar
  scope.
- Concern 6 (scrub radius → 0 via drag kiri): tidak di-probe; engine
  mendukung (rad=0 → lepas fillet, tidak ada toast karena `rad > 0` gate
  di `:8112`), tapi perilaku UI-nya belum terlihat. Bukan blocker.

## 5. Cannot verify from diff

- Re-test user di browser asli dengan mouse hardware frekuensi tinggi
  (probe memakai langkah Playwright; 2× GREEN implementer + 1× GREEN
  reviewer deterministik, tapi bukan pengganti uji user).
- Perilaku scrub radius → 0 (kembali tajam via drag kiri) — tidak ada
  asersi probe.
- Cabang Individual Corner saat scrub dengan subset sudut dipilih —
  hanya analisis kode (§3 Minor 1); tidak ada probe yang membuka panel.
- Kasus ellipse (4 node smooth, tanpa `detectedCorners`) saat scrub —
  tidak ada probe; hanya penalaran id-stabilitas (§3 Minor 3).
- Performa scrub pada seleksi sangat besar (>16 objek, panel tertutup —
  guard slice berlaku; panel terbuka — tanpa guard): tidak diukur.

## 6. Angka yang dihitung ulang reviewer

- `npm test`: **277/277 PASS, 0 fail** (275 baseline + 2 baru (g)/(h)).
- Probe RED (scratch copy, build pra-fix): **5/12** (gagal T1, T2, T4, T5,
  T7a, T6, T7b).
- Probe GREEN (working copy, run segar): **12/12**, 0 pageerror.
- Engine: stale → `cnt=0`/`sameObj=true`; segar r=20 →
  `[19,6,19,6,19,6,20]`; segar r=200 → `[19,6,19,6,19,6,36,8]`.
- Diff: 2 file, 83 + 49 baris; ekstraksi fungsi 96 baris identik.
