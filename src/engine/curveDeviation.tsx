import { flattenCubicAdaptive, pointToChordDistSq } from '../renderer/adaptiveCubicFlattener.tsx';

type Point = {x: number; y: number};
type Segment = {c: {p0: Point; p1: Point; p2: Point; p3: Point}; line?: boolean};
type Edge = {x: number; y: number; dx: number; dy: number; lengthSq: number};
type Bounds = {left: number; top: number; right: number; bottom: number};
type EdgeTree = Bounds & ({edges: Edge[]} | {children: [EdgeTree, EdgeTree]});

function flatten(segments: Segment[], error: number) {
  const points = [segments[0].c.p0.x, segments[0].c.p0.y];
  const stats = {vertexCount: 1, segmentCount: 0, maxDepthReached: 0, maxDepthHit: 0, toleranceMet: true};
  for (const {c, line} of segments) {
    if (line) {
      points.push(c.p3.x, c.p3.y);
      stats.vertexCount++;
    } else {
      flattenCubicAdaptive({...c.p0, handleOut: c.p1}, {...c.p3, handleIn: c.p2},
        error * error, points, 0, 0, stats);
      if (!stats.toleranceMet) return null;
    }
  }
  return points;
}

function edgesFor(points: number[]) {
  const edges: Edge[] = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const x = points[i], y = points[i + 1];
    const dx = points[i + 2] - x, dy = points[i + 3] - y;
    edges.push({x, y, dx, dy, lengthSq: dx * dx + dy * dy});
  }
  return edges;
}

function edgeTree(edges: Edge[], lo = 0, hi = edges.length): EdgeTree {
  if (hi - lo > 8) {
    const mid = (lo + hi) >> 1;
    const a = edgeTree(edges, lo, mid), b = edgeTree(edges, mid, hi);
    return {
      left: Math.min(a.left, b.left), top: Math.min(a.top, b.top),
      right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom),
      children: [a, b]
    };
  }
  const leaf = edges.slice(lo, hi);
  const bounds = {left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity};
  for (const {x, y, dx, dy} of leaf) {
    bounds.left = Math.min(bounds.left, x, x + dx);
    bounds.top = Math.min(bounds.top, y, y + dy);
    bounds.right = Math.max(bounds.right, x, x + dx);
    bounds.bottom = Math.max(bounds.bottom, y, y + dy);
  }
  return {...bounds, edges: leaf};
}

function containsChord(tree: EdgeTree, ax: number, ay: number, bx: number, by: number, radius: number, radiusSq: number): boolean {
  if (Math.min(ax, bx) < tree.left - radius || Math.max(ax, bx) > tree.right + radius ||
      Math.min(ay, by) < tree.top - radius || Math.max(ay, by) > tree.bottom + radius) return false;
  if ('children' in tree) return tree.children.some(child => containsChord(child, ax, ay, bx, by, radius, radiusSq));

  // The neighborhood of a line segment is convex. If it contains both
  // endpoints, it contains every point in the chord between them.
  return tree.edges.some(({x, y, dx, dy, lengthSq}) =>
    pointToChordDistSq(ax, ay, x, y, dx, dy, lengthSq) <= radiusSq &&
    pointToChordDistSq(bx, by, x, y, dx, dy, lengthSq) <= radiusSq);
}

function coveredBy(source: Edge[], target: Edge[], radius: number) {
  const tree = edgeTree(target);
  const radiusSq = radius * radius;
  let budget = 200000;
  const covered = (ax: number, ay: number, bx: number, by: number, depth: number): boolean => {
    if (--budget < 0) return false;
    if (containsChord(tree, ax, ay, bx, by, radius, radiusSq)) return true;
    if (depth === 22) return false;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    return containsChord(tree, mx, my, mx, my, radius, radiusSq) &&
      covered(ax, ay, mx, my, depth + 1) && covered(mx, my, bx, by, depth + 1);
  };
  return source.every(({x, y, dx, dy}) => covered(x, y, x + dx, y + dy, 0));
}

export function withinCurveTolerance(source: Segment[], candidate: Segment[], tolerance: number) {
  if (source.length === candidate.length && source.every(({c}, i) => {
    const other = candidate[i].c;
    return c.p0.x === other.p0.x && c.p0.y === other.p0.y &&
      c.p1.x === other.p1.x && c.p1.y === other.p1.y &&
      c.p2.x === other.p2.x && c.p2.y === other.p2.y &&
      c.p3.x === other.p3.x && c.p3.y === other.p3.y;
  })) return true;
  if (!source.length || !candidate.length) return false;
  if (!(tolerance > 0) || !Number.isFinite(tolerance)) return false;
  const sourceError = source.every(segment => segment.line) ? 0 : tolerance / 16;
  const candidateError = candidate.every(segment => segment.line) ? 0 : tolerance / 16;
  const a = flatten(source, sourceError);
  const b = flatten(candidate, candidateError);
  if (!a || !b) return false;

  // Reserve both curve-to-polyline errors before checking the polylines.
  const radius = tolerance - sourceError - candidateError;
  const edgesA = edgesFor(a);
  const edgesB = edgesFor(b);
  return coveredBy(edgesA, edgesB, radius) && coveredBy(edgesB, edgesA, radius);
}
