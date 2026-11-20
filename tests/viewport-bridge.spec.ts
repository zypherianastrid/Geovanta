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
});
