# Spec Desain: Migrasi Mesin Komputasi Vektor Geovanta ke Rust WebAssembly (wasm-bindgen)

Tanggal: 2026-11-20  
Status: Draft -> In Review (Builder Checked)  
Penulis: Antigravity Assistant & Superpowers Team  

---

## 1. Intent & The Why

Geovanta Vector Studio adalah aplikasi desktop desain vektor profesional berbasis Tauri 2 + React TSX + Canvas 2D/CanvasKit. Selama manipulasi kanvas interaktif (seperti zooming dinamis, panning, pen tool dragging, selection transform, dan node editing pada 60 FPS), engine vektor harus mengeksekusi perhitungan geometri intensif ribuan kali per detik:
- **Adaptive Bézier Flattening (De Casteljau):** Mengonversi kurva kubik ke segmen garis polilin dengan batas toleransi subpiksel (0.25 px).
- **Polygon Triangulation (Ear-Clipping):** Mengubah kontur poligon menjadi koordinat mesh segitiga untuk rendering GPU VBO instan.
- **Topological Curve Simplification (Ramer-Douglas-Peucker & Schneider Curve Fitting):** Menyederhanakan ratusan ribu node path hasil tracing/freehand.

Di runtime JavaScript V8 (Webview2), loop rekursif yang sering mengalokasikan array koordinat dan objek titik menyebabkan beban CPU tinggi serta *garbage collection pauses* (micro-stutter) saat menangani file vektor kompleks.

Dengan memigrasikan fungsi-fungsi komputasi murni ini ke **Rust WebAssembly (`wasm-bindgen`)**, komputasi berjalan mendekati kecepatan native (*near-native speed*) langsung di thread frontend tanpa latency IPC, memory allocation diminimalisir via buffer datar (`Float64Array` / `Float32Array` flat memory slice), dan 100% kompatibel baik untuk aplikasi desktop Tauri maupun offline web bundle.

---

## 2. Goals, Non-Goals, & Anti-Goals

### 2.1 Goals
1. **Membuat Crate Rust WASM Terdedikasi:** Crate baru `rust/geovanta-wasm` yang dikompilasi ke target `wasm32-unknown-unknown` dengan bindings `wasm-bindgen`.
2. **Migrasi Terarah Unit Gelombang 1 (Wave 1 Performance Critical):**
   - **Unit 1: `adaptiveCubicFlattener`:**
     - Flattening adaptif De Casteljau kurva Bézier kubik ke polilin koordinat `[x, y, ...]`.
     - Perhitungan jarak titik ke chord (`pointToChordDistSq`).
     - Batch flattening untuk subpath poligon (`batch_flatten_cubics_flat`).
   - **Unit 2: `polygonTriangulatorAndStroke` (Ear-Clipping & Validation):**
     - Deteksi self-intersection poligon (`hasPolygonSelfIntersection`).
     - Triangulasi Ear-Clipping poligon sederhana (`earClipSimplePolygon`) menghasilkan flat buffer koordinat vertex (`Float32Array`) langsung untuk GPU VBO.
   - **Unit 3: `topologicalCurveSimplifier` (RDP Polyline Simplification Core):**
     - Algoritma Ramer-Douglas-Peucker (`rdp_simplify_flat`).
3. **Pola Integrasi In-Place Facade (Zero Caller Rewiring):**
   - Modul asli (`adaptiveCubicFlattener.tsx`, `polygonTriangulatorAndStroke.tsx`, `topologicalCurveSimplifier.tsx`) dipertahankan sebagai API publik yang stabil.
   - Modul-modul ini bertindak sebagai **In-Place Facade**: mendelegasikan komputasi ke `wasmEngineBridge` jika WASM siap, dan secara otomatis fallback ke implementasi TS lokal jika belum siap. Tidak ada modul eksternal di `src/engine/` atau `src/renderer/` yang perlu diubah impornya.
4. **Preservasi Telemetri & Stats:**
   - Objek telemetri `stats` (`vertexCount`, `segmentCount`, `budgetHit`) dimutasi secara transparan di dalam facade JS setelah menerima array hasil koordinat dari WASM.
5. **Karakterisasi & Verifikasi Ketat via `rust-anything` & Playwright:**
   - Perekaman kasus uji ground-truth via `rust-anything record` menggunakan flat-array harness (`scripts/harness-wasm-engine.ts`).
   - Validasi identitas output via `rust-anything diff` (toleransi numerik float64 $\le 10^{-7}$).
   - Benchmark peningkatan kecepatan via `rust-anything bench`.
   - Sesuai aturan repositori di `AGENTS.md`, seluruh verifikasi otomatis end-to-end divalidasi dengan **Playwright Regular (`@playwright/test`)**.

### 2.2 Non-Goals
1. Memindahkan komponen React, hook state editor, atau event listener pointer/keyboard ke Rust. UI tetap murni di TypeScript/React.
2. Memindahkan sistem file I/O lokal atau Windows API ke WASM (fungsi OS tetap ditangani oleh backend native Tauri di `src-tauri/`).
3. Menulis ulang atau merombak seluruh modul `src/engine/` (19.000 baris) sekaligus dalam satu tahap.
4. Mengubah pipeline GPU rendering Geovanta ke Indexed Drawing (IBO); output triangulasi tetap flat vertex buffer sesuai arsitektur VBO saat ini.

### 2.3 Anti-Goals
1. **Big Bang Rewrite:** Merombak seluruh engine sekaligus yang berisiko merusak stabilitas aplikasi.
2. **Regresi Fungsional:** Tidak boleh ada perbedaan visual/geometris pada hasil render, snapping, maupun export SVG antara modul TypeScript dan Rust WASM.
3. **Menghapus Kode TypeScript Asli Sebelum Verifikasi:** Modul TypeScript asli tetap dipertahankan sebagai fallback aman.

---

## 3. Batasan Teknis (Constraints)

1. **Lingkungan OS & Build:**
   - Host: Windows 64-bit (`x86_64-pc-windows-msvc`).
   - Rust toolchain: `rustc 1.100.0`, `cargo 1.100.0`.
   - Target Rust: `wasm32-unknown-unknown` (`rustup target add wasm32-unknown-unknown`).
   - Bundling tool: `wasm-bindgen-cli` / `rust-anything build`.
2. **Integrasi Bundler:**
   - Pipeline build offline bundle (`scripts/build-offline-bundle.js` berbasis `esbuild`) memuat modul WebAssembly (baik base64 embedded maupun asset ter-bundle) sehingga Geovanta tetap 100% offline-capable.
3. **Zero-Copy / Flat-Array Data Boundary:**
   - Seluruh input dan output geometris melewati batas WASM sebagai flat buffer bertipe (`Float64Array` / `Float32Array`) untuk meminimalkan alokasi per-frame.

---

## 4. Pendekatan yang Dipertimbangkan & Keputusan

| Pendekatan | Kelebihan | Kekurangan | Status |
|---|---|---|---|
| **1. Rust WebAssembly (`wasm-bindgen`)** | Eksekusi langsung di frontend thread, zero-latency IPC serialisasi, kompatibel di Tauri dan Offline Web Bundle. | Perlu toolchain `wasm32-unknown-unknown` dan modul wasm loader. | **DIPILIH** |
| **2. Tauri Native Command (`src-tauri`)** | Native x86_64 msvc, multithreading OS bebas (Rayon). | Biaya serialisasi IPC Webview tinggi, tidak jalan di mode web murni. | Ditolak untuk hot render loops |
| **3. Pure JS Optimization (TypedArrays/SIMD JS)** | Tanpa toolchain Rust tambahan. | Kecepatan V8 tetap memiliki batas optimasi dan potensi de-optimisasi JIT. | Ditolak |

---

## 5. Arsitektur Rinci Crate & Antarmuka API

### 5.1 Struktur Direktori Crate `rust/geovanta-wasm`
```
rust/geovanta-wasm/
├── Cargo.toml
├── src/
│   ├── lib.rs                  # Export wasm-bindgen
│   ├── flattener.rs            # De Casteljau adaptive flattening
│   ├── triangulator.rs         # Ear-clipping & self-intersection
│   └── simplifier.rs           # RDP polyline simplification
└── tests/
    └── cases.jsonl             # Characterization test cases dari rust-anything
```

### 5.2 Antarmuka Ekspor Rust (`wasm-bindgen`)

```rust
// 1. Adaptive Bézier Flattening
#[wasm_bindgen]
pub fn flatten_cubic_adaptive_flat(
    x0: f64, y0: f64,
    x1: f64, y1: f64,
    x2: f64, y2: f64,
    x3: f64, y3: f64,
    tol_sq: f64,
    max_depth: u32,
    min_seg_len_sq: f64,
    seg_vertex_limit: usize,
) -> Vec<f64>;

#[wasm_bindgen]
pub fn point_to_chord_dist_sq(
    px: f64, py: f64,
    x0: f64, y0: f64,
    dx: f64, dy: f64,
    chord_len_sq: f64,
) -> f64;

// 2. Ear-Clipping Polygon Triangulation (Flat Vertex Coordinates [ax, ay, bx, by, cx, cy, ...])
#[wasm_bindgen]
pub fn has_polygon_self_intersection_flat(coords: &[f64]) -> bool;

#[wasm_bindgen]
pub fn ear_clip_polygon_flat(coords: &[f64]) -> Option<Vec<f32>>;

// 3. RDP Curve Simplification
#[wasm_bindgen]
pub fn rdp_simplify_flat(coords: &[f64], epsilon: f64) -> Vec<f64>;
```

### 5.3 Lapisan Jembatan Frontend & In-Place Facade

#### `src/bridge/wasmEngineBridge.ts`:
```typescript
export interface WasmEngine {
  isReady: boolean;
  flattenCubic: (
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    tolSq: number,
    maxDepth: number,
    minSegLenSq: number,
    vertexLimit: number
  ) => Float64Array | number[] | null;
  hasSelfIntersection: (coords: number[]) => boolean;
  earClipPolygon: (coords: number[]) => Float32Array | null;
  rdpSimplify: (coords: number[], epsilon: number) => Float64Array | number[];
}

export const wasmEngine: WasmEngine = {
  isReady: false,
  flattenCubic: null,
  hasSelfIntersection: null,
  earClipPolygon: null,
  rdpSimplify: null,
};

export async function initWasmEngine(): Promise<boolean> {
  // Asynchronous dynamic import & instantiation
}
```

#### Contoh In-Place Facade (`src/renderer/adaptiveCubicFlattener.tsx`):
```typescript
function flattenCubicAdaptive(a, b, tolSq, outPts, depth = 0, minSegLenSq = 0, stats = null) {
  if (wasmEngine.isReady) {
    const res = wasmEngine.flattenCubic(
      a.x, a.y,
      a.handleOut ? a.handleOut.x : a.x, a.handleOut ? a.handleOut.y : a.y,
      b.handleIn ? b.handleIn.x : b.x, b.handleIn ? b.handleIn.y : b.y,
      b.x, b.y,
      tolSq, maxDepth, minSegLenSq, segVertexLimit
    );
    if (res && res.length) {
      for (let i = 0; i < res.length; i++) outPts.push(res[i]);
      if (stats) {
        const added = res.length >> 1;
        stats.vertexCount += added;
        stats.segmentCount += added;
      }
      return;
    }
  }
  // Fallback JS rekursif bawaan tetap utuh di bawahnya
  flattenCubicAdaptiveJs(a, b, tolSq, outPts, depth, minSegLenSq, stats);
}
```

---

## 6. Verifikasi & Pengujian Kualitas

1. **Characterization Recording:** Menjalankan `rust-anything record` terhadap harness flat-array (`scripts/harness-wasm-engine.ts`) dengan variasi kurva tajam, loop, poligon berlubang, dan collinear vertices.
2. **Differential Verification:** Membandingkan output implementasi Rust dengan `cases.jsonl` menggunakan `rust-anything diff`. Seluruh koordinat output harus cocok dengan batas toleransi floating-point $\le 10^{-7}$.
3. **Automated E2E Testing (Mandatory Playwright Regular):** Menjalankan suite pengujian `@playwright/test` di Geovanta untuk memastikan rendering visual, zooming, seleksi objek, dan pen tool tetap berjalan mulus tanpa artefak visual.
4. **Benchmark Peningkatan Kinerja:** Mengukur durasi eksekusi flattening 10.000 kurva Bézier kubik dan triangulasi 1.000 poligon antara TS dan Rust WASM menggunakan `rust-anything bench`.

---

## 7. Hal yang Diserahkan kepada Implementer (Builder's Scope)

1. Format kemasan `.wasm` di pipeline `esbuild` (inline base64 vs static asset fetch).
2. Optimasi prealokasi kapasitas memori internal Rust (`Vec::with_capacity`).
3. Pembuatan skrip pembantu build `scripts/build-wasm.js` untuk mengotomasi kompilasi crate Rust ke folder webview.
