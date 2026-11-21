/**
 * @file scripts/build-wasm.js
 * @description Compiles rust/geovanta-wasm to Node.js & Web targets using wasm-pack
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const crateDir = path.join(rootDir, 'rust', 'geovanta-wasm');
const pkgDir = path.join(crateDir, 'pkg');

console.log('[build-wasm] Building geovanta-wasm crate via wasm-pack...');

try {
  // Ensure ~/.cargo/bin is on PATH for Windows / Unix environments
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const cargoBin = path.join(homeDir, '.cargo', 'bin');
  const envWithCargo = {
    ...process.env,
    PATH: fs.existsSync(cargoBin)
      ? `${cargoBin}${path.delimiter}${process.env.PATH || ''}`
      : process.env.PATH,
  };

  // Build for Node.js / Playwright / CommonJS testing & execution
  execSync('npx wasm-pack build rust/geovanta-wasm --target nodejs --out-dir pkg', {
    cwd: rootDir,
    stdio: 'inherit',
    env: envWithCargo,
  });

  // Also generate embedded browser WASM loader (glue + binary) for 100% offline WebApp & Tauri Desktop
  const wasmBytes = fs.readFileSync(path.join(pkgDir, 'geovanta_wasm_bg.wasm'));
  const wasmB64 = wasmBytes.toString('base64');
  let jsGlue = fs.readFileSync(path.join(pkgDir, 'geovanta_wasm.js'), 'utf8');
  const tailIdx = jsGlue.indexOf('const wasmPath =');
  if (tailIdx > 0) {
    jsGlue = jsGlue.slice(0, tailIdx);
  }
  const embeddedTs = `/**
 * @file src/bridge/wasmEmbeddedBinary.ts
 * @description Auto-generated embedded WebAssembly binary & glue for isomorphic browser + desktop execution
 */
const GEOVANTA_WASM_BASE64 = '${wasmB64}';

let cachedBrowserWasm: any = null;

export function loadEmbeddedBrowserWasm(): any {
  if (cachedBrowserWasm) return cachedBrowserWasm;
  const binStr = typeof atob === 'function' ? atob(GEOVANTA_WASM_BASE64) : (globalThis as any).Buffer.from(GEOVANTA_WASM_BASE64, 'base64').toString('binary');
  const wasmBytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) wasmBytes[i] = binStr.charCodeAt(i);
  const exports: any = {};
${jsGlue}
  const wasmModule = new WebAssembly.Module(wasmBytes);
  const wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
  const wasm: any = wasmInstance.exports;
  if (typeof wasm.__wbindgen_start === 'function') wasm.__wbindgen_start();
  cachedBrowserWasm = exports;
  return exports;
}
`;
  fs.writeFileSync(path.join(rootDir, 'src', 'bridge', 'wasmEmbeddedBinary.ts'), embeddedTs, 'utf8');

  console.log('[build-wasm] Success! Output generated in:', pkgDir);
} catch (err) {
  console.error('[build-wasm] Failed to compile wasm:', err);
  process.exit(1);
}
