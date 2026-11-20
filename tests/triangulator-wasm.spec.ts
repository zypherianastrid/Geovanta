import { test, expect } from '@playwright/test';
import * as path from 'path';

test('triangulator: verifies ear-clipping and self-intersection detection', async () => {
  const wasmModule = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  const { has_polygon_self_intersection_flat, ear_clip_polygon_flat } = wasmModule;
  expect(typeof has_polygon_self_intersection_flat).toBe('function');
  expect(typeof ear_clip_polygon_flat).toBe('function');

  // Review Focus 1: Empty or < 3 vertices returns null/undefined
  expect(ear_clip_polygon_flat(new Float64Array([0, 0, 10, 0]))).toBeFalsy();

  // Simple triangle: 3 vertices [0,0, 10,0, 0,10]
  const triCoords = new Float64Array([0, 0, 10, 0, 0, 10]);
  expect(has_polygon_self_intersection_flat(triCoords)).toBe(false);
  const triMesh = ear_clip_polygon_flat(triCoords);
  expect(triMesh).not.toBeNull();
  expect(triMesh!.length).toBe(6); // 1 triangle * 3 vertices * 2 coords

  // Simple quad: square 10x10 -> 2 triangles (12 coords)
  const quadCoords = new Float64Array([0, 0, 10, 0, 10, 10, 0, 10]);
  const quadMesh = ear_clip_polygon_flat(quadCoords);
  expect(quadMesh).not.toBeNull();
  expect(quadMesh!.length).toBe(12);

  // Review Focus 4: Polygon with coincident & collinear points
  const dirtyCoords = new Float64Array([0, 0, 0, 0, 5, 0, 10, 0, 10, 10, 0, 10]);
  const cleanedMesh = ear_clip_polygon_flat(dirtyCoords);
  expect(cleanedMesh).not.toBeNull();
  expect(cleanedMesh!.length).toBe(12);

  // Bowtie (self-intersecting) polygon -> must return null
  const bowtieCoords = new Float64Array([0, 0, 10, 10, 10, 0, 0, 10]);
  expect(has_polygon_self_intersection_flat(bowtieCoords)).toBe(true);
  expect(ear_clip_polygon_flat(bowtieCoords)).toBeFalsy();
});
