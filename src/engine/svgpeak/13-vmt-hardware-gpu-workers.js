/* =====================================================================
 * JS Module 13: VMT Engine Part 9 — Hardware Manager, TypedArray MemPool, WebGL2 GPGPU Shaders & Multi-Thread WorkerPool
 * ===================================================================== */
/* =====================================================================
   MODUL HARDWARE, ALOKASI RAM, MULTI-THREAD (WEB WORKER POOL) & VGA (WebGL2)
   ===================================================================== */
const HW_LS_KEY = 'svgpeak-hw-cfg-v1';
const HW_LIMITS = (() => {
  const logicalCores = clamp((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4, 1, 64);
  const devMemGb = clamp((typeof navigator !== 'undefined' && navigator.deviceMemory) || 8, 1, 64);
  let gpu = {
    available: false,
    webgl2: false,
    webgpu: false,
    colorBufferFloat: false,
    floatLinear: false,
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    vendor: 'CPU Fallback',
    renderer: 'Tidak terdeteksi',
    maxTexSize: 4096,
    maxDrawBuffers: 1,
    maxColorAttachments: 1
  };
  try {
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      const gl = cv.getContext('webgl2', { powerPreference: 'high-performance' }) || cv.getContext('webgl', { powerPreference: 'high-performance' });
      if (gl) {
        const isWgl2 = typeof WebGL2RenderingContext !== 'undefined' && (gl instanceof WebGL2RenderingContext);
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const cbf = isWgl2 ? !!gl.getExtension('EXT_color_buffer_float') : !!gl.getExtension('WEBGL_color_buffer_float');
        const fltLin = !!gl.getExtension('OES_texture_float_linear');
        const vendor = (dbg && gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) || gl.getParameter(gl.VENDOR) || 'GPU Vendor';
        const renderer = (dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || (isWgl2 ? 'WebGL 2.0 VGA' : 'WebGL 1.0 VGA');
        const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
        const maxDrawBuffers = isWgl2 ? (gl.getParameter(gl.MAX_DRAW_BUFFERS) || 4) : 1;
        const maxColorAttachments = isWgl2 ? (gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) || 4) : 1;
        gpu = {
          available: true,
          webgl2: isWgl2,
          webgpu: typeof navigator !== 'undefined' && !!navigator.gpu,
          colorBufferFloat: cbf,
          floatLinear: fltLin,
          offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
          vendor: String(vendor),
          renderer: String(renderer),
          maxTexSize,
          maxDrawBuffers,
          maxColorAttachments
        };
        /* Lepaskan konteks probe sementara agar tidak menahan resource GPU saat halaman idle */
        const loseExt = gl.getExtension('WEBGL_lose_context');
        if (loseExt) loseExt.loseContext();
      }
    }
  } catch (e) {}
  return { logicalCores, devMemGb, maxRamMb: Math.max(8192, devMemGb * 1024 * 2), gpu };
})();

const DEFAULT_HW_CFG = {
  ramMode: 'auto',
  ramMb: clamp(Math.round(HW_LIMITS.devMemGb * 1024 * 0.5), 512, 8192),
  multiThread: true,
  cpuCores: HW_LIMITS.logicalCores,
  threadPriority: 'turbo',
  useGpu: HW_LIMITS.gpu.available,
  gpuPower: 'high-performance',
  gpuPipeline: 'full'
};

let _hwCfg = (() => {
  try {
    const raw = localStorage.getItem(HW_LS_KEY);
    if (!raw) return { ...DEFAULT_HW_CFG };
    const p = JSON.parse(raw);
    return {
      ...DEFAULT_HW_CFG,
      ...p,
      ramMb: clamp(Number(p.ramMb) || DEFAULT_HW_CFG.ramMb, 128, 16384),
      cpuCores: clamp(Number(p.cpuCores) || DEFAULT_HW_CFG.cpuCores, 1, 64),
    };
  } catch (e) {
    return { ...DEFAULT_HW_CFG };
  }
})();

const _hwListeners = new Set();
function getHwConfig() { return _hwCfg; }
function getHwInfo() { return HW_LIMITS; }
function setHwConfig(patch) {
  const next = { ..._hwCfg, ...(typeof patch === 'function' ? patch(_hwCfg) : patch) };
  if (next.ramMode === 'auto') {
    next.ramMb = clamp(Math.round(HW_LIMITS.devMemGb * 1024 * 0.5), 512, 8192);
  } else {
    next.ramMb = clamp(Math.round(Number(next.ramMb) || 1024), 128, 16384);
  }
  next.cpuCores = clamp(Math.round(Number(next.cpuCores) || 1), 1, 64);
  if (!next.multiThread) next.cpuCores = 1;
  _hwCfg = next;
  try { localStorage.setItem(HW_LS_KEY, JSON.stringify(_hwCfg)); } catch (e) {}
  _hwListeners.forEach(fn => { try { fn(_hwCfg); } catch (e) {} });
  return _hwCfg;
}
function resetHwConfig() {
  return setHwConfig({ ...DEFAULT_HW_CFG, cpuCores: HW_LIMITS.logicalCores });
}
function subscribeHwConfig(fn) {
  _hwListeners.add(fn);
  return () => _hwListeners.delete(fn);
}

/* ---- 1. Memory Pool & RAM Allocation Manager (MemPool) ---- */
const MemPool = (() => {
  let currentBytes = 0;
  let peakBytes = 0;
  let reusedBuffers = 0;
  let totalAllocations = 0;
  const slabs = new Map();

  const budgetBytes = () => (_hwCfg.ramMb || 1024) * 1024 * 1024;
  const jsHeapMb = () => {
    try {
      if (typeof performance !== 'undefined' && performance.memory && performance.memory.usedJSHeapSize) {
        return +(performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      }
    } catch (e) {}
    return null;
  };

  function beginSession() {
    currentBytes = 0;
    peakBytes = 0;
    reusedBuffers = 0;
    totalAllocations = 0;
  }

  function trackAlloc(bytes) {
    totalAllocations++;
    currentBytes += bytes;
    if (currentBytes > peakBytes) peakBytes = currentBytes;
    if (currentBytes > budgetBytes() * 0.85) {
      slabs.clear();
    }
  }

  function acquire(Ctor, length) {
    const key = Ctor.name + ':' + length;
    const pool = slabs.get(key);
    const bytes = length * (Ctor.BYTES_PER_ELEMENT || 1);
    if (pool && pool.length > 0) {
      reusedBuffers++;
      const arr = pool.pop();
      arr.fill(0);
      trackAlloc(bytes);
      return arr;
    }
    const arr = new Ctor(length);
    trackAlloc(bytes);
    return arr;
  }

  function release(arr) {
    if (!arr || !arr.buffer) return;
    const bytes = arr.byteLength || 0;
    currentBytes = Math.max(0, currentBytes - bytes);
    if (currentBytes < budgetBytes() * 0.70) {
      const key = arr.constructor.name + ':' + arr.length;
      let pool = slabs.get(key);
      if (!pool) { pool = []; slabs.set(key, pool); }
      if (pool.length < 12) pool.push(arr);
    }
  }

  function flush() {
    slabs.clear();
    currentBytes = 0;
  }

  /* Hitung batas resolusi kerja & sampel warna berdasarkan RAM yang dialokasikan */
  function computeRamCaps(requestedMaxDim) {
    const ram = _hwCfg.ramMb || 1024;
    const ramScale = ram <= 256 ? 0.65 : ram <= 512 ? 0.85 : ram <= 1024 ? 1.0 : ram <= 2048 ? 1.28 : ram <= 4096 ? 1.48 : 1.65;
    const maxDimCap = ram <= 256 ? 560 : ram <= 512 ? 1024 : 2560;
    const effMaxDim = requestedMaxDim ? clamp(Math.round(requestedMaxDim), 160, maxDimCap) : clamp(Math.round(840 * Math.min(1.48, ramScale)), 160, maxDimCap);
    const maxSamples = clamp(Math.round(18000 * ramScale), 10000, 64000);
    const stripRows = clamp(Math.floor((ram * 1024 * 64) / Math.max(256, effMaxDim * 16)), 16, 512);
    return { effMaxDim, maxSamples, stripRows, ramMb: ram, budgetBytes: ram * 1024 * 1024 };
  }

  function getStats() {
    const heap = jsHeapMb();
    const peakMb = +(Math.max(peakBytes / (1024 * 1024), (heap || 0) * 0.35)).toFixed(1);
    return {
      allocatedMb: _hwCfg.ramMb,
      peakMb: Math.max(4.2, peakMb),
      currentMb: +(currentBytes / (1024 * 1024)).toFixed(1),
      heapMb: heap,
      reusedBuffers,
      totalAllocations
    };
  }

  return { beginSession, acquire, release, flush, computeRamCaps, getStats, trackAlloc };
})();

/* ---- 2. TAHAP 1 INFRASTRUKTUR GPU: GPUMemPool & GpuPipelineEngine (Zero-Copy VRAM) ---- */
const GPUMemPool = (() => {
  let activeW = 0;
  let activeH = 0;
  let currentVramBytes = 0;
  let peakVramBytes = 0;
  let reusedCount = 0;
  let allocCount = 0;
  let contextLostCount = 0;
  const slots = new Map();

  /* Spesifikasi 9 Slot Tekstur/Buffer Menetap (Persistent VRAM Slots) untuk Pipeline Tahap 1-5 */
  const SLOT_SPECS = {
    texRawRGBA:   { bpp: 4,  scale: 'pix', desc: 'RGBA8Unorm · Citra Asli Pasca Alpha-Flatten' },
    texFltRGBA:   { bpp: 4,  scale: 'pix', desc: 'RGBA8Unorm · Citra Hasil Bilateral Corner-Preserving' },
    texLabGrad:   { bpp: 16, scale: 'pix', desc: 'RGBA32F · Kanal (L*/thinLab, a*/nearFlt, b*/nearRaw, luma/mask)' },
    texEdgeField: { bpp: 16, scale: 'pix', desc: 'RGBA32F · DiZenzo Scharr 2D (gx, gy, mag, lum)' },
    texTensor:    { bpp: 16, scale: 'pix', desc: 'RGBA32F · Structure Tensor 3x3 (nx, ny, coh, corner)' },
    texFlanks:    { bpp: 16, scale: 'pix', desc: 'RGBA32F · Normal-Ray Unmixing (flankA, flankB, alpha, perp)' },
    texLabelsA:   { bpp: 16, scale: 'pix', desc: 'RGBA32F · Ping-Pong Label Map A (label, mask, detailProt, anchor)' },
    texLabelsB:   { bpp: 16, scale: 'pix', desc: 'RGBA32F · Ping-Pong Label Map B (label, mask, detailProt, anchor)' },
    texPalLut:    { bpp: 16, scale: 'lut', desc: 'RGBA32F · Tabel Pasangan Palet (palDist2, palIsMidBlend, palRGB)' },
    bufVerticesA: { bpp: 16, scale: 'vtx', desc: 'RGBA32F · Kisi Verteks Sub-Piksel A (vx, vy, val, pin)' },
    bufVerticesB: { bpp: 16, scale: 'vtx', desc: 'RGBA32F · Kisi Verteks Sub-Piksel B (vx, vy, val, pin)' }
  };

  function estimateRequiredVramBytes(w, h) {
    const pix = w * h;
    const vtx = (w + 1) * (h + 1);
    let total = 0;
    Object.values(SLOT_SPECS).forEach(sp => {
      if (sp.scale === 'lut') total += 64 * 64 * 64 * sp.bpp;
      else total += (sp.scale === 'vtx' ? vtx : pix) * sp.bpp;
    });
    return total;
  }

  function vramBudgetBytes() {
    const ramMb = (_hwCfg && _hwCfg.ramMb) || 1024;
    return Math.min(ramMb * 1024 * 1024 * 0.45, 768 * 1024 * 1024);
  }

  function releaseAll(gl) {
    slots.forEach(entry => {
      try {
        if (gl && entry.tex) gl.deleteTexture(entry.tex);
        if (gl && entry.fbo) gl.deleteFramebuffer(entry.fbo);
      } catch (e) {}
    });
    slots.clear();
    currentVramBytes = 0;
    activeW = 0;
    activeH = 0;
  }

  function allocateSlot(gl, name, w, h, floatExtAvailable) {
    const spec = SLOT_SPECS[name] || { bpp: 4, scale: 'pix', desc: name };
    const sw = spec.scale === 'vtx' ? (w + 1) : w;
    const sh = spec.scale === 'vtx' ? (h + 1) : h;
    const isFloatSlot = spec.bpp === 16 && floatExtAvailable;
    const internalFormat = isFloatSlot ? gl.RGBA32F : gl.RGBA8;
    const format = gl.RGBA;
    const type = isFloatSlot ? gl.FLOAT : gl.UNSIGNED_BYTE;
    const byteSize = sw * sh * (isFloatSlot ? 16 : 4);

    const existing = slots.get(name);
    if (existing && existing.w === sw && existing.h === sh && existing.isFloat === isFloatSlot && existing.tex) {
      reusedCount++;
      return existing;
    }
    if (existing) {
      try {
        if (existing.tex) gl.deleteTexture(existing.tex);
        if (existing.fbo) gl.deleteFramebuffer(existing.fbo);
      } catch (e) {}
      currentVramBytes = Math.max(0, currentVramBytes - (existing.byteSize || 0));
      slots.delete(name);
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, sw, sh, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      if (isFloatSlot) {
        return allocateSlot(gl, name, w, h, false);
      }
      return null;
    }

    allocCount++;
    currentVramBytes += byteSize;
    if (currentVramBytes > peakVramBytes) peakVramBytes = currentVramBytes;
    MemPool.trackAlloc(byteSize);

    const entry = {
      name, tex, fbo, w: sw, h: sh,
      internalFormat, format, type,
      isFloat: isFloatSlot,
      byteSize,
      desc: spec.desc
    };
    slots.set(name, entry);
    return entry;
  }

  function ensureWorkspace(gl, w, h, floatExtAvailable, slotNames) {
    const reqBytes = estimateRequiredVramBytes(w, h);
    if (reqBytes > vramBudgetBytes() * 1.35) {
      releaseAll(gl);
    }
    if (activeW !== w || activeH !== h) {
      releaseAll(gl);
      activeW = w;
      activeH = h;
    }
    const names = slotNames || Object.keys(SLOT_SPECS);
    const allocated = {};
    for (const nm of names) {
      const s = allocateSlot(gl, nm, w, h, floatExtAvailable);
      if (!s) return null;
      allocated[nm] = s;
    }
    return allocated;
  }

  function getSlot(name) {
    return slots.get(name) || null;
  }

  function notifyContextLost() {
    contextLostCount++;
    slots.clear();
    currentVramBytes = 0;
    activeW = 0;
    activeH = 0;
  }

  function getStats() {
    return {
      activeDim: activeW && activeH ? `${activeW}×${activeH}` : 'Idle',
      activeSlots: slots.size,
      totalSlotSpecs: Object.keys(SLOT_SPECS).length,
      currentVramMb: +(currentVramBytes / (1024 * 1024)).toFixed(2),
      peakVramMb: +(peakVramBytes / (1024 * 1024)).toFixed(2),
      vramBudgetMb: +(vramBudgetBytes() / (1024 * 1024)).toFixed(0),
      reusedCount,
      allocCount,
      contextLostCount,
      slotList: Array.from(slots.values()).map(s => ({
        name: s.name,
        dim: `${s.w}×${s.h}`,
        fmt: s.isFloat ? 'RGBA32F' : 'RGBA8',
        mb: +(s.byteSize / (1024 * 1024)).toFixed(2)
      }))
    };
  }

  return {
    SLOT_SPECS,
    estimateRequiredVramBytes,
    vramBudgetBytes,
    ensureWorkspace,
    allocateSlot,
    getSlot,
    releaseAll,
    notifyContextLost,
    getStats
  };
})();

const GpuAccelerator = (() => {
  let ctxCache = null;
  let webgpuState = { checked: false, supported: false, adapterName: null, device: null };
  let lastParityReport = null;

  /* Inisialisasi asinkron WebGPU Adapter/Device bila browser mendukung navigator.gpu */
  async function initWebGPUAsync() {
    if (webgpuState.checked && webgpuState.device) return webgpuState;
    webgpuState.checked = true;
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: (_hwCfg && _hwCfg.gpuPower) || 'high-performance'
        });
        if (adapter) {
          const info = adapter.info || {};
          const device = await adapter.requestDevice();
          webgpuState.supported = true;
          webgpuState.adapterName = info.description || info.vendor || 'WebGPU Hardware Adapter';
          webgpuState.device = device;
          device.lost.then(() => {
            webgpuState.device = null;
            webgpuState.checked = false;
          });
        }
      }
    } catch (e) {
      webgpuState.supported = false;
    }
    return webgpuState;
  }

  function createSurface(w, h) {
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(w, h);
      }
    } catch (e) {}
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  }

  function getGl(powerPref) {
    const pref = powerPref || (_hwCfg && _hwCfg.gpuPower) || 'high-performance';
    if (ctxCache && ctxCache.pref === pref && ctxCache.gl && !ctxCache.gl.isContextLost()) {
      return ctxCache;
    }
    try {
      const cv = createSurface(64, 64);
      const gl = cv.getContext('webgl2', {
        powerPreference: pref,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
      });
      if (!gl) return null;
      const extFloat = !!gl.getExtension('EXT_color_buffer_float');
      const extFloatLinear = !!gl.getExtension('OES_texture_float_linear');

      /* Pasang Vertex Array Object (VAO) Full-Screen Quad sekali untuk seluruh pass */
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      if (cv.addEventListener) {
        cv.addEventListener('webglcontextlost', e => {
          e.preventDefault();
          GPUMemPool.notifyContextLost();
          ctxCache = null;
        }, false);
      }

      ctxCache = { gl, cv, pref, extFloat, extFloatLinear, vao, quadBuf, progs: {} };
      return ctxCache;
    } catch (e) {
      return null;
    }
  }

  function compileProgram(gl, vsSrc, fsSrc) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.bindAttribLocation(prog, 0, 'a_pos');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  const VS_QUAD = `#version 300 es
  layout(location = 0) in vec2 a_pos;
  out vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }`;

  /* Kernel GLSL 1: Konversi Eksak sRGB (0..255) -> CIE L*a*b* (D65, 2° Observer) + Luma di Kanal A */
  const FS_RGB_TO_LAB = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  in vec2 v_uv;
  out vec4 outLab;

  float srgbLin(float c) {
    return (c <= 0.04045) ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4);
  }
  float labF(float t) {
    const float eps = 216.0 / 24389.0;
    const float kap = 24389.0 / 27.0;
    return (t > eps) ? pow(t, 1.0 / 3.0) : ((kap * t + 16.0) / 116.0);
  }
  void main() {
    vec4 px = texture(u_tex, v_uv);
    float R = srgbLin(px.r);
    float G = srgbLin(px.g);
    float B = srgbLin(px.b);
    float X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    float Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    float Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    float fx = labF(X);
    float fy = labF(Y);
    float fz = labF(Z);
    float L = 116.0 * fy - 16.0;
    float a = 500.0 * (fx - fy);
    float b = 200.0 * (fy - fz);
    float luma = dot(px.rgb * 255.0, vec3(0.299, 0.587, 0.114));
    outLab = vec4(L, a, b, luma);
  }`;

  /* Kernel GLSL 2: Bilateral Filter 5x5 Edge- & Corner-Preserving (identik dengan CPU bilateralPreFilter:
     memiliki Wedge Aperture Guard 8-arah + Contiguous-4 Bitmask Guard + 1D Valley/Crease Guard) */
  const FS_BILATERAL = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  uniform float u_inv2Sp;
  uniform float u_inv2Col;
  uniform float u_wedgeThr;
  uniform int u_radius;
  in vec2 v_uv;
  out vec4 outColor;

  float cdist2(vec3 c1, vec3 c2) {
    vec3 d = (c1 - c2) * 255.0;
    float rm = (c1.r + c2.r) * 127.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 center = texelFetch(u_tex, p0, 0);
    if (center.a < 0.05) { outColor = center; return; }

    /* 1. Wedge Aperture Guard 8-arah & Contiguous-4 Guard (melindungi sudut lancip <= 135 derajat) */
    const ivec2 RING[8] = ivec2[8](
      ivec2(1, 0), ivec2(1, 1), ivec2(0, 1), ivec2(-1, 1),
      ivec2(-1, 0), ivec2(-1, -1), ivec2(0, -1), ivec2(1, -1)
    );
    int simN = 0;
    int ringBits = 0;
    for (int k = 0; k < 8; k++) {
      ivec2 np = clamp(p0 + RING[k], ivec2(0), sz - ivec2(1));
      vec4 nb = texelFetch(u_tex, np, 0);
      if (nb.a >= 0.05 && cdist2(center.rgb, nb.rgb) < u_wedgeThr) {
        simN++;
        ringBits |= (1 << k);
      }
    }
    if (simN <= 3) { outColor = center; return; }
    if (simN == 4) {
      int dbl = ringBits | (ringBits << 8);
      for (int k = 0; k < 8; k++) {
        if (((dbl >> k) & 15) == 15) { outColor = center; return; }
      }
    }

    /* 2. Guard Lembah Garis (1D Valley/Crease) & Punggung Detail 1-2px (Garis Jari, Bulu Mata, Helai Rambut) */
    if (p0.x >= 2 && p0.x < sz.x - 2 && p0.y >= 2 && p0.y < sz.y - 2) {
      float l0 = dot(center.rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
      const ivec2 DIRS[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
      for (int k = 0; k < 4; k++) {
        ivec2 d = DIRS[k];
        float lA1 = dot(texelFetch(u_tex, p0 - d, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lB1 = dot(texelFetch(u_tex, p0 + d, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lA2 = dot(texelFetch(u_tex, p0 - d * 2, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lB2 = dot(texelFetch(u_tex, p0 + d * 2, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lMaxA = max(lA1, lA2);
        float lMaxB = max(lB1, lB2);
        float lMinA = min(lA1, lA2);
        float lMinB = min(lB1, lB2);
        if ((l0 < lMaxA - 3.8 && l0 < lMaxB - 3.8) || (l0 > lMinA + 5.5 && l0 > lMinB + 5.5)) {
          outColor = center;
          return;
        }
      }
    }

    float localInv2Col = (simN <= 5) ? (u_inv2Col * 2.8) : u_inv2Col;
    vec3 sumRgb = vec3(0.0);
    float sumW = 0.0;
    int R = clamp(u_radius, 1, 3);
    for (int dy = -3; dy <= 3; dy++) {
      if (dy < -R || dy > R) continue;
      for (int dx = -3; dx <= 3; dx++) {
        if (dx < -R || dx > R) continue;
        ivec2 np = clamp(p0 + ivec2(dx, dy), ivec2(0), sz - ivec2(1));
        vec4 s = texelFetch(u_tex, np, 0);
        if (s.a < 0.05) continue;
        float d2 = float(dx * dx + dy * dy);
        float wSp = exp(-d2 * u_inv2Sp);
        float wCol = exp(-cdist2(center.rgb, s.rgb) * localInv2Col);
        float w = wSp * wCol;
        sumRgb += s.rgb * w;
        sumW += w;
      }
    }
    vec3 finalRgb = sumW > 1e-6 ? floor((sumRgb / sumW) * 255.0 + 0.5) / 255.0 : center.rgb;
    outColor = vec4(finalRgb, center.a);
  }`;

  /* Kernel GLSL 3 (Tahap 2): Alpha Defringing & Inward Opaque Foreground Propagation (7x7)
     Identik 100% dengan CPU flattenAlpha(work, mode, customHex) */
  const FS_ALPHA_FLATTEN = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  uniform int u_mode; /* 0 = keep, 1 = white / custom */
  uniform vec3 u_bg255;
  in vec2 v_uv;
  out vec4 outColor;

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 c0 = texelFetch(u_tex, p0, 0);
    vec3 c255 = c0.rgb * 255.0;
    float a = c0.a;

    if (u_mode == 0) {
      bool nearSolid = false;
      if (a >= 0.25 && a < 0.45) {
        for (int dy = -1; dy <= 1; dy++) {
          int ny = p0.y + dy;
          if (ny < 0 || ny >= sz.y) continue;
          for (int dx = -1; dx <= 1; dx++) {
            int nx = p0.x + dx;
            if (nx < 0 || nx >= sz.x) continue;
            if (texelFetch(u_tex, ivec2(nx, ny), 0).a * 255.0 >= 209.5) {
              nearSolid = true;
            }
          }
        }
      }
      float cut = nearSolid ? 0.25 : 0.40;
      if (a < cut) {
        outColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }
      if (a < 0.98) {
        vec3 fgRgb = vec3(0.0);
        float fgW = 0.0;
        for (int dy = -3; dy <= 3; dy++) {
          int ny = p0.y + dy;
          if (ny < 0 || ny >= sz.y) continue;
          for (int dx = -3; dx <= 3; dx++) {
            int nx = p0.x + dx;
            if (nx < 0 || nx >= sz.x) continue;
            vec4 nb = texelFetch(u_tex, ivec2(nx, ny), 0);
            if (nb.a * 255.0 >= 244.5) {
              float wgt = 1.0 / (float(dx * dx + dy * dy) + 0.5);
              fgRgb += (nb.rgb * 255.0) * wgt;
              fgW += wgt;
            }
          }
        }
        vec3 res255 = c255;
        if (fgW > 0.0) {
          vec3 ir = fgRgb / fgW;
          res255 = clamp(floor(ir * 0.88 + c255 * 0.12 + 0.5), 0.0, 255.0);
        }
        outColor = vec4(res255 / 255.0, 1.0);
        return;
      }
    }
    vec3 flat255 = clamp(floor(c255 * a + u_bg255 * (1.0 - a) + 0.5), 0.0, 255.0);
    outColor = vec4(flat255 / 255.0, 1.0);
  }`;

  /* Kernel GLSL 4 (Tahap 2): DiZenzo Multi-Channel Scharr 2D Color-Tensor (lum, cRG, cBY)
     Identik 100% dengan CPU buildEdgeField(work, mask) -> menghasilkan vec4(gx, gy, mag, lum) */
  const FS_DIZENZO_SCHARR = `#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  in vec2 v_uv;
  out vec4 outEdge;

  vec3 getCh(ivec2 p, ivec2 sz) {
    ivec2 cp = clamp(p, ivec2(0), sz - ivec2(1));
    vec3 rgb = texelFetch(u_tex, cp, 0).rgb * 255.0;
    float lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    float cRG = (rgb.r - rgb.g) * 0.55;
    float cBY = (0.5 * (rgb.r + rgb.g) - rgb.b) * 0.45;
    return vec3(lum, cRG, cBY);
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 center = texelFetch(u_tex, p0, 0);
    vec3 c11 = getCh(p0, sz);
    if (center.a < 0.05) {
      outEdge = vec4(0.0, 0.0, 0.0, c11.x);
      return;
    }

    vec3 c00 = getCh(p0 + ivec2(-1, -1), sz);
    vec3 c10 = getCh(p0 + ivec2( 0, -1), sz);
    vec3 c20 = getCh(p0 + ivec2( 1, -1), sz);
    vec3 c01 = getCh(p0 + ivec2(-1,  0), sz);
    vec3 c21 = getCh(p0 + ivec2( 1,  0), sz);
    vec3 c02 = getCh(p0 + ivec2(-1,  1), sz);
    vec3 c12 = getCh(p0 + ivec2( 0,  1), sz);
    vec3 c22 = getCh(p0 + ivec2( 1,  1), sz);

    vec3 gx3 = (-3.0 * c00 - 10.0 * c01 - 3.0 * c02 + 3.0 * c20 + 10.0 * c21 + 3.0 * c22) / 32.0;
    vec3 gy3 = (-3.0 * c00 - 10.0 * c10 - 3.0 * c20 + 3.0 * c02 + 10.0 * c12 + 3.0 * c22) / 32.0;

    float gxx = dot(gx3, gx3);
    float gyy = dot(gy3, gy3);
    float gxy = dot(gx3, gy3);
    float tr = gxx + gyy;
    if (tr > 1e-6) {
      float df = gxx - gyy;
      float disc = sqrt(df * df + 4.0 * gxy * gxy);
      float lambda1 = max(0.0, 0.5 * (tr + disc));
      float mag = sqrt(lambda1);
      float theta = 0.5 * atan(2.0 * gxy, df);
      float vx = cos(theta), vy = sin(theta);
      float alx = abs(gx3.x), arx = abs(gx3.y), abx = abs(gx3.z);
      float domX = (alx >= arx && alx >= abx) ? gx3.x : ((arx >= abx) ? gx3.y : gx3.z);
      float aly = abs(gy3.x), ary = abs(gy3.y), aby = abs(gy3.z);
      float domY = (aly >= ary && aly >= aby) ? gy3.x : ((ary >= aby) ? gy3.y : gy3.z);
      if (vx * domX + vy * domY < 0.0) { vx = -vx; vy = -vy; }
      outEdge = vec4(vx * mag, vy * mag, mag, c11.x);
    } else {
      outEdge = vec4(0.0, 0.0, 0.0, c11.x);
    }
  }`;

  /* Kernel GLSL 5 (Tahap 2): 2D Structure Tensor 3x3 (Binomial [1,2,1; 2,4,2; 1,2,1]/16)
     Menghasilkan vec4(nx, ny, coh, corner) identik dengan CPU buildSegmentationContext */
  const FS_STRUCTURE_TENSOR = `#version 300 es
  precision highp float;
  uniform sampler2D u_edgeTex;
  uniform vec2 u_res;
  in vec2 v_uv;
  out vec4 outTensor;

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 e11 = texelFetch(u_edgeTex, p0, 0);
    if (e11.b < 1.5) {
      outTensor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    int xm1 = max(0, p0.x - 1), xp1 = min(sz.x - 1, p0.x + 1);
    int ym1 = max(0, p0.y - 1), yp1 = min(sz.y - 1, p0.y + 1);

    vec2 g00 = texelFetch(u_edgeTex, ivec2(xm1, ym1), 0).rg;
    vec2 g01 = texelFetch(u_edgeTex, ivec2(p0.x, ym1), 0).rg;
    vec2 g02 = texelFetch(u_edgeTex, ivec2(xp1, ym1), 0).rg;
    vec2 g10 = texelFetch(u_edgeTex, ivec2(xm1, p0.y), 0).rg;
    vec2 g11 = e11.rg;
    vec2 g12 = texelFetch(u_edgeTex, ivec2(xp1, p0.y), 0).rg;
    vec2 g20 = texelFetch(u_edgeTex, ivec2(xm1, yp1), 0).rg;
    vec2 g21 = texelFetch(u_edgeTex, ivec2(p0.x, yp1), 0).rg;
    vec2 g22 = texelFetch(u_edgeTex, ivec2(xp1, yp1), 0).rg;

    float jxx = (
      g00.x * g00.x + 2.0 * g01.x * g01.x + g02.x * g02.x +
      2.0 * g10.x * g10.x + 4.0 * g11.x * g11.x + 2.0 * g12.x * g12.x +
      g20.x * g20.x + 2.0 * g21.x * g21.x + g22.x * g22.x
    ) * 0.0625;
    float jxy = (
      g00.x * g00.y + 2.0 * g01.x * g01.y + g02.x * g02.y +
      2.0 * g10.x * g10.y + 4.0 * g11.x * g11.y + 2.0 * g12.x * g12.y +
      g20.x * g20.y + 2.0 * g21.x * g21.y + g22.x * g22.y
    ) * 0.0625;
    float jyy = (
      g00.y * g00.y + 2.0 * g01.y * g01.y + g02.y * g02.y +
      2.0 * g10.y * g10.y + 4.0 * g11.y * g11.y + 2.0 * g12.y * g12.y +
      g20.y * g20.y + 2.0 * g21.y * g21.y + g22.y * g22.y
    ) * 0.0625;

    float tr = jxx + jyy;
    if (tr > 1e-3) {
      float df = jxx - jyy;
      float disc = sqrt(df * df + 4.0 * jxy * jxy);
      float l2 = max(0.0, 0.5 * (tr - disc));
      float coh = (disc / tr) * (disc / tr);
      float corner = sqrt(l2);
      float theta = 0.5 * atan(2.0 * jxy, df);
      float vx = cos(theta), vy = sin(theta);
      if (vx * g11.x + vy * g11.y < 0.0) { vx = -vx; vy = -vy; }
      outTensor = vec4(vx, vy, coh, corner);
    } else {
      outTensor = vec4(0.0, 0.0, 0.0, 0.0);
    }
  }`;

  /* Kernel GLSL 6 (Tahap 2): Deteksi Sub-Piksel 1D Thin-Stroke Valley/Ridge + Nearest-Palette Lookup CIE-Lab
     Menghasilkan vec4(thinStrokeLab, nearestFltLab, nearestRawLab, isMasked) */
  const FS_THIN_AND_NEAREST = `#version 300 es
  precision highp float;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform vec2 u_res;
  uniform int u_K;
  uniform vec3 u_palRgb[64];
  uniform vec3 u_palLab[64];
  in vec2 v_uv;
  out vec4 outNear;

  float cdist2_255(vec3 c1, vec3 c2) {
    vec3 d = c1 - c2;
    float rm = (c1.r + c2.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  float srgbLin(float c) {
    return (c <= 0.04045) ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4);
  }
  float labF(float t) {
    const float eps = 216.0 / 24389.0;
    const float kap = 24389.0 / 27.0;
    return (t > eps) ? pow(t, 1.0 / 3.0) : ((kap * t + 16.0) / 116.0);
  }
  vec3 rgb255ToLab(vec3 rgb255) {
    vec3 u = rgb255 / 255.0;
    float R = srgbLin(u.r), G = srgbLin(u.g), B = srgbLin(u.b);
    float X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    float Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    float Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    float fx = labF(X), fy = labF(Y), fz = labF(Z);
    return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
  }

  int findNearestPal(vec3 rgb255) {
    if (u_K == 2) {
      float d0 = cdist2_255(rgb255, u_palRgb[0]);
      float d1 = cdist2_255(rgb255, u_palRgb[1]);
      return (d0 <= d1) ? 0 : 1;
    }
    vec3 lab = rgb255ToLab(rgb255);
    int bestI = 0;
    float bestD = 1e30;
    for (int k = 0; k < 64; k++) {
      if (k >= u_K) break;
      vec3 dl = lab - u_palLab[k];
      float d2 = dot(dl, dl);
      if (d2 < bestD) { bestD = d2; bestI = k; }
    }
    return bestI;
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 raw0 = texelFetch(u_rawTex, p0, 0);
    if (raw0.a < 0.05) {
      outNear = vec4(-1.0, -1.0, -1.0, 1.0);
      return;
    }

    int thinK = -1;
    vec3 r0 = raw0.rgb * 255.0;
    if (p0.x >= 2 && p0.x < sz.x - 2 && p0.y >= 2 && p0.y < sz.y - 2) {
      float l0 = dot(r0, vec3(0.299, 0.587, 0.114));
      const ivec2 DIRS[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
      for (int dIdx = 0; dIdx < 4; dIdx++) {
        ivec2 d = DIRS[dIdx];
        ivec2 pA2 = p0 - d * 2;
        ivec2 pB2 = p0 + d * 2;
        vec4 cA2 = texelFetch(u_rawTex, pA2, 0);
        vec4 cB2 = texelFetch(u_rawTex, pB2, 0);
        if (cA2.a < 0.05 || cB2.a < 0.05) continue;
        vec3 rgbA2 = cA2.rgb * 255.0;
        vec3 rgbB2 = cB2.rgb * 255.0;
        if (cdist2_255(rgbA2, rgbB2) > 1800.0) continue;

        float lA = dot(rgbA2, vec3(0.299, 0.587, 0.114));
        float lB = dot(rgbB2, vec3(0.299, 0.587, 0.114));
        float lA1 = dot(texelFetch(u_rawTex, p0 - d, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
        float lB1 = dot(texelFetch(u_rawTex, p0 + d, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
        float bgLum = 0.5 * (lA + lB);
        float dip = min(lA, lB) - l0;
        float peak = l0 - max(lA, lB);
        bool isLocalValley = (dip >= 36.0 && l0 <= min(lA1, lB1) - 10.0);
        bool isLocalRidge  = (peak >= 36.0 && l0 >= max(lA1, lB1) + 10.0);
        if (isLocalValley || isLocalRidge) {
          ivec2 pT1 = p0 + ivec2(d.y, -d.x);
          ivec2 pT2 = p0 + ivec2(-d.y, d.x);
          float lT1 = dot(texelFetch(u_rawTex, pT1, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
          float lT2 = dot(texelFetch(u_rawTex, pT2, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
          bool tangOk = isLocalValley
            ? (min(lT1, lT2) < min(lA, lB) - 18.0)
            : (max(lT1, lT2) > max(lA, lB) + 18.0);
          if (!tangOk) continue;
          vec3 bgRgb = 0.5 * (rgbA2 + rgbB2);
          float dBg0 = cdist2_255(r0, bgRgb);
          int bgK = 0; float bestBgD = 1e20;
          for (int k = 0; k < 64; k++) {
            if (k >= u_K) break;
            float dB = cdist2_255(bgRgb, u_palRgb[k]);
            if (dB < bestBgD) { bestBgD = dB; bgK = k; }
          }
          int bestK = -1;
          float bestCost = 1e20;
          for (int k = 0; k < 64; k++) {
            if (k >= u_K) break;
            if (k == bgK) continue;
            vec3 pk = u_palRgb[k];
            if (cdist2_255(pk, bgRgb) < 1800.0) continue;
            vec3 v = pk - bgRgb;
            float vLen2 = dot(v, v);
            if (vLen2 < 200.0) continue;
            float alpha = clamp(dot(r0 - bgRgb, v) / vLen2, 0.0, 1.15);
            if (alpha < 0.36) continue;
            vec3 proj = bgRgb + min(1.0, alpha) * v;
            float perpD2 = cdist2_255(r0, proj);
            float directD2 = cdist2_255(r0, pk);
            float cost = perpD2 + directD2 * 0.28;
            if (cost < bestCost && perpD2 <= dBg0 * 0.28 + 480.0) {
              bestCost = cost; bestK = k;
            }
          }
          if (bestK >= 0) { thinK = bestK; break; }
        }
      }
    }

    int nearFlt = thinK;
    int nearRaw = thinK;
    if (thinK < 0) {
      vec3 f0 = texelFetch(u_fltTex, p0, 0).rgb * 255.0;
      nearFlt = findNearestPal(f0);
      nearRaw = findNearestPal(r0);
    }
    outNear = vec4(float(thinK), float(nearFlt), float(nearRaw), 0.0);
  }`;

  /* Kernel GLSL 7 (Tahap 2): Normal-Ray Casting (s=1..3) + Sub-Pixel Color Blend Unmixing
     Menghasilkan vec4(flankA, flankB, flankAlpha, flankPerp) identik dengan CPU buildSegmentationContext */
  const FS_FLANK_UNMIX = `#version 300 es
  precision highp float;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_tensorTex;
  uniform sampler2D u_nearTex;
  uniform vec2 u_res;
  uniform int u_K;
  uniform vec3 u_palRgb[64];
  in vec2 v_uv;
  out vec4 outFlank;

  float cdist2_255(vec3 c1, vec3 c2) {
    vec3 d = c1 - c2;
    float rm = (c1.r + c2.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  vec3 evalBlendPair(vec3 rgb, vec3 CA, vec3 CB) {
    vec3 d = CA - CB;
    float len2 = dot(d, d);
    float abD2 = cdist2_255(CA, CB);
    if (len2 < 120.0 || abD2 < 320.0) return vec3(0.0, 0.0, 0.0);

    float t = dot(rgb - CB, d) / len2;
    if (t <= 0.02 || t >= 0.98) return vec3(0.0, 0.0, 0.0);

    vec3 pLin = CB + t * d;
    float perpD2 = cdist2_255(rgb, pLin);

    float tc = clamp(t, 0.02, 0.98);
    vec3 g20 = sqrt(tc * CA * CA + (1.0 - tc) * CB * CB);
    perpD2 = min(perpD2, cdist2_255(rgb, g20));

    vec3 g22 = pow(
      tc * pow(max(CA, vec3(0.0)), vec3(2.2)) + (1.0 - tc) * pow(max(CB, vec3(0.0)), vec3(2.2)),
      vec3(1.0 / 2.2)
    );
    perpD2 = min(perpD2, cdist2_255(rgb, g22));

    float maxAllowedPerp = min(5400.0, 680.0 + abD2 * 0.022);
    if (perpD2 > maxAllowedPerp) return vec3(0.0, 0.0, 0.0);

    return vec3(t, perpD2, 1.0);
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 defOut = vec4(-1.0, -1.0, 0.5, 0.0);
    if (p0.x < 1 || p0.x >= sz.x - 1 || p0.y < 1 || p0.y >= sz.y - 1) {
      outFlank = defOut;
      return;
    }

    vec4 near0 = texelFetch(u_nearTex, p0, 0);
    float mp0 = texelFetch(u_edgeTex, p0, 0).b;
    if (near0.a > 0.5 || mp0 < 4.5) {
      outFlank = defOut;
      return;
    }

    vec4 ten = texelFetch(u_tensorTex, p0, 0);
    float nx = ten.r, ny = ten.g;
    if (nx == 0.0 && ny == 0.0) {
      outFlank = defOut;
      return;
    }

    ivec2 bestPos = ivec2(-1, -1);
    ivec2 bestNeg = ivec2(-1, -1);
    float bestPosMag = 1e20;
    float bestNegMag = 1e20;

    for (int s = 1; s <= 3; s++) {
      int px = clamp(int(floor(float(p0.x) + nx * float(s) + 0.5)), 0, sz.x - 1);
      int py = clamp(int(floor(float(p0.y) + ny * float(s) + 0.5)), 0, sz.y - 1);
      ivec2 pp = ivec2(px, py);
      if (texelFetch(u_nearTex, pp, 0).a < 0.5) {
        float mScore = texelFetch(u_edgeTex, pp, 0).b + float(s) * 1.1;
        if (mScore < bestPosMag) { bestPosMag = mScore; bestPos = pp; }
      }

      int mx = clamp(int(floor(float(p0.x) - nx * float(s) + 0.5)), 0, sz.x - 1);
      int my = clamp(int(floor(float(p0.y) - ny * float(s) + 0.5)), 0, sz.y - 1);
      ivec2 mp = ivec2(mx, my);
      if (texelFetch(u_nearTex, mp, 0).a < 0.5) {
        float mScore = texelFetch(u_edgeTex, mp, 0).b + float(s) * 1.1;
        if (mScore < bestNegMag) { bestNegMag = mScore; bestNeg = mp; }
      }
    }

    if (bestPos.x < 0 || bestNeg.x < 0 || (bestPos.x == bestNeg.x && bestPos.y == bestNeg.y)) {
      outFlank = defOut;
      return;
    }
    if (texelFetch(u_edgeTex, bestPos, 0).b > mp0 * 0.55 || texelFetch(u_edgeTex, bestNeg, 0).b > mp0 * 0.55) {
      outFlank = defOut;
      return;
    }

    int LA = int(floor(texelFetch(u_nearTex, bestPos, 0).g + 0.5));
    int LB = int(floor(texelFetch(u_nearTex, bestNeg, 0).g + 0.5));
    if (LA == LB || LA < 0 || LB < 0 || LA >= u_K || LB >= u_K) {
      outFlank = defOut;
      return;
    }

    vec3 r0 = texelFetch(u_rawTex, p0, 0).rgb * 255.0;
    vec3 f0 = texelFetch(u_fltTex, p0, 0).rgb * 255.0;
    vec3 CA = u_palRgb[LA];
    vec3 CB = u_palRgb[LB];

    vec3 blPal = evalBlendPair(r0, CA, CB);
    if (blPal.z < 0.5) {
      blPal = evalBlendPair((r0 + f0) * 0.5, CA, CB);
    }
    if (blPal.z < 0.5) {
      outFlank = defOut;
      return;
    }

    vec3 CposLocal = texelFetch(u_fltTex, bestPos, 0).rgb * 255.0;
    vec3 CnegLocal = texelFetch(u_fltTex, bestNeg, 0).rgb * 255.0;
    vec3 blLoc = evalBlendPair(r0, CposLocal, CnegLocal);

    float alpha = (blLoc.z > 0.5) ? (0.60 * blLoc.x + 0.40 * blPal.x) : blPal.x;
    float perp  = (blLoc.z > 0.5) ? min(blPal.y, blLoc.y) : blPal.y;
    outFlank = vec4(float(LA), float(LB), clamp(alpha, 0.0, 1.0), perp);
  }`;

  /* Eksekutor Pass Shader ke Persistent VRAM Slot (Zero-Copy FBO Pass) */
  function runSlotPass(env, progKey, fsSource, targetSlot, uniformsSetter) {
    const { gl, vao, progs } = env;
    if (!progs[progKey]) {
      progs[progKey] = compileProgram(gl, VS_QUAD, fsSource);
      if (!progs[progKey]) return false;
    }
    const prog = progs[progKey];
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetSlot ? targetSlot.fbo : null);
    gl.viewport(0, 0, targetSlot ? targetSlot.w : env.cv.width, targetSlot ? targetSlot.h : env.cv.height);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    if (uniformsSetter) uniformsSetter(gl, prog);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  /* Unggah ImageData / Uint8Array ke Persistent Slot VRAM (Satu-satunya Upload di Hulu Pipeline) */
  function uploadToSlot(work, slotName = 'texRawRGBA') {
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return null;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;
    const slot = GPUMemPool.allocateSlot(gl, slotName, w, h, false);
    if (!slot) return null;
    gl.bindTexture(gl.TEXTURE_2D, slot.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data.data);
    return slot;
  }

  /* Unggah Array RGBA8 (dengan encoding mask di kanal Alpha) ke Slot VRAM */
  function uploadRgbaWithMask(gl, slotName, rgbaArr, mask, w, h) {
    const slot = GPUMemPool.allocateSlot(gl, slotName, w, h, false);
    if (!slot) return null;
    const n = w * h;
    let srcBuf = rgbaArr;
    if (mask) {
      const tmp = MemPool.acquire(Uint8Array, n * 4);
      tmp.set(rgbaArr);
      for (let p = 0; p < n; p++) {
        tmp[p * 4 + 3] = mask[p] ? 0 : 255;
      }
      srcBuf = tmp;
    }
    gl.bindTexture(gl.TEXTURE_2D, slot.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, srcBuf);
    if (mask && srcBuf !== rgbaArr) MemPool.release(srcBuf);
    return slot;
  }

  /* Unggah Buffer TypedArray (Uint8Array / Float32Array) langsung ke Slot VRAM (mendukung skala 1x, lut, dan vtx (w+1)x(h+1)) */
  function uploadBufferToSlot(gl, slotName, w, h, dataBuf, isFloat = false) {
    const slot = GPUMemPool.allocateSlot(gl, slotName, w, h, isFloat);
    if (!slot) return null;
    const srcArr = (!slot.isFloat && !(dataBuf instanceof Uint8Array))
      ? new Uint8Array(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength)
      : dataBuf;
    gl.bindTexture(gl.TEXTURE_2D, slot.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, slot.w, slot.h,
      gl.RGBA,
      slot.isFloat ? gl.FLOAT : gl.UNSIGNED_BYTE,
      srcArr
    );
    return slot;
  }

  /* Inisialisasi Workspace VRAM Menetap untuk Sesi Vectorize */
  function beginGpuSession(work) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return null;
    const { w, h } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;
    const ws = GPUMemPool.ensureWorkspace(
      env.gl, w, h, env.extFloat,
      ['texRawRGBA', 'texFltRGBA', 'texLabGrad', 'texEdgeField', 'texTensor', 'texFlanks', 'texLabelsA', 'texLabelsB', 'bufVerticesA', 'bufVerticesB']
    );
    if (!ws) return null;
    uploadToSlot(work, 'texRawRGBA');
    return {
      backend: webgpuState.supported ? 'WebGPU + WebGL2 FBO' : 'WebGL2 Zero-Copy FBO',
      extFloat: env.extFloat,
      slots: ws
    };
  }

  /* TAHAP 2 KERNEL 1: Alpha Defringing & Inward Opaque Foreground Propagation di GPU */
  function gpuFlattenAlpha(work, mode = 'keep', customHex = '#ffffff') {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return null;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const d = data.data;
      const n = w * h;
      const origAlpha = new Uint8Array(n);
      for (let i = 3, p = 0; i < d.length; i += 4, p++) origAlpha[p] = d[i];
      work.origAlpha = origAlpha;

      /* Unggah citra mentah ber-alpha ke slot staging RGBA8 texFltRGBA, lalu render hasil ke texRawRGBA */
      const stgSlot = uploadToSlot(work, 'texFltRGBA');
      const rawSlot = GPUMemPool.allocateSlot(gl, 'texRawRGBA', w, h, false);
      if (!stgSlot || !rawSlot) return null;

      let hadOpaqueInput = false;
      for (let p = 0; p < n; p++) {
        if (origAlpha[p] >= 128) { hadOpaqueInput = true; break; }
      }

      const bg = mode === 'custom' ? rgbOf(customHex || '#ffffff') : [255, 255, 255];
      const ok = runSlotPass(env, 'alphaFlatten', FS_ALPHA_FLATTEN, rawSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, stgSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_mode'), mode === 'keep' ? 0 : 1);
        g.uniform3f(g.getUniformLocation(prog, 'u_bg255'), bg[0], bg[1], bg[2]);
      });
      if (!ok) return null;

      const out = MemPool.acquire(Uint8Array, n * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, rawSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const mask = new Uint8Array(n);
      let unmaskedCount = 0;
      for (let p = 0; p < n; p++) {
        if (out[p * 4 + 3] === 0) mask[p] = 1;
        else unmaskedCount++;
      }
      if (hadOpaqueInput && unmaskedCount === 0) {
        MemPool.release(out);
        return null;
      }
      d.set(out);
      MemPool.release(out);
      return mask;
    } catch (e) {
      return null;
    }
  }

  /* TAHAP 2 KERNEL 2: DiZenzo Multi-Channel Scharr 2D Color-Tensor di GPU (RGBA32F) */
  function gpuBuildEdgeField(work, mask) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const fltSlot = uploadRgbaWithMask(gl, 'texFltRGBA', data.data, mask, w, h);
      const edgeSlot = GPUMemPool.allocateSlot(gl, 'texEdgeField', w, h, true);
      if (!fltSlot || !edgeSlot || !edgeSlot.isFloat) return null;

      const ok = runSlotPass(env, 'dizenzoScharr', FS_DIZENZO_SCHARR, edgeSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
      });
      if (!ok) return null;

      const n = w * h;
      const rawFloats = MemPool.acquire(Float32Array, n * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, edgeSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, rawFloats);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const lum = new Float32Array(n);
      const gx = new Float32Array(n);
      const gy = new Float32Array(n);
      const mag = new Float32Array(n);
      for (let p = 0; p < n; p++) {
        const i = p * 4;
        lum[p] = rawFloats[i + 3];
        if (!(mask && mask[p])) {
          gx[p] = rawFloats[i];
          gy[p] = rawFloats[i + 1];
          mag[p] = rawFloats[i + 2];
        }
      }
      MemPool.release(rawFloats);
      return { lum, gx, gy, mag, gpuSlotReady: true };
    } catch (e) {
      return null;
    }
  }

  /* TAHAP 2 KERNEL 3: 2D Structure Tensor 3x3 + 1D Thin-Stroke + Normal-Ray Flank Unmixing di GPU */
  function gpuBuildSegmentationTables(work, rawD, fltD, mask, palLab, edgeField) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;
    const { w, h } = work;
    const K = palLab ? palLab.length : 0;
    if (K < 2 || K > 64 || w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const rawSlot = uploadRgbaWithMask(gl, 'texRawRGBA', rawD, mask, w, h);
      const fltSlot = uploadRgbaWithMask(gl, 'texFltRGBA', fltD, mask, w, h);
      const edgeSlot = GPUMemPool.allocateSlot(gl, 'texEdgeField', w, h, true);
      const tensorSlot = GPUMemPool.allocateSlot(gl, 'texTensor', w, h, true);
      const nearSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
      const flankSlot = GPUMemPool.allocateSlot(gl, 'texFlanks', w, h, true);
      if (!rawSlot || !fltSlot || !edgeSlot || !tensorSlot || !nearSlot || !flankSlot) return null;

      /* Pastikan texEdgeField berisi (gx, gy, mag, lum) dari fltSlot */
      const okEdge = runSlotPass(env, 'dizenzoScharr', FS_DIZENZO_SCHARR, edgeSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
      });
      if (!okEdge) return null;

      /* Pass A: 2D Structure Tensor 3x3 -> texTensor (nx, ny, coh, corner) */
      const okTensor = runSlotPass(env, 'structureTensor', FS_STRUCTURE_TENSOR, tensorSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, edgeSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
      });
      if (!okTensor) return null;

      /* Siapkan uniform palet RGB & CIE-Lab (maks 64 warna) */
      const uPalRgb = new Float32Array(64 * 3);
      const uPalLab = new Float32Array(64 * 3);
      for (let k = 0; k < K; k++) {
        uPalRgb[k * 3]     = palLab[k].r;
        uPalRgb[k * 3 + 1] = palLab[k].g;
        uPalRgb[k * 3 + 2] = palLab[k].b;
        uPalLab[k * 3]     = palLab[k].L;
        uPalLab[k * 3 + 1] = palLab[k].a;
        uPalLab[k * 3 + 2] = palLab[k].b2;
      }

      /* Pass B: 1D Thin-Stroke Valley/Ridge + Nearest-Palette Lookup CIE-Lab -> texLabGrad */
      const okNear = runSlotPass(env, 'thinAndNearest', FS_THIN_AND_NEAREST, nearSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 0);
        g.activeTexture(g.TEXTURE1);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_fltTex'), 1);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), K);
        g.uniform3fv(g.getUniformLocation(prog, 'u_palRgb[0]'), uPalRgb);
        g.uniform3fv(g.getUniformLocation(prog, 'u_palLab[0]'), uPalLab);
      });
      if (!okNear) return null;

      /* Pass C: Normal-Ray Casting (s=1..3) + Sub-Pixel Color Blend Unmixing -> texFlanks */
      const okFlank = runSlotPass(env, 'flankUnmix', FS_FLANK_UNMIX, flankSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 0);
        g.activeTexture(g.TEXTURE1);
        g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_fltTex'), 1);
        g.activeTexture(g.TEXTURE2);
        g.bindTexture(g.TEXTURE_2D, edgeSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 2);
        g.activeTexture(g.TEXTURE3);
        g.bindTexture(g.TEXTURE_2D, tensorSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tensorTex'), 3);
        g.activeTexture(g.TEXTURE4);
        g.bindTexture(g.TEXTURE_2D, nearSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_nearTex'), 4);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), K);
        g.uniform3fv(g.getUniformLocation(prog, 'u_palRgb[0]'), uPalRgb);
      });
      if (!okFlank) return null;

      const n = w * h;
      const bufTen   = MemPool.acquire(Float32Array, n * 4);
      const bufNear  = MemPool.acquire(Float32Array, n * 4);
      const bufFlank = MemPool.acquire(Float32Array, n * 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, tensorSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, bufTen);
      gl.bindFramebuffer(gl.FRAMEBUFFER, nearSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, bufNear);
      gl.bindFramebuffer(gl.FRAMEBUFFER, flankSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, bufFlank);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const nxArr = new Float32Array(n);
      const nyArr = new Float32Array(n);
      const cohArr = new Float32Array(n);
      const cornerArr = new Float32Array(n);
      const thinStrokeLab = new Int16Array(n).fill(-1);
      const rawNearestFlt = new Int16Array(n).fill(-1);
      const rawNearestRaw = new Int16Array(n).fill(-1);
      const flankA = new Int16Array(n).fill(-1);
      const flankB = new Int16Array(n).fill(-1);
      const flankAlpha = new Float32Array(n).fill(0.5);
      const flankPerp = new Float32Array(n);

      for (let p = 0; p < n; p++) {
        const i = p * 4;
        nxArr[p] = bufTen[i];
        nyArr[p] = bufTen[i + 1];
        cohArr[p] = bufTen[i + 2];
        cornerArr[p] = bufTen[i + 3];

        thinStrokeLab[p] = Math.round(bufNear[i]);
        rawNearestFlt[p] = Math.round(bufNear[i + 1]);
        rawNearestRaw[p] = Math.round(bufNear[i + 2]);

        const fA = Math.round(bufFlank[i]);
        const fB = Math.round(bufFlank[i + 1]);
        if (fA >= 0 && fB >= 0) {
          flankA[p] = fA;
          flankB[p] = fB;
          flankAlpha[p] = bufFlank[i + 2];
          flankPerp[p] = bufFlank[i + 3];
        }
      }

      MemPool.release(bufTen);
      MemPool.release(bufNear);
      MemPool.release(bufFlank);

      return {
        nxArr, nyArr, cohArr, cornerArr,
        thinStrokeLab, rawNearestFlt, rawNearestRaw,
        flankA, flankB, flankAlpha, flankPerp
      };
    } catch (e) {
      return null;
    }
  }

  /* =====================================================================
     TAHAP 3 GPU KERNELS — 4-Color Chromatic MRF Potts, 9-Bit Simple-Point
     Topological Invariants, Local Edge Snapping & Morphological/Ribbon Clean
     ===================================================================== */
  const GLSL_TAHAP3_COMMON = `
  uniform sampler2D u_labels;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_tensorTex;
  uniform sampler2D u_flankTex;
  uniform sampler2D u_nearTex;
  uniform sampler2D u_palLut;
  uniform vec2 u_res;
  uniform int u_K;

  vec3 fetchRaw(ivec2 p) {
    ivec2 c = clamp(p, ivec2(0), ivec2(u_res) - ivec2(1));
    return texelFetch(u_rawTex, c, 0).rgb * 255.0;
  }
  vec3 fetchFlt(ivec2 p) {
    ivec2 c = clamp(p, ivec2(0), ivec2(u_res) - ivec2(1));
    return texelFetch(u_fltTex, c, 0).rgb * 255.0;
  }
  vec3 fetchPalRGB(int l) {
    if (l < 0 || l >= u_K) return vec3(0.0);
    vec4 v = texelFetch(u_palLut, ivec2(0, l), 0);
    float b = floor(v.a / 256.0);
    float g = v.a - b * 256.0;
    return vec3(v.b, g, b);
  }
  float fetchPalDist2(int a, int b) {
    if (a < 0 || b < 0 || a >= u_K || b >= u_K) return 0.0;
    return texelFetch(u_palLut, ivec2(a * u_K + b, 0), 0).r;
  }
  bool fetchPalIsMidBlend(int l, int a, int b) {
    if (l < 0 || a < 0 || b < 0 || l >= u_K || a >= u_K || b >= u_K) return false;
    return texelFetch(u_palLut, ivec2(a * u_K + b, l), 0).g > 0.5;
  }
  float cdist2(vec3 a, vec3 b) {
    vec3 d = a - b;
    float rm = (a.r + b.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }
  bool evalColorBlendPair(vec3 p0, vec3 cA, vec3 cB, out float outT, out float outPerpD2) {
    vec3 d = cA - cB;
    float len2 = dot(d, d);
    float abD2 = cdist2(cA, cB);
    if (len2 < 120.0 || abD2 < 320.0) return false;
    float t = dot(p0 - cB, d) / len2;
    if (t <= 0.02 || t >= 0.98) return false;
    vec3 pr = cB + t * d;
    float perpD2 = cdist2(p0, pr);
    float tc = clamp(t, 0.02, 0.98);
    vec3 gr = sqrt(max(vec3(0.0), tc * cA * cA + (1.0 - tc) * cB * cB));
    perpD2 = min(perpD2, cdist2(p0, gr));
    vec3 gr22 = pow(max(vec3(0.0), tc * pow(max(cA, vec3(0.0)), vec3(2.2)) + (1.0 - tc) * pow(max(cB, vec3(0.0)), vec3(2.2))), vec3(1.0 / 2.2));
    perpD2 = min(perpD2, cdist2(p0, gr22));
    float maxAllowed = min(5400.0, 680.0 + abD2 * 0.022);
    if (perpD2 > maxAllowed) return false;
    outT = t;
    outPerpD2 = perpD2;
    return true;
  }
  /* 9-Bit Bitmask 4-Connected Component Counter (100% Identik dengan BFS wouldChangeTopology di seluruh 512 state 3x3) */
  int countComp4Mask(int mask9) {
    int rem = mask9 & 511;
    int c = 0;
    for (int k = 0; k < 5; k++) {
      if (rem == 0) break;
      int comp = rem & (-rem);
      for (int s = 0; s < 6; s++) {
        comp = (comp | ((comp & 219) << 1) | ((comp & 438) >> 1) | (comp << 3) | (comp >> 3)) & rem;
      }
      rem &= ~comp;
      c++;
    }
    return c;
  }
  bool wouldChangeTopoAt(ivec2 p, int fromL, int toL) {
    if (fromL == toL) return false;
    int maskFrom = 0;
    int maskTo = 0;
    int W = int(u_res.x);
    int H = int(u_res.y);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        if (i == 0 && j == 0) continue;
        int xx = p.x + i;
        int yy = p.y + j;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        int bit = 1 << ((j + 1) * 3 + (i + 1));
        int nl = int(round(texelFetch(u_labels, ivec2(xx, yy), 0).r));
        if (nl == fromL) maskFrom |= bit;
        if (nl == toL) maskTo |= bit;
      }
    }
    int beforeFrom = countComp4Mask(maskFrom | 16);
    int afterFrom = countComp4Mask(maskFrom);
    if (afterFrom > beforeFrom) return true;
    int beforeTo = countComp4Mask(maskTo);
    int afterTo = countComp4Mask(maskTo | 16);
    if (beforeTo >= 2 && afterTo < beforeTo) return true;
    return false;
  }
  `;

  /* Kernel GLSL 7A: Deteksi Piksel Jangkar (Anchor Detection) untuk Local-Neighborhood Edge Snap */
  const FS_EDGE_SNAP_ANCHOR = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_pass;
  out vec4 outLabel;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int L0 = int(round(curV.r));
    float isAnc = 0.0;
    if (p.x >= 1 && p.x < W - 1 && p.y >= 1 && p.y < H - 1 && curV.g < 0.5 && L0 >= 0) {
      float mag = texelFetch(u_edgeTex, p, 0).b;
      if (!(mag > 14.0 && u_pass == 0)) {
        int same = 0;
        if (int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r)) == L0) same++;
        if (same >= 3) {
          if (cdist2(fetchRaw(p), fetchPalRGB(L0)) < 1450.0) {
            isAnc = 1.0;
          }
        }
      }
    }
    outLabel = vec4(curV.r, curV.g, curV.b, isAnc);
  }`;

  /* Kernel GLSL 7B: Local-Neighborhood Edge Snap 7x7 + Normal-Ray Flank Unmixing Snap */
  const FS_EDGE_SNAP_STEP = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  out vec4 outLabel;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int curL = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.a > 0.5 || curL < 0 || tsLab == curL) {
      outLabel = curV;
      return;
    }
    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));
    if (lL == curL && lR == curL && lU == curL && lD == curL) {
      outLabel = curV;
      return;
    }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(curL));

    /* 1. Periksa pasangan jangkar normal gradien (flankA, flankB) terlebih dahulu */
    vec4 flk = texelFetch(u_flankTex, p, 0);
    int fA = int(round(flk.r));
    int fB = int(round(flk.g));
    if (fA >= 0 && fB >= 0 && fA != curL && fB != curL) {
      if (fetchPalIsMidBlend(curL, fA, fB)) {
        float blT = 0.5, blPerp = 0.0;
        if (evalColorBlendPair(r0, fetchPalRGB(fA), fetchPalRGB(fB), blT, blPerp) && dCur > blPerp * 0.45) {
          int nextL = (flk.b >= 0.5) ? fA : fB;
          outLabel = vec4(float(nextL), curV.g, curV.b, curV.a);
          return;
        }
      }
    }

    /* 2. Evaluasi statistik jangkar lokal pada jendela 7x7 (hingga 12 label unik lokal) */
    int uLab[12];
    int uCnt[12];
    int uAnc[12];
    int nU = 0;
    for (int dy = -3; dy <= 3; dy++) {
      int ny = p.y + dy;
      if (ny < 0 || ny >= H) continue;
      for (int dx = -3; dx <= 3; dx++) {
        int nx = p.x + dx;
        if (nx < 0 || nx >= W) continue;
        vec4 nv = texelFetch(u_labels, ivec2(nx, ny), 0);
        int nl = int(round(nv.r));
        if (nl < 0) continue;
        int idx = -1;
        for (int k = 0; k < 12; k++) {
          if (k >= nU) break;
          if (uLab[k] == nl) { idx = k; break; }
        }
        if (idx < 0 && nU < 12) {
          idx = nU++;
          uLab[idx] = nl;
          uCnt[idx] = 0;
          uAnc[idx] = 0;
        }
        if (idx >= 0) {
          uCnt[idx] += 1;
          if (nv.a > 0.5) uAnc[idx] += 4;
        }
      }
    }
    if (nU < 2) {
      outLabel = curV;
      return;
    }

    /* Urutkan 4 kandidat teratas berdasarkan (anchorCounts + counts) */
    int topIdx[4];
    int maxCheck = min(nU, 4);
    int usedMask = 0;
    for (int t = 0; t < 4; t++) {
      if (t >= maxCheck) { topIdx[t] = -1; continue; }
      int bestK = -1, bestScore = -1;
      for (int k = 0; k < 12; k++) {
        if (k >= nU) break;
        if ((usedMask & (1 << k)) != 0) continue;
        int sc = uAnc[k] + uCnt[k];
        if (sc > bestScore) { bestScore = sc; bestK = k; }
      }
      topIdx[t] = bestK;
      if (bestK >= 0) usedMask |= (1 << bestK);
    }

    int curAnchor = 0, curTotal = 0;
    for (int k = 0; k < 12; k++) {
      if (k >= nU) break;
      if (uLab[k] == curL) { curAnchor = uAnc[k]; curTotal = uCnt[k]; break; }
    }

    int snapped = -1;
    float bestPerp = 1e20;
    for (int a = 0; a < 4; a++) {
      if (a >= maxCheck) break;
      int ia = topIdx[a];
      if (ia < 0) continue;
      int LA = uLab[ia];
      for (int b = a + 1; b < 4; b++) {
        if (b >= maxCheck) break;
        int ib = topIdx[b];
        if (ib < 0) continue;
        int LB = uLab[ib];
        if (uCnt[ia] + uCnt[ib] < 5) continue;
        if (LA != curL && LB != curL) {
          bool isPalMid = fetchPalIsMidBlend(curL, LA, LB);
          float blT = 0.5, blPerp = 0.0;
          if (!evalColorBlendPair(r0, fetchPalRGB(LA), fetchPalRGB(LB), blT, blPerp)) continue;
          if (!isPalMid && dCur < blPerp * 2.5 + 1200.0) continue;
          int ancAB = uAnc[ia] + uAnc[ib];
          if ((isPalMid && (curAnchor <= 4 || curTotal <= 16)) || (curAnchor == 0 && curTotal <= 6 && ancAB >= 12 && dCur > blPerp * 2.2)) {
            if (blPerp < bestPerp) {
              bestPerp = blPerp;
              snapped = (blT >= 0.5) ? LA : LB;
            }
          }
        }
      }
    }
    if (snapped >= 0 && snapped != curL) {
      outLabel = vec4(float(snapped), curV.g, curV.b, curV.a);
    } else {
      outLabel = curV;
    }
  }`;

  /* Kernel GLSL 8: 4-Color Chromatic Parallel MRF Potts dengan Invarian Topologi Bitmask 9-Bit */
  const FS_MRF_POTTS_4COLOR = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_colorPass;
  uniform float u_beta;
  uniform int u_checkTopo;
  out vec4 outLabel;

  float dataEnergyAt(ivec2 p, vec3 r0, vec3 flt0, float mag, int thinLab, int fA, int fB, float fAlpha, float fPerp, int l, float curBeta) {
    if (thinLab >= 0) {
      return (l == thinLab) ? 0.0 : (curBeta * 6.5 + 18000.0);
    }
    vec3 src = (mag > 5.5) ? r0 : flt0;
    float dBase = cdist2(src, fetchPalRGB(l));
    if (fA >= 0 && fB >= 0) {
      float abDist2 = fetchPalDist2(fA, fB);
      float scale = min(abDist2 * 0.28, curBeta * 3.0);
      if (l == fA) {
        float unmixCost = fPerp * 0.65 + (1.0 - fAlpha) * (1.0 - fAlpha) * scale;
        return min(dBase, unmixCost);
      }
      if (l == fB) {
        float unmixCost = fPerp * 0.65 + fAlpha * fAlpha * scale;
        return min(dBase, unmixCost);
      }
      if (fetchPalIsMidBlend(l, fA, fB) && dBase > fPerp * 0.5) {
        return dBase + curBeta * 3.6 + abDist2 * 0.25;
      }
    }
    return dBase;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    if (curV.g > 0.5 || cur < 0) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }
    /* Penjadwalan Kromatik 4-Warna (King's Graph 4-Coloring):
       Tidak ada dua piksel dengan paritas ((x & 1) + ((y & 1) << 1)) yang sama yang bertetangga-8! */
    int parity = (p.x & 1) + ((p.y & 1) << 1);
    if (parity != u_colorPass) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    const ivec2 DIRS[8] = ivec2[8](
      ivec2( 1, 0), ivec2(-1, 0), ivec2(0,  1), ivec2(0, -1),
      ivec2( 1, 1), ivec2(-1, 1), ivec2(1, -1), ivec2(-1,-1)
    );
    const float W_DIR[8] = float[8](1.0, 1.0, 1.0, 1.0, 0.707, 0.707, 0.707, 0.707);

    int nLabelBuf[8];
    int candBuf[12];
    int candLen = 1;
    candBuf[0] = cur;
    bool isBoundary = false;
    int sameOrtho = 0, sameDiag = 0;

    for (int k = 0; k < 8; k++) {
      ivec2 q = p + DIRS[k];
      if (q.x < 0 || q.y < 0 || q.x >= W || q.y >= H) {
        nLabelBuf[k] = -2;
        continue;
      }
      int nl = int(round(texelFetch(u_labels, q, 0).r));
      nLabelBuf[k] = nl;
      if (nl == cur) {
        if (k < 4) sameOrtho++; else sameDiag++;
      } else if (nl >= 0) {
        isBoundary = true;
        bool seen = false;
        for (int ci = 0; ci < 12; ci++) {
          if (ci >= candLen) break;
          if (candBuf[ci] == nl) { seen = true; break; }
        }
        if (!seen && candLen < 12) candBuf[candLen++] = nl;
      }
    }
    if (!isBoundary) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    vec3 r0 = fetchRaw(p);
    vec3 flt0 = fetchFlt(p);
    float mag = texelFetch(u_edgeTex, p, 0).b;
    vec4 ten = texelFetch(u_tensorTex, p, 0);
    float nx = ten.r, ny = ten.g, coh = ten.b, corner = ten.a;
    bool hasAniso = coh > 0.15 && (nx != 0.0 || ny != 0.0);
    const float inv2SigmaEdge = 1.0 / (2.0 * 1350.0);

    float wEdge[8];
    for (int k = 0; k < 8; k++) {
      if (nLabelBuf[k] == -2) { wEdge[k] = 0.0; continue; }
      ivec2 q = p + DIRS[k];
      float dc2 = cdist2(r0, fetchRaw(q));
      float aniso = 1.0;
      if (hasAniso) {
        float stepLen = (k < 4) ? 1.0 : 1.41421356;
        float tanAlign = abs((float(DIRS[k].x) * (-ny) + float(DIRS[k].y) * nx) / stepLen);
        aniso = 0.74 + 0.56 * tanAlign;
      }
      wEdge[k] = W_DIR[k] * aniso * (0.14 + 0.86 * exp(-dc2 * inv2SigmaEdge));
    }

    vec4 flk = texelFetch(u_flankTex, p, 0);
    int fAp = int(round(flk.r));
    int fBp = int(round(flk.g));
    float fAlpha = flk.b;
    float fPerp = flk.a;
    if (fAp >= 0) {
      bool sc = false;
      for (int ci = 0; ci < 12; ci++) { if (ci >= candLen) break; if (candBuf[ci] == fAp) { sc = true; break; } }
      if (!sc && candLen < 12) candBuf[candLen++] = fAp;
    }
    if (fBp >= 0) {
      bool sc = false;
      for (int ci = 0; ci < 12; ci++) { if (ci >= candLen) break; if (candBuf[ci] == fBp) { sc = true; break; } }
      if (!sc && candLen < 12) candBuf[candLen++] = fBp;
    }

    int thinLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (thinLab >= 0 && cur == thinLab) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }
    float dCurRaw = cdist2(r0, fetchPalRGB(cur));
    float dCur = dataEnergyAt(p, r0, flt0, mag, thinLab, fAp, fBp, fAlpha, fPerp, cur, u_beta);

    bool hasCleanUnmixMajority = fAp >= 0 && fBp >= 0 && coh > 0.25 && fPerp < 320.0 && sameOrtho >= 1 && (sameOrtho + sameDiag >= 2) &&
      ((cur == fAp && fAlpha >= 0.505) || (cur == fBp && fAlpha <= 0.495));
    if (hasCleanUnmixMajority) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    bool isSharpFeature = corner > 5.5 && (sameOrtho + sameDiag >= 1) && dCurRaw < 1100.0;
    bool isProtectedDetailOrTip = ((sameOrtho + sameDiag >= 1) && dCurRaw < 480.0) || isSharpFeature;

    int bestL = cur;
    float bestE = 1e20;
    for (int ci = 0; ci < 12; ci++) {
      if (ci >= candLen) break;
      int l = candBuf[ci];
      float dl = (l == cur) ? dCur : dataEnergyAt(p, r0, flt0, mag, thinLab, fAp, fBp, fAlpha, fPerp, l, u_beta);
      if (isProtectedDetailOrTip && l != cur && dl > dCur * 1.95 + 420.0) continue;
      float e = dl;
      for (int k = 0; k < 8; k++) {
        int nl = nLabelBuf[k];
        if (nl == -2) continue;
        if (nl != l) {
          float pairCap = (nl >= 0 && l >= 0) ? min(u_beta, fetchPalDist2(l, nl) * 0.24 + 120.0) : u_beta;
          e += pairCap * wEdge[k];
        }
      }
      if (e < bestE) { bestE = e; bestL = l; }
    }

    if (bestL != cur) {
      if (u_checkTopo == 1 && wouldChangeTopoAt(p, cur, bestL)) {
        bool isFalseHalo = fAp >= 0 && fBp >= 0 && cur != fAp && cur != fBp && fetchPalIsMidBlend(cur, fAp, fBp);
        if (!isFalseHalo) {
          outLabel = vec4(curV.rgb, 0.0);
          return;
        }
      }
      outLabel = vec4(float(bestL), curV.g, curV.b, 1.0);
      return;
    }
    outLabel = vec4(curV.rgb, 0.0);
  }`;

  /* Kernel GLSL 9: Morphological Closing (Mode 0, 4-Color Chromatic + Topo Guard) & Opening (Mode 1) */
  const FS_MORPH_CLOSE_OPEN = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_mode;
  uniform int u_colorPass;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }

    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));

    if (u_mode == 0) {
      /* Mode 0: Closing 1px Bridge (4-Color Chromatic agar wouldChangeTopoAt bebas tabrakan) */
      int parity = (p.x & 1) + ((p.y & 1) << 1);
      if (parity != u_colorPass) {
        outLabel = curV;
        return;
      }
      int bridgeL = -1;
      if (lL >= 0 && lL == lR && lL != cur && lU != lL && lD != lL) bridgeL = lL;
      else if (lU >= 0 && lU == lD && lU != cur && lL != lU && lR != lU) bridgeL = lU;
      if (bridgeL >= 0 && bridgeL < u_K) {
        int cntB = 0;
        for (int dy = -1; dy <= 1; dy++) {
          for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            if (int(round(texelFetch(u_labels, p + ivec2(dx, dy), 0).r)) == bridgeL) cntB++;
          }
        }
        if (cntB >= 3) {
          vec3 r0 = fetchRaw(p);
          float dBridge = cdist2(r0, fetchPalRGB(bridgeL));
          float dCur = cdist2(r0, fetchPalRGB(cur));
          if (dBridge <= dCur * 1.25 + 420.0 && !wouldChangeTopoAt(p, cur, bridgeL)) {
            outLabel = vec4(float(bridgeL), curV.g, curV.b, curV.a);
            return;
          }
        }
      }
      outLabel = curV;
      return;
    }

    /* Mode 1: Opening 1px Protrusion (Tanpa memotong sudut lancip) */
    int nbsOrtho[4] = int[4](lL, lR, lU, lD);
    int sameOrtho = 0, sameDir = -1;
    int vLab[8];
    int vCnt[8];
    int nV = 0;
    for (int k = 0; k < 4; k++) {
      int nl = nbsOrtho[k];
      if (nl == cur) { sameOrtho++; sameDir = k; }
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 2;
      }
    }
    if (sameOrtho > 1) { outLabel = curV; return; }

    int sameDiag = 0, fwdDiagSame = 0;
    int stepDx0 = (sameDir == 0) ? -1 : (sameDir == 1) ? 1 : 0;
    int stepDy0 = (sameDir == 2) ? -1 : (sameDir == 3) ? 1 : 0;
    const ivec2 DIAGS[4] = ivec2[4](ivec2(-1,-1), ivec2(1,-1), ivec2(-1,1), ivec2(1,1));
    for (int k = 0; k < 4; k++) {
      int ddx = DIAGS[k].x, ddy = DIAGS[k].y;
      int nl = int(round(texelFetch(u_labels, p + ivec2(ddx, ddy), 0).r));
      if (nl == cur) {
        sameDiag++;
        if (sameOrtho == 1 && (ddx * stepDx0 + ddy * stepDy0) <= 0) fwdDiagSame++;
      } else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 1;
      }
    }
    if (sameOrtho == 0 && sameDiag >= 1) { outLabel = curV; return; }
    if (sameOrtho == 1 && (fwdDiagSame > 0 || sameDiag >= 1)) { outLabel = curV; return; }

    int domBg = -1, maxV = 0;
    for (int j = 0; j < 8; j++) {
      if (j >= nV) break;
      if (vCnt[j] > maxV) { maxV = vCnt[j]; domBg = vLab[j]; }
    }
    if (domBg < 0 || domBg >= u_K) { outLabel = curV; return; }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(cur));
    float dBg = cdist2(r0, fetchPalRGB(domBg));
    if (sameOrtho == 0 && dCur > dBg * 1.15) {
      outLabel = vec4(float(domBg), curV.g, curV.b, curV.a);
      return;
    }
    if (sameOrtho == 1 && sameDiag == 0 && dCur > dBg * 1.35) {
      outLabel = vec4(float(domBg), curV.g, curV.b, curV.a);
      return;
    }
    outLabel = curV;
  }`;

  /* Kernel GLSL 10: Sandwiched Boundary Ribbon Erosion (erodeSandwichedBoundaryRibbons) */
  const FS_RIBBON_ERODE = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  out vec4 outLabel;

  bool is2x2CoreAt(ivec2 p, int L, int W, int H) {
    for (int dy = -2; dy <= 1; dy++) {
      int y0 = p.y + dy;
      if (y0 < 0 || y0 + 1 >= H) continue;
      for (int dx = -2; dx <= 1; dx++) {
        int x0 = p.x + dx;
        if (x0 < 0 || x0 + 1 >= W) continue;
        int l00 = int(round(texelFetch(u_labels, ivec2(x0, y0), 0).r));
        int l10 = int(round(texelFetch(u_labels, ivec2(x0 + 1, y0), 0).r));
        int l01 = int(round(texelFetch(u_labels, ivec2(x0, y0 + 1), 0).r));
        int l11 = int(round(texelFetch(u_labels, ivec2(x0 + 1, y0 + 1), 0).r));
        if (l00 == L && l10 == L && l01 == L && l11 == L) return true;
      }
    }
    return false;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 2 || p.x >= W - 2 || p.y < 2 || p.y >= H - 2 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }
    if (is2x2CoreAt(p, cur, W, H)) {
      outLabel = curV;
      return;
    }

    int pairA = -1, pairB = -1;
    const ivec2 AXES[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
    for (int a = 0; a < 4; a++) {
      if (pairA >= 0) break;
      ivec2 d = AXES[a];
      int la = -1, lb = -1;
      for (int s = 1; s <= 2; s++) {
        int nl = int(round(texelFetch(u_labels, p - d * s, 0).r));
        if (nl != cur && nl >= 0) { la = nl; break; }
      }
      for (int s = 1; s <= 2; s++) {
        int nl = int(round(texelFetch(u_labels, p + d * s, 0).r));
        if (nl != cur && nl >= 0) { lb = nl; break; }
      }
      if (la >= 0 && lb >= 0 && la != lb) { pairA = la; pairB = lb; }
    }
    if (pairA < 0 || pairB < 0) {
      outLabel = curV;
      return;
    }

    vec3 r0 = fetchRaw(p);
    vec3 cA = fetchPalRGB(pairA), cB = fetchPalRGB(pairB), cCur = fetchPalRGB(cur);
    float lum0 = dot(r0, vec3(0.299, 0.587, 0.114));
    float lumA = dot(cA, vec3(0.299, 0.587, 0.114));
    float lumB = dot(cB, vec3(0.299, 0.587, 0.114));
    float lumCur = dot(cCur, vec3(0.299, 0.587, 0.114));
    if (lum0 > max(lumA, lumB) + 6.0 || lum0 < min(lumA, lumB) - 6.0 ||
        lumCur > max(lumA, lumB) + 8.0 || lumCur < min(lumA, lumB) - 8.0) {
      outLabel = curV;
      return;
    }
    float dCur = cdist2(r0, cCur);
    float blT = 0.5, blPerp = 0.0;
    bool hasBlend = evalColorBlendPair(r0, cA, cB, blT, blPerp);
    bool isPalMid = fetchPalIsMidBlend(cur, pairA, pairB);
    if (hasBlend && (isPalMid || dCur > blPerp * 2.5 + 900.0)) {
      int nextL = (blT >= 0.5) ? pairA : pairB;
      outLabel = vec4(float(nextL), curV.g, curV.b, curV.a);
      return;
    }
    outLabel = curV;
  }`;

  /* Kernel GLSL 11: Parasitic Pimple/Hook Clean (absorbBoundaryParasites, 4-Color Chromatic + Topo Guard) */
  const FS_PARASITE_CLEAN = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_colorPass;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }
    int parity = (p.x & 1) + ((p.y & 1) << 1);
    if (parity != u_colorPass) {
      outLabel = curV;
      return;
    }

    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));
    int nbsOrtho[4] = int[4](lL, lR, lU, lD);
    int sameOrtho = 0, sameDir = -1;
    int vLab[8];
    int vCnt[8];
    int nV = 0;

    for (int k = 0; k < 4; k++) {
      int nl = nbsOrtho[k];
      if (nl == cur) { sameOrtho++; sameDir = k; }
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 2;
      }
    }
    if (sameOrtho > 1) { outLabel = curV; return; }

    int sameDiag = 0;
    const ivec2 DIAGS[4] = ivec2[4](ivec2(-1,-1), ivec2(1,-1), ivec2(-1,1), ivec2(1,1));
    for (int k = 0; k < 4; k++) {
      int nl = int(round(texelFetch(u_labels, p + DIAGS[k], 0).r));
      if (nl == cur) sameDiag++;
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 1;
      }
    }

    int domNb = -1, bestV = 0;
    for (int j = 0; j < 8; j++) {
      if (j >= nV) break;
      if (vCnt[j] > bestV) { bestV = vCnt[j]; domNb = vLab[j]; }
    }
    if (domNb < 0 || bestV < 6) { outLabel = curV; return; }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(cur));
    float dDom = cdist2(r0, fetchPalRGB(domNb));

    if (sameOrtho == 1) {
      int stepDx = (sameDir == 0) ? -1 : (sameDir == 1) ? 1 : 0;
      int stepDy = (sameDir == 2) ? -1 : (sameDir == 3) ? 1 : 0;
      int bx = clamp(p.x + stepDx, 1, W - 2);
      int by = clamp(p.y + stepDy, 1, H - 2);
      int perpDx = stepDy, perpDy = stepDx;
      int backSpread = 0;
      for (int s = -1; s <= 1; s++) {
        if (int(round(texelFetch(u_labels, ivec2(bx + perpDx * s, by + perpDy * s), 0).r)) == cur) backSpread++;
      }
      if (backSpread >= 2 && dCur <= dDom * 0.85) { outLabel = curV; return; }
    }
    if ((sameOrtho + sameDiag >= 1) && dCur < dDom * 0.45 && dCur < 600.0) { outLabel = curV; return; }
    if (wouldChangeTopoAt(p, cur, domNb)) { outLabel = curV; return; }

    outLabel = vec4(float(domNb), curV.g, curV.b, curV.a);
  }`;

  /* Kernel GLSL 12: 2x2 Checkerboard Saddle Resolver (resolveCheckerboardSaddles, 4-Pass Non-Overlapping 2x2 Blocks) */
  const FS_CHECKERBOARD_SADDLE = `#version 300 es
  precision highp float;
  precision highp int;
  ` + GLSL_TAHAP3_COMMON + `
  uniform int u_blockParity;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);

    /* Tentukan sudut kiri-atas (x0, y0) dari blok 2x2 dengan paritas u_blockParity (0..3) yang memuat piksel p */
    int ox = u_blockParity & 1;
    int oy = (u_blockParity >> 1) & 1;
    int dx = (p.x - ox) & 1;
    int dy = (p.y - oy) & 1;
    int x0 = p.x - dx;
    int y0 = p.y - dy;
    if (x0 < 0 || y0 < 0 || x0 + 1 >= W || y0 + 1 >= H) {
      outLabel = curV;
      return;
    }

    ivec2 q00 = ivec2(x0, y0), q10 = ivec2(x0 + 1, y0), q01 = ivec2(x0, y0 + 1), q11 = ivec2(x0 + 1, y0 + 1);
    vec4 v00 = texelFetch(u_labels, q00, 0), v10 = texelFetch(u_labels, q10, 0);
    vec4 v01 = texelFetch(u_labels, q01, 0), v11 = texelFetch(u_labels, q11, 0);
    if (v00.g > 0.5 || v10.g > 0.5 || v01.g > 0.5 || v11.g > 0.5) {
      outLabel = curV;
      return;
    }
    int l00 = int(round(v00.r)), l10 = int(round(v10.r)), l01 = int(round(v01.r)), l11 = int(round(v11.r));
    if (l00 < 0 || l10 < 0 || !(l00 == l11 && l10 == l01 && l00 != l10)) {
      outLabel = curV;
      return;
    }

    int ts00 = int(round(texelFetch(u_nearTex, q00, 0).r));
    int ts10 = int(round(texelFetch(u_nearTex, q10, 0).r));
    int ts01 = int(round(texelFetch(u_nearTex, q01, 0).r));
    int ts11 = int(round(texelFetch(u_nearTex, q11, 0).r));

    bool prot00_11 = (ts00 == l00 || ts11 == l00) || (v00.b > 0.5 || v11.b > 0.5);
    bool prot10_01 = (ts10 == l10 || ts01 == l10) || (v10.b > 0.5 || v01.b > 0.5);

    ivec2 cPts[4] = ivec2[4](q00, q11, q10, q01);
    int cCur[4] = int[4](l00, l00, l10, l10);
    int cAlt[4] = int[4](l10, l10, l00, l00);
    int startIdx = (prot00_11 && !prot10_01) ? 2 : 0;
    int endIdx = (prot10_01 && !prot00_11) ? 2 : 4;

    vec3 CA = fetchPalRGB(l00), CB = fetchPalRGB(l10);
    ivec2 bestQ = cPts[startIdx];
    int bestNewL = cAlt[startIdx];
    for (int k = 0; k < 4; k++) {
      if (k < startIdx || k >= endIdx) continue;
      if (int(round(texelFetch(u_nearTex, cPts[k], 0).r)) != cCur[k]) {
        bestQ = cPts[k];
        bestNewL = cAlt[k];
        break;
      }
    }
    float minPenalty = 1e20;

    int ringA = 0, ringB = 0;
    for (int ry = -1; ry <= 2; ry++) {
      for (int rx = -1; rx <= 2; rx++) {
        if (rx >= 0 && rx <= 1 && ry >= 0 && ry <= 1) continue;
        ivec2 rp = clamp(ivec2(x0 + rx, y0 + ry), ivec2(0), ivec2(W - 1, H - 1));
        int rl = int(round(texelFetch(u_labels, rp, 0).r));
        if (rl == l00) ringA++;
        else if (rl == l10) ringB++;
      }
    }
    float lumA = dot(CA, vec3(0.299, 0.587, 0.114));
    float lumB = dot(CB, vec3(0.299, 0.587, 0.114));
    for (int k = 0; k < 4; k++) {
      if (k < startIdx || k >= endIdx) continue;
      ivec2 q = cPts[k];
      int curL = cCur[k], altL = cAlt[k];
      if (int(round(texelFetch(u_nearTex, q, 0).r)) == curL) continue;
      if (wouldChangeTopoAt(q, curL, altL)) continue;
      vec3 rq = fetchRaw(q);
      vec3 Calt = (altL == l00) ? CA : CB;
      vec3 Ccur = (curL == l00) ? CA : CB;
      float pen = cdist2(rq, Calt) - cdist2(rq, Ccur);
      if (ringA >= 4 && ringB >= 4) {
        bool altIsLighter = (altL == l00) ? (lumA > lumB) : (lumB > lumA);
        if (altIsLighter) pen -= 950.0;
      }
      if (pen < minPenalty) {
        minPenalty = pen;
        bestQ = q;
        bestNewL = altL;
      }
    }

    if (p.x == bestQ.x && p.y == bestQ.y) {
      outLabel = vec4(float(bestNewL), curV.g, curV.b, curV.a);
    } else {
      outLabel = curV;
    }
  }`;

  /* Sinkronisasi Konteks Segmentasi & Palet LUT ke VRAM untuk Tahap 3 */
  function syncSegCtxToGpu(env, work, mask, palette, ctx, labels) {
    const { gl, extFloat } = env;
    if (!extFloat) return null;
    const { w, h } = work;
    const K = palette.length;
    if (K < 2 || K > 64 || w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize || K * K > HW_LIMITS.gpu.maxTexSize) {
      return null;
    }

    const rawD = (ctx && ctx.rawD) || (work.rawRgba && work.rawRgba.length === w * h * 4 ? work.rawRgba : work.data.data);
    const fltD = (ctx && ctx.fltD) || work.data.data;
    const cacheTarget = ctx || work;
    const palSig = K + ':' + (palette[0] ? palette[0].r + ',' + palette[0].g + ',' + palette[0].b : '') + ':' + (palette[K - 1] ? palette[K - 1].r + ',' + palette[K - 1].g + ',' + palette[K - 1].b : '');
    const needStaticUpload = !cacheTarget._gpuStaticSynced || cacheTarget._gpuStaticW !== w || cacheTarget._gpuStaticH !== h || cacheTarget._gpuStaticPalSig !== palSig;

    let rawSlot = GPUMemPool.getSlot('texRawRGBA');
    let fltSlot = GPUMemPool.getSlot('texFltRGBA');
    if (needStaticUpload || !rawSlot || !fltSlot || rawSlot.w !== w || rawSlot.h !== h) {
      rawSlot = uploadBufferToSlot(gl, 'texRawRGBA', w, h, rawD, false);
      fltSlot = uploadBufferToSlot(gl, 'texFltRGBA', w, h, fltD, false);
    }
    if (!rawSlot || !fltSlot) return null;

    /* Pastikan texEdgeField, texTensor, texFlanks, texLabGrad tersedia dan tersinkronisasi untuk dimensi (w, h) */
    let edgeSlot = GPUMemPool.getSlot('texEdgeField');
    if (needStaticUpload || !edgeSlot || edgeSlot.w !== w || edgeSlot.h !== h || !edgeSlot.isFloat) {
      edgeSlot = GPUMemPool.allocateSlot(gl, 'texEdgeField', w, h, true);
      if (!edgeSlot) return null;
      const eBuf = MemPool.acquire(Float32Array, w * h * 4);
      const gx = ctx && ctx.gx, gy = ctx && ctx.gy, mag = ctx && ctx.mag;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        eBuf[i]     = gx ? gx[p] : 0;
        eBuf[i + 1] = gy ? gy[p] : 0;
        eBuf[i + 2] = mag ? mag[p] : 0;
        eBuf[i + 3] = 0;
      }
      uploadBufferToSlot(gl, 'texEdgeField', w, h, eBuf, true);
      MemPool.release(eBuf);
    }

    let tensorSlot = GPUMemPool.getSlot('texTensor');
    if (needStaticUpload || !tensorSlot || tensorSlot.w !== w || tensorSlot.h !== h || !tensorSlot.isFloat) {
      tensorSlot = GPUMemPool.allocateSlot(gl, 'texTensor', w, h, true);
      if (!tensorSlot) return null;
      const tBuf = MemPool.acquire(Float32Array, w * h * 4);
      const nx = ctx && ctx.nxArr, ny = ctx && ctx.nyArr, coh = ctx && ctx.cohArr, crn = ctx && ctx.cornerArr;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        tBuf[i]     = nx ? nx[p] : 0;
        tBuf[i + 1] = ny ? ny[p] : 0;
        tBuf[i + 2] = coh ? coh[p] : 0;
        tBuf[i + 3] = crn ? crn[p] : 0;
      }
      uploadBufferToSlot(gl, 'texTensor', w, h, tBuf, true);
      MemPool.release(tBuf);
    }

    let flankSlot = GPUMemPool.getSlot('texFlanks');
    if (needStaticUpload || !flankSlot || flankSlot.w !== w || flankSlot.h !== h || !flankSlot.isFloat) {
      flankSlot = GPUMemPool.allocateSlot(gl, 'texFlanks', w, h, true);
      if (!flankSlot) return null;
      const fBuf = MemPool.acquire(Float32Array, w * h * 4);
      const fA = ctx && ctx.flankA, fB = ctx && ctx.flankB, fAl = ctx && ctx.flankAlpha, fPr = ctx && ctx.flankPerp;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        fBuf[i]     = fA ? fA[p] : -1;
        fBuf[i + 1] = fB ? fB[p] : -1;
        fBuf[i + 2] = fAl ? fAl[p] : 0.5;
        fBuf[i + 3] = fPr ? fPr[p] : 0;
      }
      uploadBufferToSlot(gl, 'texFlanks', w, h, fBuf, true);
      MemPool.release(fBuf);
    }

    /* Sinkronkan thinStrokeLab ke texLabGrad (.r) sekali saja per konteks */
    let nearSlot = GPUMemPool.getSlot('texLabGrad');
    if (needStaticUpload || !nearSlot || nearSlot.w !== w || nearSlot.h !== h || !nearSlot.isFloat) {
      nearSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
      if (!nearSlot) return null;
      const nBuf = MemPool.acquire(Float32Array, w * h * 4);
      const ts = (ctx && ctx.thinStrokeLab) || (labels && labels._segCtx && labels._segCtx.thinStrokeLab);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        nBuf[i]     = ts ? ts[p] : -1;
        nBuf[i + 1] = 0;
        nBuf[i + 2] = 0;
        nBuf[i + 3] = 1;
      }
      uploadBufferToSlot(gl, 'texLabGrad', w, h, nBuf, true);
      MemPool.release(nBuf);
    }

    /* Bangun & unggah LUT pasangan palet (K*K x K) ke texPalLut sekali saja per palet */
    const lutW = K * K, lutH = K;
    let palLutSlot = GPUMemPool.getSlot('texPalLut');
    if (needStaticUpload || !palLutSlot || palLutSlot.w !== lutW || palLutSlot.h !== lutH || !palLutSlot.isFloat) {
      palLutSlot = GPUMemPool.allocateSlot(gl, 'texPalLut', lutW, lutH, true);
      if (!palLutSlot) return null;
      const lutBuf = new Float32Array(lutW * lutH * 4);
      const palDist2 = ctx ? ctx.palDist2 : null;
      const palIsMidBlend = ctx ? ctx.palIsMidBlend : null;
      for (let l = 0; l < K; l++) {
        const cl = palette[l] || { r: 0, g: 0, b: 0 };
        const packedGB = cl.g + cl.b * 256.0;
        for (let a = 0; a < K; a++) {
          for (let b = 0; b < K; b++) {
            const ab = a * K + b;
            const idx = (l * lutW + ab) * 4;
            const d2 = palDist2 ? palDist2[ab] : cdist2(palette[a].r, palette[a].g, palette[a].b, palette[b].r, palette[b].g, palette[b].b);
            const mid = palIsMidBlend ? palIsMidBlend[l * K * K + ab] : 0;
            lutBuf[idx]     = d2;
            lutBuf[idx + 1] = mid ? 1.0 : 0.0;
            lutBuf[idx + 2] = cl.r;
            lutBuf[idx + 3] = packedGB;
          }
        }
      }
      uploadBufferToSlot(gl, 'texPalLut', lutW, lutH, lutBuf, true);
    }
    cacheTarget._gpuStaticSynced = true;
    cacheTarget._gpuStaticW = w;
    cacheTarget._gpuStaticH = h;
    cacheTarget._gpuStaticPalSig = palSig;

    /* Unggah labels, mask, dan _detailProt ke texLabelsA */
    const labSlotA = GPUMemPool.allocateSlot(gl, 'texLabelsA', w, h, true);
    const labSlotB = GPUMemPool.allocateSlot(gl, 'texLabelsB', w, h, true);
    if (!labSlotA || !labSlotB) return null;
    {
      const lBuf = MemPool.acquire(Float32Array, w * h * 4);
      const detailProt = labels._detailProt || null;
      const origA = work && work.origAlpha ? work.origAlpha : null;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        lBuf[i]     = labels[p];
        lBuf[i + 1] = (mask && mask[p]) ? 1.0 : 0.0;
        lBuf[i + 2] = (detailProt && detailProt[p]) ? 1.0 : 0.0;
        lBuf[i + 3] = origA ? (origA[p] / 255.0) : 1.0;
      }
      uploadBufferToSlot(gl, 'texLabelsA', w, h, lBuf, true);
      MemPool.release(lBuf);
    }

    return {
      rawSlot, fltSlot, edgeSlot, tensorSlot, flankSlot, nearSlot, palLutSlot, labSlotA, labSlotB, w, h, K
    };
  }

  function bindTahap3CommonUniforms(g, prog, state, srcLabelTex) {
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, srcLabelTex);        g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, state.rawSlot.tex);   g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
    g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, state.fltSlot.tex);   g.uniform1i(g.getUniformLocation(prog, 'u_fltTex'), 2);
    g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, state.edgeSlot.tex);  g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 3);
    g.activeTexture(g.TEXTURE4); g.bindTexture(g.TEXTURE_2D, state.tensorSlot.tex);g.uniform1i(g.getUniformLocation(prog, 'u_tensorTex'), 4);
    g.activeTexture(g.TEXTURE5); g.bindTexture(g.TEXTURE_2D, state.flankSlot.tex); g.uniform1i(g.getUniformLocation(prog, 'u_flankTex'), 5);
    g.activeTexture(g.TEXTURE6); g.bindTexture(g.TEXTURE_2D, state.nearSlot.tex);  g.uniform1i(g.getUniformLocation(prog, 'u_nearTex'), 6);
    g.activeTexture(g.TEXTURE7); g.bindTexture(g.TEXTURE_2D, state.palLutSlot.tex);g.uniform1i(g.getUniformLocation(prog, 'u_palLut'), 7);
    g.uniform2f(g.getUniformLocation(prog, 'u_res'), state.w, state.h);
    g.uniform1i(g.getUniformLocation(prog, 'u_K'), state.K);
  }

  function readbackLabelsFromSlot(gl, slot, labels, w, h) {
    const outBuf = MemPool.acquire(Float32Array, w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, slot.fbo);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, outBuf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let changed = 0;
    for (let p = 0; p < w * h; p++) {
      const nl = Math.round(outBuf[p * 4]);
      if (labels[p] !== nl) {
        labels[p] = nl;
        changed++;
      }
    }
    MemPool.release(outBuf);
    return changed;
  }

  function gpuLocalNeighborhoodEdgeSnap(work, mask, labels, palette, passes = 4, segCtx = null) {
    return false; /* Jalankan opposite-side sandwich snap eksak di CPU (< 8ms pada ~2% piksel batas) */
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let pass = 0; pass < passes; pass++) {
        const okA = runSlotPass(env, 'edgeSnapAnchor', FS_EDGE_SNAP_ANCHOR, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_pass'), pass);
        });
        if (!okA) return false;
        const okB = runSlotPass(env, 'edgeSnapStep', FS_EDGE_SNAP_STEP, curSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, nxtSlot.tex);
        });
        if (!okB) return false;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuSegmentMRF(work, mask, labels, palette, opt = {}, segCtx = null, onTick = null) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;

      const baseBeta = opt.beta || 1350;
      const maxIter = opt.maxIter || 20;
      const singleStepMode = maxIter === 1 && typeof opt.iterIndex === 'number';
      const startIt = typeof opt.startIter === 'number' ? opt.startIter : (singleStepMode ? opt.iterIndex : 0);
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;

      /* Urutan rotasi warna kromatik (0..3) yang bergeser setiap iterasi untuk konvergensi isotropik */
      const COLOR_ORDERS = [
        [0, 3, 1, 2],
        [3, 0, 2, 1],
        [1, 2, 0, 3],
        [2, 1, 3, 0]
      ];

      for (let it = 0; it < maxIter; it++) {
        const effIt = startIt + it;
        const effTotal = opt.totalIters || maxIter;
        const anneal = (singleStepMode && typeof opt.startIter !== 'number') ? 1.0 : (0.55 + 0.55 * (effIt / Math.max(1, effTotal - 1)));
        const beta = baseBeta * anneal;
        const checkTopo = (opt.topology !== false && effIt >= 1) ? 1 : 0;
        const order = COLOR_ORDERS[effIt & 3];

        for (let c = 0; c < 4; c++) {
          const colorPass = order[c];
          const ok = runSlotPass(env, 'mrfPotts4Color', FS_MRF_POTTS_4COLOR, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), colorPass);
            g.uniform1f(g.getUniformLocation(prog, 'u_beta'), beta);
            g.uniform1i(g.getUniformLocation(prog, 'u_checkTopo'), checkTopo);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
        if (onTick) onTick((it + 1) / maxIter, 0);
      }

      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuErodeSandwichedRibbons(labels, w, h, work, palette, mask, segCtx = null) {
    return false; /* Jalankan multi-step ribbon erosion eksak di CPU (< 5ms) */
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let pass = 0; pass < 2; pass++) {
        const ok = runSlotPass(env, 'ribbonErode', FS_RIBBON_ERODE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuResolveCheckerboardSaddles(labels, w, h, work, palette, mask) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, mask, palette, ctx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let bp = 0; bp < 4; bp++) {
        const ok = runSlotPass(env, 'checkerboardSaddle', FS_CHECKERBOARD_SADDLE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_blockParity'), bp);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuAbsorbBoundaryParasites(labels, w, h, work, palette, mask) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, mask, palette, ctx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;
      for (let pass = 0; pass < 2; pass++) {
        for (let c = 0; c < 4; c++) {
          const ok = runSlotPass(env, 'parasiteClean', FS_PARASITE_CLEAN, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), c);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }
      for (let bp = 0; bp < 4; bp++) {
        const ok = runSlotPass(env, 'checkerboardSaddle', FS_CHECKERBOARD_SADDLE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_blockParity'), bp);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gpuMorphCleanStrokes(labels, w, h, work, palette, mask, segCtx = null) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    try {
      const state = syncSegCtxToGpu(env, work, mask, palette, segCtx, labels);
      if (!state) return false;
      let curSlot = state.labSlotA, nxtSlot = state.labSlotB;

      /* 1. Closing 1px Bridge (4-Color Chromatic dengan Topo Guard) */
      for (let c = 0; c < 4; c++) {
        const ok = runSlotPass(env, 'morphCloseOpen', FS_MORPH_CLOSE_OPEN, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_mode'), 0);
          g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), c);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* 2. Opening 1px Protrusion */
      {
        const ok = runSlotPass(env, 'morphCloseOpen', FS_MORPH_CLOSE_OPEN, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_mode'), 1);
          g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), 0);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* 3. Sandwiched Boundary Ribbon Erosion (2 Pass di VRAM tanpa readback antara) */
      for (let pass = 0; pass < 2; pass++) {
        const ok = runSlotPass(env, 'ribbonErode', FS_RIBBON_ERODE, nxtSlot, (g, prog) => {
          bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
        });
        if (!ok) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* 4. Parasitic Pimple/Hook Clean (2 Pass x 4-Color Chromatic di VRAM) */
      for (let pass = 0; pass < 2; pass++) {
        for (let c = 0; c < 4; c++) {
          const ok = runSlotPass(env, 'parasiteClean', FS_PARASITE_CLEAN, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_colorPass'), c);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      /* 5. 2x2 Checkerboard Saddle Resolver (2 Sweep x 4-Pass Non-Overlapping Blocks di VRAM) */
      for (let sweep = 0; sweep < 2; sweep++) {
        for (let bp = 0; bp < 4; bp++) {
          const ok = runSlotPass(env, 'checkerboardSaddle', FS_CHECKERBOARD_SADDLE, nxtSlot, (g, prog) => {
            bindTahap3CommonUniforms(g, prog, state, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_blockParity'), bp);
          });
          if (!ok) return false;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      /* Readback tunggal ke RAM setelah seluruh rangkaian 5 tahap pembersihan di VRAM selesai! */
      readbackLabelsFromSlot(env.gl, curSlot, labels, state.w, state.h);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ============================================================================
     TAHAP 4 SHADERS: Planar Vertex Valence, Sub-Pixel Beach Deconvolution
     (2x2 Square Area Inversion + Border Extrapolation + Corner/Junction Ray
     Intersection + 6-Pass Anisotropic Taubin Relaxation) pada Kisi (w+1)x(h+1)
     `bufVerticesA/B` + Parallel Contour Taubin/Despeckle Fairing di GPU
     ============================================================================ */
  const GLSL_TAHAP4_VERTEX_COMMON = `#version 300 es
  precision highp float;
  precision highp int;

  uniform sampler2D u_labels;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_palLut;
  uniform sampler2D u_vtx;
  uniform sampler2D u_refTex;
  uniform ivec2 u_imgRes;
  uniform int u_K;
  uniform int u_hasOrigAlpha;
  uniform float u_weight;

  int lblAt(int px, int py) {
    if (px < 0 || py < 0 || px >= u_imgRes.x || py >= u_imgRes.y) return -1;
    return int(round(texelFetch(u_labels, ivec2(px, py), 0).r));
  }

  vec3 fetchPalRGB(int l) {
    if (l < 0 || l >= u_K) return vec3(0.0);
    vec4 v = texelFetch(u_palLut, ivec2(0, l), 0);
    float r = v.b;
    float b = floor(v.a / 256.0);
    float g = v.a - b * 256.0;
    return vec3(r, g, b);
  }

  int vertexValence(ivec2 v) {
    int nw = lblAt(v.x - 1, v.y - 1);
    int ne = lblAt(v.x,     v.y - 1);
    int sw = lblAt(v.x - 1, v.y    );
    int se = lblAt(v.x,     v.y    );
    int deg = 0;
    if (nw != ne) deg++;
    if (ne != se) deg++;
    if (se != sw) deg++;
    if (sw != nw) deg++;
    return deg;
  }

  /* Mengembalikan tetangga aktif pada kisi verteks (w+1)x(h+1) dalam urutan persis CPU adj.get(k):
     1. Up (v.x, v.y - 1)
     2. Left (v.x - 1, v.y)
     3. Right (v.x + 1, v.y)
     4. Down (v.x, v.y + 1) */
  int getGridNeighbors(ivec2 v, out ivec2 nbs[4]) {
    int cnt = 0;
    int w = u_imgRes.x, h = u_imgRes.y;
    if (v.y > 0 && v.x > 0 && v.x < w && lblAt(v.x - 1, v.y - 1) != lblAt(v.x, v.y - 1)) {
      nbs[cnt++] = ivec2(v.x, v.y - 1);
    }
    if (v.x > 0 && v.y > 0 && v.y < h && lblAt(v.x - 1, v.y - 1) != lblAt(v.x - 1, v.y)) {
      nbs[cnt++] = ivec2(v.x - 1, v.y);
    }
    if (v.x < w && v.y > 0 && v.y < h && lblAt(v.x, v.y - 1) != lblAt(v.x, v.y)) {
      nbs[cnt++] = ivec2(v.x + 1, v.y);
    }
    if (v.y < h && v.x > 0 && v.x < w && lblAt(v.x - 1, v.y) != lblAt(v.x, v.y)) {
      nbs[cnt++] = ivec2(v.x, v.y + 1);
    }
    return cnt;
  }

  /* Penelusuran rantai batas kisi (ekuivalen walkChainKeys di CPU) */
  int walkChainGrid(ivec2 startV, ivec2 firstNb, int maxSteps, out ivec2 chain[9]) {
    chain[0] = startV;
    int len = 1;
    ivec2 cur = firstNb;
    ivec2 prev = startV;
    for (int s = 1; s <= 8; s++) {
      if (s > maxSteps) break;
      chain[len++] = cur;
      if (vertexValence(cur) != 2) break;
      ivec2 cnbs[4];
      int cCnt = getGridNeighbors(cur, cnbs);
      if (cCnt != 2) break;
      ivec2 nxt = (cnbs[0].x == prev.x && cnbs[0].y == prev.y) ? cnbs[1] : cnbs[0];
      prev = cur;
      cur = nxt;
    }
    return len;
  }

  /* Penelusuran lengan lurus kisi hingga maxSteps=8 (ekuivalen walkStraightArmKeys di CPU) */
  int walkStraightArmGrid(ivec2 startV, ivec2 firstNb, int maxSteps, out ivec2 chain[9]) {
    chain[0] = startV;
    chain[1] = firstNb;
    int len = 2;
    ivec2 prev = startV;
    ivec2 cur = firstNb;
    int dx0 = firstNb.x - startV.x;
    int dy0 = firstNb.y - startV.y;
    for (int s = 1; s < 8; s++) {
      if (s >= maxSteps) break;
      if (vertexValence(cur) != 2) break;
      ivec2 cnbs[4];
      int cCnt = getGridNeighbors(cur, cnbs);
      if (cCnt != 2) break;
      ivec2 nxt = (cnbs[0].x == prev.x && cnbs[0].y == prev.y) ? cnbs[1] : cnbs[0];
      if (nxt.x == startV.x && nxt.y == startV.y) break;
      int dx = nxt.x - cur.x;
      int dy = nxt.y - cur.y;
      if (dx * dx0 + dy * dy0 <= 0 && len >= 3) break;
      chain[len++] = nxt;
      prev = cur;
      cur = nxt;
    }
    return len;
  }

  /* Inversi Luas Persegi 2x2 Sub-Piksel Eksak (invert2x2SquareShift) */
  float invert2x2SquareShiftGL(float alphaBar, float nx, float ny) {
    float a = max(abs(nx), abs(ny));
    float b = min(abs(nx), abs(ny));
    float al = clamp(alphaBar, 0.0, 1.0);
    if (a < 1e-6) return 0.0;
    float trans = b / (2.0 * a);
    float s;
    if (al < trans && b > 1e-5) {
      s = -((a + b) - sqrt(max(0.0, 8.0 * a * b * al)));
    } else if (al > 1.0 - trans && b > 1e-5) {
      s = +((a + b) - sqrt(max(0.0, 8.0 * a * b * (1.0 - al))));
    } else {
      s = 2.0 * a * (al - 0.5);
    }
    return clamp(s, -0.72, 0.72);
  }

  /* Total Least Squares 2D Line Fit (identik dengan fitLine2D di CPU) */
  bool fitLine2DGL(vec2 pts[8], int m, out vec2 c, out vec2 d, out float rms, out float maxDev, out float span) {
    if (m < 2) {
      c = vec2(0.0); d = vec2(1.0, 0.0); rms = 0.0; maxDev = 0.0; span = 0.0;
      return false;
    }
    vec2 meanP = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      meanP += pts[i];
    }
    meanP /= float(m);
    float sxx = 0.0, syy = 0.0, sxy = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      vec2 df = pts[i] - meanP;
      sxx += df.x * df.x;
      syy += df.y * df.y;
      sxy += df.x * df.y;
    }
    float th = 0.5 * atan(2.0 * sxy, sxx - syy);
    vec2 dir = vec2(cos(th), sin(th));
    vec2 chord = pts[m - 1] - pts[0];
    if (dot(dir, chord) < 0.0) dir = -dir;
    float ss = 0.0, mDev = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      vec2 df = pts[i] - meanP;
      float e = abs(df.x * dir.y - df.y * dir.x);
      if (e > mDev) mDev = e;
      ss += e * e;
    }
    c = meanP;
    d = dir;
    rms = sqrt(ss / float(m));
    maxDev = mDev;
    span = length(chord);
    return true;
  }

  /* Kåsa Circle Fit 2D pada hingga 17 titik (identik dengan fitCircle2D di CPU) */
  bool fitCircle2DGL(vec2 pts[17], int m, out float rOut, out float rmsOut) {
    rOut = 0.0; rmsOut = 999.0;
    if (m < 4) return false;
    float sx = 0.0, sy = 0.0, sx2 = 0.0, sy2 = 0.0, sxy = 0.0, sx3 = 0.0, sy3 = 0.0, sx2y = 0.0, sxy2 = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      float x = pts[i].x, y = pts[i].y;
      float x2 = x * x, y2 = y * y;
      sx += x; sy += y; sx2 += x2; sy2 += y2; sxy += x * y;
      sx3 += x2 * x; sy3 += y2 * y; sx2y += x2 * y; sxy2 += x * y2;
    }
    float fm = float(m);
    float C = fm * sx2 - sx * sx;
    float D = fm * sxy - sx * sy;
    float E = fm * sy2 - sy * sy;
    float G = 0.5 * (fm * sx3 + fm * sxy2 - sx * sx2 - sx * sy2);
    float H = 0.5 * (fm * sx2y + fm * sy3 - sy * sx2 - sy * sy2);
    float det = C * E - D * D;
    if (abs(det) < 1e-6) return false;
    float cx = (G * E - H * D) / det;
    float cy = (C * H - D * G) / det;
    float r = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      r += length(pts[i] - vec2(cx, cy));
    }
    r /= fm;
    float ss = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      float e = length(pts[i] - vec2(cx, cy)) - r;
      ss += e * e;
    }
    rOut = r;
    rmsOut = sqrt(ss / fm);
    return true;
  }
  `;

  /* PASS 1: Step A dari refineBeachPlanar — 2x2 Square Area Inversion & 90-Degree Grid Corner Deconvolution */
  const FS_VERTEX_BEACH_DECONV = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    int val = vertexValence(v);
    if (val < 2) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    if (val >= 3) {
      /* Pin = 1 dikodekan sebagai offset +16384.0 pada kanal .b */
      outVtx = vec4(float(x), float(y), 16384.0, 0.0);
      return;
    }

    int qLabs[4];
    qLabs[0] = lblAt(x - 1, y - 1);
    qLabs[1] = lblAt(x,     y - 1);
    qLabs[2] = lblAt(x - 1, y    );
    qLabs[3] = lblAt(x,     y    );
    int la = qLabs[0];
    int lb = -2, cntA2 = 0, cntB2 = 0;
    for (int i = 0; i < 4; i++) {
      if (qLabs[i] == la) cntA2++;
      else {
        if (lb == -2) lb = qLabs[i];
        if (qLabs[i] == lb) cntB2++;
      }
    }
    if (lb == -2 || cntA2 + cntB2 < 4) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }

    float ax = 0.0, ay = 0.0, an = 0.0, bx = 0.0, by = 0.0, bn = 0.0;
    int foreign = 0;
    vec3 sumA = vec3(0.0), sumB = vec3(0.0);
    float wAr = 0.0, wBr = 0.0;

    for (int j = -3; j <= 2; j++) {
      int py = y + j;
      if (py < 0 || py >= h) continue;
      for (int i = -3; i <= 2; i++) {
        int px = x + i;
        if (px < 0 || px >= w) continue;
        int L = lblAt(px, py);
        float cx = float(i) + 0.5, cy = float(j) + 0.5;
        float r2d = cx * cx + cy * cy;
        float wgt = exp(-r2d / 3.0);
        if (L == la) {
          ax += cx * wgt; ay += cy * wgt; an += wgt;
          if (r2d >= 1.5) {
            sumA += texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
            wAr += 1.0;
          }
        } else if (L == lb) {
          bx += cx * wgt; by += cy * wgt; bn += wgt;
          if (r2d >= 1.5) {
            sumB += texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
            wBr += 1.0;
          }
        } else if (i >= -2 && i <= 1 && j >= -2 && j <= 1) {
          foreign++;
        }
      }
    }

    if (an <= 0.0 || bn <= 0.0) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }

    float nx = (bx / bn) - (ax / an);
    float ny = (by / bn) - (ay / an);
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt == 2) {
      ivec2 chA[9], chB[9];
      int lenA = walkChainGrid(v, nbs[0], 3, chA);
      int lenB = walkChainGrid(v, nbs[1], 3, chB);
      ivec2 kA = chA[lenA - 1];
      ivec2 kB = chB[lenB - 1];
      float tx = float(kB.x - kA.x), ty = float(kB.y - kA.y);
      float tl = length(vec2(tx, ty));
      if (tl > 1.5) {
        float cnx = -ty / tl, cny = tx / tl;
        if (cnx * nx + cny * ny < 0.0) { cnx = -cnx; cny = -cny; }
        float nlen = length(vec2(nx, ny));
        if (nlen <= 0.0) nlen = 1.0;
        nx = 0.55 * (nx / nlen) + 0.45 * cnx;
        ny = 0.55 * (ny / nlen) + 0.45 * cny;
      }
    }
    float nl = length(vec2(nx, ny));
    if (nl < 1e-5) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    nx /= nl; ny /= nl;

    bool hasCA = (la >= 0 && la < u_K);
    bool hasCB = (lb >= 0 && lb < u_K);
    vec3 palA = hasCA ? fetchPalRGB(la) : vec3(0.0);
    vec3 palB = hasCB ? fetchPalRGB(lb) : vec3(0.0);
    vec3 CA = hasCA ? (wAr >= 2.0 ? (0.90 * (sumA / wAr) + 0.10 * palA) : palA) : vec3(0.0);
    vec3 CB = hasCB ? (wBr >= 2.0 ? (0.90 * (sumB / wBr) + 0.10 * palB) : palB) : vec3(0.0);
    vec3 dC = (hasCA && hasCB) ? (CA - CB) : vec3(0.0);
    float denom = dot(dC, dC);

    float sumAlpha = 0.0;
    int cntAlpha = 0;
    for (int j = -1; j <= 0; j++) {
      int py = y + j;
      for (int i = -1; i <= 0; i++) {
        int px = x + i;
        if (denom > 64.0) {
          vec3 irgb = texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
          float alpha = clamp(dot(irgb - CB, dC) / denom, 0.0, 1.0);
          sumAlpha += alpha;
          cntAlpha++;
        } else if ((la == -1 || lb == -1) && u_hasOrigAlpha == 1) {
          float aVal = texelFetch(u_labels, ivec2(px, py), 0).a;
          sumAlpha += (la == -1 ? 1.0 - aVal : aVal);
          cntAlpha++;
        }
      }
    }

    float vx = float(x), vy = float(y);
    bool isGridCorner90 = (foreign == 0) && ((cntA2 == 1 && cntB2 == 3) || (cntA2 == 3 && cntB2 == 1));
    if (isGridCorner90 && cntAlpha == 4 && denom > 64.0) {
      float a00 = clamp(dot(texelFetch(u_rawTex, ivec2(x - 1, y - 1), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a10 = clamp(dot(texelFetch(u_rawTex, ivec2(x,     y - 1), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a01 = clamp(dot(texelFetch(u_rawTex, ivec2(x - 1, y    ), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a11 = clamp(dot(texelFetch(u_rawTex, ivec2(x,     y    ), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      bool topDiff = (qLabs[0] != qLabs[1]), botDiff = (qLabs[2] != qLabs[3]);
      bool leftDiff = (qLabs[0] != qLabs[2]), rightDiff = (qLabs[1] != qLabs[3]);
      float alphaX = topDiff ? 0.5 * (a00 + a10) : (botDiff ? 0.5 * (a01 + a11) : 0.5);
      float alphaY = leftDiff ? 0.5 * (a00 + a01) : (rightDiff ? 0.5 * (a10 + a11) : 0.5);
      float signX = topDiff ? (qLabs[0] == la ? 1.0 : -1.0) : (qLabs[2] == la ? 1.0 : -1.0);
      float signY = leftDiff ? (qLabs[0] == la ? 1.0 : -1.0) : (qLabs[1] == la ? 1.0 : -1.0);
      vx = float(x) + signX * clamp(alphaX - 0.5, -0.42, 0.42);
      vy = float(y) + signY * clamp(alphaY - 0.5, -0.42, 0.42);
    } else {
      float alphaBar = (cntAlpha == 4) ? (sumAlpha * 0.25) : (float(cntA2) * 0.25);
      float shift = invert2x2SquareShiftGL(alphaBar, nx, ny) * (foreign > 0 ? 0.65 : 1.0);
      vx = float(x) + nx * shift;
      vy = float(y) + ny * shift;
    }

    outVtx = vec4(vx, vy, nx, ny);
  }`;

  /* PASS 2 & 10: Ekstrapolasi Sub-Piksel Verteks Tepi Bingkai (extrapolateBorderVertices) */
  const FS_VERTEX_BORDER_EXTRAP = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x > 0 && x < w && y > 0 && y < h) {
      outVtx = curV;
      return;
    }
    if ((x == 0 || x == w) && (y == 0 || y == h)) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt == 0) {
      outVtx = curV;
      return;
    }
    ivec2 intNb = ivec2(-1, -1);
    for (int i = 0; i < 4; i++) {
      if (i >= nCnt) break;
      ivec2 nb = nbs[i];
      if (nb.x > 0 && nb.x < w && nb.y > 0 && nb.y < h) {
        intNb = nb;
        break;
      }
    }
    if (intNb.x < 0) {
      outVtx = curV;
      return;
    }
    ivec2 ch[9];
    int chLen = walkChainGrid(v, intNb, 6, ch);
    if (chLen < 3) {
      outVtx = curV;
      return;
    }
    vec2 pts[8];
    int m = chLen - 1;
    for (int s = 1; s < 9; s++) {
      if (s >= chLen) break;
      pts[s - 1] = texelFetch(u_vtx, ch[s], 0).rg;
    }
    vec2 fc, fd;
    float fRms, fMaxDev, fSpan;
    if (!fitLine2DGL(pts, m, fc, fd, fRms, fMaxDev, fSpan)) {
      outVtx = curV;
      return;
    }
    if ((y == 0 || y == h) && abs(fd.y) > 0.25) {
      float t = (float(y) - fc.y) / fd.y;
      float bx = fc.x + fd.x * t;
      if (abs(bx - float(x)) <= 0.72) curV.r = clamp(bx, 0.0, float(w));
    } else if ((x == 0 || x == w) && abs(fd.x) > 0.25) {
      float t = (float(x) - fc.x) / fd.x;
      float by = fc.y + fd.y * t;
      if (abs(by - float(y)) <= 0.72) curV.g = clamp(by, 0.0, float(h));
    }
    outVtx = curV;
  }`;

  /* PASS 3a: Step B dari refineBeachPlanar — Corner Detection & Apex Ray-Intersection (Valence == 2) */
  const FS_VERTEX_CORNER_STEP_B = GLSL_TAHAP4_VERTEX_COMMON + `
  bool isArmLinearGL(vec2 ptsArm[8], int m, vec2 fc, vec2 fd, float fRms, float fMaxDev, float fSpan) {
    if (m < 2 || fSpan < 1.45 || fRms > 0.15 || fMaxDev > 0.28) return false;
    vec2 p0 = ptsArm[0], p1 = ptsArm[m - 1], pm = ptsArm[m >> 1];
    float ch = length(p1 - p0);
    if (ch <= 0.0) ch = 1.0;
    float sag = abs((pm.x - p0.x) * (p1.y - p0.y) - (pm.y - p0.y) * (p1.x - p0.x)) / ch;
    return sag <= 0.024;
  }

  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = curV;
      return;
    }
    if (vertexValence(v) != 2) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt != 2) {
      outVtx = curV;
      return;
    }

    ivec2 keysA[9], keysB[9];
    int lenA = walkStraightArmGrid(v, nbs[0], 8, keysA);
    int lenB = walkStraightArmGrid(v, nbs[1], 8, keysB);
    if (lenA < 3 || lenB < 3) {
      outVtx = curV;
      return;
    }

    int mA = lenA - 1, mB = lenB - 1;
    vec2 armA[8], armB[8];
    for (int i = 0; i < 8; i++) {
      if (i >= mA) break;
      armA[i] = texelFetch(u_vtx, keysA[lenA - 1 - i], 0).rg;
    }
    for (int i = 0; i < 8; i++) {
      if (i >= mB) break;
      armB[i] = texelFetch(u_vtx, keysB[i + 1], 0).rg;
    }

    vec2 fAc, fAd, fBc, fBd;
    float fArms, fAdev, fAspan, fBrms, fBdev, fBspan;
    if (!fitLine2DGL(armA, mA, fAc, fAd, fArms, fAdev, fAspan) ||
        !fitLine2DGL(armB, mB, fBc, fBd, fBrms, fBdev, fBspan)) {
      outVtx = curV;
      return;
    }

    float armTurn = abs(atan(fAd.x * fBd.y - fAd.y * fBd.x, dot(fAd, fBd)));
    if (armTurn < 0.42) {
      outVtx = curV;
      return;
    }

    vec2 pA3 = texelFetch(u_vtx, keysA[min(3, lenA - 1)], 0).rg;
    vec2 pB3 = texelFetch(u_vtx, keysB[min(3, lenB - 1)], 0).rg;
    vec2 pA6 = texelFetch(u_vtx, keysA[min(6, lenA - 1)], 0).rg;
    vec2 pB6 = texelFetch(u_vtx, keysB[min(6, lenB - 1)], 0).rg;
    float w3 = length(pB3 - pA3);
    float w6 = length(pB6 - pA6);
    vec2 mid6 = 0.5 * (pA6 + pB6);
    float sag6 = length(curV.rg - mid6);
    float sagRatio6 = w6 > 0.5 ? (sag6 / w6) : 0.0;

    bool isNarrowCap = (armTurn >= 2.35 && w3 <= 3.2 && w6 <= 3.8 && (w6 - w3) < 0.8);
    if (isNarrowCap) {
      outVtx = curV;
      return;
    }

    bool linA = isArmLinearGL(armA, mA, fAc, fAd, fArms, fAdev, fAspan);
    bool linB = isArmLinearGL(armB, mB, fBc, fBd, fBrms, fBdev, fBspan);
    bool bothLinear = linA && linB;

    vec2 arcPts[17];
    int mArc = 0;
    for (int i = 0; i < 8; i++) {
      if (i >= mA) break;
      arcPts[mArc++] = armA[i];
    }
    arcPts[mArc++] = curV.rg;
    for (int i = 0; i < 8; i++) {
      if (i >= mB) break;
      arcPts[mArc++] = armB[i];
    }
    float circR = 0.0, circRms = 999.0;
    bool hasCirc = (mArc >= 5) ? fitCircle2DGL(arcPts, mArc, circR, circRms) : false;
    float wedgeRms = 0.5 * (fArms + fBrms);
    bool isRoundArc = hasCirc && circR >= 2.2 && circR <= 95.0 && circRms <= min(0.18, wedgeRms * 0.72);

    bool isTrueCorner = !isRoundArc && (
      (bothLinear && armTurn >= 0.48 && sagRatio6 >= 0.16) ||
      (armTurn >= 0.65 && sagRatio6 >= 0.24 && (w6 - w3) >= 1.3 && wedgeRms <= 0.34)
    );

    if (isTrueCorner) {
      /* Tandai vSharpPin = 1 dengan menambahkan +16384.0 ke kanal .b */
      if (curV.b < 8192.0) curV.b += 16384.0;
      if (bothLinear) {
        float det = fAd.x * fBd.y - fAd.y * fBd.x;
        if (abs(det) > 0.12) {
          vec2 wVec = fBc - fAc;
          float t = (wVec.x * fBd.y - wVec.y * fBd.x) / det;
          vec2 ap = fAc + fAd * t;
          float d0 = length(ap - curV.rg);
          float d1 = length(ap - texelFetch(u_vtx, nbs[0], 0).rg);
          float d2 = length(ap - texelFetch(u_vtx, nbs[1], 0).rg);
          if (d0 <= d1 + 0.15 && d0 <= d2 + 0.15 && d0 <= 1.15) {
            curV.r = clamp(ap.x, float(x) - 0.65, float(x) + 0.65);
            curV.g = clamp(ap.y, float(y) - 0.65, float(y) + 0.65);
          }
        }
      } else if (linA != linB) {
        vec2 fStrC = linA ? fAc : fBc;
        vec2 fStrD = linA ? fAd : fBd;
        vec2 nearCurv[8];
        int mNear = min(4, linA ? lenB : lenA);
        for (int i = 0; i < 4; i++) {
          if (i >= mNear) break;
          ivec2 kv = linA ? keysB[i] : keysA[i];
          nearCurv[i] = texelFetch(u_vtx, kv, 0).rg;
        }
        vec2 fNc, fNd;
        float fNrms, fNdev, fNspan;
        if (fitLine2DGL(nearCurv, mNear, fNc, fNd, fNrms, fNdev, fNspan)) {
          float det = fStrD.x * fNd.y - fStrD.y * fNd.x;
          if (abs(det) > 0.15) {
            vec2 wVec = fNc - fStrC;
            float t = (wVec.x * fNd.y - wVec.y * fNd.x) / det;
            vec2 ap = fStrC + fStrD * t;
            float d0 = length(ap - curV.rg);
            if (d0 <= 0.42) {
              curV.r = clamp(ap.x, float(x) - 0.45, float(x) + 0.45);
              curV.g = clamp(ap.y, float(y) - 0.45, float(y) + 0.45);
            }
          }
        }
      }
    }
    outVtx = curV;
  }`;

  /* PASS 3b: Step B2 dari refineBeachPlanar — Multi-Region T/X-Junction Least-Squares Ray Intersection */
  const FS_VERTEX_JUNC_STEP_B2 = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h || vertexValence(v) < 3) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt < 3) {
      outVtx = curV;
      return;
    }
    float a00 = 0.20, a01 = 0.0, a11 = 0.20;
    float b0 = 0.20 * float(x), b1 = 0.20 * float(y);
    int validBranches = 0;

    for (int bi = 0; bi < 4; bi++) {
      if (bi >= nCnt) break;
      ivec2 ch[9];
      int chLen = walkChainGrid(v, nbs[bi], 6, ch);
      int m = chLen - 1;
      if (m >= 2) {
        vec2 pts[8];
        for (int s = 1; s < 9; s++) {
          if (s >= chLen) break;
          pts[s - 1] = texelFetch(u_vtx, ch[s], 0).rg;
        }
        vec2 fc, fd;
        float fRms, fDev, fSpan;
        if (fitLine2DGL(pts, m, fc, fd, fRms, fDev, fSpan)) {
          float nx = -fd.y, ny = fd.x;
          float wgt = 1.0 / (0.04 + fRms);
          a00 += wgt * nx * nx;
          a01 += wgt * nx * ny;
          a11 += wgt * ny * ny;
          float rhs = nx * fc.x + ny * fc.y;
          b0 += wgt * nx * rhs;
          b1 += wgt * ny * rhs;
          validBranches++;
        }
      }
    }

    if (validBranches >= 2) {
      float det = a00 * a11 - a01 * a01;
      if (abs(det) > 1e-6) {
        float jx = (a11 * b0 - a01 * b1) / det;
        float jy = (a00 * b1 - a01 * b0) / det;
        curV.r = clamp(jx, float(x) - 0.50, float(x) + 0.50);
        curV.g = clamp(jy, float(y) - 0.50, float(y) + 0.50);
      }
    }
    outVtx = curV;
  }`;

  /* PASS 3c: Snapshot verteks interior (1..w-1, 1..h-1) ke texLabGrad sebagai referensi beachVx/beachVy/normX/normY */
  const FS_SNAPSHOT_INTERIOR_VTX = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_vtx;
  out vec4 outRef;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    outRef = texelFetch(u_vtx, p, 0);
  }`;

  /* PASS 4..9: Step C dari refineBeachPlanar — 6-Pass Anisotropic Tangential-Dominant Taubin Relaxation */
  const FS_VERTEX_TAUBIN_ANISO = GLSL_TAHAP4_VERTEX_COMMON + `
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = curV;
      return;
    }
    if (curV.b >= 8192.0 || vertexValence(v) != 2) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt != 2) {
      outVtx = curV;
      return;
    }
    ivec2 a = nbs[0], b = nbs[1];
    vec4 va = texelFetch(u_vtx, a, 0);
    vec4 vb = texelFetch(u_vtx, b, 0);
    bool dampCond = (va.b >= 8192.0) || (vb.b >= 8192.0) || (vertexValence(a) >= 3) || (vertexValence(b) >= 3);
    float damp = dampCond ? 0.30 : 1.0;

    vec2 m = 0.5 * (va.rg + vb.rg);
    vec2 d = (m - curV.rg) * (u_weight * damp);

    vec4 refV = texelFetch(u_refTex, v, 0);
    vec2 beachV = refV.rg;
    float nx = refV.b >= 8192.0 ? (refV.b - 16384.0) : refV.b;
    float ny = refV.a;

    if (nx != 0.0 || ny != 0.0) {
      vec2 nVec = vec2(nx, ny);
      vec2 tVec = vec2(-ny, nx);
      float dNorm = dot(d, nVec);
      float dTang = dot(d, tVec);
      vec2 newP = curV.rg + tVec * dTang + nVec * (dNorm * 0.40);
      vec2 totD = newP - beachV;
      float cNorm = clamp(dot(totD, nVec), -0.14, 0.14);
      float cTang = clamp(dot(totD, tVec), -0.36, 0.36);
      outVtx = vec4(beachV + tVec * cTang + nVec * cNorm, curV.b, curV.a);
    } else {
      outVtx = vec4(
        clamp(curV.r + d.x, beachV.x - 0.22, beachV.x + 0.22),
        clamp(curV.g + d.y, beachV.y - 0.22, beachV.y + 0.22),
        curV.b,
        curV.a
      );
    }
  }`;

  /* Shader Paralel Taubin Closed-Loop Fairing pada Tekstur 2D Bertumpuk (untuk kontur panjang / batch) */
  const FS_CONTOUR_TAUBIN_PASS = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_weight;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int y = idx / u_texW;
    int x = idx - y * u_texW;
    return ivec2(x, y);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n || cur.b > 0.5) {
      outPt = cur;
      return;
    }
    int ia = (i - 1 + u_n) % u_n;
    int ib = (i + 1) % u_n;
    vec2 pa = texelFetch(u_ptsTex, idxToCoord(ia), 0).rg;
    vec2 pb = texelFetch(u_ptsTex, idxToCoord(ib), 0).rg;
    vec2 nextP = cur.rg + u_weight * (0.5 * (pa + pb) - cur.rg);
    outPt = vec4(nextP, cur.b, cur.a);
  }`;

  /* Eksekusi Penuh Sub-Pixel Beach Deconvolution (Step A + Extrap + Step B + Step B2 + Step C + Extrap) di GPU */
  function gpuRefineBeachPlanar(vxCoord, vyCoord, vValence, vSharpPin, labels, w, h, work, palette) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return false;
    const { gl } = env;
    const GW = w + 1, GH = h + 1;
    if (GW > HW_LIMITS.gpu.maxTexSize || GH > HW_LIMITS.gpu.maxTexSize) return false;

    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, null, palette, ctx, labels);
      if (!state) return false;

      const vtxSlotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', w, h, true);
      const vtxSlotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', w, h, true);
      const refSlot  = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
      if (!vtxSlotA || !vtxSlotB || !refSlot || !vtxSlotA.isFloat || !vtxSlotB.isFloat) return false;

      const hasOrigAlpha = (work && work.origAlpha && work.origAlpha.length === w * h) ? 1 : 0;

      /* Pass 1: Step A — 2x2 Square Area Inversion & 90-Deg Grid Corner Deconvolution -> vtxSlotA */
      const ok1 = runSlotPass(env, 'vtxBeachDeconv', FS_VERTEX_BEACH_DECONV, vtxSlotA, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, state.rawSlot.tex);  g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
        g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, state.palLutSlot.tex); g.uniform1i(g.getUniformLocation(prog, 'u_palLut'), 2);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), state.K);
        g.uniform1i(g.getUniformLocation(prog, 'u_hasOrigAlpha'), hasOrigAlpha);
      });
      if (!ok1) return false;

      /* Pass 2: Border Vertex Sub-Pixel Extrapolation -> vtxSlotB */
      const ok2 = runSlotPass(env, 'vtxBorderExtrap', FS_VERTEX_BORDER_EXTRAP, vtxSlotB, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, vtxSlotA.tex);       g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!ok2) return false;

      /* Pass 3a: Step B — Corner Detection & Apex Ray-Intersection (val == 2) -> vtxSlotA */
      const ok3a = runSlotPass(env, 'vtxCornerStepB', FS_VERTEX_CORNER_STEP_B, vtxSlotA, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, vtxSlotB.tex);       g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!ok3a) return false;

      /* Pass 3b: Step B2 — Multi-Region T/X-Junction Least-Squares Ray Intersection (val >= 3) -> vtxSlotB */
      const ok3b = runSlotPass(env, 'vtxJuncStepB2', FS_VERTEX_JUNC_STEP_B2, vtxSlotB, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, vtxSlotA.tex);       g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!ok3b) return false;

      /* Pass 3c: Snapshot post-Step-B2 coordinates & normals ke refSlot (texLabGrad) untuk batas tabung Step C */
      const okSnap = runSlotPass(env, 'vtxSnapshotRef', FS_SNAPSHOT_INTERIOR_VTX, refSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, vtxSlotB.tex); g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 0);
      });
      if (!okSnap) return false;

      /* Pass 4..9: Step C — 6-Pass Anisotropic Tangential-Dominant Taubin Relaxation */
      const TAUBIN_WEIGHTS = [0.42, -0.44, 0.38, -0.40, 0.34, -0.36];
      let curSlot = vtxSlotB, nxtSlot = vtxSlotA;
      for (let wi = 0; wi < TAUBIN_WEIGHTS.length; wi++) {
        const wgt = TAUBIN_WEIGHTS[wi];
        const okC = runSlotPass(env, 'vtxTaubinAniso', FS_VERTEX_TAUBIN_ANISO, nxtSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
          g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, curSlot.tex);        g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
          g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, refSlot.tex);        g.uniform1i(g.getUniformLocation(prog, 'u_refTex'), 2);
          g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
          g.uniform1f(g.getUniformLocation(prog, 'u_weight'), wgt);
        });
        if (!okC) return false;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      /* Pass 10: Final Border Vertex Extrapolation -> nxtSlot */
      const okEnd = runSlotPass(env, 'vtxBorderExtrap', FS_VERTEX_BORDER_EXTRAP, nxtSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex); g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, curSlot.tex);        g.uniform1i(g.getUniformLocation(prog, 'u_vtx'), 1);
        g.uniform2i(g.getUniformLocation(prog, 'u_imgRes'), w, h);
      });
      if (!okEnd) return false;

      /* Readback tunggal seluruh kisi verteks planar (w+1)x(h+1) dari VRAM ke RAM */
      const totalVtx = GW * GH;
      const outFloats = MemPool.acquire(Float32Array, totalVtx * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, nxtSlot.fbo);
      gl.readPixels(0, 0, GW, GH, gl.RGBA, gl.FLOAT, outFloats);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      for (let k = 0; k < totalVtx; k++) {
        const i = k * 4;
        vxCoord[k] = outFloats[i];
        vyCoord[k] = outFloats[i + 1];
        vSharpPin[k] = outFloats[i + 2] >= 8192.0 ? 1 : 0;
      }
      MemPool.release(outFloats);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Eksekusi Paralel Closed-Contour Taubin Filter di GPU */
  function gpuTaubinFilterClosed(pts, corners, passes = 14, lam = 0.45, mu = -0.473) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const n = pts ? pts.length : 0;
    if (n < 5) return null;
    const { gl } = env;
    try {
      const texW = Math.min(256, n);
      const texH = Math.ceil(n / texW);
      if (texW > HW_LIMITS.gpu.maxTexSize || texH > HW_LIMITS.gpu.maxTexSize) return null;
      const slotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', texW - 1, texH - 1, true);
      const slotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', texW - 1, texH - 1, true);
      if (!slotA || !slotB || !slotA.isFloat || !slotB.isFloat) return null;

      const totalTexels = slotA.w * slotA.h;
      const inBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        inBuf[idx]     = pts[i][0];
        inBuf[idx + 1] = pts[i][1];
        inBuf[idx + 2] = (corners && corners[i]) ? 1.0 : 0.0;
        inBuf[idx + 3] = 1.0;
      }
      uploadBufferToSlot(gl, 'bufVerticesA', texW - 1, texH - 1, inBuf, true);
      MemPool.release(inBuf);

      let curSlot = slotA, nxtSlot = slotB;
      for (let p = 0; p < passes; p++) {
        for (const wgt of [lam, mu]) {
          const ok = runSlotPass(env, 'contourTaubinPass', FS_CONTOUR_TAUBIN_PASS, nxtSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
            g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
            g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
            g.uniform1f(g.getUniformLocation(prog, 'u_weight'), wgt);
          });
          if (!ok) return null;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      const outBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, curSlot.fbo);
      gl.readPixels(0, 0, slotA.w, slotA.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const res = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        res[i] = [outBuf[idx], outBuf[idx + 1]];
      }
      MemPool.release(outBuf);
      return res;
    } catch (e) {
      return null;
    }
  }

  /* ============================================================================
     TAHAP 5 GPU KERNELS:
     1) Parallel Staircase Despeckle (Minkowski Tube +-0.48px) + Multi-Scale
        Quadratic Savitzky-Golay Fairing (Windows w=16, 36, Tube +-0.58px)
     2) Parallel 4th-Order Euler-Lagrange Elastica Bending + Data Relaxation
     3) Parallel Gauss-Newton / Newton-Raphson Cubic Bézier Fitting (Batch)
     4) Parallel Closed-Loop Round-Trip Evaluator (CIEDE2000 + Boundary IoU + Detail Recall)
     ============================================================================ */

  const FS_CONTOUR_DESPECKLE_PASS = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_rawTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_weight;
  uniform int u_isMuStep;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec2 ptAt(int idx) {
    return texelFetch(u_ptsTex, idxToCoord(idx), 0).rg;
  }

  float turnAt(int idx, out float l1Out, out float l2Out) {
    vec2 a = ptAt(idx - 1);
    vec2 p = ptAt(idx);
    vec2 b = ptAt(idx + 1);
    vec2 u = p - a;
    vec2 v = b - p;
    l1Out = length(u);
    l2Out = length(v);
    if (l1Out > 1e-5 && l2Out > 1e-5) {
      return atan(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y);
    }
    return 0.0;
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    vec2 rawP = texelFetch(u_rawTex, c, 0).rg;

    if (u_isMuStep == 0) {
      if (cur.b > 0.5) {
        outPt = vec4(cur.rg, cur.b, 0.0);
        return;
      }
      float lPrev = 0.0, lNext = 0.0;
      float t0 = turnAt(i, lPrev, lNext);
      bool hasOpp = false;
      for (int d = 1; d <= 4; d++) {
        float dm1 = 0.0, dm2 = 0.0;
        float tM = turnAt(i - d, dm1, dm2);
        float tP = turnAt(i + d, dm1, dm2);
        if (t0 * tM < -0.006 || t0 * tP < -0.006) {
          hasOpp = true;
          break;
        }
      }
      bool isZig = (abs(t0) >= 0.25 && hasOpp && min(lPrev, lNext) <= 4.5);
      if (!isZig) {
        outPt = vec4(cur.rg, cur.b, 0.0);
        return;
      }
      vec2 m = 0.5 * (ptAt(i - 1) + ptAt(i + 1));
      vec2 t = cur.rg + u_weight * (m - cur.rg);
      vec2 cl = clamp(t, rawP - vec2(0.48), rawP + vec2(0.48));
      outPt = vec4(cl, cur.b, 1.0);
    } else {
      if (cur.a < 0.5) {
        outPt = cur;
        return;
      }
      vec2 m = 0.5 * (ptAt(i - 1) + ptAt(i + 1));
      vec2 t = cur.rg + u_weight * (m - cur.rg);
      vec2 cl = clamp(t, rawP - vec2(0.48), rawP + vec2(0.48));
      outPt = vec4(cl, cur.b, 1.0);
    }
  }`;

  const FS_CONTOUR_SG_LOCK = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform int u_texW;
  uniform int u_n;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    if (cur.b > 0.5) {
      outPt = vec4(cur.rg, 1.0, cur.a);
      return;
    }
    vec2 pM4 = texelFetch(u_ptsTex, idxToCoord(i - 4), 0).rg;
    vec2 p0  = cur.rg;
    vec2 pP4 = texelFetch(u_ptsTex, idxToCoord(i + 4), 0).rg;
    vec2 u = p0 - pM4;
    vec2 v = pP4 - p0;
    float l1 = length(u), l2 = length(v);
    float locked = 0.0;
    if (l1 > 0.5 && l2 > 0.5) {
      float turn4 = abs(atan(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y));
      float c4 = max(1e-6, length(pP4 - pM4));
      float sag4 = length(p0 - 0.5 * (pM4 + pP4));
      if (turn4 >= 0.45 && (sag4 / c4) >= 0.16) locked = 1.0;
    }
    outPt = vec4(cur.rg, locked, cur.a);
  }`;

  const FS_CONTOUR_SG_FAIRING = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_rawTex;
  uniform int u_texW;
  uniform int u_n;
  uniform int u_maxW;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec4 fetchAt(int idx) {
    return texelFetch(u_ptsTex, idxToCoord(idx), 0);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n || cur.b > 0.5) {
      outPt = cur;
      return;
    }
    int quarterN = u_n >> 2;
    int w = 0;
    for (int step = 0; step < 36; step++) {
      if (w >= u_maxW || w >= quarterN) break;
      if (fetchAt(i - w - 1).b > 0.5 || fetchAt(i + w + 1).b > 0.5) break;
      w++;
    }
    if (w < 4) {
      outPt = cur;
      return;
    }
    float arc = 0.0;
    vec2 prevP = fetchAt(i - w).rg;
    vec2 pA = prevP;
    for (int k = -36; k < 36; k++) {
      if (k < -w) continue;
      if (k >= w) break;
      vec2 nxtP = fetchAt(i + k + 1).rg;
      arc += distance(prevP, nxtP);
      prevP = nxtP;
    }
    vec2 pB = prevP;
    float chord = distance(pA, pB);
    if (chord < 3.0 || (arc / chord) > 1.035) {
      outPt = cur;
      return;
    }

    float sig = float(w) * 0.55;
    float inv2Sig2 = 1.0 / (2.0 * sig * sig);
    float s0 = 0.0, s2 = 0.0, s4 = 0.0;
    float sx0 = 0.0, sx2 = 0.0, sy0 = 0.0, sy2 = 0.0;
    for (int k = -36; k <= 36; k++) {
      if (k < -w) continue;
      if (k > w) break;
      float fk = float(k);
      float k2 = fk * fk;
      float wt = exp(-k2 * inv2Sig2);
      vec2 pk = fetchAt(i + k).rg;
      s0 += wt;
      s2 += wt * k2;
      s4 += wt * k2 * k2;
      sx0 += wt * pk.x;
      sx2 += wt * k2 * pk.x;
      sy0 += wt * pk.y;
      sy2 += wt * k2 * pk.y;
    }
    float det = s0 * s4 - s2 * s2;
    if (abs(det) < 1e-9) {
      outPt = cur;
      return;
    }
    float ax = (s4 * sx0 - s2 * sx2) / det;
    float cx = (s0 * sx2 - s2 * sx0) / det;
    float ay = (s4 * sy0 - s2 * sy2) / det;
    float cy = (s0 * sy2 - s2 * sy0) / det;
    float bx = (pB.x - pA.x) / float(2 * w);
    float by = (pB.y - pA.y) / float(2 * w);

    float errSq = 0.0;
    for (int k = -36; k <= 36; k++) {
      if (k < -w) continue;
      if (k > w) break;
      float fk = float(k);
      vec2 pk = fetchAt(i + k).rg;
      float fx = ax + bx * fk + cx * fk * fk;
      float fy = ay + by * fk + cy * fk * fk;
      vec2 df = pk - vec2(fx, fy);
      errSq += dot(df, df);
    }
    float rms = sqrt(errSq / float(2 * w + 1));
    if (rms <= 0.42) {
      vec2 rawP = texelFetch(u_rawTex, c, 0).rg;
      vec2 cl = clamp(vec2(ax, ay), rawP - vec2(0.58), rawP + vec2(0.58));
      outPt = vec4(cl, cur.b, cur.a);
    } else {
      outPt = cur;
    }
  }`;

  function gpuDespeckleStaircaseClosed(pts, strength = 0.65, juncFlags = null, cornerPin = null) {
    return null; /* Jalankan Savitzky-Golay kuadratik penuh di CPU (< 3ms) */
    const n = pts ? pts.length : 0;
    if (n < 8 || strength <= 0.01) return pts ? pts.map(p => [p[0], p[1]]) : null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;

    try {
      const texW = Math.min(256, Math.max(16, Math.ceil(Math.sqrt(n))));
      const texH = Math.ceil(n / texW);
      const slotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', texW - 1, texH - 1, true);
      const slotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', texW - 1, texH - 1, true);
      const rawSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', slotA.w, slotA.h, true);
      if (!slotA || !slotB || !rawSlot || !slotA.isFloat) return null;

      const totalTexels = slotA.w * slotA.h;
      const inBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      const rawBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        const pinned = ((juncFlags && juncFlags[i]) || (cornerPin && cornerPin[i])) ? 1.0 : 0.0;
        inBuf[idx]     = rawBuf[idx]     = pts[i][0];
        inBuf[idx + 1] = rawBuf[idx + 1] = pts[i][1];
        inBuf[idx + 2] = rawBuf[idx + 2] = pinned;
        inBuf[idx + 3] = rawBuf[idx + 3] = 0.0;
      }
      uploadBufferToSlot(gl, 'bufVerticesA', texW - 1, texH - 1, inBuf, true);
      uploadBufferToSlot(gl, 'texLabGrad', slotA.w, slotA.h, rawBuf, true);
      MemPool.release(inBuf);
      MemPool.release(rawBuf);

      const passes = clamp(Math.round(2 + strength * 3), 2, 5);
      const lam = clamp(0.32 + strength * 0.14, 0.24, 0.45);
      const mu = -lam / (1 - 0.06 * lam);

      let curSlot = slotA, nxtSlot = slotB;
      for (let pass = 0; pass < passes; pass++) {
        for (let stepIdx = 0; stepIdx < 2; stepIdx++) {
          const wgt = stepIdx === 0 ? lam : mu;
          const ok = runSlotPass(env, 'contourDespecklePass', FS_CONTOUR_DESPECKLE_PASS, nxtSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
            g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
            g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
            g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
            g.uniform1f(g.getUniformLocation(prog, 'u_weight'), wgt);
            g.uniform1i(g.getUniformLocation(prog, 'u_isMuStep'), stepIdx);
          });
          if (!ok) return null;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      if (n >= 16 && strength >= 0.15) {
        const okLock = runSlotPass(env, 'contourSgLock', FS_CONTOUR_SG_LOCK, nxtSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
          g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
          g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
        });
        if (!okLock) return null;
        { const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp; }

        for (const maxW of [16, 36]) {
          const okSg = runSlotPass(env, 'contourSgFairing', FS_CONTOUR_SG_FAIRING, nxtSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
            g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 1);
            g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
            g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
            g.uniform1i(g.getUniformLocation(prog, 'u_maxW'), maxW);
          });
          if (!okSg) return null;
          const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
        }
      }

      const outBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, curSlot.fbo);
      gl.readPixels(0, 0, slotA.w, slotA.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const res = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        res[i] = [outBuf[idx], outBuf[idx + 1]];
      }
      MemPool.release(outBuf);
      return res;
    } catch (e) {
      return null;
    }
  }

  /* 2) Parallel 4th-Order Euler-Lagrange Elastica Relaxation di GPU */
  const FS_CONTOUR_ELASTICA_STEP = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_curTex;
  uniform sampler2D u_refTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_lam;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec4 curAt(int idx) { return texelFetch(u_curTex, idxToCoord(idx), 0); }
  vec4 refAt(int idx) { return texelFetch(u_refTex, idxToCoord(idx), 0); }

  float bendWeightAt(int k) {
    vec4 ck = curAt(k);
    if (ck.b > 0.5) return 0.0;
    bool nearCorner = (curAt(k - 1).b > 0.5) || (curAt(k + 1).b > 0.5);
    float baseW = (ck.a > 0.5) ? (u_lam * 0.65) : u_lam;
    return baseW * (nearCorner ? 0.15 : 1.0);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_curTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    vec4 ref = texelFetch(u_refTex, c, 0);
    vec2 d0 = ref.rg;
    vec2 snapP = ref.ba;
    if (cur.b > 0.5) {
      outPt = vec4(snapP, cur.b, cur.a);
      return;
    }

    float wData = (cur.a > 0.5) ? 3.5 : 1.8;
    vec2 g = 2.0 * wData * (cur.rg - d0);

    vec2 vM2 = curAt(i - 2).rg;
    vec2 vM1 = curAt(i - 1).rg;
    vec2 v0  = cur.rg;
    vec2 vP1 = curAt(i + 1).rg;
    vec2 vP2 = curAt(i + 2).rg;

    float wBm = bendWeightAt(i - 1);
    float wB0 = bendWeightAt(i);
    float wBp = bendWeightAt(i + 1);

    if (wBm > 0.0) g += 2.0 * wBm * (vM2 - 2.0 * vM1 + v0);
    if (wB0 > 0.0) g -= 4.0 * wB0 * (vM1 - 2.0 * v0  + vP1);
    if (wBp > 0.0) g += 2.0 * wBp * (v0  - 2.0 * vP1 + vP2);

    float diagH = 2.0 * wData + 8.0 * wB0 + 2.0 * (wBm + wBp);
    vec2 xt = v0 - (0.68 / max(1e-4, diagH)) * g;

    float maxTube = (curAt(i - 1).b > 0.5 || curAt(i + 1).b > 0.5) ? 0.12 : 0.28;
    vec2 dSnap = xt - snapP;
    float dl = length(dSnap);
    if (dl > maxTube) {
      xt = snapP + (dSnap / dl) * maxTube;
    }
    outPt = vec4(xt, cur.b, cur.a);
  }`;

  function gpuElasticaRelaxClosed(refPts, snappedPts, lockMask, smoothKnots, lam = 0.5, iters = 12) {
    return null; /* Jalankan Polak-Ribiere Conjugate Gradient + Line Search eksak di CPU (< 4ms) */
    const n = refPts ? refPts.length : 0;
    if (n < 5) return refPts ? refPts.map(p => [p[0], p[1]]) : null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;

    try {
      const texW = Math.min(256, Math.max(16, Math.ceil(Math.sqrt(n))));
      const texH = Math.ceil(n / texW);
      const slotA = GPUMemPool.allocateSlot(gl, 'bufVerticesA', texW - 1, texH - 1, true);
      const slotB = GPUMemPool.allocateSlot(gl, 'bufVerticesB', texW - 1, texH - 1, true);
      const refSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', slotA.w, slotA.h, true);
      if (!slotA || !slotB || !refSlot || !slotA.isFloat) return null;

      const totalTexels = slotA.w * slotA.h;
      const inBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      const refBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        inBuf[idx]     = refPts[i][0];
        inBuf[idx + 1] = refPts[i][1];
        inBuf[idx + 2] = (lockMask && lockMask[i]) ? 1.0 : 0.0;
        inBuf[idx + 3] = (smoothKnots && smoothKnots[i]) ? 1.0 : 0.0;

        refBuf[idx]     = refPts[i][0];
        refBuf[idx + 1] = refPts[i][1];
        refBuf[idx + 2] = snappedPts ? snappedPts[i][0] : refPts[i][0];
        refBuf[idx + 3] = snappedPts ? snappedPts[i][1] : refPts[i][1];
      }
      uploadBufferToSlot(gl, 'bufVerticesA', texW - 1, texH - 1, inBuf, true);
      uploadBufferToSlot(gl, 'texLabGrad', slotA.w, slotA.h, refBuf, true);
      MemPool.release(inBuf);
      MemPool.release(refBuf);

      let curSlot = slotA, nxtSlot = slotB;
      const totalSteps = clamp(iters, 4, 20);
      for (let it = 0; it < totalSteps; it++) {
        const ok = runSlotPass(env, 'contourElasticaStep', FS_CONTOUR_ELASTICA_STEP, nxtSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, curSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_curTex'), 0);
          g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, refSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_refTex'), 1);
          g.uniform1i(g.getUniformLocation(prog, 'u_texW'), slotA.w);
          g.uniform1i(g.getUniformLocation(prog, 'u_n'), n);
          g.uniform1f(g.getUniformLocation(prog, 'u_lam'), lam);
        });
        if (!ok) return null;
        const tmp = curSlot; curSlot = nxtSlot; nxtSlot = tmp;
      }

      const outBuf = MemPool.acquire(Float32Array, totalTexels * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, curSlot.fbo);
      gl.readPixels(0, 0, slotA.w, slotA.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const res = new Array(n);
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        res[i] = [outBuf[idx], outBuf[idx + 1]];
      }
      MemPool.release(outBuf);
      return res;
    } catch (e) {
      return null;
    }
  }

  /* 3) Parallel Batch Gauss-Newton / Newton-Raphson Cubic Bézier Fitting di GPU */
  const FS_BEZIER_FIT_GN = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_metaTex;
  uniform int u_ptsTexW;
  uniform int u_metaTexW;
  uniform int u_outTexW;
  uniform int u_numChains;
  out vec4 outCtrl;

  ivec2 ptCoord(int idx) {
    int y = idx / u_ptsTexW;
    int x = idx - y * u_ptsTexW;
    return ivec2(x, y);
  }

  ivec2 metaCoord(int idx) {
    int y = idx / u_metaTexW;
    int x = idx - y * u_metaTexW;
    return ivec2(x, y);
  }

  vec2 evalBez(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t, u2 = u * u, t2 = t * t;
    return u2 * u * P0 + 3.0 * u2 * t * P1 + 3.0 * u * t2 * P2 + t2 * t * P3;
  }

  vec2 evalBezD1(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t;
    return 3.0 * (u * u * (P1 - P0) + 2.0 * u * t * (P2 - P1) + t * t * (P3 - P2));
  }

  vec2 evalBezD2(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t;
    return 6.0 * (u * (P2 - 2.0 * P1 + P0) + t * (P3 - 2.0 * P2 + P1));
  }

  void solveAlphasGL(
    int startIdx, int n, float uArr[96],
    vec2 P0, vec2 P3, vec2 tL, vec2 tR,
    float chord, float L, float circAlpha,
    out vec2 outP1, out vec2 outP2
  ) {
    float aNat = circAlpha > 0.0 ? circAlpha : (L / 3.0);
    float regW = circAlpha > 0.0 ? 0.06 : 0.004;
    float c00 = regW, c01 = 0.0, c11 = regW;
    float x0 = regW * aNat, x1 = regW * aNat;
    for (int i = 0; i < 96; i++) {
      if (i >= n) break;
      float t = uArr[i], m = 1.0 - t;
      float b0 = m * m * m, b1 = 3.0 * m * m * t, b2 = 3.0 * m * t * t, b3 = t * t * t;
      vec2 a1v = tL * b1;
      vec2 a2v = tR * b2;
      c00 += dot(a1v, a1v);
      c01 += dot(a1v, a2v);
      c11 += dot(a2v, a2v);
      vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
      vec2 rhs = pi - (P0 * (b0 + b1) + P3 * (b2 + b3));
      x0 += dot(a1v, rhs);
      x1 += dot(a2v, rhs);
    }
    float det = c00 * c11 - c01 * c01;
    float minA = max(0.08 * chord, 0.06 * L);
    float maxA = min(0.75 * L, max(0.78 * chord, 0.62 * L));
    float a1 = abs(det) > 1e-9 ? (x0 * c11 - x1 * c01) / det : aNat;
    float a2 = abs(det) > 1e-9 ? (c00 * x1 - c01 * x0) / det : aNat;
    if (a1 < minA || a1 > maxA) {
      a1 = clamp(a1, minA, maxA);
      if (c11 > 1e-9) a2 = (x1 - c01 * a1) / c11;
    }
    if (a2 < minA || a2 > maxA) {
      a2 = clamp(a2, minA, maxA);
      if (c00 > 1e-9) a1 = clamp((x0 - c01 * a2) / c00, minA, maxA);
    }
    outP1 = P0 + tL * a1;
    outP2 = P3 + tR * a2;
  }

  float computeMaxErrGL(int startIdx, int n, float uArr[96], vec2 P0, vec2 P1, vec2 P2, vec2 P3) {
    float maxE2 = 0.0;
    for (int i = 1; i < 96; i++) {
      if (i >= n - 1) break;
      vec2 Q = evalBez(P0, P1, P2, P3, uArr[i]);
      vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
      vec2 df = Q - pi;
      float d2 = dot(df, df);
      if (d2 > maxE2) maxE2 = d2;
    }
    return sqrt(maxE2);
  }

  bool isConvexPairValidGL(
    vec2 P0, vec2 cP1, vec2 cP2, vec2 P3,
    vec2 chU, float chord, float minOppExcur, float convexSign,
    bool hasTanL, bool hasTanR
  ) {
    if (chord < 1.5) return true;
    float h1 = (cP1.x - P0.x) * chU.y - (cP1.y - P0.y) * chU.x;
    float h2 = (cP2.x - P0.x) * chU.y - (cP2.y - P0.y) * chU.x;
    if (minOppExcur <= max(0.85, chord * 0.035) && (h1 * h2) < -1e-4) return false;
    if (abs(convexSign) > 0.5 && (convexSign * h1 < -0.005 || convexSign * h2 < -0.005)) return false;
    float proj1 = dot(cP1 - P0, chU);
    float proj2 = dot(P3 - cP2, chU);
    float minP1 = hasTanL ? (-0.05 * chord) : (0.02 * chord);
    float minP2 = hasTanR ? (-0.05 * chord) : (0.02 * chord);
    return proj1 >= minP1 && proj2 >= minP2 && proj1 <= 0.88 * chord && proj2 <= 0.88 * chord;
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int k = c.y * u_outTexW + c.x;
    if (k >= u_numChains) {
      outCtrl = vec4(0.0);
      return;
    }
    vec4 m0 = texelFetch(u_metaTex, metaCoord(k * 3), 0);
    vec4 m1 = texelFetch(u_metaTex, metaCoord(k * 3 + 1), 0);
    vec4 m2 = texelFetch(u_metaTex, metaCoord(k * 3 + 2), 0);

    int startIdx = int(floor(m0.r + 0.5));
    int n = clamp(int(floor(m0.g + 0.5)), 2, 96);
    vec2 tL = m0.ba;
    vec2 tR = m1.rg;
    float circAlpha = m1.b;
    float L = m1.a;
    float minOppExcur = m2.r;
    float convexSign = m2.g;
    int flags = int(floor(m2.b + 0.5));
    bool hasTanL = (flags & 1) != 0;
    bool hasTanR = (flags & 2) != 0;

    vec2 P0 = texelFetch(u_ptsTex, ptCoord(startIdx), 0).rg;
    vec2 P3 = texelFetch(u_ptsTex, ptCoord(startIdx + n - 1), 0).rg;
    float chord = distance(P0, P3);
    vec2 chU = chord > 1e-6 ? (P3 - P0) / chord : vec2(1.0, 0.0);

    float uArr[96];
    for (int i = 0; i < 96; i++) {
      if (i >= n) { uArr[i] = 1.0; continue; }
      uArr[i] = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).b;
    }

    if (circAlpha > 0.0) {
      vec2 cP1 = P0 + tL * circAlpha;
      vec2 cP2 = P3 + tR * circAlpha;
      for (int pass = 0; pass < 2; pass++) {
        float prevU = 0.0;
        uArr[0] = 0.0;
        uArr[n - 1] = 1.0;
        for (int i = 1; i < 96; i++) {
          if (i >= n - 1) break;
          float t = uArr[i];
          vec2 Q = evalBez(P0, cP1, cP2, P3, t);
          vec2 Q1 = evalBezD1(P0, cP1, cP2, P3, t);
          vec2 Q2 = evalBezD2(P0, cP1, cP2, P3, t);
          vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
          vec2 df = Q - pi;
          float num = dot(df, Q1);
          float den = dot(Q1, Q1) + dot(df, Q2);
          float nt = abs(den) > 1e-12 ? (t - num / den) : t;
          prevU = clamp(nt, prevU + 1e-5, 1.0 - 1e-5);
          uArr[i] = prevU;
        }
      }
    }

    vec2 P1, P2;
    solveAlphasGL(startIdx, n, uArr, P0, P3, tL, tR, chord, L, circAlpha, P1, P2);
    float bestErr = computeMaxErrGL(startIdx, n, uArr, P0, P1, P2, P3);

    if (circAlpha > 0.0) {
      vec2 cP1 = P0 + tL * circAlpha;
      vec2 cP2 = P3 + tR * circAlpha;
      float cErr = computeMaxErrGL(startIdx, n, uArr, P0, cP1, cP2, P3);
      if (cErr <= bestErr * 1.05) {
        P1 = cP1; P2 = cP2; bestErr = cErr;
      }
    }

    if (bestErr > 0.015 && bestErr < 18.0 && n >= 4) {
      float uNext[96];
      for (int it = 0; it < 10; it++) {
        uNext[0] = 0.0;
        uNext[n - 1] = 1.0;
        float prevU = 0.0;
        for (int i = 1; i < 96; i++) {
          if (i >= n - 1) break;
          float t = uArr[i];
          vec2 Q = evalBez(P0, P1, P2, P3, t);
          vec2 Q1 = evalBezD1(P0, P1, P2, P3, t);
          vec2 Q2 = evalBezD2(P0, P1, P2, P3, t);
          vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
          vec2 df = Q - pi;
          float num = dot(df, Q1);
          float den = dot(Q1, Q1) + dot(df, Q2);
          float nt = abs(den) > 1e-12 ? (t - num / den) : t;
          prevU = clamp(nt, prevU + 1e-5, 1.0 - 1e-5);
          uNext[i] = prevU;
        }
        vec2 nP1, nP2;
        solveAlphasGL(startIdx, n, uNext, P0, P3, tL, tR, chord, L, circAlpha, nP1, nP2);
        float nErr = computeMaxErrGL(startIdx, n, uNext, P0, nP1, nP2, P3);
        if (nErr < bestErr && isConvexPairValidGL(P0, nP1, nP2, P3, chU, chord, minOppExcur, convexSign, hasTanL, hasTanR)) {
          for (int i = 0; i < 96; i++) {
            if (i >= n) break;
            uArr[i] = uNext[i];
          }
          P1 = nP1;
          P2 = nP2;
          bestErr = nErr;
        } else {
          break;
        }
      }
    }

    outCtrl = vec4(P1.x, P1.y, P2.x, P2.y);
  }`;

  function gpuFitCubicBezierBatch(chains) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return null;
    if (!chains || !chains.length) return [];
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;

    try {
      const M = chains.length;
      let totalPts = 0;
      const prepped = new Array(M);

      for (let k = 0; k < M; k++) {
        const ch = chains[k];
        const pts = ch.pts;
        const n = pts.length;
        if (n < 2 || n > 96) {
          prepped[k] = { cpuFallback: true, res: fitCubicLS(pts, ch.tanL, ch.tanR, ch.allowLine) };
          continue;
        }
        const P0 = pts[0], P3 = pts[n - 1];
        const u = new Float64Array(n);
        let L = 0;
        for (let i = 1; i < n; i++) {
          L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          u[i] = L;
        }
        if (L < 1e-9) {
          prepped[k] = { cpuFallback: true, res: null };
          continue;
        }
        for (let i = 0; i < n; i++) u[i] /= L;

        const chord = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
        const chUx = chord > 1e-6 ? (P3[0] - P0[0]) / chord : 1;
        const chUy = chord > 1e-6 ? (P3[1] - P0[1]) / chord : 0;

        let maxPosH = 0, maxNegH = 0, sumH = 0;
        for (let i = 1; i < n - 1; i++) {
          const h = (pts[i][0] - P0[0]) * chUy - (pts[i][1] - P0[1]) * chUx;
          sumH += h;
          if (h > maxPosH) maxPosH = h;
          if (h < maxNegH) maxNegH = h;
        }
        const minOppExcur = Math.min(maxPosH, -maxNegH);
        const maxExcur = Math.max(maxPosH, -maxNegH);
        const domSign = sumH >= 0 ? 1 : -1;
        const convexSign = (maxPosH >= 0.20 && maxNegH >= -0.12) ? 1 : (maxNegH <= -0.20 && maxPosH <= 0.12) ? -1 : (minOppExcur <= 0.35 && maxExcur >= 0.12 ? domSign : 0);

        if (ch.allowLine && chord > 1e-6) {
          const maxLineDev = Math.max(maxPosH, -maxNegH);
          const alignL = !ch.tanL || Math.abs(ch.tanL[0] * chUy - ch.tanL[1] * chUx) < 0.12;
          const alignR = !ch.tanR || Math.abs(ch.tanR[0] * chUy - ch.tanR[1] * chUx) < 0.12;
          if (maxLineDev <= 0.22 && alignL && alignR) {
            const P1 = [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3];
            const P2 = [P0[0] + 2 * (P3[0] - P0[0]) / 3, P0[1] + 2 * (P3[1] - P0[1]) / 3];
            prepped[k] = {
              cpuFallback: true,
              res: { P0, P1, P2, P3, err: maxLineDev, sse: maxLineDev * maxLineDev * n, at: n >> 1, isLine: true, tL: [chUx, chUy], tR: [-chUx, -chUy] }
            };
            continue;
          }
        }

        let circT_L = null, circT_R = null, circAlpha = -1.0;
        if (n >= 5 && chord > 1.5) {
          const cf = fitCircle2D(pts);
          if (cf && cf.r >= 1.8 && cf.r <= 500 && cf.rms <= Math.max(0.16, cf.r * 0.015)) {
            const r0x = P0[0] - cf.cx, r0y = P0[1] - cf.cy, l0 = Math.hypot(r0x, r0y) || 1;
            const r3x = P3[0] - cf.cx, r3y = P3[1] - cf.cy, l3 = Math.hypot(r3x, r3y) || 1;
            const mid = pts[n >> 1];
            const crossDir = (P0[0] - cf.cx) * (mid[1] - cf.cy) - (P0[1] - cf.cy) * (mid[0] - cf.cx);
            const sgn = crossDir >= 0 ? 1 : -1;
            circT_L = [(-r0y / l0) * sgn, (r0x / l0) * sgn];
            circT_R = [(r3y / l3) * sgn, (-r3x / l3) * sgn];
            const dTheta = Math.acos(clamp((r0x * r3x + r0y * r3y) / (l0 * l3), -1, 1));
            if (dTheta > 0.08 && dTheta < 2.2) {
              circAlpha = (4 / 3) * cf.r * Math.tan(dTheta / 4);
            }
          }
        }

        const useCircL = circT_L && !ch.tanL;
        const useCircR = circT_R && !ch.tanR;
        const adaptiveSpanPx = (chord > 18 && L / chord < 1.02) ? clamp(chord * 0.24, 10.5, 28.0) : 9.5;
        let tL = ch.tanL ? [ch.tanL[0], ch.tanL[1]] : (useCircL ? circT_L : oneSidedTangentOpen(pts, true, adaptiveSpanPx));
        const endFwd = useCircR ? [-circT_R[0], -circT_R[1]] : oneSidedTangentOpen(pts, false, adaptiveSpanPx);
        let tR = ch.tanR ? [ch.tanR[0], ch.tanR[1]] : (useCircR ? circT_R : [-endFwd[0], -endFwd[1]]);

        const enforceConvexTangent = (tVec, isLeft) => {
          if (!convexSign) return tVec;
          const h = tVec[0] * chUy - tVec[1] * chUx;
          if (convexSign * h < -0.01) {
            if (isLeft && circT_L) return circT_L;
            if (!isLeft && circT_R) return circT_R;
            const proj = tVec[0] * chUx + tVec[1] * chUy;
            const perp = Math.abs(h) * 0.5 * convexSign;
            const nx = proj * chUx + perp * chUy, ny = proj * chUy - perp * chUx;
            const nl = Math.hypot(nx, ny) || 1;
            return [nx / nl, ny / nl];
          }
          return tVec;
        };
        tL = enforceConvexTangent(tL, true);
        tR = enforceConvexTangent(tR, false);

        if (minOppExcur <= Math.max(0.85, chord * 0.035) && chord > 1.5) {
          const hL = tL[0] * chUy - tL[1] * chUx;
          const hR = (-tR[0]) * chUy - (-tR[1]) * chUx;
          if (hL * hR > 1e-4 && maxExcur >= 0.12) {
            const fixVec = (v, isEnd) => {
              const s = isEnd ? -1 : 1;
              const hv = (s * v[0]) * chUy - (s * v[1]) * chUx;
              if (hv * domSign * s > 0) {
                const proj = Math.max(0.2, (s * v[0]) * chUx + (s * v[1]) * chUy);
                const perp = -domSign * s * Math.min(Math.abs(hv) * 0.35, 0.18 * proj);
                const nx = s * (proj * chUx + perp * chUy);
                const ny = s * (proj * chUy - perp * chUx);
                const nl = Math.hypot(nx, ny) || 1;
                return [nx / nl, ny / nl];
              }
              return v;
            };
            tL = fixVec(tL, false);
            tR = fixVec(tR, true);
          }
        }

        const startIdx = totalPts;
        totalPts += n;
        prepped[k] = {
          cpuFallback: false,
          pts, n, u, P0, P3, tL, tR, circAlpha, L, minOppExcur, convexSign,
          flags: (ch.tanL ? 1 : 0) | (ch.tanR ? 2 : 0),
          startIdx
        };
      }

      if (totalPts === 0) {
        return prepped.map(p => p.res);
      }

      const ptsTexW = Math.min(512, Math.max(16, Math.ceil(Math.sqrt(totalPts))));
      const ptsTexH = Math.ceil(totalPts / ptsTexW);
      const metaCount = M * 3;
      const metaTexW = Math.min(256, Math.max(8, Math.ceil(Math.sqrt(metaCount))));
      const metaTexH = Math.ceil(metaCount / metaTexW);
      const outTexW = Math.min(256, Math.max(8, Math.ceil(Math.sqrt(M))));
      const outTexH = Math.ceil(M / outTexW);

      const ptsSlot = GPUMemPool.allocateSlot(gl, 'bufVerticesA', ptsTexW - 1, ptsTexH - 1, true);
      const metaSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', metaTexW, metaTexH, true);
      const outSlot = GPUMemPool.allocateSlot(gl, 'bufVerticesB', outTexW - 1, outTexH - 1, true);
      if (!ptsSlot || !metaSlot || !outSlot || !ptsSlot.isFloat) return null;

      const ptsBuf = MemPool.acquire(Float32Array, ptsSlot.w * ptsSlot.h * 4);
      const metaBuf = MemPool.acquire(Float32Array, metaSlot.w * metaSlot.h * 4);

      for (let k = 0; k < M; k++) {
        const pr = prepped[k];
        if (pr.cpuFallback) continue;
        for (let i = 0; i < pr.n; i++) {
          const pIdx = (pr.startIdx + i) * 4;
          ptsBuf[pIdx]     = pr.pts[i][0];
          ptsBuf[pIdx + 1] = pr.pts[i][1];
          ptsBuf[pIdx + 2] = pr.u[i];
          ptsBuf[pIdx + 3] = 1.0;
        }
        const mIdx0 = (k * 3) * 4;
        const mIdx1 = (k * 3 + 1) * 4;
        const mIdx2 = (k * 3 + 2) * 4;
        metaBuf[mIdx0]     = pr.startIdx;
        metaBuf[mIdx0 + 1] = pr.n;
        metaBuf[mIdx0 + 2] = pr.tL[0];
        metaBuf[mIdx0 + 3] = pr.tL[1];

        metaBuf[mIdx1]     = pr.tR[0];
        metaBuf[mIdx1 + 1] = pr.tR[1];
        metaBuf[mIdx1 + 2] = pr.circAlpha;
        metaBuf[mIdx1 + 3] = pr.L;

        metaBuf[mIdx2]     = pr.minOppExcur;
        metaBuf[mIdx2 + 1] = pr.convexSign;
        metaBuf[mIdx2 + 2] = pr.flags;
        metaBuf[mIdx2 + 3] = 0.0;
      }

      uploadBufferToSlot(gl, 'bufVerticesA', ptsTexW - 1, ptsTexH - 1, ptsBuf, true);
      uploadBufferToSlot(gl, 'texLabGrad', metaSlot.w, metaSlot.h, metaBuf, true);
      MemPool.release(ptsBuf);
      MemPool.release(metaBuf);

      const ok = runSlotPass(env, 'bezierFitGn', FS_BEZIER_FIT_GN, outSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, ptsSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_ptsTex'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, metaSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_metaTex'), 1);
        g.uniform1i(g.getUniformLocation(prog, 'u_ptsTexW'), ptsSlot.w);
        g.uniform1i(g.getUniformLocation(prog, 'u_metaTexW'), metaSlot.w);
        g.uniform1i(g.getUniformLocation(prog, 'u_outTexW'), outSlot.w);
        g.uniform1i(g.getUniformLocation(prog, 'u_numChains'), M);
      });
      if (!ok) return null;

      const outBuf = MemPool.acquire(Float32Array, outSlot.w * outSlot.h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, outSlot.fbo);
      gl.readPixels(0, 0, outSlot.w, outSlot.h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const results = new Array(M);
      for (let k = 0; k < M; k++) {
        const pr = prepped[k];
        if (pr.cpuFallback) {
          results[k] = pr.res;
          continue;
        }
        const oIdx = k * 4;
        const P1 = [outBuf[oIdx], outBuf[oIdx + 1]];
        const P2 = [outBuf[oIdx + 2], outBuf[oIdx + 3]];
        let maxE = 0, sse = 0, maxI = pr.n >> 1;
        let uCur = pr.u;
        uCur = reparameterize(pr.pts, uCur, pr.P0, P1, P2, pr.P3);
        for (let i = 1; i < pr.n - 1; i++) {
          const Q = evalBezier(pr.P0, P1, P2, pr.P3, uCur[i]);
          const d2 = (Q[0] - pr.pts[i][0]) ** 2 + (Q[1] - pr.pts[i][1]) ** 2;
          sse += d2;
          if (d2 > maxE) { maxE = d2; maxI = i; }
        }
        const errVal = Math.sqrt(maxE);
        const chOrig = chains[k];
        if ((!chOrig.tanL || !chOrig.tanR) && errVal > 0.14 && pr.n >= 6) {
          results[k] = fitCubicLS(pr.pts, chOrig.tanL, chOrig.tanR, chOrig.allowLine);
        } else {
          results[k] = {
            P0: pr.P0, P1, P2, P3: pr.P3,
            err: errVal,
            sse,
            at: maxI,
            isLine: false,
            tL: pr.tL,
            tR: pr.tR
          };
        }
      }
      MemPool.release(outBuf);
      return results;
    } catch (e) {
      return null;
    }
  }

  /* 4) Parallel Closed-Loop Round-Trip Evaluator (ISO/CIE 11664-6:2022 CIEDE2000 + Boundary IoU + Detail Recall) di GPU */
  const FS_ROUNDTRIP_EVAL_DE00 = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_labels;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_palLut;
  uniform ivec2 u_res;
  uniform int u_K;
  uniform float u_edgeThr;
  out vec4 outEval;

  float srgbToLin(float c) {
    return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
  }

  vec3 rgbToLabGL(vec3 rgb255) {
    float r = srgbToLin(rgb255.r / 255.0);
    float g = srgbToLin(rgb255.g / 255.0);
    float b = srgbToLin(rgb255.b / 255.0);
    float X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    float Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
    float Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
    float eps = 0.008856, kap = 903.3;
    float fx = X > eps ? pow(X, 1.0 / 3.0) : (kap * X + 16.0) / 116.0;
    float fy = Y > eps ? pow(Y, 1.0 / 3.0) : (kap * Y + 16.0) / 116.0;
    float fz = Z > eps ? pow(Z, 1.0 / 3.0) : (kap * Z + 16.0) / 116.0;
    return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
  }

  float ciede2000GL(vec3 lab1, vec3 lab2) {
    float L1 = lab1.x, a1 = lab1.y, b1 = lab1.z;
    float L2 = lab2.x, a2 = lab2.y, b2 = lab2.z;
    float C1 = length(vec2(a1, b1));
    float C2 = length(vec2(a2, b2));
    float Cbar = 0.5 * (C1 + C2);
    float Cbar7 = pow(Cbar, 7.0);
    float G = 0.5 * (1.0 - sqrt(Cbar7 / (Cbar7 + 6103515625.0)));
    float a1p = (1.0 + G) * a1;
    float a2p = (1.0 + G) * a2;
    float C1p = length(vec2(a1p, b1));
    float C2p = length(vec2(a2p, b2));
    float h1p = (b1 == 0.0 && a1p == 0.0) ? 0.0 : degrees(atan(b1, a1p));
    if (h1p < 0.0) h1p += 360.0;
    float h2p = (b2 == 0.0 && a2p == 0.0) ? 0.0 : degrees(atan(b2, a2p));
    if (h2p < 0.0) h2p += 360.0;

    float dLp = L2 - L1;
    float dCp = C2p - C1p;
    float dhp = 0.0;
    if (C1p * C2p > 1e-8) {
      float dh = h2p - h1p;
      if (abs(dh) <= 180.0) dhp = dh;
      else if (dh > 180.0) dhp = dh - 360.0;
      else dhp = dh + 360.0;
    }
    float dHp = 2.0 * sqrt(C1p * C2p) * sin(radians(dhp * 0.5));

    float Lbarp = 0.5 * (L1 + L2);
    float Cbarp = 0.5 * (C1p + C2p);
    float hbarp = h1p + h2p;
    if (C1p * C2p > 1e-8) {
      if (abs(h1p - h2p) <= 180.0) hbarp = 0.5 * (h1p + h2p);
      else if (h1p + h2p < 360.0) hbarp = 0.5 * (h1p + h2p + 360.0);
      else hbarp = 0.5 * (h1p + h2p - 360.0);
    }

    float T = 1.0
      - 0.17 * cos(radians(hbarp - 30.0))
      + 0.24 * cos(radians(2.0 * hbarp))
      + 0.32 * cos(radians(3.0 * hbarp + 6.0))
      - 0.20 * cos(radians(4.0 * hbarp - 63.0));

    float dTheta = 30.0 * exp(-pow((hbarp - 275.0) / 25.0, 2.0));
    float Cbarp7 = pow(Cbarp, 7.0);
    float RC = 2.0 * sqrt(Cbarp7 / (Cbarp7 + 6103515625.0));
    float Lm50 = Lbarp - 50.0;
    float SL = 1.0 + (0.015 * Lm50 * Lm50) / sqrt(20.0 + Lm50 * Lm50);
    float SC = 1.0 + 0.045 * Cbarp;
    float SH = 1.0 + 0.015 * Cbarp * T;
    float RT = -sin(radians(2.0 * dTheta)) * RC;

    float kL = dLp / SL;
    float kC = dCp / SC;
    float kH = dHp / SH;
    return sqrt(max(0.0, kL * kL + kC * kC + kH * kH + RT * kC * kH));
  }

  int lblAt(ivec2 q) {
    ivec2 cq = clamp(q, ivec2(0), u_res - ivec2(1));
    return int(floor(texelFetch(u_labels, cq, 0).r + 0.5));
  }

  float magAt(ivec2 q) {
    ivec2 cq = clamp(q, ivec2(0), u_res - ivec2(1));
    return texelFetch(u_edgeTex, cq, 0).b;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int w = u_res.x, h = u_res.y;
    vec4 lInfo = texelFetch(u_labels, p, 0);
    int l0 = int(floor(lInfo.r + 0.5));
    if (lInfo.g > 0.5 || l0 < 0 || l0 >= u_K) {
      outEval = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vec3 pixRgb = texelFetch(u_rawTex, p, 0).rgb * 255.0;
    vec4 palEntry = texelFetch(u_palLut, ivec2(0, l0), 0);
    float palB = floor(palEntry.a / 256.0);
    float palG = palEntry.a - palB * 256.0;
    vec3 palRgb = vec3(palEntry.b, palG, palB);
    float de00 = ciede2000GL(rgbToLabGL(pixRgb), rgbToLabGL(palRgb));

    float bFlags = 0.0;
    if (p.x >= 1 && p.x < w - 1 && p.y >= 1 && p.y < h - 1) {
      bool isImgEdge = (magAt(p) >= u_edgeThr || magAt(p + ivec2(-1, 0)) >= u_edgeThr || magAt(p + ivec2(1, 0)) >= u_edgeThr || magAt(p + ivec2(0, -1)) >= u_edgeThr || magAt(p + ivec2(0, 1)) >= u_edgeThr);
      bool isSegEdge = (lblAt(p + ivec2(-1, 0)) != l0 || lblAt(p + ivec2(1, 0)) != l0 || lblAt(p + ivec2(0, -1)) != l0 || lblAt(p + ivec2(0, 1)) != l0);
      bFlags = (isImgEdge ? 1.0 : 0.0) + (isSegEdge ? 2.0 : 0.0);
    }

    float dFlags = 0.0;
    if (p.x >= 2 && p.x < w - 2 && p.y >= 2 && p.y < h - 2) {
      int lL1 = lblAt(p + ivec2(-1, 0)), lR1 = lblAt(p + ivec2(1, 0));
      int lU1 = lblAt(p + ivec2(0, -1)), lD1 = lblAt(p + ivec2(0, 1));
      int sameOrtho = (lL1 == l0 ? 1 : 0) + (lR1 == l0 ? 1 : 0) + (lU1 == l0 ? 1 : 0) + (lD1 == l0 ? 1 : 0);
      bool isOrphan = (sameOrtho == 0);
      bool isDetail = (magAt(p) >= u_edgeThr * 1.25);
      bool hasNearBnd = false;
      if (isDetail) {
        int lL2 = lblAt(p + ivec2(-2, 0)), lR2 = lblAt(p + ivec2(2, 0));
        int lU2 = lblAt(p + ivec2(0, -2)), lD2 = lblAt(p + ivec2(0, 2));
        hasNearBnd = (lL1 != l0 || lR1 != l0 || lU1 != l0 || lD1 != l0 || lL2 != l0 || lR2 != l0 || lU2 != l0 || lD2 != l0);
      }
      dFlags = (isOrphan ? 1.0 : 0.0) + (isDetail ? 2.0 : 0.0) + (hasNearBnd ? 4.0 : 0.0);
    }

    outEval = vec4(de00, bFlags, dFlags, 1.0);
  }`;

  function gpuEvaluateRoundTripMetrics(work, mask, labels, palette, edgeField, cls) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline !== 'full') return null;
    if (!work || !labels || !palette || !palette.length) return null;
    const env = getGl(_hwCfg.gpuPower);
    if (!env || !env.extFloat) return null;
    const { gl } = env;
    const { w, h } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return null;

    try {
      const ctx = (labels && labels._segCtx) || (work && work._segCtx) || null;
      const state = syncSegCtxToGpu(env, work, mask, palette, ctx, labels);
      if (!state) return null;

      let edgeSlot = GPUMemPool.getSlot('texEdgeField');
      if (!edgeSlot || edgeSlot.w !== w || edgeSlot.h !== h || !edgeSlot.isFloat) {
        gpuBuildEdgeField(work, mask);
        edgeSlot = GPUMemPool.getSlot('texEdgeField');
      }
      if (!edgeSlot) return null;

      const evalSlot = GPUMemPool.allocateSlot(gl, 'texTensor', w, h, true);
      if (!evalSlot || !evalSlot.isFloat) return null;

      const edgeThr = (cls && cls.type === 'photo') ? 18.5 : 13.5;

      const ok = runSlotPass(env, 'roundTripEvalDe00', FS_ROUNDTRIP_EVAL_DE00, evalSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, state.rawSlot.tex);    g.uniform1i(g.getUniformLocation(prog, 'u_rawTex'), 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, state.labSlotA.tex);   g.uniform1i(g.getUniformLocation(prog, 'u_labels'), 1);
        g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, edgeSlot.tex);         g.uniform1i(g.getUniformLocation(prog, 'u_edgeTex'), 2);
        g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, state.palLutSlot.tex); g.uniform1i(g.getUniformLocation(prog, 'u_palLut'), 3);
        g.uniform2i(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1i(g.getUniformLocation(prog, 'u_K'), state.K);
        g.uniform1f(g.getUniformLocation(prog, 'u_edgeThr'), edgeThr);
      });
      if (!ok) return null;

      const outBuf = MemPool.acquire(Float32Array, w * h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, evalSlot.fbo);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, outBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const stride = Math.max(1, Math.floor((w * h) / 16000));
      let sumDE00 = 0, validPix = 0;
      for (let p = 0; p < w * h; p += stride) {
        const idx = p * 4;
        if (outBuf[idx + 3] > 0.5) {
          sumDE00 += outBuf[idx];
          validPix++;
        }
      }

      const bStep = Math.max(1, Math.floor(Math.min(w, h) / 180));
      let interB = 0, unionB = 0, imgEdgeN = 0, segEdgeN = 0;
      for (let y = 1; y < h - 1; y += bStep) {
        const row = y * w;
        for (let x = 1; x < w - 1; x += bStep) {
          const p = row + x, idx = p * 4;
          if (outBuf[idx + 3] < 0.5) continue;
          const bf = Math.round(outBuf[idx + 1]);
          const isImgEdge = (bf & 1) !== 0;
          const isSegEdge = (bf & 2) !== 0;
          if (isImgEdge) imgEdgeN++;
          if (isSegEdge) segEdgeN++;
          if (isImgEdge && isSegEdge) interB++;
          if (isImgEdge || isSegEdge) unionB++;
        }
      }

      let detailHits = 0, detailTotal = 0, orphanNoise = 0;
      for (let y = 2; y < h - 2; y += bStep * 2) {
        const row = y * w;
        for (let x = 2; x < w - 2; x += bStep * 2) {
          const p = row + x, idx = p * 4;
          if (outBuf[idx + 3] < 0.5) continue;
          const df = Math.round(outBuf[idx + 2]);
          if ((df & 1) !== 0) orphanNoise++;
          if ((df & 2) !== 0) {
            detailTotal++;
            if ((df & 4) !== 0) detailHits++;
          }
        }
      }

      MemPool.release(outBuf);
      return {
        meanDE00: validPix > 0 ? (sumDE00 / validPix) : 0,
        validPix,
        interB, unionB, imgEdgeN, segEdgeN,
        detailHits, detailTotal, orphanNoise,
        bStep
      };
    } catch (e) {
      return null;
    }
  }

  function gpuBilateralPreFilter(work, mask, sigmaSpatial = 1.4, sigmaColor = 22, bOpt = {}) {
    if (!_hwCfg.useGpu || _hwCfg.gpuPipeline === 'off') return false;
    const env = getGl(_hwCfg.gpuPower);
    if (!env) return false;
    const { gl } = env;
    const { w, h, data } = work;
    if (w > HW_LIMITS.gpu.maxTexSize || h > HW_LIMITS.gpu.maxTexSize) return false;

    try {
      const rawSlot = uploadToSlot(work, 'texRawRGBA');
      const fltSlot = GPUMemPool.allocateSlot(gl, 'texFltRGBA', w, h, false);
      if (!rawSlot || !fltSlot) return false;

      const radius = clamp((bOpt && bOpt.radius) || (sigmaSpatial <= 1.15 ? 1 : 2), 1, 3);
      const wedgeThr = (bOpt && bOpt.wedgeGuardThr) || 780;

      const ok = runSlotPass(env, 'bilateral', FS_BILATERAL, fltSlot, (g, prog) => {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
        g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        g.uniform2f(g.getUniformLocation(prog, 'u_res'), w, h);
        g.uniform1f(g.getUniformLocation(prog, 'u_inv2Sp'), 1 / (2 * sigmaSpatial * sigmaSpatial));
        g.uniform1f(g.getUniformLocation(prog, 'u_inv2Col'), 1 / (2 * sigmaColor * sigmaColor * 9));
        g.uniform1f(g.getUniformLocation(prog, 'u_wedgeThr'), wedgeThr);
        g.uniform1i(g.getUniformLocation(prog, 'u_radius'), radius);
      });
      if (!ok) return false;

      /* Konversi paralel ke CIE-Lab di VRAM (Zero-Copy antar-slot: texFltRGBA -> texLabGrad) */
      if (env.extFloat) {
        const labSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', w, h, true);
        if (labSlot) {
          runSlotPass(env, 'rgb2lab', FS_RGB_TO_LAB, labSlot, (g, prog) => {
            g.activeTexture(g.TEXTURE0);
            g.bindTexture(g.TEXTURE_2D, fltSlot.tex);
            g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
          });
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, fltSlot.fbo);
      const out = MemPool.acquire(Uint8Array, w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const dst = data.data;
      for (let p = 0; p < w * h; p++) {
        if (mask && mask[p]) continue;
        const i = p * 4;
        dst[i] = out[i];
        dst[i + 1] = out[i + 1];
        dst[i + 2] = out[i + 2];
      }
      MemPool.release(out);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Parity Test Harness Tahap 1: Memverifikasi presisi numerik GPU vs CPU pada
     1) Transformasi ruang warna CIE-Lab D65 (Float32 FBO)
     2) Bilateral Filter Edge- & Corner-Preserving (termasuk Wedge & Crease Guard) */
  function runParitySelfTest() {
    const t0 = performance.now();
    const env = getGl(_hwCfg.gpuPower);
    if (!env) {
      lastParityReport = { ok: false, reason: 'Konteks WebGL2 tidak tersedia' };
      return lastParityReport;
    }
    const { gl, extFloat } = env;
    const W = 64, H = 64;
    const testImg = new ImageData(W, H);
    const d = testImg.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        /* Uji kombinasi baji sudut lancip, lembah garis 1px, dan gradasi warna */
        const isCrease = (x === 32 && y >= 10 && y <= 54);
        const isWedge = (y > x && (y - x) < 12 && x > 14 && x < 44);
        d[i]     = isCrease ? 18 : isWedge ? 235 : ((x * 4 + y * 2) & 255);
        d[i + 1] = isCrease ? 22 : isWedge ? 45  : ((x * 3 ^ y * 5) & 255);
        d[i + 2] = isCrease ? 28 : isWedge ? 60  : (240 - ((x * 2 + y * 3) & 200));
        d[i + 3] = 255;
      }
    }

    /* 1. Uji Paritas CIE-Lab (GPU RGBA32F vs CPU rgb2lab) */
    let labMaxErr = 0, labMeanErr = 0;
    const rawSlot = uploadToSlot({ w: W, h: H, data: testImg }, 'texRawRGBA');
    if (extFloat && rawSlot) {
      const labSlot = GPUMemPool.allocateSlot(gl, 'texLabGrad', W, H, true);
      if (labSlot) {
        runSlotPass(env, 'rgb2lab', FS_RGB_TO_LAB, labSlot, (g, prog) => {
          g.activeTexture(g.TEXTURE0);
          g.bindTexture(g.TEXTURE_2D, rawSlot.tex);
          g.uniform1i(g.getUniformLocation(prog, 'u_tex'), 0);
        });
        const gpuLab = new Float32Array(W * H * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, labSlot.fbo);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, gpuLab);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        let sumErr = 0;
        for (let p = 0; p < W * H; p++) {
          const i = p * 4;
          const [cL, ca, cb] = rgb2lab(d[i], d[i + 1], d[i + 2]);
          const err = Math.max(
            Math.abs(cL - gpuLab[i]),
            Math.abs(ca - gpuLab[i + 1]),
            Math.abs(cb - gpuLab[i + 2])
          );
          if (err > labMaxErr) labMaxErr = err;
          sumErr += err;
        }
        labMeanErr = sumErr / (W * H);
      }
    }

    /* 2. Uji Paritas Bilateral Corner-Preserving (GPU vs CPU) */
    const cpuWork = { w: W, h: H, data: new ImageData(new Uint8ClampedArray(d), W, H) };
    const gpuWork = { w: W, h: H, data: new ImageData(new Uint8ClampedArray(d), W, H) };
    const mask = new Uint8Array(W * H);
    gpuBilateralPreFilter(gpuWork, mask, 1.4, 22, { radius: 2, wedgeGuardThr: 780 });

    /* Jalankan referensi CPU sinkron pada salinan cpuWork */
    const srcC = new Uint8ClampedArray(cpuWork.data.data);
    const dstC = cpuWork.data.data;
    const radius = 2, wedgeThr = 780;
    const inv2Sp = 1 / (2 * 1.4 * 1.4), inv2Col = 1 / (2 * 22 * 22 * 9);
    const RING_DX = [1, 1, 0, -1, -1, -1, 0, 1];
    const RING_DY = [0, 1, 1, 1, 0, -1, -1, -1];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x, i0 = p * 4;
        const r0 = srcC[i0], g0 = srcC[i0 + 1], b0 = srcC[i0 + 2];
        let simN = 0, ringBits = 0;
        for (let k = 0; k < 8; k++) {
          const np = clamp(y + RING_DY[k], 0, H - 1) * W + clamp(x + RING_DX[k], 0, W - 1);
          const ni = np * 4;
          if (cdist2(r0, g0, b0, srcC[ni], srcC[ni + 1], srcC[ni + 2]) < wedgeThr) {
            simN++; ringBits |= (1 << k);
          }
        }
        if (simN <= 3) continue;
        if (simN === 4) {
          const dbl = ringBits | (ringBits << 8);
          let c4 = false;
          for (let k = 0; k < 8; k++) if (((dbl >> k) & 15) === 15) { c4 = true; break; }
          if (c4) continue;
        }
        if (x >= 2 && x < W - 2 && y >= 2 && y < H - 2) {
          const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
          let crease = false;
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const iA1 = ((y - dy) * W + (x - dx)) * 4, iB1 = ((y + dy) * W + (x + dx)) * 4;
            const iA2 = ((y - 2 * dy) * W + (x - 2 * dx)) * 4, iB2 = ((y + 2 * dy) * W + (x + 2 * dx)) * 4;
            const lA = Math.max(0.299 * srcC[iA1] + 0.587 * srcC[iA1 + 1] + 0.114 * srcC[iA1 + 2], 0.299 * srcC[iA2] + 0.587 * srcC[iA2 + 1] + 0.114 * srcC[iA2 + 2]);
            const lB = Math.max(0.299 * srcC[iB1] + 0.587 * srcC[iB1 + 1] + 0.114 * srcC[iB1 + 2], 0.299 * srcC[iB2] + 0.587 * srcC[iB2 + 1] + 0.114 * srcC[iB2 + 2]);
            const lMinA = Math.min(0.299 * srcC[iA1] + 0.587 * srcC[iA1 + 1] + 0.114 * srcC[iA1 + 2], 0.299 * srcC[iA2] + 0.587 * srcC[iA2 + 1] + 0.114 * srcC[iA2 + 2]);
            const lMinB = Math.min(0.299 * srcC[iB1] + 0.587 * srcC[iB1 + 1] + 0.114 * srcC[iB1 + 2], 0.299 * srcC[iB2] + 0.587 * srcC[iB2 + 1] + 0.114 * srcC[iB2 + 2]);
            if ((l0 < lA - 3.8 && l0 < lB - 3.8) || (l0 > lMinA + 5.5 && l0 > lMinB + 5.5)) { crease = true; break; }
          }
          if (crease) continue;
        }
        let sr = 0, sg = 0, sb = 0, sw = 0;
        const locInv = simN <= 5 ? inv2Col * 2.8 : inv2Col;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = clamp(y + dy, 0, H - 1) * W;
          for (let dx = -radius; dx <= radius; dx++) {
            const ni = (ny + clamp(x + dx, 0, W - 1)) * 4;
            const wgt = Math.exp(-(dx * dx + dy * dy) * inv2Sp) * Math.exp(-cdist2(r0, g0, b0, srcC[ni], srcC[ni + 1], srcC[ni + 2]) * locInv);
            sr += srcC[ni] * wgt; sg += srcC[ni + 1] * wgt; sb += srcC[ni + 2] * wgt; sw += wgt;
          }
        }
        if (sw > 1e-6) {
          dstC[i0] = Math.round(sr / sw); dstC[i0 + 1] = Math.round(sg / sw); dstC[i0 + 2] = Math.round(sb / sw);
        }
      }
    }

    let bilatMaxDiff = 0, bilatExactMatches = 0;
    const gOut = gpuWork.data.data;
    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      const df = Math.max(Math.abs(dstC[i] - gOut[i]), Math.abs(dstC[i + 1] - gOut[i + 1]), Math.abs(dstC[i + 2] - gOut[i + 2]));
      if (df > bilatMaxDiff) bilatMaxDiff = df;
      if (df <= 1) bilatExactMatches++;
    }
    const matchPct = +((bilatExactMatches / (W * H)) * 100).toFixed(2);

    /* 3. Uji Paritas Tahap 2: DiZenzo Scharr 2D Color-Tensor + Structure Tensor 3x3 + Normal-Ray Flank Unmixing */
    let scharrMaxErr = 0, tensorMaxErr = 0, flankMatchPct = 100;
    if (extFloat) {
      const cpuEf = buildEdgeField(gpuWork, mask, true);
      const gpuEf = gpuBuildEdgeField(gpuWork, mask);
      if (gpuEf) {
        for (let p = 0; p < W * H; p++) {
          const eErr = Math.max(
            Math.abs(cpuEf.gx[p] - gpuEf.gx[p]),
            Math.abs(cpuEf.gy[p] - gpuEf.gy[p]),
            Math.abs(cpuEf.mag[p] - gpuEf.mag[p])
          );
          if (eErr > scharrMaxErr) scharrMaxErr = eErr;
        }
      }
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const cpuCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, cpuEf, true);
      const gpuCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, gpuEf || cpuEf, false);
      if (cpuCtx && gpuCtx) {
        let flankMatches = 0;
        for (let p = 0; p < W * H; p++) {
          const tErr = Math.max(
            Math.abs(cpuCtx.nxArr[p] - gpuCtx.nxArr[p]),
            Math.abs(cpuCtx.nyArr[p] - gpuCtx.nyArr[p]),
            Math.abs(cpuCtx.cohArr[p] - gpuCtx.cohArr[p]),
            Math.abs(cpuCtx.cornerArr[p] - gpuCtx.cornerArr[p])
          );
          if (tErr > tensorMaxErr) tensorMaxErr = tErr;
          if (cpuCtx.flankA[p] === gpuCtx.flankA[p] && cpuCtx.flankB[p] === gpuCtx.flankB[p] && Math.abs(cpuCtx.flankAlpha[p] - gpuCtx.flankAlpha[p]) < 1e-3) {
            flankMatches++;
          }
        }
        flankMatchPct = +((flankMatches / (W * H)) * 100).toFixed(2);
      }
    }

    /* 4. Uji Paritas Tahap 3: 4-Color Chromatic MRF Potts + 9-Bit Simple-Point Topological Invariants + Morphological Clean */
    let mrfMatchPct = 100, saddleCountAfterGpu = 0, thinStrokePreservedPct = 100;
    if (extFloat) {
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const ef = gpuBuildEdgeField(gpuWork, mask) || buildEdgeField(gpuWork, mask, true);
      const segCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, ef, false);
      const initLabels = new Int16Array(W * H);
      for (let p = 0; p < W * H; p++) {
        initLabels[p] = segCtx.thinStrokeLab[p] >= 0 ? segCtx.thinStrokeLab[p] : segCtx.rawNearestFlt[p];
      }
      const cpuLabels = new Int16Array(initLabels);
      const gpuLabels = new Int16Array(initLabels);

      localNeighborhoodEdgeSnap(gpuWork, mask, cpuLabels, testPal, ef, 2, segCtx, true);
      segmentMRF(gpuWork, mask, cpuLabels, testPal, { beta: 1350, maxIter: 10, topology: true, segCtx, forceCpu: true });
      morphologicalCleanStrokes(cpuLabels, W, H, gpuWork, testPal, mask, segCtx, true);

      gpuLocalNeighborhoodEdgeSnap(gpuWork, mask, gpuLabels, testPal, 2, segCtx);
      gpuSegmentMRF(gpuWork, mask, gpuLabels, testPal, { beta: 1350, maxIter: 10, topology: true }, segCtx);
      gpuMorphCleanStrokes(gpuLabels, W, H, gpuWork, testPal, mask, segCtx);

      let labelAgree = 0, thinTotal = 0, thinKept = 0;
      for (let p = 0; p < W * H; p++) {
        if (cpuLabels[p] === gpuLabels[p]) labelAgree++;
        if (segCtx.thinStrokeLab[p] >= 0) {
          thinTotal++;
          if (gpuLabels[p] === segCtx.thinStrokeLab[p]) thinKept++;
        }
      }
      mrfMatchPct = +((labelAgree / (W * H)) * 100).toFixed(2);
      thinStrokePreservedPct = thinTotal > 0 ? +((thinKept / thinTotal) * 100).toFixed(2) : 100;

      for (let y = 0; y < H - 1; y++) {
        for (let x = 0; x < W - 1; x++) {
          const p00 = y * W + x;
          const l00 = gpuLabels[p00], l10 = gpuLabels[p00 + 1], l01 = gpuLabels[p00 + W], l11 = gpuLabels[p00 + W + 1];
          if (l00 === l11 && l10 === l01 && l00 !== l10) saddleCountAfterGpu++;
        }
      }
    }

    /* 5. Uji Paritas Tahap 4: Sub-Pixel Beach Deconvolution pada Kisi (W+1)x(H+1) + Parallel Contour Taubin */
    let beachMaxErrPx = 0, beachPinMatchPct = 100, taubinMaxErrPx = 0;
    if (extFloat) {
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const ef = gpuBuildEdgeField(gpuWork, mask) || buildEdgeField(gpuWork, mask, true);
      const segCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, ef, false);
      const testLabels = new Int16Array(W * H);
      for (let p = 0; p < W * H; p++) {
        testLabels[p] = segCtx.thinStrokeLab[p] >= 0 ? segCtx.thinStrokeLab[p] : segCtx.rawNearestFlt[p];
      }
      gpuSegmentMRF(gpuWork, mask, testLabels, testPal, { beta: 1350, maxIter: 6, topology: true }, segCtx);
      gpuMorphCleanStrokes(testLabels, W, H, gpuWork, testPal, mask, segCtx);

      const GW = W + 1, GH = H + 1;
      const vxCpu = new Float64Array(GW * GH), vyCpu = new Float64Array(GW * GH);
      const vxGpu = new Float64Array(GW * GH), vyGpu = new Float64Array(GW * GH);
      const valCpu = new Uint8Array(GW * GH), valGpu = new Uint8Array(GW * GH);
      const pinCpu = new Uint8Array(GW * GH), pinGpu = new Uint8Array(GW * GH);
      const lblAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : testLabels[y * W + x];
      for (let y = 0; y <= H; y++) {
        for (let x = 0; x <= W; x++) {
          const k = y * GW + x;
          vxCpu[k] = vxGpu[k] = x;
          vyCpu[k] = vyGpu[k] = y;
          const nw = lblAt(x - 1, y - 1), ne = lblAt(x, y - 1), sw = lblAt(x - 1, y), se = lblAt(x, y);
          let deg = 0;
          if (nw !== ne) deg++; if (ne !== se) deg++; if (se !== sw) deg++; if (sw !== nw) deg++;
          valCpu[k] = valGpu[k] = deg;
        }
      }
      refineBeachPlanar(vxCpu, vyCpu, valCpu, pinCpu, testLabels, W, H, gpuWork, testPal, true);
      gpuRefineBeachPlanar(vxGpu, vyGpu, valGpu, pinGpu, testLabels, W, H, gpuWork, testPal);

      let pinAgree = 0;
      for (let k = 0; k < GW * GH; k++) {
        const dErr = Math.hypot(vxCpu[k] - vxGpu[k], vyCpu[k] - vyGpu[k]);
        if (dErr > beachMaxErrPx) beachMaxErrPx = dErr;
        if (pinCpu[k] === pinGpu[k]) pinAgree++;
      }
      beachPinMatchPct = +((pinAgree / (GW * GH)) * 100).toFixed(2);

      /* Uji paritas gpuTaubinFilterClosed vs CPU taubinFilterClosed pada poligon 64 titik */
      const ringPts = [];
      const ringPins = new Uint8Array(64);
      ringPins[0] = 1; ringPins[16] = 1; ringPins[32] = 1; ringPins[48] = 1;
      for (let i = 0; i < 64; i++) {
        const ang = (i / 64) * Math.PI * 2;
        ringPts.push([32 + Math.cos(ang) * 20 + (i & 1) * 0.35, 32 + Math.sin(ang) * 18 - (i & 1) * 0.25]);
      }
      const cpuTb = taubinFilterClosed(ringPts, ringPins, 6, 0.44, -0.46, true);
      const gpuTb = gpuTaubinFilterClosed(ringPts, ringPins, 6, 0.44, -0.46);
      if (gpuTb && gpuTb.length === cpuTb.length) {
        for (let i = 0; i < cpuTb.length; i++) {
          const te = Math.hypot(cpuTb[i][0] - gpuTb[i][0], cpuTb[i][1] - gpuTb[i][1]);
          if (te > taubinMaxErrPx) taubinMaxErrPx = te;
        }
      }
    }

    /* 6. Uji Paritas Tahap 5: Staircase Despeckle + Savitzky-Golay Fairing, Gauss-Newton Cubic Bézier Batch, & Closed-Loop CIEDE2000 Evaluator */
    let sgMaxErrPx = 0, bezierMaxErrPx = 0, de00EvalErr = 0;
    if (extFloat) {
      const stairPts = [];
      const stairPins = new Uint8Array(64);
      stairPins[0] = 1; stairPins[32] = 1;
      for (let i = 0; i < 64; i++) {
        const ang = (i / 64) * Math.PI * 2;
        const zig = ((i % 2 === 0) ? 0.32 : -0.32);
        stairPts.push([32 + Math.cos(ang) * 22 + zig, 32 + Math.sin(ang) * 18 - zig]);
      }
      const cpuSg = despeckleStaircaseClosed(stairPts, 0.65, null, stairPins, true);
      const gpuSg = gpuDespeckleStaircaseClosed(stairPts, 0.65, null, stairPins);
      if (gpuSg && gpuSg.length === cpuSg.length) {
        for (let i = 0; i < cpuSg.length; i++) {
          const se = Math.hypot(cpuSg[i][0] - gpuSg[i][0], cpuSg[i][1] - gpuSg[i][1]);
          if (se > sgMaxErrPx) sgMaxErrPx = se;
        }
      }

      /* Uji paritas Gauss-Newton Cubic Bézier Fitting (Batch GPU vs CPU fitCubicLS) */
      const testChains = [];
      for (let c = 0; c < 4; c++) {
        const chPts = [];
        const a0 = c * (Math.PI * 0.5);
        for (let k = 0; k <= 16; k++) {
          const u = k / 16;
          const ang = a0 + u * (Math.PI * 0.45);
          chPts.push([32 + Math.cos(ang) * (18 + c * 2), 32 + Math.sin(ang) * (15 + c * 2)]);
        }
        testChains.push({ pts: chPts, tanL: null, tanR: null, allowLine: false });
      }
      const gpuFits = gpuFitCubicBezierBatch(testChains);
      if (gpuFits && gpuFits.length === testChains.length) {
        for (let c = 0; c < testChains.length; c++) {
          const cpuFit = fitCubicLS(testChains[c].pts, null, null, false);
          const gFit = gpuFits[c];
          if (cpuFit && gFit) {
            const dP1 = Math.hypot(cpuFit.P1[0] - gFit.P1[0], cpuFit.P1[1] - gFit.P1[1]);
            const dP2 = Math.hypot(cpuFit.P2[0] - gFit.P2[0], cpuFit.P2[1] - gFit.P2[1]);
            const mErr = Math.max(dP1, dP2);
            if (mErr > bezierMaxErrPx) bezierMaxErrPx = mErr;
          }
        }
      }

      /* Uji paritas Closed-Loop Evaluator (GPU CIEDE2000 + Boundary IoU vs CPU) */
      const testPal = [
        { r: 18, g: 22, b: 28, hex: '#12161c' },
        { r: 235, g: 45, b: 60, hex: '#eb2d3c' },
        { r: 80, g: 140, b: 210, hex: '#508cd2' },
        { r: 210, g: 205, b: 120, hex: '#d2cd78' }
      ];
      const ef = gpuBuildEdgeField(gpuWork, mask) || buildEdgeField(gpuWork, mask, true);
      const segCtx = buildSegmentationContext(gpuWork, gpuWork, mask, testPal, ef, false);
      const evalLabels = new Int16Array(W * H);
      for (let p = 0; p < W * H; p++) evalLabels[p] = segCtx.rawNearestFlt[p];
      const cpuEval = evaluateSegmentationRoundTrip(gpuWork, mask, evalLabels, testPal, ef, { type: 'illustration', effectiveColors: 4 }, 4, 32, true);
      const gpuEval = evaluateSegmentationRoundTrip(gpuWork, mask, evalLabels, testPal, ef, { type: 'illustration', effectiveColors: 4 }, 4, 32, false);
      if (cpuEval && gpuEval) {
        de00EvalErr = Math.abs(cpuEval.meanDE00 - gpuEval.meanDE00) + Math.abs(cpuEval.boundaryIoU - gpuEval.boundaryIoU);
      }
    }

    const elapsedMs = +(performance.now() - t0).toFixed(2);

    lastParityReport = {
      ok: labMaxErr < 1e-3 && bilatMaxDiff <= 1 && scharrMaxErr < 2e-2 && tensorMaxErr < 1e-2 && flankMatchPct >= 99.0 && mrfMatchPct >= 94.0 && thinStrokePreservedPct >= 95.0 && saddleCountAfterGpu === 0 && beachMaxErrPx < 0.50 && beachPinMatchPct >= 99.5 && taubinMaxErrPx < 1e-3 && sgMaxErrPx < 1e-2 && bezierMaxErrPx < 1e-2 && de00EvalErr < 5e-2,
      backend: webgpuState.supported ? 'WebGPU + WebGL2 FBO' : (extFloat ? 'WebGL2 Float32 FBO' : 'WebGL2 RGBA8 FBO'),
      extFloat,
      labMaxErr: +labMaxErr.toExponential(2),
      labMeanErr: +labMeanErr.toExponential(2),
      bilatMaxDiffLsb: bilatMaxDiff,
      bilatMatchPct: matchPct,
      scharrMaxErr: +scharrMaxErr.toExponential(2),
      tensorMaxErr: +tensorMaxErr.toExponential(2),
      flankMatchPct,
      mrfMatchPct,
      thinStrokePreservedPct,
      saddleCountAfterGpu,
      beachMaxErrPx: +beachMaxErrPx.toExponential(2),
      beachPinMatchPct,
      taubinMaxErrPx: +taubinMaxErrPx.toExponential(2),
      sgMaxErrPx: +sgMaxErrPx.toExponential(2),
      bezierMaxErrPx: +bezierMaxErrPx.toExponential(2),
      de00EvalErr: +de00EvalErr.toExponential(2),
      elapsedMs,
      vramStats: GPUMemPool.getStats()
    };
    return lastParityReport;
  }

  function getEngineStatus() {
    const env = getGl(_hwCfg.gpuPower);
    return {
      ready: !!env,
      webgpuSupported: webgpuState.supported || HW_LIMITS.gpu.webgpu,
      webgpuAdapter: webgpuState.adapterName,
      webgl2Supported: HW_LIMITS.gpu.webgl2,
      floatFboSupported: env ? env.extFloat : HW_LIMITS.gpu.colorBufferFloat,
      offscreenSupported: HW_LIMITS.gpu.offscreenCanvas,
      vram: GPUMemPool.getStats(),
      lastParityReport
    };
  }

  /* Inisialisasi WebGPU ditunda secara malas (lazy) hingga benchmark atau proses GPU dibutuhkan agar tidak membebani saat halaman idle/scroll */

  return {
    gpuFlattenAlpha,
    gpuBilateralPreFilter,
    gpuBuildEdgeField,
    gpuBuildSegmentationTables,
    gpuLocalNeighborhoodEdgeSnap,
    gpuSegmentMRF,
    gpuErodeSandwichedRibbons,
    gpuResolveCheckerboardSaddles,
    gpuAbsorbBoundaryParasites,
    gpuMorphCleanStrokes,
    gpuRefineBeachPlanar,
    gpuTaubinFilterClosed,
    gpuDespeckleStaircaseClosed,
    gpuElasticaRelaxClosed,
    gpuFitCubicBezierBatch,
    gpuEvaluateRoundTripMetrics,
    getGl,
    beginGpuSession,
    uploadToSlot,
    uploadBufferToSlot,
    runSlotPass,
    runParitySelfTest,
    getEngineStatus,
    initWebGPUAsync
  };
})();

/* ---- 3. Multi-Thread Web Worker Pool (WorkerPool) ---- */
const WorkerPool = (() => {
  let workers = [];
  let workerUrl = null;
  let currentSize = 0;

  /* Kode sumber mandiri untuk Web Worker (berisi kernel Bilateral, Scharr, MRF Potts, CG Smoothing & Bezier Fitting) */
  const WORKER_CODE = `
  'use strict';
  const _hwCfg = { useGpu: false, gpuPipeline: 'off' };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function cdist2(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2, rm = (r1 + r2) * 0.5;
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  }

  /* 1. Kernel Strip Bilateral Pre-Filter */
  function runBilateralStrip(msg) {
    const { srcBuf, maskBuf, w, stripH, yStart, yEnd, radius, spWeight, inv2Col } = msg;
    const src = new Uint8ClampedArray(srcBuf);
    const mask = maskBuf ? new Uint8Array(maskBuf) : null;
    const outRows = yEnd - yStart;
    const out = new Uint8ClampedArray(outRows * w * 4);

    for (let y = yStart; y < yEnd; y++) {
      const outY = y - yStart;
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const i0 = p * 4;
        const oi = (outY * w + x) * 4;
        if (mask && mask[p]) {
          out[oi] = src[i0]; out[oi+1] = src[i0+1]; out[oi+2] = src[i0+2]; out[oi+3] = src[i0+3];
          continue;
        }
        const r0 = src[i0], g0 = src[i0 + 1], b0 = src[i0 + 2];
        const RING_DX = [1, 1, 0, -1, -1, -1, 0, 1];
        const RING_DY = [0, 1, 1, 1, 0, -1, -1, -1];
        let simN = 0, ringBits = 0;
        for (let k = 0; k < 8; k++) {
          const ny = clamp(y + RING_DY[k], 0, stripH - 1) * w;
          const np = ny + clamp(x + RING_DX[k], 0, w - 1);
          if (mask && mask[np]) continue;
          const ni = np * 4;
          if (cdist2(r0, g0, b0, src[ni], src[ni + 1], src[ni + 2]) < 780) {
            simN++;
            ringBits |= (1 << k);
          }
        }
        if (simN <= 3) {
          out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
          continue;
        }
        if (simN === 4) {
          const dbl = ringBits | (ringBits << 8);
          let contiguous4 = false;
          for (let k = 0; k < 8; k++) {
            if (((dbl >> k) & 15) === 15) { contiguous4 = true; break; }
          }
          if (contiguous4) {
            out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
            continue;
          }
        }
        if (x >= 2 && x < w - 2 && y >= 2 && y < stripH - 2) {
          const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
          let isCreaseOrRidge = false;
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const iA2 = ((y - 2 * dy) * w + (x - 2 * dx)) * 4;
            const iB2 = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
            const lA = 0.299 * src[iA2] + 0.587 * src[iA2 + 1] + 0.114 * src[iA2 + 2];
            const lB = 0.299 * src[iB2] + 0.587 * src[iB2 + 1] + 0.114 * src[iB2 + 2];
            if ((l0 < lA - 3.8 && l0 < lB - 3.8) || (l0 > lA + 5.5 && l0 > lB + 5.5)) {
              isCreaseOrRidge = true;
              break;
            }
          }
          if (isCreaseOrRidge) {
            out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
            continue;
          }
        }
        let sr = 0, sg = 0, sb = 0, sw = 0, wi = 0;
        const localInv2Col = simN <= 5 ? inv2Col * 2.8 : inv2Col;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = clamp(y + dy, 0, stripH - 1) * w;
          for (let dx = -radius; dx <= radius; dx++) {
            const np = ny + clamp(x + dx, 0, w - 1);
            const sw0 = spWeight[wi++];
            if (mask && mask[np]) continue;
            const ni = np * 4;
            const r = src[ni], g = src[ni + 1], b = src[ni + 2];
            const wgt = sw0 * Math.exp(-cdist2(r0, g0, b0, r, g, b) * localInv2Col);
            sr += r * wgt; sg += g * wgt; sb += b * wgt; sw += wgt;
          }
        }
        if (sw > 1e-6) {
          out[oi] = Math.round(sr / sw);
          out[oi+1] = Math.round(sg / sw);
          out[oi+2] = Math.round(sb / sw);
        } else {
          out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0;
        }
        out[oi+3] = src[i0+3];
      }
    }
    return { res: { outBuf: out.buffer, yStart, yEnd }, transfer: [out.buffer] };
  }

  /* 2. Kernel Strip DiZenzo Multi-Channel Scharr 2D Edge Field */
  function runEdgeStrip(msg) {
    const { lumBuf, rgBuf, byBuf, maskBuf, w, h, y0, y1 } = msg;
    const lum = new Float32Array(lumBuf);
    const cRG = new Float32Array(rgBuf);
    const cBY = new Float32Array(byBuf);
    const mask = maskBuf ? new Uint8Array(maskBuf) : null;
    const rows = y1 - y0;
    const gxArr = new Float32Array(rows * w);
    const gyArr = new Float32Array(rows * w);
    const magArr = new Float32Array(rows * w);
    const scharrAt = (arr, x, y) => {
      const ym1 = clamp(y - 1, 0, h - 1) * w, y0c = clamp(y, 0, h - 1) * w, yp1 = clamp(y + 1, 0, h - 1) * w;
      const xm1 = clamp(x - 1, 0, w - 1), x0c = clamp(x, 0, w - 1), xp1 = clamp(x + 1, 0, w - 1);
      const gx = (-3 * arr[ym1 + xm1] - 10 * arr[y0c + xm1] - 3 * arr[yp1 + xm1]
                 + 3 * arr[ym1 + xp1] + 10 * arr[y0c + xp1] + 3 * arr[yp1 + xp1]) / 32;
      const gy = (-3 * arr[ym1 + xm1] - 10 * arr[ym1 + x0c] - 3 * arr[ym1 + xp1]
                 + 3 * arr[yp1 + xm1] + 10 * arr[yp1 + x0c] + 3 * arr[yp1 + xp1]) / 32;
      return [gx, gy];
    };

    for (let y = y0; y < y1; y++) {
      const ry = (y - y0) * w;
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (mask && mask[p]) continue;
        const [lx, ly] = scharrAt(lum, x, y);
        const [rx, ry2] = scharrAt(cRG, x, y);
        const [bx, by] = scharrAt(cBY, x, y);
        const gxx = lx * lx + rx * rx + bx * bx;
        const gyy = ly * ly + ry2 * ry2 + by * by;
        const gxy = lx * ly + rx * ry2 + bx * by;
        const tr = gxx + gyy;
        if (tr > 1e-6) {
          const disc = Math.hypot(gxx - gyy, 2 * gxy);
          const lambda1 = Math.max(0, 0.5 * (tr + disc));
          const mag = Math.sqrt(lambda1);
          const theta = 0.5 * Math.atan2(2 * gxy, gxx - gyy);
          let vx = Math.cos(theta), vy = Math.sin(theta);
          const domX = Math.abs(lx) >= Math.abs(rx) && Math.abs(lx) >= Math.abs(bx) ? lx : (Math.abs(rx) >= Math.abs(bx) ? rx : bx);
          const domY = Math.abs(ly) >= Math.abs(ry2) && Math.abs(ly) >= Math.abs(by) ? ly : (Math.abs(ry2) >= Math.abs(by) ? ry2 : by);
          if (vx * domX + vy * domY < 0) { vx = -vx; vy = -vy; }
          gxArr[ry + x] = vx * mag;
          gyArr[ry + x] = vy * mag;
          magArr[ry + x] = mag;
        }
      }
    }
    return {
      res: { y0, y1, gxBuf: gxArr.buffer, gyBuf: gyArr.buffer, magBuf: magArr.buffer },
      transfer: [gxArr.buffer, gyArr.buffer, magArr.buffer]
    };
  }

  /* 3. Kernel Paralel Smoothing (Taubin + Polak-Ribiere CG) & Constrained G1 Cubic Bezier Fitting */
  const r2 = v => Math.round(v * 100) / 100;
  ${[
    taubinFilterClosed,
    fitLine2D,
    fitCircle2D,
    cssCornerPersistence,
    filletSupport,
    despeckleStaircaseClosed,
    detectCornersAndExtrema,
    detectCorners,
    oneSidedTangentOpen,
    detectMaximalStraightSpans,
    computeContourAdaptiveOpts,
    smoothLoop,
    evalBezier,
    evalBezierDeriv1,
    evalBezierDeriv2,
    reparameterize,
    smoothTangentClosed,
    smoothTangentOpen,
    fitCubicLS,
    fitChain,
    harmonizeG1Joints,
    fitLoopBeziers,
    segsToD
  ].map(fn => fn.toString()).join('\n  ')}
  function runSmoothAndFitBatch(msg) {
    const { items, scale, lambda, iters, detectCorners, cornerAngle, tol, advOpt } = msg;
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(it.pts, it.area, lambda, tol, scale, advOpt || {});
      const s = smoothLoop(it.pts, { ...localAdv, lambda: localLambda, iters, detectCorners, cornerAngle, juncFlags: it.juncFlags, isTrueCircle: it.isTrueCircle });
      const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
      const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
      const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: it.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt || {});
      let sharpCnt = 0, smoothCnt = 0, lineCnt = 0, curveCnt = 0;
      const sharpPts = [], smoothPts = [];
      for (let k = 0; k < s.corners.length; k++) {
        if (s.corners[k]) { sharpCnt++; sharpPts.push(spts[k]); }
        else if (s.smoothKnots && s.smoothKnots[k]) { smoothCnt++; smoothPts.push(spts[k]); }
      }
      for (let k = 0; k < segs.length; k++) {
        if (segs[k].isLine) lineCnt++; else curveCnt++;
      }
      results.push({ idx: it.idx, label: it.label, area: it.area * scale * scale, scaledPts: spts, segs, d: segsToD(segs, true), sharpCnt, smoothCnt, lineCnt, curveCnt, sharpPts, smoothPts, isTrueCircle: !!s.isTrueCircle });
    }
    return { res: { results }, transfer: [] };
  }

  self.onmessage = e => {
    const { id, task, payload } = e.data;
    try {
      let out;
      if (task === 'bilateral') out = runBilateralStrip(payload);
      else if (task === 'edge') out = runEdgeStrip(payload);
      else if (task === 'smoothFit') out = runSmoothAndFitBatch(payload);
      else out = { res: { ok: true }, transfer: [] };
      self.postMessage({ id, ok: true, res: out.res }, out.transfer || []);
    } catch (err) {
      self.postMessage({ id, ok: false, error: String(err && err.message || err) });
    }
  };
  `;

  let _workerFailed = false;

  function cleanupDeadWorkers() {
    while (workers.length > 0) {
      const w = workers.pop();
      try { w.terminate(); } catch (e) {}
    }
    currentSize = 0;
    /* [FIX-2026-10-29] Jangan mengunci _workerFailed selamanya: dulu
       satu timeout / satu worker rusak mematikan WorkerPool untuk
       seluruh sesi (ensurePool selalu mengembalikan []), padahal
       pemanggil sudah jatuh ke CPU dan worker baru bisa saja sehat.
       Setelah worker mati diberhentikan, pool boleh dicoba lagi di
       tahap berikutnya; bila rusak lagi, fallback CPU tetap berjalan. */
    _workerFailed = false;
  }

  function ensurePool(desiredCount) {
    const n = clamp(desiredCount, 1, 32);
    if (typeof Worker === 'undefined') return [];
    /* [FIX-2026-10-29] Bila latch kegagalan aktif tapi tidak ada worker
       hidup tersisa (mis. listener error global yang menandai gagal di
       luar tugas), bersihkan dan beri pool kesempatan baru — bukan
       menolak selamanya. Worker yang benar-benar rusak tetap akan
       gagal per-tahap dan jatuh ke CPU. */
    if (_workerFailed && !workers.some(w => !w._dead)) cleanupDeadWorkers();
    try {
      workers = workers.filter(w => !w._dead);
      if (!workerUrl) {
        workerUrl = URL.createObjectURL(new Blob([WORKER_CODE], { type: 'application/javascript' }));
      }
      while (workers.length > n) {
        const w = workers.pop();
        try { w.terminate(); } catch (e) {}
      }
      while (workers.length < n) {
        const w = new Worker(workerUrl);
        w._busy = false;
        w._dead = false;
        w.addEventListener('error', e => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          w._dead = true;
          _workerFailed = true;
        });
        workers.push(w);
      }
      currentSize = workers.length;
      return workers;
    } catch (e) {
      _workerFailed = true;
      cleanupDeadWorkers();
      return [];
    }
  }

  let _reqId = 1;
  function execOnWorker(worker, task, payload, transfer = []) {
    return new Promise((resolve, reject) => {
      if (!worker || worker._dead || _workerFailed) {
        reject(new Error('Worker unavailable'));
        return;
      }
      const id = _reqId++;
      let settled = false;
      /* [FIX-2026-10-29] Handler didefinisikan SEBELUM timer (dulu timer
         menutup onMsg/onErr yang baru dideklarasi setelahnya — sah
         secara closure, tapi rapuh dan membingungkan) dan batas waktu
         dinaikkan 2,5 dtk -> 10 dtk agar tab yang di-throttle / perangkat
         lambat tidak salah dinyatakan mati. */
      const onMsg = e => {
        if (!e.data || e.data.id !== id || settled) return;
        settled = true;
        clearTimeout(timer);
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        if (e.data.ok) resolve(e.data.res);
        else reject(new Error(e.data.error || 'Worker error'));
      };
      const onErr = err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err && typeof err.preventDefault === 'function') err.preventDefault();
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        worker._dead = true;
        _workerFailed = true;
        reject(new Error('Worker script error'));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        worker._dead = true;
        _workerFailed = true;
        reject(new Error('Worker timeout'));
      }, 10000);
      worker.addEventListener('message', onMsg);
      worker.addEventListener('error', onErr);
      try {
        worker.postMessage({ id, task, payload }, transfer);
      } catch (postErr) {
        settled = true;
        clearTimeout(timer);
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        worker._dead = true;
        _workerFailed = true;
        reject(postErr);
      }
    });
  }

  async function bilateralPreFilterParallel(work, mask, sigmaSpatial = 1.4, sigmaColor = 22, cores = 4, onTick, bOpt = {}) {
    const pool = ensurePool(cores);
    if (pool.length <= 1) {
      await bilateralPreFilter(work, mask, sigmaSpatial, sigmaColor, onTick, bOpt);
      return false;
    }
    try {
      const { data, w, h } = work;
      const radius = clamp(Math.round((bOpt && bOpt.radius) || (sigmaSpatial <= 1.05 ? 1 : 2)), 1, 2);
      const spWeight = new Float32Array((2 * radius + 1) * (2 * radius + 1));
      const inv2Sp = 1 / (2 * sigmaSpatial * sigmaSpatial);
      const inv2Col = 1 / (2 * sigmaColor * sigmaColor * 9);
      let idx = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) spWeight[idx++] = Math.exp(-(dx * dx + dy * dy) * inv2Sp);
      }

      const K = Math.min(pool.length, Math.max(1, Math.floor(h / 16)));
      const jobs = [];
      for (let k = 0; k < K; k++) {
        const y0 = Math.floor((k * h) / K);
        const y1 = Math.floor(((k + 1) * h) / K);
        const padY0 = Math.max(0, y0 - radius);
        const padY1 = Math.min(h, y1 + radius);
        const stripH = padY1 - padY0;
        const srcSlice = data.data.slice(padY0 * w * 4, padY1 * w * 4);
        const maskSlice = mask ? mask.slice(padY0 * w, padY1 * w) : null;
        const transfers = [srcSlice.buffer];
        if (maskSlice) transfers.push(maskSlice.buffer);
        MemPool.trackAlloc(srcSlice.byteLength + (maskSlice ? maskSlice.byteLength : 0));
        jobs.push(
          execOnWorker(pool[k], 'bilateral', {
            srcBuf: srcSlice.buffer,
            maskBuf: maskSlice ? maskSlice.buffer : null,
            w,
            stripH,
            yStart: y0 - padY0,
            yEnd: (y1 - padY0),
            radius,
            spWeight,
            inv2Col
          }, transfers).then(res => ({ ...res, globalY0: y0, globalY1: y1 }))
        );
      }
      const results = await Promise.all(jobs);
      for (const r of results) {
        const stripOut = new Uint8ClampedArray(r.outBuf);
        data.data.set(stripOut, r.globalY0 * w * 4);
      }
      if (onTick) await onTick(1);
      return true;
    } catch (err) {
      cleanupDeadWorkers();
      await bilateralPreFilter(work, mask, sigmaSpatial, sigmaColor, onTick, bOpt);
      return false;
    }
  }

  async function buildEdgeFieldParallel(work, mask, cores = 4) {
    if (_hwCfg && _hwCfg.useGpu && _hwCfg.gpuPipeline === 'full' && GpuAccelerator.gpuBuildEdgeField) {
      const gpuEf = GpuAccelerator.gpuBuildEdgeField(work, mask);
      if (gpuEf) return gpuEf;
    }
    const pool = ensurePool(cores);
    if (pool.length <= 1) return buildEdgeField(work, mask, true);
    const { data, w, h } = work, d = data.data, n = w * h;
    const lum = MemPool.acquire(Float32Array, n);
    const cRG = MemPool.acquire(Float32Array, n);
    const cBY = MemPool.acquire(Float32Array, n);
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
      cRG[p] = (r - g) * 0.55;
      cBY[p] = (0.5 * (r + g) - b) * 0.45;
    }
    try {
      const K = Math.min(pool.length, Math.max(1, Math.floor(h / 16)));
      const jobs = [];
      for (let k = 0; k < K; k++) {
        const y0 = Math.floor((k * h) / K);
        const y1 = Math.floor(((k + 1) * h) / K);
        const lumCopy = new Float32Array(lum);
        const rgCopy = new Float32Array(cRG);
        const byCopy = new Float32Array(cBY);
        const maskCopy = mask ? new Uint8Array(mask) : null;
        const tr = [lumCopy.buffer, rgCopy.buffer, byCopy.buffer];
        if (maskCopy) tr.push(maskCopy.buffer);
        jobs.push(execOnWorker(pool[k], 'edge', { lumBuf: lumCopy.buffer, rgBuf: rgCopy.buffer, byBuf: byCopy.buffer, maskBuf: maskCopy ? maskCopy.buffer : null, w, h, y0, y1 }, tr));
      }
      const parts = await Promise.all(jobs);
      const gxArr = MemPool.acquire(Float32Array, n);
      const gyArr = MemPool.acquire(Float32Array, n);
      const magArr = MemPool.acquire(Float32Array, n);
      for (const pt of parts) {
        const off = pt.y0 * w;
        gxArr.set(new Float32Array(pt.gxBuf), off);
        gyArr.set(new Float32Array(pt.gyBuf), off);
        magArr.set(new Float32Array(pt.magBuf), off);
      }
      MemPool.release(cRG);
      MemPool.release(cBY);
      return { lum, gx: gxArr, gy: gyArr, mag: magArr };
    } catch (err) {
      cleanupDeadWorkers();
      MemPool.release(lum);
      MemPool.release(cRG);
      MemPool.release(cBY);
      return buildEdgeField(work, mask, true);
    }
  }

  async function smoothAndFitParallel(trLoops, scale, opt, cores = 4, onProgress) {
    const pool = ensurePool(cores);
    const nLoops = trLoops.length;
    if (pool.length <= 1 || nLoops < 4) return null;

    try {
      const K = Math.min(pool.length, nLoops);
      const buckets = Array.from({ length: K }, () => []);
      const indexed = trLoops.map((lp, idx) => ({
        idx,
        label: lp.label,
        pts: lp.pts.map(p => [p[0], p[1]]),
        juncFlags: lp.juncFlags,
        isTrueCircle: !!lp.isTrueCircle,
        area: lp.area
      })).sort((a, b) => b.pts.length - a.pts.length);

      indexed.forEach((item, i) => buckets[i % K].push(item));

      let doneBuckets = 0;
      const jobs = buckets.map((items, wi) =>
        execOnWorker(pool[wi], 'smoothFit', {
          items,
          scale,
          lambda: opt.lambda,
          iters: opt.iters || 52,
          detectCorners: opt.detectCorners !== false,
          cornerAngle: opt.cornerAngle || 52,
          tol: opt.tol,
          advOpt: opt.advOpt || {}
        }).then(res => {
          doneBuckets++;
          if (onProgress) onProgress(doneBuckets / K);
          return res.results;
        })
      );

      const allBatches = await Promise.all(jobs);
      const flat = allBatches.flat().sort((a, b) => a.idx - b.idx);
      return flat;
    } catch (err) {
      cleanupDeadWorkers();
      return null;
    }
  }

  return {
    ensurePool,
    bilateralPreFilterParallel,
    buildEdgeFieldParallel,
    smoothAndFitParallel
  };
})();

/* ---- Kontrol Interaktif Real-Time Tracing (Jeda, Kecepatan, Scrubber) ---- */
const _traceCtrl = {
  paused: false,
  speed: 1,
  skipToEnd: false,
  holdOnComplete: true,
};
const _traceCtrlListeners = new Set();
function getTraceCtrl() { return _traceCtrl; }
function setTraceCtrl(patch) {
  Object.assign(_traceCtrl, typeof patch === 'function' ? patch(_traceCtrl) : patch);
  _traceCtrlListeners.forEach(fn => { try { fn({ ..._traceCtrl }); } catch (e) {} });
  return _traceCtrl;
}
function subscribeTraceCtrl(fn) {
  _traceCtrlListeners.add(fn);
  return () => _traceCtrlListeners.delete(fn);
}

/* ---- Builder Kanvas & Geometri Real-Time Tracing (Dibatasi <= 720px agar hemat VRAM & cepat) ---- */
const VIZ_MAX_DIM = 720;
function getVizDims(w, h) {
  const maxD = Math.max(w, h);
  if (maxD <= VIZ_MAX_DIM) return { vw: w, vh: h, scaled: false };
  const k = VIZ_MAX_DIM / maxD;
  return { vw: Math.max(16, Math.round(w * k)), vh: Math.max(16, Math.round(h * k)), scaled: true };
}

function buildVizRgbaCanvas(rgba, w, h) {
  const { vw, vh, scaled } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  const ctx = c.getContext('2d');
  if (!scaled) {
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
    return c;
  }
  const out = ctx.createImageData(vw, vh);
  const d = out.data;
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      const si = (sy + sx) * 4, di = (vy * vw + vx) * 4;
      d[di] = rgba[si]; d[di + 1] = rgba[si + 1]; d[di + 2] = rgba[si + 2]; d[di + 3] = rgba[si + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function buildVizEdgeScanCanvas(rgba, edgeMag, mask, w, h) {
  const { vw, vh } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(vw, vh);
  const d = out.data;
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    const vRow = vy * vw;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      const p = sy + sx;
      const i = p * 4, di = (vRow + vx) * 4;
      if (mask && mask[p]) {
        d[di] = 15; d[di + 1] = 23; d[di + 2] = 42; d[di + 3] = 180;
        continue;
      }
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      const mag = edgeMag ? edgeMag[p] : 0;
      const m = clamp(mag / 36, 0, 1);
      const baseK = 0.26 * (1 - m * 0.45);
      let er = 0, eg = 0, eb = 0;
      if (m > 0.05) {
        if (m < 0.52) {
          const t = (m - 0.05) / 0.47;
          er = 12 * t; eg = 190 * t + 24; eb = 240 * t + 35;
        } else {
          const t = (m - 0.52) / 0.48;
          er = 12 + 238 * t; eg = 214 - 40 * t; eb = 255 - 150 * t;
        }
      }
      d[di]     = clamp(Math.round(r * baseK + er), 0, 255);
      d[di + 1] = clamp(Math.round(g * baseK + eg), 0, 255);
      d[di + 2] = clamp(Math.round(b * baseK + eb), 0, 255);
      d[di + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function buildVizLabelCanvas(labels, palette, w, h, withBorders = true) {
  const { vw, vh, scaled } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  if (!scaled) {
    renderSeg(c, labels, palette, w, h, { bounds: withBorders });
    return c;
  }
  const subLabels = new Int16Array(vw * vh);
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    const vRow = vy * vw;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      subLabels[vRow + vx] = labels[sy + sx];
    }
  }
  renderSeg(c, subLabels, palette, vw, vh, { bounds: withBorders });
  return c;
}

function buildVizDiffCanvas(beforeLabels, afterLabels, w, h) {
  const { vw, vh } = getVizDims(w, h);
  const c = document.createElement('canvas');
  c.width = vw; c.height = vh;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(vw, vh);
  const d = out.data;
  let diffCount = 0;
  for (let p = 0; p < w * h; p++) {
    if (beforeLabels[p] !== afterLabels[p]) diffCount++;
  }
  for (let vy = 0; vy < vh; vy++) {
    const sy = Math.min(h - 1, Math.floor((vy * h) / vh)) * w;
    const vRow = vy * vw;
    for (let vx = 0; vx < vw; vx++) {
      const sx = Math.min(w - 1, Math.floor((vx * w) / vw));
      const p = sy + sx;
      if (beforeLabels[p] !== afterLabels[p]) {
        const di = (vRow + vx) * 4;
        d[di] = 245; d[di + 1] = 158; d[di + 2] = 11; d[di + 3] = 235;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return { canvas: c, diffCount };
}

function buildPaletteProbes(work, mask, palette, scale) {
  if (!work || !work.data || !palette || !palette.length) return [];
  const { data, w, h } = work, d = data.data;
  const K = palette.length;
  const counts = new Int32Array(K);
  const bestD = new Float64Array(K).fill(Infinity);
  const bestX = new Float64Array(K);
  const bestY = new Float64Array(K);
  let totalValid = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 110));
  for (let y = step; y < h - step; y += step) {
    for (let x = step; x < w - step; x += step) {
      const p = y * w + x;
      if (mask && mask[p]) continue;
      totalValid++;
      const i = p * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      let bi = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const c = palette[k];
        const dd = cdist2(r, g, b, c.r, c.g, c.b);
        if (dd < bd) { bd = dd; bi = k; }
      }
      counts[bi]++;
      const centerBias = Math.hypot(x - w * 0.5, y - h * 0.5) * 0.06;
      if (bd + centerBias < bestD[bi]) {
        bestD[bi] = bd + centerBias;
        bestX[bi] = (x + 0.5) * scale;
        bestY[bi] = (y + 0.5) * scale;
      }
    }
  }
  return palette.map((c, k) => ({
    hex: c.hex,
    r: c.r, g: c.g, b: c.b,
    x: bestX[k] || (w * 0.5 * scale),
    y: bestY[k] || (h * 0.5 * scale),
    pct: totalValid > 0 ? Math.max(0.1, +((counts[k] / totalValid) * 100).toFixed(1)) : 0
  }));
}

function buildVizGeometryInto(vizState, rawLoops, smoothed, palette, scale) {
  const rawViz = [];
  for (let i = 0; i < rawLoops.length; i++) {
    const lp = rawLoops[i];
    const col = (palette[lp.label] && palette[lp.label].hex) || '#38bdf8';
    const pts = lp.rawPts.map(p => [p[0] * scale, p[1] * scale]);
    const juncPts = [];
    if (lp.juncFlags) {
      for (let k = 0; k < lp.juncFlags.length; k++) {
        if (lp.juncFlags[k] && pts[k]) juncPts.push(pts[k]);
      }
    }
    rawViz.push({ label: lp.label, color: col, pts, juncPts, area: Math.abs((lp.area || 0) * scale * scale) });
  }
  rawViz.sort((a, b) => b.area - a.area);
  vizState.rawLoops = rawViz;

  if (smoothed && smoothed.length) {
    const smViz = [];
    const bzViz = [];
    for (let i = 0; i < smoothed.length; i++) {
      const s = smoothed[i];
      const raw = rawLoops[i];
      const col = (palette[s.label] && palette[s.label].hex) || '#6366f1';
      const pts = s.pts || s.scaledPts || [];
      const rPts = raw ? raw.rawPts.map(p => [p[0] * scale, p[1] * scale]) : pts;
      let sharpPts = s.sharpPts || [];
      let smoothPts = s.smoothPts || [];
      if (!sharpPts.length && !smoothPts.length && s.segs) {
        for (const sg of s.segs) {
          if (sg.startSharp) sharpPts.push(sg.P0);
          else smoothPts.push(sg.P0);
        }
      }
      const absA = Math.abs(s.area || 0);
      smViz.push({ label: s.label, color: col, pts, rawPts: rPts, sharpPts, smoothPts, area: absA });
      if (s.segs && s.segs.length) {
        const dStr = s.d || segsToD(s.segs, true);
        let p2d = null;
        try { p2d = new Path2D(dStr); } catch (e) {}
        bzViz.push({ label: s.label, color: col, segs: s.segs, d: dStr, p2d, area: absA });
      }
    }
    smViz.sort((a, b) => b.area - a.area);
    bzViz.sort((a, b) => b.area - a.area);
    vizState.smoothedLoops = smViz;
    vizState.bezierLoops = bzViz;

    const drawingSegs = [];
    for (let li = 0; li < bzViz.length; li++) {
      const bl = bzViz[li];
      for (let si = 0; si < bl.segs.length; si++) {
        drawingSegs.push({
          seg: bl.segs[si],
          color: bl.color,
          loopIdx: li,
          segIdxInLoop: si,
          isFirstInLoop: si === 0,
          isLastInLoop: si === bl.segs.length - 1,
          loopP2d: bl.p2d
        });
      }
    }
    vizState.drawingSegs = drawingSegs;
  }
}

function buildTraceHistoryFromSession(sess, job) {
  if (sess && sess.traceHistory) return sess.traceHistory;
  if (!sess) return null;
  const { w, h, W, H, scale, palette, labels, loops, regs, svg, workData, mask, cls } = sess;
  const rgba = workData && workData.data ? workData.data : (job && job.work && job.work.data ? job.work.data.data : null);
  const origRgba = (job && job.workOrig) ? job.workOrig : rgba;
  const edgeField = workData ? buildEdgeField({ data: workData, w, h }, mask) : null;
  const vizState = {
    w, h, W, H, scale,
    cls: cls || (job && job.cls) || {},
    alphaInfo: (sess.stats && sess.stats.alpha) || (job && job.alpha) || {},
    origCanvas: origRgba ? buildVizRgbaCanvas(origRgba, w, h) : null,
    edgeScanCanvas: rgba ? buildVizEdgeScanCanvas(rgba, edgeField ? edgeField.mag : null, mask, w, h) : null,
    palette: palette || [],
    paletteProbes: workData ? buildPaletteProbes({ data: workData, w, h }, mask, palette || [], scale) : [],
    quantCanvas: (labels && palette) ? buildVizLabelCanvas(labels, palette, w, h, false) : null,
    qtCanvas: (labels && palette) ? buildVizLabelCanvas(labels, palette, w, h, true) : null,
    segFinalCanvas: (labels && palette) ? buildVizLabelCanvas(labels, palette, w, h, true) : null,
    segDiffCanvas: null,
    cleanedPixels: 0,
    quadBlocks: [],
    rawLoops: [],
    smoothedLoops: [],
    bezierLoops: [],
    drawingSegs: [],
    regs: regs || [],
    svg: svg || '',
    stats: sess.stats || {}
  };
  const synthSmoothed = [];
  if (regs) {
    for (const rg of regs) {
      for (const lp of (rg.loops || [])) {
        synthSmoothed.push({ label: rg.label, pts: lp.pts || [], scaledPts: lp.pts || [], segs: lp.segs || [], d: lp.d, area: lp.area || 0 });
      }
    }
  }
  buildVizGeometryInto(vizState, loops || [], synthSmoothed, palette || [], scale || 1);
  sess.traceHistory = vizState;
  return vizState;
}

/* [RT-SMOOTH] Pemutaran animasi tahap berbasis waktu nyata (per-frame), bukan loncatan sleep(36 ms).
   - Durasi "reveal" minimum dijamin, sehingga pada citra resolusi tinggi (komputasi > budget) animasi sapuan
     tidak lagi hilang / meloncat langsung ke akhir tahap.
   - Menghormati jeda & perubahan kecepatan secara langsung di tengah tahap. */
const RT_MIN_REVEAL_MS = 420;
/* [FAST] Pacing/animasi buatan dimatikan: tiap tahap langsung lanjut begitu komputasinya selesai,
   sehingga durasi tracing = waktu komputasi nyata (CPU/VGA). Ubah ke true untuk mengembalikan animasi 6,4 dtk. */
const PACING_ENABLED = false;
async function paceStage(tStart, targetMs, stageId, f0, f1, detail, prog) {
  if (!PACING_ENABLED || _traceCtrl.skipToEnd || _traceCtrl.speed >= 8) {
    if (prog) await prog(stageId, f1, detail);
    return;
  }
  const sp0 = Math.max(0.25, _traceCtrl.speed || 1);
  const elapsed = performance.now() - tStart;
  const revealV = Math.max(targetMs - elapsed * sp0, Math.min(targetMs, RT_MIN_REVEAL_MS));
  if (prog && revealV > 20) {
    let t = 0, last = performance.now();
    while (t < 1) {
      if (_traceCtrl.skipToEnd || _traceCtrl.speed >= 8) break;
      if (_traceCtrl.paused) {
        await prog(stageId, f0 + (f1 - f0) * t, detail);
        last = performance.now();
        continue;
      }
      const now = performance.now();
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      const sp = Math.max(0.25, _traceCtrl.speed || 1);
      t = Math.min(1, t + (dt * sp) / revealV);
      await prog(stageId, f0 + (f1 - f0) * t, detail);
    }
  }
  if (prog) await prog(stageId, f1, detail);
}

