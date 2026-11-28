/**
 * @file src/constants/tooltipsCatalog.tsx
 * @description Katalog lengkap teks tooltip Bahasa Indonesia
 */
/* ---------- Tooltip kustom (delegasi event pada atribut data-tip) ---------- */
const TIPS: Record<string, any> = {
  help: {
    k: '?',
    t: 'Pintasan keyboard',
    d: 'Menampilkan daftar semua pintasan keyboard.'
  },
  settings: {
    k: ',',
    t: 'Pengaturan',
    d: 'Tema, animasi, preferensi UI, dan opsi aplikasi.',
    w: 'Ubah tampilan atau perilaku aplikasi.'
  },
  setTheme: {
    t: 'Tema',
    d: 'Warna antarmuka: mengikuti sistem, terang, atau gelap.'
  },
  setMotion: {
    t: 'Animasi',
    d: 'Mengontrol animasi dan transisi UI.',
    w: 'Nonaktifkan jika mengalami lag atau lebih suka antarmuka tenang.'
  },
  setTips: {
    t: 'Tooltip',
    d: 'Menampilkan petunjuk saat mengarahkan kursor ke kontrol.',
    w: 'Nonaktifkan jika sudah mahir memakai aplikasi.'
  },
  setPersist: {
    t: 'Simpan preferensi',
    d: 'Menyimpan tema, animasi, dan preferensi UI di browser (localStorage).'
  },
  setReset: {
    t: 'Reset pengaturan',
    d: 'Mengembalikan semua preferensi aplikasi ke nilai bawaan.'
  },
  setAbout: {
    t: 'Tentang',
    d: 'Versi aplikasi dan informasi teknis.'
  },
  vePruneNodes: {
    t: 'Hapus Node Non-Sudut',
    d: 'Mendeteksi sudut tajam (belokan mendadak yang kontur aslinya menempel pada titik potong kedua sisi), mengunci node di sudut itu, lalu menghapus semua node di tengah/pinggir sisi di antara dua sudut selama penyimpangan terhadap kontur asli tidak melebihi toleransi. Sisi lengkung diganti 1 kurva Bézier bila masih sesuai. Node di batas bersama antar objek tidak disentuh.',
    w: 'Cocok untuk merapikan path dengan node berlebih, mis. huruf A dari 58 node menjadi tepat sebanyak sudutnya.'
  },
  vePruneTol: {
    t: 'Toleransi hapus node',
    d: 'Simpangan maksimum hasil terhadap kontur asli. Kecil = aman tapi node tersisa lebih banyak; besar = lebih agresif.',
    w: 'Mulai 0.75; naikkan bila node tengah masih tersisa.'
  },
  vePruneAng: {
    t: 'Sudut minimal',
    d: 'Belokan di bawah nilai ini tidak dianggap sudut sehingga nodenya boleh dihapus.',
    w: 'Turunkan bila sudut tumpul ikut hilang; naikkan bila node noise tersisa.'
  },
  veAutoRefine: {
    t: 'Auto Rapikan',
    d: 'Meluruskan segmen meleyot / rantai node bergelombang lalu membulatkan sudut patah-patah pada objek terpilih, dalam satu klik. Memakai Ambang penyimpangan di bawah. Batas bersama dengan objek lain dijaga agar tidak muncul celah.',
    w: 'Untuk merapikan sisi dan sudut objek terpilih sekaligus.'
  },
  closeDlg: {
    k: 'Esc',
    t: 'Tutup',
    d: 'Menutup panel ini.'
  },
  /* ---- Editor gradien ---- */
  veGradMode: {
    t: 'Mode Fill',
    d: 'Jenis isian objek: warna solid, gradien linear, gradien radial, atau tanpa isi.'
  },
  veGradSolid: {
    t: 'Solid',
    d: 'Mengisi objek dengan satu warna rata.'
  },
  veGradLinear: {
    t: 'Linear',
    d: 'Gradien lurus dari satu titik ke titik lain, dengan sudut yang bisa diatur.'
  },
  veGradRadial: {
    t: 'Radial',
    d: 'Gradien melingkar yang memancar dari pusat ke tepi.'
  },
  veGradAngular: {
    t: 'Angular',
    d: 'Gradien sapuan melingkar (conic/sweep gradient) 360 derajat mengelilingi titik pusat.'
  },
  veGradNone: {
    t: 'Kosong',
    d: 'Objek tidak memiliki isian (hanya stroke).'
  },
  veGradBar: {
    t: 'Bilah gradien',
    d: 'Klik di bilah untuk menambah stop warna baru; seret stop untuk memindahkannya.'
  },
  veGradStop: {
    t: 'Stop warna',
    d: 'Klik untuk memilih stop, seret untuk memindahkan posisinya di sepanjang gradien.'
  },
  veGradMid: {
    t: 'Titik tengah (midpoint)',
    d: 'Mengatur di mana campuran dua stop berada di 50%. Seret untuk menggeser, klik dua kali untuk reset ke 50%.'
  },
  veGradStopColor: {
    t: 'Warna stop',
    d: 'Mengubah warna stop yang sedang dipilih.'
  },
  veGradDelStop: {
    t: 'Hapus stop',
    d: 'Menghapus stop yang sedang dipilih (gradien minimal punya 2 stop).'
  },
  veGradStopPos: {
    t: 'Posisi stop',
    d: 'Letak stop sepanjang gradien, 0% di awal sampai 100% di akhir.'
  },
  veGradStopOp: {
    t: 'Opacity stop',
    d: 'Transparansi warna pada stop ini; 0% bening, 100% pekat.'
  },
  veGradAngle: {
    t: 'Sudut gradien',
    d: 'Arah gradien linear dalam derajat (−180° sampai 180°).'
  },
  veGradAnglePreset: {
    t: 'Sudut cepat',
    d: 'Langsung mengatur sudut gradien ke nilai ini.'
  },
  veGradInterp: {
    t: 'Ruang interpolasi',
    d: 'Cara warna dicampur di antara stop. OKLab menghasilkan peralihan yang lebih halus dan alami; sRGB mengikuti perilaku standar SVG.'
  },
  veGradOk: {
    t: 'OKLab halus',
    d: 'Campuran warna di ruang OKLab: tidak ada pita keruh di tengah peralihan.'
  },
  veGradSrgb: {
    t: 'sRGB',
    d: 'Campuran warna sRGB standar, sesuai tampilan SVG di semua aplikasi.'
  },
  veGradSpread: {
    t: 'Metode spread',
    d: 'Perilaku gradien di luar titik awal dan akhirnya.'
  },
  veGradPad: {
    t: 'Pad',
    d: 'Warna stop pertama dan terakhir diperpanjang ke luar.'
  },
  veGradReflect: {
    t: 'Reflect',
    d: 'Gradien dipantulkan bolak-balik di luar batasnya.'
  },
  veGradRepeat: {
    t: 'Repeat',
    d: 'Gradien diulang dari awal di luar batasnya.'
  },
  veGradReverse: {
    t: 'Balik gradien',
    d: 'Membalik urutan semua stop (awal menjadi akhir).'
  },
  veGradDistribute: {
    t: 'Ratakan stop',
    d: 'Menyebar semua stop dengan jarak sama rata dari 0% sampai 100%.'
  },
  veGradRdp: {
    t: 'Sederhanakan stop (RDP)',
    d: 'Membuang stop yang berlebihan pada gradien memakai algoritma Ramer–Douglas–Peucker, tanpa banyak mengubah tampilan.'
  },
  /* ---- Pen, Auto Handle, layer ---- */
  vePenNoFill: {
    t: 'Tanpa isi',
    d: 'Path yang digambar hanya berupa garis (stroke), tanpa warna isian.'
  },
  vePenFill: {
    t: 'Dengan isi',
    d: 'Path yang digambar diberi warna isian.'
  },
  vePenFinish: {
    k: 'Enter',
    t: 'Selesai menggambar',
    d: 'Mengakhiri path yang sedang digambar.'
  },
  veAhAddSel: {
    t: 'Tambah handle ke terpilih',
    d: 'Menambahkan handle Bézier ke objek atau node terpilih tanpa mengubah bentuknya (handle ditempatkan di 1/3 dan 2/3 segmen).'
  },
  veAhAddAll: {
    t: 'Tambah handle ke semua',
    d: 'Menambahkan handle Bézier ke semua objek tanpa mengubah bentuknya.'
  },
  veAhDelSel: {
    t: 'Hapus handle terpilih',
    d: 'Menghapus handle pada objek terpilih sehingga segmennya menjadi garis lurus.'
  },
  veAhDelAll: {
    t: 'Hapus handle semua',
    d: 'Menghapus handle pada semua objek.'
  },
  veAhScopeSub: {
    t: 'Cakupan: subpath',
    d: 'Klik di kanvas hanya memengaruhi subpath yang diklik.'
  },
  veAhScopeObj: {
    t: 'Cakupan: seluruh objek',
    d: 'Klik di kanvas memengaruhi semua subpath dalam objek yang diklik.'
  },
  veClipFrames: {
    t: 'Clip Frame',
    d: 'Memotong tampilan objek yang melewati batas Frame, seperti Clip Content di Figma.'
  },
  veToolGroup: {
    t: 'Pilih alat dalam grup',
    d: 'Membuka daftar alat lain yang sekelompok dengan tombol ini.'
  },
  veSelColor: {
    t: 'Ganti warna',
    d: 'Mengubah warna ini pada semua objek yang memakainya sekaligus.'
  },
  veSelPick: {
    t: 'Pilih objek berwarna ini',
    d: 'Memilih hanya objek yang memakai warna ini, untuk mengatur radius atau stroke sekaligus.'
  },
  veColorStyles: {
    t: 'Color Styles',
    d: 'Daftar style warna dokumen. Klik swatch untuk menautkan fill seleksi ke style; ubah warna style untuk mengubah semua objek yang menaut.'
  },
  veStyleCreate: {
    t: 'Buat style',
    d: 'Membuat style baru dari warna fill objek terpilih dan menautkan seleksi ke style itu.'
  },
  veStyleApply: {
    t: 'Terapkan style',
    d: 'Menautkan fill objek terpilih ke style ini. Mengubah warna style nanti akan mengubah semua objek yang menaut.'
  },
  veStyleHex: {
    t: 'Warna style',
    d: 'Mengubah warna style ini — semua objek yang menaut ikut berubah.'
  },
  veStyleDelete: {
    t: 'Hapus style',
    d: 'Menghapus style; objek yang menaut menjadi warna lepas dengan warna terakhirnya.'
  },
  frOpen: {
    t: 'Find & Replace warna',
    d: 'Mengganti satu warna persis ke warna lain, di seluruh dokumen atau hanya di seleksi, dengan pratinjau langsung.'
  },
  frReplace: {
    t: 'Ganti satu',
    d: 'Mengganti satu kecocokan pertama yang tersisa (satu langkah Undo), lalu pratinjau maju ke kecocokan berikutnya.'
  },
  frReplaceAll: {
    t: 'Ganti semua',
    d: 'Mengganti semua kecocokan sekaligus (satu langkah Undo). Arahkan kursor ke sini untuk pratinjau semua.'
  },
  frFrom: {
    t: 'Warna sumber',
    d: 'Warna yang mau diganti — hanya kecocokan persis (fill, stroke, atau stop gradien) yang dihitung.'
  },
  frTo: {
    t: 'Warna pengganti',
    d: 'Warna baru untuk semua kecocokan.'
  },
  frToNone: {
    t: 'Tanpa warna',
    d: 'Mengganti warna sumber menjadi tanpa warna (cat dihapus) sebagai pengganti warna baru.'
  },
  frScope: {
    t: 'Cakupan',
    d: 'Seluruh dokumen atau hanya objek yang sedang dipilih.'
  },
  frClose: {
    t: 'Tutup',
    d: 'Menutup dialog tanpa mengganti apa pun; pratinjau dibatalkan.'
  },
  rcOpen: {
    t: 'Recolor warna',
    d: 'Menggeser hue atau memetakan ulang palet warna di seluruh dokumen atau hanya di seleksi, dengan pratinjau langsung.'
  },
  rcApply: {
    t: 'Terapkan',
    d: 'Menerapkan recolor ke dokumen (satu langkah Undo) lalu menutup modal.'
  },
  rcClose: {
    t: 'Tutup',
    d: 'Menutup modal dan membuang pratinjau tanpa perubahan.'
  },
  rcHue: {
    t: 'Geser hue',
    d: 'Menggeser hue semua warna dalam rentang sumber sebesar delta ini (derajat).'
  },
  rcSat: {
    t: 'Saturasi',
    d: 'Pengali saturasi warna yang digeser (0–2).'
  },
  rcLight: {
    t: 'Kecerahan',
    d: 'Pengali kecerahan warna yang digeser (0–2).'
  },
  rcHueRange: {
    t: 'Rentang hue sumber',
    d: 'Hanya warna yang hue-nya masuk rentang ini yang digeser. Min lebih besar dari maks berarti rentang melingkar.'
  },
  rcScope: {
    t: 'Cakupan',
    d: 'Recolor seluruh dokumen atau hanya objek yang sedang dipilih.'
  },
  rcMode: {
    t: 'Mode recolor',
    d: 'Mode 1 menggeser hue semua warna dalam rentang; Mode 2 memetakan tiap keluarga hue ke warna target.'
  },
  rcTabMode1: {
    t: 'Mode 1 · Geser Hue',
    d: 'Menggeser hue semua warna dalam rentang sumber dengan delta yang sama.'
  },
  rcTabMode2: {
    t: 'Mode 2 · Palette Mapping',
    d: 'Memetakan tiap keluarga hue ke satu warna target, dengan override per warna.'
  },
  rcFamilyTarget: {
    t: 'Warna target keluarga',
    d: 'Semua warna dalam keluarga ini dipetakan ke hue warna ini (saturasi dan kecerahan asal dipertahankan).'
  },
  rcOverride: {
    t: 'Override warna',
    d: 'Klik untuk mengatur warna pengganti khusus untuk warna ini saja (menimpa target keluarga).'
  },
  rcSetTarget: {
    t: 'Atur target keluarga',
    d: 'Mengatur warna target untuk keluarga ini.'
  },
  rcClearTarget: {
    t: 'Hapus target',
    d: 'Menghapus target keluarga ini; warnanya kembali tidak berubah.'
  },
  rcRemoveOverride: {
    t: 'Hapus override',
    d: 'Menghapus override warna ini; warnanya kembali mengikuti target keluarga.'
  },
  veStyleUnlinkFill: {
    t: 'Lepas tautan fill',
    d: 'Melepas tautan fill objek ini dari style; warnanya tetap.'
  },
  veStyleUnlinkStroke: {
    t: 'Lepas tautan stroke',
    d: 'Melepas tautan stroke objek ini dari style; warnanya tetap.'
  },
  veRecentColor: {
    t: 'Warna terakhir',
    d: 'Klik untuk memakai warna ini sebagai fill seleksi.'
  },
  veSelect: {
    k: 'V',
    t: 'Pilih',
    d: 'Pilih objek atau node. Shift untuk multi-seleksi. Seret objek untuk memindahkan.'
  },
  veAddNode: {
    t: 'Tambah Node',
    d: 'Arahkan kursor ke garis objek mana pun, lalu klik untuk menambah node di titik itu. Seret setelah klik untuk langsung memindahkannya. Snap ke titik tengah segmen, garis grid, serta node dan tepi objek lain. Tahan Alt untuk menonaktifkan snap.',
    w: 'Saat butuh node tambahan di tempat yang presisi.'
  },
  veAddHandle: {
    t: 'Tambah Handle Bézier',
    d: 'Arahkan kursor ke sebuah node (muncul cincin dan pratinjau handle), lalu klik untuk menambahkan handle Bézier pada node itu. Handle dibuat mengikuti arah garis di sekitar node; seret setelah klik untuk langsung mengatur panjang dan arahnya. Node yang sudah punya handle lengkap tidak berubah.',
    w: 'Mengubah sudut lurus menjadi lengkung, atau menambah handle yang belum ada pada node di ujung path.'
  },
  vePen: {
    k: 'P',
    t: 'Pen Tool',
    d: 'Klik = node sudut (lurus). Klik-tahan-seret (> 4 px) = node halus dengan handle simetris. Alt saat menyeret = patahkan sudut (handle masuk dikunci). Shift = kunci sudut 45°. Klik node pertama untuk menutup path; Enter / Esc / klik ganda untuk mengakhiri; Backspace menghapus node terakhir. Snap multi-guide aktif.',
    w: 'Menggambar kurva Bézier presisi dari nol.'
  },
  vePencil: {
    k: 'Shift+P',
    t: 'Pencil Tool',
    d: 'Gambar goresan tangan bebas (freehand drawing) secara alami dengan fitting kurva Bézier kubik otomatis dan mulus.'
  },
  veBrush: {
    t: 'Brush Tool',
    d: 'Gambar goresan kuas artistik dinamis (smooth ribbon brush) dengan ketebalan adaptif dan ujung melancip.'
  },
  veAutoHandle: {
    k: 'B',
    t: 'Auto Handle Bézier',
    d: 'Klik sebuah node (atau badan objek) untuk memberi SEMUA node pada subpath itu handle Bézier yang mulus (Centripetal Catmull-Rom, tanpa lipatan). Seret kanan/kiri setelah klik untuk mengatur ketegangan secara live.',
    w: 'Mengubah poligon bergerigi menjadi kurva mulus sekaligus.'
  },
  veCurvature: {
    k: 'C',
    t: 'Curvature Tool',
    d: 'Klik untuk menaruh titik halus (smooth); seret titik atau segmen untuk membentuk ulang lengkung. Klik titik yang ada untuk beralih smooth/corner. Klik titik pertama untuk menutup path; double-click / Enter / Esc untuk selesai.',
    w: 'Menggambar kurva halus ala Illustrator.'
  },
  veShapeBuilder: {
    k: 'G',
    t: 'Shape Builder',
    d: 'Pilih 2+ bentuk yang tumpang tindih, lalu seret garis melintasi bentuk untuk menggabungkannya menjadi satu path. Alt+seret mengurangi bentuk utuh yang dilewati garis.',
    w: 'Menggabungkan beberapa bentuk menjadi satu.'
  },
  veBlob: {
    k: 'O',
    t: 'Blob Generator',
    d: 'Seret kotak di kanvas untuk membuat gumpalan organik. Atur jumlah titik, keacakan, kehalusan, dan seed di inspector kanan; parameter menempel di objek.',
    w: 'Membuat bentuk organik acak yang bisa diatur ulang.'
  },
  veWeave: {
    k: 'W',
    t: 'Weave Generator',
    d: 'Seret kotak di kanvas untuk membuat anyaman strip bergelombang. Atur kolom, baris, amplitudo, dan ketebalan strip di inspector kanan; parameter menempel di grup.',
    w: 'Membuat pola anyaman over-under.'
  },
  veLine: {
    k: 'L',
    t: 'Line Segment',
    d: 'Klik-seret untuk menggambar garis lurus. Shift = kunci sudut kelipatan 45°. Alt = garis berpusat di titik awal.',
    w: 'Menggambar garis lurus presisi.'
  },
  veArc: {
    k: 'R',
    t: 'Arc',
    d: 'Klik = pusat busur, seret = radius dan sudut sapuan. Shift = sapuan kelipatan 45°. Klik tanpa seret = busur 90° radius 50. Edit radius dan sudut di inspector.',
    w: 'Menggambar busur lingkaran.'
  },
  veArcRadius: {
    t: 'Radius busur',
    d: 'Jarak pusat busur ke garis busur. Mengubah radius mempertahankan pusat.'
  },
  veArcStart: {
    t: 'Sudut awal busur',
    d: 'Sudut tempat busur dimulai, dihitung dari arah jam 3 (0°). Mengubah sudut awal mempertahankan pusat.'
  },
  veArcSweep: {
    t: 'Sapuan busur',
    d: 'Besar sudut yang disapu busur dari sudut awal. 90° = seperempat lingkaran, 360° = lingkaran penuh.'
  },
  veToolParams: {
    t: 'Parameter tool',
    d: 'Parameter untuk tool gambar yang aktif atau objek generator yang terseleksi. Perubahan diterapkan langsung ke objek.'
  },
  veBlobPoints: {
    t: 'Jumlah titik blob',
    d: 'Jumlah titik kontrol pada outline blob. Lebih banyak titik = bentuk lebih berliku.'
  },
  veBlobIrregularity: {
    t: 'Keacakan blob',
    d: 'Seberapa acak jarak tiap titik dari pusat. 0% = mendekati lingkaran.'
  },
  veBlobSmoothness: {
    t: 'Kehalusan blob',
    d: 'Seberapa halus transisi antar titik. 100% = kurva paling mulus.'
  },
  veBlobRot: {
    t: 'Rotasi blob',
    d: 'Putar orientasi blob dari 0° sampai 360°.'
  },
  veBlobSpike: {
    t: 'Ketajaman puncak',
    d: 'Seberapa tajam atau runcing puncak lekukan blob. 0% = puncak bulat, 100% = bentuk bintang runcing.'
  },
  veBlobSeedVal: {
    t: 'Seed blob',
    d: 'Nilai seed yang menentukan bentuk acak blob ini.'
  },
  veBlobRandomSeed: {
    t: 'Acak seed',
    d: 'Buat seed baru secara acak untuk bentuk blob yang berbeda.'
  },
  veWeaveCols: {
    t: 'Kolom anyaman',
    d: 'Jumlah kolom strip horizontal pada anyaman.'
  },
  veWeaveRows: {
    t: 'Baris anyaman',
    d: 'Jumlah baris strip vertikal pada anyaman.'
  },
  veWeaveAmplitude: {
    t: 'Amplitudo anyaman',
    d: 'Tinggi gelombang strip. Dijepit agar strip tetap di dalam kotak.'
  },
  veWeaveThickness: {
    t: 'Ketebalan strip',
    d: 'Lebar strip relatif terhadap ukuran sel anyaman.'
  },
  veWeaveType: {
    t: 'Bentuk gelombang',
    d: 'Pilihan bentuk gelombang anyaman: Sinus (kurva halus), Zigzag (segitiga tajam), atau Kotak (persegi berundak).'
  },
  veWeaveGap: {
    t: 'Jarak celah',
    d: 'Lebar celah antar persilangan strip anyaman.'
  },
  veWeaveFreq: {
    t: 'Frekuensi gelombang',
    d: 'Kelipatan frekuensi lekukan gelombang sepanjang strip anyaman.'
  },
  veWeavePhase: {
    t: 'Pergeseran fase',
    d: 'Pergeseran posisi awal gelombang anyaman dari 0° hingga 360°.'
  },
  veAhTension: {
    t: 'Ketegangan (τ)',
    d: 'Panjang handle relatif terhadap jarak antar-node. 0 = sudut tajam, 0,33 = standar Hermite, 0,5 = sangat bulat.',
    up: 'Kurva lebih bulat dan menggelembung.',
    dn: 'Kurva lebih rapat mengikuti poligon.'
  },
  veAhAngle: {
    t: 'Lewati sudut lancip',
    d: 'Node yang sudut apitnya lebih kecil dari nilai ini tidak diubah, sehingga sudut tajam tetap tajam.',
    up: 'Lebih banyak sudut dipertahankan.',
    dn: 'Semua node dihaluskan.'
  },
  veNode: {
    k: 'A | N',
    t: 'Edit Node',
    d: 'Tampilkan dan edit node serta handle Bezier. Seret node atau handle untuk mengubah bentuk path.'
  },
  veHand: {
    k: 'H | Spasi',
    t: 'Geser',
    d: 'Seret canvas untuk menggeser tampilan. Tombol tengah mouse juga bisa digunakan di alat lain.'
  },
  veNodeSize: {
    t: 'Ukuran Node & Handle',
    d: 'Atur ukuran tampilan titik node dan handle Bézier pada kanvas.'
  },
  veStraight: {
    t: 'Luruskan',
    d: 'Panel pelurusan garis: merapikan segmen yang hampir lurus pada path terpilih.',
    w: 'Untuk merapikan sisi logo atau bentuk geometris.'
  },
  veAlignSel: {
    t: 'Luruskan terpilih',
    d: 'Jajarkan node atau handle Bézier yang dipilih ke satu garis lurus. Hampir horizontal/vertikal akan di-snap ke sumbu, dan segmen di antara node terpilih menjadi garis lurus.',
    w: 'Garis bawah persegi yang meleyot: pilih dua node bawah (atau handle-nya), lalu klik.'
  },
  veCorner: {
    t: 'Smooth Corner',
    d: 'Fillet sirkular pada node sudut terpilih. Pilih node dulu, atur radius, lalu terapkan.'
  },
  veSnap: {
    t: 'Snap',
    d: 'Multi-snap ala Figma: klik panah kecil di sebelahnya untuk memilih fitur (Smart Guides kotak/pusat, Jarak Sama Rata, Artboard, Node & Handle, Sumbu X/Y node, Midpoint, Kontur, Siku 90°/perpanjangan, Grid, Piksel). Sumbu X dan Y menempel secara independen. Saat menyeret, node menempel ke node & midpoint objek lain (lingkaran merah), ke tepi/kontur objek lain (berlian hijau), dan ke garis siku/perpanjangan (berlian kuning), lalu ke grid. Toleransi 5 piksel layar. Tahan Ctrl/Cmd atau Alt untuk menonaktifkan sementara.'
  },
  veCornerMode: {
    t: 'Profil sudut',
    d: 'Circular = busur lingkaran presisi. Squircle = handle Bézier lebih panjang sehingga transisi lebih lembut. Bevel = sudut dipotong menjadi garis miring lurus (chamfer).'
  },
  veCornerSm: {
    t: 'Kehalusan',
    d: 'Panjang handle relatif terhadap jarak titik singgung (hanya mode Bézier halus).',
    up: 'Sudut makin penuh/melebar.',
    dn: 'Mendekati lengkung lingkaran.'
  },
  veGrid: {
    k: "Ctrl + '",
    t: 'Grid',
    d: 'Menampilkan grid sebagai panduan dan target snap. Ukuran grid menyesuaikan zoom otomatis (kelipatan 10 unit) agar garis selalu terbaca, di zoom berapa pun.'
  },
  veMaxDev: {
    t: 'Ambang penyimpangan',
    d: 'Deviasi maksimum (unit) agar rantai node dianggap garis lurus.',
    up: 'Lebih agresif meluruskan; detail kecil ikut rata.',
    dn: 'Hanya segmen yang sangat lurus yang diubah.'
  },
  veAngTol: {
    t: 'Toleransi arah',
    d: 'Sudut maksimum antar segmen yang masih digabung saat pelurusan.',
    up: 'Lebih longgar menggabung belokan gradual.',
    dn: 'Sudut tajam tetap dipertahankan.'
  },
  veApplyStraight: {
    t: 'Terapkan pelurusan',
    d: 'Menyejajarkan node atau handle terpilih sesuai pengaturan di atas. Jika tidak ada node dipilih, meluruskan seluruh path dengan ambang di bawah.'
  },
  veCornerRadius: {
    t: 'Corner radius',
    d: 'Membulatkan semua sudut tajam pada objek terpilih dengan fillet sirkular. Geser untuk mengubah radius kapan saja; 0 mengembalikan sudut tajam. Hanya sudut di antara dua segmen lurus yang dibulatkan, dan radius dibatasi 45% panjang segmen.',
    up: 'Sudut makin membulat.',
    dn: 'Sudut makin tajam; 0 = tajam.'
  },
  veCornerR: {
    t: 'Radius corner',
    d: 'Radius fillet sirkular yang diterapkan pada node sudut.',
    up: 'Sudut lebih membulat.',
    dn: 'Fillet lebih kecil dan tajam.'
  },
  veApplyCorner: {
    t: 'Terapkan smooth corner',
    d: 'Mengganti node sudut terpilih dengan dua node smooth (fillet).'
  },
  veClose: {
    t: 'Tutup path',
    d: 'Menutup path terpilih (menambah segmen penutup ke titik awal).'
  },
  veOpen: {
    t: 'Buka path',
    d: 'Membuka path tertutup (menghapus penutup Z).'
  },
  veDelNode: {
    k: 'Delete',
    t: 'Hapus node',
    d: 'Menghapus node yang sedang dipilih dari path.'
  },
  veSharpen: {
    t: 'Lancipkan sudut',
    d: 'Meleburkan sudut yang tumpul/membulat (dua node berdekatan, mis. hasil impor atau fillet lama) menjadi satu sudut tajam di perpotongan garis singgungnya. Tanpa node terpilih: deteksi otomatis di seluruh objek terpilih. Dengan node terpilih: dua node bersebelahan dilebur; node tunggal dijadikan corner tanpa handle.'
  },
  veSmoothTb: {
    t: 'Haluskan node (Taubin)',
    d: 'Meratakan posisi node terpilih tanpa menyusutkan bentuk (filter Taubin λ|μ), lalu menghitung ulang handle Bézier yang mulus (G1).'
  },
  veTypeCorner: {
    t: 'Tipe Corner',
    d: 'Node sudut tajam; handle kiri dan kanan independen. Bila 2+ node dipilih dan hampir segaris, node ikut diluruskan; bila handle dipilih, handle diluruskan.'
  },
  veTypeSmooth: {
    t: 'Tipe Smooth',
    d: 'Handle berlawanan arah (G1); panjang handle bisa berbeda.'
  },
  veTypeSym: {
    t: 'Tipe Symmetric',
    d: 'Handle berlawanan arah dengan panjang sama (G1 + simetri).'
  },
  veMirror: {
    t: 'Mirroring Handle',
    d: 'Atur bagaimana handle Bézier berpasangan pada node/handle terpilih, seperti panel Mirroring di Figma. Pilih node (atau handle) lebih dulu. Tahan Alt saat menyeret handle untuk memutus mirroring sementara (node menjadi No mirroring).',
    w: 'Mode berlaku langsung saat menyeret handle, bukan hanya saat dipilih.'
  },
  veMirrorNone: {
    t: 'No mirroring',
    d: 'Kedua handle sepenuhnya independen: arah dan panjang masing-masing bebas. Menggeser satu handle tidak menggerakkan handle seberang.',
    w: 'Membuat sudut tajam atau kurva yang tidak simetris.'
  },
  veMirrorAngle: {
    t: 'Mirror angle',
    d: 'Kedua handle selalu segaris (berlawanan arah). Memutar satu handle ikut memutar handle seberang, tetapi panjang masing-masing tetap berbeda dan bebas.',
    w: 'Kurva mulus (G1) dengan panjang handle yang tidak sama.'
  },
  veMirrorAL: {
    t: 'Mirror angle and length',
    d: 'Kedua handle segaris DAN sama panjang. Menggeser satu handle memantulkan posisinya ke handle seberang secara penuh (simetris terhadap node).',
    w: 'Kurva simetris sempurna di sekitar node.'
  },
  veMirrorCurve: {
    t: 'No mirroring (Geser Melengkung)',
    d: 'Kedua handle bebas & independen (tidak saling memantul), tetapi otomatis memunculkan handle Bézier dan melengkungkan segmen secara dinamis saat salah satu handle digeser.',
    w: 'Saat ingin menggeser 1 handle secara independen menjadi kurva melengkung mulus.'
  },
  veCurveDrag: {
    t: 'Mode Geser Handle Melengkung',
    d: 'Saat aktif, menggeser handle Bézier pada mode No Mirroring akan otomatis membentuk lengkungan busur yang luwes (mengatur kelengkungan segmen secara independen tanpa ikut memutar handle di sisi seberang node).',
    w: 'Aktifkan di floating toolbar saat ingin menarik garis lurus/handle menjadi melengkung dengan bebas.'
  },
  veCopy: {
    t: 'Salin (format terpilih)',
    d: 'SVG/AI/EPS/PS disalin sebagai teks; PNG/JPG/WEBP sebagai gambar PNG. Ctrl+C pada objek menyalin kode SVG + gambar PNG sekaligus.'
  },
  veDownload: {
    t: 'Unduh (format terpilih)',
    d: 'Mengunduh hasil edit sebagai .svg, .png, .jpg, .webp, .ai, .eps atau .ps (Ctrl+S).'
  },
  veFill: {
    t: 'Fill',
    d: 'Warna isi path terpilih.'
  },
  veStroke: {
    t: 'Stroke',
    d: 'Warna garis tepi path terpilih.'
  },
  veStrokeW: {
    t: 'Stroke width',
    d: 'Ketebalan garis tepi dalam unit dokumen.'
  },
  veStrokeAlign: {
    t: 'Posisi garis',
    d: 'Menentukan posisi garis stroke terhadap kontur path: Tengah (Center), Dalam (Inside), atau Luar (Outside).'
  },
  veStrokeLinecap: {
    t: 'Ujung garis (Cap)',
    d: 'Bentuk ujung garis terbuka: Round (bulat), Butt (rata), atau Square (persegi).'
  },
  veStrokeLinejoin: {
    t: 'Sambungan sudut (Join)',
    d: 'Bentuk pertemuan sudut garis: Round (bulat), Miter (tajam berujung lancip), atau Bevel (terpancung rata).'
  },
  veStrokeMiterlimit: {
    t: 'Batas miter',
    d: 'Rasio batas ketajaman sudut sambungan miter sebelum berubah menjadi bevel.'
  },
  vePaintOrder: {
    t: 'Urutan gambar',
    d: 'Menentukan apakah isian (fill) digambar di atas garis (stroke) atau sebaliknya.'
  },
  veStrokeDash: {
    t: 'Pola garis putus',
    d: 'Pola garis putus-putus atau titik-titik (urutan panjang dash dan gap).'
  },
  veStrokeDashOffset: {
    t: 'Offset garis putus',
    d: 'Pergeseran fase awal pola garis putus sepanjang path.'
  },
  veBlendMode: {
    t: 'Mode campur (Blend mode)',
    d: 'Metode percampuran warna lapisan objek dengan lapisan visual di bawahnya.'
  },
  veFx: {
    t: 'Effects',
    d: 'Efek objek terpilih: drop shadow dan blur.'
  },
  veFxAdd: {
    t: 'Tambah efek',
    d: 'Menambahkan efek baru ke objek terpilih.'
  },
  veFxAddShadow: {
    t: 'Drop Shadow',
    d: 'Menambahkan bayangan jatuh ke objek terpilih.'
  },
  veFxAddLayerBlur: {
    t: 'Layer Blur',
    d: 'Me-blur isi objek terpilih.'
  },
  veFxAddBgBlur: {
    t: 'Background Blur',
    d: 'Me-blur latar di belakang objek terpilih.'
  },
  veFxToggle: {
    t: 'Aktif / nonaktif efek',
    d: 'Menonaktifkan efek tanpa menghapusnya.'
  },
  veFxDelete: {
    t: 'Hapus efek',
    d: 'Menghapus efek dari objek terpilih.'
  },
  veFxDx: {
    t: 'Offset X',
    d: 'Geser horizontal bayangan dalam unit dokumen.'
  },
  veFxDy: {
    t: 'Offset Y',
    d: 'Geser vertikal bayangan dalam unit dokumen.'
  },
  veFxBlur: {
    t: 'Blur',
    d: 'Kelembutan tepi bayangan dalam unit dokumen.'
  },
  veFxRadius: {
    t: 'Radius blur',
    d: 'Jari-jari blur dalam unit dokumen (0–100).'
  },
  veFxColor: {
    t: 'Warna bayangan',
    d: 'Warna bayangan jatuh.'
  },
  veFxOpacity: {
    t: 'Opacity bayangan',
    d: 'Kekuatan bayangan (0–100%).'
  },
  veOpacity: {
    t: 'Opacity',
    d: 'Transparansi path terpilih (0–100%).'
  },
  veLayer: {
    t: 'Layer',
    d: 'Klik untuk memilih objek. Shift untuk multi-seleksi.'
  },
  veImport: {
    t: 'Impor SVG / AI / EPS / gambar',
    d: 'Menambahkan satu atau banyak file ke kanvas: SVG, AI, EPS, PS, PDF (menjadi objek vektor yang bisa diedit) atau gambar PNG/JPG/WebP/GIF. Tipe file dikenali dari isinya (magic byte). File ditambahkan di tengah tampilan dan tidak menggantikan isi kanvas. Bisa juga seret-lepas file ke kanvas atau tempel dengan Ctrl+V.'
  },
  veDevMode: {
    t: 'Dev Mode',
    k: 'Shift+D',
    d: 'Masuk ke Dev Mode hanya-baca seperti Figma: inspeksi Box Model, Layout, Tipografi, Warna, Redline jarak otomatis saat hover, dan salin kode CSS, Tailwind, SVG, React JSX, SwiftUI, atau Compose.'
  },
  veMinifyXml: {
    t: 'Minifikasi',
    d: 'Kompilasi kode SVG ke ukuran minimal untuk web.'
  },
  veCopyCode: {
    t: 'Salin Kode',
    d: 'Salin kode ke papan klip.'
  },
  veCodeCopied: {
    t: 'Kode berhasil disalin!',
    d: 'Kode telah tersimpan di clipboard.'
  },
  veDownloadCode: {
    t: 'Unduh Berkas',
    d: 'Unduh berkas kode ke perangkat lokal.'
  },
  veBg: {
    t: 'Latar belakang kanvas',
    d: 'Transparan: kanvas tampil dengan pola kotak-kotak dan ekspor SVG tanpa latar. Solid: kanvas diisi warna pilihan dan ekspor SVG menyertakan persegi latar berwarna.'
  },
  veBgTr: {
    t: 'Transparan',
    d: 'Tanpa latar belakang (pola kotak-kotak).'
  },
  veBgSolid: {
    t: 'Solid',
    d: 'Latar belakang berwarna polos.'
  },
  veBgColor: {
    t: 'Warna latar',
    d: 'Warna latar belakang saat mode Solid.'
  },
  veAreaBoard: {
    t: 'Artboard',
    d: 'Ekspor hanya area bingkai (viewBox asli).'
  },
  veAreaAll: {
    t: 'Semua konten',
    d: 'Ekspor kotak yang pas membungkus seluruh objek di kanvas, termasuk yang di luar artboard.'
  },
  veAreaSel: {
    t: 'Objek seleksi',
    d: 'Ekspor hanya objek yang sedang dipilih, dipotong pas mengikuti batas objek tersebut. Objek lain tidak ikut. Pilih objek dulu sebelum menyalin atau mengunduh.',
    w: 'Mengambil satu bagian atau satu ikon dari desain besar.'
  },
  veArea: {
    t: 'Area ekspor',
    d: 'Artboard: hanya area bingkai (viewBox asli). Semua konten: kotak yang pas membungkus seluruh objek di kanvas, termasuk yang di luar artboard.'
  },
  veZoomOut: {
    k: '-',
    t: 'Perkecil',
    d: 'Memperkecil tampilan canvas editor (zoom ke pusat).'
  },
  veZoomIn: {
    k: '+',
    t: 'Perbesar',
    d: 'Memperbesar tampilan canvas editor (zoom ke pusat).'
  },
  veZoomFit: {
    k: '0',
    t: 'Pas',
    d: 'Menyesuaikan zoom agar seluruh viewBox muat di canvas dan dipusatkan.'
  },
  veDup: {
    k: 'Ctrl + D',
    t: 'Duplikat',
    d: 'Menggandakan objek terpilih (digeser 10 unit).'
  },
  veDelObj: {
    k: 'Delete',
    t: 'Hapus',
    d: 'Menghapus node terpilih; jika tidak ada node terpilih, menghapus objek terpilih.'
  },
  veUp: {
    k: ']',
    t: 'Naikkan layer',
    d: 'Memindahkan objek terpilih satu langkah ke depan.'
  },
  veDown: {
    k: '[',
    t: 'Turunkan layer',
    d: 'Memindahkan objek terpilih satu langkah ke belakang.'
  },
  veInsert: {
    t: 'Sisipkan node',
    d: 'Menambah node di tengah segmen antara dua node bersebelahan yang terpilih. Atau klik dua kali pada garis path.'
  },
  veFillNone: {
    t: 'Fill kosong',
    d: 'Aktif/nonaktifkan isi warna objek.'
  },
  veStrokeNone: {
    t: 'Stroke kosong',
    d: 'Aktif/nonaktifkan garis tepi objek.'
  },
  veZoomSl: {
    k: '+ | - | Scroll',
    t: 'Zoom',
    d: 'Memperbesar atau memperkecil kanvas tanpa batas praktis (0,05% sampai 500.000%). Scroll mouse mengikuti posisi kursor; tombol ± ke pusat.'
  },
  veSimplify: {
    k: 'S',
    t: 'Simplify',
    d: 'Menyederhanakan path kurva Bézier dengan algoritma least-squares cubic fitting VectorCraft (Object › Path › Simplify).',
    w: 'Mengurangi jumlah anchor point sambil menjaga presisi bentuk dan sudut.'
  },
  veBoolUnion: {
    k: 'Ctrl+Alt+U',
    t: 'Boolean Union',
    d: 'Menggabungkan 2+ objek path tertutup terpilih menjadi satu bentuk (Object › Path › Union). Subpath terbuka dilewati.',
    w: 'Hasil memakai fill objek paling bawah dan fill-rule evenodd.'
  },
  veBoolSubtract: {
    k: 'Ctrl+Alt+S',
    t: 'Boolean Subtract',
    d: 'Memotong bentuk terpilih dengan objek paling atas (paling depan) sebagai pemotong (Object › Path › Subtract).',
    w: 'Objek paling atas dihapus; sisanya menjadi satu bentuk.'
  },
  veBoolIntersect: {
    k: 'Ctrl+Alt+I',
    t: 'Boolean Intersect',
    d: 'Menyisakan hanya daerah yang tumpang tindih dari semua objek path tertutup terpilih (Object › Path › Intersect).'
  },
  veBoolExclude: {
    k: 'Ctrl+Alt+X',
    t: 'Boolean Exclude (XOR)',
    d: 'Menyisakan daerah yang hanya dimiliki satu objek — daerah tumpang tindih dibuang (Object › Path › Exclude).'
  },
  veBoolDivide: {
    k: 'Ctrl+Alt+D',
    t: 'Boolean Divide',
    d: 'Membagi 2+ objek path tertutup terpilih menjadi potongan-potongan terpisah di setiap garis perpotongan (Object › Path › Divide).',
    w: 'Setiap bagian hasil perpotongan menjadi objek tersendiri dengan warna asalnya.'
  },
  veMakeCompound: {
    k: 'Ctrl+8',
    t: 'Make Compound Path',
    d: 'Menggabungkan 2+ objek path terpilih menjadi satu compound path dengan fill-rule evenodd (Object › Compound Path › Make).',
    w: 'Subpath di dalam akan melubangi bentuk di luarnya.'
  },
  veReleaseCompound: {
    k: 'Ctrl+Shift+8',
    t: 'Release Compound Path',
    d: 'Memecah compound path multi-subpath menjadi objek-objek path terpisah (Object › Compound Path › Release).'
  },
  vePickBool: {
    t: 'Pilih Operasi Boolean',
    d: 'Buka menu operasi Boolean / Pathfinder: Union, Subtract, Intersect, Exclude, Divide, Outline Stroke, Offset Path.'
  },
  veOutlineStroke: {
    k: 'Ctrl+Alt+O',
    t: 'Outline Stroke',
    d: 'Mengubah stroke objek terpilih menjadi bentuk berisi (fill = warna stroke, stroke dihapus). Fill lama dibuang. Penting untuk logo, cetak, dan laser cutting.'
  },
  veOffsetPath: {
    t: 'Offset Path',
    d: 'Memperbesar (+) atau memperkecil (−) path terpilih sejauh jarak tertentu, dengan pratinjau langsung. Join Miter/Bevel/Round; path yang menyusut sampai lenyap dibiarkan utuh.'
  },
  veOffsetDist: {
    t: 'Jarak Offset (pt)',
    d: 'Jarak perluasan (+) atau penyusutan (−) path, −100 sampai +100 pt. Pratinjau diperbarui langsung di kanvas.'
  },
  veOffsetJoin: {
    t: 'Join Offset',
    d: 'Bentuk sudut pada path hasil offset: Miter (runcing), Bevel (terpotong), atau Round (membulat).'
  },
  veOffsetBadge: {
    t: 'Offset & Anchor Points',
    d: 'Jarak offset saat ini dan jumlah anchor point sebelum → sesudah offset.'
  },
  veOffsetApply: {
    t: 'Terapkan Offset',
    d: 'Komit hasil Offset ke path sebagai satu langkah Undo.'
  },
  veOffsetCancel: {
    t: 'Batalkan Offset',
    d: 'Membatalkan Offset dan mengembalikan path seperti semula.'
  },
  veShape: {
    t: 'Bentuk',
    d: 'Pilih bentuk dasar (persegi, lingkaran, bintang, panah, hati, dll.), lalu seret di kanvas untuk menggambar. Klik sekali untuk ukuran bawaan. Shift = proporsional.',
    w: 'Menambah bentuk baru ke kanvas sebagai path yang bisa diedit node-nya.'
  },
  veShowNodeGlobal: {
    t: 'Tampilkan Node (Global)',
    d: 'Menampilkan atau menyembunyikan node pada setiap objek yang dipilih. Pengaturan berlaku global untuk semua seleksi objek dan berfungsi juga di mode Pilih (Select).'
  },
  veShowHandleGlobal: {
    t: 'Tampilkan Handle Bézier (Global)',
    d: 'Menampilkan atau menyembunyikan handle Bézier pada setiap objek yang dipilih. Pengaturan berlaku global untuk semua seleksi objek dan berfungsi juga di mode Pilih (Select).'
  },
  veSimplifyTol: {
    t: 'Tolerance (pt)',
    d: 'Jarak simpangan maksimum (poin dokumen) antara path asli dan path hasil Simplify (0.001–10000 pt).'
  },
  veApplySimplify: {
    t: 'Terapkan Simplify',
    d: 'Komit hasil Simplify ke path sebagai satu langkah Undo.'
  },
  veSimplifyAuto: {
    t: 'Auto-Simplify (100%)',
    d: 'Mengatur penyederhanaan ke presisi kurva 100% (toleransi 0.031 pt).'
  },
  veAutoSimplifyToggle: {
    t: 'Auto-Simplify (Otomatis saat Impor/Tempel)',
    d: 'Aktifkan untuk menyederhanakan node otomatis 1 kali dengan presisi kurva 100% saat objek SVG diimpor atau ditempel (Default: Mati).'
  },
  veSimplifyAllCanvas: {
    t: 'Auto-Simplify Semua Objek (100%)',
    d: 'Menyederhanakan node berlebih pada seluruh objek kanvas dengan presisi kurva 100% tepat 1 kali.'
  },
  veSimplifyLevel: {
    t: 'Simplify Slider (0–100)',
    d: 'Kiri (0) = paling sedikit anchor point (32 pt); Tengah (50) = 1 pt; Kanan (100) = paling rapat ke path asli (1/32 pt).'
  },
  veSimplifyMore: {
    t: 'More Options…',
    d: 'Buka dialog Simplify lengkap (Tolerance, Corner Point Angle Threshold, Convert to Straight Lines, Show Original Path).'
  },
  veSimplifyAngle: {
    t: 'Corner Point Angle Threshold',
    d: 'Sudut di bawah ambang ini (0°–180°, default 150° → belokan > 30°) dipertahankan sebagai sudut tajam.'
  },
  veSimplifyStraight: {
    t: 'Convert to Straight Lines',
    d: 'Menghasilkan segmen garis lurus saja menggunakan reduksi polilin Ramer–Douglas–Peucker (RDP).'
  },
  veSimplifyOrig: {
    t: 'Show Original Path',
    d: 'Tampilkan kontur path asli sebelum Simplify di bawah pratinjau kanvas.'
  },
  veSimplifyRetain: {
    t: 'Open this dialog with these settings next time',
    d: 'Langsung membuka dialog Simplify penuh dengan pengaturan ini pada pemanggilan berikutnya.'
  },
  veColorText: {
    t: 'Nilai warna',
    d: 'Ketik warna CSS: hex (#e11d48), nama (red), rgb() atau hsl(). Tekan Enter untuk menerapkan, Esc untuk membatalkan.'
  },
  veFillRule: {
    t: 'Fill rule',
    d: 'Aturan untuk menentukan area mana yang terisi saat path saling tumpang tindih atau berlubang.'
  },
  veFillNonzero: {
    t: 'Nonzero',
    d: 'Semua area di dalam kontur terisi, tergantung arah gambar path.',
    w: 'Bentuk biasa tanpa lubang, atau lubang yang arahnya sudah benar.'
  },
  veFillEvenodd: {
    t: 'Even-odd',
    d: 'Area yang dilingkupi kontur berjumlah ganjil terisi, genap berlubang, tanpa peduli arah path.',
    w: 'Huruf, cincin, atau bentuk dengan lubang yang tidak muncul.'
  },
  veCornerCirc: {
    t: 'Circular',
    d: 'Sudut dibulatkan dengan busur lingkaran presisi.'
  },
  veAnomFilter: {
    t: 'Kategori anomali',
    d: 'Menyaring daftar dan penanda di canvas: Sudut (node menumpuk), Kolinier (node redundan), Meleyot (garis bergelombang), Faset (lengkung patah), Arc (arc terlalu padat).'
  },
  veAnomList: {
    t: 'Daftar anomali',
    d: 'Anomali geometri yang ditemukan pada path, sesuai kategori yang dipilih.'
  },
  veStats: {
    t: 'Statistik dokumen',
    d: 'Jumlah objek, total node, dan objek atau node yang sedang dipilih.'
  },
  veZoomPct: {
    t: 'Level zoom',
    d: 'Persentase pembesaran canvas saat ini. 100% = ukuran asli.'
  },
  veAppear: {
    t: 'Appearance',
    d: 'Properti tampilan objek terpilih. Jika beberapa objek dipilih, perubahan berlaku untuk semuanya.'
  },
  veLayers: {
    t: 'Daftar layer',
    d: 'Objek diurutkan dari paling depan di atas. Klik untuk memilih, Shift atau Ctrl untuk multi-seleksi.'
  },
  cpSV: {
    t: 'Saturasi & kecerahan',
    d: 'Seret untuk mengatur kepekatan (kiri ke kanan) dan kecerahan (bawah ke atas) warna.'
  },
  cpHue: {
    t: 'Hue',
    d: 'Geser untuk memilih rona warna dasar. Panah keyboard menggeser 1 derajat.'
  },
  cpPipette: {
    t: 'Pipet warna',
    d: 'Ambil warna dari mana saja di layar. Di browser tanpa dukungan pipet bawaan, pipet mengambil warna elemen SVG, canvas, atau gambar di halaman. Esc untuk batal.'
  },
  cpHex: {
    t: 'Kode hex',
    d: 'Ketik 6 digit hex warna (tanpa #). Diterapkan otomatis saat lengkap.'
  },
  /* --- Multi-Snap & Checklist --- */
  veSnapMenu: {
    t: 'Checklist fitur snap',
    d: 'Pilih target snap mana saja yang aktif saat menggeser objek, node, atau handle.',
    w: 'Matikan opsi tertentu jika kursor terasa terlalu sering menempel di area padat.'
  },
  veSnapPresetDef: {
    t: 'Preset bawaan',
    d: 'Mengembalikan checklist ke pengaturan bawaan: Smart Guides, Jarak Sama Rata, Artboard, Node, Midpoint, Kontur, dan Siku aktif; Sumbu Node, Grid, dan Piksel mati.'
  },
  veSnapPresetAll: {
    t: 'Aktifkan semua',
    d: 'Mengaktifkan seluruh target snap dari Smart Guides sampai Grid untuk presisi maksimum. Pembulatan piksel tidak diubah.'
  },
  veSnapPresetMin: {
    t: 'Mode minimal',
    d: 'Hanya menempel ke titik node & handle; panduan kotak, jarak, dan target lain dimatikan.',
    w: 'Saat snap lain terasa mengganggu dan Anda hanya butuh kunci ke node.'
  },
  veSnap_bbox: {
    t: 'Smart Guides (Kotak & Pusat)',
    d: 'Menempel ke tepi kiri, kanan, atas, bawah, serta titik tengah kotak pembatas objek lain.'
  },
  veSnap_spacing: {
    t: 'Jarak Sama Rata (Equal Spacing)',
    d: 'Mendeteksi dan mengunci jarak kosong yang sama persis di antara 3 objek atau lebih yang sejajar.'
  },
  veSnap_artboard: {
    t: 'Tepi & Pusat Artboard',
    d: 'Menempel ke batas pinggir serta garis tengah horizontal dan vertikal kanvas (viewBox).'
  },
  veSnap_node: {
    t: 'Titik Node & Handle',
    d: 'Menempel langsung (kunci 2D) ke titik node atau ujung handle Bézier milik objek lain.'
  },
  veSnap_axial: {
    t: 'Sejajar Sumbu Node (X/Y)',
    d: 'Menampilkan garis bantu saat posisi X atau Y sejajar lurus dengan node lain atau pangkal handle sendiri.'
  },
  veSnap_midpoint: {
    t: 'Titik Tengah Segmen (Midpoint)',
    d: 'Menempel ke titik tengah dari setiap segmen garis maupun kurva Bézier.'
  },
  veSnap_edge: {
    t: 'Kontur / Tepi Path',
    d: 'Menempelkan node atau objek tepat menyentuh garis tepi (kontur) objek lain.'
  },
  veSnap_perp: {
    t: 'Siku (90°) & Perpanjangan Garis',
    d: 'Mengunci gerakan node pada sudut siku-siku (90°) atau perpanjangan lurus dari segmen tetangganya.'
  },
  veSnap_grid: {
    t: 'Garis Grid Adaptif',
    d: 'Menempel ke persimpangan dan garis grid. Butuh tombol Grid di toolbar dalam keadaan aktif.'
  },
  veSnap_pixel: {
    t: 'Bulatkan ke Piksel (1 px)',
    d: 'Membulatkan koordinat akhir ke bilangan bulat terdekat agar hasil tajam di layar resolusi rendah.'
  },
  /* --- Sejajarkan Node & Sudut --- */
  veCurAngle: {
    t: 'Sudut garis saat ini',
    d: 'Kemiringan garis antara node pertama dan terakhir yang dipilih (0° = mendatar, 90° = tegak).'
  },
  veAlMode: {
    t: 'Mode sudut sejajar',
    d: 'Cara menentukan arah garis target saat menyejajarkan 2 node atau lebih.'
  },
  veAlAuto: {
    t: 'Auto',
    d: 'Menentukan garis lurus terbaik dari posisi node terpilih, lalu otomatis mengunci ke mendatar/tegak jika kemiringannya sangat kecil.',
    w: 'Garis yang hampir lurus dan Anda tidak ingin menentukan sudut sendiri.'
  },
  veAlCustom: {
    t: 'Derajat kustom',
    d: 'Menyejajarkan node mengikuti sudut derajat pilihan Anda (slider atau preset).'
  },
  veAlPerp: {
    t: 'Siku-siku (⊥ 90°)',
    d: 'Menyejajarkan node agar tegak lurus (90°) terhadap arah rata-rata batang/sisi di kiri-kanannya.',
    w: 'Merapikan ujung potongan garis atau kaki huruf yang miring.'
  },
  veAlPar: {
    t: 'Sejajar sisi seberang (∥)',
    d: 'Menyejajarkan node agar paralel dengan segmen di sisi seberangnya pada subpath yang sama (butuh minimal 4 node).'
  },
  veAlDeg: {
    t: 'Sudut garis (derajat)',
    d: 'Atur kemiringan garis target dari -180° hingga 180° (0° = mendatar, 90° = tegak). Perubahan langsung diterapkan pada node terpilih.'
  },
  veAlPreset: {
    t: 'Preset derajat cepat',
    d: 'Klik untuk langsung menyejajarkan node terpilih ke sudut standar ini.'
  },
  veAlAnchor: {
    t: 'Titik patokan (Anchor)',
    d: 'Menentukan titik mana yang tetap diam sebagai poros perataan garis.'
  },
  veAlAncCenter: {
    t: 'Patokan tengah',
    d: 'Garis perataan melewati titik tengah semua node terpilih.'
  },
  veAlAncFirst: {
    t: 'Patokan node awal',
    d: 'Node pertama dalam urutan path tetap diam; node lainnya menyesuaikan.'
  },
  veAlAncLast: {
    t: 'Patokan node akhir',
    d: 'Node terakhir dalam urutan path tetap diam; node lainnya menyesuaikan.'
  },
  veAlSlide: {
    t: 'Cara geser node ujung',
    d: 'Menentukan jalur pergeseran node ujung saat diratakan.'
  },
  veAlSlideOn: {
    t: 'Ikuti rel sisi (Edge-Sliding)',
    d: 'Node ujung digeser mengikuti perpanjangan garis sisi tetangganya, sehingga ketebalan dan kemiringan batang di sampingnya tidak berubah.',
    w: 'Meratakan ujung pita, balok miring, atau kaki huruf.'
  },
  veAlSlideOff: {
    t: 'Proyeksi tegak lurus',
    d: 'Node dijatuhkan langsung secara tegak lurus ke garis target.'
  },
  veAlCollapse: {
    t: 'Node perantara',
    d: 'Perlakuan terhadap node tengah saat Anda memilih 3 node atau lebih secara berurutan.'
  },
  veAlKeep: {
    t: 'Pertahankan',
    d: 'Node di antara dua ujung tetap ada dan ikut diratakan ke garis target.'
  },
  veAlMerge: {
    t: 'Lebur jadi 2 ujung',
    d: 'Node perantara dihapus sehingga rantai menjadi satu segmen lurus antara node awal dan akhir.',
    w: 'Mengurangi jumlah node pada sisi yang sudah lurus.'
  },
  /* --- Radius Sudut & Preset Node --- */
  veCornerSq: {
    t: 'Squircle',
    d: 'Sudut dibulatkan dengan handle Bézier lebih panjang sehingga transisi lebih lembut. Atur dengan slider Kehalusan.'
  },
  veCornerChamfer: {
    t: 'Bevel (Chamfer)',
    d: 'Memotong sudut tajam menjadi garis miring lurus (tanpa lengkungan handle).'
  },
  veRadiusPreset: {
    t: 'Preset radius cepat',
    d: 'Klik untuk langsung menerapkan ukuran radius ini pada sudut terpilih (Tajam = kembalikan ke 0).'
  },
  veBevelDeg: {
    t: 'Preset sudut bukaan',
    d: 'Mengatur proporsi jarak titik potong sudut sesuai derajat bukaan (Auto = mengikuti sudut asli geometri).'
  },
  /* --- Pustaka Bentuk & Menu Klik Kanan --- */
  veShapeItem: {
    t: 'Bentuk',
    d: 'Seret di kanvas untuk menggambar, atau klik sekali untuk ukuran bawaan. Tahan Shift agar proporsi 1:1.'
  },
  veCtxFlatten: {
    k: 'Ctrl + E',
    t: 'Flatten',
    d: 'Menggabungkan 2 objek atau lebih menjadi satu path (atribut mengikuti objek paling atas). Jika hanya satu objek di dalam grup, objek dilepas dari grupnya.',
    w: 'Membuat lubang/gabungan bentuk dari beberapa path.'
  },
  veCtxGroup: {
    k: 'Ctrl + G',
    t: 'Group',
    d: 'Mengelompokkan 2 objek atau lebih agar terpilih dan bergerak bersama. Menekan Ctrl+G pada satu grup utuh tetap melepasnya (kompatibel dengan versi lama).'
  },
  veSelSameFill: {
    t: 'Select Same Fill',
    d: 'Memilih semua objek lain yang warna fill-nya sama dengan objek terpilih pertama (teks ikut bila fill-nya sama; objek terkunci, tersembunyi, gambar, dan gradien dilewati).'
  },
  veSelSameStroke: {
    t: 'Select Same Stroke',
    d: 'Memilih semua objek lain yang warna stroke-nya sama dengan objek terpilih pertama (objek terkunci, tersembunyi, dan gambar dilewati).'
  },
  veSelSameType: {
    t: 'Select Same Type',
    d: 'Memilih semua objek lain yang tipenya sama dengan objek terpilih pertama (path, teks, gambar, atau frame; objek terkunci dan tersembunyi dilewati).'
  },
  veCtxUngroup: {
    k: 'Ctrl + Shift + G',
    t: 'Ungroup',
    d: 'Melepas grup atau Frame dari objek terpilih: seluruh child element dikeluarkan ke kanvas dan tetap terpilih (kotak latar Frame ikut dihapus). Seleksi sebagian anggota pun melepas induknya.',
    w: 'Mengedit satu objek di dalam grup tanpa mengubah yang lain.'
  },
  /* --- Multi-Format Ekspor & Lainnya --- */
  veExpFmt: {
    t: 'Format ekspor & salin',
    d: 'Pilih format berkas: vektor murni (SVG, AI, EPS, PS) atau gambar raster (PNG, JPG, WEBP).'
  },
  veExp_svg: {
    t: 'SVG',
    d: 'Vektor SVG murni; ukuran tetap tajam di semua skala dan bisa dibuka lagi di sini tanpa kehilangan data.'
  },
  veExp_png: {
    t: 'PNG',
    d: 'Gambar raster dengan transparansi. Pilih skala resolusi di bawahnya.'
  },
  veExp_jpg: {
    t: 'JPG',
    d: 'Gambar raster terkompresi tanpa transparansi; latar otomatis putih (atau warna latar solid).'
  },
  veExp_webp: {
    t: 'WEBP',
    d: 'Gambar raster modern berukuran kecil dengan dukungan transparansi.'
  },
  veExp_ai: {
    t: 'Adobe Illustrator (.AI)',
    d: 'Berkas PDF-1.4 berekstensi .ai plus data round-trip Geovanta agar lossless saat dibuka kembali di sini.'
  },
  veExp_eps: {
    t: 'EPS (PostScript)',
    d: 'PostScript EPSF-3.0 untuk alur kerja cetak dan aplikasi desain lama.'
  },
  veExpScale: {
    t: 'Skala resolusi raster',
    d: 'Pengali resolusi saat mengekspor ke PNG, JPG, atau WEBP. 2x dan 4x menghasilkan gambar jauh lebih tajam (supersampling).'
  },
  veExpS_1: {
    t: '1x',
    d: 'Ukuran asli sesuai viewBox; file paling kecil.'
  },
  veExpS_2: {
    t: '2x (HD)',
    d: 'Resolusi dua kali lipat; cocok untuk layar retina dan web.'
  },
  veExpS_4: {
    t: '4x (Ultra)',
    d: 'Resolusi empat kali lipat; file besar dan lebih lambat diproses.',
    w: 'Untuk cetak atau gambar yang akan diperbesar.'
  },
  setTabUmum: {
    t: 'Pengaturan umum',
    d: 'Tema warna, animasi, tooltip, dan penyimpanan preferensi.'
  },
  setTabKeys: {
    t: 'Pintasan keyboard',
    d: 'Daftar lengkap seluruh pintasan keyboard Vector Editor.'
  },
  setTabTech: {
    t: 'Teknologi & arsitektur',
    d: 'Daftar pustaka dan API browser yang digunakan.'
  },
  /* --- Alignment, Transform & Auto Layout (v4.4) --- */
  veAlnPanel: {
    t: 'Alignment & Distribusi',
    d: 'Meratakan dan mendistribusikan objek. Satu objek diratakan ke Artboard, dua objek atau lebih ke kotak pembatas seleksi, dan dua node atau lebih ke kotak pembatas node.'
  },
  veAlnLeft: {
    t: 'Rata kiri',
    d: 'Menggeser objek (atau node) agar tepi kirinya sejajar dengan tepi kiri acuan.'
  },
  veAlnHC: {
    t: 'Rata tengah horizontal',
    d: 'Menyejajarkan titik tengah horizontal dengan titik tengah acuan.'
  },
  veAlnRight: {
    t: 'Rata kanan',
    d: 'Menggeser objek (atau node) agar tepi kanannya sejajar dengan tepi kanan acuan.'
  },
  veAlnTop: {
    t: 'Rata atas',
    d: 'Menggeser objek (atau node) agar tepi atasnya sejajar dengan tepi atas acuan.'
  },
  veAlnVC: {
    t: 'Rata tengah vertikal',
    d: 'Menyejajarkan titik tengah vertikal dengan titik tengah acuan.'
  },
  veAlnBottom: {
    t: 'Rata bawah',
    d: 'Menggeser objek (atau node) agar tepi bawahnya sejajar dengan tepi bawah acuan.'
  },
  veAlnDistH: {
    t: 'Distribusi horizontal',
    d: 'Membuat celah kosong antar objek sama rata dari kiri ke kanan. Objek paling kiri dan paling kanan tetap di tempat.',
    w: 'Butuh minimal 3 objek.'
  },
  veAlnDistV: {
    t: 'Distribusi vertikal',
    d: 'Membuat celah kosong antar objek sama rata dari atas ke bawah. Objek paling atas dan paling bawah tetap di tempat.',
    w: 'Butuh minimal 3 objek.'
  },
  veXfPanel: {
    t: 'Transform',
    d: 'Atur posisi (X, Y), ukuran (W, H), dan rotasi seleksi dengan angka presisi. Titik poros 9-titik menentukan acuan pengukuran.'
  },
  veXfX: {
    t: 'Posisi X',
    d: 'Koordinat horizontal titik poros pada kotak pembatas seleksi. Ketik angka lalu Enter; panah atas/bawah = ±1 (Shift = ±10).'
  },
  veXfY: {
    t: 'Posisi Y',
    d: 'Koordinat vertikal titik poros pada kotak pembatas seleksi. Ketik angka lalu Enter; panah atas/bawah = ±1 (Shift = ±10).'
  },
  veXfW: {
    t: 'Lebar (W)',
    d: 'Lebar kotak pembatas seleksi. Objek diskalakan terhadap titik poros; bentuk kurva dan handle ikut berubah proporsional.',
    w: 'Tidak tersedia saat mengedit node.'
  },
  veXfH: {
    t: 'Tinggi (H)',
    d: 'Tinggi kotak pembatas seleksi. Objek diskalakan terhadap titik poros; bentuk kurva dan handle ikut berubah proporsional.',
    w: 'Tidak tersedia saat mengedit node.'
  },
  veXfRot: {
    t: 'Rotasi (°)',
    d: 'Sudut putar objek, dari -180° hingga 180°. Sudut tercatat pada objek sehingga tetap terbaca setelah diputar. Pada seleksi banyak objek, nilai dianggap putaran relatif dari 0°.',
    w: 'Tidak tersedia saat mengedit node.'
  },
  veXfLock: {
    t: 'Kunci proporsi',
    d: 'Saat aktif, mengubah W otomatis mengubah H dengan rasio yang sama (dan sebaliknya).'
  },
  veXfFlipH: {
    t: 'Flip horizontal',
    d: 'Mencerminkan seleksi kiri-kanan terhadap titik pusat (atau titik poros).'
  },
  veXfFlipV: {
    t: 'Flip vertikal',
    d: 'Mencerminkan seleksi atas-bawah terhadap titik pusat (atau titik poros).'
  },
  veXfPin: {
    t: 'Titik poros 9-titik',
    d: 'Memilih titik acuan pada kotak pembatas: dipakai untuk membaca X/Y, sebagai titik diam saat W/H diubah, dan sebagai pusat putar bila "Poros" dipilih.'
  },
  veXfPivot: {
    t: 'Pusat putar & flip',
    d: 'Menentukan titik tetap saat memutar atau mencerminkan seleksi.'
  },
  veXfPivC: {
    t: 'Dari pusat',
    d: 'Memutar dan mencerminkan terhadap titik tengah kotak pembatas.'
  },
  veXfPivP: {
    t: 'Dari titik poros',
    d: 'Memutar dan mencerminkan terhadap titik poros 9-titik yang sedang dipilih.'
  },
  veXfStroke: {
    t: 'Skala stroke',
    d: 'Saat aktif, ketebalan stroke ikut diskalakan ketika W/H diubah. Saat mati, ketebalan stroke tetap.'
  },
  veLayPanel: {
    t: 'Auto Layout & Padding',
    d: 'Menata objek terpilih dalam baris, kolom, atau grid dengan jarak (gap), perataan, padding 4 sisi, dan frame latar otomatis. Setelah diterapkan, mengubah kontrol di sini langsung menata ulang.'
  },
  veLayDir: {
    t: 'Arah tata letak',
    d: 'Menentukan bagaimana objek disusun.'
  },
  veLayRow: {
    t: 'Baris (→)',
    d: 'Semua objek disusun mendatar dari kiri ke kanan.'
  },
  veLayCol: {
    t: 'Kolom (↓)',
    d: 'Semua objek disusun menurun dari atas ke bawah.'
  },
  veLayWrap: {
    t: 'Grid (⊞)',
    d: 'Objek disusun mendatar lalu turun ke baris berikutnya setiap kali jumlah kolom tercapai.'
  },
  veLayCols: {
    t: 'Kolom per baris',
    d: 'Jumlah objek maksimum dalam satu baris pada mode Grid.',
    up: 'Ingin grid lebih lebar dan lebih sedikit baris.',
    dn: 'Ingin grid lebih sempit dan lebih tinggi.'
  },
  veLayGap: {
    t: 'Gap antar objek',
    d: 'Jarak kosong antar objek yang berdampingan.',
    up: 'Objek terlihat terlalu rapat.',
    dn: 'Ingin susunan lebih padat.'
  },
  veLayPad: {
    t: 'Padding',
    d: 'Jarak kosong antara frame dan objek di dalamnya. Mode Simetris memakai satu nilai untuk keempat sisi.'
  },
  veLayPadMode: {
    t: 'Mode padding',
    d: 'Simetris = satu nilai untuk semua sisi. 4 sisi = atur atas, kanan, bawah, dan kiri sendiri-sendiri.'
  },
  veLayPadT: {
    t: 'Padding atas (T)',
    d: 'Jarak frame ke objek paling atas.'
  },
  veLayPadR: {
    t: 'Padding kanan (R)',
    d: 'Jarak frame ke objek paling kanan.'
  },
  veLayPadB: {
    t: 'Padding bawah (B)',
    d: 'Jarak frame ke objek paling bawah.'
  },
  veLayPadL: {
    t: 'Padding kiri (L)',
    d: 'Jarak frame ke objek paling kiri.'
  },
  veLayAlign: {
    t: 'Perataan 9-titik',
    d: 'Menentukan posisi objek di dalam baris atau kolomnya saat ukurannya berbeda-beda: kiri/tengah/kanan dan atas/tengah/bawah.'
  },
  veLayFrame: {
    t: 'Frame latar',
    d: 'Membuat persegi latar otomatis di belakang objek, selebar isi ditambah padding. Mematikannya akan menghapus frame otomatis tersebut.',
    w: 'Kartu, tombol, atau grup ikon yang butuh latar.'
  },
  veLayRadius: {
    t: 'Radius frame',
    d: 'Kebulatan sudut frame latar otomatis.'
  },
  veLayBucket: {
    t: 'Gabung Warna',
    d: 'Objek berwarna sama di dalam satu Frame/Group digabung menjadi satu baris. Klik baris itu untuk memilih semuanya, lalu ubah fill, stroke, dan radius sekaligus.'
  },
  veFrameTool: {
    k: 'F',
    t: 'Frame',
    d: 'Seret di kanvas untuk menggambar Frame; objek yang pusatnya berada di dalam area otomatis masuk ke Frame. Klik sekali: membungkus objek terpilih ke dalam Frame (atau membuat Frame kosong bila tak ada seleksi).',
    w: 'Membuat wadah/artboard kecil ala Figma yang bisa dipakai untuk Auto Layout.'
  },
  veFrameAuto: {
    t: 'Frame → Auto Layout',
    d: 'Mengubah Frame dari objek terpilih menjadi Auto Layout. Arah (baris/kolom/wrap), gap dan padding disimpulkan dari posisi objek sekarang agar tidak melompat.'
  },
  veLayApply: {
    t: 'Terapkan Auto Layout',
    d: 'Menata objek terpilih sesuai pengaturan di atas. Setelah itu, mengubah gap, padding, arah, atau perataan langsung menata ulang selama seleksi yang sama masih aktif.'
  },
  veLayArtboard: {
    t: 'Padding ke Artboard',
    d: 'Mengubah ukuran Artboard (viewBox) agar mengelilingi objek terpilih, atau seluruh konten bila tidak ada yang dipilih, dengan padding 4 sisi di atas.',
    w: 'Merapikan ruang kosong sebelum ekspor.'
  },
  /* ---- Migrasi tooltip sederhana (title=) ke tooltip kustom ---- */
  veBackWorkspace: {
    t: 'Kembali ke Workspace',
    d: 'Kembali ke daftar proyek. Proyek tersimpan otomatis.'
  },
  veRenameProject: {
    t: 'Ganti Nama Proyek',
    d: 'Klik untuk mengganti nama proyek.'
  },
  veSimpBadge: {
    t: 'Anchor Points',
    d: 'Jumlah anchor point sebelum dan sesudah simplify.'
  },
  veUndo: {
    k: 'Ctrl + Z',
    t: 'Undo',
    d: 'Membatalkan perubahan terakhir.'
  },
  veRedo: {
    k: 'Ctrl + Y',
    t: 'Redo',
    d: 'Mengulangi perubahan yang dibatalkan.'
  },
  veToggleHidden: {
    k: 'Ctrl + Shift + H',
    t: 'Tampilkan / Sembunyikan Layer',
    d: 'Menampilkan atau menyembunyikan layer terpilih.'
  },
  vePipetteFill: {
    t: 'Pipet Warna Fill',
    d: 'Mengambil sampel warna dari kanvas untuk fill.'
  },
  vePipetteStroke: {
    t: 'Pipet Warna Stroke',
    d: 'Mengambil sampel warna dari kanvas untuk stroke.'
  },
  veSimpCancel: {
    k: 'Esc',
    t: 'Batalkan Simplify',
    d: 'Membatalkan simplify tanpa menerapkan perubahan.'
  },
  veAlphaPct: {
    t: 'Transparansi (%)',
    d: 'Tingkat transparansi warna dalam persen.'
  },
  veNoColor: {
    t: 'Hapus Warna (No Color)',
    d: 'Menghapus warna / menyetel ke None (transparan penuh).'
  },
  veRangeScrub: {
    t: 'Geser Nilai',
    d: 'Seret kiri/kanan untuk mengubah nilai.'
  },
  veRangeType: {
    t: 'Ketik Angka',
    d: 'Klik untuk mengetik angka langsung.'
  },
  veStorageInfo: {
    t: 'Informasi Penyimpanan Lokal',
    d: 'Melihat pemakaian penyimpanan lokal (IndexedDB).'
  },
  veClearSearch: {
    t: 'Bersihkan Pencarian',
    d: 'Menghapus teks pencarian.'
  },
  veSaveOk: {
    t: 'Status Penyimpanan',
    d: 'Status penyimpanan proyek lokal (IndexedDB).'
  },
  veSaveError: {
    t: 'Gagal Menyimpan',
    d: 'Klik untuk mencoba menyimpan kembali.'
  },
  veLayerText: {
    t: 'Objek Teks SVG',
    d: 'Layer ini adalah objek teks SVG.'
  },
  veLayerImage: {
    t: 'Objek Gambar',
    d: 'Layer ini adalah objek gambar.'
  },
  veLayerShape: {
    t: 'Pratinjau Bentuk SVG',
    d: 'Layer ini adalah bentuk SVG.'
  },
  veSidebarHide: {
    t: 'Sembunyikan Panel Layer',
    d: 'Menyembunyikan panel layer di sisi kiri.'
  },
  veSidebarShow: {
    t: 'Tampilkan Panel Layer',
    d: 'Menampilkan panel layer di sisi kiri.'
  },
  veRightSidebarHide: {
    t: 'Sembunyikan Panel Properti',
    d: 'Menyembunyikan panel properti di sisi kanan.'
  },
  veRightSidebarShow: {
    t: 'Tampilkan Panel Properti',
    d: 'Menampilkan panel properti di sisi kanan.'
  },
  veFavAdd: {
    t: 'Tambahkan ke Favorit',
    d: 'Menandai proyek ini sebagai favorit.'
  },
  veFavRemove: {
    t: 'Hapus dari Favorit',
    d: 'Menghapus proyek ini dari favorit.'
  },
  veResizePanel: {
    t: 'Ubah Lebar Panel',
    d: 'Seret untuk mengubah lebar panel. Klik ganda = reset ke lebar awal.'
  },
  setLang: {
    t: 'Bahasa Antarmuka',
    d: 'Bahasa untuk tab Pengaturan: Indonesia atau English.',
    w: 'Berlaku langsung dan diingat di browser lokal.'
  },
  /* ---- Kunci data-tip yang dipakai tapi belum ada di katalog ---- */
  layLock: {
    t: 'Kunci Layer',
    d: 'Mengunci layer ini agar tidak bisa dipilih atau diubah.'
  },
  layUnlock: {
    t: 'Buka Kunci Layer',
    d: 'Membuka kunci layer ini.'
  },
  layHide: {
    t: 'Sembunyikan Layer',
    d: 'Menyembunyikan layer ini dari kanvas.'
  },
  layShow: {
    t: 'Tampilkan Layer',
    d: 'Menampilkan kembali layer ini di kanvas.'
  },
  layEject: {
    t: 'Keluarkan dari Grup',
    d: 'Mengeluarkan layer ini dari grup/frame induknya.'
  },
  layEjectBucket: {
    t: 'Keluarkan Grup Warna',
    d: 'Mengeluarkan semua objek warna ini dari grupnya.'
  },
  layOpenFrame: {
    t: 'Buka Frame',
    d: 'Menampilkan isi frame/grup di daftar layer.'
  },
  layCloseFrame: {
    t: 'Tutup Frame',
    d: 'Menyembunyikan isi frame/grup di daftar layer.'
  },
  layFrameBg: {
    t: 'Latar Frame',
    d: 'Objek latar frame. Klik untuk memilihnya.'
  },
  layFrameLock: {
    t: 'Kunci Semua Isi',
    d: 'Mengunci semua objek di dalam grup/frame ini.'
  },
  layFrameUnlock: {
    t: 'Buka Kunci Semua Isi',
    d: 'Membuka kunci semua objek di dalam grup/frame ini.'
  },
  layFrameHide: {
    t: 'Sembunyikan Semua Isi',
    d: 'Menyembunyikan semua objek di dalam grup/frame ini.'
  },
  layFrameShow: {
    t: 'Tampilkan Semua Isi',
    d: 'Menampilkan semua objek di dalam grup/frame ini.'
  },
  uiClose: {
    t: 'Tutup',
    d: 'Menutup jendela ini.'
  },
  veShapePicker: {
    t: 'Pilih bentuk',
    d: 'Membuka daftar bentuk: persegi, lingkaran, segitiga, dan lainnya.'
  },
  wsCardMenu: {
    t: 'Menu tindakan proyek',
    d: 'Buka, ganti nama, duplikat, atau hapus proyek ini.'
  }
};
/* ---------- Overlay English untuk tooltip di tab Pengaturan ----------
   Hanya kunci yang dipakai di tab Pengaturan; kunci lain tetap memakai TIPS. */
const TIPS_EN: Record<string, any> = {
  setTheme: {
    t: 'Theme',
    d: 'Interface colors: follow system, light, or dark.'
  },
  setMotion: {
    t: 'Animation',
    d: 'Controls UI animation and transitions.',
    w: 'Turn off if you experience lag or prefer a calm interface.'
  },
  setTips: {
    t: 'Tooltips',
    d: 'Shows hints when hovering over a control.',
    w: 'Turn off once you are fluent with the app.'
  },
  setPersist: {
    t: 'Save preferences',
    d: 'Saves theme, animation, and UI preferences in the browser (localStorage).'
  },
  setReset: {
    t: 'Reset settings',
    d: 'Restores all app preferences to their defaults.'
  },
  setAbout: {
    t: 'About',
    d: 'App version and technical information.'
  },
  setTabUmum: {
    t: 'General tab',
    d: 'Interface theme, animation, tooltips, and preference storage.'
  },
  setTabKeys: {
    t: 'Shortcuts tab',
    d: 'Full list of all Vector Editor keyboard shortcuts.'
  },
  setLang: {
    t: 'Interface Language',
    d: 'Language for this Settings tab: Indonesian or English.',
    w: 'Applies immediately and is remembered in the local browser.'
  },
  closeDlg: {
    k: 'Esc',
    t: 'Close',
    d: 'Closes this panel.'
  },
  help: {
    k: '?',
    t: 'Keyboard shortcuts',
    d: 'Shows the list of all keyboard shortcuts.'
  },
  uiClose: {
    t: 'Close',
    d: 'Closes this window.'
  },
  veShapePicker: {
    t: 'Choose shape',
    d: 'Opens the shape list: rectangle, circle, triangle, and more.'
  },
  wsCardMenu: {
    t: 'Project actions menu',
    d: 'Open, rename, duplicate, or delete this project.'
  },
  cpHex: {
    t: 'Hex code',
    d: 'Type the 6-digit hex color (without #). Applied automatically when complete.'
  },
  cpHue: {
    t: 'Hue',
    d: 'Drag to pick the base color hue. Arrow keys shift by 1 degree.'
  },
  cpPipette: {
    t: 'Color pipette',
    d: 'Pick a color from anywhere on the screen. In browsers without a built-in pipette, it samples SVG elements, canvas, or images on the page. Esc to cancel.'
  },
  cpSV: {
    t: 'Saturation & brightness',
    d: 'Drag to set saturation (left to right) and brightness (bottom to top) of the color.'
  },
  layCloseFrame: {
    t: 'Close Frame',
    d: 'Hides the frame/group contents in the layer list.'
  },
  layEject: {
    t: 'Remove from Group',
    d: 'Removes this layer from its parent group/frame.'
  },
  layEjectBucket: {
    t: 'Remove Color Group',
    d: 'Removes all objects of this color from their group.'
  },
  layFrameBg: {
    t: 'Frame Background',
    d: 'Frame background object. Click to select it.'
  },
  layFrameHide: {
    t: 'Hide All Contents',
    d: 'Hides all objects inside this group/frame.'
  },
  layFrameLock: {
    t: 'Lock All Contents',
    d: 'Locks all objects inside this group/frame.'
  },
  layFrameShow: {
    t: 'Show All Contents',
    d: 'Shows all objects inside this group/frame.'
  },
  layFrameUnlock: {
    t: 'Unlock All Contents',
    d: 'Unlocks all objects inside this group/frame.'
  },
  layHide: {
    t: 'Hide Layer',
    d: 'Hides this layer from the canvas.'
  },
  layLock: {
    t: 'Lock Layer',
    d: 'Locks this layer so it cannot be selected or changed.'
  },
  layOpenFrame: {
    t: 'Open Frame',
    d: 'Shows the frame/group contents in the layer list.'
  },
  layShow: {
    t: 'Show Layer',
    d: 'Shows this layer on the canvas again.'
  },
  layUnlock: {
    t: 'Unlock Layer',
    d: 'Unlocks this layer.'
  },
  setTabTech: {
    t: 'Technology & architecture',
    d: 'List of libraries and browser APIs used.'
  },
  settings: {
    k: ',',
    t: 'Settings',
    d: 'Theme, animations, UI preferences, and app options.',
    w: 'Change the look or behavior of the app.'
  },
  veAddHandle: {
    t: 'Add Bézier Handle',
    d: 'Hover over a node (a ring and handle preview appear), then click to add a Bézier handle to that node. Handles follow the line direction around the node; drag after clicking to set their length and direction right away. Nodes that already have complete handles do not change.',
    w: 'Turning a straight corner into a curve, or adding a missing handle to a node at a path end.'
  },
  veAddNode: {
    t: 'Add Node',
    d: 'Hover over any object line, then click to add a node at that point. Drag after clicking to move it right away. Snaps to segment midpoints, grid lines, and other objects nodes and edges. Hold Alt to disable snapping.',
    w: 'When you need an extra node at a precise spot.'
  },
  veAhAddAll: {
    t: 'Add handles to all',
    d: 'Adds Bézier handles to all objects without changing their shape.'
  },
  veAhAddSel: {
    t: 'Add handles to selected',
    d: 'Adds Bézier handles to the selected object or nodes without changing their shape (handles placed at 1/3 and 2/3 of each segment).'
  },
  veAhAngle: {
    t: 'Skip sharp corners',
    d: 'Nodes whose included angle is smaller than this value are left untouched, so sharp corners stay sharp.'
  },
  veAhDelAll: {
    t: 'Delete all handles',
    d: 'Removes handles on all objects.'
  },
  veAhDelSel: {
    t: 'Delete selected handles',
    d: 'Removes handles on the selected object so its segments become straight lines.'
  },
  veAhScopeObj: {
    t: 'Scope: whole object',
    d: 'Clicking on the canvas affects all subpaths inside the clicked object.'
  },
  veAhScopeSub: {
    t: 'Scope: subpath',
    d: 'Clicking on the canvas only affects the clicked subpath.'
  },
  veAhTension: {
    t: 'Tension (τ)',
    d: 'Handle length relative to the distance between nodes. 0 = sharp corner, 0.33 = standard Hermite, 0.5 = very round.'
  },
  veAlAncCenter: {
    t: 'Center anchor',
    d: 'The alignment line passes through the center of all selected nodes.'
  },
  veAlAncFirst: {
    t: 'First node anchor',
    d: 'The first node in path order stays fixed; the other nodes adjust.'
  },
  veAlAncLast: {
    t: 'Last node anchor',
    d: 'The last node in path order stays fixed; the other nodes adjust.'
  },
  veAlAnchor: {
    t: 'Anchor point',
    d: 'Sets which point stays fixed as the pivot for line alignment.'
  },
  veAlAuto: {
    t: 'Auto',
    d: 'Finds the best straight line from the selected node positions, then automatically locks to horizontal/vertical when the slope is very small.',
    w: 'For a nearly straight line when you do not want to set the angle yourself.'
  },
  veAlCollapse: {
    t: 'Intermediate nodes',
    d: 'How middle nodes are treated when you select 3 or more nodes in sequence.'
  },
  veAlCustom: {
    t: 'Custom degrees',
    d: 'Aligns nodes following your chosen degree angle (slider or preset).'
  },
  veAlDeg: {
    t: 'Line angle (degrees)',
    d: 'Sets the slope of the target line from -180° to 180° (0° = horizontal, 90° = vertical). Changes apply immediately to the selected nodes.'
  },
  veAlKeep: {
    t: 'Keep',
    d: 'Nodes between the two ends stay and are flattened onto the target line together.'
  },
  veAlMerge: {
    t: 'Merge into 2 ends',
    d: 'Intermediate nodes are removed so the chain becomes one straight segment between the start and end nodes.',
    w: 'Reducing node count on sides that are already straight.'
  },
  veAlMode: {
    t: 'Parallel-angle mode',
    d: 'How the target line direction is determined when aligning 2 or more nodes.'
  },
  veAlPar: {
    t: 'Parallel to opposite side (∥)',
    d: 'Aligns nodes to be parallel with the segment on the opposite side of the same subpath (needs at least 4 nodes).'
  },
  veAlPerp: {
    t: 'Perpendicular (⊥ 90°)',
    d: 'Aligns nodes so they are perpendicular (90°) to the average direction of the stems/sides on their left and right.',
    w: 'Tidying the ends of slanted line cuts or letter legs.'
  },
  veAlPreset: {
    t: 'Quick degree preset',
    d: 'Click to align the selected nodes to this standard angle right away.'
  },
  veAlSlide: {
    t: 'How end nodes slide',
    d: 'Sets the path end nodes follow while being flattened.'
  },
  veAlSlideOff: {
    t: 'Perpendicular projection',
    d: 'Nodes are dropped straight down (perpendicular) onto the target line.'
  },
  veAlSlideOn: {
    t: 'Follow side rail (Edge-Sliding)',
    d: 'End nodes slide along the extension of the neighboring side line, so the thickness and slope of the adjacent stem do not change.',
    w: 'Flattening the end of a ribbon, slanted bar, or letter leg.'
  },
  veAlignSel: {
    t: 'Straighten selected',
    d: 'Aligns the selected nodes or Bézier handles onto one straight line. Nearly horizontal/vertical lines snap to the axis, and segments between selected nodes become straight lines.',
    w: 'A wobbly rectangle bottom edge: select the two bottom nodes (or their handles), then click.'
  },
  veAlnBottom: {
    t: 'Align bottom',
    d: 'Moves objects (or nodes) so their bottom edge lines up with the bottom edge of the reference.'
  },
  veAlnDistH: {
    t: 'Distribute horizontally',
    d: 'Makes the empty gaps between objects equal from left to right. The leftmost and rightmost objects stay in place.',
    w: 'Needs at least 3 objects.'
  },
  veAlnDistV: {
    t: 'Distribute vertically',
    d: 'Makes the empty gaps between objects equal from top to bottom. The topmost and bottommost objects stay in place.',
    w: 'Needs at least 3 objects.'
  },
  veAlnHC: {
    t: 'Align center horizontally',
    d: 'Aligns the horizontal center point with the center of the reference.'
  },
  veAlnLeft: {
    t: 'Align left',
    d: 'Moves objects (or nodes) so their left edge lines up with the left edge of the reference.'
  },
  veAlnPanel: {
    t: 'Alignment & Distribution',
    d: 'Aligns and distributes objects. One object aligns to the Artboard, two or more to the selection bounding box, and two or more nodes to the node bounding box.'
  },
  veAlnRight: {
    t: 'Align right',
    d: 'Moves objects (or nodes) so their right edge lines up with the right edge of the reference.'
  },
  veAlnTop: {
    t: 'Align top',
    d: 'Moves objects (or nodes) so their top edge lines up with the top edge of the reference.'
  },
  veAlnVC: {
    t: 'Align center vertically',
    d: 'Aligns the vertical center point with the center of the reference.'
  },
  veAlphaPct: {
    t: 'Opacity (%)',
    d: 'Color transparency level in percent.'
  },
  veAngTol: {
    t: 'Direction tolerance',
    d: 'Maximum angle between segments that are still merged when straightening.'
  },
  veAnomFilter: {
    t: 'Anomaly category',
    d: 'Filters the list and canvas markers: Corners (stacked nodes), Collinear (redundant nodes), Wobbly (wavy lines), Facet (broken curves), Arc (overly dense arcs).'
  },
  veAnomList: {
    t: 'Anomaly list',
    d: 'Geometry anomalies found on the path, matching the selected category.'
  },
  veAppear: {
    t: 'Appearance',
    d: 'Appearance properties of the selected object. When several objects are selected, changes apply to all of them.'
  },
  veApplyCorner: {
    t: 'Apply smooth corner',
    d: 'Replaces the selected corner nodes with two smooth nodes (fillet).'
  },
  veApplySimplify: {
    t: 'Apply Simplify',
    d: 'Commits the Simplify result to the path as a single Undo step.'
  },
  veBoolUnion: {
    k: 'Ctrl+Alt+U',
    t: 'Boolean Union',
    d: 'Merges 2+ selected closed path objects into one shape (Object › Path › Union). Open subpaths are skipped.',
    w: 'The result uses the bottom object’s fill and the evenodd fill rule.'
  },
  veBoolSubtract: {
    k: 'Ctrl+Alt+S',
    t: 'Boolean Subtract',
    d: 'Cuts the selected shapes with the topmost (front) object as the cutter (Object › Path › Subtract).',
    w: 'The topmost object is removed; the rest become one shape.'
  },
  veBoolIntersect: {
    k: 'Ctrl+Alt+I',
    t: 'Boolean Intersect',
    d: 'Keeps only the overlapping region of all selected closed path objects (Object › Path › Intersect).'
  },
  veBoolExclude: {
    k: 'Ctrl+Alt+X',
    t: 'Boolean Exclude (XOR)',
    d: 'Keeps only regions owned by exactly one object — overlapping regions are removed (Object › Path › Exclude).'
  },
  veBoolDivide: {
    k: 'Ctrl+Alt+D',
    t: 'Boolean Divide',
    d: 'Divides 2+ selected closed path objects into separate individual pieces at every intersection (Object › Path › Divide).',
    w: 'Each intersected piece becomes an independent object retaining its original color.'
  },
  veMakeCompound: {
    k: 'Ctrl+8',
    t: 'Make Compound Path',
    d: 'Combines 2+ selected path objects into a single compound path with evenodd fill rule (Object › Compound Path › Make).',
    w: 'Inner subpaths create cutouts or holes in outer shapes.'
  },
  veReleaseCompound: {
    k: 'Ctrl+Shift+8',
    t: 'Release Compound Path',
    d: 'Releases a multi-subpath compound path into separate independent path objects (Object › Compound Path › Release).'
  },
  vePickBool: {
    t: 'Choose Boolean Operation',
    d: 'Open the Boolean / Pathfinder menu: Union, Subtract, Intersect, Exclude, Divide, Outline Stroke, Offset Path.'
  },
  veOutlineStroke: {
    k: 'Ctrl+Alt+O',
    t: 'Outline Stroke',
    d: 'Converts the stroke of the selected objects into a filled shape (fill = stroke color, stroke removed). The old fill is discarded. Essential for logos, print, and laser cutting.'
  },
  veOffsetPath: {
    t: 'Offset Path',
    d: 'Expands (+) or contracts (−) the selected path by a given distance, with a live preview. Miter/Bevel/Round joins; a path that shrinks away entirely is left unchanged.'
  },
  veOffsetDist: {
    t: 'Offset Distance (pt)',
    d: 'Expansion (+) or contraction (−) distance of the path, −100 to +100 pt. The preview updates live on the canvas.'
  },
  veOffsetJoin: {
    t: 'Offset Join',
    d: 'Corner shape of the offset path: Miter (sharp), Bevel (cut), or Round.'
  },
  veOffsetBadge: {
    t: 'Offset & Anchor Points',
    d: 'Current offset distance and anchor point count before → after the offset.'
  },
  veOffsetApply: {
    t: 'Apply Offset',
    d: 'Commits the Offset result to the path as a single Undo step.'
  },
  veOffsetCancel: {
    t: 'Cancel Offset',
    d: 'Cancels the Offset and restores the path as it was.'
  },
  veApplyStraight: {
    t: 'Apply straightening',
    d: 'Aligns the selected nodes or handles per the settings above. With no nodes selected, straightens the whole path using the threshold below.'
  },
  veArea: {
    t: 'Export area',
    d: 'Artboard: only the frame area (original viewBox). All content: a tight box around every object on the canvas, including those outside the artboard.'
  },
  veAreaAll: {
    t: 'All content',
    d: 'Exports a tight box around all objects on the canvas, including those outside the artboard.'
  },
  veAreaBoard: {
    t: 'Artboard',
    d: 'Exports only the frame area (original viewBox).'
  },
  veAreaSel: {
    t: 'Selected objects',
    d: 'Exports only the currently selected objects, cropped tight to their bounds. Other objects are excluded. Select objects first before copying or downloading.',
    w: 'Grabbing one piece or one icon from a large design.'
  },
  veAutoHandle: {
    k: 'B',
    t: 'Auto Bézier Handle',
    d: 'Click a node (or an object body) to give ALL nodes on that subpath smooth Bézier handles (Centripetal Catmull-Rom, no folds). Drag left/right after clicking to adjust tension live.',
    w: 'Turning a jagged polygon into a smooth curve at once.'
  },
  veAutoRefine: {
    t: 'Auto Tidy',
    d: 'Straightens wobbly segments / wavy node chains, then rounds jagged corners on the selected objects, in one click. Uses the Deviation threshold below. Shared borders with other objects are preserved so no gaps appear.',
    w: 'To tidy the sides and corners of selected objects at once.'
  },
  veBackWorkspace: {
    t: 'Back to Workspace',
    d: 'Returns to the project list. The project saves automatically.'
  },
  veBevelDeg: {
    t: 'Opening angle preset',
    d: 'Sets the proportion of the corner cut distance per the opening angle (Auto = follows the original geometry angle).'
  },
  veBg: {
    t: 'Canvas background',
    d: 'Transparent: the canvas shows a checker pattern and SVG export has no background. Solid: the canvas is filled with the chosen color and SVG export includes a colored background rectangle.'
  },
  veBgColor: {
    t: 'Background color',
    d: 'Background color in Solid mode.'
  },
  veBgSolid: {
    t: 'Solid',
    d: 'Plain colored background.'
  },
  veBgTr: {
    t: 'Transparent',
    d: 'No background (checker pattern).'
  },
  veClearSearch: {
    t: 'Clear Search',
    d: 'Clears the search text.'
  },
  veClipFrames: {
    t: 'Clip Frame',
    d: 'Clips the display of objects that cross the Frame boundary, like Clip Content in Figma.'
  },
  veClose: {
    t: 'Close path',
    d: 'Closes the selected path (adds a closing segment to the start point).'
  },
  veColorText: {
    t: 'Color value',
    d: 'Type a CSS color: hex (#e11d48), name (red), rgb() or hsl(). Press Enter to apply, Esc to cancel.'
  },
  veCopy: {
    t: 'Copy (selected format)',
    d: 'SVG/AI/EPS/PS are copied as text; PNG/JPG/WEBP as a PNG image. Ctrl+C on objects copies the SVG code + PNG image together.'
  },
  veCorner: {
    t: 'Smooth Corner',
    d: 'Circular fillet on the selected corner nodes. Select nodes first, set a radius, then apply.'
  },
  veCornerChamfer: {
    t: 'Bevel (Chamfer)',
    d: 'Cuts a sharp corner into a straight slanted line (no handle curve).'
  },
  veCornerCirc: {
    t: 'Circular',
    d: 'Corners are rounded with a precise circle arc.'
  },
  veCornerMode: {
    t: 'Corner profile',
    d: 'Circular = precise circle arc. Squircle = longer Bézier handles for a softer transition. Bevel = the corner is cut into a straight slanted line (chamfer).'
  },
  veCornerR: {
    t: 'Corner radius',
    d: 'Circular fillet radius applied to corner nodes.'
  },
  veCornerRadius: {
    t: 'Corner radius',
    d: 'Rounds all sharp corners on the selected object with a circular fillet. Drag to change the radius any time; 0 restores sharp corners. Only corners between two straight segments are rounded, and the radius is limited to 45% of the segment length.'
  },
  veCornerSm: {
    t: 'Smoothness',
    d: 'Handle length relative to the tangent-point distance (smooth Bézier mode only).'
  },
  veCornerSq: {
    t: 'Squircle',
    d: 'Corners are rounded with longer Bézier handles for a softer transition. Adjust with the Smoothness slider.'
  },
  veCtxFlatten: {
    k: 'Ctrl + E',
    t: 'Flatten',
    d: 'Merges 2 or more objects into one path (attributes follow the topmost object). With only one object inside a group, the object is released from its group.'
  },
  veCtxGroup: {
    k: 'Ctrl + G',
    t: 'Group',
    d: 'Groups 2 or more objects so they are selected and move together. Pressing Ctrl+G on a whole group still releases it (compatible with the old version).'
  },
  veSelSameFill: {
    t: 'Select Same Fill',
    d: 'Selects all other objects whose fill color matches the first selected object (text counts when its fill matches; locked, hidden, image, and gradient objects are skipped).'
  },
  veSelSameStroke: {
    t: 'Select Same Stroke',
    d: 'Selects all other objects whose stroke color matches the first selected object (locked, hidden, and image objects are skipped).'
  },
  veSelSameType: {
    t: 'Select Same Type',
    d: 'Selects all other objects of the same type as the first selected object (path, text, image, or frame; locked and hidden objects are skipped).'
  },
  veCtxUngroup: {
    k: 'Ctrl + Shift + G',
    t: 'Ungroup',
    d: 'Releases a group or Frame from the selected objects: all children are moved to the canvas and stay selected (the Frame background box is removed too). Selecting only some members still releases the parent.',
    w: 'To edit one object inside a group without changing the others.'
  },
  veCurAngle: {
    t: 'Current line angle',
    d: 'Slope of the line between the first and last selected nodes (0° = horizontal, 90° = vertical).'
  },
  veCurveDrag: {
    t: 'Curved Handle Drag Mode',
    d: 'When on, dragging a Bézier handle in No Mirroring mode automatically forms a smooth arc (sets the segment curvature independently without rotating the handle on the other side of the node).',
    w: 'Turn on in the floating toolbar when you want to freely pull a straight line/handle into a curve.'
  },
  veDelNode: {
    k: 'Delete',
    t: 'Delete node',
    d: 'Deletes the currently selected node from the path.'
  },
  veDelObj: {
    k: 'Delete',
    t: 'Delete',
    d: 'Deletes the selected nodes; if no nodes are selected, deletes the selected objects.'
  },
  veDown: {
    k: '[',
    t: 'Send backward',
    d: 'Moves the selected objects one step backward.'
  },
  veDownload: {
    t: 'Download (selected format)',
    d: 'Downloads the edited result as .svg, .png, .jpg, .webp, .ai, .eps or .ps (Ctrl+S).'
  },
  veDup: {
    k: 'Ctrl + D',
    t: 'Duplicate',
    d: 'Duplicates the selected objects (shifted 10 units).'
  },
  veExpFmt: {
    t: 'Export & copy format',
    d: 'Choose the file format: pure vector (SVG, AI, EPS, PS) or raster image (PNG, JPG, WEBP).'
  },
  veExpS_1: {
    t: '1x',
    d: 'Original size per the viewBox; smallest file.'
  },
  veExpS_2: {
    t: '2x (HD)',
    d: 'Double resolution; good for retina screens and the web.'
  },
  veExpS_4: {
    t: '4x (Ultra)',
    d: 'Four times the resolution; large files and slower to process.',
    w: 'For print or images that will be enlarged.'
  },
  veExpScale: {
    t: 'Raster resolution scale',
    d: 'Resolution multiplier when exporting to PNG, JPG, or WEBP. 2x and 4x produce much sharper images (supersampling).'
  },
  veExp_ai: {
    t: 'Adobe Illustrator (.AI)',
    d: 'PDF-1.4 file with an .ai extension plus Geovanta round-trip data for lossless reopening here.'
  },
  veExp_eps: {
    t: 'EPS (PostScript)',
    d: 'PostScript EPSF-3.0 for print workflows and legacy design apps.'
  },
  veExp_jpg: {
    t: 'JPG',
    d: 'Compressed raster image without transparency; background automatically white (or the solid background color).'
  },
  veExp_png: {
    t: 'PNG',
    d: 'Raster image with transparency. Choose the resolution scale below.'
  },
  veExp_svg: {
    t: 'SVG',
    d: 'Pure SVG vector; stays sharp at every scale and can be reopened here without data loss.'
  },
  veExp_webp: {
    t: 'WEBP',
    d: 'Modern small raster image with transparency support.'
  },
  veFavAdd: {
    t: 'Add to Favorites',
    d: 'Marks this project as a favorite.'
  },
  veFavRemove: {
    t: 'Remove from Favorites',
    d: 'Removes this project from favorites.'
  },
  veFill: {
    t: 'Fill',
    d: 'Fill color of the selected path.'
  },
  veFillEvenodd: {
    t: 'Even-odd',
    d: 'Areas enclosed by an odd number of contours are filled, even ones become holes, regardless of path direction.',
    w: 'Letters, rings, or shapes with holes that do not show up.'
  },
  veFillNone: {
    t: 'Empty fill',
    d: 'Turns the object fill color on/off.'
  },
  veFillNonzero: {
    t: 'Nonzero',
    d: 'Every area inside the contour is filled, depending on the path drawing direction.',
    w: 'Ordinary shapes without holes, or holes whose direction is already correct.'
  },
  veFillRule: {
    t: 'Fill rule',
    d: 'Rule that decides which areas are filled when paths overlap or have holes.'
  },
  veFrameAuto: {
    t: 'Frame → Auto Layout',
    d: 'Turns the Frame of the selected objects into an Auto Layout. Direction (row/column/wrap), gap and padding are inferred from the current object positions so nothing jumps.'
  },
  veFrameTool: {
    k: 'F',
    t: 'Frame',
    d: 'Drag on the canvas to draw a Frame; objects whose center falls inside the area automatically join the Frame. Single click: wraps the selected objects in a Frame (or creates an empty Frame when nothing is selected).',
    w: 'Making a Figma-style container/artboard that can be used for Auto Layout.'
  },
  veGradAngle: {
    t: 'Gradient angle',
    d: 'Direction of the linear gradient in degrees (-180° to 180°).'
  },
  veGradAnglePreset: {
    t: 'Quick angle',
    d: 'Sets the gradient angle to this value right away.'
  },
  veGradBar: {
    t: 'Gradient bar',
    d: 'Click on the bar to add a new color stop; drag a stop to move it.'
  },
  veGradDelStop: {
    t: 'Delete stop',
    d: 'Deletes the currently selected stop (a gradient needs at least 2 stops).'
  },
  veGradDistribute: {
    t: 'Even out stops',
    d: 'Spreads all stops at equal distances from 0% to 100%.'
  },
  veGradInterp: {
    t: 'Interpolation space',
    d: 'How colors are blended between stops. OKLab gives smoother, more natural transitions; sRGB follows standard SVG behavior.'
  },
  veGradLinear: {
    t: 'Linear',
    d: 'Straight gradient from one point to another, with an adjustable angle.'
  },
  veGradMid: {
    t: 'Midpoint',
    d: 'Sets where the blend of two stops sits at 50%. Drag to shift, double-click to reset to 50%.'
  },
  veGradMode: {
    t: 'Fill Mode',
    d: 'Object fill type: solid color, linear gradient, radial gradient, or no fill.'
  },
  veGradNone: {
    t: 'Empty',
    d: 'The object has no fill (stroke only).'
  },
  veGradOk: {
    t: 'Smooth OKLab',
    d: 'Color blending in OKLab space: no muddy band in the middle of the transition.'
  },
  veGradPad: {
    t: 'Pad',
    d: 'The first and last stop colors are extended outward.'
  },
  veGradRadial: {
    t: 'Radial',
    d: 'Circular gradient radiating from the center to the edge.'
  },
  veGradAngular: {
    t: 'Angular',
    d: '360-degree sweep / conic gradient rotating around the center point.'
  },
  veGradRdp: {
    t: 'Simplify stops (RDP)',
    d: 'Removes excess stops on the gradient using the Ramer–Douglas–Peucker algorithm, without changing the look much.'
  },
  veGradReflect: {
    t: 'Reflect',
    d: 'The gradient is mirrored back and forth outside its bounds.'
  },
  veGradRepeat: {
    t: 'Repeat',
    d: 'The gradient repeats from the start outside its bounds.'
  },
  veGradReverse: {
    t: 'Reverse gradient',
    d: 'Reverses the order of all stops (start becomes end).'
  },
  veGradSolid: {
    t: 'Solid',
    d: 'Fills the object with a single flat color.'
  },
  veGradSpread: {
    t: 'Spread method',
    d: 'Gradient behavior outside its start and end points.'
  },
  veGradSrgb: {
    t: 'sRGB',
    d: 'Standard sRGB color blending, matching SVG rendering in every app.'
  },
  veGradStop: {
    t: 'Color stop',
    d: 'Click to select a stop, drag to move its position along the gradient.'
  },
  veGradStopColor: {
    t: 'Stop color',
    d: 'Changes the color of the currently selected stop.'
  },
  veGradStopOp: {
    t: 'Stop opacity',
    d: 'Color transparency at this stop; 0% clear, 100% opaque.'
  },
  veGradStopPos: {
    t: 'Stop position',
    d: 'Position of the stop along the gradient, 0% at the start to 100% at the end.'
  },
  veGrid: {
    k: "Ctrl + '",
    t: 'Grid',
    d: 'Shows the grid as a guide and snap target. Grid size adapts to zoom automatically (multiples of 10 units) so lines stay readable at any zoom.'
  },
  veHand: {
    k: 'H | Spasi',
    t: 'Pan',
    d: 'Drag the canvas to pan the view. The middle mouse button works in other tools too.'
  },
  veNodeSize: {
    t: 'Node & Handle Size',
    d: 'Adjust display size of path nodes and Bézier handles on the canvas.'
  },
  veImport: {
    t: 'Import SVG / AI / EPS / image',
    d: 'Adds one or many files to the canvas: SVG, AI, EPS, PS, PDF (become editable vector objects) or PNG/JPG/WebP/GIF images. File type is detected from content (magic byte). Files are added at the center of the view and do not replace the canvas content. You can also drag-drop files onto the canvas or paste with Ctrl+V.'
  },
  veDevMode: {
    t: 'Dev Mode',
    k: 'Shift+D',
    d: 'Switch to read-only Figma-style Dev Mode: inspect Box Model, Layout, Typography, Colors, automatic hover redline distances, and copy CSS, Tailwind, SVG, React JSX, SwiftUI, or Compose code.'
  },
  veMinifyXml: {
    t: 'Minify',
    d: 'Compress SVG markup to minimal size for web.'
  },
  veCopyCode: {
    t: 'Copy Code',
    d: 'Copy code to clipboard.'
  },
  veCodeCopied: {
    t: 'Code copied to clipboard!',
    d: 'Code has been saved to clipboard.'
  },
  veDownloadCode: {
    t: 'Download File',
    d: 'Download code file to local device.'
  },
  veInsert: {
    t: 'Insert node',
    d: 'Adds a node in the middle of the segment between two adjacent selected nodes. Or double-click on the path line.'
  },
  veLayAlign: {
    t: '9-point alignment',
    d: 'Sets the position of objects inside their row or column when sizes differ: left/center/right and top/middle/bottom.'
  },
  veLayApply: {
    t: 'Apply Auto Layout',
    d: 'Arranges the selected objects per the settings above. After that, changing gap, padding, direction, or alignment re-arranges immediately while the same selection stays active.'
  },
  veLayArtboard: {
    t: 'Padding to Artboard',
    d: 'Resizes the Artboard (viewBox) to surround the selected objects, or all content when nothing is selected, with the 4-side padding above.',
    w: 'Tidying empty space before export.'
  },
  veLayBucket: {
    t: 'Merge Colors',
    d: 'Same-colored objects inside one Frame/Group are merged into one row. Click that row to select them all, then change fill, stroke, and radius at once.'
  },
  veLayCol: {
    t: 'Column (↓)',
    d: 'All objects are arranged downward from top to bottom.'
  },
  veLayCols: {
    t: 'Columns per row',
    d: 'Maximum number of objects in one row in Grid mode.'
  },
  veLayDir: {
    t: 'Layout direction',
    d: 'Sets how objects are arranged.'
  },
  veLayFrame: {
    t: 'Background frame',
    d: 'Creates an automatic background rectangle behind the objects, as wide as the content plus padding. Turning it off deletes that automatic frame.',
    w: 'Cards, buttons, or icon groups that need a background.'
  },
  veLayGap: {
    t: 'Gap between objects',
    d: 'Empty distance between adjacent objects.'
  },
  veLayPad: {
    t: 'Padding',
    d: 'Empty distance between the frame and the objects inside it. Symmetric mode uses one value for all four sides.'
  },
  veLayPadB: {
    t: 'Bottom padding (B)',
    d: 'Distance from the frame to the bottommost object.'
  },
  veLayPadL: {
    t: 'Left padding (L)',
    d: 'Distance from the frame to the leftmost object.'
  },
  veLayPadMode: {
    t: 'Padding mode',
    d: 'Symmetric = one value for all sides. 4 sides = set top, right, bottom, and left individually.'
  },
  veLayPadR: {
    t: 'Right padding (R)',
    d: 'Distance from the frame to the rightmost object.'
  },
  veLayPadT: {
    t: 'Top padding (T)',
    d: 'Distance from the frame to the topmost object.'
  },
  veLayPanel: {
    t: 'Auto Layout & Padding',
    d: 'Arranges selected objects in rows, columns, or a grid with gaps, alignment, 4-side padding, and an automatic background frame. After applying, changing the controls here re-arranges immediately.'
  },
  veLayRadius: {
    t: 'Frame radius',
    d: 'Roundness of the automatic background frame corners.'
  },
  veLayRow: {
    t: 'Row (→)',
    d: 'All objects are arranged horizontally from left to right.'
  },
  veLayWrap: {
    t: 'Grid (⊞)',
    d: 'Objects are arranged horizontally then wrap to the next row each time the column count is reached.'
  },
  veLayer: {
    t: 'Layer',
    d: 'Click to select the object. Shift for multi-select.'
  },
  veLayerImage: {
    t: 'Image Object',
    d: 'This layer is an image object.'
  },
  veLayerShape: {
    t: 'SVG Shape Preview',
    d: 'This layer is an SVG shape.'
  },
  veLayerText: {
    t: 'SVG Text Object',
    d: 'This layer is an SVG text object.'
  },
  veLayers: {
    t: 'Layer list',
    d: 'Objects are ordered front-most on top. Click to select, Shift or Ctrl for multi-select.'
  },
  veMaxDev: {
    t: 'Deviation threshold',
    d: 'Maximum deviation (units) for a node chain to be considered a straight line.'
  },
  veMirror: {
    t: 'Handle Mirroring',
    d: 'Sets how Bézier handles pair up on the selected node/handle, like the Mirroring panel in Figma. Select a node (or handle) first. Hold Alt while dragging a handle to break mirroring temporarily (node becomes No mirroring).',
    w: 'The mode applies live while dragging a handle, not only when selected.'
  },
  veMirrorAL: {
    t: 'Mirror angle and length',
    d: 'Both handles collinear AND equal in length. Moving one handle fully mirrors its position to the opposite handle (symmetric around the node).',
    w: 'Perfectly symmetric curve around the node.'
  },
  veMirrorAngle: {
    t: 'Mirror angle',
    d: 'Both handles always collinear (opposite directions). Rotating one handle rotates the opposite handle, but their lengths stay different and free.',
    w: 'Smooth curve (G1) with unequal handle lengths.'
  },
  veMirrorCurve: {
    t: 'No mirroring (Curved Drag)',
    d: 'Both handles free & independent (no mirroring), but Bézier handles appear automatically and segments curve dynamically as either handle is dragged.',
    w: 'When you want to drag 1 handle independently into a smooth curved shape.'
  },
  veMirrorNone: {
    t: 'No mirroring',
    d: 'Both handles fully independent: each direction and length is free. Moving one handle does not move the opposite handle.',
    w: 'Making a sharp corner or an asymmetric curve.'
  },
  veNoColor: {
    t: 'Remove Color (No Color)',
    d: 'Removes the color / sets it to None (fully transparent).'
  },
  veNode: {
    k: 'A | N',
    t: 'Edit Node',
    d: 'Show and edit nodes and Bézier handles. Drag a node or handle to change the path shape.'
  },
  veOpacity: {
    t: 'Opacity',
    d: 'Transparency of the selected path (0–100%).'
  },
  veOpen: {
    t: 'Open path',
    d: 'Opens a closed path (removes the Z closing).'
  },
  vePen: {
    k: 'P',
    t: 'Pen Tool',
    d: 'Click = corner node (straight). Click-hold-drag (> 4 px) = smooth node with symmetric handles. Alt while dragging = break the corner (incoming handle locked). Shift = lock to 45°. Click the first node to close the path; Enter / Esc / double-click to finish; Backspace deletes the last node. Multi-guide snapping is active.',
    w: 'Drawing precise Bézier curves from scratch.'
  },
  vePencil: {
    k: 'Shift+P',
    t: 'Pencil Tool',
    d: 'Draw freehand vector paths naturally with automatic smooth cubic Bézier curve fitting.'
  },
  veBrush: {
    t: 'Brush Tool',
    d: 'Draw artistic dynamic ribbon brush strokes with adaptive pressure/velocity width and smooth tapering.'
  },
  veCurvature: {
    k: 'C',
    t: 'Curvature Tool',
    d: 'Click to place a smooth point; drag a point or a segment to reshape the curve. Click an existing point to toggle smooth/corner. Click the first point to close the path; double-click / Enter / Esc to finish.',
    w: 'Drawing smooth Illustrator-style curves.'
  },
  veShapeBuilder: {
    k: 'G',
    t: 'Shape Builder',
    d: 'Select 2+ overlapping shapes, then drag a line across them to merge them into one path. Alt+drag subtracts the whole shapes the line crosses.',
    w: 'Merging several shapes into one.'
  },
  veBlob: {
    k: 'O',
    t: 'Blob Generator',
    d: 'Drag a box on the canvas to create an organic blob. Adjust point count, randomness, smoothness, and seed in the right inspector; parameters stick to the object.',
    w: 'Creating random organic shapes that can be re-adjusted.'
  },
  veWeave: {
    k: 'W',
    t: 'Weave Generator',
    d: 'Drag a box on the canvas to create a woven strip pattern. Adjust columns, rows, amplitude, and strip thickness in the right inspector; parameters stick to the group.',
    w: 'Creating an over-under woven pattern.'
  },
  veLine: {
    k: 'L',
    t: 'Line Segment',
    d: 'Click-drag to draw a straight line. Shift = lock to 45° increments. Alt = line centered on the start point.',
    w: 'Drawing precise straight lines.'
  },
  veArc: {
    k: 'R',
    t: 'Arc',
    d: 'Click = arc center, drag = radius and sweep angle. Shift = sweep in 45° steps. Click without dragging = 90° arc with radius 50. Edit radius and angles in the inspector.',
    w: 'Drawing circular arcs.'
  },
  veArcRadius: {
    t: 'Arc radius',
    d: 'Distance from the arc center to the arc line. Changing the radius keeps the center fixed.'
  },
  veArcStart: {
    t: 'Arc start angle',
    d: 'Angle where the arc starts, measured from the 3 o\'clock direction (0°). Changing the start angle keeps the center fixed.'
  },
  veArcSweep: {
    t: 'Arc sweep',
    d: 'Angle swept by the arc from the start angle. 90° = quarter circle, 360° = full circle.'
  },
  veToolParams: {
    t: 'Tool parameters',
    d: 'Parameters for the active drawing tool or the selected generator object. Changes apply live to the object.'
  },
  veBlobPoints: {
    t: 'Blob point count',
    d: 'Number of control points on the blob outline. More points = a more winding shape.'
  },
  veBlobIrregularity: {
    t: 'Blob irregularity',
    d: 'How random each point\'s distance from the center is. 0% = close to a circle.'
  },
  veBlobSmoothness: {
    t: 'Blob smoothness',
    d: 'How smooth the transitions between points are. 100% = smoothest curve.'
  },
  veBlobRot: {
    t: 'Blob rotation',
    d: 'Rotate the orientation of the blob from 0° to 360°.'
  },
  veBlobSpike: {
    t: 'Blob spikiness',
    d: 'How sharp or spiky the wave crests are. 0% = rounded crests, 100% = sharp star shape.'
  },
  veBlobSeedVal: {
    t: 'Blob seed',
    d: 'The seed value that determines this blob\'s random shape.'
  },
  veBlobRandomSeed: {
    t: 'Randomize seed',
    d: 'Generate a new random seed for a different blob shape.'
  },
  veWeaveCols: {
    t: 'Weave columns',
    d: 'Number of columns of horizontal strips in the weave.'
  },
  veWeaveRows: {
    t: 'Weave rows',
    d: 'Number of rows of vertical strips in the weave.'
  },
  veWeaveAmplitude: {
    t: 'Weave amplitude',
    d: 'Wave height of the strips. Clamped so strips stay inside the box.'
  },
  veWeaveThickness: {
    t: 'Strip thickness',
    d: 'Strip width relative to the weave cell size.'
  },
  veWeaveType: {
    t: 'Wave shape',
    d: 'Choice of wave shape: Sine (smooth curve), Triangle (sharp zigzag), or Square (stepped square).'
  },
  veWeaveGap: {
    t: 'Gap spacing',
    d: 'Spacing between overlapping strip intersections.'
  },
  veWeaveFreq: {
    t: 'Wave frequency',
    d: 'Frequency multiplier for wave crests across strips.'
  },
  veWeavePhase: {
    t: 'Phase shift',
    d: 'Shift starting wave phase along strips from 0° to 360°.'
  },
  vePenFill: {
    t: 'With fill',
    d: 'The drawn path gets a fill color.'
  },
  vePenFinish: {
    k: 'Enter',
    t: 'Finish drawing',
    d: 'Ends the path being drawn.'
  },
  vePenNoFill: {
    t: 'No fill',
    d: 'The drawn path is only a line (stroke), with no fill color.'
  },
  vePipetteFill: {
    t: 'Fill Color Pipette',
    d: 'Samples a color from the canvas for fill.'
  },
  vePipetteStroke: {
    t: 'Stroke Color Pipette',
    d: 'Samples a color from the canvas for stroke.'
  },
  vePruneAng: {
    t: 'Minimum angle',
    d: 'Turns below this value are not treated as corners, so their nodes may be deleted.',
    w: 'Lower it if blunt corners disappear too; raise it if noise nodes remain.'
  },
  vePruneNodes: {
    t: 'Delete Non-Corner Nodes',
    d: 'Detects sharp corners (sudden turns whose original contour hugs the intersection of both sides), locks the nodes at those corners, then deletes all nodes in the middle/edges of sides between two corners as long as the deviation from the original contour stays within tolerance. Curved sides are replaced by 1 Bézier curve when it still fits. Nodes on shared borders between objects are untouched.',
    w: 'Good for tidying paths with excess nodes, e.g. the letter A from 58 nodes down to exactly its corners.'
  },
  vePruneTol: {
    t: 'Node deletion tolerance',
    d: 'Maximum deviation of the result from the original contour. Small = safe but more nodes remain; large = more aggressive.',
    w: 'Start at 0.75; raise it if middle nodes still remain.'
  },
  veRadiusPreset: {
    t: 'Quick radius preset',
    d: 'Click to apply this radius size to the selected corners right away (Sharp = back to 0).'
  },
  veRangeScrub: {
    t: 'Drag Value',
    d: 'Drag left/right to change the value.'
  },
  veRangeType: {
    t: 'Type Number',
    d: 'Click to type a number directly.'
  },
  veRedo: {
    k: 'Ctrl + Y',
    t: 'Redo',
    d: 'Redoes the change that was undone.'
  },
  veRenameProject: {
    t: 'Rename Project',
    d: 'Click to rename the project.'
  },
  veResizePanel: {
    t: 'Resize Panel Width',
    d: 'Drag to change the panel width. Double-click = reset to the initial width.'
  },
  veSaveError: {
    t: 'Save Failed',
    d: 'Click to try saving again.'
  },
  veSaveOk: {
    t: 'Save Status',
    d: 'Local project save status (IndexedDB).'
  },
  veSelColor: {
    t: 'Change color',
    d: 'Changes this color on all objects using it at once.'
  },
  veSelPick: {
    t: 'Select objects with this color',
    d: 'Selects only the objects using this color, to set their radius or stroke at once.'
  },
  veColorStyles: {
    t: 'Color Styles',
    d: 'Document color styles. Click a swatch to link the selection fill to a style; change a style color to change every object linked to it.'
  },
  veStyleCreate: {
    t: 'Create style',
    d: 'Creates a new style from the selected object fill color and links the selection to that style.'
  },
  veStyleApply: {
    t: 'Apply style',
    d: 'Links the selected object fill to this style. Changing the style color later will change every linked object.'
  },
  veStyleHex: {
    t: 'Style color',
    d: 'Changes this style color — every linked object changes with it.'
  },
  veStyleDelete: {
    t: 'Delete style',
    d: 'Deletes the style; linked objects become free colors keeping their last color.'
  },
  frOpen: {
    t: 'Find & Replace colors',
    d: 'Replaces one exact color with another, across the document or only in the selection, with a live preview.'
  },
  frReplace: {
    t: 'Replace one',
    d: 'Replaces the first remaining match (one Undo step), then the preview advances to the next match.'
  },
  frReplaceAll: {
    t: 'Replace all',
    d: 'Replaces all matches at once (one Undo step). Hover here to preview all of them.'
  },
  frFrom: {
    t: 'Source color',
    d: 'The color to replace — only exact matches (fill, stroke, or gradient stop) are counted.'
  },
  frTo: {
    t: 'Replacement color',
    d: 'The new color for all matches.'
  },
  frToNone: {
    t: 'No color',
    d: 'Replaces the source color with no color (paint removed) instead of a new color.'
  },
  frScope: {
    t: 'Scope',
    d: 'The whole document or only the currently selected objects.'
  },
  frClose: {
    t: 'Close',
    d: 'Closes the dialog without replacing anything; the preview is discarded.'
  },
  rcOpen: {
    t: 'Recolor colors',
    d: 'Shifts hues or remaps the color palette across the document or only in the selection, with a live preview.'
  },
  rcApply: {
    t: 'Apply',
    d: 'Applies the recolor to the document (one Undo step) and closes the modal.'
  },
  rcClose: {
    t: 'Close',
    d: 'Closes the modal and discards the preview without changes.'
  },
  rcHue: {
    t: 'Hue shift',
    d: 'Shifts the hue of all colors in the source range by this delta (degrees).'
  },
  rcSat: {
    t: 'Saturation',
    d: 'Saturation multiplier for the shifted colors (0–2).'
  },
  rcLight: {
    t: 'Lightness',
    d: 'Lightness multiplier for the shifted colors (0–2).'
  },
  rcHueRange: {
    t: 'Source hue range',
    d: 'Only colors whose hue falls in this range are shifted. Min greater than max means a wrap-around range.'
  },
  rcScope: {
    t: 'Scope',
    d: 'Recolor the whole document or only the currently selected objects.'
  },
  rcMode: {
    t: 'Recolor mode',
    d: 'Mode 1 shifts the hue of all colors in the range; Mode 2 maps each hue family to a target color.'
  },
  rcTabMode1: {
    t: 'Mode 1 · Shift Hue',
    d: 'Shifts the hue of all colors in the source range by the same delta.'
  },
  rcTabMode2: {
    t: 'Mode 2 · Palette Mapping',
    d: 'Maps each hue family to one target color, with per-color overrides.'
  },
  rcFamilyTarget: {
    t: 'Family target color',
    d: 'All colors in this family are mapped to the hue of this color (original saturation and lightness kept).'
  },
  rcOverride: {
    t: 'Color override',
    d: 'Click to set a replacement color for this color only (overrides the family target).'
  },
  rcSetTarget: {
    t: 'Set family target',
    d: 'Sets the target color for this family.'
  },
  rcClearTarget: {
    t: 'Clear target',
    d: 'Clears this family target; its colors stay unchanged.'
  },
  rcRemoveOverride: {
    t: 'Remove override',
    d: 'Removes this color override; the color follows the family target again.'
  },
  veStyleUnlinkFill: {
    t: 'Unlink fill',
    d: 'Unlinks this object fill from its style; the color stays.'
  },
  veStyleUnlinkStroke: {
    t: 'Unlink stroke',
    d: 'Unlinks this object stroke from its style; the color stays.'
  },
  veRecentColor: {
    t: 'Recent color',
    d: 'Click to use this color as the selection fill.'
  },
  veSelect: {
    k: 'V',
    t: 'Select',
    d: 'Select objects or nodes. Shift for multi-select. Drag an object to move it.'
  },
  veShape: {
    t: 'Shape',
    d: 'Pick a basic shape (rectangle, circle, star, arrow, heart, etc.), then drag on the canvas to draw. Single click for the default size. Shift = proportional.',
    w: 'Adds a new shape to the canvas as a path whose nodes can be edited.'
  },
  veShapeItem: {
    t: 'Shape',
    d: 'Drag on the canvas to draw, or single-click for the default size. Hold Shift for a 1:1 proportion.'
  },
  veSharpen: {
    t: 'Sharpen corner',
    d: 'Melts a blunt/rounded corner (two nearby nodes, e.g. from import or an old fillet) into one sharp corner at the intersection of its tangent lines. With no nodes selected: automatic detection across the selected objects. With nodes selected: two adjacent nodes are merged; a single node becomes a corner without handles.'
  },
  veShowHandleGlobal: {
    t: 'Show Bézier Handles (Global)',
    d: 'Shows or hides Bézier handles on every selected object. The setting applies globally to all object selections and also works in Select mode.'
  },
  veShowNodeGlobal: {
    t: 'Show Nodes (Global)',
    d: 'Shows or hides nodes on every selected object. The setting applies globally to all object selections and also works in Select mode.'
  },
  veSidebarHide: {
    t: 'Hide Layer Panel',
    d: 'Hides the layer panel on the left side.'
  },
  veSidebarShow: {
    t: 'Show Layer Panel',
    d: 'Shows the layer panel on the left side.'
  },
  veRightSidebarHide: {
    t: 'Hide Inspector Panel',
    d: 'Hides the properties inspector panel on the right side.'
  },
  veRightSidebarShow: {
    t: 'Show Inspector Panel',
    d: 'Shows the properties inspector panel on the right side.'
  },
  veSimpBadge: {
    t: 'Anchor Points',
    d: 'Number of anchor points before and after simplify.'
  },
  veSimpCancel: {
    k: 'Esc',
    t: 'Cancel Simplify',
    d: 'Cancels simplify without applying changes.'
  },
  veSimplify: {
    k: 'S',
    t: 'Simplify',
    d: 'Simplifies Bézier curve paths with the VectorCraft least-squares cubic fitting algorithm (Object › Path › Simplify).',
    w: 'Reduces anchor points while keeping shape precision and corners.'
  },
  veSimplifyAngle: {
    t: 'Corner Point Angle Threshold',
    d: 'Angles below this threshold (0°–180°, default 150° → turns > 30°) are kept as sharp corners.'
  },
  veSimplifyAuto: {
    t: 'Auto-Simplify (100%)',
    d: 'Sets simplification to 100% curve precision (0.031 pt tolerance).'
  },
  veAutoSimplifyToggle: {
    t: 'Auto-Simplify (Auto on Import/Paste)',
    d: 'Enable to automatically simplify nodes once at 100% curve precision when SVG objects are imported or pasted (Default: Off).'
  },
  veSimplifyAllCanvas: {
    t: 'Auto-Simplify All Objects (100%)',
    d: 'Simplifies redundant nodes on all canvas objects at 100% curve precision exactly once.'
  },
  veSimplifyLevel: {
    t: 'Simplify Slider (0–100)',
    d: 'Left (0) = fewest anchor points (32 pt); Middle (50) = 1 pt; Right (100) = closest to the original path (1/32 pt).'
  },
  veSimplifyMore: {
    t: 'More Options…',
    d: 'Opens the full Simplify dialog (Tolerance, Corner Point Angle Threshold, Convert to Straight Lines, Show Original Path).'
  },
  veSimplifyOrig: {
    t: 'Show Original Path',
    d: 'Shows the original path outline under the canvas preview before Simplify.'
  },
  veSimplifyRetain: {
    t: 'Open this dialog with these settings next time',
    d: 'Opens the full Simplify dialog with these settings on the next call.'
  },
  veSimplifyStraight: {
    t: 'Convert to Straight Lines',
    d: 'Produces straight line segments only, using Ramer–Douglas–Peucker (RDP) polyline reduction.'
  },
  veSimplifyTol: {
    t: 'Tolerance (pt)',
    d: 'Maximum deviation distance (document points) between the original path and the Simplify result (0.001–10000 pt).'
  },
  veSmoothTb: {
    t: 'Smooth nodes (Taubin)',
    d: 'Evens out the selected node positions without shrinking the shape (Taubin λ|μ filter), then recalculates smooth (G1) Bézier handles.'
  },
  veSnap: {
    t: 'Snap',
    d: 'Figma-style multi-snap: click the small arrow beside it to pick features (Smart Guides box/center, Equal Spacing, Artboard, Node & Handle, Node X/Y axes, Midpoint, Contour, 90°/extension, Grid, Pixel). X and Y axes snap independently. While dragging, nodes snap to other objects’ nodes & midpoints (red circle), to other objects’ edges/contours (green diamond), and to right-angle/extension lines (amber diamond), then to the grid. 5 screen-pixel tolerance. Hold Ctrl/Cmd or Alt to disable temporarily.'
  },
  veSnapMenu: {
    t: 'Snap features checklist',
    d: 'Choose which snap targets are active while moving objects, nodes, or handles.',
    w: 'Turn off certain options if the cursor sticks too often in dense areas.'
  },
  veSnapPresetAll: {
    t: 'Enable all',
    d: 'Enables every snap target from Smart Guides to Grid for maximum precision. Pixel rounding is unchanged.'
  },
  veSnapPresetDef: {
    t: 'Default preset',
    d: 'Restores the checklist to defaults: Smart Guides, Equal Spacing, Artboard, Node, Midpoint, Contour, and Right Angle on; Node Axis, Grid, and Pixel off.'
  },
  veSnapPresetMin: {
    t: 'Minimal mode',
    d: 'Only snaps to node & handle points; box guides, spacing, and other targets are off.',
    w: 'When other snaps feel distracting and you only need to lock onto nodes.'
  },
  veSnap_artboard: {
    t: 'Artboard Edges & Center',
    d: 'Snaps to the edge bounds and the horizontal and vertical center lines of the canvas (viewBox).'
  },
  veSnap_axial: {
    t: 'Node Axis Alignment (X/Y)',
    d: 'Shows guide lines when the X or Y position lines up straight with another node or the base of its own handle.'
  },
  veSnap_bbox: {
    t: 'Smart Guides (Box & Center)',
    d: 'Snaps to the left, right, top, bottom edges and center point of other objects bounding boxes.'
  },
  veSnap_edge: {
    t: 'Contour / Path Edge',
    d: 'Snaps a node or object so it exactly touches the outline (contour) of another object.'
  },
  veSnap_grid: {
    t: 'Adaptive Grid Lines',
    d: 'Snaps to grid intersections and lines. Requires the Grid button in the toolbar to be on.'
  },
  veSnap_midpoint: {
    t: 'Segment Midpoint',
    d: 'Snaps to the midpoint of every straight or Bézier curve segment.'
  },
  veSnap_node: {
    t: 'Node & Handle Points',
    d: 'Snaps directly (2D lock) to node points or Bézier handle ends of other objects.'
  },
  veSnap_perp: {
    t: 'Right Angle (90°) & Line Extension',
    d: 'Locks node movement to a right angle (90°) or the straight extension of a neighboring segment.'
  },
  veSnap_pixel: {
    t: 'Round to Pixel (1 px)',
    d: 'Rounds final coordinates to the nearest whole number for crisp results on low-resolution screens.'
  },
  veSnap_spacing: {
    t: 'Equal Spacing',
    d: 'Detects and locks exactly equal empty gaps between 3 or more aligned objects.'
  },
  veStats: {
    t: 'Document statistics',
    d: 'Object count, total nodes, and the currently selected objects or nodes.'
  },
  veStorageInfo: {
    t: 'Local Storage Information',
    d: 'Shows local storage (IndexedDB) usage.'
  },
  veStraight: {
    t: 'Straighten',
    d: 'Line-straightening panel: tidies nearly-straight segments on the selected path.',
    w: 'To tidy the sides of a logo or geometric shape.'
  },
  veStroke: {
    t: 'Stroke',
    d: 'Outline color of the selected path.'
  },
  veStrokeNone: {
    t: 'Empty stroke',
    d: 'Turns the object outline on/off.'
  },
  veStrokeW: {
    t: 'Stroke width',
    d: 'Outline thickness in document units.'
  },
  veStrokeAlign: {
    t: 'Stroke alignment',
    d: 'Sets stroke alignment relative to the path outline: Center, Inside, or Outside.'
  },
  veStrokeLinecap: {
    t: 'Line cap',
    d: 'Cap style for stroke endpoints: Round, Butt, or Square.'
  },
  veStrokeLinejoin: {
    t: 'Line join',
    d: 'Corner join style: Round, Miter, or Bevel.'
  },
  veStrokeMiterlimit: {
    t: 'Miter limit',
    d: 'Maximum ratio of miter length before the corner bevels.'
  },
  vePaintOrder: {
    t: 'Paint order',
    d: 'Controls whether fill renders before stroke or stroke before fill.'
  },
  veStrokeDash: {
    t: 'Dash pattern',
    d: 'Dash and gap lengths for dashed/dotted strokes.'
  },
  veStrokeDashOffset: {
    t: 'Dash offset',
    d: 'Starting phase shift of the dash pattern along the path.'
  },
  veBlendMode: {
    t: 'Blend mode',
    d: 'Blending method for compositing this object with layers below it.'
  },
  veFx: {
    t: 'Effects',
    d: 'Effects of the selected object: drop shadow and blur.'
  },
  veFxAdd: {
    t: 'Add effect',
    d: 'Adds a new effect to the selected object.'
  },
  veFxAddShadow: {
    t: 'Drop Shadow',
    d: 'Adds a drop shadow to the selected object.'
  },
  veFxAddLayerBlur: {
    t: 'Layer Blur',
    d: 'Blurs the contents of the selected object.'
  },
  veFxAddBgBlur: {
    t: 'Background Blur',
    d: 'Blurs the background behind the selected object.'
  },
  veFxToggle: {
    t: 'Enable / disable effect',
    d: 'Disables the effect without removing it.'
  },
  veFxDelete: {
    t: 'Remove effect',
    d: 'Removes the effect from the selected object.'
  },
  veFxDx: {
    t: 'Offset X',
    d: 'Horizontal shadow offset in document units.'
  },
  veFxDy: {
    t: 'Offset Y',
    d: 'Vertical shadow offset in document units.'
  },
  veFxBlur: {
    t: 'Blur',
    d: 'Shadow edge softness in document units.'
  },
  veFxRadius: {
    t: 'Blur radius',
    d: 'Blur radius in document units (0–100).'
  },
  veFxColor: {
    t: 'Shadow color',
    d: 'Drop shadow color.'
  },
  veFxOpacity: {
    t: 'Shadow opacity',
    d: 'Shadow strength (0–100%).'
  },
  veToggleHidden: {
    k: 'Ctrl + Shift + H',
    t: 'Show / Hide Layer',
    d: 'Shows or hides the selected layer.'
  },
  veToolGroup: {
    t: 'Choose a tool in the group',
    d: 'Opens the list of other tools grouped with this button.'
  },
  veTypeCorner: {
    t: 'Corner Type',
    d: 'Sharp corner node; left and right handles are independent. When 2+ nodes are selected and nearly collinear, nodes are straightened too; when a handle is selected, the handle is straightened.'
  },
  veTypeSmooth: {
    t: 'Smooth Type',
    d: 'Handles in opposite directions (G1); handle lengths may differ.'
  },
  veTypeSym: {
    t: 'Symmetric Type',
    d: 'Handles in opposite directions with equal length (G1 + symmetry).'
  },
  veUndo: {
    k: 'Ctrl + Z',
    t: 'Undo',
    d: 'Undoes the last change.'
  },
  veUp: {
    k: ']',
    t: 'Bring forward',
    d: 'Moves the selected objects one step forward.'
  },
  veXfFlipH: {
    t: 'Flip horizontal',
    d: 'Mirrors the selection left-right around the center (or pivot point).'
  },
  veXfFlipV: {
    t: 'Flip vertical',
    d: 'Mirrors the selection top-bottom around the center (or pivot point).'
  },
  veXfH: {
    t: 'Height (H)',
    d: 'Height of the selection bounding box. Objects scale around the pivot; curves and handles change proportionally.',
    w: 'Not available while editing nodes.'
  },
  veXfLock: {
    t: 'Lock proportions',
    d: 'When on, changing W automatically changes H by the same ratio (and vice versa).'
  },
  veXfPanel: {
    t: 'Transform',
    d: 'Sets the position (X, Y), size (W, H), and rotation of the selection with precise numbers. The 9-point pivot sets the measurement reference.'
  },
  veXfPin: {
    t: '9-point pivot',
    d: 'Chooses the reference point on the bounding box: used to read X/Y, as the fixed point when W/H change, and as the rotation center when "Pivot" is selected.'
  },
  veXfPivC: {
    t: 'From center',
    d: 'Rotates and mirrors around the center of the bounding box.'
  },
  veXfPivP: {
    t: 'From pivot point',
    d: 'Rotates and mirrors around the currently selected 9-point pivot.'
  },
  veXfPivot: {
    t: 'Rotation & flip center',
    d: 'Sets the fixed point when rotating or mirroring the selection.'
  },
  veXfRot: {
    t: 'Rotation (°)',
    d: 'Object rotation angle, from -180° to 180°. The angle is stored on the object so it stays readable after rotating. For multi-object selections, the value is treated as a relative rotation from 0°.',
    w: 'Not available while editing nodes.'
  },
  veXfStroke: {
    t: 'Scale stroke',
    d: 'When on, stroke thickness scales along when W/H change. When off, stroke thickness stays fixed.'
  },
  veXfW: {
    t: 'Width (W)',
    d: 'Width of the selection bounding box. Objects scale around the pivot; curves and handles change proportionally.',
    w: 'Not available while editing nodes.'
  },
  veXfX: {
    t: 'Position X',
    d: 'Horizontal coordinate of the pivot on the selection bounding box. Type a number then Enter; up/down arrows = ±1 (Shift = ±10).'
  },
  veXfY: {
    t: 'Position Y',
    d: 'Vertical coordinate of the pivot on the selection bounding box. Type a number then Enter; up/down arrows = ±1 (Shift = ±10).'
  },
  veZoomFit: {
    k: '0',
    t: 'Fit',
    d: 'Adjusts the zoom so the whole viewBox fits in the canvas, centered.'
  },
  veZoomIn: {
    k: '+',
    t: 'Zoom in',
    d: 'Zooms in the editor canvas view (toward the center).'
  },
  veZoomOut: {
    k: '-',
    t: 'Zoom out',
    d: 'Zooms out the editor canvas view (toward the center).'
  },
  veZoomPct: {
    t: 'Zoom level',
    d: 'Current canvas magnification percentage. 100% = actual size.'
  },
  veZoomSl: {
    k: '+ | - | Scroll',
    t: 'Zoom',
    d: 'Zooms the canvas in or out with no practical limit (0.05% to 500,000%). Mouse scroll follows the cursor position; the ± buttons zoom to the center.'
  },
};

TIPS.veText = {k: 'T', t: 'Teks', d: 'Klik kanvas untuk menambahkan teks.'};
TIPS_EN.veText = {k: 'T', t: 'Text', d: 'Click the canvas to add text.'};
/* --- Panel teks (TextInspector): kunci yang dipakai tapi belum terkatalog
   (ronde 5) + pengganti title= native di panel yang sama. --- */
TIPS.veFontFamily = {t: 'Keluarga Font', d: 'Pilih keluarga font untuk teks terpilih.'};
TIPS_EN.veFontFamily = {t: 'Font Family', d: 'Choose the font family for the selected text.'};
TIPS.veFontWeight = {t: 'Ketebalan', d: 'Pilih ketebalan font: Regular, Medium, SemiBold, atau Bold.'};
TIPS_EN.veFontWeight = {t: 'Weight', d: 'Choose font weight: Regular, Medium, SemiBold, or Bold.'};
TIPS.veFontSize = {t: 'Ukuran Font', d: 'Ukuran font dalam piksel.'};
TIPS_EN.veFontSize = {t: 'Font Size', d: 'Font size in pixels.'};
TIPS.veLineHeight = {t: 'Tinggi Baris', d: 'Jarak antar baris teks (pengali ukuran font).'};
TIPS_EN.veLineHeight = {t: 'Line Height', d: 'Spacing between text lines (font-size multiplier).'};
TIPS.veLetterSpacing = {t: 'Jarak Huruf', d: 'Jarak antar huruf dalam piksel.'};
TIPS_EN.veLetterSpacing = {t: 'Letter Spacing', d: 'Spacing between letters in pixels.'};
TIPS.veParaSpacing = {t: 'Jarak Paragraf', d: 'Jarak antar paragraf dalam piksel.'};
TIPS_EN.veParaSpacing = {t: 'Paragraph Spacing', d: 'Spacing between paragraphs in pixels.'};
TIPS.veTextBoxW = {t: 'Lebar Kotak', d: 'Lebar kotak teks. Kosongkan untuk kembali ke Lebar Auto.'};
TIPS_EN.veTextBoxW = {t: 'Text Box Width', d: 'Text box width. Clear to return to Auto Width.'};
TIPS.veTextBoxH = {t: 'Tinggi Kotak', d: 'Tinggi kotak teks. Kosongkan untuk kembali ke Tinggi Auto.'};
TIPS_EN.veTextBoxH = {t: 'Text Box Height', d: 'Text box height. Clear to return to Auto Height.'};
TIPS.veTextColor = {t: 'Warna Teks', d: 'Warna isi teks terpilih.'};
TIPS_EN.veTextColor = {t: 'Text Color', d: 'Color of the selected text.'};
TIPS.veGradAddStop = {t: 'Tambah Stop', d: 'Menambah stop warna baru pada gradien.'};
TIPS_EN.veGradAddStop = {t: 'Add Stop', d: 'Adds a new color stop to the gradient.'};
TIPS.veTextImportFont = {t: 'Impor Font', d: 'Impor file font .TTF/.OTF ke proyek.'};
TIPS_EN.veTextImportFont = {t: 'Import Font', d: 'Import a .TTF/.OTF font file into the project.'};
TIPS.veTextToPath = {t: 'Ubah ke Path', d: 'Ubah teks menjadi kurva path vektor yang bisa diedit (Ctrl+Shift+O).'};
TIPS_EN.veTextToPath = {t: 'Convert to Path', d: 'Convert text to editable vector paths (Ctrl+Shift+O).'};
TIPS.veTextResizeAutoW = {t: 'Lebar Auto', d: 'Lebar kotak mengikuti isi teks; kotak tumbuh secara horizontal.'};
TIPS_EN.veTextResizeAutoW = {t: 'Auto Width', d: 'Box width follows the text content; the box grows horizontally.'};
TIPS.veTextResizeAutoH = {t: 'Tinggi Auto', d: 'Tinggi kotak mengikuti isi teks; teks membungkus sesuai lebar kotak.'};
TIPS_EN.veTextResizeAutoH = {t: 'Auto Height', d: 'Box height follows the text content; text wraps to the box width.'};
TIPS.veTextResizeFixed = {t: 'Tetap', d: 'Ukuran kotak teks tetap (lebar × tinggi).'};
TIPS_EN.veTextResizeFixed = {t: 'Fixed', d: 'Fixed text box size (width × height).'};
TIPS.veTextAlignLeft = {t: 'Rata Kiri', d: 'Ratakan teks ke kiri kotak.'};
TIPS_EN.veTextAlignLeft = {t: 'Align Left', d: 'Align text to the left of the box.'};
TIPS.veTextAlignCenter = {t: 'Rata Tengah', d: 'Ratakan teks ke tengah kotak.'};
TIPS_EN.veTextAlignCenter = {t: 'Align Center', d: 'Center text in the box.'};
TIPS.veTextAlignRight = {t: 'Rata Kanan', d: 'Ratakan teks ke kanan kotak.'};
TIPS_EN.veTextAlignRight = {t: 'Align Right', d: 'Align text to the right of the box.'};
TIPS.veTextAlignJustify = {t: 'Rata Kiri-Kanan', d: 'Ratakan teks ke kiri dan kanan kotak.'};
TIPS_EN.veTextAlignJustify = {t: 'Justify', d: 'Justify text to both sides of the box.'};
TIPS.veTextAlignTop = {t: 'Rata Atas', d: 'Ratakan teks ke atas kotak.'};
TIPS_EN.veTextAlignTop = {t: 'Align Top', d: 'Align text to the top of the box.'};
TIPS.veTextAlignMiddle = {t: 'Rata Tengah Vertikal', d: 'Ratakan teks ke tengah vertikal kotak.'};
TIPS_EN.veTextAlignMiddle = {t: 'Align Middle', d: 'Align text to the vertical middle of the box.'};
TIPS.veTextAlignBottom = {t: 'Rata Bawah', d: 'Ratakan teks ke bawah kotak.'};
TIPS_EN.veTextAlignBottom = {t: 'Align Bottom', d: 'Align text to the bottom of the box.'};
TIPS.veTextCaseOrig = {t: 'Sesuai Ketikan', d: 'Tampilkan teks sesuai ketikan.'};
TIPS_EN.veTextCaseOrig = {t: 'As Typed', d: 'Show text as typed.'};
TIPS.veTextCaseUpper = {t: 'Huruf Besar', d: 'Ubah semua huruf menjadi huruf besar.'};
TIPS_EN.veTextCaseUpper = {t: 'Uppercase', d: 'Turn all letters uppercase.'};
TIPS.veTextCaseLower = {t: 'Huruf Kecil', d: 'Ubah semua huruf menjadi huruf kecil.'};
TIPS_EN.veTextCaseLower = {t: 'Lowercase', d: 'Turn all letters lowercase.'};
TIPS.veTextCaseTitle = {t: 'Awalan Kapital', d: 'Awalan setiap kata menjadi huruf kapital.'};
TIPS_EN.veTextCaseTitle = {t: 'Title Case', d: 'Capitalize the first letter of each word.'};
TIPS.veTextDecoNone = {t: 'Tanpa Garis', d: 'Teks tanpa garis bawah atau coret.'};
TIPS_EN.veTextDecoNone = {t: 'No Decoration', d: 'Text without underline or strikethrough.'};
TIPS.veTextDecoUnderline = {t: 'Garis Bawah', d: 'Tambahkan garis bawah pada teks.'};
TIPS_EN.veTextDecoUnderline = {t: 'Underline', d: 'Underline the text.'};
TIPS.veTextDecoStrike = {t: 'Coret Tengah', d: 'Coret teks di tengah.'};
TIPS_EN.veTextDecoStrike = {t: 'Strikethrough', d: 'Strike through the text.'};
TIPS.veTextBold = {t: 'Tebal', d: 'Aktifkan atau matikan gaya tebal (Bold).'};
TIPS_EN.veTextBold = {t: 'Bold', d: 'Toggle bold style.'};
TIPS.veTextItalic = {t: 'Miring', d: 'Aktifkan atau matikan gaya miring (Italic).'};
TIPS_EN.veTextItalic = {t: 'Italic', d: 'Toggle italic style.'};
TIPS.veTextContent = {t: 'Isi Teks', d: 'Tulis atau ubah isi teks. Ctrl+Enter untuk selesai, Esc untuk batal.'};
TIPS_EN.veTextContent = {t: 'Text Content', d: 'Write or edit the text content. Ctrl+Enter to finish, Esc to cancel.'};
TIPS.veTextEditCanvas = {t: 'Edit di Kanvas', d: 'Edit isi teks langsung di kanvas.'};
TIPS_EN.veTextEditCanvas = {t: 'Edit on Canvas', d: 'Edit the text content directly on the canvas.'};
TIPS.veTextUsePlex = {t: 'Pakai Geovanta Sans', d: 'Ganti font teks menjadi Geovanta Sans (font bawaan).'};
TIPS_EN.veTextUsePlex = {t: 'Use Geovanta Sans', d: 'Switch the text font to Geovanta Sans (the built-in font).'};
TIPS.veNodeAutoSmooth = {t: 'Haluskan Kurva Otomatis', d: 'Hitung ulang handle node terpilih dengan Catmull-Rom agar kurva halus otomatis.'};
TIPS_EN.veNodeAutoSmooth = {t: 'Auto Smooth', d: 'Recompute handles of selected nodes with Catmull-Rom for automatic smoothing.'};
TIPS.veNodeBreakHandles = {t: 'Pisahkan Handle', d: 'Handle masuk dan keluar bergerak bebas, tidak lagi saling cermin.'};
TIPS_EN.veNodeBreakHandles = {t: 'Break Handles', d: 'In and out handles move independently, no longer mirrored.'};
TIPS.veNodeJoin = {t: 'Gabung Node', d: 'Gabungkan dua node terpilih menjadi satu.'};
TIPS_EN.veNodeJoin = {t: 'Join Nodes', d: 'Merge two selected nodes into one.'};
TIPS.veNodeSplit = {t: 'Potong Path', d: 'Belah path menjadi dua di node terpilih.'};
TIPS_EN.veNodeSplit = {t: 'Split Path', d: 'Split the path into two at the selected node.'};
TIPS.veNodeReverse = {t: 'Balik Arah Path', d: 'Balik urutan node dan arah path.'};
TIPS_EN.veNodeReverse = {t: 'Reverse Path', d: 'Reverse node order and path direction.'};
TIPS.veNodeToCurves = {t: 'Ubah menjadi Kurva', d: 'Ubah segmen lurus menjadi kurva Bézier tanpa mengubah bentuk.'};
TIPS_EN.veNodeToCurves = {t: 'Convert to Curves', d: 'Turn straight segments into Bézier curves without changing the shape.'};
TIPS.veAntialias = {t: 'Penghalusan Tepi', d: 'Pilih cara kanvas menghaluskan tepi vektor.'};
TIPS_EN.veAntialias = {t: 'Edge Smoothing', d: 'Choose how the canvas smooths vector edges.'};
TIPS.veAntialiasOff = {t: 'Kurangi Celah', d: 'Haluskan tepi dengan 16x Rotated-Grid Supersampling agar garis miring & kurva mulus tanpa memunculkan celah antar objek.'};
TIPS_EN.veAntialiasOff = {t: 'Reduce Seams', d: 'Smooth curves and diagonal edges with 16x Rotated-Grid Supersampling while keeping shared SVG edges completely seam-free.'};
TIPS.veAntialiasOn = {t: 'Standar', d: 'Haluskan tepi setiap objek secara langsung.'};
TIPS_EN.veAntialiasOn = {t: 'Standard', d: 'Smooth each object’s edges directly.'};
TIPS.setAccentRandom = {t: 'Warna Acak', d: 'Terapkan warna aksen acak yang selaras secara instan.'};
TIPS_EN.setAccentRandom = {t: 'Random Accent Color', d: 'Apply a random accent color instantly.'};
TIPS.veCopyColor = {t: 'Salin Warna', d: 'Salin nilai warna solid (Hex/RGBA) ke clipboard.'};
TIPS_EN.veCopyColor = {t: 'Copy Color', d: 'Copy the solid color value (Hex/RGBA) to the clipboard.'};
TIPS.vePasteColor = {t: 'Tempel Warna', d: 'Tempel warna atau gradien dari clipboard.'};
TIPS_EN.vePasteColor = {t: 'Paste Color', d: 'Paste a color or gradient from the clipboard.'};
TIPS.veGradCopy = {t: 'Salin Gradien', d: 'Salin seluruh stop, sudut, dan tipe gradien ke clipboard.'};
TIPS_EN.veGradCopy = {t: 'Copy Gradient', d: 'Copy all gradient stops, angle, and type to the clipboard.'};
TIPS.veGradPaste = {t: 'Tempel Gradien', d: 'Tempel gradien dari clipboard ke objek terpilih.'};
TIPS_EN.veGradPaste = {t: 'Paste Gradient', d: 'Paste a gradient from the clipboard onto selected objects.'};
TIPS.veGradStopCopy = {t: 'Salin Warna Stop', d: 'Salin warna stop gradien yang aktif.'};
TIPS_EN.veGradStopCopy = {t: 'Copy Stop Color', d: 'Copy the active gradient stop color.'};
TIPS.veGradStopPaste = {t: 'Tempel Warna Stop', d: 'Tempel warna solid ke stop gradien yang aktif.'};
TIPS_EN.veGradStopPaste = {t: 'Paste Stop Color', d: 'Paste a solid color onto the active gradient stop.'};
TIPS.setAntialias = {t: 'Penghalusan Tepi Kanvas', d: 'Kurangi celah di tepi yang berimpit atau gunakan penghalusan standar.'};
TIPS_EN.setAntialias = {t: 'Canvas Edge Smoothing', d: 'Reduce seams along shared edges or use standard smoothing.'};
TIPS.veDebugCategoryFilter = {t: 'Filter Kategori Log', d: 'Tampilkan atau sembunyikan log berdasarkan kategori sistem.'};
TIPS_EN.veDebugCategoryFilter = {t: 'Filter Log Category', d: 'Show or hide debug logs by system category.'};
TIPS.veAutoTrace = {t: 'Auto Trace Gambar ke SVG (SVGPeak VMT)', d: 'Konversi gambar raster terpilih menjadi kurva path vektor SVG dengan mesin SVGPeak VMT Bayesian Vectorization (CIE-Lab/CIEDE2000, QuadTree + MRF Potts, Beach Sub-Pixel Deconvolution & Cubic Bézier Fitting).'};
TIPS_EN.veAutoTrace = {t: 'Auto Trace Image to SVG (SVGPeak VMT)', d: 'Convert the selected raster image into editable SVG vector paths using the SVGPeak VMT Bayesian Vectorization Engine (CIE-Lab/CIEDE2000, QuadTree + MRF Potts, Beach Sub-Pixel Deconvolution & Cubic Bézier Fitting).'};
TIPS.veAutoTraceMode = {t: 'Mode Trace (SVGPeak)', d: 'Hitam Putih memakai reduksi 2 warna; Warna (CIE-Lab) mendeteksi palet optimal; Unlimited menangkap gradasi kaya; Ultra 99%+ memakai GPU WebGL2 & kontur presisi tinggi.'};
TIPS_EN.veAutoTraceMode = {t: 'Trace Mode (SVGPeak)', d: 'Black & White uses 2-color reduction; Color (CIE-Lab) detects optimal palette; Unlimited captures rich gradients; Ultra 99%+ uses GPU WebGL2 & exact pixel-faithful contours.'};
TIPS.veAutoTraceGpu = {t: 'Akselerasi GPU (Fallback CPU)', d: 'Gunakan WebGL2 GPU shader untuk pemetaan palet & segmentasi berkecepatan tinggi; otomatis beralih ke CPU jika GPU tidak tersedia.'};
TIPS_EN.veAutoTraceGpu = {t: 'GPU Acceleration (CPU Fallback)', d: 'Use WebGL2 GPU shaders for high-speed palette assignment and segmentation; automatically falls back to CPU if GPU is unavailable.'};
TIPS.veAutoTraceProfile = {t: 'Profil Adaptif 8-Tahap', d: 'Pilih profil Image Profiler SVGPeak: Otomatis, Logo/Flat (sudut C⁰ tegas), Ilustrasi (kurva G¹ organik), atau Foto (pengelompokan tonal & bilateral kuat).'};
TIPS_EN.veAutoTraceProfile = {t: '8-Stage Adaptive Profile', d: 'Select SVGPeak Image Profiler mode: Auto, Logo/Flat (crisp C⁰ corners), Illustration (organic G¹ curves), or Photo (coherent tonal grouping & strong bilateral filter).'};
TIPS.veAutoTraceGradient = {t: 'Mode Gradien SVG', d: 'Ekstraksi otomatis <linearGradient> dan <radialGradient> multi-stop di ruang CIE-Lab pada region bergradasi halus.'};
TIPS_EN.veAutoTraceGradient = {t: 'SVG Gradient Mode', d: 'Automatic extraction of multi-stop <linearGradient> and <radialGradient> in CIE-Lab space across smooth gradient regions.'};
TIPS.veAutoTraceThreshold = {t: 'Ambang Kecerahan (Threshold)', d: 'Batas kecerahan piksel (0–255) yang dianggap sebagai objek gelap pada mode Hitam Putih.'};
TIPS_EN.veAutoTraceThreshold = {t: 'Luminance Threshold', d: 'Pixel brightness cutoff (0–255) treated as foreground in Black & White mode.'};
TIPS.veAutoTraceColors = {t: 'Jumlah Warna', d: 'Jumlah palet layer warna (2–16) yang diekstrak pada mode Warna (Multi-Layer).'};
TIPS_EN.veAutoTraceColors = {t: 'Color Layers', d: 'Number of color layers (2–16) extracted in Color (Multi-Layer) mode.'};
TIPS.veAutoTraceSmooth = {t: 'Kehalusan Kurva Bézier', d: 'Mengatur kehalusan fitting kurva Bézier kubik pada kontur hasil trace (0% = poligon, 100% = kurva halus).'};
TIPS_EN.veAutoTraceSmooth = {t: 'Curve Smoothing', d: 'Controls cubic Bézier curve fitting smoothness along traced contours (0% = polygonal, 100% = smooth curves).'};
TIPS.veAutoTraceCorner = {t: 'Ambang Sudut Tajam', d: 'Sudut belokan di atas nilai ini dipertahankan sebagai titik sudut tajam (corner node).'};
TIPS_EN.veAutoTraceCorner = {t: 'Corner Threshold', d: 'Turn angles sharper than this threshold are preserved as sharp corner nodes.'};
TIPS.veAutoTraceDespeckle = {t: 'Hapus Bintik (Despeckle)', d: 'Mengabaikan bintik/noise gambar yang luasnya lebih kecil dari jumlah piksel ini.'};
TIPS_EN.veAutoTraceDespeckle = {t: 'Despeckle (Min Area)', d: 'Discards tiny speckles or noise contours smaller than this pixel area.'};
TIPS.veAutoTraceIgnoreWhite = {t: 'Abaikan Latar Putih', d: 'Jika aktif, area latar belakang berwarna putih bersih tidak ikut dijadikan objek path.'};
TIPS_EN.veAutoTraceIgnoreWhite = {t: 'Ignore White Background', d: 'When enabled, near-white background regions are omitted from the generated vector paths.'};
TIPS.veAutoTraceKeepImg = {t: 'Pertahankan Gambar Asli', d: 'Jika aktif, objek gambar raster asli tetap disimpan di bawah hasil trace vektor.'};
TIPS_EN.veAutoTraceKeepImg = {t: 'Keep Original Image', d: 'When enabled, the original raster image object is kept underneath the traced vector paths.'};
TIPS.veAutoTraceRun = {t: 'Trace Gambar ke SVG', d: 'Jalankan konversi Auto Trace berbasis Rust/WASM pada gambar terpilih (1 langkah Undo).'};
TIPS_EN.veAutoTraceRun = {t: 'Trace Image to SVG', d: 'Run Rust/WASM Auto Trace conversion on the selected image (single Undo step).'};
TIPS.icJumpPage = {t: 'Lompat Halaman', d: 'Lompat 5 halaman sekaligus pada daftar ikon.'};
TIPS_EN.icJumpPage = {t: 'Jump Page', d: 'Jump 5 pages forward or backward in the icon grid.'};
TIPS.veSeparateIcon = {t: 'Pisahkan Objek Ikon', d: 'Memecah ikon atau compound path yang terdiri dari beberapa bagian terpisah menjadi objek-objek mandiri yang bisa dipilih dan diwarnai sendiri-sendiri, sambil menjaga lubang (hole) tetap menyatu dengan induknya.'};
TIPS_EN.veSeparateIcon = {t: 'Separate Icon Objects', d: 'Splits a multi-part icon or compound path into independent objects that can be selected and styled individually, while keeping inner holes attached to their parent shape.'};
TIPS.veFillEmpty = {t: 'Isi Ruang Kosong', d: 'Mengisi ruang kosong tertutup yang terhubung langsung ke objek path terpilih (seperti ruang bekas objek tetangga atau anak yang dihapus) ke dalam objek tersebut. Objek yang terpisah oleh penghalang tidak dapat mengisi ruang tersebut.'};
TIPS_EN.veFillEmpty = {t: 'Fill Empty Space', d: 'Expands the selected closed path object to absorb directly bordering enclosed empty pockets (such as gaps left by deleted neighbor or child objects). Objects separated by another shape cannot fill that pocket.'};
TIPS.veSolidToGrad = {t: 'Solid ke Gradien', d: 'Ubah warna isi solid objek terpilih menjadi gradien OKLab halus (Linear, Radial, atau Angular) yang relevan dari satu atau beberapa warna solid.'};
TIPS_EN.veSolidToGrad = {t: 'Solid to Gradient', d: 'Convert solid fill color(s) of selected objects into smooth OKLab gradients (Linear, Radial, or Angular) tailored from the selected colors.'};
TIPS.veS2gType = {t: 'Tipe Gradien', d: 'Pilih jenis gradien halus yang dihasilkan: Linear, Radial, atau Angular.'};
TIPS_EN.veS2gType = {t: 'Gradient Type', d: 'Choose the generated smooth gradient type: Linear, Radial, or Angular.'};
TIPS.veS2gAngle = {t: 'Arah & Sudut Gradien', d: 'Atur arah sudut untuk gradien Linear atau sudut awal untuk gradien Angular.'};
TIPS_EN.veS2gAngle = {t: 'Gradient Direction & Angle', d: 'Adjust the direction angle for Linear gradients or starting angle for Angular gradients.'};
TIPS.veS2gPreset = {t: 'Terapkan Gradien Halus', d: 'Klik untuk menerapkan variasi gradien OKLab halus ini ke objek terpilih (tanpa menumpuk objek solid).'};
TIPS_EN.veS2gPreset = {t: 'Apply Smooth Gradient', d: 'Click to apply this smooth OKLab gradient directly to the selected object fill (no stacked solid layers).'};
TIPS.veWireframe = {t: 'Mode Outline / Wireframe', k: 'Shift+O', d: 'Tampilkan kerangka garis luar path tanpa fill untuk memudahkan seleksi dan inspeksi geometri.'};
TIPS_EN.veWireframe = {t: 'Outline / Wireframe Mode', k: 'Shift+O', d: 'Show path outlines without fills for easier selection and geometry inspection.'};
TIPS.veHistoryPanel = {t: 'Riwayat Versi & Snapshot', d: 'Buka timeline riwayat Undo/Redo dan simpan atau pulihkan snapshot versi dokumen.'};
TIPS_EN.veHistoryPanel = {t: 'Version History & Snapshots', d: 'Open the Undo/Redo timeline and save or restore named document version snapshots.'};
TIPS.veArtboardsToggle = {t: 'Kelola Halaman / Artboard', d: 'Tampilkan atau sembunyikan panel daftar halaman dan artboard proyek.'};
TIPS_EN.veArtboardsToggle = {t: 'Manage Pages / Artboards', d: 'Show or hide the project pages and artboards list panel.'};
TIPS.veSimplifyPreview = {t: 'Pratinjau Simplify', d: 'Tampilkan pratinjau langsung hasil penyederhanaan kurva di kanvas.'};
TIPS_EN.veSimplifyPreview = {t: 'Simplify Preview', d: 'Show live preview of the simplified curve on the canvas.'};
TIPS.veSimplifyCancel = {t: 'Batal Simplify', d: 'Batalkan perubahan penyederhanaan kurva dan kembalikan path asal.'};
TIPS_EN.veSimplifyCancel = {t: 'Cancel Simplify', d: 'Discard curve simplification changes and restore the original path.'};
TIPS.veLayFilterAll = {t: 'Semua Layer', d: 'Tampilkan semua tipe layer di daftar.'};
TIPS_EN.veLayFilterAll = {t: 'All Layers', d: 'Show all layer types in the list.'};
TIPS.veLayFilterPath = {t: 'Filter Path', d: 'Tampilkan hanya layer path & bentuk vektor.'};
TIPS_EN.veLayFilterPath = {t: 'Filter Paths', d: 'Show only vector path and shape layers.'};
TIPS.veLayFilterText = {t: 'Filter Teks', d: 'Tampilkan hanya layer tipografi / teks.'};
TIPS_EN.veLayFilterText = {t: 'Filter Text', d: 'Show only typography / text layers.'};
TIPS.veLayFilterImage = {t: 'Filter Gambar', d: 'Tampilkan hanya layer gambar raster.'};
TIPS_EN.veLayFilterImage = {t: 'Filter Images', d: 'Show only raster image layers.'};
TIPS.veLayFilterFrame = {t: 'Filter Frame', d: 'Tampilkan hanya container Frame & Auto Layout.'};
TIPS_EN.veLayFilterFrame = {t: 'Filter Frames', d: 'Show only Frame & Auto Layout containers.'};
TIPS.veGridRulersMenu = {t: 'Opsi Grid & Rulers', d: 'Atur tampilan grid, penggaris (rulers), garis bantu (guides), dan satuan pengukuran.'};
TIPS_EN.veGridRulersMenu = {t: 'Grid & Rulers Options', d: 'Configure grid, rulers, guides visibility/lock, and ruler units.'};
TIPS.veGridToggle = {t: 'Tampilkan Grid', d: 'Tampilkan atau sembunyikan grid latar pada kanvas.'};
TIPS_EN.veGridToggle = {t: 'Show Grid', d: 'Show or hide the canvas background grid.'};
TIPS.veRulersToggle = {t: 'Tampilkan Rulers', d: 'Tampilkan atau sembunyikan penggaris di tepi atas dan kiri kanvas.'};
TIPS_EN.veRulersToggle = {t: 'Show Rulers', d: 'Show or hide top and left canvas rulers.'};
TIPS.veGuidesToggle = {t: 'Tampilkan Guides', d: 'Tampilkan atau sembunyikan garis bantu (guides) yang ditarik dari penggaris.'};
TIPS_EN.veGuidesToggle = {t: 'Show Guides', d: 'Show or hide guides dragged from the rulers.'};
TIPS.veGuidesLock = {t: 'Kunci Guides', d: 'Cegah garis bantu tergeser secara tidak sengaja saat mengedit objek.'};
TIPS_EN.veGuidesLock = {t: 'Lock Guides', d: 'Prevent guides from being moved accidentally while editing.'};
TIPS.veRulerUnit = {t: 'Satuan Ruler', d: 'Pilih satuan pengukuran penggaris dan koordinat (px, mm, cm, in, pt).'};
TIPS_EN.veRulerUnit = {t: 'Ruler Unit', d: 'Choose the ruler and coordinate measurement unit (px, mm, cm, in, pt).'};
TIPS.veResetOrigin = {t: 'Reset Origin Ruler', d: 'Kembalikan titik nol (0, 0) penggaris ke sudut awal.'};
TIPS_EN.veResetOrigin = {t: 'Reset Ruler Origin', d: 'Reset the ruler origin (0, 0) back to the default corner.'};
TIPS.veClearGuides = {t: 'Hapus Semua Guides', d: 'Hapus seluruh garis bantu dari kanvas.'};
TIPS_EN.veClearGuides = {t: 'Clear All Guides', d: 'Remove all guides from the canvas.'};
TIPS.veNodeSizePreset = {t: 'Preset Ukuran Node', d: 'Terapkan skala ukuran tampilan node dan handle.'};
TIPS_EN.veNodeSizePreset = {t: 'Node Size Preset', d: 'Apply a display scale preset for nodes and handles.'};
TIPS.veNodeSizeReset = {t: 'Reset Ukuran Node', d: 'Kembalikan ukuran tampilan node & handle ke 100%.'};
TIPS_EN.veNodeSizeReset = {t: 'Reset Node Size', d: 'Reset node and handle display scale to 100%.'};
TIPS.veCornerSelectAll = {t: 'Pilih Semua Sudut', d: 'Aktifkan seluruh sudut terdeteksi untuk diatur radiusnya sekaligus.'};
TIPS_EN.veCornerSelectAll = {t: 'Select All Corners', d: 'Select all detected corners to adjust their radius together.'};
TIPS.veCornerSelectOdd = {t: 'Pilih Sudut Ganjil', d: 'Pilih sudut bernomor ganjil saja (1, 3, 5, ...).'};
TIPS_EN.veCornerSelectOdd = {t: 'Select Odd Corners', d: 'Select odd-numbered corners only (1, 3, 5, ...).'};
TIPS.veCornerSelectEven = {t: 'Pilih Sudut Genap', d: 'Pilih sudut bernomor genap saja (2, 4, 6, ...).'};
TIPS_EN.veCornerSelectEven = {t: 'Select Even Corners', d: 'Select even-numbered corners only (2, 4, 6, ...).'};
TIPS.veCornerSharpen = {t: 'Tajamkan Sudut (0)', d: 'Atur radius sudut terpilih kembali ke 0 (sudut tajam).'};
TIPS_EN.veCornerSharpen = {t: 'Sharpen Corners (0)', d: 'Reset selected corner radii to 0 (sharp corners).'};
TIPS.veTracePreset = {t: 'Preset Auto Trace', d: 'Terapkan profil konfigurasi Auto Trace cepat sesuai jenis gambar.'};
TIPS_EN.veTracePreset = {t: 'Auto Trace Preset', d: 'Apply a quick Auto Trace configuration preset for the image type.'};
TIPS.veTraceAdvanced = {t: 'Pengaturan Lanjutan Trace', d: 'Buka atau tutup opsi lanjutan mode, profil, smoothing, dan despeckle.'};
TIPS_EN.veTraceAdvanced = {t: 'Advanced Trace Settings', d: 'Expand or collapse advanced trace mode, profile, smoothing, and despeckle options.'};
TIPS.veAddExtraFill = {t: 'Tambah Fill Tambahan', d: 'Tambahkan lapisan Fill baru (Appearance Stack) di atas objek terpilih.'};
TIPS_EN.veAddExtraFill = {t: 'Add Extra Fill', d: 'Add another Fill layer (Appearance Stack) onto selected objects.'};
TIPS.veAddExtraStroke = {t: 'Tambah Stroke Tambahan', d: 'Tambahkan lapisan Stroke baru (Appearance Stack) pada objek terpilih.'};
TIPS_EN.veAddExtraStroke = {t: 'Add Extra Stroke', d: 'Add another Stroke layer (Appearance Stack) onto selected objects.'};
TIPS.veRemoveExtraPaint = {t: 'Hapus Lapisan Paint', d: 'Hapus lapisan fill atau stroke tambahan ini.'};
TIPS_EN.veRemoveExtraPaint = {t: 'Remove Paint Layer', d: 'Remove this extra fill or stroke layer.'};
TIPS.veFxAddShadow = {t: 'Tambah Drop Shadow', d: 'Tambahkan efek bayangan luar pada objek terpilih.'};
TIPS_EN.veFxAddShadow = {t: 'Add Drop Shadow', d: 'Add an outer drop shadow effect to selected objects.'};
TIPS.veFxAddInnerShadow = {t: 'Tambah Inner Shadow', d: 'Tambahkan efek bayangan dalam pada objek terpilih.'};
TIPS_EN.veFxAddInnerShadow = {t: 'Add Inner Shadow', d: 'Add an inner shadow effect to selected objects.'};
TIPS.veFxAddOuterGlow = {t: 'Tambah Outer Glow', d: 'Tambahkan efek cahaya luar (glow) di sekeliling objek.'};
TIPS_EN.veFxAddOuterGlow = {t: 'Add Outer Glow', d: 'Add an outer glow effect around selected objects.'};
TIPS.veFxAddInnerGlow = {t: 'Tambah Inner Glow', d: 'Tambahkan efek cahaya dalam pada tepi dalam objek.'};
TIPS_EN.veFxAddInnerGlow = {t: 'Add Inner Glow', d: 'Add an inner glow effect along the inside edges.'};
TIPS.veFxAddLayerBlur = {t: 'Tambah Layer Blur', d: 'Tambahkan efek buram Gaussian pada objek.'};
TIPS_EN.veFxAddLayerBlur = {t: 'Add Layer Blur', d: 'Add a Gaussian blur effect to the object.'};
TIPS.veFxAddBgBlur = {t: 'Tambah Background Blur', d: 'Tambahkan efek buram latar belakang (frosted glass) di balik objek.'};
TIPS_EN.veFxAddBgBlur = {t: 'Add Background Blur', d: 'Add a backdrop blur (frosted glass) effect behind the object.'};
TIPS.veFxAddNoiseGrain = {t: 'Tambah Noise / Grain', d: 'Tambahkan tekstur bintik halus (grain) pada objek.'};
TIPS_EN.veFxAddNoiseGrain = {t: 'Add Noise / Grain', d: 'Add a subtle film grain / noise texture effect.'};
TIPS.veHistTabTimeline = {t: 'Tab Riwayat', d: 'Lihat daftar langkah pengeditan (Undo/Redo) dan lompat ke titik mana pun.'};
TIPS_EN.veHistTabTimeline = {t: 'History Tab', d: 'View Undo/Redo editing steps and jump to any point.'};
TIPS.veHistTabSnapshots = {t: 'Tab Snapshot', d: 'Simpan dan kelola snapshot versi bernama untuk proyek ini.'};
TIPS_EN.veHistTabSnapshots = {t: 'Snapshots Tab', d: 'Save and manage named version snapshots for this project.'};
TIPS.veHistStep = {t: 'Lompat ke Langkah Ini', d: 'Klik untuk memulihkan status dokumen ke langkah riwayat ini.'};
TIPS_EN.veHistStep = {t: 'Jump to This Step', d: 'Click to restore the document state to this history step.'};
TIPS.veHistSaveSnap = {t: 'Simpan Snapshot', d: 'Simpan kondisi dokumen saat ini sebagai snapshot versi bernama.'};
TIPS_EN.veHistSaveSnap = {t: 'Save Snapshot', d: 'Save the current document state as a named version snapshot.'};
TIPS.veHistRestoreSnap = {t: 'Pulihkan Snapshot', d: 'Terapkan kembali isi snapshot ini ke kanvas.'};
TIPS_EN.veHistRestoreSnap = {t: 'Restore Snapshot', d: 'Restore this snapshot onto the canvas.'};
TIPS.veHistDeleteSnap = {t: 'Hapus Snapshot', d: 'Hapus snapshot tersimpan ini secara permanen.'};
TIPS_EN.veHistDeleteSnap = {t: 'Delete Snapshot', d: 'Delete this saved snapshot permanently.'};
TIPS.veArtboardAdd = {t: 'Tambah Artboard Baru', d: 'Buat halaman / artboard baru di dalam proyek.'};
TIPS_EN.veArtboardAdd = {t: 'Add New Artboard', d: 'Create a new page / artboard in this project.'};
TIPS.veArtboardDelete = {t: 'Hapus Artboard', d: 'Hapus artboard ini dari proyek.'};
TIPS_EN.veArtboardDelete = {t: 'Delete Artboard', d: 'Remove this artboard from the project.'};
TIPS.vePdfColorSpace = {t: 'Profil Warna PDF', d: 'Pilih ruang warna ekspor PDF: RGB (layar) atau CMYK (cetak).'};
TIPS_EN.vePdfColorSpace = {t: 'PDF Color Space', d: 'Choose PDF export color space: RGB (screen) or CMYK (print).'};
TIPS.veBatchExport = {t: 'Batch Export', d: 'Ekspor sekaligus dalam format SVG serta PNG 1x dan 2x.'};
TIPS_EN.veBatchExport = {t: 'Batch Export', d: 'Export SVG plus PNG 1x and 2x in one batch.'};
TIPS.veExportBackup = {t: 'Ekspor Arsip Backup', d: 'Unduh cadangan penuh proyek dalam format .geovanta.'};
TIPS_EN.veExportBackup = {t: 'Export Backup Archive', d: 'Download a full project backup in .geovanta format.'};
TIPS.setAccentPipette = {t: 'Ambil Warna Layar (Pipet)', d: 'Pilih warna aksen langsung dari piksel mana pun di layar.'};
TIPS_EN.setAccentPipette = {t: 'Pick Screen Color (Pipette)', d: 'Pick an accent color directly from any pixel on screen.'};
TIPS.setAccentDefault = {t: 'Warna Aksen Default', d: 'Kembalikan warna aksen ke hijau standar Geovanta (#13B152).'};
TIPS_EN.setAccentDefault = {t: 'Default Accent Color', d: 'Reset the accent color to Geovanta default green (#13B152).'};
TIPS.setEngineParams = {t: 'Parameter Mesin Vektor', d: 'Tampilkan atau sembunyikan pengaturan koordinat lokal, toleransi piksel, dan kedalaman Bézier.'};
TIPS_EN.setEngineParams = {t: 'Vector Engine Parameters', d: 'Show or hide local coordinate rebasing, pixel error target, and Bézier recursion depth.'};
TIPS.setTabDebug = {t: 'Tab Debug', d: 'Buka Debugging Mode, log live, konsol fungsi, dan benchmark engine.'};
TIPS_EN.setTabDebug = {t: 'Debug Tab', d: 'Open Debugging Mode, live logs, function console, and engine benchmarks.'};
TIPS.setAiToggle = {t: 'Aktif/Nonaktifkan AI & MCP', d: 'Nyalakan atau matikan integrasi AI Assistant & Model Context Protocol (MCP).'};
TIPS_EN.setAiToggle = {t: 'Toggle AI & MCP', d: 'Enable or disable AI Assistant & Model Context Protocol (MCP) integration.'};
TIPS.setAiConnect = {t: 'Hubungkan ke Server MCP', d: 'Mulai koneksi WebSocket/HTTP ke server AI MCP lokal atau tunnel.'};
TIPS_EN.setAiConnect = {t: 'Connect to MCP Server', d: 'Start WebSocket/HTTP connection to the local or tunnel AI MCP server.'};
TIPS.setAiDisconnect = {t: 'Putuskan Koneksi MCP', d: 'Tutup koneksi live ke server AI MCP.'};
TIPS_EN.setAiDisconnect = {t: 'Disconnect MCP', d: 'Close the live connection to the AI MCP server.'};
TIPS.setAiOpenLocal = {t: 'Buka Server Lokal', d: 'Buka alamat server WebSocket & HTTP lokal di tab baru.'};
TIPS_EN.setAiOpenLocal = {t: 'Open Local Server', d: 'Open the local WebSocket & HTTP server URL in a new tab.'};
TIPS.setAiAutoConnect = {t: 'Auto-Connect Bridge', d: 'Hubungkan bridge AI MCP secara otomatis setiap kali Geovanta dibuka.'};
TIPS_EN.setAiAutoConnect = {t: 'Auto-Connect Bridge', d: 'Automatically connect the AI MCP bridge whenever Geovanta opens.'};
TIPS.setAiSaveConnect = {t: 'Simpan & Hubungkan Tunnel', d: 'Simpan URL WebSocket/Tunnel kustom lalu hubungkan ke server.'};
TIPS_EN.setAiSaveConnect = {t: 'Save & Connect Tunnel', d: 'Save the custom WebSocket/Tunnel URL and connect to the server.'};
TIPS.setAiCopy = {t: 'Salin ke Clipboard', d: 'Salin nilai atau konfigurasi ini ke clipboard.'};
TIPS_EN.setAiCopy = {t: 'Copy to Clipboard', d: 'Copy this value or configuration to the clipboard.'};
TIPS.dbgToggle = {t: 'Aktif/Nonaktifkan Debugging Mode', d: 'Nyalakan atau matikan perekaman log interaksi dan telemetri secara real-time.'};
TIPS_EN.dbgToggle = {t: 'Toggle Debugging Mode', d: 'Turn real-time interaction logging and telemetry recording on or off.'};
TIPS.dbgTabLog = {t: 'Log Live', d: 'Lihat aliran log interaksi kanvas, filter kategori, dan pencarian.'};
TIPS_EN.dbgTabLog = {t: 'Live Log', d: 'View live canvas interaction logs with category filter and search.'};
TIPS.dbgTabConsole = {t: 'Konsol Fungsi', d: 'Pantau fungsi aktif dan aliran perubahan (prev → next) secara real-time.'};
TIPS_EN.dbgTabConsole = {t: 'Function Console', d: 'Monitor active functions and prev → next state changes in real time.'};
TIPS.dbgTabEngine = {t: 'Engine & Visual', d: 'Kontrol overlay mesh/wireframe, telemetri GPU, skenario uji, dan benchmark.'};
TIPS_EN.dbgTabEngine = {t: 'Engine & Visual', d: 'Control mesh/wireframe overlays, GPU telemetry, test scenarios, and benchmarks.'};
TIPS.dbgClearSearch = {t: 'Hapus Pencarian Log', d: 'Kosongkan kata kunci pencarian log.'};
TIPS_EN.dbgClearSearch = {t: 'Clear Log Search', d: 'Clear the log search filter.'};
TIPS.dbgPause = {t: 'Jeda / Lanjutkan Log', d: 'Tahan sementara pembaruan tampilan log live atau lanjutkan kembali.'};
TIPS_EN.dbgPause = {t: 'Pause / Resume Log', d: 'Temporarily pause or resume live log stream updates.'};
TIPS.dbgClear = {t: 'Bersihkan Log', d: 'Hapus seluruh entri log debug yang tercatat saat ini.'};
TIPS_EN.dbgClear = {t: 'Clear Logs', d: 'Clear all currently recorded debug log entries.'};
TIPS.dbgExportJson = {t: 'Unduh Log JSON', d: 'Ekspor seluruh log debug dalam format JSON.'};
TIPS_EN.dbgExportJson = {t: 'Download JSON Logs', d: 'Export all debug logs in JSON format.'};
TIPS.dbgExportMd = {t: 'Unduh Laporan Markdown', d: 'Ekspor ringkasan log debug dalam format Markdown (.md).'};
TIPS_EN.dbgExportMd = {t: 'Download Markdown Report', d: 'Export a debug log summary in Markdown (.md) format.'};
TIPS.dbgOverlayMode = {t: 'Mode Overlay Geometri', d: 'Tampilkan overlay visual path asli, polyline, mesh tessellation, atau seam guard di kanvas.'};
TIPS_EN.dbgOverlayMode = {t: 'Geometry Overlay Mode', d: 'Display original paths, flattened polylines, tessellation meshes, or seam guards on the canvas.'};
TIPS.dbgTestScenario = {t: 'Muat Skenario Uji', d: 'Muat dokumen atau SVG uji standar ke kanvas untuk pengujian render.'};
TIPS_EN.dbgTestScenario = {t: 'Load Test Scenario', d: 'Load a standard benchmark document or SVG onto the canvas for render testing.'};
TIPS.dbgRunBench = {t: 'Jalankan Semua Benchmark', d: 'Jalankan suite benchmark otomatis (9 skenario) dan ukur waktu render aktual.'};
TIPS_EN.dbgRunBench = {t: 'Run Automated Benchmarks', d: 'Run the automated 9-scenario benchmark suite and measure actual render timings.'};
TIPS.veExitIsolation = {t: 'Keluar Mode Isolasi', k: 'Esc', d: 'Kembali mengedit seluruh kanvas dan keluar dari mode isolasi grup/frame.'};
TIPS_EN.veExitIsolation = {t: 'Exit Isolation Mode', k: 'Esc', d: 'Return to editing the full canvas and exit group/frame isolation mode.'};
export { TIPS, TIPS_EN };
export default TIPS;
