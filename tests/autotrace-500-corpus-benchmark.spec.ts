import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707';
const BAYMAX_IMG = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795314557511_9a814507.jpg';
const ANIME_IMG = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795308645597_ec763ddd.jpg';

test('Benchmark & Node Audit: 500 Multi-Category Images + Real Baymax & Anime Holdouts', async ({ page }) => {
  test.setTimeout(300000);

  await page.setContent('<html><body style="margin:0;background:#111"></body></html>');
  await page.addScriptTag({ path: path.resolve(__dirname, '../scratch/corpus-browser.js') });

  const categorySummaries: any[] = [];
  const sampleBannerDataUrls: string[] = [];

  for (let catIdx = 0; catIdx < 10; catIdx++) {
    const catResult = await page.evaluate(async (cIdx) => {
      const G = (window as any).GCORPUS;
      const cat = G.CORPUS_CATEGORIES[cIdx];
      let oldSimSum = 0;
      let newSimSum = 0;
      let oldPsnrSum = 0;
      let newPsnrSum = 0;
      let oldNodesSum = 0;
      let newNodesSum = 0;
      let oldStairSum = 0;
      let newStairSum = 0;
      let newBezierSum = 0;
      let newMsSum = 0;
      let oldMsSum = 0;
      let maxWhiteHole = 0;
      let nanCount = 0;
      let emptyCount = 0;
      let minNewSim = 100;
      let maxNewNodes = 0;

      let sampleZoomPng: string | null = null;

      for (let v = 0; v < 50; v++) {
        const sample = G.generateCorpusImage(cIdx, v);

        const oldRes = await G.traceRgbaBufferToSvgAsync(sample.rgba, sample.w, sample.h, {
          mode: 'ultra',
          colorCount: 250,
          despeckle: 1,
          smoothness: 0.2,
          ignoreWhite: false,
          useGpu: true,
          rawPixelMode: true,
        });
        const newRes = await G.traceRgbaBufferToSvgAsync(sample.rgba, sample.w, sample.h, {
          mode: 'ultra',
          colorCount: 250,
          ignoreWhite: false,
          useGpu: true,
          rawPixelMode: false,
        });

        const oldGeo = G.inspectSvgGeometry(oldRes.svg);
        const newGeo = G.inspectSvgGeometry(newRes.svg);
        if (newGeo.hasNaN) nanCount++;
        if (newGeo.paths === 0) emptyCount++;

        const oldRaster = await G.rasterizeSvgInBrowser(oldRes.svg, sample.w, sample.h, sample.opaqueBg);
        const newRaster = await G.rasterizeSvgInBrowser(newRes.svg, sample.w, sample.h, sample.opaqueBg);
        const oldMet = G.computeImageMetrics(sample.rgba, oldRaster, sample.w, sample.h, sample.opaqueBg);
        const newMet = G.computeImageMetrics(sample.rgba, newRaster, sample.w, sample.h, sample.opaqueBg);

        oldSimSum += oldMet.simPct;
        newSimSum += newMet.simPct;
        oldPsnrSum += oldMet.psnr;
        newPsnrSum += newMet.psnr;
        oldNodesSum += oldGeo.totalNodes;
        newNodesSum += newGeo.totalNodes;
        oldStairSum += oldGeo.staircaseSteps;
        newStairSum += newGeo.staircaseSteps;
        newBezierSum += newGeo.bezierRatio;
        oldMsSum += oldRes.stats?.ms || 0;
        newMsSum += newRes.stats?.ms || 0;
        if (newMet.whiteHolePct > maxWhiteHole) maxWhiteHole = newMet.whiteHolePct;
        if (newMet.simPct < minNewSim) minNewSim = newMet.simPct;
        if (newGeo.totalNodes > maxNewNodes) maxNewNodes = newGeo.totalNodes;

        // Render zoomed node overlay sample on variant 0 of representative categories
        if (v === 0 && (cIdx === 0 || cIdx === 1 || cIdx === 2 || cIdx === 3 || cIdx === 5 || cIdx === 7)) {
          const cropW = Math.floor(sample.w * 0.45);
          const cropH = Math.floor(sample.h * 0.45);
          const cropX = Math.floor((sample.w - cropW) * 0.5);
          const cropY = Math.floor((sample.h - cropH) * 0.5);
          sampleZoomPng = await G.renderZoomComparisonBanner({
            title: `Category ${cat.id} (${cat.label}) - Variant #1 (${sample.w}x${sample.h})`,
            origRgba: sample.rgba,
            w: sample.w,
            h: sample.h,
            cropX,
            cropY,
            cropW,
            cropH,
            oldSvg: oldRes.svg,
            oldStatsLabel: `Sim ${oldMet.simPct}% | ${oldGeo.totalNodes} nodes | Stairs:${oldGeo.staircaseSteps}`,
            newSvg: newRes.svg,
            newStatsLabel: `Sim ${newMet.simPct}% | ${newGeo.totalNodes} nodes (${Math.round((1 - newGeo.totalNodes / Math.max(1, oldGeo.totalNodes)) * 100)}% less) | C:${Math.round(newGeo.bezierRatio * 100)}%`,
            drawHandles: true,
          });
        }
      }

      const oldAvgNodes = +(oldNodesSum / 50).toFixed(1);
      const newAvgNodes = +(newNodesSum / 50).toFixed(1);
      const nodeReductionPct = +((1 - newAvgNodes / Math.max(1, oldAvgNodes)) * 100).toFixed(1);

      return {
        summary: {
          id: cat.id,
          label: cat.label,
          count: 50,
          oldSimPct: +(oldSimSum / 50).toFixed(2),
          newSimPct: +(newSimSum / 50).toFixed(2),
          minNewSim: +minNewSim.toFixed(2),
          oldPsnr: +(oldPsnrSum / 50).toFixed(2),
          newPsnr: +(newPsnrSum / 50).toFixed(2),
          oldAvgNodes,
          newAvgNodes,
          maxNewNodes,
          nodeReductionPct,
          oldAvgStair: +(oldStairSum / 50).toFixed(1),
          newAvgStair: +(newStairSum / 50).toFixed(1),
          bezierRatioPct: +((newBezierSum / 50) * 100).toFixed(1),
          oldAvgMs: +(oldMsSum / 50).toFixed(1),
          newAvgMs: +(newMsSum / 50).toFixed(1),
          maxWhiteHole: +maxWhiteHole.toFixed(2),
          nanCount,
          emptyCount,
        },
        sampleZoomPng,
      };
    }, catIdx);

    categorySummaries.push(catResult.summary);
    if (catResult.sampleZoomPng) {
      sampleBannerDataUrls.push(catResult.sampleZoomPng);
    }
    console.log(
      `[${catResult.summary.id}] OldSim=${catResult.summary.oldSimPct}% -> NewSim=${catResult.summary.newSimPct}% (min=${catResult.summary.minNewSim}%) | OldNodes=${catResult.summary.oldAvgNodes} -> NewNodes=${catResult.summary.newAvgNodes} (-${catResult.summary.nodeReductionPct}%) | Bezier=${catResult.summary.bezierRatioPct}% | Stairs: ${catResult.summary.oldAvgStair}->${catResult.summary.newAvgStair} | NewMs=${catResult.summary.newAvgMs}ms`
    );
  }

  // Combine representative category banners vertically into zoom-audit-categories-grid.png
  const gridB64 = await page.evaluate(async (urls) => {
    const imgs = await Promise.all(
      urls.map(
        (u) =>
          new Promise<HTMLImageElement>((resolve) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.src = u;
          })
      )
    );
    const w = imgs[0].width;
    const h = imgs.reduce((s, im) => s + im.height, 0);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    let y = 0;
    for (const im of imgs) {
      ctx.drawImage(im, 0, y);
      y += im.height;
    }
    return cv.toDataURL('image/png');
  }, sampleBannerDataUrls);
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'zoom-audit-categories-grid.png'),
    Buffer.from(gridB64.replace(/^data:image\/png;base64,/, ''), 'base64')
  );

  // Now evaluate REAL HOLDOUTS: Baymax & Anime
  const evalHoldout = async (imgPath: string, name: string, outPng: string, cropSpec: { rx: number; ry: number; rw: number; rh: number }) => {
    const dataUri = 'data:image/jpeg;base64,' + fs.readFileSync(imgPath).toString('base64');
    const res = await page.evaluate(async ({ dataUri, name, cropSpec }) => {
      const G = (window as any).GCORPUS;
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUri; });
      const w = img.naturalWidth, h = img.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const origData = ctx.getImageData(0, 0, w, h).data;
      const rgba = new Uint8Array(origData.buffer, origData.byteOffset, origData.byteLength);

      const oldRes = await G.traceRgbaBufferToSvgAsync(rgba, w, h, {
        mode: 'ultra', colorCount: 250, despeckle: 1, smoothness: 0.2, ignoreWhite: false, useGpu: true, rawPixelMode: true,
      });
      const newRes = await G.traceRgbaBufferToSvgAsync(rgba, w, h, {
        mode: 'ultra', colorCount: 250, ignoreWhite: false, useGpu: true, rawPixelMode: false,
      });

      const oldGeo = G.inspectSvgGeometry(oldRes.svg);
      const newGeo = G.inspectSvgGeometry(newRes.svg);

      const oldRaster = await G.rasterizeSvgInBrowser(oldRes.svg, w, h, true);
      const newRaster = await G.rasterizeSvgInBrowser(newRes.svg, w, h, true);
      const oldMet = G.computeImageMetrics(origData, oldRaster, w, h, true);
      const newMet = G.computeImageMetrics(origData, newRaster, w, h, true);

      const cropX = Math.round(w * cropSpec.rx);
      const cropY = Math.round(h * cropSpec.ry);
      const cropW = Math.round(w * cropSpec.rw);
      const cropH = Math.round(h * cropSpec.rh);

      const bannerUrl = await G.renderZoomComparisonBanner({
        title: `${name} (${w}x${h}) - 500% Zoom Node & Curve Audit`,
        origRgba: rgba,
        w,
        h,
        cropX,
        cropY,
        cropW,
        cropH,
        oldSvg: oldRes.svg,
        oldStatsLabel: `Sim ${oldMet.simPct}% | ${oldGeo.totalNodes} nodes | Stairs:${oldGeo.staircaseSteps} | ${oldRes.stats.ms}ms`,
        newSvg: newRes.svg,
        newStatsLabel: `Sim ${newMet.simPct}% | ${newGeo.totalNodes} nodes (-${Math.round((1 - newGeo.totalNodes / oldGeo.totalNodes) * 100)}%) | C:${Math.round(newGeo.bezierRatio * 100)}% | ${newRes.stats.ms}ms`,
        drawHandles: true,
      });

      return {
        name, w, h,
        oldMet, oldGeo, oldMs: oldRes.stats.ms,
        newMet, newGeo, newMs: newRes.stats.ms,
        bannerUrl,
      };
    }, { dataUri, name, cropSpec });

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, outPng),
      Buffer.from(res.bannerUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
    );
    return {
      name: res.name,
      dims: `${res.w}x${res.h}`,
      oldSimPct: res.oldMet.simPct,
      newSimPct: res.newMet.simPct,
      oldPsnr: res.oldMet.psnr,
      newPsnr: res.newMet.psnr,
      oldNodes: res.oldGeo.totalNodes,
      newNodes: res.newGeo.totalNodes,
      nodeReductionPct: +((1 - res.newGeo.totalNodes / Math.max(1, res.oldGeo.totalNodes)) * 100).toFixed(1),
      bezierRatioPct: +(res.newGeo.bezierRatio * 100).toFixed(1),
      oldStaircase: res.oldGeo.staircaseSteps,
      newStaircase: res.newGeo.staircaseSteps,
      oldMs: res.oldMs,
      newMs: res.newMs,
    };
  };

  const baymaxAudit = await evalHoldout(BAYMAX_IMG, 'Baymax Wallpaper Holdout', 'zoom-audit-baymax.png', { rx: 0.44, ry: 0.27, rw: 0.36, rh: 0.20 });
  const animeAudit = await evalHoldout(ANIME_IMG, 'Anime Illustration Holdout', 'zoom-audit-anime.png', { rx: 0.22, ry: 0.14, rw: 0.36, rh: 0.22 });

  console.log('[HOLDOUT BAYMAX]', JSON.stringify(baymaxAudit));
  console.log('[HOLDOUT ANIME]', JSON.stringify(animeAudit));

  // Global 500-image stats
  const totalImages = categorySummaries.reduce((s, c) => s + c.count, 0);
  const globalOldSim = +(categorySummaries.reduce((s, c) => s + c.oldSimPct, 0) / 10).toFixed(2);
  const globalNewSim = +(categorySummaries.reduce((s, c) => s + c.newSimPct, 0) / 10).toFixed(2);
  const globalOldAvgNodes = +(categorySummaries.reduce((s, c) => s + c.oldAvgNodes, 0) / 10).toFixed(1);
  const globalNewAvgNodes = +(categorySummaries.reduce((s, c) => s + c.newAvgNodes, 0) / 10).toFixed(1);
  const globalNodeReduction = +((1 - globalNewAvgNodes / globalOldAvgNodes) * 100).toFixed(1);

  const report = {
    totalImages,
    globalOldSim,
    globalNewSim,
    globalOldAvgNodes,
    globalNewAvgNodes,
    globalNodeReduction,
    categories: categorySummaries,
    holdouts: { baymaxAudit, animeAudit },
  };
  fs.writeFileSync(path.resolve(__dirname, '../scratch/corpus-500-report.json'), JSON.stringify(report, null, 2));

  console.log(`[GLOBAL 500 IMAGES] OldSim=${globalOldSim}% -> NewSim=${globalNewSim}% | OldAvgNodes=${globalOldAvgNodes} -> NewAvgNodes=${globalNewAvgNodes} (-${globalNodeReduction}%)`);

  expect(totalImages).toBe(500);
  expect(categorySummaries.every((c) => c.nanCount === 0 && c.emptyCount === 0)).toBe(true);
  expect(globalNewSim).toBeGreaterThanOrEqual(98.5);
  expect(globalNodeReduction).toBeGreaterThanOrEqual(65.0);
  expect(baymaxAudit.newSimPct).toBeGreaterThanOrEqual(99.0);
  expect(animeAudit.newSimPct).toBeGreaterThanOrEqual(99.0);
});
