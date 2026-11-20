import { test, expect } from '@playwright/test';
import * as path from 'path';

test('viewport wasm: verifies anchor zoom, fit-to, and logarithmic slider math', async () => {
  const wasm = await import(
    path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
  );

  expect(typeof wasm.compute_zoom_at_anchor).toBe('function');
  expect(typeof wasm.compute_wheel_zoom_factor).toBe('function');
  expect(typeof wasm.compute_fit_to).toBe('function');
  expect(typeof wasm.zoom_to_slider).toBe('function');
  expect(typeof wasm.slider_to_zoom).toBe('function');

  // Review Focus 4: Slider boundaries
  expect(wasm.slider_to_zoom(0)).toBeCloseTo(0.0005, 6);
  expect(wasm.slider_to_zoom(1000)).toBeCloseTo(5000.0, 1);
  expect(wasm.zoom_to_slider(0.0005)).toBe(0);
  expect(wasm.zoom_to_slider(5000.0)).toBe(1000);

  // Review Focus 1: Extreme zoom clamping
  const resClamped = wasm.compute_zoom_at_anchor(1.0, 0, 0, 999999, 400, 300, 800, 600, 0, 0, true);
  expect(resClamped[0]).toBe(5000.0);

  // Normal zoom anchor test: zoom 1x to 2x around center (400, 300)
  const res = wasm.compute_zoom_at_anchor(1.0, 0, 0, 2.0, 400, 300, 800, 600, 0, 0, true);
  expect(res[0]).toBe(2.0); // new_zoom
  expect(res[1]).toBe(-400.0); // new_pan_x: 400 - (400 * 2) = -400
  expect(res[2]).toBe(-300.0); // new_pan_y: 300 - (300 * 2) = -300

  // Review Focus 2: Fit to invalid dimensions returns success = 0.0
  const invalidFit = wasm.compute_fit_to(0, 0, 100, 100, 0, 0, 24);
  expect(invalidFit[3]).toBe(0.0);

  // Fit to 1000x1000 box in 800x600 viewport with pad 24
  const fit = wasm.compute_fit_to(0, 0, 1000, 1000, 800, 600, 24);
  expect(fit[3]).toBe(1.0);
  expect(fit[0]).toBeGreaterThan(0);
});
