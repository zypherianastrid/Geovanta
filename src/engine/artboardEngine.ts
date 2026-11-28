/**
 * @file src/engine/artboardEngine.ts
 * @description Multi-artboard / multi-page document helpers with full backward compatibility for single-viewBox docs.
 */
import type { ArtboardSpec } from '../types/vectorTypes.ts';
import { uid, rd } from './vectorPrimitives.tsx';

export function ensureArtboards(doc: any): ArtboardSpec[] {
  if (Array.isArray(doc?.artboards) && doc.artboards.length > 0) {
    return doc.artboards;
  }
  const vb = Array.isArray(doc?.viewBox) && doc.viewBox.length >= 4 ? doc.viewBox : [0, 0, 800, 600];
  return [{
    id: 'ab-1',
    name: 'Artboard 1',
    x: Number(vb[0]) || 0,
    y: Number(vb[1]) || 0,
    width: Math.max(32, Number(vb[2]) || 800),
    height: Math.max(32, Number(vb[3]) || 600),
  }];
}

export function addArtboardDoc(doc: any, spec: Partial<ArtboardSpec> = {}): { doc: any; artboard: ArtboardSpec } {
  const existing = ensureArtboards(doc);
  const last = existing[existing.length - 1];
  const maxRight = existing.reduce((m, ab) => Math.max(m, ab.x + ab.width), 0);
  const w = Math.max(32, Number(spec.width) || last.width || 800);
  const h = Math.max(32, Number(spec.height) || last.height || 600);
  const ab: ArtboardSpec = {
    id: spec.id || ('ab-' + uid()),
    name: spec.name || `Artboard ${existing.length + 1}`,
    x: spec.x != null ? rd(spec.x) : rd(maxRight + 80),
    y: spec.y != null ? rd(spec.y) : rd(last.y || 0),
    width: rd(w),
    height: rd(h),
  };
  const nextArtboards = [...existing, ab];
  return {
    doc: {
      ...doc,
      artboards: nextArtboards,
      activeArtboardId: ab.id,
      viewBox: [ab.x, ab.y, ab.width, ab.height],
    },
    artboard: ab,
  };
}

export function setActiveArtboardDoc(doc: any, id: string): any {
  const existing = ensureArtboards(doc);
  const found = existing.find(ab => ab.id === id);
  if (!found) return doc;
  return {
    ...doc,
    artboards: existing,
    activeArtboardId: found.id,
    viewBox: [found.x, found.y, found.width, found.height],
  };
}

export function deleteArtboardDoc(doc: any, id: string): any {
  const existing = ensureArtboards(doc);
  if (existing.length <= 1) return doc;
  const next = existing.filter(ab => ab.id !== id);
  const active = next.find(ab => ab.id === doc.activeArtboardId) || next[0];
  return {
    ...doc,
    artboards: next,
    activeArtboardId: active.id,
    viewBox: [active.x, active.y, active.width, active.height],
  };
}
