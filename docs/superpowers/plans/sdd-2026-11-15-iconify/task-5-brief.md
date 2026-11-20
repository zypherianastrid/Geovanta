# Task 5 Brief — Tool wiring (floating bar → panel)

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 1)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = backups `.bak-iconify-t5` + report file)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-5-report.md`
**Global constraints (from plan):** no new npm dependencies; tests `npm test` (node --test); probes via Playwright
(`/home/hatch/workspace/vector-editor/node_modules/playwright-core`, chromium `~/.cache/ms-playwright/chromium-1255/`),
serve `web/` with `python3 -m http.server <port>` (run `npm run build:web` first if `web/` is stale).
**Prior-task inputs:** Task 4's `IconifyPanel` component and i18n keys (`src/components/editor/IconifyPanel.jsx`,
`task-4-report.md`) — read both first.

## Task text (from the plan — your requirements, exact values verbatim)

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
