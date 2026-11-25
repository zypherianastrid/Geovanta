# Desain: Penyelarasan Behavior Alat Gambar (`drawGrp`), Rulers, & Color Guide (VectorCraft → Gevonta)

## 1. Tujuan & Ruang Lingkup
Menyelaraskan seluruh fitur pada dropdown alat gambar di floating bar (`VE_DRAW_GROUP` di `EditorFloatingToolbar.tsx`) agar berperilaku seperti `vectorcraft-main`, serta menambahkan dua fitur baru dari VectorCraft: **Rulers** (digabungkan dalam 1 dropdown bersama Grid di floating bar) dan **Color Guide** (di Inspector Kanan).

**Pendekatan Terpilih:** **Pendekatan 1 — Modular Terpisah**
- Memisahkan logika inti ke modul/komponen tersendiri agar `VectorEditor.tsx` (>10.700 baris) tetap bersih dan mudah diuji.
- Alternatif yang ditolak: *Inline monolitik* di `VectorEditor.tsx` & `EditorRightInspector.tsx` karena berisiko regresi tinggi dan sulit di-maintain.

---

## 2. Arsitektur & Komponen

### A. Penyelarasan 7 Alat Gambar (`drawGrp`) di `src/engine/drawToolsVectorcraft.tsx` + Integrasi `VectorEditor.tsx`
1. **Pen (`pen`)** — mengacu ke `vectorcraft-main/crates/tools/src/pen.rs`:
   - Klik = corner anchor; klik-drag = smooth anchor dengan handle simetris (`Alt` mematahkan handle; `Shift` mengunci sudut 45°; `Space` menggeser anchor saat drag).
   - Klik pada anchor pertama menutup path (drag membentuk handle penutup).
   - Klik pada ujung path terbuka yang terseleksi melanjutkan path tersebut; klik ujung path terbuka lain saat menggambar menggabungkannya.
   - `Alt` di atas handle/anchor/segmen path terseleksi bekerja seperti Anchor Point tool (tarik handle tunggal, klik smooth→corner, drag segmen).
   - Rubber-band preview segmen berikutnya + Auto Add/Delete anchor pada segmen/anchor path terseleksi.
   - `Enter`/`Esc` mengakhiri path.

2. **Pencil (`pencil`)** — mengacu ke `vectorcraft-main/crates/tools/src/draw2/gesture.rs`:
   - Preview kurva/polyline langsung saat drag; pada release dilakukan curve fitting (`VE.fitPath`).
   - Jika mulai dekat ujung path terbuka yang terseleksi, melanjutkan path tersebut; jika berakhir dekat titik awal (atau `Alt` saat release), menutup path.
   - `Shift` pada awal press = garis lurus terkunci kelipatan 45°; `Alt` pada press dengan path terseleksi = mode Smooth sementara sepanjang sapuan.

3. **Brush (`brush`)** — mengacu ke `vectorcraft-main/crates/tools/src/draw2/gesture.rs`:
   - Merekam tekanan (`pressure`) per titik untuk stroke variabel / kaligrafi atau path ber-stroke; preview langsung saat drag.
   - `Alt` pada press dengan path terseleksi = mode Smooth sementara; `Alt` setelah stroke dimulai = tutup path saat release.

4. **Curvature (`curvature`)** — mengacu ke `vectorcraft-main/crates/tools/src/draw2/curvature.rs`:
   - Klik menambah titik kurva halus melalui semua titik; `Alt`-klik atau double-click titik men-toggle smooth ↔ corner.
   - Drag titik memindahkan titik dan menghitung ulang kurva di sekitarnya; drag segmen melengkungkan segmen tersebut (menambah/mengubah titik).
   - Klik titik pertama (≥3 titik) menutup path; `Backspace`/`Delete` menghapus titik terakhir/aktif; `Enter`/`Esc` selesai.
   - Dapat mengedit path terseleksi yang sudah ada: klik titik untuk pilih, drag untuk geser, klik segmen untuk sisip titik tanpa merusak bentuk, lanjutkan dari ujung path terbuka.

5. **Shape Builder (`shapebuilder`)** — mengacu ke `vectorcraft-main/crates/tools/src/builder.rs`:
   - Memetakan area tertutup (*planar regions*) dari objek-objek vektor terseleksi (≥1 atau ≥2 path yang berpotongan).
   - Hover menyorot region di bawah kursor; klik pada region membuat/mengisi region tersebut; drag melintasi beberapa region menggabungkannya (*merge* menjadi 1 shape); `Alt`+klik / `Alt`+drag menghapus (*erase*) region yang disentuh.
   - Mendukung `Shift`+drag untuk seleksi garis lurus (atau freehand drag default) serta opsi mengambil fill dari artwork awal/warna aktif.

6. **Line Segment (`line`)** — mengacu ke `vectorcraft-main/crates/tools/src/shape.rs`:
   - Drag menggambar garis lurus dari titik awal ke kursor (`Shift` kelipatan 45°, `Alt` dari titik tengah, `Space` menggeser posisi garis saat drag).
   - Klik tanpa drag membuka popover/dialog cepat ukuran (panjang & sudut) seperti VectorCraft.

7. **Arc (`arc`)** — mengacu ke `vectorcraft-main/crates/tools/src/three_point_arc.rs`:
   - Three-point circular arc: tentukan dua titik ujung (drag dari titik 1 ke titik 2, atau klik titik 1 lalu klik titik 2; `Shift` 45°), lalu titik ke-3 menentukan kelengkungan busur (klik atau drag).
   - Preview busur putus-putus + tanda silang pusat busur + radius saat menentukan titik ke-3; `Esc` membatalkan.

### B. Rulers (`src/components/editor/CanvasRulers.tsx` & `EditorFloatingToolbar.tsx`)
Mengacu ke `vectorcraft-main/crates/ui-egui/src/canvas/rulers.rs`:
- **Dropdown Grid & Rulers** di `EditorFloatingToolbar.tsx`: menggabungkan tombol Grid menjadi tombol dropdown (atau klik utama toggle Grid + chevron buka popover berisi toggle **Grid**, **Rulers**, **Guides** (Tampilkan/Sembunyikan), **Lock Guides**, **Clear Guides**, serta pemilih **Unit**: `px`, `pt`, `mm`, `cm`, `in`).
- **Strip Penggaris Kanvas (`CanvasRulers.tsx`)**:
  - Penggaris horizontal (atas) dan vertikal (kiri) berukuran ~20px yang mengikuti `pan` dan `zoom` kanvas serta menampilkan tick mayor/minor + angka label sesuai unit aktif dan `rulerOrigin`.
  - **Drag dari penggaris atas/kiri** menarik *guide* horizontal/vertikal baru ke kanvas (dengan preview posisi dan snap opsional).
  - **Drag dari kotak sudut kiri-atas** menggeser `rulerOrigin` (titik 0,0); double-click sudut mereset `rulerOrigin` ke `(0, 0)`.
  - **Klik kanan pada penggaris** membuka menu cepat ganti unit (`px`, `pt`, `mm`, `cm`, `in`) & reset origin.
  - Guide yang sudah ada di kanvas dapat digeser atau dihapus (drag keluar ke penggaris / tekan Delete saat terpilih).

### C. Color Guide (`src/utils/colorHarmony.tsx` & `src/components/editor/ColorGuideSection.tsx`)
Mengacu ke `vectorcraft-main/crates/color/src/harmony.rs` & `crates/ui-egui/src/panels/color_guide.rs`:
- **Engine Harmoni (`colorHarmony.tsx`)**:
  - Mendukung aturan harmoni VectorCraft: *Complementary*, *Complementary 2*, *Split Complementary*, *Left Complement*, *Right Complement*, *Analogous*, *Analogous 2*, *Monochromatic*, *Shades*, *Triad*, *Triad 2*, *Triad 3*, *Tetrad*, *Tetrad 2*, *Tetrad 3*, *Compound*, *Compound 2*, *High Contrast*, *High Contrast 2*, *High Contrast 3*, *Pentagram*.
  - Variasi grid: *Tints/Shades*, *Warm/Cool*, *Vivid/Muted* dengan opsi jumlah *steps* (mis. 2–6) dan *variation amount* (10%–100%).
- **UI Seksi di `EditorRightInspector.tsx` (`ColorGuideSection.tsx`)**:
  - Header collapsible **"Color Guide"** (terbuka/tutup lokal seperti Recolor/Swatches).
  - **Base Color Chip** (klik untuk mengambil warna fill/stroke aktif saat ini sebagai base color) + dropdown pemilih aturan harmoni + strip warna harmoni utama.
  - **Variation Grid**: baris per warna harmoni, kolom tengah adalah warna harmoni, kiri = shades/cool/muted, kanan = tints/warm/vivid.
  - Klik sel menerapkan warna ke fill/stroke objek terpilih (tanpa mengubah base color); Shift/Ctrl-klik memilih beberapa sel; tombol **Save to Palette / Swatches** menyimpan warna terpilih (atau seluruh harmoni) ke palet dokumen.

---

## 3. Verifikasi & Pengujian
Sesuai aturan standar proyek:
- Syntax & TypeScript check (`npx tsc --noEmit` + `npm run build`).
- Pengujian otomatis **Python + Playwright + Playwright MCP** untuk setiap komponen:
  1. Verifikasi UI & interaksi 7 alat `drawGrp` (Pen, Pencil, Brush, Curvature, Shape Builder, Line, Arc).
  2. Verifikasi dropdown Grid & Rulers, render strip penggaris, ganti unit, drag guide, dan drag/reset origin.
  3. Verifikasi seksi Color Guide di Inspector Kanan: ganti harmoni, ganti variasi, klik chip/sel menerapkan warna ke objek, simpan ke palet.
