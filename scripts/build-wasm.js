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
  // Build for Node.js / Playwright / CommonJS testing & execution
  execSync('npx wasm-pack build rust/geovanta-wasm --target nodejs --out-dir pkg', {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  console.log('[build-wasm] Success! Output generated in:', pkgDir);
} catch (err) {
  console.error('[build-wasm] Failed to compile wasm:', err);
  process.exit(1);
}
