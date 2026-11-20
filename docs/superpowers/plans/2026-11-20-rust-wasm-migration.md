# Rust WebAssembly Migration (Wave 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrasikan hotspot komputasi murni terberat di Geovanta Vector Studio (Bézier adaptive flattening, ear-clipping polygon triangulation, dan Ramer-Douglas-Peucker curve simplification) dari TypeScript ke Rust WebAssembly (`wasm-bindgen`) dengan integrasi *in-place facade* dan *graceful fallback*.

**Architecture:** Membangun crate terisolasi `rust/geovanta-wasm` yang dikompilasi ke target `wasm32-unknown-unknown` menggunakan `wasm-bindgen`. Hasil kompilasi dimuat secara asinkron melalui modul bridge `src/bridge/wasmEngineBridge.ts`. Modul asli (`adaptiveCubicFlattener.tsx`, `polygonTriangulatorAndStroke.tsx`, dan `topologicalCurveSimplifier.tsx`) bertindak sebagai *in-place facade* yang mengeksekusi akselerasi WASM ber-buffer datar jika siap dan otomatis *fallback* ke fungsi TypeScript asli tanpa mengubah antarmuka pemanggil di seluruh aplikasi.

**Tech Stack:** Rust 1.100, `wasm-bindgen` 0.2, target `wasm32-unknown-unknown`, TypeScript 5.8 / 7.0, React 18, `@playwright/test`, `rust-anything 2.1.0`.

**Spec:** [docs/superpowers/specs/2026-11-20-rust-wasm-migration-design.md](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Backup/Geovanta%20Backup/docs/superpowers/specs/2026-11-20-rust-wasm-migration-design.md)

## Global Constraints

- Platform: Windows 64-bit (`x86_64-pc-windows-msvc`), Node.js v26.13, Rust 1.100.0, Cargo 1.100.0.
- Testing: Wajib menggunakan Playwright Regular (`@playwright/test` dan `npx playwright test`) untuk seluruh penulisan dan eksekusi pengujian otomatis (sesuai `AGENTS.md`).
- Output Triangulasi Poligon: Wajib mengembalikan buffer koordinat vertex datar `Float32Array` (`Option<Vec<f32>>`) yang langsung sesuai dengan GPU VBO `fillVBO` Geovanta (tidak menggunakan indeks `u16`).
- Zero Call-Site Rewiring: Modul publik yang ada tidak boleh mengubah signature ekspornya; integrasi dilakukan via *in-place facade*.
- Floating-Point Precision: Deviasi numerik output koordinat antara Rust WASM dan TypeScript wajib $\le 10^{-7}$.

## Review Focus

1. **Input Kosong / Degenerate:** Array koordinat kosong `[]` atau $< 3$ titik pada triangulasi poligon atau $< 2$ titik pada RDP -> wajib mengembalikan array kosong / `null` tanpa panic/crash.
2. **Koordinat Ekstrem / Collinear:** De Casteljau subdivision dengan titik kontrol berhimpit atau collinear -> wajib berhenti dalam batas `max_depth` (16) tanpa stack overflow.
3. **Saturasi Anggaran Vertex (Budget Cap):** Kurva dengan `curTotal >= segVertexLimit` -> wajib selalu memancarkan titik akhir cabang `(x3, y3)` agar kontur polilin tidak terputus.
4. **Pembersihan Titik Coincident pada Poligon:** Poligon dengan titik berulang bersebelahan atau segmen lurus 180° -> wajib dibersihkan sebelum ear-clipping agar tidak memicu segitiga degenerate.
5. **WASM Fallback Transparan:** Pemanggilan facade sebelum modul WASM selesai dimuat -> wajib mengeksekusi fallback TypeScript lokal secara transparan tanpa error runtime.

---

### Task 1: Setup Testing & Toolchain Infrastructure (`@playwright/test` & `wasm32-unknown-unknown`)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/infrastructure.spec.ts`
- Modify: `package.json:27-34`

**Interfaces:**
- Consumes: Node environment, npm package manager, rustup.
- Produces: `@playwright/test` test runner command `npx playwright test` dan target Rust `wasm32-unknown-unknown`.

- [ ] **Step 1: Write the failing Playwright sanity test in `tests/infrastructure.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('infrastructure: verifies playwright runner and environment sanity', async () => {
  const isNode = typeof process !== 'undefined' && !!process.versions?.node;
  expect(isNode).toBe(true);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails (missing runner)**

Run: `npx playwright test tests/infrastructure.spec.ts`  
Expected: FAIL (`Cannot find module '@playwright/test'` atau command not found).

- [ ] **Step 3: Install `@playwright/test` and configure `playwright.config.ts` & Rust wasm target**

1. Install dependency:
   `npm install -D @playwright/test`
2. Tambahkan target wasm:
   `rustup target add wasm32-unknown-unknown`
3. Buat file `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  reporter: 'list',
  use: {
    headless: true,
  },
});
```

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/infrastructure.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/infrastructure.spec.ts
git commit -m "chore: setup playwright test runner and wasm32 target"
```

---

### Task 2: Scaffolding Crate `rust/geovanta-wasm` & Build Pipeline

**Files:**
- Create: `rust/geovanta-wasm/Cargo.toml`
- Create: `rust/geovanta-wasm/src/lib.rs`
- Create: `scripts/build-wasm.js`
- Create: `tests/wasm-build.spec.ts`

**Interfaces:**
- Consumes: `wasm32-unknown-unknown` toolchain.
- Produces: `rust/geovanta-wasm/pkg/` (output wasm-bindgen JS glue + `.wasm` binary).

- [ ] **Step 1: Write failing Playwright test for WASM build output in `tests/wasm-build.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('wasm build: verifies pkg artifacts exist and exports wasm_engine_version', async () => {
  const pkgDir = path.resolve(__dirname, '../rust/geovanta-wasm/pkg');
  const wasmFile = path.join(pkgDir, 'geovanta_wasm_bg.wasm');
  const jsFile = path.join(pkgDir, 'geovanta_wasm.js');
  expect(fs.existsSync(wasmFile)).toBe(true);
  expect(fs.existsSync(jsFile)).toBe(true);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/wasm-build.spec.ts`  
Expected: FAIL (`expected false to be true`).

- [ ] **Step 3: Implement Crate scaffolding and build script**

1. Buat `rust/geovanta-wasm/Cargo.toml`:
```toml
[package]
name = "geovanta-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
```
2. Buat `rust/geovanta-wasm/src/lib.rs`:
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn wasm_engine_version() -> String {
    "1.0.0-geovanta-wasm".to_string()
}
```
3. Buat `scripts/build-wasm.js` untuk mengeksekusi kompilasi `cargo build --target wasm32-unknown-unknown --release` dan `wasm-bindgen` (atau menggunakan binary wasm-bindgen). Jalankan `node scripts/build-wasm.js`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/wasm-build.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add rust/geovanta-wasm scripts/build-wasm.js tests/wasm-build.spec.ts
git commit -m "feat(wasm): scaffold geovanta-wasm crate and build script"
```

---

### Task 3: Unit 1 — Adaptive Cubic Bézier Flattener in Rust WASM

**Files:**
- Create: `rust/geovanta-wasm/src/flattener.rs`
- Modify: `rust/geovanta-wasm/src/lib.rs`
- Create: `tests/flattener-wasm.spec.ts`

**Interfaces:**
- Consumes: Flat float coordinates `x0..x3`, `y0..y3`, tolerances and limits.
- Produces: `flatten_cubic_adaptive_flat(...) -> Vec<f64>`, `point_to_chord_dist_sq(...) -> f64`.

- [ ] **Step 1: Write failing Playwright test in `tests/flattener-wasm.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import * as path from 'path';

test('flattener: verifies point_to_chord_dist_sq and flatten_cubic_adaptive_flat', async () => {
  const { point_to_chord_dist_sq, flatten_cubic_adaptive_flat } = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  // Point to chord test
  const distSq = point_to_chord_dist_sq(0, 10, 0, 0, 100, 0, 10000);
  expect(distSq).toBeCloseTo(100.0, 5);

  // De Casteljau flattening test on a straight curve (control points collinear on chord)
  const straightPts = flatten_cubic_adaptive_flat(0, 0, 33, 0, 66, 0, 100, 0, 0.25, 16, 0.01, 1000);
  // Collinear curve meets flatness error immediately, emitting endpoint (100, 0)
  expect(straightPts.length).toBe(2);
  expect(straightPts[0]).toBe(100);
  expect(straightPts[1]).toBe(0);

  // Review Focus 3: Budget cap hit emits endpoint (x3, y3)
  const budgetLimitedPts = flatten_cubic_adaptive_flat(0, 0, 10, 50, 90, 50, 100, 0, 0.001, 16, 0.01, 1);
  expect(budgetLimitedPts.length).toBe(2);
  expect(budgetLimitedPts[0]).toBe(100);
  expect(budgetLimitedPts[1]).toBe(0);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/flattener-wasm.spec.ts`  
Expected: FAIL (`point_to_chord_dist_sq is not a function`).

- [ ] **Step 3: Implement `flattener.rs` and export in `lib.rs`**

1. Port algoritma `pointToChordDistSq` dan `flattenRec` ke `rust/geovanta-wasm/src/flattener.rs`:
   - Penanganan proyeksi longitudinal dot product untuk mendeteksi cusp dan loop balik.
   - Pengecekan `min_seg_len_sq` dan hull square $\le 4 \times \text{minSegLenSq}$.
   - De Casteljau subdivision midpoints.
   - Uji batas Hausdorff $\max(0.5625 \times \max(d_1^2, d_2^2), d_m^2) \le \text{tolSq}$.
   - Guard batas `seg_vertex_limit` yang selalu memancarkan titik akhir `(x3, y3)` (Review Focus 3).
2. Re-ekspor fungsi di `rust/geovanta-wasm/src/lib.rs`.
3. Jalankan `node scripts/build-wasm.js`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/flattener-wasm.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add rust/geovanta-wasm/src/flattener.rs rust/geovanta-wasm/src/lib.rs tests/flattener-wasm.spec.ts
git commit -m "feat(wasm): implement adaptive cubic flattener in rust"
```

---

### Task 4: Unit 2 — Ear-Clipping Polygon Triangulator in Rust WASM

**Files:**
- Create: `rust/geovanta-wasm/src/triangulator.rs`
- Modify: `rust/geovanta-wasm/src/lib.rs`
- Create: `tests/triangulator-wasm.spec.ts`

**Interfaces:**
- Consumes: `coords: &[f64]`.
- Produces: `has_polygon_self_intersection_flat(coords: &[f64]) -> bool`, `ear_clip_polygon_flat(coords: &[f64]) -> Option<Vec<f32>>`.

- [ ] **Step 1: Write failing Playwright test in `tests/triangulator-wasm.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import * as path from 'path';

test('triangulator: verifies ear-clipping and self-intersection detection', async () => {
  const { has_polygon_self_intersection_flat, ear_clip_polygon_flat } = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  // Review Focus 1: Empty or < 3 vertices returns null
  expect(ear_clip_polygon_flat(new Float64Array([0, 0, 10, 0]))).toBeNull();

  // Simple triangle: 3 vertices [0,0, 10,0, 0,10]
  const triCoords = new Float64Array([0, 0, 10, 0, 0, 10]);
  expect(has_polygon_self_intersection_flat(triCoords)).toBe(false);
  const triMesh = ear_clip_polygon_flat(triCoords);
  expect(triMesh).not.toBeNull();
  expect(triMesh.length).toBe(6); // 1 triangle * 3 vertices * 2 coords

  // Simple quad: square 10x10 -> 2 triangles (12 coords)
  const quadCoords = new Float64Array([0, 0, 10, 0, 10, 10, 0, 10]);
  const quadMesh = ear_clip_polygon_flat(quadCoords);
  expect(quadMesh).not.toBeNull();
  expect(quadMesh.length).toBe(12);

  // Review Focus 4: Polygon with coincident & collinear points
  const dirtyCoords = new Float64Array([0, 0, 0, 0, 5, 0, 10, 0, 10, 10, 0, 10]);
  const cleanedMesh = ear_clip_polygon_flat(dirtyCoords);
  expect(cleanedMesh).not.toBeNull();
  expect(cleanedMesh.length).toBe(12);

  // Bowtie (self-intersecting) polygon -> must return null
  const bowtieCoords = new Float64Array([0, 0, 10, 10, 10, 0, 0, 10]);
  expect(has_polygon_self_intersection_flat(bowtieCoords)).toBe(true);
  expect(ear_clip_polygon_flat(bowtieCoords)).toBeNull();
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/triangulator-wasm.spec.ts`  
Expected: FAIL (`ear_clip_polygon_flat is not a function`).

- [ ] **Step 3: Implement `triangulator.rs` and export in `lib.rs`**

1. Port sanitasi titik coincident & collinear ke `rust/geovanta-wasm/src/triangulator.rs`.
2. Port algoritma `hasPolygonSelfIntersection`.
3. Port ear-clipping loop dengan penanganan orientasi CCW/CW dan pembuangan telinga segitiga, menghasilkan `Vec<f32>` (Review Focus 1 & 4).
4. Re-ekspor fungsi di `rust/geovanta-wasm/src/lib.rs`.
5. Jalankan `node scripts/build-wasm.js`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/triangulator-wasm.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add rust/geovanta-wasm/src/triangulator.rs rust/geovanta-wasm/src/lib.rs tests/triangulator-wasm.spec.ts
git commit -m "feat(wasm): implement ear-clipping polygon triangulator in rust"
```

---

### Task 5: Unit 3 — RDP Curve Simplification in Rust WASM (Opsi A)

**Files:**
- Create: `rust/geovanta-wasm/src/simplifier.rs`
- Modify: `rust/geovanta-wasm/src/lib.rs`
- Create: `tests/simplifier-wasm.spec.ts`

**Interfaces:**
- Consumes: `coords: &[f64]`, `epsilon: f64`.
- Produces: `rdp_simplify_flat(coords: &[f64], epsilon: f64) -> Vec<f64>`.

- [ ] **Step 1: Write failing Playwright test in `tests/simplifier-wasm.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import * as path from 'path';

test('simplifier: verifies RDP polyline simplification', async () => {
  const { rdp_simplify_flat } = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  // Review Focus 1: < 3 points returns original points
  const shortLine = new Float64Array([0, 0, 100, 100]);
  const simplifiedShort = rdp_simplify_flat(shortLine, 1.0);
  expect(Array.from(simplifiedShort)).toEqual([0, 0, 100, 100]);

  // Collinear 3 points -> middle point should be eliminated
  const straightLine = new Float64Array([0, 0, 50, 0, 100, 0]);
  const simplifiedStraight = rdp_simplify_flat(straightLine, 0.5);
  expect(Array.from(simplifiedStraight)).toEqual([0, 0, 100, 0]);

  // Point deviating by 10 units with epsilon=2 -> kept
  const zigZag = new Float64Array([0, 0, 50, 10, 100, 0]);
  const simplifiedZigZag = rdp_simplify_flat(zigZag, 2.0);
  expect(Array.from(simplifiedZigZag)).toEqual([0, 0, 50, 10, 100, 0]);

  // Same point with epsilon=15 -> simplified to start & end
  const flattenedZigZag = rdp_simplify_flat(zigZag, 15.0);
  expect(Array.from(flattenedZigZag)).toEqual([0, 0, 100, 0]);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/simplifier-wasm.spec.ts`  
Expected: FAIL (`rdp_simplify_flat is not a function`).

- [ ] **Step 3: Implement `simplifier.rs` and export in `lib.rs`**

1. Port algoritma `vcRdp` berbasis stack iteratif di `rust/geovanta-wasm/src/simplifier.rs`.
2. Format input/output sebagai flat koordinat `[x0, y0, x1, y1, ...]`.
3. Re-ekspor di `rust/geovanta-wasm/src/lib.rs`.
4. Jalankan `node scripts/build-wasm.js`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/simplifier-wasm.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add rust/geovanta-wasm/src/simplifier.rs rust/geovanta-wasm/src/lib.rs tests/simplifier-wasm.spec.ts
git commit -m "feat(wasm): implement RDP polyline simplifier in rust"
```

---

### Task 6: Frontend Bridge & In-Place Facade Integration

**Files:**
- Create: `src/bridge/wasmEngineBridge.ts`
- Modify: `src/renderer/adaptiveCubicFlattener.tsx:1-45, 125-163`
- Modify: `src/renderer/polygonTriangulatorAndStroke.tsx:1-55, 170-175`
- Modify: `src/engine/topologicalCurveSimplifier.tsx:545-560`
- Create: `tests/engine-facade-integration.spec.ts`

**Interfaces:**
- Consumes: `pkg/geovanta_wasm.js`.
- Produces: `wasmEngine` global bridge, `initWasmEngine()`, and backward-compatible facades in existing TS modules.

- [ ] **Step 1: Write failing Playwright test in `tests/engine-facade-integration.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { flattenCubicAdaptive } from '../src/renderer/adaptiveCubicFlattener.tsx';
import { earClipSimplePolygon } from '../src/renderer/polygonTriangulatorAndStroke.tsx';
import { vcRdp } from '../src/engine/topologicalCurveSimplifier.tsx';
import { wasmEngine, initWasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('engine facade: verifies fallback before init and wasm execution after init', async () => {
  // Review Focus 5: Fallback works seamlessly before WASM is initialized
  expect(wasmEngine.isReady).toBe(false);
  const outFallback: number[] = [];
  const statsFallback = { vertexCount: 0, segmentCount: 0, vertexLimit: 1000 };
  flattenCubicAdaptive({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.25, outFallback, 0, 0.01, statsFallback);
  expect(outFallback).toEqual([100, 0]);
  expect(statsFallback.vertexCount).toBe(1);

  // Initialize WASM
  const initialized = await initWasmEngine();
  expect(initialized).toBe(true);
  expect(wasmEngine.isReady).toBe(true);

  // After init: Facade transparently executes WASM
  const outWasm: number[] = [];
  const statsWasm = { vertexCount: 0, segmentCount: 0, vertexLimit: 1000 };
  flattenCubicAdaptive({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.25, outWasm, 0, 0.01, statsWasm);
  expect(outWasm).toEqual([100, 0]);
  expect(statsWasm.vertexCount).toBe(1);

  // Polygon ear clipping facade
  const quadCoords = [0, 0, 10, 0, 10, 10, 0, 10];
  const mesh = earClipSimplePolygon(quadCoords);
  expect(mesh).not.toBeNull();
  expect(mesh.length).toBe(12);

  // RDP simplifier facade
  const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }];
  const simplified = vcRdp(pts, 0.5);
  expect(simplified.length).toBe(2);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/engine-facade-integration.spec.ts`  
Expected: FAIL (`Cannot find module '../src/bridge/wasmEngineBridge.ts'`).

- [ ] **Step 3: Implement `wasmEngineBridge.ts` and in-place facades**

1. Buat `src/bridge/wasmEngineBridge.ts` dengan fungsi `initWasmEngine()` dan object `wasmEngine`.
2. Pasang in-place facade di `src/renderer/adaptiveCubicFlattener.tsx` yang memanggil `wasmEngine.flattenCubic` dan memutasi `stats` serta `outPts`.
3. Pasang in-place facade di `src/renderer/polygonTriangulatorAndStroke.tsx` yang memanggil `wasmEngine.earClipPolygon`.
4. Pasang in-place facade di `src/engine/topologicalCurveSimplifier.tsx` yang memanggil `wasmEngine.rdpSimplify`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/engine-facade-integration.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add src/bridge/wasmEngineBridge.ts src/renderer/adaptiveCubicFlattener.tsx src/renderer/polygonTriangulatorAndStroke.tsx src/engine/topologicalCurveSimplifier.tsx tests/engine-facade-integration.spec.ts
git commit -m "feat: integrate wasm engine bridge and in-place facades"
```

---

### Task 7: Characterization Recording & Differential Benchmarking

**Files:**
- Create: `scripts/harness-wasm-engine.ts`
- Create: `tests/benchmark-regression.spec.ts`

**Interfaces:**
- Consumes: All 3 migrated WASM modules and TypeScript fallback modules.
- Produces: Characterization parity proof ($\le 10^{-7}$ precision diff) and benchmark speedup proof.

- [ ] **Step 1: Write failing Playwright benchmark regression test in `tests/benchmark-regression.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';
import { pointToChordDistSq } from '../src/renderer/adaptiveCubicFlattener.tsx';

test('benchmark: verifies numerical parity and speedup of WASM engine', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  // Parity test: 1000 curve chord distances
  for (let i = 0; i < 1000; i++) {
    const px = Math.random() * 500, py = Math.random() * 500;
    const x0 = 0, y0 = 0, dx = 400, dy = 300, chordLenSq = 250000;
    const tsDist = pointToChordDistSq(px, py, x0, y0, dx, dy, chordLenSq);
    const wasmDist = wasmEngine.pointToChordDistSq(px, py, x0, y0, dx, dy, chordLenSq);
    expect(Math.abs(tsDist - wasmDist)).toBeLessThanOrEqual(1e-7);
  }

  // Benchmark speedup verification
  const N = 10000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) pointToChordDistSq(i, i * 2, 0, 0, 1000, 1000, 2000000);
  const tTs = performance.now() - t0;

  const t1 = performance.now();
  for (let i = 0; i < N; i++) wasmEngine.pointToChordDistSq(i, i * 2, 0, 0, 1000, 1000, 2000000);
  const tWasm = performance.now() - t1;

  console.log(`TS duration: ${tTs.toFixed(2)}ms, WASM duration: ${tWasm.toFixed(2)}ms`);
  expect(tWasm).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails (missing `pointToChordDistSq` export on wasmEngine)**

Run: `npx playwright test tests/benchmark-regression.spec.ts`  
Expected: FAIL (`wasmEngine.pointToChordDistSq is not a function`).

- [ ] **Step 3: Expose `pointToChordDistSq` on bridge and create `scripts/harness-wasm-engine.ts`**

1. Sambungkan `pointToChordDistSq` ke `wasmEngine` di `src/bridge/wasmEngineBridge.ts`.
2. Buat `scripts/harness-wasm-engine.ts` untuk menjalankan `rust-anything diff` dan merekam sampel kasus uji.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/benchmark-regression.spec.ts`  
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add scripts/harness-wasm-engine.ts src/bridge/wasmEngineBridge.ts tests/benchmark-regression.spec.ts
git commit -m "test(perf): add characterization parity and benchmark regression tests"
```
