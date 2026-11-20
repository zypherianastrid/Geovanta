import { test, expect } from '@playwright/test';

test.describe('Geovanta Rapid Zoom Performance & Bottleneck Diagnosis', () => {
  test('profile rapid zoom in/out with diverse random vector objects', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Navigate to Geovanta local web app
    await page.goto('http://127.0.0.1:4173/');
    await page.waitForLoadState('networkidle');

    // 2. Open or create project
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

    // Wait for editor and CanvasKit initialization
    await page.waitForFunction(() => typeof window.__geovantaEditorApi !== 'undefined');
    await page.locator('canvas.ved-scene-canvas').first().waitFor({ state: 'attached' });

    // 3. Populate canvas with random objects using ALL available drawing tools
    const populateResult = await page.evaluate(async () => {
      const api = window.__geovantaEditorApi;
      const baseDoc = api.getDoc();

      // Tool 1: Various Geometric Shapes
      const shapeKinds = [
        'rect', 'rrect', 'ellipse', 'triangle', 'rtriangle',
        'diamond', 'parallelogram', 'trapezoid', 'pentagon',
        'hexagon', 'octagon', 'star5', 'star4', 'star6',
        'arrow', 'chevron', 'plus', 'heart', 'drop', 'ring'
      ];
      for (let i = 0; i < shapeKinds.length; i++) {
        const k = shapeKinds[i];
        const x = 50 + (i % 5) * 140;
        const y = 50 + Math.floor(i / 5) * 120;
        api.createTestShape(k, x, y, 90, 80);
      }

      // Tool 2: Lines & Arcs
      for (let i = 0; i < 5; i++) {
        api.createTestLine({ x: 100 + i * 50, y: 550 }, { x: 300 + i * 50, y: 650 });
        api.createTestArc(200 + i * 80, 720, 40, 0, 180 + i * 30);
      }

      // Tool 3: Pen curves (multi-node Bézier with handles)
      for (let i = 0; i < 3; i++) {
        const pts = [
          { x: 50 + i * 150, y: 800 },
          { x: 120 + i * 150, y: 850 },
          { x: 90 + i * 150, y: 920 },
          { x: 180 + i * 150, y: 880 }
        ];
        api.startTestPenSession(pts);
        api.finishPen();
      }

      // Tool 4: Curvature smooth curves
      for (let i = 0; i < 3; i++) {
        const pts = [
          { x: 500 + i * 150, y: 800 },
          { x: 570 + i * 150, y: 860 },
          { x: 530 + i * 150, y: 940 },
          { x: 620 + i * 150, y: 900 }
        ];
        api.startTestCurvatureSession(pts);
        api.finishCurvature();
      }

      // Tool 5: Weave Generator
      api.createTestWeave(50, 950, 400, 200);

      // Tool 6: Freehand Pencil & Brush strokes with many sampled points
      const currentDoc = api.getDoc();
      const newFreehandObjs = [];
      for (let strokeIdx = 0; strokeIdx < 4; strokeIdx++) {
        const isBrush = strokeIdx % 2 === 1;
        const nodes = [];
        const numPts = 60;
        const startX = 500 + strokeIdx * 80;
        const startY = 950;
        for (let p = 0; p < numPts; p++) {
          nodes.push({
            id: 'node_fh_' + strokeIdx + '_' + p,
            x: startX + Math.sin(p * 0.2) * 40 + p * 2,
            y: startY + p * 4 + Math.cos(p * 0.15) * 20,
            type: 'corner',
            handleIn: null,
            handleOut: null
          });
        }
        newFreehandObjs.push({
          id: 'freehand_' + strokeIdx + '_' + Date.now(),
          name: (isBrush ? 'Brush-' : 'Pencil-') + strokeIdx,
          type: 'path',
          fill: 'none',
          stroke: isBrush ? '#e11d48' : '#2563eb',
          strokeWidth: isBrush ? 6 : 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: 1,
          fillRule: 'nonzero',
          group: null,
          subs: [{
            id: 'sub_' + strokeIdx,
            closed: false,
            nodes
          }]
        });
      }

      // Tool 7: Text object
      newFreehandObjs.push({
        id: 'text_obj_1',
        name: 'Text-1',
        type: 'text',
        x: 100,
        y: 1200,
        text: 'Geovanta Vector Studio Test',
        fontSize: 32,
        fontFamily: 'IBM Plex Sans',
        fill: '#1e293b',
        opacity: 1,
        group: null,
        subs: []
      });

      api.commitDoc({
        ...currentDoc,
        objects: [...currentDoc.objects, ...newFreehandObjs]
      });

      return {
        totalObjects: api.getDoc().objects.length,
      };
    });

    console.log(`[Test Setup] Populated canvas with ${populateResult.totalObjects} random vector objects.`);
    expect(populateResult.totalObjects).toBeGreaterThan(20);

    // 4. Install detailed diagnostic profiling hooks in the browser context
    await page.evaluate(() => {
      const perfData = {
        wheelEvents: [],
        applyVPTimes: [],
        domQueryTimes: [],
        syncSidebarTimes: [],
        renderFrameTimes: [],
        rgssTimes: [],
        drawVectorTimes: [],
        skiaFlushTimes: [],
        longTasks: []
      };
      (window as any).__zoomPerfData = perfData;

      // Monitor long tasks
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            perfData.longTasks.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration
            });
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Not supported in all headless browsers
      }

      // Hook scene renderer methods
      const renderer = (window as any).__geovantaEditorApi.getSceneRenderer();
      if (renderer) {
        const origRenderFrame = renderer.renderFrame.bind(renderer);
        renderer.renderFrame = function (force) {
          const t0 = performance.now();
          origRenderFrame(force);
          const t1 = performance.now();
          perfData.renderFrameTimes.push(t1 - t0);
        };

        const origDrawVectorFrame = renderer.drawVectorFrame.bind(renderer);
        renderer.drawVectorFrame = function (...args) {
          const t0 = performance.now();
          const res = origDrawVectorFrame(...args);
          const t1 = performance.now();
          perfData.drawVectorTimes.push(t1 - t0);
          return res;
        };

        if (renderer.renderRgssFrame) {
          const origRgss = renderer.renderRgssFrame.bind(renderer);
          renderer.renderRgssFrame = function (...args) {
            const t0 = performance.now();
            const res = origRgss(...args);
            const t1 = performance.now();
            perfData.rgssTimes.push(t1 - t0);
            return res;
          };
        }
      }
    });

    // 5. TEST RAPID WHEEL ZOOM (Canvas): from 140% to 500% (zoom in), then down to 0.05% (zoom out), then back to 100%
    console.log('\n--- Running Scenario 1: Rapid Canvas Wheel Zoom (0% - 500%) ---');
    const canvasBox = page.locator('div.ved-canvas');
    await canvasBox.waitFor({ state: 'visible' });
    const box = await canvasBox.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.move(cx, cy);

    const tStartWheel = Date.now();
    // Rapid Zoom IN to 500%
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, -120);
    }
    // Allow brief settle
    await page.waitForTimeout(150);

    // Rapid Zoom OUT to ~0.05% (near 0%)
    for (let i = 0; i < 70; i++) {
      await page.mouse.wheel(0, 150);
    }
    await page.waitForTimeout(150);

    // Rapid Zoom back IN to ~100%
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, -120);
    }
    await page.waitForTimeout(200);
    const wheelDuration = Date.now() - tStartWheel;
    console.log(`[Wheel Zoom] Completed 150 rapid wheel ticks in ${wheelDuration}ms.`);

    // 6. TEST RAPID SIDEBAR SLIDER ZOOM
    console.log('\n--- Running Scenario 2: Rapid Right Sidebar Slider Drag (0 - 1000) ---');
    const sliderThumb = page.locator('[data-tip="veZoomSl"] .sl-h, .sl-h').first();
    const sliderTrack = page.locator('[data-tip="veZoomSl"] .sl-t, .sl-t').first();

    const trackBox = await sliderTrack.boundingBox();
    if (trackBox) {
      const tStartSlider = Date.now();
      // Rapid slider drag back and forth across 0% to 500%
      for (let sweep = 0; sweep < 3; sweep++) {
        // Drag to minimum (left edge, 0%)
        await page.mouse.move(trackBox.x + trackBox.width * 0.5, trackBox.y + trackBox.height / 2);
        await page.mouse.down();
        for (let step = 0; step <= 20; step++) {
          const frac = 0.5 - (step / 20) * 0.5;
          await page.mouse.move(trackBox.x + trackBox.width * frac, trackBox.y + trackBox.height / 2);
        }
        // Drag to maximum (right edge, 500%+)
        for (let step = 0; step <= 20; step++) {
          const frac = (step / 20);
          await page.mouse.move(trackBox.x + trackBox.width * frac, trackBox.y + trackBox.height / 2);
        }
        // Drag back to center (~100%)
        for (let step = 0; step <= 10; step++) {
          const frac = 1.0 - (step / 10) * 0.5;
          await page.mouse.move(trackBox.x + trackBox.width * frac, trackBox.y + trackBox.height / 2);
        }
        await page.mouse.up();
      }
      const sliderDuration = Date.now() - tStartSlider;
      console.log(`[Slider Zoom] Completed 3 rapid full slider sweeps in ${sliderDuration}ms.`);
    }

    // 7. Collect and analyze performance profiling data
    const perfSummary = await page.evaluate(() => {
      const data = (window as any).__zoomPerfData;
      const calcStats = (arr: number[]) => {
        if (!arr.length) return { count: 0, avg: 0, min: 0, max: 0, p95: 0, sum: 0 };
        const sorted = [...arr].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        return {
          count: sorted.length,
          sum: Math.round(sum * 100) / 100,
          avg: Math.round((sum / sorted.length) * 100) / 100,
          min: Math.round(sorted[0] * 100) / 100,
          max: Math.round(sorted[sorted.length - 1] * 100) / 100,
          p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
        };
      };

      const renderer = (window as any).__geovantaEditorApi.getSceneRenderer();
      const isRgssActive = renderer ? !renderer.antialias && (renderer.backend === 'CanvasKit GPU' || !renderer.cameraInteracting) : false;

      return {
        renderFrame: calcStats(data.renderFrameTimes),
        drawVector: calcStats(data.drawVectorTimes),
        rgss: calcStats(data.rgssTimes),
        longTasksCount: data.longTasks.length,
        longTasks: data.longTasks.slice(0, 10),
        rendererBackend: renderer ? renderer.backend : 'unknown',
        rendererAntialias: renderer ? renderer.antialias : 'unknown',
        currentZoom: (window as any).__geovantaEditorApi.getZoom(),
      };
    });

    console.log('\n===============================================================');
    console.log('         GEOVANTA RAPID ZOOM PERFORMANCE DIAGNOSTIC REPORT       ');
    console.log('===============================================================');
    console.log(`Backend Active:        ${perfSummary.rendererBackend}`);
    console.log(`Antialias (Native):    ${perfSummary.rendererAntialias}`);
    console.log(`Current Zoom End:      ${perfSummary.currentZoom}`);
    console.log(`Total Long Tasks (>50ms): ${perfSummary.longTasksCount}`);
    console.log('\n--- Timing Breakdown ---');
    console.log(`renderFrame() Calls:   ${perfSummary.renderFrame.count}`);
    console.log(`renderFrame() Total:   ${perfSummary.renderFrame.sum} ms`);
    console.log(`renderFrame() Avg:     ${perfSummary.renderFrame.avg} ms`);
    console.log(`renderFrame() p95:     ${perfSummary.renderFrame.p95} ms`);
    console.log(`renderFrame() Max:     ${perfSummary.renderFrame.max} ms`);

    console.log(`\ndrawVectorFrame() Calls: ${perfSummary.drawVector.count}`);
    console.log(`drawVectorFrame() Total: ${perfSummary.drawVector.sum} ms`);
    console.log(`drawVectorFrame() Avg:   ${perfSummary.drawVector.avg} ms`);
    console.log(`drawVectorFrame() p95:   ${perfSummary.drawVector.p95} ms`);
    console.log(`drawVectorFrame() Max:   ${perfSummary.drawVector.max} ms`);

    if (perfSummary.rgss.count > 0) {
      console.log(`\nrenderRgssFrame() Calls: ${perfSummary.rgss.count}`);
      console.log(`renderRgssFrame() Total: ${perfSummary.rgss.sum} ms`);
      console.log(`renderRgssFrame() Avg:   ${perfSummary.rgss.avg} ms`);
      console.log(`renderRgssFrame() p95:   ${perfSummary.rgss.p95} ms`);
      console.log(`renderRgssFrame() Max:   ${perfSummary.rgss.max} ms`);
    }

    if (perfSummary.longTasks.length > 0) {
      console.log('\n--- Top Long Tasks ---');
      perfSummary.longTasks.forEach((lt, idx) => {
        console.log(`  [#${idx + 1}] Duration: ${lt.duration.toFixed(2)}ms, Name: ${lt.name}`);
      });
    }
    console.log('===============================================================\n');

    expect(perfSummary.renderFrame.count).toBeGreaterThan(0);
  });
});
