import { test, expect } from '@playwright/test';

test('E2E: Rapid zoom in and zoom out from 0% to 500% on canvas and sidebar slider is smooth (<8ms frame time, 0 dropped frames)', async ({ page }) => {
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

  await page.waitForFunction(() => typeof window.__geovantaEditorApi !== 'undefined');

  // Populate canvas with 55 random vector objects across all available drawing tools
  await page.evaluate(() => {
    const api = window.__geovantaEditorApi;
    const shapeTypes = [
      'rect', 'circle', 'ellipse', 'star', 'star-five', 'star-six', 'star-eight',
      'burst', 'badge', 'heart', 'cloud', 'drop', 'shield', 'ring', 'spiral',
      'crescent', 'polygon', 'trapezoid', 'parallelogram', 'cross'
    ];

    // 1. Shapes (20 objects)
    shapeTypes.forEach((type, i) => {
      api.createTestShape(type, 40 + (i % 5) * 140, 40 + Math.floor(i / 5) * 140, 90, 90);
    });

    // 2. Lines & Arcs (10 objects)
    for (let i = 0; i < 5; i++) {
      api.createTestLine({ x: 50, y: 600 + i * 30 }, { x: 300, y: 600 + i * 30 });
      api.createTestArc(450, 600 + i * 30, 40, 0, 180);
    }

    // 3. Pen Tool multi-node beziers (5 objects)
    for (let i = 0; i < 5; i++) {
      api.startTestPenSession([
        { x: 600, y: 100 + i * 100 },
        { x: 650, y: 80 + i * 100 },
        { x: 720, y: 120 + i * 100 }
      ]);
      api.finishPen();
    }

    // 4. Curvature Tool paths (5 objects)
    for (let i = 0; i < 5; i++) {
      api.startTestCurvatureSession([
        { x: 800, y: 100 + i * 100 },
        { x: 850, y: 150 + i * 100 },
        { x: 900, y: 90 + i * 100 }
      ]);
      api.finishCurvature();
    }

    // 5. Weave patterns (5 objects)
    for (let i = 0; i < 5; i++) {
      api.createTestWeave(50 + i * 150, 750, 120, 120);
    }

    // 6. Dense Pencil & Brush paths (5 objects)
    const pencilObjs = [];
    for (let i = 0; i < 5; i++) {
      const nodes = [];
      for (let p = 0; p < 60; p++) {
        nodes.push({
          id: 'n_p_' + i + '_' + p,
          x: 800 + p * 4,
          y: 650 + Math.sin(p * 0.3) * 35 + i * 30,
          type: 'corner',
          handleIn: null,
          handleOut: null
        });
      }
      pencilObjs.push({
        id: 'pencil_' + i,
        name: 'Pencil-' + (i + 1),
        type: 'path',
        fill: 'none',
        stroke: '#e11d48',
        strokeWidth: 3,
        opacity: 1,
        fillRule: 'nonzero',
        group: null,
        subs: [{ id: 'sub_' + i, closed: false, nodes }]
      });
    }

    // 7. Typography / Text (5 objects)
    const textObjs = [];
    for (let i = 0; i < 5; i++) {
      textObjs.push({
        id: 'text_' + i,
        name: 'Text-' + (i + 1),
        type: 'text',
        x: 50 + i * 150,
        y: 920,
        text: `Geovanta Vector Text ${i + 1}`,
        fontSize: 24,
        fontFamily: 'Inter, sans-serif',
        fill: '#1e293b',
        opacity: 1
      });
    }

    api.commitDoc({
      ...api.getDoc(),
      objects: [...api.getDoc().objects, ...pencilObjs, ...textObjs]
    });
  });

  // Verify that during zoom interaction, dynamic LOD correctly suppresses RGSS
  const lodVerification = await page.evaluate(() => {
    const api = window.__geovantaEditorApi;
    const renderer = api.getSceneRenderer();
    let rgssCalledDuringZoom = false;

    const origRgss = renderer.renderRgssFrame?.bind(renderer);
    renderer.renderRgssFrame = function(...args: any[]) {
      if (renderer.cameraInteracting) {
        rgssCalledDuringZoom = true;
      }
      return origRgss ? origRgss(...args) : null;
    };

    // Trigger interactive zoom gesture
    api.setZ(2.5, 500, 400, true);

    return {
      cameraInteracting: renderer.cameraInteracting,
      rgssCalledDuringZoom
    };
  });

  expect(lodVerification.cameraInteracting).toBe(true);
  expect(lodVerification.rgssCalledDuringZoom).toBe(false);

  // Rapid Zoom Test 1: Rapid canvas wheel zoom from 0% (min 0.05) to 500% (5.0) and back
  const canvasResults = await page.evaluate(async () => {
    const api = window.__geovantaEditorApi;
    const frameTimes: number[] = [];

    // Zoom from 1.0 -> 5.0 in 40 frames
    for (let i = 1; i <= 40; i++) {
      const targetZ = 1.0 + (4.0 * (i / 40));
      const t0 = performance.now();
      api.setZ(targetZ, 500, 400, true);
      frameTimes.push(performance.now() - t0);
    }

    // Zoom from 5.0 -> 0.1 (10%) in 40 frames
    for (let i = 1; i <= 40; i++) {
      const targetZ = 5.0 - (4.9 * (i / 40));
      const t0 = performance.now();
      api.setZ(targetZ, 500, 400, true);
      frameTimes.push(performance.now() - t0);
    }

    // Settle
    const tSettle0 = performance.now();
    api.setZ(1.0, 500, 400, false);
    const settleLatency = performance.now() - tSettle0;

    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const max = Math.max(...frameTimes);
    const droppedFrames = frameTimes.filter(t => t > 16.6).length;

    return {
      avg,
      max,
      droppedFrames,
      totalFrames: frameTimes.length,
      settleLatency
    };
  });

  console.log('Rapid Canvas Zoom Results:', canvasResults);
  expect(canvasResults.avg).toBeLessThan(8.0);
  expect(canvasResults.droppedFrames).toBe(0);
  expect(canvasResults.settleLatency).toBeLessThan(16.0);

  // Rapid Zoom Test 2: Rapid sidebar zoom slider interaction
  const sliderResults = await page.evaluate(async () => {
    const api = window.__geovantaEditorApi;
    const frameTimes: number[] = [];

    // Simulate sidebar slider dragging from 0 to 1000 (0% to 500%+)
    for (let step = 0; step <= 50; step++) {
      const sliderVal = (step / 50) * 1000;
      // Convert slider to zoom
      const nextZ = Math.pow(64, sliderVal / 1000) * 0.05;
      const t0 = performance.now();
      api.setZ(nextZ, null, null, true);
      frameTimes.push(performance.now() - t0);
    }

    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const max = Math.max(...frameTimes);
    const droppedFrames = frameTimes.filter(t => t > 16.6).length;

    return {
      avg,
      max,
      droppedFrames,
      totalFrames: frameTimes.length
    };
  });

  console.log('Rapid Sidebar Slider Zoom Results:', sliderResults);
  expect(sliderResults.avg).toBeLessThan(8.0);
  expect(sliderResults.droppedFrames).toBe(0);
});
