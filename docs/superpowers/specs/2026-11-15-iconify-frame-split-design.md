# Design: Iconify insert — Frame + objek terpisah per subpath + simplifikasi node (Pendekatan A)

- **Tanggal:** 2026-11-15
- **Status:** menunggu builder check + persetujuan user (belum boleh dibangun)
- **Pendekatan:** A — pisah penuh + render gabungan (dipilih user 21:44 WIB)
- **Deadline user 17 menit (sampai ~22:01 WIB):** hanya mencakup desain ini + pengiriman builder check. Build butuh persetujuan terpisah + deadline eksekusi sendiri (lihat §8).
- **Estimasi build:** Sangat Berat, **3–5 jam, 2 fase** (Fase 1 ~1,5–2 jam, Fase 2 ~1,5–2,5 jam).
- **Konteks:** tindak lanjut fix insert-shape 2026-11-15 ~21:20 WIB (`Geovanta-Iconify-InsertShape-FIX.zip`).
- **Lokasi kerja:** `~/workspace/geovanta-iconify-insert-bug/Geovanta-Iconify-Modal-Gemini-Edit/`

## 1. Intent & why

Permintaan user (21:39 WIB, kata-kata mereka): saat insert ikon, "objek objek yang ada di ikonnya sudah menyatu … saya tidak bisa mengedit objeknya secara custom, harusnya objeknya terpisah, jadi tiap ikon berada di dalam frame"; lalu "ikon ikon yang di insert memiliki node yang sangat banyak, harusnya bisa tetap normal tanpa mengurangi akurasi".

Kenapa ini diminta: pengguna ingin mengklik satu bagian ikon (mis. kepala `mdi:account-circle`) lalu menggeser, mewarnai, atau menghapus bagian itu sendiri — seperti di Figma — tanpa merusak bentuk ikon. Dan saat masuk Node tool, mereka tidak ingin dibanjiri node redundan dari data mentah Iconify.

## 2. Goals / Non-goals / Anti-goals

**Goals:**
- G1. Setiap ikon yang disisipkan menjadi satu Frame sungguhan; di dalamnya satu objek per subpath, masing-masing bisa dipilih, digeser, diwarnai, dihapus, dan diedit node-nya sendiri.
- G2. Lubang (kepala/bahu `account-circle`, dst.) tetap transparan — piksel yang sama persis dengan render hari ini (1 objek per `<path>`).
- G3. Jumlah node turun ke angka normal tanpa mengubah bentuk: simpangan maksimum ≤ 0,25 px pada ukuran sisip 96 px, dibuktikan probe (bukan klaim).
- G4. Satu entri riwayat (undo) per sisipan; pewarnaan palette/monokrom, metadata lisensi, dan posisi berjejer tetap seperti sekarang.

**Non-goals:**
- N1. Live boolean ops di UI (Union/Subtract sebagai grup hidup) — tidak dibangun.
- N2. Mengubah frame non-ikon, thumbnail, modal, recent, atau aksi Simplify yang sudah ada.
- N3. Migrasi ikon yang sudah ada di dokumen lama.
- N4. Mengubah perilaku ikon palette multi-warna selain pemecahan subpath di dalam tiap `<path>`-nya.

**Anti-goals (gagal walaupun teknisnya jalan):**
- A1. Lubang ter-render sebagai bentuk padat (bug yang baru diperbaiki 21:20 WIB terulang).
- A2. Node berkurang tapi piksel ikon bergeser melebihi toleransi §6.
- A3. Objek terpisah tapi tidak bisa diklik/dipilih satu per satu di kanvas.

## 3. Current state (terukur, bukan asumsi)

- `onIconifyInsert` (`src/components/editor/VectorEditor.tsx`, ~baris 239): `VE.parseSVG` → 1 objek per `<path>`, SEMUA subpath + `fillRule` dipertahankan; grup `group = fullName` (diunikkan); skala ke frame 96 px di tengah viewport; posisi berjejer (gap 16 px, baris baru sesudah 8).
- Renderer (`src/renderer/canvasKitScene.tsx:199`): fillRule PER OBJEK (`EvenOdd`/`Winding`); blend mode hanya `SrcOver` (baris 266) — tidak ada knockout/mask per objek.
- Model Frame SUDAH ADA (`src/engine/figmaAutoLayoutAndFrames.tsx`): `createFrame(doc, selObjs, cfg)` → grup `Frame-N` + objek latar (`isAutoFrame`, `isFrameBg`, `containerType: 'frame'`); anggota membawa `group + containerType: 'frame'`; `frameBounds` jatuh ke gabungan anggota bila tanpa latar; `isFrameMember`, `frameBgOf`, `listFrames` tersedia.
- Boolean HANYA destruktif (`src/engine/pathBoolean.tsx`: `booleanDoc(doc, op, sel)`, union/subtract/intersect/exclude). Tidak ada boolean hidup.
- Simplifikasi ADA (`src/engine/topologicalCurveSimplifier.tsx`): `simplifySubpath(sp, opts)`; `tol` default 0,5 (satuan dokumen); edit Gemini dulu memakai `0,04` (satuan ikon, sebelum skala ×4 → 0,16 px pada 96 px). `simplifyWith` / `simplifyDoc` tersedia.
- Node mentah, diukur di browser asli via `VE.parseSVG` (spike 2026-11-15, `/tmp/probe-iconify-nodecount.cjs`, data di `/tmp/iconify-nodecount.json`): 10 ikon mdi, node per ikon **8–43, median 21, total 207** — account-circle 15 (3 subs: 5/5/5), home 11, star 10, heart 8, cog 43 (max; subs 5+38), github 26, google-chrome 32 (5 subs), twitter 21, bell 16, android 25. Semua 1 `<path>`, `fillRule: nonzero`.
- Double-click objek di kanvas memilih objek itu + pindah ke Node tool (`VectorEditor.tsx:6648`); tidak ada drill-down grup khusus.

## 4. Approaches considered

- **A — Pisah penuh + render gabungan (DIPILIH).** Tiap subpath jadi objek sendiri di dalam Frame; renderer menggabungkan subpath anak-anak frame per kelompok warna saat menggambar (§5.3), jadi lubang tetap transparan. Trade-off: perubahan renderer + serializer; scope terbesar (3–5 jam, 2 fase). Dipilih user karena satu-satunya pendekatan yang membuat kepala `account-circle` bisa diedit terpisah.
- **B — Pisah aman.** Hanya subpath padat yang tidak bersinggungan yang dipecah; gugus padat+lubang tetap satu objek. Tanpa ubah renderer, risiko nol — tapi `account-circle` tetap 1 objek. Berat, ~1,5–2 jam. Ditolak user (implisit: tidak memenuhi G1 untuk ikon berlubang).
- **C — Edit subpath tanpa pecah objek.** Node tool bisa memilih/menggeser satu subpath sebagai satu unit di dalam objek gabungan. Bentuk 100% aman, tapi ganti warna per bagian tetap mustahil (fill itu per objek). Sangat Berat, ~2–3 jam. Ditolak user.

## 5. Design (Pendekatan A)

### 5.1 Pemecahan di `onIconifyInsert` (Fase 2)

- Sesudah `VE.parseSVG` + recolor + skala (seperti sekarang), tiap objek hasil parse dipecah: **1 objek baru per subpath**. Nama: `<nama-ikon>-<n>` (diunikkan seperti sekarang). Fill/stroke/opacity diwarisi dari objek induk; `fillRule` diwarisi (dipakai renderer §5.3).
- **Tidak ada klasifikasi lubang di insert.** Ini keputusan sadar: lubang-ness TIDAK perlu dihitung — arah winding tiap subpath sudah tersimpan di data subpath, dan renderer gabungan (§5.3) memakai `fillRule` yang sama dengan render hari ini, sehingga piksel identik tanpa heuristik apa pun. (Heuristik bbox-containment adalah persis yang membuat bug Gemini; desain ini menghindarinya sepenuhnya.)
- Simplifikasi diterapkan PER SUBPATH sebelum pemecahan, pada data satuan ikon (sebelum skala), memakai `VE.simplifySubpath`. Kandidat toleransi awal: **0,04 satuan ikon** (= 0,16 px pada 96 px). Toleransi final DIPATOK dari pengukuran di fase plan (probe ukur reduksi node + simpangan maksimum); bukan ditebak. Kriteria terima ada di §6.
- Objek hasil pecah dibungkus Frame via `createFrame` yang sudah ada (Fase 2): grup id = nama ikon penuh yang diunikkan (meneruskan konvensi `gid` sekarang, bukan `Frame-N`, supaya panel layer menampilkan nama ikon). Objek latar: **fill transparan, tanpa stroke** — latar putih akan tampak lewat lubang (salah); latar transparan hanya penanda frame + penentu batas. Anggota membawa `group + containerType: 'frame'` seperti `createFrame`. Penanda **`isIconFrame: true`** ditaruh di **SEMUA anggota frame** (latar + tiap anak), bukan hanya di latar — koreksi sesudah builder check 21:50 WIB: bila penanda hanya di latar, menghapus latar (objek biasa yang bisa dihapus lewat panel layer) akan diam-diam merusak semua lubang (anti-goal A1). Dengan penanda di anggota: hapus latar → frame tetap ter-render gabungan; anak yang dikeluarkan dari grup kehilangan penanda (dibersihkan saat keluar grup) dan ter-render sebagai objek biasa. Penanda inilah yang dikenali renderer §5.3 dan serializer §5.4. Bila `createFrame` tidak bisa dipanggil apa adanya dari jalur sisip (mis. soal urutan commit), builder boleh meniru strukturnya secara eksplisit — hasil akhirnya harus identik: latar + anak-anak berurutan di dokumen.
- Posisi berjejer + `existingFrames` (filter `containerType === 'frame' || isFrameBg`) tetap; karena frame ikon kini benar-benar ber-`containerType: 'frame'`, logika itu bekerja tanpa perubahan.

### 5.2 Apa yang TIDAK berubah di insert

Aturan warna palette/monokrom, metadata `icon` + lisensi SPDX, satu entri riwayat, seleksi langsung sesudah sisip, dan perilaku modal tetap terbuka — semua dipertahankan.

### 5.3 Renderer gabungan — `canvasKitScene.tsx` (Fase 1)

- Saat me-render, renderer membangun peta `groupId → isIconFrame` dari penanda di anggota (§5.1): sebuah grup adalah frame ikon bila anggotanya membawa `isIconFrame: true`.
- Untuk anggota frame ikon: **jangan gambar fill per objek**. Kumpulkan SEMUA subpath anggota, kelompokkan dengan kunci **(sourceId, fill, opacity, fillRule, gradKey)** — `sourceId` = objek `<path>` asal tiap anggota (dua `<path>` berbeda dengan fill sama TIDAK boleh bergabung: render terpisah hari ini akan berubah pikselnya bila digabung, terutama opacity < 1); `gradKey` = identitas gradien. Tiap kelompok digambar SEKALI sebagai satu path Skia dengan `FillType` dari `fillRule` kelompok itu, **dalam urutan dokumen anggota pertama tiap kelompok** (mendekati urutan cat objek hari ini). Stroke tetap digambar per objek seperti sekarang (stroke tidak berinteraksi dengan lubang fill).
- Kelompok fill digambar pada posisi urutan dokumen anggota PERTAMA frame itu (latar transparan tidak menggambar apa-apa); stroke digambar per anggota dalam urutan dokumen.
- Cakupan: HANYA frame bertanda `isIconFrame`. Frame biasa dan semua objek lain dirender persis seperti hari ini (tidak ada perubahan perilaku untuk dokumen lama).
- Konsekuensi yang diinginkan dan harus diverifikasi probe: menggeser objek lubang → lubang berpindah (render ikut); menghapus objek lubang → daerah itu terisi (benar); mewarnai ulang objek lubang → subpath-nya pindah kelompok fill → ter-render sebagai bentuk padat warna baru (perilaku intuitif, tanpa kode khusus).

### 5.4 Serializer — `svgDocumentSerializer.tsx` (Fase 1)

- Serializer HARUS menerapkan pengelompokan yang sama (§5.3) saat menulis SVG: tiap kelompok (fill, opacity, fillRule) menjadi satu elemen `<path>` berisi semua subpath kelompok itu. Bila serializer hari ini menulis satu `<path>` per objek, export frame ikon akan merusak lubang (lubang jadi padat) — itu cacat yang harus dicegah di Fase 1, bukan ditemukan belakangan.
- Builder WAJIB memverifikasi jalur serializer (penulis desain belum membacanya) dan mencatat temuan itu di plan. Kriteria terima: round-trip probe (§6).

### 5.5 Semantik seleksi & edit

- Klik anak frame di kanvas harus memilih ANAK itu (bukan seluruh frame) — A3. Builder memverifikasi perilaku klik-grup/frame hari ini; bila klik kini memilih seluruh grup, plan harus memuat perbaikan/pengecualian untuk anggota frame ikon.
- Node tool pada anak terpilih menampilkan node subpath itu saja (sudah begitu per objek).
- Frame bisa dipilih lewat panel layer (nama = nama ikon) dan lewat latarnya; perilaku persis frame biasa.

### 5.6 Yang diserahkan ke builder (boleh diputuskan builder)

- Nama field penanda selain `isIconFrame` bila ada konvensi yang lebih cocok (asal konsisten di renderer + serializer + insert).
- Implementasi pengumpulan subpath per kelompok di renderer (per frame per bingkai vs cache) — asal piksel dan performa setara render hari ini.
- Toleransi simplifikasi final (di dalam kriteria §6).
- Badge/label "lubang" di panel layer bila murah (opsional, bukan syarat terima).

## 6. Verifikasi (kriteria terima, semua terukur)

- Probe baru `probes/probe-iconify-frame-split.cjs` (berbasis `probe-iconify-insert-shape.cjs`): ikon `account-circle, home, cog, google-chrome, bell, github`. Per ikon: (a) tepat 1 Frame berisi latar transparan + N objek anak, N = jumlah subpath mentah; (b) titik lubang (kepala `account-circle`) menampilkan MERAH latar, bukan warna fill — sama seperti probe S2 hari ini; (c) **pixel-diff vs render build sekarang (1 objek per path): 0 px berbeda di luar toleransi anti-aliasing** — bandingkan per-piksel (decode PNG, bukan `Buffer.equals`); (d) node sesudah simplifikasi + simpangan maksimum ≤ 0,25 px pada 96 px, keduanya dilaporkan per ikon.
- Round-trip: export frame ikon via serializer → parse ulang → pixel-diff vs asli dalam toleransi yang sama.
- `npm test` tetap hijau (324/324 saat desain ditulis); `npm run build:web` exit 0; `tsc --noEmit` tidak menambah error dari 1.416 yang sudah ada.
- Smoke dari ekstrak ZIP segar (probe frame-split lolos dari hasil ekstrak).
- Interaksi: klik anak memilih anak (A3); satu Ctrl+Z menghapus satu sisipan utuh (frame + anak); geser anak lubang → lubang berpindah di piksel; hapus anak lubang → daerah terisi.

## 7. Fase (total 3–5 jam)

- **Fase 1 — renderer + serializer (~1,5–2 jam).** §5.3 + §5.4, di belakang flag `isIconFrame`. Belum ada frame ikon di dokumen mana pun, jadi tidak ada perubahan tampak. Verifikasi: probe dengan frame ikon rakitan manual via `loadTestDoc` (pixel-diff vs render objek gabungan) + round-trip serializer + suite hijau.
- **Fase 2 — insert + frame + simplifikasi + ZIP (~1,5–2,5 jam).** §5.1 + §5.5 + probe §6 + suite + build + smoke + ZIP `Geovanta-Iconify-FrameSplit.zip`.
- Tiap fase bisa diverifikasi sendiri; ZIP hanya sesudah Fase 2.

## 8. Constraints & aturan yang berlaku

- Desktop saja (≥1280); verifikasi di headless Chromium 1440×900 light; Windows/GPU asli belum terukur (jujur di laporan).
- Kontrak programmer profesional (`AGENTS.md`): backup `.bak` sebelum edit destruktif, verifikasi dengan perintah nyata terhadap file asli user, bukti sebelum kesimpulan, ikuti spesifikasi apa adanya, tanpa perluasan scope.
- Superpowers wajib: sesudah desain ini disetujui → `writing-plans` → `executing-plans` / subagent-driven; skill `verification-before-completion` sebelum klaim selesai.
- Deadline 17 menit user (21:44 WIB) mencakup DESAIN ini + builder check saja. Build (3–5 jam, 2 fase) butuh persetujuan desain + deadline eksekusi terpisah dari user.
- **Slice 50 menit (user 21:50 WIB: "3–5 jam terlalu lama, maksimal 50 menit"):** MASUK — renderer gabungan §5.3, pecah subpath + frame §5.1, simplifikasi dengan guard §5.1/§6, probe 3 ikon (account-circle, cog, google-chrome) + suite + build + smoke + ZIP. DITUNDA ke follow-up — pengelompokan serializer §5.4 (export SVG frame ikon bisa merusak lubang sampai follow-up itu; disclosed sebagai batasan), render gabungan di pass drag (lubang bisa tampak padat SESAAAT saat diseret, benar lagi saat drop — menunggu keputusan user Q4). Keputusan Q2 (cara memilih ikon utuh dari kanvas — latar transparan tidak bisa diklik, §5.5) masih menunggu user; bila jawabannya (a) pengecualian hit-test, target 50 menit jadi ketat (realistis 50–65 menit).
- Terbuka dan TIDAK masuk scope ini (butuh keputusan user sendiri): T8-2b0, M6/M8 (cascade vs berjejer), recent "Terakhir dipakai".

## 9. Keputusan yang sudah dibuat (bukan untuk dibuka lagi tanpa user)

- Pendekatan A dipilih user 21:44 WIB (opsi B/C ditolak untuk tugas ini).
- Tanpa klasifikasi lubang di insert (§5.1) — kebenaran render berasal dari pengelompokan + fillRule, bukan heuristik.
- Kunci kelompok render: (fill, opacity, fillRule); latar frame transparan; grup id = nama ikon.
- Toleransi simplifikasi kandidat 0,04 satuan ikon; final dipatok dari pengukuran (§5.1, §6).
