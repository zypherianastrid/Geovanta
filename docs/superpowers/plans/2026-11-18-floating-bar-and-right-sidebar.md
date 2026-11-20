# Konsolidasi Floating Bar & Tombol Hide Sidebar Kanan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memindahkan seluruh fungsi Geometri & Optimasi ke dalam dropdown Aksi Node & Path (`nodeGrp`), memindahkan Pen Tool dan pemilih Shape ke dalam dropdown Alat Gambar (`drawGrp`), serta menambahkan tombol hide/show sidebar kanan di tepi kanan atas kanvas dengan grid kanvas yang melebar otomatis.

**Architecture:** Konfigurasi grup floating bar disederhanakan pada `VE_TOOLS`, `VE_DRAW_GROUP`, dan `EditorFloatingToolbar` tanpa popover bertumpuk (grid 20 bentuk Shape dirender sebagai seksi bawah dropdown `drawGrp`, sedangkan Straighten, Simplify, dan sakelar Auto-Simplify berada di seksi Aksi Node & Path dropdown `nodeGrp`). Di `VectorEditor`, state `rightOpen` membungkus `EditorRightInspector` secara simetris dengan `leftOpen` dan `.fig-workspace` diubah menjadi `grid-template-columns: auto 1fr auto` agar kanvas melebar penuh saat sidebar kanan disembunyikan.

**Tech Stack:** React 18, TypeScript/TSX, esbuild (`npm run build:web`), Tailwind Offline CSS AST (`src/vendor/tailwindOfflineBundle.tsx`), Playwright (`@playwright/test`).

**Spec:** `docs/superpowers/specs/2026-11-18-floating-bar-and-right-sidebar-design.md`

## Global Constraints

- Semua pengujian otomatis WAJIB menggunakan Playwright Regular (`@playwright/test`, `npx playwright test <path>`) dan build offline WAJIB dijalankan via `npm run build:web` sebelum menjalankan tes Playwright terhadap `web/index.html`.
- Tidak boleh ada duplikasi entri `Simplify` (`data-tip="veSimplify"`) di dalam dropdown `nodeGrp`.
- Tidak boleh memakai popover bertumpuk (nested `Float`) untuk Shape; grid 5 kolom (20 bentuk) harus berada langsung di dalam dropdown `drawGrp`.
- `VE_DRAW_TOOLS` tetap berisi 6 tool gambar (`['curvature', 'shapebuilder', 'blob', 'weave', 'line', 'arc']`) agar perilaku tombol `Escape` khusus sesi Pen (`tool === 'pen' && !penRef.current`) tidak berubah.
- Tidak boleh ada celah kosong `276px` di sisi kanan saat sidebar kanan disembunyikan; `.fig-workspace` memakai `grid-template-columns: auto 1fr auto` dan tetap mempertahankan aturan responsif `@media (max-width: 1023px)`.
- Shortcut keyboard yang sudah ada (`P`, `S`, `F`, `V`, `A`/`N`, `Esc`, dll.) serta tombol `Frame`, `Boolean`, `Snap`, `Grid`, `Mirror`, `Curve Drag`, dan `Settings` tetap berfungsi seperti semula.

## Review Focus

1. **Tool `straighten` atau `simplify` aktif dan diklik ulang pada tombol utama `nodeGrp`:** Tombol grup `nodeGrp` harus tetap menyala `.on`, menampilkan ikon tool aktif (`straighten`/`simplify`), dan tidak melempar error lookup dari `VE_NODE_GROUP` (diuji di Task 1).
2. **Entri `Simplify` tidak terduplikasi di `nodeGrp` dan dapat diklik tanpa seleksi terlebih dahulu:** Hanya ada tepat 1 `.flt .opt[data-tip="veSimplify"]` di dalam dropdown `nodeGrp` dan `veStraight` + `veSimplify` tetap aktif untuk membuka panel/strip-nya (diuji di Task 1).
3. **Berpindah dari `shape` → `select` lalu klik tombol utama `drawGrp`:** Tombol utama `drawGrp` harus menampilkan `<ShapeGlyph k={shapeKind} />` saat `lastGrpTool.drawGrp === 'shape'`, menyala `.on` saat `tool === 'shape'`, dan mengaktifkan kembali mode `shape` dengan aman tanpa gagal merender `<Vi>` (diuji di Task 2).
4. **Tombol `Escape` saat mode `pen` idle maupun saat sesi Pen aktif tetap bekerja normal:** Memasukkan `pen` ke `VE_DRAW_GROUP` tidak boleh mengubah `VE_DRAW_TOOLS` sehingga `Escape` saat idle kembali ke `select` (diuji di Task 2).
5. **Mengklik tombol hide/show sidebar kanan saat `rightOpen` true maupun false:** Sidebar kanan benar-benar hilang dari DOM, lebar `.ved-canvas` bertambah minimal `250px`, tombol tetap terlihat di dalam viewport (tidak terpotong `overflow: hidden`), dan klik tombol tidak menghilangkan seleksi objek pada kanvas (diuji di Task 3).

---

### Task 1: Pindahkan Geometri & Optimasi ke Dropdown Aksi Node & Path (`nodeGrp`)

**Files:**
- Modify: `src/constants/editorToolsAndShapes.tsx:12-54`
- Modify: `src/components/editor/EditorFloatingToolbar.tsx:108-188`
- Modify: `src/components/editor/VectorEditor.tsx:838-860,9190-9196`
- Test: `tests/auto-simplify-toggle.spec.ts`
- Test: `tests/floating-node-actions.spec.ts`

**Interfaces:**
- Consumes: `VE_NODE_GROUP`, `VE_GEO_GROUP`, `autoSimplifyOn`, `toggleAutoSimplify`, `setAutoSimplifyOn`, `openVcSimplify`, `vcSimpRef`, `setTool`, `setOpenGrp`
- Produces:
  - `VE_TOOLS` tanpa entri `geoGrp`
  - Dropdown `nodeGrp` dengan seksi `Aksi Node & Path` yang memuat `veStraight`, satu `veSimplify` (tanpa duplikasi), dan tombol switch `button[data-tip="veAutoSimplifyToggle"]`
  - `lastGrpTool` dengan kunci `{ nodeGrp, drawGrp }` (tanpa `geoGrp`), dengan `nodeGrp` mengenali tool `'straighten'` dan `'simplify'`

- [ ] **Step 1: Perbarui tes Playwright yang ada agar menguji lokasi baru Geometri & Optimasi di dalam `nodeGrp`**

Di `tests/auto-simplify-toggle.spec.ts`:
- Ganti pemanggilan `openGeoGrp()` menjadi `openNodeGrp()`.
- Tambahkan asersi bahwa tidak ada tombol `geoGrp` terpisah di `.fig-floating-bar` (`button[data-tip="veStraight"]` tidak muncul langsung di `.fig-floating-bar` saat tool default `select`).
- Verifikasi `button[data-tip="veAutoSimplifyToggle"]` muncul dan berfungsi di dalam dropdown `nodeGrp`.

Di `tests/floating-node-actions.spec.ts`:
- Pada tes `'floating bar nodeGrp dropdown menampilkan ...'`, tambahkan asersi:
  - `.flt .opt[data-tip="veStraight"]` terlihat dan tidak disabled.
  - `.flt .opt[data-tip="veSimplify"]` berjumlah tepat `1` (`toHaveCount(1)`).
  - `.flt button[data-tip="veAutoSimplifyToggle"]` terlihat dengan `role="switch"`.
- Tambahkan tes baru `'memilih Straighten dari nodeGrp mengaktifkan tool straighten dan menandai tombol nodeGrp aktif'`:
  - Buka `nodeGrp`, klik `.flt .opt[data-tip="veStraight"]`, verifikasi `getTool() === 'straighten'`, dropdown tertutup, dan tombol `.fig-floating-bar button.tool-btn.on[data-tip="veStraight"]` terlihat.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan tes gagal sebelum implementasi**

Run: `npx playwright test tests/auto-simplify-toggle.spec.ts tests/floating-node-actions.spec.ts`
Expected: FAIL karena `veAutoSimplifyToggle` dan `veStraight` masih berada di `geoGrp`, bukan di `nodeGrp`.

- [ ] **Step 3: Hapus `geoGrp` dari `VE_TOOLS` dan konsolidasikan ke `nodeGrp`**

1. Di `src/constants/editorToolsAndShapes.tsx`:
   - Hapus entri `{ type: 'group', id: 'geoGrp', items: VE_GEO_GROUP }` dari array `VE_TOOLS`. Pertahankan export `VE_GEO_GROUP` bila masih dipakai untuk referensi ikon `straighten`/`simplify`.
2. Di `src/components/editor/VectorEditor.tsx`:
   - Hapus `geoGrp` dari initial state `lastGrpTool` dan `grpBtnRefs`.
   - Pada `useEffect([tool])` (sekitar baris 848-859), ketika `VE_NODE_GROUP.some(x => x[0] === tool) || VE_GEO_GROUP.some(x => x[0] === tool)`, perbarui `lastGrpTool.nodeGrp = tool`.
   - Hapus `openGeoGrp` dari `window.__geovantaEditorApi` (atau tidak lagi memanggil `'geoGrp'`).
3. Di `src/components/editor/EditorFloatingToolbar.tsx`:
   - Untuk grup `id === 'nodeGrp'`, perluas lookup `activeInGroup` dan `currentItem` agar juga mencari di `VE_GEO_GROUP` (sehingga saat `tool === 'straighten'` atau `tool === 'simplify'`, tombol `nodeGrp` menyala `.on` dan menampilkan ikon `straighten`/`simplify`).
   - Pada `NODE_ACTIONS`:
     - Tambahkan item `['straighten', 'veStraight', VE_GEO_GROUP[0][2], false, () => setTool('straighten')]`.
     - Perbarui item `simplify` yang sudah ada menjadi `['simplify', 'veSimplify', VE_GEO_GROUP[1][2], false, () => { setTool('simplify'); openVcSimplify(); }]` agar hanya ada tepat satu entri `veSimplify` dan selalu dapat membuka Simplify.
   - Hapus blok `{id === 'geoGrp' && ...}` dan pindahkan blok tombol switch `Auto-Simplify` (`data-tip="veAutoSimplifyToggle"`) ke dalam seksi `Aksi Node & Path` pada `id === 'nodeGrp'` (tepat di bawah daftar scroll `NODE_ACTIONS`, sebelum seksi slider `Ukuran Node & Handle`).

- [ ] **Step 4: Build bundle web dan jalankan tes Playwright untuk verifikasi Task 1**

Run: `npm run build:web && npx playwright test tests/auto-simplify-toggle.spec.ts tests/floating-node-actions.spec.ts`
Expected: PASS (semua tes di kedua file lulus).

---

### Task 2: Pindahkan Pen Tool dan Shape (20 Bentuk) ke Dropdown Alat Gambar (`drawGrp`)

**Files:**
- Modify: `src/constants/editorToolsAndShapes.tsx:16-54`
- Modify: `src/components/editor/EditorFloatingToolbar.tsx:30-215`
- Modify: `src/components/editor/VectorEditor.tsx:684,693,838-860,7906,9141`
- Modify: `src/components/editor/hooks/useEditorShortcuts.tsx:55,115,294`
- Test: `tests/draw-tools.spec.ts`
- Test: `tests/frame-shape-snap-grid.spec.ts`

**Interfaces:**
- Consumes: `SHAPES`, `SHAPE_EN`, `ShapeGlyph`, `shapeKind`, `setShapeKind`, `say`, `VE_DRAW_GROUP`, `VE_DRAW_TOOLS`
- Produces:
  - `VE_DRAW_GROUP` berisi 7 item: `pen`, `curvature`, `shapebuilder`, `blob`, `weave`, `line`, `arc`
  - `VE_TOOLS` tanpa entri standalone `pen`
  - `EditorFloatingToolbar` tanpa tombol & popover standalone `Shape` (`veShapePicker` dihapus; 20 tombol `button.tool-btn[data-tip="veShp_<k>"]` berada di seksi bawah dropdown `drawGrp`)
  - `lastGrpTool.drawGrp` bertipe `'pen' | 'curvature' | 'shapebuilder' | 'blob' | 'weave' | 'line' | 'arc' | 'shape'` (default `'pen'`)

- [ ] **Step 1: Perbarui tes Playwright yang ada dan tambahkan tes baru untuk Pen & Shape di dalam `drawGrp`**

Di `tests/draw-tools.spec.ts`:
- Perbarui tes `'Dropdown drawGrp pada floating bar dapat dibuka...'`:
  - Verifikasi semua 7 item alat gambar terlihat: `['vePen', 'veCurvature', 'veShapeBuilder', 'veBlob', 'veWeave', 'veLine', 'veArc']`.
  - Verifikasi seksi Shape (mis. `button.tool-btn[data-tip="veShp_rect"]` dan `button.tool-btn[data-tip="veShp_star5"]`) terlihat di dalam popover `.flt` yang sama, dengan total 20 tombol bentuk (`[data-tip^="veShp_"]` berjumlah 20).
- Perbarui tes `'Pen tool: shortcut P mengaktifkan pen, Escape saat idle beralih ke select'`:
  - Verifikasi tidak ada tombol standalone `vePen` terpisah di luar `drawGrp`, dan memilih `Pen` dari dropdown `drawGrp` (atau klik tombol utama `drawGrp` saat default `pen`) mengaktifkan `tool === 'pen'`.
  - Pastikan shortcut `P` dan `Escape` tetap bekerja normal.
- Tambahkan tes `'memilih Shape dari drawGrp mengaktifkan mode shape, menampilkan ikon shape pada tombol drawGrp, dan aman diklik ulang setelah Escape'`:
  - Buka `drawGrp`, klik `button.tool-btn[data-tip="veShp_star5"]`, verifikasi `getTool() === 'shape'` dan dropdown tertutup.
  - Verifikasi tombol utama `drawGrp` menyala `.on` dengan `data-tip="veShape"`.
  - Tekan `Escape` → `getTool() === 'select'`, lalu klik tombol utama `drawGrp` (`button.tool-btn[data-tip="veShape"]`) → `getTool() === 'shape'` kembali aktif tanpa error.

Di `tests/frame-shape-snap-grid.spec.ts`:
- Pada tes `'Shape Tool: drag-drawing...'`:
  - Verifikasi tidak ada lagi tombol standalone `button[data-tip="veShapePicker"]`.
  - Buka dropdown `drawGrp` lewat `openDrawGrp()` (atau klik chevron `drawGrp`), klik `button.tool-btn[data-tip="veShp_star5"]`, verifikasi `getTool() === 'shape'` dan `Escape` kembali ke `'select'`.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan tes gagal sebelum implementasi**

Run: `npx playwright test tests/draw-tools.spec.ts tests/frame-shape-snap-grid.spec.ts`
Expected: FAIL karena `vePen` dan grid `SHAPES` belum berada di dalam dropdown `drawGrp`.

- [ ] **Step 3: Pindahkan `pen` dan grid `SHAPES` ke dalam `drawGrp` serta bersihkan kontrol standalone**

1. Di `src/constants/editorToolsAndShapes.tsx`:
   - Pindahkan definisi `['pen', 'vePen', 'M12 19l7-7 2.5 2.5-7 7-2.5-2.5z M18 13l-1.4-7.2L3.5 3.5l2.3 13.1L13 18l5-5z M3.5 3.5l6.8 6.8 M11.5 11.5a1.5 1.5 0 1 0 0 0.01']` ke urutan pertama `VE_DRAW_GROUP`.
   - Hapus entri `{ type: 'single', item: ['pen', ...] }` dari `VE_TOOLS`.
   - Biarkan `VE_DRAW_TOOLS` tetap `['curvature', 'shapebuilder', 'blob', 'weave', 'line', 'arc']`.
2. Di `src/components/editor/VectorEditor.tsx`:
   - Ubah default `lastGrpTool.drawGrp` menjadi `'pen'`.
   - Pada `useEffect([tool])`, jika `VE_DRAW_GROUP.some(x => x[0] === tool) || tool === 'shape'`, perbarui `lastGrpTool.drawGrp = tool`.
   - Hapus state/ref `shapeOpen`, `setShapeOpen`, `shapeBtn` yang tidak lagi digunakan (termasuk prop ke `EditorFloatingToolbar` dan `useEditorShortcuts`).
3. Di `src/components/editor/hooks/useEditorShortcuts.tsx`:
   - Hapus parameter `shapeOpen` yang sudah tidak terpakai (cukup periksa `openGrp == null`).
4. Di `src/components/editor/EditorFloatingToolbar.tsx`:
   - Hapus tombol standalone `Shape`, chevron `veShapePicker`, dan `<Float anchor={shapeBtn} ...>` di sebelah tombol `Frame` (pertahankan tombol `Frame` tetap di posisinya).
   - Untuk grup `id === 'drawGrp'`:
     - Lebar `Float` dibuat `256` agar grid 5 kolom shape muat lega.
     - Deteksi `isShapeActive = id === 'drawGrp' && tool === 'shape'` dan `isShapeCurrent = id === 'drawGrp' && (tool === 'shape' || lastGrpTool.drawGrp === 'shape')`.
     - Saat `isShapeCurrent`, tombol utama `drawGrp` merender `<ShapeGlyph k={shapeKind} s={22} />`, menggunakan `data-tip="veShape"` dan `aria-label="Shape"`. Klik saat `tool === 'shape'` membuka/menutup `drawGrp`; klik saat tool lain mengaktifkan `setTool('shape')`.
     - Di bagian bawah dropdown `drawGrp`, tambahkan pembatas `<div className="pt-2 mt-2 border-t border-[var(--line)]">` dengan judul `{L.ftShape}` dan grid `<div className="grid grid-cols-5 gap-1.5">` berisi `SHAPES.map(...)`. Klik salah satu bentuk memanggil `setShapeKind(k); setTool('shape'); setOpenGrp(null); say(...)`.

- [ ] **Step 4: Build bundle web dan jalankan tes Playwright untuk verifikasi Task 2**

Run: `npm run build:web && npx playwright test tests/draw-tools.spec.ts tests/frame-shape-snap-grid.spec.ts`
Expected: PASS (semua tes di kedua file lulus).

---

### Task 3: Tambahkan Tombol Hide/Show Sidebar Kanan di Tepi Kanan Atas Kanvas

**Files:**
- Modify: `src/vendor/tailwindOfflineBundle.tsx` (aturan `.fig-workspace` dan `.fig-sidebar-edge-toggle-right`)
- Modify: `src/constants/appI18n.tsx:268-272,741-745`
- Modify: `src/constants/tooltipsCatalog.tsx:1514-1522,2856-2864`
- Modify: `src/components/editor/VectorEditor.tsx:828-830,9150-9200,9420-9445`
- Create: `tests/right-sidebar-toggle.spec.ts`

**Interfaces:**
- Consumes: `EditorRightInspector`, `.fig-sidebar-edge-toggle` styling pattern, `L` (i18n dictionary), `TIPS` / `TIPS_EN`
- Produces:
  - State `rightOpen` (default `true`) di `VectorEditor`
  - Tombol toggle kanan: `button.fig-sidebar-edge-toggle.fig-sidebar-edge-toggle-right` dengan `data-tip="veRightSidebarHide"` / `"veRightSidebarShow"`, `aria-expanded={rightOpen}`
  - Label i18n `edRightSidebarHide` / `edRightSidebarShow` (ID & EN) dan tooltip `veRightSidebarHide` / `veRightSidebarShow` (ID & EN)
  - Helper API pada `window.__geovantaEditorApi`: `getRightSidebarOpen: () => boolean`, `setRightSidebarOpen: (open: boolean) => void`, `toggleRightSidebar: () => void`
  - `.fig-workspace` `grid-template-columns: auto 1fr auto`

- [ ] **Step 1: Tulis tes Playwright gagal di `tests/right-sidebar-toggle.spec.ts`**

Buat `tests/right-sidebar-toggle.spec.ts` dengan skenario:
1. `'sidebar kanan tampil default, tombol tepi kanan atas menyembunyikan dan menampilkan kembali sidebar sambil meluaskan kanvas'`:
   - Buka `web/index.html`, klik `Create New Project`, tunggu `__geovantaEditorApi`.
   - Verifikasi `.fig-right-sidebar` terlihat dan tombol `button.fig-sidebar-edge-toggle-right` terlihat dengan `data-tip="veRightSidebarHide"` dan `aria-expanded="true"`.
   - Ukur `boundingBox()` dari `.ved-canvas` (`widthBefore`) dan tombol toggle (pastikan berada di dalam viewport).
   - Klik tombol toggle:
     - `.fig-right-sidebar` memiliki count `0` (tersembunyi).
     - Tombol toggle tetap terlihat di dalam viewport (`box.x >= 0 && box.x + box.width <= viewport.width`), memiliki `data-tip="veRightSidebarShow"` dan `aria-expanded="false"`.
     - Lebar `.ved-canvas` (`widthHidden`) bertambah minimal `250px` (`widthHidden - widthBefore >= 250`).
   - Klik tombol toggle lagi:
     - `.fig-right-sidebar` kembali terlihat.
     - `aria-expanded="true"`, `data-tip="veRightSidebarHide"`.
     - Lebar `.ved-canvas` kembali mendekati `widthBefore` (selisih `<= 2px`).
2. `'mengklik tombol hide sidebar kanan tidak menghilangkan seleksi objek di kanvas'`:
   - Buat shape via `__geovantaEditorApi.createTestShape('rect', 80, 80, 120, 120)`, pastikan `getSel().objs.length === 1`.
   - Klik tombol `button.fig-sidebar-edge-toggle-right` dua kali (hide lalu show), pastikan `getSel().objs.length === 1` tetap terjaga.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan tes gagal sebelum implementasi**

Run: `npx playwright test tests/right-sidebar-toggle.spec.ts`
Expected: FAIL karena `button.fig-sidebar-edge-toggle-right` belum ada.

- [ ] **Step 3: Implementasikan state `rightOpen`, wrapper simetris + tombol kanan, CSS grid dinamis, dan i18n/tooltip**

1. Di `src/vendor/tailwindOfflineBundle.tsx`:
   - Ubah deklarasi `.fig-workspace` dari `["grid-template-columns","auto 1fr 276px"]` menjadi `["grid-template-columns","auto 1fr auto"]`.
   - Tambahkan aturan `.fig-sidebar-edge-toggle-right` dengan `[["left","-42px"],["right","auto"]]` tepat setelah aturan `.fig-sidebar-edge-toggle`.
2. Di `src/constants/appI18n.tsx`:
   - Bahasa Indonesia: `edRightSidebarHide: 'Sembunyikan Panel Properti'`, `edRightSidebarShow: 'Tampilkan Panel Properti'`.
   - Bahasa Inggris: `edRightSidebarHide: 'Hide Inspector Panel'`, `edRightSidebarShow: 'Show Inspector Panel'`.
3. Di `src/constants/tooltipsCatalog.tsx`:
   - Bahasa Indonesia (`TIPS`): `veRightSidebarHide` (`t: 'Sembunyikan Panel Properti'`, `d: 'Menyembunyikan panel properti di sisi kanan.'`) dan `veRightSidebarShow` (`t: 'Tampilkan Panel Properti'`, `d: 'Menampilkan panel properti di sisi kanan.'`).
   - Bahasa Inggris (`TIPS_EN`): `veRightSidebarHide` (`t: 'Hide Inspector Panel'`, `d: 'Hides the properties inspector panel on the right side.'`) dan `veRightSidebarShow` (`t: 'Show Inspector Panel'`, `d: 'Shows the properties inspector panel on the right side.'`).
4. Di `src/components/editor/VectorEditor.tsx`:
   - Tambahkan `const [rightOpen, setRightOpen] = useState(true);` dan ref sinkron `rightOpenRef` (atau getter di `__geovantaEditorApi`) tepat di bawah `leftOpen`.
   - Ekspos `getRightSidebarOpen: () => rightOpenRef.current`, `setRightSidebarOpen: (v) => setRightOpen(!!v)`, `toggleRightSidebar: () => setRightOpen(o => !o)` pada `window.__geovantaEditorApi`.
   - Bungkus `<EditorRightInspector ... />` dalam `<div className="flex h-full min-h-0 relative select-none order-3 lg:order-none">`, render tombol `<button type="button" className={'fig-sidebar-edge-toggle fig-sidebar-edge-toggle-right' + (rightOpen ? ' on' : '')} data-tip={rightOpen ? 'veRightSidebarHide' : 'veRightSidebarShow'} aria-label={rightOpen ? L.edRightSidebarHide : L.edRightSidebarShow} aria-expanded={rightOpen} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setRightOpen(o => !o); }}>` dengan ikon SVG panel kanan (`rect`, garis pemisah kanan `M14.5 4v16`, panah kanan saat `rightOpen` / kiri saat `!rightOpen`), diikuti `{rightOpen && <EditorRightInspector ... />}`.

- [ ] **Step 4: Build bundle web dan jalankan seluruh tes Playwright terkait + typecheck**

Run: `npm run typecheck && npm run build:web && npx playwright test tests/right-sidebar-toggle.spec.ts tests/auto-simplify-toggle.spec.ts tests/floating-node-actions.spec.ts tests/draw-tools.spec.ts tests/frame-shape-snap-grid.spec.ts tests/right-sidebar-inspector.spec.ts tests/right-sidebar-scrollbar.spec.ts`
Expected: PASS (semua tes lulus dan typecheck tanpa error baru).
