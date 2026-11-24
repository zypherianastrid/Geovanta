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

test.describe('Bug fixes (Shift+Resize, Recolor Slider Perf) & Solid-to-Gradient Feature', () => {
  test('Bug 1: Holding Shift while clicking and dragging a resize handle scales object proportionally', async ({ page }) => {
    await openEditor(page);

    await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
      api.setTool('select');
      api.createTestShape('rect', 150, 150, 100, 50);
    });

    const brHandle = page.locator('.vc-bbox-overlay rect[data-hx]').nth(4);
    await expect(brHandle).toBeVisible();

    const box = await brHandle.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.keyboard.down('Shift');
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 20, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    const metrics = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const doc = api.getDoc();
      const o = doc.objects[0];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const sp of o.subs || []) {
        for (const n of sp.nodes || []) {
          if (n.x < minX) minX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.x > maxX) maxX = n.x;
          if (n.y > maxY) maxY = n.y;
        }
      }
      const w = maxX - minX;
      const h = maxY - minY;
      return {
        objCount: doc.objects.length,
        selCount: api.getSelection().length,
        w,
        h,
        aspect: h > 0 ? w / h : 0
      };
    });

    expect(metrics.objCount).toBe(1);
    expect(metrics.selCount).toBe(1);
    expect(metrics.w).toBeGreaterThan(130);
    expect(Math.abs(metrics.aspect - 2.0)).toBeLessThan(0.15);
  });

  test('Bug 2: Recolor slider scrubs smoothly with 250 selected objects without stalling', async ({ page }) => {
    await openEditor(page);

    const origColors = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const palette = ['#2563eb', '#3b82f6', '#0ea5e9', '#1d4ed8', '#0284c7'];
      const objects: any[] = [];
      const ids: string[] = [];
      for (let i = 0; i < 250; i++) {
        const x = 40 + (i % 25) * 28;
        const y = 40 + Math.floor(i / 25) * 28;
        const id = `rc-perf-${i}`;
        const fill = palette[i % palette.length];
        ids.push(id);
        objects.push({
          id,
          name: `Box-${i}`,
          type: 'path',
          fill,
          stroke: 'none',
          strokeWidth: 0,
          opacity: 1,
          fillRule: 'nonzero',
          group: null,
          subs: [{
            id: `sp-${i}`,
            closed: true,
            nodes: [
              { id: `n0-${i}`, x, y, type: 'corner', handleIn: null, handleOut: null },
              { id: `n1-${i}`, x: x + 20, y, type: 'corner', handleIn: null, handleOut: null },
              { id: `n2-${i}`, x: x + 20, y: y + 20, type: 'corner', handleIn: null, handleOut: null },
              { id: `n3-${i}`, x, y: y + 20, type: 'corner', handleIn: null, handleOut: null }
            ]
          }]
        });
      }
      api.setDoc({ viewBox: [0, 0, 800, 600], objects, styles: [] });
      api.setSelection(ids);
      return objects.slice(0, 5).map(o => o.fill);
    });

    const openRcBtn = page.locator('[data-testid="rc-open-selcolors"]');
    await expect(openRcBtn).toBeVisible();
    await openRcBtn.click();

    const rcSection = page.locator('[data-testid="rc-section"]');
    await expect(rcSection).toBeVisible();

    const hueSlider = page.locator('[data-testid="rc-hue"] [role="slider"]');
    await expect(hueSlider).toBeVisible();
    const slBox = await hueSlider.boundingBox();
    expect(slBox).not.toBeNull();

    const startX = slBox!.x + slBox!.width * 0.5;
    const endX = slBox!.x + slBox!.width * 0.85;
    const centerY = slBox!.y + slBox!.height / 2;

    await page.mouse.move(startX, centerY);
    await page.mouse.down();

    const stepTimes: number[] = [];
    const steps = 10;
    for (let s = 1; s <= steps; s++) {
      const tx = startX + ((endX - startX) * s) / steps;
      const t0 = Date.now();
      await page.mouse.move(tx, centerY);
      stepTimes.push(Date.now() - t0);
    }
    await page.mouse.up();

    const avgMs = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
    console.log('Recolor 250-object slider avg step ms:', avgMs, 'steps:', stepTimes);
    expect(avgMs).toBeLessThan(60);

    const applyBtn = page.locator('[data-testid="rc-apply"]');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();
    await expect(rcSection).toBeHidden();

    const afterColors = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      return api.getDoc().objects.slice(0, 5).map((o: any) => o.fill);
    });
    for (let i = 0; i < 5; i++) {
      expect(afterColors[i]).not.toBe(origColors[i]);
    }

    await page.evaluate(() => {
      (window as any).__geovantaEditorApi.undo();
    });
    const undoneColors = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      return api.getDoc().objects.slice(0, 5).map((o: any) => o.fill);
    });
    expect(undoneColors).toEqual(origColors);
  });

  test('Bug 2b: Recolor works out-of-the-box for non-blue colors (green/pink/red), live selection updates, Mode 2, and updates rendered canvas pixels', async ({ page }) => {
    await openEditor(page);

    await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      api.setDoc({
        viewBox: [0, 0, 800, 600],
        objects: [
          {
            id: 'green-1',
            name: 'GreenBox',
            type: 'path',
            fill: '#13b152',
            stroke: 'none',
            strokeWidth: 0,
            opacity: 1,
            fillRule: 'nonzero',
            group: null,
            subs: [{
              id: 'sp-g',
              closed: true,
              nodes: [
                { id: 'g0', x: 60, y: 60, type: 'corner', handleIn: null, handleOut: null },
                { id: 'g1', x: 180, y: 60, type: 'corner', handleIn: null, handleOut: null },
                { id: 'g2', x: 180, y: 180, type: 'corner', handleIn: null, handleOut: null },
                { id: 'g3', x: 60, y: 180, type: 'corner', handleIn: null, handleOut: null }
              ]
            }]
          },
          {
            id: 'pink-1',
            name: 'PinkBox',
            type: 'path',
            fill: '#ff4d94',
            stroke: 'none',
            strokeWidth: 0,
            opacity: 1,
            fillRule: 'nonzero',
            group: null,
            subs: [{
              id: 'sp-p',
              closed: true,
              nodes: [
                { id: 'p0', x: 220, y: 60, type: 'corner', handleIn: null, handleOut: null },
                { id: 'p1', x: 340, y: 60, type: 'corner', handleIn: null, handleOut: null },
                { id: 'p2', x: 340, y: 180, type: 'corner', handleIn: null, handleOut: null },
                { id: 'p3', x: 220, y: 180, type: 'corner', handleIn: null, handleOut: null }
              ]
            }]
          }
        ],
        styles: []
      });
      api.setSelection(['green-1', 'pink-1']);
      api.fitView();
    });

    await page.waitForFunction(() => (window as any).__geovantaEditorApi?.getSceneRenderer()?.scene);
    await page.waitForTimeout(100);

    const sampleObjectPixel = async (wx: number, wy: number) => {
      return await page.evaluate(([x, y]) => {
        const api = (window as any).__geovantaEditorApi;
        const sr = api.getSceneRenderer();
        sr.renderFrame(true);
        const { zoom, panX, panY, width } = sr.camera;
        const scale = sr.surface.width() / width;
        const px = Math.round((x * zoom + panX) * scale);
        const py = Math.round((y * zoom + panY) * scale);
        return api.readCanvasPixels(px, py, 1, 1);
      }, [wx, wy]);
    };

    const beforeGreenPx = await sampleObjectPixel(120, 120);
    const beforePinkPx = await sampleObjectPixel(280, 120);
    expect(beforeGreenPx).not.toBeNull();
    expect(beforePinkPx).not.toBeNull();
    expect(beforeGreenPx![1]).toBeGreaterThan(beforeGreenPx![0]); // green channel dominates

    // Open Recolor via Selection Colors button; default hue range MUST be 0..360 (not 190..260)
    await page.locator('[data-testid="rc-open-selcolors"]').click();
    const rcSection = page.locator('[data-testid="rc-section"]');
    await expect(rcSection).toBeVisible();

    const hueSlider = page.locator('[data-testid="rc-hue"] [role="slider"]');
    await hueSlider.scrollIntoViewIfNeeded();
    await page.waitForTimeout(180);
    const slBox = await hueSlider.boundingBox();
    expect(slBox).not.toBeNull();

    // Drag Hue slider +120 deg without touching range inputs
    await page.mouse.move(slBox!.x + slBox!.width * 0.5, slBox!.y + slBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(slBox!.x + slBox!.width * 0.85, slBox!.y + slBox!.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(80);

    const previewCountText = await page.locator('[data-testid="rc-count"]').innerText();
    expect(previewCountText).toContain('2');

    const liveGreenPx = await sampleObjectPixel(120, 120);
    const livePinkPx = await sampleObjectPixel(280, 120);
    expect(liveGreenPx).not.toEqual(beforeGreenPx);
    expect(livePinkPx).not.toEqual(beforePinkPx);

    await page.locator('[data-testid="rc-apply"]').click();
    await expect(rcSection).toBeHidden();

    const committed = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.map((o: any) => o.fill));
    expect(committed[0]).not.toBe('#13b152');
    expect(committed[1]).not.toBe('#ff4d94');

    // Open Recolor with empty selection, then select ONLY object 0 while panel is open
    await page.evaluate(() => (window as any).__geovantaEditorApi.setSelection([]));
    await page.locator('[data-testid="rc-open-styles"]').click();
    await expect(rcSection).toBeVisible();
    await page.evaluate(() => (window as any).__geovantaEditorApi.setSelection(['pink-1']));
    await page.waitForTimeout(60);

    // Switch to Mode 2 (Palette Mapping) and change pink-1 family color
    await page.locator('[data-testid="rc-mode-seg"] button[data-seg-val="mode2"]').click();
    const addTargetBtn = rcSection.locator('[data-testid$="-add"]').first();
    await expect(addTargetBtn).toBeVisible();
    await addTargetBtn.click();
    const hexBox = rcSection.locator('[data-testid^="rc-family-"] [role="textbox"]').first();
    await hexBox.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('#22d3ee');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);

    const applyBtn2 = page.locator('[data-testid="rc-apply"]');
    await expect(applyBtn2).toBeEnabled();
    await applyBtn2.click();
    await expect(rcSection).toBeHidden();

    const afterMode2 = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.map((o: any) => o.fill));
    expect(afterMode2[0]).toBe(committed[0]); // green-1 wasn't selected, stayed untouched
    expect(afterMode2[1]).not.toBe(committed[1]); // pink-1 remapped to cyan family
  });

  test('Feature 3: Solid-to-Gradient creates smooth Linear, Radial, and Angular gradients from 1 pink solid or 2 distinct solid colors', async ({ page }) => {
    await openEditor(page);

    // Case A: Single solid pink (#ff4d94) object
    await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      api.setDoc({
        viewBox: [0, 0, 800, 600],
        objects: [{
          id: 'pink-1',
          name: 'PinkRect',
          type: 'path',
          fill: '#ff4d94',
          stroke: 'none',
          strokeWidth: 0,
          opacity: 1,
          fillRule: 'nonzero',
          group: null,
          subs: [{
            id: 'sp-pink',
            closed: true,
            nodes: [
              { id: 'p0', x: 100, y: 100, type: 'corner', handleIn: null, handleOut: null },
              { id: 'p1', x: 260, y: 100, type: 'corner', handleIn: null, handleOut: null },
              { id: 'p2', x: 260, y: 220, type: 'corner', handleIn: null, handleOut: null },
              { id: 'p3', x: 100, y: 220, type: 'corner', handleIn: null, handleOut: null }
            ]
          }]
        }],
        styles: []
      });
      api.setSelection(['pink-1']);
    });

    const s2gSection = page.locator('[data-testid="solid-to-grad-section"]');
    await expect(s2gSection).toBeVisible();
    await expect(s2gSection.locator('[data-testid="s2g-source-swatches"] [data-color="#ff4d94"]')).toHaveCount(1);

    // 1) Linear gradient from pink
    await page.locator('[data-testid="s2g-preset-tonalGlow"]').click();
    const linearRes = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const o = doc.objects[0];
      return { count: doc.objects.length, grad: o.grad, fill: o.fill };
    });
    expect(linearRes.count).toBe(1);
    expect(linearRes.grad.type).toBe('linear');
    expect(linearRes.grad.oklab).toBe(true);
    expect(linearRes.grad.stops.length).toBeGreaterThanOrEqual(3);
    expect(linearRes.grad.rawStops.some((s: any) => s.color === '#ff4d94')).toBe(true);
    expect(linearRes.grad.rawStops.some((s: any) => s.color === '#a855f7')).toBe(false);

    // 2) Switch to Radial
    await page.locator('[data-testid="s2g-type-seg"] button[data-seg-val="radial"]').click();
    await page.locator('[data-testid="s2g-preset-warmFlow"]').click();
    const radialRes = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const o = doc.objects[0];
      return { count: doc.objects.length, grad: o.grad };
    });
    expect(radialRes.count).toBe(1);
    expect(radialRes.grad.type).toBe('radial');
    expect(radialRes.grad.oklab).toBe(true);
    expect(radialRes.grad.rawStops.some((s: any) => s.color === '#ff4d94')).toBe(true);

    // 3) Switch to Angular (must wrap seamlessly so start & end stops match)
    await page.locator('[data-testid="s2g-type-seg"] button[data-seg-val="angular"]').click();
    await page.locator('[data-testid="s2g-preset-coolFlow"]').click();
    const angularRes = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const o = doc.objects[0];
      const st = o.grad?.stops || [];
      return {
        count: doc.objects.length,
        type: o.grad?.type,
        oklab: o.grad?.oklab,
        firstColor: st[0]?.color,
        lastColor: st[st.length - 1]?.color,
        rawColors: (o.grad?.rawStops || []).map((s: any) => s.color),
        stopsCount: st.length
      };
    });
    expect(angularRes.count).toBe(1);
    expect(angularRes.type).toBe('angular');
    expect(angularRes.oklab).toBe(true);
    expect(angularRes.stopsCount).toBeGreaterThanOrEqual(4);
    expect(angularRes.rawColors).toContain('#ff4d94');
    expect(angularRes.firstColor).toBe(angularRes.lastColor);

    // Case B: Two objects with 2 distinct solid colors (#ff4d94 & #38bdf8) selected together
    await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      api.setDoc({
        viewBox: [0, 0, 800, 600],
        objects: [
          {
            id: 'obj-a',
            name: 'PinkObj',
            type: 'path',
            fill: '#ff4d94',
            stroke: 'none',
            strokeWidth: 0,
            opacity: 1,
            fillRule: 'nonzero',
            group: null,
            subs: [{
              id: 'sp-a',
              closed: true,
              nodes: [
                { id: 'a0', x: 80, y: 100, type: 'corner', handleIn: null, handleOut: null },
                { id: 'a1', x: 180, y: 100, type: 'corner', handleIn: null, handleOut: null },
                { id: 'a2', x: 180, y: 200, type: 'corner', handleIn: null, handleOut: null },
                { id: 'a3', x: 80, y: 200, type: 'corner', handleIn: null, handleOut: null }
              ]
            }]
          },
          {
            id: 'obj-b',
            name: 'CyanObj',
            type: 'path',
            fill: '#38bdf8',
            stroke: 'none',
            strokeWidth: 0,
            opacity: 1,
            fillRule: 'nonzero',
            group: null,
            subs: [{
              id: 'sp-b',
              closed: true,
              nodes: [
                { id: 'b0', x: 220, y: 100, type: 'corner', handleIn: null, handleOut: null },
                { id: 'b1', x: 320, y: 100, type: 'corner', handleIn: null, handleOut: null },
                { id: 'b2', x: 320, y: 200, type: 'corner', handleIn: null, handleOut: null },
                { id: 'b3', x: 220, y: 200, type: 'corner', handleIn: null, handleOut: null }
              ]
            }]
          }
        ],
        styles: []
      });
      api.setSelection(['obj-a', 'obj-b']);
    });

    await expect(s2gSection.locator('[data-testid="s2g-source-swatches"] [data-color="#ff4d94"]')).toHaveCount(1);
    await expect(s2gSection.locator('[data-testid="s2g-source-swatches"] [data-color="#38bdf8"]')).toHaveCount(1);

    await page.locator('[data-testid="s2g-type-seg"] button[data-seg-val="linear"]').click();
    await page.locator('[data-testid="s2g-preset-directBlend"]').click();

    const dualLinear = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      return {
        count: doc.objects.length,
        objs: doc.objects.map((o: any) => ({
          type: o.grad?.type,
          oklab: o.grad?.oklab,
          rawColors: (o.grad?.rawStops || []).map((s: any) => s.color),
          stopsLen: (o.grad?.stops || []).length
        }))
      };
    });
    expect(dualLinear.count).toBe(2);
    for (const o of dualLinear.objs) {
      expect(o.type).toBe('linear');
      expect(o.oklab).toBe(true);
      expect(o.rawColors).toContain('#ff4d94');
      expect(o.rawColors).toContain('#38bdf8');
      expect(o.stopsLen).toBeGreaterThan(2); // OKLab sub-sampled for silky smooth transition
    }

    // Also test Angular on 2 colors -> seamless wrap
    await page.locator('[data-testid="s2g-type-seg"] button[data-seg-val="angular"]').click();
    const dualAngular = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      return doc.objects.map((o: any) => {
        const st = o.grad?.stops || [];
        return {
          type: o.grad?.type,
          rawColors: (o.grad?.rawStops || []).map((s: any) => s.color),
          firstColor: st[0]?.color,
          lastColor: st[st.length - 1]?.color
        };
      });
    });
    for (const o of dualAngular) {
      expect(o.type).toBe('angular');
      expect(o.rawColors).toContain('#ff4d94');
      expect(o.rawColors).toContain('#38bdf8');
      expect(o.firstColor).toBe(o.lastColor);
    }
  });
});
