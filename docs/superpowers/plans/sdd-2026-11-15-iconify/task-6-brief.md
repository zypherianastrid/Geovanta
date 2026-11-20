# Task 6 Brief — Insert flow + metadata (monochrome recolor, palette preserved)

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 4, 5, 6)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = backup `.bak-iconify-t6` + report file)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-6-report.md`
**Global constraints (from plan):** no new npm dependencies; insert default 96×96 px at viewport center,
selected, one Ctrl+Z undoes one insert, multi-path icon = one group; metadata per inserted group
`icon: {name: "mdi:home", license: "Apache-2.0"}` (survives save/load); limits: reject icon SVG > 256 KB;
tests `npm test` (node --test); probes via Playwright (`/home/hatch/workspace/vector-editor/node_modules/playwright-core`,
chromium `~/.cache/ms-playwright/chromium-1255/`), serve `web/` with `python3 -m http.server <port>`
(run `npm run build:web` first if `web/` is stale).
**Prior-task inputs:** Task 1 verdict + recorded icon names (`task-1-report.md` — the multi-element icon name
and whether Fill/Stroke recolors an inserted group), Task 3 client (`loadSet`, `buildIconSvg`,
`isPaletteIcon`), Task 5 `onInsert` wiring — read all three first.

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator rulings for this task (ledger R3, R6, R7)

- R3: Do NOT modify `tests/iconify-client.test.cjs` if Task 3's `isPaletteIcon` tests already cover the
  explicit-fill fallback (plan T3 Step 1 specifies exactly that case). Verify coverage and record the check
  in your report; add the test only if the case is genuinely missing.
- R6: The stroke test: set active Stroke to red and active Fill to a DIFFERENT color (e.g. blue); assert
  the inserted `tabler:home` paths use the Stroke color, not the Fill color. (Spec §7.5: stroke-based icons
  use active Stroke color/width.)
- R7: Line numbers in the plan/spec (`VectorEditor.jsx:2344`, `importFiles ~:2960`) are indicative; verify
  the actual locations in the current file.
