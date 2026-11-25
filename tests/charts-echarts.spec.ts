import { test, expect, Page } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

let server: http.Server;
let baseUrl = '';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

test.beforeAll(async () => {
  const webRoot = path.resolve(__dirname, '..', 'web');
  server = http.createServer((req, res) => {
    const reqPath = (req.url || '/').split('?')[0];
    const rel = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
    const filePath = path.join(webRoot, rel);
    if (!filePath.startsWith(webRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

async function openEditor(page: Page) {
  await page.goto(baseUrl + '/');
  await page.waitForLoadState('networkidle');

  const openBtn = page.getByRole('button', { name: 'Buka Editor' }).first();
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
  } else {
    const createBtn = page.getByRole('button', { name: 'Create New', exact: true });
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      const submitBtn = page.getByRole('button', { name: 'Buat & Buka Proyek' });
      await submitBtn.waitFor({ state: 'visible' });
      await submitBtn.click();
    }
  }

  await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined');
}

async function typeIntoCustomBox(page: Page, testId: string, text: string) {
  const box = page.locator(`[data-testid="${testId}"] [role="textbox"]`);
  await box.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

const ALL_22_TYPES = [
  'line', 'bar', 'pie', 'scatter', 'effectScatter', 'radar',
  'tree', 'treemap', 'sunburst', 'boxplot', 'candlestick', 'heatmap',
  'map', 'parallel', 'lines', 'graph', 'sankey', 'funnel',
  'gauge', 'pictorialBar', 'themeRiver', 'custom',
];

test.describe('Geovanta Apache ECharts Pure Vector Charts', () => {
  test('All 29 presets (22 ECharts types) render cleanly with 0 empty paths, 0 hit-box defects, & 0 native HTML inputs', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await openEditor(page);

    const chartsBtn = page.locator('[data-tip="veCharts"]');
    await expect(chartsBtn).toBeVisible();
    await chartsBtn.click();
    const modal = page.getByTestId('charts-studio-modal');
    await expect(modal).toBeVisible();

    // Assert 0 native HTML <input>, <select>, <textarea> inside Charts Studio modal
    const nativeCountModal = await page.evaluate(() => {
      const m = document.querySelector('[data-testid="charts-studio-modal"]');
      return m ? m.querySelectorAll('input, select, textarea').length : -1;
    });
    expect(nativeCountModal).toBe(0);

    const registeredTypes = await page.evaluate(() => (window as any).__geovantaEditorApi.getChartTypes());
    expect(registeredTypes).toEqual(expect.arrayContaining(ALL_22_TYPES));

    const presetIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid^="chart-catalog-item-"]')).map(el =>
        el.getAttribute('data-testid')!.replace('chart-catalog-item-', '')
      )
    );
    expect(presetIds.length).toBeGreaterThanOrEqual(29);

    for (const pid of presetIds) {
      const item = page.getByTestId(`chart-catalog-item-${pid}`);
      await item.scrollIntoViewIfNeeded();
      await item.click();
      const preview = page.getByTestId('charts-studio-preview');
      await expect(preview).toBeVisible();
      const check = await page.evaluate(() => {
        const img = document.querySelector('[data-testid="charts-studio-preview"]');
        const src = img?.getAttribute('src') || '';
        const svg = decodeURIComponent(src.replace('data:image/svg+xml;charset=utf-8,', ''));
        const dom = new DOMParser().parseFromString(svg, 'image/svg+xml');
        const emptyPaths = Array.from(dom.querySelectorAll('path')).filter(p => !(p.getAttribute('d') || '').trim()).length;
        const blackHitBoxes = Array.from(dom.querySelectorAll('path')).filter(
          p => p.getAttribute('fill') === 'rgb(0,0,0)' && p.getAttribute('fill-opacity') === '0'
        ).length;
        const shapes = dom.querySelectorAll('path, polygon, circle, ellipse, rect').length;
        return { isSvg: src.startsWith('data:image/svg+xml'), emptyPaths, blackHitBoxes, shapes };
      });
      expect(check.isSvg).toBe(true);
      expect(check.emptyPaths).toBe(0);
      expect(check.blackHitBoxes).toBe(0);
      expect(check.shapes).toBeGreaterThanOrEqual(9);
    }

    await page.getByTestId('charts-studio-submit').click();
    await expect(modal).toBeHidden();

    const docObjCount = await page.evaluate(() => (window as any).__geovantaEditorApi.getDoc().objects.length);
    expect(docObjCount).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('Fintech SaaS defaults, 0% native inputs in Right Sidebar, Advanced Component Builder, & live editing', async ({ page }) => {
    await openEditor(page);

    await page.locator('[data-tip="veCharts"]').click();
    await page.getByTestId('chart-catalog-item-bar').click();
    await page.getByTestId('charts-studio-submit').click();

    const inspectorPanel = page.getByTestId('chart-inspector-panel');
    await expect(inspectorPanel).toBeVisible();

    // Verify top of right sidebar
    const isFirstInRightScroll = await page.evaluate(() => {
      const scroll = document.querySelector('.fig-right-sidebar .fig-r-scroll');
      const panel = document.querySelector('[data-testid="chart-inspector-panel"]');
      return !!scroll && !!panel && scroll.firstElementChild === panel;
    });
    expect(isFirstInRightScroll).toBe(true);

    // Verify Fintech SaaS defaults
    const defaults = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const anchor = doc.objects.find((o: any) => o.gen && o.gen.kind === 'chart');
      return {
        paletteId: anchor?.gen?.config?.paletteId,
        cardShow: anchor?.gen?.config?.card?.show,
        cardRadius: anchor?.gen?.config?.card?.borderRadius,
      };
    });
    expect(defaults).toEqual({ paletteId: 'geovanta-fintech', cardShow: true, cardRadius: 20 });

    // Assert 0 native HTML inputs across ALL 8 tabs of ChartInspectorPanel
    for (const tabId of ['type', 'components', 'data', 'color', 'font', 'style', 'layout', 'json']) {
      await page.getByTestId(`chart-tab-${tabId}`).click();
      const nativeCount = await page.evaluate(() => {
        const p = document.querySelector('[data-testid="chart-inspector-panel"]');
        return p ? p.querySelectorAll('input, select, textarea').length : -1;
      });
      expect(nativeCount).toBe(0);
    }

    // 1. Advanced Component Builder: toggle KPI Hero & edit Title
    await page.getByTestId('chart-tab-components').click();
    await page.getByTestId('chart-comp-kpi').click();
    await typeIntoCustomBox(page, 'chart-title-input', 'Penjualan Kuartal 1');
    await page.waitForTimeout(200);
    const hasTitleAndKpi = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const anchor = doc.objects.find((o: any) => o.gen && o.gen.kind === 'chart');
      const hasText = doc.objects.some((o: any) => o.type === 'text' && o.text?.content?.includes('Penjualan Kuartal 1'));
      const kpiText = doc.objects.find((o: any) => o.type === 'text' && o.text?.content === '$23.700');
      return {
        kpiShow: anchor?.gen?.config?.kpi?.show,
        hasText,
        kpiSize: kpiText?.text?.fontSize || 0,
        kpiWeight: String(kpiText?.text?.fontWeight || ''),
      };
    });
    expect(hasTitleAndKpi.kpiShow).toBe(true);
    expect(hasTitleAndKpi.hasText).toBe(true);
    expect(hasTitleAndKpi.kpiSize).toBeGreaterThanOrEqual(24);
    expect(['700', 'bold']).toContain(hasTitleAndKpi.kpiWeight);

    // 2. Edit Data value via CustomTextBox
    await page.getByTestId('chart-tab-data').click();
    await typeIntoCustomBox(page, 'chart-cell-0-0', '450');
    await page.waitForTimeout(200);
    const updatedVal = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const anchor = doc.objects.find((o: any) => o.gen && o.gen.kind === 'chart');
      return anchor?.gen?.config?.data?.series?.[0]?.data?.[0];
    });
    expect(updatedVal).toBe(450);

    // 3. Edit Color Palette
    await page.getByTestId('chart-tab-color').click();
    await page.getByTestId('chart-palette-vivid-pop').click();
    await page.waitForTimeout(150);
    const paletteId = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const anchor = doc.objects.find((o: any) => o.gen && o.gen.kind === 'chart');
      return anchor?.gen?.config?.paletteId;
    });
    expect(paletteId).toBe('vivid-pop');

    // 4. Edit Font Family via Geovanta custom SelectDropdown
    await page.getByTestId('chart-tab-font').click();
    await page.getByTestId('chart-font-family').click();
    await page.locator('.flt [role="option"]', { hasText: 'Georgia' }).first().click();
    await page.waitForTimeout(150);
    const fontFam = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const anchor = doc.objects.find((o: any) => o.gen && o.gen.kind === 'chart');
      return anchor?.gen?.config?.typography?.global?.family;
    });
    expect(fontFam).toBe('Georgia');

    // 5. Switch Chart Type (bar -> pie-donut)
    await page.getByTestId('chart-tab-type').click();
    await page.getByTestId('chart-inspector-type-pie-donut').click();
    await page.waitForTimeout(150);
    const nextType = await page.evaluate(() => {
      const doc = (window as any).__geovantaEditorApi.getDoc();
      const anchor = doc.objects.find((o: any) => o.gen && o.gen.kind === 'chart');
      return anchor?.gen?.config?.chartType;
    });
    expect(nextType).toBe('pie');

    // 6. Detach & Undo
    await page.getByTestId('chart-detach-btn').click();
    await expect(inspectorPanel).toBeHidden();
    await page.keyboard.press('Control+z');
    await expect(inspectorPanel).toBeVisible();
  });
});
