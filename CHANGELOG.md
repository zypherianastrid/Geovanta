# Changelog

All notable changes and the complete feature set of **Geovanta Vector Editor** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — Initial Release

**Geovanta Vector Editor v1.0.0** is a 100% offline-capable, local-first precision vector design studio available as a **64-Bit Windows Desktop Application** (Rust + Tauri v2) and a **Live WebApp** ([geovanta.netlify.app](https://geovanta.netlify.app)), powered by **React 18**, **TypeScript**, **Tailwind CSS**, **Skia CanvasKit 0.40.0 (WebAssembly)**, a **Rust/WASM Geometry Bridge**, and an official **17-Tool Model Context Protocol (MCP) AI Server**.

### Added — Complete Feature Catalog

#### 1. Workspace & 100% Offline Project Management (`IndexedDB` + `.geovanta` ZIP)
- **Local-First IndexedDB Database**: Stores all projects, automatic revision snapshots, embedded fonts (`.ttf`/`.otf`), and raster image blobs locally with zero mandatory cloud account or internet dependency.
- **Project Views, Search & Sorting**: Filter by **All Projects**, **Recent**, **Favorites**, and **Trash**; instant keyword search; sort by *Last Modified*, *Date Created*, or *Name (A–Z)*.
- **New Project & Artboard Presets**: Create projects with standard presets (`800×600`, `1080×1080`, `1920×1080`, `1280×720`, etc.) or custom artboard dimensions (`32 px` up to `16,384 px`).
- **Live CanvasKit Project Thumbnails**: Automatically renders crisp project preview cards on save.
- **Crash & Revision Recovery**: Detects interrupted sessions and offers one-click revision recovery.
- **Storage Metrics & `.geovanta` Portable Backups**: Inspect live storage breakdown (projects, revisions, assets) and export/import complete **`.geovanta` ZIP backup archives** across devices.

#### 2. Complete Drawing Suite & 20 Parametric Shapes
- **Core Canvas Tools**:
  - **Select (`V`)** — Marquee, multi-select, bounding-box transform, interactive resize/rotate (`R` / `Shift+R`), and duplicate (`Ctrl+D`).
  - **Node Edit (`A` / `N` / `Enter`)** — Direct anchor point, cubic Bézier handle, and curve segment sculpting.
  - **Pen (`P`)** — Precision point-by-point polygonal and cubic Bézier path drawing with live angle/length preview.
  - **Pencil & Brush** — Freehand vector sketching and variable-width/smooth brush strokes with automatic curve fitting.
  - **Curvature Tool** — Intuitive point-on-curve spline drawing without manual handle dragging.
  - **Shape Builder** — Interactive region merging and carving across overlapping paths.
  - **Line Segment & Parametric Arc** — Crisp straight lines and live-editable circular/elliptical arcs.
  - **Text (`T`)** — On-canvas rich vector typography and text box creation.
  - **Frame (`Ctrl+Alt+G`)** — Artboard sub-frames and clip containers.
  - **Hand / Pan (`H` / `Space`)** — Smooth canvas navigation alongside wheel zoom, double-click fit, and touch pinch-zoom.
- **20 Parametric Vector Shapes**:
  - *Rectangle, Rounded Rectangle, Circle / Ellipse, Triangle, Right Triangle, Diamond, Parallelogram, Trapezoid, Pentagon, Hexagon, Octagon, 4-Point Star, 5-Point Star, 6-Point Star, Arrow, Chevron, Plus, Heart, Droplet, and Ring (Even-Odd compound path)*.

#### 3. Generative Vector Art & Live Parametric Controls
- **Parametric Blob Generator**: Real-time sliders for **Points (`3–48`)**, **Irregularity (`0–100%`)**, **Smoothness (`0–100%`)**, **Rotation (`0–360°`)**, **Spikiness (`0–100%`)**, deterministic **Seed**, and one-click **Randomize**.
- **Parametric Weave Generator**: Real-time interlaced pattern generator with **Wave Type (`Sine`, `Triangle`, `Square`)**, **Columns (`2–16`)**, **Rows (`2–16`)**, **Amplitude (`0–100%`)**, **Strip Thickness (`10–100%`)**, **Gap Size (`0–100%`)**, **Frequency (`1x–4x`)**, and **Phase Shift (`0–360°`)**.
- **Parametric Arc Controls**: Non-destructive live inspector for **Radius (`1–500`)**, **Start Angle (`0–360°`)**, and **Sweep Angle (`0–360°`)** while preserving the arc center.

#### 4. Precision Node, Cubic Bézier & Topological Curve Engineering
- **Specialized Node & Handle Sub-Tools**: *Edit Node (`A`/`N`), Add Node, Add Handle, Auto Handle (`B`), Straighten & Align Nodes, and Topological Simplify (`S`)*.
- **16 Node & Path Operations**:
  - *Delete Selected Nodes (`Del` / `Backspace`)*
  - *Convert Node Type*: **Smooth**, **Corner (Sharp)**, or **Symmetric Handles**
  - *Auto-Smooth Selected Nodes & Path*
  - *Break / Unlink Handles (Free Curve)*
  - *Join Two Selected Endpoints*
  - *Split Path at Selected Node(s)*
  - *Close Subpath / Open Subpath*
  - *Reverse Path Winding Direction*
  - *Straighten Segments & Align Node Angles*
  - *Convert Straight Segments to Cubic Bézier Curves*
  - *Outline Stroke (`Ctrl+Alt+O`)* and *Interactive Offset Path*
- **Topological Curve Simplifier & Auto-Simplify**:
  - Ramer-Douglas-Peucker (RDP) decimation + Least-Squares Cubic Bézier curve fitting with live **Retention Slider (`0–100%`)**, curve deviation analysis, redundant node pruning, and **Auto-Refine Geometry**.
  - Toggleable **Auto-Simplify** mode on the floating toolbar.
- **Customizable Node & Handle UI Size**: Scale canvas anchor points and tangent handles from **`50%` to `300%`** (with `50%`, `100%`, `150%`, `200%` quick presets).

#### 5. Corner Fillet & Individual Per-Corner Radius Engine
- **Global & Per-Vertex Corner Rounding**: Round all corners uniformly or open the **Individual Corner Radius Inspector** to target specific vertices (`#1`, `#2`, etc.) on any vector path.
- **3 Geometric Corner Modes**:
  - **Circular** — Exact circular arc fillet
  - **Squircle** — Continuous-curvature cubic Bézier blend
  - **Bevel (Chamfer)** — Straight angled corner cut
- **Smart Vertex Filters**: Select **All Corners**, **Odd Corners**, **Even Corners**, or **Sharpen (`0` Reset)** with one click.

#### 6. Boolean / Pathfinder Operations, Offset Path & Compound Paths
- **5 Greiner-Hormann Boolean Operations** (with automatic cubic Bézier curve refitting):
  - **Union (`Ctrl+Alt+U`)**
  - **Subtract (`Ctrl+Alt+S`)**
  - **Intersect (`Ctrl+Alt+I`)**
  - **Exclude (`Ctrl+Alt+X`)**
  - **Divide (`Ctrl+Alt+D`)**
- **Interactive Offset Path Strip**: Expand or contract open/closed paths dynamically with live preview.
- **Outline Stroke (`Ctrl+Alt+O`) & Flatten (`Ctrl+E`)**: Convert stroked paths into closed filled outlines or flatten complex transformations.
- **Winding / Fill Rules**: Full support for **Nonzero** and **Even-Odd** fill rules.

#### 7. Typography & Vector Text Engine
- **On-Canvas Inline Editing & Live Inspector Buffer**: Double-click or press **Edit on Canvas** for direct caret editing, or type in the inspector with live canvas preview and single-step Undo commit (`Ctrl+Enter` / blur; `Escape` to revert).
- **Offline & Embedded Font System**:
  - Bundled offline **IBM Plex Sans** family (*Regular, Italic, Bold, Bold Italic*).
  - **Google Fonts Catalog Integration**: Search, preview live font faces in the dropdown, and auto-download/embed Google Fonts directly into the project's offline asset store.
  - **Custom `.TTF` / `.OTF` Font Import**: Load local font files into any project.
  - **Missing Font Detection & Recovery**: Alerts when a document references an unbundled font and offers one-click `.TTF`/`.OTF` import or fallback to IBM Plex Sans while preserving the stored family name.
- **Complete Typography Controls**:
  - **Font Weight** (*Regular, Medium 500, SemiBold 600, Bold*) + quick **Bold (`B`)** and **Italic (`I`)** toggles
  - **Font Size** (`1–10,000 px`)
  - **3-Column Metrics**: **Line Height (`0.5–5.0`)**, **Letter Spacing (`-200` to `1,000 px`)**, and **Paragraph Spacing (`0–1,000 px`)**
  - **3 Text Box Resizing Modes**: **Auto Width (`Auto W`)**, **Auto Height (`Auto H`)**, and **Fixed Size (`Fixed`)** with explicit `W` / `H` box dimensions
  - **Horizontal Alignment**: *Align Left, Align Center, Align Right, Justify*
  - **Vertical Alignment**: *Align Top, Align Middle, Align Bottom*
  - **Text Case Transformations**: *As Typed (`—`), Uppercase (`AG`), Lowercase (`ag`), Title Case (`Ag`)*
  - **Text Decoration**: *None (`—`), Underline (`U`), Strikethrough (`S`)*
  - **Convert Text to Path (`Outline`)**: One-click conversion of live text glyphs into editable cubic Bézier vector paths via `opentype.js`.

#### 8. Fill, Stroke, Multi-Stop Gradients & Color Workflows
- **Dual Fill & Stroke Gradient Engine**:
  - Apply **Solid Color**, **Linear Gradient**, **Radial Gradient**, **Angular (Conic) Gradient**, or **None** independently to **both Fill and Stroke**.
  - **Interactive On-Canvas Gradient Gizmo**: Drag gradient endpoints, center, angle, and color stops directly on the canvas with a focus toggle between Fill and Stroke gradients.
  - **Multi-Stop Gradient Editor**: Add, delete, drag, reverse, and fine-tune color stop positions (`0–100%`) and per-stop opacity (`0–100%`).
- **Pro Stroke Styling**:
  - **Stroke Width** (`0–10,000 px` slider + numeric input) and **Scale Stroke with Object** option
  - **Stroke Alignment**: *Center*, *Inside*, and *Outside*
  - **Paint Order**: *Fill in Front (`fill stroke`)* or *Stroke in Front (`stroke fill`)*
  - **Line Cap**: *Round*, *Butt*, *Square*
  - **Line Join**: *Round*, *Miter* (with adjustable **Miter Limit `1x–100x`**), *Bevel*
  - **Dash Presets & Custom Dash Array**: *Solid*, *Dashed*, *Dotted*, *Dash-Dot*, and *Custom* dash array (`e.g. 8 4`) with **Dash Offset (`-100` to `+100 px`)**
- **Reusable Color Styles & Paint Clipboard**:
  - Create document-wide linked **Color Styles**, edit a style's hex to update all linked fills/strokes in real time, rename/unlink/delete styles, and pick from **Recent Colors**.
  - **Screen Pipette (Eyedropper)** for sampling colors anywhere on screen.
  - **Copy & Paste Paint**: One-click copy and paste of solid colors or full gradient configurations between objects and slots.
- **Selection Colors, Recolor Engine & Find / Replace Color**:
  - Inspect all colors used across the current selection with object counts and one-click sub-selection (`◎`).
  - **Select Same**: *Select Same Fill*, *Select Same Stroke*, or *Select Same Object Type*.
  - **Find & Replace Color** and **Recolor Artwork** panels with live canvas preview.

#### 9. Blend Modes & Non-Destructive Layer Effects (`fx`)
- **16 Standard Blend Modes**:
  - *Normal*
  - *Darken*: **Darken**, **Multiply**, **Color Burn**
  - *Lighten*: **Lighten**, **Screen**, **Color Dodge**
  - *Contrast*: **Overlay**, **Soft Light**, **Hard Light**
  - *Comparative*: **Difference**, **Exclusion**
  - *Component*: **Hue**, **Saturation**, **Color**, **Luminosity**
- **Stackable Live Effects (`fx`)**:
  - **Drop Shadow** — customizable `dx` (`-100..100`), `dy` (`-100..100`), `Blur` (`0..100`), `Color`, and `Opacity` (`0..100%`)
  - **Layer Blur** — adjustable Gaussian blur radius (`0..100 px`)
  - **Background Blur** — adjustable backdrop blur radius (`0..100 px`)
  - Per-effect visibility toggle and removal.

#### 10. Transform, 9-Point Pin Grid & Alignment
- **Precision Transform Inspector**: Numeric `X`, `Y`, `W`, `H` fields, **Aspect Ratio Lock**, **Rotation (`∠`)**, and **Flip Horizontal / Vertical (`Shift+H` / `Shift+V`)**.
- **9-Point Pin Grid & Pivot Selector**: Anchor numeric transforms and rotations to either the **Center** or any of the **9 bounding-box pin points**.
- **8-Way Align & Distribute**: *Align Left, Horizontal Center, Right, Top, Vertical Center, Bottom* (`Alt+W/A/S/D/H/V`), plus **Distribute Horizontal** and **Distribute Vertical** (for 3+ objects).

#### 11. Figma-Style Auto-Layout, Frames & 10-Mode Smart Snapping
- **Auto-Layout Frames (`Shift+A`)**:
  - **Flow Directions**: **Row (Horizontal)**, **Column (Vertical)**, and **Grid (Wrap)** with configurable columns per row (`1–10`).
  - **9-Point Alignment & Gap Spacing**: Precise child distribution and item gap control.
  - **Symmetric & 4-Side Independent Padding**: Switch between uniform padding (`0–120`) and individual `Top / Right / Bottom / Left` padding.
  - **Frame Styling & Clipping**: Toggle frame background, adjust frame corner radius (`0–60`), toggle **Clip Frame**, or **Fit Layout to Artboard**.
- **10-Mode Figcraft Smart Snapping Matrix**:
  - *Smart Guides (Box & Center)*, *Equal Spacing*, *Artboard Edges & Center*, *Node & Handle Points*, *Node Axis Alignment (X/Y)*, *Segment Midpoint*, *Path Contour / Edges*, *Right Angle (`90°`) & Line Extension*, *Adaptive Grid Lines*, and *Snap to Pixel (`1 px`)* — with **All**, **Minimal**, and **Default** quick presets plus live redline distance indicators.

#### 12. Virtualized Layer Tree & Color Bucket Organization
- **Virtualized Layer Hierarchy**: Smooth 60 FPS scrolling across complex documents with drag-and-drop reordering, group/frame nesting, one-click child ejection, inline renaming, visibility (`Ctrl+Shift+H`), lock (`Ctrl+Shift+L`), and node-count badges.
- **Group by Same Color Mode**: Toggle automatic color bucketing in the layer sidebar to group and select objects by shared fill color, raster image, or no-fill state.

#### 13. Multi-Format Export, Multi-Format Import & Live SVG Code Inspector
- **6 Export Formats**:
  - **`.SVG`** — Clean, standards-compliant vector SVG XML
  - **`.PNG`**, **`.JPG`**, **`.WEBP`** — High-precision Skia CanvasKit CPU rasterization with selectable **`1x`**, **`2x (HD)`**, and **`4x (Ultra)`** resolution scaling
  - **`.AI` (Adobe Illustrator)** and **`.EPS` (Encapsulated PostScript)** — Production vector print/exchange output with automatic text-to-path outlining and round-trip metadata
- **3 Export Area Scopes**:
  - **Artboard** (`board`)
  - **All Objects / Content** (`content`)
  - **Selection Only** (`sel`)
- **Copy to Clipboard & File Download**: Copy exported SVG/AI/EPS markup or high-DPI PNG directly to the system clipboard, or download as a file.
- **Canvas Background & Edge Smoothing**:
  - Switch between **Transparent** and **Solid Color** canvas background.
  - Toggle **Edge Smoothing (Antialiasing / Reduce Seams)** vs. crisp **1×1 Pixel Preview**.
- **Universal File & Clipboard Import**:
  - Import **`.SVG`, `.AI`, `.EPS`, `.PS`, `.PDF`, `.PNG`, `.JPG`, `.JPEG`, `.WEBP`, `.GIF`, `.TTF`, `.OTF`**, or paste vector objects and raster images directly from the clipboard (`Ctrl+V`).
- **Two-Way Live SVG Code Inspector (`Ctrl+Alt+C`)**:
  - Real-time bidirectional synchronization between canvas geometry and code.
  - One-click **Prettify**, **Minify**, **Copy**, and **Download**.
  - **5 Instant Output Tabs**: **SVG XML (Live)**, **Web Minified**, **React JSX**, **Vue SFC**, and **CSS Data URI**.

#### 14. Skia CanvasKit Engine, Rust/WASM Bridge, Themes & Bilingual UI
- **Skia CanvasKit 0.40.0 + Rust/WASM Acceleration**: Spatial indexing (R-tree / grid culling), adaptive cubic flattening, ear-clip triangulation, geometry caching, and Dynamic Interactive LOD for 60+ FPS zooming and panning.
- **Performance Telemetry & Debug Mode**: Built-in **Benchmark Suite**, Geometry Cache inspector, Device Profile tuning, and interactive **Debug Console (`Ctrl+Shift+D`)**.
- **Full Bilingual Localization & 20+ Accent Palettes**:
  - Complete **English** and **Bahasa Indonesia** UI & tooltips.
  - **Light**, **Dark**, and **System** themes, reduced-motion toggle, Windows system accent auto-detection, custom hex/pipette accent color, and 20+ curated accent palettes.

#### 15. Hybrid AI & Model Context Protocol (MCP) Server (17 Official Tools)
- **Live WebSocket Mode & Headless CLI Mode**: Connect **Antigravity (AGY)** or **Google Gemini** (via local WebSocket port `38291` or Cloudflare Tunnel + OAuth 2.1) to mutate the live canvas with full `Ctrl+Z` Undo/Redo support, or run headless vector automation via `scripts/mcp-server/engineAdapter.js`.
- **17 Official MCP Tools**:
  - *Workspace & View*: `geovanta_status`, `geovanta_workspace_manage`, `geovanta_artboard_and_view`, `geovanta_layer_manage`
  - *Creation & Typography*: `geovanta_shape_create`, `geovanta_text_create`, `geovanta_iconify_insert`
  - *Geometry & Color*: `geovanta_curve_simplify`, `geovanta_boolean_operation`, `geovanta_corner_fillet`, `geovanta_recolor`
  - *SVG & Live Canvas*: `geovanta_svg_parse`, `geovanta_svg_serialize`, `geovanta_live_get_canvas`, `geovanta_live_mutate_canvas`, `geovanta_live_select_objects`, `geovanta_live_export`
