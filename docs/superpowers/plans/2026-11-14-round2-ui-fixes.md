# Plan — Ronde 2: Workspace accent, corner radius drag, panel inspector (Selection Colors, Recolor, Color Styles, Effects, PinGrid, snap)

**Asal permintaan:** user 2026-11-14 21:08 WIB (side chat), mengirim kembali ZIP final
`Geovanta-ColorStyles-Recolor-Effects.zip` (SHA `4d04f5ac471846ee423a2db4b5a69cd56e238587a4f6ce414933db046acbb2aa`,
277 entri) + screenshot `image-25.png` (lingkaran biru #0D99FF, 8 node, Selection Colors dilingkari merah).
**Working copy:** `~/workspace/geovanta-round2/` (ekstrak ZIP di atas; BUKAN repo git — "commit" =
backup `.bak` + laporan, seperti ronde sebelumnya).
**Baseline terverifikasi controller 2026-11-14 21:xx WIB:** `npm ci` lalu `npm test` **275/275 PASS**,
0 fail. ZIP masukan = persis ZIP final ronde T1–T9 + fix wave (SHA cocok).
**Penting:** `probes/` dan folder `sdd-2026-11-14-sidebar-panels/` TIDAK ada di dalam ZIP
(mereka hidup di working copy ronde lalu yang sudah tidak ada) — harness probe + server statis
harus dibuat ulang di ronde ini. Playwright: browser sudah ter-cache di `~/.cache/ms-playwright`
(chromium-1254/1255); paket `playwright`/`playwright-core` tersedia di
`~/workspace/vector-editor/node_modules/` (boleh di-`npm i -D playwright-core` di working copy
atau reuse — jangan commit `node_modules` ke ZIP).

## Goal

Perbaiki 10 butir user di bawah, semuanya terhadap build ZIP di atas, dengan bukti
reproduksi + probe + screenshot sebelum/sesudah per task. Tidak ada perluasan scope:
jangan ubah perilaku lain, jangan ganti label/i18n, jangan ubah `.tool-btn.on`
(floating bar) kecuali disebut eksplisit.

## Peta kode (terverifikasi controller via grep — implementer WAJIB verifikasi ulang)

| Butir user | Lokasi |
|---|---|
| Active icon button agak gelap, tidak sama persis accent | `src/vendor/tailwindOfflineBundle.jsx`: `--acc-deep: color-mix(in srgb, var(--acc) 45%, black)`; `.dk-b.on { background: var(--acc-deep) }`. Rail kiri = `VectorEditor.jsx:8307` (`dk-b` + `fig-rail-grp`, 3 grup). Accent diterapkan `src/utils/themeAndPrefsManager.jsx:14` (`--acc`). |
| 3 tombol kiri tab layer: hapus border-radius + box-shadow | Bundle yang sama: `.fig-rail-grp` override `border-radius: 14px !important` + `box-shadow: var(--m3-shadow-xs) !important` (aturan dasarnya `border-radius: 12px`). |
| Corner radius tidak bisa pakai mouse (hover muncul 2 panah, geser kiri/kanan tidak bertambah, toast "Sudut tidak cukup panjang…", padahal ketik nilai normal) | Field `EditorRightInspector.jsx:263` `XfField label="◜" on={setRadius}`; scrub mouse = `src/components/ui/TransformField.jsx:57-146` (`startScrub` di `xf-l`, tombol step `xf-step` = "dua panah"); `setRadius`/`applyRadiusToCorners` `VectorEditor.jsx:8073-8110` (toast `:8107` bila `!ch && rad > 0`); engine `src/engine/cornerFilletEngine.jsx:278` `setSelectedNodesRadius`. Catatan: T1 ronde lalu memperbaiki bintang + clamp; drag vs ketik DIDUGA melewati jalur yang sama (`setRadius`) — implementer WAJIB membuktikan lewat reproduksi kenapa drag gagal sementara ketik berhasil (hipotesis awal: scrub memanggil `setRadius` per-pointermove; begitu radius melewati maksimum SATU sudut, `commitObjs` mengembalikan false → toast + nilai mental; ATAU engine masih menolak di jalur itu). Jangan percaya hipotesis ini tanpa angka. |
| 5 tombol lingkaran merah: ikon, padding atas-bawah, flex-wrap | `EditorRightInspector.jsx:512-518`: F&R + Recolor ada DI DALAM `.fig-isec-title` (`flex:1`, padding inline `2px 6px`, ikon `refresh`/`palette` 11px — warisan T4/T6); 3 Select Same di baris bawah (`flex flex-wrap gap-1.5`, padding `2px 6px`, TANPA ikon). |
| Rentang hue sumber: teks ke tengah, isi ruang kosong, padding atas-bawah | `RecolorSection.jsx:303-308` (`rc-range-min/max`): `.fld px-1.5 py-0.5`, `width: 68, height: 22`, teks rata kiri (default). |
| Recolor Mode 1/2: bertumpuk vertikal + gap, padding atas-bawah; tab nilai warna Fill solid + Stroke | `RecolorSection.jsx:292` (`rc-mode-seg`, `Seg` horizontal + indikator geser `.seg-p` absolute — varian vertikal TIDAK ADA; implementer pilih mekanisme dan minta reviewer sahkan); Fill `EditorRightInspector.jsx:388-397` dan Stroke `:408-418` (baris `flex items-center gap-2` `ColorField` + `ColorText`, tanpa padding vertikal). |
| Titik poros 9 titik: lebar ≠ tinggi, samakan, tetap isi ruang kosong di bawahnya | `src/components/ui/PinGridSelector.jsx` (murni grid 3×3); bundle `.pin3 { width: 62px; padding: 5px; gap: 3px; button height: 14px }` → 62×58 (tidak persegi); `.pin3-fill { align-self: stretch; grid-template-rows: repeat(3,1fr) }` (Transform, `EditorRightInspector.jsx:260`) merentang ke tinggi kolom kanan; Alignment Auto layout (`:528`) tanpa `pin3-fill`. Ruling T5 berlaku: total aturan bundle kini **837** — tripwire yang menghitung aturan WAJIB di-update dengan justifikasi bila aturan ditambah. |
| Color Styles: padding atas-bawah + kiri-kanan lega; 3 tombol di bawah teks: JANGAN text-wrap, cukup flex-wrap | `EditorRightInspector.jsx:360`: judul + 3 tombol (Buat style/F&R/Recolor) SEBARIS di `.fig-isec-title` (`flexWrap: 'nowrap'`, `whiteSpace: 'nowrap'`, `ved-pill--compact`); `.fig-isec` global `padding: 14px 12px` — JANGAN ubah global, beri padding khusus seksi ini saja. |
| Tombol Tambah efek: padding atas-bawah + kiri-kanan, letakkan DI BAWAH teks Effects persis; style sama untuk 3 tombol yang muncul saat diklik | `EditorRightInspector.jsx:445-448`: `+ Tambah efek` (`ved-pill`, padding `2px 6px`) DI DALAM `.fig-isec-title` (kanan atas); 3 tombol popover `fx-add-shadow/layerblur/bgblur` (`ved-pill w-full`, `space-y-1`) di `Float`. Anchor `Float` (`fxAddBtnRef`) ikut pindah ke tombol baru. |
| Bug warna terakhir tidak berfungsi | BELUM terpetakan — kandidat: (a) strip recent-colors `EditorRightInspector.jsx:367` (`recents.map`, `applyRecentColor`, `rememberRecentColor` `VectorEditor.jsx:133` — 10 warna terakhir); (b) baris TERAKHIR Selection colors (`:514-518`, `replaceSelectionColor` `VectorEditor.jsx:8146`); (c) Recolor Mode 2 keluarga/warna terakhir (`RecolorSection.jsx:310+`); (d) warna drop-shadow efek. T8 WAJIB reproduksi dulu dan membuktikan yang mana yang gagal sebelum memperbaiki. |
| Ikon snap floating bar bawah-tengah jadi ikon relevan dengan teks "snap" | `EditorFloatingToolbar.jsx:195`: `IconBtn ... d="M6 4v6a6 6 0 0 0 12 0V4 M6 7.5h3.5 M14.5 7.5H18"` (busur magnet samar — terbaca seperti headphone/arc). Standar industri = magnet. Cek dulu set ikon yang ada (`src/components/ui/IconGlyphs.jsx`, `brandAndIcons.jsx`); bila tidak ada magnet yang jelas, tambah satu path baru dan minta reviewer sahkan keterbacaannya di 22px. Scope HANYA tombol snap bar bawah; ikon baris menu snap (`SnapIcon`, `:16-28`) tidak disentuh kecuali memakai path yang sama persis. |

## Task (BERURUTAN — satu implementer segar per task, review segar per task, fix loop maks 5 ronde; Minor TIDAK masuk fix loop, catat di ledger → final review)

### T1 — Rail kiri: active = accent persis + hapus radius & shadow 3 grup
- Ubah `.dk-b.on` dari `var(--acc-deep)` menjadi `var(--acc)` (tepat, tanpa color-mix).
  `.tool-btn.on`, `.cp-act-btn.on`, `.ws-nav-item.on .ws-nav-ico` JANGAN disentuh.
- `.fig-rail-grp`: `border-radius: 0`, `box-shadow: none` (hapus override `!important`
  14px/shadow; bila aturan dasar 12px tersisa, netralkan juga di aturan yang sama —
  tanpa menambah `!important` baru; bila harus menyentuh aturan `!important` M3 yang
  sudah ada, sebutkan eksplisit di laporan).
- Probe RED dulu: ukur computed `background-color` `.dk-b.on` vs nilai `--acc`
  (set accent `#0d99ff` lewat Settings/prefs) + `border-radius`/`box-shadow`
  `.fig-rail-grp`; screenshot before/after. Regresi: suite + probe snap/floating-bar
  (tombol rail lain tetap berfungsi).

### T2 — Corner radius drag mouse (systematic-debugging Fase 1 dulu)
- Step 1: reproduksi di browser asli — (a) lingkaran 8 node seperti screenshot user
  (radius kecil), (b) rect kecil, (c) bintang 5 (regresi T1): drag label `◜`
  (scrub) ke kanan/kiri + klik tombol step atas/bawah; catat nilai field, geometri,
  toast. Bandingkan dengan ketik nilai yang sama. Tulis hipotesis tunggal + bukti.
- Step 2: perbaiki di AKAR (kemungkinan: scrub/drag harus menjepit per-sudut seperti
  jalur ketik, bukan ditolak mentah-mentah; toast penolakan hanya bila TIDAK ADA
  sudut yang bisa dijepit). `commitObjs` tetap mengembalikan true bila clamp diterapkan.
- Jangan rusak: ketik nilai, bintang (T1), `autoRefineGeometry.jsx` (pemakai
  `setSelectedNodesRadius` lain), unit `tests/corner-clamp.test.cjs` (tambah kasus
  drag-path bila perlu). Probe + screenshot before/after (rect kecil + radius besar
  via drag: sudut membulat pada maksimum, tanpa toast penolakan).

### T3 — 5 tombol Selection Colors: ikon + padding + flex-wrap
- Pindahkan F&R + Recolor KELUAR dari `.fig-isec-title` ke baris sendiri di bawah judul
  (`flex-wrap`, `gap`), masing-masing `flex: 1`, ikon tetap `refresh`/`palette` 11px,
  padding vertikal ditambah (mis. `6px 10px` — implementer ukur agar sejajar sistem
  `ved-pill` lain; label/`data-testid`/`data-tip`/`onClick` tidak berubah).
- 3 tombol Select Same: tambah ikon dari set yang ada (isi = fill, stroke, type —
  pilih yang paling terbaca, TIDAK ada path baru kecuali reviewer setuju), padding
  yang sama, tetap `flex-wrap` (boleh membungkus ke 2 baris; JANGAN perkecil label
  di bawah 10px, JANGAN klip — preseden T3).
- Probe: lebar baris = lebar seksi (±1px), tidak ada overflow/clip, ikon ada (path `d`
  diasersi — pelajaran T6), 2 baris warna + ◎ tidak berubah. Screenshot before/after.

### T4 — Recolor: hue-range center + mode vertikal + padding Fill/Stroke
- `rc-range-min/max`: masing-masing `flex: 1` (isi lebar baris), teks rata tengah,
  padding atas-bawah ditambah (tinggi ~30px, sejajar field lain); separator `–` tetap.
- `rc-mode-seg`: Mode 1 + Mode 2 bertumpuk VERTIKAL dengan gap (mis. `gap: 6px`),
  masing-masing full-width + padding atas-bawah; perilaku (preview live, commit,
  `data-testid="rc-mode-seg"`) tidak berubah. Mekanisme (varian vertikal `Seg` vs
  dua tombol toggle) diputuskan implementer + disahkan reviewer.
- Baris nilai warna Fill solid + Stroke (`ColorField` + `ColorText`): tambah padding
  atas-bawah (mis. `py-1`) — JANGAN ubah logika commit/livePaint/unlink.
- Probe: `rc-hue` drag masih jalan, mode 1/2 toggle + preview benar, range min/max
  ketik + center terukur (`text-align: center` + posisi teks di tengah field),
  regresi `probe-recolor` hijau (re-point bila perlu — JANGAN ubah asersi perilaku).

### T5 — PinGrid persegi di kedua pemakaian
- `.pin3`: jadikan persegi (lebar = tinggi, mis. via `aspect-ratio: 1` + sesuaikan
  padding/gap/button agar terukur 62×62 ATAU ukuran persegi lain yang konsisten).
- `.pin3-fill` (Transform): tetap merentang mengisi ruang bawah kolom kanan, TAPI
  lebar mengikuti tinggi (`aspect-ratio: 1`) sehingga tetap persegi.
- Alignment Auto layout (tanpa `pin3-fill`): persegi juga; jangan ubah layout
  `fig-flow-bar`/tombol lain.
- Probe: ukur `width === height (±1px)` di KEDUA pemakaian + bottom-alignment
  Transform vs kolom kanan tetap terjaga (preseden T5: ujung bawah grid sejajar
  ujung bawah tombol "Skala stroke"); update tripwire hitung-aturan bundle (837 → N)
  dengan justifikasi; screenshot before/after kedua pemakaian.

### T6 — Color Styles: padding lega + 3 tombol di bawah judul, flex-wrap saja
- Seksi `color-styles-section`: padding atas-bawah + kiri-kanan LEBIH lega dari
  `.fig-isec` standar (khusus seksi ini saja — class/inline baru; JANGAN ubah
  `.fig-isec` global).
- 3 tombol (Buat style / F&R / Recolor) pindah ke baris sendiri DI BAWAH teks judul,
  container `flex-wrap` + `gap`; label tombol `whiteSpace: nowrap` (TIDAK ada
  text-wrap pada label — bungkus terjadi di level flex, bukan teks).
- Ikon T4 dipertahankan (`plus`/`refresh`/`palette` 11px); `data-testid` tidak berubah.
- Probe: tidak ada overflow/clip, 3 tombol tidak terpotong, judul 1 baris,
  screenshot before/after.

### T7 — Effects: tombol Tambah efek di bawah judul + style sama untuk 3 tombol munculan
- `+ Tambah efek`: pindah dari `.fig-isec-title` ke baris sendiri DI BAWAH teks
  "Effects" (full-width), padding atas-bawah + kiri-kanan (mis. `6px 12px`).
- 3 tombol popover (Drop shadow / Layer blur / Background blur): padding yang SAMA
  persis; `data-testid` (`fx-add-shadow/layerblur/bgblur`) + perilaku tambah efek
  tidak berubah; anchor `Float` ikut tombol baru.
- Probe: tombol tambah efek di bawah judul (posisi Y > judul, lebar = lebar seksi),
  klik → popover muncul → ketiga tombol berpadding sama (terukur) → tambah tiap efek
  tetap jalan; screenshot before/after.

### T8 — Investigasi + perbaiki bug "warna terakhir tidak berfungsi"
- Step 1 (WAJIB sebelum edit): probe reproduksi yang mengklik SEMUA kandidat dan
  mencatat mana yang gagal — (a) tiap swatch recent-colors (pertama/tengah/terakhir,
  setelah seed 3+ warna), (b) baris terakhir Selection colors (ColorField + tombol ◎),
  (c) warna terakhir tiap keluarga Recolor Mode 2 (target + override), (d) warna
  drop-shadow efek. Kriteria gagal: klik tidak mengubah fill/seleksi/target + tanpa
  toast/error yang menjelaskan.
- Step 2: perbaiki AKAR masalah dari SATU kandidat yang terbukti gagal (bila lebih
  dari satu, laporkan semuanya; bila TIDAK ADA yang gagal, TUTUP task dengan laporan
  bukti lengkap + TANPA edit spekulatif — controller yang memutuskan langkah berikut
  bersama user).
- Regresi: suite + probe color-styles/recolor/find-replace hijau.

### T9 — Ikon snap floating bar jadi magnet yang relevan
- Ganti path `d` tombol snap (`EditorFloatingToolbar.jsx:195`) dengan ikon magnet
  yang jelas (U-magnet + ujung kutub); bila memakai path baru, dokumentasikan
  sumbernya (set ikon internal / digambar mengikuti gaya stroke 1.8 yang sama).
- `data-tip="veSnap"`, toggle `snapOn`, chevron menu, dan menu snap tidak berubah.
- Probe + screenshot: ikon terbaca sebagai magnet pada 22px (controller LIHAT
  langsung screenshot before/after); toggle on/off tetap jalan.

### T10 — Verifikasi akhir + ZIP final
- `npm test` (275 + tes baru, 0 fail) + `npm run build:web` (exit 0, 0 warning) +
  seluruh probe baru T1–T9 hijau + regresi (fr-sidebar, rc-sidebar, recolor,
  find-replace, selsame-home, color-styles, snap-fixes, corner-clamp) hijau, 0 pageerror.
- Smoke 6/6 dari hasil EKSTRAK ZIP (bukan dari working copy).
- Rebuild ZIP dengan aturan inklusi yang sama seperti ZIP masukan (bandingkan daftar
  entri: delta HANYA file yang diubah/ditambah + `.bak` TIDAK ikut bila sebelumnya
  tidak ikut); catat SHA256 + jumlah entri + ukuran; screenshot after tiap task
  dilampirkan.

## Global constraints (mengikat semua task)

- TDD: probe RED dulu (gagal pada asersi yang dituju), GREEN sesudah. Backup `.bak-<task>`
  per file SEBELUM edit pertama. Diff minimal; tanpa `!important`/offset/z-index/klip
  baru; tanpa dependensi baru; tanpa ubah label/i18n.
- Hanya controller yang mengedit ledger (`docs/superpowers/plans/2026-11-14-round2-ui-fixes-progress.md`).
  Artefak per task: `docs/superpowers/plans/sdd-2026-11-14-round2/task-N-brief.md`,
  `task-N-report.md`, `task-N-review-package.md`.
- Review segar per task (spec + kualitas + baca diff + jalankan probe sendiri bila
  memungkinkan); verdict APPROVED / With fixes. Fix loop maks 5 ronde.
- Sesudah T10: final review whole-branch (seperti ronde lalu) → fix wave bila ada
  temuan Important/Critical → scoped re-review → ZIP diserahkan ke user.
- Kejujuran aritmetika: hitung ulang semua total dari addend-nya sebelum dilaporkan
  (pelajaran ronde lalu: total probe pernah salah karena memakai ulang angka unit test).
