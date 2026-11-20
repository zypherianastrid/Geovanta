# Design — Iconify pindah ke modal popup (pendekatan A)

**Tanggal:** 2026-11-15
**Status:** menunggu persetujuan user
**Pendekatan yang dipilih user:** A — panel yang ada dibungkus modal (bukan
layout modal baru dari nol).

## 1. Intent dan kenapa

Panel Ikon hari ini adalah seksi sempit di sidebar kanan (±235 px). Memilih
ikon di kolom sempit itu lambat: grid hanya 6 kolom, thumbnail kecil, dan
panel berbagi ruang dengan seluruh inspector. User minta ikon ditampilkan di
**modal popup saja** — jendela besar di tengah kanvas — supaya lebih mudah
dipilih dan disisip. Di dalam modal harus ada: pilihan jenis set ikon,
kategori, dan fungsi search.

Keputusan user yang sudah dicatat:
- Modal **tetap terbuka** sesudah sisip, supaya bisa sisip banyak ikon
  berurutan (bukan tutup setelah satu ikon).
- Pendekatan **A**: bungkus `IconifyPanel` yang ada ke dalam modal, bukan
  tulis ulang layout.

## 2. Goals

- G1: Panel Ikon tampil sebagai modal popup di tengah kanvas, bukan lagi
  seksi sidebar kanan. Tidak ada lagi seksi Iconify di sidebar.
- G2: Di dalam modal ada: search (sama seperti sekarang), dropdown pilih
  set ikon (koleksi), dropdown filter **kategori**, grid thumbnail yang
  lebih lega.
- G3: Klik ikon → tersisip ke kanvas (alur yang sama seperti sekarang),
  modal tetap terbuka, toast sukses tampil, ikon tercatat di "Terakhir
  dipakai".
- G4: Tutup modal lewat: tombol X, Esc, klik backdrop. (Bukan lewat
  pindah tool / tombol floating bar — lihat §9 Q2: overlay `.ov`
  menutupi floating bar, dan handler keyboard global mati selama dialog
  terbuka, jadi keduanya tidak bisa dipakai selama modal terbuka.)
- G5: Semua perilaku lama yang tidak disebut di sini tetap jalan: mode
  telusur default (Material Symbols), cari lintas set, "Muat lagi",
  offline (pesan + recent tetap tampil), lisensi, "Terakhir dipakai".

## 3. Non-goals dan anti-goals

- Non-goal: mengubah alur sisip (loadSet → buildIconSvg → parseSVG →
  frame 96 px, aturan warna palette/monokrom), mengubah API/search,
  mengubah offline/recent/lisensi, menambah dependensi, mode mobile /
  responsif (keputusan yang tetap berlaku: **desktop saja, ≥1280**).
- Non-goal: drag ikon dari modal ke kanvas; favorit; pratinjau ukuran
  besar.
- Anti-goal: sidebar tetap menyimpan salinan panel Ikon (duplikat).
  Anti-goal: modal menutup sendiri sesudah satu sisipan.
  Anti-goal: menampilkan string error mentah (kontrak lama tetap berlaku).

## 4. Keadaan sekarang (fakta, sudah dibaca dari kode)

- `src/components/editor/IconifyPanel.jsx` — panel lengkap: search
  (debounce 300 ms, limit 48), dropdown koleksi, grid telusur/cari,
  recent (maks. 12 nama), catatan lisensi, status online/offline internal
  (probeOnline + listener). Thumbnail 28 px dari `buildIconSvg` → data URI
  `<img>` (sudah diperbaiki: xmlns wajib, bug 2026-11-15). Esc menutup
  panel (dengan guard overlay edit teks / popover `.flt`).
- Mount sekarang: `src/components/editor/EditorRightInspector.jsx` —
  `{tool === 'iconify' && <IconifyPanel open onInsert={onIconifyInsert}
  onClose={onIconifyClose} L={L} recentIcons={recentIcons} />}` di dalam
  `.fig-r-scroll` sidebar kanan.
- Wiring: `src/components/editor/VectorEditor.jsx` — state `tool`
  (`'iconify'` saat aktif), `setToolToggle` (klik tombol Ikon saat aktif
  → kembali `'select'`), `onIconifyClose = setTool('select')`,
  `onIconifyInsert` (async; **tidak** menutup panel — sudah sesuai G3),
  tombol floating bar `[data-tip="veIconify"]` dengan `aria-pressed`.
- Pola modal yang sudah ada: `src/components/modals/SettingsModal.jsx`
  dan `HelpShortcutsModal.jsx` — `ReactDOM.createPortal(<div
  className="ov in/out" onPointerDown={backdrop → onClose}><div
  className="hp stg-modal" role="dialog" style={{maxWidth: 740}}>…`,
  animasi `usePresence(open, 200)`. `VectorEditor.jsx` juga sudah memakai
  pola portal `.ov` yang sama untuk import modal.
- Kategori: **API sudah mengembalikannya** (terverifikasi live 2026-11-15:
  `GET /collections` → tiap koleksi punya `"category"`, mis. Material
  Symbols = `"Material"`). Tapi `listCollections()` di
  `src/renderer/iconifyClient.jsx` **membuang** field itu saat memetakan
  (hanya prefix, name, total, license, palette). Jadi filter kategori
  tidak butuh API baru — hanya meneruskan field yang sudah ada.
- Label i18n ada di `src/constants/appI18n.jsx` (`icTitle` … `icResults`,
  ID ±baris 397–411, EN ±855–869). Label kategori belum ada.
- Preseden berlawanan arah: 2026-11-14, Find & Replace dipindah dari modal
  ke seksi sidebar (T7) karena alurnya butuh berdampingan dengan inspector.
  Iconify justru sebaliknya — grid butuh lebar — jadi arah modal di sini
  disengaja, bukan inkonsisten.

## 5. Approaches yang dipertimbangkan

- **A (dipilih user): panel yang ada dibungkus modal.** `IconifyPanel`
  beserta seluruh logikanya pindah utuh ke wadah modal; tambah satu
  dropdown kategori; hapus mount di sidebar. Trade-off: susunan di dalam
  modal masih urutan panel lama (cari, dropdown, grid) — tapi di wadah
  lebar grid otomatis jadi banyak kolom (sudah `flex-wrap`).
  Keuntungan: semua yang teruji (suite 300/300, probe-iconify 52/52,
  probe-offline 14/14, probe-thumb 3/3) tetap berlaku, risiko regresi
  kecil, pengerjaan paling cepat.
- **B (ditolak user): modal baru layout khusus.** Header search besar +
  dropdown set/kategori sebaris, grid 8–10 kolom thumbnail besar, footer
  recent + lisensi. Paling rapi untuk memilih banyak, tapi logika teruji
  harus disentuh ulang dan probe ditulis ulang — lebih lama, risiko
  regresi lebih besar.

## 6. Desain (pendekatan A)

### 6.1 Wadah modal baru: `src/components/modals/IconifyModal.jsx`

- Komponen tipis (wrapper saja, tanpa logika cari/sisip): portal
  `ReactDOM.createPortal`, overlay `<div className="ov in">` dengan
  `onPointerDown` → `onClose` hanya bila klik tepat di backdrop
  (`e.target === e.currentTarget`, sama seperti `SettingsModal`), dan
  dialog `<div className="hp" role="dialog" aria-label={L.icTitle}
  data-testid="ic-modal">` yang merender `<IconifyPanel …/>` di dalamnya.
  **Guard backdrop (hasil builder check Q4, keputusan saya):** klik
  backdrop **diabaikan** bila popover dropdown (`.flt`) sedang terbuka —
  guard yang sama dengan handler Esc panel — supaya klik di luar dropdown
  (cara normal menutup dropdown) tidak ikut menutup modal dan
  menghilangkan state panel (query, kategori, koleksi, halaman).
- Ukuran (keputusan saya): `maxWidth: 960`, `maxHeight: 85vh`, badan
  modal bisa scroll sendiri (grid panjang tidak mendorong dialog keluar
  layar). Alasan: 960 px memberi ±20 kolom thumbnail 44 px dengan ruang
  napas, masih muat di viewport 1280 (batas desktop yang berlaku).
- Animasi buka/tutup: `usePresence(open, 200)`, sama seperti SettingsModal.
- `IconifyPanel.jsx` sendiri **tidak** diubah strukturnya, kecuali dua
  hal di §6.3 dan §6.4. Root panel tetap `data-testid="ic-panel"` agar
  probe lama tetap menemukan panel; dialog membawa `data-testid="ic-modal"`
  baru untuk probe modal.

### 6.2 Pemindahan mount + wiring (VectorEditor ↔ Inspector)

- Hapus mount `{tool === 'iconify' && <IconifyPanel …/>}` dari
  `EditorRightInspector.jsx` beserta prop `onIconifyClose`,
  `onIconifyInsert`, `recentIcons` di inspector (tidak ada pemakai lain —
  verifikasi saat implementasi; bila ada, itu dead code dan dihapus
  mengikuti preseden T7).
- Mount baru di `VectorEditor.jsx`, di dekat portal import modal yang
  sudah ada: `<IconifyModal open={tool === 'iconify'}
  onInsert={onIconifyInsert} onClose={onIconifyClose} L={L}
  recentIcons={prefs?.recentIcons || []} />}` — **tanpa** bungkus
  kondisional `tool === 'iconify' && …` (koreksi hasil builder check Q5,
  keputusan saya): `usePresence(open, 200)` hanya bisa memainkan animasi
  keluar bila komponen tetap ter-mount sementara `open` berubah ke
  `false`, persis pola `SettingsModal`. Mount kondisional akan membuat
  `open` tidak pernah `false` dan animasi tutup mati.
- Tidak ada perubahan pada: `tool` / `setToolToggle` / `onIconifyClose` /
  `onIconifyInsert` / tombol floating bar `[data-tip="veIconify"]` /
  `aria-pressed`. **Tapi cara tutup "pindah tool / toggle tombol"
  TIDAK berlaku selama modal terbuka (hasil builder check Q2, dijawab
  dari kode — bukan tebakan):** overlay `.ov` menutupi floating bar
  sehingga tombol tak bisa diklik mouse, DAN handler keyboard global
  (`kbHandlersRef.current.kd` di `VectorEditor.jsx`) early-return bila
  `document.querySelector('.ov, [role="dialog"]')` ada — jadi shortcut
  tool seperti `V` (Select) juga mati selama dialog terbuka. Modal
  hanya bisa ditutup lewat X, Esc (handler Esc panel yang sudah ada),
  atau klik backdrop (G4). Begitu modal tertutup, `tool` sudah
  `'select'` (via `onIconifyClose`) dan semua shortcut kembali normal.
- Sisip tetap tidak menutup modal (G3): `onIconifyInsert` sudah tidak
  memanggil `setTool`, jadi tidak ada yang diubah di sini. Toast sukses
  dan `rememberRecentIcon` tetap jalan seperti sekarang.
- **Cascade sisipan (keputusan user 12:09 WIB, hasil builder check Q1):**
  sisipan pertama dari modal mendarat di tengah viewport seperti sekarang
  (frame 96 px); tiap sisipan berikutnya dari modal yang sama digeser
  **+24 px ke kanan-bawah per langkah** (langkah ke-1 = +24 px, ke-2 =
  +48 px, …) supaya ikon tidak menumpuk persis dan langsung bisa
  dipilih sesudah modal ditutup. Penghitung langkah adalah ref di
  `VectorEditor.jsx` yang bertambah tiap sisipan Iconify berhasil dan
  **di-reset ke 0 setiap modal ditutup**; sesudah 10 langkah (240 px)
  kembali ke tengah (wrap) supaya tidak hanyut keluar viewport
  (keputusan saya). Offset diterapkan pada `dx`/`dy` (koordinat dokumen)
  di `onIconifyInsert`, hanya untuk sisipan dari modal Iconify.

### 6.3 Filter kategori (satu-satunya penambahan logika)

- `iconifyClient.jsx` — `listCollections()`: teruskan `category:
  c?.category ?? null` pada objek koleksi yang dikembalikan. (Satu field
  tambahan; tidak mengubah bentuk lain.)
- `IconifyPanel.jsx`: state baru `selectedCategory` (`''` = semua
  kategori). Daftar kategori diturunkan dari `collections` (unik,
  terurut). Dropdown kategori (komponen `Select` yang sama dengan dropdown
  koleksi) diletakkan tepat di atas/di samping dropdown koleksi —
  keputusan saya: **sebaris dua kolom** (Kategori | Koleksi) supaya
  header modal ringkas; bila lebar tidak cukup, `Select` membungkus ke
  baris berikut (sudah flex-wrap di tempat lain).
  - Bila kategori dipilih: opsi dropdown koleksi hanya koleksi dalam
    kategori itu; bila koleksi yang sedang aktif tidak termasuk kategori
    itu, reset koleksi ke `''` (semua koleksi dalam kategori).
  - Mode telusur default tetap Material Symbols; bila kategori yang
    dipilih tidak memuat Material Symbols, telusur memakai koleksi
    pertama dalam kategori itu (keputusan saya — kalau tidak, grid
    telusur kosong padahal kategori punya koleksi).
  - Mode cari: `prefix=` mengikuti koleksi terpilih seperti sekarang;
    kategori tidak mengubah query cari (cari tetap lintas set, lalu
    hasil difilter ke koleksi dalam kategori bila kategori aktif —
    keputusan saya, supaya kategori tetap bermakna saat mencari).
    **Hitungan + "Muat lagi" saat kategori aktif (hasil builder check
    Q3, keputusan saya):** `ic-count` menampilkan jumlah hasil
    **sesudah** filter kategori (bukan total API); "Muat lagi" mengambil
    halaman API berikutnya sampai terkumpul 48 hasil terfilter atau API
    habis — supaya angka tidak berbohong dan tombol tidak tampak rusak
    pada halaman yang tipis.
- Label i18n baru di `appI18n.jsx` (ID + EN): `icCategory` ("Kategori" /
  "Category"), `icAllCategories` ("Semua kategori" / "All categories"),
  `icOtherCategory` ("Lainnya" / "Other" — hasil builder check Q6,
  keputusan saya: koleksi tanpa `category` masuk kelompok "Lainnya"
  supaya tidak hilang dari filter).
  Tidak ada label lain yang berubah.

### 6.4 Thumbnail lebih besar di modal (keputusan saya)

- `THUMB_PX` 28 → **40** (tombol 44 px). Alasan: alasan user pindah ke
  modal adalah "lebih mudah dipilih"; thumbnail 28 px di jendela 960 px
  terlihat renggang dan tetap sulit dibidik. Ini perubahan satu konstanta
  di `IconifyPanel.jsx`; jalur data URI dan probe thumb tidak berubah
  (probe mengukur `naturalWidth > 0`, bukan ukuran piksel).
- Grid tetap `flex-wrap` + "Muat lagi" (48 per halaman) seperti sekarang.

### 6.5 Yang diserahkan ke builder

- Urutan pasti dropdown (kategori di kiri, koleksi di kanan) dan teks
  placeholder bila kategori kosong — builder boleh mengikuti §6.3.
- Detail CSS kelas dialog (pakai `.hp` yang sudah ada; kelas baru hanya
  bila `.hp` tidak cukup — upayakan nol kelas baru, mengikuti kontrak
  lama panel "tidak ada aturan CSS baru" sebisa mungkin; bila perlu,
  maksimal 2 aturan dengan scope `[data-testid="ic-modal"]`).
- Penamaan file wrapper: `IconifyModal.jsx` (sudah ditetapkan di §6.1).

## 7. Verifikasi (rencana, bukan janji hasil)

- `npm test` penuh harus tetap hijau (termasuk tes baru: `category`
  diteruskan `listCollections`; filter kategori di panel — SSR seperti
  `iconify-panel.test.cjs` yang sudah ada).
- Probe baru/perbarui (browser asli, Chromium headless 1440×900):
  modal terbuka dari tombol floating bar (`ic-modal` visible, `ic-panel`
  di dalamnya); backdrop click menutup; X menutup; Esc menutup; klik
  ikon menyisip + modal **tetap terbuka** (keputusan user §1) + bisa
  sisip ikon kedua; **cascade: sisip 3 ikon berurutan → bbox bergeser
  +24 px / +48 px dari tengah (tidak identik), dan reset sesudah modal
  ditutup lalu dibuka lagi**; **tombol `V` (Select) saat modal terbuka
  TIDAK menutup modal / TIDAK mengganti tool** (bukti guard `.ov` §6.2);
  kategori memfilter dropdown koleksi dan grid telusur; cari dengan
  kategori aktif hanya menampilkan hasil dalam kategori itu dan
  `ic-count` = jumlah terfilter.
- Regresi: `probe-iconify.cjs` (52/52 — P6 lama "klik tool Select
  menutup panel" **dihapus** untuk mode modal karena tidak lagi mungkin,
  diganti skenario `V` di atas; perilaku sisip tidak berubah),
  `probe-iconify-thumb.cjs` (3/3 — thumbnail render di modal),
  `probe-iconify-offline.cjs` (14/14).
- Build `npm run build:web` exit 0; smoke dari hasil ekstrak ZIP
  (probe thumbnail melawan build hasil ekstrak).
- ZIP final baru (ZIP ThumbFix `b5d7c714…` tidak ditimpa).

## 8. Batasan jujur

- Hanya headless Chromium 1440×900 light; launch Windows + GPU asli
  belum terukur — perlu re-test user.
- Daftar kategori berasal dari data API apa adanya: koleksi tanpa
  `category` masuk kelompok "Lainnya" (keputusan saya) supaya tidak
  hilang dari filter; nama kategori tampil apa adanya dari API (bahasa
  Inggris).

## 9. Hasil builder check (2026-11-15 12:08 WIB)

Enam pertanyaan dari reviewer independen; empat diputuskan saya dan sudah
masuk ke doc di atas (Q3 §6.3 hitungan + "Muat lagi"; Q4 §6.1 guard
backdrop; Q5 §6.2 mount tanpa syarat; Q6 §6.3 label `icOtherCategory`).
Dua sudah dijawab user dan masuk ke doc:

- **Q1 — TERJAWAB user 12:09 WIB: cascade.** Sisipan pertama tetap di
  tengah, berikutnya digeser +24 px per langkah, reset tiap modal
  ditutup, wrap sesudah 10 langkah (§6.2).
- **Q2 — TERJAWAB user 12:10 WIB: tidak apa-apa floating bar tidak bisa
  diklik saat modal terbuka.** G4 dipersempit menjadi X / Esc / klik
  backdrop saja (§2, §6.2); jawaban ini cocok dengan bukti kode
  (handler keyboard global early-return bila `.ov`/`[role="dialog"]`
  ada), jadi tidak ada yang perlu dibangun untuk menembus overlay.
