import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const IMG_PATH = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795308645597_ec763ddd.jpg';

test('Auto Trace Ultra 99%+ achieves >99% pixel similarity on anime illustration with WebGL2 GPU and CPU fallback', async ({ page }) => {
  test.setTimeout(120000);
  const imgBuf = fs.readFileSync(IMG_PATH);
  const dataUri = 'data:image/jpeg;base64,' + imgBuf.toString('base64');

  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ path: path.resolve(__dirname, '../scratch/trace-browser.js') });

  const runWith = async (useGpu: boolean) => {
    return page.evaluate(async ({ dataUri, useGpu }) => {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUri; });
      const w = img.naturalWidth, h = img.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const origData = ctx.getImageData(0, 0, w, h).data;
      const rgba = new Uint8Array(origData.buffer, origData.byteOffset, origData.byteLength);

      const res = await (window as any).GT.traceRgbaBufferToSvgAsync(rgba, w, h, {
        mode: 'ultra',
        colorCount: 250,
        despeckle: 1,
        smoothness: 0.2,
        ignoreWhite: false,
        useGpu,
      });

      const svgBlob = new Blob([res.svg], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const svgImg = new Image();
      await new Promise((resolve, reject) => { svgImg.onload = resolve; svgImg.onerror = reject; svgImg.src = svgUrl; });
      const rCv = document.createElement('canvas'); rCv.width = w; rCv.height = h;
      const rCtx = rCv.getContext('2d')!;
      rCtx.fillStyle = '#ffffff'; rCtx.fillRect(0, 0, w, h); rCtx.drawImage(svgImg, 0, 0, w, h);
      URL.revokeObjectURL(svgUrl);
      const svgData = rCtx.getImageData(0, 0, w, h).data;

      let sumAbs = 0, sumSq = 0, w5 = 0, w15 = 0;
      const n = w * h;
      for (let i = 0; i < n * 4; i += 4) {
        const dr = Math.abs(origData[i] - svgData[i]);
        const dg = Math.abs(origData[i + 1] - svgData[i + 1]);
        const db = Math.abs(origData[i + 2] - svgData[i + 2]);
        const d = (dr + dg + db) / 3;
        sumAbs += d;
        sumSq += (dr * dr + dg * dg + db * db) / 3;
        if (d <= 5) w5++;
        if (d <= 15) w15++;
      }
      const mae = sumAbs / n;
      const rmse = Math.sqrt(sumSq / n);
      return {
        hw: res.stats.hw,
        ms: res.stats.ms,
        regions: res.stats.regions,
        mae: +mae.toFixed(2),
        rmse: +rmse.toFixed(2),
        simPct: +(100 * (1 - mae / 255)).toFixed(2),
        psnr: +(rmse > 0 ? 20 * Math.log10(255 / rmse) : 99).toFixed(2),
        within5Pct: +((w5 / n) * 100).toFixed(2),
        within15Pct: +((w15 / n) * 100).toFixed(2),
      };
    }, { dataUri, useGpu });
  };

  const gpuRes = await runWith(true);
  console.log('[ULTRA GPU]', JSON.stringify(gpuRes));
  expect(gpuRes.hw.gpuUsed).toBe(true);
  expect(gpuRes.simPct).toBeGreaterThanOrEqual(99.0);

  const cpuRes = await runWith(false);
  console.log('[ULTRA CPU FALLBACK]', JSON.stringify(cpuRes));
  expect(cpuRes.hw.gpuUsed).toBe(false);
  expect(cpuRes.simPct).toBeGreaterThanOrEqual(99.0);
});
