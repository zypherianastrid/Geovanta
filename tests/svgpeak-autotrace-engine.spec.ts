import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  getSvgPeakVmt,
  getAutoTraceGpuInfo,
  traceRgbaBufferToSvg,
  traceRgbaBufferToSvgAsync,
} from '../src/engine/imageTracerEngine.tsx';

const SVGPEAK_ENGINE_FILES = [
  '00-vmt-compat.js',
  '04-ve-export-engine.js',
  '05-vmt-color-edge.js',
  '06-vmt-profiler-adaptive.js',
  '07-vmt-palette-kdtree.js',
  '08-vmt-segmentation-mrf.js',
  '09-vmt-cleanup-morphology.js',
  '10-vmt-boundary-beach.js',
  '11-vmt-smooth-bezier.js',
  '12-vmt-gradients-svg-dxf.js',
  '13-vmt-hardware-gpu-workers.js',
  '14-vmt-orchestrator.js',
];

test.describe('SVGPeak VMT Bayesian Auto Trace Engine Integration', () => {
  test('all 12 SVGPeak engine files are copied verbatim into src/engine/svgpeak/', () => {
    const destDir = path.resolve(__dirname, '../src/engine/svgpeak');
    const srcDir = path.resolve(__dirname, '../../SVGPeak-Tauri-Offline/src/js/engine');

    for (const file of SVGPEAK_ENGINE_FILES) {
      const destPath = path.join(destDir, file);
      expect(fs.existsSync(destPath), `Missing ${file} in src/engine/svgpeak`).toBe(true);
      if (fs.existsSync(srcDir)) {
        const srcContent = fs.readFileSync(path.join(srcDir, file), 'utf8');
        const destContent = fs.readFileSync(destPath, 'utf8');
        expect(destContent).toBe(srcContent);
      }
    }
  });

  test('getSvgPeakVmt exposes the complete 8-stage VMT Bayesian Vectorization Engine and traces images accurately', async () => {
    const VMT = getSvgPeakVmt();
    expect(VMT).toBeDefined();
    expect(typeof VMT.vectorize).toBe('function');
    expect(typeof VMT.classifyStage).toBe('function');
    expect(typeof VMT.buildAdaptiveTraceProfile).toBe('function');
    expect(typeof VMT.findPalette).toBe('function');
    expect(typeof VMT.quadtreeInit).toBe('function');
    expect(typeof VMT.segmentMRF).toBe('function');
    expect(typeof VMT.traceBoundaries).toBe('function');
    expect(typeof VMT.smoothLoop).toBe('function');
    expect(typeof VMT.fitLoopBeziers).toBe('function');
    expect(typeof VMT.assembleSVG).toBe('function');
    expect(typeof VMT.ciede2000).toBe('function');

    // Create a 64x64 synthetic multi-color image (white background, red circle, blue square)
    const w = 64;
    const h = 64;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (Math.hypot(x - 22, y - 32) <= 13) {
          rgba[i] = 220;
          rgba[i + 1] = 38;
          rgba[i + 2] = 38;
          rgba[i + 3] = 255;
        } else if (x >= 38 && x <= 56 && y >= 18 && y <= 46) {
          rgba[i] = 37;
          rgba[i + 1] = 99;
          rgba[i + 2] = 235;
          rgba[i + 3] = 255;
        } else {
          rgba[i] = 255;
          rgba[i + 1] = 255;
          rgba[i + 2] = 255;
          rgba[i + 3] = 255;
        }
      }
    }

    // Async full VMT.vectorize pipeline
    const asyncRes = await traceRgbaBufferToSvgAsync(rgba, w, h, {
      mode: 'color',
      colorMode: 'auto',
      ignoreWhite: true,
    });
    expect(asyncRes.svg).toContain('<svg');
    expect(asyncRes.svg).toContain('<path');
    expect(asyncRes.palette.length).toBeGreaterThanOrEqual(2);

    // Sync VMT pipeline wrapper
    const syncSvg = traceRgbaBufferToSvg(rgba, w, h, {
      mode: 'color',
      colorCount: 4,
      ignoreWhite: true,
    });
    expect(syncSvg).toContain('<svg');
    expect(syncSvg).toContain('<path');
  });

  test('getAutoTraceGpuInfo reports hardware backend and mode=ultra traces accurately with CPU fallback', async () => {
    const hwInfo = getAutoTraceGpuInfo();
    expect(hwInfo).toBeDefined();
    expect(typeof hwInfo.gpuAvailable).toBe('boolean');
    expect(typeof hwInfo.backend).toBe('string');

    const w = 32;
    const h = 32;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        rgba[i] = Math.round((x / 31) * 240);
        rgba[i + 1] = Math.round((y / 31) * 200);
        rgba[i + 2] = 180;
        rgba[i + 3] = 255;
      }
    }

    const ultraCpuRes = await traceRgbaBufferToSvgAsync(rgba, w, h, {
      mode: 'ultra',
      useGpu: false,
      colorCount: 64,
      ignoreWhite: false,
    });
    expect(ultraCpuRes.svg).toContain('<svg');
    expect(ultraCpuRes.svg).toContain('<path');
    expect(ultraCpuRes.stats.hw.gpuUsed).toBe(false);
    expect(ultraCpuRes.stats.hw.gpuBackend).toContain('CPU');
  });
});
