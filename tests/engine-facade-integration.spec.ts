import { test, expect } from '@playwright/test';
import { flattenCubicAdaptive } from '../src/renderer/adaptiveCubicFlattener.tsx';
import { earClipSimplePolygon } from '../src/renderer/polygonTriangulatorAndStroke.tsx';
import { vcRdp } from '../src/engine/topologicalCurveSimplifier.tsx';
import { wasmEngine, initWasmEngine } from '../src/bridge/wasmEngineBridge.ts';

test('engine facade: verifies fallback before init and wasm execution after init', async () => {
  // Review Focus 5: Fallback works seamlessly before WASM is initialized
  expect(wasmEngine.isReady).toBe(false);
  const outFallback: number[] = [];
  const statsFallback = { vertexCount: 0, segmentCount: 0, vertexLimit: 1000 };
  flattenCubicAdaptive({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.25, outFallback, 0, 0.01, statsFallback);
  expect(outFallback).toEqual([100, 0]);
  expect(statsFallback.vertexCount).toBe(1);

  // Initialize WASM
  const initialized = await initWasmEngine();
  expect(initialized).toBe(true);
  expect(wasmEngine.isReady).toBe(true);

  // After init: Facade transparently executes WASM
  const outWasm: number[] = [];
  const statsWasm = { vertexCount: 0, segmentCount: 0, vertexLimit: 1000 };
  flattenCubicAdaptive({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.25, outWasm, 0, 0.01, statsWasm);
  expect(outWasm).toEqual([100, 0]);
  expect(statsWasm.vertexCount).toBe(1);

  // Curved cubic flattener via facade
  const outCurved: number[] = [];
  const statsCurved = { vertexCount: 0, segmentCount: 0, vertexLimit: 1000 };
  flattenCubicAdaptive(
    { x: 0, y: 0, handleOut: { x: 0, y: 100 } },
    { x: 100, y: 0, handleIn: { x: 100, y: 100 } },
    0.25, outCurved, 0, 0.01, statsCurved
  );
  expect(outCurved.length).toBeGreaterThan(2);
  expect(statsCurved.vertexCount).toBe(outCurved.length / 2);

  // Polygon ear clipping facade
  const quadCoords = [0, 0, 10, 0, 10, 10, 0, 10];
  const mesh = earClipSimplePolygon(quadCoords);
  expect(mesh).not.toBeNull();
  expect(mesh!.length).toBe(12);

  // RDP simplifier facade
  const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }];
  const simplified = vcRdp(pts, 0.5);
  expect(simplified.length).toBe(2);
  expect(simplified[0]).toEqual({ x: 0, y: 0 });
  expect(simplified[1]).toEqual({ x: 100, y: 0 });
});
