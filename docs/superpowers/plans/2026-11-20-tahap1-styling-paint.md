# Tahap 1 — Styling & Paint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan 5 fitur Styling & Paint Tahap 1 di Geovanta Vector Studio — Kontrol UI Stroke Lengkap, Dashed & Dotted Stroke, Stroke Alignment (Inside/Center/Outside + ekspor SVG ekspansi geometri), Stroke Gradient (panel + gizmo kanvas), dan Blend Modes (`mix-blend-mode` 16 mode) — secara penuh di data model, engine, CanvasKit renderer, SVG I/O, dan UI inspektor.

**Architecture:** Dua modul pure-engine baru (`strokeStyles.tsx` dan `blendModes.tsx`) menampung seluruh normalisasi, preset dash, kalkulasi extent stroke, dan pemetaan CanvasKit `BlendMode`. `gradientEngine.tsx`, `colorClipboard.tsx`, `GradientEditorPanel.tsx`, dan `GradientCanvasGizmo.tsx` digeneralisasi dengan parameter `slot: 'fill' | 'stroke'` untuk menghindari duplikasi kode; `pathOffset.tsx` + `pathBoolean.tsx` menyediakan ekspansi geometri stroke `inside`/`outside` (jalur cepat 1-ring + boolean `clipRings` untuk bentuk berlubang/majemuk); `canvasKitScene.tsx` merender dash via `PathEffect.MakeDash` (cached LRU), stroke alignment via `ClipOp.Intersect`/`Difference` (`2× strokeWidth`), dan blend mode via `saveLayer` ber-`BlendMode`.

**Tech Stack:** React 18, TypeScript/TSX, CanvasKit WASM (`canvaskit-wasm` 0.40.0), esbuild (`npm run build:web`), Playwright Regular (`@playwright/test`, `npx playwright test`), Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-11-20-tahap1-styling-paint-design.md`

## Global Constraints

- Tanpa dependensi npm baru (100% offline bundle); wajib lolos `npm run typecheck` dan `npm run build:web`.
- Seluruh pengujian otomatis WAJIB memakai Playwright Regular (`@playwright/test`, `npx playwright test <path>`) dan interaksi browser live memakai Playwright MCP (sesuai `AGENTS.md`). Dilarang memakai Jest, Vitest, Mocha, atau `node:test`.
- Tidak boleh ada elemen native HTML `<select>` atau `<input>` baru di UI; seluruh kontrol wajib memakai komponen kustom Geovanta (`Seg`, `Select`, `XfField`, `Range`, `Slider`, `CustomTextBox`, `ColorField`, `ColorText`, `GradChoice`).
- Tidak boleh ada kebocoran memori WASM CanvasKit (`PathEffect` dalam cache LRU berbatas + `dispose()`, `paint.setPathEffect(null)` dan `layerPaint.setBlendMode(SrcOver)` wajib di-reset di `finally`).
- Pertahankan default backward-compatible objek lama (`strokeLinecap: 'round'`, `strokeLinejoin: 'round'`, `strokeMiterlimit: 4`, `paintOrder: 'fill stroke'`, `strokeAlign: 'center'`, `strokeDasharray: null`, `strokeDashoffset: 0`, `blendMode: 'normal'`) dan jaga seluruh `data-testid` Fill yang sudah ada tetap unik.
- Semua hooks React di `EditorRightInspector.tsx` wajib dipanggil tanpa syarat sebelum `return` (aturan `PELINDUNG HOOKS`).
- Semua label dan tooltip baru tersedia dalam Bahasa Indonesia & Inggris (`appI18n.tsx` & `tooltipsCatalog.tsx`).
- Di Windows PowerShell, gunakan pemisah `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };` atau jalankan perintah terpisah (bukan `&&` pada PowerShell 5.1).

## Review Focus

1. **Pola dash invalid/all-zero & dotted visibility:** `parseDasharray("0 0")`, `"-4 2"`, `"abc"` harus mengembalikan `null` tanpa crash; preset `Dotted` wajib menyetel `strokeLinecap: 'round'` agar titik benar-benar tergambar di CanvasKit dan SVG (dipin di Task 1 & Task 5).
2. **Bentuk majemuk/berlubang (donut/ikon) dengan `strokeAlign: 'inside' | 'outside'` + ketebalan > inradius + hit-test tepi luar:** Normal lubang `outside` harus menyusut masuk ke ruang lubang (bukan ke dinding fill), band berimpit tidak boleh saling melubangi (XOR), `inside` saat `w >= inradius` mengisi bentuk penuh tanpa error, dan klik pada stroke `outside` objek tanpa fill (`fill: 'none'`) tetap kena hit-test (dipin di Task 3, Task 4, & Task 5).
3. **Kebocoran state paint CanvasKit (`PathEffect` & `layerPaint.BlendMode`):** Objek solid/normal yang digambar setelah objek ber-dash atau ber-`blendMode: 'multiply'` tidak boleh ikut putus-putus atau ikut ter-blend (dipin di Task 5).
4. **Seleksi murni `text` vs campuran `text` + `path`, serta reset `dashCustomOpen` saat ganti seleksi:** Seleksi murni `text` menyembunyikan seksi `Stroke` dan gizmo stroke; seleksi campuran hanya mengubah objek `path`; berpindah ke objek solid lain me-reset `dashCustomOpen` (dipin di Task 6).
5. **Round-trip SVG `<g data-geovanta-stroke-align>` pada objek `fill: 'none'`, campuran subpath tertutup+terbuka, dan `<g style="mix-blend-mode:multiply">` eksternal:** Objek `fill: 'none'` tetap mempertahankan kurva asli saat impor balik sebagai 1 objek; subpath terbuka terpisah di `data-geovanta-role="stroke-open"` tanpa clip; `<mask id="sa-mask-...">` tidak memicu `unsupported`; `<g style="mix-blend-mode:multiply">` eksternal tidak diwariskan ke anak dan dicatat lewat `noteUnsupported('g', id, 'mix-blend-mode')` (dipin di Task 4).

---

### Task 1: Model Data, Pure Helpers (`strokeStyles.tsx` & `blendModes.tsx`), & Dash Scaling Transform

**Files:**
- Create: `src/engine/strokeStyles.tsx`
- Create: `src/engine/blendModes.tsx`
- Modify: `src/types/vectorTypes.ts:67-96`
- Modify: `src/engine/vectorEngine.tsx:1-192`
- Modify: `src/engine/selectionTransformAndAlign.tsx:277-298`
- Modify: `src/engine/affineAndOrientedBox.tsx:200-220`
- Test: `tests/tahap1-stroke-and-blend-engine.spec.ts`

**Interfaces:**
- Consumes: `rd` (`vectorPrimitives.tsx`), `strokeGradOn` (`gradientEngine.tsx`), `scaleObjXY` (`selectionTransformAndAlign.tsx`), `transformObject` (`affineAndOrientedBox.tsx`)
- Produces:
  - `src/types/vectorTypes.ts`: `export type StrokeAlign = 'center' | 'inside' | 'outside'`, `export type BlendModeName = 'normal' | 'darken' | 'multiply' | 'color-burn' | 'lighten' | 'screen' | 'color-dodge' | 'overlay' | 'soft-light' | 'hard-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity'`, plus field opsional pada `VectorObject` (`strokeDasharray`, `strokeDashoffset`, `strokeAlign`, `blendMode`, `strokeGrad`).
  - `src/engine/strokeStyles.tsx`:
    - `hasVisibleStroke(o: any): boolean`
    - `parseDasharray(raw: string | number[] | null | undefined): number[] | null`
    - `formatDasharray(arr: number[] | null | undefined): string`
    - `toSkiaDashIntervals(arr: number[] | null | undefined): number[] | null`
    - `dashPresetValues(preset: 'solid' | 'dashed' | 'dotted' | 'dashdot', strokeWidth: number): { strokeDasharray: number[] | null; strokeDashoffset?: number; strokeLinecap?: 'round' }`
    - `detectDashPreset(arr: number[] | null | undefined, strokeWidth: number): 'solid' | 'dashed' | 'dotted' | 'dashdot' | 'custom'`
    - `effectiveStrokeAlign(o: any): 'center' | 'inside' | 'outside'`
    - `strokeOutwardExtent(o: any): number`
  - `src/engine/blendModes.tsx`:
    - `BLEND_MODE_GROUPS`, `BLEND_MODE_OPTIONS`, `VALID_BLEND_MODES`
    - `normalizeBlendMode(raw: any): BlendModeName`
    - `toCanvasKitBlendMode(kit: any, mode: any): any | null`
  - Semua fungsi utama diekspos juga pada `VE` di `src/engine/vectorEngine.tsx`.

- [ ] **Step 1: Tulis tes Playwright yang gagal di `tests/tahap1-stroke-and-blend-engine.spec.ts`**

Buat tes unit `@playwright/test` yang mengimpor langsung dari `../src/engine/strokeStyles.tsx`, `../src/engine/blendModes.tsx`, `../src/engine/selectionTransformAndAlign.tsx`, dan `../src/engine/affineAndOrientedBox.tsx`:
- `parseDasharray`: `"8 4"` -> `[8, 4]`, `"12, 4, 2, 4"` -> `[12, 4, 2, 4]`, `"none"` / `""` / `"0 0"` / `"-4 2"` / `"abc"` -> `null`; membatasi maksimal 64 elemen.
- `toSkiaDashIntervals`: `[6]` -> `[6, 6]`, `[8, 4, 2]` -> `[8, 4, 2, 8, 4, 2]`, `[0, 6]` -> `[0, 6]`, `null` -> `null`.
- `dashPresetValues` & `detectDashPreset(arr, strokeWidth)`:
  - `'dotted'` pada `sw = 2` -> `{ strokeDasharray: [0, 4], strokeLinecap: 'round' }`.
  - `'dashed'` pada `sw = 2` -> `{ strokeDasharray: [6, 4] }`, terdeteksi `'dashed'` pada `sw = 2` dan `'custom'` pada `sw = 10`.
  - `'dashdot'` pada `sw = 2` -> `{ strokeDasharray: [6, 3, 0, 3], strokeLinecap: 'round' }`.
  - `[8, 4]` pada `sw = 2` -> `'custom'`.
- `effectiveStrokeAlign` & `strokeOutwardExtent`:
  - Path tertutup `outside` (`sw = 10`) -> align `'outside'`, extent `10`; `inside` -> `'inside'`, extent `0`; `center` -> `'center'`, extent `5`.
  - Path terbuka dengan `strokeAlign: 'outside'` -> `effectiveStrokeAlign` = `'center'`, extent `5`.
- `normalizeBlendMode` & `toCanvasKitBlendMode`:
  - Semua 16 mode valid (`normal` + 15 mode) dinormalisasi case-insensitive; nilai tak dikenal (`'bogus'`, `null`) -> `'normal'`.
  - `toCanvasKitBlendMode(mockKit, 'normal')` -> `null`; `'multiply'` -> `mockKit.BlendMode.Multiply`; `'color-dodge'` -> `mockKit.BlendMode.ColorDodge`; `mockKit` tanpa `BlendMode` -> `null`.
- `scaleObjXY` dan `transformObject` dengan `scaleStroke = true`:
  - Menskalakan `strokeDasharray: [8, 4]` & `strokeDashoffset: 2` sebesar `2×` -> `[16, 8]` & `4`; tidak menskalakan bila `scaleStroke = false` atau `o.nonScalingStroke = true`.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan gagal**

Run: `npx playwright test tests/tahap1-stroke-and-blend-engine.spec.ts`
Expected: FAIL karena `src/engine/strokeStyles.tsx` dan `src/engine/blendModes.tsx` belum ada.

- [ ] **Step 3: Implementasikan tipe, `strokeStyles.tsx`, `blendModes.tsx`, ekspor `VE`, dan skala dash transform**

1. Perbarui `src/types/vectorTypes.ts`: tambahkan `StrokeAlign`, `BlendModeName`, dan 5 properti opsional pada `VectorObject`.
2. Buat `src/engine/strokeStyles.tsx` dengan seluruh fungsi kontrak di blok `Produces` (pakai `rd` dari `vectorPrimitives.tsx` dan `strokeGradOn` dari `gradientEngine.tsx`).
3. Buat `src/engine/blendModes.tsx` dengan `BLEND_MODE_GROUPS`, `BLEND_MODE_OPTIONS` (memakai format opsi `[key, label, icon?, meta?]` yang diterima `SelectDropdown.tsx` termasuk separator `{ disabled: true }`), `VALID_BLEND_MODES`, `normalizeBlendMode`, dan `toCanvasKitBlendMode`.
4. Daftarkan ekspor fungsi-fungsi tersebut ke `VE` di `src/engine/vectorEngine.tsx`.
5. Perbarui `scaleObjXY` (`src/engine/selectionTransformAndAlign.tsx:277-298`) dan `transformObject` (`src/engine/affineAndOrientedBox.tsx:200-220`): saat `scaleStroke && !o.nonScalingStroke`, skalakan `o.strokeDasharray` (tiap elemen `rd(v * kScale)`) dan `o.strokeDashoffset` (`rd(o.strokeDashoffset * kScale)`).

- [ ] **Step 4: Jalankan Playwright test & typecheck untuk verifikasi Task 1**

Run: `npx playwright test tests/tahap1-stroke-and-blend-engine.spec.ts`
Expected: PASS (semua tes lulus).

- [ ] **Step 5: Commit Task 1**

Run: `git add src/types/vectorTypes.ts src/engine/strokeStyles.tsx src/engine/blendModes.tsx src/engine/vectorEngine.tsx src/engine/selectionTransformAndAlign.tsx src/engine/affineAndOrientedBox.tsx tests/tahap1-stroke-and-blend-engine.spec.ts; git commit -m "feat(tahap1): add stroke style, blend mode helpers, and dash transform scaling"`

---

### Task 2: Generalisasi Stroke Gradient di Engine, ColorWalk, & ColorClipboard

**Files:**
- Modify: `src/engine/gradientEngine.tsx:60-486`
- Modify: `src/engine/colorWalk.tsx:10-40,165-178`
- Modify: `src/utils/colorClipboard.tsx:525-553`
- Modify: `src/engine/vectorEngine.tsx:13,85-98`
- Test: `tests/tahap1-stroke-gradient-engine.spec.ts`

**Interfaces:**
- Consumes: `strokeGradOn`, `compileGradStops`, `ensureGradModel`, `updateGradStops`, `setGradAngleDeg`
- Produces:
  - `isGradOnSlot(o: any, slot?: 'fill' | 'stroke'): boolean`
  - `getGradForSlot(o: any, slot?: 'fill' | 'stroke'): any | null`
  - `ensureGradModel(o: any, desiredType?: string, slot?: 'fill' | 'stroke'): any`
  - `updateGradStops(o: any, nextRawStops: any[], extraGradProps?: any, slot?: 'fill' | 'stroke'): any`
  - `setGradAngleDeg(o: any, deg: number, slot?: 'fill' | 'stroke'): any`
  - `applyGradientPayloadToObj(obj: any, payload: GradientClipboardPayload, slot?: 'fill' | 'stroke'): any`

- [ ] **Step 1: Tulis tes Playwright yang gagal di `tests/tahap1-stroke-gradient-engine.spec.ts`**

Uji skenario berikut:
- `ensureGradModel(obj, 'linear', 'stroke')` pada objek ber-`stroke: 'none', strokeWidth: 0, fill: '#ff0000'`:
  - Membiarkan `fill` dan `grad` tak berubah (`fill === '#ff0000'`, `grad == null`).
  - Mengisi `strokeGrad.type === 'linear'`, `strokeGrad.base === next.stroke`, `strokeGradOn(next) === true`, dan `strokeWidth === 2`.
  - Melepas `strokeStyleId` jika sebelumnya ada (Ruling L), tanpa menyentuh `fillStyleId`.
- `ensureGradModel(obj, 'radial', 'stroke')` dan `'angular'`: mengganti tipe `strokeGrad` sambil mempertahankan `rawStops`.
- `updateGradStops(obj, nextRaw, { oklab: false }, 'stroke')`: mengompilasi ulang `strokeGrad.stops`, menyinkronkan `strokeGrad.base === next.stroke === nextRaw[0].color`, tanpa memodifikasi `o.grad` atau `o.fill`.
- `setGradAngleDeg(obj, 90, 'stroke')`: memutar sudut `strokeGrad` tanpa mengubah `o.grad`.
- `applyGradientPayloadToObj(obj, payload, 'stroke')`: menempelkan payload gradien ke `strokeGrad`, melepas `strokeStyleId`, menetapkan `strokeWidth >= 2` bila sebelumnya `0`, dan tidak menyentuh `fill`/`grad`.
- `colorWalk.tsx` (`mapDocumentColors`): penggantian warna pada stop `strokeGrad` tetap bekerja identik lewat `updateGradStops(..., 'stroke')`.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan gagal**

Run: `npx playwright test tests/tahap1-stroke-gradient-engine.spec.ts`
Expected: FAIL karena `ensureGradModel` / `updateGradStops` / `setGradAngleDeg` / `applyGradientPayloadToObj` belum mendukung `slot = 'stroke'`.

- [ ] **Step 3: Implementasikan generalisasi slot `'fill' | 'stroke'`**

1. Di `src/engine/gradientEngine.tsx`:
   - Tambah `isGradOnSlot(o, slot = 'fill')` dan `getGradForSlot(o, slot = 'fill')`.
   - Generalisasi `ensureGradModel(o, desiredType = 'linear', slot = 'fill')`, `updateGradStops(o, nextRawStops, extraGradProps = null, slot = 'fill')`, dan `setGradAngleDeg(o, deg, slot = 'fill')`:
     - Untuk `slot === 'stroke'`: pakai properti `strokeGrad` & `stroke`, warna awal fallback `'#111827'` -> `'#6366f1'` jika `stroke` `'none'`, pastikan `strokeWidth: o.strokeWidth > 0 ? o.strokeWidth : 2`, dan hapus `strokeStyleId` bila ada.
     - Untuk `slot === 'fill'` (default): perilaku 100% identik dengan sebelumnya.
2. Di `src/engine/colorWalk.tsx`: hapus helper duplikat lokal `updateStrokeGradStops` dan gunakan `updateGradStops(next, raw, null, 'stroke')`.
3. Di `src/utils/colorClipboard.tsx`: tambah parameter `slot: 'fill' | 'stroke' = 'fill'` pada `applyGradientPayloadToObj(obj, payload, slot = 'fill')`, lepas `strokeStyleId` saat `slot === 'stroke'`, dan pastikan `strokeWidth` minimal `2` jika sebelumnya `<= 0`.
4. Ekspor `isGradOnSlot` & `getGradForSlot` di `src/engine/vectorEngine.tsx`.

- [ ] **Step 4: Jalankan Playwright test untuk verifikasi Task 2**

Run: `npx playwright test tests/tahap1-stroke-gradient-engine.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run: `git add src/engine/gradientEngine.tsx src/engine/colorWalk.tsx src/utils/colorClipboard.tsx src/engine/vectorEngine.tsx tests/tahap1-stroke-gradient-engine.spec.ts; git commit -m "feat(tahap1): generalize gradient engine and clipboard for stroke slot"`

---

### Task 3: Ekspansi Stroke Alignment (`alignedStrokeOutlineSubs`) & Upgrade `outlineStrokeDoc`

**Files:**
- Modify: `src/engine/pathBoolean.tsx:737`
- Modify: `src/engine/pathOffset.tsx:15,427-501`
- Modify: `src/engine/vectorEngine.tsx:27-28,178-180`
- Test: `tests/tahap1-stroke-align-geometry.spec.ts`

**Interfaces:**
- Consumes: `flattenObjToRings`, `clipRings`, `ringsToSubs`, `normalizeRingOrientations`, `ringArea`, `offsetRingSafe`, `strokeOutlineRings`, `effectiveStrokeAlign`, `strokeGradOn`
- Produces:
  - `normalizeRingOrientations` diekspor dari `src/engine/pathBoolean.tsx`
  - `alignedStrokeOutlineSubs(o: any, opts?: { maxRings?: number }): { subs: any[] | null; openSubs: any[]; fallback: boolean }` diekspor dari `src/engine/pathOffset.tsx` dan `VE`
  - `outlineStrokeDoc(doc, selIds)` mendukung `strokeAlign: 'inside' | 'outside'` dan memindahkan `strokeGrad` -> `grad`

- [ ] **Step 1: Tulis tes Playwright yang gagal di `tests/tahap1-stroke-align-geometry.spec.ts`**

Uji seluruh kasus inti + Review Focus #2:
- **Persegi tunggal 100×100 (`[0,0..100,100]`):**
  - `strokeAlign: 'outside'`, `strokeWidth: 10`, `strokeLinejoin: 'miter'`: bbox hasil ekspansi `[-10, -10, 110, 110]`, memiliki 2 subpath (outer 120×120 & inner 100×100), luas efektif `120*120 - 100*100 = 4400` (toleransi ±50).
  - `strokeAlign: 'inside'`, `strokeWidth: 10`: bbox `[0, 0, 100, 100]`, memiliki 2 subpath (outer 100×100 & inner 80×80), luas efektif `100*100 - 80*80 = 3600`.
  - `strokeAlign: 'inside'`, `strokeWidth: 60` (`> inradius = 50`): tidak crash, menghasilkan 1 subpath `[0,0..100,100]` (mengisi utuh bentuk), `fallback === false`.
- **Donut/cincin berlubang (outer `0..100`, lubang `30..70`):**
  - `strokeAlign: 'outside'`, `strokeWidth: 6`: outer membesar ke `[-6..106]`, **lubang menyusut ke dalam ruang lubang `[36..64]`** (bukan melebar ke `[24..76]`!).
  - `strokeAlign: 'inside'`, `strokeWidth: 6`: outer tetap `[0..100]`, batas dalam outer menyusut ke `[6..94]`, lubang melebar ke dinding fill `[24..76]`.
  - `strokeAlign: 'outside'`, `strokeWidth: 25` (lubang `30..70` kolaps sepenuhnya karena `25 >= 20`): tidak crash, ruang lubang terisi penuh oleh stroke tanpa artefak XOR.
- **Dua kontur berdekatan yang band `outside`-nya bertumpang tindih (`[0..40]` dan `[46..86]`, `w = 6`):** `clipRings` menggabungkan band sehingga tidak ada celah/pembatalan XOR di area overlap `[40..46]`.
- **Objek campuran 1 subpath tertutup + 1 subpath terbuka:** `closed` masuk ke `subs`, subpath terbuka dikembalikan di `openSubs` tanpa dibuang.
- **Guard `> 64` ring tertutup:** mengembalikan `{ subs: null, openSubs: [...], fallback: true }`.
- **`outlineStrokeDoc`:** objek ber-`strokeAlign: 'outside'` dan `strokeGrad` dikonversi menjadi objek ber-`grad` (dengan `stroke: 'none'`, `strokeWidth: 0`, `strokeGrad: null`, `strokeAlign: 'center'`, `strokeDasharray: null`).

- [ ] **Step 2: Jalankan Playwright test untuk memastikan gagal**

Run: `npx playwright test tests/tahap1-stroke-align-geometry.spec.ts`
Expected: FAIL karena `alignedStrokeOutlineSubs` dan ekspor `normalizeRingOrientations` belum ada.

- [ ] **Step 3: Implementasikan `alignedStrokeOutlineSubs` & perbarui `outlineStrokeDoc`**

1. Di `src/engine/pathBoolean.tsx`: tambahkan `normalizeRingOrientations` ke daftar `export { ... }`.
2. Di `src/engine/pathOffset.tsx`:
   - Impor `clipRings`, `normalizeRingOrientations`, `isInsideRings` dari `./pathBoolean.tsx` dan `effectiveStrokeAlign`, `hasVisibleStroke` dari `./strokeStyles.tsx` serta `strokeGradOn` dari `./gradientEngine.tsx`.
   - Implementasikan `alignedStrokeOutlineSubs(o, opts = {})`:
     - Pisahkan `closedSubs` dan `openSubs`.
     - Flatten `closedSubs` dengan `flattenObjToRings`, hitung kedalaman nesting tiap ring (`depth % 2 === 0` outer, `depth % 2 === 1` hole) dan normalisasi orientasi dengan `normalizeRingOrientations` (untuk `fillRule === 'nonzero'` dengan kontur saling tumpang tindih, union-kan dulu ring outer agar `origRings` bersih).
     - Jika jumlah ring tertutup `> (opts.maxRings ?? 64)`, kembalikan `{ subs: null, openSubs, fallback: true }`.
     - **Jalur cepat 1 ring tertutup:** `[...offsetRingSafe(r, +w, join, miter), r]` (`outside`) atau `[r, ...offsetRingSafe(r, -w, join, miter)]` (`inside`); jika kosong, kembalikan `fallback: true`.
     - **Jalur boolean (`rings.length > 1`):**
       - Kelompokkan outer (`depth % 2 === 0`) dan hole (`depth % 2 === 1`):
       - `outside`: tiap outer di-offset `+w` lalu di-union -> `outerDilated`; tiap hole di-offset `-w` (menyusut ke dalam lubang!) lalu di-union -> `holeShrunk`; `dilated = holeShrunk.length ? clipRings(outerDilated, holeShrunk, 'difference') : outerDilated`; `band = clipRings(dilated, origRings, 'difference')`.
       - `inside`: tiap outer di-offset `-w` lalu di-union -> `outerContracted`; tiap hole di-offset `+w` (mendorong ke dinding fill!) lalu di-union -> `holeExpanded`; `contracted = outerContracted.length && holeExpanded.length ? clipRings(outerContracted, holeExpanded, 'difference') : outerContracted`; `band = contracted.length ? clipRings(origRings, contracted, 'difference') : origRings`.
       - Refit `band` dengan `ringsToSubs(band)`; bila kosong, kembalikan `{ subs: null, openSubs, fallback: true }`.
   - Perbarui `outlineStrokeDoc`: gunakan `hasVisibleStroke(o)`, panggil `alignedStrokeOutlineSubs(o)` saat `effectiveStrokeAlign(o) !== 'center'` (plus `strokeOutlineRings` untuk `openSubs`), dan bila `strokeGradOn(o)`, pindahkan `o.strokeGrad` ke `grad` serta bersihkan `strokeGrad: null`, `strokeAlign: 'center'`, `strokeDasharray: null`, `strokeDashoffset: 0`.
3. Ekspor `alignedStrokeOutlineSubs` di `src/engine/vectorEngine.tsx`.

- [ ] **Step 4: Jalankan Playwright test untuk verifikasi Task 3**

Run: `npx playwright test tests/tahap1-stroke-align-geometry.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run: `git add src/engine/pathBoolean.tsx src/engine/pathOffset.tsx src/engine/vectorEngine.tsx tests/tahap1-stroke-align-geometry.spec.ts; git commit -m "feat(tahap1): implement compound-safe stroke alignment expansion and outlineStrokeDoc"`

---

### Task 4: Serialisasi & Parsing SVG Round-Trip (Dash, Blend Modes, & Stroke Alignment)

**Files:**
- Modify: `src/engine/svgDocumentSerializer.tsx:1-306`
- Modify: `src/engine/svgDocumentParser.tsx:320-699`
- Test: `tests/tahap1-svg-roundtrip.spec.ts`

**Interfaces:**
- Consumes: `parseDasharray`, `formatDasharray`, `effectiveStrokeAlign`, `strokeOutwardExtent`, `hasVisibleStroke`, `normalizeBlendMode`, `alignedStrokeOutlineSubs`
- Produces:
  - `serializeDoc(doc, opt)`: menulis `stroke-dasharray`, `stroke-dashoffset`, `style="mix-blend-mode:<mode>;"`, serta wrapper `<g data-geovanta-stroke-align="inside|outside" ...>` (mode ekspansi geometri non-dash, mode `<clipPath>`/`<mask>` untuk dashed/fallback, dan `<path data-geovanta-role="stroke-open">` untuk subpath terbuka campuran).
  - `parseSVG(str)`: membaca kembali `stroke-dasharray` & `stroke-dashoffset` (inherited + skala matriks `sc`), `mix-blend-mode` non-inherited pada leaf (`path`/`text`/`image`) + `noteUnsupported('g', id, 'mix-blend-mode')` untuk `<g>` eksternal, serta rekonstruksi lossless 1 `VectorObject` dari `<g data-geovanta-stroke-align="...">` tanpa menandai `sa-mask-*` sebagai unsupported.

- [ ] **Step 1: Tulis tes Playwright yang gagal di `tests/tahap1-svg-roundtrip.spec.ts`**

Jalankan `serializeDoc` & `parseSVG` (lewat browser `page` dengan `web/index.html` atau `DOMParser` browser di Playwright `page.evaluate`) untuk menguji seluruh kasus + Review Focus #5:
1. **Center stroke dengan dash, offset, miterlimit, paintOrder, dan `blendMode`:**
   - Serialisasi menghasilkan 1 `<path>` tunggal dengan `stroke-dasharray="8 4"`, `stroke-dashoffset="2"`, `stroke-linecap="square"`, `stroke-linejoin="miter"`, `stroke-miterlimit="6"`, `paint-order="stroke fill"`, `style="mix-blend-mode:multiply;"`.
   - `parseSVG` mengembalikan objek identik (termasuk `strokeDasharray: [8, 4]`, `strokeDashoffset: 2`, `blendMode: 'multiply'`).
2. **Blend mode pada `<text>` dan `<image>`:** round-trip mempertahankan `blendMode: 'screen'` dan `'overlay'`.
3. **External `<g style="mix-blend-mode:multiply">`:** TIDAK diwariskan ke anak (`child.blendMode` tetap undefined/`'normal'`), dan `parsed.unsupported === true` dengan `parsed.unsupportedElements` memuat `'mix-blend-mode'`.
4. **Transform berskala (`transform="scale(2)"`) pada SVG eksternal dengan `stroke-dasharray="4 2" stroke-dashoffset="1"`:** `parseSVG` menskalakan menjadi `[8, 4]` dan `2` (kecuali bila `vector-effect="non-scaling-stroke"`).
5. **Stroke Alignment non-dash (`outside` dan `inside`, baik `fill` solid maupun `fill: 'none'`, dan dengan `strokeGrad`):**
   - Serialisasi menghasilkan `<g ... data-geovanta-stroke-align="outside">` berisi `data-geovanta-role="fill"` dan `data-geovanta-role="stroke-outline"` (TANPA `<mask>`!), menghormati urutan `paintOrder`.
   - `parseSVG` merekonstruksi kembali tepat **1** objek (bukan 2!) dengan geometri asli, `fill` asli (termasuk `'none'`), `stroke` / `strokeGrad`, `strokeAlign: 'outside'`, `strokeWidth`, dan `unsupported === false`.
6. **Stroke Alignment dashed (`inside` memakai `<clipPath id="sa-clip-...">`, `outside` memakai `<mask id="sa-mask-...">`):**
   - Serialisasi menghasilkan `<clipPath>` / `<mask>` + `data-geovanta-role="stroke-dashed"` pada `stroke-width="2W"`.
   - `parseSVG` merekonstruksi 1 objek dengan `strokeDasharray`, `strokeDashoffset`, `strokeAlign`, dan **`unsupported === false`** (mask `sa-mask-*` tidak dianggap unsupported).
7. **Objek campuran subpath tertutup + terbuka dengan `strokeAlign: 'outside'`:**
   - Serialisasi memisahkan subpath terbuka ke `<path data-geovanta-role="stroke-open" stroke-width="W">` tanpa clip/mask, dan round-trip mengembalikan kedua subpath utuh pada 1 objek.
8. **`mergeIconFramesForExport`:** dua anggota frame ikon dengan `blendMode` atau `strokeAlign` berbeda tidak salah digabung.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan gagal**

Run: `npm run build:web; npx playwright test tests/tahap1-svg-roundtrip.spec.ts`
Expected: FAIL karena serializer & parser belum menangani dash, blendMode, dan wrapper stroke-align.

- [ ] **Step 3: Implementasikan perubahan pada `svgDocumentSerializer.tsx` dan `svgDocumentParser.tsx`**

1. Di `src/engine/svgDocumentSerializer.tsx`:
   - Perbarui `effectBbox(o)` memakai `strokeOutwardExtent(o)`.
   - Perbarui `mergeIconFramesForExport`: masukkan `strokeAlign`, `strokeDasharray`, `strokeDashoffset`, dan `blendMode` ke `strokeSig` dan kunci `fillGroups`.
   - Tambahkan helper `dashAttrs(o)` dan `blendStyleAttr(o)` (diterapkan pada `<path>`, `<text>`, `<image>`, dan `<g>` wrapper).
   - Pada cabang `<path>` biasa (`effectiveStrokeAlign(o) === 'center'` atau `!strokeVisible`): tambahkan `dashAttrs(o)` dan `blendStyleAttr(o)`.
   - Pada cabang `effectiveStrokeAlign(o)` = `'inside' | 'outside'` dan `strokeVisible`:
     - Bangun `<g id="..." data-geovanta-stroke-align="..." data-stroke-width="..." ... [opacity / style / filter / data-effects / data-gen / data-fill-style / data-stroke-style]>`.
     - Pisahkan `closedSubs` & `openSubs`; emit `data-geovanta-role="fill"` (pakai `origD` seluruh subs agar round-trip lossless), emit `data-geovanta-role="stroke-outline"` (non-dash via `alignedStrokeOutlineSubs`) atau `data-geovanta-role="stroke-dashed"` (dash / fallback via `<clipPath id="sa-clip-N">` atau `<mask id="sa-mask-N">`), dan emit `data-geovanta-role="stroke-open"` bila `openSubs.length > 0`. Susun urutan `strokeEl` vs `fillEl` mengikuti `paintOrder`.
2. Di `src/engine/svgDocumentParser.tsx`:
   - Tambahkan `'stroke-dasharray'` dan `'stroke-dashoffset'` ke array pewarisan `walk()` & `rootInh`.
   - **Jangan** masukkan `'mix-blend-mode'` ke pewarisan `walk()`. Baca `prop(el, 'mix-blend-mode')` langsung pada elemen daun (`path`/shape, `text`, `image`); pada kontainer `g`/`svg`/`a`/`use` biasa (bukan wrapper `data-geovanta-stroke-align`), bila `normalizeBlendMode(prop(el, 'mix-blend-mode')) !== 'normal'`, panggil `noteUnsupported(tag, el.getAttribute('id'), 'mix-blend-mode')`.
   - Pada `tag === 'mask'`: jika `id` dimulai dengan `'sa-mask-'` dan direferensikan oleh `<g data-geovanta-stroke-align>`, lewati `noteUnsupported`.
   - Sebelum cabang standar `tag === 'g'`, tangani `el.getAttribute('data-geovanta-stroke-align')`: rekonstruksi 1 `VectorObject` dari `data-geovanta-role="fill"`, `stroke-outline`/`stroke-dashed`/`stroke-open`, dan atribut `data-*` pada `<g>` (termasuk matriks `m`, `opacity`, `blendMode`, `effects`, `gen`, style links, dan `group` induk).

- [ ] **Step 4: Build & jalankan Playwright test untuk verifikasi Task 4**

Run: `npm run build:web; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx playwright test tests/tahap1-svg-roundtrip.spec.ts tests/icon-frame-export-holes.spec.ts`
Expected: PASS (semua tes baru & regresi icon-frame lulus).

- [ ] **Step 5: Commit Task 4**

Run: `git add src/engine/svgDocumentSerializer.tsx src/engine/svgDocumentParser.tsx tests/tahap1-svg-roundtrip.spec.ts; git commit -m "feat(tahap1): add SVG serialize and parse round-trip for dash, blend modes, and stroke alignment"`

---

### Task 5: CanvasKit Renderer, Bounds, Culling, & Hit-Test

**Files:**
- Modify: `src/renderer/canvasKitScene.tsx:52-85,157-265,528-625,1080-1350`
- Modify: `src/engine/imageAndBounds.tsx:150-180`
- Modify: `src/engine/spatialIndexAndHitTest.tsx:240-270,480-495,535-565`
- Test: `tests/tahap1-canvaskit-render-and-hittest.spec.ts`

**Interfaces:**
- Consumes: `toSkiaDashIntervals`, `effectiveStrokeAlign`, `strokeOutwardExtent`, `hasVisibleStroke`, `toCanvasKitBlendMode`
- Produces:
  - `CanvasKitScene`: `this.dashEffects` LRU cache (`maxEntries = 128`, dibersihkan di `dispose()`), render dash/dot (termasuk `nonScalingStroke`), render `inside`/`outside` alignment (`ClipOp.Intersect`/`Difference` @ `effW * 2`, plus split mixed closed+open), render 16 `BlendMode` via `saveLayer` dengan bypass batch & reset `try/finally`, serta culling `pad` berbasis `strokeOutwardExtent`.
  - `objectVisualPad(o)` & `hitTestObject(o, pt, tol, opts)` menghormati `strokeAlign` dan `strokeGradOn(o)`.

- [ ] **Step 1: Tulis tes Playwright yang gagal di `tests/tahap1-canvaskit-render-and-hittest.spec.ts`**

Menggunakan `canvaskit-wasm` asli pada offscreen surface (`kit.MakeSurface(120, 120)`) + `CanvasKitScene` untuk membaca piksel RGBA nyata, serta uji langsung `objectVisualPad` & `hitTestObject` (memverifikasi Review Focus #1, #2, #3):
1. **Dashed & Dotted (`[8, 8]` dan `[0, 10]` dengan `strokeLinecap: 'round'`):**
   - Piksel sepanjang garis memiliki celah transparan (alpha === 0) di posisi gap dan berwarna di posisi dash/titik.
   - `strokeDashoffset: 8` menggeser fase piksel dash secara terukur.
2. **State isolation (Review Focus #3):**
   - Objek solid digambar setelah objek dashed -> garis objek kedua 100% kontinu tanpa celah.
   - Objek normal digambar setelah objek `blendMode: 'multiply'` -> warna objek kedua tidak ikut ter-multiply.
3. **Stroke Alignment (`inside` / `center` / `outside`) pada kotak `30..90` (`strokeWidth = 10`, stroke merah `#ff0000`, fill biru `#0000ff`):**
   - `outside`: piksel di `(25, 60)` (luar kotak, dalam 10px) = merah; piksel di `(35, 60)` (dalam kotak) = biru!
   - `inside`: piksel di `(25, 60)` = transparan; piksel di `(35, 60)` = merah; piksel di `(45, 60)` = biru!
   - `center`: piksel di `(27, 60)` = merah, `(33, 60)` = merah, `(23, 60)` = transparan!
   - `paintOrder: 'stroke fill'` pada `center`: piksel di `(33, 60)` (area overlap fill & stroke) = biru (fill di depan stroke), sedangkan `(27, 60)` = merah!
4. **Blend Modes (`multiply` dan `difference`):**
   - Kotak merah `#ff0000` di bawah + kotak cyan `#00ffff` dengan `blendMode: 'multiply'` di atas -> piksel area tumpang tindih = hitam `(0, 0, 0, 255)`.
   - Kotak putih `#ffffff` + kotak putih dengan `blendMode: 'difference'` -> piksel area tumpang tindih = hitam `(0, 0, 0, 255)`.
5. **Stroke Gradient:** kotak dengan `strokeGrad` linear `#ff0000 -> #0000ff` -> piksel stroke sisi kiri dominan merah, sisi kanan dominan biru.
6. **Bounds & Hit-test (`objectVisualPad`, `hitTestObject`):**
   - `objectVisualPad`: `outside` (`sw = 10`, round) = `10`; `center` = `5`; `inside` = `0`; ikut menghitung jika hanya `strokeGrad` aktif (`stroke` solid `'none'` tidak menggagalkan pad).
   - `hitTestObject` pada kotak `30..90` (`fill: 'none'`, `stroke: '#000'`, `strokeWidth: 10`, `strokeAlign: 'outside'`): titik `(23, 60)` = `true` (di dalam 10px luar), titik `(33, 60)` = `false` (di dalam ruang kosong).
   - `hitTestObject` dengan `strokeAlign: 'inside'`, `fill: 'none'`: titik `(33, 60)` = `true`, titik `(27, 60)` = `false`.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan gagal**

Run: `npx playwright test tests/tahap1-canvaskit-render-and-hittest.spec.ts`
Expected: FAIL karena CanvasKitScene, objectVisualPad, dan hitTestObject belum menerapkan dash, stroke alignment, dan blend mode.

- [ ] **Step 3: Implementasikan perubahan pada `canvasKitScene.tsx`, `imageAndBounds.tsx`, dan `spatialIndexAndHitTest.tsx`**

1. Di `src/renderer/canvasKitScene.tsx`:
   - Konstruktor & `dispose()`: tambah `this.dashEffects = makeCache(128)` dan panggil `this.dashEffects.clear()` di `dispose()`.
   - Tambah `iconFrameFillGroups` key menyertakan `m.blendMode || 'normal'` agar anggota icon frame ber-blend mode dikelompokkan & dirender dengan `saveLayer` blend mode-nya.
   - Di `drawVector` -> `drawStroke`:
     - Pasang `PathEffect.MakeDash` via `this.dashEffects` (skalakan `1 / zoom` bila `o.nonScalingStroke`), bungkus draw dalam `try / finally { paint.setPathEffect(null); }`.
     - Terapkan `effectiveStrokeAlign(o)`: `'inside'` (`ClipOp.Intersect`, `effW * 2`), `'outside'` (`ClipOp.Difference`, `effW * 2`), dan tangani kasus campuran closed + open subpath via `buildPathFromSubs` dalam `try / finally` (`delete()`).
   - Di `drawScene`:
     - Hitung `ckBlend = toCanvasKitBlendMode(kit, o.blendMode)` dan `pad` culling berbasis `strokeOutwardExtent(o)`.
     - Bypass jalur cepat solid-fill batch saat `Boolean(ckBlend)`.
     - Bungkus seluruh draw objek (jalur cepat non-batch, jalur efek/teks/gambar/blur/shadow) dengan `saveLayer(this.layerPaint)` ber-`ckBlend` & `opacity` (inner opacity `1`), lalu reset `this.layerPaint.setBlendMode(kit.BlendMode.SrcOver)` dan `this.layerPaint.setAlphaf(1)` di `finally`.
     - Guard semua API baru dengan `?.` agar mock CanvasKit pada unit test lama tetap aman.
2. Di `src/engine/imageAndBounds.tsx`: perbarui `objectVisualPad(o)` memakai `hasVisibleStroke(o)` dan `strokeOutwardExtent(o)`.
3. Di `src/engine/spatialIndexAndHitTest.tsx`:
   - Gunakan `strokeOutwardExtent(o)` untuk `pad` indeks spasial (`getDocSpatialIndex` & `updateSpatialIndexForObjects`).
   - Di `hitTestObject`: perluas cek bbox awal sebesar `strokePad = hasVisibleStroke(o) ? strokeOutwardExtent(o) * miterFactor : 0`, lalu terapkan uji `Path2D` khusus `'center'`, `'inside'` (`isPointInStroke(2*w) && isPointInPath`), dan `'outside'` (`isPointInStroke(2*w) && !isPointInPath`).

- [ ] **Step 4: Jalankan Playwright test untuk verifikasi Task 5**

Run: `npx playwright test tests/tahap1-canvaskit-render-and-hittest.spec.ts`
Expected: PASS (seluruh asersi piksel CanvasKit dan hit-test lulus).

- [ ] **Step 5: Commit Task 5**

Run: `git add src/renderer/canvasKitScene.tsx src/engine/imageAndBounds.tsx src/engine/spatialIndexAndHitTest.tsx tests/tahap1-canvaskit-render-and-hittest.spec.ts; git commit -m "feat(tahap1): render dash, stroke alignment, and blend modes in CanvasKit with bounds and hit-test"`

---

### Task 6: UI Inspektor Lengkap, Panel & Gizmo Stroke Gradient, i18n, & Tooltips

**Files:**
- Modify: `src/components/ui/SegmentedControl.tsx:8-70`
- Modify: `src/components/editor/GradientEditorPanel.tsx:17-518`
- Modify: `src/components/editor/GradientCanvasGizmo.tsx:9-376`
- Modify: `src/components/editor/EditorRightInspector.tsx:44-525`
- Modify: `src/components/editor/VectorEditor.tsx:680-690,9065-9078,9635-9665`
- Modify: `src/constants/appI18n.tsx` (blok `id` & `en`)
- Modify: `src/constants/tooltipsCatalog.tsx` (blok `TIPS` & `TIPS_EN`)
- Test: `tests/tahap1-inspector-ui-e2e.spec.ts`

**Interfaces:**
- Consumes: semua helper `VE` dari Task 1–4, komponen `Seg`, `GradChoice`, `Select`, `XfField`, `Slider`, `Range`, `CustomTextBox`, `ColorField`, `ColorText`
- Produces:
  - `Seg` mendukung `disabledKeys?: string[] | Set<string>`, `testId?: string`, serta atribut `data-seg-val={k}` & `type="button"`.
  - `GradChoice` mendukung `testIdPrefix?: string` (default `'grad-choice'`).
  - `GradientEditorPanel` mendukung `slot?: 'fill' | 'stroke'`, `onActivateSlot`, `showGizmoFocusToggle`, `isCanvasGizmoActive`, `onFocusCanvasGizmo`, `testIdPrefix`.
  - `GradientCanvasGizmo` mendukung `slot?: 'fill' | 'stroke'` + `data-grad-slot={slot}` + gaya garis putus aksen `#f59e0b` untuk stroke.
  - `EditorRightInspector`:
    - `data-testid="blend-mode-select"` di Appearance (path, teks, gambar).
    - Seksi Stroke khusus `strokeObjs` (`!o.img && o.type !== 'text'`), berisi: `stroke-grad-panel`, `stroke-width-input` (bebas `0–10000` di dalam `div[data-tip="veStrokeW"]`), `stroke-align-seg`, `stroke-paint-order-seg`, `stroke-linecap-seg`, `stroke-linejoin-seg`, `stroke-miterlimit-input`, `stroke-dash-preset`, `stroke-dasharray-input`, `stroke-dashoffset-range`.

- [ ] **Step 1: Tulis tes E2E Playwright yang gagal di `tests/tahap1-inspector-ui-e2e.spec.ts`**

Buka `web/index.html`, buat proyek baru, muat dokumen uji via `window.__geovantaEditorApi.loadTestDoc`, dan verifikasi end-to-end seluruh interaksi UI + Review Focus #4:
1. **Stroke Lengkap:**
   - Ketik `42` pada `[data-testid="stroke-width-input"]` -> `getDoc().objects[0].strokeWidth === 42` (tidak terpotong di 20!).
   - Klik `butt` / `square` di `[data-testid="stroke-linecap-seg"]`, klik `miter` di `[data-testid="stroke-linejoin-seg"]` -> `[data-testid="stroke-miterlimit-input"]` muncul, ketik `8` -> `strokeMiterlimit === 8`; klik `round` -> miter input tersembunyi.
   - Klik `stroke fill` di `[data-testid="stroke-paint-order-seg"]` -> `paintOrder === 'stroke fill'`.
2. **Dashed & Dotted + `dashCustomOpen`:**
   - Klik preset `Dotted` di `[data-testid="stroke-dash-preset"]` -> `strokeDasharray` bertipe `[0, >0]` dan `strokeLinecap === 'round'`.
   - Klik `Solid`, lalu klik `Custom` -> `[data-testid="stroke-dasharray-input"]` langsung muncul dengan pola awal `8 4` (`[8, 4]`), pill `Custom` tetap aktif.
   - Ubah pola kustom menjadi `12 4 2 4` dan ubah `Dash Offset` -> terbarui pada dokumen.
   - Pindah seleksi ke objek solid lain -> `dashCustomOpen` ter-reset (input dash tersembunyi kembali).
3. **Stroke Alignment:**
   - Pada path tertutup: klik `Outside` dan `Inside` di `[data-testid="stroke-align-seg"]` -> `strokeAlign` berubah.
   - Pada path terbuka: tombol `Inside` dan `Outside` dalam status `disabled`.
4. **Stroke Gradient & Canvas Gizmo Switching:**
   - Klik `[data-testid="stroke-grad-choice-linear"]` -> `strokeGrad` aktif (`strokeGrad.type === 'linear'`), `strokeWidth >= 2`, baris warna solid stroke tersembunyi, dan `<g class="ved-grad-gizmo" data-grad-slot="stroke">` muncul di kanvas!
   - Aktifkan juga gradien Fill (`[data-testid="grad-choice-linear"]`) -> gizmo berpindah ke `data-grad-slot="fill"`, dan tombol fokus gizmo stroke mengembalikannya ke `data-grad-slot="stroke"`.
5. **Text & Mixed Text+Path Gating (Review Focus #4):**
   - Seleksi murni objek `type: 'text'`: seksi `div[data-tip="veStroke"]` tidak tampil, `[data-testid="blend-mode-select"]` tetap tampil dan mengubah `textObj.blendMode = 'multiply'`.
   - Seleksi campuran `text` + `path`: seksi Stroke tampil, mengubah `strokeWidth` / `strokeLinecap` hanya memutasi objek `path` dan membiarkan objek `text` tidak berubah.
6. **Blend Modes:** pilih `'multiply'` dan `'difference'` di `[data-testid="blend-mode-select"]` -> `obj.blendMode` berubah + Undo mengembalikannya.
7. **Full UI -> Export SVG -> Re-import Round-Trip:** set `strokeAlign: 'outside'`, `strokeDasharray: [10, 4]`, `strokeGrad` linear, `blendMode: 'overlay'`, serialisasi & parse balik via `VE.serializeDoc` / `VE.parseSVG` -> seluruh properti identik tanpa `unsupported`.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan gagal**

Run: `npx playwright test tests/tahap1-inspector-ui-e2e.spec.ts`
Expected: FAIL karena kontrol UI inspektor dan gizmo stroke belum diimplementasikan.

- [ ] **Step 3: Implementasikan UI komponen, `GradientEditorPanel`, `GradientCanvasGizmo`, `EditorRightInspector`, `VectorEditor`, i18n, & tooltips**

1. `src/components/ui/SegmentedControl.tsx`: tambah `disabledKeys`, `testId`, `type="button"`, `data-seg-val={k}` pada `Seg`; tambah `testIdPrefix = 'grad-choice'` pada `GradChoice`.
2. `src/components/editor/GradientEditorPanel.tsx`:
   - Tambah props `slot = 'fill'`, `onActivateSlot`, `showGizmoFocusToggle`, `isCanvasGizmoActive`, `onFocusCanvasGizmo`, `testIdPrefix`.
   - Parameterkan semua akses gradien/warna/styleId menurut `slot` (menggunakan `VE.isGradOnSlot`, `VE.getGradForSlot`, `VE.ensureGradModel(..., slot)`, `VE.updateGradStops(..., slot)`, `VE.setGradAngleDeg(..., slot)`, `applyGradientPayloadToObj(o, pasted, slot)`).
   - Untuk `slot === 'stroke'`, pakai prefix testId `'stroke-'` (`stroke-grad-choice-*`, `stroke-grad-copy-btn`, `stroke-grad-paste-btn`, `stroke-grad-stop-copy`, `stroke-grad-stop-paste`) sehingga testId Fill lama tidak pernah terduplikasi.
   - Tampilkan label mode sesuai slot (`L.gradMode` untuk fill, `L.gradStrokeMode` untuk stroke) serta tombol pill fokus gizmo saat `showGizmoFocusToggle` aktif.
3. `src/components/editor/GradientCanvasGizmo.tsx`:
   - Tambah prop `slot = 'fill'`, baca `VE.getGradForSlot(obj, slot)`, mutasi via `VE.ensureGradModel(o, undefined, slot)` & `VE.updateGradStops(m, nextRaw, null, slot)`, tambah `data-grad-slot={slot}`, dan bedakan gaya garis panduan stroke (`stroke="#f59e0b"`, `strokeDasharray`).
4. `src/components/editor/VectorEditor.tsx`:
   - Tambah state `activeGradSlot` (`'fill' | 'stroke'`) dan `activeStrokeStopId`.
   - Hitung `gizmoSlot` untuk objek terpilih tunggal (blokir `'stroke'` bila `selObjs[0].type === 'text'`), teruskan `slot={gizmoSlot}` + stop state yang sesuai ke `GradientCanvasGizmo`, serta teruskan `activeGradSlot`, `setActiveGradSlot`, `activeStrokeStopId`, `setActiveStrokeStopId` ke `EditorRightInspector`.
5. `src/components/editor/EditorRightInspector.tsx`:
   - Letakkan hook `const [dashCustomOpen, setDashCustomOpen] = React.useState(false);` dan `useEffect` reset saat seleksi berubah di bagian atas komponen (mematuhi `PELINDUNG HOOKS`).
   - Seksi Appearance: tambah baris Blend Mode (`Select` dengan `BLEND_MODE_OPTIONS`, `data-testid="blend-mode-select"`, mutasi via `setProp('blendMode', v === 'normal' ? undefined : v)`).
   - Seksi Stroke: hitung `strokeObjs`, `strokeTargetIds`, `strokeCp`; tampilkan hanya saat `strokeCp` ada; pasang `GradientEditorPanel slot="stroke"`, solid color row (paste `'any'`, sembunyi saat `VE.strokeGradOn(strokeCp)`), Width (`XfField` `0–10000` + `Slider` `0–50` di dalam `div[data-tip="veStrokeW"]`), Stroke Alignment `Seg` (`disabledKeys` `['inside', 'outside']` saat `!hasClosedStrokeTarget`), Paint Order `Seg`, Cap & Join `Seg`, conditional `Miter Limit` `XfField`, dan Dash presets + `dashCustomOpen` + `CustomTextBox` + `Dash Offset` `Range`.
6. `src/constants/appI18n.tsx` & `src/constants/tooltipsCatalog.tsx`: tambahkan seluruh teks & tooltip ID/EN untuk Stroke Lengkap, Dash/Dot, Alignment, Stroke Gradient, dan Blend Modes.

- [ ] **Step 4: Build bundle web & jalankan tes E2E Playwright untuk verifikasi Task 6**

Run: `npm run build:web; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx playwright test tests/tahap1-inspector-ui-e2e.spec.ts`
Expected: PASS (seluruh skenario E2E lulus).

- [ ] **Step 5: Commit Task 6**

Run: `git add src/components/ui/SegmentedControl.tsx src/components/editor/GradientEditorPanel.tsx src/components/editor/GradientCanvasGizmo.tsx src/components/editor/EditorRightInspector.tsx src/components/editor/VectorEditor.tsx src/constants/appI18n.tsx src/constants/tooltipsCatalog.tsx tests/tahap1-inspector-ui-e2e.spec.ts; git commit -m "feat(tahap1): wire full stroke controls, stroke gradient gizmo, and blend modes UI"`

---

### Task 7: Verifikasi Regresi Penuh, Typecheck, & Visual Check (Playwright MCP)

**Files:**
- Verify only (tidak membuat file baru kecuali perbaikan bug jika ditemukan)

- [ ] **Step 1: Jalankan typecheck dan build produksi offline**

Run: `npm run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run build:web`
Expected: Exit code 0 tanpa error TypeScript maupun esbuild.

- [ ] **Step 2: Jalankan seluruh suite Playwright Tahap 1 dan suite regresi inspektor/gradien/ekspor**

Run: `npx playwright test tests/tahap1-stroke-and-blend-engine.spec.ts tests/tahap1-stroke-gradient-engine.spec.ts tests/tahap1-stroke-align-geometry.spec.ts tests/tahap1-svg-roundtrip.spec.ts tests/tahap1-canvaskit-render-and-hittest.spec.ts tests/tahap1-inspector-ui-e2e.spec.ts tests/right-sidebar-inspector.spec.ts tests/right-sidebar-real-use-case.spec.ts tests/export-smoothness-accent-clipboard.spec.ts tests/icon-frame-export-holes.spec.ts tests/gradient-corner-fixes.spec.ts`
Expected: Semua tes PASS (0 failed).

- [ ] **Step 3: Verifikasi visual live via Playwright MCP**

Gunakan Playwright MCP (`browser_navigate` ke `file:///.../web/index.html`, buat proyek, muat objek uji dengan Blend Mode `multiply`, Stroke Gradient, Dashed, dan Stroke Alignment `outside`, lalu jalankan `browser_snapshot` dan `browser_take_screenshot`) untuk memastikan tampilan inspektor rapi tanpa overflow/clipping, kontrol terbaca jelas, dan kanvas merender visual yang tepat.
