# Design: Continuous Flow Motion Background — Tentang Aplikasi

- **Tanggal:** 2026-11-18
- **Skala:** Perubahan kecil terfokus (`AboutVectorHeroBg.tsx` + `tests/about-hero-live-bg.spec.ts`)
- **Pendekatan dipilih:** 1 — Aliran Berkelanjutan (*Continuous Flow*)

## 1. Tujuan & Alasan
Membuat animasi latar belakang kartu **Tentang Aplikasi** di Pengaturan bergerak mengalir terus-menerus tanpa momen berhenti, fade-out kosong, atau *repeatDelay* di antara siklus, sehingga terasa hidup dan mulus saat pengguna membuka tab Pengaturan.

## 2. Ruang Lingkup (Goals / Non-Goals / Anti-Goals)
- **Goals:**
  - Kurva Bézier & ujung pena meluncur terus-menerus tanpa henti (`repeat: -1`, `repeatDelay: 0`, `ease: 'none'`) di sepanjang lintasan kurva Bézier tertutup C¹ yang halus di sisi kanan kartu.
  - Ekor garis (*glowing ribbon* + halo) mengalir mengikuti ujung pena secara kontinu menggunakan `strokeDasharray` + `strokeDashoffset` dengan *wrap-around* mulus (tanpa lompatan di titik sambungan `0 ↔ 1`).
  - Seluruh anchor node & handle tangen tetap tampil kontinu dengan denyut/ayunan halus yang sinkron dengan posisi pena, seiring animasi ambient kompas, heksagon, prisma, dan bounding box.
  - Mode `Animasi Antarmuka: Mati` / `prefers-reduced-motion: reduce` tetap membeku rapi di pose showcase lengkap (`strokeDashoffset: 0`, semua node/handle/pena terlihat, interaksi kursor nonaktif), dan perpindahan tab Pengaturan tetap mem-pause/resume secara bersih.
- **Non-Goals:**
  - Tidak mengubah tata letak logo, badge versi `v1.0`, scrim keterbacaan, warna aksen `--acc`, tema gelap/terang, atau perilaku cursor parallax/smart guides/magnetic node.
- **Anti-Goals:**
  - Tidak boleh ada jeda diam, kedipan (*flicker*), atau lompatan posisi ujung pena saat siklus berulang.
  - Tidak boleh menimbulkan kebocoran timer/tween GSAP atau console error saat modal dibuka/tutup berulang.

## 3. Pendekatan yang Dipertimbangkan
1. **Aliran Berkelanjutan / *Continuous Flow* (Dipilih):** Mengubah `HERO_BEZIER_D` menjadi lintasan Bézier tertutup C¹ mulus dengan ekor garis mengalir mengikuti ujung pena tanpa jeda maupun fade-out, sementara node berdenyut saat dilewati pena dan handle tangen berayun kontinu. Memberikan gerak 100% tanpa titik berhenti.
2. **Bolak-Balik Halus (*Yo-Yo*):** Mempertahankan garis terbuka saat ini dan membalik arah pena kiri ↔ kanan. Lebih minimal, tetapi tetap ada pelambatan saat berbalik arah di kedua ujung.

## 4. Detail Teknis Ringkas
- **`HERO_BEZIER_D` & `ANCHOR_NODES`:** 4 titik knot tertutup C¹ halus di area kanan (`312..626`, `38..142`), dua handle tangen pada knot atas `(424, 38)` dan bawah `(514, 142)`.
- **Playback running:** Tween linear `drawState.progress` (`0 → 1`, `duration: 7.2`, `ease: 'none'`, `repeat: -1`), `strokeDasharray = "${tailLen} ${totalLen - tailLen}"` (`tailLen ≈ 0.54 * totalLen`), `strokeDashoffset = tailLen - dist`, kemiringan pena menggunakan *wrap-around* `getPointAtLength` agar sambungan `0 ↔ 1` 100% mulus. Node berdenyut lembut saat pena melintas dekat knot; handle tangen berayun `sine.inOut` permanen.
- **Playback reduced:** `strokeDasharray = totalLen`, `strokeDashoffset = 0`, pena berhenti di pose showcase (`SHOWCASE_TIME`), semua elemen statis dan tidak bereaksi terhadap pointer.
- **Verifikasi Playwright:** Memastikan animasi tidak pernah berhenti di sepanjang rentang waktu penuh (melewati batas siklus `> 7,5 dtk` maupun sampel berturut-turut), tidak pernah fade-out ke `opacity: 0`, dan tetap lulus seluruh tes lama (`Task 1`, `Task 2`, `Task 3a/3b/3c`).
