# Laporan — Ronde 3, Task T3: Tukar posisi tombol Find and Replace ↔ Recolor

- **Brief:** `docs/superpowers/plans/sdd-2026-11-15-round3/task-3-brief.md`
- **Status:** DONE
- **Skill yang dipakai:** `ui-ux-fixer-and-improvement` (diagnosis sistematis berbasis prinsip desain universal — untuk task ini, perubahan murni urutan DOM tanpa sentuhan token/style, jadi audit 7 pilar tidak menemukan pelanggaran baru), `test-driven-development` (probe RED dulu, GREEN sesudah), `browser_ui_fix_verification` (verifikasi di browser nyata via Playwright + Chromium 1255, ukur posisi X hasil render), `verification-before-completion` (tidak ada klaim tanpa perintah segar).
- **Tanggal:** 2026-11-15

## 1. Yang diimplementasikan

Di sidebar kanan, seksi **Selection Colors**, baris tombol F&R/Recolor
(`src/components/editor/EditorRightInspector.jsx:509`): urutan DOM kedua
tombol ditukar — **Recolor dulu, Find and Replace sesudah**.

Sebelum:

```jsx
<button … data-tip="frOpen" data-testid="fr-open-selcolors" onClick={() => setFrOpen(v => !v)}><Ico n="refresh" size={11} /> {L.frOpenBtn}</button><button … data-tip="rcOpen" data-testid="rc-open-selcolors" onClick={() => setRcOpen(v => !v)}><Ico n="palette" size={11} /> {L.rcOpenBtn}</button>
```

Sesudah: kedua elemen `<button …>…</button>` yang sama, hanya posisinya
bertukar (Recolor — `rc-open-selcolors`, ikon `palette` — menjadi anak
pertama baris; F&R — `fr-open-selcolors`, ikon `refresh` — menjadi anak
kedua).

Tidak ada yang berubah selain urutan DOM:

- `data-testid`, `data-tip`, ikon (11px), label (`{L.frOpenBtn}` /
  `{L.rcOpenBtn}`), handler (`setFrOpen` / `setRcOpen` toggle),
  `flex: 1`, padding `6px 10px`, `whiteSpace: 'nowrap'`,
  `display: 'inline-flex'`, `alignItems: 'center'`,
  `justifyContent: 'center'`, `gap: 2` — semua identik, byte-per-byte
  (diff 1 baris, hanya urutan dua elemen).
- Baris Select Same di bawahnya (`sel-same-fill` / `sel-same-stroke` /
  `sel-same-type`) tidak disentuh — ranah T8.
- Logika buka/tutup seksi F&R/Recolor (snapshot/preview/commit) tidak
  disentuh.
- Pasangan tombol F&R/Recolor di seksi **Color Styles**
  (`fr-open-styles` / `rc-open-styles`, baris ~360) TIDAK disentuh —
  brief hanya mencakup baris Selection Colors.
- Selektor T1 (`.fig-rail-grp`) dan T2 (`.ws-nav-item.on .ws-nav-ico`)
  tidak disentuh.
- Tanpa `!important` / offset / z-index / klip baru; tanpa dependensi
  baru; tanpa ubah label/i18n; tanpa text-wrap.

### Verifikasi peta kode (sebelum edit)

- `grep -n "fr-open-selcolors\|rc-open-selcolors"` →
  satu-satunya kemunculan di `EditorRightInspector.jsx:509`, F&R dulu
  (`frIdx 0`), Recolor sesudah (`rcIdx 1`) — sesuai brief.
- `grep` memastikan pasangan `fr-open-styles`/`rc-open-styles` adalah
  baris terpisah (seksi Color Styles) dan tidak ikut diubah.

## 2. Bukti TDD — RED dulu, GREEN sesudah

Probe baru: `probes/probe-r3-t3-swap-fr-rc.cjs` (pola harness
`probe-r2-t3-selsame-buttons.cjs`: proyek baru, gambar 1 elips agar
Selection Colors tampil; Playwright `playwright-core` dari
`/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255;
server statis milik sendiri port **8985**, `R3_T3_URL`).

Asersi probe (7):

| ID | Asersi |
|----|--------|
| A1 | Urutan DOM: Recolor mendahului F&R di baris yang sama (`rcIdx < frIdx`, `compareDocumentPosition` FOLLOWING) |
| A2 | Posisi X hasil render: `rc.x < fr.x`, `\|rc.y − fr.y\| ≤ 1` |
| A3 | Identitas tidak berubah: `data-tip` frOpen/rcOpen, ikon `refresh`/`palette` (path `d` verbatim), padding `6px 10px`, `flexGrow 1`, label beda & tak kosong |
| A4 | Klik Recolor → `[data-testid="rc-section"]` tampil |
| A5 | Tutup Recolor via `rc-close`, klik F&R → `[data-testid="fr-section"]` tampil, tutup via `fr-close` |
| A6 | Baris Select Same di bawahnya tidak berubah (`["sel-same-fill","sel-same-stroke","sel-same-type"]`) |
| A7 | 0 pageerror |

### RED (pra-fix) — perintah

```bash
cd ~/workspace/geovanta-round2
npm run build:web
python3 -m http.server 8985 --directory web   # background
R3_T3_URL=http://127.0.0.1:8985/ node probes/probe-r3-t3-swap-fr-rc.cjs before
```

Output (ringkas, verbatim dari run):

```text
  info order: {"sameRow":true,"rcIdx":1,"frIdx":0,"rcX":1301.5,"frX":1177,"rcY":1363,"frY":1363}
  info labels: {"fr":"Find & Replace","rc":"Recolor"}
FAIL A1 urutan DOM: Recolor mendahului F&R di baris yang sama | actual={"sameRow":true,"rcIdx":1,"frIdx":0,"rcBeforeFr":false} expected=sameRow=true rcIdx<frIdx rcBeforeFr=true
FAIL A2 posisi X: Recolor di kiri F&R (baris sama, y sama) | actual={"rcX":1301.5,"frX":1177,"rcY":1363,"frY":1363} expected=rcX<frX, |rcY-frY|<=1
PASS A3 identitas tidak berubah (tip, ikon, padding 6px 10px, flex:1, label)
PASS A4 klik Recolor membuka seksi Recolor
PASS A5 tutup Recolor lalu F&R membuka seksi Find & Replace
PASS A6 baris Select Same di bawahnya tidak berubah
screenshot: /home/hatch/workspace/geovanta-round2/probes/shots/r3-t3-swap-fr-rc-before.png
PASS A7 0 pageerror

R3-T3 before: 5/7 lolos | GAGAL: A1, A2
```

RED tepat pada asersi yang ditarget (A1, A2) dan hanya pada keduanya —
A3–A7 sudah hijau pra-fix, membuktikan probe mengukur urutan, bukan
perilaku lain. Screenshot `before` diambil dari state pra-fix.

### GREEN (pasca-fix) — perintah

```bash
cd ~/workspace/geovanta-round2
npm run build:web
R3_T3_URL=http://127.0.0.1:8985/ node probes/probe-r3-t3-swap-fr-rc.cjs after
```

Output (ringkas, verbatim dari run):

```text
PASS A1 urutan DOM: Recolor mendahului F&R di baris yang sama | actual={"sameRow":true,"rcIdx":0,"frIdx":1,"rcBeforeFr":true} expected=sameRow=true rcIdx<frIdx rcBeforeFr=true
PASS A2 posisi X: Recolor di kiri F&R (baris sama, y sama) | actual={"rcX":1177,"frX":1301.5,"rcY":1363,"frY":1363} expected=rcX<frX, |rcY-frY|<=1
PASS A3 identitas tidak berubah (tip, ikon, padding 6px 10px, flex:1, label)
PASS A4 klik Recolor membuka seksi Recolor | actual=rc-section tampil sesudah klik Recolor
PASS A5 tutup Recolor lalu F&R membuka seksi Find & Replace | actual=rc-section tertutup via rc-close; fr-section terbuka lalu tertutup via fr-close
PASS A6 baris Select Same di bawahnya tidak berubah
screenshot: /home/hatch/workspace/geovanta-round2/probes/shots/r3-t3-swap-fr-rc-after.png
PASS A7 0 pageerror | actual=[] expected=[]

R3-T3 after: 7/7 lolos | SEMUA LOLOS
```

Probe exit code 0. Posisi X bertukar persis (`rcX 1177`, `frX 1301.5`
— nilai yang sebelumnya milik tombol lain), y tetap sama (1363):
tombol bertukar tempat tanpa pergeseran layout lain.

### Verifikasi visual screenshot

- `probes/shots/r3-t3-swap-fr-rc-before.png` (98.879 B): baris
  Selection Colors menampilkan **Find & Replace | Recolor**.
- `probes/shots/r3-t3-swap-fr-rc-after.png` (98.922 B): baris yang sama
  menampilkan **Recolor | Find & Replace**. Kedua screenshot dibaca
  langsung (visual check): selain urutan dua tombol itu, seluruh
  tampilan identik — baris Select Same, daftar warna, Auto layout
  tidak berubah.

## 3. Regresi

### Suite penuh — perintah

```bash
cd ~/workspace/geovanta-round2 && npm test
```

- Pra-fix (baseline): `tests 277, pass 277, fail 0` (durasi ~22,0 dtk).
- Pasca-fix: `tests 277, pass 277, fail 0` (durasi ~22,2 dtk).

```text
ℹ tests 277
ℹ suites 0
ℹ pass 277
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 22165.824714
```

### Status probe Ronde 2 T3 (yang dikhawatirkan mengunci urutan lama)

**TIDAK ada regresi yang diharapkan — probe R2 T3 TIDAK mengunci urutan
lama.** Diperiksa isi `probes/probe-r2-t3-selsame-buttons.cjs` (B1–B11):
tidak satu pun asersi membandingkan urutan DOM F&R vs Recolor. B3 hanya
memeriksa keduanya di baris yang sama, `flexGrow 1`, lebar sama, dan
`frW + rcW + gap == rowW` — semuanya agnostik terhadap urutan. Bukti
empiris, dijalankan terhadap build pasca-fix di server yang sama:

```bash
R2_T3_URL=http://127.0.0.1:8985/ node probes/probe-r2-t3-selsame-buttons.cjs after
```

```text
PASS B1 F&R TIDAK di dalam .fig-isec-title
PASS B2 Recolor TIDAK di dalam .fig-isec-title
PASS B3 F&R+Recolor baris sendiri di bawah judul (flex-wrap, flex:1, terisi penuh)
PASS B4 padding kelima tombol 6px 10px
PASS B5 ikon ADA + identitas path d cocok pada kelima tombol
PASS B6 lebar baris F&R/Recolor == lebar konten seksi (±1px)
PASS B7 tidak ada overflow/clip (seksi + tombol di dalam seksi)
PASS B8 label tidak diperkecil di bawah 10px
PASS B9 2 baris warna + ◎ tidak berubah (satu baris #0D99FF)
PASS B11 F&R membuka seksi + Select Same Fill -> toast
PASS B10 0 pageerror

R2-T3 after: 11/11 lolos | SEMUA LOLOS
```

Probe R2 T3 **tidak diubah** (tidak ada kebutuhan menyembunyikan
apa pun — memang tidak ada asersi urutan di dalamnya).

### Probe R3 T1 / T2 (tetap hijau)

```bash
R3_T1_URL=http://127.0.0.1:8985/ node probes/probe-r3-t1-rail-border.cjs after
# R3-T1 after: 7/7 lolos | SEMUA LOLOS
R3_T2_URL=http://127.0.0.1:8985/ node probes/probe-r3-t2-wsnav-accent.cjs after
# R3-T2 after: 10/10 lolos | SEMUA LOLOS
```

## 4. File yang diubah

| File | Perubahan | Backup |
|------|-----------|--------|
| `src/components/editor/EditorRightInspector.jsx` | Baris 509: dua tombol `<button>` ditukar urutannya; diff 1 baris (`509c509`), tidak ada baris lain berubah | `src/components/editor/EditorRightInspector.jsx.bak-r3t3` (md5 `5e4981fa327f6147751a352b9b5c9c36`, identik dengan pra-edit; dibuat SEBELUM edit pertama) |
| `probes/probe-r3-t3-swap-fr-rc.cjs` | **Baru** — probe TDD 7 asersi (A1–A7) | — (file baru, bukan edit) |
| `probes/shots/r3-t3-swap-fr-rc-before.png` | **Baru** — screenshot pra-fix | — |
| `probes/shots/r3-t3-swap-fr-rc-after.png` | **Baru** — screenshot pasca-fix | — |

Build artifact `web/` di-regenerate dua kali (`npm run build:web`:
pra-fix untuk RED, pasca-fix untuk GREEN) — hasil build, bukan source
yang diedit manual. Server statis port 8985 sudah dimatikan sesudah
semua probe selesai (curl pasca-kill: 000 / exit 7, tidak ada proses).

## 5. Angka tripwire bundle

Tidak ada perubahan (tugas ini tidak menyentuh CSS/AST sama sekali —
murni swap DOM di JSX). Dihitung ulang sebelum dan sesudah dengan
metode yang sama seperti T1/T2 (`TAILWIND_PLUGIN_AST` di
`src/vendor/tailwindOfflineBundle.jsx`):

| Tripwire | Baseline berjalan (brief) | Sesudah T3 | Δ |
|----------|---------------------------|------------|---|
| Aturan AST total | 841 | **841** | 0 |
| `!important` | 356 | **356** | 0 |
| `acc-deep` | 5 | **5** | 0 |

## 6. Self-review (baca ulang diff dengan mata segar)

1. **Diff minimal & tepat sasaran:** `diff` bak vs hasil hanya
   `509c509` — satu baris, dua elemen `<button>` bertukar posisi.
   Tidak ada karakter lain yang berubah di baris itu (verifikasi
   dengan membaca diff lengkap: Select Same row, `sel-col-list`,
   dan sisa baris 509 identik).
2. **Tiap tombol utuh:** `grep -o` memastikan masing-masing testid
   muncul tepat 1× (`fr-open-selcolors` 1, `rc-open-selcolors` 1);
   A3 probe memverifikasi `data-tip`, path `d` ikon, padding,
   `flexGrow`, dan label tiap tombol tidak berubah.
3. **Bukan baris yang salah:** pasangan `fr-open-styles` /
   `rc-open-styles` (seksi Color Styles) tidak tersentuh — diff hanya
   baris 509.
4. **Tidak ada selektor T1/T2 tersentuh:** tidak ada edit CSS; tripwire
   841/356/5 tidak berubah.
5. **Perilaku buka/tutup:** A4/A5 membuktikan klik Recolor membuka
   `rc-section`, `rc-close` menutupnya, lalu klik F&R membuka
   `fr-section` dan `fr-close` menutupnya — mekanisme snapshot/preview
   lintas seksi tetap jalan tanpa perubahan logika.
6. **Satu catatan kecil (bukan temuan):** `node --check` pada file
   `.jsx` gagal dengan `ERR_UNKNOWN_FILE_EXTENSION` — itu perilaku
   yang diharapkan (file JSX bukan JS murni), bukan masalah; validasi
   sintaks yang berlaku adalah `npm run build:web` (exit 0) dan
   `npm test` 277/277.

## 7. Issue / concern

- **Tidak ada concern.** Peringatan brief tentang probe R2 T3 yang
  mungkin mengunci urutan lama **tidak terbukti**: setelah dibaca
  dan dijalankan, probe R2 T3 11/11 hijau pasca-fix — tidak ada
  asersi urutan di dalamnya dan tidak ada regresi yang diharapkan
  untuk dilaporkan. Probe R2 T3 tidak diubah.
- Server port 8985 sudah dimatikan; tidak ada proses latar yang
  tertinggal dari task ini.
