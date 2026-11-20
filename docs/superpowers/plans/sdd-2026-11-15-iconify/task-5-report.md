# Task 5 Report — Tool wiring (floating bar → panel)

**Plan:** `docs/superpowers/plans/2026-11-15-iconify-icons.md`
**Spec:** `docs/superpowers/specs/2026-11-15-iconify-icons-design.md` (§7 butir 1)
**Date:** 2026-11-15
**Verdict: DONE** — lihat `## Completion (after ruling R17)` di bawah.
Sebelumnya NEEDS_CONTEXT (probe Step 1 selesai + RED terverifikasi);
implementasi Step 3 selesai setelah ruling R17 (Opsi A).

No questions were raised before starting except the one in §3, which surfaced
during investigation (before any product edit — sesuai instruksi "ask before
starting, do not guess").

Skill yang dipakai (aturan `AGENTS.md`): `test-driven-development`
(RED sesuai langkah brief Step 1–2; implementasi menunggu ruling).

## 1. What was done

### Probe ditulis: `probes/probe-iconify.cjs` (baru, 11.582 byte)

Asersi mount-agnostic (menguji perilaku, bukan lokasi mount):

| ID | Asersi |
| --- | --- |
| P0 | Tombol tool `[data-tip="veIconify"]` ada di `.fig-floating-bar` (tepat 1) |
| P0b | Panel tertutup pada awalnya |
| P1 / P1b | Klik tool → `[data-testid="ic-panel"]` tampil + `aria-pressed=true` |
| P2 / P2b | Klik tool lagi → panel tertutup (toggle) + `aria-pressed=false` |
| P3 | Tombol tutup panel (`[data-testid="ic-close"]`) menutup panel |
| P4 | Esc menutup panel |
| P5 | Buka panel saat popover Float terbuka (shape picker) → `.flt` tertutup |
| P6 | Mengaktifkan tool lain (Select) menutup panel (satu active tool) |
| P7 | 0 pageerror |

Pola launch/relay disalin dari `probes/probe-iconify-spike1.cjs` (loopback CONNECT
relay + probe-only `--ignore-certificate-errors`; panel auto-load
`listCollections` + `loadSet("material-symbols")` saat dibuka, jadi probe ini
memang memicu fetch — visibilitas root panel TIDAK bergantung pada fetch itu
berhasil, karena state loading/error tetap me-render panel). Alur muat aplikasi
("Create New Project" → `.fig-nav-dock` → `window.__geovantaEditorApi`) sama
dengan spike1. Screenshot: `probes/shots/iconify-t5-open.png` /
`iconify-t5-closed.png` (baru dibuat saat probe mencapai langkah itu).

### RED — sebelum implementasi (brief Step 2, sesuai ekspektasi)

```text
$ npm run build:web
exit 0 — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."

$ PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs
  (web/ disajikan via `python3 -m http.server 9041` dari web/)
  info egress proxy from env: yes (hatch-egress-proxy:3128, auth present — values never logged)
  info CONNECT relay listening on 127.0.0.1:33799
FAIL P0 tool button [data-tip="veIconify"] exists in the floating bar | actual=count=0 expected=count=1
PASS P7 0 pageerror | actual=[] expected=[]
PROBE-ICONIFY-T5: 1/2 lolos | GAGAL: P0
```

Probe berhenti setelah P0 (asersi berikutnya bergantung pada tombol itu) — persis
kegagalan yang diharapkan brief ("FAIL — tool button does not exist").

## 2. Findings that are settled (tidak butuh ruling)

- **Entri `VE_TOOLS`:** single entry `['iconify', 'veIconify', ICONS.shapes]`
  di `src/constants/editorToolsAndShapes.jsx` — glyph `ICONS.shapes`
  (`'M7 3l4 7H3z M14 14h7v7h-7z M7 21a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'`,
  segitiga + kotak + lingkaran = "ikon"), tanpa ikon baru yang dibundel.
  Registrasi tooltip `TIPS.veIconify` / `TIPS_EN.veIconify` di file yang sama,
  mengikuti pola loop `SHAPES.forEach` yang sudah ada di file itu
  (`TIPS['veShp_' + k]`). Tidak ada tes unit yang memvalidasi `VE_TOOLS`
  (`grep` di `tests/` nol hasil) — entri baru tidak memecahkan `npm test`.
- **Toggle:** `EditorFloatingToolbar.jsx` TIDAK boleh disentuh (di luar daftar
  file brief) dan handler single-entry-nya generik (`setOpenGrp(null);
  setTool(k)`, tanpa toggle). Toggle akan diimplementasikan di `VectorEditor.jsx`
  sebagai wrapper `setTool` yang diteruskan ke toolbar: update fungsional
  `setTool(prev => (k === 'iconify' && prev === 'iconify' ? 'select' : k))`
  — tanpa stale closure, semua tool lain pass-through.
- **Panel terbuka = `tool === 'iconify'`** (derived state, tanpa boolean baru):
  tool lain diklik → panel tertutup; Esc/X/`onClose` → `setTool('select')`.
- **`onClose` stabil:** `useCallback(() => setTool('select'), [])` — `setTool`
  adalah setter state React yang identitasnya stabil, jadi callback tidak
  pernah stale meskipun effect Esc panel hanya berdependensi `[open]`
  (carry note).
- **`onInsert` stub (Task 6 yang mengganti):** no-op yang mencatat pemanggilan
  (mis. `window.__iconifyInsertCalls` / ref + `say`), tanpa logika sisip.
- **Pola konflik panel (terverifikasi dari sumber, bukan asumsi):**
  1. Popover `Float` menutup sendiri saat klik luar via listener capture
     `document.addEventListener('pointerdown', dn, true)` — capture jalan
     sebelum `stopPropagation` bubble di `.fig-floating-bar`, jadi klik tombol
     toolbar apa pun menutup popover yang terbuka (P5 tidak butuh kode baru).
  2. Seksi sidebar TIDAK punya mutual exclusion di codebase: `frOpen` /
     `rcOpen` di `EditorRightInspector.jsx` adalah boolean independen dan
     keduanya bisa terbuka bersamaan — Iconify akan berkoeksistensi sama
     seperti mereka (stacked), bukan saling menutup.
  3. Level tool: satu active tool — itulah yang menutup panel saat tool lain
     dipilih (P6). Esc panel sudah punya guard Ruling J (overlay edit teks /
     `.flt`) di `IconifyPanel.jsx`; handler Esc global `VectorEditor.jsx`
     (`window.addEventListener('keydown', onKd)` — bubble) tidak berebut
     karena handler panel capture + `stopPropagation`.

## 3. NEEDS_CONTEXT — lokasi mount panel (pertanyaan ke koordinator)

**Temuan yang memaksa pertanyaan ini:** `.fig-workspace` adalah grid
`grid-template-columns: auto 1fr 276px` dengan TEPAT 3 anak (kolom kiri,
kolom kanvas + floating bar, `<EditorRightInspector/>`).
Anak ke-4 langsung dari `VectorEditor.jsx` TIDAK menjadi kolom ke-4 —
ia auto-place ke implicit row ke-2 (di bawah, `overflow: hidden`) dan tidak
tampil sebagai sidebar. Jadi mount "di `VectorEditor.jsx`" tidak bisa
menempatkan panel di kolom sidebar tanpa salah satu dari dua opsi di bawah.

Panel ini adalah `.fig-isec`; semua saudaranya (`RecolorSection`,
`FindReplaceSection`, seksi parameter tool blob/weave/arc — yang terakhir ini
sudah digerakkan oleh prop `tool` yang diterima inspector) dirender di dalam
`.fig-r-scroll` di `EditorRightInspector.jsx` (`<aside
class="fig-right-sidebar">`, lebar 276 px).

**Opsi A (rekomendasi saya) — mount di `EditorRightInspector.jsx`:**
tambah import `IconifyPanel` + render `{tool === 'iconify' &&
<IconifyPanel open .../>}` di atas `.fig-r-scroll` (di samping
`{textControls}` / seksi parameter tool), dengan 2 prop baru dari
`VectorEditor.jsx` (`onIconifyClose` stabil + stub `onIconifyInsert`;
`status`/`recentIcons` baru dipasok Task 7). Ini mengikuti pola codebase
persis dan menempatkan panel sebagai seksi sidebar. Biaya: 1 file ke-3 di
luar daftar file brief (yang hanya menyebut `editorToolsAndShapes.jsx` +
`VectorEditor.jsx`).

**Opsi B — mount di `VectorEditor.jsx` saja (sesuai daftar file brief):**
wrapper `position: absolute; top: 12px; right: 12px; width: 276px;
max-height: calc(100% - 24px); overflow-y: auto; z-index: 30` di dalam kolom
kanvas (`relative`), berisi `IconifyPanel`. Panel mengambang di tepi kanan
kanvas ("di samping kanvas", §7.1, + preseden `FloatPopover`). Biaya:
menutupi karya di tepi kanan kanvas selama terbuka, dan menyimpang dari pola
seksi sidebar (`.fig-isec` di `.fig-r-scroll`).

**Yang saya butuhkan:** satu baris ruling — **A atau B**. Bila A: apakah file
ke-3 (`EditorRightInspector.jsx`, backup `.bak-iconify-t5`) diizinkan?
Bila B: apakah overlay di atas kanvas diterima sebagai penempatan final
(bukan sementara)?

## 4. Files changed / created (sejauh ini)

Dibuat:

- `probes/probe-iconify.cjs` (11.582 byte) — asersi P0–P7 Task 5.
- Laporan ini: `docs/superpowers/plans/sdd-2026-11-15-iconify/task-5-report.md`.

Tidak diubah: file `src/` apa pun (belum ada backup `.bak-iconify-t5` karena
belum ada edit; backup dibuat sebelum edit pertama begitu ruling diterima).

## 5. Self-review (sejauh ini)

- **Completeness:** Step 1–2 brief selesai (probe ditulis + RED terverifikasi).
  Step 3–5 tertahan di §3 — bukan karena kurang investigasi, melainkan karena
  dua penempatan yang valid membutuhkan keputusan koordinator.
- **Quality:** probe mount-agnostic (asersi perilaku, bukan implementasi),
  jadi tetap berlaku apa pun ruling A/B; pola relay + launch disalin dari
  spike1 yang sudah terbukti, bukan ditulis dari ingatan.
- **Discipline:** tidak ada edit produk sebelum ruling; tidak ada perubahan
  pada `IconifyPanel.jsx` (milik Task 4) atau klien Task 3.
- **Testing:** `build:web` exit 0 sebelum probe; probe RED 1/2 (hanya P0 yang
  gagal, sesuai ekspektasi). `npm test` belum dijalankan ulang di ronde ini
  (tidak ada perubahan produk; baseline 299/299 dari laporan Task 4 fix
  round 1 tetap berlaku — akan dijalankan penuh setelah implementasi).

## Completion (after ruling R17)

**Verdict: DONE** — Step 3–5 brief selesai mengikuti ruling R17 (Opsi A).
Skill yang dipakai (aturan `AGENTS.md`, jalur cepat percepatan 2026-11-15):
`executing-plans` (satu skill, sesuai fast path — 3 file, ≤50 baris berubah,
spec jelas). Catatan: tidak ada git di repo ini dan review adalah tugas
koordinator, jadi bagian worktree/ledger/review `executing-plans` yang
bergantung git/subagent tidak diterapkan; berkas laporan ini adalah
catatannya dan backup `.bak-iconify-t5` adalah "commit"-nya.

### Yang diimplementasikan (Step 3, ruling R17 — mount Opsi A)

1. **`src/constants/editorToolsAndShapes.jsx`** (+18 baris bersih):
   - `import { ICONS } from './brandAndIcons.jsx'` (tanpa siklus impor:
     `brandAndIcons.jsx` tidak mengimpor apa pun dari file ini).
   - Entri tunggal di akhir `VE_TOOLS`:
     `{type: 'single', item: ['iconify', 'veIconify', ICONS.shapes]}`
     — glyph `ICONS.shapes` yang sudah ada, tanpa ikon baru yang dibundel.
   - `TIPS.veIconify = {t: 'Ikon', d: 'Cari dan sisipkan ikon vektor dari
     Iconify. Klik lagi untuk menutup panel.'}` dan padanan
     `TIPS_EN.veIconify` (`'Icons'` / `'Search and insert vector icons
     from Iconify. Click again to close the panel.'`), mengikuti pola
     mutasi `TIPS` di file ini (`SHAPES.forEach`). Tanpa `k`: tidak ada
     shortcut keyboard baru.
2. **`src/components/editor/VectorEditor.jsx`** (+20 baris bersih):
   - `setToolToggle = React.useCallback(k => setTool(prev =>
     (k === 'iconify' && prev === 'iconify' ? 'select' : k)), [])` —
     toggle hanya untuk tombol Ikon; semua tool lain pass-through.
     Diteruskan ke `EditorFloatingToolbar` sebagai `setTool={setToolToggle}`;
     `EditorFloatingToolbar.jsx` TIDAK disentuh dan semua pemakaian
     `setTool` internal tidak berubah (satu-satunya `setTool={` di file
     ini adalah toolbar).
   - `onIconifyClose = React.useCallback(() => setTool('select'), [])`
     (stabil; `setTool` identitasnya stabil).
   - `onIconifyInsert` stub (Task 6 mengganti): `React.useCallback` yang
     hanya mencatat ke `window.__iconifyInsertCalls` (array, push objek
     ikon) — tanpa logika sisip apa pun.
   - `EditorRightInspector` menerima dua prop baru:
     `onIconifyClose={onIconifyClose} onIconifyInsert={onIconifyInsert}`.
   - Panel terbuka = `tool === 'iconify'` (derived state, tanpa boolean
     baru); Esc/X/`onClose` → `setTool('select')`.
3. **`src/components/editor/EditorRightInspector.jsx`** (+8 baris bersih):
   - `import { IconifyPanel } from './IconifyPanel.jsx'`.
   - Dua prop baru di destruktur (`onIconifyClose`, `onIconifyInsert`).
   - Mount di dalam `.fig-r-scroll`, tepat sesudah `{textControls}` dan
     sebelum IIFE seksi parameter tool:
     `{tool === 'iconify' && <IconifyPanel open
     onInsert={onIconifyInsert} onClose={onIconifyClose} L={L} />}`.
     `status`/`recentIcons` tidak dipasok (Task 7) — panel memakai
     default-nya (`'loading'` / `[]`).

### Perilaku konflik panel — sebagaimana diimplementasikan

- **Popover Float:** tanpa kode baru — P5 hijau. Klik tombol toolbar apa
  pun menutup popover yang terbuka via listener capture
  `document.addEventListener('pointerdown', dn, true)` di `Float`
  (capture jalan sebelum `stopPropagation` bubble di floating bar).
- **Seksi sidebar:** tanpa mutual exclusion, sesuai pola codebase —
  Iconify berkoeksistensi stacked seperti `frOpen`/`rcOpen` (keduanya
  boolean independen, bisa terbuka bersamaan). Panel Iconify tidak
  menutup Recolor/FindReplace dan sebaliknya.
- **Level tool:** satu active tool — klik tool lain (`veSelect`, P6)
  menutup panel karena `tool` tidak lagi `'iconify'`; klik ulang tombol
  Ikon menutup panel via `setToolToggle` (P2).

### Verifikasi (Step 4)

```text
$ npm run build:web
exit 0 — "[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/."

$ PROBE_ICONIFY_URL=http://127.0.0.1:9041/ node probes/probe-iconify.cjs
  (web/ disajikan via `python3 -m http.server 9041` dari web/;
   dijalankan TANPA pipe agar exit code tercatat benar)
  info egress proxy from env: yes (hatch-egress-proxy:3128, auth present — values never logged)
  info CONNECT relay listening on 127.0.0.1:35137
PASS P0 tool button [data-tip="veIconify"] exists in the floating bar | actual=count=1 expected=count=1
PASS P0b panel closed initially | actual=visible=false expected=visible=false
PASS P1 clicking the tool opens the panel | actual=visible=true expected=visible=true
PASS P1b tool button aria-pressed=true while panel is open | actual=aria-pressed=true expected=aria-pressed=true
PASS P2 clicking the tool again closes the panel | actual=visible=false expected=visible=false
PASS P2b tool button aria-pressed=false after toggle-close | actual=aria-pressed=false expected=aria-pressed=false
PASS P3 panel close control (X) closes the panel | actual=visible=false expected=visible=false
PASS P4 Esc closes the panel | actual=visible=false expected=visible=false
PASS P5 opening the panel closes the open Float popover (shape picker) | actual=flt before=1 after=0 panelVisible=true expected=flt before>=1 after=0 panelVisible=true
PASS P6 activating the Select tool closes the panel | actual=visible=false expected=visible=false
PASS P7 0 pageerror | actual=[] expected=[]
PROBE-ICONIFY-T5: 11/11 lolos | SEMUA LOLOS
PROBE_EXIT=0

$ npm test
ℹ tests 299
ℹ pass 299
ℹ fail 0
TEST_EXIT=0
```

RED→GREEN: probe yang sama sebelumnya FAIL P0 (count=0, 1/2 lolos) kini
11/11 lolos; suite penuh tetap 299/299 (baseline Task 4), tanpa regresi.
Screenshot run hijau: `probes/shots/iconify-t5-open.png` (92.432 B) dan
`probes/shots/iconify-t5-closed.png` (91.841 B). Probe tidak diubah sama
sekali (mount-agnostic, berlaku untuk Opsi A tanpa revisi).

### Files changed / created (Step 5)

Diubah (backup `.bak-iconify-t5` dibuat SEBELUM edit pertama — diff
terhadap backup diverifikasi hanya berisi perubahan di bawah):

- `src/constants/editorToolsAndShapes.jsx` (+18 baris) — backup
  `src/constants/editorToolsAndShapes.jsx.bak-iconify-t5` (12.606 B).
- `src/components/editor/VectorEditor.jsx` (+20 baris) — backup
  `src/components/editor/VectorEditor.jsx.bak-iconify-t5` (358.186 B).
- `src/components/editor/EditorRightInspector.jsx` (+8 baris) — backup
  `src/components/editor/EditorRightInspector.jsx.bak-iconify-t5`
  (53.361 B).

Tidak diubah: `EditorFloatingToolbar.jsx`, `IconifyPanel.jsx`,
`probes/probe-iconify.cjs`, klien Task 3. Tidak ada file baru selain
backup + 2 screenshot probe. Server `http.server 9041` dimatikan setelah
probe.

### Self-review

- **Completeness:** semua elemen Step 3 brief + ruling R17 terpenuhi —
  3 file, mount Opsi A di `.fig-r-scroll`, `onClose` stabil,
  stub `onInsert`, toggle, perilaku konflik panel (Float auto-tutup,
  seksi sidebar stacked, satu active tool).
- **Quality:** tidak ada perubahan `EditorFloatingToolbar.jsx`; tidak ada
  ikon baru yang dibundel (`ICONS.shapes` reuse); tidak ada logika sisip
  (stub hanya mencatat ke `window.__iconifyInsertCalls`).
- **Discipline:** hanya wiring (YAGNI) — tidak ada shortcut keyboard
  baru, tidak ada `status`/`recentIcons` (Task 7), tidak ada perubahan
  probe.
- **Testing:** probe hijau 11/11 di browser asli (Chromium headless,
  viewport 1440×900); `npm test` hijau 299/299.

### Issues / concerns

- Tidak ada blocker. Satu catatan untuk Task 6: stub `onInsert` tidak
  memberi umpan balik visual apa pun saat ikon diklik (hanya mencatat ke
  `window.__iconifyInsertCalls`) — itu disengaja untuk tugas ini; Task 6
  menggantinya dengan logika sisip + umpan balik.

## 6. Issues / concerns

- Satu-satunya blocker adalah §3. Setelah ruling diterima, sisa pekerjaan
  diperkirakan: backup 2 (atau 3) file → entri `VE_TOOLS` + TIPS → wrapper
  toggle + mount + `onClose` stabil + stub `onInsert` → `build:web` → probe
  hijau → `npm test` → laporan final.
- Catatan: kode keluar probe saat dijalankan lewat pipe (`| tail`) adalah
  kode `tail`, bukan probe — pada run GREEN nanti, jalankan tanpa pipe (atau
  via `pipefail`) agar exit code tercatat dengan benar.
