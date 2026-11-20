# About Hero Live Vector Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the "Tentang Aplikasi" (`.stg-about-hero`) background inside `SettingsModal.tsx` into a live, vector-editor-themed background powered by GSAP and layered precision SVG featuring geometry, shapes, Pen Tool Bézier choreography, and subtle cursor interaction.

**Architecture:** Install `gsap` in the 100% offline `esbuild` bundle and create a dedicated `<AboutVectorHeroBg />` component mounted inside `.stg-about-hero` at `z-index: 0` beneath a left-side readability scrim (`z-index: 1`) and existing logo/badge/pill content (`z-index: 2`). All strokes/fills reference Geovanta CSS variables (`--acc`, `--card`, `--line`, `--ink`) for zero-rerender live accent & theme synchronization, while a `gsap.timeline()` drives sequential Pen Tool Bézier drawing and `gsap.quickTo()` drives clamped cursor parallax, hairline smart guides, and magnetic node response.

**Tech Stack:** React 18.3.1, TypeScript, GSAP (`gsap`), Layered SVG (`shapeRendering="geometricPrecision"`), Offline Tailwind AST (`src/vendor/tailwindOfflineBundle.tsx`), `esbuild` offline bundle, Playwright (`@playwright/test`) & Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-11-18-about-hero-live-vector-bg-design.md`

---

## Global Constraints

- **100% Offline Bundle (`esbuild` -> `geovanta.bundle.js`):** `gsap` must be installed in `package.json` and bundled via `npm run build:web` with zero external CDN or network fetches.
- **CSP (`index.html`):** `style-src 'self' 'unsafe-inline'`; no external scripts, fonts, or images.
- **Styling System:** `.stg-about-hero` and companion classes live in `TAILWIND_PLUGIN_AST` inside `src/vendor/tailwindOfflineBundle.tsx` and use CSS variables (`--acc`, `--card`, `--line`, `--ink`, `--mut`).
- **Motion Policy:** Respect `html[data-motion="off"]` (set by `prefs.motion === 'off'` or OS `prefers-reduced-motion: reduce`), pausing at the peak showcase pose instead of blanking out.
- **Preserved Content:** Keep the existing Geovanta SVG logo (`LOGO_INNER`), version badge, and 3 feature pills intact and fully legible in Light and Dark themes.
- **Mandatory Testing & Browser Tooling:** All automated tests use `@playwright/test` (`npx playwright test`) and all live browser inspection uses Playwright MCP exclusively.
- **Repository Note:** Workspace is not a git repository; each task ends with `npm run typecheck`, `npm run build:web`, and `npx playwright test` verification instead of `git commit`.

## Review Focus

1. **OS `prefers-reduced-motion: reduce` overriding manual `motion: 'on'`:** Component must observe `document.documentElement`'s `data-motion` attribute (not only `prefs.motion`) so reduced motion immediately freezes the GSAP timeline at the showcase frame and disables pointer effects. *(Tested in Task 3)*
2. **Repeated tab switches (`Umum` ↔ `Pintasan`) and modal open/close cycles:** Pausing while inactive and reverting `gsap.context()` on unmount must prevent duplicate timelines, leaked listeners, or console errors. *(Tested in Task 3)*
3. **Live accent color preview (`previewAccent`) & Light/Dark theme switch while modal stays open:** Live `--acc` mutations (before React state commits) and `data-theme` switches must immediately recolor the SVG layers without remounting or resetting the animation. *(Tested in Task 1)*
4. **Fast pointer entry, edge clamping, and pointer leave (plus pointer movement when `data-motion="off"`):** Parallax stays clamped within ±6–10px, smart guides fade to `opacity: 0` on `pointerleave`, and zero cursor effects activate when `data-motion="off"`. *(Tested in Task 2)*
5. **Logo & pill legibility/stacking across themes and narrow viewports:** `.stg-about-bg` remains `pointer-events: none; z-index: 0` beneath `.stg-about-scrim` (`z-index: 1`) and `.stg-about-top` / `.stg-about-badges` (`z-index: 2`), preserving full visibility and clickability. *(Tested in Task 1)*

---

## File Structure

- **Modify:** `package.json` (and `package-lock.json`) — add `gsap` to `dependencies`.
- **Create:** `src/components/modals/AboutVectorHeroBg.tsx` — `<AboutVectorHeroBg />` SVG stage, GSAP Pen Tool + Bézier + geometry choreography, `gsap.quickTo()` cursor parallax/smart-guide/magnetic-node logic, and motion/visibility lifecycle management.
- **Modify:** `src/components/modals/SettingsModal.tsx:1-35,156-171` — hold `aboutHeroRef` on `.stg-about-hero` and render `<AboutVectorHeroBg />` alongside existing `.stg-about-top` and `.stg-about-badges`.
- **Modify:** `src/vendor/tailwindOfflineBundle.tsx:438` — update `.stg-about-hero`, `.stg-about-top`, `.stg-about-badges` rules in `TAILWIND_PLUGIN_AST` and add `.stg-about-bg` and `.stg-about-scrim` rules (`min-height: 162px`, z-index layering, readability scrim).
- **Create:** `tests/about-hero-live-bg.spec.ts` — Playwright E2E test suite verifying visual layers, live motion, accent/theme sync, cursor interaction, motion policy, and lifecycle resilience.

---

### Task 1: Install `gsap`, Style `.stg-about-hero`, and Build `<AboutVectorHeroBg />` Ambient Vector Stage

**Files:**
- Modify: `package.json`
- Create: `src/components/modals/AboutVectorHeroBg.tsx`
- Modify: `src/components/modals/SettingsModal.tsx:1-35,156-171`
- Modify: `src/vendor/tailwindOfflineBundle.tsx:438`
- Test: `tests/about-hero-live-bg.spec.ts`

**Interfaces:**
- Consumes: CSS variables `--acc`, `--card`, `--line`, `--ink` from Geovanta root styles; `open`, `sTab`, `prefs.motion` from `SettingsModal`.
- Produces:
  - `export interface AboutVectorHeroBgProps { active: boolean; motionPref?: string; containerRef: React.RefObject<HTMLDivElement | null>; }`
  - `export const AboutVectorHeroBg: React.FC<AboutVectorHeroBgProps>`
  - DOM hooks for tests & later tasks:
    - `[data-testid="about-hero-bg"]` (root `<div className="stg-about-bg" aria-hidden="true">`, exposes `data-motion-state="running" | "paused" | "reduced"`)
    - `[data-testid="about-hero-svg"]` (`<svg viewBox="0 0 720 180" preserveAspectRatio="xMidYMid slice" shapeRendering="geometricPrecision">`)
    - `[data-testid="about-layer-grid"]`, `[data-testid="about-layer-geometry"]`, `[data-testid="about-layer-bezier"]`, `[data-testid="about-layer-guides"]`
    - `[data-testid="about-bezier-path"]`, `[data-testid="about-pen-nib"]`, `[data-testid="about-anchor-node"]` (≥3 nodes), `[data-testid="about-tangent-handle"]` (≥2 handles), `[data-testid="about-bbox"]`

- [ ] **Step 1: Write failing Playwright tests for Task 1 (stage layers, live motion, stacking, live accent & theme sync)**

Create `tests/about-hero-live-bg.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test';
import path from 'path';

async function openSettingsGeneral(page: Page) {
  const htmlPath = path.resolve('web/index.html');
  await page.goto(`file://${htmlPath}`);
  const settingsBtn = page.locator('button[data-tip="settings"]').first();
  await settingsBtn.waitFor({ state: 'visible', timeout: 10000 });
  await settingsBtn.click();
  const hero = page.locator('.stg-about-hero');
  await hero.waitFor({ state: 'visible', timeout: 5000 });
  await hero.scrollIntoViewIfNeeded();
  return hero;
}

test('Task 1: renders 4 precision SVG layers, animates live Pen/Bezier choreography, preserves readability stacking, and syncs live accent/theme', async ({ page }) => {
  const hero = await openSettingsGeneral(page);

  // Card breathing room & stacking
  const box = await hero.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(156);

  const bg = hero.locator('[data-testid="about-hero-bg"]');
  await expect(bg).toBeVisible();
  await expect(bg).toHaveAttribute('aria-hidden', 'true');
  await expect(bg).toHaveAttribute('data-motion-state', 'running');
  await expect(bg).toHaveCSS('pointer-events', 'none');

  // All 4 layers + vector editor elements exist
  await expect(hero.locator('[data-testid="about-layer-grid"]')).toBeAttached();
  await expect(hero.locator('[data-testid="about-layer-geometry"]')).toBeAttached();
  await expect(hero.locator('[data-testid="about-layer-bezier"]')).toBeAttached();
  await expect(hero.locator('[data-testid="about-layer-guides"]')).toBeAttached();
  await expect(hero.locator('[data-testid="about-bezier-path"]')).toBeAttached();
  await expect(hero.locator('[data-testid="about-pen-nib"]')).toBeAttached();
  await expect(hero.locator('[data-testid="about-bbox"]')).toBeAttached();
  expect(await hero.locator('[data-testid="about-anchor-node"]').count()).toBeGreaterThanOrEqual(3);
  expect(await hero.locator('[data-testid="about-tangent-handle"]').count()).toBeGreaterThanOrEqual(2);

  // Foreground content sits above background & scrim
  const zOrder = await hero.evaluate((el) => {
    const bgZ = Number(getComputedStyle(el.querySelector('.stg-about-bg')!).zIndex) || 0;
    const scrimZ = Number(getComputedStyle(el.querySelector('.stg-about-scrim')!).zIndex) || 0;
    const topZ = Number(getComputedStyle(el.querySelector('.stg-about-top')!).zIndex) || 0;
    const badgesZ = Number(getComputedStyle(el.querySelector('.stg-about-badges')!).zIndex) || 0;
    return { bgZ, scrimZ, topZ, badgesZ };
  });
  expect(zOrder.scrimZ).toBeGreaterThan(zOrder.bgZ);
  expect(zOrder.topZ).toBeGreaterThan(zOrder.scrimZ);
  expect(zOrder.badgesZ).toBeGreaterThan(zOrder.scrimZ);
  await expect(hero.locator('svg[aria-label="Geovanta"]')).toBeVisible();
  expect(await hero.locator('.stg-about-pill').count()).toBe(3);

  // Live animation progresses over time (pen transform or strokeDashoffset changes)
  const sampleMotion = () => hero.evaluate((el) => {
    const p = el.querySelector('[data-testid="about-bezier-path"]') as SVGPathElement;
    const nib = el.querySelector('[data-testid="about-pen-nib"]') as SVGGElement;
    return {
      offset: getComputedStyle(p).strokeDashoffset,
      nibTransform: nib.getAttribute('transform') || getComputedStyle(nib).transform
    };
  });
  const t0 = await sampleMotion();
  await page.waitForTimeout(450);
  const t1 = await sampleMotion();
  expect(t1.offset !== t0.offset || t1.nibTransform !== t0.nibTransform).toBe(true);

  // Live accent preview (CSS variable mutation on :root) recolors SVG stroke immediately
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--acc', '#f43f5e');
  });
  const strokeAfterAccent = await hero.locator('[data-testid="about-bezier-path"]').evaluate(
    (el) => getComputedStyle(el).stroke
  );
  expect(strokeAfterAccent).toBe('rgb(244, 63, 94)');

  // Dark/Light theme switch updates card surface without crashing or hiding content
  await page.locator('.stg-row[data-tip="setTheme"] button', { hasText: /Gelap|Dark/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(hero.locator('svg[aria-label="Geovanta"]')).toBeVisible();
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/about-hero-live-bg.spec.ts`
Expected: FAIL (`[data-testid="about-hero-bg"]` not found / card height < 156).

- [ ] **Step 3: Install `gsap` in `package.json`**

Run: `npm install gsap`
Verify `gsap` appears in `package.json` `dependencies` and `node_modules/gsap` exists.

- [ ] **Step 4: Update `.stg-about-hero` and add `.stg-about-bg` / `.stg-about-scrim` styles in `src/vendor/tailwindOfflineBundle.tsx`**

Update the JSON entries in `TAILWIND_PLUGIN_AST` inside `src/vendor/tailwindOfflineBundle.tsx` (using a small node script or targeted edit to avoid JSON corruption):
- `.stg-about-hero`: add `["min-height", "162px"]`, `["justify-content", "space-between"]`, keep `position: relative`, `overflow: hidden`, `border-radius: 18px`, `padding: 24px 22px`, refine base background gradient to a clean atmospheric `--card` + subtle `--acc` glow so the SVG layers shine cleanly in both Light and Dark themes.
- Remove or dial down `.stg-about-hero::before` (since Layer 1 in `<AboutVectorHeroBg />` renders the precision drafting grid + registration ticks cleanly inside the SVG stage).
- Add `.stg-about-bg`: `position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;`
- Add `.stg-about-scrim`: `position: absolute; inset: 0; z-index: 1; pointer-events: none;` with a soft left-to-right gradient (`linear-gradient(95deg, color-mix(in srgb, var(--card) 82%, transparent) 0%, color-mix(in srgb, var(--card) 48%, transparent) 46%, transparent 78%)`) so the Geovanta logo on the left stays razor sharp in both Light and Dark modes.
- Update `.stg-about-top` and `.stg-about-badges`: set `z-index: 2`.

- [ ] **Step 5: Implement `<AboutVectorHeroBg />` ambient 4-layer SVG and GSAP timeline in `src/components/modals/AboutVectorHeroBg.tsx`**

Implement `AboutVectorHeroBg({ active, motionPref, containerRef }: AboutVectorHeroBgProps)` with:
- Root `<div className="stg-about-bg" aria-hidden="true" data-testid="about-hero-bg" data-motion-state={motionState}>` containing `<svg data-testid="about-hero-svg" viewBox="0 0 720 180" preserveAspectRatio="xMidYMid slice" shapeRendering="geometricPrecision" width="100%" height="100%">`.
- **Layer 1 (`about-layer-grid`):** `<defs>` radial ambient glow (`var(--acc)`), SVG `<pattern>` 24×24 drafting grid (`stroke="var(--acc)"` at subtle opacity ~0.10) masked smoothly toward the right/center-right, plus crisp `+` registration crosshairs at key grid intersections.
- **Layer 2 (`about-layer-geometry`):** Wireframe vector primitives positioned primarily across center-right to right (`x: 340..700`):
  - Rotating subtle hexagon/polygon wireframe (`stroke="var(--acc)"` dashed/thin),
  - Concentric construction circle + angle tick arc (`stroke="var(--line)"` / `var(--acc)`),
  - Mini selected vector shape inside a **bounding box** (`data-testid="about-bbox"`) with dashed outline, 4 square corner resize handles, and top rotation stem + knob.
  - Gentle continuous ambient drift/rotation via GSAP tweens (`repeat: -1, yoyo: true` / slow rotation).
- **Layer 3 (`about-layer-bezier`):** Hero cubic Bézier curve (`data-testid="about-bezier-path"`, e.g. graceful S-curve spanning `x: 300..665`, `y: 28..154`) drawn progressively with GSAP:
  - Use `path.getTotalLength()` and a single progress tween `{ t: 0 -> 1 }` so on every frame (`onUpdate`), `strokeDashoffset` reveals the curve AND `path.getPointAtLength(t * totalLen)` positions the **Pen Tool nib** (`data-testid="about-pen-nib"`) plus tangent angle right at the drawing tip!
  - Sequentially pop in 3+ **anchor nodes** (`data-testid="about-anchor-node"`, crisp 6×6 squares with `fill="var(--card)"`, `stroke="var(--acc)"`) as the pen passes each knot.
  - Extend and gently rock 2+ **tangent handles** (`data-testid="about-tangent-handle"`, hairline stem + round end knob) to evoke live Bézier handle sculpting.
  - Hold at the peak showcase pose (~1.8s), pulse a subtle dimension/selection highlight, then gently fade/reset for a smooth ~8s loop.
- **Layer 4 (`about-layer-guides`):** Empty/hidden crosshair smart-guide lines (`data-testid="about-guide-h"`, `data-testid="about-guide-v"`, `data-testid="about-guide-reticle"`) ready for Task 2 cursor tracking (`opacity: 0` at rest).
- Manage GSAP instances inside `gsap.context(() => { ... }, rootRef)` and clean up via `ctx.revert()` on unmount.

- [ ] **Step 6: Mount `<AboutVectorHeroBg />` and `.stg-about-scrim` inside `src/components/modals/SettingsModal.tsx`**

Add `useRef<HTMLDivElement | null>(null)` (`aboutHeroRef`) in `SettingsModal.tsx`, import `AboutVectorHeroBg`, attach `ref={aboutHeroRef}` to `<div className="stg-about-hero">`, and render:
```tsx
<AboutVectorHeroBg active={open && sTab === 'umum'} motionPref={prefs && prefs.motion} containerRef={aboutHeroRef} />
<div className="stg-about-scrim" aria-hidden="true" />
```
before `.stg-about-top` and `.stg-about-badges`.

- [ ] **Step 7: Typecheck, rebuild offline bundle, and run Playwright test**

Run:
1. `npm run typecheck` -> Expected: exit 0
2. `npm run build:web` -> Expected: `[Geovanta Build] Aset offline CanvasKit GPU/CPU siap di dist/ dan web/.`
3. `npx playwright test tests/about-hero-live-bg.spec.ts` -> Expected: PASS (1 passed)

---

### Task 2: Add Subtle Cursor Interaction (`gsap.quickTo` Parallax, Smart Guides, & Magnetic Nodes)

**Files:**
- Modify: `src/components/modals/AboutVectorHeroBg.tsx`
- Test: `tests/about-hero-live-bg.spec.ts`

**Interfaces:**
- Consumes: `containerRef`, `about-layer-geometry`, `about-layer-bezier`, `about-layer-guides`, and `about-anchor-node` elements from Task 1.
- Produces:
  - DOM hooks inside `about-layer-guides`:
    - `[data-testid="about-guide-h"]` (horizontal hairline smart guide)
    - `[data-testid="about-guide-v"]` (vertical hairline smart guide)
    - `[data-testid="about-guide-reticle"]` (small coordinate reticle + subtle glow circle at pointer SVG coordinates)
    - `[data-testid="about-magnetic-ring"]` (halo ring highlighting the nearest decorative/anchor node within magnetic radius)
  - Behavior:
    - Pointer move inside `.stg-about-hero` (when active & motion enabled):
      - Shifts `about-layer-geometry` up to ±6px and `about-layer-bezier` up to ±9px via `gsap.quickTo(..., { duration: 0.45, ease: 'power3.out' })`.
      - Moves hairline smart guides (`x1/x2/y1/y2` or `x`/`y` transforms) and reticle smoothly to pointer SVG coords (`0..720`, `0..180`), clamping strictly inside viewBox bounds.
      - Finds nearest decorative/anchor node within radius (e.g. `110` SVG units), pulls its wrapper magnetically up to ±5px toward cursor and reveals `about-magnetic-ring` around it.
    - Pointer leave resets parallax offsets and magnetic pulls smoothly to `0`, and fades `about-layer-guides` + `about-magnetic-ring` to `opacity: 0`.

- [ ] **Step 1: Add failing Playwright test for Task 2 (cursor parallax, smart guides, magnetic node, pointer leave reset, and disabled when motion off)**

Append to `tests/about-hero-live-bg.spec.ts`:

```typescript
test('Task 2: cursor hover drives clamped parallax, smart guides, and magnetic node feedback, resetting on leave', async ({ page }) => {
  const hero = await openSettingsGeneral(page);
  const box = (await hero.boundingBox())!;

  // Initially guides are hidden
  const guides = hero.locator('[data-testid="about-layer-guides"]');
  expect(Number(await guides.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.05);

  // Move pointer across the right side of the card (near geometry & bezier nodes)
  await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.45);
  await page.waitForTimeout(350);

  const hoverState = await hero.evaluate((el) => {
    const guidesEl = el.querySelector('[data-testid="about-layer-guides"]') as SVGGElement;
    const geoEl = el.querySelector('[data-testid="about-layer-geometry"]') as SVGGElement;
    const bezEl = el.querySelector('[data-testid="about-layer-bezier"]') as SVGGElement;
    const parseTx = (node: Element) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
      return { x: m.m41, y: m.m42 };
    };
    return {
      guidesOpacity: Number(getComputedStyle(guidesEl).opacity),
      geo: parseTx(geoEl),
      bez: parseTx(bezEl)
    };
  });

  expect(hoverState.guidesOpacity).toBeGreaterThan(0.2);
  expect(Math.abs(hoverState.geo.x) + Math.abs(hoverState.geo.y)).toBeGreaterThan(0.3);
  expect(Math.abs(hoverState.geo.x)).toBeLessThanOrEqual(10.5);
  expect(Math.abs(hoverState.bez.x)).toBeLessThanOrEqual(10.5);

  // Move pointer outside card -> guides fade out and parallax returns near neutral
  await page.mouse.move(box.x - 40, box.y - 40);
  await page.waitForTimeout(550);

  const leaveState = await hero.evaluate((el) => {
    const guidesEl = el.querySelector('[data-testid="about-layer-guides"]') as SVGGElement;
    const geoEl = el.querySelector('[data-testid="about-layer-geometry"]') as SVGGElement;
    const m = new DOMMatrixReadOnly(getComputedStyle(geoEl).transform);
    return { guidesOpacity: Number(getComputedStyle(guidesEl).opacity), x: m.m41, y: m.m42 };
  });
  expect(leaveState.guidesOpacity).toBeLessThan(0.1);
  expect(Math.abs(leaveState.x)).toBeLessThan(1.5);
  expect(Math.abs(leaveState.y)).toBeLessThan(1.5);
});
```

- [ ] **Step 2: Run Playwright test to verify the new Task 2 test fails**

Run: `npx playwright test tests/about-hero-live-bg.spec.ts`
Expected: Task 1 PASS, Task 2 FAIL (guides opacity stays 0 / parallax transform stays 0).

- [ ] **Step 3: Implement `gsap.quickTo()` pointer parallax, clamped smart guides, and magnetic node pull in `src/components/modals/AboutVectorHeroBg.tsx`**

Wire `pointerenter`, `pointermove`, and `pointerleave` on `containerRef.current` inside the GSAP lifecycle effect:
- Convert client pointer `(clientX, clientY)` to normalized `nx, ny` in `[-1, 1]` and clamped SVG coordinates `(svgX, svgY)` inside `[0, 720] × [0, 180]`.
- Drive `about-layer-geometry` (`±6px` X, `±4px` Y) and `about-layer-bezier` (`±9px` X, `±6px` Y) via `gsap.quickTo`.
- Drive `about-guide-h` (`y`), `about-guide-v` (`x`), and `about-guide-reticle` (`x`, `y`) via `gsap.quickTo`, fading `about-layer-guides` to `opacity: 0.75` while hovering and `0` on `pointerleave`.
- Compute nearest node among the anchor/magnetic nodes; if distance `< 120` SVG units, apply a gentle magnetic pull (`<= 5px`) to that node and move/fade `about-magnetic-ring` onto it; otherwise fade the magnetic ring out.
- Short-circuit all pointer effects immediately whenever `reducedMotion` or `!active`.

- [ ] **Step 4: Typecheck, rebuild offline bundle, and run Playwright tests**

Run:
1. `npm run typecheck` -> Expected: exit 0
2. `npm run build:web` -> Expected: exit 0
3. `npx playwright test tests/about-hero-live-bg.spec.ts` -> Expected: PASS (2 passed)

---

### Task 3: Motion Policy, Lifecycle Pausing, & Full Visual Verification

**Files:**
- Modify: `src/components/modals/AboutVectorHeroBg.tsx`
- Test: `tests/about-hero-live-bg.spec.ts`

**Interfaces:**
- Consumes: `document.documentElement.getAttribute('data-motion')`, `window.matchMedia('(prefers-reduced-motion: reduce)')`, `document.visibilityState`, and `active` prop from `SettingsModal`.
- Produces:
  - Constant `SHOWCASE_TIME` (the exact timeline timestamp in seconds where the Bézier curve is drawn, anchor nodes & tangent handles are extended, and the Pen Tool nib rests gracefully at the end knot).
  - Reactive state `data-motion-state="running" | "paused" | "reduced"` on `[data-testid="about-hero-bg"]`.

- [ ] **Step 1: Add failing Playwright tests for Task 3 (UI motion toggle OFF, OS `prefers-reduced-motion: reduce`, tab switch pausing, modal reopen without console errors)**

Append to `tests/about-hero-live-bg.spec.ts`:

```typescript
test('Task 3a: toggling Animasi Antarmuka to Mati freezes at static showcase frame and disables cursor effects', async ({ page }) => {
  const hero = await openSettingsGeneral(page);
  const bg = hero.locator('[data-testid="about-hero-bg"]');

  // Toggle Interface Animation -> Off (Mati)
  await page.locator('.stg-row[data-tip="setMotion"] button', { hasText: /Mati|Off/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(bg).toHaveAttribute('data-motion-state', 'reduced');

  // Verify showcase pose is visible (curve drawn, nodes visible) and frozen over time
  const sample = () => hero.evaluate((el) => {
    const p = el.querySelector('[data-testid="about-bezier-path"]') as SVGPathElement;
    const nib = el.querySelector('[data-testid="about-pen-nib"]') as SVGGElement;
    return {
      offset: Number(parseFloat(getComputedStyle(p).strokeDashoffset || '0')),
      nibOpacity: Number(getComputedStyle(nib).opacity),
      nibTransform: nib.getAttribute('transform') || getComputedStyle(nib).transform
    };
  });
  const s0 = await sample();
  expect(s0.offset).toBeLessThan(20);
  expect(s0.nibOpacity).toBeGreaterThan(0.5);

  await page.waitForTimeout(350);
  const s1 = await sample();
  expect(s1.offset).toBe(s0.offset);
  expect(s1.nibTransform).toBe(s0.nibTransform);

  // Moving pointer while motion is off does NOT activate guides or parallax
  const box = (await hero.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await page.waitForTimeout(250);
  const guidesOpacity = await hero.locator('[data-testid="about-layer-guides"]').evaluate(
    (el) => Number(getComputedStyle(el).opacity)
  );
  expect(guidesOpacity).toBeLessThan(0.05);
});

test('Task 3b: OS prefers-reduced-motion freezes background even if prefs.motion is on', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hero = await openSettingsGeneral(page);
  await page.locator('.stg-row[data-tip="setMotion"] button', { hasText: /Aktif|On/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(hero.locator('[data-testid="about-hero-bg"]')).toHaveAttribute('data-motion-state', 'reduced');
});

test('Task 3c: switching Settings tabs pauses/resumes and closing/reopening produces zero console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const hero = await openSettingsGeneral(page);
  const bg = hero.locator('[data-testid="about-hero-bg"]');
  await expect(bg).toHaveAttribute('data-motion-state', 'running');

  // Switch to Shortcuts tab -> paused
  await page.locator('.stg-modal .seg button', { hasText: /Pintasan|Shortcuts/i }).click();
  await expect(bg).toHaveAttribute('data-motion-state', 'paused');

  // Switch back to General tab -> running again
  await page.locator('.stg-modal .seg button', { hasText: /Umum|General/i }).click();
  await expect(bg).toHaveAttribute('data-motion-state', 'running');

  // Close and reopen Settings modal twice
  for (let i = 0; i < 2; i++) {
    await page.locator('.stg-modal button[data-tip="closeDlg"]').click();
    await page.waitForTimeout(250);
    await page.locator('button[data-tip="settings"]').first().click();
    await hero.waitFor({ state: 'visible', timeout: 5000 });
    await expect(bg).toHaveAttribute('data-motion-state', 'running');
  }

  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run Playwright test to verify Task 3 tests fail until full policy/pausing is wired**

Run: `npx playwright test tests/about-hero-live-bg.spec.ts`
Expected: Task 3a/3b/3c fail if `MutationObserver` / `SHOWCASE_TIME` / `visibilitychange` / `active` pause handling is incomplete.

- [ ] **Step 3: Complete motion observer, `SHOWCASE_TIME` static freeze, tab/visibility pausing, and pointer reset in `src/components/modals/AboutVectorHeroBg.tsx`**

Ensure:
- A `MutationObserver` watches `document.documentElement` (`attributeFilter: ['data-motion']`) alongside `window.matchMedia('(prefers-reduced-motion: reduce)')` and `motionPref`.
- A `document.addEventListener('visibilitychange', ...)` listener pauses/resumes the timeline when the window/tab hides or returns.
- Whenever `isReduced` is true:
  - `timeline.pause(SHOWCASE_TIME)` (and geometry tweens reset to neutral `0` or crisp static offsets),
  - `gsap.set` resets parallax offsets to `0` and `about-layer-guides` / `about-magnetic-ring` to `opacity: 0`,
  - `data-motion-state` becomes `"reduced"`.
- Whenever `!active || document.visibilityState !== 'visible'` (and not reduced):
  - `timeline.pause()` and ambient geometry tweens pause,
  - `data-motion-state` becomes `"paused"`.
- Whenever `active && !isReduced && document.visibilityState === 'visible'`:
  - `timeline.play()` and ambient geometry tweens resume,
  - `data-motion-state` becomes `"running"`.
- Clean up all observers, listeners, and `gsap.context()` cleanly on unmount.

- [ ] **Step 4: Typecheck, rebuild offline bundle, and run full Playwright test suite**

Run:
1. `npm run typecheck` -> Expected: exit 0
2. `npm run build:web` -> Expected: exit 0
3. `npx playwright test tests/about-hero-live-bg.spec.ts` -> Expected: PASS (all 5 tests passed)

- [ ] **Step 5: Visual QA with Playwright MCP**

Use Playwright MCP (`browser_navigate` to `file:///.../web/index.html`, `browser_click` on Settings, `browser_take_screenshot`) to visually inspect `.stg-about-hero` in:
1. Light mode with default Geovanta green (`#13b152`),
2. Dark mode with another accent color (e.g., Figma Blue `#0d99ff` or Rose `#f43f5e`),
3. Motion OFF static showcase frame.
Confirm logo, version badge, and 3 pills are sharp, unobstructed, and balanced with the live vector scene.
