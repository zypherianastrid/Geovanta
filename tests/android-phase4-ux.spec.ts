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

test.describe('Geovanta Android Phase 4 Core Editor & Home UX Redesign', () => {
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

  test('Mobile 360x800 Home FAB, hidden shortcuts/debug, labeled dock, Selection Bar, Tabbed Inspector, and Action Sheet', async ({ browser }) => {
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

    // 1. Home: Keyboard Shortcuts button hidden on mobile; Material 3 FAB visible and opens Create modal
    await expect(page.locator('.ws-home-header [data-tip="help"]')).toBeHidden();
    const fab = page.getByTestId('mob-home-fab');
    await expect(fab).toBeVisible();
    await fab.click();
    await expect(page.locator('.hp[role="dialog"]')).toBeVisible();
    await page.getByRole('button', { name: /Buat & Buka Proyek|Create & Open/i }).first().click();

    await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined', null, {
      timeout: 25000,
    });
    await page.waitForSelector('.ved-canvas', { state: 'visible' });

    // 2. Debug pill hidden by default on mobile; Gesture coachmark visible & dismissible
    await expect(page.locator('.ved-debug-pill')).toHaveCount(0);
    const hint = page.getByTestId('mobile-gesture-hint');
    await expect(hint).toBeVisible();
    await page.getByTestId('mobile-gesture-hint-close').click();
    await expect(hint).toHaveCount(0);

    // 3. Bottom dock buttons show visible concise labels
    const dockLabels = await page.locator('.fig-floating-bar .mob-tool-lbl').allInnerTexts();
    expect(dockLabels.length).toBeGreaterThanOrEqual(10);
    expect(dockLabels).toContain('Pilih');

    // 4. Create shape -> MobileSelectionActionBar appears with 1-tap Duplicate & Style & Action Sheet More
    await expect(page.getByTestId('mobile-selection-bar')).toHaveCount(0);
    await page.evaluate(() => {
      (window as any).__geovantaEditorApi.createTestShape('rect', 90, 90, 140, 100);
    });
    const selBar = page.getByTestId('mobile-selection-bar');
    await expect(selBar).toBeVisible();

    await page.getByTestId('mob-sel-dup').click();
    const countAfterDup = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.length);
    expect(countAfterDup).toBe(2);

    // Open Action Sheet via "More" button in selection bar -> verify Grid & zero .ctx-k shortcuts
    await page.getByTestId('mob-sel-more').click();
    const actionSheet = page.getByTestId('mobile-action-sheet');
    await expect(actionSheet).toBeVisible();
    expect(await actionSheet.locator('.mob-ctx-card').count()).toBe(4);
    await expect(actionSheet.locator('.ctx-k')).toHaveCount(0);
    await actionSheet.locator('.mob-top-btn').click();
    await expect(actionSheet).toHaveCount(0);

    // 5. Tabbed Draggable Inspector: open Style via selection bar -> verify lazy tabs & low DOM node count
    await page.getByTestId('mob-sel-style').click();
    const sheet = page.getByTestId('mobile-inspector-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('data-sheet-state', 'half');
    await expect(page.getByTestId('mobile-inspector-tabs')).toBeVisible();

    // Duplicate zoom header removed; only active Style tab sections rendered (< 450 nodes inside sheet)
    await expect(sheet.locator('.fig-r-topbar')).toHaveCount(0);
    await expect(sheet.locator('.fig-isec[data-tip="veFill"]')).toBeVisible();
    await expect(sheet.locator('[data-tip="veXfPanel"]')).toHaveCount(0);
    const sheetDomCount = await sheet.locator('*').count();
    expect(sheetDomCount).toBeLessThan(450);

    // Drag sheet header up to expand, then switch tabs
    const hdrBox = await sheet.locator('.mob-sheet-header').boundingBox();
    expect(hdrBox).not.toBeNull();
    await page.mouse.move(hdrBox!.x + hdrBox!.width / 2, hdrBox!.y + hdrBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(hdrBox!.x + hdrBox!.width / 2, hdrBox!.y - 120, { steps: 5 });
    await page.mouse.up();
    await expect(sheet).toHaveAttribute('data-sheet-state', 'expanded');

    await page.getByTestId('mob-insp-tab-transform').click();
    await expect(sheet.locator('[data-tip="veXfPanel"]')).toBeVisible();
    await expect(sheet.locator('.fig-isec[data-tip="veFill"]')).toHaveCount(0);

    await page.getByTestId('mob-insp-tab-tools').click();
    await expect(sheet.locator('.fig-isec[data-tip="veBg"]')).toBeVisible();

    await page.getByTestId('mob-sheet-close-right').click();
    await expect(sheet).toHaveCount(0);

    // 6. Top bar quick Export button opens Inspector directly on Export tab
    await page.getByTestId('mob-export-btn').click();
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-tip="veDownload"]')).toBeVisible();
    await page.getByTestId('mob-sheet-close-right').click();

    // 7. 1-tap Delete from Selection Bar removes selected object
    await page.getByTestId('mob-sel-delete').click();
    const countAfterDel = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.length);
    expect(countAfterDel).toBe(1);

    expect(errors).toEqual([]);
    await context.close();
  });

  test('Desktop regression (1280x800, non-touch) keeps full Inspector, debug pill, no FAB, and desktop ContextMenu', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false,
      isMobile: false,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    await expect(page.getByTestId('mob-home-fab')).toBeHidden();
    await expect(page.locator('.ws-home-header [data-tip="help"]')).toBeVisible();

    await openFreshProject(page);
    await expect(page.locator('.ved-debug-pill')).toBeVisible();
    await expect(page.getByTestId('mobile-inspector-tabs')).toHaveCount(0);
    await expect(page.locator('.fig-right-sidebar .fig-r-topbar')).toBeVisible();
    await expect(page.locator('.fig-right-sidebar [data-tip="veXfPanel"]')).toBeVisible();
    await expect(page.locator('.fig-right-sidebar [data-tip="veExpFmt"]')).toBeVisible();

    // Right click opens desktop floating ContextMenu (not mobile-action-sheet)
    await page.locator('.ved-canvas').click({ button: 'right', position: { x: 200, y: 200 } });
    await expect(page.locator('.ctx[role="menu"]')).toBeVisible();
    await expect(page.getByTestId('mobile-action-sheet')).toHaveCount(0);

    await context.close();
  });
});
