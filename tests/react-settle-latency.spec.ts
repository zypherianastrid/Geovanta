import { test, expect } from '@playwright/test';

test('VectorEditor: flushView does not block the main thread longer than 16ms', async ({ page }) => {
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

  // Populate with test shapes so the component tree has objects
  await page.evaluate(() => {
    const api = window.__geovantaEditorApi;
    for (let i = 0; i < 20; i++) {
      api.createTestShape('rect', 50 + i * 20, 50 + i * 20, 100, 100);
    }
  });

  const breakdown = await page.evaluate(() => {
    const api = window.__geovantaEditorApi;
    const curZ = api.getZoom();
    const renderer = api.getSceneRenderer ? api.getSceneRenderer() : null;

    // Test soft = false
    const t0 = performance.now();
    api.setZ(curZ * 1.05, null, null, false);
    const setZDuration = performance.now() - t0;

    return { setZDuration };
  });

  console.log('Breakdown:', breakdown);
  expect(breakdown.setZDuration).toBeLessThan(16.0);
});
