/**
 * @file src/engine/svgDocumentSerializer.tsx
 * @description Serialisasi dokumen Geovanta kembali menjadi kode standar XML SVG
 */
import { docBounds, imageMatrix, isSafeImageHref, isVisibleFrameBg } from './imageAndBounds.tsx';
import { rd, esc } from './vectorPrimitives.tsx';
import { gradOn, gradXml, strokeGradOn } from './gradientEngine.tsx';
import { serializePath, serializeSub } from './svgPathSerializer.tsx';
import { isLegacyText, legacyTextSpec, applyTextCase } from './legacyText.tsx';
import { tightBBox } from './spatialIndexAndHitTest.tsx';
import { effectsFilterId, effectsFilterDefs } from './effectsEngine.tsx';
import {
  effectiveStrokeAlign,
  hasVisibleStroke,
  strokeOutwardExtent,
  formatDasharray,
  parseDasharray
} from './strokeStyles.tsx';
import { normalizeBlendMode } from './blendModes.tsx';
import { alignedStrokeOutlineSubs } from './pathOffset.tsx';

export function resolveExportArea(doc, opt: Record<string, any> = {}) {
  if (doc.objects.some(o => o.hidden)) doc = {
    ...doc,
    objects: doc.objects.filter(o => !o.hidden)
  }; /* layer tersembunyi tidak ikut diekspor (ala Figma) */
  if (opt.area === 'sel' && opt.only) {
    const targetIds = new Set(opt.only);
    // Masukkan semua anggota frame bila kontainernya (latar) dipilih secara eksplisit
    for (const o of doc.objects) {
      if (opt.only.has(o.id)) {
        if ((o.isFrameBg || o.isAutoFrame) && o.group) {
          for (const ch of doc.objects) {
            if (ch.group === o.group) targetIds.add(ch.id);
          }
        } else if (o.isIconFrame && o.group) {
          // Bila anggota bentuk ikon dipilih, masukkan semua bentuk visual ikon (kecuali latar frame)
          for (const ch of doc.objects) {
            if (ch.group === o.group && ch.isIconFrame && !ch.isFrameBg && !ch.isAutoFrame) {
              targetIds.add(ch.id);
            }
          }
        }
      }
    }
    const matched = doc.objects.filter(o => targetIds.has(o.id));
    if (matched.length > 0) {
      doc = {
        ...doc,
        objects: matched
      };
    }
  }
  let [vx, vy, vw, vh] = doc.viewBox;
  if (opt.area === 'content' || opt.area === 'sel') {
    const bb = docBounds(doc, null, opt);
    if (bb && bb[2] > bb[0] && bb[3] > bb[1]) {
      // Bleed safety margin: 0 untuk SVG vektor murni (tanpa white stroke / gap), 2px untuk raster (antialiasing)
      const bleed = opt.bleed != null ? opt.bleed : (opt.isRaster ? 2 : 0);
      if (bleed > 0) {
        vx = Math.floor((bb[0] - bleed) * 100) / 100;
        vy = Math.floor((bb[1] - bleed) * 100) / 100;
        vw = Math.ceil((bb[2] + bleed - vx) * 100) / 100;
        vh = Math.ceil((bb[3] + bleed - vy) * 100) / 100;
      } else {
        vx = bb[0];
        vy = bb[1];
        vw = bb[2] - bb[0];
        vh = bb[3] - bb[1];
      }
    }
  }
  return {objects: doc.objects, bounds: [vx, vy, Math.max(1, rd(vw)), Math.max(1, rd(vh))]};
}

/* Bbox objek untuk region filter (Fix wave F2): tightBBox sudah menghitung
   min/max node+handle (path), legacyTextBounds (teks), dan fallback x/y/w/h
   (rect/ellipse/image) — dipakai apa adanya. Dua penyesuaian:
   - stroke: bbox diperlebar setengah strokeWidth (objectBoundingBox SVG
     mencakup stroke; tanpa ini stroke tebal terpotong di tepi region).
   - teks terotasi: subs teks TIDAK di-bake (renderer memutar kanvas,
     serializer menulis transform rotate(-o.rot) tentang anchor (t.x, t.y)),
     jadi keempat sudut bbox tak-terotasi diputar tentang anchor — AABB
     hasil putaran itulah bbox ekspor. Path/image: subs SUDAH di-bake oleh
     transformObject, jadi tightBBox sudah AABB final (tanpa penanganan
     rotasi tambahan — menambahkannya akan menghitung ganda).
   Catatan koordinat: semua elemen diekspor dengan offset (-ox,-oy), tapi
   region filter adalah persen dari bbox — translasi seragam tidak mengubah
   persennya, jadi bbox ruang dokumen cukup. */
function effectBbox(o) {
  let b = null;
  try { b = tightBBox(o); } catch (e) { b = null; }
  if (!b || !(b[2] > b[0]) || !(b[3] > b[1])) return null;
  let [x0, y0, x1, y1] = b;
  const pad = hasVisibleStroke(o) ? strokeOutwardExtent(o) : 0;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  if (isLegacyText(o) && o.rot && isFinite(o.rot) && (o.rot % 360) !== 0) {
    const t = legacyTextSpec(o);
    const th = -o.rot * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
    let nx0 = 1e18, ny0 = 1e18, nx1 = -1e18, ny1 = -1e18;
    for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
      const rx = t.x + (px - t.x) * c - (py - t.y) * s;
      const ry = t.y + (px - t.x) * s + (py - t.y) * c;
      if (rx < nx0) nx0 = rx; if (rx > nx1) nx1 = rx;
      if (ry < ny0) ny0 = ry; if (ry > ny1) ny1 = ry;
    }
    return [nx0, ny0, nx1, ny1];
  }
  return [x0, y0, x1, y1];
}

const isVisiblePaintColor = c => Boolean(c && c !== 'none' && c !== 'transparent');

const isIconFrameExportMember = o =>
  Boolean(o && !o.hidden && o.isIconFrame && o.group && !o.isFrameBg && !o.isAutoFrame && !o.img && !o.text && o.subs && o.subs.length);

/* Pengelompokan serializer untuk frame ikon (§5.4):
   Anggota frame ikon (isIconFrame) yang berbagi (group, iconSrc, fill, opacity,
   fillRule, grad) digabung menjadi SATU objek compound path agar lubang tetap
   transparan pada ekspor SVG, AI, EPS, maupun copy-paste ke Figma/Illustrator. */
export function mergeIconFramesForExport(objects) {
  if (!Array.isArray(objects) || !objects.length) return objects || [];
  let hasIconMember = false;
  for (let i = 0; i < objects.length; i++) {
    if (isIconFrameExportMember(objects[i])) {
      hasIconMember = true;
      break;
    }
  }
  if (!hasIconMember) return objects;

  const gradIds = new WeakMap();
  let gradN = 0;
  const gradKey = g => {
    if (!g) return 'nograd';
    let id = gradIds.get(g);
    if (!id) {
      id = 'g' + (++gradN);
      gradIds.set(g, id);
    }
    return id;
  };
  const strokeSig = m => {
    const sg = strokeGradOn(m) ? m.strokeGrad : null;
    const hasS = Boolean(sg || (isVisiblePaintColor(m.stroke) && m.strokeWidth > 0));
    if (!hasS) return '';
    return [
      m.stroke ?? '',
      m.strokeWidth ?? 0,
      m.strokeLinejoin || 'round',
      m.strokeLinecap || 'round',
      m.strokeMiterlimit ?? '',
      m.nonScalingStroke ? 1 : 0,
      m.paintOrder || '',
      gradKey(sg),
      m.strokeStyleId || '',
      m.strokeAlign || 'center',
      formatDasharray(m.strokeDasharray),
      m.strokeDashoffset ?? '',
      normalizeBlendMode(m.blendMode)
    ].join('\u0000');
  };

  // Kumpulkan grup fill per (frameGroup, iconSrc, fill, opacity, fillRule, grad, blendMode, strokeAlign)
  const fillGroups = new Map();
  const memberToGroup = new Map();
  for (let i = 0; i < objects.length; i++) {
    const m = objects[i];
    if (!isIconFrameExportMember(m)) continue;
    const grad = gradOn(m) ? m.grad : null;
    if (!grad && !isVisiblePaintColor(m.fill)) continue;
    const src = m.iconSrc || m.id;
    const key = [
      m.group,
      src,
      m.fill ?? '',
      m.opacity ?? 1,
      m.fillRule || 'nonzero',
      gradKey(grad),
      normalizeBlendMode(m.blendMode),
      m.strokeAlign || 'center'
    ].join('\u0000');
    let g = fillGroups.get(key);
    if (!g) {
      g = { key, members: [], emitted: false };
      fillGroups.set(key, g);
    }
    g.members.push(m);
    memberToGroup.set(m, g);
  }

  const out = [];
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];
    const g = memberToGroup.get(o);
    if (!g) {
      out.push(o);
      continue;
    }
    if (g.emitted) continue;
    g.emitted = true;
    if (g.members.length === 1) {
      out.push(g.members[0]);
      continue;
    }
    const first = g.members[0];
    const mergedSubs = [];
    for (let j = 0; j < g.members.length; j++) {
      const ms = g.members[j].subs;
      if (ms) for (let k = 0; k < ms.length; k++) mergedSubs.push(ms[k]);
    }
    const firstStroke = strokeSig(first);
    let uniformStroke = true;
    for (let j = 1; j < g.members.length; j++) {
      if (strokeSig(g.members[j]) !== firstStroke) {
        uniformStroke = false;
        break;
      }
    }
    if (uniformStroke) {
      out.push({ ...first, subs: mergedSubs });
    } else {
      out.push({
        ...first,
        subs: mergedSubs,
        stroke: 'none',
        strokeWidth: 0,
        strokeGrad: null,
        strokeStyleId: undefined
      });
      for (let j = 0; j < g.members.length; j++) {
        const m = g.members[j];
        if (strokeSig(m)) {
          out.push({
            ...m,
            fill: 'none',
            grad: null,
            fillStyleId: undefined
          });
        }
      }
    }
  }
  return out;
}

function serializeDoc(doc, opt: Record<string, any> = {}) {
  const {objects: rawObjects, bounds: [ox, oy, vw, vh]} = resolveExportArea(doc, opt);
  const objects = mergeIconFramesForExport(rawObjects);
  let body = '', open = null, hasImg = false, gdefs = '', gn = 0;
  /* Efek (Task 8): defs <filter> didedup per id stabil; dua objek dengan
     efek identik berbagi satu def. */
  const fxDefs = new Map();
  const fxAttrs = o => {
    if (!o.effects || !o.effects.length) return '';
    const bbox = effectBbox(o);
    const id = effectsFilterId(o.effects, bbox);
    if (id && !fxDefs.has(id)) fxDefs.set(id, effectsFilterDefs(o.effects, id, bbox));
    return ' data-effects="' + esc(JSON.stringify(o.effects)) + '"' + (id ? ' filter="url(#' + id + ')"' : '');
  };
  const dashAttrs = o => {
    if (hasVisibleStroke(o) && o.strokeDasharray && o.strokeDasharray.length) {
      const fd = formatDasharray(o.strokeDasharray);
      if (!fd) return '';
      const s = ' stroke-dasharray="' + fd + '"';
      return s + (o.strokeDashoffset ? ' stroke-dashoffset="' + rd(o.strokeDashoffset) + '"' : '');
    }
    return '';
  };
  const blendStyleAttr = o => {
    const bm = normalizeBlendMode(o.blendMode);
    return bm !== 'normal' ? ' style="mix-blend-mode:' + bm + ';"' : '';
  };
  const used = new Set(), gseen = new Set();
  const uq = b => {
    b = String(b || 'path').replace(/[^\w\-.:]/g, '-');
    if (!/^[A-Za-z_]/.test(b)) b = 'id-' + b;
    let k = b,
      i = 2;
    while (used.has(k)) k = b + '-' + i++;
    used.add(k);
    return k;
  };
  const r6 = v => Math.round(v * 1e6) / 1e6;
  if (opt.bg && opt.bg.mode === 'solid') body += '<rect x="0" y="0" width="' + vw + '" height="' + vh + '" fill="' + esc(opt.bg.color || '#ffffff') + '"/>';
  objects.forEach(o => {
    if ((o.isFrameBg || o.isAutoFrame) && !isVisibleFrameBg(o)) return;
    if (o.group !== open) {
      if (open) body += '</g>';
      if (o.group) {
        const isF = o.containerType === 'frame' || o.isAutoFrame || o.isFrameBg || /^frame/i.test(o.group);
        const gOp = o.groupOpacity != null && o.groupOpacity < 1 ? ' opacity="' + rd(o.groupOpacity) + '"' : '';
        body += '<g' + (gseen.has(o.group) ? '' : ' id="' + esc(o.group) + '"') + (isF ? ' data-container="frame"' : '') + gOp + '>';
        gseen.add(o.group);
      }
      open = o.group;
    }
    if (o.img) {
      const m = imageMatrix(o);
      if (!m || !isSafeImageHref(o.img.href)) return;
      hasImg = true;
      const mS = [m[0], m[1], m[2], m[3], m[4] - ox, m[5] - oy];
      body += '<image id="' + uq(o.name) + '" data-id="' + esc(o.id) + '" href="' + esc(o.img.href) + '" xlink:href="' + esc(o.img.href) + '" x="0" y="0" width="' + r6(o.img.w) + '" height="' + r6(o.img.h) + '" preserveAspectRatio="' + esc(o.img.par || 'xMidYMid meet') + '" image-rendering="optimizeQuality" transform="matrix(' + mS.map(r6).join(' ') + ')"' + ((o.opacity ?? 1) !== 1 ? ' opacity="' + rd(o.opacity) + '"' : '') + blendStyleAttr(o) + fxAttrs(o) + '/>';
      return;
    }
    if (isLegacyText(o)) {
      const t = legacyTextSpec(o);
      if (!t?.content) return;
      const display = applyTextCase(t.content, t.textCase);
      const lines = display.split(/\r?\n/);
      const spans = lines.map((line, index) => '<tspan x="' + r6(t.x - ox) + '"' + (index ? ' dy="' + r6(t.fontSize * t.lineHeight + (t.paragraphSpacing || 0)) + '"' : '') + '>' + esc(line).replace(/>/g, '&gt;') + '</tspan>').join('');
      const lsAttr = t.letterSpacing ? ' letter-spacing="' + r6(t.letterSpacing) + '"' : '';
      const decAttr = t.textDecoration === 'underline' ? ' text-decoration="underline"' : t.textDecoration === 'strikethrough' ? ' text-decoration="line-through"' : '';
      const rotAttr = o.rot ? ' transform="rotate(' + r6(-o.rot) + ' ' + r6(t.x - ox) + ' ' + r6(t.y - oy) + ')"' : '';
      let textFillA = esc(t.fill);
      if (gradOn(o)) {
        const gid = 'grad-' + ++gn;
        gdefs += gradXml(o.grad, gid, ox, oy);
        textFillA = 'url(#' + gid + ')';
      }
      body += '<text id="' + uq(o.name || o.id || 'text') + '" data-id="' + esc(o.id) + '"' + (o.fillStyleId ? ' data-fill-style="' + esc(o.fillStyleId) + '"' : '') + ' x="' + r6(t.x - ox) + '" y="' + r6(t.y - oy) + '" font-size="' + r6(t.fontSize) + '" font-family="' + esc(t.fontFamily) + '" font-weight="' + esc(t.fontWeight) + '" font-style="' + esc(t.fontStyle) + '" text-anchor="' + esc(t.textAnchor === 'justify' ? 'start' : t.textAnchor) + '"' + lsAttr + decAttr + rotAttr + ' fill="' + textFillA + '" opacity="' + r6(t.opacity) + '"' + blendStyleAttr(o) + fxAttrs(o) + '>' + spans + '</text>';
      return;
    }
    let fillA = esc(o.fill === 'transparent' || !o.fill ? 'none' : o.fill);
    if (gradOn(o)) {
      const gid = 'grad-' + ++gn;
      gdefs += gradXml(o.grad, gid, ox, oy);
      fillA = 'url(#' + gid + ')';
    }
    const strokeVisible = hasVisibleStroke(o);
    let strokeA = esc(o.stroke === 'transparent' || !o.stroke ? 'none' : o.stroke);
    if (strokeGradOn(o)) {
      const sgid = 'sgrad-' + ++gn;
      gdefs += gradXml(o.strokeGrad, sgid, ox, oy);
      strokeA = 'url(#' + sgid + ')';
    }

    const align = effectiveStrokeAlign(o);
    if (align === 'center' || !strokeVisible) {
      body += '<path id="' + uq(o.name) + '" data-id="' + esc(o.id) + '"' + (o.gen ? ' data-gen="' + esc(JSON.stringify(o.gen)) + '"' : '') + (o.fillStyleId ? ' data-fill-style="' + esc(o.fillStyleId) + '"' : '') + (o.strokeStyleId ? ' data-stroke-style="' + esc(o.strokeStyleId) + '"' : '') + ' fill="' + fillA + '"' + (strokeVisible ? ' stroke="' + strokeA + '" stroke-width="' + rd(o.strokeWidth) + '" stroke-linejoin="' + esc(o.strokeLinejoin || 'round') + '" stroke-linecap="' + esc(o.strokeLinecap || 'round') + '"' + (o.strokeMiterlimit ? ' stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"' : '') + (o.nonScalingStroke ? ' vector-effect="non-scaling-stroke"' : '') + dashAttrs(o) : '') + (o.paintOrder ? ' paint-order="' + esc(o.paintOrder) + '"' : '') + ((o.opacity ?? 1) !== 1 ? ' opacity="' + rd(o.opacity) + '"' : '') + blendStyleAttr(o) + (o.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '') + ' d="' + serializePath(o, ox, oy) + '"' + fxAttrs(o) + '/>';
    } else {
      const closedSubs = (o.subs || []).filter(sp => sp.closed);
      const openSubs = (o.subs || []).filter(sp => !sp.closed);
      const origD = serializePath(o, ox, oy);
      const closedOrigD = closedSubs.map(sp => serializeSub(sp, ox, oy)).join(' ');

      const fillEl = '<path data-geovanta-role="fill" fill="' + fillA + '"' + (o.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '') + ' stroke="none" d="' + origD + '"/>';

      let strokeClosedEl = '';
      const isDashed = parseDasharray(o.strokeDasharray) != null;
      if (!isDashed) {
        const exp = alignedStrokeOutlineSubs(o);
        if (exp.subs && !exp.fallback) {
          const expandedD = exp.subs.map(sp => serializeSub(sp, ox, oy)).join(' ');
          strokeClosedEl = '<path data-geovanta-role="stroke-outline" fill="' + strokeA + '" fill-rule="evenodd" stroke="none" d="' + expandedD + '"/>';
        }
      }
      if (!strokeClosedEl) {
        const commonAttrs = ' fill="none" stroke="' + strokeA + '" stroke-width="' + rd(o.strokeWidth * 2) + '" stroke-linejoin="' + esc(o.strokeLinejoin || 'round') + '" stroke-linecap="' + esc(o.strokeLinecap || 'round') + '"' + (o.strokeMiterlimit ? ' stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"' : '') + (o.nonScalingStroke ? ' vector-effect="non-scaling-stroke"' : '') + dashAttrs(o);
        if (align === 'inside') {
          const clipId = 'sa-clip-' + (++gn);
          gdefs += '<clipPath id="' + clipId + '"><path d="' + closedOrigD + '"' + (o.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '') + '/></clipPath>';
          strokeClosedEl = '<path data-geovanta-role="stroke-dashed"' + commonAttrs + ' clip-path="url(#' + clipId + ')" d="' + closedOrigD + '"/>';
        } else {
          let cbb = null;
          try { cbb = tightBBox({ subs: closedSubs }); } catch (e) { cbb = null; }
          if (!cbb || !cbb.every(v => Number.isFinite(v))) cbb = [0, 0, 100, 100];
          const mPad = (o.strokeWidth || 1) * (o.strokeMiterlimit || 4) + 8;
          const mx = cbb[0] - mPad, my = cbb[1] - mPad, mw = Math.max(1, (cbb[2] - cbb[0]) + mPad * 2), mh = Math.max(1, (cbb[3] - cbb[1]) + mPad * 2);
          const maskId = 'sa-mask-' + (++gn);
          gdefs += '<mask id="' + maskId + '" maskUnits="userSpaceOnUse" x="' + rd(mx - ox) + '" y="' + rd(my - oy) + '" width="' + rd(mw) + '" height="' + rd(mh) + '"><rect x="' + rd(mx - ox) + '" y="' + rd(my - oy) + '" width="' + rd(mw) + '" height="' + rd(mh) + '" fill="#ffffff"/><path d="' + closedOrigD + '" fill="#000000"' + (o.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '') + '/></mask>';
          strokeClosedEl = '<path data-geovanta-role="stroke-dashed"' + commonAttrs + ' mask="url(#' + maskId + ')" d="' + closedOrigD + '"/>';
        }
      }

      let strokeEl = strokeClosedEl;
      if (openSubs.length > 0) {
        const openD = openSubs.map(sp => serializeSub(sp, ox, oy)).join(' ');
        const openEl = '<path data-geovanta-role="stroke-open" fill="none" stroke="' + strokeA + '" stroke-width="' + rd(o.strokeWidth) + '" stroke-linejoin="' + esc(o.strokeLinejoin || 'round') + '" stroke-linecap="' + esc(o.strokeLinecap || 'round') + '"' + (o.strokeMiterlimit ? ' stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"' : '') + (o.nonScalingStroke ? ' vector-effect="non-scaling-stroke"' : '') + dashAttrs(o) + ' d="' + openD + '"/>';
        strokeEl = strokeClosedEl + openEl;
      }

      let wrapperAttrs = ' data-stroke-width="' + rd(o.strokeWidth) + '" data-stroke-linecap="' + esc(o.strokeLinecap || 'round') + '" data-stroke-linejoin="' + esc(o.strokeLinejoin || 'round') + '"';
      if (o.strokeMiterlimit && Number.isFinite(o.strokeMiterlimit)) wrapperAttrs += ' data-stroke-miterlimit="' + rd(o.strokeMiterlimit) + '"';
      if (o.paintOrder) wrapperAttrs += ' data-paint-order="' + esc(o.paintOrder) + '"';
      const fDash = formatDasharray(o.strokeDasharray);
      if (fDash) wrapperAttrs += ' data-stroke-dasharray="' + esc(fDash) + '"';
      if (o.strokeDashoffset && Number.isFinite(o.strokeDashoffset)) wrapperAttrs += ' data-stroke-dashoffset="' + rd(o.strokeDashoffset) + '"';
      if (o.nonScalingStroke) wrapperAttrs += ' data-non-scaling-stroke="true"';
      if (o.fillStyleId) wrapperAttrs += ' data-fill-style="' + esc(o.fillStyleId) + '"';
      if (o.strokeStyleId) wrapperAttrs += ' data-stroke-style="' + esc(o.strokeStyleId) + '"';
      if (o.gen) wrapperAttrs += ' data-gen="' + esc(JSON.stringify(o.gen)) + '"';
      if ((o.opacity ?? 1) !== 1) wrapperAttrs += ' opacity="' + rd(o.opacity) + '"';
      wrapperAttrs += blendStyleAttr(o);
      wrapperAttrs += fxAttrs(o);

      if (o.paintOrder === 'stroke fill') {
        body += '<g id="' + uq(o.name) + '" data-id="' + esc(o.id) + '" data-geovanta-stroke-align="' + align + '"' + wrapperAttrs + '>' + strokeEl + fillEl + '</g>';
      } else {
        body += '<g id="' + uq(o.name) + '" data-id="' + esc(o.id) + '" data-geovanta-stroke-align="' + align + '"' + wrapperAttrs + '>' + fillEl + strokeEl + '</g>';
      }
    }
  });
  if (open) body += '</g>';
  /* Color Styles (Task 2): daftar style dokumen sebagai metadata JSON,
     tepat sesudah tag <svg> pembuka; hanya bila ada style. Parser membaca
     kembali via parseDocStyles; esc() membuat " menjadi &quot; di teks
     mentah, didekode kembali oleh textContent saat parse. */
  const meta = doc.styles && doc.styles.length ? '<metadata id="geovanta-doc">' + esc(JSON.stringify({ styles: doc.styles })) + '</metadata>' : '';
  /* Efek (Task 8): defs <filter> digabung ke <defs> yang sama dengan
     gradien (didedup per id oleh fxDefs). */
  const allDefs = gdefs + [...fxDefs.values()].join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"' + (hasImg ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : '') + ' version="1.1" width="' + vw + '" height="' + vh + '" viewBox="0 0 ' + vw + ' ' + vh + '" shape-rendering="geometricPrecision">' + meta + (allDefs ? '<defs>' + allDefs + '</defs>' : '') + body + '</svg>';
}

/* ---- operasi geometri (semua immutable) ---- */

export { serializeDoc };
export default serializeDoc;
