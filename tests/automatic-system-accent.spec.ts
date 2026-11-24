import { test, expect, Page, Browser } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const WEB_DIR = path.resolve(__dirname, '../web');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
};

function startStaticServer(rootDir: string): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(rootDir, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
  });
}

test.describe('Warna Aksen Otomatis Multi-Platform (Web, Desktop EXE, Android)', () => {
  let server: http.Server;
  let baseUrl: string;

  test.beforeAll(async () => {
    const res = await startStaticServer(WEB_DIR);
    server = res.server;
    baseUrl = res.url;
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('1. Tab Pengaturan: chip bertuliskan "Otomatis" bukan "Sistem Windows" dan badge menampilkan Otomatis', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Buka modal Pengaturan via tombol di header Workspace
      const stgBtn = page.locator('button[data-tip="settings"]');
      await stgBtn.waitFor({ state: 'visible', timeout: 8000 });
      await stgBtn.click();

      // Tunggu dialog SettingsModal terbuka
      const stgModal = page.locator('.stg-modal');
      await stgModal.waitFor({ state: 'visible', timeout: 5000 });

      // Verifikasi chip aksen "Otomatis"
      const autoChip = page.locator('[data-testid~="accent-system-auto"]');
      await expect(autoChip).toBeVisible();

      // Pastikan teks chip adalah "Otomatis" (atau "Automatic System" bila English)
      const chipText = (await autoChip.textContent()) || '';
      expect(chipText).toMatch(/Otomatis|Automatic/i);

      // Pastikan TIDAK ADA teks "Sistem Windows" di dalam chip aksen tersebut
      expect(chipText).not.toContain('Sistem Windows');

      // Verifikasi tooltip chip menjelaskan bahwa warna mengikuti browser / sistem secara otomatis
      const tipText = await autoChip.getAttribute('data-tip-text');
      expect(tipText).toBeTruthy();
      expect(tipText?.toLowerCase()).toMatch(/browser|sistem|system|otomatis|automatically/i);

      // Klik chip Otomatis
      await autoChip.click();
      await expect(autoChip).toHaveClass(/on/);

      // Verifikasi badge header menampilkan "Otomatis · #HEX"
      const secHdr = page.locator('.stg-sec-hdr').first();
      const badgeText = (await secHdr.textContent()) || '';
      expect(badgeText).toMatch(/Otomatis|Automatic/i);
    } finally {
      await context.close();
    }
  });

  test('2. Web App Mode: Aksen otomatis mengikuti aksen browser Chrome & sistem secara dinamis', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      // Simulasikan browser Chrome dengan aksen ungu kustom (#8b5cf6)
      await page.addInitScript(() => {
        (window as any).__geovantaWebBrowserAccentColor = '#8b5cf6';
      });

      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Buka pengaturan dan aktifkan mode otomatis
      await page.evaluate(() => {
        if ((window as any).__geovantaOpenSettings) {
          (window as any).__geovantaOpenSettings(true);
        }
      });
      const autoChip = page.locator('[data-testid~="accent-system-auto"]');
      await autoChip.waitFor({ state: 'visible', timeout: 5000 });
      await autoChip.click();

      // Verifikasi CSS root --acc mengikuti warna aksen browser yang disimulasikan (#8b5cf6)
      const rootAcc = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase();
      });
      expect(rootAcc).toBe('#8b5cf6');

      // Verifikasi platform source adalah webapp_browser_chrome
      const platformSource = await autoChip.getAttribute('data-platform-source');
      expect(platformSource).toBe('webapp_browser_chrome');
    } finally {
      await context.close();
    }
  });

  test('3. Desktop Installer Mode (Tauri EXE): Resolver memprioritaskan aksen Windows DWM', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      // Simulasikan lingkungan Tauri Desktop Windows EXE
      await page.addInitScript(() => {
        (window as any).__TAURI__ = {
          invoke: async (cmd: string) => {
            if (cmd === 'get_windows_accent_color') {
              return '#0078d4'; // Windows 11 DWM Accent Blue
            }
            return null;
          },
        };
      });

      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Buka pengaturan
      await page.evaluate(() => {
        if ((window as any).__geovantaOpenSettings) {
          (window as any).__geovantaOpenSettings(true);
        }
      });
      const autoChip = page.locator('[data-testid~="accent-system-auto"]');
      await autoChip.waitFor({ state: 'visible', timeout: 5000 });

      // Verifikasi platform source terdeteksi sebagai desktop_windows
      const platformSource = await autoChip.getAttribute('data-platform-source');
      expect(platformSource).toBe('desktop_windows');

      // Klik aktifkan otomatis
      await autoChip.click();

      // Verifikasi CSS root --acc mengikuti aksen Windows (#0078d4)
      const rootAcc = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase();
      });
      expect(rootAcc).toBe('#0078d4');
    } finally {
      await context.close();
    }
  });

  test('4. Android Mobile Mode: Resolver otomatis mengikuti Material You Dynamic Color', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    });
    const page = await context.newPage();
    try {
      // Simulasikan native Android dengan Material You Dynamic Color (#006a6a - Android 14 dynamic teal)
      await page.addInitScript(() => {
        (window as any).__geovantaForceAndroidNative = true;
        (window as any).__geovantaAndroidMaterialYouColor = '#006a6a';
      });

      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Buka pengaturan
      await page.evaluate(() => {
        if ((window as any).__geovantaOpenSettings) {
          (window as any).__geovantaOpenSettings(true);
        }
      });
      const autoChip = page.locator('[data-testid~="accent-system-auto"]');
      await autoChip.waitFor({ state: 'visible', timeout: 5000 });

      // Verifikasi platform source terdeteksi sebagai mobile_android_material_you
      const platformSource = await autoChip.getAttribute('data-platform-source');
      expect(platformSource).toBe('mobile_android_material_you');

      // Klik aktifkan otomatis
      await autoChip.click();

      // Verifikasi CSS root --acc mengikuti warna dynamic Material You (#006a6a)
      const rootAcc = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase();
      });
      expect(rootAcc).toBe('#006a6a');
    } finally {
      await context.close();
    }
  });

  test('5. Transisi mulus: Switch antara preset kustom dan Otomatis, persisten setelah reload', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Buka pengaturan
      await page.evaluate(() => {
        if ((window as any).__geovantaOpenSettings) {
          (window as any).__geovantaOpenSettings(true);
        }
      });
      const autoChip = page.locator('[data-testid~="accent-system-auto"]');
      await autoChip.waitFor({ state: 'visible', timeout: 5000 });

      // 1. Pilih preset kustom (Figma Blue #0d99ff)
      const figmaBlueChip = page.locator('.stg-pal-chip[data-tip-text*="#0D99FF"]');
      await figmaBlueChip.click();
      await expect(figmaBlueChip).toHaveClass(/on/);
      await expect(autoChip).not.toHaveClass(/on/);

      // Verifikasi CSS root --acc menjadi #0d99ff
      let rootAcc = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase();
      });
      expect(rootAcc).toBe('#0d99ff');

      // 2. Klik kembali chip Otomatis
      await autoChip.click();
      await expect(autoChip).toHaveClass(/on/);
      await expect(figmaBlueChip).not.toHaveClass(/on/);

      // 3. Reload halaman untuk memastikan persistensi mode otomatis
      await page.reload({ waitUntil: 'networkidle' });

      // Periksa localStorage bahwa accentMode adalah system
      const storedPrefs = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem('trace-svg-settings-v1');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      });
      expect(storedPrefs).not.toBeNull();
      expect(storedPrefs.accentMode).toBe('system');
    } finally {
      await context.close();
    }
  });
});
