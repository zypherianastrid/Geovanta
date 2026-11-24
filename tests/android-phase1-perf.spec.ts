import { test, expect } from '@playwright/test';
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

test.describe('Geovanta Android Phase 1 Performance & Lazy Runtime', () => {
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

  test('web/index.html has clean single ?v= cache-buster and no synchronous CanvasKit/font runtime tags', () => {
    const html = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
    expect(html).not.toContain('canvaskit-runtime.js');
    expect(html).not.toContain('text-font-runtime.js');
    const matches = html.match(/geovanta\.bundle\.js(\?v=[0-9a-f]+)*/g) || [];
    expect(matches.length).toBe(1);
    const vCount = (matches[0].match(/\?v=/g) || []).length;
    expect(vCount).toBe(1);
  });

  test('WorkspaceHome skips WASM/fonts on initial load, detects mobile device profile, and lazy-loads CanvasKit + fonts on Editor entry', async ({ browser }) => {
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

    const requestedUrls: string[] = [];
    page.on('request', (req) => {
      requestedUrls.push(req.url());
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    // 1. WorkspaceHome must NOT eagerly load CanvasKit or font runtime scripts
    const homeHasHeavyRuntime = requestedUrls.some((u) =>
      /canvaskit-runtime\.js|canvaskit\.js|canvaskit\.wasm|text-font-runtime\.js/i.test(u)
    );
    expect(homeHasHeavyRuntime).toBe(false);

    // 2. Android device profile must NOT fall back to desktop
    const profile = await page.evaluate(() => (window as any).__geovantaDeviceProfile);
    expect(profile).toBeTruthy();
    expect(['android-high', 'mid-mobile', 'low-mobile']).toContain(profile.tier);
    expect(profile.tier).not.toBe('desktop');

    // 3. Opening a project lazy-loads canvaskit.js, canvaskit.wasm, and text-font-runtime.js
    await page.getByRole('button', { name: /Create New/i }).first().click();
    await page.getByRole('button', { name: /Buat & Buka Proyek|Create & Open/i }).first().click();

    await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined', null, {
      timeout: 25000,
    });
    await page.waitForSelector('.ved-canvas', { state: 'visible' });

    const editorRequests = requestedUrls.slice();
    expect(editorRequests.some((u) => u.includes('canvaskit.js'))).toBe(true);
    expect(editorRequests.some((u) => u.includes('canvaskit.wasm'))).toBe(true);
    expect(editorRequests.some((u) => u.includes('text-font-runtime.js'))).toBe(true);
    expect(editorRequests.some((u) => u.includes('canvaskit-runtime.js'))).toBe(false);

    // 4. Verify CanvasKit initialized and bundled text font is available, and shape renders cleanly
    const editorReadyInfo = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const shapeId = api.createTestShape('rect', 80, 80, 140, 100);
      return {
        hasBundledFont: Boolean((globalThis as any).GEOVANTA_BUNDLED_TEXT_FONT?.family),
        shapeId,
      };
    });
    expect(editorReadyInfo.hasBundledFont).toBe(true);
    expect(editorReadyInfo.shapeId).toBeTruthy();

    await page.waitForTimeout(200);
    expect(errors).toEqual([]);

    await context.close();
  });
});
