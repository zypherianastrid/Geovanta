# Task 4 Report — Cascade sisipan berurutan (Iconify pindah ke modal popup)

- **Status:** DONE
- **Tanggal:** 2026-11-15
- **Skill dipakai:** `test-driven-development` (fast path percepatan 2026-11-15: 1 skill relevan, probe-first RED → GREEN; backup `.bak` + verifikasi perintah nyata tetap jalan)
- **Scope file (sesuai brief, tidak lebih):** `src/components/editor/VectorEditor.jsx`, `probes/probe-iconify-modal.cjs`

## 1. Yang diimplementasikan

`src/components/editor/VectorEditor.jsx` — diff vs backup: **+28 / −2 baris** (33 baris diff total), 3 titik edit:

1. **Ref + reset effect** (sesudah `onIconifyClose`, sebelum komentar Task 6):
   - `iconifyCascadeRef = useRef(0)` — penghitung sisipan berhasil dalam satu sesi modal.
   - `iconifyPrevToolRef = useRef(tool)` + `useEffect(..., [tool])` — saat `tool` berubah dari `'iconify'` ke bukan-`'iconify'`, set `iconifyCascadeRef.current = 0`. Modal tertutup ⟺ tool bukan `'iconify'` (mount `open={tool === 'iconify'}`).
2. **Offset dokumen di `onIconifyInsert`** — `dx0/dy0` dihitung seperti semula (tengah viewport → tengah frame 96 px), lalu:
   ```js
   const cascadeOff = (iconifyCascadeRef.current % 10) * 24;
   const dx = dx0 + cascadeOff;
   const dy = dy0 + cascadeOff;
   ```
   Dijumlah **SEBELUM** `VE.translate` (offset dalam koordinat dokumen, bukan piksel layar — Review Focus #1).
3. **Increment hanya sesudah commit berhasil** — `iconifyCascadeRef.current += 1` tepat sesudah `commit(...)`; throw di atas (loadSet / parse / transform) langsung ke `catch` tanpa menyentuh ref (Review Focus #5).

Tidak ada perubahan pada ukuran frame (96 px), pewarnaan, metadata, toast, atau `rememberRecentIcon`.

## 2. TDD / Probe Evidence

### RED — probe M6–M9 ditulis dulu, dijalankan melawan build Task 3

Perintah (server 9041 sudah jalan dari Task 3, terverifikasi `curl → 200` sebelum probe; tidak ada server kedua):

```bash
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```

Hasil: **9/12 lolos | GAGAL: M6, M8, M9** — sesuai harapan brief (M6: ketiga bbox identik):

```
info M6 bbox1 absolut: {"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68}
info M6 bbox1 yang diharapkan (tengah viewBox): {"x0":360,"y0":264,"x1":440,"y1":332}
info M6 bbox2: {"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68}
info M6 bbox3: {"x0":360,"y0":264,"x1":440,"y1":332,"w":80,"h":68}
FAIL M6 ... | actual=b1={...360,264...} b2={...360,264...} b3={...360,264...}
PASS M7 ... (lolos VACUOUS pada RED — tanpa cascade semua sisipan memang di tengah; lihat §5)
FAIL M8 ... | actual=zoom=2 b8a={...360,264...} b8b={...360,264...}
FAIL M9 ... | actual=failToast=true countBefore=6 countAfter=6 zoomBack=1 bboxM9={...360,264...} baseline={...360,264...}
PASS PERR 0 pageerror
```

Catatan RED: mekanisme M9 sudah terbukti jalan **sebelum** implementasi — `failToast=true`, jumlah objek 6→6 (sisipan `ph:house` gagal, nol objek). Yang gagal hanya asersi offset (+0, bukan +72), tepat seperti yang diharapkan dari build tanpa cascade.

### GREEN — sesudah implementasi + `npm run build:web`

Perintah yang sama:

```bash
npm run build:web   # "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```

Hasil: **PROBE-ICONIFY-MODAL: 12/12 lolos | SEMUA LOLOS** — semua pergeseran **eksak** (tanpa memakai toleransi ±2):

| Skenario | Hasil ukur (bbox union dari model dokumen) |
|---|---|
| M6 | b1 (360,264)–(440,332); b2 (384,288)–(464,356) = b1+(24,24); b3 (408,312)–(488,380) = b1+(48,48). bbox1 absolut = ekspektasi tengah viewBox persis. |
| M7 | tutup (X) → buka lagi → bbox = baseline (360,264)–(440,332) persis — offset reset. |
| M8 | zoom `getZoom()` = 2 (via API editor `setZ`); b8a (384,288) = baseline+24 (counter 1 sesudah M7); b8b (408,312) = b8a+(24,24). Zoom kembali ke 1 (`getZoom()` = 1) sebelum M9. |
| M9 | `failToast=true`, count 6→6 (gagal, nol objek); sukses berikut via recent `mdi:home` → bbox (432,336)–(512,404) = baseline+(72,72) persis — counter 3, bukan +96. |
| M1–M5b, RF4, PERR | Semua tetap PASS; 0 pageerror. |

### Full suite — Step 5

```bash
npm test 2>&1 | grep -E "pass [0-9]+|fail [0-9]+"
# ℹ pass 312
# ℹ fail 0
```

(Dijalankan 2× karena `tail -5` pertama memotong baris `pass`; kedua run mengonfirmasi angka yang sama: **312/312, fail 0**.)

## 3. Bagaimana M8 dan M9 benar-benar dicapai (mekanisme eksak, bukan ringkasan)

**M8 (zoom 200%) — setter zoom asli, bukan tebakan piksel.**
- `page.evaluate(() => window.__geovantaEditorApi.setZ(2))`, diverifikasi `getZoom() === 2` di dalam asersi. `setZ` (VectorEditor.jsx:2719) men-zoom di sekitar tengah viewport, jadi titik tengah viewport dalam koordinat dokumen tidak berubah.
- bbox dibaca dari **model dokumen** (`__geovantaEditorApi.getDoc()`, union node `subs[].nodes[]` — pola `docSnap` dari `probes/probe-iconify.cjs`), bukan dari piksel layar. Asersi adalah delta antar-bbox (+24,+24), jadi properti "24 doc unit per langkah" terbukti independen dari zoom.

**M9 (sisipan gagal tidak memajukan penghitung) — route-fulfill set sabotase, bukan route-abort.**
- Alasan tidak memakai abort mentah: `loadSet` di-memoize per set per sesi (`src/renderer/iconifyClient.jsx`: `setCache`, entri gagal dihapus tapi entri sukses dipertahankan). Set yang sudah dimuat (`mdi`) tidak bisa digagalkan lagi; dan panel hanya me-render tombol ikon bila set-nya berhasil dimuat (`renderableSearch` memfilter `sets[r.prefix]`; `svgDataUri` mengembalikan `null` bila ikon tidak ada di set → tombol tidak dirender). Jadi abort `icons.json` untuk set segar akan membuat tombolnya tidak pernah muncul.
- Mekanisme yang dipakai: `page.route('**/cdn.jsdelivr.net/npm/@iconify-json/ph/icons.json', route => route.fulfill(...))` didaftarkan **sebelum** panel memuat set `ph` (prefix segar, belum pernah dimuat sesi ini), dengan isi `{"prefix":"ph","width":24,"height":24,"icons":{"house":{"body":"<g></g>"}}}`.
  - Body `<g></g>` non-kosong → `buildIconSvg` berhasil → `svgDataUri` lolos → tombol `ic-icon-ph:house` ter-render (thumbnail kosong).
  - Klik → `onIconifyInsert` → `loadSet('ph')` (tersabotase, ter-cache) → `VE.parseSVG` menghasilkan 0 objek → throw `'Ikon tidak bisa diurai'` → `catch` → toast `Gagal menyisipkan ikon ph:house: ...`, nol objek, ref tidak tersentuh.
- Alur UI M9: bersihkan search box (kembali ke mode browse) → dropdown koleksi `[data-testid="ic-collection"]` → filter `.flt input` = `Phosphor` → klik `role="option"` pertama → tunggu `ic-icon-ph:house` visible → klik → tunggu toast gagal → tunggu 1 dtk → jumlah objek tetap → klik recent `[data-testid="ic-recent-mdi:home"]` (jalur sukses tanpa perlu me-reset filter koleksi) → ukur bbox. Route di-`unroute` sesudahnya.
- Bukti counter: sebelum M9 counter = 3 (M6: 0→3, M7 reset→1, M8: 1→3). Sukses M9 di baseline+(72,72) = 3×24 membuktikan kegagalan tidak memajukan penghitung; bila maju, hasilnya +(96,96) = (456,360).

## 4. File yang diubah

| File | Perubahan |
|---|---|
| `src/components/editor/VectorEditor.jsx` | +28/−2 baris: `iconifyCascadeRef` + `iconifyPrevToolRef` + `useEffect [tool]` reset; `cascadeOff` sebelum `VE.translate`; `+= 1` sesudah `commit`. Backup: `src/components/editor/VectorEditor.jsx.bak-modal-t4`. |
| `probes/probe-iconify-modal.cjs` | +helpers `docSnap`/`unionOf`/`waitForCount`/search/toast/`shiftClose`/`insertMdiHome` (pola `probe-iconify.cjs`) + skenario M6–M9 (total probe kini 12 cek: M1–M5, M5b, RF4, M6–M9, PERR). |
| (tidak disentuh) | File lain tidak diubah. `web/` hasil `npm run build:web` (artefak build, seperti biasa). |

## 5. Self-review

- **Kelengkapan:** M6–M9 semua hijau di browser nyata, dengan nilai eksak (24/48/72), bukan sekadar lolos toleransi. M1–M5b + RF4 + PERR tidak regresi.
- **Semantik reset:** effect hanya reset pada transisi `iconify` → bukan-`iconify` (bukan pada setiap render / setiap perubahan tool). Bukti kontinuitas: b8a M8 = baseline+24 menunjukkan counter = 1 sesudah satu sisipan M7 pasca-reset — reset terjadi tepat sekali saat modal ditutup, bukan saat dibuka lagi.
- **Disiplin scope:** hanya 2 file yang diubah; tidak ada perubahan frame/warna/metadata/toast/`rememberRecentIcon`.
- **Kejujuran soal M7 pada RED:** M7 lolos pada run RED — bukan karena probe salah, tapi karena tanpa cascade semua sisipan memang mendarat di tengah. Daya diskriminasi M7 hanya muncul bersama M6 (counter ≠ 0 sebelum tutup). Pada GREEN, M7 bermakna karena M6 sudah membuktikan counter berjalan (offset +48 sebelum tutup) lalu kembali ke +0 sesudah tutup+buka.
- **Edge yang tidak di-cover probe (di luar brief):** wrap-around `% 10` (sisipan ke-11 kembali ke offset +0) diimplementasikan persis sesuai rumus `(n % 10) * 24` tetapi tidak diuji probe — brief hanya meminta M6 (3×), M7, M8, M9. Bukan kegagalan; dicatat agar Task 5/6 tahu bila ingin menambahkannya.
- **Tidak ada yang belum terverifikasi** untuk klaim di laporan ini: semua angka di atas berasal dari output probe/suite yang dijalankan, bukan dari pembacaan kode. Verifikasi Windows/GPU asli tetap di luar lingkup (headless Chromium, seperti ronde-ronde sebelumnya) — diserahkan ke Task 6 / re-test user.
