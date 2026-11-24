import { test, expect } from '@playwright/test';
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

  test('2. Web App Mode: color-scheme aktif, catatan privasi muncul saat #0075ff, & aksen mengikuti override browser Chrome', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Verifikasi meta color-scheme dan root colorScheme
      const metaColorScheme = await page.locator('meta[name="color-scheme"]').getAttribute('content');
      expect(metaColorScheme).toBe('light dark');
      const rootColorScheme = await page.evaluate(() => document.documentElement.style.colorScheme);
      expect(rootColorScheme).toBe('light');

      // Buka pengaturan dan aktifkan mode otomatis (di headless Chromium AccentColor default = #0075ff)
      await page.evaluate(() => {
        if ((window as any).__geovantaOpenSettings) {
          (window as any).__geovantaOpenSettings(true);
        }
      });
      const autoChip = page.locator('[data-testid~="accent-system-auto"]');
      await autoChip.waitFor({ state: 'visible', timeout: 5000 });
      await autoChip.click();

      const platformSource = await autoChip.getAttribute('data-platform-source');
      expect(platformSource).toBe('webapp_browser_chrome');

      // Di desktop browser tanpa flag Chrome, catatan privasi harus muncul saat AccentColor = #0075ff
      const privacyNote = page.locator('[data-testid="accent-web-privacy-note"]');
      await expect(privacyNote).toBeVisible();

      // Simulasikan browser Chrome yang mengekspos aksen tema ungu kustom (#8b5cf6) lalu trigger focus
      await page.evaluate(() => {
        (window as any).__geovantaWebBrowserAccentColor = '#8b5cf6';
        window.dispatchEvent(new Event('focus'));
      });

      await expect.poll(async () => {
        return await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase());
      }).toBe('#8b5cf6');
      await expect(privacyNote).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test('3. Desktop Installer Mode (Tauri v2 EXE): Resolver memprioritaskan aksen Windows DWM & sync live saat focus', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      // Simulasikan Tauri v2 Desktop Windows EXE dengan warna DWM non-default (#2475ce)
      await page.addInitScript(() => {
        (window as any).__mockDwmAccent = '#2475ce';
        (window as any).__TAURI__ = {
          core: {
            invoke: async (cmd: string) => {
              if (cmd === 'get_windows_accent_color') {
                return (window as any).__mockDwmAccent;
              }
              return null;
            },
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

      // Klik aktifkan otomatis: --acc harus menjadi #2475ce (BUKAN tertimpa #0075ff WebView2!)
      await autoChip.click();
      await expect.poll(async () => {
        return await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase());
      }).toBe('#2475ce');

      // Pastikan catatan privasi web TIDAK muncul di mode Desktop EXE
      await expect(page.locator('[data-testid="accent-web-privacy-note"]')).toBeHidden();

      // Simulasikan pengguna mengganti warna aksen Windows DWM lalu fokus kembali ke aplikasi
      await page.evaluate(() => {
        (window as any).__mockDwmAccent = '#e74856';
        window.dispatchEvent(new Event('focus'));
      });
      await expect.poll(async () => {
        return await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase());
      }).toBe('#e74856');
    } finally {
      await context.close();
    }
  });

  test('4. Android Mobile Mode: Resolver mengikuti bridge Material You native & sinkron saat tema/wallpaper berubah', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    });
    const page = await context.newPage();
    try {
      // Simulasikan native Android dengan JavascriptInterface GeovantaAndroidTheme (Material You API 31+)
      await page.addInitScript(() => {
        (window as any).__geovantaForceAndroidNative = true;
        (window as any).__mockMaterialYouLight = '#386a20';
        (window as any).__mockMaterialYouDark = '#9cd67e';
        (window as any).GeovantaAndroidTheme = {
          isDynamicColorSupported: () => true,
          getDynamicAccentColor: (isDark: boolean) =>
            isDark ? (window as any).__mockMaterialYouDark : (window as any).__mockMaterialYouLight,
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

      const platformSource = await autoChip.getAttribute('data-platform-source');
      expect(platformSource).toBe('mobile_android_material_you');

      // Klik aktifkan otomatis pada tema Light -> system_accent1_600 (#386a20)
      await autoChip.click();
      await expect.poll(async () => {
        return await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase());
      }).toBe('#386a20');

      // Ubah tema ke Gelap (Dark) -> otomatis mengambil system_accent1_200 (#9cd67e)
      const darkBtn = page.locator('[data-tip="setTheme"] button', { hasText: /Gelap|Dark/i });
      await darkBtn.click();
      await expect.poll(async () => {
        return await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase());
      }).toBe('#9cd67e');

      // Simulasikan wallpaper Android berubah & MainActivity memicu geovanta-android-theme-changed
      await page.evaluate(() => {
        (window as any).__mockMaterialYouDark = '#ffb1c8';
        window.dispatchEvent(new CustomEvent('geovanta-android-theme-changed'));
      });
      await expect.poll(async () => {
        return await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim().toLowerCase());
      }).toBe('#ffb1c8');
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

  test('6. Tab Pengaturan: menampilkan Created By zypherianastrid with Antigravity, Lisensi MIT, & link GitHub berikon', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        if ((window as any).__geovantaOpenSettings) {
          (window as any).__geovantaOpenSettings(true);
        }
      });
      const creditsGroup = page.locator('[data-testid="about-credits-group"]');
      await creditsGroup.waitFor({ state: 'visible', timeout: 5000 });
      await expect(creditsGroup).toContainText('Created By zypherianastrid with Antigravity');
      await expect(creditsGroup).toContainText('MIT License');
      await expect(creditsGroup).toContainText('https://github.com/zypherianastrid/Geovanta');

      const links = creditsGroup.locator('a[href="https://github.com/zypherianastrid/Geovanta"]');
      await expect(links).toHaveCount(2);
      const svgs = creditsGroup.locator('svg');
      expect(await svgs.count()).toBeGreaterThanOrEqual(5);
    } finally {
      await context.close();
    }
  });
});
