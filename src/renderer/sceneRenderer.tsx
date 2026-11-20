import { RENDER_CONFIG, PERF_TELEMETRY } from '../utils/renderConfigAndTelemetry.tsx';
import { ACTIVE_DEVICE_PROFILE, computeSafeFramebufferSize } from '../utils/deviceProfiles.tsx';
import { VE } from '../engine/vectorEngine.tsx';
import { loadCanvasKit } from './canvasKitRuntime.tsx';
import { CanvasKitScene, getPartialIconFrameGroups, isIconFrameVectorMember } from './canvasKitScene.tsx';
import { visibleSceneObjects } from './visibleSceneObjects.tsx';


function calcGridStep(zoom) {
  const z = Math.max(0.0001, zoom || 1);
  const raw = 16 / z;
  const decade = 10 ** Math.floor(Math.log10(raw));
  const step = (raw / decade < 2 ? 1 : raw / decade < 5 ? 2 : 5) * decade;
  return Math.max(1, step);
}

// 4-pass Rotated-Grid Supersampling offsets (in output framebuffer pixel units).
// Combined with a 2x offscreen surface this produces 16 uniformly stratified
// rotated samples/pixel (8 distinct X and 8 distinct Y strata: 1/16..15/16),
// delivering ultra-smooth curves & shallow diagonals with zero shared-edge seams.
const RGSS_2X_OFFSETS: readonly [number, number][] = [
  [-0.1875, -0.0625],
  [ 0.0625, -0.1875],
  [ 0.1875,  0.0625],
  [-0.0625,  0.1875],
];
const RGSS_2X_FAST_OFFSETS: readonly [number, number][] = [
  [-0.125, -0.125],
  [ 0.125,  0.125],
];
const RGSS_1X_OFFSETS: readonly [number, number][] = [
  [-0.375, -0.125],
  [ 0.125, -0.375],
  [ 0.375,  0.125],
  [-0.125,  0.375],
];

// Neighbor-gradient-aware Interleaved Gradient Noise (IGN) dither for F16->8-bit
// resolve: flat solid interiors have zero neighbor diff so they remain bit-exact,
// while subtle gradient ramps receive sub-LSB dithering to eliminate 8-bit banding.
const RGSS_F16_DITHER_SKSL = `
  uniform shader img;
  half4 main(float2 coord) {
    float4 c = float4(img.eval(coord));
    float a = clamp(c.a, 0.0, 1.0);
    if (a <= 0.0) return half4(0.0);
    float4 cx1 = float4(img.eval(coord + float2(1.0, 0.0)));
    float4 cx0 = float4(img.eval(coord - float2(1.0, 0.0)));
    float4 cy1 = float4(img.eval(coord + float2(0.0, 1.0)));
    float4 cy0 = float4(img.eval(coord - float2(0.0, 1.0)));
    float4 diff = max(max(abs(c - cx1), abs(c - cx0)), max(abs(c - cy1), abs(c - cy0)));
    float4 mask = smoothstep(float4(0.00005), float4(0.0004), diff);
    float n = fract(52.9829189 * fract(dot(floor(coord), float2(0.06711056, 0.00583715))));
    float d = (n - 0.5) * 0.95 / 255.0;
    float outA = clamp(a + d * mask.a, 0.0, 1.0);
    float3 outRgb = clamp(c.rgb + float3(d) * mask.rgb, float3(0.0), float3(outA));
    return half4(outRgb, outA);
  }
`;

function makeRgssResolveSksl(passCount: 2 | 4) {
  const uniforms = Array.from({ length: passCount }, (_, i) => `uniform shader s${i};`).join('\n  ');
  const sum = Array.from({ length: passCount }, (_, i) => `float4(s${i}.eval(coord))`).join(' + ');
  const inv = passCount === 2 ? '0.5' : '0.25';
  return `
  ${uniforms}
  uniform float ditherAmp;
  half4 main(float2 coord) {
    float4 c = (${sum}) * ${inv};
    float a = clamp(c.a, 0.0, 1.0);
    if (a <= 0.0) return half4(0.0);
    float n = fract(52.9829189 * fract(dot(floor(coord), float2(0.06711056, 0.00583715))));
    float d = (n - 0.5) * ditherAmp / 255.0;
    float outA = a < 1.0 ? clamp(a + d, 0.0, 1.0) : 1.0;
    float3 rgb = clamp(c.rgb + float3(d), float3(0.0), float3(outA));
    return half4(rgb, outA);
  }
`;
}

const RGSS_RESOLVE2_SKSL = makeRgssResolveSksl(2);
const RGSS_RESOLVE4_SKSL = makeRgssResolveSksl(4);

class SceneRenderer {
  [key: string]: any;
  declare textPreview: {id: string; text: {content: string}} | null;

  constructor(options = null) {
    this.camera = {zoom: 1, panX: 40, panY: 40, width: 1280, height: 800};
    this.bg = {mode: 'transparent'};
    this.frameRects = new Map();
    this.backend = 'CanvasKit CPU';
    this.disposed = false;
    this.dirty = true;
    this.suspended = false;
    this.revisionId = 0;
    this.raf = 0;
    this.textPreview = null;
    this.sceneInteracting = false;
    this.dragStaticSurface = null;
    this.dragStaticImage = null;
    this.dragStaticKey = null;
    this.dragStaticDoc = null;
    this.dragStaticIds = null;
    this.dragStaticFrames = null;
    this.dragMovingObjects = null;
    this.dragMovingLocalBB = null;
    this.dragStaticSiblingBB = null;
    this.dragPrevDirtyRect = null;
    this.dragCopyPaint = null;
    this.dragStaticW = 0;
    this.dragStaticH = 0;
    this.accumSurface = null;
    this.accumSurfaceW = 0;
    this.accumSurfaceH = 0;
    this.accumSurfaceUnsupported = false;
    this.accumBlitPaint = null;
    this.resolveAlphaFilters = new Map();
    this.rgssDitherEffect = null;
    this.rgssDitherUnavailable = false;
    this.rgssPassSurfaces = null;
    this.rgssPassW = 0;
    this.rgssPassH = 0;
    this.rgssPassCount = 0;
    this.rgssCopyPaint = null;
    this.rgssResolveEffects = new Map();
    this.rgssResolveUnavailable = false;
    this.panCacheSurface = null;
    this.panCacheScratchSurface = null;
    this.panCacheW = 0;
    this.panCacheH = 0;
    this.panCacheKey = null;
    this.panCacheDoc = null;
    this.panCacheFrames = null;
    this.panCachePanX = 0;
    this.panCachePanY = 0;
    this.panCacheQuality = null;
    this.panCacheHasGradient = false;
    this.panCopyPaint = null;
    this.panLastStats = null;
    this._lastCameraZoom = 1;
    this._cpuSurfaceCacheValid = false;
    this._onScreenPresentedSig = null;
    this.cpuPanScrollBuf = null;
    this.cpuPanScrollBufBytes = 0;
    if (options) this.init(options.containerEl, options);
  }

  init(containerEl, {canvasEl, cpuCanvasEl, onError}: any = {}) {
    this.containerEl = containerEl || canvasEl?.parentElement;
    this.gpuCanvasEl = canvasEl;
    this.cpuCanvasEl = cpuCanvasEl;
    this.canvasEl = canvasEl;
    this.onGpuContextLost = event => {
      event.preventDefault();
      this.fallbackToCpu();
      this.requestRender(true);
    };
    canvasEl?.addEventListener?.('webglcontextlost', this.onGpuContextLost);
    this.onError = onError;
    this.ready = loadCanvasKit().then(kit => {
      if (this.disposed) return;
      this.scene = new CanvasKitScene(kit, () => this.invalidateAssets());
      this.requestRender(true);
    }).catch(error => this.reportError(error));
    return this;
  }

  invalidateAssets() {
    this.invalidatePanCache();
    this.requestRender(true);
  }

  invalidatePanCache() {
    this.panCacheKey = null;
    this.panCacheQuality = null;
    this._cpuSurfaceCacheValid = false;
    this._onScreenPresentedSig = null;
  }

  reportError(error) {
    console.error('[Geovanta CanvasKit]', error);
    this.onError?.(error);
  }

  setScene(doc, revisionId = this.revisionId + 1, opts: Record<string, any> = {}) {
    if (doc !== this.doc) {
      this.doc = doc;
      if (!opts.onlyPaint && !opts.deferSpatialIndex && !this.dragOffset) {
        this.spatialIndex = doc?.objects ? VE.getDocSpatialIndex(doc.objects) : null;
        this._spatialIndexDirty = false;
      } else if (opts.onlyPaint && this.spatialIndex) {
        this._spatialIndexDirty = false;
      } else if (!this.spatialIndex && doc?.objects && !opts.deferSpatialIndex) {
        this.spatialIndex = VE.getDocSpatialIndex(doc.objects);
        this._spatialIndexDirty = false;
      } else {
        this._spatialIndexDirty = true;
      }
      this.invalidatePanCache();
      this.dirty = true;
    }
    if (this._spatialIndexDirty && !opts.deferSpatialIndex && !this.dragOffset && !opts.onlyPaint) {
      this.spatialIndex = doc?.objects ? VE.getDocSpatialIndex(doc.objects) : null;
      this._spatialIndexDirty = false;
      this.invalidatePanCache();
      this.dirty = true;
    }
    if (revisionId !== this.revisionId) {
      this.invalidatePanCache();
      this.dirty = true;
    }
    this.revisionId = revisionId;
  }

  setRenderEnv(env) {
    if (!env) return;
    let sceneChanged = false;
    if (env.bg && (env.bg.mode !== this.bg?.mode || env.bg.color !== this.bg?.color)) {
      this.bg = env.bg;
      sceneChanged = true;
    } else if (env.bg) {
      this.bg = env.bg;
    }
    if (env.showGrid != null) this.showGrid = env.showGrid;
    if (env.clipFrames != null && env.clipFrames !== this.clipFrames) {
      this.clipFrames = env.clipFrames;
      sceneChanged = true;
    }
    if (env.frameBoxes && env.frameBoxes !== this.frameBoxes) {
      this.frameBoxes = env.frameBoxes;
      this.frameRects = new Map(env.frameBoxes.map(f => [f.id, f.bb]));
      sceneChanged = true;
    }
    if (env.frameBgByGroup && env.frameBgByGroup !== this.frameBgByGroup) {
      this.frameBgByGroup = env.frameBgByGroup;
      sceneChanged = true;
    }
    if (env.editingTextId !== undefined && env.editingTextId !== this.editingTextId) {
      this.editingTextId = env.editingTextId;
      sceneChanged = true;
    }
    if (env.accent) this._accentColor = env.accent;
    if (sceneChanged) this.invalidatePanCache();
    this.dirty = true;
  }

  _getFrameRectMap() {
    return this.frameRects;
  }

  setDragOffset(ids, dx, dy) {
    if (!this.dragOffset && (!ids || (!dx && !dy))) return;
    const next = ids && (dx || dy) ? {ids, dx, dy} : null;
    if (!next) this.releaseDragStaticCache();
    this.dragOffset = next;
    this.dirty = true;
  }

  setTextPreview(object, content = '') {
    this.textPreview = object ? {...object, text: {...object.text, content}} : null;
    this.invalidatePanCache();
    this.requestRender(true);
    return this.textPreview;
  }

  setSuspended(value) {
    const next = !!value;
    if (next === this.suspended) return;
    this.suspended = next;
    if (next && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    if (!next) this.requestRender(true);
  }

  setCamera(zoom, panX, panY, width, height) {
    const camera = this.camera;
    zoom = zoom || 1;
    panX = panX || 0;
    panY = panY || 0;
    width = width > 0 ? width : camera.width;
    height = height > 0 ? height : camera.height;
    if (zoom === camera.zoom && panX === camera.panX && panY === camera.panY &&
        width === camera.width && height === camera.height) return;
    this.camera = {zoom, panX, panY, width, height};
    this.dirty = true;
  }

  setCameraInteracting(active) {
    if (active === !!this.cameraInteracting) return;
    this.cameraInteracting = active;
    if (!active || !RENDER_CONFIG.antialias) this.dirty = true;
  }

  setSceneInteracting(active) {
    const next = Boolean(active);
    if (next === Boolean(this.sceneInteracting)) return;
    this.sceneInteracting = next;
    if (!next || !RENDER_CONFIG.antialias) this.dirty = true;
  }

  requestRender(force = false) {
    if (this.disposed || this.suspended) return;
    this.dirty ||= force;
    if (this.raf || !this.scene || !this.dirty) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.renderFrame();
    });
  }

  drawGrid({width, height, zoom, panX, panY}, draw) {
    if (!this.showGrid) return;
    const step = calcGridStep(zoom);
    const spacing = Math.max(1, step) * zoom;
    if (spacing < 4) return;
    const accent = this._accentColor || (this._accentColor = (typeof getComputedStyle !== 'undefined' ? getComputedStyle(this.containerEl || this.canvasEl).getPropertyValue('--acc').trim() : '') || '#13b152');
    const start = offset => offset - Math.floor(offset / spacing) * spacing;
    draw(accent, rect => {
      for (let x = start(panX); x <= width; x += spacing) {
        const p = Math.round(x);
        rect(p, 0, 1, height);
      }
      for (let y = start(panY); y <= height; y += spacing) {
        const p = Math.round(y);
        rect(0, p, width, 1);
      }
    });
  }

  renderFrame(force = false) {
    const cv = this.canvasEl;
    if (this.disposed || this.suspended || !this.scene || !cv || !this.doc || (!force && !this.dirty)) return;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.dirty = false;
    try {
      this.drawFrame();
    } catch (error) {
      if (this.backend === 'CanvasKit GPU' && this.cpuCanvasEl) {
        this.fallbackToCpu();
        try {
          this.drawFrame();
        } catch (fallbackError) {
          this.reportError(fallbackError);
        }
      } else this.reportError(error);
    }
  }

  fallbackToCpu() {
    this.gpuUnavailable = true;
    this.accumSurfaceUnsupported = false;
    this.rgssDitherUnavailable = false;
    this.rgssResolveUnavailable = false;
    this.releaseSampleSurface();
    this.releaseDragStaticCache();
    this.releasePanCache();
    try { this.surface?.dispose(); } catch (error) {}
    this.surface = null;
    this.releaseGpuContext();
    this.canvasEl = this.cpuCanvasEl;
    this.backend = 'CanvasKit CPU';
    if (this.gpuCanvasEl) {
      this.gpuCanvasEl.style.display = 'none';
      delete this.gpuCanvasEl.dataset.activeScene;
    }
    if (this.cpuCanvasEl) {
      this.cpuCanvasEl.style.display = 'block';
      this.cpuCanvasEl.dataset.activeScene = '1';
    }
    if (this.containerEl?.dataset) this.containerEl.dataset.canvasBackend = 'cpu';
    this.dirty = true;
  }

  ensureSurface(pw, ph) {
    if (this.surface && (this.canvasEl.width !== pw || this.canvasEl.height !== ph)) {
      this.releaseSampleSurface();
      this.releaseDragStaticCache();
      this.releasePanCache();
      this.surface.dispose();
      this.surface = null;
    }
    if (this.surface) return this.surface;
    const kit = this.scene.kit;
    if (!this.gpuUnavailable && this.gpuCanvasEl) {
      const cv = this.gpuCanvasEl;
      cv.width = pw;
      cv.height = ph;
      try {
        if (!this.gpuContextHandle) {
          this.gpuContextHandle = kit.GetWebGLContext(cv, {
            preserveDrawingBuffer: 1,
            failIfMajorPerformanceCaveat: 1,
            antialias: 0,
          });
          if (this.gpuContextHandle > 0) {
            // Some drivers expose software WebGL even with the caveat flag set.
            // CanvasKit's CPU rasterizer avoids that driver's GPU emulation.
            const gl = cv.getContext('webgl2');
            const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
            if (!/swiftshader|llvmpipe|softpipe|software (adapter|rasterizer|renderer)/i.test(renderer)) {
              this.gpuContext = kit.MakeWebGLContext(this.gpuContextHandle);
            }
          }
        }
        const surface = this.gpuContext && kit.MakeOnScreenGLSurface(this.gpuContext, pw, ph, kit.ColorSpace.SRGB);
        if (surface) {
          this.surface = surface;
          this.canvasEl = cv;
          this.backend = 'CanvasKit GPU';
          cv.style.display = 'block';
          cv.dataset.activeScene = '1';
          if (this.cpuCanvasEl) {
            this.cpuCanvasEl.style.display = 'none';
            delete this.cpuCanvasEl.dataset.activeScene;
          }
          if (this.containerEl?.dataset) this.containerEl.dataset.canvasBackend = 'gpu';
          return surface;
        }
      } catch (error) {
        // An unavailable WebGL context is handled by the separate CPU canvas.
      }
      this.gpuUnavailable = true;
    }
    if (!this.cpuCanvasEl) throw new Error('Kanvas fallback CPU tidak tersedia');
    this.fallbackToCpu();
    const cv = this.cpuCanvasEl;
    cv.width = pw;
    cv.height = ph;
    this.surface = kit.MakeSWCanvasSurface(cv);
    if (!this.surface) throw new Error('Surface CanvasKit CPU tidak tersedia');
    return this.surface;
  }

  drawFrame() {
    const start = performance.now();
    const {width, height} = this.camera;
    const dpr = Math.min(window.devicePixelRatio || 1, RENDER_CONFIG.maxRenderDpr);
    const {pw, ph, effectiveDpr, maxSide, maxPixels} = computeSafeFramebufferSize(width, height, dpr, ACTIVE_DEVICE_PROFILE);
    const {scene} = this;
    this.ensureSurface(pw, ph);
    const options = {
      frameRects: this.clipFrames ? this.frameRects : null,
      frameBackgrounds: this.frameBgByGroup,
      drag: this.dragOffset,
      editingTextId: scene.fontRegistry ? null : this.editingTextId || null,
      allObjects: this.doc.objects
    };
    const background = this.bg.mode === 'solid' ? this.bg.color || '#ffffff' : null;
    const smoothEdges = Boolean(RENDER_CONFIG.antialias);
    const isObjectDragging = Boolean(this.dragOffset && this.dragOffset.ids && this.dragOffset.ids.size > 0);
    const interacting = Boolean(this.cameraInteracting || this.sceneInteracting || isObjectDragging);
    const canvas = this.surface.getCanvas();
    const objCount = this.doc.objects?.length || 0;
    const isGpu = this.backend === 'CanvasKit GPU';
    let stats;
    let skipFlush = false;
    if (isObjectDragging) {
      if (this.panCacheSurface || this.panCacheScratchSurface || this._cpuSurfaceCacheValid || this._onScreenPresentedSig) {
        this.releasePanCache();
      }
      const {kit} = scene;
      if (!this.dragCopyPaint) {
        this.dragCopyPaint = new kit.Paint();
        this.dragCopyPaint.setBlendMode(kit.BlendMode.Src);
      }
      const staticKey = `${pw}|${ph}|${this.revisionId}|${this.camera.zoom}|${this.camera.panX}|${this.camera.panY}|${background || ''}|${this.showGrid ? 1 : 0}|${this.clipFrames ? 1 : 0}|${this.editingTextId || ''}|${this._accentColor || ''}`;
      let rebuiltStatic = false;
      if (!this.dragStaticImage || this.dragStaticKey !== staticKey || this.dragStaticDoc !== this.doc || this.dragStaticIds !== this.dragOffset.ids || this.dragStaticFrames !== this.frameBoxes) {
        const staticSurface = this.ensureDragStaticSurface(pw, ph);
        this.drawVectorFrame(staticSurface.getCanvas(), background, { ...options, passMode: 'static' },
          pw, ph, true, true, 0, 0, pw, ph);
        this.dragStaticImage?.delete();
        this.dragStaticImage = staticSurface.makeImageSnapshot();
        this.dragStaticKey = staticKey;
        this.dragStaticDoc = this.doc;
        this.dragStaticIds = this.dragOffset.ids;
        this.dragStaticFrames = this.frameBoxes;
        const partialIconGroups = getPartialIconFrameGroups(this.doc.objects, this.dragOffset.ids);
        this.dragMovingObjects = (this.doc.objects || []).filter(o => o && !o.hidden && (
          this.dragOffset.ids.has(o.id) ||
          (partialIconGroups.size > 0 && isIconFrameVectorMember(o) && partialIconGroups.has(o.group))
        ));
        this.dragPrevDirtyRect = null;
        rebuiltStatic = true;
        // Precompute union world bbox (including stroke/effects pad) of moving objects
        // and any stationary icon-frame siblings for dirty-rect restore
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity;
        for (let i = 0; i < this.dragMovingObjects.length; i++) {
          const o = this.dragMovingObjects[i];
          const bb = VE.tightBBox(o);
          if (!bb || !isFinite(bb[0]) || bb[0] > bb[2]) continue;
          const strokePad = (o.strokeWidth || 0) * (o.nonScalingStroke ? 1 / Math.max(0.01, this.camera.zoom) : 1) * (o.strokeMiterlimit || 4);
          let shadowPad = 0, blurPad = 0;
          if (Array.isArray(o.effects) && o.effects.length) {
            for (const ef of o.effects) {
              if (!ef || ef.disabled) continue;
              if (ef.type === 'dropShadow') shadowPad = Math.max(shadowPad, Math.max(Math.abs(ef.dx || 0), Math.abs(ef.dy || 0)) + (ef.blur || 0) * 3);
              else if (ef.type === 'layerBlur' || ef.type === 'backgroundBlur') blurPad = Math.max(blurPad, (ef.radius || 0) * 3);
            }
          }
          const pad = Math.max(4, strokePad + shadowPad + blurPad + 4);
          if (this.dragOffset.ids.has(o.id)) {
            if (bb[0] - pad < x0) x0 = bb[0] - pad;
            if (bb[1] - pad < y0) y0 = bb[1] - pad;
            if (bb[2] + pad > x1) x1 = bb[2] + pad;
            if (bb[3] + pad > y1) y1 = bb[3] + pad;
          } else {
            if (bb[0] - pad < sx0) sx0 = bb[0] - pad;
            if (bb[1] - pad < sy0) sy0 = bb[1] - pad;
            if (bb[2] + pad > sx1) sx1 = bb[2] + pad;
            if (bb[3] + pad > sy1) sy1 = bb[3] + pad;
          }
        }
        this.dragMovingLocalBB = x0 <= x1 && y0 <= y1 ? [x0, y0, x1, y1] : null;
        this.dragStaticSiblingBB = sx0 <= sx1 && sy0 <= sy1 ? [sx0, sy0, sx1, sy1] : null;
      }
      if (!isGpu && !rebuiltStatic && this.dragPrevDirtyRect) {
        canvas.save();
        canvas.clipRect(this.dragPrevDirtyRect, kit.ClipOp.Intersect, false);
        canvas.drawImage(this.dragStaticImage, 0, 0, this.dragCopyPaint);
        canvas.restore();
      } else {
        canvas.drawImage(this.dragStaticImage, 0, 0, this.dragCopyPaint);
      }
      stats = this.drawVectorFrame(canvas, null, {
        ...options,
        passMode: 'moving',
        skipBackground: true,
        skipGrid: true,
        objectsOverride: this.dragMovingObjects
      }, pw, ph, true, true, 0, 0, pw, ph);
      if (this.dragMovingLocalBB || this.dragStaticSiblingBB) {
        const {zoom, panX, panY} = this.camera;
        const sx = pw / width, sy = ph / height;
        const dx = this.dragOffset.dx || 0, dy = this.dragOffset.dy || 0;
        let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
        if (this.dragMovingLocalBB) {
          const [bx0, by0, bx1, by1] = this.dragMovingLocalBB;
          ux0 = Math.min(ux0, bx0 + dx);
          uy0 = Math.min(uy0, by0 + dy);
          ux1 = Math.max(ux1, bx1 + dx);
          uy1 = Math.max(uy1, by1 + dy);
        }
        if (this.dragStaticSiblingBB) {
          const [bx0, by0, bx1, by1] = this.dragStaticSiblingBB;
          ux0 = Math.min(ux0, bx0);
          uy0 = Math.min(uy0, by0);
          ux1 = Math.max(ux1, bx1);
          uy1 = Math.max(uy1, by1);
        }
        const rx0 = Math.max(0, Math.floor((ux0 * zoom + panX) * sx) - 4);
        const ry0 = Math.max(0, Math.floor((uy0 * zoom + panY) * sy) - 4);
        const rx1 = Math.min(pw, Math.ceil((ux1 * zoom + panX) * sx) + 4);
        const ry1 = Math.min(ph, Math.ceil((uy1 * zoom + panY) * sy) + 4);
        this.dragPrevDirtyRect = rx0 < rx1 && ry0 < ry1 ? [rx0, ry0, rx1, ry1] : null;
      } else {
        this.dragPrevDirtyRect = null;
      }
    } else {
      if (this.dragStaticImage || this.dragStaticSurface) this.releaseDragStaticCache();
      const {kit} = scene;
      const useRgss = !RENDER_CONFIG.antialias && (!interacting || isGpu);
      const zoomChanged = this.camera.zoom !== this._lastCameraZoom;
      this._lastCameraZoom = this.camera.zoom;
      const panKey = `${pw}|${ph}|${this.revisionId}|${this.camera.zoom}|${background || ''}|${this.clipFrames ? 1 : 0}|${this.editingTextId || ''}|${smoothEdges ? 1 : 0}|${this.textPreview ? 1 : 0}`;
      const heavyPan = this.isHeavyPanScene();
      let handledByPanCache = false;

      if (!isGpu) {
        const cpuPanEligible = heavyPan && !this.showGrid && !this.textPreview && !this.sceneInteracting &&
          !(interacting && zoomChanged) &&
          typeof canvas.readPixels === 'function' && typeof canvas.writePixels === 'function';

        if (this.cameraInteracting && !zoomChanged && cpuPanEligible && this._cpuSurfaceCacheValid &&
            this.panCacheKey === panKey && this.panCacheDoc === this.doc && this.panCacheFrames === this.frameBoxes) {
          const sx = pw / width;
          const sy = ph / height;
          const rawShiftX = (this.camera.panX - this.panCachePanX) * sx;
          const rawShiftY = (this.camera.panY - this.panCachePanY) * sy;
          const intShiftX = Math.round(rawShiftX);
          const intShiftY = Math.round(rawShiftY);
          const overlapW = Math.max(0, pw - Math.abs(intShiftX));
          const overlapH = Math.max(0, ph - Math.abs(intShiftY));
          const exposedPx = pw * ph - overlapW * overlapH;

          if (overlapW > 0 && overlapH > 0 && exposedPx <= pw * ph * 0.65) {
            if (intShiftX === 0 && intShiftY === 0) {
              handledByPanCache = true;
              skipFlush = true;
            } else {
              const srcX = Math.max(0, -intShiftX);
              const srcY = Math.max(0, -intShiftY);
              const dstX = Math.max(0, intShiftX);
              const dstY = Math.max(0, intShiftY);
              const pxInfo = {
                width: overlapW,
                height: overlapH,
                colorType: kit.ColorType.RGBA_8888,
                alphaType: kit.AlphaType.Unpremul,
                colorSpace: kit.ColorSpace.SRGB,
              };
              const needBytes = overlapW * overlapH * 4;
              const mallocBuf = this.ensureCpuPanScrollBuf(pw * ph * 4);
              const movedPixels = mallocBuf
                ? canvas.readPixels(srcX, srcY, pxInfo, mallocBuf, overlapW * 4)
                : canvas.readPixels(srcX, srcY, pxInfo);
              if (movedPixels) {
                const writeView = mallocBuf
                  ? mallocBuf.toTypedArray().subarray(0, needBytes)
                  : movedPixels;
                canvas.writePixels(
                  writeView,
                  overlapW,
                  overlapH,
                  dstX,
                  dstY,
                  kit.AlphaType.Unpremul,
                  kit.ColorType.RGBA_8888,
                  kit.ColorSpace.SRGB
                );
                this.panCachePanX += intShiftX / sx;
                this.panCachePanY += intShiftY / sy;

                const dirtyRects: [number, number, number, number][] = [];
                if (intShiftX > 0) dirtyRects.push([0, 0, dstX, ph]);
                else if (intShiftX < 0) dirtyRects.push([dstX + overlapW, 0, pw, ph]);
                if (intShiftY > 0) dirtyRects.push([dstX, 0, dstX + overlapW, dstY]);
                else if (intShiftY < 0) dirtyRects.push([dstX, dstY + overlapH, dstX + overlapW, ph]);

                const origPanX = this.camera.panX;
                const origPanY = this.camera.panY;
                this.camera.panX = this.panCachePanX;
                this.camera.panY = this.panCachePanY;
                const stripOpts = { ...options, skipGrid: true, isDirtyStrip: true };
                try {
                  const smallStrip = exposedPx <= pw * ph * 0.25;
                  for (let ri = 0; ri < dirtyRects.length; ri++) {
                    const rect = dirtyRects[ri];
                    let stripStats;
                    if (!RENDER_CONFIG.antialias) {
                      if (smallStrip) {
                        stripStats = this.renderRgssFrame(canvas, background, stripOpts, pw, ph, maxSide, maxPixels, true, false, objCount, rect, this.panCacheQuality === 'full');
                      } else {
                        stripStats = this.drawVectorFrame(canvas, background, stripOpts, pw, ph, smoothEdges, true, 0, 0, pw, ph, rect);
                        this.panCacheQuality = 'fast';
                      }
                    } else {
                      stripStats = this.drawVectorFrame(canvas, background, stripOpts, pw, ph, true, true, 0, 0, pw, ph, rect);
                    }
                    if (stripStats?.hasGradient) this.panCacheHasGradient = true;
                  }
                } finally {
                  this.camera.panX = origPanX;
                  this.camera.panY = origPanY;
                }
                this._onScreenPresentedSig = `${panKey}|${this.panCachePanX}|${this.panCachePanY}|0|0|0|${this._accentColor || ''}`;
                handledByPanCache = true;
              }
            }
          }
        } else if (!interacting && cpuPanEligible && this._cpuSurfaceCacheValid &&
                   this.panCacheKey === panKey && this.panCacheDoc === this.doc &&
                   this.panCacheFrames === this.frameBoxes &&
                   this.panCacheQuality === 'full' && !this.panCacheHasGradient) {
          const sx = pw / width;
          const sy = ph / height;
          const wantSig = `${panKey}|${this.panCachePanX}|${this.panCachePanY}|0|0|0|${this._accentColor || ''}`;
          if (Math.abs((this.camera.panX - this.panCachePanX) * sx) < 1e-3 &&
              Math.abs((this.camera.panY - this.panCachePanY) * sy) < 1e-3 &&
              this._onScreenPresentedSig === wantSig) {
            handledByPanCache = true;
            skipFlush = true;
          }
        }

        if (handledByPanCache) {
          stats = this.panLastStats || { visibleObjects: 0, culledObjects: 0, drawCalls: 1, totalVertices: 0, hasGradient: this.panCacheHasGradient };
        } else {
          if (useRgss) {
            stats = this.renderRgssFrame(canvas, background, options, pw, ph, maxSide, maxPixels, interacting, isGpu, objCount);
          } else {
            if (RENDER_CONFIG.antialias) this.releaseSampleSurface();
            stats = this.drawVectorFrame(canvas, background, options,
              pw, ph, smoothEdges, interacting, 0, 0, pw, ph);
          }
          if (cpuPanEligible) {
            this.panCacheKey = panKey;
            this.panCacheDoc = this.doc;
            this.panCacheFrames = this.frameBoxes;
            this.panCachePanX = this.camera.panX;
            this.panCachePanY = this.camera.panY;
            this.panCacheQuality = interacting ? (smoothEdges ? 'full' : 'fast') : 'full';
            this.panCacheHasGradient = Boolean(stats?.hasGradient);
            this.panLastStats = stats;
            this._cpuSurfaceCacheValid = true;
            this._onScreenPresentedSig = `${panKey}|${this.panCachePanX}|${this.panCachePanY}|0|0|0|${this._accentColor || ''}`;
          } else {
            this.invalidatePanCache();
          }
        }
      } else {
        const panEligible = heavyPan && !(this.showGrid && background) && !this.textPreview && !this.sceneInteracting &&
          this.canUsePanCache(pw, ph) && !(interacting && zoomChanged);
        if (!heavyPan && (this.panCacheSurface || this.panCacheScratchSurface)) {
          this.releasePanCache();
        }

        if (this.cameraInteracting && !zoomChanged && panEligible && this.panCacheSurface &&
            this.panCacheKey === panKey && this.panCacheDoc === this.doc && this.panCacheFrames === this.frameBoxes) {
          const sx = pw / width;
          const sy = ph / height;
          const rawShiftX = (this.camera.panX - this.panCachePanX) * sx;
          const rawShiftY = (this.camera.panY - this.panCachePanY) * sy;
          const intShiftX = Math.round(rawShiftX);
          const intShiftY = Math.round(rawShiftY);
          const remX = rawShiftX - intShiftX;
          const remY = rawShiftY - intShiftY;
          const overlapW = Math.max(0, pw - Math.abs(intShiftX));
          const overlapH = Math.max(0, ph - Math.abs(intShiftY));
          const exposedPx = pw * ph - overlapW * overlapH;

          if (overlapW > 0 && overlapH > 0 && exposedPx <= pw * ph * 0.65) {
            if (intShiftX === 0 && intShiftY === 0) {
              const sig = `${panKey}|${this.panCachePanX}|${this.panCachePanY}|${remX.toFixed(3)}|${remY.toFixed(3)}|${this.showGrid ? 1 : 0}|${this._accentColor || ''}`;
              if (this._onScreenPresentedSig === sig) {
                skipFlush = true;
              } else {
                this.presentPanCache(canvas, pw, ph, background, remX, remY);
                this._onScreenPresentedSig = sig;
              }
              handledByPanCache = true;
            } else {
              const nextSurf = this.ensurePanScratchSurface(pw, ph);
              if (nextSurf) {
                const nextCanvas = nextSurf.getCanvas();
                const dx = intShiftX;
                const dy = intShiftY;
                const dstX0 = Math.max(0, dx), dstX1 = Math.min(pw, pw + dx);
                const dstY0 = Math.max(0, dy), dstY1 = Math.min(ph, ph + dy);
                if (!this.panCopyPaint) this.panCopyPaint = new kit.Paint();
                this.panCopyPaint.setBlendMode(kit.BlendMode.Src);
                const prevImg = this.panCacheSurface.makeImageSnapshot();
                try {
                  nextCanvas.save();
                  nextCanvas.clipRect([dstX0, dstY0, dstX1, dstY1], kit.ClipOp.Intersect, false);
                  nextCanvas.drawImage(prevImg, dx, dy, this.panCopyPaint);
                  nextCanvas.restore();
                } finally {
                  prevImg.delete();
                }
                this.panCachePanX += dx / sx;
                this.panCachePanY += dy / sy;

                const dirtyRects: [number, number, number, number][] = [];
                if (dx > 0) dirtyRects.push([0, 0, dstX0, ph]);
                else if (dx < 0) dirtyRects.push([dstX1, 0, pw, ph]);
                if (dy > 0) dirtyRects.push([dstX0, 0, dstX1, dstY0]);
                else if (dy < 0) dirtyRects.push([dstX0, dstY1, dstX1, ph]);

                const origPanX = this.camera.panX;
                const origPanY = this.camera.panY;
                this.camera.panX = this.panCachePanX;
                this.camera.panY = this.panCachePanY;
                const stripOpts = { ...options, skipGrid: true, isDirtyStrip: true };
                try {
                  const smallStrip = exposedPx <= pw * ph * 0.25;
                  for (let ri = 0; ri < dirtyRects.length; ri++) {
                    const rect = dirtyRects[ri];
                    let stripStats;
                    if (!RENDER_CONFIG.antialias) {
                      if (smallStrip) {
                        stripStats = this.renderRgssFrame(nextCanvas, background, stripOpts, pw, ph, maxSide, maxPixels, true, isGpu, objCount, rect, this.panCacheQuality === 'full');
                      } else {
                        stripStats = this.renderRgssFrame(nextCanvas, background, stripOpts, pw, ph, maxSide, maxPixels, true, isGpu, objCount, rect, false);
                        this.panCacheQuality = 'fast';
                      }
                    } else {
                      stripStats = this.drawVectorFrame(nextCanvas, background, stripOpts, pw, ph, true, true, 0, 0, pw, ph, rect);
                    }
                    if (stripStats?.hasGradient) this.panCacheHasGradient = true;
                  }
                } finally {
                  this.camera.panX = origPanX;
                  this.camera.panY = origPanY;
                }
                const tmp = this.panCacheSurface;
                this.panCacheSurface = nextSurf;
                this.panCacheScratchSurface = tmp;
                this.presentPanCache(canvas, pw, ph, background, remX, remY);
                this._onScreenPresentedSig = `${panKey}|${this.panCachePanX}|${this.panCachePanY}|${remX.toFixed(3)}|${remY.toFixed(3)}|${this.showGrid ? 1 : 0}|${this._accentColor || ''}`;
                handledByPanCache = true;
              }
            }
          }
        } else if (!interacting && panEligible && this.panCacheSurface &&
                   this.panCacheKey === panKey && this.panCacheDoc === this.doc &&
                   this.panCacheFrames === this.frameBoxes &&
                   this.panCacheQuality === 'full' && !this.panCacheHasGradient) {
          const sx = pw / width;
          const sy = ph / height;
          if (Math.abs((this.camera.panX - this.panCachePanX) * sx) < 1e-3 &&
              Math.abs((this.camera.panY - this.panCachePanY) * sy) < 1e-3) {
            const wantSig = `${panKey}|${this.panCachePanX}|${this.panCachePanY}|0.000|0.000|${this.showGrid ? 1 : 0}|${this._accentColor || ''}`;
            if (this._onScreenPresentedSig === wantSig) {
              skipFlush = true;
            } else {
              this.presentPanCache(canvas, pw, ph, background, 0, 0);
              this._onScreenPresentedSig = wantSig;
            }
            handledByPanCache = true;
          }
        }

        if (handledByPanCache) {
          stats = this.panLastStats || { visibleObjects: 0, culledObjects: 0, drawCalls: 1, totalVertices: 0, hasGradient: this.panCacheHasGradient };
        } else {
          const cacheSurf = panEligible ? this.ensurePanCacheSurface(pw, ph) : null;
          if (cacheSurf) {
            const cacheCanvas = cacheSurf.getCanvas();
            const cacheOpts = { ...options, skipGrid: true };
            if (useRgss) {
              stats = this.renderRgssFrame(cacheCanvas, background, cacheOpts, pw, ph, maxSide, maxPixels, interacting, isGpu, objCount);
            } else {
              if (RENDER_CONFIG.antialias) this.releaseSampleSurface();
              stats = this.drawVectorFrame(cacheCanvas, background, cacheOpts,
                pw, ph, smoothEdges, interacting, 0, 0, pw, ph);
            }
            this.panCacheKey = panKey;
            this.panCacheDoc = this.doc;
            this.panCacheFrames = this.frameBoxes;
            this.panCachePanX = this.camera.panX;
            this.panCachePanY = this.camera.panY;
            this.panCacheQuality = !interacting
              ? 'full'
              : (smoothEdges || (useRgss && isGpu && objCount <= 500) ? 'full' : 'fast');
            this.panCacheHasGradient = Boolean(stats?.hasGradient);
            this.panLastStats = stats;
            this.presentPanCache(canvas, pw, ph, background, 0, 0);
            this._onScreenPresentedSig = `${panKey}|${this.panCachePanX}|${this.panCachePanY}|0.000|0.000|${this.showGrid ? 1 : 0}|${this._accentColor || ''}`;
          } else {
            this.invalidatePanCache();
            if (useRgss) {
              stats = this.renderRgssFrame(canvas, background, options, pw, ph, maxSide, maxPixels, interacting, isGpu, objCount);
            } else {
              if (RENDER_CONFIG.antialias) this.releaseSampleSurface();
              stats = this.drawVectorFrame(canvas, background, options,
                pw, ph, smoothEdges, interacting, 0, 0, pw, ph);
            }
          }
        }
      }
    }
    if (!skipFlush) this.surface.flush();
    scene.pruneImages(this.doc.objects);
    PERF_TELEMETRY.updateSceneMetrics({
      ...stats,
      totalObjects: this.doc.objects.length,
      domPathCount: 0,
      activeBackend: this.backend,
      dpr: effectiveDpr,
      drawingBufferWidth: pw,
      drawingBufferHeight: ph
    });
    PERF_TELEMETRY.recordRenderPass(performance.now() - start);
  }

  renderRgssFrame(canvas, background, options, pw, ph, maxSide, maxPixels, interacting, isGpu, objCount, dirtyRect = null, forceFullQuality = false) {
    const can2x = Math.max(pw, ph) * 2 <= maxSide && pw * ph * 5 <= maxPixels;
    const use2xSurface = can2x;
    const ssaaScale = use2xSurface ? 2 : 1;
    const sw = pw * ssaaScale;
    const sh = ph * ssaaScale;
    const offsets = use2xSurface
      ? ((interacting && !forceFullQuality)
          ? (isGpu && objCount <= 500 ? RGSS_2X_OFFSETS : RGSS_2X_FAST_OFFSETS)
          : (isGpu || objCount <= 200 ? RGSS_2X_OFFSETS : RGSS_2X_FAST_OFFSETS))
      : RGSS_1X_OFFSETS;
    const {kit} = this.scene;
    const dx0 = dirtyRect ? Math.max(0, Math.floor(dirtyRect[0])) : 0;
    const dy0 = dirtyRect ? Math.max(0, Math.floor(dirtyRect[1])) : 0;
    const dx1 = dirtyRect ? Math.min(pw, Math.ceil(dirtyRect[2])) : pw;
    const dy1 = dirtyRect ? Math.min(ph, Math.ceil(dirtyRect[3])) : ph;
    const ex0 = dirtyRect ? Math.max(0, dx0 - 1) : 0;
    const ey0 = dirtyRect ? Math.max(0, dy0 - 1) : 0;
    const ex1 = dirtyRect ? Math.min(pw, dx1 + 1) : pw;
    const ey1 = dirtyRect ? Math.min(ph, dy1 + 1) : ph;
    const sx0 = ex0 * ssaaScale;
    const sy0 = ey0 * ssaaScale;
    const sx1 = ex1 * ssaaScale;
    const sy1 = ey1 * ssaaScale;
    const swSub = sx1 - sx0;
    const shSub = sy1 - sy0;
    const sampleDirtyRect = dirtyRect ? [sx0, sy0, sx1, sy1] : null;
    const q = !options?.objectsOverride && !options?.prequeriedObjects
      ? this.queryVisibleForPixelRect([ex0, ey0, ex1, ey1], pw, ph, 1 / (this.camera.zoom || 1))
      : null;
    if (dirtyRect && q && q.objects.length === 0 && !options?.skipBackground && options?.skipGrid) {
      canvas.save();
      try {
        canvas.clipRect([dx0, dy0, dx1, dy1], kit.ClipOp.Intersect, false);
        canvas.clear(background ? this.scene.color(background) : kit.TRANSPARENT);
      } finally {
        canvas.restore();
      }
      return { visibleObjects: 0, culledObjects: 0, drawCalls: 0, totalVertices: 0, hasGradient: false };
    }
    const sampleSurface = this.ensureSampleSurface(sw, sh);
    const sampleCanvas = sampleSurface.getCanvas();
    if (!this.resolvePaint) this.resolvePaint = new kit.Paint();
    const resolvePaint = this.resolvePaint;
    const passOptions = q
      ? {
          ...options,
          prequeriedObjects: q.objects,
          cullRect: q.worldRect,
          hasTextPreview: q.hasTextPreview,
          isDirtyStrip: Boolean(dirtyRect) || Boolean(options?.isDirtyStrip)
        }
      : options;

    const drawPassImage = (targetCanvas, image, paint) => {
      if (dirtyRect) {
        if (ssaaScale === 1) {
          targetCanvas.drawImage(image, ex0, ey0, paint);
        } else {
          targetCanvas.drawImageRectOptions(image, [0, 0, swSub, shSub], [ex0, ey0, ex1, ey1],
            kit.FilterMode.Linear, kit.MipmapMode.None, paint);
        }
      } else if (ssaaScale === 1) {
        targetCanvas.drawImage(image, 0, 0, paint);
      } else {
        targetCanvas.drawImageRectOptions(image, [0, 0, sw, sh], [0, 0, pw, ph],
          kit.FilterMode.Linear, kit.MipmapMode.None, paint);
      }
    };

    const skipCpuF16Accum = !isGpu && Boolean(dirtyRect) && offsets.length === 2 && Boolean(background);
    const accumSurface = skipCpuF16Accum ? null : this.ensureAccumSurface(pw, ph);
    if (accumSurface) {
      const accumCanvas = accumSurface.getCanvas();
      if (dirtyRect) {
        accumCanvas.save();
        accumCanvas.clipRect([ex0, ey0, ex1, ey1], kit.ClipOp.Intersect, false);
      }
      accumCanvas.clear(kit.TRANSPARENT);
      resolvePaint.setBlendMode(kit.BlendMode.Plus);
      resolvePaint.setAlphaf(1);
      // Scale premul RGBA via ColorFilter alpha matrix rather than paint.setAlphaf(1/N),
      // because Skia GPU quantizes paint alpha to 8-bit 64/255 (~0.251).
      resolvePaint.setColorFilter(this.getResolveAlphaFilter(offsets.length));
      let stats;
      let frameHasGradient = false;
      try {
        for (let i = 0; i < offsets.length; i++) {
          const [ox, oy] = offsets[i];
          stats = this.drawVectorFrame(sampleCanvas, background, passOptions, sw, sh, false, interacting, ox, oy, pw, ph, sampleDirtyRect);
          if (stats?.hasGradient) frameHasGradient = true;
          const image = dirtyRect ? sampleSurface.makeImageSnapshot([sx0, sy0, sx1, sy1]) : sampleSurface.makeImageSnapshot();
          try {
            drawPassImage(accumCanvas, image, resolvePaint);
          } finally {
            image.delete();
          }
        }
      } finally {
        resolvePaint.setColorFilter(null);
        if (dirtyRect) accumCanvas.restore();
      }

      if (!this.accumBlitPaint) this.accumBlitPaint = new kit.Paint();
      const blitPaint = this.accumBlitPaint;
      blitPaint.setBlendMode(kit.BlendMode.Src);
      if (dirtyRect) {
        canvas.save();
        canvas.clipRect([dx0, dy0, dx1, dy1], kit.ClipOp.Intersect, false);
      } else {
        canvas.clear(kit.TRANSPARENT);
      }
      try {
        const ditherEffect = isGpu && frameHasGradient ? this.getRgssDitherEffect() : null;
        if (ditherEffect) {
          const accumImage = accumSurface.makeImageSnapshot();
          try {
            const imgShader = accumImage.makeShaderOptions(kit.TileMode.Clamp, kit.TileMode.Clamp, kit.FilterMode.Nearest, kit.MipmapMode.None);
            const ditherShader = ditherEffect.makeShaderWithChildren([], [imgShader]);
            try {
              if (typeof blitPaint.setDither === 'function') blitPaint.setDither(false);
              blitPaint.setShader(ditherShader);
              canvas.drawRect(dirtyRect ? [dx0, dy0, dx1, dy1] : [0, 0, pw, ph], blitPaint);
            } finally {
              blitPaint.setShader(null);
              ditherShader.delete();
              imgShader.delete();
            }
          } finally {
            accumImage.delete();
          }
        } else {
          // On CPU, native Skia dither avoids WASM SkSL interpreter overhead (~1s/frame).
          if (typeof blitPaint.setDither === 'function') blitPaint.setDither(!isGpu && frameHasGradient);
          const accumImage = dirtyRect ? accumSurface.makeImageSnapshot([dx0, dy0, dx1, dy1]) : accumSurface.makeImageSnapshot();
          try {
            canvas.drawImage(accumImage, dirtyRect ? dx0 : 0, dirtyRect ? dy0 : 0, blitPaint);
          } finally {
            accumImage.delete();
          }
        }
      } finally {
        if (dirtyRect) canvas.restore();
      }
      return stats;
    }

    const resolveEffect = isGpu ? this.getRgssResolveEffect(offsets.length) : null;
    const passSurfaces = resolveEffect ? this.ensureRgssPassSurfaces(pw, ph, offsets.length) : null;
    if (passSurfaces && resolveEffect) {
      if (!this.rgssCopyPaint) {
        this.rgssCopyPaint = new kit.Paint();
        this.rgssCopyPaint.setBlendMode(kit.BlendMode.Src);
      }
      if (!this.accumBlitPaint) this.accumBlitPaint = new kit.Paint();
      const copyPaint = this.rgssCopyPaint;
      const blitPaint = this.accumBlitPaint;
      blitPaint.setBlendMode(kit.BlendMode.Src);
      if (typeof blitPaint.setDither === 'function') blitPaint.setDither(false);
      let stats;
      let frameHasGradient = false;
      const passImages = [];
      const passShaders = [];
      try {
        for (let i = 0; i < offsets.length; i++) {
          const [ox, oy] = offsets[i];
          stats = this.drawVectorFrame(sampleCanvas, background, passOptions, sw, sh, false, interacting, ox, oy, pw, ph, sampleDirtyRect);
          if (stats?.hasGradient) frameHasGradient = true;
          const sampleImg = dirtyRect ? sampleSurface.makeImageSnapshot([sx0, sy0, sx1, sy1]) : sampleSurface.makeImageSnapshot();
          const passCanvas = passSurfaces[i].getCanvas();
          if (dirtyRect) {
            passCanvas.save();
            passCanvas.clipRect([ex0, ey0, ex1, ey1], kit.ClipOp.Intersect, false);
          }
          try {
            passCanvas.clear(kit.TRANSPARENT);
            drawPassImage(passCanvas, sampleImg, copyPaint);
          } finally {
            if (dirtyRect) passCanvas.restore();
            sampleImg.delete();
          }
          const passImg = passSurfaces[i].makeImageSnapshot();
          passImages.push(passImg);
          passShaders.push(passImg.makeShaderOptions(kit.TileMode.Clamp, kit.TileMode.Clamp, kit.FilterMode.Nearest, kit.MipmapMode.None));
        }
        const resolveShader = resolveEffect.makeShaderWithChildren([frameHasGradient ? 0.75 : 0.0], passShaders);
        if (dirtyRect) {
          canvas.save();
          canvas.clipRect([dx0, dy0, dx1, dy1], kit.ClipOp.Intersect, false);
        } else {
          canvas.clear(kit.TRANSPARENT);
        }
        try {
          blitPaint.setShader(resolveShader);
          canvas.drawRect(dirtyRect ? [dx0, dy0, dx1, dy1] : [0, 0, pw, ph], blitPaint);
        } finally {
          if (dirtyRect) canvas.restore();
          blitPaint.setShader(null);
          resolveShader.delete();
        }
      } finally {
        for (const s of passShaders) s.delete();
        for (const im of passImages) im.delete();
      }
      return stats;
    }

    const isOpaqueBg = Boolean(background);
    if (dirtyRect) {
      canvas.save();
      canvas.clipRect([dx0, dy0, dx1, dy1], kit.ClipOp.Intersect, false);
    }
    if (!isOpaqueBg) {
      canvas.clear(kit.TRANSPARENT);
    }
    let stats;
    let frameHasGradient = false;
    try {
      for (let i = 0; i < offsets.length; i++) {
        const [ox, oy] = offsets[i];
        stats = this.drawVectorFrame(sampleCanvas, background, passOptions, sw, sh, false, interacting, ox, oy, pw, ph, sampleDirtyRect);
        if (stats?.hasGradient) frameHasGradient = true;
        const image = dirtyRect ? sampleSurface.makeImageSnapshot([sx0, sy0, sx1, sy1]) : sampleSurface.makeImageSnapshot();
        try {
          if (isOpaqueBg) {
            resolvePaint.setBlendMode(i === 0 ? kit.BlendMode.Src : kit.BlendMode.SrcOver);
            resolvePaint.setAlphaf(1 / (i + 1));
          } else {
            resolvePaint.setBlendMode(kit.BlendMode.Plus);
            resolvePaint.setAlphaf(1 / offsets.length);
          }
          drawPassImage(canvas, image, resolvePaint);
        } finally {
          image.delete();
        }
      }
    } finally {
      if (dirtyRect) canvas.restore();
    }
    if (stats) stats.hasGradient = frameHasGradient;
    return stats;
  }

  ensureAccumSurface(pw, ph) {
    if (this.accumSurfaceUnsupported) return null;
    if (this.accumSurface && this.accumSurfaceW === pw && this.accumSurfaceH === ph) {
      return this.accumSurface;
    }
    this.releaseAccumSurface();
    const {kit} = this.scene;
    if (!kit.ColorType?.RGBA_F16 || !kit.ColorFilter?.MakeMatrix || typeof this.surface?.makeSurface !== 'function') {
      return null;
    }
    try {
      const surf = this.surface.makeSurface({
        width: pw,
        height: ph,
        alphaType: kit.AlphaType.Premul,
        colorType: kit.ColorType.RGBA_F16,
        colorSpace: kit.ColorSpace.SRGB,
      });
      if (!surf) {
        this.accumSurfaceUnsupported = true;
        return null;
      }
      this.accumSurface = surf;
      this.accumSurfaceW = pw;
      this.accumSurfaceH = ph;
      return surf;
    } catch {
      this.releaseAccumSurface();
      this.accumSurfaceUnsupported = true;
      return null;
    }
  }

  releaseAccumSurface() {
    this.accumSurface?.dispose();
    this.accumSurface = null;
    this.accumSurfaceW = 0;
    this.accumSurfaceH = 0;
  }

  getResolveAlphaFilter(passCount) {
    let filter = this.resolveAlphaFilters.get(passCount);
    if (!filter) {
      filter = this.scene.kit.ColorFilter.MakeMatrix([
        1, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 1 / passCount, 0,
      ]);
      this.resolveAlphaFilters.set(passCount, filter);
    }
    return filter;
  }

  getRgssDitherEffect() {
    if (this.rgssDitherUnavailable) return null;
    if (this.rgssDitherEffect) return this.rgssDitherEffect;
    const {kit} = this.scene;
    if (typeof kit.RuntimeEffect?.Make !== 'function') {
      this.rgssDitherUnavailable = true;
      return null;
    }
    try {
      this.rgssDitherEffect = kit.RuntimeEffect.Make(RGSS_F16_DITHER_SKSL);
    } catch {
      this.rgssDitherEffect = null;
    }
    if (!this.rgssDitherEffect) this.rgssDitherUnavailable = true;
    return this.rgssDitherEffect;
  }

  ensureRgssPassSurfaces(pw, ph, count) {
    if (this.rgssPassSurfaces && this.rgssPassW === pw && this.rgssPassH === ph && this.rgssPassCount === count) {
      return this.rgssPassSurfaces;
    }
    this.releaseRgssPassSurfaces();
    const {kit} = this.scene;
    if (typeof this.surface?.makeSurface !== 'function') return null;
    const surfaces = [];
    try {
      for (let i = 0; i < count; i++) {
        const s = this.surface.makeSurface({
          width: pw,
          height: ph,
          alphaType: kit.AlphaType.Premul,
          colorType: kit.ColorType.RGBA_8888,
          colorSpace: kit.ColorSpace.SRGB,
        });
        if (!s) {
          for (const created of surfaces) created.dispose();
          return null;
        }
        surfaces.push(s);
      }
      this.rgssPassSurfaces = surfaces;
      this.rgssPassW = pw;
      this.rgssPassH = ph;
      this.rgssPassCount = count;
      return surfaces;
    } catch {
      for (const created of surfaces) created.dispose();
      return null;
    }
  }

  releaseRgssPassSurfaces() {
    if (this.rgssPassSurfaces) {
      for (const s of this.rgssPassSurfaces) s?.dispose();
    }
    this.rgssPassSurfaces = null;
    this.rgssPassW = 0;
    this.rgssPassH = 0;
    this.rgssPassCount = 0;
  }

  getRgssResolveEffect(passCount) {
    if (this.rgssResolveUnavailable || (passCount !== 2 && passCount !== 4)) return null;
    let effect = this.rgssResolveEffects.get(passCount);
    if (effect) return effect;
    const {kit} = this.scene;
    if (typeof kit.RuntimeEffect?.Make !== 'function') {
      this.rgssResolveUnavailable = true;
      return null;
    }
    try {
      effect = kit.RuntimeEffect.Make(passCount === 2 ? RGSS_RESOLVE2_SKSL : RGSS_RESOLVE4_SKSL);
    } catch {
      effect = null;
    }
    if (!effect) {
      this.rgssResolveUnavailable = true;
      return null;
    }
    this.rgssResolveEffects.set(passCount, effect);
    return effect;
  }

  ensureSampleSurface(sw, sh) {
    if (this.sampleSurface && this.sampleSurfaceW === sw && this.sampleSurfaceH === sh) {
      return this.sampleSurface;
    }
    this.releaseSampleSurface();
    const {kit} = this.scene;
    this.sampleSurface = this.surface.makeSurface({
      width: sw,
      height: sh,
      alphaType: kit.AlphaType.Premul,
      colorType: kit.ColorType.RGBA_8888,
      colorSpace: kit.ColorSpace.SRGB,
    });
    this.sampleSurfaceW = sw;
    this.sampleSurfaceH = sh;
    return this.sampleSurface;
  }

  releaseSampleSurface() {
    this.sampleSurface?.dispose();
    this.sampleSurface = null;
    this.sampleSurfaceW = 0;
    this.sampleSurfaceH = 0;
    this.releaseAccumSurface();
    this.releaseRgssPassSurfaces();
  }

  ensureDragStaticSurface(pw, ph) {
    if (this.dragStaticSurface && this.dragStaticW === pw && this.dragStaticH === ph) {
      return this.dragStaticSurface;
    }
    this.releaseDragStaticCache();
    const {kit} = this.scene;
    this.dragStaticSurface = this.surface.makeSurface({
      width: pw,
      height: ph,
      alphaType: kit.AlphaType.Premul,
      colorType: kit.ColorType.RGBA_8888,
      colorSpace: kit.ColorSpace.SRGB,
    });
    this.dragStaticW = pw;
    this.dragStaticH = ph;
    return this.dragStaticSurface;
  }

  releaseDragStaticCache() {
    this.dragStaticImage?.delete();
    this.dragStaticImage = null;
    this.dragStaticSurface?.dispose();
    this.dragStaticSurface = null;
    this.dragStaticKey = null;
    this.dragStaticDoc = null;
    this.dragStaticIds = null;
    this.dragStaticFrames = null;
    this.dragMovingObjects = null;
    this.dragMovingLocalBB = null;
    this.dragStaticSiblingBB = null;
    this.dragPrevDirtyRect = null;
    this.dragStaticW = 0;
    this.dragStaticH = 0;
  }

  isHeavyPanScene() {
    const objs = this.doc?.objects;
    if (!objs || !objs.length) return false;
    if (objs.length >= 64) return true;
    let nodes = 0;
    for (let i = 0; i < objs.length; i++) {
      const subs = objs[i]?.subs;
      if (!subs) continue;
      for (let s = 0; s < subs.length; s++) {
        const ns = subs[s]?.nodes;
        if (ns) nodes += ns.length;
        if (nodes >= 1000) return true;
      }
    }
    return false;
  }

  canUsePanCache(pw, ph) {
    return Boolean(typeof this.surface?.makeSurface === 'function' && pw * ph * 4 <= 36 * 1024 * 1024);
  }

  ensurePanCacheSurface(pw, ph) {
    if (this.panCacheSurface && this.panCacheW === pw && this.panCacheH === ph) {
      return this.panCacheSurface;
    }
    this.releasePanCache();
    const {kit} = this.scene;
    if (typeof this.surface?.makeSurface !== 'function') return null;
    try {
      const surf = this.surface.makeSurface({
        width: pw,
        height: ph,
        alphaType: kit.AlphaType.Premul,
        colorType: kit.ColorType.RGBA_8888,
        colorSpace: kit.ColorSpace.SRGB,
      });
      if (!surf) return null;
      this.panCacheSurface = surf;
      this.panCacheW = pw;
      this.panCacheH = ph;
      return surf;
    } catch {
      this.releasePanCache();
      return null;
    }
  }

  ensurePanScratchSurface(pw, ph) {
    if (this.panCacheScratchSurface && this.panCacheW === pw && this.panCacheH === ph) {
      return this.panCacheScratchSurface;
    }
    this.panCacheScratchSurface?.dispose();
    this.panCacheScratchSurface = null;
    const {kit} = this.scene;
    if (typeof this.surface?.makeSurface !== 'function') return null;
    try {
      const surf = this.surface.makeSurface({
        width: pw,
        height: ph,
        alphaType: kit.AlphaType.Premul,
        colorType: kit.ColorType.RGBA_8888,
        colorSpace: kit.ColorSpace.SRGB,
      });
      if (!surf) return null;
      this.panCacheScratchSurface = surf;
      return surf;
    } catch {
      this.panCacheScratchSurface?.dispose();
      this.panCacheScratchSurface = null;
      return null;
    }
  }

  ensureCpuPanScrollBuf(bytes) {
    if (this.cpuPanScrollBuf && this.cpuPanScrollBufBytes >= bytes) {
      return this.cpuPanScrollBuf;
    }
    this.releaseCpuPanScrollBuf();
    const {kit} = this.scene;
    if (typeof kit.Malloc !== 'function') return null;
    try {
      this.cpuPanScrollBuf = kit.Malloc(Uint8Array, bytes);
      this.cpuPanScrollBufBytes = bytes;
      return this.cpuPanScrollBuf;
    } catch {
      this.cpuPanScrollBuf = null;
      this.cpuPanScrollBufBytes = 0;
      return null;
    }
  }

  releaseCpuPanScrollBuf() {
    if (this.cpuPanScrollBuf && typeof this.scene?.kit?.Free === 'function') {
      try { this.scene.kit.Free(this.cpuPanScrollBuf); } catch {}
    }
    this.cpuPanScrollBuf = null;
    this.cpuPanScrollBufBytes = 0;
  }

  releasePanCache() {
    this.releaseCpuPanScrollBuf();
    this.panCacheSurface?.dispose();
    this.panCacheSurface = null;
    this.panCacheScratchSurface?.dispose();
    this.panCacheScratchSurface = null;
    this.panCacheW = 0;
    this.panCacheH = 0;
    this.panCacheKey = null;
    this.panCacheDoc = null;
    this.panCacheFrames = null;
    this.panCachePanX = 0;
    this.panCachePanY = 0;
    this.panCacheQuality = null;
    this.panCacheHasGradient = false;
    this.panLastStats = null;
    this._cpuSurfaceCacheValid = false;
    this._onScreenPresentedSig = null;
  }

  drawGridOnMain(canvas, pw, ph) {
    if (!this.showGrid) return;
    const {scene, camera} = this;
    const {width, height} = camera;
    const saveCount = canvas.save();
    try {
      canvas.scale(pw / width, ph / height);
      this.drawGrid(camera, (accent, lines) => scene.withPaint(accent, null, 0.14, 0, 0, paint => {
        lines((x, y, w, h) => canvas.drawRect([x, y, x + w, y + h], paint));
      }));
    } finally {
      canvas.restoreToCount(saveCount);
    }
  }

  presentPanCache(canvas, pw, ph, background, remX = 0, remY = 0) {
    const {scene} = this;
    const {kit} = scene;
    if (!this.panCopyPaint) this.panCopyPaint = new kit.Paint();
    const subpixel = Math.abs(remX) >= 1e-3 || Math.abs(remY) >= 1e-3;
    if (this.showGrid || subpixel) {
      canvas.clear(background ? scene.color(background) : kit.TRANSPARENT);
    }
    if (this.showGrid) {
      this.drawGridOnMain(canvas, pw, ph);
    }
    this.panCopyPaint.setBlendMode(this.showGrid ? kit.BlendMode.SrcOver : kit.BlendMode.Src);
    const snapImg = this.panCacheSurface.makeImageSnapshot();
    try {
      if (!subpixel) {
        canvas.drawImage(snapImg, 0, 0, this.panCopyPaint);
      } else {
        canvas.drawImageRectOptions(snapImg, [0, 0, pw, ph], [remX, remY, pw + remX, ph + remY],
          kit.FilterMode.Linear, kit.MipmapMode.None, this.panCopyPaint);
      }
    } finally {
      snapImg.delete();
    }
  }

  queryVisibleForPixelRect(pixelRect, pw, ph, extraWorldPad = 0) {
    const {zoom, panX, panY, width, height} = this.camera;
    const sx = pw / width;
    const sy = ph / height;
    const rx0 = pixelRect ? pixelRect[0] : 0;
    const ry0 = pixelRect ? pixelRect[1] : 0;
    const rx1 = pixelRect ? pixelRect[2] : pw;
    const ry1 = pixelRect ? pixelRect[3] : ph;
    const worldX0 = ((rx0 / sx) - panX) / zoom - extraWorldPad;
    const worldY0 = ((ry0 / sy) - panY) / zoom - extraWorldPad;
    const worldX1 = ((rx1 / sx) - panX) / zoom + extraWorldPad;
    const worldY1 = ((ry1 / sy) - panY) / zoom + extraWorldPad;
    const worldRect = {
      x: worldX0,
      y: worldY0,
      width: Math.max(0, worldX1 - worldX0),
      height: Math.max(0, worldY1 - worldY0),
    };
    const preview = this.textPreview;
    const viewQuery = {
      x: -panX / zoom,
      y: -panY / zoom,
      width: width / zoom,
      height: height / zoom,
      zoom,
      cullRect: worldRect,
    };
    const visible = !this._spatialIndexDirty && this.spatialIndex
      ? visibleSceneObjects(this.spatialIndex, viewQuery, this.dragOffset, this.doc.objects)
      : null;
    const visibleDraft = preview && visible?.some(object => object.id === preview.id);
    const objects = preview
      ? (visibleDraft ? visible : this.doc.objects).map(object => object.id === preview.id ? preview : object)
      : visible || this.doc.objects;
    return { objects, worldRect, hasTextPreview: Boolean(preview) };
  }

  releaseGpuContext() {
    this.gpuContext?.delete();
    this.gpuContext = null;
    if (this.gpuContextHandle > 0) this.scene.kit.deleteContext(this.gpuContextHandle);
    this.gpuContextHandle = 0;
  }

  drawVectorFrame(canvas, background, options, pixelWidth, pixelHeight, smoothEdges, interacting = false, offsetX = 0, offsetY = 0, outPw = pixelWidth, outPh = pixelHeight, dirtyRect = null) {
    const {scene, camera} = this;
    const {kit} = scene;
    const {zoom, panX, panY, width, height} = camera;
    const saveCount = canvas.save();
    let stats;
    try {
      if (dirtyRect) {
        canvas.clipRect(dirtyRect, kit.ClipOp.Intersect, false);
      }
      if (!options?.skipBackground) {
        canvas.clear(background ? scene.color(background) : kit.TRANSPARENT);
      }
      canvas.scale(pixelWidth / width, pixelHeight / height);
      if (!options?.skipGrid) {
        this.drawGrid(camera, (accent, lines) => scene.withPaint(accent, null, 0.14, 0, 0, paint => {
          lines((x, y, w, h) => canvas.drawRect([x, y, x + w, y + h], paint));
        }));
      }
      canvas.save();
      if (offsetX || offsetY) canvas.translate(offsetX * (width / outPw), offsetY * (height / outPh));
      canvas.scale(zoom, zoom);
      const view = {x: -panX / zoom, y: -panY / zoom, width: width / zoom, height: height / zoom,
        zoom, smoothEdges, interacting, cullRect: options?.cullRect || null};
      let objects;
      let hasTextPreview = Boolean(this.textPreview);
      if (options?.objectsOverride) {
        objects = options.objectsOverride;
      } else if (options?.prequeriedObjects) {
        objects = options.prequeriedObjects;
      } else if (dirtyRect) {
        const q = this.queryVisibleForPixelRect(dirtyRect, pixelWidth, pixelHeight, 1 / (zoom || 1));
        objects = q.objects;
        view.cullRect = q.worldRect;
        hasTextPreview = q.hasTextPreview;
      } else {
        const preview = this.textPreview;
        const visible = !this._spatialIndexDirty && this.spatialIndex
          ? visibleSceneObjects(this.spatialIndex, view, this.dragOffset, this.doc.objects) : null;
        // A draft can reach the viewport even if its original bounds were culled.
        const visibleDraft = preview && visible?.some(object => object.id === preview.id);
        objects = preview
          ? (visibleDraft ? visible : this.doc.objects).map(object => object.id === preview.id ? preview : object)
          : visible || this.doc.objects;
      }
      const sceneOpts = hasTextPreview && !options?.hasTextPreview
        ? { ...options, hasTextPreview: true }
        : options;
      stats = scene.drawScene(canvas, objects, view, sceneOpts);
      canvas.restore();
    } finally {
      canvas.restoreToCount(saveCount);
    }
    return stats;
  }

  queryHit(worldPoint, tolerancePx = 6) {
    if (!this.doc || !this.doc.objects) return null;
    const tol = tolerancePx / (this.camera.zoom || 1);
    const sIdx = !this._spatialIndexDirty && this.spatialIndex ? this.spatialIndex : (this.spatialIndex = VE.getDocSpatialIndex(this.doc.objects), this._spatialIndexDirty = false, this.spatialIndex);
    const frameRectMap = this._getFrameRectMap();
    const cands = sIdx ? sIdx.queryObjectsInRect(worldPoint.x - tol, worldPoint.y - tol, worldPoint.x + tol, worldPoint.y + tol) : [];
    for (let i = cands.length - 1; i >= 0; i--) {
      const o = cands[i].o;
      if (VE.hitTestObject(o, worldPoint, tol, {
        clipFrames: this.clipFrames,
        frameRectMap
      })) return o;
    }
    return null;
  }
  queryMarquee(worldRect, mode = 'intersect') {
    if (!this.doc || !this.doc.objects) return [];
    const [x0, y0, x1, y1] = worldRect;
    const sIdx = !this._spatialIndexDirty && this.spatialIndex ? this.spatialIndex : (this.spatialIndex = VE.getDocSpatialIndex(this.doc.objects), this._spatialIndexDirty = false, this.spatialIndex);
    const cands = sIdx ? sIdx.queryObjectsInRect(x0, y0, x1, y1) : [];
    return cands.filter(e => {
      const o = e.o;
      if (!VE.isHittable(o)) return false;
      const bb = e.bb;
      return mode === 'contain' ? bb[0] >= x0 && bb[2] <= x1 && bb[1] >= y0 && bb[3] <= y1 : bb[0] <= x1 && bb[2] >= x0 && bb[1] <= y1 && bb[3] >= y0;
    }).map(e => e.o);
  }


  dispose() {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.gpuCanvasEl?.removeEventListener?.('webglcontextlost', this.onGpuContextLost);
    this.resolvePaint?.delete();
    this.resolvePaint = null;
    this.accumBlitPaint?.delete();
    this.accumBlitPaint = null;
    this.rgssCopyPaint?.delete();
    this.rgssCopyPaint = null;
    for (const filter of this.resolveAlphaFilters.values()) filter?.delete();
    this.resolveAlphaFilters.clear();
    this.rgssDitherEffect?.delete();
    this.rgssDitherEffect = null;
    for (const effect of this.rgssResolveEffects.values()) effect?.delete();
    this.rgssResolveEffects.clear();
    this.dragCopyPaint?.delete();
    this.dragCopyPaint = null;
    this.panCopyPaint?.delete();
    this.panCopyPaint = null;
    this.releaseSampleSurface();
    this.releaseDragStaticCache();
    this.releasePanCache();
    this.surface?.dispose();
    this.releaseGpuContext();
    this.scene?.dispose();
    this.surface = this.scene = null;
  }
}

export { SceneRenderer, calcGridStep };
export default SceneRenderer;
