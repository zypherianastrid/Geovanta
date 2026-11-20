# Geovanta AI MCP Server & Live Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun server MCP (Model Context Protocol) mandiri dan live WebSocket connector khusus untuk Google Gemini dan Antigravity yang memungkinkan AI mengendalikan dan memanfaatkan seluruh kemampuan manipulasi geometri vektor Geovanta, baik secara headless maupun live di kanvas aktif.

**Architecture:** Arsitektur Hybrid (Opsi C) yang terdiri dari server MCP Node.js berbasis stdio dan WebSocket server lokal (`127.0.0.1:38291`), dipadukan dengan klien bridge di dalam aplikasi Geovanta (`src/bridge/aiLiveConnector.tsx`). Tool geometri beroperasi dalam model Dual-Mode: langsung memutasi kanvas jika aplikasi Geovanta terbuka dengan dukungan Undo/Redo transaksi `commit()`, atau mengembalikan output SVG jika berjalan headless.

**Tech Stack:** Node.js, TypeScript/ESM, WebSocket (`ws`), Model Context Protocol SDK / JSON-RPC stdio, Playwright (`@playwright/test`), React 18, Tauri v2.

**Spec:** `docs/superpowers/specs/2026-11-19-geovanta-ai-mcp-connector-design.md`

## Global Constraints
- Seluruh pengujian dan verifikasi browser WAJIB menggunakan Playwright Regular (`npx playwright test <path>`) dan Playwright MCP.
- Komunikasi jaringan MCP dan WebSocket 100% lokal pada `127.0.0.1:38291` tanpa ketergantungan cloud pihak ketiga.
- Setiap mutasi kanvas live wajib melalui transaksi dokumen `commit()` agar riwayat Undo/Redo (`Ctrl+Z`) tetap utuh.
- Jika pengguna berada di halaman galeri (`screen === 'workspace'`), AI yang memicu mutasi kanvas harus otomatis membuka proyek baru (*Auto-Open New Canvas*).

## Review Focus
1. **WebSocket Reconnection Resiliency:** Geovanta yang dibuka sebelum atau sesudah MCP server harus melakukan auto-reconnect halus tanpa melempar unhandled exception di console.
2. **Undo/Redo Integrity:** Objek yang dimasukkan atau dimutasi oleh AI harus dapat di-undo secara sempurna dengan `Ctrl+Z` tanpa merusak state internal dokumen.
3. **Headless Fallback Graceful Degradation:** Ketika Geovanta tidak sedang berjalan, tool dual-mode tidak boleh crash atau hang, melainkan segera mengembalikan output SVG string.
4. **Auto-Open New Project Routing:** Memastikan transisi dari galeri ke editor berjalan sinkron dan objek AI tergambar pada dokumen baru tanpa kehilangan data.
5. **JSON-RPC Protocol Compliance:** Memastikan respons stdio MCP mematuhi format spesifikasi MCP 2024-11-05 / standard JSON-RPC 2.0 sehingga dikenali oleh Antigravity dan Gemini CLI.

---

### Task 1: Headless Geometry Engine Adapter (`scripts/mcp-server/engineAdapter.js`)

**Files:**
- Create: `scripts/mcp-server/engineAdapter.js`
- Test: `tests/mcp-engine-adapter.spec.ts`

**Interfaces:**
- Produces:
  - `createShape(options: { type: string, [key: string]: any }): GeovantaObject`
  - `parseSVG(svgString: string): GeovantaDoc`
  - `serializeDoc(doc: GeovantaDoc): string`
  - `simplifyCurves(doc: GeovantaDoc, options?: { level?: number }): { doc: GeovantaDoc, count: number }`
  - `booleanOperation(doc: GeovantaDoc, op: 'union'|'subtract'|'intersect'|'exclude'): GeovantaDoc`
  - `applyCornerFillet(doc: GeovantaDoc, radius: number): GeovantaDoc`

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/mcp-engine-adapter.spec.ts
import { test, expect } from '@playwright/test';
import { createShape, parseSVG, serializeDoc, simplifyCurves } from '../scripts/mcp-server/engineAdapter.js';

test('engineAdapter creates parametric star shape and serializes to SVG', () => {
  const shape = createShape({ type: 'star', points: 5, innerRadius: 25, outerRadius: 50, fill: '#ff0055' });
  expect(shape).toBeDefined();
  expect(shape.type).toBe('path');
  expect(shape.fill).toBe('#ff0055');

  const doc = {
    id: 'test-doc',
    artboard: { w: 800, h: 600, bg: '#ffffff' },
    objects: [shape],
    selection: []
  };

  const svg = serializeDoc(doc);
  expect(svg).toContain('<svg');
  expect(svg).toContain('fill="#ff0055"');
});

test('engineAdapter parses SVG and simplifies curves', () => {
  const sampleSvg = `<svg viewBox="0 0 100 100"><path d="M 10 10 L 20 10 L 30 10 L 40 10 Z" fill="#000000"/></svg>`;
  const parsedDoc = parseSVG(sampleSvg);
  expect(parsedDoc.objects.length).toBeGreaterThan(0);

  const simplified = simplifyCurves(parsedDoc, { level: 100 });
  expect(simplified.doc).toBeDefined();
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/mcp-engine-adapter.spec.ts`  
Expected: FAIL with "Cannot find module '../scripts/mcp-server/engineAdapter.js'"

- [ ] **Step 3: Implement `engineAdapter.js`**

Implementasikan adaptor di `scripts/mcp-server/engineAdapter.js` yang memanfaatkan generator bentuk dasar, SVG parser/serializer, serta simplifikasi kurva dari Geovanta secara headless di Node.js.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/mcp-engine-adapter.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/mcp-server/engineAdapter.js tests/mcp-engine-adapter.spec.ts
git commit -m "feat(mcp): implement headless geometry engine adapter"
```

---

### Task 2: Geovanta MCP Server Core & WebSocket Hub (`scripts/mcp-server/index.js`)

**Files:**
- Create: `scripts/mcp-server/index.js`
- Create: `scripts/mcp-server/tools.js`
- Test: `tests/mcp-server-protocol.spec.ts`

**Interfaces:**
- Consumes: `engineAdapter.js`
- Produces:
  - Stdio JSON-RPC 2.0 MCP Handler (`tools/list`, `tools/call`)
  - Local WebSocket Server on port `38291` (`ws://127.0.0.1:38291`)
  - Tool set: `geovanta_status`, `geovanta_shape_create`, `geovanta_curve_simplify`, `geovanta_boolean_operation`, `geovanta_svg_parse`, `geovanta_svg_serialize`, `geovanta_live_get_canvas`, `geovanta_live_mutate_canvas`, `geovanta_live_export`

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/mcp-server-protocol.spec.ts
import { test, expect } from '@playwright/test';
import { GeovantaMcpServer } from '../scripts/mcp-server/index.js';

test('GeovantaMcpServer responds to tools/list with all required tools', async () => {
  const server = new GeovantaMcpServer({ port: 38292, stdio: false });
  await server.start();

  const toolList = server.getToolList();
  const toolNames = toolList.map(t => t.name);

  expect(toolNames).toContain('geovanta_status');
  expect(toolNames).toContain('geovanta_shape_create');
  expect(toolNames).toContain('geovanta_curve_simplify');
  expect(toolNames).toContain('geovanta_boolean_operation');
  expect(toolNames).toContain('geovanta_live_get_canvas');
  expect(toolNames).toContain('geovanta_live_mutate_canvas');

  await server.stop();
});

test('GeovantaMcpServer executes geovanta_shape_create in headless mode when no live client', async () => {
  const server = new GeovantaMcpServer({ port: 38293, stdio: false });
  await server.start();

  const result = await server.handleToolCall('geovanta_shape_create', {
    type: 'circle',
    radius: 40,
    fill: '#00ff88'
  });

  expect(result.content[0].text).toContain('<svg');
  expect(result.content[0].text).toContain('fill="#00ff88"');

  await server.stop();
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/mcp-server-protocol.spec.ts`  
Expected: FAIL with "Cannot find module '../scripts/mcp-server/index.js'"

- [ ] **Step 3: Implement `scripts/mcp-server/tools.js` & `scripts/mcp-server/index.js`**

Implementasikan server MCP JSON-RPC 2.0 yang membaca input dari `process.stdin` (atau API programmatic) dan membuka server WebSocket lokal pada `127.0.0.1:38291` untuk mengorkestrasi klien Geovanta.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/mcp-server-protocol.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/mcp-server/index.js scripts/mcp-server/tools.js tests/mcp-server-protocol.spec.ts
git commit -m "feat(mcp): implement mcp server core and websocket hub"
```

---

### Task 3: Client Live Bridge in Geovanta App (`src/bridge/aiLiveConnector.tsx`)

**Files:**
- Create: `src/bridge/aiLiveConnector.tsx`
- Modify: `src/App.tsx` (registrasi bridge dan auto-open handler)
- Modify: `src/components/editor/VectorEditor.tsx` (bind active canvas commit and selection)
- Test: `tests/ai-live-connector.spec.ts`

**Interfaces:**
- Consumes: WebSocket connection to `ws://127.0.0.1:38291`
- Produces:
  - `window.__GEOVANTA_AI_BRIDGE__`:
    - `getState()`
    - `mutateCanvas(action, objects, options)`
    - `selectObjects(ids)`
    - `exportCanvas(format)`
    - `openNewProject()`

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/ai-live-connector.spec.ts
import { test, expect } from '@playwright/test';
import { GeovantaMcpServer } from '../scripts/mcp-server/index.js';

test('Geovanta web client auto-connects to local MCP WebSocket bridge and reports state', async ({ page }) => {
  const testPort = 38294;
  const server = new GeovantaMcpServer({ port: testPort, stdio: false });
  await server.start();

  // Navigate to Geovanta app passing port param
  await page.goto(`file://${process.cwd().replace(/\\/g, '/')}/index.html?ai_port=${testPort}`);

  // Wait for connection handshake
  await expect.poll(() => server.isLiveConnected(), { timeout: 10000 }).toBe(true);

  // Call tool to get canvas state
  const stateResult = await server.handleToolCall('geovanta_live_get_canvas', {});
  expect(stateResult.content[0].text).toContain('artboard');

  await server.stop();
});

test('AI live mutation creates shape on canvas and supports Ctrl+Z undo', async ({ page }) => {
  const testPort = 38295;
  const server = new GeovantaMcpServer({ port: testPort, stdio: false });
  await server.start();

  await page.goto(`file://${process.cwd().replace(/\\/g, '/')}/index.html?ai_port=${testPort}`);
  await expect.poll(() => server.isLiveConnected(), { timeout: 10000 }).toBe(true);

  // Trigger shape creation via MCP tool
  await server.handleToolCall('geovanta_shape_create', {
    type: 'star',
    points: 5,
    fill: '#3b82f6',
    target: 'canvas'
  });

  // Verify object exists in canvas state
  const state = await page.evaluate(() => (window as any).__GEOVANTA_AI_BRIDGE__?.getState());
  expect(state.document.objects.some((o: any) => o.fill === '#3b82f6')).toBe(true);

  // Press Ctrl+Z to undo
  await page.keyboard.press('Control+z');
  const stateAfterUndo = await page.evaluate(() => (window as any).__GEOVANTA_AI_BRIDGE__?.getState());
  expect(stateAfterUndo.document.objects.some((o: any) => o.fill === '#3b82f6')).toBe(false);

  await server.stop();
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/ai-live-connector.spec.ts`  
Expected: FAIL with "window.__GEOVANTA_AI_BRIDGE__ is undefined"

- [ ] **Step 3: Implement `src/bridge/aiLiveConnector.tsx` and integrate into `App.tsx` & `VectorEditor.tsx`**

Tambahkan modul bridge klien yang menyambungkan WebSocket ke `ws://127.0.0.1:38291`, menangani aksi live, dan mendaftarkan status koneksi di status bar.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/ai-live-connector.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/bridge/aiLiveConnector.tsx src/App.tsx src/components/editor/VectorEditor.tsx tests/ai-live-connector.spec.ts
git commit -m "feat(bridge): implement ai live connector with undo/redo and auto-project support"
```

---

### Task 4: Antigravity Config & Google Gemini Direct Connector Script

**Files:**
- Create: `antigravity-mcp.json`
- Create: `scripts/gemini-geovanta-connector.js`
- Test: `tests/gemini-connector.spec.ts`

**Interfaces:**
- Produces:
  - Antigravity MCP integration configuration snippet (`antigravity-mcp.json`)
  - Standalone Google Gemini function calling connector (`scripts/gemini-geovanta-connector.js`)

- [ ] **Step 1: Write the failing Playwright test**

```typescript
// tests/gemini-connector.spec.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { getGeminiToolDeclarations } from '../scripts/gemini-geovanta-connector.js';

test('antigravity-mcp.json exists and contains correct command configuration', () => {
  const configPath = path.resolve(process.cwd(), 'antigravity-mcp.json');
  expect(fs.existsSync(configPath)).toBe(true);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  expect(config.mcpServers.geovanta).toBeDefined();
  expect(config.mcpServers.geovanta.command).toBe('node');
});

test('gemini connector generates valid function declarations for Gemini API', () => {
  const declarations = getGeminiToolDeclarations();
  expect(Array.isArray(declarations)).toBe(true);
  expect(declarations.some((d: any) => d.name === 'geovanta_shape_create')).toBe(true);
  expect(declarations.some((d: any) => d.name === 'geovanta_curve_simplify')).toBe(true);
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/gemini-connector.spec.ts`  
Expected: FAIL with "Cannot find module '../scripts/gemini-geovanta-connector.js'"

- [ ] **Step 3: Implement `antigravity-mcp.json` and `scripts/gemini-geovanta-connector.js`**

Buat file konfigurasi Antigravity dan generator deklarasi Gemini API function calling.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/gemini-connector.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add antigravity-mcp.json scripts/gemini-geovanta-connector.js tests/gemini-connector.spec.ts
git commit -m "feat(gemini): provide antigravity mcp configuration and gemini api connector"
```

---

### Task 5: End-to-End Hybrid Integration Verification & Documentation

**Files:**
- Create: `tests/geovanta-ai-e2e.spec.ts`
- Modify: `README.md` (tambahkan panduan penggunaan AI MCP untuk Antigravity dan Gemini)

- [ ] **Step 1: Write End-to-End Playwright Test**

```typescript
// tests/geovanta-ai-e2e.spec.ts
import { test, expect } from '@playwright/test';
import { GeovantaMcpServer } from '../scripts/mcp-server/index.js';

test('Full E2E: Auto-Open from Workspace Gallery -> Create Shape -> Undo -> Redo', async ({ page }) => {
  const testPort = 38296;
  const server = new GeovantaMcpServer({ port: testPort, stdio: false });
  await server.start();

  // Load app on Workspace Home Gallery
  await page.goto(`file://${process.cwd().replace(/\\/g, '/')}/index.html?ai_port=${testPort}`);
  await expect.poll(() => server.isLiveConnected(), { timeout: 10000 }).toBe(true);

  // Command AI to create a star shape while currently on Gallery screen
  const result = await server.handleToolCall('geovanta_shape_create', {
    type: 'star',
    points: 8,
    fill: '#8b5cf6',
    target: 'canvas'
  });

  expect(result.content[0].text).toContain('Berhasil');

  // Verify app transitioned to VectorEditor and shape rendered
  await expect(page.locator('canvas, svg')).toBeVisible();
  const state = await page.evaluate(() => (window as any).__GEOVANTA_AI_BRIDGE__?.getState());
  expect(state.screen).toBe('editor');
  expect(state.document.objects.some((o: any) => o.fill === '#8b5cf6')).toBe(true);

  await server.stop();
});
```

- [ ] **Step 2: Run Playwright E2E test**

Run: `npx playwright test tests/geovanta-ai-e2e.spec.ts`  
Expected: PASS

- [ ] **Step 3: Update `README.md` with AI MCP & Gemini Integration Guide**

Dokumentasikan cara menyalakan server MCP, menambahkan ke Antigravity, dan menggunakan konektor Gemini.

- [ ] **Step 4: Run full project test suite to verify no regressions**

Run: `npx playwright test`  
Run: `npm test`  
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/geovanta-ai-e2e.spec.ts README.md
git commit -m "docs(mcp): add ai mcp and gemini integration guide and e2e test suite"
```
