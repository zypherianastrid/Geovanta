/**
 * @file scripts/mcp-server/index.js
 * @description Geovanta MCP Server Core & Local WebSocket Hub
 * Provides Model Context Protocol (MCP) tool exposure and real-time WebSocket orchestration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { TOOL_DEFINITIONS } = require('./tools.js');
const {
  createShape,
  parseSVG,
  serializeDoc,
  simplifyCurves,
  booleanOperation,
  applyCornerFillet
} = require('./engineAdapter.js');

class GeovantaMcpServer {
  /**
   * @param {Object} options
   * @param {number} [options.port=38291] - WebSocket & HTTP port
   * @param {string} [options.host='127.0.0.1'] - Local bind host
   * @param {boolean} [options.stdio=false] - Whether to activate stdio JSON-RPC loop
   * @param {string} [options.oauthClientId] - Static OAuth Client ID for Gemini Custom MCP
   * @param {string} [options.oauthClientSecret] - Static OAuth Client Secret for Gemini Custom MCP
   */
  constructor({
    port = 38291,
    host,
    stdio = false,
    oauthClientId,
    oauthClientSecret
  } = {}) {
    this.port = Number(process.env.GEOVANTA_PORT || process.env.PORT || port);
    this.host = host || process.env.GEOVANTA_HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
    this.stdio = stdio;

    this.oauthClientId = oauthClientId || process.env.GEOVANTA_OAUTH_CLIENT_ID || 'geovanta-gemini-client';
    this.oauthClientSecret = oauthClientSecret || process.env.GEOVANTA_OAUTH_CLIENT_SECRET || 'geovanta-gemini-secret';

    this.oauthClients = new Map([
      [
        this.oauthClientId,
        {
          client_id: this.oauthClientId,
          client_secret: this.oauthClientSecret,
          client_name: 'Google Gemini Custom MCP Connector'
        }
      ]
    ]);
    this.oauthCodes = new Map();
    this.oauthTokens = new Map();
    this.mcpSessions = new Set();

    this.httpServer = null;
    this.wss = null;
    this.clients = new Set();
    this.activeClient = null;

    this.reqSeq = 0;
    this.pendingRequests = new Map();
    this.httpBridgeClients = new Map();
    this.httpBridgeCommands = [];
    this.httpBridgePending = new Map();
    this.isStopping = false;
  }

  /**
   * Creates a stateless HMAC-signed OAuth 2.1 authorization code so serverless / multi-instance deployments verify PKCE without shared RAM
   * @param {Object} meta
   * @returns {string}
   */
  createSignedAuthCode(meta) {
    const payloadObj = {
      c: meta.codeChallenge || '',
      m: meta.codeChallengeMethod || (meta.codeChallenge ? 'S256' : ''),
      u: meta.redirectUri || '',
      i: meta.clientId || this.oauthClientId,
      t: Date.now(),
      n: crypto.randomBytes(6).toString('hex')
    };
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.oauthClientSecret)
      .update(payloadB64)
      .digest('base64url');
    const code = `gvcode.${payloadB64}.${sig}`;
    this.oauthCodes.set(code, meta);
    return code;
  }

  /**
   * Verifies either an in-memory or stateless HMAC-signed authorization code
   * @param {string} code
   * @returns {Object|null}
   */
  verifySignedAuthCode(code) {
    if (!code || typeof code !== 'string') return null;
    if (this.oauthCodes.has(code)) {
      const rec = this.oauthCodes.get(code);
      this.oauthCodes.delete(code);
      return rec;
    }
    if (code.startsWith('gvcode.')) {
      const parts = code.split('.');
      if (parts.length === 3) {
        const [, payloadB64, sig] = parts;
        const expectedSig = crypto
          .createHmac('sha256', this.oauthClientSecret)
          .update(payloadB64)
          .digest('base64url');
        if (sig === expectedSig) {
          try {
            const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
            return {
              clientId: parsed.i,
              redirectUri: parsed.u,
              codeChallenge: parsed.c,
              codeChallengeMethod: parsed.m
            };
          } catch (_) {
            return null;
          }
        }
      }
    }
    return null;
  }

  /**
   * Resolves public base URL honoring reverse-proxy headers (Cloudflare Tunnel, ngrok, Cloud Run, Railway)
   * @param {http.IncomingMessage} req
   * @returns {string}
   */
  resolvePublicBaseUrl(req) {
    const rawProto = req.headers['x-forwarded-proto'] || 'http';
    const proto = String(rawProto).split(',')[0].trim() || 'http';
    const rawHost = req.headers['x-forwarded-host'] || req.headers.host || `${this.host}:${this.port}`;
    const hostHeader = String(rawHost).split(',')[0].trim();
    return `${proto}://${hostHeader}`;
  }

  /**
   * Helper to read request body as string
   * @param {http.IncomingMessage} req
   * @returns {Promise<string>}
   */
  _readBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * Starts HTTP/WebSocket server and stdio loop if enabled
   * @returns {Promise<void>}
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        const rootDir = path.resolve(__dirname, '..', '..');
        const webDir = path.join(rootDir, 'web');

        const MIME_TYPES = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml; charset=utf-8',
          '.wasm': 'application/wasm',
          '.ttf': 'font/ttf',
          '.txt': 'text/plain; charset=utf-8'
        };

        this.httpServer = http.createServer(async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
          res.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, Mcp-Session-Id, Accept, Last-Event-Id, X-Forwarded-Proto, X-Forwarded-Host'
          );
          res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

          if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
          }

          const rawUrl = req.url || '/';
          const [rawPath, rawQuery = ''] = rawUrl.split('?');
          let reqPath = rawPath.replace(/\/+$/, '') || '/';
          const baseUrl = this.resolvePublicBaseUrl(req);

          // 1. OAuth 2.1 Protected Resource Metadata (RFC 9728 / MCP Auth Spec)
          if (
            req.method === 'GET' &&
            (reqPath === '/.well-known/oauth-protected-resource' ||
              reqPath === '/.well-known/oauth-protected-resource/mcp')
          ) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(
              JSON.stringify({
                resource: `${baseUrl}/mcp`,
                authorization_servers: [baseUrl],
                bearer_methods_supported: ['header'],
                scopes_supported: ['mcp', 'read', 'write']
              })
            );
            return;
          }

          // 2. OAuth 2.1 Authorization Server Metadata (RFC 8414 / OpenID Discovery)
          if (
            req.method === 'GET' &&
            (reqPath === '/.well-known/oauth-authorization-server' ||
              reqPath === '/.well-known/openid-configuration')
          ) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(
              JSON.stringify({
                issuer: baseUrl,
                authorization_endpoint: `${baseUrl}/oauth/authorize`,
                token_endpoint: `${baseUrl}/oauth/token`,
                registration_endpoint: `${baseUrl}/oauth/register`,
                response_types_supported: ['code'],
                grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
                token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
                code_challenge_methods_supported: ['S256', 'plain'],
                scopes_supported: ['mcp', 'read', 'write']
              })
            );
            return;
          }

          // 3. Dynamic Client Registration (RFC 7591 - POST /oauth/register)
          if (req.method === 'POST' && reqPath === '/oauth/register') {
            try {
              const bodyStr = await this._readBody(req);
              const payload = bodyStr ? JSON.parse(bodyStr) : {};
              const clientId = `geovanta-dcr-${crypto.randomBytes(8).toString('hex')}`;
              const clientSecret = `geovanta-sec-${crypto.randomBytes(16).toString('hex')}`;
              const clientMeta = {
                client_id: clientId,
                client_secret: clientSecret,
                client_id_issued_at: Math.floor(Date.now() / 1000),
                client_secret_expires_at: 0,
                client_name: payload.client_name || 'Google Gemini MCP Client',
                redirect_uris: Array.isArray(payload.redirect_uris) ? payload.redirect_uris : [],
                grant_types: payload.grant_types || ['authorization_code', 'refresh_token'],
                response_types: payload.response_types || ['code'],
                token_endpoint_auth_method: payload.token_endpoint_auth_method || 'none'
              };
              this.oauthClients.set(clientId, clientMeta);
              res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify(clientMeta));
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'invalid_client_metadata', error_description: e.message }));
            }
            return;
          }

          // 4. OAuth 2.1 Authorization Endpoint (GET/POST /oauth/authorize)
          if ((req.method === 'GET' || req.method === 'POST') && reqPath === '/oauth/authorize') {
            try {
              let params = new URLSearchParams(rawQuery);
              if (req.method === 'POST') {
                const bodyStr = await this._readBody(req);
                const postParams = new URLSearchParams(bodyStr);
                for (const [k, v] of postParams.entries()) {
                  params.set(k, v);
                }
              }

              const clientId = params.get('client_id') || this.oauthClientId;
              const redirectUri = params.get('redirect_uri');
              const state = params.get('state') || '';
              const codeChallenge = params.get('code_challenge') || '';
              const codeChallengeMethod = params.get('code_challenge_method') || (codeChallenge ? 'S256' : '');
              const scope = params.get('scope') || 'mcp read write';

              if (!redirectUri) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'invalid_request', error_description: 'Missing redirect_uri' }));
                return;
              }

              const code = this.createSignedAuthCode({
                clientId,
                redirectUri,
                codeChallenge,
                codeChallengeMethod,
                scope,
                createdAt: Date.now()
              });

              const targetUrl = new URL(redirectUri);
              targetUrl.searchParams.set('code', code);
              if (state) {
                targetUrl.searchParams.set('state', state);
              }

              res.writeHead(302, {
                Location: targetUrl.toString(),
                'Cache-Control': 'no-store'
              });
              res.end();
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'invalid_request', error_description: e.message }));
            }
            return;
          }

          // 5. OAuth 2.1 Token Exchange Endpoint (POST /oauth/token)
          if (req.method === 'POST' && reqPath === '/oauth/token') {
            try {
              const bodyStr = await this._readBody(req);
              const contentType = (req.headers['content-type'] || '').toLowerCase();
              let params = {};
              if (contentType.includes('application/json')) {
                params = bodyStr ? JSON.parse(bodyStr) : {};
              } else {
                const sp = new URLSearchParams(bodyStr);
                for (const [k, v] of sp.entries()) {
                  params[k] = v;
                }
              }

              const grantType = params.grant_type || 'authorization_code';

              if (grantType === 'authorization_code') {
                const code = params.code;
                const codeRecord = this.verifySignedAuthCode(code);
                if (!codeRecord) {
                  res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                  res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }));
                  return;
                }

                if (codeRecord.codeChallenge) {
                  const verifier = params.code_verifier || '';
                  if (!verifier) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Missing PKCE code_verifier' }));
                    return;
                  }
                  const computed =
                    (codeRecord.codeChallengeMethod || 'S256').toUpperCase() === 'S256'
                      ? crypto.createHash('sha256').update(verifier).digest('base64url')
                      : verifier;
                  if (computed !== codeRecord.codeChallenge) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'PKCE code_verifier mismatch' }));
                    return;
                  }
                }
              } else if (grantType === 'refresh_token') {
                if (!params.refresh_token) {
                  res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                  res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Missing refresh_token' }));
                  return;
                }
              }

              const accessToken = `geovanta_at_${crypto.randomBytes(24).toString('hex')}`;
              const refreshToken = `geovanta_rt_${crypto.randomBytes(24).toString('hex')}`;
              this.oauthTokens.set(accessToken, { createdAt: Date.now() });

              res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
              });
              res.end(
                JSON.stringify({
                  access_token: accessToken,
                  token_type: 'Bearer',
                  expires_in: 3600,
                  refresh_token: refreshToken,
                  scope: 'mcp read write'
                })
              );
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'invalid_request', error_description: e.message }));
            }
            return;
          }

          // 5b. HTTP Live Cloud Bridge Endpoint (POST /mcp/bridge or /api/mcp/bridge)
          if (req.method === 'POST' && (reqPath === '/mcp/bridge' || reqPath === '/api/mcp/bridge')) {
            try {
              const bodyStr = await this._readBody(req);
              const payload = bodyStr ? JSON.parse(bodyStr) : {};
              const clientId = payload.clientId || 'default-http-client';
              const action = payload.action || 'poll';

              this.httpBridgeClients.set(clientId, {
                clientId,
                lastSeen: Date.now(),
                state: payload.state || this.httpBridgeClients.get(clientId)?.state || null
              });

              if (Array.isArray(payload.responses)) {
                for (const resp of payload.responses) {
                  if (resp && resp.id !== undefined && this.httpBridgePending.has(resp.id)) {
                    const pending = this.httpBridgePending.get(resp.id);
                    clearTimeout(pending.timer);
                    this.httpBridgePending.delete(resp.id);
                    if (resp.error) {
                      pending.reject(new Error(resp.error.message || String(resp.error)));
                    } else {
                      pending.resolve(resp.result);
                    }
                  }
                }
              }

              let commandsToDeliver = [];
              if (action === 'poll' && this.httpBridgeCommands.length > 0) {
                commandsToDeliver = this.httpBridgeCommands.splice(0, this.httpBridgeCommands.length);
              }

              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(
                JSON.stringify({
                  status: 'ok',
                  clientId,
                  commands: commandsToDeliver,
                  serverTime: Date.now()
                })
              );
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
            return;
          }

          // 6. Streamable HTTP MCP Endpoint (/mcp, /api/mcp, and POST / fallback if user omitted /mcp)
          if (reqPath === '/mcp' || reqPath === '/api/mcp' || (reqPath === '/' && req.method === 'POST')) {
            let sessionId = req.headers['mcp-session-id'];
            if (!sessionId) {
              sessionId = `geovanta-sess-${crypto.randomBytes(12).toString('hex')}`;
            }
            this.mcpSessions.add(sessionId);
            res.setHeader('Mcp-Session-Id', sessionId);

            if (req.method === 'DELETE') {
              this.mcpSessions.delete(sessionId);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ status: 'terminated', sessionId }));
              return;
            }

            if (req.method === 'GET') {
              const accept = (req.headers.accept || '').toLowerCase();
              if (accept.includes('text/event-stream')) {
                res.writeHead(200, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive'
                });
                res.write(':\n\n');
                req.on('close', () => {
                  try {
                    res.end();
                  } catch (_) {}
                });
                return;
              }
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(
                JSON.stringify({
                  name: 'geovanta-mcp-server',
                  version: '1.2.0',
                  transport: 'streamable-http',
                  endpoint: '/mcp',
                  liveConnected: this.isLiveConnected(),
                  status: 'ready'
                })
              );
              return;
            }

            if (req.method === 'POST') {
              try {
                const body = await this._readBody(req);
                const msg = JSON.parse(body);

                if (Array.isArray(msg)) {
                  const results = [];
                  for (const item of msg) {
                    const r = await this.processJsonRpcMessage(item);
                    if (r !== null) results.push(r);
                  }
                  if (results.length === 0) {
                    res.writeHead(202);
                    res.end();
                  } else {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(results));
                  }
                  return;
                }

                const resData = await this.processJsonRpcMessage(msg);
                if (resData === null && msg.id === undefined) {
                  if (reqPath === '/mcp') {
                    res.writeHead(202);
                    res.end();
                  } else {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ jsonrpc: '2.0', id: null, result: {} }));
                  }
                  return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(resData || { jsonrpc: '2.0', id: msg.id, result: {} }));
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: e.message } }));
              }
              return;
            }
          }

          if (reqPath === '/' || reqPath === '') {
            reqPath = '/index.html';
          }

          let filePath = path.join(webDir, reqPath.replace(/^\//, ''));
          if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            const rootCandidate = path.join(rootDir, reqPath.replace(/^\//, ''));
            if (fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isFile()) {
              filePath = rootCandidate;
            }
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
          }
        });

        this.wss = new WebSocketServer({
          server: this.httpServer
        });

        this.httpServer.on('error', err => {
          reject(err);
        });

        this.wss.on('error', err => {
          reject(err);
        });

        this.httpServer.listen(this.port, () => {
          process.stderr.write(`[Geovanta MCP] Server ready on http://127.0.0.1:${this.port} and ws://127.0.0.1:${this.port}\n`);
          if (this.stdio) {
            this._setupStdio();
          }
          resolve();
        });

        this.wss.on('connection', ws => {
          this.clients.add(ws);
          this.activeClient = ws;
          process.stderr.write(`[Geovanta MCP] Geovanta browser client connected! (Total active: ${this.clients.size})\n`);

          ws.on('message', data => {
            try {
              const msg = JSON.parse(data.toString());
              if (msg && msg.id !== undefined && this.pendingRequests.has(msg.id)) {
                const { resolve: reqResolve, reject: reqReject, timer } = this.pendingRequests.get(msg.id);
                clearTimeout(timer);
                this.pendingRequests.delete(msg.id);

                if (msg.error) {
                  reqReject(new Error(msg.error.message || 'Live client error'));
                } else {
                  reqResolve(msg.result);
                }
              }
            } catch (err) {
              // Ignore non-json or malformed frames from client
            }
          });

          ws.on('close', () => {
            this.clients.delete(ws);
            if (this.activeClient === ws) {
              const remaining = Array.from(this.clients);
              this.activeClient = remaining.length ? remaining[remaining.length - 1] : null;
            }
          });

          ws.on('error', () => {
            this.clients.delete(ws);
            if (this.activeClient === ws) {
              const remaining = Array.from(this.clients);
              this.activeClient = remaining.length ? remaining[remaining.length - 1] : null;
            }
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Gracefully shuts down WebSocket server and disconnects clients
   * @returns {Promise<void>}
   */
  async stop() {
    this.isStopping = true;

    // Reject all pending requests
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error('Server shutting down'));
      this.pendingRequests.delete(id);
    }
    for (const [id, req] of this.httpBridgePending.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error('Server shutting down'));
      this.httpBridgePending.delete(id);
    }

    // Close all clients
    for (const client of this.clients) {
      try {
        client.terminate();
      } catch (_) {}
    }
    this.clients.clear();
    this.activeClient = null;

    if (!this.wss && !this.httpServer) return;

    return new Promise(resolve => {
      const finishHttp = () => {
        if (this.httpServer) {
          this.httpServer.close(() => {
            this.httpServer = null;
            resolve();
          });
        } else {
          resolve();
        }
      };

      if (this.wss) {
        this.wss.close(() => {
          this.wss = null;
          finishHttp();
        });
      } else {
        finishHttp();
      }
    });
  }

  /**
   * Returns list of supported MCP tool definitions
   */
  getToolList() {
    return TOOL_DEFINITIONS;
  }

  /**
   * Returns true if an HTTP Cloud Bridge client polled recently (within 15 seconds)
   * @returns {boolean}
   */
  isHttpBridgeConnected() {
    const now = Date.now();
    for (const [cid, info] of this.httpBridgeClients.entries()) {
      if (now - info.lastSeen < 15000) {
        return true;
      } else {
        this.httpBridgeClients.delete(cid);
      }
    }
    return false;
  }

  /**
   * Returns true if at least one Geovanta client is connected (via WebSocket or HTTP Cloud Bridge)
   * @returns {boolean}
   */
  isLiveConnected() {
    const wsConnected =
      this.clients.size > 0 &&
      this.activeClient !== null &&
      this.activeClient.readyState === WebSocket.OPEN;
    return wsConnected || this.isHttpBridgeConnected();
  }

  /**
   * Sends JSON-RPC message to active live Geovanta client (WebSocket or HTTP Bridge) and waits for response
   * @param {string} method
   * @param {Object} [params={}]
   * @param {number} [timeoutMs=8000]
   * @returns {Promise<any>}
   */
  async sendLiveMessage(method, params = {}, timeoutMs = 8000) {
    if (!this.isLiveConnected()) {
      throw new Error('No live Geovanta client connected');
    }

    const id = ++this.reqSeq;
    const wsConnected =
      this.clients.size > 0 &&
      this.activeClient !== null &&
      this.activeClient.readyState === WebSocket.OPEN;

    if (wsConnected) {
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      });

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Timeout waiting for Geovanta client response (method: ${method})`));
        }, timeoutMs);

        this.pendingRequests.set(id, { resolve, reject, timer });

        try {
          this.activeClient.send(message);
        } catch (err) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          reject(err);
        }
      });
    }

    // Route over HTTP Live Cloud Bridge
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.httpBridgePending.delete(id);
        reject(new Error(`Timeout waiting for Geovanta HTTP bridge response (method: ${method})`));
      }, timeoutMs);

      this.httpBridgePending.set(id, { resolve, reject, timer });
      this.httpBridgeCommands.push({
        id,
        method,
        params,
        createdAt: Date.now()
      });
    });
  }

  /**
   * Executes MCP tool call in Dual-Mode (live canvas mutation or headless fallback)
   * @param {string} name - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<{ content: Array<{ type: string, text: string }>, isError?: boolean }>}
   */
  async handleToolCall(name, args = {}) {
    try {
      switch (name) {
        case 'geovanta_status': {
          const statusReport = {
            status: 'running',
            port: this.port,
            host: this.host,
            liveConnected: this.isLiveConnected(),
            wsClients: this.clients.size,
            httpBridgeClients: this.httpBridgeClients.size,
            toolsAvailable: TOOL_DEFINITIONS.length
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(statusReport, null, 2) }]
          };
        }

        case 'geovanta_workspace_manage': {
          if (!this.isLiveConnected()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Tidak ada tab Geovanta yang sedang aktif. Silakan buka Geovanta di browser Anda terlebih dahulu.'
                }
              ],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('workspaceManage', args);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_text_create': {
          if (this.isLiveConnected()) {
            const res = await this.sendLiveMessage('textCreate', args);
            return {
              content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
            };
          }
          const x = Number(args.x ?? 100);
          const y = Number(args.y ?? 150);
          const fontSize = Number(args.fontSize ?? 48);
          const fill = args.fill || '#111827';
          const fontFamily = args.fontFamily || 'Geovanta Sans';
          const escaped = String(args.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}">${escaped}</text></svg>`;
          return {
            content: [{ type: 'text', text: svg }]
          };
        }

        case 'geovanta_iconify_insert': {
          if (!this.isLiveConnected()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Tidak ada tab Geovanta yang sedang aktif untuk menyisipkan ikon Iconify.'
                }
              ],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('iconifyInsert', args);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_layer_manage': {
          if (!this.isLiveConnected()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Tidak ada tab Geovanta yang sedang aktif untuk mengelola layer.'
                }
              ],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('layerManage', args);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_artboard_and_view': {
          if (!this.isLiveConnected()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Tidak ada tab Geovanta yang sedang aktif untuk mengatur artboard/view.'
                }
              ],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('artboardAndView', args);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_shape_create': {
          const shape = createShape(args);
          const target = args.target || (this.isLiveConnected() ? 'canvas' : 'svg');

          if (target === 'canvas' && this.isLiveConnected()) {
            await this.sendLiveMessage('mutateCanvas', {
              action: `Create ${args.type || 'Shape'}`,
              objects: [shape],
              replaceAll: false
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Berhasil membuat bentuk ${args.type || 'shape'} di kanvas aktif. Objek ID: ${shape.id}`
                }
              ]
            };
          } else {
            // Headless SVG mode
            const w = Math.max(
              200,
              args.width ? Number(args.width) : args.radius ? Number(args.radius) * 2 : 100
            );
            const h = Math.max(
              200,
              args.height ? Number(args.height) : args.radius ? Number(args.radius) * 2 : 100
            );
            const doc = {
              id: `doc-${Date.now()}`,
              artboard: { w: Math.max(800, w * 2), h: Math.max(600, h * 2), bg: '#ffffff' },
              objects: [shape],
              selection: []
            };
            const svg = serializeDoc(doc);
            return {
              content: [{ type: 'text', text: svg }]
            };
          }
        }

        case 'geovanta_curve_simplify': {
          if (args.svgString) {
            const parsed = parseSVG(args.svgString);
            const simplified = simplifyCurves(parsed, { level: args.level, tolerance: args.tolerance });
            const svg = serializeDoc(simplified.doc);
            return {
              content: [{ type: 'text', text: svg }]
            };
          } else if (this.isLiveConnected()) {
            const liveRes = await this.sendLiveMessage('simplifyCurves', {
              level: args.level,
              tolerance: args.tolerance
            });
            return {
              content: [{ type: 'text', text: JSON.stringify(liveRes, null, 2) }]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: svgString is required when Geovanta application is not connected.'
                }
              ],
              isError: true
            };
          }
        }

        case 'geovanta_boolean_operation': {
          if (args.svgString) {
            const parsed = parseSVG(args.svgString);
            const boolDoc = booleanOperation(parsed, args.op);
            const svg = serializeDoc(boolDoc);
            return {
              content: [{ type: 'text', text: svg }]
            };
          } else if (this.isLiveConnected()) {
            const liveRes = await this.sendLiveMessage('booleanOperation', { op: args.op });
            return {
              content: [{ type: 'text', text: JSON.stringify(liveRes, null, 2) }]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: svgString is required when Geovanta application is not connected.'
                }
              ],
              isError: true
            };
          }
        }

        case 'geovanta_corner_fillet': {
          if (args.svgString) {
            const parsed = parseSVG(args.svgString);
            const filletedDoc = applyCornerFillet(parsed, args.radius, { mode: args.mode });
            const svg = serializeDoc(filletedDoc);
            return {
              content: [{ type: 'text', text: svg }]
            };
          } else if (this.isLiveConnected()) {
            const liveRes = await this.sendLiveMessage('cornerFillet', {
              radius: args.radius,
              mode: args.mode
            });
            return {
              content: [{ type: 'text', text: JSON.stringify(liveRes, null, 2) }]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: svgString is required when Geovanta application is not connected.'
                }
              ],
              isError: true
            };
          }
        }

        case 'geovanta_recolor': {
          if (args.svgString) {
            const parsed = parseSVG(args.svgString);
            const { find, replace, palette } = args;

            for (const obj of parsed.objects) {
              if (find && replace) {
                if (obj.fill && obj.fill.toLowerCase() === find.toLowerCase()) {
                  obj.fill = replace;
                }
                if (obj.stroke && obj.stroke.toLowerCase() === find.toLowerCase()) {
                  obj.stroke = replace;
                }
              }
              if (palette && Array.isArray(palette) && palette.length) {
                obj.fill = palette[0];
              }
            }

            const svg = serializeDoc(parsed);
            return {
              content: [{ type: 'text', text: svg }]
            };
          } else if (this.isLiveConnected()) {
            const liveRes = await this.sendLiveMessage('recolor', args);
            return {
              content: [{ type: 'text', text: JSON.stringify(liveRes, null, 2) }]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: svgString is required when Geovanta application is not connected.'
                }
              ],
              isError: true
            };
          }
        }

        case 'geovanta_svg_parse': {
          const doc = parseSVG(args.svgString);
          return {
            content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }]
          };
        }

        case 'geovanta_svg_serialize': {
          const svg = serializeDoc(args.doc);
          return {
            content: [{ type: 'text', text: svg }]
          };
        }

        case 'geovanta_live_get_canvas': {
          if (!this.isLiveConnected()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: No Geovanta client connected. Please open Geovanta Vector Studio.'
                }
              ],
              isError: true
            };
          }
          const state = await this.sendLiveMessage('getCanvasState', {});
          return {
            content: [{ type: 'text', text: JSON.stringify(state, null, 2) }]
          };
        }

        case 'geovanta_live_mutate_canvas': {
          if (!this.isLiveConnected()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: No Geovanta client connected. Please open Geovanta Vector Studio.'
                }
              ],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('mutateCanvas', {
            action: args.action,
            objects: args.objects,
            replaceAll: args.replaceAll
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_live_select_objects': {
          if (!this.isLiveConnected()) {
            return {
              content: [{ type: 'text', text: 'Error: No Geovanta client connected.' }],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('selectObjects', { ids: args.ids });
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_live_export': {
          if (!this.isLiveConnected()) {
            return {
              content: [{ type: 'text', text: 'Error: No Geovanta client connected.' }],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('exportCanvas', {
            format: args.format || 'svg'
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_live_screenshot': {
          if (!this.isLiveConnected()) {
            return {
              content: [{ type: 'text', text: 'Error: No Geovanta client connected.' }],
              isError: true
            };
          }
          const res = await this.sendLiveMessage('captureScreenshot', {});
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_charts_create': {
          if (!this.isLiveConnected()) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'headless', chartType: args.chartType, title: args.title || '' }) }]
            };
          }
          const res = await this.sendLiveMessage('createChart', args);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_effects_apply': {
          if (!this.isLiveConnected()) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'headless', objectIds: args.objectIds, effects: args.effects }) }]
            };
          }
          const res = await this.sendLiveMessage('applyEffects', args);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        case 'geovanta_autolayout_apply': {
          if (!this.isLiveConnected()) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'headless', frameId: args.frameId, dir: args.dir || 'row' }) }]
            };
          }
          const res = await this.sendLiveMessage('applyAutoLayout', args);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }]
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Tool execution error: ${err.message}` }],
        isError: true
      };
    }
  }

  /**
   * Processes a standard JSON-RPC 2.0 message
   * @param {Object} message
   * @returns {Promise<Object|null>}
   */
  async processJsonRpcMessage(message) {
    if (!message || typeof message !== 'object') return null;

    const { id, method, params } = message;

    // Handle notifications (no id)
    if (id === undefined) {
      if (method === 'notifications/initialized') {
        // Initialized notification acknowledged
      }
      return null;
    }

    switch (method) {
      case 'initialize': {
        const reqVer = params && params.protocolVersion;
        const negotiatedVer =
          reqVer === '2025-03-26' || reqVer === '2024-11-05' ? reqVer : '2024-11-05';
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: negotiatedVer,
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'geovanta-mcp-server',
              version: '1.2.0'
            }
          }
        };
      }

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {}
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.getToolList()
          }
        };

      case 'tools/call': {
        const toolName = params && params.name;
        const toolArgs = (params && params.arguments) || {};
        const callResult = await this.handleToolCall(toolName, toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result: callResult
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }
  }

  /**
   * Internal stdio handling for MCP JSON-RPC 2.0 loop
   * @private
   */
  _setupStdio() {
    let buffer = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async chunk => {
      buffer += chunk;

      while (true) {
        // Content-Length framing support
        if (buffer.startsWith('Content-Length:')) {
          const headerEnd = buffer.indexOf('\r\n\r\n');
          if (headerEnd === -1) break;

          const match = buffer.match(/^Content-Length:\s*(\d+)\r\n\r\n/i);
          if (!match) break;

          const contentLength = parseInt(match[1], 10);
          const totalLen = match[0].length + contentLength;
          if (buffer.length < totalLen) break;

          const payload = buffer.slice(match[0].length, totalLen);
          buffer = buffer.slice(totalLen);

          await this._handleRawMessage(payload);
          continue;
        }

        // Newline-delimited framing support
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex === -1) break;

        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          await this._handleRawMessage(line);
        }
      }
    });
  }

  /**
   * @private
   */
  async _handleRawMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      const res = await this.processJsonRpcMessage(msg);
      if (res) {
        process.stdout.write(JSON.stringify(res) + '\n');
      }
    } catch (err) {
      process.stderr.write(`[Geovanta MCP] Malformed stdio message: ${err.message}\n`);
    }
  }
}

// CLI Execution entrypoint
if (require.main === module) {
  const port = Number(process.env.GEOVANTA_PORT || 38291);
  const server = new GeovantaMcpServer({ port, stdio: true });
  server.start().catch(err => {
    process.stderr.write(`Failed to start Geovanta MCP Server: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  GeovantaMcpServer
};
