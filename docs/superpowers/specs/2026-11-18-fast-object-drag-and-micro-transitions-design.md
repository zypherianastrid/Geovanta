# Desain: Perbaikan Performa Drag Objek Super Ringan & Sistem Mikro-Transisi Halus

**Tanggal:** 2026-11-18  
**Skala:** Perubahan menengah terfokus

## 1. Tujuan & Alasan
1. Memperbaiki bug performa di mana memindahkan objek di kanvas terasa sangat berat (terukur **130–207 ms/frame / ~5–7 FPS** di Chromium untuk 20–400 objek) agar menjadi sangat ringan, responsif, dan mendekati 60–120 FPS (target `< 16–25 ms/frame` pada adegan 150–400 objek).
2. Menambahkan transisi dan animasi halus sederhana (~140–220 ms) secara konsisten pada semua interaksi UI yang ada tanpa menambah beban rendering kanvas atau menimbulkan efek karet saat drag.

## 2. Akar Masalah Terbukti (Hasil Systematic Debugging)
Pengukuran Playwright pada `web/index.html` (20, 150, dan 400 objek; Snap ON & OFF):
- **Akar Masalah #1 (~95% latensi):** Pada [sceneRenderer.tsx](../../../src/renderer/sceneRenderer.tsx), saat drag objek (`this.dragOffset != null`), flag `interacting` hanya membaca `this.cameraInteracting` sehingga bernilai `false`. Akibatnya setiap frame drag tetap menjalankan **4-pass 2× RGSS supersampling** (`N <= 200`) atau 2-pass 2× RGSS (`N > 200`) dan menggambar ulang **100% seluruh objek statis** di kanvas dari nol.
- **Akar Masalah #2 (skalabilitas Snap):** Pada [multiSnapSolver.tsx](../../../src/engine/multiSnapSolver.tsx), `solveMultiSnap` tetap memanggil `edgeFn()` (`snapMany` + `snapOutline`) meski kedua sumbu sudah tersnap (`lockX && lockY`), dan baik `snapMany` maupun `snapOutline` membangun ulang seluruh daftar target dari seluruh objek/node/midpoint dokumen pada setiap `pointermove` alih-alih memakai ulang `cache.targets`.
- **Akar Masalah #3 (event mentah tak di-coalesce):** Pada [VectorEditor.tsx](../../../src/components/editor/VectorEditor.tsx), drag objek pada `onPointerMove` mengeksekusi snap + DOM transform secara sinkron pada setiap event mentah (120–1000 Hz) tanpa coalescing per `requestAnimationFrame`.

## 3. Ruang Lingkup (Goals, Non-Goals, Anti-Goals)
- **Goals:**
  1. Menambahkan **Static Background Layer Cache** di `SceneRenderer` selama drag objek: render lapisan statis (`passMode: 'static'`) sekali ke snapshot offscreen, lalu pada setiap frame drag cukup 1× `drawImage` snapshot statis + render cepat hanya objek yang digeser (`passMode: 'moving'`).
  2. Menambahkan mode `sceneInteracting` pada `SceneRenderer` agar interaksi drag objek, node, handle, scale, dan rotate melewati 4-pass RGSS selama pointer bergerak, lalu merender frame tajam penuh (RGSS) saat `pointerUp` / selesai.
  3. Mengoptimasi `solveMultiSnap`, `snapMany`, dan `snapOutline` agar tidak menjalankan `edgeFn` saat kedua sumbu sudah terkunci dan memakai ulang target snap ter-cache (`cachedTargets`) tanpa mengubah hasil presisi snap.
  4. Melakukan rAF coalescing pada drag objek di `VectorEditor.tsx` (dengan flush sinkron pada `onPointerUp` agar posisi akhir 100% akurat).
  5. Menambahkan sistem mikro-transisi & animasi halus sederhana (140–220 ms) secara seragam pada seluruh interaksi UI: sidebar kanan masuk (`vedRightSidebarIn`), strip kontekstual (`Simplify`/`Offset`), subpanel inspektor, popover/modal/toast, tombol/tab/chip/checkbox/switch/layer row (`:hover`, `:active`, `:focus-visible`).
- **Non-Goals:**
  - Tidak mengubah algoritma matematika snap, prioritas snap, atau API eksternal dokumen SVG.
  - Tidak menambahkan library animasi baru di luar CSS native/Tailwind offline bundle yang sudah ada.
- **Anti-Goals:**
  - **Dilarang** memasang CSS `transition` pada posisi/transform elemen kanvas yang sedang di-drag (`[data-drag-*]`, `<canvas>`) agar drag tetap instan tanpa lag/efek karet.
  - Tidak boleh menyebabkan kebocoran memori offscreen surface/image CanvasKit (`dispose`/`delete` wajib dipanggil saat drag berakhir, resize, fallback CPU, atau unmount).
  - Semua animasi/transisi wajib otomatis mati saat `html[data-motion="off"]` atau `prefers-reduced-motion: reduce` aktif.

## 4. Pendekatan yang Dipertimbangkan
1. **Pendekatan 1 — Static-Layer Cache + Interactive Fast Render + Coalesced Drag/Snap + Sistem Mikro-Transisi Terpadu *(Dipilih)***
   - Biaya tiap frame drag menjadi `O(objek yang digeser)` (bukan `O(seluruh dokumen × 4 pass)`), ditambah optimasi snap ter-cache dan rAF coalescing. Mikro-animasi dikelola terpusat di CSS bundle agar konsisten dan ringan di GPU compositor (`transform` & `opacity`).
2. **Pendekatan 2 — Hanya menonaktifkan RGSS saat drag tanpa Static-Layer Cache**
   - Ditolak karena pada dokumen dengan ratusan/ribuan objek, setiap frame drag tetap harus merasterisasi ulang seluruh objek statis di kanvas.

## 5. Keputusan Desain Teknis
- **`CanvasKitScene.drawScene` (`src/renderer/canvasKitScene.tsx`):**
  - Mendukung `options.passMode?: 'all' | 'static' | 'moving'` (default `'all'`). `'static'` hanya menjalankan `drawPass(false)`; `'moving'` hanya menjalankan `drawPass(true)`.
- **`SceneRenderer` (`src/renderer/sceneRenderer.tsx`):**
  - Menambah `setSceneInteracting(active: boolean)` dan `releaseDragStaticCache()`.
  - Selama `isObjectDragging` (`this.dragOffset?.ids?.size > 0`):
    - Membangun `this.dragStaticImage` sekali pada 1× surface (`dragStaticSurface`, `smoothEdges: true`, `passMode: 'static'`) dengan `dragStaticKey` mencakup dimensi, `doc`, `revisionId`, kamera, `bg`, `showGrid`, `clipFrames`, `frameBoxes`, `editingTextId`, `_accentColor`, dan `dragOffset.ids`.
    - Pada setiap frame drag: `canvas.clear(TRANSPARENT)` → `canvas.drawImage(this.dragStaticImage, 0, 0, null)` → `drawVectorFrame(..., passMode: 'moving', skipBackground: true, skipGrid: true, smoothEdges: true, interacting: true)` → `surface.flush()`.
  - Saat drag selesai (`setDragOffset(null, 0, 0)` / `!isObjectDragging`): memanggil `releaseDragStaticCache()` lalu merender frame akhir tajam (RGSS penuh).
  - Saat `this.sceneInteracting` aktif (drag node/handle/scale/rotate): ikut mengaktifkan jalur `interacting = true` (1-pass cepat di CPU, fast 2-pass di GPU), dan kembali tajam penuh begitu dilepas.
- **Snap Solver (`src/engine/multiSnapSolver.tsx`):**
  - `solveMultiSnap`: gerbang tahap 3 (`cfg.edge`) menjadi `if (hasTargets && cfg.edge && !ptKind && (!lockX || !lockY))`.
  - `snapMany` & `snapOutline`: menerima `opt.cachedTargets` opsional; bila tersedia (dan cocok dengan mode `noNode`), langsung menjalankan `snapPoints(opt.cachedTargets, ...)` tanpa membangun ulang `createTargets()` atas seluruh dokumen.
  - `buildSnapCache`: menyertakan `edgeTargetsNoNode` (atau lazily membangun sekali per drag di `dg.sc`) agar `snapMany` (`noNode: true`) dan `snapOutline` sama-sama O(1) setup per frame.
- **Drag Loop (`src/components/editor/VectorEditor.tsx`):**
  - Coalesce `dg.type === 'obj'` pada `onPointerMove` memakai `objDragRafRef` + `objDragPendingRef` (1× komputasi snap + DOM transform + `requestRender` per frame), dengan flush sinkron sebelum `flushFastObjDrag` di `onPointerUp`.
  - Memanggil `sceneRendererRef.current?.setSceneInteracting(true)` saat mulai drag objek/node/handle/scale/rotate dan `setSceneInteracting(false)` saat `onPointerUp`.
- **Sistem Mikro-Transisi Halus (`src/vendor/tailwindOfflineBundle.tsx`):**
  - Animasi masuk: `vedRightSidebarIn` untuk `.fig-right-sidebar`, `vedStripIn` untuk `.vc-simp-strip`, transisi halus untuk `.toast`, `.fig-isec`, `.ov`, `.flt`, `.ctx`.
  - Mikro-interaksi `:active:not(:disabled)` (`transform: scale(0.96)`) untuk tombol interaktif (`.tool-btn`, `.btn`, `.fig-cta-btn`, `.fig-ibtn`, `.ved-pill`, `.fig-sidebar-edge-toggle`, `.fig-rail-grp`, `.crn-chip`, `.vc-ibtn`, `.ws-back-btn`, `.ws-card-fav-btn`).
  - Memastikan `.snp-sw` & `.snp-sw::after` memiliki transisi geser halus saat `:root:not([data-motion="off"])` (bukan ditimpa `transition: none` di mode normal).
  - Menjaga aturan `html[data-motion="off"]` dan `@media (prefers-reduced-motion: reduce)` menonaktifkan seluruh animasi/transisi baru.

## 6. Diserahkan ke Implementer
- Detail ambang batas pengukuran tes Playwright performa drag (memastikan frame rata-rata drag turun drastis dari ~200 ms ke jauh di bawah target, serta akurasi posisi akhir dan visual pasca-drag tetap utuh).
- Penyesuaian minor timing easing CSS (`cubic-bezier(.22, 1, .36, 1)`, 140–220 ms) agar semua interaksi terasa serasi.
