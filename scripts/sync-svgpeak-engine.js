/**
 * @file scripts/sync-svgpeak-engine.js
 * @description Bundles the 12 verbatim SVGPeak engine modules in src/engine/svgpeak/
 * into src/engine/svgpeak/vmtEngineBundle.js for esbuild / browser / Tauri / Node execution.
 */
const fs = require('fs');
const path = require('path');

const engineDir = path.resolve(__dirname, '../src/engine/svgpeak');
const outFile = path.join(engineDir, 'vmtEngineBundle.js');

const files = [
  '00-vmt-compat.js',
  '04-ve-export-engine.js',
  '05-vmt-color-edge.js',
  '06-vmt-profiler-adaptive.js',
  '07-vmt-palette-kdtree.js',
  '08-vmt-segmentation-mrf.js',
  '09-vmt-cleanup-morphology.js',
  '10-vmt-boundary-beach.js',
  '11-vmt-smooth-bezier.js',
  '12-vmt-gradients-svg-dxf.js',
  '13-vmt-hardware-gpu-workers.js',
  '14-vmt-orchestrator.js',
];

const body = files
  .map((f) => {
    const content = fs.readFileSync(path.join(engineDir, f), 'utf8');
    return (
      `/* === BEGIN ${f} === */\n` +
      content.replace(/^\s*['"]use strict['"];\s*/m, '') +
      `\n/* === END ${f} === */\n`
    );
  })
  .join('\n');

const output = `/* AUTO-GENERATED FROM src/engine/svgpeak/*.js — DO NOT EDIT MANUALLY */
let _cachedVmtInstance = null;

function _createSvgPeakVmtScope(window, document, ImageData, localStorage, requestAnimationFrame) {
${body}
  const _origMakeWork = VMT.makeWork;
  VMT.makeWork = function(src, maxDim = 840) {
    if (src && (src.rgba || (src.img && src.img._rgba))) {
      const raw = src.rgba || src.img._rgba;
      const sw = Math.max(1, src.w || (src.img && src.img.w) || 64);
      const sh = Math.max(1, src.h || (src.img && src.img.h) || 64);
      if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
        const cv = document.createElement('canvas');
        cv.width = sw;
        cv.height = sh;
        const ctx = cv.getContext('2d');
        const clamped = raw instanceof Uint8ClampedArray ? raw : new Uint8ClampedArray(raw.buffer || raw, raw.byteOffset || 0, raw.byteLength || raw.length);
        ctx.putImageData(new ImageData(clamped, sw, sh), 0, 0);
        return _origMakeWork({ img: cv, w: sw, h: sh }, maxDim);
      }
      return _origMakeWork({ img: { _rgba: raw, w: sw, h: sh }, w: sw, h: sh }, maxDim);
    }
    return _origMakeWork(src, maxDim);
  };
  return { VMT, VE };
}

export function getSvgPeakVmtEngine() {
  if (_cachedVmtInstance) return _cachedVmtInstance;

  const isBrowserDom = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement === 'function';

  const ImageDataCtor = (typeof ImageData !== 'undefined')
    ? ImageData
    : class ImageDataPolyfill {
        constructor(a, b, c) {
          if (typeof a === 'number') {
            this.width = a;
            this.height = b;
            this.data = new Uint8ClampedArray(a * b * 4);
          } else {
            this.data = a instanceof Uint8ClampedArray ? a : new Uint8ClampedArray(a.buffer || a, a.byteOffset || 0, a.byteLength || a.length);
            this.width = b;
            this.height = c || Math.max(1, Math.floor(this.data.length / (4 * Math.max(1, b))));
          }
        }
      };

  const localStorageShim = (() => {
    try {
      if (isBrowserDom && window.localStorage) {
        window.localStorage.getItem('__svgpeak_probe__');
        return window.localStorage;
      }
    } catch (e) {}
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); }
    };
  })();

  const resampleRgba = (srcRgba, sw, sh, dw, dh) => {
    if (sw === dw && sh === dh) {
      return new Uint8ClampedArray(srcRgba);
    }
    const dst = new Uint8ClampedArray(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
      const sy = Math.min(sh - 1, Math.floor(((dy + 0.5) * sh) / dh));
      for (let dx = 0; dx < dw; dx++) {
        const sx = Math.min(sw - 1, Math.floor(((dx + 0.5) * sw) / dw));
        const si = (sy * sw + sx) * 4;
        const di = (dy * dw + dx) * 4;
        dst[di] = srcRgba[si];
        dst[di + 1] = srcRgba[si + 1];
        dst[di + 2] = srcRgba[si + 2];
        dst[di + 3] = srcRgba[si + 3];
      }
    }
    return dst;
  };

  const headlessDocument = {
    createElement(tag) {
      if (tag !== 'canvas') return {};
      return {
        width: 1,
        height: 1,
        getContext(type) {
          if (type !== '2d') return null;
          const self = this;
          return {
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
            globalAlpha: 1,
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            save() {},
            restore() {},
            scale() {},
            translate() {},
            setTransform() {},
            clearRect() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            bezierCurveTo() {},
            closePath() {},
            fill() {},
            stroke() {},
            clip() {},
            fillRect() {},
            rect() {},
            arc() {},
            createLinearGradient() { return { addColorStop() {} }; },
            createRadialGradient() { return { addColorStop() {} }; },
            drawImage(img, x, y, w, h) {
              const tw = w || self.width || 1;
              const th = h || self.height || 1;
              if (img && img._rgba) {
                const scaled = resampleRgba(img._rgba, img.w || tw, img.h || th, tw, th);
                this._id = new ImageDataCtor(scaled, tw, th);
              } else if (img && img._ctx && img._ctx._id) {
                const srcId = img._ctx._id;
                const scaled = resampleRgba(srcId.data, srcId.width, srcId.height, tw, th);
                this._id = new ImageDataCtor(scaled, tw, th);
              }
            },
            putImageData(id) {
              this._id = id;
            },
            createImageData(w, h) {
              return new ImageDataCtor(w, h);
            },
            getImageData(x, y, w, h) {
              return this._id || new ImageDataCtor(w, h);
            }
          };
        }
      };
    }
  };

  const winObj = isBrowserDom ? window : globalThis;
  const docObj = isBrowserDom ? window.document : headlessDocument;
  const rafFn = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame.bind(globalThis)
    : (cb) => setTimeout(cb, 0);

  _cachedVmtInstance = _createSvgPeakVmtScope(winObj, docObj, ImageDataCtor, localStorageShim, rafFn);
  return _cachedVmtInstance;
}
`;

fs.writeFileSync(outFile, output, 'utf8');
console.log('[SVGPeak Engine Sync] Generated', outFile, '(' + fs.statSync(outFile).size + ' bytes)');
