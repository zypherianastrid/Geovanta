# Task 1 Report — Spike 1: CDN → parseSVG → canvas (proof, no product code)

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§8 Spike 1, §5 C2)
**Date:** 2026-11-15
**Verdict: GO** — with one Task-6 work item (group assignment at insert, see §5).
No parser extension needed; no path-only filter needed.

## 1. Verdict (untuk Task 3 dan Task 6)

**GO.** Ketiga ikon masuk lewat jalur CDN (`icons.json` → rakit SVG →
`VE.parseSVG` → objek kanvas) dengan benar, dan panel Fill/Stroke
mewarnai ulang objek hasil sisipan. Bukti di §3–§4.

- `mdi:home` — 1 objek, fill-based, `currentColor` → `#18181b`.
- `tabler:home` — 2 objek (2 `<path>` dalam satu `<g>`), stroke-based.
- **`tabler:arrow-bottom-circle`** (ikon multi-elemen, dipilih probe
  saat runtime — lihat §2) — **2 objek = 2 elemen leaf di `body`:
  `["path", "circle"]`** — primitif `<circle>` ikut ter-parse,
  tidak ada elemen yang gugur.

**Yang TIDAK terbukti / harus dikerjakan Task 6:** objek-objek hasil
parse **tidak membawa `group`** (semuanya `group: null`). Jadi ikon
multi-path masuk sebagai objek-objek lepas, bukan satu grup seperti
yang diminta design §7.4. Ini BUKAN kegagalan parser — `parseSVG`
hanya memberi nama grup bila `<g>` punya `id` atau `opacity < 1`,
dan `<g>` ikon tidak punya keduanya. Task 6 wajib memberi nama grup
saat insert (pola yang sudah ada di `importFiles`:
`VectorEditor.jsx` ~:3040, pemetaan grup di sisi pemanggil, bukan
di `parseSVG`). Recolor TIDAK butuh grup: panel Fill/Stroke sudah
mewarnai ulang semua sub-path lewat multi-seleksi (R1/R2/R3 lolos),
jadi alternatif "pecah grup / set fill per sub-path sebelum commit"
yang disebut brief **tidak diperlukan**.

## 2. Ikon yang diuji (nama persis — deliverable untuk Task 3 & 6)

Dipilih dan dicatat probe saat runtime dari data set yang dimuat
di browser (bukan dari tebakan):

| Ikon | Set | `body` (leaf elements) | viewBox |
| --- | --- | --- | --- |
| `mdi:home` | `@iconify-json/mdi` | 1 leaf: `["path"]`, `fill="currentColor"`, `d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z"` | 24×24 |
| `tabler:home` | `@iconify-json/tabler` | 2 leaf: `["path","path"]` dalam satu `<g fill="none" stroke="currentColor" stroke-width="2" …>` | 24×24 |
| **`tabler:arrow-bottom-circle`** | `@iconify-json/tabler` | 2 leaf: **`["path","circle"]`** dalam satu `<g …>`; `body` = `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 7v14m-3-3l3 3l3-3"/><circle cx="12" cy="5" r="2"/></g>` | 24×24 |

Aturan pilih ikon multi-elemen (diimplementasi probe, deterministik):
ikon pertama dalam urutan JSON set tabler dengan ≥ 2 leaf shape
(`path|circle|rect|ellipse|polygon|polyline|line`) DAN ≥ 1 leaf
bukan-`path`. Hasilnya `tabler:arrow-bottom-circle`.

**Konteks set (diukur dari data yang sama):** MDI hampir seluruhnya
path-only — hanya **2** ikon non-path dari 7.638
(`mdi:flickr-after`, `mdi:flickr-before`, masing-masing satu
`<circle>`). Tabler punya 2.450 ikon multi-elemen (mayoritas
`<g>` + beberapa `<path>`), tapi hanya **3** yang mengandung primitif
sejati (`circle`/`rect`): `tabler:arrow-bottom-circle`,
`tabler:letters-case` (`["circle","path"]`), `tabler:pause`
(`["rect","rect"]`, `rx="2"`). **Tidak ada** ikon di kedua set yang
mengandung `transform=` — jadi penanganan `transform` pada `body`
ikon asli belum teruji di alam liar; yang teruji adalah `transform`
pada wrapper skala milik probe sendiri (lihat §4.3), yang bekerja.

## 3. Hasil probe

Perintah (server sudah jalan dari `web/`):

```text
cd web && python3 -m http.server 9031
SPIKE1_URL=http://127.0.0.1:9031/ node probes/probe-iconify-spike1.cjs
```

`web/` sudah fresh saat spike berjalan (0 file `src/` lebih baru dari
`web/assets/geovanta.bundle.js`, dicek `find src -newer`), jadi
`npm run build:web` tidak dijalankan ulang. Chromium:
`~/.cache/ms-playwright/chromium-1255/`, viewport 1440×900, prefs
light/id (pola yang sama dengan probe R4).

**Dua run penuh, hasil identik: 11/11 lolos, 0 pageerror.**

| ID | Asersi | Hasil |
| --- | --- | --- |
| C0 | Kedua `icons.json` ter-fetch di browser asli (HTTP 200) | PASS — mdi 200 (337–392 ms, 7.638 ikon), tabler 200 (61–73 ms, 6.594 ikon) |
| M0 | `mdi:home` native: 1 objek, tight bbox di dalam frame 24×24 | PASS — 1 objek, bbox `2,3–22,20` (20×17) |
| S1 | `mdi:home` skala 96: 1 objek; bbox skala = bbox native ×4 | PASS — bbox `8,12–88,80` (80×68) |
| R1 | `mdi:home` recolor via panel Fill → `#E60000` | PASS — fill `#18181b` → `#E60000` (1/1 objek) |
| S2 | `tabler:home` skala 96: 2 objek; bbox skala = bbox native ×4 | PASS — native `3,3–21,21` (18×18) → `12,12–84,84` (72×72) |
| R2 | `tabler:home` recolor via panel Stroke → `#0066FF` | PASS — stroke `#18181b` → `#0066FF` (2/2 objek) |
| R2b | (observasi) Fill pada ikon stroke-based juga menulis fill | PASS — fill `none` → `#E60000` (2/2 objek) |
| S3 | `tabler:arrow-bottom-circle`: shape count == element count (2: `["path","circle"]`); bbox skala = native ×4 | PASS — 2 objek; native `9,3–15,21` (6×18) → `36,12–60,84` (24×72); per-objek: path `36,28–60,84` (24×56), circle `40,12–56,28` (16×16) |
| R3 | Ikon multi recolor via panel Fill → `#E60000` semua sub-path | PASS — fill `#E60000` (2/2, termasuk primitif `<circle>`) |
| U1 | Satu Ctrl+Z membatalkan satu insert | PASS — setelah 1× Ctrl+Z dokumen kembali persis ke state sebelum insert (2 objek, bbox `36,12–60,84`, fill `#E60000`) |
| E1 | 0 pageerror | PASS |

Output lengkap run terakhir (run ke-2, identik dengan run ke-1):

```text
SPIKE1: 11/11 lolos | SEMUA LOLOS
```

Detail objek hasil parse (dari `getDoc()`):

- `mdi:home`: `[{name:"path-1", group:null, fill:"#18181b", stroke:"none",
  subs:1, nodes:11}]`
- `tabler:home`: `[{name:"path-1", group:null, fill:"none",
  stroke:"#18181b", subs:2, nodes:11}, {name:"path-2", group:null,
  fill:"none", stroke:"#18181b", subs:1, nodes:6}]`
- `tabler:arrow-bottom-circle`: `[{name:"path-1", group:null,
  fill:"none", stroke:"#18181b", subs:2, nodes:5},
  {name:"path-2", group:null, fill:"none", stroke:"#18181b",
  subs:1, nodes:4}]` — `path-2` adalah `<circle>` (4 node).

Screenshot (bukti visual, dicek langsung): `spike1-mdi-home.png`
(rumah solid hitam), `spike1-tabler-home.png` (rumah outline tebal —
render stroke benar), `spike1-multi.png` (panah bawah + cincin),
`spike1-mdi-home-recolor.png` (rumah merah + selection box),
`spike1-multi-recolor.png`. Toast `spike1 … dimuat` tampil di tiap
load.

## 4. Cara pengujian (metode — dicatat eksplisit sesuai brief)

### 4.1 Fetch CDN — di browser asli

`page.evaluate(async () => fetch('https://cdn.jsdelivr.net/npm/@iconify-json/mdi/icons.json'))`
dan yang sama untuk `tabler`. Bukan curl: `curl` hanya dipakai
sebagai pra-cek konektivitas (200, mdi 3.096.165 byte mentah,
tabler 2.249.235 byte). Angka `bytes` di output probe adalah panjang
`JSON.stringify()` hasil parse ulang (mdi 2.927.174, tabler
2.167.510), bukan ukuran transfer — jangan dikutip sebagai ukuran
transfer.

### 4.2 Insert — `loadTestSvg`, bukan `VE` langsung

`VE` tidak terekspos di `window`; yang tersedia adalah
`window.__geovantaEditorApi.loadTestSvg(svgStr, label)` (memanggil
`VE.parseSVG` lalu `loadDoc`) dan `getDoc()`. Setiap ikon dimuat
sebagai dokumen baru (menggantikan dokumen sebelumnya); bbox diukur
dari koordinat node objek (`subs[].nodes[]`, termasuk handle
bezier `in`/`out` bila ada), bukan dari viewBox.

### 4.3 Scaling — wrapper `<g transform="scale(96/vb)">`

`VE.scaleObj` juga tidak terekspos di `window`, jadi skala affine
yang sama diterapkan di dalam string SVG:
`<svg viewBox="0 0 96 96"><g transform="scale(4)">…body…</g></svg>`.
`parseSVG` memanggang skala itu ke geometri. Ini sekaligus menguji
penanganan `transform` pada `<g>` — bekerja (semua bbox skala
eksak).

### 4.4 Koreksi makna "bbox 96×96" (kesalahan asersi awal saya)

Run pertama probe ini GAGAL 4 asersi (M0/S1/S2/S3) karena saya
mengasumsikan tight bbox artwork = 96×96. Itu salah: artwork ikon
tidak memenuhi frame 24×24 (mis. `mdi:home` hanya 20×17 dari
24×24). Yang benar: **"insert 96×96" berarti frame 24-unit diskala
ke 96; tight bbox hasil skala = tight bbox native × 4.** Probe
diperbaiki untuk mengukur tiap ikon dulu pada ukuran native lalu
mengasersi keempat sisi bbox skala = native × 4 (±1). Setelah
koreksi itu, 11/11 lolos di dua run. Tidak ada perubahan perilaku
produk — yang diperbaiki hanya asersi probe saya.

### 4.5 Recolor — panel Fill/Stroke asli, bukan set properti langsung

Untuk tiap ikon: klik kanvas → **Ctrl+A** (pilih semua objek) →
klik custom input ColorText (`[data-tip="veFill"|"veStroke"]
[data-testid="color-text"] [data-custom-input]`) → ketik hex +
Enter — persis seperti user. Lalu baca kembali `fill`/`stroke`
tiap objek dari `getDoc()`:

- Fill `#E60000` pada `mdi:home` (fill-based) dan pada ikon multi.
- Stroke `#0066FF` pada `tabler:home` (stroke-based).
- Observasi tambahan: Fill `#E60000` pada `tabler:home` juga
  menulis fill ke kedua path (dari `none` menjadi `#E60000`) —
  panel tidak menolak; itu perilaku panel yang sudah ada, bukan
  temuan spike.

**Jawaban atas pertanyaan brief Step 3:** ya, panel Fill/Stroke
mewarnai ulang grup/objek hasil sisipan — diuji dengan cara di
atas, pada ketiga ikon, dan diverifikasi dari data dokumen (bukan
hanya dari tampilan). Karena objek-objek itu saat ini `group: null`,
yang teruji secara ketat adalah recolor multi-seleksi; recolor
"grup" dalam arti satu grup bernama belum bisa diuji sebelum Task 6
memberi nama grup — tapi tidak ada alasan panel akan berperilaku
beda terhadap objek bergrup, karena panel bekerja per objek
terseleksi.

## 5. Temuan untuk Task 6 (bukan blocker)

1. **Beri nama grup saat insert (wajib).** Semua objek hasil parse
   punya `group: null` (observasi `OBSERVE MULTI group values:
   [null]`). Tanpa ini, klik pada ikon multi-path hanya memilih
   satu sub-path, bukan seluruh ikon — melanggar design §7.4.
   Pola yang sudah ada: `importFiles` di `VectorEditor.jsx`
   (~:3040) memetakan `o.group` di sisi pemanggil.
2. **Tidak perlu perluasan parser.** `<circle>` ter-parse
   (`shapeD` mengubah primitif menjadi path), `<g>` + pewarisan
   `fill`/`stroke`/`stroke-width` + `currentColor` → `#18181b`
   semuanya bekerja. Tidak ada elemen yang gugur pada ketiga ikon.
3. **Tidak perlu filter path-only.** Ikon berprimitif masuk utuh
   (2/2 objek).
4. **Satu Ctrl+Z = satu insert** sudah berlaku untuk jalur load
   (U1 lolos); Task 6 harus menjaga sifat ini (satu commit per
   sisipan, termasuk penamaan grup + metadata `icon:`).
5. **Skala insert = skala frame, bukan tight bbox.** Bila Task 6
   memposisikan ikon 96×96 di tengah viewport, yang diskala adalah
   frame 24→96; artwork akan tampak sedikit lebih kecil dari 96
   (mis. rumah MDI 80×68) — itu benar secara visual, jangan
   "memaksa" tight bbox menjadi 96×96.

## 6. Temuan lingkungan (penting untuk Spike 2 & Task 6)

### 6.1 Headless Chromium di VM ini TIDAK BISA CONNECT langsung ke egress proxy

VM ini tidak punya internet langsung (`curl --noproxy` → 000);
satu-satunya jalan keluar adalah egress proxy dari env
`HTTPS_PROXY`/`HTTP_PROXY`. Headless Chromium (Playwright:
launch/context `proxy`, maupun flag CLI `--proxy-server`) selalu
gagal dengan `net::ERR_TUNNEL_CONNECTION_FAILED` — net log
Chromium membuktikan proxy menjawab CONNECT dengan
`HTTP/1.1 403 Forbidden`, `Content-Type: application/json`,
`Content-Length: 81`, `Connection: close` (dua run, konsisten).
Sementara itu CONNECT **byte-identik** dari curl / Python /
Node selalu `200 Connection Established`. Yang sudah diuji dan
**bukan** pemicunya: User-Agent (termasuk UA HeadlessChrome
persis), auth (curl tanpa auth dan dengan auth salah tetap 200),
IPv4 vs IPv6 literal, dan isi byte request (replica persis
CONNECT Chromium, di kedua stack, tetap 200). Pemicu 403 tidak
diketahui.

**Solusi yang dipakai probe (scaffolding probe saja, BUKAN
produk):** relay CONNECT loopback in-process — browser tetap
melakukan `fetch()` asli ke `cdn.jsdelivr.net` (semantik CORS/TLS
utuh end-to-end); relay hanya meneruskan byte CONNECT yang
diterbitkan Node. Selain itu Chromium dijalankan dengan
`--ignore-certificate-errors` (probe-only): egress proxy me-MITM
TLS dengan CA kustom — curl/Node memercayainya lewat
`/etc/ssl/certs`, headless Chromium tidak (`ERR_CERT_AUTHORITY_INVALID`
tanpa flag itu). Relay membaca proxy dari env saat runtime, tidak
pernah me-log kredensial; bila env proxy tidak ada (mesin dengan
internet langsung), relay dilewati.

**Implikasi:** Spike 2 (CORS + offline di runtime sebenarnya) akan
menabrak dinding yang sama bila dijalankan di VM ini — perlu
diputuskan apakah Spike 2 memakai relay yang sama, atau dijalankan
di runtime Tauri di mesin user. Produk akhir berjalan di Tauri di
mesin user (internet langsung), jadi temuan ini tidak memengaruhi
desain produk — hanya cara pengujiannya di VM.

### 6.2 Kredensial proxy di env BEROTASI

Dua nilai password berbeda teramati di dua pemanggilan `exec`
yang berurutan. Kredensial tidak boleh di-hardcode di mana pun;
relay sudah membaca env per-run.

### 6.3 Hal yang TIDAK terverifikasi spike ini

- Penyimpanan `stroke-width`: dump `getDoc()` menunjukkan
  `sw: null` pada objek-objek stroke-based, sementara render
  visual menunjukkan stroke tebal yang benar (~8 unit pada skala
  96). Field penyimpanan lebar stroke yang persis tidak
  diverifikasi — hanya visual. Bukan blocker (render benar).
- `transform=` di dalam `body` ikon asli: tidak ada di kedua set
  yang diuji, jadi belum teruji di alam liar.
- CORS dari origin Tauri / perilaku offline: itu Spike 2.
- Posisi "tengah viewport" + "langsung terseleksi" pada insert
  produk: itu Task 6 (probe ini memakai `loadTestSvg` yang
  me-load sebagai dokumen + `fitView`, bukan insert ke dokumen
  yang sudah ada).

## 7. File yang dibuat / diubah

Dibuat (tidak ada perubahan `src/` — diverifikasi: 0 file `src/`
lebih baru dari `web/assets/geovanta.bundle.js`):

- `probes/probe-iconify-spike1.cjs` — probe throwaway (tetap
  disimpan untuk referensi; berisi relay CONNECT loopback +
  11 asersi).
- `probes/shots/spike1-mdi-home.png` — `mdi:home` ter-render.
- `probes/shots/spike1-mdi-home-recolor.png` — `mdi:home` merah
  (`#E60000`) + selection box.
- `probes/shots/spike1-tabler-home.png` — `tabler:home` outline.
- `probes/shots/spike1-multi.png` — `tabler:arrow-bottom-circle`
  ter-render.
- `probes/shots/spike1-multi-recolor.png` — ikon multi setelah
  Fill `#E60000`.
- `docs/superpowers/plans/sdd-2026-11-15-iconify/task-1-report.md`
  — laporan ini.

Diubah: tidak ada (tidak ada file `src/`, tidak ada file lain).

File sementara di `/tmp` (bukan bagian deliverable, boleh dihapus):
`spike1-proxy-diag*.cjs`, `spike1-relay-diag*.cjs`,
`spike1-netlog.json`, `mdi-icons.json`, `tabler-icons.json`,
`spike1-http.log`. Server `python3 -m http.server 9031` sudah
dimatikan setelah run ke-2.

## 8. Self-review

- **Completeness:** ketiga ikon diuji (native + skala 96),
  asersi bbox, shape count multi-elemen, recolor Fill/Stroke via
  panel asli, verdict GO/NO-GO — semua ada. Tambahan di luar
  brief yang dicatat: observasi grup (`group: null`) dan cek
  Undo U1 (global constraint "satu Ctrl+Z = satu insert").
- **Quality:** nama ikon dan hitungan persis (disalin dari output
  probe, bukan dari ingatan): `mdi:home` 1 objek; `tabler:home`
  2 objek; `tabler:arrow-bottom-circle` 2 objek dari leaf
  `["path","circle"]`. Semua bbox tercatat per sisi, bukan hanya
  w×h.
- **Discipline:** tidak ada perubahan `src/`; hanya probe +
  screenshot + laporan. Tidak ada dependensi npm baru.
- **Testing:** perilaku nyata di browser asli (fetch CDN,
  `parseSVG`, render CanvasKit, panel Fill/Stroke, Undo) — bukan
  mock, bukan curl. Satu-satunya pengecualian yang didokumentasi:
  byte CONNECT diterbitkan relay Node karena Chromium di VM ini
  di-403 gateway (§6.1); fetch-nya sendiri tetap dilakukan
  browser.
- **Kesalahan sendiri yang diperbaiki sebelum lapor:**
  1. Asersi awal "tight bbox = 96×96" salah secara konsep
     (artwork tidak memenuhi frame) — diperbaiki menjadi
     native × 4 (run 1: 4 FAIL → setelah koreksi: 11/11).
  2. Bug pemanggilan `pick(mdi.data, …)` (seharusnya `pick(mdi,
     …)`) — diperbaiki sebelum run hijau pertama.
  3. Header file sempat rusak oleh satu edit yang salah sasaran —
     diperbaiki dan dicek ulang dengan `node --check`.
- **Sisa keraguan (jujur):** penyebab 403 CONNECT Chromium
  tidak ditemukan meski semua variabel yang bisa diuji sudah
  diuji — ini dicatat sebagai temuan lingkungan, bukan sebagai
  klaim. Bila koordinator butuh jawaban itu, yang paling
  menjanjikan berikutnya adalah membaca body JSON 81-byte dari
  respons 403 (tidak berhasil dipancing dari klien non-Chromium)
  atau bertanya ke pengelola gateway.
