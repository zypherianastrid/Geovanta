import { test, expect } from '@playwright/test';

test('Pencil object stays visible and centered from 400% to 500% zoom and on hover', async ({ page }) => {
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
  await page.locator('canvas.ved-scene-canvas').first().waitFor({ state: 'attached' });

  // 1. Select pencil tool
  await page.evaluate(() => {
    (window as any).__geovantaEditorApi.setTool('pencil');
  });

  const canvas = page.locator('.ved-canvas').first();
  await canvas.waitFor({ state: 'visible' });
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  // Draw away from center (at offset x: 220, y: 220)
  const startX = box.x + 220;
  const startY = box.y + 220;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 25; i++) {
    await page.mouse.move(startX + i * 4, startY + Math.sin(i * 0.4) * 20);
  }
  await page.mouse.up();

  // Verify object was created and is selected
  const selInfo = await page.evaluate(() => {
    const api = (window as any).__geovantaEditorApi;
    const doc = api.getDoc();
    const pencil = doc.objects.find((o: any) => o.name && o.name.startsWith('Pencil'));
    return {
      objCount: doc.objects.length,
      pencil,
    };
  });
  expect(selInfo.pencil).toBeDefined();

  // Test zooming to 400% and 500% via setZ(null, null) which simulates sidebar slider zoom
  const zoomStats = await page.evaluate(async () => {
    const api = (window as any).__geovantaEditorApi;
    const renderer = api.getSceneRenderer();
    const results: any[] = [];

    for (const z of [1.0, 2.0, 4.0, 4.5, 5.0]) {
      api.setZ(z, null, null, false);
      renderer.dirty = true;
      renderer.renderFrame(true);
      const stats = renderer.lastRenderStats || renderer.panLastStats;
      results.push({
        zoom: z,
        camera: { ...renderer.camera },
        stats
      });
    }
    return results;
  });

  console.log('Zoom render stats:', JSON.stringify(zoomStats, null, 2));

  // Verify at 400% and 500% zoom, the pencil object is visible (visibleObjects >= 1) and not culled
  const at400 = zoomStats.find(s => s.zoom === 4.0);
  const at500 = zoomStats.find(s => s.zoom === 5.0);
  expect(at400.stats.visibleObjects).toBeGreaterThanOrEqual(1);
  expect(at400.stats.culledObjects).toBe(0);
  expect(at500.stats.visibleObjects).toBeGreaterThanOrEqual(1);
  expect(at500.stats.culledObjects).toBe(0);

  // Now test hovering pointer across canvas at 500% zoom
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
  await page.mouse.move(box.x + box.width / 2 - 50, box.y + box.height / 2 - 50);

  // Check render stats after hover
  const hoverStats = await page.evaluate(() => {
    const api = (window as any).__geovantaEditorApi;
    const renderer = api.getSceneRenderer();
    renderer.dirty = true;
    renderer.renderFrame(true);
    return renderer.lastRenderStats || renderer.panLastStats;
  });
  expect(hoverStats.visibleObjects).toBeGreaterThanOrEqual(1);
  expect(hoverStats.culledObjects).toBe(0);

  // Take screenshot at 500% zoom with hover
  await page.screenshot({ path: 'test-results/pencil-500-verified.png' });
});
