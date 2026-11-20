# Task 1 Brief — Spike 1: CDN → parseSVG → canvas (proof, no product code)

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§8 Spike 1, §5 C2)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = write your report file; no `src/` changes in this task)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-1-report.md`
**Global constraints (from plan):** no new npm dependencies; hosts are single constants
`ICONIFY_API_BASE = "https://api.iconify.design"`, `ICONIFY_CDN_BASE = "https://cdn.jsdelivr.net/npm/@iconify-json"`;
fetch only to these two hosts; insert default 96×96 px at viewport center, selected, one Ctrl+Z undoes
one insert; probes via Playwright (`/home/hatch/workspace/vector-editor/node_modules/playwright-core`,
chromium `~/.cache/ms-playwright/chromium-1255/`), serve `web/` with `python3 -m http.server <port>`
(run `npm run build:web` first if `web/` is stale).

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator notes for this task

- The recolor check (Step 3) is probe-side: drive the real Fill/Stroke panel in the browser if possible; if you must set fill another way, record the exact method in your report — the verdict must say how recolor was tested.
- The multi-element icon name you find and the exact element counts are deliverables — Task 6 depends on them. Record them prominently in the report.
