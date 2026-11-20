import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('viewport hook facade: verifies anchor zoom and fitTo calculation parity', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  // 1. Verify computeZoomAtAnchor calculation
  const anchorRes = wasmEngine.computeZoomAtAnchor!(1.0, 0, 0, 1.5, 400, 300, 800, 600, 0, 0, false);
  expect(anchorRes[0]).toBe(1.5);
  expect(anchorRes[1]).toBe(400 - 400 * 1.5);
  expect(anchorRes[2]).toBe(300 - 300 * 1.5);

  // 2. Verify computeFitTo calculation
  const fitRes = wasmEngine.computeFitTo!(0, 0, 400, 300, 800, 600, 24);
  expect(fitRes[3]).toBe(true);
  expect(fitRes[0]).toBeGreaterThan(0);

  // 3. Verify computeWheelZoomFactor
  const wheelFactor = wasmEngine.computeWheelZoomFactor!(100, 0, 600, false);
  expect(wheelFactor).toBeCloseTo(Math.exp(-100 * 0.0015), 5);

  const pinchFactor = wasmEngine.computeWheelZoomFactor!(50, 0, 600, true);
  expect(pinchFactor).toBeCloseTo(Math.exp(-50 * 0.0035), 5);
});
