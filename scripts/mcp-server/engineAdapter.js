/**
 * @file scripts/mcp-server/engineAdapter.js
 * @description Headless Geometry Engine Adapter for Geovanta Vector Studio
 * Executes pure vector geometry transformations and document operations in Node.js
 */

const path = require('path');
const fs = require('fs');
const Module = require('module');

// Minimal XML/DOM Parser Polyfill for Node.js (enables svgDocumentParser in headless environments)
class SimpleDOMElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toLowerCase();
    this.attrs = attrs;
    this.children = [];
    this.textContent = '';
  }

  getAttribute(name) {
    return this.attrs[name] !== undefined ? this.attrs[name] : null;
  }

  getAttributeNS(ns, name) {
    return this.getAttribute(name);
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length ? all[0] : null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map(s => s.trim().toLowerCase());
    const matched = [];

    const matches = el => {
      for (const s of selectors) {
        if (!s) continue;
        if (s.startsWith('#')) {
          if (el.attrs.id && el.attrs.id.toLowerCase() === s.slice(1)) return true;
        } else if (s.startsWith('.')) {
          const classes = (el.attrs.class || '').toLowerCase().split(/\s+/);
          if (classes.includes(s.slice(1))) return true;
        } else {
          if (el.tagName === s) return true;
        }
      }
      return false;
    };

    const traverse = node => {
      for (const child of node.children) {
        if (matches(child)) {
          matched.push(child);
        }
        traverse(child);
      }
    };

    traverse(this);
    return matched;
  }
}

function parseXmlToDom(xml) {
  const root = new SimpleDOMElement('__root__');
  const stack = [root];

  const tokenRegex =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<([a-zA-Z0-9:_-]+)((?:\s+[a-zA-Z0-9:_-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|<\/([a-zA-Z0-9:_-]+)>|([^<]+)/g;
  let match;

  while ((match = tokenRegex.exec(xml)) !== null) {
    const [full, openTag, attrStr, selfClose, closeTag, text] = match;

    if (full.startsWith('<!--') || full.startsWith('<?')) {
      continue;
    }

    if (text) {
      if (stack.length > 1) {
        stack[stack.length - 1].textContent += text;
      }
    } else if (openTag) {
      const attrs = {};
      if (attrStr) {
        const attrRegex = /([a-zA-Z0-9:_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let am;
        while ((am = attrRegex.exec(attrStr)) !== null) {
          if (!am[1]) continue;
          attrs[am[1]] = am[2] !== undefined ? am[2] : am[3] !== undefined ? am[3] : am[4] !== undefined ? am[4] : '';
        }
      }

      const el = new SimpleDOMElement(openTag, attrs);
      stack[stack.length - 1].children.push(el);

      if (!selfClose && !full.endsWith('/>')) {
        stack.push(el);
      }
    } else if (closeTag) {
      if (stack.length > 1 && stack[stack.length - 1].tagName === closeTag.toLowerCase()) {
        stack.pop();
      }
    }
  }

  return {
    querySelector: sel => root.querySelector(sel),
    querySelectorAll: sel => root.querySelectorAll(sel)
  };
}

if (typeof globalThis.DOMParser === 'undefined') {
  globalThis.DOMParser = class {
    parseFromString(str) {
      return parseXmlToDom(str);
    }
  };
}

// Module loader cache for Geovanta engine components
const moduleCache = new Map();
const projectRoot = path.resolve(__dirname, '..', '..');

// Pre-load core engine modules (prefer pre-bundled engineBundle.cjs for serverless/Netlify, fallback to esbuild)
let prebundled = null;
try {
  prebundled = require('./engineBundle.cjs');
} catch (_) {}

function loadEngineModule(relativePath, exportKey) {
  if (prebundled && exportKey && prebundled[exportKey]) {
    return prebundled[exportKey];
  }
  if (moduleCache.has(relativePath)) {
    return moduleCache.get(relativePath);
  }
  const dynamicRequire = eval('require');
  const esbuild = dynamicRequire('esbuild');
  const filename = path.resolve(projectRoot, relativePath);
  const code = esbuild.buildSync({
    entryPoints: [filename],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.js': 'js' }
  }).outputFiles[0].text;

  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(code, filename);
  moduleCache.set(relativePath, mod.exports);
  return mod.exports;
}

// Pre-load core engine modules
const svgPathParser = loadEngineModule('src/engine/svgPathParser.tsx', 'svgPathParser');
const svgDocParser = loadEngineModule('src/engine/svgDocumentParser.tsx', 'svgDocParser');
const svgDocSerializer = loadEngineModule('src/engine/svgDocumentSerializer.tsx', 'svgDocSerializer');
const topologicalSimplifier = loadEngineModule('src/engine/topologicalCurveSimplifier.tsx', 'topologicalSimplifier');
const pathBooleanModule = loadEngineModule('src/engine/pathBoolean.tsx', 'pathBooleanModule');
const cornerFilletModule = loadEngineModule('src/engine/cornerFilletEngine.tsx', 'cornerFilletModule');
const blobGenerator = loadEngineModule('src/engine/blobGenerator.tsx', 'blobGenerator');
const weaveGenerator = loadEngineModule('src/engine/weaveGenerator.tsx', 'weaveGenerator');

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function num(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 1. createShape(options)
 * Generates a valid Geovanta object structure:
 * { id, name, type: 'path', fill, stroke, strokeWidth, subs: [{ id, closed: true, nodes: [...] }] }
 * Supports: 'rectangle', 'circle', 'star', 'polygon', 'spiral', 'blob', 'weave'
 */
function createShape(options = {}) {
  const type = String(options.type || 'rectangle').toLowerCase();
  const id = options.id || uid();
  const name = options.name || `${type}-${uid().slice(0, 4)}`;

  const fill = options.fill !== undefined ? options.fill : type === 'spiral' ? 'none' : '#000000';
  const stroke = options.stroke !== undefined ? options.stroke : type === 'spiral' ? '#000000' : 'none';
  const strokeWidth = options.strokeWidth !== undefined ? options.strokeWidth : type === 'spiral' ? 2 : 0;
  const opacity = options.opacity !== undefined ? options.opacity : 1;

  let subs = [];
  let gen = null;

  if (type === 'rectangle' || type === 'rect') {
    const x = num(options.x, 0);
    const y = num(options.y, 0);
    const w = num(options.width || options.w, 100);
    const h = num(options.height || options.h, 100);

    const nodes = [
      { id: uid(), x, y, type: 'corner', handleIn: null, handleOut: null },
      { id: uid(), x: x + w, y, type: 'corner', handleIn: null, handleOut: null },
      { id: uid(), x: x + w, y: y + h, type: 'corner', handleIn: null, handleOut: null },
      { id: uid(), x, y: y + h, type: 'corner', handleIn: null, handleOut: null }
    ];
    subs = [{ id: uid(), closed: true, nodes }];
  } else if (type === 'circle' || type === 'ellipse') {
    const cx = num(options.cx, options.x !== undefined && options.width ? options.x + options.width / 2 : 50);
    const cy = num(options.cy, options.y !== undefined && options.height ? options.y + options.height / 2 : 50);
    const r = num(options.radius || options.r, options.width ? options.width / 2 : 40);
    const rx = num(options.rx, r);
    const ry = num(options.ry, r);
    const K = 0.5522847498;
    const kx = rx * K;
    const ky = ry * K;

    const nodes = [
      {
        id: uid(),
        x: cx + rx,
        y: cy,
        type: 'symmetric',
        handleIn: { x: cx + rx, y: cy - ky },
        handleOut: { x: cx + rx, y: cy + ky }
      },
      {
        id: uid(),
        x: cx,
        y: cy + ry,
        type: 'symmetric',
        handleIn: { x: cx + kx, y: cy + ry },
        handleOut: { x: cx - kx, y: cy + ry }
      },
      {
        id: uid(),
        x: cx - rx,
        y: cy,
        type: 'symmetric',
        handleIn: { x: cx - rx, y: cy + ky },
        handleOut: { x: cx - rx, y: cy - ky }
      },
      {
        id: uid(),
        x: cx,
        y: cy - ry,
        type: 'symmetric',
        handleIn: { x: cx - kx, y: cy - ry },
        handleOut: { x: cx + kx, y: cy - ry }
      }
    ];
    subs = [{ id: uid(), closed: true, nodes }];
  } else if (type === 'star') {
    const points = Math.max(3, Math.round(num(options.points, 5)));
    const cx = num(options.cx, options.x !== undefined && options.width ? options.x + options.width / 2 : 50);
    const cy = num(options.cy, options.y !== undefined && options.height ? options.y + options.height / 2 : 50);
    const ro = num(options.outerRadius || options.radius || options.r, options.width ? options.width / 2 : 50);
    const ri = num(options.innerRadius, ro * 0.5);
    const total = points * 2;
    const nodes = [];

    for (let i = 0; i < total; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / points;
      const rad = i % 2 === 0 ? ro : ri;
      nodes.push({
        id: uid(),
        x: Math.round((cx + rad * Math.cos(ang)) * 1e4) / 1e4,
        y: Math.round((cy + rad * Math.sin(ang)) * 1e4) / 1e4,
        type: 'corner',
        handleIn: null,
        handleOut: null
      });
    }
    subs = [{ id: uid(), closed: true, nodes }];
  } else if (type === 'polygon') {
    const sides = Math.max(3, Math.round(num(options.sides || options.points, 6)));
    const cx = num(options.cx, options.x !== undefined && options.width ? options.x + options.width / 2 : 50);
    const cy = num(options.cy, options.y !== undefined && options.height ? options.y + options.height / 2 : 50);
    const r = num(options.radius || options.r, options.width ? options.width / 2 : 50);
    const nodes = [];

    for (let i = 0; i < sides; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
      nodes.push({
        id: uid(),
        x: Math.round((cx + r * Math.cos(ang)) * 1e4) / 1e4,
        y: Math.round((cy + r * Math.sin(ang)) * 1e4) / 1e4,
        type: 'corner',
        handleIn: null,
        handleOut: null
      });
    }
    subs = [{ id: uid(), closed: true, nodes }];
  } else if (type === 'spiral') {
    const turns = Math.max(0.5, num(options.turns, 3));
    const cx = num(options.cx, 50);
    const cy = num(options.cy, 50);
    const rMax = num(options.radius || options.r, 50);
    const rMin = num(options.startRadius, 0);
    const steps = Math.max(16, Math.round(turns * 16));
    const nodes = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = t * turns * 2 * Math.PI;
      const rad = rMin + (rMax - rMin) * t;
      nodes.push({
        id: uid(),
        x: Math.round((cx + rad * Math.cos(ang)) * 1e4) / 1e4,
        y: Math.round((cy + rad * Math.sin(ang)) * 1e4) / 1e4,
        type: 'corner',
        handleIn: null,
        handleOut: null
      });
    }
    subs = [{ id: uid(), closed: !!options.closed, nodes }];
  } else if (type === 'blob') {
    const cx = num(options.cx, 50);
    const cy = num(options.cy, 50);
    const rx = num(options.rx, options.width ? options.width / 2 : 50);
    const ry = num(options.ry, options.height ? options.height / 2 : 50);
    const rawNodes = blobGenerator.blobNodes(cx, cy, rx, ry, options);
    const nodes = rawNodes.map(n => ({
      ...n,
      id: uid()
    }));
    subs = [{ id: uid(), closed: true, nodes }];
    gen = {
      kind: 'blob',
      cx,
      cy,
      rx,
      ry,
      points: nodes.length,
      irregularity: options.irregularity || 0.35,
      smoothness: options.smoothness || 0.7,
      seed: options.seed || 0
    };
  } else if (type === 'weave') {
    const x = num(options.x, 0);
    const y = num(options.y, 0);
    const w = num(options.width || options.w, 100);
    const h = num(options.height || options.h, 100);
    const p = weaveGenerator.normalizeWeaveParams({
      cols: options.cols,
      rows: options.rows,
      amplitude: options.amplitude,
      thickness: options.thickness,
      waveType: options.waveType
    });
    const strips = weaveGenerator.weaveStrips(x, y, w, h, p);
    subs = strips.flatMap(s => svgPathParser.parsePath(s.d));
    gen = {
      kind: 'weave',
      cols: p.cols,
      rows: p.rows,
      amplitude: p.amplitude,
      thickness: p.thickness,
      waveType: p.waveType,
      x,
      y,
      w,
      h
    };
  } else {
    // Default fallback to 100x100 rectangle
    const x = num(options.x, 0);
    const y = num(options.y, 0);
    const w = num(options.width || options.w, 100);
    const h = num(options.height || options.h, 100);
    const nodes = [
      { id: uid(), x, y, type: 'corner', handleIn: null, handleOut: null },
      { id: uid(), x: x + w, y, type: 'corner', handleIn: null, handleOut: null },
      { id: uid(), x: x + w, y: y + h, type: 'corner', handleIn: null, handleOut: null },
      { id: uid(), x, y: y + h, type: 'corner', handleIn: null, handleOut: null }
    ];
    subs = [{ id: uid(), closed: true, nodes }];
  }

  return {
    id,
    name,
    type: 'path',
    fill,
    stroke,
    strokeWidth,
    opacity,
    subs,
    ...(gen ? { gen } : {})
  };
}

/**
 * 2. parseSVG(svgString)
 * Parses SVG XML string into Geovanta document structure:
 * { id, artboard: { w, h, bg }, objects: [...] }
 */
function parseSVG(svgString) {
  const parsed = svgDocParser.parseSVG(svgString);
  const w = (parsed.viewBox && parsed.viewBox[2]) || 800;
  const h = (parsed.viewBox && parsed.viewBox[3]) || 600;
  const bg = parsed.artboardBg || '#ffffff';

  return {
    id: parsed.id || uid(),
    artboard: { w, h, bg },
    viewBox: parsed.viewBox || [0, 0, w, h],
    objects: parsed.objects || [],
    selection: []
  };
}

/**
 * 3. serializeDoc(doc)
 * Converts Geovanta document into clean, valid SVG string.
 */
function serializeDoc(doc) {
  if (!doc) return '';
  const w = (doc.artboard && doc.artboard.w) || (doc.viewBox && doc.viewBox[2]) || 800;
  const h = (doc.artboard && doc.artboard.h) || (doc.viewBox && doc.viewBox[3]) || 600;
  const viewBox = doc.viewBox || [0, 0, w, h];
  const normalizedDoc = {
    ...doc,
    viewBox,
    objects: doc.objects || []
  };
  const bg = doc.artboard && doc.artboard.bg ? { mode: 'solid', color: doc.artboard.bg } : null;
  return svgDocSerializer.serializeDoc(normalizedDoc, { bg });
}

/**
 * 4. simplifyCurves(doc, options)
 * Applies curve simplification to reduce redundant nodes while preserving curve accuracy.
 */
function simplifyCurves(doc, options = {}) {
  const level = options.level != null ? options.level : 100;
  const res = topologicalSimplifier.simplifyDoc(doc, {
    level,
    wholePaths: true,
    tolerance: options.tolerance
  });

  return {
    doc: res.doc,
    count: Math.max(0, res.before - res.after),
    before: res.before,
    after: res.after,
    changed: res.changed
  };
}

/**
 * 5. booleanOperation(doc, op)
 * Performs boolean operations ('union', 'subtract', 'intersect', 'exclude') on objects.
 */
function booleanOperation(doc, op) {
  const selIds = new Set((doc.objects || []).map(o => o.id));
  const res = pathBooleanModule.booleanDoc(doc, op, selIds);
  return res && res.doc ? res.doc : doc;
}

/**
 * 6. applyCornerFillet(doc, radius)
 * Applies corner fillet radius to eligible corner nodes.
 */
function applyCornerFillet(doc, radius, opt = { mode: 'circular' }) {
  if (!doc || !doc.objects) return doc;
  const objects = doc.objects.map(o => {
    if (o.type !== 'path' || !o.subs || !o.subs.length) return o;
    return cornerFilletModule.setCornerRadius(o, radius, opt);
  });
  return {
    ...doc,
    objects
  };
}

module.exports = {
  createShape,
  parseSVG,
  serializeDoc,
  simplifyCurves,
  booleanOperation,
  applyCornerFillet
};
