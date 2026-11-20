# Design: 6 Tool Baru Geovanta — Curvature, Shape Builder, Blob Generator, Weave Generator, Line Segment, Arc

Tanggal: 2026-11-12
Status: menunggu persetujuan user (pendekatan A sudah dipilih user 2026-11-12)

## 1. Intent & why

User meminta 6 tool baru di Geovanta (working copy `Geovanta Bug Blank Font`,
bukan repo git): Curvature, Shape Builder, Blob Generator, Weave Generator,
Line Segment, dan Arc. Tujuannya: menutup celah tool gambar dasar — hari ini
Geovanta hanya punya Pen (klik titik + drag handle), Shape (rect/ellipse/
polygon/star), dan Node editing. Tool kurva bebas (Curvature), garis/busur
presisi (Line Segment, Arc), penggabung bentuk (Shape Builder), dan generator
parametrik (Blob, Weave) adalah yang paling sering dipakai di editor vektor
lain (Illustrator/Figma) dan belum ada di sini. Hasil akhir: keenam tool bisa
dipakai dari toolbar, menghasilkan objek path biasa yang langsung bisa diedit
dengan Node tool, Boolean, dan Offset Path seperti objek lainnya.

## 2. Goals

- G1: Keenam tool muncul di toolbar bawah dan bisa dipakai penuh dengan mouse
  (klik/seret), tanpa perintah tersembunyi.
- G2: Blob & Weave bersifat parametrik: parameter di inspector kanan, perubahan
  parameter memperbarui bentuk yang sama secara live (objek tidak diganti).
- G3: Semua tool menghasilkan objek path standar (node + handle Bézier),
  sehingga Node tool, Boolean, Offset, Simplify, dan ekspor SVG tetap jalan.
- G4: Perilaku mengikuti konvensi Illustrator/Figma sedekat mungkin (lihat
  §5 per tool), termasuk Shift untuk constrain dan Esc untuk selesai/batal.
- G5: Bukti visual: screenshot tiap tool (bentuk yang dihasilkan + panel
  parameternya) diserahkan bersama ZIP, seperti diminta user.

## 3. Non-goals

- Tidak mengubah perilaku tool yang sudah ada (Pen, Shape, Node, Text, dll).
- Shape Builder v1: TIDAK ada model klik-per-region ala Illustrator penuh
  (klik satu region untuk gabung/hapus region itu saja) — v1 hanya drag-gabung
  dan Alt-drag-kurang (lihat §5.2).
- Arc v1: hanya busur terbuka (open arc); tidak ada mode pie/chord tertutup.
- Weave v1: hasil berupa grup path per strip (bukan satu path boolean hasil
  gabungan); tidak ada animasi.
- Tidak ada dependensi/library baru — semua memakai engine yang sudah ada.
- Tidak ada preset galeri (template blob/weave siap pakai); hanya parameter
  + tombol acak (seed) untuk Blob.

## 4. Anti-goals (yang membuat ini gagal meski teknisnya jalan)

- Tool yang menghasilkan objek "khusus" yang tidak bisa diedit Node tool.
- Generator yang sekali jalan lalu parameternya mati (tidak live-update).
- Shortcut/kursor yang bertabrakan dengan tool yang sudah ada.
- Panel parameter yang hanya muncul di sidebar kiri (user minta inspector kanan).

## 5. Perilaku per tool

### 5.1 Curvature tool (shortcut C)

- Ala Illustrator Curvature: klik menaruh anchor point (smooth default);
  seret sebuah titik untuk mengubah lengkung di sekitarnya; klik titik yang
  sudah ada untuk toggle smooth/corner; seret di tengah segmen untuk
  membentuk ulang segmen itu; double-click / Enter / Esc = selesai; klik
  titik pertama = tutup path.
- Hasil: satu objek path (terbuka atau tertutup). Node-nya smooth (handle
  simetris ala `autoHandles` Catmull-Rom) kecuali yang di-toggle corner.
- Hanya gambar baru (keputusan user Q4 A): tool ini TIDAK membentuk ulang
  path yang sudah ada di v1 — klik pada path lama tidak mengaktifkan mode
  edit; untuk mengubah path lama tetap dipakai Node tool.
- Reuse: `src/engine/nodeEditingAndHandles.jsx`, `vectorEngine.jsx`
  (autoHandles), `bezierSubdivisionAndMove.jsx` (seret segmen).

### 5.2 Shape Builder tool (shortcut G)

- Prasyarat: 2+ objek shape/path terpilih yang saling tumpang tindih (fill).
- Seret satu garis melintasi bentuk-bentuk itu → semua bentuk yang dilewati
  garis digabung menjadi SATU path (union via `pathBoolean.jsx`).
- Alt+seret → BENTUK UTUH yang dilewati garis dikurangkan (keputusan user
  Q1 B): bukan kuas selebar tertentu — tiap bentuk yang tersentuh garis
  Alt-seret dikeluarkan dari hasil (subtract per bentuk).
- Hanya objek yang terseleksi yang diproses (keputusan user Q3 A): bentuk
  ketiga yang tidak terseleksi tapi terlewati garis TIDAK ikut. Bila seleksi
  kurang dari 2 objek, tool menampilkan petunjuk "pilih 2+ bentuk dulu".
- Esc atau ganti tool = selesai. Hasil gabungan mewarisi fill/stroke bentuk
  pertama yang dilewati; sisanya yang tidak tersentuh tetap utuh.
- Non-goal: klik satu region untuk menggabungkan/menghapus region itu saja.

### 5.3 Blob Generator tool (shortcut O)

- Seret di kanvas untuk menentukan kotak pembatas (bounding box) blob.
- Parameter di inspector kanan (live-update objek yang sama):
  - Jumlah titik (points): 3–24, default 8.
  - Keacakan (irregularity): 0–100%, default 35%.
  - Kehalusan (smoothness): 0–100%, default 70%.
  - Seed acak: tombol "Acak" (seed baru) + tampilkan seed saat ini.
- Algoritma: titik-titik di sekeliling pusat pada radius yang diacak
  (±irregularity), dihaluskan menjadi kurva tertutup (Catmull-Rom →
  Bézier kubik, reuse `autoHandles` / `curveFittingAndAnomalies.jsx`).
  Seed membuat hasil deterministik: seed sama + parameter sama = blob sama.
- Commit saat mouse-up; perubahan parameter sesudahnya tetap mengubah objek
  blob yang sama selama tool masih aktif dan objek itu terseleksi.
- Parameter MENEMPEL di objek (keputusan user Q2 B): blob menyimpan
  parameternya (jumlah titik, keacakan, kehalusan, seed) sebagai metadata di
  objek, ikut tersimpan saat save/load. Pilih lagi objek blob itu dengan tool
  Blob → panel parameter muncul lagi dan live-edit jalan lagi. Konsekuensi:
  bila user sempat mengedit node blob manual dengan Node tool lalu mengubah
  parameter Blob, regenerasi MENIMPA edit manual itu (parameter adalah
  sumber kebenaran).

### 5.4 Weave Generator tool (shortcut W)

- Seret di kanvas untuk menentukan kotak pembatas anyaman.
- Parameter di inspector kanan (live-update):
  - Kolom: 2–12, default 6. Baris: 2–12, default 4.
  - Amplitudo gelombang: 0–50% dari tinggi sel, default 25%.
  - Ketebalan strip: 20–100% dari lebar sel, default 60%.
- Hasil: grup berisi strip horizontal + vertikal bergelombang (sinus),
  dengan pola anyam over-under berselang-seling (strip yang "di bawah"
  terpotong di persilangan — diimplementasi sebagai potongan path, bukan
  efek visual semata). Tiap strip adalah path biasa.
- Parameter MENEMPEL di objek seperti Blob (keputusan user Q2 B): grup weave
  menyimpan parameternya (kolom, baris, amplitudo, ketebalan); pilih lagi
  grupnya dengan tool Weave → panel muncul lagi dan live-edit jalan lagi.
  Edit manual pada strip lalu ubah parameter = regenerasi menimpa edit manual.
- Reuse: `src/utils/shapeGenerators.jsx` (pola generator), `pathBoolean.jsx` hanya
  bila dibutuhkan untuk memotong persilangan (keputusan builder).

### 5.5 Line Segment tool (shortcut L)

- Klik-seret: garis lurus dari titik awal ke titik akhir. Shift = constrain
  sudut kelipatan 45°. Alt = garis berpusat di titik awal (memanjang dua arah).
- Hasil: satu path 2 node, stroke saja (tanpa fill). Panjang & sudut tampil
  di inspector saat menggambar; sesudah commit bisa diedit Node tool.
- Reuse: pola drag shape tool (`shapeRect` / `makeShape`), snapping yang
  sudah ada (ujung garis snap ke objek lain).

### 5.6 Arc tool (shortcut R)

- Klik = pusat busur; seret = radius (jarak dari pusat ke kursor) + sweep
  (sudut dari pusat ke kursor, dihitung dari arah jam 3 / 0°). Busur digambar
  dari sudut awal 0° menyapu ke sudut kursor; terlihat langsung saat menyeret.
- Shift = constrain sweep ke kelipatan 45°.
- Klik tanpa seret = busur default radius 50, sweep 90°.
- Model kanonis (keputusan saya — koreksi dari builder check, karena draf awal
  menyebut "Shift = busur lingkaran murni" padahal model dasarnya sudah
  lingkaran): pusat + radius + sudut awal + sweep. Inspector menampilkan dan
  mengizinkan edit radius, sudut awal, dan sweep; edit angka mempertahankan
  pusat dan mengubah radius/sudut secara live selama tool aktif.
- Hasil: path terbuka berisi segmen Bézier kubik (konversi via engine
  `src/engine/arcToBezier.jsx` yang sudah ada).

## 6. Pendekatan (approach)

### A — Tool di toolbar + parameter di inspector kanan (DIPILIH user)

Keenam tool jadi tombol di toolbar bawah (mengikuti pola Shape yang punya
picker, dan grup Node tool). Parameter Blob/Weave tampil di inspector kanan
saat tool aktif. Konsisten dengan semua tool yang ada; tidak ada permukaan
UI baru yang perlu dipelajari user.

### B — Panel generator terpisah (DITOLAK)

Atur slider di panel khusus, klik Generate, bentuk muncul di tengah kanvas.
Ditolak user (memilih A): memisahkan generator dari alur menggambar, dan
menambah satu permukaan UI baru.

### C — Tool di toolbar + parameter di panel kiri (dipertimbangkan, tidak dipilih)

Mengikuti pola Pen (opsi fill + tombol selesai di panel kiri). Tidak dipilih
karena user secara eksplisit minta parameter di "inspector kanan", dan panel
kiri di Geovanta adalah tempat bantuan + toggle cepat, bukan parameter
numerik. Panel kiri tetap dipakai untuk bantuan per-tool (lihat §7).

## 7. Constraints (dari rekonstruksi kode, 2026-11-12)

- Working copy BUKAN repo git: konvensi backup `.bak` per file sebelum edit
  destruktif + ZIP (tanpa `node_modules`, tanpa `*.bak*`), bukan commit.
- Tool didaftarkan di `EditorFloatingToolbar.jsx` (tombol + grup + picker),
  state `tool` di `VectorEditor.jsx`, dispatch pointer di `onPointerDown` /
  `onPointerMove` / `onPointerUp` (cabang per tool, mis. `penDown` di :3170),
  bantuan + opsi cepat per-tool di `EditorLeftSidebar.jsx`, inspector di
  `EditorRightInspector.jsx` (saat ini TIDAK punya seksi opsi tool — harus
  ditambah seksi "Parameter tool" yang tampil saat tool generator aktif).
- Shortcut yang sudah terpakai: V select, A/N node, H hand, S simplify,
  P pen, B autohandle, T text. Usulan bebas: C curvature, G shape builder,
  O blob, W weave, L line segment, R arc (R karena A sudah dipakai node).
- i18n: semua label + bantuan harus ada id DAN en (pola `L.*` + `getAppStr`).
- Engine yang bisa dipakai ulang: `arcToBezier.jsx` (busur → Bézier kubik),
  `pathBoolean.jsx` (union/subtract), `nodeEditingAndHandles.jsx`,
  `vectorEngine.jsx` (autoHandles), `bezierSubdivisionAndMove.jsx`,
  `topologicalCurveSimplifier.jsx`, `curveFittingAndAnomalies.jsx`,
  `src/utils/shapeGenerators.jsx` (`shPoly`, `shNgon`, `shStar`, `shapeRect` —
  tempat alami generator baru), `figcraftSnap.jsx` (snapping).
- Model objek: path = node + handle Bézier (lihat `vectorEngine.jsx` /
  `VE.*`). Tool baru WAJIB menghasilkan objek model ini, bukan format baru.
- Aturan tetap: skill Superpowers wajib; kontrak programmer profesional
  (`AGENTS.md`): verifikasi nyata di browser terhadap kasus user, backup
  sebelum edit destruktif, jujur soal yang belum terverifikasi.

## 8. Yang diputuskan user (bukan pilihan builder)

- Pendekatan A (toolbar + inspector kanan).
- Keenam nama tool seperti di atas.
- Bukti berupa gambar (screenshot tiap tool) diserahkan bersama hasil.
- Jawaban builder check (2026-11-13): Q1 B (Alt+seret Shape Builder
  mengurangi bentuk utuh yang dilewati garis), Q2 B (parameter Blob/Weave
  menempel di objek — metadata + ikut save/load; regenerasi menimpa edit
  node manual), Q3 A (Shape Builder hanya memproses objek terseleksi;
  seleksi < 2 → tampilkan petunjuk), Q4 A (Curvature hanya gambar baru,
  tidak membentuk ulang path lama di v1).

## 9. Yang diserahkan ke builder (boleh diputuskan saat rencana/eksekusi)

- Apakah Blob/Weave masuk grup yang sama dengan Shape (picker) atau tombol
  sendiri di toolbar; penempatan pasti ikon-ikon baru.
- Detail ikon (SVG) tiap tool — harus konsisten dengan gaya ikon yang ada.
- Apakah potongan persilangan Weave memakai `pathBoolean` atau pemotongan
  manual segmen (pilih yang lebih andal diuji).
- Nilai default parameter yang tepat (angka di §5 adalah usulan awal).
- Apakah parameter terakhir generator disimpan di localStorage (seperti
  `lastTextFamilyRef`) atau hanya selama sesi.
- Urutan pengerjaan keenam tool di dalam rencana.

## 10. Verifikasi

- Unit test (TDD) untuk generator murni (blob/weave: deterministik per seed,
  jumlah titik, path tertutup; arc: konversi ke kubik; line: 2 node).
- Probe Playwright per tool: buat bentuk via tool, assert objek tercipta
  dengan geometri yang benar, edit parameter Blob/Weave di inspector dan
  assert bentuk berubah live, Shape Builder gabung/kurang, Curvature tutup
  path, Arc + Line Segment commit.
- Screenshot tiap tool (bentuk + panel parameter) sebagai bukti — dilampirkan
  di laporan akhir.
- Regresi penuh: `npm test`, build 0 warning, probe figma-text 15/15,
  node-actions, r5, topath, dblclick, stale-assets-fix, matriks, snap,
  probe-textbox-height; smoke test ZIP 0 pageerror.
