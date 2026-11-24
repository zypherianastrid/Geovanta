import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const IMG_PATH = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795308645597_ec763ddd.jpg';

test('Auto Trace Smooth Vector (SVGPeak VMT ultra) produces smooth Bezier curves with high fidelity, WebGL2 GPU & CPU fallback', async ({ page }) => {
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
        colorCount: 32,
        despeckle: 4,
        smoothness: 0.66,
        gradientMode: 'auto',
        ignoreWhite: false,
        useGpu,
      });

      const doc = new DOMParser().parseFromString(res.svg, 'image/svg+xml');
      let curveCmds = 0;
      let lineCmds = 0;
      doc.querySelectorAll('path').forEach((p) => {
        const d = p.getAttribute('d') || '';
        const cs = d.match(/[CcSsQqTt]/g);
        const ls = d.match(/[LlHhVv]/g);
        curveCmds += cs ? cs.length : 0;
        lineCmds += ls ? ls.length : 0;
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
        bezierSegs: res.stats.bezierSegs,
        curveCmds,
        lineCmds,
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
  console.log('[SVGPEAK VMT ULTRA GPU]', JSON.stringify(gpuRes));
  expect(gpuRes.hw.gpuUsed).toBe(true);
  expect(gpuRes.curveCmds).toBeGreaterThan(200);
  expect(gpuRes.bezierSegs).toBeLessThan(40000);
  expect(gpuRes.simPct).toBeGreaterThanOrEqual(94.0);

  const cpuRes = await runWith(false);
  console.log('[SVGPEAK VMT ULTRA CPU FALLBACK]', JSON.stringify(cpuRes));
  expect(cpuRes.hw.gpuUsed).toBe(false);
  expect(cpuRes.curveCmds).toBeGreaterThan(200);
  expect(cpuRes.simPct).toBeGreaterThanOrEqual(94.0);
});
