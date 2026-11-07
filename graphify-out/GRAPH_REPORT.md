# Graph Report - Geovanta  (2026-11-07)

## Corpus Check
- 89 files · ~186,953 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: (none) 1)

## Summary
- 625 nodes · 2500 edges · 9 communities
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 193 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Editor Canvas & UI Components
- Rendering Pipeline & GPU Geometry
- Path Math & Document I/O
- Affine Transforms & Snapping Solver
- Node Editing & Geometry Refinement
- Topological Curve Simplifier
- React Offline Runtime
- Workspace & Asset Management
- Tailwind CSS Offline Engine

## God Nodes (most connected - your core abstractions)
1. `dist()` - 51 edges
2. `sub()` - 46 edges
3. `rd()` - 43 edges
4. `SceneRenderer` - 39 edges
5. `VectorEditor()` - 33 edges
6. `cross()` - 31 edges
7. `cl()` - 31 edges
8. `uid()` - 30 edges
9. `clampN()` - 30 edges
10. `dot()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `rootElement` --mounts_to--> `Root Element (#root)`  [INFERRED]
  src/main.jsx → index.html
- `vcSimplifyOpenChainNodes()` --indirect_call--> `cl()`  [INFERRED]
  src/engine/topologicalCurveSimplifier.jsx → src/engine/vectorPrimitives.jsx
- `LayerSvgPreview` --calls--> `vinfo()`  [EXTRACTED]
  src/components/editor/CanvasVectorObjects.jsx → src/renderer/pathWindingAndBatching.jsx
- `CanvasObj` --calls--> `isOpaquePaint()`  [EXTRACTED]
  src/components/editor/CanvasVectorObjects.jsx → src/renderer/pathWindingAndBatching.jsx
- `CanvasObj` --calls--> `vinfo()`  [EXTRACTED]
  src/components/editor/CanvasVectorObjects.jsx → src/renderer/pathWindingAndBatching.jsx

## Import Cycles
- 3-file cycle: `src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/spatialIndexAndHitTest.jsx`
- 4-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/affineAndOrientedBox.jsx`
- 4-file cycle: `src/engine/bezierSubdivisionAndMove.jsx -> src/renderer/geometryCache.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/bezierSubdivisionAndMove.jsx`
- 4-file cycle: `src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/textAndImageEngine.jsx -> src/engine/spatialIndexAndHitTest.jsx`
- 4-file cycle: `src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/svgDocumentParser.jsx -> src/engine/spatialIndexAndHitTest.jsx`
- 4-file cycle: `src/engine/bezierSubdivisionAndMove.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/bezierSubdivisionAndMove.jsx`
- 4-file cycle: `src/engine/figmaAutoLayoutAndFrames.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/figmaAutoLayoutAndFrames.jsx`
- 4-file cycle: `src/engine/gradientEngine.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/gradientEngine.jsx`
- 4-file cycle: `src/engine/multiSnapSolver.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/multiSnapSolver.jsx`
- 4-file cycle: `src/engine/selectionTransformAndAlign.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/selectionTransformAndAlign.jsx`
- 4-file cycle: `src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/renderer/subpathBBox.jsx -> src/engine/vectorEngine.jsx -> src/engine/spatialIndexAndHitTest.jsx`
- 5-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/bezierSubdivisionAndMove.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/affineAndOrientedBox.jsx`
- 5-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/bezierSubdivisionAndMove.jsx -> src/renderer/geometryCache.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/affineAndOrientedBox.jsx`
- 5-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/figmaAutoLayoutAndFrames.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/affineAndOrientedBox.jsx`
- 5-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/gradientEngine.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/affineAndOrientedBox.jsx`
- 5-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/selectionTransformAndAlign.jsx -> src/engine/affineAndOrientedBox.jsx`
- 5-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/renderer/subpathBBox.jsx -> src/engine/vectorEngine.jsx -> src/engine/affineAndOrientedBox.jsx`
- 5-file cycle: `src/engine/affineAndOrientedBox.jsx -> src/engine/textAndImageEngine.jsx -> src/engine/spatialIndexAndHitTest.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/affineAndOrientedBox.jsx`
- 5-file cycle: `src/engine/autoRefineGeometry.jsx -> src/engine/bezierSubdivisionAndMove.jsx -> src/renderer/geometryCache.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/autoRefineGeometry.jsx`
- 5-file cycle: `src/engine/bezierSubdivisionAndMove.jsx -> src/renderer/geometryCache.jsx -> src/renderer/pathWindingAndBatching.jsx -> src/engine/vectorEngine.jsx -> src/engine/figmaAutoLayoutAndFrames.jsx -> src/engine/bezierSubdivisionAndMove.jsx`

## Communities (9 total, 0 thin omitted)

### Community 0 - "Editor Canvas & UI Components"
Cohesion: 0.06
Nodes (97): App(), CanvasObj, CompositePathObj, LAYER_PREVIEW_JSX_CACHE, LayerSvgPreview, EditorActionRail(), EditorFloatingToolbar(), EditorLeftSidebar() (+89 more)

### Community 1 - "Rendering Pipeline & GPU Geometry"
Cohesion: 0.05
Nodes (46): geovanta.bundle.js, Google Fonts Stylesheet, Geovanta App Icon SVG, Root Element (#root), Geovanta — Vector Editor (Windows 64-Bit Desktop), RenderDebugCanvasOverlay(), rootElement, flattenCubicAdaptive() (+38 more)

### Community 2 - "Path Math & Document I/O"
Cohesion: 0.07
Nodes (77): arcArgs(), arcToCubics(), setCornerRadius(), applyArtboardPadding(), applyAutoLayout(), applyFramePadding(), clusterLayoutUnits(), createFrame() (+69 more)

### Community 3 - "Affine Transforms & Snapping Solver"
Cohesion: 0.08
Nodes (78): affineDet(), affineIdentity(), affineInverse(), affineMul(), affinePt(), affineRotate(), affineScale(), affineTranslate() (+70 more)

### Community 4 - "Node Editing & Geometry Refinement"
Cohesion: 0.15
Nodes (60): analyzeMultiScaleCornerZone(), autoRefineGeometry(), classifySubpathNodesDynamic(), consolidateSharpCornerClusters(), deleteNonCornerNodes(), fitLocalLineOLS(), pruneNonCornerSub(), simplifyWithSharpCornerPreservation() (+52 more)

### Community 5 - "Topological Curve Simplifier"
Cohesion: 0.10
Nodes (50): autoSimplifyLevel(), simplifyDoc(), simplifyLevelTolerance(), simplifyPart(), simplifyRun(), simplifySubpath(), simplifyWith(), VC_GL5_W (+42 more)

### Community 6 - "React Offline Runtime"
Cohesion: 0.08
Nodes (32): assignRef(), collectDoms(), createRoot(), depsChanged(), flattenChildren(), flushEffects(), flushSync(), flushUpdates() (+24 more)

### Community 7 - "Workspace & Asset Management"
Cohesion: 0.16
Nodes (14): ALL_FONT_WEIGHTS, BUILTIN_FONTS, FONT_WEIGHT_LABELS, ALLOWED_ASSET_MIMES, SAVE_STATUS_LABELS, FontManager, isQuotaExceededError(), wsUid() (+6 more)

### Community 8 - "Tailwind CSS Offline Engine"
Cohesion: 0.36
Nodes (10): compileBaseUtility(), compilePluginDescriptor(), compileTailwindClass(), decodeArbitrary(), escapeCssSelector(), formatDecls(), initTailwindOfflineRuntime(), scanElement() (+2 more)

## Knowledge Gaps
- **3 isolated node(s):** `Geovanta — Vector Editor (Windows 64-Bit Desktop)`, `Google Fonts Stylesheet`, `Geovanta App Icon SVG`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 52 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SceneRenderer` connect `Rendering Pipeline & GPU Geometry` to `Editor Canvas & UI Components`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `Geovanta — Vector Editor (Windows 64-Bit Desktop)`, `Google Fonts Stylesheet`, `Geovanta App Icon SVG` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Editor Canvas & UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05595864320696536 - nodes in this community are weakly interconnected._
- **Why does `dist()` connect `Node Editing & Geometry Refinement` to `Affine Transforms & Snapping Solver`, `Topological Curve Simplifier`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `Rendering Pipeline & GPU Geometry` be split into smaller, more focused modules?**
  _Cohesion score 0.05174190888476603 - nodes in this community are weakly interconnected._
- **Why does `sub()` connect `Node Editing & Geometry Refinement` to `Path Math & Document I/O`, `Affine Transforms & Snapping Solver`, `Topological Curve Simplifier`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `Path Math & Document I/O` be split into smaller, more focused modules?**
  _Cohesion score 0.07073544433094994 - nodes in this community are weakly interconnected._