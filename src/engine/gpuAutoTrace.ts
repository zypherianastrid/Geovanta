/**
 * @file src/engine/gpuAutoTrace.ts
 * @description WebGL2 GPU-accelerated Auto Trace helper with automatic CPU fallback
 * and Ultra-Fidelity (99%+) Exact Crack-Following Vectorizer.
 */

export interface AutoTraceGpuInfo {
  gpuAvailable: boolean;
  webgl2: boolean;
  backend: string;
  renderer: string;
  vendor: string;
}

let _cachedGpuInfo: AutoTraceGpuInfo | null = null;

/**
 * Probes WebGL2 hardware acceleration availability and returns the active backend info.
 * Falls back cleanly to CPU when running in headless Node or environments without WebGL2.
 */
export function getAutoTraceGpuInfo(): AutoTraceGpuInfo {
  if (_cachedGpuInfo) return _cachedGpuInfo;
  const fallback: AutoTraceGpuInfo = {
    gpuAvailable: false,
    webgl2: false,
    backend: 'CPU Fallback',
    renderer: 'CPU Software',
    vendor: 'CPU',
  };
  if (typeof document === 'undefined') {
    _cachedGpuInfo = fallback;
    return fallback;
  }
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl2', { powerPreference: 'high-performance' });
    if (!gl) {
      _cachedGpuInfo = fallback;
      return fallback;
    }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = String((dbg && gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) || gl.getParameter(gl.VENDOR) || 'GPU');
    const renderer = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || 'WebGL2 GPU');
    const loseExt = gl.getExtension('WEBGL_lose_context');
    if (loseExt) loseExt.loseContext();
    _cachedGpuInfo = {
      gpuAvailable: true,
      webgl2: true,
      backend: 'WebGL2 GPU',
      renderer,
      vendor,
    };
    return _cachedGpuInfo;
  } catch {
    _cachedGpuInfo = fallback;
    return fallback;
  }
}

/**
 * Assigns each RGBA pixel to its nearest perceptual Redmean palette index using a WebGL2 fragment shader,
 * automatically falling back to CPU if WebGL2 is unavailable or `allowGpu === false`.
 */
export function gpuAssignNearestPalette(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  palette: Array<{ r: number; g: number; b: number; hex: string }>,
  allowGpu = true
): { labels: Int16Array; usedGpu: boolean; backend: string; renderer: string } {
  const n = w * h;
  if (allowGpu && typeof document !== 'undefined' && palette.length > 0 && palette.length <= 255) {
    try {
      const glCv = document.createElement('canvas');
      glCv.width = w;
      glCv.height = h;
      const gl = glCv.getContext('webgl2', { powerPreference: 'high-performance', preserveDrawingBuffer: true });
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || 'WebGL2 GPU');

        const vsSrc = `#version 300 es
          in vec2 aPos;
          out vec2 vUv;
          void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
        const fsSrc = `#version 300 es
          precision highp float;
          uniform sampler2D uImg;
          uniform sampler2D uPal;
          uniform int uK;
          in vec2 vUv;
          out vec4 fragColor;
          void main() {
            vec4 px = texture(uImg, vec2(vUv.x, 1.0 - vUv.y));
            if (px.a < 0.125) { fragColor = vec4(1.0, 1.0, 0.0, 1.0); return; }
            float bestD = 1e9;
            int bestK = 0;
            for (int k = 0; k < 256; k++) {
              if (k >= uK) break;
              vec3 c = texelFetch(uPal, ivec2(k, 0), 0).rgb;
              vec3 d = px.rgb - c;
              float rm = (px.r + c.r) * 0.5;
              float dist = (2.0 + rm) * d.r * d.r + 4.0 * d.g * d.g + (3.0 - rm) * d.b * d.b;
              if (dist < bestD) { bestD = dist; bestK = k; }
            }
            fragColor = vec4(float(bestK) / 255.0, 0.0, 0.0, 1.0);
          }`;

        const compile = (type: number, src: string) => {
          const sh = gl.createShader(type);
          if (!sh) throw new Error('Shader alloc failed');
          gl.shaderSource(sh, src);
          gl.compileShader(sh);
          if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(sh) || 'Shader compile error');
          }
          return sh;
        };

        const prog = gl.createProgram();
        if (!prog) throw new Error('Program alloc failed');
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(prog) || 'Program link error');
        }
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const imgBytes = rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength);
        const imgTex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imgTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgBytes);
        gl.uniform1i(gl.getUniformLocation(prog, 'uImg'), 0);

        const palBytes = new Uint8Array(256 * 4);
        for (let k = 0; k < palette.length; k++) {
          palBytes[k * 4] = palette[k].r;
          palBytes[k * 4 + 1] = palette[k].g;
          palBytes[k * 4 + 2] = palette[k].b;
          palBytes[k * 4 + 3] = 255;
        }
        const palTex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, palTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, palBytes);
        gl.uniform1i(gl.getUniformLocation(prog, 'uPal'), 1);
        gl.uniform1i(gl.getUniformLocation(prog, 'uK'), palette.length);

        gl.viewport(0, 0, w, h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        const outBytes = new Uint8Array(n * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, outBytes);

        const labels = new Int16Array(n);
        for (let y = 0; y < h; y++) {
          const srcRow = (h - 1 - y) * w;
          const dstRow = y * w;
          for (let x = 0; x < w; x++) {
            const si = (srcRow + x) * 4;
            labels[dstRow + x] = outBytes[si + 1] > 128 ? -1 : outBytes[si];
          }
        }
        const loseExt = gl.getExtension('WEBGL_lose_context');
        if (loseExt) loseExt.loseContext();
        return { labels, usedGpu: true, backend: 'WebGL2 GPU', renderer };
      }
    } catch {
      // Automatic fallback to CPU
    }
  }

  // CPU fallback
  const labels = new Int16Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (rgba[i + 3] < 32) {
      labels[p] = -1;
      continue;
    }
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    let bi = 0;
    let bd = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const c = palette[k];
      const dr = r - c.r, dg = g - c.g, db = b - c.b;
      const rm = (r + c.r) * 0.5;
      const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < bd) {
        bd = d;
        bi = k;
      }
    }
    labels[p] = bi;
  }
  return { labels, usedGpu: false, backend: 'CPU Fallback', renderer: 'CPU Software' };
}

/**
 * Extracts a density-weighted K-Means++ palette up to 250 colors for Ultra-Fidelity tracing.
 */
function extractUltraPalette(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  maxColors: number,
  hexOf: (r: number, g: number, b: number) => string
): Array<{ r: number; g: number; b: number; hex: string }> {
  const n = w * h;
  const sampleStep = Math.max(1, Math.floor(n / 14000));
  const pts: number[][] = [];
  for (let p = 0; p < n; p += sampleStep) {
    const i = p * 4;
    if (rgba[i + 3] >= 128) pts.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  }
  if (!pts.length) return [{ r: 0, g: 0, b: 0, hex: '#000000' }];

  const K = Math.max(2, Math.min(250, Math.round(maxColors || 250)));
  const cents: number[][] = [pts[Math.floor(pts.length / 2)].slice()];
  const minD = new Float64Array(pts.length).fill(Infinity);
  for (let k = 1; k < K; k++) {
    const last = cents[k - 1];
    let sumD = 0;
    for (let s = 0; s < pts.length; s++) {
      const dr = pts[s][0] - last[0], dg = pts[s][1] - last[1], db = pts[s][2] - last[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < minD[s]) minD[s] = d;
      sumD += minD[s];
    }
    if (sumD <= 1e-3) break;
    let target = sumD * 0.65;
    let chosen = 0;
    for (let s = 0; s < pts.length; s++) {
      target -= minD[s];
      if (target <= 0) {
        chosen = s;
        break;
      }
    }
    cents.push(pts[chosen].slice());
  }

  for (let iter = 0; iter < 5; iter++) {
    const sumR = new Float64Array(cents.length);
    const sumG = new Float64Array(cents.length);
    const sumB = new Float64Array(cents.length);
    const cnt = new Int32Array(cents.length);
    for (let s = 0; s < pts.length; s++) {
      const p = pts[s];
      let bi = 0, bd = Infinity;
      for (let k = 0; k < cents.length; k++) {
        const c = cents[k];
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bd) { bd = d; bi = k; }
      }
      sumR[bi] += p[0];
      sumG[bi] += p[1];
      sumB[bi] += p[2];
      cnt[bi]++;
    }
    for (let k = 0; k < cents.length; k++) {
      if (cnt[k] > 0) {
        cents[k][0] = Math.round(sumR[k] / cnt[k]);
        cents[k][1] = Math.round(sumG[k] / cnt[k]);
        cents[k][2] = Math.round(sumB[k] / cnt[k]);
      }
    }
  }

  const seen = new Set<string>();
  const palette: Array<{ r: number; g: number; b: number; hex: string }> = [];
  for (const c of cents) {
    const hex = hexOf(c[0], c[1], c[2]);
    if (!seen.has(hex)) {
      seen.add(hex);
      palette.push({ r: c[0], g: c[1], b: c[2], hex });
    }
  }
  return palette;
}

/**
 * Flood-fills contiguous near-white backdrop pixels starting only from the image's outer borders.
 * Never removes interior white regions (such as eyes, white shirts, or face highlights) enclosed by darker contours.
 */
export function maskEdgeConnectedWhiteBackdrop(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  whiteMin = 244
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  out.set(rgba);
  if (w < 2 || h < 2) return out;
  const n = w * h;
  const isNearWhite = (p: number) => {
    const i = p * 4;
    if (out[i + 3] < 32) return false;
    return out[i] >= whiteMin && out[i + 1] >= whiteMin && out[i + 2] >= whiteMin;
  };
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const push = (p: number) => {
    if (!visited[p] && isNearWhite(p)) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    push(y * w);
    push(y * w + (w - 1));
  }
  while (head < tail) {
    const p = queue[head++];
    out[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  return out;
}

/**
 * Traces an RGBA buffer in Ultra-Fidelity (99%+) mode using GPU WebGL2 palette labeling
 * (with automatic CPU fallback) and exact directed crack-following contours.
 */
export function traceUltraExactVectorSvg(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  VMT: any,
  opts: {
    colorCount?: number;
    despeckle?: number;
    smoothness?: number;
    ignoreWhite?: boolean;
    useGpu?: boolean;
  },
  onProgress?: (stage: string, frac: number, detail: string) => void
): { svg: string; palette: any[]; stats: any } {
  const t0 = performance.now();
  const workRgba = opts.ignoreWhite ? maskEdgeConnectedWhiteBackdrop(rgba, w, h, 244) : rgba;

  onProgress?.('palette', 0.2, 'Extracting Ultra-Fidelity CIE/RGB palette…');
  const palette = extractUltraPalette(workRgba, w, h, opts.colorCount || 250, VMT.hexOf);

  onProgress?.('segment', 0.45, opts.useGpu !== false ? 'Assigning pixels via GPU WebGL2…' : 'Assigning pixels via CPU…');
  const assign = gpuAssignNearestPalette(workRgba, w, h, palette, opts.useGpu !== false);
  const labels = assign.labels;

  if ((opts.despeckle ?? 1) >= 2 && typeof VMT.enforceMinPixels === 'function') {
    VMT.enforceMinPixels(labels, w, h, Math.min(8, Math.round(opts.despeckle || 2)), null, palette);
  }

  onProgress?.('trace', 0.72, 'Tracing exact sub-pixel crack contours…');
  const edgesByLabel = new Map<number, Map<number, number[]>>();
  const w1 = w + 1;
  const V = (vx: number, vy: number) => vy * w1 + vx;
  const addEdge = (lbl: number, a: number, b: number) => {
    let m = edgesByLabel.get(lbl);
    if (!m) {
      m = new Map();
      edgesByLabel.set(lbl, m);
    }
    let arr = m.get(a);
    if (!arr) {
      arr = [];
      m.set(a, arr);
    }
    arr.push(b);
  };

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const L = labels[row + x];
      if (L < 0) continue;
      if (y === 0 || labels[row - w + x] !== L) addEdge(L, V(x, y), V(x + 1, y));
      if (x === w - 1 || labels[row + x + 1] !== L) addEdge(L, V(x + 1, y), V(x + 1, y + 1));
      if (y === h - 1 || labels[row + w + x] !== L) addEdge(L, V(x + 1, y + 1), V(x, y + 1));
      if (x === 0 || labels[row + x - 1] !== L) addEdge(L, V(x, y + 1), V(x, y));
    }
  }

  const doChaikin = Number(opts.smoothness || 0) >= 0.35;
  const pathTags: string[] = [];
  edgesByLabel.forEach((adj, lbl) => {
    const parts: string[] = [];
    adj.forEach((nexts, startV) => {
      while (nexts.length > 0) {
        let cur = startV;
        let nxt = nexts.pop()!;
        const ring: number[][] = [[cur % w1, (cur / w1) | 0]];
        let guard = 0;
        while (nxt !== startV && guard++ < w * h * 2) {
          const nx = nxt % w1;
          const ny = (nxt / w1) | 0;
          ring.push([nx, ny]);
          const list = adj.get(nxt);
          if (!list || !list.length) break;
          let pickIdx = list.length - 1;
          if (list.length > 1) {
            const prevX = ring[ring.length - 2][0];
            const prevY = ring[ring.length - 2][1];
            const dx = nx - prevX;
            const dy = ny - prevY;
            for (let idx = 0; idx < list.length; idx++) {
              const cand = list[idx];
              const cx = cand % w1;
              const cy = (cand / w1) | 0;
              if (cx - nx === -dy && cy - ny === dx) {
                pickIdx = idx;
                break;
              }
            }
          }
          cur = nxt;
          nxt = list.splice(pickIdx, 1)[0];
        }
        if (ring.length >= 3) {
          const simp: number[][] = [];
          for (let i = 0; i < ring.length; i++) {
            const p0 = ring[(i - 1 + ring.length) % ring.length];
            const p1 = ring[i];
            const p2 = ring[(i + 1) % ring.length];
            if ((p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]) !== 0) {
              simp.push(p1);
            }
          }
          if (simp.length >= 3) {
            let finalPts = simp;
            if (doChaikin && simp.length >= 12) {
              const sm: number[][] = [];
              for (let i = 0; i < simp.length; i++) {
                const a = simp[i];
                const b = simp[(i + 1) % simp.length];
                const d2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
                if (d2 <= 4) {
                  sm.push([+(0.75 * a[0] + 0.25 * b[0]).toFixed(2), +(0.75 * a[1] + 0.25 * b[1]).toFixed(2)]);
                  sm.push([+(0.25 * a[0] + 0.75 * b[0]).toFixed(2), +(0.25 * a[1] + 0.75 * b[1]).toFixed(2)]);
                } else {
                  sm.push(a);
                }
              }
              finalPts = sm;
            }
            parts.push('M' + finalPts.map((p) => `${p[0]} ${p[1]}`).join('L') + 'Z');
          }
        }
      }
    });
    if (parts.length) {
      const hex = palette[lbl].hex;
      pathTags.push(`<path fill="${hex}" fill-rule="evenodd" d="${parts.join('')}"/>`);
    }
  });

  onProgress?.('done', 1, 'Selesai');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n${pathTags.join('\n')}\n</svg>`;
  return {
    svg,
    palette,
    stats: {
      ms: Math.round(performance.now() - t0),
      regions: pathTags.length,
      hw: {
        gpuUsed: assign.usedGpu,
        gpuBackend: assign.backend,
        gpuRenderer: assign.renderer,
      },
    },
  };
}
