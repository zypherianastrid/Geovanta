import { test, expect } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const WEB_DIR = path.resolve(__dirname, '../web');
const IMG_PATH = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795314557511_9a814507.jpg';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707';

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

test('Geovanta E2E: Auto Trace Baymax wallpaper in real Geovanta UI', async ({ page }) => {
  test.setTimeout(120000);
  const { server, url } = await startStaticServer(WEB_DIR);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle' });

    // Open or create a project in Geovanta Workspace
    const openBtn = page.getByRole('button', { name: 'Buka Editor' }).first();
    if (await openBtn.isVisible().catch(() => false)) {
      await openBtn.click();
    } else {
      const createBtn = page.getByRole('button', { name: 'Create New', exact: true });
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
      } else {
        await page.getByRole('button', { name: /Buat Proyek/i }).first().click();
      }
      const submitBtn = page.getByRole('button', { name: /Buat & Buka Proyek/i });
      await submitBtn.waitFor({ state: 'visible' });
      await submitBtn.click();
    }

    await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined', null, { timeout: 30000 });

    // Import Baymax image onto the canvas via Drag & Drop
    const imgB64 = fs.readFileSync(IMG_PATH).toString('base64');
    await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], 'baymax-wallpaper.jpg', { type: 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const canvas = document.querySelector('canvas.ved-scene-canvas')!;
      const dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: 720, clientY: 450 });
      canvas.parentElement!.dispatchEvent(dropEvt);
    }, imgB64);

    // Wait for Auto Trace section in the Inspector
    const traceSection = page.locator('[data-testid="auto-trace-section"]');
    await expect(traceSection).toBeVisible({ timeout: 15000 });

    // Verify GPU badge
    const hwBadge = await page.locator('[data-testid="auto-trace-hw-badge"]').innerText();
    console.log('[E2E HW BADGE]:', hwBadge);

    // Ensure ignoreWhite is unchecked by default
    const ignoreWhiteChecked = await page.locator('[data-testid="auto-trace-ignore-white"]').getAttribute('aria-checked');
    expect(ignoreWhiteChecked).toBe('false');

    // Screenshot 1: BEFORE tracing (Original image on Geovanta CanvasKit canvas)
    await page.waitForTimeout(600);
    const beforeScreenshotPath = path.join(ARTIFACT_DIR, 'geovanta-baymax-before.png');
    await page.screenshot({ path: beforeScreenshotPath });
    console.log('[SAVED BEFORE SCREENSHOT]:', beforeScreenshotPath);

    // Click Auto Trace button
    await page.locator('[data-testid="auto-trace-run-btn"]').click();

    // Wait until tracing finishes (trace section unmounts when image is replaced with vector group)
    await expect(traceSection).toHaveCount(0, { timeout: 60000 });

    // Inspect document & layer panel to verify true smooth vector paths named path-1, path-2...
    const docStats = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const d = api.getDoc();
      let totalNodes = 0;
      let handleNodes = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const names: string[] = [];
      for (const o of (d.objects || [])) {
        names.push(o.name || '');
        for (const sp of (o.subs || [])) {
          for (const nd of (sp.nodes || [])) {
            totalNodes++;
            if (nd.handleIn || nd.handleOut) handleNodes++;
            if (Number.isFinite(nd.x) && Number.isFinite(nd.y)) {
              if (nd.x < minX) minX = nd.x;
              if (nd.y < minY) minY = nd.y;
              if (nd.x > maxX) maxX = nd.x;
              if (nd.y > maxY) maxY = nd.y;
            }
          }
        }
      }
      return {
        pathCount: (d.objects || []).length,
        allArePaths: (d.objects || []).every((o: any) => o.type === 'path' && !o.img),
        firstNames: names.slice(0, 10),
        hasImageLayerName: names.some((n) => n.startsWith('image-') || n.includes('-layer-')),
        totalNodes,
        handleNodes,
        bbox: [minX, minY, maxX, maxY],
      };
    });
    console.log('[E2E GEOVANTA BAYMAX DOC STATS]', JSON.stringify(docStats));
    expect(docStats.allArePaths).toBe(true);
    expect(docStats.pathCount).toBeGreaterThan(5);
    expect(docStats.firstNames[0]).toBe('path-1');
    expect(docStats.hasImageLayerName).toBe(false);
    expect(docStats.totalNodes).toBeGreaterThan(50);
    expect(docStats.totalNodes).toBeLessThan(25000);
    expect(docStats.handleNodes).toBeGreaterThan(30);

    // Check sidebar DOM shows topmost vector path layer (layer panel renders top z-order first: path-N)
    await expect(page.getByText(`path-${docStats.pathCount}`, { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="listbox"][aria-label="Lapisan"]').getByText(/^image-/)).toHaveCount(0);

    // Deselect objects so vector paths and CanvasKit colors render cleanly without bounding boxes/handles
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Screenshot 2: AFTER tracing (Vector objects rendered on Geovanta CanvasKit canvas)
    const afterScreenshotPath = path.join(ARTIFACT_DIR, 'geovanta-baymax-after.png');
    await page.screenshot({ path: afterScreenshotPath });
    console.log('[SAVED AFTER SCREENSHOT]:', afterScreenshotPath);

    // Zoom in to 2,000% centered on Baymax head/eye curve to verify silky-smooth non-pixelated vector contours
    await page.evaluate((bbox) => {
      const api = (window as any).__geovantaEditorApi;
      const [minX, minY, maxX, maxY] = bbox;
      const w = maxX - minX;
      const h = maxY - minY;
      api.setZ(20.0);
      api.panTo(minX + w * 0.65, minY + h * 0.37);
    }, docStats.bbox);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'geovanta-e2e-baymax-zoom2000.png') });

    const layerHeader = await page.locator('.fig-isec-title, .ved-sb-head, text=/Lapisan/i').first().innerText().catch(() => '');
    console.log('[E2E GEOVANTA BAYMAX DONE] layerHeader=', layerHeader);
  } finally {
    server.close();
  }
});
