import { VE } from '../engine/vectorEngine.tsx';
import { loadCanvasKit } from '../renderer/canvasKitRuntime.tsx';
import { CanvasKitScene, documentFrames } from '../renderer/canvasKitScene.tsx';
import { exportRaster } from '../renderer/canvasKitRasterExport.tsx';
import { isLegacyText } from '../engine/legacyText.tsx';
import { AssetManager } from './assetManager.tsx';

const MAX_W = 360;
const MAX_H = 270;
const DISPLAY_SCALE = 2.5;

const computeDims = viewBox => {
  const [x, y, width, height] = Array.isArray(viewBox) && viewBox.length === 4 ? viewBox : [0, 0, 800, 600];
  return {w: MAX_W, h: MAX_H, vx: Number(x) || 0, vy: Number(y) || 0,
    vw: Math.max(1, Number(width) || 800), vh: Math.max(1, Number(height) || 600)};
};

async function generateThumbnailBlob(doc, projectId = null) {
  const empty = () => new Blob([], {type: 'image/webp'});
  if (typeof document === 'undefined') return empty();
  const objects = (doc?.objects || []).filter(o => o && !o.hidden);
  const {w, h, vx, vy, vw, vh} = computeDims(doc?.viewBox);
  const bb = VE.docBounds({objects});
  const [x, y, right, bottom] = bb && bb[2] > bb[0] && bb[3] > bb[1] ? bb : [vx, vy, vx + vw, vy + vh];
  const width = Math.max(1, right - x), height = Math.max(1, bottom - y);
  const scale = Math.min((w - 32) / width, (h - 32) / height);
  if (objects.some(isLegacyText)) {
    try {
      const renderDoc = projectId
        ? await AssetManager.resolveDocForStandaloneExport(projectId, {...doc, objects})
        : {...doc, objects};
      return await exportRaster(renderDoc, {area: 'content', bg: {mode: 'solid', color: '#ffffff'}}, 'webp', scale, 0.9);
    } catch (error) {
      console.warn('[Geovanta thumbnail text]', error);
      return empty();
    }
  }
  const left = (w - width * scale) / 2, top = (h - height * scale) / 2;
  const cv = document.createElement('canvas');
  cv.width = w * DISPLAY_SCALE;
  cv.height = h * DISPLAY_SCALE;
  let surface, scene;
  try {
    const kit = await loadCanvasKit();
    scene = new CanvasKitScene(kit);
    surface = kit.MakeSWCanvasSurface(cv);
    if (!surface) return empty();
    const hrefs = [...new Set(objects.map(o => o.img?.href).filter(Boolean))];
    const deadline = performance.now() + 1500;
    let cursor = 0;
    await Promise.all(Array.from({length: Math.min(4, hrefs.length)}, async () => {
      while (cursor < hrefs.length && performance.now() < deadline) {
        await scene.image(hrefs[cursor++], Math.max(1, Math.min(800, deadline - performance.now()))).ready;
      }
    }));
    const canvas = surface.getCanvas();
    canvas.clear(scene.color('#f8fafc'));
    canvas.scale(DISPLAY_SCALE, DISPLAY_SCALE);
    scene.withPaint('#0f172a', null, 0.045, 0, 0, paint => {
      for (let i = 16; i < w; i += 16) canvas.drawRect([i, 0, i + 1, h], paint);
      for (let i = 16; i < h; i += 16) canvas.drawRect([0, i, w, i + 1], paint);
    });
    const margin = objects.length ? 6 : 0;
    const card = [left - margin, top - margin, w - left + margin, h - top + margin];
    scene.withPaint('#0f172a', null, 0.08, 0, 0, paint => {
      canvas.drawRect([card[0] - 1, card[1] - 1, card[2] + 1, card[3] + 3], paint);
    });
    scene.withPaint('#ffffff', null, 1, 0, 0, paint => canvas.drawRect(card, paint));
    canvas.translate(left, top);
    canvas.scale(scale, scale);
    scene.drawScene(canvas, objects, {x, y, width, height, zoom: scale, smoothEdges: true},
      documentFrames({objects}));
    surface.flush();
    return await new Promise(resolve => cv.toBlob(blob => {
      if (blob) resolve(blob);
      else cv.toBlob(png => resolve(png || empty()), 'image/png');
    }, 'image/webp', 0.96));
  } catch (error) {
    console.warn('[Geovanta thumbnail]', error);
    return empty();
  } finally {
    surface?.dispose();
    scene?.dispose();
  }
}

const ThumbnailGenerator = {MAX_W, MAX_H, computeDims, generateThumbnailBlob};
export { ThumbnailGenerator };
export default ThumbnailGenerator;
