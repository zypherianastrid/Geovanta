### Task 3: Wrapper modal + pindah mount

**Files:**
- Create: `src/components/modals/IconifyModal.jsx`
- Modify: `src/components/editor/VectorEditor.jsx`
- Modify: `src/components/editor/EditorRightInspector.jsx`
- Test: `probes/probe-iconify-modal.cjs` (bagian buka/tutup — ditulis di Task 5; siklus tes task ini memakai subset probe yang sama, lihat Step 2)

**Interfaces:**
- Consumes: `IconifyPanel` (tidak berubah, dari Task 2), `usePresence` dari `src/utils/presenceAndFilePicker.jsx`, pola portal `.ov` + `.hp` dari `SettingsModal.jsx`, `onIconifyInsert` / `onIconifyClose` / `recentIcons` (sudah ada di `VectorEditor.jsx`).
- Produces: `<IconifyModal open={boolean} onInsert={fn} onClose={fn} L={object} recentIcons={string[]} />` — `open=false` memainkan animasi keluar lalu unmount (via `usePresence`); backdrop click menutup kecuali saat `.flt` terbuka.

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/components/editor/VectorEditor.jsx src/components/editor/VectorEditor.jsx.bak-modal-t3
cp src/components/editor/EditorRightInspector.jsx src/components/editor/EditorRightInspector.jsx.bak-modal-t3
```

- [ ] **Step 2: Write the failing probe subset dulu (RED)** — buat `probes/probe-iconify-modal.cjs` dengan hanya skenario buka/tutup (sisanya dilengkapi Task 5): `M1` modal terbuka dari tombol floating bar (`[data-testid="ic-modal"]` visible, `[data-testid="ic-panel"]` di dalamnya); `M2` tombol X menutup; `M3` Esc menutup; `M4` klik backdrop menutup; `M5` klik backdrop saat dropdown `.flt` terbuka → modal TETAP terbuka (Review Focus #2). Jalankan melawan build sekarang — Expected: FAIL (tidak ada `ic-modal`).

- [ ] **Step 3: Implement `src/components/modals/IconifyModal.jsx`** — komponen tipis, tanpa logika cari/sisip:
```jsx
// Pola SettingsModal: portal + .ov + .hp + usePresence(open, 200).
// Backdrop: onPointerDown, tutup hanya bila e.target === e.currentTarget
// DAN tidak ada .flt yang terbuka (guard Q4).
// Dialog: <div className="hp" role="dialog" aria-label={L.icTitle}
//   data-testid="ic-modal" style={{maxWidth: 960, maxHeight: '85vh'}}>
//   berisi <IconifyPanel open onInsert onClose L recentIcons />
```
  - Bila `usePresence` mengembalikan `!m`, return `null` (pola SettingsModal). Panel di dalam menerima `open` apa adanya (efek panel yang di-gate `open` tetap benar selama animasi keluar — verifikasi Review Focus #4 di Step 5).

- [ ] **Step 4: Pindah mount**
  - `EditorRightInspector.jsx`: hapus `{tool === 'iconify' && <IconifyPanel …/>}` + hapus prop `onIconifyClose`, `onIconifyInsert`, `recentIcons` dari destrukturisasi dan dari pemanggil — verifikasi dengan `grep -rn "onIconifyInsert\|onIconifyClose\|recentIcons" src/` bahwa tidak ada pemakai lain yang tersisa (bila ada, itu dead code → hapus, catat di laporan).
  - `VectorEditor.jsx`: tambah import `IconifyModal`, mount di dekat portal import modal yang sudah ada: `<IconifyModal open={tool === 'iconify'} onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={prefs?.recentIcons || []} />` — TANPA bungkus kondisional `tool === 'iconify' &&` (spec §6.2/Q5). Jangan ubah `tool`, `setToolToggle`, `onIconifyClose`, tombol floating bar, atau handler keyboard global.

- [ ] **Step 5: Build + jalankan subset probe (GREEN)**

Run:
```bash
npm run build:web
cd web && python3 -m http.server 9041
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```
Expected: M1–M5 PASS. Lalu verifikasi Review Focus #4: tutup modal, hitung request Iconify sesudah tutup (tidak ada fetch baru), 0 pageerror — catat angkanya di laporan.

- [ ] **Step 6: `npm test` penuh tetap hijau**

Run: `npm test 2>&1 | tail -5`
Expected: PASS (jumlah sama seperti sesudah Task 2).

- [ ] **Step 7: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-3-report.md`.

