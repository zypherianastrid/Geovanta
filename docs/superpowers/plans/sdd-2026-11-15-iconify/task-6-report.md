# Task 6 Report — Insert flow + metadata (monochrome recolor, palette preserved)

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 4, 5, 6)
**Date:** 2026-11-15
**Verdict: DONE** — probe 43/43 hijau di dua run, suite penuh 299/299, `build:web` exit 0.
Skill yang dipakai (aturan `AGENTS.md`, jalur cepat): `executing-plans` +
`test-driven-development` (RED probe → GREEN, sesuai brief Step 1–2).
Review adalah tugas koordinator.

## 1. Ikon yang dipakai (nama persis — dicatat probe saat runtime)

| Ikon | Peran | Objek | Grup | Metadata `icon` |
| --- | --- | --- | --- | --- |
| `mdi:home` | fill-based monokrom | 1 | `mdi:home` | `{name: "mdi:home", license: "Apache-2.0"}` |
| `tabler:home` | stroke-based monokrom (R6) | 2 | `tabler:home` | `{name: "tabler:home", license: "MIT"}` |
| **`circle-flags:aa`** | **palette (ditemukan runtime, lihat §2)** | 6 | `circle-flags:aa` | `{name: "circle-flags:aa", license: "MIT"}` |
| **`tabler:arrow-bottom-circle`** | **multi-elemen (Task 1)** | 2, leaf `["path","circle"]`, node `[4,5]` | `tabler:arrow-bottom-circle` | `{name: "tabler:arrow-bottom-circle", license: "MIT"}` |

## 2. Yang diimplementasikan (`VectorEditor.jsx` saja + probe)

**`src/components/editor/VectorEditor.jsx`** (backup `.bak-iconify-t6`, 359.380 B;
diff terhadap backup hanya 3 penambahan ini):

1. Import klien Task 3: `loadSet, buildIconSvg, isPaletteIcon, listCollections`
   dari `../../renderer/iconifyClient.jsx` (R11: tidak ada host hardcode di
   kode produk — host hanya konstanta klien Task 3).
2. `shapeStyRef` (pola `blobParamsRef`): `onIconifyInsert` adalah
   `useCallback([])`, jadi gaya aktif dibaca lewat ref agar tidak stale.
3. `onIconifyInsert` menggantikan stub Task 5:
   `loadSet(prefix)` → `buildIconSvg` → aturan warna (`isPaletteIcon`) →
   `VE.parseSVG` → skala frame ke 96 px (`k = 96 / viewBox`, dari viewBox
   hasil parse — bukan hardcode 4, jadi set 32×32 seperti circle-flags
   ikut benar) → translate ke tengah viewport (pola `importFiles`:
   `boxRef` + `toDoc`) → satu `commit(..., null)` (= satu langkah Undo)
   → `setSel` ke objek baru → toast `Ikon <nama> disisipkan`.
   - **Grup:** nama grup = nama ikon penuh (`mdi:home`), diunikkan
     (`-2`, `-3`, …) bila bentrok; nama objek diunikkan seperti
     `importFiles`. R12: grup diberi saat insert, BUKAN di `parseSVG`.
   - **Aturan warna (spec §7.5), per objek:** palette → warna asli
     dipertahankan; monokrom → path ber-fill memakai Fill aktif, path
     ber-stroke memakai warna + ketebalan Stroke aktif (`shapeSty` —
     gaya yang sama dipakai `makeShape` untuk shape baru). Ketebalan
     aktif diterapkan dalam ruang ikon, lalu skala frame mengalikannya
     (skala artwork seragam — stroke native 2 pada 24 unit menjadi 8
     pada 96, sama seperti render yang diverifikasi Task 1; bila sw
     aktif ≤ 0, dipakai lebar native ikon supaya ikon stroke-based
     tidak lenyap).
   - **Metadata:** `icon: {name, license}` menempel di TIAP objek anggota
     grup (pola `gen`), ikut save/load karena save menyimpan objek
     verbatim (hanya field `_gl*` yang dibuang `prepareDocumentForStorage`;
     `hydrateDocument` + `normalizeTextDocument` meneruskan objek non-teks
     apa adanya — ketiganya dibaca dan diverifikasi, bukan diasumsikan).
   - **Lisensi:** API live mengembalikan license sebagai OBJEK
     `{title, spdx, url}` (bukan string seperti mock Task 3) — insert
     menormalkannya ke string SPDX (`spdx` → `title` → null), sesuai
     contoh spec §7.6 (`"Apache-2.0"`). Bila `icon.license` tidak ada
     (recent chips), dicari dari `listCollections()` (best-effort, tidak
     pernah menggagalkan sisip).
   - **Gagal** (set tidak termuat / SVG tidak terurai / nama tak dikenal):
     `catch` → toast `Gagal menyisipkan ikon …: <pesan klien>`; commit
     hanya terjadi sesudah parse + transform berhasil, jadi nol objek
     dibuat. Lihat §6 untuk batas verifikasi cabang ini.
   - **Recent chips (`onInsert({name})`, minor Task 4):** prefix diturunkan
     dari nama bila berbentuk `prefix:nama`; license via lookup di atas.
     Nama polos tanpa `:` sama sekali tidak bisa di-resolve → toast,
     nol objek. **Gap untuk Task 7:** prefs `recentIcons` HARUS menyimpan
     nama penuh `prefix:nama` — bila hanya nama pendek yang disimpan,
     sisip dari "Terakhir dipakai" akan selalu gagal dengan toast itu.

## 3. Ruling / verifikasi per poin koordinator

- **R3 — TIDAK ada perubahan `tests/iconify-client.test.cjs`.** Tes
  `isPaletteIcon: true untuk palette:true dan untuk fill="#ff0000"; ...`
  sudah mencakup persis kasus fallback eksplisit: `isPaletteIcon(
  {name: 'x:logo', prefix: 'x', palette: false}, colorSet)` → `true`,
  dengan `colorSet` berbodi `fill="#ff0000"` tanpa flag palette.
  File tes: 14/14 lolos sebelum dan sesudah tugas ini.
- **R6 — stroke vs fill, DENGAN CATATAN NILAI.** Tidak ada UI yang
  menyetel Fill aktif dan Stroke aktif secara independen: `shapeSty`
  hanya mengikuti accent (`fill = accent`, `stroke = accentStroke(accent)`
  = HSV value × 0,45). Probe memakai accent biru murni `#0000ff` →
  Fill `#0000ff`, Stroke `#000073` (0,45×255 = 114,75 → 115 = 0x73,
  diverifikasi dari `src/utils/colorMath.jsx`). Yang ditegaskan probe:
  kedua path `tabler:home` memakai Stroke `#000073` (BUKAN Fill
  `#0000ff`) dan fill tetap `none` (T6-4c/d). Substansi ruling — warna
  Stroke yang menang, warna Fill tidak dipakai — terverifikasi; nilai
  harfiah "Stroke MERAH, Fill BIRU" tidak dapat dicapai lewat UI produk.
- **R7 — lokasi aktual (bukan nomor baris plan):** `importFiles` ~:2980,
  stub `onInsert` ~:189, `shapeSty` ~:458, `toDoc` ~:3276, `commit` ~:1084,
  `push` ~:1054. Semua diverifikasi dari file, bukan dari plan.
- **R10 — skala frame lewat jalur sisip ASLI (bukan wrapper `<g>`
  probe Task 1):** `VE.scaleObj(o, 0, 0, k)` + `strokeWidth × k`, lalu
  `VE.translate` ke tengah viewport. Tight bbox terukur = native × 4
  di tengah viewport, persis (toleransi ±2, hasil aktual 0 selisih):
  `mdi:home` 80×68 di `[360,264,440,332]`; `tabler:home` 72×72 di
  `[364,264,436,336]`; multi 24×72 di `[388,264,412,336]`.
- **R12 — recolor grup bernama, diuji ULANG sesudah penamaan grup
  (T6-7):** Ctrl+A → Stroke panel `#00aa00` → KEDUA grup stroke-based
  (`tabler:home` dan `tabler:arrow-bottom-circle`, masing-masing 2/2
  objek) berubah; satu Ctrl+Z mengembalikan ke `#000073`. Verdict Task 1
  dikonfirmasi: alternatif "pecah grup / set fill per sub-path" TIDAK
  diperlukan — panel Fill/Stroke mewarnai ulang objek bergrup. (Catatan:
  klik kanvas pada satu anggota grup tetap memilih SATU objek itu saja —
  perilaku editor pra-ada untuk semua grup, bukan khusus ikon.)
- **R14 — stroke width sesudah save/reload (T6-8):** `tabler:home` dan
  multi membawa `strokeWidth: 8` (2×4) dan metadata `icon` utuh sesudah
  (a) JSON round-trip via `loadTestDoc` DAN (b) autosave nyata → reload
  halaman → buka ulang proyek dari workspace home (10 objek, semua
  grup + metadata utuh). **Koreksi temuan Task 1:** `sw: null` di dump
  Task 1 adalah artefak probe — probe membaca field `o.sw` yang tidak
  ada; field sebenarnya adalah `strokeWidth` (parser
  `svgDocumentParser.jsx:520,601`: `swVal = parseFloat(...) * sc`,
  sudah diskala transform). Nilai terverifikasi di `getDoc()`: 8.

## 4. Temuan saat pengujian (dicatat, bukan blocker)

1. **Lisensi API berupa objek** (`{title, spdx, url}`) — lihat §2.
   Konsekuensi di luar scope tugas ini: label lisensi panel
   (`IconifyPanel.jsx`, `replace('{license}', ...)`) akan me-render
   `"[object Object]"` untuk koleksi live. TIDAK diperbaiki di sini
   (file di luar daftar brief) — diteruskan ke koordinator/Task 4.
2. **Search API tidak pernah mengembalikan `tabler:arrow-bottom-circle`**
   (diverifikasi live via curl: query `arrow-bottom-circle` → hanya 2
   hasil MDI; `arrow` / `circle` / `arrow-bottom` juga tidak
   mengembalikannya). Probe mencapai ikon multi via mode telusur:
   filter koleksi `tabler` + tombol "Load more" ×6 (kunci tabler
   alfabetis, `arrow-bottom-circle` di indeks 268). Implikasi produk:
   user yang mencari ikon ini lewat kata kunci tidak akan menemukannya
   — itu perilaku API, bukan bug panel.
3. **Palette discovery memilih `circle-flags:aa`** (koleksi
   `palette: true` pertama yang diprioritaskan; set 32×32, 444 ikon).
   Ikon ini ter-parse menjadi 6 objek (bukan 1) — menegaskan perlunya
   `waitForCountAtLeast` untuk ikon palette.

## 5. Hasil pengujian

Perintah (server sudah jalan dari `web/`):

```text
cd web && python3 -m http.server 9041
PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs   # tanpa pipe (exit code tercatat)
node --test tests/iconify-client.test.cjs
npm test
npm run build:web
```

**RED (sebelum implementasi, build Task 5):** probe berhenti di T6-1 —
`waitForCount: Timeout 60000ms exceeded` (stub `onInsert` tidak
menyisip apa pun), exit 2; P0–P7 + T6-0 lolos. Unit test 14/14 lolos
(suite Task 3, tidak berubah).

**GREEN (sesudah implementasi, 2 run penuh, hasil identik):**

```text
PROBE-ICONIFY-T6: 43/43 lolos | SEMUA LOLOS
PROBE_EXIT=0
```

Rincian 43 asersi: P0–P6 + P7 (11, wiring Task 5 tetap hijau), T6-0 (1),
T6-1a–h (8: 1 objek, grup `mdi:home`, fill `#0000ff`, stroke `none`,
metadata, bbox `[360,264,440,332]`, terseleksi, toast), T6-2 (1: satu
Ctrl+Z → 0 objek), T6-4a–g (7: 2 objek, grup, stroke `#000073`, fill
`none`, strokeWidth `[8,8]`, metadata MIT, bbox `[364,264,436,336]`),
T6-5a–d (4: 6 objek `circle-flags:aa`, warna asli `#0052b4` dkk.
dipertahankan, tanpa fill `#0000ff`, metadata MIT), T6-6a–f (6: 2 objek,
node `[4,5]`, grup, stroke `#000073`/width 8/fill `none`, bbox
`[388,264,412,336]`, metadata MIT), T6-7a–c (3: recolor grup → `#00aa00`,
undo → `#000073`), T6-8a–b (2: metadata + strokeWidth 8 selamat
round-trip JSON dan save/reload nyata), P7 0 pageerror.

```text
$ node --test tests/iconify-client.test.cjs
ℹ tests 14 — pass 14, fail 0

$ npm test
ℹ tests 299 — pass 299, fail 0

$ npm run build:web
exit 0 — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."
```

Screenshot (bukti visual): `probes/shots/iconify-t6-mdi.png`,
`probes/shots/iconify-t6-multi.png`, `probes/shots/iconify-t6-after-reload.png`.
Server `http.server 9041` dimatikan setelah run ke-2.

## 6. Batasan jujur / yang TIDAK terverifikasi

- **Cabang gagal (toast + nol objek) TIDAK terverifikasi lewat UI:**
  panel hanya me-render ikon yang set-nya SUDAH termuat (anti-goal A4),
  jadi tidak ada klik UI yang bisa membuat `loadSet`/`buildIconSvg`
  gagal sesudah ikon tampil. Jaminannya struktural (commit hanya
  sesudah parse + transform berhasil; `catch` → toast) + dibaca di
  code review sendiri — bukan bukti probe. Bila koordinator ingin bukti
  runtime, jalurnya adalah intersepsi request untuk set yang belum
  dimuat, atau memanggil `onInsert` dengan nama palsu lewat API yang
  diekspos (tidak ditambahkan — YAGNI).
- **Sisip dari "Terakhir dipakai" belum teruji UI-nya:** `recentIcons`
  belum dipasok Task 7 (panel memakai default `[]`), jadi tidak ada chip
  recent yang bisa diklik. Penanganan `{name}`-saja ada di kode
  (§2) dan menunggu Task 7.
- **Hanya headless Chromium 1440×900 light**, prefs `id`; launch
  Windows + GPU asli belum terukur (seperti ronde-ronde sebelumnya).
- **Satu Ctrl+Z = satu sisipan** terverifikasi untuk mdi (T6-2); untuk
  tabler/multi/palette, satu commit yang sama dipakai (satu `commit()`
  per sisip) — tidak diuji Undo per ikon satu-persatu.
- **Batas 256 KB SVG** ditegakkan `buildIconSvg` (tes unit Task 3),
  tidak diuji ulang lewat UI (tidak ada ikon sebesar itu di alur UI).

## 7. File yang dibuat / diubah

Diubah:

- `src/components/editor/VectorEditor.jsx` (+1 import, +5 baris
  `shapeStyRef`, +~55 baris `onIconifyInsert`) — backup
  `src/components/editor/VectorEditor.jsx.bak-iconify-t6` (359.380 B,
  dibuat SEBELUM edit pertama; diff hanya berisi 3 penambahan itu).
- `probes/probe-iconify.cjs` (36.364 B) — asersi T6-0–T6-8 + helper
  `docSnap`/`expectedBbox`/`waitForCountAtLeast`; asersi P0–P7 Task 5
  tidak diubah isinya (hanya label ringkasan `T5` → `T6`).

Tidak diubah: `tests/iconify-client.test.cjs` (R3 — cakupan sudah ada),
`IconifyPanel.jsx`, klien Task 3, file lain apa pun. Tidak ada dependensi
npm baru. Tidak ada host hardcode di kode produk.

Dibuat: laporan ini + 3 screenshot probe (§5).

## 8. Self-review

- **Completeness:** semua langkah brief 1–5 + semua ruling (R3, R6, R7,
  R10, R12, R14, R11, nama Task 1, minor Task 4/Task 5) dipenuhi atau
  dicatat penyimpangannya dengan alasan (§3 R6, §6 cabang gagal).
- **Quality:** angka disalin dari output probe (bbox, warna, hitungan
  objek, node) — bukan dari ingatan; dua run probe hijau identik.
- **Discipline:** hanya jalur sisip (YAGNI) — tidak ada perubahan panel,
  klien, serializer, atau API test-only; tidak ada perbaikan
  "[object Object]" di luar scope.
- **Testing:** perilaku nyata di browser asli (fetch CDN/API via relay,
  `parseSVG`, render CanvasKit, panel Fill/Stroke, Undo, autosave +
  reload + reopen) — bukan mock, bukan curl. Satu-satunya pengecualian
  yang didokumentasi: byte CONNECT diterbitkan relay Node (pola spike1)
  dan cabang gagal yang hanya dijamin struktural (§6).
- **Kesalahan sendiri yang diperbaiki sebelum lapor:**
  1. Asersi T6-5 menunggu hitungan objek EKSAT (+1) — ikon palette
     bisa ter-parse >1 objek; diperbaiki ke `waitForCountAtLeast`.
  2. T6-6 gagal 2× karena (a) filter koleksi dari T6-5 masih aktif
     saat cari, lalu (b) search API ternyata tidak pernah
     mengembalikan `tabler:arrow-bottom-circle` — diperbaiki ke
     telusur tabler + "Load more" (§4 butir 2).
  3. Lisensi objek vs string — ditemukan dari output probe
     (`license=[object Object]`), dinormalisasi ke SPDX di insert
     dan di discovery probe (§4 butir 1).
