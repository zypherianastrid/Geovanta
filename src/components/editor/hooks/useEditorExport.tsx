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
  expQuality?: number;
  svgMinify?: boolean;
  pdfBleedMm?: number;
  pdfCropMarks?: boolean;
  pdfColorSpace?: 'rgb' | 'cmyk';
  projectName?: string;
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
  batchExport: (scales?: number[]) => Promise<void>;
  getExportFilename: (fmtOverride?: string, suffix?: string) => string;
  triggerDl: (blob: Blob, ext: string, filenameOverride?: string) => void;
  isRasterFmt: (fmt: string) => boolean;
  hasImgs: () => boolean;
  expOk: () => boolean;
}

export function sanitizeExportBaseName(rawName: string | undefined | null): string {
  const cleaned = String(rawName || '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
  return cleaned || 'geovanta-edit';
}

export function buildExportFilename(
  projectName: string | undefined | null,
  exportArea: string,
  selectedObjects: any[],
  ext: string,
  suffix = ''
): string {
  const useLayerName = exportArea === 'sel' && Array.isArray(selectedObjects) && selectedObjects.length === 1 && selectedObjects[0]?.name;
  const base = sanitizeExportBaseName(useLayerName ? selectedObjects[0].name : projectName);
  const safeExt = String(ext || 'svg').replace(/^\.+/, '').toLowerCase();
  return base + suffix + '.' + safeExt;
}

export function useEditorExport(options: EditorExportOptions): EditorExportApi {
  const {
    docRef,
    selRef,
    expFmt,
    expScale,
    expQuality = 0.92,
    svgMinify = false,
    pdfBleedMm = 0,
    pdfCropMarks = false,
    pdfColorSpace = 'rgb',
    projectName = 'Untitled Project',
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

  const getExportFilename = (fmtOverride?: string, suffix = '') => {
    const objs = docRef.current?.objects || [];
    const selIds = selRef.current?.objs || new Set();
    const selectedObjects = objs.filter((o: any) => selIds.has(o.id));
    return buildExportFilename(projectName, exportArea, selectedObjects, fmtOverride || expFmt, suffix);
  };

  const serializeSvgOutput = (d: any, opt: any) => {
    const rawSvg = VE.serializeDoc(d, opt);
    if (!svgMinify) return rawSvg;
    if (typeof VE.optimizeSvg === 'function') {
      return VE.optimizeSvg(rawSvg).svg;
    }
    return rawSvg.replace(/>\s+</g, '><').trim();
  };

  const triggerDl = (blob: Blob, ext: string, filenameOverride?: string) => {
    const filename = filenameOverride || getExportFilename(ext);
    if (isNativeAndroid()) {
      exportBlobNative(blob, filename, 'Geovanta Export')
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
    a.download = filename;
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

      if ((expFmt === 'ai' || expFmt === 'eps' || expFmt === 'pdf') && exportDoc.objects.some(isLegacyText)) {
        exportDoc = await VE.convertDocumentTextToPaths(exportDoc, {
          registry: sceneRendererRef.current?.scene?.fontRegistry || null,
        });
      }

      const txt = expFmt === 'pdf'
        ? VE.exportPDF(exportDoc, { ...opt, bleedMm: pdfBleedMm, cropMarks: pdfCropMarks, colorSpace: pdfColorSpace })
        : expFmt === 'ai'
          ? VE.exportAI(exportDoc, opt)
          : expFmt === 'eps'
            ? VE.exportEPS(exportDoc, opt)
            : serializeSvgOutput(exportDoc, opt);

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
        const rasterOpt = { ...opt, quality: expQuality };
        triggerDl((await VE.exportRaster(d, rasterOpt, expFmt, expScale, expQuality)) as Blob, expFmt);
        return say('Diunduh sebagai .' + expFmt.toUpperCase() + ' (' + expScale + 'x)');
      }

      if ((expFmt === 'ai' || expFmt === 'eps' || expFmt === 'pdf') && d.objects.some(isLegacyText)) {
        d = await VE.convertDocumentTextToPaths(d, {
          registry: sceneRendererRef.current?.scene?.fontRegistry || null,
        });
      }

      if (expFmt === 'pdf') {
        triggerDl(new Blob([VE.exportPDF(d, { ...opt, bleedMm: pdfBleedMm, cropMarks: pdfCropMarks, colorSpace: pdfColorSpace })], {
          type: 'application/pdf',
        }), 'pdf');
        return say('Diunduh sebagai Vector .PDF' + (pdfColorSpace === 'cmyk' ? ' (CMYK)' : ''));
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

      triggerDl(new Blob([serializeSvgOutput(d, opt)], {
        type: 'image/svg+xml',
      }), 'svg');

      say('Diunduh sebagai .SVG' + (docHasBackgroundBlur({ objects: resolveExportArea(d, opt).objects }) ? ' · Background blur tidak ikut terekspor ke SVG — hanya tampil di aplikasi' : ''));
    } catch (e: any) {
      say('Gagal mengekspor: ' + (e && e.message || 'kesalahan tak dikenal'));
    }
  };

  const batchExport = async (scales: number[] = [1, 2]) => {
    if (!expOk()) return;
    const opt = {
      bg,
      clipFrames,
      area: exportArea,
      only: selRef.current.objs,
      isRaster: false,
    };
    try {
      const sourceDoc = documentForExport(docRef.current);
      const d = typeof AssetManager !== 'undefined' && projectId
        ? await AssetManager.resolveDocForStandaloneExport(projectId, sourceDoc)
        : sourceDoc;
      triggerDl(new Blob([serializeSvgOutput(d, opt)], { type: 'image/svg+xml' }), 'svg', getExportFilename('svg'));
      for (const sc of scales) {
        await new Promise(r => setTimeout(r, 140));
        const blob = (await VE.exportRaster(d, { ...opt, isRaster: true, quality: expQuality }, 'png', sc, expQuality)) as Blob;
        triggerDl(blob, 'png', getExportFilename('png', `@${sc}x`));
      }
      say('Batch export selesai (SVG + PNG ' + scales.map(s => s + 'x').join(', ') + ')');
    } catch (e: any) {
      say('Gagal batch export: ' + (e && e.message || 'kesalahan tak dikenal'));
    }
  };

  return {
    exportSvg,
    downloadSvg,
    batchExport,
    getExportFilename,
    triggerDl,
    isRasterFmt,
    hasImgs,
    expOk,
  };
}
