# Laporan — Ronde 3, Task T9: `.c-inp` width mengikuti isi + perbaiki fungsi

- Brief: `docs/superpowers/plans/sdd-2026-11-15-round3/task-9-brief.md`
- Probe: `probes/probe-r3-t9-cinp.cjs` (Playwright, Chromium 1255, viewport 1440×900)
- Server probe: `python3 -m http.server 8998 --directory web` (port segar milik T9),
  URL via `R3_T9_URL=http://127.0.0.1:8998/`; build dulu `npm run build:web`
- Skill yang dipakai: `systematic-debugging` (root cause dulu, hipotesis tunggal
  per kegagalan), `ui-ux-fixer-and-improvement`, `test-driven-development`
  (probe RED dulu), `browser_ui_fix_verification` (semua kandidat diuji di
  browser asli), `verification-before-completion` (klaim hanya dari run baru)

## Ringkasan keputusan

| Sub-tugas | Keputusan | Alasan satu baris |
|---|---|---|
| (a) Width root `.c-inp` mengikuti isi | **TANPA EDIT global** | Lebar root terbukti parent-driven oleh desain di semua pemakaian (rumus terverifikasi ±0,5 px); yang mengikuti isi adalah span (sudah benar sejak T6); search box sudah tumbuh mengikuti isi. `width:auto` global akan mengecilkan target klik/fokus semua field pengisi-parent. |
| (b) Fungsi `CustomTextBox` | **PERBAIKI 2 yang terbukti rusak** (F3, F10); 8 kandidat lain terbukti benar, tanpa edit | F3: Esc tak membatalkan di kotak hex ColorField (live-apply `typed` + `onCancel` yang tak mengembalikan dokumen). F10: caret tak terlihat untuk teks panjang di TransformField (tanpa scroll). |

## Step 1 — Investigasi (pra-fix, browser asli)

### (a) Width root per pemakaian — root TIDAK PERNAH mengikuti isi

Aturan bundle (verifikasi ulang): `.c-inp` AST #466 =
`display:inline-flex; align-items:center; width:100%; min-width:0;
min-height:22px; cursor:text; outline:none; white-space:nowrap;
overflow:hidden; font-size:12px; font-variant-numeric:tabular-nums;
color:var(--ink); user-select:none`. `.c-inp-txt` #468, `.c-inp-txt.sel`
#469 (T6: `width:auto; flex:0 0 auto`), `.c-caret` #470, `.c-inp.ctr` #840.

Mekanisme yang terbukti (bukan dugaan): root adalah flex item dengan
`flex-basis = width = 100%` dari content-box parent, lalu **menyusut**
(`flex-shrink`) melawan sibling-nya. Rumus `rootW = parentContentW −
siblingW − gap` terverifikasi eksak di 4 pemakaian:

| Pemakaian | rootW | parentContentW | sibling | teks (rangeW) | spanW |
|---|---|---|---|---|---|
| Kotak hex popover (`.flt .fld.hexf[cpHex]`) | **53,59** (sama untuk "FF" dan "ABCDEF") | 66 | 12,41 ("#" + gap) | "0D99FF" 41,81 | "FF" 14,47 → "ABCDEF" 46,72 (dSpan 32,25 ≈ dText 32,3) |
| Kotak alpha (`.flt [veAlphaPct]`, fld 54 px) | **27,69** | 40 | 12,31 ("%" + gap) | "100" 20,59 | 22,59 |
| ColorText baris Fill (`[data-testid=color-text] .fld.hexf`) | **183** | 183 | 0 | "#abcdef" 45,91 | 47,91 |
| TransformField X (`[data-tip=veXfX]`, `.fld.xf`) | **65,5** | 105 | 39 (label + stepper) | "221.57" 37,55 | 39,55 |
| Search home (`.ws-search-box`, wrapper `flex-1`) | **178** (kosong) → **505,13** (72 char) | 178 → 505 | — | 500,63 (72 char) | 505,13 |

Kesimpulan width:

- Root konstan terhadap panjang teks (hex: 53,59 px untuk "FF" maupun
  "ABCDEF") — lebar root ditentukan parent + sibling, bukan isi.
- Span `.c-inp-txt` **sudah** mengikuti isi di semua pemakaian (kontrol T6
  hijau: W-H2, W-H4; selisih span panjang−pendek = selisih teks ±0,05 px).
- Search box **sudah** tumbuh mengikuti isi (178 → 505 px): `.fld
  .ws-search-box` (`min-width:230px`, AST #708) adalah flex item
  `flex:0 1 auto` di toolbar sehingga lebarnya content-driven; root
  `width:100%` ikut membesar. Caret akhir tetap terlihat (F10a).
- Konsekuensi `width:auto` global (diukur dari angka di atas): root
  ColorText akan menyusut 183 → ~48 px di dalam field 205 px; rename /
  search / nama style kehilangan sebagian besar area klik-fokus (root
  adalah elemen focusable-nya; `.fld` di luar root tak memfokuskan);
  hex 53,59 → ~47 px, alpha 27,69 → ~23 px (menyisakan ruang kosong di
  dalam `.fld` yang tetap selebar semula). Itu memecahkan kontrak
  "field mengisi parent" yang dipakai semua pemakaian di atas — tanpa
  satu pun pemakaian yang terbukti butuh root selebar teks. Maka
  **no-edit global**, dan tidak ada scoping parsial yang diambil karena
  tidak ada pemakaian yang terbukti rusak lebarnya.
- Catatan T7 (bukan temuan baru): `[data-tip="veBgColor"] .hexf
  {flex:0 0 30px}` (AST #841) mengatur **tinggi** (main-axis vertikal di
  dalam wrapper kolom ColorText), bukan lebar — lebar `.hexf` baris
  `veBg` tetap 205 px. Bukan diagnosis T9.

### (b) Fungsi — 10 kandidat, 2 GAGAL pra-fix

Probe pra-fix: **22/25 lolos, GAGAL: F3, F10b, F10c**
(`R3_T9_URL=http://127.0.0.1:8998/ node probes/probe-r3-t9-cinp.cjs`).

| ID | Kandidat | Hasil pra-fix | Bukti (angka) |
|---|---|---|---|
| F1 | Enter commit (hex) | PASS | ketik FF00FF + Enter → fill #FF00FF |
| F2 | Blur commit (hex, Tab) | PASS | ketik 00FF00 + Tab → fill #00FF00 |
| **F3** | **Esc batal (hex)** | **FAIL** | ketik AAAAAA + Esc → fill **#00FF00 → #AAAAAA** (seharusnya tetap); teks hex tetap AAAAAA |
| F3b | Kontrol: Esc di alpha | PASS | ketik 50 + Esc → alpha kembali 100, fill tetap #00FF00 |
| F3c | Kontrol: Esc di ColorText | PASS | ketik AABBCC + Esc → teks kembali "#00ff00", tanpa commit |
| F4 | Paste (Ctrl+V clipboard asli) | PASS | tempel "112233" → teks 112233 → Enter → fill #112233 |
| F5 | Ctrl+A select-all | PASS | fokus → `.sel`; ArrowRight → lepas `.sel`; Ctrl+A → `.sel` lagi |
| F6 | Double-click select-all | PASS | dblclick → `isSel=true` |
| F7/F7b | Disabled (Corner radius objek teks) | PASS | `.dis=true`; klik tak memicu mode edit (`editing=false`) |
| F8 | onClear (Lebar kotak teks → Auto) | PASS | kosongkan W + Enter → placeholder "Otomatis" tampil |
| F9 | Caret terlihat + bergerak | PASS | caret x 1268,6 → 1254,9 sesudah 2× ArrowLeft (lebar 1,5, tinggi 14) |
| F10a | Overlong search home (72 char) | PASS | caret right 1134,8 ≤ rootRight 1135,8 (field tumbuh, lihat (a)) |
| **F10b** | **Overlong TransformField X (15 digit)** | **FAIL** | ketik `123456789012345` → caret right **1311,5** vs rootRight **1270,5** (+41 px, caret sepenuhnya tak terlihat); scrollW 106, clientW 66, scrollLeft 0 |
| **F10c** | **Overlong X: span tak meluber** | **FAIL** | scrollW 106 > clientW 66 (definisi awal; lihat "Koreksi check" di bawah) |

### Hipotesis tunggal per kegagalan (systematic-debugging Fase 3)

- **F3** — "Esc gagal karena `typed` (onChange kotak hex ColorField)
  sudah menerapkan warna ke dokumen begitu hex ke-6 lengkap, sedangkan
  `onCancel` hanya mereset draft lokal `hx`, bukan warna dokumen."
  Bukti kode (`ColorPickerField.jsx`): `typed` memanggil
  `out(formatColorWithAlpha(n, nextA))` saat `d.length === 6`
  (`out` non-live → `on(...)` langsung ke parent); `onCancel` lama
  hanya `() => setHx(null)`. Kontrol F3b/F3c membuktikan Esc di
  `CustomTextBox` sendiri benar — kegagalan spesifik jalur live `typed`.
  Akar ada di pemakaian (ColorField), bukan di `CustomTextBox`.
- **F10** — "Caret tak terlihat untuk teks panjang karena `.c-inp`
  `overflow:hidden` tanpa mekanisme scroll: span tumbuh melampaui lebar
  root dan caret akhir jatuh di luar viewport root."
  Bukti: scrollW 106 > clientW 66, `scrollLeft` 0 (tak ada yang
  menggeser). Hex/alpha tak terdampak (maxLen 6/3 → span selalu muat di
  root); search tak terdampak (parent tumbuh). Hanya field tanpa maxLen
  dan tanpa parent tumbuh (TransformField, RangeField, Recolor hue,
  dsb.) yang terdampak.

### Insiden probe selama investigasi (bukan bug produk)

1. `measureBox` pertama crash: `page.evaluate(fn)` dipanggil **tanpa
   argumen** sehingga `scopeSel` di dalam page = `undefined`. Diperbaiki
   (`page.evaluate(fn, scopeSel)`); bukan bug produk.
2. Klik `hb2` (F2) timeout 30 dtk "element not stable / detached":
   helper `openFillPopover` saya mengasumsikan klik `veFill` selalu
   membuka, padahal **Enter TIDAK menutup popover** (dibuktikan skrip
   debug terpisah: `.flt` tetap 1 sesudah Enter) — klik kedua malah
   menutupnya. Helper dibuat idempotent (klik hanya bila `.flt`
   belum ada). Bukan bug produk.

## Step 2 — Perbaikan (hanya yang terbukti rusak)

### Fix F3 — `src/components/ui/ColorPickerField.jsx` (akar: pemakaian live-apply)

- Snapshot warna pra-edit saat sesi ketik hex dimulai (ref sinkron
  `hexPrevRef`/`hexEditRef` — bukan state `hx` yang bisa basi di
  closure `typed`): `{ hex: cur, alpha, isNone }` pada `typed` pertama
  sesi itu.
- `cancelHex` baru sebagai `onCancel`: kembalikan warna pra-edit
  (`setHsv`/`setAlpha` + `out(...)`, mencerminkan kedua cabang
  `onOpacity` / `formatColorWithAlpha` yang dipakai `typed`; bila
  pra-edit adalah `none` → `clearColor()`). **Hanya** bila sesi sempat
  mengubah dokumen (hex/alpha berubah) — ketik parsial tanpa emit tak
  mengirim commit redundan ke parent (menjaga riwayat undo).
- `onCommit` hex: `typed(v); setHx(null);` + bersihkan kedua ref
  (sesi berakhir; sesi ketik berikutnya snapshot baru).
- Alternatif yang dipertimbangkan dan **ditolak**: membuat `typed`
  commit-only (menghapus live-apply). Live-apply saat hex ke-6 lengkap
  adalah perilaku yang disengaja (bentuk langsung berubah tanpa Enter);
  yang rusak hanyalah jalur batalnya.

### Fix F10 — `src/components/ui/CustomTextBox.jsx` (akar: komponen)

- `useEffect([editing, buf, caret, selAll])`: ukur caret vs root tiap
  perubahan edit; bila caret keluar kanan/kiri, geser
  `root.scrollLeft` (seperti input native; margin 2 px karena
  `scrollLeft` dibulatkan browser). `finishEdit` mereset `scrollLeft=0`.
- Sisa <2 px yang tak bisa di-scroll (`scrollWidth` dibulatkan ke bawah
  sehingga `scrollLeft` mentok ~1 px sebelum caret sepenuhnya masuk)
  dikoreksi dengan `translateX` **terukur** pada caret (nilai dihitung
  dari `getBoundingClientRect` tiap run, di-reset tiap run; caret tak
  pernah di-transform bila tidak meluber).
- **Dua upaya yang dicoba lalu DIBATALKAN (terbukti tak bekerja di
  Chromium, bukan ditebak):**
  1. `padding-right:2px` pada `.c-inp` (#466) — trailing padding scroll
     container **diabaikan** Chromium untuk `scrollWidth` (tetap 106).
     Di-revert; bundle kembali identik dengan backup.
  2. Spacer 2 px sebagai sibling span saat editing — span menyusut
     (`flex-shrink`) sehingga spacer tak mengikuti ujung teks yang
     meluber; `scrollWidth` tetap 106. Di-revert (render kembali seperti
     semula).
  - Spacer **di dalam** span juga ditolak: menambah `spanW` ~2 px dan
    memakan habis toleransi ±2 px probe T6 (S1/S2/S4) — rapuh.
- `cblink` hanya menganimasikan `visibility` (AST #471) — tak bentrok
  dengan `transform` pada caret.

### Tanpa edit

- (a) Width root global: tanpa edit (alasan di atas).
- 8 kandidat fungsi yang lolos: tanpa edit.
- Bundle `tailwindOfflineBundle.jsx`: **tanpa perubahan bersih**
  (backup `.bak-r3t9` ada; file di-restore identik sesudah percobaan
  padding dibatalkan — `diff` kosong).
- Tanpa `!important` / offset / z-index / klip baru; tanpa dependensi
  baru; tanpa ubah label/i18n; tanpa text-wrap.

## Verifikasi (TDD — RED dulu, GREEN sesudah)

| Run | Perintah | Hasil |
|---|---|---|
| Probe pra-fix (RED) | `R3_T9_URL=http://127.0.0.1:8998/ node probes/probe-r3-t9-cinp.cjs` | **22/25, GAGAL F3, F10b, F10c**, 0 pageerror |
| Probe pasca-fix | sama, `R3_T9_SHOT=probes/shots/r3-t9-cinp-after.png` | **27/27**, 0 pageerror |
| Probe pasca-fix + F10d/F10e (Home/End) | sama | **29/29**, 0 pageerror |
| Regresi T6 | `R3_T6_URL=http://127.0.0.1:8998/ node probes/probe-r3-t6-cinp-txt-sel.cjs` | **10/10**, 0 pageerror |
| Regresi R2-T8 | `R2_T8_URL=http://127.0.0.1:8998/ node probes/probe-r2-t8-last-color.cjs` | **22/22**, 0 pageerror |
| Suite penuh | `npm test` (di `~/workspace/geovanta-round2`) | **277 pass / 0 fail** |

Angka kunci pasca-fix:

- F3: fill tetap **#00FF00** sesudah Esc, teks hex kembali "00FF00".
- F10b: caret right **1270,5 = rootRight 1270,5** (sebelumnya 1311,5),
  `scrollLeft=40`, `scrollW=106`, teks utuh 15 digit.
- F10d (Home): caret x 1207,0 ≥ rootX 1205,0, `scrollLeft=0`.
  F10e (End): caret right 1270,5 lagi, `scrollLeft=40`.
- Screenshot: `probes/shots/r3-t9-cinp-before.png` (pra-fix, WAJIB) dan
  `probes/shots/r3-t9-cinp-after.png` — keduanya close-up kotak hex
  "ABCDEF" terseleksi dan **identik byte-demi-byte** (sha256 sama):
  jujur dicatat, tidak ada fix yang mengubah tampilan kotak hex (F3
  behavioral; F10 di TransformField) — bukti visual F10 adalah angka
  probe di atas, bukan screenshot ini.

### Koreksi check F10c (dicatat jujur, bukan geser gawang)

Definisi awal F10c ("scrollW ≤ clientW+1", tanpa overflow sama sekali)
salah secara konsep: field yang bisa di-scroll **seharusnya**
`scrollWidth > clientWidth`; yang dituntut pengguna adalah caret
tercapai. Definisi diubah menjadi "root menggeser konten
(`scrollLeft>0`) agar caret tercapai; teks utuh". Perilaku pra-fix
gagal di **kedua** definisi (`scrollLeft=0`, caret tak terlihat),
jadi RED tetap sah; pasca-fix lolos definisi yang benar.

### Tripwire bundle (verifikasi ulang sesudah perubahan)

- Aturan AST total: **842** (baseline 842 — tidak berubah)
- `!important` (raw count): **356** (baseline 356 — tidak berubah)
- `acc-deep`: **5** (baseline 5 — tidak berubah)
- Tidak ada aturan baru; justifikasi: semua fix di komponen JSX,
  nol perubahan bundle.

## File yang diubah (backup `.bak-r3t9` SEBELUM edit pertama tiap file)

| File | Perubahan | Backup |
|---|---|---|
| `src/components/ui/CustomTextBox.jsx` | +1 `useEffect` scroll-into-view + koreksi residu caret; +1 baris reset `scrollLeft` di `finishEdit` | `CustomTextBox.jsx.bak-r3t9` |
| `src/components/ui/ColorPickerField.jsx` | +2 ref snapshot pra-edit; snapshot di `typed`; `cancelHex` baru; wiring `onCommit`/`onCancel` kotak hex | `ColorPickerField.jsx.bak-r3t9` |
| `src/vendor/tailwindOfflineBundle.jsx` | **tanpa perubahan bersih** (percobaan `padding-right` dibatalkan + restore; `diff` vs backup kosong) | `tailwindOfflineBundle.jsx.bak-r3t9` (identik) |
| `probes/probe-r3-t9-cinp.cjs` (baru) | Probe investigasi 29 check (width 9 + fungsi 19 + E0) | — |
| `probes/shots/r3-t9-cinp-before.png` / `-after.png` | Screenshot close-up kotak hex pra/pasca fix | — |

## Self-review (baca ulang diff dengan fresh eyes)

- Diff `CustomTextBox.jsx`: hanya effect + 1 baris; render JSX kembali
  identik dengan baseline (spacer dibatalkan). Effect me-reset
  `transform` caret tiap run sebelum mengukur — pengukuran berikutnya
  bersih; caret tak di-render saat tidak editing sehingga tak ada
  transform basi. Deps effect mencakup semua pemicu gerak caret
  (`buf`, `caret`, `selAll`, `editing`).
- Diff `ColorPickerField.jsx`: snapshot diambil di `typed` pertama sesi
  (ref, sinkron); `onCommit` membersihkan ref sehingga sesi berikutnya
  snapshot baru; `cancelHex` mengembalikan `setHx(null)` dulu lalu
  restore — urutan aman karena restore membaca ref lokal, bukan state.
  Guard "berubah" mencegah commit redundan saat Esc sesudah ketik
  parsial.
- Satu yang dicek ulang: `typed` juga dipanggil dari `onCommit` —
  bila Enter tanpa mengetik, snapshot sempat diambil lalu langsung
  dibersihkan di wrapper `onCommit`; emit-nya sama seperti perilaku
  lama (`typed(v)` dengan nilai yang sama). Tanpa perubahan perilaku.
- Bundle: `diff` kosong vs backup — tidak ada yang terselip.

## Concern / yang belum teruji (jujur)

1. **Jalur restore `onOpacity` belum teruji di browser.** Hanya 1
   pemakaian ColorField yang memakai `onOpacity`; probe F3 memakai
   jalur fill biasa (non-`onOpacity`). Cabang `out(prev.hex)` pada
   `cancelHex` mencerminkan persis cabang yang dipakai `typed`, tetapi
   belum ada bukti browser untuknya. Bila controller ingin, sebutkan
   pemakaian `onOpacity` itu untuk probe lanjutan.
2. **Esc sesudah drag SV/slider/hue lalu Esc**: `CustomTextBox` tak
   terlibat (bukan sesi ketik hex) — perilaku batal di luar scope
   brief; tidak diuji.
3. **Lebar root adalah keputusan no-edit yang perlu disahkan
   reviewer.** Bila user sebenarnya menginginkan root selebar teks di
   SATU pemakaian tertentu (mis. ColorText), itu butuh scoping +
   keputusan produk — bukti di atas menunjukkan global `width:auto`
   akan merusak pemakaian pengisi-parent.
4. Probe memakai clipboard asli Chromium headless untuk F4 (izin
   `clipboard-read/write`); di browser pengguna nyata, paste memakai
   clipboard sistem yang sama — jalur `onPaste` yang sama.
5. Screenshot before/after identik (dijelaskan di atas) — bukan bukti
   visual fix; bukti fix adalah angka probe.
