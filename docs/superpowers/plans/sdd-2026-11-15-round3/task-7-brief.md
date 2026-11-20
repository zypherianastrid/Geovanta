# Brief — Ronde 3, Task T7: Tab Canvas — tinggi nilai warna = tinggi warna latar

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T7 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Pada bagian canvas di sidebar kanan, pada tab kanvas, buat agar tinggi fungsi
nilai warna sama dengan warna latar.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

`src/components/editor/EditorRightInspector.jsx:546+` — seksi `veBg` (judul
`{L.riCanvas}`):

```jsx
<div className="flex items-center gap-2 fade" data-tip="veBgColor">
  <ColorField ... value={bg.mode === 'transparent' ? 'none' : bg.color} on={...} />
  <ColorText ... value={bg.mode === 'transparent' ? 'none' : bg.color} on={...} />
</div>
```

- `ColorField` = swatch warna ("warna latar").
- `ColorText` = kotak teks hex ("nilai warna", memakai CustomTextBox).
- Keduanya di-import di file yang sama; definisi komponen ada di
  `src/components/ui/ColorPickerField.jsx` (verifikasi nama file + prop
  tinggi/padding-nya sebelum memutuskan mekanisme).
- Ukur dulu tinggi render keduanya dalam kondisi mode **solid** maupun
  **transparent** — catat angka pra-fix di laporan.

## Langkah

- Samakan tinggi keduanya (mekanisme tanpa magic number — ukur dan putuskan,
  mis. samakan `height`/`min-height`/`align-items: stretch` + padding yang
  sama, atau samakan tinggi ColorText dengan tinggi swatch ColorField;
  reviewer sahkan). Bila tinggi ColorField sendiri berasal dari aturan
  bundle, sebutkan aturan itu di laporan.
- JANGAN ubah logika `setBg` (transparent/solid), nilai warna, atau commit.
  JANGAN ubah lebar (hanya tinggi yang diminta). JANGAN sentuh seksi lain.

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t7-canvas-heights.cjs`: RED dulu — ukur
  tinggi render (`getBoundingClientRect().height`) ColorField vs ColorText
  di seksi `veBg`, mode solid DAN mode transparent: sebelum fix selisih >
  0 (buktikan angkanya), sesudah fix selisih = 0 ±1px di kedua mode.
  Sertakan asersi: ganti warna latar via ColorField tetap jalan (nilai
  berubah), ganti via ColorText (ketik hex + Enter) tetap jalan, mode
  transparent/solid toggle tetap jalan, 0 pageerror.
- Cara mencapai tab Canvas: seksi `veBg` ada di sidebar kanan editor
  (bukan tab terpisah di dalam inspector — verifikasi di browser; bila
  perlu scroll inspector ke seksi Canvas). Ikuti pola harness
  `probes/probe-r3-t3-swap-fr-rc.cjs` (proyek baru + elips) — seksi Canvas
  tampil tanpa seleksi objek (verifikasi; bila butuh seleksi, catat).
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T7_URL`, mis.
  `http://127.0.0.1:8994/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after: `probes/shots/r3-t7-canvas-heights-before.png`
  / `r3-t7-canvas-heights-after.png` (close-up baris ColorField +
  ColorText bila memungkinkan). Screenshot before WAJIB dari state
  pra-fix.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe T6 hijau
  (ColorText dipakai di sini — `.c-inp-txt.sel` tak boleh rusak).

## Aturan global yang mengikat

- Backup `.bak-r3t7` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle sesudah perubahan (aturan AST total,
  `!important`, `acc-deep`) + justifikasi bila aturan bertambah. Baseline
  berjalan: 841 aturan, `!important` 356, `acc-deep` 5 — verifikasi ulang
  sebelum melapor.

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-7-report.md` (tinggi
pra/pasca kedua mode + mekanisme fix, bukti RED/GREEN probe + perintah +
output, file yang diubah, hasil `npm test`, angka tripwire, self-review,
concern). Lalu laporkan kembali dengan status singkat (DONE /
DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), ringkasan satu baris hasil
tes, dan path laporan.
