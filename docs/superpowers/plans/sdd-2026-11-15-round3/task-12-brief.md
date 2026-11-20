# Brief — Ronde 3, Task T12: Verifikasi akhir + ZIP final

- Plan: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` (§ T12)
- ZIP masukan (acuan inklusi): `~/workspace/user/files/Geovanta-Round2-UI-Fixes_1_h80o.zip`
  — SHA256 `c75e7a62e09e9410d4064752ad858d868c86be904d76475b56c985941d24bed7`,
  279 entri, 30.677.570 byte (uncompressed).
- ZIP keluaran: `~/workspace/your_files/Geovanta-Round3-UI-Fixes.zip`
  (JANGAN timpa ZIP Ronde 2).
- Suite baseline: `npm test` 277/277.

## Aturan inklusi ZIP (diturunkan controller dari ZIP masukan — verifikasi ulang)

ZIP masukan = snapshot penuh working copy KECUALI:
- `node_modules/` — 0 entri
- `.git/` — 0 entri
- `probes/` (termasuk `probes/shots/`) — 0 entri
- `*.bak*` — 0 entri
Termasuk: `src/` (142), `tests/` (50), `docs/` (33, termasuk
`docs/superpowers/plans/`), `web/` (8), `dist/` (7), `src-tauri/`,
`.github/`, `scripts/`, file root (`CHANGELOG.md`, `build-windows-64bit.bat`, …).

**Metode yang disarankan (bukan keharusan, asal hasilnya setara):**
ekstrak ZIP masukan ke dir temp → timpa dengan file working copy yang
berubah/ditambah (delta) → buang pola exclude di atas → zip ulang.
Hitung dan laporkan delta eksplisit: daftar file BERUBAH, DITAMBAH, dan
DIHAPUS vs ZIP masukan (bila ada yang dihapus, sebutkan — jangan diam-diam
menghilangkan file). File yang tak tersentuh HARUS byte-identik dengan ZIP
masukan (verifikasi dengan membandingkan hash per file bila memungkinkan).
`.bak-r3tN` / `.bak-r3t9f1` / `.bak-r3t10` / `.bak-r3t11` TIDAK ikut.
`probes/` TIDAK ikut (probe + screenshot tetap di working copy, bukan di ZIP).

## Langkah verifikasi (SEMUA dari run baru, build segar)

1. `npm run build:web` exit 0 — catat warning (harus 0 warning; bila ada
   warning, laporkan isinya, jangan disembunyikan).
2. `npm test` — harus 277/277 (atau N/N bila tes baru ditambahkan T1–T11 —
   hitung ulang dari hasil run, jangan warisi angka lama).
3. Jalankan ulang SEMUA probe baru T1–T11 (port segar milikmu, satu server
   untuk semua run bila memungkinkan) + regresi R2 (R2-T1 rail, R2-T3
   selsame, R2-T8 last-color, R2-T9 snap):
   - T1 7, T2 10, T3 7, T4 6, T5 10, T6 10, T7 6, T8 10 ID + 10 EN,
     T9 34, T10 15, T11 25 (angka dari laporan tiap task — VERIFIKASI ULANG
     dari output run, jangan salin angka laporan).
   - Total probe = jumlahkan dari addend-nya dan laporkan sebagai X/Y
     (pelajaran Ronde 2: total pernah salah karena memakai ulang angka
     unit test). Sebutkan NAMA tiap skenario yang gagal (bila ada).
   - 0 pageerror di semua run.
4. **Smoke test dari hasil EKSTRAK ZIP final** (bukan dari working copy):
   ekstrak ZIP final ke dir temp → sajikan `web/` → 6 cek smoke
   (aplikasi termuat, tanpa pageerror, inspector kanan tampil, + 1–2 cek
   fix Ronde 3, mis. ikon 5 tombol Mode Fill tampil + strip recent-colors
   max 10). Laporkan 6/6 atau sebutkan yang gagal.
5. **Perhatian artefak screenshot (sudah 2× terjadi):**
   - Probe R2-T8 menimpa `probes/shots/r2-t8-lastcolor-*.png` tiap run
     (hardcode path). Sesudah SEMUA run, pulihkan dari backup
     `/tmp/r2-t8-before.bak.png` + `/tmp/r2-t8-after.bak.png` dan verifikasi
     md5 = `93568db917da3dda61e315c39c947f25` (before) /
     `84edc85e59d1afe7f9b0177e6525f1bb` (after). Bila backup /tmp hilang,
     laporkan — JANGAN klaim artefak R2 utuh tanpa bukti md5.
   - Probe T11 menimpa `probes/shots/r3-t11-fill-before.png` tiap run
     dengan state pasca-fix. Sesudah SEMUA run, pulihkan dari salinan awet
     `probes/shots/r3-t11-fill-before-genuine.png` (md5 `a0bf12c0484fede45363aa4a837f8996`)
     dan verifikasi md5-nya.

## Keluaran

- ZIP final `~/workspace/your_files/Geovanta-Round3-UI-Fixes.zip` + catat:
  SHA256, jumlah entri, ukuran byte.
- Laporan `task-12-report.md` di folder sdd yang sama: semua angka run
  (per probe + total X/Y yang dihitung ulang), build (exit + warning),
  smoke 6/6 dari ekstrak ZIP, delta ZIP (berubah/ditambah/dihapus),
  SHA256 + entri + byte ZIP final, dan apa pun yang belum teruji.

## Aturan

- Skill (baca SKILL.md dulu): `verification-before-completion` (tidak ada
  klaim tanpa bukti perintah segar), `finishing-a-development-branch`
  (pola penyelesaian + verifikasi akhir — baca SKILL.md-nya).
- JANGAN spawn subagent/reviewer sendiri. JANGAN ubah scope.
- JANGAN timpa ZIP Ronde 2. JANGAN sertakan `.bak*` atau `probes/` di ZIP.
