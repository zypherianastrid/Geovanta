# Final Whole-Branch Review — Geovanta Iconify (Tasks 1–9)

**Reviewer:** final whole-branch reviewer (did not implement any part). No product/probe/ZIP file edited.
**Date:** 2026-11-15. **Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (highest authority).
**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`.
**Verdict: NEEDS FIXES — 0 Critical, 1 Important, 1 Minor (new findings).**

## 1. Verification actually run by this reviewer

| Check | Result |
|---|---|
| `npm test` (run twice) | **299/299 pass, 0 fail** (exit 0) |
| `npm run build:web` | exit 0, 0 warnings; `web/assets/geovanta.bundle.js` = 2,020,638 B, identical in `dist/` |
| `node probes/probe-iconify.cjs` (own run, http 9041) | **50/50, exit 0, 0 pageerror** |
| `node probes/probe-iconify-offline.cjs` (own run, http 9042) | **14/14, exit 0, 0 pageerror** |
| ZIP on disk | `Geovanta-Iconify.zip` SHA256 `ba4b1223ea734f558cb90ed2d71c4c102f3290037bb0a4f27fbe46d6d34fb5aa`, 16,142,024 B, 507 entries; R4 SHA re-verified `83a2348e…` |
| ZIP contents | 0 `node_modules/`, 0 `*.bak*` entries |
| R4→HEAD delta (extracted both ZIPs, `comm` on file lists + `diff -rq`) | **8 files changed** (6 source + 2 bundle outputs), **125 added, 0 removed** — matches claim exactly |
| CRC spot-check, 6 source files (`unzip -p` + `sha256sum` vs extraction) | **6/6 OK** |
| Bundle growth | 2,020,638 − 2,006,042 (R4) = **+14,596 B (14.3 KB)**, < 50 KB target; 0 `icons.json` in `web/`/`dist/`; `package.json` identical to R4 (no new deps) |
| Live API (curl, this session) | `/search` + `/collections` return `license` as **object** `{title, spdx, url}` (e.g. mdi `spdx: "Apache-2.0"`) — confirms R18 bug is real |

**Not independently verifiable:** the candidate-vs-final ZIP claim (only `task-9-report.md` differs). The candidate ZIP file no longer exists on disk (only the final ZIP is present), so no CRC comparison against it was possible. Supporting evidence: final−candidate size delta is 883 B (16,142,024 − 16,141,141), consistent with a report-text change; the in-ZIP report holds only the candidate receipt `b8f4234c…` (verified: 1 occurrence, no `ba4b1223…` inside the ZIP). See §4.

## 2. Spec compliance (whole branch)

- **G1** search + collection filter ✓ (probe T8-1–T8-3, live search verified). **G2** click-insert 96×96 frame at viewport center, selected, 1× Ctrl+Z ✓ (T6-2, own probe run). **G3** inserted icon is a normal path group; Fill/Stroke recolor works on the grouped insert ✓ (T6-7c, T6-8a/b). **G4** docs offline ✓ (T6-8b autosave+reload+reopen). **G5** no bloat ✓ (+14.6 KB, 0 icon bytes, no new deps). **G6** honest offline state ✓ (offline probe 14/14, incl. T7-1b gating: 0 CDN requests, API only `/version`).
- **Non-goals N1–N6:** none violated. UI icons untouched (tool reuses existing `ICONS.shapes` glyph); no self-host, no bundled icon data, no icon editor, no animation, no custom upload.
- **Anti-goals:** A1 ✓ (300 ms debounce + AbortController); A2 — failure path is runtime-proven via T7-2b (CDN-blocked click → toast + 0 objects), not only structural; A3 ✓; A4 ✓ (unrenderable icons filtered from grid); A5 ✓ (offline copy is honest; recent reuse is cache-gated).
- **Hybrid design as built:** API only for search/collections/probe; icon data from jsDelivr `@iconify-json` `icons.json`, lazy per set, memoized Map + HTTP cache; hosts are the two single constants (`iconifyClient.jsx:26-27`); timeouts 10 s search/collections, 30 s `icons.json`, 3 s `/version`; 256 KB icon-SVG limit (`buildIconSvg`), 10 MB `icons.json` rejection via accumulated body size (R9). All confirmed by reading the client + tests.
- **Panel end-to-end:** browse Material Symbols on open, debounced search, explanatory empty state, palette icons keep original colors (`circle-flags:aa`, T6-5), monochrome follows active Fill/Stroke, insert 96×96 + selected + one Ctrl+Z, `icon: {name, license}` metadata survives save/load (T6-8a/b, re-confirmed in own probe run), offline state + per-set errors + recent reuse cached vs uncached, recent max 12 full `prefix:name` values (enforced at write `VectorEditor.jsx` `rememberRecentIcon`, at load `themeAndPrefsManager.jsx`, and asserted T7-3c). All verified except the license label (§3).
- **Scope:** the 8 changed files are exactly Iconify work + build outputs. No scope creep.

## 3. New findings

### Important (1)

- **I1 — Panel license label renders `"[object Object]"` for live collections (R18 confirmed real).** `src/components/editor/IconifyPanel.jsx:296-300`: `L.icLicenseOne.replace('{license}', singleCollection.license)` and `licenses.join(', ')` string-coerce the raw license; client passes it through unnormalized at `src/renderer/iconifyClient.jsx:91` (`searchIcons`) and `:125` (`listCollections`). Live API returns `license: {title, spdx, url}` (curl-verified this session, §1). Unit tests mock license as a plain string (`tests/iconify-client.test.cjs:60-61,114-115`), so the suite never catches it; neither probe asserts `ic-license` text (grep: 0 assertions), so 50/50 passes with the bug live. Insert metadata is NOT affected — `VectorEditor.jsx` normalizes to SPDX (`spdx || title || null`) and T6-1e/4f/5d/6f assert string licenses. Classification is Important, not Critical: no data loss, no broken flow, metadata/save/load all correct; the defect is confined to one display string (spec §7.2 license note) with a 2-line fix. **Fix (fix wave):** normalize license to an SPDX string once in the client — `license: typeof c?.license === 'string' ? c.license : (c?.license?.spdx || c?.license?.title || null)` at `iconifyClient.jsx:91` and `:125` (keep `VectorEditor.jsx` normalization as-is; it then receives a string). Add a unit test with an object-shaped license mock asserting a string result in both `searchIcons` and `listCollections`, and add a probe assertion that `ic-license` text contains `Apache-2.0` (or `MIT`) and never `[object Object]`. Re-run `npm test`, both probes, rebuild, re-smoke from the rebuilt ZIP, re-zip.

### Minor (1)

- **M1 — Dead probe-recording hook left in shipped product code.** `src/components/editor/VectorEditor.jsx:230-231`: `onIconifyInsert` still pushes every insert to `window.__iconifyInsertCalls`. Zero consumers in `probes/` or `tests/` (grep). Harmless (no behavior, no leak beyond a window array), but it is T5 stub scaffolding, and the ledger claim "no recording hook kept" is inaccurate. **Fix (optional, same wave):** delete the 4 lines (230-233 incl. guard) — or keep deliberately and correct the ledger line. Not blocking.

## 4. Judgments the task asked for

- **Candidate-vs-final gap + self-reference receipt:** acceptable with disclosure as it stands (T9 §7 discloses it; size delta is consistent with a report-only change), BUT the fix wave forces a ZIP rebuild anyway, so the coordinator should rebuild after the fix, re-run the smoke probe from the rebuilt extraction, and record the final receipt. The in-ZIP report can never hold its own ZIP's receipt (chicken-and-egg); disclosure remains the correct handling — do not chase a self-consistent receipt.
- **ZIP `probes/` bloat (70 R2/R3/R4 artifacts, 86 added files under `probes/` total):** ACCEPT. Explicit per R8 (probes/ included deliberately as evidence); the ZIP grows 12.0 MB → 16.1 MB, which is evidence weight, not product bloat. No trim required.

## 5. Deferred-minor triage (one line each)

**Task 1** — hardcoded scale `4` in probe: DROP (product code computes `96/viewBox` in T6; probe is throwaway). `bboxOf` duplication: DROP (throwaway probe, no reuse). Fixed `waitForTimeout` sleeps: ACCEPT (probe-only, green twice; no product impact). Relay + `--ignore-certificate-errors` (TLS unproven): ACCEPT with disclosure (already in T9 §7 honest limits; same caveat as prior rounds). Unproven "no `transform=`" claim: DROP (never repeat it; nothing depends on it). Missing run-log evidence: DROP (moot — full probes re-run by T8 and by this reviewer). Weak "web/ was fresh" mtime: DROP (moot — fresh build + green probes).
**Task 1 `sw: null` — RESOLVED, confirmed genuine:** real field is `strokeWidth` (`svgDocumentParser.jsx:520,601`); own probe run shows T6-8b "real save/reload keeps metadata + strokeWidth 8". No action.
**R18 — FIX** (see I1 above; the prescribed client-side normalization is confirmed correct — the panel and the insert path both consume the client value, and `VectorEditor.jsx` normalization stays as a safe second layer).
**R19 status ownership — ACCEPT:** internal-panel path taken and working (`IconifyPanel.jsx` `netStatus` + `probeOnline` + listeners; T7-1b/T7-3a pass in own run). No parent wiring needed.
**Task 2** — A4 `searchStillOk` omission: DROP (throwaway probe; live search behavior covered by T8 probe). Stale §7 size figure: DROP (doc nit, superseded by T9 figures). Fixed sleeps: ACCEPT (probe-only, green). Hardcoded `viewBox 24`: DROP (correct for `mdi:home`; probe-only). Baseline count unasserted: DROP (probe-only; counts asserted in T7 probes). Citation `:301-307` vs `:297-310`: DROP (doc nit). RED check prose-only: DROP (doc nit).
**Task 3** — `limit < 32` not clamped: ACCEPT (sole caller passes 48; API itself coerces to 32, verified T2; no user-visible effect). Corrupt `icons.json` raw `SyntaxError`: ACCEPT (panel maps unknown errors to `icErrorGeneric`; user-visible behavior identical). `listCollections` failure-eviction untested: ACCEPT (same pattern as tested `loadSet` retry; test-only gap). Untested defensive branches + dead `setData.palette` check: ACCEPT (dead branch harmless; `loadSet` return shape has no `palette` key). `probeOnline` non-OK → `false`: ACCEPT (already ruled defensible; boolean probe).
**Task 4** — `icResults` shows page count (≤48) not total: FIX (one line — render `searchTotal` instead of `renderableSearch.length` in `IconifyPanel.jsx:309`; the "48 ikon ditemukan" label otherwise misstates the total for large result sets). `visibleBrowse` never reset on collection switch: FIX (one line — reset to `PAGE_SIZE` in the browse effect; new collection otherwise opens pre-expanded past 48). Partial set failure silent: ACCEPT (edge case; `setsError` shows when zero renderable; muted note is polish). Offline effects still fire: RESOLVED by T7 gating, confirmed genuine (all three effects gate on `netStatus === 'online'`; T7-1b asserts 0 CDN requests in own run). Recent chips bare `{name}`: RESOLVED, confirmed genuine (prefs store full `prefix:name` only — write filter, load filter, T7-3c assertion). Vacuous SSR "no `<img>`" assertion: DROP (test-only; name-only recent row is probe-verified T7-4a). Esc stale `onClose`: RESOLVED, confirmed genuine (T5 passes stable `onIconifyClose` `useCallback`). `res.json()`/`JSON.parse` outside try/catch: ACCEPT (panel `toPanelError` maps them to generic; no user-visible difference).
**Task 5** — stacked sidebar unasserted: RESOLVED, confirmed genuine (T8-4 in probe, `icPanel` + `frSection` + `rcSection` all true; present in own 50/50 run). Stub recording hook: RESOLVED in substance (stub replaced by real insert) — except the hook lines survive; see new Minor M1.
**Task 6** — failure branch structural-only: ACCEPT (runtime-covered by T7-2b: CDN-blocked click → toast + 0 objects through the real insert path).
**Task 7** — M1 search failure doesn't flip status to offline: ACCEPT (deliberate, probe-asserted T8-5a/b: panel stays online with `ic-error` copy; only the report's wording overstates). M2 non-array `recentIcons` passes `loadPrefs`: ACCEPT (panel guards `Array.isArray`; harmless). M3 `handleLoadMoreSearch` has no `netStatus` gate: ACCEPT (unreachable offline — button renders only in the online search branch).
**Task 8** — T8-2b label "(browse mode has none)" unasserted: FIX (probe-only — either assert count-absence in browse mode or drop the parenthetical; evidence honesty).

## 6. Fix-wave scope (exact)

1. **R18/I1 (required):** normalize license to SPDX string at `iconifyClient.jsx:91` and `:125`; unit test with object license for both paths; probe assertion on `ic-license` text (no `[object Object]`).
2. **T4 `icResults` total (required, 1 line)** and **`visibleBrowse` reset (required, 1 line)** — both in `IconifyPanel.jsx`.
3. **T8-2b probe label (required, probe-only):** assert or drop the parenthetical.
4. **M1 (optional):** delete the 4-line `__iconifyInsertCalls` hook in `VectorEditor.jsx:230-233`, or correct the ledger line if kept.
5. After fixes: `npm test` + both probes + `npm run build:web` + smoke from rebuilt-ZIP extraction + re-zip + record final SHA. Do NOT ship the current ZIP as-is: the panel shows `[object Object]` on every live open.
