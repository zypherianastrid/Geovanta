/**
 * @file src/bridge/aiLiveConnector.tsx
 * @description Geovanta AI Live Bridge - Real-time WebSocket & Serverless Cloud HTTP Bridge (/mcp/bridge)
 * Exposes window.__GEOVANTA_AI_BRIDGE__ and orchestrates Workspace, Project, Canvas, Layer, Text, Iconify & View actions.
 */

export type AiConnectionStatus = 'offline' | 'connecting' | 'connected';

export interface AppBridgeHandlers {
  getScreen: () => string;
  getProjectId: () => string | null;
  getProjectName?: () => string | null;
  openNewProject: (name?: string, w?: number, h?: number, bg?: string) => Promise<string>;
  openProject: (projectId: string) => Promise<boolean | void>;
  listProjects?: () => Promise<any[]>;
  renameProject?: (projectId: string | null, newName: string) => Promise<any>;
  duplicateProject?: (projectId: string, newName?: string) => Promise<any>;
  toggleFavorite?: (projectId: string) => Promise<any>;
  trashProject?: (projectId: string) => Promise<any>;
  restoreProject?: (projectId: string) => Promise<any>;
  deleteProject?: (projectId: string) => Promise<any>;
  backToWorkspace?: () => Promise<any>;
  openSettings?: (open?: boolean) => void;
  setTheme?: (opts: { theme?: string; accent?: string }) => void;
  notifyWorkspaceChanged?: () => void;
}

export interface EditorBridgeHandlers {
  commit: (nextDoc: any, description?: string) => void;
  getDoc: () => any;
  setDoc: (doc: any) => void;
  setSelection: (ids: string[]) => void;
  getSelection?: () => string[];
  exportSvg?: (options?: any) => any;
  undo?: () => void;
  redo?: () => void;
  setTool?: (tool: string) => void;
  getTool?: () => string;
  setZoom?: (zoom: number) => void;
  getZoom?: () => number;
  setArtboard?: (opts: { width?: number; height?: number; bg?: string }) => void;
  insertIconify?: (iconName: string, opts?: any) => Promise<any>;
  createText?: (opts: any) => Promise<any>;
  simplifyCurves?: (opts: { level?: number; tolerance?: number }) => any;
  booleanOperation?: (opts: { op: string }) => any;
  cornerFillet?: (opts: { radius: number; mode?: string }) => any;
}

export interface CanvasMutationParams {
  action?: string;
  objects?: any[];
  replaceAll?: boolean;
  description?: string;
}

export class AiLiveConnector {
  private ws: WebSocket | null = null;
  private port: number = 38291;
  private host: string = '127.0.0.1';
  private status: AiConnectionStatus = 'offline';
  private transport: 'none' | 'websocket' | 'http-bridge' = 'none';
  private lastError: string | null = null;
  private reconnectTimer: any = null;
  private httpPollTimer: any = null;
  private isHttpPollingInFlight: boolean = false;
  private executedCommandIds: Set<string> = new Set();
  private clientId: string = `gv-client-${Math.random().toString(36).slice(2, 10)}`;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private isDestroyed: boolean = false;
  private appHandlers: AppBridgeHandlers | null = null;
  private editorHandlers: EditorBridgeHandlers | null = null;
  private statusListeners: Set<(status: AiConnectionStatus) => void> = new Set();
  private editorWaiters: Array<(handlers: EditorBridgeHandlers) => void> = [];

  constructor() {
    this.port = this.resolvePort();
    this.host = this.resolveHost();
    this.setupGlobalBridge();
  }

  public resolveHost(): string {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const h = window.location.hostname;
      if (h && h !== '' && h !== 'null') {
        return h;
      }
    }
    return '127.0.0.1';
  }

  public resolvePort(): number {
    if (typeof window !== 'undefined' && window.location) {
      try {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('ai_port');
        if (p) {
          const num = parseInt(p, 10);
          if (!isNaN(num) && num > 0) return num;
        }
        if ((window as any).__GEOVANTA_AI_PORT__) {
          const num = parseInt((window as any).__GEOVANTA_AI_PORT__, 10);
          if (!isNaN(num) && num > 0) return num;
        }
        if (window.location.port) {
          const locPort = parseInt(window.location.port, 10);
          if (!isNaN(locPort) && locPort > 0) return locPort;
        }
      } catch (_) {}
    }
    return 38291;
  }

  public isServerlessHttpHost(loc?: { protocol?: string; hostname?: string; search?: string }): boolean {
    const l = loc || (typeof window !== 'undefined' ? window.location : undefined);
    if (!l) return false;
    const search = l.search || '';
    const params = new URLSearchParams(search);
    if (params.has('ai_ws') || params.has('ai_port')) return false;
    if (this.getCustomWsUrl()) return false;
    const h = (l.hostname || '').toLowerCase();
    return h.endsWith('.netlify.app') || h.endsWith('.vercel.app') || h.endsWith('.pages.dev');
  }

  public isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      if (typeof localStorage !== 'undefined') {
        const flag = localStorage.getItem('geovanta_ai_enabled');
        if (flag === '1') return true;
        if (flag === '0') return false;
      }
      const search = window.location ? window.location.search : '';
      const params = new URLSearchParams(search);
      if (params.get('ai') === '1' || params.get('ai') === 'true') return true;
      if (params.has('ai_ws')) return true;
      if ((window as any).__GEOVANTA_AI_WS__) return true;
    } catch (_) {}
    return false;
  }

  public setEnabled(enabled: boolean): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('geovanta_ai_enabled', enabled ? '1' : '0');
      }
    } catch (_) {}
    if (enabled) {
      this.connect();
    } else {
      this.lastError = null;
      this.disconnect();
    }
  }

  public shouldAutoConnect(): boolean {
    return this.isEnabled();
  }

  public normalizeWsEndpoint(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    let cleaned = rawUrl.trim();
    if (!cleaned) return '';
    if (cleaned.startsWith('https://')) {
      cleaned = 'wss://' + cleaned.slice('https://'.length);
    } else if (cleaned.startsWith('http://')) {
      cleaned = 'ws://' + cleaned.slice('http://'.length);
    } else if (!cleaned.startsWith('ws://') && !cleaned.startsWith('wss://')) {
      cleaned = (cleaned.includes('127.0.0.1') || cleaned.includes('localhost') ? 'ws://' : 'wss://') + cleaned;
    }
    cleaned = cleaned.replace(/\/+(?:api\/)?mcp\/?$/i, '').replace(/\/+$/, '');
    return cleaned;
  }

  public getCustomWsUrl(): string {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('geovanta_ai_ws_url') || '';
      }
    } catch (_) {}
    return '';
  }

  public setCustomWsUrl(rawUrl: string): string {
    const normalized = this.normalizeWsEndpoint(rawUrl);
    try {
      if (typeof localStorage !== 'undefined') {
        if (normalized) {
          localStorage.setItem('geovanta_ai_ws_url', normalized);
        } else {
          localStorage.removeItem('geovanta_ai_ws_url');
        }
      }
    } catch (_) {}
    return normalized;
  }

  public resolveWsUrl(
    loc?: { protocol?: string; hostname?: string; host?: string; port?: string; search?: string },
    isRetry: boolean = false
  ): string {
    const locationObj =
      loc || (typeof window !== 'undefined' && window.location ? window.location : undefined);

    try {
      const search = locationObj?.search || '';
      const params = new URLSearchParams(search);
      const customWs =
        params.get('ai_ws') ||
        (typeof window !== 'undefined' ? (window as any).__GEOVANTA_AI_WS__ : '') ||
        (!loc ? this.getCustomWsUrl() : '');
      if (customWs && typeof customWs === 'string') {
        const norm = this.normalizeWsEndpoint(customWs);
        if (norm.startsWith('ws://') || norm.startsWith('wss://')) {
          return norm;
        }
      }

      const protocol = locationObj?.protocol || 'http:';
      const isHttps = protocol === 'https:';
      const wsProto = isHttps ? 'wss' : 'ws';

      if (isHttps) {
        const explicitAiPort = params.get('ai_port');
        const hostname = locationObj?.hostname || this.host || '127.0.0.1';
        if (explicitAiPort) {
          return `${wsProto}://${hostname}:${explicitAiPort}`;
        }
        const hostWithOptionalPort = locationObj?.host || hostname;
        return `${wsProto}://${hostWithOptionalPort}`;
      }
    } catch (_) {}

    let targetHost =
      locationObj?.hostname && locationObj.hostname !== '' && locationObj.hostname !== 'null'
        ? locationObj.hostname
        : this.resolveHost();
    if (isRetry && (targetHost === '127.0.0.1' || targetHost === 'localhost')) {
      targetHost = this.retryCount % 2 === 1 ? 'localhost' : '127.0.0.1';
    }
    this.host = targetHost;
    return `ws://${targetHost}:${this.port}`;
  }

  public resolveHttpBridgeUrl(): string {
    const customWs = this.getCustomWsUrl();
    if (customWs) {
      const httpBase = customWs
        .replace(/^wss:\/\//i, 'https://')
        .replace(/^ws:\/\//i, 'http://')
        .replace(/\/+$/, '');
      return `${httpBase}/mcp/bridge`;
    }
    if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol;
      if (proto === 'https:' || proto === 'http:') {
        return `${window.location.origin}/mcp/bridge`;
      }
    }
    return `http://127.0.0.1:${this.port}/mcp/bridge`;
  }

  public init(customPort?: number, force: boolean = false): void {
    if (customPort && !isNaN(customPort) && customPort > 0) {
      this.port = customPort;
    } else {
      this.port = this.resolvePort();
    }
    if (force || this.shouldAutoConnect()) {
      this.connect();
    }
  }

  public connect(customPort?: number, isRetry: boolean = false): void {
    if (customPort) this.port = customPort;
    if (this.isDestroyed) return;

    if (!isRetry) {
      this.retryCount = 0;
      this.lastError = null;
    }

    this.stopTimersAndSockets();
    this.setStatus('connecting');

    // On Netlify / Serverless HTTP hosts (without custom WS override), directly connect via HTTP Live Cloud Bridge!
    if (this.isServerlessHttpHost()) {
      this.startHttpBridgeLoop();
      return;
    }

    try {
      const wsUrl = this.resolveWsUrl(
        typeof window !== 'undefined' ? window.location : undefined,
        isRetry
      );
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (this.isDestroyed) {
          socket.close();
          return;
        }
        this.ws = socket;
        this.transport = 'websocket';
        this.lastError = null;
        this.retryCount = 0;
        this.setStatus('connected');
      };

      socket.onmessage = async (event) => {
        await this.handleMessage(event.data);
      };

      socket.onclose = () => {
        this.ws = null;
        if (this.transport === 'http-bridge') return;
        // Before giving up on http:/https: origins, check if HTTP Bridge (/mcp/bridge) is available
        if (
          typeof window !== 'undefined' &&
          window.location &&
          (window.location.protocol === 'https:' || window.location.protocol === 'http:')
        ) {
          this.tryFallbackToHttpBridge(wsUrl);
          return;
        }
        if (!this.lastError) {
          this.lastError = `Gagal menyambung ke ${wsUrl}`;
        }
        this.setStatus('offline', true);
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        this.lastError = `Gagal menyambung ke ${wsUrl}`;
        try {
          socket.close();
        } catch (_) {}
      };
    } catch (err: any) {
      this.lastError = err?.message || 'Gagal menginisialisasi WebSocket';
      this.setStatus('offline', true);
      this.scheduleReconnect();
    }
  }

  private async tryFallbackToHttpBridge(failedWsUrl: string): Promise<void> {
    if (this.isDestroyed) return;
    const bridgeUrl = this.resolveHttpBridgeUrl();
    try {
      const ok = await this.pollHttpBridgeOnce(bridgeUrl);
      if (ok && !this.isDestroyed) {
        this.startHttpBridgeLoop(bridgeUrl);
        return;
      }
    } catch (_) {}
    this.lastError = `Gagal menyambung ke ${failedWsUrl}`;
    this.setStatus('offline', true);
    this.scheduleReconnect();
  }

  private startHttpBridgeLoop(customBridgeUrl?: string): void {
    const bridgeUrl = customBridgeUrl || this.resolveHttpBridgeUrl();
    this.stopTimersAndSockets();
    this.transport = 'http-bridge';

    const tick = async () => {
      if (this.isDestroyed || this.transport !== 'http-bridge') return;
      await this.pollHttpBridgeOnce(bridgeUrl);
      if (!this.isDestroyed && this.transport === 'http-bridge') {
        this.httpPollTimer = setTimeout(tick, 1200);
      }
    };

    tick();
  }

  private async pollHttpBridgeOnce(bridgeUrl: string): Promise<boolean> {
    if (this.isHttpPollingInFlight) return true;
    this.isHttpPollingInFlight = true;
    try {
      const stateSnap = this.getState();
      const res = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'poll',
          clientId: this.clientId,
          state: {
            screen: stateSnap.screen,
            projectId: stateSnap.projectId,
            projectName: stateSnap.projectName,
            artboard: stateSnap.artboard,
            objectsCount: Array.isArray(stateSnap.objects) ? stateSnap.objects.length : 0,
            selection: stateSnap.selection
          }
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      this.lastError = null;
      this.retryCount = 0;
      this.setStatus('connected');

      if (data && Array.isArray(data.commands) && data.commands.length > 0) {
        const responses: any[] = [];
        for (const cmd of data.commands) {
          if (!cmd || !cmd.id || this.executedCommandIds.has(cmd.id)) continue;
          this.executedCommandIds.add(cmd.id);
          try {
            const result = await this.executeRpcMethod(cmd.method, cmd.params || {});
            responses.push({ id: cmd.id, result });
          } catch (err: any) {
            responses.push({
              id: cmd.id,
              error: { code: -32000, message: err?.message || 'Execution error' }
            });
          }
        }

        if (responses.length > 0) {
          await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'respond',
              clientId: this.clientId,
              state: {
                screen: this.getState().screen,
                projectId: this.getState().projectId
              },
              responses
            })
          });
        }
      }

      return true;
    } catch (err: any) {
      if (this.status === 'connected') {
        this.setStatus('offline');
      }
      this.lastError = `Gagal menyambung ke Cloud Bridge (${bridgeUrl})`;
      return false;
    } finally {
      this.isHttpPollingInFlight = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectTimer) return;
    if (this.retryCount >= this.maxRetries) {
      return;
    }
    this.retryCount++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && this.status !== 'connected') {
        this.connect(undefined, true);
      }
    }, 2500);
  }

  private stopTimersAndSockets(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.httpPollTimer) {
      clearTimeout(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.transport = 'none';
  }

  public disconnect(): void {
    this.stopTimersAndSockets();
    this.lastError = null;
    this.setStatus('offline', true);
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.statusListeners.clear();
    this.editorWaiters = [];
  }

  public bindApp(handlers: AppBridgeHandlers): void {
    this.appHandlers = handlers;
  }

  public unbindApp(): void {
    this.appHandlers = null;
  }

  public bindEditor(handlers: EditorBridgeHandlers): void {
    this.editorHandlers = handlers;
    while (this.editorWaiters.length > 0) {
      const waiter = this.editorWaiters.shift();
      if (waiter) waiter(handlers);
    }
  }

  public unbindEditor(): void {
    this.editorHandlers = null;
  }

  public async waitForEditor(timeoutMs = 8000): Promise<EditorBridgeHandlers> {
    if (this.editorHandlers) return this.editorHandlers;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.editorWaiters.indexOf(waiter);
        if (idx !== -1) this.editorWaiters.splice(idx, 1);
        reject(new Error('Timeout waiting for VectorEditor to mount and bind'));
      }, timeoutMs);

      const waiter = (handlers: EditorBridgeHandlers) => {
        clearTimeout(timer);
        resolve(handlers);
      };

      this.editorWaiters.push(waiter);
    });
  }

  public onStatusChange(listener: (status: AiConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(newStatus: AiConnectionStatus, forceNotify: boolean = false): void {
    if (this.status !== newStatus || forceNotify) {
      this.status = newStatus;
      for (const listener of this.statusListeners) {
        try {
          listener(newStatus);
        } catch (_) {}
      }
    }
  }

  public getConnectionStatus(): {
    status: AiConnectionStatus;
    port: number;
    host: string;
    transport: string;
    lastError: string | null;
  } {
    return {
      status: this.status,
      port: this.port,
      host: this.host,
      transport: this.transport,
      lastError: this.lastError
    };
  }

  public getState() {
    const screen = this.appHandlers ? this.appHandlers.getScreen() : 'workspace';
    const projectId = this.appHandlers ? this.appHandlers.getProjectId() : null;
    const projectName =
      this.appHandlers && typeof this.appHandlers.getProjectName === 'function'
        ? this.appHandlers.getProjectName()
        : null;

    if (screen === 'editor' && this.editorHandlers) {
      const doc = this.editorHandlers.getDoc();
      const selection = this.editorHandlers.getSelection ? this.editorHandlers.getSelection() : [];
      const artboard = {
        w: doc?.viewBox ? doc.viewBox[2] : doc?.artboard?.w || 800,
        h: doc?.viewBox ? doc.viewBox[3] : doc?.artboard?.h || 600,
        bg: doc?.bg || doc?.artboard?.bg || '#ffffff'
      };

      return {
        screen: 'editor',
        projectId,
        projectName,
        document: doc,
        selection,
        artboard,
        objects: doc?.objects || [],
        isConnected: this.status === 'connected',
        transport: this.transport
      };
    }

    return {
      screen: 'workspace',
      projectId: null,
      projectName: null,
      document: null,
      selection: [],
      artboard: null,
      objects: [],
      isConnected: this.status === 'connected',
      transport: this.transport
    };
  }

  public async openNewProject(
    name?: string,
    w?: number,
    h?: number,
    bg?: string
  ): Promise<{ success: boolean; projectId: string; name?: string }> {
    if (!this.appHandlers || typeof this.appHandlers.openNewProject !== 'function') {
      throw new Error('Application bridge not registered or openNewProject not available');
    }
    const pid = await this.appHandlers.openNewProject(name, w, h, bg);
    return {
      success: true,
      projectId: pid,
      name: name || 'Untitled Project'
    };
  }

  public selectObjects(ids: string[]): { success: boolean; selected: string[] } {
    if (!this.editorHandlers || typeof this.editorHandlers.setSelection !== 'function') {
      throw new Error('Editor not active or setSelection not available');
    }
    this.editorHandlers.setSelection(ids);
    return {
      success: true,
      selected: ids
    };
  }

  public async mutateCanvas(params: CanvasMutationParams = {}): Promise<any> {
    const screen = this.appHandlers ? this.appHandlers.getScreen() : 'workspace';
    if (screen === 'workspace') {
      await this.openNewProject();
      await this.waitForEditor(8000);
    }

    if (!this.editorHandlers) {
      await this.waitForEditor(5000);
    }

    if (!this.editorHandlers) {
      throw new Error('VectorEditor is not active');
    }

    const currentDoc = this.editorHandlers.getDoc() || { viewBox: [0, 0, 800, 600], objects: [] };
    const rawObjs = params.objects;
    const newObjs = Array.isArray(rawObjs) ? rawObjs : rawObjs ? [rawObjs] : [];

    let nextObjects: any[];
    if (params.replaceAll) {
      nextObjects = [...newObjs];
    } else {
      nextObjects = [...(currentDoc.objects || []), ...newObjs];
    }

    const nextDoc = {
      ...currentDoc,
      objects: nextObjects
    };

    const actionDesc = params.description || params.action || 'AI Canvas Mutation';
    this.editorHandlers.commit(nextDoc, actionDesc);

    if (newObjs.length > 0 && typeof this.editorHandlers.setSelection === 'function') {
      const ids = newObjs.map((o: any) => o.id).filter(Boolean);
      if (ids.length > 0) {
        this.editorHandlers.setSelection(ids);
      }
    }

    return {
      success: true,
      action: actionDesc,
      objectsCount: newObjs.length,
      doc: nextDoc
    };
  }

  public async workspaceManage(params: any = {}): Promise<any> {
    if (!this.appHandlers) {
      throw new Error('Application bridge not registered');
    }
    const action = params.action || 'list_projects';

    const resolveTargetProjectId = async (): Promise<string> => {
      if (params.projectId) return params.projectId;
      if (params.name && this.appHandlers?.listProjects) {
        const all = await this.appHandlers.listProjects();
        const found = all.find(
          (p: any) => p.name && p.name.toLowerCase().includes(String(params.name).toLowerCase())
        );
        if (found) return found.id;
      }
      const activeId = this.appHandlers?.getProjectId();
      if (activeId) return activeId;
      throw new Error('Project ID atau nama proyek tidak ditemukan');
    };

    switch (action) {
      case 'list_projects': {
        const list = this.appHandlers.listProjects ? await this.appHandlers.listProjects() : [];
        return {
          success: true,
          action: 'list_projects',
          screen: this.appHandlers.getScreen(),
          activeProjectId: this.appHandlers.getProjectId(),
          count: list.length,
          projects: list
        };
      }

      case 'create_project': {
        const pid = await this.appHandlers.openNewProject(
          params.name || 'Untitled Project',
          params.width || 800,
          params.height || 600,
          params.bg || '#ffffff'
        );
        await this.waitForEditor(8000).catch(() => {});
        return {
          success: true,
          action: 'create_project',
          projectId: pid,
          name: params.name || 'Untitled Project',
          width: params.width || 800,
          height: params.height || 600,
          screen: 'editor'
        };
      }

      case 'open_project': {
        const pid = await resolveTargetProjectId();
        await this.appHandlers.openProject(pid);
        await this.waitForEditor(8000).catch(() => {});
        return {
          success: true,
          action: 'open_project',
          projectId: pid,
          screen: 'editor'
        };
      }

      case 'rename_project': {
        const pid = await resolveTargetProjectId();
        if (!this.appHandlers.renameProject) throw new Error('renameProject handler not bound');
        const updated = await this.appHandlers.renameProject(pid, params.name || 'Renamed Project');
        return {
          success: true,
          action: 'rename_project',
          projectId: pid,
          name: updated?.name || params.name
        };
      }

      case 'duplicate_project': {
        const pid = await resolveTargetProjectId();
        if (!this.appHandlers.duplicateProject) throw new Error('duplicateProject handler not bound');
        const dup = await this.appHandlers.duplicateProject(pid, params.name);
        return {
          success: true,
          action: 'duplicate_project',
          sourceProjectId: pid,
          newProject: dup
        };
      }

      case 'toggle_favorite': {
        const pid = await resolveTargetProjectId();
        if (!this.appHandlers.toggleFavorite) throw new Error('toggleFavorite handler not bound');
        const updated = await this.appHandlers.toggleFavorite(pid);
        return {
          success: true,
          action: 'toggle_favorite',
          projectId: pid,
          favorite: updated?.favorite
        };
      }

      case 'trash_project': {
        const pid = await resolveTargetProjectId();
        if (!this.appHandlers.trashProject) throw new Error('trashProject handler not bound');
        await this.appHandlers.trashProject(pid);
        return {
          success: true,
          action: 'trash_project',
          projectId: pid
        };
      }

      case 'restore_project': {
        const pid = await resolveTargetProjectId();
        if (!this.appHandlers.restoreProject) throw new Error('restoreProject handler not bound');
        await this.appHandlers.restoreProject(pid);
        return {
          success: true,
          action: 'restore_project',
          projectId: pid
        };
      }

      case 'delete_project': {
        const pid = await resolveTargetProjectId();
        if (!this.appHandlers.deleteProject) throw new Error('deleteProject handler not bound');
        await this.appHandlers.deleteProject(pid);
        return {
          success: true,
          action: 'delete_project',
          projectId: pid
        };
      }

      case 'back_to_workspace': {
        if (!this.appHandlers.backToWorkspace) throw new Error('backToWorkspace handler not bound');
        await this.appHandlers.backToWorkspace();
        return {
          success: true,
          action: 'back_to_workspace',
          screen: 'workspace'
        };
      }

      case 'open_settings': {
        if (this.appHandlers.openSettings) {
          this.appHandlers.openSettings(true);
        }
        return {
          success: true,
          action: 'open_settings'
        };
      }

      default:
        throw new Error(`Unknown workspace action: ${action}`);
    }
  }

  public async textCreate(params: any = {}): Promise<any> {
    const screen = this.appHandlers ? this.appHandlers.getScreen() : 'workspace';
    if (screen === 'workspace') {
      await this.openNewProject();
      await this.waitForEditor(8000);
    }
    if (!this.editorHandlers) {
      await this.waitForEditor(5000);
    }
    if (this.editorHandlers && typeof this.editorHandlers.createText === 'function') {
      return await this.editorHandlers.createText(params);
    }

    const id = `txt-${Math.random().toString(36).slice(2, 9)}`;
    const textContent = String(params.text || 'Geovanta Text');
    const textObj = {
      id,
      name: params.name || textContent.slice(0, 24) || 'Text',
      type: 'text',
      text: textContent,
      x: Number(params.x ?? 120),
      y: Number(params.y ?? 160),
      fontSize: Number(params.fontSize ?? 48),
      fontFamily: params.fontFamily || 'IBM Plex Sans',
      fontWeight: params.fontWeight || 'normal',
      fontStyle: params.fontStyle || 'normal',
      fill: params.fill || '#111827',
      stroke: params.stroke || 'none',
      strokeWidth: Number(params.strokeWidth ?? 0),
      opacity: Number(params.opacity ?? 1),
      subs: []
    };
    await this.mutateCanvas({
      action: `Create Text "${textObj.name}"`,
      objects: [textObj],
      replaceAll: false
    });
    return {
      success: true,
      objectId: id,
      text: textContent
    };
  }

  public async iconifyInsert(params: any = {}): Promise<any> {
    const screen = this.appHandlers ? this.appHandlers.getScreen() : 'workspace';
    if (screen === 'workspace') {
      await this.openNewProject();
      await this.waitForEditor(8000);
    }
    if (!this.editorHandlers) {
      await this.waitForEditor(5000);
    }
    if (this.editorHandlers && typeof this.editorHandlers.insertIconify === 'function') {
      return await this.editorHandlers.insertIconify(params.icon, params);
    }
    throw new Error('insertIconify handler not available on active editor');
  }

  public async layerManage(params: any = {}): Promise<any> {
    const screen = this.appHandlers ? this.appHandlers.getScreen() : 'workspace';
    if (screen === 'workspace') {
      await this.openNewProject();
      await this.waitForEditor(8000);
    }
    if (!this.editorHandlers) {
      await this.waitForEditor(5000);
    }
    if (!this.editorHandlers) {
      throw new Error('VectorEditor is not active');
    }

    const doc = this.editorHandlers.getDoc() || { viewBox: [0, 0, 800, 600], objects: [] };
    const objects: any[] = Array.isArray(doc.objects) ? [...doc.objects] : [];
    const currentSel = this.editorHandlers.getSelection ? this.editorHandlers.getSelection() : [];
    const targetIds = new Set<string>(
      Array.isArray(params.ids) && params.ids.length > 0
        ? params.ids
        : currentSel.length > 0
        ? currentSel
        : objects.length > 0
        ? [objects[objects.length - 1].id]
        : []
    );

    const action = params.action || 'list_layers';

    switch (action) {
      case 'list_layers': {
        return {
          success: true,
          count: objects.length,
          selection: currentSel,
          layers: objects.map((o, idx) => ({
            index: idx,
            id: o.id,
            name: o.name || o.id,
            type: o.type || (o.text !== undefined ? 'text' : 'path'),
            fill: o.fill,
            stroke: o.stroke,
            strokeWidth: o.strokeWidth,
            opacity: o.opacity ?? 1,
            hidden: !!o.hidden,
            locked: !!o.locked,
            selected: currentSel.includes(o.id)
          }))
        };
      }

      case 'update_style': {
        const nextObjects = objects.map((o) => {
          if (!targetIds.has(o.id)) return o;
          const patched = { ...o };
          if (params.fill !== undefined) patched.fill = params.fill;
          if (params.stroke !== undefined) patched.stroke = params.stroke;
          if (params.strokeWidth !== undefined) patched.strokeWidth = Number(params.strokeWidth);
          if (params.opacity !== undefined) patched.opacity = Number(params.opacity);
          if (params.name !== undefined) patched.name = String(params.name);
          return patched;
        });
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, 'AI Update Layer Style');
        return { success: true, action: 'update_style', updatedIds: Array.from(targetIds) };
      }

      case 'transform': {
        const dx = Number(params.dx || 0);
        const dy = Number(params.dy || 0);
        const scale = params.scale !== undefined ? Number(params.scale) : 1;
        const rotDeg = Number(params.rotate || 0);
        const rotRad = (rotDeg * Math.PI) / 180;
        const cos = Math.cos(rotRad);
        const sin = Math.sin(rotRad);

        const nextObjects = objects.map((o) => {
          if (!targetIds.has(o.id)) return o;
          const copy = JSON.parse(JSON.stringify(o));
          if (copy.x !== undefined && copy.y !== undefined) {
            copy.x += dx;
            copy.y += dy;
          }
          if (Array.isArray(copy.subs)) {
            let cx = 0;
            let cy = 0;
            let count = 0;
            for (const sp of copy.subs) {
              for (const nd of sp.nodes || []) {
                cx += nd.x;
                cy += nd.y;
                count++;
              }
            }
            if (count > 0) {
              cx /= count;
              cy /= count;
            }
            const xformPt = (pt: { x: number; y: number }) => {
              let rx = (pt.x - cx) * scale;
              let ry = (pt.y - cy) * scale;
              if (rotDeg !== 0) {
                const tx = rx * cos - ry * sin;
                const ty = rx * sin + ry * cos;
                rx = tx;
                ry = ty;
              }
              return {
                x: Math.round((cx + rx + dx) * 1e4) / 1e4,
                y: Math.round((cy + ry + dy) * 1e4) / 1e4
              };
            };
            for (const sp of copy.subs) {
              for (const nd of sp.nodes || []) {
                const np = xformPt(nd);
                nd.x = np.x;
                nd.y = np.y;
                if (nd.handleIn) {
                  const hi = xformPt(nd.handleIn);
                  nd.handleIn.x = hi.x;
                  nd.handleIn.y = hi.y;
                }
                if (nd.handleOut) {
                  const ho = xformPt(nd.handleOut);
                  nd.handleOut.x = ho.x;
                  nd.handleOut.y = ho.y;
                }
              }
            }
          }
          return copy;
        });
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, 'AI Transform Layer');
        return { success: true, action: 'transform', transformedIds: Array.from(targetIds) };
      }

      case 'reorder': {
        const order = params.order || 'bring_to_front';
        const selected = objects.filter((o) => targetIds.has(o.id));
        const unselected = objects.filter((o) => !targetIds.has(o.id));
        let nextObjects = objects;
        if (order === 'bring_to_front' || order === 'bring_forward') {
          nextObjects = [...unselected, ...selected];
        } else if (order === 'send_to_back' || order === 'send_backward') {
          nextObjects = [...selected, ...unselected];
        }
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, `AI Reorder (${order})`);
        return { success: true, action: 'reorder', order, ids: Array.from(targetIds) };
      }

      case 'duplicate': {
        const clones: any[] = [];
        for (const o of objects) {
          if (targetIds.has(o.id)) {
            const copy = JSON.parse(JSON.stringify(o));
            copy.id = `dup-${Math.random().toString(36).slice(2, 9)}`;
            copy.name = `${o.name || o.id} Copy`;
            if (Array.isArray(copy.subs)) {
              for (const sp of copy.subs) {
                for (const nd of sp.nodes || []) {
                  nd.x += 20;
                  nd.y += 20;
                  if (nd.handleIn) {
                    nd.handleIn.x += 20;
                    nd.handleIn.y += 20;
                  }
                  if (nd.handleOut) {
                    nd.handleOut.x += 20;
                    nd.handleOut.y += 20;
                  }
                }
              }
            }
            clones.push(copy);
          }
        }
        const nextObjects = [...objects, ...clones];
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, 'AI Duplicate Layer');
        const newIds = clones.map((c) => c.id);
        if (newIds.length && this.editorHandlers.setSelection) {
          this.editorHandlers.setSelection(newIds);
        }
        return { success: true, action: 'duplicate', duplicatedIds: newIds };
      }

      case 'delete': {
        const nextObjects = objects.filter((o) => !targetIds.has(o.id));
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, 'AI Delete Layer');
        if (this.editorHandlers.setSelection) this.editorHandlers.setSelection([]);
        return { success: true, action: 'delete', deletedIds: Array.from(targetIds) };
      }

      case 'rename': {
        const nextObjects = objects.map((o) =>
          targetIds.has(o.id) ? { ...o, name: String(params.name || o.name) } : o
        );
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, 'AI Rename Layer');
        return { success: true, action: 'rename', ids: Array.from(targetIds), name: params.name };
      }

      case 'visibility': {
        const nextObjects = objects.map((o) =>
          targetIds.has(o.id) ? { ...o, hidden: Boolean(params.hidden) } : o
        );
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, 'AI Toggle Layer Visibility');
        return { success: true, action: 'visibility', ids: Array.from(targetIds), hidden: Boolean(params.hidden) };
      }

      case 'lock': {
        const nextObjects = objects.map((o) =>
          targetIds.has(o.id) ? { ...o, locked: Boolean(params.locked) } : o
        );
        this.editorHandlers.commit({ ...doc, objects: nextObjects }, 'AI Toggle Layer Lock');
        return { success: true, action: 'lock', ids: Array.from(targetIds), locked: Boolean(params.locked) };
      }

      default:
        throw new Error(`Unknown layer action: ${action}`);
    }
  }

  public async artboardAndView(params: any = {}): Promise<any> {
    const action = params.action;

    if (action === 'set_theme') {
      if (this.appHandlers && this.appHandlers.setTheme) {
        this.appHandlers.setTheme({ theme: params.theme, accent: params.accent });
      }
      return { success: true, action: 'set_theme', theme: params.theme, accent: params.accent };
    }

    const screen = this.appHandlers ? this.appHandlers.getScreen() : 'workspace';
    if (screen === 'workspace') {
      await this.openNewProject();
      await this.waitForEditor(8000);
    }
    if (!this.editorHandlers) {
      await this.waitForEditor(5000);
    }
    if (!this.editorHandlers) {
      throw new Error('VectorEditor is not active');
    }

    switch (action) {
      case 'resize_artboard': {
        if (this.editorHandlers.setArtboard) {
          this.editorHandlers.setArtboard({
            width: params.width,
            height: params.height,
            bg: params.bg
          });
        } else {
          const doc = this.editorHandlers.getDoc() || { viewBox: [0, 0, 800, 600], objects: [] };
          const w = Number(params.width || (doc.viewBox ? doc.viewBox[2] : 800));
          const h = Number(params.height || (doc.viewBox ? doc.viewBox[3] : 600));
          const nextDoc = {
            ...doc,
            viewBox: [0, 0, w, h],
            ...(params.bg ? { bg: params.bg, artboardBg: params.bg } : {})
          };
          this.editorHandlers.commit(nextDoc, 'AI Resize Artboard');
        }
        return {
          success: true,
          action: 'resize_artboard',
          width: params.width,
          height: params.height,
          bg: params.bg
        };
      }

      case 'set_tool': {
        if (this.editorHandlers.setTool && params.tool) {
          this.editorHandlers.setTool(params.tool);
        }
        return { success: true, action: 'set_tool', tool: params.tool };
      }

      case 'undo': {
        if (this.editorHandlers.undo) {
          this.editorHandlers.undo();
        }
        return { success: true, action: 'undo' };
      }

      case 'redo': {
        if (this.editorHandlers.redo) {
          this.editorHandlers.redo();
        }
        return { success: true, action: 'redo' };
      }

      case 'set_zoom': {
        if (this.editorHandlers.setZoom && params.zoom) {
          this.editorHandlers.setZoom(Number(params.zoom));
        }
        return { success: true, action: 'set_zoom', zoom: params.zoom };
      }

      default:
        throw new Error(`Unknown artboard/view action: ${action}`);
    }
  }

  public exportCanvas(format = 'svg'): { success: boolean; exported: boolean; format: string; data: string } {
    let data = '';
    if (this.editorHandlers && typeof this.editorHandlers.exportSvg === 'function') {
      try {
        const res = this.editorHandlers.exportSvg();
        if (typeof res === 'string') {
          data = res;
        }
      } catch (_) {}
    }
    if (!data && this.editorHandlers && typeof this.editorHandlers.getDoc === 'function') {
      const doc = this.editorHandlers.getDoc();
      data = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${doc && doc.viewBox ? doc.viewBox.join(' ') : '0 0 800 600'}"></svg>`;
    }
    return {
      success: true,
      exported: true,
      format,
      data
    };
  }

  public async executeRpcMethod(method: string, params: any = {}): Promise<any> {
    switch (method) {
      case 'get_state':
      case 'getCanvasState':
        return this.getState();

      case 'apply_mutation':
      case 'mutateCanvas':
        return await this.mutateCanvas(params);

      case 'select_objects':
      case 'selectObjects':
        return this.selectObjects(params?.ids || []);

      case 'open_new_project':
      case 'openNewProject':
        return await this.openNewProject(params?.name, params?.width, params?.height, params?.bg);

      case 'export_canvas':
      case 'exportCanvas':
        return this.exportCanvas(params?.format || 'svg');

      case 'workspaceManage':
        return await this.workspaceManage(params);

      case 'textCreate':
        return await this.textCreate(params);

      case 'iconifyInsert':
        return await this.iconifyInsert(params);

      case 'layerManage':
        return await this.layerManage(params);

      case 'artboardAndView':
        return await this.artboardAndView(params);

      case 'simplifyCurves':
        if (this.editorHandlers?.simplifyCurves) {
          return this.editorHandlers.simplifyCurves(params);
        }
        return { success: true, method: 'simplifyCurves' };

      case 'booleanOperation':
        if (this.editorHandlers?.booleanOperation) {
          return this.editorHandlers.booleanOperation(params);
        }
        return { success: true, method: 'booleanOperation' };

      case 'cornerFillet':
        if (this.editorHandlers?.cornerFillet) {
          return this.editorHandlers.cornerFillet(params);
        }
        return { success: true, method: 'cornerFillet' };

      case 'recolor': {
        const doc = this.editorHandlers?.getDoc();
        if (doc && Array.isArray(doc.objects)) {
          const { find, replace, palette } = params;
          const nextObjs = doc.objects.map((obj: any) => {
            const copy = { ...obj };
            if (find && replace) {
              if (copy.fill && copy.fill.toLowerCase() === find.toLowerCase()) copy.fill = replace;
              if (copy.stroke && copy.stroke.toLowerCase() === find.toLowerCase()) copy.stroke = replace;
            }
            if (palette && Array.isArray(palette) && palette.length) {
              copy.fill = palette[0];
            }
            return copy;
          });
          this.editorHandlers?.commit({ ...doc, objects: nextObjs }, 'AI Recolor');
        }
        return { success: true, method: 'recolor' };
      }

      default:
        throw new Error(`Method not found: ${method}`);
    }
  }

  private async handleMessage(rawData: any): Promise<void> {
    let msg: any;
    try {
      msg = JSON.parse(rawData.toString());
    } catch (_) {
      return;
    }

    if (!msg || typeof msg !== 'object') return;
    const { id, method, params } = msg;
    if (id === undefined) return;

    try {
      const result = await this.executeRpcMethod(method, params || {});
      this.sendResponse(id, result);
    } catch (err: any) {
      const isMethodNotFound = err?.message && String(err.message).startsWith('Method not found:');
      this.sendResponse(id, null, {
        code: isMethodNotFound ? -32601 : -32000,
        message: err?.message || 'Internal bridge error'
      });
    }
  }

  private sendResponse(id: any, result: any, error: any = null): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const response: any = {
      jsonrpc: '2.0',
      id
    };
    if (error) {
      response.error = error;
    } else {
      response.result = result;
    }
    try {
      this.ws.send(JSON.stringify(response));
    } catch (_) {}
  }

  private setupGlobalBridge(): void {
    if (typeof window !== 'undefined') {
      (window as any).__GEOVANTA_AI_BRIDGE__ = {
        getState: () => this.getState(),
        mutateCanvas: (p: CanvasMutationParams) => this.mutateCanvas(p),
        selectObjects: (ids: string[]) => this.selectObjects(ids),
        openNewProject: (name?: string, w?: number, h?: number) => this.openNewProject(name, w, h),
        workspaceManage: (p: any) => this.workspaceManage(p),
        textCreate: (p: any) => this.textCreate(p),
        iconifyInsert: (p: any) => this.iconifyInsert(p),
        layerManage: (p: any) => this.layerManage(p),
        artboardAndView: (p: any) => this.artboardAndView(p),
        exportCanvas: (f: string) => this.exportCanvas(f),
        getConnectionStatus: () => this.getConnectionStatus(),
        connect: (p?: number) => this.connect(p),
        disconnect: () => this.disconnect()
      };
    }
  }
}

export const aiLiveConnector = new AiLiveConnector();

// Auto-initialize if running in browser window
if (typeof window !== 'undefined') {
  aiLiveConnector.init();
}
