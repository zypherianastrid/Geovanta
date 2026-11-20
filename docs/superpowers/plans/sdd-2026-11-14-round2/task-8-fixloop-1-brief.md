# Fix loop T8 ronde 1 — brief (probe saja, tanpa edit produk yang diantisipasi)

**Sumber kebenaran:** review T8 (`docs/superpowers/plans/sdd-2026-11-14-round2/task-8-review.md`) + laporan T8 (`task-8-report.md`) + brief T8 (`task-8-brief.md`). Baca ketiganya sebelum bekerja.
**Working copy:** `/home/hatch/workspace/geovanta-round2/` — BUKAN repo git. JANGAN ubah file di luar working copy ini.

## Temuan yang harus diperbaiki (keduanya perbaikan PROBE saja)

### I-1 — Keluarga gray tidak pernah diuji, padahal gray adalah keluarga TERAKHIR di Mode 2
- `hueFamilyGroup` (`src/engine/recolorEngine.jsx:66-70`) mengurutkan gray paling akhir; setup fase C tanpa warna akromatik sehingga gray tak pernah muncul, dan cabang skip `C3-gray` di probe tidak pernah dieksekusi. Override per warna gray tetap dimungkinkan (`RecolorSection.jsx:62-64`).
- Fix: tambah elips fill `#808080` di setup fase C, asersi override gray → `#ABCDEF` (dan target keluarga gray bila ada kontrolnya — bila gray tidak punya kontrol target, catat itu eksplisit di laporan, bukan diasersi).

### I-2 — Tiap keluarga hanya berisi 1 warna; "terakhir" tidak pernah berarti "terakhir dari beberapa"
- Families pada run reviewer: `{"red":["#FF0000"],"green":["#00AA00"],"cyan":["#064573"],"indigo":["#0000FF"]}` — urutan terang→gelap (`recolorEngine.jsx:65`) tak pernah dieksekusi multi-warna.
- Helper `readMapped` (`probes/probe-r2-t8-last-color.cjs` ~:247-258) mengambil `sibs[sibs.length-1]` (mapped swatch terakhir kontainer keluarga, bukan hex yang ditanyakan) — kebetulan benar di setup ini, salah sasaran bila multi-warna; WAJIB diperbaiki sebelum perpanjangan probe.
- Fix: perbaiki `readMapped` ke entry-span milik hex yang ditanyakan, tambah elips `#CC0000` (red kedua), asersi override/target warna terakhir red (warna terakhir = paling gelap dalam urutan terang→gelap).

## Yang juga harus dilakukan
- Perbarui `task-8-report.md`: tandai angka count C2 sebagai kumulatif dokumen keseluruhan (M1 reviewer); koreksi kutipan baris `replaceSelectionColor` ke `VectorEditor.jsx:8169` (M2). (M3 recents cap-10/eviksi: pelengkap murah — lakukan bila tidak menambah risiko; bila tidak, catat alasan di laporan.)
- Re-run probe penuh (target ~21/21 — hitung ulang dari addend dan laporkan angka persis) + `npm test` penuh (277/277).
- **Bila asersi baru ada yang GAGAL**, kembali ke Step 2 brief T8 (RED→GREEN): investigasi akar + fix produk minimal + backup `.bak-t8` + screenshot after. Bila semua lolos, status tetap DONE_WITH_CONCERNS (tanpa edit produk) dengan bukti yang kini lengkap untuk gray + multi-warna.
- Screenshot: perbarui `probes/shots/r2-t8-lastcolor-after.png` bila tampilan akhir berubah (fase D tetap akhir); bila tidak berubah, catat itu.

## Aturan kerja
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n.
- JANGAN dispatch subagent. JANGAN ubah file di luar working copy. JANGAN sertakan node_modules ke ZIP.
- Backup `.bak-t8` per file SEBELUM edit pertama (bila ada edit produk; bila hanya probe + laporan, tanpa backup produk).

## Laporan
Perbarui `docs/superpowers/plans/sdd-2026-11-14-round2/task-8-report.md` (tambahkan seksi "Fix loop ronde 1"), lalu kembalikan ke controller HANYA: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), hasil asersi baru (gray + red multi-warna + readMapped), angka probe final (x/y), angka `npm test`, file yang diubah (probe + laporan, atau + produk bila ada fix), dan concerns. Bila ada asersi baru yang gagal + fix produk, sebutkan hipotesis + bukti + diff.
