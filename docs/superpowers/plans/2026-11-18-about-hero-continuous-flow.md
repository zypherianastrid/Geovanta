# Continuous Flow Motion Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah animasi latar belakang kartu **Tentang Aplikasi** (`AboutVectorHeroBg.tsx`) dari siklus berhenti-fade-ulang menjadi aliran berkelanjutan (*Continuous Flow*) tanpa jeda, tanpa fade-out kosong, dan tanpa lompatan di sambungan loop.

**Architecture:** Lintasan `HERO_BEZIER_D` dibentuk sebagai kurva Bézier tertutup C¹ halus di sisi kanan kartu (`720×180`). Sebuah tween GSAP linear permanen (`repeat: -1`, `repeatDelay: 0`, `ease: 'none'`) menggerakkan ujung pena dan ekor stroke (`strokeDasharray` + `strokeDashoffset` dengan *wrap-around*) tanpa henti, sementara anchor node berdenyut saat dilintasi pena dan kedua handle tangen berayun kontinu. Mode `reduced` tetap membekukan kurva penuh (`strokeDashoffset: 0`) dan menonaktifkan efek kursor.

**Tech Stack:** React 18 TSX, GSAP, inline SVG, Playwright Regular (`@playwright/test`), Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-11-18-about-hero-continuous-flow-design.md`

## Global Constraints
- Hanya menggunakan **Playwright Regular** (`npx playwright test`) untuk semua pengujian otomatis dan **Playwright MCP** untuk inspeksi visual/browser langsung.
- Tidak mengubah tata letak logo Geovanta, badge versi `v1.0`, scrim keterbacaan, sinkronisasi warna aksen `--acc`, atau tema gelap/terang.
- Tetap mematuhi `Animasi Antarmuka: Mati` (`html[data-motion="off"]`), `prefers-reduced-motion: reduce`, dan pause otomatis saat pindah tab Pengaturan / tab dokumen tersembunyi.
- Nol kebocoran tween GSAP dan nol console error saat buka/tutup modal Pengaturan berulang.

## Review Focus
- **Transisi loop `progress 1 → 0`:** Tidak boleh ada loncatan posisi/sudut ujung pena maupun kedipan stroke saat melewati batas siklus (diuji dengan sampling berkala melintasi durasi penuh siklus `> 7.5s` / akselerasi waktu).
- **Zero idle hold & zero fade-out:** Sepanjang siklus berjalan, `strokeDashoffset` & `penNib` selalu bergerak maju pada setiap interval sampel dan `opacity` pena + kurva tidak pernah turun ke `0`.
- **Switch `running ↔ reduced`:** Beralih ke `Mati` langsung menampilkan kurva penuh (`strokeDasharray = totalLen`, `strokeDashoffset = 0`) tanpa celah ekor, dan kembali ke `Aktif` memulihkan mode aliran ekor kontinu.
- **Pause saat pindah tab:** Beralih ke tab Pintasan benar-benar menghentikan perubahan `strokeDashoffset` dan posisi pena, lalu melanjutkan mulus saat kembali ke tab Umum.
- **Cursor hover & magnetic node:** Pergerakan kursor tetap menarik node terdekat dari 4 `ANCHOR_NODES` baru dan kembali netral saat kursor keluar.

---

### Task 1: Continuous Flow Bézier Loop, Perpetual Pen/Handles Choreography, and Playwright Verification

**Files:**
- Modify: `src/components/modals/AboutVectorHeroBg.tsx:18-366,760-878`
- Test: `tests/about-hero-live-bg.spec.ts`

**Interfaces:**
- Consumes: `AboutVectorHeroBgProps` (`{ active: boolean; motionPref?: string; containerRef: React.RefObject<HTMLDivElement | null> }`)
- Produces: `AboutVectorHeroBg`, `SHOWCASE_TIME` (tetap diekspor dengan kontrak prop & `data-testid` yang sama)

- [ ] **Step 1: Write failing Playwright test for continuous non-stop flow**

Tambahkan tes `Task 4: continuous flow never stops, never fades out, and stays smooth across full cycle boundary` di `tests/about-hero-live-bg.spec.ts` yang mengambil sampel berurutan setiap `~450ms` selama rentang `> 8 detik` (melintasi seluruh durasi siklus lama `7.65s` dan siklus baru `7.2s`) dan memastikan:
- Setiap pasangan sampel berurutan menunjukkan perubahan `strokeDashoffset` atau `nibTransform` (nol fase diam).
- `opacity` dari `[data-testid="about-bezier-path"]` dan `[data-testid="about-pen-nib"]` selalu `>= 0.9` di setiap sampel (nol fade-out).
- Transisi `running -> reduced -> running` memulihkan kurva penuh (`offset < 20`) saat `reduced` dan aliran kontinu saat kembali `running`.

- [ ] **Step 2: Run Playwright test to verify RED**

Run: `npx playwright test tests/about-hero-live-bg.spec.ts`
Expected: FAIL pada `Task 4` (karena timeline lama diam antara `3.75s–6.4s` dan fade-out ke `opacity: 0` di `6.4s–7.25s`).

- [ ] **Step 3: Implement Continuous Flow choreography in `src/components/modals/AboutVectorHeroBg.tsx`**

- Perbarui `HERO_BEZIER_D` menjadi kurva Bézier tertutup C¹ halus:
  `M 312 92 C 312 50, 368 38, 424 38 C 480 38, 626 44, 626 86 C 626 128, 570 142, 514 142 C 458 142, 312 134, 312 92 Z`
- Perbarui `ANCHOR_NODES` ke 4 knot loop:
  `[{ x: 312, y: 92, t: 0 }, { x: 424, y: 38, t: 0.25 }, { x: 626, y: 86, t: 0.50 }, { x: 514, y: 142, t: 0.75 }]`
- Selaraskan koordinat `handle1Ref` di knot `(424, 38)` (`svgOrigin: '424 38'`) dan `handle2Ref` di knot `(514, 142)` (`svgOrigin: '514 142'`), serta `pulseRingRef` mengikuti knot terdekat atau berdenyut lembut saat pena melintas.
- Ganti timeline fade-out/repeatDelay menjadi aliran kontinu:
  - `tailLen = totalLen * 0.54`, `gapLen = totalLen - tailLen`.
  - Mode `running`: `strokeDasharray = "${tailLen} ${gapLen}"`; `tl` menjalankan tween `drawState.progress: 0 → 1` (`duration: 7.2`, `ease: 'none'`, `repeat: -1`, tanpa `repeatDelay`) dengan `syncPenToProgress` menghitung `dist = p * totalLen`, `strokeDashoffset = tailLen - dist`, sudut pena dengan *wrap-around* `(dist ± 2 + totalLen) % totalLen`, dan denyut skala halus pada tiap anchor node saat jarak fase melingkar terhadap `node.t` kecil.
  - Kedua handle tangen berayun permanen (`rotation: ±7`, `repeat: -1`, `yoyo: true`, `ease: 'sine.inOut'`) dalam `ambientTweens`.
  - Mode `reduced`: set `strokeDasharray = String(totalLen)`, `strokeDashoffset = '0'`, posisikan pena di `SHOWCASE_TIME`, seluruh node/handle `scale: 1, opacity: 1`, pause semua tween.
  - Saat berpindah `reduced → running`: pulihkan `strokeDasharray = "${tailLen} ${gapLen}"` sebelum `play()`.

- [ ] **Step 4: Build offline bundle & run Playwright test suite to verify GREEN**

Run: `npm run build:web` lalu `npx playwright test tests/about-hero-live-bg.spec.ts tests/typescript-strictness.spec.ts`
Expected: Build exit 0, semua tes (Task 1, 2, 3a, 3b, 3c, 4, dan `tsc --noEmit`) PASS.

- [ ] **Step 5: Live visual inspection via Playwright MCP**

Buka Pengaturan → Tentang Aplikasi melalui Playwright MCP dan verifikasi secara visual bahwa lintasan tertutup, aliran pena/ekor garis, keterbacaan logo Geovanta + `v1.0`, dan mode gelap/terang tampil halus tanpa jeda.
