import { test, expect } from '@playwright/test';
import { vzToSl, vslToZ } from '../src/utils/zoomAndFormatHelpers.tsx';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('zoom slider facade: verifies parity and fallback before/after wasm init', async () => {
  // 1. Test fallback before WASM init
  const slBefore = vzToSl(1.0);
  const zBefore = vslToZ(slBefore);
  expect(slBefore).toBeGreaterThan(0);
  expect(zBefore).toBeCloseTo(1.0, 2);

  // 2. Initialize WASM
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  // 3. Test facade after WASM init across multiple zoom levels
  const testZooms = [0.0005, 0.01, 0.1, 0.5, 1.0, 2.5, 10.0, 100.0, 1000.0, 5000.0];
  for (const z of testZooms) {
    const sl = vzToSl(z);
    expect(sl).toBeGreaterThanOrEqual(0);
    expect(sl).toBeLessThanOrEqual(1000);
    const zBack = vslToZ(sl);
    // Relative error within 0.2% due to 0.1 decimal quantization
    expect(Math.abs(zBack - z) / z).toBeLessThan(0.002);
  }

  // 4. Test exact boundary parity
  expect(vzToSl(0.0005)).toBe(0);
  expect(vzToSl(5000.0)).toBe(1000);
  expect(vslToZ(0)).toBeCloseTo(0.0005, 6);
  expect(vslToZ(1000)).toBeCloseTo(5000.0, 1);
});
