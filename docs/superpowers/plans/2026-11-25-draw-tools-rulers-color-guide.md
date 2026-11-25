# Penyelarasan Alat Gambar (`drawGrp`), Rulers, & Color Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelaraskan seluruh behavior 7 alat gambar di dropdown `drawGrp` (`pen`, `pencil`, `brush`, `curvature`, `shapebuilder`, `line`, `arc`) dengan `vectorcraft-main`, serta menambahkan **Rulers** (1 dropdown bersama Grid di floating bar) dan **Color Guide** (seksi di Inspector Kanan).

**Architecture:** Menggunakan **Pendekatan 1 (Modular Terpisah)**:
- `src/utils/colorHarmony.tsx` + `src/components/editor/ColorGuideSection.tsx` untuk Color Guide.
- `src/components/editor/CanvasRulers.tsx` + dropdown gabungan Grid & Rulers di `EditorFloatingToolbar.tsx`.
- `src/engine/drawToolsVectorcraft.tsx` untuk logika inti 7 alat gambar VectorCraft yang diintegrasikan ke `VectorEditor.tsx`.

**Tech Stack:** TypeScript, React 18, Tailwind CSS, `node scripts/build-offline-bundle.js`, Python + `pytest` + Playwright (`sync_playwright` / `async_playwright`), `check_syntax.py`.

**Spec:** [2026-11-25-draw-tools-rulers-color-guide-design.md](file:///C:/Users/Administrator/Documents/Gevonta-NEW-Version/Gevonta-NEW-Version/docs/superpowers/specs/2026-11-25-draw-tools-rulers-color-guide-design.md)

## Global Constraints
- Setiap file Python yang dibuat/diubah wajib lolos `python C:\Users\Administrator\.gemini\config\scripts\check_syntax.py <files>` (0 error) sebelum test dijalankan.
- Setiap perubahan TypeScript/React wajib lolos `npm run typecheck` dan `npm run build:web` di `Gevonta-NEW-Version`.
- Verifikasi akhir menggunakan Python + Playwright terhadap hasil build `dist/index.html` (atau server lokal).

## Review Focus
1. Koordinat kanvas vs layar (`pan`, `zoom`, `rulerOrigin`) saat menggambar guide atau konversi unit penggaris (`px`, `pt`, `mm`, `cm`, `in`).
2. State sementara alat multi-klik (`Pen`, `Curvature`, `ThreePointArc`) harus bersih saat `Esc`, `Enter`, atau ganti tool.
3. Shape Builder planar region tidak boleh merusak objek yang tidak terseleksi atau terkunci.
4. Color Guide tidak mengubah *base color* saat user mengklik sel variasi untuk menerapkan warna ke objek.
5. Dropdown Grid & Rulers di floating bar harus tetap kompatibel dengan mode desktop maupun mobile (`isMob`).

---

### Task 1: Color Guide Engine (`src/utils/colorHarmony.tsx`) & UI (`src/components/editor/ColorGuideSection.tsx`)
**Files:**
- Create: `src/utils/colorHarmony.tsx`
- Create: `src/components/editor/ColorGuideSection.tsx`
- Modify: `src/components/editor/EditorRightInspector.tsx`
- Test: `tests/test_color_guide.py`

- [ ] **Step 1:** Tulis test Python Playwright `tests/test_color_guide.py` yang membuka Gevonta, membuat/memilih objek, membuka seksi **Color Guide** di Inspector Kanan, mengganti aturan harmoni (mis. Triad/Complementary), mengganti variasi (Tints/Shades, Warm/Cool, Vivid/Muted), klik sel variasi untuk menerapkan warna ke objek tanpa mengubah base color, dan klik tombol simpan ke palet.
- [ ] **Step 2:** Jalankan `python C:\Users\Administrator\.gemini\config\scripts\check_syntax.py tests/test_color_guide.py`.
- [ ] **Step 3:** Jalankan `python -m pytest tests/test_color_guide.py -v` (pastikan FAIL — RED).
- [ ] **Step 4:** Implementasikan `src/utils/colorHarmony.tsx` (21 aturan harmoni VectorCraft + 3 variasi + step/amount) dan `src/components/editor/ColorGuideSection.tsx`, lalu pasang di `EditorRightInspector.tsx`.
- [ ] **Step 5:** Jalankan `npm run typecheck && npm run build:web` dan `check_syntax.py tests/test_color_guide.py`.
- [ ] **Step 6:** Jalankan `python -m pytest tests/test_color_guide.py -v` (pastikan PASS — GREEN).

---

### Task 2: Rulers (`src/components/editor/CanvasRulers.tsx`) & Dropdown Grid + Rulers (`EditorFloatingToolbar.tsx`)
**Files:**
- Create: `src/components/editor/CanvasRulers.tsx`
- Modify: `src/components/editor/EditorFloatingToolbar.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/test_rulers.py`

- [ ] **Step 1:** Tulis test Python Playwright `tests/test_rulers.py` yang membuka dropdown Grid & Rulers di floating bar, mengaktifkan Rulers, memverifikasi strip penggaris horizontal & vertikal muncul, mengganti unit (`px` → `mm`), drag dari penggaris atas untuk membuat guide horizontal, dan drag/double-click sudut untuk geser/reset `rulerOrigin`.
- [ ] **Step 2:** Jalankan `check_syntax.py tests/test_rulers.py`.
- [ ] **Step 3:** Jalankan `python -m pytest tests/test_rulers.py -v` (pastikan FAIL — RED).
- [ ] **Step 4:** Buat `CanvasRulers.tsx` (strip H/V, tick & label adaptif zoom, drag guide, drag/double-click corner origin, context menu unit), gabungkan Grid & Rulers dalam 1 dropdown di `EditorFloatingToolbar.tsx`, dan sambungkan state `rulersOn`, `rulerUnit`, `rulerOrigin`, `guides`, `guidesVisible`, `guidesLocked` di `VectorEditor.tsx`.
- [ ] **Step 5:** Jalankan `npm run typecheck && npm run build:web` dan `check_syntax.py tests/test_rulers.py`.
- [ ] **Step 6:** Jalankan `python -m pytest tests/test_rulers.py -v` (pastikan PASS — GREEN).

---

### Task 3: Penyelarasan Alat Gambar `drawGrp` (`src/engine/drawToolsVectorcraft.tsx` + `VectorEditor.tsx`)
**Files:**
- Create: `src/engine/drawToolsVectorcraft.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/test_draw_tools_vectorcraft.py`

- [ ] **Step 1:** Tulis test Python Playwright `tests/test_draw_tools_vectorcraft.py` yang menguji ke-7 alat di `drawGrp`:
  - `pen`: klik-klik-drag, tutup path di anchor pertama, `Esc` selesai.
  - `pencil` & `brush`: drag freehand menghasilkan path fitted, `Shift` garis lurus 45°.
  - `curvature`: klik 3 titik membentuk kurva halus, `Alt`/double-click toggle smooth↔corner, tutup path.
  - `shapebuilder`: 2 shape berpotongan diseleksi, klik/drag merge region, `Alt`+klik erase region.
  - `line`: drag garis (`Shift` 45°), klik tanpa drag memunculkan popover ukuran.
  - `arc`: klik/drag 2 ujung + titik ke-3 membentuk busur melingkar.
- [ ] **Step 2:** Jalankan `check_syntax.py tests/test_draw_tools_vectorcraft.py`.
- [ ] **Step 3:** Jalankan `python -m pytest tests/test_draw_tools_vectorcraft.py -v` (pastikan FAIL — RED).
- [ ] **Step 4:** Implementasikan `src/engine/drawToolsVectorcraft.tsx` (planar arrangement & region merge/erase untuk Shape Builder, Three-Point Arc math, Curvature spline/insert/toggle, Pen continue/join/Alt-convert, Freehand Pencil/Brush smoothing & line constraint, Line segment size dialog) dan integrasikan ke `VectorEditor.tsx`.
- [ ] **Step 5:** Jalankan `npm run typecheck && npm run build:web` dan `check_syntax.py tests/test_draw_tools_vectorcraft.py`.
- [ ] **Step 6:** Jalankan `python -m pytest tests/test_draw_tools_vectorcraft.py -v` (pastikan PASS — GREEN).
