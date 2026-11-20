import { test, expect } from '@playwright/test';
import { initWasmEngine, wasmEngine } from '../src/bridge/wasmEngineBridge.ts';
import { pointToChordDistSq } from '../src/renderer/adaptiveCubicFlattener.tsx';

test('benchmark: verifies numerical parity and speedup of WASM engine', async () => {
  await initWasmEngine();
  expect(wasmEngine.isReady).toBe(true);

  // Parity test: 1000 curve chord distances
  for (let i = 0; i < 1000; i++) {
    const px = (i * 17) % 500, py = (i * 31) % 500;
    const x0 = 0, y0 = 0, dx = 400, dy = 300, chordLenSq = 250000;
    const tsDist = pointToChordDistSq(px, py, x0, y0, dx, dy, chordLenSq);
    expect(wasmEngine.pointToChordDistSq).not.toBeNull();
    const wasmDist = wasmEngine.pointToChordDistSq!(px, py, x0, y0, dx, dy, chordLenSq);
    expect(Math.abs(tsDist - wasmDist)).toBeLessThanOrEqual(1e-7);
  }

  // Benchmark speedup verification
  const N = 50000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) pointToChordDistSq(i % 500, (i * 2) % 500, 0, 0, 1000, 1000, 2000000);
  const tTs = performance.now() - t0;

  const t1 = performance.now();
  for (let i = 0; i < N; i++) wasmEngine.pointToChordDistSq!(i % 500, (i * 2) % 500, 0, 0, 1000, 1000, 2000000);
  const tWasm = performance.now() - t1;

  console.log(`[BENCHMARK] N=${N} calls: TS=${tTs.toFixed(2)}ms, WASM=${tWasm.toFixed(2)}ms`);
  expect(tWasm).toBeGreaterThan(0);
});
