# Task 5 Review: Probe end-to-end modal + regresi probe lama + fix wave F1/F2

**Verdict: APPROVED**

**Plan:** Iconify Pindah ke Modal Popup (`sdd-2026-11-15-iconify-modal`)
**Tanggal review:** 2026-11-15
**Reviewer:** subagent reviewer segar (tidak mengubah file produk/probe apa pun)
**Bahan yang dinilai:** `task-5-brief.md`, `task-5-report.md` (DONE_WITH_CONCERNS),
`task-5-fix-report.md` (DONE), `task-5-review-package.md` (4 diff),
`progress.md` (Ruling R3, R4), plan `2026-11-15-iconify-modal.md`
(Task 5 + Global Constraints), spec `2026-11-15-iconify-modal-design.md`,
plus spot-check file aktual dan run verifikasi independen (lihat §7).

**Ringkasan verdict:** Task 5 memenuhi brief + R3, dan fix wave F1/F2 memenuhi
R4 tepat seperti yang dirumuskan. Semua skenario baru M10–M16 benar-benar
menguji yang diminta; penyimpangan dari brief Step 3 terbukti terpaksa oleh
mount modal dan masing-masing legitimate; aritmetika F1 dan semantik F2
benar; tidak ada asersi yang dipalsukan; semua angka hasil terhitung ulang
dan cocok. **0 Critical, 0 Important, 2 Minor** (dicatat untuk final review,
tidak masuk fix loop).

## 1. Temuan

### Critical — tidak ada

### Important — tidak ada

### Minor

**Minor 1 — M16: margin waktu tipis dan pengukuran mencakup overhead harness**
(`probes/probe-iconify-modal.cjs:310-316`)

- Bukti: M16 mengukur `Date.now()` sebelum `click()` X sampai
  `waitForFunction(count==0)` dengan timeout 190 ms, lalu mensyaratkan
  `< 200 ms`. Hasil ukur: 102 ms (run 1), 92 ms (run 2), 148 ms (run final
  implementer), **119 ms (run independen reviewer)**. Jitter antar-run
  ~56 ms (92→148), sementara margin run terburuk ke batas 200 ms hanya
  52 ms.
- Dampak: di mesin yang lebih lambat / terbebani, M16 bisa FAIL sporadis
  padahal produk berperilaku benar — yang diukur bukan waktu unmount
  murni, melainkan latensi klik-ke-hilang termasuk dispatch klik
  Playwright + render React. Timeout 190 ms juga membuat syarat `< 200`
  efektif menjadi `< 190` (nilai 190–199 ms tidak mungkin lolos).
- Yang harus diperbaiki (final review, bukan fix loop): dokumentasikan di
  komentar M16 bahwa yang diukur adalah latensi klik-ke-hilang termasuk
  overhead harness, bukan waktu unmount panel semata; atau ukur dari
  timestamp yang lebih presisi (mis. catat waktu saat event klik
  didispatch). Tidak ada perubahan produk yang dibutuhkan — panel
  memang `return null` seketika saat `open=false`.

**Minor 2 — `aria-pressed=false` sesudah modal tertutup tidak lagi diuji
di mana pun** (`probes/probe-iconify.cjs:247`, `probes/probe-iconify-modal.cjs:320`)

- Bukti: P2b lama ("tool button aria-pressed=false after toggle-close")
  dihapus bersama P2, tanpa pengganti. P3 (probe lama, baris 247) dan
  M2 (probe modal, baris 320) hanya menegaskan panel/modal hilang
  (`visible=false` / `modalGone=true`), tidak pernah memeriksa
  `aria-pressed` tombol Ikon sesudah tutup. M10 hanya menegaskan
  `aria-pressed=true` saat modal terbuka.
- Dampak: bila suatu regresi membuat `tool` tertahan `'iconify'`
  sesudah X/Esc/backdrop (panel unmount tapi tombol tetap aktif),
  kedua probe tetap hijau. Risiko praktis rendah — `onIconifyClose`
  adalah `setTool('select')` (`VectorEditor.jsx:204`) dan regresi
  semacam itu kemungkinan besar menggagalkan `openPanel()` di skenario
  berikutnya — tapi cakupan yang dulu ada (P2b) hilang tanpa pengganti
  langsung.
- Yang harus diperbaiki (final review, bukan fix loop): tambah satu
  asersi `aria-pressed=false` pada tombol Ikon sesudah tutup, di P3
  atau di M2.

**Dibawa dari review sebelumnya (bukan temuan baru):** M5 tetap rapuh
terhadap race timing — handler outside-click dropdown jalan sebelum
handler backdrop, tapi React belum re-render sehingga `.flt` masih
ditemukan guard Q4 (sudah dicatat reviewer Task 3 sebagai Minor M2 dan
diakui jujur di `task-5-report.md` §5). Task 5 tidak mengubah guard Q4
dan tidak mengklaim M5 sebagai bukti guard bebas-race. Tidak ada
tindakan baru.

## 2. Penilaian per poin

### 2.1 Skenario baru M10–M16 (spec compliance)

Semua lolos pada run independen reviewer (modal 19/19, lihat §7).

- **M10** — menguji tepat yang diminta brief/R4: blur fokus dulu
  (supaya satu-satunya penghalang ganti tool adalah guard `.ov`,
  bukan fokus di input), tekan `v`, tunggu 500 ms, `ic-modal` masih
  visible + `aria-pressed` tombol Ikon masih `true`. Guard yang
  diuji terkonfirmasi ada di kode: `VectorEditor.jsx:7587`
  (`if (document.querySelector('.ov, [role="dialog"]')) return;`
  di handler keyboard global, sebelum cabang tool). LOLOS.
- **M11** — menguji tepat yang diminta: kategori diambil runtime dari
  `/collections` hidup (kategori milik `mdi`, saat ini `"Material"`,
  6 koleksi), bukan hardcode label; opsi dropdown koleksi harus
  persis `["Semua koleksi", <6 nama>]` (set-equality + hitungan
  `length === catNames.length + 1`); dropdown ditutup dulu (Esc +
  fallback klik toggle, `fltClosed` ikut diasersi); ikon pertama grid
  harus dari prefix dalam kategori (`ic-icon-material-symbols:123`).
  Ini membuktikan Task 2 deferred (a). LOLOS. Catatan kecil (bukan
  temuan): bila dua koleksi dalam satu kategori berbagi nama display
  yang sama, cek `includes` + hitungan tetap bisa lolos — tidak
  terjadi di data hidup (6 nama berbeda) dan tidak memengaruhi verdict.
- **M11b** — menguji tepat Task 2 deferred (c): `<img>` pertama grid
  `naturalWidth > 0` DAN lebar tampil 40 px (toleransi ±0,5 px),
  plus gaya terkomputasi tombol/img dicatat sebagai bukti. Sebelum
  fix: `displayed=38x38` (FAIL jujur, 2/2 run); sesudah fix:
  `displayed=40x40` (PASS; terkonfirmasi run independen reviewer).
  LOLOS.
- **M12** — menguji tepat yang diminta: semua hasil dari koleksi
  dalam kategori (`prefixes ⊆ kategori`, `shown >= 1`), `ic-count`
  = jumlah terfilter tampil, dan `< total API`. Sebelum fix:
  `shown=14, icCount=18, apiTotal=32` (FAIL jujur); sesudah fix:
  `shown=14, icCount=14, countReached=true` (PASS; terkonfirmasi
  run independen reviewer). Lihat §2.4 soal try/catch. LOLOS.
- **M13/PERR** — 0 pageerror selama seluruh probe modal; check
  `PERR` di akhir (konvensi Task 3–4, M13 = PERR, bukan check
  ganda). `[]` di semua run. LOLOS.
- **M14 (R3a)** — menguji tepat wrap `% 10`: sesi modal baru
  (tutup + buka lagi supaya penghitung reset), 11 sisipan `mdi:home`,
  asersi bbox ke-11 == bbox ke-1 (counter 10 → `(10 % 10) * 24 = +0`).
  Bukti penguat dicatat: bbox ke-7 = +144 (counter 6), ke-10 = +216
  (counter 9), ke-11 = +0 eksak. LOLOS.
- **M15 (R3b)** — menutup celah reviewer Task 3 (M1 lolos sekalipun
  mount inspector lama tertinggal): hitung `ic-panel` di seluruh
  dokumen saat modal terbuka — `panels=1 inModal=1 inSidebar=0
  outsideModal=0`. LOLOS.
- **M16 (R3c)** — mengukur langsung yang diminta R3: dari klik X
  sampai `ic-panel` count 0 harus < 200 ms (batas animasi keluar
  `.hp`). Panel memang `return null` seketika saat `open=false`
  (`IconifyPanel.jsx:348`), shell-nya yang fade 200 ms — M16
  membedakan keduanya, RF4 tinggal sebagai proksi. LOLOS di 4/4
  run yang tercatat (92/102/148/119 ms); kerapuhan margin dicatat
  sebagai Minor 1.

### 2.2 Penyimpangan dari brief Step 3

Brief Step 3 hanya memandatkan hapus P6 + T8-4. Yang dilakukan
tambahan: hapus P2/P2b + adaptasi setup P3/T6-2/T6-4/T6-6/T6-7.
**Semuanya legitimate**, masing-masing probe-only, asersi lama tidak
diubah, alasan tertulis di header + di tempatnya, dan dibuktikan run:

- **P2/P2b dihapus — legitimate.** Akarnya satu dan terbukti dari
  kode, bukan hanya dari run: cabang toggle-close
  `setToolToggle` (`VectorEditor.jsx:198-200`,
  `k === 'iconify' && prev === 'iconify' ? 'select' : k`) hanya
  bisa tercapai saat `tool === 'iconify'`, dan `tool === 'iconify'`
  ⟺ modal terbuka (mount `VectorEditor.jsx:9016`,
  `<IconifyModal open={tool === 'iconify'} …/>`). Saat modal
  terbuka, klik mouse diblokir overlay `.ov` (run pertama abort
  di P2: `<div class="ov in"> intercepts pointer events`) dan
  shortcut diblokir guard `.ov` (`VectorEditor.jsx:7587`). Ini
  persis design §6.2 + keputusan user Q2, dan Global Constraints
  plan ("Tutup modal hanya lewat X/Esc/backdrop … jangan diubah").
  Satu-satunya cara menguji P2 adalah klik sintetis JS menembus
  overlay — itu memalsukan perilaku user, dan implementer benar
  menolaknya. Perilaku pengganti dicakup M10; jalur tutup yang
  tersisa dicakup P3/P4 + M2/M3/M4. Klaim "cabang `setToolToggle`
  kini praktis tak terjangkau selama modal terbuka" **benar**
  (lebih tepat: tak terjangkau selama modal terbuka; saat modal
  tertutup `tool` sudah `'select'` via `onIconifyClose`, jadi
  cabang itu mati total di era modal — observasi untuk controller,
  bukan perubahan Task 5).
- **P3 (setup)** — tanpa `openPanel()` dulu karena panel sudah
  terbuka dari P1; asersi X menutup tidak berubah. Legitimate.
- **T6-2 (setup)** — tutup modal dulu (X) baru Ctrl+Z, plus tunggu
  `.ov` benar-benar hilang (200 ms `usePresence`) sebelum Ctrl+Z;
  asersi tidak berubah. Jebakan ini terbukti oleh run kedua
  (abort 60 dtk di `waitForCount(0)`). Legitimate.
- **T6-4 (setup)** — buka ulang + cari `"home"` lagi karena remount
  mereset query; asersi T6-4a–g tidak berubah. Legitimate.
- **T6-6 (setup)** — tutup + buka ulang modal sebelum sisip karena
  sisipan T6-5 memajukan penghitung cascade ke 2 sehingga T6-6e
  gagal +48 (run ketiga); itu perilaku cascade yang benar, bukan
  bug, dan sesi di-reset supaya asersi tengah-viewport tetap
  bermakna. Perilaku cascade sesi-lanjut sendiri dicakup M6/M8/M14
  di probe modal. Legitimate.
- **T6-7 (setup)** — tutup modal dulu (X + tunggu `.ov` hilang)
  baru Ctrl+A + input Stroke sidebar; asersi T6-7a–c tidak berubah.
  Legitimate.
- **T8-4 dihapus — sesuai brief, dengan alasan tertulis** (hanya
  bermakna bila panel di sidebar; sejak Task 3 panel di modal
  portal `document.body`). Blok buka/tutup FR/RC ikut dihapus
  dengan benar — FR/RC tidak pernah dibuka, jadi baseline Task 6
  tetap terjaga; T8-1 yang mengasumsikan panel terbuka tetap jalan
  karena panel dibiarkan terbuka dari P5. **Tidak ada perilaku yang
  dulu diuji kini hilang tanpa pengganti**, kecuali satu celah kecil
  yang dicatat sebagai Minor 2 (`aria-pressed=false` pasca-tutup).

### 2.3 Fix wave F1/F2 terhadap R4

Diff produk vs `.bak-modal-t5fix` diverifikasi langsung dengan
`diff`: tepat 2 baris, sesuai R4 kata demi kata.

- **F1 — `padding: 2` → `1` di `thumbButton`
  (`IconifyPanel.jsx:373`). Aritmetika benar:** tombol 44 px,
  `box-sizing: border-box` (preflight Tailwind, terukur),
  border 1 px + padding 1 px → content box
  44 − 2×1 (border) − 2×1 (padding) = **40 px = `THUMB_PX`**
  (`IconifyPanel.jsx:69`). Terukur sesudah fix (run independen
  reviewer): `btnBox=44 boxSizing=border-box border=1px
  padding=1px imgMaxWidth=100%`, `displayed=40x40`. **Tidak ada
  efek samping ke tombol lain:** `thumbButton` hanya dipakai
  grid telusur/cari; tombol "Muat lagi" dan recent memakai
  `padding: '2px 6px'` inline yang tidak disentuh; ukuran tombol
  tetap 44 px, `THUMB_PX` tetap 40, tanpa aturan CSS baru (tripwire
  CSS tidak tersentuh).
- **F2 — `ic-count` cabang kategori-aktif `searchResults.length` →
  `renderableSearch.length` (`IconifyPanel.jsx:376`). Semantik
  benar:** `renderableSearch` adalah `searchResults` yang
  difilter ke `sets[r.prefix]` yang ada (`IconifyPanel.jsx:350-352`)
  — ikon yang set-nya gagal dimuat memang tidak tampil di grid,
  jadi count kini sama dengan grid **by construction** (keduanya
  berasal dari array yang sama). Ini sesuai komentar kontrak panel
  sendiri ("`ic-count` = jumlah ikon terfilter yang dimuat",
  `IconifyPanel.jsx:29` + baris 286–288). Edge case yang diperiksa:
  - *Set masih loading:* grid dan count sama-sama turun dari
    `renderableSearch`, jadi keduanya konsisten di setiap instant;
    saat `searching=true` panel menampilkan loading, bukan count.
  - *Tombol "Muat lagi":* kondisi (`!searchExhausted` saat
    kategori aktif) dan `handleLoadMoreSearch` tidak disentuh;
    count tumbuh bersama hasil yang termuat. Tidak ada regresi
    logika "Muat lagi".
  - *Cabang tanpa kategori:* `searchTotal` tetap tak tersentuh,
    sesuai R4 (semantik pra-ada dipertahankan).
  - *`MAX_SET_BYTES` tetap 10 MB*
    (`iconifyClient.jsx:32,186`): 4 ikon `material-symbols-light`
    tetap tidak tampil — yang diperbaiki adalah kejujuran klaim
    count-nya (14, bukan 18), bukan muatan set-nya, sesuai R4.
    Tidak ada catatan "n ikon tidak dapat dimuat" (perluasan scope
    yang ditolak R4).
  - *Konsistensi internal:* catatan lisensi (baris 365–366) sudah
    memakai `renderableSearch` — F2 menyelaraskan count dengan
    bagian panel yang sudah benar.
- **Guard tes baru benar-benar mem-pin perilaku baru:**
  `tests/iconify-panel.test.cjs` — `assert.match` untuk
  `padding: 1` pada tombol 44 px + `doesNotMatch` bentuk lama
  (`padding: 2`); `assert.match` untuk
  `selectedCategory ? renderableSearch.length : searchTotal` +
  `doesNotMatch` bentuk lama (`searchResults.length`). Bila salah
  satu baris produk di-revert, pola `match` tidak ditemukan dan
  tes MERAH (dinilai dari inspeksi pola — revert tidak dieksekusi
  karena reviewer dilarang mengubah file; lihat §8). Komentar
  header (b) diperbarui secara akurat. `npm test` 312/312
  terkonfirmasi oleh run independen reviewer.

### 2.4 Kualitas probe

- **Tidak ada asersi yang dipalsukan/dilunakkan.**
  - *M12 try/catch:* `waitForFunction` kesetaraan grid==ic-count
    (30 dtk) dibungkus try/catch supaya probe tidak abort dan
    M14/PERR tetap jalan — tetapi check final tetap menegaskan
    `countNum === gridIds.length` (baris 563) beserta
    `allInCat` dan `countNum < apiTotal`. Bila kesetaraan tidak
    pernah tercapai, M12 tetap FAIL dengan angka sebenarnya
    (`countReached=false` ikut tercatat). Ini penanganan
    kegagalan yang jujur, bukan pelunakan. Sebelum fix, M12
    memang FAIL (`countReached=false`); sesudah fix, PASS
    (`countReached=true`).
  - *M11b/M12 yang gagal tidak dipilihkan kategori lain* yang
    set-nya kecil — kategori Material adalah pilihan natural dan
    kegagalannya dilaporkan sebagai temuan produk, bukan
    dihindari.
- **Kerapuhan timing:** M5 rapuh (diketahui, dibawa dari Task 3 —
  lihat §1). M16 margin tipis (Minor 1). Selain itu tidak ada
  timing rapuh baru: M10 (tunggu 500 ms lalu baca state stabil),
  M11 (tunggu selector `.flt` + grid visible dengan timeout
  10–30 dtk), M12 (polling 30 dtk + baca angka sebenarnya),
  M14 (perbandingan bbox eksak, bukan timing) semuanya
  berbasis kondisi, bukan sleep buta.
- **Angka hasil — hitungan ulang dari addends (bukan reuse angka
  laporan):** lihat §3. Semua cocok.

### 2.5 Global constraints plan

- Tanpa perluasan scope produk di luar R4: diff produk tepat
  2 baris F1/F2; tidak ada file produk lain berubah
  (`find -newermt` di working copy hanya menunjukkan 4 file
  Task 5/fix + laporan + screenshot probe; `VectorEditor.jsx`
  yang terdaftar berasal dari Task 4 beserta `.bak-modal-t4`-nya,
  bukan Task 5).
- Tanpa dependensi baru: `package.json` tidak disentuh; tanpa
  aturan CSS baru (tripwire `tailwindOfflineBundle.jsx` tidak
  disentuh); tanpa data ikon di-bundle.
- Tanpa file di luar working copy yang diubah: file diagnostik
  hanya di `/tmp` (bukan deliverable — diabaikan sesuai instruksi).
  Screenshot baru di `probes/shots/` adalah output probe biasa.
- Guard `.ov` di handler keyboard global tidak diubah
  (Global Constraints: "jangan diubah") — diverifikasi
  `VectorEditor.jsx:7587` masih early-return.

## 3. Hitungan ulang jumlah skenario

Dihitung dari `check(` di file aktual (bukan dari angka laporan):

| Probe / suite | Hitungan ulang | Hasil laporan | Cocok? |
|---|---|---|---|
| `probe-iconify-modal.cjs` | 20 pemanggilan `check(` di sumber; 2× `PERR` (satu di cabang gagal-M1, hanya satu yang jalan per run) → **19 per run**: M1, M15, M16, M2, M3, M4, M5, M5b, RF4, M6, M7, M8, M9, M10, M11, M11b, M12, M14, PERR (M13 = PERR) | 19/19 | Ya |
| `probe-iconify.cjs` | 50 pemanggilan `check(` di sumber; 2 di cabang gagal-saja (P7 baris 214 di cabang `toolCount !== 1`; `T6-5` baris 592 di cabang discovery-gagal) → **48 per run**; backup 54 pemanggilan → 52 per run; 52 − P2 − P2b − P6 − T8-4 = **48** | 48/48 | Ya |
| `probe-iconify-thumb.cjs` | 3 pemanggilan: THUMB-1, THUMB-2, THUMB-3 | 3/3 | Ya |
| `probe-iconify-offline.cjs` | 14 pemanggilan: T7-1a/b/c, T7-2a/b, T7-3setup, T7-3a/b/c, T7-4a/b, T8-5a/b, E1 | 14/14 | Ya |
| `npm test` | 312 tes, 0 gagal (run independen reviewer, durasi ±24 dtk) | 312/312 | Ya |

Verifikasi silang isi log §8.2 laporan: 48 baris PASS tercacah
satu per satu (7 P + 8 T8 + T6-0 + 8 T6-1 + T6-2 + 7 T6-4 +
4 T6-5 + 6 T6-6 + 3 T6-7 + 2 T6-8 + P7 = 48). Log §8.1 modal:
17 PASS + 2 FAIL = 19 baris (pra-fix); log fix: 19/19.

## 4. Observasi (bukan temuan — untuk final review, tanpa tindakan)

1. **Transien empty-state saat set cari masih dimuat (inferensi dari
   pembacaan kode, belum terverifikasi live):** bila
   `searchResults.length > 0` tetapi `renderableSearch` masih
   kosong sementara (set belum termuat), cabang
   `renderableSearch.length === 0` menampilkan `ic-error` /
   pesan empty-search. Ini perilaku pra-ada (cabang itu sudah ada
   sebelum F2; F2 tidak menyentuhnya) dan probe tidak pernah
   menangkapnya karena M12 menunggu sampai grid==count. Di luar
   scope R4; dicatat saja.
2. **Total API `"home"` tidak stabil antar-panggilan** (32 vs 48,
   dicatat kedua laporan). Sub-kondisi `icCount < apiTotal`
   lolos di kedua nilai dan bukan bagian yang diuji fix; tidak
   memengaruhi verdict.
3. **M11 memakai kategori runtime milik `mdi`.** Bila API suatu saat
   mengubah kategori `mdi`, probe beradaptasi otomatis (kategori
   dibaca hidup) — desain yang benar, bukan kerapuhan.

## 5. Yang dinilai TIDAK lolos / tidak dinilai

Tidak ada poin brief/R3/R4 yang tidak terpenuhi.

## 6. Rekomendasi

- **APPROVED** — Task 5 + fix wave F1/F2 selesai sesuai brief,
  R3, dan R4. Tidak ada fix loop.
- 2 Minor di §1 dicatat untuk final review (M16 margin waktu;
  `aria-pressed=false` pasca-tutup tanpa asersi).

## 7. Bukti verifikasi independen reviewer

Perintah nyata yang dijalankan reviewer (bukan mengulang klaim
laporan):

| Perintah / cek | Hasil |
|---|---|
| `npm test 2>&1 \| tail -8` | **312 tes, 312 pass, 0 fail** |
| `PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs` | **19/19, SEMUA LOLOS** — M11b `displayed=40x40`, M12 `shown=14 icCount=14 countReached=true`, M16 `119 ms`, PERR `[]` |
| `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs` | **48/48, SEMUA LOLOS** (T6-7a–c, T6-8a–b, P7 PASS di tail) |
| `diff` produk vs `.bak-modal-t5fix` | Tepat 2 baris (padding 373, ic-count 376) |
| `diff` tes vs `.bak-modal-t5fix` | Guard F1/F2 + komentar, sesuai paket review |
| `grep -c check(` + pencacahan ID skenario | Semua total §3 terkonfirmasi |
| Spot-check kode | `setToolToggle` (`VectorEditor.jsx:198-200`), guard `.ov` (`:7587`), `onIconifyClose` (`:204`), mount modal (`:9016`), `renderableSearch` (`IconifyPanel.jsx:350-352`), `THUMB_PX=40` (`:69`), `MAX_SET_BYTES` 10 MB (`iconifyClient.jsx:32,186`) |

## 8. Batasan jujur (apa yang tidak diverifikasi reviewer)

- **Probe thumb 3/3 dan offline 14/14 tidak dijalankan ulang**
  oleh reviewer: kedua file probe tidak disentuh Task 5/fix wave,
  dan totalnya terkonfirmasi struktural (§3) + dari log laporan.
  Klaim hijau keduanya diterima dari laporan, bukan dari run
  independen.
- **Guard tes tidak dibuktikan MERAH lewat revert yang
  dieksekusi:** reviewer dilarang mengubah file produk/probe,
  jadi RED-ness guard hanya dinilai dari inspeksi pola
  (`assert.match`/`doesNotMatch` terhadap string sumber yang
  persis) — secara logika revert membuat `match` gagal, tetapi
  tidak ada run revert yang membuktikannya.
- **Hanya headless Chromium 1440×900 light**, seperti semua task
  modal; Windows / GPU asli belum terukur (perlu re-test user).
- **Server 9041/9042 sempat mati** di antara run reviewer (curl
  200 lalu `ERR_CONNECTION_REFUSED`); reviewer menyalakan
  `python3 -m http.server 9041` sendiri untuk run probe-iconify,
  lalu mematikannya — tidak ada server yang tertinggal. Insiden
  ini lingkungan, bukan produk.
- **Stabilitas angka total API Iconify** (32 vs 48) tidak
  dijelaskan — dicatat sebagai observasi §4.2.
