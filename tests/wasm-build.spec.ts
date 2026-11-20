import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('wasm build: verifies pkg artifacts exist and exports wasm_engine_version', async () => {
  const pkgDir = path.resolve(__dirname, '../rust/geovanta-wasm/pkg');
  const wasmFile = path.join(pkgDir, 'geovanta_wasm_bg.wasm');
  const jsFile = path.join(pkgDir, 'geovanta_wasm.js');
  expect(fs.existsSync(wasmFile)).toBe(true);
  expect(fs.existsSync(jsFile)).toBe(true);

  if (fs.existsSync(jsFile)) {
    const wasmModule = await import(jsFile);
    expect(typeof wasmModule.wasm_engine_version).toBe('function');
    expect(wasmModule.wasm_engine_version()).toBe('1.0.0-geovanta-wasm');
  }
});
