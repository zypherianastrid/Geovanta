# Design — Perapian Sidebar Kanan + Context Menu Geovanta

**Tanggal:** 2026-11-14. **Working copy:** `~/workspace/geovanta-blank-font-bug/Geovanta Bug Blank Font/`
**Status:** DRAFT — menunggu builder check + persetujuan user (pilihan A untuk item 6 sudah diputuskan user 2026-11-14 15:18 WIB).
**Asal:** permintaan user 6 butir (screenshot context menu + instruksi teks), didahului recon kode + screenshot inspector asli oleh controller.

## 1. Intent (maksud + kenapa)

User merapikan editor: (1) corner radius TIDAK BERFUNGSI pada shape bintang
(star5/star4/star6) — harusnya bisa; lingkaran/ellipse tetap tidak bisa
(diterima user, bukan bug); (2) context menu terlalu penuh — 9 item yang
punya jalur normal di tempat lain harus keluar dari menu; (3–5) sidebar kanan punya tombol tanpa ikon, label "…" yang tidak
perlu, dan ruang kosong yang tidak terisi; (6) pengaturan Find & Replace Color
dan Recolor tidak lagi pantas jadi modal popup — keduanya dipakai berulang dari
sidebar, jadi harus tinggal di sidebar kanan sebagai seksi yang bisa dibuka-tutup.

## 2. Goals / Non-goals / Anti-goals

**Goals:**
- G1. Radius BERFUNGSI pada shape bintang (star5/star4/star6): sudut-sudutnya
  membulat secara terlihat pada radius wajar; field menampilkan nilai efektif.
  Lingkaran/ellipse tetap tidak bisa di-radius (diterima, bukan bug).
  Radius yang melebihi panjang sudut tetap dijepit (clamp) ke maksimum yang
  muat, bukan ditolak — tapi itu SEKUNDER, bukan tujuan utama.
- G2. 9 item keluar dari context menu; setiap fungsi yang dihapus dari menu
  tetap bisa dijangkau dari jalur normalnya (lihat §5 — kecuali Select Same,
  lihat Keputusan Terbuka D1).
- G3. Ketiga tombol Color Styles berikon; label "…" hilang.
- G4. Tidak ada lagi ruang kosong di bawah grid titik poros 9 titik.
- G5. Tombol Find & Replace + Recolor di Selection Colors berikon, mengisi
  lebar baris, dan tidak terpotong (flex-wrap bila perlu).
- G6. Find & Replace Color dan Recolor menjadi seksi collapsible di sidebar
  kanan tepat di bawah "Selection colors" (Pilihan A, diputuskan user),
  dibuka oleh tombol yang sama; modal dihapus total; perilaku
  preview/commit tidak berubah.

**Non-goals:**
- N1. Tidak ada perubahan pada algoritma geometri fillet/chamfer/squircle —
  hanya perilaku tolak → clamp.
- N2. Tidak ada perubahan pada engine/mesin Find & Replace, Recolor, Select
  Same, Boolean, Outline Stroke, Offset Path — hanya jalur UI-nya.
- N3. Tidak ada perubahan pada modal lain (Settings tetap modal).
- N4. Tidak ada perubahan perilaku di luar 6 butir (tidak ada scope baru).

**Anti-goals (yang membuat ini gagal walau teknisnya jalan):**
- A1. Menghapus fungsi dari aplikasi (bukan hanya dari menu) tanpa disadari
  — khususnya Select Same (lihat D1).
- A2. Panel sidebar yang menggantikan modal tapi kehilangan preview/commit
  atau merusak alur kerja yang sudah teruji (probe colorfx 157 skenario).
- A3. Ikon yang tidak terbaca / tombol yang terpotong / baris yang meluber
  — ini pekerjaan kerapian, hasil akhirnya harus terlihat rapi di screenshot.

## 3. Constraints (batas yang mengikat)

- C1. Kontrak programmer profesional (`~/AGENTS.md`): verifikasi nyata
  terhadap file asli, backup `.bak` sebelum edit destruktif, jujur soal yang
  belum terverifikasi, ikuti spesifikasi apa adanya.
- C2. Skill Superpowers wajib: `systematic-debugging` (bug/limitasi),
  `test-driven-development`, `verification-before-completion`; eksekusi
  subagent-driven dengan review per task.
- C3. Iron Law UI/UX: TANPA `!important` baru, offset piksel hardcoded,
  z-index arbitrer, kliping buta; TANPA klaim selesai tanpa tes + verifikasi
  visual (screenshot sebelum/sesudah dilihat langsung).
- C4. Baseline: `npm test` 269/269, build exit 0 / 0 warning, regresi
  T1–T14 402/403 (hanya T10 b3, batasan headless), colorfx 157/157, smoke
  ZIP 6/6. Semua harus tetap hijau sesudah pekerjaan ini (dengan penyesuaian
  probe yang dipaksakan perubahan perilaku — dicatat eksplisit per task).
- C5. Ikon harus dari set ikon yang sudah ada di codebase (`Vi`/`Ico`/path
  SVG inline yang sudah dipakai) — tidak ada font ikon / dependensi baru.
- C6. Bahasa UI tetap dua bahasa (ID/EN) — label baru/berubah masuk
  `src/constants/appI18n.jsx` kedua bahasa.
- C7. Desktop saja (≥1280) — keputusan user 2026-11-14 04:57 WIB, masih
  berlaku; tidak ada pekerjaan responsif di sini.

## 4. Keadaan saat ini (hasil recon — terbukti, bukan dugaan)

- **Corner radius:** `applyRadiusToCorners` (`src/components/editor/VectorEditor.jsx`
  ~8140–8177) memanggil `VE.setSelectedNodesRadius(o, nids, rad, {mode, bevelDeg,
  smooth})` di dalam `commitObjs`; bila `!ch && rad > 0` → toast 'Sudut tidak
  cukup panjang untuk radius tersebut' dan tidak ada yang diterapkan.
- **Context menu:** `ctxItems` (`VectorEditor.jsx:7701`). Sembilan item yang
  dihapus: `sel-same-fill` / `sel-same-stroke` / `sel-same-type` ("Pilih yang
  Sama — Fill/Stroke/Tipe", `selectSameCriterion('fill'|'stroke'|'type')`) dan
  item Boolean `union`/`subtract`/`intersect`/`exclude` + `outline` (Outline
  Stroke) + `offset` (Offset Path...). Jalur normal yang tersisa (terverifikasi
  dari kode): Boolean + Outline Stroke + Offset Path ADA di floating toolbar
  (`EditorFloatingToolbar.jsx:93` `BOOL_ITEMS` + dropdown Boolean,
  shortcut Ctrl+Alt+U/S/I/X/O; Offset membuka `EditorOffsetStrip` floating
  strip). **Select Same TIDAK ADA jalur lain** — `selectSameCriterion` hanya
  dipanggil dari ketiga item context menu itu; tombol "◎" di baris Selection
  Colors hanya memilih objek dengan hex persis di baris itu (lebih sempit:
  tanpa kriteria "tipe", hanya warna yang ada di seleksi). Lihat D1.
- **Color Styles:** judul seksi + 3 pill (`EditorRightInspector.jsx:337`):
  "+ Buat style" (`veStyleCreate`), "Find & Replace…" (`fr-open-styles`),
  "Recolor…" (`rc-open-styles`). Label LITERALLY mengandung "…":
  `frOpenBtn: 'Find & Replace…'` / `rcOpenBtn: 'Recolor…'` (`appI18n.jsx:360,379`
  ID; `:803,822` EN) — bukan terpotong (terukur: `scrollW == clientW`,
  `overflow: visible`). Ketiganya `ved-pill--compact text-[10px]`,
  `whiteSpace: 'nowrap'`, satu baris horizontal.
- **Titik poros:** `<PinGrid>` (`.pin3`, `src/components/ui/PinGridSelector.jsx`)
  62×58px (padding 5px, gap 3px, tombol 14px) di baris flex bersama kolom
  kanan (Seg Pusat/Poros + tombol "Skala stroke", ~72px) — selisih ~14px ruang
  kosong di bawah grid. `PinGrid` hanya dipakai di inspector ini.
- **Selection Colors:** judul "Selection colors (N)" + hint "◎ = pilih" +
  2 pill teks (`fr-open-selcolors`, `rc-open-selcolors`) di `.fig-isec-title`
  (flex + wrap) — keduanya ter-wrap ke baris sendiri dengan celah besar di
  tengah (terlihat di screenshot recon). Label sama dengan butir 3.
- **F&R + Recolor saat ini:** modal penuh `src/components/modals/FindReplaceColorModal.jsx`
  (263 baris; state `from`/`to`/`scope`/`replaced`/`total`/`error`/`previewAll`)
  dan `RecolorModal.jsx` (266 baris; state `mode`/`deltaHue`/`satMul`/`lightMul`/
  `hueMin`/`hueMax`/`scope`/`familyTargets`/`overrides`/`overrideFor`/`families`/
  `changed`); dibuka dari `VectorEditor.jsx` (`frOpen`/`rcOpen` + render
  `<FindReplaceColorModal>` / `<RecolorModal>` dengan props `doc`/`selIds`/
  `onPreviewDoc`/`onCommitPreview`/`say`/`L`/`onRecentColor`); memakai hook
  focus trap T9 (`src/utils/modalFocus.jsx`). Tombol pembuka ada di 2 tempat:
  seksi Color Styles dan seksi Selection Colors (keduanya memanggil
  `onOpenFindReplace` / `onOpenRecolor`).

## 5. Pendekatan (yang dipertimbangkan)

### Item 6 — panel sidebar (diputuskan user: A)
- **A — Seksi collapsible tepat di bawah "Selection colors" (DIPILIH USER).**
  Masing-masing tombol membuka/menutup seksinya sendiri (toggle independen,
  keduanya boleh terbuka bersamaan); modal dihapus total. Trade-off: konten
  modal yang padat (Recolor punya banyak kontrol) membuat inspector makin
  panjang — diterima, karena inspector memang bisa di-scroll.
- **B — Panel terpisah yang menggantikan isi inspector saat dibuka.**
  Ditolak user (tidak dipilih). Trade-off: butuh state "tampilan inspector"
  baru + tombol kembali; lebih berat, dan menyembunyikan konteks seleksi.
- Alternatif yang tidak dipertimbangkan: tetap modal tapi di-dock (user
  minta eksplisit "bukan jadi modal popup").

### Item 1 — radius tidak jalan pada bintang (KOREKSI user 2026-11-14 15:39 WIB)
- **Bug utama: radius tidak berfungsi SAMA SEKALI pada bintang.**
  Gejala kemungkinan: toast 'Sudut tidak cukup panjang untuk radius tersebut'
  atau 'Tidak ada sudut (node corner) yang bisa dibulatkan', atau tidak ada
  perubahan sama sekali. Akar masalah dicari lewat reproduksi di browser
  (diduga rantai deteksi `type === 'corner'` di `detectedCorners` /
  `setCornerRadius` — BELUM terbukti).
- **Lingkaran/ellipse tetap tidak bisa — dan itu BENAR.** Bukan bug, jangan
  dipaksakan.
- **Clamp (SEKUNDER):** radius yang melebihi panjang sudut dijepit ke
  maksimum yang muat (engine sudah menjepit `d` — cap 0.49/0.92 Tahap B,
  0.45 `filletGeo`), bukan ditolak. Clamp dipertahankan hanya bila bagian
  dari perbaikan bintang atau tidak berbahaya.

### Item 4 — ruang kosong di bawah grid poros
- **Rentangkan grid setinggi baris (dipakai).** Titik-titik membesar/meregang
  mengikuti tinggi kolom kanan (Seg + "Skala stroke") sehingga tidak ada
  ruang kosong di bawah grid. Trade-off: titik menjadi lebih besar dari
  14px — masih dalam batas wajar untuk target sentuh.
- Alternatif yang tidak dipakai: pusatkan grid secara vertikal (ruang kosong
  terdistribusi, bukan terisi — user minta "isi"); tambahkan kontrol baru di
  ruang itu (menambah scope tanpa diminta).

### Item 3 + 5 — ikon + label
- Ikon dari set yang sudah ada (C5); label "…" dihapus dari `frOpenBtn` /
  `rcOpenBtn` (ID + EN) — satu perubahan label memperbaiki kedua seksi
  sekaligus karena labelnya sama. Tombol Selection Colors mengisi lebar
  baris (`flex: 1` masing-masing) + flex-wrap bila perlu.

## 6. Yang diputuskan user (sudah final)

- Item 6 = Pendekatan A (seksi collapsible di bawah "Selection colors",
  toggle independen, modal dihapus total).
- Keenam butir dikerjakan sebagai satu paket, satu ZIP (mengikuti pola
  colorfx — satu plan besar, satu ZIP).

## 7. Yang diserahkan ke builder (detail implementasi bebas builder)

- Cara clamp dihitung di engine (`setSelectedNodesRadius` vs
  `applyRadiusToCorners` — pilih yang paling tepat; satu sumber kebenaran),
  dan cara field menampilkan nilai efektif sesudah apply.
- Ikon persis yang dipakai untuk "+ Buat style", "Find & Replace", "Recolor"
  (dari set yang sudah ada; harus terbaca di 10px + screenshot).
- Cara grid poros direntangkan (CSS `.pin3` vs varian khusus Transform —
  periksa pemakaian `.pin3` lain sebelum mengubah aturan global).
- Struktur seksi sidebar F&R/Recolor: komponen baru vs konten modal
  dipindah langsung ke inspector; di mana state buka/tutup tinggal
  (inspector lokal vs VectorEditor); perilaku Esc (tutup seksi vs batalkan
  seleksi — rekonsiliasi dengan handler Esc editor yang sudah ada);
  penyesuaian probe T9 (focus trap modal F&R/Recolor tidak lagi ada), T12
  (empty state Recolor pindah ikut seksi), T13 (urutan footer F&R
  [Tutup | Ganti Semua | Ganti] pindah ikut seksi) — daftarkan penyesuaian
  probe yang dipaksakan perubahan ini secara eksplisit per task, seperti
  preseden accent-fix/accent-exact.
- Urutan task + pembagian ZIP final (satu ZIP, menggantikan SHA `ba646282…`).

## 8. Keputusan terbuka (hanya user yang bisa menjawab)

- **D1 — Select Same tidak punya jalur lain.** Menghapus 3 item "Pilih yang
  Sama" dari context menu akan MENGHAPUS fungsi itu dari aplikasi (bukan
  hanya dari menu), karena `selectSameCriterion` hanya dipanggil dari sana
  — bertentangan dengan instruksi user "fungsi normal nya tetap ada".
  Pilihan:
  - **D1-A:** Hapus ke-9 item; Select Same Fill/Stroke/Tipe hilang total
    (hanya tersisa tombol "◎" per baris warna di Selection Colors, yang
    lebih sempit).
  - **D1-B (rekomendasi controller):** Hapus 6 item Boolean/Outline/Offset;
    pindahkan Select Same Fill/Stroke/Tipe ke seksi Selection Colors sebagai
    3 tombol kecil (rumah baru — fungsi tetap ada, menu tetap ramping).
  - **D1-C:** Hapus 6 item; biarkan 3 item Select Same tetap di context menu.
  Keputusan ini mengubah apa yang dibangun — harus dijawab sebelum plan.
  **Status: DIPUTUSKAN user 2026-11-14 15:24 WIB — D1-B (ikut rekomendasi
  controller). Design doc FINAL + DISETUJUI.**

## 9. Klarifikasi dari builder check (keputusan controller, tercatat di doc)

- **Clamp per-sudut vs seragam (butir 1):** rumus doc adalah per-sudut
  ("maksimum yang muat di sudut itu"), dan field `curR`
  (`VectorEditor.jsx:8125`) SUDAH menampilkan rata-rata radius sudut yang
  dipilih — jadi "field menampilkan nilai efektif" tetap konsisten di bawah
  clamp per-sudut (field = rata-rata nilai efektif per sudut). Tidak ada
  konflik; builder mengikuti rumus doc + logika `curR` yang ada.
- **Seksi F&R/Recolor saat tidak ada seleksi (butir 6):** panel bisa dibuka
  dari tombol Color Styles tanpa seleksi (perilaku modal yang dipertahankan,
  G6) — seksi di-render unconditional (BUKAN di dalam kondisional
  `selectionColors.length > 0`), scope mengikuti default modal (document).
  Keputusan implementasi wajar, bukan pertanyaan untuk user.

## 9. Verifikasi yang diminta (untuk plan)

- Probe Playwright per butir (RED dulu, GREEN sesudah) + screenshot
  sebelum/sesudah dilihat langsung, termasuk: radius melebihi sudut →
  diterapkan pada maksimum + field menampilkan nilai efektif + tanpa toast
  penolakan; context menu tanpa 9 item (fungsi lain tetap ada) + jalur
  normal tiap fungsi teruji; 3 tombol Color Styles berikon + label tanpa
  "…" + tetap satu baris; grid poros tanpa ruang kosong di bawahnya;
  tombol Selection Colors berikon + mengisi baris + wrap bila perlu;
  seksi F&R/Recolor di bawah Selection Colors (bukan modal — tidak ada
  overlay/focus trap di DOM) + preview/commit tetap jalan + Esc menutup
  seksi.
- Regresi penuh: `npm test` 269/269, build 0/0, T1–T14, colorfx 157,
  accent-fix 30/30, accent-exact 46/46, smoke ZIP 6/6, 0 pageerror.
- ZIP final baru (rebuild dari nol, `cp` menembus symlink, verifikasi SHA +
  jumlah entri + 0 entri terlarang).
