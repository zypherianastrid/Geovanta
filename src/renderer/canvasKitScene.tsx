import { VE } from '../engine/vectorEngine.tsx';
import { parsePaintRgba01 } from '../utils/colorParserAndFormatter.tsx';
import { vinfo } from './pathInfo.tsx';
import { frameBounds, isFrameMember } from '../engine/figmaAutoLayoutAndFrames.tsx';
import { isLegacyText, legacyTextSpec } from '../engine/legacyText.tsx';
import { affineInverse, affinePt, textRotationMatrix } from '../engine/affineAndOrientedBox.tsx';
import { TextFontRegistry } from './textFontRegistry.tsx';
import { makeTextLayout, caretOffsetForPoint, caretSegmentForLayout } from './textLayout.tsx';
import { toSkiaDashIntervals, effectiveStrokeAlign, strokeOutwardExtent, hasVisibleStroke } from '../engine/strokeStyles.tsx';
import { toCanvasKitBlendMode } from '../engine/blendModes.tsx';
import { strokeGradOn, gradOn } from '../engine/gradientEngine.tsx';

const isFrameBackground = o => o.isFrameBg || o.isAutoFrame;
const isAxisAlignedRectFrame = f => {
  if (!f || f.rot || (f.r && f.r > 0) || (f.rx && f.rx > 0)) return false;
  const sp = f.subs && f.subs.length === 1 ? f.subs[0] : null;
  if (!sp || !sp.closed || !sp.nodes || sp.nodes.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const nd = sp.nodes[i];
    if ((nd.ix != null && Math.abs(nd.ix - nd.x) > 1e-4) || (nd.iy != null && Math.abs(nd.iy - nd.y) > 1e-4) ||
        (nd.ox != null && Math.abs(nd.ox - nd.x) > 1e-4) || (nd.oy != null && Math.abs(nd.oy - nd.y) > 1e-4)) return false;
  }
  const [n0, n1, n2, n3] = sp.nodes;
  const h1 = Math.abs(n0.y - n1.y) < 1e-4 && Math.abs(n2.y - n3.y) < 1e-4 && Math.abs(n1.x - n2.x) < 1e-4 && Math.abs(n3.x - n0.x) < 1e-4;
  const v1 = Math.abs(n0.x - n1.x) < 1e-4 && Math.abs(n2.x - n3.x) < 1e-4 && Math.abs(n1.y - n2.y) < 1e-4 && Math.abs(n3.y - n0.y) < 1e-4;
  return h1 || v1;
};
const hasPaint = color => color && color !== 'none' && color !== 'transparent';
/* Slice 50 menit (Pendekatan A, 2026-11-15): fill gabungan frame ikon.
   Anggota frame ikon (isIconFrame) dirender sebagai path gabungan per
   kelompok (sourceId, fill, opacity, fillRule, grad) — bukan per objek —
   supaya lubang tetap transparan seperti render 1-objek-per-<path>.
   sourceId = identitas objek <path> asal (diisi insert, Task 2); tanpa
   sourceId tiap anggota jadi kelompok sendiri (aman: tidak pernah
   menggabung dua <path> berbeda). Urutan kelompok = urutan dokumen
   anggota pertamanya. */
export const isIconFrameVectorMember = o =>
  Boolean(o && !o.hidden && o.isIconFrame && o.group && !o.isFrameBg && !o.isAutoFrame && !o.img && !o.text);

export const getPartialIconFrameGroups = (objs, dragIds) => {
  const partial = new Set();
  if (!dragIds || !dragIds.size || !objs) return partial;
  // Kelompokkan per (group + iconSrc) yang memiliki fill aktif:
  // Hanya jika subpath dari <path> ASAL YANG SAMA (iconSrc sama) sedang di-drag sebagian,
  // barulah kita perlu menyatukan subpath diam + bergerak untuk menjaga lubang compound path.
  // Objek stroke-only, objek dengan fill berbeda, atau pulau independen tidak perlu
  // membatalkan static drag cache seluruh frame ikon.
  const srcFlags = new Map();
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (!isIconFrameVectorMember(o)) continue;
    const hasF = Boolean(VE.gradOn(o) || (o.fill && o.fill !== 'none' && o.fill !== 'transparent'));
    if (!hasF || !o.iconSrc) continue;
    const key = o.group + '::' + o.iconSrc;
    const bit = dragIds.has(o.id) ? 2 : 1;
    const next = (srcFlags.get(key) || 0) | bit;
    srcFlags.set(key, next);
    if (next === 3) partial.add(o.group);
  }
  return partial;
};

export const iconFrameFillGroups = (members, dragIds = null) => {
  const groups = [];
  const byKey = new Map();
  const gradIds = new WeakMap();
  let gradN = 0;
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    if (!m || m.hidden || !m.subs || !m.subs.length) continue;
    const grad = VE.gradOn(m) ? m.grad : null;
    let gk = 'nograd';
    if (grad) {
      gk = gradIds.get(grad);
      if (!gk) { gk = 'g' + (++gradN); gradIds.set(grad, gk); }
    }
    const src = m.iconSrc || m.id;
    const bm = m.blendMode || 'normal';
    const key = [src, m.fill ?? '', m.opacity ?? 1, m.fillRule || 'nonzero', gk, bm].join('\u0000');
    let g = byKey.get(key);
    if (!g) {
      g = { key, sourceId: src, fill: m.fill, opacity: m.opacity ?? 1, fillRule: m.fillRule || 'nonzero', grad, blendMode: bm, subs: [], staticSubs: [], movingSubs: [], firstIndex: i };
      byKey.set(key, g);
      groups.push(g);
    }
    const isMoved = Boolean(dragIds && dragIds.has(m.id));
    for (const sp of m.subs) {
      g.subs.push(sp);
      if (isMoved) g.movingSubs.push(sp);
      else g.staticSubs.push(sp);
    }
  }
  return groups;
};

const buildIconFrameDragState = (objs, dragIds) => {
  const partialGroups = getPartialIconFrameGroups(objs, dragIds);
  const staticMap = new Map();
  const movingMap = new Map();
  for (const o of objs) {
    if (!isIconFrameVectorMember(o)) continue;
    const inMoving = Boolean((dragIds && dragIds.has(o.id)) || (partialGroups.size > 0 && partialGroups.has(o.group)));
    const target = inMoving ? movingMap : staticMap;
    let st = target.get(o.group);
    if (!st) { st = { members: [], groups: null, drawn: false }; target.set(o.group, st); }
    st.members.push(o);
  }
  for (const st of staticMap.values()) st.groups = iconFrameFillGroups(st.members, null);
  for (const st of movingMap.values()) st.groups = iconFrameFillGroups(st.members, dragIds);
  return { staticMap, movingMap, partialGroups };
};
const alpha = v => Math.max(0, Math.min(1, v ?? 1));
const matrix = ([a, b, c, d, e, f], x = 0, y = 0) => [a, c, e - x, b, d, f - y, 0, 0, 1];

export function documentFrames(doc) {
  const frameRects = new Map(), frameBackgrounds = new Map();
  for (const o of doc.objects) {
    if (!o || o.hidden || !isFrameMember(o)) continue;
    if (!frameRects.has(o.group)) frameRects.set(o.group, frameBounds(doc, o.group));
    if (isFrameBackground(o)) frameBackgrounds.set(o.group, o);
  }
  for (const [id, bb] of frameRects) if (!bb) frameRects.delete(id);
  return {frameRects, frameBackgrounds};
}

function makeCache(maxEntries, maxCost = Infinity) {
  const entries = new Map();
  let cost = 0;
  const remove = key => {
    const entry = entries.get(key);
    if (!entry) return;
    entries.delete(key);
    cost -= entry.cost;
    entry.dispose();
  };
  return {
    get(key, create) {
      let entry = entries.get(key);
      if (entry) entries.delete(key);
      else {
        entry = create();
        cost += entry.cost;
      }
      entries.set(key, entry);
      while (entries.size > maxEntries || (cost > maxCost && entries.size > 1)) {
        remove(entries.keys().next().value);
      }
      return entry;
    },
    // Baca tanpa membuat entri (dipakai getMeasuredTextBounds dari luar).
    peek(key) {
      return entries.get(key);
    },
    // Buang satu entri (dipakai cache layer blur saat parameternya
    // berubah — entri lama harus dibangun ulang, bukan dipakai lagi).
    remove(key) {
      remove(key);
    },
    clear() {
      for (const key of entries.keys()) remove(key);
    }
  };
}

export class CanvasKitScene {
  [key: string]: any;
  declare textLayouts: ReturnType<typeof makeCache>;

  constructor(kit, onAssetChange = () => {}) {
    this.kit = kit;
    this.onAssetChange = onAssetChange;
    this.paths = makeCache(24576, 1500000);
    this.iconFillPaths = makeCache(2048, 600000);
    this.subpathIds = new WeakMap();
    this.nextSubpathId = 1;
    this._iconStateObjs = null;
    this._iconStateDrag = null;
    this._iconStateMap = null;
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).__geovantaIconPathBuilds !== 'number') {
      (globalThis as any).__geovantaIconPathBuilds = 0;
    }
    this.shaders = makeCache(128, 4096);
    this.dashEffects = makeCache(128);
    this.textLayouts = makeCache(256);
    this.fontRegistry = kit.TypefaceFontProvider && globalThis.GEOVANTA_BUNDLED_TEXT_FONT
      ? new TextFontRegistry(kit) : null;
    this.failedFontAssets = new Set();
    this.shaderIds = new WeakMap();
    this.nextShaderId = 1;
    this.images = new Map();
    this.colorCache = new Map();
    this.paint = new kit.Paint();
    if (typeof this.paint.setDither === 'function') this.paint.setDither(true);
    this.paint.setAntiAlias(false);
    this._paintAA = false;
    this._frameHasGradient = false;
    this.layerPaint = new kit.Paint();
    if (typeof this.layerPaint.setDither === 'function') this.layerPaint.setDither(true);
    /* Drop shadow (Task 8): paint khusus siluet bayangan. Resep utama
       MakeDropShadowOnly — TERBUKTI ADA di .d.ts DAN di runtime bin/
       (spike efek; grep bin/canvaskit.js). Bila API ini tidak ada di
       runtime (build lain), bayangan dilewati diam-diam — tanpa crash.
       Style TIDAK di-set di sini: kit.PaintStyle hanya dipakai di
       jalur gambar (mock kit di tes tidak menyediakannya); style default
       Paint adalah Fill, sesuai kebutuhan siluet. */
    this.shadowPaint = new kit.Paint();
    this.shadowPaint.setAntiAlias(false);
    this.hasDropShadowOnly = !!(kit.ImageFilter && kit.ImageFilter.MakeDropShadowOnly);
    /* Layer blur (Task 9): paint untuk menggambar citra offscreen yang
       sudah di-blur ke kanvas utama. MakeBlur TERBUKTI ADA di .d.ts DAN
       runtime bin/ (spike efek). Bila API ini tidak ada di runtime
       (build lain), blur dilewati diam-diam — tanpa crash. */
    this.blurPaint = new kit.Paint();
    this.blurPaint.setAntiAlias(false);
    this.hasBlur = !!(kit.ImageFilter && kit.ImageFilter.MakeBlur);
    /* Cache citra layer-blur per objek (Task 9 Step 7): tanpa cache,
       100 objek ber-efek = 10,17x waktu gambar 100 objek polos (median
       20,85 ms vs 2,05 ms, SwiftShader) — render offscreen + blur
       Gaussian diulang tiap frame. Citra yang disimpan adalah citra
       FINAL yang sudah di-blur (resolusi dokumen); per frame tinggal
       satu drawImage polos. Kunci Map = referensi objek (model dokumen
       immutable-update: edit apa pun mengganti referensi objek, jadi
       referensi yang sama = isi yang sama) + string `sig` di dalam
       entri untuk parameter di luar objek (opacity efektif, zoom,
       smoothEdges, radius, bbox). Batas 48 entri / 8M piksel (biaya
       dihitung 2x piksel: citra + surface yang dipertahankan hidup).
       Hanya objek vektor polos yang di-cache: bitmap `img` dimuat
       asinkron dan font teks juga — keduanya bisa berubah TANPA
       referensi objek berubah, sehingga citra cache bisa basi.
       Batas 256 entri (bukan 48): dokumen Step 7 punya 100 objek
       ber-efek — batas 48 membuat cache thrashing (tiap frame rebuild
       ~setengah objek, layer-only 100 objek = 351 ms). Anggaran piksel
       8M tetap membatasi memori total. */
    this.layerBlurImages = makeCache(256, 8 * 1024 * 1024);
    /* Cache citra drop shadow per objek (Task 9 Step 7, pola yang sama):
       100 objek ber-shadow saja = +12,35 ms/frame tanpa cache. Semua
       bayangan satu objek dirender sekali ke satu citra offscreen
       (MakeDropShadowOnly per bayangan), per frame tinggal satu
       drawImage polos. Kunci Map = referensi objek + `sig` (opacity
       efektif, smoothEdges, region). Hanya jalur path vektor yang
       di-cache (teks/img memakai saveLayer — font/bitmap asinkron,
       sama seperti layer blur). Bayangan adalah siluet FILL path,
       jadi zoom TIDAK masuk sig (strokeWidth tidak memengaruhi
       siluet, termasuk untuk nonScalingStroke). */
    this.dropShadowImages = makeCache(256, 8 * 1024 * 1024);
  }

  color(value, opacity = 1) {
    const key = `${value}\u0000${opacity}`;
    let cached = this.colorCache.get(key);
    if (cached !== undefined) return cached;
    cached = this.kit.Color4f(...parsePaintRgba01(value, opacity));
    if (this.colorCache.size >= 1024) this.colorCache.clear();
    this.colorCache.set(key, cached);
    return cached;
  }

  dispose() {
    this.paths.clear();
    this.iconFillPaths.clear();
    this._iconStateObjs = null;
    this._iconStateDrag = null;
    this._iconStateMap = null;
    this.shaders.clear();
    this.dashEffects?.clear();
    this.textLayouts.clear();
    this.layerBlurImages.clear();
    this.dropShadowImages.clear();
    this.colorCache.clear();
    this.fontRegistry?.dispose();
    for (const entry of this.images.values()) entry.dispose();
    this.images.clear();
    this.paint.delete();
    this.layerPaint.delete();
    this.shadowPaint.delete();
    this.blurPaint.delete();
  }

  /* Efek drop shadow yang aktif pada objek (disabled dilewati). */
  dropShadows(o) {
    if (!o || !Array.isArray(o.effects)) return [];
    return o.effects.filter(e => e && e.type === 'dropShadow' && !e.disabled);
  }

  /* Efek aktif bertipe tertentu (disabled dilewati). */
  activeEffects(o, type) {
    if (!o || !Array.isArray(o.effects)) return [];
    return o.effects.filter(e => e && e.type === type && !e.disabled);
  }

  /* Radius layer blur efektif (Task 9): maksimum bila ada beberapa
     layerBlur pada satu objek — kebijakan v1, SAMA dengan ekspor SVG
     (effectsFilterDefs menggabung dua blur jadi satu feGaussianBlur
     radius max). Radius non-finite (dokumen edit tangan) dihitung 0. */
  layerBlurRadius(o) {
    const list = this.activeEffects(o, 'layerBlur');
    if (!list.length) return 0;
    return Math.max(...list.map(e => (typeof e.radius === 'number' && Number.isFinite(e.radius) ? Math.max(0, e.radius) : 0)));
  }

  /* Radius background blur efektif (Task 9): maksimum bila ada beberapa
     backgroundBlur pada satu objek (alasan yang sama dengan layerBlur). */
  backgroundBlurRadius(o) {
    const list = this.activeEffects(o, 'backgroundBlur');
    if (!list.length) return 0;
    return Math.max(...list.map(e => (typeof e.radius === 'number' && Number.isFinite(e.radius) ? Math.max(0, e.radius) : 0)));
  }

  /* Pasang filter bayangan pada shadowPaint; false bila API tak tersedia. */
  setShadowFilter(shadow, opacity) {
    if (!this.hasDropShadowOnly) return false;
    const {kit} = this;
    this.shadowPaint.setAlphaf(1);
    this.shadowPaint.setImageFilter(kit.ImageFilter.MakeDropShadowOnly(
      shadow.dx, shadow.dy, shadow.blur, shadow.blur,
      this.color(shadow.color, shadow.opacity * opacity), null));
    return true;
  }

  buildPathFromSubs(subs, ox = 0, oy = 0) {
    if (!Array.isArray(subs) || !subs.length) return null;
    const {kit} = this;
    const MOVE = kit.MOVE_VERB;
    const LINE = kit.LINE_VERB;
    const CUBIC = kit.CUBIC_VERB;
    const CLOSE = kit.CLOSE_VERB;
    if (typeof kit.Path?.MakeFromCmds !== 'function' || MOVE == null || LINE == null || CUBIC == null || CLOSE == null) {
      return null;
    }
    let totalFloats = 0;
    for (let si = 0; si < subs.length; si++) {
      const sp = subs[si];
      const ns = sp?.nodes;
      if (!ns || !ns.length) continue;
      totalFloats += 3;
      for (let i = 1; i < ns.length; i++) {
        const a = ns[i - 1], b = ns[i];
        totalFloats += (a.handleOut || b.handleIn) ? 7 : 3;
      }
      if (sp.closed) {
        const a = ns[ns.length - 1], b = ns[0];
        if (a.handleOut || b.handleIn) totalFloats += 7;
        totalFloats += 1;
      }
    }
    if (totalFloats === 0) return null;
    const cmds = new Float32Array(totalFloats);
    let idx = 0;
    for (let si = 0; si < subs.length; si++) {
      const sp = subs[si];
      const ns = sp?.nodes;
      if (!ns || !ns.length) continue;
      cmds[idx++] = MOVE;
      cmds[idx++] = ns[0].x - ox;
      cmds[idx++] = ns[0].y - oy;
      for (let i = 1; i < ns.length; i++) {
        const a = ns[i - 1], b = ns[i];
        if (a.handleOut || b.handleIn) {
          const h1 = a.handleOut || a, h2 = b.handleIn || b;
          cmds[idx++] = CUBIC;
          cmds[idx++] = h1.x - ox;
          cmds[idx++] = h1.y - oy;
          cmds[idx++] = h2.x - ox;
          cmds[idx++] = h2.y - oy;
          cmds[idx++] = b.x - ox;
          cmds[idx++] = b.y - oy;
        } else {
          cmds[idx++] = LINE;
          cmds[idx++] = b.x - ox;
          cmds[idx++] = b.y - oy;
        }
      }
      if (sp.closed) {
        const a = ns[ns.length - 1], b = ns[0];
        if (a.handleOut || b.handleIn) {
          const h1 = a.handleOut || a, h2 = b.handleIn || b;
          cmds[idx++] = CUBIC;
          cmds[idx++] = h1.x - ox;
          cmds[idx++] = h1.y - oy;
          cmds[idx++] = h2.x - ox;
          cmds[idx++] = h2.y - oy;
          cmds[idx++] = b.x - ox;
          cmds[idx++] = b.y - oy;
        }
        cmds[idx++] = CLOSE;
      }
    }
    return kit.Path.MakeFromCmds(cmds);
  }

  path(o) {
    const geomKey = (o.subs && !o.img && !o.clipPathD) ? o.subs : o;
    const entry = this.paths.get(geomKey, () => {
      const {bb, n} = vinfo(o);
      const x = 0, y = 0;
      const {kit} = this;
      const path = o.img ? null : (this.buildPathFromSubs(o.subs, x, y) || kit.Path.MakeFromSVGString(VE.serializePath(o, x, y)));
      const clip = o.clipPathD ? kit.Path.MakeFromSVGString(VE.serializePath({
        subs: VE.parsePath(o.clipPathD, [1, 0, 0, 1, -x, -y])
      })) : null;
      const fillType = o.fillRule === 'evenodd' ? kit.FillType.EvenOdd : kit.FillType.Winding;
      path?.setFillType(fillType);
      clip?.setFillType(o.clipRule === 'evenodd' ? kit.FillType.EvenOdd : kit.FillType.Winding);
      return {x, y, path, clip, fillType, cost: Math.max(1, n), dispose() { path?.delete(); clip?.delete(); }};
    });
    if (entry.path) {
      const wantFillType = o.fillRule === 'evenodd' ? this.kit.FillType.EvenOdd : this.kit.FillType.Winding;
      if (entry.fillType !== wantFillType) {
        entry.fillType = wantFillType;
        entry.path.setFillType(wantFillType);
      }
    }
    return entry;
  }

  iconGroupPath(g, sampleMember) {
    let key = (g.fillRule || 'nonzero') + '\u0000';
    for (let i = 0; i < g.subs.length; i++) {
      const sp = g.subs[i];
      let id = this.subpathIds.get(sp);
      if (!id) {
        id = this.nextSubpathId++;
        this.subpathIds.set(sp, id);
      }
      key += (i ? ',' : '') + id;
    }
    return this.iconFillPaths.get(key, () => {
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).__geovantaIconPathBuilds = ((globalThis as any).__geovantaIconPathBuilds || 0) + 1;
      }
      const syn = { ...sampleMember, subs: g.subs, fill: g.fill, grad: g.grad || null, fillRule: g.fillRule, opacity: g.opacity };
      const { bb, n } = vinfo(syn);
      const { kit } = this;
      const path = this.buildPathFromSubs(g.subs, bb[0], bb[1]) || kit.Path.MakeFromSVGString(VE.serializePath(syn, bb[0], bb[1]));
      if (path) {
        path.setFillType(g.fillRule === 'evenodd' ? kit.FillType.EvenOdd : kit.FillType.Winding);
      }
      return { x: bb[0], y: bb[1], path, cost: Math.max(1, n), dispose() { path?.delete(); } };
    });
  }

  drawIconFrameGroups(canvas, iconSt, canvasOriginX, canvasOriginY, zoom, smoothEdges, drag, moving) {
    const { kit } = this;
    const sample = iconSt.members[0];
    let calls = 0;
    const ddx = moving && drag ? (drag.dx || 0) : 0;
    const ddy = moving && drag ? (drag.dy || 0) : 0;
    for (const g of iconSt.groups) {
      if (!g.grad && !hasPaint(g.fill)) continue;
      const ckBlend = toCanvasKitBlendMode(kit, g.blendMode);
      if (ckBlend) {
        this.layerPaint.setBlendMode(ckBlend);
        this.layerPaint.setAlphaf(alpha(g.opacity));
        canvas.saveLayer(this.layerPaint);
      }
      try {
        const syn = { ...sample, subs: g.subs, fill: g.fill, grad: g.grad || null, fillRule: g.fillRule, opacity: g.opacity, blendMode: g.blendMode };
        const hasStatic = Boolean(g.staticSubs && g.staticSubs.length > 0);
        const hasMoving = Boolean(moving && drag && g.movingSubs && g.movingSubs.length > 0);
        if (hasStatic && hasMoving && (ddx !== 0 || ddy !== 0)) {
          const dStatic = VE.serializePath({ subs: g.staticSubs }, 0, 0);
          const dMoving = VE.serializePath({ subs: g.movingSubs }, -ddx, -ddy);
          const d = dStatic && dMoving ? dStatic + ' ' + dMoving : (dStatic || dMoving);
          const path = kit.Path.MakeFromSVGString(d);
          if (path) {
            path.setFillType(g.fillRule === 'evenodd' ? kit.FillType.EvenOdd : kit.FillType.Winding);
            try {
              canvas.save();
              canvas.translate(-canvasOriginX, -canvasOriginY);
              calls += this.drawVector(canvas, syn, path, 0, 0, zoom, true, false, ckBlend ? 1 : alpha(g.opacity), smoothEdges);
              canvas.restore();
            } finally {
              path.delete();
            }
          }
          continue;
        }
        const iconEntry = this.iconGroupPath(g, sample);
        if (iconEntry.path) {
          const gdx = hasMoving ? ddx : 0;
          const gdy = hasMoving ? ddy : 0;
          canvas.save();
          canvas.translate(iconEntry.x + gdx - canvasOriginX, iconEntry.y + gdy - canvasOriginY);
          calls += this.drawVector(canvas, syn, iconEntry.path, iconEntry.x, iconEntry.y, zoom, true, false, ckBlend ? 1 : alpha(g.opacity), smoothEdges);
          canvas.restore();
        }
      } finally {
        if (ckBlend) {
          canvas.restore();
          this.layerPaint.setBlendMode(kit.BlendMode.SrcOver);
          this.layerPaint.setAlphaf(1);
        }
      }
    }
    return calls;
  }

  image(href, timeout = 12000) {
    if (!href) return null;
    const existing = this.images.get(href);
    if (existing) {
      this.images.delete(href);
      this.images.set(href, existing);
      return existing;
    }
    const source = new Image();
    if (/^https?:\/\//i.test(href)) source.crossOrigin = 'anonymous';
    const entry: any = {image: null, error: null};
    const finish = () => {
      clearTimeout(timer);
      source.onload = source.onerror = null;
      resolveImage();
    };
    let resolveImage;
    entry.ready = new Promise(resolve => { resolveImage = resolve; });
    entry.dispose = () => {
      finish();
      source.removeAttribute('src');
      entry.image?.delete();
      entry.image = null;
    };
    const fail = error => {
      entry.error = error;
      finish();
      this.onAssetChange();
    };
    const timer = setTimeout(() => fail(new Error('Waktu tunggu pemuatan gambar habis')), timeout);
    source.onload = () => {
      try {
        entry.image = this.kit.MakeImageFromCanvasImageSource(source);
        if (!entry.image) throw new Error('CanvasKit gagal mendekode gambar');
      } catch (error) {
        fail(error);
        return;
      }
      finish();
      this.onAssetChange();
    };
    source.onerror = () => fail(new Error('Gagal memuat gambar'));
    this.images.set(href, entry);
    source.src = href;
    return entry;
  }

  pruneImages(objects) {
    if (this.imageObjects === objects) return;
    this.imageObjects = objects;
    const used = new Set(objects.filter(o => o && !o.hidden && o.img).map(o => o.img.href));
    for (const [href, entry] of this.images) {
      if (used.has(href)) continue;
      this.images.delete(href);
      entry.dispose();
    }
  }

  withPaint(color, gradient, opacity, x, y, draw) {
    const {kit, paint} = this;
    paint.setStyle(kit.PaintStyle.Fill);
    paint.setBlendMode(kit.BlendMode.SrcOver);
    paint.setColor(this.color(color, opacity));
    let shader;
    if (gradient?.stops?.length) {
      if (typeof paint.setDither === 'function') paint.setDither(true);
      const g = gradient;
      if (g.stops.length === 1) paint.setColor(this.color(g.stops[0].color, opacity * (g.stops[0].op ?? 1)));
      else {
        let id = this.shaderIds.get(g);
        if (!id) {
          id = this.nextShaderId++;
          this.shaderIds.set(g, id);
        }
        const key = `${id}:${x}:${y}`;
        shader = this.shaders.get(key, () => {
          const stops = [...g.stops].sort((a, b) => a.offset - b.offset);
          const colors = stops.map(s => this.color(s.color, s.op));
          const offsets = stops.map(s => alpha(s.offset ?? 0));
          const tile = g.spread === 'reflect' ? kit.TileMode.Mirror : g.spread === 'repeat' ? kit.TileMode.Repeat : kit.TileMode.Clamp;
          let value;
          if (g.type === 'radial') {
            const center = [g.cx - x, g.cy - y];
            const focal = [(g.fx ?? g.cx) - x, (g.fy ?? g.cy) - y];
            const radius = Math.max(0.0001, g.r);
            value = center[0] === focal[0] && center[1] === focal[1]
              ? kit.Shader.MakeRadialGradient(center, radius, colors, offsets, tile)
              : kit.Shader.MakeTwoPointConicalGradient(focal, 0, center, radius, colors, offsets, tile);
          } else if (g.type === 'angular') {
            const center = [g.cx - x, g.cy - y];
            const startAng = ((g.angle != null ? g.angle : (g.handleAng != null ? g.handleAng * 180 / Math.PI : 0)) % 360 + 360) % 360;
            value = kit.Shader.MakeSweepGradient(center[0], center[1], colors, offsets, tile, null, 0, startAng, startAng + 360);
          } else {
            value = kit.Shader.MakeLinearGradient([g.x1 - x, g.y1 - y], [g.x2 - x, g.y2 - y], colors, offsets, tile);
          }
          return {value, cost: stops.length, dispose() { value?.delete(); }};
        }).value;
      }
      if (shader) {
        this._frameHasGradient = true;
        paint.setShader(shader);
        paint.setAlphaf(opacity);
      }
    }
    try {
      draw(paint);
    } finally {
      if (shader) paint.setShader(null);
    }
  }

  stroke(paint, o, width) {
    const {kit} = this;
    paint.setStyle(kit.PaintStyle.Stroke);
    paint.setStrokeWidth(width);
    paint.setStrokeCap({butt: kit.StrokeCap.Butt, square: kit.StrokeCap.Square}[o.strokeLinecap] ?? kit.StrokeCap.Round);
    paint.setStrokeJoin({bevel: kit.StrokeJoin.Bevel, miter: kit.StrokeJoin.Miter}[o.strokeLinejoin] ?? kit.StrokeJoin.Round);
    paint.setStrokeMiter(o.strokeMiterlimit || 4);
  }

  drawVector(canvas, o, path, x, y, zoom, fill, stroke, opacity, smoothEdges) {
    const aa = true;
    if (this._paintAA !== aa) {
      this.paint.setAntiAlias(aa);
      this.layerPaint.setAntiAlias?.(aa);
      this.blurPaint.setAntiAlias?.(aa);
      this._paintAA = aa;
    }
    let calls = 0;
    const drawFill = () => {
      if (fill) {
        this.withPaint(o.fill, VE.gradOn(o) ? o.grad : null, opacity, x, y, paint => canvas.drawPath(path, paint));
        calls++;
      }
    };
    const drawStroke = () => {
      if (stroke) {
        const { kit } = this;
        const intervals = toSkiaDashIntervals(o.strokeDasharray);
        let dashEffect = null;
        if (intervals && kit.PathEffect?.MakeDash) {
          const phase = o.strokeDashoffset || 0;
          if (o.nonScalingStroke) {
            const scIntervals = intervals.map(v => v / zoom);
            const scPhase = phase / zoom;
            const key = scIntervals.map(v => Math.round(v * 100) / 100).join(',') + '@' + (Math.round(scPhase * 100) / 100);
            dashEffect = this.dashEffects.get(key, () => {
              const val = kit.PathEffect.MakeDash(scIntervals, scPhase);
              return { value: val, cost: 1, dispose() { val?.delete?.(); } };
            })?.value;
          } else {
            const key = intervals.join(',') + '@' + phase;
            dashEffect = this.dashEffects.get(key, () => {
              const val = kit.PathEffect.MakeDash(intervals, phase);
              return { value: val, cost: 1, dispose() { val?.delete?.(); } };
            })?.value;
          }
        }

        const effW = o.nonScalingStroke ? o.strokeWidth / zoom : o.strokeWidth;
        const align = effectiveStrokeAlign(o);

        this.withPaint(o.stroke, VE.strokeGradOn(o) ? o.strokeGrad : null, opacity, x, y, paint => {
          if (dashEffect && typeof paint.setPathEffect === 'function') {
            paint.setPathEffect(dashEffect);
          }
          try {
            if (align === 'center') {
              this.stroke(paint, o, effW);
              canvas.drawPath(path, paint);
            } else if (align === 'inside' || align === 'outside') {
              const clipOp = align === 'inside' ? kit.ClipOp.Intersect : kit.ClipOp.Difference;
              const subs = Array.isArray(o.subs) ? o.subs : [];
              const hasClosed = subs.some(sp => Boolean(sp && sp.closed));
              const hasOpen = subs.some(sp => Boolean(sp && !sp.closed));

              // Seamless outside stroke for 'stroke fill' (Fill Depan):
              // Drawing 2x stroke centered and allowing the subsequent fill to render on top
              // completely eliminates rasterized white boundary seams and antialiasing gaps!
              const canDrawOutsideUnderFill = align === 'outside' &&
                (o.paintOrder === 'stroke fill' || o.paintOrder === 'stroke fill markers') &&
                Boolean(fill && o.fill && o.fill !== 'none');

              if (canDrawOutsideUnderFill) {
                this.stroke(paint, o, effW * 2);
                canvas.drawPath(path, paint);
              } else if (hasClosed && hasOpen) {
                const closedSubs = subs.filter(sp => Boolean(sp && sp.closed));
                const openSubs = subs.filter(sp => Boolean(sp && !sp.closed));
                const closedPath = this.buildPathFromSubs(closedSubs, x, y);
                const openPath = this.buildPathFromSubs(openSubs, x, y);
                try {
                  if (closedPath) {
                    const fillType = o.fillRule === 'evenodd' ? kit.FillType.EvenOdd : kit.FillType.Winding;
                    closedPath.setFillType(fillType);
                    canvas.save();
                    canvas.clipPath(closedPath, clipOp, true);
                    this.stroke(paint, o, effW * 2);
                    canvas.drawPath(closedPath, paint);
                    canvas.restore();
                  }
                  if (openPath) {
                    this.stroke(paint, o, effW);
                    canvas.drawPath(openPath, paint);
                  }
                } finally {
                  closedPath?.delete?.();
                  openPath?.delete?.();
                }
              } else if (hasClosed) {
                canvas.save();
                canvas.clipPath(path, clipOp, true);
                this.stroke(paint, o, effW * 2);
                canvas.drawPath(path, paint);
                canvas.restore();
              } else {
                this.stroke(paint, o, effW);
                canvas.drawPath(path, paint);
              }
            } else {
              this.stroke(paint, o, effW);
              canvas.drawPath(path, paint);
            }
          } finally {
            if (typeof paint.setPathEffect === 'function') {
              paint.setPathEffect(null);
            }
          }
        });
        calls++;
      }
    };

    if (o.paintOrder === 'stroke fill' || o.paintOrder === 'stroke fill markers') {
      drawStroke();
      drawFill();
    } else {
      drawFill();
      drawStroke();
    }
    return calls;
  }

  drawImage(canvas, o, x, y, opacity) {
    const image = this.image(o.img.href)?.image;
    if (!image) return 0;
    const w = image.width(), h = image.height();
    const geometry = VE.computeImageParGeometry(o, w, h);
    if (!geometry) return 0;
    const {baseMatrix, drawX, drawY, drawW, drawH, clip} = geometry;
    const {kit, paint} = this;
    canvas.concat(matrix(baseMatrix as any, x, y));
    if (clip) canvas.clipRect([0, 0, o.img.w, o.img.h], kit.ClipOp.Intersect, false);
    paint.setColor(kit.WHITE);
    paint.setAlphaf(opacity);
    canvas.drawImageRectOptions(image, [0, 0, w, h], [drawX, drawY, drawX + drawW, drawY + drawH],
      kit.FilterMode.Linear, kit.MipmapMode.Linear, paint);
    return 1;
  }

  // Selection and editing share the paragraph frame.
  getMeasuredTextBounds(object) {
    if (!this.fontRegistry) return null;
    try {
      const layout = this.textLayouts.get(object, () => makeTextLayout(this.kit, this.fontRegistry, object));
      return layout && Array.isArray(layout.bounds) ? layout.bounds.slice() : null;
    } catch (e) {
      return null;
    }
  }

  // Ukur bounds teks TANPA memakai cache (bangun layout baru lalu buang).
  // Dipakai TextEditOverlay untuk isi yang sedang diketik (previewObj baru
  // tiap render — bila lewat cache, tiap ketikan membuat entri baru dan
  // mengusir layout objek asli dari cache 256 entri).
  measureTextBounds(object) {
    if (!this.fontRegistry) return null;
    try {
      const layout = makeTextLayout(this.kit, this.fontRegistry, object);
      try {
        const bounds = layout.bounds.slice();
        const lineHeight = layout.paragraph.getLineMetrics?.()?.[0]?.height;
        Object.defineProperties(bounds, {
          family: {value: layout.family},
          resolvedLineHeightPx: {value: layout.resolvedLineHeightPx},
          lineAdvancePx: {value: lineHeight},
          firstLineBaselineY: {value: layout.firstLineBaselineY},
          drawY: {value: layout.drawY}
        });
        return bounds;
      } finally {
        layout.dispose();
      }
    } catch (e) {
      return null;
    }
  }

  getTextCaretSegment(object, offset) {
    if (!this.fontRegistry) return null;
    try {
      const layout = this.textLayouts.get(object, () => ({
        ...makeTextLayout(this.kit, this.fontRegistry, object), cost: 1
      }));
      const segment = caretSegmentForLayout(this.kit, layout, offset);
      if (!segment || !object.rot) return segment;
      const rotation = textRotationMatrix(object);
      return segment.map(point => affinePt(rotation, point));
    } catch {
      return null;
    }
  }

  caretOffsetForText(object, docX, docY) {
    if (!this.fontRegistry) return null;
    try {
      const layout = this.textLayouts.get(object, () => makeTextLayout(this.kit, this.fontRegistry, object));
      const point = {x: docX, y: docY};
      const local = object.rot ? affinePt(affineInverse(textRotationMatrix(object)), point) : point;
      return caretOffsetForPoint(layout.paragraph, local.x - layout.drawX, local.y - layout.drawY, layout.spec.content.length);
    } catch (e) {
      return null;
    }
  }

  // Extent paragraf (unit dokumen) untuk layer gradient + citra cache —
  // sama di kedua jalur agar citra cache menutupi persis rect yang digambar.
  textExtent(layout) {
    const longest = typeof layout.paragraph.getLongestLine === 'function' ? layout.paragraph.getLongestLine() : 0;
    return {
      lw: Math.max(layout.width, longest) + 2,
      lh: Math.max(layout.height, layout.measuredHeight) + 2
    };
  }

  /* Gambar paragraf (+ gradient bila ada) ke canvas apa pun. (x, y) =
     origin view untuk shader gradient (ruang dokumen relatif origin);
     (px, py) = posisi paragraf di canvas. Mengembalikan {lw, lh}.
     Gradient pada teks (2026-11-16): drawParagraph tidak menerima paint,
     jadi lapis gradient lewat saveLayer + SrcIn — shader yang sama dengan
     shape (withPaint), koordinat dokumen ikut (x, y) seperti drawVector.
     Batas layer = extent paragraf penuh (measuredHeight, bukan height box
     fixed — teks bisa meluber ke bawah box). Hanya bila stop >= 2; stop
     tunggal identik dengan fill datar. */
  drawTextParagraph(canvas, layout, object, x, y, px, py) {
    const {lw, lh} = this.textExtent(layout);
    const grad = VE.gradOn(object) ? object.grad : null;
    if (grad && grad.stops && grad.stops.length >= 2) {
      canvas.saveLayer(null, [px - 1, py - 1, px + lw, py + lh]);
      canvas.drawParagraph(layout.paragraph, px, py);
      this.withPaint(object.fill, grad, 1, x, y, paint => {
        paint.setBlendMode(this.kit.BlendMode.SrcIn);
        canvas.drawRect([px - 1, py - 1, px + lw, py + lh], paint);
        paint.setBlendMode(this.kit.BlendMode.SrcOver);
      });
      canvas.restore();
    } else {
      canvas.drawParagraph(layout.paragraph, px, py);
    }
    return {lw, lh};
  }

  drawText(canvas, object, x, y) {
    if (!this.fontRegistry) return 0;
    const spec = legacyTextSpec(object);
    // WAJIB getExactFace: getFace() jatuh ke regular, sehingga teks bold
    // tidak pernah memicu pemulihan keluarga bila regular sudah terdaftar —
    // registry macet hanya-regular, kanvas me-render regular untuk teks bold
    // (dan Ubah ke Path memakai regular). Dengan getExactFace, teks bold
    // memicu ensureAssetFontFamily sampai face bold-nya benar-benar ada.
    if ((spec.fontAssetId || spec.fontAssetIds) && !this.fontRegistry.getExactFace(spec.fontFamily, spec.fontWeight, spec.fontStyle) &&
        !this.failedFontAssets.has(spec.fontAssetId)) {
      // Satu pemicu memuat seluruh keluarga (regular/bold/italic/boldItalic)
      // agar face lain tidak hilang saat proyek dibuka lagi.
      this.fontRegistry.ensureAssetFontFamily(spec)
        .then(() => { this.textLayouts.clear(); this.onAssetChange(); })
        .catch(error => { if (spec.fontAssetId) this.failedFontAssets.add(spec.fontAssetId); console.warn('[Geovanta font]', error); });
    }
    const layout = this.textLayouts.get(object, () => {
      const value = makeTextLayout(this.kit, this.fontRegistry, object);
      return {...value, cost: 1};
    });
    if (!layout.spec.content) return 0;
    const px = (layout.drawX ?? layout.x) - x;
    const py = (layout.drawY ?? layout.y) - y;
    this.drawTextParagraph(canvas, layout, object, x, y, px, py);
    return 1;
  }

  async ensureFonts(objects) {
    if (!this.fontRegistry && objects.some(isLegacyText)) throw new Error('Font CanvasKit tidak tersedia');
    for (const object of objects) {
      if (!isLegacyText(object)) continue;
      const spec = legacyTextSpec(object);
      if (spec.fontAssetId || spec.fontAssetIds) {
        await this.fontRegistry.ensureAssetFontFamily(spec);
      }
      // Validasi face persis: ekspor harus gagal jelas bila face yang diminta
      // tidak ada, bukan diam-diam memakai regular.
      if (!this.fontRegistry.getExactFace(spec.fontFamily, spec.fontWeight, spec.fontStyle)) {
        throw new Error(`Font tidak tersedia untuk ekspor: ${spec.fontFamily}. Pilih pengganti atau impor font tersebut.`);
      }
    }
  }

  /* Gambar bentuk objek SAJA (tanpa bayangan, tanpa clip frame) pada
     canvas yang koordinatnya ruang view (asal x,y, zoom sudah di CTM) —
     dipakai jalur gambar normal DAN render offscreen layer blur (Task 9).
     Mengembalikan jumlah draw call. Rotasi teks (o.rot) diterapkan di
     sini (save/restore sendiri) agar render offscreen dan render utama
     memakai transform yang sama. */
  drawObjectShape(canvas, o, bb, x, y, dx, dy, zoom, smoothEdges, opacity) {
    const {kit} = this;
    if (isLegacyText(o)) {
      let calls = 0;
      if (o.rot && canvas.rotate) {
        const anchor = legacyTextSpec(o);
        canvas.save();
        canvas.rotate(-o.rot, anchor.x - x + dx, anchor.y - y + dy);
        calls += this.drawText(canvas, o, x - dx, y - dy);
        canvas.restore();
      } else {
        calls += this.drawText(canvas, o, x - dx, y - dy);
      }
      return calls;
    }
    const entry = this.path(o);
    canvas.save();
    canvas.translate(entry.x - x + dx, entry.y - y + dy);
    if (entry.clip) canvas.clipPath(entry.clip, kit.ClipOp.Intersect, smoothEdges);
    const fill = VE.gradOn(o) || hasPaint(o.fill);
    const stroke = o.strokeWidth > 0 && (VE.strokeGradOn(o) || hasPaint(o.stroke));
    const needsLayer = opacity < 1 && !o.img && fill && stroke;
    if (needsLayer) {
      this.layerPaint.setAlphaf(opacity);
      canvas.saveLayer(this.layerPaint);
    }
    let calls = 0;
    if (o.img) calls += this.drawImage(canvas, o, entry.x, entry.y, opacity);
    else if (entry.path) calls += this.drawVector(canvas, o, entry.path, entry.x, entry.y, zoom,
      fill, stroke, needsLayer ? 1 : opacity, smoothEdges);
    if (needsLayer) canvas.restore();
    canvas.restore();
    return calls;
  }

  /* Render objek ke citra offscreen untuk layer blur (Task 9, resep
     spike — JANGAN paint.setImageFilter(MakeBlur) langsung pada shape:
     spike membuktikan shape mengembang keras 3σ tanpa pelembutan).
     Permukaan CPU (MakeSurface) berukuran bbox + margin ceil(3*radius)
     tiap sisi, objek digambar di offset (margin, margin) — resolusi
     dokumen (bukan zoom): pada zoom tinggi isi objek bisa tampak lebih
     lembut, tetapi radius blur tetap tepat dalam unit dokumen.
     Mengembalikan {image, surface, w, h} atau null bila gagal / terlalu
     besar (pemanggil menggambar tanpa blur). Surface dipertahankan
     hidup sampai citra selesai digambar pemanggil, baru dibuang. */
  renderLayerBlurredImage(o, bb, zoom, smoothEdges, opacity, layerR, margin, resScale = 1) {
    const {kit} = this;
    const docW = Math.max(1, Math.ceil(bb[2] - bb[0]) + 2 * margin);
    const docH = Math.max(1, Math.ceil(bb[3] - bb[1]) + 2 * margin);
    const w = Math.max(1, Math.ceil(docW * resScale));
    const h = Math.max(1, Math.ceil(docH * resScale));
    /* Guard permukaan: objek raksasa + radius besar bisa meminta ratusan
       MB — di atas batas ini kembalikan null (gambar tanpa blur, lebih
       baik daripada OOM). */
    if (w > 4096 || h > 4096) {
      console.warn('[Geovanta] layer blur dilewati: permukaan offscreen terlalu besar', w, h);
      return null;
    }
    let surface = null;
    try {
      surface = kit.MakeSurface(w, h);
      if (!surface) return null;
      const c = surface.getCanvas();
      c.clear(kit.TRANSPARENT);
      if (resScale !== 1 && typeof c.scale === 'function') c.scale(resScale, resScale);
      this.drawObjectShape(c, o, bb, bb[0] - margin, bb[1] - margin, 0, 0, zoom, smoothEdges, opacity);
      surface.flush();
      const image = surface.makeImageSnapshot();
      if (!image) { surface.delete(); return null; }
      return {image, surface, w, h, docW, docH, resScale};
    } catch (e) {
      console.warn('[Geovanta] layer blur gagal, digambar tanpa blur:', e);
      surface?.delete();
      return null;
    }
  }

  /* Bangun citra layer-blur FINAL untuk cache (Task 9 Step 7): render
     tajam offscreen, lalu blur ke permukaan kedua (resep spike yang
     sama — MakeBlur pada drawImage) dan snapshot. Blur dihitung pada
     piksel resolusi dokumen (atau skala resScale saat ekspor resolusi
     tinggi agar tepi tetap halus), jadi hasilnya konsisten dan tajam.
     Surface blur disimpan bersama citra (pola yang sama seperti
     renderLayerBlurredImage). Mengembalikan
     {image, surface, w, h, docW, docH, resScale, cost, sig, dispose} atau null bila gagal. */
  buildLayerBlurredImage(o, bb, zoom, smoothEdges, opacity, layerR, margin, sig, resScale = 1) {
    const {kit} = this;
    const sharp = this.renderLayerBlurredImage(o, bb, zoom, smoothEdges, opacity, layerR, margin, resScale);
    if (!sharp) return null;
    let blurSurface = null;
    try {
      blurSurface = kit.MakeSurface(sharp.w, sharp.h);
      if (!blurSurface) { sharp.image.delete(); sharp.surface.delete(); return null; }
      const c = blurSurface.getCanvas();
      c.clear(kit.TRANSPARENT);
      const blurSigma = layerR * sharp.resScale;
      this.blurPaint.setImageFilter(kit.ImageFilter.MakeBlur(blurSigma, blurSigma, kit.TileMode.Clamp, null));
      c.drawImage(sharp.image, 0, 0, this.blurPaint);
      this.blurPaint.setImageFilter(null);
      blurSurface.flush();
      const image = blurSurface.makeImageSnapshot();
      sharp.image.delete();
      sharp.surface.delete();
      if (!image) { blurSurface.delete(); return null; }
      return {
        image, surface: blurSurface, w: sharp.w, h: sharp.h, docW: sharp.docW, docH: sharp.docH, resScale: sharp.resScale,
        cost: 2 * sharp.w * sharp.h, sig,
        dispose: () => { image.delete(); blurSurface.delete(); }
      };
    } catch (e) {
      console.warn('[Geovanta] layer blur (cache) gagal, digambar tanpa blur:', e);
      this.blurPaint.setImageFilter(null);
      sharp.image.delete();
      sharp.surface.delete();
      blurSurface?.delete();
      return null;
    }
  }

  /* Gambar objek dengan layer blur (Task 9): citra yang sudah di-blur
     diambil dari cache per-objek (buildLayerBlurredImage) lalu digambar
     polos dengan satu drawImage — render offscreen + blur Gaussian
     TIDAK diulang tiap frame. Gagal build / objek img / teks ->
     jalur tanpa cache (render offscreen tiap frame, seperti semula).
     Mengembalikan jumlah draw call (1 bila citra blur tergambar). */
  drawLayerBlurred(canvas, o, bb, x, y, dx, dy, zoom, smoothEdges, opacity, layerR, margin) {
    const {kit} = this;
    const docW = Math.max(1, Math.ceil(bb[2] - bb[0]) + 2 * margin);
    const docH = Math.max(1, Math.ceil(bb[3] - bb[1]) + 2 * margin);
    const maxFit = Math.min(Math.floor(4096 / docW), Math.floor(4096 / docH));
    const bucket = zoom >= 3.5 ? 4 : zoom >= 1.75 ? 2 : 1;
    const resScale = maxFit >= 1 ? Math.max(1, Math.min(bucket, maxFit)) : 1;
    const drawScaledBlur = (img, srcW, srcH, scaleVal, paint) => {
      const dstX = bb[0] - margin - x + dx;
      const dstY = bb[1] - margin - y + dy;
      if (scaleVal !== 1 && typeof canvas.drawImageRectOptions === 'function') {
        canvas.drawImageRectOptions(img, [0, 0, srcW, srcH], [dstX, dstY, dstX + docW, dstY + docH],
          kit.FilterMode.Linear, kit.MipmapMode.None, paint);
      } else {
        canvas.drawImage(img, dstX, dstY, paint);
      }
    };
    /* Tanpa cache: objek img (bitmap asinkron) dan teks (font asinkron)
       bisa berubah isinya tanpa referensi objek berubah — citra cache
       akan basi. Jalur tanpa cache tetap benar untuk keduanya. */
    const cacheable = this.hasBlur && !o.img && !isLegacyText(o);
    if (!cacheable) {
      const shot = this.renderLayerBlurredImage(o, bb, zoom, smoothEdges, opacity, layerR, margin, resScale);
      if (!shot) return this.drawObjectShape(canvas, o, bb, x, y, dx, dy, zoom, smoothEdges, opacity);
      try {
        const blurSigma = layerR * shot.resScale;
        this.blurPaint.setImageFilter(kit.ImageFilter.MakeBlur(blurSigma, blurSigma, kit.TileMode.Clamp, null));
        drawScaledBlur(shot.image, shot.w, shot.h, shot.resScale, this.blurPaint);
        return 1;
      } finally {
        this.blurPaint.setImageFilter(null);
        shot.image.delete();
        shot.surface.delete();
      }
    }
    /* sig: parameter di luar objek yang memengaruhi raster — opacity
       efektif (berbeda bila objek di dalam grup ber-opacity), zoom
       (HANYA bila nonScalingStroke: drawVector memakai zoom hanya
       untuk strokeWidth/zoom; objek biasa raster-nya independen dari
       zoom, jadi zoom TIDAK boleh menginvalidasi cache mereka —
       kalau tidak, tiap frame saat zoom berubah rebuild semua),
       resScale (bucket 1x/2x/4x agar ekspor resolusi tinggi tajam),
       smoothEdges, radius, bbox. Referensi objek sendiri adalah kunci
       Map (immutable-update). */
    const zoomSig = o.nonScalingStroke ? zoom : 0;
    const sig = [layerR, opacity, zoomSig, resScale, smoothEdges, bb[0], bb[1], bb[2], bb[3]].join('|');
    let entry = this.layerBlurImages.peek(o);
    if (entry && entry.sig !== sig) { this.layerBlurImages.remove(o); entry = null; }
    if (!entry) {
      const built = this.buildLayerBlurredImage(o, bb, zoom, smoothEdges, opacity, layerR, margin, sig, resScale);
      if (!built) return this.drawObjectShape(canvas, o, bb, x, y, dx, dy, zoom, smoothEdges, opacity);
      this.layerBlurImages.get(o, () => built);
      entry = built;
    } else {
      this.layerBlurImages.get(o, () => entry); // sentuh urutan LRU
    }
    drawScaledBlur(entry.image, entry.w, entry.h, entry.resScale, null);
    return 1;
  }

  /* Region yang ditempati semua bayangan satu objek (Task 9 Step 7):
     siluet [bb] digeser (dx, dy) lalu blur menyebar ~3*blur tiap sisi
     (konvensi yang sama dengan shadowPad untuk culling) + 1px aman. */
  dropShadowRegion(shadows, bb) {
    let rx0 = Infinity, ry0 = Infinity, rx1 = -Infinity, ry1 = -Infinity;
    for (const s of shadows) {
      const m = s.blur * 3 + 1;
      rx0 = Math.min(rx0, bb[0] + s.dx - m);
      ry0 = Math.min(ry0, bb[1] + s.dy - m);
      rx1 = Math.max(rx1, bb[2] + s.dx + m);
      ry1 = Math.max(ry1, bb[3] + s.dy + m);
    }
    return [rx0, ry0, rx1, ry1];
  }

  /* Bangun citra drop shadow FINAL untuk cache (Task 9 Step 7): semua
     bayangan objek dirender sekali ke permukaan offscreen — path
     digambar dengan paint MakeDropShadowOnly per bayangan (resep Task 8
     yang sama), tanpa clip (clip diterapkan saat menggambar citra,
     persis seperti jalur tanpa cache: clip hanya memangkas OUTPUT
     filter). Mengembalikan {image, surface, rx0, ry0, cost, sig,
     dispose} atau null bila gagal / terlalu besar. */
  buildDropShadowImage(o, bb, entry, shadows, opacity, smoothEdges, sig) {
    const {kit} = this;
    const [rx0, ry0, rx1, ry1] = this.dropShadowRegion(shadows, bb);
    const w = Math.max(1, Math.ceil(rx1 - rx0));
    const h = Math.max(1, Math.ceil(ry1 - ry0));
    if (w > 4096 || h > 4096) return null;
    let surface = null;
    try {
      surface = kit.MakeSurface(w, h);
      if (!surface) return null;
      const c = surface.getCanvas();
      c.clear(kit.TRANSPARENT);
      c.save();
      c.translate(entry.x - rx0, entry.y - ry0);
      this.shadowPaint.setAntiAlias(smoothEdges);
      for (const s of shadows) {
        if (this.setShadowFilter(s, opacity)) c.drawPath(entry.path, this.shadowPaint);
      }
      this.shadowPaint.setImageFilter(null);
      c.restore();
      surface.flush();
      const image = surface.makeImageSnapshot();
      if (!image) { surface.delete(); return null; }
      return {
        image, surface, rx0, ry0, cost: 2 * w * h, sig,
        dispose: () => { image.delete(); surface.delete(); }
      };
    } catch (e) {
      console.warn('[Geovanta] drop shadow (cache) gagal:', e);
      this.shadowPaint.setImageFilter(null);
      surface?.delete();
      return null;
    }
  }

  /* Gambar semua bayangan satu objek dari cache (Task 9 Step 7).
     Kanvas pemanggil sedang di-translate (entry.x - x + dx, ...) dan
     clip objek sudah diterapkan — citra digambar di posisi lokal
     (rx0 - entry.x, ry0 - entry.y) sehingga clip yang sama tetap
     memangkasnya. Mengembalikan true bila citra cache tergambar,
     false bila harus fallback ke jalur tanpa cache (pemanggil
     menggambar tiap bayangan langsung). */
  drawCachedShadows(canvas, o, bb, entry, shadows, opacity, smoothEdges, zoom = 1) {
    if (!this.hasDropShadowOnly || (zoom && Math.abs(zoom - 1) > 0.01)) return false;
    const [rx0, ry0, rx1, ry1] = this.dropShadowRegion(shadows, bb);
    const sig = [opacity, smoothEdges, rx0, ry0, rx1, ry1].join('|');
    let e = this.dropShadowImages.peek(o);
    if (e && e.sig !== sig) { this.dropShadowImages.remove(o); e = null; }
    if (!e) {
      const built = this.buildDropShadowImage(o, bb, entry, shadows, opacity, smoothEdges, sig);
      if (!built) return false;
      this.dropShadowImages.get(o, () => built);
      e = built;
    } else {
      this.dropShadowImages.get(o, () => e); // sentuh urutan LRU
    }
    canvas.drawImage(e.image, e.rx0 - entry.x, e.ry0 - entry.y, null);
    return true;
  }

  drawScene(canvas, objects, view, options: Record<string, any> = {}) {
    const {kit} = this;
    const {x, y, width, height, zoom, smoothEdges = false, interacting = false} = view;
    const cull = view.cullRect || view;
    const cx0 = cull.x, cy0 = cull.y, cx1 = cull.x + cull.width, cy1 = cull.y + cull.height;
    const {frameRects, frameBackgrounds, drag, editingTextId} = options;
    const stats = {visibleObjects: 0, culledObjects: 0, drawCalls: 0, totalVertices: 0, hasGradient: false};
    this._frameHasGradient = false;
    const aa = Boolean(smoothEdges);
    if (this._paintAA !== aa) {
      this.paint.setAntiAlias(aa);
      this.layerPaint.setAntiAlias?.(aa);
      this.blurPaint.setAntiAlias?.(aa);
      this._paintAA = aa;
    }
    /* State fill gabungan frame ikon: aktif di pass statis MAUPUN pass drag
       (whole-icon drag reuse cache iconFillPaths, partial-icon drag menggabung
       subpath diam + subpath bergerak secara dinamis agar lubang tetap utuh). */
    let iconFrameState = null;

    const drawPass = moving => {
      const iconSource = options.allObjects || objects;
      const bundle = getIconStateBundle(iconSource, drag?.ids || null);
      const partialGroups = bundle.partialGroups;
      iconFrameState = moving ? bundle.movingMap : bundle.staticMap;
      for (const st of iconFrameState.values()) st.drawn = false;
      const inMovingPass = o =>
        Boolean(drag?.ids.has(o.id)) ||
        (partialGroups.size > 0 && isIconFrameVectorMember(o) && partialGroups.has(o.group));
      let group = null, groupOpacity = 1;
      let inWorldSpace = false;
      let solidFillReady = false;
      let lastSolidColor = null;
      const exitWorldSpace = () => {
        if (inWorldSpace) {
          canvas.restore();
          inWorldSpace = false;
        }
      };
      const resetSolidBatch = () => {
        solidFillReady = false;
        lastSolidColor = null;
      };
      const drawObject = (o, isMovingPass, withinGroup) => {
        if (o.hidden || (editingTextId && o.id === editingTextId)) return;
        const isObjMoved = Boolean(isMovingPass && drag?.ids.has(o.id));
        const dx = isObjMoved ? (drag.dx || 0) : 0, dy = isObjMoved ? (drag.dy || 0) : 0;
        const {bb, n} = vinfo(o);
        const hasEffects = Array.isArray(o.effects) && o.effects.length > 0;
        const shadows = hasEffects ? this.dropShadows(o) : [];
        const shadowPad = shadows.length
          ? Math.max(...shadows.map(s => Math.max(Math.abs(s.dx), Math.abs(s.dy)) + s.blur * 3))
          : 0;
        const layerR = hasEffects && this.hasBlur ? this.layerBlurRadius(o) : 0;
        const bgR = hasEffects && this.hasBlur ? this.backgroundBlurRadius(o) : 0;
        const blurMargin = layerR > 0 ? Math.ceil(3 * layerR) : 0;
        const strokeW = o.strokeWidth || 0;
        const strokeOutward = hasVisibleStroke(o) ? strokeOutwardExtent(o) : 0;
        const strokePad = strokeOutward * (o.nonScalingStroke ? 1 / zoom : 1) * (o.strokeMiterlimit || 4);
        const pad = Math.max(2, strokePad) + shadowPad + blurMargin;
        if (bb[2] + dx + pad < cx0 || bb[0] + dx - pad > cx1 ||
            bb[3] + dy + pad < cy0 || bb[1] + dy - pad > cy1) {
          stats.culledObjects++;
          return;
        }
        if (interacting && !isMovingPass && !hasEffects && !o.img && !isLegacyText(o)) {
          const effPad = strokeOutward > 0 ? strokeOutward * (o.nonScalingStroke ? 1 / zoom : 1) : 0;
          if ((bb[2] - bb[0] + effPad * 2) * zoom < 0.5 && (bb[3] - bb[1] + effPad * 2) * zoom < 0.5) {
            stats.culledObjects++;
            return;
          }
        }
        stats.visibleObjects++;
        stats.totalVertices += n;
        const fid = !isMovingPass && !isFrameBackground(o) && o.group;
        const hasFrameClip = Boolean(fid && frameRects?.has(fid));
        const opacity = alpha(o.opacity) * (withinGroup ? 1 : alpha(o.groupOpacity));
        const ckBlend = toCanvasKitBlendMode(kit, o.blendMode);
        const innerOpacity = ckBlend ? 1 : opacity;

        if (!hasFrameClip && bgR <= 0 && layerR <= 0 && !shadows.length && !o.img && !isLegacyText(o)) {
          const iconSt = !o.text && o.isIconFrame && o.group && !o.isFrameBg && !o.isAutoFrame ? iconFrameState?.get(o.group) : null;
          if (!iconSt) {
            const entry = this.path(o);
            if (!entry.clip) {
              const hasGrad = VE.gradOn(o);
              const fill = hasGrad || hasPaint(o.fill);
              let stroke = strokeW > 0 && (VE.strokeGradOn(o) || hasPaint(o.stroke));
              if (interacting && fill && stroke) {
                const effStrokePx = o.nonScalingStroke ? strokeW : strokeW * zoom;
                if (effStrokePx < 0.5 || (effStrokePx <= 1.5 && !hasGrad && !VE.strokeGradOn(o) && o.stroke === o.fill)) {
                  stroke = false;
                }
              }
              if ((fill || stroke) && entry.path) {
                if (!dx && !dy && entry.x === 0 && entry.y === 0 && fill && !stroke && !hasGrad && !ckBlend) {
                  if (!inWorldSpace) {
                    canvas.save();
                    canvas.translate(-x, -y);
                    inWorldSpace = true;
                  }
                  if (!solidFillReady) {
                    this.paint.setStyle(kit.PaintStyle.Fill);
                    this.paint.setBlendMode(kit.BlendMode.SrcOver);
                    solidFillReady = true;
                    lastSolidColor = null;
                  }
                  const col = this.color(o.fill, opacity);
                  if (col !== lastSolidColor) {
                    this.paint.setColor(col);
                    lastSolidColor = col;
                  }
                  canvas.drawPath(entry.path, this.paint);
                  stats.drawCalls++;
                  return;
                }
                exitWorldSpace();
                resetSolidBatch();
                if (ckBlend) {
                  this.layerPaint.setBlendMode(ckBlend);
                  this.layerPaint.setAlphaf(opacity);
                  canvas.saveLayer(this.layerPaint);
                }
                try {
                  const needsLayer = innerOpacity < 1 && fill && stroke;
                  canvas.save();
                  canvas.translate(entry.x - x + dx, entry.y - y + dy);
                  if (needsLayer) {
                    this.layerPaint.setAlphaf(innerOpacity);
                    canvas.saveLayer(this.layerPaint);
                  }
                  stats.drawCalls += this.drawVector(canvas, o, entry.path, entry.x, entry.y, zoom,
                    fill, stroke, needsLayer ? 1 : innerOpacity, smoothEdges);
                  if (needsLayer) canvas.restore();
                  canvas.restore();
                } finally {
                  if (ckBlend) {
                    canvas.restore();
                    this.layerPaint.setBlendMode(kit.BlendMode.SrcOver);
                    this.layerPaint.setAlphaf(1);
                  }
                }
                return;
              }
              return;
            }
          }
        }

        exitWorldSpace();
        resetSolidBatch();

        if (ckBlend) {
          this.layerPaint.setBlendMode(ckBlend);
          this.layerPaint.setAlphaf(opacity);
          canvas.saveLayer(this.layerPaint);
        }
        try {
          const fill = VE.gradOn(o) || hasPaint(o.fill);
          const stroke = strokeW > 0 && (VE.strokeGradOn(o) || hasPaint(o.stroke));
          const iconSt = !o.img && !o.text && o.isIconFrame && o.group && !o.isFrameBg && !o.isAutoFrame ? iconFrameState?.get(o.group) : null;
          const ownFill = iconSt ? false : fill;
          if (iconSt && iconSt.drawn && !stroke && !shadows.length && layerR <= 0 && bgR <= 0) {
            return;
          }

          canvas.save();
          if (hasFrameClip) {
            const frame = frameBackgrounds?.get(fid);
            const fastIconRect = frame && isFrameBackground(frame) && isAxisAlignedRectFrame(frame) && frameRects.has(fid);
            if (fastIconRect) {
              const [l, t, r, b] = frameRects.get(fid);
              canvas.clipRect([l - x, t - y, r - x, b - y], kit.ClipOp.Intersect, smoothEdges);
            } else {
              const framePath = frame && this.path(frame);
              if (framePath?.path) {
                canvas.translate(framePath.x - x, framePath.y - y);
                canvas.clipPath(framePath.path, kit.ClipOp.Intersect, smoothEdges);
                canvas.translate(x - framePath.x, y - framePath.y);
              } else {
                const [l, t, r, b] = frameRects.get(fid);
                canvas.clipRect([l - x, t - y, r - x, b - y], kit.ClipOp.Intersect, smoothEdges);
              }
            }
          }
          if (iconSt && !iconSt.drawn && !stroke && !shadows.length && layerR <= 0 && bgR <= 0 && !o.clipPathD) {
            iconSt.drawn = true;
            stats.drawCalls += this.drawIconFrameGroups(canvas, iconSt, x, y, zoom, smoothEdges, drag, isMovingPass);
            canvas.restore();
            return;
          }
          let bgLayer = false;
          if (bgR > 0) {
            const bx0 = bb[0] - x + dx, by0 = bb[1] - y + dy, bx1 = bb[2] - x + dx, by1 = bb[3] - y + dy;
            canvas.save();
            canvas.clipRect([bx0, by0, bx1, by1], kit.ClipOp.Intersect, false);
            canvas.saveLayer(null, [bx0, by0, bx1, by1], kit.ImageFilter.MakeBlur(bgR, bgR, kit.TileMode.Clamp, null));
            bgLayer = true;
          }
          if (isLegacyText(o)) {
            const rotated = o.rot && canvas.rotate;
            if (rotated) {
              const anchor = legacyTextSpec(o);
              canvas.save();
              canvas.rotate(-o.rot, anchor.x - x + dx, anchor.y - y + dy);
            }
            for (const s of shadows) {
              if (this.setShadowFilter(s, alpha(innerOpacity))) {
                canvas.saveLayer(this.shadowPaint);
                this.drawText(canvas, o, x - dx, y - dy);
                canvas.restore();
              }
            }
            if (shadows.length) this.shadowPaint.setImageFilter(null);
            if (layerR > 0) {
              if (rotated) canvas.restore();
              stats.drawCalls += this.drawLayerBlurred(canvas, o, bb, x, y, dx, dy, zoom, smoothEdges, alpha(innerOpacity), layerR, blurMargin);
            } else {
              stats.drawCalls += this.drawText(canvas, o, x - dx, y - dy);
              if (rotated) canvas.restore();
            }
            if (bgLayer) { canvas.restore(); canvas.restore(); }
            canvas.restore();
            return;
          }
          const entry = this.path(o);
          canvas.save();
          canvas.translate(entry.x - x + dx, entry.y - y + dy);
          if (entry.clip) canvas.clipPath(entry.clip, kit.ClipOp.Intersect, smoothEdges);
          if (shadows.length) {
            this.shadowPaint.setAntiAlias(smoothEdges);
            if (o.img) {
              for (const s of shadows) {
                if (this.setShadowFilter(s, innerOpacity)) {
                  canvas.saveLayer(this.shadowPaint);
                  this.drawImage(canvas, o, entry.x, entry.y, innerOpacity);
                  canvas.restore();
                }
              }
            } else if (entry.path) {
              if (!this.drawCachedShadows(canvas, o, bb, entry, shadows, innerOpacity, smoothEdges, zoom)) {
                for (const s of shadows) {
                  if (this.setShadowFilter(s, innerOpacity)) canvas.drawPath(entry.path, this.shadowPaint);
                }
              }
            }
            this.shadowPaint.setImageFilter(null);
          }
          if (iconSt && !iconSt.drawn) {
            iconSt.drawn = true;
            stats.drawCalls += this.drawIconFrameGroups(canvas, iconSt, entry.x + dx, entry.y + dy, zoom, smoothEdges, drag, isMovingPass);
          }
          if (layerR > 0) {
            canvas.restore();
            stats.drawCalls += this.drawLayerBlurred(canvas, o, bb, x, y, dx, dy, zoom, smoothEdges, innerOpacity, layerR, blurMargin);
          } else {
            const needsLayer = innerOpacity < 1 && !o.img && ownFill && stroke;
            if (needsLayer) {
              this.layerPaint.setAlphaf(innerOpacity);
              canvas.saveLayer(this.layerPaint);
            }
            if (o.img) stats.drawCalls += this.drawImage(canvas, o, entry.x, entry.y, innerOpacity);
            else if (entry.path) stats.drawCalls += this.drawVector(canvas, o, entry.path, entry.x, entry.y, zoom,
              ownFill, stroke, needsLayer ? 1 : innerOpacity, smoothEdges);
            if (needsLayer) canvas.restore();
            canvas.restore();
          }
          if (bgLayer) { canvas.restore(); canvas.restore(); }
          canvas.restore();
        } finally {
          if (ckBlend) {
            canvas.restore();
            this.layerPaint.setBlendMode(kit.BlendMode.SrcOver);
            this.layerPaint.setAlphaf(1);
          }
        }
      };

      const saveCount = canvas.getSaveCount();
      try {
        for (const o of objects) {
          if (!o || o.hidden || inMovingPass(o) !== moving) continue;
          const nextOpacity = alpha(o.groupOpacity);
          const nextGroup = o.group && nextOpacity < 1 ? o.group : null;
          if (nextGroup !== group || (nextGroup && nextOpacity !== groupOpacity)) {
            exitWorldSpace();
            resetSolidBatch();
            if (group) canvas.restore();
            group = nextGroup;
            groupOpacity = nextOpacity;
            if (group) {
              this.layerPaint.setAlphaf(groupOpacity);
              canvas.saveLayer(this.layerPaint);
            }
          }
          drawObject(o, moving, Boolean(group));
        }
      } finally {
        canvas.restoreToCount(saveCount);
      }
    };
    const getIconStateBundle = (sourceObjs, dragIds) => {
      if (this._iconStateObjs !== sourceObjs || this._iconStateDrag !== dragIds || !this._iconStateMap) {
        this._iconStateObjs = sourceObjs;
        this._iconStateDrag = dragIds;
        this._iconStateMap = buildIconFrameDragState(sourceObjs, dragIds);
      }
      return this._iconStateMap;
    };
    const passMode = options.passMode || 'all';
    if (passMode !== 'moving') drawPass(false);
    if (drag && passMode !== 'static') drawPass(true);
    if (this._paintAA) {
      this.paint.setAntiAlias(false);
      this.layerPaint.setAntiAlias?.(false);
      this.blurPaint.setAntiAlias?.(false);
      this._paintAA = false;
    }
    stats.hasGradient = this._frameHasGradient;
    return stats;
  }
}
