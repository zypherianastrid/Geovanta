import { test, expect } from '@playwright/test';

test.describe('Floating bar shape tool removal and segmented control wrapping', () => {
  test('Floating bar has no shape tool, left rail preserves shape tool, and inspector segmented buttons wrap with nowrap', async ({ page }) => {
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

    // 1. Verify floating toolbar does NOT contain shape button
    const floatingBar = page.locator('.fig-floating-bar');
    await expect(floatingBar).toBeVisible();
    const floatingShapeBtn = floatingBar.locator('[data-tip="veShape"]');
    await expect(floatingShapeBtn).toHaveCount(0);

    // 2. Verify left action rail DOES contain shape button
    const leftRail = page.locator('.fig-nav-dock');
    await expect(leftRail).toBeVisible();
    const railShapeBtn = leftRail.locator('[data-tip="veShape"]');
    await expect(railShapeBtn).toHaveCount(1);
    await expect(railShapeBtn).toBeVisible();

    // 3. Create a test object with stroke and select it to inspect right sidebar
    await page.evaluate(() => {
      const api = window.__geovantaEditorApi;
      api.createTestShape('rect', 150, 150, 100, 100);
    });

    // Wait for inspector to display stroke section
    const linecapSeg = page.locator('[data-testid="stroke-linecap-seg"]');
    await expect(linecapSeg).toBeVisible();

    const linejoinSeg = page.locator('[data-testid="stroke-linejoin-seg"]');
    await expect(linejoinSeg).toBeVisible();

    const dashPresetSeg = page.locator('[data-testid="stroke-dash-preset"]');
    await expect(dashPresetSeg).toBeVisible();

    // Check linecap segmented control container and buttons
    const linecapWrap = await linecapSeg.evaluate((el) => window.getComputedStyle(el).flexWrap);
    expect(linecapWrap).toBe('wrap');

    const linecapButtons = linecapSeg.locator('button');
    const capCount = await linecapButtons.count();
    expect(capCount).toBe(3);

    for (let i = 0; i < capCount; i++) {
      const btn = linecapButtons.nth(i);
      const ws = await btn.evaluate((el) => window.getComputedStyle(el).whiteSpace);
      expect(ws).toBe('nowrap');
      const text = await btn.innerText();
      expect(text.trim().length).toBeGreaterThan(2);
      expect(text).not.toContain('..');
    }

    // Check linejoin segmented control container and buttons
    const linejoinWrap = await linejoinSeg.evaluate((el) => window.getComputedStyle(el).flexWrap);
    expect(linejoinWrap).toBe('wrap');

    const linejoinButtons = linejoinSeg.locator('button');
    const joinCount = await linejoinButtons.count();
    expect(joinCount).toBe(3);

    for (let i = 0; i < joinCount; i++) {
      const btn = linejoinButtons.nth(i);
      const ws = await btn.evaluate((el) => window.getComputedStyle(el).whiteSpace);
      expect(ws).toBe('nowrap');
      const text = await btn.innerText();
      expect(text.trim().length).toBeGreaterThan(2);
      expect(text).not.toContain('..');
    }

    // Check dash preset segmented control container and buttons
    const dashPresetWrap = await dashPresetSeg.evaluate((el) => window.getComputedStyle(el).flexWrap);
    expect(dashPresetWrap).toBe('wrap');

    const dashButtons = dashPresetSeg.locator('button');
    const dashCount = await dashButtons.count();
    expect(dashCount).toBe(5);

    for (let i = 0; i < dashCount; i++) {
      const btn = dashButtons.nth(i);
      const ws = await btn.evaluate((el) => window.getComputedStyle(el).whiteSpace);
      expect(ws).toBe('nowrap');
      const text = await btn.innerText();
      expect(text.trim().length).toBeGreaterThan(2);
      expect(text).not.toContain('..');
    }
  });
});
