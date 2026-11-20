# Task 1 report — Ronde 2: Rail kiri: active = accent persis + hapus radius & shadow 3 grup

**Status: DONE_WITH_CONCERNS** (semua asersi hijau + regresi hijau; 1 temuan koreksi terhadap klaim akar di brief — lihat §1.3, dan 3 catatan kecil di §7).
**Tanggal:** 2026-11-14, ±14:17–14:25 WIB. **Implementer:** subagent T1 (tanpa subagent turunan).
**Skill yang dipakai:** `test-driven-development` (probe RED dulu, baru GREEN), `systematic-debugging`
(verifikasi lokasi via grep/parse AST sebelum edit), `ui-ux-fixer-and-improvement` (tanpa `!important`/
offset/z-index/klip baru), `verification-before-completion` (klaim hanya dengan bukti run segar).

## 1. Hipotesis & temuan verifikasi (grep/AST — SEBELUM edit)

### 1.1 Lokasi terkonfirmasi
- `src/vendor/tailwindOfflineBundle.jsx` — CSS hidup di `TAILWIND_PLUGIN_AST`, **837 aturan**,
  baris 437 (satu baris, 152.746 karakter). Urutan AST = urutan emisi CSS
  (`line 456: TAILWIND_PLUGIN_AST.map(compilePluginDescriptor).join('\n')`).
- Rail kiri: `src/components/editor/VectorEditor.jsx:8307` — satu `<div className="fig-rail-grp">`
  per grup, di-render 3× (`railGroups`: `visGrp`, `objGrp`, `pathGrp`, baris 8204/8220/8244)
  di dalam `.fig-nav-dock` (`src/components/editor/EditorActionRail.jsx`).
- Accent diterapkan `src/utils/themeAndPrefsManager.jsx:14` (`applyAccent`: `--acc` inline di
  `documentElement`); pref `accent` + `LS_KEY='trace-svg-settings-v1'`
  (`src/constants/themeAndPrefsConstants.jsx:6`, default `#13b152`, palet berisi `#0d99ff`).
- Tombol `.dk-b.on` sudah ada saat rest: `visGrp` `on: showSelNodes/showSelHandles`, default
  `true` (`VectorEditor.jsx:666-680`, `localStorage null → true`).

### 1.2 Aturan yang dipetakan (indeks AST = urutan kaskade)
| idx | Selector | Deklarasi relevan |
|-----|----------|-------------------|
| 271 | `.tool-btn.on` | `background: var(--acc-deep)` — **TIDAK disentuh** (brief) |
| 428 | `.dk-b.on` | `background: var(--acc-deep)`, `color: #fff` (base) |
| 494 | `.fig-rail-grp` | `border-radius: 12px`, tanpa `box-shadow` (base) |
| 495 | `.fig-rail-grp:hover` | `box-shadow: 0 2px 8px rgba(0,0,0,.06)` |
| 504 | `.fig-nav-dock .dk-b.on, …` | `background: var(--acc) !important` |
| 532 | `.cp-act-btn.on` | `background: var(--acc-deep)` — **TIDAK disentuh** (brief) |
| 564 | `…, .tool-btn.on, …, .dk-b.on, …` | `background: var(--acc) !important` |
| 610 | `:root:not([data-motion="off"]) .fig-nav-dock .dk-b.on` | `box-shadow: none` |
| 771 | `.ws-nav-item.on .ws-nav-ico` (M3) | `background: var(--acc-deep) !important` — **TIDAK disentuh** (brief) |
| 794 | `.fig-rail-grp` (M3, terakhir) | `box-shadow: var(--m3-shadow-xs) !important`, `border-radius: 14px !important` |

`--acc-deep` didefinisikan di `:root` light+dark sebagai `color-mix(in srgb, var(--acc) 45%, black)`.
Total kemunculan `acc-deep` di src sebelum fix: **7** (2 definisi `:root` + `.bar` + `.tool-btn.on`
+ `.dk-b.on` + `.cp-act-btn.on` + M3 `.ws-nav-item.on .ws-nav-ico`).

### 1.3 KOREKSI terhadap klaim akar di brief (temuan utama)
Brief/controller menyatakan `--acc-deep` dipakai `.dk-b.on` sehingga "tombol aktif gelap".
**Itu hanya separuh benar.** Aturan base idx 428 memang `var(--acc-deep)`, TETAPI dua override
M3 (`!important`, idx 504 dan idx 564 — yang terakhir memuat selector telanjang `.dk-b.on`)
sudah memaksa `background: var(--acc)` pada SEMUA `.dk-b.on`, termasuk tombol rail.
Bukti live (probe RED, §2): dengan accent `#0d99ff`, computed `.dk-b.on` sudah
`rgb(13, 153, 255)` **sebelum** fix. Jadi:
- Perubahan butir 1 (base `.dk-b.on` → `var(--acc)`) adalah **perbaikan laten/konsistensi** —
  menghapus nilai gelap dari base rule agar base dan override sepakat; **tidak mengubah
  computed style apa pun di rail** (tetap `var(--acc)` via override).
- Bug yang benar-benar tampak dan terukur adalah butir 2: `.fig-rail-grp` computed
  `border-radius: 14px` + `box-shadow: var(--m3-shadow-xs)` dari override M3 idx 794.
- Perubahan butir 1 tetap dilaksanakan verbatim sesuai brief/plan (bukan dibatalkan),
  karena base rule yang salah adalah utang laten: bila override M3 dihapus suatu hari,
  tombol aktif akan kembali gelap.

## 2. TDD — RED (sebelum implementasi)

Probe baru: `probes/probe-r2-t1-rail.cjs` (Playwright `playwright-core` dari
`/home/hatch/workspace/vector-editor/node_modules/`, Chromium cache `chromium-1255`,
`chrome-linux64/chrome`, viewport 1440×900). Server: `web/` via
`python3 -m http.server 8931` (port 8931). Alur probe: seed prefs lewat `addInitScript`
(`localStorage 'trace-svg-settings-v1'`, `accent: '#0d99ff'` — jalur prefs asli:
`App.jsx` `loadPrefs` + `applyAccent`) → buka app → klik `Create New Project`
(empty state, `handleQuickCreate` langsung) → tunggu `.fig-nav-dock`,
`.fig-rail-grp`, `.fig-nav-dock .dk-b.on` (condition-based waits, tanpa sleep buta) →
ukur computed style → toggle `veShowNodeGlobal` off→on (A7) → screenshot.
Baseline sebelum probe: `npm test` **275/275 PASS, 0 fail** (22,3 dtk); `web/` sudah
hasil build terbaru dari src saat itu (bundle 14:16, src 02:37).

**RED — 5/7 lolos, GAGAL: A4, A5** (sesuai prediksi §1.2/§1.3):
- PASS A1 `--acc` diterapkan: actual `#0d99ff`, expected `#0d99ff`
- PASS A2 jumlah `.fig-rail-grp`: `3`, expected `3`
- PASS A3 `.dk-b.on` background: `rgb(13, 153, 255)`, expected `rgb(13, 153, 255)` — lolos pra-fix (lihat §1.3)
- **FAIL A4** border-radius: `["14px","14px","14px"]`, expected `["0px","0px","0px"]`
- **FAIL A5** box-shadow: `["rgba(15, 23, 42, 0.05) 0px 1px 3px 0px, rgba(15, 23, 42, 0.03) 0px 1px 2px 0px" ×3]`, expected `["none" ×3]`
- PASS A7 toggle rail `veShowNodeGlobal` off→on: `on-sebelum=1 on-sesudah=1`
- PASS A6 0 pageerror: `[]`
- Screenshot before: `probes/shots/r2-t1-rail-before.png` (1440×900, 101.136 B).

Catatan jujur: exit code proses probe RED tidak tercatat bersih (output di-pipe ke `tail`);
kegagalan itu sendiri teramati langsung dari output (`5/7 lolos | GAGAL: A4, A5`).

## 3. Implementasi (GREEN) — diff minimal

Backup SEBELUM edit pertama: `src/vendor/tailwindOfflineBundle.jsx.bak-t1` (178.116 B).
**Satu-satunya file sumber yang diubah: `src/vendor/tailwindOfflineBundle.jsx`, hanya baris 437**
(3 aturan AST, masing-masing exact-match 1× via skrip Python — satu percobaan pertama
gagal karena separator JSON `json.dumps` default ber-spasi vs file yang kompak; file TIDAK
tertulis pada percobaan itu, lalu diulang dengan `separators=(',', ':')` dan berhasil):

| # | Aturan (idx AST) | Sebelum | Sesudah |
|---|------------------|---------|---------|
| E1 | `.dk-b.on` (428) | `background: var(--acc-deep)` | `background: var(--acc)` |
| E2 | `.fig-rail-grp` base (494) | `border-radius: 12px` | `border-radius: 0` |
| E3 | `.fig-rail-grp` M3 (794) | `box-shadow: var(--m3-shadow-xs) !important`, `border-radius: 14px !important` | `box-shadow: none !important`, `border-radius: 0 !important` |

**Soal `!important` pada E3 — dinyatakan eksplisit sesuai brief:** aturan M3 yang sudah ada
disentuh dan flag `!important`-nya **dipertahankan** (bukan ditambah): jumlah `!important`
di file tetap **357 = 357** (src vs `.bak-t1`), dan `!important` baru = **0**.
Alasan mempertahankan: tanpa `!important`, aturan `.fig-rail-grp:hover` (idx 495,
spesifisitas lebih tinggi) akan memunculkan kembali shadow saat hover; dengan
`none !important`, end state `box-shadow: none` berlaku di semua state termasuk hover.
Tidak ada `!important`/offset/z-index/klip baru, tidak ada dependensi baru, tidak ada
perubahan label/i18n. Tidak disentuh: `.tool-btn.on` (idx 271), `.cp-act-btn.on` (idx 532),
`.ws-nav-item.on .ws-nav-ico` (idx 694/771), override M3 `.dk-b.on` (idx 504/564) —
semua terverifikasi ulang sesudah edit.

Verifikasi pasca-edit (parse ulang AST): idx 428 `var(--acc)` ✓, idx 494 radius `0` ✓,
idx 794 `none !important` + `0 !important` ✓; kemunculan `acc-deep` **7 → 6**
(hanya `.dk-b.on` yang hilang); total baris file tetap **542**.
Rebuild: `npm run build:web` **exit 0**; `acc-deep` di `web/assets/geovanta.bundle.js` **7 → 6**.

## 4. TDD — GREEN (sesudah implementasi)

`node probes/probe-r2-t1-rail.cjs after` — **7/7 lolos, exit code 0**:
- PASS A1 `--acc` = `#0d99ff`
- PASS A2 `.fig-rail-grp` = `3`
- PASS A3 `.dk-b.on` background = `rgb(13, 153, 255)`
- PASS A4 border-radius = `["0px","0px","0px"]`
- PASS A5 box-shadow = `["none","none","none"]`
- PASS A7 toggle off→on = `on-sebelum=1 on-sesudah=1`
- PASS A6 0 pageerror = `[]`
- Screenshot after: `probes/shots/r2-t1-rail-after.png` (1440×900, 99.346 B).
- Kedua screenshot dibaca visual: editor terbuka, rail kiri 3 grup terlihat, tombol aktif
  biru `#0d99ff` di keduanya. Perbedaan radius 14px→0px pada grup kecil tidak kentara
  pada skala full-page; bukti utama adalah nilai computed di atas, bukan piksel screenshot.

## 5. Regresi

- `npm test` penuh sesudah fix: **275/275 PASS, 0 fail** (21,7 dtk) — sama dengan baseline
  275/275; **0 regresi**. (5 + 275: angka dihitung ulang dari addend masing-masing run.)
- Probe snap/floating-bar: tidak ada probe Playwright ronde-sebelumnya di working copy ini
  (`probes/` hanya berisi `shots/` saat task dimulai; harness dibuat ulang) — tidak ada yang
  bisa dijalankan; sebagai gantinya A7 memverifikasi tombol rail tetap berfungsi.
- Server statis port 8931 dimatikan sesudah GREEN (curl verifikasi: connection refused).

## 6. File yang dihasilkan/diubah

- Diubah: `src/vendor/tailwindOfflineBundle.jsx` (baris 437 saja, 3 aturan AST).
- Dibangun ulang (artefak build): `web/assets/geovanta.bundle.js` (via `npm run build:web`, exit 0).
- Backup (TIDAK ikut ZIP): `src/vendor/tailwindOfflineBundle.jsx.bak-t1`.
- Baru: `probes/probe-r2-t1-rail.cjs`, `probes/shots/r2-t1-rail-before.png`,
  `probes/shots/r2-t1-rail-after.png`, laporan ini
  (`docs/superpowers/plans/sdd-2026-11-14-round2/task-1-report.md`).
- `node_modules` tidak disentuh untuk ZIP (probe memakai `playwright-core` dari
  `/home/hatch/workspace/vector-editor/node_modules/` lewat path absolut; tanpa `npm i`).

## 7. Concerns / hal yang belum terverifikasi

1. **A3 lolos pra-fix (§1.3).** Perubahan butir 1 tidak mengubah computed style rail
   (override M3 `!important` sudah memaksa `--acc`). Bila koordinator/user mengharapkan
   perubahan visual dari butir 1, ekspektasi itu tidak terpenuhi — yang berubah adalah
   kebenaran base rule. Keputusan lanjutan (mis. membersihkan override M3 idx 504/564
   agar base rule menjadi satu-satunya sumber kebenaran) di luar scope T1.
2. **Aturan `.fig-rail-grp:hover` (idx 495) kini mati** — shadow hover-nya ditekan permanen
   oleh M3 `none !important`. Dibiarkan apa adanya demi diff minimal; pembersihan
   kandidat untuk task lain.
3. **Hanya tema light yang diprobe** (default `m3White`, `data-theme=light`). Aturan yang
   diubah tidak bergantung tema, tetapi dark theme belum diukur.
4. **Probe menyetel accent via seed localStorage**, bukan klik melalui UI Settings —
   namun itu jalur prefs asli yang sama (`loadPrefs` + `applyAccent` di `App.jsx`),
   dan A1 membuktikan nilai sampai ke `--acc`.
5. **Exit code RED tidak tercatat bersih** (di-pipe ke `tail`); status gagal RED
   didokumentasikan dari output asersi (5/7, A4+A5 FAIL). Exit code GREEN tercatat: 0.
