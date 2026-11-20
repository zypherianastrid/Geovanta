# Blob & Wave Generator Bug Fixes & Customizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki performa lag/berat saat memindahkan blob dan menggeser slider-nya, perbaiki bug sinkronisasi posisi canvas (blob/weave melompat kembali ke asal saat parameter diubah) dan bug fungsional gelombang (amplitudo macet pada ketebalan tinggi & strip hilang), serta tambahkan kustomisasi lengkap pada Blob dan Wave Generator.

**Architecture:**
1. Engine: `translate(o, dx, dy)` dan `transformObject(o, a, ...)` memperbarui metadata `o.gen` (`cx, cy, rx, ry` untuk blob/arc; `x, y, w, h` untuk weave) agar posisi & ukuran objek tetap sinkron saat diregenerasi.
2. Performa: `onBlobParams` dan `onWeaveParams` memanfaatkan `meta.isLive` untuk live preview (RAF throttled via `live(d)`) selama slider digeser tanpa full synchronous React re-render & history pushes; `commit` hanya dipanggil saat scrub selesai.
3. DOM Drag: Perbaiki fast drag transform agar tidak melakukan loop `querySelectorAll` saat fill objek sama dengan warna aksen, dan sertakan overlay node dalam pergeseran fast drag.
4. Kustomisasi Blob: Tambahkan rentang titik 3–48, rotasi/phase angle (0°–360°), gaya bentuk/spikiness (organik vs runcing), dan input teks angka seed yang dapat diketik.
5. Kustomisasi Wave: Perbaiki rumus amplitudo & gap; tambahkan pilihan bentuk gelombang (`sine`, `triangle`, `square`), pengatur gap/spacing (0–100%), pengatur frekuensi siklus (1x–4x), pergeseran fase (0°–360°), dan pewarnaan dual-tone (horizontal vs vertical).

**Tech Stack:** React 18, TypeScript/TSX, CanvasKit (raster render), SVG DOM parser/serializer, `@playwright/test` (Playwright only).

**Spec:** Persyaratan langsung dari pengguna pada percakapan tanggal 2026-11-17.

## Global Constraints
- ALL testing activities MUST strictly use Playwright (`@playwright/test`) executed via `npx playwright test`.
- Tanpa dependensi baru di `package.json`.
- Seluruh teks label dan tooltip baru harus tersedia dalam dua bahasa (`id` dan `en`) di `appI18n.tsx` dan `tooltipsCatalog.tsx`.
- Round-trip serialisasi SVG (`data-gen`) harus kompatibel mundur dengan objek blob/weave versi lama.

## Review Focus
1. Blob yang sudah dipindahkan di kanvas tidak boleh melompat kembali ke posisi awal saat slider inspector diubah atau saat tombol acak seed diklik.
2. Weave yang sudah dipindahkan di kanvas tidak boleh melompat kembali ke posisi awal saat slider kolom/baris/amplitudo diubah.
3. Menggeser slider keacakan/kehalusan/kolom/baris harus terasa responsif 60fps tanpa lag berat.
4. Pada ketebalan weave maksimum (100%), amplitudo gelombang tetap terlihat dan strip tidak hilang menjadi path kosong `d=""`.
5. Semua parameter baru (tipe gelombang, gap, frekuensi, fase, rotasi blob, spikiness, seed) tersimpan dan terbaca kembali lewat serialisasi SVG `data-gen`.

---

### Task 1: Engine Fixes - Sinkronisasi Posisi `o.gen` pada `translate` dan `transformObject`

**Files:**
- Modify: `src/engine/bezierSubdivisionAndMove.tsx:131-213`
- Modify: `src/engine/affineAndOrientedBox.tsx:130-185`
- Test: `tests/blob-wave-generator.spec.ts`

**Interfaces:**
- Consumes: `o.gen` pada objek path (`blob`, `weave`, `arc`).
- Produces: `translate(o, dx, dy)` dan `transformObject(o, a, ...)` yang memutakhirkan koordinat `gen` secara otomatis.

- [ ] **Step 1: Tulis Playwright test untuk verifikasi sinkronisasi `o.gen` saat translate & scale**

```typescript
import { test, expect } from '@playwright/test';
import { translate } from '../src/engine/bezierSubdivisionAndMove.tsx';
import { transformObject } from '../src/engine/affineAndOrientedBox.tsx';
import { regenBlob } from '../src/engine/blobGenerator.tsx';
```

- [ ] **Step 2: Jalankan test untuk memastikan gagal**
Run: `npx playwright test tests/blob-wave-generator.spec.ts`
Expected: FAIL (`gen.cx` tidak bergeser saat `translate`).

- [ ] **Step 3: Implementasikan pembaruan `o.gen` di `translate` dan `transformObject`**
- Di `translate`: jika `o.gen`, perbarui `cx += dx, cy += dy` untuk `blob` dan `arc`; perbarui `x += dx, y += dy` untuk `weave`.
- Di `transformObject`: transformasi titik pusat `cx, cy` atau `x, y` dengan matriks affine `a`, dan skala radius `rx, ry` atau dimensi `w, h` dengan faktor skala.

- [ ] **Step 4: Jalankan test untuk memastikan PASS**
Run: `npx playwright test tests/blob-wave-generator.spec.ts`
Expected: PASS.

---

### Task 2: Engine Enhancements - Blob Generator Baru (Titik 3–48, Rotasi, Spikiness, Input Seed)

**Files:**
- Modify: `src/engine/blobGenerator.tsx`
- Modify: `src/engine/svgDocumentParser.tsx:560-575`
- Modify: `src/engine/svgDocumentSerializer.tsx:160-175`
- Test: `tests/blob-wave-generator.spec.ts`

**Interfaces:**
- Consumes: `BlobParams { points, irregularity, smoothness, seed, rotation, spikiness }`.
- Produces: `blobNodes(...)` dan `regenBlob(...)` dengan parameter baru yang deterministik.

- [ ] **Step 1: Tulis failing Playwright test untuk fitur parameter baru blob**
Test rotasi (fase sudut), rentang poin 3–48, spikiness (alternating inner/outer radius ratio), dan toleransi seed string/number.

- [ ] **Step 2: Jalankan test untuk memastikan FAIL**
Run: `npx playwright test tests/blob-wave-generator.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasikan parameter baru di `src/engine/blobGenerator.tsx`**
- Update `DEFAULT_BLOB_PARAMS`: `{ points: 8, irregularity: 0.35, smoothness: 0.7, seed: 0, rotation: 0, spikiness: 0 }`.
- `normalizeBlobParams`: batas poin dinaikkan ke 48, rotasi dijepit 0–360, spikiness dijepit 0–1.
- `blobNodes`: masukkan offset rotasi `(rotation * Math.PI) / 180` ke perhitungan sudut, serta terapkan variasi spikiness.
- `regenBlob`: dukung pembaruan `cx, cy, rx, ry` bila diberikan atau pertahankan koordinat `gen` yang sudah tersinkronisasi.
- Perbarui parser `svgDocumentParser.tsx` untuk membaca field opsional `rotation` dan `spikiness`.

- [ ] **Step 4: Jalankan test untuk memastikan PASS**
Run: `npx playwright test tests/blob-wave-generator.spec.ts`
Expected: PASS.

---

### Task 3: Engine Enhancements - Wave Generator Baru (Tipe Gelombang, Gap Control, Frekuensi, Fase, Anti-Hilang)

**Files:**
- Modify: `src/engine/weaveGenerator.tsx`
- Modify: `src/engine/svgDocumentParser.tsx:574-585`
- Test: `tests/blob-wave-generator.spec.ts`

**Interfaces:**
- Consumes: `WeaveParams { cols, rows, amplitude, thickness, waveType, gapSize, frequency, phase }`.
- Produces: `weaveStrips(...)` yang mendukung gelombang sinus, zigzag/segitiga, kotak, dan celah yang aman tanpa menghasilkan `d=""`.

- [ ] **Step 1: Tulis failing Playwright test untuk perbaikan & fitur baru Weave**
Test amplitudo pada ketebalan 100%, waveType 'triangle' & 'square', frequency multiplier, dan gapSize.

- [ ] **Step 2: Jalankan test untuk memastikan FAIL**
Run: `npx playwright test tests/blob-wave-generator.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasikan perbaikan formula & generator gelombang di `src/engine/weaveGenerator.tsx`**
- Perbaiki `aH` dan `aV`: amplitudo tidak boleh dipaksa 0 pada `thickness = 1`; gunakan batas dinamis yang tetap mempertahankan gelombang.
- Tambahkan fungsi bentuk gelombang `calcWave(u, phase0, period, amp, type, freq, phaseOffset)`:
  - `sine`: sinus standar
  - `triangle`: zigzag linear Catmull-Rom
  - `square`: undakan kotak dengan sudut melengkung halus
- Celah (`gapSize`): hitung lebar celah secara proporsional terhadap ketebalan strip dengan jaminan lebar potongan `b - a >= 1.0` agar strip tidak hilang.
- Perbarui parser `svgDocumentParser.tsx` untuk mendukung atribut baru weave (`waveType`, `gapSize`, `frequency`, `phase`).

- [ ] **Step 4: Jalankan test untuk memastikan PASS**
Run: `npx playwright test tests/blob-wave-generator.spec.ts`
Expected: PASS.

---

### Task 4: UI & Performance Fixes di `VectorEditor.tsx` & `EditorRightInspector.tsx`

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx`
- Modify: `src/components/editor/EditorRightInspector.tsx`
- Modify: `src/constants/appI18n.tsx`
- Modify: `src/constants/tooltipsCatalog.tsx`
- Test: `tests/blob-wave-generator.spec.ts`

**Interfaces:**
- Consumes: `onBlobParams(next, meta)` dan `onWeaveParams(next, meta)` dengan sinyal `meta.isLive`.
- Produces: UI Inspector dengan kontrol kustomisasi lengkap + rendering 60fps tanpa lag scrubbing + GPU drag fix saat warna aksen sama.

- [ ] **Step 1: Tambahkan label i18n & tooltip katalog**
Tambahkan `edBlobRot`, `edBlobSpike`, `edWeaveType`, `edWeaveGap`, `edWeaveFreq`, `edWeavePhase`, `edWeaveDualColor`, dll. di `appI18n.tsx` dan `tooltipsCatalog.tsx`.

- [ ] **Step 2: Refactor `onBlobParams` dan `onWeaveParams` di `VectorEditor.tsx`**
- Terima `(next, meta)`:
  - Jika `meta?.isLive`: panggil `live(...)` (yang menggunakan RAF throttle dan langsung menginstruksikan CanvasKit untuk render tanpa serialisasi riwayat).
  - Jika `!meta?.isLive`: lakukan `commit(...)` penuh untuk mencatat undo checkpoint.
- Di `altDupMove` dan query DOM: pastikan elemen seleksi tetap terdaftar di fast drag meskipun fill-nya `#13b152`, dan sertakan container overlay node dalam translasi GPU selama dragging.
- Di `regenWeave`: pertahankan pewarnaan strip horizontal vs vertikal bila dual-tone aktif.

- [ ] **Step 3: Perbarui panel Inspector di `EditorRightInspector.tsx`**
- Hubungkan slider dengan `(v, meta) => onBlobParams(..., meta)` dan `(v, meta) => onWeaveParams(..., meta)`.
- Blob panel: Points (3–48), Irregularity (0–100%), Smoothness (0–100%), Rotation (0–360°), Spikiness (0–100%), Seed (input teks angka + tombol Acak).
- Weave panel: Cols (2–16), Rows (2–16), Amplitude (0–100%), Thickness (10–100%), Tipe Gelombang (Sinus, Zigzag, Kotak), Jarak Celah / Gap (0–100%), Frekuensi (1x–4x), Fase (0°–360°).

- [ ] **Step 4: Jalankan full Playwright test suite**
Run: `npx playwright test`
Expected: ALL PASS.
