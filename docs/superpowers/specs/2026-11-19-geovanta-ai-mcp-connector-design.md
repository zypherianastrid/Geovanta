# Desain Fitur: Geovanta AI MCP Server & Live Connector (Google Gemini & Antigravity)

**Tanggal:** 2026-11-19  
**Status:** Menunggu Persetujuan Pengguna  
**Ukuran:** Project  
**Pendekatan Terpilih:** Opsi C (Hybrid Architecture — Headless Engine + Live In-App WebSocket Connector)

---

## 1. Latar Belakang & Tujuan

Geovanta Vector Studio memiliki engine manipulasi vektor yang sangat lengkap dan mandiri di `src/engine/` (seperti `vectorEngine`, `pathBoolean`, `shapeBuilder`, `topologicalCurveSimplifier`, `cornerFilletEngine`, `svgDocumentParser`, `svgDocumentSerializer`, dll.).

Saat ini, seluruh toolset tersebut hanya dapat diakses melalui interaksi UI pengguna (mouse, keyboard shortcut, toolbar). Pengguna menginginkan integrasi AI modern melalui standar **Model Context Protocol (MCP)** dan konektor khusus untuk **Google Gemini** serta **Antigravity**.

### Tujuan Utama:
1. **Model Context Protocol (MCP) Server**: Membangun server MCP berbasis Node.js yang dapat didaftarkan langsung ke Antigravity (`mcp.json` / setting) atau dipakai oleh agen Google Gemini via stdio.
2. **Akses Penuh Tool Geovanta**: Mengekspos seluruh kemampuan manipulasi geometri vektor Geovanta ke dalam fungsi/tool yang dapat dipanggil AI (*Function Calling*).
3. **Hybrid Architecture (Opsi C)**:
   - **Mode Headless**: Mampu memproses, membuat, menyederhanakan, dan mengonversi berkas SVG/vektor di background tanpa perlu membuka aplikasi Geovanta.
   - **Mode Live Canvas**: Mampu mendeteksi secara otomatis jika Geovanta Vector Studio (desktop/web) sedang aktif, membaca state kanvas saat ini, dan melakukan aksi visual secara real-time (menambah objek, mengubah warna, seleksi, zoom, dll.) dengan riwayat Undo/Redo (`commit()`).
4. **Keamanan & Offline-First**: Komunikasi berjalan 100% lokal (`127.0.0.1`) tanpa ketergantungan cloud pihak ketiga.

---

## 2. Pendekatan yang Dipertimbangkan (*Approaches*)

1. **Opsi A: Standalone Headless MCP Server Only**
   - *Deskripsi:* Hanya mengeksekusi engine vektor secara offline di Node.js CLI.
   - *Kelebihan:* Ringan, cepat untuk otomasi file batch di background.
   - *Kekurangan:* Pengguna tidak melihat hasil perubahan secara interaktif di layar canvas Geovanta saat sedang mendesain.
2. **Opsi B: In-App Bridge Only**
   - *Deskripsi:* Server MCP hanya berfungsi jika aplikasi Geovanta sedang terbuka dan aktif di layar.
   - *Kelebihan:* Selalu sinkron dengan apa yang dilihat pengguna di layar.
   - *Kekurangan:* Jika aplikasi tidak dibuka, agen AI di Antigravity tidak dapat memanfaatkan toolset Geovanta untuk memproses file.
3. **Opsi C: Hybrid Architecture (Dipilih Pengguna)**
   - *Deskripsi:* MCP Server menyediakan fungsi vektor headless yang lengkap, sekaligus mengorkestrasi koneksi WebSocket lokal ke aplikasi Geovanta. Jika Geovanta sedang terbuka, AI secara otomatis mendapatkan kapabilitas tambahan untuk membaca kanvas aktif dan memanipulasinya secara live. Jika aplikasi ditutup, fungsi pengolahan file tetap berjalan secara mulus tanpa error.

---

## 3. Keputusan Desain & Perilaku Pengguna (Hasil Klarifikasi)

Berdasarkan kesepakatan desain:
1. **Model Pemanggilan Tool (Direct / Dual-Mode)**:
   - Tool pembuatan dan manipulasi bentuk (misalnya `geovanta_shape_create`, `geovanta_curve_simplify`, `geovanta_boolean_operation`) dirancang sebagai **Dual-Mode**.
   - Jika aplikasi Geovanta sedang terbuka, objek secara otomatis langsung digambar/dimutasi ke kanvas aktif pengguna dalam 1 langkah (*1-step execution*).
   - Jika aplikasi Geovanta sedang tertutup atau pengguna secara eksplisit meminta hasil file (`target: "svg"`), tool akan mengembalikan data/string SVG mandiri.
2. **Penanganan Layar Galeri Proyek (Auto-Open New Canvas)**:
   - Jika pengguna membuka Geovanta tetapi masih berada di halaman galeri (*Workspace Home Screen*), aksi pembuatan objek dari AI akan secara otomatis memicu pembuatan dan pembukaan kanvas baru (*New Project*), lalu menggambar objek tersebut seketika.
3. **Konfigurasi Port WebSocket**:
   - Port default ditetapkan secara deterministik pada port `38291` (mengikat `127.0.0.1`). Port dapat disesuaikan melalui environment variable `GEOVANTA_PORT`.
4. **Manajemen Sesi Multi-Window**:
   - WebSocket Hub melacak sesi aktif berdasarkan instance Geovanta terakhir yang terfokus (*latest active session*).

---

## 4. Sasaran (Goals), Non-Goals, dan Anti-Goals

### Goals
- Membangun paket MCP Server yang kompatibel dengan spesifikasi Model Context Protocol (JSON-RPC stdio/SSE).
- Menyediakan katalog tool MCP komprehensif:
  - `geovanta_status`: Mengecek status server dan konektivitas live ke aplikasi Geovanta.
  - `geovanta_svg_parse`: Mengurai markup SVG menjadi struktur dokumen vektor Geovanta.
  - `geovanta_svg_serialize`: Mengonversi dokumen vektor kembali menjadi SVG bersih dan teroptimasi.
  - `geovanta_shape_create`: Membuat bentuk vektor parametrik (kotak, lingkaran, bintang, poligon, spiral, blob organik, anyaman weave) langsung ke kanvas atau ke SVG.
  - `geovanta_curve_simplify`: Menyederhanakan kurva dan memangkas anchor points berlebih dengan presisi tinggi (`topologicalCurveSimplifier`).
  - `geovanta_boolean_operation`: Melakukan operasi boolean (union, subtract, intersect, exclude) pada path vektor.
  - `geovanta_corner_fillet`: Menerapkan fillet pembulatan sudut pada node vektor.
  - `geovanta_recolor`: Mengubah palet warna, find & replace warna, dan menerapkan gaya warna.
  - `geovanta_live_get_canvas`: Membaca objek, layer, dan artboard aktif dari Geovanta yang sedang terbuka.
  - `geovanta_live_mutate_canvas`: Menambah, mengubah, atau menghapus objek pada kanvas aktif dengan integrasi riwayat Undo/Redo.
  - `geovanta_live_select_objects`: Memilih atau memfokuskan objek tertentu di kanvas.
  - `geovanta_live_export`: Memicu ekspor kanvas aktif ke format SVG, PNG, EPS, dll.
- Menyediakan modul bridge ringan di Geovanta (`src/bridge/aiLiveConnector.tsx`) yang membuka koneksi client WebSocket ke `ws://127.0.0.1:38291`.
- Menyediakan panduan dan file konfigurasi konfigurasi untuk Antigravity (`mcp.json`) dan adaptor skrip Google Gemini (`gemini-geovanta-connector.js`).

### Non-Goals
- Tidak merombak sistem render GPU/CanvasKit WebGL inti Geovanta.
- Tidak menggantikan interaksi manual pengguna, melainkan mendampingi sebagai asisten co-pilot.
- Tidak memerlukan otentikasi eksternal atau koneksi internet publik.

### Anti-Goals
- **Tidak Memblokir UI Main Thread (60 FPS):** Mutasi dokumen dari AI harus diproses secara asynchronous tanpa membuat canvas macet atau lag.
- **Tidak Merusak Dokumen:** Semua aksi live wajib melalui mekanisme transaksi dokumen Geovanta yang mendukung Undo (`Ctrl+Z`).
- **Tidak Rentan Akses Asing:** WebSocket server hanya mengikat IP loopback `127.0.0.1` dan menolak koneksi dari host lain.

---

## 5. Arsitektur & Alur Kerja Sistem

```
+-------------------------------------------------------------------+
|               Google Gemini / Antigravity Agent                  |
+---------------------------------+---------------------------------+
                                  | (MCP stdio / JSON-RPC)
                                  v
+-------------------------------------------------------------------+
|                  Geovanta AI MCP Server                           |
|                  (scripts/mcp-server/ / Node.js)                  |
|                                                                   |
|  - MCP Tool Handlers & Parameter Validation                       |
|  - Headless Geometry Engine (mengimpor src/engine/)               |
|  - Local WebSocket Server (Port 38291, 127.0.0.1)                 |
+---------------------------------+---------------------------------+
                                  | WebSocket (ws://127.0.0.1:38291)
                                  v (jika Geovanta sedang berjalan)
+-------------------------------------------------------------------+
|                  Geovanta Vector Studio                           |
|                  (Desktop Tauri v2 / Web Browser)                 |
|                                                                   |
|  - src/bridge/aiLiveConnector.tsx                                 |
|  - Terhubung ke window.__GEOVANTA_AUDIT__ / VectorEditor state    |
|  - Auto-open New Project jika masih di galeri                     |
|  - Melaporkan canvas state & mengeksekusi mutasi via commit()     |
+-------------------------------------------------------------------+
```

### A. Modul Klien Geovanta (`src/bridge/aiLiveConnector.tsx`)
1. **Siklus Hidup & Reconnect**:
   - Terinisialisasi saat aplikasi pertama kali dimuat.
   - Mencoba terhubung ke `ws://127.0.0.1:38291`. Jika server belum aktif, melakukan polling koneksi secara ramah (interval 3 detik).
2. **Integrasi Editor & Workspace**:
   - Menghubungkan handler ke `window.__GEOVANTA_AI_BRIDGE__`.
   - Saat menerima instruksi mutasi:
     - Jika berada di halaman `workspace`, memanggil `handleNewProject()` terlebih dahulu, lalu mengaplikasikan mutasi.
     - Jika berada di `VectorEditor`, memanggil `commit(newDoc, actionDesc)` sehingga transaksi tercatat dalam riwayat Undo (`Ctrl+Z`).
3. **Indikator UI Status Bar**:
   - Menampilkan status koneksi di bilah status bawah: Ikon AI dengan titik hijau (*AI Connected*) atau abu-abu (*AI Offline*).

### B. Geovanta MCP Server (`scripts/mcp-server/`)
1. **Struktur Berkas**:
   - `scripts/mcp-server/index.js`: Titik masuk stdio MCP server & server WebSocket.
   - `scripts/mcp-server/tools/`: Definisi skema dan handler masing-masing tool.
   - `scripts/mcp-server/engineAdapter.js`: Adapter yang mengeksekusi fungsi matematika dan geometri Geovanta.
2. **Konektor Google Gemini**:
   - `scripts/gemini-geovanta-connector.js`: Skrip mandiri yang menghubungkan Google Gen AI SDK (`@google/genai`) dengan tool schema MCP Geovanta.
3. **Konfigurasi Antigravity**:
   - Format registrasi MCP server siap pakai di pengaturan Antigravity.

---

## 6. Rencana Pengujian & Verifikasi (Playwright & Unit Tests)

Sesuai aturan repo `AGENTS.md`, seluruh verifikasi browser dan integrasi dilakukan dengan Playwright:
1. **Unit Tests MCP Server (`tests/mcp-server.test.cjs`)**:
   - Menguji inisialisasi server MCP, handshake JSON-RPC, eksekusi tool headless (`shape_create`, `svg_parse`, `curve_simplify`).
2. **Integration Test Live Connector (`tests/ai-live-connector.test.cjs`)**:
   - Menjalankan mock WebSocket server dan membuka Geovanta via Playwright.
   - Menguji koneksi otomatis dari client Geovanta.
   - Menguji skenario:
     - Mutasi saat berada di kanvas editor aktif.
     - Skenario auto-open project saat klien berada di Workspace Gallery.
     - Verifikasi keberhasilan Undo (`Ctrl+Z`).
3. **Regression Test**: Memastikan seluruh suite pengujian yang sudah ada tetap lulus (`npm test`).

---

## 7. Keputusan Builder (*Builder Calls*)
- **Komunikasi WebSocket:** Menggunakan modul native Node.js `ws` untuk server MCP dan API browser native `WebSocket` untuk Geovanta client tanpa dependensi eksternal tambahan.
- **Port Handling:** Fixed loopback `127.0.0.1:38291` dengan pesan error yang jelas jika port bentrok.
- **Format Payload:** Mengikuti skema dokumen internal Geovanta (`{ id, version, artboard, objects, selection }`).
