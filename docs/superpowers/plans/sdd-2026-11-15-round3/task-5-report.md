# Laporan — Ronde 3, Task T5: Ikon Frame floating bar jadi picture-frame

**Status:** DONE
**Tanggal:** 2026-11-15
**Working copy:** `~/workspace/geovanta-round2/` (bukan repo git — "commit" = backup `.bak-r3t5` + laporan ini)
**Skill yang dipakai (diumumkan):** `ui-ux-fixer-and-improvement` (diagnosis + audit 7 pilar/8 state),
`test-driven-development` (probe RED dulu, hijau sesudah), `browser_ui_fix_verification`
(Playwright di browser asli + screenshot close-up), `verification-before-completion`
(tidak ada klaim tanpa perintah segar).

## 1. Glyph baru + alasan pilihan

**Lokasi:** `src/components/editor/EditorFloatingToolbar.jsx:13` (`FrameToolGlyph`).

**Glyph lama (dihapus):**

```jsx
<path d="M8 4H5a1 1 0 0 0-1 1v3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3" />
<rect x="8" y="8" width="8" height="8" rx="1.2" />
<circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
```

4 bracket sudut + rect dalam + dot tengah — terbaca seperti crop/focus, bukan frame.

**Glyph baru (mengikuti ruling controller — picture-frame, tanpa bracket, tanpa dot):**

```jsx
<rect x="3" y="3" width="18" height="18" rx="1" />
<rect x="7.5" y="7.5" width="9" height="9" rx="0.5" />
```

Atribut svg tidak berubah: `width="22" height="22" viewBox="0 0 24 24" fill="none"
stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"`.

**Alasan pilihan angka (bukan magic number tanpa alasan):**

- Angka diambil persis dari contoh bentuk di brief — tidak ada alasan kuat untuk
  menyimpang, jadi ruling diikuti apa adanya (tidak ada varian alternatif yang
  diajukan ke reviewer).
- Rect luar 18×18 pada inset 3: mengisi viewBox 24 hampir penuh (tepi luar stroke
  mencapai 2,1 unit dari tepi), konsisten dengan ikon set internal lain
  (mis. snap `artboard` dan `grid` memakai rect luar `x=3 y=3 w=18 h=18`).
- Rect dalam 9×9 pada 7,5: pada render 22px, kotak luar ≈ 16,5px, kotak dalam
  ≈ 8,25px, celah bening antar-garis ≈ 2,5px — cukup untuk membedakan dua
  bingkai pada 22px tanpa menyatu (terbukti visual di screenshot after).
- `rx=1` luar mengikuti preseden set ikon (`artboard` rx=1); `rx=0.5` dalam
  hanya melunakkan sudut kotak kecil agar tidak tajam berlebihan.
- Metafora (Gestalt enclosure / common region + Jakob's Law): persegi ganda =
  bingkai foto/artboard — metafora paling langsung untuk tool yang membuat
  frame/artboard container, bukan crop.

## 2. Yang diimplementasikan

- **Satu baris diubah** (`13c13`): isi `FrameToolGlyph` diganti dari
  bracket+rect+dot menjadi dua `<rect>` picture-frame. Tidak ada perubahan lain.
- **Tidak berubah (terverifikasi):** `data-tool="frame"`, `data-tip="veFrameTool"`,
  `aria-label="Frame"`, `aria-pressed`, handler klik (`setShapeOpen(false)` +
  `setTool('frame')`), tombol lain di bar, dan ikon snap magnet Ronde 2 T9
  (`EditorFloatingToolbar.jsx:195`, path `M6 6v6a6 6 0 0 0 12 0V6 M4 9.5h4 M16 9.5h4`
  — masih tepat 1× di file).
- Tanpa `!important`/offset/z-index/klip baru, tanpa dependensi baru, tanpa
  ubah label/i18n, tanpa text-wrap, tanpa sentuhan CSS/AST.

## 3. Verifikasi (TDD — RED dulu, GREEN sesudah)

Build pra-fix dan pasca-fix: `npm run build:web` (exit 0, dua kali). Server statis
milik sendiri: `python3 -m http.server 8990 --directory web` (port 8990 segar,
sudah dimatikan setelah selesai via `fuser -k 8990/tcp`). Playwright:
`playwright-core` dari `/home/hatch/workspace/vector-editor/node_modules/`,
Chromium 1255 (`~/.cache/ms-playwright/chromium-1255`), viewport 1440×900,
deviceScaleFactor 2, tema light, bahasa ID.

### 3.1 RED — probe baru vs build pra-fix (gagal sesuai harapan)

Perintah:

```sh
R3_T5_URL=http://127.0.0.1:8990/ R3_T5_SHOT=probes/shots/r3-t5-frame-icon-before.png \
  node probes/probe-r3-t5-frame-icon.cjs
```

Output (ringkas; lengkap di log run):

```
  info frame glyph: {"svgAttrs":{"width":"22","height":"22","viewBox":"0 0 24 24","strokeWidth":"1.8"},
    "rects":[{"x":"8","y":"8","width":"8","height":"8","rx":"1.2"}],"pathCount":1,"circleCount":1,
    "paths":["M8 4H5a1 1 0 0 0-1 1v3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3"]}
FAIL P1 rect luar picture-frame (x=3 y=3 w=18 h=18 rx=1) ada
FAIL P2 rect dalam picture-frame (x=7.5 y=7.5 w=9 h=9 rx=0.5) ada
FAIL P3 TANPA <path> bracket sudut di dalam glyph Frame | actual=1 expected=0
FAIL P4 TANPA <circle> dot tengah di dalam glyph Frame | actual=1 expected=0
PASS P5 svg tetap 22x22 viewBox 24 strokeWidth 1.8
PASS P6 data-tool=frame, data-tip=veFrameTool, aria-label=Frame utuh
PASS P7 klik Frame mengaktifkan tool frame (class on + aria-pressed=true)
PASS P8 klik Select melepaskan Frame (class on hilang + aria-pressed=false)
PASS P9 path magnet snap R2 T9 tidak berubah
PASS P10 0 pageerror selama probe
R3-T5: 6/10 lolos | GAGAL: P1, P2, P3, P4
EXIT=1
```

RED terbukti benar: P1–P4 gagal karena glyph lama (1 rect 8/8/8/8, 1 path bracket,
1 circle dot); P5–P10 lolos — probe membedakan glyph lama vs baru dan perilaku
tetap jalan pra-fix. Screenshot before diambil dari run RED ini (state pra-fix).

### 3.2 GREEN — probe yang sama vs build pasca-fix

Perintah:

```sh
R3_T5_URL=http://127.0.0.1:8990/ node probes/probe-r3-t5-frame-icon.cjs
```

Output:

```
  info frame glyph: {"svgAttrs":{"width":"22","height":"22","viewBox":"0 0 24 24","strokeWidth":"1.8"},
    "rects":[{"x":"3","y":"3","width":"18","height":"18","rx":"1"},
             {"x":"7.5","y":"7.5","width":"9","height":"9","rx":"0.5"}],
    "pathCount":0,"circleCount":0,"paths":[]}
PASS P1 rect luar picture-frame ada
PASS P2 rect dalam picture-frame ada
PASS P3 TANPA <path> bracket sudut
PASS P4 TANPA <circle> dot tengah
PASS P5 svg tetap 22x22 viewBox 24 strokeWidth 1.8
PASS P6 data-tool=frame, data-tip=veFrameTool, aria-label=Frame utuh
PASS P7 klik Frame mengaktifkan tool frame (class on + aria-pressed=true)
PASS P8 klik Select melepaskan Frame (class on hilang + aria-pressed=false)
PASS P9 path magnet snap R2 T9 tidak berubah
PASS P10 0 pageerror selama probe
R3-T5: 10/10 lolos | SEMUA LOLOS
EXIT=0
```

### 3.3 Screenshot close-up (clip 380×92 di sekitar tombol Frame, DSF 2)

- Before (pra-fix, dari run RED): `probes/shots/r3-t5-frame-icon-before.png`
  (6.461 B) — tombol Frame aktif (latar biru muda) menampilkan glyph crop/focus:
  bracket sudut + kotak dalam + dot tengah.
- After (pasca-fix, dari run GREEN): `probes/shots/r3-t5-frame-icon-after.png`
  (5.981 B) — tombol Frame aktif menampilkan picture-frame: persegi ganda yang
  bersih, kedua bingkai terbedakan jelas pada 22px, tanpa bracket/dot.
- Kedua screenshot dibaca langsung oleh saya: glyph baru terbaca sebagai bingkai
  pada ukuran 22px; tombol 40×40, clip dan posisi tombol identik di kedua shot
  (`tombol={"x":765,"y":835,"width":40,"height":40}`).

### 3.4 Regresi

- `npm test` (fresh, pasca-fix): **277/277 PASS, 0 fail** (`ℹ tests 277, pass 277,
  fail 0`, durasi 22.371 ms — output lengkap `node --test tests/*.test.cjs`,
  exit 0). Baseline 277/277 dipertahankan.
- Probe R2 T9 snap (`R2_T9_URL=http://127.0.0.1:8990/ node probes/probe-r2-t9-snap-icon.cjs`):
  **6/6 LOLOS** (path magnet persis, toggle jalan, menu snap terbuka, label utuh,
  0 pageerror). Catatan: run ini menimpa `probes/shots/r2-t9-snap-after.png`
  dengan hasil run baru yang hijau — file itu bukan deliverable T5.
- Build: `npm run build:web` exit 0 (pra-fix dan pasca-fix).

## 4. File yang diubah

| File | Perubahan | Backup |
|------|-----------|--------|
| `src/components/editor/EditorFloatingToolbar.jsx` | Baris 13: isi `FrameToolGlyph` bracket+rect+dot → 2 rect picture-frame; diff `13c13` (1 baris) | `src/components/editor/EditorFloatingToolbar.jsx.bak-r3t5` (md5 `1c9f1d28e834b128f94feea50df082e7`, dibuat SEBELUM edit pertama; file hasil md5 `5d423fa11408778d9ed29ab6c73b0690`) |
| `probes/probe-r3-t5-frame-icon.cjs` | **Baru** — probe TDD 10 asersi (P1–P10), 9.443 B | — (file baru, bukan edit) |
| `probes/shots/r3-t5-frame-icon-before.png` | **Baru** — close-up tombol Frame pra-fix (6.461 B) | — |
| `probes/shots/r3-t5-frame-icon-after.png` | **Baru** — close-up tombol Frame pasca-fix (5.981 B) | — |

Build artifact `web/` di-regenerate dua kali (pra-fix untuk RED, pasca-fix untuk
GREEN) — hasil build, bukan source yang diedit manual.

## 5. Angka tripwire bundle

Tidak ada perubahan — tugas ini tidak menyentuh CSS/AST sama sekali (murni isi
SVG di JSX). Dihitung ulang dengan metode T3/T4 (parse `TAILWIND_PLUGIN_AST` di
`src/vendor/tailwindOfflineBundle.jsx` + hitungan file-wide):

| Tripwire | Baseline berjalan (brief) | Sesudah T5 | Δ |
|----------|---------------------------|------------|---|
| Aturan AST total (`TAILWIND_PLUGIN_AST`, parsed) | 841 | **841** | 0 |
| `!important` (file-wide) | 356 | **356** | 0 |
| `acc-deep` (file-wide) | 5 | **5** | 0 |

## 6. Self-review (baca ulang diff dengan mata segar)

1. **Diff minimal & tepat sasaran:** `diff` bak vs hasil hanya `13c13` — satu
   baris, hanya isi `FrameToolGlyph`. Tidak ada karakter lain yang berubah di
   file (baris tombol `:182-185` dan magnet snap `:195` identik dengan backup —
   magnet terkonfirmasi via `grep -c` = 1 dan probe R2-T9 6/6).
2. **Bukan tombol yang salah:** probe membaca glyph dari
   `button[data-tool="frame"]` langsung di DOM hasil build — rect luar/dalam
   persis, 0 path, 0 circle; `data-tip`/`aria-label`/`aria-pressed` terverifikasi
   di P6–P8, bukan dari membaca source.
3. **Ruling diikuti, bukan diganti diam-diam:** angka rect diambil persis dari
   contoh brief; tidak ada varian alternatif yang diimplementasikan. Satu
   catatan desain untuk reviewer (lihat §7) — bukan penyimpangan.
4. **8-state interaktif (skill ui-ux-fixer):** perubahan ini murni glyph;
   tidak ada state baru. Default/hover/focus/active/on diwarisi dari `.tool-btn`
   yang tidak disentuh (tanpa CSS baru); perilaku aktif/nonaktif terverifikasi
   di P7/P8. Loading/disabled/empty/error tidak relevan untuk tombol toggle
   tool ini.
5. **Dua insiden saat kerja (dicatat jujur):**
   - Hitungan tripwire pertama gagal: regex `node -e` saya memakai pola
     `\n];` padahal `TAILWIND_PLUGIN_AST` berada dalam satu baris panjang
     (baris 437) — file tidak tersentuh; hitung ulang dengan metode slice +
     `JSON.parse` memberi 841/356/5.
   - `pkill -f "http.server 8990"` mengenai shell saya sendiri (pola cocok
     dengan baris perintah exec) — shell mati dengan SIGTERM, tanpa dampak
     pada hasil; server lalu dimatikan bersih via `fuser -k 8990/tcp`
     (port terkonfirmasi bebas, HTTP 000).
6. **Keterbatasan yang diakui:** pengukuran di Chromium headless 1255,
   viewport 1440×900, tema light, bahasa ID — bukan browser live user dan
   bukan semua ukuran viewport. Glyph adalah SVG deterministik (bukan
   bergantung font), dan `document.fonts.ready` ditunggu sebelum screenshot,
   sehingga risiko drift antar lingkungan minimal; re-test visual oleh user
   tetap verifikasi akhir yang wajar.

## 7. Masalah / concern

- **Tidak ada blocker.** Satu catatan desain untuk reviewer (bukan keraguan atas
  kebenaran implementasi): tombol Shape di sebelah Frame menampilkan kotak
  tunggal (outline persegi), sedangkan Frame kini persegi ganda — keduanya
  tetap terbedakan oleh garis kedua, tetapi pada pandangan sekilas keduanya
  sama-sama "kotak". Bila reviewer menilai kemiripan ini mengganggu, alternatif
  yang masuk akal adalah mempertebal kontras (mis. inner rect lebih kecil atau
  sudut luar lebih membulat) — keputusan ada di reviewer, bukan saya; saya
  mengikuti ruling + angka contoh brief apa adanya.
