# Rencana Implementasi: Tahap 2 — Geometri & Gambar (Boolean Divide, Compound Path, & Freehand Drawing)

Dokumen Rujukan Desain: [2026-11-20-tahap2-geometri-gambar-design.md](../specs/2026-11-20-tahap2-geometri-gambar-design.md)  
Tanggal: 2026-11-20  
Mode Eksekusi: Subagent-Driven Development (SDD)  

---

## Global Constraints & Aturan Wajib
1. **Mandatory Playwright Regular & Playwright MCP:**
   - Semua pengujian kode wajib menggunakan `@playwright/test` dan dieksekusi dengan `npx playwright test`. Penggunaan Jest, Vitest, Cypress, Mocha, atau node:test dilarang keras.
   - Eksplorasi interaktif dan verifikasi visual langsung pada peramban wajib menggunakan tool Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, dsb.).
2. **Ketergantungan Eksternal:**
   - Zero new npm dependencies. Gunakan pustaka dan modul matematika/geometri yang sudah ada di codebase (`adaptiveCubicFlattener.tsx`, `curveFittingAndAnomalies.tsx`, `vectorPrimitives.tsx`).
3. **Kompatibilitas Sistem Operasi & Shell:**
   - Lingkungan Windows PowerShell 5.1. Dilarang menggunakan operator chaining bash `&&`. Gunakan titik koma `;` dan `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };`.
4. **Kualitas Kode & Build:**
   - Wajib lolos `npm run typecheck` dengan 0 error TypeScript.
   - Wajib lolos `npm run build:web` menghasilkan bundle offline 100%.
5. **Integritas Komponen Editor:**
   - Jaga ketat `PELINDUNG HOOKS` dan struktur hooks React di `src/components/editor/EditorRightInspector.tsx` dan `VectorEditor.tsx`.

---

## Daftar Tugas (Task Breakdown)

### Task 1: Boolean Divide Engine & Compound Path Pure Functions
- **Tujuan:** Mengimplementasikan operasi Boolean Divide (`booleanDoc(..., 'divide')`) dan pure function manajemen compound path (`makeCompoundPathDoc`, `releaseCompoundPathDoc`).
- **File Target:**
  - `src/engine/pathBoolean.tsx`: Tambahkan cabang `op === 'divide'` pada `booleanDoc` menggunakan algoritma partisi iteratif `clipRings(..., 'intersect')` dan `clipRings(..., 'difference')`, pembentukan objek-objek mandiri disjoint dengan inheritance styling objek teratas.
  - `src/engine/compoundPathEngine.tsx`: Modul baru untuk `makeCompoundPathDoc` (menggabungkan subpath $N \ge 2$ objek dengan `fillRule: 'evenodd'`) dan `releaseCompoundPathDoc` (memecah objek `subs.length > 1` menjadi $N$ objek terpisah).
  - `src/engine/vectorEngine.tsx`: Ekspor `makeCompoundPathDoc` dan `releaseCompoundPathDoc`.
  - `tests/tahap2-boolean-divide-and-compound.spec.ts`: Test Playwright Regular untuk verifikasi matematis partisi geometri dan dekonstruksi compound path.
- **Kriteria Selesai:**
  - Test `tests/tahap2-boolean-divide-and-compound.spec.ts` lulus 100%.
  - Commit terpisah untuk Task 1.

---

### Task 2: Freehand Drawing Engine (Pencil Tool & Smooth Vector Brush)
- **Tujuan:** Membangun engine matematika penggambaran bebas dengan stabilisasi dan fitting kurva Bézier kubik minimal-node.
- **File Target:**
  - `src/engine/freehandEngine.tsx`:
    - Point sampler & distance filter ($\ge 2\text{px}$).
    - Stabilizer / moving average smoothing filter.
    - Bézier curve fitting menggunakan `schneiderFit` dari `curveFittingAndAnomalies.tsx`.
    - Auto-close detection (jarak awal-akhir $\le 10\text{px}$).
    - Pencil subpath builder (`createPencilObject`).
    - Smooth vector brush ribbon builder (`createBrushObject`) yang merespons tekanan (`e.pressure`) atau kecepatan mouse.
  - `src/engine/vectorEngine.tsx`: Ekspor helper dari `freehandEngine.tsx`.
  - `tests/tahap2-freehand-engine.spec.ts`: Test Playwright Regular untuk validasi filter, smoothing, fitting Schneider, dan pembentukan ribbon brush.
- **Kriteria Selesai:**
  - Test `tests/tahap2-freehand-engine.spec.ts` lulus 100%.
  - Commit terpisah untuk Task 2.

---

### Task 3: Editor Toolbar, Canvas Interaction, Keyboard Shortcuts & Context Menu
- **Tujuan:** Mengintegrasikan tool Pencil & Brush ke antarmuka editor, menambahkan tombol Boolean Divide, Make/Release Compound Path ke toolbar & menu konteks, serta mengikat pintasan keyboard.
- **File Target:**
  - `src/constants/editorToolsAndShapes.tsx`: Daftarkan `pencil` dan `brush` pada `VE_DRAW_GROUP` dan `VE_DRAW_TOOLS`.
  - `src/components/editor/EditorFloatingToolbar.tsx`: Tambahkan `divide` pada `BOOL_ITEMS`.
  - `src/components/editor/VectorEditor.tsx`:
    - Handler pointer down/move/up untuk `tool === 'pencil'` dan `tool === 'brush'` dengan live preview 60 FPS dan commit saat pointer up.
    - Fungsi `applyMakeCompoundPath` dan `applyReleaseCompoundPath`.
    - Integrasi menu konteks untuk Compound Path (`Ctrl+8` / `Ctrl+Shift+8`) dan Divide.
  - `src/components/editor/hooks/useEditorShortcuts.tsx`:
    - Tambahkan shortcut `Ctrl+Alt+D` (Divide).
    - Tambahkan shortcut `Ctrl+8` (Make Compound Path) dan `Ctrl+Shift+8` (Release Compound Path).
    - Tambahkan shortcut untuk Pencil/Brush.
  - `src/constants/appI18n.tsx` & `src/constants/tooltipsCatalog.tsx`: Tambahkan kamus i18n dan tooltip untuk tool dan menu baru (ID & EN).
  - `tests/tahap2-drawing-and-compound-ui-e2e.spec.ts`: E2E test Playwright Regular untuk memverifikasi interaksi kanvas gambar bebas, operasi Divide, dan Make/Release Compound Path melalui UI/keyboard.
- **Kriteria Selesai:**
  - Test `tests/tahap2-drawing-and-compound-ui-e2e.spec.ts` lulus 100%.
  - Commit terpisah untuk Task 3.

---

### Task 4: Full Regression, Typecheck, Build, & Playwright MCP Live Exploration
- **Tujuan:** Verifikasi penuh kestabilan seluruh sistem dan verifikasi visual interaktif dengan Playwright MCP.
- **Langkah:**
  - Jalankan `npm run typecheck` (0 error).
  - Jalankan `npm run build:web` (bundle sukses).
  - Jalankan semua test Playwright Regular (`tests/tahap1-*.spec.ts` dan `tests/tahap2-*.spec.ts`).
  - Lakukan eksplorasi langsung di browser via Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_take_screenshot`) untuk membuktikan goresan pensil/brush di kanvas dan operasi divide/compound path.
- **Kriteria Selesai:**
  - 100% test lulus, typecheck bersih, verifikasi Playwright MCP berhasil dengan bukti screenshot/snapshot.

---

### Task 5: Whole-Branch Review & Tahap 2 Completion
- **Tujuan:** Menjalankan peninjauan komprehensif seluruh branch untuk Tahap 2 oleh subagent reviewer independen.
- **Kriteria Selesai:**
  - Laporan review menyeluruh tanpa temuan Critical atau Important terbuka.
  - Update SDD ledger progress dan task tracking.
