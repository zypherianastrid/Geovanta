/**
 * @file src/utils/debugLogger.tsx
 * @description Debugging Mode (developer): logger terpusat yang mencatat
 * fitur, fungsi, dan interaksi user saat mode AKTIF saja. Default MATI.
 * Tanpa dependensi React — bisa dites via node (loadSource esbuild).
 * Tidak mengirim apa pun ke jaringan; export hanya unduhan lokal.
 */
const DEBUG_CATEGORIES = ['tool', 'selection', 'pointer', 'canvas', 'edit', 'document', 'shortcut', 'error', 'perf'];
const MAX_DEBUG_ENTRIES = 1000;

let _seq = 0;
let _enabled = false;
let _paused = false;
const _entries = [];
const _listeners = new Set<() => void>();

const _nowIso = () => {
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
};
const _nowMs = () => {
  try {
    return typeof performance !== 'undefined' && performance.now ? Math.round(performance.now()) : Date.now();
  } catch (e) {
    return Date.now();
  }
};
const _notify = () => {
  _listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {}
  });
};
const _sanitizeCell = v => String(v == null ? '' : v).replace(/\|/g, '/').replace(/\r?\n/g, ' ');

const DEBUG_LOG = {
  log(category, action, fn, file, detail) {
    if (!_enabled || _paused) return null;
    const cat = DEBUG_CATEGORIES.includes(category) ? category : 'canvas';
    const entry = {
      seq: ++_seq,
      ts: _nowIso(),
      ms: _nowMs(),
      category: cat,
      action: String(action == null ? '' : action),
      fn: String(fn == null ? '' : fn),
      file: String(file == null ? '' : file),
      detail: String(detail == null ? '' : detail)
    };
    _entries.push(entry);
    while (_entries.length > MAX_DEBUG_ENTRIES) _entries.shift();
    _notify();
    return entry;
  },
  setEnabled(v) {
    const next = !!v;
    if (next === _enabled) return _enabled;
    if (next) {
      _enabled = true;
      DEBUG_LOG.log('canvas', 'debug-mode-on', 'setEnabled', 'src/utils/debugLogger.tsx', 'Debugging Mode AKTIF — pencatatan dimulai');
    } else {
      DEBUG_LOG.log('canvas', 'debug-mode-off', 'setEnabled', 'src/utils/debugLogger.tsx', 'Debugging Mode MATI — pencatatan berhenti');
      _enabled = false;
    }
    return _enabled;
  },
  isEnabled() {
    return _enabled;
  },
  setPaused(v) {
    _paused = !!v;
    return _paused;
  },
  isPaused() {
    return _paused;
  },
  clear() {
    _entries.length = 0;
    _notify();
  },
  getEntries() {
    return _entries.slice();
  },
  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    _listeners.add(fn);
    return () => {
      _listeners.delete(fn);
    };
  },
  toJSON() {
    return {
      app: 'Geovanta',
      feature: 'debugging-mode',
      version: 1,
      exportedAt: _nowIso(),
      enabled: _enabled,
      total: _entries.length,
      entries: _entries.slice()
    };
  },
  toMarkdown() {
    const lines = [];
    lines.push('# Geovanta Debug Log');
    lines.push('');
    lines.push('- Exported: ' + _nowIso());
    lines.push('- App: Geovanta (debugging-mode v1)');
    lines.push('- Entries: ' + _entries.length);
    lines.push('- Enabled saat export: ' + (_enabled ? 'ya' : 'tidak'));
    lines.push('');
    lines.push('## Entries');
    lines.push('');
    lines.push('| # | Time | Category | Action | Function | File | Detail |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    _entries.forEach(e => {
      lines.push('| ' + e.seq + ' | ' + _sanitizeCell(e.ts) + ' | ' + _sanitizeCell(e.category) + ' | ' + _sanitizeCell(e.action) + ' | ' + _sanitizeCell(e.fn) + ' | ' + _sanitizeCell(e.file) + ' | ' + _sanitizeCell(e.detail) + ' |');
    });
    lines.push('');
    lines.push('## Kode per entri');
    lines.push('');
    _entries.forEach(e => {
      lines.push('### #' + e.seq + ' — ' + e.action);
      lines.push('');
      lines.push('```js');
      lines.push('fn: ' + e.fn);
      lines.push('file: ' + e.file);
      lines.push('category: ' + e.category);
      lines.push('detail: ' + e.detail);
      lines.push('ts: ' + e.ts);
      lines.push('```');
      lines.push('');
    });
    return lines.join('\n');
  },
  download(format) {
    if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') return null;
    const isMd = format === 'md' || format === 'markdown';
    const stamp = _nowIso().replace(/[-:T]/g, '').slice(0, 14);
    const filename = 'geovanta-debug-log-' + stamp + (isMd ? '.md' : '.json');
    const content = isMd ? DEBUG_LOG.toMarkdown() : JSON.stringify(DEBUG_LOG.toJSON(), null, 2);
    try {
      const blob = new Blob([content], { type: isMd ? 'text/markdown' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return filename;
    } catch (e) {
      return null;
    }
  }
};

/* Konsol Fungsi (Pendekatan A): turunkan "apa yang berubah" (prev -> next)
   dari dua entri log berurutan. Murni, tanpa state — bisa dites via node. */
function describeDebugChange(prev, cur) {
  if (!prev || !cur) return null;
  if (cur.action === 'debug-mode-on') return 'mode: MATI → AKTIF';
  if (cur.action === 'debug-mode-off') return 'mode: AKTIF → MATI';
  if (cur.category === 'pointer') return null;
  const toolM = String(cur.detail || '').match(/^tool (.+) -> (.+)$/);
  if (toolM) return 'tool: ' + toolM[1] + ' → ' + toolM[2];
  const zoomCur = String(cur.action || '').match(/^zoom:(\d+)%$/),
    zoomPrev = String(prev.action || '').match(/^zoom:(\d+)%$/);
  if (zoomCur && zoomPrev && zoomCur[1] !== zoomPrev[1]) return 'zoom: ' + zoomPrev[1] + '% → ' + zoomCur[1] + '%';
  const selCur = String(cur.action || '').match(/^select:(\d+) objek$/),
    selPrev = String(prev.action || '').match(/^select:(\d+) objek$/);
  if (selCur && selPrev && selCur[1] !== selPrev[1]) return 'seleksi: ' + selPrev[1] + ' → ' + selCur[1] + ' objek';
  const histCur = String(cur.detail || '').match(/hist p=(\d+)\/(\d+)/),
    histPrev = String(prev.detail || '').match(/hist p=(\d+)\/(\d+)/);
  if (histCur && histPrev && histCur[1] !== histPrev[1]) return 'histori: p=' + histPrev[1] + ' → p=' + histCur[1];
  const editM = String(cur.action || '').match(/^text-edit-open:(.+)$/);
  if (editM) return 'edit teks: ' + editM[1];
  if (cur.action === 'export-svg' || String(cur.action || '').indexOf('import:') === 0) return String(cur.action);
  return null;
}
function getActiveFunction(entries) {
  if (!Array.isArray(entries) || !entries.length) return null;
  return entries[entries.length - 1];
}

if (typeof window !== 'undefined') {
  window.geovantaDebug = {
    enable: () => DEBUG_LOG.setEnabled(true),
    disable: () => DEBUG_LOG.setEnabled(false),
    toggle: () => DEBUG_LOG.setEnabled(!DEBUG_LOG.isEnabled()),
    log: (category, action, fn, file, detail) => DEBUG_LOG.log(category, action, fn, file, detail),
    getEntries: () => DEBUG_LOG.getEntries(),
    toJSON: () => DEBUG_LOG.toJSON(),
    toMarkdown: () => DEBUG_LOG.toMarkdown(),
    download: format => DEBUG_LOG.download(format),
    clear: () => DEBUG_LOG.clear()
  };
}

export { DEBUG_CATEGORIES, MAX_DEBUG_ENTRIES, DEBUG_LOG, describeDebugChange, getActiveFunction };
export default DEBUG_LOG;
