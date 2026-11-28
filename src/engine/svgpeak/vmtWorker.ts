/**
 * @file src/engine/svgpeak/vmtWorker.ts
 * @description Dedicated Web Worker (dan fallback <script> untuk file://) untuk SVGPeak VMT Auto-Trace
 */
import { getSvgPeakVmtEngine } from './vmtEngineBundle.js';

const g = globalThis as any;
g.__geovantaGetSvgPeakVmt = getSvgPeakVmtEngine;

// Jalankan listener Worker hanya di konteks Dedicated Worker (bukan window/DOM)
if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  (self as any).onmessage = async (ev: MessageEvent) => {
    const data = ev.data || {};
    const { id, rgbaBuffer, width, height, vmtCfg, opts } = data;
    try {
      const { VMT } = getSvgPeakVmtEngine();
      if (typeof VMT.setHwConfig === 'function') {
        VMT.setHwConfig({
          useGpu: false,
          gpuPipeline: 'off',
          multiThread: false,
        });
      }
      const rgba = new Uint8ClampedArray(rgbaBuffer);
      const res = await VMT.vectorize(
        { rgba, img: { _rgba: rgba, w: width, h: height }, w: width, h: height },
        vmtCfg,
        (stage: string, frac: number, detail: string) => {
          (self as any).postMessage({ id, type: 'progress', stage, frac, detail });
        }
      );
      const svg = VMT.assembleSVG(res.regs, res.W, res.H, {
        stackMode: vmtCfg?.stackMode || 'stack',
        stroke: vmtCfg?.stroke !== false,
        bg: 'none',
        safetyBg: !opts?.ignoreWhite && !(res.stats?.alpha?.hasAlpha),
        hiddenLabels: [],
        frameId: false,
      });
      (self as any).postMessage({
        id,
        type: 'done',
        svg,
        palette: Array.isArray(res.palette) ? res.palette : [],
        regions: [],
        stats: res.stats || {},
      });
    } catch (err: any) {
      (self as any).postMessage({
        id,
        type: 'error',
        message: (err && err.message) || String(err),
      });
    }
  };
}
