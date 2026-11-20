import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('viewport bridge: exposes all viewport functions after initWasmEngine', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);
  expect(typeof wasmEngine.computeZoomAtAnchor).toBe('function');
  expect(typeof wasmEngine.computeWheelZoomFactor).toBe('function');
  expect(typeof wasmEngine.computeFitTo).toBe('function');
  expect(typeof wasmEngine.zoomToSlider).toBe('function');
  expect(typeof wasmEngine.sliderToZoom).toBe('function');
  expect(typeof wasmEngine.screenToWorld).toBe('function');
  expect(typeof wasmEngine.worldToScreen).toBe('function');
  expect(typeof wasmEngine.computeVisibleBounds).toBe('function');

  const z = wasmEngine.sliderToZoom!(500);
  expect(z).toBeGreaterThan(0.0005);
  expect(z).toBeLessThan(5000);

  // Projection round-trip test
  const [wx, wy] = wasmEngine.screenToWorld!(400, 300, 2.0, 100, 50);
  const [sx, sy] = wasmEngine.worldToScreen!(wx, wy, 2.0, 100, 50);
  expect(sx).toBeCloseTo(400, 6);
  expect(sy).toBeCloseTo(300, 6);

  // Visible bounds test
  const [l, t, r, b] = wasmEngine.computeVisibleBounds!(2.0, 100, 50, 800, 600);
  expect(l).toBeCloseTo(-50, 6);
  expect(t).toBeCloseTo(-25, 6);
  expect(r).toBeCloseTo(350, 6);
  expect(b).toBeCloseTo(275, 6);
});
