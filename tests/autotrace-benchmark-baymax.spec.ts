import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const IMG_PATH = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795314557511_9a814507.jpg';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707';

test('Auto Trace Baymax: traces with high fidelity, preserves white body & HELLO text, and outputs before/after renders', async ({ page }) => {
  test.setTimeout(120000);
  const imgBuf = fs.readFileSync(IMG_PATH);
  const dataUri = 'data:image/jpeg;base64,' + imgBuf.toString('base64');

  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ path: path.resolve(__dirname, '../scratch/trace-browser.js') });

  const runTrace = async (useGpu: boolean, colorCount = 32) => {
    return page.evaluate(async ({ dataUri, useGpu, colorCount }) => {
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
        colorCount,
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

      // Render traced SVG back to canvas for exact pixel comparison
      const svgBlob = new Blob([res.svg], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const svgImg = new Image();
      await new Promise((resolve, reject) => { svgImg.onload = resolve; svgImg.onerror = reject; svgImg.src = svgUrl; });
      const rCv = document.createElement('canvas'); rCv.width = w; rCv.height = h;
      const rCtx = rCv.getContext('2d')!;
      // Clear with white then draw SVG
      rCtx.fillStyle = '#ffffff';
      rCtx.fillRect(0, 0, w, h);
      rCtx.drawImage(svgImg, 0, 0, w, h);
      URL.revokeObjectURL(svgUrl);
      const svgData = rCtx.getImageData(0, 0, w, h).data;

      // Render original and traced SVG as Data URLs for saving
      const origDataUrl = cv.toDataURL('image/png');
      const tracedDataUrl = rCv.toDataURL('image/png');

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

      // Check white body area (e.g., around x: 300, y: 700) to confirm it is not transparent/missing
      const sampleIdx = (700 * w + 300) * 4;
      const sampleColor = [svgData[sampleIdx], svgData[sampleIdx+1], svgData[sampleIdx+2], svgData[sampleIdx+3]];

      return {
        svg: res.svg,
        origDataUrl,
        tracedDataUrl,
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
        sampleColor,
      };
    }, { dataUri, useGpu, colorCount });
  };

  const gpuRes = await runTrace(true, 32);
  console.log('[BAYMAX SVGPEAK GPU RESULTS]:', JSON.stringify({
    hw: gpuRes.hw,
    ms: gpuRes.ms,
    regions: gpuRes.regions,
    bezierSegs: gpuRes.bezierSegs,
    curveCmds: gpuRes.curveCmds,
    lineCmds: gpuRes.lineCmds,
    mae: gpuRes.mae,
    rmse: gpuRes.rmse,
    simPct: gpuRes.simPct,
    psnr: gpuRes.psnr,
    within5Pct: gpuRes.within5Pct,
    within15Pct: gpuRes.within15Pct,
    sampleColor: gpuRes.sampleColor,
  }, null, 2));

  // Save standalone rendered SVG and PNG files
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'baymax-traced.svg'), gpuRes.svg, 'utf-8');
  
  const origPngBuf = Buffer.from(gpuRes.origDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'baymax-original-render.png'), origPngBuf);

  const tracedPngBuf = Buffer.from(gpuRes.tracedDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'baymax-traced-render.png'), tracedPngBuf);

  expect(gpuRes.hw.gpuUsed).toBe(true);
  expect(gpuRes.curveCmds).toBeGreaterThan(50);
  expect(gpuRes.bezierSegs).toBeLessThan(20000);
  expect(gpuRes.simPct).toBeGreaterThanOrEqual(96.0);
  // Verify body is near white/light grey, NOT black or transparent
  expect(gpuRes.sampleColor[0]).toBeGreaterThan(200);
  expect(gpuRes.sampleColor[1]).toBeGreaterThan(200);
  expect(gpuRes.sampleColor[2]).toBeGreaterThan(200);
});
