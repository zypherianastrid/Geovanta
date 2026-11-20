# Simplify Strip Bottom-Center & Debug Menu Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memindahkan popup/strip Simplify agar tampil statis di tengah bawah canvas (viewport canvas, bukan mengikuti objek terpilih), menghapus total menu debug dari Pengaturan (SettingsModal), serta meredesain menu debug di pojok kanan bawah (DebugLogPanel & tombol launcher) dengan membuang semua native HTML input (menggantinya dengan CustomTextBox dan Select kustom) serta menambahkan tab visual & engine debug yang dibutuhkan.

**Architecture:**
- Posisi `EditorSimplifyStrip` diubah dari dinamis berdasarkan bounding box objek (`bb` × `zoom` + `pan`) menjadi posisi tetap viewport canvas (`left: 50%`, `bottom: 76px`, `transform: translateX(-50%)`), tepat di atas `EditorFloatingToolbar`.
- Di `SettingsModal.tsx`, fungsi debug menu (tombol debug, panel overlay render, skenario uji, tombol benchmark) dihapus tuntas.
- Di `DebugLogPanel.tsx`, seluruh native HTML input (`<select>` dan `<input>`) digantikan dengan `Select` kustom dari `src/components/ui/SelectDropdown.tsx` dan `CustomTextBox` dari `src/components/ui/CustomTextBox.tsx`.
- Tombol trigger debug di pojok kanan bawah [VectorEditor.tsx](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Geovanta-live-Caret-Typing/Geovanta-live-Caret-Typing/src/components/editor/VectorEditor.tsx#L9378) diredesain menjadi floating status badge modern.
- Menambahkan tab "Engine & Visual" pada `DebugLogPanel` yang menampung kontrol geometri/tessellation overlay, kartu telemetri render GPU/CPU (FPS, Vertices, LOD, Cache), serta skenario uji render yang sebelumnya ada di pengaturan.

**Tech Stack:** React 18, TypeScript/TSX, Tailwind CSS offline bundle, Custom UI primitives (`CustomTextBox`, `SelectDropdown`, `SegmentedControl`, `IconGlyphs`), Playwright Test (`@playwright/test`).

**Spec:** Desain yang disepakati dari user request:
1. Simplify popup berada di tengah bawah canvas, bukan mengikuti objek.
2. Hapus total fungsi debug menu yang ada di pengaturan.
3. Redesign debug menu di kanan bawah pojok sidebar kanan.
4. Hapus semua native html inputnya, ganti dengan custom input.
5. Tambahkan fitur debugging yang dibutuhkan (Engine/Visual overlay & telemetri).

## Global Constraints

- 0% Native HTML inputs pada panel debug (wajib memakai `CustomTextBox` dan `Select`).
- Offline bundle harus tetap build bersih (`npm run build:web`).
- Semua pengujian diverifikasi dengan Playwright (`npx playwright test`).

## Review Focus

- Simplify strip tidak bergeser saat kanvas di-pan atau di-zoom.
- Simplify strip tidak menimpa atau tertutup oleh `EditorFloatingToolbar`.
- Modal Settings (`SettingsModal.tsx`) tidak memiliki regresi pada tab umum/interaksi/shortcut/about saat blok debug dihapus.
- `CustomTextBox` dan `Select` di `DebugLogPanel` bekerja mulus tanpa event leakage (tidak men-trigger pan/zoom kanvas atau shortcut global).
- Debug overlay (mesh, wireframe, dll.) berfungsi normal saat diaktifkan dari tab Engine Debug di panel debug yang baru.

---

### Task 1: Reposisi Simplify Strip ke Tengah Bawah Canvas

**Files:**
- Modify: `src/components/editor/EditorSimplifyStrip.tsx`
- Modify: `src/components/editor/VectorEditor.tsx:9159-9174`
- Test: `tests/simplify-strip-position.spec.ts`

**Interfaces:**
- `EditorSimplifyStrip` menerima prop opsional posisi statis atau menggunakan style default `left: '50%'`, `bottom: '76px'`, `top: 'auto'`, `transform: 'translateX(-50%)'`.
- `VectorEditor.tsx`: pada pemanggilan `<EditorSimplifyStrip ... />`, tidak lagi menghitung koordinat `bb` (`cx`, `by`).

- [ ] **Step 1: Write Playwright test**
Buat `tests/simplify-strip-position.spec.ts` untuk memastikan posisi strip Simplify di-render di tengah bawah canvas (`bottom: 76px`, `left: 50%`, `transform: translateX(-50%)`).

- [ ] **Step 2: Run Playwright test to verify failure**
Jalankan: `npx playwright test tests/simplify-strip-position.spec.ts`
Ekspektasi: FAIL (karena implementasi masih menghitung `leftPx` dan `topPx` dari bounding box objek).

- [ ] **Step 3: Update `EditorSimplifyStrip.tsx` dan `VectorEditor.tsx`**
- Di `EditorSimplifyStrip.tsx`: ubah container agar menggunakan posisi tetap `bottom: 76px`, `left: '50%'`, `transform: 'translateX(-50%)'` bila diposisikan di kanvas.
- Di `VectorEditor.tsx`: hapus perhitungan `cx` dan `by` dari `bb` pada `vcSimp.mode === 'slider'`. Gunakan posisi statis tengah bawah.

- [ ] **Step 4: Run Playwright test to verify pass**
Jalankan: `npx playwright test tests/simplify-strip-position.spec.ts`
Ekspektasi: PASS.

---

### Task 2: Hapus Total Fungsi Debug Menu di Pengaturan (`SettingsModal.tsx`)

**Files:**
- Modify: `src/components/modals/SettingsModal.tsx`
- Test: `tests/settings-no-debug.spec.ts`

**Interfaces:**
- `SettingsModal` tidak lagi memiliki state `debugModeOpen` dan tombol `L.debugBtn`.
- Bagian debug overlay, skenario uji, benchmark runner, dan hasil benchmark dihapus dari modal pengaturan.

- [ ] **Step 1: Write Playwright test**
Buat `tests/settings-no-debug.spec.ts` untuk memverifikasi bahwa modal Settings tidak lagi merender tombol debug atau elemen debug geometry/benchmark di dalamnya.

- [ ] **Step 2: Run Playwright test to verify failure**
Jalankan: `npx playwright test tests/settings-no-debug.spec.ts`
Ekspektasi: FAIL (karena tombol debug dan section debug masih ada di `SettingsModal.tsx`).

- [ ] **Step 3: Implement clean removal in `SettingsModal.tsx`**
- Hapus state `debugModeOpen`.
- Hapus tombol `<button ...>{L.debugBtn}</button>`.
- Hapus blok container `debugModeOpen ? 'flex' : 'none'`.
- Bersihkan pemanggilan dan props debug yang tidak lagi dipakai.

- [ ] **Step 4: Run Playwright test to verify pass**
Jalankan: `npx playwright test tests/settings-no-debug.spec.ts`
Ekspektasi: PASS.

---

### Task 3: Redesign Debug Menu Kanan Bawah & Hapus Native Input

**Files:**
- Modify: `src/components/editor/DebugLogPanel.tsx`
- Modify: `src/components/editor/VectorEditor.tsx` (launcher button & props passing)
- Test: `tests/debug-panel-custom-inputs.spec.ts`

**Interfaces:**
- `DebugLogPanel` menerima props:
  - `open: boolean`
  - `enabled: boolean`
  - `onToggle: () => void`
  - `onClose: () => void`
  - `renderCfg?: any`
  - `setRenderCfg?: (patch: any) => void`
  - `curZoom?: number`
  - `setZ?: (z: number) => void`
  - `loadTestSvg?: (svg: string, label: string) => void`
  - `loadTestDoc?: (doc: any, label: string) => void`
  - `runAutomatedBenchmarks?: () => void`
  - `benchResults?: any`
- `CustomTextBox` menggantikan `<input>` untuk pencarian log.
- `Select` dari `SelectDropdown.tsx` menggantikan `<select>` kategori log.
- Tab bar baru: `['log', 'Log Live']`, `['console', 'Konsol Fungsi']`, `['engine', 'Engine & Visual']`.
- Tab 3 ("Engine & Visual") menampilkan:
  - Geometri render debug mode pills (`none`, `original`, `polyline`, `mesh`, `fill_tris`, `stroke_tris`, `seam_guard`).
  - Telemetri realtime (FPS, pass time, vertices, cache ratio, active backend).
  - Test scenarios & benchmark runner.

- [ ] **Step 1: Write Playwright test**
Buat `tests/debug-panel-custom-inputs.spec.ts` yang memverifikasi bahwa `DebugLogPanel`:
1. Tidak memiliki elemen `<select>` native atau `<input>` native.
2. Memiliki `CustomTextBox` dan dropdown `Select` kustom.
3. Memiliki tab "Log", "Konsol Fungsi", dan "Engine & Visual".
4. Tombol launcher di pojok kanan bawah memiliki styling modern dengan indikator status.

- [ ] **Step 2: Run Playwright test to verify failure**
Jalankan: `npx playwright test tests/debug-panel-custom-inputs.spec.ts`
Ekspektasi: FAIL.

- [ ] **Step 3: Implement redesigned `DebugLogPanel.tsx` dan launcher di `VectorEditor.tsx`**
- Ganti `<select>` native dengan `Select` kustom.
- Ganti `<input>` native dengan `CustomTextBox`.
- Tambahkan tab `engine` (Engine & Visual Debug) yang menampung fitur-fitur debug visual dan benchmark.
- Hubungkan `renderCfg`, `setRenderCfg`, dan benchmark API dari `VectorEditor.tsx` ke `DebugLogPanel`.
- Redesign tombol trigger floating di pojok kanan bawah dengan ikon terminal/code dan status dot.

- [ ] **Step 4: Run Playwright test to verify pass**
Jalankan: `npx playwright test tests/debug-panel-custom-inputs.spec.ts`
Ekspektasi: PASS.

---

### Task 4: Verifikasi Menyeluruh & Build Bundle Offline

**Files:**
- Verification only

- [ ] **Step 1: Jalankan seluruh suite tes Playwright yang relevan**
Jalankan: `npx playwright test tests/simplify-strip-position.spec.ts tests/settings-no-debug.spec.ts tests/debug-panel-custom-inputs.spec.ts`
Ekspektasi: Semua PASS.

- [ ] **Step 2: Build bundle offline**
Jalankan: `npm run build:web`
Ekspektasi: Sukses tanpa error.
