# Task 4 report — Ronde 2: Recolor: hue-range center + mode vertikal + padding Fill/Stroke

**Status: DONE** (semua asersi probe hijau, `npm test` 277/277, regresi tetangga T3 11/11).

**Skill yang dipakai:** `test-driven-development` (probe RED dulu, baru GREEN),
`ui-ux-fixer-and-improvement` (tanpa `!important`/offset/z-index/klip baru),
`verification-before-completion` (semua klaim di bawah disertai angka run segar).

**Working copy:** `/home/hatch/workspace/geovanta-round2/` (bukan repo git;
"commit" = backup `.bak-t4` + laporan ini). Server probe: `web/` via
`python3 -m http.server 8944` (sudah dimatikan sesudah GREEN; curl verifikasi:
connection refused). Port 8931 yang sudah menjawab 200 sebelum task ini
dimulai adalah server sesi lain — tidak disentuh.

## 1. Mekanisme vertikal yang dipilih + alasan

**Dipilih: varian vertikal `Seg` via `cls="vert"`** (bukan dua tombol toggle).

- `Seg` sudah menerima prop `cls` dan varian `stk`/`eq`/`ic` sudah ada sebagai
  preseden — ini ekstensi primitif yang sama, bukan kontrol baru.
- Komponen, handler (`setMode`), `data-testid="rc-mode-seg"`, perilaku
  preview live / commit / unlink **tidak berubah sama sekali**:
  `SegmentedControl.jsx` tidak disentuh.
- Pil geser (`.seg-p`) disembunyikan pada varian ini — preseden yang sudah ada
  di codebase (`.stg-modal .seg > .seg-p` dan
  `.ved-straight-panel .seg > .seg-p` sama-sama hide pill + men-style `.on`).
  Alasan: pill horizontal memakai `translateX` + `width` inline; matematika
  `translateY` + gap di pill absolut lebih rapuh daripada pola hide-pill
  yang sudah terbukti di dua tempat.
- Tombol `.on` diberi latar yang **sama persis dengan pill M3**:
  `color-mix(in srgb, var(--acc) 18%, var(--card))`,
  `color: var(--fig-sel-ink)`, `box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06)`
  — tanpa `!important` (spesifisitas `.seg.vert button.on` = 0,3,1
  mengalahkan `.seg button` 0,1,1 dan `.seg .on` 0,2,0; tidak ada aturan lain
  yang mengatur `background` tombol `.seg`).
- Dua tombol toggle (`btn pri`/`sec`) ditolak karena memperkenalkan pola
  kontrol baru sebagai mode selector, inkonsisten dengan seg cakupan di seksi
  yang sama yang tetap memakai `Seg`.

## 2. TDD — RED → GREEN

Probe baru: `probes/probe-r2-t4-recolor-layout.cjs` (10 asersi F1–F9;
pola T3: seed localStorage prefs, buat elips, buka Recolor, condition-based
waits, tanpa sleep buta kecuali jeda render 300–400 ms).

| ID | Asersi | RED (before) | GREEN (after) |
|----|--------|--------------|---------------|
| F1 | rc-hue drag jalan (guard) | PASS (hue 0→95, count "2 warna akan berubah") | PASS (sama) |
| F2 | Mode 1/2 toggle + preview (guard) | PASS | PASS |
| F3 | range min/max `flex:1`, isi lebar baris | FAIL (flexGrow 0, 68px, 68+68+5,5+16=157,5 ≠ 243) | PASS (flexGrow 1, 110,75+110,75+5,5+16=243) |
| F4 | range tinggi ~30px | FAIL (22px) | PASS (30px) |
| F5a | ketik min 200 + Enter → tampil 200 (guard) | PASS | PASS |
| F5b | teks rata tengah (`justify-content: center` + dx teks) | FAIL (justify `normal`, dx −15,7px) | PASS (justify `center`, dx 0 / 0) |
| F6 | Mode 1/2 VERTIKAL full-width + gap 6px | FAIL (dir `row`, btn 117,5px) | PASS (dir `column`, gap 6, btn 235px = lebar konten seg) |
| F7 | Fill + Stroke `py-1` (padding 4px atas-bawah) | FAIL (0px) | PASS (4px/4px keduanya) |
| F8 | seg cakupan tetap horizontal (guard) | PASS | PASS |
| F9 | 0 pageerror | PASS | PASS |
| **Total** | | **5/10 lolos (5+5=10 ✓)** | **10/10 lolos (10+0=10 ✓)** |

- RED pertama: 2/10 — F1 gagal karena slider hue di bawah lipatan viewport
  (mouse mentah tidak auto-scroll) dan F7 gagal karena selektor
  `[data-tip="veFill"]` mengenai `DIV.fig-isec` (seksi Fill sendiri juga
  memakai `data-tip` itu), bukan tombol swatch. Keduanya **bug probe**,
  diperbaiki (scrollIntoView sebelum drag; selektor
  `button.swatch[data-tip="veFill"/"veStroke"]`; F8 `>` → `>=` karena dua
  tombol seg bersentuhan tepat di 1298,5px), lalu RED diulang.
- RED sesudah perbaikan probe (kode asli di-restore dari `.bak-t4` +
  rebuild): **5/10, gagal tepat F3, F4, F5b, F6, F7** — masing-masing gagal
  karena alasan yang dituju. Screenshot before diambil ulang pada run ini.
- Satu bug probe lagi saat GREEN pertama: F3 memakai
  `querySelector('span')` yang mengenai `.c-inp-txt` ("190", 22,59px) bukan
  separator `–` (5,5px). Diperbaiki ke anak langsung `SPAN` baris; RED
  diulang (di atas) dan GREEN dicapai. Implementasi tidak pernah diubah
  untuk bug probe ini — geometri layout sudah benar sejak awal
  (debug terpisah: 110,75 + 8 + 5,5 + 8 + 110,75 = 243, `scrollWidth` ==
  `clientWidth` = 243, tanpa overflow).

## 3. File diubah + diff

Backup `.bak-t4` dibuat SEBELUM edit pertama (4 file, TIDAK ikut ZIP):
`src/components/editor/RecolorSection.jsx.bak-t4`,
`src/components/editor/EditorRightInspector.jsx.bak-t4`,
`src/vendor/tailwindOfflineBundle.jsx.bak-t4`,
`tests/accent-tokens.test.cjs.bak-t4`.

### 3a. `src/components/editor/RecolorSection.jsx` — baris 292 (3 edit, +59 karakter)

1. Mode seg: `<Seg o={...} ... />` → `<Seg cls="vert" o={...} ... />`
2. Range min: `<div className="fld px-1.5 py-0.5" style={{ width: 68, height: 22 }}
   data-testid="rc-range-min"><CustomTextBox value={String(hueMin)}`
   → `<div className="fld flex items-center px-1.5 py-1" style={{ flex: 1, height: 30 }}
   data-testid="rc-range-min"><CustomTextBox cls="ctr" value={String(hueMin)}`
3. Range max: sama, `hueMax` / `rc-range-max`.

Catatan: `CustomTextBox` bukan input native (div `.c-inp` inline-flex,
teks di dalam span `.c-inp-txt`) — `text-align` pada wrapper TIDAK
memusatkan teks karena `.c-inp` adalah flex container. Karena itu centering
diwujudkan via `cls="ctr"` → aturan `.c-inp.ctr { justify-content: center }`
di bundle (bukan via `text-align` yang tidak berpengaruh di sini).
`flex items-center` pada wrapper memusatkan `.c-inp` (min-height 22px) secara
vertikal di dalam field 30px; `py-1` (4px) + konten 22px = 30px
(`box-sizing: border-box` dari preflight). Separator `–` tetap.

### 3b. `src/components/editor/EditorRightInspector.jsx` — baris 386, 424 (2 edit, +10 karakter)

- Fill solid: `{!VE.gradOn(cp) && <div className="flex items-center gap-2">`
  → `... gap-2 py-1">` (sebelum `<ColorField … tip="veFill"`).
- Stroke: `<div className="space-y-2"><div className="flex items-center gap-2">`
  → `... gap-2 py-1">` (sebelum `<ColorField … tip="veStroke"`).
- `py-1` = utilitas Tailwind (JIT runtime meng-generate dari token class;
  sudah dipakai di tempat lain, mis. `App.jsx`). Tidak ada perubahan logika
  commit/livePaint/unlink pada kedua baris.

### 3c. `src/vendor/tailwindOfflineBundle.jsx` — baris 437, akhir `TAILWIND_PLUGIN_AST` (+4 aturan)

```json
{"t":"r","s":".seg.vert","d":[["flex-direction","column"],["gap","6px"]]}
{"t":"r","s":".seg.vert > .seg-p","d":[["display","none"]]}
{"t":"r","s":".seg.vert button.on","d":[["background","color-mix(in srgb, var(--acc) 18%, var(--card))"],["color","var(--fig-sel-ink)"],["box-shadow","0 1px 4px rgba(15, 23, 42, 0.06)"]]}
{"t":"r","s":".c-inp.ctr","d":[["justify-content","center"]]}
```

- Aturan AST: **837 → 841** (+4, terverifikasi via parse JSON array).
- `!important`: **357 → 357** (0 baru).
- Aturan di-append di **akhir** array mengikuti preseden `.pin3-fill`
  (T5) — percobaan pertama menyisipkan sesudah `.seg .on` (idx 141) dan
  menggeser aturan tema `:root` dari [464]/[465] ke [468]/[469]; dipindah ke
  akhir agar indeks itu tidak bergeser.

### 3d. `tests/accent-tokens.test.cjs` — baris 58–63 (konsekuensi 3c)

Tripwire jumlah aturan diperbarui `837 → 841` + komentar riwayat (pola yang
sama seperti 835 → 837 saat T5 menambah `.pin3-fill`). Tripwire ini memang
dirancang untuk menangkap perubahan aturan; perubahan ini disengaja dan
terdokumentasi. Indeks [464]/[465] tetap berlaku (terverifikasi ulang).

### Tidak disentuh

Logika Recolor apa pun (preview/commit/unlink/shift-hue/palette-map),
mekanisme snapshot/preview fix wave (`committedDoc`/`baseRef`), `Seg`
(`SegmentedControl.jsx`), label/i18n, dependensi. `node_modules` tidak
disertakan ke mana pun.

## 4. Regresi

- `npm test` baseline (sebelum edit): **277/277 PASS, 0 fail** (23,2 dtk).
- `npm test` sesudah fix: **277/277 PASS, 0 fail** (22,5 dtk).
  Hitung ulang dari addend run: pass 277 + fail 0 = 277 total ✓. Satu kegagalan interim (tripwire 837 vs
  841) sudah diatasi via §3c+§3d dan suite hijau penuh sesudahnya.
- Probe T3 (seksi tetangga Selection Colors) sesudah fix, via
  `R2_T3_URL=http://127.0.0.1:8944/`: **11/11 lolos**.
- `npm run build:web`: **exit 0** (dijalankan tiap kali sumber berubah;
  build terakhir sesudah pemindahan aturan ke akhir array).
- Probe `probe-recolor` ronde lalu TIDAK ada di working copy ini — tidak
  diklaim dijalankan; regresi perilaku Recolor dicakup F1 (drag hue +
  preview), F2 (toggle + preview), F5a (ketik + commit range).

## 5. Screenshot (dibaca visual)

- Before: `probes/shots/r2-t4-recolor-before.png` (94.126 B, 1440×900) —
  Mode 1/2 horizontal, label terpotong ("Mode 1 · Gese…", "Mode 2 · Palet…");
  field range sempit 68px, teks rata kiri.
- After: `probes/shots/r2-t4-recolor-after.png` (92.769 B, 1440×900) —
  Mode 1 full-width di atas, Mode 2 full-width di bawah, label lengkap
  ("Mode 1 · Geser Hue", "Mode 2 · Palette Mapping"), Mode 1 aktif
  berlatar tint aksen; field range mengisi baris, teks "200"/"260" di tengah.
  Elips ter-preview magenta di kedua screenshot (drag hue +95° dari F1) —
  preview live bekerja sebelum dan sesudah.

## 6. Concerns / hal yang belum terverifikasi

1. **Padding Fill/Stroke hanya terbukti via computed style** (F7: 4px/4px),
   bukan visual: pada screenshot, baris Fill/Stroke berada di atas lipatan
   (seksi Recolor digulir ke tengah viewport). Tidak ada indikasi visual
   yang bertentangan; bila reviewer butuh bukti piksel, screenshot perlu
   diambil dengan seksi Fill/Stroke yang digulir ke tengah.
2. **Apply Mode 2 end-to-end tidak diuji** — di luar scope T4 (hanya restyle
   layout); F2 hanya memverifikasi toggle + preview nol. Logika Apply tidak
   diubah, jadi tidak ada alasan mengharapkan regresi di sana, tapi itu
   klaim dari tidak-adanya-perubahan, bukan dari tes.
3. **Teks tengah saat editing aktif** (caret berkedip) tidak diukur terpisah:
   probe mengukur posisi teks saat tidak editing (dx = 0). Saat mengetik,
   teks berada dalam satu span `.c-inp-txt` yang sama dan terpusat oleh
   aturan yang sama — tetapi belum ada pengukuran dx saat editing.
4. **T8 juga menyentuh `RecolorSection.jsx`** (investigasi bug warna
   terakhir) — T4 hanya restyle layout; tidak ada konflik logika yang
   diperkenalkan di sini, tetapi merge dengan T8 tetap perlu dicek
   koordinator (kedua task menyentuh file yang sama di baris berbeda).
5. Probe T3 dijalankan terhadap server 8944 (bukan port default 8931),
   karena server 8931 sudah berjalan dari sesi lain dengan asal yang tidak
   saya ketahui; konten yang disajikan adalah `web/` working copy ini
   (build segar sesudah fix).
