import { test, expect } from '@playwright/test';
import * as path from 'path';

test('flattener: verifies point_to_chord_dist_sq and flatten_cubic_adaptive_flat', async () => {
  const wasmModule = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  const { point_to_chord_dist_sq, flatten_cubic_adaptive_flat } = wasmModule;
  expect(typeof point_to_chord_dist_sq).toBe('function');
  expect(typeof flatten_cubic_adaptive_flat).toBe('function');

  // 1. Point to chord test
  const distSq = point_to_chord_dist_sq(0, 10, 0, 0, 100, 0, 10000);
  expect(distSq).toBeCloseTo(100.0, 5);

  // 2. Collinear curve meets flatness error immediately, emitting endpoint (100, 0)
  const straightPts = flatten_cubic_adaptive_flat(0, 0, 33, 0, 66, 0, 100, 0, 0.25, 16, 0.01, 1000);
  expect(straightPts.length).toBe(2);
  expect(straightPts[0]).toBe(100);
  expect(straightPts[1]).toBe(0);

  // 3. Curved arc generates multiple points
  const curvedPts = flatten_cubic_adaptive_flat(0, 0, 0, 100, 100, 100, 100, 0, 0.25, 16, 0.01, 1000);
  expect(curvedPts.length).toBeGreaterThan(2);
  expect(curvedPts[curvedPts.length - 2]).toBe(100);
  expect(curvedPts[curvedPts.length - 1]).toBe(0);

  // Review Focus 3: Budget cap hit emits endpoint (x3, y3)
  const budgetLimitedPts = flatten_cubic_adaptive_flat(0, 0, 10, 50, 90, 50, 100, 0, 0.001, 16, 0.01, 1);
  expect(budgetLimitedPts.length).toBe(2);
  expect(budgetLimitedPts[0]).toBe(100);
  expect(budgetLimitedPts[1]).toBe(0);
});
