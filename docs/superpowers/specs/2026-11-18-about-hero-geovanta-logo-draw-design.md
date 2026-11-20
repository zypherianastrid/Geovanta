# Design: Animated Geovanta Logo Drawing (Exact `LOGO_INNER` Replacement) — Tentang Aplikasi

- **Tanggal:** 2026-11-18
- **Skala:** Perubahan menengah terfokus (`AboutVectorHeroBg.tsx`, `SettingsModal.tsx`, `tests/about-hero-live-bg.spec.ts`)
- **Pendekatan dipilih:** 1 — Gambar Progresif per Huruf + Fill Menyala Kontinu (menggantikan logo flat)

## 1. Tujuan & Alasan
Mengganti animasi kurva Bézier generik dan logo Geovanta statis (flat) di kartu **Tentang Aplikasi** (Pengaturan) dengan animasi penggambaran **logo Geovanta yang 100% identik dengan logo asli** (`LOGO_INNER`), lengkap dengan 3 titik node kotak pada huruf **G** besar serta lubang huruf **e, o, a**, bergerak terus-menerus tanpa henti.

## 2. Ruang Lingkup (Goals / Non-Goals / Anti-Goals)
- **Goals:**
  - Memakai **16 subpath asli** dari `LOGO_INNER` (`src/constants/brandAndIcons.tsx`) yang dikelompokkan persis menjadi 8 huruf berurutan:
    - **G** (5 subpath: kontur utama + **3 lubang node kotak** di atas, kiri, bawah + celah kecil atas, `fill-rule="evenodd"`)
    - **e** (2 subpath: luar + lubang dalam)
    - **o** (2 subpath: luar + lubang dalam)
    - **v** (1 subpath)
    - **a₁** (2 subpath: luar + lubang dalam)
    - **n** (1 subpath)
    - **t** (1 subpath)
    - **a₂** (2 subpath: luar + lubang dalam)
  - Menghapus logo Geovanta statis/flat di `SettingsModal.tsx` (`.stg-about-logo`) dan menggantikannya langsung dengan komponen logo animasi (di atas `.stg-about-scrim`, `z-index: 2`) sehingga warna `--acc` tajam 100% tanpa pudar, tetap mempertahankan `role="img" aria-label="Geovanta"` dan badge `v1.0` rapi di bawahnya.
  - **Aliran progresif terus-menerus (`repeat: -1`, `repeatDelay: 0`, nol fase diam):**
    - Blueprint wireframe tipis semua 16 subpath selalu tampak lembut sehingga bentuk "Geovanta" tidak pernah menghilang kosong.
    - Ujung pena (`about-pen-nib`) + garis stroke bercahaya menggambar kontur asli **G** (termasuk 3 node kotak) → **e → o → v → a → n → t → a** secara berurutan dengan kecepatan seragam (proporsional terhadap panjang path asli tiap huruf).
    - Begitu tiap huruf selesai digambar, **fill asli `fill-rule="evenodd"`** huruf tersebut menyala penuh secara halus.
    - Setelah huruf **a** terakhir terisi, ujung pena langsung meluncur halus kembali ke awal **G** sambil sapuan lembut mengembalikan fill ke tint wireframe tipis, lalu seketika mulai menggambar **G** lagi tanpa berhenti sedetik pun.
    - Menambahkan titik anchor highlight & handle tangen pada titik-titik kunci huruf **G** dan kurva logo.
  - `AboutVectorHeroBg` di belakang `.stg-about-scrim` tetap menampilkan grid presisi, kompas berputar, heksagon, prisma, mini bounding box, dan smart guides/parallax kursor (tanpa kurva Bézier generik yang bersaing dengan logo).
  - Mode **Animasi Antarmuka: Mati** / `prefers-reduced-motion: reduce` membeku dengan seluruh 8 huruf Geovanta terisi 100% solid (identik pixel-for-pixel dengan logo flat sebelumnya).
- **Non-Goals:**
  - Tidak mengubah logo Geovanta di halaman Workspace (`WorkspaceHome.tsx`) atau ikon lain di `brandAndIcons.tsx`.
  - Tidak mengubah badge versi `v1.0`, tata letak tab Pengaturan lain, atau mekanisme tema/aksen.
- **Anti-Goals:**
  - Geometri huruf **G** (termasuk 3 lubang node kotaknya) atau huruf `eovanta` menyimpang sedikit pun dari `LOGO_INNER`.
  - Logo flat lama masih tertinggal/dobel atau logo animasi tertutup/memudar oleh `.stg-about-scrim`.
  - Ada jeda diam atau frame kosong saat loop berulang.

## 3. Pendekatan yang Dipertimbangkan
1. **Gambar Progresif per Huruf + Fill Menyala Kontinu di Foreground `.stg-about-top` (Dipilih):** Mengurai langsung `LOGO_INNER` menjadi 8 grup huruf presisi (`fill-rule="evenodd"`), mengganti logo flat di `z-index: 2` agar kontras 100% tajam di atas scrim, sementara elemen ambient drafting tetap di `z-index: 0`.
2. **Logo Terisi Permanen + Pena Menelusuri Outline:** Selalu terisi penuh; efek "sedang menggambar logo" kurang terasa dibanding Opsi 1.

## 4. Verifikasi
- Playwright Regular (`tests/about-hero-live-bg.spec.ts`): verifikasi tepat 1 logo `svg[aria-label="Geovanta"]` (logo flat lama terhapus), seluruh 16 subpath asli `LOGO_INNER` hadir termasuk 3 node kotak pada **G** dengan `fill-rule="evenodd"`, gerak kontinu melintasi siklus penuh tanpa berhenti, mode `reduced` menampilkan seluruh huruf terisi penuh, pause/resume tab bersih, dan `tsc --noEmit` 0 error.
- Playwright MCP: tangkapan layar visual untuk memastikan huruf **G** (beserta 3 titik node kotaknya) dan seluruh **Geovanta** tampil 100% identik dengan logo asli.
