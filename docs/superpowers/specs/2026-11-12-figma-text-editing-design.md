# Design: Edit Teks Geovanta Persis Figma di Kanvas (Pendekatan A)

Tanggal: 2026-11-12
Status: menunggu persetujuan user (jawaban Q1–Q3, Q5 sudah masuk: ikuti Figma)
Pendekatan yang dipilih user: **A — pertahankan textarea overlay, buat perilakunya Figma-like**

## Intent dan alasan

User mengirim video Figma yang menunjukkan alur edit teks di kanvas: klik tool
Teks, ketik (kotak tumbuh melebar otomatis, nama layer ikut isi, garis bawah
merah spellcheck), Escape/klik di luar → objek terpilih, double-click → mode
edit dengan drag-select, drag handle tepi → kotak jadi lebar-tetap dan teks
reflow/wrap langsung. Minta Geovanta berperilaku **persis sama 100%** di
kanvas, mulai dari kontrol sampai semua perilaku edit teks.

Alasan pendekatan A: 6 dari 10 perilaku di video sudah ADA atau SEBAGIAN di
Geovanta. Semua gap yang tersisa adalah perubahan lokal di 3–4 titik sentuh.
Pendekatan B (editor native-kanvas seperti Figma sungguhan) justru akan
menghilangkan spellcheck native dan IME — dua hal yang terlihat di video —
dengan biaya berminggu-minggu.

## Goals

- **G1 — Ketik langsung, kotak tumbuh auto-width.** Sudah ada; pertahankan.
  Overlay mengukur lebar dari isi yang diketik via layout CanvasKit asli
  (`TextEditOverlay.jsx:45-46`, `:75`, `:196`). Tidak ada perubahan.
- **G2 — Nama layer mengikuti isi teks, live.** Nama layer diperbarui
  **saat mengetik** (live, seperti di video detik 2.01) dan setiap kali isi
  berubah (commit), **selama user belum me-rename manual**. Begitu user
  me-rename layer secara manual, nama tidak lagi mengikuti isi. Butuh
  penanda nama-otomatis vs nama-manual pada objek (bukan sekadar cek pola
  `Text*`).
- **G3 — Escape = commit, tanpa jalur batal.** Escape di overlay memanggil
  `finish()` (commit), bukan `cancel()` (buang ketikan). Teks baru yang
  kosong tetap dihapus dari dokumen (perilaku `finishTextEdit` yang sudah
  ada). Tidak ada jalur batal untuk edit teks — batal dilakukan dengan
  Ctrl+Z sesudah commit, seperti Figma. `cancelTextEdit` dihapus bila
  tidak ada pemanggil lain.
- **G4 — Klik tool Teks pada teks yang sudah ada → masuk edit teks itu,
  caret di posisi karakter yang diklik.** Hit-test sebelum mulai drag buat
  teks baru; bila kena objek teks, `setEditingText` untuk objek itu dan
  caret diletakkan di karakter yang diklik (bukan select-all). Disambiguasi
  klik vs drag: klik tanpa gerak = edit; drag = kotak teks baru (perilaku
  Figma).
- **G5 — Drag handle tepi pada teks autoWidth → lebar-tetap + reflow akurat.**
  Lebar awal kotak hasil seret harus lebar terukur (CanvasKit /
  `dg.bx.rect` yang sudah terukur), bukan heuristik `panjang × fontSize ×
  0,65` yang sekarang membuat kotak meleset dari posisi handle.
- **G6 — Spellcheck eksplisit.** Textarea overlay diberi `spellCheck` dan
  `lang` mengikuti bahasa dokumen/pengaturan (default `id`), supaya kamus
  yang dipakai tidak ikut bahasa browser user.
- **G7 — Kursor I-beam saat tool Teks aktif.** Verifikasi visual dulu; tambah
  `cursor: text` bila belum ada.
- **G8 — Perilaku yang sudah ada dipertahankan:** double-click masuk edit +
  select all, drag memilih rentang teks (highlight biru, tidak membalik
  warna), Enter pada teks terseleksi masuk edit, klik di luar overlay =
  commit, objek tetap terseleksi sesudah commit.

## Non-goals

- Tidak mengganti textarea dengan editor native-kanvas (pendekatan B).
- Tidak mengubah mesin render teks (`canvasKitScene.jsx`, `textLayout.jsx`)
  atau model data teks — kecuali penanda nama-otomatis (G2) dan lebar awal
  handle (G5).
- Tidak mengubah panel TextInspector / Mode Kotak Teks. Mengubah "Isi Teks"
  dari panel kanan **tidak** me-rename layer (di luar scope "fokus di
  canvasnya").
- Tidak menambah kamus spellcheck sendiri (tetap kamus browser).
- Drag sudut pada teks non-autoWidth tetap mengubah fontSize (perilaku lama
  dipertahankan — lihat D1).

## Anti-goals

- Gagal bila: Escape tetap membuang ketikan; klik tool Teks pada teks lama
  tetap membuat teks kosong baru menumpuk; drag handle kanan menghasilkan
  kotak yang lebarnya meleset dari posisi handle; nama layer manual user
  tertimpa oleh rename otomatis; rename live tidak terjadi saat mengetik.

## Constraints

- Kontrak programmer profesional (`AGENTS.md`): backup `.bak` sebelum edit
  destruktif, diff minimal, verifikasi nyata dengan perintah + Playwright
  terhadap file asli user, jujur soal yang belum terverifikasi.
- Working copy bukan repo git — konvensi backup `.bak` + ZIP seperti
  ronde-ronde sebelumnya.
- Setiap perubahan src wajib `npm run build:web` sebelum probe browser.
- Jangan ubah perilaku Escape di luar overlay teks.
- Rename otomatis tidak pernah menimpa nama yang user ubah manual.

## Approaches

### A. Pertahankan textarea, buat Figma-like — DIPILIH user

Perbaiki 5 gap (G2–G6) + verifikasi kursor (G7). Semua perubahan lokal di
3–4 titik sentuh yang sudah dipetakan. Spellcheck, IME, copy-paste,
aksesibilitas tetap gratis dari browser. Risiko kecil.

### B. Editor native-kanvas (caret + seleksi digambar sendiri) — DITOLAK

Satu-satunya jalan ke "100%" di level mesin. Tapi: berminggu-minggu, harus
menulis ulang IME/composition, copy-paste, undo per ketikan, aksesibilitas,
teks bidi/emoji; spellcheck garis-merah **tidak bisa** didapat dari browser
lagi (tidak ada API untuk membaca rentang salah eja) — butuh kamus sendiri
(mis. Hunspell WASM). Yang terlihat di video semuanya sudah bisa dicapai A.

### C. Hibrida (textarea transparan + caret digambar di kanvas) — DITOLAK

Mendapat kerumitan B tanpa menyelesaikan spellcheck, dan posisi caret gambar
vs caret asli rawan meleset (popup IME muncul di tempat salah; lebih parah
di mobile).

## Bagian yang diputuskan (cara membangun, pendekatan A)

Urutan pengerjaan yang disarankan: G3 → G2 → G4 → G5 → G6 → G7.

1. **G3 Escape → commit** — `src/components/editor/TextEditOverlay.jsx:166-169`:
   panggil `finish()` bukan `cancel()`. `VectorEditor.jsx:971-976`
   (`cancelTextEdit`) dihapus bila tidak ada pemanggil lain sesudah perubahan
   ini; bila masih ada pemanggil, biarkan dan catat.
2. **G2 Nama layer dari isi, live** — `VectorEditor.jsx:965-970`
   (`finishTextEdit`) + hook live baru:
   - Objek teks membawa penanda nama-otomatis (mis. flag pada objek; nama
     awal `'Text'` dst. terhitung otomatis). Rename manual (via panel
     Layers) membersihkan penanda itu.
   - Overlay mengoper `onLiveChange` (saat ini tidak pernah dioper,
     `VectorEditor.jsx:7078`): tiap perubahan isi saat mengetik, bila objek
     masih bertanda otomatis, `name` diperbarui live (baris pertama, potong
     ~30 karakter).
   - Saat commit (`finishTextEdit`), rename yang sama diterapkan final.
   - Rename tergabung dalam **satu langkah undo** dengan commit isi teks.
3. **G4 Klik-T pada teks lama → edit, caret di posisi klik** —
   `VectorEditor.jsx:3990-4000` (pointerdown tool `text`): hit-test
   `hitObj(pt)` sebelum mulai drag buat teks baru; bila kena objek
   `type === 'text'`, `setEditingText` untuk objek itu dan jangan mulai
   drag buat baru. Klik (tanpa gerak) = edit; drag = kotak baru.
   Overlay menerima offset caret awal: titik klik dipetakan ke offset
   karakter via pengukuran teks CanvasKit, lalu `selectionStart =
   selectionEnd = offset` (bukan `select()`).
4. **G5 Lebar handle terukur** — `src/engine/affineAndOrientedBox.jsx:152,156`
   (`transformObject`): ganti `baseW` heuristik untuk teks autoWidth
   (`spec.width` null) dengan lebar terukur (oper `measuredTextBounds` ke
   `transformObject`, atau pakai lebar bbox `dg.bx.rect` yang sudah terukur).
   Perlu tes regresi scale teks (cabang lain ikut mengubah fontSize).
5. **G6 Spellcheck eksplisit** — `TextEditOverlay.jsx`: tambah `spellCheck`
   dan `lang` (ikut `prefs.lang`, default `"id"`).
6. **G7 Kursor I-beam** — verifikasi visual dulu apakah sudah ada; bila belum,
   tambah `cursor: text` saat tool Teks aktif.

## Keputusan yang sudah ditetapkan

- **User (jawaban "Ikuti Figma untuk semuanya"):**
  - **Q1 — G4:** caret di posisi karakter yang diklik (bukan select-all).
  - **Q2 — G2:** rename setiap kali isi berubah selama user belum rename
    manual (penanda nama-otomatis, bukan cek pola `Text*`).
  - **Q3 — G2:** rename live saat mengetik (bukan hanya saat commit).
  - **Q5 — G3:** tidak ada jalur batal; batal = Ctrl+Z sesudah commit.
- **My call (ditulis di doc agar bisa dikoreksi):**
  - Rename tergabung dalam **satu langkah undo** dengan commit isi.
  - Rename hanya jalur kanvas; edit "Isi Teks" dari panel TextInspector
    tidak me-rename layer (sesuai "fokus di canvasnya").
  - **D1 — Drag sudut pada teks non-autoWidth:** pertahankan perilaku lama
    (ikut mengubah fontSize). User tidak memutuskan lain saat memilih
    "Ikuti Figma untuk semuanya (Q1–Q3, Q5)" — D1 tidak termasuk dalam
    pilihan itu.

## Yang diserahkan ke builder

- Bentuk penanda nama-otomatis (flag pada objek vs turunan dari riwayat
  nama) dan tempat rename manual membersihkannya (panel Layers).
- Cara memetakan titik klik ke offset karakter (pengukuran CanvasKit yang
  sudah ada vs API browser) dan perilaku bila klik di luar teks (ujung
  terdekat).
- Ambang potong nama layer (~30 karakter) dan cara memotong (per kata atau
  keras) — usulan: potong keras di 30 karakter, buang newline.
- Detail implementasi hit-test klik-vs-drag di G4 (ambang gerak yang dipakai
  handler drag yang sudah ada).
- Skenario probe Playwright per goal (pola ronde-ronde sebelumnya:
  `probes/probe-figma-text.cjs`), urutan eksekusi, dan isi laporan akhir.
- Nilai `lang` bila `prefs.lang` tidak tersedia — default `"id"`.
