/**
 * @file src/engine/charts/chartV2Helpers.ts
 * @description ECharts Vector Studio v2 helpers: TSV/CSV normalization, Color Styles palette sync, and detached vector node optimizer.
 */

export function parseTsvOrCsvText(raw: string): string {
  const lines = String(raw || '').trim().split(/\r?\n/);
  return lines
    .map(line => {
      if (line.includes('\t')) {
        return line.split('\t').map(cell => cell.trim()).join(',');
      }
      if (line.includes(';') && !line.includes(',')) {
        return line.split(';').map(cell => cell.trim()).join(',');
      }
      return line.trim();
    })
    .join('\n');
}

export function syncChartPaletteFromColorStyles(config: any, docStyles: any[]) {
  const colors = (Array.isArray(docStyles) ? docStyles : [])
    .map(s => s && (s.color || s.hex))
    .filter((c): c is string => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.trim()));
  if (!colors.length) return config;
  return {
    ...config,
    palette: colors,
    paletteSyncedFromStyles: true,
  };
}

export function optimizeDetachedChartObjects(objects: any[], tolerance = 0.25): { objects: any[]; removedNodes: number } {
  let removedNodes = 0;
  const nextObjects = (objects || []).map(o => {
    if (!o || !Array.isArray(o.subs)) return o;
    const nextSubs = o.subs.map((sp: any) => {
      const nodes: any[] = sp?.nodes || [];
      if (nodes.length <= 2) return sp;
      const kept: any[] = [nodes[0]];
      for (let i = 1; i < nodes.length - 1; i++) {
        const prev = kept[kept.length - 1];
        const cur = nodes[i];
        const nxt = nodes[i + 1];
        const hasHandles = Boolean(cur.handleIn || cur.handleOut || prev.handleOut || nxt.handleIn);
        if (hasHandles) {
          kept.push(cur);
          continue;
        }
        const dx = nxt.x - prev.x;
        const dy = nxt.y - prev.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) {
          removedNodes++;
          continue;
        }
        const distPerp = Math.abs(dy * cur.x - dx * cur.y + nxt.x * prev.y - nxt.y * prev.x) / len;
        if (distPerp <= tolerance) {
          removedNodes++;
        } else {
          kept.push(cur);
        }
      }
      kept.push(nodes[nodes.length - 1]);
      return { ...sp, nodes: kept };
    });
    return { ...o, subs: nextSubs };
  });
  return { objects: nextObjects, removedNodes };
}
