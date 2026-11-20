# Plan — Ronde 3: Perapian UI Geovanta (rail, ws-nav accent, sidebar kanan, floating bar Frame, CustomTextBox, Canvas, Selection Colors, warna terakhir, mode Fill)

**Asal permintaan:** user 2026-11-15 04:51 WIB, mengirim kembali ZIP final Ronde 2
`Geovanta-Round2-UI-Fixes_1_h80o.zip` (SHA `c75e7a62e09e9410d4064752ad858d868c86be904d76475b56c985941d24bed7`,
279 entri — IDENTIK dengan ZIP final Ronde 2) + 11 butir perbaikan UI lanjutan.
**Working copy:** `~/workspace/geovanta-round2/` (BUKAN repo git — "commit" =
backup `.bak-r3tN` + laporan, seperti ronde sebelumnya).
**Baseline terverifikasi controller 2026-11-15 (fresh run, sebelum T1):** `npm test`
**277/277 PASS**, 0 fail.
**Penting:** `probes/` + `docs/superpowers/plans/sdd-2026-11-14-round2/` hidup di
working copy (bukan di ZIP) — probe Ronde 2 bisa dipakai ulang. Playwright:
browser ter-cache di `~/.cache/ms-playwright` (chromium-1254/1255); paket
`playwright-core` di `~/workspace/vector-editor/node_modules/`.
**Tripwire bundle (state awal Ronde 3, warisan Ronde 2 T4):** 841 aturan AST,
`!important` 357, `acc-deep` 6. Setiap task yang menambah/mengubah aturan WAJIB
melaporkan angka baru + justifikasi (preseden T4/T5 Ronde 2).

## Goal

Perbaiki 11 butir user di bawah terhadap build Ronde 2, dengan bukti reproduksi +
probe + screenshot sebelum/sesudah per task. Tidak ada perluasan scope: jangan
ubah perilaku lain, jangan ganti label/i18n, jangan ubah selector yang tidak
disebut eksplisit. Dua butir bersifat investigasi dulu (T2, T10): bila terbukti
sudah benar / tidak ada bug, TUTUP dengan bukti lengkap TANPA edit spekulatif.

## Skills yang dipakai (diumumkan)

`subagent-driven-development` (koordinator: 1 implementer segar per task +
task review per task + final review whole-branch; implementer TIDAK boleh spawn
subagent/reviewer sendiri), `systematic-debugging` (root cause dulu — khusus
T2/T9/T10), `ui-ux-fixer-and-improvement` (audit 7 pilar, 8 state interaktif;
JANGAN text-wrap, JANGAN magic offset, JANGAN border tebal untuk pemisah),
`browser_ui_fix_verification` (verifikasi di browser ASLI Playwright + ukur
layout nyata, scenario matrix per gejala), `test-driven-development` (probe RED
dulu, hijau sesudah), `verification-before-completion` (tidak ada klaim tanpa
bukti perintah segar).

## Peta kode (terverifikasi controller via grep — implementer WAJIB verifikasi ulang)

| Butir user | Lokasi |
|---|---|
| T1 `.fig-rail-grp` hapus border | `src/vendor/tailwindOfflineBundle.jsx`: 2 aturan `.fig-rail-grp` + 1 `.fig-rail-grp:hover`. Aturan dasar (idx 494 R2): `border: 1px solid transparent`, `border-radius: 12px` → R2 jadi `0`. Override M3 (idx 794 R2): `border: 1px solid rgba(15,23,42,0.06) !important`, `border-radius: 14px !important` → R2 jadi `0 !important`, `box-shadow: none !important`. "Hapus border" = netralkan `border` di KEDUA aturan (jadi `none` / `0` / hapus deklarasi — implementer pilih yang tidak menambah `!important` baru; bila harus menyentuh `!important` M3, sebutkan eksplisit). |
| T2 `.ws-nav-item.on .ws-nav-ico` accent persis + hapus border-color | Bundle: 2 aturan `.ws-nav-item.on .ws-nav-ico` (R2: idx 694 DAN 771, keduanya masih `var(--acc-deep)`), 2 aturan `.ws-nav-item.on`, 1 `.ws-nav-item.on .ws-nav-cnt`. Dipakai di `src/components/workspace/WorkspaceHome.jsx` (nav workspace home — BUKAN rail editor). Accent `--acc` diterapkan `src/utils/themeAndPrefsManager.jsx:14`. PERHATIAN RIWAYAT: R2 T1 membuktikan tombol aktif rail `.dk-b.on` SUDAH accent persis pra-fix karena override M3 — JANGAN ulangi asumsi; buktikan dengan computed style. |
| T3 tukar F&R ↔ Recolor | `src/components/editor/EditorRightInspector.jsx:509`: baris `flex flex-wrap gap-1.5` berisi tombol F&R (`data-testid="fr-open-selcolors"`, ikon `refresh`) lalu Recolor (`data-testid="rc-open-selcolors"`, ikon `palette`), masing-masing `flex: 1`, padding `6px 10px`, `gap: 2` (warisan R2 T3). Tukar urutan DOM-nya; handler/`data-testid`/ikon/label tidak berubah. |
| T4 gap ikon ↔ teks "Find and Replace" | Tombol yang sama `:509` — `gap: 2` (2px) antara `<Ico n="refresh" size={11}/>` dan teks. Naikkan ke gap yang terbaca (mis. 6px — implementer ukur; konsisten dengan gap ikon-teks tombol lain bila ada preseden). |
| T5 ikon Frame floating bar | `src/components/editor/EditorFloatingToolbar.jsx:13` `FrameToolGlyph` (22×22, stroke 1.8): 4 bracket sudut + rect dalam + dot tengah — terbaca seperti crop/focus. Tombol `:182-185` `data-tool="frame"`, `data-tip="veFrameTool"`. RULING controller: ganti dengan gaya **picture-frame** (rect luar + rect dalam, tanpa bracket sudut, tanpa dot) — Frame tool membuat frame/artboard container, bukan crop; bingkai persegi ganda adalah metafora frame yang paling langsung. Implementer gambar path baru mengikuti gaya stroke yang sama; reviewer sahkan keterbacaan di 22px. |
| T6 `<span class="c-inp-txt sel">` width auto | `src/components/ui/CustomTextBox.jsx:236` — span tampil saat `editing && selAll && shown`. Aturan bundle: `.c-inp-txt`, `.c-inp-txt.sel`, `.c-inp.ctr`. Selidiki kenapa width-nya fixed/tidak mengikuti isi (kemungkinan `flex: 1` / `width: 100%` dari `.c-inp-txt` atau parent flex); perbaiki di aturan yang tepat tanpa merusak mode non-`sel`. |
| T7 tab Canvas: tinggi nilai warna = tinggi warna latar | `EditorRightInspector.jsx:546+` seksi `veBg` (judul `{L.riCanvas}`): baris `flex items-center gap-2` berisi `ColorField` (swatch = "warna latar") + `ColorText` (kotak teks hex = "nilai warna"). Ukur tinggi keduanya, samakan (pilih mekanisme tanpa magic number: samakan via tinggi eksplisit yang sama / stretch / padding yang sama — implementer ukur dan putuskan, reviewer sahkan). |
| T8 Selection Colors: 3 tombol Select Same full-width | `EditorRightInspector.jsx:514-518` baris `flex flex-wrap items-center gap-1.5`: Fill (`data-testid="sel-same-fill"`, ikon `drop`), Stroke (`sel-same-stroke`, `pencil`), Tipe (`sel-same-type`, `shapes`) — saat ini TANPA `flex: 1` (warisan R2 T3). Beri `flex: 1` (isi ruang kosong, tanpa sisa) + boleh tambah padding atas-bawah. CATATAN R2 T3 M1: 3 tombol TIDAK muat 1 baris pada lebar seksi 243px (pasangan ID terkecil 309px) — jadi "memenuhi ruang kosong" = tiap baris yang terbentuk terisi penuh (flex-wrap tetap berlaku, tombol membungkus ke baris berikut bila perlu), BUKAN memaksa 1 baris dengan mengecilkan label di bawah 10px atau mengklip. |
| T9 `.c-inp` width auto + perbaiki fungsi | `src/components/ui/CustomTextBox.jsx:213` (root `role="textbox"`, `data-custom-input`) + bundle `.c-inp`, `.c-inp.dis`. DUA sub-tugas: (a) width mengikuti isi teks (intrinsik/auto, bukan fixed) — selidiki rantai flex/width yang memaksa lebar tetap; (b) FUNGSI — selidiki dulu apa yang rusak/tidak berfungsi pada `.c-inp` (kandidat: commit Enter/blur, batal Esc, paste, select-all, caret, `onClear`, mode `dis`/`editing`). Reproduksi tiap kandidat di browser asli; perbaiki HANYA yang terbukti rusak, di akar (systematic-debugging Fase 1). Bila suatu kandidat terbukti berfungsi, catat buktinya, jangan edit. |
| T10 "warna terakhir" berfungsi 100% | RIWAYAT: R2 T8 menguji 4 kandidat (a)–(d) satu per satu, 22/22 LOLOS, tanpa edit. Kandidat R2: (a) strip recent-colors `EditorRightInspector.jsx:363` (`data-testid="recent-colors"`, `applyRecentColor`, `rememberRecentColor` `VectorEditor.jsx:133`, cap 10 via `[hex, ...cur].slice(0, 10)`); (b) baris terakhir Selection colors `:514-518` + `replaceSelectionColor` `VectorEditor.jsx:8146`; (c) Recolor Mode 2 `RecolorSection.jsx:310+`; (d) warna drop-shadow efek. Kandidat BARU R3: (e) eviksi strip di batas 10 warna (seed 11 warna → tertua tereviksi, terbaru bertahan, klik tetap jalan); (f) persistensi setelah reload (recentColors di prefs localStorage); (g) klik warna terakhir menerapkan ke objek (sudah tercakup A-phase R2 — jalankan ulang). JANGAN asal edit: reproduksi dulu tiap kandidat + kandidat baru dengan langkah persis di browser asli; perbaiki HANYA kandidat yang terbukti gagal (probe RED→GREEN). Bila tidak ada yang gagal, laporkan apa adanya + bukti, tanpa edit produk. |
| T11 mode Fill: ikon 5 tombol + width 100% + flex-wrap | `src/components/editor/GradientEditorPanel.jsx:244` `GradChoice` (`../ui/SegmentedControl.jsx`) `cols={3}`, opsi `[['solid','Solid'], ['linear','Linear'], ['radial','Radial'], ['angular', L.gradAngular], ['none', L.gradNone]]` (`L.gradNone` = 'Kosong'). Tambah ikon pada SEMUA tombol (pilih dari set ikon yang ada — solid/linear/radial/angular/none; TIDAK ada path baru kecuali reviewer setuju), isi semua ruang kosong (width 100% tanpa sisa), flex-wrap pada container (JANGAN PERNAH text-wrap pada label). AWAS: `GradChoice` dipakai juga untuk gradInterp (`cols={2}`, `:417`-ish) dan Spread Method (`cols={3}`) — perubahan ikon + flex-wrap HARUS berskop ke instance mode Fill saja, jangan ubah kedua instance lain. |

## Task (BERURUTAN — satu implementer segar per task, review segar per task, fix loop maks 5 ronde; Minor TIDAK masuk fix loop, catat di ledger → final review)

### T1 — Hapus border `.fig-rail-grp`
- Netralkan `border` pada `.fig-rail-grp` di aturan dasar DAN override M3 (R2 idx 494/794 — verifikasi ulang nomornya; bila aturan bergeser, laporkan nomor baru).
- `border-radius: 0` + `box-shadow: none` warisan R2 JANGAN diubah. Tanpa `!important` baru.
- Probe RED dulu: computed `border-width`/`border-style`/`border-color` ketiga grup rail = `0px`/`none` (atau border tak ter-render); screenshot before/after. Regresi: probe R2 T1 rail hijau (radius/shadow tetap 0/none), suite hijau.

### T2 — `.ws-nav-item.on .ws-nav-ico`: background = accent persis + hapus border-color
- Step 1 (WAJIB sebelum edit): reproduksi di browser asli — buka WorkspaceHome (tempat `.ws-nav-item` dirender), ukur computed `background-color` + `border-color` `.ws-nav-item.on .ws-nav-ico` pada accent default `#0d99ff`; lalu ganti accent via tab Pengaturan ke DUA warna berbeda (mis. oranye `#ff8800` lalu hijau `#00aa55`) dan ukur lagi tiap kali. Bandingkan dengan nilai `--acc` (computed `getComputedStyle(document.documentElement).getPropertyValue('--acc')`).
- Step 2: bila TERBUKTI salah (computed ≠ `--acc`, atau border-color masih tampil), perbaiki di akar: `background: var(--acc)` persis (bukan `--acc-deep`, bukan color-mix) + hapus `border-color` (netralkan di kedua aturan `.ws-nav-item.on .ws-nav-ico` bila keduanya berperan). Bila TERBUKTI SUDAH BENAR (computed = `--acc` pada ketiga accent + tanpa border-color), TUTUP task dengan laporan bukti lengkap + TANPA edit produk — controller yang memutuskan langkah berikut bersama user.
- Jangan sentuh `.dk-b.on` / `.tool-btn.on` / `.cp-act-btn.on` / `.fig-rail-grp`.
- Probe + screenshot before/after (bila ada edit) atau bukti pengukuran 3 accent (bila tanpa edit). Regresi: suite + probe R2 T1 hijau.

### T3 — Tukar posisi tombol Find and Replace ↔ Recolor
- Tukar urutan DOM kedua tombol di baris `:509` (Recolor dulu, F&R sesudah). `data-testid`, `data-tip`, ikon, label, handler, `flex: 1`, padding `6px 10px` tidak berubah.
- Probe RED dulu: urutan DOM + posisi X Recolor < posisi X F&R; screenshot before/after. Regresi: klik keduanya tetap membuka seksi masing-masing (F&R + Recolor), suite hijau.

### T4 — Gap ikon ↔ teks tombol Find and Replace
- Naikkan `gap` tombol F&R (`fr-open-selcolors`) dari 2px ke nilai yang terbaca (ukur; konsisten dengan preseden gap ikon-teks di tombol seksi yang sama bila ada).
- JANGAN ubah urutan T3, label, ikon, handler. Probe: ukur jarak horizontal tepi kanan ikon → tepi kiri teks (bounding box) sebelum/sesudah; screenshot before/after (close-up). Regresi: probe T3 hijau.

### T5 — Ikon Frame floating bar jadi frame/bingkai yang relevan
- Ganti `FrameToolGlyph` (`EditorFloatingToolbar.jsx:13`) dengan gaya picture-frame (rect luar + rect dalam, tanpa bracket sudut, tanpa dot) mengikuti stroke 1.8 / viewBox 24 yang sama; dokumentasikan alasan pilihan (ruling controller di atas) + path di laporan.
- `data-tool="frame"`, `data-tip="veFrameTool"`, `aria-label`, handler klik, dan tombol lain di bar tidak berubah.
- Probe + screenshot close-up before/after: ikon terbaca sebagai frame/bingkai pada 22px (controller LIHAT langsung); klik Frame tetap mengaktifkan tool frame. Regresi: probe R2 T9 snap hijau (ikon snap tak tersentuh).

### T6 — `.c-inp-txt.sel`: width mengikuti isi teks
- Selidiki rantai layout yang memaksa width tetap (aturan `.c-inp-txt` / `.c-inp-txt.sel` / parent `.c-inp` flex); ubah agar width span intrinsik/auto mengikuti isi teks (mis. `width: auto` + `flex: 0 0 auto` / `display: inline-block` — implementer pilih mekanisme struktural, bukan magic number).
- Perilaku edit (select-all saat editing, caret, commit) tidak berubah. Uji pada pemakaian nyata (kotak hex ColorText + field lain yang memakai CustomTextBox) dengan teks pendek/panjang.
- Probe RED dulu: ukur `offsetWidth` span vs `scrollWidth`/lebar teks untuk 2 panjang teks berbeda (pendek + panjang) — sebelum fix lebar sama untuk keduanya; sesudah fix lebar mengikuti isi. Screenshot before/after. Regresi: suite + probe yang menyentuh ColorText hijau.

### T7 — Tab Canvas: tinggi nilai warna = tinggi warna latar
- Di seksi `veBg` (`EditorRightInspector.jsx:546+`): ukur tinggi render `ColorField` (swatch) vs `ColorText` (kotak hex) dalam kondisi mode solid maupun transparent; samakan tinggi keduanya (mekanisme tanpa magic number — implementer ukur dan putuskan, mis. samakan `height`/`min-height`/`align-items: stretch` + padding yang sama; reviewer sahkan).
- Jangan ubah logika `setBg` (transparent/solid), nilai warna, atau commit. Probe RED dulu (selisih tinggi > 0 sebelum, = 0 ±1px sesudah, kedua mode); screenshot before/after. Regresi: suite hijau.

### T8 — Selection Colors: 3 tombol Select Same memenuhi ruang kosong
- Beri `flex: 1` pada ketiga tombol Select Same (`sel-same-fill` / `sel-same-stroke` / `sel-same-type`, `:514-518`) + boleh tambah padding atas-bawah (mis. `8px 10px` — implementer ukur agar sejajar tombol F&R/Recolor T3/T4).
- Aturan main: tiap baris flex yang terbentuk terisi penuh (lebar total tombol = lebar seksi ±1px, tanpa sisa); flex-wrap tetap berlaku — tombol BOLEH membungkus ke baris berikut (preseden R2 T3 M1: 3 tombol tidak muat 1 baris pada 243px). JANGAN perkecil label di bawah 10px, JANGAN klip, JANGAN text-wrap label (bungkus di level flex).
- Probe RED dulu: ukur lebar tiap baris tombol vs lebar seksi (ID + EN bila sempat — minimal ID); screenshot before/after. Regresi: probe T3 hijau (urutan F&R/Recolor + klik tetap jalan), suite hijau.

### T9 — `.c-inp`: width mengikuti isi teks + perbaiki fungsinya
- Step 1 (WAJIB sebelum edit): selidiki + reproduksi di browser asli — (a) rantai layout width `.c-inp` (aturan bundle + parent flex di tiap pemakaian: ColorText, hex popover `.fld.hexf`, TransformField, dsb.); (b) FUNGSI: uji tiap perilaku `CustomTextBox` — ketik + Enter commit, blur commit, Esc batal, paste, Ctrl+A select-all, klik ganda, mode `dis`, `onClear` (bila ada pemakaian). Catat mana yang gagal + hipotesis tunggal per kegagalan (systematic-debugging Fase 1).
- Step 2: perbaiki di AKAR hanya yang terbukti gagal — (a) width intrinsik/auto mengikuti isi teks (struktural, tanpa magic number); (b) fungsi yang rusak. JANGAN ubah perilaku yang terbukti benar. Perhatikan interaksi dengan T6 (`.c-inp-txt.sel` sudah auto-width — T9 JANGAN merusaknya; probe T6 hijau sesudah T9).
- Probe RED dulu per sub-bukti (width: 2 panjang teks; fungsi: skenario yang gagal); screenshot before/after; regresi suite + probe T6 hijau + probe yang menyentuh ColorText/hex hijau.

### T10 — Investigasi + perbaiki "warna terakhir" agar berfungsi 100%
- Step 1 (WAJIB sebelum edit): jalankan ulang probe R2 T8 (`probes/probe-r2-t8-last-color.cjs`, 22 skenario, port via env `R2_T8_URL`) pada build Ronde 3 + probe BARU untuk kandidat baru: (e) eviksi batas 10 — seed 11 warna recent (via prefs + via pemakaian nyata bila memungkinkan), verifikasi tertua tereviksi + terbaru bertahan + klik warna terakhir tetap menerapkan; (f) persistensi — reload halaman, strip recent-colors tetap menampilkan warna terakhir; (g) sudah tercakup fase A R2 (klik recent menerapkan fill) — laporkan ulang angkanya.
- Step 2: perbaiki AKAR dari SATU kandidat yang terbukti gagal (bila lebih dari satu, laporkan semuanya; bila TIDAK ADA yang gagal, TUTUP task dengan laporan bukti lengkap + TANPA edit spekulatif — controller yang memutuskan langkah berikut bersama user).
- Regresi: suite + probe T3/T8 hijau (Selection Colors tak rusak oleh fix, bila ada).

### T11 — Mode Fill: ikon 5 tombol + width 100% + flex-wrap
- Di `GradientEditorPanel.jsx:244` (`GradChoice` mode Fill): tambah ikon pada SEMUA tombol — Solid, Linear, Radial, Angular, Kosong (`none`) — dari set ikon yang ada (pilih yang paling terbaca per mode; TIDAK ada path baru kecuali reviewer setuju); dokumentasikan pilihan ikon per tombol di laporan.
- Isi semua ruang kosong: tombol mengisi lebar container (width 100% tanpa sisa, mis. via `flex: 1` per tombol + `flex-wrap` pada container `GradChoice` instance ini); JANGAN PERNAH text-wrap pada label (bungkus di level flex, bukan teks).
- SKOP: hanya instance mode Fill — `GradChoice` gradInterp + Spread Method JANGAN berubah (bila `GradChoice`/`SegmentedControl.jsx` perlu diubah, buat varian/prop baru khusus mode Fill, jangan ubah perilaku default komponen bersama).
- Probe RED dulu: kelima tombol berikon (path `d` diasersi), lebar baris = lebar container (±1px, tanpa sisa), tidak ada overflow/clip, label 1 baris; screenshot before/after. Regresi: mode Fill ganti Solid/Linear/Radial/Angular/Kosong tetap jalan (preview + commit), suite hijau.

### T12 — Verifikasi akhir + ZIP final
- `npm test` (277 + tes baru, 0 fail) + `npm run build:web` (exit 0, 0 warning) +
  seluruh probe baru T1–T11 hijau + regresi (probe R2 T1 rail, T3 selsame, T8
  last-color) hijau, 0 pageerror.
- Smoke 6/6 dari hasil EKSTRAK ZIP (bukan dari working copy) — tambah 1–2 cek fix
  Ronde 3 di smoke (saran final review R2 M1: mis. cek `.fig-rail-grp` border 0 +
  Select Same full-width dari ZIP yang diekstrak).
- Rebuild ZIP dengan aturan inklusi yang sama seperti ZIP masukan (bandingkan
  daftar entri: delta HANYA file yang diubah/ditambah + `.bak-r3tN` TIDAK ikut);
  ZIP baru `~/workspace/your_files/Geovanta-Round3-UI-Fixes.zip` (JANGAN timpa ZIP
  Ronde 2); catat SHA256 + jumlah entri + ukuran; screenshot after tiap task
  dilampirkan.

## Global constraints (mengikat semua task)

- TDD: probe RED dulu (gagal pada asersi yang dituju), GREEN sesudah. Backup
  `.bak-r3tN` per file SEBELUM edit pertama (sufiks R3 agar tidak bentrok dengan
  `.bak-t1..t9` Ronde 2 yang masih ada di working copy). Diff minimal; tanpa
  `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah
  label/i18n; tanpa text-wrap (flex-wrap sebagai ganti).
- Probe berjalan melawan hasil BUILD (`npm run build:web` dulu, lalu sajikan
  `web/` via server statis di port segar per implementer — JANGAN mengandalkan
  port sisa ronde lalu; port tiap probe via env `R3_T<N>_URL`).
- Setiap implementer: probe baru `probes/probe-r3-t<N>-<slug>.cjs` + screenshot
  before/after `probes/shots/r3-t<N>-<slug>-before.png` /
  `r3-t<N>-<slug>-after.png`. Screenshot before WAJIB diambil dari state
  pra-fix (jangan tulis ulang file before sesudah fix — pelajaran R2 T10 M3).
- Hanya controller yang mengedit ledger
  (`docs/superpowers/plans/2026-11-15-round3-ui-fixes-progress.md`).
  Artefak per task: `docs/superpowers/plans/sdd-2026-11-15-round3/task-N-brief.md`,
  `task-N-report.md`, `task-N-review-package.md`.
- Review segar per task (spec + kualitas + baca diff + jalankan probe sendiri
  bila memungkinkan); verdict APPROVED / With fixes. Fix loop maks 5 ronde.
- Sesudah T12: final review whole-branch (seperti ronde lalu) → fix wave bila
  ada temuan Important/Critical → scoped re-review → ZIP diserahkan ke parent.
- Kejujuran aritmetika: hitung ulang semua total dari addend-nya sebelum
  dilaporkan (pelajaran ronde lalu: total probe pernah salah karena memakai
  ulang angka unit test).
