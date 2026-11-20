# Task 8 review — Ronde 2: Investigasi bug "warna terakhir tidak berfungsi"

**Verdict: With fixes** (2 Important — keduanya perbaikan probe saja, tanpa edit produk yang diantisipasi).
**Spec: ❌ sebagian** — (a), (b), (d) terpenuhi penuh; (c) hanya terpenuhi untuk kasus degenerat
(1 warna/keluarga, tanpa gray). Klaim headline laporan "TIDAK ADA satu pun kandidat
(a)–(d) yang gagal" terlalu kuat untuk (c) karena dua varian "terakhir" yang paling
relevan belum pernah diuji (lihat I-1, I-2).
**Status laporan implementer:** DONE_WITH_CONCERNS — penutupan tanpa edit itu sendiri
sesuai brief Step 2 **untuk kandidat yang diuji**; yang belum sesuai adalah kelengkapan
(c).

- Reviewer: subagent segar (tanpa dispatch subagent). Skill: `requesting-code-review`,
  `verification-before-completion`, `systematic-debugging`.
- Yang dibaca: `task-8-brief.md`, `task-8-report.md`, `task-8-review-package.md`,
  `probes/probe-r2-t8-last-color.cjs` (penuh, baris-per-baris),
  `src/components/editor/RecolorSection.jsx` (khususnya `mappedHexFor` :250-258,
  render keluarga :292), `src/engine/recolorEngine.jsx` (`hueFamilyGroup` :51-72,
  `paletteMapDoc` :111-132, `familyIndexOfHex` :33-38),
  `src/components/editor/EditorRightInspector.jsx` (:352-367 recents,
  :510-518 Selection colors), `src/components/editor/VectorEditor.jsx`
  (`rememberRecentColor` :133-140, `replaceSelectionColor` :8169).
- Yang dijalankan sendiri (fresh, server `http://127.0.0.1:8931/` sisa T2, dipakai ulang):
  - `node probes/probe-r2-t8-last-color.cjs` → **19/19 lolos, 0 pageerror, exit 0**
    (reproduksi penuh; output per-asersi identik dengan laporan, termasuk
    `info recents` persis 3 seed dan count kumulatif C2 1/2/5/6).
  - `npm test` → **277/277 PASS, 0 fail**.
  - Probe regresi T3 `probe-r2-t3-selsame-buttons.cjs before` → **11/11**;
    T4 `R2_T4_URL=http://127.0.0.1:8931/ probe-r2-t4-recolor-layout.cjs before` → **10/10**.
    T6/T7 tidak diulang reviewer (tidak ada edit kode sehingga regresi bersifat
    vakum; area T7 tercakup ulang oleh D0–D2 di run T8 sendiri).
  - Screenshot `r2-t8-lastcolor-before.png` dan `-after.png` dilihat: before
    menampilkan strip "Warna terakhir" persis 3 seed (merah/hijau/biru) + elips
    fill `#0D99FF`; after menampilkan Drop Shadow `#FF8800` dengan bayangan
    oranye yang benar-benar ter-render di canvas (bukti piksel insidental untuk D).
  - Catatan: run ulang reviewer menimpa kedua screenshot T8 dengan hasil segar
    (mode sama, isi setara) — sama seperti efek samping yang sudah diungkap
    laporan §5 untuk screenshot T3/T4/T6/T7.

## 1. Yang terverifikasi benar (tidak ada temuan)

- **Klaim TANPA EDIT benar.** `find . -name '*.bak-t8'` = 0; `find src probes docs
  -newermt '2026-11-14 15:30'` tidak menunjukkan satu pun file `src/` yang berubah
  di jendela kerja T8 (hanya screenshot regresi + dokumen, sesuai pengungkapan
  laporan §5). mtime `RecolorSection.jsx` 14:58 (T4) dan
  `EditorRightInspector.jsx` 15:27 (T7) mendahului file T8 (15:39–15:42).
  Hasil T4/T7 tak tersentuh.
- **Artefak C3-indigo dijelaskan dengan benar dari kode, dan koreksi probe sah.**
  `mappedHexFor` (`RecolorSection.jsx:250-258`): `if (overrides[low]) return
  overrides[low]` — override didahulukan atas target keluarga. `paletteMapDoc`
  (`recolorEngine.jsx:121-130`): `const over = overrides[slot.hex]; if (over)
  return over;` — urutan yang sama di jalur commit. Jadi pada run pertama,
  target `#00FFFF` memang benar tidak boleh mengubah mapped `#0000FF` selama
  override `#ABCDEF` aktif — ekspektasi probe yang salah, bukan bug produk.
  Koreksi probe (hapus override via `rcRemoveOverride`, verifikasi mapped kembali
  bersih `#0000FF`, baru setel target) adalah koreksi yang sah, dan asersi
  `mappedClean === firstHexLastFam` menjaga agar koreksi itu tidak bisa
  false-pass. Re-run 19/19 mengonfirmasi.
- **Asersi kandidat (a), (b), (d) non-vacuous.** (a) klik nyata
  `button[data-color]` + `waitFillHex` dengan timeout 10 detik — akan gagal bila
  klik tidak mengubah fill (bukti: pola yang sama dipakai probe lain sebagai RED).
  (b) B1 menegaskan `hex === '#FF00FF'` pada baris terakhir persis (bukan baris
  mana pun); B2 menegaskan toast persis `"1 objek #FF00FF dipilih"` DAN fill tak
  berubah. (d) D1 menegaskan label hex `#FF8800`; D2 menegaskan nilai bertahan
  saat popover dibuka ulang + fill `#0D99FF` tak berubah.
- **Arsitektur C2/C4 non-vacuous.** C2 menegaskan `mapped === '#ABCDEF'` per
  keluarga (bukan sekadar count); C4 menegaskan commit dokumen
  (`#ABCDEF` Fill·2 + Stroke·3, `#00FFFF` Fill·1, toast `"6 warna diubah"`).
- **Aritmetika laporan benar.** 19 = A0(1) + A×3 + B0/B1/B2(3) + C0/C1(2) +
  C2×4 + C3(1) + C4(1) + D0/D1/D2(3) + E0(1). Diverifikasi dengan menghitung
  eksekusi `check(`: 15 baris literal, dengan loop A- ×3, loop C2- ×4, dan cabang
  C3-gray/C3- yang saling eksklusif (hanya satu yang jalan).
- **Lokasi sumber yang dikutip brief terverifikasi** (dengan satu drift kecil,
  lihat M-2): recents `EditorRightInspector.jsx:363-367` (`recents.map`,
  `applyRecentColor` :352, `disabled={!paintTargetIds.size}`); baris Selection
  colors :510-518 (ColorField `veSelColor` + tombol ◎ `veSelPick`);
  `rememberRecentColor` `VectorEditor.jsx:133` (cap 10, `slice(0, 10)`).
- **Screenshot before mengonfirmasi seed persis 3.** Tidak ada swatch ke-4:
  menggambar elips tidak menambahkan `#0D99FF` ke recents (hanya pick via
  ColorField yang dicatat) — konsisten dengan `rememberRecentColor`.

## 2. Temuan

### I-1 — Important: Keluarga gray TIDAK PERNAH diuji, padahal gray adalah keluarga TERAKHIR di Mode 2
- Bukti: `hueFamilyGroup` (`recolorEngine.jsx:66-70`) mengurutkan gray paling
  akhir (`if (a.family === 'gray') return 1`); komentarnya sendiri:
  "Urutan hasil: red → rose (urutan array), gray terakhir."
  (`recolorEngine.jsx:48-50`). Setup fase C hanya berisi
  `#FF0000`/`#00AA00`/`#0000FF` + stroke `#064573` → keluarga
  red/green/cyan/indigo; tidak ada satu pun warna akromatik, sehingga keluarga
  gray tidak pernah muncul. Cabang skip `C3-gray` di probe
  (`probe-r2-t8-last-color.cjs`, blok C3) tidak pernah dieksekusi.
- Mengapa ini dalam scope brief: (c) berbunyi "warna terakhir tiap keluarga
  Recolor Mode 2 — target + override". Gray memang tanpa kontrol target
  (Ruling O), TAPI override per warna tetap dimungkinkan — komentar engine
  (`RecolorSection.jsx:62-64`): "Override per warna TETAP bisa mengubah gray".
  Override warna terakhir keluarga gray (mis. fill `#808080` atau `#000000`)
  adalah kandidat "warna terakhir" yang sah dan belum teruji.
  Frasa laporan user "warna terakhir" bahkan paling harfiah bisa merujuk ke
  keluarga yang diurutkan terakhir ini.
- Perbaikan (probe saja): tambah 1 elips fill akromatik (mis. `#808080`) di fase
  C, asersi override warna gray → `#ABCDEF` (mapped + count + Apply).
  Laporan §6 concern 3 sudah mengakui celah ini — tapi pengakuan bukan
  pengganti pengujian ketika pengujiannya murah dan berada di dalam scope (c).

### I-2 — Important: Tiap keluarga hanya berisi 1 warna — "terakhir" tidak pernah berarti "terakhir dari beberapa"
- Bukti: `info families mode2` pada run reviewer:
  `{"red":["#FF0000"],"green":["#00AA00"],"cyan":["#064573"],"indigo":["#0000FF"]}`.
  Di semua keluarga, "warna terakhir" == "warna satu-satunya". Jalur yang
  spesifik untuk indeks terakhir — urutan terang→gelap di `hueFamilyGroup`
  (`recolorEngine.jsx:65`: sort `L` OKLCH menurun) dan render swatch terakhir
  di DOM — tidak pernah dieksekusi dengan 2+ warna. Laporan §6 concern 4
  mengakui ini ("teruji strukturnya sama") — tapi "strukturnya sama" adalah
  asumsi, bukan bukti, dan justru inti laporan user adalah perilaku "terakhir".
- Terkait erat: helper `readMapped` di probe
  (`probe-r2-t8-last-color.cjs`, ~baris 247-258) mengambil
  `sibs[sibs.length - 1]` — mapped swatch TERAKHIR dari seluruh kontainer
  keluarga, bukan mapped dari hex yang ditanyakan. Pada setup 1-warna ini
  kebetulan benar di semua call-site (C2 selalu menanyakan warna terakhir;
  C3 menanyakan `colors[0]` yang juga satu-satunya). Dengan keluarga
  multi-warna, `readMapped(fam, colors[0])` akan membaca mapped warna
  tergelap — asersi C2/C3 menjadi salah sasaran (false-pass/false-fail).
  Jadi perpanjangan probe ke multi-warna WAJIB didahului perbaikan `readMapped`
  (lingkupi ke entry-span milik hex itu sendiri, mis. dari `btn.closest('span')`
  lalu `querySelector('span.swatch')` di dalamnya).
- Perbaikan (probe saja): tambah 1 elips fill merah kedua (mis. `#CC0000`)
  sehingga keluarga red berisi 2 warna; asersi override + target pada warna
  TERAKHIR red (`#CC0000`, yang paling gelap) — setelah `readMapped`
  diperbaiki. Total asersi menjadi ~21.

### M-1 — Minor: Angka count C2 di tabel laporan bersifat kumulatif, disajikan seolah per-keluarga
- Bukti: `countLabel` (`RecolorSection.jsx:291`) memakai `changed` dokumen
  secara keseluruhan (`paletteMapDoc` → `setChanged(res.changed)`, :124/:178).
  Run reviewer: C2-red `1 warna`, C2-green `2 warna`, C2-cyan `5 warna`,
  C2-indigo `6 warna` — angka yang naik karena override sebelumnya masih aktif,
  bukan kontribusi keluarga itu sendiri (green sendiri hanya 1 warna).
  Asersi probe (`count > 0`) tidak mengisolasi kontribusi keluarga — bukti
  per-keluarga yang sesungguhnya adalah `mapped === '#ABCDEF'`, yang memang ada.
  Dampak: hanya keterbacaan tabel laporan §1; tidak membatalkan verdict
  untuk keluarga yang diuji. Perbaiki redaksi (tandai "kumulatif") bila laporan
  direvisi.

### M-2 — Minor: Kutipan nomor baris brief meleset (tanpa dampak)
- `replaceSelectionColor` ada di `VectorEditor.jsx:8169`, bukan `:8146` seperti
  dikutip brief (meleset ~23 baris, kemungkinan geser oleh edit T2–T7).
  Tidak ada dampak karena tidak ada edit; dicatat agar kutipan tidak
  diteruskan apa adanya.

### M-3 — Minor: Recent-colors hanya di-seed 3 warna; jalur cap-10 tidak teruji
- `rememberRecentColor` (`VectorEditor.jsx:133-140`) memotong ke 10 warna
  (`slice(0, 10)`); perilaku "terakhir dari 10 penuh" + eviksi warna ke-11
  tidak teruji. Brief mengizinkan seed "3+ warna", jadi ini di luar kewajiban
  minimum — dicatat sebagai pelengkap murah bila probe (a) diperluas
  (seed 10 warna, klik swatch ke-10).

## 3. Catatan (bukan temuan — untuk klarifikasi controller/user)

- Kandidat "warna terakhir" lain yang TIDAK diuji dan memang DI LUAR scope
  brief (a)–(d): warna terakhir di Find & Replace, gradient stop terakhir,
  swatch terakhir Color Styles, warna teks, panel kiri Pen fill/stroke.
  Laporan §6 concern 1(a) sudah mendaftarkannya dengan jujur; ini bahan
  klarifikasi user, bukan kekurangan task ini.
- Warna drop-shadow diverifikasi lewat label hex + persistensi popover, BUKAN
  asersi piksel (laporan §6 concern 2 mengakui). Namun screenshot after yang
  dilihat reviewer menunjukkan bayangan oranye ter-render di canvas — bukti
  visual insidental yang memperkuat D1/D2.
- Regresi yang diklaim laporan masuk akal dan sebagian besar terkonfirmasi
  ulang oleh reviewer: `npm test` 277/277, T3 11/11, T4 10/10, T8 19/19.
  T6 (11/11) dan T7 (9/9) tidak diulang reviewer — dapat diterima karena
  tidak ada edit kode (regresi bersifat vakum) dan area T7 tercakup ulang
  oleh D0–D2.

## 4. Cannot verify from diff (tidak ada diff — investigasi tanpa edit)

- Apakah laporan user yang asli merujuk ke salah satu kandidat (a)–(d) atau ke
  kandidat di luar brief — tidak dapat diverifikasi dari task ini; butuh
  langkah reproduksi persis dari user (laporan §6 concern 1).
- Apakah ada pemotongan/penutupan visual swatch terakhir di viewport/zoom
  selain 1440×900 — tidak diuji (desktop ≥1280 sesuai keputusan ronde 2;
  laporan §6 concern 5).
- Perilaku pada kondisi pemicu spesifik (objek terkunci, gradient, teks,
  frame, alpha/`none`, sesudah Undo/Apply) — tidak tercakup probe ini.
- T6/T7 regresi tidak diulang oleh reviewer (lihat §3).

## 5. Rekomendasi fix loop (probe saja, tanpa edit produk)

1. Perbaiki `readMapped` di `probes/probe-r2-t8-last-color.cjs` agar melingkupi
   entry-span milik hex yang ditanyakan (I-2).
2. Tambah elips fill `#808080` (gray) + elips fill `#CC0000` (red kedua) di
   fase C; asersi: override warna terakhir gray → `#ABCDEF`, dan
   override/target warna terakhir red (`#CC0000`) → nilai yang diharapkan
   (I-1, I-2).
3. Re-run probe penuh (target ~21/21, 0 pageerror) + `npm test` 277/277;
   perbarui `task-8-report.md` §1/§6 (tandai count C2 sebagai kumulatif, M-1).
4. Sesudah itu penutupan DONE_WITH_CONCERNS dapat dipertahankan dengan
   keyakinan penuh untuk scope (c); bila salah satu asersi baru gagal,
   task kembali ke Step 2 brief (RED→GREEN pada akar yang terbukti).
