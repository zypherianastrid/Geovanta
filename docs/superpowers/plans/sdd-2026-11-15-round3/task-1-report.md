# Laporan — Ronde 3, Task T1: Hapus border `.fig-rail-grp`

- Status: **DONE**
- Working copy: `~/workspace/geovanta-round2/` (bukan git repo; "commit" = backup `.bak-r3t1` + laporan ini)
- Skill yang dipakai: `ui-ux-fixer-and-improvement` (diagnosis sistematis UI/UX berbasis prinsip desain universal — tanpa border tebal sebagai pemisah, tanpa magic offset, tanpa `!important` baru) dan `test-driven-development` (probe RED dulu, GREEN sesudah). `systematic-debugging` / `verification-before-completion` dipakai sebagai disiplin kerja (root cause dulu, klaim hanya dari perintah yang baru dijalankan); SKILL.md keduanya dibaca sebelum coding (`ui-ux-fixer-and-improvement`, `test-driven-development`).

## Yang diimplementasikan

Border `.fig-rail-grp` dinetralkan di **kedua** aturan yang mengaturnya di
`src/vendor/tailwindOfflineBundle.jsx` (baris 437, AST `TAILWIND_PLUGIN_AST`).
Nomor idx terverifikasi ulang dan **tidak bergeser** dari Ronde 2:

| idx AST | Selector | Sebelum | Sesudah |
|---|---|---|---|
| 494 | `.fig-rail-grp` (dasar) | `border: 1px solid transparent` | `border: none` |
| 794 | `.fig-rail-grp` (override M3) | `border: 1px solid rgba(15, 23, 42, 0.06) !important` | **deklarasi `border` dihapus** |
| 495 | `.fig-rail-grp:hover` | `border-color: var(--line)` | **tidak disentuh** (kini inert: tanpa border, `border-color` tidak me-render apa-apa) |

Pilihan "hapus deklarasi" untuk M3 (bukan `none !important`) disengaja: aturan
dasar kini sudah `border: none`, sehingga override M3 untuk border menjadi
mubazir — menghapusnya **mengurangi** jumlah `!important` sebanyak 1 alih-alih
mempertahankannya. Ini adalah satu-satunya sentuhan terhadap `!important` M3,
dan sifatnya penghapusan, bukan penambahan. Tidak ada `!important` baru.

Tidak diubah (sesuai brief):

- `border-radius: 0` (idx 494) dan `border-radius: 0 !important` (idx 794) — warisan Ronde 2.
- `box-shadow: none !important` (idx 794) — warisan Ronde 2.
- Selector lain apa pun (khususnya `.ws-nav-item*` ranah T2 dan `.dk-b.on`).
- Tanpa dependensi baru, tanpa ubah label/i18n, tanpa text-wrap, tanpa offset/z-index/klip baru.

Root cause (systematic-debugging): border yang ter-render pra-fix bukan dari
aturan dasar (`1px solid transparent` — tak terlihat) melainkan dari override
M3 idx 794 (`1px solid rgba(15,23,42,0.06) !important`) yang menang atas
dasar. Buktinya di RED: computed `border-top-color` ketiga grup persis
`rgba(15, 23, 42, 0.06)`. Karena itu menetralkan dasar saja tidak cukup;
M3 wajib ikut dinetralkan — dan memang itulah yang dilakukan.

Catatan kejujuran soal edit: pola string `["border","1px solid transparent"]`
muncul 7× dan pola M3 muncul 9× di file (selector lain memakai nilai border
yang sama), sehingga edit string mentah tidak aman. Edit dilakukan via parse
AST JSON → ubah tepat idx 494/794 → serialisasi ulang. Verifikasi round-trip:
`json.dumps` AST yang belum diubah identik byte-per-byte dengan aslinya,
dan diff AST pra vs pasca menunjukkan **hanya idx 494 dan 794 yang berbeda**
(aturan total tetap 841).

## Yang dites & hasil

Semua probe melawan hasil BUILD (`npm run build:web` dulu), disajikan via
server statis milik sendiri di port segar **8981**
(`python3 -m http.server 8981 --directory web`, `R3_T1_URL=http://127.0.0.1:8981/`),
Playwright `playwright-core` + Chromium 1255.

| Pemeriksaan | Hasil |
|---|---|
| Probe baru `probes/probe-r3-t1-rail-border.cjs` (after) | **7/7 PASS** |
| Probe Ronde 2 T1 `probes/probe-r2-t1-rail.cjs` (after, regresi) | **7/7 PASS** (radius 0px, shadow none, accent `#0d99ff` persis, toggle rail off→on OK) |
| `npm test` (suite penuh) | **277/277 PASS, 0 fail** |
| `npm run build:web` | exit 0, tanpa warning baru |

## Bukti TDD: RED → GREEN

### RED — sebelum implementasi (build pra-fix, probe baru)

Perintah:

```bash
cd ~/workspace/geovanta-round2
npm run build:web
R3_T1_URL=http://127.0.0.1:8981/ node probes/probe-r3-t1-rail-border.cjs before
```

Output (disingkat, lengkap di bawah):

```text
PASS B1 jumlah .fig-rail-grp | actual=3 expected=3
FAIL B2 semua .fig-rail-grp border-top-width 0px | actual=["1px","1px","1px"] expected=["0px","0px","0px"]
FAIL B3 semua .fig-rail-grp border-top-style none | actual=["solid","solid","solid"] expected=["none","none","none"]
FAIL B4 semua .fig-rail-grp border-top-color bukan warna border M3 lama | actual=["rgba(15, 23, 42, 0.06)","rgba(15, 23, 42, 0.06)","rgba(15, 23, 42, 0.06)"] expected=bukan "rgba(15, 23, 42, 0.06)"
PASS B5 regresi R2: semua .fig-rail-grp border-radius 0px | actual=["0px","0px","0px"]
PASS B6 regresi R2: semua .fig-rail-grp box-shadow none | actual=["none","none","none"]
PASS B7 0 pageerror | actual=[]
R3-T1 before: 4/7 lolos | GAGAL: B2, B3, B4   (exit 1)
```

Kegagalan persis seperti yang diharapkan: border 1px solid warna M3 masih
ter-render di ketiga grup; guard regresi R2 (B5/B6) sudah hijau pra-fix.

### Koreksi asersi B4 (perbaikan probe, bukan produk)

Versi pertama B4 mengharapkan computed `border-top-color == rgba(0,0,0,0)`.
Pada run GREEN pertama, B2/B3 sudah PASS tetapi B4 FAIL dengan actual
`rgb(15, 23, 42)`. Penyebabnya adalah ekspektasi probe yang salah, bukan
produk: dengan `border-style: none`, computed `border-color` jatuh ke
`currentcolor` (warna teks elemen, `rgb(15, 23, 42)`) — itu bukan border yang
ter-render; yang menentukan "border tak ter-render" adalah B2 (width 0px) +
B3 (style none). B4 diperbaiki menjadi: warna border **bukan** warna M3 lama
`rgba(15, 23, 42, 0.06)`. Asersi yang dikoreksi ini tetap membedakan pra vs
pasca fix, dan dibuktikan dengan mengulang RED memakai probe terkoreksi
(build pra-fix dipulihkan dari `.bak-r3t1`, lalu fix dikembalikan):

```text
R3-T1 before: 4/7 lolos | GAGAL: B2, B3, B4   (exit 1, probe terkoreksi, build pra-fix)
```

### GREEN — sesudah implementasi (build pasca-fix)

Perintah:

```bash
cd ~/workspace/geovanta-round2
npm run build:web
R3_T1_URL=http://127.0.0.1:8981/ node probes/probe-r3-t1-rail-border.cjs after
```

Output:

```text
PASS B1 jumlah .fig-rail-grp | actual=3 expected=3
PASS B2 semua .fig-rail-grp border-top-width 0px | actual=["0px","0px","0px"]
PASS B3 semua .fig-rail-grp border-top-style none | actual=["none","none","none"]
PASS B4 semua .fig-rail-grp border-top-color bukan warna border M3 lama | actual=["rgb(15, 23, 42)","rgb(15, 23, 42)","rgb(15, 23, 42)"]
PASS B5 regresi R2: semua .fig-rail-grp border-radius 0px | actual=["0px","0px","0px"]
PASS B6 regresi R2: semua .fig-rail-grp box-shadow none | actual=["none","none","none"]
PASS B7 0 pageerror | actual=[]
R3-T1 after: 7/7 lolos | SEMUA LOLOS   (exit 0)
```

### Regresi Ronde 2 T1 + suite

```bash
R2_T1_URL=http://127.0.0.1:8981/ node probes/probe-r2-t1-rail.cjs after
# R2-T1 after: 7/7 lolos | SEMUA LOLOS (exit 0) — A1 accent, A4 radius 0px, A5 shadow none, A7 toggle OK

npm test
# ℹ tests 277 / ℹ pass 277 / ℹ fail 0 (exit 0)
```

## File yang diubah

| File | Perubahan | Backup |
|---|---|---|
| `src/vendor/tailwindOfflineBundle.jsx` | idx 494 `border` → `none`; idx 794 deklarasi `border` dihapus (hanya 2 idx ini yang berbeda vs backup, terverifikasi via diff AST) | `src/vendor/tailwindOfflineBundle.jsx.bak-r3t1` (dibuat SEBELUM edit pertama) |
| `probes/probe-r3-t1-rail-border.cjs` | **Baru** — probe TDD B1–B7 (Playwright, pola `probe-r2-t1-rail.cjs`) | — (file baru, tanpa backup) |
| `probes/shots/r3-t1-rail-border-before.png` | Screenshot pra-fix (96.289 B) | — |
| `probes/shots/r3-t1-rail-border-after.png` | Screenshot pasca-fix (96.902 B) | — |
| `docs/superpowers/plans/sdd-2026-11-15-round3/task-1-report.md` | Laporan ini | — |

Catatan screenshot before: file `r3-t1-rail-border-before.png` ditulis dua
kali, **keduanya dari build pra-fix yang asli** (pengambilan pertama pada RED
awal; pengambilan kedua pada pengulangan RED dengan probe B4 terkoreksi,
saat build pra-fix dipulihkan dari `.bak-r3t1`). Isinya tetap tangkapan
state pra-fix; file tidak pernah ditulis ulang sesudah fix.

`web/` (output build) ikut ter-regenerasi oleh `npm run build:web` seperti
biasa; bukan edit manual.

## Angka tripwire bundle sesudah perubahan

Diukur pada `src/vendor/tailwindOfflineBundle.jsx` pasca-fix
(baseline awal Ronde 3: 841 aturan, `!important` 357, `acc-deep` 6):

| Metrik | Baseline | Sesudah | Δ |
|---|---|---|---|
| Aturan AST total | 841 | **841** | 0 |
| `!important` (grep seluruh file) | 357 | **356** | −1 (penghapusan deklarasi `border` M3; tanpa `!important` baru) |
| `!important` (hanya deklarasi AST) | 353 | **352** | −1 (konsisten; selisih 4 vs grep adalah `!important` di luar AST, tak berubah) |
| `acc-deep` (grep seluruh file) | 6 | **6** | 0 |

Tidak ada aturan yang bertambah; tidak ada justifikasi penambahan yang
diperlukan.

## Self-review

- **Kelengkapan:** brief minta netralkan border di kedua aturan — dilakukan di keduanya; radius/shadow R2 tak berubah; tanpa `!important` baru. ✓
- **Kualitas:** penghapusan deklarasi M3 dipilih atas `none !important` karena aturan dasar sudah `border: none` — override menjadi mubazir, dan hasilnya justru mengurangi `!important`. Alternatif `none !important` akan mempertahankan jumlah 357; pilihan ini lebih bersih dan tetap aman karena tidak ada sumber border lain untuk `.fig-rail-grp` (hanya idx 494/794/495; 495 hanya `border-color`). ✓
- **Disiplin/YAGNI:** diff AST hanya 2 idx; tidak ada selector lain yang disentuh; probe menguji perilaku nyata (computed style di browser), bukan string sumber. ✓
- **Tes memverifikasi perilaku nyata:** B2/B3 mengukur computed style hasil render di Chromium (bukan grep sumber); B5/B6 + probe R2-T1 menjaga warisan Ronde 2; A7 membuktikan tombol rail tetap berfungsi. ✓
- **Satu hal yang saya periksa ulang:** `transition` di idx 494 masih menyebut `border-color` — tidak berbahaya (tidak ada border yang dianimasikan) dan di luar scope minimal; dibiarkan.

## Isu / concern

1. **B4 awal salah ekspektasi, sudah dikoreksi dan RED diulang** (lihat bagian TDD). Bukan concern produk — hanya catatan metodologi: computed `border-color` saat `border-style: none` adalah `currentcolor`, bukan transparan.
2. **Aturan hover idx 495 tidak disentuh** sesuai brief, tetapi ia masih mendeklarasikan `border-color: var(--line)` dan `box-shadow: 0 2px 8px rgba(0,0,0,.06)`. `border-color` kini inert; namun `box-shadow` hover tetap aktif saat hover — itu perilaku pra-ada (Ronde 2 hanya mengunci shadow state default ke `none`), bukan regresi dari task ini. Bila controller menginginkan hover sepenuhnya tanpa shadow, itu task terpisah.
3. Server statis port 8981 sudah dimatikan sesudah verifikasi (`curl` mengonfirmasi port tertutup).
