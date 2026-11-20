# Rencana Implementasi: Tahap 3 — SVG Dev Workflow & Code Editor (Optimizer, Presets, & Live Two-Way XML Inspector)

Dokumen Rujukan Desain: [2026-11-20-tahap3-svg-dev-workflow-design.md](../specs/2026-11-20-tahap3-svg-dev-workflow-design.md)  
Tanggal: 2026-11-20  
Mode Eksekusi: Subagent-Driven Development (SDD)  

---

## Global Constraints & Aturan Wajib
1. **Mandatory Playwright Regular & Playwright MCP:**
   - Semua pengujian unit, integrasi, dan E2E wajib menggunakan `@playwright/test` dan dieksekusi dengan `npx playwright test`. Dilarang keras menggunakan Jest, Vitest, Cypress, Mocha, atau node:test.
   - Eksplorasi interaktif dan verifikasi visual langsung pada peramban wajib menggunakan tool Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_take_screenshot`, dsb.).
2. **Ketergantungan Eksternal:**
   - Zero new npm dependencies. Gunakan pustaka murni dan standar web API (`DOMParser`, `XMLSerializer`, string manipulasi regex performan).
3. **Kompatibilitas Sistem Operasi & Shell:**
   - Lingkungan Windows PowerShell 5.1. Dilarang menggunakan operator chaining bash `&&`. Gunakan titik koma `;` dan `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };`.
4. **Kualitas Kode & Build:**
   - Wajib lolos `npm run typecheck` dengan 0 error TypeScript.
   - Wajib lolos `npm run build:web` menghasilkan bundle offline 100%.
5. **Integritas Komponen Editor:**
   - Jaga ketat `PELINDUNG HOOKS` dan struktur hooks React di `src/components/editor/EditorRightInspector.tsx` dan `VectorEditor.tsx`.

---

## Daftar Tugas (Task Breakdown)

### Task 1: Built-in SVG Optimizer / Minifier & Export Code Presets Engine
- **Tujuan:** Mengimplementasikan mesin optimasi SVG murni dan generator preset ekspor kode modern (Web Minified, React JSX, Vue SFC, CSS Data URI).
- **File Target:**
  - `src/engine/svgOptimizer.tsx`:
    - `optimizeSvg(svgString, options)`: decimal precision rounding, pruning `<metadata>` dan atribut `data-*`, pemangkasan `<defs>` tak terpakai, whitespace collapse, color shortening.
    - `generateExportCode(doc, format, options)`:
      - `'svg-minified'`: SVG terkompresi.
      - `'react-jsx'`: Komponen React fungsional dengan atribut camelCase, `className`, props spreading.
      - `'vue-sfc'`: Komponen Vue 3 SFC dengan `<template>` dan `<script setup>`.
      - `'css-data-uri'`: CSS `url('data:image/svg+xml;utf8,...')` yang ter-encode bersih.
    - `prettifyXml(svgString)`: Formatter indentasi hierarkis (2 spasi).
  - `src/engine/vectorEngine.tsx`: Re-export fungsi-fungsi optimizer pada objek `VE`.
  - `tests/tahap3-svg-optimizer-and-presets.spec.ts`: Test Playwright Regular untuk validasi optimizer, decimal precision, pruning defs, dan semua preset ekspor kode.
- **Kriteria Selesai:**
  - Test `tests/tahap3-svg-optimizer-and-presets.spec.ts` lulus 100%.
  - Commit terpisah untuk Task 1.

---

### Task 2: Live SVG XML Code Inspector & Two-Way Editor Modal Component
- **Tujuan:** Membangun komponen UI modal/drawer interaktif untuk inspeksi kode SVG real-time dengan sinkronisasi dua arah.
- **File Target:**
  - `src/components/modals/SvgCodeInspectorModal.tsx`:
    - Modal dialog dengan tab bar: `SVG XML (Editable)`, `Web Minified`, `React JSX`, `Vue SFC`, `CSS Data URI`.
    - Textarea editor monospace dengan nomor baris otomatis.
    - Sinkronisasi dua arah:
      - Kanvas $\to$ Kode: memperbarui teks XML saat kanvas berubah.
      - Kode $\to$ Kanvas: debounced 300ms parsing via `parseSVG`, memperbarui dokumen tanpa mematahkan status.
    - Deteksi error XML non-destruktif dengan lencana merah/hijau.
    - Tombol Aksi: Format/Prettify, Minify, Salin Kode (dengan toast feedback), Unduh, Tutup.
  - `tests/tahap3-code-inspector-sync.spec.ts`: Test Playwright Regular untuk validasi loop sinkronisasi dua arah dan penanganan error sintaks XML.
- **Kriteria Selesai:**
  - Test `tests/tahap3-code-inspector-sync.spec.ts` lulus 100%.
  - Commit terpisah untuk Task 2.

---

### Task 3: Editor Toolbar, Inspector, and Keyboard Shortcuts Integration
- **Tujuan:** Mengintegrasikan Code Inspector ke antarmuka Vector Studio (floating toolbar, right inspector, keyboard shortcuts, dan i18n).
- **File Target:**
  - `src/components/editor/EditorFloatingToolbar.tsx`: Tambahkan tombol `code` (`ICONS.code`) dengan tooltip `veSvgCodeInspector` dan pintasan `Ctrl+Alt+C`.
  - `src/components/editor/EditorRightInspector.tsx`: Tambahkan tombol "Inspeksi Kode SVG (Ctrl+Alt+C)" di seksi Export & Impor.
  - `src/components/editor/VectorEditor.tsx`: Mount `SvgCodeInspectorModal` dan expose API handler `openCodeInspector`.
  - `src/components/editor/hooks/useEditorShortcuts.tsx`: Bind `Ctrl+Alt+C` untuk membuka/menutup Code Inspector.
  - `src/constants/appI18n.tsx` & `src/constants/tooltipsCatalog.tsx`: Kamus bahasa ID & EN untuk Code Inspector dan presets.
  - `tests/tahap3-export-and-code-ui-e2e.spec.ts`: E2E Playwright test untuk verifikasi pembukaan modal via tombol/shortcut, pengeditan kode yang mengubah kanvas, dan copy preset.
- **Kriteria Selesai:**
  - Test `tests/tahap3-export-and-code-ui-e2e.spec.ts` lulus 100%.
  - Commit terpisah untuk Task 3.

---

### Task 4: Full Regression, Typecheck, Build, & Playwright MCP Live Exploration
- **Tujuan:** Memverifikasi seluruh sistem terintegrasi bebas regresi dan menjalankan eksplorasi langsung di peramban via Playwright MCP.
- **Langkah:**
  - `npm run typecheck` (0 error).
  - `npm run build:web` (bundle sukses).
  - Jalankan test suites lengkap (Tahap 1, Tahap 2, dan Tahap 3).
  - Playwright MCP live exploration pada port 8089: membuka modal code inspector, beralih tab, mengedit kode, memverifikasi live sync dua arah, dan mengambil screenshot.
- **Kriteria Selesai:**
  - 100% test lulus, typecheck bersih, verifikasi Playwright MCP berhasil dengan bukti screenshot/snapshot.

---

### Task 5: Whole-Branch Review & Tahap 3 Final Completion
- **Tujuan:** Menjalankan review komprehensif seluruh branch untuk Tahap 3 oleh subagent reviewer independen.
- **Kriteria Selesai:**
  - Laporan review menyeluruh tanpa temuan Critical atau Important terbuka.
  - Update SDD ledger progress dan task tracking.
