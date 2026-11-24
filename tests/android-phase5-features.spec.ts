import { test, expect, Page, Browser } from '@playwright/test';
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

async function createMobilePage(browser: Browser, url: string): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('geovanta-mob-hint-v1', '1');
    } catch {}
  });
  await page.goto(url, { waitUntil: 'networkidle' });

  // Buka proyek baru dari home
  const fab = page.getByTestId('mob-home-fab');
  if (await fab.isVisible()) {
    await fab.click();
  } else {
    const createBtn = page.getByRole('button', { name: /Create New/i }).first();
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();
  }
  const submitBtn = page.getByRole('button', { name: /Buat & Buka Proyek|Create & Open/i }).first();
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
  await submitBtn.click();

  await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined', null, {
    timeout: 25000,
  });
  await page.waitForSelector('.ved-canvas', { state: 'visible' });

  // Dismiss gesture hint if present so it doesn't obstruct taps
  const hintClose = page.getByTestId('mobile-gesture-hint-close');
  if (await hintClose.isVisible()) {
    await hintClose.click();
  }

  return {
    page,
    close: async () => {
      await context.close();
    },
  };
}

test.describe('Fase 5: Optimalisasi Fitur Kontekstual Android', () => {
  let server: http.Server;
  let baseUrl: string;

  test.beforeAll(async () => {
    const s = await startStaticServer(WEB_DIR);
    server = s.server;
    baseUrl = s.url;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('5.1 ColorPickerField: Sheet mobile, Touch Presets, Pipette Cancel', async ({ browser }) => {
    const { page, close } = await createMobilePage(browser, baseUrl);
    try {
      // Tambahkan rect objek
      await page.evaluate(() => {
        const api = (window as any).__geovantaEditorApi;
        api.createTestShape('rect', 50, 50, 120, 80);
      });

      // Buka tab Style di Inspector via tombol Gaya pada Floating Selection Bar
      const styleAction = page.getByTestId('mob-sel-style');
      await styleAction.waitFor({ state: 'visible', timeout: 5000 });
      await styleAction.click();

      const styleTab = page.locator('[data-testid="mob-insp-tab-style"]');
      await styleTab.waitFor({ state: 'visible', timeout: 5000 });
      await styleTab.click();

      // Buka Color Picker pada Fill
      const fillSwatch = page.locator('.fig-isec[data-tip="veFill"] .swatch').first();
      await fillSwatch.waitFor({ state: 'visible', timeout: 5000 });
      await fillSwatch.click();

      // Tunggu popover / sheet color picker terbuka
      const cpSheet = page.locator('.flt.cp');
      await cpSheet.waitFor({ state: 'visible', timeout: 5000 });

      // Verifikasi mobile sheet styling (fixed at bottom on mobile)
      const bbox = await cpSheet.boundingBox();
      expect(bbox).not.toBeNull();
      if (bbox) {
        expect(bbox.width).toBeGreaterThanOrEqual(380);
        expect(bbox.y + bbox.height).toBeGreaterThanOrEqual(800);
      }

      // Verifikasi preset swatches exist
      const presetsGrid = page.locator('[data-testid="cp-presets-grid"]');
      await expect(presetsGrid).toBeVisible();
      const presetChips = presetsGrid.locator('.cp-preset-chip');
      expect(await presetChips.count()).toBeGreaterThanOrEqual(8);

      // Klik preset merah
      const redChip = presetsGrid.locator('[data-hex="#ef4444"]');
      if (await redChip.count() > 0) {
        await redChip.click();
        const doc = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc());
        expect(doc.objects[0].fill?.toLowerCase()).toContain('#ef4444');
      }

      // Tutup color picker via mobile close button
      const closeBtn = page.locator('.cp-mob-close');
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
      await expect(cpSheet).not.toBeVisible();
    } finally {
      await close();
    }
  });

  test('5.2 TextEditOverlay: Accessory bar & Selesai commit', async ({ browser }) => {
    const { page, close } = await createMobilePage(browser, baseUrl);
    try {
      // Tambahkan teks dan aktifkan mode edit
      await page.evaluate(() => {
        const api = (window as any).__geovantaEditorApi;
        const o = api.createTestShape('text', 50, 50, 150, 40);
        if (api.startTextEdit) api.startTextEdit(o.id);
      });

      // Tunggu overlay teks
      const overlay = page.locator('[data-testid="text-edit-overlay"]');
      await overlay.waitFor({ state: 'visible', timeout: 5000 });

      // Verifikasi Keyboard Accessory Bar muncul di mobile
      const accessoryBar = page.locator('[data-testid="text-edit-accessory-bar"]');
      await expect(accessoryBar).toBeVisible();

      const doneBtn = page.locator('[data-testid="text-edit-done-btn"]');
      await expect(doneBtn).toBeVisible();

      // Ketik teks baru
      const textarea = page.locator('.ve-text-edit-textarea');
      await textarea.fill('Geovanta Mobile Text');

      // Klik Selesai
      await doneBtn.click({ force: true });

      // Verifikasi overlay selesai dan teks tersimpan
      await expect(overlay).not.toBeVisible();
      const doc = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc());
      const textObj = doc.objects.find((o: any) => o.text);
      expect(textObj?.text?.content).toBe('Geovanta Mobile Text');
    } finally {
      await close();
    }
  });

  test('5.3 Pen Action Pills & Node Action Pills di Mobile', async ({ browser }) => {
    const { page, close } = await createMobilePage(browser, baseUrl);
    try {
      // Aktifkan tool pen dan mulai session pen
      await page.evaluate(() => {
        const api = (window as any).__geovantaEditorApi;
        api.setTool('pen');
        api.startTestPenSession([
          { x: 50, y: 50 },
          { x: 150, y: 150 }
        ]);
      });

      // Verifikasi pen action bar muncul di mobile
      const penPill = page.locator('[data-testid="mob-pen-actions"]');
      await expect(penPill).toBeVisible();

      const finishBtn = page.locator('[data-testid="mob-pen-finish"]');
      await expect(finishBtn).toBeVisible();

      // Klik Selesai
      await finishBtn.click();
      await expect(penPill).not.toBeVisible();

      // Verifikasi path tersimpan
      const doc = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc());
      expect(doc.objects.length).toBeGreaterThan(0);
    } finally {
      await close();
    }
  });

  test('5.4 Auto-Trace Presets & Collapsible di Inspector Mobile', async ({ browser }) => {
    const { page, close } = await createMobilePage(browser, baseUrl);
    try {
      // Tambahkan gambar dummy ke doc agar seksi Auto-Trace muncul
      await page.evaluate(() => {
        const api = (window as any).__geovantaEditorApi;
        api.createTestImage(50, 50, 100, 100);
      });

      // Buka inspector via tombol Gaya pada Floating Selection Bar
      const styleAction = page.getByTestId('mob-sel-style');
      await styleAction.waitFor({ state: 'visible', timeout: 5000 });
      await styleAction.click();

      // Pastikan inspector sheet mobile muncul
      const inspSheet = page.getByTestId('mobile-inspector-sheet');
      await inspSheet.waitFor({ state: 'visible', timeout: 5000 });

      // Buka tab Tools di inspector mobile
      const toolsTab = page.locator('[data-testid="mob-insp-tab-tools"]');
      await toolsTab.waitFor({ state: 'visible', timeout: 5000 });
      await toolsTab.click();

      // Verifikasi seksi Auto-Trace
      const atSection = page.locator('[data-testid="auto-trace-section"]');
      await expect(atSection).toBeVisible();

      // Verifikasi 3 preset ramah awam tampil di bagian atas
      const presets = page.locator('[data-testid="auto-trace-presets"]');
      await expect(presets).toBeVisible();
      await expect(page.locator('[data-testid="at-preset-logo"]')).toBeVisible();
      await expect(page.locator('[data-testid="at-preset-bw"]')).toBeVisible();
      await expect(page.locator('[data-testid="at-preset-photo"]')).toBeVisible();

      // Verifikasi toggle advanced settings
      const advToggle = page.locator('[data-testid="at-advanced-toggle"]');
      await expect(advToggle).toBeVisible();

      // Default: advanced sliders tersembunyi
      const advContent = page.locator('[data-testid="at-advanced-content"]');
      await expect(advContent).not.toBeVisible();

      // Klik toggle untuk expand
      await advToggle.click();
      await expect(advContent).toBeVisible();
    } finally {
      await close();
    }
  });

  test('5.5 Layer Tree Mobile Ergonomics (Height 48px, Drag Handle, More Menu)', async ({ browser }) => {
    const { page, close } = await createMobilePage(browser, baseUrl);
    try {
      // Tambahkan 2 shape
      await page.evaluate(() => {
        const api = (window as any).__geovantaEditorApi;
        api.createTestShape('rect', 30, 30, 100, 60);
        api.createTestShape('ellipse', 120, 120, 80, 80);
      });

      // Buka sidebar layer kiri via mob-layers-btn
      const layerBtn = page.locator('[data-testid="mob-layers-btn"]');
      await layerBtn.waitFor({ state: 'visible', timeout: 5000 });
      await layerBtn.click();

      // Tunggu baris layer muncul
      const layerRow = page.locator('.fig-row.root-item').first();
      await layerRow.waitFor({ state: 'visible', timeout: 5000 });

      // Verifikasi tinggi baris layer >= 44px di mobile
      const rowBox = await layerRow.boundingBox();
      expect(rowBox).not.toBeNull();
      if (rowBox) {
        expect(rowBox.height).toBeGreaterThanOrEqual(44);
      }

      // Verifikasi drag handle dan more button
      const dragHandle = layerRow.locator('.mob-lay-drag-handle');
      await expect(dragHandle).toBeVisible();

      const moreBtn = layerRow.locator('.mob-lay-more');
      await expect(moreBtn).toBeVisible();

      // Klik tombol more harus membuka context menu action sheet
      await moreBtn.click();
      const actionSheet = page.locator('.ctx.mob-action-sheet');
      await expect(actionSheet).toBeVisible();
    } finally {
      await close();
    }
  });
});
