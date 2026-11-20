# Task 3 report — Ronde 2: 5 tombol Selection Colors (ikon + padding + flex-wrap)

**Status: DONE** (tanpa concern pemblokir; 1 observasi non-pemblokir di §6).
**Brief:** `docs/superpowers/plans/sdd-2026-11-14-round2/task-3-brief.md` (sumber kebenaran tunggal).
**Working copy:** `/home/hatch/workspace/geovanta-round2/` (bukan repo git; "commit" = backup `.bak-t3` + laporan ini).
**Skill yang dipakai:** `test-driven-development` (probe RED dulu, baru GREEN), `ui-ux-fixer-and-improvement` (tanpa `!important`/offset/z-index/klip baru; label tidak diperkecil di bawah 10px), `verification-before-completion` (semua klaim di bawah dari run segar).

## 1. Ringkasan hasil

- F&R + Recolor pindah keluar dari `.fig-isec-title` ke baris sendiri di bawah judul (`flex flex-wrap gap-1.5 pb-1.5`), masing-masing `flex: 1`, ikon tetap `refresh`/`palette` 11px, `justifyContent: 'center'` dipertahankan (ruling T6 ronde lalu), padding `6px 10px`.
- 3 tombol Select Same mendapat ikon dari set yang ada (tanpa path baru) + padding `6px 10px` yang sama, `inline-flex` terpusat, `nowrap`; lebar natural + `flex-wrap` dipertahankan.
- Label / `data-testid` / `data-tip` / `onClick` tidak berubah. Tidak ada baris/seksi lain yang disentuh (T6 Color Styles `:360` dan T7 Effects `:483` tidak berubah; `.fig-isec` global tidak berubah).
- Probe baru `probes/probe-r2-t3-selsame-buttons.cjs`: RED **6/11** (gagal tepat di B1–B5) → GREEN **11/11**. `npm test` **277/277**, probe T1 rail **7/7** (regresi hijau).

## 2. Ikon yang dipilih untuk ketiga tombol Select Same + alasan

Semua dari `ICONS` di `src/constants/brandAndIcons.jsx` (sudah ada; **nol path baru**):

| Tombol | Ikon | Alasan |
|---|---|---|
| Select Same Fill | `drop` — `M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z` | Tetes cat = warna isi (fill). Paling terbaca untuk "fill" di antara kandidat (`brush` terlalu berarti "kuas/alat lukis", `palette` sudah dipakai Recolor). |
| Select Same Stroke | `pencil` — `M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z`… (verbatim di probe) | Pensil menggambar garis = garis tepi (stroke/outline). |
| Select Same Type | `shapes` — `M7 3l4 7H3z M14 14h7v7h-7z M7 21a4 4 0 1 0 0-8 4 4 0 0 0 0 8z` | Segitiga + kotak + lingkaran = jenis/kind objek. `selectSame(doc, ref, 'type')` di `src/engine/colorWalk.jsx:209` membandingkan `objectKind(o)` — jadi "tipe" di sini adalah jenis bentuk objek, bukan teks/font; tidak ada ikon teks/font di set (`hash`/`code` tidak cocok). |

Verifikasi identitas ikon di probe bukan hitung path saja (pelajaran T6 ronde lalu): tiap tombol diasersi string `d` persis terhadap salinan verbatim dari `brandAndIcons.jsx` (B5 hijau).

## 3. File diubah + diff

Hanya **1 file produksi** (backup `.bak-t3` dibuat SEBELUM edit pertama):

- `src/components/editor/EditorRightInspector.jsx` — **baris 508 saja** (diff: 1 baris diubah, `diff … | wc -l` = 4 termasuk header).
  - Backup: `src/components/editor/EditorRightInspector.jsx.bak-t3` (52.542 B, dibuat sebelum edit; TIDAK ikut ZIP).
- File baru (bukan produksi): `probes/probe-r2-t3-selsame-buttons.cjs` + 2 screenshot (lihat §5).

Diff ringkas baris 508 (seksi `selectionColors`, `EditorRightInspector.jsx:508` — brief menyebut 512–518, lokasi aktual terverifikasi via grep adalah 508):

1. `</span>` penutup hint lalu `</div>` menutup `.fig-isec-title` LEBIH AWAL — kedua tombol F&R/Recolor keluar dari judul.
2. Baris baru `<div className="flex flex-wrap gap-1.5 pb-1.5">` berisi kedua tombol, masing-masing `style={{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}` — `flex: 1` dan `justifyContent: 'center'` tidak berubah dari sebelumnya; hanya `padding: '2px 6px'` → `'6px 10px'` dan pembungkus baris baru. Ikon `refresh`/`palette` 11px, `data-tip`/`data-testid`/`onClick` tidak berubah.
3. Baris Select Same (`flex flex-wrap items-center gap-1.5 pb-1.5`) tidak berubah strukturnya; ketiga tombol: `padding: '2px 6px'` → `'6px 10px'`, tambah `whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2`, dan ikon `<Ico n="drop"|"pencil"|"shapes" size={11} />` sebelum label. Label/`data-tip`/`data-testid`/`onClick` tidak berubah.
4. Padding `6px 10px` sesuai contoh brief; sejajar sistem `ved-pill`: base `.ved-pill` di bundle adalah `4px 8px` (dan satu aturan `7px 11px` pada konteks lain) — `6px 10px` berada di antaranya, dan inline style tetap meng-override class seperti sebelumnya.

Tanpa `!important`, tanpa offset/z-index/klip baru, tanpa dependensi baru, tanpa ubah label/i18n.

## 4. TDD: RED → GREEN

Harness: server statis `cd web && python3 -m http.server 8931` (sudah jalan sejak T2, port **8931**); Playwright `playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/`, Chromium `~/.cache/ms-playwright/chromium-1255`. Probe mengikuti pola T1/T2 (seed `localStorage` prefs accent `#0d99ff` lang `id`, condition-based waits, tanpa sleep buta kecuali jeda toast 150 ms seperti T2). Skenario: buat lingkaran (`veShp_ellipse`, drag 250,150 → 410,310) — fill default = accent `#0D99FF`, stroke = varian gelap accent `#064573` — lalu pilih; seksi Selection Colors tampil dengan 2 baris warna.

### RED — `node probes/probe-r2-t3-selsame-buttons.cjs before` (sebelum edit, build T2)

**6/11 lolos; GAGAL: B1, B2, B3, B4, B5** (tepat asersi yang dituju):

| ID | Asersi | Hasil RED |
|---|---|---|
| B1 | F&R TIDAK di dalam `.fig-isec-title` | FAIL (`frInTitle=true`) |
| B2 | Recolor TIDAK di dalam `.fig-isec-title` | FAIL (`rcInTitle=true`) |
| B3 | Baris sendiri di bawah judul (flex-wrap, flex:1, terisi penuh) | FAIL (`ownRow=false`; `frFlexGrow=1`, `frW=119.5`, `rcW=119.5`, `rowW=243`, `gap=4` — flex:1 sudah benar, yang gagal hanya posisi baris) |
| B4 | Padding kelima tombol `6px 10px` | FAIL (semua `2px 6px`) |
| B5 | Ikon + identitas path `d` kelima tombol | FAIL (`fr=refresh`, `rc=palette` OK; ketiga Select Same `d=null`) |
| B6 | Lebar baris == lebar konten seksi (±1px) | PASS (`rowW=243`, `contentW=243`) |
| B7 | Tanpa overflow/clip | PASS (`sec sw=267/cw=267`; semua tombol `sw<=cw`, `sh<=ch`, di dalam seksi) |
| B8 | Label ≥ 10px | PASS (semua terukur **11px** — lihat observasi §6) |
| B9 | 2 baris warna + ◎ tidak berubah | PASS (`#0D99FF`, `#064573`, tiap baris ada ◎) |
| B11 | F&R membuka seksi + Select Same Fill → toast | PASS (toast `"Tidak ada objek lain yang sama"`) |
| B10 | 0 pageerror | PASS (`[]`) |

### GREEN — `node probes/probe-r2-t3-selsame-buttons.cjs after` (sesudah edit + `npm run build:web` exit 0)

**11/11 lolos | SEMUA LOLOS**, 0 pageerror. Angka kunci: padding kelima tombol `6px 10px`; ikon `fr=refresh, rc=palette, fill=drop, stroke=pencil, type=shapes` (identitas `d` cocok verbatim); `rowW=243`, `contentW=243`, `frW=118.5`, `rcW=118.5`, `gap=6`; `ownRow=true`, `flexGrow=1/1`; 2 baris warna `#0D99FF` + `#064573` dengan ◎ utuh; tombol F&R/Recolor `29px` tinggi (dari `21px`), Select Same `148/167/155px` lebar, tanpa overflow/clip.

## 5. Regresi + screenshot

- `npm test` (penuh, run segar sesudah GREEN): **277/277 PASS, 0 fail** (baseline 277/277 — tidak berubah; tidak ada tes baru yang ditambahkan ke suite unit, verifikasi task ini lewat probe Playwright sesuai brief).
- `npm run build:web` (`node scripts/build-offline-bundle.js`): **exit 0**.
- Probe T1 rail (`node probes/probe-r2-t1-rail.cjs after`): **7/7 lolos** — tombol rail lain tetap berfungsi.
- Screenshot before: `probes/shots/r2-t3-selsame-before.png` — judul terjepit F&R + Recolor; Select Same tanpa ikon, padding kecil.
- Screenshot after: `probes/shots/r2-t3-selsame-after.png` — judul bersih (`Selection colors (2)` + `◎ = pilih`); baris F&R + Recolor sendiri di bawah judul, lebar sama, ikon terlihat; ketiga Select Same berikon (tetes, pensil, bentuk) dengan padding lega; 2 baris warna + ◎ tidak berubah; toast `Tidak ada objek lain yang sama` terlihat (dari asersi fungsional B11).
- Screenshot after diverifikasi visual langsung: tidak ada teks terpotong, tidak ada overflow, semua ikon terbaca pada 11px.

## 6. Concerns / observasi (non-pemblokir)

1. **Select Same membungkus ke 3 baris (satu tombol per baris) pada locale ID.** Ini SAMA dengan perilaku baseline (screenshot before menunjukkan 3 baris juga: `fill 127px + stroke 146px` sudah melebihi lebar baris `243px` sebelum ikon/padding ditambah). Brief mengizinkan membungkus ("boleh membungkus ke 2 baris"); 3 baris adalah konsekuensi label ID yang panjang (`Pilih yang Sama — Stroke` ≈ 167px dengan ikon + padding baru) pada sidebar 243px, bukan regresi dari perubahan ini. Bila reviewer menginginkan maksimal 2 baris, opsinya di luar brief ini: label lebih pendek (perlu keputusan produk/i18n) atau `flex: 1` pada Select Same (label akan wrap menjadi 2–3 baris di dalam tombol — ditolak di sini karena merusak keterbacaan label satu baris). Perilaku di locale EN lebih ringkas tetapi tetap membungkus — belum diukur (hanya ID yang diprobe, sesuai brief).
2. **Font label terukur 11px, bukan 10px.** Kelas tombol adalah `text-[10px]`, tetapi `getComputedStyle().fontSize` mengembalikan `11px` pada kelima tombol — SAMA persis sebelum dan sesudah perubahan (B8 RED dan GREEN sama-sama 11px). Bukan akibat edit ini; tidak diselidiki lebih jauh karena di luar scope dan masih ≥ 10px (memenuhi larangan "jangan perkecil di bawah 10px").
3. **Tidak ada tes unit baru di `tests/`.** Sesuai brief, verifikasi task ini adalah probe Playwright (11 asersi) + suite penuh; tidak ada logika baru yang bisa di-unit-test (murni JSX layout + ikon statis).

## 7. Yang belum terverifikasi

- Tampilan pada locale EN (label lebih pendek; wrapping Select Same kemungkinan berbeda) — hanya ID yang diprobe.
- Tampilan pada lebar sidebar/zoom lain (probe memakai viewport 1440×900, zoom 102%; desktop ≥1280 sesuai keputusan ronde ini).
- Re-test manual oleh user di build Windows (Tauri) — verifikasi di sini hanya web build headless Chromium.
