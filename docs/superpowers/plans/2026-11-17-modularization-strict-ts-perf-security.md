# Modularization, Strict TypeScript, and Security/Performance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularize the monolithic `VectorEditor.tsx` (~10,000 lines), establish strict TypeScript typing across the entire codebase to eliminate ~1,539 `tsc --noEmit` errors, and implement critical security and performance hardening (SVG sanitization, prototype pollution defense, 32MB file limits, and bounding box / spatial cache versioning).

**Architecture:** 
1. **Modularization**: Decompose `VectorEditor.tsx` into single-responsibility custom hooks: `useEditorShortcuts` (keyboard dispatcher and tool shortcuts), `useEditorExport` (multi-format serialization and export engine), and `useCanvasWheelZoom` (viewport pan, zoom clamp, and trackpad gestures), while preserving 100% compatibility with `window.__geovantaEditorApi`.
2. **Strict TypeScript**: Introduce `src/types/vectorTypes.ts` and `src/types/global.d.ts`, fix component props interfaces in `src/components/ui/` with proper optionality (`?`), remove implicit `any` traps on default parameter objects (`opts = {}`), type CSS variable mappings, and achieve clean `tsc --noEmit` passes.
3. **Security & Performance**: Sanitize imported SVG content (strip `on*` event handlers, block `<script>` and `<foreignObject>`, enforce safe URLs), guard JSON parsing against prototype pollution (`__proto__`, `constructor`, `prototype`), enforce a 32MB file size ceiling, and version-cache bounding box calculations during transient manipulations.

**Tech Stack:** React 18, TypeScript, Playwright (`@playwright/test`), CanvasKit GPU/CPU renderer, esbuild.

**Spec:** User request: "1. lakukan modularisasi, 2. lakukan pengetikan TypeScript Ketat, 3. terapkan rekomendasi performa dan keamanan yang kamu rekomendasikan" and `C:/Users/Reza Pahlevi/.gemini/antigravity/brain/499ee0fe-5c63-4de6-a1d5-be38474e9c5a/geovanta-testing-and-optimization-report.md`.

## Global Constraints
- All testing must use Playwright exclusively (`@playwright/test` and `npx playwright test`).
- Offline bundle must compile via `npm run build:web` without errors.
- Existing 74 Playwright tests and 373 unit tests must remain 100% passing.
- `window.__geovantaEditorApi` must remain fully intact for automation, tests, and debugging.
- No third-party network requests (100% offline bundle guarantee).

## Review Focus
- Imported SVGs containing malicious `<script>` tags, inline `onload` handlers, or `<foreignObject>` do not execute scripts and have dangerous tags stripped.
- JSON payloads with `__proto__` or `constructor.prototype` keys are safely sanitized without polluting object prototypes.
- Uploads or imports exceeding 32MB are rejected gracefully with localized toast feedback without exhausting memory.
- `tsc --noEmit` succeeds cleanly without type errors.
- Monolith reduction in `VectorEditor.tsx` preserves all existing keyboard shortcuts, export workflows, and canvas zoom behaviors.

---

### Task 1: Security & Performance Hardening

**Files:**
- Create: `src/utils/securityUtils.ts`
- Modify: `src/engine/svgDocumentParser.tsx`
- Modify: `src/workspace/projectRepository.tsx`
- Modify: `src/workspace/workspaceController.tsx`
- Modify: `src/engine/imageAndBounds.tsx`
- Test: `tests/security-and-perf-hardening.spec.ts`

**Interfaces:**
- Consumes: `src/engine/svgDocumentParser.tsx`, `src/workspace/projectRepository.tsx`, `src/workspace/workspaceController.tsx`
- Produces: `safeJsonParse(text: string): any`, `sanitizeSvgString(svg: string): string`, `isFileSizeWithinLimit(fileOrSize: File | number, maxMb?: number): boolean`, revision-cached `tightBBox`.

- [ ] **Step 1: Write the failing Playwright tests in `tests/security-and-perf-hardening.spec.ts`**
Cover:
1. `sanitizeSvgString` strips `<script>`, `<foreignObject>`, and `on*` event handlers (`onload`, `onerror`, `onclick`).
2. `safeJsonParse` strips `__proto__`, `constructor`, and `prototype` keys from untrusted inputs.
3. `isFileSizeWithinLimit` rejects files/buffers > 32MB.
4. `parseSvgDocument` rejects or sanitizes dangerous embedded SVG elements.
5. Cached bounding boxes remain consistent across repeated calls with matching revision keys.

- [ ] **Step 2: Run Playwright test to verify failure**
Run: `npx playwright test tests/security-and-perf-hardening.spec.ts`
Expected: FAIL due to missing `securityUtils.ts` and unintegrated sanitization methods.

- [ ] **Step 3: Implement `src/utils/securityUtils.ts` and integrate into parser and workspace**
1. Implement `safeJsonParse` using a reviver function rejecting dangerous prototype keys.
2. Implement `sanitizeSvgString` / DOM sanitization in `src/engine/svgDocumentParser.tsx` removing forbidden tags and `on*` attributes.
3. Add 32MB ceiling check in `src/workspace/workspaceController.tsx` and file drop handlers.
4. Add bounding box cache revision checking in `src/engine/imageAndBounds.tsx`.

- [ ] **Step 4: Run Playwright test to verify it passes**
Run: `npx playwright test tests/security-and-perf-hardening.spec.ts`
Expected: PASS.

---

### Task 2: Strict TypeScript Typing Overhaul

**Files:**
- Create: `src/types/vectorTypes.ts`
- Create: `src/types/global.d.ts`
- Modify: `src/components/ui/CustomTextBox.tsx`
- Modify: `src/components/ui/Slider.tsx`
- Modify: `src/components/ui/SelectDropdown.tsx`
- Modify: `src/components/ui/FloatPopover.tsx`
- Modify: `src/components/ui/TransformField.tsx`
- Modify: `src/components/editor/CanvasVectorObjects.tsx`
- Modify: `src/workspace/projectRepository.tsx`
- Modify: `src/workspace/workspaceController.tsx`
- Modify: `src/components/editor/EditorFloatingToolbar.tsx`
- Modify: `src/components/editor/EditorSimplifyStrip.tsx`
- Modify: `src/components/editor/DebugLogPanel.tsx`
- Modify: `tsconfig.json`
- Test: `tests/typescript-strictness.spec.ts`

**Interfaces:**
- Consumes: Core vector models, UI component props, and browser Window globals.
- Produces: Complete TypeScript typing interfaces (`VectorObject`, `Subpath`, `NodePoint`, `VectorDocument`, `SelectionState`, etc.), zero `tsc --noEmit` errors.

- [ ] **Step 1: Write the failing Playwright test in `tests/typescript-strictness.spec.ts`**
Verify programmatic invocation of `tsc --noEmit` and validate exported TypeScript types and component prop contracts.

- [ ] **Step 2: Run Playwright test to verify failure**
Run: `npx playwright test tests/typescript-strictness.spec.ts`
Expected: FAIL because `tsc --noEmit` currently outputs ~1,539 errors.

- [ ] **Step 3: Implement type definitions and fix component prop interfaces**
1. Create `src/types/vectorTypes.ts` defining `NodePoint`, `Subpath`, `VectorObject`, `VectorDocument`, `GradModel`, `TextSpec`, `SelectionState`, `ProjectMetadata`, `EditorTool`.
2. Create `src/types/global.d.ts` adding global window declarations (`__geovantaEditorApi`, `__GEOVANTA_AUDIT__`, `showSaveFilePicker`, `showOpenFilePicker`, etc.).
3. Update UI components in `src/components/ui/` to make optional props optional (`?`).
4. Replace default `{}` parameter types with `Record<string, any>` or explicit interfaces across `CanvasVectorObjects.tsx`, `projectRepository.tsx`, `workspaceController.tsx`, `thumbnailGenerator.tsx`.
5. Fix custom CSS properties in `EditorFloatingToolbar.tsx` and `EditorSimplifyStrip.tsx` by typing with `React.CSSProperties`.
6. Fix argument count mismatches in call sites.

- [ ] **Step 4: Run Playwright test and verify `tsc --noEmit` passes**
Run: `npx playwright test tests/typescript-strictness.spec.ts`
Run: `npm run typecheck`
Expected: PASS with 0 compilation errors.

---

### Task 3: Modularize `VectorEditor.tsx` - Extract Keyboard Shortcuts (`useEditorShortcuts`)

**Files:**
- Create: `src/components/editor/hooks/useEditorShortcuts.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/editor-shortcuts-modular.spec.ts`

**Interfaces:**
- Consumes: Action callbacks (tool switching, select all, duplicate, delete, undo, redo, copy, group, ungroup, flatten, boolean, snap/grid toggle, zoom).
- Produces: `useEditorShortcuts(options: EditorShortcutsOptions): void` hook managing `window.addEventListener('keydown' / 'keyup')`.

- [ ] **Step 1: Write failing Playwright test in `tests/editor-shortcuts-modular.spec.ts`**
Test shortcut mapping:
1. Tool switching hotkeys (V, P, A, T, F, R, O, L, G, C, B, W, S, M, Z, H).
2. Escape cancels active tool or deselects.
3. Ctrl+D duplicates selection.
4. Ctrl+G / Ctrl+Shift+G groups and ungroups.
5. Mod+Quote toggles grid and snap.
6. Alt+Mod boolean hotkeys (U, S, I, X, O).

- [ ] **Step 2: Run Playwright test to verify failure**
Run: `npx playwright test tests/editor-shortcuts-modular.spec.ts`
Expected: FAIL because `useEditorShortcuts` does not exist yet.

- [ ] **Step 3: Implement `useEditorShortcuts.tsx` and connect in `VectorEditor.tsx`**
Extract `onKd` and `onKu` logic cleanly from `VectorEditor.tsx` into `src/components/editor/hooks/useEditorShortcuts.tsx`, accepting typed action delegates.

- [ ] **Step 4: Run Playwright test to verify it passes**
Run: `npx playwright test tests/editor-shortcuts-modular.spec.ts`
Expected: PASS.

---

### Task 4: Modularize `VectorEditor.tsx` - Extract Export & Serialization Engine (`useEditorExport`)

**Files:**
- Create: `src/components/editor/hooks/useEditorExport.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/editor-export-modular.spec.ts`

**Interfaces:**
- Consumes: Current document ref, selection ref, export format, export scale, export area, background settings, toast notifications (`say`).
- Produces: `useEditorExport(options: EditorExportOptions): EditorExportApi` exporting `downloadSvg`, `triggerDl`, `copyAsSvg`.

- [x] **Step 1: Write failing Playwright test in `tests/editor-export-modular.spec.ts`**
Test:
1. Exporting SVG triggers blob creation with `image/svg+xml`.
2. Exporting raster (PNG, JPG, WebP) invokes `VE.exportRaster`.
3. Exporting AI and EPS formats handles text path conversion.
4. Copying SVG to clipboard copies serialized string.

- [x] **Step 2: Run Playwright test to verify failure**
Run: `npx playwright test tests/editor-export-modular.spec.ts`
Expected: FAIL because `useEditorExport` does not exist yet.

- [x] **Step 3: Implement `useEditorExport.tsx` and wire in `VectorEditor.tsx`**
Extract `downloadSvg`, `triggerDl`, `copyAsSvg`, and raster export delegation into `src/components/editor/hooks/useEditorExport.tsx`.

- [x] **Step 4: Run Playwright test to verify it passes**
Run: `npx playwright test tests/editor-export-modular.spec.ts`
Expected: PASS.

---

### Task 5: Modularize `VectorEditor.tsx` - Extract Canvas Wheel & Zoom Engine (`useCanvasWheelZoom`)

**Files:**
- Create: `src/components/editor/hooks/useCanvasWheelZoom.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/editor-canvas-zoom-modular.spec.ts`

**Interfaces:**
- Consumes: Canvas container ref, zoom ref, pan ref, zoom bounds (`VZMIN`, `VZMAX`), flush view callback.
- Produces: `useCanvasWheelZoom(options: CanvasWheelZoomOptions): CanvasWheelZoomApi` exposing `onWheel`, `panTo`, `zoomIn`, `zoomOut`, `zoomFit`.

- [x] **Step 1: Write failing Playwright test in `tests/editor-canvas-zoom-modular.spec.ts`**
Test:
1. `onWheel` with Ctrl / Meta performs centered zoom with bounds clamping.
2. `onWheel` without Ctrl performs pan scrolling.
3. `panTo(wx, wy)` centers viewport around world coordinates.
4. `zoomIn`, `zoomOut`, and `zoomFit` correctly adjust scale and center content.

- [x] **Step 2: Run Playwright test to verify failure**
Run: `npx playwright test tests/editor-canvas-zoom-modular.spec.ts`
Expected: FAIL because `useCanvasWheelZoom` does not exist yet.

- [x] **Step 3: Implement `useCanvasWheelZoom.tsx` and wire in `VectorEditor.tsx`**
Extract `onWheel`, `panTo`, and zoom utilities into `src/components/editor/hooks/useCanvasWheelZoom.tsx`.

- [x] **Step 4: Run Playwright test to verify it passes**
Run: `npx playwright test tests/editor-canvas-zoom-modular.spec.ts`
Expected: PASS.

---

### Task 6: Full Integration, Typecheck, and Verification Suite

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: All 74 existing Playwright tests + all new Playwright tests + all 373 unit tests.

- [x] **Step 1: Run comprehensive Playwright test suite**
Run: `npx playwright test`
Expected: All tests PASS (83 / 83 passed).

- [x] **Step 2: Run unit test suite**
Run: `npm test`
Expected: 373 / 373 tests PASS.

- [x] **Step 3: Run TypeScript typecheck**
Run: `npm run typecheck`
Expected: 0 errors (Passed with 0 errors).

- [x] **Step 4: Build offline production bundle**
Run: `npm run build:web`
Expected: Build succeeds with updated bundles in `dist/assets` and `web/assets`.

- [x] **Step 5: Run Dogfood Browser Test**
Run: `node scripts/run-agent-browser-test.cjs` on local server.
Expected: 10 / 10 scenarios PASS with 0 console or runtime errors (10 / 10 Passed).
