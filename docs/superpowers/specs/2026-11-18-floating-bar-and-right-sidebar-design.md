# Desain Singkat: Konsolidasi Floating Bar & Tombol Hide Sidebar Kanan

**Tanggal:** 2026-11-18  
**Skala:** Perubahan kecil terfokus

## 1. Tujuan & Alasan
Merapikan floating toolbar bawah agar lebih ringkas dengan menggabungkan alat yang serumpun, sekaligus memberi pengguna ruang kanvas lebih luas lewat tombol sembunyikan/tampilkan untuk sidebar inspektor kanan.

## 2. Ruang Lingkup (Goals, Non-Goals, Anti-Goals)
- **Goals:**
  1. Memindahkan seluruh fungsi dari dropdown **Geometri & Optimasi** (`Straighten`, `Simplify`, dan toggle `Auto-Simplify`) ke dalam dropdown **Aksi Node & Path** pada grup `nodeGrp`, serta menghapus tombol grup `geoGrp` dari floating bar.
  2. Memindahkan **Pen Tool** dan **Shape** (termasuk 20 pilihan bentuknya) ke dalam dropdown **Alat Gambar** (`drawGrp`), serta menghapus tombol standalone `Pen` dan tombol/popover standalone `Shape` dari floating bar.
  3. Menambahkan tombol hide/show untuk sidebar inspektor kanan (`EditorRightInspector`) di tepi kanan atas kanvas, simetris dengan tombol hide/show sidebar kiri, dengan area kanvas yang otomatis melebar penuh saat sidebar kanan disembunyikan.
- **Non-Goals:**
  - Tidak mengubah perilaku mesin vektor (`straighten`, `simplify`, `autoSimplify`, `pen`, `shape`, shortcut keyboard seperti `P`, `S`, `F`, `Esc`).
  - Tidak memindahkan tombol `Frame`, `Boolean`, `Snap`, `Grid`, `Mirror`, `Curve Drag`, atau `Settings`.
  - Tidak menambahkan sistem resize drag pada sidebar kanan atau menyimpan state collapse lintas reload kecuali diminta kemudian.
- **Anti-Goals:**
  - Tidak meninggalkan celah kosong `276px` di sisi kanan saat sidebar kanan disembunyikan.
  - Tidak memakai popover bertumpuk (nested popover) untuk pemilih Shape yang rawan bentrok dengan mekanisme click-outside `FloatPopover`.
  - Tidak menduplikasi item `Simplify` di dalam dropdown `nodeGrp`.

## 3. Kendala Teknis
- `.fig-workspace` saat ini memakai `grid-template-columns: auto 1fr 276px` di [tailwindOfflineBundle.tsx](../../../src/vendor/tailwindOfflineBundle.tsx); harus diubah ke `auto 1fr auto` (atau dinamis) agar kolom kanan menyusut menjadi `0` ketika sidebar kanan disembunyikan.
- Seluruh pengujian otomatis wajib memakai Playwright Regular (`@playwright/test` dan `npx playwright test`) dan bundle web harus dibangun ulang via `npm run build:web` sebelum pengujian.
- Beberapa tes Playwright yang sudah ada (`tests/auto-simplify-toggle.spec.ts`, `tests/draw-tools.spec.ts`, `tests/frame-shape-snap-grid.spec.ts`) mengakses `openGeoGrp`, tombol standalone `vePen`, dan `veShapePicker` sehingga perlu diperbarui mengikuti struktur baru.

## 4. Pendekatan yang Dipertimbangkan
1. **Pendekatan 1 — Konsolidasi langsung ke grup yang ada (`nodeGrp` & `drawGrp`) + grid dinamis sidebar kanan *(Dipilih)***
   - Menggabungkan fungsi geometri/optimasi ke seksi `Aksi Node & Path` di `nodeGrp`, memasukkan `Pen` + grid 5×4 `Shape` langsung di dalam dropdown `drawGrp`, dan memakai wrapper `relative` + `.fig-sidebar-edge-toggle` versi kanan + `grid-template-columns: auto 1fr auto`.
   - *Alasan dipilih:* Paling sederhana, tanpa nested popover, 100% simetris dengan tombol hide sidebar kiri yang sudah ada, dan minim risiko regresi.
2. **Pendekatan 2 — Nested popover untuk Shape di dalam `drawGrp` & overlay sidebar kanan**
   - *Trade-off / ditolak:* `FloatPopover` menutup saat klik di luar anchor sehingga nested popover rentan konflik fokus/posisi, dan overlay sidebar menutupi kanvas alih-alih meluaskan area kerja secara alami.

## 5. Keputusan Desain
- **Dropdown `nodeGrp` (Alat Node & Bézier):**
  - Menghapus `geoGrp` dari `VE_TOOLS` di [editorToolsAndShapes.tsx](../../../src/constants/editorToolsAndShapes.tsx).
  - Di dalam seksi **Aksi Node & Path** pada [EditorFloatingToolbar.tsx](../../../src/components/editor/EditorFloatingToolbar.tsx):
    - Menambahkan **Straighten** (`veStraight`) yang mengaktifkan mode `setTool('straighten')`.
    - Memastikan satu entri **Simplify** (`veSimplify`) yang mengaktifkan `setTool('simplify')` dan membuka `openVcSimplify()`.
    - Memindahkan sakelar **Auto-Simplify** (`veAutoSimplifyToggle`) ke bagian bawah seksi `Aksi Node & Path` (sebelum slider *Ukuran Node & Handle*).
  - Status aktif tombol `nodeGrp` di floating bar ikut menyala ketika `tool` adalah `straighten` atau `simplify` (dan `lastGrpTool.nodeGrp` menyimpan tool aktif grup).
- **Dropdown `drawGrp` (Alat Gambar):**
  - Menghapus entri standalone `pen` dari `VE_TOOLS` dan menghapus tombol/popover standalone `Shape` dari [EditorFloatingToolbar.tsx](../../../src/components/editor/EditorFloatingToolbar.tsx).
  - Memasukkan `pen` ke `VE_DRAW_GROUP` (urutan teratas sebelum `curvature`, `shapebuilder`, `blob`, `weave`, `line`, `arc`), dan menjadikan `lastGrpTool.drawGrp` mencakup `pen` maupun `shape`.
  - Menampilkan seksi **Bentuk (Shape)** berisi grid 5 kolom (20 bentuk dari `SHAPES`) tepat di bawah daftar alat dalam dropdown `drawGrp`.
  - Ketika `tool === 'shape'` (atau `lastGrpTool.drawGrp === 'shape'`), tombol utama `drawGrp` di floating bar menampilkan `<ShapeGlyph k={shapeKind} s={22} />` dan menyala aktif; mengklik bentuk mana pun mengatur `shapeKind`, mengaktifkan `setTool('shape')`, menutup dropdown, dan menampilkan pesan status `say(...)`.
- **Tombol Hide/Show Sidebar Kanan (Opsi B — Tepi Kanan Atas Kanvas):**
  - Menambah state `const [rightOpen, setRightOpen] = useState(true);` di [VectorEditor.tsx](../../../src/components/editor/VectorEditor.tsx).
  - Membungkus `{rightOpen && <EditorRightInspector ... />}` dalam container `<div className="flex h-full min-h-0 relative select-none order-3 lg:order-none">` bersama tombol `<button type="button" className={'fig-sidebar-edge-toggle fig-sidebar-edge-toggle-right' + (rightOpen ? ' on' : '')} ...>` yang diposisikan di tepi kanan atas kanvas (`top: 12px; left: -42px` / `right: auto`), dengan ikon panel kanan (kotak dengan garis pemisah di kanan + chevron menghadap kanan saat terbuka untuk menyembunyikan, dan menghadap kiri saat tertutup untuk menampilkan).
  - Mengubah `.fig-workspace` menjadi `grid-template-columns: auto 1fr auto` agar saat `rightOpen === false`, area kanvas otomatis melebar memenuhi ruang kosong dan `ResizeObserver` menyinkronkan renderer kanvas.
  - Menambahkan label i18n (`edRightSidebarHide` / `edRightSidebarShow`) dan tooltip (`veRightSidebarHide` / `veRightSidebarShow`) untuk Bahasa Indonesia & Inggris, serta ekspos helper di `window.__geovantaEditorApi` (mis. `getRightSidebarOpen`, `setRightSidebarOpen`, `toggleRightSidebar`) untuk kemudahan verifikasi.

## 6. Diserahkan ke Implementer
- Penyesuaian minor lebar dropdown `drawGrp` (sekitar `256px` agar grid 5 kolom shape muat lega) dan tinggi scroll agar tetap nyaman di layar pendek.
- Penyesuaian detail `lastGrpTool` ketika user memilih `straighten`/`simplify`/`shape` dan klik tombol utama grup vs chevron.
- Memperbarui tes Playwright yang terdampak dan menambahkan tes Playwright baru untuk seluruh perubahan ini.
