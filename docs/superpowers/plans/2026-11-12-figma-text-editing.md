# Edit Teks Geovanta Figma-like (Pendekatan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat edit teks Geovanta di kanvas berperilaku seperti Figma di video user, dengan tetap memakai textarea overlay: Escape = commit, nama layer mengikuti isi secara live, klik tool Teks pada teks lama masuk edit dengan caret di posisi klik, drag handle tepi menghasilkan lebar terukur + reflow akurat, spellcheck eksplisit, kursor I-beam.

**Architecture:** Perubahan lokal di 4 titik sentuh yang sudah dipetakan (overlay, VectorEditor, transformObject, textLayout) tanpa menyentuh mesin render atau model data — kecuali flag penanda nama-otomatis baru. Setiap goal diuji probe Playwright per perilaku; helper murni diuji unit via pola `loadSource` esbuild.

**Tech Stack:** React (JSX), CanvasKit 0.42.0, Node `--test` (CJS), Playwright-core 1.65.0 (via `NODE_PATH=~/workspace/vector-editor/node_modules`).

**Spec:** `docs/superpowers/specs/2026-11-12-figma-text-editing-design.md`

## Global Constraints

- Working copy BUKAN repo git — tidak ada `git commit`; ganti langkah commit dengan backup `.bak-<tag>` sebelum edit destruktif + verifikasi sesudah tiap task (kontrak `AGENTS.md`).
- Diff minimal; ikuti spesifikasi apa adanya; tidak ada perluasan scope tanpa persetujuan.
- Setiap perubahan `src/` wajib `npm run build:web` sebelum probe browser (server app port 8931 melayani root folder proyek; `index.html` memuat `./dist/assets/geovanta.bundle.js`).
- `npm test` = `node --test tests/*.test.cjs`; baseline hijau 135/135 sebelum mulai.
- Probe Playwright memakai pola ronde sebelumnya (`probes/probe-figma-text.cjs` baru); server mock font port 8941 (`node probes/mock-server.cjs`) harus hidup saat menjalankan probe font.
- Jangan ubah perilaku Escape di luar overlay teks; rename otomatis tidak pernah menimpa nama manual.
- Threshold yang dipin spec: potong nama layer 30 karakter (keras, buang newline); deadzone klik-vs-drag tool teks 6 px layar (sudah ada, jangan diubah).

## Review Focus

- Klik tool Teks pada teks lama lalu **drag** (bukan klik) → harus membuat kotak teks baru, bukan masuk edit. Test di Task 4.
- Escape pada teks baru yang **kosong** → objek dihapus, bukan ter-commit sebagai objek kosong. Test di Task 2.
- Rename manual lalu edit isi → nama **tidak** lagi mengikuti isi (flag otomatis sudah dibersihkan). Test di Task 3.
- Rename live saat mengetik → **tidak boleh** menambah entri history per ketikan (pakai `live()`, bukan `commitObjs`). Test di Task 3.
- Klik di luar glyph (sebelum karakter pertama / sesudah terakhir) → caret clamp ke ujung terdekat (0 atau `content.length`). Test di Task 4.

---

## File Structure

| File | Tanggung jawab dalam rencana ini |
|---|---|
| `src/components/editor/TextEditOverlay.jsx` (217 baris) | Escape→finish, prop `caret`, atribut `spellCheck`/`lang` (G3, G4, G6) |
| `src/components/editor/VectorEditor.jsx` (~7400 baris) | `finishTextEdit` gabungan, `onLiveChange`, pointerdown tool teks, `commitRename` clears flag, hapus `cancelTextEdit` (G2, G3, G4) |
| `src/engine/legacyText.jsx` | Helper murni `textAutoName(content)` + normalisasi flag `autoName` (G2) |
| `src/engine/affineAndOrientedBox.jsx` | `transformObject` terima lebar terukur (G5) |
| `src/renderer/textLayout.jsx` | Helper `caretOffsetForPoint(paragraph, x, y)` (G4) |
| `tests/figma-text.test.cjs` (baru) | Unit: `textAutoName`, `transformObject` measuredW, `caretOffsetForPoint` (stub paragraph) |
| `probes/probe-figma-text.cjs` (baru) | Probe Playwright per goal (pola ronde sebelumnya) |

---

### Task 1: Baseline hijau

**Files:**
- Modify: (tidak ada — hanya verifikasi)

**Interfaces:**
- Consumes: —
- Produces: angka baseline yang dipakai semua task berikutnya (npm test 135/135, build exit 0).

- [ ] **Step 1: Jalankan `npm test` di folder proyek**

Run: `npm test`
Expected: 135/135 lolos.

- [ ] **Step 2: Jalankan `npm run build:web`**

Run: `npm run build:web`
Expected: exit 0; `dist/assets/geovanta.bundle.js` terbarui.

- [ ] **Step 3: Catat baseline di ledger rencana**

Tulis angka Step 1–2 di `docs/superpowers/plans/2026-11-12-figma-text-editing-progress.md` (buat bila belum ada).

---

### Task 2: G3 — Escape = commit, hapus jalur batal

**Files:**
- Modify: `src/components/editor/TextEditOverlay.jsx:166-169`
- Modify: `src/components/editor/VectorEditor.jsx:971-976`, `:7078`
- Test: `probes/probe-figma-text.cjs` (skenario E1–E2)

**Interfaces:**
- Consumes: `finishTextEdit` (`VectorEditor.jsx:964-970`) — commit isi, hapus teks baru kosong.
- Produces: overlay tanpa jalur batal; `cancelTextEdit` tidak ada.

- [ ] **Step 1: Backup**

Run: `cp src/components/editor/TextEditOverlay.jsx src/components/editor/TextEditOverlay.jsx.bak-figmatext && cp src/components/editor/VectorEditor.jsx src/components/editor/VectorEditor.jsx.bak-figmatext`

- [ ] **Step 2: Tulis skenario probe E1–E2 di `probes/probe-figma-text.cjs` (gagal dulu)**

E1: buat teks, ketik `halo`, tekan Escape → assert objek teks berisi `halo` tetap ada + terseleksi (bukan terbuang).
E2: buat teks baru, tekan Escape tanpa mengetik → assert tidak ada objek teks baru (dihapus).
Jalankan probe; expected: FAIL (Escape masih membuang ketikan).

- [ ] **Step 3: Ubah handler Escape di `TextEditOverlay.jsx:166-169`**

`if (e.key === 'Escape') { e.preventDefault(); finish(); }` — panggil `finish()`, bukan `cancel()`.

- [ ] **Step 4: Hapus jalur batal**

Hapus `cancel()` di `TextEditOverlay.jsx:25-30` + prop `onCancel` (deklarasi :4 dan pemakaian), hapus `cancelTextEdit` di `VectorEditor.jsx:971-976`, hapus `onCancel={cancelTextEdit}` di render site `:7078`. Verifikasi: `grep -rn "cancelTextEdit\|onCancel" src/` mengembalikan 0 hasil.

- [ ] **Step 5: Build + jalankan probe E1–E2**

Run: `npm run build:web` lalu probe.
Expected: E1–E2 PASS, 0 pageerror.

- [ ] **Step 6: Jalankan `npm test`**

Expected: 135/135 (tidak ada regresi unit).

---

### Task 3: G2 — Nama layer mengikuti isi, live, satu langkah undo

**Files:**
- Modify: `src/engine/legacyText.jsx` (helper + normalisasi flag)
- Modify: `src/components/editor/VectorEditor.jsx:964-970` (`finishTextEdit`), `:7078` (oper `onLiveChange`), `:1177-1210` (`commitRename` cabang non-group), `:4980-4984` (nama awal + flag), `:949-963` (jalur live bila perlu)
- Test: `tests/figma-text.test.cjs` (unit `textAutoName`), `probes/probe-figma-text.cjs` (skenario N1–N5)

**Interfaces:**
- Consumes: `live(d, opts)` (`VectorEditor.jsx:795-824`, tanpa history); `commitObjs(fn, key)` (`:905-922`, satu `push` = satu Ctrl+Z); `onLiveChange` overlay (sudah dipanggil di `TextEditOverlay.jsx:157-161`, belum pernah dioper).
- Produces: `textAutoName(content) -> string` (di `legacyText.jsx`); objek teks membawa flag top-level `autoName: true/false`; `finishTextEdit` commit gabungan nama+isi.

- [ ] **Step 1: Tulis unit test `textAutoName` (gagal dulu)**

```js
test('textAutoName: baris pertama, potong 30 karakter', () => {
  assert.equal(textAutoName('ini adalah teks editing di figma'), 'ini adalah teks editing di fig');
  assert.equal(textAutoName('baris satu\nbaris dua'), 'baris satu');
  assert.equal(textAutoName(''), 'Text');
});
```

Run: `node --test tests/figma-text.test.cjs`. Expected: FAIL (fungsi belum ada).

- [ ] **Step 2: Implementasi `textAutoName(content)` di `src/engine/legacyText.jsx`**

Ambil baris pertama, trim, potong keras 30 karakter, buang newline; bila hasil kosong kembalikan `'Text'`. Pastikan `normalizeTextObject` me-spread `...o` sehingga flag top-level `autoName` lolos (sudah begitu hari ini).

- [ ] **Step 3: Jalankan unit test**

Expected: PASS.

- [ ] **Step 4: Tulis skenario probe N1–N5 (gagal dulu)**

N1: ketik `ini adal` → assert nama layer di panel = `ini adal` **sebelum** commit (live).
N2: Escape (commit) → assert nama tetap `ini adal`.
N3: edit lagi jadi `ini adalah teks` → assert nama berubah mengikuti.
N4: rename manual via panel Layers jadi `Judul Saya`, edit isi lagi → assert nama tetap `Judul Saya`.
N5: buat teks `halo`, Escape, Ctrl+Z sekali → assert teks hilang seluruhnya (nama+isi satu langkah undo).
Jalankan probe; expected: FAIL.

- [ ] **Step 5: Set flag saat pembuatan teks (`VectorEditor.jsx:4980-4984`)**

Objek teks baru dibuat dengan `autoName: true` (top-level, di samping `name`).

- [ ] **Step 6: Oper `onLiveChange` di render site (`:7078`)**

`onLiveChange={liveRenameText}` — handler baru: bila objek sedang diedit masih `autoName`, panggil `live()` dengan dokumen yang namanya diganti `textAutoName(next)`. Tanpa `commitObjs` (tidak ada entri history per ketikan).

- [ ] **Step 7: Gabungkan rename ke commit di `finishTextEdit` (`:964-970`)**

Satu `commitObjs` mengembalikan `{...o, name: textAutoName(value), text: {...o.text, content: value}}` bila `o.autoName` — satu `push` = satu langkah undo. Bila `!o.autoName`, perilaku lama (`updateText` isi saja). Teks baru kosong tetap dihapus seperti sekarang.

- [ ] **Step 8: Bersihkan flag saat rename manual (`commitRename` cabang non-group `:1206-1209`)**

Commit rename manual juga mengeset `autoName: false` pada objek yang sama.

- [ ] **Step 9: Build + jalankan probe N1–N5 dan unit test**

Run: `npm run build:web`, `node --test tests/figma-text.test.cjs`, probe.
Expected: semua PASS, 0 pageerror.

- [ ] **Step 10: Jalankan `npm test` penuh**

Expected: 135 + tes baru lolos.

---

### Task 4: G4 — Klik tool Teks pada teks lama → edit, caret di posisi klik

**Files:**
- Modify: `src/renderer/textLayout.jsx` (helper baru)
- Modify: `src/components/editor/VectorEditor.jsx:3990-4000` (pointerdown), `:4383-4394` (cabang drag teks), `:4978-5026` (pointerup), `:7078` (oper `caret`), `:140` (bentuk state editing)
- Modify: `src/components/editor/TextEditOverlay.jsx:17-20` (mount: caret vs select-all)
- Test: `tests/figma-text.test.cjs` (unit helper), `probes/probe-figma-text.cjs` (skenario C1–C4)

**Interfaces:**
- Consumes: `hitObj(pt)` (`VectorEditor.jsx:2712-2735`, `pt` koordinat dokumen, kembalikan objek teratas atau `null`); `makeTextLayout` (`textLayout.jsx:64-76`, kembalikan `{paragraph, ...}` dengan `paragraph` SkParagraph CanvasKit); `textAutoName` dari Task 3 (tidak dipakai di sini, disebut agar tidak tertukar).
- Produces: `caretOffsetForPoint(paragraph, x, y) -> number` (di `textLayout.jsx`); `editingText` boleh membawa field `caret` (offset karakter atau `null`).

- [ ] **Step 1: Tulis unit test `caretOffsetForPoint` dengan stub paragraph (gagal dulu)**

```js
const stub = { getGlyphPositionAtCoordinate: (x, y) => ({ position: x < 50 ? 0 : 5 }) };
test('caretOffsetForPoint: memakai posisi glyph dari paragraph', () => {
  assert.equal(caretOffsetForPoint(stub, 10, 5), 0);
  assert.equal(caretOffsetForPoint(stub, 90, 5), 5);
});
```

Run: `node --test tests/figma-text.test.cjs`. Expected: FAIL.

- [ ] **Step 2: Verifikasi API CanvasKit runtime**

Pastikan `SkParagraph.getGlyphPositionAtCoordinate` ada di CanvasKit 0.42.0 yang dipakai (cek di browser via probe sekali jalan atau `node` + CanvasKit bila tersedia). Jangan percaya `.d.ts` saja. Catat hasil verifikasi di progress ledger. Bila API bernama lain, pakai nama runtime-nya dan perbarui Step 1.

- [ ] **Step 3: Implementasi `caretOffsetForPoint(paragraph, x, y)` di `src/renderer/textLayout.jsx`**

Panggil API paragraph, kembalikan `position`, clamp ke `[0, content.length]` (panjang diteruskan pemanggil atau dibaca dari spec — pilih satu dan tulis di komentar). Koordinat `x, y` dalam ruang layout paragraph (bukan layar).

- [ ] **Step 4: Jalankan unit test**

Expected: PASS.

- [ ] **Step 5: Tulis skenario probe C1–C4 (gagal dulu)**

C1: teks `halo dunia` di kanvas, tool Teks, klik di tengah kata `dunia` → assert overlay terbuka + `selectionStart === selectionEnd` + nilainya = offset karakter yang diklik (bukan 0 dan bukan select-all).
C2: klik di sebelum karakter pertama → assert caret = 0.
C3: klik di sesudah karakter terakhir → assert caret = panjang isi.
C4: klik tool Teks pada teks lama lalu **drag** 30 px → assert kotak teks **baru** dibuat (bukan masuk edit).
Jalankan probe; expected: FAIL (klik masih membuat teks baru).

- [ ] **Step 6: Hit-test di pointerdown tool teks (`VectorEditor.jsx:3990-4000`)**

Sebelum mulai drag buat baru: `const hit = hitObj(pt)`; bila `hit && hit.type === 'text'`, simpan `hitTextId: hit.id` di `dragRef` dan lanjutkan drag seperti biasa (jangan mulai edit di pointerdown). Bila bukan teks, perilaku lama.

- [ ] **Step 7: Putuskan di pointerup (`:4978-5026`)**

Bila `!dg.moved && dg.hitTextId` → hitung offset caret dari titik klik via `caretOffsetForPoint` (layout paragraph objek itu, koordinat klik diubah ke ruang layout) lalu `setEditingText({id: dg.hitTextId, isNew: false, caret: offset})` dan jangan buat objek baru. Bila `dg.moved` → buat kotak baru seperti sekarang.

- [ ] **Step 8: Teruskan `caret` ke overlay (`:7078`) + mount logic (`TextEditOverlay.jsx:17-20`)**

Oper `caret={editingText.caret ?? null}`. Di mount: bila `caret != null` → `ref.current.setSelectionRange(caret, caret)`; bila tidak, perilaku lama (`!isNew` → `select()`).

- [ ] **Step 9: Build + jalankan probe C1–C4 dan unit test**

Run: `npm run build:web`, `node --test tests/figma-text.test.cjs`, probe.
Expected: semua PASS, 0 pageerror.

- [ ] **Step 10: Jalankan `npm test` penuh**

Expected: semua lolos.

---

### Task 5: G5 — Lebar handle tepi terukur (bukan heuristik 0.65)

**Files:**
- Modify: `src/engine/affineAndOrientedBox.jsx:129-167` (`transformObject`)
- Modify: `src/components/editor/VectorEditor.jsx:3879-3921` (`vcScaleMove`, call site `:3912`)
- Test: `tests/figma-text.test.cjs` (unit), `probes/probe-figma-text.cjs` (skenario W1–W2)

**Interfaces:**
- Consumes: `measuredTextBounds(o)` (`VectorEditor.jsx:1626-1631`, kembalikan `[x0,y0,x1,y1]` layout CanvasKit asli); `dg.bx.rect` (bounds seleksi, sudah berbasis `bboxFor` terukur untuk teks tunggal).
- Produces: `transformObject(o, a, scaleStroke, measuredW)` — `measuredW` number atau `null`; bila `measuredW != null` dan `spec.width` kosong, `baseW = measuredW`.

- [ ] **Step 1: Tulis unit test (gagal dulu)**

```js
test('transformObject: autoWidth pakai measuredW, bukan heuristik', () => {
  const o = { type: 'text', text: { content: 'ini adalah teks editing di figma', fontSize: 32, resizing: 'autoWidth', width: null } };
  const r = transformObject(o, [0.5, 0, 0, 1, 0, 0], false, 400);
  assert.equal(r.text.width, 200);
});
```

Sesuaikan bentuk `o`/`a`/return dengan signature asli yang dibaca di file (bila `transformObject` mengembalikan objek baru vs mutate, ikuti yang asli). Run: `node --test tests/figma-text.test.cjs`. Expected: FAIL.

- [ ] **Step 2: Tambah parameter `measuredW` di `transformObject`**

Di cabang scale horizontal murni (`:151-154`): `baseW = spec.width > 0 ? spec.width : (measuredW != null ? measuredW : Math.max(20, ...heuristik lama...))`. Heuristik tetap sebagai fallback bila `measuredW == null`. Jangan ubah cabang sudut (`:160-163`).

- [ ] **Step 3: Jalankan unit test**

Expected: PASS.

- [ ] **Step 4: Tulis skenario probe W1–W2 (gagal dulu)**

W1: teks autoWidth `ini adalah teks editing di figma`, drag handle kanan ke kiri sejauh ~40% → assert lebar kotak hasil = posisi handle (toleransi 1 px layar) dan teks wrap jadi 2 baris.
W2: drag handle kiri → assert tepi kanan kotak tidak bergerak dan lebar = posisi handle.
Jalankan probe; expected: FAIL (lebar meleset dari heuristik).

- [ ] **Step 5: Injeksikan lebar terukur di `vcScaleMove` (`:3879-3921`)**

Saat drag scale melibatkan tepat satu objek teks `resizing === 'autoWidth'`, hitung `measuredW = measuredTextBounds(o)[2] - measuredTextBounds(o)[0]` dan oper sebagai argumen ke-4 `VE.transformObject(o, docM, scaleStk, measuredW)`. Multi-seleksi atau bukan teks autoWidth → `null`.

- [ ] **Step 6: Build + jalankan probe W1–W2 dan unit test**

Run: `npm run build:web`, `node --test tests/figma-text.test.cjs`, probe.
Expected: semua PASS, 0 pageerror.

- [ ] **Step 7: Jalankan `npm test` penuh + tes regresi scale teks yang sudah ada**

Expected: semua lolos (khususnya tidak ada regresi fontSize di cabang sudut).

---

### Task 6: G6 — Spellcheck eksplisit di overlay

**Files:**
- Modify: `src/components/editor/TextEditOverlay.jsx` (atribut textarea)
- Modify: `src/components/editor/VectorEditor.jsx:7078` (oper `lang`, bila perlu)
- Test: `probes/probe-figma-text.cjs` (skenario S1)

**Interfaces:**
- Consumes: nilai bahasa aplikasi (cari di `VectorEditor.jsx` / `appI18n.jsx` — bila tidak ada plumbing siap pakai, default `"id"`).
- Produces: textarea overlay dengan `spellCheck` + `lang` eksplisit.

- [ ] **Step 1: Cari nilai bahasa aplikasi**

Grep `prefs` / `lang` di `VectorEditor.jsx` dan `src/constants/appI18n.jsx`; tentukan dari mana `lang` overlay diambil. Bila tidak ada yang siap pakai, pakai `"id"`. Catat keputusan di progress ledger.

- [ ] **Step 2: Tulis skenario probe S1 (gagal dulu)**

S1: buka edit teks → assert `textarea.spellcheck === true` dan `textarea.lang === 'id'` (atau bahasa aplikasi bila Step 1 menemukan lain).
Jalankan probe; expected: FAIL (atribut belum ada).

- [ ] **Step 3: Tambah atribut di textarea overlay**

`spellCheck` dan `lang={lang ?? 'id'}` (prop `lang` baru bila Step 1 menemukan sumber bahasa; bila tidak, hardcode `'id'` dengan komentar).

- [ ] **Step 4: Build + jalankan probe S1**

Expected: PASS, 0 pageerror. (Garis bawah merah tergantung kamus browser — assert atribut saja, bukan underline.)

---

### Task 7: G7 — Kursor I-beam saat tool Teks aktif

**Files:**
- Modify: (bila perlu) `src/components/editor/VectorEditor.jsx` atau CSS kanvas
- Test: `probes/probe-figma-text.cjs` (skenario K1)

**Interfaces:**
- Consumes: —
- Produces: kursor `text` (I-beam) di kanvas saat tool Teks aktif.

- [ ] **Step 1: Tulis skenario probe K1 dan jalankan sebagai baseline**

K1: aktifkan tool Teks, gerakkan mouse ke kanvas → assert `getComputedStyle(canvas).cursor === 'text'` (atau nilai yang dipakai aplikasi untuk I-beam).
Expected: PASS bila sudah ada (maka task selesai di sini — catat di ledger), FAIL bila belum.

- [ ] **Step 2 (hanya bila K1 FAIL): Tambah `cursor: text` saat tool Teks aktif**

Di tempat kursor kanvas ditentukan (ikuti pola tool lain). Build ulang.

- [ ] **Step 3: Jalankan probe K1**

Expected: PASS, 0 pageerror.

---

### Task 8: Regresi penuh + ZIP + laporan

**Files:**
- Modify: `docs/superpowers/plans/2026-11-12-figma-text-editing-progress.md`, `docs/superpowers/plans/2026-11-12-text-tool-ledger.md`, `~/MEMORY.md`
- Create: `~/workspace/your_files/Geovanta-FigmaText-FIX.zip`

**Interfaces:**
- Consumes: semua task 1–7 hijau.
- Produces: ZIP terverifikasi + laporan akhir.

- [ ] **Step 1: Jalankan `npm test` penuh**

Expected: 135 + semua tes baru lolos.

- [ ] **Step 2: Jalankan `npm run build:web`**

Expected: exit 0.

- [ ] **Step 3: Jalankan oracle Figcraft**

Bundle `figcraftSnap.jsx` ke `/tmp/figcraftSnap.mjs` (esbuild format esm) lalu harness `~/workspace/geovanta_snap/test_figcraftSnap.mjs`.
Expected: 52/52.

- [ ] **Step 4: Jalankan probe regresi lama (mock font port 8941 harus hidup)**

`probe-node-actions.cjs` 24/24, `probe-text-panel-r5.cjs` 17/17, `probe-topath.cjs` 2/2, `probe-dblclick.cjs` 4/4, `probe-stale-assets-fix.cjs` 5/5, `probe-matrix.cjs` 20/20, `probe-snap-fixes.cjs` 17/17.
Expected: semua hijau, 0 pageerror.

- [ ] **Step 5: Jalankan `probes/probe-figma-text.cjs` penuh**

Expected: E1–E2, N1–N5, C1–C4, W1–W2, S1, K1 semua PASS, 0 pageerror.

- [ ] **Step 6: Buat ZIP tanpa `node_modules` dan `*.bak*`**

`~/workspace/your_files/Geovanta-FigmaText-FIX.zip` + SHA256. Smoke test: ekstrak ke `/tmp`, muat di Chromium headless, assert 0 pageerror.

- [ ] **Step 7: Perbarui ledger + `~/MEMORY.md` + laporan akhir Bahasa Indonesia**

Sebut eksplisit: perubahan perilaku Escape (commit, tanpa batal), D1 (drag sudut tetap ubah fontSize), dan bila ada caveat pengukuran.

---

## Self-Review

1. **Spec coverage:** G1 sudah ada (tidak ada task — benar, Task 1 baseline membuktikannya tetap hijau). G2 → Task 3. G3 → Task 2. G4 → Task 4. G5 → Task 5. G6 → Task 6. G7 → Task 7. G8 (pertahankan perilaku lama) → Task 8 regresi. D1 tercatat sebagai perilaku lama yang dipertahankan (Task 5 Step 2 + Step 7). Tidak ada gap.
2. **Step scan:** setiap step menulis satu hal yang bisa diperiksa (test / perintah / file:baris). Langkah "cari nilai bahasa" (Task 6 Step 1) adalah recon kecil dengan hasil yang dicatat — dapat diterima karena hasilnya menentukan Step 3.
3. **Type consistency:** `textAutoName(content) -> string`; `caretOffsetForPoint(paragraph, x, y) -> number`; `transformObject(o, a, scaleStroke, measuredW)`; `editingText.caret` (number|null); flag `autoName` (boolean, top-level). Nama-nama ini konsisten di semua task.
4. **Review Focus:** kelima baris sudah punya tes di task pemiliknya (Task 4 C4, Task 2 E2, Task 3 N4, Task 3 N5/live, Task 4 C2–C3).
5. **Proportion:** spec ~9,7 KB; plan ini ~13 KB — lebih panjang karena memuat signature + test persis per task, tetapi tidak menulis isi fungsi (hanya satu baris pendekatan per step kode). Proporsi dapat diterima.
