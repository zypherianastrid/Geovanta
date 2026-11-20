# Iconify Pindah ke Modal Popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel Ikon Iconify pindah dari seksi sidebar kanan ke modal popup di tengah kanvas, dengan filter kategori, thumbnail lebih besar, dan sisipan berurutan yang di-cascade.

**Architecture:** Pendekatan A (sesuai design): `IconifyPanel.jsx` beserta seluruh logikanya dipakai ulang utuh di dalam wrapper modal baru `IconifyModal.jsx` (pola portal `.ov` seperti `SettingsModal`); mount pindah dari `EditorRightInspector.jsx` ke `VectorEditor.jsx`; kategori diteruskan dari `listCollections()`; cascade adalah offset di `onIconifyInsert`.

**Tech Stack:** React (panel + modal portal), `fetch` + `AbortController` (klien hybrid yang sudah ada), Playwright (probe), `node --test` (unit).

**Spec:** `docs/superpowers/specs/2026-11-15-iconify-modal-design.md` — the plan argues from the spec, so the spec travels with it; executors read both.

## Global Constraints

- Working copy `~/workspace/geovanta-round2/` is **not a git repo**. "Commit" in this plan = backup `.bak-<task>` before any destructive edit + write the task report to `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-N-report.md`. No `git` commands.
- No new npm dependencies. No icon data bundled.
- Desktop saja (≥1280). Modal: `maxWidth: 960`, `maxHeight: 85vh`, animasi `usePresence(open, 200)`.
- Insert: frame 96 px di tengah viewport (tetap), satu Ctrl+Z membatalkan satu sisipan, cascade +24 px per langkah (doc units), reset tiap modal ditutup, wrap sesudah 10 langkah.
- Tutup modal hanya lewat: tombol X, Esc, klik backdrop. Floating bar dan shortcut tool tidak bisa dipakai selama modal terbuka (guard `.ov` di handler keyboard global — jangan diubah).
- Error tidak pernah menampilkan string error mentah (kontrak lama panel: hanya pesan kontekstual / `icErrorGeneric`).
- Tests: `npm test` (node --test); build: `npm run build:web` exit 0; probes via Playwright (`/home/hatch/workspace/vector-editor/node_modules/playwright-core`, chromium `~/.cache/ms-playwright/chromium-1255/`), serve `web/` dengan `python3 -m http.server <port>`; panel memakai loopback CONNECT relay + `--ignore-certificate-errors` (khusus probe, lihat header `probes/probe-iconify.cjs`).
- If any CSS AST rules are added to `src/vendor/tailwindOfflineBundle.jsx`, update the tripwire count in `tests/accent-tokens.test.cjs` (currently 844 after Round 4). Target: nol aturan CSS baru.
- Baseline sebelum tugas ini: suite 300/300, `probe-iconify.cjs` 52/52, `probe-iconify-offline.cjs` 14/14, `probe-iconify-thumb.cjs` 3/3, bundle `web/assets/geovanta.bundle.js` 2.020.678 B (md5 sama dengan `dist/`).

## Review Focus

- **Cascade offset dihitung di ruang yang salah** (screen px vs doc units saat zoom ≠ 100%) → ikon mendarat jauh saat zoom besar. Test: Task 4 probe menyisip 3 ikon pada zoom 200% dan menegaskan pergeseran bbox tetap 24 doc unit per langkah.
- **Klik backdrop saat dropdown Select terbuka menutup modal dan menghilangkan state panel** (query, kategori, halaman). Test: Task 3 probe membuka dropdown lalu klik backdrop → modal tetap terbuka, dropdown tertutup.
- **"Muat lagi" dengan kategori aktif tidak pernah berhenti** bila API terus mengembalikan halaman tanpa kecocokan (loop fetch tanpa batas). Test: Task 1 unit test dengan `fetch` mock yang mengembalikan halaman-halaman tanpa kecocokan → helper berhenti setelah total API habis, jumlah `fetch` terbatas `ceil(total/limit)`.
- **Efek panel jalan sesudah modal ditutup** (fetch `listCollections`/`loadSet`/`probeOnline` terpicu saat animasi keluar, karena panel tetap ter-mount dengan `open=false`). Test: Task 3 probe menutup modal lalu menegaskan tidak ada `fetch` Iconify baru sesudah tutup (hitung request) dan 0 pageerror.
- **Sisipan gagal ikut memajukan penghitung cascade** (CDN error saat klik) → sisipan berhasil berikutnya mendarat di offset yang salah. Test: Task 4 probe — sisipan gagal (set diblokir) lalu sisipan berhasil → offset berhasil itu +24 px dari tengah, bukan +48 px.

---

## File Structure

- `src/renderer/iconifyClient.jsx` (modify) — `listCollections()` meneruskan `category`; helper baru `searchIconsFiltered()` (loop halaman + filter kategori, unit-testable). Tidak ada perubahan host/timeout/limit.
- `src/constants/appI18n.jsx` (modify) — 3 label baru ID + EN: `icCategory`, `icAllCategories`, `icOtherCategory`.
- `src/components/editor/IconifyPanel.jsx` (modify) — state `selectedCategory`, dropdown kategori sebaris dengan dropdown koleksi, `THUMB_PX` 28 → 40, `ic-count` = hasil terfilter saat kategori aktif. Tidak ada perubahan struktur return selain baris dropdown + ukuran thumb.
- `src/components/modals/IconifyModal.jsx` (create) — wrapper portal tipis: overlay `.ov`, dialog `.hp` `role="dialog"` `data-testid="ic-modal"`, guard backdrop saat `.flt` terbuka, `usePresence(open, 200)`. Merender `<IconifyPanel …/>`.
- `src/components/editor/EditorRightInspector.jsx` (modify) — hapus mount `{tool === 'iconify' && <IconifyPanel …/>}` + prop `onIconifyClose`, `onIconifyInsert`, `recentIcons` (verifikasi tidak ada pemakai lain; bila ada, itu dead code dan dihapus mengikuti preseden T7).
- `src/components/editor/VectorEditor.jsx` (modify) — mount `<IconifyModal open={tool === 'iconify'} …/>` di dekat portal import modal; ref penghitung cascade + offset di `onIconifyInsert`. Tidak ada perubahan `tool` / `setToolToggle` / `onIconifyClose` / shortcut.
- `tests/iconify-client.test.cjs` (modify) — tes `category` + `searchIconsFiltered`.
- `tests/iconify-panel.test.cjs` (modify) — tes dropdown kategori (SSR) + thumb 40.
- `probes/probe-iconify-modal.cjs` (create) — probe end-to-end modal (buka/tutup, cascade, kategori, `V` mati).
- `probes/probe-iconify.cjs` (modify) — hapus P6 (klik tool Select menutup panel — tidak lagi mungkin), sesuaikan penanda bila perlu.
- `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/` (create) — satu report per task.

---

### Task 1: Kategori di klien + label i18n

**Files:**
- Modify: `src/renderer/iconifyClient.jsx`
- Modify: `src/constants/appI18n.jsx`
- Test: `tests/iconify-client.test.cjs`

**Interfaces:**
- Consumes: `ICONIFY_API_BASE` (sudah ada), `searchIcons(query, {prefix, limit, start, signal})` (sudah ada).
- Produces: `listCollections()` mengembalikan tiap koleksi dengan `category: string | null` tambahan; `searchIconsFiltered(query, {category, collections, limit = 48, signal}) -> Promise<{icons, exhausted}>` — `icons` = hasil terfilter (maks. 48), `exhausted` = true bila sudah tidak ada halaman API lagi; label `icCategory` / `icAllCategories` / `icOtherCategory` (ID + EN).

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/renderer/iconifyClient.jsx src/renderer/iconifyClient.jsx.bak-modal-t1
cp src/constants/appI18n.jsx src/constants/appI18n.jsx.bak-modal-t1
cp tests/iconify-client.test.cjs tests/iconify-client.test.cjs.bak-modal-t1
```

- [ ] **Step 2: Write the failing test** — di `tests/iconify-client.test.cjs`, dengan `fetch` mock seperti tes yang sudah ada:
  - `listCollections` mengembalikan `category: 'Material'` untuk `material-symbols` dan `category: null` bila field tidak ada di respons API.
  - `searchIconsFiltered('home', {category: 'Material', collections: [{prefix: 'mdi', category: 'Material'}, {prefix: 'tabler', category: 'General'}], limit: 48})` hanya mengembalikan ikon ber-prefix `mdi` bila mock `/search` mengembalikan campuran `mdi:*` + `tabler:*`.
  - `searchIconsFiltered` berhenti setelah total API habis: mock `/search` mengembalikan 2 halaman tanpa satu pun kecocokan dalam kategori → `exhausted === true` dan jumlah pemanggilan `fetch` tepat 2 (Review Focus #3).
  - Label: `getAppStr('id').icCategory === 'Kategori'`, `icAllCategories === 'Semua kategori'`, `icOtherCategory === 'Lainnya'`; EN: `'Category'`, `'All categories'`, `'Other'`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test 2>&1 | tail -5`
Expected: FAIL — `listCollections` belum punya `category`, `searchIconsFiltered` belum ada, label belum ada.

- [ ] **Step 4: Implement di `src/renderer/iconifyClient.jsx`**
  - `listCollections()`: tambah `category: c?.category ?? null` pada objek yang dikembalikan (satu field, tidak ada perubahan lain).
  - `searchIconsFiltered(query, {category, collections, limit = 48, signal})`: bila `category` kosong, delegasi langsung ke `searchIcons` satu halaman (start 0) dan kembalikan `{icons, exhausted: icons.length >= total}`; bila kategori aktif, hitung `allowedPrefixes` dari `collections` yang `category`-nya sama (koleksi tanpa `category` masuk `'Lainnya'` — bandingkan dengan `category === 'Lainnya'` bila yang dipilih adalah label Lainnya, bukan string mentah), lalu loop `searchIcons` halaman demi halaman (mulai `start = 0`, naik `limit` tiap halaman) sambil mengumpulkan kecocokan sampai 48 terkumpul atau `start >= total` API. Aborsi (`AbortError`) diteruskan apa adanya; timeout/error lain mengikuti pesan kontekstual `searchIcons` yang sudah ada.

- [ ] **Step 5: Implement label di `src/constants/appI18n.jsx`** — tambah ketiga label tepat sesudah `icAllCollections` di blok ID dan blok EN (nilai persis seperti Step 2).

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test 2>&1 | tail -5`
Expected: PASS, suite tetap 300/300 + tes baru (sebutkan jumlah baru di laporan).

- [ ] **Step 7: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-1-report.md` (file diubah, hasil tes, batasan).

### Task 2: Filter kategori + thumbnail 40 px di panel

**Files:**
- Modify: `src/components/editor/IconifyPanel.jsx`
- Test: `tests/iconify-panel.test.cjs`

**Interfaces:**
- Consumes: `listCollections()` (dengan `category`, dari Task 1), `searchIconsFiltered()` (dari Task 1), label `icCategory` / `icAllCategories` / `icOtherCategory` (dari Task 1), komponen `Select` (sudah dipakai dropdown koleksi).
- Produces: panel dengan state `selectedCategory` (`''` = semua kategori); dropdown kategori + koleksi sebaris; `THUMB_PX = 40` (tombol 44 px).

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/components/editor/IconifyPanel.jsx src/components/editor/IconifyPanel.jsx.bak-modal-t2
cp tests/iconify-panel.test.cjs tests/iconify-panel.test.cjs.bak-modal-t2
```

- [ ] **Step 2: Write the failing test** — di `tests/iconify-panel.test.cjs` (SSR `renderToStaticMarkup`, pola yang sudah ada):
  - Panel me-render dropdown kategori (`data-testid="ic-category"`) dengan opsi "Semua kategori" + kategori unik dari `collections` yang dipasok (termasuk "Lainnya" bila ada koleksi tanpa `category`).
  - `THUMB_PX` — thumbnail `<img>` di-render dengan `width={40} height={40}` (bukan 28).
  - Bila `selectedCategory` aktif, `ic-count` menampilkan jumlah hasil **terfilter** (bukan total API) — uji lewat helper/props yang sama dengan pola tes panel yang sudah ada; bila pola SSR tidak bisa mencapai efek cari, buktikan lewat probe Task 5 dan catat di laporan (jangan memalsukan tes SSR).

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test 2>&1 | tail -5`
Expected: FAIL — tidak ada `ic-category`, thumb masih 28.

- [ ] **Step 4: Implement di `src/components/editor/IconifyPanel.jsx`**
  - State `selectedCategory` (`''` default). Daftar kategori = nilai `category` unik dari `collections` (terurut abjad), koleksi tanpa `category` digabung di bawah label `L.icOtherCategory`.
  - Dropdown kategori (`Select`, `data-testid="ic-category"`) sebaris dua kolom dengan dropdown koleksi (Kategori | Koleksi). Opsi dropdown koleksi = hanya koleksi dalam kategori terpilih (atau semua bila `''`); bila koleksi aktif tidak termasuk kategori yang baru dipilih, reset koleksi ke `''`.
  - Mode telusur: bila kategori terpilih tidak memuat Material Symbols, telusur memakai koleksi pertama dalam kategori itu (bukan grid kosong).
  - Mode cari: bila kategori aktif, pakai `searchIconsFiltered` (Task 1) dan tampilkan `ic-count` = jumlah ikon terfilter yang sudah dimuat; "Muat lagi" tampil selama `!exhausted` dan mengambil halaman berikut lewat helper yang sama. Bila kategori tidak aktif, jalur `searchIcons` lama tidak berubah (total API tetap tampil).
  - `THUMB_PX`: 28 → 40; ukuran tombol di `thumbButton` 32 → 44 (`width: 44, height: 44`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test 2>&1 | tail -5`
Expected: PASS, suite hijau (sebutkan jumlah di laporan).

- [ ] **Step 6: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-2-report.md`.

### Task 3: Wrapper modal + pindah mount

**Files:**
- Create: `src/components/modals/IconifyModal.jsx`
- Modify: `src/components/editor/VectorEditor.jsx`
- Modify: `src/components/editor/EditorRightInspector.jsx`
- Test: `probes/probe-iconify-modal.cjs` (bagian buka/tutup — ditulis di Task 5; siklus tes task ini memakai subset probe yang sama, lihat Step 2)

**Interfaces:**
- Consumes: `IconifyPanel` (tidak berubah, dari Task 2), `usePresence` dari `src/utils/presenceAndFilePicker.jsx`, pola portal `.ov` + `.hp` dari `SettingsModal.jsx`, `onIconifyInsert` / `onIconifyClose` / `recentIcons` (sudah ada di `VectorEditor.jsx`).
- Produces: `<IconifyModal open={boolean} onInsert={fn} onClose={fn} L={object} recentIcons={string[]} />` — `open=false` memainkan animasi keluar lalu unmount (via `usePresence`); backdrop click menutup kecuali saat `.flt` terbuka.

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/components/editor/VectorEditor.jsx src/components/editor/VectorEditor.jsx.bak-modal-t3
cp src/components/editor/EditorRightInspector.jsx src/components/editor/EditorRightInspector.jsx.bak-modal-t3
```

- [ ] **Step 2: Write the failing probe subset dulu (RED)** — buat `probes/probe-iconify-modal.cjs` dengan hanya skenario buka/tutup (sisanya dilengkapi Task 5): `M1` modal terbuka dari tombol floating bar (`[data-testid="ic-modal"]` visible, `[data-testid="ic-panel"]` di dalamnya); `M2` tombol X menutup; `M3` Esc menutup; `M4` klik backdrop menutup; `M5` klik backdrop saat dropdown `.flt` terbuka → modal TETAP terbuka (Review Focus #2). Jalankan melawan build sekarang — Expected: FAIL (tidak ada `ic-modal`).

- [ ] **Step 3: Implement `src/components/modals/IconifyModal.jsx`** — komponen tipis, tanpa logika cari/sisip:
```jsx
// Pola SettingsModal: portal + .ov + .hp + usePresence(open, 200).
// Backdrop: onPointerDown, tutup hanya bila e.target === e.currentTarget
// DAN tidak ada .flt yang terbuka (guard Q4).
// Dialog: <div className="hp" role="dialog" aria-label={L.icTitle}
//   data-testid="ic-modal" style={{maxWidth: 960, maxHeight: '85vh'}}>
//   berisi <IconifyPanel open onInsert onClose L recentIcons />
```
  - Bila `usePresence` mengembalikan `!m`, return `null` (pola SettingsModal). Panel di dalam menerima `open` apa adanya (efek panel yang di-gate `open` tetap benar selama animasi keluar — verifikasi Review Focus #4 di Step 5).

- [ ] **Step 4: Pindah mount**
  - `EditorRightInspector.jsx`: hapus `{tool === 'iconify' && <IconifyPanel …/>}` + hapus prop `onIconifyClose`, `onIconifyInsert`, `recentIcons` dari destrukturisasi dan dari pemanggil — verifikasi dengan `grep -rn "onIconifyInsert\|onIconifyClose\|recentIcons" src/` bahwa tidak ada pemakai lain yang tersisa (bila ada, itu dead code → hapus, catat di laporan).
  - `VectorEditor.jsx`: tambah import `IconifyModal`, mount di dekat portal import modal yang sudah ada: `<IconifyModal open={tool === 'iconify'} onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} recentIcons={prefs?.recentIcons || []} />` — TANPA bungkus kondisional `tool === 'iconify' &&` (spec §6.2/Q5). Jangan ubah `tool`, `setToolToggle`, `onIconifyClose`, tombol floating bar, atau handler keyboard global.

- [ ] **Step 5: Build + jalankan subset probe (GREEN)**

Run:
```bash
npm run build:web
cd web && python3 -m http.server 9041
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```
Expected: M1–M5 PASS. Lalu verifikasi Review Focus #4: tutup modal, hitung request Iconify sesudah tutup (tidak ada fetch baru), 0 pageerror — catat angkanya di laporan.

- [ ] **Step 6: `npm test` penuh tetap hijau**

Run: `npm test 2>&1 | tail -5`
Expected: PASS (jumlah sama seperti sesudah Task 2).

- [ ] **Step 7: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-3-report.md`.

### Task 4: Cascade sisipan berurutan

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (`onIconifyInsert` + ref penghitung)
- Test: `probes/probe-iconify-modal.cjs` (skenario cascade — ditambah ke file Task 3)

**Interfaces:**
- Consumes: `onIconifyInsert` (sudah ada — loadSet → buildIconSvg → parseSVG → skala frame 96 px → `commit` → `say` → `rememberRecentIcon`), `tool` (untuk reset penghitung saat modal ditutup).
- Produces: sisipan Iconify ke-`n` dari satu sesi modal (n = 0, 1, 2, …) bergeser `+24 * (n % 10)` px ke kanan-bawah dalam koordinat dokumen; hanya sisipan **berhasil** yang memajukan penghitung.

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/components/editor/VectorEditor.jsx src/components/editor/VectorEditor.jsx.bak-modal-t4
```

- [ ] **Step 2: Write the failing probe dulu (RED)** — tambah ke `probes/probe-iconify-modal.cjs`: `M6` sisip ikon yang sama 3× dari modal yang sama → bbox ke-2 bergeser (+24, +24) dan ke-3 (+48, +48) dari bbox pertama (toleransi ±2 px); `M7` tutup modal lalu buka lagi lalu sisip → bbox kembali ke tengah (offset reset); `M8` zoom 200% → pergeseran tetap 24 doc unit per langkah (Review Focus #1); `M9` sisipan gagal (blokir CDN untuk set itu) tidak memajukan penghitung — sisipan berhasil berikutnya bergeser +24 px, bukan +48 px (Review Focus #5). Jalankan melawan build Task 3 — Expected: FAIL (M6: ketiga bbox identik).

- [ ] **Step 3: Implement di `src/components/editor/VectorEditor.jsx`**
  - Ref baru `iconifyCascadeRef = useRef(0)` di dekat `onIconifyInsert`. Di dalam `onIconifyInsert`, sesudah `commit` berhasil (dan hanya sesudah berhasil — catch tidak menyentuh ref): `const step = iconifyCascadeRef.current % 10; const off = step * 24;` terapkan `dx += off; dy += off;` SEBELUM `VE.translate` (offset dalam koordinat dokumen), lalu `iconifyCascadeRef.current += 1`.
  - Reset: `useEffect` yang mengawasi `tool` — saat `tool` berubah dari `'iconify'` ke bukan-`'iconify'`, set `iconifyCascadeRef.current = 0`. (Modal tertutup ⟺ tool bukan `'iconify'`, karena `open={tool === 'iconify'}`.)
  - Tidak ada perubahan pada ukuran frame (96 px), pewarnaan, metadata, toast, atau `rememberRecentIcon`.

- [ ] **Step 4: Build + jalankan probe cascade (GREEN)**

Run:
```bash
npm run build:web
cd web && python3 -m http.server 9041
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```
Expected: M1–M9 PASS.

- [ ] **Step 5: `npm test` penuh tetap hijau**

Run: `npm test 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 6: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-4-report.md`.

### Task 5: Probe end-to-end modal + regresi probe lama

**Files:**
- Create (lengkapi): `probes/probe-iconify-modal.cjs`
- Modify: `probes/probe-iconify.cjs`
- Test: semua probe Iconify

**Interfaces:**
- Consumes: semua hasil Task 1–4; pola relay CONNECT + `--ignore-certificate-errors` dari header `probe-iconify.cjs`.
- Produces: `probe-iconify-modal.cjs` lengkap (semua skenario M1–M13 di bawah, exit 0 bila semua lolos); `probe-iconify.cjs` tanpa P6.

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp probes/probe-iconify.cjs probes/probe-iconify.cjs.bak-modal-t5
```

- [ ] **Step 2: Lengkapi `probes/probe-iconify-modal.cjs`** (di atas M1–M9 dari Task 3–4):
  - `M10` tombol `V` (Select) saat modal terbuka TIDAK menutup modal dan TIDAK mengganti tool (guard `.ov` — tekan `V`, tunggu 500 ms, `ic-modal` masih visible, `aria-pressed` tombol Ikon masih `true`).
  - `M11` kategori memfilter dropdown koleksi (pilih kategori → opsi koleksi hanya dalam kategori itu) dan grid telusur (ikon pertama dalam grid berasal dari koleksi dalam kategori itu).
  - `M12` cari "home" dengan kategori aktif → semua ikon hasil berasal dari koleksi dalam kategori itu, dan `ic-count` = jumlah ikon terfilter yang tampil (bukan total API).
  - `M13` 0 pageerror selama seluruh probe modal.
  - Header probe mendokumentasikan cara jalan + port (pola `probe-iconify-thumb.cjs`: `PROBE_THUMB_URL`, serve `web/` di 9041).

- [ ] **Step 3: Perbarui `probes/probe-iconify.cjs`** — hapus P6 ("klik tool Select menutup panel") beserta penanda terkait; semua skenario lain (P0–P5, P7, T6, T8) dipertahankan apa adanya kecuali penyesuaian penanda panel bila mount baru mengubahnya — tiap perubahan dicatat di laporan dengan alasan. (T8-4 "Recolor + FindReplace stay open stacked alongside Iconify" tidak lagi relevan untuk modal — panel tidak lagi berdampingan di sidebar — hapus dengan alasan tertulis, bukan diam-diam.)

- [ ] **Step 4: Jalankan seluruh sweep probe (GREEN)**

Run (serve `web/` di 9041 dan 9042 sesuai header tiap probe):
```bash
PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-thumb.cjs
OFFLINE_URL=http://127.0.0.1:9042/ node probes/probe-iconify-offline.cjs
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```
Expected: probe-iconify (tanpa P6 + tanpa T8-4) semua lolos — sebutkan jumlah baru di laporan; thumb 3/3; offline 14/14; modal M1–M13 semua lolos; 0 pageerror di semua probe.

- [ ] **Step 5: `npm test` penuh tetap hijau**

Run: `npm test 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 6: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-5-report.md` (daftar skenario + hitungan tiap probe + perubahan P6/T8-4 dengan alasan).

### Task 6: Verifikasi akhir + ZIP

**Files:**
- Modify: `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-6-report.md` (create, laporan akhir)
- Output: `~/workspace/your_files/Geovanta-Iconify-Modal.zip`

**Interfaces:**
- Consumes: semua hasil Task 1–5; aturan inklusi ZIP ruling R8 (sama seperti ZIP Iconify: `src/`, `web/`, `tests/`, `probes/`, `docs/`, `dist/`, `src-tauri/`, `.github/`, config/scripts; keluar: `node_modules/`, `*.bak*`).
- Produces: ZIP final + laporan akhir dengan receipt lengkap (jumlah entri, byte, SHA256, delta CRC vs ZIP ThumbFix `b5d7c714…`).

- [ ] **Step 1: Full gate di working copy**

Run:
```bash
npm test 2>&1 | tail -5
npm run build:web
```
Expected: suite hijau (sebutkan jumlah akhir termasuk tes baru Task 1–2); build exit 0, 0 warning; `web/assets/geovanta.bundle.js` md5 identik dengan `dist/assets/geovanta.bundle.js`; catat ukuran bundle baru dan selisih vs 2.020.678 B.

- [ ] **Step 2: Ulangi seluruh sweep probe di working copy**

Run: keempat probe seperti Task 5 Step 4.
Expected: semua hijau (sebutkan hitungan tiap probe di laporan).

- [ ] **Step 3: Smoke dari hasil ekstrak ZIP kandidat**
  - Kemas ZIP kandidat ke `~/workspace/your_files/Geovanta-Iconify-Modal.zip` (zip langsung dari working copy per R8; verifikasi 0 entri `node_modules/` dan 0 `*.bak*` dari listing).
  - Ekstrak ke `/tmp/iconify-modal-smoke/`, serve `web/` hasil ekstrak di port 9043, jalankan `probe-iconify-thumb.cjs` + `probe-iconify-modal.cjs` melawannya.
Expected: thumb 3/3, modal M1–M13 semua lolos; `web/assets/geovanta.bundle.js` hasil ekstrak md5-identik dengan working copy.

- [ ] **Step 4: Delta ZIP vs ZIP ThumbFix** — `unzip -l` kedua ZIP → daftar file diurutkan → `comm`; perbandingan CRC file yang sama. Catat: DIUBAH / DITAMBAH / DIHAPUS (perkiraan: diubah `iconifyClient.jsx`, `IconifyPanel.jsx`, `appI18n.jsx`, `VectorEditor.jsx`, `EditorRightInspector.jsx`, kedua bundle, 2 file tes, `probe-iconify.cjs`; ditambah `IconifyModal.jsx`, `probe-iconify-modal.cjs`, laporan + plan modal). ZIP ThumbFix (`Geovanta-Iconify-ThumbFix.zip`, SHA `b5d7c714…`) TIDAK ditimpa — verifikasi SHA-nya sesudah pengemasan.

- [ ] **Step 5: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-6-report.md` dengan receipt ZIP lengkap (entri, byte, SHA256, delta, hasil smoke). Laporan ini ada di dalam ZIP; bila laporan di dalam ZIP berbeda dari versi on-disk hanya pada baris receipt, catat seperti preseden Task 9 Iconify (jangan kemas ulang tanpa alasan).

---

## Self-review (run after writing the plan)

**1. Spec coverage:** G1 (modal, hapus sidebar) → Task 3. G2 (search + set + kategori + grid lega) → Task 1 + 2 + 3 (thumb 40). G3 (sisip, modal tetap terbuka) → Task 3 (wiring tidak berubah) + Task 4 (cascade). G4 (tutup X/Esc/backdrop) → Task 3 + probe M2–M4 + M10. G5 (perilaku lama: telusur default, cari, Muat lagi, offline, lisensi, recent) → Task 2 (jalur lama tidak berubah) + regresi Task 5. §6.3 (kategori, hitungan terfilter, "Muat lagi" isi-ulang, label) → Task 1 + 2. §6.4 (thumb 40) → Task 2. §9 Q1–Q6 → Q1 Task 4, Q2 Task 3 + M10, Q3 Task 1 + 2, Q4 Task 3 + M5, Q5 Task 3, Q6 Task 1. Tidak ada gap.

**2. Step scan:** setiap langkah menulis tepat satu hal yang masuk akal (tes gagal → implementasi → tes lolos → laporan). Tidak ada langkah "TBD" atau "tangani edge case" tanpa nama.

**3. Type consistency:** `searchIconsFiltered(query, {category, collections, limit, signal}) -> {icons, exhausted}` dipakai sama di Task 1 (definisi) dan Task 2 (pemakaian). `selectedCategory: ''` konsisten. `iconifyCascadeRef` hanya di Task 4. `ic-modal` / `ic-panel` / `ic-category` konsisten di Task 3–5.

**4. Review Focus:** kelima baris sudah dipetakan ke tes di Task 1 (#3), Task 3 (#2, #4), Task 4 (#1, #5).

**5. Proportion:** plan ini 317 baris untuk spec 276 baris — sebanding; blok kode hanya untuk signature/helper dan perintah verifikasi, bukan transkrip program.
