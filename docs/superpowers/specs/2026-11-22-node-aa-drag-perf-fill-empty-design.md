# Design Spec: Node-Edit Anti-Aliasing Fix, High-Density Object Drag Performance, & Fill Empty Space ("Isi Ruang Kosong")

**Date:** 2026-11-22
**Status:** Draft for Review & Approval

---

## 1. Overview

Three coordinated improvements in Geovanta Vector Studio:
1. **Fix Node/Handle Edit Pixelation & Seam Blur:** Entering node-edit mode and dragging nodes, Bezier handles, or segment curvature currently disables 2x RGSS supersampling across the entire canvas and strips thin `stroke === fill` anti-seam strokes, exposing pixelated seams on all adjacent vector shapes.
2. **Fix Heavy Drag FPS Drop & Lag on Dense Canvases (1,000–2,000+ Objects):** Dragging objects in dense documents is bottlenecked by linear `O(N)`/`O(N²)` snap-target scans every pointermove, redundant `getIconStateBundle(allObjects)` full-document scans inside the CanvasKit moving pass, and redundant render scheduling.
3. **Add "Isi Ruang Kosong" / "Fill Empty Space" (Pendekatan A — Polygon Topology Engine):** Allows selecting any path object that directly borders one or more enclosed empty pockets (left behind after deleting neighboring/inner objects) and expanding/unioning those connected empty pockets into the selected object. Objects separated from the empty pocket by another object cannot fill it.

---

## 2. Bug 1 — Node-Edit Pixelated & Blurry Edges Fix

### Root Cause
1. In `src/components/editor/VectorEditor.tsx`, dragging a node (`line 6577`) or Bezier handle/curvature (`line 6382`) calls `sceneRendererRef.current?.setSceneInteracting?.(true)`, sharing the exact same flag used by the Recolor paint-preview slider (`rcPreviewDoc`, `line 1836`).
2. In `src/renderer/sceneRenderer.tsx`:
   - `line 571`: `const useRgss = !RENDER_CONFIG.antialias && !(this.sceneInteracting && (!isGpu || objCount > 150));` drops the entire canvas out of RGSS supersampling to 1x AA (`drawVectorFrame`) whenever `sceneInteracting` is `true` on CPU or `> 150` objects on GPU.
   - `lines 884–885`: when `useRgss` *is* active, `interacting` drops 4-sample `RGSS_2X_OFFSETS` to 2-sample `RGSS_2X_FAST_OFFSETS` on CPU/500+ GPU objects.
3. In `src/renderer/canvasKitScene.tsx`:
   - `lines 1265–1270`: when `interacting` is `true`, all thin strokes matching `effStrokePx < 0.5 || (effStrokePx <= 1.5 && !hasGrad && !VE.strokeGradOn(o) && o.stroke === o.fill)` are disabled (`stroke = false`). Those thin `stroke === fill` strokes are Geovanta's primary anti-seam compensation between touching polygons. Stripping them across static shapes exposes sub-pixel hairline gaps and jagged/blurry contrast edges on every object in the canvas.
   - `lines 1242–1248`: sub-0.5px shapes are culled during `interacting && !isMovingPass`, creating flickering holes in intricate artwork during node drags.

### Architecture & Changes
1. **Separate Paint Interaction from Geometry/Node Interaction in `SceneRenderer` (`src/renderer/sceneRenderer.tsx`):**
   - Keep `sceneInteracting` specifically for paint-preview/recolor-slider interactions, OR introduce `this.paintInteracting` (with `setPaintInteracting(active)`) and keep `setSceneInteracting(active)` for node/rotate/scale while storing `this.geometryInteracting`:
     - Cleaner API with zero breakage for existing callers:
       - Add `setPaintInteracting(active: boolean)` on `SceneRenderer` (and call it in `VectorEditor.tsx` `rcPreviewDoc` instead of `setSceneInteracting`), clearing both flags cleanly on interaction end / `onPointerUp` if needed.
       - Keep `setSceneInteracting(active)` for geometry edits (`node`, `handle`, `curv`, `seg`, `rotate`, `scale`).
   - Update `useRgss` and CPU pan cache guard in `drawFrame()` (`src/renderer/sceneRenderer.tsx`):
     ```ts
     const fastPaintDropRgss = this.paintInteracting && (!isGpu || objCount > 150);
     const useRgss = !RENDER_CONFIG.antialias && !fastPaintDropRgss;
     ```
     And guard `cpuPanEligible` (line 579) with `!this.sceneInteracting && !this.paintInteracting` so paint previews never read stale pan caches. Result: Node/handle/curvature edits NEVER disable 2x RGSS supersampling, while Recolor slider keeps its CPU/>150-obj speedup.
   - In `drawFrame()` -> `renderRgssFrame(...)`:
     - Pass `preserveAntiSeam: !this.paintInteracting && !this.cameraInteracting` inside `options` when not doing camera pan or recolor slider interaction.
     - In `renderRgssFrame`, during geometry/node edits (`this.sceneInteracting && !this.paintInteracting && !this.cameraInteracting`), use 4-pass `RGSS_2X_OFFSETS` when `isGpu || objCount <= 400` (and 2-pass `RGSS_2X_FAST_OFFSETS` above 400 on CPU, still 2x RGSS).
2. **Preserve Anti-Seam Strokes & Thin Shapes in `CanvasKitScene` (`src/renderer/canvasKitScene.tsx`):**
   - In `drawPass`, derive `const dropMicroSeam = interacting && !options.preserveAntiSeam;` (and only cull sub-0.5px tiny shapes or drop thin `o.stroke === o.fill` anti-seam strokes when `dropMicroSeam` is `true`).
   - Wait: verify `VectorEditor.tsx` also clears `setPaintInteracting(false)` when `rcCommitPreview` / pointer release occurs (already triggered via `onRcPreviewDoc(..., { interacting: false })` and defensively on `onPointerUp`).

---

## 3. Bug 2 — Smooth Object Dragging on Dense Canvases (1,000–2,000+ Objects)

### Root Causes
1. **O(N) / O(N²) Snap Evaluation per Drag Frame (`src/engine/figcraftSnap.tsx`, `src/engine/multiSnapSolver.tsx`):**
   - `buildSnapCache` pushes ~3 X lines, ~3 Y lines, plus a bbox into `t.xs`, `t.ys`, `t.boxes` (and nodes/midpoints/axial lines) for *every* object in the document.
   - On every pointermove rAF, `snapMove` linearly scans every entry in `t.xs`, `t.ys`, and runs `equalSpacing` over `t.boxes`, allocating guide candidates and spans even when `N = 2,000+` objects are mostly off-screen or far from the dragged object.
2. **Full-Document `getIconStateBundle` Scan Inside CanvasKit Moving Pass (`src/renderer/canvasKitScene.tsx`):**
   - `drawPass(true)` (`passMode: 'moving'`) receives `objects = this.dragMovingObjects` (typically 1–10 objects), yet line 1199 calls `getIconStateBundle(options.allObjects || objects, drag?.ids || null)`, iterating all `N` objects in `doc.objects` to build maps/sets on *every single frame* during drag!
3. **Redundant `requestRender()` + Sync `renderFrame()` + Drag React State Work (`src/components/editor/VectorEditor.tsx`):**
   - `altDupMove` calls `setDragOffset` + `requestRender()` (scheduling a rAF), and then `objDragRafRef` (`line 5822`) calls `renderFrame()` synchronously on the same frame. Even though `renderFrame()` cancels `this.raf`, calling `requestRender()` first schedules unnecessary browser timer churn per frame when we're already inside the drag rAF.
   - `dragObj` computes `edgeFn` -> `VE.snapMany` / `VE.snapOutline` and builds full node caches even when moving in dense documents where `viewport` culling / binary search makes queries `O(log N + k)`.

### Architecture & Changes
1. **Binary-Search & Local-Window Snap Indexing (`src/engine/figcraftSnap.tsx` & `src/engine/multiSnapSolver.tsx`):**
   - Add `prepareSortedTargets(t)` in `figcraftSnap.tsx` (idempotent via WeakSet/flag `t._sortedReady`):
     - Sorts `t.xs` ascending by `v` and `t.ys` ascending by `v`.
     - Sorts `t.boxes` ascending by `x0`.
     - Keeps a lightweight spatial/sorted `t._maxBoxW` so `snapSpans` uses binary search (`lowerBound(v - tol)` to `upperBound(v + tol)`) instead of linear `for (let i = 0; i < lines.length; i++)`. Complexity per frame drops from `O(N)` to `O(log N + K)` where `K` is only lines within snap tolerance!
   - In `equalSpacing` / `spacingGuides`:
     - First filter `t.boxes` to boxes in a local neighborhood window around the moving union rect (e.g., expanded by `max(900, 1.5 * spanSize)` in doc space, capped at nearest 64 boxes sorted by distance if more than 64 lie inside the window). This prevents `O(N²)` / large-array equal-spacing scans while giving 100% identical spacing snaps for any visible nearby objects.
   - In `multiSnapSolver.tsx` (`buildSnapCache`):
     - Call `prepareSortedTargets` once when `buildSnapCache` finalizes `Targets` (or when `t.xs`/`t.ys` first stabilize), and in `getEdgeTargets` cache the spatial hash / object BBox list cleanly once per drag (already mostly cached, ensure `edgeFn` respects a fast doc-size bbox filter over `SpatialIndex` if `objs.length > 250`!).
2. **Memoize / Fast-Path `getIconStateBundle` During Moving Pass (`src/renderer/canvasKitScene.tsx`):**
   - Add a fast check + 1-slot cache `(this._lastIconBundleSrc, this._lastIconBundleDragIds, this._lastIconBundle)` on `CanvasKitScene`:
     - In `drawPass(moving)`: when `moving === true` and `options.objectsOverride` is provided, first check if *any* object in `objectsOverride` satisfies `isIconFrameVectorMember(o)`. If none do (the common case for normal paths, shapes, groups), skip `getIconStateBundle(allObjects, ...)` completely (`partialGroups = EMPTY_SET`, `iconFrameState = EMPTY_MAP`).
     - Otherwise, reuse cached `bundle` whenever `iconSource === this._lastIconBundleSrc && dragIds === this._lastIconBundleDragIds`.
3. **Avoid Duplicate rAF Scheduling in `altDupMove` (`src/components/editor/VectorEditor.tsx`):**
   - Allow `altDupMove(e, dg, dx, dy, deferRender = false)`: when called from `objDragRafRef` (where line 5822 immediately invokes `sceneRendererRef.current.renderFrame()`), skip `requestRender()` since `setDragOffset(dg.ids, dx, dy)` already marks `this.dirty = true` and `renderFrame()` draws immediately in the same rAF callback. (When called synchronously outside rAF, `requestRender()` still schedules as before.)
   - Ensure `SpatialIndex` pre-query or `queryFastDragDomEls` does not repeat work during drag (already guarded by `dg.domElsQueried`).
   - Also keep `dragStaticImage` clean: verify `staticKey` in `SceneRenderer.drawFrame()` (`line 474`) does not depend on changing React state, so `rebuiltStatic` is `true` on frame 1 ONLY and `false` on all subsequent frames of the drag!

---

## 4. Feature 3 — "Isi Ruang Kosong" / "Fill Empty Space" (Pendekatan A: Polygon Topology Engine)

### Functional Behavior & User Rules
- **UX Flow (Approved Recommendation 1):**
  1. User selects 1 (or more) unlocked, non-hidden vector path object(s) (`S`).
  2. User clicks **"Isi Ruang Kosong"** (`Fill Empty Space`) in the Boolean/Pathfinder dropdown (`EditorFloatingToolbar.tsx`), Right-Click Context Menu (`VectorEditor.tsx`), or Right Inspector quick action when eligible.
  3. System inspects all enclosing empty spaces (bounded pockets / interior voids) formed by objects on the canvas and fills every empty space that is **directly adjacent/connected** to `S` by merging those empty pocket polygons directly into `S` (preserving `S`'s fill, gradient, stroke, strokeWidth, opacity, blendMode, group, z-order, and id).
  4. Objects that are **separated** from an empty space by another object (no direct boundary contact with the pocket) **cannot** fill that space and produce a clear status feedback toast explaining that no directly connected empty space exists around the selection.

### Core Topology Algorithm (`src/engine/fillEmptySpaceEngine.tsx`)
Uses existing polygon boolean & ring utilities from `src/engine/pathBoolean.tsx` (`flattenObjToRings`, `clipRings`, `normalizeRingOrientations`, `ringArea`, `isInsideRings`, `ringsToSubs`, `segSegIntersect`).

#### Step-by-Step Pipeline: `fillEmptySpaceDoc(doc, selIds, opts?)`
1. **Validate Selection & Obstacles:**
   - Selected targets `selTargets`: unlocked, visible, non-`img`, non-`text`, non-`isFrameBg`, non-`isAutoFrame` objects in `doc.objects` matching `selIds` with valid `subs.length > 0` that have at least one **closed** subpath (`sp.closed`) OR a visible stroke/fill region (`hasVisibleFill || hasVisibleClosedStroke`). Pure open lines (`!subs.some(sp => sp.closed)`) cannot be expanded as containers (though they act as dividing barriers); if only open paths are selected, return `{ changed: false, reason: 'needpath' }`.
   - Collect all scene obstacle geometries (`obstacles`) from visible, non-`isFrameBg`, non-`isAutoFrame`, non-`img`, non-`text` objects with `subs.length > 0`:
     - **Filled closed shapes** (`o.fill && o.fill !== 'none'`, or gradient fill `gradOn(o)`): flattened directly via `flattenObjToRings(o, FLAT_TOL)`.
     - **Stroke-only closed barriers AND open stroked dividing walls** (`visible stroke: o.stroke && o.stroke !== 'none' && (o.strokeWidth || 0) > 0` on stroke-only shapes or `!sp.closed` subpaths): expanded into wall-band polygon rings via `outlineStroke` / `strokeOutlineRings` helpers from `src/engine/pathOffset.tsx`. That guarantees open Pen/Line dividers and unfilled stroked borders act cleanly as physical barriers and keep interior pockets hollow.
   - Also filter obstacles to the connected spatial cluster around `selTargets` via BFS bbox expansion (start from the union bbox of `selTargets` expanded by `touchTol`, iteratively pulling in any obstacle whose bbox intersects the expanding cluster bbox + `touchTol`), keeping obstacle counts small and fast even on 2,000-object scenes while preventing unrelated distant shapes from slowing down polygon unioning.

2. **Compute Enclosed Empty Pockets (`H`):**
   - Union all flattened obstacle rings `R_obs` of the spatial cluster via divide-and-conquer / tree `clipRings(..., 'union')` -> `U`, then normalize with `normalizeRingOrientations(U)`.
   - Compute exact bounded empty components from `U`:
     - Construct `outerRect` = `[unionBBox(U) expanded by 10]` (CCW positive rectangle).
     - Compute `pocketsDiff = clipRings([outerRect], U, 'difference')` and normalize via `normalizeRingOrientations(pocketsDiff)`.
     - Discard the single unbounded exterior component (the outer ring touching `outerRect`'s corners).
     - Every remaining connected positive component (positive outer ring + any nested negative hole rings from floating islands inside the cavity) is an **exact enclosed empty space pocket** `P_k`.
     - Filter out microscopic numerical slivers with `Math.abs(netArea(P_k)) < MIN_POCKET_AREA` (e.g., `1.0` sq doc unit) so sub-pixel curve flattening cracks are not treated as empty spaces.

3. **Strict Direct-Connection Test (`pocketBordersSelection`):**
   - For each candidate enclosed empty pocket `P_k` and each selected object `S_j`:
     - First fast reject if `bbox(P_k)` expanded by `touchTol` (`1.25` doc units) does not intersect `bbox(S_j)`.
     - Compute boundary contact between `P_k`'s outer/inner ring vertices & sampled edge midpoints and `S_j`'s rings (`minBoundaryDistance` and contact span):
       - Because floating-point flattening or tiny 0.05–0.5px gaps can separate touching shapes, test minimum point-to-segment distance from densely sampled boundary points of `P_k` (all vertices + midpoints of long segments) to segments of `S_j`, AND vice versa (sampled points of `S_j` to segments of `P_k`).
       - `S_j` directly connects to `P_k` iff they share continuous boundary contact within `touchTol = 1.25` doc units: e.g. at least 2 contact samples on an edge (or a shared boundary segment length `>= 0.5` doc units) within `<= touchTol`, **AND** the segment midpoint bridging a contact point on `S_j` to `P_k` does NOT cross through the interior of another obstacle object!
         - Why check that no other obstacle blocks the bridge? Because `P_k` is already computed from `[expandedBBox] \ U`, if there is a `1.0`px gap inside `tolerance`, checking that a tiny non-selected object of thickness `0.8`px isn't sitting *between* `S_j` and `P_k` makes separation airtight! Specifically, check midpoint `M = (p_s + p_p) / 2` is NOT strictly inside (`isInsideRings`) any *other* obstacle object `O_m` (`O_m != S_j`)!
     - Track `contactScore(S_j, P_k)` = number of contacting sample points * segment weight (approx shared boundary length).
     - Notice what happens in the user's scenario:
       - `Parent` + `Child 2` remain after `Child 1` and `Child 3` are deleted -> `P_1` (empty space 1) and `P_3` (empty space 3) are bounded pockets inside `U`.
       - Both `Parent` and `Child 2` directly border `P_1` and `P_3` -> selecting `Parent` fills `P_1` and `P_3` into `Parent`; selecting `Child 2` fills `P_1` and `P_3` into `Child 2`.
       - If instead `Child 4` separates `Child 2` from `P_3`, then `Child 2` has `0` direct boundary contact with `P_3` (only `P_1`), so selecting `Child 2` fills ONLY `P_1`, never jumping across `Child 4` into `P_3`. And if `Child 2` is completely surrounded by non-empty objects and does not touch ANY empty pocket, it returns `{ changed: false, reason: 'notouch' }`.

4. **Assign & Merge Connected Pockets Into Selected Object(s):**
   - If multiple selected objects directly touch the *same* pocket `P_k`, assign `P_k` to the single touching selected object with the highest `contactScore` (tie-breaker: earlier index in `doc.objects` / primary selection) so two selected objects don't generate overlapping duplicate fills for the same empty pocket.
   - For each selected object `S_j` that won one or more pockets `[P_a, P_b, ...]`:
     - Determine `S_j`'s base polygon rings:
       - If `S_j` has a fill (`S_j.fill && S_j.fill !== 'none'` or `gradOn(S_j)`): flatten `S_j` via `flattenObjToRings(S_j, FLAT_TOL)`.
       - If `S_j` is a stroke-only closed container (`(!S_j.fill || S_j.fill === 'none') && !gradOn(S_j)` and visible stroke): use `S_j`'s expanded stroke-band rings (`strokeOutlineRings` from `pathOffset.tsx`) so its visual boundary matches the union seam, and promote `fill = S_j.stroke || '#000000'` (or `S_j.strokeGrad` -> `grad`) on the updated object so the filled space renders visibly instead of staying `fill: 'none'`.
     - Union `S_j`'s base rings with its assigned pockets using `clipRings(baseRings, assignedPocketRings, 'union')` + `normalizeRingOrientations`.
     - **Seam-free contact snapping:** If a pocket `P_a` has sub-`touchTol` micro-gaps (`<= touchTol`) along shared edges with `S_j`, snap/project vertices on `P_a` that lie within `touchTol` of `S_j`'s boundary segments slightly across into `S_j`'s interior (by e.g. `0.05` doc units) *before* unioning, so `clipRings` welds cleanly without hairline gaps or bloating `S_j`'s non-shared edges.
     - Convert resulting normalized rings back to smooth vector `subpaths` via `ringsToSubs(mergedRings, REFIT_TOL)` (`pathBoolean.tsx`).
     - Preserve all visual/metadata properties of `S_j` (promotion of stroke->fill only when `S_j` had `fill === 'none'`): `id`, `name`, `fill` (or promoted), `stroke`, `strokeWidth`, `strokeOpacity`, `fillOpacity`, `opacity`, `grad`, `strokeGrad`, `fillRule: S_j.fillRule || 'nonzero'`, `blendMode`, `effects`, `group`, z-index position. Note: `normalizeRingOrientations` guarantees opposing outer/hole windings so `'nonzero'` renders cleanly.

### UI, Shortcuts, I18n, & Tooltips Integration
- **Engine Export:** Export `fillEmptySpaceDoc` from `src/engine/fillEmptySpaceEngine.tsx` and re-export on `VE` (`src/engine/vectorEngine.tsx`).
- **Action Handler in `VectorEditor.tsx`:**
  - `applyFillEmptySpace()`: calls `VE.fillEmptySpaceDoc(docRef.current, selRef.current.objs)`.
  - If `!res.changed`: displays localized `say(...)` feedback:
    - `'needpath'`: `"Pilih minimal satu objek path tertutup terlebih dahulu"` / `"Select at least one closed path object first"`
    - `'noempty'`: `"Tidak ditemukan ruang kosong tertutup di sekitar seleksi"` / `"No enclosed empty space found around selection"`
    - `'notouch'`: `"Objek terpilih tidak terhubung langsung ke ruang kosong (terpisah oleh objek lain)"` / `"Selected object is not directly connected to an empty space (separated by other objects)"`
  - If `res.changed`: `commit(res.doc, 'fill-empty-space')`, preserve selection on modified object IDs, show localized success summary (`"${filledCount} ruang kosong berhasil diisi ke ${updatedObjects} objek"`).
- **UI Entry Points:**
  1. `EditorFloatingToolbar.tsx` -> `BOOL_ITEMS`: add `['fillEmpty', 'veFillEmpty', L.edFillEmpty, '<icon path>', '', !canFillEmpty, () => applyFillEmptySpace?.()]` right next to `separateIcon` (`canFillEmpty = eligiblePaths.length >= 1`). Pass `applyFillEmptySpace` & `canFillEmpty` from `VectorEditor.tsx`.
  2. `VectorEditor.tsx` -> `ctxItems` (Right-Click Context Menu): add `{ k: 'fill-empty', label: L.edFillEmpty, ic: ..., tip: 'veFillEmpty', dis: !canFillEmpty, act: applyFillEmptySpace }` right below `'separate-icon'`.
  3. `EditorRightInspector.tsx`: add a secondary quick-action button in the style/path action row (`data-testid="fill-empty-btn"`, `data-tip="veFillEmpty"`) rendered independently whenever `canFillEmpty && onFillEmptySpace` is true (never gated by `canSeparateIcon`), alongside `separate-icon-btn` when both are eligible.
  4. `VectorEditor.tsx` -> `window.__geovantaEditorApi`: also expose `fillEmptySpace: applyFillEmptySpace` alongside `applyRadiusToCorners` for clean automated UI/integration inspection.
- **Strict i18n & Tooltip Parity (`src/constants/appI18n.tsx` & `src/constants/tooltipsCatalog.tsx`):**
  - Add `edFillEmpty` to BOTH `APP_STR.id` and `APP_STR.en`.
  - Add `veFillEmpty` to BOTH `TIPS` and `TIPS_EN` in `src/constants/tooltipsCatalog.tsx`, ensuring `tests/i18n-and-tooltips-completeness.spec.ts` passes 100%.
  - Select language-aware strings in `applyFillEmptySpace` (`prefs?.lang === 'en' ? ... : ...`) consistent with `applyMakeCompoundPath` / `applyReleaseCompoundPath`.

---

## 5. Verification Plan

Per repository rules (`AGENTS.md`: Playwright Regular `@playwright/test` + `tsc --noEmit`):
1. **Syntax & Build Check:** `npm run typecheck` (`tsc --noEmit`) and `npm run build:web`.
2. **Existing Regression Suites:**
   - `npx playwright test tests/i18n-and-tooltips-completeness.spec.ts` (must stay 100% green).
   - `npx playwright test tests/zoom-hold-aliasing.spec.ts tests/bugfix-and-solid-to-gradient.spec.ts` (verify zoom/AA/recolor weren't broken).
3. **New Targeted E2E Playwright Test (`tests/node-aa-drag-perf-fill-empty.spec.ts`):**
   - **Bug 1 test:** Load adjacent touching vector shapes (including > 160 shapes so `objCount > 150` GPU/CPU path triggers), enter node-edit mode, initiate node drag, sample renderer state / canvas pixels (`readCanvasPixels` & `sceneRenderer.sceneInteracting` / `paintInteracting`), verify RGSS stays active (`useRgss`) and thin `stroke === fill` anti-seam boundaries do not expose hairline background gaps or turn blurry. Also verify Recolor slider still triggers `paintInteracting` speedup cleanly.
   - **Bug 2 test:** Generate 1,500+ vector objects on canvas, perform 20+ frames of pointermove dragging on an object, measure frame time / snap time (`snapMove` + `dragFrame` latency) and verify `getIconStateBundle` is skipped/cached on moving pass and average drag frame stays smooth without UI freeze.
   - **Feature 3 tests:**
     - **Case A (Direct Connection — Parent):** Hollow/enclosing outer parent object + middle connected child 2 (simulating child 1 and child 3 already deleted leaving 2 enclosed empty pockets). Select parent -> click Fill Empty Space -> parent absorbs both empty pockets; verify filled area increases to cover full parent + pockets.
     - **Case B (Direct Connection — Middle Child 2):** Same scene; select Child 2 -> click Fill Empty Space -> Child 2 expands to fill both adjacent empty pockets 1 and 3 while keeping Child 2's fill/properties!
     - **Case C (Separated Object Blocked):** Scene with Parent ring, Child 4 acting as a wall separating Child 2 from Empty Pocket 3, and Empty Pocket 1 touching Child 2.
       - Select Child 2 -> fills ONLY Pocket 1 (not Pocket 3).
       - Test an object completely separated from all empty pockets (e.g. island separated by surrounding wall) -> clicking Fill Empty Space leaves doc unchanged (`changed: false`) and displays feedback message.
     - **Case D (Group / Undo-Redo & Context Menu / Toolbar):** Verify undo/redo restores exact pre-fill state and toolbar/context-menu/right-inspector triggers work cleanly.
