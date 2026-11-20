# Task 8 Report — End-to-end probes + regression sweep

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§9)
**Date:** 2026-11-15
**Verdict: DONE** — full gate green, R5's three deferred assertions now
probe-verified, stacked-sidebar candidate verified, M1 actual behavior
verified. **Zero defects exposed by the sweep — 0 fix rounds, 0 `src/`
changes.**

No subagents were dispatched (per brief). Work from
`~/workspace/geovanta-round2/` (not a git repo — no git commands;
"commit" = backups + this report).

## 1. Full gate — exact counts

| Check | Result |
| --- | --- |
| `npm test` (node --test) | **299/299 pass, 0 fail** (run twice: before probe edits and after; identical) |
| `npm run build:web` | **exit 0** — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/." |
| `node probes/probe-iconify.cjs` | **50/50 lolos, exit 0, 0 pageerror** (P7) |
| `node probes/probe-iconify-offline.cjs` | **14/14 lolos, exit 0, 0 pageerror** (E1) |

Baseline before any probe edit (same build, same commands, no pipe so
exit codes are real): suite 299/299, build exit 0, probe-iconify
**43/43**, probe-offline **12/12**. After finalizing the probes:
probe-iconify **50/50** (+7 new T8 checks), probe-offline **14/14**
(+2 new T8 checks). Every pre-existing assertion stayed green —
no regression.

Commands (servers from `web/`, `web/` fresh — no `src/` file newer
than `web/assets/geovanta.bundle.js`, so no rebuild was needed between
runs; build was still re-run for the final gate):

```text
cd web && python3 -m http.server 9041
PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs   # tanpa pipe
cd web && python3 -m http.server 9042
OFFLINE_URL=http://127.0.0.1:9042/ node probes/probe-iconify-offline.cjs  # tanpa pipe
```

## 2. R5 — Task 4's three deferred assertions (now in the probe)

Task 4's report (§1) confirmed the component harness only does static
render, so all three were genuinely deferred — none was covered by a
Task 4 component test. All three are now explicit checks in
`probes/probe-iconify.cjs` (section "Task 8", after P6, before Task 6),
verified in the real browser:

| ID | Assertion | Actual (final run) |
| --- | --- | --- |
| T8-1 (R5.1) | Browse grid on open shows Material Symbols | `materialSymbolsIcons=48 first=ic-icon-material-symbols:123` (first page of 48) |
| T8-2a (R5.2) | Typing a debounced query switches to search results | `mdiHomeVisible=true` after typing "home" |
| T8-2b (R5.2, mode proof) | Search mode shows the results count (browse mode has none) | `icCountVisible=true` |
| T8-3a (R5.3) | Empty results show the explanatory empty state naming the query | `text="Tidak ada ikon yang cocok dengan \"zzzqqqxxyy-noicon\". Coba kata kunci lain dalam bahasa Inggris."` |
| T8-3b (R5.3) | Empty search shows no icon grid | `icGridCount=0` |
| T8-3c | Clearing the query returns to the browse grid and the panel closes cleanly | `browseGridBack=true panelVisible=false` |

The gibberish query `zzzqqqxxyy-noicon` was chosen so the API returns
0 results deterministically (a real word could plausibly match an
icon). T8-3c restores the exact pre-condition Task 6 assumes (panel
starts closed — `openPanel` toggles), so the T6 flow below it is
unaffected; T6-1…T6-8 all still pass unchanged.

## 3. Task 5 deferred minor — stacked sidebar (verified, T8-4)

The Task 5 report recorded (never probe-verified) that Recolor /
FindReplace stay open stacked alongside Iconify because the sidebar
sections have no mutual exclusion. It fits naturally in the sweep and
is now asserted:

| ID | Assertion | Actual (final run) |
| --- | --- | --- |
| T8-4 | Recolor + FindReplace stay open stacked alongside Iconify | `icPanel=true frSection=true rcSection=true` |

Method: click `[data-testid="fr-open-styles"]` → `fr-section` visible,
click `[data-testid="rc-open-styles"]` → `rc-section` visible, open the
Iconify panel, assert all three sections visible at once. FR/RC are
closed again afterwards (via `fr-close` / `rc-close`) so Task 6 runs in
its baseline state. **Nothing left deferred from Task 5.**

## 4. Task 7 review minor M1 — actual behavior asserted (T8-5)

M1 caution followed exactly: the new checks assert the ACTUAL
behavior, not an assumed status flip. New Page C in
`probes/probe-iconify-offline.cjs` blocks only the `/search` API
endpoint (`page.route('**/api.iconify.design/search**', abort)`) while
`/collections`, `/version`, and the CDN stay live:

| ID | Assertion | Actual (final run) |
| --- | --- | --- |
| T8-5a | Search-fetch fails: `ic-error` shows the verbatim copy, panel does NOT flip to offline state | `icError="Perlu internet untuk mencari ikon" icOfflineShown=false` |
| T8-5b | After clearing the failed search the browse grid returns (panel still online) | `browseGridBack=true icOfflineShown=false` |

So: search failure → `ic-error` with "Perlu internet untuk mencari
ikon", `netStatus` stays `'online'`, no `ic-offline` at any point, and
the panel recovers to browse on clear. This is the behavior as
implemented, verified live — not an assumed flip.

## 5. Fix rounds: none (0 of max 2)

The sweep exposed **no defect**: baseline probes were already 43/43
and 12/12, and the finalized probes passed **50/50 and 14/14 on the
first run** (no re-run needed for a fix, no second round). Therefore:

- No `.bak-iconify-t8` backup of any `src/` file exists — no `src/`
  file was touched (verified: `find src -name "*.bak-iconify-t8"` empty).
- No design change was needed; nothing was stopped-and-reported.
- Probe-only backups (pre-edit copies, per the "commit" convention):
  `probes/probe-iconify.cjs.bak-iconify-t8`,
  `probes/probe-iconify-offline.cjs.bak-iconify-t8`.

## 6. Files changed / created

Modified (probe assertions only — no product behavior changed):

- `probes/probe-iconify.cjs` — +7 checks (T8-1, T8-2a/b, T8-3a/b/c,
  T8-4) + header note; summary label `PROBE-ICONIFY-T6` →
  `PROBE-ICONIFY-T8` (2 sites). `node --check` OK.
- `probes/probe-iconify-offline.cjs` — +2 checks (T8-5a/b, new Page C)
  + header note; summary label `PROBE-ICONIFY-OFFLINE-T7` →
  `PROBE-ICONIFY-OFFLINE-T8`. `node --check` OK.

Created:

- `probes/probe-iconify.cjs.bak-iconify-t8` (pre-edit copy).
- `probes/probe-iconify-offline.cjs.bak-iconify-t8` (pre-edit copy).
- This report:
  `docs/superpowers/plans/sdd-2026-11-15-iconify/task-8-report.md`.

Not changed: any `src/` file, any `tests/` file, `web/` (no rebuild
required by probe-only edits; the final `build:web` re-run still exits
0). New screenshots were not produced for the T8 section (the existing
T5/T6/T7 shots still cover the same panel states; T8 asserts DOM state,
not pixels).

## 7. Self-review

- **Completeness:** R5's three assertions explicitly present (T8-1,
  T8-2a/b, T8-3a/b) — none was already covered by a Task 4 component
  test (Task 4 report §1 says so explicitly); stacked-sidebar candidate
  verified (T8-4); M1 actual behavior verified (T8-5a/b); full gate
  green; 0 fix rounds, documented with before/after counts in §1/§5.
- **Quality:** probe changes only finalize assertions — the only
  behavioral interaction is opening/closing FR/RC sections and typing
  queries, all restored to baseline before Task 6 runs; no product
  behavior changed, no defect fix needed.
- **Discipline:** YAGNI — no redesigns, no new features, no new
  testids, no `src/` edits, no dependency changes.
- **Testing:** both probes green in the real browser (headless
  Chromium 1440×900, loopback CONNECT relay + probe-only
  `--ignore-certificate-errors`, per the existing probe pattern);
  full suite green twice.

## 8. Limitations (honest)

- Only headless Chromium 1440×900, light theme, prefs `id` — launch
  Windows + real GPU unmeasured (as in Tasks 5–7).
- Offline is the route-abort stand-in (Task 7 pattern): `fetch()`
  rejects with `TypeError: Failed to fetch`; `context.setOffline` and
  real browser `online`/`offline` events were not exercised.
- TLS validation not proven (probe-only `--ignore-certificate-errors`,
  same as Tasks 5–7).
- T8-3's empty state depends on the live search API returning 0 hits
  for the gibberish query; if the API ever matched it, T8-3a/b would
  fail — that would be a probe-input failure, not a product failure,
  and the query string is recorded verbatim in the probe.
