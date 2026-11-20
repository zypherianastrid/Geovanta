# Auto Simplify Canvas Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur auto-simplify node 1 kali pada setiap objek vektor di kanvas dengan curve precision 100%, baik secara otomatis saat objek baru diimpor/ditempel maupun melalui aksi cepat pada seluruh objek kanvas yang sudah ada.

**Architecture:** 
1. Menambahkan fungsi `autoSimplifyDoc` pada engine `topologicalCurveSimplifier.tsx` dan diekspos di `vectorEngine.tsx` dengan konfigurasi terkunci `level = 100.0` (toleransi 0.03125 pt, presisi kurva tertinggi). Objek yang telah disederhanakan diberi tanda `_autoSimplified: true` agar terlindungi dari eksekusi ganda.
2. Mengintegrasikan pemanggilan auto-simplify otomatis 1 kali saat impor berkas SVG (`importFiles`) dan paste SVG (`pasteText`) di `VectorEditor.tsx`.
3. Menambahkan tombol aksi cepat "Auto Simplify Semua Objek (100%)" pada `EditorSimplifyStrip.tsx` dan toolbar Simplify dengan feedback toast informatif dan dukungan Undo (`Ctrl + Z`).

**Tech Stack:** React, TypeScript, CanvasKit, Playwright (`@playwright/test`)

**Spec:** [docs/superpowers/specs/2026-11-17-auto-simplify-canvas-design.md](file:///c:/Users/Reza%20Pahlevi/Documents/OpenBotTest/Geovanta-live-Caret-Typing/Geovanta-live-Caret-Typing/docs/superpowers/specs/2026-11-17-auto-simplify-canvas-design.md)

## Global Constraints

- Curve precision selalu diset ke 100% (`level = 100.0`, toleransi $0.03125\text{ pt}$).
- Dijalankan tepat 1 kali saja per objek dengan penanda `_autoSimplified: true` untuk menjaga performa.
- Tidak menyentuh objek teks, bitmap image, atau frame background.
- Pengujian menggunakan Playwright (`@playwright/test`) secara eksklusif.
- Kompatibilitas bundel offline 100% via `npm run build:web`.

## Review Focus

1. **Objek non-vektor (teks, image, frame-bg):** Harus diabaikan secara aman tanpa error atau modifikasi subs.
2. **Idempotensi (`_autoSimplified: true`):** Objek yang sudah pernah di-simplify tidak boleh di-simplify ulang pada eksekusi berikutnya.
3. **Presisi 100% bentuk kurva:** Node collinear atau redundant berkurang, tetapi bentuk kurva visual tidak mengalami distorsi.
4. **Undo / Redo:** Aksi auto-simplify harus dapat di-undo secara bersih dengan `Ctrl + Z`.
5. **Responsivitas toast feedback:** Menampilkan pesan toast yang akurat sesuai jumlah objek dan node yang dioptimasi.

---

### Task 1: Core Function `autoSimplifyDoc` di `topologicalCurveSimplifier.tsx` & `vectorEngine.tsx`

**Files:**
- Modify: `src/engine/topologicalCurveSimplifier.tsx`
- Modify: `src/engine/vectorEngine.tsx`
- Test: `tests/auto-simplify-core.spec.ts`

**Interfaces:**
- Produces: `autoSimplifyDoc(doc: VectorDocument, targetIds?: Set<string> | null) => { doc: VectorDocument, changed: boolean, count: number, before: number, after: number }`

- [ ] **Step 1: Tulis Playwright failing test untuk `autoSimplifyDoc`**

Buat berkas `tests/auto-simplify-core.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test('autoSimplifyDoc simplifies redundant nodes at 100% precision and sets _autoSimplified flag once', async ({ page }) => {
  const htmlPath = path.resolve('web/index.html');
  await page.goto(`file://${htmlPath}`);
  await page.waitForFunction(() => typeof (window as any).__GEOVANTA_AUDIT__?.VE?.autoSimplifyDoc === 'function');

  const res = await page.evaluate(() => {
    const { VE } = (window as any).__GEOVANTA_AUDIT__;
    // Buat objek dengan node collinear berlebih di garis lurus (10,10) -> (50,10) -> (100,10)
    const doc = {
      viewBox: [0, 0, 200, 200],
      objects: [
        {
          id: 'p1',
          name: 'path-1',
          type: 'path',
          fill: '#ff0000',
          stroke: 'none',
          subs: [
            {
              closed: true,
              nodes: [
                { x: 10, y: 10 },
                { x: 50, y: 10 }, // redundant collinear node
                { x: 100, y: 10 },
                { x: 100, y: 100 },
                { x: 10, y: 100 }
              ]
            }
          ]
        },
        {
          id: 't1',
          name: 'text-1',
          type: 'text',
          text: { content: 'Hello' },
          subs: []
        }
      ]
    };

    // Eksekusi pertama
    const firstRun = VE.autoSimplifyDoc(doc);
    // Eksekusi kedua (harus idempotent / tidak ada perubahan karena sudah berstatus _autoSimplified)
    const secondRun = VE.autoSimplifyDoc(firstRun.doc);

    return {
      firstRun: {
        changed: firstRun.changed,
        count: firstRun.count,
        before: firstRun.before,
        after: firstRun.after,
        obj1Nodes: firstRun.doc.objects[0].subs[0].nodes.length,
        obj1Flag: firstRun.doc.objects[0]._autoSimplified,
        textNodes: firstRun.doc.objects[1].subs.length
      },
      secondRun: {
        changed: secondRun.changed,
        count: secondRun.count
      }
    };
  });

  expect(res.firstRun.changed).toBe(true);
  expect(res.firstRun.count).toBe(1);
  expect(res.firstRun.before).toBe(5);
  expect(res.firstRun.after).toBe(4);
  expect(res.firstRun.obj1Nodes).toBe(4);
  expect(res.firstRun.obj1Flag).toBe(true);
  expect(res.secondRun.changed).toBe(false);
  expect(res.secondRun.count).toBe(0);
});
```

- [ ] **Step 2: Jalankan Playwright test untuk memverifikasi kegagalan**

Jalankan: `npx playwright test tests/auto-simplify-core.spec.ts`  
Ekspektasi: FAIL karena `VE.autoSimplifyDoc` belum didefinisikan.

- [ ] **Step 3: Implementasikan `autoSimplifyDoc` pada `src/engine/topologicalCurveSimplifier.tsx` dan ekspor di `vectorEngine.tsx`**

Tambahkan fungsi `autoSimplifyDoc`:
```typescript
function autoSimplifyDoc(doc, targetIds = null) {
  if (!doc || !Array.isArray(doc.objects)) return { doc, changed: false, count: 0, before: 0, after: 0 };
  const targetFilter = targetIds ? (id => targetIds.has(id)) : (() => true);
  
  // Pilih objek yang memenuhi syarat: vector path, belum disederhanakan (_autoSimplified !== true), bukan text/img/frame-bg
  const eligibleObjs = doc.objects.filter(o => 
    o && !o.hidden && !o.locked && !o.img && !o.text && !o.isLegacyText && 
    !o.isFrameBg && !o.isAutoFrame && !o._autoSimplified &&
    Array.isArray(o.subs) && o.subs.length > 0 && targetFilter(o.id)
  );
  
  if (!eligibleObjs.length) return { doc, changed: false, count: 0, before: 0, after: 0 };
  
  const eligibleIds = new Set(eligibleObjs.map(o => o.id));
  const simpRes = simplifyDoc(doc, {
    level: 100.0,
    cornerAngle: 30.0,
    straightLines: false
  }, eligibleIds);
  
  // Beri tanda _autoSimplified: true pada objek yang diproses
  const nextObjects = simpRes.doc.objects.map(o => {
    if (eligibleIds.has(o.id)) {
      return { ...o, _autoSimplified: true };
    }
    return o;
  });
  
  return {
    doc: { ...simpRes.doc, objects: nextObjects },
    changed: simpRes.changed || true,
    count: eligibleObjs.length,
    before: simpRes.before,
    after: simpRes.after
  };
}
```

Ekspor `autoSimplifyDoc` di `topologicalCurveSimplifier.tsx` dan cantumkan di `VE` pada `src/engine/vectorEngine.tsx`.

- [ ] **Step 4: Jalankan Playwright test untuk memverifikasi keberhasilan**

Jalankan: `npx playwright test tests/auto-simplify-core.spec.ts`  
Ekspektasi: PASS.

- [ ] **Step 5: Komit atau tandai selesai Task 1**

---

### Task 2: Integrasi Auto-Simplify Otomatis saat Impor & Paste di `VectorEditor.tsx`

**Files:**
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/auto-simplify-import.spec.ts`

**Interfaces:**
- Consumes: `VE.autoSimplifyDoc`
- Implements: Auto-simplify trigger pada `importFiles` dan `pasteText`

- [ ] **Step 1: Tulis Playwright failing test untuk auto-simplify saat import / paste**

Buat berkas `tests/auto-simplify-import.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test('imported SVG objects are automatically simplified 1x at 100% precision on canvas', async ({ page }) => {
  const htmlPath = path.resolve('web/index.html');
  await page.goto(`file://${htmlPath}`);
  await page.waitForFunction(() => typeof (window as any).__GEOVANTA_AUDIT__?.VE?.autoSimplifyDoc === 'function');

  const res = await page.evaluate(async () => {
    const api = (window as any).__geovantaEditorApi;
    // SVG dengan garis lurus yang memiliki collinear node berlebih (5 titik pada garis lurus 0..100)
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <path id="box1" fill="#00aa00" d="M 10 10 L 30 10 L 60 10 L 100 10 L 100 100 L 10 100 Z"/>
    </svg>`;

    // Muat melalui editor
    await api.loadTestSvg(rawSvg, 'Test Collinear');
    const doc = (window as any).__geovantaGetDoc?.() || (window as any).__GEOVANTA_AUDIT__?.docRef?.current;
    
    // Cari objek box1
    const box = doc.objects.find((o: any) => o.name === 'box1' || o.id === 'box1');
    return {
      hasBox: !!box,
      isAutoSimplified: box?._autoSimplified === true,
      nodeCount: box?.subs?.[0]?.nodes?.length
    };
  });

  expect(res.hasBox).toBe(true);
  expect(res.isAutoSimplified).toBe(true);
  // Dari 5 node (10, 30, 60, 100, 100..), node collinear 30 dan 60 tereduksi menjadi 4 sudut
  expect(res.nodeCount).toBeLessThanOrEqual(4);
});
```

- [ ] **Step 2: Jalankan Playwright test untuk memverifikasi kegagalan**

Jalankan: `npx playwright test tests/auto-simplify-import.spec.ts`  
Ekspektasi: FAIL karena `_autoSimplified` belum disetel saat impor.

- [ ] **Step 3: Implementasikan pemanggilan `VE.autoSimplifyDoc` pada `importFiles`, `pasteText`, dan `loadTestSvg` di `VectorEditor.tsx`**

Pada `importFiles` (setelah objek SVG diparsing dan sebelum di-commit):
Jalankan auto-simplify pada objek-objek baru:
```typescript
const simp = VE.autoSimplifyDoc({ viewBox: base0.viewBox, objects: news });
const optimizedNews = simp.doc.objects;
```
Terapkan hal yang sama pada `pasteText` dan `loadTestSvg` sehingga setiap objek yang baru masuk ke kanvas langsung dioptimasi 1 kali.

- [ ] **Step 4: Jalankan Playwright test untuk memverifikasi keberhasilan**

Jalankan: `npx playwright test tests/auto-simplify-import.spec.ts`  
Ekspektasi: PASS.

- [ ] **Step 5: Komit atau tandai selesai Task 2**

---

### Task 3: Aksi Kanvas "Auto Simplify Semua Objek" di Toolbar / Strip & Feedback Toast

**Files:**
- Modify: `src/components/editor/EditorSimplifyStrip.tsx`
- Modify: `src/components/editor/VectorEditor.tsx`
- Test: `tests/auto-simplify-canvas-action.spec.ts`

**Interfaces:**
- Consumes: `VE.autoSimplifyDoc`
- UI: Tombol pemicu "Auto Simplify Semua Objek (100%)" pada `EditorSimplifyStrip` (ikon wand/sparkles dengan tooltip jelas) atau aksi menu.

- [ ] **Step 1: Tulis Playwright failing test untuk aksi canvas "Auto Simplify Semua Objek"**

Buat berkas `tests/auto-simplify-canvas-action.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test('clicking Auto Simplify All Objects simplifies unsimplified canvas objects with toast feedback', async ({ page }) => {
  const htmlPath = path.resolve('web/index.html');
  await page.goto(`file://${htmlPath}`);
  await page.waitForFunction(() => typeof (window as any).__GEOVANTA_AUDIT__?.VE?.autoSimplifyDoc === 'function');

  const res = await page.evaluate(async () => {
    const { VE } = (window as any).__GEOVANTA_AUDIT__;
    // Buka editor dan letakkan 2 objek yang belum di-simplify
    const doc = {
      viewBox: [0, 0, 500, 500],
      objects: [
        {
          id: 'objA',
          name: 'objA',
          type: 'path',
          fill: '#ff0000',
          stroke: 'none',
          subs: [{ closed: true, nodes: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] }]
        },
        {
          id: 'objB',
          name: 'objB',
          type: 'path',
          fill: '#0000ff',
          stroke: 'none',
          subs: [{ closed: true, nodes: [{ x: 200, y: 200 }, { x: 250, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 300 }, { x: 200, y: 300 }] }]
        }
      ]
    };
    (window as any).__geovantaCommitDoc?.(doc);

    // Panggil aksi auto-simplify seluruh kanvas
    const out1 = (window as any).__geovantaAutoSimplifyCanvas?.();
    const out2 = (window as any).__geovantaAutoSimplifyCanvas?.();

    return { out1, out2 };
  });

  expect(res.out1.count).toBe(2);
  expect(res.out1.changed).toBe(true);
  expect(res.out2.count).toBe(0);
  expect(res.out2.changed).toBe(false);
});
```

- [ ] **Step 2: Jalankan Playwright test untuk memverifikasi kegagalan**

Jalankan: `npx playwright test tests/auto-simplify-canvas-action.spec.ts`  
Ekspektasi: FAIL.

- [ ] **Step 3: Tambahkan handler `autoSimplifyAllCanvasObjects` di `VectorEditor.tsx` & hubungkan ke `EditorSimplifyStrip.tsx`**

Di `VectorEditor.tsx`:
```typescript
const autoSimplifyAllCanvasObjects = () => {
  const curDoc = docRef.current;
  const res = VE.autoSimplifyDoc(curDoc);
  if (res.changed && res.count > 0) {
    commit(res.doc, null);
    say(`Auto-Simplify 100%: ${res.count} objek dioptimalkan · ${res.before} → ${res.after} node`);
    return res;
  }
  say('Auto-Simplify: semua objek di kanvas sudah optimal');
  return { ...res, count: 0, changed: false };
};
```
Sediakan tombol atau sambungkan ke ikon *wand* pada `EditorSimplifyStrip` yang memiliki tooltip `"Auto-Simplify Semua Objek (100%)"`.

- [ ] **Step 4: Jalankan Playwright test untuk memverifikasi keberhasilan**

Jalankan: `npx playwright test tests/auto-simplify-canvas-action.spec.ts`  
Ekspektasi: PASS.

- [ ] **Step 5: Komit atau tandai selesai Task 3**

---

### Task 4: Validasi Penuh dan Pembuatan Bundel Web

**Files:**
- Test: Seluruh suite Playwright (`tests/*.spec.ts`)
- Script: `scripts/build-offline-bundle.js`

- [ ] **Step 1: Jalankan seluruh suite tes Playwright**

Jalankan: `npx playwright test`  
Ekspektasi: Seluruh pengujian (lama dan baru) lulus 100% tanpa regresi.

- [ ] **Step 2: Jalankan build web bundle**

Jalankan: `npm run build:web`  
Ekspektasi: Berhasil membuild aset offline Geovanta ke `dist/` dan `web/`.
