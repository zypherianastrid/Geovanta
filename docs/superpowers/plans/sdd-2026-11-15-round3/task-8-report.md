# Laporan — Ronde 3, Task T8: Selection Colors — 3 tombol Select Same memenuhi ruang kosong

- **Status:** DONE
- **Tanggal:** 2026-11-15
- **File diubah:** `src/components/editor/EditorRightInspector.jsx` (baris 509, satu baris)
- **Backup:** `src/components/editor/EditorRightInspector.jsx.bak-r3t8` (dibuat SEBELUM edit pertama)
- **Probe baru:** `probes/probe-r3-t8-selsame-full.cjs` (D1–D10, mode ID + EN)
- **Screenshot:** `probes/shots/r3-t8-selsame-full-before.png` (pra-fix, ID),
  `r3-t8-selsame-full-after.png` (pasca-fix, ID),
  `r3-t8-selsame-full-after-en.png` (pasca-fix, EN)

## 1. Yang diimplementasikan

Tiga tombol Select Same di baris `flex flex-wrap items-center gap-1.5 pb-1.5`
(Selection Colors, sidebar kanan) masing-masing mendapat `flex: 1` pada
inline style-nya — persis pola baris F&R/Recolor di atasnya (T3). Tidak ada
yang lain yang berubah.

```diff
- style={{ padding: '6px 10px', whiteSpace: 'nowrap', ... }} data-tip="veSelSameFill"
+ style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', ... }} data-tip="veSelSameFill"
- style={{ padding: '6px 10px', whiteSpace: 'nowrap', ... }} data-tip="veSelSameStroke"
+ style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', ... }} data-tip="veSelSameStroke"
- style={{ padding: '6px 10px', whiteSpace: 'nowrap', ... }} data-tip="veSelSameType"
+ style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', ... }} data-tip="veSelSameType"
```

`diff` bak vs hasil: hanya baris 509 (`509c509`), tiga penambahan `flex: 1`.
Tidak ada sentuhan pada baris F&R/Recolor, `onSelectSame`, `.sel-col-list`,
label/i18n, ikon, atau handler.

## 2. Padding yang dipilih — TIDAK diubah (tetap 6px 10px)

Brief mengizinkan padding atas-bawah opsional (mis. `8px 10px`) "agar sejajar
tombol F&R/Recolor". Pengukuran pra-fix menunjukkan ketiga tombol Select Same
SUDAH setinggi persis tombol F&R/Recolor — **30,5px vs 30,5px** — karena
paddingnya sudah sama (6px 10px). Menambah padding vertikal menjadi 8px justru
akan MEMECAH kesejajaran tinggi itu (tombol Select Same menjadi 34,5px
sementara F&R/Recolor tetap 30,5px). Karena itu padding dipertahankan 6px 10px
dan hanya `flex: 1` yang ditambahkan — diff paling minimal yang mencapai
tujuan brief. D4 probe mengunci padding ini (6px 10px) agar tidak bergeser
diam-diam di ronde berikut.

## 3. Lebar tiap baris — pra vs pasca (lebar konten seksi 243px, gap 6px)

Diukur di Chromium headless nyata (viewport 1440×900) terhadap hasil build.

### Mode ID — label "Pilih yang Sama — Fill/Stroke/Tipe"

| Baris | Pra-fix (lebar tombol) | Sisa pra-fix | Pasca-fix (lebar tombol) | Sisa pasca-fix |
|---|---|---|---|---|
| 1 — Fill | 149,8px | 93,2px | **243px** | **0px** |
| 2 — Stroke | 168,9px | 74,1px | **243px** | **0px** |
| 3 — Tipe | 157,4px | 85,6px | **243px** | **0px** |

### Mode EN — label "Select Same Fill/Stroke/Type"

| Baris | Pasca-fix (lebar tombol) | Sisa pasca-fix |
|---|---|---|
| 1 — Fill | **243px** | **0px** |
| 2 — Stroke | **243px** | **0px** |
| 3 — Tipe | **243px** | **0px** |

Sesuai FAKTA pengikat di brief (Ronde 2 T3 M1): tidak ada pasangan tombol yang
muat satu baris pada 243px — pasangan terkecil pun >243px — sehingga tiap
tombol menempati barisnya sendiri, dan dengan `flex: 1` tiap baris kini terisi
penuh tepat 243px (leftover 0,0px). Ini adalah pembacaan "full" PER BARIS FLEX
sesuai RULING controller, bukan pemaksaan satu baris. Tinggi tombol tetap
30,5px (sama seperti F&R/Recolor), font terukur 11px (≥10px), label 1 baris
tanpa wrap/clip.

## 4. Bukti TDD (RED dulu, GREEN sesudah)

### RED — pra-fix (build pra-fix, server port 8996 milik sendiri)

Perintah:

```
npm run build:web
python3 -m http.server 8996 --directory web   # background, port segar sendiri
R3_T8_URL=http://127.0.0.1:8996/ node probes/probe-r3-t8-selsame-full.cjs before
```

Output (ringkas; output lengkap ada di log eksekusi):

```
FAIL D1 ketiga tombol Select Same punya flex:1 | actual={"sel-same-fill":"0","sel-same-stroke":"0","sel-same-type":"0"} expected=semua flexGrow=1
FAIL D2 SETIAP baris flex terisi penuh | actual=[{...leftover:93.2},{...leftover:74.1},{...leftover:85.6}] expected=tiap baris leftover |<=1.5|
PASS D3 lebar baris == lebar konten seksi (±1px) | actual={"rowW":243,"contentW":243}
PASS D4 padding ketiga tombol tetap 6px 10px
PASS D5 ikon ADA + identitas path d cocok (drop/pencil/shapes)
PASS D6 label >=10px, 1 baris, tanpa clip
PASS D7 tidak ada overflow di seksi
PASS D8 baris F&R/Recolor tidak berubah (Recolor dulu, gap 6px, flex:1)
PASS D9 klik ketiga tombol jalan (Fill -> toast, Stroke/Tipe tanpa error)
PASS D10 0 pageerror

R3-T8 before [id]: 8/10 lolos | GAGAL: D1, D2
EXIT=1
```

RED gagal tepat pada asersi yang ditargetkan (D1 flexGrow=0, D2 sisa
74–93px per baris) — probe terbukti mampu menangkap defect, bukan lolos
palsu. Screenshot before diambil dari state pra-fix ini.

### GREEN — pasca-fix (rebuild, server sama)

Perintah:

```
npm run build:web
R3_T8_URL=http://127.0.0.1:8996/ node probes/probe-r3-t8-selsame-full.cjs after
R3_T8_URL=http://127.0.0.1:8996/ R3_T8_LANG=en node probes/probe-r3-t8-selsame-full.cjs after
```

Output ID:

```
PASS D1 ... actual={"sel-same-fill":"1","sel-same-stroke":"1","sel-same-type":"1"}
PASS D2 ... actual=[{...widths:[243],leftover:0},{...widths:[243],leftover:0},{...widths:[243],leftover:0}]
PASS D3 ... {"rowW":243,"contentW":243}
PASS D4 ... padding 6px 10px
PASS D5 ... fill=drop stroke=pencil type=shapes
PASS D6 ... fontSizes 11px, sw<=cw & sh<=ch
PASS D7 ... sec sw<=cw+1
PASS D8 ... rc sebelum fr, gap=6, flexGrow fr=rc=1
PASS D9 ... fill toast="Tidak ada objek lain yang sama" stroke+type ter-klik, pageerrors=0
PASS D10 0 pageerror

R3-T8 after [id]: 10/10 lolos | SEMUA LOLOS
EXIT_ID=0
```

Output EN: **10/10 lolos** (`EXIT_EN=0`) — label "Select Same Fill/Stroke/
Type", tiap baris 243px leftover 0, toast EN "No other matching objects",
0 pageerror.

## 5. Regresi

| Pemeriksaan | Hasil |
|---|---|
| `npm test` (suite penuh, fresh) | **277/277 PASS, 0 fail** (`SUITE_EXIT=0`, durasi ~21,9 dtk) |
| Probe R3 T3 (urutan + klik F&R/Recolor) | **7/7 lolos** (`R3_T3_URL=http://127.0.0.1:8996/`, `EXIT_T3=0`) |
| Probe R2 T3 (B1–B11, lima tombol Selection Colors) | **11/11 lolos** (`R2_T3_URL=http://127.0.0.1:8996/`, `EXIT_R2T3=0`) |
| Probe R3 T8 ID + EN | **10/10 + 10/10 lolos** |

Build `npm run build:web` exit 0 sebelum RED maupun sesudah GREEN.
Server statis port 8996 sudah dimatikan sesudah semua probe selesai
(`curl` pasca-kill: 000 / exit 7, port tertutup).

## 6. Angka tripwire bundle

Dihitung ulang pra- dan pasca-fix dengan metode T5/T6/T7 (parse
`TAILWIND_PLUGIN_AST` di `src/vendor/tailwindOfflineBundle.jsx` + hitungan
file-wide). Tugas ini tidak menyentuh CSS/AST sama sekali (murni inline style
di JSX), jadi tidak ada perubahan:

| Tripwire | Baseline (brief) | Terverifikasi pra-fix | Pasca-fix | Δ |
|---|---|---|---|---|
| Aturan AST total (parsed) | 842 | 842 | **842** | 0 |
| `!important` (raw file) | 356 | 356 | **356** | 0 |
| `acc-deep` (raw file) | 5 | 5 | **5** | 0 |

Catatan metodologi: hitungan regex pertama saya (`{"t":"r"` pada file mentah)
memberi 942 — itu SALAH karena pola tersebut juga cocok di luar entri
top-level AST. Saya koreksi ke metode parse yang dipakai T5–T7, yang memberi
842 — cocok dengan brief (842) dan laporan T7 (842 pasca-fix). Angka 942
tersebut TIDAK dipakai di laporan ini.

## 7. Self-review (baca ulang diff dengan mata segar)

1. **Diff minimal & tepat sasaran:** hanya baris 509; tiga kali penambahan
   `flex: 1` — tidak ada karakter lain yang berubah di baris itu. Baris
   F&R/Recolor (`rc-open-selcolors`/`fr-open-selcolors`, `flex: 1`, gap 6)
   identik dengan backup; D8 probe + probe R3 T3 7/7 mengonfirmasinya.
2. **Bukan baris yang salah:** pasangan `fr-open-styles`/`rc-open-styles`
   (seksi Color Styles) tidak tersentuh — diff hanya baris 509.
3. **Tidak ada label/i18n/ikon/handler yang berubah:** D5 (path `d` ikon),
   D6 (font/label 1 baris), D9 (klik + toast) memverifikasi perilaku nyata di
   browser, bukan grep sumber.
4. **Tidak ada `!important`/offset/z-index/klip baru:** hanya `flex: 1`
   inline; tripwire 842/356/5 tidak berubah.
5. **Keputusan padding dipertahankan:** tinggi 30,5px = tinggi F&R/Recolor
   sebelum dan sesudah fix (diukur, bukan diasumsikan). Menambah padding
   vertikal justru akan merusak kesejajaran ini — lihat §2.
6. **Ruling dipatuhi:** tidak ada upaya memaksa satu baris; label tidak
   diperkecil (terukur 11px), tidak ada text-wrap (D6), tidak ada klip (D6/D7).

## 8. Isu / concern

1. **Tampilan akhir: tiga baris bertumpuk penuh-lebar.** Karena tidak ada
   pasangan tombol yang muat 243px, hasil akhirnya adalah tiga tombol
   selebar penuh yang bertumpuk vertikal (masing-masing 243×30,5px). Ini
   adalah konsekuensi yang sudah diprediksi RULING controller (wrap
   diizinkan, "full" per baris), bukan cacat implementasi — tetapi bila user
   mengharapkan ketiganya berdampingan satu baris, itu tidak mungkin tanpa
   melanggar larangan brief (label <10px / klip / text-wrap) dan butuh
   keputusan produk terpisah (mis. label lebih pendek atau lebar sidebar
   lebih besar).
2. **Font terukur 11px padahal class `text-[10px]`.** Computed font-size
   ketiga tombol (dan kelima tombol Selection Colors) adalah 11px, bukan
   10px — `.ved-pill` tampaknya menetapkan 11px dan menang atas utility.
   Ini pra-ada (juga terukur di R2 T3), di luar scope T8, dan tidak merugikan
   (masih ≥10px). Dicatat saja.
3. **Screenshot before hanya mode ID.** Before-shot WAJIB pra-fix sudah
   dipenuhi (mode ID). Mode EN hanya diuji pasca-fix (10/10); EN pra-fix
   tidak di-screenshot karena defect-nya identik secara struktural
   (flexGrow=0) dan RED ID sudah membuktikan probe menangkapnya.

## 9. File yang dibuat/diubah

| File | Status |
|---|---|
| `src/components/editor/EditorRightInspector.jsx` | **Diubah** — baris 509, +`flex: 1` ×3 |
| `src/components/editor/EditorRightInspector.jsx.bak-r3t8` | **Baru** — backup pra-edit |
| `probes/probe-r3-t8-selsame-full.cjs` | **Baru** — probe TDD D1–D10 (ID + EN via `R3_T8_LANG`) |
| `probes/shots/r3-t8-selsame-full-before.png` | **Baru** — screenshot pra-fix (ID) |
| `probes/shots/r3-t8-selsame-full-after.png` | **Baru** — screenshot pasca-fix (ID) |
| `probes/shots/r3-t8-selsame-full-after-en.png` | **Baru** — screenshot pasca-fix (EN) |
| `docs/superpowers/plans/sdd-2026-11-15-round3/task-8-report.md` | **Baru** — laporan ini |
