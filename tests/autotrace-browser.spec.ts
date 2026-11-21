import { test, expect } from '@playwright/test';
import * as path from 'path';
test('Auto Trace runs in a real browser (canvas drawImage path)', async ({ page }) => {
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ path: path.resolve(__dirname, '../scratch/trace-browser.js') });
  const res = await page.evaluate(async () => {
    const w = 64, h = 64, rgba = new Uint8ClampedArray(w*h*4);
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){ const i=(y*w+x)*4; const c=Math.hypot(x-32,y-32)<18; rgba[i]=c?220:255; rgba[i+1]=c?38:255; rgba[i+2]=c?38:255; rgba[i+3]=255; }
    const r = await (window as any).GT.traceRgbaBufferToSvgAsync(rgba, w, h, { mode: 'color', ignoreWhite: true });
    return r.svg;
  });
  expect(res).toContain('<path');
});
