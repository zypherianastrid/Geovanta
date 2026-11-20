# Perbaikan Performa Drag Objek Super Ringan & Sistem Mikro-Transisi Halus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah performa drag objek dari ~130–207 ms/frame menjadi sangat ringan dan cepat (< 25 ms/frame bahkan pada CanvasKit CPU dengan ratusan objek) melalui Static-Layer Caching, interactive fast rendering, optimasi snap ter-cache, dan rAF coalescing, sekaligus menambahkan sistem mikro-transisi dan animasi halus sederhana pada semua interaksi UI.

**Architecture:** `CanvasKitScene.drawScene` menerima `passMode` (`'all' | 'static' | 'moving'`) sehingga `SceneRenderer` dapat merender lapisan statis (latar + grid + objek selain `drag.ids`) sekali saja ke offscreen snapshot saat drag objek dimulai, lalu pada tiap frame drag cukup 1× `drawImage` + render objek yang digeser saja. Di sisi interaksi, `multiSnapSolver` memakai ulang target snap ter-cache serta melewati `edgeFn` saat kedua sumbu sudah terkunci, `VectorEditor` melakukan rAF coalescing pada drag objek (dengan flush sinkron di `pointerUp`) serta mengaktifkan `setSceneInteracting` selama drag/transform, dan `tailwindOfflineBundle.tsx` menambahkan lapisan mikro-transisi & animasi halus terpadu yang patuh penuh pada `data-motion="off"`.

**Tech Stack:** React 18, TypeScript/TSX, CanvasKit WASM, esbuild (`npm run build:web`), Tailwind Offline CSS AST (`src/vendor/tailwindOfflineBundle.tsx`), Playwright (`@playwright/test`).

**Spec:** `docs/superpowers/specs/2026-11-18-fast-object-drag-and-micro-transitions-design.md`

## Global Constraints

- Semua pengujian otomatis WAJIB menggunakan Playwright Regular (`@playwright/test`, `npx playwright test <path>`) dan build offline WAJIB dijalankan via `npm run build:web` sebelum menjalankan tes Playwright terhadap `web/index.html`.
- `releaseDragStaticCache()` WAJIB memanggil `.delete()` pada `dragStaticImage` dan `.dispose()` pada `dragStaticSurface` saat drag selesai, saat `ensureSurface` berubah ukuran, saat `fallbackToCpu()`, dan saat `dispose()` agar tidak ada kebocoran memori WASM/GPU.
- **Dilarang** memasang CSS `transition` pada posisi/transform elemen kanvas yang sedang di-drag (`[data-drag-id]`, `[data-drag-batch]`, `[data-drag-container]`, `[data-drag-extra]`, `[data-drag-nodes]`, `.ved-canvas canvas`).
- Seluruh animasi/transisi baru WAJIB dibungkus `:root:not([data-motion="off"])` dan tetap dinonaktifkan oleh `html[data-motion="off"]` maupun `@media (prefers-reduced-motion: reduce)`.
- Animasi `.vc-simp-strip` tidak boleh menimpa `transform: translateX(-50%)` atau posisi statis `EditorSimplifyStrip` (gunakan properti independen `translate` + `opacity`).
- Tidak boleh merusak semantik snap, Alt-duplicate drag, seleksi objek, maupun tes zoom/pan/seam yang sudah ada.

## Review Focus

1. **Alt-duplicate drag saat tengah menggeser objek (`e.altKey` ditekan/dilepas saat drag):** `altDupMove` membatalkan `fastTx` dan beralih ke `live(...)`; cache lapisan statis di `SceneRenderer` harus otomatis dilepas saat `setDragOffset(null, 0, 0)` dipanggil sehingga tidak menampilkan bayangan objek lama (diuji di Task 1 & 2).
2. **Fast flick-and-release (`pointermove` lalu segera `pointerup` sebelum rAF berikutnya jalan):** Flush sinkron `objDragPendingRef` di `onPointerUp` harus menerapkan delta posisi terakhir sebelum `flushFastObjDrag(dg)` agar posisi akhir objek tidak pernah tertinggal (diuji di Task 2).
3. **Drag objek yang memiliki `backgroundBlur` atau `dropShadow`:** Snapshot statis sudah di-blit ke `canvas` sebelum `drawPass(true)`, sehingga backdrop blur tetap melihat latar belakang di bawahnya dan drop shadow objek yang digeser tetap ikut berpindah mulus (diuji di Task 1).
4. **Perubahan kamera/grid/background atau `dispose()` saat cache statis ada:** `dragStaticKey` harus menyertakan dimensi, `doc`, `revisionId`, kamera, `bg`, `showGrid`, `clipFrames`, `frameBoxes`, `editingTextId`, `_accentColor`, dan `dragOffset.ids`, serta `releaseDragStaticCache()` dipanggil di `dispose()`, `fallbackToCpu()`, dan `ensureSurface()` (diuji di Task 1).
5. **Mode `data-motion="off"` dan elemen drag SVG:** Saat `data-motion="off"` aktif, durasi animasi & transisi harus nonaktif (`0.01ms` / `none`), dan elemen `[data-drag-*]` pada kanvas tidak pernah memiliki CSS transition bahkan saat motion aktif (diuji di Task 3).

---

### Task 1: Static-Layer Cache & Interactive Fast Render di `CanvasKitScene` dan `SceneRenderer`

**Files:**
- Modify: `src/renderer/canvasKitScene.tsx:829-1081`
- Modify: `src/renderer/sceneRenderer.tsx:42-55,131-175,224-252,303-451,480-496`
- Create: `tests/object-drag-performance.spec.ts`

**Interfaces:**
- Consumes: `CanvasKitScene.drawScene`, `SceneRenderer.drawFrame`, `SceneRenderer.drawVectorFrame`, `SceneRenderer.setDragOffset`
- Produces:
  - `CanvasKitScene.drawScene(canvas, objects, view, options)` mendukung `options.passMode?: 'all' | 'static' | 'moving'`
  - `SceneRenderer.setSceneInteracting(active: boolean): void`
  - `SceneRenderer.releaseDragStaticCache(): void`
  - `SceneRenderer.drawFrame()` jalur fast static-layer cache saat `this.dragOffset?.ids?.size > 0`

- [ ] **Step 1: Tulis tes Playwright gagal di `tests/object-drag-performance.spec.ts` untuk `passMode` dan kecepatan drag objek 150 objek**

Buat `tests/object-drag-performance.spec.ts` berisi:
1. Unit test `'CanvasKitScene.drawScene menghormati passMode static vs moving'`:
   - Dengan mock kit + 2 objek (1 statis, 1 di `drag.ids`), verifikasi `passMode: 'static'` hanya menggambar objek statis (`visibleObjects === 1`), `passMode: 'moving'` hanya menggambar objek bergerak (`visibleObjects === 1`), dan `'all'` menggambar keduanya (`visibleObjects === 2`).
2. Integration perf test `'drag objek pada adegan 150 objek jauh lebih cepat (< 35ms/frame rata-rata) dan posisi akhir akurat'`:
   - Muat SVG 150 path kurva ke `web/index.html`, pilih objek pertama, lakukan 15 langkah drag (`pointerdown` → 15× `mouse.move` + `requestAnimationFrame` → `pointerup`).
   - Verifikasi rata-rata durasi frame drag `< 35ms` (sebelumnya ~195–207ms!), objek benar-benar berpindah ke koordinat baru, dan setelah `pointerup` drag cache bersih (`canvas` tetap merender utuh).

- [ ] **Step 2: Jalankan Playwright test untuk memastikan tes gagal (RED)**

Run: `npx playwright test tests/object-drag-performance.spec.ts`
Expected: FAIL (`passMode` belum didukung dan rata-rata frame drag ~195ms > 35ms).

- [ ] **Step 3: Implementasikan `passMode` di `CanvasKitScene` dan Static-Layer Cache + `setSceneInteracting` di `SceneRenderer`**

1. Di `src/renderer/canvasKitScene.tsx` (`drawScene`, baris 829–1081):
   - Baca `const passMode = options.passMode || 'all';`.
   - Jalankan `if (passMode !== 'moving') drawPass(false);` dan `if (drag && passMode !== 'static') drawPass(true);`.
2. Di `src/renderer/sceneRenderer.tsx`:
   - Tambahkan field `this.sceneInteracting = false`, `this.dragStaticSurface = null`, `this.dragStaticImage = null`, `this.dragStaticKey = null`, `this.dragStaticW = 0`, `this.dragStaticH = 0`.
   - Tambahkan metode `setSceneInteracting(active)` (mirroring `setCameraInteracting`: set flag, dan saat `active === false` atau `!RENDER_CONFIG.antialias`, set `this.dirty = true`).
   - Tambahkan metode `releaseDragStaticCache()` yang memanggil `this.dragStaticImage?.delete()`, `this.dragStaticSurface?.dispose()`, dan me-reset seluruh field cache ke `null/0`. Panggil di `dispose()`, `fallbackToCpu()`, `ensureSurface()` saat ukuran berubah, serta saat `!isObjectDragging` di `setDragOffset` / `drawFrame`.
   - Perbarui `drawVectorFrame` menerima opsi `skipBackground = false`, `skipGrid = false` (atau lewat `options`): bila `skipBackground` true, tidak memanggil `canvas.clear(...)`; bila `skipGrid` true, tidak memanggil `this.drawGrid(...)`.
   - Pada `drawFrame()`:
     - Hitung `const isObjectDragging = Boolean(this.dragOffset && this.dragOffset.ids && this.dragOffset.ids.size > 0);`
     - Hitung `const interacting = Boolean(this.cameraInteracting || this.sceneInteracting || isObjectDragging);`
     - Jika `isObjectDragging`:
       - Bangun `staticKey` (gabungan `pw, ph, this.revisionId, zoom, panX, panY, background, this.showGrid, this.clipFrames, this.editingTextId, this._accentColor` + pembanding referensi `this.dragStaticDoc === this.doc`, `this.dragStaticIds === this.dragOffset.ids`, `this.dragStaticFrames === this.frameBoxes`).
       - Jika `!this.dragStaticImage || this.dragStaticKey !== staticKey || this.dragStaticDoc !== this.doc || this.dragStaticIds !== this.dragOffset.ids || this.dragStaticFrames !== this.frameBoxes`:
         - Buat/pakai ulang `dragStaticSurface` ukuran `(pw, ph)` via `this.surface.makeSurface(...)`.
         - Gambar lapisan statis sekali ke `dragStaticSurface.getCanvas()` via `drawVectorFrame(..., { ...options, passMode: 'static' }, pw, ph, true, true, 0, 0, pw, ph)`.
         - Hapus `this.dragStaticImage` lama jika ada, lalu simpan `this.dragStaticImage = this.dragStaticSurface.makeImageSnapshot()` beserta metadata kunci.
       - Pada frame drag: `canvas.clear(kit.TRANSPARENT)`, `canvas.drawImage(this.dragStaticImage, 0, 0, null)`, lalu `stats = this.drawVectorFrame(canvas, null, { ...options, passMode: 'moving', skipBackground: true, skipGrid: true }, pw, ph, true, true, 0, 0, pw, ph)`.
     - Jika `!isObjectDragging`:
       - Panggil `this.releaseDragStaticCache()` lalu jalankan jalur render normal (`useRgss` / 1-pass AA).

- [ ] **Step 4: Build bundle web dan jalankan tes Playwright untuk verifikasi Task 1 (GREEN)**

Run: `npm run build:web && npx playwright test tests/object-drag-performance.spec.ts tests/zoom-pan-seams-and-perf.spec.ts`
Expected: PASS (semua tes di kedua file lulus dan rata-rata frame drag turun jauh di bawah 35ms).

---

### Task 2: Optimasi Snap Solver (`multiSnapSolver.tsx`) & rAF-Coalesced Drag Loop (`VectorEditor.tsx`)

**Files:**
- Modify: `src/engine/multiSnapSolver.tsx:144-182,252-276,490-570,860-876`
- Modify: `src/components/editor/VectorEditor.tsx:1150-1160,5540-5640,6250-6455`
- Modify: `tests/object-drag-performance.spec.ts`

**Interfaces:**
- Consumes: `SceneRenderer.setSceneInteracting`, `VE.buildSnapCache`, `VE.solveMultiSnap`, `VE.snapMany`, `VE.snapOutline`
- Produces:
  - `buildSnapCache` menyertakan lazy helper / properti `edgeTargetsNoNode` pada objek cache `dg.sc`
  - `snapMany(..., opt)` dan `snapOutline(..., opt)` mendukung `opt.cachedTargets`
  - `solveMultiSnap`: gerbang `cfg.edge` melewati komputasi bila `lockX && lockY`
  - `VectorEditor`: rAF coalescing drag objek (`objDragRafRef` / `objDragPendingRef`) dengan flush sinkron di `onPointerUp`, serta sinkronisasi `sceneRendererRef.current?.setSceneInteracting(true/false)`

- [ ] **Step 1: Tambahkan tes Playwright gagal di `tests/object-drag-performance.spec.ts` untuk optimasi snap & fast flick-and-release 400 objek**

Tambahkan 3 tes ke `tests/object-drag-performance.spec.ts`:
1. `'solveMultiSnap melewati edgeFn saat kedua sumbu sudah tersnap dan snapMany dengan cachedTargets memberi hasil identik'`:
   - Uji langsung `solveMultiSnap` ketika snap bbox sudah mengunci X & Y → pastikan `edgeFn` dipanggil `0` kali.
   - Uji `snapMany` dengan `cachedTargets` vs tanpa `cachedTargets` → hasil `{ dx, dy }` identik.
2. `'drag objek cepat pada 400 objek dengan Snap ON tetap ringan (JS avg < 5ms, frame avg < 35ms) dan tidak kehilangan posisi akhir saat fast release'`:
   - Muat 400 objek, aktifkan Snap ON, kirim burst cepat 20 `mouse.move` tanpa menunggu rAF di antara sebagian langkah lalu segera `mouse.up()`, verifikasi posisi akhir objek sesuai delta terakhir dan performa drag sangat ringan.
3. `'Alt-duplicate drag membuat salinan baru di posisi akhir tanpa error atau ghost render'`:
   - Muat 10 objek, drag objek pertama sambil menahan `Alt`, verifikasi jumlah objek bertambah 1 dan objek hasil duplikasi berpindah.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan tes baru gagal (RED)**

Run: `npx playwright test tests/object-drag-performance.spec.ts`
Expected: FAIL (`edgeFn` masih dipanggil saat `lockX && lockY`).

- [ ] **Step 3: Implementasikan optimasi `multiSnapSolver.tsx` dan rAF coalescing + `setSceneInteracting` di `VectorEditor.tsx`**

1. Di `src/engine/multiSnapSolver.tsx`:
   - Di `snapMany(pts, objects, exObjs, exNodes, thr, opt)`: jika `opt.cachedTargets` ada, gunakan langsung `const t = opt.cachedTargets;` tanpa membangun ulang `createTargets()` atas seluruh `objects`.
   - Di `snapOutline(samples, segs, objects, exObjs, thr, dx, dy, opt)`: jika `opt.cachedTargets` ada, gunakan langsung `const t = opt.cachedTargets;` tanpa membangun ulang `createTargets()` atas seluruh `objects`.
   - Di `buildSnapCache`: sediakan properti `getEdgeTargets(noNode)` (atau simpan `targets` dan bangun `edgeTargetsNoNode` secara malas sekali per drag dari objek selain `exObjs`/`exNodes` dengan bbox + midpoint saja bila `noNode === true`).
   - Di `solveMultiSnap` baris 863: ubah gerbang menjadi `if (hasTargets && cfg.edge && !ptKind && (!lockX || !lockY))`.
2. Di `src/components/editor/VectorEditor.tsx`:
   - Pada `edgeFn` di `onPointerMove` (baris 6285–6300): teruskan `cachedTargets: dg.sc.getEdgeTargets ? dg.sc.getEdgeTargets(true) : undefined` ke `VE.snapMany` dan `cachedTargets: dg.sc.getEdgeTargets ? dg.sc.getEdgeTargets(!cfg.node) : undefined` ke `VE.snapOutline`.
   - Tambahkan `objDragRafRef = useRef(0)` dan `objDragPendingRef = useRef(null)`.
   - Ekstrak langkah komputasi snap + `altDupMove` + frame-drop highlight untuk `dg.type === 'obj'` menjadi helper `applyObjDragStep(ev, dg)` yang dipanggil via 1× `requestAnimationFrame` (`objDragRafRef`), sehingga burst event pointermove 120–1000 Hz hanya dihitung sekali per frame layar.
   - Di `onPointerUp`: jika `objDragRafRef.current` aktif, `cancelAnimationFrame` dan jika `objDragPendingRef.current` ada serta `dg && dg.type === 'obj'`, panggil `applyObjDragStep(objDragPendingRef.current, dg)` secara sinkron SEBELUM `flushFastObjDrag(dg)` agar posisi akhir tidak pernah hilang.
   - Panggil `sceneRendererRef.current?.setSceneInteracting?.(true)` saat mulai gerakan drag (`obj`, `node`, `handle`, `scale`, `rotate`, `imgscale`) dan `sceneRendererRef.current?.setSceneInteracting?.(false)` di `onPointerUp` agar semua transformasi juga bebas 4-pass RGSS saat aktif lalu kembali tajam penuh begitu selesai.

- [ ] **Step 4: Build bundle web dan jalankan tes Playwright untuk verifikasi Task 2 (GREEN)**

Run: `npm run build:web && npx playwright test tests/object-drag-performance.spec.ts tests/frame-shape-snap-grid.spec.ts tests/floating-node-actions.spec.ts`
Expected: PASS (semua tes lulus).

---

### Task 3: Sistem Mikro-Transisi & Animasi Halus Sederhana untuk Semua Interaksi UI

**Files:**
- Modify: `src/vendor/tailwindOfflineBundle.tsx` (seksi motion `:root:not([data-motion="off"])`)
- Create: `tests/ui-micro-transitions.spec.ts`

**Interfaces:**
- Consumes: `:root:not([data-motion="off"])` motion section di `src/vendor/tailwindOfflineBundle.tsx`, `html[data-motion="off"]` override
- Produces:
  - `@keyframes vedRightSidebarIn` untuk `.fig-right-sidebar`
  - `@keyframes vedStripIn` (memakai `translate` + `opacity` agar tidak mengganggu `transform`) untuk `.vc-simp-strip` dan `.toast`
  - Transisi halus seragam + feedback `:active:not(:disabled)` (`scale(0.96)`) untuk tombol floating bar (`.tool-btn`), edge toggle (`.fig-sidebar-edge-toggle`), rail (`.fig-rail-grp`), chip (`.crn-chip`), opsi dropdown (`.opt`, `.ctx-i`), checkbox (`.c-chk-box`), strip button (`.vc-ibtn`), dan kartu/tombol workspace
  - Guard eksplisit `transition: none !important` untuk elemen drag kanvas (`[data-drag-id]`, `[data-drag-batch]`, `[data-drag-container]`, `[data-drag-extra]`, `[data-drag-nodes]`, `.ved-canvas canvas`)

- [ ] **Step 1: Tulis tes Playwright gagal di `tests/ui-micro-transitions.spec.ts`**

Buat `tests/ui-micro-transitions.spec.ts` dengan skenario:
1. `'sidebar kanan memiliki animasi vedRightSidebarIn dan kontrol interaktif memiliki transisi halus saat motion aktif'`:
   - Buka editor, pastikan `html[data-motion]` tidak `'off'`.
   - Verifikasi `getComputedStyle(document.querySelector('.fig-right-sidebar')).animationName` adalah `'vedRightSidebarIn'`.
   - Verifikasi `.fig-floating-bar .tool-btn`, `.fig-sidebar-edge-toggle-right`, `.fig-rail-grp` memiliki `transitionDuration !== '0s'`.
   - Verifikasi elemen drag kanvas (`.ved-canvas canvas` dan `[data-drag-id]` setelah membuat & memilih shape) memiliki `transitionProperty === 'none'` atau `transitionDuration === '0s'`.
2. `'mengaktifkan data-motion="off" mematikan seluruh animasi dan transisi secara konsisten'`:
   - Set `document.documentElement.setAttribute('data-motion', 'off')`, verifikasi `.fig-right-sidebar` dan `.tool-btn` memiliki durasi `0.00001s` (`<= 1ms`) atau `animationName === 'none'`.
3. `'EditorSimplifyStrip tetap berada pada posisi statisnya meski diberi animasi vedStripIn'`:
   - Buka Simplify strip (`openVcSimplify()`), verifikasi `.vc-simp-strip` terlihat, `animationName` mengandung `vedStripIn`, dan posisi tidak bergeser melenceng dari tengah bawah.

- [ ] **Step 2: Jalankan Playwright test untuk memastikan tes gagal (RED)**

Run: `npx playwright test tests/ui-micro-transitions.spec.ts`
Expected: FAIL (`vedRightSidebarIn` dan `vedStripIn` belum ada).

- [ ] **Step 3: Tambahkan lapisan mikro-transisi & animasi halus terpadu di `src/vendor/tailwindOfflineBundle.tsx`**

Di dalam `TAILWIND_PLUGIN_AST` pada seksi `:root:not([data-motion="off"])` tepat di sekitar `vedSidebarIn`:
1. Tambahkan `@keyframes vedRightSidebarIn` (`from { opacity: 0; transform: translateX(10px) }`, `to { opacity: 1; transform: translateX(0) }`) dan terapkan pada `:root:not([data-motion="off"]) .fig-right-sidebar` (`animation: vedRightSidebarIn .22s cubic-bezier(.22, 1, .36, 1) both`).
2. Tambahkan `@keyframes vedStripIn` (`from { opacity: 0; translate: 0 6px }`, `to { opacity: 1; translate: 0 0 }`) dan terapkan pada `:root:not([data-motion="off"]) .vc-simp-strip, :root:not([data-motion="off"]) .toast` (`animation: vedStripIn .2s cubic-bezier(.22, 1, .36, 1) both`).
3. Perluas aturan transisi halus `:root:not([data-motion="off"])` agar juga mencakup `.fig-sidebar-edge-toggle`, `.fig-rail-grp`, `.crn-chip`, `.vc-ibtn`, `.c-chk`, `.c-chk-box`, `.ws-back-btn`, `.ws-card-fav-btn`, `.fig-isec`.
4. Perluas feedback tekan halus `:active:not(:disabled)` (`transform: scale(0.96) !important`) ke `.tool-btn`, `.fig-sidebar-edge-toggle`, `.fig-rail-grp`, `.crn-chip`, `.vc-ibtn`, `.ws-back-btn`, `.ws-card-fav-btn`, `.pin3 button`, `.gch button`, `.seg button`, `.fig-aln-bar button`, `.fig-flow-bar button` serta `.opt:not([aria-disabled="true"]):active` (`transform: scale(0.985) !important`).
5. Tambahkan guard eksplisit: `.ved-canvas canvas, [data-drag-id], [data-drag-batch], [data-drag-container], [data-drag-extra], [data-drag-nodes] { transition: none !important }`.

- [ ] **Step 4: Build bundle web dan jalankan seluruh suite verifikasi Playwright + typecheck (GREEN)**

Run: `npm run typecheck && npm run build:web && npx playwright test tests/object-drag-performance.spec.ts tests/ui-micro-transitions.spec.ts tests/simplify-strip-position.spec.ts tests/right-sidebar-toggle.spec.ts tests/zoom-pan-seams-and-perf.spec.ts tests/draw-tools.spec.ts tests/frame-shape-snap-grid.spec.ts tests/floating-node-actions.spec.ts`
Expected: PASS (0 error TypeScript, semua tes Playwright lulus).
