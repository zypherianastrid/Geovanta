# Task 4 Brief — Panel UI (`IconifyPanel.jsx`) + i18n

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 1, 2, 3, 7, 9)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = backup `.bak-iconify-t4` + report file)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-4-report.md`
**Global constraints (from plan):** no new npm dependencies; search debounce ~300 ms, stale requests cancelled
via `AbortController`; if any CSS AST rules are added to `src/vendor/tailwindOfflineBundle.jsx`, update the
tripwire count in `tests/accent-tokens.test.cjs` (currently 844); tests `npm test` (node --test).
**Prior-task inputs:** Task 3's client (`src/renderer/iconifyClient.jsx`, exports `searchIcons`,
`listCollections`, `loadSet`, `buildIconSvg`, `isPaletteIcon`, `probeOnline`) and its report
(`task-3-report.md`) — read both first. Follow the `RecolorSection.jsx` / `FindReplaceSection.jsx`
section pattern for the panel and the `appI18n` pattern for labels.

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator note for this task (ledger R5)

- Record in your report whether a component test harness exists. If it does not, the three Step 1
  assertions (browse grid on open; debounced query switches to search results; empty state explains)
  MUST be verifiable in the Task 8 probe — state explicitly in your report that they are deferred there.
