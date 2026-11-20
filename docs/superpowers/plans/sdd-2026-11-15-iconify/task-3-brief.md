# Task 3 Brief — Hybrid icon client (`iconifyClient.jsx`) + unit tests

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec (binding authority if plan and spec conflict):** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 0, 3, 5, 8, 10)
**Work from:** `~/workspace/geovanta-round2/` (NOT a git repo — no git commands; "commit" = write your report file)
**Report file:** `docs/superpowers/plans/sdd-2026-11-15-iconify/task-3-report.md`
**Global constraints (from plan):** no new npm dependencies; no icon data bundled; hosts are single constants
`ICONIFY_API_BASE = "https://api.iconify.design"`, `ICONIFY_CDN_BASE = "https://cdn.jsdelivr.net/npm/@iconify-json"`;
fetch only to these two hosts; search `GET /search?query={q}&limit=48` (+ `&prefix=`); set data
`GET {ICONIFY_CDN_BASE}/{prefix}/icons.json` (no version pin), lazy per set, once per set per session,
browser HTTP cache + in-memory Map; limits: reject icon SVG > 256 KB, reject `icons.json` > 10 MB,
timeouts 10 s (search/insert), 30 s (`icons.json`), 3 s (`GET /version` probe); tests `npm test`
(node --test); build `npm run build:web` exit 0.
**Prior-task inputs:** Task 1 verdict (which icon shapes the client may assume parseable) and Task 2 verdict
(exact failure behavior) are in `docs/superpowers/plans/sdd-2026-11-15-iconify/task-1-report.md` and
`task-2-report.md` — read both first.

## Task text (from the plan — your requirements, exact values verbatim)

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

## Coordinator ruling for this task (ledger R9)

- The 10 MB `icons.json` rejection may be enforced via the `Content-Length` header OR accumulated body
  size — pick one, record the method in your report, and mock the test accordingly.
