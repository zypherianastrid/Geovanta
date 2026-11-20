# Brief — Ronde 3, Task T12 Fix Round 1 (laporan dalam ZIP tak lengkap + §9 keliru)

- Laporan T12: `docs/superpowers/plans/sdd-2026-11-15-round3/task-12-report.md`
- Review T12: verdict **Needs fixes** — 1 Important, 3 Minor.
- ZIP saat ini: `~/workspace/your_files/Geovanta-Round3-UI-Fixes.zip`
  (SHA256 `8d8cb4aa058390fe17dcd9984f5fbe33bc66f9ebf6a8287c6e40bfc775f92345`,
  365 entri, 12.004.024 byte — hash ini AKAN BERUBAH sesudah re-package;
  catat hash baru di laporan working copy + laporan akhir).

## Temuan Important (diverifikasi controller via diff langsung)

Salinan `task-12-report.md` DI DALAM ZIP (167 baris) vs working copy
(192 baris) berbeda jauh lebih dari satu baris SHA:
- §6 salinan ZIP hanya berisi placeholder SHA + catatan R2 tak ditimpa —
  hilang: jumlah entri, ukuran uncompressed/file, hitungan exclude,
  verifikasi pasca-pengemasan, re-verifikasi SHA R2 (baris 145–154
  working copy).
- §7 salinan ZIP hanya berisi baris
  `[PLACEHOLDER-SMOKE — diisi setelah smoke test dari ekstrak ZIP final.]`
  (baris 150) — seluruh hasil smoke 6/6 + S1–S6 HILANG.
- §9 (kedua salinan) mengklaim hanya placeholder SHA dan
  "Isi laporan selain baris itu identik" — klaim ini SALAH.

Placeholder SHA sendiri SAH (circular: file tak bisa memuat hash
container-nya sendiri) — yang salah adalah placeholder smoke yang tak
diungkap + klaim identik yang palsu.

## Perbaikan yang diminta (pilih jalur yang benar, bukan yang mudah)

**JANGAN** mempertahankan placeholder smoke dengan pengungkapan yang
diperbaiki — hasil smoke SUDAH diketahui sebelum ZIP dibuat (6/6, S1–S6),
jadi tidak ada alasan circular untuk §7. Yang benar:
1. Salinan laporan yang masuk ZIP = working copy, KECUALI baris §6 SHA256
   yang tetap placeholder (satu-satunya placeholder yang dibenarkan
   circular). Artinya: §7 salinan ZIP memuat hasil smoke ASLI (S1–S6 +
   catatan run pertama 5/6) — sama seperti working copy.
2. §9 di KEDUA salinan: ungkapkan TEPAT SATU placeholder (SHA §6) dan
   nyatakan eksplisit bahwa selain baris §6 itu, kedua salinan identik.
   Perbaiki juga rujukan silang: placeholder §6 harus merujuk "§9"
   (bukan "§7" — smoke test adalah §7).
3. Perbaiki Minor sekaligus:
   - M1: rujukan silang placeholder §6 → "§9".
   - M2: simpan skrip smoke ke working copy — salin
     `~/workspace/.t12-staging/smoke-t12.cjs` ke
     `probes/probe-r3-t12-smoke.cjs` (tambah header: skrip ini berjalan
     melawan hasil EKSTRAK ZIP final, URL via env — `probes/` dikecualikan
     dari ZIP oleh aturan brief, jadi aman). Perbarui kalimat di §7 laporan
     yang menyebut skrip "disimpan di staging, bukan di probes/" agar
     sesuai fakta baru.
   - M3: frasa durasi di §2 ("durasi 22.541 ms-satuan laporan:
     `duration_ms 22541`") → "durasi 22.541 ms (22,5 detik)".
   - M4: arsipkan log run mentah — simpan log verifikasi ronde ini
     (re-package + smoke dari ZIP baru + pemeriksaan integritas) di folder
     sdd yang sama (mis. `task-12-fix1-logs/`), dan sebutkan lokasinya di
     laporan.
4. Re-package ZIP final dari staging yang sama (metode T12: ekstrak ZIP
   masukan + overlay delta — hanya isi `task-12-report.md` yang berubah
   terhadap ZIP lama, jadi delta vs ZIP masukan tetap 12 berubah / 84
   ditambah / 0 dihapus / 229 identik; verifikasi ulang dengan perbandingan
   hash per file).
5. Hitung SHA256 ZIP BARU, tulis ke §6 laporan WORKING COPY (bukan salinan
   ZIP), dan laporkan nilainya. JANGAN timpa ZIP Ronde 2.

## Verifikasi fix round (wajib, dari run baru)

- Ekstrak ZIP BARU ke staging terpisah → bandingkan hash per file dengan
  ZIP masukan (harus tetap 12/84/0/229) → baca salinan laporan DI DALAM
  ZIP: §6 = placeholder SHA saja, §7 = hasil smoke asli lengkap,
  §9 = pengungkapan satu placeholder yang akurat.
- Smoke 6/6 dari hasil EKSTRAK ZIP BARU (pakai skrip yang kini tersimpan
  di `probes/probe-r3-t12-smoke.cjs`), 0 pageerror — simpan log-nya.
- Pola exclude di ZIP baru: 0 `node_modules/` / `.git/` / `probes/` /
  `*.bak*`. ZIP Ronde 2 tetap `c75e7a62…` (verifikasi ulang).
- Tulis laporan `task-12-fix1-report.md` di folder sdd yang sama: apa yang
  diubah (file:baris), SHA256 ZIP lama → baru, bukti verifikasi (hash delta
  + isi laporan dalam ZIP + smoke 6/6 dari ZIP baru + log), dan apa pun yang
  belum teruji.

## Aturan

- Skill (baca SKILL.md dulu): `verification-before-completion` (klaim hanya
  dari run baru).
- JANGAN spawn subagent/reviewer sendiri. JANGAN ubah scope (tidak ada
  perubahan produk — hanya laporan + pengemasan ulang).
- Perhatian artefak: JANGAN menjalankan probe R2-T8/T11 dalam ronde ini
  (tidak diperlukan) — bila terpaksa menjalankan probe apa pun yang menimpa
  screenshot, pulihkan artefak + verifikasi md5 sesudahnya
  (R2-T8 `93568db9…`/`84edc85e…`, T11-before `a0bf12c0…`).
