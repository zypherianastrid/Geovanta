# Task 1 review — Ronde 2: Rail kiri: active = accent persis + hapus radius & shadow 3 grup

**Verdict: APPROVED** (0 Critical, 0 Important, 5 Minor — Minor tidak memicu fix loop, dicatat saja)
**Tanggal review:** 2026-11-14, ±14:26–14:35 WIB. **Reviewer:** subagent review segar (tanpa subagent turunan, tanpa pesan ke user).
**Skill yang dipakai:** `requesting-code-review`, `verification-before-completion` (semua klaim di bawah
diuji ulang dengan run segar oleh reviewer, bukan dari laporan), `ui-ux-fixer-and-improvement`
(audit 8-state seperlunya untuk `.fig-rail-grp` / `.dk-b`).

**Bahan yang dibaca:** `task-1-brief.md`, `task-1-report.md`, `task-1-review-package.md`,
`probes/probe-r2-t1-rail.cjs`, `src/vendor/tailwindOfflineBundle.jsx` + `.bak-t1` (parse AST penuh),
screenshot `probes/shots/r2-t1-rail-after.png` (dibaca visual).

## 1. Ringkasan verifikasi independen reviewer

| Klaim implementer | Hasil verifikasi reviewer |
|---|---|
| Diff = tepat 3 aturan AST dari 837 | ✅ BENAR. Parse ulang AST `.bak-t1` vs current: indeks berubah hanya `[428, 494, 794]`; total aturan 837 = 837; baris file 542 = 542 (laporan menulis "baris tetap 542" — reviewer mengukur 541 newline + baris terakhir; konsisten). |
| E1 idx 428 `.dk-b.on`: `var(--acc-deep)` → `var(--acc)` | ✅ BENAR, exact-match sesuai review-package. |
| E2 idx 494 `.fig-rail-grp` base: radius `12px` → `0` | ✅ BENAR. |
| E3 idx 794 `.fig-rail-grp` M3: shadow `var(--m3-shadow-xs) !important` → `none !important`, radius `14px !important` → `0 !important` | ✅ BENAR. |
| `!important` 357 = 357, baru = 0 | ✅ BENAR (hitung mentah string di kedua file). |
| `acc-deep` 7 → 6 (hanya `.dk-b.on` hilang) | ✅ BENAR; sisa: idx 64 (`.bar`), 271 (`.tool-btn.on`), 464/465 (definisi `:root` light/dark), 532 (`.cp-act-btn.on`), 771 (`.ws-nav-item.on .ws-nav-ico`). |
| `.tool-btn.on` (271), `.cp-act-btn.on` (532), `.ws-nav-item.on .ws-nav-ico` (694 & 771), override M3 `.dk-b.on` (504/564) tak tersentuh | ✅ BENAR — semua identik byte-per-aturan antara `.bak-t1` dan current. (Catatan: laporan §3 menulis "idx 694/771" untuk `.ws-nav-item.on .ws-nav-ico`; benar ada DUA aturan selector itu — idx 694 `background: var(--acc)` non-`!important` dan idx 771 M3 `var(--acc-deep) !important` — keduanya tak tersentuh. Lihat Minor M3.) |
| Probe GREEN 7/7, exit 0 | ✅ DIREPRODUKSI reviewer: server `web/` port 8932, `R2_T1_URL=http://127.0.0.1:8932/ node probes/probe-r2-t1-rail.cjs after` → **7/7 lolos, exit 0** (A1–A7 semua PASS, 0 pageerror). |
| `npm test` 275/275 | ✅ DIREPRODUKSI reviewer: **275 pass / 0 fail** (21.640 ms durasi; `NPM_EXIT=0`). |
| `npm run build:web` exit 0 | ✅ DIREPRODUKSI reviewer: **exit 0**; bundle `web/assets/geovanta.bundle.js` `acc-deep` = 6, berisi `fig-rail-grp … box-shadow … none !important`. Ukuran bundle tetap 2.003.026 B (deterministik). |
| Screenshot after | ✅ Dibaca visual: editor terbuka, rail kiri 3 grup terlihat, tombol aktif biru `#0d99ff`, tooltip toggle node tampil. Catatan: file `r2-t1-rail-after.png` tertimpa oleh re-run reviewer (99.354 B, 14:25) vs yang dilaporkan (99.346 B, 14:20) — isi praktis sama; `before` tak tersentuh (101.136 B). |

## 2. Spec-compliance (brief, per butir)

- **Butir 1 — `.dk-b.on` → `var(--acc)`, tanpa color-mix; jangan sentuh `.tool-btn.on` / `.cp-act-btn.on` / `.ws-nav-item.on .ws-nav-ico`:** ✅ SPEC TERPENUHI. E1 tepat; ketiga selector larangan diverifikasi tak berubah (lihat tabel §1).
- **Butir 2 — `.fig-rail-grp`: radius 0, shadow none; hapus override `!important` 14px/shadow; bila aturan dasar 12px tersisa netralkan juga; tanpa `!important` BARU; bila menyentuh aturan `!important` M3, sebutkan eksplisit:** ✅ SPEC TERPENUHI dengan catatan. E2 menetralkan base 12px → 0; E3 menyentuh aturan M3 dan **mempertahankan** (bukan menambah) `!important` — dinyatakan eksplisit di laporan §3, jumlah `!important` tetap 357. Tanpa E3, E2 saja tidak cukup karena `!important` 14px di idx 794 akan tetap menang — jadi E3 adalah perbaikan yang benar-benar efektif, E2 adalah konsistensi base.
- **TDD RED → GREEN + screenshot before/after:** ✅ SEBAGIAN TERVERIFIKASI LANGSUNG (lihat §4). GREEN direproduksi reviewer. RED tidak di-run ulang live oleh reviewer (butuh revert kode — dilarang untuk reviewer), tetapi hasil RED dikoroborasi secara deterministik dari `.bak-t1` (lihat §4).
- **Backup `.bak-t1` sebelum edit; diff minimal; tanpa dependensi/label/i18n baru:** ✅ TERPENUHI. Backup ada (`178.116 B`); satu-satunya file sumber berubah adalah `src/vendor/tailwindOfflineBundle.jsx` baris 437; tidak ada dependensi/label baru.

## 3. Pertanyaan khusus dari koordinator

### 3.1 Klaim A3 — "`.dk-b.on` sudah PASS pra-fix karena override M3 idx 504/564" — BENAR

Bukti dari diff (`.bak-t1`, pra-fix), diverifikasi reviewer:

- idx 504: `.fig-nav-dock .dk-b.on, .fig-nav-dock .dk-b.on:hover, …` → `background: var(--acc) !important`.
- idx 564: selector list memuat **telanjang** `.dk-b.on` (juga `.dk-b.on:hover`, `.tool-btn.on`, …) → `background: var(--acc) !important`.
- Base idx 428 pra-fix: `.dk-b.on` → `var(--acc-deep)`, tanpa `!important`, spesifisitas sama (0,2,0) dengan
  `.dk-b.on` di idx 564 — `!important` + urutan lebih akhir menang mutlak. Jadi **setiap** `.dk-b.on`
  di mana pun (di dalam maupun di luar `.fig-nav-dock`) sudah ter-computed `var(--acc)` sebelum fix.

**Implikasi — perubahan butir 1 tetap sah, tetapi laten, bukan perbaikan visual.** E1 tidak mengubah
satu piksel computed pun di rail (probe A3 pra-fix sudah `rgb(13, 153, 255)`, pasca-fix tetap sama).
Keputusan implementer melaksanakannya verbatim sebagai penghapus utang laten sudah tepat: bila
override M3 idx 504/564 dihapus suatu hari, tombol aktif akan kembali gelap tanpa E1.
**Peringatan untuk koordinator/user:** T1 TIDAK BOLEH disajikan sebagai "memperbaiki tombol aktif yang
gelap" secara visual. Perbaikan yang benar-benar tampak dari T1 hanyalah butir 2 (radius + shadow grup).
Bila user masih melihat tombol aktif gelap di suatu tempat, sumbernya BUKAN `.dk-b.on` rail — kandidatnya
adalah selector yang sengaja tak disentuh per brief dan masih memakai `var(--acc-deep)`:
`.tool-btn.on` (idx 271), `.cp-act-btn.on` (idx 532), `.ws-nav-item.on .ws-nav-ico` (idx 771).
Itu di luar scope T1; jangan diperluas di sini.

### 3.2 Aturan `.fig-rail-grp:hover` (idx 495) kini ditekan permanen oleh `none !important` — DAPAT DITERIMA (Minor, lihat M1)

Penilaian: **bukan cacat, bukan Important — dapat diterima sebagai end state yang diminta.**
Alasan:

- End state yang diminta brief adalah shadow = none; hover yang memunculkan kembali shadow akan
  melanggar spesifikasi itu. Dengan `none !important` di idx 794, hover diukur langsung oleh reviewer:
  `border-radius 0px`, `box-shadow none` (light DAN dark, lihat §5). Tidak ada regresi visual.
- **Koreksi terhadap laporan §7.2:** aturan hover itu TIDAK "kini mati" karena T1 — ia **sudah mati
  pra-fix** untuk `box-shadow` (idx 794 pra-fix sudah `box-shadow: var(--m3-shadow-xs) !important`,
  mengalahkan hover non-`!important`) dan juga untuk `border-color` (idx 794 `border: … !important`
  shorthand sudah menekan `border-color: var(--line)` hover pra-fix). T1 hanya mengganti nilai yang
  menang dari `shadow-xs` menjadi `none`; status "mati"-nya tidak berubah. Yang tersisa adalah dead
  code (dua deklarasi idx 495 yang tak pernah menang), bukan perilaku rusak.
- Alternatif yang lebih bersih — hapus deklarasi shadow di idx 495 DAN lepas `!important` dari idx 794 —
  ada, tetapi itu diff lebih besar dan berisiko; pilihan minimal-diff implementer dibenarkan.
  Pembersihan idx 495 dicatat sebagai Minor M1 untuk task lain, bukan fix loop.

### 3.3 E3 mempertahankan `!important` (bukan menambah) — BENAR; larangan tak tersentuh — BENAR

- Jumlah `!important` 357 = 357, baru = 0 — diverifikasi dengan hitung mentah (bukan klaim laporan).
- `.tool-btn.on` idx 271, `.cp-act-btn.on` idx 532, `.ws-nav-item.on .ws-nav-ico` idx 694 & 771,
  override `.dk-b.on` idx 504 & 564 — semuanya identik antara `.bak-t1` dan current.
- Catatan Iron Law skill `ui-ux-fixer-and-improvement` ("tanpa `!important` baru"): dipatuhi secara
  harfiah — tidak ada `!important` baru. Mempertahankan yang sudah ada di aturan M3 yang sama adalah
  satu-satunya cara minimal agar hover (idx 495, spesifisitas lebih tinggi) tidak menghidupkan kembali
  shadow. Lihat Minor M2.

### 3.4 Apakah probe RED benar-benar gagal pada asersi yang dituju dan GREEN sesudah fix?

- **GREEN: ✅ direproduksi langsung reviewer — 7/7, exit 0** (lihat §1).
- **RED: ⚠️ tidak di-run ulang live oleh reviewer** (butuh revert sementara — dilarang; reviewer tidak
  mengubah kode apa pun). Namun hasil RED yang dilaporkan **terkoroborasi penuh dari `.bak-t1`**:
  - A4 gagal pra-fix: idx 794 pra-fix `border-radius: 14px !important` mengalahkan base 12px → computed
    `["14px","14px","14px"]` — persis nilai FAIL yang dilaporkan.
  - A5 gagal pra-fix: idx 794 pra-fix `box-shadow: var(--m3-shadow-xs) !important`; token
    `--m3-shadow-xs` (light, idx 464) = `0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)`
    — persis nilai FAIL yang dilaporkan (format `rgba(...) 0px 1px 3px 0px, …` adalah serialisasi
    computed yang sama).
  - A3 lolos pra-fix: terbukti dari idx 504/564 di §3.1 — konsisten dengan laporan.
  - A1/A2/A6/A7 tidak bergantung pada aturan yang diubah, jadi lolos pra-fix adalah ekspektasi yang benar.
  - Satu kelemahan dokumentasi (diakui laporan §7.5): exit code proses RED tidak tercatat bersih
    (output di-pipe ke `tail`). Karena nilai FAIL-nya cocok byte-per-nilai dengan kaskade `.bak-t1`,
    reviewer menganggap RED kredibel; kelemahan ini dicatat sebagai Minor M4, bukan keraguan atas hasil.

## 4. Audit 8-state seperlunya (ui-ux-fixer-and-improvement)

Untuk `.fig-rail-grp` (kontainer statis) dan tombol `.dk-b` di dalamnya — hanya state yang relevan
dengan perubahan ini yang diaudit; tidak ada band-aid:

| State | Hasil |
|---|---|
| Default | ✅ radius `0px`, shadow `none` (3/3 grup, light + dark). |
| Hover / pointer | ✅ Diukur langsung reviewer (hover grup pertama): radius `0px`, shadow `none`, `border-color` = `rgba(15, 23, 42, 0.06)` (nilai M3 dari idx 794 — konsisten dengan end state; hover rule idx 495 sepenuhnya tak berpengaruh, lihat M1). |
| Focus / keyboard | ✅ Tak tersentuh — `.dk-b:focus-visible` (idx 430) identik pra/pasca; tidak ada perubahan focus ring. |
| Active / pressed | ✅ Tak tersentuh — `.dk-b:active` (idx 427) identik. |
| Loading / progress | N/A — kontainer statis, bukan kontrol async. |
| Disabled | ✅ Tak tersentuh — `.dk-b:disabled` (idx 429) identik. |
| Empty / error | N/A — grup selalu ter-render 3× (A2 = 3); probe 0 pageerror. |
| Fungsional | ✅ A7 toggle `veShowNodeGlobal` off→on direproduksi reviewer (1→0→1). |

Tidak ditemukan regresi state apa pun.

## 5. Pemeriksaan tambahan reviewer (menutup concern laporan §7)

- **Dark theme (concern §7.3 — hanya light yang diprobe implementer): ✅ DITUTUP reviewer.**
  Skrip sekali-pakai di `/tmp` (bukan di working copy) dengan seed prefs `theme: 'dark'`, accent `#0d99ff`:
  dark → `--acc #0d99ff`, `.dk-b.on` bg `rgb(13, 153, 255)`, 3/3 grup radius `0px` + shadow `none`,
  hover juga `0px`/`none`, 0 pageerror. Aturan yang diubah memang tidak ber-qualifier tema, dan
  pengukuran mengonfirmasinya.
- **Accent via seed localStorage, bukan klik Settings UI (concern §7.4):** diterima — itu jalur prefs
  asli (`loadPrefs` + `applyAccent`); A1 membuktikan nilai sampai ke `--acc`. Jalur klik Settings UI
  sendiri tetap belum diprobe; di luar scope T1.
- **Screenshot before/after:** before ada dan tak tersentuh; after dibaca visual reviewer (§1).
  Perbedaan radius 14px→0px memang tidak kentara pada skala full-page (sesuai pengakuan laporan §4);
  bukti utama tetap nilai computed — sudah benar begitu.

## 6. Temuan (semua Minor — tidak memicu fix loop)

- **M1 — Minor — `.fig-rail-grp:hover` (idx 495) adalah dead code (kedua deklarasinya tak pernah menang).**
  Bukti: `src/vendor/tailwindOfflineBundle.jsx` idx 495 `box-shadow: 0 2px 8px rgba(0,0,0,.06)` +
  `border-color: var(--line)` vs idx 794 `box-shadow: none !important` + `border: … !important`.
  Koreksi: status mati ini **pra-ada** (idx 794 pra-fix sudah `!important` untuk keduanya), bukan
  akibat T1. Tindak lanjut (bukan di T1): hapus idx 495 atau deklarasi shadow/border-color-nya pada
  task bersih-bersih, bila koordinator menghendaki.
- **M2 — Minor — E3 mempertahankan `!important` alih-alih membersihkan rantai M3.**
  Sah dan minimal-diff (alasan di §3.2/§3.3), tetapi meninggalkan pola yang dilawan Iron Law
  `ui-ux-fixer-and-improvement`. Alternatif bersih (hapus shadow hover idx 495 + lepas `!important`
  idx 794) dicatat sebagai kandidat task lain — jangan dilakukan sebagai fix loop T1.
- **M3 — Minor — Sitasi laporan §3 kurang presisi: `.ws-nav-item.on .ws-nav-ico` ada di DUA aturan (idx 694 dan 771), bukan satu.**
  Bukti: idx 694 `background: var(--acc)` (non-`!important`), idx 771 M3 `background: var(--acc-deep) !important`.
  Keduanya diverifikasi tak tersentuh, jadi klaim substansial laporan benar; hanya sitasinya ambigu.
  Tabel §1.2 laporan juga tidak mencantumkan idx 694. Nit dokumentasi.
- **M4 — Minor — Exit code proses probe RED tidak tercatat bersih** (laporan §7.5 mengakuinya; output
  di-pipe ke `tail`). Nilai FAIL-nya terkoroborasi dari `.bak-t1` (§3.4), jadi ini kelemahan bukti,
  bukan keraguan hasil. Untuk task berikutnya: catat exit code tanpa pipe.
- **M5 — Minor — Probe menyetel accent via seed localStorage, bukan klik UI Settings; dan A3 hanya
  mengukur satu tombol `.dk-b.on` pertama (`.fig-nav-dock .dk-b.on`).**
  Diterima untuk T1 (jalur prefs asli; idx 564 mencakup telanjang `.dk-b.on` sehingga semua tombol
  `.dk-b.on` tercakup kaskade yang sama). Bila suatu task kelak menguji tombol `.dk-b.on` di luar dock,
  perlu asersi eksplisit.

## 7. Cannot verify from diff (batas review ini)

1. **Hasil RED live** — tidak di-run ulang oleh reviewer (butuh revert kode; dilarang). Dikoroborasi
   deterministik dari `.bak-t1` + definisi token `--m3-shadow-xs` (§3.4), tetapi bukan bukti run.
2. **Perilaku di luar Chromium headless 1255 / viewport 1440×900** — probe hanya di lingkungan itu;
   tidak ada pengujian browser lain atau viewport lain. Aturan yang diubah tidak bergantung viewport.
3. **Jalur klik Settings UI untuk mengganti accent** — probe memakai seed localStorage; klik UI tidak
   diuji (di luar scope T1).
4. **Efek visual radius 0px pada mata pengguna** — screenshot full-page tidak memperlihatkan perbedaan
   14px→0px secara kentara (diakui laporan); penilaian bertumpu pada computed style, yang sudah benar.

## 8. Keputusan

**APPROVED.** Spec brief terpenuhi (butir 1 laten + butir 2 efektif), diff minimal tepat 3 aturan,
larangan sentuh dipatuhi, `!important` tidak bertambah, GREEN + regresi direproduksi segar oleh
reviewer (probe 7/7 exit 0; `npm test` 275/275; `npm run build:web` exit 0; hover + dark theme
terukur). Tidak ada temuan Critical/Important. Kelima Minor di §6 dicatat untuk backlog, bukan
fix loop. Satu pesan untuk koordinator: jangan presentasikan T1 sebagai perbaikan visual "tombol
aktif gelap" — yang berubah secara tampak hanyalah radius + shadow grup; E1 adalah perbaikan laten
(lihat §3.1).
