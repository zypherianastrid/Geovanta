import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

test('build:web bundles successfully without esbuild fs resolution errors', async () => {
  const root = path.resolve(__dirname, '..');
  const result = execSync('node scripts/build-offline-bundle.js', { cwd: root, encoding: 'utf8' });
  expect(result).toContain('[Geovanta Build] Aset offline CanvasKit GPU/CPU siap');
  const bundlePath = path.join(root, 'web', 'assets', 'geovanta.bundle.js');
  expect(fs.existsSync(bundlePath)).toBe(true);
});
