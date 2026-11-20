# Task 8 Review — End-to-end probes + regression sweep (independent review)

**Reviewer:** independent (did not implement). **Verdict: Approved — 0 Critical, 0 Important, 1 Minor (deferred).**
**Date:** 2026-11-15. **Scope:** brief, design §9, task-8-report.md, task-8-review-package.md,
actual diffs vs `.bak-iconify-t8`, both probes, Task 4 report §1, Task 5 report (stacked sidebar),
Task 7 review (M1), plus independent re-runs below.

## Verification actually run by the reviewer

- `npm test` → **299/299 pass, 0 fail**.
- `npm run build:web` → **exit 0** ("Aset offline CanvasKit GPU/CPU siap di dist/ dan web/").
- `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs` (server `web/` on 9041, no pipe) →
  **50/50 PASS, exit 0, 0 pageerror** (T8-1 `materialSymbolsIcons=48 first=ic-icon-material-symbols:123`;
  T8-2a `mdiHomeVisible=true`; T8-2b `icCountVisible=true`; T8-3a verbatim empty state naming
  `zzzqqqxxyy-noicon`; T8-3b `icGridCount=0`; T8-3c `browseGridBack=true panelVisible=false`;
  T8-4 `icPanel=true frSection=true rcSection=true`; T6-1…T6-8 all still pass after the T8 section).
- `OFFLINE_URL=http://127.0.0.1:9042/ node probes/probe-iconify-offline.cjs` (server `web/` on 9042, no pipe) →
  **14/14 PASS, exit 0, 0 pageerror** (T8-5a `icError="Perlu internet untuk mencari ikon" icOfflineShown=false`;
  T8-5b `browseGridBack=true icOfflineShown=false`; all pre-existing T7 checks green).

## Checks confirmed

- **R5 (Task 4 deferred assertions): genuinely present and meaningful.** Task 4 report §1 explicitly
  defers all three (static-render harness only, no effects/input/timers); the component test file covers
  none of them. T8-1 asserts ≥1 `ic-icon-material-symbols:*` in the browse grid on open (48 observed);
  T8-2a types "home" and waits for `ic-icon-mdi:home` (real debounced search round-trip, 60 s timeout);
  T8-3a/b assert the explanatory empty state naming the query verbatim plus zero icon grid. All three
  passed in my independent re-run.
- **T8-4 stacked sidebar: genuine.** Opens FR then RC then Iconify and asserts all three sections
  visible at once (`icPanel=true frSection=true rcSection=true`); closes FR/RC via `fr-close`/`rc-close`
  afterwards, and T6-1…T6-8 all pass in the same run, proving the baseline is restored for Task 6.
- **T8-5 (M1): genuine, actual behavior asserted.** Page C registers
  `page.route('**/api.iconify.design/search**', abort)` (offline probe line 384) before `goto` — only
  `/search` is blocked; `/collections`, `/version`, and the CDN stay live, proven by the browse grid
  loading before the search. T8-5a asserts verbatim `ic-error` copy AND `icOfflineShown=false`;
  T8-5b asserts recovery to the browse grid with no offline flip on clear. Matches M1's caution exactly.
- **No weakening.** Diff of `check('…')` IDs vs `.bak-iconify-t8`: pure additions only
  (probe-iconify 45→52 static calls, probe-offline 12→14; executed 43→50 and 12→14 — the 2-call gap
  is the duplicated P7 early-exit/final check, one of which runs per execution). Every pre-existing
  assertion passed in my re-runs. The only other diff lines are comments and the `PROBE-ICONIFY-T6→T8`
  / `OFFLINE-T7→T8` summary labels.
- **Zero-defect claim credible.** Baseline 43/43 + 12/12, first finalized run 50/50 + 14/14, and my
  independent re-run also green on the first attempt. The sweep's untested areas (headless-only,
  route-abort offline stand-in, TLS unproven) are the same honest limits recorded in report §8, not
  gaps this sweep should have caught — the sweep's job was the assertions, and it covers the R5/T5/M1
  items it was assigned.
- **Gibberish query sound.** `zzzqqqxxyy-noicon` is a deterministic-empty choice (a real word could
  plausibly match); the fallback — if the API ever matches it, T8-3a/b fail as a probe-input failure,
  not a product failure — is honestly recorded in report §8.
- **No scope creep.** Probe-only changes: `find src tests -newer probes/probe-iconify.cjs.bak-iconify-t8`
  returns nothing; no `.bak-iconify-t8` under `src/` or `tests/`; no new testids, no new features,
  no `src/` or `tests/` edits. `node --check` status is as reported (probes executed cleanly).

## Findings

### Critical — none. Important — none.

### Minor (deferred, do not block)

- M1 — `probes/probe-iconify.cjs:289` (T8-2b): check label claims "(browse mode has none)" but the
  check only asserts `ic-count` is visible in search mode; absence of the count in browse mode is
  never asserted. The label overstates what the check proves. Deferred: either assert count-absence
  in browse mode before typing, or drop the parenthetical from the label.
