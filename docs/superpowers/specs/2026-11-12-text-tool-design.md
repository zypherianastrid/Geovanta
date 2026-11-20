# Text Tool Design

## Intent

Add an editable text tool to Geovanta. New text and text preserved from older projects must be selectable, editable, saved, and exported in the same ordered document as vector shapes. The text tool offers basic typography controls and an explicit **Convert to Path** action that produces ordinary node-editable vector geometry.

## Scope and user flow

- Add a Text tool to the floating toolbar. Click the canvas to place a text object. Type in an editor overlay; Enter inserts a line, clicking outside commits, and Escape cancels the current edit. Double-clicking an existing text object reopens its content editor.
- Selecting text shows controls for content, font family, font size, regular/bold, upright/italic, fill color, opacity, left/center/right alignment, line height, letter spacing, and text box width. Changes participate in undo/redo and autosave.
- Text remains live text until the user chooses **Convert to Path**. The result is a vector object made of subpaths, editable with the existing node tool. Undo restores the text object.
- Existing text records are migrated into the editable document in their original layer order. Old `x`/`y` remain the baseline origin, and `textAnchor` remains the alignment anchor. Old text has intrinsic width and does not wrap until a width is set. Unsupported or unavailable fonts are shown with an explicit fallback indication; the stored family name is preserved until the user selects another font.
- The application remains usable offline through `file://` and Tauri. Bundle at least one open-license Latin font family with regular, bold, italic, and bold-italic faces. Allow importing TTF/OTF fonts into a project; reject unsupported or invalid font data clearly. Font bytes are stored with the project and used by both rendering and path conversion.
- SVG export writes `<text>` with the chosen style. It may embed the bundled OFL font; an imported font remains a family reference unless the user explicitly allows embedding when importing it. When an old project's font is missing, SVG preserves its family declaration; raster and outline export stop with a missing-font error until the user attaches that font or explicitly picks a replacement. PNG/JPG/WebP export uses the same CanvasKit scene as the editor. For formats that cannot carry live text, convert to paths with the available font or report a clear error rather than silently dropping text.

## Architecture

- Keep one canonical `type: 'text'` object in `doc.objects`; retire the legacy side channel and whole-scene SVG overlay. A normalization function maps old text record variants to the new schema without changing their order or content.
- `CanvasKitScene` creates cached SkParagraph layouts from text content, style, width, and font bytes, draws paragraphs in object order, and exposes measured bounds for selection and hit testing. Font assets are registered with `TypefaceFontProvider`. Cache entries are disposed when styles or fonts change.
- Extend project asset storage beyond images: font references must survive save and hydration, duplication, backup/restore, and asset garbage collection. Text objects store a stable font asset ID in addition to a display family name.
- A focused text editor component uses a DOM input overlay for caret, selection, IME composition, and accessibility. CanvasKit SkParagraph remains the main renderer outside active typing. The overlay coordinates follow pan and zoom.
- opentype.js reads the same font bytes and creates editable glyph outlines. Conversion uses SkParagraph's shaped glyph IDs and positions where available, then maps those glyphs to opentype.js outlines so line breaks and shaping match the displayed paragraph. Each text object uses a known face; regular/bold/italic resolve to actual face bytes. CanvasKit 0.40 does not reliably identify the face for fallback glyph runs, so conversion checks `unresolvedCodepoints()` and glyph coverage, and stops when fallback, synthetic styling, or glyph mapping cannot be matched. Verify Latin, Indonesian diacritics, ligatures, and multiline text rather than producing incorrect outlines.
- Do not add HarfBuzz.js initially. CanvasKit already shapes the primary text; add HarfBuzz.js only if real text-to-path cases require shaping control beyond CanvasKit's glyph runs.
- Existing AI/EPS exports are synchronous and reject text. Their export APIs and editor call sites must become asynchronous where outline conversion needs font loading; failures must surface to the user.

## Approaches considered

1. **First-class CanvasKit text objects (selected).** Meets the requested SkParagraph renderer, keeps layer order, and lets raster export share the editor's scene. Requires replacing the existing read-only legacy text path and adding font asset management.
2. **Keep the SVG text overlay and add editing there.** Smaller initial change, but conflicts with SkParagraph as the primary renderer and preserves the current two-scene behavior. Rejected.

The selected customization scope is basic typography. Mixed styles within one text box and advanced paragraph controls are deferred.

## Constraints and acceptance

- Preserve old project text content and layer position. Do not silently remove or flatten it.
- Do not silently substitute fonts during vector conversion or export.
- No network fetch at runtime; bundled and project fonts must load offline.
- Tests cover migration, paragraph layout and disposal, editing and undo, font persistence, path conversion, hit testing, and SVG/raster export. Browser verification covers creating text, editing old text, switching styles, and converting a word to node-editable paths.
- Performance remains interactive with many text objects through layout and font caches; live typing avoids rebuilding unrelated vector geometry.

## Remaining builder decisions

- Choose the exact bundled OFL font family and preserve its license in the package.
- Use existing project asset storage for imported font bytes, with a stable font ID in text objects.
- Match the existing Indonesian/English localization pattern for tooltips and inspector labels.
