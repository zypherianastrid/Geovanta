# Task 5 Report: Probe end-to-end modal + regresi probe lama

**Plan:** Iconify Pindah ke Modal Popup (`sdd-2026-11-15-iconify-modal`)
**Tanggal:** 2026-11-15
**Status:** DONE_WITH_CONCERNS — semua skenario baru M10–M16 diimplementasi dan
dijalankan; 2 temuan produk asli (M11b, M12) gagal jujur dengan akar
penyebab terbukti; probe lama 48/48 hijau sesudah adaptasi mount yang
terpaksa (lihat §3.3 — brief mengasumsikan hanya P6/T8-4 yang perlu
dihapus, asumsi itu terbukti salah oleh run pertama).
**Skill dipakai:** tidak ada skill Superpowers yang dipetakan untuk
pekerjaan probe-only ini (bukan bug-fix produk / bukan fitur baru);
aturan programmer profesional `AGENTS.md` dipakai: backup `.bak`
sebelum edit destruktif, verifikasi perintah nyata terhadap file asli,
bukti sebelum kesimpulan, jujur soal yang belum terverifikasi.

## 1. Ringkasan hasil

| Probe / suite | Hasil | Keterangan |
|---|---|---|
| `probe-iconify-modal.cjs` | **17/19** (exit 1) | M1–M10, M11, M14–M16, M5b, RF4, PERR lolos; **M11b + M12 GAGAL** (temuan produk, §4) |
| `probe-iconify.cjs` | **48/48** (exit 0) | Dulu 52 cek; −P6, −T8-4, −P2, −P2b (§3) |
| `probe-iconify-thumb.cjs` | **3/3** (exit 0) | Tidak berubah |
| `probe-iconify-offline.cjs` | **14/14** (exit 0) | Tidak berubah |
| `npm test` | **312/312** (exit 0) | Tidak berubah |

Hitungan ulang dari addend (bukan reuse angka lama): modal 19 = M1, M15,
M16, M2, M3, M4, M5, M5b, RF4, M6, M7, M8, M9, M10, M11, M11b, M12, M14,
PERR (M13 = PERR, lihat §2.1). Iconify lama 48 = 52 − P6 − T8-4 − P2 − P2b.
0 pageerror di keempat probe.

## 2. Yang diimplementasikan — `probes/probe-iconify-modal.cjs`

Hanya file probe; **nol perubahan kode produk**. Server: `web/` di 9041
(sudah jalan) + 9042 (dijalankan Task 5 untuk probe offline), `npm run
build:web` dijalankan dulu (web/ segar). Semua run memakai relay CONNECT
loopback + `--ignore-certificate-errors` dari header probe.

### 2.1 Skenario baru

- **M10** — tombol `V` (Select) saat modal terbuka TIDAK menutup modal dan
  TIDAK mengganti tool (guard `.ov`): blur fokus dulu (supaya satu-satunya
  penghalang ganti tool adalah guard itu, bukan fokus di input), tekan `v`,
  tunggu 500 ms, `ic-modal` masih visible + `aria-pressed` tombol Ikon
  masih `true`. **LOLOS.**
- **M11** — kategori memfilter dropdown koleksi + grid telusur. Kategori
  runtime = kategori milik `mdi` dari `/collections` hidup (saat probe:
  `"Material"`, 6 koleksi: `material-symbols`, `material-symbols-light`,
  `ic`, `mdi`, `mdi-light`, `line-md` — urutan = urutan `Object.entries`
  API, sama seperti `listCollections()` panel). Langkah: pilih kategori
  lewat dropdown → buka dropdown koleksi → opsi harus persis
  `["Semua koleksi", <6 nama koleksi kategori>]` (set-equality +
  hitungan) → tutup dropdown (Esc, fallback klik toggle) → ikon pertama
  grid harus dari prefix dalam kategori (`ic-icon-material-symbols:123`).
  **LOLOS.** Ini membuktikan Task 2 deferred (a) opsi kategori di dalam
  dropdown terbuka.
- **M11b** — Task 2 deferred (c), cek visual thumbnail 40 px: `<img>`
  pertama grid — `naturalWidth > 0` DAN lebar tampil 40 px. Probe juga
  mencatat gaya terkomputasi tombol + img (border/padding/box-sizing/
  max-width) sebagai bukti. **GAGAL — temuan F1 (§4.1).**
- **M12** — cari `"home"` dengan kategori aktif → semua ikon hasil dari
  koleksi dalam kategori itu, dan `ic-count` = jumlah ikon terfilter yang
  tampil (bukan total API). Tunggu sampai jumlah grid == angka `ic-count`
  (maks. 30 dtk), lalu bandingkan dengan total API hidup
  (`search?query=home&limit=1`). **GAGAL — temuan F2 (§4.2).**
  Perubahan probe saat debug: `waitForFunction` kesetaraan dibungkus
  try/catch — bila kesetaraan tidak pernah tercapai, probe mencatat M12
  GAGAL dengan angka sebenarnya dan lanjut ke M14/PERR, bukan abort
  (run pertama abort di sini dan M14 tidak sempat jalan).
- **M13** — 0 pageerror selama seluruh probe modal = check `PERR` di
  akhir (konvensi Task 3–4; bukan check ganda). **LOLOS** (`[]`).
- **M14 (Ruling R3a)** — wrap `% 10`: sesi modal BARU (tutup + buka lagi
  supaya penghitung cascade reset ke 0), sisip `mdi:home` 11x, assert
  bbox ke-11 == bbox ke-1 (counter 10 → `(10 % 10) * 24 = +0`). Info
  tambahan: bbox ke-7 (counter 6, +144) dan ke-10 (counter 9, +216).
  **LOLOS** — b11 == b1 eksak.
- **M15 (Ruling R3b)** — memperkuat M1: hitung `ic-panel` di seluruh
  dokumen saat modal terbuka — harus `panels>=1`, semua di dalam
  `ic-modal`, 0 di `.fig-right-sidebar`, 0 di luar modal. **LOLOS**
  (`panels=1 inModal=1 inSidebar=0 outsideModal=0`). Menutup celah
  reviewer Task 3 (M1 lolos sekalipun mount inspector lama tertinggal).
- **M16 (Ruling R3c)** — pin R2 yang sesungguhnya: dari klik X sampai
  `ic-panel` count 0 harus < 200 ms (batas animasi keluar `.hp`).
  Diukur `Date.now()` sebelum klik → `waitForFunction` count==0
  (timeout 190 ms). **LOLOS** — 102 ms (run 1), 92 ms (run 2), 148 ms
  (run final). RF4 tetap ada sebagai proksi lemah; M16 adalah buktinya.
  Catatan: 148 ms pada run final menunjukkan margin tidak besar —
  termasuk overhead klik Playwright; masih < 200 ms di 3/3 run.

### 2.2 Skenario lama (tidak diubah, semua lolos)

M1, M2, M3, M4, M5, M5b, RF4, M6, M7, M8, M9 — tidak ada perubahan
logika; M2 hanya disisipi pengukuran M16 sebelum `modalGone()`.
Cabang gagal-M1 diperluas: bila M1 gagal, M16/M10/M11/M11b/M12/M14 ikut
dicatat FAIL (bukan skip diam-diam).

## 3. Yang diubah — `probes/probe-iconify.cjs`

### 3.1 Dihapus sesuai brief (dengan alasan tertulis di header + tempatnya)

- **P6** — "activating the Select tool closes the panel". Alasan:
  perilaku panel sidebar lama; di design modal tool lain TIDAK boleh
  menutup modal (guard `.ov`; modal hanya tutup via X / Esc / backdrop /
  toggle tombol Ikon). Perilaku pengganti dibuktikan M10 di probe modal.
  Mempertahankan P6 = meng-assert kebalikan design baru.
- **T8-4** — "Recolor + FindReplace stay open stacked alongside Iconify".
  Alasan: hanya bermakna bila panel Iconify tinggal di sidebar kanan;
  sejak Task 3 panel tinggal di modal (portal ke `document.body`), jadi
  "berdampingan di sidebar" tidak punya arti — FR/RC dan modal hidup di
  lapisan berbeda dan tidak bisa di-stack. Dihapus dengan alasan ini,
  bukan diam-diam. Blok buka/tutup FR/RC ikut dihapus; panel dibiarkan
  TERBUKA dari P5 sehingga T8-1 (yang mengasumsikan panel terbuka)
  tetap jalan tanpa `openPanel()` ulang.

### 3.2 Dihapus/diubah DI LUAR brief — terpaksa oleh mount modal, dibuktikan run

Brief Step 3 mengasumsikan P0–P5, T6, T8 "dipertahankan apa adanya".
Asumsi itu **salah dan terbukti salah oleh run pertama Task 5**:
Tasks 3–4 tidak pernah menjalankan `probe-iconify.cjs` (hanya probe
modal), sehingga ketidakcocokan ini belum pernah ketemu. Run pertama
sesudah hapus P6/T8-4 abort di P2:

```
PROBE ERROR: locator.click: Timeout 30000ms exceeded.
  - <div class="ov in">…</div> intercepts pointer events
  at probes/probe-iconify.cjs:217 (P2: toolBtn.click())
```

Akarnya satu: sejak Task 3 panel tinggal di modal (portal + overlay
`.ov` fullscreen), **semua klik floating bar / sidebar dan semua
shortcut kanvas (termasuk Ctrl+Z / Ctrl+A) terblokir selama modal
terbuka** — handler keyboard global return dini bila ada
`.ov`/`[role="dialog"]`, dan Playwright menolak klik karena `.ov`
intercepts pointer events. Ini konsekuensi design yang sudah disetujui
user (Q2: floating bar tak bisa diklik saat modal terbuka), bukan bug
baru. Adaptasi yang dilakukan — semuanya probe-only, tiap butir
ditandai di tempatnya + di header file:

- **P2 + P2b DIHAPUS.** Toggle-close via tombol floating bar tidak
  terjangkau input user mana pun selama modal terbuka (mouse diblokir
  `.ov`; shortcut `V`/`I` diblokir guard `.ov`). Satu-satunya cara
  menguji P2 adalah klik sintetis via JS yang melewati overlay — itu
  memalsukan perilaku user, jadi tidak dipakai. Jalur tutup yang
  tersisa dicakup P3/P4 di sini + M2/M3/M4 di probe modal; guard
  ganti-tool dicakup M10. Konsekuensi dicatat: cabang
  `setToolToggle` (`iconify && prev==='iconify' → 'select'`) kini
  praktis tidak terjangkau selama modal terbuka — bukan perubahan
  Task 5, hanya observasi untuk controller.
- **P3 diubah setup-nya:** tanpa `openPanel()` dulu — panel sudah
  terbuka dari P1 (P2 yang dulu menutupnya kini dihapus); X diklik
  langsung. Asersi (X menutup) tidak berubah.
- **T6-2 diubah:** tutup modal dulu (X) baru Ctrl+Z — Ctrl+Z diblokir
  handler keyboard selama `.ov` ada. Tambahan jebakan yang ketemu di
  run kedua: panel hilang ~100 ms, tapi `.ov` bertahan 200 ms
  (`usePresence`); Ctrl+Z yang ditekan di jendela itu diabaikan
  (run kedua abort di `waitForCount(0)`, 60 dtk). Perbaikan: tunggu
  `!document.querySelector('.ov')` sebelum Ctrl+Z. Pola yang sama
  dipakai di T6-7.
- **T6-4 diubah setup-nya:** buka ulang panel + cari `"home"` lagi —
  remount panel mereset query (bukan "search box masih memegang home").
  Asersi T6-4a–g tidak berubah.
- **T6-6 diubah setup-nya:** tutup + buka ulang modal sebelum sisip —
  sisipan T6-5 memajukan penghitung cascade ke 2, sehingga sisipan
  T6-6 di sesi yang sama bergeser **+48** dan T6-6e (tengah viewport)
  gagal (run ketiga: `FAIL T6-6e actual bbox +48,+48 dari expected`,
  47/48). Itu perilaku cascade yang benar, bukan bug — jadi sesi
  di-reset supaya asersi T6-6a–f (tengah viewport) tetap bermakna
  tanpa diubah. Tunggu `.ov` hilang sebelum `openPanel()`.
- **T6-7 diubah setup-nya:** tutup modal dulu (X + tunggu `.ov`
  hilang) baru Ctrl+A + input Stroke sidebar — sidebar ada di balik
  overlay. T6-7c (klik veSelect + Ctrl+Z) kini jalan karena modal
  sudah tertutup; asersi T6-7a–c tidak berubah.

Verifikasi aritmetika: 52 cek lama − P6 − T8-4 − P2 − P2b = **48**,
dan run final 48/48. Semua adaptasi di atas adalah konsekuensi
langsung design modal yang sudah disetujui; tidak ada keputusan
produk baru yang diambil di Task 5.

### 3.3 Yang TIDAK berubah di probe lama

P0, P0b, P1, P1b, P3, P4, P5, T8-1, T8-1b, T8-2b0, T8-2a, T8-2b,
T8-3a–c, T6-0, T6-1a–h, T6-4a–g, T6-5a–d, T6-6a–f, T6-7a–c, T6-8a–b,
P7 — asersi tidak disentuh (kecuali setup yang dicatat di §3.2).

## 4. Temuan Task 5 (masuk fix loop — bukan scope Task 5 untuk memperbaiki)

Tidak ada kode produk disentuh. Kedua temuan di bawah adalah perilaku
produk yang diukur probe, dengan akar penyebab yang dilacak sampai ke
baris sumber + data hidup. Keduanya direproduksi stabil (M11b gagal
2/2 run; M12 gagal 2/2 run + 40 dtk polling diagnostik stabil).

### 4.1 F1 — M11b: thumbnail tampil 38 px, bukan 40 px

```
FAIL M11b | actual=natural=150x150 displayed=38x38 attr=40x40
  info M11b gaya tombol/img: btnBox=44 boxSizing=border-box
    border=1px solid rgba(15, 23, 42, 0.07) padding=2px imgMaxWidth=100%
```

Akar (terbukti via `getComputedStyle` di probe + skrip diagnostik
`/tmp/diag-m12.cjs`): tombol thumb 44 px `border-box`, border 1 px +
padding 2 px → content box **38 px**; `<img width=40>` kena
`max-width: 100%` (preflight Tailwind) → tampil **38×38**. Atribut
`width=40` benar, tampilan visual 38. Klaim Task 2 "thumbnail 40 px"
benar di atribut, salah di visual. Perbaikan produk (mis. tombol 46 px
atau img lepas dari max-width) di luar Task 5. Catatan: probe thumb
lama (`probe-iconify-thumb.cjs`, 3/3) hanya mengukur `naturalWidth`,
tidak pernah mengukur lebar tampil — jadi 38 px ini belum pernah
terpin sebelum M11b.

### 4.2 F2 — M12: `ic-count` (18) ≠ ikon tampil (14) saat kategori aktif

```
FAIL M12 | actual=shown=14
  prefixes=["material-symbols","ic","mdi","mdi-light","line-md"]
  icCount=18 text="18 ikon ditemukan" apiTotal=32 countReached=false
```

Sub-kondisi lain lolos: semua 14 hasil dari koleksi kategori Material
(`allInCat=true`), 18 < total API. Yang gagal hanya `icCount == shown`.

Akar (terbukti rantai penuh):

1. Cari `"home"` terfilter kategori Material = **18** ikon
   (direplikasi via curl: `search?query=home&limit=48`, total API 48,
   18 match Material: 4× material-symbols, 4× material-symbols-light,
   5× ic, 2× mdi, 1× mdi-light, 2× line-md). `ic-count` menampilkan
   `searchResults.length` = 18 — benar sebagai "jumlah terfilter".
2. Grid hanya menampilkan **14** = 18 − 4 ikon `material-symbols-light`
   (prefix itu absen total dari grid; polling diagnostik stabil 14
   selama 40 dtk, 0 pageerror, 0 request gagal, 0 HTTP ≥ 400).
3. Keempat ikon itu hilang karena set-nya tidak bisa dimuat:
   `material-symbols-light/icons.json` = **10.520.709 byte** — melebihi
   `MAX_SET_BYTES = 10 * 1024 * 1024 = 10.485.760`
   (`src/renderer/iconifyClient.jsx:32,186`) sebesar **34.949 byte**,
   jadi `loadSet` menolak → `ensureSets` mencatat `setsError` →
   `renderableSearch` (grid) mengecualikan keempat ikon itu.
4. Panel **diam-diam** menampilkan lebih sedikit ikon daripada yang
   diklaim `ic-count`: cabang error hanya tampil bila
   `renderableSearch.length === 0`. Ini bertentangan dengan komentar
   kontrak panel sendiri (`IconifyPanel.jsx`: "`ic-count` = jumlah ikon
   terfilter yang dimuat") — keempat ikon itu tidak pernah dimuat,
   tapi tetap dihitung.

Opsi perbaikan produk (untuk fix loop, bukan Task 5): naikkan batas
set / muat `material-symbols-light` secara khusus / hitung `ic-count`
dari `renderableSearch.length` / tampilkan catatan "n ikon tidak dapat
dimuat". Pilihan mana pun adalah keputusan produk.

Catatan varians: total API `"home"` terukur **48** (curl, `limit=48`)
vs **32** (probe, `limit=1`) pada panggilan berbeda — angka total API
tidak stabil antar-panggilan; sub-kondisi `icCount < apiTotal` lolos
di kedua nilai (18 < 32, 18 < 48), dan bukan bagian yang gagal.

## 5. Catatan M5 (fragility timing — dari reviewer Task 3)

M5 lolos 3/3 run Task 5, tetapi **bukan bukti guard bebas-race**:
handler outside-click dropdown jalan sebelum handler backdrop, tapi
React belum re-render sehingga `.flt` masih ditemukan guard Q4.
Guard Q4 sendiri TIDAK diubah (bentuk yang diresepkan design).
M5 dicatat apa adanya; jangan jadikan pegangan lebih dari itu.

## 6. Catatan Task 3 minor M1 (empty-shell exit fade)

Panel unmount seketika saat tutup sementara shell `.hp` fade 200 ms —
observasi level-design yang sudah diketahui, BUKAN untuk diperbaiki di
Task 5. M16 konsisten dengannya (panel diharapkan hilang seketika;
yang diukur justru kecepatan hilangnya, < 200 ms).

## 7. Self-review

- **Completeness:** brief Step 2 (M10–M13) + Ruling R3 (M14–M16) +
  cek visual 40 px (M11b) semua diimplementasi dan dijalankan;
  Step 3 (hapus P6 + T8-4 dengan alasan) dikerjakan, plus adaptasi
  mount terpaksa §3.2 yang masing-masing dibuktikan run (P2 abort →
  hapus; T6-2 abort 60 dtk → tunggu `.ov`; T6-6e FAIL +48 → reset
  sesi). Step 4 sweep + Step 5 `npm test` dijalankan, hitungan eksak
  per probe di §1/§8.
- **Kualitas/disiplin:** hanya 2 file probe berubah (diff vs backup
  di §9); nol file produk disentuh; tidak ada overbuilding (tidak ada
  skenario di luar brief + R3; M11b adalah cek yang diminta koordinator,
  bukan tambahan bebas). M12 yang gagal TIDAK dilunakkan menjadi lolos
  (mis. dengan memilih kategori lain yang set-nya kecil) — kategori
  Material adalah pilihan natural (kategori `mdi`, ikon yang dipakai
  seluruh probe) dan kegagalannya adalah temuan nyata.
- **Temuan saat kerja (diperbaiki sebelum lapor):** (1) M12 abort
  probe di `waitForFunction` 30 dtk → dibungkus try/catch supaya M14 +
  PERR tetap jalan. (2) T6-2/T6-7 Ctrl+Z/Ctrl+A diabaikan karena `.ov`
  bertahan 200 ms → tunggu `.ov` hilang. (3) T6-6e +48 → reset sesi.
  Ketiganya adalah adaptasi probe terhadap perilaku modal yang benar,
  bukan perubahan asersi.
- **Tidak terverifikasi di sini:** perilaku di Windows / GPU asli
  (hanya headless Chromium 1440×900 light, seperti semua task modal);
  stabilitas angka total API Iconify antar-panggilan (varians 32 vs 48
  dicatat, bukan dijelaskan — tidak memengaruhi hasil).

## 8. Hasil tes (output lengkap)

Perintah (serve `web/` di 9041 + 9042, `npm run build:web` dulu):

```bash
PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-thumb.cjs
OFFLINE_URL=http://127.0.0.1:9042/ node probes/probe-iconify-offline.cjs
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
npm test 2>&1 | tail -5
```

### 8.1 `probe-iconify-modal.cjs` — 17/19 (exit 1)

```
  info CONNECT relay listening on 127.0.0.1:41971
PASS M1 modal terbuka dari tombol floating bar (ic-modal visible, ic-panel di dalamnya) | actual=opened=true modalVisible=true panelInModal=1 expected=opened=true modalVisible=true panelInModal>=1
PASS M15 panel ABSEN dari sidebar + tidak ada ic-panel di luar ic-modal saat modal terbuka (Ruling R3b) | actual=panels=1 inModal=1 inSidebar=0 outsideModal=0 expected=panels>=1 inModal=panels inSidebar=0 outsideModal=0
PASS M16 saat tutup, ic-panel hilang SEGERA (<200 ms, sebelum animasi keluar selesai) (Ruling R3c) | actual=panelGoneInMs=148 panelCount=0 expected=panelGoneInMs<200 panelCount=0
PASS M2 tombol X menutup modal | actual=modalGone=true expected=modalGone=true
PASS M3 Esc menutup modal | actual=modalGone=true expected=modalGone=true
PASS M4 klik backdrop menutup modal | actual=modalGone=true expected=modalGone=true
PASS M5 klik backdrop saat .flt terbuka -> modal TETAP terbuka | actual=modalVisible=true fltBefore=1 fltAfter=0 expected=modalVisible=true fltBefore>=1
PASS M5b dropdown .flt tertutup sesudah klik backdrop + klik backdrop kedua menutup modal | actual=fltAfter=0 expected=fltAfter=0 + modal tertutup
  info fetch Iconify total saat tutup: 6
  info fetch Iconify baru selama 2,5 dtk sesudah tutup: 0
PASS RF4 tidak ada fetch Iconify baru sesudah modal tertutup (Review Focus #4) | actual=before=6 after=6 new=0 expected=new=0
  info M6 bbox1 absolut: {"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68}
  info M6 bbox1 yang diharapkan (tengah viewBox): {"x0":360,"y0":264,"x1":440,"y1":332}
  info M6 bbox2: {"x0":384,"y0":288,"x1":464,"y1":356,"w":80,"h":68}
  info M6 bbox3: {"x0":408,"y0":312,"x1":488,"y1":380,"w":80,"h":68}
PASS M6 sisip 3x ikon sama -> bbox ke-2 (+24,+24), ke-3 (+48,+48) dari bbox pertama (dok unit, tol ±2) | actual=b1={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68} b2={"x0":384,"y0":288,"x1":464,"y1":356,"w":80,"h":68} b3={"x0":408,"y0":312,"x1":488,"y1":380,"w":80,"h":68} expected=b2=b1+(24,24) b3=b1+(48,48)
PASS M7 tutup + buka lagi modal -> sisipan kembali ke tengah (offset reset, bbox = bbox1) | actual=closed=true bboxM7={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68} baseline={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68} expected=closed=true bboxM7=bbox1
PASS M8 zoom 200% -> dua sisipan berurutan bergeser (+24,+24) doc unit (Review Focus #1) | actual=zoom=2 b8a={"x0":384,"y0":288,"x1":464,"y1":356,"w":80,"h":68} b8b={"x0":408,"y0":312,"x1":488,"y1":380,"w":80,"h":68} expected=zoom=2 b8b=b8a+(24,24)
  info zoom kembali ke 100%: 1
PASS M9 sisipan gagal tidak memajukan penghitung — sukses berikutnya +72 (counter 3), bukan +96 (Review Focus #5) | actual=failToast=true countBefore=6 countAfter=6 zoomBack=1 bboxM9={"x0":432,"y0":336,"x1":512,"y1":404,"w":80,"h":68} baseline={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68} expected=failToast=true countAfter=countBefore zoomBack=1 bboxM9=baseline+(72,72)
PASS M10 tombol V saat modal terbuka TIDAK menutup modal dan TIDAK mengganti tool (guard .ov) | actual=modalVisible=true aria-pressed=true expected=modalVisible=true aria-pressed=true
  info M11 kategori: Material prefixes=["material-symbols","material-symbols-light","ic","mdi","mdi-light","line-md"]
PASS M11 kategori memfilter dropdown koleksi + grid telusur (ikon pertama dari koleksi kategori itu) | actual=kategori=Material collOptions=["Semua koleksi","Material Symbols","Material Symbols Light","Google Material Icons","Material Design Icons","Material Design Light","Material Line Icons"] expectedNames=["Material Symbols","Material Symbols Light","Google Material Icons","Material Design Icons","Material Design Light","Material Line Icons"] fltClosed=true firstGrid=ic-icon-material-symbols:123 firstPrefix=material-symbols expected=collOptions=Semua koleksi+["Material Symbols","Material Symbols Light","Google Material Icons","Material Design Icons","Material Design Light","Material Line Icons"] fltClosed=true firstPrefix∈["material-symbols","material-symbols-light","ic","mdi","mdi-light","line-md"]
  info M11b gaya tombol/img: btnBox=44 boxSizing=border-box border=1px solid rgba(15, 23, 42, 0.07) padding=2px imgMaxWidth=100%
FAIL M11b thumbnail grid ter-render visual 40 px (naturalWidth>0 + lebar tampil 40) (Task 2 deferred (c)) | actual=natural=150x150 displayed=38x38 attr=40x40 expected=natural>0 displayed=40x40
  info M12 kesetaraan grid==ic-count TIDAK tercapai dalam 30 dtk: lanjut membaca angka sebenarnya
FAIL M12 cari "home" dgn kategori aktif -> semua hasil dari koleksi kategori itu + ic-count = jml terfilter tampil (bukan total API) | actual=shown=14 prefixes=["material-symbols","ic","mdi","mdi-light","line-md"] icCount=18 text="18 ikon ditemukan" apiTotal=32 countReached=false expected=shown>=1 prefixes⊆kategori icCount=shown icCount<apiTotal
  info M14 bbox ke-7 (counter 6, +144): {"x0":504,"y0":408,"x1":584,"y1":476,"w":80,"h":68}
  info M14 bbox ke-10 (counter 9, +216): {"x0":576,"y0":480,"x1":656,"y1":548,"w":80,"h":68}
PASS M14 sisip 11x satu sesi modal -> sisipan ke-11 di offset +0 (wrap % 10, sama dgn sisipan ke-1) (Ruling R3a) | actual=b1={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68} b11={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68} expected=b11=b1
PASS PERR 0 pageerror selama probe modal (M13) | actual=[] expected=[]

PROBE-ICONIFY-MODAL: 17/19 lolos | GAGAL: M11b, M12
```

### 8.2 `probe-iconify.cjs` — 48/48 (exit 0)

```
  info egress proxy from env: yes (hatch-egress-proxy:3128, auth present — values never logged)
  info CONNECT relay listening on 127.0.0.1:38835
PASS P0 tool button [data-tip="veIconify"] exists in the floating bar | actual=count=1 expected=count=1
PASS P0b panel closed initially | actual=visible=false expected=visible=false
PASS P1 clicking the tool opens the panel | actual=visible=true expected=visible=true
PASS P1b tool button aria-pressed=true while panel is open | actual=aria-pressed=true expected=aria-pressed=true
PASS P3 panel close control (X) closes the panel | actual=visible=false expected=visible=false
PASS P4 Esc closes the panel | actual=visible=false expected=visible=false
PASS P5 opening the panel closes the open Float popover (shape picker) | actual=flt before=1 after=0 panelVisible=true expected=flt before>=1 after=0 panelVisible=true
PASS T8-1 browse grid on open shows Material Symbols icons | actual=materialSymbolsIcons=48 first=ic-icon-material-symbols:123 expected=materialSymbolsIcons>=1
PASS T8-1b browse license label shows an SPDX string (Apache-2.0/MIT), never "[object Object]" | actual=icLicense="Material Symbols — Lisensi: Apache-2.0" expected=icLicense includes Apache-2.0 or MIT, excludes "[object Object]"
PASS T8-2b0 browse mode shows no results count (ic-count absent) | actual=icCountCount=0 expected=icCountCount=0
PASS T8-2a typing "home" (debounced) shows search result mdi:home | actual=mdiHomeVisible=true expected=mdiHomeVisible=true
PASS T8-2b search mode shows the results count (browse mode has none) | actual=icCountVisible=true expected=icCountVisible=true
PASS T8-3a empty search shows the explanatory empty state naming the query | actual=visible=true text="Tidak ada ikon yang cocok dengan \"zzzqqqxxyy-noicon\". Coba kata kunci lain dalam bahasa Inggris." expected=visible=true text includes "zzzqqqxxyy-noicon" + "Coba kata kunci lain dalam bahasa Inggris"
PASS T8-3b empty search shows no icon grid | actual=icGridCount=0 expected=icGridCount=0
PASS T8-3c clearing the query returns to the browse grid and the panel closes cleanly | actual=browseGridBack=true panelVisible=false expected=browseGridBack=true panelVisible=false
  info PALETTE discovery: circle-flags (Circle Flags, license=MIT) icon=circle-flags:aa fills=["#0052b4","#496e2d","#d80027","#ff9811"]
PASS T6-0 palette icon discovered at runtime (palette:true collection, explicit fill) | actual=circle-flags:aa fills=["#0052b4","#496e2d","#d80027","#ff9811"] expected=icon with explicit fill, not active fill
PASS T6-1a mdi:home inserts exactly 1 object | actual=new=1 expected=new=1
PASS T6-1b mdi:home object is in one named group | actual=group=mdi:home expected=group='mdi:home'
PASS T6-1c mdi:home uses active Fill color | actual=fill=#0000ff expected=fill=#0000ff
PASS T6-1d mdi:home keeps stroke none | actual=stroke=none expected=stroke='none'
PASS T6-1e mdi:home carries icon metadata {name, license} | actual=icon={"name":"mdi:home","license":"Apache-2.0"} expected=icon={"name":"mdi:home","license":"Apache-2.0"}
PASS T6-1f mdi:home tight bbox = native x4 at viewport center (frame 96) | actual=bbox={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68} expected=bbox={"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68}
PASS T6-1g mdi:home is selected (Fill section visible after insert) | actual=veFill sections=2 expected=veFill sections>=1
PASS T6-1h success toast names the inserted icon | actual=toastHas(mdi:home)=true expected=toastHas(mdi:home)=true
PASS T6-2 one Ctrl+Z removes the inserted icon | actual=count=0 expected=count=0
PASS T6-4a tabler:home inserts exactly 2 objects | actual=new=2 expected=new=2
PASS T6-4b tabler:home objects share one named group | actual=groups=["tabler:home","tabler:home"] expected=groups=['tabler:home','tabler:home']
PASS T6-4c tabler:home paths use active STROKE color (not Fill) | actual=strokes=["#000073","#000073"] expected=strokes=['#000073','#000073']
PASS T6-4d tabler:home paths keep fill none (Fill color NOT applied) | actual=fills=["none","none"] expected=fills=['none','none']
PASS T6-4e tabler:home strokeWidth = active sw x frame scale (2x4=8) | actual=strokeWidths=[8,8] expected=strokeWidths=[8,8]
PASS T6-4f tabler:home carries icon metadata {name, license} | actual=icons=[{"name":"tabler:home","license":"MIT"},{"name":"tabler:home","license":"MIT"}] expected=icons=[{"name":"tabler:home","license":"MIT"} x2]
PASS T6-4g tabler:home tight bbox = native x4 at viewport center (frame 96) | actual=bbox={"x0":364,"y0":264,"x1":436,"y1":336,"w":72,"h":72} expected=bbox={"x0":364,"y0":264,"x1":436,"y1":336,"w":72,"h":72}
PASS T6-5a palette circle-flags:aa inserts >=1 object in one named group | actual=new=6 groups=["circle-flags:aa","circle-flags:aa","circle-flags:aa","circle-flags:aa","circle-flags:aa","circle-flags:aa"] expected=new>=1 groups=['circle-flags:aa' ...]
PASS T6-5b palette circle-flags:aa keeps an original fill color | actual=fills=["#eee","#0052b4","#496e2d","#d80027","#ff9811","#d80027"] original=["#0052b4","#496e2d","#d80027","#ff9811"] expected=one fill in ["#0052b4","#496e2d","#d80027","#ff9811"]
PASS T6-5c palette circle-flags:aa does NOT take the active Fill color | actual=fills=["#eee","#0052b4","#496e2d","#d80027","#ff9811","#d80027"] expected=no fill=#0000ff
PASS T6-5d palette circle-flags:aa carries icon metadata {name, license} | actual=icons=[{"name":"circle-flags:aa","license":"MIT"},{"name":"circle-flags:aa","license":"MIT"},{"name":"circle-flags:aa","license":"MIT"},{"name":"circle-flags:aa","license":"MIT"},{"name":"circle-flags:aa","license":"MIT"},{"name":"circle-flags:aa","license":"MIT"}] expected=icons=[{"name":"circle-flags:aa","license":"MIT"} ...]
PASS T6-6a tabler:arrow-bottom-circle inserts exactly 2 objects (path + circle) | actual=new=2 expected=new=2
PASS T6-6b multi-element: both leaf shapes present (node counts [4,5]) | actual=nodeCounts=[4,5] expected=nodeCounts=[4,5]
PASS T6-6c multi-element objects share one named group | actual=groups=["tabler:arrow-bottom-circle","tabler:arrow-bottom-circle"] expected=groups=['tabler:arrow-bottom-circle' x2]
PASS T6-6d multi-element: stroke-based recolor (stroke color, width 8, fill none) | actual=paint=[["none","#000073",8],["none","#000073",8]] expected=paint=[['none','#000073',8] x2]
PASS T6-6e multi-element tight bbox = native x4 at viewport center (frame 96) | actual=bbox={"x0":388,"y0":264,"x1":412,"y1":336,"w":24,"h":72} expected=bbox={"x0":388,"y0":264,"x1":412,"y1":336,"w":24,"h":72}
PASS T6-6f multi-element carries icon metadata {name, license} | actual=icons=[{"name":"tabler:arrow-bottom-circle","license":"MIT"},{"name":"tabler:arrow-bottom-circle","license":"MIT"}] expected=icons=[{"name":"tabler:arrow-bottom-circle","license":"MIT"} x2]
PASS T6-7a group recolor: tabler:home strokes become #00aa00 via panel | actual=strokes=["#00aa00","#00aa00"] expected=strokes=['#00aa00','#00aa00']
PASS T6-7b group recolor: tabler:arrow-bottom-circle strokes become #00aa00 via panel | actual=strokes=["#00aa00","#00aa00"] expected=strokes=['#00aa00','#00aa00']
PASS T6-7c undo restores tabler strokes to active Stroke color | actual=strokes=["#000073","#000073"] expected=strokes=['#000073','#000073']
PASS T6-8a JSON round-trip via loadTestDoc keeps metadata + strokeWidth 8 | actual=round-trip count=10 mdi=0 tabler=2 multi=2 pal=6 expected=metadata + strokeWidth 8 kept
PASS T6-8b real save/reload (autosave + reopen) keeps metadata + strokeWidth 8 | actual=after-reload count=10 mdi=0 tabler=2 multi=2 pal=6 expected=metadata + strokeWidth 8 kept
PASS P7 0 pageerror | actual=[] expected=[]

PROBE-ICONIFY-T8: 48/48 lolos | SEMUA LOLOS
```

### 8.3 `probe-iconify-thumb.cjs` — 3/3 (exit 0)

```
PASS THUMB-1 browse grid: semua thumbnail render (naturalWidth > 0) | actual=total=48 ok=48 broken=0 src=data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2 expected=total>=1 broken=0
PASS THUMB-2 search grid "home": semua thumbnail render (naturalWidth > 0) | actual=total=38 ok=38 broken=0 expected=total>=1 broken=0
PASS THUMB-3 0 pageerror selama probe thumbnail | actual=[] expected=[]

PROBE-ICONIFY-THUMB: 3/3 lolos | SEMUA LOLOS
```

### 8.4 `probe-iconify-offline.cjs` — 14/14 (exit 0)

```
  info egress proxy from env: yes (hatch-egress-proxy:3128, auth present — values never logged)
  info CONNECT relay listening on 127.0.0.1:45539
PASS T7-1a kedua host diblokir: panel menampilkan state offline | actual=visible=true text="Perlu internet untuk mencari ikon" expected=visible=true text="Perlu internet untuk mencari ikon"
PASS T7-1b offline: efek listCollections/loadSet/search di-gate (0 req CDN, API hanya /version) | actual=cdn=0 apiNonVersion=0 all=["https://api.iconify.design/version"] expected=cdn=0 apiNonVersion=0
PASS T7-4a offline + set belum ter-cache: baris recent tampil nama saja (tanpa <img>) | actual=visible=true imgCount=0 expected=visible=true imgCount=0
PASS T7-4b offline + set belum ter-cache: klik recent tidak crash, nol objek | actual=before=0 after=0 panelOpen=true failToast=true expected=before=0 after=0 panelOpen=true failToast=true
PASS T7-1c offline: kanvas tetap bisa diedit (gambar persegi -> 1 objek) | actual=objects=1 expected=objects=1
PASS T7-3setup online lagi: cari "home" menampilkan mdi:home (set mdi ter-cache) | actual=backOnline=true mdiVisible=true expected=backOnline=true mdiVisible=true
PASS T7-3a offline lagi sesudah cache: panel menampilkan state offline | actual=offlineVisible=true expected=offlineVisible=true
PASS T7-3b offline + set ter-cache: klik recent menyisip ulang ikon | actual=before=1 after=2 okToast=true expected=after=2 okToast=true
PASS T7-3c recent ter-persist sebagai nama penuh "prefix:nama" (bukan nama pendek) | actual=recentIcons=["mdi:home"] expected=recentIcons includes "mdi:home", semua berisi ":"
PASS T7-2a CDN-only diblokir: panel online + browse menampilkan pesan per-set | actual=offlineShown=false browseErr="Perlu internet untuk memuat set ikon \"material-symbols\"" expected=offlineShown=false browseErr="Perlu internet untuk memuat set ikon \"material-symbols\""
PASS T7-2b CDN-only diblokir: klik recent menampilkan toast per-set, nol objek | actual=perSetToast=true before=0 after=0 expected=perSetToast=true before=0 after=0
PASS T8-5a search-fetch fails: ic-error shows verbatim offline copy, panel does NOT flip to offline state | actual=icError="Perlu internet untuk mencari ikon" icOfflineShown=false expected=icError="Perlu internet untuk mencari ikon" icOfflineShown=false
PASS T8-5b after clearing the failed search the browse grid returns (panel still online) | actual=browseGridBack=true icOfflineShown=false expected=browseGridBack=true icOfflineShown=false
PASS E1 0 pageerror selama probe | actual=[] expected=[]

PROBE-ICONIFY-OFFLINE-T8: 14/14 lolos | SEMUA LOLOS
```

### 8.5 `npm test` — 312/312 (exit 0)

```
ℹ tests 312
ℹ suites 0
ℹ pass 312
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 23927.531984
```

(39 baris warning React `useLayoutEffect does nothing on the server` —
kelas warning pra-ada yang sama seperti dilaporkan Task 2; bukan
warning baru, tidak ada file Task 5 yang memakai `useLayoutEffect`.)

## 9. File yang diubah

- `probes/probe-iconify-modal.cjs` — diff vs backup: 218 baris berubah
  (header M1–M16 + M15/M16/M10/M11/M11b/M12/M14 + try/catch M12 +
  info gaya M11b + cabang gagal-M1 diperluas). Backup Step 1:
  `probes/probe-iconify-modal.cjs.bak-modal-t5`.
- `probes/probe-iconify.cjs` — diff vs backup: 134 baris berubah
  (hapus P6, T8-4, P2, P2b + adaptasi setup P3/T6-2/T6-4/T6-6/T6-7 +
  header + komentar alasan). Backup Step 1:
  `probes/probe-iconify.cjs.bak-modal-t5`.
- Laporan ini:
  `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-5-report.md`.
- Screenshot baru: `probes/shots/iconify-modal-category.png`,
  `probes/shots/iconify-modal-cascade.png` (ditulis ulang tiap run).
- **Tidak ada file lain disentuh** — nol perubahan kode produk, nol
  perubahan tes unit. File diagnostik sementara hanya di `/tmp`
  (`diag-m12.cjs`, log run, JSON `search-home-p1.json`,
  `collections.json`, `msl.json`); bukan bagian deliverable.

## 10. Isu / concern untuk controller & reviewer

1. **Dua temuan produk (F1, F2) masuk fix loop** — M11b (38 px) dan M12
   (ic-count 18 vs tampil 14) gagal dengan akar penyebab terbukti
   (§4). Keduanya di luar scope Task 5 (tanpa perubahan produk).
2. **Penyimpangan dari brief Step 3 (§3.2)** — brief mengasumsikan
   hanya P6/T8-4 yang perlu dihapus; run membuktikan P2/P2b juga harus
   dihapus dan P3/T6-2/T6-4/T6-6/T6-7 butuh adaptasi setup karena
   overlay `.ov` + cascade. Semua adaptasi didokumentasikan dengan
   alasan + bukti run; mohon konfirmasi reviewer bahwa penyimpangan
   ini diterima.
3. **M5 fragility** (§5) — lolos, bukan bukti guard bebas-race.
4. **M16 margin** — 92/102/148 ms di 3 run; lolos tapi run final
   (148 ms) relatif dekat ke batas 200 ms karena overhead klik
   Playwright ikut terukur.
5. **Cek 40 px tinggal di M11b** (`probes/probe-iconify-modal.cjs`,
   sesudah M11) — naturalWidth + lebar tampil + gaya terkomputasi
   tombol/img.
6. Server `web/` di 9042 dijalankan Task 5 (latar, untuk probe
   offline) dan dibiarkan jalan; 9041 sudah jalan sebelumnya.
