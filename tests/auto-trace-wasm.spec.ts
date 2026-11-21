import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Rust/WASM Auto Trace Image to SVG', () => {
  test('trace_image_rgba_to_svg traces B&W and Color raster buffers into smooth SVG paths with hole and despeckle support', async () => {
    const wasmModule = await import(
      path.resolve(__dirname, '../rust/geovanta-wasm/pkg/geovanta_wasm.js')
    );

    expect(typeof wasmModule.trace_image_rgba_to_svg).toBe('function');

    // Create a 32x32 synthetic RGBA image:
    // White background, black outer square (6..26, 6..26), white inner hole (12..20, 12..20),
    // plus a tiny 1x1 black speckle at (2, 2) that should be removed by despeckle=4
    const w = 32;
    const h = 32;
    const rgba = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let isBlack = false;
        if (x >= 6 && x < 26 && y >= 6 && y < 26) {
          isBlack = true;
          if (x >= 12 && x < 20 && y >= 12 && y < 20) {
            isBlack = false; // inner hole
          }
        }
        if (x === 2 && y === 2) isBlack = true; // 1px speckle
        const val = isBlack ? 20 : 250;
        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    // 1. B&W trace with despeckle = 4, curve smoothing = 1.0
    const bwSvg = wasmModule.trace_image_rgba_to_svg(
      rgba,
      w,
      h,
      0,    // mode 0 = B&W
      128,  // threshold
      2,    // color_count (ignored in B&W)
      4,    // despeckle area
      1.0,  // smoothness
      60.0, // corner_threshold_deg
      true  // ignore_white
    );

    expect(typeof bwSvg).toBe('string');
    expect(bwSvg).toContain('<svg');
    expect(bwSvg).toContain('viewBox="0 0 32 32"');
    expect(bwSvg).toContain('<path');
    expect(bwSvg).toContain('fill-rule="evenodd"');
    // Should contain 2 closed subpaths (outer square + inner hole) and NOT the 1px speckle (which would be a 3rd subpath)
    const mMatches = bwSvg.match(/M\s*[\d.-]+/g) || [];
    expect(mMatches.length).toBe(2);

    // 2. Color multi-layer trace with red + blue quadrants
    const colorRgba = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (x >= 4 && x < 14 && y >= 4 && y < 28) {
          // Red bar
          colorRgba[idx] = 220;
          colorRgba[idx + 1] = 30;
          colorRgba[idx + 2] = 40;
          colorRgba[idx + 3] = 255;
        } else if (x >= 18 && x < 28 && y >= 4 && y < 28) {
          // Blue bar
          colorRgba[idx] = 30;
          colorRgba[idx + 1] = 80;
          colorRgba[idx + 2] = 230;
          colorRgba[idx + 3] = 255;
        } else {
          // Transparent background
          colorRgba[idx] = 255;
          colorRgba[idx + 1] = 255;
          colorRgba[idx + 2] = 255;
          colorRgba[idx + 3] = 0;
        }
      }
    }

    const colSvg = wasmModule.trace_image_rgba_to_svg(
      colorRgba,
      w,
      h,
      1,    // mode 1 = Color
      128,
      4,    // 4 colors
      2,    // despeckle
      0.8,  // smoothness
      60.0,
      true
    );

    expect(colSvg).toContain('<svg');
    const pathMatches = colSvg.match(/<path\b/g) || [];
    expect(pathMatches.length).toBeGreaterThanOrEqual(2);
  });
});
