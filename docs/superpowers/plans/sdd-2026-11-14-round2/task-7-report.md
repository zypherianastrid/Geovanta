# Task 7 report — Ronde 2: Effects: tombol Tambah efek di bawah judul + style sama untuk 3 tombol munculan

- **Status: DONE**
- **Skill dipakai:** `test-driven-development` (probe RED dulu, baru GREEN), `ui-ux-fixer-and-improvement` (tanpa `!important`/offset/z-index/klip baru), `verification-before-completion` (semua klaim di bawah disertai output run segar).
- **Working copy:** `/home/hatch/workspace/geovanta-round2/` (bukan repo git; "commit" = backup `.bak-t7` + laporan ini).
- **Server probe:** `http://127.0.0.1:8931/` — server statis sisa T2 yang menyajikan `web/` working copy ini (dipakai ulang, port sama).

## 1. Temuan awal (verifikasi lokasi sebelum edit)

- Brief menyebut `EditorRightInspector.jsx:445-448` — **nomor baris itu sudah basi**: lokasi sebenarnya (terverifikasi via grep) adalah **baris 467** (`fxAddBtnRef`), **483** (tombol `+ Tambah efek` di dalam `.fig-isec-title`, padding `2px 6px`), **484** (`Float` + 3 tombol popover). Isi kode persis seperti deskripsi brief, hanya nomor baris bergeser.
- Baseline sebelum edit (run segar): `npm test` **277/277 PASS, 0 fail** (23.0 detik).
- Padding dasar `.ved-pill` (dari `src/vendor/tailwindOfflineBundle.jsx`): `4px 8px` (ada satu aturan kedua `7px 11px`); tombol popover sebelumnya memakai padding dasar itu (terukur RED: `4px 8px`), tombol tambah memakai inline `2px 6px`. Karena itu keempat tombol diberi inline `padding: '6px 12px'` agar terukur sama persis — bukan mengandalkan class.

## 2. Padding yang dipilih + alasan

- **Padding: `6px 12px` untuk keempat tombol** (fx-add + Drop shadow / Layer blur / Background blur).
- Alasan: brief T7 secara eksplisit meminta `6px 12px` untuk tombol Tambah efek dan padding SAMA PERSIS untuk 3 tombol popover. Pola T3/T6 ronde 2 (`6px 10px`, `flex: 1`, baris `flex flex-wrap gap-1.5 pb-1.5` di bawah judul) dipakai ulang untuk struktur — tetapi nilai padding mengikuti brief T7, bukan T3/T6.
- Struktur baris tombol: `<div className="flex flex-wrap gap-1.5 pb-1.5">` + tombol `style={{ padding: '6px 12px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}` (pola T3/T6 verbatim kecuali padding). `flex: 1` membuat tombol selebar konten seksi (full-width).
- Anchor `Float`: `ref={fxAddBtnRef}` pindah dari `<span>` pembungkus di dalam judul ke **tombol itu sendiri**; `anchor={fxAddBtnRef}` pada `<Float>` tidak berubah. Popover terverifikasi tetap muncul (B5/B8 hijau) dan screenshot after menunjukkan popover terbuka di atas tombol baru (`preferUp` tetap bekerja).

## 3. TDD — RED → GREEN

### Probe baru
`probes/probe-r2-t7-effects-button.cjs` (9 asersi B1–B9, pola T3/T6: seed localStorage prefs, condition-based waits, tanpa sleep buta; buat lingkaran via `veShapePicker`/`veShp_ellipse` lalu pilih, tunggu `[data-testid="fx-section"]` visible).

- B1 fx-add TIDAK di dalam `.fig-isec-title`
- B2 fx-add baris sendiri di bawah judul (row prev sibling === title, Y tombol > Y judul bawah, row `display: flex`)
- B3 fx-add full-width (lebar tombol == lebar konten seksi ±1px)
- B4 padding fx-add == `6px 12px`
- B5 klik fx-add → popover muncul; padding ketiga tombol popover SAMA PERSIS dengan fx-add (`6px 12px`)
- B6 data-testid tidak berubah (`fx-add`, `fx-add-shadow`, `fx-add-layerblur`, `fx-add-bgblur`)
- B7 tidak ada overflow/clip; tombol di dalam seksi
- B8 tambah tiap efek tetap jalan (dropShadow → layerBlur → backgroundBlur, masing-masing +1 `fx-row` dengan `data-fx-type` benar)
- B9 0 pageerror

### RED (sebelum implementasi)
`node probes/probe-r2-t7-effects-button.cjs before` → **4/9 lolos, GAGAL: B1, B2, B3, B4, B5** (exit 1).
Terukur sebelum: fx-add padding `2px 6px`, lebar 90.8px vs konten seksi 243px; popover `4px 8px`. B6/B7/B8/B9 sudah lolos sebelum (perilaku tambah efek memang sudah benar — fix ini murni layout).
Catatan: saat RED, probe B3 sempat membaca `rectOf(add).width` (properti yang benar `w`) sehingga `addW=undefined` — bug probe, bukan bug produksi; diperbaiki ke `rectOf(add).w` sebelum GREEN. Asersi B3 tetap gagal secara benar pada RED (null ≠ 243).

### GREEN (sesudah implementasi + rebuild)
`npm run build:web` → exit 0. `node probes/probe-r2-t7-effects-button.cjs after` → **9/9 lolos, SEMUA LOLOS** (exit 0).
Terukur sesudah: fx-add padding `{t:6px, r:12px, b:6px, l:12px}`, lebar **243px == konten seksi 243px**; ketiga tombol popover masing-masing `{t:6px, r:12px, b:6px, l:12px}`; row `prevIsTitle=true`, `display=flex`; 3 fx-row bertambah berurutan (dropShadow, layerBlur, backgroundBlur); 0 pageerror.

## 4. Diff (minimal — 1 file produksi)

Backup: `src/components/editor/EditorRightInspector.jsx.bak-t7` (dibuat SEBELUM edit pertama).
`diff .bak-t7 → hasil`: hanya **baris 483–484 → 483–485** (2 baris lama diganti 3 baris baru). Tidak ada file lain yang diubah.

```diff
-  <div className="fig-isec-title"><span>{L.fxTitle}{fxList.length ? ' (' + fxList.length + ')' : ''}</span><span ref={fxAddBtnRef} className="inline-flex items-center"><button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-tip="veFxAdd" data-testid="fx-add" aria-expanded={fxMenuOpen} onClick={() => setFxMenuOpen(o => !o)}>+ {L.fxAdd}</button></span></div>
-  <Float anchor={fxAddBtnRef} ...><div className="space-y-1"><button ... className="ved-pill w-full" data-testid="fx-add-shadow" ...>{L.fxDropShadow}</button><button ... className="ved-pill w-full" data-testid="fx-add-layerblur" ...>{L.fxLayerBlur}</button><button ... className="ved-pill w-full" data-testid="fx-add-bgblur" ...>{L.fxBackgroundBlur}</button></div></Float>
+  <div className="fig-isec-title"><span>{L.fxTitle}{fxList.length ? ' (' + fxList.length + ')' : ''}</span></div>
+  <div className="flex flex-wrap gap-1.5 pb-1.5"><button type="button" ref={fxAddBtnRef} className="ved-pill text-[10px]" style={{ padding: '6px 12px', flex: 1, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }} data-tip="veFxAdd" data-testid="fx-add" aria-expanded={fxMenuOpen} onClick={() => setFxMenuOpen(o => !o)}>+ {L.fxAdd}</button></div>
+  <Float anchor={fxAddBtnRef} ...><div className="space-y-1"><button ... className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-shadow" ...>{L.fxDropShadow}</button><button ... className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-layerblur" ...>{L.fxLayerBlur}</button><button ... className="ved-pill w-full" style={{ padding: '6px 12px' }} data-testid="fx-add-bgblur" ...>{L.fxBackgroundBlur}</button></div></Float>
```

Yang TIDAK berubah (terverifikasi dari diff): `fxAdd` / logika tambah efek (dropShadow/layerBlur/backgroundBlur + resep render), `data-testid`/`data-tip`/label/i18n keempat tombol, `Float` props (`w={220}`, `cls="cp"`, `preferUp={true}`, `onClose`), baris T3 ronde 2 (Selection Colors) dan T6 (Color Styles), seksi lain. Tanpa `!important`/offset/z-index/klip baru; tanpa dependensi baru; tanpa ubah label.

## 5. Regresi (run segar sesudah GREEN)

- `npm test` penuh: **277/277 PASS, 0 fail** (22.1 detik) — sama dengan baseline; tidak ada tes baru unit-test yang ditambahkan (TDD task ini memakai probe Playwright sesuai brief).
- Probe T6 (regresi seksi tetangga): **11/11 lolos** (`node probes/probe-r2-t6-color-styles.cjs after`).
- `npm run build:web`: exit 0.

## 6. Screenshot

- Before (popover terbuka): `probes/shots/r2-t7-effects-before.png` (103.443 B)
- After (popover terbuka): `probes/shots/r2-t7-effects-after.png` (102.081 B)
- Verifikasi visual after: tombol "+ Tambah efek" full-width di bawah area judul Effects; popover terbuka di atasnya dengan 3 tombol (Drop Shadow / Layer Blur / Background Blur). Judul seksi terukur "Effects" (B2 lolos via pengukuran posisi; pada screenshot judul berada tepat di atas area yang terlihat karena scroll `scrollIntoView block: center`).

## 7. Hal yang belum terverifikasi / concerns

- **Tidak ada concern yang menghambat.** Satu catatan: nomor baris di brief (445–448) sudah basi vs aktual (483–484) — sudah dicatat di §1; isi kode sesuai deskripsi brief.
- Belum diuji di luar viewport 1440×900 headless Chromium (chromium-1255, SwiftShader) — sama seperti probe T1–T6; verifikasi browser nyata / Windows diserahkan ke tahap berikutnya bila diminta.
- Perilaku popover saat seksi Effects berada di ujung bawah viewport (apakah `preferUp` tetap menempatkan popover terlihat penuh) tidak diuji khusus — di luar scope brief; anchor kini menempel pada tombol full-width yang sama seperti sebelumnya menempel pada tombol di judul.
