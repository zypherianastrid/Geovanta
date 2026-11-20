# Google Gemini Web Custom MCP Connector (`/mcp` + OAuth 2.1 + Online/Localhost) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Geovanta Vector Studio to connect directly to Google Gemini Web's "Terhubung ke server MCP" (`https://.../mcp`) custom connector in both Scenario 1 (Localhost via HTTPS tunnel) and Scenario 2 (Deployed Online Web over `https://` / `wss://`).

**Architecture:** Extend `GeovantaMcpServer` in `scripts/mcp-server/index.js` with a standards-compliant MCP Streamable HTTP endpoint (`/mcp`), built-in OAuth 2.1 discovery (`/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`), Dynamic Client Registration (`POST /oauth/register`), PKCE authorization (`GET /oauth/authorize`), and token exchange (`POST /oauth/token`). Update `AiLiveConnector` in `src/bridge/aiLiveConnector.tsx` to automatically use `wss://` and host-default port when served over `https://`, and update `SettingsModal.tsx` to display the ready-to-copy `/mcp` URL, OAuth Client ID, Client Secret, and scenario instructions.

**Tech Stack:** Node.js (`http`, `crypto`, `ws`), React 18 + TypeScript, Playwright (`@playwright/test`).

**Spec:** `docs/superpowers/specs/2026-11-19-gemini-web-custom-mcp-oauth-design.md`

## Global Constraints

- Zero new external npm dependencies: use Node.js built-in `http`, `crypto`, `url`, and existing `ws`.
- All automated tests and verifications MUST strictly use Playwright Regular (`@playwright/test` via `npx playwright test`).
- Backward compatibility: existing `/api/mcp` endpoint, `stdio` JSON-RPC loop, and local `ws://127.0.0.1:38291` connections must continue working unchanged.
- Default static OAuth credentials: `clientId = process.env.GEOVANTA_OAUTH_CLIENT_ID || 'geovanta-gemini-client'`, `clientSecret = process.env.GEOVANTA_OAUTH_CLIENT_SECRET || 'geovanta-gemini-secret'`.

## Review Focus

1. Reverse-proxy HTTPS detection (`X-Forwarded-Proto: https` and `X-Forwarded-Host`) so OAuth discovery metadata (`/.well-known/oauth-authorization-server`) returns `https://...` URLs when accessed through Cloudflare Tunnel, ngrok, or Cloud Run.
2. JSON-RPC notification or batch array handling on `POST /mcp` (e.g., `notifications/initialized` returning HTTP 202 Accepted or valid JSON-RPC response without crashing).
3. OAuth 2.1 PKCE `S256` code challenge verification on `POST /oauth/token` when `code_verifier` is sent as `application/x-www-form-urlencoded` or `application/json`.
4. WebSocket URL resolution in `src/bridge/aiLiveConnector.tsx` when running on `https://example.com` (standard port 443 without `:38291` suffix) vs `http://127.0.0.1:38291` or `file://`.
5. CORS & MCP headers (`Mcp-Session-Id`, `Access-Control-Expose-Headers: Mcp-Session-Id`) on `/mcp` and `/.well-known/*` endpoints.

---

### Task 1: Streamable HTTP `/mcp` Endpoint & Built-in OAuth 2.1 Provider in `scripts/mcp-server/index.js`

**Files:**
- Modify: `scripts/mcp-server/index.js`
- Test: `tests/gemini-web-mcp-oauth.spec.ts`

**Interfaces:**
- Produces:
  - `new GeovantaMcpServer({ port, host, stdio, oauthClientId, oauthClientSecret })`
  - HTTP routes on `GeovantaMcpServer`:
    - `POST /mcp`, `GET /mcp`, `DELETE /mcp`, `OPTIONS /mcp` (plus `/api/mcp`)
    - `GET /.well-known/oauth-protected-resource`
    - `GET /.well-known/oauth-authorization-server`
    - `GET /.well-known/openid-configuration`
    - `POST /oauth/register`
    - `GET /oauth/authorize` & `POST /oauth/authorize`
    - `POST /oauth/token`

- [ ] **Step 1: Write the failing Playwright test `tests/gemini-web-mcp-oauth.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { GeovantaMcpServer } from '../scripts/mcp-server/index.js';

test.describe('Gemini Web Custom MCP Connector (/mcp Streamable HTTP & OAuth 2.1)', () => {
  let server: any;
  const TEST_PORT = 38298;
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  test.beforeAll(async () => {
    server = new GeovantaMcpServer({ port: TEST_PORT, stdio: false });
    await server.start();
  });

  test.afterAll(async () => {
    if (server) await server.stop();
  });

  test('exposes OAuth 2.1 discovery metadata with X-Forwarded-Proto https support', async () => {
    const res = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server`, {
      headers: {
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'geovanta-demo.trycloudflare.com'
      }
    });
    expect(res.status).toBe(200);
    const meta = await res.json();
    expect(meta.issuer).toBe('https://geovanta-demo.trycloudflare.com');
    expect(meta.authorization_endpoint).toBe('https://geovanta-demo.trycloudflare.com/oauth/authorize');
    expect(meta.token_endpoint).toBe('https://geovanta-demo.trycloudflare.com/oauth/token');
    expect(meta.registration_endpoint).toBe('https://geovanta-demo.trycloudflare.com/oauth/register');
    expect(meta.code_challenge_methods_supported).toContain('S256');
  });

  test('supports Dynamic Client Registration (POST /oauth/register) and full OAuth 2.1 PKCE S256 flow', async () => {
    // 1. Dynamic Client Registration
    const regRes = await fetch(`${BASE_URL}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Google Gemini',
        redirect_uris: ['https://vertexaisearch.cloud.google.com/oauth-redirect']
      })
    });
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    expect(regData.client_id).toBeTruthy();

    // 2. PKCE challenge
    const codeVerifier = 'geovanta_pkce_verifier_secret_string_1234567890';
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // 3. Authorize endpoint redirects with code and state
    const authUrl = `${BASE_URL}/oauth/authorize?response_type=code&client_id=${encodeURIComponent(regData.client_id)}&redirect_uri=${encodeURIComponent('https://vertexaisearch.cloud.google.com/oauth-redirect')}&state=xyz123&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
    const authRes = await fetch(authUrl, { redirect: 'manual' });
    expect(authRes.status).toBe(302);
    const location = authRes.headers.get('location') || '';
    expect(location).toContain('https://vertexaisearch.cloud.google.com/oauth-redirect');
    const redirectUrlObj = new URL(location);
    const code = redirectUrlObj.searchParams.get('code');
    expect(code).toBeTruthy();
    expect(redirectUrlObj.searchParams.get('state')).toBe('xyz123');

    // 4. Token exchange (application/x-www-form-urlencoded)
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: 'https://vertexaisearch.cloud.google.com/oauth-redirect',
      client_id: regData.client_id,
      code_verifier: codeVerifier
    });
    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });
    expect(tokenRes.status).toBe(200);
    const tokenData = await tokenRes.json();
    expect(tokenData.access_token).toBeTruthy();
    expect(tokenData.token_type).toBe('Bearer');
    expect(tokenData.refresh_token).toBeTruthy();
  });

  test('supports Streamable HTTP POST /mcp with Mcp-Session-Id, notifications, and tool execution', async () => {
    // 1. Initialize
    const initRes = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'gemini-web', version: '1.0.0' }
        }
      })
    });
    expect(initRes.status).toBe(200);
    const sessionId = initRes.headers.get('mcp-session-id');
    expect(sessionId).toBeTruthy();
    const initData = await initRes.json();
    expect(initData.result.serverInfo.name).toBe('geovanta-mcp-server');

    // 2. Notification (no id) returns 202
    const notifRes = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId!
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      })
    });
    expect([200, 202]).toContain(notifRes.status);

    // 3. Call tool via /mcp
    const callRes = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId!
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'geovanta_shape_create',
          arguments: { type: 'star', points: 5, target: 'svg', fill: '#10b981' }
        }
      })
    });
    expect(callRes.status).toBe(200);
    const callData = await callRes.json();
    expect(callData.result.content[0].text).toContain('<svg');
  });
});
```

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/gemini-web-mcp-oauth.spec.ts`
Expected: FAIL (404 on `/.well-known/oauth-authorization-server` and `/mcp`).

- [ ] **Step 3: Implement Streamable HTTP `/mcp` & Built-in OAuth 2.1 in `scripts/mcp-server/index.js`**

Update `scripts/mcp-server/index.js`:
- Support `process.env.PORT` in addition to `process.env.GEOVANTA_PORT` (default `38291`), and default `host` to `process.env.GEOVANTA_HOST || '0.0.0.0'` when `process.env.PORT` is set (for online cloud deployment) or `'127.0.0.1'` locally.
- Add `oauthClientId` (`process.env.GEOVANTA_OAUTH_CLIENT_ID || 'geovanta-gemini-client'`) and `oauthClientSecret` (`process.env.GEOVANTA_OAUTH_CLIENT_SECRET || 'geovanta-gemini-secret'`).
- Implement `resolvePublicBaseUrl(req)` checking `x-forwarded-proto` and `x-forwarded-host` / `host`.
- Implement OAuth 2.1 discovery endpoints (`/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, `/.well-known/openid-configuration`), DCR (`POST /oauth/register`), authorization (`GET` & `POST /oauth/authorize`), and token endpoint (`POST /oauth/token` with PKCE `S256` & `plain` verification and `refresh_token` grant).
- Implement Streamable HTTP `/mcp` (and `/api/mcp`) handling `POST` (single or batch JSON-RPC, returning `Mcp-Session-Id` header, HTTP 202 for notifications-only), `GET /mcp` (SSE stream or endpoint info), and `DELETE /mcp` (200 session termination).

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/gemini-web-mcp-oauth.spec.ts tests/mcp-server-protocol.spec.ts`
Expected: PASS

---

### Task 2: Upgrade `src/bridge/aiLiveConnector.tsx` for Online Web (`wss://`) & Localhost Compatibility

**Files:**
- Modify: `src/bridge/aiLiveConnector.tsx`
- Test: `tests/gemini-web-mcp-oauth.spec.ts`

**Interfaces:**
- Produces:
  - `aiLiveConnector.buildWsUrl(isRetry?: boolean): string`
  - Automatic `wss://` when page is loaded over `https:`, using `window.location.host` when on `https:` unless `?ai_port=` or `?ai_ws=` is explicitly specified.

- [ ] **Step 1: Add WebSocket URL resolution tests in `tests/gemini-web-mcp-oauth.spec.ts`**

Add a test verifying that `aiLiveConnector.resolveWsUrl({ protocol: 'https:', hostname: 'geovanta.up.railway.app', port: '', search: '?ai=1' })` produces `'wss://geovanta.up.railway.app'` and for `http://127.0.0.1:38291/?ai=1` produces `'ws://127.0.0.1:38291'`.

- [ ] **Step 2: Run Playwright test to verify it fails**

Run: `npx playwright test tests/gemini-web-mcp-oauth.spec.ts`
Expected: FAIL (`resolveWsUrl` not defined).

- [ ] **Step 3: Implement `resolveWsUrl` and `wss://` support in `src/bridge/aiLiveConnector.tsx`**

In `src/bridge/aiLiveConnector.tsx`:
- Add `public resolveWsUrl(loc?: { protocol?: string; hostname?: string; host?: string; port?: string; search?: string }, isRetry: boolean = false): string`:
  - If `search` has `?ai_ws=wss://...`, return that URL directly.
  - If `loc.protocol === 'https:'`:
    - If `search` has explicit `ai_port`, return `wss://${hostname}:${ai_port}`.
    - Otherwise return `wss://${loc.host || loc.hostname}` (so standard HTTPS port 443 reverse proxies on Cloud Run, Railway, Render, Cloudflare Tunnel, and ngrok work seamlessly without `:38291`).
  - Otherwise (`http:` or `file:`): return `ws://${host}:${this.port}`.
- Use `this.resolveWsUrl(window.location, isRetry)` in `connect()`.

- [ ] **Step 4: Run Playwright test to verify it passes**

Run: `npx playwright test tests/gemini-web-mcp-oauth.spec.ts tests/ai-live-connector.spec.ts`
Expected: PASS

---

### Task 3: Add Google Gemini Web Custom MCP Connector Section in `src/components/modals/SettingsModal.tsx`

**Files:**
- Modify: `src/components/modals/SettingsModal.tsx`
- Modify: `tests/settings-ai-tab.spec.ts`

**Interfaces:**
- Produces:
  - UI section `Google Gemini Web (Konektor Server MCP Kustom)` in `[data-testid="settings-ai-tab"]` displaying:
    - Dynamic **URL Server MCP** (`https://<domain-atau-tunnel>/mcp` or current origin `/mcp` when on `https://`)
    - **Client ID OAuth**: `geovanta-gemini-client` (with copy button)
    - **Rahasia klien OAuth**: `geovanta-gemini-secret` (with copy button)
    - Step-by-step tabs/guide for **Skenario 1 (Localhost via Cloudflare Tunnel / ngrok)** and **Skenario 2 (Geovanta Web Online)**.

- [ ] **Step 1: Update `tests/settings-ai-tab.spec.ts` with assertions for the new Gemini Web Custom MCP section**

Check that `text=Google Gemini Web (Konektor Server MCP)` and `text=geovanta-gemini-client` and `text=/mcp` are visible in the AI & MCP tab.

- [ ] **Step 2: Implement the UI section in `src/components/modals/SettingsModal.tsx` and rebuild bundle (`npm run build:web`)**

Update `src/components/modals/SettingsModal.tsx` and run `npm run build:web`.

- [ ] **Step 3: Run Playwright test `tests/settings-ai-tab.spec.ts`**

Run: `npx playwright test tests/settings-ai-tab.spec.ts`
Expected: PASS
