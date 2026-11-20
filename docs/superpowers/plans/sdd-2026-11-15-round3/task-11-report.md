# Laporan — Ronde 3, Task T11: Mode Fill — ikon 5 tombol + width 100% + flex-wrap

- Brief: `docs/superpowers/plans/sdd-2026-11-15-round3/task-11-brief.md`
- Plan: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` (§ T11)
- Status: **DONE** — probe 25/25, regresi T9 34/34 + T10 15/15, `npm test` 277/277, 0 pageerror.
- Skill yang dipakai (SKILL.md dibaca dulu): `ui-ux-fixer-and-improvement`
  (audit 7 pilar; tanpa text-wrap, tanpa magic offset), `test-driven-development`
  (probe RED dulu), `browser_ui_fix_verification` (Playwright asli, layout diukur),
  `verification-before-completion` (klaim hanya dari run baru).
- Lingkungan probe: Playwright-core
  `/home/hatch/workspace/vector-editor/node_modules/`, Chromium 1255
  (`~/.cache/ms-playwright`), build `npm run build:web`, server statis `web/`
  port **9009** (`http://127.0.0.1:9009/`, dimatikan sesudah verifikasi),
  viewport 1440×900, prefs `lang: 'id'`, tema light.

## 1. Pilihan ikon per tombol (semua dari set yang SUDAH ADA — tanpa path baru)

Sumber ikon: `ICONS` di `src/constants/brandAndIcons.jsx` (48 nama). Tidak ada
ikon gradien khusus di set tersebut, jadi tiap mode memakai ikon terdekat yang
paling terbaca pada 13 px. Probe mengasersi path `d` persis per tombol
(F3-solid … F3-none), jadi pemetaan ini terverifikasi di browser, bukan klaim.

| Tombol | Ikon (`ICONS`) | Alasan |
| --- | --- | --- |
| Solid | `drop` | Tetesan cat — warna solid tunggal, asosiasi paling langsung dengan "isi warna polos". |
| Linear | `wind` | Tiga garis horizontal sejajar — paling dekat dengan pita/arah linier; tidak ada ikon panah/gradien di set ini. Ini **pilihan terdekat, bukan ikon ideal** — garisnya terbaca jelas pada 13 px, tapi tidak menggambarkan arah gradien secara harfiah. |
| Radial | `detect` | Lingkaran konsentris + braket sudut (target) — titik pusat tempat warna memancar keluar, persis model radial. |
| Angular | `refresh` | Panah melingkar — sapuan/rotasi mengelilingi pusat, persis model conic/angular. |
| Kosong (`none`) | `x` | Silang — konvensi universal "kosong/tidak ada isi". |

Tidak ada tombol yang dibiarkan tanpa ikon, dan tidak ada path ikon baru yang
digambar. Catatan jujur: untuk Linear tidak ada ikon yang benar-benar
menggambarkan gradien linier di set yang ada; bila reviewer menginginkan ikon
yang lebih harfiah (mis. panah dua arah), itu butuh path baru + persetujuan
reviewer — di luar scope tugas ini.

## 2. Diff (minimal — 2 file produk, tanpa sentuh `.gch` global)

Backup dibuat SEBELUM edit pertama tiap file: `*.bak-r3t11` di samping file
aslinya.

### `src/components/ui/SegmentedControl.jsx` — baris 25–52 (GradChoice)

- Opsi menjadi `[k, label, ikon?]` — elemen ke-3 opsional, **konvensi yang sama
  persis seperti `Seg`** di file yang sama. Tanpa elemen ke-3, tidak ada ikon
  yang dirender (perilaku default tak berubah).
- Prop baru **`fillWrap`** (hanya dipakai instance Mode Fill):
  - container: `display: 'flex', flexWrap: 'wrap'` (inline style menimpa
    `.gch { display: grid }` dari bundle — tanpa `!important`, tanpa edit
    `tailwindOfflineBundle.jsx`); class tambahan `gch-fill`.
  - tiap tombol: `flex: '1 1 auto', whiteSpace: 'nowrap', gap: 4` (gap =
    jarak ikon–label).
  - Tanpa `fillWrap`, container dan tombol memakai jalur lama apa adanya
    (grid + tanpa ikon + tanpa inline style).
- Label dibungkus `<span>` (sama seperti `Seg`) supaya ikon + label menjadi
  dua flex item yang rapi; tidak mengubah tampilan instance lain (span inline
  di dalam tombol flex yang sudah `justify-content: center`).

### `src/components/editor/GradientEditorPanel.jsx` — baris 244 (1 baris)

- Instance Mode Fill saja: tambah `fillWrap` + ikon per opsi:
  `['solid','Solid','drop'], ['linear','Linear','wind'],
  ['radial','Radial','detect'], ['angular', L.gradAngular || 'Angular','refresh'],
  ['none', L.gradNone,'x']`.
- `cols={3}` dipertahankan (tidak dipakai saat `fillWrap` aktif, tapi
  dibiarkan agar diff minimal); label/i18n/tips tidak berubah.
- Instance gradInterp (`cols={2}`, ~:417) dan Spread Method (`cols={3}`) **tidak
  disentuh** — tanpa `fillWrap`, tanpa ikon.

### Temuan selama GREEN (dicatat jujur, bukan disembunyikan)

Upaya GREEN pertama memakai `flex: '1 1 0'` (sesuai contoh di brief) — probe
menangkap 2 kegagalan nyata: **F2** (svg ikon lebar 0 px) dan **F9**
(`Angular` scrollWidth 46 > clientWidth 44). Akar masalah: basis 0 +
`.gch button { min-width: 0 }` membuat kelima tombol terjepit dalam SATU baris
(43,8 px tiap tombol), ikon SVG ter-compress ke lebar 0 dan label meluber.
Perbaikan: `flex: '1 1 auto'` — basis = lebar konten, sehingga baris pecah
berdasar lebar basis (3 tombol baris 1, 2 tombol baris 2), lalu `flex-grow: 1`
mengisi tiap baris sampai penuh. Sesudah perubahan ini probe 25/25. Pelajaran:
`flex: 1` mentah tidak cocok bila tombol membawa konten yang tak boleh
terjepit (ikon + label nowrap); basis konten adalah yang membuat wrap terjadi.

## 3. Probe TDD — `probes/probe-r3-t11-fill-icons.cjs` (25 asersi)

Cara pakai: `R3_T11_URL=http://127.0.0.1:9009/ node probes/probe-r3-t11-fill-icons.cjs`

Isi asersi: F1 label 5 tombol; F2 ikon `svg.ico` 13×13 di semua tombol;
F3-solid/linear/radial/angular/none path `d` persis per tombol; F4 container
`display:flex`; F5 `flex-wrap:wrap`; F6 `flex-grow:1` tiap tombol; F7
`white-space:nowrap`; F8 tinggi tombol ≤ 32 px (satu baris); F9
`scrollWidth ≤ clientWidth` (tidak meluber); F10 tiap baris visual mengisi
lebar konten ±2 px (tanpa sisa); F11 container mengisi lebar parent;
N1–N7 kontrol negatif (gradInterp + Spread tetap grid, tanpa ikon,
white-space normal, jumlah kolom tetap); B1 klik Linear (`.on` + bar gradien
tampil); B2 klik Solid (kembali + bar hilang); E0 0 pageerror.

Catatan probe: gradInterp + Spread hanya ada di DOM saat mode gradien aktif
(blok `{isGradient && g && ...}`), jadi kontrol negatif diukur SESUDAH klik
Linear. Dua bug probe yang ditemukan dan diperbaiki saat RED (bukan produk):
`gridTemplateColumns` ter-computed menjadi piksel (`115.5px 115.5px`), jadi
N4/N7 kini menghitung jumlah kolom, bukan regex `repeat(2,`.

### RED (pra-fix, build dari `.bak-r3t11`)

**14/25 lolos | GAGAL: F2, F3-solid, F3-linear, F3-radial, F3-angular,
F3-none, F4, F5, F6, F7, F10** (tepat 11 kegagalan yang diharapkan; semua
kontrol negatif + perilaku sudah hijau pra-fix).

Angka pra-fix yang terukur: container grid 3 kolom, `contentW=235`,
baris 2 hanya 155,3 px → **sisa 79,7 px**; `flexGrow=0`,
`whiteSpace=normal`, tanpa svg di semua tombol.

### GREEN (pasca-fix)

**25/25 lolos | SEMUA LOLOS** — diverifikasi dua kali dari build segar
(run GREEN pertama 23/25 → perbaikan `flex: 1 1 auto` → 25/25; lalu
restore `.bak` → RED 14/25 dikonfirmasi ulang → restore fix → GREEN 25/25
lagi).

Angka pasca-fix yang terukur (viewport 1440×900, `contentW=235`, gap 4):
baris 1 Solid 71,3 + Linear 78,2 + Radial 77,5 = 235,0 px (sisa 0);
baris 2 Angular 116,6 + Kosong 114,4 = 235,0 px (sisa 0); ikon 13×13 di
kelima tombol; tinggi tombol 29 px; `scrollWidth == clientWidth` tiap tombol.
gradInterp tetap grid 2 kolom tanpa ikon; Spread tetap grid 3 kolom tanpa ikon.

### Screenshot (close-up panel Mode Fill, elemen yang sama)

- Before (pra-fix, asli — diambil dari build `.bak` via skrip satu-kali
  `/tmp/r3t11-before-shot.cjs` karena probe menimpa file ini tiap run):
  `probes/shots/r3-t11-fill-before.png` — tanpa ikon, grid 3 kolom, baris 2
  menyisakan ±80 px kosong di kanan.
- After (pasca-fix): `probes/shots/r3-t11-fill-after.png` — ikon di kelima
  tombol, baris 2 mengisi penuh lebar container.
- Verifikasi visual manual: kedua gambar dibaca — before/after berbeda sesuai
  klaim; ikon terbaca pada ukuran screenshot (drop, garis wind, target,
  panah melingkar, silang).

## 4. Regresi + verifikasi akhir (semua dari run baru, port 9009)

| Pemeriksaan | Hasil |
| --- | --- |
| Probe T11 `probe-r3-t11-fill-icons.cjs` | **25/25**, 0 pageerror |
| Regresi T9 `probe-r3-t9-cinp.cjs` (GradChoice di panel yang sama) | **34/34**, 0 pageerror |
| Regresi T10 `probe-r3-t10-last-color.cjs` | **15/15**, 0 pageerror |
| `npm test` | **277 pass / 0 fail** (22 s) |
| `npm run build:web` | exit 0, aset offline siap |

## 5. Yang belum teruji (jujur)

- **Hanya headless Chromium 1255** (SwiftShader) pada viewport 1440×900.
  Lebar sidebar/inspector lain (jendela lebih sempit) tidak diuji — dengan
  `flex: 1 1 auto`, baris akan pecah lebih awal bila container menyempit
  (mis. 2+2+1), dan tiap baris tetap mengisi penuh; belum diukur di lebar lain.
- **Hanya bahasa ID** (`lang: 'id'`, label "Kosong"). Mode EN ("Empty",
  lebih pendek) tidak diuji di browser — secara konstruksi lebih pendek
  sehingga tidak berisiko meluber, tapi belum ada angka EN.
- **Hanya tema light, accent default `#0d99ff`.** Kontras ikon mengikuti
  `currentColor` (sama seperti teks tombol) — tidak ada perubahan warna.
- **Tidak ada re-test pengguna** (menunggu, seperti biasa).
- Ikon `wind` untuk Linear adalah pilihan terdekat, bukan ikon gradien
  harfiah (lihat §1) — bila reviewer mau path baru, itu keputusan terpisah.
