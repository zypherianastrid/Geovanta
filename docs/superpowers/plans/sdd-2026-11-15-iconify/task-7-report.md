# Task 7 Report — Offline state + "Terakhir dipakai" reuse

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 7, 8)
**Date:** 2026-11-15
**Verdict: DONE** — offline probe 12/12 hijau di dua run identik, suite penuh 299/299, `build:web` exit 0.
Skill yang dipakai (aturan `AGENTS.md`, jalur cepat): `test-driven-development`
(RED probe → GREEN, sesuai brief Step 1–2). Review adalah tugas koordinator.

## 1. Yang diimplementasikan

### 1.1 Panel memiliki status online/offline sendiri — R19 jalur internal

`src/components/editor/IconifyPanel.jsx` (backup `.bak-iconify-t7`):

- `netStatus` state internal, diinisialisasi dari prop `status` (nilai awal
  saja). Dipilih jalur internal karena kode panel Task 4 mendukungnya
  (sudah punya `useState`/`useEffect`, dan prop `status` tidak pernah
  dipasok Task 5 — mount di `EditorRightInspector.jsx` tidak
  meneruskannya, panel memakai default `'loading'`). **Wiring `status`
  lewat `VectorEditor.jsx` → `EditorRightInspector.jsx` TIDAK dilakukan**
  (tidak diperlukan); otorisasi pra-izin itu tidak dipakai. Alasan
  dicatat di komentar panel + komentar mount inspector.
- Efek saat dibuka (`[open]`): `probeOnline()` (3 detik, Task 3) →
  `'online'`/`'offline'`; listener `window` `online`/`offline`
  memperbarui status saat koneksi berubah. Render memakai `netStatus`
  (bukan lagi prop `status` mentah); nilai awal prop tetap dijaga
  sehingga tes SSR Task 4 (`status="offline"` → `ic-offline`,
  default → loading) tidak berubah.
- **Gating (Task 4 minor):** ketiga efek jaringan hanya jalan saat
  `netStatus === 'online'` — `listCollections`, `loadSet` browse, dan
  `searchIcons` (dep `netStatus` ditambahkan; efek cari jalan ulang
  saat probe selesai). Saat offline / masih probing, TIDAK ada traffic
  Iconify kecuali probe `/version` itu sendiri. Tidak ada "traffic yang
  diterima" — semuanya di-gate, dibuktikan T7-1b.
- **Pemetaan error per-host (Task 2):** string mentah `TypeError:
  Failed to fetch` tidak pernah tampil — pemetaan dari konteks
  pemanggilan, bukan teks error. Search-fetch gagal → state offline
  panel (`L.icOffline` = "Perlu internet untuk mencari ikon", verbatim
  Task 2 §2 / design §7.7); `icons.json`-fetch gagal → pesan per-set
  (`browseError` via `toPanelError`, mis. `Perlu internet untuk memuat
  set ikon "material-symbols"`, dan toast sisip Task 6
  `Gagal menyisipkan ikon mdi:home: Perlu internet untuk memuat set
  ikon "mdi"`). Keduanya independen — T7-2 membuktikan API tetap hidup
  (panel online) saat CDN mati.

### 1.2 "Terakhir dipakai" — reuse cache + penyimpanan nama penuh (gap Task 6)

- **Reuse:** baris recent tetap tampil nama saja di segala status
  (di luar cabang `ic-offline`, tanpa `<img>`), klik memanggil
  `onInsert({name})` yang sama seperti sebelumnya. Reuse bergantung
  pada cache set di memori Task 3 (`loadSet` memoized): set ter-cache →
  sisip ulang offline berhasil (T7-3b); set belum ter-cache → toast
  gagal Task 6, nol objek, panel tetap terbuka (T7-4b). Tidak ada
  perubahan render recent — yang berubah adalah recent kini benar-benar
  dipasok (lihat wiring) dan ditulis dengan nama penuh.
- **Penyimpanan nama penuh (Task 6 gap — DIPERIKSA, lihat §4):**
  `prefs.recentIcons` sebelumnya TIDAK PERNAH ditulis siapa pun (tidak
  ada writer; panel memakai default `[]`) — jadi tidak ada "nama pendek
  yang tersimpan" untuk diperbaiki; yang dibangun adalah writer yang
  benar sejak awal: `rememberRecentIcon` di `VectorEditor.jsx` (pola
  `rememberRecentColor`) hanya mencatat nama PENUH `prefix:nama`
  (menolak nama tanpa `:`), maks. 12, hanya sesudah sisipan BERHASIL
  (dipanggil sesudah `commit` + `say` di `onIconifyInsert`).
  `DEFAULT_PREFS.recentIcons: []` (`themeAndPrefsConstants.jsx`) dan
  sanitasi jalur muat `loadPrefs` (`themeAndPrefsManager.jsx`, pola
  T10 recentColors): entri tanpa `:` dibuang + cap 12 — prefs lama/seed
  berisi nama pendek tidak akan pernah sampai ke panel.
- **Wiring recent:** `VectorEditor.jsx` → `recentIcons={prefs &&
  prefs.recentIcons || []}` → `EditorRightInspector.jsx` (prop baru,
  default `[]`) → `<IconifyPanel … recentIcons={recentIcons} />`.
  `rememberRecentIcon` ditangkap closure `useCallback([])` milik
  `onIconifyInsert`; aman karena satu-satunya yang ditutup adalah
  `setPrefs` (setter state React App, identitas stabil) — dicatat di
  komentar kode.
- **Tidak diubah:** `src/renderer/iconifyClient.jsx` — tidak perlu
  export baru (R4 dipatuhi: nol perubahan signature Task 3). Label
  lisensi "[object Object]" (R18) TIDAK diperbaiki — deferred ke
  fix wave final-review, sesuai ruling.

## 2. Ruling / verifikasi per poin koordinator

- **R4:** hanya penambahan di panel + wiring recent; `iconifyClient.jsx`
  nol perubahan (tidak ada file `.bak-iconify-t7` untuknya).
- **R19:** jalur internal panel (probe + listener), bukan wiring
  parent-driven. `status` prop = nilai awal saja.
- **Task 2 error mapping:** search → offline state; `icons.json` →
  pesan per-set; per-host independen (T7-2a/2b).
- **Task 6 gap:** `recentIcons` menyimpan nama penuh — cek runtime
  T7-3c (§4).
- **Task 4 minor (offline gating):** semua efek jaringan di-gate
  (T7-1b membuktikan: 0 req CDN, API hanya `/version`).
- **Task 6 context:** recent rows memanggil `onInsert` yang sama;
  lisensi via lookup `listCollections` best-effort Task 6 (gagal
  offline → `license: null`, sisip tetap jalan — T7-3b).

## 3. Hasil pengujian

Perintah (server dari `web/`, `web/` sudah fresh — 0 file `src/` lebih
baru dari `web/assets/geovanta.bundle.js`):

```text
cd web && python3 -m http.server 9042
OFFLINE_URL=http://127.0.0.1:9042/ node probes/probe-iconify-offline.cjs   # tanpa pipe (exit code tercatat)
npm test
npm run build:web
```

**RED (sebelum implementasi, build Task 6):** probe berhenti di T7-4b
— `FAIL T7-1a` (tidak ada state offline), `FAIL T7-1b` (efek tetap
jalan offline: `/collections` + `material-symbols/icons.json`),
`FAIL T7-4a` (baris recent tidak tampil — recentIcons belum dipasok),
lalu crash klik recent (timeout 30 detik, exit 2). RED membuktikan
probe menguji hal yang benar: state offline + gating + wiring recent.

**GREEN (sesudah implementasi, 2 run penuh, hasil identik):**

```text
PROBE-ICONIFY-OFFLINE-T7: 12/12 lolos | SEMUA LOLOS
RUN1_EXIT=0
RUN2_EXIT=0
```

Rincian 12 asersi: T7-1a (offline → `ic-offline` "Perlu internet untuk
mencari ikon"), T7-1b (gating: `cdn=0 apiNonVersion=0`, satu-satunya
request `https://api.iconify.design/version`), T7-4a (recent nama saja,
`imgCount=0`), T7-4b (klik recent uncached: 0→0 objek, panel tetap
terbuka, toast gagal), T7-1c (offline: gambar persegi → 1 objek),
T7-3setup (online lagi: cari "home" → `mdi:home` tampil, set ter-cache),
T7-3a (offline lagi → state offline), T7-3b (klik recent cached:
1→2 objek, toast `Ikon mdi:home disisipkan`), T7-3c (recent ter-persist
`["mdi:home"]`, semua berisi `:`), T7-2a (CDN-only: panel online +
browse error per-set `Perlu internet untuk memuat set ikon
"material-symbols"`), T7-2b (klik recent: toast per-set
`Perlu internet untuk memuat set ikon "mdi"`, 0 objek), E1 (0 pageerror).

```text
$ npm test
ℹ tests 299 — pass 299, fail 0

$ npm run build:web
exit 0 — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."
```

Screenshot (bukti visual): `probes/shots/iconify-t7-offline.png`,
`probes/shots/iconify-t7-offline-reinsert.png`. Server `http.server
9042` dimatikan setelah run ke-2.

## 4. Cek penyimpanan nama recent (Task 6 gap — bukti runtime)

T7-3c membaca `localStorage['trace-svg-settings-v1']` sesudah sisipan
recent T7-3b (writer `rememberRecentIcon` sudah jalan pada sisipan itu):
`recentIcons=["mdi:home"]`, semua entri berisi `:`. Writer yang
menyimpan nama pendek akan menghasilkan `["home"]` di sini — tidak
terjadi. Tambahan (code review, bukan probe): `rememberRecentIcon`
menolak nama tanpa `:` sebelum `setPrefs`; `loadPrefs` membuang entri
tanpa `:` saat muat; tidak ada jalur tulis lain ke `recentIcons` di
codebase (`grep` diverifikasi).

## 5. Batasan jujur / yang TIDAK terverifikasi

- **Hanya headless Chromium 1440×900 light**, prefs `id`; launch
  Windows + GPU asli belum terukur (seperti ronde-ronde sebelumnya).
- **Route abort = stand-in offline** (pola Task 2): `fetch()` menolak
  dengan `TypeError: Failed to fetch` yang sama; `context.setOffline`
  tidak dipakai. Listener `online`/`offline` browser asli belum diuji
  lewat event sungguhan (hanya probe + listener terpasang) — transisi
  online→offline di tengah sesi lewat event belum ada asersi probe.
- **Validasi TLS tidak terbukti** (flag probe-only
  `--ignore-certificate-errors`, pola spike1/2) — sama seperti Task 2.
- **Probe T7-4b sempat FAIL 1× sesudah implementasi** (run GREEN
  pertama, 10/11): bukan bug produk — probe memeriksa toast 3 detik
  sesudah klik, padahal toast `say()` hanya hidup ~2200 ms. Diperbaiki
  di probe (periksa toast segera sesudah klik), bukan di produk;
  run berikutnya 11/11 lalu 12/12 (×2) sesudah T7-3c ditambahkan.

## 6. File yang dibuat / diubah

Diubah (masing-masing backup `.bak-iconify-t7` dibuat SEBELUM edit):

- `src/components/editor/IconifyPanel.jsx` — `probeOnline` import,
  `netStatus` internal + probe/listener, gating 3 efek, render
  `netStatus === 'offline'` (diff: +~40 baris, komentar + gate).
- `src/components/editor/VectorEditor.jsx` — `rememberRecentIcon`
  (+17 baris), panggil sesudah commit sukses di `onIconifyInsert`,
  `recentIcons={prefs && prefs.recentIcons || []}` ke inspector.
- `src/components/editor/EditorRightInspector.jsx` — prop
  `recentIcons = []` + teruskan ke `IconifyPanel`.
- `src/constants/themeAndPrefsConstants.jsx` — `DEFAULT_PREFS` +
  `recentIcons: []`.
- `src/utils/themeAndPrefsManager.jsx` — sanitasi `loadPrefs` untuk
  `recentIcons` (hanya nama berisi `:`, cap 12).

Tidak diubah: `src/renderer/iconifyClient.jsx` (R4), file lain apa pun.
Tidak ada dependensi npm baru. Tidak ada host hardcode di kode produk.

Dibuat: `probes/probe-iconify-offline.cjs` (12 asersi + relay CONNECT
reuse probe-iconify.cjs), laporan ini + 2 screenshot probe (§3).

## 7. Self-review

- **Completeness:** semua langkah brief 1–5 + semua ruling/carry
  pointer (R4, R19 jalur internal + alasan, mapping error Task 2,
  gap nama recent Task 6, gating Task 4, konteks Task 6, pola probe
  Task 2) dipenuhi atau dicatat (§1–§2, §4).
- **Quality:** angka disalin dari output probe (12/12 ×2, 299/299,
  request log verbatim); diff vs backup diperiksa — hanya baris yang
  diniatkan; satu koreksi probe didokumentasikan (§5), bukan
  disembunyikan.
- **Discipline:** hanya offline + recent (YAGNI) — tidak ada perbaikan
  "[object Object]", tidak ada export klien baru, tidak ada perubahan
  di luar daftar brief kecuali wiring recent yang memang dimandatkan
  Task 7 (panel + inspector + prefs).
- **Testing:** perilaku nyata di browser asli (route abort per-host,
  relay, `parseSVG`, render CanvasKit, toast, drag kanvas, persist
  localStorage) — bukan mock, bukan curl.
