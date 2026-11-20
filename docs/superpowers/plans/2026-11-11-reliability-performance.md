# Reliability and Performance Implementation Plan

**Goal:** Make autosave and backup recoverable, prevent thumbnail races, fail stale builds, and reduce work during rendering and storage statistics.

**Architecture:** Keep changes in the existing workspace and renderer modules. Add Node regression tests that bundle the JSX modules with esbuild and exercise their public APIs. Preserve the current offline format and UI behavior.

**Tech stack:** React, CanvasKit, IndexedDB, Tauri, Node test runner.

**Constraint:** This folder has no Git repository, so changes are made in place and cannot be committed or isolated in a worktree.

## Tasks

- [x] Add failing tests for failed data URL migration, backup round trip, stale thumbnail update, and stale build detection.
- [x] Fix asset migration retry and align backup writer limits with import limits; run regression tests.
- [x] Update thumbnails conditionally on project revision; run race tests.
- [x] Make source builds fail when dependencies are missing while retaining an explicit prebuilt staging mode.
- [x] Use the existing spatial index to select visible render objects without changing drawing order or drag behavior.
- [x] Count assets without loading their Blob records for storage statistics.
- [x] Run the complete test suite, frontend build, and Rust check; review remaining feature scope.

## 2026-11-12 renderer follow-up

- [x] Reproduce paint-only rendering with stale spatial-index object references.
- [x] Reproduce a deferred spatial index remaining dirty when the same document settles.
- [x] Return current paint objects from visibility selection and rebuild a deferred index after interaction.
- [x] Verify 37 Node tests, the offline web build, and `cargo check`.
