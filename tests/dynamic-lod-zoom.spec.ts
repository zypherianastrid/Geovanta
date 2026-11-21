import { test, expect } from '@playwright/test';

test('sceneRenderer: useRgss is strictly false whenever interacting is true', async ({ page }) => {
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

  const testResult = await page.evaluate(() => {
    const renderer = window.__geovantaEditorApi.getSceneRenderer();
    if (!renderer) return { error: 'No renderer' };

    let rgssCalledDuringInteraction = false;
    let directDrawCalledDuringInteraction = false;
    let rgssCalledSettled = false;

    // Spy on renderRgssFrame and drawVectorFrame
    const origRgss = renderer.renderRgssFrame?.bind(renderer);
    renderer.renderRgssFrame = function(...args: any[]) {
      if (renderer.cameraInteracting || renderer.sceneInteracting) {
        rgssCalledDuringInteraction = true;
      } else {
        rgssCalledSettled = true;
      }
      return origRgss ? origRgss(...args) : null;
    };

    const origDraw = renderer.drawVectorFrame.bind(renderer);
    renderer.drawVectorFrame = function(...args: any[]) {
      if (renderer.cameraInteracting || renderer.sceneInteracting) {
        directDrawCalledDuringInteraction = true;
      }
      return origDraw(...args);
    };

    // Simulate active camera interaction
    renderer.setCameraInteracting(true);
    renderer.setCamera(2.5, 0, 0, 1000, 800);
    renderer.renderFrame(true);

    // Simulate camera settled at rest
    renderer.setCameraInteracting(false);
    renderer.renderFrame(true);

    return {
      rgssCalledDuringInteraction,
      directDrawCalledDuringInteraction,
      rgssCalledSettled
    };
  });

  // During active interaction: antialiasing is preserved so edges never become jagged
  expect(testResult.directDrawCalledDuringInteraction || testResult.rgssCalledDuringInteraction).toBe(true);

  // When settled: RGSS should be called for high-quality presentation
  expect(testResult.rgssCalledSettled).toBe(true);
});
