# Task 3 Report — Wrapper modal + pindah mount

Plan: "Iconify Pindah ke Modal Popup" (`sdd-2026-11-15-iconify-modal`), Task 3 dari 6.
Working copy: `~/workspace/geovanta-round2/`. Status: **DONE**.

## What was implemented

### 1. `src/components/modals/IconifyModal.jsx` (baru)
Komponen tipis, tanpa logika cari/sisip — hanya wrapper portal:
- Pola `SettingsModal`: `ReactDOM.createPortal`, overlay `<div className={'ov ' + (lv ? 'out' : 'in')}>`, dialog `<div className="hp" role="dialog" aria-label={L.icTitle} data-testid="ic-modal">`, `usePresence(open, 200)`; bila `!m` return `null`.
- **Ruling R2 dipatuhi:** panel menerima `open={open}` (nilai modal, BUKAN literal `open={true}`), jadi efek panel yang di-gate `open` (probeOnline, listener Esc, fetch listCollections/loadSet) hanya jalan selama modal terbuka dan berhenti selama animasi keluar.
- Backdrop: `onPointerDown`, tutup hanya bila `e.target === e.currentTarget` DAN tidak ada `.flt` yang terbuka (guard Q4, sama seperti handler Esc panel).
- Ukuran sesuai design §6.1: `maxWidth: 960`, `maxHeight: '85vh'`, plus `overflowY: 'auto'` inline agar badan modal scroll sendiri (grid panjang tidak mendorong dialog keluar layar). Nol aturan CSS baru.

### 2. `src/components/editor/VectorEditor.jsx` (ubah)
- Import `IconifyModal` (baris 49).
- Mount baru tepat di dekat portal import modal yang sudah ada, **tanpa** bungkus kondisional `tool === 'iconify' &&` (spec §6.2/Q5):
  `<IconifyModal open={tool === 'iconify'} onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={prefs && prefs.recentIcons || []} />`
- Pemanggilan inspector dibersihkan: prop `onIconifyClose`, `onIconifyInsert`, `recentIcons` dihapus dari `<EditorRightInspector …/>`.
- Tidak diubah: `tool`, `setToolToggle`, `onIconifyClose`, `onIconifyInsert`, tombol floating bar, handler keyboard global.

### 3. `src/components/editor/EditorRightInspector.jsx` (ubah)
- Hapus mount `{tool === 'iconify' && <IconifyPanel …/>}` dari `.fig-r-scroll`.
- Hapus import `IconifyPanel` dan prop `onIconifyClose`, `onIconifyInsert`, `recentIcons` dari destrukturisasi (beserta komentar Task 5/R17 yang menjelaskannya).
- Verifikasi dead code (brief Step 4): `grep -rn "onIconifyInsert\|onIconifyClose\|recentIcons" src/ --include=*.jsx` (di luar `.bak`) — di `EditorRightInspector.jsx` **nol** sisa. `onIconifyClose`/`onIconifyInsert` di `VectorEditor.jsx` hanya tinggal definisi (baris 204/225) + mount modal (baris 8991); `recentIcons` hanya tinggal `rememberRecentIcon` + mount modal + definisi default prefs. Tidak ada dead code lain yang perlu dihapus.

### 4. `probes/probe-iconify-modal.cjs` (baru, subset buka/tutup)
Skenario M1–M5 + RF4 + PERR, memakai pola relay CONNECT loopback + `--ignore-certificate-errors` dari header `probes/probe-iconify.cjs` (VM egress proxy 403s CONNECT langsung Chromium). Env var `PROBE_THUMB_URL` seperti `probe-iconify-thumb.cjs`. Titik klik backdrop: `(60, 450)` — di luar dialog (maxWidth 960, terpusat → tepi kiri ~240 px pada viewport 1440×900).

## TDD / Probe Evidence

### RED — probe melawan build pra-Task 3
Perintah:
```bash
npm run build:web
cd web && python3 -m http.server 9041
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```
Output (sesuai harapan — belum ada `ic-modal`):
```
FAIL M1 modal terbuka dari tombol floating bar ... | actual=opened=false modalVisible=false panelInModal=0 expected=opened=true modalVisible=true panelInModal>=1
FAIL M2 tombol X menutup | actual=skipped: M1 gagal, modal tidak pernah terbuka
FAIL M3 Esc menutup | actual=skipped: M1 gagal, modal tidak pernah terbuka
FAIL M4 klik backdrop menutup | actual=skipped: M1 gagal, modal tidak pernah terbuka
FAIL M5 klik backdrop saat .flt terbuka -> modal TETAP terbuka | actual=skipped: M1 gagal, modal tidak pernah terbuka
PASS PERR 0 pageerror | actual=[] expected=[]
PROBE-ICONIFY-MODAL: 1/6 lolos | GAGAL: M1, M2, M3, M4, M5
```

### GREEN — probe melawan build pasca-implementasi
Perintah: sama seperti di atas (rebuild dulu via `npm run build:web`, server 9041 tetap jalan).
```
PASS M1 modal terbuka dari tombol floating bar (ic-modal visible, ic-panel di dalamnya) | actual=opened=true modalVisible=true panelInModal=1
PASS M2 tombol X menutup modal | actual=modalGone=true
PASS M3 Esc menutup modal | actual=modalGone=true
PASS M4 klik backdrop menutup modal | actual=modalGone=true
PASS M5 klik backdrop saat .flt terbuka -> modal TETAP terbuka | actual=modalVisible=true fltBefore=1 fltAfter=0
PASS M5b dropdown .flt tertutup sesudah klik backdrop + klik backdrop kedua menutup modal | actual=fltAfter=0
  info fetch Iconify total saat tutup: 6
  info fetch Iconify baru selama 2,5 dtk sesudah tutup: 0
PASS RF4 tidak ada fetch Iconify baru sesudah modal tertutup (Review Focus #4) | actual=before=6 after=6 new=0
PASS PERR 0 pageerror selama probe modal | actual=[]
PROBE-ICONIFY-MODAL: 8/8 lolos | SEMUA LOLOS
```
Catatan M5: guard bekerja persis seperti yang diprediksi dari urutan event — listener outside-click `.flt` (capture di `document`) memanggil `setOpen(false)`, tetapi React belum me-render ulang saat handler backdrop (bubble, React root) berjalan, jadi `document.querySelector('.flt')` masih menemukannya dan klik backdrop diabaikan; dropdown sendiri tertutup oleh outside-click itu, dan klik backdrop kedua (tanpa `.flt`) menutup modal (M5b).

## Review Focus #4 — fetch sesudah tutup
- Total request Iconify (`api.iconify.design` / `cdn.jsdelivr.net`) saat modal tertutup penuh: **6**.
- Request baru selama 2,5 detik sesudah tutup: **0** (`before=6 after=6 new=0`).
- 0 pageerror selama probe.

## Full suite
```bash
npm test 2>&1 | tail -8
```
```
ℹ tests 312
ℹ pass 312
ℹ fail 0
```
Sama seperti sesudah Task 2 (312/312). `npm run build:web` exit 0.

## Files changed
- Create: `src/components/modals/IconifyModal.jsx` (50 baris)
- Modify: `src/components/editor/VectorEditor.jsx` (+1 import, mount modal, hapus 3 prop inspector)
- Modify: `src/components/editor/EditorRightInspector.jsx` (hapus import + 3 prop + mount panel)
- Create: `probes/probe-iconify-modal.cjs` (subset M1–M5 + RF4 + PERR; Task 5 melengkapi suite + regresi probe lama)
- Backup: `src/components/editor/VectorEditor.jsx.bak-modal-t3`, `src/components/editor/EditorRightInspector.jsx.bak-modal-t3`
- Screenshots: `probes/shots/iconify-modal-open.png`, `probes/shots/iconify-modal-closed.png`

## Self-review findings
- Diff dibaca ulang: tepat 3 perubahan substansi (file baru + 2 edit terpindah mount) + probe baru; tidak ada scope expansion (tidak ada perubahan `tool`/`setToolToggle`/handler keyboard/tombol floating bar; `IconifyPanel.jsx` tidak disentuh; nol aturan CSS baru).
- R2 dipatuhi (panel menerima `open` apa adanya) dan mount tanpa bungkus kondisional — keduanya terverifikasi di diff baris 8991 `VectorEditor.jsx` dan baris 46 `IconifyModal.jsx`.
- Satu-satunya tambahan di luar sketsa brief Step 3: `overflowY: 'auto'` pada style dialog — ini bukan kreativitas bebas, melainkan design §6.1 ("badan modal bisa scroll sendiri"); sketsa brief hanya menyingkat style.
- Probe M5b adalah asersi ekstra di luar M1–M5 (verifikasi bahwa modal tetap bisa ditutup sesudah guard bekerja) — masih dalam lingkup skenario M5.

## Issues / concerns
- Tidak ada blocker. Catatan untuk Task 5: server `python3 -m http.server 9041` di `web/` masih berjalan dari sesi ini (melayani build pasca-Task 3); Task 5 bisa memakainya langsung atau me-restart-nya.
- Batasan seperti biasa: verifikasi di headless Chromium 1440×900 light saja; Windows/GPU asli belum diukur.
