// Spatial index entries carry document order, so the renderer can skip distant
// objects without changing stacking order. The original bbox of a dragged
// object is queried at the inverse drag offset.
export function visibleSceneObjects(index, view, drag = null, currentObjects = null) {
  if (!index) return null;
  const pad = Math.max(index.maxRenderPad || 2,
    (index.maxNonScalingStrokePad || 0) / (view.zoom || 1),
    4
  );
  const cull = view.cullRect || view;
  const query = (dx, dy) => index.queryObjectsInRect(
    cull.x - dx - pad, cull.y - dy - pad,
    cull.x + cull.width - dx + pad, cull.y + cull.height - dy + pad
  );
  const moving = drag?.ids;
  const entries = moving?.size
    ? [...query(0, 0).filter(entry => !moving.has(entry.o.id)),
       ...query(drag.dx || 0, drag.dy || 0).filter(entry => moving.has(entry.o.id))]
    : query(0, 0);
  if (moving?.size) entries.sort((a, b) => a.order - b.order);
  return entries.map(entry => {
    if (currentObjects && entry.order < currentObjects.length && currentObjects[entry.order]?.id === entry.o.id) {
      return currentObjects[entry.order];
    }
    return entry.o;
  });
}
