# 16 Fitur Node & Bézier di Dropdown Floating Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semua 16 fitur node/path yang diminta user bisa diakses dari dropdown alat Node & Bézier (`nodeGrp`) di floating bar — 2 sudah ada (dilewati), 9 sudah ada di tempat lain (tambah entri wiring), 4 butuh engine baru, 1 tafsir Convert to Curves.

**Architecture:** Satu dropdown, dua seksi — atas 4 alat yang sudah ada, bawah seksi "Aksi Node & Path" (15 baris aksi). Engine baru hanya 3 fungsi murni di `nodeEditingAndHandles.jsx` (join/split/reverse); Auto Smooth + Convert to Curves memakai `autoHandles` yang sudah ada; sisanya memanggil handler `VectorEditor.jsx` yang sudah ada. Tidak ada dependensi baru, tidak ada perubahan model data.

**Tech Stack:** React 18 + esbuild, Node test runner (`node --test`), Playwright (probe browser), pola kode yang sudah ada di repo.

**Spec:** `docs/superpowers/specs/2026-11-12-node-bezier-dropdown-design.md` (disetujui user 2026-11-12)

## Global Constraints

- Label UI Bahasa Indonesia; terjemahan Inggris lengkap — paritas ID/EN wajib 1:1 untuk setiap kunci baru.
- Tidak ada perubahan perilaku alat yang sudah ada (`node`/`addnode`/`addhandle`/`autohandle`), rail kiri, atau dropdown Boolean.
- Backup `.bak` sebelum edit destruktif; diff minimal; ikuti pola kode yang sudah ada (pola `BOOL_ITEMS` untuk baris aksi, pola `loadSource` untuk tes, pola `commitObjs` untuk handler).
- Setiap klaim selesai dibuktikan di browser asli + screenshot; `npm test` dan `npm run build:web` harus hijau.
- Fungsi engine murni (tidak membaca state React); fungsi yang tidak berlaku mengembalikan objek yang sama (`o`) tanpa perubahan.
- Tooltip: kunci yang dipakai `data-tip` wajib ada di `TIPS` dan `TIPS_EN` (kunci hilang = tooltip mati).

## Review Focus

- Join Nodes dengan 2 node yang bukan ujung dan bukan bersebelahan harus no-op + toast jelas, bukan merge yang salah atau crash.
- Split Path pada subpath tertutup dengan 1 node harus menghasilkan 1 subpath terbuka yang valid, bukan subpath 1-node atau crash.
- Reverse Path pada subpath tertutup harus menghasilkan loop geometri yang identik (hanya arah berubah); serializer tetap mengeluarkan `Z`.
- Aksi diklik tanpa seleksi yang memenuhi syarat harus nonaktif di UI; bila tetap terpanggil, handler harus guard + toast, bukan throw.
- Convert to Curves pada path yang semua segmennya sudah punya handle harus no-op dan tidak mereset handle yang ada.

---

### Task 1: Engine `joinNodes`

**Files:**
- Modify: `src/engine/nodeEditingAndHandles.jsx`
- Modify: `src/engine/vectorEngine.jsx:15` (tambah ke import) dan literal objek `VE` (tambah `joinNodes`)
- Test: `tests/node-path-actions.test.cjs` (baru; pola `loadSource` esbuild seperti `tests/node-handle-size.test.cjs`)

**Interfaces:**
- Consumes: model objek path (`o.subs[].nodes[]` dengan `{id, x, y, handleIn, handleOut, type}`, `sp.closed`).
- Produces: `joinNodes(o, ids)` — `ids` Set berisi id node; mengembalikan objek baru atau `o` yang sama bila tidak berlaku. Dipakai Task 4 (`applyJoinNodes`).

- [ ] **Step 1: Write the failing test**

```js
test('joinNodes menggabung dua node bersebelahan di tengah', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: false, nodes: [
    { id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 20, y: 0 }, { id: 'd', x: 30, y: 0 }
  ] }] };
  const r = VE.joinNodes(o, new Set(['b', 'c']));
  assert.equal(r.subs[0].nodes.length, 3);
  assert.equal(r.subs[0].nodes[1].id, 'b');
  assert.deepEqual([r.subs[0].nodes[1].x, r.subs[0].nodes[1].y], [15, 0]);
});
test('joinNodes menutup path terbuka bila dua ujungnya dipilih', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: false, nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }] }] };
  assert.equal(VE.joinNodes(o, new Set(['a', 'b'])).subs[0].closed, true);
});
test('joinNodes menyambung dua subpath terbuka di ujungnya', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [
    { id: 's1', closed: false, nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }] },
    { id: 's2', closed: false, nodes: [{ id: 'c', x: 20, y: 0 }, { id: 'd', x: 30, y: 0 }] }
  ] };
  const r = VE.joinNodes(o, new Set(['b', 'c']));
  assert.equal(r.subs.length, 1);
  assert.equal(r.subs[0].nodes.length, 3);
});
test('joinNodes no-op bila node bukan ujung dan bukan bersebelahan', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: false, nodes: [
    { id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 20, y: 0 }, { id: 'd', x: 30, y: 0 }
  ] }] };
  assert.strictEqual(VE.joinNodes(o, new Set(['a', 'c'])), o);
  assert.strictEqual(VE.joinNodes(o, new Set(['a'])), o);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/node-path-actions.test.cjs` (atau `node --test tests/node-path-actions.test.cjs`)
Expected: FAIL — `VE.joinNodes is not a function`

- [ ] **Step 3: Implement `joinNodes(o, ids)` in `src/engine/nodeEditingAndHandles.jsx`**

Semantik yang dipin (urutan pengecekan): (1) tepat 2 id, keduanya ada di satu objek, bila tidak → kembalikan `o`; (2) keduanya ujung dari SATU subpath terbuka yang sama → `closed: true`; (3) keduanya bersebelahan di satu subpath (indeks selisih 1, atau pasangan wrap-around di subpath tertutup) → gabung di titik tengah (rata-rata posisi); node gabungan memakai id node PERTAMA, `handleIn` dari node pertama, `handleOut` dari node kedua, `type` `'smooth'` bila keduanya `smooth`/`symmetric`, bila tidak `'corner'`; (4) keduanya ujung dari DUA subpath terbuka berbeda di objek yang sama → balik salah satu subpath bila perlu agar kedua ujung bertemu, sambung daftar node, gabung kedua ujung dengan aturan yang sama (id ujung pertama dipertahankan); (5) bila tidak ada kasus yang cocok → kembalikan `o`.

- [ ] **Step 4: Export via `VE`**

Tambah `joinNodes` ke import baris 15 `src/engine/vectorEngine.jsx` dan ke literal objek `VE` (di samping `deleteNodes`).

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/node-path-actions.test.cjs`
Expected: PASS (4 tes joinNodes)

- [ ] **Step 6: Commit**

```bash
git add src/engine/nodeEditingAndHandles.jsx src/engine/vectorEngine.jsx tests/node-path-actions.test.cjs
git commit -m "feat: engine joinNodes untuk gabung dua node"
```

### Task 2: Engine `splitPath`

**Files:**
- Modify: `src/engine/nodeEditingAndHandles.jsx`
- Modify: `src/engine/vectorEngine.jsx:15` (import) dan literal `VE`
- Test: `tests/node-path-actions.test.cjs` (tambah ke file Task 1)

**Interfaces:**
- Consumes: model objek path seperti Task 1.
- Produces: `splitPath(o, ids)` — `ids` Set berisi id node; mengembalikan objek baru atau `o` yang sama bila tidak berlaku. Dipakai Task 4 (`applySplitPath`).

- [ ] **Step 1: Write the failing test**

```js
test('splitPath membelah path terbuka di node interior', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: false, nodes: [
    { id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 20, y: 0 }, { id: 'd', x: 30, y: 0 }
  ] }] };
  const r = VE.splitPath(o, new Set(['b', 'c']));
  assert.equal(r.subs.length, 3);
  assert.equal(r.subs[0].nodes.length, 2);
  assert.equal(r.subs[1].nodes.length, 2);
  assert.equal(r.subs[2].nodes.length, 2);
  assert.equal(r.subs[0].nodes[1].id, 'b');
  assert.notEqual(r.subs[1].nodes[0].id, 'b');
});
test('splitPath membuka subpath tertutup di satu node', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: true, nodes: [
    { id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 10, y: 10 }, { id: 'd', x: 0, y: 10 }
  ] }] };
  const r = VE.splitPath(o, new Set(['a']));
  assert.equal(r.subs.length, 1);
  assert.equal(r.subs[0].closed, false);
  assert.equal(r.subs[0].nodes.length, 5);
});
test('splitPath no-op pada node ujung path terbuka', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: false, nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }] }] };
  assert.strictEqual(VE.splitPath(o, new Set(['a'])), o);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/node-path-actions.test.cjs`
Expected: FAIL — `VE.splitPath is not a function`

- [ ] **Step 3: Implement `splitPath(o, ids)` in `src/engine/nodeEditingAndHandles.jsx`**

Semantik yang dipin: untuk setiap subpath, kumpulkan node terpilih yang BISA dibelah — node interior pada subpath terbuka (bukan pertama/terakhir); pada subpath tertutup semua node terpilih bisa dibelah. Subpath terbuka dibelah di setiap node tersebut: salinan pertama mengakhiri subpath pertama (mempertahankan `handleIn`, `handleOut: null`, memakai id asli); salinan kedua memulai subpath berikutnya (`handleIn: null`, mempertahankan `handleOut`, id baru `'n' + Math.random().toString(36).slice(2, 9)` — pola yang sama dengan `VectorEditor.jsx:4077`). Subpath tertutup dengan 1 node terpilih → 1 subpath terbuka `[X', ...sisa..., X'']` (X' id baru di awal, X'' id asli di akhir — KOREKSI 2026-11-12 pasca-review: teks awal tertukar; implementasi + komentar kode mengikuti konvensi kasus terbuka, salinan pengakhir memakai id asli). Subpath tertutup dengan 2+ node terpilih → 1 subpath terbuka per busur di antara node terpilih berurutan. Node ujung subpath terbuka dilewati. Bila tidak ada pembelahan yang terjadi → kembalikan `o`.

- [ ] **Step 4: Export via `VE`** (import baris 15 + literal `VE`, seperti Task 1)

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/node-path-actions.test.cjs`
Expected: PASS (semua tes joinNodes + splitPath)

- [ ] **Step 6: Commit**

```bash
git add src/engine/nodeEditingAndHandles.jsx src/engine/vectorEngine.jsx tests/node-path-actions.test.cjs
git commit -m "feat: engine splitPath untuk belah path di node"
```

### Task 3: Engine `reversePath`

**Files:**
- Modify: `src/engine/nodeEditingAndHandles.jsx`
- Modify: `src/engine/vectorEngine.jsx:15` (import) dan literal `VE`
- Test: `tests/node-path-actions.test.cjs` (tambah ke file Task 1)

**Interfaces:**
- Consumes: model objek path seperti Task 1.
- Produces: `reversePath(o, ids)` — `ids` Set berisi id node, atau `null`/kosong = semua subpath; mengembalikan objek baru atau `o` yang sama bila tidak berlaku. Dipakai Task 4 (`applyReversePath`).

- [ ] **Step 1: Write the failing test**

```js
test('reversePath membalik urutan node dan menukar handle', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: false, nodes: [
    { id: 'a', x: 0, y: 0, handleOut: { x: 3, y: 0 } },
    { id: 'b', x: 10, y: 0, handleIn: { x: 7, y: 0 }, handleOut: { x: 13, y: 0 } },
    { id: 'c', x: 20, y: 0, handleIn: { x: 17, y: 0 } }
  ] }] };
  const r = VE.reversePath(o, new Set(['a']));
  assert.deepEqual(r.subs[0].nodes.map(n => n.id), ['c', 'b', 'a']);
  assert.deepEqual(r.subs[0].nodes[0].handleOut, { x: 17, y: 0 });
  assert.deepEqual(r.subs[0].nodes[2].handleIn, { x: 3, y: 0 });
});
test('reversePath pada subpath tertutup mempertahankan loop yang sama', () => {
  const { VE } = loadSource('src/engine/vectorEngine.jsx');
  const o = { subs: [{ id: 's1', closed: true, nodes: [
    { id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 10, y: 10 }, { id: 'd', x: 0, y: 10 }
  ] }] };
  const r = VE.reversePath(o, null);
  assert.equal(r.subs[0].closed, true);
  assert.deepEqual(r.subs[0].nodes.map(n => n.id), ['d', 'c', 'b', 'a']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/node-path-actions.test.cjs`
Expected: FAIL — `VE.reversePath is not a function`

- [ ] **Step 3: Implement `reversePath(o, ids)` in `src/engine/nodeEditingAndHandles.jsx`**

Semantik yang dipin: untuk setiap subpath yang memuat minimal satu node terpilih (atau SEMUA subpath bila `ids` null/kosong): balik array node; setiap node menukar `handleIn` ↔ `handleOut`. Subpath tertutup tetap tertutup (loop sama, arah berlawanan). Bila tidak ada subpath yang memenuhi syarat → kembalikan `o`.

- [ ] **Step 4: Export via `VE`** (import baris 15 + literal `VE`, seperti Task 1)

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/node-path-actions.test.cjs`
Expected: PASS (semua tes joinNodes + splitPath + reversePath)

- [ ] **Step 6: Commit**

```bash
git add src/engine/nodeEditingAndHandles.jsx src/engine/vectorEngine.jsx tests/node-path-actions.test.cjs
git commit -m "feat: engine reversePath untuk balik arah path"
```

### Task 4: Handler aksi di `VectorEditor.jsx` + oper ke toolbar

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (handler baru + props ke `EditorFloatingToolbar`, sekitar baris 7375)

**Interfaces:**
- Consumes: `VE.joinNodes`, `VE.splitPath`, `VE.reversePath` (Task 1–3); `VE.autoHandles` (sudah ada di `VE`); handler yang sudah ada: `delSel` (5203), `applyType` (5329), `applySmoothNodes` (5324), `applyMirror` (5349), `setClosed` (5367), `applyOutlineStroke` (5685), `openOffsetStrip` (5709), `openVcSimplify` (5524); state `selNodes`, `selObjs`, `commitObjs`, `say`.
- Produces: handler baru + props baru untuk `EditorFloatingToolbar` (dipakai Task 5).

- [ ] **Step 1: Tambah 5 handler baru (di dekat `applyMirror`/`setClosed`, ~5349–5370), mengikuti pola `commitObjs` + `say` yang sudah ada**

```js
const applyAutoSmooth = () => {
  const ids = selNodes.size ? selNodes : null;
  commitObjs(o => sel.objs.has(o.id) && !o.locked ? VE.autoHandles(o, null, { preserveShape: false, ids, tau: 1 / 3 }) : o);
  say(selNodes.size ? selNodes.size + ' node dihaluskan otomatis' : 'Kurva dihaluskan otomatis');
};
const applyConvertToCurves = () => {
  commitObjs(o => sel.objs.has(o.id) && !o.locked ? VE.autoHandles(o, null, { preserveShape: true }) : o);
  say('Bentuk diubah menjadi kurva Bézier');
};
const applyJoinNodes = () => {
  if (selNodes.size !== 2) return say('Pilih tepat 2 node untuk digabung');
  commitObjs(o => sel.objs.has(o.id) && !o.locked ? VE.joinNodes(o, selNodes) : o);
  say('2 node digabung');
};
const applySplitPath = () => {
  if (!selNodes.size) return say('Pilih node tempat path dipotong');
  commitObjs(o => sel.objs.has(o.id) && !o.locked ? VE.splitPath(o, selNodes) : o);
  say('Path dipotong di node terpilih');
};
const applyReversePath = () => {
  commitObjs(o => sel.objs.has(o.id) && !o.locked ? VE.reversePath(o, selNodes.size ? selNodes : null) : o);
  say('Arah path dibalik');
};
```

Teks `say` versi Inggris mengikuti pola ternary `prefs.lang === 'en' ? ... : ...` seperti handler tetangga (contoh di `applyMirror`).

- [ ] **Step 2: Oper handler ke `EditorFloatingToolbar`**

Tambah props: `delSel`, `applyType`, `applySmoothNodes`, `setClosed`, `applyAutoSmooth`, `applyConvertToCurves`, `applyJoinNodes`, `applySplitPath`, `applyReversePath`. (`applyMirror`, `applyOutlineStroke`, `openOffsetStrip`, `openVcSimplify`, `selNodes`, `selObjs` sudah dioper.)

- [ ] **Step 3: Verifikasi**

Run: `node -e` esbuild transform `VectorEditor.jsx` (sintaks OK) + `npm run build:web` exit 0.
Expected: build hijau (toolbar belum memakai props baru — tidak ada error unused props karena React tidak mengeluh).

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/VectorEditor.jsx
git commit -m "feat: handler aksi node (auto-smooth, convert, join, split, reverse)"
```

### Task 5: Seksi "Aksi Node & Path" di dropdown `nodeGrp`

**Files:**
- Modify: `src/components/editor/EditorFloatingToolbar.jsx` (props baru + array `NODE_ACTIONS` + render seksi di dalam `Float` `nodeGrp`, sekitar baris 130–143)

**Interfaces:**
- Consumes: props Task 4 + `selNodes`, `selObjs` (sudah ada) + `canOutline`/`canOffset` (sudah dihitung di toolbar) + kunci tooltip Task 6 + `L.ftNodeActions` (Task 6).
- Produces: dropdown `nodeGrp` dengan 15 baris aksi yang berfungsi + nonaktif sesuai syarat.

- [ ] **Step 1: Tambah array `NODE_ACTIONS` di dalam komponen (pola `BOOL_ITEMS`)**

Bentuk tiap entri: `[key, tip, iconPath, disabled, action]`. Label diambil dari `TT[tip].t` (seperti baris alat). 15 baris, urutan sesuai daftar user:

| key | tip (kunci tooltip) | disabled bila | action |
|---|---|---|---|
| delNode | `veDelNode` (sudah ada) | `!selNodes.size` | `delSel` |
| smooth | `veTypeSmooth` (sudah ada) | `!selNodes.size` | `() => applyType('smooth')` |
| corner | `veTypeCorner` (sudah ada) | `!selNodes.size` | `() => applyType('corner')` |
| symmetric | `veTypeSym` (sudah ada) | `!selNodes.size` | `() => applyType('symmetric')` |
| autoSmooth | `veNodeAutoSmooth` (baru, Task 6) | `!hasPath` | `applyAutoSmooth` |
| breakHandles | `veNodeBreakHandles` (baru, Task 6) | `!selNodes.size` | `() => applyMirror('freeCurve')` |
| join | `veNodeJoin` (baru, Task 6) | `selNodes.size !== 2` | `applyJoinNodes` |
| split | `veNodeSplit` (baru, Task 6) | `!selNodes.size` | `applySplitPath` |
| close | `veClose` (sudah ada) | `!hasPath` | `() => setClosed(true)` |
| open | `veOpen` (sudah ada) | `!hasPath` | `() => setClosed(false)` |
| reverse | `veNodeReverse` (baru, Task 6) | `!hasPath` | `applyReversePath` |
| simplify | `veSimplify` (sudah ada) | `!hasPath` | `openVcSimplify` |
| toCurves | `veNodeToCurves` (baru, Task 6) | `!hasPath` | `applyConvertToCurves` |
| outline | `veOutlineStroke` (sudah ada) | `!canOutline` | `applyOutlineStroke` |
| offset | `veOffsetPath` (sudah ada) | `!canOffset` | `openOffsetStrip` |

`hasPath = (selObjs || []).some(o => !o.img && !o.text)`. Ikon: pakai ulang path ikon yang sudah ada dari rail (`veClose`, `veOpen`, `veDelNode`, `veTypeCorner`, `veTypeSmooth`, `veTypeSym`), dropdown Boolean (`veOutlineStroke`, `veOffsetPath`), dan `geoGrp` (`veSimplify`); 6 ikon baru (autoSmooth, breakHandles, join, split, reverse, toCurves) digambar dengan gaya yang sama — stroke `currentColor`, `viewBox="0 0 24 24"`, menyampaikan arti masing-masing (haluskan / pisah handle / gabung / potong / balik arah / kurva). (KOREKSI 2026-11-12 pasca-review: teks awal menulis `strokeWidth` 1.8, tetapi komponen bersama `Vi` meng-hardcode `strokeWidth="2"` — implementasi memakai `Vi`, konsisten dengan semua ikon dropdown lain.)

- [ ] **Step 2: Render seksi aksi di dalam `Float` `nodeGrp` (hanya bila `id === 'nodeGrp'`)**

Setelah daftar alat, sebelum/sesudah seksi "Ukuran Node & Handle": header `{L.ftNodeActions}` + daftar baris yang dibungkus `<div style={{ maxHeight: 260, overflowY: 'auto' }}>`. Tiap baris memakai pola dropdown Boolean: `<div role="option" aria-disabled={dis} className="opt" data-tip={tip} style={dis ? { opacity: 0.45 } : undefined} onClick={...}>` dengan `<span className="sel-l"><Vi d={d} s={17} /><span>{label}</span></span>` (tanpa centang — aksi bukan alat aktif). Klik aksi: `setOpenGrp(null)` dulu, lalu panggil action (untuk `openVcSimplify`/`openOffsetStrip` pola yang sama seperti dropdown Boolean: tutup dulu, baru buka strip). Lebar `Float` nodeGrp tetap 260 — bila label terpanjang ("Ubah menjadi Kurva") meluber, naikkan ke 280 (diputuskan di Task 7 dari screenshot).

- [ ] **Step 3: Verifikasi**

Run: `npm run build:web` exit 0.
Expected: build hijau.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/EditorFloatingToolbar.jsx
git commit -m "feat: seksi Aksi Node & Path di dropdown nodeGrp"
```

### Task 6: Tooltip (6 kunci baru) + i18n `ftNodeActions`

**Files:**
- Modify: `src/constants/tooltipsCatalog.jsx` (tambah 6 kunci di `TIPS` dan `TIPS_EN`)
- Modify: `src/constants/appI18n.jsx` (tambah `ftNodeActions` di ID dan EN, di samping `ftNodeGroup`)
- Test: `tests/node-path-actions.test.cjs` (tambah tes kunci + label)

**Interfaces:**
- Consumes: bentuk entri tooltip yang sudah ada (`{t, d}`).
- Produces: 6 kunci tooltip baru + 1 kunci i18n baru (dipakai Task 5).

- [ ] **Step 1: Tambah 6 kunci sebagai assignment `TIPS.x = {...}` / `TIPS_EN.x = {...}` di akhir file (pola ronde 5)**

```js
TIPS.veNodeAutoSmooth = { t: 'Haluskan Kurva Otomatis', d: 'Hitung ulang handle node terpilih dengan Catmull-Rom agar kurva halus otomatis' };
TIPS.veNodeBreakHandles = { t: 'Pisahkan Handle', d: 'Handle masuk dan keluar bergerak bebas, tidak lagi saling cermin' };
TIPS.veNodeJoin = { t: 'Gabung Node', d: 'Gabungkan dua node terpilih menjadi satu' };
TIPS.veNodeSplit = { t: 'Potong Path', d: 'Belah path menjadi dua di node terpilih' };
TIPS.veNodeReverse = { t: 'Balik Arah Path', d: 'Balik urutan node dan arah path' };
TIPS.veNodeToCurves = { t: 'Ubah menjadi Kurva', d: 'Ubah segmen lurus menjadi kurva Bézier tanpa mengubah bentuk' };
```

Dan pasangan `TIPS_EN` (teks Inggris): `veNodeAutoSmooth: 'Auto Smooth' / 'Recompute handles of selected nodes with Catmull-Rom for automatic smoothing'`; `veNodeBreakHandles: 'Break Handles' / 'In and out handles move independently, no longer mirrored'`; `veNodeJoin: 'Join Nodes' / 'Merge two selected nodes into one'`; `veNodeSplit: 'Split Path' / 'Split the path into two at the selected node'`; `veNodeReverse: 'Reverse Path' / 'Reverse node order and path direction'`; `veNodeToCurves: 'Convert to Curves' / 'Turn straight segments into Bézier curves without changing the shape'`.

- [ ] **Step 2: Tambah `ftNodeActions` di `appI18n.jsx`**

ID (di samping `ftNodeGroup: 'Alat Node & Bézier'`): `ftNodeActions: 'Aksi Node & Path'`. EN (di samping `ftNodeGroup: 'Node & Bézier Tools'`): `ftNodeActions: 'Node & Path Actions'`.

- [ ] **Step 3: Tambah tes kunci + paritas di `tests/node-path-actions.test.cjs`**

```js
test('tooltip dan i18n aksi node baru lengkap ID+EN', () => {
  const { TIPS, TIPS_EN } = loadSource('src/constants/tooltipsCatalog.jsx');
  const { APP_STR } = loadSource('src/constants/appI18n.jsx');
  for (const k of ['veNodeAutoSmooth', 'veNodeBreakHandles', 'veNodeJoin', 'veNodeSplit', 'veNodeReverse', 'veNodeToCurves']) {
    assert.ok(TIPS[k], k + ' hilang di TIPS');
    assert.ok(TIPS_EN[k], k + ' hilang di TIPS_EN');
  }
  assert.equal(TIPS.veNodeJoin.t, 'Gabung Node');
  assert.equal(TIPS_EN.veNodeJoin.t, 'Join Nodes');
  assert.equal(APP_STR.id.ftNodeActions, 'Aksi Node & Path');
  assert.equal(APP_STR.en.ftNodeActions, 'Node & Path Actions');
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/node-path-actions.test.cjs` dan `npm test`
Expected: PASS semua; hitung kunci ID vs EN tetap sama (audit: tidak ada kunci dipakai yang hilang dari katalog).

- [ ] **Step 5: Commit**

```bash
git add src/constants/tooltipsCatalog.jsx src/constants/appI18n.jsx tests/node-path-actions.test.cjs
git commit -m "feat: tooltip + i18n untuk 6 aksi node baru"
```

### Task 7: Verifikasi browser + screenshot bukti + ZIP + laporan

**Files:**
- Create: `probes/probe-node-actions.cjs` (di luar folder proyek, agar tidak ikut ZIP)
- Create: `~/workspace/your_files/Geovanta-NodeBezier-Dropdown-FIX.zip`
- Modify: `docs/superpowers/plans/2026-11-12-text-tool-ledger.md` (entri baru), `~/MEMORY.md` (entri baru)

**Interfaces:**
- Consumes: semua hasil Task 1–6; pola probe yang sudah ada (`probes/probe-text-panel-r5.cjs`, mock server bila perlu).

- [ ] **Step 1: Tulis probe `probes/probe-node-actions.cjs`**

Alur: buka editor → buat path (pen tool, 4 node) → buka dropdown `nodeGrp` → screenshot seluruh dropdown (15 baris aksi terlihat) → assert 15 baris ada + label benar → assert baris nonaktif saat tidak ada seleksi → pilih path, pilih 2 node → jalankan Join (assert node berkurang 1) → Split (assert subpath bertambah) → Reverse (assert urutan node terbalik) → Convert to Curves (assert handle muncul di semua node, bentuk tidak berubah) → Auto Smooth (assert handle berubah) → Close/Open (assert flag `closed`) → screenshot sebelum/sesudah tiap aksi kunci. 0 pageerror.

- [ ] **Step 2: Jalankan probe, baca screenshot-nya dengan mata sendiri**

Run: `URL=http://127.0.0.1:8931/index.html NODE_PATH=/home/hatch/workspace/vector-editor/node_modules node probes/probe-node-actions.cjs`
Expected: semua assert lolos; screenshot menunjukkan dropdown lengkap + aksi bekerja. Bila label "Ubah menjadi Kurva" meluber di lebar 260 → naikkan `w` nodeGrp ke 280 (Task 5) dan ulangi.

- [ ] **Step 3: Regresi + build**

Run: `npm test` (semua hijau), `npm run build:web` exit 0, ulangi probe ronde 5 (17/17) + topath 2/2 + dblclick 4/4 + stale-assets 5/5 + matriks 20/20.
Expected: tidak ada regresi.

- [ ] **Step 4: ZIP + smoke test**

Build ZIP `~/workspace/your_files/Geovanta-NodeBezier-Dropdown-FIX.zip` dari folder proyek (tanpa `node_modules`/`*.bak*`), `unzip -t` OK, ekstrak ke folder sementara + smoke test (buka editor, 0 pageerror). Catat ukuran + SHA256.

- [ ] **Step 5: Ledger + MEMORY + laporan dengan screenshot bukti**

Tulis entri ledger + `~/MEMORY.md`, matikan server, laporkan ke user dengan screenshot dropdown + sebelum/sesudah aksi terlampir.

## Self-Review

1. **Spec coverage:** 16 fitur → 2 dilewati (Task 0, di desain), 9 wiring (Task 4–5), 3 engine baru (Task 1–3), Auto Smooth + Convert to Curves memakai `autoHandles` (Task 4), 6 tooltip baru + 1 i18n baru (Task 6). Semua tercakup.
2. **Step scan:** setiap langkah menghasilkan satu hal yang bisa ditulis; tidak ada langkah "TBD". Ikon 6 aksi baru diserahkan ke implementer dengan gaya yang dipin (bukan path data) karena ikon adalah visual yang diverifikasi lewat screenshot di Task 7.
3. **Type consistency:** nama fungsi konsisten di semua task (`joinNodes`, `splitPath`, `reversePath`, `applyAutoSmooth`, `applyConvertToCurves`, `applyJoinNodes`, `applySplitPath`, `applyReversePath`); nama kunci tooltip konsisten (`veNodeAutoSmooth`, `veNodeBreakHandles`, `veNodeJoin`, `veNodeSplit`, `veNodeReverse`, `veNodeToCurves`); `ftNodeActions` konsisten.
4. **Review Focus:** kelima risiko di atas tercakup — no-op Join (tes Task 1), Split tertutup 1 node (tes Task 2), Reverse tertutup (tes Task 3), guard tanpa seleksi (disabled Task 5 + guard Task 4), Convert no-op (Task 7 probe; `autoHandles` mengembalikan objek tak berubah bila tidak ada yang berubah — perilaku yang sudah ada).
5. **Proportion:** rencana ini lebih pendek dari kode yang dihasilkannya (3 fungsi engine + wiring + UI + tes); blok kode hanya berisi tes dan handler yang spesifikasinya dipin.
