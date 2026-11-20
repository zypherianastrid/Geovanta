# Laporan — Fix thumbnail Iconify rusak (2026-11-15)

**Laporan user:** screenshot panel Ikon — seluruh thumbnail grid menampilkan
ikon gambar rusak (broken image), padahal ikon yang sudah disisip ke kanvas
(`iconamoon:arrow-bottom-left-4-square-light`) tampil normal.

**Skill yang dipakai:** `systematic-debugging` (4 fase) +
`browser_ui_fix_verification` (repro + ukur render nyata di browser asli).

## 1. Akar penyebab (terbukti, bukan dugaan)

`buildIconSvg()` di `src/renderer/iconifyClient.jsx` merakit:

```js
`<svg viewBox="0 0 ${width} ${height}">${entry.body}</svg>`
```

**tanpa `xmlns="http://www.w3.org/2000/svg"`**. String yang sama dipakai dua
jalur:

- Sisip ke kanvas — `VE.parseSVG(buildIconSvg(...))` — parse string langsung,
  tidak butuh xmlns → ikon di kanvas tampil normal (sesuai screenshot user).
- Thumbnail panel — `IconifyPanel.jsx:svgDataUri` → data URI
  `data:image/svg+xml,...` ke `<img>` — dokumen gambar SVG **wajib** punya
  xmlns; tanpanya Chromium gagal parse → `naturalWidth === 0` → ikon rusak.

Bukti pendukung: spike 1/2 (`probes/probe-iconify-spike1.cjs:240`,
`probe-iconify-spike2.cjs:277,302`) dan semua pemakaian `VE.parseSVG` lain di
`VectorEditor.jsx` sudah memakai xmlns — hanya `buildIconSvg` produksi yang
lupa. Unit test lama malah mengunci output salah itu sebagai ekspektasi
(`tests/iconify-client.test.cjs`, string persis tanpa xmlns).

Kenapa probe lama tidak menangkap: `probe-iconify.cjs` hanya menghitung
tombol grid + `visible`, tidak pernah mengukur `naturalWidth` `<img>`.

## 2. Reproduksi sebelum fix (browser asli, Chromium headless 1440×900)

- Terisolasi (`/tmp/repro-thumb.cjs`, ikon `mdi:home`): tanpa xmlns
  `naturalWidth = 0` (rusak); dengan xmlns `naturalWidth = 150` (render).
- Aplikasi dari build `web/` (ZIP user, SHA `f76e8d3a…` — identik dengan ZIP
  yang diserahkan): probe baru `probes/probe-iconify-thumb.cjs` →
  **THUMB-1 FAIL: browse 48 total, 0 ok, 48 rusak; THUMB-2 FAIL: cari
  "home" 38 total, 0 ok, 38 rusak; 0 pageerror.** Persis screenshot user.

## 3. Fix (satu perubahan, 1 baris + komentar)

- `src/renderer/iconifyClient.jsx` — `buildIconSvg`: tambah
  `xmlns="http://www.w3.org/2000/svg"` pada `<svg>` + komentar kenapa wajib
  (dua jalur pemakaian, rujukan probe regresi). Backup:
  `src/renderer/iconifyClient.jsx.bak-iconify-thumb` (tidak ikut ZIP).
- `tests/iconify-client.test.cjs` — ekspektasi string persis diperbarui ke
  output ber-xmlns + komentar. Backup:
  `tests/iconify-client.test.cjs.bak-iconify-thumb` (tidak ikut ZIP).
- Tidak ada perubahan jalur sisip, panel, CSS, atau perilaku lain.

## 4. Verifikasi sesudah fix (full gate)

- `npm test`: **300/300** (0 fail).
- `npm run build:web`: exit 0; bundle hasil build memuat template
  ber-xmlns (terverifikasi di `web/assets/geovanta.bundle.js`).
- Probe regresi baru `probes/probe-iconify-thumb.cjs` (mengukur
  `naturalWidth` tiap `<img>` di grid): **3/3 LOLOS — browse 48/48 ok,
  0 rusak; cari "home" 38/38 ok, 0 rusak; 0 pageerror.** Screenshot
  `probes/shots/iconify-thumb-browse.png` (sesudah fix) menunjukkan
  thumbnail Material Symbols tampil.
- `probes/probe-iconify.cjs`: **52/52 LOLOS** (alur sisip tidak berubah).
- `probes/probe-iconify-offline.cjs`: **14/14 LOLOS**.
- Smoke dari hasil ekstrak ZIP kandidat: probe thumbnail **3/3 LOLOS**
  (lihat §5).

## 5. ZIP final

- Path: `~/workspace/your_files/Geovanta-Iconify-ThumbFix.zip`
- Metode: zip langsung dari working copy per ruling R8 (inklusi sama seperti
  ZIP Iconify: `src/`, `web/`, `tests/`, `probes/`, `docs/`, `dist/`,
  `src-tauri/`, `.github/`, config/scripts; keluar: `node_modules/`,
  `*.bak*`). ZIP Iconify lama (`Geovanta-Iconify.zip`, SHA `f76e8d3a…`)
  TIDAK ditimpa.
- Delta vs ZIP Iconify (perbandingan CRC semua entri): **DIUBAH: 12 file**
  — 4 file produk (`src/renderer/iconifyClient.jsx`,
  `tests/iconify-client.test.cjs`, `web/assets/geovanta.bundle.js`,
  `dist/assets/geovanta.bundle.js` — bundle +40 byte vs 2.020.638
  pra-fix, dari penambahan xmlns; `web/` dan `dist/` md5 identik) +
  2 dokumen (`fix-wave-report.md`, `progress.md` — pembaruan pasca-ZIP
  lama, bukan dari fix ini) + 6 screenshot probe lama yang tertimpa
  ulang oleh re-run probe verifikasi (§4, nama sama, isi baru);
  **DITAMBAH: 5 file** (`thumb-fix-report.md` ini,
  `fix-wave-re-review.md` — ada di working copy tapi belum masuk ZIP lama,
  `probes/probe-iconify-thumb.cjs`, `probes/shots/iconify-thumb-browse.png`,
  `probes/shots/iconify-thumb-search.png`);
  **DIHAPUS: 0 file.** Total entri 510 → 515.

## 6. Batasan jujur

- Terukur di headless Chromium 1440×900 light, via relay proxy VM
  (+ `--ignore-certificate-errors` khusus probe). Launch Windows + GPU asli
  dan internet langsung di mesin user belum terukur — minta re-test user.
- Thumbnail monokrom (`fill="currentColor"`) tampil hitam di `<img>`
  (tidak ada konteks warna) — itu perilaku yang benar, bukan bug; warna
  aktif hanya diterapkan saat sisip ke kanvas.
