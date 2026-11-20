# Brief — Ronde 3, Task T5: Ikon Frame floating bar jadi ikon frame/bingkai yang lebih relevan

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T5 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Di floating bar, ubah ikon Frame menjadi ikon yang lebih relevan.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

- `src/components/editor/EditorFloatingToolbar.jsx:13` — `FrameToolGlyph`:
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
  strokeLinejoin="round">` berisi 4 bracket sudut + `<rect x="8" y="8"
  width="8" height="8" rx="1.2" />` + dot tengah (`<circle cx="12" cy="12"
  r="1.35" fill="currentColor" stroke="none" />`). Terbaca seperti
  crop/focus, bukan frame.
- Tombol: `:182-185` — `className={'tool-btn' + (tool === 'frame' ? ' on'
  : '')}`, `data-tool="frame"`, `data-tip="veFrameTool"`,
  `aria-label="Frame"`, `aria-pressed={tool === 'frame'}`, onClick
  mengaktifkan tool frame.
- RULING controller (mengikat, dari pre-flight): ganti dengan gaya
  **picture-frame** — rect luar + rect dalam, TANPA bracket sudut, TANPA
  dot tengah. Alasan: Frame tool membuat frame/artboard container, bukan
  crop; bingkai persegi ganda adalah metafora frame yang paling langsung.
  Bila saat implementasi kamu menemukan alasan kuat bahwa varian lain
  (mis. frame dengan sudut terpotong / frame + sudut kecil) lebih terbaca,
  catat alasan + minta reviewer mengadili — jangan diam-diam mengganti
  ruling.

## Langkah

- Ganti path/isi `FrameToolGlyph` dengan gaya picture-frame mengikuti
  stroke 1.8 / viewBox 24 / ukuran 22 yang sama. Contoh bentuk: rect luar
  `x=3 y=3 width=18 height=18 rx=1` + rect dalam `x=7.5 y=7.5 width=9
  height=9 rx=0.5` (angka boleh disesuaikan implementer agar terbaca
  pada 22px — ukur dan putuskan, jangan magic number tanpa alasan).
- Dokumentasikan path baru + alasan pilihan di laporan.
- `data-tool="frame"`, `data-tip="veFrameTool"`, `aria-label`,
  `aria-pressed`, handler klik, dan tombol lain di bar TIDAK berubah.
  Ikon snap Ronde 2 T9 (`EditorFloatingToolbar.jsx:195`, magnet) TIDAK
  disentuh.

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t5-frame-icon.cjs` (ikuti pola
  `probes/probe-r2-t9-snap-icon.cjs`): RED dulu — asersi path `d`/isi
  glyph baru gagal sebelum fix (glyph lama masih bracket+dot), hijau
  sesudah (glyph = rect luar + rect dalam, tanpa bracket sudut, tanpa
  dot; `data-tool="frame"` + `data-tip="veFrameTool"` utuh).
- Sertakan asersi perilaku: klik tombol Frame mengaktifkan tool frame
  (class `on` / `aria-pressed=true`); klik tool lain melepaskannya.
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T5_URL`, mis.
  `http://127.0.0.1:8990/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after CLOSE-UP tombol Frame (clip bounding box tombol
  + perbesar bila perlu agar keterbacaan 22px bisa dinilai):
  `probes/shots/r3-t5-frame-icon-before.png` /
  `r3-t5-frame-icon-after.png`. Screenshot before WAJIB dari state
  pra-fix. Controller akan MELIHAT langsung kedua screenshot untuk
  menilai keterbacaan.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe R2 T9 snap
  hijau (ikon snap tak tersentuh).

## Aturan global yang mengikat

- Backup `.bak-r3t5` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle bila berubah (baseline berjalan: 841
  aturan, `!important` 356, `acc-deep` 5 — verifikasi ulang sebelum
  melapor).

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-5-report.md` (path
glyph baru + alasan pilihan, bukti RED/GREEN probe + perintah + output,
file yang diubah, hasil `npm test`, angka tripwire, self-review,
concern). Lalu laporkan kembali dengan status singkat (DONE /
DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), ringkasan satu baris hasil
tes, dan path laporan.
