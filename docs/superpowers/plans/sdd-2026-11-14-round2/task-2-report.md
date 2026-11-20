# Laporan Task 2 — Ronde 2: Corner radius drag mouse (T2)

- **Status: DONE**
- **Working copy:** `/home/hatch/workspace/geovanta-round2/` (bukan repo git)
- **Skill dipakai:** `systematic-debugging` (Fase 1 reproduksi + hipotesis tunggal + bukti angka dulu),
  `test-driven-development` (probe RED dulu, baru GREEN), `verification-before-completion`
  (klaim hanya dari run segar; semua angka di bawah dihitung ulang dari addend).
- **Baseline:** `npm test` 275/275 PASS, 0 fail (sebelum kerja); `npm run build:web` exit 0.
- **Server probe:** `cd web && python3 -m http.server 8931` → `http://127.0.0.1:8931/`
  (port 8931, sama seperti T1).

## 1. Hipotesis tunggal (terbukti)

> **Scrub label ◜ / tahan tombol step memanggil `setRadius` dari closure render
> saat pointerdown; sesudah pointermove pertama membuat fillet, id node apex
> lama sudah diganti pasangan fillet ber-id baru — sehingga semua pemanggilan
> berikutnya memakai `sel.nodes` + `detectedCorners` basi, engine
> `setSelectedNodesRadius` tidak menemukan id node (`cnt=0`, `res.o===o`),
> `commitObjs` mengembalikan false → toast "Sudut tidak cukup panjang untuk
> radius tersebut" + nilai field mental. Ketik berhasil karena satu panggilan
> segar; klik step tunggal berhasil karena tiap klik mengambil closure baru.**

Hipotesis awal plan ("begitu radius melewati maksimum SATU sudut, `commitObjs`
false") **terbukti salah sebagai mekanisme utama**: kegagalan terjadi sejak
pointermove ke-2 pada radius kecil (10), jauh di bawah maksimum (46,8).
Engine SUDAH menjepit per-sudut dengan benar (ketik 200 → 46,8, tanpa toast);
yang rusak adalah resolusi target di jalur gesture kontinu, bukan clamp.

## 2. Reproduksi (Fase 1, sebelum edit apa pun)

Probe Playwright baru `probes/probe-r2-t2-radius-drag.cjs` (pola T1: seed
prefs localStorage, condition-based waits, pointer mouse nyata, 0 pageerror).
Tiap kasus: buat shape via shape picker + drag canvas, lalu bandingkan
**ketik nilai** vs **drag scrub** vs **tombol step**. Scrub = drag label ◜
ke kanan dengan Shift (mult ×10): dx=+40 → `next=200`, sama dengan nilai
ketik pembanding (200) sehingga keduanya harus dijepit ke maksimum yang sama.

| Kasus | Ketik 200 (kontrol) | Scrub ◜ (Shift, dx+40) | Toast sesudah scrub |
|---|---|---|---|
| Rect kecil (~78×78 doc, W/H inspector 156,86 layar? — rect doc ≈78,3) | field **46,8** | field **10** (hanya pointermove pertama: dx=2 → 1×10) | **"Sudut tidak cukup panjang untuk radius tersebut"** |
| Bintang 5 | field **29** | field **9,9** | toast penolakan |
| Oktagon (8 node, "lingkaran") | field **93,8** | field **10** | toast penolakan |
| Tombol step, 5× klik tunggal | field **5** (lolos — closure segar tiap klik) | — | — (bacaan toast pada langkah ini kemungkinan sisa toast scrub, lihat §6) |
| Tombol step, tahan ~700 ms | — | field **1** (hanya bump pertama; semua tick interval 55 ms gagal) | toast penolakan |

Bukti angka level engine (skrip `/tmp/r2-t2-engine-check.cjs`, esbuild dari
`src/engine/cornerFilletEngine.jsx`, rect 40×40, mode circular):

| Panggilan | Hasil |
|---|---|
| fillet r=10, id apex `n1..n4` | `cnt=4`, 8 node, `filR=[10,10,10,10]` |
| r=20 dengan **id apex BASI** (closure scrub lama) | **`cnt=0`, `sameObj=true`** → `commitObjs` false → toast |
| r=20 dengan **id pasangan fillet SEGAR** | `cnt=8`, objek baru, `filR=[19,6,19,6,19,6,20]` |
| r=200 dengan id segar | `cnt=8`, objek baru, `filR=[19,6,19,6,19,6,36,8]` (clamp, bukan tolak) |

Rantai penyebab lengkap (semua diverifikasi via baca kode + angka di atas):

1. `TransformField.jsx: startScrub` menutup `on` (= `setRadius` render saat
   pointerdown) dan memanggilnya tiap pointermove; `startStepHold` menutup
   `bump` yang sama untuk tick interval.
2. `VectorEditor.jsx: setRadius` (lama) membaca `sel.nodes` (state render)
   dan `detectedCorners` (useMemo render) — keduanya basi sesudah fillet
   pertama mengganti id node.
3. `applyRadiusToCorners` meneruskan id apex basi ke
   `setSelectedNodesRadius`; engine tidak menemukan id → `cnt=0` →
   `o: cnt ? {...o, subs} : o` mengembalikan objek lama.
4. `commitObjs` (`r !== o`) → `ch=false` → `if (!ch && rad > 0) say('Sudut
   tidak cukup panjang untuk radius tersebut')`.

## 3. Perbaikan di akar (diff minimal, 1 file produksi + 1 file tes)

**File diubah:**

- `src/components/editor/VectorEditor.jsx` — 47 baris berubah (diff vs `.bak-t2`):
  - Memo `detectedCorners` diekstrak menjadi fungsi murni
    `buildDetectedCorners(targets, indivOpen)` (isi sama persis, hanya
    `cornerTargets`→`targets`, `indivCornerOpen`→`indivOpen`); memo kini
    `React.useMemo(() => buildDetectedCorners(cornerTargets, indivCornerOpen), …)`
    sehingga perilaku render **tidak berubah**.
  - `setRadius` tidak lagi memakai `sel.nodes` / `detectedCorners` /
    `activeCorners` dari closure render, melainkan menurunkan ulang target
    dari `docRef.current` + `selRef.current` (keduanya sinkron — `setSel`
    memperbarui `selRef` secara sinkron, `commit`/`commitObjs` memakai
    `docRef`): `freshSelObjs` → `freshTargets` (logika `cornerTargets`
    yang sama) → `freshCorners = buildDetectedCorners(...)` →
    `nodeMatched` / `freshActive` / fallback `freshCorners`. Cabang
    fallback `setCornerRadius` (tanpa sudut terdeteksi) tidak diubah —
    di sana belum ada fillet sehingga tidak ada kebasian id.
  - `TransformField.jsx` **tidak diubah**: dengan `setRadius` yang
    me-resolve segar di tiap panggilan, closure lama menjadi tidak berbahaya
    untuk radius. (Kelas laten yang sama pada XfField lain dicatat di §6.)
  - Tanpa `!important`/offset/z-index/klip baru, tanpa dependensi baru,
    tanpa ubah label/i18n. `autoRefineGeometry.jsx` dan
    `cornerFilletEngine.jsx` tidak disentuh.
- `tests/corner-clamp.test.cjs` — +2 tes (43 baris berubah vs `.bak-t2`):
  - `(g)` id apex BASI sesudah fillet → no-op (`cnt=0`, objek sama) —
    mengunci kontrak engine yang membuat UI wajib me-resolve ulang id.
  - `(h)` id pasangan fillet SEGAR → refillet jalan, radius 200 dijepit
    ke `[19.6, 19.6, 19.6, 36.8]` tanpa penolakan — jalur drag sesudah fix.

**Backup:** `src/components/editor/VectorEditor.jsx.bak-t2`,
`tests/corner-clamp.test.cjs.bak-t2` (tidak ikut ZIP).

## 4. TDD RED → GREEN (probe Playwright, 12 asersi)

Probe: `probes/probe-r2-t2-radius-drag.cjs [before|after]`
(screenshot `probes/shots/r2-t2-radius-<mode>.png`).

| Run | Hasil | Gagal |
|---|---|---|
| RED (`before`, sebelum fix) | **5/12 lolos** | T1, T2, T4, T5, T7a, T6, T7b (semua asersi drag/tahan-step; ketik, klik-step, pageerror lolos) |
| GREEN (`after`, sesudah fix) | **12/12 lolos** | — |
| GREEN ulang (determinisme) | **12/12 lolos** | — |

Angka GREEN (`after`):

| Asersi | Hasil |
|---|---|
| T0 ketik 200 rect → clamp maksimum | field **46,8** |
| T1 rect scrub → == nilai ketik | **46,8 == 46,8** |
| T2 rect scrub tanpa toast | toast `""` |
| T3 5× klik step | field **5** |
| T4 tahan step ~700 ms | field **8** (>5), toast `""` |
| T5 bintang scrub → == nilai ketik | **29 == 29**, tanpa toast |
| T6 oktagon scrub → == nilai ketik | **93,8 == 93,8**, tanpa toast |
| T7a/T7b tanpa toast penolakan (bintang/oktagon) | lolos |
| T8 0 pageerror | `[]` |

## 5. Regresi

- `npm test` penuh sesudah fix: **277/277 PASS, 0 fail**
  (275 baseline + 2 tes baru (g)/(h); `corner-clamp.test.cjs` sendiri 8/8).
- `npm run build:web`: exit 0 (dijalankan ulang sebelum probe GREEN).

## 6. Screenshot before/after

- Before (RED): `probes/shots/r2-t2-radius-before.png` — oktagon field **10**,
  toast **"Sudut tidak cukup panjang untuk radius tersebut"** terlihat di
  bawah canvas, sudut oktagon nyaris tajam.
- After (GREEN): `probes/shots/r2-t2-radius-after.png` — oktagon membulat
  penuh, field **93,8**, tanpa toast.

## 7. Concerns / hal yang belum terverifikasi

1. **Quirk cap asimetris pra-ada (bukan bagian T2, tidak diperbaiki):**
   `setSelectedNodesRadius` Tahap B menghitung `cap1/cap2` dari
   `newSelIds` yang bermutasi selama loop — sudut terakhir yang diproses
   mendapat cap 0,92×sisi, tiga sudut lain 0,49×sisi (rect 40×40, r=20 →
   `filR=[19.6,19.6,19.6,20]`; r=200 → `[19.6,19.6,19.6,36.8]`). Field
   menampilkan rata-rata sehingga tampak konsisten (46,8 / 93,8), tapi
   keempat sudut TIDAK simetris sempurna. Perlu keputusan produk apakah
   cap harus simetris (mis. hitung semua cap dari snapshot `newSelIds`
   awal) — di luar scope T2.
2. **Cabang Individual Corner (panel sudut per-sudut) belum ter-probe:**
   jalur `freshActive` (branch `cr-sel`) diubah dengan pola yang sama,
   tapi probe tidak membuka panel Individual Corner; hanya dibaca dari
   kode. Butuh probe/re-test user bila panel itu dipakai saat scrub.
3. **Kelas laten di `TransformField.jsx` masih ada untuk field lain:**
   `startScrub`/`startStepHold` tetap menutup `on` dari render pointerdown.
   Untuk radius ini sudah tidak berbahaya (fix di `setRadius`), tapi field
   lain (W/H/Opacity, via `setProp` dkk.) berpotensi punya kebasian state
   serupa saat scrub — belum diverifikasi, di luar scope T2.
4. **Bacaan toast T3 pada run RED ambigu:** toast yang tersampel sesudah
   5× klik step kemungkinan sisa toast scrub (hidup 2200 ms, jeda antar
   langkah < 2200 ms). Asersi T3 sendiri tidak memakai toast, jadi tidak
   memengaruhi verdict; dicatat agar tidak dibaca sebagai "klik step
   memunculkan toast".
5. **Kasus (a) brief "lingkaran 8 node":** dipenuhi via oktagon (8 node
   corner). Ellipse tool (4 node smooth + handle) TIDAK diuji — di sana
   `detectedCorners` kosong sehingga jalurnya `setCornerRadius` dengan
   toast berbeda ("Tidak ada sudut…"), di luar laporan user; bila user
   maksudnya ellipse, itu tugas terpisah.
6. **Belum terverifikasi:** re-test user di browser asli (termasuk mouse
   hardware frekuensi tinggi — probe memakai langkah Playwright; 2× run
   GREEN deterministik, tapi bukan pengganti uji user), dan perilaku
   scrub radius 0 → kembali tajam via drag kiri (kode engine mendukung,
   tidak di-probe).
