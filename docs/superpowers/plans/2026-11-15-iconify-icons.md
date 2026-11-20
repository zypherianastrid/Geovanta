# Panel Ikon Iconify di Kanvas Geovanta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel "Icons" di editor Geovanta: user mencari ikon Iconify, mengklik satu ikon, ikon itu masuk kanvas sebagai objek vektor biasa.

**Architecture:** Klien hybrid tanpa-limit: data ikon dari CDN jsDelivr (`@iconify-json`, satu `icons.json` utuh per set, dimuat malas + cache), API publik Iconify hanya untuk pencarian lintas set dan daftar koleksi. Sisipan lewat `VE.parseSVG` yang sudah ada, mengikuti pola `importFiles`.

**Tech Stack:** React (panel), CanvasKit via `VE.parseSVG`, `fetch` + `AbortController`, Playwright (probe), `node --test` (unit).

**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` — the plan argues from the spec, so the spec travels with it; executors read both.

## Global Constraints

- Working copy `~/workspace/geovanta-round2/` is **not a git repo**. "Commit" in this plan = backup `.bak-<task>` before any destructive edit + write the task report to `docs/superpowers/plans/sdd-2026-11-15-iconify/task-N-report.md`. No `git` commands.
- No new npm dependencies. No icon data bundled (0 byte data ikon; target < 50 KB new code in `web/`).
- Hosts are single constants: `ICONIFY_API_BASE = "https://api.iconify.design"`, `ICONIFY_CDN_BASE = "https://cdn.jsdelivr.net/npm/@iconify-json"`. Fetch only to these two hosts.
- Search: `GET /search?query={q}&limit=48` (+ `&prefix=` for collection filter), debounce ~300 ms, stale requests cancelled via `AbortController`.
- Set data: `GET {ICONIFY_CDN_BASE}/{prefix}/icons.json` (no version pin; CDN resolves latest), lazy per set, once per set per session, browser HTTP cache + in-memory Map.
- Insert: default size 96×96 px at viewport center, selected on insert, one Ctrl+Z undoes one insert, multi-path icon = one group.
- Metadata per inserted group: `icon: {name: "mdi:home", license: "Apache-2.0"}` (same pattern as Blob/Weave `gen` metadata; survives save/load).
- Limits: reject icon SVG > 256 KB; reject `icons.json` > 10 MB; timeouts 10 s (search/insert), 30 s (`icons.json`), 3 s (`GET /version` online probe).
- Recent: max 12 icon names in prefs (names only, never SVG data).
- Tests: `npm test` (node --test); build: `npm run build:web` exit 0; probes via Playwright (`/home/hatch/workspace/vector-editor/node_modules/playwright-core`, chromium `~/.cache/ms-playwright/chromium-1255/`), serve `web/` with `python3 -m http.server <port>`.
- If any CSS AST rules are added to `src/vendor/tailwindOfflineBundle.jsx`, update the tripwire count in `tests/accent-tokens.test.cjs` (currently 844 after Round 4).

## Review Focus

- **Multi-element icon body drops elements in `parseSVG`** (circle/rect/gradient) → insert renders incomplete or empty, violating anti-goal A4. Test: T1 spike inserts a multi-element icon and asserts all its shapes appear; T6 probe repeats it end-to-end.
- **Palette flag missing from a collection** → a multi-color icon is mis-detected as monochrome and recolored at insert, destroying its colors. Test: T6 unit test asserts an icon whose body has explicit fills but whose collection has no `palette` flag keeps its original colors.
- **Set `icons.json` fails to load when the user clicks an icon** (CDN hiccup, set removed) → click must show a per-set error and create no object. Test: T7 probe with the CDN route blocked asserts toast + zero new objects.
- **Slow or huge `icons.json` on a slow network** → panel must show a loading state and time out instead of hanging. Test: T3 unit test with a mocked never-resolving fetch asserts rejection at the 30 s timeout (use fake timers, do not wait 30 s real time).
- **Offline click on an uncached "Terakhir dipakai" entry** → must show name-only, no crash, no phantom insert. Test: T7 offline probe clicks such a row and asserts no object is created and no pageerror.

---

## File Structure

- `src/renderer/iconifyClient.jsx` (new) — hybrid client: API search/collections/probe + CDN set loading + SVG builder + palette detection. No UI, no doc mutation. (Follows the `src/renderer/googleFonts.jsx` online-fetch precedent.)
- `src/components/editor/IconifyPanel.jsx` (new) — panel UI: search, collection filter, browse/search grid, recent row, license note, offline state. (Follows `RecolorSection.jsx` / `FindReplaceSection.jsx` section pattern.)
- `src/constants/editorToolsAndShapes.jsx` (modify) — new tool entry in `VE_TOOLS`.
- `src/components/editor/VectorEditor.jsx` (modify) — mount panel, insert path (reuse `importFiles` insertion, ~line 2960; proven SVG-string → `parseSVG` pattern at ~line 2344).
- `src/constants/appI18n.jsx` (modify) — panel labels ID/EN.
- `tests/iconify-client.test.cjs` (new) — unit tests, mocked `fetch`.
- `probes/probe-iconify.cjs`, `probes/probe-iconify-offline.cjs` (new) — Playwright end-to-end + offline probes.
- `docs/superpowers/plans/sdd-2026-11-15-iconify/` (new) — one report per task.

---

### Task 1: Spike 1 — CDN → parseSVG → canvas (proof, no product code)

**Files:**
- Create: `docs/superpowers/plans/sdd-2026-11-15-iconify/task-1-report.md`
- Create (throwaway only): `probes/probe-iconify-spike1.cjs`
- Modify: none in `src/`

**Interfaces:**
- Consumes: design doc §8 Spike 1; `VE.parseSVG` in `src/engine/svgDocumentParser.jsx`.
- Produces: go/no-go verdict + the exact icon names that prove or break the path, consumed by Tasks 3 and 6.

- [ ] **Step 1: Write the throwaway probe `probes/probe-iconify-spike1.cjs`**

Probe loads the app in the real browser, fetches `https://cdn.jsdelivr.net/npm/@iconify-json/mdi/icons.json` and `@iconify-json/tabler/icons.json`, builds `<svg viewBox="0 0 {width} {height}">{body}</svg>` for `mdi:home`, `tabler:home`, and one multi-element icon (a `body` containing `circle`/`rect`/`g`/`transform`, not path-only — find one in the loaded set data at runtime and record its name), runs each through `VE.parseSVG`, inserts the result, and asserts: object exists on canvas, bounding box is 96×96 px after scaling to insert size, and the multi-element icon's shape count equals the element count in its `body`.

- [ ] **Step 2: Run the probe against the real browser**

Run: serve `web/` (`python3 -m http.server <port>` from `web/`), then `node probes/probe-iconify-spike1.cjs`
Expected: PASS for `mdi:home` and `tabler:home`; multi-element icon PASS, or FAIL with the dropped element names recorded.

- [ ] **Step 3: Write the verdict in `task-1-report.md`**

GO (all three insert correctly and recolor via Fill/Stroke panel works — test recolor by setting Fill and asserting the inserted paths change color) or NO-GO with the exact gap: either a parser-extension task or a path-only filter task for Task 6. Also record whether the Fill/Stroke inspector recolors an inserted group; if not, Task 6 must split the group or set fill per sub-path before commit.

- [ ] **Step 4: Commit (backup + report)**

Backup: none needed (no `src/` change). Save the report; the throwaway probe stays for reference.

### Task 2: Spike 2 — CORS + offline behavior in the real browser

**Files:**
- Create: `docs/superpowers/plans/sdd-2026-11-15-iconify/task-2-report.md`
- Create (throwaway only): `probes/probe-iconify-spike2.cjs`
- Modify: none in `src/`

**Interfaces:**
- Consumes: design doc §8 Spike 2.
- Produces: CORS verdict for both hosts + offline failure behavior, consumed by Tasks 3 and 7.

- [ ] **Step 1: Write the throwaway probe `probes/probe-iconify-spike2.cjs`**

Probe asserts in the real browser (not curl): `GET {ICONIFY_API_BASE}/search?query=home&limit=5` succeeds via `fetch`; `GET {ICONIFY_CDN_BASE}/mdi/icons.json` succeeds via `fetch`; with both hosts blocked (route abort in Playwright), search fails with a catchable error and no object is created; with only the CDN blocked, clicking an icon fails with a catchable error and no object is created.

- [ ] **Step 2: Run the probe**

Run: `node probes/probe-iconify-spike2.cjs`
Expected: PASS on all four assertions, or FAIL with the exact host + error recorded.

- [ ] **Step 3: Write the verdict in `task-2-report.md`**

GO (both hosts CORS-clean from the browser; failures are catchable) or NO-GO with the fallback required (e.g. thumbnail via `<img>` if CDN fetch is CORS-blocked). Record the exact error strings observed for offline failures — Tasks 3 and 7 reuse them for user-facing copy.

- [ ] **Step 4: Commit (backup + report)**

Save the report; the throwaway probe stays for reference.

### Task 3: Hybrid icon client (`iconifyClient.jsx`) + unit tests

**Files:**
- Create: `src/renderer/iconifyClient.jsx`
- Create: `tests/iconify-client.test.cjs`
- Modify: none

**Interfaces:**
- Consumes: Task 1 verdict (which icon shapes the client may assume parseable), Task 2 verdict (exact failure behavior).
- Produces (used by Tasks 4, 6, 7):
  - `ICONIFY_API_BASE`, `ICONIFY_CDN_BASE` (string constants)
  - `searchIcons(query, {prefix, limit = 48, start = 0, signal}) -> Promise<{icons: [{name, prefix, palette, license}], total, limit, start, collections}>`
  - `listCollections() -> Promise<[{prefix, name, total, license, palette}]>` (fetched once per session, memoized)
  - `loadSet(prefix) -> Promise<{prefix, width, height, icons: {name: {body}}}>` (memoized Map; rejects on > 10 MB or 30 s timeout)
  - `buildIconSvg(name, setData) -> string` (returns `<svg viewBox="0 0 {width} {height}">{body}</svg>`)
  - `isPaletteIcon(icon, setData) -> boolean` (`true` when the collection `palette` flag is true, or the body contains an explicit fill other than `currentColor`)
  - `probeOnline(timeoutMs = 3000) -> Promise<boolean>` (`GET /version`, `false` on timeout or network error)

- [ ] **Step 1: Write the failing tests in `tests/iconify-client.test.cjs`**

Tests (mocked global `fetch`): `searchIcons("home")` calls `{ICONIFY_API_BASE}/search?query=home&limit=48` and returns parsed icons; `searchIcons("home", {prefix: "mdi"})` appends `&prefix=mdi`; `listCollections()` fetches `/collections` once across two calls; `loadSet("mdi")` fetches `{ICONIFY_CDN_BASE}/mdi/icons.json` once across two calls and returns `width`/`height`/`icons`; `buildIconSvg("home", setData)` returns an SVG string containing the icon body and the set viewBox; `isPaletteIcon` returns `true` for a `palette: true` collection and for a body with `fill="#ff0000"`, `false` for a `currentColor`-only body in a non-palette collection; `loadSet` rejects when the response exceeds 10 MB; `loadSet` rejects on a never-resolving fetch (fake timers, 30 s timeout); `probeOnline` returns `false` on a rejected fetch.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/iconify-client.test.cjs`
Expected: FAIL — module `src/renderer/iconifyClient.jsx` does not exist.

- [ ] **Step 3: Implement `src/renderer/iconifyClient.jsx`**

Minimal implementation of exactly the seven exports above; `fetch` with `AbortController` for timeouts; no UI code; no doc mutation; no other hosts.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/iconify-client.test.cjs`
Expected: PASS (all tests). Then run: `npm test`
Expected: full suite green (no regressions).

- [ ] **Step 5: Commit (backup + report)**

Backup: `src/renderer/iconifyClient.jsx` is new, nothing to back up. Write `docs/superpowers/plans/sdd-2026-11-15-iconify/task-3-report.md` with the test command and result.

### Task 4: Panel UI (`IconifyPanel.jsx`) + i18n

**Files:**
- Create: `src/components/editor/IconifyPanel.jsx`
- Create: `tests/iconify-panel.test.cjs` (component-level test if the codebase has a harness for it; otherwise assertions live in the Task 8 probe — see Step 1)
- Modify: `src/constants/appI18n.jsx` (panel labels ID/EN)

**Interfaces:**
- Consumes: Task 3 (`searchIcons`, `listCollections`, `loadSet`, `buildIconSvg`, `isPaletteIcon`, `probeOnline`).
- Produces: `IconifyPanel` component (props: `onInsert(icon)` callback, `onClose()`), consumed by Task 5; i18n keys consumed by Task 5.

- [ ] **Step 1: Write the failing checks**

If a component test harness exists in the repo, write `tests/iconify-panel.test.cjs`: rendering with a mocked client shows the Material Symbols browse grid on open (state awal: mode telusur koleksi default); typing a query (debounced ~300 ms) switches to search results; empty results show the explanatory empty state, not a silent empty grid. If no harness exists, record that in the task report and put these exact assertions in the Task 8 probe instead — do not invent a harness.

- [ ] **Step 2: Run the checks to verify they fail**

Run: `node --test tests/iconify-panel.test.cjs` (or note the probe deferral)
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `IconifyPanel` in `src/components/editor/IconifyPanel.jsx` + labels in `src/constants/appI18n.jsx`**

Search input (debounce ~300 ms, `AbortController` cancels stale requests); collection dropdown from `listCollections()` (default "Semua koleksi"); grid thumbnails 24–32 px rendered from loaded set data (inline SVG built by `buildIconSvg`, never `<img>` to the API); browse mode on open (Material Symbols set via `loadSet("material-symbols")`); "Terakhir dipakai" row (max 12 names from prefs, names only); license note for the visible collection; search hint "Cari dalam bahasa Inggris" (ID) / "Search in English" (EN); offline state slot (rendered by Task 7, stubbed here as a `status` prop: `"online" | "offline" | "loading"`).

- [ ] **Step 4: Run the checks to verify they pass**

Run: `node --test tests/iconify-panel.test.cjs` (or the Task 8 probe assertions)
Expected: PASS. Then run: `npm test`
Expected: full suite green.

- [ ] **Step 5: Commit (backup + report)**

Backup: `cp src/constants/appI18n.jsx src/constants/appI18n.jsx.bak-iconify-t4` before editing. Write `task-4-report.md` with the test command and result.

### Task 5: Tool wiring (floating bar → panel)

**Files:**
- Modify: `src/constants/editorToolsAndShapes.jsx` (new `VE_TOOLS` entry)
- Modify: `src/components/editor/VectorEditor.jsx` (mount `IconifyPanel`, active-tool state)
- Test: assertions in the Task 8 probe (panel opens/closes from the tool)

**Interfaces:**
- Consumes: Task 4 (`IconifyPanel`, i18n keys).
- Produces: tool opens/closes the panel; panel does not fight other open panels/popovers; consumed by Task 6 (`onInsert` wiring).

- [ ] **Step 1: Write the failing probe assertions (in `probes/probe-iconify.cjs`, stubbed)**

Add to `probes/probe-iconify.cjs`: clicking the new tool button in the floating bar opens the panel; clicking it again (or Esc / the panel close control) closes it; opening the panel while another panel is open closes the other one (follow the existing panel-conflict pattern — record which one if the codebase resolves it differently).

- [ ] **Step 2: Run the probe to verify it fails**

Run: `node probes/probe-iconify.cjs`
Expected: FAIL — tool button does not exist.

- [ ] **Step 3: Implement the tool entry + panel mount**

New `VE_TOOLS` entry reusing an existing `ICONS` glyph (no new bundled icon); `VectorEditor.jsx` mounts `IconifyPanel` and wires `onInsert` through to Task 6 (stub `onInsert` to a no-op that records the call for now — Task 6 replaces it).

- [ ] **Step 4: Run the probe to verify it passes**

Run: `node probes/probe-iconify.cjs`
Expected: PASS on the open/close assertions. Then run: `npm test`
Expected: full suite green.

- [ ] **Step 5: Commit (backup + report)**

Backups: `cp src/constants/editorToolsAndShapes.jsx ... .bak-iconify-t5`, same for `VectorEditor.jsx`. Write `task-5-report.md`.

### Task 6: Insert flow + metadata (monochrome recolor, palette preserved)

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (insert path)
- Modify: `tests/iconify-client.test.cjs` (add `isPaletteIcon` fallback test if not already covered in Task 3)
- Test: `probes/probe-iconify.cjs` (extend)

**Interfaces:**
- Consumes: Task 1 verdict (parser scope + whether Fill/Stroke recolors an inserted group), Task 3 (`loadSet`, `buildIconSvg`, `isPaletteIcon`), Task 5 (`onInsert` wiring).
- Produces: `insertIconifyIcon(name, {fill, stroke, strokeWidth})` behavior — inserted group at viewport center, 96×96 px, selected, one undo step, `icon` metadata attached; consumed by Task 8 probe.

- [ ] **Step 1: Write the failing probe assertions (extend `probes/probe-iconify.cjs`)**

Search "home" → click `mdi:home` → object exists at viewport center, selected, 96×96 px → Ctrl+Z removes it → 0 pageerror. Insert `tabler:home` with a red active Fill → stroke-based icon uses active Stroke color/width (assert from the inserted paths). Insert a palette icon (find one via `palette: true` collection at runtime, record its name) → its original colors are present in the inserted paths, not the active Fill color. Insert a multi-element icon (Task 1's recorded name) → all its shapes appear (Review Focus 1). Unit test: `isPaletteIcon` returns `true` for a body with an explicit fill when the collection has no `palette` flag (Review Focus 2).

- [ ] **Step 2: Run the probe + unit test to verify they fail**

Run: `node --test tests/iconify-client.test.cjs` and `node probes/probe-iconify.cjs`
Expected: FAIL — insert is still the Task 5 no-op stub.

- [ ] **Step 3: Implement the insert path in `VectorEditor.jsx`**

On `onInsert(icon)`: `loadSet(icon.prefix)` if not loaded → `buildIconSvg` → apply color rule (`isPaletteIcon` true → keep body as-is; false + fill-based → active Fill; false + stroke-based → active Stroke color/width) → `VE.parseSVG` → insert via the `importFiles` path (~line 2960) at viewport center, scaled to 96×96 px, selected, single history entry. Attach `icon: {name, license}` metadata to the group. Insert failure → toast, zero objects created. If Task 1 found the Fill/Stroke inspector does not recolor an inserted group, split the group or set fill per sub-path before commit (whichever Task 1's verdict prescribes — do not invent a third option).

- [ ] **Step 4: Run the probe + unit test to verify they pass**

Run: `node --test tests/iconify-client.test.cjs` and `node probes/probe-iconify.cjs`
Expected: PASS on all insert assertions. Then run: `npm test`
Expected: full suite green.

- [ ] **Step 5: Commit (backup + report)**

Backup: `cp src/components/editor/VectorEditor.jsx ... .bak-iconify-t6` before editing. Write `task-6-report.md` with the recorded palette-icon and multi-element icon names used.

### Task 7: Offline state + "Terakhir dipakai" reuse

**Files:**
- Modify: `src/components/editor/IconifyPanel.jsx` (offline state, per-set failure message, recent-row reuse)
- Modify: `src/renderer/iconifyClient.jsx` (only if the recent-reuse path needs a new export — otherwise no change)
- Test: `probes/probe-iconify-offline.cjs` (new)

**Interfaces:**
- Consumes: Task 3 (`probeOnline`, `loadSet`), Task 4 (panel + `status` prop).
- Produces: offline panel behavior + recent reuse; consumed by Task 8 probe.

- [ ] **Step 1: Write the failing offline probe `probes/probe-iconify-offline.cjs`**

Assertions: with both hosts blocked, opening the panel shows "Perlu internet untuk mencari ikon" and the app otherwise works (canvas still editable, 0 pageerror); with only the CDN blocked, clicking an icon shows a per-set error and creates zero objects (Review Focus 3); offline, clicking a "Terakhir dipakai" row whose set is cached re-inserts the icon; offline, clicking a row whose set is NOT cached shows name-only with no crash and creates no object (Review Focus 5). Seed the recent list via prefs before each case.

- [ ] **Step 2: Run the probe to verify it fails**

Run: `node probes/probe-iconify-offline.cjs`
Expected: FAIL — offline state not implemented.

- [ ] **Step 3: Implement offline handling in `IconifyPanel.jsx`**

On panel open: `probeOnline()` (3 s) + `online`/`offline` event listeners drive the `status` prop; offline state copy per Task 2's recorded error strings; recent rows reuse the in-memory set cache when present and render name-only otherwise; per-set `loadSet` failure shows a per-set message without killing the panel.

- [ ] **Step 4: Run the probe to verify it passes**

Run: `node probes/probe-iconify-offline.cjs`
Expected: PASS on all assertions. Then run: `npm test`
Expected: full suite green.

- [ ] **Step 5: Commit (backup + report)**

Backup: `cp src/components/editor/IconifyPanel.jsx ... .bak-iconify-t7` before editing. Write `task-7-report.md`.

### Task 8: End-to-end probes + regression sweep

**Files:**
- Modify: `probes/probe-iconify.cjs`, `probes/probe-iconify-offline.cjs` (finalize assertions from Tasks 4–7)
- Modify: none in `src/` unless a probe exposes a defect (then fix in place with a `.bak` + a note in the report)
- Test: full probe run + full suite

**Interfaces:**
- Consumes: Tasks 3–7 (everything user-facing).
- Produces: green probe evidence for the final verification task.

- [ ] **Step 1: Run the full probe set + full suite**

Run: `npm test`; `npm run build:web`; `node probes/probe-iconify.cjs`; `node probes/probe-iconify-offline.cjs`
Expected: all green, 0 pageerror in both probes.

- [ ] **Step 2: Fix any defect the sweep exposes (max 2 rounds)**

Each fix: backup `.bak-iconify-t8`, re-run the failing probe, record before/after in the report. If a defect needs a design change (not a bug), stop and report it instead of redesigning.

- [ ] **Step 3: Commit (backup + report)**

Write `task-8-report.md` with the exact counts: `npm test` x/x, probe scenarios x/x, build exit code.

### Task 9: Final verification + ZIP

**Files:**
- Create: `~/workspace/your_files/Geovanta-Iconify.zip` (final deliverable)
- Create: `docs/superpowers/plans/sdd-2026-11-15-iconify/task-9-report.md`

**Interfaces:**
- Consumes: Tasks 1–8 (all evidence).
- Produces: the delivered ZIP + its SHA256.

- [ ] **Step 1: Verify the build from a clean extraction**

Run: `npm run build:web` (exit 0, 0 warnings); measure `web/` size growth from the new code only (target < 50 KB; 0 byte icon data); extract the ZIP candidate to a temp dir and run the smoke probe (`probe-iconify.cjs` against the extracted build) — search → insert → Undo passes.

- [ ] **Step 2: Run the full gate once more**

Run: `npm test` (full suite green); `node probes/probe-iconify.cjs`; `node probes/probe-iconify-offline.cjs`
Expected: all green, 0 pageerror.

- [ ] **Step 3: Build the final ZIP and record its receipt**

Zip the working copy (same inclusion rules as the Round 3/4 ZIPs) to `~/workspace/your_files/Geovanta-Iconify.zip`; record entries count, bytes, and SHA256 in `task-9-report.md`. Hand the ZIP to the user with its exact path and the honest limits (headless Chromium only; Windows/GPU unmeasured; first set load 0.5–3 MB one-time per set).

- [ ] **Step 4: Commit (report)**

Write `task-9-report.md`. No `src/` change in this task.

---

## Self-review (run after writing the plan)

1. **Spec coverage:** G1 search+filter → T3+T4; G2 click-insert → T6; G3 normal path object → T6 (importFiles path) + T1 recolor proof; G4 offline docs → T6 (paths in model) + T7; G5 no bloat → T3 (CDN, no deps) + T9 size check; G6 honest offline → T7. C2 parser gap → T1 spike + T6 fallback. C4 no-limit → T3 hybrid + T9 size check. Multicolor decision → T6. Browse default + license attribution → T4/T6. No spec section is unowned.
2. **Step scan:** each step names one action with a checkable result; no step says "handle edge cases" without naming the case (each edge case is a named Review Focus item with an owning test).
3. **Type consistency:** `searchIcons` returns `{icons, total, limit, start, collections}` everywhere; `loadSet` returns `{prefix, width, height, icons}` everywhere; `buildIconSvg(name, setData)` and `isPaletteIcon(icon, setData)` keep the same signatures in T3, T4, T6. `icon` metadata is `{name, license}` in T6 and the spec.
4. **Review Focus:** all five items have a named test in their owning task (T1/T6, T6, T7, T3, T7).
5. **Proportion:** the plan is shorter than the spec it implements; code appears only as signatures and assertions, not bodies.
