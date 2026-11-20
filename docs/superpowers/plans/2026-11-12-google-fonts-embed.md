# Google Fonts Embed (Pilih → Otomatis Disematkan) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daftar semua keluarga Google Fonts (1.968) muncul di picker font; memilih satu keluarga otomatis mengunduh file TTF-nya, mendaftarkannya ke registry, dan menyimpannya sebagai aset proyek (embed) — tanpa user mengunduh file satu per satu.

**Architecture:** Katalog keluarga dibundel sebagai JSON statis (snapshot gwfh 2026-11-12). Saat dipilih, modul `googleFonts.jsx` mengambil JSON detail keluarga dari gwfh, mengunduh TTF latin (regular/700/italic/700italic yang tersedia), memvalidasi + mendaftarkan lewat `TextFontRegistry.addFamily`, dan menyimpan tiap face via `AssetManager.ingestBlob` agar proyek tetap bisa dibuka offline. Picker memakai mode searchable baru di `Select`.

**Tech Stack:** React + esbuild (JSON import), CanvasKit `TypefaceFontProvider`, `TextFontRegistry`, `AssetManager` (IndexedDB), gwfh API (`gwfh.mranftl.com/api/fonts`) + `fonts.gstatic.com` (TTF).

**Spec:** Pesan user 2026-11-12 10:15 WIB (chat ini): "tambahkan juga semua list family google font, jadi ini pakai sistem embed, saat user memilih font tertentu akan otomatis meng embed font tersebut, bukan di download satu per satu". Plus perbaikan bug terkait yang ditemukan saat audit jalur ini: `importFontFiles` memanggil `registry.registerFont` / `registry.loadedAssets` yang TIDAK ADA di `TextFontRegistry` (terbukti via Node: `typeof === 'undefined'`) — impor .ttf manual saat ini selalu gagal dengan pesan "Font tidak valid".

## Global Constraints

- Offline-first tetap berlaku: font yang sudah disematkan harus tetap bisa dipakai tanpa internet (aset IndexedDB + `ensureAssetFont`); hanya pengunduhan pertama yang butuh internet.
- Registry hanya mengenal 4 face (`regular`/`bold`/`italic`/`boldItalic`); embed mengunduh maksimal 4 face itu (regular=400, bold=700, italic, boldItalic). Bobot lain (300/500/800/900) TIDAK didukung di v1 — dropdown Ketebalan tetap `WEIGHT_OPTIONS` lama (normal/500/600/bold).
- Font bytes harus TTF/OTF (validator `validateFontBytes` menolak woff/woff2). CSS2 API Google hanya memberi woff/woff2, jadi file diambil dari URL `ttf` di JSON gwfh.
- Jangan ubah perilaku font bawaan (IBM Plex Sans) atau font yang sudah diimpor manual.
- Backup `.bak-gfonts` sebelum edit destruktif; tes dulu (merah) baru perbaiki; verifikasi Playwright terhadap build `web/` hasil `npm run build:web`.

## Review Focus

- Font tanpa varian 700 (mis. hanya 400): tombol B harus tetap fallback ke regular, bukan crash — tes ada di Task 2.
- Font tanpa varian italic: style italic fallback ke regular — tes ada di Task 2.
- Pilih keluarga yang sama dua kali cepat: embed kedua harus menunggu/mengabaikan yang pertama (pending map) — tes ada di Task 6.
- Offline (fetch gagal): pesan jelas, teks tetap menyimpan nama keluarga, tidak ada crash — tes ada di Task 2 + Playwright Task 7.
- Daftar 1.968 keluarga di dropdown tanpa pencarian = DOM raksasa; mode searchable wajib membatasi render (maks 100) — tes ada di Task 4.

---

### Task 1: Katalog Google Fonts sebagai JSON statis

**Files:**
- Create: `src/data/googleFonts.json` (dihasilkan dari `/tmp/gfonts-list.json`)
- Test: `tests/google-fonts.test.cjs` (baru)

**Interfaces:**
- Consumes: snapshot gwfh `/tmp/gfonts-list.json` (1.968 entri, sudah diunduh 2026-11-12)
- Produces: `GOOGLE_FONTS` — `{version, source, count, families: [{id, family, cat, v: [variantId]}]}`; dipakai Task 2 & 6.

- [ ] **Step 1: Tulis skrip generator sekali-pakai di `/tmp/gen-gfonts.mjs`**

Skrip membaca `/tmp/gfonts-list.json`, memetakan tiap entri ke `{id, family, cat: category, v: variants}`, menulis `src/data/googleFonts.json` dengan header `{version: '2026-11-12', source: 'gwfh.mranftl.com/api/fonts', count}`. Urutan dipertahankan (sudah urut popularitas).

- [ ] **Step 2: Jalankan skrip dan periksa hasil**

Run: `node /tmp/gen-gfonts.mjs && ls -la src/data/googleFonts.json`
Expected: file ada, `count === 1968`, ukuran < 400 KB.

- [ ] **Step 3: Tulis tes katalog gagal-dulu**

```js
test('katalog Google Fonts: 1968 keluarga, id unik, varian valid', () => {
  const {GOOGLE_FONTS, findGoogleFamily} = mod.exports;
  assert.equal(GOOGLE_FONTS.count, 1968);
  assert.equal(new Set(GOOGLE_FONTS.families.map(f => f.id)).size, 1968);
  assert.equal(findGoogleFamily('Inter').family, 'Inter');
  assert.ok(findGoogleFamily('Inter').v.includes('700italic'));
  assert.equal(findGoogleFamily('Tidak Ada'), null);
});
```

- [ ] **Step 4: Jalankan tes, pastikan GAGAL (modul belum ada)**

Run: `node --test tests/google-fonts.test.cjs`
Expected: FAIL — `Cannot find module '../src/renderer/googleFonts.jsx'`.

- [ ] **Step 5: Commit**

```bash
git add src/data/googleFonts.json tests/google-fonts.test.cjs
git commit -m "test: katalog Google Fonts 1968 keluarga (tes merah)"
```

### Task 2: Modul `googleFonts.jsx` — katalog + embed

**Files:**
- Create: `src/renderer/googleFonts.jsx`
- Test: `tests/google-fonts.test.cjs`

**Interfaces:**
- Consumes: `src/data/googleFonts.json`; `TextFontRegistry` (`addFamily`, `inspectFontBytes`, `validateFontBytes`); `AssetManager.ingestBlob`
- Produces: `GOOGLE_FONTS`, `findGoogleFamily(nameOrId)`, `pickFaceVariants(variants)` → `{regular, bold, italic, boldItalic}` (variant id atau null), `embedGoogleFont({registry, projectId, family, fetchFn?, apiBase?})` → `{family, faces, assetIds}`

- [ ] **Step 1: Implementasi `pickFaceVariants(variants)`**

Parsing varian: `"regular"` → {400, normal}; `"italic"` → {400, italic}; `"700"` → {700, normal}; `"700italic"` → {700, italic}; `"300"` → {300, normal}, dst. Pilihan: regular = varian normal bobot terdekat 400 (400 → 300 → 500 → bobot normal terendah); bold = normal terdekat 700 dari atas (700 → 800 → 600 → 900 → bobot normal tertinggi); italic = italic terdekat 400; boldItalic = italic terdekat 700. Bila tidak ada varian italic sama sekali, `italic`/`boldItalic` = null (registry fallback ke regular).

- [ ] **Step 2: Implementasi `embedGoogleFont`**

  1. Cari entri katalog (`findGoogleFamily`); bila tidak ada → throw `Error('Font Google tidak dikenal: …')`.
  2. `fetchFn(apiBase + '/' + id)` → JSON keluarga; cache per id di `Map` modul.
  3. Dari `json.variants` (array objek `{id, fontStyle, fontWeight, ttf}`) petakan face → URL `ttf`; hanya face yang `pickFaceVariants` pilih.
  4. Unduh tiap TTF paralel (`fetchFn(url)` → `arrayBuffer()`); tolak bila `bytes.length > 16 MiB` atau 4 byte awal bukan sfnt (`00 01 00 00`) / OTTO (`OTTO`).
  5. `inspectFontBytes(bytes, namaFile)` tiap face → pakai `meta.family` (nama dari tabel font; fallback ke nama katalog).
  6. Bila `projectId`: `AssetManager.ingestBlob(projectId, new Blob([bytes], {type: 'font/ttf'}), namaFile)` per face → `assetIds`.
  7. `registry.addFamily(family, faces, assetIds.regular || firstAssetId)`.
  8. Return `{family, faces: Object.keys(faces), assetIds}`. Semua throw memakai pesan Bahasa Indonesia yang jelas (offline: `fetch` gagal → `Perlu internet untuk mengunduh font Google …`).

- [ ] **Step 3: Tulis tes unit (mock fetch, tanpa jaringan)**

```js
test('pickFaceVariants memilih 4 face + fallback saat 700/italic tidak ada', () => {
  assert.deepEqual(pickFaceVariants(['regular', '700', 'italic', '700italic']),
    {regular: 'regular', bold: '700', italic: 'italic', boldItalic: '700italic'});
  assert.deepEqual(pickFaceVariants(['regular']),
    {regular: 'regular', bold: null, italic: null, boldItalic: null});
  assert.deepEqual(pickFaceVariants(['300', '500', '800']),
    {regular: '300', bold: '800', italic: null, boldItalic: null});
});
test('embedGoogleFont memakai URL ttf dari JSON keluarga + mendaftarkan face (fetch mock)', async () => {
  // fetchFn mock: kembalikan fixture JSON keluarga (2 varian) lalu bytes TTF
  // fixture dari file Inter asli; assert registry.getFace('Inter Test') ada
  // dan ingestBlob dipanggil per face.
});
test('embedGoogleFont gagal jelas saat offline', async () => {
  // fetchFn mock yang selalu throw TypeError('Failed to fetch')
  // assert.rejects(..., /internet/i)
});
```

- [ ] **Step 4: Jalankan tes sampai hijau**

Run: `node --test tests/google-fonts.test.cjs`
Expected: PASS (semua tes Task 1 + Task 2).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/googleFonts.jsx tests/google-fonts.test.cjs
git commit -m "feat: modul embed Google Fonts (katalog + unduh TTF + registrasi)"
```

### Task 3: Perbaiki `importFontFiles` (jalur impor manual yang rusak)

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (~baris 973, fungsi `importFontFiles`)
- Test: `tests/text-tool.test.cjs` (tambah regresi statis: tidak ada lagi pemanggilan `registerFont`/`loadedAssets`)

**Interfaces:**
- Consumes: `inspectFontBytes`, `AssetManager.ingestBlob`, `TextFontRegistry.addFamily`
- Produces: impor .ttf/.otf manual kembali berfungsi; dipakai Task 6 (pola yang sama).

- [ ] **Step 1: Tulis tes regresi gagal-dulu**

```js
test('REGRESI impor font: importFontFiles memakai addFamily, bukan registerFont', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/components/editor/VectorEditor.jsx'), 'utf8');
  assert.doesNotMatch(src, /registry\.registerFont\(/);
  assert.doesNotMatch(src, /registry\.loadedAssets/);
  assert.match(src, /registry\.addFamily\(/);
});
```

- [ ] **Step 2: Jalankan tes, pastikan GAGAL**

Run: `node --test tests/text-tool.test.cjs -t "REGRESI impor font"`
Expected: FAIL.

- [ ] **Step 3: Perbaiki `importFontFiles`**

Ganti `registry.registerFont(bytes, info.family, info.weight, info.style)` → `registry.addFamily(info.family, {[info.faceKey]: bytes}, assetId)`; hapus baris `registry.loadedAssets.set(...)`. (`addFamily` menggabungkan face dengan keluarga yang sudah ada; `fontAssetId` teks tetap `lastAssetId` seperti sebelumnya.)

- [ ] **Step 4: Jalankan tes sampai hijau + seluruh suite**

Run: `npm test`
Expected: PASS, tidak ada regresi.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/VectorEditor.jsx tests/text-tool.test.cjs
git commit -m "fix: importFontFiles memakai TextFontRegistry.addFamily"
```

### Task 4: Mode searchable di `Select`

**Files:**
- Modify: `src/components/ui/SelectDropdown.jsx`
- Test: `tests/text-tool.test.cjs` (render SSR: filter + cap + separator disabled)

**Interfaces:**
- Consumes: props `Select` yang sudah ada + props baru opsional `searchable?: boolean`, `searchPlaceholder?: string`
- Produces: `Select` dengan input filter di atas daftar, render maks 100 opsi cocok, opsi `[k, t, ic, {disabled: true}]` tidak bisa dipilih (klik/Enter/keyboard dilewati).

- [ ] **Step 1: Tulis tes gagal-dulu (render SSR via ReactDOMServer)**

```js
test('Select searchable: filter menyaring opsi + cap 100 + separator disabled', () => {
  // Render Select searchable dengan 150 opsi 'Font-0'..'Font-149' + separator;
  // simulasikan filter 'Font-1' -> opsi ter-render <= 100 dan mengandung Font-1;
  // opsi separator (disabled) tidak punya handler pilih.
});
```

(Catatan: `Select` memakai `useState` + `Float` (portal) — render SSR hanya memeriksa markup awal; perilaku filter diuji Playwright di Task 7.)

- [ ] **Step 2: Implementasi**

  - Prop `searchable`: bila true, tampilkan `<input>` filter (pakai `CustomTextBox`? — bila terlalu terikat, pakai `<input type="text">` dengan `onKeyDown={e => e.stopPropagation()}` + `data-custom-input="true"` agar shortcut global tidak membajak ketikan, konsisten dengan perbaikan font inspector).
  - Filter: `options.filter(o => o[1].toLowerCase().includes(q))`, tampilkan maks 100 pertama + baris keterangan `Menampilkan 100 dari N`.
  - Opsi disabled: class `opt dis`, klik diabaikan, navigasi keyboard melewatinya, `choose` menolak key disabled.
  - Saat filter aktif, separator disembunyikan.
  - Tanpa `searchable`, perilaku lama tidak berubah (tes lama tetap hijau).

- [ ] **Step 3: Jalankan tes sampai hijau + seluruh suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/SelectDropdown.jsx tests/text-tool.test.cjs
git commit -m "feat: mode searchable + opsi disabled di Select"
```

### Task 5: Integrasi `TextInspector` (picker Google Fonts + status embed)

**Files:**
- Modify: `src/components/editor/TextInspector.jsx`
- Test: `tests/text-tool.test.cjs` (render SSR)

**Interfaces:**
- Consumes: props baru `googleFonts?: [{id, family, cat, v}]`, `embedStatus?: {family, state: 'loading'|'done'|'error', message}`, `onEmbedFont?: (family) => void`
- Produces: dropdown Keluarga Font berisi keluarga terdaftar + separator `── Google Fonts ──` + katalog Google (searchable); saat memilih keluarga Google yang belum terdaftar → `onEmbedFont(family)` (bukan `update` langsung); status embed tampil di bawah picker; banner font-hilang disembunyikan saat status keluarga ini `loading`.

- [ ] **Step 1: Tulis tes gagal-dulu**

```js
test('TextInspector menampilkan katalog Google Fonts + status embed', () => {
  // Render dengan googleFonts=[{id:'inter',family:'Inter',...}] dan availableFonts=['IBM Plex Sans'];
  // html mengandung 'Inter' dan 'Google Fonts'; dengan embedStatus loading untuk
  // keluarga terpilih, banner missing-font tidak tampil.
});
```

- [ ] **Step 2: Implementasi**

  - `families` tetap dari `availableFonts` (terdaftar) + `t.fontFamily`; `googleOptions` = katalog yang belum terdaftar (urut popularitas dari JSON).
  - `options` Select keluarga: `[...families.map(...) , ['__sep_google__', '── Google Fonts ──', null, {disabled: true}], ...googleOptions.map(f => [f.family, f.family])]`; prop `searchable` true + `searchPlaceholder` "Cari font…".
  - `on` keluarga: bila `v` ada di katalog Google dan belum terdaftar → `onEmbedFont ? onEmbedFont(v) : update({fontFamily: v})`; bila sudah terdaftar → `update({fontFamily: v})` seperti biasa.
  - Status: bila `embedStatus?.family === t.fontFamily`, tampilkan baris kecil di bawah picker: loading → `Mengunduh {family}…`; done → `✓ {family} disematkan ke proyek`; error → `Gagal: {message}` (tetap tampil sampai keluarga diganti).
  - Banner missing-font: sembunyikan bila status keluarga ini `loading` (font sedang diunduh, bukan hilang).

- [ ] **Step 3: Jalankan tes sampai hijau + seluruh suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/TextInspector.jsx tests/text-tool.test.cjs
git commit -m "feat: picker Google Fonts + status embed di TextInspector"
```

### Task 6: Wiring `VectorEditor` (embed handler + daftar gabungan)

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (sekitar baris 135, 7304-7320)
- Test: `tests/text-tool.test.cjs` (regresi statis: handler ada, pending map ada)

**Interfaces:**
- Consumes: `embedGoogleFont` (Task 2), `GOOGLE_FONTS` (Task 1), `TextFontRegistry`, `projectId`, `commitObjs`, `setFontCatalogVer`
- Produces: `textControls` meneruskan `googleFonts`, `embedStatus`, `onEmbedFont` ke `TextInspector`; teks terpilih berganti keluarga setelah embed selesai.

- [ ] **Step 1: Tulis tes regresi gagal-dulu**

```js
test('REGRESI embed Google Fonts: VectorEditor punya handler + pending map', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/components/editor/VectorEditor.jsx'), 'utf8');
  assert.match(src, /embedGoogleFontForSelection/);
  assert.match(src, /googleEmbedPending/);
  assert.match(src, /onEmbedFont=\{embedGoogleFontForSelection\}/);
});
```

- [ ] **Step 2: Implementasi handler**

```js
const googleEmbedPending = useRef(new Map());
const [googleFontStatus, setGoogleFontStatus] = useState(null);
const embedGoogleFontForSelection = async (familyName) => {
  const key = String(familyName).toLowerCase();
  if (googleEmbedPending.current.has(key)) return;
  const registry = sceneRendererRef.current?.scene?.fontRegistry || null;
  if (!registry) { setGoogleFontStatus({family: familyName, state: 'error', message: 'Font registry tidak tersedia'}); return; }
  setGoogleFontStatus({family: familyName, state: 'loading', message: ''});
  const job = (async () => {
    try {
      const res = await embedGoogleFont({registry, projectId, family: familyName});
      if (sceneRendererRef.current?.scene?.textLayouts) sceneRendererRef.current.scene.textLayouts.clear();
      setFontCatalogVer(v => v + 1);
      const hasSelectedText = docRef.current.objects.some(o => selRef.current.objs.has(o.id) && o.type === 'text' && !o.locked);
      if (hasSelectedText) {
        commitObjs(o => selRef.current.objs.has(o.id) && o.type === 'text' && !o.locked
          ? normalizeTextObject({...o, text: {...o.text, fontFamily: res.family, fontAssetId: res.assetIds.regular || res.assetIds[Object.keys(res.assetIds)[0]] || null}})
          : o, 'text-font-google-embed');
      } else if (sceneRendererRef.current) sceneRendererRef.current.requestRender(true);
      setGoogleFontStatus({family: res.family, state: 'done', message: ''});
      say(`Font "${res.family}" berhasil disematkan ke proyek`);
    } catch (e) {
      setGoogleFontStatus({family: familyName, state: 'error', message: e?.message || 'Gagal mengunduh font'});
      say('Gagal menyematkan font: ' + (e?.message || 'periksa koneksi internet'));
    } finally { googleEmbedPending.current.delete(key); }
  })();
  googleEmbedPending.current.set(key, job);
  return job;
};
```

  - Teruskan ke `TextInspector`: `googleFonts={GOOGLE_FONTS.families}`, `embedStatus={googleFontStatus}`, `onEmbedFont={embedGoogleFontForSelection}`.
  - `availFonts` tetap dari registry saja (keluarga Google yang belum di-embed TIDAK masuk `availableFonts` — mereka datang lewat prop `googleFonts`).

- [ ] **Step 3: Jalankan tes + seluruh suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/VectorEditor.jsx tests/text-tool.test.cjs
git commit -m "feat: wiring embed Google Fonts di VectorEditor"
```

### Task 7: Verifikasi akhir (Playwright + build + ZIP)

**Files:**
- Test: `/tmp/gfonts/probe-gfonts.cjs` (baru), `/tmp/gfonts/mock-server` (server lokal: fixture JSON keluarga + TTF Inter asli)
- Test: `tests/google-fonts.test.cjs`, `tests/text-tool.test.cjs`

**Interfaces:**
- Consumes: build `web/` hasil `npm run build:web`
- Produces: bukti Playwright + ZIP final

- [ ] **Step 1: Siapkan mock lokal (tanpa tergantung jaringan sandbox)**

  - Unduh 4 TTF Inter (latin regular/700/italic/700italic) via curl dari URL `ttf` gwfh ke `/tmp/gfonts/fixtures/`.
  - Server lokal menyajikan: `GET /api/fonts/inter` → fixture JSON keluarga (URL `ttf` menunjuk ke server lokal); `GET /files/*.ttf` → file TTF.
  - Embed module harus bisa diarahkan ke mock: `embedGoogleFont({apiBase: 'http://127.0.0.1:PORT/api/fonts'})` — diuji unit; di Playwright, arahkan via `window.GEOVANTA_GOOGLE_FONTS_API` yang dibaca VectorEditor (fallback ke default gwfh bila tidak ada).

- [ ] **Step 2: Tulis probe Playwright**

  Skenario: (G1) buka picker Keluarga Font → ketik "inter" di filter → pilih Inter → tunggu status done → `document.fonts.check('16px Inter')` true + teks ter-render Inter (screenshot); (G2) muat ulang halaman → Inter tetap ada di daftar keluarga (aset tersimpan, tanpa unduh ulang — hitung request ke mock = 0 setelah reload); (G3) pilih keluarga yang gagal diunduh (mock 404) → status error tampil, tidak ada crash, 0 pageerror; (G4) regression bounds: ulangi probe-boxh2 (B1–B3) — tetap 4/4.

- [ ] **Step 3: Jalankan probe + seluruh suite + build**

Run: `npm test && npm run build:web`
Expected: PASS semua; Playwright G1–G4 lolos; 0 pageerror/console error.

- [ ] **Step 4: Buat ZIP + smoke test ekstrak bersih**

ZIP `~/workspace/your_files/Geovanta-Google-Fonts-Embed.zip` (tanpa `node_modules`, tanpa `*.bak*`); ekstrak bersih → smoke Playwright (buka editor, pilih teks, picker menampilkan Inter).

- [ ] **Step 5: Perbarui ledger + MEMORY.md, serahkan ke user**

Ledger `docs/superpowers/plans/2026-11-12-text-tool-ledger.md` + `~/MEMORY.md`: catat embed Google Fonts + perbaikan `importFontFiles` + batasan (butuh internet saat pertama kali; hanya 4 face; `fontAssetId` menyimpan 1 face — buka ulang proyek hanya memuat ulang face itu, sama seperti impor manual).

## Self-Review

1. **Spec coverage:** daftar semua keluarga ✓ (Task 1, 1.968); embed otomatis saat dipilih ✓ (Task 5+6); bukan unduh satu-per-satu oleh user ✓ (Task 2 mengunduh + menyimpan otomatis); perbaikan bounds ✓ (selesai sebelum plan ini — `npm test` 77/77, Playwright 4/4).
2. **Step scan:** tiap langkah menghasilkan satu hal yang bisa dicek (tes merah → implementasi → tes hijau → commit).
3. **Type consistency:** `embedGoogleFont` mengembalikan `{family, faces, assetIds}` di Task 2 dan dipakai dengan nama field yang sama di Task 6; `embedStatus` `{family, state, message}` sama di Task 5 & 6.
4. **Review Focus:** 5 risiko di atas masing-masing punya tes di task pemiliknya.
5. **Proportion:** plan ini ~2x panjang spec (spec = 1 kalimat + 1 bug temuan) — wajar karena ada 2 subsistem (katalog/embed + perbaikan impor) dan 5 risiko yang harus dipasangi tes.
