import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { APP_STR, getAppStr, translateToast } from '../src/constants/appI18n.tsx';
import { SETTINGS_STR } from '../src/constants/settingsI18n.tsx';
import { TIPS, TIPS_EN } from '../src/constants/tooltipsCatalog.tsx';

function walkSrc(dir: string): string[] {
  let out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walkSrc(p));
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

test.describe('English Translation & Tooltip Completeness', () => {
  test('APP_STR.id and APP_STR.en have 100% key parity including Auto Trace and Stroke Width keys', () => {
    const idKeys = Object.keys(APP_STR.id);
    const enKeys = Object.keys(APP_STR.en);

    const missingInEn = idKeys.filter(k => !(k in APP_STR.en));
    const missingInId = enKeys.filter(k => !(k in APP_STR.id));

    expect(missingInEn).toEqual([]);
    expect(missingInId).toEqual([]);

    expect(SETTINGS_STR.id.version).toBe('v1.1.0');
    expect(SETTINGS_STR.en.version).toBe('v1.1.0');

    // Required keys for Auto Trace & Inspector
    const requiredKeys = [
      'riStrokeWidth',
      'atTitle',
      'atMode',
      'atModeBw',
      'atModeColor',
      'atThreshold',
      'atColors',
      'atSmoothness',
      'atCornerAngle',
      'atDespeckle',
      'atIgnoreWhite',
      'atKeepOriginal',
      'atRunBtn',
      'atTracing',
      'atEmptyResult',
      'atSuccess',
      'atFailed',
      'icJumpPage'
    ];
    for (const k of requiredKeys) {
      expect(typeof (APP_STR.id as any)[k]).toBe('string');
      expect(typeof (APP_STR.en as any)[k]).toBe('string');
      expect((APP_STR.en as any)[k].length).toBeGreaterThan(0);
    }
  });

  test('TIPS and TIPS_EN have 100% key parity and cover every data-tip / tip attribute in src/', () => {
    const tipsKeys = Object.keys(TIPS);
    const tipsEnKeys = Object.keys(TIPS_EN);

    const missingInEn = tipsKeys.filter(k => !(k in TIPS_EN));
    const missingInId = tipsEnKeys.filter(k => !(k in TIPS));

    expect(missingInEn).toEqual([]);
    expect(missingInId).toEqual([]);

    expect(SETTINGS_STR.id.version).toBe('v1.1.0');
    expect(SETTINGS_STR.en.version).toBe('v1.1.0');

    // Scan all src files for data-tip="..." and tip="..."
    const srcRoot = path.resolve(__dirname, '../src');
    const files = walkSrc(srcRoot);
    const usedTipKeys = new Set<string>();
    for (const f of files) {
      const txt = fs.readFileSync(f, 'utf8');
      for (const m of txt.matchAll(/data-tip=["']([a-zA-Z0-9_]+)["']/g)) {
        usedTipKeys.add(m[1]);
      }
      for (const m of txt.matchAll(/\btip=["']([a-zA-Z0-9_]+)["']/g)) {
        usedTipKeys.add(m[1]);
      }
    }

    // Ensure Auto Trace and previously missing tooltip keys are defined in both TIPS and TIPS_EN
    const requiredTips = [
      'veDebugCategoryFilter',
      'setAntialias',
      'veAutoTrace',
      'veAutoTraceMode',
      'veAutoTraceThreshold',
      'veAutoTraceColors',
      'veAutoTraceSmooth',
      'veAutoTraceCorner',
      'veAutoTraceDespeckle',
      'veAutoTraceIgnoreWhite',
      'veAutoTraceKeepImg',
      'veAutoTraceRun'
    ];
    for (const k of requiredTips) {
      usedTipKeys.add(k);
    }

    const undefinedTips = [...usedTipKeys].filter(k => !(k in TIPS) || !(k in TIPS_EN));
    expect(undefinedTips).toEqual([]);
  });

  test('translateToast translates Iconify, Auto Trace, Shape Builder, and Node/Text editing toasts into English', () => {
    expect(translateToast('Ikon mdi:home disisipkan', 'en')).toBe('Icon mdi:home inserted');
    expect(translateToast('Ikon tidak bisa disisipkan: nama set tidak diketahui', 'en')).toBe(
      'Cannot insert icon: unknown icon set'
    );
    expect(translateToast('Gagal menyisipkan ikon mdi:home: Perlu internet', 'en')).toBe(
      'Failed to insert icon mdi:home: Perlu internet'
    );
    expect(translateToast('Auto Trace selesai: 3 path vektor, 48 node', 'en')).toBe(
      'Auto Trace complete: 3 vector path(s), 48 nodes'
    );
    expect(translateToast('Pilih objek gambar dulu untuk Auto Trace', 'en')).toBe(
      'Select an image object first for Auto Trace'
    );
    expect(translateToast('Snap: AKTIF', 'en')).toBe('Snap: ON');
    expect(translateToast('Grid: TAMPIL', 'en')).toBe('Grid: SHOWN');
    expect(translateToast('Pilih objek teks dulu', 'en')).toBe('Select a text object first');
    expect(translateToast('2 objek teks diubah menjadi path vektor (Ctrl+Z untuk kembali)', 'en')).toBe(
      '2 text object(s) converted to vector paths (Ctrl+Z to undo)'
    );
  });
});
