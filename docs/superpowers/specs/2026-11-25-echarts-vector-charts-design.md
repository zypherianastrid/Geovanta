# Desain Fitur: Geovanta Charts (Apache ECharts Pure Vector)

## 1. Tujuan & Alasan
Menambahkan fitur **Charts** ke Geovanta Vector Studio untuk kebutuhan **data visualization** berbasis **Apache ECharts**, di mana seluruh 22 tipe chart yang didukung ECharts dirender sebagai **vektor murni** yang dapat diedit bebas di dua level:
1. **Level Chart (Data & Styling):** Ubah jenis chart, data/value, warna, palet, gradien, font, judul, legenda, sumbu, grid, label, dan opsi ECharts kapan saja langsung dari **sidebar kanan paling atas** atau lewat **Charts Studio**.
2. **Level Vektor (Elemen Individual):** Setiap batang, slice, garis, titik, grid, dan teks di kanvas adalah objek vektor asli Geovanta yang bisa diedit node/path/warna/posisi/font-nya secara bebas.

## 2. Lingkup & Non-Goals
- **Goals:**
  - Mendukung **semua 22 tipe series resmi Apache ECharts**: `line`, `bar`, `pie`, `scatter`, `effectScatter`, `radar`, `tree`, `treemap`, `sunburst`, `boxplot`, `candlestick`, `heatmap`, `map`, `parallel`, `lines`, `graph`, `sankey`, `funnel`, `gauge`, `pictorialBar`, `themeRiver`, dan `custom`.
  - Dilengkapi **preset variasi populer** (Area, Stacked Bar/Line, Horizontal Bar, Polar Bar, Donut, Nightingale Rose, Bubble, Calendar Heatmap, Radial Tree, Circular Graph, Gantt/Range Custom, dll.).
  - **100% offline** di bundle Geovanta (termasuk peta GeoJSON bawaan ringan untuk `map` & `lines`: Peta Dunia + Peta Indonesia, plus fitur impor GeoJSON custom).
  - Kustomisasi lengkap di **Sidebar Kanan paling atas** saat chart diseleksi, ditambah **Charts Studio Modal** untuk eksplorasi katalog & edit tabel data berukuran besar.
  - Simpan/buka proyek dan export SVG tetap mempertahankan metadata chart (`data-gen`) sekaligus tetap valid sebagai SVG standar.
- **Non-Goals:**
  - Chart 3D WebGL (`echarts-gl`), karena berbasis raster canvas/WebGL dan bukan vektor SVG murni.
  - Animasi interaktif runtime di kanvas (`animation: false` selalu diterapkan).

## 3. Pendekatan yang Dipilih
- **Pendekatan A (Hybrid — Charts Studio + Native Vector Group + Top Right Inspector)**
  - ECharts merender chart ke SVG murni (`echarts.init(null, null, { renderer: 'svg', ssr: true, width, height })` + `renderToSVGString()`).
  - `VE.parseSVG()` mengonversi SVG menjadi `VectorObject[]` asli Geovanta dalam satu grup bernama (`chart-<tipe>-<n>`).
  - Metadata `gen: { kind: 'chart', version: 1, chartGroupId, config, bounds }` disimpan pada objek jangkar grup chart, dan `gen: { kind: 'chart-member', chartGroupId }` pada anggota grup lainnya.
