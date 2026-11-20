# Task 6 brief — Verifikasi akhir + ZIP (diekstrak dari plan)

Plan: `docs/superpowers/plans/2026-11-15-iconify-modal.md` Task 6 (baris 272–306).
Spec (otoritas mengikat): `docs/superpowers/specs/2026-11-15-iconify-modal-design.md`.
Working copy: `~/workspace/geovanta-round2/` (BUKAN git repo).
Workspace plan: `~/workspace/geovanta-round2/docs/superpowers/plans/sdd-2026-11-15-iconify-modal/`.

## Files
- Modify: `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-6-report.md` (create, laporan akhir)
- Output: `~/workspace/your_files/Geovanta-Iconify-Modal.zip`

## Interfaces
- Consumes: semua hasil Task 1–5; aturan inklusi ZIP ruling R8 (sama seperti ZIP Iconify: `src/`, `web/`, `tests/`, `probes/`, `docs/`, `dist/`, `src-tauri/`, `.github/`, config/scripts; keluar: `node_modules/`, `*.bak*`).
- Produces: ZIP final + laporan akhir dengan receipt lengkap (jumlah entri, byte, SHA256, delta CRC vs ZIP ThumbFix `b5d7c714…`).

## Step 1: Full gate di working copy
```bash
npm test 2>&1 | tail -5
npm run build:web
```
Expected: suite hijau (sebutkan jumlah akhir termasuk tes baru Task 1–2); build exit 0, 0 warning; `web/assets/geovanta.bundle.js` md5 identik dengan `dist/assets/geovanta.bundle.js`; catat ukuran bundle baru dan selisih vs 2.020.678 B.

## Step 2: Ulangi seluruh sweep probe di working copy
Run: keempat probe seperti Task 5 Step 4 (probe-iconify, probe-iconify-thumb, probe-iconify-offline, probe-iconify-modal; server `web/` di 9041 + 9042 — nyalakan bila mati, reviewer Task 5 mencatat server sempat mati di antara run).
Expected: semua hijau (sebutkan hitungan tiap probe di laporan).

## Step 3: Smoke dari hasil ekstrak ZIP kandidat
- Kemas ZIP kandidat ke `~/workspace/your_files/Geovanta-Iconify-Modal.zip` (zip langsung dari working copy per R8; verifikasi 0 entri `node_modules/` dan 0 `*.bak*` dari listing).
- Ekstrak ke `/tmp/iconify-modal-smoke/`, serve `web/` hasil ekstrak di port 9043, jalankan `probe-iconify-thumb.cjs` + `probe-iconify-modal.cjs` melawannya.
- Expected: thumb 3/3, modal semua lolos; `web/assets/geovanta.bundle.js` hasil ekstrak md5-identik dengan working copy.

## Step 4: Delta ZIP vs ZIP ThumbFix
`unzip -l` kedua ZIP → daftar file diurutkan → `comm`; perbandingan CRC file yang sama. Catat: DIUBAH / DITAMBAH / DIHAPUS (perkiraan: diubah `iconifyClient.jsx`, `IconifyPanel.jsx`, `appI18n.jsx`, `VectorEditor.jsx`, `EditorRightInspector.jsx`, kedua bundle, 2 file tes, `probe-iconify.cjs`; ditambah `IconifyModal.jsx`, `probe-iconify-modal.cjs`, laporan + plan modal). ZIP ThumbFix (`Geovanta-Iconify-ThumbFix.zip`, SHA `b5d7c714…`) TIDAK ditimpa — verifikasi SHA-nya sesudah pengemasan.

## Step 5: Write the task report
`docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-6-report.md` dengan receipt ZIP lengkap (entri, byte, SHA256, delta, hasil smoke). Laporan ini ada di dalam ZIP; bila laporan di dalam ZIP berbeda dari versi on-disk hanya pada baris receipt, catat seperti preseden Task 9 Iconify (jangan kemas ulang tanpa alasan).

## Catatan koordinator (tambahan atas plan — bukan perubahan scope)
- Step 3 plan menulis "modal M1–M13" — itu penomoran pra-R3. Probe modal kini berisi 19 check (M1–M16 + M5b/RF4/PERR); expected smoke: **modal 19/19**, thumb 3/3.
- Hitungan yang diharapkan dari Task 5 + fix wave (verifikasi ulang, jangan reuse buta): suite 312/312; probe-iconify 48/48; thumb 3/3; offline 14/14; modal 19/19; 0 pageerror di semua probe.
- Server: reviewer Task 5 mencatat 9041/9042 sempat mati di antara run — cek dengan curl sebelum tiap probe, nyalakan ulang bila perlu (melayani `web/` working copy; untuk smoke, `web/` hasil ekstrak di 9043).
- JANGAN timpa `~/workspace/your_files/Geovanta-Iconify-ThumbFix.zip`; verifikasi SHA256-nya (`b5d7c714…`) sesudah pengemasan dan catat di laporan.
- JANGAN kirim ZIP ke user, JANGAN push ke GitHub. Serahkan ZIP + laporan ke koordinator (lewat laporan task ini).
- Backup `.bak-modal-t6` bila ada edit destruktif (tidak diharapkan ada edit produk di task ini — bila gate/probe menemukan cacat, laporkan sebagai temuan, jangan perbaiki diam-diam di luar brief).
