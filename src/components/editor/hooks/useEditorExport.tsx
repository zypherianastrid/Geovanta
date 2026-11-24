/**
 * @file src/components/editor/hooks/useEditorExport.tsx
 * @description Custom hook for vector document serialization, raster rendering,
 * and file export across SVG, PNG, JPG, WebP, AI, and EPS formats.
 */

import React from 'react';
import { VE } from '../../../engine/vectorEngine.tsx';
import { docHasBackgroundBlur } from '../../../engine/effectsEngine.tsx';
import { resolveExportArea } from '../../../engine/svgDocumentSerializer.tsx';
import { isLegacyText } from '../../../engine/legacyText.tsx';
import { DEBUG_LOG } from '../../../utils/debugLogger.tsx';
import { AssetManager } from '../../../workspace/assetManager.tsx';
import { isNativeAndroid, exportBlobNative } from '../../../bridge/androidNativeBridge.ts';

export interface EditorExportOptions {
  docRef: React.MutableRefObject<any>;
  selRef: React.MutableRefObject<{ objs: Set<string>; nodes: Set<string> }>;
  expFmt: string;
  expScale: number;
  exportArea: string;
  bg: any;
  clipFrames: boolean;
  projectId?: string | null;
  sceneRendererRef: React.MutableRefObject<any>;
  say: (msg: string) => void;
  documentForExport?: (doc: any) => any;
  prefs?: { lang?: string } | null;
}

export interface EditorExportApi {
  exportSvg: () => Promise<void>;
  downloadSvg: () => Promise<void>;
  triggerDl: (blob: Blob, ext: string) => void;
  isRasterFmt: (fmt: string) => boolean;
  hasImgs: () => boolean;
  expOk: () => boolean;
}

export function useEditorExport(options: EditorExportOptions): EditorExportApi {
  const {
    docRef,
    selRef,
    expFmt,
    expScale,
    exportArea,
    bg,
    clipFrames,
    projectId,
    sceneRendererRef,
    say,
    documentForExport = (d: any) => d,
  } = options;

  const isRasterFmt = (f: string) => f === 'png' || f === 'jpg' || f === 'webp';
  const hasImgs = () => (docRef.current?.objects || []).some((o: any) => o.img);
  const expOk = () => exportArea !== 'sel' || selRef.current.objs.size > 0 || (say('Pilih objek yang akan diekspor'), false);

  const triggerDl = (blob: Blob, ext: string) => {
    if (isNativeAndroid()) {
      exportBlobNative(blob, 'geovanta-edit.' + ext, 'Geovanta Export')
        .then(ok => {
          if (ok) say('File siap dibagikan / disimpan');
        })
        .catch(() => {
          say('Gagal mengekspor file di Android');
        });
      return;
    }
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'geovanta-edit.' + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  };

  const copyTextFb = (s: string, ok: string) => {
    const d = document.createElement('div');
    d.textContent = s;
    d.style.cssText = 'position:fixed;left:-9999px;top:0;white-space:pre;user-select:text';
    document.body.appendChild(d);
    const sel = window.getSelection();
    const rng = document.createRange();
    rng.selectNodeContents(d);
    sel?.removeAllRanges();
    sel?.addRange(rng);
    try {
      document.execCommand('copy');
      say(ok);
    } catch {
      say('Gagal menyalin');
    }
    sel?.removeAllRanges();
    d.remove();
  };

  /* Salin ke clipboard sesuai format terpilih */
  const exportSvg = async () => {
    if (!expOk()) return;
    const opt = {
      bg,
      clipFrames,
      area: exportArea,
      only: selRef.current.objs,
      isRaster: isRasterFmt(expFmt),
    };
    try {
      const sourceDoc = documentForExport(docRef.current);
      let exportDoc = typeof AssetManager !== 'undefined' && projectId
        ? await AssetManager.resolveDocForStandaloneExport(projectId, sourceDoc)
        : sourceDoc;

      if (isRasterFmt(expFmt)) {
        if (!(navigator.clipboard && window.ClipboardItem && navigator.clipboard.write)) {
          return say('Browser ini tidak bisa menyalin gambar — gunakan tombol Unduh');
        }
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': VE.exportRaster(exportDoc, opt, 'png', expScale) as any,
          }),
        ]);
        return say('Gambar PNG (' + expScale + 'x) disalin' + (expFmt !== 'png' ? ' · clipboard hanya mendukung PNG' : ''));
      }

      if ((expFmt === 'ai' || expFmt === 'eps') && exportDoc.objects.some(isLegacyText)) {
        exportDoc = await VE.convertDocumentTextToPaths(exportDoc, {
          registry: sceneRendererRef.current?.scene?.fontRegistry || null,
        });
      }

      const txt = expFmt === 'ai'
        ? VE.exportAI(exportDoc, opt)
        : expFmt === 'eps'
          ? VE.exportEPS(exportDoc, opt)
          : VE.serializeDoc(exportDoc, opt);

      const lb = expFmt.toUpperCase() + ' disalin' + (
        expFmt === 'svg' && docHasBackgroundBlur({ objects: resolveExportArea(exportDoc, opt).objects })
          ? ' · Background blur tidak ikut terekspor ke SVG — hanya tampil di aplikasi'
          : ''
      );

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt).then(() => say(lb), () => copyTextFb(txt, lb));
      } else {
        copyTextFb(txt, lb);
      }
    } catch (e: any) {
      say('Gagal menyalin: ' + (e && e.message || 'tidak diizinkan'));
    }
  };

  /* Unduh file sesuai format: .svg .png .jpg .webp .ai .eps */
  const downloadSvg = async () => {
    DEBUG_LOG.log('document', 'export-svg', 'downloadSvg', 'src/components/editor/hooks/useEditorExport.tsx', 'fmt=' + expFmt + ' scale=' + expScale);
    if (!expOk()) return;
    const opt = {
      bg,
      clipFrames,
      area: exportArea,
      only: selRef.current.objs,
      isRaster: isRasterFmt(expFmt),
    };
    const note = hasImgs() && ['ai', 'eps'].includes(expFmt) ? ' · gambar raster hanya tersimpan di data round-trip Geovanta' : '';
    try {
      const sourceDoc = documentForExport(docRef.current);
      let d = typeof AssetManager !== 'undefined' && projectId
        ? await AssetManager.resolveDocForStandaloneExport(projectId, sourceDoc)
        : sourceDoc;

      if (isRasterFmt(expFmt)) {
        triggerDl((await VE.exportRaster(d, opt, expFmt, expScale)) as Blob, expFmt);
        return say('Diunduh sebagai .' + expFmt.toUpperCase() + ' (' + expScale + 'x)');
      }

      if ((expFmt === 'ai' || expFmt === 'eps') && d.objects.some(isLegacyText)) {
        d = await VE.convertDocumentTextToPaths(d, {
          registry: sceneRendererRef.current?.scene?.fontRegistry || null,
        });
      }

      if (expFmt === 'ai') {
        triggerDl(new Blob([VE.exportAI(d, opt)], {
          type: 'application/pdf',
        }), 'ai');
        return say('Diunduh sebagai Adobe Illustrator (.AI)' + note);
      }

      if (expFmt === 'eps') {
        triggerDl(new Blob([VE.exportEPS(d, opt)], {
          type: 'application/postscript',
        }), 'eps');
        return say('Diunduh sebagai Encapsulated PostScript (.EPS)' + note);
      }

      triggerDl(new Blob([VE.serializeDoc(d, opt)], {
        type: 'image/svg+xml',
      }), 'svg');

      say('Diunduh sebagai .SVG' + (docHasBackgroundBlur({ objects: resolveExportArea(d, opt).objects }) ? ' · Background blur tidak ikut terekspor ke SVG — hanya tampil di aplikasi' : ''));
    } catch (e: any) {
      say('Gagal mengekspor: ' + (e && e.message || 'kesalahan tak dikenal'));
    }
  };

  return {
    exportSvg,
    downloadSvg,
    triggerDl,
    isRasterFmt,
    hasImgs,
    expOk,
  };
}
