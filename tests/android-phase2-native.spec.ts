import { test, expect } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT_DIR, 'web');

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

test.describe('Geovanta Android Phase 2 Native Integration', () => {
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

  test('Android native Manifest, MainActivity, ProGuard, and Gradle release config are hardened', () => {
    const manifest = fs.readFileSync(
      path.join(ROOT_DIR, 'android/app/src/main/AndroidManifest.xml'),
      'utf8'
    );
    expect(manifest).toContain('android:largeHeap="true"');
    expect(manifest).toContain('android:windowSoftInputMode="adjustResize"');

    const mainActivity = fs.readFileSync(
      path.join(ROOT_DIR, 'android/app/src/main/java/com/geovanta/vectorstudio/MainActivity.java'),
      'utf8'
    );
    expect(mainActivity).toContain('OVER_SCROLL_NEVER');
    expect(mainActivity).toContain('getBridge()');

    const gradle = fs.readFileSync(path.join(ROOT_DIR, 'android/app/build.gradle'), 'utf8');
    expect(gradle).toContain('minifyEnabled true');
    expect(gradle).toContain('shrinkResources true');

    const proguard = fs.readFileSync(path.join(ROOT_DIR, 'android/app/proguard-rules.pro'), 'utf8');
    expect(proguard).toContain('com.getcapacitor.**');
    expect(proguard).toContain('com.capacitorjs.**');
  });

  test('StatusBar sync, Back button hierarchy, long-press haptics, double-back exit, and native export work on Android', async ({ browser }) => {
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

    await page.addInitScript(() => {
      (window as any).__geovantaForceAndroidNative = true;
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    // 1. StatusBar synced on initial load & theme toggle
    const initialDiag = await page.evaluate(() => (window as any).__geovantaAndroidBridge.getDiagnostics());
    expect(['light', 'dark']).toContain(initialDiag.lastStatusBar);

    await page.locator('[data-tip="settings"]').first().click();
    const stg = page.locator('.stg-modal');
    await stg.waitFor({ state: 'visible' });
    await stg.locator('[data-tip="setTheme"] button').nth(2).click(); // Dark
    await page.waitForTimeout(100);
    const darkDiag = await page.evaluate(() => (window as any).__geovantaAndroidBridge.getDiagnostics());
    expect(darkDiag.lastStatusBar).toBe('dark');

    await stg.locator('[data-tip="setTheme"] button').nth(1).click(); // Light
    await page.waitForTimeout(100);
    const lightDiag = await page.evaluate(() => (window as any).__geovantaAndroidBridge.getDiagnostics());
    expect(lightDiag.lastStatusBar).toBe('light');

    // Back button closes Settings modal
    const closedSettings = await page.evaluate(() => (window as any).__geovantaAndroidBridge.dispatchBack());
    expect(closedSettings).toBe(true);
    await expect(stg).toHaveCount(0);

    // 2. Open fresh project and create a shape
    await page.getByRole('button', { name: /Create New/i }).first().click();
    await page.getByRole('button', { name: /Buat & Buka Proyek|Create & Open/i }).first().click();
    await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined', null, {
      timeout: 25000,
    });
    await page.waitForSelector('.ved-canvas', { state: 'visible' });

    await page.evaluate(() => {
      (window as any).__geovantaEditorApi.createTestShape('rect', 90, 90, 140, 100);
    });

    // 3. Open Export tab via TopBar quick export -> native export -> Back closes Inspector sheet
    await page.getByTestId('mob-export-btn').click();
    const inspectorSheet = page.getByTestId('mobile-inspector-sheet');
    await expect(inspectorSheet).toBeVisible();

    await page.locator('[data-tip="veDownload"]').click();
    await page.waitForTimeout(200);
    const exportDiag = await page.evaluate(() => (window as any).__geovantaAndroidBridge.getDiagnostics());
    expect(exportDiag.exports.length).toBeGreaterThanOrEqual(1);
    expect(exportDiag.exports[0].filename).toBe('geovanta-edit.svg');
    expect(exportDiag.exports[0].size).toBeGreaterThan(20);

    const backClosedSheet = await page.evaluate(() => (window as any).__geovantaAndroidBridge.dispatchBack());
    expect(backClosedSheet).toBe(true);
    await expect(inspectorSheet).toHaveCount(0);
    await expect(page.getByTestId('mobile-editor-topbar')).toBeVisible();

    // 4. Touch long-press opens ContextMenu AND triggers medium haptic -> Back closes ContextMenu
    await page.evaluate(() => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 301,
          pointerType: 'touch',
          isPrimary: true,
          clientX: r.left + r.width * 0.5,
          clientY: r.top + r.height * 0.5,
          button: 0,
          buttons: 1,
        })
      );
    });
    await page.waitForTimeout(650);
    const ctxMenu = page.locator('.ctx[role="menu"]');
    await expect(ctxMenu).toBeVisible();

    const hapticDiag = await page.evaluate(() => (window as any).__geovantaAndroidBridge.getDiagnostics());
    expect(hapticDiag.haptics).toContain('medium');

    const backClosedCtx = await page.evaluate(() => (window as any).__geovantaAndroidBridge.dispatchBack());
    expect(backClosedCtx).toBe(true);
    await expect(ctxMenu).toHaveCount(0);
    await expect(page.getByTestId('mobile-editor-topbar')).toBeVisible();

    // Release long-press pointer cleanly
    await page.evaluate(() => {
      const el = document.querySelector('.ved-canvas') as HTMLElement;
      el.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerId: 301,
          pointerType: 'touch',
          isPrimary: true,
          clientX: 180,
          clientY: 400,
          button: 0,
          buttons: 0,
        })
      );
    });

    // 5. Back with no open overlays returns from Editor to WorkspaceHome
    const backToHome = await page.evaluate(() => (window as any).__geovantaAndroidBridge.dispatchBack());
    expect(backToHome).toBe(true);
    await expect(page.getByRole('button', { name: /Create New/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('mobile-editor-topbar')).toHaveCount(0);

    // 6. Double-back-to-exit on WorkspaceHome
    const firstHomeBack = await page.evaluate(() => (window as any).__geovantaAndroidBridge.dispatchBack());
    expect(firstHomeBack).toBe(true);
    await expect(page.getByText(/Tekan sekali lagi untuk keluar|Press back again to exit/i)).toBeVisible();

    const diagBeforeExit = await page.evaluate(() => (window as any).__geovantaAndroidBridge.getDiagnostics());
    expect(diagBeforeExit.exitCount).toBe(0);

    const secondHomeBack = await page.evaluate(() => (window as any).__geovantaAndroidBridge.dispatchBack());
    expect(secondHomeBack).toBe(true);
    const diagAfterExit = await page.evaluate(() => (window as any).__geovantaAndroidBridge.getDiagnostics());
    expect(diagAfterExit.exitCount).toBe(1);

    expect(errors).toEqual([]);
    await context.close();
  });
});
