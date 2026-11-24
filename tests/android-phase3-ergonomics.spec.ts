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
    timeout: 25000,
  });
  await page.waitForSelector('.ved-canvas', { state: 'visible' });
}

test.describe('Geovanta Android Phase 3 Landscape & Touch Ergonomics', () => {
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

  test('Android Landscape (800x360, touch) stays in mobile mode with side-sheet Inspector and >= 780px wide canvas', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 800, height: 360 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(url, { waitUntil: 'networkidle' });
    await openFreshProject(page);

    const attrs = await page.evaluate(() => ({
      mobile: document.documentElement.getAttribute('data-mobile'),
      touch: document.documentElement.getAttribute('data-touch'),
      orientation: document.documentElement.getAttribute('data-orientation'),
    }));
    expect(attrs.mobile).toBe('1');
    expect(attrs.touch).toBe('1');
    expect(attrs.orientation).toBe('landscape');

    await expect(page.getByTestId('mobile-editor-topbar')).toBeVisible();
    await expect(page.locator('.fig-left-sidebar')).toHaveCount(0);
    await expect(page.locator('.fig-right-sidebar')).toHaveCount(0);

    const canvasBox = await page.locator('.ved-canvas').boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThanOrEqual(780);
    expect(canvasBox!.height).toBeGreaterThanOrEqual(280);

    await page.getByTestId('mob-inspector-btn').click();
    const sheet = page.getByTestId('mobile-inspector-sheet');
    await expect(sheet).toBeVisible();
    const sheetBox = await sheet.boundingBox();
    expect(sheetBox).not.toBeNull();
    expect(sheetBox!.width).toBeLessThanOrEqual(420);
    expect(sheetBox!.x).toBeGreaterThanOrEqual(380);

    expect(errors).toEqual([]);
    await context.close();
  });

  test('Mobile 360x800 enforces >= 44-48px targets, hides 20px chevrons, enlarges handles, and supports 2-finger Undo / 3-finger Redo', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(url, { waitUntil: 'networkidle' });
    await openFreshProject(page);

    // 1. Touch target dimensions & no cramped 20px chevrons
    const targetSizes = await page.evaluate(() => {
      const topBtns = Array.from(document.querySelectorAll('.mob-top-btn')).map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.getAttribute('data-testid'), w: Math.round(r.width), h: Math.round(r.height) };
      });
      const dockBtns = Array.from(document.querySelectorAll('.fig-floating-bar .tool-btn:not(.chev-btn)')).map((el) => {
        const r = el.getBoundingClientRect();
        return { tip: el.getAttribute('data-tip'), w: Math.round(r.width), h: Math.round(r.height) };
      });
      const visibleChevs = Array.from(document.querySelectorAll('.fig-floating-bar .chev-btn')).filter(
        (el) => getComputedStyle(el).display !== 'none'
      ).length;
      return { topBtns, dockBtns, visibleChevs };
    });

    expect(targetSizes.visibleChevs).toBe(0);
    for (const b of targetSizes.topBtns) {
      expect(b.w, `topBtn ${b.id} width`).toBeGreaterThanOrEqual(44);
      expect(b.h, `topBtn ${b.id} height`).toBeGreaterThanOrEqual(44);
    }
    for (const b of targetSizes.dockBtns) {
      expect(b.w, `dockBtn ${b.tip} width`).toBeGreaterThanOrEqual(48);
      expect(b.h, `dockBtn ${b.tip} height`).toBeGreaterThanOrEqual(48);
    }

    // 2. Tap-again on .has-sub group button opens popover
    const subBtn = page.locator('.fig-floating-bar .tool-btn.has-sub').first();
    await subBtn.click();
    await subBtn.click();
    await expect(page.locator('.flt').first()).toBeVisible();
    await page.locator('.ved-canvas').click({ position: { x: 20, y: 100 } });

    // Switch back to Select tool for handle & multi-tap checks
    await page.locator('.fig-floating-bar .tool-btn').first().click();

    // 3. Create shape -> check enlarged ~12px mobile handles
    await page.evaluate(() => {
      (window as any).__geovantaEditorApi.createTestShape('rect', 90, 90, 150, 110);
    });
    await page.waitForTimeout(150);

    const handlePx = await page.evaluate(() => {
      const z = (window as any).__geovantaEditorApi.getZoom();
      const rect = document.querySelector('.vc-bbox-overlay rect[data-hx]') as SVGRectElement;
      const w = parseFloat(rect.getAttribute('width') || '0');
      return Math.round(w * z * 10) / 10;
    });
    expect(handlePx).toBeCloseTo(12, 1);

    const countBefore = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.length);
    expect(countBefore).toBe(1);

    // 4. Real pinch-zoom (>14px move) must NOT trigger Undo
    await page.evaluate(async () => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const fire = (type: string, id: number, x: number, y: number) => {
        el.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
          isPrimary: id === 501, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1
        }));
      };
      fire('pointerdown', 501, cx - 20, cy);
      fire('pointerdown', 502, cx + 20, cy);
      fire('pointermove', 501, cx - 60, cy);
      fire('pointermove', 502, cx + 60, cy);
      fire('pointerup', 501, cx - 60, cy);
      fire('pointerup', 502, cx + 60, cy);
    });
    await page.waitForTimeout(100);
    const countAfterPinch = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.length);
    expect(countAfterPinch).toBe(1);

    // 5. 2-finger quick tap -> Undo
    await page.evaluate(async () => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width * 0.25;
      const cy = r.top + r.height * 0.25;
      const fire = (type: string, id: number, x: number, y: number) => {
        el.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
          isPrimary: id === 401, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1
        }));
      };
      fire('pointerdown', 401, cx - 15, cy);
      fire('pointerdown', 402, cx + 15, cy);
      await new Promise((res) => setTimeout(res, 40));
      fire('pointerup', 401, cx - 15, cy);
      fire('pointerup', 402, cx + 15, cy);
    });
    await page.waitForTimeout(150);
    const countAfterUndo = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.length);
    expect(countAfterUndo).toBe(0);

    // 6. 3-finger quick tap -> Redo
    await page.evaluate(async () => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width * 0.25;
      const cy = r.top + r.height * 0.25;
      const fire = (type: string, id: number, x: number, y: number) => {
        el.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
          isPrimary: id === 403, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1
        }));
      };
      fire('pointerdown', 403, cx - 30, cy);
      fire('pointerdown', 404, cx, cy);
      fire('pointerdown', 405, cx + 30, cy);
      await new Promise((res) => setTimeout(res, 40));
      fire('pointerup', 403, cx - 30, cy);
      fire('pointerup', 404, cx, cy);
      fire('pointerup', 405, cx + 30, cy);
    });
    await page.waitForTimeout(150);
    const countAfterRedo = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.length);
    expect(countAfterRedo).toBe(1);

    expect(errors).toEqual([]);
    await context.close();
  });

  test('Desktop regression (1280x800, non-touch) keeps data-mobile null, visible chevrons, and 6px handles', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false,
      isMobile: false,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await openFreshProject(page);

    const desktopInfo = await page.evaluate(() => {
      (window as any).__geovantaEditorApi.createTestShape('rect', 100, 100, 140, 100);
      const z = (window as any).__geovantaEditorApi.getZoom();
      const chevs = Array.from(document.querySelectorAll('.fig-floating-bar .chev-btn')).filter(
        (el) => getComputedStyle(el).display !== 'none'
      ).length;
      return {
        dataMobile: document.documentElement.getAttribute('data-mobile'),
        orientation: document.documentElement.getAttribute('data-orientation'),
        visibleChevs: chevs,
        z,
      };
    });
    await page.waitForTimeout(100);
    const handlePx = await page.evaluate(() => {
      const z = (window as any).__geovantaEditorApi.getZoom();
      const rect = document.querySelector('.vc-bbox-overlay rect[data-hx]') as SVGRectElement;
      return Math.round(parseFloat(rect.getAttribute('width') || '0') * z * 10) / 10;
    });

    expect(desktopInfo.dataMobile).toBeNull();
    expect(desktopInfo.orientation).toBe('landscape');
    expect(desktopInfo.visibleChevs).toBeGreaterThanOrEqual(4);
    expect(handlePx).toBeCloseTo(6, 1);

    await context.close();
  });
});
