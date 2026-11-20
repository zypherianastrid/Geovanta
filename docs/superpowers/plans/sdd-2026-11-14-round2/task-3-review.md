# Task 3 review — Ronde 2: 5 tombol Selection Colors (ikon + padding + flex-wrap)

**Verdict: APPROVED** — tidak ada temuan Critical/Important; 4 temuan Minor (tidak memicu fix loop).
**Spec: ✅** (semua butir brief terpenuhi; satu ekspektasi brief — "boleh membungkus ke 2 baris" — dibahas di M1 dan dinilai BUKAN pelanggaran implementer).
**Reviewer:** subagent review segar (tanpa dispatch subagent; tidak ada kode yang diubah).
**Skill yang dipakai:** `requesting-code-review`, `verification-before-completion`, `ui-ux-fixer-and-improvement`.
**Dokumen yang dibaca:** `task-3-brief.md`, `task-3-report.md`, `task-3-review-package.md` (diff `.bak-t3` vs current).
**Verifikasi independen reviewer (run segar, bukan mengulang klaim laporan):**
- `npm run build:web` → exit 0 (rebuild 14:48 WIB, `web/index.html` terbarui).
- Probe `probes/probe-r2-t3-selsame-buttons.cjs` (salinan di `/tmp/r2t3-review/`, agar screenshot implementer tidak tertimpa) terhadap server statis port **8943** → **11/11 lolos, 0 pageerror** (screenshot reviewer: `/tmp/r2t3-review/shots/r2-t3-selsame-after.png`).
- `npm test` penuh → **277/277 PASS, 0 fail** (durasi 22,5 dtk).
- Pengukuran lebar tombol locale EN oleh reviewer (skrip sekali-pakai `/tmp/r2t3-review/en-widths.cjs`, port 8943): Fill 115,8px / Stroke 134,9px / Type 125,9px, 3 baris.
- Screenshot before/after diperiksa visual langsung (lihat §5).

## 1. Checklist spec (brief → bukti)

| # | Butir brief | Hasil | Bukti |
|---|---|---|---|
| 1 | F&R + Recolor KELUAR dari `.fig-isec-title` ke baris sendiri di bawah judul (`flex-wrap`, `gap`), masing-masing `flex: 1`, ikon `refresh`/`palette` 11px, padding `6px 10px`, label/`data-testid`/`data-tip`/`onClick` tidak berubah | ✅ | Diff `EditorRightInspector.jsx:508` (satu-satunya baris berubah): `</div>` penutup `.fig-isec-title` dimajukan; baris baru `<div className="flex flex-wrap gap-1.5 pb-1.5">` berisi kedua tombol. Probe B1/B2/B3/B4 lolos (reviewer: `ownRow=true`, `flexGrow=1/1`, `frW=rcW=118,5`, `rowW=contentW=243`). `justifyContent: 'center'` dipertahankan (ruling T6 ronde lalu). |
| 2 | 3 tombol Select Same: ikon dari set yang ada (nol path baru), padding sama, tetap `flex-wrap`, label tidak < 10px, tidak diklip | ✅ | `drop`/`pencil`/`shapes` + `padding: '6px 10px'`, `size={11}`, `nowrap` + `inline-flex`. Probe B4/B5/B7/B8 lolos. Lihat M1 soal jumlah baris. |
| 3 | Lokasi `EditorRightInspector.jsx:512-518` (brief) | ✅ dengan koreksi | Lokasi aktual **:508** (brief meleset nomor baris; laporan sudah mencatat). Isi pra-edit di `.bak-t3` cocok persis dengan deskripsi brief (padding `2px 6px`, F&R/Recolor di dalam judul, Select Same tanpa ikon). |
| 4 | Ikon mengikat ronde lalu: F&R=`refresh`, Recolor=`palette`, size 11px; `justifyContent: 'center'` dipertahankan | ✅ | Tidak berubah dari `.bak-t3`; probe B5 mengasersi identitas `d` kelimanya. |
| 5 | JANGAN sentuh T6 Color Styles, T7 Effects, `.fig-isec` global | ✅ | Diff hanya 1 baris (:508). T6 `:360` dan T7 `:483` tidak ada di hunk; tidak ada file CSS/`.fig-isec` yang berubah; satu-satunya file `.bak-t3` adalah `EditorRightInspector.jsx.bak-t3` (52.542 B, 14:45:36 — 14 detik SEBELUM file current 14:45:50, backup asli). |
| TDD | Probe RED dulu (gagal di asersi yang dituju), GREEN sesudah, screenshot before/after | ✅ (RED tidak di-run ulang; lihat §6) | Probe ada (`probes/probe-r2-t3-selsame-buttons.cjs`, 11 asersi, B5 asersi identitas `d` — bukan hitung path). Screenshot before/after ada dan konsisten dengan klaim. RED 6/11 (B1–B5 gagal) ter-entailed langsung dari sumber `.bak-t3`: tombol di dalam judul, padding `2px 6px`, Select Same tanpa `<Ico>`. |
| Regresi | `npm test` penuh 277/277 + probe T1 rail hijau | ✅ sebagian diverifikasi ulang | Reviewer: `npm test` **277/277, 0 fail** (run segar). Probe T1 7/7 TIDAK di-run ulang reviewer — lihat §6. |

## 2. Ikon: keberadaan, keterbacaan 11px, semantik

Semua dari `ICONS` di `src/constants/brandAndIcons.jsx` (nol path baru — klaim laporan benar):

| Tombol | Ikon | Path di `brandAndIcons.jsx` | Penilaian |
|---|---|---|---|
| Fill | `drop` | `:41` — `M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z` | ✅ Tepat. Tetes cat = warna isi. Di-render `Ico` (`src/components/ui/IconGlyphs.jsx:10`, `svg` 11×11, `stroke="currentColor"`, `fill="none"`) sebagai outline tetes — terbaca di screenshot after. |
| Stroke | `pencil` | `:39` — `M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z` | ✅ Tepat. Pensil diagonal = garis tepi. Terbaca di screenshot after. |
| Type | `shapes` | `:35` — `M7 3l4 7H3z M14 14h7v7h-7z M7 21a4 4 0 1 0 0-8 4 4 0 0 0 0 8z` | ✅ Tepat — dengan catatan M4. `selectSame(doc, ref, 'type')` di `src/engine/colorWalk.jsx:209-214` membandingkan `objectKind(o)` (`:191-197`: `'path' \| 'text' \| 'image' \| 'frame'`), jadi "type" = **jenis objek**, bukan teks/font. `shapes` (segitiga + kotak + lingkaran = tiga jenis bentuk) adalah pemetaan terbaik di set yang ada; tidak ada ikon teks/font yang cocok (`hash`/`code` tidak relevan). Alternatif `objects` (`M3 3h10v10H3z M11 11h10v10H11z`, dua kotak identik) justru berarti "banyak objek", bukan "jenis". |

Probe B5 mengasersi string `d` persis terhadap salinan verbatim dari `brandAndIcons.jsx` — reviewer membandingkan manual ketiga path di atas dengan isi probe dan `ICONS`: cocok semua (lihat M3 untuk satu salah-salin di *teks laporan*, bukan di kode/probe).

## 3. Temuan

### Minor

**M1 — Select Same membungkus ke 3 baris, bukan ≤2 seperti dibayangkan brief (ID dan EN). Bukan pelanggaran implementer; ekspektasi brief yang keliru.**
- Bukti: probe GREEN (reviewer) — lebar tombol ID Fill 148px / Stroke 167px / Type 155px, lebar baris 243px; pasangan terkecil 148+155+6 (gap) = **309px > 243px**. Locale EN (diukur reviewer): 115,8 / 134,9 / 125,9px; pasangan terkecil 115,8+125,9+6 = **247,7px > 243px — hanya selisih 4,7px**. Screenshot **before** membuktikan baseline pun sudah 3 baris (Fill/Stroke/Type masing-masing satu baris; F&R+Recolor masih di judul) — jadi 3 baris adalah kondisi pra-ada, bukan regresi T3.
- Tidak ada cara dalam scope brief untuk 2 baris: (a) memperkecil label <10px — dilarang brief; (b) klip — dilarang; (c) memendekkan label — keputusan produk/i18n, di luar brief; (d) `flex: 1` pada Select Same + label wrap di dalam tombol — tidak dilarang eksplisit, tapi label ID "Pilih yang Sama — Stroke" dalam ±118px akan jadi 3 baris teks per tombol (penilaian implementer untuk menolaknya sudah tepat); (e) mengecilkan gap 6px ke ≤1px — hanya akan menyelamatkan EN (247,7→242,7) dengan mengorbankan jarak antar tombol, dan tetap gagal di ID (309px). Opsi (e) tidak direkomendasikan.
- Tindak lanjut (bukan fix loop): terima 3 baris apa adanya, atau minta keputusan produk soal label lebih pendek. Tidak ada aksi kode untuk T3.

**M2 — Label terukur 11px padahal class `text-[10px]`: anomali pra-ada, akar penyebab ditemukan reviewer (bukan akibat edit T3).**
- Bukti: `src/vendor/tailwindOfflineBundle.jsx:437` (AST Tailwind offline) — **tidak ada satu pun aturan `font-size: 10px` untuk selector `text-[10px]`** (aturan `font-size: 10px` yang ada hanya `.hp-t`, `.tool-tab .badge`, `.fig-badge`); sedangkan aturan `.ved-pill` menetapkan `font-size: 11px` (dan `padding: 4px 8px` — klaim laporan §3.4 soal `ved-pill` terverifikasi). Jadi class `text-[10px]` pada kelima tombol ini adalah no-op di build offline; yang berlaku adalah `.ved-pill` 11px. Sama sebelum dan sesudah T3 (B8 RED dan GREEN sama-sama 11px), memenuhi batas "≥10px".
- Tindak lanjut (di luar scope T3, park): putuskan apakah `text-[10px]` dihapus dari tombol-tombol `ved-pill` (dead class) atau utility-nya ditambahkan ke bundle offline. Bukan fix loop T3.

**M3 — Salah salin path `pencil` di teks laporan §2 (bukan di kode/probe).**
- Bukti: laporan menulis `M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1-4z` — kehilangan karakter `1` sebelum `-4z`. Yang benar (`brandAndIcons.jsx:39`, dan di probe `ICON_D.pencil`): `...L7 19l-4 1 1-4z`. Implementasi dan probe benar (B5 lolos dengan `d` verbatim); hanya teks laporan yang perlu dikoreksi satu karakter. Tidak ada perubahan kode.

**M4 — `shapes` adalah ikon tersibuk dari ketiganya pada 11px (observasi visual, bukan defect).**
- Bukti: screenshot after — segitiga + kotak + lingkaran dalam viewBox 24 dengan `strokeWidth: 2` (via `Ico`); lingkaran berdiameter 8 unit ≈ 3,7px layar. Tetap dapat dibedakan dari `drop` dan `pencil` dan identitasnya diasersi B5. Diterima apa adanya; tidak ada alternatif yang lebih baik di set yang ada (lihat §2).

### Tidak ada temuan Critical / Important.

## 4. Yang diverifikasi benar dari laporan implementer

- Diff minimal: **1 baris** (`EditorRightInspector.jsx:508`); plain `diff` = 4 baris, unified `diff -u` = 11 baris — angka "4 termasuk header" di laporan mengacu pada plain diff, konsisten.
- Tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label/i18n (`appI18n.jsx:265-267` ID, `:708-710` EN tidak tersentuh); `data-testid`/`data-tip`/`onClick` identik di diff.
- F&R/Recolor: `flex: 1` + `justifyContent: 'center'` + ikon `refresh`/`palette` 11px dipertahankan; hanya padding `2px 6px` → `6px 10px` dan pembungkus baris baru (baris baru tidak memakai `items-center` — tidak relevan karena kedua tombol sama tinggi, 29px).
- 2 baris warna + ◎ tidak berubah: probe B9 lolos (reviewer: `#0D99FF` + `#064573`, tiap baris ada ◎); tinggi tombol 29px (dari 21px), tanpa overflow/clip (B7).
- Fungsionalitas: B11 lolos (F&R membuka/menutup seksi; Select Same Fill → toast `"Tidak ada objek lain yang sama"`).

## 5. Bukti visual (diperiksa reviewer)

- **After** (`/tmp/r2t3-review/shots/r2-t3-selsame-after.png`, run reviewer): judul bersih `Selection colors (2)` + `◎ = pilih`; baris F&R + Recolor sendiri di bawah judul, lebar sama, ikon refresh/palette terlihat; ketiga Select Same berikon (tetes, pensil, bentuk) dengan padding lega, masing-masing satu baris, tanpa teks terpotong/overflow; 2 baris warna + ◎ utuh; toast terlihat.
- **Before** (`probes/shots/r2-t3-selsame-before.png`): F&R + Recolor terjepit di baris judul; Select Same tanpa ikon — **dan sudah 3 baris** (mendukung M1: 3 baris adalah pra-ada).

## 6. Cannot verify from diff / tidak di-run ulang reviewer

1. **Angka RED 6/11 (B1–B5 gagal) tidak di-run ulang** — menjalankan RED butuh mengembalikan `.bak-t3` + rebuild, yaitu mengubah working copy; tidak dilakukan. Sebagai gantinya, tiap asersi gagal ter-entailed langsung dari sumber `.bak-t3` (tombol di dalam `.fig-isec-title`, padding `2px 6px`, Select Same tanpa `<Ico>`). Angka RED diterima sebagai plausible, bukan terverifikasi eksekusi.
2. **Probe T1 rail 7/7 tidak di-run ulang.** Regresi rail hanya tercakup oleh klaim laporan + `npm test` 277/277 (yang reviewer run ulang).
3. **Locale EN** hanya diukur lebar/wrapping-nya oleh reviewer (skrip sekali-pakai di `/tmp`); probe lengkap B1–B11 tidak dijalankan dalam EN (toast/teks berbeda bahasa) dan tampilan sidebar/zoom lain serta build Windows (Tauri) tetap belum terverifikasi — sama seperti §7 laporan.
4. **Klaim laporan soal aturan `.ved-pill` `7px 11px` "pada konteks lain"** — keberadaan aturan tersebut di bundle terkonfirmasi, tapi konteks media-query persisnya tidak dicatat reviewer; tidak memengaruhi verdict (padding akhir `6px 10px` tetap di antara `4px 8px` dan `7px 11px` seperti diklaim).
