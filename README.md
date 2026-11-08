# Geovanta Vector Studio — Windows 64-Bit Desktop App (Rust + Tauri)

Aplikasi desktop **Geovanta Vector Studio** untuk **Windows 64-bit (`x86_64-pc-windows-msvc`)** menggunakan **Rust + Tauri v2**, **React 18 (JSX)**, dan **Tailwind CSS v3.4.17**. Bundle JS/CSS sepenuhnya lokal (tanpa CDN untuk kode aplikasi) dan **startup aplikasi kini offline** (stylesheet Google Fonts dihapus dari `index.html` 2026-11-08, P1-06; font UI memakai system font stack) — tetapi aplikasi ini **bukan 100% offline**: font dokumen non-sistem tetap dimuat dari Google Fonts saat font itu dipakai (lihat [Kebutuhan Jaringan](#kebutuhan-jaringan)).

## Arsitektur Proyek

1. **1 File HTML Utama (`index.html`)**
   - Titik masuk DOM tunggal tanpa tag `<style>` native CSS.
   - Catatan: stylesheet Google Fonts **sudah dihapus** dari `index.html` (2026-11-08, P1-06) — startup tidak lagi membutuhkan jaringan; font UI memakai system font stack dan aplikasi tetap berjalan penuh saat offline.
2. **96 File Modular `.jsx` Berdasarkan Fungsinya (`src/`)** — jumlah dihitung dari working copy per 2026-11-08 (setelah penghapusan shim React, lihat bawah); bila jumlah berubah setelah penambahan/penghapusan modul, perbarui angka ini.
   - `src/main.jsx` — Entrypoint aplikasi & registrasi bridge desktop Tauri.
   - `src/App.jsx` — Router aplikasi (`WorkspaceHome` & `VectorEditor`), manajemen preferensi, dialog pemulihan crash, & kuota penyimpanan.
   - `src/vendor/` (2 file `.jsx`)
     - `tailwindOfflineBundle.jsx` — Injeksi CSS Tailwind build-time (statis, hasil kompilasi `tailwindcss` CLI dari `src/styles/tailwind.css` → `dist/assets/tailwind.css`) + plugin tema variabel desain Geovanta (tanpa CDN & tanpa file `.css` native; runtime JIT/MutationObserver dihapus 2026-11-08, P1-01).
     - `tauriDesktopBridge.jsx` — Bridge komunikasi IPC Rust Tauri (`set_window_title`, `get_system_info`, `save_vector_file`, `read_vector_file`).
   - `src/constants/` (9 file `.jsx`)
     - `appI18n.jsx`, `brandAndIcons.jsx`, `tooltipsCatalog.jsx`, `keyboardShortcuts.jsx`, `themeAndPrefsConstants.jsx`, `fontCatalog.jsx`, `workspaceConstants.jsx`, `editorToolsAndShapes.jsx`, `settingsI18n.jsx`.
   - `src/utils/` (11 file `.jsx`)
     - `colorMath.jsx`, `colorParserAndFormatter.jsx`, `screenPipette.jsx`, `presenceAndFilePicker.jsx`, `themeAndPrefsManager.jsx`, `gpuCapabilities.jsx`, `gpuTimerQuery.jsx`, `renderConfigAndTelemetry.jsx`, `zoomAndFormatHelpers.jsx`, `fontManager.jsx`, `shapeGenerators.jsx`.
   - `src/engine/` (26 file `.jsx`)
     - `vectorPrimitives.jsx`, `transformMatrixParser.jsx`, `arcToBezier.jsx`, `svgPathParser.jsx`, `svgPathSerializer.jsx`, `textAndImageEngine.jsx`, `gradientEngine.jsx`, `svgDocumentParser.jsx`, `svgDocumentSerializer.jsx`, `straightenAndAlignNodes.jsx`, `cornerFilletEngine.jsx`, `nodeEditingAndHandles.jsx`, `bezierSubdivisionAndMove.jsx`, `spatialIndexAndHitTest.jsx`, `multiSnapSolver.jsx`, `figcraftSnap.jsx`, `curveFittingAndAnomalies.jsx`, `topologicalCurveSimplifier.jsx`, `postscriptAiRasterIo.jsx`, `selectionTransformAndAlign.jsx`, `figmaAutoLayoutAndFrames.jsx`, `affineAndOrientedBox.jsx`, `autoRefineGeometry.jsx`, `pathBoolean.jsx`, `pathOffset.jsx`, `vectorEngine.jsx`.
   - `src/renderer/` (8 file `.jsx`)
     - `subpathBBox.jsx`, `geometryCache.jsx`, `adaptiveCubicFlattener.jsx`, `objectTessellationLod.jsx`, `polygonTriangulatorAndStroke.jsx`, `sceneRenderer.jsx`, `pathWindingAndBatching.jsx`, `benchmarkSuite.jsx`.
   - `src/workspace/` (7 file `.jsx`)
     - `workspaceDb.jsx`, `assetManager.jsx`, `thumbnailGenerator.jsx`, `thumbnailScheduler.jsx`, `zipEngine.jsx`, `projectRepository.jsx`, `workspaceController.jsx`.
   - `src/components/ui/` (12 file `.jsx`)
     - `IconGlyphs.jsx`, `Slider.jsx`, `RangeField.jsx`, `FloatPopover.jsx`, `SelectDropdown.jsx`, `SegmentedControl.jsx`, `CustomTextBox.jsx`, `TransformField.jsx`, `PinGridSelector.jsx`, `ColorPickerField.jsx`, `ColorHexInput.jsx`, `ContextMenu.jsx`.
   - `src/components/modals/` (3 file `.jsx`)
     - `TooltipHost.jsx`, `HelpShortcutsModal.jsx`, `SettingsModal.jsx`.
   - `src/components/editor/` (14 file `.jsx`)
     - `GradientEditorPanel.jsx`, `GradientCanvasGizmo.jsx`, `SelectionRotationAndRedlines.jsx`, `CanvasVectorObjects.jsx`, `RenderDebugCanvasOverlay.jsx`, `LayerTreeViewport.jsx`, `LayerRows.jsx`, `EditorActionRail.jsx`, `EditorLeftSidebar.jsx`, `EditorSimplifyStrip.jsx`, `EditorOffsetStrip.jsx`, `EditorFloatingToolbar.jsx`, `EditorRightInspector.jsx`, `VectorEditor.jsx`.
   - `src/components/workspace/` (2 file `.jsx`)
     - `WorkspaceProjectThumb.jsx`, `WorkspaceHome.jsx`.
3. **Paket Lokal (`node_modules/` & `dist/assets/geovanta.bundle.js`)**
   - `node_modules/react`, `node_modules/react-dom`, dan `node_modules/tailwindcss` — instal dengan `npm ci` (lihat [Prasyarat & Dependency](#prasyarat--dependency)); `package-lock.json` tersedia sehingga instalasi reproducible. (`node_modules/` juga ikut ter-commit di repo ini, tetapi `npm ci` tetap jalur resmi.)
   - `dist/assets/geovanta.bundle.js` berisi hasil kompilasi `src/main.jsx` beserta React 18 dan Tailwind CSS (di `src/` terdapat 96 file `.jsx`; bundle memuat modul-modul yang terjangkau dari entrypoint). Aplikasi berjalan dari bundle lokal ini; CSS Tailwind hasil build ada di `dist/assets/tailwind.css` (disalin ke `web/assets/`). Font dokumen non-sistem tetap bisa memuat dari Google Fonts saat dipakai (lihat [Kebutuhan Jaringan](#kebutuhan-jaringan)).
4. **Backend Rust & Tauri Windows 64-Bit Installer (`src-tauri/`)**
   - `src-tauri/Cargo.toml` — Konfigurasi crate Rust dengan optimasi rilis (`lto = true`, `opt-level = 3`, `strip = true`).
   - `src-tauri/tauri.conf.json` — Target installer Windows 64-bit **NSIS (`_x64-setup.exe`)** dan **WiX MSI (`_x64_en-US.msi`)**.
   - `src-tauri/src/main.rs` & `src-tauri/src/lib.rs` — Subsystem Windows native (`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`) dan perintah IPC file/window.
   - `src-tauri/icons/` — Ikon aplikasi desktop Windows (`.ico` multi-resolusi & `.png`).

## Cara Build Installer Windows 64-Bit (`.exe` & `.msi`)

### Opsi 1: Klik Ganda Script Otomatis (Windows 64-Bit)
Jalankan file **`build-windows-64bit.bat`** pada PC Windows 64-bit yang memiliki Rust (`https://rustup.rs`) dan Node.js. **Penting:** script ini tidak menginstal dependency Node — jalankan `npm ci` sekali dulu di checkout baru sebelum mengklik script. Script ini otomatis menjalankan:
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

## Prasyarat & Dependency

| Kebutuhan | Versi yang dipakai/diuji | Keterangan |
| --- | --- | --- |
| Node.js | 20 (CI, `.github/workflows/build-windows-x64.yml`); 24.22.1 teruji di sandbox Linux 2026-11-08 | `npm run build:web` terukur 0,6–0,9 detik di sandbox |
| npm | 10.9.4 (sandbox) | `package-lock.json` tersedia — instalasi reproducible via `npm ci` |
| esbuild | `^0.28.2` (0.28.2 terpasang) | `devDependency` (lihat `package.json`); **wajib** — build gagal dengan pesan jelas bila tidak ada, tidak ada lagi fallback ke bundle lama |
| React / ReactDOM | 18.3.1 | `dependencies`; diimpor sebagai package npm biasa dari semua komponen (tidak ada lagi shim React global — `src/vendor/reactOfflineBundle.jsx` dihapus 2026-11-08, P2-07) |
| Tailwind CSS | 3.4.17 | `dependencies`; dikompilasi saat build (`tailwindcss` CLI, `src/styles/tailwind.css` → `dist/assets/tailwind.css`, disalin ke `web/assets/`); runtime JIT/MutationObserver dihapus 2026-11-08, P1-01 |
| Rust | ≥ 1.77.2 (`rust-version` di `src-tauri/Cargo.toml`), edition 2021 | Belum terverifikasi di sandbox ini (Rust tidak terinstal di sini); CI memakai toolchain stable + target `x86_64-pc-windows-msvc` |
| Tauri | 2.0.0 (`src-tauri/Cargo.toml`); CLI `^2.0.0` (2.12.4 terpasang) | Target installer NSIS + WiX MSI |
| @tauri-apps/cli | `^2.0.0` | `devDependency` |

## Build Bersih (Clean Build)

Jalur resmi: instal dependency → build frontend → (opsional) build installer Tauri.

```bash
npm ci                    # instal dependency persis sesuai package-lock.json (butuh jaringan, sekali saja)
npm run build:web         # kompilasi src/main.jsx -> dist/assets/geovanta.bundle.js + salin ke web/
```

Untuk build yang benar-benar bersih (pastikan tidak ada artefak lama yang tertinggal):

```bash
rm -rf dist web           # hapus bundle & folder frontend hasil build sebelumnya
npm ci
npm run build:web
```

Untuk installer Windows 64-bit (dari root proyek, setelah `npm run build:web`):

```bash
npm run tauri:build:win64   # = build:web + cargo tauri build --target x86_64-pc-windows-msvc
```

atau klik ganda `build-windows-64bit.bat` (setelah `npm ci` sekali di checkout baru).

Catatan build:
- `index.html` TIDAK membaca file `src/*.jsx` secara langsung — ia memuat `dist/assets/geovanta.bundle.js`. Setiap selesai mengedit `src/`, bundle harus dikompilasi ulang dengan `npm run build:web`.
- `scripts/build-offline-bundle.js` mengompilasi ulang bundle lalu menyalin `index.html` + bundle ke folder terisolasi `web/`, yang dipakai Tauri sebagai `frontendDist` (Tauri v2 menolak `frontendDist` yang mencakup `node_modules` / `src-tauri`). Script ini **menghapus dan membuat ulang folder `web/`** setiap kali dijalankan.
- Tanpa `esbuild`, build **GAGAL** dengan pesan jelas (`esbuild tidak ditemukan...`) — skrip tidak lagi memakai bundle lama secara diam-diam.

## Kebutuhan Jaringan

| Saat | Butuh jaringan? | Detail |
| --- | --- | --- |
| `npm ci` | Ya | Mengunduh package dari registry npm sesuai `package-lock.json` |
| `cargo tauri build` | Ya (build pertama) | Mengunduh crate dari crates.io; build berikutnya memakai cache lokal |
| Build GitHub Actions | Ya | Runner `windows-latest`: checkout, `npm ci`, build frontend, `cargo tauri build` |
| Installer NSIS | Ya, bila WebView2 belum ada | `webviewInstallMode: downloadBootstrapper` di `tauri.conf.json` mengunduh WebView2 saat instalasi bila belum terinstal di PC target |
| Startup aplikasi | **Tidak** | `index.html` tidak lagi memuat stylesheet Google Fonts (dihapus 2026-11-08, P1-06); font UI memakai system font stack; bundle JS/CSS dimuat dari file lokal |
| Pemakaian font non-sistem | Ya, saat font dipakai | `src/utils/fontManager.jsx` (`ensureFontLoaded`) membangun URL `fonts.googleapis.com/css2` untuk font non-sistem; pengguna juga bisa menempel URL Google Fonts sendiri (divalidasi: domain harus `fonts.googleapis.com`) |
| Editing & penyimpanan inti | **Tidak** | Dokumen & thumbnail disimpan lokal (IndexedDB); bundle JS/CSS dimuat dari file lokal; tidak ada request lain ke internet saat editing |

## Lokasi Hasil Build

| Artefak | Lokasi |
| --- | --- |
| Bundle frontend | `dist/assets/geovanta.bundle.js` (±1,2 MB; ukuran berubah mengikuti source — penghapusan shim React sendiri mengurangi bundle sebesar 19.304 byte ter-minify, terukur back-to-back pada source yang sama, 2026-11-08) |
| Frontend untuk Tauri (`frontendDist`) | `web/` — berisi `index.html` + `assets/geovanta.bundle.js` (dibuat ulang tiap `npm run build:web`) |
| NSIS Installer (`.exe`) | `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Geovanta Vector Studio_1.1.0_x64-setup.exe` |
| MSI Installer (`.msi`) | `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/Geovanta Vector Studio_1.1.0_x64_en-US.msi` |

Versi aplikasi 1.1.0 tercatat seragam di `package.json`, `src-tauri/tauri.conf.json`, dan `src-tauri/Cargo.toml`.

## Cara Menjalankan Benchmark

Benchmark bawaan memakai `src/renderer/benchmarkSuite.jsx` (`GEOVANTA_BENCHMARK_SUITE`) dan dijalankan dari dalam editor:

1. Buka aplikasi, lalu buka sebuah proyek (masuk ke editor — API benchmark hanya tersedia saat editor aktif).
2. Buka **Pengaturan** (ikon gerigi di floating bar) → bagian **Benchmark / Pengujian**.
3. Klik **"Jalankan Semua Uji Benchmark (9 Skenario)"** — menjalankan `window.__geovantaEditorApi.runAutomatedBenchmarks()`.
4. Hasil (10 baris: 9 skenario + 1 uji Partial Alpha) tampil di panel Pengaturan: tiap baris berisi nama skenario, jumlah objek, zoom, LOD, vertex, segitiga, waktu (ms), toleransi tessellation, dan status cache-hit.

Skenario yang diuji: parse SVG lingkaran, Bézier, diagonal, dan compound; dokumen node density 1.000 & 10.000; zoom 256×; koordinat ekstrem 10⁸; dan mosaic 240 objek. Bagian yang sama di Pengaturan juga menyediakan tombol muat dokumen/SVG uji (`loadTestSvg` / `loadTestDoc`, mis. lingkaran, Bézier, density 10/100/1.000/10.000 node).

Catatan pengukuran: angka ms pada benchmark mengukur waktu CPU JavaScript untuk tessellation/submit perintah render, **bukan** waktu eksekusi GPU yang selesai (GPU bekerja asynchronous). Jangan menafsirkan angka tersebut sebagai GPU frame time penuh; bandingkan antar-build hanya pada perangkat, viewport, DPR, dan fixture yang sama.
