# Color Styles, Select Same + Find & Replace, Efek, dan Recolor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan Color Styles / swatch dokumen, Select Same, Find & Replace warna, Efek (drop shadow, layer blur, background blur), dan Recolor berbasis hue (Shift Hue + Palette Mapping) ke Geovanta, dengan satu ZIP + screenshot bukti di akhir.

**Architecture:** Dua workstream dalam satu plan (keputusan user: Pendekatan A): warna (Task 1–7) dan efek (Task 8–9), lalu verifikasi akhir (Task 10). Warna dibangun di atas satu color-walk dokumen bersama (`collectDocumentColors` / `mapDocumentColors`); efek dibangun di atas resep CanvasKit yang SUDAH TERBUKTI lewat spike (bukan janji). Setiap task berakhir dengan deliverable yang bisa diuji sendiri.

**Tech Stack:** React 18 + CanvasKit 0.42.0 (`bin/`, build default) + esbuild; tes unit `node --test tests/*.test.cjs` (pola `loadSource` via esbuild + `Module._compile`); probe Playwright (`playwright-core` 1.65.0); tanpa dependensi baru.

**Spec:** `docs/superpowers/specs/2026-11-13-color-styles-recolor-effects-design.md` — plan ini berargumen dari spec; executor membaca keduanya. Keputusan user yang mengikat: Pendekatan A; blur = Layer Blur + Background Blur; Mode 1 = delta seragam (bukan remap); Recolor/Find & Replace pada objek tertaut = unlink objek (opsi B); edit ColorField pada objek tertaut = unlink objek itu saja (opsi A, perilaku Figma).

## Global Constraints

- Working copy BUKAN repo git; plan melarang `git commit`. "Commit" = backup `.bak-colorfx-t<N>` per task SEBELUM edit pertama tiap file. Gabungan semua `.bak-colorfx-t<N>` = keadaan pra-plan.
- Tanpa dependensi baru.
- UI Bahasa Indonesia; semua label baru id+en di `src/constants/appI18n.jsx`; semua kontrol baru masuk katalog tooltip `src/constants/tooltipsCatalog.jsx` (id+en, format `{t, d}`).
- Verifikasi di browser asli (Playwright, Chromium headless) pada kasus nyata; curl/mock bukan bukti untuk perilaku browser. Screenshot dilihat isinya.
- `npm test` = `node --test tests/*.test.cjs`; build `npm run build:web` (exit 0, 0 warning); setiap perubahan src WAJIB `npm run build:web` sebelum probe.
- Server app port 8931 (root working copy), mock fonts port 8941; keduanya mati saat VM restart — nyalakan ulang (nohup + PID file) sebelum probe apa pun. Probe: `NODE_PATH=/home/hatch/workspace/vector-editor/node_modules node probes/<probe>.cjs`.
- Backup `.bak` sebelum edit destruktif; diff minimal; ikuti spesifikasi apa adanya; tidak ada perluasan scope tanpa persetujuan.
- Hanya controller yang mengedit ledger (`docs/superpowers/plans/2026-11-13-color-styles-recolor-effects-progress.md`). Implementer/reviewer TIDAK mengedit ledger.
- Snapshot pra-task di `docs/superpowers/plans/sdd-2026-11-13-color-styles-recolor-effects/snapshots/task-N/`; review package = `diff -u` snapshot vs file saat ini + file baru utuh.
- Nama ZIP final: `Geovanta-ColorStyles-Recolor-Effects.zip` (perintah Task 10, dari root working copy, `-x "node_modules/*" "*.bak*" "docs/superpowers/plans/sdd-2026-11-13-color-styles-recolor-effects/*"`).
- Pola tes unit: `loadSource(relPath)` via esbuild bundle CJS + `Module._compile` (persis `tests/figma-text.test.cjs`).
- Panel baru memakai komponen kustom yang sama seperti fungsi lain, bukan input HTML native.

## Review Focus

Lima kelas input / mode gagal yang diimplikasikan spec tapi tidak diuji task mana pun — masing-masing sudah dipasangkan ke task pemiliknya (tesnya ada di langkah task itu):

1. **Hex yang sama dipakai sebagai stop gradien DAN flat fill** — Find & Replace / Recolor harus mengubah keduanya; bila hanya satu yang berubah, gradien jadi setengah-setengah. → Task 5 (langkah 5), Task 6 (langkah 5).
2. **Undo/redo edit style harus mengembalikan keadaan tautan, bukan hanya hex.** Sesudah undo, objek yang tadinya tertaut harus kembali tertaut (bukan jadi warna lepas dengan hex yang sama). → Task 2 (langkah 7), Task 3 (langkah 6).
3. **Efek pada objek terotasi / diskala** — offset shadow dan bounds blur harus mengikuti transform objek (ruang dokumen, bukan ruang layar); background blur harus mengaburkan area di belakang bbox hasil transform. → Task 8 (langkah 6), Task 9 (langkah 6).
4. **Keluarga hue merah yang straddle 0°/360°** — rentang sumber 340°–20° harus mencakup warna merah di kedua sisi; implementasi rentang yang naif (`min <= h <= max`) akan kehilangan setengah keluarga merah. → Task 6 (langkah 6).
5. **Find & Replace dengan From atau To = 'none'** — mengganti warna menjadi 'none' (menghapus fill) harus bekerja; mengganti FROM 'none' harus ditolak dengan pesan (bukan crash, bukan mengubah semua objek tanpa fill). → Task 5 (langkah 6).

## File Structure

**Dibuat:**
- `src/engine/colorWalk.jsx` — walk + baca + tulis warna dokumen (dipakai Task 5, 6, 7; dan Select Same Task 4 untuk pencocokan).
- `src/engine/colorStyles.jsx` — model `doc.styles`, tautan, unlink, validasi parser.
- `src/engine/recolorEngine.jsx` — keluarga hue OKLCH, Shift Hue, Palette Mapping (murni, tanpa React).
- `src/engine/effectsEngine.jsx` — model `o.effects`, validasi parser, helper filter-id/def XML untuk serializer.
- `src/components/modals/FindReplaceColorModal.jsx` — panel Find & Replace (Task 5).
- `src/components/modals/RecolorModal.jsx` — modal Recolor tab Mode 1 / Mode 2 (Task 7).
- `tests/color-walk.test.cjs`, `tests/color-styles.test.cjs`, `tests/select-same.test.cjs`, `tests/find-replace-color.test.cjs`, `tests/recolor-engine.test.cjs`, `tests/effects.test.cjs`
- `probes/probe-color-styles.cjs`, `probes/probe-select-same.cjs`, `probes/probe-find-replace.cjs`, `probes/probe-recolor.cjs`, `probes/probe-effects.cjs`

**Diubah:**
- `src/utils/colorMath.jsx` — tambah helper HSL (`hex2hsl`, `hsl2hex`) + helper hue OKLCH (`oklchHue`).
- `src/engine/svgDocumentSerializer.jsx` — tulis `<metadata id="geovanta-doc">` (styles), atribut `data-fill-style` / `data-stroke-style`, atribut `data-effects` + `<filter>` defs.
- `src/engine/svgDocumentParser.jsx` — baca metadata styles, tautan style, `data-effects`; abaikan atribut `filter` bila `data-effects` ada (bila tidak ada, perilaku lama: `noteUnsupported`).
- `src/components/editor/VectorEditor.jsx` — context menu Select Same; mounting modal Find & Replace + Recolor; wiring history (commit/live) untuk keduanya; handler unlink ColorField.
- `src/components/editor/EditorRightInspector.jsx` — seksi Color Styles, indikator tautan, seksi Effects, tombol "Recolor…".
- `src/renderer/canvasKitScene.jsx` — render efek per objek (drop shadow, layer blur via offscreen image, background blur via clip + saveLayer).
- `src/constants/appI18n.jsx`, `src/constants/tooltipsCatalog.jsx` — semua kunci baru id+en.

---

### Task 1: Color engine foundations — HSL, hue OKLCH, dan color-walk dokumen

**Files:**
- Modify: `src/utils/colorMath.jsx`
- Create: `src/engine/colorWalk.jsx`
- Test: `tests/color-walk.test.cjs`

**Interfaces:**
- Consumes: `cssToHex` dari `src/utils/colorParserAndFormatter.jsx`; `gradOn`, `strokeGradOn` dari `src/engine/gradientEngine.jsx`.
- Produces (dipakai Task 4, 5, 6, 7):
  - `hex2hsl(hex) -> [h, s, l]` (h 0–360, s/l 0–1); `hsl2hex(h, s, l) -> '#rrggbb'` (lowercase).
  - `oklchHue(hex) -> { h, c, l }` — h 0–360 via `atan2(b, a)` dari `rgb2ok` yang sudah ada, c = `hypot(a, b)`, l = L.
  - `collectDocumentColors(doc, scope) -> [{ hex, count, kinds, ids, stopKeys }]` — `hex` lowercase via `cssToHex`; `kinds` subset dari `['fill', 'stroke', 'grad', 'text']`; `ids` = id objek; `stopKeys` = `objId#stopId` untuk stop gradien. `scope` = `{ kind: 'all' } | { kind: 'selection', ids: Set }`. Melewati objek `locked`, `hidden`, dan `img` (gambar tidak punya warna vektor). Mencakup: fill, stroke, stop gradien fill (`o.grad`) dan stroke (`o.strokeGrad`), fill teks per objek, background frame.
  - `mapDocumentColors(doc, fn, scope) -> { doc, changed, unlinked }` — `fn(slot) -> hexBaru | null` (null = tidak berubah); `slot` = `{ kind: 'fill' | 'stroke' | 'grad' | 'text', obj, stopIdx? }`. Bila slot berubah DAN objek membawa tautan style untuk slot itu (`fillStyleId`/`strokeStyleId`), tautan DIHAPUS (keputusan user 2B) dan `unlinked` bertambah. `changed` = jumlah slot yang berubah. Murni (tidak mutasi `doc`).

- [ ] **Step 1: Write the failing test** — `tests/color-walk.test.cjs`: `hex2hsl('#2563eb')` ≈ `[221, 0.83, 0.53]` (±1°/±0.02); round-trip `hsl2hex(...hex2hsl('#e11d48')) === '#e11d48'`; `oklchHue('#2563eb').h` dalam 230–270 dan `.c > 0.1`; `collectDocumentColors` pada doc fixture (2 path fill sama + 1 path stroke sama + 1 gradien 2 stop + 1 teks + 1 objek locked + 1 image) mengembalikan entri yang benar (locked dan image tidak muncul; stop gradien muncul dengan `kind: 'grad'` dan `stopKeys` berisi); `mapDocumentColors` dengan fn yang mengganti satu hex mengembalikan `changed` yang benar dan TIDAK memutasi doc input (assert `doc` input tetap sama dengan `JSON.stringify` sebelum).
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/color-walk.test.cjs`
Expected: FAIL (modul/fungsi tidak ditemukan).

- [ ] **Step 3: Implement `hex2hsl` / `hsl2hex` / `oklchHue` di `src/utils/colorMath.jsx`** — HSL standar (rumus max/min/delta, h dari segmen dominan); `oklchHue` dari `rgb2ok` yang sudah ada.
- [ ] **Step 4: Implement `collectDocumentColors` / `mapDocumentColors` di `src/engine/colorWalk.jsx`** — satu walk datar atas `doc.objects` (model datar; group = field `group`, jadi satu walk mencakup group/frame). Untuk gradien: baca `o.grad.rawStops || o.grad.stops` (pola `selectionColors`, `VectorEditor.jsx:1664`), stop key `o.id + '#' + (st.id || stIdx)`; stop stroke dari `o.strokeGrad` dengan pola yang sama. Fill teks: `o.text.fill` (terverifikasi dari serializer: `<text … fill="t.fill">` di `svgDocumentSerializer.jsx:78`). Background frame: objek frame (`containerType === 'frame'` atau `isFrameBg`) memakai `o.fill` sebagai background — baca via slot `fill` yang sama.
- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/color-walk.test.cjs`
Expected: PASS.

- [ ] **Step 6: Backup** — buat `.bak-colorfx-t1` untuk `src/utils/colorMath.jsx` SEBELUM edit pertama (bila belum dibuat di awal task; backup dibuat sebelum edit, bukan sesudah).

---

### Task 2: Color Styles — model, serializer, parser round-trip

**Files:**
- Create: `src/engine/colorStyles.jsx`
- Modify: `src/engine/svgDocumentSerializer.jsx`, `src/engine/svgDocumentParser.jsx`
- Test: `tests/color-styles.test.cjs`

**Interfaces:**
- Consumes: `collectDocumentColors` / `mapDocumentColors` (Task 1); `cssToHex`, `validColor` (colorParserAndFormatter); `gradOn` (gradientEngine, hanya bila style menyentuh gradien — TIDAK: style v1 hanya fill/stroke solid).
- Produces (dipakai Task 3, 5, 6, 7):
  - `createStyle(doc, name, hex) -> { doc, style }` — `style = { id: 'sty-' + <unik>, name, hex }` (hex lowercase via `cssToHex`); id unik terhadap `doc.styles`.
  - `renameStyle(doc, id, name) -> doc`; `deleteStyle(doc, id) -> doc` — objek yang menaut ke style yang dihapus menjadi warna lepas (hex terakhir dipertahankan, tautan dihapus).
  - `linkStyle(doc, objIds, slot, styleId) -> doc` — `slot` = `'fill' | 'stroke'`; menulis `fillStyleId`/`strokeStyleId` + hex style ke `fill`/`stroke`.
  - `unlinkStyle(doc, objIds, slot) -> doc` — hapus tautan, hex dipertahankan.
  - `applyStyleEdit(doc, styleId, nextHex) -> doc` — tulis ulang `fill`/`stroke` SEMUA objek yang menaut ke style itu (satu operasi; history ditangani pemanggil via `commitObjs`/`commit`).
  - `validateStyles(raw) -> styles[]` — untuk parser: `raw` harus array; tiap entri `{ id: string non-empty, name: string, hex: valid via validColor + cssToHex }`; entri tak valid dibuang; id duplikat → pertahankan yang pertama.
  - `unlinkOnDirectPaintEdit(doc, objId, slot, nextHex) -> doc` — keputusan user 3A: edit langsung lewat ColorField pada objek tertaut menghapus tautan slot itu saja (dipakai Task 3).

- [ ] **Step 1: Write the failing test** — `tests/color-styles.test.cjs`: `createStyle` menghasilkan id unik + hex lowercase; `linkStyle` menulis `fillStyleId` + hex; `applyStyleEdit` mengubah SEMUA objek tertaut (2 objek) dan TIDAK mengubah objek bebas dengan hex yang sama; `deleteStyle` membuat objek tertaut jadi warna lepas dengan hex terakhir; `validateStyles` membuang entri ber-hex tak valid dan id duplikat; `unlinkOnDirectPaintEdit` menghapus tautan hanya pada objek itu saja.
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/color-styles.test.cjs`
Expected: FAIL (modul tidak ditemukan).

- [ ] **Step 3: Implement model di `src/engine/colorStyles.jsx`** — semua fungsi di atas, murni (tidak mutasi `doc`).
- [ ] **Step 4: Serializer — tulis styles + tautan.** Baca `serializeDoc` (`svgDocumentSerializer.jsx`) dulu. Tulis `<metadata id="geovanta-doc">{"styles":[...]}</metadata>` tepat sesudah tag `<svg ...>` pembuka (hanya bila `doc.styles` non-empty). Tulis `data-fill-style="id"` / `data-stroke-style="id"` pada elemen path/text yang menaut (preseden: `data-gen`, `:93`). Test: serialize doc fixture dengan 1 style + 2 objek tertaut → string SVG memuat metadata JSON + kedua atribut.
- [ ] **Step 5: Parser — baca styles + tautan.** Baca perakitan doc (`svgDocumentParser.jsx:630`, `viewBox: vb`) dulu. Parser membaca `metadata#geovanta-doc` (JSON.parse dalam try/catch → gagal = `styles: []`), validasi via `validateStyles`, dan memasang `doc.styles`. Tautan `data-fill-style`/`data-stroke-style` dibaca per elemen; id yang tidak ada di `doc.styles` dibuang (jadi warna lepas). Test round-trip: serialize → parse → `doc.styles` sama + tautan sama + hex sama. Test negatif: metadata JSON rusak → `styles: []`, tidak crash; tautan ke id yang tidak ada → tautan dibuang.
- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/color-styles.test.cjs`
Expected: PASS.

- [ ] **Step 7: Test Review Focus 2** — tambah tes: doc fixture dengan style + 2 objek tertaut; `applyStyleEdit` (commit) lalu undo lalu redo (pakai mekanisme history yang sama dengan aplikasi — bila history tidak bisa dipakai di tes unit murni, tulis tes ini sebagai skenario probe di Task 3 dan catat di laporan; JANGAN menulis tes unit yang berpura-pura menguji history). (Review Focus 2.)
- [ ] **Step 8: Backup** — `.bak-colorfx-t2` per file SEBELUM edit pertama.

---

### Task 3: Color Styles UI — inspector, recent colors, indikator tautan

**Files:**
- Modify: `src/components/editor/EditorRightInspector.jsx`, `src/components/editor/VectorEditor.jsx`
- Test: `probes/probe-color-styles.cjs` (baru)
- I18n/tooltip: `src/constants/appI18n.jsx`, `src/constants/tooltipsCatalog.jsx`

**Interfaces:**
- Consumes: `createStyle`, `renameStyle`, `deleteStyle`, `linkStyle`, `unlinkStyle`, `applyStyleEdit`, `unlinkOnDirectPaintEdit` (Task 2); `selectionColors` + `replaceSelectionColor` (sudah ada — JANGAN diubah perilakunya); `commitObjs`, `commit`, `say` (VectorEditor).
- Produces: seksi inspector "Color Styles" + recent colors (dipakai Task 5/7 sebagai pemilih warna); perilaku unlink-on-edit (dipakai Task 5/6 sebagai kontrak).

- [ ] **Step 1: Write the failing probe** — `probes/probe-color-styles.cjs`: buat dokumen baru (2 rect + 1 teks); buat style "Brand" dari fill rect pertama (via UI inspector); terapkan style ke rect kedua (klik swatch); edit hex style → assert KEDUA rect berubah (baca fill via export SVG) dan teks tidak berubah; edit fill rect pertama lewat ColorField biasa → assert hanya rect pertama berubah + indikator tautan hilang + rect kedua tetap ikut style; hapus style → assert kedua rect jadi warna lepas (hex terakhir) + toast. RED dulu: seksi Styles belum ada.
- [ ] **Step 2: Run probe to verify it fails**

Run: `NODE_PATH=/home/hatch/workspace/vector-editor/node_modules node probes/probe-color-styles.cjs` (server app 8931 + mock 8941 hidup dulu; `npm run build:web` sesudah tiap perubahan src).
Expected: FAIL (sektor/selector tidak ditemukan).

- [ ] **Step 3: Implement seksi "Color Styles" di `EditorRightInspector.jsx`** (di atas seksi Fill): daftar swatch dokumen (nama + hex + jumlah objek tertaut); tombol buat style dari warna seleksi saat ini; klik swatch = taut fill seleksi ke style itu (via `linkStyle` + commit satu langkah); edit hex style (ColorField) = `applyStyleEdit` + commit satu langkah; rename (input kustom, pola yang ada); hapus (dengan konfirmasi? — TIDAK: hapus langsung + toast, mengikuti pola hapus yang ada; bila pola yang ada memakai konfirmasi, ikuti itu dan catat). Recent colors: 10 warna terakhir dari ColorField (disimpan di prefs, kunci baru `recentColors`), tampil di bawah daftar style.
- [ ] **Step 4: Implement indikator tautan + unlink-on-edit.** Di seksi Fill/Stroke, bila objek primer tertaut style, tampilkan nama style + tombol unlink. Handler `on()` ColorField Fill/Stroke: bila objek tertaut dan nilai baru ≠ hex style → panggil `unlinkOnDirectPaintEdit` dalam commit yang sama (keputusan user 3A). Indikator hilang sesudah edit (assert probe Step 1).
- [ ] **Step 5: I18n + tooltip.** Semua label baru id+en (`appI18n.jsx`); semua kontrol baru masuk `tooltipsCatalog.jsx` (id+en, format `{t, d}` cerminan `veArc*`). Build harus 0 warning (kunci duplikat langsung ketahuan dari warning build — hapus duplikatnya, pola Task 4).
- [ ] **Step 6: Run probe + regression.** Probe Step 1 PASS; `npm test` hijau; build 0 warning; regresi: `probe-figma-text.cjs` 15/15 + `probe-new-tools.cjs` 12/12 (inspector disentuh — regresi teks dan tool baru wajib hijau). Review Focus 2: skenario probe undo/redo edit style — edit style, Ctrl+Z → assert tautan + hex kembali; Ctrl+Y → assert kembali berubah (bila mekanisme undo aplikasi tidak bisa dipicu dari probe, catat sebagai batas dan uji manual via langkah yang sama di laporan).
- [ ] **Step 7: Backup** — `.bak-colorfx-t3` per file SEBELUM edit pertama.

---

### Task 4: Select Same (fill / stroke / tipe)

**Files:**
- Modify: `src/engine/colorWalk.jsx` (tambah `selectSame`), `src/components/editor/VectorEditor.jsx` (context menu + seleksi)
- Test: `tests/select-same.test.cjs`, `probes/probe-select-same.cjs` (baru)
- I18n/tooltip: `src/constants/appI18n.jsx`, `src/constants/tooltipsCatalog.jsx`

**Interfaces:**
- Consumes: `collectDocumentColors` (Task 1, untuk normalisasi hex); `setSel`, `say` (VectorEditor).
- Produces: `selectSame(doc, refObj, criterion) -> string[]` — didefinisikan di `src/engine/colorWalk.jsx` (Task 1) karena ia query dokumen murni; Task 4 hanya wiring UI. `criterion` = `'fill' | 'stroke' | 'type'`; `type` = `path | text | image | frame` (baca dari bentuk objek yang ada). Perbandingan warna: hex ternormalisasi via `cssToHex` (case-insensitive). Melewati objek `locked` dan `hidden`.

- [ ] **Step 1: Write the failing test** — `tests/select-same.test.cjs`: doc fixture (3 path fill `#2563eb` + 1 path fill `#e11d48` + 1 teks fill `#2563eb` + 1 path locked fill `#2563eb`): `selectSame(doc, refPathBiru, 'fill')` mengembalikan 3 id (2 path + 1 teks — teks ikut karena fill-nya sama; locked TIDAK ikut); `'stroke'` mengembalikan yang stroke-nya sama saja; `'type'` dengan ref path mengembalikan semua path (tidak termasuk teks/image/frame).
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/select-same.test.cjs`
Expected: FAIL (fungsi tidak ditemukan).

- [ ] **Step 3: Implement `selectSame`.**
- [ ] **Step 4: Wiring context menu.** Tambah 3 entri di `ctxItems` (`VectorEditor.jsx:7519`, sesudah grup Copy/Paste/Duplicate/Delete): "Select Same Fill", "Select Same Stroke", "Select Same Type" (label id+en; `dis: !selObjs.length`). Aksi: hitung dari objek terpilih pertama, `setSel` ke hasil, toast "N objek dipilih — fill sama" (N dari hasil; bila 0 tambahan selain acuan, toast "Tidak ada objek lain yang sama").
- [ ] **Step 5: Run test + probe.** `npm test` hijau. Probe `probe-select-same.cjs` (baru): dokumen fixture 100+ path (campur fill), klik kanan satu path biru → "Select Same Fill" → assert jumlah layer terseleksi = jumlah path biru di dokumen (baca dari panel layer `[data-layer-id]`); ulangi untuk Stroke dan Type. 0 pageerror.
- [ ] **Step 6: Backup** — `.bak-colorfx-t4` per file SEBELUM edit pertama.

---

### Task 5: Find & Replace warna — engine + modal, cakupan seleksi/dokumen

**Files:**
- Create: `src/components/modals/FindReplaceColorModal.jsx`
- Modify: `src/components/editor/VectorEditor.jsx`, `src/components/editor/EditorRightInspector.jsx` (tombol buka modal dari seksi Selection colors)
- Test: `tests/find-replace-color.test.cjs`, `probes/probe-find-replace.cjs` (baru)
- I18n/tooltip: `src/constants/appI18n.jsx`, `src/constants/tooltipsCatalog.jsx`

**Interfaces:**
- Consumes: `collectDocumentColors` / `mapDocumentColors` (Task 1); `selectionColors` + `replaceSelectionColor` (sudah ada — seksi Selection colors TIDAK diubah; modal ini jalur dokumen, bukan duplikasi); `livePaint`, `commitPaint`, `commit`, `say` (VectorEditor).
- Produces: `findReplaceColor(doc, fromHex, toHex, scope, opts = {}) -> { doc, changed, unlinked }` — pencocokan PERSIS per hex (ternormalisasi via `cssToHex`); `scope` sama dengan Task 1; `opts.limit` (default tak terbatas) = jumlah maksimum slot yang diganti, dalam urutan dokumen (untuk tombol Replace satu-per-satu). `toHex === 'none'` = hapus fill (atur `fill: 'none'`); `fromHex === 'none'` = DITOLAK (throw `Error('from-none-not-supported')`, UI menangkap dan menampilkan pesan). Memakai `mapDocumentColors` sehingga aturan unlink (keputusan 2B) berlaku otomatis. Cakupan warna: fill, stroke, stop gradien (fill+stroke), fill teks, background frame — SAMA dengan Task 1, bukan subset.

- [ ] **Step 1: Write the failing test** — `tests/find-replace-color.test.cjs`: doc fixture (2 path fill `#2563eb` + 1 path stroke `#2563eb` + 1 gradien dengan stop `#2563eb` + 1 teks fill `#2563eb` + 1 objek locked fill `#2563eb` + 1 objek tertaut style fill `#2563eb`): `findReplaceColor(doc, '#2563eb', '#ea580c', { kind: 'all' })` mengubah ke-5 slot (2 fill + 1 stroke + 1 stop + 1 teks), locked TIDAK berubah, objek tertaut ter-unlink (`fillStyleId` hilang, style utuh); `scope` seleksi hanya mengubah objek dalam `ids`. `findReplaceColor(doc, 'none', '#ea580c', …)` throw. `toHex: 'none'` mengatur fill jadi `'none'`. `findReplaceColor(…, { limit: 1 })` mengubah tepat 1 slot (yang pertama dalam urutan dokumen).
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/find-replace-color.test.cjs`
Expected: FAIL (modul tidak ditemukan).

- [ ] **Step 3: Implement `findReplaceColor` + modal.** Modal (pola `SettingsModal` — baca dulu): field From (ColorField + hex), To (ColorField + hex + pilihan 'none'), jumlah kena (dihitung live dari `collectDocumentColors`, tampil sebagai 'ke-N dari M' saat Replace satu-per-satu dipakai), pemilih cakupan Seleksi/Dokumen, tombol **Replace** (satu-per-satu: pratinjau hanya mengubah match pertama yang tersisa — via `opts.limit: 1`; klik = commit match itu saja, satu langkah Undo per klik, lalu pratinjau maju ke match berikutnya), tombol **Replace All** (pratinjau mengubah semua match; klik = commit semua, satu langkah Undo), tombol Tutup. Pratinjau live: perubahan diterapkan via `livePaint`/`live` saat To berubah (pola `replaceSelectionColor`); Cancel/Esc = buang pratinjau (Esc hanya aktif saat modal terbuka dan overlay teks tertutup, pola Task 6 6-tool).
- [ ] **Step 4: Wiring.** Tombol "Find & Replace…" di seksi Selection colors inspector + di seksi Color Styles (Task 3). Shortcut: tidak ada v1.
- [ ] **Step 5: Test Review Focus 1** — tambah ke tes unit Task 5: fixture dengan hex `#2563eb` sebagai stop gradien DAN flat fill; `findReplaceColor` mengubah keduanya (assert stop DAN fill). (Review Focus 1.)
- [ ] **Step 6: Test Review Focus 5** — tambah ke tes unit Task 5: `fromHex 'none'` throw + pesan; `toHex 'none'` menghapus fill (assert `fill === 'none'` dan objek tetap ada). (Review Focus 5.)
- [ ] **Step 7: Run test + probe.** `npm test` hijau. Probe `probe-find-replace.cjs` (baru): dokumen hasil trace (fixture 100+ path, atau hasil trace nyata dari probe sebelumnya — bila tidak ada, buat 100 path acak via `loadTestDoc`); buka modal, From = warna terbanyak, To = oranye, Replace → assert jumlah kena = hitungan dari `collectDocumentColors` sebelum replace; assert pratinjau terlihat sebelum Apply; Ctrl+Z → assert warna kembali (satu langkah Undo); 0 pageerror.
- [ ] **Step 8: Backup** — `.bak-colorfx-t5` per file SEBELUM edit pertama.

---

### Task 6: Recolor engine — keluarga hue OKLCH, Shift Hue, Palette Mapping

**Files:**
- Create: `src/engine/recolorEngine.jsx`
- Test: `tests/recolor-engine.test.cjs`

**Interfaces:**
- Consumes: `collectDocumentColors` / `mapDocumentColors` (Task 1); `hex2hsl` / `hsl2hex` / `oklchHue` (Task 1); `cssToHex` (colorParserAndFormatter).
- Produces (dipakai Task 7):
  - `hueFamilyGroup(colors) -> [{ family, hueCenter, colors }]` — `colors` = entri `collectDocumentColors`. 12 keluarga: `family = floor(h / 30)` (h dari `oklchHue`, 0–360) dengan nama `['red','red-orange','orange','amber','yellow','lime','green','teal','cyan','blue','indigo','violet']` (family 0 = red, center 0°/360°; family 7 = blue, center 210°; dst. — urutan mengikuti roda hue). Kelompok abu-abu terpisah: `chroma < 0.03` (OKLCH) → `family: 'gray'` (termasuk hitam/putih/abu-abu), TIDAK masuk 12 keluarga hue. Urutan keluarga di hasil: red → violet lalu gray terakhir. Tiap keluarga berisi warnanya terurut terang→gelap (L OKLCH menurun).
  - `shiftHueDoc(doc, { deltaHue, satMul = 1, lightMul = 1, hueRange = [min, max], scope }) -> { doc, changed, unlinked }` — keputusan user 1A: delta SERAGAM. `h' = (h + deltaHue) mod 360`; `s' = clamp(s * satMul, 0, 1)`; `l' = clamp(l * lightMul, 0, 1)` (HSL, via `hex2hsl`/`hsl2hex`). Hanya warna yang hue-nya (OKLCH h) masuk `hueRange` yang digeser; di luar rentang TIDAK berubah. Rentang mendukung wrap: bila `min > max`, berlaku `h >= min || h <= max`. Memakai `mapDocumentColors` sehingga aturan unlink (2B) berlaku otomatis.
  - `paletteMapDoc(doc, { familyTargets, overrides, scope }) -> { doc, changed, unlinked }` — `familyTargets: { [family]: hexTarget }`; tiap warna dalam keluarga dipetakan ke hue target (HSL hue dari `hexTarget`) DENGAN S dan L warna asal dipertahankan (urutan terang→gelap dipertahankan); `overrides: { [hexAsalLowercase]: hexTarget }` menimpa per warna (hex target dipetakan penuh: hue+S+L dari hex target). Keluarga yang tidak ada di `familyTargets` TIDAK berubah. Memakai `mapDocumentColors` (unlink otomatis).

- [ ] **Step 1: Write the failing test** — `tests/recolor-engine.test.cjs`: `hueFamilyGroup` pada 6 warna (biru tua `#1e3a8a`, biru muda `#93c5fd`, merah `#dc2626`, hijau `#16a34a`, abu-abu `#6b7280`, putih `#ffffff`) → keluarga blue berisi 2 warna terurut terang→gelap; gray berisi abu-abu + putih; `shiftHueDoc` dengan `deltaHue: -180` dan `hueRange: [190, 260]` mengubah biru tua→oranye tua dan biru muda→oranye muda (S dan L HSL dipertahankan ±0.02), merah/hijau/abu TIDAK berubah; `paletteMapDoc` dengan `familyTargets: { blue: '#ea580c' }` memetakan kedua biru ke hue oranye dengan S/L asal (biru tua tetap lebih gelap dari biru muda); `overrides` menimpa satu hex saja; `unlinked` bertambah untuk objek tertaut yang berubah.
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/recolor-engine.test.cjs`
Expected: FAIL (modul tidak ditemukan).

- [ ] **Step 3: Implement `hueFamilyGroup` / `shiftHueDoc` / `paletteMapDoc` di `src/engine/recolorEngine.jsx`** — murni, tanpa React; tidak ada akses `document`/`window`.
- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/recolor-engine.test.cjs`
Expected: PASS.

- [ ] **Step 5: Test Review Focus 1** — tambah ke tes unit Task 6: fixture dengan hex yang sama sebagai stop gradien DAN flat fill; `shiftHueDoc` mengubah keduanya. (Review Focus 1.)
- [ ] **Step 6: Test Review Focus 4** — tambah ke tes unit Task 6: `shiftHueDoc` dengan `hueRange: [340, 20]` (wrap) mengubah merah `#dc2626` (h≈0°) DAN merah `#e11d48` (h≈350°) DAN TIDAK mengubah oranye `#ea580c` (h≈25° — di luar rentang). (Review Focus 4.)
- [ ] **Step 7: Backup** — `.bak-colorfx-t6` per file SEBELUM edit pertama.

---

### Task 7: Recolor UI — modal Mode 1 / Mode 2, pratinjau live, Undo satu langkah

**Files:**
- Create: `src/components/modals/RecolorModal.jsx`
- Modify: `src/components/editor/VectorEditor.jsx`, `src/components/editor/EditorRightInspector.jsx` (tombol "Recolor…" di seksi Selection colors)
- Test: `probes/probe-recolor.cjs` (baru)
- I18n/tooltip: `src/constants/appI18n.jsx`, `src/constants/tooltipsCatalog.jsx`

**Interfaces:**
- Consumes: `collectDocumentColors` (Task 1), `hueFamilyGroup`, `shiftHueDoc`, `paletteMapDoc` (Task 6); `livePaint`, `commitPaint`, `commit`, `say` (VectorEditor). TIDAK ada tombol "Simpan sebagai style" di modal Recolor (di luar spec yang disetujui — bila user memintanya nanti, itu task baru).
- Produces: modal Recolor (dibuka dari inspector + dari seksi Color Styles); tidak ada ekspor engine baru.

- [ ] **Step 1: Write the failing probe** — `probes/probe-recolor.cjs`: dokumen fixture (3 biru: tua/sedang/muda + 1 merah + 1 hijau + 1 gradien biru 2 stop + 1 teks biru); (a) Mode 1: buka modal, geser hue −180, assert pratinjau langsung berubah (baca fill via export SVG sebelum Apply); Apply → assert ketiga biru jadi oranye dengan urutan terang→gelap TERJAGA (L HSL asal terurut sama), merah/hijau TIDAK berubah, stop gradien ikut berubah, teks ikut berubah; Ctrl+Z → assert semua kembali (satu langkah Undo); (b) Mode 2: buka modal, keluarga blue → target `#ea580c`, assert pratinjau + Apply; override satu warna biru muda ke `#f59e0b` → assert hanya warna itu yang berbeda; Cancel/Esc → assert tidak ada perubahan. RED dulu: tombol Recolor belum ada.
- [ ] **Step 2: Run probe to verify it fails**

Run: `NODE_PATH=/home/hatch/workspace/vector-editor/node_modules node probes/probe-recolor.cjs` (server app 8931 + mock 8941 hidup dulu; `npm run build:web` sesudah tiap perubahan src).
Expected: FAIL (tombol/modal tidak ditemukan).

- [ ] **Step 3: Implement modal Recolor.** Pola `SettingsModal` (baca dulu). Tab Mode 1 / Mode 2. Mode 1: slider hue (delta, −180°..+180°, langkah 1°), slider saturation (pengali 0–2, langkah 0.05), slider lightness (pengali 0–2, langkah 0.05), field rentang hue sumber (min/max, default 190–260), pemilih cakupan Seleksi/Dokumen. Mode 2: daftar keluarga hue (dari `hueFamilyGroup`, tampilkan swatch per warna + jumlah) dengan satu kontrol "ganti ke warna dasar X" (ColorField) per keluarga; klik warna di dalam keluarga = override per warna (ColorField); pratinjau daftar hasil pemetaan (swatch asal → swatch hasil). Semua kontrol = komponen kustom (bukan input HTML native).
- [ ] **Step 4: Pratinjau live + commit.** Setiap perubahan kontrol menerapkan pratinjau via `livePaint`/`live` (pola `replaceSelectionColor` + Task 5); Apply = commit satu langkah (`commitPaint(fn, 'recolor:mode1' | 'recolor:mode2')`); Cancel/Esc = buang pratinjau (Esc hanya aktif saat modal terbuka dan overlay teks tertutup, pola Task 6 6-tool). Toast sesudah Apply menyebut jumlah warna berubah + jumlah objek yang dilepas dari style (bila > 0).
- [ ] **Step 5: I18n + tooltip.** Semua label baru id+en; kontrol baru masuk katalog tooltip. Build 0 warning.
- [ ] **Step 6: Run probe + regression.** Probe Step 1 PASS; `npm test` hijau; build 0 warning; regresi: `probe-find-replace.cjs` + `probe-color-styles.cjs` tetap hijau (modal dan inspector disentuh).
- [ ] **Step 7: Backup** — `.bak-colorfx-t7` per file SEBELUM edit pertama.

---

### Task 8: Efek — drop shadow (model, renderer, inspector, serializer/parser)

**Files:**
- Create: `src/engine/effectsEngine.jsx`
- Modify: `src/renderer/canvasKitScene.jsx`, `src/components/editor/EditorRightInspector.jsx`, `src/engine/svgDocumentSerializer.jsx`, `src/engine/svgDocumentParser.jsx`, `src/components/editor/VectorEditor.jsx` (wiring commit)
- Test: `tests/effects.test.cjs`, `probes/probe-effects.cjs` (baru)
- I18n/tooltip: `src/constants/appI18n.jsx`, `src/constants/tooltipsCatalog.jsx`

**Interfaces:**
- Consumes: `color(value, opacity)` / `parsePaintRgba01` (canvasKitScene, sudah ada); `commitObjs`, `live`, `say` (VectorEditor); `cssToHex`, `validColor` (colorParserAndFormatter).
- Produces (dipakai Task 9):
  - Model: `o.effects = [{ type: 'dropShadow', dx, dy, blur, color, opacity }]` — `dx, dy` piksel dokumen (boleh negatif), `blur` ≥ 0, `color` hex, `opacity` 0–1.
  - `addEffect(obj, effect) -> obj`; `removeEffect(obj, idx) -> obj`; `updateEffect(obj, idx, patch) -> obj`; `toggleEffect(obj, idx) -> obj` (field `disabled: true/false`); `validateEffects(raw) -> effects[]` (parser: array; tiap item type harus `'dropShadow' | 'layerBlur' | 'backgroundBlur'`; field numerik finite dalam rentang; color valid hex; item tak valid dibuang).
  - `effectsFilterId(effects) -> string | null` (serializer: id filter stabil dari isi efek, mis. `'fx-' + hash`); `effectsFilterDefs(effects, id) -> string` (serializer: XML `<filter>` untuk drop shadow + layer blur; background blur TIDAK punya def — lihat Task 9).

- [ ] **Step 1: Write the failing test** — `tests/effects.test.cjs`: `addEffect`/`removeEffect`/`updateEffect`/`toggleEffect` pada objek fixture (murni, tidak mutasi input); `validateEffects` membuang item type tak dikenal, blur negatif, color tak valid, dan menerima item yang benar; `effectsFilterDefs` untuk drop shadow menghasilkan XML yang memuat `feDropShadow` dengan dx/dy/stdDeviation/flood-color/flood-opacity yang benar.
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/effects.test.cjs`
Expected: FAIL (modul tidak ditemukan).

- [ ] **Step 3: Implement model + validasi di `src/engine/effectsEngine.jsx`.**
- [ ] **Step 4: Renderer — drop shadow.** Baca jalur paint objek di `canvasKitScene.jsx` dulu (di mana `new kit.Paint()` dibuat, `:72`, dan di mana fill/stroke digambar, `:170`). Resep: gambar objek NORMAL (tanpa filter) dulu; lalu gambar SATU kali lagi siluet path objek dengan paint yang `setImageFilter(MakeDropShadowOnly(dx, dy, blur, blur, <color+opacity>, null))` — `MakeDropShadowOnly` menggambar HANYA bayangan, bukan bentuknya, sehingga bayangan dijamin tepat satu (bukan ganda bila fill dan stroke memakai paint terpisah). Urutan: bayangan digambar SEBELUM objek (di bawahnya). Bila `MakeDropShadowOnly` tidak ada di runtime build `bin/` (cek `index.d.ts` + spike runtime), pakai `MakeDropShadow` pada SATU paint siluet yang digambar sebelum objek — dan buktikan lewat probe bahwa bayangan tidak ganda (assert kegelapan piksel bayangan dalam toleransi dari opacity). Catat pilihan yang dipakai di laporan.
- [ ] **Step 5: Inspector — seksi "Effects" (di bawah Stroke).** Daftar efek objek terpilih (tipe + ringkasan nilai + toggle eye + hapus); tombol tambah efek (dropdown: Drop Shadow / Layer Blur / Background Blur — Layer Blur dan Background Blur ditambahkan Task 9; v1 Task 8 hanya menampilkan Drop Shadow sebagai pilihan yang AKTIF, dua lainnya disabled dengan keterangan "Task 9"); kontrol per efek: dx, dy, blur, color (ColorField), opacity (slider kustom). Semua perubahan commit satu langkah (pola `commitObjs`); pratinjau live saat slider digeser (pola `live`).
- [ ] **Step 6: Test Review Focus 3 (bagian drop shadow)** — tambah probe: objek terotasi 45° + diskala 2x dengan drop shadow dx=10 dy=10; assert bayangan muncul di arah yang benar (offset mengikuti transform dokumen, bukan layar) — ukur posisi bayangan relatif terhadap bbox objek hasil transform. (Review Focus 3.)
- [ ] **Step 7: Serializer + parser.** Serializer: tulis `data-effects='[...]'` JSON pada elemen (preseden `data-gen`) + `<filter id="fx-…">` defs di `<defs>` + atribut `filter="url(#fx-…)"` pada elemen (hanya untuk efek yang punya def). Parser: baca `data-effects` (validasi via `validateEffects`); atribut `filter` DIABAIKAN bila `data-effects` ada (tidak ada `noteUnsupported`); bila `data-effects` tidak ada tapi atribut `filter` ada → perilaku lama (`noteUnsupported`). Test round-trip: serialize → parse → `o.effects` sama.
- [ ] **Step 8: Run test + probe.** `npm test` hijau. Probe `probe-effects.cjs` (baru, dipakai juga Task 9): rect biru + drop shadow dx=12 dy=12 blur=4 hitam 0.8 → assert piksel bayangan di offset benar (abu-abu, bukan biru, bukan putih) + rect tetap biru + bayangan TIDAK ganda (kegelapan dalam toleransi); export SVG memuat `feDropShadow` + `data-effects`; reload file hasil export → efek tetap ada. 0 pageerror.
- [ ] **Step 9: Backup** — `.bak-colorfx-t8` per file SEBELUM edit pertama.

---

### Task 9: Efek — layer blur + background blur (resep spike, verifikasi di renderer asli)

**Files:**
- Modify: `src/engine/effectsEngine.jsx`, `src/renderer/canvasKitScene.jsx`, `src/components/editor/EditorRightInspector.jsx` (aktifkan dua pilihan yang disabled di Task 8), `src/engine/svgDocumentSerializer.jsx`, `src/engine/svgDocumentParser.jsx`
- Test: `tests/effects.test.cjs` (tambah), `probes/probe-effects.cjs` (tambah skenario)
- I18n/tooltip: `src/constants/appI18n.jsx`, `src/constants/tooltipsCatalog.jsx`

**Interfaces:**
- Consumes: Task 8 (`addEffect`, `updateEffect`, `validateEffects`, `effectsFilterId`).
- Produces: model efek lengkap v1 (`dropShadow`, `layerBlur { radius }`, `backgroundBlur { radius }`); renderer ketiga efek; anggaran performa terukur (langkah 7).

- [ ] **Step 1: Write the failing test** — tambah ke `tests/effects.test.cjs`: `validateEffects` menerima `layerBlur { radius: 8 }` dan `backgroundBlur { radius: 12 }` yang valid, membuang `radius` negatif / bukan angka; `effectsFilterDefs` untuk layer blur menghasilkan XML dengan `feGaussianBlur stdDeviation="8"`; untuk background blur menghasilkan string KOSONG (tidak ada def SVG — keputusan plan, lihat Step 5).
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/effects.test.cjs`
Expected: FAIL (tipe baru tidak dikenal).

- [ ] **Step 3: Renderer — layer blur (resep spike, JANGAN paint filter langsung).** Spike TERBUKTI: `paint.setImageFilter(MakeBlur)` langsung pada shape RUSAK di build ini (shape mengembang keras 3σ tanpa pelembutan). Resep yang dipakai: render objek ke offscreen image dulu (CPU surface `CanvasKit.MakeSurface`, ukuran = bbox objek + margin `ceil(3 * radius)` tiap sisi), lalu `drawImage` dengan paint ber-filter `MakeBlur(radius, radius)` pada posisi `bbox.min - margin`. Verifikasi resep ini DI RENDERER ASLI sebelum klaim (probe Step 8 adalah buktinya; bila resep gagal di renderer asli, laporkan sebagai blocker — JANGAN ganti resep diam-diam dengan paint filter langsung).
- [ ] **Step 4: Renderer — background blur (resep spike, clip WAJIB).** Spike TERBUKTI: `saveLayer` tanpa clip BOCOR ke seluruh kanvas. Resep: `save()` → `clipRect(bboxObjek)` → `saveLayer(null, bounds, MakeBlur(radius, radius))` → gambar objek → `restore()` → `restore()`. Bbox = bbox objek hasil transform (ruang dokumen → ruang layar via transform renderer yang sudah ada). Objek sendiri digambar TAJAM di atas hasil blur (urutan: blur dulu untuk konten di belakang, lalu objek).
- [ ] **Step 5: Serializer + parser — background blur render-only di SVG.** Keputusan plan: background blur TIDAK punya padanan filter SVG (SVG tidak bisa mengakses backdrop). Serializer menulisnya HANYA di `data-effects` (round-trip di aplikasi kita terjaga) dan TIDAK menulis atribut `filter` untuknya; bila dokumen memuat background blur, `exportSvg`/`downloadSvg` menampilkan pemberitahuan satu baris ("Background blur tidak ikut terekspor ke SVG — hanya tampil di aplikasi"). Layer blur diekspor sebagai `feGaussianBlur` (def + atribut `filter`). Test: round-trip serialize → parse mempertahankan ketiga tipe efek.
- [ ] **Step 6: Test Review Focus 3 (bagian blur)** — tambah probe: objek terotasi 30° dengan layer blur radius 8 → assert tepi blur mengikuti bbox hasil transform (tidak ada halo di luar margin `3*radius`); objek di atas rect merah/biru dengan background blur radius 10 → assert area DI DALAM bbox objek ter-blur (kontras dalam runtuh) dan area DI LUAR bbox tetap tajam (kontras penuh) — pola ukur spike (rasio kontras dalam/luar). (Review Focus 3.)
- [ ] **Step 7: Anggaran performa.** Ukur `draw+flush` (pola `runAutomatedBenchmarks` / probe timing): dokumen 100 objek ber-efek (campur ketiga tipe) vs 100 objek polos; catat ms keduanya. Bila efek > 3x polos, tambah cache per-objek (kunci: id objek + JSON efek + bbox; invalidasi saat objek berubah) dan ukur ulang. Bila ≤ 3x, catat angkanya dan lewati cache. Angka ini masuk laporan akhir Task 10.
- [ ] **Step 8: Run test + probe.** `npm test` hijau. Probe `probe-effects.cjs` (skenario baru): layer blur radius 8 pada rect merah di atas biru → assert gradien halus di tepi (tiga titik ukur: merah murni → campuran → biru murni, pola spike) + tidak ada ekspansi keras di luar margin; background blur radius 10 → assert dalam runtuh / luar tajam (pola spike); export + reload mempertahankan ketiga efek; 0 pageerror.
- [ ] **Step 9: Backup** — `.bak-colorfx-t9` per file SEBELUM edit pertama.

---

### Task 10: Verifikasi akhir, screenshot, ZIP

**Files:**
- Test: semua probe + `npm test` + build
- Output: `~/workspace/your_files/Geovanta-ColorStyles-Recolor-Effects.zip` + 6+ screenshot di `probes/shots/color-effects/`

**Interfaces:**
- Consumes: semua task 1–9 (tidak ada kode baru kecuali perbaikan dari temuan verifikasi — perbaikan mengikuti pola fix wave: satu perbaikan = satu skenario probe, dan JANGAN mengubah perilaku yang sudah lolos).

- [ ] **Step 1: Regresi penuh.** `npm test` hijau (semua `tests/*.test.cjs`); `npm run build:web` exit 0, 0 warning.
- [ ] **Step 2: Jalankan SEMUA probe lama yang menyentuh area yang diubah** (inspector, context menu, serializer/parser, renderer): `probe-figma-text.cjs` 15/15, `probe-new-tools.cjs` 12/12, `probe-node-actions.cjs` 24/24, `probe-textbox-height.cjs` PASS, `probe-snap-fixes.cjs` 17/17. Catat angka sebenarnya; bila ada yang gagal, itu temuan verifikasi (bukan "regresi yang diabaikan").
- [ ] **Step 3: Jalankan SEMUA probe baru**: `probe-color-styles.cjs`, `probe-select-same.cjs`, `probe-find-replace.cjs`, `probe-recolor.cjs`, `probe-effects.cjs`. Hitung total skenario dari addend-nya (JANGAN kutip ulang angka dari laporan task — hitung ulang).
- [ ] **Step 4: Screenshot (minimal 6, dari dokumen nyata — termasuk satu dokumen hasil trace 100+ path):**
  1. Color Styles — inspector dengan daftar style + objek tertaut.
  2. Select Same — hasil seleksi massal (panel layer terlihat).
  3. Find & Replace — modal dengan jumlah kena + hasil sesudah replace.
  4. Recolor Mode 1 — slider hue + hasil biru→oranye dengan gradasi terjaga.
  5. Recolor Mode 2 — daftar keluarga hue + hasil palette mapping.
  6. Efek — satu kanvas dengan drop shadow + layer blur + background blur terlihat.
  Screenshot disimpan di `probes/shots/color-effects/` (path sandbox BENAR: `~/workspace/geovanta-blank-font-bug/probes/shots/color-effects/<nama>.png` — JANGAN selipkan subfolder `Geovanta Bug Blank Font`).
- [ ] **Step 5: Smoke test ZIP.** Build ZIP dari root working copy dengan perintah di Global Constraints; ekstrak ke folder temp; `cd web && python -m http.server 8000`; buka `http://localhost:8000`; verifikasi aplikasi termuat, 0 pageerror, dan satu skenario per area (styles, select same, find & replace, recolor, efek) lolos di ZIP hasil ekstrak — bukan hanya di working copy.
- [ ] **Step 6: Laporan akhir.** Tulis di ledger: total tes unit (hitung ulang), total skenario probe (hitung ulang dari addend), SHA256 ZIP, angka performa Task 9, rulings, batasan jujur (termasuk: background blur render-only di SVG; cache efek bila ditambah/dilewati; Enter-to-edit masih mati — pra-ada, bukan dari plan ini). Delivery dihitung MENUNGGU re-test user.
- [ ] **Step 7: Backup** — tidak ada edit kode di task ini kecuali perbaikan temuan; tiap perbaikan memakai `.bak-colorfx-t10` per file SEBELUM edit.
