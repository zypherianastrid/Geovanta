# Right Sidebar (Inspector) Bug Fixes & Optimization Design

## Intent & The Why
The right sidebar (`EditorRightInspector`) in Geovanta houses all property inspection and manipulation tools: Transform, Typography, Tool Parameters (Blob, Weave, Arc), Appearance & Corner Radius, Color Styles, Fill, Stroke, Effects (FX), Selection Colors, Find & Replace, Recolor, Auto Layout, Canvas Background, and Export/Import.
Several latent synchronization bugs, unhandled object types (such as text fills in selection colors), popover animation race conditions in Escape handling, and missing generator updates during dimension scaling impair user workflow and stability. This design doc establishes precise fixes and optimizations for these subsystems.

## Goals, Non-Goals, and Anti-Goals
- **Goals**:
  - Guarantee that resizing generator shapes (Blob, Weave, Arc) via the Width (W) and Height (H) inputs in the inspector keeps their procedural generator parameters (`o.gen`) perfectly synchronized.
  - Ensure text object colors (`o.text.fill`) are properly displayed, inspected, and replaceable in Selection Colors.
  - Fix Escape key handling in Find & Replace and Recolor sections by ignoring exiting popovers (`.flt.out`).
  - Enforce mutual exclusion between Find & Replace and Recolor panels so conflicting live previews never collide.
  - Ensure gradient mode switches to 'none' or 'solid' in `GradientEditorPanel` properly clear orphaned `grad` models, update text fills, and unlink color styles.
  - Standardize individual corner chip selection UX (click selects one; Shift+click multi-selects).
  - Pass `lang` to `GradientEditorPanel` and provide bilingual English/Indonesian toast feedback.
  - Maintain zero regressions across all 61+ existing Playwright tests.
- **Non-Goals**:
  - Redesigning the visual layout or theme tokens of the right sidebar.
  - Rewriting the text engine or font rasterization pipelines.
- **Anti-Goals**:
  - Breaking existing document serialization formats.
  - Regressing test suites or offline build stability.

## Constraints
- **Test Runner**: Strictly Playwright (`@playwright/test` and `npx playwright test`).
- **Offline Bundle**: Must compile cleanly via `npm run build:web` with esbuild.

## Approaches Considered
- **Approach A (Comprehensive Core Engine & Inspector Hardening - Selected)**:
  Fix underlying transform functions (`scaleObjXY`), patch `selectionColors` collection, fix popover Escape checks, enforce mutual exclusion, harden gradient fill mode transitions, and modernize corner chip interaction.
- **Approach B (Surface UI-Only Patches - Rejected)**:
  Only modify `EditorRightInspector.tsx` without fixing `scaleObjXY` or `selectionColors`. Rejected because moving sliders after dimension input would continue to corrupt generator objects.

## Detailed Specifications

### 1. Dimension Scaling (`scaleObjXY` in `src/engine/selectionTransformAndAlign.tsx`)
In `scaleObjXY(o, px, py, sx, sy, scaleStroke)`:
When `o.gen` is present, update the generator parameters based on `o.gen.kind`:
- For `blob`: scale `w` by `|sx|`, `h` by `|sy|`, and transform `(cx, cy)` by `tr`.
- For `weave`: scale `w` by `|sx|`, `h` by `|sy|`, and transform `(x, y)` by `tr`.
- For `arc`: scale `r` by `sqrt((sx^2 + sy^2) / 2)`, and transform `(cx, cy)` by `tr`.

### 2. Selection Colors Collection (`src/components/editor/VectorEditor.tsx`)
In `selectionColors`:
- When evaluating `o.fill`: inspect `const fillVal = o.type === 'text' && o.text ? (o.text.fill || o.fill) : o.fill`.
- Include `fillVal` in `map` under `kind: 'fill'` if `fillVal && fillVal !== 'none'`.
- Also account for `strokeGradOn(o) && o.strokeGrad` for stroke gradients.

### 3. Popover Escape Handling (`FindReplaceSection.tsx` & `RecolorSection.tsx`)
In `keydown` handlers:
Replace `if (document.querySelector('.flt')) return;` with:
`if (document.querySelector('.flt:not(.out)')) return;`
This ensures that when a ColorField popover is animating out, Escape is not blocked from closing the section.

### 4. Mutual Exclusion of Find & Replace and Recolor Panels (`EditorRightInspector.tsx`)
- In `EditorRightInspector.tsx`:
  - When opening Find & Replace (`frOpen`): `setRcOpen(false); setFrOpen(v => !v);`
  - When opening Recolor (`rcOpen`): `setFrOpen(false); setRcOpen(v => !v);`

### 5. Gradient Mode Switching (`GradientEditorPanel.tsx`)
In `setMode(m)`:
- When `m === 'none'`: set `fill: 'none'`, `grad: null`, and for text update `text.fill: 'none'`. Call `directEditUnlink`.
- When `m === 'solid'`: set `fill: col`, `grad: null`, and for text update `text.fill: col`. Call `directEditUnlink`.

### 6. Individual Corner Chip Selection UX (`EditorRightInspector.tsx`)
In `crn-chip` click handler:
- If `e.shiftKey`: toggle or add `c.key` to `pickedCornerKeys`.
- If not `e.shiftKey`: select `new Set([c.key])`.

### 7. Localization & Parameter Feedback
- Pass `lang={lang}` to `GradientEditorPanel`.
- Use bilingual toasts in `VectorEditor.tsx` and `GradientEditorPanel.tsx` based on `lang === 'en'`.
