# Laporan — Ronde 3, Task T2: `.ws-nav-item.on .ws-nav-ico` accent persis + hapus border-color

- Skill yang dipakai: `systematic-debugging` (root cause dulu — investigasi sebelum edit; SKILL.md dibaca), `ui-ux-fixer-and-improvement` (diagnosis sistematis UI/UX berbasis prinsip desain universal — token semantik `--acc`, tanpa `!important` baru, tanpa magic offset), `test-driven-development` (probe RED dulu, GREEN sesudah), `browser_ui_fix_verification` (ukur computed style di browser asli, bukan dari bacaan kode), `verification-before-completion` (klaim hanya dari perintah yang baru dijalankan). SKILL.md kelimanya dibaca sebelum coding.
- Working copy: `~/workspace/geovanta-round2/` (bukan git repo; "commit" = backup `.bak-r3t2` + laporan ini).
- Brief: `docs/superpowers/plans/sdd-2026-11-15-round3/task-2-brief.md`.

## Step 1 — Investigasi (sebelum edit apa pun)

### Peta kode — terverifikasi ulang (nomor idx sedikit bergeser dari brief)

Grep controller menyebut idx 694 dan 771; verifikasi ulang via parse AST
(`TAILWIND_PLUGIN_AST`, 841 aturan) mengonfirmasi kedua aturan itu ada, dengan
nomor yang sama. Aturan yang relevan di `src/vendor/tailwindOfflineBundle.jsx`:

| idx | Selector | Deklarasi pra-fix |
|-----|----------|-------------------|
| 693 | `.ws-nav-ico` (dasar) | `background: var(--sub)`, tanpa border |
| 694 | `.ws-nav-item.on .ws-nav-ico` (dasar) | `background: var(--acc)`, `color: #ffffff` — **sudah benar**, tanpa `border-color` |
| 770 | `.ws-nav-ico` (override M3) | `border: 1px solid rgba(15, 23, 42, 0.06) !important` — **sumber border** |
| 771 | `.ws-nav-item.on .ws-nav-ico` (override M3) | `background: var(--acc-deep) !important`, `border-color: var(--acc) !important`, `color: var(--on-dark) !important`, `box-shadow: …` |

Definisi token (idx 464, light): `--acc-deep: color-mix(in srgb, var(--acc) 45%, black)` — jadi `--acc-deep` adalah `--acc` yang digelapkan 55% ke hitam, **bukan** `--acc` itu sendiri.

Render: `.ws-nav-item` dirender di `src/components/workspace/WorkspaceHome.jsx:250` (`className={'ws-nav-item' + (active ? ' on' : '')}`, `active = navTab === item.id`, `navTab` default `'all'` — line 29), sehingga `.ws-nav-item.on .ws-nav-ico` sudah ada saat WorkspaceHome load, tanpa perlu masuk editor. Accent diterapkan `src/utils/themeAndPrefsManager.jsx:14` (`applyAccent`, dari localStorage key `trace-svg-settings-v1`).

### Hipotesis tunggal (systematic-debugging Fase 3)

> Root cause adalah override M3 **idx 771** yang menang atas aturan dasar **idx 694** (lebih akhir di AST + `!important`): `background: var(--acc-deep) !important` dan `border-color: var(--acc) !important` di atas `border: 1px solid` dari idx 770 — sehingga computed background = `--acc-deep` (lebih gelap dari `--acc`) dan border 1px solid warna `--acc` ter-render, pada semua accent.

Ini **berlawanan** dengan Ronde 2 T1 (di sana override M3 memaksa accent persis, jadi tidak ada bug). Di sini override M3 justru sumber bug — dibuktikan angka di bawah, bukan diasumsikan.

### Bukti angka — probe RED (pra-fix), browser asli

Probe baru `probes/probe-r3-t2-wsnav-accent.cjs`, build pra-fix, server statis
port 8983 (`python3 -m http.server 8983 --directory web`), Chromium 1255:

```
R3_T2_URL=http://127.0.0.1:8983/ node probes/probe-r3-t2-wsnav-accent.cjs before
MEASURE accent=#0d99ff --acc=#0d99ff --acc-deep=color-mix(in srgb, #0d99ff 45%, black) bg=color(srgb 0.0229412 0.27 0.45) border=1px solid rgb(13, 153, 255) color=rgb(255, 255, 255)
MEASURE accent=#ff8800 --acc=#ff8800 --acc-deep=color-mix(in srgb, #ff8800 45%, black) bg=color(srgb 0.45 0.24 0) border=1px solid rgb(255, 136, 0) color=rgb(255, 255, 255)
MEASURE accent=#00aa55 --acc=#00aa55 --acc-deep=color-mix(in srgb, #00aa55 45%, black) bg=color(srgb 0 0.3 0.15) border=1px solid rgb(0, 170, 85) color=rgb(255, 255, 255)
FAIL C1a bg == --acc (#0d99ff) | actual=color(srgb 0.0229412 0.27 0.45) expected=rgb(13, 153, 255)
FAIL C1b border tak ter-render (#0d99ff) | actual=1px solid rgb(13, 153, 255) expected=0px atau none
PASS C1c --acc diterapkan dari prefs (#0d99ff)
FAIL C2a bg == --acc (#ff8800) | actual=color(srgb 0.45 0.24 0) expected=rgb(255, 136, 0)
FAIL C2b border tak ter-render (#ff8800) | actual=1px solid rgb(255, 136, 0) expected=0px atau none
PASS C2c --acc diterapkan dari prefs (#ff8800)
FAIL C3a bg == --acc (#00aa55) | actual=color(srgb 0 0.3 0.15) expected=rgb(0, 170, 85)
FAIL C3b border tak ter-render (#00aa55) | actual=1px solid rgb(0, 170, 85) expected=0px atau none
PASS C3c --acc diterapkan dari prefs (#00aa55)
PASS C6 0 pageerror
R3-T2 before: 4/10 lolos | GAGAL: C1a, C1b, C2a, C2b, C3a, C3b
```

Pembacaan angka (verifikasi silang): `color(srgb 0.0229412 0.27 0.45)` =
`rgb(6, 69, 115)` = 45% dari `#0d99ff` (`13×0.45≈6`, `153×0.45≈69`,
`255×0.45≈115`) — persis `--acc-deep`, bukan `--acc`. Pola sama pada oranye
(`0.45, 0.24, 0` = 45% dari `#ff8800`) dan hijau (`0, 0.3, 0.15` = 45% dari
`#00aa55`). Border: `1px solid` dengan warna **persis** `--acc` pada ketiga
accent. Hipotesis **terbukti** — bug nyata, bukan asumsi. Keputusan: **EDIT** (bukan no-edit).

## Step 2 — Perbaikan (akar saja, minimal)

Satu file, satu aturan (idx 771), dua deklarasi — tidak ada yang lain:

| idx 771, sebelum | idx 771, sesudah |
|---|---|
| `["background","var(--acc-deep) !important"]` | `["background","var(--acc) !important"]` (nilai diganti; token `!important` sudah ada — **bukan** `!important` baru) |
| `["border-color","var(--acc) !important"]` | `["border","none !important"]` (satu deklarasi diganti satu deklarasi; `!important` sudah ada — **bukan** baru) |
| `["color","var(--on-dark) !important"]` | tidak berubah |
| `["box-shadow","0 4px 10px -2px color-mix(in srgb, var(--acc) 45%, transparent) !important"]` | tidak berubah |

Alasan pilihan `border: none` (bukan sekadar hapus `border-color` dan bukan
`border-color: transparent`):

- Hapus `border-color` saja dari 771 **tidak cukup**: border 1px solid dari idx 770 (`rgba(15, 23, 42, 0.06)`) akan tetap ter-render pada ikon aktif.
- `border-color: transparent` juga tidak cukup menurut definisi brief sendiri ("border ter-render" = width > 0 + style ≠ none) — border 1px solid tetap ada, hanya tak terlihat.
- `border: none` mengikuti kosakata preseden T1 (aturan dasar `.fig-rail-grp` diubah ke `border: none`) dan mematikan border sepenuhnya: width 0px + style none. Spesifisitas 771 (0,3,0) mengalahkan 770 (0,1,0), keduanya `!important`, jadi netralisasi ini menang.
- Aturan dasar idx 694 **tidak disentuh**: background-nya sudah `var(--acc)` dan tidak punya `border-color` — ia tidak berperan dalam kedua cacat (background-nya tertimpa `!important` 771; border berasal dari 770/771). Sesuai brief: perbaiki "di kedua aturan bila keduanya berperan" — hanya 771 yang berperan.
- Tidak disentuh: `.dk-b.on`, `.tool-btn.on`, `.cp-act-btn.on`, `.fig-rail-grp`, `.ws-nav-item.on` (idx 692/769), `.ws-nav-item.on .ws-nav-cnt` (idx 699), dan border idx 770 untuk ikon **non-aktif** (tetap 1px M3 sesuai desain).

Catatan computed `border-top-color` pasca-fix: `rgb(255, 255, 255)` — itu
`currentcolor` (warna ikon putih) yang muncul saat `border-style: none`, **bukan**
border yang ter-render (width 0px + style none = tidak ada yang digambar).
Jebakan yang sama sudah didokumentasikan T1 (B4) — karena itu probe mengasersi
width/style, bukan nilai warna.

## Verifikasi (TDD)

Build ulang (`npm run build:web`, exit 0), lalu probe yang sama melawan build
pasca-fix, server yang sama (port 8983):

```
R3_T2_URL=http://127.0.0.1:8983/ node probes/probe-r3-t2-wsnav-accent.cjs after
MEASURE accent=#0d99ff --acc=#0d99ff bg=rgb(13, 153, 255) border=0px none rgb(255, 255, 255) color=rgb(255, 255, 255)
MEASURE accent=#ff8800 --acc=#ff8800 bg=rgb(255, 136, 0) border=0px none rgb(255, 255, 255) color=rgb(255, 255, 255)
MEASURE accent=#00aa55 --acc=#00aa55 bg=rgb(0, 170, 85) border=0px none rgb(255, 255, 255) color=rgb(255, 255, 255)
PASS C1a/C1b/C1c, C2a/C2b/C2c, C3a/C3b/C3c, C6
R3-T2 after: 10/10 lolos | SEMUA LOLOS
```

Regresi:

| Perintah | Hasil |
|---|---|
| `npm test` (di `~/workspace/geovanta-round2`) | **277/277 PASS, 0 fail** (exit 0, durasi 22,5 dtk) — baseline dipertahankan |
| `R3_T1_URL=http://127.0.0.1:8983/ node probes/probe-r3-t1-rail-border.cjs after` | **7/7 PASS** (`.dk-b.on` / `.fig-rail-grp` tak tersentuh) |

Screenshot: `probes/shots/r3-t2-wsnav-accent-before.png` (pra-fix, accent
`#0d99ff`) dan `probes/shots/r3-t2-wsnav-accent-after.png` (pasca-fix, accent
`#0d99ff`).

## File yang diubah

- `src/vendor/tailwindOfflineBundle.jsx` — **hanya idx 771** (2 nilai deklarasi, delta −17 karakter). Backup pra-edit: `src/vendor/tailwindOfflineBundle.jsx.bak-r3t2` (dibuat SEBELUM edit pertama).
- `probes/probe-r3-t2-wsnav-accent.cjs` — baru (probe TDD 10 asersi).
- `probes/shots/r3-t2-wsnav-accent-before.png` / `r3-t2-wsnav-accent-after.png` — baru.
- Laporan ini: `docs/superpowers/plans/sdd-2026-11-15-round3/task-2-report.md`.

## Angka tripwire bundle (sesudah perubahan)

| Metrik | Baseline awal Ronde 3 | Sesudah T1 | Sesudah T2 (ini) |
|---|---|---|---|
| Aturan AST total | 841 | 841 | **841** (tidak berubah — edit level deklarasi) |
| `!important` | 357 → 356 | 356 | **356** (tidak berubah — tidak ada `!important` baru; dua token lama dipertahankan dengan nilai baru) |
| `acc-deep` (penggunaan) | 6 | 6 | **5** — satu penggunaan dihapus, dan itu **adalah** bug-nya (background 771). Sisa 5: definisi `--acc-deep` (light+dark), `.bar` gradient, `.tool-btn.on`, `.cp-act-btn.on` — semuanya di luar scope T2 dan tidak disentuh. |

## Self-review (baca ulang diff dengan mata segar)

- Diff backup-vs-current: **satu region berurutan saja** (mulai char 161222), delta −17 karakter; tidak ada perubahan lain di file. Dikonfirmasi via perbandingan karakter-per-karakter.
- Selector yang dilarang disentuh masih ada verbatim: `.dk-b.on`, `.fig-rail-grp`, `.tool-btn.on`, `.cp-act-btn.on`.
- Tidak ada dependensi baru, label/i18n, offset, z-index, klip, atau text-wrap yang berubah.
- Satu hal yang dicek ulang: `border: none !important` vs `border-color` yang dihapus — dengan style none, computed `border-top-color` jatuh ke `currentcolor` (putih). Itu kosmetik-komputasi yang tidak me-render apa-apa dan sudah dijelaskan di atas; bukan cacat baru. Probe mengasersi width/style, bukan warna, persis seperti preseden T1.
- Satu hal yang dicek ulang: apakah `background: var(--acc) !important` di 771 masih perlu `!important`? Ya — tanpanya pun 771 menang atas 694 karena urutan, tetapi `!important` itu token lama yang dipertahankan (menghapusnya akan mengubah tripwire dan memperluas diff tanpa manfaat). Bukan `!important` baru.

## Isu / concern / batasan (jujur)

1. **Accent diganti via seed localStorage, bukan klik UI tab Pengaturan.** Sama seperti pola probe Ronde 2 (dan diizinkan brief sebagai fallback dengan catatan jujur): prefs di-seed lewat `trace-svg-settings-v1` sebelum load, jalur asli `loadPrefs` + `applyAccent` yang menerapkannya — dibuktikan C*c PASS pada ketiga accent (`--acc` computed = hex yang di-seed). Yang diuji di sini adalah cascade CSS, bukan UI Pengaturan; bahwa tab Pengaturan sendiri mengubah accent sudah dibuktikan alur prefs-nya, bukan diklik di headless.
2. **Pengukuran hanya di WorkspaceHome (tema light, viewport 1440×900, Chromium headless 1255).** Tema dark tidak diukur — tetapi `--acc-deep` didefinisikan identik di dark (`color-mix … 45%, black`) dan override 771 tidak tergantung tema, jadi hasil yang sama diharapkan; tetap belum diukur, bukan diklaim.
3. **Geometri ikon aktif berubah 1px per sisi** (border 1px dihapus hanya pada state `.on`; ikon non-aktif tetap ber-border). SVG 17px tetap terpusat via `inline-flex` + `justify-content: center`; background `--acc` mengisi penuh 34×34 di kedua state. Tidak ada pergeseran visual yang teramati di screenshot after; pergeseran layout antar-state tidak diukur dengan angka piksel (bukan bagian acceptance brief).
