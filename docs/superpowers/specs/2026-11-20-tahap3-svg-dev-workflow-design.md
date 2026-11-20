# Spec Desain: Tahap 3 — SVG Dev Workflow & Code Editor (Optimizer, Presets, & Live Two-Way XML Inspector)

Tanggal: 2026-11-20  
Status: Draft -> Ready for Implementation  
Penulis: Antigravity Assistant & Superpowers SDD Team  

---

## 1. Ringkasan Eksekutif & Ruang Lingkup

Tahap 3 melengkapi Geovanta Vector Studio dengan alur kerja pengembang web (developer workflow) modern dan inspeksi kode SVG tingkat lanjut:

1. **Fitur 7: Built-in SVG Optimizer / Minifier (gaya SVGO) & Export Code Presets**
   - **Built-in SVG Optimizer & Minifier:** Mesin optimasi ukuran berkas SVG berbasis pure JS/TS tanpa dependensi eksternal. Mampu merampingkan presisi desimal koordinat, membersihkan metadata editor (`<metadata>`, atribut `data-*`), menghapus elemen `<defs>` yang tidak terpakai (`linearGradient`, `radialGradient`, `clipPath`, `mask`, `filter`), menghapus komentar, memperpendek kode warna (`#ffffff` $\to$ `#fff`), dan memadatkan spasi putih (whitespace collapse).
   - **Preset Ekspor Kode Modern:**
     - **Web Minified SVG:** Kode SVG murni terkompresi untuk produksi web.
     - **React / JSX Component:** Komponen fungsional React dengan konversi atribut kebab-case ke camelCase (`fill-rule` $\to$ `fillRule`, `stroke-width` $\to$ `strokeWidth`, `clip-path` $\to$ `clipPath`, dll.), `class` $\to$ `className`, serta dukungan penyebaran props (`{...props}`).
     - **Vue 3 SFC:** Single File Component Vue 3 berformat `<template><svg ...>...</svg></template>` dengan `<script setup>`.
     - **CSS Data URI:** Kode URL-encoded siap pakai untuk properti CSS `background-image` atau `mask-image` (`url('data:image/svg+xml,...')`).

2. **Fitur 8: Live SVG XML Code Inspector & Two-Way Editor**
   - **Panel/Modal Editor Kode Interaktif (`SvgCodeInspectorModal`):** Menampilkan kode SVG XML dokumen saat ini dalam editor teks monospace yang dilengkapi format/prettify indentasi, nomor baris, tombol copy, dan validasi sintaks XML real-time.
   - **Sinkronisasi Dua Arah (Two-Way Live Sync):**
     - *Kanvas $\to$ Kode:* Saat objek digambar, dipindah, atau diubah warnanya di kanvas, tampilan kode XML otomatis diperbarui secara instan.
     - *Kode $\to$ Kanvas:* Saat pengguna mengetik atau menempel kode SVG di editor kode, perubahan diparse secara debounced (300ms) via `parseSVG` dan diterapkan langsung ke dokumen kanvas.
     - *Penanganan Kesalahan Non-Destruktif:* Jika kode XML tidak valid, ditampilkan lencana peringatan ("XML Error") tanpa mematahkan kanvas atau menghilangkan status pengguna.
   - **Akses Cepat & Pintasan:** Tombol di floating toolbar (`ICONS.code`), tombol di panel Inspector "Export & Impor", serta pintasan keyboard `Ctrl+Alt+C`.

---

## 2. Arsitektur Engine: SVG Optimizer & Code Presets (`svgOptimizer.tsx`)

### 2.1 Algoritma Optimasi SVG (`optimizeSvg`)
Fungsi pure JS/TS:
```typescript
export interface SvgOptimizerOptions {
  precision?: number;              // default: 2 (desimal koordinat dan angka)
  removeEditorData?: boolean;      // default: true (hapus <metadata>, data-*)
  removeUnusedDefs?: boolean;      // default: true (hapus gradien/filter tak terpakai)
  collapseWhitespace?: boolean;    // default: true (padatkan spasi & newline)
  removeComments?: boolean;        // default: true (hapus <!-- ... -->)
  shortenColors?: boolean;         // default: true (#ffffff -> #fff, dll.)
}

export interface SvgOptimizationResult {
  svg: string;
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercent: number;
}
```

#### Langkah Pemrosesan:
1. **Pembersihan Komentar & Metadata:**
   - Hapus seluruh blok komentar `<!--[\s\S]*?-->`.
   - Hapus tag `<metadata[\s\S]*?</metadata>`.
   - Hapus atribut editor `data-geovanta-[a-z-]+="[^"]*"` dan `data-[a-z-]+="[^"]*"` pada elemen path dan grup.
2. **Pruning `<defs>` Tak Terpakai:**
   - Ekstrak seluruh definisi ber-ID di dalam `<defs>`: `<(linearGradient|radialGradient|clipPath|mask|filter)[^>]*id="([^"]+)"`.
   - Pindai kemunculan referensi `url(#ID)` di seluruh isi dokumen luar `<defs>`.
   - Elemen definisi yang ID-nya tidak dirujuk oleh atribut `fill`, `stroke`, `clip-path`, `mask`, atau `filter` mana pun dihapus dari `<defs>`. Jika `<defs>` menjadi kosong, tag `<defs></defs>` dihapus seluruhnya.
3. **Pembulatan Presisi Desimal:**
   - Pindai angka floating point di dalam atribut `d="..."`, `transform="..."`, `viewBox`, `x`, `y`, `width`, `height`, `stroke-width`.
   - Bulatkan angka ke presisi $N$ desimal (default 2 desimal, e.g. `123.4567` $\to$ `123.46`, `45.00` $\to$ `45`).
4. **Penyederhanaan Warna:**
   - Konversi hex 6 digit berulang menjadi 3 digit (mis. `#ffffff` $\to$ `#fff`, `#000000` $\to$ `#000`, `#ff0066` $\to$ `#f06`).
5. **Minifikasi & Whitespace Collapse:**
   - Hapus spasi redundan di antara tag `>\s+<` $\to$ `><`.
   - Padatkan spasi ganda di dalam tag menjadi spasi tunggal.
   - Pangkas spasi di sekitar tanda sama dengan atribut (` = ` $\to$ `=`).

### 2.2 Pembangkit Preset Ekspor (`generateExportCode`)
Mendukung format:
1. `'svg-minified'`: Menjalankan `optimizeSvg(svgCode, { precision: 2, removeEditorData: true, collapseWhitespace: true })`.
2. `'react-jsx'`:
   - Mengambil SVG teroptimasi.
   - Mengonversi semua atribut SVG standar dari kebab-case ke camelCase:
     - `fill-rule` $\to$ `fillRule`
     - `clip-path` $\to$ `clipPath`
     - `clip-rule` $\to$ `clipRule`
     - `stroke-width` $\to$ `strokeWidth`
     - `stroke-linecap` $\to$ `strokeLinecap`
     - `stroke-linejoin` $\to$ `strokeLinejoin`
     - `stroke-miterlimit` $\to$ `strokeMiterlimit`
     - `stroke-dasharray` $\to$ `strokeDasharray`
     - `stroke-dashoffset` $\to$ `strokeDashoffset`
     - `paint-order` $\to$ `paintOrder`
     - `vector-effect` $\to$ `vectorEffect`
     - `stop-color` $\to$ `stopColor`
     - `stop-opacity` $\to$ `stopOpacity`
     - `font-size` $\to$ `fontSize`
     - `font-family` $\to$ `fontFamily`
     - `font-weight` $\to$ `fontWeight`
     - `text-anchor` $\to$ `textAnchor`
   - Mengonversi `class="..."` menjadi `className="..."`.
   - Membungkus ke dalam template komponen React:
     ```tsx
     import React from 'react';

     export const SvgIcon = (props: React.SVGProps<SVGSVGElement>) => (
       <svg
         xmlns="http://www.w3.org/2000/svg"
         viewBox="..."
         width="1em"
         height="1em"
         fill="currentColor"
         {...props}
       >
         ...
       </svg>
     );

     export default SvgIcon;
     ```
3. `'vue-sfc'`:
   - Membungkus SVG ke dalam Single File Component Vue 3:
     ```html
     <template>
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="..." ...>
         ...
       </svg>
     </template>

     <script setup>
     // Geovanta Vector Studio — Vue 3 Component
     </script>
     ```
4. `'css-data-uri'`:
   - Mengonversi SVG menjadi URL UTF-8 yang aman untuk CSS:
     - Menghilangkan newline.
     - Meng-encode karakter khusus (`%`, `#`, `<`, `>`, `"`) menjadi `%25`, `%23`, `%3C`, `%3E`, `%22`.
     - Format: `background-image: url("data:image/svg+xml;utf8,...");`

---

## 3. Desain Komponen UI: Live Two-Way SVG Code Inspector (`SvgCodeInspectorModal.tsx`)

### 3.1 Struktur Antarmuka & Tata Letak
Modal dialog yang elegan dan responsif dengan tema Figma gelap/terang:
- **Header:**
  - Ikon kode (`ICONS.code`) + Judul: "SVG Code Inspector & Live Editor".
  - Status Tag:
    - Hijau: `● Live Sync Active` (sinkronisasi dua arah aktif).
    - Merah: `▲ XML Error: [pesan ringkas]` (bila sintaks pengguna tidak valid).
  - Tombol Aksi:
    - **Format / Prettify:** Merapikan indentasi XML hierarkis (2 spasi).
    - **Minify:** Mengompres XML secara instan.
    - **Salin Kode:** Menyalin teks kode yang sedang aktif ke clipboard dengan toast konfirmasi.
    - **Tutup (Esc):** Menutup modal.
- **Segmented Tab Control:**
  1. `SVG XML` (Dua Arah / Editable)
  2. `Web Minified` (Hanya Baca / Copy)
  3. `React JSX` (Hanya Baca / Copy)
  4. `Vue SFC` (Hanya Baca / Copy)
  5. `CSS Data URI` (Hanya Baca / Copy)
- **Editor Area:**
  - Textarea monospace (`font-mono`) dengan nomor baris otomatis.
  - Untuk tab `SVG XML`: Teks dapat diedit bebas (`readOnly: false`).
  - Untuk tab preset: Teks hanya baca (`readOnly: true`) dengan tombol "Salin Komponen".
- **Statistik Bar (Footer):**
  - Menampilkan ukuran byte saat ini, jumlah elemen, dan persentase penghematan (saat di tab Minified).

### 3.2 Siklus Sinkronisasi Dua Arah (Two-Way Sync Loop)
1. **Kanvas $\to$ Kode:**
   - Mengamati perubahan dokumen kanvas (`docRef.current` atau prop `doc`).
   - Jika pengguna TIDAK sedang fokus mengetik di textarea XML, serialisasi dokumen `VE.serializeDoc(doc)` dan perbarui teks editor.
2. **Kode $\to$ Kanvas:**
   - Saat pengguna mengetik di textarea tab `SVG XML`:
     - Terapkan debouncing 300ms.
     - Validasi dengan `new DOMParser().parseFromString(code, 'image/svg+xml')`.
     - Jika terdapat `<parsererror>`: Tampilkan lencana error di header, JANGAN ubah dokumen kanvas (menjaga kanvas tetap stabil dan aman).
     - Jika XML valid: Panggil `VE.parseSVG(code)`. Perbarui dokumen via `commit(parsedDoc)` atau `live(parsedDoc)`. Tampilkan lencana hijau "Live Sync Active".

---

## 4. Integrasi Toolbar, Inspector & Shortcuts

1. **Floating Toolbar (`EditorFloatingToolbar.tsx`):**
   - Tambahkan tombol `code` (`ICONS.code`) di sebelah kanan tombol `settings`.
   - Tooltip: `veSvgCodeInspector` ("Buka SVG Code Inspector & Editor").
   - Shortcut: `Ctrl+Alt+C`.
2. **Right Inspector (`EditorRightInspector.tsx`):**
   - Pada seksi "Export & Impor", tambahkan tombol sekunder dengan ikon `code`: "Inspeksi Kode SVG (Ctrl+Alt+C)".
3. **Shortcuts Hook (`useEditorShortcuts.tsx`):**
   - Daftarkan `Ctrl+Alt+C` untuk membuka/menutup modal Code Inspector.
4. **Katalog Tooltip & i18n (`appI18n.tsx`, `tooltipsCatalog.tsx`):**
   - Tambahkan terjemahan lengkap dalam bahasa Indonesia dan Inggris.

---

## 5. Rencana Pengujian Otomatis (Mandatory Playwright Regular)

1. `tests/tahap3-svg-optimizer-and-presets.spec.ts`:
   - Unit test `optimizeSvg`: pembulatan desimal, penghapusan data editor, pemangkasan `<defs>` tak terpakai, minifikasi whitespace.
   - Unit test presets: React JSX (camelCase attributes, className, prop spreading), Vue SFC, CSS Data URI.
2. `tests/tahap3-code-inspector-sync.spec.ts`:
   - Sinkronisasi Kanvas $\to$ Kode: perubahan objek kanvas menghasilkan XML yang terupdate.
   - Sinkronisasi Kode $\to$ Kanvas: pengeditan teks XML (menambah `<rect>` atau mengubah warna) memicu pembaruan kanvas.
   - Validasi error XML: pengetikan tag rusak tidak merusak kanvas dan memunculkan badge error.
3. `tests/tahap3-export-and-code-ui-e2e.spec.ts`:
   - E2E Playwright: Mengklik tombol Code Inspector di floating toolbar atau menekan `Ctrl+Alt+C` membuka modal.
   - Beralih antar tab (XML, Minified, React, Vue, CSS) dan menyalin kode.
   - Mengetik perubahan di editor kode dan memverifikasi perubahan muncul di kanvas secara visual.

---

## 6. Verifikasi Interaktif (Mandatory Playwright MCP)

1. Jalankan server lokal port `8089`.
2. Navigasi via `browser_navigate`.
3. Buka Code Inspector via `browser_click`.
4. Ambil screenshot visual via `browser_take_screenshot` untuk dokumentasi panel editor kode, lencana live sync, dan preset komponen.
