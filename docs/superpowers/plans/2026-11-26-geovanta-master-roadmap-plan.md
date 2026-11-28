# Geovanta Vector Editor — Master Roadmap Prioritas & Implementation Planner

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun peta jalan prioritas terstruktur (`P0`–`P3`, target `v1.4.0`–`v2.0.0`) untuk menutup celah fitur standar industri dan meningkatkan arsitektur, performa, serta UX **Geovanta Vector Editor** tanpa mengorbankan prinsip 100% offline-first.

**Baseline Version:** `v1.3.2` (`package.json`, `README.md`, `CHANGELOG.md`)

**Architecture:** Arsitektur modular berbasis React 18 + TypeScript + Tailwind CSS di lapisan UI, Skia CanvasKit 0.40.0 WASM + Rust/WASM di lapisan geometry/renderer, IndexedDB + `.geovanta` ZIP di lapisan workspace, serta Tauri v2 (Windows x64), Capacitor 7 (Android APK), dan Node MCP Server (`scripts/mcp-server/`) di lapisan platform & AI.

**Tech Stack:**
- **Frontend & Engine:** React 18.3.1, TypeScript, Tailwind CSS 3.4.17, Skia `canvaskit-wasm` 0.40.0, `opentype.js` 2.0.0, `echarts` 6.1.0, `gsap` 3.15.1, Rust/WASM.
- **Native & AI:** Tauri v2 (`src-tauri/`), Capacitor 7 (`android/`), MCP Server (`scripts/mcp-server/`).
- **Mandatory Testing & Verification Stack:** Python (`pytest` / `unittest`), Playwright (`async_playwright` / `pytest-playwright`), Playwright MCP (`navigate`, `click`, `fill`, `screenshot`, `assert`), `python C:\Users\Administrator\.gemini\config\scripts\check_syntax.py` / `python -m py_compile`, serta `npm run typecheck` dan `npm test`.

## Global Constraints

1. **100% Offline-First & Local-First:** Tidak boleh menambah dependensi CDN eksternal wajib saat runtime. Semua asset, font, WASM, dan engine harus berjalan penuh secara lokal di WebApp, Windows x64, dan Android.
2. **Backward-Compatibility Dokumen:** Semua proyek lama di IndexedDB dan arsip `.geovanta` dari `v1.0.0`–`v1.3.2` wajib tetap bisa dibuka tanpa kehilangan data (skema migrasi deterministik).
3. **Full Bilingual (`id` & `en`):** Setiap kontrol UI, tooltip (`tooltipsCatalog.tsx`), toast, dan modal baru wajib memiliki terjemahan Bahasa Indonesia dan Bahasa Inggris.
4. **Cross-Platform Parity:** Fitur inti harus berjalan mulus di Desktop Web, Windows 64-bit (Tauri), dan Mobile Mode (`<= 768px` / Android APK).
5. **Mandatory Testing Discipline (RED → Syntax Check → GREEN):**
   - Setiap task yang mengubah/menambah kode wajib diawali dengan penulisan test Python + Playwright / Playwright MCP.
   - Wajib menjalankan syntax check (`check_syntax.py` / `python -m py_compile` untuk file Python, dan `npm run typecheck` untuk TypeScript) **sebelum** menjalankan test di fase RED maupun GREEN.

## Review Focus

Lima area risiko utama yang wajib diawasi saat review setiap PR/task:
1. **Regresi Monolit:** Perubahan di `VectorEditor.tsx` (443 KB) dan `EditorRightInspector.tsx` (82 KB) sangat rentan memicu bug pointer/selection/re-render sebelum refaktor Fase 1 selesai.
2. **Migrasi Skema `.geovanta` & `VectorDocument`:** Perubahan `viewBox` → `artboards[]` dan penambahan `fills[]`/`strokes[]` harus mempertahankan kompatibilitas penuh dengan file versi lama.
3. **Memori CanvasKit WASM (Android & 4x Export):** Render raster `4x`, `vmtEngineBundle.js` (886 KB), dan multi-artboard berisiko menyebabkan OOM pada perangkat Android RAM 4–6 GB jika surface/path Skia tidak di-`.delete()` secara disiplin.
4. **Fidelitas Round-Trip Boolean & SVG:** Refit Bézier pada operasi Boolean berulang dan parsing `<clipPath>`/`<mask>`/`<use>` dari Figma/Illustrator tidak boleh merusak kurva atau koordinat.
5. **Ukuran Offline Bundle:** Penambahan library (mis. PDF writer atau font fallback) harus tetap menjaga ukuran `web/` dan APK Android tetap ramping dan startup cepat.

---

## 1. Baseline Fitur Wajib yang Sudah Ada (`v1.3.2`)

Fondasi inti berikut sudah tersedia di codebase dan **wajib dijaga agar tidak regresi**:

| Kategori | Fitur Tersedia | Lokasi Utama |
| :--- | :--- | :--- |
| **Canvas & Navigasi** | Skia CanvasKit 60+ FPS, Zoom/Pan, Grid, Rulers & Guides (`px/mm/cm/in/pt`), 10-Mode Smart Snapping | `src/renderer/canvasKitScene.tsx`, `src/components/editor/CanvasRulers.tsx`, `src/engine/figcraftSnap.tsx` |
| **Drawing & Bézier** | Select, Node Edit (16 aksi), Pen, Pencil, Brush, Curvature, Shape Builder, Line, Arc, 20 Shapes, Blob, Weave | `src/engine/drawTools.tsx`, `src/engine/nodeEditingAndHandles.tsx`, `src/engine/blobGenerator.tsx`, `src/engine/weaveGenerator.tsx` |
| **Boolean & Path** | Union, Subtract, Intersect, Exclude, Divide (Greiner-Hormann), Outline Stroke, Offset Path, 3-Mode Corner Fillet | `src/engine/pathBoolean.tsx`, `src/engine/pathOffset.tsx`, `src/engine/cornerFilletEngine.tsx` |
| **Typography** | On-canvas caret editing, IBM Plex Sans + Local `.TTF/.OTF` + Google Fonts embed, Text-to-Path (`opentype.js`) | `src/renderer/textLayout.tsx`, `src/engine/textToPath.tsx`, `src/components/editor/TextInspector.tsx` |
| **Color & Effects** | Dual Fill/Stroke (Solid, Linear, Radial, Angular + Gizmo), Color Styles, Color Guide, Recolor, 16 Blend Modes, Drop Shadow/Layer Blur/BG Blur | `src/engine/gradientEngine.tsx`, `src/engine/colorStyles.tsx`, `src/engine/effectsEngine.tsx`, `src/engine/blendModes.tsx` |
| **Layout & Struktur** | Virtualized Layer Tree, Groups, Frames, Auto-Layout (Row/Column/Grid), 9-Point Pin Grid, Align & Distribute | `src/engine/figmaAutoLayoutAndFrames.tsx`, `src/components/editor/LayerTreeViewport.tsx` |
| **Studio & AI** | SVGPeak VMT Auto-Trace, Apache ECharts Studio (22 tipe), Iconify (16.520+ ikon), Live SVG/JSX/Vue Inspector, 17 MCP Tools | `src/engine/svgpeak/`, `src/engine/charts/`, `src/components/modals/SvgCodeInspectorModal.tsx`, `scripts/mcp-server/` |

---

## 2. Matriks Prioritas Roadmap (`P0` – `P3`)

| Prioritas | Target Rilis | Fase & Inisiatif Utama | Dampak | Kompleksitas | Dependensi | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | `v1.4.0` | **Fase 1:** Refaktor Monolit (`VectorEditor.tsx`), Skia PathOps Boolean, Export Workflow Upgrade, Wireframe (`Shift+O`/`Ctrl+Shift+Y`) & Layer Panel Upgrade, Auto-Trace Worker Isolation | Sangat Tinggi | Tinggi | Baseline `v1.3.2` | `[x] Implemented (Core P0)` |
| **P1** | `v1.5.0` | **Fase 2:** Clipping/Alpha Mask & SVG Parser Upgrade, Export PDF Vector & Print Mode, Effects Engine v2, Knife/Scissors/Eraser & Arrowheads, Visual History Timeline | Sangat Tinggi | Tinggi | Fase 1 (`VectorEditor` modular) | `[x] Implemented` |
| **P2** | `v1.6.0` | **Fase 3:** Multi-Artboard/Multi-Page, Multiple Fills/Strokes + Image/Pattern Fill, Text on Path & Rich Text, Auto-Layout v2 & Constraints, Skew/Warp/Variable-Width | Tinggi | Sangat Tinggi | Fase 1 & 2 (Masking + SVG) | `[x] Implemented` |
| **P3** | `v2.0.0` | **Fase 4:** Reusable Components/Symbols & Text/Effect Styles, AI & MCP Server v2 (Visual Feedback), ECharts Studio v2, Workspace & Android/Tablet UX Polish | Tinggi | Tinggi | Fase 2 & 3 | `[x] Implemented` |

---

## 3. Rencana Implementasi Detail per Fase & Task

### Fase 1 (`P0`) — Arsitektur, Stabilitas & Quick Wins (Target: `v1.4.0`)

#### Task 1.1: Refaktor Monolitik `VectorEditor.tsx` & `EditorRightInspector.tsx`
**Files:**
- Modify: `src/components/editor/VectorEditor.tsx` (443 KB → target `< 60 KB` sebagai shell orkestrator)
- Modify: `src/components/editor/EditorRightInspector.tsx` (82 KB → pecah per section panel)
- Create: `src/components/editor/hooks/useCanvasPointerController.tsx`, `src/components/editor/hooks/useHistoryManager.tsx`, `src/components/editor/hooks/useSelectionController.tsx`, `src/components/editor/inspector/AppearanceSection.tsx`, `src/components/editor/inspector/TransformSection.tsx`
- Test: `tests/test_editor_refactor_smoke.py`

**Deliverables & Acceptance Criteria:**
- Seluruh handler pointer/keyboard, history stack, dan state seleksi terisolasi di custom hooks.
- Tidak ada regresi pada Draw Tools, Node Edit, Drag/Zoom, maupun Inspector panels.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_editor_refactor_smoke.py`) yang menguji open project, draw shape, drag, undo/redo, dan ubah properti di inspector via Playwright MCP.
- [ ] **Step 2:** Jalankan syntax check: `python C:\Users\Administrator\.gemini\config\scripts\check_syntax.py tests/test_editor_refactor_smoke.py`
- [ ] **Step 3:** Ekstrak hooks dan sub-komponen inspector secara bertahap tanpa mengubah API publik.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `npm test`, `check_syntax.py`, dan `python -m pytest tests/test_editor_refactor_smoke.py -v`.
- [ ] **Step 5:** Commit perubahan.

#### Task 1.2: Upgrade Boolean / Pathfinder Engine dengan Skia PathOps
**Files:**
- Modify: `src/engine/pathBoolean.tsx`
- Modify: `src/renderer/canvasKitRuntime.tsx`
- Test: `tests/test_boolean_pathops.py`

**Deliverables & Acceptance Criteria:**
- Operasi `Union`, `Subtract`, `Intersect`, `Exclude`, dan `Divide` menggunakan `CanvasKit.Path.MakeFromOp` secara analitik saat runtime CanvasKit tersedia, dengan fallback ke Greiner-Hormann untuk lingkungan headless Node/CLI.
- Tidak ada *curve drift* pada kurva Bézier saat Boolean dilakukan berulang kali (5x berturut-turut).
- [x] **Step 1:** Tulis test Python + Playwright (`tests/test_phase1_boolean_pathops.py`) untuk menguji operasi Boolean pada path bertumpuk.
- [x] **Step 2:** Jalankan `check_syntax.py` (RED) dan verifikasi skenario edge-case.
- [x] **Step 3:** Implementasikan adapter Skia PathOps → `Subpath[]` di `src/engine/pathBoolean.tsx` dengan cleanup Skia `.delete()` yang ketat.
- [x] **Step 4:** Jalankan `npm run typecheck`, `npm test`, `check_syntax.py`, dan `pytest tests/test_phase1_boolean_pathops.py`.
- [ ] **Step 5:** Commit perubahan.

#### Task 1.3: Upgrade Export Workflow & Nama File Dinamis
**Files:**
- Modify: `src/components/editor/hooks/useEditorExport.tsx`
- Modify: `src/components/editor/EditorRightInspector.tsx` (atau panel Export terkait)
- Test: `tests/test_export_workflow.py`

**Deliverables & Acceptance Criteria:**
- Menghilangkan hardcoded `'geovanta-edit.' + ext` di `useEditorExport.tsx`; nama file export otomatis mengikuti nama proyek (disanitasi untuk filesystem) atau nama layer terpilih saat mode `Selection Only`.
- Menambahkan slider **Quality (`10%–100%`)** untuk `JPG` & `WebP`, **Batch Export Presets** (export beberapa skala/format sekaligus), dan opsi **SVG Precision / Minify**.
- [x] **Step 1:** Tulis test Python + Playwright (`tests/test_phase1_export_workflow.py`) untuk memverifikasi nama file download dinamis, slider kualitas, dan batch export.
- [x] **Step 2:** Jalankan `check_syntax.py` dan jalankan test (RED).
- [x] **Step 3:** Implementasikan di `useEditorExport.tsx` dan `ExportInspectorSection.tsx`.
- [x] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_phase1_export_workflow.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 1.4: Outline / Wireframe View Mode (`Ctrl+Y`) & Layer Panel Upgrade
**Files:**
- Modify: `src/renderer/canvasKitScene.tsx`, `src/components/editor/hooks/useEditorShortcuts.tsx`
- Modify: `src/components/editor/EditorLeftSidebar.tsx`, `src/components/editor/LayerTreeViewport.tsx`, `src/components/editor/LayerRows.tsx`
- Test: `tests/test_wireframe_and_layers.py`

**Deliverables & Acceptance Criteria:**
- Shortcut `Ctrl+Y` mengaktifkan/menonaktifkan **Outline / Wireframe Mode** (merender seluruh path hanya sebagai hairline stroke 1px tanpa fill/effects).
- Layer Panel mendukung **Search & Filter** (nama, tipe objek, warna), **Shift+Click Range Selection**, **Batch Rename**, **Color Label**, dan **Isolation Mode** (double-click Group/Frame untuk mengedit isi tanpa ungroup).
- [x] **Step 1:** Tulis test Python + Playwright (`tests/test_phase1_wireframe_and_layers.py`) untuk mode Wireframe (`Shift+O`/`Ctrl+Shift+Y`), filter layer, dan isolation mode.
- [x] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [x] **Step 3:** Implementasikan renderer wireframe, `LayerSearchBar.tsx`, dan isolation mode.
- [x] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_phase1_wireframe_and_layers.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 1.5: Lazy-Load & Web Worker Isolation untuk Auto-Trace (`vmtEngineBundle.js`)
**Files:**
- Modify: `src/engine/imageTracerEngine.tsx`, `src/engine/svgpeak/vmtEngineBundle.js`, `scripts/build-offline-bundle.js`
- Create: `src/engine/svgpeak/vmtWorker.ts`
- Test: `tests/test_autotrace_worker.py`

**Deliverables & Acceptance Criteria:**
- `vmtEngineBundle.js` (886 KB) tidak dimuat saat initial boot Workspace/Editor; dimuat lazy ke dalam Dedicated Web Worker hanya saat user menjalankan Auto-Trace.
- UI tetap responsif 60 FPS (progress bar tetap halus, tombol Cancel berfungsi) selama tracing gambar 2000×2000 px.
- [x] **Step 1:** Tulis test Python + Playwright (`tests/test_phase1_autotrace_worker.py`) yang memverifikasi `vmt-worker.js` terpisah dari bundle utama dan Auto-Trace berjalan di worker.
- [x] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [x] **Step 3:** Implementasikan `vmtWorker.ts` dan sesuaikan `scripts/build-offline-bundle.js` agar aset worker ikut terbundel 100% offline.
- [x] **Step 4:** Jalankan `npm run build:web`, `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_phase1_autotrace_worker.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

---

### Fase 2 (`P1`) — Fitur Wajib Standar Industri (Target: `v1.5.0`)

#### Task 2.1: Clipping Mask & Alpha/Luminance Mask Arbitrer + Upgrade SVG Parser
**Files:**
- Modify: `src/types/vectorTypes.ts`, `src/renderer/canvasKitScene.tsx`
- Modify: `src/engine/svgDocumentParser.tsx`, `src/engine/svgDocumentSerializer.tsx`
- Modify: `src/components/editor/LayerRows.tsx`, `src/components/ui/ContextMenu.tsx`
- Test: `tests/test_masking_and_svg_import.py`

**Deliverables & Acceptance Criteria:**
- Mendukung **Clipping Mask** (`clipPath` menggunakan sembarang path/shape/teks) dan **Alpha/Luminance Mask** melalui Context Menu (`Make Clipping Mask` / `Release Mask`) serta indikator hierarki di Layer Tree.
- `svgDocumentParser.tsx` mendukung penuh `<clipPath>`, `<mask>`, `<use>`, `<pattern>`, `<marker>`, `<filter>`, dan `<style>` CSS class saat impor SVG eksternal.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_masking_and_svg_import.py`) menguji pembuatan/pelepasan Clipping Mask dan round-trip import/export SVG kompleks.
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan clipping/masking Skia (`saveLayer` / `clipPath`) dan perluasan parser/serializer SVG.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `npm test`, `check_syntax.py`, dan `pytest tests/test_masking_and_svg_import.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 2.2: Export PDF Vector & Print-Ready Mode (CMYK, Bleed, Crop Marks, 300 DPI)
**Files:**
- Modify: `src/engine/postscriptAiRasterIo.tsx`, `src/components/editor/hooks/useEditorExport.tsx`
- Create: `src/engine/pdfVectorExporter.ts`
- Test: `tests/test_pdf_and_print_export.py`

**Deliverables & Acceptance Criteria:**
- Export **`.PDF` Vector murni** (offline generator tanpa server) mendukung path Bézier, gradien, dan teks (embedded/outlined).
- Opsi **Print-Ready**: pengaturan **Bleed (`mm`/`pt`)**, **Crop Marks**, **DPI (`72`/`150`/`300`)**, dan **CMYK Color Conversion** (beserta soft-proof preview toggle di canvas).
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_pdf_and_print_export.py`) untuk memvalidasi struktur header/stream PDF hasil export dan keberadaan bleed/crop marks.
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan `pdfVectorExporter.ts` dan integrasikan ke `useEditorExport.tsx` serta UI Export.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_pdf_and_print_export.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 2.3: Effects Engine v2 (Inner Shadow, Glow, Spread, Noise/Grain)
**Files:**
- Modify: `src/engine/effectsEngine.tsx`, `src/renderer/canvasKitScene.tsx`, `src/engine/svgDocumentParser.tsx`, `src/engine/svgDocumentSerializer.tsx`
- Modify: `src/components/editor/EditorRightInspector.tsx`
- Test: `tests/test_effects_v2.py`

**Deliverables & Acceptance Criteria:**
- Menambah tipe efek `innerShadow`, `outerGlow`, `innerGlow`, dan `noiseGrain` pada `effectsEngine.tsx` (tetap Node-safe & pure JS).
- Menambah parameter `spread` pada `dropShadow` dan `innerShadow`.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_effects_v2.py`) untuk validasi skema efek, render canvas, dan serialization `data-effects`.
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan rendering efek baru di `canvasKitScene.tsx` dan kontrol UI di Inspector.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `npm test`, `check_syntax.py`, dan `pytest tests/test_effects_v2.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 2.4: Knife / Scissors Tool, True Vector Eraser & Arrowheads / Line Markers
**Files:**
- Modify: `src/engine/drawTools.tsx`, `src/engine/strokeStyles.tsx`, `src/renderer/canvasKitScene.tsx`
- Modify: `src/components/editor/EditorFloatingToolbar.tsx`, `src/types/vectorTypes.ts`
- Test: `tests/test_knife_eraser_markers.py`

**Deliverables & Acceptance Criteria:**
- **Knife Tool:** Memotong satu atau banyak objek vektor sepanjang garis/kurva bebas menjadi bagian tertutup baru.
- **Scissors Tool:** Membelah path di titik anchor/segmen yang diklik.
- **True Vector Eraser:** Menghapus area stroke/fill dengan membelah geometri path secara bersih.
- **Line Markers / Arrowheads:** Start/End marker (*Arrow, Stealth, Dot, Diamond, Bar*) dengan ukuran proporsional terhadap `strokeWidth`.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_knife_eraser_markers.py`) untuk setiap tool dan marker export SVG.
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan geometri pemotongan path dan renderer marker di CanvasKit + SVG serializer.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_knife_eraser_markers.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 2.5: Visual History Panel & Named Version Snapshots
**Files:**
- Modify: `src/workspace/workspaceDb.tsx`, `src/workspace/projectRepository.tsx`
- Create: `src/components/editor/HistoryTimelinePanel.tsx`
- Test: `tests/test_history_snapshots.py`

**Deliverables & Acceptance Criteria:**
- Panel History menampilkan daftar aksi berlabel (mis. *"Draw Rectangle"*, *"Boolean Union"*, *"Change Fill"*) dan memungkinkan klik langsung untuk melompat ke state mana pun.
- Pengguna dapat menyimpan **Named Version Snapshot** secara manual dengan timestamp & deskripsi di IndexedDB (ikut ter-backup di `.geovanta`).
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_history_snapshots.py`).
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan metadata label pada history stack dan `HistoryTimelinePanel.tsx`.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_history_snapshots.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

---

### Fase 3 (`P2`) — Pro Vector & Design System (Target: `v1.6.0`)

#### Task 3.1: Multi-Artboard / Multi-Page dalam Satu Dokumen
**Files:**
- Modify: `src/types/vectorTypes.ts`, `src/engine/svgDocumentParser.tsx`, `src/engine/svgDocumentSerializer.tsx`
- Modify: `src/renderer/canvasKitScene.tsx`, `src/components/editor/hooks/useEditorExport.tsx`
- Create: `src/components/editor/ArtboardManagerPanel.tsx`
- Test: `tests/test_multi_artboard.py`

**Deliverables & Acceptance Criteria:**
- `VectorDocument` mendukung `artboards: ArtboardSpec[]` sambil tetap membaca `viewBox` tunggal untuk proyek lama.
- Dapat membuat, memindahkan, mengubah ukuran, menduplikasi, dan mengekspor per-artboard (atau seluruh artboard ke multi-page PDF).
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_multi_artboard.py`) mencakup backward-compatibility proyek `v1.3.2` dan multi-artboard export.
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan `ArtboardSpec`, rendering multi-artboard di CanvasKit, dan panel manajemen artboard.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `npm test`, `check_syntax.py`, dan `pytest tests/test_multi_artboard.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 3.2: Multiple Fills & Multiple Strokes (Appearance Stack) + Image & Pattern Fill
**Files:**
- Modify: `src/types/vectorTypes.ts`, `src/renderer/canvasKitScene.tsx`, `src/components/editor/inspector/AppearanceSection.tsx`
- Test: `tests/test_appearance_stack.py`

**Deliverables & Acceptance Criteria:**
- Setiap objek mendukung `fills: PaintSlot[]` dan `strokes: StrokeSlot[]` yang dapat ditambah, diurutkan ulang, di-toggle visibilitasnya, dan diberi blend mode per slot (dengan migrasi otomatis dari `fill`/`stroke` tunggal).
- Mendukung **Image Fill** (mode *Fill, Fit, Crop, Tile*) dan **Vector Pattern Fill** (`<pattern>`).
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_appearance_stack.py`).
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan stack renderer di CanvasKit, serializer SVG, dan UI Appearance Stack.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_appearance_stack.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 3.3: Text on Path & Rich Text (Mixed Styling) + Variable Fonts & OpenType
**Files:**
- Modify: `src/renderer/textLayout.tsx`, `src/engine/textToPath.tsx`, `src/components/editor/TextInspector.tsx`
- Test: `tests/test_typography_pro.py`

**Deliverables & Acceptance Criteria:**
- **Text on Path:** Teks dapat ditempelkan ke sembarang path/kurva dengan kontrol *Start Offset*, *Flip Side*, dan *Convert to Path*.
- **Rich Text:** Pewarnaan, bold, italic, ukuran, dan underline per-rentang karakter (*span*) dalam satu text box.
- **Variable Fonts & OpenType:** Slider axis (`wght`, `wdth`, `slnt`), ligatures, tabular figures, bullet/numbered list, serta verifikasi RTL/CJK/Emoji fallback.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_typography_pro.py`).
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan layout & caret editing untuk rich text spans serta text-on-path glyph placement.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_typography_pro.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 3.4: Auto-Layout v2 & Responsive Frame Constraints
**Files:**
- Modify: `src/engine/figmaAutoLayoutAndFrames.tsx`, `src/components/editor/EditorRightInspector.tsx`
- Test: `tests/test_autolayout_v2.py`

**Deliverables & Acceptance Criteria:**
- Menambah mode sizing per-child: **Fixed**, **Hug Contents**, dan **Fill Container**.
- Menambah **Min/Max Width & Height**, **Absolute Position** untuk child di dalam Auto-Layout, serta **Constraints** (*Left/Right/Top/Bottom/Center/Scale*) pada Frame non-Auto-Layout.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_autolayout_v2.py`).
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan solver layout baru di `figmaAutoLayoutAndFrames.tsx` dan UI Inspector.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `npm test`, `check_syntax.py`, dan `pytest tests/test_autolayout_v2.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 3.5: Transform & Distortion Lanjutan + Variable-Width Stroke (Stylus Pressure)
**Files:**
- Modify: `src/engine/affineAndOrientedBox.tsx`, `src/engine/freehandEngine.tsx`, `src/engine/strokeStyles.tsx`
- Create: `src/engine/warpAndBlendEngine.ts`
- Test: `tests/test_distortion_and_pressure.py`

**Deliverables & Acceptance Criteria:**
- Mendukung **Skew / Shear**, **Perspective Distort**, **Envelope / Mesh Warp**, dan **Object Blend / Interpolate** (N-langkah transisi antar 2 shape/warna).
- **Variable-Width Stroke & Stylus Pressure:** Menangkap `PointerEvent.pressure` / `tiltX` / `tiltY` pada Pencil/Brush dan menyimpannya sebagai profil lebar stroke (*Width Tool*).
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_distortion_and_pressure.py`).
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan engine distorsi/blend dan renderer variable-width stroke.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_distortion_and_pressure.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

---

### Fase 4 (`P3`) — Ekosistem, Reusable System, AI & Mobile Polish (Target: `v2.0.0`)

#### Task 4.1: Reusable Components / Symbols & Instances + Text/Effect Styles
**Files:**
- Modify: `src/types/vectorTypes.ts`, `src/engine/colorStyles.tsx`, `src/components/editor/LayerTreeViewport.tsx`
- Create: `src/engine/componentSymbolEngine.ts`
- Test: `tests/test_components_and_styles.py`

**Deliverables & Acceptance Criteria:**
- Membuat **Master Component / Symbol** dan **Instance**; perubahan pada Master otomatis mempropagasikan ke semua Instance sambil mempertahankan override properti (teks, warna, visibilitas).
- Menambahkan **Text Styles** dan **Effect Styles** di samping Color Styles yang sudah ada.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_components_and_styles.py`).
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan propagasi Master-Instance dan Style registry.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_components_and_styles.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 4.2: AI & MCP Server v2 (Visual Feedback Loop & Expanded Tools)
**Files:**
- Modify: `scripts/mcp-server/index.js`, `scripts/mcp-server/tools.js`, `scripts/mcp-server/engineAdapter.js`
- Test: `tests/test_mcp_v2.py`

**Deliverables & Acceptance Criteria:**
- Menambahkan MCP tool **Visual Screenshot Feedback** (`geovanta_live_screenshot`) yang mengembalikan PNG base64 kanvas aktif ke AI agent untuk inspeksi visual mandiri.
- Mengekspos fitur **Charts Studio, Auto-Trace, Auto-Layout, Effects v2, dan Typography** ke MCP tools.
- [ ] **Step 1:** Tulis test Python (`tests/test_mcp_v2.py`) untuk protokol MCP tool schema dan eksekusi headless/live.
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan MCP tools baru dan bridge WebSocket di aplikasi.
- [ ] **Step 4:** Jalankan `npm test`, `check_syntax.py`, dan `pytest tests/test_mcp_v2.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 4.3: Apache ECharts Vector Studio v2
**Files:**
- Modify: `src/components/editor/ChartDataEditor.tsx`, `src/engine/charts/chartVectorRenderer.ts`, `src/engine/charts/echartsOptionBuilder.ts`
- Test: `tests/test_charts_v2.py`

**Deliverables & Acceptance Criteria:**
- Import data langsung dari file `.csv`, `.tsv`, dan `.xlsx` offline.
- Sinkronisasi palet chart dengan **Color Styles** proyek, serta simplifikasi otomatis untuk mengurangi jumlah node berlebih saat *Detach to Pure Vector*.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_charts_v2.py`).
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan parser CSV/TSV/XLSX offline dan optimizer detach vector.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_charts_v2.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

#### Task 4.4: Workspace Organization & Android/Tablet UX Polish
**Files:**
- Modify: `src/components/workspace/WorkspaceHome.tsx`, `src/styles/mobileStyles.ts`, `src/bridge/androidNativeBridge.ts`
- Test: `tests/test_workspace_and_mobile_polish.py`

**Deliverables & Acceptance Criteria:**
- **WorkspaceHome:** Folder & Tag proyek, **Custom User Templates**, serta opsional local-folder sync (Tauri).
- **Android/Tablet:** Stylus **Palm Rejection** (abaikan touch jari saat stylus aktif), dukungan **External Keyboard Shortcuts** di Android, dan **Memory Guard** untuk mencegah OOM pada export 4x di HP RAM 4–6 GB.
- [ ] **Step 1:** Tulis test Python + Playwright (`tests/test_workspace_and_mobile_polish.py`) dengan emulasi viewport mobile/tablet & touch events.
- [ ] **Step 2:** Jalankan `check_syntax.py` dan test (RED).
- [ ] **Step 3:** Implementasikan fitur organisasi workspace dan guard mobile.
- [ ] **Step 4:** Jalankan `npm run typecheck`, `check_syntax.py`, dan `pytest tests/test_workspace_and_mobile_polish.py` (GREEN).
- [ ] **Step 5:** Commit perubahan.

---

## 4. Standar Verifikasi & Definisi Selesai (Definition of Done)

Setiap task di atas hanya boleh ditandai selesai (`[x]`) setelah seluruh pemeriksaan berikut lulus dengan output fresh:

1. **Syntax Check (Wajib di RED & GREEN):**
   - Python tests: `python C:\Users\Administrator\.gemini\config\scripts\check_syntax.py tests/<test_file>.py`
   - TypeScript: `npm run typecheck` (`tsc --noEmit` — 0 errors)
2. **Unit Tests:**
   - `npm test` (`node --test tests/*.test.cjs` — seluruh suite lulus)
3. **End-to-End & Visual Verification (Python + Playwright + Playwright MCP):**
   - `python -m pytest tests/<test_file>.py -v`
   - Verifikasi interaktif menggunakan Playwright MCP (`navigate`, `click`, `fill`, `screenshot`, `assert`) pada fitur UI/Canvas terkait.
4. **Offline Bundle Integrity:**
   - `npm run build:web` berhasil membangun `dist/` dan `web/` tanpa error serta tetap berjalan 100% offline.
