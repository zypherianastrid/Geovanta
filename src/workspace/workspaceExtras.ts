/**
 * @file src/workspace/workspaceExtras.ts
 * @description Project Tags, Folder Organization, and Custom User Templates (100% localStorage/offline).
 */

const TAGS_KEY = 'geovanta-project-tags-v1';
const TEMPLATES_KEY = 'geovanta-custom-templates-v1';

export interface CustomTemplate {
  id: string;
  name: string;
  createdAt: number;
  doc: any;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, val: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota errors
  }
}

export const WorkspaceExtras = {
  getProjectTags(projectId: string): string[] {
    const map = readJson<Record<string, string[]>>(TAGS_KEY, {});
    return Array.isArray(map[projectId]) ? map[projectId] : [];
  },

  setProjectTags(projectId: string, tags: string[]): string[] {
    const clean = Array.from(new Set((tags || []).map(t => String(t).trim()).filter(Boolean)));
    const map = readJson<Record<string, string[]>>(TAGS_KEY, {});
    map[projectId] = clean;
    writeJson(TAGS_KEY, map);
    return clean;
  },

  filterProjectsByTag<T extends { id: string }>(projects: T[], tag: string): T[] {
    const q = String(tag || '').trim().toLowerCase();
    if (!q) return projects;
    const map = readJson<Record<string, string[]>>(TAGS_KEY, {});
    return (projects || []).filter(p => (map[p.id] || []).some(t => t.toLowerCase() === q));
  },

  listCustomTemplates(): CustomTemplate[] {
    return readJson<CustomTemplate[]>(TEMPLATES_KEY, []);
  },

  saveCustomTemplate(name: string, doc: any): CustomTemplate {
    const list = this.listCustomTemplates();
    const tpl: CustomTemplate = {
      id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: String(name || 'Custom Template').trim(),
      createdAt: Date.now(),
      doc: JSON.parse(JSON.stringify(doc || { viewBox: [0, 0, 800, 600], objects: [] })),
    };
    writeJson(TEMPLATES_KEY, [tpl, ...list]);
    return tpl;
  },

  deleteCustomTemplate(id: string): void {
    const list = this.listCustomTemplates().filter(t => t.id !== id);
    writeJson(TEMPLATES_KEY, list);
  },
};
