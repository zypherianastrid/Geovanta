import { test, expect } from '@playwright/test';
import { parsePath } from '../src/engine/svgPathParser.tsx';
import { cleanAndStitchIconObjects, separateIconObjectsDoc } from '../src/engine/compoundPathEngine.tsx';

test.describe('Iconify Interior Overlap Removal & Separate Icon Objects', () => {
  test('cleanAndStitchIconObjects unions self-overlapping nonzero subpaths so no weird interior nodes remain inside the shape body', () => {
    // Two overlapping rectangles inside a single <path> with fillRule="nonzero":
    // Horizontal bar [2, 10]..[22, 14] and vertical bar [10, 2]..[14, 22] (a plus sign built from 2 overlapping bars).
    // Before fix: the 8 vertices of both bars overlap in the middle [10..14, 10..14], leaving interior nodes/segments inside the solid cross.
    // After fix: cleanAndStitchIconObjects unions overlapping same-winding subpaths so the resulting contour only has exterior perimeter nodes (no nodes strictly inside [10.5..13.5, 10.5..13.5]).
    const overlappingPlusD = 'M2 10H22V14H2Z M10 2H14V22H10Z';
    const subs = parsePath(overlappingPlusD);
    expect(subs.length).toBe(2);

    const rawObj = {
      id: 'plus-icon',
      name: 'ic:baseline-add',
      type: 'path',
      fill: '#18181b',
      stroke: 'none',
      strokeWidth: 0,
      opacity: 1,
      fillRule: 'nonzero',
      subs,
    };

    const cleaned = cleanAndStitchIconObjects([rawObj]);
    expect(cleaned.length).toBe(1);
    // The two overlapping bars should be merged into 1 clean outer contour with 12 exterior corner nodes
    expect(cleaned[0].subs.length).toBe(1);
    expect(cleaned[0].subs[0].nodes.length).toBe(12);

    // Verify no node lies strictly inside the interior overlap box (10.5..13.5, 10.5..13.5)
    const interiorNodes = cleaned[0].subs[0].nodes.filter(
      (n: any) => n.x > 10.5 && n.x < 13.5 && n.y > 10.5 && n.y < 13.5
    );
    expect(interiorNodes.length).toBe(0);
  });

  test('separateIconObjectsDoc splits a multi-island icon path into independent objects while keeping inner holes attached to their parent island', () => {
    // An icon with 3 visually separate islands inside 1 path object:
    // Island 1: Outer square [0,0]..[20,20] with an inner hole [5,5]..[15,15]
    // Island 2: Solid square [30,0]..[40,10]
    // Island 3: Solid square [50,0]..[60,10]
    const d = 'M0 0H20V20H0Z M5 15V5H15V15Z M30 0H40V10H30Z M50 0H60V10H50Z';
    const subs = parsePath(d);
    expect(subs.length).toBe(4);

    const doc = {
      viewBox: [0, 0, 100, 100],
      objects: [
        {
          id: 'icon-1',
          name: 'material-symbols:person-off',
          type: 'path',
          fill: '#0d99ff',
          stroke: 'none',
          strokeWidth: 0,
          opacity: 1,
          fillRule: 'nonzero',
          group: 'material-symbols:person-off',
          isIconFrame: true,
          containerType: 'frame',
          subs,
        },
      ],
    };

    expect(typeof separateIconObjectsDoc).toBe('function');
    const res = separateIconObjectsDoc(doc, new Set(['icon-1']));
    expect(res.changed).toBe(true);
    // 4 subpaths (1 outer + 1 hole + 2 separate islands) -> 3 independent objects!
    expect(res.doc.objects.length).toBe(3);
    expect(res.resultIds.length).toBe(3);

    // Island 1 has 2 subpaths (outer + hole) with fillRule 'evenodd'
    const islandWithHole = res.doc.objects.find((o: any) => o.subs.length === 2);
    expect(islandWithHole).toBeDefined();
    expect(islandWithHole.fillRule).toBe('evenodd');

    // Islands 2 & 3 have 1 subpath each
    const singleIslands = res.doc.objects.filter((o: any) => o.subs.length === 1);
    expect(singleIslands.length).toBe(2);
  });
});
