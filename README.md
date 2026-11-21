<div align="center">

<img src="docs/assets/geovanta-logo.svg" alt="Geovanta Vector Editor Logo" width="96" height="96" />

# Geovanta Vector Editor

**Precision vector design without boundaries — 100% offline, desktop-grade speed, and natively AI-ready.**

<p>
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-0ea5e9?style=for-the-badge" alt="English" /></a>
  <a href="README.id.md"><img src="https://img.shields.io/badge/Bahasa-Indonesia-13b152?style=for-the-badge" alt="Bahasa Indonesia" /></a>
  <a href="https://geovanta.netlify.app" target="_blank"><img src="https://img.shields.io/badge/WebApp-Live_on_Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" alt="WebApp Live on Netlify" /></a>
  <a href="https://github.com/zypherianastrid/Geovanta/releases/tag/v1.0.0" target="_blank"><img src="https://img.shields.io/badge/Release-v1.0.0-2563eb?style=for-the-badge&logo=github&logoColor=white" alt="Release v1.0.0" /></a>
</p>

<p>
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/Tauri_v2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Skia_CanvasKit-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Skia CanvasKit" />
  <img src="https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" alt="WebAssembly" />
  <img src="https://img.shields.io/badge/MCP_AI_Ready-13b152?style=for-the-badge&logo=googlegemini&logoColor=white" alt="MCP AI Ready" />
  <img src="https://img.shields.io/badge/Windows_64--Bit-0078D6?style=for-the-badge&logo=windows11&logoColor=white" alt="Windows 64-Bit" />
  <a href="https://geovanta.netlify.app" target="_blank"><img src="https://img.shields.io/badge/WebApp-geovanta.netlify.app-00C7B7?style=for-the-badge&logo=googlechrome&logoColor=white" alt="WebApp" /></a>
</p>

<p>
  <a href="https://geovanta.netlify.app" target="_blank">🌐 WebApp</a> •
  <a href="#-why-geovanta">Why Geovanta</a> •
  <a href="#-visual-feature-tour">Visual Feature Tour</a> •
  <a href="#-ai--model-context-protocol-mcp">AI & MCP</a> •
  <a href="#%EF%B8%8F-keyboard-shortcuts">Shortcuts</a> •
  <a href="#%EF%B8%8F-architecture">Architecture</a> •
  <a href="#-installation--quick-start">Installation</a>
</p>

<br />

<img src="docs/screenshots/01-hero-editor-light.png" alt="Geovanta Vector Editor — Light Mode Workspace" width="100%" />

*Geovanta Vector Editor — Light Theme with live Gradient Canvas Gizmo, Layer Tree, and Precision Inspector*

<br />

<img src="docs/screenshots/02-hero-editor-dark.png" alt="Geovanta Vector Editor — Dark Mode Workspace" width="100%" />

*Geovanta Vector Editor — Dark Theme with full English localization*

</div>

---

## 🌟 Why Geovanta?

Most modern vector editors force a painful trade-off: cloud-only tools lock your files behind subscriptions and internet connections, while legacy desktop apps feel heavy, dated, and disconnected from modern frontend and AI workflows.

**Geovanta Vector Editor** bridges that gap:

| Pillar | What You Get |
| :--- | :--- |
| 🔒 **100% Offline & Local-First** | Zero external CDNs, zero mandatory cloud accounts. Every project, Bézier path, and image blob lives locally in IndexedDB with portable `.geovanta` ZIP backups. |
| ⚡ **Native Desktop Speed** | Powered by a Skia CanvasKit WebAssembly canvas (WebGL GPU + CPU fallback), Dynamic Interactive LOD, spatial indexing, and Rust/WASM geometry acceleration for silky **60+ FPS** panning and zooming. |
| 🎨 **Pro Vector & UI Toolkit** | From cubic Bézier node editing, Greiner-Hormann Booleans, and multi-stop gradients to Figma-style Auto-Layout, generative Blob/Weave patterns, and a two-way live SVG/JSX/Vue code editor. |
| 🤖 **Hybrid AI via MCP** | Ships with **17 official Model Context Protocol (MCP) tools** for Antigravity (AGY) and Google Gemini — work live on the canvas with full transactional `Ctrl+Z` Undo/Redo or run headless in CLI pipelines. |
| 🌍 **Full Bilingual Experience** | Switch effortlessly between **English** and **Bahasa Indonesia**, with Light/Dark/System themes and 20+ customizable accent palettes. |

---

## 🎯 Visual Feature Tour

### 1. 100% Offline Workspace & Project Gallery
Organize all your vector artwork locally with zero server dependency. Filter by **Recent**, **All Projects**, **Favorites**, and **Trash**, search and sort instantly, view live IndexedDB storage metrics, and move projects between devices with `.geovanta` backup archives.

<img src="docs/screenshots/13-workspace-home-populated.png" alt="Offline Workspace Home with Project Thumbnails" width="100%" />

---

### 2. Complete Drawing Suite & 20+ Parametric Shapes
Sketch freely or build geometric precision with **Select (`V`)**, **Pen (`P`)**, **Pencil**, **Brush**, **Curvature**, **Shape Builder**, **Line Segment**, and **Arc** tools — paired with a quick-access library of **20 parametric shapes** (*Rectangle, Rounded Rectangle, Circle/Ellipse, Triangle, Right Triangle, Diamond, Parallelogram, Trapezoid, Pentagon, Hexagon, Octagon, 4/5/6-Point Stars, Arrow, Chevron, Plus, Heart, Droplet, and Ring*).

<img src="docs/screenshots/03-shapes-library.png" alt="20+ Parametric Shapes Library Popover" width="100%" />

---

### 3. Precision Node, Handle & Cubic Bézier Editing
Switch into **Node Edit mode (`A` / `N` / `Enter`)** to sculpt every anchor point and tangent handle directly on the canvas. Built-in geometry tools include **Add Node**, **Add Handle**, **Auto Handle (`B`)**, **Straighten & Align Nodes**, **Topological Curve Simplifier (RDP / Least-Squares Cubic Bézier Fitting)**, **Corner Fillet**, **Compound Paths**, and **Auto-Refine Geometry**.

<img src="docs/screenshots/04-node-editing-bezier.png" alt="Node and Cubic Bezier Handle Editing" width="100%" />

---

### 4. Boolean / Pathfinder Operations & Offset Path
Combine and carve complex shapes cleanly using **Union**, **Subtract**, **Intersect**, **Exclude**, and **Divide** (powered by *Greiner-Hormann polygon clipping* with automatic Bézier refitting), plus **Outline Stroke** and **Offset Path** — accessible from the floating toolbar, context menu, and dedicated shortcuts (`Ctrl+Alt+U / S / I / X / D / O`).

<img src="docs/screenshots/05-boolean-pathfinder.png" alt="Boolean and Pathfinder Operations Menu" width="100%" />

---

### 5. Generative Vector Art — Blob & Weave Generators
Create organic shapes and intricate woven patterns parametrically in seconds. Fine-tune **Blob** points & irregularity or adjust **Weave** wave shapes (*Sine / Triangle / Square*), columns, rows, amplitude, strip thickness, gap spacing, frequency, and phase shift in real time.

<img src="docs/screenshots/06-blob-and-weave-generators.png" alt="Blob and Weave Generative Vector Art Tools" width="100%" />

---

### 6. Figma-Style Auto-Layout, Frames & Figcraft Smart Snapping
Select any group of elements and press **`Shift + A`** to wrap them into a responsive **Auto-Layout Frame** with **Row**, **Column**, and **Grid** flows, 9-point alignment, gap spacing, symmetric/custom padding, and **Clip Frame**. Align elements effortlessly with **Figcraft-style smart snapping** (alignment guides, equal-spacing detection, 5 px threshold, and redlines).

<img src="docs/screenshots/07-auto-layout-frames.png" alt="Auto-Layout Frames and Smart Alignment" width="100%" />

---

### 7. Multi-Stop Gradients, Color Styles, Recolor & Blend Modes
Style paths with **Solid**, **Linear**, **Radial**, and **Angular** fills — complete with an interactive **Gradient Canvas Gizmo**, multi-stop position & opacity sliders, reusable **Color Styles**, **Recolor Engine**, **Find & Replace Color**, **Screen Pipette**, fill rules (*Nonzero / Even-odd*), and per-object **Blend Modes & Effects**.

<img src="docs/screenshots/08-gradient-fill-editor.png" alt="Multi-Stop Gradient and Fill Inspector" width="100%" />

---

### 8. Built-In Iconify Vector Icon Browser (16,520+ Icons)
Search across categories and open-source icon collections (including Material Symbols and more) directly inside Geovanta and drop crisp, editable vector paths straight onto your artboard.

<img src="docs/screenshots/10-iconify-browser.png" alt="Built-In Iconify Vector Icon Browser" width="100%" />

---

### 9. Two-Way Live SVG Code Inspector & Multi-Framework Exporter
Built for designers *and* developers. Press **`Ctrl + Alt + C`** to open the **SVG Code Inspector & Live Editor** with real-time two-way synchronization, one-click **Prettify / Minify / Copy / Download**, and instant output tabs for:
- **SVG XML (Live)**
- **Web Minified**
- **React JSX**
- **Vue SFC**
- **CSS Data URI**

<img src="docs/screenshots/11-svg-code-inspector.png" alt="Two-Way Live SVG Code Inspector and Multi-Framework Exporter" width="100%" />

---

### 10. Multi-Format Export, Edge Smoothing & Portable Backups
Export your **Artboard**, **All Objects**, or **Current Selection** to **SVG**, **PNG**, **JPG**, **WebP** (CPU CanvasKit rasterization with antialiasing), **AI**, and **EPS (PostScript)**. Toggle **Transparent / Solid** canvas backgrounds, choose **Reduce Seams / Standard** edge smoothing, or export a full **`.geovanta` Project Backup**. Legacy project text is safely preserved in read-only mode and included in SVG/PNG/JPG/WebP exports.

<img src="docs/screenshots/12-export-panel.png" alt="Multi-Format Export and Canvas Settings Panel" width="100%" />

---

### 11. Personalization, Themes & Full Bilingual UI
Tailor the studio to match your workspace: switch seamlessly between **Light**, **Dark**, and **System** themes, toggle between **English** and **Bahasa Indonesia**, and pick from **20+ accent palettes** (*Geovanta Green, Windows System, Figma Blue, Indigo, Violet, Emerald, Amber, Rose, Slate*, and custom hex/pipette).

<img src="docs/screenshots/14-settings-appearance-id.png" alt="Settings Modal — Themes, Bilingual UI, and Accent Palettes" width="100%" />

---

## 🤖 AI & Model Context Protocol (MCP)

Geovanta ships with an official **Model Context Protocol (MCP)** server (`scripts/mcp-server/`) designed for **Antigravity (AGY)** and **Google Gemini** (including Streamable HTTP + OAuth 2.1 connectors for Gemini Web).

<img src="docs/screenshots/15-settings-ai-mcp.png" alt="Settings — Live AI and Model Context Protocol (MCP) Bridge" width="100%" />

### Hybrid Architecture: Live vs. Headless Mode
1. **Live Mode (Real-Time Canvas Sync)**: Connects the running Geovanta GUI to the local MCP server via WebSocket (default port `38291` / custom tunnel URL). Every AI-generated shape, edit, or recolor enters Geovanta's transactional history — undo any AI action instantly with `Ctrl + Z`.
2. **Headless Mode (Standalone CLI Engine)**: Even when the GUI is closed, AI agents can parse SVG, create parametric geometry, simplify curves, run Booleans, fillet corners, recolor palettes, and serialize clean SVG autonomously via `scripts/mcp-server/engineAdapter.js`.

### 17 Official MCP Tools

| Category | Tools |
| :--- | :--- |
| **Workspace & Status** | `geovanta_status`, `geovanta_workspace_manage`, `geovanta_artboard_and_view`, `geovanta_layer_manage` |
| **Vector Creation** | `geovanta_shape_create` *(rect, circle, star, polygon, spiral, blob, weave)*, `geovanta_text_create`, `geovanta_iconify_insert` |
| **Geometry & Color** | `geovanta_curve_simplify`, `geovanta_boolean_operation`, `geovanta_corner_fillet`, `geovanta_recolor` |
| **SVG & Live Canvas** | `geovanta_svg_parse`, `geovanta_svg_serialize`, `geovanta_live_get_canvas`, `geovanta_live_mutate_canvas`, `geovanta_live_select_objects`, `geovanta_live_export` |

---

## ⌨️ Keyboard Shortcuts

Press **`?`** anytime on the canvas or open **Settings → Shortcuts** to view the built-in cheatsheet:

<img src="docs/screenshots/16-settings-shortcuts.png" alt="Keyboard Shortcuts Reference Modal" width="100%" />

| Category | Shortcut | Action |
| :--- | :--- | :--- |
| **Tools** | `V` / `A` or `N` / `P` / `S` / `B` / `H` or `Space` | Select / Node Edit / Pen / Simplify / Auto Handle / Hand (Pan) |
| **Objects** | `Ctrl+Z` / `Ctrl+Y` / `Ctrl+D` / `Ctrl+G` / `Ctrl+Shift+G` | Undo / Redo / Duplicate / Group / Ungroup |
| **Booleans** | `Ctrl+Alt+U` / `S` / `I` / `X` / `O` | Union / Subtract / Intersect / Exclude / Outline Stroke |
| **Frames** | `Ctrl+Alt+G` / `Shift+A` | Create Frame / Convert to Auto-Layout Frame |
| **Layers** | `]` / `[` / `Ctrl+]` / `Ctrl+[` / `Ctrl+Shift+H` / `Ctrl+Shift+L` | Move Up/Down / Front/Back / Hide / Lock |
| **View & Code** | `0` / `2` / `+` `-` / `Ctrl+Alt+C` / `,` / `?` | Fit Canvas / Zoom Selection / Zoom / SVG Code Inspector / Settings / Shortcuts |

---

## 🏗️ Architecture

```mermaid
flowchart LR
  UI["React 18 + Tailwind CSS 3 UI\n(100% Offline Bundle)"] --> Engine["Vector Engine\n(Bezier, Boolean, Auto-Layout, Snapping)"]
  Engine --> WASM["Rust / WASM Geometry Bridge\n(Flattening, Ear-Clip, RDP)"]
  Engine --> Skia["Skia CanvasKit 0.40.0\n(WebGL GPU + CPU Fallback & Export)"]
  UI <--> Tauri["Rust + Tauri v2 Desktop Shell\n(Native File I/O & Windows x64 Installers)"]
  UI <--> MCP["MCP Server (17 Tools)\nLive WebSocket & Headless CLI"]
```

### Repository Layout
- `src/` — Core React 18 + TypeScript/TSX application (`engine/`, `renderer/`, `components/`, `workspace/`, `constants/`, `utils/`, `bridge/`, `vendor/`)
- `src-tauri/` — Rust backend & Tauri v2 configuration for 64-bit Windows installers (**NSIS `.exe`** & **WiX `.msi`**)
- `rust/` — Rust WebAssembly acceleration modules
- `scripts/mcp-server/` — Official Model Context Protocol server (`index.js`, `tools.js`, `engineAdapter.js`)
- `web/` — Ready-to-run 100% offline web bundle (`web/index.html` + local CanvasKit WASM assets)
- `tests/` — Node unit tests & Playwright E2E / performance test suite

---

## 🚀 Installation & Quick Start

### Option 1: 🌐 Use the WebApp (Zero Install)
Launch Geovanta directly in any modern browser (Chrome, Edge, Firefox) with no installation required:
- **Live WebApp**: **[https://geovanta.netlify.app](https://geovanta.netlify.app)**

### Option 2: 🪟 Install Desktop App — Windows 64-Bit (`v1.0.0` Release)
Download the official pre-built Windows 64-bit installer from **[GitHub Releases (v1.0.0)](https://github.com/zypherianastrid/Geovanta/releases/tag/v1.0.0)**:
1. Download [`Geovanta-Vector-Editor_1.0.0_x64-setup.exe`](https://github.com/zypherianastrid/Geovanta/releases/download/v1.0.0/Geovanta-Vector-Editor_1.0.0_x64-setup.exe).
2. Run the `.exe` installer and follow the setup wizard.
3. Launch **Geovanta Vector Editor** from your Start Menu or Desktop shortcut.

### Option 3: 📦 Run Offline Bundle Locally (No Build Required)
Serve or open `web/index.html` in Chrome, Edge, or any modern Chromium browser. All JavaScript bundles and Skia CanvasKit WebAssembly runtimes are bundled locally — no internet connection required.

### Option 4: 🛠️ Develop & Build from Source
```sh
# 1. Install dependencies
npm ci

# 2. Run unit tests & TypeScript syntax check
npm test
npm run typecheck

# 3. Rebuild the 100% offline web bundle (updates dist/ and web/)
npm run build:web
```

#### Build Windows 64-Bit Desktop Installers (`.exe` & `.msi`)
Requires **Node.js 20+**, **Rust MSVC** (`x86_64-pc-windows-msvc`), **Visual Studio Build Tools (C++)**, and **Tauri CLI v2**:
```bat
build-windows-64bit.bat
```
Generated 64-bit installers are placed in:
- **NSIS Setup (`.exe`)**: `src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\Geovanta Vector Editor_1.1.0_x64-setup.exe`
- **WiX Installer (`.msi`)**: `src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\Geovanta Vector Editor_1.1.0_x64_en-US.msi`

*(Automated CI builds are also preconfigured via `.github/workflows/build-windows-x64.yml`.)*

---

<div align="center">
  <sub>Built with precision by <strong>Geovanta</strong> • Read in <a href="README.id.md">Bahasa Indonesia 🇮🇩</a></sub>
</div>
