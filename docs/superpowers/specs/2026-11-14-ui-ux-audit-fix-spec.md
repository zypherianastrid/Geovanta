# UI/UX Audit Fix — Spec (Vector Editor Geovanta)

> Skill: `ui-ux-fixer-and-improvement` (Phase 2–5). Audit Fase 1 selesai 2026-11-14
> (4 laporan di `docs/superpowers/plans/sdd-2026-11-14-ui-ux-audit/`):
> A layout/geometri, B 8-state, C aksesibilitas/keyboard, D hierarki/token.
> Total temuan: **2 Critical, 19 Important, 14 Minor = 35 temuan**.
> Plan: `docs/superpowers/plans/2026-11-14-ui-ux-audit-fix.md`.

## 1. Before vs After (kontrak)

| Area | Before (terukur audit) | After (target) |
|---|---|---|
| Dark mode workspace | Ikon nav hilang (~1,05:1); teks segmen aktif "Pusat"/"Nonzero" ~1,3:1; thumbnail + badge tetap putih | Semua teks/ikon ≥4,5:1 (teks) / ≥3:1 (ikon) di light DAN dark; 0 permukaan putih sisa di dark |
| Token | Dua set `:root` bertentangan (indigo lama vs M3 hijau); status pakai hex mentah; fallback JS indigo `#312e81` | Satu set `:root` (M3); token semantik `--danger/--warn/--info/--ok`; fallback mengikuti token |
| Cascade | 577 deklarasi `!important` (187 layout/padding); eskalasi pill 03:05 WIB | 0 `!important` layout/padding kecuali pengecualian terdokumentasi (kursor); tidak ada eskalasi baru |
| Nama aksesibel | 16/96 tombol tanpa accessible name; `aria-label="][ "` di field Gap | 0 tombol tanpa nama; semua label bermakna |
| Keyboard | Baris layer tak terjangkau Tab; tool aktif tanpa `aria-pressed`; seleksi hanya warna | Baris layer fokus + panah + Enter/Space; `aria-pressed`/`aria-selected` benar |
| Motion | OS `prefers-reduced-motion` diabaikan (0 `matchMedia`) | Pref OS dihormati (animasi mati bila reduce) |
| Input invalid | Hex salah dibuang diam-diam (commit + keystroke) | Pesan error inline + input dipertahankan + `aria-invalid` |
| Toast | Tanpa aksi; tak terlihat di ≤768 (absolute vs workspace 2896px) | Mendukung aksi (Urungkan sesudah hapus); portal ke body, `position: fixed`, terlihat di semua viewport; `role="status"` |
| Modal | Fokus tidak pindah ke modal (~70 Tab); Recolor inert di dokumen kosong | Fokus masuk modal saat dibuka, trap Tab, kembali ke pemicu saat tutup; empty state eksplisit |
| Loading | Trace jagung: freeze ~766 ms tanpa indikator | Indikator terlihat <100 ms sesudah mulai; main thread tidak terblokir >100 ms per potong |
| Toolbar ≤1024 | 11 tombol tak terlihat di 1024, 12 di 375, tanpa affordance | Semua alat terjangkau (menu "•••" / affordance scroll) — TERGANTUNG keputusan viewport (lihat §5) |
| Inspector ≤768 | 2133 px di bawah lipatan; dokumen tak bisa di-scroll | Drawer/tab ATAU affordance scroll + wheel berfungsi — TERGANTUNG keputusan viewport (lihat §5) |
| Primer | 2 primer hijau di inspector; 2 CTA identik di workspace kosong | 1 primer per tampilan |
| Dialog | Urutan tombol berlawanan antar dialog | Satu konvensi: `[Batal/Tutup | sekunder | primer]` (primer kanan) |
| Tipografi | 7 ukuran (10–16px); judul 11,5/600 vs isi 11/400 | Skala 4 langkah 10/11/12/14; judul 12/600 |
| Spacing | Intra-grup 10px = antar-grup 10px | Intra 8px < antar 14px |
| Dock & thumbnail | Tombol dock 36×34px + elemen 36×16 tanpa tip; judul dokumen panjang terpotong tengah kata di thumbnail | Hit area dock 40×40; semua elemen dock berlabel; judul thumbnail ellipsis |

## 2. Token & tema (keputusan)

- Satu-satunya sumber token: blok `:root` M3 (light + `:root[data-theme="dark"]`). Set `:root`
  lama (indigo, `--acc #4f46e5` + varian dark `--acc #818cf8`) DIHAPUS beserta varian dark-nya.
- Token baru (light + dark, di blok M3): `--danger: #ef4444`, `--warn: #f59e0b`,
  `--info: #3b82f6`, `--ok: #22c55e`.
- Token teks aksen aman kontras: `--acc-ink: #147638` (light — nilai awal `#15803d`
  terukur 4,45:1 di atas tint 12%, gagal tipis; final 5,07:1 tint 12% / 4,75:1 tint 18%)
  / `#4ade80` (dark, 9,54:1 di atas `--card`).
  Dipakai untuk: teks "Clip Frame" aktif, teks segmen aktif.
- `--acc-deep: #15803d` (kedua tema) — latar aktif gelap tema-independen untuk
  `.dk-b.on`/`.tool-btn.on` + ikon putih (5,02:1 kedua tema).
- `--fig-sel-ink` didefinisikan ulang menjadi `var(--acc-ink)` (nilai lama `var(--acc)` =
  `#13b152` hanya ~2,5:1 di atas tint — TIDAK boleh dipakai sebagai warna teks di atas tint).
- Latar aktif segmen: `color-mix(in srgb, var(--acc) 18%, var(--card))` (pola `--fig-sel`);
  teks aktif: `--fig-sel-ink` (bukan inherit `--ink`).
- Permukaan: SELALU `var(--card)` / `var(--sub)` — tidak ada lagi `#ffffff` sebagai
  permukaan hardcoded di lapisan override. Yang sah tetap ada: endpoint mix tint menuju
  putih (`color-mix(..., #ffffff)`) dan teks/ikon putih di atas permukaan aksen/gelap
  (`--on-dark`). Kriteria operatif: grep `#ffffff !important` == 0 sesudah T2 (terpenuhi);
  grep `#ffffff` polos boleh >0 hanya untuk kedua pola sah itu.
- Fallback JS: aksen `'#13b152'` (bukan `'#312e81'`); `SNAP_GUIDE_COLOR` dan `handleColor`
  dipindah ke konstanta bernama yang mengikuti token.
- Gradien `.bar`: aksen saja (tanpa `#a78bfa`).

## 3. Konvensi (keputusan controller — bisa dibantah user)

- **Satu primer per tampilan.** Inspector: "Terapkan" primer HANYA bila ada perubahan
  auto-layout tertunda; bila tidak ada, "Unduh .SVG" primer. Workspace kosong: hanya
  "Create New Project" primer; header "Create New" jadi sekunder saat empty state tampil.
- **Urutan footer dialog:** `[Batal/Tutup | sekunder | primer]` — primer/destruktif di kanan
  (konvensi Windows/web). Berlaku untuk Find & Replace (`[Tutup | Ganti Semua | Ganti]`)
  dan semua dialog baru.
- **Hapus objek/layer:** TANPA dialog konfirmasi (konsisten Figma) — sebagai gantinya toast
  dengan aksi "Urungkan (Ctrl+Z)" (lihat T8).
- **Toast:** portal ke `document.body`, `position: fixed`, `role="status"` + `aria-live="polite"`,
  durasi tetap 2,2 dtk; aksi (bila ada) tidak mencuri fokus; toast baru menggantikan yang lama.
- **Modal:** fokus masuk ke kontrol pertama saat dibuka; Tab trap di dalam modal;
  Esc menutup + fokus kembali ke pemicu.
- **Skala tipografi (beku):** 10 / 11 / 12 / 14 px saja di chrome editor. Judul seksi 12px/600.
  (Konten kanvas/dokumen tidak termasuk.)
- **Spacing inspector:** intra-grup 8px, antar-seksi 14px (padding seksi).

## 4. Matriks 8-state untuk kontrol yang diubah

| Kontrol diubah | Default | Hover | Focus | Active | Loading | Disabled | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| Tombol toolbar (T4) | ✅ | ✅ | ✅ ring 2px | ✅ `.on` + `aria-pressed` | — | ✅ + alasan | — | — |
| Baris layer (T5) | ✅ | ✅ | ✅ ring + `tabIndex` | ✅ `aria-selected` | — | — | ✅ panduan | — |
| Toast + aksi (T8) | ✅ | ✅ aksi hover | ✅ aksi fokus | ✅ aksi klik | — | — | — | — |
| Modal F&R/Recolor (T9, T12) | ✅ | ✅ | ✅ masuk + trap | ✅ | — | ✅ + alasan | ✅ eksplisit | ✅ inline + `aria-invalid` |
| ColorText / field hex (T7) | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ inline, input dipertahankan |
| Swatch Fill/Stroke (T11) | ✅ | ✅ tooltip hex | ✅ | ✅ | — | — | — | — |
| Load dokumen besar (T10) | — | — | — | — | ✅ indikator <100 ms | — | — | — |

## 5. Keputusan yang menunggu user (viewport)

Temuan A1–A3 hanya muncul di ≤1024. Bila produk desktop-only (min. 1280), ketiganya
menjadi "batasan terdokumentasi" (tanpa kode). Bila tablet/phone didukung, T15 dikerjakan
(prioritas A1 → A3 → A2). Keputusan ini TIDAK menghambat T1–T14.

## 6. Yang TIDAK termasuk (di luar scope)

- Perbaikan fungsional yang sudah diketahui (Enter-to-edit, Ctrl+Z saat modal — keputusan
  4B, konversi teks Inter, background blur render-only, guard 4096px).
- Redesign visual / arah estetika baru (bukan target skill ini).
- Performa render kanvas di luar T10 (rasio 3,08×–5,76× tetap dicatat sebagai batasan).
- Screen reader sungguhan (NVDA/VoiceOver) — verifikasi berbasis DOM/ARIA + pengukuran.
