# Task 2 Brief — Spike 2: CORS + offline behavior in the real browser

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§8 Spike 2, §5 C7)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = write your report file; no `src/` changes in this task)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-2-report.md`
**Global constraints (from plan):** no new npm dependencies; hosts are single constants
`ICONIFY_API_BASE = "https://api.iconify.design"`, `ICONIFY_CDN_BASE = "https://cdn.jsdelivr.net/npm/@iconify-json"`;
fetch only to these two hosts; probes via Playwright (`/home/hatch/workspace/vector-editor/node_modules/playwright-core`,
chromium `~/.cache/ms-playwright/chromium-1255/`), serve `web/` with `python3 -m http.server <port>`
(run `npm run build:web` first if `web/` is stale).

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator ruling for this task (ledger R1)

- "Clicking an icon" in Step 1 means a **probe-level simulated insert** (no panel exists yet): fetch CDN
  `icons.json` → build the SVG string → `VE.parseSVG` → insert attempt. The failure must be
  catchable and must create zero objects. Record the exact error strings observed — Task 7 reuses them.
