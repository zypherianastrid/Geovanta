# Node-Edit Anti-Aliasing, Dense-Scene Drag Performance & Fill Empty Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (inline execution with verification gates) and `superpowers:verification-before-completion`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
1. Keep crisp 2x RGSS anti-aliasing and thin anti-seam strokes active during node/handle editing so no pixelated seams appear on objects across the canvas.
2. Eliminate O(N)/O(N²) snap scans, moving-pass full-doc `getIconStateBundle` scans, and duplicate drag rAF scheduling so dragging objects stays fluid even with 1,500+ objects.
3. Implement `fillEmptySpaceDoc` (Polygon Topology Engine via `pathBoolean.tsx` + `pathOffset.tsx`) and expose "Isi Ruang Kosong" in Toolbar Boolean dropdown, Context Menu, and Right Inspector with full ID/EN i18n and tooltips.

**Architecture:**
- **Rendering:** Decouple `paintInteracting` (recolor preview slider) from `sceneInteracting` (geometry/node editing) inside `SceneRenderer`, keeping `useRgss = true` and `preserveAntiSeam = true` during node/handle drags, and gating thin anti-seam stroke stripping in `CanvasKitScene` behind `!options.preserveAntiSeam`.
- **Drag Perf:** Lazily sort & spatially index `t.xs`, `t.ys`, and `t.boxes` in `figcraftSnap.tsx` for O(log N + K) snap queries and local-band `equalSpacing`, memoize/fast-skip `getIconStateBundle` during `moving` passes in `canvasKitScene.tsx`, and avoid redundant `requestRender()` calls inside `objDragRafRef`.
- **Fill Empty Space:** New pure-JS module `src/engine/fillEmptySpaceEngine.tsx` computes bounded empty pockets from `[expandedBBox] \ union(spatialObstacleCluster)` (removing exterior halo), verifies strict direct boundary contact within `touchTol` with obstacle-bridge blocking checks, resolves multi-selection contention by highest shared contact score, snaps contact edges for seam-free welding, and unions connected pockets back into target path subpaths via `ringsToSubs`.

**Tech Stack:** TypeScript/React, Skia CanvasKit, Playwright (`@playwright/test`), `tsc --noEmit`.

---

### Task 1: Separate Paint vs. Node Interaction & Preserve Anti-Seam RGSS on Node Edit

**Files:**
- Modify: `src/renderer/sceneRenderer.tsx` (constructor fields, `setPaintInteracting`, `drawFrame`, `renderRgssFrame`)
- Modify: `src/renderer/canvasKitScene.tsx` (`drawPass` lines 1240-1275)
- Modify: `src/components/editor/VectorEditor.tsx` (`rcPreviewDoc` lines 1834-1844, `onPointerUp` cleanup)
- Test: `tests/node-aa-drag-perf-fill-empty.spec.ts` (Part 1: Node-edit RGSS & anti-seam test)

- [ ] **Step 1: Write failing Playwright test for Bug 1 in `tests/node-aa-drag-perf-fill-empty.spec.ts`**
  Create test file verifying:
  - Build a scene with 170+ adjacent touching solid polygons (`stroke: fill, strokeWidth: 0.5`) so `objCount > 150`.
  - Enter node-edit mode (`setTool('node')` / double click / API selection + pointermove node drag) OR simulate handle/node drag (`pointerdown` on node + `pointermove`).
  - Inspect renderer state during active node drag: `sceneRenderer.paintInteracting` must be `false`, RGSS sampling must remain active (`useRgss` -> last render stats/surface state or sampling neighboring edge pixels with anti-seam intact, zero exposed background pixels between adjacent shapes).
  - Verify `rcPreviewDoc` color preview slider STILL uses fast paint-preview path without breaking Recolor.
- [ ] **Step 2: Run Playwright test to confirm RED (fails before fix)**
  Run: `npx playwright test tests/node-aa-drag-perf-fill-empty.spec.ts -g "Bug 1"`
- [ ] **Step 3: Implement `setPaintInteracting` & `preserveAntiSeam` in `sceneRenderer.tsx`, `canvasKitScene.tsx`, `VectorEditor.tsx`**
  - In `src/renderer/sceneRenderer.tsx`:
    - Add `this.paintInteracting = false;` in constructor (`line ~70-130`) and `setPaintInteracting(active)` method right after `setSceneInteracting(active)`:
      ```ts
      setPaintInteracting(active) {
        const next = Boolean(active);
        if (next === Boolean(this.paintInteracting)) return;
        this.paintInteracting = next;
        if (!next || !RENDER_CONFIG.antialias) this.dirty = true;
      }
      ```
    - In `drawFrame()`:
      - Keep `const useRgss = !RENDER_CONFIG.antialias && !(this.paintInteracting && (!isGpu || objCount > 150));`
      - Pass `preserveAntiSeam: !this.paintInteracting && !this.cameraInteracting` inside `frameOptions = { ...options, preserveAntiSeam: !this.paintInteracting && !this.cameraInteracting }`.
      - Update CPU (`line 579`) and GPU (`line 711`) pan-cache eligibility to `!this.sceneInteracting && !this.paintInteracting`.
      - When calling `renderRgssFrame(...)` (`line 689`), pass `forceFullQuality = Boolean(this.sceneInteracting && !this.paintInteracting && !this.cameraInteracting && (isGpu || objCount <= 400))` so node editing keeps 4-pass `RGSS_2X_OFFSETS` up to 400 CPU objects / all GPU scenes.
  - In `src/renderer/canvasKitScene.tsx`:
    - Replace raw `interacting` culling/stroke-dropping checks (`lines 1242-1248`, `1265-1270`) with `const dropMicroSeam = interacting && !options.preserveAntiSeam;`. Only strip thin `o.stroke === o.fill` anti-seam strokes and sub-0.5px tiny shapes when `dropMicroSeam` is true.
  - In `src/components/editor/VectorEditor.tsx`:
    - In `rcPreviewDoc` (`line 1835`), call `sceneRendererRef.current?.setPaintInteracting?.(!!opts.interacting);` instead of `setSceneInteracting`.
    - In `onPointerUp` (`line 6636`) and `rcCommitPreview` (`line 1845`), ensure `setPaintInteracting?.(false)` is also called defensively so state never sticks.
- [ ] **Step 4: Run Playwright Bug 1 test + zoom regression check to confirm GREEN**
  Run: `npx playwright test tests/node-aa-drag-perf-fill-empty.spec.ts -g "Bug 1" tests/zoom-hold-aliasing.spec.ts tests/bugfix-and-solid-to-gradient.spec.ts`

---

### Task 2: Optimize Dense-Scene Object Drag Performance (Snap Indexing + Icon State Memoization + Coalesced Drag Render)

**Files:**
- Modify: `src/engine/figcraftSnap.tsx` (`ensureSnapIndexes`, binary search in `snapSpans` / `guidesSpans` / `snapAxis`, band-indexed `spacings`)
- Modify: `src/engine/multiSnapSolver.tsx` (eager sort finalize in `buildSnapCache`, fast spatial bbox filtering for dense `getEdgeTargets`)
- Modify: `src/renderer/canvasKitScene.tsx` (skip/memoize `getIconStateBundle` on `moving` pass)
- Modify: `src/components/editor/VectorEditor.tsx` (`altDupMove` `deferRender` flag when invoked inside `objDragRafRef`)
- Test: `tests/node-aa-drag-perf-fill-empty.spec.ts` (Part 2: 1,500+ object drag & snap timing test)

- [ ] **Step 1: Add failing / baseline dense-drag benchmark assertion to `tests/node-aa-drag-perf-fill-empty.spec.ts`**
  - Populate canvas with 1,500 vector rect/path objects.
  - Select 1 object and perform 25 `pointermove` steps across the canvas with snap enabled (`equalSpacing` + `edge` + `bbox` active).
  - Assert `solveMultiSnap` total work & per-frame drag duration stays well below budget (e.g. average pointermove+render < 16–20ms in browser, zero redundant `getIconStateBundle` full scans on `moving` pass).
- [ ] **Step 2: Run Bug 2 test to record baseline**
  Run: `npx playwright test tests/node-aa-drag-perf-fill-empty.spec.ts -g "Bug 2"`
- [ ] **Step 3: Implement Binary-Search Snap & Band-Bucketed `spacings` in `src/engine/figcraftSnap.tsx`**
  - Add helper `ensureIndexedTargets(t)`:
    - Computes lightweight signature `(t.xs.length | 0) * 1315423911 + t.ys.length * 2654435761 + t.boxes.length` (or stores counts `_idxXsLen, _idxYsLen, _idxBoxesLen`). When stale:
      - Build `t._sortedXs = t.xs.slice().sort((a, b) => a.v - b.v)` and `t._sortedYs = t.ys.slice().sort((a, b) => a.v - b.v)` (leaving `t.xs`/`t.ys` intact if any external code iterates them directly).
      - When `t.boxes.length > 64`, build 1D bucket maps `t._boxRowBuckets` (key = `Math.floor(y / 128)`) and `t._boxColBuckets` (key = `Math.floor(x / 128)`) storing unique box indices intersecting each horizontal/vertical 128-unit strip.
  - Add binary-search range scan `forEachLineInRange(sortedLines, loV, hiV, fn)`: uses `lowerBound(sortedLines, loV)` and breaks as soon as `line.v > hiV`.
  - Update `snapSpans(t, xs, ys, threshold, skipGuides = false)`, `guidesSpans(t, xs, ys)`, and `snapAxis(t, vertical, offset, threshold)` to use `ensureIndexedTargets(t)` + `forEachLineInRange`. Pass `skipGuides = true` from `snapMove` so `snapSpans` doesn't generate discarded guides before final `guidesFor(t, at)`.
  - Update `spacings(t, r, horizontal)` to pull candidate boxes ONLY from `_boxRowBuckets` / `_boxColBuckets` covering `[rp.clo, rp.chi]` (deduped via a stamp array or tiny Set) when `t.boxes.length > 64`, avoiding full-document scans on every drag frame while producing bit-identical `before`/`after` candidates!
- [ ] **Step 4: Optimize `multiSnapSolver.tsx`, `canvasKitScene.tsx`, & `VectorEditor.tsx`**
  - In `src/engine/multiSnapSolver.tsx`: pre-warm `ensureIndexedTargets` or ensure `getEdgeTargets` reuses object bboxes instead of rebuilding when unchanged, and pre-filter distant shapes when `objs.length > 250` before running segment sampling in `snapOutline` / `snapMany` (`spatialIndexAndHitTest.tsx` or fast bbox check).
  - In `src/renderer/canvasKitScene.tsx` (`lines 1197-1202`):
    - If `moving && options.objectsOverride` has NO member passing `isIconFrameVectorMember(o)`, skip `getIconStateBundle(...)` completely (`partialGroups = EMPTY_SET`, `iconFrameState = EMPTY_MAP`).
    - Otherwise cache the last `getIconStateBundle` result by `(iconSource, dragIds)` reference pair on `this._iconBundleCache` so repeated drag frames do O(1) lookup.
  - In `src/components/editor/VectorEditor.tsx`:
    - Add optional 5th parameter `deferRender = false` to `altDupMove(e, dg, dx, dy, deferRender = false)` (`line 4841`): when `deferRender` is true (called from `objDragRafRef` at `line 5821` which calls `sceneRendererRef.current.renderFrame()` on the very next line), call `setDragOffset(dg.ids, dx, dy)` WITHOUT redundant `requestRender()`.
    - Add `skipSnapOnAltDup` / keep `runObjOrNodeDrag(..., deferRender)` passing `deferRender = true` inside `objDragRafRef`.
- [ ] **Step 5: Re-run Bug 2 Playwright test & verify latency drop + regression pass**
  Run: `npx playwright test tests/node-aa-drag-perf-fill-empty.spec.ts -g "Bug 2" tests/context-menu-hover-perf.spec.ts`

---

### Task 3: Build Polygon Topology Engine `src/engine/fillEmptySpaceEngine.tsx` + Export on `VE`

**Files:**
- Create: `src/engine/fillEmptySpaceEngine.tsx`
- Modify: `src/engine/vectorEngine.tsx` (re-export `fillEmptySpaceDoc`)
- Test: `tests/node-aa-drag-perf-fill-empty.spec.ts` (Part 3: Engine topology tests — Parent fill, Child-2 fill, Separated object rejected, Compound/stroke-wall/multi-select)

- [ ] **Step 1: Write failing Playwright topology tests for Feature 3 engine behavior**
  Write tests covering:
  1. Outer hollow parent (`P`) enclosing 3 connected inner spaces (with `Child 2` in middle and spaces `1` & `3` empty after deletion):
     - Select `P` -> call `fillEmptySpace` -> `P` fills spaces `1` and `3`, area increases to absorb both pockets.
     - Select `Child 2` -> call `fillEmptySpace` -> `Child 2` absorbs spaces `1` and `3` while keeping `Child 2` fill color, stroke, opacity, group, z-order.
  2. Separated object test: parent frame with `Child 2` separated from empty pocket `3` by divider `Child 4` (e.g. adjacent column `Child 2 | Child 4 | Empty 3`), and a completely isolated island outside or walled off by `Child 4`:
     - Selecting an object with NO direct contact with any empty pocket -> returns `changed: false` (`reason: 'notouch'` or `'noempty'`) and leaves document unchanged.
     - Selecting `Child 2` when bordering Pocket `1` on left and walled off by `Child 4` on right -> fills ONLY Pocket `1`, NOT Pocket `3`.
  3. Stroke-only closed/open dividers: hollow stroked rectangle enclosing shapes + dividing stroke line splits pocket accurately.
- [ ] **Step 2: Run Feature 3 tests to verify RED**
  Run: `npx playwright test tests/node-aa-drag-perf-fill-empty.spec.ts -g "Feature 3"`
- [ ] **Step 3: Implement `src/engine/fillEmptySpaceEngine.tsx`**
  Core functions (pure JS/TS, no JSX):
  - Constants: `FLAT_TOL = 0.25`, `REFIT_TOL = 0.45`, `TOUCH_TOL = 1.25`, `MIN_POCKET_AREA = 1.0`, `MIN_CONTACT_SAMPLES = 2`.
  - Helper `objectToBarrierRings(o)`:
    - If `o.fill && o.fill !== 'none'` or `gradOn(o)`: `flattenObjToRings(o, FLAT_TOL).rings`.
    - Also for stroke-only closed objects OR objects containing open stroked subpaths (`hasVisibleStroke(o)` where `!sp.closed` or no fill): invoke `outlineStrokeDoc({ objects: [strokeOnlySubset] }, new Set([o.id]))` and flatten result via `flattenObjToRings` -> append to barrier rings.
  - Helper `collectSpatialCluster(selTargets, allObstacles, touchTol)`:
    - BFS bbox expansion starting from bboxes of `selTargets`, repeatedly adding obstacles within `touchTol` of any obstacle bbox already in the cluster.
  - Helper `extractBoundedPockets(clusterRings, bboxExpanded)`:
    - `U = unionTree(clusterRings)` via balanced binary divide-and-conquer `clipRings(left, right, 'union')` + `normalizeRingOrientations`.
    - Build CCW `outerRect` (`[bx0 - 12, by0 - 12]` .. `[bx1 + 12, by1 + 12]`).
    - `diff = normalizeRingOrientations(clipRings([outerRect], U, 'difference'))`.
    - Group rings by nesting containment: discard the single outer ring whose vertices coincide with `outerRect` corners; pair each remaining positive outer ring (`area > 0`) with its direct child hole rings (`area < 0`, e.g. islands floating inside a pocket), filtering out tiny pockets where `Math.abs(netArea(comp)) < MIN_POCKET_AREA`.
  - Helper `measureDirectContact(selRings, pocketComp, otherObstaclesRings, touchTol)`:
    - Sample vertices + dense midpoints along `selRings` and `pocketComp` outer/hole rings within their overlapping expanded bbox (`touchTol`).
    - Compute point-to-segment distance and shared boundary contact length / count `<= touchTol`.
    - Validate direct unobstructed bridge: for contacting pairs `(ps, pp)`, check midpoint `((ps.x + pp.x) * 0.5, (ps.y + pp.y) * 0.5)` is NOT strictly inside (`isInsideRings`) any *other* obstacle in the cluster.
    - Return `{ connected: contactSamples >= MIN_CONTACT_SAMPLES || contactLen >= 0.4, score }`.
  - Helper `snapPocketToTarget(pocketRings, targetRings, touchTol)`:
    - For vertices of `pocketRings` within `touchTol` of a segment of `targetRings`, nudge vertex `0.05` doc units inward past the target boundary toward the closest point normal so `clipRings(targetRings, pocketRings, 'union')` welds cleanly with zero hairline gaps while preserving non-shared edges verbatim.
  - Main export `fillEmptySpaceDoc(doc, selIds)`:
    - Validates `selTargets` (`!o.hidden && !o.locked && !o.img && !o.text && !o.isFrameBg && !o.isAutoFrame && subs.some(closedOrVisible)`).
    - Assigns each directly connected pocket to the winning selected object with highest `score` (breaking ties by selection/doc order).
    - If 0 pockets found (`pockets.length === 0`) return `{ doc, changed: false, reason: 'noempty' }`; if pockets exist but none directly connected to selection return `{ doc, changed: false, reason: 'notouch' }`.
    - Merges base rings of each winning target (or stroke-band rings + promoted `fill` for stroke-only closed target) + assigned pockets via `clipRings(..., 'union')` -> `normalizeRingOrientations` -> `ringsToSubs(..., REFIT_TOL)`.
    - Returns `{ doc: nextDoc, changed: true, resultIds, stats: { updatedObjects, filledPockets } }`.
  - Re-export `fillEmptySpaceDoc` in `src/engine/vectorEngine.tsx`.
- [ ] **Step 4: Run Feature 3 engine Playwright tests & `npm run typecheck`**
  Run: `npm run typecheck` and `npx playwright test tests/node-aa-drag-perf-fill-empty.spec.ts -g "Feature 3"`

---

### Task 4: Wire "Isi Ruang Kosong" UI, Context Menu, Inspector, Tooltips, & i18n

**Files:**
- Modify: `src/constants/appI18n.tsx` (`edFillEmpty` in `APP_STR.id` and `APP_STR.en`)
- Modify: `src/constants/tooltipsCatalog.tsx` (`veFillEmpty` in `TIPS` and `TIPS_EN`)
- Modify: `src/components/editor/EditorFloatingToolbar.tsx` (`BOOL_ITEMS`, props `applyFillEmptySpace`, `canFillEmpty`)
- Modify: `src/components/editor/EditorRightInspector.tsx` (`fill-empty-btn`, props `onFillEmptySpace`, `canFillEmpty`)
- Modify: `src/components/editor/VectorEditor.tsx` (`applyFillEmptySpace`, `ctxItems`, props to Toolbar/Inspector, `window.__geovantaEditorApi`)
- Test: `tests/node-aa-drag-perf-fill-empty.spec.ts` (UI integration via Toolbar, Context Menu, Right Inspector button + Undo/Redo) & `tests/i18n-and-tooltips-completeness.spec.ts`

- [ ] **Step 1: Add UI interaction test in `tests/node-aa-drag-perf-fill-empty.spec.ts`**
  Verify clicking `fill-empty-btn` in right inspector, selecting from Boolean dropdown in toolbar, and triggering via context menu all execute `fillEmptySpace`, update toast status, and cleanly support Ctrl+Z / Undo.
- [ ] **Step 2: Add `edFillEmpty` in `appI18n.tsx` and `veFillEmpty` in `tooltipsCatalog.tsx`**
  Ensure exact key parity between `id` and `en`.
- [ ] **Step 3: Wire `applyFillEmptySpace` in `VectorEditor.tsx`, `EditorFloatingToolbar.tsx`, & `EditorRightInspector.tsx`**
  - Toolbar `BOOL_ITEMS`: add `['fillEmpty', 'veFillEmpty', L.edFillEmpty || ..., '<clear bucket/cavity SVG icon>', '', !canFillEmpty, () => applyFillEmptySpace?.()]`.
  - Context Menu `ctxItems`: add `{ k: 'fill-empty', label: L.edFillEmpty, ic: ..., tip: 'veFillEmpty', dis: !canFillEmpty, act: applyFillEmptySpace }` right below `'separate-icon'`.
  - Right Inspector: render `<button type="button" className="btn sec fig-cta-btn w-full" data-testid="fill-empty-btn" data-tip="veFillEmpty" onClick={onFillEmptySpace}>...</button>` when `canFillEmpty && onFillEmptySpace`.
- [ ] **Step 4: Run Full Verification Gate (Syntax Check + Build + All Relevant Playwright Suites)**
  - Run `npm run typecheck`
  - Run `npm run build:web`
  - Run `npx playwright test tests/node-aa-drag-perf-fill-empty.spec.ts tests/i18n-and-tooltips-completeness.spec.ts tests/zoom-hold-aliasing.spec.ts tests/bugfix-and-solid-to-gradient.spec.ts tests/context-menu-hover-perf.spec.ts tests/icon-overlap-and-separate.spec.ts`
