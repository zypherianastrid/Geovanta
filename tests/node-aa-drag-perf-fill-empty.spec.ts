import { test, expect, Page } from '@playwright/test';

async function openEditor(page: Page) {
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForLoadState('networkidle');

  const openBtn = page.getByRole('button', { name: 'Buka Editor' }).first();
  if (await openBtn.isVisible()) {
    await openBtn.click();
  } else {
    const createBtn = page.getByRole('button', { name: 'Create New', exact: true });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const submitBtn = page.getByRole('button', { name: 'Buat & Buka Proyek' });
      await submitBtn.waitFor({ state: 'visible' });
      await submitBtn.click();
    }
  }

  await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined');
}

function makeRectObj(id: string, x: number, y: number, w: number, h: number, fill: string, opts: Record<string, any> = {}) {
  return {
    id,
    name: id,
    type: 'path',
    fill,
    stroke: opts.stroke !== undefined ? opts.stroke : fill,
    strokeWidth: opts.strokeWidth !== undefined ? opts.strokeWidth : 0.6,
    strokeLinejoin: 'miter',
    strokeLinecap: 'butt',
    opacity: 1,
    fillRule: opts.fillRule || 'nonzero',
    group: opts.group || null,
    subs: [
      {
        id: id + '-sp',
        closed: true,
        nodes: [
          { id: id + '-n0', x, y, type: 'corner', handleIn: null, handleOut: null },
          { id: id + '-n1', x: x + w, y, type: 'corner', handleIn: null, handleOut: null },
          { id: id + '-n2', x: x + w, y: y + h, type: 'corner', handleIn: null, handleOut: null },
          { id: id + '-n3', x, y: y + h, type: 'corner', handleIn: null, handleOut: null },
        ],
      },
    ],
  };
}

test.describe('Node AA Fix, Dense Drag Perf & Fill Empty Space', () => {
  test('Bug 1: Node editing preserves 2x RGSS anti-aliasing and thin anti-seam strokes (>150 objects)', async ({ page }) => {
    await openEditor(page);

    const screenNodePt = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const objs: any[] = [];
      // Two large touching diagonal/adjacent triangles/rects + 170 small shapes (>150 threshold)
      // Touching dark red triangles along diagonal seam from (100,100) to (300,300)
      objs.push({
        id: 'tri-a',
        name: 'tri-a',
        type: 'path',
        fill: '#1e293b',
        stroke: '#1e293b',
        strokeWidth: 0.75,
        opacity: 1,
        subs: [{
          id: 'tri-a-sp',
          closed: true,
          nodes: [
            { id: 'ta0', x: 100, y: 100, type: 'corner', handleIn: null, handleOut: null },
            { id: 'ta1', x: 300, y: 100, type: 'corner', handleIn: null, handleOut: null },
            { id: 'ta2', x: 300, y: 300, type: 'corner', handleIn: null, handleOut: null },
          ],
        }],
      });
      objs.push({
        id: 'tri-b',
        name: 'tri-b',
        type: 'path',
        fill: '#1e293b',
        stroke: '#1e293b',
        strokeWidth: 0.75,
        opacity: 1,
        subs: [{
          id: 'tri-b-sp',
          closed: true,
          nodes: [
            { id: 'tb0', x: 100, y: 100, type: 'corner', handleIn: null, handleOut: null },
            { id: 'tb1', x: 300, y: 300, type: 'corner', handleIn: null, handleOut: null },
            { id: 'tb2', x: 100, y: 300, type: 'corner', handleIn: null, handleOut: null },
          ],
        }],
      });
      // Editable target object on side
      objs.push({
        id: 'edit-shape',
        name: 'edit-shape',
        type: 'path',
        fill: '#2563eb',
        stroke: '#2563eb',
        strokeWidth: 0.6,
        opacity: 1,
        subs: [{
          id: 'es-sp',
          closed: true,
          nodes: [
            { id: 'es-n0', x: 360, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'es-n1', x: 480, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'es-n2', x: 480, y: 240, type: 'corner', handleIn: null, handleOut: null },
            { id: 'es-n3', x: 360, y: 240, type: 'corner', handleIn: null, handleOut: null },
          ],
        }],
      });
      // Push total objects > 165 to trigger >150 threshold
      for (let i = 0; i < 165; i++) {
        const col = i % 15;
        const row = Math.floor(i / 15);
        objs.push({
          id: `filler-${i}`,
          name: `filler-${i}`,
          type: 'path',
          fill: '#16a34a',
          stroke: '#16a34a',
          strokeWidth: 0.5,
          opacity: 1,
          subs: [{
            id: `fsp-${i}`,
            closed: true,
            nodes: [
              { id: `fn0-${i}`, x: 520 + col * 14, y: 80 + row * 14, type: 'corner', handleIn: null, handleOut: null },
              { id: `fn1-${i}`, x: 532 + col * 14, y: 80 + row * 14, type: 'corner', handleIn: null, handleOut: null },
              { id: `fn2-${i}`, x: 532 + col * 14, y: 92 + row * 14, type: 'corner', handleIn: null, handleOut: null },
              { id: `fn3-${i}`, x: 520 + col * 14, y: 92 + row * 14, type: 'corner', handleIn: null, handleOut: null },
            ],
          }],
        });
      }

      api.setDoc({ viewBox: [0, 0, 800, 600], objects: objs, styles: [] });
      api.setAntialias(false); // Ensure RGSS mode (default)
      api.setZ(1, 0, 0, false);
      api.panTo(400, 300);
      api.setTool('node');
      api.setSelection(['edit-shape']);

      const sr = api.getSceneRenderer();
      const cvs = sr?.canvasEl || document.querySelector('canvas');
      const rect = cvs.getBoundingClientRect();
      const cam = sr.camera;
      // Map world node es-n0 (360, 120) to viewport clientX, clientY
      return {
        clientX: rect.left + 360 * cam.zoom + cam.panX,
        clientY: rect.top + 120 * cam.zoom + cam.panY,
      };
    });

    await page.waitForTimeout(120);

    // Drag node es-n0 and inspect renderer state & diagonal seam pixels WHILE dragging
    await page.mouse.move(screenNodePt.clientX, screenNodePt.clientY);
    await page.mouse.down();
    await page.mouse.move(screenNodePt.clientX + 25, screenNodePt.clientY + 15, { steps: 4 });
    await page.waitForTimeout(80);

    const midDragState = await page.evaluate(() => {
      const sr = (window as any).__geovantaEditorApi.getSceneRenderer();
      const kit = sr.scene?.kit;
      const isGpu = sr.backend === 'CanvasKit GPU';
      const objCount = sr.doc?.objects?.length || 0;
      // Probe what render path and seam pixels look like right at the diagonal seam (200, 200)
      const cam = sr.camera;
      const dpr = sr.surface ? sr.surface.width() / cam.width : 1;
      const sx = Math.round((200 * cam.zoom + cam.panX) * dpr);
      const sy = Math.round((200 * cam.zoom + cam.panY) * dpr);
      const px = (window as any).__geovantaEditorApi.readCanvasPixels(Math.max(0, sx - 2), Math.max(0, sy - 2), 5, 5);
      let brightLeakPixels = 0;
      if (px) {
        for (let i = 0; i < px.length; i += 4) {
          // Triangles are dark #1e293b (r=30,g=41,b=59). If anti-seam is dropped or seam exposes background, pixel becomes much brighter!
          if (px[i] > 60 || px[i + 1] > 70 || px[i + 2] > 95) brightLeakPixels++;
        }
      }
      return {
        sceneInteracting: Boolean(sr.sceneInteracting),
        paintInteracting: Boolean(sr.paintInteracting),
        lastPreserveAntiSeam: Boolean(sr._lastFramePreserveAntiSeam),
        lastUsedRgss: Boolean(sr._lastFrameUsedRgss),
        brightLeakPixels,
        isGpu,
        objCount,
      };
    });

    await page.mouse.up();

    expect(midDragState.paintInteracting).toBe(false);
    expect(midDragState.lastUsedRgss).toBe(true);
    expect(midDragState.lastPreserveAntiSeam).toBe(true);
    expect(midDragState.brightLeakPixels).toBe(0);
  });

  test('Bug 2: Dragging an object across a 1,500+ object canvas stays fast and avoids moving-pass full icon-state scans', async ({ page }) => {
    await openEditor(page);

    await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const objs: any[] = [];
      for (let i = 0; i < 1520; i++) {
        const col = i % 40;
        const row = Math.floor(i / 40);
        const x = 40 + col * 24;
        const y = 40 + row * 24;
        objs.push({
          id: `dense-${i}`,
          name: `dense-${i}`,
          type: 'path',
          fill: i === 0 ? '#2563eb' : (i % 2 === 0 ? '#94a3b8' : '#cbd5e1'),
          stroke: 'none',
          strokeWidth: 0,
          opacity: 1,
          subs: [{
            id: `dsp-${i}`,
            closed: true,
            nodes: [
              { id: `dn0-${i}`, x, y, type: 'corner', handleIn: null, handleOut: null },
              { id: `dn1-${i}`, x: x + 16, y, type: 'corner', handleIn: null, handleOut: null },
              { id: `dn2-${i}`, x: x + 16, y: y + 16, type: 'corner', handleIn: null, handleOut: null },
              { id: `dn3-${i}`, x, y: y + 16, type: 'corner', handleIn: null, handleOut: null },
            ],
          }],
        });
      }
      api.setDoc({ viewBox: [0, 0, 1200, 1100], objects: objs, styles: [] });
      api.setTool('select');
      api.setSelection(['dense-0']);
      api.setZ(1, 0, 0, false);
      api.panTo(220, 200);
    });

    await page.waitForTimeout(100);
    const startPt = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const sr = api.getSceneRenderer();
      const cvs = sr?.canvasEl || document.querySelector('canvas');
      const rect = cvs.getBoundingClientRect();
      const cam = sr.camera;
      if (sr.scene) sr.scene._movingIconBundleScans = 0;
      // Center of dense-0 (48, 48)
      return {
        clientX: rect.left + 48 * cam.zoom + cam.panX,
        clientY: rect.top + 48 * cam.zoom + cam.panY,
      };
    });

    await page.mouse.move(startPt.clientX, startPt.clientY);
    await page.mouse.down();

    // Install lightweight in-browser frame-gap probe around active drag
    await page.evaluate(() => {
      (window as any).__dragRafDeltas = [];
      let last = performance.now();
      (window as any).__dragProbeStop = false;
      const tick = () => {
        const now = performance.now();
        (window as any).__dragRafDeltas.push(now - last);
        last = now;
        if (!(window as any).__dragProbeStop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    const stepTimes: number[] = [];
    for (let s = 1; s <= 15; s++) {
      const t0 = Date.now();
      await page.mouse.move(startPt.clientX + s * 10, startPt.clientY + s * 6, { steps: 1 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      stepTimes.push(Date.now() - t0);
    }

    const afterDrag = await page.evaluate(() => {
      (window as any).__dragProbeStop = true;
      const sr = (window as any).__geovantaEditorApi.getSceneRenderer();
      const deltas: number[] = (window as any).__dragRafDeltas || [];
      // Ignore first warm-up tick & measure steady-state drag frame pacing
      const steady = deltas.slice(2);
      const steadyAvg = steady.length ? steady.reduce((a, b) => a + b, 0) / steady.length : 0;
      const maxDelta = steady.length ? Math.max(...steady) : 0;
      return {
        movingScans: sr.scene?._movingIconBundleScans,
        dx: sr.dragOffset?.dx || 0,
        steadyAvg,
        maxDelta,
      };
    });

    await page.mouse.up();

    const docAfter = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const d = api.getDoc();
      const o = d.objects.find((q: any) => q.id === 'dense-0');
      return { x: o.subs[0].nodes[0].x, y: o.subs[0].nodes[0].y };
    });

    expect(docAfter.x).toBeGreaterThan(100);
    expect(docAfter.y).toBeGreaterThan(80);
    expect(afterDrag.movingScans).toBe(0);
    const avgMs = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
    console.log('Bug 2 1520-obj drag steady rAF avg ms:', Math.round(afterDrag.steadyAvg * 10) / 10, 'step avg ms:', Math.round(avgMs * 10) / 10);
    expect(afterDrag.steadyAvg).toBeLessThan(35);
    expect(avgMs).toBeLessThan(100);
  });

  test('Feature 3a: Fill Empty Space expands connected parent or middle child into enclosed pockets while blocking separated objects', async ({ page }) => {
    await openEditor(page);

    // Helper inside evaluate: compute net polygon area of an object's subpaths
    const res = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      // Outer hollow frame P: [100,100]..[400,250] with inner cutout [120,120]..[380,230]
      // Inside cutout [120..380, 120..230]:
      // - Empty space 1: [120..200, 120..230] (area 80*110 = 8800)
      // - Child 2 (middle, directly touching space 1 & space 3): [200..280, 120..230] (area 80*110 = 8800)
      // - Empty space 3: [280..380, 120..230] (area 100*110 = 11000)
      const parentHollow = {
        id: 'parent-frame',
        name: 'parent-frame',
        type: 'path',
        fill: '#ef4444',
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
        fillRule: 'nonzero',
        subs: [
          {
            id: 'p-outer',
            closed: true,
            nodes: [
              { id: 'po0', x: 100, y: 100, type: 'corner', handleIn: null, handleOut: null },
              { id: 'po1', x: 400, y: 100, type: 'corner', handleIn: null, handleOut: null },
              { id: 'po2', x: 400, y: 250, type: 'corner', handleIn: null, handleOut: null },
              { id: 'po3', x: 100, y: 250, type: 'corner', handleIn: null, handleOut: null },
            ],
          },
          {
            id: 'p-inner',
            closed: true,
            nodes: [
              { id: 'pi0', x: 120, y: 120, type: 'corner', handleIn: null, handleOut: null },
              { id: 'pi1', x: 120, y: 230, type: 'corner', handleIn: null, handleOut: null },
              { id: 'pi2', x: 380, y: 230, type: 'corner', handleIn: null, handleOut: null },
              { id: 'pi3', x: 380, y: 120, type: 'corner', handleIn: null, handleOut: null },
            ],
          },
        ],
      };
      const child2 = {
        id: 'child-2',
        name: 'child-2',
        type: 'path',
        fill: '#3b82f6',
        stroke: '#1d4ed8',
        strokeWidth: 1,
        opacity: 0.9,
        group: 'grp-demo',
        subs: [{
          id: 'c2-sp',
          closed: true,
          nodes: [
            { id: 'c20', x: 200, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'c21', x: 280, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'c22', x: 280, y: 230, type: 'corner', handleIn: null, handleOut: null },
            { id: 'c23', x: 200, y: 230, type: 'corner', handleIn: null, handleOut: null },
          ],
        }],
      };

      const polyArea = (o: any) => {
        // Compute net signed winding area (even for multi-subpath objects)
        let net = 0;
        for (const sp of o.subs || []) {
          const ns = sp.nodes || [];
          let a = 0;
          for (let i = 0; i < ns.length; i++) {
            const p = ns[i], q = ns[(i + 1) % ns.length];
            a += p.x * q.y - q.x * p.y;
          }
          net += a * 0.5;
        }
        return Math.abs(net);
      };

      // Subcase A: Select Parent -> fills both Space 1 and Space 3
      api.setDoc({ viewBox: [0, 0, 600, 400], objects: [parentHollow, child2], styles: [] });
      api.setSelection(['parent-frame']);
      api.fillEmptySpace();
      const afterParent = api.getDoc();
      const parentObjAfter = afterParent.objects.find((q: any) => q.id === 'parent-frame');

      // Subcase B: Select middle Child 2 -> fills both Space 1 and Space 3, preserving child2 style
      api.setDoc({ viewBox: [0, 0, 600, 400], objects: [parentHollow, child2], styles: [] });
      api.setSelection(['child-2']);
      api.fillEmptySpace();
      const afterChild2 = api.getDoc();
      const child2After = afterChild2.objects.find((q: any) => q.id === 'child-2');

      // Subcase C: Separated by divider object
      // In cavity [120..380, 120..230]:
      // Space 1: [120..180], Child-2: [180..230], Divider-4: [230..280], Space 3: [280..380]
      // Also an isolated object surrounded cleanly on outside at [450..500] (no empty space nearby)
      const child2Left = {
        ...child2,
        id: 'child-2-left',
        subs: [{
          id: 'c2l-sp',
          closed: true,
          nodes: [
            { id: 'c2l0', x: 180, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'c2l1', x: 230, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'c2l2', x: 230, y: 230, type: 'corner', handleIn: null, handleOut: null },
            { id: 'c2l3', x: 180, y: 230, type: 'corner', handleIn: null, handleOut: null },
          ],
        }],
      };
      const divider4 = {
        id: 'divider-4',
        name: 'divider-4',
        type: 'path',
        fill: '#10b981',
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
        subs: [{
          id: 'd4-sp',
          closed: true,
          nodes: [
            { id: 'd40', x: 230, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'd41', x: 280, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'd42', x: 280, y: 230, type: 'corner', handleIn: null, handleOut: null },
            { id: 'd43', x: 230, y: 230, type: 'corner', handleIn: null, handleOut: null },
          ],
        }],
      };
      const isolatedOutside = {
        id: 'isolated-obj',
        name: 'isolated-obj',
        type: 'path',
        fill: '#f59e0b',
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
        subs: [{
          id: 'iso-sp',
          closed: true,
          nodes: [
            { id: 'is0', x: 450, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'is1', x: 500, y: 120, type: 'corner', handleIn: null, handleOut: null },
            { id: 'is2', x: 500, y: 170, type: 'corner', handleIn: null, handleOut: null },
            { id: 'is3', x: 450, y: 170, type: 'corner', handleIn: null, handleOut: null },
          ],
        }],
      };

      // C1: Select child-2-left -> must fill ONLY Space 1 (60*110=6600) + itself (50*110=5500) = 12100, NOT Space 3!
      api.setDoc({ viewBox: [0, 0, 600, 400], objects: [parentHollow, child2Left, divider4, isolatedOutside], styles: [] });
      api.setSelection(['child-2-left']);
      api.fillEmptySpace();
      const child2LeftAfter = api.getDoc().objects.find((q: any) => q.id === 'child-2-left');

      // C2: Select isolatedOutside -> separated from pockets -> must NOT change!
      api.setDoc({ viewBox: [0, 0, 600, 400], objects: [parentHollow, child2Left, divider4, isolatedOutside], styles: [] });
      api.setSelection(['isolated-obj']);
      api.fillEmptySpace();
      const isoAfter = api.getDoc().objects.find((q: any) => q.id === 'isolated-obj');

      const bboxOf = (o: any) => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const sp of o.subs || []) {
          for (const n of sp.nodes || []) {
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x > maxX) maxX = n.x;
            if (n.y > maxY) maxY = n.y;
          }
        }
        return [minX, minY, maxX, maxY];
      };

      return {
        hasApi: typeof api.fillEmptySpace === 'function',
        parentArea: polyArea(parentObjAfter),
        child2Area: polyArea(child2After),
        child2Fill: child2After.fill,
        child2Group: child2After.group,
        child2Opacity: child2After.opacity,
        child2BBox: bboxOf(child2After),
        child2LeftArea: polyArea(child2LeftAfter),
        child2LeftBBox: bboxOf(child2LeftAfter),
        isoArea: polyArea(isoAfter),
      };
    });

    expect(res.hasApi).toBe(true);
    // Parent before: 45000 - 28600 = 16400; after filling spaces 1 & 3 (8800+11000=19800): ~36200
    expect(res.parentArea).toBeGreaterThan(35000);
    // Child2 before: 8800; after filling spaces 1 & 3: 8800 + 8800 + 11000 = 28600 covering [120..380]
    expect(Math.abs(res.child2Area - 28600)).toBeLessThan(200);
    expect(res.child2Fill).toBe('#3b82f6');
    expect(res.child2Group).toBe('grp-demo');
    expect(res.child2Opacity).toBe(0.9);
    expect(Math.abs(res.child2BBox[0] - 120)).toBeLessThan(1.5);
    expect(Math.abs(res.child2BBox[2] - 380)).toBeLessThan(1.5);
    // Separated by divider4: child2Left only absorbs Space 1 -> total area ~12100, right edge stays at 230
    expect(Math.abs(res.child2LeftArea - 12100)).toBeLessThan(200);
    expect(Math.abs(res.child2LeftBBox[2] - 230)).toBeLessThan(1.5);
    // Isolated object untouched -> 50*50 = 2500
    expect(Math.abs(res.isoArea - 2500)).toBeLessThan(10);
  });

  test('Feature 3b: Right Inspector Fill Empty Space button & Undo/Redo integration', async ({ page }) => {
    await openEditor(page);

    await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const parentHollow = {
        id: 'ui-parent',
        name: 'ui-parent',
        type: 'path',
        fill: '#8b5cf6',
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
        subs: [
          {
            id: 'up-out',
            closed: true,
            nodes: [
              { id: 'uo0', x: 100, y: 100, type: 'corner', handleIn: null, handleOut: null },
              { id: 'uo1', x: 300, y: 100, type: 'corner', handleIn: null, handleOut: null },
              { id: 'uo2', x: 300, y: 300, type: 'corner', handleIn: null, handleOut: null },
              { id: 'uo3', x: 100, y: 300, type: 'corner', handleIn: null, handleOut: null },
            ],
          },
          {
            id: 'up-in',
            closed: true,
            nodes: [
              { id: 'ui0', x: 140, y: 140, type: 'corner', handleIn: null, handleOut: null },
              { id: 'ui1', x: 140, y: 260, type: 'corner', handleIn: null, handleOut: null },
              { id: 'ui2', x: 260, y: 260, type: 'corner', handleIn: null, handleOut: null },
              { id: 'ui3', x: 260, y: 140, type: 'corner', handleIn: null, handleOut: null },
            ],
          },
        ],
      };
      api.setDoc({ viewBox: [0, 0, 500, 500], objects: [parentHollow], styles: [] });
      api.setSelection(['ui-parent']);
    });

    const btn = page.getByTestId('fill-empty-btn');
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(80);

    const filledSubsCount = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects[0].subs.length);
    expect(filledSubsCount).toBe(1);

    // Undo restores the hollow cutout
    await page.evaluate(() => (window as any).__geovantaEditorApi.undo());
    await page.waitForTimeout(60);
    const undoneSubsCount = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects[0].subs.length);
    expect(undoneSubsCount).toBe(2);
  });
});
