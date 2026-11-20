# Task 5 Review — Tool wiring (floating bar → panel)

**Reviewer:** independent reviewer (did not implement). **Verdict: Approved — 0 Critical, 0 Important, 2 Minor (deferred).**
**Date:** 2026-11-15. **Ruling R17 followed, not relitigated:** mount in `EditorRightInspector.jsx` `.fig-r-scroll`, rendered when `tool === 'iconify'`, stable `onIconifyClose` + stub `onIconifyInsert` from `VectorEditor.jsx`; `status`/`recentIcons` left to Task 7; 3rd file authorized.

## What was checked

- Read: brief, spec §7 item 1, report (incl. NEEDS_CONTEXT §3 and Completion after R17), review package; re-read `probes/probe-iconify.cjs` in full and `IconifyPanel.jsx` props/Esc effect (lines 97–139, 242, 271).
- Verified diffs against the `.bak-iconify-t5` backups with `diff` — all three diffs match the review package exactly (+18 / +20 / +8 lines, no other changes).
- Independent verification run by reviewer: `npm test` 299/299, `npm run build:web` exit 0, probe re-run `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs` → **11/11 PASS, exit 0** (no pipe, so exit code is real). HTTP server on 9041 stopped afterwards; port confirmed free.

## Spec compliance (all confirmed)

- **Tool entry:** single entry `{type: 'single', item: ['iconify', 'veIconify', ICONS.shapes]}` (`editorToolsAndShapes.jsx:52`); `ICONS.shapes` already exists (`brandAndIcons.jsx:35`) and that file does not import `editorToolsAndShapes.jsx` — no import cycle, no new bundled icon. `TIPS.veIconify` / `TIPS_EN.veIconify` present (`:105`, `:109`); no `k` field → no new keyboard shortcut.
- **Toggle:** `setToolToggle` (`VectorEditor.jsx:178`) is a functional update toggling only `iconify`→`select`; all other tools pass through. It is passed only as the toolbar's `setTool` prop; internal `setTool('node'/'select')` calls are untouched. `EditorFloatingToolbar.jsx` untouched (no `.bak-iconify-t5` exists for it).
- **Mount:** `{tool === 'iconify' && <IconifyPanel open onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} />}` inside `.fig-r-scroll`, after `{textControls}` (`EditorRightInspector.jsx:207`) — exactly R17. `onIconifyClose` is `useCallback(() => setTool('select'), [])` (`VectorEditor.jsx:185`); `setTool` identity is stable, so the panel's Esc effect depending only on `[open]` (`IconifyPanel.jsx:139`) cannot close over a stale `onClose`. `onInsert` stub (`VectorEditor.jsx:188`) only pushes to `window.__iconifyInsertCalls` — no insert logic.
- **Panel-conflict behavior:** P5 asserts the real shape-picker Float popover closes (`flt before=1 after=0`, panel visible) — meaningful, exercises the existing capture listener, no new code needed. P6 asserts Select closes the panel. Sidebar sections coexist stacked (no mutual exclusion, matching independent `frOpen`/`rcOpen` booleans) — recorded in the report; see Minor M1 for the one unverified part.
- **No scope creep:** mount passes only `open`/`onInsert`/`onClose`/`L` — no `status`/`recentIcons` (only mention is the comment at `EditorRightInspector.jsx:144`). `IconifyPanel.jsx`, Task 3 client, and the probe itself were not modified after the RED run (same probe went RED P0 → GREEN 11/11). Probe assertions are non-vacuous: each checks real DOM state (`count`, `isVisible`, `aria-pressed`, `.flt` count, `pageerror` list).
- **`window.__iconifyInsertCalls` stub global:** acceptable. The brief explicitly orders a stub that "records the call"; a window array is the established probe/diagnostic pattern in this codebase and Task 6 replaces it. Not a defect.

## Findings

### Critical — none (0)

### Important — none (0)

### Minor (deferred, do not block)

- **M1 — `probes/probe-iconify.cjs` (no P8): sidebar coexistence is recorded but not asserted.** The report states Recolor/FindReplace stay open stacked alongside Iconify, but no probe step opens one of those sections and checks it survives opening Iconify. Deferred: the mount is purely additive in `.fig-r-scroll` with no exclusion code to break, so risk is negligible; Task 8 (or a later probe touch) can add it if wanted.
- **M2 — `src/components/editor/VectorEditor.jsx:188`: stub `onInsert` recording path has no probe coverage.** No probe step clicks an icon to confirm `window.__iconifyInsertCalls` is populated. Deferred: the stub is a Task 6 placeholder and Task 6's insert wiring will exercise/replace it; no user-visible behavior depends on it now.
