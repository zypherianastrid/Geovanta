# Task 6 Review — Insert flow + metadata (independent reviewer)

**Verdict: Approved — 0 Critical, 0 Important, 2 Minor (both deferred, neither blocks Task 6)**
**Date:** 2026-11-15 · Reviewer did NOT implement this task; no product code edited; no subagents dispatched.

## Verification actually run (independent)

- `npm test` in `geovanta-round2/` → **299/299 pass** (incl. `tests/iconify-client.test.cjs` 14/14).
- `npm run build:web` → **exit 0**.
- Probe re-run in the real browser (fresh `python3 -m http.server 9041` on rebuilt `web/`, loopback CONNECT relay per `probe-iconify-spike1.cjs` pattern, no pipe so exit code recorded): `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs` → **43/43 PASS, PROBE_EXIT=0**, identical values to the report (mdi bbox `[360,264,440,332]`, tabler strokes `#000073` ×2, strokeWidth `[8,8]`, palette `circle-flags:aa` 6 objects, multi node counts `[4,5]`, T6-7 recolor + undo, T6-8 round-trip + real reload).
- Live API check via curl: `/collections?prefixes=circle-flags,mdi` returns `license` as an **object** `{title, spdx, url}` (e.g. mdi `spdx: "Apache-2.0"`), confirming report §4.1.

## Spec compliance (spec §7 items 4–6, binding)

- **Insert (§7.4):** viewport center, frame scale `k = 96 / viewBox width` (R10: tight bbox = native × 4, confirmed exactly, e.g. mdi 80×68 at center), selected (`setSel` on new objects), ONE `commit()` per insert = one Ctrl+Z step (T6-2 proves it for mdi; same single-commit code path for all icons), multi-path = one named group (`group: fullName`, uniquified `-2`, `-3` on collision; object names uniquified too). ✓
- **Color rule (§7.5):** palette (`circle-flags:aa`) keeps original fills (`#0052b4` etc., no `#0000ff`); fill-based mono uses active Fill (`#0000ff`); stroke-based uses active Stroke color + width (`#000073`, width 8 = 2×4). ✓
- **Metadata (§7.6):** `icon: {name, license}` on every group member, SPDX string normalized (`spdx` → `title` → null), survives JSON round-trip AND real autosave → reload → reopen (T6-8a/b genuine). ✓
- **R3:** `tests/iconify-client.test.cjs` untouched — correct. The explicit-fill fallback IS already covered: test at lines 196–208, `isPaletteIcon({name:'x:logo', prefix:'x', palette:false}, colorSet)` with `fill="#ff0000"` body and no palette flag → `true`. ✓
- **R12:** genuine. T6-7 re-runs recolor AFTER group assignment via the real Stroke panel (Ctrl+A → ColorText `00aa00`): both named groups (2/2 objects each) recolor, one Ctrl+Z restores `#000073`. No group-splitting needed. ✓
- **R14:** genuine. T6-8 asserts `strokeWidth === 8` from `getDoc()` after both round-trip and real reload. Report's Task 1 correction confirmed: parser is `src/engine/svgDocumentParser.jsx:520,601` — `swVal = parseFloat(...) * sc`, field name is `strokeWidth`; Task 1's `o.sw` read a nonexistent field. ✓
- **R6 deviation — ACCEPTED, not a finding:** probe uses accent-derived Stroke `#000073` vs Fill `#0000ff` instead of literal red/blue. Verified from code that no UI sets Fill and Stroke independently (`shapeSty` follows accent only; `accentStroke` = HSV value × 0.45, 115 = `0x73`). The probe still discriminates: both tabler paths take Stroke, fill stays `none`. Substance of the ruling verified. ✓
- **Scope:** diff vs `.bak-iconify-t6` is exactly +1 import, +`shapeStyRef`, +`onIconifyInsert` in `VectorEditor.jsx` only. mtimes confirm `IconifyPanel.jsx` (02:35), `iconifyClient.jsx` (02:22), `tests/iconify-client.test.cjs` (02:23) all predate the Task 6 edit (02:57); `package.json` untouched (2026-11-11), no new deps, no hardcoded hosts in product code. ✓

## Findings

### Minor (deferred — do not block Task 6)

1. **M1 — Panel license label renders `"[object Object]"` for live collections.** `src/components/editor/IconifyPanel.jsx:259` (`.replace('{license}', singleCollection.license)`) and `:262` (`licenses.join(', ')`) string-coerce the raw license object; the client passes it through unnormalized (`src/renderer/iconifyClient.jsx:91` in `searchIcons`, `:125` in `listCollections`). Live curl confirms the API returns `{title, spdx, url}`. **Classification: DEFERRED to the final-review fix wave / Task 4 follow-up — does NOT block Task 6.** Reasoning: the defect lives in Task 4's file (outside Task 6's brief file list), Task 6's own deliverable (insert metadata) normalizes the license correctly to an SPDX string, and fixing the panel/client here would be scope creep. Fix (elsewhere): normalize license to its SPDX string once in the client (`spdx || title || null`) so both the panel label and any future consumer are correct; must land before the final ZIP since the label is user-visible.
2. **M2 — Failure branch (toast + zero objects) verified structurally only.** `src/components/editor/VectorEditor.jsx:207` (`onIconifyInsert`): `commit()` occurs only after parse + transform succeed and the `catch` toasts — the structure is correct on inspection, but no runtime probe exercises it because the panel only renders icons whose set is already loaded. **Classification: DEFERRED verification** — acceptable for Task 6; recommend closing it in Task 8 / final review via request interception for an unloaded set or an exposed test-only insert call. Not a behavior defect.

## Observations (not findings)

- T6-8's `okMdi` check allows `mdi:home` count 0 (it was removed by the T6-2 undo), so metadata survival is proven for tabler/multi/palette, not re-proven for mdi — the report states this accurately and it does not weaken the verdict.
- Single-Undo verified by probe only for mdi; tabler/multi/palette share the identical single-`commit()` path (code inspection), which is sufficient.
- Scale factor `k` derives from viewBox width only; for non-square icons the height is native×k rather than literal 96 — consistent with ruling R10 (tight bbox = native × 4), not a spec violation.
