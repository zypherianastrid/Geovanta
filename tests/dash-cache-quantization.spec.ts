import { test, expect } from '@playwright/test';

test('canvasKitScene: reuses cached MakeDash effect across continuous micro-zoom steps', async ({ page }) => {
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

  await page.waitForFunction(() => typeof window.__geovantaEditorApi !== 'undefined');

  const cacheMisses = await page.evaluate(() => {
    const renderer = window.__geovantaEditorApi.getSceneRenderer();
    const scene = renderer.scene;
    let makeCount = 0;

    const origMake = scene.kit.PathEffect.MakeDash.bind(scene.kit.PathEffect);
    scene.kit.PathEffect.MakeDash = function(...args: any[]) {
      makeCount++;
      return origMake(...args);
    };

    const dashedObj = {
      id: 'test_dash_obj',
      name: 'DashObj',
      type: 'path',
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
      nonScalingStroke: true,
      strokeDasharray: '6,6',
      strokeDashoffset: 0,
      opacity: 1,
      subs: [{ id: 's1', closed: false, nodes: [{ id: 'n1', x: 0, y: 0 }, { id: 'n2', x: 100, y: 100 }] }]
    };

    renderer.renderFrame(true);
    const canvas = renderer.surface.getCanvas();
    const path = scene.path(dashedObj).path;

    // Simulate 20 continuous micro-zoom frames
    for (let i = 0; i < 20; i++) {
      const z = 1.0 + i * 0.005; // 1.000, 1.005, 1.010, ...
      scene.drawVector(canvas, dashedObj, path, 0, 0, z, false, true, 1, true);
    }

    return makeCount;
  });

  // Without quantization, makeCount is 20 (100% cache-miss).
  // With logarithmic quantization, makeCount should be < 5.
  expect(cacheMisses).toBeLessThan(5);
});
