# Task 8 Brief — End-to-end probes + regression sweep

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§9)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = backup `.bak-iconify-t8` for any fix + report file)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-8-report.md`
**Global constraints (from plan):** tests `npm test` (node --test); build `npm run build:web` exit 0; probes via
Playwright (`/home/hatch/workspace/vector-editor/node_modules/playwright-core`, chromium
`~/.cache/ms-playwright/chromium-1255/`), serve `web/` with `python3 -m http.server <port>`.
**Prior-task inputs:** Tasks 3–7 reports (`task-3-report.md` … `task-7-report.md`) and the probes
`probes/probe-iconify.cjs`, `probes/probe-iconify-offline.cjs` — read them first.

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator ruling for this task (ledger R5)

- The finalized probes MUST explicitly include Task 4's three deferred assertions (if no component harness
  existed): browse grid on open shows Material Symbols; typing a debounced query switches to search
  results; empty results show the explanatory empty state. Check Task 4's report for whether they were
  deferred; if they were covered by a component test in Task 4, note that and do not duplicate them.
