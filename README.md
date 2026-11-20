# Geovanta Vector Studio — Windows 64-Bit Desktop App (Rust + Tauri)

Geovanta Vector Studio menggunakan Rust + Tauri v2, React 18, Tailwind CSS 3, dan Skia CanvasKit 0.40.0. Kanvas editor memakai CanvasKit WebGL (GPU) dengan fallback CPU jika WebGL tidak tersedia. Pratinjau proyek dan ekspor PNG/JPG/WebP tetap memakai rasterisasi CanvasKit di CPU. Tepi path di layar dan pada ekspor raster dihaluskan dengan antialiasing.

## Cara Langsung Pakai

1. Ekstrak seluruh ZIP ke satu folder.
2. Buka `geovanta01/index.html` di Chrome atau Edge. Aset aplikasi dan WebAssembly sudah disertakan dan dapat dimuat offline.
3. Simpan proyek di Workspace atau gunakan ekspor backup `.geovanta` untuk memindahkannya ke perangkat lain.

## Membuka proyek dan tombol Pas

Editor memusatkan objek yang terlihat saat proyek dibuka atau tombol Pas ditekan. Jika kanvas kosong, editor memusatkan artboard. Teks dari proyek lama ditampilkan sebagai lapisan baca saja dan ikut diekspor ke SVG, PNG, JPG, dan WebP. Teks belum dapat diedit; impor SVG baru tetap melewati teks. Ekspor AI/EPS memberi pesan jika proyek berisi teks lama agar teks tidak hilang diam-diam.

## Arsitektur Proyek

1. **1 File HTML Utama (`index.html`)**
   - Titik masuk DOM tunggal tanpa tag `<style>` native CSS.
2. **Modul `.jsx` Berdasarkan Fungsinya (`src/`)**
   - `src/main.jsx` — Entrypoint aplikasi & registrasi bridge desktop Tauri.
   - `src/App.jsx` — Router aplikasi (`WorkspaceHome` & `VectorEditor`), manajemen preferensi, dialog pemulihan crash, & kuota penyimpanan.
   - `src/vendor/` (3 file `.jsx`)
     - `reactOfflineBundle.jsx` — Bundle lokal penuh React 18.3.1 & ReactDOM 18.3.1 (tanpa CDN).
     - `tailwindOfflineBundle.jsx` — Engine & runtime penuh Tailwind CSS v3.4.17 + plugin tema variabel desain Geovanta (tanpa CDN & tanpa file `.css` native).
     - `tauriDesktopBridge.jsx` — Bridge komunikasi IPC Rust Tauri (`set_window_title`, `get_system_info`, `save_vector_file`, `read_vector_file`).
   - `src/constants/` (7 file `.jsx`)
     - `brandAndIcons.jsx`, `tooltipsCatalog.jsx`, `keyboardShortcuts.jsx`, `themeAndPrefsConstants.jsx`, `workspaceConstants.jsx`, `editorToolsAndShapes.jsx`.
   - `src/utils/` (10 file `.jsx`)
     - `colorMath.jsx`, `colorParserAndFormatter.jsx`, `screenPipette.jsx`, `presenceAndFilePicker.jsx`, `themeAndPrefsManager.jsx`, `deviceProfiles.jsx`, `renderConfigAndTelemetry.jsx`, `zoomAndFormatHelpers.jsx`, `shapeGenerators.jsx`.
   - `src/engine/` (22 file `.jsx`)
     - `vectorPrimitives.jsx`, `transformMatrixParser.jsx`, `arcToBezier.jsx`, `svgPathParser.jsx`, `svgPathSerializer.jsx`, `imageAndBounds.jsx`, `gradientEngine.jsx`, `svgDocumentParser.jsx`, `svgDocumentSerializer.jsx`, `straightenAndAlignNodes.jsx`, `cornerFilletEngine.jsx`, `nodeEditingAndHandles.jsx`, `bezierSubdivisionAndMove.jsx`, `spatialIndexAndHitTest.jsx`, `multiSnapSolver.jsx`, `curveFittingAndAnomalies.jsx`, `topologicalCurveSimplifier.jsx`, `postscriptAiRasterIo.jsx`, `selectionTransformAndAlign.jsx`, `figmaAutoLayoutAndFrames.jsx`, `affineAndOrientedBox.jsx`, `autoRefineGeometry.jsx`, `vectorEngine.jsx`.
   - `src/renderer/`
     - `subpathBBox.jsx`, `geometryCache.jsx`, `adaptiveCubicFlattener.jsx`, `objectTessellationLod.jsx`, `polygonTriangulatorAndStroke.jsx`, `sceneRenderer.jsx`, `canvasKitScene.jsx`, `canvasKitRasterExport.jsx`, `canvasKitRuntime.jsx`, `pathInfo.jsx`, `benchmarkSuite.jsx`.
   - `src/workspace/` (6 file `.jsx`)
     - `workspaceDb.jsx`, `assetManager.jsx`, `thumbnailGenerator.jsx`, `zipEngine.jsx`, `projectRepository.jsx`, `workspaceController.jsx`.
   - `src/components/ui/` (12 file `.jsx`)
     - `IconGlyphs.jsx`, `Slider.jsx`, `RangeField.jsx`, `FloatPopover.jsx`, `SelectDropdown.jsx`, `SegmentedControl.jsx`, `CustomTextBox.jsx`, `TransformField.jsx`, `PinGridSelector.jsx`, `ColorPickerField.jsx`, `ColorHexInput.jsx`, `ContextMenu.jsx`.
   - `src/components/modals/` (3 file `.jsx`)
     - `TooltipHost.jsx`, `HelpShortcutsModal.jsx`, `SettingsModal.jsx`.
   - `src/components/editor/` (13 file `.jsx`)
     - `GradientEditorPanel.jsx`, `GradientCanvasGizmo.jsx`, `SelectionRotationAndRedlines.jsx`, `CanvasVectorObjects.jsx`, `RenderDebugCanvasOverlay.jsx`, `LayerTreeViewport.jsx`, `EditorActionRail.jsx`, `EditorLeftSidebar.jsx`, `EditorSimplifyStrip.jsx`, `EditorFloatingToolbar.jsx`, `EditorRightInspector.jsx`, `VectorEditor.jsx`.
   - `src/components/workspace/` (2 file `.jsx`)
     - `WorkspaceProjectThumb.jsx`, `WorkspaceHome.jsx`.
3. **Aset Runtime Offline (`dist/assets/` dan `web/assets/`)**
   - Bundle aplikasi, runtime CanvasKit dengan WebAssembly lokal, dan lisensi CanvasKit sudah siap digunakan.
4. **Backend Rust & Tauri Windows 64-Bit Installer (`src-tauri/`)**
   - `src-tauri/Cargo.toml` — Konfigurasi crate Rust dengan optimasi rilis (`lto = true`, `opt-level = 3`, `strip = true`).
   - `src-tauri/tauri.conf.json` — Target installer Windows 64-bit **NSIS (`_x64-setup.exe`)** dan **WiX MSI (`_x64_en-US.msi`)**.
   - `src-tauri/src/main.rs` & `src-tauri/src/lib.rs` — Subsystem Windows native (`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`) dan perintah IPC file/window.
   - `src-tauri/icons/` — Ikon aplikasi desktop Windows (`.ico` multi-resolusi & `.png`).

## Cara Build Installer Windows 64-Bit (`.exe` & `.msi`)

### Opsi 1: Klik Ganda Script Otomatis (Windows 64-Bit)
Jalankan file **`build-windows-64bit.bat`** pada PC Windows 64-bit dengan Node.js 20+, Rust MSVC, Visual Studio Build Tools (Desktop development with C++), dan Tauri CLI v2 (`cargo install tauri-cli --version "^2.0.0" --locked`). Script ini otomatis menjalankan:
```bat
rustup target add x86_64-pc-windows-msvc
node scripts/build-offline-bundle.js
cd src-tauri
cargo tauri build --target x86_64-pc-windows-msvc
```

Hasil installer 64-bit akan tersedia di:
- **NSIS Installer (`.exe`)**: `src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\Geovanta Vector Studio_1.1.0_x64-setup.exe`
- **MSI Installer (`.msi`)**: `src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\Geovanta Vector Studio_1.1.0_x64_en-US.msi`

### Opsi 2: Build Otomatis via GitHub Actions
Proyek ini juga dilengkapi workflow `.github/workflows/build-windows-x64.yml` yang siap mengompilasi installer `.exe` dan `.msi` 64-bit secara otomatis di runner `windows-latest`.

## Build Ulang Setelah Mengedit Sumber

```sh
npm ci
npm test
npm run build:web
```

Skrip build memperbarui aset di `dist/assets/` dan menyalinnya bersama HTML ke `web/` untuk Tauri. Jika dependensi belum terpasang, build berhenti dengan pesan untuk menjalankan `npm ci`. Untuk menyalin aset prebuilt yang disertakan di ZIP secara eksplisit, jalankan `npm run stage:prebuilt`.

## Panduan Integrasi AI (Model Context Protocol & Google Gemini)

Geovanta Vector Studio dilengkapi dengan konektor **Model Context Protocol (MCP)** resmi dan jembatan agen AI cerdas yang mendukung **Antigravity (AGY)** serta **Google Gemini AI**. Integrasi ini memungkinkan agen kecerdasan buatan membaca status kanvas, membuat geometri vektor parametrik, melakukan manipulasi kurva, hingga mengekspor berkas secara interaktif maupun otomatis.

### Arsitektur AI Hybrid: Mode Live vs Mode Headless

Geovanta beroperasi dalam arsitektur AI hibrida yang cerdas:

1. **Mode Live (Sinkronisasi Kanvas Interaktif Real-Time)**:
   - **Koneksi Otomatis**: Ketika aplikasi Geovanta (desktop Tauri atau peramban web di `web/index.html`) dibuka, jembatan internal (`AiLiveConnector`) secara otomatis menghubungkan kanvas ke server MCP lokal via WebSocket pada port `38291` (atau port kustom melalui URL query parameter `?ai_port=<port>`).
   - **Indikator Visual**: Saat terhubung, indikator status hijau *"AI Connected"* muncul di bilah antarmuka Geovanta.
   - **Manipulasi Langsung & Undo Transaksional**: Semua pembuatan objek vektor, seleksi objek, dan manipulasi dieksekusi secara instan pada kanvas aktif dengan riwayat transaksi penuh, sehingga pengguna dapat membatalkan aksi AI kapan saja menggunakan pintasan `Ctrl + Z` (Undo) atau mengembalikannya dengan `Ctrl + Y` / `Ctrl + Shift + Z` (Redo).
   - **Transisi Galeri Otomatis**: Jika AI dipanggil saat pengguna berada di layar galeri Workspace Home, sistem secara mulus membuka proyek kanvas baru dan langsung menggambar objek yang diminta.

2. **Mode Headless (Mesin Vektor Standalone & Fallback CLI)**:
   - **Otonom Tanpa Antarmuka**: Jika aplikasi GUI Geovanta sedang ditutup, server MCP tetap dapat memproses permintaan secara headless menggunakan adapter mesin vektor internal (`scripts/mcp-server/engineAdapter.js`).
   - **Serialisasi SVG Mandiri**: Agen AI dapat mem-parsing SVG, menyederhanakan kurva, menjalankan operasi boolean (CSG), fillet sudut, dan menghasilkan markup SVG murni yang valid tanpa ketergantungan pada layar pengguna.
   - **Sangat Cocok untuk Otomasi**: Sangat efisien untuk pipeline integrasi berkelanjutan (CI/CD), skrip batch grafis, konversi aset game, dan pemrosesan latar belakang.

---

### Konfigurasi di Antigravity (`antigravity-mcp.json`)

Antigravity mendukung server MCP Geovanta melalui protokol standar JSON-RPC 2.0. Berkas konfigurasi siap pakai `antigravity-mcp.json` telah disediakan di direktori utama:

```json
{
  "mcpServers": {
    "geovanta": {
      "command": "node",
      "args": ["scripts/mcp-server/index.js"],
      "env": {
        "GEOVANTA_PORT": "38291"
      }
    }
  }
}
```

#### Langkah Pemasangan:
1. Pastikan lingkungan Anda memiliki **Node.js 20+**.
2. Masukkan konfigurasi di atas ke dalam konfigurasi MCP Antigravity Anda (`antigravity-mcp.json` atau menu Settings > MCP Servers).
3. Setelah terdaftar, Antigravity akan mendeteksi seluruh 12 tools bawaan Geovanta dengan awalan `geovanta_`.
4. Untuk menyambungkan ke sesi visual langsung, jalankan aplikasi Geovanta di desktop atau buka `web/index.html?ai_port=38291`.

---

### Penggunaan Bersama Google Gemini AI (`scripts/gemini-geovanta-connector.js`)

Geovanta menyertakan skrip integrasi `scripts/gemini-geovanta-connector.js` yang secara dinamis memetakan skema MCP menjadi deklarasi fungsi (`FunctionDeclaration`) untuk model Google Gemini AI (seperti Gemini 1.5 Pro, Gemini 2.0 Flash, dan Gemini API Live).

#### Menjalankan Perintah Bahasa Alami:
```sh
# 1. Atur kunci API Google Gemini (PowerShell)
$env:GEMINI_API_KEY="AIzaSy..."

# 2. Berikan instruksi desain vektor dalam bahasa alami
node scripts/gemini-geovanta-connector.js "Tolong buatkan bintang 5 sudut berwarna kuning emas di kanvas aktif"
```

#### Mode Uji Simulasi Offline (Tanpa Kunci API):
Jika Anda ingin memverifikasi resolusi pemanggilan fungsi (Function Calling) secara lokal tanpa kuota internet atau kunci API:
```sh
node scripts/gemini-geovanta-connector.js --simulate "Tolong buatkan lingkaran dengan radius 40 dan warna hijau toska"
```

#### Mengekspor Skema Deklarasi Tools Gemini:
Untuk melihat atau mengekspor spesifikasi JSON deklarasi fungsi Gemini:
```sh
node scripts/gemini-geovanta-connector.js --tools
```

---

### Katalog 12 Tools AI Geovanta & Parameter Lengkap

Berikut adalah daftar lengkap 12 tools yang diekspos oleh Geovanta MCP Server:

| No | Nama Tool | Kategori | Deskripsi & Parameter Utama |
|---|---|---|---|
| 1 | `geovanta_status` | Status & Diagnostik | Mengecek kesehatan server MCP, port WebSocket lokal, jumlah klien terhubung, dan status koneksi live. <br>**Parameter:** *(tidak memerlukan parameter)* |
| 2 | `geovanta_shape_create` | Geometri Parametrik | Membuat bentuk vektor parametrik dan menambahkannya ke kanvas aktif atau mengekspornya sebagai string SVG. <br>**Parameter Wajib:** `type` (`rectangle`, `circle`, `star`, `polygon`, `spiral`, `blob`, `weave`). <br>**Parameter Opsi:** `x`, `y`, `width`, `height`, `cx`, `cy`, `radius`, `innerRadius`, `outerRadius`, `points`, `sides`, `turns`, `irregularity`, `smoothness`, `cols`, `rows`, `amplitude`, `thickness`, `waveType`, `fill`, `stroke`, `strokeWidth`, `opacity`, `name`, `target` (`canvas` \| `svg`). |
| 3 | `geovanta_curve_simplify` | Optimasi Kurva | Penyederhanaan kurva topologis untuk mengurangi kepadatan titik simpul (anchor nodes) tanpa merusak fidelitas bentuk. <br>**Parameter:** `svgString` (string SVG XML untuk mode headless), `level` (agresivitas 0–100, default 100), `tolerance` (toleransi jarak piksel), `target` (`canvas` \| `svg`). |
| 4 | `geovanta_boolean_operation` | Geometri Konstruktif (CSG) | Melakukan operasi penggabungan atau pemotongan area geometri jalur vektor. <br>**Parameter Wajib:** `op` (`union`, `subtract`, `intersect`, `exclude`). <br>**Parameter Opsi:** `svgString`, `target` (`canvas` \| `svg`). |
| 5 | `geovanta_corner_fillet` | Penyesuaian Sudut | Menerapkan pembulatan sudut presisi (fillet) pada simpul kurva tajam dengan radius tertentu. <br>**Parameter Wajib:** `radius` (nilai radius pembulatan). <br>**Parameter Opsi:** `mode` (`circular` \| `proportional`), `svgString`, `target` (`canvas` \| `svg`). |
| 6 | `geovanta_recolor` | Manajemen Warna | Mengganti warna spesifik pada elemen vektor atau memetakan ulang seluruh palet warna desain. <br>**Parameter:** `find` (warna hex/rgb/nama yang dicari), `replace` (warna pengganti), `palette` (larik nilai hex warna target), `svgString`, `target` (`canvas` \| `svg`). |
| 7 | `geovanta_svg_parse` | Konversi Data | Mengonversi string berkas SVG XML mentah menjadi struktur data JSON dokumen pohon layer Geovanta. <br>**Parameter Wajib:** `svgString` (string SVG XML). |
| 8 | `geovanta_svg_serialize` | Konversi Data | Melakukan serialisasi struktur objek dokumen Geovanta menjadi markup SVG XML yang valid dan siap diekspor. <br>**Parameter Wajib:** `doc` (objek JSON dokumen Geovanta). |
| 9 | `geovanta_live_get_canvas` | Inspeksi Live | Mengambil status dokumen kanvas aktif secara langsung dari jendela aplikasi yang sedang berjalan (dimensi artboard, daftar layer objek, seleksi aktif, dan nama layar). <br>**Parameter:** *(tidak memerlukan parameter)* |
| 10 | `geovanta_live_mutate_canvas` | Manipulasi Live | Menerapkan mutasi atau penambahan objek vektor langsung pada kanvas Geovanta aktif dengan pencatatan Undo/Redo. <br>**Parameter Wajib:** `action` (deskripsi riwayat tindakan untuk undo stack), `objects` (larik objek vektor Geovanta). <br>**Parameter Opsi:** `replaceAll` (boolean, jika true akan menghapus objek sebelumnya). |
| 11 | `geovanta_live_select_objects` | Navigasi & Seleksi | Memilih dan memfokuskan elemen objek vektor tertentu pada kanvas aktif berdasarkan ID objek. <br>**Parameter Wajib:** `ids` (larik string ID objek yang akan dipilih). |
| 12 | `geovanta_live_export` | Ekspor Live | Memicu ekspor kanvas aktif langsung dari aplikasi yang terhubung ke dalam berkas grafis. <br>**Parameter:** `format` (`svg`, `png`, `jpg`, `webp` — default: `svg`). |

