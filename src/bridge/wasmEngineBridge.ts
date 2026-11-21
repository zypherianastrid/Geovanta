/**
 * @file src/bridge/wasmEngineBridge.ts
 * @description Bridge interface and loader for Geovanta Rust WebAssembly acceleration engine
 */
import { loadEmbeddedBrowserWasm } from './wasmEmbeddedBinary.ts';

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
  computeZoomAtAnchor: ((
    currentZoom: number,
    currentPanX: number,
    currentPanY: number,
    targetZoom: number,
    cx: number,
    cy: number,
    boxW: number,
    boxH: number,
    boxLeft: number,
    boxTop: number,
    useCenter: boolean
  ) => [number, number, number]) | null;
  computeWheelZoomFactor: ((
    deltaY: number,
    deltaMode: number,
    clientHeight: number,
    isCtrlPinch: boolean
  ) => number) | null;
  computeFitTo: ((
    bx: number,
    by: number,
    bw: number,
    bh: number,
    clientW: number,
    clientH: number,
    pad: number
  ) => [number, number, number, boolean]) | null;
  screenToWorld: ((
    canvasX: number,
    canvasY: number,
    zoom: number,
    panX: number,
    panY: number
  ) => [number, number]) | null;
  worldToScreen: ((
    wx: number,
    wy: number,
    zoom: number,
    panX: number,
    panY: number
  ) => [number, number]) | null;
  computeVisibleBounds: ((
    zoom: number,
    panX: number,
    panY: number,
    clientW: number,
    clientH: number
  ) => [number, number, number, number]) | null;
  zoomToSlider: ((zoom: number) => number) | null;
  sliderToZoom: ((sliderVal: number) => number) | null;
  traceImageRgbaToSvg: ((
    rgba: Uint8Array,
    width: number,
    height: number,
    mode: number,
    threshold: number,
    colorCount: number,
    despeckle: number,
    smoothness: number,
    cornerThresholdDeg: number,
    ignoreWhite: boolean
  ) => string) | null;
}

export const wasmEngine: WasmEngine = {
  isReady: false,
  flattenCubic: null,
  pointToChordDistSq: null,
  hasPolygonSelfIntersection: null,
  earClipPolygon: null,
  rdpSimplify: null,
  computeZoomAtAnchor: null,
  computeWheelZoomFactor: null,
  computeFitTo: null,
  screenToWorld: null,
  worldToScreen: null,
  computeVisibleBounds: null,
  zoomToSlider: null,
  sliderToZoom: null,
  traceImageRgbaToSvg: null,
};

let initPromise: Promise<boolean> | null = null;

export async function initWasmEngine(): Promise<boolean> {
  if (wasmEngine.isReady) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      let wasm: any = null;
      if (typeof window !== 'undefined' && (window as any).__GEOVANTA_WASM__) {
        wasm = (window as any).__GEOVANTA_WASM__;
      } else if (typeof window === 'undefined') {
        const wasmModulePath = '../../rust/geovanta-wasm/pkg/geovanta_wasm.js';
        wasm = await import(wasmModulePath);
      } else {
        wasm = loadEmbeddedBrowserWasm();
        if (typeof window !== 'undefined') {
          (window as any).__GEOVANTA_WASM__ = wasm;
        }
      }
      if (!wasm) return false;

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

      wasmEngine.computeZoomAtAnchor = (
        currentZoom, currentPanX, currentPanY, targetZoom,
        cx, cy, boxW, boxH, boxLeft, boxTop, useCenter
      ) => {
        const res = wasm.compute_zoom_at_anchor(
          currentZoom, currentPanX, currentPanY, targetZoom,
          cx, cy, boxW, boxH, boxLeft, boxTop, useCenter
        );
        return [res[0], res[1], res[2]];
      };

      wasmEngine.computeWheelZoomFactor = (deltaY, deltaMode, clientHeight, isCtrlPinch) => {
        return wasm.compute_wheel_zoom_factor(deltaY, deltaMode, clientHeight, isCtrlPinch);
      };

      wasmEngine.computeFitTo = (bx, by, bw, bh, clientW, clientH, pad) => {
        const res = wasm.compute_fit_to(bx, by, bw, bh, clientW, clientH, pad);
        return [res[0], res[1], res[2], res[3] > 0.5];
      };

      wasmEngine.screenToWorld = (canvasX, canvasY, zoom, panX, panY) => {
        const res = wasm.screen_to_world(canvasX, canvasY, zoom, panX, panY);
        return [res[0], res[1]];
      };

      wasmEngine.worldToScreen = (wx, wy, zoom, panX, panY) => {
        const res = wasm.world_to_screen(wx, wy, zoom, panX, panY);
        return [res[0], res[1]];
      };

      wasmEngine.computeVisibleBounds = (zoom, panX, panY, clientW, clientH) => {
        const res = wasm.compute_visible_world_bounds(zoom, panX, panY, clientW, clientH);
        return [res[0], res[1], res[2], res[3]];
      };

      wasmEngine.zoomToSlider = (zoom) => {
        return wasm.zoom_to_slider(zoom);
      };

      wasmEngine.sliderToZoom = (sliderVal) => {
        return wasm.slider_to_zoom(sliderVal);
      };

      wasmEngine.traceImageRgbaToSvg = (
        rgba, width, height, mode, threshold, colorCount, despeckle, smoothness, cornerThresholdDeg, ignoreWhite
      ) => {
        const input = rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba);
        return wasm.trace_image_rgba_to_svg(
          input,
          width,
          height,
          mode,
          threshold,
          colorCount,
          despeckle,
          smoothness,
          cornerThresholdDeg,
          ignoreWhite
        );
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
