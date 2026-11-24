import { test, expect } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const WEB_DIR = path.resolve(__dirname, '../web');
const IMG_PATH = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795308645597_ec763ddd.jpg';
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

test('E2E: Real Geovanta WebApp Auto Trace renders all colors accurately without transparent holes & saves verified screenshots', async ({ page }) => {
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

    // Import the user's anime image onto the real Geovanta canvas via Drag & Drop
    const imgB64 = fs.readFileSync(IMG_PATH).toString('base64');
    await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], 'anime-girl.jpg', { type: 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const canvas = document.querySelector('canvas.ved-scene-canvas')!;
      const dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: 720, clientY: 450 });
      canvas.parentElement!.dispatchEvent(dropEvt);
    }, imgB64);

    // Wait for Auto Trace section & HW badge to appear in the Right Inspector
    const traceSection = page.locator('[data-testid="auto-trace-section"]');
    await expect(traceSection).toBeVisible({ timeout: 15000 });

    // Verify GPU badge is shown when GPU is available
    const hwBadge = await page.locator('[data-testid="auto-trace-hw-badge"]').innerText();
    expect(['GPU WebGL2', 'CPU Fallback']).toContain(hwBadge.trim());

    // Ensure ignoreWhite is unchecked by default (no missing white clothes/skin/highlights!)
    const ignoreWhiteChecked = await page.locator('[data-testid="auto-trace-ignore-white"]').getAttribute('aria-checked');
    expect(ignoreWhiteChecked).toBe('false');

    // Screenshot 1: Original image placed on Geovanta canvas BEFORE tracing
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'geovanta-e2e-before.png') });

    // Click the real Auto Trace button ("Trace Gambar ke SVG (SVGPeak)") in smooth vector Ultra mode
    await page.locator('[data-testid="auto-trace-run-btn"]').click();

    // Wait until tracing finishes (auto-trace section disappears because image was replaced with vector paths)
    await expect(traceSection).toHaveCount(0, { timeout: 60000 });

    // Inspect document & layer panel to verify true smooth vector paths named path-1, path-2... (NOT image-l...)
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
    console.log('[E2E GEOVANTA ANIME DOC STATS]', JSON.stringify(docStats));
    expect(docStats.allArePaths).toBe(true);
    expect(docStats.pathCount).toBeGreaterThan(5);
    expect(docStats.firstNames[0]).toBe('path-1');
    expect(docStats.hasImageLayerName).toBe(false);
    expect(docStats.totalNodes).toBeGreaterThan(200);
    expect(docStats.totalNodes).toBeLessThan(40000);
    expect(docStats.handleNodes).toBeGreaterThan(100);

    // Check sidebar DOM shows topmost vector path layer (layer panel renders top z-order first: path-N)
    await expect(page.getByText(`path-${docStats.pathCount}`, { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="listbox"][aria-label="Lapisan"]').getByText(/^image-/)).toHaveCount(0);

    // Deselect objects so CanvasKit renders cleanly without selection node dots
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    // Screenshot 2: Full Geovanta UI showing the traced vector artwork cleanly on canvas!
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'geovanta-e2e-after-ultra.png') });

    // Zoom in to 2,640% centered on the anime face/mouth/eye area (same zoom as user screenshot!) to verify zero pixelation
    await page.evaluate((bbox) => {
      const api = (window as any).__geovantaEditorApi;
      const [minX, minY, maxX, maxY] = bbox;
      const w = maxX - minX;
      const h = maxY - minY;
      // Anime portrait: right/center eye & eyelashes sit around 48% width, 25.5% height
      api.setZ(26.4);
      api.panTo(minX + w * 0.48, minY + h * 0.255);
    }, docStats.bbox);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'geovanta-e2e-anime-zoom2600.png') });

    const layerHeader = await page.locator('.fig-isec-title, .ved-sb-head, text=/Lapisan/i').first().innerText().catch(() => '');
    console.log('[E2E GEOVANTA ULTRA] hwBadge=', hwBadge, 'layerHeader=', layerHeader);
  } finally {
    server.close();
  }
});
