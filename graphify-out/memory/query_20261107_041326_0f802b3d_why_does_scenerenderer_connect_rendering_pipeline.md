---
type: "query"
date: "2026-11-07T04:13:26.597983+00:00"
question: "Why does SceneRenderer connect Rendering Pipeline & GPU Geometry to Editor Canvas & UI Components?"
contributor: "graphify"
source_nodes: ["SceneRenderer", "VectorEditor", "VectorEditor.jsx", "sceneRenderer.jsx"]
---

# Q: Why does SceneRenderer connect Rendering Pipeline & GPU Geometry to Editor Canvas & UI Components?

## Answer

Expanded from original query via vocab: ['scene', 'renderer', 'render', 'pipeline', 'gpu', 'geometry', 'editor', 'canvas', 'component'].
Then traversed SceneRenderer (src/renderer/sceneRenderer.jsx:L26) and VectorEditor (src/components/editor/VectorEditor.jsx).
SceneRenderer serves as the single bridge between the React editor UI and the low-level graphics engine:
1. It encapsulates GPU pipeline management (WebGL2 primary + Canvas 2D fallback, VBO mesh tessellation via buildObjectGpuBuffers, and texture management).
2. It exposes the imperative lifecycle methods (setScene, setCamera, setSelectionOverlay, setSnapOverlay, queryHit, queryMarquee, requestRender) consumed directly by VectorEditor in the React UI tree.

## Source Nodes

- SceneRenderer
- VectorEditor
- VectorEditor.jsx
- sceneRenderer.jsx