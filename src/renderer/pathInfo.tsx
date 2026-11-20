import { tightBBox } from '../engine/spatialIndexAndHitTest.tsx';
import { serializePath } from '../engine/svgPathSerializer.tsx';
import { gradOn } from '../engine/gradientEngine.tsx';
import { VINFO } from './subpathBBox.tsx';
import { isLegacyText } from '../engine/legacyText.tsx';

const GEOM_INFO = new WeakMap();

const vinfo = o => {
  if (isLegacyText(o)) {
    const bb = tightBBox(o);
    return {bb, n: 0, d: ''};
  }
  let r = VINFO.get(o);
  if (r) return r;
  const subs = o.subs;
  if (subs && typeof subs === 'object') {
    r = GEOM_INFO.get(subs);
    if (r) {
      VINFO.set(o, r);
      return r;
    }
  }
  const bb = tightBBox(o);
  let nCnt = 0;
  if (Array.isArray(subs)) {
    for (let i = 0, L = subs.length; i < L; i++) nCnt += subs[i].nodes.length;
  }
  let _d, _p2;
  r = {
    bb,
    n: nCnt,
    get d() {
      if (_d === undefined) _d = serializePath(o);
      return _d;
    },
    get p2() {
      if (_p2 === undefined) {
        try {
          _p2 = new Path2D(r.d);
        } catch (e) {
          _p2 = null;
        }
      }
      return _p2;
    }
  };
  VINFO.set(o, r);
  if (subs && typeof subs === 'object') GEOM_INFO.set(subs, r);
  return r;
};
const isOpaquePaint = o => (o.opacity ?? 1) >= 0.999 && (gradOn(o) ? (o.grad.stops || []).every(s => (s.op ?? 1) >= 0.999) : !/^rgba\(/i.test(o.fill || ''));

export { vinfo, isOpaquePaint };
