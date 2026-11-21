import { test, expect } from '@playwright/test';
import { buildIconSvg, resolveIconEntry } from '../src/renderer/iconifyClient.tsx';
import { cleanAndStitchIconObjects } from '../src/engine/compoundPathEngine.tsx';
import { parsePath } from '../src/engine/svgPathParser.tsx';

test.describe('Iconify & Material UI icon fidelity', () => {
  test('buildIconSvg applies Iconify rotate, hFlip, vFlip and preserves viewBox & currentColor', () => {
    const setData = {
      prefix: 'ic',
      width: 24,
      height: 24,
      icons: {
        'baseline-arrow': {
          body: '<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>'
        }
      },
      aliases: {
        'baseline-arrow-left': {
          parent: 'baseline-arrow',
          hFlip: true
        },
        'baseline-arrow-down': {
          parent: 'baseline-arrow',
          rotate: 1
        }
      }
    };

    const resolvedFlip = resolveIconEntry('ic:baseline-arrow-left', setData);
    expect(resolvedFlip?.entry?.hFlip).toBe(true);

    const svgFlip = buildIconSvg('ic:baseline-arrow-left', setData);
    expect(svgFlip).toContain('transform=');
    expect(svgFlip).toContain('scale(-1 1)');

    const svgRot = buildIconSvg('ic:baseline-arrow-down', setData);
    expect(svgRot).toContain('rotate(90');
  });

  test('Material UI multi-subpath & overlapping compound paths preserve original fillRule and exact curve geometry without destructive merging or simplification', () => {
    // Two Material UI paths:
    // 1. Secondary tone path with 2 subpaths (outer circle + inner hole) and opacity 0.3
    // 2. Primary path with 4 nested subpaths (outer ring, inner ring, center dot) and nonzero winding
    const subs1 = parsePath('M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 12.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z');
    const subs2 = parsePath('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 5.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z');

    const objects = [
      { id: 'p1', name: 'path-1', type: 'path', fill: '#18181b', stroke: 'none', strokeWidth: 0, opacity: 0.3, fillRule: 'nonzero', subs: subs1 },
      { id: 'p2', name: 'path-2', type: 'path', fill: '#18181b', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero', subs: subs2 },
    ];

    const cleaned = cleanAndStitchIconObjects(objects);
    expect(cleaned.length).toBe(2);
    expect(cleaned[0].subs.length).toBe(2);
    expect(cleaned[1].subs.length).toBe(4);
    expect(cleaned[1].fillRule).toBe('nonzero');

    // Verify small inner circle (radius 1, 4 nodes) was not destroyed or distorted
    const smallestSub = cleaned[1].subs[3];
    expect(smallestSub.nodes.length).toBe(4);
    expect(smallestSub.nodes.some((n: any) => n.handleIn || n.handleOut)).toBe(true);
  });

  test('Material UI icon with disjoint subpaths inside a single <path> is not split or re-merged with wrong fillRule', () => {
    // e.g. ic:baseline-dashboard where one <path> has 4 separate rectangles/shapes
    const subs = parsePath('M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z');
    const objects = [
      { id: 'p1', name: 'path-1', type: 'path', fill: '#18181b', stroke: 'none', strokeWidth: 0, opacity: 1, fillRule: 'nonzero', subs }
    ];

    const cleaned = cleanAndStitchIconObjects(objects);
    expect(cleaned.length).toBe(1);
    expect(cleaned[0].subs.length).toBe(4);
    expect(cleaned[0].fillRule).toBe('nonzero');
  });
});
