import { test, expect } from '@playwright/test';
import { VE } from '../src/engine/vectorEngine.tsx';
import { resolveExportArea, serializeDoc } from '../src/engine/svgDocumentSerializer.tsx';
import { docBounds } from '../src/engine/imageAndBounds.tsx';

test.describe('SVG Export Bounds and Padding Integrity', () => {
  test('Issue 2: Blue poster SVG export has 0px bleed and exact viewBox without white stroke/gap', async () => {
    // Blue rectangular poster: [100, 100, 900, 900] (width 800, height 800)
    const bluePosterDoc = {
      viewBox: [0, 0, 1000, 1000],
      objects: [
        {
          id: 'blue-bg',
          name: 'path-1',
          type: 'path',
          fill: '#3b5bf5',
          stroke: 'none',
          strokeWidth: 0,
          subs: [
            {
              closed: true,
              nodes: [
                { id: 'n1', x: 100, y: 100, type: 'corner', in: null, out: null },
                { id: 'n2', x: 900, y: 100, type: 'corner', in: null, out: null },
                { id: 'n3', x: 900, y: 900, type: 'corner', in: null, out: null },
                { id: 'n4', x: 100, y: 900, type: 'corner', in: null, out: null },
              ],
            },
          ],
        },
      ],
    };

    // Export with content / selection area
    const { bounds } = resolveExportArea(bluePosterDoc, { area: 'content', isRaster: false });
    const [ox, oy, vw, vh] = bounds;

    // ViewBox width and height must match 800 exactly (not 802 with 1px bleed on each side)
    expect(vw).toBe(800);
    expect(vh).toBe(800);
    expect(ox).toBe(100);
    expect(oy).toBe(100);

    const svgXml = serializeDoc(bluePosterDoc, { area: 'content', isRaster: false });
    expect(svgXml).toContain('viewBox="0 0 800 800"');
    // Path should start at M 0 0 or M0 0 exactly (relative to viewBox origin 0,0), not M1 1
    expect(svgXml).toMatch(/d="M\s*0(?:\.0+)?[\s,]0(?:\.0+)?/);
    expect(svgXml).toContain('width="800"');
    expect(svgXml).toContain('height="800"');
  });

  test('Issue 1: Icon frame export excludes invisible frame background and bounds tightly to graphic', async () => {
    // Icon frame (e.g. cat icon) inside a 96x96 container at (200, 200)
    // The cat itself is 60x70 located at (218, 213) to (278, 283)
    const iconFrameDoc = {
      viewBox: [0, 0, 800, 600],
      objects: [
        {
          id: 'fluent-cat-bg',
          name: 'fluent:animal-cat-bg',
          type: 'path',
          isAutoFrame: true,
          isFrameBg: true,
          containerType: 'frame',
          isIconFrame: true,
          group: 'fluent:animal-cat',
          fill: 'transparent',
          stroke: 'none',
          strokeWidth: 1,
          subs: [
            {
              closed: true,
              nodes: [
                { id: 'b1', x: 200, y: 200, type: 'corner', in: null, out: null },
                { id: 'b2', x: 296, y: 200, type: 'corner', in: null, out: null },
                { id: 'b3', x: 296, y: 296, type: 'corner', in: null, out: null },
                { id: 'b4', x: 200, y: 296, type: 'corner', in: null, out: null },
              ],
            },
          ],
        },
        {
          id: 'fluent-cat-shape',
          name: 'path-cat',
          type: 'path',
          containerType: 'frame',
          isIconFrame: true,
          group: 'fluent:animal-cat',
          fill: '#9ba447',
          stroke: 'none',
          strokeWidth: 0,
          subs: [
            {
              closed: true,
              nodes: [
                { id: 'c1', x: 218, y: 213, type: 'corner', in: null, out: null },
                { id: 'c2', x: 278, y: 213, type: 'corner', in: null, out: null },
                { id: 'c3', x: 278, y: 283, type: 'corner', in: null, out: null },
                { id: 'c4', x: 218, y: 283, type: 'corner', in: null, out: null },
              ],
            },
          ],
        },
      ],
    };

    // Selecting the cat shape only
    const selResult = resolveExportArea(iconFrameDoc, {
      area: 'sel',
      only: new Set(['fluent-cat-shape']),
      isRaster: false,
    });
    // Should NOT include the invisible frame background
    expect(selResult.objects.some((o: any) => o.id === 'fluent-cat-bg')).toBe(false);
    expect(selResult.bounds[2]).toBe(60);
    expect(selResult.bounds[3]).toBe(70);

    // Exporting selection to SVG
    const selSvgXml = serializeDoc(iconFrameDoc, {
      area: 'sel',
      only: new Set(['fluent-cat-shape']),
      isRaster: false,
    });
    expect(selSvgXml).toContain('viewBox="0 0 60 70"');
    expect(selSvgXml).not.toContain('fluent-cat-bg');

    // Exporting whole document (content area) where invisible frame background exists
    const contentResult = resolveExportArea(iconFrameDoc, { area: 'content', isRaster: false });
    expect(contentResult.bounds[2]).toBe(60);
    expect(contentResult.bounds[3]).toBe(70);

    const contentSvgXml = serializeDoc(iconFrameDoc, { area: 'content', isRaster: false });
    expect(contentSvgXml).toContain('viewBox="0 0 60 70"');
    expect(contentSvgXml).not.toContain('fluent-cat-bg');
  });

  test('Visible frame vs child selection export semantics', async () => {
    // Frame with visible white background card [50, 50, 350, 250] (width 300, height 200)
    // Child star inside [100, 100, 150, 150] (width 50, height 50)
    const cardDoc = {
      viewBox: [0, 0, 1000, 800],
      objects: [
        {
          id: 'card-bg',
          name: 'card-bg',
          type: 'path',
          isAutoFrame: true,
          isFrameBg: true,
          group: 'card-1',
          fill: '#ffffff',
          stroke: '#e4e4e7',
          strokeWidth: 1,
          subs: [
            {
              closed: true,
              nodes: [
                { id: 'f1', x: 50, y: 50, type: 'corner', in: null, out: null },
                { id: 'f2', x: 350, y: 50, type: 'corner', in: null, out: null },
                { id: 'f3', x: 350, y: 250, type: 'corner', in: null, out: null },
                { id: 'f4', x: 50, y: 250, type: 'corner', in: null, out: null },
              ],
            },
          ],
        },
        {
          id: 'star-child',
          name: 'star',
          type: 'path',
          containerType: 'frame',
          group: 'card-1',
          fill: '#f59e0b',
          stroke: 'none',
          strokeWidth: 0,
          subs: [
            {
              closed: true,
              nodes: [
                { id: 's1', x: 100, y: 100, type: 'corner', in: null, out: null },
                { id: 's2', x: 150, y: 100, type: 'corner', in: null, out: null },
                { id: 's3', x: 150, y: 150, type: 'corner', in: null, out: null },
                { id: 's4', x: 100, y: 150, type: 'corner', in: null, out: null },
              ],
            },
          ],
        },
      ],
    };

    // Case A: User explicitly selects the visible frame container -> exports whole frame
    const frameSel = resolveExportArea(cardDoc, {
      area: 'sel',
      only: new Set(['card-bg']),
      isRaster: false,
    });
    expect(frameSel.objects.length).toBe(2);
    expect(frameSel.bounds[2]).toBe(301); // 300 + 0.5 stroke on each side = 301
    expect(frameSel.bounds[3]).toBe(201);

    // Case B: User selects ONLY the child star -> exports ONLY the star tightly (50x50)
    const childSel = resolveExportArea(cardDoc, {
      area: 'sel',
      only: new Set(['star-child']),
      isRaster: false,
    });
    expect(childSel.objects.length).toBe(1);
    expect(childSel.objects[0].id).toBe('star-child');
    expect(childSel.bounds[2]).toBe(50);
    expect(childSel.bounds[3]).toBe(50);

    const childSvg = serializeDoc(cardDoc, {
      area: 'sel',
      only: new Set(['star-child']),
      isRaster: false,
    });
    expect(childSvg).toContain('viewBox="0 0 50 50"');
    expect(childSvg).not.toContain('card-bg');
  });

  test('Raster export preserves safe 2px bleed for antialiasing', async () => {
    const doc = {
      viewBox: [0, 0, 500, 500],
      objects: [
        {
          id: 'rect',
          name: 'rect',
          type: 'path',
          fill: '#ff0000',
          stroke: 'none',
          strokeWidth: 0,
          subs: [
            {
              closed: true,
              nodes: [
                { id: 'r1', x: 50, y: 50, type: 'corner', in: null, out: null },
                { id: 'r2', x: 150, y: 50, type: 'corner', in: null, out: null },
                { id: 'r3', x: 150, y: 150, type: 'corner', in: null, out: null },
                { id: 'r4', x: 50, y: 150, type: 'corner', in: null, out: null },
              ],
            },
          ],
        },
      ],
    };

    const rasterRes = resolveExportArea(doc, { area: 'content', isRaster: true });
    // For raster, 2px bleed is maintained to avoid edge clip
    expect(rasterRes.bounds[2]).toBe(104);
    expect(rasterRes.bounds[3]).toBe(104);

    const vectorRes = resolveExportArea(doc, { area: 'content', isRaster: false });
    // For vector SVG, 0px bleed ensures clean exact edge
    expect(vectorRes.bounds[2]).toBe(100);
    expect(vectorRes.bounds[3]).toBe(100);
  });
});
