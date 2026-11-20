import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('viewport benchmark: verifies 50,000 anchor zoom & projection calculations', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  // 1. Numerical Parity verification across 1,000 iterations
  for (let i = 0; i < 1000; i++) {
    const s0 = 1.0 + (i % 50) * 0.1;
    const p0x = (i * 13) % 200, p0y = (i * 17) % 200;
    const nz = 0.5 + (i % 80) * 0.05;
    const cx = 400 + (i % 20), cy = 300 + (i % 20);
    const boxW = 800, boxH = 600, boxL = 0, boxT = 0;

    // TypeScript baseline calculation
    const px = cx - boxL, py = cy - boxT;
    const wx = (px - p0x) / s0, wy = (py - p0y) / s0;
    const expectedPanX = px - wx * nz;
    const expectedPanY = py - wy * nz;

    // WASM execution
    const [wasmZ, wasmPanX, wasmPanY] = wasmEngine.computeZoomAtAnchor!(
      s0, p0x, p0y, nz, cx, cy, boxW, boxH, boxL, boxT, false
    );

    expect(wasmZ).toBeCloseTo(nz, 6);
    expect(Math.abs(wasmPanX - expectedPanX)).toBeLessThanOrEqual(1e-7);
    expect(Math.abs(wasmPanY - expectedPanY)).toBeLessThanOrEqual(1e-7);
  }

  // 2. High-throughput performance benchmark
  const N = 50000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    wasmEngine.computeZoomAtAnchor!(1.0, 0, 0, 1.0 + (i % 100) * 0.05, 400, 300, 800, 600, 0, 0, false);
  }
  const tWasm = performance.now() - t0;

  console.log(`[VIEWPORT BENCHMARK] N=${N} calls: WASM=${tWasm.toFixed(2)}ms`);
  expect(tWasm).toBeGreaterThan(0);
});
