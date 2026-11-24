import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ANIME_IMG = 'C:/Users/Admin/.gemini/antigravity/brain/b76c5be3-b0b1-40b0-8aec-dbac92a17707/.user_uploaded/media_1795308645597_ec763ddd.jpg';

async function openEditor(page: Page) {
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForLoadState('networkidle');
  const openBtn = page.getByRole('button', { name: 'Buka Editor' }).first();
  if (await openBtn.isVisible()) {
    await openBtn.click();
  } else {
    const createBtn = page.getByRole('button', { name: 'Create New', exact: true });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const submitBtn = page.getByRole('button', { name: 'Buat & Buka Proyek' });
      await submitBtn.waitFor({ state: 'visible' });
      await submitBtn.click();
    }
  }
  await page.waitForFunction(() => typeof (window as any).__geovantaEditorApi !== 'undefined');
}

// Injects reusable shape builders & exact area evaluator inside page.evaluate
const INJECT_HELPERS_JS = `
window.__fillTestHelpers = (() => {
  const mkNode = (x, y, hi = null, ho = null, type = 'corner') => ({
    id: 'n_' + Math.random().toString(36).slice(2, 9),
    x, y, type, handleIn: hi, handleOut: ho
  });
  const mkRect = (id, x, y, w, h, fill = '#3b82f6', extra = {}) => ({
    id, name: id, type: 'path', fill,
    stroke: extra.stroke ?? 'none',
    strokeWidth: extra.strokeWidth ?? 0,
    strokeAlign: extra.strokeAlign ?? 'center',
    opacity: extra.opacity ?? 1,
    fillRule: extra.fillRule ?? 'nonzero',
    group: extra.group ?? null,
    hidden: extra.hidden ?? false,
    locked: extra.locked ?? false,
    isFrameBg: extra.isFrameBg ?? false,
    grad: extra.grad ?? null,
    strokeGrad: extra.strokeGrad ?? null,
    blendMode: extra.blendMode,
    subs: [{
      id: id + '_s0', closed: true,
      nodes: [mkNode(x, y), mkNode(x + w, y), mkNode(x + w, y + h), mkNode(x, y + h)]
    }]
  });
  const mkRing = (id, x, y, w, h, inset, fill = '#ef4444', sameWinding = false, extra = {}) => ({
    id, name: id, type: 'path', fill,
    stroke: extra.stroke ?? 'none',
    strokeWidth: extra.strokeWidth ?? 0,
    opacity: extra.opacity ?? 1,
    fillRule: extra.fillRule ?? 'nonzero',
    group: extra.group ?? null,
    subs: [
      { id: id + '_out', closed: true, nodes: [mkNode(x, y), mkNode(x + w, y), mkNode(x + w, y + h), mkNode(x, y + h)] },
      {
        id: id + '_in', closed: true,
        nodes: sameWinding
          ? [mkNode(x + inset, y + inset), mkNode(x + w - inset, y + inset), mkNode(x + w - inset, y + h - inset), mkNode(x + inset, y + h - inset)]
          : [mkNode(x + inset, y + inset), mkNode(x + inset, y + h - inset), mkNode(x + w - inset, y + h - inset), mkNode(x + w - inset, y + inset)]
      }
    ]
  });
  const mkPoly = (id, pts, fill = '#22c55e', extra = {}) => ({
    id, name: id, type: 'path', fill,
    stroke: extra.stroke ?? 'none',
    strokeWidth: extra.strokeWidth ?? 0,
    opacity: extra.opacity ?? 1,
    fillRule: extra.fillRule ?? 'nonzero',
    group: extra.group ?? null,
    subs: [{ id: id + '_s0', closed: true, nodes: pts.map(p => mkNode(p[0], p[1])) }]
  });
  const mkCircle = (id, cx, cy, r, fill = '#ec4899', extra = {}) => {
    const k = r * 0.55228475;
    return {
      id, name: id, type: 'path', fill,
      stroke: extra.stroke ?? 'none', strokeWidth: extra.strokeWidth ?? 0,
      opacity: extra.opacity ?? 1, fillRule: extra.fillRule ?? 'nonzero',
      subs: [{
        id: id + '_c', closed: true,
        nodes: [
          mkNode(cx, cy - r, { x: cx - k, y: cy - r }, { x: cx + k, y: cy - r }, 'smooth'),
          mkNode(cx + r, cy, { x: cx + r, y: cy - k }, { x: cx + r, y: cy + k }, 'smooth'),
          mkNode(cx, cy + r, { x: cx + k, y: cy + r }, { x: cx - k, y: cy + r }, 'smooth'),
          mkNode(cx - r, cy, { x: cx - r, y: cy + k }, { x: cx - r, y: cy - k }, 'smooth')
        ]
      }]
    };
  };
  const mkLine = (id, pts, stroke = '#111827', strokeWidth = 3, closed = false) => ({
    id, name: id, type: 'path', fill: 'none', stroke, strokeWidth,
    opacity: 1, subs: [{ id: id + '_l', closed, nodes: pts.map(p => mkNode(p[0], p[1])) }]
  });
  // Numerical net area via high-res scanline/point-in-subpath (handles curves & evenodd/nonzero!)
  const flattenSub = (sp) => {
    const ns = sp.nodes || [];
    if (!ns.length) return [];
    const pts = [];
    for (let i = 0; i < ns.length; i++) {
      const a = ns[i], b = ns[(i + 1) % ns.length];
      if (!sp.closed && i === ns.length - 1) { pts.push([a.x, a.y]); break; }
      const steps = (a.handleOut || b.handleIn) ? 16 : 1;
      const p0x = a.x, p0y = a.y;
      const c1x = a.handleOut ? a.handleOut.x : a.x, c1y = a.handleOut ? a.handleOut.y : a.y;
      const c2x = b.handleIn ? b.handleIn.x : b.x, c2y = b.handleIn ? b.handleIn.y : b.y;
      const p3x = b.x, p3y = b.y;
      for (let s = 0; s < steps; s++) {
        const t = s / steps, u = 1 - t;
        const x = u*u*u*p0x + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*p3x;
        const y = u*u*u*p0y + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*p3y;
        pts.push([x, y]);
      }
    }
    return pts;
  };
  const objArea = (o) => {
    if (!o || !o.subs || !o.subs.length) return 0;
    const rings = o.subs.filter(s => s.closed).map(flattenSub).filter(r => r.length >= 3);
    if (!rings.length) return 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of rings) for (const [x, y] of r) {
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    // Signed shoelace for nonzero, or even-odd sampling for complex shapes
    if (o.fillRule === 'evenodd' || rings.length > 1) {
      const N = 80;
      const dx = (x1 - x0) / N, dy = (y1 - y0) / N;
      if (dx <= 0 || dy <= 0) return 0;
      let inside = 0;
      for (let iy = 0; iy < N; iy++) {
        const py = y0 + (iy + 0.5) * dy;
        for (let ix = 0; ix < N; ix++) {
          const px = x0 + (ix + 0.5) * dx;
          let wn = 0, eo = 0;
          for (const r of rings) {
            for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
              const ax = r[j][0], ay = r[j][1], bx = r[i][0], by = r[i][1];
              if ((ay > py) !== (by > py) && px < (bx - ax) * (py - ay) / (by - ay) + ax) eo ^= 1;
              if (ay <= py) { if (by > py && (bx - ax)*(py - ay) - (by - ay)*(px - ax) > 0) wn++; }
              else if (by <= py && (bx - ax)*(py - ay) - (by - ay)*(px - ax) < 0) wn--;
            }
          }
          const hit = o.fillRule === 'evenodd' ? eo === 1 : wn !== 0;
          if (hit) inside++;
        }
      }
      return inside * dx * dy;
    }
    const r = rings[0];
    let a = 0;
    for (let i = 0; i < r.length; i++) {
      const p = r[i], q = r[(i + 1) % r.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) * 0.5;
  };
  const containsPoint = (o, px, py) => {
    const rings = (o?.subs || []).filter(s => s.closed).map(flattenSub).filter(r => r.length >= 3);
    let wn = 0, eo = 0;
    for (const r of rings) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const ax = r[j][0], ay = r[j][1], bx = r[i][0], by = r[i][1];
        if ((ay > py) !== (by > py) && px < (bx - ax) * (py - ay) / (by - ay) + ax) eo ^= 1;
        if (ay <= py) { if (by > py && (bx - ax)*(py - ay) - (by - ay)*(px - ax) > 0) wn++; }
        else if (by <= py && (bx - ax)*(py - ay) - (by - ay)*(px - ax) < 0) wn--;
      }
    }
    return o?.fillRule === 'evenodd' ? eo === 1 : wn !== 0;
  };
  const runCase = (api, objects, selIds) => {
    api.setDoc({ viewBox: [0, 0, 1000, 1000], objects, styles: [] });
    api.setSelection(selIds);
    const beforeAreas = Object.fromEntries(selIds.map(id => [id, objArea(api.getDoc().objects.find(o => o.id === id))]));
    api.fillEmptySpace();
    const afterDoc = api.getDoc();
    const afterAreas = Object.fromEntries(selIds.map(id => [id, objArea(afterDoc.objects.find(o => o.id === id))]));
    return { afterDoc, beforeAreas, afterAreas };
  };
  return { mkNode, mkRect, mkRing, mkPoly, mkCircle, mkLine, objArea, containsPoint, runCase };
})();
`;

test.describe('Fill Empty Space — 150 Comprehensive Scenarios + Real Traced Anime Repro', () => {
  test('Scenario 0 (User Bug Repro): Real ~260-object auto-traced anime face fills deleted under-eye transparent space cleanly', async ({ page }) => {
    test.setTimeout(120000);
    const imgBuf = fs.readFileSync(ANIME_IMG);
    const dataUri = 'data:image/jpeg;base64,' + imgBuf.toString('base64');

    await page.setContent('<html><body></body></html>');
    await page.addScriptTag({ path: path.resolve(__dirname, '../scratch/trace-browser.js') });
    const tracedSvg = await page.evaluate(async ({ dataUri }) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
      const w = img.naturalWidth, h = img.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      const rgba = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
      const res = await (window as any).GT.traceRgbaBufferToSvgAsync(rgba, w, h, {
        mode: 'ultra', colorCount: 24, despeckle: 6, smoothness: 0.66, gradientMode: 'off', ignoreWhite: false, useGpu: true,
      });
      return res.svg;
    }, { dataUri });

    await openEditor(page);
    await page.evaluate(INJECT_HELPERS_JS);

    const result = await page.evaluate(async ({ tracedSvg }) => {
      const api = (window as any).__geovantaEditorApi;
      const H = (window as any).__fillTestHelpers;
      await api.loadTestSvg(tracedSvg, 'anime');
      const doc0 = api.getDoc();
      const objs = doc0.objects || [];
      const vb = doc0.viewBox || [0, 0, 800, 800];

      // Pick a prominent interior path enclosed by other paths (just like the under-eye / cheek blush path)
      const measured = objs.map((o: any) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const sp of o.subs || []) for (const n of sp.nodes || []) {
          if (n.x < x0) x0 = n.x; if (n.y < y0) y0 = n.y; if (n.x > x1) x1 = n.x; if (n.y > y1) y1 = n.y;
        }
        return { o, x0, y0, x1, y1, area: H.objArea(o), bbArea: (x1 - x0) * (y1 - y0) };
      });

      const vbArea = vb[2] * vb[3];
      const interiorHoles = measured
        .filter(m => m.x0 > vb[0] + 25 && m.y0 > vb[1] + 25 && m.x1 < vb[0] + vb[2] - 25 && m.y1 < vb[1] + vb[3] - 25 && m.area > 350 && m.area < vbArea * 0.12)
        .sort((a, b) => b.area - a.area);

      const deletedTarget = interiorHoles[0];
      if (!deletedTarget) return { ok: false, reason: 'no interior target', count: objs.length };

      // Clear all objects covering deletedTarget's center (cx, cy) so (cx, cy) is genuine transparent checkerboard empty space!
      const cx = (deletedTarget.x0 + deletedTarget.x1) * 0.5;
      const cy = (deletedTarget.y0 + deletedTarget.y1) * 0.5;
      const remaining = objs.filter((o: any) => o.id !== deletedTarget.o.id && !H.containsPoint(o, cx, cy));
      const remIds = new Set(remaining.map((r: any) => r.id));
      const neighbor = measured.find(m =>
        remIds.has(m.o.id) &&
        m.area > 300 && m.area < vbArea * 0.6 &&
        m.x0 <= deletedTarget.x1 + 3 && m.x1 >= deletedTarget.x0 - 3 &&
        m.y0 <= deletedTarget.y1 + 3 && m.y1 >= deletedTarget.y0 - 3
      );
      if (!neighbor) return { ok: false, reason: 'no neighbor', count: objs.length };

      // Delete blocking layers over pocket -> leaves real enclosed transparent space on the traced anime face!
      api.setDoc({ ...doc0, objects: remaining });
      api.setSelection([neighbor.o.id]);
      const beforeArea = H.objArea(neighbor.o);
      const fillsBefore = H.containsPoint(neighbor.o, cx, cy);

      const t0 = performance.now();
      api.fillEmptySpace();
      const elapsedMs = Math.round(performance.now() - t0);

      const afterObj = api.getDoc().objects.find((o: any) => o.id === neighbor.o.id);
      const afterArea = H.objArea(afterObj);
      const fillsSeed = H.containsPoint(afterObj, cx, cy);

      return {
        ok: true,
        totalObjs: remaining.length,
        deletedArea: Math.round(deletedTarget.area),
        beforeArea: Math.round(beforeArea),
        afterArea: Math.round(afterArea),
        fillsBefore,
        fillsSeed,
        elapsedMs,
      };
    }, { tracedSvg });

    console.log('Anime Repro Result:', result);
    expect(result.ok).toBe(true);
    expect(result.fillsBefore).toBe(false);
    expect(result.fillsSeed).toBe(true);
    expect(result.afterArea).toBeGreaterThan(result.beforeArea + 200);
    expect(result.elapsedMs).toBeLessThan(2500);
  });

  test('Scenarios 1-30: Hollow parents, children, asymmetric frames, stars, rotated boxes, & multi-pocket hubs', async ({ page }) => {
    await openEditor(page);
    await page.evaluate(INJECT_HELPERS_JS);

    const failures = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const H = (window as any).__fillTestHelpers;
      const fails: string[] = [];
      const assert = (id: number, label: string, cond: boolean, detail = '') => {
        if (!cond) fails.push(`#${id} (${label}): ${detail}`);
      };

      // 1-10: Parameterized rectangular parent rings with varied sizes & wall thicknesses
      for (let i = 1; i <= 10; i++) {
        const inset = 10 + i * 3;
        const P = H.mkRing('P', 100, 100, 200 + i * 10, 160 + i * 5, inset);
        const C2 = H.mkRect('C2', 100 + inset + 40, 100 + inset, 35, 160 + i * 5 - inset * 2, '#3b82f6');
        const rP = H.runCase(api, [P, C2], ['P']);
        assert(i, `Parent ring fill inset=${inset}`, rP.afterAreas.P > rP.beforeAreas.P + 5000, `${rP.beforeAreas.P}->${rP.afterAreas.P}`);
      }

      // 11-20: Same family, selecting middle Child C2 fills both left & right pockets + preserves C2 style
      for (let i = 1; i <= 10; i++) {
        const inset = 12 + i * 2;
        const P = H.mkRing('P', 80, 80, 260, 140, inset);
        const midW = 30 + i * 2;
        const C2 = H.mkRect('C2', 80 + inset + 55, 80 + inset, midW, 140 - inset * 2, '#ec4899', { opacity: 0.75, group: 'g' + i });
        const r = H.runCase(api, [P, C2], ['C2']);
        const afterC2 = r.afterDoc.objects.find(o => o.id === 'C2');
        const fullCavity = (260 - inset * 2) * (140 - inset * 2);
        assert(10 + i, `Child C2 fills pockets i=${i}`, Math.abs(r.afterAreas.C2 - fullCavity) < 350 && afterC2.fill === '#ec4899' && afterC2.group === 'g' + i && afterC2.opacity === 0.75, `area=${r.afterAreas.C2} vs ${fullCavity}`);
      }

      // 21-25: Hub child touching N radial pockets (N=2,3,4,5,6 chambers) inside outer circle
      for (let idx = 0; idx < 5; idx++) {
        const N = idx + 2;
        const R = 140, cx = 250, cy = 250;
        const outerPts = [], innerPts = [];
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          outerPts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
          innerPts.push([cx + Math.cos(a) * (R - 25), cy - Math.sin(a) * (R - 25)]);
        }
        const outer = { id: 'O', name: 'O', type: 'path', fill: '#64748b', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero', subs: [{ id: 'o0', closed: true, nodes: outerPts.map(p => H.mkNode(p[0], p[1])) }, { id: 'o1', closed: true, nodes: innerPts.map(p => H.mkNode(p[0], p[1])) }] };
        const hub = H.mkCircle('HUB', cx, cy, 40, '#f59e0b');
        const spokes = [];
        for (let s = 0; s < N - 1; s++) {
          const ang = (s / N) * Math.PI * 2;
          spokes.push(H.mkLine('sp' + s, [[cx + Math.cos(ang) * 39, cy + Math.sin(ang) * 39], [cx + Math.cos(ang) * (R - 23), cy + Math.sin(ang) * (R - 23)]], '#111827', 3));
        }
        const r = H.runCase(api, [outer, hub, ...spokes], ['HUB']);
        assert(21 + idx, `Hub fills ${N}-chamber circle`, r.afterAreas.HUB > r.beforeAreas.HUB + 15000, `${r.beforeAreas.HUB}->${r.afterAreas.HUB}`);
      }

      // 26-30: Rotated diamond & polygon frames with touching child strips
      for (let i = 0; i < 5; i++) {
        const s = 140 + i * 15, cx = 300, cy = 300, t = 25;
        const frame = {
          id: 'F', name: 'F', type: 'path', fill: '#1e293b', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero',
          subs: [
            { id: 'fo', closed: true, nodes: [H.mkNode(cx, cy - s), H.mkNode(cx + s, cy), H.mkNode(cx, cy + s), H.mkNode(cx - s, cy)] },
            { id: 'fi', closed: true, nodes: [H.mkNode(cx, cy - (s - t)), H.mkNode(cx - (s - t), cy), H.mkNode(cx, cy + (s - t)), H.mkNode(cx + (s - t), cy)] }
          ]
        };
        const bar = H.mkRect('B', cx - 15, cy - (s - t), 30, (s - t) * 2, '#06b6d4');
        const r = H.runCase(api, [frame, bar], ['B']);
        assert(26 + i, `Rotated diamond cavity fill #${i}`, r.afterAreas.B > r.beforeAreas.B + 8000, `${r.beforeAreas.B}->${r.afterAreas.B}`);
      }
      return fails;
    });
    expect(failures).toEqual([]);
  });

  test('Scenarios 31-65: Strict barrier isolation, thin dividers, walled islands, & separated targets', async ({ page }) => {
    await openEditor(page);
    await page.evaluate(INJECT_HELPERS_JS);

    const failures = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const H = (window as any).__fillTestHelpers;
      const fails: string[] = [];
      const assert = (id: number, label: string, cond: boolean, detail = '') => {
        if (!cond) fails.push(`#${id} (${label}): ${detail}`);
      };

      // 31-40: Wall widths [1, 2, 3, 5, 10, 15, 20, 30, 40, 60] separating Target from Empty Pocket
      const widths = [1, 2, 3, 5, 10, 15, 20, 30, 40, 60];
      widths.forEach((w, idx) => {
        const P = H.mkRing('P', 100, 100, 360, 160, 20);
        // Cavity: [120..440, 120..240]
        // T (target, completely walled off between P-left and Wall): [120..220]
        // Wall (divider): [220..220+w]
        // Pocket (empty): [220+w..440]
        const T = H.mkRect('T', 120, 120, 100, 120, '#3b82f6');
        const W = H.mkRect('W', 220, 120, w, 120, '#10b981');
        const r = H.runCase(api, [P, T, W], ['T']);
        assert(31 + idx, `Wall width=${w} blocks T from empty pocket`, Math.abs(r.afterAreas.T - r.beforeAreas.T) < 5, `T area changed: ${r.beforeAreas.T}->${r.afterAreas.T}`);
      });

      // 41-50: Selective connection — T touches Left pocket, separated from Right pocket by Wall of varied width
      widths.forEach((w, idx) => {
        const P = H.mkRing('P', 100, 100, 400, 160, 20);
        // EmptyLeft [120..180], T [180..240], Wall [240..240+w], EmptyRight [240+w..480]
        const T = H.mkRect('T', 180, 120, 60, 120, '#6366f1');
        const W = H.mkRect('W', 240, 120, w, 120, '#10b981');
        const r = H.runCase(api, [P, T, W], ['T']);
        const afterT = r.afterDoc.objects.find(o => o.id === 'T');
        const leakedRight = H.containsPoint(afterT, 450, 180);
        const filledLeft = H.containsPoint(afterT, 150, 180);
        assert(41 + idx, `T fills ONLY Left pocket across wall=${w}`, filledLeft && !leakedRight, `left=${filledLeft} rightLeak=${leakedRight}`);
      });

      // 51-55: Object placed inside concentric box completely sealed (zero adjacent pockets) -> blocked
      for (let i = 0; i < 5; i++) {
        const outer = H.mkRect('OUT', 100, 100, 300, 300, '#cbd5e1');
        const pocketWall = H.mkRing('PW', 140, 140, 220, 220, 20, '#475569');
        const solidIslandWall = H.mkRing('IW', 180, 180, 140, 140, 20, '#94a3b8');
        // Note: OUT solid behind! Or isolated external target outside all holes
        const iso = H.mkRect('ISO', 500 + i * 20, 100, 60, 60, '#f59e0b');
        const r = H.runCase(api, [pocketWall, solidIslandWall, iso], ['ISO']);
        assert(51 + i, `Isolated object outside pockets unchanged #${i}`, Math.abs(r.afterAreas.ISO - 3600) < 5);
      }

      // 56-60: Multi-chamber chain A | Empty1 | Wall1 | T | Wall2 | Empty2 (T surrounded on BOTH sides by walls)
      for (let i = 0; i < 5; i++) {
        const P = H.mkRing('P', 50, 100, 500, 160, 20);
        const W1 = H.mkRect('W1', 150 + i * 5, 120, 20, 120, '#111827');
        const T = H.mkRect('T', 170 + i * 5, 120, 80, 120, '#3b82f6');
        const W2 = H.mkRect('W2', 250 + i * 5, 120, 20, 120, '#111827');
        const r = H.runCase(api, [P, W1, T, W2], ['T']);
        assert(56 + i, `Locked between two walls W1 & W2 #${i}`, Math.abs(r.afterAreas.T - r.beforeAreas.T) < 10);
      }

      // 61-65: Diagonal dividing bar blocking empty corner triangle
      for (let i = 0; i < 5; i++) {
        const P = H.mkRing('P', 100, 100, 240, 240, 20);
        const T = H.mkPoly('T', [[120, 120], [180, 120], [120, 180]], '#3b82f6');
        const Diag = H.mkPoly('D', [[180, 120], [200, 120], [120, 200], [120, 180]], '#10b981');
        const r = H.runCase(api, [P, T, Diag], ['T']);
        assert(61 + i, `Diagonal wall blocks T from remaining pocket #${i}`, Math.abs(r.afterAreas.T - r.beforeAreas.T) < 25, `${r.beforeAreas.T}->${r.afterAreas.T}`);
      }
      return fails;
    });
    expect(failures).toEqual([]);
  });

  test('Scenarios 66-100: Closed stroke frames, open line dividers, Bezier curves, chord gaps & evenodd/nonzero', async ({ page }) => {
    await openEditor(page);
    await page.evaluate(INJECT_HELPERS_JS);

    const failures = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const H = (window as any).__fillTestHelpers;
      const fails: string[] = [];
      const assert = (id: number, label: string, cond: boolean, detail = '') => {
        if (!cond) fails.push(`#${id} (${label}): ${detail}`);
      };

      // 66-75: Closed stroke-only frame + child/parent filling (10 stroke widths)
      for (let i = 1; i <= 10; i++) {
        const frame = H.mkRect('SF', 100, 100, 220, 160, 'none', { stroke: '#dc2626', strokeWidth: 2 + i * 0.5 });
        const child = H.mkRect('CH', 190, 102, 40, 156, '#2563eb');
        const rChild = H.runCase(api, [frame, child], ['CH']);
        assert(65 + i, `Stroke frame encloses CH (sw=${2 + i * 0.5})`, rChild.afterAreas.CH > rChild.beforeAreas.CH + 15000, `${rChild.beforeAreas.CH}->${rChild.afterAreas.CH}`);
      }

      // 76-80: Open stroke Pen lines splitting an empty square into left/right pockets
      for (let i = 0; i < 5; i++) {
        const frame = H.mkRing('F', 100, 100, 260, 160, 15);
        const dividerLine = H.mkLine('DL', [[240 + i * 5, 114], [240 + i * 5, 246]], '#111827', 3);
        const T = H.mkRect('T', 115, 115, 40, 130, '#8b5cf6');
        const r = H.runCase(api, [frame, dividerLine, T], ['T']);
        const afterT = r.afterDoc.objects.find(o => o.id === 'T');
        const rightBlocked = !H.containsPoint(afterT, 320, 180);
        const filledLeftSide = H.containsPoint(afterT, 180, 180);
        assert(76 + i, `Open stroke line splits pocket cleanly #${i}`, filledLeftSide && rightBlocked, `filledLeft=${filledLeftSide} rightBlocked=${rightBlocked}`);
      }

      // 81-85: Concentric circular ring + inner circle pockets
      for (let i = 0; i < 5; i++) {
        const rOut = 120 + i * 10, rIn = 50 + i * 5;
        const ringObj = {
          id: 'CR', name: 'CR', type: 'path', fill: '#ef4444', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero',
          subs: [
            H.mkCircle('a', 300, 300, rOut).subs[0],
            (() => {
              const c = H.mkCircle('b', 300, 300, rIn).subs[0];
              c.nodes = c.nodes.slice().reverse().map(n => ({ ...n, handleIn: n.handleOut, handleOut: n.handleIn }));
              return c;
            })()
          ]
        };
        const r = H.runCase(api, [ringObj], ['CR']);
        const expectedSolid = Math.PI * rOut * rOut;
        assert(81 + i, `Concentric Bezier ring fills inner hole #${i}`, Math.abs(r.afterAreas.CR - expectedSolid) < expectedSolid * 0.08, `${r.afterAreas.CR} vs ${expectedSolid}`);
      }

      // 86-92: Micro-gaps (0.1, 0.25, 0.4, 0.6, 0.8, 1.0, 1.15 px) between touching neighbors still detected!
      [0.1, 0.25, 0.4, 0.6, 0.8, 1.0, 1.15].forEach((gap, idx) => {
        const P = H.mkRing('P', 100, 100, 260, 160, 20);
        const C2 = H.mkRect('C2', 200, 120 + gap, 40, 120 - gap * 2, '#14b8a6');
        const r = H.runCase(api, [P, C2], ['C2']);
        assert(86 + idx, `Detects & bridges micro chord gap=${gap}px`, r.afterAreas.C2 > r.beforeAreas.C2 + 12000, `${r.beforeAreas.C2}->${r.afterAreas.C2}`);
      });

      // 93-97: Evenodd same-winding hole detection
      for (let i = 0; i < 5; i++) {
        const P = H.mkRing('P_EO', 100, 100, 240, 180, 25 + i * 3, '#6366f1', true, { fillRule: 'evenodd' });
        const C2 = H.mkRect('C2', 190, 125 + i * 3, 40, 130 - i * 6, '#ec4899');
        const r = H.runCase(api, [P, C2], ['C2']);
        assert(93 + i, `Evenodd same-winding frame pocket detected #${i}`, r.afterAreas.C2 > r.beforeAreas.C2 + 8000, `${r.beforeAreas.C2}->${r.afterAreas.C2}`);
      }

      // 98-100: Multi-level 3 nested rings — middle ring fills both outer ring pocket & inner hole!
      for (let i = 0; i < 3; i++) {
        const outer = H.mkRing('R1', 50, 50, 400, 400, 20, '#ef4444');
        const mid = H.mkRing('R2', 130, 130, 240, 240, 20 + i * 4, '#3b82f6');
        const r = H.runCase(api, [outer, mid], ['R2']);
        assert(98 + i, `Nested middle ring fills both outer & inner pockets #${i}`, r.afterAreas.R2 > 115000, `area=${r.afterAreas.R2}`);
      }
      return fails;
    });
    expect(failures).toEqual([]);
  });

  test('Scenarios 101-150: Multi-select contention, hidden/locked/frameBg, floating islands, mosaic grid, & extremes', async ({ page }) => {
    await openEditor(page);
    await page.evaluate(INJECT_HELPERS_JS);

    const failures = await page.evaluate(() => {
      const api = (window as any).__geovantaEditorApi;
      const H = (window as any).__fillTestHelpers;
      const fails: string[] = [];
      const assert = (id: number, label: string, cond: boolean, detail = '') => {
        if (!cond) fails.push(`#${id} (${label}): ${detail}`);
      };

      // 101-110: Multi-select 2 bordering targets sharing 1 pocket -> filled by ONLY 1 object (no stacked duplicate!)
      for (let i = 0; i < 10; i++) {
        const P = H.mkRing('P', 100, 100, 300, 160, 20);
        const L = H.mkRect('L', 120, 120, 60 + i * 3, 120, '#3b82f6');
        const R = H.mkRect('R', 260, 120, 60, 120, '#10b981');
        // Empty middle pocket [180+3i .. 260, 120..240]
        const res = H.runCase(api, [P, L, R], ['L', 'R']);
        const totalAfter = res.afterAreas.L + res.afterAreas.R;
        const expectedTotal = (300 - 40) * 120;
        assert(101 + i, `Multi-select shared pocket assigned once #${i}`, Math.abs(totalAfter - expectedTotal) < 300, `sum=${totalAfter} vs ${expectedTotal}`);
      }

      // 111-115: Hidden object inside cavity does NOT block pocket; frameBg behind cavity does NOT block pocket!
      for (let i = 0; i < 5; i++) {
        const bg = H.mkRect('BG', 0, 0, 800, 800, '#ffffff', { isFrameBg: true });
        const P = H.mkRing('P', 100, 100, 260, 160, 20);
        const hiddenWall = H.mkRect('HW', 200, 120, 20, 120, '#000', { hidden: true });
        const T = H.mkRect('T', 120, 120, 60, 120, '#f59e0b');
        const r = H.runCase(api, [bg, P, hiddenWall, T], ['T']);
        assert(111 + i, `isFrameBg + hidden object do not block fill #${i}`, r.afterAreas.T > 24000, `area=${r.afterAreas.T}`);
      }

      // 116-120: Preserves gradient, blendMode, stroke, opacity when expanding
      const blendModes = ['multiply', 'screen', 'overlay', 'darken', 'lighten'];
      blendModes.forEach((bm, idx) => {
        const P = H.mkRing('P', 100, 100, 240, 160, 20);
        const grad = { type: 'linear', x1: 0, y1: 0, x2: 1, y2: 1, stops: [{ id: 's1', off: 0, col: '#ec4899' }, { id: 's2', off: 1, col: '#8b5cf6' }] };
        const T = H.mkRect('T', 180, 120, 40, 120, '#ec4899', { grad, stroke: '#111827', strokeWidth: 2, blendMode: bm, opacity: 0.85 });
        const r = H.runCase(api, [P, T], ['T']);
        const out = r.afterDoc.objects.find(o => o.id === 'T');
        assert(116 + idx, `Preserves style & gradient (${bm})`, r.afterAreas.T > 20000 && out.blendMode === bm && out.opacity === 0.85 && out.stroke === '#111827' && out.grad?.stops?.length === 2);
      });

      // 121-130: Floating island obstacle INSIDE a pocket remains cut out (island preserved as hole!)
      for (let i = 0; i < 10; i++) {
        const P = H.mkRing('P', 100, 100, 300, 300, 20);
        const island = H.mkRect('ISL', 200 + i * 2, 200, 60, 60, '#f59e0b');
        const r = H.runCase(api, [P, island], ['P']);
        const outP = r.afterDoc.objects.find(o => o.id === 'P');
        const respectsHole = !H.containsPoint(outP, 230 + i * 2, 230);
        assert(121 + i, `Floating island preserved inside filled parent #${i}`, respectsHole && r.afterAreas.P > 80000, `holeCutout=${respectsHole} area=${r.afterAreas.P}`);
      }

      // 131-140: 6x6 Mosaic grid (36 tiles) with scattered interior deleted tiles -> filling adjacent selected tile absorbs deleted cells cleanly
      for (let i = 0; i < 10; i++) {
        const objs = [];
        const rowDel = 1 + Math.floor(i / 3) % 4;
        const skipIdx1 = rowDel * 6 + 1 + (i % 3); // col 1..3 so col+1 is 2..4 (strictly interior, never col 5 border!)
        const skipIdx2 = skipIdx1 + 1;
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 6; col++) {
            const idxCell = row * 6 + col;
            if (idxCell === skipIdx1 || idxCell === skipIdx2) continue;
            objs.push(H.mkRect(`m_${idxCell}`, 100 + col * 40, 100 + row * 40, 40, 40, idxCell % 2 ? '#94a3b8' : '#64748b'));
          }
        }
        const adjId = `m_${skipIdx1 - 1}`;
        const r = H.runCase(api, objs, [adjId]);
        assert(131 + i, `6x6 mosaic adjacent tile fills 2 deleted cells #${i}`, Math.abs(r.afterAreas[adjId] - 4800) < 350, `area=${r.afterAreas[adjId]}`);
      }

      // 141-145: Tiny (20x20 icon) & Huge / Negative coordinate regimes
      const coordTests = [
        { s: 1, ox: 0, oy: 0, w: 20, inset: 3 },
        { s: 1, ox: -900, oy: -700, w: 240, inset: 20 },
        { s: 1, ox: 25000, oy: 18000, w: 300, inset: 25 },
        { s: 1, ox: 0, oy: 0, w: 2400, inset: 120 },
        { s: 1, ox: -50, oy: -50, w: 120, inset: 15 },
      ];
      coordTests.forEach((c, idx) => {
        const P = H.mkRing('P', c.ox, c.oy, c.w, c.w * 0.8, c.inset);
        const innerArea = (c.w - c.inset * 2) * (c.w * 0.8 - c.inset * 2);
        const r = H.runCase(api, [P], ['P']);
        assert(141 + idx, `Coordinate scale w=${c.w} @ (${c.ox},${c.oy})`, r.afterAreas.P > r.beforeAreas.P + innerArea * 0.85, `${r.beforeAreas.P}->${r.afterAreas.P}`);
      });

      // 146-150: Guard edge cases (open-only selection, locked selection, image-only, empty selection, zero-area degenerate)
      {
        const lineOnly = H.mkLine('L1', [[100, 100], [200, 200]], '#000', 2);
        const r146 = H.runCase(api, [lineOnly], ['L1']);
        assert(146, 'Open path selection rejected cleanly', r146.afterDoc.objects.length === 1 && !r146.afterDoc.objects[0].subs[0].closed);

        const lockedP = H.mkRing('LP', 100, 100, 200, 200, 20);
        lockedP.locked = true;
        const r147 = H.runCase(api, [lockedP], ['LP']);
        assert(147, 'Locked target skipped cleanly', r147.afterAreas.LP === r147.beforeAreas.LP);

        api.setDoc({ viewBox: [0, 0, 500, 500], objects: [], styles: [] });
        api.setSelection([]);
        api.fillEmptySpace();
        assert(148, 'Empty doc + empty selection no crash', api.getDoc().objects.length === 0);

        const degen = H.mkPoly('DG', [[100, 100], [200, 100], [300, 100]], '#000');
        const P = H.mkRing('P', 50, 50, 300, 300, 20);
        const r149 = H.runCase(api, [degen, P], ['P']);
        assert(149, 'Collinear zero-area polygon in scene skipped cleanly', r149.afterAreas.P > 80000);

        const imgObj = { id: 'IMG1', name: 'img', type: 'image', img: 'data:image/png;base64,', x: 0, y: 0, w: 100, h: 100, subs: [] };
        const r150 = H.runCase(api, [imgObj], ['IMG1']);
        assert(150, 'Image-only selection safely ignored', r150.afterDoc.objects.length === 1);
      }

      return fails;
    });
    expect(failures).toEqual([]);
  });
});
