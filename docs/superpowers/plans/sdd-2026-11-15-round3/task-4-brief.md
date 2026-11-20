# Brief — Ronde 3, Task T4: Gap antara ikon dan teks tombol "Find and Replace"

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T4 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Beri gap antara ikon yang ada di sebelah kiri teks "Find and Replace" dengan
teks "Find and Replace" itu.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

`src/components/editor/EditorRightInspector.jsx:509` — tombol Find and
Replace (`data-testid="fr-open-selcolors"`, `data-tip="frOpen"`, ikon
`<Ico n="refresh" size={11} />` + label `{L.frOpenBtn}`), inline style
`{ padding: '6px 10px', flex: 1, whiteSpace: 'nowrap', display:
'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }`.

Gap saat ini = **2px** (antara ikon refresh dan teks). CATATAN: sesudah T3,
tombol ini adalah anak KEDUA di baris F&R/Recolor (Recolor dulu) — urutan
T3 JANGAN diubah.

## Langkah

- Naikkan `gap` tombol F&R dari 2px ke nilai yang terbaca. Ukur dulu dan
  putuskan: target yang wajar mis. **6px** (sejalan dengan `gap: 6` antar
  tombol di baris yang sama — terukur di probe R2 T3: `gap: 6` — dan
  konsisten dengan gap ikon-teks tombol Select Same bila sama; bila ada
  preseden gap ikon-teks lain di seksi yang sama, ikuti preseden itu dan
  catat di laporan).
- JANGAN ubah urutan T3, label, ikon, handler, `flex: 1`, padding
  `6px 10px`. Jangan sentuh tombol Recolor (gap-nya tetap 2 kecuali ada
  alasan yang dicatat + disahkan reviewer — brief hanya meminta F&R).

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t4-fr-gap.cjs` (ikuti pola
  `probes/probe-r3-t3-swap-fr-rc.cjs`: proyek baru, gambar 1 elips agar
  Selection Colors tampil): RED dulu — ukur jarak horizontal nyata
  tepi kanan ikon → tepi kiri teks (bounding box `getBoundingClientRect`
  pada `<svg>` ikon dan node teks/span label) sebelum fix (harus ≈2px,
  gagal pada ambang target), hijau sesudah (jarak = nilai target ±1px).
  Sertakan asersi: urutan T3 tetap (Recolor mendahului F&R), tombol
  Recolor tak berubah (gap-nya tetap 2), 0 pageerror.
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T4_URL`, mis.
  `http://127.0.0.1:8987/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after (close-up area tombol bila memungkinkan, atau
  full-page seperti pola sebelumnya):
  `probes/shots/r3-t4-fr-gap-before.png` /
  `r3-t4-fr-gap-after.png`. Screenshot before WAJIB dari state pra-fix.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe R3 T3 hijau
  (urutan + klik tetap jalan); probe R2 T3 hijau.

## Aturan global yang mengikat

- Backup `.bak-r3t4` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle bila berubah (baseline berjalan: 841
  aturan, `!important` 356, `acc-deep` 5 — verifikasi ulang sebelum
  melapor).

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-4-report.md` (nilai gap
lama/baru + pengukuran bounding box, preseden yang diikuti, bukti RED/GREEN
probe + perintah + output, file yang diubah, hasil `npm test`, angka
tripwire, self-review, concern). Lalu laporkan kembali dengan status
singkat (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), ringkasan
satu baris hasil tes, dan path laporan.
