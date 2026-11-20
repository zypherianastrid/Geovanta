/**
 * @file netlify/functions/mcp.js
 * @description Netlify Serverless Function for Geovanta MCP Server, OAuth 2.1, & Live Cloud HTTP Bridge (/mcp/bridge)
 * Allows https://geovanta.netlify.app/mcp to control the live https://geovanta.netlify.app browser app in real time!
 */

const crypto = require('crypto');
const { connectLambda, getDeployStore, getStore } = require('@netlify/blobs');
const { TOOL_DEFINITIONS } = require('../../scripts/mcp-server/tools.js');

let _engine = null;
function getEngine() {
  if (!_engine) {
    _engine = require('../../scripts/mcp-server/engineAdapter.js');
  }
  return _engine;
}

const OAUTH_CLIENT_ID = process.env.GEOVANTA_OAUTH_CLIENT_ID || 'geovanta-gemini-client';
const OAUTH_CLIENT_SECRET = process.env.GEOVANTA_OAUTH_CLIENT_SECRET || 'geovanta-gemini-secret';

// In-memory fallback bridge store (used in local tests or warm same-instance invocations)
const memStore = new Map();

let lastBlobError = null;

function getBridgeStore(event) {
  const hasBlobs = Boolean((event && event.blobs) || process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext);
  if (hasBlobs) {
    try {
      let region = 'us-east-2';
      if (event && event.blobs) {
        connectLambda(event);
        try {
          const rawData = Buffer.from(event.blobs, 'base64').toString('utf8');
          const data = JSON.parse(rawData);
          if (data && data.primary_region) region = data.primary_region;
        } catch (_) {}
      }
      const uncachedFetch = (url, opts = {}) => {
        const m = String(opts.method || 'GET').toUpperCase();
        if (m === 'GET' && String(url).includes('/region:')) {
          const u = new URL(url.toString());
          u.searchParams.set('_nc', `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
          return globalThis.fetch(u.toString(), opts);
        }
        return globalThis.fetch(url, opts);
      };
      let store = null;
      try {
        store = getDeployStore({
          name: 'geovanta-live-bridge',
          region,
          fetch: uncachedFetch
        });
      } catch (_) {
        store = getStore({
          name: 'geovanta-live-bridge',
          region,
          fetch: uncachedFetch
        });
      }
      return {
        isCloudStore: true,
        async getJSON(key) {
          try {
            const val = await store.get(key, { type: 'json' });
            if (val !== null && val !== undefined) return val;
          } catch (e) {
            lastBlobError = `get(${key}): ${e.message}`;
          }
          return memStore.get(key) || null;
        },
        async setJSON(key, val) {
          memStore.set(key, val);
          try {
            await store.setJSON(key, val);
          } catch (e) {
            lastBlobError = `setJSON(${key}): ${e.message}`;
          }
        },
        async deleteKey(key) {
          memStore.delete(key);
          try {
            await store.delete(key);
          } catch (e) {
            lastBlobError = `delete(${key}): ${e.message}`;
          }
        },
        async listKeys(prefix) {
          const keys = new Set();
          for (const k of memStore.keys()) {
            if (k.startsWith(prefix)) keys.add(k);
          }
          try {
            const res = await store.list({ prefix });
            if (res && Array.isArray(res.blobs)) {
              for (const b of res.blobs) {
                if (b && b.key) keys.add(b.key);
              }
            }
          } catch (e) {
            lastBlobError = `list(${prefix}): ${e.message}`;
          }
          return Array.from(keys);
        }
      };
    } catch (e) {
      lastBlobError = `init: ${e.message}`;
    }
  }

  return {
    isCloudStore: false,
    async getJSON(key) {
      return memStore.get(key) || null;
    },
    async setJSON(key, val) {
      memStore.set(key, val);
    },
    async deleteKey(key) {
      memStore.delete(key);
    },
    async listKeys(prefix) {
      const keys = [];
      for (const k of memStore.keys()) {
        if (k.startsWith(prefix)) keys.push(k);
      }
      return keys;
    }
  };
}

async function isBridgeLive(store) {
  if (store && store.isCloudStore) {
    return true;
  }
  const stateRec = await store.getJSON('bridge-state');
  if (!stateRec || !stateRec.updatedAt) return false;
  return Date.now() - stateRec.updatedAt < 25000;
}

async function sendBridgeCommand(store, method, params = {}) {
  const cmdId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const cmdObj = {
    id: cmdId,
    method,
    params,
    createdAt: Date.now()
  };

  // Write command to current + next 3 two-second time buckets (brand-new immutable keys, zero list() needed)
  const b = Math.floor(Date.now() / 2000);
  await Promise.all([
    store.setJSON(`cmd_b_${b}`, cmdObj),
    store.setJSON(`cmd_b_${b + 1}`, cmdObj),
    store.setJSON(`cmd_b_${b + 2}`, cmdObj),
    store.setJSON(`cmd_b_${b + 3}`, cmdObj)
  ]);

  // Wait 1.4s for the browser's 1.2s poll cycle, then check fresh untouched key resp_${cmdId}_${attempt} on each attempt
  await new Promise(r => setTimeout(r, 1400));
  for (let attempt = 0; attempt < 8; attempt++) {
    const resp = await store.getJSON(`resp_${cmdId}_${attempt}`);
    if (resp) {
      if (resp.error) {
        throw new Error(resp.error.message || String(resp.error));
      }
      return resp.result;
    }
    await new Promise(r => setTimeout(r, 950));
  }

  throw new Error(`Timeout waiting for live browser response on geovanta.netlify.app (method: ${method})`);
}

function createSignedAuthCode(meta) {
  const payloadObj = {
    c: meta.codeChallenge || '',
    m: meta.codeChallengeMethod || (meta.codeChallenge ? 'S256' : ''),
    u: meta.redirectUri || '',
    i: meta.clientId || OAUTH_CLIENT_ID,
    t: Date.now(),
    n: crypto.randomBytes(6).toString('hex')
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', OAUTH_CLIENT_SECRET).update(payloadB64).digest('base64url');
  return `gvcode.${payloadB64}.${sig}`;
}

function verifySignedAuthCode(code) {
  if (!code || typeof code !== 'string' || !code.startsWith('gvcode.')) return null;
  const parts = code.split('.');
  if (parts.length !== 3) return null;
  const [, payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', OAUTH_CLIENT_SECRET).update(payloadB64).digest('base64url');
  if (sig !== expectedSig) return null;
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

async function handleToolCall(name, args = {}, store) {
  try {
    const liveConnected = store ? await isBridgeLive(store) : false;

    switch (name) {
      case 'geovanta_status': {
        const stateRec = store ? await store.getJSON('bridge-state') : null;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'running',
                  environment: 'netlify-cloud-bridge',
                  endpoint: '/mcp',
                  liveConnected,
                  activeScreen: stateRec?.state?.screen || 'offline',
                  activeProjectId: stateRec?.state?.projectId || null,
                  toolsAvailable: TOOL_DEFINITIONS.length
                },
                null,
                2
              )
            }
          ]
        };
      }

      case 'geovanta_workspace_manage': {
        if (!liveConnected) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Pastikan tab browser https://geovanta.netlify.app sedang terbuka agar Gemini dapat mengelola Workspace secara live.'
              }
            ],
            isError: true
          };
        }
        const res = await sendBridgeCommand(store, 'workspaceManage', args);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      case 'geovanta_shape_create': {
        const { createShape, serializeDoc } = getEngine();
        const shape = createShape(args);
        const target = args.target || (liveConnected ? 'canvas' : 'svg');

        if (target === 'canvas' && liveConnected) {
          await sendBridgeCommand(store, 'mutateCanvas', {
            action: `Create ${args.type || 'Shape'}`,
            objects: [shape],
            replaceAll: false
          });
          return {
            content: [
              {
                type: 'text',
                text: `Berhasil membuat bentuk ${args.type || 'shape'} secara live di kanvas Geovanta. Objek ID: ${shape.id}`
              }
            ]
          };
        }

        const w = Math.max(200, args.width ? Number(args.width) : args.radius ? Number(args.radius) * 2 : 100);
        const h = Math.max(200, args.height ? Number(args.height) : args.radius ? Number(args.radius) * 2 : 100);
        const doc = {
          id: `doc-${Date.now()}`,
          artboard: { w: Math.max(800, w * 2), h: Math.max(600, h * 2), bg: '#ffffff' },
          objects: [shape],
          selection: []
        };
        const svg = serializeDoc(doc);
        return { content: [{ type: 'text', text: svg }] };
      }

      case 'geovanta_text_create': {
        if (liveConnected) {
          const res = await sendBridgeCommand(store, 'textCreate', args);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        const x = Number(args.x ?? 100);
        const y = Number(args.y ?? 150);
        const fontSize = Number(args.fontSize ?? 48);
        const fill = args.fill || '#111827';
        const fontFamily = args.fontFamily || 'IBM Plex Sans';
        const escaped = String(args.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}">${escaped}</text></svg>`;
        return { content: [{ type: 'text', text: svg }] };
      }

      case 'geovanta_iconify_insert': {
        if (!liveConnected) {
          return {
            content: [{ type: 'text', text: 'Error: Buka tab https://geovanta.netlify.app untuk menyisipkan ikon Iconify ke kanvas.' }],
            isError: true
          };
        }
        const res = await sendBridgeCommand(store, 'iconifyInsert', args);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      case 'geovanta_layer_manage': {
        if (!liveConnected) {
          return {
            content: [{ type: 'text', text: 'Error: Buka tab https://geovanta.netlify.app untuk mengelola layer secara live.' }],
            isError: true
          };
        }
        const res = await sendBridgeCommand(store, 'layerManage', args);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      case 'geovanta_artboard_and_view': {
        if (!liveConnected) {
          return {
            content: [{ type: 'text', text: 'Error: Buka tab https://geovanta.netlify.app untuk mengatur artboard dan tampilan.' }],
            isError: true
          };
        }
        const res = await sendBridgeCommand(store, 'artboardAndView', args);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      case 'geovanta_curve_simplify': {
        if (args.svgString) {
          const { parseSVG, simplifyCurves, serializeDoc } = getEngine();
          const parsed = parseSVG(args.svgString);
          const simplified = simplifyCurves(parsed, { level: args.level, tolerance: args.tolerance });
          return { content: [{ type: 'text', text: serializeDoc(simplified.doc) }] };
        }
        if (liveConnected) {
          const res = await sendBridgeCommand(store, 'simplifyCurves', args);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Error: svgString is required when Geovanta tab is not open.' }], isError: true };
      }

      case 'geovanta_boolean_operation': {
        if (args.svgString) {
          const { parseSVG, booleanOperation, serializeDoc } = getEngine();
          const parsed = parseSVG(args.svgString);
          const boolDoc = booleanOperation(parsed, args.op);
          return { content: [{ type: 'text', text: serializeDoc(boolDoc) }] };
        }
        if (liveConnected) {
          const res = await sendBridgeCommand(store, 'booleanOperation', args);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Error: svgString is required when Geovanta tab is not open.' }], isError: true };
      }

      case 'geovanta_corner_fillet': {
        if (args.svgString) {
          const { parseSVG, applyCornerFillet, serializeDoc } = getEngine();
          const parsed = parseSVG(args.svgString);
          const filletedDoc = applyCornerFillet(parsed, args.radius, { mode: args.mode });
          return { content: [{ type: 'text', text: serializeDoc(filletedDoc) }] };
        }
        if (liveConnected) {
          const res = await sendBridgeCommand(store, 'cornerFillet', args);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Error: svgString is required when Geovanta tab is not open.' }], isError: true };
      }

      case 'geovanta_recolor': {
        if (args.svgString) {
          const { parseSVG, serializeDoc } = getEngine();
          const parsed = parseSVG(args.svgString);
          const { find, replace, palette } = args;
          for (const obj of parsed.objects) {
            if (find && replace) {
              if (obj.fill && obj.fill.toLowerCase() === find.toLowerCase()) obj.fill = replace;
              if (obj.stroke && obj.stroke.toLowerCase() === find.toLowerCase()) obj.stroke = replace;
            }
            if (palette && Array.isArray(palette) && palette.length) {
              obj.fill = palette[0];
            }
          }
          return { content: [{ type: 'text', text: serializeDoc(parsed) }] };
        }
        if (liveConnected) {
          const res = await sendBridgeCommand(store, 'recolor', args);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Error: svgString is required when Geovanta tab is not open.' }], isError: true };
      }

      case 'geovanta_svg_parse': {
        const { parseSVG } = getEngine();
        return { content: [{ type: 'text', text: JSON.stringify(parseSVG(args.svgString), null, 2) }] };
      }

      case 'geovanta_svg_serialize': {
        const { serializeDoc } = getEngine();
        return { content: [{ type: 'text', text: serializeDoc(args.doc) }] };
      }

      case 'geovanta_live_get_canvas': {
        if (!liveConnected) {
          return { content: [{ type: 'text', text: 'Error: Tidak ada tab Geovanta yang sedang terbuka.' }], isError: true };
        }
        const res = await sendBridgeCommand(store, 'getCanvasState', {});
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      case 'geovanta_live_mutate_canvas': {
        if (!liveConnected) {
          return { content: [{ type: 'text', text: 'Error: Tidak ada tab Geovanta yang sedang terbuka.' }], isError: true };
        }
        const res = await sendBridgeCommand(store, 'mutateCanvas', {
          action: args.action,
          objects: args.objects,
          replaceAll: args.replaceAll
        });
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      case 'geovanta_live_select_objects': {
        if (!liveConnected) {
          return { content: [{ type: 'text', text: 'Error: Tidak ada tab Geovanta yang sedang terbuka.' }], isError: true };
        }
        const res = await sendBridgeCommand(store, 'selectObjects', { ids: args.ids });
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      case 'geovanta_live_export': {
        if (!liveConnected) {
          return { content: [{ type: 'text', text: 'Error: Tidak ada tab Geovanta yang sedang terbuka.' }], isError: true };
        }
        const res = await sendBridgeCommand(store, 'exportCanvas', { format: args.format || 'svg' });
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
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

async function processJsonRpcMessage(message, store) {
  if (!message || typeof message !== 'object') return null;
  const { id, method, params } = message;
  if (id === undefined) return null;

  switch (method) {
    case 'initialize': {
      const reqVer = params && params.protocolVersion;
      const negotiatedVer = reqVer === '2025-03-26' || reqVer === '2024-11-05' ? reqVer : '2024-11-05';
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: negotiatedVer,
          capabilities: { tools: {} },
          serverInfo: { name: 'geovanta-mcp-server', version: '1.1.0' }
        }
      };
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOL_DEFINITIONS } };
    case 'tools/call': {
      const toolName = params && params.name;
      const toolArgs = (params && params.arguments) || {};
      const callResult = await handleToolCall(toolName, toolArgs, store);
      return { jsonrpc: '2.0', id, result: callResult };
    }
    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      };
  }
}

function resolveBaseUrl(event) {
  const headers = event.headers || {};
  const proto = String(headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  const host = String(headers['x-forwarded-host'] || headers.host || 'geovanta.netlify.app')
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Accept, Last-Event-Id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id'
};

exports.handler = async function handler(event, context) {
  if (context && typeof context === 'object') {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const rawPath = (event.path || '/mcp').replace(/^\/\.netlify\/functions\/mcp/, '') || '/mcp';
  const reqPath = rawPath.replace(/\/+$/, '') || '/';
  const baseUrl = resolveBaseUrl(event);
  const headers = event.headers || {};
  const store = getBridgeStore(event);

  // 1. OAuth 2.1 Protected Resource Metadata
  if (
    method === 'GET' &&
    (reqPath === '/.well-known/oauth-protected-resource' ||
      reqPath === '/.well-known/oauth-protected-resource/mcp')
  ) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        resource: `${baseUrl}/mcp`,
        authorization_servers: [baseUrl],
        bearer_methods_supported: ['header'],
        scopes_supported: ['mcp', 'read', 'write']
      })
    };
  }

  // 2. OAuth 2.1 Authorization Server Metadata
  if (
    method === 'GET' &&
    (reqPath === '/.well-known/oauth-authorization-server' ||
      reqPath === '/.well-known/openid-configuration')
  ) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
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
    };
  }

  // 3. Dynamic Client Registration (POST /oauth/register)
  if (method === 'POST' && reqPath === '/oauth/register') {
    let payload = {};
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch (_) {}
    const clientId = `geovanta-dcr-${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = `geovanta-sec-${crypto.randomBytes(16).toString('hex')}`;
    return {
      statusCode: 201,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0,
        client_name: payload.client_name || 'Google Gemini MCP Client',
        redirect_uris: Array.isArray(payload.redirect_uris) ? payload.redirect_uris : [],
        grant_types: payload.grant_types || ['authorization_code', 'refresh_token'],
        response_types: payload.response_types || ['code'],
        token_endpoint_auth_method: payload.token_endpoint_auth_method || 'none'
      })
    };
  }

  // 4. Stateless OAuth 2.1 Authorize (GET/POST /oauth/authorize)
  if ((method === 'GET' || method === 'POST') && reqPath === '/oauth/authorize') {
    const q = { ...(event.queryStringParameters || {}) };
    if (method === 'POST' && event.body) {
      const sp = new URLSearchParams(event.body);
      for (const [k, v] of sp.entries()) q[k] = v;
    }

    const redirectUri = q.redirect_uri;
    if (!redirectUri) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: 'invalid_request', error_description: 'Missing redirect_uri' })
      };
    }

    const code = createSignedAuthCode({
      clientId: q.client_id || OAUTH_CLIENT_ID,
      redirectUri,
      codeChallenge: q.code_challenge || '',
      codeChallengeMethod: q.code_challenge_method || (q.code_challenge ? 'S256' : '')
    });

    const targetUrl = new URL(redirectUri);
    targetUrl.searchParams.set('code', code);
    if (q.state) targetUrl.searchParams.set('state', q.state);

    return {
      statusCode: 302,
      headers: {
        ...CORS_HEADERS,
        Location: targetUrl.toString(),
        'Cache-Control': 'no-store'
      },
      body: ''
    };
  }

  // 5. Stateless OAuth 2.1 Token Exchange (POST /oauth/token)
  if (method === 'POST' && reqPath === '/oauth/token') {
    const ct = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
    let params = {};
    if (ct.includes('application/json')) {
      try {
        params = event.body ? JSON.parse(event.body) : {};
      } catch (_) {}
    } else {
      const sp = new URLSearchParams(event.body || '');
      for (const [k, v] of sp.entries()) params[k] = v;
    }

    const grantType = params.grant_type || 'authorization_code';
    if (grantType === 'authorization_code') {
      const codeRecord = verifySignedAuthCode(params.code);
      if (!codeRecord) {
        return {
          statusCode: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid authorization code' })
        };
      }
      if (codeRecord.codeChallenge) {
        const verifier = params.code_verifier || '';
        const computed =
          (codeRecord.codeChallengeMethod || 'S256').toUpperCase() === 'S256'
            ? crypto.createHash('sha256').update(verifier).digest('base64url')
            : verifier;
        if (computed !== codeRecord.codeChallenge) {
          return {
            statusCode: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ error: 'invalid_grant', error_description: 'PKCE verifier mismatch' })
          };
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        access_token: `geovanta_at_${crypto.randomBytes(24).toString('hex')}`,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: `geovanta_rt_${crypto.randomBytes(24).toString('hex')}`,
        scope: 'mcp read write'
      })
    };
  }

  // 5b. HTTP Live Cloud Bridge Endpoint (POST /mcp/bridge or /api/mcp/bridge or payload with action='poll'|'respond')
  let parsedPostBody = null;
  if (method === 'POST' && event.body) {
    try {
      parsedPostBody = JSON.parse(event.body);
    } catch (_) {
      parsedPostBody = null;
    }
  }
  const isBridgeRequest =
    method === 'POST' &&
    (reqPath === '/mcp/bridge' ||
      reqPath === '/api/mcp/bridge' ||
      reqPath.endsWith('/bridge') ||
      (parsedPostBody &&
        !Array.isArray(parsedPostBody) &&
        !parsedPostBody.jsonrpc &&
        (parsedPostBody.action === 'poll' || parsedPostBody.action === 'respond')));

  if (isBridgeRequest) {
    try {
      const payload = parsedPostBody || (event.body ? JSON.parse(event.body) : {});
      const clientId = payload.clientId || 'netlify-client';
      const action = payload.action || 'poll';

      if (payload.state || action === 'poll') {
        const prevStateRec = await store.getJSON('bridge-state');
        await store.setJSON('bridge-state', {
          clientId,
          updatedAt: Date.now(),
          state: payload.state || prevStateRec?.state || null
        });
      }

      if (Array.isArray(payload.responses)) {
        for (const resp of payload.responses) {
          if (resp && resp.id) {
            await Promise.all([
              store.setJSON(`resp_${resp.id}_0`, resp),
              store.setJSON(`resp_${resp.id}_1`, resp),
              store.setJSON(`resp_${resp.id}_2`, resp),
              store.setJSON(`resp_${resp.id}_3`, resp),
              store.setJSON(`resp_${resp.id}_4`, resp),
              store.setJSON(`resp_${resp.id}_5`, resp),
              store.setJSON(`resp_${resp.id}_6`, resp),
              store.setJSON(`resp_${resp.id}_7`, resp)
            ]);
          }
        }
      }

      const commandsToDeliver = [];
      if (action === 'poll') {
        const bNow = Math.floor(Date.now() / 2000);
        const [cPrev, cCur] = await Promise.all([
          store.getJSON(`cmd_b_${bNow - 1}`),
          store.getJSON(`cmd_b_${bNow}`)
        ]);
        const seen = new Set();
        for (const cmdObj of [cPrev, cCur]) {
          if (cmdObj && cmdObj.id && !seen.has(cmdObj.id)) {
            seen.add(cmdObj.id);
            commandsToDeliver.push(cmdObj);
          }
        }
      }

      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          status: 'ok',
          clientId,
          commands: commandsToDeliver,
          isCloudStore: Boolean(store.isCloudStore),
          lastBlobError,
          serverTime: Date.now()
        })
      };
    } catch (e) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ status: 'error', message: e.message })
      };
    }
  }

  // 6. Streamable HTTP MCP Endpoint (/mcp, /api/mcp, or POST /)
  const sessionId =
    headers['mcp-session-id'] ||
    headers['Mcp-Session-Id'] ||
    `geovanta-sess-${crypto.randomBytes(12).toString('hex')}`;

  if (method === 'DELETE') {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Mcp-Session-Id': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'terminated', sessionId })
    };
  }

  if (method === 'GET') {
    const liveConnected = await isBridgeLive(store);
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Mcp-Session-Id': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'geovanta-mcp-server',
        version: '1.1.0',
        transport: 'streamable-http',
        endpoint: '/mcp',
        liveConnected,
        toolsAvailable: TOOL_DEFINITIONS.length,
        status: 'ready'
      })
    };
  }

  if (method === 'POST') {
    try {
      const msg = JSON.parse(event.body || '{}');
      if (Array.isArray(msg)) {
        const results = [];
        for (const item of msg) {
          const r = await processJsonRpcMessage(item, store);
          if (r !== null) results.push(r);
        }
        return {
          statusCode: results.length === 0 ? 202 : 200,
          headers: { ...CORS_HEADERS, 'Mcp-Session-Id': sessionId, 'Content-Type': 'application/json' },
          body: results.length === 0 ? '' : JSON.stringify(results)
        };
      }

      const resData = await processJsonRpcMessage(msg, store);
      if (resData === null && msg.id === undefined) {
        return {
          statusCode: 202,
          headers: { ...CORS_HEADERS, 'Mcp-Session-Id': sessionId },
          body: ''
        };
      }

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Mcp-Session-Id': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify(resData || { jsonrpc: '2.0', id: msg.id, result: {} })
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, 'Mcp-Session-Id': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: e.message } })
      };
    }
  }

  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: 'Not Found'
  };
};
