# Builder Check: Color Styles, Select Same + Find & Replace, Efek, dan Recolor

**Design doc:** `docs/superpowers/specs/2026-11-13-color-styles-recolor-effects-design.md`
**Tanggal:** 2026-11-13
**Yang dibaca untuk grounding:** `src/utils/colorMath.jsx`, `src/utils/colorParserAndFormatter.jsx`, `src/engine/gradientEngine.jsx` (`gradOn`, `o.fill` = base hex saat gradien aktif), `src/engine/svgDocumentSerializer.jsx` (teks: `legacyTextSpec(o)`, fill teks di `o.fill` top-level; save = SVG via `VE.serializeDoc`, `data-gen` sebagai preseden metadata), `src/engine/svgDocumentParser.jsx`, `src/components/editor/VectorEditor.jsx` (`selectionColors` :1664, `replaceSelectionColor` :8011, `ctxItems` :7519, grup = field `group` tanpa auto-expand saat klik-seleksi), `src/components/editor/EditorRightInspector.jsx:199-291`.

Tiga pertanyaan di bawah ini adalah hal yang masih harus dijawab sebelum plan bisa ditulis dengan baik. Semuanya bukan nitpick: jawaban yang salah mengubah API engine, UI, atau skenario probe. Hal yang sudah didelegasikan ke builder di §9 design doc (nama field, bucket hue Mode 2, multi-shadow, detail filter SVG background blur, anggaran performa, letak tombol/seksi, skenario probe) tidak ditanyakan di sini.

---

## 1. Mode 1 Shift Hue: geser delta seragam, atau remap rentang sumber → rentang target?

**Pertanyaan:** §5.5 menulis "hue digeser sebesar delta (atau dipetakan dari rentang sumber ke rentang target)". Yang mana yang dibangun?

**Kenapa jawabannya mengubah plan:**
- **Delta seragam** (`h' = h + Δ`, di luar rentang sumber tidak berubah): satu slider hue (−180°..+180°), engine `shiftHue(doc, { delta, srcRange, satMul, lightMul })`. Jarak hue antar warna dalam satu keluarga dipertahankan persis.
- **Remap rentang** (biru 210–230° dipetakan proporsional ke oranye 25–35°): butuh DUA kontrol rentang (sumber + target), engine `shiftHue(doc, { srcRange, dstRange, satMul, lightMul })`. Jarak hue dalam keluarga dikompresi/diregang ke lebar rentang target.
- Spesifikasi awal user memakai kedua bahasa sekaligus ("hue-nya digeser dari biru ke oranye" + "Kontrolnya satu slider hue"), jadi keduanya masih bisa dibaca sebagai yang diminta. UI, bentuk `opts`, dan ekspektasi probe (mis. biru tua/muda/sedang hasil akhirnya hue berapa) semuanya berbeda. Tanpa jawaban ini, task engine Mode 1 tidak bisa ditulis dengan benar.

## 2. Recolor / Find & Replace terhadap objek yang tertaut style: update style-nya, unlink objeknya, atau tulis hex tapi tautan tetap?

**Pertanyaan:** G1 menaut objek ke style lewat `fillStyleId`/`strokeStyleId`. G3 dan G5 menulis ulang warna. Bila warna yang diganti/recolor milik objek yang tertaut style, apa yang terjadi pada tautannya?

**Kenapa jawabannya mengubah plan:**
- **(a) Update style itu sendiri:** recolor satu warna brand mengubah SEMUA objek yang menaut ke style itu — termasuk objek di luar cakupan (seleksi) dan di luar dokumen yang sedang di-recolor. Mengejutkan bila cakupan = seleksi.
- **(b) Unlink objek yang kena:** objek menyimpan warna baru sebagai warna lepas, style-nya kehilangan anggota. Aman, tapi Recolor/Find & Replace diam-diam memutus style — perlu dicatat di UI/pesan.
- **(c) Tulis hex ter-resolve tapi tautan tetap:** ini jebakan kehilangan data — edit style berikutnya akan menimpa hasil Recolor/Find & Replace secara diam-diam, dan itu persis anti-goal §4 ("style atau efek yang hilang diam-diam").
- Pilihan ini mengubah `collectDocumentColors` (harus tahu tautan atau tidak), `shiftHue`/`paletteMap`/Find & Replace (perlu logika unlink atau tidak), dan probe (apakah style ikut berubah, apakah tautan putus). Design doc tidak menyebut interaksi ini di bagian mana pun, padahal G1 dan G5 saling mengunci (§1).

## 3. Edit langsung fill objek yang tertaut style lewat ColorField biasa: unlink, atau update style?

**Pertanyaan:** §5.1 memberi ColorField Fill/Stroke affordance "pakai style" (klik swatch = taut). Tapi bila pengguna kemudian mengubah fill objek yang SUDAH tertaut itu lewat ColorField biasa (bukan lewat style), apa yang terjadi?

**Kenapa jawabannya mengubah plan:**
- **Unlink (perilaku Figma):** objek lepas dari style dan menyimpan hex baru sebagai warna lepas; style dan objek lain tidak berubah. Inspector perlu menunjukkan status tautan dan perubahan ini (mis. ikon tautan hilang).
- **Update style:** satu edit mengubah SEMUA objek yang menaut ke style itu — destruktif dan mengejutkan untuk aksi yang terlihat lokal (mengubah satu swatch di inspector).
- Tanpa jawaban ini, logika `setProp`/`commitPaint` untuk fill/stroke tidak bisa ditulis: ia harus tahu apakah ada tautan yang harus diputus atau style yang harus ditulis ulang, dan probe inspector (tautan tampil/hilang sesudah edit) tidak bisa dirumuskan. Ini keputusan UX yang hanya user yang bisa menjawab — builder tidak boleh menebaknya karena kedua perilaku sama-sama masuk akal dan hasil akhirnya berlawanan.
