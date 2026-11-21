/**
 * @file src/engine/imageTracerEngine.tsx
 * @description High-speed Raster Image to Vector SVG Auto-Tracer powered by Rust/WASM (geovanta-wasm)
 */
import { wasmEngine, initWasmEngine } from '../bridge/wasmEngineBridge.ts';
import { parseSVG } from './svgDocumentParser.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { scaleObjXY } from './selectionTransformAndAlign.tsx';
import { translate } from './bezierSubdivisionAndMove.tsx';
import { uid } from './vectorPrimitives.tsx';

export interface AutoTraceOptions {
  mode?: 'bw' | 'color';
  threshold?: number;       // 0..255 (default 128)
  colorCount?: number;      // 2..16 (default 6)
  despeckle?: number;       // 0..100 px^2 (default 4)
  smoothness?: number;      // 0..1.5 (default 1.0)
  cornerThreshold?: number; // 15..165 deg (default 60)
  ignoreWhite?: boolean;    // default true
  keepOriginalImage?: boolean; // default false
  maxSampleDim?: number;    // default 768
}

export const DEFAULT_AUTO_TRACE_OPTIONS: Required<AutoTraceOptions> = {
  mode: 'bw',
  threshold: 128,
  colorCount: 6,
  despeckle: 4,
  smoothness: 1.0,
  cornerThreshold: 60,
  ignoreWhite: true,
  keepOriginalImage: false,
  maxSampleDim: 768,
};

/**
 * Trace raw RGBA8 pixel buffer (Uint8Array | Uint8ClampedArray) into an SVG string via Rust/WASM.
 */
export function traceRgbaBufferToSvg(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: AutoTraceOptions = {}
): string {
  const opts = { ...DEFAULT_AUTO_TRACE_OPTIONS, ...options };
  const buf = rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  const modeNum = opts.mode === 'color' ? 1 : 0;
  const thresh = Math.max(0, Math.min(255, Math.round(opts.threshold)));
  const colors = Math.max(2, Math.min(16, Math.round(opts.colorCount)));
  const despeckle = Math.max(0, Math.round(opts.despeckle));
  const smooth = Math.max(0, Math.min(1.5, Number(opts.smoothness) || 0));
  const cornerDeg = Math.max(15, Math.min(165, Number(opts.cornerThreshold) || 60));

  if (wasmEngine.isReady && wasmEngine.traceImageRgbaToSvg) {
    return wasmEngine.traceImageRgbaToSvg(
      buf,
      width,
      height,
      modeNum,
      thresh,
      colors,
      despeckle,
      smooth,
      cornerDeg,
      Boolean(opts.ignoreWhite)
    );
  }

  return fallbackTraceRgbaToSvg(buf, width, height, modeNum, thresh, despeckle);
}

/**
 * Lightweight JS fallback if WASM has not finished initializing yet.
 */
function fallbackTraceRgbaToSvg(
  rgba: Uint8Array,
  width: number,
  height: number,
  _mode: number,
  threshold: number,
  _despeckle: number
): string {
  const w = width | 0;
  const h = height | 0;
  if (w <= 0 || h <= 0) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>`;
  const runs: string[] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const i = (y * w + x) * 4;
      const lum = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
      const fg = rgba[i + 3] >= 64 && lum <= threshold;
      if (!fg) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < w) {
        const j = (y * w + x) * 4;
        const l2 = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
        if (rgba[j + 3] < 64 || l2 > threshold) break;
        x++;
      }
      runs.push(`M${x0} ${y}L${x} ${y}L${x} ${y + 1}L${x0} ${y + 1}Z`);
    }
  }
  if (!runs.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><path fill="#18181b" fill-rule="evenodd" d="${runs.join(' ')}"/></svg>`;
}

/**
 * Load an image href (data URI / blob URL / asset URL) into an offscreen HTMLCanvasElement and extract its RGBA buffer.
 */
export async function extractImageObjectRgba(
  imgHref: string,
  maxDim = 768
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
  await initWasmEngine();
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Canvas 2D environment required to decode raster image');
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = Math.max(1, img.naturalWidth || img.width || 64);
        const nh = Math.max(1, img.naturalHeight || img.height || 64);
        const scale = Math.min(1, maxDim / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to obtain 2D context for image tracing'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        resolve({
          rgba: new Uint8Array(imgData.data.buffer, imgData.data.byteOffset, imgData.data.byteLength),
          width: w,
          height: h,
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load raster image for Auto Trace'));
    img.src = imgHref;
  });
}

/**
 * Trace an editor image object (`o.type === 'image'` / `o.img`) into vector path objects positioned at the image's bounding box.
 */
export async function traceImageObjectToVectorPaths(
  imageObj: any,
  options: AutoTraceOptions = {}
): Promise<{ objects: any[]; svg: string; nodeCount: number; pathCount: number }> {
  if (!imageObj || !imageObj.img || !imageObj.img.href) {
    throw new Error('Invalid image object');
  }
  const opts = { ...DEFAULT_AUTO_TRACE_OPTIONS, ...options };
  const { rgba, width, height } = await extractImageObjectRgba(imageObj.img.href, opts.maxSampleDim);
  const svg = traceRgbaBufferToSvg(rgba, width, height, opts);
  const parsed = parseSVG(svg);
  if (parsed.error || !parsed.objects.length) {
    return { objects: [], svg, nodeCount: 0, pathCount: 0 };
  }

  // Compute target bounding box of the image object on the canvas
  const bb = tightBBox(imageObj);
  const targetX = Number.isFinite(bb?.[0]) ? bb[0] : 0;
  const targetY = Number.isFinite(bb?.[1]) ? bb[1] : 0;
  const targetW = Number.isFinite(bb?.[2]) && bb[2] > bb[0] ? bb[2] - bb[0] : (imageObj.img.w || width);
  const targetH = Number.isFinite(bb?.[3]) && bb[3] > bb[1] ? bb[3] - bb[1] : (imageObj.img.h || height);

  const sx = targetW / Math.max(1, width);
  const sy = targetH / Math.max(1, height);
  const baseName = (imageObj.name || 'Trace').replace(/\s+/g, '-');
  const groupId = parsed.objects.length > 1 ? `${baseName}-trace` : (imageObj.group || null);

  let totalNodes = 0;
  const outObjects = parsed.objects.map((po: any, idx: number) => {
    let transformed = scaleObjXY(po, 0, 0, sx, sy, true);
    transformed = translate(transformed, targetX, targetY);
    const nCount = (transformed.subs || []).reduce((acc: number, sp: any) => acc + (sp.nodes?.length || 0), 0);
    totalNodes += nCount;
    return {
      ...transformed,
      id: uid(),
      name: parsed.objects.length === 1 ? `${baseName}-traced` : `${baseName}-layer-${idx + 1}`,
      group: groupId,
      opacity: imageObj.opacity ?? 1,
    };
  });

  return {
    objects: outObjects,
    svg,
    nodeCount: totalNodes,
    pathCount: outObjects.length,
  };
}
