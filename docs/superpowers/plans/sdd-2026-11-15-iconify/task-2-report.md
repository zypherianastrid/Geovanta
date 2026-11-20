# Task 2 Report — Spike 2: CORS + offline behavior in the real browser

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§8 Spike 2, §5 C7)
**Date:** 2026-11-15
**Verdict: GO** — both hosts are CORS-clean from the real browser, and
both offline failure modes fail with a catchable error and zero objects
created. No fallback (e.g. thumbnail via `<img>`) is required.

## 1. Verdict (untuk Task 3 dan Task 7)

**GO.**

- `GET https://api.iconify.design/search?query=home&limit=5` — HTTP 200
  in the real browser, body readable via `fetch()` (that readability
  IS the CORS proof: a CORS rejection would make `fetch()` reject).
- `GET https://cdn.jsdelivr.net/npm/@iconify-json/mdi/icons.json` —
  HTTP 200 in the real browser, 7.638 icons, `mdi:home` present.
- Both hosts blocked (Playwright route abort): search fails catchably,
  0 objects.
- CDN-only blocked: probe-level simulated insert (ruling R1) fails
  catchably, 0 objects — while API search keeps working
  (`searchStillOk=true`), proving the two failure modes are independent.

## 2. Exact error strings observed (verbatim — Tasks 3 and 7 reuse these)

Both offline failures produce the **identical** string in headless
Chromium — copied character-for-character from probe output, not
paraphrased:

| Failure | `e.name` | `e.message` | `String(e)` |
| --- | --- | --- | --- |
| A3 — search, both hosts blocked | `TypeError` | `Failed to fetch` | `TypeError: Failed to fetch` |
| A4 — simulated insert, CDN-only blocked | `TypeError` | `Failed to fetch` | `TypeError: Failed to fetch` |

Consequences for Tasks 3 and 7:

1. The raw string carries **no host, no URL, and no reason** — it is
   the same for a search failure and an insert failure, and the same
   for "host blocked" as for "no network at all" (route abort is the
   probe's stand-in for offline; a genuinely offline browser rejects
   `fetch()` with the same `TypeError: Failed to fetch`).
2. User-facing copy therefore **must not display the raw string as
   the explanation** — it says nothing a user can act on. The client
   must distinguish the failure by *which call failed* (search vs.
   `icons.json` load), not by the error string, and map it to the
   honest state from design §7.7 ("Perlu internet untuk mencari
   ikon" / per-set load message). Suggested mapping, for Task 7 to
   confirm: search `fetch` rejects → panel offline state; `icons.json`
   `fetch` rejects → per-set message; both keep the rest of the app
   fully working (E1: 0 pageerror in all runs).
3. The client code should catch `TypeError` from `fetch()` (and
   non-OK HTTP statuses, which do NOT throw — `fetch` only rejects on
   network failure) and treat both as the offline path. Do not branch
   on the message text `"Failed to fetch"`: it is locale- and
   browser-dependent in general, even though it is the exact string
   observed here.

## 3. Hasil probe

Perintah (server dari `web/`):

```text
cd web && python3 -m http.server 9032
SPIKE2_URL=http://127.0.0.1:9032/ node probes/probe-iconify-spike2.cjs
```

`web/` sudah fresh saat spike berjalan (0 file `src/` lebih baru dari
`web/assets/geovanta.bundle.js`, dicek `find src -newer`), jadi
`npm run build:web` tidak dijalankan ulang. Chromium:
`~/.cache/ms-playwright/chromium-1255/`, viewport 1440×900, prefs
light/id (pola yang sama dengan Spike 1).

**Dua run penuh setelah koreksi asersi (§4), hasil identik: 7/7 lolos,
0 pageerror.**

| ID | Asersi | Hasil |
| --- | --- | --- |
| A1 | API search fetch sukses di browser asli (HTTP 200, body terbaca = CORS-clean) | PASS — run 2: status 200, 500 ms, 32 ikon, `total=32`, termasuk `mdi:home` (run 1: 1.112 ms, sama isinya) |
| A2 | CDN `icons.json` fetch sukses di browser asli (HTTP 200, CORS header terbaca JS) | PASS — run 2: status 200, 260 ms, `prefix=mdi`, 7.638 ikon, `hasHome=true`, `acao=*` (run 1: 786 ms) |
| A3 | Kedua host diblokir: search gagal catchable, 0 objek | PASS — `TypeError: Failed to fetch`, `objects=0` |
| A3b | Sanity: search sukses lagi setelah unblock (abort yang menyebabkan A3, bukan aplikasi) | PASS — status 200 |
| A4 | CDN-only diblokir: simulated insert gagal catchable, 0 objek | PASS — `TypeError: Failed to fetch`, `inserted=false`, `searchStillOk=true`, `objects=0` |
| A4b | Sanity: simulated insert yang sama sukses setelah unblock (abort yang menyebabkan A4, bukan parser) | PASS — `inserted=true`, `objects=1` |
| E1 | 0 pageerror | PASS |

Output lengkap run terakhir (run ke-2, identik dengan run ke-1 setelah koreksi):

```text
SPIKE2: 7/7 lolos | SEMUA LOLOS
```

Baseline sebelum asersi: fresh project, `object count = 0`.

## 4. Koreksi asersi (kesalahan probe saya, bukan kegagalan produk)

Run pertama probe ini GAGAL 1 asersi (A1) karena dua asumsi saya
salah. Keduanya diperbaiki di probe, bukan di produk — tidak ada
perubahan perilaku produk:

1. **Saya mengasumsikan `limit=5` dihormati.** Salah: API
   mengembalikan `limit=32` dan 32 ikon untuk `limit=1, 2, 5`
   (diverifikasi via curl; `limit=48` DIhormati — 48 ikon). Artinya
   API punya ukuran halaman minimum 32 dan mengabaikan `limit` yang
   lebih kecil. Asersi diperbaiki menjadi "≥ 1 ikon, termasuk
   `mdi:home`". **Temuan untuk Task 3:** design §7.3 memakai
   `limit=48` — itu aman (48 dihormati). Tapi jangan pernah meminta
   `limit` < 32 dan berharap mendapat halaman kecil; paginasi harus
   dirancang dengan minimum 32 per halaman. Brief Task 2 sendiri
   menulis `limit=5` — nilai itu tidak menghasilkan 5 hasil.
2. **Saya mengasumsikan `Access-Control-Allow-Origin` terbaca dari
   JS.** Salah: API mengirim `access-control-allow-origin: *`
   (diverifikasi via curl response header) TAPI tidak mengirim
   `access-control-expose-headers`, sehingga `headers.get()` dari JS
   mengembalikan `null`. `null` itu berarti "header tidak diekspos
   ke JS", bukan "CORS diblokir". Bukti CORS untuk API adalah
   `fetch()` resolve + body terbaca — bila CORS ditolak, `fetch()`
   akan reject. CDN mengirim `access-control-expose-headers: *`,
   sehingga ACAO-nya terbaca dari JS sebagai `*` (A2 lolos dengan
   asersi header). Asersi A1 diperbaiki: tidak lagi mensyaratkan
   ACAO terbaca JS; nilai `acao(js-visible)=null` dicatat sebagai
   observasi.

## 5. Cara pengujian (metode — dicatat eksplisit sesuai brief)

### 5.1 Cara browser mencapai host di VM ini (relay reuse — baca dengan jujur)

Pola yang **sama persis dengan Spike 1** (`probe-iconify-spike1.cjs`
~89–149) dipakai ulang, tanpa perubahan substansi:

- VM ini tidak punya internet langsung (`curl --noproxy` → 000);
  satu-satunya jalan keluar adalah egress proxy dari env
  `HTTPS_PROXY`/`HTTP_PROXY` (`hatch-egress-proxy:3128`, auth ada,
  nilai tidak pernah di-log).
- Headless Chromium TIDAK BISA CONNECT langsung ke egress proxy:
  CONNECT-nya dijawab `HTTP/1.1 403 Forbidden` (temuan Spike 1,
  net log Chromium), sementara CONNECT byte-identik dari
  curl/python/Node berhasil.
- Probe menjalankan **in-process loopback CONNECT relay**: browser
  diarahkan ke `http://127.0.0.1:<port-relay>` sebagai proxy; relay
  (kode Node) meneruskan CONNECT ke egress proxy. Browser tetap
  melakukan `fetch()` asli ke kedua host — CORS dan perilaku gagal
  jaringan adalah end-to-end dari browser.
- Egress proxy MITM TLS dengan CA kustom (curl/Node memercayainya
  via `/etc/ssl/certs`; headless Chromium tidak), jadi Chromium
  diluncurkan dengan flag probe-only `--ignore-certificate-errors`.

**Yang dibuktikan dan yang TIDAK dibuktikan oleh pengaturan ini:**

- TERBUKTI: CORS kedua host (penolakan CORS akan membuat `fetch()`
  reject walau flag sertifikat diabaikan — flag itu tidak mematikan
  CORS); perilaku gagal yang catchable + 0 objek saat host diblokir;
  isi respons (status, body, jumlah ikon).
- TIDAK TERBUKTI: rantai kepercayaan TLS (validasi sertifikat
  dimatikan oleh flag). Bila Task 3/7 atau reviewer butuh bukti TLS,
  itu harus diuji di lingkungan tanpa MITM proxy (mis. mesin user /
  Tauri asli) — bukan di VM ini dengan probe ini.
- TIDAK ADA relay atau flag sertifikat di kode produk: `src/` tidak
  disentuh sama sekali dalam task ini (lihat §7).

Tidak ditemukan cara yang lebih bersih agar browser menjangkau host
di VM ini — percobaan alternatif (proxy langsung di Playwright /
flag CLI) sudah dicoba dan didokumentasikan Spike 1 sebagai gagal
dengan 403 yang sama.

### 5.2 Blokir = Playwright route abort (sesuai brief)

- A3: `page.route('**/api.iconify.design/**', abort)` +
  `page.route('**/cdn.jsdelivr.net/**', abort)` sebelum `fetch()`
  search; `page.unrouteAll()` sesudahnya.
- A4: hanya `page.route('**/cdn.jsdelivr.net/**', abort)`.
- Route abort adalah stand-in untuk offline: dari sudut pandang
  `fetch()`, keduanya sama — promise reject dengan `TypeError:
  Failed to fetch`. Tidak dipakai `context.setOffline(true)` karena
  brief menentukan route abort, dan route abort memberi kontrol
  per-host yang dibutuhkan A4 (CDN mati, API hidup).
- Sanity A3b/A4b (unblock → sukses lagi) membuktikan kegagalan
  disebabkan oleh abort, bukan oleh aplikasi atau parser.

### 5.3 "Clicking an icon" = simulated insert (ruling R1)

Tidak ada panel. Di dalam satu `page.evaluate`, probe melakukan
jalur sisip persis seperti design §7.4: `fetch(CDI_MDI)` → ambil
`icons.home.body` → rakit `<svg viewBox="0 0 24 24">{body}</svg>` →
`window.__geovantaEditorApi.loadTestSvg(svg, …)` (memanggil
`VE.parseSVG` lalu `loadDoc`, sama seperti Spike 1). `loadTestSvg`
hanya dipanggil bila `fetch` sukses, sehingga kegagalan fetch harus
meninggalkan dokumen utuh — diverifikasi dengan `getDoc().objects`
(`objects=0` di A4; `objects=1` di A4b setelah unblock). Objek dihitung
dari dokumen, bukan dari tampilan.

## 6. Temuan untuk Task 3 dan Task 7 (bukan blocker)

1. **Error string tunggal, tanpa konteks** (§2): kedua kegagalan =
   `TypeError: Failed to fetch`. Bedakan search vs. insert dari
   konteks pemanggilan, bukan dari string.
2. **Minimum halaman search = 32** (§4.1): `limit` < 32 diabaikan
   (respons `limit=32`); `limit=48` dihormati. Task 3: jangan desain
   paginasi dengan halaman < 32.
3. **Kegagalan per-host independen** (A4): API search tetap 200 saat
   CDN diblokir. Panel bisa menampilkan state "cari OK, tapi set
   tidak bisa dimuat" — dan sebaliknya. Task 7: pesan per-set
   (design §7.7) memang dibutuhkan, bukan satu pesan global saja.
4. **CORS fallback di design §5 C7 TIDAK diperlukan:** tidak ada
   endpoint yang menolak CORS; thumbnail via `<img>` + `.json` via
   fetch tidak perlu dipakai sebagai fallback. Jalur hybrid
   (fetch ke kedua host) bisa dipakai apa adanya.
5. **Header CORS per host (curl, untuk arsip):** API —
   `access-control-allow-origin: *`,
   `access-control-allow-methods: GET, OPTIONS`,
   `access-control-max-age: 86400`, tanpa `expose-headers`; CDN —
   `access-control-allow-origin: *`,
   `access-control-expose-headers: *`.

## 7. Files changed / created

- Created (throwaway probe):
  `probes/probe-iconify-spike2.cjs` (15324 byte)
- Created (report): `docs/superpowers/plans/sdd-2026-11-15-iconify/task-2-report.md`
- Modified: none in `src/` (nol — task ini tidak menyentuh kode produk).
- `web/` tidak di-build ulang (sudah fresh; 0 file `src/` lebih baru
  dari `web/assets/geovanta.bundle.js`).

## 8. Self-review

- Completeness: keempat asersi Step 1 ada (A1 search, A2 CDN,
  A3 kedua host diblokir, A4 CDN-only diblokir) + 2 sanity
  (A3b/A4b, membuktikan kausalitas abort) + E1 (0 pageerror).
- Quality: error string disalin verbatim dari output probe
  (`TypeError: Failed to fetch`, kedua asersi); angka (status,
  ms, jumlah ikon, `limit` respons) dikutip dari output yang sama.
  Satu koreksi asersi dilakukan dan didokumentasikan (§4) — run
  pertama yang gagal TIDAK disembunyikan.
- Discipline: `src/` tidak disentuh; hanya probe throwaway +
  report yang dibuat; tidak ada dependensi npm baru.
- Testing: probe memverifikasi perilaku browser asli (bukan curl)
  — `fetch()` di `page.evaluate`, route abort Playwright,
  `loadTestSvg`/`getDoc()` asli; dua run penuh 7/7 identik.
- Concern yang tersisa (dicatat, bukan disembunyikan): validasi
  TLS TIDAK terbukti karena `--ignore-certificate-errors` (§5.1);
  route abort adalah stand-in untuk offline, bukan offline
  sesungguhnya (`context.setOffline` tidak dipakai — sesuai brief).
  Keduanya tidak mengubah verdict GO untuk CORS + perilaku gagal,
  tapi harus diketahui Task 3/7 dan reviewer.

## 9. Issues / concerns

- Tidak ada blocker. Satu-satunya hal yang perlu diingat Task 3:
  jangan mengandalkan `limit` search < 32, dan jangan mengandalkan
  string error untuk membedakan jenis kegagalan (§6).

## Fix round 1

**Tanggal:** 2026-11-15. **Skill:** `test-driven-development`
(fast path — 1 skill; probe ini sendiri adalah artefak tes, `src/`
tidak disentuh). **Verdict tidak berubah: GO.**

Menangani 2 temuan Important dari review. Semua perubahan hanya di
`probes/probe-iconify-spike2.cjs` (backup pra-edit:
`probes/probe-iconify-spike2.cjs.bak-2026-11-15`). Tidak ada perubahan
`src/`, tidak ada perubahan verdict, tidak ada redesign probe.

### Important 1 — Error string di-pin (A3, A4)

Pemeriksaan longgar `typeof message === 'string' && message.length > 0`
diganti asersi eksak pada string verbatim yang dikontrak §2:

- `probes/probe-iconify-spike2.cjs:237` (A3):
  `bothBlocked.threw === true && bothBlocked.string === 'TypeError: Failed to fetch'`
  (dulu `:222-226`: hanya `threw === true` + `message` non-empty).
- `probes/probe-iconify-spike2.cjs:290` (A4):
  `cdnBlockedInsert.string === 'TypeError: Failed to fetch'`
  (dulu `:268-273`: sama longgarnya).
- Teks `expected` kedua asersi ikut diperbarui ke
  `string="TypeError: Failed to fetch"`, dan `actual` kini mencetak
  `String(e)` verbatim, bukan `name: message`.

RED check (bukti asersi baru tidak vakum — dijalankan sebelum probe):
string lain (`'TypeError: Network error'`) GAGAL melewati pin
(`false`), string teramati lolos (`true`).

### Important 2 — Clean FAIL untuk pertanyaan CORS utama (A1, A2, A3b, A4b)

Setiap `page.evaluate` yang memanggil `fetch()`/`r.json()` kini
dibungkus `try/catch` yang mengembalikan
`{threw, name, message, string}`; `check()` mencatat FAIL bila
`threw === true`, bukan crash probe via outer catch (exit 2):

- A1 — `probes/probe-iconify-spike2.cjs:156-172` (evaluate, `try` +
  `catch` mengembalikan `{threw: true, ...}`); kondisi `check()` di
  `:188` kini mensyaratkan `searchOk.threw === false`.
- A2 — `:195-211` (evaluate); kondisi `check()` di `:215` kini
  mensyaratkan `cdnOk.threw === false`.
- A3b — `:245-252` (evaluate); kondisi `check()` di `:256` kini
  mensyaratkan `searchRecovered.threw === false`.
- A4b — **tidak diubah: sudah compliant.** Evaluate-nya sudah
  dibungkus `try/catch` sejak awal (kini `:301-307`, mengembalikan
  `{threw, name, message}`) dan `check()` di `:313` sudah mencatat
  FAIL via `insertRecovered.threw === false`. Diverifikasi, bukan
  diasumsikan.
- Guard dereferensi A1 — `:190` (actual template): `searchOk.icons.length`
  dan `searchOk.icons.includes(...)` diganti
  `(searchOk.icons || []).length` dan
  `(searchOk.icons || []).includes('mdi:home')`, sehingga respons tanpa
  `icons` tidak melempar sebelum `check()` berjalan. (Kondisi `check()`
  di `:188-189` sudah aman karena short-circuit `Array.isArray`, tetapi
  template `actual` dievaluasi tanpa guard — di situlah letak bugnya.)

### Covering test — perintah dan output

Perintah (server dari `web/`, `web/` sudah fresh — 0 file `src/` lebih
baru dari `web/assets/geovanta.bundle.js`, jadi `npm run build:web`
tidak dijalankan ulang; `npm test` tidak dijalankan — task ini tidak
menyentuh `src/`):

```text
cd web && python3 -m http.server 9032
SPIKE2_URL=http://127.0.0.1:9032/ node probes/probe-iconify-spike2.cjs
```

**Dua run penuh, hasil identik: 7/7 lolos, 0 pageerror, exit 0.**
`node --check probes/probe-iconify-spike2.cjs` juga lolos (SYNTAX OK).
`diff` terhadap backup mengonfirmasi hanya baris-baris di atas yang
berubah.

Output run 1 (run 2 identik kecuali ms):

```text
PASS A1 ... | actual=threw=false status=200 ms=660 acao(js-visible)=null icons=32 total=32 limit(resp)=32 includes mdi:home=true
PASS A2 ... | actual=threw=false status=200 ms=425 acao=* prefix=mdi icons=7638 hasHome=true
PASS A3 ... | actual=threw=true TypeError: Failed to fetch objects=0
PASS A3b ... | actual=threw=false status=200
PASS A4 ... | actual=threw=true inserted=false TypeError: Failed to fetch searchStillOk=true objects=0
PASS A4b ... | actual=inserted=true objects=1
PASS E1 0 pageerror | actual=[]

SPIKE2: 7/7 lolos | SEMUA LOLOS
RUN1 exit=0
```

Run 2: A1 ms=342, A2 ms=212, sisanya identik; `SPIKE2: 7/7 lolos |
SEMUA LOLOS`, `RUN2 exit=0`.

### Self-review

- Completeness: kedua temuan ditangani tepat seperti yang diminta —
  pin string eksak di A3/A4; `try/catch` + `{threw, name, message}`
  di A1/A2/A3b (A4b diverifikasi sudah compliant); guard
  `(searchOk.icons || [])` di A1.
- Discipline: hanya probe yang diubah; `src/` nol; verdict GO tidak
  berubah; `diff` vs backup tidak menunjukkan perubahan lain.
- Testing: probe dijalankan 2× penuh setelah fix, 7/7 + 0 pageerror
  keduanya; RED check membuktikan pin string baru dapat gagal.
- Concern: tidak ada. Satu catatan: pin string eksak berarti probe
  ini akan FAIL bila Chromium/locale/mode kegagalan berubah dan
  menghasilkan string berbeda — itu memang tujuan temuan Important 1
  (kontrak §2 harus dijaga, bukan dilonggarkan diam-diam).
