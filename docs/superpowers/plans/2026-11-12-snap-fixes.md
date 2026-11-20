# Rencana Perbaikan Snapping — 2026-11-12

Perintah user: "perbaiki semua bug yang ada pada fungsi snapping tools".
Metode: `systematic-debugging` (4 fase). Audit oleh 3 subagent paralel (port-fidelity
vs Rust Figcraft, logika solver, integrasi UI). Oracle Figcraft: 52/52 lolos
terhadap kode saat ini (inti port cocok; bug ada di luar cakupan oracle dan
di lapisan solver/integrasi).

## Triase (0 Critical di semua audit)

### Grup A — Inti port `src/engine/figcraftSnap.jsx`
- A1 [Port I1, Important]: `targetsForPoints` tidak skip midpoint yang salah
  satu ujungnya bergerak (cek `p.id`, harusnya cek ujung segmen). Perlu
  `getVec` memasok id ujung tiap midpoint. TIDAK ADA pemanggil di `src/`
  (laten) — perbaiki + tes unit dengan getVec stub.
- A2 [Port M1, Minor]: `roundMove` `Math.round` vs Rust `round` pada
  setengah negatif (-2.5 → -2, harusnya -3). Helper round-half-away-from-zero.
- A3 [Port M2, Minor]: dedup marker `guidesEqual` membandingkan `kind`
  (Rust tidak punya kind). Bandingkan tanpa kind.
- A4 [Port M6, Minor]: `targetsForPoints` tidak mengurangi budget untuk
  extra point non-finite (Rust: `saturating_sub(extra.len())`).
- TIDAK DIUBAH: M3 (snapPoints toPage — tak teramati, space selalu IDENTITY),
  M4 (null vs 0.0 — disengaja, pemanggil bergantung null untuk fallback),
  M5 (singular space — tak terjangkau), M7 (distanceLabel ≥1e21 — tak
  terjangkau; perbaiki hanya bila satu baris + teruji), M8 (targets_moving
  `others` — tidak ada pemanggil).

### Grup B — Solver `src/engine/multiSnapSolver.jsx`
- B1 [Solver I1 + Integrasi I1, Important]: tahap 3 edge mati untuk drag
  node — `snapMany({noNode:true})` selalu null + `edgeFn` menutupi
  `snapEdgePoint` (if/else, bukan fall-through). Fix: `snapMany` tidak
  return null pada noNode (lewati titik node saja, tetap snap garis bbox);
  tahap 3 fall-through ke `snapEdgePoint` bila edgeFn null; hapus gate
  `!figmaObj` tahap 3 agar edge hidup juga untuk drag objek.
- B2 [Solver I2, Important]: `hasTargetObjs=false` mematikan tahap 1
  padahal garis artboard ada. Fix: gate memakai "ada garis target"
  (artboard ikut dihitung).
- B3 [Solver I3, Important]: `kindOfLanded` mengembalikan `'node'` untuk
  snap garis bbox/artboard. Fix: kembalikan kind garis yang sebenarnya
  ('bbox'/'artboard') bila tidak cocok node/midpoint.
- B4 [Solver I4, Important]: `snapMany`/`snapOutline` tidak menambahkan
  midpoint ke target (padahal header: target = node + midpoint).
- B5 [Solver M1, Minor]: grid fallback `snapPt` hanya bila TIDAK ADA snap
  sama sekali (harus per sumbu bebas, seperti tahap 4); tiga situs memakai
  `<` ketat, bukan `<=` inklusif (grid snapPt, grid tahap 4, snapEdgePoint).
- B6 [Solver M2, Minor]: `guidesForAxes` menyamakan guide nol-panjang
  dengan marker; `find` marker bisa mengambil guide garis. Fix: tandai
  marker (`marker: true`) di `snapPoints`; guidesForAxes: marker butuh
  kedua sumbu, garis nol-panjang cukup satu sumbu; `find` memakai `g.marker`.
- B7 [Solver M3, Minor]: tahap 1 menentukan `kind` dari guide sumbu yang
  terkunci (termasuk pre-lock tanpa snap). Fix: kind hanya dari guide yang
  benar dipakai + hanya bila tahap 1 benar snap.
- B8 [Solver M4, Minor]: tahap 1 titik digerbangi `cfg.node || cfg.midpoint`
  — garis bbox/artboard di `targets` tak terjangkau bila keduanya mati.
  Fix: jalankan snapPoints bila `targets` punya garis apa pun.
- B9 [Solver M5, Minor, laten]: tahap 2 tidak menormalisasi bentuk `delta`
  seperti tahap 1 (`{x,y}` → NaN → tahap perp mati diam-diam).
- B10 [Solver M6, Minor]: pasangan sinar tahap 2 menerima perpotongan
  sampai `thr*1.6` (8 px) — harus `thr`.
- B11 [Solver M7, Minor]: sinar perp butuh `n>=3` — subpath 2 node tidak
  pernah dapat sinar. Fix: untuk n==2, arah sinar dari segmen pada saat
  cache dibangun (beku).
- B12 [Solver M10, Minor]: `ind` tahap 3 memakai `r.x/r.y` (landing
  probe[0]) — harus `{x: p.x+dx, y: p.y+dy}`.
- B13 [Solver M11, Minor]: `snapEdgePoint` memakai segmen basi bila hanya
  satu ujung dikecualikan — lewati bila SALAH SATU ujung bergerak.
- B14 [Solver M12, Minor]: `noNode` mematikan SEMUA target di
  `snapHandleCurve`/`snapOutline` (beda dengan `snapPt`). Samakan semantik:
  hanya lewati titik node.
- B15 [Solver M13, Minor]: guide grid tahap 4 diberi kind `'artboard'` —
  harus `'grid'`.
- TIDAK DIUBAH: M8 (axial di boxTargets walau node mati — toggle axial
  memang independen, by design), M9 (kode mati boxesByX/pts/bucket/ptHash —
  bukan bug; tidak dihapus agar diff minimal).

### Grup C — Integrasi `VectorEditor.jsx` + toolbar + katalog
- C1 [Integrasi I2, Important]: tooltip `veSnap` (ID+EN) mengklaim 3 hal
  salah: toleransi 8 px (aslinya 5), "Tahan Alt" (aslinya Ctrl/Cmd),
  "berlian hijau" kontur + "berlian oranye" garis handle (tidak ada).
  Fix teks + sesuaikan dengan I3.
- C2 [Integrasi I3, Important]: tombol penekan snap tidak konsisten
  (Alt di addSnap/drag handle, Ctrl/Cmd di snapAt/drag). Fix: snapAt
  menekan snap bila Ctrl/Cmd ATAU Alt ditahan (kedua tombol diterima di
  semua jalur) + tooltip diperbarui.
- C3 [Integrasi I4, Important]: toggle Kontur mati di `addSnap` (snapPt
  tanpa logika kontur). Fix: tahap edge di dalam `snapPt` — bila edge
  diizinkan (`!noEdge`) dan sumbu bebas, coba `snapEdgePoint` pada sumbu
  itu (per-sumbu, hanya bila sumbu belum snap).
- C4 [Integrasi I5, Important]: toggle Smart Guides bocor di semua jalur
  `snapPt` (garis kotak ditambahkan tanpa syarat). Fix: parameter `noBBox`
  baru di `snapPt` (default false = perilaku lama); addSnap + drag handle
  meneruskan `!snapCfg.bbox`.
- C5 [Integrasi I6, Important]: axial mati saat drag 1 node & bila
  bbox+spacing mati. Fix: garis axial juga masuk `targets` (jalur titik),
  bukan hanya `boxTargets`.
- C6 [Integrasi I7, Important]: `snapHandleCurve` mati saat node mati,
  bocor midpoint saat midpoint mati. Fix: hormati `cfg.midpoint` untuk
  midpoint (parameter baru); `noNode` hanya lewati titik node (B14).
- C7 [Integrasi I8, Important]: drag handle `rN` (exObjs=null) vs `r0`
  (exObjs={objId}) tidak sepakat soal objek yang diedit. Fix: `rN` juga
  mengecualikan objek yang diedit.
- C8 [Integrasi M1, Minor]: preset "Bawaan/Default" tidak ada tombolnya
  (tooltip yatim) + Reset Pengaturan tidak mengembalikan snap. Fix:
  tombol Default di menu snap (terapkan DEFAULT_SNAP_CFG); Reset juga
  menghapus `'svgpeak-snap-cfg'` (berlaku penuh sesudah reload; live
  state tetap via tombol Default).
- C9 [Integrasi M2, Minor]: semua guide dirender satu warna merah.
  Fix: warna per kind dari SNAP_OPTS.
- C10 [Integrasi M3, Minor]: snap bbox/axial/artboard tanpa penanda di
  titik tempel (`cross=false`). Fix: `cross` true juga untuk kind
  bbox/artboard/axial (penanda silang tampil; bentuk diamond tetap hanya
  untuk edge/hline/midpoint/perp, lingkaran untuk node).
- C11 [Integrasi M4, Minor]: scale & imgscale tidak meneruskan dragBBox
  (spacing + snap kotak tak tersedia). Fix: teruskan dragBBox objek yang
  diubah ukurannya + allowSpacing.
- C12 [Integrasi M5, Minor]: titik Pen baru bisa menempel ke node terakhir
  path-nya sendiri. Fix: kecualikan node terakhir path Pen di `penTarget`
  (exNodes) — verifikasi dulu apakah draft Pen ada di doc.
- C13 [Integrasi M6, Minor]: switch Grid tampil "on" walau grid mati
  (`gridOn` off). Fix: status efektif `snapCfg.grid && gridOn` untuk
  baris grid.
- C14 [Integrasi M7, Minor]: tool `text` tidak ada di
  SNAP_TOOL_CAPABILITIES (fallback diam-diam ke select). Tambah entri
  `text` (salin caps select).
- C15 [Integrasi M8, Minor]: parameter `hLines` mati + komentar
  menyesatkan di drag handle. Bersihkan: teruskan `false`, perbaiki
  komentar.
- C16 [Integrasi M9, Minor]: kunci cache memakai urutan sisip Set.
  Fix: urutkan id saat membangun kunci.

## Verifikasi (per grup, TDD RED→GREEN)
- Tes unit baru `tests/snap-fixes.test.cjs` (esbuild + node --test, pola
  yang sama dengan `tests/node-path-actions.test.cjs`): A1–A4, B1–B15
  (yang terjangkau unit), C5 (axial di targets).
- Probe browser baru `probes/probe-snap-fixes.cjs`: B2 (artboard saat
  objek tunggal), C2 (Alt menekan snap), C3 (edge di Add Node), C4
  (bbox mati → tidak snap kotak), C5 (axial drag 1 node), C12 (Pen
  tidak self-snap), C9 (warna guide), C10 (penanda bbox).
- Regresi: `npm test` penuh, `npm run build:web`, oracle Figcraft 52/52,
  probe ronde-5 17/17 + topath 2/2 + dblclick 4/4 + stale 5/5 + matriks
  20/20 + node-actions 24/24, smoke ZIP 0 pageerror.

## HASIL AKHIR — SELESAI 2026-11-12 (18:12 WIB)
- Grup A (figcraftSnap A1–A4) + Grup B (solver B1–B15 + C5 + C10) + Grup C (integrasi C1–C4, C6–C9, C11–C16) selesai.
- **Bug baru B16 ditemukan probe (S5):** `buildSnapCache` tanpa gerbang `hasExNode` — objek yang salah satu node-nya dikecualikan tetap menyumbang garis kotak/spacing ke targets/boxTargets; Pen menempel ke garis kotak draft sendiri. Fix: scan `o.subs[].nodes[]` terhadap `exNodes`, blok garis kotak/spacing bila `hasExNode`. Tes B16 baru di `tests/snap-fixes.test.cjs`.
- **Akar drag-lag TERBUKTI (bukan bug snap, TIDAK diubah):** blok `if (!dg.moved)` di `onPointerMove` (~4493) me-re-baseline `dg.start = pt` saat pointermove pertama melewati deadzone 5px layar — pilihan desain ("agar objek/node/handle tidak melompat"). Node terkomit tertinggal tepat 1 langkah pointermove (terbukti via uji undo/redo). Probe memakai drag kompensasi 2-fase.
- Verifikasi: `npm test` **135/135**, oracle Figcraft **52/52**, probe snap **17/17** (2 run), build exit 0, regresi penuh hijau — node-actions 24/24, text-panel-r5 17/17, topath 2/2, dblclick 4/4, stale-assets 5/5, matriks 20/20, smoke ZIP 0 pageerror.
  - Catatan jujur: run regresi pertama gagal di semua probe font (mock font port 8941 mati di sesi itu — BUKAN regresi snap); sesudah mock dihidupkan, semua hijau.
- **Perubahan perilaku yang disengaja (C7):** handle drag kini mengecualikan objeknya sendiri (`exObjs = new Set([dg.objId])`) — handle tidak lagi snap ke node path yang sama.
- **Caveat fidelitas S3:** log menunjukkan B berpindah sebagai rect utuh (object drag, bukan node drag murni); snap axial C5 terverifikasi lewat S3, tetapi jalurnya object drag. S1/S2 node drag murni.
- ZIP: `~/workspace/your_files/Geovanta-Snapping-FIX.zip` (234 file, 11.347.941 B, SHA256 `fca521393acc893df2e5c56628d0491ca872e84584095a3ac0925027ac760713`).
