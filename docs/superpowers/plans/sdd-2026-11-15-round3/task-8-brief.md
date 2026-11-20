# Brief — Ronde 3, Task T8: Selection Colors — 3 tombol Select Same memenuhi ruang kosong

Sumber: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` § T8 (baca plan
lengkap untuk konteks global bila perlu; brief ini adalah persyaratanmu).

## Yang diminta

Di sidebar kanan bagian Selection Colors, buat agar width ketiga tombol ini
memenuhi ruang kosong yang ada: "Pilih yang Sama - Fill", "Pilih yang Sama -
Stroke", "Pilih yang Sama - Tipe". Jika perlu berikan padding atas bawah juga.

## Peta kode (terverifikasi controller via grep — WAJIB verifikasi ulang)

`src/components/editor/EditorRightInspector.jsx:514-518` — baris
`flex flex-wrap items-center gap-1.5 pb-1.5` berisi 3 tombol (warisan Ronde
2 T3):

1. Fill — `data-testid="sel-same-fill"`, `data-tip="veSelSameFill"`, ikon
   `drop` 11px, label `{L.edCtxSelSameFill}`, `onClick={() =>
   onSelectSame('fill')}`.
2. Stroke — `data-testid="sel-same-stroke"`, `data-tip="veSelSameStroke"`,
   ikon `pencil` 11px, label `{L.edCtxSelSameStroke}`, `onClick={() =>
   onSelectSame('stroke')}`.
3. Tipe — `data-testid="sel-same-type"`, `data-tip="veSelSameType"`, ikon
   `shapes` 11px, label `{L.edCtxSelSameType}`, `onClick={() =>
   onSelectSame('type')}`.

Ketiganya saat ini: `className="ved-pill text-[10px]"`, inline style
`{ padding: '6px 10px', whiteSpace: 'nowrap', display: 'inline-flex',
alignItems: 'center', justifyContent: 'center', gap: 2 }` — **TANPA**
`flex: 1` (bandingkan baris F&R/Recolor di atasnya yang punya `flex: 1`).

## RULING controller (mengikat, dari pre-flight — baca baik-baik)

"Memenuhi ruang kosong" dibaca **per-baris flex** (wrap diizinkan):
- Beri `flex: 1` pada ketiga tombol + boleh tambah padding atas-bawah
  (mis. `8px 10px` — ukur agar sejajar tombol F&R/Recolor T3/T4).
- Aturan main: tiap baris flex yang terbentuk terisi penuh (lebar total
  tombol = lebar seksi ±1px, tanpa sisa); flex-wrap tetap berlaku —
  tombol BOLEH membungkus ke baris berikut.
- FAKTA pengikat (Ronde 2 T3 M1, terukur): 3 tombol TIDAK muat 1 baris
  pada lebar seksi 243px (pasangan ID terkecil 309px; EN pun pasangan
  terkecil 247,7px > 243px). Jadi JANGAN memaksa 1 baris.
- DILARANG: perkecil label di bawah 10px, klip, text-wrap label (bungkus
  di level flex, bukan teks), ubah label/i18n, ubah ikon/handler.

## Langkah

- Tambah `flex: 1` pada ketiga tombol Select Same + boleh tambah padding
  atas-bawah.
- JANGAN sentuh baris F&R/Recolor di atasnya (urutan T3 + gap T4),
  jangan sentuh logika `onSelectSame`, jangan sentuh `.sel-col-list`.

## Verifikasi (TDD — probe RED dulu)

- Probe baru `probes/probe-r3-t8-selsame-full.cjs` (ikuti pola
  `probes/probe-r2-t3-selsame-buttons.cjs` + `probe-r3-t3-swap-fr-rc.cjs`):
  RED dulu — untuk SETIAP baris flex yang terbentuk dari ketiga tombol,
  ukur lebar total tombol + gap vs lebar konten seksi (±1px, tanpa sisa);
  sebelum fix ada sisa ruang (tombol tidak `flex: 1`), sesudah fix tiap
  baris terisi penuh. Ukur mode ID (minimal) + EN bila sempat.
  Sertakan asersi: label ≥10px (terukur), tidak ada overflow/clip, label
  1 baris (tanpa wrap), klik ketiga tombol tetap jalan (Select Same Fill
  → toast — pola B11 R2 T3; Stroke/Tipe minimal ter-klik tanpa error),
  urutan T3 tetap (Recolor mendahului F&R), 0 pageerror.
- Probe berjalan melawan hasil BUILD: `npm run build:web` dulu, lalu
  sajikan `web/` via server statis di port segar MILIKMU SENDIRI (jangan
  mengandalkan port sisa; port via env `R3_T8_URL`, mis.
  `http://127.0.0.1:8996/`). Playwright: `playwright-core` di
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255 di
  `~/.cache/ms-playwright`.
- Screenshot before/after: `probes/shots/r3-t8-selsame-full-before.png` /
  `r3-t8-selsame-full-after.png`. Screenshot before WAJIB dari state
  pra-fix.
- Regresi: `npm test` tetap hijau (baseline 277/277); probe R3 T3 hijau
  (urutan + klik F&R/Recolor tetap jalan); probe R2 T3 hijau (B3–B8
  tetap: lebar baris, padding, ikon, tanpa clip, label ≥10px).

## Aturan global yang mengikat

- Backup `.bak-r3t8` per file SEBELUM edit pertama.
- Diff minimal; tanpa `!important`/offset/z-index/klip baru; tanpa
  dependensi baru; tanpa ubah label/i18n; tanpa text-wrap.
- Laporkan angka tripwire bundle bila berubah (baseline berjalan: 842
  aturan, `!important` 356, `acc-deep` 5 — verifikasi ulang sebelum
  melapor).

## Laporan

Tulis laporan lengkap ke
`docs/superpowers/plans/sdd-2026-11-15-round3/task-8-report.md` (lebar
tiap baris pra/pasca + padding yang dipilih, bukti RED/GREEN probe +
perintah + output, file yang diubah, hasil `npm test`, angka tripwire,
self-review, concern). Lalu laporkan kembali dengan status singkat (DONE
/ DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), ringkasan satu baris
hasil tes, dan path laporan.
