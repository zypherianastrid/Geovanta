# Task 7 Brief — Offline state + "Terakhir dipakai" reuse

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 7, 8)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = backup `.bak-iconify-t7` + report file)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-7-report.md`
**Global constraints (from plan):** no new npm dependencies; timeouts 10 s (search/insert), 30 s (`icons.json`),
3 s (`GET /version` online probe); recent max 12 icon names in prefs (names only, never SVG data);
tests `npm test` (node --test); probes via Playwright (`/home/hatch/workspace/vector-editor/node_modules/playwright-core`,
chromium `~/.cache/ms-playwright/chromium-1255/`), serve `web/` with `python3 -m http.server <port>`
(run `npm run build:web` first if `web/` is stale).
**Prior-task inputs:** Task 2 verdict + recorded error strings (`task-2-report.md`), Task 3 client
(`probeOnline`, `loadSet`), Task 4 panel + `status` prop (`src/components/editor/IconifyPanel.jsx`) —
read all three first.

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator ruling for this task (ledger R4)

- You may only ADD exports to `src/renderer/iconifyClient.jsx`; do not change any signature Task 3 defined
  (`searchIcons`, `listCollections`, `loadSet`, `buildIconSvg`, `isPaletteIcon`, `probeOnline`).
