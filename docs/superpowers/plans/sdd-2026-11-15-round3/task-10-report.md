# Laporan — Ronde 3, Task T10: Investigasi + perbaiki "warna terakhir" agar berfungsi 100%

- Plan: `docs/superpowers/plans/2026-11-15-round3-ui-fixes.md` (§ T10)
- Brief: `docs/superpowers/plans/sdd-2026-11-15-round3/task-10-brief.md`
- Status: **DONE** — 1 dari 7 kandidat terbukti gagal (E1), diperbaiki di akar, RED→GREEN terverifikasi; 6 kandidat lain lolos tanpa edit.
- Skill yang dipakai (SKILL.md dibaca dulu): `systematic-debugging`, `test-driven-development`, `browser_ui_fix_verification`, `verification-before-completion`.
- Lingkungan: build `npm run build:web` (exit 0), disajikan `web/` via `python3 -m http.server` port **9005**, Playwright-core + Chromium 1255 headless, viewport 1440×900, tema light, bahasa id. Server dimatikan sesudah semua run.

## Ringkasan hasil

| Kandidat | Hasil | Bukti |
|---|---|---|
| (a) strip recent-colors (R2 fase A) | LOLOS | R2-T8 re-run: A0 + A-pertama/tengah/terakhir 4/4 |
| (b) baris TERAKHIR Selection colors (R2 fase B) | LOLOS | R2-T8 re-run: B0/B1/B2 3/3 |
| (c) warna terakhir tiap keluarga Recolor Mode 2 (R2 fase C) | LOLOS | R2-T8 re-run: C0–C4 11/11 |
| (d) warna drop-shadow (R2 fase D) | LOLOS | R2-T8 re-run: D0/D1/D2 3/3 |
| (e) eviksi batas 10 | **GAGAL → DIPERBAIKI (E1)** | Probe baru: E1 FAIL 11 swatch → sesudah fix 15/15 |
| (f) persistensi setelah reload | LOLOS | Probe baru: F0–F3 4/4 |
| (g) klik warna terakhir menerapkan ke objek | LOLOS | Probe baru: G0 + G-pertama/tengah/terakhir 4/4 |

**Total: R2-T8 re-run 22/22 + probe baru R3-T10 15/15 + `npm test` 277/277 + 0 pageerror di semua run.**

## Step 1 — Reproduksi

### 1a. Probe R2-T8 di build Ronde 3 (sebelum fix): 22/22 LOLOS

Perintah: `R2_T8_URL=http://127.0.0.1:9005/ node probes/probe-r2-t8-last-color.cjs`

- Fase A (recent-colors, seed 3 warna via prefs): **4/4** — A0 strip tampil + 3 seed, klik pertama `#ff0000` → fill `#FF0000`, tengah `#00ff00` → `#00FF00`, terakhir `#0000ff` → `#0000FF`.
- Fase B (baris TERAKHIR Selection colors): **3/3** — B0 ≥2 baris; B1 ColorField baris terakhir → `#FF00FF`; B2 tombol ◎ → toast `"1 objek #FF00FF dipilih"`, fill tak berubah (`#0000FF` → `#0000FF`).
- Fase C (Recolor Mode 2, 5 keluarga): **11/11** — C0 5 elips terseleksi; C1 5 keluarga, red 2 warna (`#FF0000,#CC0000`), gray terakhir; C2-red/green/cyan/indigo/gray override warna terakhir → mapped `#ABCDEF`; C2-red-first mapped `#FF0000` tak ikut berubah; C3-gray tanpa kontrol target (by design); C3-indigo target → `#00FFFF`; C4 Apply → `#ABCDEF` Fill·3 + Stroke·5, `#00FFFF` Fill·1, toast `"9 warna diubah"`.
- Fase D (drop-shadow): **3/3** — D0 awal `#000000`; D1 → `#FF8800`; D2 bertahan saat popover dibuka ulang, fill objek tetap `#0D99FF`.
- E0: 0 pageerror.

Catatan screenshot: probe R2-T8 hardcode path `probes/shots/r2-t8-lastcolor-before.png` / `-after.png`, sehingga run regresi ini menimpa artefak R2 — persis seperti preseden T1/T5/T8 di brief. Kedua file sudah dikembalikan dari backup `/tmp/r2-t8-*.bak.png` (isi kembali artefak R2 per 2026-11-14, 91.738 B / 95.818 B). Bukti visual Ronde 3 memakai nama file `r3-t10-*` (lihat bawah).

### 1b. Probe BARU `probes/probe-r3-t10-last-color.cjs`: 14/15 sebelum fix, 15/15 sesudah fix

Perintah: `R3_T10_URL=http://127.0.0.1:9005/ node probes/probe-r3-t10-last-color.cjs`
(Konteks Playwright terpisah per fase; fase F memakai konteks TANPA `addInitScript` supaya reload tidak me-re-seed prefs dan menutupi kegagalan persistensi.)

**Fase E — eviksi batas 10:**

- **E1 (seed 11 via prefs) — GAGAL sebelum fix, LOLOS sesudah fix.** Seed (terbaru→terlama) `['#ff0000','#ff8800','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff','#808080','#c0c0c0','#804000','#111111']`.
  - Sebelum fix: strip menampilkan **11 swatch**, `#111111` (tertua) masih ada → `FAIL E1 … actual=[…11 warna…] expected=len=10, tanpa #111111, [0]=#ff0000, [9]=#804000`.
  - Sesudah fix: strip tepat **10**, `[0]=#ff0000`, `[9]=#804000`, `#111111` tereviksi, semua enabled → `PASS E1`.
- E2 — LOLOS (sebelum & sesudah fix): klik warna terakhir strip seed-11 mengubah fill (sebelum fix `#111111` → fill `#111111`; sesudah fix `#804000` → fill `#804000`).
- E3 — LOLOS: 11 warna nyata diterapkan satu per satu lewat Fill ColorField (`110101`…`bb0b0b`) → strip tepat 10 `[#bb0b0b…#220202]` terbaru-dulu, `#110101` (tertua) tereviksi.
- E3s — LOLOS: `localStorage recentColors` sesudah 11× pakai == strip (10, terbaru-dulu).
- E4 — LOLOS: klik warna terakhir strip sesudah eviksi nyata (`#220202`) → fill `#220202`.
- E5 — LOLOS: warna posisi tengah yang dipakai ulang (`#880808`) naik ke depan strip (`[0]=#880808`, len tetap 10).

**Fase F — persistensi setelah reload:**

- F0 — LOLOS: strip tampil 3 warna seed `['#ff0000','#00ff00','#0000ff']` sebelum reload.
- F1 — LOLOS: klik warna terakhir `#0000ff` → fill `#0000FF`; `localStorage recentColors` menjadi `['#0000ff','#ff0000','#00ff00']`.
- F2 — LOLOS: reload penuh → proyek baru → elips baru → strip tetap `['#0000ff','#ff0000','#00ff00']`, sama dengan `localStorage`.
- F3 — LOLOS: klik warna terakhir sesudah reload (`#00ff00`) → fill `#00FF00`.

**Fase G — klik warna terakhir (run segar, duplikat fase A R2):**

- G0 — LOLOS: strip memuat 3 warna seed. G-pertama (`#ff0000`), G-tengah (`#00ff00`), G-terakhir (`#0000ff`) — LOLOS, masing-masing mengubah fill.

**H0 — 0 pageerror selama seluruh probe baru (sebelum & sesudah fix).**

## Step 2 — Root cause E1 + fix

**Root cause (bukan gejala):** batas 10 warna hanya ditegakkan di jalur **tulis**. `rememberRecentColor` (`src/components/editor/VectorEditor.jsx:133-145`) melakukan `[hex, ...cur.filter(c => c !== hex)].slice(0, 10)` — inilah mengapa E3 (pemakaian nyata) selalu lolos. Tetapi jalur **muat** tidak menormalisasi: `loadPrefs` (`src/utils/themeAndPrefsManager.jsx:45-67`) menyebar prefs tersimpan verbatim (`{ ...DEFAULT_PREFS, ...p }`), dan strip recent-colors (`src/components/editor/EditorRightInspector.jsx:297,384`) memetakan `recentColors` apa adanya. Daftar >10 yang masuk lewat prefs tersimpan (seed/import/prefs versi lama) karena itu dirender 11 swatch tanpa eviksi. `loadPrefs` adalah satu-satunya choke point muat prefs (pemanggil tunggal: `App.jsx:25` `useState(() => loadPrefs())`), dan tidak ada unit test yang menyentuh `loadPrefs`/`recentColors` — jadi fix di sana memperbaiki semua konsumen sekaligus tanpa mengubah jalur tulis yang sudah benar.

**Fix (minimal, 1 file, 6 baris + komentar):**

- Backup sebelum edit: `src/utils/themeAndPrefsManager.jsx.bak-r3t10` (disalin sebelum edit pertama file itu).
- Diff vs backup (`diff src/utils/themeAndPrefsManager.jsx.bak-r3t10 src/utils/themeAndPrefsManager.jsx`): hanya tambahan baris 52–57, di dalam `loadPrefs`, tepat sesudah `const p = JSON.parse(raw);` dan sebelum cabang `m3White` (sehingga write-back cabang itu pun menyimpan daftar yang sudah dipangkas):

```js
    /* T10: tegakkan batas 10 warna terakhir juga di jalur muat — daftar
       lebih panjang (seed/import/prefs lama) sebelumnya dirender apa adanya
       karena cap hanya ada di jalur tulis rememberRecentColor. */
    if (Array.isArray(p.recentColors)) {
      p.recentColors = p.recentColors.filter(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 10);
    }
```

- Tidak ada perubahan lain: tanpa `!important`/offset/z-index, tanpa dependensi baru, tanpa ubah label/i18n. Normalisasi sengaja minimal (filter hex valid + `slice(0, 10)`, urutan dipertahankan); dedupe tidak ditambahkan karena bukan perilaku yang terbukti gagal. Daftar yang sudah dipangkas ikut tersimpan kembali oleh efek `savePrefs` di `App.jsx:31-33` saat prefs berubah.
- File yang diubah: hanya `src/utils/themeAndPrefsManager.jsx` (baris 52–57). Tidak ada file lain yang diedit.

**RED→GREEN E1 (TDD):** probe baru dijalankan SEBELUM fix → E1 FAIL (strip 11, `#111111` tampil); sesudah fix + `npm run build:web` → E1 PASS (strip 10, `#111111` tereviksi), probe baru **15/15**.

## Regresi + verifikasi (semua sesudah fix, build baru)

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Probe baru R3-T10 | `R3_T10_URL=http://127.0.0.1:9005/ node probes/probe-r3-t10-last-color.cjs` | **15/15** (E1 RED→GREEN) |
| R2-T8 re-run | `R2_T8_URL=http://127.0.0.1:9005/ node probes/probe-r2-t8-last-color.cjs` | **22/22** (A 4/4, B 3/3, C 11/11, D 3/3, E0 1/1) |
| R3-T3 (Selection Colors tak rusak) | `R3_T3_URL=http://127.0.0.1:9005/ node probes/probe-r3-t3-swap-fr-rc.cjs` | **7/7** |
| R3-T8 (Selection Colors tak rusak) | `R3_T8_URL=http://127.0.0.1:9005/ node probes/probe-r3-t8-selsame-full.cjs` (+ `R3_T8_LANG=en`) | **10/10 [id] + 10/10 [en]** |
| Suite unit | `npm test` | **277/277** (pass 277, fail 0) |
| Pageerror | semua run probe di atas | **0** |

## Artefak

- Probe baru: `probes/probe-r3-t10-last-color.cjs` (fase E/F/G/H, env `R3_T10_URL`).
- Backup fix: `src/utils/themeAndPrefsManager.jsx.bak-r3t10`.
- Screenshot bukti Ronde 3 (nama file baru, artefak R2 tidak ditimpa — dikembalikan dari backup):
  - `probes/shots/r3-t10-lastcolor-eviction.png` (strip sesudah eviksi 11× pakai)
  - `probes/shots/r3-t10-lastcolor-before-reload.png` (strip sebelum reload, fase F)
  - `probes/shots/r3-t10-lastcolor-after-reload.png` (strip sesudah reload, fase F)

## Yang belum teruji (jujur)

- Hanya headless Chromium 1255 (bukan Chromium GUI / browser pengguna).
- Hanya tema light, bahasa id (kecuali regresi T8 yang juga dijalankan mode en).
- Kandidat tambahan (h)/(i) tidak ditemukan selama investigasi — tidak ada perbaikan di luar kandidat (e) yang terbukti gagal.
- Eviksi untuk daftar >10 yang masuk lewat jalur selain `loadPrefs` (mis. `setPrefs` langsung di dalam aplikasi) tidak diuji — di dalam aplikasi satu-satunya penulis `recentColors` adalah `rememberRecentColor` yang sudah memangkas di jalur tulis, sehingga jalur itu tertutup oleh E3/E3s.
