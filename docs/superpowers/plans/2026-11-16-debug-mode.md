# Debugging Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah Debugging Mode (Pendekatan A) ke Geovanta basis TightWidth: logger terpusat + panel log live + export JSON/Markdown.

**Architecture:** Satu singleton `DEBUG_LOG` tanpa dependensi React; `VectorEditor.tsx` hanya instrumentasi di choke point (effect tool/seleksi/zoom, `undo`/`redo`, pointer, `downloadSvg`, `importFiles`); panel React terpisah membaca logger via subscribe.

**Tech Stack:** React 18 + esbuild, tes `node --test` pola `loadSource` via esbuild (lihat `tests/blob-generator.test.cjs`).

**Spec:** `docs/superpowers/specs/2026-11-16-debug-mode-design.md`

## Global Constraints

- Basis: ZIP user TightWidth (SHA `a4a0b401…`); ZIP asli utuh, kerja di `~/workspace/geovanta-debug-mode/`.
- Default MATI; tidak merekam saat OFF; tidak kirim log ke jaringan; tidak ubah `RENDER_CONFIG.debugMode`.
- Shortcut `Ctrl+Shift+D` (bebas — terpakai: Ctrl+Shift+G/O/H/L).
- Verifikasi ramping (2026-11-16, mengikat): hanya tes terarah + cek konflik + cek syntax. Tanpa full suite / build penuh / probe / smoke kecuali user minta eksplisit.
- Backup `.bak-2026-11-16-debug` sebelum edit destruktif; ZIP repack tanpa `node_modules` dan tanpa `*.bak`.
- Deadline user: 45 menit, selesai 15:42 WIB. Eksekusi native (saya sendiri) — disetujui implisit oleh pilihan pendekatan + deadline; tanpa ronde review plan tambahan.

## Review Focus

- Pointermove TIDAK dicatat (spam) — hanya pointer-down/up; bila user mengharapkan jejak gerak, itu gap yang disengaja.
- Zoom wheel beruntun dicatat sekali sesudah settle 400 ms, bukan per tick.
- Log berisi nama layer/id objek ringkas (maks 5 id) — isi dokumen penuh tidak dicatat.
- `DEBUG_LOG.log` saat OFF/pause harus no-op murah (guard di baris pertama).
- Export Markdown harus lolos bila detail berisi `|` atau newline (sanitasi).

---

### Task 1: Logger terpusat `debugLogger.tsx` + tes terarah

**Files:**
- Create: `src/utils/debugLogger.tsx`
- Test: `tests/debug-logger.test.cjs`

**Interfaces:**
- Produces: `DEBUG_LOG = { log(category, action, fn, file, detail), setEnabled(v), isEnabled(), setPaused(v), isPaused(), clear(), getEntries(), subscribe(fn), toJSON(), toMarkdown(), download(format) }`, `DEBUG_CATEGORIES`, `MAX_DEBUG_ENTRIES = 1000`.
- Entri: `{seq, ts, ms, category, action, fn, file, detail}`.
- `window.geovantaDebug` (bila `window` ada): `{enable, disable, toggle, log, getEntries, toJSON, toMarkdown, download, clear}`.
- `download(format)` di luar browser (tanpa `document`) mengembalikan `null`.

- [ ] **Step 1: Write the failing test** — `tests/debug-logger.test.cjs` pola `loadSource('src/utils/debugLogger.tsx')`: OFF default (log → null, 0 entri); ON lalu log → 1 entri berisi category/action/fn/file/detail; cap 1000 (log 1005 → 1000 entri, seq pertama 6); pause → null; clear → 0; `toJSON()` berisi `app/feature/entries`; `toMarkdown()` berisi `# Geovanta Debug Log`, header tabel, nama fn + file; `download('json')` di node → null; subscribe dipanggil saat log.
- [ ] **Step 2: Run test to verify it fails** — Run: `node --test tests/debug-logger.test.cjs`. Expected: FAIL (modul belum ada).
- [ ] **Step 3: Implement** `src/utils/debugLogger.tsx` — singleton, ring buffer 1000, `setEnabled` mencatat transisi on/off sendiri, sanitasi `|`/newline di Markdown, `download` via Blob + `a.click` hanya bila `document` ada.
- [ ] **Step 4: Run test to verify it passes** — Run: `node --test tests/debug-logger.test.cjs`. Expected: PASS semua.

### Task 2: Panel log `DebugLogPanel.tsx`

**Files:**
- Create: `src/components/editor/DebugLogPanel.tsx`

**Interfaces:**
- Consumes: `DEBUG_LOG` dari Task 1 (subscribe + getEntries + download + clear + setPaused).
- Produces: komponen `DebugLogPanel({open, enabled, onToggle, onClose})` — panel fixed kanan-bawah, filter kategori, cari teks, Pause, Clear, Unduh JSON, Unduh MD, tombol tutup.

- [ ] **Step 1: Implement** panel mengikuti gaya komponen existing (props destructure, tanpa tipe TS) — daftar live via subscribe, filter + search lokal, tombol export memanggil `DEBUG_LOG.download('json'|'md')`.
- [ ] **Step 2: Syntax check** — Run: `node_modules/.bin/esbuild src/components/editor/DebugLogPanel.tsx --bundle --platform=browser --format=esm --outfile=/dev/null`. Expected: exit 0.

### Task 3: Wiring `VectorEditor.tsx`

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx` (backup `.bak-2026-11-16-debug` dulu)
- Modify: `src/constants/keyboardShortcuts.tsx` (backup sama)

**Interfaces:**
- Consumes: `DEBUG_LOG`, `DebugLogPanel` dari Task 1–2.
- Produces: state `debugEnabled`/`debugOpen`, `toggleDebugMode` (ref-mirror, tanpa side effect di updater setState), shortcut `Ctrl+Shift+D` di `kbHandlersRef.current.kd` sesudah blok `mod+y`, log di: effect `[tool]`, effect `[sel]`, effect `[zoom]` (debounce 400 ms), effect `[editingText]`, `undo()`/`redo()`, `onPointerDown`/`onPointerUp` (satu baris tiap handler), `downloadSvg()`, `importFiles()`, listener `error`/`unhandledrejection` saat enabled; render `<DebugLogPanel>` + tombol Debug (hanya saat panel tertutup) sebelum toast.

- [ ] **Step 1: Backup** — Run: `cp src/components/editor/VectorEditor.tsx src/components/editor/VectorEditor.tsx.bak-2026-11-16-debug` (dan keyboardShortcuts sama).
- [ ] **Step 2: Implement** wiring sesuai Interfaces di atas; tambah entri `Ctrl + Shift + D` di grup Bantuan `SC` dan `SC_EN`.
- [ ] **Step 3: Cek konflik** — Run: `grep -n "DEBUG_LOG\|DebugLogPanel\|toggleDebugMode\|debugEnabled" src/components/editor/VectorEditor.tsx` — pastikan tidak ada nama bentrok dengan `diagOpen`/`renderCfg.debugMode`; Run: `grep -n "Shift + D" src/constants/keyboardShortcuts.tsx` — satu entri baru.
- [ ] **Step 4: Syntax check** — Run: `node_modules/.bin/esbuild src/components/editor/VectorEditor.tsx --bundle --platform=browser --format=esm --outfile=/dev/null`. Expected: exit 0 (warning saja boleh).

### Task 4: Verifikasi ramping + repack ZIP

**Files:**
- Output: `~/workspace/your_files/Geovanta-DebugMode-FIX.zip`

- [ ] **Step 1: Tes terarah** — Run: `node --test tests/debug-logger.test.cjs`. Expected: PASS semua.
- [ ] **Step 2: Cek syntax file diubah** — Run: esbuild tiap file diubah (logger, panel, VectorEditor, keyboardShortcuts). Expected: exit 0.
- [ ] **Step 3: Repack** — Run: `zip` dari dalam work dir, exclude `node_modules`, `*.bak*`, dan file plan/design ikut (sudah di docs/). Expected: `unzip -t` OK, entri = 635 + file baru (logger, panel, test, plan, design).
- [ ] **Step 4: Serahkan** — laporkan path ZIP + SHA256 + cara pakai (Ctrl+Shift+D), jujur: full suite / build penuh / probe / smoke TIDAK dijalankan (bukan bagian verifikasi ramping).
