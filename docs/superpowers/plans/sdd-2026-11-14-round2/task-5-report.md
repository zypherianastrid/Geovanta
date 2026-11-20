# Task 5 report — Ronde 2: PinGrid persegi di kedua pemakaian

**Status: DONE.** Skill: `test-driven-development` (probe RED dulu, baru GREEN),
`ui-ux-fixer-and-improvement` (tanpa `!important`/offset/z-index/klip baru),
`verification-before-completion` (klaim hanya dengan bukti run segar).
Working copy: `/home/hatch/workspace/geovanta-round2/` (bukan repo git).
Server probe: `http://127.0.0.1:8931/` (server sisa T2 yang menyajikan `web/`
working copy ini; dipakai ulang — `web/` di-rebuild sesudah edit, server
statis menyajikan file segar per request, terbukti dari perubahan ukuran
terukur antar run).

## Ringkasan hasil

| Pemakaian | Sebelum | Sesudah | Persegi |
| --- | --- | --- | --- |
| Transform (`.pin3-fill`) | 62 × 70,5 | **70,5 × 70,5** | ya |
| Alignment Auto layout (tanpa fill) | 62 × 60 | **62 × 62** | ya |
| Bottom-alignment Transform vs tombol "Skala stroke" | Δ 0 px | Δ 0 px | terjaga |

Ukuran persegi yang dipilih: **tidak satu angka** — sesuai brief butir 2,
Transform mengikuti tinggi kolom kanan (70,5 px, ditentukan Seg pivot +
gap 6 px + tombol "Skala stroke" 26,5 px), Alignment tetap 62 × 62 dari
`width: 62px` + `aspect-ratio: 1`. Kedua pemakaian persegi; tidak ada
angka magic baru.

## RED → GREEN

### RED (probe baru, sebelum implementasi)

Probe baru `probes/probe-r2-t5-pingrid-square.cjs` (6 asersi):
F1 Transform persegi (TARGET), F2 Alignment persegi (TARGET),
F3 bottom-alignment vs "Skala stroke" (GUARD), F4 klik pin tengah
Transform (GUARD), F5 klik pin tengah Alignment (GUARD), F6 0 pageerror.

```
R2-T5 before: 4/6 lolos | GAGAL: F1, F2
  F1 FAIL  Transform  {"w":62,"h":70.5}   (stretch, bukan persegi)
  F2 FAIL  Alignment {"w":62,"h":60}     (58 konten + border 2px, bukan persegi)
  F3 PASS  |grid.bottom-stroke.bottom| = 0 px
  F4 PASS  F5 PASS  F6 PASS (0 pageerror)
```

Baseline sebelum perubahan apa pun: `npm test` **277/277 PASS, 0 fail**.

### GREEN percobaan 1 — CSS saja (GAGAL, temuan akar penting)

Perubahan AST saja (`.pin3` + `aspect-ratio: 1` + `grid-template-rows:
repeat(3,1fr)`, tombol `height: 100%`, `.pin3-fill` + `width: auto`):

```
R2-T5 after: 4/6 lolos | GAGAL: F1, F4
  F1 FAIL  Transform {"w":18,"h":70.5}   <- LEBAR RUNTUH ke min-content
  F4 FAIL  klik pin tengah timeout — tombol tak terlihat (grid 18px)
  F2 PASS  Alignment 62x62 | F3 PASS (0 px) | F5 PASS | F6 PASS
```

Akar: di **flex row**, `width: auto` + `aspect-ratio: 1` tidak menurunkan
lebar dari tinggi stretch — saat flex-basis ditentukan, tinggi stretch
belum definite, jadi lebar jatuh ke min-content grid (padding 10 +
gap 6 + tombol ~0 = ~18 px). Mekanisme literal brief butir 2
("lebar mengikuti tinggi") tidak bekerja di flex row.
Dibuktikan isolasi minimal (`/tmp/t5test/t.html`, Chromium sama):
flex row → 16 × 70,5; **grid parent → 70,5 × 70,5**; flex-end fallback →
62 × 62. Karena itu baris Transform diubah flex → grid (pola yang
sudah dipakai baris Alignment di file yang sama,
`grid grid-cols-[auto_1fr]`).

### GREEN final — CSS + baris Transform jadi grid

```
R2-T5 after: 6/6 lolos | SEMUA LOLOS
  F1 PASS  Transform {"w":70.5,"h":70.5}
  F2 PASS  Alignment {"w":62,"h":62}
  F3 PASS  |grid.bottom-stroke.bottom| = 0 px
  F4 PASS  F5 PASS  F6 PASS (0 pageerror)
```

## Diff (minimal, 2 file sumber + probe + screenshot)

### 1. `src/vendor/tailwindOfflineBundle.jsx` — baris 437 saja (AST, 1 baris)

Backup: `src/vendor/tailwindOfflineBundle.jsx.bak-t5` (dibuat sebelum edit
pertama). Round-trip JSON AST terverifikasi identik sebelum edit.

- `[311]` `.pin3`: tambah `['aspect-ratio','1']`,
  `['grid-template-rows','repeat(3,1fr)']` (tetap `width: 62px`).
- `[312]` `.pin3 button`: `['height','14px']` → `['height','100%']`,
  tambah `['min-height','14px']` — tombol mengisi baris 1fr secara
  deterministik (bukan 14 px tetap di kotak 62 px).
- `[835]` `.pin3-fill`: tambah `['width','auto']` — lebar mengikuti
  tinggi terentang via `aspect-ratio` (bukan 62 px tetap);
  `align-self: stretch` + `grid-template-rows` dipertahankan.

### 2. `src/components/editor/EditorRightInspector.jsx` — baris 260 saja

Backup: `src/components/editor/EditorRightInspector.jsx.bak-t5`.

```diff
- <div className="flex items-start gap-2.5 pt-0.5"><PinGrid … tip="veXfPin" className="pin3-fill" />
+ <div className="grid grid-cols-[auto_1fr] items-stretch gap-2.5 pt-0.5"><PinGrid … tip="veXfPin" className="pin3-fill" />
```

Alasan: lihat "GREEN percobaan 1" di atas — di grid, tinggi stretch
definitif sehingga `aspect-ratio` menurunkan lebar = tinggi; di flex
tidak. Tidak ada perubahan pada `fig-flow-bar`/tombol lain; seksi
Alignment tidak disentuh (sudah grid).

### 3. Baru: `probes/probe-r2-t5-pingrid-square.cjs` (+ screenshot)

- `probes/shots/r2-t5-pingrid-before.png` (Transform, sebelum)
- `probes/shots/r2-t5-pingrid-after.png` (Transform, sesudah)
- `probes/shots/r2-t5-pingrid-align-before.png` (Alignment, sebelum)
- `probes/shots/r2-t5-pingrid-align-after.png` (Alignment, sesudah)

Screenshot diperiksa visual: grid Transform persegi, pin tengah biru
terpilih, bawah sejajar tombol "Skala stroke"; grid Alignment persegi
62 × 62. Seksi Auto layout selalu tampil (tidak perlu membuat Frame
auto layout — `veLayPanel` + `veLayAlign` sudah ada saat elips dipilih).

## Tripwire aturan bundle (841 → 841, TIDAK berubah)

Total aturan AST **tetap 841** — tidak ada aturan baru, hanya deklarasi
di dalam 3 aturan yang sudah ada ([311], [312], [835]) yang diubah/
ditambah. Maka `tests/accent-tokens.test.cjs` **tidak diubah**:
tripwire `assert.equal(ast.length, 841)` dan indeks [464]/[465]
tidak bergeser. Justifikasi: tidak ada append aturan di akhir array
karena tidak ada aturan baru yang perlu di-append.

## Regresi & kebersihan

- `npm test` penuh sesudah GREEN: **277/277 PASS, 0 fail**
  (durasi 22,5 dtk) — sama dengan baseline 277/277. Tidak ada file
  unit-test baru; "tes baru" brief = probe Playwright di atas
  (6 asersi, RED→GREEN terverifikasi).
- `npm run build:web` (`node scripts/build-offline-bundle.js`):
  **exit 0** (dijalankan 2×, sesudah tiap gelombang edit).
- `!important`: **357 → 357** (0 baru). Tanpa offset/z-index/klip baru,
  tanpa dependensi baru, tanpa ubah label/i18n.
- `web/` + `dist/` ikut ter-rebuild (output build, bukan sumber).
- `.bak-t5` TIDAK ikut ZIP final (2 file backup di atas).

## Efek samping terukur (bukan tebakan)

- Kolom kanan Transform menyempit: tombol "Skala stroke" 171 px →
  162,5 px (grid melebar 62 → 70,5). Seg pivot + tombol tetap muat,
  tanpa overflow teramati di viewport 1440 × 900.
- Ukuran Transform (70,5) mengikuti tinggi konten kolom kanan; bila
  tinggi Seg/pill berubah, grid tetap persegi karena lebar diturunkan
  dari tinggi via `aspect-ratio`.

## Concerns / belum terverifikasi

1. Kelas `flex-1` pada div kolom kanan Transform kini inert di dalam
   grid (flex-basis diabaikan untuk grid item) — sengaja dipertahankan
   demi diff minimal; reviewer boleh meminta penghapusannya.
2. Hanya tema light + viewport 1440 × 900 + bahasa id yang diprobe
   (sesuai scope desktop ronde 2). Dark theme / EN tidak diprobe —
   aturan yang diubah tidak bergantung tema/bahasa, tapi belum diukur.
3. Probe memakai server 8931 sisa T2 (bukan port baru); asal server
   sama (`web/` working copy) dan perubahan terukur membuktikan
   build segar tersaji.
4. Tidak ada verifikasi manual di browser pengguna (hanya Playwright
   headless Chromium 1255 di VM ini).
