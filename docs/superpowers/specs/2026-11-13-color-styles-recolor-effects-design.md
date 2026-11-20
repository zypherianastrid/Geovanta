# Design: Color Styles, Select Same + Find & Replace, Efek, dan Recolor (Hue-Family Remap)

**Tanggal:** 2026-11-13
**Status:** Disetujui user 2026-11-13 14:55 WIB ("Setuju, lanjut ke rencana") — lanjut ke plan implementasi
**Rencana:** `docs/superpowers/plans/2026-11-13-color-styles-recolor-effects.md`
**Rencana induk:** satu plan besar, satu ZIP (Pendekatan A, dipilih user 2026-11-13 14:33 WIB)
**Spike efek:** `probes/spike-effects/` + `probes/spike-effects.cjs` — hasil di §7, sudah dijalankan, bukan janji

---

## 1. Intent dan why

Geovanta bisa menggambar dan men-trace, tapi tidak bisa mengelola warna sebagai sistem.

- **Mengganti satu warna brand di seluruh dokumen mustahil.** Warna hidup sebagai hex lepas di tiap objek. Tidak ada swatch dokumen, tidak ada style yang terhubung.
- **Hasil trace dan impor berisi ratusan path** dengan warna yang sama tersebar. Tanpa Select Same dan Find & Replace warna dokumen, membersihkannya adalah pekerjaan manual per objek.
- **Efek tidak ada sama sekali.** Drop shadow, blur, dan background blur dipakai di hampir semua desain UI dan logo. Hari ini Geovanta tidak bisa membuatnya.
- **Recolor Artwork tidak ada.** Find & Replace biasa hanya mengganti satu warna persis ke satu warna lain. Kalau biru tua, biru muda, dan biru sedang diganti ke satu oranye yang sama, semua gradasi hilang dan gambar jadi rata. Yang dibutuhkan adalah pemetaan berbasis hue: gradasi dan kontras terjaga, hanya keluarga warnanya yang pindah.

Keempat area ini satu proyek karena saling mengunci: Recolor memakai color-walk dokumen dan model style; Select Same dan Find & Replace memakai kolektor warna yang sama; Efek memakai pola inspector/serializer yang sama. Satu regresi penuh menutup semuanya.

Sukses menurut user: keempat area bekerja di dokumen nyata (termasuk hasil trace ratusan path), dibuktikan screenshot per area bersama ZIP, dan delivery dihitung menunggu re-test user.

## 2. Goals

- **G1 — Color Styles / swatch dokumen:** pengguna bisa menyimpan warna sebagai style dokumen, menerapkannya ke fill/stroke objek, dan mengganti satu style mengubah SEMUA objek yang memakainya. Warna terbaru (recent colors) tercatat otomatis.
- **G2 — Select Same:** dari satu objek terpilih, pilih semua objek lain dengan fill yang sama, stroke yang sama, atau tipe yang sama. Tersedia di context menu.
- **G3 — Find & Replace warna:** ganti satu warna persis ke warna lain, di seluruh dokumen atau hanya di seleksi, dengan hitungan jumlah yang kena dan pratinjau langsung + Undo satu langkah. Memperluas seksi "Selection colors" yang sudah ada (bukan menduplikasi).
- **G4 — Efek:** drop shadow, layer blur, dan background blur per objek, bisa diedit di inspector, tampil live di kanvas, dan ikut tersimpan + terekspor.
- **G5 — Recolor (Hue-Family Remap):** dua mode. **Mode 1 Shift Hue** (otomatis): semua warna diubah ke HSL, hue digeser dari sumber ke target, saturation dan lightness tetap, sehingga gradasi terjaga; rentang hue sumber bisa dibatasi; slider hue + saturation + lightness. **Mode 2 Palette Mapping** (manual): semua warna unik dikelompokkan per keluarga hue, tiap kelompok punya kontrol "ganti ke warna dasar X", urutan terang-ke-gelap dipertahankan, hasil pemetaan bisa diedit satu per satu.
- **G6 — Bukti:** screenshot tiap area sebagai bukti bersama ZIP, seperti 6 tool sebelumnya.

## 3. Non-goals

- Inner shadow (Figma punya; user tidak minta) — bukan v1.
- Text shadow / efek khusus teks.
- Preset gallery / galeri style bawaan — v1 hanya style yang dibuat pengguna.
- Gradient mesh, pattern fill, atau mode blend baru.
- Mengubah tool lama, mengubah perilaku Selection Colors yang sudah ada di luar perluasan yang dirancang (§5).
- Dependensi baru — semua dibangun dari API yang sudah ada (§6).
- Mengubah format file di luar penambahan field yang dirancang (§5).

## 4. Anti-goals (yang membuat fitur ini gagal walau "berfungsi")

- Recolor yang meratakan gradasi (mengganti satu keluarga hue ke satu warna datar) — itu kegagalan definisi fitur ini.
- Find & Replace / Recolor yang menyentuh objek terkunci (konsisten dengan Selection Colors yang sudah melewati locked).
- Efek yang mengubah geometri objek (efek hanya rendering + ekspor filter; posisi/ukuran/node tidak berubah).
- Style atau efek yang hilang diam-diam saat save/load (harus round-trip, atau ada peringatan eksplisit).
- Recolor yang tidak memproses stop gradien (hasil setengah-setengah — user menyebut ini syarat eksplisit).
- Efek yang membuat dokumen lambat tanpa batas yang terukur (lihat §5, anggaran performa).

## 5. Desain (keputusan user + proposal yang bisa dikoreksi)

### 5.1 Color Styles (G1)

- **Model (proposal):** `doc.styles` — array `{ id, name, hex }` di tingkat dokumen. Objek menaut lewat `fillStyleId` / `strokeStyleId`; nilai hex yang ter-resolve tetap tersimpan di `o.fill` / `o.stroke` (jadi renderer dan serializer yang ada tidak perlu diubah untuk membaca warna). Mengganti satu style = tulis ulang `fill`/`stroke` semua objek yang menaut ke style itu (satu commit history). Melepas tautan (unlink) = objek menyimpan hex terakhir sebagai warna lepas.
- **Warna terbaru:** daftar recent colors (mis. 10 terakhir) dari warna yang dipakai lewat ColorField, disimpan di prefs (bukan di dokumen).
- **UI (proposal):** seksi "Color Styles" di inspector kanan (di atas Fill): daftar swatch dokumen + tombol buat style dari warna seleksi + recent colors. ColorField Fill/Stroke mendapat affordance "pakai style" (klik swatch = taut, bukan sekadar tempel hex). Nama style bisa diubah; menghapus style yang masih dipakai = objek-objek itu jadi warna lepas (hex terakhir) + pesan.
- **Round-trip:** serializer menulis `doc.styles` + `fillStyleId`/`strokeStyleId` per objek; parser membaca kembali dengan validasi ketat (pola cabang `gen` Task 5: id harus string, hex harus valid, tautan ke style yang tidak ada dibuang jadi warna lepas).

**Aturan tautan style (DIPUTUSKAN user 2026-11-13, menjawab builder check Q2/Q3):**
- Recolor (Mode 1 dan Mode 2) dan Find & Replace yang mengenai objek tertaut style akan **melepas tautan objek itu** (unlink, opsi B): objek menyimpan hex baru sebagai warna lepas; style-nya sendiri utuh dan objek lain yang menaut tidak berubah. Toast menyebut jumlah objek yang dilepas dari style. Alasan: menjaga janji cakupan (Recolor yang dibatasi ke seleksi tidak boleh bocor ke luar lewat style) dan menghindari jebakan kehilangan data (menulis hex tapi tautan tetap = edit style berikutnya menimpa hasil Recolor secara diam-diam, persis anti-goal §4).
- Edit langsung fill/stroke objek tertaut lewat ColorField biasa juga **unlink objek itu saja** (opsi A, perilaku Figma): hanya objek itu berubah, style utuh. Indikator tautan di inspector hilang sesudah edit.
- Mengubah style itu sendiri (lewat seksi Color Styles) tetap mengubah SEMUA objek yang menaut — itu definisi G1.

### 5.2 Select Same (G2)

- **Kriteria v1 (sesuai permintaan user):** Fill sama, Stroke sama, Tipe sama (path / text / image / frame).
- **Perilaku:** dari objek terpilih (bila banyak terpilih, pakai yang pertama sebagai acuan), seleksi baru = semua objek di dokumen yang cocok. Perbandingan warna: normalisasi hex (case-insensitive, lewat `cssToHex` yang sudah ada). Objek terkunci dan hidden: TIDAK ikut terseleksi (konsisten dengan pola seleksi yang ada — keputusan builder: verifikasi terhadap `selObjs`/pola seleksi saat menulis plan; bila pola yang ada berbeda, ikuti pola yang ada dan catat).
- **UI:** entri baru di context menu (`ctxItems`, `VectorEditor.jsx:7519`): "Select Same Fill", "Select Same Stroke", "Select Same Type". Tanpa shortcut v1 (menghindari tabrakan shortcut; shortcut bisa ditambah bila user minta).
- **Toast:** sebut jumlah yang terseleksi ("12 objek dipilih — fill sama").

### 5.3 Find & Replace warna (G3)

- **Memperluas yang sudah ada, bukan menduplikasi.** Hari ini ada `selectionColors` (`VectorEditor.jsx:1664`) + `replaceSelectionColor` (`:8011`) + seksi "Selection colors" di inspector (`EditorRightInspector.jsx:289-291`): mengumpulkan fill, stroke, dan stop gradien dari SELEKSI dan menggantinya satu per satu, dengan live preview (`livePaint`) + commit (`commitPaint`). Yang baru: **cakupan dokumen** (bukan hanya seleksi) + **panel khusus** dengan kolom From/To + jumlah kena + tombol Replace / Replace All + pemilih cakupan (Seleksi / Dokumen).
- **Cakupan warna:** fill, stroke, stop gradien (fillGrad dan strokeGrad), fill teks per objek, background frame. Objek di dalam group dan frame ikut (model dokumen datar: `doc.objects` satu list; group = field `group` — satu walk sudah mencakup semuanya; plan harus memverifikasi cakupan teks + background frame secara eksplisit).
- **Pencocokan:** persis per hex ternormalisasi (bukan toleransi) — ini Find & Replace biasa, dibedakan dari Recolor (§5.5).
- **Undo:** satu langkah (satu commit history untuk satu operasi Replace All), pratinjau langsung sebelum commit (pola `livePaint`/`commitPaint` yang sudah ada).

### 5.4 Efek (G4)

- **Model (proposal):** `o.effects` — array per objek, urutan menentukan urutan render:
  `{ type: 'dropShadow', dx, dy, blur, color, opacity }`,
  `{ type: 'layerBlur', radius }`,
  `{ type: 'backgroundBlur', radius }`.
  Banyak efek per objek diizinkan (Figma mengizinkan banyak shadow; v1: minimal satu per tipe, boleh lebih dari satu drop shadow — keputusan builder saat menulis plan, dengan alasan).
- **Render (TERBUKTI spike, §7):**
  - Drop shadow: `paint.setImageFilter(ImageFilter.MakeDropShadow(dx, dy, sigma, sigma, color, null))` pada paint objek — TERBUKTI (bayangan (83,83,83) di offset yang benar, objek tetap biru).
  - Background blur: `save()` → `clipRect(objectBounds)` → `saveLayer(null, bounds, MakeBlur)` → gambar objek → `restore()` → `restore()`. **Clip WAJIB** — tanpa clip, blur bocor ke seluruh kanvas (TERBUKTI: rasio kontras 0.497 = tidak ada efek lokal; dengan clip rasio 0.19, luar tetap tajam kontras 510).
  - Layer blur: **JANGAN** `paint.setImageFilter(MakeBlur)` langsung pada shape — TERBUKTI RUSAK di build ini (GPU maupun CPU): shape mengembang keras sebesar 3σ tanpa pelembutan (σ=6 → mengembang 18px tiap sisi; σ=20 → mengembang 60px). Resep yang TERBUKTI: render objek ke offscreen image dulu, lalu `drawImage` dengan paint ber-filter blur (TERBUKTI: gradien Gaussian halus, profil 255,0,0 → 121,0,134 → 0,0,255). Plan WAJIB memverifikasi resep ini di dalam renderer asli (bukan hanya spike) sebelum klaim selesai.
- **UI (proposal):** seksi "Effects" di inspector (di bawah Stroke, di atas Ekspor — mengikuti urutan Figma: Appearance → Fill → Stroke → Effects): daftar efek per objek + tambah/hapus + kontrol per tipe (offset/blur/warna/opacity untuk shadow; radius untuk blur) + toggle mata (nonaktifkan tanpa menghapus).
- **Ekspor + round-trip:** SVG export menulis `<filter>` defs (`feDropShadow` / `feGaussianBlur`, dan `feGaussianBlur` + `feComposite` untuk background blur — detailnya keputusan builder di plan, harus dibuktikan dengan file SVG hasil ekspor yang dibuka kembali). Parser membaca filter kembali; filter yang tidak dikenali dibuang dengan pesan (bukan diam-diam).
- **Anggaran performa (proposal, diukur di plan):** layer blur dan background blur dirender per objek lewat offscreen — plan harus mengukur dokumen 100+ objek berefek saat drag/zoom dan mencatat angkanya; bila di bawah target, batasi radius maksimum atau cache hasil blur per objek sampai objek berubah.

### 5.5 Recolor / Global Color Replace (G5)

- **Mesin (proposal):** modul engine murni baru `src/engine/recolorEngine.jsx` (pola `blobGenerator.jsx`/`shapeBuilder.jsx`: pure JS, bisa diuji via `loadSource` tanpa React): `collectDocumentColors(doc)` → daftar `{ hex, count, kinds: Set(fill|stroke|grad|text), ids, stopKeys }`; `hueFamilyGroup(colors)` → kelompok per keluarga hue; `shiftHue(doc, opts, scope)`; `paletteMap(doc, mapping, scope)`.
- **Pengelompokan warna (proposal):** OKLCH lewat `rgb2ok` yang SUDAH ADA di `src/utils/colorMath.jsx` (hue = `atan2(b, a)`, chroma = `hypot(a, b)`). Alasan: hue OKLCH lebih konsisten secara visual daripada HSL (sesuai syarat user). HSL tetap dipakai untuk Mode 1 (shift) karena user memintanya eksplisit — helper HSL ditambahkan (~20 baris; hue HSV yang sudah ada adalah sudut yang sama, jadi konversi terjamin konsisten).
- **Mode 1 — Shift Hue (DIPUTUSKAN user 2026-11-13: delta seragam, opsi A):** tiap warna → HSL, hue digeser sebesar delta yang SAMA untuk semua warna yang masuk rentang sumber; jarak hue di dalam keluarga dipertahankan persis. S dan L tetap. Rentang hue sumber bisa dibatasi (default 190°–260° untuk biru; di luar rentang tidak berubah). Kontrol: satu slider hue (delta, −180°..+180°), slider saturation (pengali), slider lightness (pengali). Remap rentang sumber → rentang target DITOLAK (mengompresi/meregang jarak hue, mengubah kontras internal keluarga; UI + bentuk engine beda total). Berlaku untuk fill, stroke, stop gradien, fill teks.
- **Mode 2 — Palette Mapping:** daftar semua warna unik dikelompokkan per keluarga hue (biru, merah, hijau, dst. — batas bucket keputusan builder di plan, diusulkan 12 keluarga 30° dengan pengecualian abu-abu/chroma rendah yang dikelompokkan terpisah). Tiap kelompok punya satu kontrol "ganti ke warna dasar X": warna di dalamnya dipetakan ke keluarga target dengan urutan terang-ke-gelap dipertahankan (pemetaan lewat hue target + S/L asli tiap warna, bukan satu warna datar). Hasil pemetaan bisa diedit satu per satu (override per warna).
- **Cakupan:** seleksi atau seluruh dokumen (pemilih cakupan yang sama dengan G3). Objek terkunci tidak disentuh.
- **Pratinjau + Undo:** pratinjau langsung di kanvas (pola `livePaint`/`live()`), commit = satu langkah Undo. Dialog Recolor menutup dengan Apply (commit) atau Cancel (buang pratinjau) atau Esc.
- **UI (proposal):** Recolor sebagai modal/panel (pola `SettingsModal`): tab Mode 1 / Mode 2, daftar warna/kelompok, slider, pemilih cakupan, tombol Apply/Cancel. Dibuka dari menu (context menu + inspector, seksi Selection colors mendapat tombol "Recolor…").

### 5.6 Bukti (G6)

- Screenshot per area: Color Styles (style diganti → semua objek berubah), Select Same (seleksi hasil + toast jumlah), Find & Replace (panel + hitungan), Efek (drop shadow + layer blur + background blur dalam satu frame), Recolor Mode 1 (sebelum/sesudah hue shift), Recolor Mode 2 (panel palette mapping + hasil). Minimal 6 screenshot, diambil dari dokumen nyata (termasuk satu dokumen hasil trace ratusan path untuk G2/G3/G5).
- Verifikasi: `npm test` hijau, build 0 warning, probe Playwright per area (skenario terukur via DOM + piksel, pola probe sebelumnya), regresi penuh 14 probe sebelumnya tetap hijau, smoke test ZIP.

## 6. Constraints (terverifikasi dari kode, bukan asumsi)

- **CanvasKit 0.42.0 `bin/` (build default, BUKAN `bin/full/`):** `ImageFilter.MakeBlur`, `MakeDropShadow`, `MakeDropShadowOnly`, `Paint.setImageFilter`, `Canvas.saveLayer` (dengan backdrop), `CanvasKit.MakeSurface` (CPU) — semua TERBUKTI ADA di `.d.ts` DAN di runtime lewat spike (§7). `Surface.MakeRasterN32Premul` TIDAK ADA di build ini (spike run pertama gagal karenanya — diganti `MakeCanvasSurface`). `Image.makeWithFilter` TIDAK ADA di `.d.ts`.
- **Color math sudah ada:** `src/utils/colorMath.jsx` — sRGB↔OKLab (`rgb2ok`, `ok2hex`), HSV (`hex2hsv`, `hsv2hex`), `toHex`, `clampN`. HSL belum ada (ditambah).
- **Selection Colors sudah ada** (`VectorEditor.jsx:1664`, `:8011`; `EditorRightInspector.jsx:289-291`): fill, stroke, stop gradien dari seleksi + live preview + commit. Diperluas, tidak diduplikasi.
- **Model dokumen datar:** `doc.objects` satu list; group = field `group`; frame = objek dengan background. Satu walk mencakup semua objek — plan memverifikasi teks + background frame.
- **History:** `push` / `commitObjs` / `live` / `commitPaint` / `livePaint` — Recolor dan Find & Replace memakai pola ini (pratinjau live, commit satu langkah).
- **Serializer/parser:** `svgDocumentSerializer.jsx` (fill/stroke hex atau `url(#grad)`, `gradXml` untuk stop) dan `svgDocumentParser.jsx` (validasi ketat per cabang) — styles dan efek harus round-trip lewat keduanya.
- **i18n + tooltip:** semua label baru id+en (`appI18n.jsx`) + entri katalog tooltip (`tooltipsCatalog.jsx`) — mengikuti pola Task 5 (tidak mengulang celah Task 2 M1).
- **Tidak ada dependensi baru. Tidak ada git/worktree** (working copy bukan repo — Ruling A–H plan sebelumnya berlaku: snapshot, backup `.bak` per task, ledger milik controller).
- **Kursor/tema:** mengikuti konvensi yang ada; panel baru memakai komponen kustom yang sama seperti fungsi lain, bukan input HTML native (preferensi user).

## 7. Spike efek — hasil terukur (bukti, bukan klaim)

Spike: `probes/spike-effects/index.html` + `probes/spike-effects.cjs`, dijalankan di headless Chromium melawan `canvaskit-wasm/bin/` yang SAMA PERSIS dengan yang dibundel aplikasi (`scripts/build-offline-bundle.js:24-25`). Pembacaan piksel via snapshot PNG → `getImageData` (bukan `readPixels`). Kontrol: rect tanpa filter tepinya TEPAT di x=50 (x=49 putih, x=50 merah) — pemetaan koordinat terbukti benar.

| Tes | Hasil | Angka |
|---|---|---|
| Kontrol (rect tanpa filter) | PASS | tepi tepat x=50 |
| Drop shadow (`MakeDropShadow(12,12,4,4, hitam 0.8)`) | **PASS** | piksel bayangan (106,76) = (83,83,83); rect tetap biru (0,0,255) |
| Background blur, `saveLayer` TANPA clip | **FAIL (diagnostik)** | rasio kontras dalam/luar 0.497 = tidak ada efek lokal; profil luar ikut blur (tepi merah/biru jadi gradien halus di y=5, jauh di luar bounds layer) |
| Background blur, `saveLayer` + `clipRect(bounds)` | **PASS** | kontras luar 510 (tajam: merah murni/biru murni), rasio dalam 0.19 (runtuh) |
| Layer blur, `MakeBlur(6,6)` pada paint shape (GPU) | **FAIL** | shape mengembang KERAS 18px tiap sisi (x 32..167, y 8..93 dari rect 50..150/25..75), tanpa pelembutan |
| Layer blur, `MakeBlur(20,20)` pada paint shape | **FAIL (diagnostik)** | mengembang 60px (merah dari x=0) — ekspansi = 3σ, skala dengan sigma |
| Layer blur, `MakeBlur(6,6)` pada paint shape (CPU, `MakeSurface`) | **FAIL** | SAMA: tepi keras di x≈32 — bukan artefak SwiftShader/GPU |
| Layer blur, `MakeBlur(8,8)` pada paint + `drawImage` | **PASS** | gradien Gaussian halus: 255,0,0 → 121,0,134 → 0,0,255 di sepanjang batas |

**Kesimpulan spike (mengikat desain):** drop shadow dan background blur (dengan clip) BOLEH dijanjikan. Layer blur TIDAK BOLEH dijanjikan lewat `paint.setImageFilter(MakeBlur)` langsung pada shape — resep yang terbukti adalah render objek ke offscreen image dulu, lalu `drawImage` dengan paint ber-filter blur. Plan WAJIB memverifikasi resep ini di dalam renderer asli sebelum klaim selesai; bila resep itu gagal di renderer asli, layer blur turun jadi known limitation dengan fallback yang dicatat (bukan klaim kosong).

## 8. Approaches

- **A — Satu plan besar, satu ZIP (DIPILIH user 2026-11-13 14:33 WIB).** 8–12 task, review independen per task, final review + fix wave, satu ZIP + screenshot di akhir. Alasan dipilih: keempat area saling mengunci (Recolor memakai color-walk dan model style; satu regresi penuh menutup semuanya), tanpa duplikasi verifikasi. Biaya: lama sebelum user melihat apa pun (kemungkinan 3–5 jam kerja).
- **B — Bertahap per area, ZIP per area (ditolak).** Urutan: (1) Styles + Select Same + Find & Replace, (2) Recolor, (3) Efek. Kelebihan: feedback lebih awal per area. Kekurangan: overhead serah-terima dan regresi per area, total waktu lebih lama. Ditolak karena area-area ini saling bergantung dan user sudah melihat cara A bekerja di 6 tool.
- **C — Langsung tanpa review per task (ditolak).** Lebih cepat, tapi tanpa review independen yang selama ini menangkap cacat sebelum sampai ke user (nama Blob, stroke tak terlihat). Ditolak untuk pekerjaan sebesar ini.

## 9. Yang diputuskan user vs yang diserahkan ke builder

**Diputuskan user:** Pendekatan A; blur = Layer Blur + Background Blur (B); Recolor dua mode (Shift Hue + Palette Mapping); pengelompokan HSL/OKLCH (bukan RGB); cakupan seleksi-atau-dokumen; pratinjau langsung + Undo satu langkah; warna ditemukan di semua tempat (fill, stroke, stop gradien, group/frame, path trace); screenshot sebagai bukti; Mode 1 = delta seragam (opsi A, bukan remap rentang); Recolor/Find & Replace pada objek tertaut = unlink objek (opsi B); edit ColorField pada objek tertaut = unlink objek itu saja (opsi A, perilaku Figma). Ketiga jawaban ini sama persis dengan rekomendasi saya — tidak ada penyimpangan dari yang saya usulkan.

**Diserahkan ke builder (ditentukan saat menulis plan, dengan alasan tertulis):** nama field tautan style (`fillStyleId`/`strokeStyleId` vs alternatif); batas bucket keluarga hue Mode 2 (diusulkan 12 keluarga 30° + kelompok abu-abu/chroma-rendah terpisah); apakah banyak drop shadow per objek diizinkan v1; detail ekspor SVG filter untuk background blur; anggaran performa efek (radius maksimum / cache blur); letak persis tombol Recolor dan seksi Styles di inspector; skenario probe per area.

## 10. Referensi kode (terverifikasi)

- `src/utils/colorMath.jsx` — `rgb2ok`, `ok2hex`, `hex2hsv`, `hsv2hex`, `toHex`, `clampN`.
- `src/utils/colorParserAndFormatter.jsx` — `cssToHex`, `parseColorWithAlpha`, `parsePaintRgba01`, `validColor`.
- `src/engine/gradientEngine.jsx` — `gradOn`, `strokeGradOn`, `mapGrad`, `ensureGradModel`, `updateGradStops`, `gradXml`, `sampleGradAt`.
- `src/engine/svgDocumentSerializer.jsx:78-93` — fill/stroke/gradien/opacity saat ekspor; `src/engine/svgDocumentParser.jsx` — validasi `gen` (pola untuk styles/efek).
- `src/renderer/canvasKitScene.jsx:72-77,170-184` — `new kit.Paint()`, `color()` via `kit.Color4f(...parsePaintRgba01(...))`, `kit.WHITE`.
- `src/components/editor/VectorEditor.jsx:1664` (`selectionColors`), `:8011` (`replaceSelectionColor`), `:7519` (`ctxItems`).
- `src/components/editor/EditorRightInspector.jsx:199-291` — seksi Appearance/Fill/Stroke/Selection colors.
- `src/components/modals/SettingsModal.jsx` — pola modal (untuk dialog Recolor).
- Spike: `probes/spike-effects/index.html`, `probes/spike-effects.cjs` (server spike port 8945, sudah dimatikan).
