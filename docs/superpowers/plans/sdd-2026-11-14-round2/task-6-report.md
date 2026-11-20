# Task 6 report — Ronde 2: Color Styles: padding lega + 3 tombol di bawah judul, flex-wrap saja

**Status: DONE**
**Working copy:** `/home/hatch/workspace/geovanta-round2/` (bukan repo git; "commit" = backup `.bak-t6` + laporan ini)
**Skill yang dipakai:** `test-driven-development` (probe RED dulu, baru GREEN), `ui-ux-fixer-and-improvement` (tanpa `!important`/offset/z-index/klip baru), `verification-before-completion` (semua klaim di bawah disertai bukti run segar).

## Ringkasan

Seksi Color Styles kini punya padding khusus `20px 18px` (lebih lega dari `.fig-isec` standar `14px 12px`, khusus seksi ini saja — `.fig-isec` global TIDAK diubah) dan 3 tombol (Buat style / Find & Replace / Recolor) pindah ke baris sendiri di bawah judul dalam container `flex flex-wrap gap-1.5`, label `whiteSpace: nowrap`, ikon `plus`/`refresh`/`palette` 11px dipertahankan, `data-testid` tidak berubah. Pola T3 ronde 2 dipakai ulang (pindah tombol keluar dari `.fig-isec-title`, padding tombol `6px 10px`, `flex: 1`).

## Baseline (terverifikasi sebelum edit)

- `npm test`: **277 pass / 0 fail** (dijalankan 2× segar, `duration_ms` ~22–23 detik).
- Lokasi terverifikasi via grep: `src/components/editor/EditorRightInspector.jsx:360` — judul + 3 tombol sebaris di `.fig-isec-title` (`flexWrap: 'nowrap'`, `whiteSpace: 'nowrap'`, `ved-pill--compact`).
- `.fig-isec` global terverifikasi di `src/vendor/tailwindOfflineBundle.jsx`: `padding: 14px 12px` — TIDAK diubah.
- Server probe: `http://127.0.0.1:8931/` (server sisa T2, menyajikan `web/` working copy ini) — dipakai ulang, port dicatat di sini.
- Ikon `d` disalin verbatim dari `src/constants/brandAndIcons.jsx` (`plus: 'M12 5v14 M5 12h14'`, `refresh`, `palette`).

## TDD: RED → GREEN

### Probe baru

`probes/probe-r2-t6-color-styles.cjs` (11 asersi B1–B11, mengikuti pola probe T3: seed localStorage prefs, condition-based waits, tanpa sleep buta; seksi Color Styles tampil saat 0 objek sehingga tidak perlu membuat objek):

| ID | Asersi |
|----|--------|
| B1 | 3 tombol TIDAK di dalam `.fig-isec-title` |
| B2 | 3 tombol di baris sendiri di bawah judul (row prev sibling === title, Y tombol > Y judul) |
| B3 | container row `display: flex` + `flex-wrap: wrap` + `gap > 0` |
| B4 | padding seksi > `.fig-isec` standar di semua sisi (computed vs seksi pembanding `veBg`) |
| B5 | label tombol `whiteSpace: nowrap` + tiap tombol 1 baris (bungkus level flex) |
| B6 | judul 1 baris |
| B7 | tidak ada overflow/clip; tombol di dalam seksi; tombol tidak tumpang tindih |
| B8 | ikon ADA + path `d` cocok (plus/refresh/palette) + ukuran 11px |
| B9 | `data-testid` tidak berubah (`fr-open-styles`, `rc-open-styles`, `veStyleCreate`) |
| B10 | 0 pageerror |
| B11 | fungsional: Recolor membuka `rc-section`, F&R membuka `fr-section`, keduanya bisa ditutup |

### RED (sebelum implementasi)

`node probes/probe-r2-t6-color-styles.cjs before` → **7/11 lolos, GAGAL: B1, B2, B3, B4** — tepat 4 asersi yang dituju, dengan alasan yang diharapkan:

- B1: ketiga tombol `inTitle: true`
- B2: `rowPrevIsTitle: false`, `btnBelowTitle: false`
- B3: `wrap: "nowrap"`, `gap: 1`
- B4: `secPad: {t:14, r:12, b:14, l:12}` = `refPad` (standar)
- Invarian B5–B11 sudah lolos sebelum fix (ikon, nowrap label, 0 pageerror, fungsional) — bukti probe mengukur perilaku yang benar, bukan sekadar gagal acak.
- Screenshot before: `probes/shots/r2-t6-colorstyles-before.png` (judul + 3 pill terjepit sebaris).

### GREEN (sesudah implementasi)

Rebuild `npm run build:web` exit 0, lalu `node probes/probe-r2-t6-color-styles.cjs after` → **11/11 lolos, SEMUA LOLOS**:

- B4: `secPad: {t:20, r:18, b:20, l:18}` vs `refPad(veBg): {t:14, r:12, b:14, l:12}` — lebih lega di keempat sisi.
- B3: `display: flex, wrap: wrap, gap: 6` (gap-1.5).
- B2/B5: tombol di 2 baris flex (`btnTops: [408, 408, 445]`, `distinctRows: 2`) — baris 1: Buat style + Find & Replace (masing-masing 111px, `flex: 1`); baris 2: Recolor full-width (229px). Tiap tombol 1 baris, label `nowrap` — bungkus terjadi di level flex, bukan teks, persis sesuai brief.
- B6: judul 1 baris (`spanRect.h: 18`, `title clip sh: 18`).
- B8: ketiga ikon path `d` cocok + 11×11.
- B11: `rc-section` dan `fr-section` terbuka lalu tertutup.
- B10: 0 pageerror.
- Screenshot after: `probes/shots/r2-t6-colorstyles-after.png` — diverifikasi visual: judul "Color Styles" sendiri di baris judul, 3 tombol di bawahnya dalam 2 baris, seksi visibel lebih lega dari seksi tetangga.

## Padding yang dipilih + alasan

**`20px 18px`** (atas-bawah 20px, kiri-kanan 18px) vs standar `14px 12px` — +6px di tiap sisi.

- Alasan: "lebih lega" harus terukur jelas di semua sisi (bukan +1–2px yang nyaris tak terlihat); +6px konsisten dengan skala spacing yang sudah dipakai di ronde ini (mis. padding tombol T3/T7 `6px 10px`, gap `6px`).
- Lebar konten tersisa masih aman: seksi 267px − 36px padding = 231px; ketiga tombol tetap muat via flex-wrap 2 baris tanpa text-wrap (terukur di B5/B7).
- Diterapkan sebagai **inline style pada root div seksi** (`style={{ padding: '20px 18px' }}`) — inline mengalahkan padding class `.fig-isec` tanpa `!important`, tanpa menyentuh global, tanpa class CSS baru. Konsisten dengan gaya inline-style yang sudah dipakai file ini (T3).

## File diubah + diff

Backup sebelum edit pertama: `src/components/editor/EditorRightInspector.jsx.bak-t6` (dibuat via `cp`, TIDAK ikut ZIP final).

**Hanya 1 file diubah, tepat 1 baris (line 360):** `src/components/editor/EditorRightInspector.jsx`

Perubahan pada baris 360 (diff `360c360`, 2 baris diff: 1 hapus + 1 tambah):

1. Root seksi: tambah `style={{ padding: '20px 18px' }}`.
2. `.fig-isec-title`: hanya berisi `<span>{L.riColorStyles}</span>` — `<span className="flex items-center" style={{ gap: 1, flexWrap: 'nowrap', ... }}>` pembungkus tombol dihapus.
3. 3 tombol pindah ke `<div className="flex flex-wrap gap-1.5 pb-1.5">` tepat setelah title (pola T3 `:508`):
   - class `ved-pill ved-pill--compact` → `ved-pill` (seperti T3), style `padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2` — konsisten dengan tombol F&R/Recolor di seksi Selection Colors.
   - `data-tip` (`veStyleCreate`/`frOpen`/`rcOpen`), `data-testid` (`fr-open-styles`/`rc-open-styles`), `disabled={!canCreate}`, handler `onClick`, ikon `plus`/`refresh`/`palette` size 11, dan label i18n TIDAK berubah.

**Tidak disentuh:** `.fig-isec` global (`tailwindOfflineBundle.jsx`), baris T3 ronde 2 (`:508`), seksi Effects T7 (`:482-483`), file lain apa pun, `node_modules` (tidak ada `npm i`).

## Regresi

- `npm test` penuh sesudah fix: **277 pass / 0 fail** (`duration_ms 21772`) — sama persis dengan baseline 277/277; tidak ada tes baru yang ditambahkan ke suite unit (verifikasi task ini adalah probe Playwright, sesuai brief).
- Probe tetangga T3 sebagai regresi seksi Selection Colors: `node probes/probe-r2-t3-selsame-buttons.cjs after` → **11/11 lolos**.
- `npm run build:web`: exit 0 (`[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/.`).

## Hal yang belum terverifikasi / concerns

1. **Tombol "Buat style" dalam keadaan disabled** (`disabled={!canCreate}`, 0 objek terpilih) — probe B11 hanya menguji F&R dan Recolor (yang aktif tanpa seleksi). Perilaku klik "Buat style" saat ada seleksi tidak diuji di probe ini; itu di luar scope brief (data-testid/handler tidak berubah, hanya posisi + padding), dan tidak ada perubahan logika.
2. **Mode EN tidak diuji** — probe memakai `lang: 'id'` (pola T1–T5). Label EN ("New style" / "Find & Replace" / "Recolor") lebih panjang sedikit; flex-wrap akan menangani dengan membungkus ke baris berikut, tapi tidak terukur di probe ini.
3. **Lebar sidebar ekstrem tidak diuji** — probe memakai viewport 1440×900 (pola T1–T5). Flex-wrap + `flex: 1` secara desain aman di lebar berapa pun, tapi tidak ada pengukuran di viewport lain.
4. Catatan desain (bukan bug): dengan `flex: 1`, Recolor di baris kedua merentang penuh (229px) sementara dua tombol baris pertama 111px — ini konsekuensi yang diharapkan dari `flex: 1` + wrap, konsisten dengan perilaku baris T3 bila tombolnya membungkus.

## Angka (dihitung ulang dari addend)

- Probe T6 RED: 7 lolos + 4 gagal = 11 asersi. GREEN: 11 lolos + 0 gagal = 11 asersi.
- `npm test`: baseline 277 pass / 0 fail; sesudah fix 277 pass / 0 fail (delta 0).
- Probe T3 regresi: 11 lolos + 0 gagal = 11 asersi.
- File diubah: 1 file, 1 baris. Backup: 1 file `.bak-t6`.
