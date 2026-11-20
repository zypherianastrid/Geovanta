# Spec Desain: Migrasi Matematika Viewport, Zoom, & Scrolling ke Rust WebAssembly (wasm-bindgen)

Tanggal: 2026-11-21  
Status: Draft -> In Review (Builder Checked)  
Penulis: Antigravity Assistant & Superpowers Team  

---

## 1. Intent & The Why

Di dalam Geovanta Vector Studio, navigasi kanvas (zooming dengan wheel/trackpad pinch, panning, fit-to-screen, serta proyeksi koordinat layar-ke-dunia) dieksekusi dengan frekuensi tinggi saat interaksi mouse dan gesture trackpad (60–120 FPS).

Meskipun manipulasi DOM dan binding event harus tetap berada di JavaScript thread (karena berinteraksi langsung dengan elemen browser dan React ref), seluruh kalkulasi geometris transformasi viewport:
1. **Zoom at anchor point:** Menghitung skala baru dan kompensasi offset pan agar koordinat di bawah kursor tidak bergeser.
2. **Exponential wheel/trackpad scaling:** Perhitungan factor eksponensial kontinu dengan peredaman delta (`Math.exp(-delta * k)`).
3. **Fit-to-bounds (`fitTo`):** Menghitung skala pas-layar dengan batas inset padding adaptif.
4. **Pemetaan Slider Logaritmik (`vzToSl` & `vslToZ`):** Pemetaan non-linear antara zoom $0.0005\times - 5000\times$ dengan slider $0 - 1000$.
5. **Proyeksi Koordinat & Frustum Culling:** Transformasi dua arah Screen-to-World / World-to-Screen serta kalkulasi *Visible Viewport Bounds* untuk culling objek di luar layar.

memerlukan eksekusi deterministik dengan float64 presisi tinggi tanpa alokasi memori objek berulang per-frame yang dapat memicu *garbage collection*.

Dengan memindahkan modul matematika viewport ini ke **Rust WebAssembly (`wasm-bindgen`)** di dalam crate `rust/geovanta-wasm` (`src/viewport.rs`), kita memperoleh komputasi instan berpresisi tinggi dengan paritas numerik $\le 10^{-7}$, memory safety, dan arsitektur yang terpusat rapi.

---

## 2. Goals, Non-Goals, & Anti-Goals

### 2.1 Goals
1. **Memperluas Crate `rust/geovanta-wasm`:** Menambahkan modul `src/viewport.rs` yang mengompilasi logika matematika viewport ke WASM.
2. **Kalkulasi Inti yang Dimigrasikan (Flat Array Return / Zero-Leak FFI):**
   - `compute_zoom_at_anchor(current_zoom, current_pan_x, current_pan_y, target_zoom, cx, cy, box_w, box_h, box_left, box_top, use_center) -> Vec<f64>` mengembalikan `[new_zoom, new_pan_x, new_pan_y]`.
   - `compute_wheel_zoom_factor(delta_y, delta_mode, client_height, is_ctrl_pinch) -> f64`.
   - `compute_fit_to(bx, by, bw, bh, client_w, client_h, pad) -> Vec<f64>` mengembalikan `[scale, pan_x, pan_y, success (1.0 atau 0.0)]`.
   - `screen_to_world(canvas_x, canvas_y, zoom, pan_x, pan_y) -> Vec<f64>` mengembalikan `[wx, wy]`.
   - `world_to_screen(wx, wy, zoom, pan_x, pan_y) -> Vec<f64>` mengembalikan `[canvas_x, canvas_y]`.
   - `compute_visible_world_bounds(zoom, pan_x, pan_y, client_w, client_h) -> Vec<f64>` mengembalikan `[left, top, right, bottom]`.
   - `zoom_to_slider(zoom) -> f64` dan `slider_to_zoom(slider_val) -> f64`.
3. **Integrasi In-Place Facade di Frontend (Zero Blast Radius):**
   - Memperbarui `src/components/editor/hooks/useCanvasWheelZoom.tsx` untuk memanfaatkan fungsi WASM viewport jika `wasmEngine.isReady`.
   - Memperbarui `src/utils/zoomAndFormatHelpers.tsx` (`vzToSl`, `vslToZ`) dengan delegasi WASM dan fallback otomatis.
   - Tidak mengubah call sites di `VectorEditor.tsx` (10.000 baris) demi menjaga stabilitas menyeluruh.
4. **Verifikasi Paritas Ketat dengan Playwright:**
   - Pengujian unit Playwright Regular (`@playwright/test`) memverifikasi paritas numerik $\le 10^{-7}$ terhadap implementasi TypeScript asli pada seluruh rentang zoom ($0.0005\times - 5000\times$).

### 2.2 Non-Goals
1. Memindahkan event listener DOM (`addEventListener('wheel')`, pointerdown, keydown) atau manipulasi style atribut DOM (`matrix(z 0 0 z px py)`) ke Rust.
2. Memindahkan React hook state (`zoomRef`, `panRef`, `useState`) ke Rust.
3. Merombak `VectorEditor.tsx` atau `sceneRenderer.tsx`.

### 2.3 Anti-Goals
1. **Memory Leaks / Wrapper Object Thrashing:** Menghindari export struct `#[wasm_bindgen]` yang membutuhkan manual `.free()`. Seluruh multi-value return menggunakan flat `Vec<f64>` yang langsung diproyeksikan ke typed array di JS.
2. **Regresi Sensitivitas Zoom:** Tidak boleh ada perubahan sensasi akselerasi zoom trackpad atau wheel mouse bagi pengguna akhir.

---

## 3. Batasan Teknis & Konstanta Matematika

Sesuai `src/constants/themeAndPrefsConstants.tsx`:
- `VZMIN = 0.0005` ($0.05\%$)
- `VZMAX = 5000.0` ($500,000\%$)
- `VZ_LOG_SPAN = ln(VZMAX / VZMIN) = ln(10,000,000) \approx 16.11809565095832`
- Wheel Delta Clamping: `[-120.0, 120.0]`
- Exponential Factor:
  - Trackpad / Pinch (`e.ctrlKey = true`): $\exp(-\text{clampedDelta} \times 0.0035)$
  - Standard Wheel (`e.ctrlKey = false`): $\exp(-\text{clampedDelta} \times 0.0015)$
- Clamping Slider: $[0.0, 1000.0]$
- Slider Quantization: `(Math.round(ln(z / VZMIN) / VZ_LOG_SPAN * 10000.0) / 10.0)`

---

## 4. Arsitektur Antarmuka Rust (`wasm-bindgen`)

```rust
// rust/geovanta-wasm/src/viewport.rs

#[wasm_bindgen]
pub fn compute_zoom_at_anchor(
    current_zoom: f64,
    current_pan_x: f64,
    current_pan_y: f64,
    target_zoom: f64,
    cx: f64,
    cy: f64,
    box_w: f64,
    box_h: f64,
    box_left: f64,
    box_top: f64,
    use_center: bool,
) -> Vec<f64>; // [new_zoom, new_pan_x, new_pan_y]

#[wasm_bindgen]
pub fn compute_wheel_zoom_factor(
    delta_y: f64,
    delta_mode: u32,
    client_height: f64,
    is_ctrl_pinch: bool,
) -> f64;

#[wasm_bindgen]
pub fn compute_fit_to(
    bx: f64, by: f64, bw: f64, bh: f64,
    client_w: f64, client_h: f64,
    padding: f64,
) -> Vec<f64>; // [scale, pan_x, pan_y, success (1.0 or 0.0)]

#[wasm_bindgen]
pub fn screen_to_world(canvas_x: f64, canvas_y: f64, zoom: f64, pan_x: f64, pan_y: f64) -> Vec<f64>; // [wx, wy]

#[wasm_bindgen]
pub fn world_to_screen(wx: f64, wy: f64, zoom: f64, pan_x: f64, pan_y: f64) -> Vec<f64>; // [canvas_x, canvas_y]

#[wasm_bindgen]
pub fn compute_visible_world_bounds(zoom: f64, pan_x: f64, pan_y: f64, client_w: f64, client_h: f64) -> Vec<f64>; // [left, top, right, bottom]

#[wasm_bindgen]
pub fn zoom_to_slider(zoom: f64) -> f64;

#[wasm_bindgen]
pub fn slider_to_zoom(slider_val: f64) -> f64;
```

---

## 5. Integrasi Frontend Bridge (`src/bridge/wasmEngineBridge.ts`)

```typescript
export interface WasmEngine {
  isReady: boolean;
  // ... Wave 1 methods
  computeZoomAtAnchor?: (
    currentZoom: number,
    currentPanX: number,
    currentPanY: number,
    targetZoom: number,
    cx: number,
    cy: number,
    boxW: number,
    boxH: number,
    boxLeft: number,
    boxTop: number,
    useCenter: boolean
  ) => [number, number, number];
  computeWheelZoomFactor?: (deltaY: number, deltaMode: number, clientHeight: number, isCtrlPinch: boolean) => number;
  computeFitTo?: (bx: number, by: number, bw: number, bh: number, clientW: number, clientH: number, pad: number) => [number, number, number, boolean];
  screenToWorld?: (canvasX: number, canvasY: number, zoom: number, panX: number, panY: number) => [number, number];
  worldToScreen?: (wx: number, wy: number, zoom: number, panX: number, panY: number) => [number, number];
  computeVisibleBounds?: (zoom: number, panX: number, panY: number, clientW: number, clientH: number) => [number, number, number, number];
  zoomToSlider?: (zoom: number) => number;
  sliderToZoom?: (sliderVal: number) => number;
}
```

---

## 6. Verifikasi & Pengujian Kualitas (Playwright Regular)

1. **Unit Test Paritas Matematika (`tests/viewport-wasm.spec.ts`):**
   - Menguji pemetaan slider logaritmik bolak-balik: `sliderToZoom(zoomToSlider(z)) \approx z` dengan toleransi diskritisasi $\le 0.2\%$.
   - Menguji zoom anchor titik kursor: titik $(wx, wy)$ sebelum dan sesudah zoom harus tepat sama.
   - Menguji fit-to-bounds pada dokumen berbagai aspek rasio (persegi, memanjang horizontal, memanjang vertikal).
   - Menguji proyeksi koordinat Screen-to-World dan World-to-Screen bolak-balik.
2. **Integration Test Hook (`tests/viewport-hook-integration.spec.ts`):**
   - Menguji integrasi fungsi hook `useCanvasWheelZoom` dan utilitas `zoomAndFormatHelpers.tsx` menggunakan Playwright.
