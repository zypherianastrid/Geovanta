# Desain Tahap 1: Styling & Paint (Stroke Lengkap, Dashed/Dotted, Stroke Alignment, Stroke Gradient, & Blend Modes)

**Tanggal:** 2026-11-20  
**Skala:** Proyek (Tahap 1 dari 3 tahap pengembangan fitur lanjutan Geovanta Vector Studio)

---

## 1. Tujuan & Alasan (Intent & Why)

Melengkapi kemampuan styling dan komposisi visual inti Geovanta Vector Studio agar setara dengan editor vektor profesional (Figma / Illustrator), khususnya untuk kebutuhan desain ikon, komponen UI, dan ilustrasi berlapis.

Saat ini fondasi mesin dokumen dan renderer sebenarnya sudah menyimpan dan memproses sebagian atribut stroke dan gradien (`strokeLinecap`, `strokeLinejoin`, `strokeMiterlimit`, `paintOrder`, dan `strokeGrad`) di [svgDocumentParser.tsx](../../../src/engine/svgDocumentParser.tsx), [svgDocumentSerializer.tsx](../../../src/engine/svgDocumentSerializer.tsx), dan [canvasKitScene.tsx](../../../src/renderer/canvasKitScene.tsx), tetapi belum terbuka secara penuh di [EditorRightInspector.tsx](../../../src/components/editor/EditorRightInspector.tsx) maupun gizmo kanvas. Selain itu, runtime `canvaskit-wasm` `0.40.0` di proyek ini telah terverifikasi mendukung secara native `PathEffect.MakeDash`, `ClipOp.Intersect` / `ClipOp.Difference`, serta ke-16 `BlendMode` (`SrcOver` plus 15 mode komposisi). Tahap 1 ini membuka seluruh kemampuan tersebut secara terpadu di data model, mesin geometri/cat, renderer CanvasKit, serializer/parser SVG, dan UI inspektor tanpa menambah dependensi baru.

---

## 2. Ruang Lingkup (Goals, Non-Goals, Anti-Goals)

### Goals
1. **Kontrol UI Stroke Lengkap** di `EditorRightInspector`:
   - Input ketebalan stroke bebas `> 20 px` (`0–10000 px` lewat `XfField`, step `0.5`) dipadukan dengan slider cepat (`0–50 px`, pratinjau live).
   - Kontrol `stroke-linecap` (`butt`, `round`, `square`).
   - Kontrol `stroke-linejoin` (`miter`, `round`, `bevel`).
   - Kontrol `stroke-miterlimit` (`>= 1`, default `4`, tampil/aktif saat `strokeLinejoin === 'miter'`).
   - Kontrol `paint-order` (`fill stroke` = *Di Depan Fill* vs `stroke fill` = *Di Belakang Fill*).
2. **Dashed & Dotted Stroke**:
   - Preset cepat (`Solid`, `Dashed`, `Dotted`, `Dash-Dot`, `Custom`).
   - Input pola kustom `stroke-dasharray` (format angka dipisah spasi atau koma).
   - Kontrol `stroke-dashoffset` (slider & input bebas) dengan pratinjau live di CanvasKit serta round-trip penuh pada ekspor/impor SVG.
3. **Stroke Alignment (`inside` / `center` / `outside`)**:
   - Render kanvas 60 fps di CanvasKit lewat `clipPath` (`ClipOp.Intersect` untuk `inside`, `ClipOp.Difference` untuk `outside`) dengan `strokeWidth × 2` pada subpath tertutup (subpath terbuka otomatis fallback ke `center`).
   - Ekspor SVG yang kompatibel luas (Pendekatan 1): ekspansi geometri band stroke via [pathOffset.tsx](../../../src/engine/pathOffset.tsx) untuk stroke solid/gradien, fallback `<clipPath>`/`<mask>` khusus kombinasi dashed, serta atribut metadata `data-geovanta-stroke-align` agar impor balik ke Geovanta mempertahankan satu objek utuh.
4. **Stroke Gradient**:
   - Dukungan penuh gradien (`Linear`, `Radial`, `Angular`, multi-stop OKLab/sRGB, midpoint, spread method, copy/paste, preset) pada slot Stroke lewat generalisasi [gradientEngine.tsx](../../../src/engine/gradientEngine.tsx), [GradientEditorPanel.tsx](../../../src/components/editor/GradientEditorPanel.tsx), [colorClipboard.tsx](../../../src/utils/colorClipboard.tsx), dan [GradientCanvasGizmo.tsx](../../../src/components/editor/GradientCanvasGizmo.tsx) dengan switching `activeGradSlot: 'fill' | 'stroke'`.
5. **Blend Modes (`mix-blend-mode`)**:
   - 16 pilihan (`normal` + 15 mode: `darken`, `multiply`, `color-burn`, `lighten`, `screen`, `color-dodge`, `overlay`, `soft-light`, `hard-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`) per objek (path, teks, gambar) di seksi Appearance.
   - Render CanvasKit lewat `saveLayer` ber-`BlendMode` dan round-trip CSS `mix-blend-mode` di SVG.

### Non-Goals (di luar Tahap 1)
- Tidak mengerjakan fitur **Tahap 2** (Boolean Divide, Make/Release Compound Path, Pencil Tool & Smooth Vector Brush) maupun **Tahap 3** (Built-in SVG Optimizer/Export Code Presets, Live SVG XML Code Inspector & Two-Way Editor).
- Tidak menambahkan stroke pada objek teks (`type === 'text'`) — stroke tetap khusus objek path; Blend Modes berlaku untuk semua jenis objek (path, teks, gambar).
- Tidak menambahkan `groupBlendMode` terpisah untuk kontainer grup `<g>` maupun properti `isolation` kustom pada Tahap 1 (blend mode berlaku per objek/layer).
- Tidak menambahkan dukungan ekspor AI/EPS baru untuk `blendMode` maupun `strokeDasharray` (fokus Tahap 1 adalah render kanvas, ekspor raster CanvasKit PNG/JPG/WebP, dan ekspor/impor SVG).
- Tidak mengubah tampilan default objek dokumen lama (objek tanpa properti baru tetap dirender dan diekspor identik dengan perilaku saat ini).

### Anti-Goals
- **Tidak ada elemen native HTML `<select>` atau `<input>` baru:** seluruh UI inspektor wajib menggunakan komponen kustom Geovanta (`Seg`, `Select`, `XfField`, `Range`, `Slider`, `CustomTextBox`, `ColorField`, `ColorText`, `GradChoice`).
- **Tidak ada kebocoran memori WASM CanvasKit:** setiap `PathEffect` dan `Shader` harus dikelola dalam cache berbatas LRU dan di-`dispose()` saat keluar cache atau saat `scene.dispose()`, serta `paint.setPathEffect(null)` dan `layerPaint.setBlendMode(BlendMode.SrcOver)` wajib di-reset setiap selesai menggambar objek.
- **Tidak merusak fast-path rendering objek polos:** objek dengan `blendMode === 'normal'` (atau tanpa `blendMode`), tanpa efek, dan fill solid tetap memakai batch solid-fill di `CanvasKitScene`; hanya objek dengan `blendMode !== 'normal'` yang keluar dari batch dan dibungkus `saveLayer`.
- **Tidak membiarkan stroke `outside` terpotong:** culling viewport `CanvasKitScene`, `docBounds` / `objectVisualPad`, `effectBbox`, dan `hitTestObject` / indeks spasial tidak boleh memotong atau melewatkan area luar stroke `outside`.

---

## 3. Kendala Teknis & Lingkungan

- **Renderer & Ekspor Raster:** Kanvas editor dan ekspor raster (PNG/JPG/WebP) sama-sama dirender oleh `CanvasKitScene` (`canvaskit-wasm` `0.40.0`) di [canvasKitScene.tsx](../../../src/renderer/canvasKitScene.tsx) dan [canvasKitRasterExport.tsx](../../../src/renderer/canvasKitRasterExport.tsx). Seluruh mock CanvasKit pada tes unit yang sudah ada harus tetap aman menggunakan guard opsional (`?.` atau pengecekan eksistensi API).
- **100% Offline Bundle & Strict TypeScript:** Implementasi tidak boleh menambah dependensi npm baru, dan seluruh kode wajib lolos `npm run typecheck` serta `npm run build:web`.
- **Pengujian Wajib Playwright:** Sesuai aturan proyek di `AGENTS.md`, seluruh pengujian otomatis wajib ditulis memakai `@playwright/test` dan dijalankan via `npx playwright test`.
- **Bilingual UI & Aksesibilitas:** Semua label dan tooltip baru wajib tersedia dalam Bahasa Indonesia dan Inggris di `appI18n.tsx` & `tooltipsCatalog.tsx`, serta menyertakan atribut `data-testid` yang stabil.
- **Standar Web Modern (`visual-effects`):** Interpolasi gradien default tetap memakai ruang warna **OKLab** (untuk mencegah pergeseran rona kemerahan pada warna netral dan menjaga konsistensi warna) dan serialisasi `mix-blend-mode` SVG memakai properti CSS standar (`style="mix-blend-mode: ..."`).

---

## 4. Pendekatan yang Dipertimbangkan (Approaches)

Keputusan arsitektur utama Tahap 1 berada pada mekanisme **Stroke Alignment (Inside / Center / Outside)** karena spesifikasi SVG 1.1 tidak memiliki atribut `stroke-alignment` bawaan:

1. **Pendekatan 1 — Kanvas Native Skia Clip (`2×` Stroke) + Ekspor SVG Ekspansi Geometri (`pathOffset`) *(Dipilih)***
   - **Kanvas:** Untuk subpath tertutup, `inside` memakai `clipPath(Intersect)` dan `outside` memakai `clipPath(Difference)` dengan `strokeWidth × 2`.
   - **Ekspor SVG:** Stroke `inside`/`outside` non-dash dikonversi menjadi `<path>` band geometri nyata via `pathOffset.tsx` (tetap mendukung fill solid maupun `strokeGrad`), sedangkan kombinasi *dashed + inside/outside* memakai fallback `<clipPath>` / `<mask>` agar pola dash dan cap tetap persis. Kedua kasus dibungkus `<g data-geovanta-stroke-align="...">` untuk round-trip lossless.
   - **Alasan dipilih:** Memberikan performa kanvas 60 fps yang mulus saat drag/scrubbing sekaligus menghasilkan SVG kompatibel tinggi (berupa `<path>` bersih tanpa `<mask>`) untuk aset ikon dan UI di Figma, Illustrator, maupun pipeline web/Android.
2. **Pendekatan 2 — Kanvas Native Skia Clip + Ekspor SVG `<clipPath>` (Inside) & `<mask>` (Outside) untuk Semua Kasus**
   - **Trade-off / ditolak:** Kurva Bézier 100% eksak tanpa refitting, tetapi elemen `<mask>` banyak tidak didukung oleh konverter ikon, Android VectorDrawable, dan beberapa tool desain ringan.
3. **Pendekatan 3 — Offset Centerline (`±W/2`) di Kanvas Maupun Ekspor SVG**
   - **Trade-off / ditolak:** SVG hasil ekspor sangat ringkas, tetapi rawan artefak atau keruntuhan geometri pada sudut cekung tajam maupun saat lebar stroke melebihi setengah lebar bentuk selama scrubbing slider live.

---

## 5. Spesifikasi Detail Keputusan Desain

### A. Model Data ([src/types/vectorTypes.ts](../../../src/types/vectorTypes.ts))

Tambahkan tipe dan properti opsional berikut pada model domain vektor:

```ts
export type StrokeAlign = 'center' | 'inside' | 'outside';

export type BlendModeName =
  | 'normal'
  | 'darken'
  | 'multiply'
  | 'color-burn'
  | 'lighten'
  | 'screen'
  | 'color-dodge'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';
```

Pada interface `VectorObject`:
- `strokeDasharray?: number[] | null;`
- `strokeDashoffset?: number;`
- `strokeAlign?: StrokeAlign;`
- `blendMode?: BlendModeName;`
- `strokeGrad?: GradModel | null;`

**Invarian Backward-Compatibility:**
Objek lama tanpa properti baru diperlakukan dengan nilai default berikut:
- `strokeLinecap`: `'round'`
- `strokeLinejoin`: `'round'`
- `strokeMiterlimit`: `4`
- `paintOrder`: `'fill stroke'`
- `strokeAlign`: `'center'`
- `strokeDasharray`: `null` (solid)
- `strokeDashoffset`: `0`
- `blendMode`: `'normal'`

---

### B. Modul Helper Pure Engine (`src/engine/strokeStyles.tsx` & `src/engine/blendModes.tsx`, diekspos via `VE`)

Kedua modul ditulis sebagai pure TypeScript/JS (tanpa JSX) sehingga dapat diuji langsung dan diimpor oleh renderer, serializer, parser, maupun UI.

#### 1. `src/engine/strokeStyles.tsx`
- **`hasVisibleStroke(o)`**: mengembalikan `Boolean(o && (o.strokeWidth || 0) > 0 && (strokeGradOn(o) || (o.stroke && o.stroke !== 'none' && o.stroke !== 'transparent')))`.
- **`parseDasharray(raw)`**: menerima string (`"8 4"`, `"8, 4"`, `"none"`, `""`) atau `number[]`; mengembalikan `number[] | null`. Hanya menyimpan angka finite `>= 0` (batas maksimal elemen wajar, mis. 64 item), menolak seluruh array jika kosong atau total jumlah seluruh elemen `<= 0` (mengembalikan `null`).
- **`formatDasharray(arr)`**: memformat `number[]` yang valid menjadi string dipisah spasi (mis. `"8 4"`), atau `""` jika kosong/`null`.
- **`toSkiaDashIntervals(arr)`**: jika panjang array valid adalah ganjil (mis. `[6]` atau `[8, 4, 2]`), gandakan array (`[...arr, ...arr]`) sesuai spesifikasi SVG sehingga CanvasKit `PathEffect.MakeDash` selalu menerima daftar berjumlah genap dengan total panjang `> 0`.
- **`dashPresetValues(preset, strokeWidth)`**: menghitung nilai preset proporsional terhadap ketebalan stroke (`sw = Math.max(1, Number(strokeWidth) || 1)`):
  - `'solid'` -> `{ strokeDasharray: null, strokeDashoffset: 0 }`
  - `'dashed'` -> `{ strokeDasharray: [Math.max(4, rd(sw * 3)), Math.max(3, rd(sw * 2))] }`
  - `'dotted'` -> `{ strokeDasharray: [0, Math.max(4, rd(sw * 2))], strokeLinecap: 'round' }`
  - `'dashdot'` -> `{ strokeDasharray: [Math.max(6, rd(sw * 3)), Math.max(3, rd(sw * 1.5)), 0, Math.max(3, rd(sw * 1.5))], strokeLinecap: 'round' }`
- **`detectDashPreset(arr, strokeWidth)`** *(Keputusan desainer)*: membandingkan `arr` (toleransi `1e-3`) terhadap keluaran `dashPresetValues('dashed' | 'dotted' | 'dashdot', strokeWidth)` dan mengembalikan `'solid' | 'dashed' | 'dotted' | 'dashdot' | 'custom'` untuk menentukan status aktif tombol preset di UI.
- **`effectiveStrokeAlign(o)`**: mengembalikan `'inside' | 'outside'` hanya bila `o.strokeAlign === 'inside' || o.strokeAlign === 'outside'` **dan** `Array.isArray(o.subs) && o.subs.some(sp => sp && sp.closed)`; selain itu selalu mengembalikan `'center'` (subpath terbuka secara geometris hanya mendukung center stroke).
- **`strokeOutwardExtent(o)`**: jarak ekspansi ke luar batas geometri untuk keperluan bounding box, culling, dan hit-test:
  - `'inside'` -> `0`
  - `'outside'` -> `strokeWidth`
  - `'center'` -> `strokeWidth / 2`

#### 2. `src/engine/blendModes.tsx`
- **`BLEND_MODE_GROUPS` & `BLEND_MODE_OPTIONS`**: 16 mode dikelompokkan mengikuti standar editor desain (untuk komponen `Select` kustom beserta pemisah grup):
  1. Normal: `normal`
  2. Darken group: `darken`, `multiply`, `color-burn`
  3. Lighten group: `lighten`, `screen`, `color-dodge`
  4. Contrast group: `overlay`, `soft-light`, `hard-light`
  5. Inversion group: `difference`, `exclusion`
  6. Component group: `hue`, `saturation`, `color`, `luminosity`
- **`VALID_BLEND_MODES`**: `Set<BlendModeName>` berisi ke-16 nama mode valid.
- **`normalizeBlendMode(raw)`**: melakukan `trim().toLowerCase()`, mengembalikan mode yang valid atau `'normal'` sebagai fallback.
- **`toCanvasKitBlendMode(kit, mode)`**: memetakan nama mode (selain `'normal'`) ke `kit.BlendMode[...]` (`Darken`, `Multiply`, `ColorBurn`, `Lighten`, `Screen`, `ColorDodge`, `Overlay`, `SoftLight`, `HardLight`, `Difference`, `Exclusion`, `Hue`, `Saturation`, `Color`, `Luminosity`); mengembalikan `null` bila `'normal'` atau API belum tersedia.

Ekspor fungsi-fungsi utama kedua modul tersebut melalui objek agregator `VE` di [vectorEngine.tsx](../../../src/engine/vectorEngine.tsx).

---

### C. Stroke Gradient ([gradientEngine.tsx](../../../src/engine/gradientEngine.tsx), [colorClipboard.tsx](../../../src/utils/colorClipboard.tsx), [colorWalk.tsx](../../../src/engine/colorWalk.tsx), [GradientEditorPanel.tsx](../../../src/components/editor/GradientEditorPanel.tsx), [GradientCanvasGizmo.tsx](../../../src/components/editor/GradientCanvasGizmo.tsx), [VectorEditor.tsx](../../../src/components/editor/VectorEditor.tsx))

1. **Generalisasi `gradientEngine.tsx` (parameter opsional `slot: 'fill' | 'stroke' = 'fill'`)**:
   - Tambahkan parameter opsional `slot = 'fill'` pada:
     - `ensureGradModel(o, desiredType = 'linear', slot = 'fill')`
     - `updateGradStops(o, nextRawStops, extraGradProps = null, slot = 'fill')`
     - `setGradAngleDeg(o, deg, slot = 'fill')`
   - Ketika `slot === 'stroke'`:
     - Membaca/menulis `o.strokeGrad` dan `o.stroke` (menjaga invarian `strokeGradOn`: `o.strokeGrad.base === o.stroke`).
     - Warna awal fallback saat stroke masih `'none'` menggunakan `'#111827'` -> stop 2 `'#6366f1'` (atau warna solid stroke saat ini bila sudah ada).
     - Saat mengaktifkan gradien stroke pada objek dengan `stroke === 'none'` atau `!(o.strokeWidth > 0)`, otomatis menetapkan `strokeWidth: o.strokeWidth > 0 ? o.strokeWidth : 2` agar stroke langsung terlihat di kanvas.
     - Melepas `strokeStyleId` bila ada (mengikuti aturan *Ruling L* bahwa style solid tidak menaut ke gradien).
   - `colorWalk.tsx`: mengganti helper duplikat lokal `updateStrokeGradStops` agar langsung mendelegasikan ke `updateGradStops(next, raw, null, 'stroke')`.
   - `colorClipboard.tsx`: menambahkan parameter `slot: 'fill' | 'stroke' = 'fill'` pada `applyGradientPayloadToObj(obj, payload, slot = 'fill')`, melepas `strokeStyleId` saat `slot === 'stroke'`, serta memastikan `strokeWidth` minimal `2` jika sebelumnya `<= 0`.
2. **Generalisasi `GradientEditorPanel.tsx`**:
   - Tambah props opsional:
     - `slot?: 'fill' | 'stroke'` (default `'fill'`)
     - `onActivateSlot?: () => void`
     - `isCanvasGizmoActive?: boolean`
     - `onFocusCanvasGizmo?: () => void`
     - `showGizmoFocusToggle?: boolean`
     - `testIdPrefix?: string` (default `'fill'` atau sesuai `slot`)
   - Seluruh operasi baca/tulis gradien (`gradOn` vs `strokeGradOn`, `obj.grad` vs `obj.strokeGrad`, `obj.fill` vs `obj.stroke`, `fillStyleId` vs `strokeStyleId`) diparameterkan menurut `slot`, tanpa duplikasi logika panel gradien.
   - Ketika mode `slot === 'stroke'` diset ke `'none'`, hapus `strokeGrad` sekaligus atur `stroke: 'none'`.
   - Saat user berinteraksi pada panel gradien stroke (mengganti mode, memilih stop, atau mengklik tombol fokus gizmo), panggil `onActivateSlot?.()` agar gizmo kanvas otomatis aktif ke slot stroke.
3. **Switching Gizmo Kanvas (`VectorEditor.tsx` & `GradientCanvasGizmo.tsx`)**:
   - Di `VectorEditor.tsx`, tambah state:
     - `const [activeGradSlot, setActiveGradSlot] = useState<'fill' | 'stroke'>('fill');`
     - `const [activeStrokeStopId, setActiveStrokeStopId] = useState<string | null>(null);`
   - Saat `selObjs.length === 1 && !pen && (tool === 'select' || tool === 'node') && !selObjs[0].img`:
     - Tentukan `gizmoSlot`: untuk objek teks (`selObjs[0].type === 'text'`), blokir `slot="stroke"` (hanya izinkan `'fill'` jika `gradOn(selObjs[0])`); untuk objek path, gunakan `activeGradSlot` bila slot tersebut memiliki gradien aktif (`gradOn` untuk fill / `strokeGradOn` untuk stroke), atau fallback otomatis ke slot lain yang memiliki gradien aktif (`null` jika keduanya tidak aktif). *(Keputusan desainer)*
   - Pada `GradientCanvasGizmo.tsx`:
     - Tambah prop `slot?: 'fill' | 'stroke'` (default `'fill'`).
     - Gunakan `slot` untuk membaca `obj.grad` vs `obj.strokeGrad` dan memanggil `ensureGradModel(..., slot)` / `updateGradStops(..., slot)`.
     - **Diferensiasi Visual Stroke Gizmo:** Ketika `slot === 'stroke'`, garis panduan utama memakai gaya garis putus-putus dengan warna aksen sekunder (`#f59e0b`), serta wrapper `<g>` diberi atribut `data-grad-slot={slot}` (`"fill"` atau `"stroke"`).
   - **Pemindah Cepat Gizmo di UI:** Ketika objek terpilih memiliki gradien fill **dan** gradien stroke sekaligus, tampilkan tombol pill kompak (*Edit di Kanvas* / *Edit on Canvas*) di `GradientEditorPanel` untuk berpindah cepat antara gizmo Fill dan Stroke.

---

### D. Render CanvasKit, Bounds, Culling, & Hit-Test ([canvasKitScene.tsx](../../../src/renderer/canvasKitScene.tsx), [imageAndBounds.tsx](../../../src/engine/imageAndBounds.tsx), [spatialIndexAndHitTest.tsx](../../../src/engine/spatialIndexAndHitTest.tsx))

1. **Dashed & Dotted Stroke di `CanvasKitScene`**:
   - Tambahkan `this.dashEffects = makeCache(128)` di konstruktor `CanvasKitScene` dan bersihkan di `dispose()`.
   - Dalam `drawVector` -> `drawStroke`:
     - Ambil interval valid melalui `toSkiaDashIntervals(o.strokeDasharray)`.
     - Jika ada dan `kit.PathEffect?.MakeDash` tersedia:
       - Bila `o.nonScalingStroke` aktif, skalakan setiap interval dan `strokeDashoffset` dengan `1 / zoom` (disertai pembulatan presisi wajar untuk kunci cache).
       - Ambil/buat `PathEffect` dari `this.dashEffects` memakai kunci `intervals.join(',') + '@' + phase`.
       - Pasang `paint.setPathEffect(ef)` sebelum `canvas.drawPath(...)` dan **wajib** reset `paint.setPathEffect(null)` di blok `finally` pada `withPaint` / `drawStroke`.
2. **Stroke Alignment (`inside` / `center` / `outside`) di `CanvasKitScene`**:
   - Dalam `drawVector` -> `drawStroke`, evaluasi `align = effectiveStrokeAlign(o)`:
     - `'center'`: gambar stroke normal dengan `effW` (perilaku saat ini).
     - `'inside'` (subpath tertutup): `canvas.save(); canvas.clipPath(path, kit.ClipOp.Intersect, smoothEdges); this.stroke(paint, o, effW * 2); canvas.drawPath(path, paint); canvas.restore();`
     - `'outside'` (subpath tertutup): `canvas.save(); canvas.clipPath(path, kit.ClipOp.Difference, smoothEdges); this.stroke(paint, o, effW * 2); canvas.drawPath(path, paint); canvas.restore();`
   - *Penanganan objek campuran subpath tertutup & terbuka:* Apabila satu objek memiliki kombinasi subpath `closed: true` dan `closed: false` dengan `strokeAlign !== 'center'`, bangun `closedPath` dan `openPath` secara terpisah memakai `buildPathFromSubs` (dieksekusi di dalam `try / finally` agar langsung `delete()`): subpath tertutup digambar menggunakan clip `inside`/`outside`, sedangkan subpath terbuka digambar normal (`center`). Bila seluruh subpath tertutup (kasus umum) atau berada di jalur *icon frame*, gunakan `entry.path` langsung tanpa alokasi path baru.
   - *Catatan `ClipOp.Difference` di Skia:* Karena `canvas.save()` / `canvas.clipPath(..., Difference)` / `canvas.restore()` memotong area interior path di kanvas aktif dengan `strokeWidth = effW * 2`, setengah bagian dalam stroke terpotong bersih dan hanya setengah bagian luar (selebar tepat `effW`) yang digambar tanpa memengaruhi fill (yang digambar di luar blok clip stroke sesuai urutan `paintOrder`).
3. **Blend Modes (`mix-blend-mode`) di `CanvasKitScene`**:
   - Evaluasi `const ckBlend = toCanvasKitBlendMode(kit, o.blendMode)`.
   - Pada jalur cepat *solid-fill batching* (`drawScene`), tambahkan guard `!ckBlend` agar objek dengan `blendMode !== 'normal'` selalu keluar dari batch dan digambar terpisah.
   - Bungkus render objek (baik jalur normal, teks, gambar, drop shadows, `drawLayerBlurred`, maupun *icon frame groups* yang kunci pengelompokannya menyertakan `o.blendMode || 'normal'`) dengan layer komposisi:
     ```ts
     if (ckBlend) {
       this.layerPaint.setBlendMode(ckBlend);
       this.layerPaint.setAlphaf(opacity);
       canvas.saveLayer(this.layerPaint);
     }
     try {
       // render objek dengan innerOpacity = ckBlend ? 1 : opacity (mencegah double-opacity)
     } finally {
       if (ckBlend) {
         canvas.restore();
         this.layerPaint.setBlendMode(kit.BlendMode.SrcOver);
         this.layerPaint.setAlphaf(1);
       }
     }
     ```
   - Pada `withPaint`, pastikan `paint.setBlendMode(kit.BlendMode.SrcOver)` tetap eksplisit (jangan menimpa `paint` fill/stroke dengan blend mode objek; blend mode bekerja pada `saveLayer` komposit objek terhadap latar di bawahnya, persis seperti `mix-blend-mode` CSS).
4. **Culling, Bounding Box, & Hit-Test**:
   - Gunakan `strokeOutwardExtent(o)` secara konsisten pada:
     - `pad` culling di `CanvasKitScene.drawScene` (`strokeOutwardExtent(o) * (o.nonScalingStroke ? 1 / zoom : 1) * miterFactor`).
     - `objectVisualPad(o)` di `imageAndBounds.tsx` (mengganti `(o.strokeWidth || 0) / 2` dengan `strokeOutwardExtent(o)` serta ikut mengecek `strokeGradOn(o)`).
     - `effectBbox(o)` di `svgDocumentSerializer.tsx`.
     - `getDocSpatialIndex` & `updateSpatialIndexForObjects` di `spatialIndexAndHitTest.tsx`.
   - Pada `hitTestObject` di `spatialIndexAndHitTest.tsx`:
     - Lebarkan cek bounding box awal (`bb[0] - tol - strokePad`, dst.) sebesar `strokePad = strokeOutwardExtent(o) * miterFactor` (minimal `0`) agar klik di tepi stroke `outside` tidak ditolak sebelum `isPointInStroke`.
     - Pada pengujian `Path2D` (`hasStroke`):
       - `'center'`: `VCTX.lineWidth = Math.max(w, tol * 2); if (VCTX.isPointInStroke(p2, pt.x, pt.y)) return true;`
       - `'inside'`: `VCTX.lineWidth = Math.max(w * 2, tol * 2); if (VCTX.isPointInStroke(p2, pt.x, pt.y) && VCTX.isPointInPath(p2, pt.x, pt.y, fillRule)) return true;`
       - `'outside'`: `VCTX.lineWidth = Math.max(w * 2, tol * 2); if (VCTX.isPointInStroke(p2, pt.x, pt.y) && !VCTX.isPointInPath(p2, pt.x, pt.y, fillRule)) return true;`
5. **Penskalaan Dash saat Transformasi (`selectionTransformAndAlign.tsx` & `affineAndOrientedBox.tsx`)** *(Keputusan desainer)*:
   - Perbarui `scaleObjXY` ([selectionTransformAndAlign.tsx](../../../src/engine/selectionTransformAndAlign.tsx)) dan `transformObject` ([affineAndOrientedBox.tsx](../../../src/engine/affineAndOrientedBox.tsx)) agar ketika `scaleStroke && !o.nonScalingStroke`, setiap elemen `strokeDasharray` dan nilai `strokeDashoffset` ikut diskalakan sebesar `kScale` (selaras dengan penskalaan matriks impor di `svgDocumentParser.tsx`).
   - Sebaliknya, pengubahan `strokeWidth` secara manual di inspektor **tidak** menimpa `strokeDasharray` / `strokeDashoffset` secara otomatis (mengikuti perilaku Figma & Illustrator di mana panjang dash berdiri sendiri dalam satuan dokumen; preset dihitung proporsional hanya saat tombol preset diklik).

---

### E. Ekspansi Stroke Alignment & Round-Trip SVG ([pathBoolean.tsx](../../../src/engine/pathBoolean.tsx), [pathOffset.tsx](../../../src/engine/pathOffset.tsx), [svgDocumentSerializer.tsx](../../../src/engine/svgDocumentSerializer.tsx), [svgDocumentParser.tsx](../../../src/engine/svgDocumentParser.tsx))

1. **Ekspansi Geometri di `pathBoolean.tsx` & `pathOffset.tsx`** *(Keputusan desainer)*:
   - Ekspor `normalizeRingOrientations` dari [pathBoolean.tsx](../../../src/engine/pathBoolean.tsx).
   - Tambah `alignedStrokeOutlineSubs(o)` di `pathOffset.tsx` dengan memproses seluruh ring tertutup objek secara utuh (bukan per `sp` terpisah):
     - Kumpulkan seluruh ring tertutup `o.subs` lewat `flattenObjToRings`, klasifikasikan kedalaman nesting tiap ring (`depth % 2 === 0` = outer, `depth % 2 === 1` = lubang/hole), dengan menghormati `o.fillRule` (`nonzero` vs `evenodd`) untuk merepresentasikan region asli `origRings`.
     - Koreksi arah normal lubang (`outN` di `pathOffset.tsx` membalik tanda saat `area < 0`, sehingga untuk lubang `depth % 2 === 1`, `+w` mendorong **masuk ke dinding fill** sedangkan `-w` mendorong **masuk ke ruang lubang**):
       - **`outside`:** untuk ring outer (`depth % 2 === 0`) offset `+w` (`offsetRingSafe(ring, +w)`), sedangkan untuk ring lubang (`depth % 2 === 1`) offset `-w` (`offsetRingSafe(ring, -w)`, bila kolaps maka lubang terisi penuh oleh stroke).
       - **`inside`:** untuk ring outer (`depth % 2 === 0`) offset `-w` (`offsetRingSafe(ring, -w)`), sedangkan untuk ring lubang (`depth % 2 === 1`) offset `+w` (`offsetRingSafe(ring, +w)`).
     - **Jalur cepat vs Boolean penuh:**
       - Untuk objek sederhana dengan **1 ring tertutup** (non-self-intersecting): jalur cepat langsung `[...offsetRingSafe(r, +w), r]` (`outside`) atau `[r, ...offsetRingSafe(r, -w)]` (`inside`) tanpa memanggil `clipRings`.
       - Untuk objek majemuk / berlubang (`rings.length > 1`, termasuk hasil `mergeIconFramesForExport`), hingga batas aman `<= 64` ring tertutup: selesaikan secara eksak via `clipRings` (`pathBoolean.tsx`) — untuk `outside`: `band = clipRings(dilatedShape, origRings, 'difference')` (di mana `dilatedShape` adalah union seluruh `(outer_+w \ hole_-w)`); untuk `inside`: `band = clipRings(origRings, contractedShape, 'difference')` (di mana `contractedShape` adalah union seluruh `(outer_-w \ hole_+w)`). Ini mencegah artefak XOR `evenodd` saat band antar-kontur bersentuhan dan menjaga hasil ekspor ikon berlubang bebas `<mask>`.
       - Jika jumlah ring tertutup `> 64` atau boolean/offset mengembalikan hasil kosong/degenerasi pada ekspor SVG: kembalikan penanda fallback sehingga serializer otomatis memakai `<clipPath>` (`inside`) / `<mask>` (`outside`), agar `serializeDoc` (termasuk `Ctrl+C` sinkron) tetap cepat dan tidak pernah menghasilkan stroke hilang.
     - Untuk subpath terbuka (`!sp.closed`): fallback ke `strokeOutlineRings(pts, false, w / 2, join, cap, miterLimit)` pada `outlineStrokeDoc`, atau dipisah sebagai jalur terbuka tersendiri pada serializer.
   - Perbarui `outlineStrokeDoc` agar memanggil `alignedStrokeOutlineSubs` bila `effectiveStrokeAlign(o) !== 'center'`, memindahkan `strokeGrad` menjadi `grad` bila stroke memakai gradien (serta mereset `strokeGrad: null`, `strokeAlign: 'center'`, `strokeDasharray: null`).
2. **Serialisasi SVG di `svgDocumentSerializer.tsx`**:
   - Perbarui `mergeIconFramesForExport` agar `strokeSig` dan kunci pengelompokan menyertakan `strokeAlign`, `strokeDasharray`, `strokeDashoffset`, dan `blendMode`.
   - Tambahkan helper atribut:
     - `dashAttrs(o)`: menghasilkan `' stroke-dasharray="' + formatDasharray(arr) + '"' + (offset ? ' stroke-dashoffset="' + rd(offset) + '"' : '')`.
     - `blendStyleAttr(o)`: jika `normalizeBlendMode(o.blendMode) !== 'normal'`, menghasilkan `' style="mix-blend-mode:' + mode + ';"'`. Terapkan pada `<path>`, `<text>`, `<image>`, atau `<g>` wrapper stroke-align.
   - **Cabang `effectiveStrokeAlign(o) === 'center'` (atau stroke tidak terlihat):**
     - Emit `<path .../>` tunggal seperti sekarang, dilengkapi `dashAttrs(o)` (saat stroke terlihat) dan `blendStyleAttr(o)`.
   - **Cabang `effectiveStrokeAlign(o)` = `'inside'` atau `'outside'` (dengan stroke terlihat):**
     - Bungkus objek ke dalam `<g id="<uq(o.name)>" data-geovanta-stroke-align="inside|outside" data-stroke-width="<w>" data-stroke-linecap="<cap>" data-stroke-linejoin="<join>" ...>` yang menyimpan seluruh atribut metadata round-trip (`data-stroke-miterlimit`, `data-paint-order`, `data-stroke-dasharray`, `data-stroke-dashoffset`, `data-non-scaling-stroke`, `data-fill-style`, `data-stroke-style`, `data-gen`, `data-effects`), serta `opacity`, `style="mix-blend-mode:..."`, dan `filter="url(#...)"` di level grup `<g>`.
     - *Penanganan objek campuran subpath tertutup + terbuka* *(Keputusan desainer)*: baik pada mode non-dash maupun mode dashed, pisahkan subpath terbuka (`!sp.closed`) dan emit sebagai saudara `<path data-geovanta-role="stroke-open" fill="none" stroke="<strokeA>" stroke-width="<w>" ... d="<openD>"/>` tanpa clip/mask pada ketebalan normal `w` (persis cocok dengan render CanvasKit §5D.2), sedangkan hanya subpath tertutup yang memakai band ekspansi atau `<clipPath>`/`<mask>` `2×w`.
     - *Mode Non-Dash (Ekspansi Geometri):*
       - Bangun `fillEl = '<path data-geovanta-role="fill" fill="' + fillA + '"' + fillRuleAttr + ' stroke="none" d="' + origD + '"/>'` (tetap di-emit walaupun `fill === 'none'` agar kurva Bézier asli dan lubang preserved saat diimpor ulang).
       - Bangun `strokeEl`: hasil ekspansi subpath tertutup `alignedStrokeOutlineSubs(o)` menjadi `<path data-geovanta-role="stroke-outline" fill="' + strokeA + '" fill-rule="evenodd" stroke="none" d="' + expandedClosedD + '"/>` (ditambah `stroke-open` bila ada subpath terbuka). Jika `alignedStrokeOutlineSubs` mengembalikan fallback (mis. `> 64` ring atau degenerasi), fallback otomatis ke `<clipPath>` / `<mask>` untuk subpath tertutup agar ekspor tidak pernah kosong.
     - *Mode Dashed (`parseDasharray(o.strokeDasharray)` non-null) atau fallback clip/mask:*
       - Untuk `'inside'`: tambahkan `<clipPath id="sa-clip-N"><path d="<closedOrigD>" [fill-rule="..."]/></clipPath>` ke `<defs>`.
       - Untuk `'outside'`: hitung `bb = tightBBox` subpath tertutup dengan margin `o.strokeWidth * miter + 4`, lalu tambahkan `<mask id="sa-mask-N" maskUnits="userSpaceOnUse" x="..." y="..." width="..." height="..."><rect x="..." y="..." width="..." height="..." fill="#ffffff"/><path d="<closedOrigD>" fill="#000000" [fill-rule="..."]/></mask>` ke `<defs>`.
       - Emit `fillEl` + `strokeEl = '<path data-geovanta-role="stroke-dashed" fill="none" stroke="' + strokeA + '" stroke-width="' + rd(o.strokeWidth * 2) + '" ... clip-path/mask="url(#...)" d="' + closedOrigD + '"/>'` (ditambah saudara `stroke-open` bila ada subpath terbuka).
     - Urutkan `strokeEl` lalu `fillEl` bila `o.paintOrder === 'stroke fill'`, atau `fillEl` lalu `strokeEl` untuk default `'fill stroke'`.
3. **Parsing SVG di `svgDocumentParser.tsx`**:
   - Tambah `stroke-dasharray` dan `stroke-dashoffset` ke daftar atribut pewarisan `walk()` (diterapkan ke objek path).
   - **Semantik non-inherited `mix-blend-mode` *(Keputusan desainer)*:** `mix-blend-mode` **tidak** dimasukkan ke daftar pewarisan `walk()` (mengikuti spesifikasi CSS/SVG dan §2 Non-Goals). Baca `mix-blend-mode` hanya pada elemen daun (`<path>`/shape, `<text>`, `<image>`) serta wrapper `<g data-geovanta-stroke-align="...">`. Bila SVG eksternal memiliki `mix-blend-mode` non-`normal` pada kontainer `<g>`/`<svg>`/`<a>`/`<use>` biasa (bukan wrapper stroke-align Geovanta), jangan mendorongnya ke anak; catat dengan `noteUnsupported('g', el.getAttribute('id'), 'mix-blend-mode')`.
   - Untuk `stroke-dasharray` dan `stroke-dashoffset` pada `<path>` non-`nonScalingStroke` yang mengalami transform matriks berskala `sc !== 1`, kalikan elemen dasharray dan dashoffset dengan `sc` agar tampilan tetap konsisten dengan `strokeWidth * sc`.
   - **Round-Trip `<g data-geovanta-stroke-align="inside|outside">`:**
     - Deteksi grup dengan atribut `data-geovanta-stroke-align` sebelum rekursi standar `<g>`.
     - Kumpulkan `<path data-geovanta-role="fill">` untuk memperoleh geometri asli `subs` (termasuk bila ada subpath terbuka yang digabung atau dicocokkan dengan `<path data-geovanta-role="stroke-open">`), `fill`, `grad`, dan `fillRule` (mendukung matriks grup `m`).
     - Kumpulkan `<path data-geovanta-role="stroke-outline">`, `<path data-geovanta-role="stroke-dashed">`, atau `<path data-geovanta-role="stroke-open">` untuk memperoleh `stroke` dan `strokeGrad` (`fill` pada `stroke-outline` atau `stroke` pada `stroke-dashed`/`stroke-open` dipetakan ke `stroke` / `strokeGrad` objek).
     - Baca ulang `data-stroke-width`, `data-stroke-linecap`, `data-stroke-linejoin`, `data-stroke-miterlimit`, `data-paint-order`, `data-stroke-dasharray`, `data-stroke-dashoffset`, `data-non-scaling-stroke`, `data-fill-style`, `data-stroke-style`, `data-gen`, `data-effects`, `opacity`, `mix-blend-mode`, serta `group` induk, lalu hasilkan **satu** `VectorObject` utuh.
     - Pastikan id `<mask id="sa-mask-...">` milik wrapper ini tidak memicu peringatan `noteUnsupported('mask', ...)` saat parsing.

---

### F. Tata Letak UI Inspektor ([EditorRightInspector.tsx](../../../src/components/editor/EditorRightInspector.tsx))

Seluruh penambahan hooks (`useState` / `useRef`) wajib diletakkan **tanpa syarat** di bagian atas komponen (mematuhi aturan `PELINDUNG HOOKS` yang sudah ada).

1. **Seksi Appearance**:
   - Tambahkan baris kontrol **Blend mode** menggunakan komponen `<Select>` kustom dengan `data-testid="blend-mode-select"` (aktif untuk seluruh objek tak terkunci dalam `sel.objs`: path, teks, dan gambar).
   - Mendukung pratinjau/pilihan langsung ke-16 mode melalui `setProp('blendMode', v)` (dengan normalisasi `'normal'`).
2. **Seksi Stroke (Gating Khusus Path)** *(Keputusan desainer)*:
   - Definisikan `strokeObjs = paintObjs.filter(o => !o.img && o.type !== 'text')`, `strokeTargetIds = new Set(strokeObjs.map(o => o.id))`, dan `strokeCp = strokeObjs[0] || null`.
   - **Seleksi murni teks atau gambar (`strokeObjs.length === 0`):** sembunyikan seksi `Stroke` (objek teks tetap bisa dikonversi ke path lewat *Ubah ke Path*; `textToPath.tsx` tetap mempertahankan penyalinan properti stroke legacy bila ada).
   - **Seleksi campuran Teks + Path (`strokeObjs.length > 0`):** tampilkan seksi `Stroke` membaca dari `strokeCp`, dan terapkan seluruh mutasi stroke (warna, gradien, lebar, cap/join/miter, paint order, alignment, dash) hanya pada `strokeTargetIds` (melewati objek `text` dan `img`).
   - **Header**: judul `Stroke`, tombol fokus gizmo kanvas jika relevan, tombol Pipette (`vePipetteStroke`), dan tombol Toggle None/Show (`veStrokeNone` — saat menonaktifkan ke `'none'`, bersihkan juga `strokeGrad: null` dan `strokeStyleId`).
   - **Paint & Gradient**: `<GradientEditorPanel slot="stroke" ... />` (pilihan Solid, Linear, Radial, Angular, None) + baris solid `ColorField` / `ColorText` / Copy / Paste (`readPaintClipboard('any')` agar tempel gradien ke stroke ikut bekerja; baris solid disembunyikan saat `VE.strokeGradOn(strokeCp)` aktif) + badge tautan `strokeStyleId`.
   - **Properti Stroke Detail** (tampil ketika `VE.strokeGradOn(strokeCp) || strokeCp.stroke !== 'none'`):
     1. **Ketebalan Bebas (`Width`):** baris gabungan `XfField` (`min=0`, `max=10000`, `step=0.5`, `data-testid="stroke-width-input"`) dan `Slider` (`min=0`, `max=50`, `step=0.5`, live preview via `livePaint`, commit via `commitPaint`/`commitObjs`). Nilai di atas `50` tetap bisa diketik atau di-scrub bebas lewat `XfField`, sementara slider ter-clamp rapi ke `50` sebagai kontrol cepat.
     2. **Stroke Alignment:** `<Seg>` 3 opsi: `Inside` (`inside`), `Center` (`center`), `Outside` (`outside`), `data-testid="stroke-align-seg"`. Jika semua objek yang sedang diseleksi tidak memiliki subpath tertutup (`!hasClosedStrokeTarget`), tombol `Inside` dan `Outside` dinonaktifkan dengan keterangan tooltip bahwa alignment memerlukan bentuk tertutup.
     3. **Paint Order:** `<Seg>` 2 opsi: `Di Depan` (`fill stroke`) vs `Di Belakang` (`stroke fill`), `data-testid="stroke-paint-order-seg"`.
     4. **Cap & Join:** `<Seg>` untuk `Linecap` (`butt` / `round` / `square`, `data-testid="stroke-linecap-seg"`) dan `<Seg>` untuk `Linejoin` (`miter` / `round` / `bevel`, `data-testid="stroke-linejoin-seg"`).
     5. **Miter Limit:** tampil saat `(strokeCp.strokeLinejoin || 'round') === 'miter'`, memakai `XfField` (`min=1`, `step=0.5`, default `4`, `data-testid="stroke-miterlimit-input"`).
     6. **Dashed & Dotted** *(Keputusan desainer)*:
        - Tambah state lokal `dashCustomOpen` (di-reset saat seleksi berganti).
        - Baris preset `<Seg>` / pill: `Solid`, `Dashed`, `Dotted`, `Dash-Dot`, `Custom` (`data-testid="stroke-dash-preset"`).
        - Klik `Solid` -> `dashCustomOpen = false`, set `{ strokeDasharray: null, strokeDashoffset: 0 }`; klik `Dashed` / `Dotted` / `Dash-Dot` -> `dashCustomOpen = false`, terapkan `dashPresetValues(preset, sw)`; klik `Custom` -> `dashCustomOpen = true` (bila sebelumnya `Solid` dengan `strokeDasharray == null`, otomatis inisialisasi `[8, 4]` agar input & pratinjau langsung aktif). Selama `dashCustomOpen === true`, pill `Custom` tetap aktif walaupun angka yang diketik kebetulan cocok dengan rumus preset.
        - Saat `dashCustomOpen || activePreset !== 'solid'`: tampilkan `CustomTextBox` (`data-testid="stroke-dasharray-input"`, mengedit pola otomatis mengatur `dashCustomOpen = true`) untuk mengedit pola angka `dasharray` (mis. `8 4` atau `12 4 2 4`) dan `Range` (`-100..100`, step `1`, live preview) + input angka `Dash Offset` (`data-testid="stroke-dashoffset-range"`).

---

## 6. Diserahkan ke Implementer (What's Left to the Builder)

- Penamaan pasti kunci kamus i18n baru di [appI18n.tsx](../../../src/constants/appI18n.tsx) serta entri tooltip ID & EN di [tooltipsCatalog.tsx](../../../src/constants/tooltipsCatalog.tsx) mengikuti konvensi penamaan yang sudah ada.
- Penyesuaian minor tata letak, tinggi maksimum popover `Select` blend mode, dan padding CSS dalam `.fig-right-sidebar` agar seluruh kontrol baru muat lega dan responsif pada viewport sempit.
- Pembuatan dan penyusunan file tes Playwright (`tests/tahap1-*.spec.ts`) untuk memverifikasi pure logic, rendering piksel CanvasKit (dash, inside/outside alignment, stroke gradient, blend modes), interaksi UI inspektor, gizmo kanvas, serta round-trip ekspor-impor SVG.
