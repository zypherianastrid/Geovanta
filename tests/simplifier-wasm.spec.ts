import { test, expect } from '@playwright/test';
import * as path from 'path';

test('simplifier: verifies RDP polyline simplification', async () => {
  const wasmModule = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  const { rdp_simplify_flat } = wasmModule;
  expect(typeof rdp_simplify_flat).toBe('function');

  // Review Focus 1: < 3 points returns original points
  const shortLine = new Float64Array([0, 0, 100, 100]);
  const simplifiedShort = rdp_simplify_flat(shortLine, 1.0);
  expect(Array.from(simplifiedShort)).toEqual([0, 0, 100, 100]);

  // Collinear 3 points -> middle point should be eliminated
  const straightLine = new Float64Array([0, 0, 50, 0, 100, 0]);
  const simplifiedStraight = rdp_simplify_flat(straightLine, 0.5);
  expect(Array.from(simplifiedStraight)).toEqual([0, 0, 100, 0]);

  // Point deviating by 10 units with epsilon=2 -> kept
  const zigZag = new Float64Array([0, 0, 50, 10, 100, 0]);
  const simplifiedZigZag = rdp_simplify_flat(zigZag, 2.0);
  expect(Array.from(simplifiedZigZag)).toEqual([0, 0, 50, 10, 100, 0]);

  // Same point with epsilon=15 -> simplified to start & end
  const flattenedZigZag = rdp_simplify_flat(zigZag, 15.0);
  expect(Array.from(flattenedZigZag)).toEqual([0, 0, 100, 0]);
});
