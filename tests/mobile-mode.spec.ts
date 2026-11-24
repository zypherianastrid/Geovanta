import { test, expect, Page } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const WEB_DIR = path.resolve(__dirname, '../web');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
};

function startStaticServer(rootDir: string): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(rootDir, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
  });
}

async function openFreshProject(page: Page) {
  const createBtn = page.getByRole('button', { name: /Create New/i }).first();
  await createBtn.waitFor({ state: 'visible', timeout: 15000 });
  await createBtn.click();
  const submitBtn = page.getByRole('button', { name: /Buat & Buka Proyek|Create & Open/i }).first();
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
  await submitBtn.click();
  await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined', null, {
    timeout: 20000,
  });
  await page.waitForSelector('.ved-canvas', { state: 'visible' });
}

test.describe('Geovanta Dedicated Mobile Mode (<= 768px)', () => {
  let server: http.Server;
  let url: string;

  test.beforeAll(async () => {
    const started = await startStaticServer(WEB_DIR);
    server = started.server;
    url = started.url;
  });

  test.afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('WorkspaceHome on 375x812 and 768x1024 has horizontal nav, zero overflow, and bottom-sheet modals', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url, { waitUntil: 'networkidle' });

    const rootMobileAttr = await page.evaluate(() => document.documentElement.getAttribute('data-mobile'));
    expect(rootMobileAttr).toBe('1');

    const wsOverflow375 = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      navDir: getComputedStyle(document.querySelector('.ws-nav-list') as Element).flexDirection,
      subVisible: getComputedStyle(document.querySelector('.ws-nav-sub') as Element).display,
    }));
    expect(wsOverflow375.scrollW).toBeLessThanOrEqual(wsOverflow375.innerW);
    expect(wsOverflow375.navDir).toBe('row');
    expect(wsOverflow375.subVisible).toBe('none');

    // Open Create New modal and verify it fits cleanly inside 375px viewport
    await page.getByRole('button', { name: /Create New/i }).first().click();
    const dlg = page.locator('.hp[role="dialog"]');
    await dlg.waitFor({ state: 'visible' });
    const dlgBox = await dlg.boundingBox();
    expect(dlgBox).not.toBeNull();
    expect(dlgBox!.x).toBeGreaterThanOrEqual(0);
    expect(dlgBox!.x + dlgBox!.width).toBeLessThanOrEqual(375.5);

    // Close Create New modal and check Settings modal on 375px
    await page.getByRole('button', { name: /Batal|Cancel/i }).first().click();
    await page.locator('[data-tip="settings"]').first().click();
    const stg = page.locator('.stg-modal');
    await stg.waitFor({ state: 'visible' });
    const stgMetrics = await page.evaluate(() => {
      const m = document.querySelector('.stg-modal') as HTMLElement;
      const r = m.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        scrollW: m.scrollWidth,
        clientW: m.clientWidth,
        innerW: window.innerWidth,
      };
    });
    expect(stgMetrics.left).toBeGreaterThanOrEqual(0);
    expect(stgMetrics.right).toBeLessThanOrEqual(375.5);
    expect(stgMetrics.scrollW).toBeLessThanOrEqual(stgMetrics.clientW + 2);
    await expect(stg.locator('.abt-ver', { hasText: 'v1.2.0' })).toHaveCount(1);
    await stg.locator('button[data-tip="closeDlg"]').click();

    // Check tablet portrait boundary (exact 768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);
    const mobile768 = await page.evaluate(() => ({
      attr: document.documentElement.getAttribute('data-mobile'),
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      cols: getComputedStyle(document.querySelector('.ws-project-grid') || document.body).gridTemplateColumns,
    }));
    expect(mobile768.attr).toBe('1');
    expect(mobile768.scrollW).toBeLessThanOrEqual(mobile768.innerW);
    expect(errors).toEqual([]);
  });

  test('VectorEditor on 375x812 provides full canvas, top bar, mutually exclusive bottom sheets, scrollable dock, clamped popovers, and suppressed tooltips', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await openFreshProject(page);

    // 1. Mobile Top Bar visible, sidebars closed by default, full-height canvas
    const topbar = page.getByTestId('mobile-editor-topbar');
    await expect(topbar).toBeVisible();
    await expect(page.getByTestId('mobile-layers-sheet')).toHaveCount(0);
    await expect(page.getByTestId('mobile-inspector-sheet')).toHaveCount(0);

    const layoutMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('.ved-canvas') as HTMLElement;
      const bar = document.querySelector('.fig-floating-bar') as HTMLElement;
      const cr = canvas.getBoundingClientRect();
      const br = bar.getBoundingClientRect();
      const barStyle = getComputedStyle(bar);
      bar.scrollLeft = 80;
      const scrolledLeft = bar.scrollLeft;
      bar.scrollLeft = 0;
      return {
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        docOverflow: getComputedStyle(document.querySelector('.ved-root.ved-full') as Element).overflow,
        canvasH: cr.height,
        canvasW: cr.width,
        barLeft: br.left,
        barRight: br.right,
        barBottom: br.bottom,
        barOverflowX: barStyle.overflowX,
        barScrollbarW: barStyle.scrollbarWidth,
        barScrollW: bar.scrollWidth,
        barClientW: bar.clientWidth,
        barScrolledLeft: scrolledLeft,
      };
    });
    expect(layoutMetrics.scrollW).toBeLessThanOrEqual(layoutMetrics.innerW);
    expect(layoutMetrics.docOverflow).toBe('hidden');
    expect(layoutMetrics.canvasW).toBeGreaterThanOrEqual(370);
    expect(layoutMetrics.canvasH).toBeGreaterThanOrEqual(700);
    expect(layoutMetrics.barLeft).toBeGreaterThanOrEqual(0);
    expect(layoutMetrics.barRight).toBeLessThanOrEqual(375.5);
    expect(layoutMetrics.barBottom).toBeLessThanOrEqual(812.5);
    expect(layoutMetrics.barOverflowX).toBe('auto');
    expect(layoutMetrics.barScrollbarW).toBe('thin');
    expect(layoutMetrics.barScrollW).toBeGreaterThan(layoutMetrics.barClientW);
    expect(layoutMetrics.barScrolledLeft).toBeGreaterThan(0);

    // 2. Create a shape via API so Inspector has active controls, and verify mutually exclusive sheets
    await page.evaluate(() => {
      (window as any).__geovantaEditorApi.createTestShape('rect', 120, 120, 180, 120);
    });

    await page.getByTestId('mob-layers-btn').click();
    await expect(page.getByTestId('mobile-layers-sheet')).toBeVisible();
    await expect(page.getByTestId('mobile-inspector-sheet')).toHaveCount(0);

    await page.getByTestId('mob-inspector-btn').click();
    await expect(page.getByTestId('mobile-inspector-sheet')).toBeVisible();
    await expect(page.getByTestId('mobile-layers-sheet')).toHaveCount(0);

    const sheetBox = await page.getByTestId('mobile-inspector-sheet').boundingBox();
    expect(sheetBox).not.toBeNull();
    expect(sheetBox!.x).toBeGreaterThanOrEqual(0);
    expect(sheetBox!.x + sheetBox!.width).toBeLessThanOrEqual(375.5);

    // Backdrop click closes open sheet
    await page.getByTestId('mobile-sheet-backdrop').click({ position: { x: 180, y: 100 } });
    await expect(page.getByTestId('mobile-inspector-sheet')).toHaveCount(0);

    // 3. Quick Actions Rail strip opens and fits cleanly
    await page.getByTestId('mob-rail-btn').click();
    const railSheet = page.getByTestId('mobile-rail-sheet');
    await expect(railSheet).toBeVisible();
    const railBox = await railSheet.boundingBox();
    expect(railBox!.x).toBeGreaterThanOrEqual(0);
    expect(railBox!.x + railBox!.width).toBeLessThanOrEqual(375.5);
    await page.getByTestId('mob-rail-btn').click();
    await expect(railSheet).toHaveCount(0);

    // 4. Floating toolbar chevron popover opens clamped inside 375px viewport
    await page.locator('.fig-floating-bar .chev-btn').first().click();
    const flt = page.locator('.flt').first();
    await flt.waitFor({ state: 'visible' });
    const fltBox = await flt.boundingBox();
    expect(fltBox).not.toBeNull();
    expect(fltBox!.x).toBeGreaterThanOrEqual(0);
    expect(fltBox!.x + fltBox!.width).toBeLessThanOrEqual(375.5);
    expect(fltBox!.y).toBeGreaterThanOrEqual(0);

    // Close popover via canvas click
    await page.locator('.ved-canvas').click({ position: { x: 20, y: 80 } });

    // 5. Hovering a [data-tip] control on mobile does NOT render desktop hover tooltip
    const firstTool = page.locator('.fig-floating-bar [data-tip]').first();
    await firstTool.hover();
    await page.waitForTimeout(500);
    await expect(page.locator('.tt')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('VectorEditor on 375x812 supports two-finger pinch-to-zoom and touch long-press context menu', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await openFreshProject(page);

    const zoomBefore = await page.evaluate(() => (window as any).__geovantaEditorApi.getZoom());

    // Simulate two-finger pinch-out gesture on .ved-canvas
    await page.evaluate(async () => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      const fire = (type: string, id: number, x: number, y: number) => {
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: id,
            pointerType: 'touch',
            isPrimary: id === 101,
            clientX: x,
            clientY: y,
            button: type === 'pointerdown' ? 0 : -1,
            buttons: type === 'pointerup' ? 0 : 1,
          })
        );
      };

      fire('pointerdown', 101, cx - 25, cy);
      fire('pointerdown', 102, cx + 25, cy);

      for (let step = 1; step <= 4; step++) {
        const half = 25 + step * 25;
        fire('pointermove', 101, cx - half, cy);
        fire('pointermove', 102, cx + half, cy);
        await new Promise((res) => setTimeout(res, 16));
      }

      fire('pointerup', 101, cx - 125, cy);
      fire('pointerup', 102, cx + 125, cy);
    });

    await page.waitForTimeout(220);
    const zoomAfter = await page.evaluate(() => (window as any).__geovantaEditorApi.getZoom());
    expect(zoomAfter).toBeGreaterThan(zoomBefore * 1.5);

    // Simulate single-finger long-press on .ved-canvas -> opens clamped context menu
    await page.evaluate(() => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 201,
          pointerType: 'touch',
          isPrimary: true,
          clientX: r.left + r.width * 0.85,
          clientY: r.top + r.height * 0.5,
          button: 0,
          buttons: 1,
        })
      );
    });
    await page.waitForTimeout(650);
    const ctxMenu = page.locator('.ctx[role="menu"]');
    await expect(ctxMenu).toBeVisible();
    const ctxBox = await ctxMenu.boundingBox();
    expect(ctxBox).not.toBeNull();
    expect(ctxBox!.x).toBeGreaterThanOrEqual(0);
    expect(ctxBox!.x + ctxBox!.width).toBeLessThanOrEqual(375.5);

    await page.evaluate(() => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      el.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerId: 201,
          pointerType: 'touch',
          isPrimary: true,
          clientX: 300,
          clientY: 400,
          button: 0,
          buttons: 0,
        })
      );
    });

    expect(errors).toEqual([]);
  });

  test('Desktop regression (1280x800): keeps desktop sidebars open and disables mobile topbar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle' });

    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-mobile'));
    expect(attr).toBeNull();

    await openFreshProject(page);

    await expect(page.getByTestId('mobile-editor-topbar')).toHaveCount(0);
    await expect(page.locator('.fig-left-sidebar')).toBeVisible();
    await expect(page.locator('.fig-right-sidebar')).toBeVisible();
    await expect(page.locator('.fig-nav-rail')).toBeVisible();
  });
});
