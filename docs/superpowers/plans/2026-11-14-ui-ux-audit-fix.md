# UI/UX Audit Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki 35 temuan audit UI/UX (2 Critical, 19 Important, 14 Minor) di Vector Editor Geovanta sesuai spek — tanpa band-aid (`!important`, offset hardcoded, kliping buta).

**Architecture:** Perbaikan struktural per keluarga temuan: token + cascade dulu (T1–T3), lalu ARIA/keyboard (T4–T6), lalu umpan-balik input/toast/modal/loading (T7–T12), lalu hierarki (T13–T14); responsif ≤1024 (T15) kondisional menunggu keputusan user. Tiap task TDD + probe Playwright di browser asli.

**Tech Stack:** React (JSX, tanpa TypeScript), Tailwind offline bundle (`src/vendor/tailwindOfflineBundle.jsx` — SATU baris tema raksasa; aturan tema berbentuk JSON AST), CanvasKit, Playwright (`playwright-core` 1.65.0), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-14-ui-ux-audit-fix-spec.md`
Audit reports (bukti detail + file:baris): `docs/superpowers/plans/sdd-2026-11-14-ui-ux-audit/audit-{a,b,c,d}-report.md`

## Global Constraints

- Working copy BUKAN repo git: backup `.bak-uiux-t<N>` per file SEBELUM edit pertama tiap file; JANGAN commit; JANGAN edit ledger/plan/spec; JANGAN dispatch subagent/reviewer.
- Tanpa dependensi baru.
- TDD: tulis tes/probe GAGAL dulu (RED), implementasi minimal (GREEN), bukti di laporan. Tes unit fokus: `node --test tests/<file>.test.cjs`; suite penuh `npm test` (baseline 265/265) sebelum laporan; `npm run build:web` exit 0, 0 warning.
- Setiap fix diverifikasi di browser asli via probe Playwright baru `probes/uiux-audit/probe-uiux-t<N>.cjs` (ukur bounds/kontras/fokus, screenshot ke `probes/shots/uiux-audit/`), 0 pageerror.
- Iron Law: TIDAK BOLEH menambah `!important` baru, offset piksel hardcoded, `z-index` arbitrer, atau kliping buta. Bila sebuah fix tampak butuh `!important`, STOP dan laporkan NEEDS_CONTEXT dengan alasan + alternatif struktural.
- Server app http://127.0.0.1:8931 (sudah jalan; bila mati: `(cd "<working copy>" && nohup python3 -m http.server 8931 >/tmp/app-server.log 2>&1 & echo $! > /tmp/app-server.pid)`); mock font 8941. Alur probe: "Create New" → "Buat & Buka Proyek" → `waitForFunction(() => window.__geovantaEditorApi)`.
- ZIP final HANYA di Task 15 (sesudah semua task lolos review): rebuild dari nol, kecualikan `docs/superpowers/plans/sdd-*`, `node_modules`, `*.bak*`; smoke ZIP 6/6.

## Review Focus

1. Permukaan putih sisa di dark mode sesudah T2 (satu override `#ffffff` yang terlewat) — probe `WS-DARK-SURFACES` (T2) menghitung semua permukaan dark; ekspektasi: 0 permukaan `rgb(255,255,255)` di luar konten dokumen.
2. Penghapusan `!important` (T3) meregresi layout yang selama ini hanya ditahan `!important` — suite probe penuh (157 skenario colorfx + probe audit) hijau sesudah tiap keluarga; ekspektasi: 0 regresi.
3. Focus trap (T9) merusak alur Esc/tutup modal — Esc menutup modal DAN fokus kembali ke pemicu; ekspektasi: 1 Tab sesudah tutup mendarat di pemicu.
4. Tombol aksi toast (T8) mencuri fokus atau menetap sesudah timeout — klik aksi bekerja, toast hilang 2,2 dtk, fokus tidak pindah; ekspektasi: `document.activeElement` tak berubah saat toast muncul.
5. Perubahan tipografi/spacing (T14) meluberkan seksi inspector sempit — 10 judul seksi overflow 0 di 1280 + 1024, ID + EN; ekspektasi: `scrollWidth == clientWidth` di semua seksi.

---

### Task 1: Token & kontras (D-I1, D-I3, D-M2, D-M3, D-M4, C-6)

**Files:**
- Modify: `src/vendor/tailwindOfflineBundle.jsx` (blok `:root` M3 + aturan status)
- Modify: `src/components/editor/VectorEditor.jsx:421,425,53,8463` (fallback warna)
- Modify: `src/components/workspace/WorkspaceHome.jsx:323-324` (tombol Hapus → token)
- Modify: `src/App.jsx:356` (tint banner → token)
- Modify: `src/components/editor/TextEditOverlay.jsx:143` (`::selection` → token)
- Test: probe `probes/uiux-audit/probe-uiux-t1.cjs`

**Interfaces:**
- Produces: token `--danger/--warn/--info/--ok` + `--acc-ink` (light `#15803d`, dark `#4ade80`) yang dipakai T2 (teks aktif segmen), T8 (toast aksi), T13 (tombol destruktif).
- Consumes: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t1.cjs`: ukur (a) `getComputedStyle(document.documentElement).getPropertyValue('--acc')` == `#13b152` dan tidak ada blok `:root` kedua dengan `--acc #4f46e5` (baca file bundle: hitung kemunculan `--acc #4f46e5` == 0); (b) rasio kontras `--acc-ink` vs putih ≥4,5:1 (light) dan vs `--card` dark ≥4,5:1 (dark); (c) teks "Clip Frame" aktif ≥4,5:1; ikon `.dk-b.on` ≥3:1; (d) grep `#ef4444|#f59e0b|#3b82f6` di luar definisi token di `src/components/` == 0. Jalankan: ekspektasi FAIL (token belum ada / kontras 2,82:1).
- [ ] **Step 2: Hapus set `:root` lama (indigo) beserta varian dark-nya** dari bundle; sisakan blok M3.
- [ ] **Step 3: Tambah token** `--danger: #ef4444; --warn: #f59e0b; --info: #3b82f6; --ok: #22c55e` (light + dark) dan `--acc-ink` (light `#15803d`, dark `#4ade80`) di blok M3.
- [ ] **Step 4: Ganti 10 pemakaian hex status** (audit D §I3) ke token; hapus duplikasi `.ws-card-fav-btn.on` (sisakan satu, warna `--warn`); gradien `.bar` → aksen saja (tanpa `#a78bfa`); fallback JS aksen → `'#13b152'`, `SNAP_GUIDE_COLOR`/`handleColor` → konstanta bernama.
- [ ] **Step 5: Pakai `--acc-ink`** untuk teks "Clip Frame" aktif + ikon `.dk-b.on`.
- [ ] **Step 6: Jalankan probe** — ekspektasi: semua asersi PASS, kontras terukur ≥ ambang di kedua tema.
- [ ] **Step 7: Jalankan `npm test` + `npm run build:web`** — ekspektasi: 265/265, exit 0, 0 warning.

### Task 2: Permukaan dark mode — hapus `#ffffff !important` M3 (D-I2, D1, D2)

**Files:**
- Modify: `src/vendor/tailwindOfflineBundle.jsx` (lapisan override M3)
- Test: probe `probes/uiux-audit/probe-uiux-t2.cjs`

**Interfaces:**
- Consumes: token `--acc-ink` + `--fig-sel-ink` dari Task 1 (teks aktif segmen).
- Produces: 0 `#ffffff` hardcoded di luar definisi token (grep); dasar untuk Task 3 (hitung ulang sisa `!important` sesudah task ini).

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t2.cjs`: (a) di dark mode, enumerasi semua permukaan chrome (nav, sidebar, inspector, kartu workspace, thumbnail, badge): ekspektasi 0 elemen `rgb(255,255,255)` di luar konten dokumen; (b) ikon nav non-aktif kontras ≥3:1; (c) teks segmen aktif "Pusat"/"Nonzero" kontras ≥4,5:1 di dark; (d) grep `#ffffff !important` di bundle == 0. Jalankan: ekspektasi FAIL (D1 ~1,05:1, D2 ~1,3:1, `.ws-card-thumb`/`.ws-nav-cnt` putih).
- [ ] **Step 2: Hapus `#ffffff !important`** dari lapisan override M3 (~20 permukaan: `.fig-workspace`, `.fig-nav-rail`, sidebar, `.fig-floating-bar`, `.ved-panel`, `.fld/.xf`, `.seg`, `.ved-pill`, `.hp/.flt`, `.stg-group`, `.ws-nav-cnt`, `.ws-card-thumb`, `.ws-card-thumb-placeholder`, `.ws-nav-storage-card`); biarkan `var(--card)`/`var(--sub)` bekerja.
- [ ] **Step 3: Latar aktif segmen** → `color-mix(in srgb, var(--acc) 18%, var(--card))`; **teks aktif segmen** → `--fig-sel-ink` (bukan inherit `--ink`). **Definisi ulang `--fig-sel-ink: var(--acc-ink)` di kedua tema** — nilai lama `var(--acc)` (#13b152) hanya ~2,5:1 di atas tint; tanpa redefinisi ini teks aktif akan gagal kontras (lihat Ruling di ledger).
- [ ] **Step 4: Hapus tambalan dark per-kelas** yang menjadi tidak perlu (28 aturan `:root[data-theme="dark"]` — hapus hanya yang mengulang permukaan yang kini memakai token; bila ragu, biarkan + catat di laporan).
- [ ] **Step 5: Jalankan probe** — ekspektasi: semua asersi PASS di light DAN dark.
- [ ] **Step 6: Jalankan `npm test` + `npm run build:web`** — ekspektasi: 265/265, exit 0, 0 warning.

### Task 3: Pengurangan `!important` sistemik (A4)

**Files:**
- Modify: `src/vendor/tailwindOfflineBundle.jsx` (keluarga 1–12 audit A §A4)
- Test: probe `probes/uiux-audit/probe-uiux-t3.cjs` + suite regresi

**Interfaces:**
- Consumes: hitung ulang sisa `!important` sesudah Task 2 (Task 2 menghapus sebagian).
- Produces: bundle tanpa `!important` layout/padding kecuali pengecualian terdokumentasi.

- [ ] **Step 1: Hitung baseline** — `grep -c '!important'` + hitung per keluarga (audit A Appendix A, 187 baris layout/padding). Tulis probe GAGAL `probe-uiux-t3.cjs`: (a) jumlah deklarasi `!important` layout/padding == 0 kecuali daftar pengecualian (kursor — 1 keluarga); (b) layout probe (10 judul seksi overflow 0 + toolbar 22 tombol terlihat di 1920/1280 + modal di dalam viewport). Jalankan: ekspektasi FAIL (baseline 187).
- [ ] **Step 2: Per keluarga 1–12 (audit A §A4), hapus `!important`** dengan perbaikan struktural per keluarga (layer tema / kelas varian / hapus utility bersaing / `[hidden]` / `min-width: max-content` / pindah positioning ke aturan dasar). Kerjakan keluarga berurutan; sesudah TIAP keluarga jalankan `npm run build:web` + probe layout ringkas — bila satu keluarga meregresi layout, STOP keluarga itu, catat sebagai parked + alasan, lanjut keluarga berikut (jangan menumpuk fix). **Termasuk D-M7 (sizing):** saat menyentuh aturan `.fig-nav-dock .dk-b` (36×34px), naikkan hit area ke 40×40.
- [ ] **Step 3: Dua aturan padding pill** (`.fig-right-sidebar .ved-pill` + `.fig-isec-title > span > .ved-pill`): ganti dengan kelas varian `.ved-pill--compact { padding: 2px 4px }` yang dipakai eksplisit ketiga tombol Color Styles — lalu HAPUS kedua `!important` itu. Verifikasi grup tombol tetap 228,8 px ≤ 243 px (probe flexwrap lama).
- [ ] **Step 4: Jalankan probe + regresi penuh** (`npm test`, probe color-styles 19, figma-text 15, select-same 9, find-replace 13, recolor 15, effects 33, shots 13, flexwrap 7) — ekspektasi: semua hijau, 0 pageerror.
- [ ] **Step 5: Tulis daftar pengecualian tersisa** (bila ada — hanya kursor) + alasan di laporan; grep final di laporan.

### Task 4: Nama aksesibel & state ARIA (C-1, C-3, C-7, C-8, D-M7 label)

**Files:**
- Modify: `src/components/editor/LayerRows.jsx:85-91,134` (`layLock`/`layHide`, chevron frame)
- Modify: `src/components/editor/EditorRightInspector.jsx` (`veUndo`, `veRedo`, `veZoomOut`, `veZoomIn`, `veImport`, `veAlnDistH/V`, `veToggleHidden`, field Gap `:488`)
- Modify: `src/components/editor/EditorFloatingToolbar.jsx:117` (`VE_TOOLS.map` → `aria-pressed`)
- Modify: `src/components/editor/VectorEditor.jsx:113` (toast → `role="status"`, lihat juga Task 8)
- Modify: `src/components/ui/TransformField.jsx:140` (`ariaLabel` eksplisit, jangan warisi label ikon)
- Modify: dock nav (elemen 36×16 tanpa tip — D-M7 label; file ditentukan implementer dari audit D §M7)
- Test: probe `probes/uiux-audit/probe-uiux-t4.cjs`

**Interfaces:**
- Produces: pola `aria-label` eksplisit + `aria-pressed` yang dipakai Task 5 (baris layer) dan Task 11 (tooltip swatch memakai nama yang sama).
- Consumes: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t4.cjs`: enumerasi accname semua `button` terlihat — ekspektasi 0 tanpa nama; `vePen` (aktif) `aria-pressed=="true"` dan tool lain `"false"`; toast punya `role=="status"` + `aria-live=="polite"`; field Gap `aria-label` mengandung kata "Gap" (bukan `"][ "`). Jalankan: ekspektasi FAIL (16 tanpa nama).
- [ ] **Step 2: Tambah `aria-label`** (teks = label tooltip `data-tip` yang sudah ada, dalam bahasa aktif) pada 16 tombol + chevron frame `<span role="button">`.
- [ ] **Step 3: Tambah `aria-pressed`** pada tombol tool toolbar (true hanya untuk tool aktif).
- [ ] **Step 4: Perbaiki field Gap**: `XfField` Gap memakai `ariaLabel="Gap antar objek"` eksplisit (jangan warisi label ikon `][ `); `TransformField.jsx` hanya memakai `ariaLabel` bila diberikan.
- [ ] **Step 5: Toast** beri `role="status"` + `aria-live="polite"` (bekerja sama dengan Task 8 — bila Task 8 belum jalan, buat perubahan ini di sini dan Task 8 menggunakannya).
- [ ] **Step 6: Elemen dock 36×16 (D-M7 label)**: beri `data-tip`/label bermakna ATAU keluarkan dari tab order bila itu pemisah dekoratif — verifikasi di probe: 0 elemen interaktif terlihat tanpa nama.
- [ ] **Step 6: Jalankan probe + `npm test` + build** — ekspektasi: probe PASS, 265/265, exit 0, 0 warning.

### Task 5: Baris layer bisa keyboard (C-2, C-4)

**Files:**
- Modify: `src/components/editor/LayerRows.jsx:61,125,172` (baris, frame-hdr, bucket)
- Test: probe `probes/uiux-audit/probe-uiux-t5.cjs`

**Interfaces:**
- Consumes: pola `aria-label`/`aria-pressed` dari Task 4.
- Produces: baris layer fokus + seleksi keyboard (dipakai Task 9? tidak — independen).

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t5.cjs`: Tab mencapai baris layer pertama; `role` baris terukur (mis. `option` dalam `listbox` ATAU `row` — pilih satu, konsisten); `aria-selected` true/false sesuai seleksi; ArrowDown memindahkan fokus + seleksi ke baris berikut; Enter/Space memilih baris terfokus; klik mouse tetap bekerja seperti sebelumnya. Jalankan: ekspektasi FAIL (`tabIndex=null`, tanpa role).
- [ ] **Step 2: Implementasi**: baris jadi fokus (`tabIndex={0}` pada baris aktif / roving tabindex bila sudah ada pola — pilih pola paling sederhana yang lolos probe), `role` + `aria-selected` mengikuti seleksi; handler keydown ArrowUp/Down/Home/End + Enter/Space; JANGAN ubah perilaku klik/drag yang sudah ada.
- [ ] **Step 3: Jalankan probe + regresi layer** (probe figma-text 15 + select-same 9 — keduanya menyentuh seleksi) — ekspektasi: PASS, 0 pageerror.

### Task 6: Hormati `prefers-reduced-motion` (C-5)

**Files:**
- Modify: `src/utils/themeAndPrefsManager.jsx:89` (`applyMotion`)
- Test: probe `probes/uiux-audit/probe-uiux-t6.cjs`

**Interfaces:**
- Consumes: mekanisme `data-motion="off"` yang sudah ada (kontrol positif 1e-05 dtk).
- Produces: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t6.cjs`: di bawah emulasi `reducedMotion: 'reduce'`, `document.documentElement.getAttribute('data-motion')` == `"off"` DAN durasi transisi `.ved-pill` ≈ 0 (≤0,01 dtk); tanpa emulasi (no-preference), `data-motion` mengikuti pref manual seperti sebelumnya. Jalankan: ekspektasi FAIL (`data-motion=null`, transisi 0,2 dtk).
- [ ] **Step 2: Implementasi**: `applyMotion` membaca `window.matchMedia('(prefers-reduced-motion: reduce)')` — bila reduce, set `data-motion="off"` (pref manual `off` tetap menang; pref manual `on` TIDAK boleh mengalahkan preferensi OS — OS menang); dengarkan perubahan media query (listener) agar berubah tanpa reload.
- [ ] **Step 3: Jalankan probe + `npm test` + build** — ekspektasi: PASS kedua mode, 265/265, exit 0.

### Task 7: Umpan balik input hex tidak valid (B-F2, C-9)

**Files:**
- Modify: `src/components/ui/ColorHexInput.jsx` (`ColorText.commit`)
- Modify: `src/components/ui/ColorPickerField.jsx:193` (`filterRe` + feedback)
- Modify: `src/components/modals/FindReplaceColorModal.jsx` (field To + error From/To)
- Test: probe `probes/uiux-audit/probe-uiux-t7.cjs`

**Interfaces:**
- Consumes: token `--danger` dari Task 1 (warna teks error).
- Produces: pola error inline (`aria-invalid` + pesan) yang dipakai Task 12 bila perlu.

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t7.cjs`: (a) ColorText Fill ketik `zzzzzz` + Enter → nilai input TETAP `zzzzzz` (dipertahankan), elemen error terlihat berisi "tidak valid", `aria-invalid=="true"`, fill objek TIDAK berubah; (b) field To Find & Replace sama; (c) sesudah perbaiki ke `ea580c` + Enter → error hilang, fill berubah; (d) ketik `z` (satu karakter non-hex) di ColorText → karakter ditolak TAPI hint error singkat muncul. Jalankan: ekspektasi FAIL (nilai kembali ke lama, `errorEl=false`).
- [ ] **Step 2: Implementasi**: commit gagal → JANGAN kembalikan nilai lama; tampilkan pesan error inline ("Kode hex tidak valid — gunakan 0-9, a-f"), `aria-invalid="true"`; bersihkan error + `aria-invalid` saat input berubah menjadi valid; error stale (mis. "Dari dan Ke sama") dibersihkan saat input berubah.
- [ ] **Step 3: Jalankan probe + regresi** (color-styles 19 + find-replace 13) — ekspektasi: PASS, 0 pageerror.

### Task 8: Toast beraksi + Urungkan sesudah hapus (B-F3, D-M6)

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx:113` (`say(m)` → dukung aksi; elemen `.ved-toast`)
- Modify: `src/components/editor/VectorEditor.jsx:7448` (hapus → toast "Urungkan")
- Test: probe `probes/uiux-audit/probe-uiux-t8.cjs`

**Interfaces:**
- Consumes: `role="status"` toast dari Task 4; token `--danger/--ok` dari Task 1 (bila dipakai).
- Produces: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t8.cjs`: (a) hapus objek → toast muncul berisi tombol aksi "Urungkan"; klik aksi → objek kembali (undo bekerja); (b) toast tanpa aksi tetap seperti sebelumnya (teks saja); (c) `document.activeElement` TIDAK berubah saat toast muncul; (d) toast hilang sesudah 2,2 dtk; toast baru menggantikan yang lama. Jalankan: ekspektasi FAIL (`hasButton=false`).
- [ ] **Step 2: Implementasi**: `say(m, action?)` dengan `action = { label, onClick }`; toast me-render tombol aksi (fokus TIDAK dipindah otomatis); hapus objek/layer memanggil `say("Objek dihapus", { label: "Urungkan", onClick: undo })`; TANPA dialog konfirmasi (keputusan spek §3).
- [ ] **Step 3: Jalankan probe + `npm test` + build** — ekspektasi: PASS, 265/265, exit 0.

### Task 9: Fokus modal (B-F5)

**Files:**
- Modify: `src/components/modals/FindReplaceColorModal.jsx`, `src/components/modals/RecolorModal.jsx` (atau induk modal bersama bila ada)
- Test: probe `probes/uiux-audit/probe-uiux-t9.cjs`

**Interfaces:**
- Consumes: —
- Produces: pola fokus modal (masuk + trap + kembali) untuk semua modal.

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t9.cjs`: buka Find & Replace → `document.activeElement` berada DI DALAM modal; Tab berulang tetap di dalam modal (trap — tidak keluar ke inspector); Esc menutup modal DAN fokus kembali ke tombol pemicu; sama untuk Recolor. Jalankan: ekspektasi FAIL (`focusInside=false`, Tab ~70 stop).
- [ ] **Step 2: Implementasi**: saat modal dibuka, fokus ke kontrol pertama (field From / slider hue); trap Tab/Shift+Tab di dalam modal; saat ditutup (Esc/X/Tutup), fokus kembali ke elemen pemicu; JANGAN ubah perilaku Esc membatalkan pratinjau yang sudah ada.
- [ ] **Step 3: Jalankan probe + regresi** (find-replace 13 + recolor 15) — ekspektasi: PASS, 0 pageerror.

### Task 10: Indikator loading + jangan blokir main thread (B-F1)

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (jalur `loadTestSvg`/impor — tempat load jagung 767 ms)
- Modify: `src/components/editor/LayerRows.jsx` (indikator di panel layer, bila itu tempatnya) — atau overlay loading di kanvas; pilih yang paling dekat dengan jalur load
- Test: probe `probes/uiux-audit/probe-uiux-t10.cjs`

**Interfaces:**
- Consumes: —
- Produces: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t10.cjs`: muat `~/workspace/trace4/jagung_auto.svg` (129 path) → (a) indikator loading (spinner/teks "Memuat…") terlihat ≤100 ms sesudah load dimulai; (b) max tick gap main thread selama load ≤100 ms (ukur via interval 50 ms); (c) sesudah load, 129 objek + panel layer tervirtualisasi (44 baris DOM) seperti sebelumnya. Jalankan: ekspektasi FAIL (indikator `[]`, maxTickGap 766 ms).
- [ ] **Step 2: Implementasi**: tampilkan indikator SEBELUM parse dimulai; pecah parse/penyusunan objek menjadi potongan (chunk + `await new Promise(requestAnimationFrame)` / `setTimeout 0` antar potongan) agar main thread bisa bernapas; sembunyikan indikator sesudah render pertama selesai. JANGAN ubah hasil parse (objek/nama/urutan harus identik).
- [ ] **Step 3: Jalankan probe + `npm test` + build** — ekspektasi: PASS, 265/265, exit 0.

### Task 11: Tooltip swatch Fill/Stroke (B-F4)

**Files:**
- Modify: `src/components/editor/EditorRightInspector.jsx` (swatch Fill/Stroke — `data-tip="veFill"`/`veStroke`)
- Test: probe `probes/uiux-audit/probe-uiux-t11.cjs`

**Interfaces:**
- Consumes: pola tooltip (`data-tip` + TooltipHost) yang sudah dipakai tombol lain; nama aksesibel dari Task 4.
- Produces: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t11.cjs`: hover swatch Fill → tooltip `.tt` terlihat berisi nama + hex saat ini (mis. mengandung `#2563eb`); sama untuk Stroke; hover keluar → tooltip hilang. Jalankan: ekspektasi FAIL (`.tt == null`).
- [ ] **Step 2: Implementasi**: swatch memakai mekanisme tooltip yang sama dengan kontrol lain (isi: nama field + nilai warna saat ini, update saat warna berubah).
- [ ] **Step 3: Jalankan probe + regresi** (color-styles 19) — ekspektasi: PASS.

### Task 12: Empty state Recolor (B-F6)

**Files:**
- Modify: `src/components/modals/RecolorModal.jsx`
- Test: probe `probes/uiux-audit/probe-uiux-t12.cjs`

**Interfaces:**
- Consumes: pola error inline dari Task 7 (bila dipakai).
- Produces: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t12.cjs`: dokumen kosong (0 objek) → buka Recolor → empty state eksplisit terlihat ("Dokumen ini belum memiliki warna…") DAN slider/input Mode 1 disabled (atau disembunyikan); tombol Terapkan disabled. Jalankan: ekspektasi FAIL (slider tampil dan terlihat bisa dipakai).
- [ ] **Step 2: Implementasi**: bila 0 warna, tampilkan empty state + disable semua kontrol Mode 1/Mode 2 (bukan hanya label hitungan); JANGAN ubah perilaku bila ada warna.
- [ ] **Step 3: Jalankan probe + regresi** (recolor 15) — ekspektasi: PASS.

### Task 13: Satu primer per tampilan + urutan dialog + judul thumbnail (D-I4, D-I5, D-M1, D-M8)

**Files:**
- Modify: `src/components/editor/EditorRightInspector.jsx` (seksi Auto layout + Export & Impor)
- Modify: `src/components/workspace/WorkspaceHome.jsx` (header + empty state)
- Modify: `src/components/modals/FindReplaceColorModal.jsx` (urutan footer)
- Test: probe `probes/uiux-audit/probe-uiux-t13.cjs`

**Interfaces:**
- Consumes: token `--danger` dari Task 1 (tombol Hapus); konvensi §3 spek.
- Produces: —

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t13.cjs`: (a) 1 objek terseleksi → hitung tombol filled primer hijau yang terlihat di inspector == 1 ("Terapkan" primer HANYA bila ada perubahan auto-layout tertunda; bila tidak ada perubahan, "Unduh .SVG" yang primer); (b) workspace kosong → hanya 1 primer terlihat ("Create New Project"); (c) footer Find & Replace berurutan `[Tutup | Ganti Semua | Ganti]` (primer kanan). Jalankan: ekspektasi FAIL (2 primer di inspector, 2 di workspace, primer F&R di kiri).
- [ ] **Step 2: Implementasi**: atur primer/sekunder sesuai Step 1 (kelas `btn pri` ↔ `btn sec`); footer F&R diurutkan ulang; **judul dokumen di thumbnail kartu workspace** memakai `text-overflow: ellipsis` + `white-space: nowrap` (D-M8 — tidak lagi terpotong di tengah kata); JANGAN ubah fungsi tombol (hanya bobot visual + urutan).
- [ ] **Step 3: Jalankan probe + regresi** (find-replace 13 + shots 13) — ekspektasi: PASS.

### Task 14: Skala tipografi + proximity (D-I6, D-M5)

**Files:**
- Modify: `src/vendor/tailwindOfflineBundle.jsx` (`.fig-isec-title`, `.fig-sub-lbl`, `.fig-isec`)
- Modify: komponen editor yang memakai `text-[10.5px]` / `text-[11.5px]` (ganti ke skala beku)
- Test: probe `probes/uiux-audit/probe-uiux-t14.cjs`

**Interfaces:**
- Consumes: —
- Produces: skala tipografi beku 10/11/12/14 (dipakai semua task sesudahnya — tidak ada, ini task terakhir non-responsif).

- [ ] **Step 1: Tulis probe GAGAL** `probe-uiux-t14.cjs`: (a) ukuran font leaf-node di inspector hanya dari {10, 11, 12, 14}; (b) judul seksi 12px/600 vs isi 11px/400; (c) jarak intra-grup (space-y) 8px DAN padding seksi 14px (antar > intra); (d) 10 judul seksi overflow 0 di 1280 + 1024, ID + EN. Jalankan: ekspektasi FAIL (7 ukuran; judul 11,5; intra == antar 10px).
- [ ] **Step 2: Implementasi**: hapus 10,5px + 11,5px (ganti ke 11 / 12); judul seksi → 12px/600; intra-grup 8px; padding seksi 14px vertikal.
- [ ] **Step 3: Jalankan probe + regresi penuh** (semua probe: 157 skenario colorfx + flexwrap 7 + shots 13) — ekspektasi: PASS, 0 pageerror.

### Task 15: Responsif ≤1024 — KONDIONAL (A1, A2, A3) + verifikasi akhir + ZIP

**Files:**
- Modify (hanya bila user memilih dukung 768/375): `src/components/editor/VectorEditor.jsx:8823` (toast → portal, lihat Task 8), `src/components/editor/EditorFloatingToolbar.jsx:99` (toolbar overflow), inspector ≤1023 (drawer/tab — file ditentukan implementer)
- Test: probe `probes/uiux-audit/probe-uiux-t15.cjs` + smoke ZIP

**Interfaces:**
- Consumes: toast portal (Task 8 — portal dibuat di sini bila belum); keputusan viewport user (lihat spek §5).
- Produces: ZIP final `Geovanta-ColorStyles-Recolor-Effects.zip` (rebuild).

- [ ] **Step 1: Cek keputusan user di ledger.** Bila "desktop-only (≥1280)": tulis batasan di `docs/superpowers/plans/2026-11-14-ui-ux-audit-progress.md` (A1–A3 = batasan terdokumentasi), lewati Step 2–3, lanjut Step 4. Bila "dukung 768/375": lanjut Step 2.
- [ ] **Step 2: Tulis probe GAGAL** `probe-uiux-t15.cjs`: (a) 768: inspector terjangkau (drawer/tab ATAU scroll halaman berfungsi — wheel di kanvas menggerakkan scroller); (b) 768/375: toast terlihat di viewport sesudah "+ Buat style"; (c) 1024/768/375: semua 22 alat toolbar terjangkau (menu "•••" ATAU affordance scroll terlihat + semua tombol tercapai). Jalankan: ekspektasi FAIL (A1–A3).
- [ ] **Step 3: Implementasi**: (a) inspector jadi drawer/tab di ≤1023 (atau affordance scroll + wheel polos meng-scroll `.ws-body`, zoom hanya `Ctrl/Cmd+wheel`); (b) toast portal ke `document.body` (`position: fixed`, `bottom: 16px`); (c) toolbar: tombol "•••" menampung alat di luar wadah (ATAU fade + chevron affordance + `max-width` ke lebar kanvas — pilih satu, catat di laporan). JANGAN kecilkan tombol di bawah 40 px; JANGAN `overflow-x: hidden`.
- [ ] **Step 4: Verifikasi akhir**: `npm test` 265/265 + build 0/0 + SEMUA probe (colorfx 157 + flexwrap 7 + audit t1–t15) hijau + shots 13/13 + 0 pageerror.
- [ ] **Step 5: Rebuild ZIP** dari nol ke path temp lalu `cp` menembus symlink target; kecualikan `docs/superpowers/plans/sdd-*`, `node_modules`, `*.bak*`; verifikasi SHA + 267 file + 0 entri sdd/node_modules/.bak; smoke ZIP hasil ekstrak 6/6.
