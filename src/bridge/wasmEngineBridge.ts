/**
 * @file src/bridge/wasmEngineBridge.ts
 * @description Bridge interface and loader for Geovanta Rust WebAssembly acceleration engine
 */

export interface WasmEngine {
  isReady: boolean;
  flattenCubic: ((
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    tolSq: number,
    maxDepth: number,
    minSegLenSq: number,
    segVertexLimit: number
  ) => Float64Array | number[] | null) | null;
  pointToChordDistSq: ((
    px: number, py: number,
    x0: number, y0: number,
    dx: number, dy: number,
    chordLenSq: number
  ) => number) | null;
  hasPolygonSelfIntersection: ((coords: Float64Array | number[]) => boolean) | null;
  earClipPolygon: ((coords: Float64Array | number[]) => Float32Array | null) | null;
  rdpSimplify: ((coords: Float64Array | number[], epsilon: number) => Float64Array | number[]) | null;
}

export const wasmEngine: WasmEngine = {
  isReady: false,
  flattenCubic: null,
  pointToChordDistSq: null,
  hasPolygonSelfIntersection: null,
  earClipPolygon: null,
  rdpSimplify: null,
};

let initPromise: Promise<boolean> | null = null;

export async function initWasmEngine(): Promise<boolean> {
  if (wasmEngine.isReady) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Dynamic import of wasm package
      const wasm = await import('../../rust/geovanta-wasm/pkg/geovanta_wasm.js');

      wasmEngine.flattenCubic = (x0, y0, x1, y1, x2, y2, x3, y3, tolSq, maxDepth, minSegLenSq, segVertexLimit) => {
        return wasm.flatten_cubic_adaptive_flat(
          x0, y0, x1, y1, x2, y2, x3, y3,
          tolSq, maxDepth, minSegLenSq, segVertexLimit
        );
      };

      wasmEngine.pointToChordDistSq = (px, py, x0, y0, dx, dy, chordLenSq) => {
        return wasm.point_to_chord_dist_sq(px, py, x0, y0, dx, dy, chordLenSq);
      };

      wasmEngine.hasPolygonSelfIntersection = (coords) => {
        const input = coords instanceof Float64Array ? coords : new Float64Array(coords);
        return wasm.has_polygon_self_intersection_flat(input);
      };

      wasmEngine.earClipPolygon = (coords) => {
        const input = coords instanceof Float64Array ? coords : new Float64Array(coords);
        const result = wasm.ear_clip_polygon_flat(input);
        return result || null;
      };

      wasmEngine.rdpSimplify = (coords, epsilon) => {
        const input = coords instanceof Float64Array ? coords : new Float64Array(coords);
        return wasm.rdp_simplify_flat(input, epsilon);
      };

      wasmEngine.isReady = true;
      return true;
    } catch (err) {
      console.warn('[WasmEngineBridge] WASM acceleration unavailable, continuing with JS fallback:', err);
      wasmEngine.isReady = false;
      return false;
    }
  })();

  return initPromise;
}
