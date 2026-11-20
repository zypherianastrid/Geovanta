### Task 5: Probe end-to-end modal + regresi probe lama

**Files:**
- Create (lengkapi): `probes/probe-iconify-modal.cjs`
- Modify: `probes/probe-iconify.cjs`
- Test: semua probe Iconify

**Interfaces:**
- Consumes: semua hasil Task 1–4; pola relay CONNECT + `--ignore-certificate-errors` dari header `probe-iconify.cjs`.
- Produces: `probe-iconify-modal.cjs` lengkap (semua skenario M1–M13 di bawah, exit 0 bila semua lolos); `probe-iconify.cjs` tanpa P6.

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp probes/probe-iconify.cjs probes/probe-iconify.cjs.bak-modal-t5
```

- [ ] **Step 2: Lengkapi `probes/probe-iconify-modal.cjs`** (di atas M1–M9 dari Task 3–4):
  - `M10` tombol `V` (Select) saat modal terbuka TIDAK menutup modal dan TIDAK mengganti tool (guard `.ov` — tekan `V`, tunggu 500 ms, `ic-modal` masih visible, `aria-pressed` tombol Ikon masih `true`).
  - `M11` kategori memfilter dropdown koleksi (pilih kategori → opsi koleksi hanya dalam kategori itu) dan grid telusur (ikon pertama dalam grid berasal dari koleksi dalam kategori itu).
  - `M12` cari "home" dengan kategori aktif → semua ikon hasil berasal dari koleksi dalam kategori itu, dan `ic-count` = jumlah ikon terfilter yang tampil (bukan total API).
  - `M13` 0 pageerror selama seluruh probe modal.
  - Header probe mendokumentasikan cara jalan + port (pola `probe-iconify-thumb.cjs`: `PROBE_THUMB_URL`, serve `web/` di 9041).

- [ ] **Step 3: Perbarui `probes/probe-iconify.cjs`** — hapus P6 ("klik tool Select menutup panel") beserta penanda terkait; semua skenario lain (P0–P5, P7, T6, T8) dipertahankan apa adanya kecuali penyesuaian penanda panel bila mount baru mengubahnya — tiap perubahan dicatat di laporan dengan alasan. (T8-4 "Recolor + FindReplace stay open stacked alongside Iconify" tidak lagi relevan untuk modal — panel tidak lagi berdampingan di sidebar — hapus dengan alasan tertulis, bukan diam-diam.)

- [ ] **Step 4: Jalankan seluruh sweep probe (GREEN)**

Run (serve `web/` di 9041 dan 9042 sesuai header tiap probe):
```bash
PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-thumb.cjs
OFFLINE_URL=http://127.0.0.1:9042/ node probes/probe-iconify-offline.cjs
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```
Expected: probe-iconify (tanpa P6 + tanpa T8-4) semua lolos — sebutkan jumlah baru di laporan; thumb 3/3; offline 14/14; modal M1–M13 semua lolos; 0 pageerror di semua probe.

- [ ] **Step 5: `npm test` penuh tetap hijau**

Run: `npm test 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 6: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-5-report.md` (daftar skenario + hitungan tiap probe + perubahan P6/T8-4 dengan alasan).

