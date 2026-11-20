# Task 8 report — Ronde 2: Investigasi bug "warna terakhir tidak berfungsi"

**Status: DONE_WITH_CONCERNS** — investigasi sistematis (systematic-debugging Fase 1) +
probe Playwright baru membuktikan **TIDAK ADA satu pun kandidat (a)–(d) yang gagal**.
Fix loop ronde 1 (lihat §7) menutup dua celah cakupan dari review — probe kini
**22/22**, concerns §6 (3) dan (4) teratasi; status tetap DONE_WITH_CONCERNS
karena concern §6 (1) — laporan user belum terpetakan — masih terbuka.
Sesuai brief Step 2: task ditutup dengan laporan bukti lengkap + **TANPA edit
spekulatif** (TANPA EDIT, tanpa backup `.bak-t8`). Controller memutuskan langkah
berikut bersama user (kemungkinan besar laporan user merujuk ke perilaku lain
yang belum terpetakan — lihat Concerns).

- Working copy: `/home/hatch/workspace/geovanta-round2/` (bukan repo git).
- Probe: `probes/probe-r2-t8-last-color.cjs` (4 fase, tiap fase proyek baru via reload).
- Server: `http://127.0.0.1:8931/` (server statis sisa T2 yang menyajikan `web/`,
  dipakai ulang; tidak perlu rebuild — `web/` sudah hasil build T7).
- Baseline sebelum kerja: `npm test` 277/277 PASS (dijalankan segar 22:32 WIB).
- Skill yang dipakai: `systematic-debugging` (reproduksi + bukti angka dulu),
  `test-driven-development` (probe = RED yang harus gagal bila bug ada),
  `verification-before-completion` (klaim hanya dari run segar).

## 1. Tabel reproduksi per kandidat

Seed prefs (via `addInitScript`, pola probe T1–T7): `recentColors`
`['#ff0000', '#00ff00', '#0000ff']`, accent `#0d99ff`, lang `id`.

| # | Kandidat | Cara uji (probe) | Hasil terukur | Verdict |
|---|----------|------------------|---------------|---------|
| A-pertama | Swatch recent pertama (`#ff0000`) | Klik `button[data-color="#ff0000"]`, tunggu fill == `#FF0000` | fill `#0D99FF` → `#FF0000` | LOLOS |
| A-tengah | Swatch recent tengah (`#00ff00`) | Klik, tunggu fill == `#00FF00` | fill → `#00FF00` | LOLOS |
| A-terakhir | Swatch recent terakhir (`#0000ff`) | Klik, tunggu fill == `#0000FF` | fill → `#0000FF` | LOLOS |
| B1 | ColorField baris TERAKHIR Selection colors | Baris terakhir = Stroke `#064573`; ketik `FF00FF` di hex popover ColorField | baris terakhir `#064573` → `#FF00FF` | LOLOS |
| B2 | Tombol ◎ baris TERAKHIR | Klik ◎ baris terakhir | toast `1 objek #FF00FF dipilih`; fill tetap `#0000FF` | LOLOS |
| C2-red | Override warna terakhir keluarga red (`#FF0000`) | Klik swatch → ColorText override `#abcdef` | mapped → `#ABCDEF`, count `1 warna akan berubah` (kumulatif) | LOLOS |
| C2-green | Override warna terakhir keluarga green (`#00AA00`) | Sama | mapped → `#ABCDEF`, count `2 warna akan berubah` (kumulatif) | LOLOS |
| C2-cyan | Override warna terakhir keluarga cyan (`#064573`, stroke ×3 objek) | Sama | mapped → `#ABCDEF`, count `5 warna akan berubah` (kumulatif) | LOLOS |
| C2-indigo | Override warna terakhir keluarga indigo (`#0000FF`) | Sama | mapped → `#ABCDEF`, count `6 warna akan berubah` (kumulatif) | LOLOS |
| C3-indigo | Target keluarga TERAKHIR (indigo) | Hapus override dulu (lihat §2), lalu ColorText target `#00ffff` | mapped `#0000FF` → `#00FFFF`, count `6 warna akan berubah` (kumulatif) | LOLOS |
| C4 | Apply Mode 2 (end-to-end) | Klik Terapkan | Selection colors `#ABCDEF` Fill·2 + `#ABCDEF` Stroke·3 + `#00FFFF` Fill·1; toast `6 warna diubah` | LOLOS |
| D1 | ColorField warna drop-shadow | Tambah drop shadow → ketik `FF8800` di hex popover | label hex `#000000` → `#FF8800` | LOLOS |
| D2 | Drop-shadow bertahan + fill tak berubah | Buka ulang popover, baca kotak hex | kotak hex `FF8800`, fill tetap `#0D99FF` | LOLOS |

Angka probe (dihitung ulang dari addend): **19/19 lolos** (A0 + 3×A + B0 + B1 + B2 +
C0 + C1 + 4×C2 + C3 + C4 + D0 + D1 + D2 + E0 = 1+3+3+2+4+1+1+3+1 = 19),
**0 pageerror** (E0). Catatan M-1 (review): angka count pada baris C2/C3 di atas
bersifat **kumulatif dokumen keseluruhan** (`rc-count` memakai `changed` dari
`paletteMapDoc` untuk seluruh dokumen), bukan kontribusi keluarga itu sendiri —
green sendiri hanya 1 warna, dst. Bukti per-keluarga yang sesungguhnya adalah
`mapped === '#ABCDEF'`. Sesudah fix loop ronde 1: **22/22** — lihat §7. Detail setup fase C: 3 elips fill `#FF0000` / `#00AA00` /
`#0000FF` + stroke bersama `#064573` (×3 objek) → keluarga Mode 2:
red `[#FF0000]`, green `[#00AA00]`, cyan `[#064573]`, indigo `[#0000FF]`
(urutan `hueFamilyGroup`: indeks `FAMILY_NAMES`, gray terakhir).

## 2. Satu-satunya "gagal" yang muncul — artefak desain probe, BUKAN bug

Run pertama probe: **18/19** — `C3-indigo` FAIL:
`mapped #0000FF: #ABCDEF -> #ABCDEF`. Analisis (systematic-debugging Fase 2/3):
C2 sudah meng-override `#0000FF` → `#ABCDEF`, dan `mappedHexFor`
(`RecolorSection.jsx`) + `paletteMapDoc` (`recolorEngine.jsx`) mendahulukan
override atas target keluarga — jadi target `#00FFFF` **benar** tidak mengubah
mapped selama override aktif. Ekspektasi probe yang salah, bukan kode.
Perbaikan probe (bukan perbaikan produk): C3 kini menghapus dulu override
warna itu (tombol × `rcRemoveOverride`, lalu verifikasi mapped kembali bersih
`#0000FF`), baru menyetel target `#00FFFF`. Re-run penuh probe: **19/19 LOLOS**,
termasuk `C3-indigo` (`bersih=#0000FF -> sesudah target=#00FFFF`).
Tidak ada perubahan kode produk dalam langkah ini — hanya koreksi asersi probe.

## 3. RED → GREEN

Tidak ada siklus RED→GREEN produk: probe Step 1 (yang dirancang sebagai RED
bila bug ada) **tidak pernah merah karena bug** — satu-satunya merah adalah
artefak asersi di atas, yang hijau sesudah koreksi probe. Karena tidak ada
kandidat yang terbukti gagal, tidak ada fix, sesuai larangan edit spekulatif
di brief. Hipotesis yang sempat dipertimbangkan dan gugur oleh bukti:
- recent-colors terakhir tidak terklik karena `disabled` / urutan seed —
  gugur: strip menampilkan persis 3 seed, semua `disabled: false`, klik
  terakhir mengubah fill ke `#0000FF`.
- baris terakhir Selection colors terpotong / ColorField-nya mati —
  gugur: B1 mengubah stroke `#064573` → `#FF00FF`; B2 toast persis.
- override/target warna terakhir keluarga Mode 2 tidak diterapkan —
  gugur: C2 (4 keluarga) + C3 + C4 Apply ter-commit (`6 warna diubah`).
- warna drop-shadow tidak tersimpan —
  gugur: D1 mengubah label ke `#FF8800`, D2 bertahan saat popover dibuka ulang.

## 4. Diff

**TANPA EDIT.** Tidak ada file sumber yang diubah; tidak ada backup `.bak-t8`
(0 file `*.bak-t8` di working copy — diverifikasi dengan `find`).
File baru yang dibuat task ini (bukan edit produk):
- `probes/probe-r2-t8-last-color.cjs` (probe investigasi, 19 asersi).
- `probes/shots/r2-t8-lastcolor-before.png` (fase A, inspector + recent-colors).
- `probes/shots/r2-t8-lastcolor-after.png` (akhir fase D, seksi Effects +
  drop-shadow `#FF8800`).
- Laporan ini (`docs/superpowers/plans/sdd-2026-11-14-round2/task-8-report.md`).

Hasil T4 (RecolorSection restyle) dan T7 (Effects) **tidak disentuh**.

## 5. Regresi (run segar, sesudah probe)

| Pemeriksaan | Hasil |
|-------------|-------|
| `npm test` (penuh) | **277/277 PASS, 0 fail** |
| Probe T3 Selection Colors (`probe-r2-t3-selsame-buttons.cjs before`) | **11/11 lolos** |
| Probe T4 Recolor layout (`R2_T4_URL=http://127.0.0.1:8931/ ... before`) | **10/10 lolos** |
| Probe T6 Color Styles (`probe-r2-t6-color-styles.cjs before`) | **11/11 lolos** |
| Probe T7 Effects (`probe-r2-t7-effects-button.cjs before`) | **9/9 lolos** |
| Probe T8 (run ke-2, final) | **19/19 lolos, 0 pageerror** |
| Probe T8 fix loop ronde 1 (final, lihat §7) | **22/22 lolos, 0 pageerror** |

Catatan: probe T4 default-nya mengarah ke port 8944 (tidak ada server) sehingga
run pertama gagal koneksi — bukan kegagalan produk; diulang dengan
`R2_T4_URL=http://127.0.0.1:8931/` → 10/10. Re-run regresi T3/T4/T6/T7 dengan
mode `before` menimpa screenshot `-before.png` mereka dengan hasil segar
(yang isinya sama, mode yang sama) — efek samping pencatatan, bukan perubahan
produk.

## 6. Concerns / hal yang belum terverifikasi

1. **Laporan user belum terpetakan.** Semua kandidat yang disebut di brief
   berfungsi di build ini. Kemungkinan yang tersisa (perlu klarifikasi user /
   langkah reproduksi persis dari user): (a) "warna terakhir" merujuk ke
   tempat lain yang tidak ada di brief — mis. warna terakhir di ColorField
   lain (Fill/Stroke utama, gradient stop, Find & Replace, Text), swatch
   Color Styles, atau warna terakhir di panel kiri (Pen fill/stroke);
   (b) kondisi pemicu spesifik — mis. objek terkunci, objek ber-gradient,
   teks, frame, atau warna dengan alpha/`none`; (c) urutan langkah tertentu
   (mis. sesudah Undo, sesudah Apply Recolor, atau di dokumen dari ZIP ronde
   lalu, bukan proyek baru headless); (d) masalah visual di layar user
   (mis. swatch terakhir tertutup/terpotong di viewport/zoom tertentu) yang
   tidak tertangkap probe 1440×900 ini.
2. **Cakupan probe terbatas pada klik + nilai hex.** Warna drop-shadow
   diverifikasi lewat label hex + nilai yang bertahan di popover, BUKAN lewat
   piksel bayangan di canvas (render bayangan tidak diukur). Recolor Mode 2
   diverifikasi sampai commit dokumen (Selection colors + toast), bukan
   sampai piksel SVG hasil ekspor.
3. **Keluarga gray tidak diuji sebagai "terakhir".** Dalam setup ini keluarga
   terakhir adalah indigo; gray (tanpa kontrol target, Ruling O) tidak muncul
   karena tidak ada warna akromatik di dokumen uji. Override warna gray tetap
   dimungkinkan per spec, tapi tidak tercakup probe ini.
   **TERATASI di fix loop ronde 1 (§7):** elips `#808080` ditambahkan, override
   gray → `#ABCDEF` lolos (C2-gray), dan ketiadaan kontrol target gray dibuktikan
   lewat asersi (C3-gray), bukan skip buta.
4. **Satu warna per keluarga di setup ini.** Tiap keluarga Mode 2 hanya punya
   1 warna, jadi "warna terakhir" == "warna satu-satunya" di keluarga itu.
   Kasus keluarga multi-warna (urutan terang→gelap, warna terakhir = paling
   gelap) teruji strukturnya sama (indeks terakhir DOM), tapi tidak dengan
   2+ warna dalam satu keluarga.
   **TERATASI di fix loop ronde 1 (§7):** keluarga red berisi 2 warna
   (`#FF0000` terang, `#CC0000` gelap = terakhir); override `#CC0000` lolos
   (C2-red) dan `readMapped` yang diperbaiki dibuktikan tidak salah baca
   (C2-red-first).
5. **Tidak ada interaksi keyboard/aksesibilitas** yang diuji untuk kandidat
   ini (hanya klik + ketik hex); dan tidak ada pengujian di lebar viewport
   lain (hanya 1440×900, desktop ≥1280 sesuai keputusan ronde 2).

## 7. Fix loop ronde 1 — penutupan temuan review I-1 dan I-2 (probe saja)

Verdict review T8: "With fixes" (2 Important, keduanya perbaikan probe saja).
Fix loop ini menjalankan rekomendasi review §5 tanpa satu pun edit produk
(TANPA EDIT produk, tanpa backup `.bak-t8` — 0 file `*.bak-t8` di working copy).
Skill yang dipakai: `systematic-debugging`, `test-driven-development`,
`verification-before-completion`. Server sama: `http://127.0.0.1:8931/`.

### Yang diubah (hanya probe + laporan)

- `probes/probe-r2-t8-last-color.cjs`:
  - **I-1:** fase C memakai 5 elips (tambah fill `#808080` di kolom kedua).
  - **I-2:** tambah elips fill `#CC0000` (red kedua); `readMapped` diperbaiki —
    dulu mengambil `sibs[sibs.length-1]` (mapped swatch terakhir seluruh
    kontainer keluarga), kini `btn.closest('span').querySelector('span.swatch')`
    (mapped swatch milik entry-span hex yang ditanyakan — struktur DOM:
    tiap entri adalah `<span>` berisi tombol swatch asal + `<span class="swatch">`
    mapped, `RecolorSection.jsx:292`).
  - C0/C1 diperketat (5 elips, ≥6 baris; tepat 5 keluarga, red 2 warna,
    gray terakhir); C3 ditulis ulang — gray diasersi tanpa kontrol target
    (bukan skip buta), target diuji pada keluarga terakhir *bertarget*
    (indigo), dengan klik pembuka editor override dulu (sesudah loop C2,
    `overrideFor` adalah warna gray, jadi editor override indigo tertutup —
    tanpa klik ini override lama menutupi target); C4 diperketat ke hitungan
    slot eksak (lihat tabel di bawah).
  - Label log `info sel-col rows (fase C, 3 objek)` dikoreksi menjadi 5 objek.
- Laporan ini (§1, §5, §6, dan seksi ini).

### Bukti RED → GREEN (TDD) untuk perbaikan `readMapped`

Run pertama probe yang diperluas — dengan `readMapped` LAMA — menghasilkan
**21/22, satu-satunya gagal `C2-red-first`**: `mapped #FF0000=#ABCDEF`
(seharusnya `#FF0000`). Ini membuktikan helper lama memang salah baca begitu
satu keluarga berisi 2 warna: ia mengembalikan mapped warna terakhir keluarga
(`#CC0000` → `#ABCDEF`), bukan mapped hex yang ditanyakan. Sesudah perbaikan
`readMapped`, re-run penuh: **22/22 LOLOS, 0 pageerror, exit 0** — termasuk
`C2-red-first` (`mapped #FF0000=#FF0000`).

### Hasil asersi baru (run final 22/22)

Setup fase C final: 5 elips fill `#FF0000` / `#00AA00` / `#0000FF` / `#808080` /
`#CC0000` + stroke bersama `#064573` (×5 objek) → keluarga Mode 2:
red `[#FF0000, #CC0000]`, green `[#00AA00]`, cyan `[#064573]`, indigo `[#0000FF]`,
gray `[#808080]` (urutan terang→gelap di red terkonfirmasi: `#FF0000` dulu,
`#CC0000` terakhir = paling gelap).

| # | Asersi baru | Hasil terukur | Verdict |
|---|-------------|---------------|---------|
| C1 | 5 keluarga, red 2 warna, gray terakhir | `red:[#FF0000,#CC0000], green:[#00AA00], cyan:[#064573], indigo:[#0000FF], gray:[#808080]` | LOLOS |
| C2-red | Override warna terakhir red (`#CC0000`) → `#ABCDEF` | mapped `#ABCDEF`, count kumulatif `1 warna akan berubah` | LOLOS |
| C2-red-first | Override `#CC0000` TIDAK mengubah mapped `#FF0000` | mapped `#FF0000=#FF0000` | LOLOS |
| C2-gray | Override warna terakhir gray (`#808080`) → `#ABCDEF` | mapped `#ABCDEF`, count kumulatif `9 warna akan berubah` | LOLOS |
| C3-gray | Gray (keluarga terakhir) memang tanpa kontrol target | `addBtn=false, tgtBox=false` | LOLOS |
| C3-indigo | Target keluarga terakhir bertarget (indigo) → `#00FFFF` | bersih `#0000FF` → sesudah target `#00FFFF`, count kumulatif `9 warna akan berubah` | LOLOS |
| C4 | Apply meng-commit (9 slot) | `#ABCDEF` Fill·3 + Stroke·5, `#00FFFF` Fill·1, toast `9 warna diubah` | LOLOS |

Angka probe final (dihitung ulang dari addend): **22/22 lolos** (A0 + 3×A +
B0 + B1 + B2 + C0 + C1 + 5×C2 + C2-red-first + C3-gray + C3-indigo + C4 +
D0 + D1 + D2 + E0 = 1+3+3+2+5+1+2+1+3+1 = 22), **0 pageerror**. Hitungan
kumulatif C2: red 1, green 2, cyan 7 (stroke ×5 objek), indigo 8, gray 9 —
konsisten dengan per-slot (Ruling K). C4: 9 slot = fill `#CC0000`/`#00AA00`/
`#808080` → `#ABCDEF` (3) + stroke `#064573` ×5 → `#ABCDEF` (5) + fill
`#0000FF` → `#00FFFF` (1); `#FF0000` tak berubah (red tanpa target, tanpa
override) — terkonfirmasi di baris Selection colors sesudah Apply.

### Disposisi temuan Minor review

- **M-1 (count C2 kumulatif):** diperbaiki redaksinya — tabel §1 ditandai
  "(kumulatif)" per baris C2/C3 dan penjelasannya ditambahkan di bawah tabel.
- **M-2 (kutipan `replaceSelectionColor`):** diverifikasi — laporan ini ternyata
  **tidak pernah** mengutip baris itu (grep: 0 hasil untuk `8146`/`8169` di
  laporan); kutipan `:8146` yang salah ada di `task-8-brief.md:15,29`, bukan di
  laporan, jadi tidak ada yang perlu dikoreksi di sini. Lokasi benar
  terverifikasi: `VectorEditor.jsx:8169` (grep langsung).
- **M-3 (recents cap-10/eviksi):** TIDAK dilakukan — sesuai izin brief ("bila
  tidak menambah risiko"). Alasan: memperluas seed fase A dari 3 menjadi 11
  warna mengubah asersi A0/A- yang sudah hijau dan memerlukan semantik urutan
  `rememberRecentColor` (eviksi ujung mana) yang belum dipetakan; itu
  investigasi terpisah, bukan bagian dari perilaku "warna terakhir" (a)–(d).
  Tetap terbuka sebagai pelengkap.

### Regresi sesudah fix loop

| Pemeriksaan | Hasil |
|-------------|-------|
| `npm test` (penuh, segar) | **277/277 PASS, 0 fail**, exit 0 |
| Probe T8 (run final fix loop) | **22/22 lolos, 0 pageerror**, exit 0 |

Tidak ada edit produk sehingga regresi T3/T4/T6/T7 tidak diulang (vakum —
sama seperti penilaian reviewer; area T7 tercakup ulang oleh D0–D2 di run
T8 sendiri).

### Screenshot

Fase D tidak berubah (drop-shadow `#FF8800` sama), jadi
`probes/shots/r2-t8-lastcolor-after.png` yang ditulis ulang probe berisi
tampilan akhir yang setara dengan run sebelumnya; `...-before.png` (fase A)
juga setara (fase A tak disentuh). Tidak ada perubahan tampilan yang perlu
dibuktikan ulang dengan screenshot baru.

### Status akhir

**DONE_WITH_CONCERNS** dipertahankan — kini dengan bukti lengkap untuk scope
(c): override + target warna terakhir tiap keluarga Mode 2, termasuk keluarga
gray (terakhir) dan keluarga multi-warna (red 2 warna), tanpa satu pun edit
produk. Concern yang tersisa adalah §6 (1): laporan user belum terpetakan ke
satu pun kandidat (a)–(d); butuh langkah reproduksi persis dari user.
