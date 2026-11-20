# Laporan — Ronde 3, Task T4: Gap ikon ↔ teks tombol "Find and Replace"

- **Tugas:** beri gap antara ikon (kiri) dan teks tombol "Find and Replace" di
  seksi Selection Colors, sidebar kanan.
- **Status:** DONE
- **Skill yang dipakai:** `ui-ux-fixer-and-improvement` (diagnosis sistematis
  berbasis prinsip desain; perbaikan struktural via properti `gap` flex, bukan
  offset/magic number), `test-driven-development` (probe RED dulu, GREEN
  sesudah), `browser_ui_fix_verification` (ukur bounding box nyata di Chromium
  headless, bukan heuristik), `verification-before-completion` (semua klaim
  dengan perintah segar di bawah).

## 1. Nilai gap lama / baru + pengukuran bounding box

Pengukuran jarak nyata = tepi kanan `<svg>` ikon → tepi kiri text node label
(`Range.selectNodeContents(textNode).getBoundingClientRect()`), viewport
1440×900, font selesai dimuat (`document.fonts.status === 'loaded'`).

| Tombol | Pra-fix (RED) | Pasca-fix (GREEN) |
|--------|---------------|-------------------|
| **Find and Replace** (`fr-open-selcolors`) | **2.00px** — `iconRight=1326.52`, `textLeft=1328.52`, computed `gap: 2px` | **6.00px** — `iconRight=1324.52`, `textLeft=1330.52`, computed `gap: 6px` |
| Recolor (`rc-open-selcolors`, kontrol tak berubah) | 2.00px (`iconRight=1220.89`, `textLeft=1222.89`) | 2.00px (identik) |
| Select Same Fill / Stroke / Type (kontrol tak berubah) | 2.00 / 2.00 / 2.00px | 2.00 / 2.00 / 2.00px |

Lebar ikon tetap 11px, lebar teks tetap 77.45px — hanya gap yang berubah
(+4px pada jarak ikon-teks). Lebar total tombol tidak dijadikan asersi;
probe R2-T3 B3/B6/B7 pasca-fix memastikan baris tetap terisi penuh tanpa
overflow.

## 2. Preseden gap yang diikuti dan alasannya

Verifikasi ulang peta kode brief (benar): `EditorRightInspector.jsx:509`,
tombol F&R `gap: 2`, anak kedua di baris F&R/Recolor sesudah T3.

Preseden yang diperiksa di seksi yang sama:

- **Semua tombol ikon-teks di file ini memakai `gap: 2`**: Recolor
  (`rc-open-selcolors`), ketiga Select Same, kedua tombol Color Styles
  (`fr-open-styles` / `rc-open-styles`), tombol Create Style, tombol
  "Tambah efek". Jadi **tidak ada preseden gap ikon-teks lain yang berbeda**
  di seksi yang sama — mengikuti preseden itu secara harfiah berarti tidak
  ada perubahan, yang bertentangan dengan permintaan tugas.
- **Preseden yang dipakai: gap antar-tombol di baris yang sama = 6px.**
  Baris F&R/Recolor memakai `flex flex-wrap gap-1.5` → 6px (terukur di probe
  R2-T3 B3: `gap: 6`, `frW + rcW + gap == rowW`). Nilai target **6px**
  adalah saran eksplisit brief, dan menyamakan gap ikon-teks dengan gap
  antar-tombol di baris yang sama memberi ritme spasi yang konsisten
  (satu nilai 6px untuk baris itu).
- Catatan Gestalt (jujur): hukum Proximity idealnya gap intra-tombol
  < gap antar-tombol; di sini keduanya sama (6px). Ini adalah trade-off
  yang disadari dan sesuai brief — bukan pelanggaran fungsional: tombol
  tetap satu kesatuan visual lewat latar `ved-pill`, border, dan
  `justifyContent: center`; probe B3/B7 R2-T3 memastikan baris tetap utuh
  tanpa overflow. Bila reviewer menginginkan hierarki Proximity yang lebih
  ketat, nilai 4px adalah alternatif — tetapi brief meminta 6px dan saya
  mengikuti brief.

## 3. Yang diimplementasikan

Satu perubahan, satu baris, satu token:

- `src/components/editor/EditorRightInspector.jsx:509` — pada tombol
  `data-testid="fr-open-selcolors"` saja: `gap: 2` → **`gap: 6`** di inline
  style. Tidak ada perubahan lain di baris itu.

Tidak diubah (sesuai brief): urutan T3 (Recolor dulu, F&R kedua), label
`{L.frOpenBtn}` ("Find & Replace"), ikon `refresh` size 11, handler
`setFrOpen`, `flex: 1`, padding `6px 10px`, `whiteSpace: nowrap`,
`display: inline-flex`, `alignItems/justifyContent: center`. Tombol Recolor
tetap `gap: 2`. Tombol F&R seksi Color Styles (`fr-open-styles`, baris 360)
tetap `gap: 2` — bukan target brief.

## 4. Yang diuji + hasil (bukti TDD RED/GREEN)

Server: `python3 -m http.server 8988 --directory web` (port segar milik
sendiri), `R3_T4_URL=http://127.0.0.1:8988/`. Build pra-fix dan pasca-fix
masing-masing `npm run build:web` (exit 0). Server sudah dimatikan sesudah
semua probe (curl pasca-kill: 000 / exit 7).

### RED — pra-fix (probe baru, sebelum edit apa pun)

Perintah: `R3_T4_URL=http://127.0.0.1:8988/ node probes/probe-r3-t4-fr-gap.cjs before`

```text
  info frGap: {"gap":2,"iconRight":1326.515625,"textLeft":1328.515625,"iconW":11,"textW":77.453125}
  info rcGap: {"gap":2,"iconRight":1220.890625,"textLeft":1222.890625,"iconW":11,"textW":39.71875}
  info selSameGaps: [{"gap":2,...},{"gap":2,...},{"gap":2,...}]
  info computed: {"fr":{"gap":"2px","padding":"6px 10px 6px 10px","flexGrow":"1"},"rc":{"gap":"2px","padding":"6px 10px 6px 10px","flexGrow":"1"}}
  info labels: {"fr":"Find & Replace","rc":"Recolor"}
FAIL A1 gap ikon-teks tombol F&R = 6px (+-1px) | actual=2.00px expected=6px +-1px
PASS A2 gap ikon-teks tombol Recolor tetap ~2px (tak berubah) | actual=2.00px expected=2px +-1px
PASS A3 urutan T3 tetap: Recolor mendahului F&R (DOM + X) | actual={"rcIdx":0,"frIdx":1,"rcBeforeFr":true,"rcX":1177,"frX":1301.5}
FAIL A4 computed gap F&R=6px / Recolor=2px, padding 6px 10px, flex:1, ikon+label utuh | actual={"frCs":{"gap":"2px",...}}
PASS A5 tombol Select Same tak berubah: gap ikon-teks tetap ~2px (3 tombol) | actual=[2,2,2]
PASS A6 0 pageerror | actual=[]

R3-T4 before: 4/6 lolos | GAGAL: A1, A4
```

RED gagal tepat karena alasan yang diharapkan (gap masih 2px, bukan 6px);
A2/A3/A5/A6 sudah hijau pra-fix sebagai kontrol.

### GREEN — pasca-fix

Perintah: `R3_T4_URL=http://127.0.0.1:8988/ node probes/probe-r3-t4-fr-gap.cjs after`

```text
  info frGap: {"gap":6,"iconRight":1324.515625,"textLeft":1330.515625,"iconW":11,"textW":77.453125}
  info rcGap: {"gap":2,"iconRight":1220.890625,"textLeft":1222.890625,"iconW":11,"textW":39.71875}
  info selSameGaps: [{"gap":2,...},{"gap":2,...},{"gap":2,...}]
  info computed: {"fr":{"gap":"6px","padding":"6px 10px 6px 10px","flexGrow":"1"},"rc":{"gap":"2px","padding":"6px 10px 6px 10px","flexGrow":"1"}}
PASS A1 gap ikon-teks tombol F&R = 6px (+-1px) | actual=6.00px expected=6px +-1px
PASS A2 gap ikon-teks tombol Recolor tetap ~2px (tak berubah) | actual=2.00px expected=2px +-1px
PASS A3 urutan T3 tetap: Recolor mendahului F&R (DOM + X) | actual={"rcIdx":0,"frIdx":1,"rcBeforeFr":true,"rcX":1177,"frX":1301.5}
PASS A4 computed gap F&R=6px / Recolor=2px, padding 6px 10px, flex:1, ikon+label utuh
PASS A5 tombol Select Same tak berubah: gap ikon-teks tetap ~2px (3 tombol) | actual=[2,2,2]
PASS A6 0 pageerror | actual=[]

R3-T4 after: 6/6 lolos | SEMUA LOLOS
```

### Regresi

- Probe R3-T3 (urutan + klik, `R3_T3_URL=http://127.0.0.1:8988/ node
  probes/probe-r3-t3-swap-fr-rc.cjs after`): **7/7 lolos**.
- Probe R2-T3 (Select Same / baris F&R, `R2_T3_URL=http://127.0.0.1:8988/
  node probes/probe-r2-t3-selsame-buttons.cjs after`): **11/11 lolos**
  (termasuk B3 lebar baris, B6 lebar baris == lebar seksi, B7 tanpa
  overflow/clip, B11 F&R membuka seksi + toast Select Same).
- Suite penuh `npm test`: **277/277 PASS, 0 fail** (tests 277, pass 277,
  fail 0, duration ~22,8 dtk).
- Screenshot close-up baris tombol (sebelum = state pra-fix, sesudah =
  pasca-fix) diperiksa visual: tombol F&R sesudah fix tampak renggang
  ikon-teksnya dibanding Recolor; tidak ada pergeseran baris lain.
  Perbedaan 4px memang halus pada skala screenshot — angka bounding box
  di atas adalah buktinya, bukan kesan visual.

## 5. File yang diubah

| File | Perubahan | Backup |
|------|-----------|--------|
| `src/components/editor/EditorRightInspector.jsx` | Baris 509: `gap: 2` → `gap: 6` hanya pada tombol `fr-open-selcolors`; diff `509c509` (1 baris dihapus + 1 ditambah, 2 baris diff) | `src/components/editor/EditorRightInspector.jsx.bak-r3t4` (md5 `3336ec56d7ac0a92bdad960d34ddb437`, dibuat SEBELUM edit pertama; file hasil md5 `fa8dbe0fd72f44106faef3a5f7f6a125`) |
| `probes/probe-r3-t4-fr-gap.cjs` | **Baru** — probe TDD 6 asersi (A1–A6), 10.678 B | — (file baru, bukan edit) |
| `probes/shots/r3-t4-fr-gap-before.png` | **Baru** — close-up baris tombol pra-fix (9.362 B) | — |
| `probes/shots/r3-t4-fr-gap-after.png` | **Baru** — close-up baris tombol pasca-fix (9.364 B) | — |

Build artifact `web/` di-regenerate dua kali (`npm run build:web`: pra-fix
untuk RED, pasca-fix untuk GREEN) — hasil build, bukan source yang diedit
manual. Catatan: probe R2-T3 yang dijalankan sebagai regresi menimpa
screenshot-nya sendiri (`probes/shots/r2-t3-selsame-after.png`) dengan hasil
run baru yang hijau — file itu bukan deliverable T4.

Verifikasi akhir pasca-kerja (grep): `fr-open-selcolors` → `gap: 6`;
`rc-open-selcolors` → `gap: 2`; `fr-open-styles` → `gap: 2`.

## 6. Angka tripwire bundle

Tidak ada perubahan — tugas ini tidak menyentuh CSS/AST sama sekali (murni
satu nilai inline style di JSX). Dihitung ulang dengan metode T3 (file
`src/vendor/tailwindOfflineBundle.jsx`):

| Tripwire | Baseline berjalan (brief) | Sesudah T4 | Δ |
|----------|---------------------------|------------|---|
| Aturan AST total (`TAILWIND_PLUGIN_AST`, parsed) | 841 | **841** | 0 |
| `!important` (file-wide) | 356 | **356** | 0 |
| `acc-deep` (file-wide) | 5 | **5** | 0 |

Catatan metode (jujur): hitungan `!important` pada AST yang sudah
di-`JSON.parse` memberi 355, sedangkan hitungan file-wide memberi 356 —
selisih 1 berasal dari satu kemunculan di luar literal AST. T3 memakai
angka file-wide 356; saya memakai metode yang sama agar sebanding, dan
ketiganya tidak berubah karena file tersebut tidak disentuh.

## 7. Self-review (baca ulang diff dengan mata segar)

1. **Diff minimal & tepat sasaran:** `diff` bak vs hasil hanya `509c509` —
   satu token `2` → `6` di dalam style tombol F&R. Tidak ada karakter lain
   yang berubah di baris 509 (Recolor, Select Same, `sel-col-list`, dan
   sisa baris identik — terlihat langsung di output diff).
2. **Bukan tombol yang salah:** `grep -o` memastikan `fr-open-selcolors`
   ber-gap 6, sedangkan `rc-open-selcolors` dan `fr-open-styles` tetap
   ber-gap 2. `data-testid` masing-masing muncul tepat 1× (dicek:
   `rc-open-selcolors` 1).
3. **Urutan T3 aman:** A3 probe (DOM + posisi X) hijau sebelum dan sesudah;
   probe R3-T3 7/7 hijau termasuk alur klik buka/tutup kedua seksi.
4. **Satu insiden saat edit (dicatat jujur):** percobaan penggantian
   pertama gagal di assert Python saya sendiri — slice `s[j-1:j+7]`
   yang salah (seharusnya `s[j:j+6]`), BUKAN kesalahan pada file: file
   tidak sempat ditulis (md5 tetap sama dengan backup, `grep -c` gap:2
   tetap 3 baris). Penggantian kedua dengan slice yang benar berhasil
   dan terverifikasi lewat diff. Tidak ada edit lain yang dilakukan.
5. **Tidak ada `!important`/offset/z-index/klip baru, tidak ada dependensi
   baru, tidak ada perubahan label/i18n, tidak ada text-wrap.**
6. **Keterbatasan yang diakui:** pengukuran dilakukan di Chromium headless
   1255, viewport 1440×900, tema light, bahasa ID — bukan di browser live
   user dan bukan di semua ukuran viewport. Gap adalah nilai `gap` flex
   yang deterministik (tidak bergantung font), dan `document.fonts.status`
   ditunggu `loaded` sebelum mengukur, sehingga risiko drift antar
   lingkungan minimal; tetap, re-test visual oleh user di mesinnya adalah
   verifikasi akhir yang wajar.

## 8. Masalah / concern

- **Tidak ada blocker.** Satu catatan desain untuk reviewer (bukan
  keraguan atas kebenaran implementasi): gap ikon-teks F&R kini 6px,
  sama dengan gap antar-tombol di baris yang sama — konsisten dengan
  brief, tetapi hukum Proximity Gestalt idealnya membedakan keduanya.
  Bila diinginkan hierarki yang lebih ketat, 4px adalah alternatif yang
  masuk akal; keputusan ada di reviewer, bukan saya (saya mengikuti
  nilai 6px dari brief).
