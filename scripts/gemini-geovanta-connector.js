/**
 * @file scripts/gemini-geovanta-connector.js
 * @description Google Gemini Direct Connector & Antigravity MCP Bridge for Geovanta Vector Studio
 * Exposes MCP tool schemas as Gemini functionDeclarations and handles multi-turn function call execution.
 */

const { TOOL_DEFINITIONS } = require('./mcp-server/tools.js');
const { GeovantaMcpServer } = require('./mcp-server/index.js');

/**
 * Transforms standard JSON Schema into Google Gemini Type & Schema format
 * @param {Object} schema - JSON schema object
 * @returns {Object} Gemini OpenAPI-compatible schema
 */
function mapJsonSchemaToGeminiSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return { type: 'OBJECT', properties: {} };
  }

  const typeMap = {
    object: 'OBJECT',
    string: 'STRING',
    number: 'NUMBER',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    array: 'ARRAY'
  };

  const rawType = (schema.type || 'object').toLowerCase();
  const mappedType = typeMap[rawType] || rawType.toUpperCase();

  const result = {
    type: mappedType
  };

  if (schema.description) {
    result.description = schema.description;
  }

  if (Array.isArray(schema.enum)) {
    result.enum = [...schema.enum];
  }

  if (schema.properties && typeof schema.properties === 'object') {
    result.properties = {};
    for (const [key, propDef] of Object.entries(schema.properties)) {
      result.properties[key] = mapJsonSchemaToGeminiSchema(propDef);
    }
  }

  if (Array.isArray(schema.required) && schema.required.length > 0) {
    result.required = [...schema.required];
  }

  if (schema.items) {
    result.items = mapJsonSchemaToGeminiSchema(schema.items);
  }

  return result;
}

/**
 * Transforms MCP tool definitions into standard Google Gemini functionDeclarations array
 * @param {Array} [tools=TOOL_DEFINITIONS]
 * @returns {Array<Object>}
 */
function getGeminiToolDeclarations(tools = TOOL_DEFINITIONS) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    parameters: mapJsonSchemaToGeminiSchema(tool.inputSchema)
  }));
}

/**
 * Executes a Gemini function call on a Geovanta MCP server instance
 * @param {Object} functionCall - { name: string, args: Object } or { functionCall: { name, args } }
 * @param {GeovantaMcpServer} [serverInstance] - Live or headless GeovantaMcpServer instance
 * @returns {Promise<{ name: string, response: { output: string, isError?: boolean } }>}
 */
async function executeGeminiFunctionCall(functionCall, serverInstance) {
  const call = functionCall.functionCall || functionCall;
  const name = call.name;
  const args = call.args || {};

  const server = serverInstance || new GeovantaMcpServer();

  try {
    const toolRes = await server.handleToolCall(name, args);
    let output = '';

    if (toolRes && Array.isArray(toolRes.content)) {
      output = toolRes.content.map(c => c.text || '').join('\n');
    } else if (typeof toolRes === 'string') {
      output = toolRes;
    } else {
      output = JSON.stringify(toolRes);
    }

    return {
      name,
      response: {
        output,
        ...(toolRes?.isError ? { isError: true } : {})
      }
    };
  } catch (err) {
    return {
      name,
      response: {
        output: `Error executing tool ${name}: ${err.message}`,
        isError: true
      }
    };
  }
}

/**
 * Heuristic simulator for offline / test mode function call resolution
 * @param {string} prompt
 * @returns {{ name: string, args: Object }}
 */
function simulateFunctionCallFromPrompt(prompt) {
  const lower = prompt.toLowerCase();

  if (lower.includes('status') || lower.includes('health') || lower.includes('cek koneksi')) {
    return { name: 'geovanta_status', args: {} };
  }

  if (lower.includes('simplify') || lower.includes('sederhana')) {
    return { name: 'geovanta_curve_simplify', args: { level: 100 } };
  }

  if (lower.includes('fillet') || lower.includes('sudut membulat') || lower.includes('corner')) {
    return { name: 'geovanta_corner_fillet', args: { radius: 10 } };
  }

  if (lower.includes('boolean') || lower.includes('union') || lower.includes('subtract') || lower.includes('intersect')) {
    const op = lower.includes('subtract') ? 'subtract' : lower.includes('intersect') ? 'intersect' : 'union';
    return { name: 'geovanta_boolean_operation', args: { op } };
  }

  // Shape creation detection
  let shapeType = 'star';
  if (lower.includes('lingkaran') || lower.includes('circle') || lower.includes('bundar')) {
    shapeType = 'circle';
  } else if (lower.includes('persegi') || lower.includes('kotak') || lower.includes('rect')) {
    shapeType = 'rectangle';
  } else if (lower.includes('polygon') || lower.includes('poligon') || lower.includes('segi-')) {
    shapeType = 'polygon';
  } else if (lower.includes('spiral')) {
    shapeType = 'spiral';
  } else if (lower.includes('blob')) {
    shapeType = 'blob';
  } else if (lower.includes('weave') || lower.includes('anyaman')) {
    shapeType = 'weave';
  }

  const args = { type: shapeType };

  // Detect points / sides
  const pointsMatch = lower.match(/(\d+)\s*(?:sudut|point|points|titik|segi|sisi)/);
  if (pointsMatch) {
    const num = parseInt(pointsMatch[1], 10);
    if (shapeType === 'star' || shapeType === 'blob') {
      args.points = num;
    } else if (shapeType === 'polygon') {
      args.sides = num;
    }
  }

  // Detect color hex or keyword
  const hexMatch = prompt.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/);
  if (hexMatch) {
    args.fill = hexMatch[0];
  } else if (lower.includes('kuning') || lower.includes('yellow')) {
    args.fill = '#f59e0b';
  } else if (lower.includes('biru') || lower.includes('blue')) {
    args.fill = '#3b82f6';
  } else if (lower.includes('merah') || lower.includes('red')) {
    args.fill = '#ef4444';
  } else if (lower.includes('hijau') || lower.includes('green')) {
    args.fill = '#10b981';
  } else if (lower.includes('ungu') || lower.includes('purple')) {
    args.fill = '#8b5cf6';
  }

  // Target canvas or svg
  if (lower.includes('svg') && !lower.includes('kanvas') && !lower.includes('canvas')) {
    args.target = 'svg';
  }

  return { name: 'geovanta_shape_create', args };
}

/**
 * Runs a user prompt against Google Gemini API with Geovanta tools attached,
 * or runs in offline/simulated mode when API key is unavailable or simulate option is set.
 * @param {string} prompt
 * @param {Object} [options={}]
 * @param {string} [options.apiKey]
 * @param {string} [options.model='gemini-1.5-flash']
 * @param {GeovantaMcpServer} [options.server]
 * @param {boolean} [options.simulate=false]
 * @returns {Promise<Object>}
 */
async function runGeminiPrompt(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-1.5-flash';
  const server = options.server || new GeovantaMcpServer();
  const simulate = options.simulate || !apiKey;

  if (simulate) {
    const simulatedCall = simulateFunctionCallFromPrompt(prompt);
    const functionResponse = await executeGeminiFunctionCall(simulatedCall, server);
    return {
      prompt,
      model: `${model} (simulated)`,
      text: `Menjalankan instruksi: memanggil fungsi '${simulatedCall.name}' dengan parameter ${JSON.stringify(simulatedCall.args)}`,
      functionCalls: [simulatedCall],
      functionResponses: [functionResponse]
    };
  }

  // Real Gemini API call via standard fetch
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    tools: [
      {
        functionDeclarations: getGeminiToolDeclarations()
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  const functionCalls = [];
  const functionResponses = [];
  let responseText = '';

  for (const part of parts) {
    if (part.text) {
      responseText += part.text;
    }
    if (part.functionCall) {
      functionCalls.push(part.functionCall);
      const callRes = await executeGeminiFunctionCall(part.functionCall, server);
      functionResponses.push(callRes);
    }
  }

  return {
    prompt,
    model,
    text: responseText,
    functionCalls,
    functionResponses,
    rawResponse: data
  };
}

// CLI Execution entrypoint
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--tools') || args.includes('-t')) {
    const declarations = getGeminiToolDeclarations();
    process.stdout.write(JSON.stringify(declarations, null, 2) + '\n');
    process.exit(0);
  }

  if (args.includes('--status') || args.includes('-s')) {
    const server = new GeovantaMcpServer();
    executeGeminiFunctionCall({ name: 'geovanta_status', args: {} }, server).then(res => {
      console.log('Geovanta Status:');
      console.log(res.response.output);
      process.exit(0);
    });
  } else {
    const prompt = args.filter(a => !a.startsWith('-')).join(' ');
    if (!prompt) {
      console.log('Geovanta AI Connector for Google Gemini & Antigravity');
      console.log('Usage:');
      console.log('  node scripts/gemini-geovanta-connector.js "<prompt>"');
      console.log('  node scripts/gemini-geovanta-connector.js --tools');
      console.log('  node scripts/gemini-geovanta-connector.js --status');
      process.exit(0);
    }

    console.log(`[Gemini Connector] Prompt: "${prompt}"`);
    runGeminiPrompt(prompt)
      .then(result => {
        if (result.text) {
          console.log(`\nAI Response: ${result.text}`);
        }
        if (result.functionCalls && result.functionCalls.length > 0) {
          console.log(`\nExecuted Tools:`);
          result.functionResponses.forEach((res, i) => {
            console.log(`[${i + 1}] ${res.name}:`);
            console.log(`    ${res.response.output}`);
          });
        }
      })
      .catch(err => {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      });
  }
}

module.exports = {
  mapJsonSchemaToGeminiSchema,
  getGeminiToolDeclarations,
  executeGeminiFunctionCall,
  runGeminiPrompt
};
