/**
 * @file src/engine/componentSymbolEngine.ts
 * @description Reusable Components / Symbols, Instance Overrides, Text Styles, and Effect Styles.
 */
import { uid } from './vectorPrimitives.tsx';
import { translate } from './bezierSubdivisionAndMove.tsx';

export interface ComponentDef {
  id: string;
  name: string;
  masterObjId: string;
  template: any;
}

export function createComponentMasterDoc(doc: any, objId: string, name?: string) {
  const objects: any[] = doc?.objects || [];
  const idx = objects.findIndex(o => o.id === objId);
  if (idx === -1) return { doc, changed: false, component: null };
  const target = objects[idx];
  const compId = 'cmp-' + uid();
  const comp: ComponentDef = {
    id: compId,
    name: name || target.name || 'Component',
    masterObjId: target.id,
    template: JSON.parse(JSON.stringify(target)),
  };
  const nextObjects = objects.slice();
  nextObjects[idx] = { ...target, componentMasterId: compId };
  return {
    doc: {
      ...doc,
      components: [...(doc.components || []), comp],
      objects: nextObjects,
    },
    changed: true,
    component: comp,
  };
}

export function instantiateComponentDoc(doc: any, componentId: string, dx = 40, dy = 40) {
  const comp = (doc?.components || []).find((c: any) => c.id === componentId);
  if (!comp || !comp.template) return { doc, changed: false, instanceId: null };
  let inst = JSON.parse(JSON.stringify(comp.template));
  inst.id = uid();
  inst.name = `${comp.name} Instance`;
  delete inst.componentMasterId;
  inst.componentInstanceOf = componentId;
  inst.overrides = {};
  inst = translate(inst, dx, dy);
  return {
    doc: { ...doc, objects: [...(doc.objects || []), inst] },
    changed: true,
    instanceId: inst.id,
  };
}

export function setInstanceOverrideDoc(doc: any, instanceId: string, propKey: string, value: any) {
  const objects: any[] = doc?.objects || [];
  const idx = objects.findIndex(o => o.id === instanceId);
  if (idx === -1) return { doc, changed: false };
  const o = objects[idx];
  const nextObj = {
    ...o,
    [propKey]: value,
    overrides: { ...(o.overrides || {}), [propKey]: value },
  };
  const nextObjects = objects.slice();
  nextObjects[idx] = nextObj;
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}

export function updateComponentMasterDoc(doc: any, componentId: string, patch: Record<string, any>) {
  const comps: ComponentDef[] = doc?.components || [];
  const cIdx = comps.findIndex(c => c.id === componentId);
  if (cIdx === -1) return { doc, changed: false };

  const nextComps = comps.slice();
  nextComps[cIdx] = {
    ...nextComps[cIdx],
    template: { ...nextComps[cIdx].template, ...patch },
  };

  const nextObjects = (doc.objects || []).map((o: any) => {
    if (o.componentMasterId === componentId) {
      return { ...o, ...patch };
    }
    if (o.componentInstanceOf === componentId) {
      const overrides = o.overrides || {};
      const filteredPatch: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (!(k in overrides)) filteredPatch[k] = v;
      }
      return { ...o, ...filteredPatch };
    }
    return o;
  });

  return {
    doc: { ...doc, components: nextComps, objects: nextObjects },
    changed: true,
  };
}

export function createTextStyleDoc(doc: any, name: string, stylePatch: Record<string, any>) {
  const style = { id: 'ts-' + uid(), name, ...stylePatch };
  return {
    doc: { ...doc, textStyles: [...(doc.textStyles || []), style] },
    changed: true,
    style,
  };
}

export function applyTextStyleDoc(doc: any, styleId: string, objIds: string[] | Set<string>) {
  const style = (doc?.textStyles || []).find((s: any) => s.id === styleId);
  if (!style) return { doc, changed: false };
  const idSet = objIds instanceof Set ? objIds : new Set(objIds);
  const { id: _id, name: _name, ...patch } = style;
  const nextObjects = (doc.objects || []).map((o: any) =>
    idSet.has(o.id) && (o.type === 'text' || o.text)
      ? { ...o, textStyleId: styleId, text: { ...(o.text || {}), ...patch } }
      : o
  );
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}

export function createEffectStyleDoc(doc: any, name: string, effects: any[]) {
  const style = { id: 'es-' + uid(), name, effects: JSON.parse(JSON.stringify(effects || [])) };
  return {
    doc: { ...doc, effectStyles: [...(doc.effectStyles || []), style] },
    changed: true,
    style,
  };
}

export function applyEffectStyleDoc(doc: any, styleId: string, objIds: string[] | Set<string>) {
  const style = (doc?.effectStyles || []).find((s: any) => s.id === styleId);
  if (!style) return { doc, changed: false };
  const idSet = objIds instanceof Set ? objIds : new Set(objIds);
  const nextObjects = (doc.objects || []).map((o: any) =>
    idSet.has(o.id)
      ? { ...o, effectStyleId: styleId, effects: JSON.parse(JSON.stringify(style.effects || [])) }
      : o
  );
  return { doc: { ...doc, objects: nextObjects }, changed: true };
}
