import { test, expect } from '@playwright/test';

test('Context menu hover is smooth, performant, and has no listener churn', async ({ page }) => {
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

  // Instrument document.addEventListener / removeEventListener to count churn
  await page.evaluate(() => {
    (window as any).__listenerCounts = { added: 0, removed: 0 };
    const origAdd = document.addEventListener.bind(document);
    const origRemove = document.removeEventListener.bind(document);
    document.addEventListener = function (...args: any[]) {
      (window as any).__listenerCounts.added++;
      return origAdd(...args);
    };
    document.removeEventListener = function (...args: any[]) {
      (window as any).__listenerCounts.removed++;
      return origRemove(...args);
    };
  });

  // Right-click on canvas to open Context Menu
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });

  const ctxMenu = page.locator('.ctx');
  await ctxMenu.waitFor({ state: 'visible' });

  // Reset counters right after menu opens
  await page.evaluate(() => {
    (window as any).__listenerCounts = { added: 0, removed: 0 };
  });

  // Get all menu item buttons
  const items = page.locator('.ctx .ctx-i:not(:disabled)');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  // Hover over first 10 items rapidly
  for (let i = 0; i < Math.min(10, count); i++) {
    await items.nth(i).hover();
    await page.waitForTimeout(16); // 1 frame
  }

  // Verify that during hovering, NO event listeners were re-added or removed!
  const churn = await page.evaluate(() => (window as any).__listenerCounts);
  console.log('Event listener churn during hover:', churn);
  expect(churn.added).toBe(0);
  expect(churn.removed).toBe(0);

  // Test keyboard navigation (ArrowDown / ArrowUp)
  await page.keyboard.press('ArrowDown');
  const hiItem = page.locator('.ctx .ctx-i.hi');
  await expect(hiItem).toBeVisible();

  // Test keyboard Escape to close menu
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await expect(ctxMenu).not.toBeVisible();
});
