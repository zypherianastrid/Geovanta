# Perapian Sidebar Kanan + Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki limitasi corner radius (clamp, bukan tolak), rampingkan context menu (hapus 9 item, pindahkan Select Same ke Selection Colors), beri ikon pada tombol Color Styles + Selection Colors, isi ruang kosong di bawah grid titik poros, dan pindahkan pengaturan Find & Replace Color + Recolor dari modal popup menjadi seksi collapsible di sidebar kanan.

**Architecture:** Sembilan task berurutan (satu implementer segar per task, review per task, final review whole-branch di akhir). Perubahan perilaku hanya di 2 tempat (clamp radius di engine fillet; F&R/Recolor modal → seksi inspector); sisanya perubahan UI di inspector/bundle. Setiap task TDD (probe RED dulu, GREEN sesudah) + screenshot sebelum/sesudah.

**Tech Stack:** React (Geovanta Vector Editor), CanvasKit, Playwright (`playwright-core` 1.65.0), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-14-sidebar-panels-context-menu-design.md` (FINAL + DISETUJUI user 2026-11-14 15:24 WIB, D1-B). Builder check: `docs/superpowers/specs/2026-11-14-sidebar-panels-context-menu-builder-check.md` (1 pertanyaan D1 — sudah dijawab user: D1-B).

## Global Constraints

- Working copy BUKAN repo git: TIDAK ADA perintah git; "commit" = backup `.bak-<slug>` per file SEBELUM edit pertama tiap file + laporan task di `docs/superpowers/plans/sdd-2026-11-14-sidebar-panels/task-N-report.md`. JANGAN edit ledger/plan/spec. JANGAN dispatch subagent/reviewer (itu tugas controller).
- Tanpa dependensi baru.
- TDD: tulis tes/probe GAGAL dulu (RED), implementasi minimal (GREEN), bukti di laporan. Suite penuh `npm test` (baseline 269/269) sebelum laporan; `npm run build:web` exit 0, 0 warning.
- Setiap fix diverifikasi di browser asli via probe Playwright baru di `probes/uiux-audit/` (ukur computed style + warna terhitung, screenshot ke `probes/shots/uiux-audit/`), 0 pageerror.
- Iron Law UI/UX: TIDAK BOLEH menambah `!important` baru, offset piksel hardcoded, `z-index` arbitrer, atau kliping buta. Bila sebuah fix tampak butuh `!important`, STOP dan laporkan NEEDS_CONTEXT dengan alasan + alternatif struktural.
- Bundle HANYA via skrip AST (`/tmp/edit-<slug>.py`, pola T3: asersi exactly-1 match, abort-sebelum-tulis, round-trip `json.dumps` terverifikasi) bila bundle perlu diubah — JANGAN edit baris JSON raksasa `:437` langsung. Node AST baru WAJIB punya kunci `'t': 'r'` — verifikasi bentuk-kunci pasca-tulis.
- Server app http://127.0.0.1:8931; mock font 8941 (`cd probes && nohup node mock-server.cjs >/tmp/mock-server.log 2>&1 &`). Alur probe: "Create New Project" → `waitForFunction(() => window.__geovantaEditorApi)` → `waitForSelector('.ved-canvas')`. Probe: playwright-core 1.65.0 via `NODE_PATH=/home/hatch/workspace/vector-editor/node_modules`, dari folder `~/workspace/geovanta-blank-font-bug/probes/`.
- Ikon harus dari set ikon yang sudah ada di codebase (`Vi`/`Ico`/path SVG inline yang sudah dipakai) — tidak ada font ikon / dependensi baru.
- Bahasa UI tetap dua bahasa (ID/EN) — label baru/berubah masuk `src/constants/appI18n.jsx` kedua bahasa.
- Desktop saja (≥1280) — keputusan user 2026-11-14 04:57 WIB, masih berlaku; tidak ada pekerjaan responsif di sini.
- Skill wajib: `systematic-debugging` (Fase 1 root cause dulu untuk T1), `test-driven-development`, `verification-before-completion` sebelum klaim selesai. Ikuti skill persis; bila skill punya checklist, buat todo per item.

## Review Focus

Lima kelas input/kondisi yang paling mungkin menggigit pengguna — masing-masing sudah dipinkan tesnya ke task pemiliknya:

1. **Radius jauh melebihi sisi terpendek pada bentuk mungil** (mis. rect 5px, radius diminta 100) — harus dijepit ke maksimum, diterapkan, field menampilkan nilai efektif, tanpa toast penolakan dan tanpa crash. → Tes: T1 probe `corner-clamp tiny` + unit test clamp.
2. **Beberapa sudut dengan maksimum berbeda pada satu bentuk** — tiap sudut dijepit independen; field menampilkan rata-rata nilai efektif. → Tes: T1 probe `corner-clamp mixed`.
3. **Select Same tanpa objek yang cocok** — tidak crash, umpan balik sama seperti sebelumnya (toast jumlah 0). → Tes: T3 probe `selsame-nomatch`.
4. **Seksi F&R/Recolor dibuka tanpa seleksi** — tetap ter-render (unconditional, bukan di dalam `selectionColors.length > 0`) dengan scope default modal (document). → Tes: T7 probe `fr-no-selection`, T8 probe `rc-no-selection`.
5. **Context menu dibuka tanpa seleksi sesudah penghapusan** — tidak ada separator yatim / grup kosong / pemisah ganda; menu ter-render bersih. → Tes: T2 probe `ctxmenu-no-selection`.

---

## Task 1: Corner radius tidak jalan pada shape bintang (DIREVISI — lihat brief revisi)

> **KOREKSI 2026-11-14 15:39 WIB (user):** tujuan Task 1 BUKAN clamp semata — bug utama adalah radius tidak berfungsi SAMA SEKALI pada shape bintang (star5/star4/star6); lingkaran tetap tidak bisa (diterima, bukan bug). Brief revisi adalah sumber kebenaran tunggal untuk task ini: `docs/superpowers/plans/sdd-2026-11-14-sidebar-panels/task-1-brief.md`. Langkah-langkah di bawah ini DIGANTIKAN oleh brief revisi (reproduksi bintang dulu, baru perbaiki akar masalah; clamp menjadi sekunder/provisional, revert bila tidak dibutuhkan).

**Files:**
- Modify: `src/engine/cornerFilletEngine.jsx` (fungsi `setSelectedNodesRadius`)
- Modify: `src/components/editor/VectorEditor.jsx` (~8140–8177 `applyRadiusToCorners`, ~8125 field `curR`)
- Test: `tests/corner-clamp.test.cjs` (baru, unit engine)
- Test: `probes/uiux-audit/probe-corner-clamp.cjs` (baru)

**Interfaces:**
- Consumes: `setSelectedNodesRadius(obj, nodeIds:Set, radius:Number, {mode, bevelDeg, smooth}) -> {o, newSelIds}` (diekspos sebagai `VE.setSelectedNodesRadius` via `src/engine/vectorEngine.jsx`; dipakai juga oleh `src/engine/autoRefineGeometry.jsx` — jangan rusak pemakainya).
- Produces: perilaku clamp per-sudut — nilai diterapkan = `min(radius diminta, maksimum yang muat di sudut itu)` (maksimum = setengah panjang sisi terpendek yang mengapit sudut); bentuk return `{o, newSelIds}` TIDAK berubah; `commitObjs` mengembalikan `true` bila clamp diterapkan (bukan `false`).

- [ ] **Step 1: Investigasi root cause (systematic-debugging Fase 1, tanpa ubah kode).** Baca `setSelectedNodesRadius` di `cornerFilletEngine.jsx` + `applyRadiusToCorners` di `VectorEditor.jsx`; reproduksi di browser asli (rect kecil, radius melebihi sisi → toast 'Sudut tidak cukup panjang untuk radius tersebut', tidak ada yang diterapkan). Tulis hipotesis tunggal: di mana penolakan terjadi dan apa rumus maksimum per sudut.
- [ ] **Step 2: Write the failing unit test** — `tests/corner-clamp.test.cjs`: (a) sudut dengan sisi terpendek 20 → radius diminta 100 → radius efektif 10; (b) radius diminta 5 pada sisi 20 → tetap 5; (c) dua sudut dengan maksimum berbeda → masing-masing dijepit independen.
- [ ] **Step 3: Run test to verify it fails.** Run: `node --test tests/corner-clamp.test.cjs`. Expected: FAIL (radius ditolak / nilai tidak diterapkan).
- [ ] **Step 4: Write the failing probe** — `probes/uiux-audit/probe-corner-clamp.cjs`: `corner-clamp tiny` (rect 5px, radius 100 → diterapkan pada maksimum, field menampilkan nilai efektif, tanpa toast penolakan); `corner-clamp mixed` (bentuk dengan sudut maksimum berbeda → tiap sudut dijepit independen, field = rata-rata nilai efektif); `corner-clamp normal` (radius di bawah maksimum → tetap seperti semula).
- [ ] **Step 5: Run probe to verify it fails.** Run: `node uiux-audit/probe-corner-clamp.cjs`. Expected: FAIL pada asersi clamp (toast penolakan muncul, tidak ada yang diterapkan).
- [ ] **Step 6: Implement clamp di `setSelectedNodesRadius`** — satu sumber kebenaran di engine; `applyRadiusToCorners` menyesuaikan kondisi toast (`!ch && rad > 0` tidak lagi memicu penolakan saat clamp diterapkan; hapus/ubah pesan itu). Field `curR` menampilkan rata-rata nilai efektif (logika `curR` yang ada di `:8125` dipertahankan).
- [ ] **Step 7: Run tests to verify they pass.** Run: `node --test tests/corner-clamp.test.cjs` (PASS) + `node uiux-audit/probe-corner-clamp.cjs` (PASS, 0 pageerror) + `npm test` (269 + tes baru, 0 fail) + `npm run build:web` (exit 0, 0 warning) + regresi `probe-snap-fixes` + `probe-node-actions` (pemakai `setSelectedNodesRadius` lain tidak rusak — khususnya `autoRefineGeometry.jsx`).
- [ ] **Step 8: Screenshot sebelum/sesudah** — rect kecil + radius besar: sebelum (toast penolakan, radius 0) vs sesudah (sudut membulat pada maksimum). Simpan di `probes/shots/uiux-audit/corner-clamp-before.png` + `corner-clamp-after.png`, keduanya dilihat langsung.
- [ ] **Step 9: Backup + laporan.** Backup `.bak-corner-clamp` per file yang diedit SEBELUM edit pertama; tulis laporan ke `docs/superpowers/plans/sdd-2026-11-14-ui-ux-audit/task-1-report.md` (root cause, implementasi, hasil tes, screenshot, concerns).

## Task 2: Context menu — hapus 6 item Boolean/Outline/Offset

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (~7701 `ctxItems`)
- Test: `probes/uiux-audit/probe-ctxmenu-trim.cjs` (baru)

**Interfaces:**
- Consumes: `ctxItems` (array item menu `{k, label, ic, kbd, tip, dis, act}` + `{sep: 1}`); jalur normal yang tersisa: Boolean + Outline Stroke + Offset Path di floating toolbar (`EditorFloatingToolbar.jsx:93` `BOOL_ITEMS`, shortcut Ctrl+Alt+U/S/I/X/O; Offset membuka `EditorOffsetStrip`).
- Produces: context menu tanpa 6 item (`union`, `subtract`, `intersect`, `exclude`, `outline`, `offset`) dan tanpa separator yatim; fungsi-fungsi itu tetap jalan dari floating toolbar.

- [ ] **Step 1: Write the failing probe** — `probes/uiux-audit/probe-ctxmenu-trim.cjs`: buka context menu (klik kanan objek terseleksi) → asersi 6 label TIDAK ada di menu ("Gabung (Union)", "Kurangi (Subtract)", "Iris (Intersect)", "Kecualikan (Exclude)", "Outline Stroke", "Offset Path..."); asersi item lain tetap ada (Copy, Paste, Duplicate, Delete, Undo, Redo, Bring to front, Group, dst.); `ctxmenu-no-selection` (menu tanpa seleksi → tidak ada separator yatim/grup kosong/pemisah ganda).
- [ ] **Step 2: Run probe to verify it fails.** Run: `node uiux-audit/probe-ctxmenu-trim.cjs`. Expected: FAIL (ke-6 label masih ada di menu).
- [ ] **Step 3: Implement** — hapus 6 item dari `ctxItems` beserta separator yang menjadi yatim/awalan/akhiran/ganda karenanya. JANGAN sentuh 3 item Select Same (itu Task 3) dan JANGAN sentuh fungsi `applyBoolean` / `applyOutlineStroke` / `openOffsetStrip` (tetap dipakai floating toolbar).
- [ ] **Step 4: Run probe to verify it passes.** Run: `node uiux-audit/probe-ctxmenu-trim.cjs` (PASS, 0 pageerror) + verifikasi jalur normal: Boolean Union dari floating toolbar + Offset Path dari floating toolbar tetap jalan (probe yang sama, 2 asersi tambahan).
- [ ] **Step 5: Screenshot sebelum/sesudah** — context menu: sebelum (9 item yang dilingkari user terlihat) vs sesudah (tidak ada). Simpan di `probes/shots/uiux-audit/ctxmenu-before.png` + `ctxmenu-after.png`, keduanya dilihat langsung.
- [ ] **Step 6: Backup + laporan.** Backup `.bak-ctxmenu` per file yang diedit SEBELUM edit pertama; tulis laporan ke `.../task-2-report.md` (implementasi, hasil tes, screenshot, concerns).

## Task 3: Select Same pindah ke Selection Colors (D1-B)

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (~7692 `selectSameCriterion`, ~7701 `ctxItems` — hapus 3 item Select Same)
- Modify: `src/components/editor/EditorRightInspector.jsx` (~485 seksi Selection Colors — tambah 1 baris 3 tombol kecil di bawah baris judul, di atas daftar warna)
- Modify: `src/constants/appI18n.jsx` (label 3 tombol, ID + EN)
- Test: `probes/uiux-audit/probe-selsame-home.cjs` (baru)

**Interfaces:**
- Consumes: `selectSameCriterion(criterion)` di `VectorEditor.jsx:7692` (memanggil `selectSame(doc, refObj, criterion)` dari `src/engine/colorWalk.jsx`); seksi Selection Colors menerima `selectionColors` + `setSel` + `say`.
- Produces: prop baru `onSelectSame(criterion: 'fill'|'stroke'|'type') => void` dari VectorEditor ke EditorRightInspector; 3 tombol kecil di seksi Selection Colors memanggilnya; 3 item `sel-same-fill` / `sel-same-stroke` / `sel-same-type` TIDAK ADA lagi di `ctxItems`.

- [ ] **Step 1: Write the failing probe** — `probes/uiux-audit/probe-selsame-home.cjs`: (a) 3 tombol "Pilih yang Sama — Fill/Stroke/Tipe" ADA di seksi Selection Colors (dengan seleksi aktif yang punya warna); (b) klik Fill → objek dengan fill sama terseleksi (jumlah sama seperti perilaku context menu lama); (c) klik Tipe → objek dengan tipe sama terseleksi; (d) `selsame-nomatch` (kriteria tanpa objek cocok → tidak crash, toast jumlah 0 seperti sebelumnya); (e) context menu TIDAK LAGI berisi ketiga item itu.
- [ ] **Step 2: Run probe to verify it fails.** Run: `node uiux-audit/probe-selsame-home.cjs`. Expected: FAIL (tombol belum ada di Selection Colors).
- [ ] **Step 3: Implement** — tambah prop `onSelectSame` (VectorEditor → inspector, memanggil `selectSameCriterion`); render 3 tombol kecil sebagai baris baru di bawah baris judul Selection Colors (di atas daftar warna); label via `appI18n` ID + EN; hapus 3 item Select Same dari `ctxItems` beserta separator yatim. JANGAN ubah tombol "◎" per baris warna (fungsi terpisah, tetap ada).
- [ ] **Step 4: Run probe to verify it passes.** Run: `node uiux-audit/probe-selsame-home.cjs` (PASS, 0 pageerror) + `npm test` (0 fail) + `npm run build:web` (exit 0, 0 warning) + regresi `probe-select-same` (perilaku engine tidak berubah).
- [ ] **Step 5: Screenshot sebelum/sesudah** — seksi Selection Colors + context menu: sebelum (Select Same hanya di context menu) vs sesudah (3 tombol di Selection Colors, tidak ada di context menu). Simpan di `probes/shots/uiux-audit/selsame-before.png` + `selsame-after.png`, keduanya dilihat langsung.
- [ ] **Step 6: Backup + laporan.** Backup `.bak-selsame` per file yang diedit SEBELUM edit pertama; tulis laporan ke `.../task-3-report.md`.

## Task 4: Ikon pada 3 tombol Color Styles + hapus "…"

**Files:**
- Modify: `src/components/editor/EditorRightInspector.jsx` (~337 baris judul Color Styles)
- Modify: `src/constants/appI18n.jsx` (`frOpenBtn` ID `:360` + EN `:803`, `rcOpenBtn` ID `:379` + EN `:822` — hapus "…")
- Test: `probes/uiux-audit/probe-colorstyles-icons.cjs` (baru)

**Interfaces:**
- Consumes: label `L.frOpenBtn`, `L.rcOpenBtn`, `L.riStyleCreate`; set ikon yang sudah ada (`Vi`/`Ico`); ketiga tombol `veStyleCreate` / `fr-open-styles` / `rc-open-styles` (`ved-pill--compact text-[10px]`, satu baris horizontal, `flexWrap: 'nowrap'`).
- Produces: ketiga tombol berikon (ikon + teks, terbaca di 10px); label "Find & Replace" dan "Recolor" tanpa "…" (ID + EN — memperbaiki seksi Color Styles DAN Selection Colors sekaligus karena labelnya sama).

- [ ] **Step 1: Write the failing probe** — `probes/uiux-audit/probe-colorstyles-icons.cjs`: (a) tiap tombol berisi elemen ikon (svg/path) + teks; (b) teks tombol = "Find & Replace" dan "Recolor" (tanpa "…"); (c) ketiga tombol tetap SATU baris horizontal (top sama, tidak wrap, tidak overflow — ukur `getBoundingClientRect`); (d) label EN juga tanpa "…" (ganti `prefs.lang` ke EN, ukur ulang).
- [ ] **Step 2: Run probe to verify it fails.** Run: `node uiux-audit/probe-colorstyles-icons.cjs`. Expected: FAIL (tombol tanpa ikon, label masih ber-"…").
- [ ] **Step 3: Implement** — tambah ikon dari set yang sudah ada ke ketiga tombol (pilih ikon yang terbaca: plus/buat, cari-ganti, palet); hapus "…" dari `frOpenBtn`/`rcOpenBtn` di `appI18n` (ID + EN). Pertahankan satu baris horizontal (bila ikon membuat baris meluber, kecilkan padding/ikon — JANGAN ubah baris jadi wrap, itu keputusan layout yang tidak diminta).
- [ ] **Step 4: Run probe to verify it passes.** Run: `node uiux-audit/probe-colorstyles-icons.cjs` (PASS, 0 pageerror) + `npm test` (0 fail) + `npm run build:web` (exit 0, 0 warning) + regresi `probe-shots-color-effects` (13/13) + probe T14 (tipografi — label berubah, pastikan tidak ada asersi yang mengunci "…" lama).
- [ ] **Step 5: Screenshot sebelum/sesudah** — seksi Color Styles: sebelum (tombol teks saja + "…") vs sesudah (tombol berikon, tanpa "…"). Simpan di `probes/shots/uiux-audit/colorstyles-icons-before.png` + `colorstyles-icons-after.png`, keduanya dilihat langsung.
- [ ] **Step 6: Backup + laporan.** Backup `.bak-csicons` per file yang diedit SEBELUM edit pertama; tulis laporan ke `.../task-4-report.md`.

## Task 5: Isi ruang kosong di bawah grid titik poros

**Files:**
- Modify: `src/components/ui/PinGridSelector.jsx` dan/atau `src/vendor/tailwindOfflineBundle.jsx` (aturan `.pin3` [311]–[315])
- Modify: `src/components/editor/EditorRightInspector.jsx` (~237 baris Transform — hanya bila perlu varian khusus)
- Test: `probes/uiux-audit/probe-pivot-fill.cjs` (baru)

**Interfaces:**
- Consumes: `.pin3` (62px lebar, padding 5px, gap 3px, tombol 14px → tinggi 58px); baris Transform `<div className="flex items-start gap-2.5 pt-0.5">` berisi `<PinGrid>` + kolom kanan (Seg Pusat/Poros + tombol "Skala stroke", ~72px).
- Produces: grid titik poros setinggi baris (tidak ada lagi ~14px ruang kosong di bawahnya); titik-titik membesar mengikuti tinggi baris; tidak ada perubahan pada pemakaian `.pin3` lain (periksa dulu — `PinGrid` hanya dipakai di inspector ini).

- [ ] **Step 1: Write the failing probe** — `probes/uiux-audit/probe-pivot-fill.cjs`: ukur `getBoundingClientRect` grid `.pin3` vs kolom kanan di baris yang sama → asersi `grid.bottom == kolom.bottom` (±1px, toleransi AA) dan `grid.height >= 70`; asersi ke-9 titik tetap bisa diklik (klik tiap titik → `pin` berubah).
- [ ] **Step 2: Run probe to verify it fails.** Run: `node uiux-audit/probe-pivot-fill.cjs`. Expected: FAIL (grid 58px vs kolom ~72px, selisih ~14px di bawah grid).
- [ ] **Step 3: Implement** — rentangkan grid setinggi baris (titik membesar; periksa pemakaian `.pin3` lain SEBELUM mengubah aturan global — bila aturan dipakai di tempat lain, buat perubahan scoped pada baris Transform ini saja, bukan aturan global). JANGAN pusatkan grid secara vertikal (itu mendistribusikan ruang, bukan mengisinya); JANGAN tambah kontrol baru.
- [ ] **Step 4: Run probe to verify it passes.** Run: `node uiux-audit/probe-pivot-fill.cjs` (PASS, 0 pageerror) + `npm test` (0 fail) + `npm run build:web` (exit 0, 0 warning) + regresi probe T5 (baris layer — tidak terkait, smoke) + probe T14 (tipografi/layout inspector).
- [ ] **Step 5: Screenshot sebelum/sesudah** — seksi Position & Transform: sebelum (ruang kosong di bawah grid) vs sesudah (grid mengisi baris). Simpan di `probes/shots/uiux-audit/pivot-fill-before.png` + `pivot-fill-after.png`, keduanya dilihat langsung.
- [ ] **Step 6: Backup + laporan.** Backup `.bak-pivot` per file yang diedit SEBELUM edit pertama; tulis laporan ke `.../task-5-report.md`.

## Task 6: Ikon + isi baris pada tombol F&R/Recolor di Selection Colors

**Files:**
- Modify: `src/components/editor/EditorRightInspector.jsx` (~485 baris judul Selection Colors)
- Test: `probes/uiux-audit/probe-selcolors-buttons.cjs` (baru)

**Interfaces:**
- Consumes: tombol `fr-open-selcolors` + `rc-open-selcolors` (`ved-pill text-[10px]`, saat ini teks saja, ter-wrap ke baris sendiri dengan celah besar di tengah); ikon yang sama dengan Task 4 (konsisten); label tanpa "…" dari Task 4 (jangan ubah label lagi di sini).
- Produces: kedua tombol berikon + masing-masing `flex: 1` (mengisi lebar baris secara merata, tanpa celah besar) + baris boleh wrap (`flex-wrap`) bila lebar tidak cukup sehingga tidak terpotong.

- [ ] **Step 1: Write the failing probe** — `probes/uiux-audit/probe-selcolors-buttons.cjs`: (a) tiap tombol berisi elemen ikon + teks; (b) kedua tombol mengisi lebar baris (jumlah lebar keduanya + gap ≈ lebar baris, selisih < 4px — tidak ada celah besar di tengah); (c) teks tidak terpotong (`scrollWidth == clientWidth` tiap tombol); (d) pada lebar inspector menyempit (viewport 1280, panel tetap) tombol tetap tidak terpotong (wrap, bukan klip).
- [ ] **Step 2: Run probe to verify it fails.** Run: `node uiux-audit/probe-selcolors-buttons.cjs`. Expected: FAIL (tombol tanpa ikon, celah besar di tengah baris).
- [ ] **Step 3: Implement** — tambah ikon yang sama dengan Task 4 ke kedua tombol; beri `flex: 1` pada keduanya; pastikan baris membungkus (flex-wrap) bila perlu. JANGAN ubah 3 tombol Select Same dari Task 3 (baris terpisah, tetap ada) dan JANGAN ubah tombol "◎" per baris warna.
- [ ] **Step 4: Run probe to verify it passes.** Run: `node uiux-audit/probe-selcolors-buttons.cjs` (PASS, 0 pageerror) + `npm test` (0 fail) + `npm run build:web` (exit 0, 0 warning) + regresi `probe-color-styles` (19/19) + `probe-select-same` (9/9).
- [ ] **Step 5: Screenshot sebelum/sesudah** — seksi Selection Colors: sebelum (tombol teks saja, celah besar) vs sesudah (tombol berikon mengisi baris). Simpan di `probes/shots/uiux-audit/selcolors-buttons-before.png` + `selcolors-buttons-after.png`, keduanya dilihat langsung.
- [ ] **Step 6: Backup + laporan.** Backup `.bak-selbtn` per file yang diedit SEBELUM edit pertama; tulis laporan ke `.../task-6-report.md`.

## Task 7: Seksi sidebar Find & Replace Color (ganti modal)

**Files:**
- Modify: `src/components/editor/EditorRightInspector.jsx` (tambah seksi collapsible Find & Replace tepat di bawah seksi Selection Colors; state buka/tutup lokal di inspector)
- Modify: `src/components/editor/VectorEditor.jsx` (hapus state `frOpen` + render `<FindReplaceColorModal>`; `onOpenFindReplace` menjadi toggle seksi — teruskan sebagai prop ke inspector)
- Delete: `src/components/modals/FindReplaceColorModal.jsx` (backup `.bak-sidebar-panels` dulu, baru hapus)
- Test: `probes/uiux-audit/probe-fr-sidebar.cjs` (baru)

**Interfaces:**
- Consumes: konten + state modal lama (`from`/`to`/`scope`/`replaced`/`total`/`error`/`previewAll`; props `doc`/`selIds`/`onPreviewDoc`/`onCommitPreview`/`say`/`L`/`onRecentColor`); tombol pembuka yang sama (`fr-open-styles`, `fr-open-selcolors`); pola seksi collapsible yang task ini buat — seksi ini yang Task 8 pakai ulang.
- Produces: seksi collapsible "Find & Replace" di inspector tepat di bawah "Selection colors" (toggle independen via tombol pembuka yang sama; boleh terbuka bersamaan dengan seksi Recolor); preview/commit berperilaku SAMA seperti modal (callback yang sama, hasil yang sama); TIDAK ADA lagi modal/overlay/focus trap untuk F&R di DOM; `frOpen` + render modal dihapus dari VectorEditor.

- [ ] **Step 1: Write the failing probe** — `probes/uiux-audit/probe-fr-sidebar.cjs`: (a) klik tombol F&R di Color Styles → seksi F&R muncul di bawah "Selection colors" (di dalam `.fig-right-sidebar`, BUKAN overlay/modal — asersi tidak ada elemen modal/overlay di DOM); (b) isi seksi lengkap (field from/to, scope, tombol Ganti/Ganti Semua/Tutup — urutan footer [Tutup | Ganti Semua | Ganti] dipertahankan dari T13); (c) `fr-no-selection` (buka tanpa seleksi → seksi tetap ter-render, scope document); (d) preview + commit jalan dari seksi (ganti satu warna → dokumen berubah, sama seperti perilaku modal); (e) Esc menutup seksi (tanpa membatalkan seleksi bila seksi sedang terbuka — rekonsiliasi dengan handler Esc editor); (f) klik tombol lagi → seksi menutup (toggle).
- [ ] **Step 2: Run probe to verify it fails.** Run: `node uiux-audit/probe-fr-sidebar.cjs`. Expected: FAIL (klik tombol membuka modal, bukan seksi sidebar).
- [ ] **Step 3: Implement** — pindahkan konten + state `FindReplaceColorModal` ke seksi inspector (komponen seksi baru di file inspector atau file komponen baru di `src/components/editor/` — pilih yang paling sesuai pola codebase; JANGAN ubah logika preview/commit, hanya wadahnya); state buka/tutup lokal di inspector; `onOpenFindReplace` menjadi toggle; hapus state `frOpen` + render modal dari VectorEditor; backup lalu hapus file modal.
- [ ] **Step 4: Run probe to verify it passes.** Run: `node uiux-audit/probe-fr-sidebar.cjs` (PASS, 0 pageerror) + `npm test` (0 fail) + `npm run build:web` (exit 0, 0 warning) + regresi `probe-find-replace` (13/13 — sesuaikan asersi yang mengunci modal: catat persis yang berubah + alasannya di laporan, seperti preseden accent-fix) + T9 (focus trap modal F&R tidak lagi ada — sesuaikan asersi T9-fr, catat di laporan) + T13 (urutan footer F&R — sesuaikan, catat di laporan).
- [ ] **Step 5: Screenshot sebelum/sesudah** — klik F&R: sebelum (modal popup di tengah) vs sesudah (seksi di sidebar kanan di bawah Selection Colors). Simpan di `probes/shots/uiux-audit/fr-sidebar-before.png` + `fr-sidebar-after.png`, keduanya dilihat langsung.
- [ ] **Step 6: Backup + laporan.** Backup `.bak-frsidebar` per file yang diedit SEBELUM edit pertama; tulis laporan ke `.../task-7-report.md` (termasuk daftar eksplisit asersi probe yang diubah karena modal tidak lagi ada + alasannya).

## Task 8: Seksi sidebar Recolor (ganti modal)

**Files:**
- Modify: `src/components/editor/EditorRightInspector.jsx` (tambah seksi collapsible Recolor tepat di bawah seksi Find & Replace / di bawah Selection Colors; pakai pola Task 7)
- Modify: `src/components/editor/VectorEditor.jsx` (hapus state `rcOpen` + render `<RecolorModal>`; `onOpenRecolor` menjadi toggle seksi)
- Delete: `src/components/modals/RecolorModal.jsx` (backup `.bak-sidebar-panels` dulu, baru hapus)
- Test: `probes/uiux-audit/probe-rc-sidebar.cjs` (baru)

**Interfaces:**
- Consumes: pola seksi collapsible dari Task 7 (pakai ulang, jangan buat pola kedua); konten + state modal lama (`mode`/`deltaHue`/`satMul`/`lightMul`/`hueMin`/`hueMax`/`scope`/`familyTargets`/`overrides`/`overrideFor`/`families`/`changed`; props `doc`/`selIds`/`onPreviewDoc`/`onCommitPreview`/`say`/`L`); tombol pembuka yang sama (`rc-open-styles`, `rc-open-selcolors`).
- Produces: seksi collapsible "Recolor" di inspector (toggle independen; boleh terbuka bersamaan dengan seksi F&R); preview/commit berperilaku SAMA seperti modal; TIDAK ADA lagi modal/overlay/focus trap untuk Recolor di DOM; `rcOpen` + render modal dihapus dari VectorEditor.

- [ ] **Step 1: Write the failing probe** — `probes/uiux-audit/probe-rc-sidebar.cjs`: (a) klik tombol Recolor di Color Styles → seksi Recolor muncul di bawah Selection Colors (di dalam `.fig-right-sidebar`, BUKAN overlay/modal); (b) isi seksi lengkap (mode, hue slider, scope, empty state "Dokumen ini belum memiliki warna…" bila tidak ada warna — T12 pindah ikut seksi); (c) `rc-no-selection` (buka tanpa seleksi → seksi tetap ter-render, scope document); (d) preview + commit jalan dari seksi (geser hue → preview berubah → commit → dokumen berubah); (e) Esc menutup seksi; (f) kedua seksi (F&R + Recolor) terbuka bersamaan → inspector tetap bisa di-scroll, keduanya bisa dipakai, tidak tumpang tindih.
- [ ] **Step 2: Run probe to verify it fails.** Run: `node uiux-audit/probe-rc-sidebar.cjs`. Expected: FAIL (klik tombol membuka modal, bukan seksi sidebar).
- [ ] **Step 3: Implement** — pindahkan konten + state `RecolorModal` ke seksi inspector (pakai pola Task 7; JANGAN ubah logika preview/commit, hanya wadahnya); state buka/tutup lokal di inspector; `onOpenRecolor` menjadi toggle; hapus state `rcOpen` + render modal dari VectorEditor; backup lalu hapus file modal.
- [ ] **Step 4: Run probe to verify it passes.** Run: `node uiux-audit/probe-rc-sidebar.cjs` (PASS, 0 pageerror) + `npm test` (0 fail) + `npm run build:web` (exit 0, 0 warning) + regresi `probe-recolor` (15/15 — sesuaikan asersi yang mengunci modal, catat di laporan) + T9 (focus trap modal Recolor tidak lagi ada — sesuaikan asersi T9-rc, catat di laporan) + T12 (empty state Recolor — sesuaikan lokasinya ke seksi, catat di laporan) + `probe-fr-sidebar` (Task 7 tetap hijau — kedua seksi hidup berdampingan).
- [ ] **Step 5: Screenshot sebelum/sesudah** — klik Recolor: sebelum (modal popup di tengah) vs sesudah (seksi di sidebar kanan). Simpan di `probes/shots/uiux-audit/rc-sidebar-before.png` + `rc-sidebar-after.png`, keduanya dilihat langsung.
- [ ] **Step 6: Backup + laporan.** Backup `.bak-rcsidebar` per file yang diedit SEBELUM edit pertama; tulis laporan ke `.../task-8-report.md` (termasuk daftar eksplisit asersi probe yang diubah karena modal tidak lagi ada + alasannya).

## Task 9: Verifikasi akhir + ZIP final

**Files:**
- Modify: `docs/superpowers/plans/2026-11-14-sidebar-panels-context-menu-progress.md` (ledger — HANYA controller yang mengedit; implementer JANGAN sentuh ledger)
- Test: semua probe di bawah

**Interfaces:**
- Consumes: semua task T1–T8 selesai + lolos review.
- Produces: ZIP final baru (menggantikan SHA `ba646282…`) + laporan verifikasi akhir.

- [ ] **Step 1: Suite penuh.** Run: `npm test` (269 + tes baru T1, 0 fail) + `npm run build:web` (exit 0, 0 warning).
- [ ] **Step 2: Regresi probe audit T1–T14** (402/403 — hanya T10 b3 yang boleh gagal, batasan headless yang sudah didokumentasikan) + `probe-accent-fix` (30/30) + `probe-accent-exact` (46/46) + colorfx 157/157 + flexwrap 7/7 + shots 13/13 + semua probe baru T1–T8, 0 pageerror.
- [ ] **Step 3: Rebuild ZIP dari nol** ke path temp lalu `cp` menembus symlink target (JANGAN `rm` symlink `~/workspace/your_files/Geovanta-ColorStyles-Recolor-Effects.zip`); verifikasi SHA baru + jumlah entri + 0 entri `sdd-`/`node_modules`/`.bak`.
- [ ] **Step 4: Smoke ZIP hasil ekstrak 6/6** (K1 styles, K2 select same, K3 find & replace, K4 recolor, K5 efek, K6 0 pageerror) — dari hasil EKSTRAK ZIP, bukan working copy.
- [ ] **Step 5: Laporan verifikasi akhir** ke `.../task-9-report.md` (angka tiap suite + SHA ZIP + daftar screenshot). ZIP TIDAK diserahkan ke user di task ini (menunggu final review controller).

---

## Self-Review (controller, sesudah menulis plan)

1. **Spec coverage:** §2 Goals G1–G6 → T1 (G1), T2+T3 (G2), T4 (G3), T5 (G4), T6 (G5), T7+T8 (G6). Non-goals N1–N4 tercermin sebagai batasan tiap task (tidak ada perubahan engine geometri/mesin). Anti-goals A1–A3 dijaga oleh T3 (fungsi tetap ada), T7/T8 langkah 4 (regresi colorfx + penyesuaian probe eksplisit), dan screenshot tiap task.
2. **Step scan:** tiap step satu aksi dengan hasil yang bisa dicek (perintah + output yang diharapkan). Tidak ada step "TBD"/"tangani edge case".
3. **Type consistency:** `onSelectSame(criterion: 'fill'|'stroke'|'type')` (T3) konsisten dengan `selectSameCriterion` (VectorEditor:7692) dan kriteria `selectSame` (colorWalk.jsx); `setSelectedNodesRadius` return `{o, newSelIds}` konsisten antara T1 dan pemakainya; nama probe/screenshot konsisten per task.
4. **Review Focus:** kelima kelas tercakup — (1)(2) → T1, (3) → T3, (4) → T7/T8, (5) → T2. "Kedua seksi terbuka bersamaan" ditambahkan sebagai asersi (f) di T8.
5. **Proportion:** plan ~9 task untuk spec 6 butir + D1-B; tiap task membawa keputusan yang tidak bisa dibuat implementer sendirian (file, nama, nilai, tes). Tidak ada badan fungsi yang ditranskrip — hanya signature + asersi.
