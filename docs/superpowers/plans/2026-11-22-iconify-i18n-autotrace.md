# Iconify Fidelity, English i18n/Tooltips & Rust Auto-Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Iconify icon rendering fidelity (especially Material UI and multi-subpath icons), complete missing English translations and tooltips, implement a fast Rust/WASM Auto Trace Image to SVG feature, update `CHANGELOG.md`, and push to GitHub.

**Architecture:**
1. Preserve exact SVG path topology and Iconify transforms (`rotate`, `hFlip`, `vFlip`) in `buildIconSvg` and `onIconifyInsert`, eliminating destructive subpath re-grouping and level-100 simplification that distorted Material UI icons.
2. Add a Rust image tracing engine (`rust/geovanta-wasm/src/tracer.rs`) compiled to WebAssembly and embedded in the browser/Node bridge (`wasmEngineBridge.ts`), plus `src/engine/imageTracerEngine.tsx` and UI integration in `EditorRightInspector.tsx`, context menu, and quick actions.
3. Complete all missing English strings, toast patterns, and tooltip definitions in `appI18n.tsx` and `tooltipsCatalog.tsx`.

**Tech Stack:** Rust (`wasm-bindgen`, `wasm-pack`), TypeScript, React 18, Playwright (`@playwright/test`).

## Global Constraints
- Must pass mandatory Syntax Check (`npx tsc --noEmit` and `cargo check`) with 0 errors.
- Must pass mandatory Playwright tests (`npx playwright test`) with 0 failures.
- Offline bundle (`node scripts/build-offline-bundle.js`) must build cleanly.

## Review Focus
1. Multi-subpath Material UI icons (`ic:baseline-*`, `mdi:*`, `material-symbols:*`) with compound holes and disjoint parts must keep their exact shape without losing holes or turning disjoint parts into bogus `evenodd` inversions.
2. Iconify aliases with `rotate`, `hFlip`, or `vFlip` must transform around the icon viewBox center accurately.
3. Auto Trace Image to SVG in both Black & White and Color modes must produce valid closed SVG paths scaled to the target image bounding box on the canvas.
4. Switching interface language to English (`en`) must translate all new and previously missing UI labels, tooltips, and toast messages.

---

### Task 1: Fix Iconify Material UI & General Icon Insertion Fidelity

**Files:**
- Modify: `src/renderer/iconifyClient.tsx`
- Modify: `src/engine/compoundPathEngine.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/iconify-material-fidelity.spec.ts`

- [ ] **Step 1: Write the failing Playwright test** (`tests/iconify-material-fidelity.spec.ts`) testing Material UI compound paths, disjoint paths, small curves, and Iconify alias transforms (`hFlip`, `vFlip`, `rotate`).
- [ ] **Step 2: Run test to verify it fails** (`npx playwright test tests/iconify-material-fidelity.spec.ts`).
- [ ] **Step 3: Implement faithful icon SVG building and non-destructive icon insertion** in `src/renderer/iconifyClient.tsx`, `src/engine/compoundPathEngine.tsx`, and `src/components/editor/VectorEditor.tsx`.
- [ ] **Step 4: Run syntax check and Playwright test** (`npx tsc --noEmit` and `npx playwright test tests/iconify-material-fidelity.spec.ts`).

### Task 2: Implement Rust/WASM Auto Trace Image to SVG Engine & UI

**Files:**
- Create: `rust/geovanta-wasm/src/tracer.rs`
- Modify: `rust/geovanta-wasm/src/lib.rs`
- Modify: `scripts/build-wasm.js`
- Modify: `src/bridge/wasmEngineBridge.ts`
- Create: `src/engine/imageTracerEngine.tsx`
- Modify: `src/engine/vectorEngine.tsx`
- Modify: `src/components/editor/EditorRightInspector.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/auto-trace-wasm.spec.ts`

- [ ] **Step 1: Write the failing Playwright test** (`tests/auto-trace-wasm.spec.ts`) verifying Rust/WASM `trace_image_rgba_to_svg` (B&W and Color modes, despeckle, cubic Bézier curve smoothing) and editor UI Auto Trace conversion on a raster image object.
- [ ] **Step 2: Run test to verify it fails** (`npx playwright test tests/auto-trace-wasm.spec.ts`).
- [ ] **Step 3: Implement `tracer.rs` in Rust, compile WASM, wire `wasmEngineBridge.ts` & `imageTracerEngine.tsx`, and add Auto Trace UI in `EditorRightInspector.tsx` & `VectorEditor.tsx`**.
- [ ] **Step 4: Run syntax check (`cargo check`, `npx tsc --noEmit`) and Playwright test (`npx playwright test tests/auto-trace-wasm.spec.ts`)**.

### Task 3: Complete English Translations & Tooltips Catalog

**Files:**
- Modify: `src/constants/appI18n.tsx`
- Modify: `src/constants/tooltipsCatalog.tsx`
- Modify: `src/components/editor/IconifyPanel.tsx`
- Modify: `src/components/editor/EditorRightInspector.tsx`
- Modify: `src/components/editor/EditorLeftSidebar.tsx`
- Modify: `src/components/editor/EditorFloatingToolbar.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/i18n-and-tooltips-completeness.spec.ts`

- [ ] **Step 1: Write the failing Playwright test** (`tests/i18n-and-tooltips-completeness.spec.ts`) verifying key parity between `APP_STR.id` and `APP_STR.en`, `TIPS` and `TIPS_EN`, all `data-tip` attributes used in JSX, and English translations for toasts & Auto Trace.
- [ ] **Step 2: Run test to verify it fails** (`npx playwright test tests/i18n-and-tooltips-completeness.spec.ts`).
- [ ] **Step 3: Complete all missing English translations, toast patterns, and tooltips**.
- [ ] **Step 4: Run syntax check (`npx tsc --noEmit`) and Playwright test (`npx playwright test tests/i18n-and-tooltips-completeness.spec.ts`)**.

### Task 4: Update `CHANGELOG.md`, Rebuild Bundle, Full Verification & Git Push

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update `CHANGELOG.md`** with the new Rust/WASM Auto Trace Image to SVG feature, Material UI / Iconify fidelity fix, and English translation & tooltip completions.
- [ ] **Step 2: Rebuild offline bundle (`node scripts/build-offline-bundle.js`) and run mandatory Syntax Check + Playwright Test suite**.
- [ ] **Step 3: Commit all changes and push to GitHub**.
