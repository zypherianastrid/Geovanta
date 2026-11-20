# Desain: 16 Fitur Node & Bézier di Dropdown Floating Bar

> Status: **menunggu persetujuan user** (sesuai skill brainstorming — belum ada kode yang ditulis).

## Maksud

Semua 16 fitur node/path yang diminta user bisa diakses dari **dropdown alat Node & Bézier di floating bar** (`nodeGrp`, grup pertama di floating bar bawah kanvas). Yang sudah ada di dropdown itu dilewati; yang belum ada ditambahkan.

## Hasil audit (dibaca dari kode asli, bukan ingatan)

Dropdown `nodeGrp` hari ini hanya berisi **4 alat**: `node` (Edit Node), `addnode` (Tambah Node), `addhandle` (Tambah Handle), `autohandle` (Auto Handle). Sisanya tersebar: sebagian ada di rail kiri (`pathGrp`), sebagian di dropdown Boolean, sebagian hanya sebagai engine tanpa entri UI.

| # | Fitur | Keadaan hari ini | Keputusan |
|---|---|---|---|
| 1 | Add Node | Alat `addnode` sudah di dropdown | **Lewati** |
| 2 | Delete Node | Engine `deleteNodes` + rail `veDelNode` + tombol Delete ada; belum di dropdown | Tambah entri → handler `delSel` yang sudah ada |
| 3 | Move Node | Itulah alat `node` sendiri (seret node bebas) | **Lewati** (alat `node` = Move Node) |
| 4 | Smooth Node | Engine `smoothSelectedNodes` + rail `veTypeSmooth`/`veSmoothTb` ada | Tambah entri → `applyType('smooth')` |
| 5 | Corner Node | Engine `typeNodes('corner')` + rail `veTypeCorner` ada | Tambah entri → `applyType('corner')` |
| 6 | Symmetric Node | Engine `typeNodes('symmetric')` + rail `veTypeSym` ada | Tambah entri → `applyType('symmetric')` |
| 7 | Auto Smooth | Engine `autoHandles` (Catmull-Rom) ada; alat `autohandle` ada sebagai mode, tapi belum ada aksi satu-klik "haluskan node terpilih" | Tambah entri baru → `autoHandles` mode Catmull-Rom pada node terpilih (posisi node tidak bergerak, hanya handle dihitung ulang) |
| 8 | Break Handles | Engine `mirrorNodes(..., 'freeCurve')` + dropdown Mirror di floating bar ada | Tambah entri → `applyMirror('freeCurve')` |
| 9 | Join Nodes | **Tidak ada** di mana pun | **Engine baru**: gabung 2 node terpilih jadi satu (atau sambung 2 ujung terbuka) |
| 10 | Split Path | **Tidak ada** di mana pun | **Engine baru**: belah subpath di node terpilih jadi 2 subpath |
| 11 | Close/Open Path | Engine `setClosed` + rail `veClose`/`veOpen` ada | Tambah 2 entri → `setClosed(true/false)` |
| 12 | Reverse Path | **Tidak ada** di mana pun | **Engine baru**: balik urutan node subpath (+ tukar handleIn/handleOut) |
| 13 | Simplify Path | Alat `simplify` + strip sudah ada di grup Geometri | Tambah entri → `openVcSimplify` yang sama |
| 14 | Convert to Curves | Bentuk di Geovanta **sudah** path Bézier (`makeShape` mem-parse SVG path jadi `subs`/node). Yang belum ada: mengubah segmen lurus jadi segmen kurva | **Tafsir (bisa dikoreksi)**: entri baru → `autoHandles` mode preserveShape — setiap segmen lurus mendapat handle Bézier 1/3–2/3 tanpa mengubah bentuk, jadi tepi bentuk bisa dilengkungkan. Bukan "Ubah ke Path" untuk teks (itu sudah ada) |
| 15 | Outline Stroke | Sudah ada di dropdown Boolean + menu konteks + Ctrl+Alt+O | Tambah entri → `applyOutlineStroke` yang sama |
| 16 | Offset Path | Sudah ada di dropdown Boolean + strip | Tambah entri → `openOffsetStrip` yang sama |

## Pendekatan (satu cara yang masuk akal)

- **Satu dropdown, dua seksi.** Bagian atas tetap 4 alat yang sudah ada. Bagian bawah (dipisah garis, seperti seksi "Ukuran Node & Handle" yang sudah ada) berisi **Aksi Node & Path**: 14 entri (2, 4–16 di atas). Alat = ganti tool aktif; aksi = langsung berjalan pada node/path terpilih lalu dropdown menutup.
- **Tidak ada engine baru untuk yang sudah ada.** Entri 2, 4, 5, 6, 8, 11, 13, 15, 16 hanya memanggil handler yang sudah ada di `VectorEditor.jsx`. Engine baru hanya 4: Join Nodes, Split Path, Reverse Path, dan Auto Smooth (memakai `autoHandles` yang sudah ada dengan opsi Catmull-Rom).
- **Entri nonaktif bila tidak berlaku** (pola dropdown Boolean yang sudah ada: opacity 0.45, tidak bisa diklik). Contoh: Delete/Smooth/Corner/Symmetric/Break/Join/Split butuh node terpilih; Close/Open/Reverse/Simplify butuh objek path terpilih; Outline Stroke butuh objek ber-stroke; Offset Path butuh objek non-gambar.
- **Dropdown bisa di-scroll.** 14 entri aksi + 4 alat + seksi ukuran node terlalu tinggi untuk satu layar — pakai `maxHeight` + `overflowY: auto` (pola dropdown Snap yang sudah ada).
- **Tooltip + bahasa Inggris lengkap.** Setiap entri baru mendapat kunci tooltip ID + EN di `tooltipsCatalog.jsx` (pelajaran ronde 5: kunci yang hilang = tooltip mati).
- **Tanpa perubahan perilaku alat yang sudah ada.** Alat `node`/`addnode`/`addhandle`/`autohandle`, rail kiri, dan dropdown Boolean tidak disentuh perilakunya.

## Bukan tujuan

- Mengubah cara kerja alat node/pen yang sudah ada; menambah shortcut baru; mengubah rail kiri atau dropdown Boolean; mengubah model data objek/path.

## Yang masih bisa dikoreksi user

1. **Convert to Curves**: tafsir saya di atas (segmen lurus → handle Bézier). Kalau maksud user lain (mis. teks → path — itu sudah ada sebagai "Ubah ke Path"), beri tahu.
2. **Move Node**: saya anggap = alat `node` yang sudah ada. Kalau user mau entri "Move Node" terpisah di dropdown, beri tahu.
3. **Simplify/Outline/Offset**: saya tambahkan sebagai entri duplikat di dropdown Node (fiturnya sudah ada di tempat lain). Kalau user justru tidak mau duplikat, beri tahu.
