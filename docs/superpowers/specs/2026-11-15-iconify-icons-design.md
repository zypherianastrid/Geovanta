# Design — Panel Ikon Iconify di Kanvas Geovanta

**Tanggal:** 2026-11-15
**Status:** **DISETUJUI user 2026-11-15 08:50 WIB** (pendekatan A
dipilih user 08:48 WIB); **jalur data hybrid DIPILIH user 08:53 WIB**
(CDN jsDelivr untuk data ikon, API publik hanya untuk cari +
daftar koleksi — tanpa limit yang terasa). Yang ditandai "keputusan
saya" masih boleh dikoreksi user sebelum plan dibuat.
**Lokasi:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md`
**Working copy:** `~/workspace/geovanta-round2/`
**Referensi:** https://iconify.design/docs/usage/ ,
https://iconify.design/docs/api/ , https://iconify.design/docs/icon-components/ ,
https://iconify.design/docs/api/queries.html ,
https://iconify.design/docs/api/search.html

## 1. Intent & why

User Geovanta ingin memakai ikon Iconify langsung di dalam editor,
tanpa membesarkan ukuran tools. Iconify menyediakan 300 ribu+ ikon
open source dari 200+ set lewat API publik yang memuat data ikon
on demand saat runtime, bukan dibundel — jadi alasan utamanya persis
cocok: bundle tetap ramping, user dapat seluruh katalog. Jalur data
yang dipilih user (2026-11-15 08:53 WIB): **hybrid tanpa-limit** —
data ikon diambil dari CDN jsDelivr (paket `@iconify-json`), API
publik hanya dipakai untuk pencarian lintas set + daftar koleksi,
sehingga pemakaian ikon sehari-hari tidak pernah menyentuh API.

Yang dibangun: panel "Icons" di editor. User mengetik kata kunci,
melihat grid ikon, klik satu ikon, ikon itu masuk ke kanvas sebagai
objek vektor Geovanta biasa (bisa dipindah, di-scale, diedit node-nya,
diwarnai ulang, diekspor) — seperti shape dari shape picker, bukan
gambar tempelan.

## 2. Goals

- G1 Cari ikon dari seluruh katalog Iconify lewat kata kunci, dengan
  filter koleksi (set) opsional.
- G2 Klik ikon → ikon tersisip di tengah viewport sebagai objek
  vektor, langsung terseleksi, siap dipindah/di-scale.
- G3 Ikon yang sudah tersisip adalah path Geovanta biasa: semua tool
  yang berlaku untuk path (node edit, Fill/Stroke, Boolean, ekspor
  SVG/PNG) berlaku juga untuknya, tanpa jalur khusus.
- G4 Dokumen yang berisi ikon tetap bisa dibuka dan diedit offline —
  sekali tersisip, ikon tidak lagi bergantung pada API.
- G5 Bundle tidak membengkak: tidak ada data ikon yang dibundel,
  tidak ada dependensi npm baru.
- G6 Saat offline, panel menjelaskan keadaannya dengan jujur
  ("Perlu internet…") dan aplikasi selebihnya tetap berfungsi penuh.

## 3. Non-goals (v1)

- N1 Mengganti ikon UI editor (48 path hardcoded di
  `constants/brandAndIcons.jsx`) dengan Iconify — pendekatan B,
  ditolak user saat memilih A.
- N2 Self-host Iconify API (server sendiri / Docker / NPM) —
  ditolak untuk v1; user memilih hybrid CDN (lihat §7 butir 0).
  Alamat host tetap konstanta tunggal, jadi pindah ke self-host
  kelak tinggal ganti alamat tanpa ubah kode lain.
- N3 Paket ikon offline / bundel subset ikon.
- N4 Editor ikon khusus (di luar tool path yang sudah ada).
- N5 Ikon animasi (mis. `line-md`): animasi tidak ikut; yang
  tersisip adalah frame statisnya.
- N6 Mengunggah set ikon kustom user.

## 4. Anti-goals (yang membuat fitur ini gagal walau teknisnya jalan)

- A1 Startup / kanvas nge-block menunggu API. Pencarian harus
  debounce + batalkan request basi; tidak ada fetch yang menahan
  render.
- A2 Dokumen rusak / objek hantu bila API gagal. Insert gagal =
  toast + tidak ada objek yang dibuat.
- A3 Ikon tersisip tapi tidak bisa diwarnai ulang / diedit seperti
  shape lain (itu akan terasa seperti stiker, bukan vektor).
- A4 Panel menampilkan ikon yang tidak bisa disisipkan (semua yang
  tampil harus bisa masuk kanvas).
- A5 Klaim "offline" yang menyesatkan: yang offline adalah dokumen
  + aplikasinya; browsing ikon jelas butuh internet.

## 5. Constraints (temuan riset — sudah diverifikasi)

- C1 **Kanvas = CanvasKit, bukan DOM.** Komponen web
  `<iconify-icon>` me-render di Shadow DOM dan tidak bisa menjadi
  objek kanvas. Jadi jalurnya wajib: fetch data ikon → konversi ke
  path Geovanta → objek dokumen. (Dok. Iconify sendiri mengakui
  komponennya "unusable for offline applications" dan butuh akses
  API.)
- C2 **Parser SVG sudah ada dan cocok.** `VE.parseSVG` di
  `src/engine/svgDocumentParser.jsx` mengembalikan
  `{viewBox, objects, styles, unsupported, ...}` dan sudah menangani
  `currentColor` (→ warna warisan atau fallback `#18181b`),
  `stroke`, `stroke-width`, `fill-rule`. Ikon fill-based (Material,
  MDI) maupun stroke-based (Tabler) sama-sama terkonversi.
  **Catatan dari builder check 2026-11-15:** cakupan parser untuk
  elemen primitif (`circle`, `rect`, `ellipse`, `polygon`,
  `polyline`) BELUM terverifikasi — grep hanya menemukan handler
  untuk kontainer (`g`/`use`/`svg`/`a`/clipPath) + gradien. Spike 1
  (§8) wajib menguji ikon multi-elemen; bila ada yang gugur, plan
  menambah task perluasan parser atau filter path-only. Ada pola
  terbukti di `VectorEditor.jsx:2344`: bangun string SVG dari path
  + paint → `VE.parseSVG` → objek; dan `importFiles` (sekitar
  `:2960`) memasukkan hasil parse ke dokumen.
- C3 **API publik terverifikasi hidup dari VM ini** (curl 2026-11-15):
  - `GET https://api.iconify.design/search?query=home&limit=5` →
    `{icons: ["material-symbols:home", "mdi:home", ...], total,
    limit, start, collections: {...}}`.
  - `GET https://api.iconify.design/mdi/home.svg?color=%230d99ff` →
    SVG bersih, satu `<path>`, `viewBox="0 0 24 24"`.
  - `GET https://api.iconify.design/mdi.json?icons=home,account` →
    `{prefix, icons: {home: {body: "<path .../>"}, ...}, width: 24,
    height: 24}`.
  - **CDN jsDelivr terverifikasi hidup dari VM ini** (curl
    2026-11-15): `https://data.jsdelivr.com/v1/packages/npm/@iconify-json/mdi@1.2.3?structure=flat`
    mencantumkan `icons.json` (3.096.165 byte), `info.json`,
    `metadata.json`; `GET
    https://cdn.jsdelivr.net/npm/@iconify-json/mdi@1.2.3/icons.json`
    → HTTP 200, 3.096.165 byte. Satu `icons.json` berisi SELURUH
    set (nama → `body` + `width`/`height` set), jadi setelah satu
    set dimuat, semua ikonnya tersedia lokal tanpa request lagi.
    Pola ini juga yang dipakai tooling Iconify sendiri (ADR-005:
    file JSON mentah "bypasses API rate limits").
- C4 **API publik gratis tapi berlimit fair-use; jalur data v1
  adalah hybrid tanpa-limit (DIPILIH user 2026-11-15 08:53 WIB).**
  Tidak ada angka rate limit yang dipublikasikan (penelusuran
  2026-11-15: "No published rate limit"), dan pemakaian normal
  satu user praktis tidak akan menyentuhnya. Meski begitu, v1
  memindahkan ~semua trafik data ikon ke CDN jsDelivr (lihat C3):
  API publik hanya dipakai untuk pencarian lintas set +
  daftar koleksi (1 request kecil per kueri). Dok. API meminta
  pertimbangan mendukung proyek bila memakai API publik.
- C5 **Offline-first adalah identitas Geovanta** (README v1.1
  mengoreksi "100% offline" → "offline-first": startup offline,
  font dokumen dimuat online saat dipakai). Preseden yang sama
  berlaku di sini: Google Fonts diunduh online saat dipilih lalu
  disematkan sebagai aset (`src/renderer/googleFonts.jsx`). Untuk
  ikon, penyematannya lebih sederhana: ikon yang tersisip sudah
  berupa path di model dokumen, jadi dokumen utuh offline tanpa
  AssetManager.
- C6 **Tidak ada deteksi online di codebase** (`navigator.onLine`
  tidak dipakai di `src/`). Status online harus diputuskan dari
  probe API (request ringan bertimeout), bukan dari
  `navigator.onLine` saja (tidak andal di Tauri/desktop).
- C7 **CORS:** endpoint API mengembalikan SVG/JSON untuk dipakai
  lintas origin (komponen Iconify memang bekerja dari browser).
  Bila satu endpoint ternyata menolak CORS di runtime Tauri,
  fallback-nya adalah endpoint `.svg` sebagai `<img>` untuk
  thumbnail (tetap tampil) + `.json` via fetch untuk insert —
  keduanya sudah dipakai komponen resmi, jadi risikonya rendah.
  (Pelajaran dari Google Fonts: verifikasi CORS harus lewat
  browser asli, bukan curl — curl tidak kena CORS.)
- C8 **Lisensi:** semua set di API publik open source (MIT /
  Apache-2.0 / CC BY 4.0 / CC BY-SA 4.0, dst., per koleksi dari
  respons `/search` dan `/collections`). Atribusi ditampilkan di
  panel; metadata sumber disimpan di objek (lihat §7 butir 7).

## 6. Approaches

### A. Panel ikon di kanvas — DIPILIH user

Panel cari + grid + klik sisip sebagai objek vektor (lihat §7).
Trade-off: butuh panel baru, klien API baru, dan penanganan
fill-vs-stroke — tapi ini satu-satunya pendekatan yang memberi user
ikon yang bisa dipakai di kanvas.

### B. Ikon UI editor saja — DITOLAK

Ganti 48 ikon UI hardcoded dengan Iconify. Lebih kecil, tapi user
tidak mendapat apa pun di kanvas, dan UI menjadi tidak tampil saat
offline. Berlawanan dengan yang diminta user.

### C. Keduanya — DITOLAK untuk v1

A + B sekaligus. Paling lengkap, tapi menggabungkan biaya A dengan
kerugian B (UI bergantung online). Bisa dipertimbangkan terpisah
bila suatu hari UI memang butuh ikon di luar 48 yang ada.

### Sub-pendekatan yang dipertimbangkan (di dalam A)

- **A0 Jalur data hybrid (DIPILIH user 2026-11-15 08:53 WIB).**
  Data ikon dari CDN jsDelivr: `GET
  https://cdn.jsdelivr.net/npm/@iconify-json/{prefix}/icons.json`
  (tanpa pin versi; CDN me-resolve latest; respons di-cache
  browser) — dimuat malas per set, sekali saja per set per sesi.
  API publik (`api.iconify.design`) hanya untuk `/search`,
  `/collections`, dan probe `/version`. Dengan ini tidak ada limit
  yang terasa: thumbnail + sisipan tidak pernah menyentuh API.
  Alamat kedua host adalah konstanta tunggal (mudah dialihkan ke
  self-host kelak).
- **A1 Endpoint `.svg` API untuk insert (DIGANTI oleh A0).**
  Awalnya dipilih karena satu request mengembalikan SVG siap parse;
  diganti karena setiap sisipan/thumbnail adalah satu request API
  (di sinilah limit bisa terasa), sementara `icons.json` memberi
  seluruh set sekaligus. Jalur baru: ambil `body` dari set JSON
  yang sudah dimuat → rakit string SVG `<svg viewBox="0 0
  {width} {height}">{body}</svg>` → `VE.parseSVG`.
- **A2 Thumbnail grid via `<img src="…/*.svg">` API (DIGANTI oleh
  A0).** Awalnya paling sederhana; diganti karena 48 thumbnail =
  48 request API per halaman hasil. Jalur baru: thumbnail dirender
  dari data set yang sudah dimuat (inline SVG / data URI dari
  `body`), nol request tambahan.
- **A3 Tanpa dependensi npm (dipilih).** `fetch` + `DOMParser` +
  `parseSVG` sudah ada di codebase; `@iconify/react` /
  web component tidak dibutuhkan karena objeknya bukan DOM.
  Alternatif pasang paket Iconify: menambah bobot tanpa manfaat
  untuk jalur ini — ditolak.

## 7. Desain (bagian yang diputuskan)

Butir bertanda **[keputusan saya]** adalah proposal saya — user
boleh koreksi sebelum plan dibuat. Butir bertanda **[fakta]**
berasal dari riset di §5.

0. **[dipilih user] Jalur data hybrid tanpa-limit.** Dua host,
   keduanya konstanta tunggal:
   - Cari + daftar koleksi + probe status → API publik
     `api.iconify.design` (`/search`, `/collections`, `/version`).
   - Data ikon (thumbnail + sisipan) → CDN jsDelivr:
     `GET https://cdn.jsdelivr.net/npm/@iconify-json/{prefix}/icons.json`
     (tanpa pin versi; CDN me-resolve latest). Satu file berisi
     seluruh set; dimuat malas saat set itu pertama dibuka/dicari,
     sekali saja per set per sesi, lalu di-cache browser (HTTP
     cache) + Map memori. Setelah dimuat, thumbnail dan sisipan
     dari set itu nol request. Bila satu set belum dimuat dan user
     mengklik ikonnya (mis. dari "Terakhir dipakai" saat online):
     muat `icons.json` set itu dulu, lalu sisipkan.
1. **[keputusan saya] Masuk lewat tool baru di floating bar.**
   Entri baru di `VE_TOOLS` (`src/constants/editorToolsAndShapes.jsx`,
   keluarga `VE_DRAW_TOOLS`/grup yang sama), ikonnya dari set
   `ICONS` yang ada (tanpa ikon baru yang dibundel). Klik tool →
   panel Icons terbuka di samping kanvas, mengikuti pola panel/
   popover yang sudah ada (`FloatPopover`, `SelectDropdown`).
2. **[keputusan saya] Isi panel:** kolom cari (debounce ~300 ms),
   dropdown filter koleksi (diisi dari `GET /collections`, diambil
   sekali per sesi; default "Semua koleksi"), grid thumbnail
   (24–32 px per ikon, dirender dari data set yang sudah dimuat —
   inline SVG, bukan `<img>` API; paginasi/``load more`` dari
   `limit`+`start` respons search), baris "Terakhir dipakai", dan
   catatan lisensi koleksi yang sedang tampil.
   **[keputusan saya] State awal panel:** mode telusur koleksi
   default (**Material Symbols**) — grid langsung menampilkan
   ikon-ikon koleksi itu, kolom cari di atas; begitu user mengetik,
   panel beralih ke mode cari lintas set via API. Alasannya: panel
   langsung berguna tanpa mengetik, dan mode telusur adalah cara
   kerja alami jalur CDN (satu set dimuat utuh).
3. **[keputusan saya] Cari = `GET /search?query={q}&limit=48`
   (+ `&prefix=` bila filter koleksi aktif — terverifikasi live
   2026-11-15: `prefix=mdi` mengembalikan hanya ikon `mdi:*`,
   `prefix=tabler` hanya `tabler:*`).** Hasil kosong →
   state kosong yang menjelaskan, bukan grid kosong diam-diam.
   Request basi dibatalkan (AbortController).
   **[keputusan saya] Bahasa pencarian:** kata kunci Iconify
   berbahasa Inggris; panel menampilkan petunjuk "Cari dalam
   bahasa Inggris" + placeholder contoh berbahasa Inggris. Tidak
   ada kamus ID→EN di v1.
4. **[keputusan saya] Sisip = klik thumbnail → ambil `body` ikon
   dari set JSON yang sudah dimuat (bila set belum dimuat, muat
   `icons.json`-nya dulu) → rakit `<svg viewBox="0 0 {width}
   {height}">{body}</svg>` → `VE.parseSVG` → objek ditempatkan di
   tengah viewport, ukuran default 96×96 px, langsung terseleksi.**
   Satu Undo (Ctrl+Z) membatalkan satu sisipan. Ikon multi-path
   masuk sebagai satu grup.
5. **[fakta + keputusan saya] Warna saat sisip — DIPILIH user
   2026-11-15 08:54 WIB: pertahankan warna asli ikon multi-warna.**
   Ikon monokrom memakai warna Fill aktif (fill-based) atau warna
   + ketebalan Stroke aktif (stroke-based). Ikon multi-warna
   (logo, emoji, bendera) disisipkan dengan warna aslinya, tidak
   diwarnai ulang. Deteksi: flag `palette` per koleksi dari respons
   `/search` / `/collections` (`palette: true` → multi-warna);
   bila flag tidak ada, ikon dianggap multi-warna bila `body`-nya
   mengandung fill eksplisit selain `currentColor`. Setelah
   tersisip, ikon adalah grup path biasa — panel Fill/Stroke
   berlaku seperti pada shape lain (tindakan eksplisit user).
   **[Perlu dibuktikan di plan/spike:]** apakah panel Fill/Stroke
   berlaku ke grup hasil sisipan; bila tidak, insert harus memecah
   grup atau mengeset fill per sub-path sebelum commit.
6. **[keputusan saya] Metadata:** tiap grup hasil sisipan menyimpan
   `icon: {name: "mdi:home", license: "Apache-2.0"}` (pola yang
   sama dengan metadata `gen` pada Blob/Weave — menempel di objek,
   ikut save/load). Dipakai untuk atribusi dan untuk
   "sisip ulang / ganti ikon" di masa depan (di luar v1).
   **[keputusan saya] Atribusi lisensi v1 cukup di panel +
   metadata objek;** tidak ada teks lisensi yang disisipkan ke
   file hasil ekspor (SVG/PNG). Dipertimbangkan lagi di v1.1 bila
   diperlukan.
7. **[keputusan saya] Offline:** saat panel dibuka, status
   diputuskan dari probe ringan `GET /version` bertimeout singkat
   (mis. 3 detik) + event `online`/`offline`. Bila offline: panel
   menampilkan state "Perlu internet untuk mencari ikon" +
   baris "Terakhir dipakai" tetap bisa dipakai ulang HANYA bila
   set JSON-nya masih di cache sesi (bila tidak, baris itu
   menampilkan nama saja tanpa thumbnail). Tombol tool tetap ada;
   tidak ada error yang melempar ke kanvas. Kegagalan memuat
   `icons.json` satu set (CDN tidak terjangkau) menampilkan pesan
   per set, bukan mematikan panel.
8. **[keputusan saya] Cache:** Map di memori per sesi untuk set
   JSON yang sudah dimuat (prefix → parsed `icons.json`) + string
   SVG per ikon yang sudah dirakit; daftar "Terakhir dipakai"
   (maks. 12 nama ikon) disimpan di prefs — hanya nama, bukan data
   SVG, supaya prefs tidak membengkak; thumbnail-nya dirender
   ulang dari set JSON saat online. Unduhan `icons.json` pertama
   kali membuka satu set berukuran 0,5–3 MB (tergantung set) —
   sekali saja, lalu cache browser + memori.
9. **[keputusan saya] i18n:** label panel ID/EN mengikuti pola
   `appI18n` yang sudah ada; nama ikon dan nama koleksi tetap
   bahasa aslinya (tidak diterjemahkan).
10. **[keputusan saya] Keamanan/robustness:** fetch hanya ke dua
    host: `api.iconify.design` (cari/koleksi/probe) dan
    `cdn.jsdelivr.net` (data ikon) — keduanya konstanta tunggal,
    mudah dialihkan (mis. ke self-host kelak); respons SVG di-parse
    sebagai data (tidak pernah disuntik sebagai HTML); ukuran
    dibatasi (tolak SVG ikon bila > 256 KB, tolak `icons.json` bila
    > 10 MB); timeout per request (mis. 10 detik untuk search dan
    insert, 30 detik untuk `icons.json` karena ukurannya MB-an).

## 8. Yang diserahkan ke builder (plan)

- Pin lokasi host panel yang tepat (komponen mana me-render panel,
  state tool aktif, konflik dengan tool/panel yang sedang terbuka).
- Spike 1 (sebelum implementasi penuh): buktikan di browser asli
  bahwa satu ikon fill-based (`mdi:home`) dan satu stroke-based
  (`tabler:home`) masuk lewat jalur CDN (`icons.json` → rakit SVG
  → `parseSVG`), tampil benar di kanvas, dan bisa diwarnai ulang
  lewat panel Fill/Stroke. Sertakan satu ikon multi-elemen
  (`circle`/`rect`/`g`/`transform`, bukan path-only) untuk
  membuktikan cakupan parser (lihat catatan C2) — bila ada yang
  gugur, plan menambah task perluasan parser atau filter path-only.
- Spike 2: buktikan CORS + perilaku offline di runtime Tauri/web
  yang sebenarnya (bukan curl): search gagal dengan pesan yang
  benar, insert gagal tanpa objek hantu, dan `icons.json` dari
  jsDelivr bisa dimuat dari browser (CORS CDN).
- Pecah implementasi menjadi task-testable: klien API (+tes unit
  mock fetch), panel UI (+tes komponen), alur sisip (+probe
  Playwright: cari → sisip → seleksi → Undo), state offline
  (+probe: API dimatikan → panel menjelaskan), regresi suite.
- Ukuran kerja (perkiraan kasar, plan yang memastikan): **proyek
  menengah — sekitar 9–11 task** (klien hybrid CDN+API, panel,
  tool wiring, insert + metadata, offline state, i18n, tes, probe,
  ZIP). Bukan perubahan kecil satu file, bukan pula arsitektur
  ulang.

## 9. Verifikasi yang diharapkan (untuk plan)

- `npm test` tetap hijau penuh; tes unit baru untuk klien API
  (dengan fetch di-mock) dan konversi SVG→objek.
- Probe Playwright di browser asli: cari "home" → hasil muncul →
  klik `mdi:home` → objek ada di tengah kanvas, terseleksi, 96 px
  → Ctrl+Z menghilangkan → 0 pageerror.
- Probe offline: API tidak terjangkau → panel menampilkan state
  offline, aplikasi tetap jalan, 0 pageerror.
- `npm run build:web` exit 0; ukuran bundle `web/` tidak naik
  signifikan (target: < 50 KB dari kode baru; 0 byte data ikon).
- ZIP final seperti biasa (working copy `geovanta-round2`).
