# Review T4 — Ronde 2: Recolor: hue-range center + mode vertikal + padding Fill/Stroke

**Reviewer:** subagent review segar (tidak terlibat implementasi; tidak dispatch subagent).
**Skill yang dipakai:** `requesting-code-review`, `verification-before-completion`,
`ui-ux-fixer-and-improvement`.
**Verdict: APPROVED** — tidak ada temuan Critical/Important. Hanya Minor (dicatat, tidak memicu fix loop).

**Bahan yang dibaca:** `task-4-brief.md`, `task-4-report.md`, `task-4-review-package.md`
(diff `.bak-t4` vs current, 4 file), plus verifikasi mandiri terhadap file/probe aktual:
`probes/probe-r2-t4-recolor-layout.cjs`, `RecolorSection.jsx` (+`.bak-t4`),
`EditorRightInspector.jsx` (+`.bak-t4`), `tailwindOfflineBundle.jsx` (+`.bak-t4`),
`tests/accent-tokens.test.cjs` (+`.bak-t4`), `src/components/ui/SegmentedControl.jsx`,
`src/components/ui/CustomTextBox.jsx`, `web/assets/geovanta.bundle.js`.

**Verifikasi mandiri yang dijalankan (bukan klaim implementer):**
- Probe GREEN dijalankan sendiri, server statis `web/` di port 8951
  (8931 sudah dipakai server sisa T2; server review dimatikan sesudah run):
  **10/10 lolos**, angka identik dengan laporan (F1 hue 0→95, F3 110,75/110,75/5,5/8/243,
  F5b dx 0/0, F6 gap 6, tombol 235px). Screenshot `after` yang tertimpa run review
  dikembalikan ke aslinya (md5 `ce0f5d0477744e156e74b1ecc57042e7`, 92.769 B).
- `npm test` dijalankan sendiri: **277/277 PASS, 0 fail** (21,2 dtk).
- Diff dihitung ulang sendiri (`diff` `.bak-t4` vs current): RecolorSection 1 baris (292),
  EditorRightInspector 2 baris (386, 424), test tripwire, bundle +4 aturan. Cocok dengan
  review-package.
- AST bundle di-parse sendiri dengan Node (bukan mengandalkan angka laporan).

## 1. Spec-compliance (brief T4)

| # | Persyaratan brief | Hasil |
|---|-------------------|-------|
| 1 | `rc-range-min/max` masing-masing `flex: 1`, teks rata tengah, tinggi ~30px, separator `–` tetap | ✅ — `style={{flex: 1, height: 30}}`, `cls="ctr"`, separator dipertahankan di diff baris 292. Probe F3/F4/F5b hijau; run mandiri: flexGrow `1`/`1`, tinggi 30/30, justify `center`, dx 0/0 |
| 2 | `rc-mode-seg` Mode 1/2 vertikal, gap (mis. 6px), full-width + padding, perilaku + `data-testid="rc-mode-seg"` tidak berubah | ✅ — `cls="vert"`, `.seg.vert {flex-direction: column; gap: 6px}`; probe F6 hijau (tombol 235px = lebar konten seg, gap 6, Mode 2 di bawah Mode 1), F2 guard hijau (toggle + preview), testid ada |
| 3 | Baris nilai warna Fill solid + Stroke tambah padding atas-bawah (`py-1`), tanpa ubah logika commit/livePaint/unlink | ✅ — `py-1` di `EditorRightInspector.jsx:386` (Fill, di bawah guard `!VE.gradOn(cp)`, tepat sebelum `ColorField tip="veFill"`) dan `:424` (Stroke, tepat sebelum `ColorField tip="veStroke"`). Diff kedua baris hanya penambahan `py-1` pada className. Probe F7 hijau (padding 4px/4px keduanya) |
| 4 | Lokasi wajib verifikasi ulang via grep | ✅ — baris 292 RecolorSection; 386/424 inspector (brief menulis 388–397/408–418 — perkiraan; baris aktual terkonfirmasi lewat konteks `tip="veFill"`/`tip="veStroke"` di diff) |
| 5 | Jangan ubah logika Recolor / snapshot fix wave | ✅ — lihat §2 |
| TDD | Probe RED dulu (gagal pada asersi yang dituju), GREEN sesudah, screenshot before/after, regresi `npm test` | ✅ GREEN + regresi direproduksi mandiri (lihat atas). RED diverifikasi lewat derivasi dari `.bak-t4` + kode probe (§4), bukan live re-run — lihat "Cannot verify from diff" |
| Aturan kerja | Backup `.bak-t4` per file sebelum edit; diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n | ✅ — 4 file `.bak-t4` ada; `!important` mentah 357→357 (0 baru, dihitung ulang); tidak ada `!important`/offset/z-index/klip baru di diff; label/i18n tidak disentuh |

## 2. Mekanisme vertikal `Seg cls="vert"` — SAH

- **Preseden `cls` benar ada.** `Seg` (`SegmentedControl.jsx:8-22`) menerima prop `cls`
  dan merangkainya sebagai `'seg' + ' ' + cls`. Call site nyata: `cls="eq"`
  (`EditorRightInspector.jsx:538`), `cls="ic"` (`SettingsModal.jsx:113`), `cls="cp"`
  (beberapa tempat). `SegmentedControl.jsx` sendiri TIDAK disentuh (tidak ada
  `.bak-t4` untuk file ini; tidak ada di diff) — handler `setMode`, `data-testid`,
  dan perilaku preview/commit/unlink tidak berubah. ✅
- **Preseden hide-pill benar ada, dua tempat.** `.stg-modal .seg > .seg-p`
  (`display: none`) dan `.ved-straight-panel .seg > .seg-p, .fig-layers-scroll
  .ved-panel .seg > .seg-p` (`display: none`) — keduanya sudah ada di bundle.
  `.seg.vert > .seg-p { display: none }` mengikuti pola yang sama. Pill yang
  di-hide membuat inline style `translateX`/`width` pada `.seg-p` menjadi inert. ✅
- **Gaya tombol `.on` konsisten dengan pill M3 — diverifikasi sama persis.**
  Aturan yang sudah ada `.seg-p, .gch button.on, .fig-flow-bar button.on` berisi
  `background: color-mix(in srgb, var(--acc) 18%, var(--card))`,
  `color: var(--fig-sel-ink)`, `box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06)`
  (dengan `!important`). Aturan baru `.seg.vert button.on` menyalin ketiga
  deklarasi itu verbatim, minus `!important`. Preseden kedua:
  `.stg-modal .seg button.on` memakai nilai yang sama. ✅
- **Spesifisitas cukup tanpa `!important` — diverifikasi.** `.seg.vert button.on`
  = (0,3,1); mengalahkan `.seg button` (0,1,1) dan `.seg .on` (0,2,0, hanya mengatur
  `color`). Penyisiran seluruh AST (termasuk aturan bersarang): satu-satunya aturan
  lain yang mengatur `background` pada `.seg button.on` adalah
  `.ved-straight-panel .seg button.on` dan `.stg-modal .seg button.on` — keduanya
  ter-scope di luar konteks Recolor (sidebar kanan, bukan straight-panel/modal).
  Aturan `.seg-p, .gch button.on, ...` yang ber-`!important` TIDAK mengenai tombol
  `.seg` (selector-nya `.seg-p`, `.gch button.on`, `.fig-flow-bar button.on`).
  Tidak ada override dark-theme untuk background tombol `.seg`. ✅
- **Full-width + padding mode vertikal.** `.seg` dasar `display: flex`; arah kolom +
  `align-items` default `stretch` → tombol memenuhi lebar (probe: 235px = lebar
  konten seg). Padding atas-bawah dari aturan dasar `.seg button` (`6px 12px`);
  tinggi tombol terukur 30px/30px. ✅

## 3. Tripwire 837→841 — SAH

- Parse AST mandiri: bak **837** aturan, current **841** (+4). Prefix 0..836 identik
  byte-per-byte (`JSON.stringify` sama) — 4 aturan baru murni di-append di akhir:
  `.seg.vert`, `.seg.vert > .seg-p`, `.seg.vert button.on`, `.c-inp.ctr`. ✅
- Indeks **[464]/[465] tidak bergeser**, diverifikasi ulang: keduanya
  `:root, :root[data-theme="light"]` dan `:root[data-theme="dark"]` di bak maupun current. ✅
- `!important` mentah di file: **357 bak → 357 current** (0 baru). Catatan hitung:
  laporan menulis "357 → 357" — benar untuk hitungan mentah file; hitungan di dalam
  string JSON AST saja memberi 356/356 karena satu `!important` berada di luar
  literal AST. Bukan selisih. ✅
- `tests/accent-tokens.test.cjs:58-63`: tripwire diperbarui 837→841 + komentar riwayat
  mengikuti pola T5 (835→837). Perubahan disengaja dan terdokumentasi. ✅

## 4. Centering + aritmetika F3 — BENAR

- **Centering via `justify-content: center`, bukan `text-align` — benar dan perlu.**
  `.c-inp` adalah `inline-flex` (`display: inline-flex`, `width: 100%`, terverifikasi
  di AST) dan `CustomTextBox.jsx:213` merender `className={'c-inp ' + cls ...}` sehingga
  `cls="ctr"` menghasilkan `c-inp ctr` yang dicocokkan aturan `.c-inp.ctr
  { justify-content: center }`. `text-align` pada wrapper memang tidak akan
  memusatkan teks di dalam flex container — analisis implementer tepat. Probe F5b
  (justify `center` + dx teks 0/0) direproduksi mandiri. ✅
- **Aritmetika F3 benar, direproduksi mandiri:** 110,75 + 110,75 + 5,5 + 2×8 = 243.
  Run mandiri: minW 110,75, maxW 110,75, sepW 5,5, gap 8, rowContentW 243. ✅
- **Tinggi 30px:** `py-1` (4px atas + 4px bawah) + konten `.c-inp` min-height 22px
  = 30px di bawah `box-sizing: border-box` preflight; `flex items-center` pada
  wrapper memusatkan `.c-inp` vertikal. Terukur 30/30. ✅

## 5. Logika Recolor tak tersentuh — BENAR

- `diff RecolorSection.jsx.bak-t4` vs current: **satu baris saja (292)** — hanya
  `cls="vert"`, `flex: 1`/`height: 30`/`flex items-center px-1.5 py-1`, `cls="ctr"`.
  `onCommit` (parseInt + `clampN(n, 0, 360)`), `setHueMin`/`setHueMax`, `setMode`,
  `doApply`, `handleCancel` tidak berubah satu karakter pun. ✅
- `committedDoc`/`baseRef`: 16 kemunculan di bak dan 16 di current (grep -c). ✅
- `SegmentedControl.jsx` tidak disentuh (§2). `EditorRightInspector.jsx`: diff hanya
  penambahan `py-1` pada dua className (baris 386, 424); handler `on` di
  `ColorField`/`ColorText` (commit/livePaint/unlink) tidak tersentuh. ✅
- **Baris Fill/Stroke yang tepat.** `tip="veFill"` muncul 2× di inspector: div seksi
  (`data-tip="veFill"`, baris 364) dan `ColorField` (386) — `py-1` mengenai baris
  `ColorField` yang kedua, yaitu baris nilai warna Fill solid di bawah guard
  `!VE.gradOn(cp)`. Sama untuk Stroke: div seksi (410) vs `ColorField` (424).
  Probe F7 memakai `button.swatch[data-tip="veFill"/"veStroke"]` lalu
  `closest('div.flex.items-center.gap-2')` sehingga yang diukur adalah baris
  `py-1` yang benar, bukan div seksi. ✅

## 6. Probe RED → GREEN — TERKONFIRMASI SEBAGIAN BESAR (GREEN live, RED derivasi)

- **GREEN direproduksi mandiri 10/10** (port 8951), angka identik dengan laporan.
  F1/F2/F5a guard lolos sebelum dan sesudah; F3/F4/F5b/F6/F7 target hijau sesudah fix;
  F8 guard horizontal hijau; F9 0 pageerror. ✅
- **RED 5/10 (gagal tepat F3, F4, F5b, F6, F7) diverifikasi lewat derivasi dari
  `.bak-t4` + kode asersi probe** (bukan live re-run — lihat "Cannot verify"):
  bak: field range `width: 68, height: 22`, tanpa `flex` → flexGrow `0` (F3 FAIL),
  tinggi 22 di luar 28–32 (F4 FAIL); tanpa `cls="ctr"` dan tanpa aturan `.c-inp.ctr`
  → justify computed `normal` (F5b FAIL); `.seg` dasar `flex-direction: row` →
  Mode 2 tidak di bawah Mode 1 (F6 FAIL); tanpa `py-1` → padding 0 (F7 FAIL).
  Setiap kegagalan mengikuti dari geometri bak dan asersi probe yang dibaca. ✅
- **Screenshot:** before 94.126 B / after 92.769 B, keduanya 1440×900 — cocok persis
  dengan laporan. ✅
- **Build:** `web/assets/geovanta.bundle.js` (build terakhir) memuat keempat aturan
  baru di ujung array AST, dalam urutan yang sama — bukti build dijalankan sesudah
  state sumber final. `npm run build:web` sendiri tidak saya jalankan ulang
  (menghindari regenerasi bundle). ✅ (via artefak)

## 7. Temuan

### Critical — (tidak ada)

### Important — (tidak ada)

### Minor

- **M1 — Klaim preseden `stk` sedikit berlebihan (laporan §1, bukan kode).**
  Bukti: tidak ada call site yang mem-passing `cls="stk"` ke `Seg`
  (grep seluruh `src/components` — hanya cabang `cls.includes('stk')` di
  `SegmentedControl.jsx:22` dan aturan CSS `.seg.stk button` yang ada).
  Preseden `cls` sebagai extension point tetap terbukti lewat `eq`
  (`EditorRightInspector.jsx:538`) dan `ic` (`SettingsModal.jsx:113`).
  Dampak: nol pada kode; hanya akurasi kalimat laporan.
- **M2 — Padding Fill/Stroke hanya terbukti via computed style, bukan visual**
  (diakui laporan §6.1). F7 mengukur padding 4px/4px; pada screenshot, baris
  Fill/Stroke berada di atas lipatan. Tidak ada indikasi visual yang bertentangan.
- **M3 — Tidak ada unit test baru.** Brief menulis "npm test penuh (277 + tes baru)".
  Cakupan baru T4 adalah probe Playwright (10 asersi) + update tripwire, bukan file
  tes unit baru; suite tetap 277/277. Sesuai bagian TDD brief (yang mewajibkan probe),
  tetapi frasa "tes baru" di brief secara harfiah tidak terpenuhi dalam bentuk unit test.
- **M4 — Centering saat editing aktif tidak diukur terpisah** (diakui laporan §6.3).
  Probe mengukur dx teks saat tidak editing (dx = 0). Aturan `.c-inp.ctr` yang sama
  mengatur span saat editing, tetapi belum ada pengukuran dx saat caret berkedip.
- **M5 — Duplikasi deklarasi `.on` tanpa token bersama.** `.seg.vert button.on`
  menyalin 3 deklarasi pill M3 secara literal; bila nilai pill berubah di masa depan,
  kedua tempat harus diubah manual. Perawatan, bukan cacat — nilai saat ini identik
  dan terverifikasi.

## 8. Cannot verify from diff

1. **Live run RED tidak saya eksekusi ulang.** Menjalankannya butuh menukar file
   `.bak-t4` masuk + rebuild + probe, lalu mengembalikan — saya memilih tidak
   memutasi working copy. RED 5/10 (F3, F4, F5b, F6, F7) diverifikasi secara derivasi
   dari geometri `.bak-t4` + kode asersi probe (§6); nilai persis RED `dx −15,7px`
   (F5b) tidak saya reproduksi secara independen.
2. **Run RED interim 2/10** (dua bug probe: slider di bawah lipatan, selektor
   `[data-tip="veFill"]` mengenai div seksi) tidak dapat diverifikasi dari artefak —
   hanya ada di narasi laporan. Tidak berpengaruh pada verdict (bug probe sudah
   diperbaiki; run RED final 5/10 yang relevan sudah terderivasi).
3. **Apply Mode 2 end-to-end tidak diuji** (diakui laporan §6.2; di luar scope T4 yang
   hanya restyle layout). F2 hanya memverifikasi toggle + preview nol. Logika Apply
   tidak diubah (diff 1 baris membuktikan), jadi risiko regresi minimal, tetapi ini
   klaim dari tidak-adanya-perubahan, bukan dari tes.
4. **`npm run build:web` exit 0 tidak saya jalankan ulang.** Keberadaan 4 aturan baru
   di `web/assets/geovanta.bundle.js` membuktikan build terakhir berjalan sesudah
   state sumber final; exit code-nya sendiri tidak saya saksikan.

## 9. Kesimpulan

Implementasi T4 memenuhi seluruh brief: hue-range `flex: 1` + teks tengah +
tinggi 30px, Mode 1/2 vertikal via `Seg cls="vert"` (mekanisme sah dengan preseden
`cls`, hide-pill, dan gaya `.on` yang identik dengan pill M3), dan `py-1` pada
baris Fill solid + Stroke yang tepat — semuanya tanpa menyentuh logika Recolor,
snapshot fix wave, atau `SegmentedControl`. Tripwire 837→841 sah, indeks
[464]/[465] tidak bergeser, `!important` tetap 357. Probe GREEN 10/10 dan
`npm test` 277/277 direproduksi mandiri oleh reviewer. **APPROVED.**
