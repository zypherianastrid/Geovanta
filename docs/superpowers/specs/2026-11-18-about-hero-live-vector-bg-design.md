# Design: Live Vector Background untuk Kartu "Tentang Aplikasi" di Pengaturan

**Tanggal:** 2026-11-18  
**Ruang Lingkup:** Perubahan kecil & terfokus (redesign latar belakang `.stg-about-hero` di `SettingsModal.tsx`)  
**Status:** Menunggu persetujuan pengguna

---

## 1. Tujuan & Alasan (Intent & Why)

Latar belakang kartu **Tentang Aplikasi** (`.stg-about-hero`) di modal **Pengaturan** saat ini hanya menampilkan gradasi radial statis dan pola grid kotak 24px, sehingga belum menonjolkan karakter Geovanta sebagai *precision vector editor*.

Redesign ini menggantinya dengan **live vector background** bertema **geometri, shape, pen tool, kurva Bézier, anchor node, tangent handle, dan garis bantu (*drafting/smart guides*)** agar setiap kali pengguna membuka Pengaturan — termasuk saat mencoba Tema Terang/Gelap atau menggeser Warna Aksen — kartu identitas Geovanta terasa hidup seperti studio vektor presisi.

---

## 2. Goals, Non-Goals, & Anti-Goals

### Goals
- Menampilkan animasi vektor presisi bertema **geometri, shape, pen tool, kurva Bézier, node, handle, dan bounding box** di belakang logo Geovanta, badge versi, dan 3 pill fitur.
- Mode **Ambient + Interaksi Kursor Halus**: animasi utama berjalan lembut secara otomatis, ditambah respons kursor ringan (paralaks kedalaman, *smart guide* / crosshair halus, dan tarikan magnetis lembut pada *node* di dekat kursor).
- **Sinkron real-time** dengan Tema (Terang/Gelap) dan Warna Aksen (`--acc`), termasuk saat *live preview* color picker digeser di modal yang sama.
- **Hormat terhadap `Animasi Antarmuka` (`data-motion="off"` / `prefers-reduced-motion`)**: saat animasi mati, seluruh gerak berhenti rapi pada *frame* komposisi vektor terbaik (tetap terlihat tajam dan artistik, bukan kosong).
- Keterbacaan & kontras logo Geovanta, badge versi, dan 3 pill tetap terjaga di semua pilihan warna aksen dan tema.

### Non-Goals
- Tidak mengubah struktur konten utama kartu (logo Geovanta, badge versi, dan 3 pill tetap dipertahankan).
- Tidak mengubah tab lain di modal Pengaturan atau membuat mini-editor yang bisa mengedit/mengekspor objek.
- Tidak menambah dependensi CDN/jaringan (tetap 100% offline bundle).

### Anti-Goals (Kegagalan meski secara teknis berjalan)
- Latar terlalu ramai atau terlalu kontras di area kiri sehingga mengganggu keterbacaan logo Geovanta atau pill fitur.
- Animasi terus memakan CPU/GPU saat modal Pengaturan ditutup, saat tab Pengaturan pindah ke tab **Pintasan** (`sTab === 'keys'`), atau saat `data-motion="off"`.
- Perubahan Warna Aksen *live* tidak langsung tercermin pada warna elemen latar belakang.

---

## 3. Batasan Teknis (Constraints)

- **100% Offline Bundle (`esbuild` -> `geovanta.bundle.js`):** Dependensi baru (`gsap`) harus di-install di `package.json` dan dibundel lokal tanpa fetch eksternal.
- **CSP (`index.html`):** `style-src 'self' 'unsafe-inline'`, tidak ada script/font/gambar eksternal.
- **Styling System:** Gaya `.stg-about-hero` didefinisikan di `TAILWIND_PLUGIN_AST` (`src/vendor/tailwindOfflineBundle.tsx`) dan memakai CSS variables (`--acc`, `--card`, `--line`, `--ink`, `--mut`).
- **Aksesibilitas Motion:** `themeAndPrefsManager.tsx` mengatur `html[data-motion="off"]` ketika preferensi `motion === 'off'` atau OS `prefers-reduced-motion: reduce`. Komponen wajib mengamati perubahan atribut `data-motion` (dan `prefs.motion`) secara dinamis.

---

## 4. Pendekatan yang Dipertimbangkan (Approaches)

| Opsi | Pendekatan | Trade-off |
|---|---|---|
| **1 (Dipilih)** | **GSAP (`gsap`) + Layered Precision SVG** | Koreografi berurutan Pen Tool → kurva Bézier → anchor/handle → bounding box sangat presisi lewat `gsap.timeline()`, respons kursor halus lewat `gsap.quickTo()`, warna otomatis sinkron *live* via CSS variables SVG, dan pause di *frame* terbaik saat `data-motion="off"`. Menambah 1 dependensi ringan (`gsap`) dengan cleanup imperatif via `gsap.context()`. |
| 2 | Motion (`motion/react`) + Layered Precision SVG | Deklaratif & fisika spring bagus, tetapi ukuran bundle lebih besar dan sinkronisasi presisi ujung Pen Tool mengikuti ujung kurva Bézier yang sedang digambar lebih kompleks. |
| 3 | Native HTML5 Canvas 2D (tanpa library) | Nol dependensi, tetapi kode gambar & easing manual jauh lebih banyak dan perlu observer tambahan agar *live preview* CSS variable `--acc` ikut ter-render ulang ke canvas. |

**Keputusan:** **Opsi 1 (`gsap` + Layered Precision SVG)** dipilih karena paling cocok untuk koreografi vektor presisi, ketajaman *geometricPrecision* di semua DPI, sinkronisasi warna aksen tanpa overhead, dan bundle offline yang ramping.

---

## 5. Keputusan Desain (Decided)

### Komposisi & Ruang Kartu
- Tinggi minimum kartu `.stg-about-hero` dibuat sedikit lebih lega (~156–170px, `min-height: 162px`) agar panggung vektor punya ruang bernapas tanpa membebani scroll modal.
- **Zona Keterbacaan:** Sisi kiri (area logo Geovanta) memakai *scrim* / gradien halus menuju `--card` sehingga logo dan pill selalu kontras di mode Terang maupun Gelap. Aksi utama Pen Tool, kurva Bézier, dan geometri difokuskan di sisi tengah-kanan hingga kanan kartu.

### Lapisan Visual SVG (`<AboutVectorHeroBg />`)
Komponen terpisah (`src/components/modals/AboutVectorHeroBg.tsx`) dengan `aria-hidden="true"` dan `pointer-events: none` di dalam `.stg-about-hero` (`z-index: 0`, sementara `.stg-about-top` dan `.stg-about-badges` di `z-index: 2`):
1. **Layer 1 — Ambient Glow & Drafting Grid:** Gradien atmosfer lembut berbasis `var(--acc)` + grid presisi + tanda `+` (*registration crosshairs*) halus di persimpangan utama.
2. **Layer 2 — Geometric Primitives & Bounding Box:** Bentuk geometri vektor *wireframe* (poligon/heksagon, lingkaran konstruksi bertitik-titik, kotak seleksi mini dengan 4 *corner handle* kecil & indikator rotasi) yang mengambang/berotasi sangat pelan di kedalaman latar.
3. **Layer 3 — Hero Bézier & Pen Tool Choreography (`gsap.timeline`):**
   - Kurva Bézier elegan di sisi kanan digambar mulus (`strokeDashoffset`) mengikuti gerakan **ikon nib Pen Tool** yang meluncur tepat di ujung lintasan.
   - Saat melewati titik kontrol, **anchor nodes** (kotak/lingkaran kecil berkontur `--acc` dan isi `--card`) muncul berurutan, diikuti **tangent handles** (garis tipis + bulatan ujung handle) yang memanjang dan mengayun halus memperlihatkan fleksibilitas kurva.
   - Sebuah *selection highlight* / *dimension tick* singkat menegaskan kurva sebelum bertransisi mulus mengulang siklus berikutnya.
4. **Layer 4 — Subtle Cursor Feedback (`gsap.quickTo`):**
   - Saat pointer melintas di atas `.stg-about-hero` (dan motion aktif):
     - Layer geometri & layer Bézier bergeser paralaks halus pada kedalaman berbeda (maks ±6–10px).
     - Garis *smart guide* / crosshair vektor super tipis (`opacity` rendah) mengikuti kursor secara halus di dalam area kartu, dan *node* dekoratif terdekat merespons dengan tarikan/glow ringan.
   - Saat pointer keluar dari kartu, semua offset kembali lembut ke posisi netral dan *smart guide* memudar hilang.

### Siklus Hidup & Motion Policy
- Animasi hanya berjalan ketika `open === true`, tab aktif adalah `'umum'` (`active`), halaman visible (`document.visibilityState === 'visible'`), dan `data-motion !== 'off'`.
- Saat `data-motion="off"` (baik dari toggle Pengaturan maupun OS `prefers-reduced-motion`): timeline GSAP langsung di-`pause()` pada posisi komposisi puncak (kurva utuh, node & handle terlihat jelas, nib pen terparkir rapi) dan interaksi paralaks/guide dinonaktifkan.
- Cleanup penuh menggunakan `gsap.context().revert()` pada unmount.

---

## 6. Diserahkan ke Implementer (Left to the Builder)

- Koordinat presisi `viewBox` SVG, jalur kurva Bézier spesifik, dan titik *keyframe* nib Pen Tool agar ujung pena selalu menempel akurat di ujung kurva yang digambar.
- Penyetelan *easing*, durasi siklus (~7–9 detik agar terasa tenang dan mewah), serta *opacity* tiap layer agar seimbang antara mode Terang dan Gelap.
- Detail atribut `data-testid` untuk pengujian otomatis Playwright (`@playwright/test`).
