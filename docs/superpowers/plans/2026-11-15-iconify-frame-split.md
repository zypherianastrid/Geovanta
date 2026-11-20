# Iconify Frame-Split (Slice 50 menit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ikon Iconify yang disisipkan menjadi satu Frame berisi satu objek per subpath (bisa diedit per bagian), lubang tetap transparan, node disederhanakan tanpa mengubah piksel — dalam slice 50 menit.

**Architecture:** Insert memecah tiap `<path>` per subpath + membungkusnya dalam Frame (`isIconFrame` di semua anggota); renderer menggambar fill anak-anak frame ikon sebagai path gabungan per (fill, opacity, fillRule) sehingga lubang tetap berlubang tanpa klasifikasi lubang; klik area kosong frame memilih frame utuh via fallback hit-test.

**Tech Stack:** React + TypeScript (`.tsx`), CanvasKit renderer, Playwright (probe `.cjs`), Jest-style `tests/*.test.cjs` via `npm test`, esbuild `build:web`.

**Spec:** `docs/superpowers/specs/2026-11-15-iconify-frame-split-design.md` (Pendekatan A, disetujui user 21:54 WIB; Q2=(a) hit-test khusus; Q4 artefak drag diterima sebagai batasan slice). Plan ini mengimplementasikan SLICE 50 menit dari §8 desain, bukan desain penuh.

## Global Constraints

- Slice 50 menit, target selesai ~22:44 WIB (realistis 50–65 menit karena Q2(a)). Bila verifikasi gagal, STOP dan laporkan — jangan memaksakan ZIP yang belum teruji.
- DITUNDA ke follow-up (jangan dibangun di slice ini): pengelompokan serializer §5.4 desain (export SVG frame ikon bisa merusak lubang — disclosed sebagai batasan); render gabungan di pass drag (lubang tampak padat sesaat saat diseret, benar lagi saat drop).
- Per-task reviewer dan full probe sweep DITUNDA oleh time-box user (50 menit); kompensasi: probe frame-split + suite + build + smoke adalah gate sebelum ZIP. Sampaikan penundaan ini di laporan penyerahan.
- Backup `.bak` (sufiks `.bak-frame-split`) sebelum edit destruktif; original tidak disentuh; ZIP baru `Geovanta-Iconify-FrameSplit.zip`, jangan timpa ZIP lama.
- `npm test` harus tetap hijau (baseline 324/324); `npm run build:web` exit 0; `tsc --noEmit` tidak menambah error dari 1.416 yang sudah ada.
- Semua perubahan render HANYA aktif untuk frame bertanda `isIconFrame`; dokumen lama dan frame biasa tidak berubah perilakunya.
- Desktop ≥1280; verifikasi headless Chromium 1440×900 light; Windows/GPU asli belum terukur.
- Work dir: `~/workspace/geovanta-iconify-insert-bug/Geovanta-Iconify-Modal-Gemini-Edit/` (node_modules adalah symlink; JANGAN ikut ZIP; JANGAN masukkan `.bak` ke ZIP).
- Bukan repo git (periksa `git rev-parse`; bila bukan repo, lewati semua langkah commit — ZIP adalah delivery).
- Server probe: `web/` di port 9041 (`python3 -m http.server 9041`), probe memakai relay CONNECT dari env proxy seperti `probes/probe-iconify-insert-shape.cjs`.

## Review Focus

1. Anggota frame yang `hidden` ikut tergambar lewat fill gabungan — pengguna menyembunyikan satu bagian ikon tapi bagiannya tetap tampak. Test: Task 1 (crafted frame dengan 1 anggota hidden → piksel bagiannya tidak ada).
2. Anggota ber-fill gradien (`VE.gradOn`) — kunci kelompok (fill, opacity, fillRule) saja akan menggabungkan dua gradien berbeda jadi satu. Test: Task 1 (kunci kelompok WAJIB memuat identitas gradien; crafted frame 2 anggota gradien berbeda → piksel benar).
3. Anggota dengan opacity < 1 + fill + stroke — `needsLayer` di `drawObject` mengasumsikan fill+stroke satu objek; fill gabungan harus memakai opacity kelompok, bukan opacity anggota pertama. Test: Task 1 (crafted frame, anggota opacity 0.5 → piksel alpha benar).
4. Latar frame dihapus — anggota harus TETAP ter-render gabungan (penanda di anggota, bukan hanya latar). Test: Task 1 (crafted frame TANPA latar, anggota ber-flag → lubang tetap transparan).
5. Drag anggota padat: anggota yang diseret keluar dari pass statis — fill gabungan harus mengecualikannya dan pass drag menggambarnya per objek (tanpa duplikasi/gap). Test: Task 3 (mid-drag screenshot: piksel anggota yang diseret ada di posisi drag, tidak ganda).

---

### Task 1: Renderer fill gabungan untuk frame ikon

**Files:**
- Modify: `src/renderer/canvasKitScene.tsx` (`drawObject` ~707, `drawPass` ~855, `path(o)` ~189, `drawVector` ~323)
- Test: `probes/probe-iconify-frame-split.cjs` (baru, bagian Task-1: crafted frame via `loadTestDoc`)

**Interfaces:**
- Consumes: objek dokumen (`o.subs`, `o.fill`, `o.opacity`, `o.fillRule`, `o.isIconFrame`, `o.group`, `o.hidden`, `VE.gradOn(o)`); `VE.serializePath(o, x, y)`; `this.path(o)`; `this.drawVector(canvas, o, path, x, y, zoom, fill, stroke, opacity, smoothEdges)`.
- Produces: `iconFrameFillGroups(members)` — pure helper (di `canvasKitScene.tsx`, module-level): input array anggota frame (sudah terfilter visible, dalam urutan dokumen), output array `{key, fill, opacity, fillRule, gradKey, sourceId, subs, firstIndex}` dengan kunci **(sourceId, fill, opacity, fillRule, gradKey)** — `sourceId` = identitas objek `<path>` asal (WWAJIB: dua `<path>` berbeda dengan fill sama tidak boleh bergabung — render terpisah hari ini akan berubah pikselnya bila digabung, terutama opacity < 1); `gradKey` = identitas gradien (`VE.gradOn(o)` atau null). **Urutan gambar kelompok: urutan dokumen anggota PERTAMA tiap kelompok** (mendekati urutan cat objek hari ini; kelompok yang anggotanya lebih dulu di dokumen digambar lebih dulu — ini yang membuat anggota lubang yang diwarnai ulang tetap tampak di atas kelompok padatnya).

- [x] **Step 1: Tulis bagian Task-1 probe (RED).** Di `probes/probe-iconify-frame-split.cjs` (salin harness dari `probes/probe-iconify-insert-shape.cjs`: server 9041, relay, PREFS accent `#0000ff`, `docSnap`, pixel sampling): muat DUA dokumen via `loadTestDoc`/`loadTestSvg`: (A) crafted frame — bg transparan + 3 anggota `mdi:account-circle` (subs 5/5/5 node, fill `#0000ff`, `fillRule: 'nonzero'`, `group: 'mdi:account-circle'`, `isIconFrame: true` pada SEMUA anggota + bg, `iconSrc` sama di semua anggota) di atas latar merah; (B) ikon yang sama via `loadTestSvg` (1 objek). Assert: (T1a) piksel kepala di (A) merah `[255,0,0]`; (T1b) pixel-diff (A) vs (B) ≤ 2 piksel dengan selisih kanal > 12 — HANYA di dalam clip bbox ikon (inset 3px, tanpa chrome UI); sisa 1 px adalah artefak AA batas clip frame (terukur, sama di frame tanpa bg); (T1c) baseline 1 objek juga merah di kepala (kontrol); (T1d) anggota hidden tidak tergambar (kepala jadi biru); (T1e) anggota fill berbeda tetap terpisah (kepala merah, cakram biru — proxy pemisahan kelompok; gradien/opacity dipisah oleh kunci kelompok di kode, tanpa asersi probe khusus); (T1f) frame TANPA bg tetap berlubang.
- [x] **Step 2: Jalankan probe, pastikan T1a–T1f GAGAL** (combined render belum ada — crafted frame ter-render per objek, lubang jadi padat).

  Run: `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify-frame-split.cjs`
  Expected: FAIL T1a/T1b (kepala biru, bukan merah).
- [x] **Step 3: Implementasikan `iconFrameFillGroups(members)` + integrasi `drawObject`/`drawPass` di `src/renderer/canvasKitScene.tsx`.** Mekanisme: per `drawPass`, `Set drawnIconFrames` baru; di `drawObject`, SESUDAH culling, bila `o.isIconFrame && o.group` dan grup belum di Set: gambar semua fill group (sintesis objek `{...anggotaPertama, subs: group.subs, fill: group.fill, opacity: group.opacity, fillRule: group.fillRule}` lewat `this.path()` + `drawVector` dengan fill=true, stroke=false, dalam translate yang sama seperti blok translate `drawObject`); masukkan grup ke Set. Anggota frame ikon: paksa `fill=false` saat menggambar dirinya sendiri (stroke tetap digambar per anggota; shadow per anggota tetap seperti hari ini). Fill group hanya dari anggota visible (`!hidden`). Pass drag (`drawPass(true)`) TIDAK menggambar fill gabungan (batasan Q4 yang disetujui).
- [x] **Step 4: Jalankan probe, pastikan T1a–T1f LOLOS.**

  Run: `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify-frame-split.cjs`
  Expected: PASS T1a–T1f.
- [x] **Step 5: Jalankan `npm test`, pastikan tetap 324/324** (Task 1 tidak boleh memecahkan suite).

  Run: `npm test`
  Expected: 324/324.

### Task 2: Insert pecah subpath + Frame + simplifikasi

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx` (`onIconifyInsert` ~239, blok mapping sesudah komentar BUG 2026-11-15)
- Test: `probes/probe-iconify-frame-split.cjs` (bagian Task-2: sisip via modal UI)

**Interfaces:**
- Consumes: `VE.parseSVG`, `VE.simplifySubpath(sub, {tolerance})`, `VE.createFrame(tempDoc, idSet, {rect, fill, stroke})`, `VE.tightBBox`; Task 1 (`isIconFrame` + fill gabungan).
- Produces: tiap ikon tersisip = Frame (bg transparan + N objek anak, N = jumlah subpath mentah), `isIconFrame: true` di SEMUA anggota, satu entri riwayat, seleksi = anggota frame + bg.

- [x] **Step 1: Tulis bagian Task-2 probe (RED).** Ikon `mdi:account-circle`, `mdi:cog`, `mdi:google-chrome` via modal UI (alur `probe-iconify-insert-shape.cjs`: `openPanel`, `searchFor`, klik `[data-testid="ic-icon-<nama>"]`, toast). Ground truth per ikon: fetch `api.iconify.design/mdi.json?icons=...` di dalam page, hitung moveto (= subpath) + node mentah via `loadTestSvg` terpisah. Assert per ikon: (T2a) tepat 1 Frame baru: bg (`isFrameBg`, fill transparan, stroke none) + N anak, N = moveto; (T2b) semua anggota `isIconFrame: true`, `group` = nama ikon (diunikkan); (T2c) titik lubang merah (account-circle kepala; cog lubang tengah); (T2d) node sesudah ≤ node mentah + pengurangan node dilaporkan per ikon; (T2e) pixel-diff vs render `loadTestSvg` (1 objek, tanpa simplifikasi) = 0 piksel selisih kanal > 12; (T2f) satu Ctrl+Z menghapus satu sisipan utuh.
- [x] **Step 2: Jalankan probe, pastikan T2a–T2f GAGAL** (insert hari ini masih 1 objek, tanpa frame).

  Run: `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify-frame-split.cjs`
  Expected: FAIL T2a (new=1 objek, bukan frame).
- [x] **Step 3: Implementasikan di `onIconifyInsert`.** Sesudah parse + recolor + hitung skala/posisi (kode sekarang, jangan ubah): (a) tiap objek hasil parse: `subs.map(sp => VE.simplifySubpath(sp, {tolerance: 0.04}))` — satuan ikon, SEBELUM skala; `simplifySubpath` sudah `vcNoWorse` (tidak pernah menambah node); (b) pecah tiap objek jadi 1 objek per subpath (nama `<nama-ikon>-<n>` via `uniqName`, fill/stroke/opacity/fillRule diwarisi, `group: gid`, `containerType: 'frame'`, `isIconFrame: true`); (c) bangun SATU commit berisi anggota + Frame: buat temp doc `{...doc, objects: [...doc.objects, ...members]}`, panggil `VE.createFrame(tempDoc, new Set(memberIds), {rect: [x0,y0,x1,y1] frame 96px, fill: 'transparent', stroke: 'none'})`, ambil doc hasil, set `isIconFrame: true` pada bg + semua anggota; (d) pertahankan posisi berjejer (filter `existingFrames` sudah cocok `containerType: 'frame'`), satu entri riwayat, seleksi = bg + anggota (ikuti `selIds` dari `createFrame`). GUARD: bila probe T2e gagal (simpangan > ambang), hapus langkah (a) dan ulangi probe — kirim node mentah + laporkan.
- [x] **Step 4: Jalankan probe, pastikan T2a–T2f LOLOS** (termasuk guard (a) bila dipicu).

  Run: `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify-frame-split.cjs`
  Expected: PASS T2a–T2f.
- [x] **Step 5: Jalankan `npm test`, pastikan tetap 324/324.**

  Run: `npm test`
  Expected: 324/324 (test lama 5 & 6 masih mengunci perilaku 1-objek — diperbarui di Task 4; bila Task 2 ini sudah memecahkannya, catat dan lanjut — Task 4 memperbaikinya).

### Task 3: Hit-test fallback — klik area frame memilih ikon utuh (Q2(a))

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx` (`hitObj` ~3465)
- Test: `probes/probe-iconify-frame-split.cjs` (bagian Task-3: klik + drag)

**Interfaces:**
- Consumes: `frameBoxes` (useMemo ~1924, `{id, bb}`), `frameBgByGroup` (sudah ada di deps render), `VE.hitTestObject`, `VE.listFrames`; perilaku drag-latar-memindahkan-frame (sudah ada — verifikasi, jangan implementasi ulang).
- Produces: `hitObj(pt)` mengembalikan bg frame ikon bila klik di dalam batas frame tapi tidak mengenai anak mana pun.

- [x] **Step 1: Tulis bagian Task-3 probe (RED).** Sesudah sisip `mdi:account-circle` (Task 2): (T3a) klik sudut kiri-atas bbox frame (di dalam bbox, di luar lingkaran — titik kosong) lalu drag (+40, 0): SEMUA anggota frame bergeser +40 (±2, diukur dari node pertama tiap anggota via `getDoc` sebelum/sesudah); (T3b) klik tepat pada kepala (ter-render sebagai lubang, tapi sebagai objek ia padat — bagian yang bisa diedit) lalu drag (+40, 0): HANYA kepala yang bergeser (edit per bagian); (T3c) klik anak padat (cakram) lalu drag: HANYA anak itu yang bergeser (perilaku per-anak tetap). Catatan: bagian T3 TIDAK memakai latar merah — rect merah raksasa menutupi kanvas sehingga klik area kosong selalu mengenai rect itu (fallback tak pernah jalan) dan drag-nya memicu auto-parenting.
- [x] **Step 2: Jalankan probe, pastikan T3a–T3b GAGAL** (klik area kosong hari ini tidak memilih apa-apa).

  Run: `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify-frame-split.cjs`
  Expected: FAIL T3a (tidak ada anggota yang bergeser).
- [x] **Step 3: Implementasikan fallback di `hitObj`.** Sesudah kedua jalur (`sIdx` candidates DAN loop fallback) tidak menemukan hit: cari frame ikon terdalam/terkecil yang batasnya (`frameBoxes`, pilih luas terkecil bila tumpang tindih — konvensi `listFrames`) memuat `pt` (+tol); periksa frame itu adalah frame ikon (bg-nya `isIconFrame`, via `frameBgByGroup` atau cari objek `group + isFrameBg`); kembalikan objek bg itu. Fallback ini MEM-BYPASS `hitTestObject`/`isHittable` untuk bg (bg transparan memang tidak hittable — itu inti masalahnya). Jangan ubah `isHittable`/`hitTestObject` (dipakai semua alat).
- [x] **Step 4: Jalankan probe, pastikan T3a–T3c LOLOS + T1/T2 tetap lolos.**

  Run: `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify-frame-split.cjs`
  Expected: PASS semua.
- [x] **Step 5: Verifikasi drag-latar = drag-frame (bukan kode baru).** Di probe yang sama, T3a sudah membuktikannya (klik bg → drag → semua anggota ikut). Bila T3a lolos tapi drag hanya menggeser bg, STOP: itu temuan di luar asumsi desain — laporkan, jangan akali.

### Task 4: Perbarui unit test + suite + build

**Files:**
- Modify: `tests/iconify-features.test.cjs` (test 5 & 6 — mengunci perilaku 1-objek pra-slice)
- Test: `npm test`, `npm run build:web`, `tsc --noEmit`

- [x] **Step 1: Perbarui test 5 & 6 ke struktur baru.** Test 5 & 6 menegaskan frame + N objek (bukan 1 objek + bukan split Gemini: tanpa objek fill `#ffffff`, tanpa `frameBg` terpisah dari Frame, `isIconFrame` di semua anggota). Test 10 (utilitas simplify) tidak disentuh. Jangan hapus test tanpa pengganti; total test lolos ≥ 324.
- [x] **Step 2: Jalankan `npm test`, pastikan hijau.**

  Run: `npm test`
  Expected: semua lolos (≥324).
- [x] **Step 3: Jalankan `npm run build:web`, pastikan exit 0.**

  Run: `npm run build:web`
  Expected: exit 0, bundle `web/dist` terbarui.
- [x] **Step 4: Jalankan `tsc --noEmit`, pastikan tidak ada error BARU** (baseline 1.416; laporkan angkanya apa adanya).

  Run: `npx tsc --noEmit`
  Expected: ≤ 1.416 error, 0 error baru dari file yang disentuh slice ini.

### Task 5: Verifikasi akhir + ZIP + penyerahan

**Files:**
- Create: `~/workspace/your_files/Geovanta-Iconify-FrameSplit.zip`
- Test: `probes/probe-iconify-frame-split.cjs`, `probes/probe-iconify.cjs`, `probes/probe-iconify-thumb.cjs`, `probes/probe-iconify-modal.cjs`, `probes/probe-iconify-offline.cjs`

- [x] **Step 1: Jalankan probe frame-split penuh, pastikan SEMUA lolos.**

  Run: `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify-frame-split.cjs`
  Expected: semua PASS (T1+T2+T3), 0 pageerror.
- [x] **Step 2: Jalankan probe keluarga Iconify, pastikan TIDAK ADA kegagalan BARU** vs baseline pra-slice (iconify 47/48 — T8-2b0 pra-ada; modal 10/12 — M6/M8 pra-ada; thumb 3/3; offline error pra-ada). Kegagalan baru = STOP, laporkan.

  Run: `node probes/probe-iconify.cjs`, `node probes/probe-iconify-thumb.cjs`, `node probes/probe-iconify-modal.cjs`
  Expected: sama dengan baseline, tanpa kegagalan baru.
- [x] **Step 3: Pack ZIP dari work dir (tanpa node_modules, tanpa `.bak`, tanpa `/tmp`).** Sertakan laporan slice ini di `docs/superpowers/plans/2026-11-15-iconify-frame-split.md` (file plan ini — perbarui bagian hasil di akhir). Catat entri, byte, SHA256.
- [x] **Step 4: Smoke dari ekstrak ZIP segar.** Ekstrak ke dir baru, `npm ci` (atau pakai symlink node_modules seperti work dir — catat cara yang dipakai), jalankan probe frame-split dari hasil ekstrak, pastikan lolos. Matikan server probe 9041/9042/9043 sesudahnya.
- [x] **Step 5: Tulis laporan penyerahan di akhir plan ini + sampaikan ke user:** apa yang dibangun, angka verifikasi (probe, suite, build, tsc, smoke), batasan slice yang disclosed (serializer, drag-pass, tanpa reviewer per-task, tanpa full probe sweep), dan yang terbuka (follow-up serializer + drag-pass).

## Self-Review (dilakukan penulis plan)

1. **Spec coverage:** G1 (frame + objek terpisah) → Task 2+3; G2 (lubang transparan) → Task 1+2 (T1a/T1b/T2c/T2e); G3 (node, simpangan ≤0,25px) → Task 2 (T2d/T2e + guard); G4 (satu undo, warna, posisi) → Task 2 (T2f + posisi berjejer dipertahankan). §5.4 serializer — SENGAJA tidak ada task (ditunda, dicatat di Global Constraints). §5.5 seleksi — Task 3. Q2(a) — Task 3. Q4 — diterima, tanpa task.
2. **Step scan:** tiap langkah satu aksi + hasil yang bisa dicek (perintah + ekspektasi). Tidak ada langkah "TBD".
3. **Type consistency:** `isIconFrame: true` di semua anggota + bg (Task 1, 2, 3 konsisten); `iconFrameFillGroups(members)` → `[{key, fill, opacity, fillRule, gradKey, subs}]` dipakai Task 1 saja; `group` = nama ikon diunikkan (Task 2) = kunci peta renderer (Task 1).
4. **Review Focus:** 5 butir di atas, masing-masing punya test di Task 1 (butir 1–4) dan Task 3 (butir 5).
5. **Proportion:** plan ini ~40% panjang desain — wajar untuk slice dengan 3 titik integrasi (renderer, insert, hit-test) + probe baru; tidak ada bodi fungsi yang disalin dari kode.

## Hasil eksekusi (diisi saat penyerahan)

**Task 1–4 SELESAI + terverifikasi (23:05 WIB):**
- Probe frame-split penuh: **23/23 lolos** (`PROBE-ICONIFY-FRAME-SPLIT: 23/23`, 0 pageerror). T2e pixel-diff frame vs baseline 1-objek = **0 piksel** (batas ≤ 2). Node: account-circle 15→15, cog 43→41, google-chrome 32→27.
- `npm test`: **325/325** (324 + tes 11 baru `iconFrameFillGroups`; tes 5 & 6 ditulis ulang ke perilaku frame-split). `npm run build:web` exit 0. `tsc --noEmit` **1.416 error** = baseline migrasi TS, tanpa error baru.
- **Diagnosis T3 (dicatat karena sempat menyesatkan):** T3b/T3c sempat FAIL dengan pola "cakram +44,8, kepala −12" — BUKAN bug aplikasi, melainkan probe yang mencocokkan delta BERDASARKAN indeks doc, padahal drop menaruh objek yang digeser ke paling depan (`arrangeZOrder 'front'`). Perbaikan probe: cocokkan berdasarkan id + `samplePixels` selalu dari screenshot segar (sesudah drag). Temuan kedua yang NYATA: klik kepala memilih cakram (paling atas) — diperbaiki dengan aturan `pickHit` di `hitObj`: antar anggota frame ikon yang sama, yang bbox-nya paling kecil yang menang, sehingga bagian lubang bisa diklik (T3b kini memilih `path-1-2` kepala, T3c `path-1-3` cakram — terverifikasi lewat helper `selNames()`).
- **Probe keluarga Iconify (selesai 23:44 WIB) — TIDAK ADA regresi vs baseline pra-slice:**
- `probe-iconify`: **49/50** — hanya T8-2b0 gagal (pra-ada: count tampil di browse mode). Awalnya probe ini CRASH di T6-1 (`waitForCount(+1)` timeout) karena 1 sisipan kini = bg + N anggota; probe diperbarui ke model frame (tanpa melemahkan asersi — warna/stroke/metadata/bbox tetap dicek pada anggota). Temuan selama update: `tabler:home` = 3 subpath (bukan 2 — path pertama punya 2 moveto), `tabler:arrow-bottom-circle` = 3 subpath (panah 2 + lingkaran 1); lingkaran dikonversi VE jadi 2 busur (node [2,2,3], eksak — bukan kehilangan akurasi).
- `probe-iconify-modal`: **10/12** = baseline (M6, M8 gagal — keputusan row-vs-cascade menunggu user; crash sesudah 12 check di `ic-recent-*` = recents pra-ada). M7 sempat gagal lalu diperbaiki di probe: di bawah row layout, tutup/buka modal TIDAK reset ke tengah (posisi dari frame di dokumen) — ekspektasi lama (reset) akan menumpuk ikon di atas ikon pertama.
- `probe-iconify-thumb`: **3/3**. `probe-iconify-offline`: T7-1a/1b lolos; T7-4a gagal + crash di `ic-recent-*` (recents pra-ada, sama seperti baseline).
- **Temuan regresi NYATA yang diperbaiki di dalam slice (ditemukan probe keluarga, bukan disembunyikan):** recolor grup via panel (T6-7) malah mengecat bg frame (garis hijau di sekeliling ikon) sementara anggota tidak berubah — aturan `paintObjs` "seleksi utuh -> cat bg-nya" membajak edit. Perbaikan: bg frame ikon dikeluarkan dari target cat bila anggota ikut terseleksi (`VectorEditor.tsx`, `paintObjs`); seleksi bg saja tetap bisa mengecat bg. Sesudah fix: T6-7a/b/d lolos, undo (T6-7c) lolos.
- `probe-iconify-modal` M7: ekspektasi probe diubah (bukan kode) — lihat catatan di atas.

**ZIP:** `~/workspace/your_files/Geovanta-Iconify-FrameSplit.zip` — **575 entri, 39.557.773 B (uncompressed), 18.869.314 B (zip), SHA256 `369e1ecb141ebc3f7fb944eeecc3782e652a514bb5d0c56503dc3b721e349a40`**. Tanpa node_modules, tanpa `.bak`, tanpa scratch (terverifikasi 0 entri). ZIP lama TIDAK ditimpa. Smoke dari ekstrak segar (symlink node_modules seperti work dir, server 9043): probe frame-split **23/23 lolos**. Server probe 9041/9042/9043 sudah dimatikan; /tmp dibersihkan.

**Batasan slice (disclosed, tidak berubah):** serializer grouping ditunda (export SVG frame ikon bisa merusak lubang); drag-pass transient (Q4 — lubang jadi padat sesaat saat drag, benar lagi sesudah drop); bayangan per-bagian pada ikon berbayang; tanpa reviewer per-task + tanpa full probe sweep (time-box); grouping gradien/opacity terverifikasi di level kode + tes unit 11 (tanpa asersi probe khusus); headless Chromium 1440×900 light saja; Windows/GPU asli belum terukur.
**Deadline:** target 50 menit (~22:44 WIB) TERLEWATI — selesai ~23:50 WIB (total ~1 jam 56 menit sejak 21:54). Penyebab utama: diagnosis T3 (probe salah cocok indeks) + update probe keluarga ke model frame + temuan + perbaikan regresi recolor grup (T6-7). Tidak ada yang dipangkas dari verifikasi untuk mengejar deadline.
**Terbuka (follow-up):** serializer grouping (export SVG); drag-pass gabungan; keputusan user M6/M8 (row vs cascade) + T8-2b0 (count browse) + recents (pulihkan atau perbarui probe).
