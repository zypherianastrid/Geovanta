/**
 * @file src/constants/tooltipsCatalog.jsx
 * @description Katalog lengkap teks tooltip Bahasa Indonesia
 */
/* ---------- Tooltip kustom (delegasi event pada atribut data-tip) ---------- */
const TIPS = {
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
  veAutoHandle: {
    k: 'B',
    t: 'Auto Handle Bézier',
    d: 'Klik sebuah node (atau badan objek) untuk memberi SEMUA node pada subpath itu handle Bézier yang mulus (Centripetal Catmull-Rom, tanpa lipatan). Seret kanan/kiri setelah klik untuk mengatur ketegangan secara live.',
    w: 'Mengubah poligon bergerigi menjadi kurva mulus sekaligus.'
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
    d: 'Multi-snap ala Figma: klik panah kecil di sebelahnya untuk memilih fitur (Smart Guides kotak/pusat, Jarak Sama Rata, Artboard, Node & Handle, Sumbu X/Y node, Midpoint, Kontur, Siku 90°/perpanjangan, Grid, Piksel). Sumbu X dan Y menempel secara independen. Saat menyeret, node dan handle Bézier menempel ke node/handle objek lain (lingkaran merah), ke tepi/kontur objek lain (berlian hijau), lalu ke grid. Titik handle yang diseret juga menempel ke garis handle Bézier lain (berlian oranye). Toleransi 8 piksel layar. Tahan Alt untuk menonaktifkan sementara.'
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
  veInspect: {
    k: 'I',
    t: 'Inspeksi Geometri',
    d: 'Deteksi otomatis anomali (garis meleyot, faset, sudut menumpuk, node redundan) secara non-destruktif.',
    w: 'Periksa kebersihan path sebelum ekspor atau sebelum mengedit.'
  },
  veSimplify: {
    k: 'S',
    t: 'Simplify',
    d: 'Menyederhanakan path kurva Bézier dengan algoritma least-squares cubic fitting VectorCraft (Object › Path › Simplify).',
    w: 'Mengurangi jumlah anchor point sambil menjaga presisi bentuk dan sudut.'
  },
  veInspectOverlay: {
    t: 'Overlay Indikator',
    d: 'Tampilkan atau sembunyikan penanda anomali di canvas.'
  },
  veShape: {
    t: 'Shape',
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
  veInspectHeatmap: {
    t: 'Heatmap Kepadatan',
    d: 'Visualisasi glow konsentrasi kepadatan node di canvas.'
  },
  veCornerEps: {
    t: 'Radius Sudut (ε)',
    d: 'Jarak maksimum antar-node agar dikelompokkan sebagai cluster sudut yang menumpuk.'
  },
  veCollinearTol: {
    t: 'Toleransi Kolinier',
    d: 'Simpangan tegak lurus maksimum agar node pada garis lurus dianggap redundan.'
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
    t: 'Auto-Simplify',
    d: 'Menentukan level Simplify otomatis dari ukuran objek terpilih (size / 400).'
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
  veCleanAll: {
    t: 'Bersihkan semua',
    d: 'Memperbaiki semua anomali yang terdeteksi sekaligus. Bisa di-undo.'
  },
  veAnomBadge: {
    t: 'Total anomali',
    d: 'Jumlah semua anomali geometri yang terdeteksi pada dokumen saat ini.'
  },
  veAnomList: {
    t: 'Daftar anomali',
    d: 'Anomali geometri yang ditemukan pada path, sesuai kategori yang dipilih.'
  },
  veAnomFocus: {
    t: 'Fokus',
    d: 'Memilih objek terkait dan memusatkan canvas pada anomali ini.'
  },
  veAnomFix: {
    t: 'Perbaiki',
    d: 'Memperbaiki anomali ini saja dengan cara yang sesuai jenisnya. Bisa di-undo.'
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
    d: 'Mengembalikan checklist ke pengaturan bawaan: semua panduan pintar dan grid aktif, tanpa pembulatan piksel.'
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
  }
};

export { TIPS };
export default TIPS;
