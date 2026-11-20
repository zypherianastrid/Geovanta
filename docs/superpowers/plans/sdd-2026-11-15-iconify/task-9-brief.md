# Task 9 Brief — Final verification + ZIP

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§9)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = report file)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-9-report.md`
**Deliverable:** `~/workspace/your_files/Geovanta-Iconify.zip` (creation of this ZIP is authorized by the plan)
**Global constraints (from plan):** no icon data bundled (0 byte data ikon; target < 50 KB new code in `web/`);
tests `npm test` (node --test); build `npm run build:web` exit 0, 0 warnings; probes via Playwright
(`/home/hatch/workspace/vector-editor/node_modules/playwright-core`, chromium `~/.cache/ms-playwright/chromium-1255/`),
serve `web/` with `python3 -m http.server <port>`.
**Prior-task inputs:** Tasks 1–8 reports (`task-1-report.md` … `task-8-report.md`) — read them first.

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator ruling for this task (ledger R8)

- ZIP inclusion = mirror the Round 4 ZIP (`~/workspace/your_files/Geovanta-Round4-UI-Fixes.zip`, 379 entries):
  include `src/`, `web/` build output, `tests/`, `probes/`, `docs/`, and config/scripts needed to build;
  exclude `node_modules/`, temp files, and `.bak-*` backups. Verify against the R4 ZIP listing (e.g.
  `unzip -l`) and record the manifest summary in your report. Do NOT overwrite the Round 4 ZIP.
- The "hand the ZIP to the user" line in Step 3 means: record the exact path + receipt in the report for
  the coordinator to hand over. Do NOT message the user yourself.
