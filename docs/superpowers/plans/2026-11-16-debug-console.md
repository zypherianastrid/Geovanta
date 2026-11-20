# Tab Konsol Fungsi — Implementation Plan (addendum Debugging Mode)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambah tab "Konsol Fungsi" di panel Debug (Pendekatan A): dock kanan setinggi layar, baris "SEDANG BERJALAN" = fungsi entri terbaru, stream "PERUBAHAN" prev → next.

**Architecture:** Tanpa instrumentasi baru — semua data dari `DEBUG_LOG` yang sudah ada. Helper murni `describeDebugChange(prev, cur)` + `getActiveFunction(entries)` di `debugLogger.tsx`; komponen baru `DebugFunctionConsole.tsx` hanya render; `DebugLogPanel.tsx` dapat state tab + geometri dock saat tab konsol aktif.

**Tech Stack:** React 18 + esbuild, tes `node --test` pola `loadSource` via esbuild.

**Spec:** `docs/superpowers/specs/2026-11-16-debug-mode-design.md` (+ addendum A di bawah) — Pendekatan A dipilih user 2026-11-16 (koreksi dari C; C dibatalkan, tanpa kode diubah).

## Global Constraints

- Basis: work dir `~/workspace/geovanta-debug-mode/` (sudah berisi Debugging Mode pertama, ZIP `Geovanta-DebugMode-FIX.zip` 640 entri).
- Tab "Log" tidak berubah perilaku/geometri (kotak kanan-bawah 460×380); hanya tab konsol yang dock kanan full-height.
- "Berubah" = nilai sebelum → sesudah dari log yang sudah ada (bukan diff source code).
- Verifikasi ramping (2026-11-16, mengikat): hanya tes terarah + cek konflik + cek syntax. Tanpa full suite / build penuh / probe / smoke kecuali user minta eksplisit.
- Backup `.bak-2026-11-16-console` sebelum edit destruktif; ZIP repack tanpa `node_modules` dan tanpa `*.bak`.
- Deadline user: 45 menit, selesai 15:54 WIB. Eksekusi native.

## Review Focus

- `describeDebugChange` harus mengembalikan `null` (bukan string kosong) bila tidak ada perubahan yang bisa dideskripsikan — stream konsol hanya menampilkan perubahan nyata.
- Entri pointer tidak menghasilkan baris perubahan (terlalu berisik).
- Geometri dock konsol tidak boleh menutupi tombol Debug (tombol hanya tampil saat panel tertutup).

---

### Task 1: Helper perubahan `describeDebugChange` + `getActiveFunction` di logger + tes terarah

**Files:**
- Modify: `src/utils/debugLogger.tsx` (backup `.bak-2026-11-16-console` dulu)
- Test: `tests/debug-function-console.test.cjs`

**Interfaces:**
- Produces: `describeDebugChange(prev, cur)` → string `prev → next` atau `null`; `getActiveFunction(entries)` → entri terakhir atau `null`.
- Aturan: `prev` null → `null`; `cur.action === 'debug-mode-on'` → `'mode: MATI → AKTIF'` (off kebalikannya); detail tool `'tool A -> B'` → `'tool: A → B'`; aksi `zoom:X%` berurutan → `'zoom: X% → Y%'`; aksi `select:N objek` berurutan → `'seleksi: N → M objek'`; detail `hist p=X/Y` berurutan → `'histori: p=X → p=Y'`; aksi `text-edit-open:<id>` → `'edit teks: <id>'`; aksi `export-svg`/`import:N file` → aksi itu sendiri; pointer → `null`; selain itu → `null`.

- [ ] **Step 1: Write the failing test** — `tests/debug-function-console.test.cjs` pola `loadSource('src/utils/debugLogger.tsx')`: tiap aturan di atas (satu test per aturan) + `getActiveFunction([])` → null, `getActiveFunction([e1, e2])` → e2.
- [ ] **Step 2: Run test to verify it fails** — Run: `node --test tests/debug-function-console.test.cjs`. Expected: FAIL (fungsi belum ada).
- [ ] **Step 3: Implement** kedua fungsi di `src/utils/debugLogger.tsx`, export bernama.
- [ ] **Step 4: Run test to verify it passes** — Run: `node --test tests/debug-function-console.test.cjs`. Expected: PASS semua.

### Task 2: Komponen `DebugFunctionConsole.tsx` + tab di `DebugLogPanel.tsx`

**Files:**
- Create: `src/components/editor/DebugFunctionConsole.tsx`
- Modify: `src/components/editor/DebugLogPanel.tsx` (backup `.bak-2026-11-16-console` dulu)

**Interfaces:**
- Consumes: `describeDebugChange`, `getActiveFunction` dari Task 1; `entries` dari panel (sudah subscribe `DEBUG_LOG`).
- Produces: `DebugFunctionConsole({entries})` — kotak "SEDANG BERJALAN" (fn besar + file + aksi + detail + jam entri terbaru; teks kosong bila belum ada entri) + daftar "PERUBAHAN" (100 terakhir, terbaru di atas, tiap baris `#seq jam fn — teks perubahan`).
- Panel: state `tab` (`'log'` | `'console'`, default `'log'`), baris tab Log | Konsol Fungsi di bawah header; saat `tab === 'console'` geometri panel jadi dock kanan (`right: 0, top: 0, bottom: 0, width: 460, height: 100vh, radius 0`), isi = `<DebugFunctionConsole entries={entries} />`; footer (Pause/Clear/Unduh) tetap tampil di kedua tab.

- [ ] **Step 1: Implement** komponen + tab panel sesuai Interfaces di atas.
- [ ] **Step 2: Syntax check** — Run: `node_modules/.bin/esbuild src/components/editor/DebugFunctionConsole.tsx --bundle --platform=browser --format=esm --outfile=/dev/null` dan sama untuk `DebugLogPanel.tsx`. Expected: exit 0.

### Task 3: Verifikasi ramping + repack ZIP

**Files:**
- Output: `~/workspace/your_files/Geovanta-DebugMode-Console-FIX.zip`

- [ ] **Step 1: Tes terarah** — Run: `node --test tests/debug-logger.test.cjs tests/debug-function-console.test.cjs`. Expected: PASS semua.
- [ ] **Step 2: Cek konflik** — Run: `grep -n "describeDebugChange\|getActiveFunction\|DebugFunctionConsole" src/utils/debugLogger.tsx src/components/editor/DebugLogPanel.tsx src/components/editor/DebugFunctionConsole.tsx` — pastikan nama baru tidak bentrok; tab Log tidak berubah.
- [ ] **Step 3: Cek syntax file diubah** — Run: esbuild tiap file diubah. Expected: exit 0.
- [ ] **Step 4: Repack** — Run: `zip` dari dalam work dir, exclude `node_modules`, `*.bak*`. Expected: `unzip -t` OK, entri = 640 + file baru (komponen konsol, tes konsol, plan ini).
- [ ] **Step 5: Serahkan** — laporkan path ZIP + SHA256 + cara pakai (Ctrl+Shift+D → tab Konsol Fungsi), jujur: full suite / build penuh / probe / smoke TIDAK dijalankan; `dist/` masih bundle lama — user harus `npm run build:web` sesudah ekstrak.
