import { test, expect, Page } from '@playwright/test';

async function openEditor(page: Page) {
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
  await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined');
}

test.describe('Settings Scroll Performance & Small Empty Space Color Scanning', () => {
  test('Workspace -> Settings modal wheel scrolling is smooth with minimal layout/paint thrashing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    await page.goto('http://127.0.0.1:4173/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-tip="settings"]', { state: 'visible' });

    const settingsBtn = page.locator('[data-tip="settings"], button[aria-label*="Pengaturan"], button[aria-label*="Settings"], button:has-text("Pengaturan")').first();
    await settingsBtn.click();
    await page.waitForSelector('.stg-modal .hp-body', { state: 'visible' });
    await page.waitForTimeout(350);

    const box = await page.locator('.stg-modal .hp-body').boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const beforeMetrics = await cdp.send('Performance.getMetrics');
    const getMetric = (res: any, name: string) =>
      res.metrics.find((m: any) => m.name === name)?.value ?? 0;
    const layoutBefore = getMetric(beforeMetrics, 'LayoutCount');

    await page.evaluate(() => {
      (window as any).__scrollRaf = [];
      (window as any).__scrollLast = performance.now();
      (window as any).__scrollRun = true;
      function tick(now: number) {
        (window as any).__scrollRaf.push(now - (window as any).__scrollLast);
        (window as any).__scrollLast = now;
        if ((window as any).__scrollRun) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });

    // Real mouse wheel scroll down and back up on Umum tab
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(20);
    }
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(20);
    }

    const afterMetrics = await cdp.send('Performance.getMetrics');
    const layoutAfter = getMetric(afterMetrics, 'LayoutCount');
    const layoutDelta = layoutAfter - layoutBefore;

    const rafStats = await page.evaluate(() => {
      (window as any).__scrollRun = false;
      const frames: number[] = (window as any).__scrollRaf || [];
      const avgF = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length);
      const slowFrames = frames.filter(f => f > 25).length;
      const body = document.querySelector('.stg-modal .hp-body') as HTMLElement;
      return { frameCount: frames.length, avgF, slowFrames, scrollTop: body.scrollTop };
    });

    console.log('Settings wheel scroll metrics:', { ...rafStats, layoutDelta });
    expect(rafStats.avgF).toBeLessThan(24);
    expect(rafStats.slowFrames).toBeLessThanOrEqual(2);
    // SVG / GSAP About animation must NOT trigger per-frame synchronous layouts during scroll
    expect(layoutDelta).toBeLessThanOrEqual(12);
  });

  test('Fill Empty Space detects very small empty spaces via color-occupancy scanning', async ({ page }) => {
    await openEditor(page);

    const res = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;

      const mkNode = (x: number, y: number, hi: any = null, ho: any = null, type = 'corner') => ({
        id: 'n_' + Math.random().toString(36).slice(2, 9),
        x, y, type, handleIn: hi, handleOut: ho
      });
      const mkRect = (id: string, x: number, y: number, w: number, h: number, fill = '#3b82f6') => ({
        id, name: id, type: 'path', fill, stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero',
        subs: [{
          id: id + '_s0', closed: true,
          nodes: [mkNode(x, y), mkNode(x + w, y), mkNode(x + w, y + h), mkNode(x, y + h)]
        }]
      });
      const containsPt = (obj: any, px: number, py: number) => {
        let inside = false;
        for (const sp of obj.subs || []) {
          const pts = sp.nodes || [];
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i].x, yi = pts[i].y;
            const xj = pts[j].x, yj = pts[j].y;
            if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
              inside = !inside;
            }
          }
        }
        return inside;
      };

      // Case 1: Large 900x900 ring with a tiny 0.8x0.8 empty hole at (450, 450)
      const bigRing = {
        id: 'big-ring', name: 'big-ring', type: 'path', fill: '#3b82f6', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero',
        subs: [
          { id: 'br-out', closed: true, nodes: [mkNode(0, 0), mkNode(900, 0), mkNode(900, 900), mkNode(0, 900)] },
          { id: 'br-in', closed: true, nodes: [mkNode(450, 450), mkNode(450, 450.8), mkNode(450.8, 450.8), mkNode(450.8, 450)] }
        ]
      };
      api.setDoc({ viewBox: [0, 0, 1000, 1000], objects: [bigRing], styles: [] });
      api.setSelection(['big-ring']);
      const before1 = containsPt(api.getDoc().objects[0], 450.4, 450.4);
      api.fillEmptySpace();
      const after1 = containsPt(api.getDoc().objects[0], 450.4, 450.4);

      // Case 2: 1000x1000 cluster with a tiny 1.0x1.5 enclosed empty gap between adjacent shapes
      api.setDoc({
        viewBox: [0, 0, 1000, 1000],
        objects: [
          mkRect('top', 0, 0, 1000, 500, '#ef4444'),
          mkRect('bot', 0, 501.5, 1000, 498.5, '#22c55e'),
          mkRect('left', 0, 500, 500, 1.5, '#3b82f6'),
          mkRect('right', 501.0, 500, 499.0, 1.5, '#f59e0b')
        ],
        styles: []
      });
      api.setSelection(['left']);
      const before2 = containsPt(api.getDoc().objects.find((o: any) => o.id === 'left'), 500.5, 500.75);
      api.fillEmptySpace();
      const after2 = containsPt(api.getDoc().objects.find((o: any) => o.id === 'left'), 500.5, 500.75);

      // Case 3: Very small 0.15x0.15 enclosed empty gap in 1000x1000 scene
      api.setDoc({
        viewBox: [0, 0, 1000, 1000],
        objects: [
          mkRect('t', 0, 0, 1000, 500, '#ef4444'),
          mkRect('b', 0, 500.15, 1000, 499.85, '#22c55e'),
          mkRect('l', 0, 500, 500, 0.15, '#3b82f6'),
          mkRect('r', 500.15, 500, 499.85, 0.15, '#f59e0b')
        ],
        styles: []
      });
      api.setSelection(['l']);
      api.fillEmptySpace();
      const case3 = containsPt(api.getDoc().objects.find((o: any) => o.id === 'l'), 500.075, 500.075);

      // Case 4: Small 0.6x0.6 gap touching a large 500x1000 target rectangle in 1000x1000 scene
      api.setDoc({
        viewBox: [0, 0, 1000, 1000],
        objects: [
          mkRect('l', 0, 0, 500, 1000, '#3b82f6'),
          mkRect('t', 500, 0, 500, 500, '#ef4444'),
          mkRect('b', 500, 500.6, 500, 499.4, '#22c55e'),
          mkRect('r', 500.6, 500, 499.4, 0.6, '#f59e0b')
        ],
        styles: []
      });
      api.setSelection(['l']);
      api.fillEmptySpace();
      const case4 = containsPt(api.getDoc().objects.find((o: any) => o.id === 'l'), 500.3, 500.3);

      // Case 5: Very small 0.15x0.15 gap in a small 150x150 doc (where global cell <= 0.2)
      api.setDoc({
        viewBox: [0, 0, 150, 150],
        objects: [
          mkRect('l', 0, 0, 75, 150, '#3b82f6'),
          mkRect('t', 75, 0, 75, 75, '#ef4444'),
          mkRect('b', 75, 75.15, 75, 74.85, '#22c55e'),
          mkRect('r', 75.15, 75, 74.85, 0.15, '#f59e0b')
        ],
        styles: []
      });
      api.setSelection(['l']);
      api.fillEmptySpace();
      const case5 = containsPt(api.getDoc().objects.find((o: any) => o.id === 'l'), 75.075, 75.075);

      // Case 6: Space covered by zero-alpha transparent shape has NO color -> must still be detected as empty!
      const ring = {
        id: 'ring', name: 'ring', type: 'path', fill: '#3b82f6', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero',
        subs: [
          { id: 'r0', closed: true, nodes: [mkNode(0, 0), mkNode(100, 0), mkNode(100, 100), mkNode(0, 100)] },
          { id: 'r1', closed: true, nodes: [mkNode(40, 40), mkNode(40, 41), mkNode(41, 41), mkNode(41, 40)] }
        ]
      };
      const ghost = mkRect('ghost', 40, 40, 1, 1, 'rgba(255,255,255,0)');
      api.setDoc({ viewBox: [0, 0, 100, 100], objects: [ring, ghost], styles: [] });
      api.setSelection(['ring']);
      api.fillEmptySpace();
      const case6 = containsPt(api.getDoc().objects.find((o: any) => o.id === 'ring'), 40.5, 40.5);

      // Case 7: Small 0.5x0.5 gap between separate objects lying INSIDE the bbox of a larger C-shaped pocket
      const cTarget = {
        id: 'ctgt', name: 'ctgt', type: 'path', fill: '#3b82f6', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero',
        subs: [{
          id: 'ct0', closed: true,
          nodes: [
            mkNode(100, 100), mkNode(500, 100), mkNode(500, 150),
            mkNode(150, 150), mkNode(150, 450), mkNode(500, 450),
            mkNode(500, 500), mkNode(100, 500)
          ]
        }]
      };
      // Close the C-pocket on the right so [150..490, 150..450] is enclosed, AND add inner tiles around (300, 300) leaving a tiny 0.5x0.5 gap!
      const cClose = mkRect('cclose', 480, 150, 20, 300, '#ef4444');
      // Add block inside [200..400, 200..400] with 0.5x0.5 gap at [300..300.5, 300..300.5] touching blockTop (selected too)
      const bTop = mkRect('btop', 200, 200, 200, 100, '#22c55e');
      const bBot = mkRect('bbot', 200, 300.5, 200, 99.5, '#f59e0b');
      const bLeft = mkRect('bleft', 200, 300, 100, 0.5, '#a855f7');
      const bRight = mkRect('bright', 300.5, 300, 99.5, 0.5, '#06b6d4');
      api.setDoc({ viewBox: [0, 0, 1000, 1000], objects: [cTarget, cClose, bTop, bBot, bLeft, bRight], styles: [] });
      api.setSelection(['ctgt', 'bleft']);
      api.fillEmptySpace();
      const case7 = containsPt(api.getDoc().objects.find((o: any) => o.id === 'bleft'), 300.25, 300.25);

      return { before1, after1, before2, after2, case3, case4, case5, case6, case7 };
    });

    console.log('Small empty space result:', res);
    expect(res.before1).toBe(false);
    expect(res.after1).toBe(true);
    expect(res.before2).toBe(false);
    expect(res.after2).toBe(true);
    expect(res.case3).toBe(true);
    expect(res.case4).toBe(true);
    expect(res.case5).toBe(true);
    expect(res.case6).toBe(true);
    expect(res.case7).toBe(true);
  });
});
