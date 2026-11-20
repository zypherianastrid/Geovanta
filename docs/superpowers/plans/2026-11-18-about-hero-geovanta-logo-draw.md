# Animated Geovanta Logo Drawing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen: Native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti logo Geovanta statis (flat) dan kurva Bézier generik di kartu **Tentang Aplikasi** dengan animasi penggambaran progresif terus-menerus dari **16 subpath asli `LOGO_INNER`** (termasuk 3 titik node kotak pada huruf **G** besar dengan `fill-rule="evenodd"`), lalu menghapus logo flat yang lama.

**Architecture:** `src/components/modals/AboutVectorHeroBg.tsx` mengekspor `AboutAnimatedLogo` (diletakkan di foreground `.stg-about-top` menggantikan logo flat di `SettingsModal.tsx`, dengan `role="img" aria-label="Geovanta"`) dan `AboutVectorHeroBg` (layer latar grid, kompas, heksagon, prisma, bbox, dan cursor smart guides). `AboutAnimatedLogo` memecah `LOGO_INNER` menjadi 8 grup huruf berurutan (`G, e, o, v, a1, n, t, a2`) — dengan **G** berisi 5 subpath asli (kontur utama + 3 lubang node kotak + notch) — lalu menggerakkan ujung pena + stroke bercahaya + fill reveal per huruf dalam loop GSAP kontinu tanpa jeda.

**Tech Stack:** React 18 TSX, GSAP, inline SVG (`LOGO_INNER`), Playwright Regular (`@playwright/test`), Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-11-18-about-hero-geovanta-logo-draw-design.md`

## Global Constraints
- Hanya menggunakan **Playwright Regular** (`npx playwright test`) untuk semua pengujian otomatis dan **Playwright MCP** untuk verifikasi visual langsung.
- Geometri huruf **G** (termasuk 3 lubang node kotak di atas, kiri, bawah + notch) dan seluruh huruf `e o v a n t a` wajib 100% berasal dari `LOGO_INNER` dengan `fill-rule="evenodd"`.
- Hanya ada tepat 1 logo `svg[aria-label="Geovanta"]` di `.stg-about-hero` (logo flat lama terhapus), dan badge `v1.0` tetap rapi di bawahnya.
- Mematuhi `Animasi Antarmuka: Mati`, `prefers-reduced-motion: reduce`, pause/resume tab Pengaturan, sinkronisasi `--acc`, tema gelap/terang, dan nol console error.

## Review Focus
- **Presisi 3 node kotak huruf G:** Seluruh 5 subpath huruf **G** (`sub[0], sub[1], sub[2], sub[10], sub[11]`) dirender dalam satu compound `<path fill-rule="evenodd">` untuk fill, dan kelima subpath digambar oleh ujung pena pada fase **G** agar 3 lubang kotak terlihat tajam tanpa tertutup.
- **Tanpa logo dobel & tanpa scrim washout:** `.stg-about-logo` flat lama dihapus di `SettingsModal.tsx`; `AboutAnimatedLogo` dirender di `.stg-about-top` (`z-index: 2`) di atas `.stg-about-scrim`.
- **Gerak kontinu tanpa berhenti & tanpa frame kosong:** Sepanjang siklus penuh `> 10 dtk`, ujung pena & progress stroke selalu bergerak di setiap interval sampel (nol fase diam), blueprint wireframe selalu terlihat, dan warna fill huruf menyala penuh lalu memudar halus ke tint blueprint (bukan hilang total).
- **Mode `reduced` = identik logo flat:** Saat `Animasi Antarmuka: Mati`, semua 8 huruf Geovanta memiliki `fillOpacity === 1` (`fill-rule="evenodd"`), `strokeDashoffset === 0`, dan tidak bergerak seiring waktu.
- **Cursor hover & pause tab:** `AboutVectorHeroBg` tetap menggerakkan smart guides, magnetic ring, dan parallax saat hover di kartu, serta pause/resume seluruh animasi saat berpindah tab Pengaturan.

---

### Task 1: Exact `LOGO_INNER` 8-Letter Progressive Continuous Draw + Remove Flat Logo + Playwright Verification

**Files:**
- Modify: `src/components/modals/AboutVectorHeroBg.tsx`
- Modify: `src/components/modals/SettingsModal.tsx:7,158-172`
- Test: `tests/about-hero-live-bg.spec.ts`

**Interfaces:**
- Consumes: `LOGO_INNER` dari `src/constants/brandAndIcons.tsx`
- Produces: `AboutVectorHeroBg`, `AboutAnimatedLogo`, `extractGeovantaLogoLetters()` dari `src/components/modals/AboutVectorHeroBg.tsx`

- [ ] **Step 1: Update & add failing Playwright tests in `tests/about-hero-live-bg.spec.ts`**

Pastikan tes memverifikasi:
1. Tepat 1 `svg[aria-label="Geovanta"]` (logo flat terhapus, digantikan logo animasi di `.stg-about-top`), dengan 8 huruf (`data-testid="about-logo-letter"`), total 16 subpath persis dari `LOGO_INNER`, dan huruf `G` (`data-letter="G"`) memiliki 5 subpath + `fill-rule="evenodd"` (mencakup 3 lubang node kotak).
2. `Task 4`: sampling kontinu melintasi siklus penuh (`> 10 detik`) membuktikan ujung pena + animasi terus bergerak tanpa fase diam (`stalledIntervals === 0`), wireframe & logo selalu tampak, dan toggle `running ↔ reduced` menampilkan semua 8 huruf terisi penuh (`fillOpacity >= 0.99`) saat `reduced`.
3. Semua kontrak lama tetap hijau: 4 layer, z-order scrim, badge `v1.0` di bawah logo, sinkronisasi `--acc`, tema gelap/terang, hover parallax/smart guides/magnetic ring, pause/resume tab, dan 0 console errors.

- [ ] **Step 2: Run Playwright test to verify RED**

Run: `npx playwright test tests/about-hero-live-bg.spec.ts`
Expected: FAIL karena `data-testid="about-logo-letter"` belum ada dan logo flat lama masih dirender.

- [ ] **Step 3: Implement `extractGeovantaLogoLetters`, `AboutAnimatedLogo`, updated `AboutVectorHeroBg`, and remove flat logo in `SettingsModal.tsx`**

- Di `AboutVectorHeroBg.tsx`:
  - Parse `LOGO_INNER` (`d="..."`) sekali menjadi 16 subpath terurut ke 8 grup huruf:
    - `G`: `[0, 1, 2, 10, 11]` (kontur utama + node atas + notch + node kiri + node bawah)
    - `e`: `[3, 7]`, `o`: `[4, 8]`, `v`: `[6]`, `a1`: `[5, 9]`, `n`: `[14]`, `t`: `[12]`, `a2`: `[13, 15]`.
  - Buat komponen `AboutAnimatedLogo` (`role="img" aria-label="Geovanta"`, `viewBox="125 162 1805 420"`, `shapeRendering="geometricPrecision"`, ukuran proporsional di `.stg-about-logo`):
    - Blueprint wireframe tipis semua 16 subpath (`strokeOpacity: 0.22`).
    - Fill `fill-rule="evenodd"` per huruf (`data-testid="about-logo-letter"`, `data-letter="G|e|o|v|a1|n|t|a2"`, `fill="var(--acc)"`) yang menyala halus `0.12 → 1` begitu pena menyelesaikan huruf tersebut.
    - Stroke aktif per subpath (`data-testid="about-bezier-path"` pada path utama `G`) + glow halo lembut yang digambar tepat mengikuti ujung pena (`data-testid="about-pen-nib"`).
    - Titik anchor node (`data-testid="about-anchor-node"`) pada 3 node kotak huruf **G** + titik kunci huruf + 2 handle tangen (`data-testid="about-tangent-handle"`) pada lengkung **G** dan **e/o** yang berayun halus.
    - Timeline GSAP kontinu (`duration: 9.2s`, `repeat: -1`, `repeatDelay: 0`, `ease: 'none'`):
      - Fase `0 → 0.76`: pena menelusuri ke-16 subpath secara berurutan (**G** termasuk 3 node kotaknya → **e → o → v → a → n → t → a**) proporsional terhadap panjang path asli; setiap huruf mengisi penuh (`fillOpacity: 1`) saat selesai digambar.
      - Fase `0.76 → 1.00`: logo penuh tampil sekejap sambil pena meluncur mulus dalam busur Bézier kembali ke titik awal **G**, sementara gelombang kiri→kanan menurunkan `fillOpacity` perlahan ke `0.14` (blueprint tint — tidak pernah hilang kosong) dan mereset dash tepat sebelum pena tiba di **G** untuk langsung menggambar ulang tanpa henti.
    - Mode `reduced`: semua 8 huruf `fillOpacity = 1`, `strokeDashoffset = 0`, pena berhenti rapi, nol gerak.
    - Mode `paused`: pause semua tween/timeline dengan bersih.
  - Di `AboutVectorHeroBg`: pertahankan Layer 1 (grid & glow), Layer 2 (kompas, heksagon, prisma, mini bbox), dan Layer 4 (cursor parallax, smart guides, magnetic ring yang mengarah ke titik-titik geometri kanan) dengan data-testid lengkap, tanpa kurva Bézier generik yang menumpuk.
- Di `SettingsModal.tsx`:
  - Hapus `<svg ... dangerouslySetInnerHTML={{ __html: LOGO_INNER }} />` yang flat di `.stg-about-logo` dan ganti dengan `<AboutAnimatedLogo active={open && sTab === 'umum'} motionPref={prefs && prefs.motion} />`.

- [ ] **Step 4: Build offline bundle & run Playwright test suite to verify GREEN**

Run: `npm run build:web` lalu `npx playwright test tests/about-hero-live-bg.spec.ts tests/typescript-strictness.spec.ts`
Expected: Build exit 0, semua tes PASS, `tsc --noEmit` 0 error.

- [ ] **Step 5: Live visual inspection via Playwright MCP**

Ambil tangkapan layar pada fase menggambar huruf **G** (cek 3 node kotak), fase logo terisi penuh, dan mode `Animasi Antarmuka: Mati` (reduced) untuk memastikan 100% identik dengan logo asli Geovanta.
