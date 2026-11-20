# Task 5 Fix Report: Perbaikan F1 (thumbnail 38 px) + F2 (ic-count 18 vs tampil 14)

**Plan:** Iconify Pindah ke Modal Popup (`sdd-2026-11-15-iconify-modal`)
**Tanggal:** 2026-11-15
**Status:** DONE — kedua temuan Task 5 diperbaiki sesuai Ruling R4 koordinator;
`npm test` 312/312, build exit 0, keempat probe hijau (48/48 + 3/3 + 14/14 + 19/19),
M11b dan M12 lolos, 0 pageerror.
**Skill dipakai:** tidak ada skill Superpowers yang dipetakan untuk fix wave
dua baris ini (bukan fitur baru / bukan debugging sistematis); aturan
programmer profesional `AGENTS.md` dipakai: backup `.bak-modal-t5fix`
sebelum edit destruktif, verifikasi perintah nyata terhadap file asli,
bukti sebelum kesimpulan, jujur soal yang belum terverifikasi.

## 1. File yang diubah

| File | Perubahan |
|---|---|
| `src/components/editor/IconifyPanel.jsx` | F1: `padding: 2` → `padding: 1` di `thumbButton` (baris 373). F2: cabang kategori-aktif `ic-count` `searchResults.length` → `renderableSearch.length` (baris 376). |
| `tests/iconify-panel.test.cjs` | Guard sumber diperbarui: pin padding 1 px + pin `renderableSearch.length` untuk kategori aktif; `doesNotMatch` untuk perilaku lama. |
| Laporan ini | `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-5-fix-report.md` |

Backup sebelum edit (dibuat dulu, lalu diff diverifikasi):

- `src/components/editor/IconifyPanel.jsx.bak-modal-t5fix`
- `tests/iconify-panel.test.cjs.bak-modal-t5fix`

**Tidak disentuh:** file probe apa pun, `src/renderer/iconifyClient.jsx`
(`MAX_SET_BYTES` tetap 10 MB — batas keamanan desain awal, tidak diubah),
cabang tanpa-kategori `ic-count` (`searchTotal`, semantik pra-ada dipertahankan),
ukuran tombol (tetap 44 px), `THUMB_PX` (tetap 40), tanpa aturan CSS baru,
tanpa dependensi baru, tanpa catatan "n ikon tidak dapat dimuat".

## 2. Ringkasan diff

### 2.1 F1 — `thumbButton`, baris 373

Sebelum:

```jsx
style={{width: 44, height: 44, padding: 2, display: 'inline-flex', ...}}
```

Sesudah:

```jsx
style={{width: 44, height: 44, padding: 1, display: 'inline-flex', ...}}
```

Satu token berubah (`2` → `1`), hanya pada `thumbButton`. Aritmetika:
content box = 44 − 2×1 (border) − 2×1 (padding) = **40 px** = `THUMB_PX`,
jadi `<img width=40 height=40>` tidak lagi dijepit `max-width: 100%`
(preflight Tailwind) ke 38 px. Tombol lain yang memakai `padding: '2px 6px'`
(tombol "Muat lagi", recent) tidak disentuh.

### 2.2 F2 — `ic-count`, baris 376

Sebelum:

```jsx
{L.icResults.replace('{n}', String(selectedCategory ? searchResults.length : searchTotal))}
```

Sesudah:

```jsx
{L.icResults.replace('{n}', String(selectedCategory ? renderableSearch.length : searchTotal))}
```

Satu token berubah (`searchResults` → `renderableSearch`) pada cabang
kategori-aktif saja. `renderableSearch` adalah `searchResults` yang sudah
difilter ke `sets[r.prefix]` yang ada — ikon yang set-nya gagal dimuat
(mis. `material-symbols-light`, 10.520.709 B > batas 10 MB sebesar
34.949 B) tidak lagi ikut dihitung, sesuai komentar kontrak panel sendiri
("`ic-count` = jumlah ikon terfilter yang dimuat").

### 2.3 Tes unit — `tests/iconify-panel.test.cjs`

- Guard lama `selectedCategory ? searchResults.length : searchTotal`
  diganti `selectedCategory ? renderableSearch.length : searchTotal`,
  ditambah `doesNotMatch` untuk bentuk lama (regresi akan membuat tes MERAH).
- Guard baru: `width: 44, height: 44, padding: 1,` (+ `doesNotMatch`
  `padding: 2,` pada tombol yang sama) — mem-pin aritmetika content box 40 px.
- Komentar header (b) diperbarui: `ic-count` = hasil terfilter yang
  benar-benar tampil (renderableSearch).

Diff lengkap produk vs backup (2 baris, diverifikasi `diff`):

```
373c373: padding: 2 → padding: 1   (thumbButton)
376c376: searchResults.length → renderableSearch.length   (ic-count, cabang kategori)
```

## 3. Bukti before / after

### 3.1 F1 — M11b (thumbnail tampil)

| | Sebelum fix (Task 5, 2/2 run) | Sesudah fix (run ini) |
|---|---|---|
| `natural` | 150×150 | 150×150 |
| Lebar tampil | **38×38** | **40×40** |
| Atribut img | 40×40 | 40×40 |
| Gaya tombol | `btnBox=44 boxSizing=border-box border=1px padding=2px imgMaxWidth=100%` | `btnBox=44 boxSizing=border-box border=1px padding=1px imgMaxWidth=100%` |
| Hasil M11b | FAIL | **PASS** — `actual=natural=150x150 displayed=40x40 attr=40x40` |

### 3.2 F2 — M12 (ic-count vs ikon tampil, cari "home" kategori Material)

| | Sebelum fix (Task 5) | Sesudah fix (run ini) |
|---|---|---|
| Ikon tampil (grid) | 14 | 14 |
| `ic-count` | **18** ("18 ikon ditemukan") | **14** ("14 ikon ditemukan") |
| `countReached` | false | true |
| Prefix tampil | `["material-symbols","ic","mdi","mdi-light","line-md"]` (tanpa `material-symbols-light`) | sama — keempat ikon `material-symbols-light` tetap tidak tampil, kini juga tidak dihitung |
| Total API | 32 | 32 |
| Hasil M12 | FAIL (`icCount=18 ≠ shown=14`) | **PASS** — `actual=shown=14 icCount=14 text="14 ikon ditemukan" apiTotal=32 countReached=true` |

Catatan jujur: jumlah tampil tetap 14, bukan 18 — keempat ikon
`material-symbols-light` memang tetap tidak bisa dimuat karena set-nya
melebihi `MAX_SET_BYTES` (keputusan R4: batas tidak diubah; set di atas
batas tetap gagal dimuat seperti sebelumnya). Yang diperbaiki adalah
klaim count-nya, bukan muatan set-nya.

## 4. Hasil verifikasi (perintah nyata, `web/` segar dari `npm run build:web`)

Server: `web/` di 9041 + 9042 sudah jalan sebelum run (dicek `curl` 200
di keduanya; tidak perlu dinyalakan ulang). Probe dijalankan apa adanya,
tanpa perubahan file probe.

| Perintah | Hasil |
|---|---|
| `npm test` | **312/312 lolos, 0 gagal** (durasi ±24 dtk) |
| `npm run build:web` | **exit 0** ("Aset offline CanvasKit GPU/CPU siap di dist/ dan web/") |
| `PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs` | **48/48, exit 0** |
| `PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-thumb.cjs` | **3/3, exit 0** (THUMB-1 48/48, THUMB-2 38/38 render) |
| `OFFLINE_URL=http://127.0.0.1:9042/ node probes/probe-iconify-offline.cjs` | **14/14, exit 0** |
| `PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs` | **19/19, exit 0** — M11b + M12 HIJAU, **0 pageerror** |

Hitungan ulang modal 19 = M1, M15, M16, M2, M3, M4, M5, M5b, RF4, M6, M7,
M8, M9, M10, M11, M11b, M12, M14, PERR (sama seperti Task 5).

## 5. Batasan jujur (apa yang belum terverifikasi)

- Hanya headless Chromium 1440×900 light, seperti semua task modal;
  perilaku di Windows / GPU asli belum terukur.
- Total API `"home"` tidak stabil antar-panggilan (Task 5 mencatat 32 vs 48);
  pada run ini 32 — sub-kondisi `icCount < apiTotal` lolos (14 < 32),
  tetapi angka total itu sendiri bukan bagian yang diuji fix ini.
- `material-symbols-light` tetap tidak dapat dimuat (batas 10 MB dipertahankan
  sesuai R4); pengguna yang mencari ikon dari koleksi itu tetap melihat
  lebih sedikit hasil daripada total API, hanya saja `ic-count` kini jujur
  (14, bukan 18). Tidak ada catatan UI "n ikon tidak dapat dimuat"
  (sesuai R4).
- Margin M16 (panel hilang < 200 ms) tidak diukur ulang secara terpisah di
  sini; probe modal 19/19 mencakup M16 lolos pada run ini.
