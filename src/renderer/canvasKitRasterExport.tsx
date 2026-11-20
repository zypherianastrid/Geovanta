import { ACTIVE_DEVICE_PROFILE } from '../utils/deviceProfiles.tsx';
import { RENDER_CONFIG } from '../utils/renderConfigAndTelemetry.tsx';
import { resolveExportArea } from '../engine/svgDocumentSerializer.tsx';
import { loadCanvasKit } from './canvasKitRuntime.tsx';
import { CanvasKitScene, documentFrames } from './canvasKitScene.tsx';

// Precomputed sRGB <-> Linear lookup table for gamma-correct SSAA downsampling
const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number) {
  const c = Math.max(0, Math.min(1, v));
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

function downsampleLinear2x(srcCanvas: HTMLCanvasElement, dstCanvas: HTMLCanvasElement, w: number, h: number) {
  const srcCtx = typeof srcCanvas?.getContext === 'function' ? srcCanvas.getContext('2d') : null;
  const dstCtx = typeof dstCanvas?.getContext === 'function' ? dstCanvas.getContext('2d') : null;
  if (!srcCtx || !dstCtx) return false;
  const srcData = srcCtx.getImageData(0, 0, w * 2, h * 2).data;
  const dstImg = dstCtx.createImageData(w, h);
  const dstData = dstImg.data;
  const srcW = w * 2;

  for (let y = 0; y < h; y++) {
    const row0 = (y * 2) * srcW * 4;
    const row1 = (y * 2 + 1) * srcW * 4;
    const dstRow = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i0 = row0 + (x * 2) * 4;
      const i1 = row0 + (x * 2 + 1) * 4;
      const i2 = row1 + (x * 2) * 4;
      const i3 = row1 + (x * 2 + 1) * 4;

      const a0 = srcData[i0 + 3] / 255;
      const a1 = srcData[i1 + 3] / 255;
      const a2 = srcData[i2 + 3] / 255;
      const a3 = srcData[i3 + 3] / 255;
      const aSum = a0 + a1 + a2 + a3;

      const di = dstRow + x * 4;
      if (aSum > 0) {
        const inv = 1 / aSum;
        const r = (SRGB_TO_LINEAR[srcData[i0]] * a0 + SRGB_TO_LINEAR[srcData[i1]] * a1 + SRGB_TO_LINEAR[srcData[i2]] * a2 + SRGB_TO_LINEAR[srcData[i3]] * a3) * inv;
        const g = (SRGB_TO_LINEAR[srcData[i0 + 1]] * a0 + SRGB_TO_LINEAR[srcData[i1 + 1]] * a1 + SRGB_TO_LINEAR[srcData[i2 + 1]] * a2 + SRGB_TO_LINEAR[srcData[i3 + 1]] * a3) * inv;
        const b = (SRGB_TO_LINEAR[srcData[i0 + 2]] * a0 + SRGB_TO_LINEAR[srcData[i1 + 2]] * a1 + SRGB_TO_LINEAR[srcData[i2 + 2]] * a2 + SRGB_TO_LINEAR[srcData[i3 + 2]] * a3) * inv;
        dstData[di] = linearToSrgb(r);
        dstData[di + 1] = linearToSrgb(g);
        dstData[di + 2] = linearToSrgb(b);
        dstData[di + 3] = Math.round(aSum * 0.25 * 255);
      } else {
        dstData[di] = 0;
        dstData[di + 1] = 0;
        dstData[di + 2] = 0;
        dstData[di + 3] = 0;
      }
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return true;
}

export async function exportRaster(doc, options: Record<string, any> = {}, format = 'png', scale = 2, quality = 0.98) {
  options = { ...options, isRaster: true };
  const {objects, bounds: [x, y, width, height]} = resolveExportArea(doc, options);
  const maxSide = Math.min(8192, ACTIVE_DEVICE_PROFILE.maxExportDimension || 8192);
  const maxPixels = Math.min(67108864, ACTIVE_DEVICE_PROFILE.maxExportPixels || 67108864);
  const factor = Math.min(Number(scale) > 0 ? Number(scale) : 2, maxSide / width, maxSide / height,
    Math.sqrt(maxPixels / (width * height)));
  const outW = Math.max(1, Math.round(width * factor));
  const outH = Math.max(1, Math.round(height * factor));
  if (outW * outH > maxPixels) throw new Error('Resolusi ekspor melebihi anggaran memori perangkat');

  // Gamma-correct anti-aliasing via 2x super-sampling when within pixel budgets
  const useSSAA = options.ssaa === true && outW * 2 <= 4096 && outH * 2 <= 4096 && (outW * 2 * outH * 2) <= 16777216;
  const ssaaFactor = useSSAA ? 2 : 1;
  const renderW = outW * ssaaFactor;
  const renderH = outH * ssaaFactor;

  const cv = document.createElement('canvas');
  cv.width = renderW;
  cv.height = renderH;

  const jpeg = format === 'jpg' || format === 'jpeg';
  const mime = jpeg ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const defaultFmtQuality = format === 'webp' ? 1.0 : jpeg ? 0.99 : 0.98;
  const exportQuality = typeof options.quality === 'number'
    ? options.quality
    : (typeof quality === 'number' && quality !== 0.92 && quality !== 0.98 ? quality : defaultFmtQuality);
  const kit = await loadCanvasKit();
  const scene = new CanvasKitScene(kit);
  let surface;
  try {
    await scene.ensureFonts?.(objects);
    const images = [...new Set(objects.map(o => o.img?.href).filter(Boolean))].map(href => scene.image(href));
    await Promise.all(images.map(entry => entry.ready));
    const failed = images.find(entry => entry.error);
    if (failed) throw failed.error;
    await document.fonts?.ready;
    surface = kit.MakeSWCanvasSurface(cv);
    if (!surface) throw new Error('CanvasKit gagal membuat surface ekspor');
    const canvas = surface.getCanvas();
    const bg = options.bg?.mode === 'solid' ? options.bg.color || '#ffffff' : jpeg ? '#ffffff' : null;
    canvas.clear(bg ? scene.color(bg) : kit.TRANSPARENT);
    const frames = options.clipFrames !== false ? documentFrames(doc) : {};
    canvas.scale(cv.width / width, cv.height / height);
    const smoothEdges = options.antialias !== false;
    scene.drawScene(canvas, objects, {x, y, width, height, zoom: factor * ssaaFactor, smoothEdges},
      frames);
    surface.flush();

    let targetCanvas = cv;
    if (useSSAA) {
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = outW;
      dstCanvas.height = outH;
      if (downsampleLinear2x(cv, dstCanvas, outW, outH)) {
        targetCanvas = dstCanvas;
      }
    }

    return await new Promise((resolve, reject) => targetCanvas.toBlob(blob => {
      if (blob && blob.type === mime) resolve(blob);
      else reject(new Error('Browser tidak mendukung format ' + format));
    }, mime, exportQuality));
  } finally {
    surface?.dispose();
    scene.dispose();
  }
}
