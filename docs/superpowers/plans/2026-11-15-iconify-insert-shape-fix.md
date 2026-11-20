# Fix: ikon tersisip bentuknya berbeda dari thumbnail (Iconify)

**Laporan user:** 2026-11-15 20:58 WIB — "perbaiki bug saat insert ikon, malah ikon yang di insert tidak sama dengan yang ada di tab ikon, bentuknya berbeda".
**ZIP sumber:** `Geovanta-TypeScript-Migration_1_cu3h.zip` (SHA256 identik dengan ZIP migrasi TS yang diserahkan, `ddf7e00b…`) — bug ada di kode hasil migrasi, bukan file baru.
**Klasifikasi:** Sedang, rekomendasi 45–60 menit. Selesai dalam rekomendasi (mulai 20:58 WIB).
**Skill:** `systematic-debugging` (Fase 1–4), `browser_ui_fix_verification`, `project-difficulty-deadline`.

## Akar masalah (terbukti, bukan dugaan)

Thumbnail di tab/modal merender body SVG ikon apa adanya sebagai `<img>`.
Jalur sisip yang benar (`VE.parseSVG`) menjaga **1 objek per `<path>`** dengan
SEMUA subpath + `fillRule`-nya; renderer CanvasKit memakai fillRule itu
(`FillType.EvenOdd`/`Winding`) sehingga lubang tetap transparan — sama
seperti thumbnail.

Edit Gemini di `onIconifyInsert` (`src/components/editor/VectorEditor.tsx`,
tidak ada di versi Round-2 yang sudah direview) menambah ~155 baris logika
"pisah compound path":

- satu `<path>` dipecah jadi banyak objek berdasar heuristik
  bbox-containment (bukan containment geometris),
- subpath yang dianggap "cutout" dipaksa fill `#ffffff`,
- `VE.simplifySubpath(s, 0.04)` dijalankan per subpath,
- urutan gambar (z-order) disusun ulang (kontainer dulu),
- ditambah objek `frameBg` transparan (fill `none`) per sisipan.

Akibatnya lubang terisi putih, bagian ikon yang terlihat bisa memutih /
hilang, dan 1 ikon jadi 3–4 objek — bentuk tersisip berbeda dari thumbnail.

## Bukti repro (browser asli, layanan Iconify asli)

Probe baru `probes/probe-iconify-insert-shape.cjs` — ikon uji
`mdi:account-circle`, body asli dari `api.iconify.design/mdi.json`:
1 `<path>`, 3 subpath (bahu + kepala + lingkaran luar; lingkaran luar
diawali `m` relatif), tanpa `fill-rule="evenodd"` (lubang via winding).
Latar merah dimuat di belakang ikon (`loadTestSvg`) supaya lubang yang
transparan terbukti lewat piksel.

| Sebelum fix (RED) | Sesudah fix (GREEN) |
|---|---|
| 4 objek baru: frameBg + cakram `#0000ff` + **2× `#ffffff`** | **1 objek**: fill `#0000ff`, **3 subs**, 15 nodes |
| Titik kepala (lubang) = `[255,255,255]` putih | Titik kepala = `[255,0,0]` **merah** (lubang transparan) |
| Titik cakram = `[53,0,202]` | Titik cakram = `[0,0,255]` |
| `mdi:home` (kontrol) = 2 objek, fill pertama `none` | `mdi:home` = **1 objek**, fill `#0000ff` |

Probe: **9/14 → 14/14 lolos** (`PROBE-ICONIFY-INSERT-SHAPE: 14/14`).

## Perbaikan (1 fix, di akar masalah)

`src/components/editor/VectorEditor.tsx` — `onIconifyInsert` (9296 → 9149
baris, −147): hapus seluruh blok split/simplify/frameBg, pulihkan pemetaan
Round-2: `parsed.objects.map(...)` → recolor (monokrom ikut Fill/Stroke
aktif, palette dipertahankan) → `VE.scaleObj` → `VE.translate` → commit
tanpa frameBg. Posisi berjejer Gemini (gap 16, `existingFrames`) TIDAK
diubah — itu posisi, bukan bentuk, dan diminta user (item 6).
Backup: `VectorEditor.tsx.bak-iconify-insert-shape` (tidak ikut ZIP).

`tests/iconify-features.test.cjs` — tes 5 & 6 lama mengikat perilaku edit
Gemini (Frame + pisah objek + simplify) sehingga gagal sesudah fix; tes
diubah mengikat perilaku benar (1 objek per `<path>`, tanpa split, tanpa
frameBg, tanpa cutout putih; baris berjejer tetap). Tes 10 (utilitas
`simplifySubpath` sendiri) tidak diubah.
Backup: `tests/iconify-features.test.cjs.bak-iconify-insert-shape`.

`probes/probe-iconify.cjs` — T6-6 memakai tombol "Muat lagi"
(`ic-load-more`) yang sudah dihapus Ronde 2 (0 kemunculan di `src`);
diganti pagination halaman 2–4 (indeks 268, `PAGE_SIZE` 150).
Backup: `probes/probe-iconify.cjs.bak-iconify-insert-shape`.

## Verifikasi akhir (sesudah fix)

- `npm test`: **324/324, 0 fail** (24 dtk)
- `npm run build:web`: exit 0, bundle `2.032.312 B`, md5 web = dist
  (`1fc02a74…`)
- `tsc --noEmit`: **1.416 error** (sebelum fix 1.417 — berkurang 1, tanpa
  error baru; ketat menyusul seperti rencana migrasi)
- Probe sweep (browser asli, layanan Iconify asli):
  - `probe-iconify-insert-shape`: **14/14**
  - `probe-iconify`: **47/48** — T6-1…T6-8 semua lolos (termasuk T6-1a
    1 objek, T6-6 multi-elemen sesudah perbaikan pagination)
  - `probe-iconify-thumb`: **3/3**
  - `probe-iconify-modal`: **10/12**
  - `probe-iconify-offline`: 2 lolos + error di langkah recent
- Smoke dari ekstrak ZIP: probe insert-shape **14/14** dari folder ekstrak
  segar (lihat bawah).

## Yang TETAP TERBUKA — bukan dari fix ini (pra-ada, butuh keputusan user)

Semua di bawah ini gagal dengan cara yang sama sebelum fix (tidak
disentuh perubahan ini; penyebabnya konflik antara permintaan Gemini
item 1–10 dengan probe lama yang sudah direview):

1. **T8-2b0** (`probe-iconify`, 47/48): asersi "browse mode tidak
   menampilkan hitungan (ic-count)" — tapi kode panel yang dikirim
   memang menampilkan hitungan di browse (`browseNames.length`).
   Pilihan: sembunyikan hitungan di browse, atau ubah asersi.
2. **M6/M8** (`probe-iconify-modal`, 10/12): asersi cascade lama
   (+24,+24 diagonal) — perilaku sekarang berjejer (+112,0), sesuai
   permintaan user item 6 (Gemini). Pilihan: terima berjejer dan ubah
   probe, atau kembali ke cascade.
3. **Recent / "Terakhir dipakai"** (modal probe PROBE ERROR +
   offline T7-4a): probe mengharapkan baris recent `ic-recent-*`,
   tapi edit Gemini menghapusnya (item 3). Pilihan: kembalikan recent,
   atau ubah probe.

## Batasan jujur

Headless Chromium 1440×900 light; Windows/GPU asli belum terukur.
Repro memakai jaringan ke Iconify (CDN/API) lewat relay proxy VM.
Deadline final tidak dipilih user (opsi 30/45/60 menit ditawarkan
20:58 WIB, belum dijawab saat eksekusi — dikerjakan dalam rekomendasi
45–60 menit).
