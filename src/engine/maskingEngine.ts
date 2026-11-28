/**
 * @file src/engine/maskingEngine.ts
 * @description Pure functions for Clipping Mask creation and release on VectorDocument.
 */
import { serializePath } from './svgPathSerializer.tsx';

export interface MaskResult {
  doc: any;
  changed: boolean;
  maskedIds: string[];
  releasedIds?: string[];
}

export function makeClippingMaskDoc(doc: any, selIds: Set<string> | string[]): MaskResult {
  const idSet = selIds instanceof Set ? selIds : new Set(selIds || []);
  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const selected = objects.filter(o => idSet.has(o.id) && !o.hidden && !o.locked);
  if (selected.length < 2) {
    return { doc, changed: false, maskedIds: [] };
  }

  // Top-most vector path with subs acts as the clipping mask
  let maskIdx = -1;
  for (let i = selected.length - 1; i >= 0; i--) {
    const o = selected[i];
    if (o.subs && o.subs.length && !o.img && !o.text) {
      maskIdx = i;
      break;
    }
  }
  if (maskIdx === -1) {
    return { doc, changed: false, maskedIds: [] };
  }

  const maskObj = selected[maskIdx];
  const clipPathD = serializePath(maskObj, 0, 0);
  if (!clipPathD) {
    return { doc, changed: false, maskedIds: [] };
  }

  const maskedIds: string[] = [];
  const nextObjects: any[] = [];
  let attachedSource = false;

  for (const o of objects) {
    if (o.id === maskObj.id) {
      continue;
    }
    if (idSet.has(o.id)) {
      maskedIds.push(o.id);
      const patch: any = {
        ...o,
        clipPathD,
        clipRule: maskObj.fillRule || 'nonzero',
      };
      if (!attachedSource) {
        patch.maskSourceObj = { ...maskObj };
        attachedSource = true;
      }
      nextObjects.push(patch);
    } else {
      nextObjects.push(o);
    }
  }

  return {
    doc: { ...doc, objects: nextObjects },
    changed: maskedIds.length > 0,
    maskedIds,
  };
}

export function releaseClippingMaskDoc(doc: any, selIds: Set<string> | string[]): MaskResult {
  const idSet = selIds instanceof Set ? selIds : new Set(selIds || []);
  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : [];
  const releasedIds: string[] = [];
  const restoredMasks: any[] = [];
  const existingIds = new Set(objects.map(o => o.id));

  const nextObjects = objects.map(o => {
    if (!idSet.has(o.id) || !o.clipPathD) return o;
    releasedIds.push(o.id);
    if (o.maskSourceObj && o.maskSourceObj.id && !existingIds.has(o.maskSourceObj.id)) {
      existingIds.add(o.maskSourceObj.id);
      restoredMasks.push({ ...o.maskSourceObj });
    }
    const copy = { ...o };
    delete copy.clipPathD;
    delete copy.clipRule;
    delete copy.maskSourceObj;
    return copy;
  });

  if (!releasedIds.length) {
    return { doc, changed: false, maskedIds: [], releasedIds: [] };
  }

  return {
    doc: { ...doc, objects: [...nextObjects, ...restoredMasks] },
    changed: true,
    maskedIds: [],
    releasedIds,
  };
}
