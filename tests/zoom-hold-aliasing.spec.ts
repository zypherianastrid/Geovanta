import { test, expect } from '@playwright/test';

test('Antialiasing during zoom hold (mouse wheel and right sidebar slider) is smooth with zero jaggies', async ({ page }) => {
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
  const canvas = page.locator('.ved-canvas').first();
  await canvas.waitFor({ state: 'visible' });

  // 1. Add curved circular test object
  await page.evaluate(() => {
    const api = (window as any).__geovantaEditorApi;
    const circle = {
      id: 'test-circle',
      name: 'Circle-Test',
      type: 'path',
      fill: '#000000',
      stroke: 'none',
      strokeWidth: 0,
      opacity: 1,
      subs: [
        {
          id: 'sub-c',
          closed: true,
          nodes: [
            { id: 'n1', x: 200, y: 100, handleIn: { x: 144.77, y: 100 }, handleOut: { x: 255.23, y: 100 }, type: 'smooth' },
            { id: 'n2', x: 300, y: 200, handleIn: { x: 300, y: 144.77 }, handleOut: { x: 300, y: 255.23 }, type: 'smooth' },
            { id: 'n3', x: 200, y: 300, handleIn: { x: 255.23, y: 300 }, handleOut: { x: 144.77, y: 300 }, type: 'smooth' },
            { id: 'n4', x: 100, y: 200, handleIn: { x: 100, y: 255.23 }, handleOut: { x: 100, y: 144.77 }, type: 'smooth' }
          ]
        }
      ]
    };
    const doc = api.getDoc();
    api.commitDoc({ ...doc, objects: [circle] });
  });

  // 2. Test holding zoom on sidebar slider (soft zoom with cameraInteracting = true)
  const sliderHoldResult = await page.evaluate(() => {
    const api = (window as any).__geovantaEditorApi;
    const renderer = api.getSceneRenderer();

    // Simulate sidebar slider dragging / holding
    api.setZ(1.8, null, null, true);
    renderer.setCameraInteracting(true);
    renderer.dirty = true;
    renderer.renderFrame(true);

    const canvasEl = renderer.canvasEl;
    const ctx = canvasEl.getContext('2d');
    let intermediateCount = 0;
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      const data = imgData.data;
      for (let i = 3; i < data.length; i += 4) {
        const a = data[i];
        if (a > 10 && a < 245) intermediateCount++;
      }
    }
    return intermediateCount;
  });

  console.log('Sidebar zoom hold intermediate edge pixels:', sliderHoldResult);
  expect(sliderHoldResult).toBeGreaterThan(200);

  // 3. Test holding zoom on mouse wheel (soft zoom with wheel interaction)
  const wheelHoldResult = await page.evaluate(() => {
    const api = (window as any).__geovantaEditorApi;
    const renderer = api.getSceneRenderer();

    // Simulate wheel zoom action held
    api.setZ(2.2, 400, 300, true);
    renderer.setCameraInteracting(true);
    renderer.dirty = true;
    renderer.renderFrame(true);

    const canvasEl = renderer.canvasEl;
    const ctx = canvasEl.getContext('2d');
    let intermediateCount = 0;
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      const data = imgData.data;
      for (let i = 3; i < data.length; i += 4) {
        const a = data[i];
        if (a > 10 && a < 245) intermediateCount++;
      }
    }
    return intermediateCount;
  });

  console.log('Wheel zoom hold intermediate edge pixels:', wheelHoldResult);
  expect(wheelHoldResult).toBeGreaterThan(200);

  // 4. Test after zoom is released
  const releaseResult = await page.evaluate(() => {
    const api = (window as any).__geovantaEditorApi;
    const renderer = api.getSceneRenderer();

    renderer.setCameraInteracting(false);
    renderer.dirty = true;
    renderer.renderFrame(true);

    const canvasEl = renderer.canvasEl;
    const ctx = canvasEl.getContext('2d');
    let intermediateCount = 0;
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      const data = imgData.data;
      for (let i = 3; i < data.length; i += 4) {
        const a = data[i];
        if (a > 10 && a < 245) intermediateCount++;
      }
    }
    return intermediateCount;
  });

  console.log('Released zoom intermediate edge pixels:', releaseResult);
  expect(releaseResult).toBeGreaterThan(200);
});
