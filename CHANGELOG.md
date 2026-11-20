# Changelog

All notable changes to Geovanta Vector Studio are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Reliability, rendering, and legacy text recovery

- Keep migrated image assets available across failed save attempts.
- Align backup ZIP creation with import size limits and guard thumbnail writes by project revision.
- Use spatial indexing to skip distant objects during rendering and count assets without loading image blobs.
- Fail source builds when dependencies are missing; retain explicit prebuilt staging.
- Display legacy project text read-only and include it in SVG and raster exports.

## CanvasKit CPU — Workspace framing

- Frame visible objects when opening a project and using Fit. Use the artboard for empty documents.
- Remove document text rendering, typography tools, and external font loading. Preserve legacy text in project storage and backups.

## CanvasKit CPU — High-zoom text pan and selection

- Reuse device-resolution scene layers and glyph masks during high-zoom panning and text dragging.
- Fit text object bounds to glyph ink and decorations while retaining the line box for inline editing.

## CanvasKit CPU — Device-resolution text

- Rasterize text using the exact screen transform and composite glyph coverage at 1:1.
- Remove the Hard Pixel renderer, pixel zoom control, and pixel inspection overlay.

## CanvasKit CPU — Vector text and edges

- Rasterize only the visible portion of long text. Cache glyph coverage and keep browser font measurement in sync with the editor.
- Smooth the onscreen edges of text and paths in Vector mode. Hard Pixel and raster exports keep hard edges.
- Limit preview resolution while zooming with visible text, then redraw at full resolution when the gesture stops.

## CanvasKit CPU — Pixel preview performance

- Cache the visible 1×1 document raster and reuse it across pan and zoom. Use nearest-neighbor presentation to keep document pixels sharp.
- Refresh the cache when scene content or assets change. Keep non-scaling strokes accurate at their current zoom.
- Avoid redundant camera renders and temporary opacity layers for single-paint objects.

## CanvasKit CPU — 2026-11-11

- Render the editor, project thumbnails, and raster exports with CanvasKit on the CPU.
- Remove the GPU renderer and antialiasing settings. Keep the 1×1 pixel preview.
- Include the offline CanvasKit runtime and license in the browser and Tauri bundles.

## [1.1.0] — 2026-11-08

### Added
- Complete English translation of the whole application: every user-visible
  Indonesian string now has an English counterpart (157 new i18n keys,
  44 new toast entries, 77 new toast patterns). With language set to English
  the UI shows zero Indonesian strings; Indonesian mode is unchanged.
- Layer object names (`Persegi-N`, `path-26`, `Text-N`, `Frame-N`,
  `Boolean-N`) intentionally stay Indonesian — they are user-created names,
  not UI text.

### Fixed
- Layer tab empty space (desktop Windows): layer row names used to stretch
  across the full panel width (`flex-1`), so on a wide desktop panel the gap
  between the name and the node-count badge was far wider than on the web.
  Row names are now content-width (max 150 px) and the badge follows the
  name, so the gap is identical on desktop (320 px panel) and web
  (250 px panel).
- Save indicator jumping position: the header row wrapped (`flex-wrap`),
  so when the status label grew from "Tersimpan" to "Menyimpan..." the pill
  dropped to a second line and back. The row no longer wraps and the pill
  has a fixed width covering the whole autosave cycle, so its position never
  moves while saving.

## [1.0.0] — 2026-11-08

### Added
- Boolean / Pathfinder operations: Union, Subtract, Intersect, Exclude
  (Greiner-Hormann clipping, refit to Bézier), plus Outline Stroke and
  Offset Path, with context menu, floating-bar dropdown and shortcuts
  (Ctrl+Alt+U/S/I/X/O).
- Figcraft-style snapping: guide lines, equal spacing, threshold 5 px.
- Full English UI: Settings tab, tooltips and all app strings in English
  and Indonesian.
- Auto Layout (Flow/Row/Column/Grid), gradients, Bézier node editing,
  SVG/PNG/AI/EPS export, 100% offline (IndexedDB).
- MIT license.

### Fixed
- Performance: layer list virtualization, memoized rows, GPU overlay memo,
  tooltip delay after scroll, smooth-scroll lag removed.
- Layer scroll skeletons during fast scroll; previews return after scrolling
  stops.
