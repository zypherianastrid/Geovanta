# Right Sidebar (Inspector) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all identified bugs, synchronization issues, and optimize all features on the right sidebar inspector.

**Architecture:** Harden the core dimension scaling function (`scaleObjXY`) for procedural generators, enhance `selectionColors` collection to support text objects and stroke gradients, fix popover Escape checks across inline subpanels, enforce mutual exclusion between Find & Replace and Recolor, sanitize gradient mode transitions, and modernize corner chip selection.

**Tech Stack:** React 18, TypeScript, Playwright (`@playwright/test`), CanvasKit GPU/CPU renderer.

**Spec:** `docs/superpowers/specs/2026-11-17-right-sidebar-inspector-design.md`

## Global Constraints
- All testing must use Playwright exclusively (`@playwright/test` and `npx playwright test`).
- Offline bundle must compile via `npm run build:web` without errors.
- Zero regressions across existing 61+ test cases.

## Review Focus
- Resizing procedural generator shapes (Blob, Weave, Arc) via W/H inputs in inspector does not reset when sliders are subsequently adjusted.
- Text object fill colors are accurately displayed in the Selection Colors section and can be replaced or selected via Select Same.
- Pressing Escape immediately after closing a ColorField popover in Find & Replace or Recolor properly closes the panel instead of being swallowed.
- Switching fill mode from gradient to solid or none cleanly removes orphaned gradient data and decouples linked styles.
- Individual corner chip clicking without Shift selects the clicked corner exclusively rather than behaving like an unintuitive toggle.

---

### Task 1: Playwright Test Suite for Right Sidebar

**Files:**
- Create: `tests/right-sidebar-inspector.spec.ts`

**Interfaces:**
- Consumes: `@playwright/test`, `src/engine/selectionTransformAndAlign.tsx`, `web/index.html`
- Produces: Playwright test suite covering dimension scaling with `o.gen`, selection colors with text objects, Escape handling in subpanels, mutual exclusion of subpanels, gradient mode switches, corner chip selection, and localization.

- [ ] **Step 1: Write the failing Playwright tests in `tests/right-sidebar-inspector.spec.ts`**
Write unit and integration tests covering:
1. `scaleObjXY` updating `o.gen` on blob, weave, and arc.
2. `selectionColors` collecting text object colors (`o.text.fill`).
3. `FindReplaceSection` and `RecolorSection` Escape handling when `.flt.out` is present.
4. Mutual exclusion between `frOpen` and `rcOpen`.
5. Gradient mode switching to 'none' and 'solid' clearing `grad` and decoupling linked styles.
6. Corner chip click selecting single corner vs Shift-click multi-selecting.

- [ ] **Step 2: Run Playwright test to verify Red phase failures**
Run: `npx playwright test tests/right-sidebar-inspector.spec.ts`
Expected: FAIL on generator scaling, text selection colors, and Escape handling.

- [ ] **Step 3: Commit**
```bash
git add tests/right-sidebar-inspector.spec.ts
git commit -m "test: add comprehensive right sidebar inspector test suite"
```

---

### Task 2: Core Engine & Generator Scaling Fix

**Files:**
- Modify: `src/engine/selectionTransformAndAlign.tsx:227-300`

**Interfaces:**
- Consumes: `scaleObjXY(o, px, py, sx, sy, scaleStroke)`
- Produces: Updated `scaleObjXY` that synchronizes `next.gen` for `blob`, `weave`, and `arc` objects.

- [ ] **Step 1: Implement `o.gen` scaling in `scaleObjXY` in `src/engine/selectionTransformAndAlign.tsx`**
In `scaleObjXY`:
```typescript
  if (o.gen && typeof o.gen === 'object') {
    if (o.gen.kind === 'blob') {
      const c = tr({ x: Number(o.gen.cx || 0), y: Number(o.gen.cy || 0) });
      next.gen = {
        ...o.gen,
        cx: rd(c.x),
        cy: rd(c.y),
        w: rd(Number(o.gen.w || 100) * Math.abs(sx)),
        h: rd(Number(o.gen.h || 100) * Math.abs(sy))
      };
    } else if (o.gen.kind === 'weave') {
      const p0 = tr({ x: Number(o.gen.x || 0), y: Number(o.gen.y || 0) });
      next.gen = {
        ...o.gen,
        x: rd(p0.x),
        y: rd(p0.y),
        w: rd(Number(o.gen.w || 100) * Math.abs(sx)),
        h: rd(Number(o.gen.h || 100) * Math.abs(sy))
      };
    } else if (o.gen.kind === 'arc') {
      const c = tr({ x: Number(o.gen.cx || 0), y: Number(o.gen.cy || 0) });
      const k = Math.sqrt((sx * sx + sy * sy) * 0.5);
      next.gen = {
        ...o.gen,
        cx: rd(c.x),
        cy: rd(c.y),
        r: rd(Number(o.gen.r || 50) * k)
      };
    }
  }
```

- [ ] **Step 2: Run unit test for `scaleObjXY`**
Run: `npx playwright test tests/right-sidebar-inspector.spec.ts -g "scaleObjXY"`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/engine/selectionTransformAndAlign.tsx
git commit -m "fix(engine): sync o.gen dimensions and center in scaleObjXY"
```

---

### Task 3: VectorEditor State & Selection Colors Enhancement

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx:2111-2180`, `src/components/editor/VectorEditor.tsx:2280-2300`, `src/components/editor/VectorEditor.tsx:9500-9600`

**Interfaces:**
- Consumes: `selObjs`, `doc.objects`
- Produces: Enhanced `selectionColors` including `o.text.fill` and stroke gradients, localized validation toasts, and test helper exports.

- [ ] **Step 1: Update `selectionColors` in `src/components/editor/VectorEditor.tsx`**
In `selectionColors`:
Resolve text object fill:
```typescript
      const fillVal = o.type === 'text' && o.text ? (o.text.fill || o.fill) : o.fill;
```
Check `fillVal` and add to map. Also check `VE.strokeGradOn(o) && o.strokeGrad` for stroke gradients.

- [ ] **Step 2: Localize validation toasts in `VectorEditor.tsx`**
In `setXfDim`:
`if (!(v > 0)) return say(lang === 'en' ? 'Size must be greater than 0' : 'Ukuran harus lebih dari 0');`
In `convertFrameToAutoLayout`:
`if (!targetGrp) return say(lang === 'en' ? 'Select or create a Frame first' : 'Pilih sebuah Frame atau buat Frame terlebih dahulu');`
`if (!res) return say(lang === 'en' ? 'Empty Frame' : 'Frame kosong');`
In `padToArtboard`:
`if (nd === docRef.current) return say(lang === 'en' ? 'No content' : 'Tidak ada konten');`
`say(lang === 'en' ? 'Padding applied to Artboard' : 'Padding diterapkan ke Artboard');`

- [ ] **Step 3: Expose inspector helper methods on `window.__geovantaEditorApi`**
Expose `getSelectionColors`, `setSelectionDimension`, and `getDoc`.

- [ ] **Step 4: Run Playwright test for selection colors**
Run: `npx playwright test tests/right-sidebar-inspector.spec.ts -g "Selection Colors"`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/editor/VectorEditor.tsx
git commit -m "feat(editor): include text fills in selection colors and localize inspector toasts"
```

---

### Task 4: Right Sidebar Inspector & Subpanels Hardening

**Files:**
- Modify: `src/components/editor/FindReplaceSection.tsx:195-206`
- Modify: `src/components/editor/RecolorSection.tsx:205-216`
- Modify: `src/components/editor/GradientEditorPanel.tsx:68-85`, `src/components/editor/GradientEditorPanel.tsx:150-165`
- Modify: `src/components/editor/EditorRightInspector.tsx:270-295`, `src/components/editor/EditorRightInspector.tsx:360-390`

**Interfaces:**
- Consumes: `FindReplaceSection`, `RecolorSection`, `GradientEditorPanel`, `EditorRightInspector`
- Produces: Mutually exclusive subpanels, leak-free Escape handlers, clean gradient mode switches, and standard corner chip selection.

- [ ] **Step 1: Update Escape checks in `FindReplaceSection.tsx` and `RecolorSection.tsx`**
Replace `if (document.querySelector('.flt')) return;` with:
`if (document.querySelector('.flt:not(.out)')) return;`

- [ ] **Step 2: Enforce mutual exclusion between Find & Replace and Recolor in `EditorRightInspector.tsx`**
Update opening handlers:
- In Find & Replace open buttons: `onClick={() => { setRcOpen(false); setFrOpen(v => !v); }}`
- In Recolor open buttons: `onClick={() => { setFrOpen(false); setRcOpen(v => !v); }}`

- [ ] **Step 3: Harden `setMode` in `GradientEditorPanel.tsx`**
In `setMode(m)`:
```typescript
    if (m === 'none') {
      applyGrad(o => directPaintEdit(o, {
        ...o,
        fill: 'none',
        grad: null,
        ...(o.type === 'text' && o.text ? { text: { ...o.text, fill: 'none' } } : {})
      }, 'fill', docStyles), 'p:fill');
    } else if (m === 'solid') {
      const col = g ? g.base : obj.fill !== 'none' ? cssToHex(obj.fill) : '#4f46e5';
      applyGrad(o => directPaintEdit(o, {
        ...o,
        fill: col,
        grad: null,
        ...(o.type === 'text' && o.text ? { text: { ...o.text, fill: col } } : {})
      }, 'fill', docStyles), 'p:fill');
    } else {
      applyGrad(o => VE.ensureGradModel(o, m), 'grad-mode');
    }
```
Pass `lang={lang}` and `docStyles={doc && doc.styles ? doc.styles : []}` to `GradientEditorPanel`.
Localize toasts in `GradientEditorPanel.tsx`:
- `say(lang === 'en' ? 'At least 2 color stops are required' : 'Minimal harus ada 2 stop warna');`
- `say(lang === 'en' ? 'Gradient stop added at ' + Math.round(t * 100) + '%' : 'Stop gradien ditambahkan pada ' + Math.round(t * 100) + '%');`

- [ ] **Step 4: Standardize individual corner chip selection in `EditorRightInspector.tsx`**
In `crn-chip` click handler:
```typescript
onClick={e => {
  setPickedCornerKeys(prev => {
    if (e.shiftKey) {
      const next = new Set(prev);
      if (next.has(c.key) && next.size > 1) next.delete(c.key);
      else next.add(c.key);
      return next;
    }
    return new Set([c.key]);
  });
}}
```
Also ensure `primary.fillRule || 'nonzero'` is passed to `Seg`.

- [ ] **Step 5: Run Playwright test for right sidebar inspector**
Run: `npx playwright test tests/right-sidebar-inspector.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/components/editor/FindReplaceSection.tsx src/components/editor/RecolorSection.tsx src/components/editor/GradientEditorPanel.tsx src/components/editor/EditorRightInspector.tsx
git commit -m "fix(inspector): harden subpanel escape, gradient mode switch, and corner selection"
```

---

### Task 5: Web Bundle Compilation & Comprehensive Regression Verification

**Files:**
- Modify: `web/assets/geovanta.bundle.js` (generated by build)

**Interfaces:**
- Consumes: Complete codebase
- Produces: Offline distribution bundle and 100% passing test results across the test suite.

- [ ] **Step 1: Build offline web bundle**
Run: `npm run build:web`
Expected: `[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/.` (Exit code 0).

- [ ] **Step 2: Run all Playwright tests in `tests/right-sidebar-inspector.spec.ts`**
Run: `npx playwright test tests/right-sidebar-inspector.spec.ts`
Expected: All tests pass.

- [ ] **Step 3: Run entire Playwright test suite for zero-regression check**
Run: `npx playwright test`
Expected: 67+ tests pass, 0 failed.

- [ ] **Step 4: Commit and finalize**
```bash
git commit --allow-empty -m "chore: verify right sidebar bug fixes and optimizations with zero regressions"
```
