# Task 7 Review — Offline state + "Terakhir dipakai" reuse (independent review)

**Reviewer:** independent (did not implement). **Verdict: Approved — 0 Critical, 0 Important, 3 Minor (deferred).**
**Date:** 2026-11-15. **Scope:** brief, design §7 items 7–8, task-7-report.md, task-7-review-package.md,
actual diffs vs `.bak-iconify-t7`, `probes/probe-iconify-offline.cjs`, plus independent re-runs below.

## Verification actually run by the reviewer

- `npm test` → **299/299 pass, 0 fail** (re-ran twice; second run also 299/299).
- `npm run build:web` → **exit 0** ("Aset offline CanvasKit GPU/CPU siap di dist/ dan web/").
- Offline probe, real browser, no pipe (server `web/` on 9043, Playwright chromium-1255):
  `OFFLINE_URL=http://127.0.0.1:9043/ node probes/probe-iconify-offline.cjs` → **12/12 PASS, exit 0**
  (T7-1a, T7-1b `cdn=0 apiNonVersion=0`, only request `https://api.iconify.design/version`; T7-4a imgCount=0;
  T7-4b 0→0 + failToast; T7-1c rect → 1 object; T7-3setup/3a/3b cached re-insert 1→2 + toast;
  T7-3c `recentIcons=["mdi:home"]`; T7-2a per-set `Perlu internet untuk memuat set ikon "material-symbols"`;
  T7-2b per-set toast, 0 objects; E1 0 pageerror).

## Checks confirmed from code (not just the probe)

- **Offline copy verbatim:** `appI18n.jsx:408` `icOffline: 'Perlu internet untuk mencari ikon'`, rendered at
  `IconifyPanel.jsx:309` under `netStatus === 'offline'` (`data-testid="ic-offline"`); probe T7-1a confirms.
- **Gating:** all three network effects gate on `netStatus === 'online'` — `listCollections` (:177),
  `loadSet` browse (:190), `searchIcons` (:229, dep `netStatus` added). `probeOnline` (3 s, Task 3,
  `iconifyClient.jsx:222`) is the only offline traffic — probe T7-1b confirms `all=["…/version"]`.
  `ensureSets` is only reachable from the gated search/load-more paths.
- **Per-host mapping:** `loadSet` failure → `Perlu internet untuk memuat set ikon "<pfx>"`
  (`iconifyClient.jsx:149`); `searchIcons` failure → `Perlu internet untuk mencari ikon` (`:108`);
  `toPanelError` (`IconifyPanel.jsx:99-103`) passes through only `CONTEXTUAL_ERROR_PREFIXES`
  (`'Perlu internet untuk '` etc.) and replaces anything else (incl. raw `TypeError: Failed to fetch`)
  with the generic i18n message — raw fetch errors are never shown. T7-2a/2b confirm per-host independence.
- **Recent reuse:** recent rows render name-only, no `<img>`, outside the offline branch
  (`IconifyPanel.jsx:309`, `recentNames` slice `RECENT_MAX=12` at :154); click calls the same
  `onInsert({name})`; cached set re-inserts offline (T7-3b), uncached → Task 6 toast, 0 objects, panel open (T7-4b).
- **Recent storage:** sole writer is `rememberRecentIcon` (`VectorEditor.jsx:146-163`, rejects names without
  `:`, dedupes, caps 12), called only after successful `commit` + `say` in `onIconifyInsert` (:285).
  `grep recentIcons src/` shows no other writer path. `DEFAULT_PREFS.recentIcons: []`
  (`themeAndPrefsConstants.jsx:16`); `loadPrefs` drops entries without `:` + caps 12
  (`themeAndPrefsManager.jsx:62-64`). T7-3c confirms runtime persistence `["mdi:home"]`.
- **R19:** internal-panel path — `netStatus` state init from `status` prop only (`IconifyPanel.jsx:136`),
  `probeOnline()` + `online`/`offline` listeners on `[open]` (:137-148). Parent-driven wiring correctly NOT
  done; Task 4 SSR tests still pass (`status="offline"` → `ic-offline`, default → loading) — covered by
  `npm test` 299/299, `tests/iconify-panel.test.cjs:93-106`.
- **R4:** `src/renderer/iconifyClient.jsx` untouched — mtime 2026-11-15 02:22 (before Task 7 backups 03:09),
  no `.bak-iconify-t7` for it, no signature changes.
- **T7-4b toast-timing fix: legitimate, not a weakening.** `say()` toast lifetime is 2200 ms
  (`VectorEditor.jsx:128`); the probe now checks the toast immediately after click instead of 3 s later.
  The assertion still requires `failToast=true` and passed in my independent re-run.
- **Honest limits (report §5):** accurately stated, not hidden — route-abort stand-in, real
  `online`/`offline` events untested, TLS unproven, headless-only. All match what the probe/code show.

## Findings

### Critical — none. Important — none.

### Minor (deferred, do not block)

- M1 — `src/components/editor/IconifyPanel.jsx:246` (search catch): report §1.1 overstates that a
  search-fetch failure flips the panel to the offline *state* — the catch only sets `searchError`
  (rendered as `ic-error` with the same verbatim copy), it never calls `setNetStatus('offline')`;
  the `ic-offline` block comes only from `probeOnline`/listeners. User-visible copy is identical and
  the panel still works, so this is wording/behaviour polish: optionally set `netStatus` to `'offline'`
  on a contextual offline search error. Deferred.
- M2 — `src/utils/themeAndPrefsManager.jsx:62`: `loadPrefs` sanitizes `recentIcons` only when it is an
  array; a non-array value (e.g. a stray string in prefs) passes through unfiltered. Harmless in
  practice — the panel guards with `Array.isArray` (`IconifyPanel.jsx:154`) and the writer always
  stores an array — and it mirrors the pre-existing `recentColors` pattern. Deferred.
- M3 — `src/components/editor/IconifyPanel.jsx:263` (`handleLoadMoreSearch`): the load-more handler calls
  `searchIcons` without a `netStatus` gate (unlike the search effect). Currently unreachable offline —
  the button is only rendered in the online branch — so no defect today; add the guard for defence in
  depth if the handler is ever reused. Deferred.

## Judgment on the 5-file extension

**Justified and minimal, not scope creep.** Each file is required to supply `recentIcons` from prefs,
the only route the brief's Step 3 mandates: `IconifyPanel.jsx` (behaviour), `VectorEditor.jsx`
(writer + prop), `EditorRightInspector.jsx` (passthrough, +3 lines), `themeAndPrefsConstants.jsx`
(default `[]`, +1 line), `themeAndPrefsManager.jsx` (load sanitization, +7 lines). No unrelated changes;
`iconifyClient.jsx` untouched per R4; the known `[object Object]` license label was correctly left deferred.
