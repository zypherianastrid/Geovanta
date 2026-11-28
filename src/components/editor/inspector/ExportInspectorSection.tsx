/**
 * @file src/components/editor/inspector/ExportInspectorSection.tsx
 * @description Seksi Export & Impor pada panel inspektor kanan (0% native input/select)
 */
import React from 'react';
import { Ico } from '../../ui/IconGlyphs.tsx';
import { Seg } from '../../ui/SegmentedControl.tsx';
import { Range } from '../../ui/RangeField.tsx';
import { Select } from '../../ui/SelectDropdown.tsx';
import { ChartSwitch } from '../ChartCustomInputs.tsx';
import { TIPS, TIPS_EN } from '../../../constants/tooltipsCatalog.tsx';
import { pickFiles } from '../../../utils/presenceAndFilePicker.tsx';

export const ExportInspectorSection = ({
  L,
  lang = 'id',
  expFmt,
  setExpFmt,
  isRasterFmt,
  expScale,
  setExpScale,
  expQuality = 0.92,
  setExpQuality,
  svgMinify = false,
  setSvgMinify,
  pdfBleedMm = 0,
  setPdfBleedMm,
  pdfCropMarks = false,
  setPdfCropMarks,
  pdfColorSpace = 'rgb',
  setPdfColorSpace,
  exportArea,
  setExportArea,
  exportSvg,
  downloadSvg,
  batchExport,
  getExportFilename,
  importFiles,
  applyPri = false,
  onExportBackup,
}: any) => {
  const isEn = lang === 'en';
  const showQuality = expFmt === 'jpg' || expFmt === 'webp';
  const resolvedFilename = typeof getExportFilename === 'function'
    ? getExportFilename(expFmt)
    : `geovanta-project.${expFmt}`;

  return (
    <div className="fig-isec" data-tip="veExpFmt">
      <div className="fig-isec-title">
        <span>{L.riExportImport}</span>
        <button
          type="button"
          className="fig-ibtn inline-flex items-center justify-center"
          data-tip="veImport"
          aria-label={(isEn ? TIPS_EN : TIPS).veImport.t}
          onClick={() =>
            pickFiles(
              '.svg,.ai,.ps,.eps,.pdf,.png,.jpg,.jpeg,.webp,.gif,.ttf,.otf,image/*,font/*,application/postscript,application/pdf',
              (fs: any) => importFiles(fs)
            )
          }
        >
          <Ico n="upload" size={14} />
        </button>
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="fig-sub-lbl">{L.riExportFmt}</div>
          <div className="ved-pills">
            {[['svg', 'SVG'], ['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WEBP'], ['pdf', 'PDF'], ['ai', 'AI'], ['eps', 'EPS']].map(
              ([k, lb]) => (
                <button
                  key={k}
                  type="button"
                  data-tip={'veExp_' + k}
                  data-testid={'export-fmt-' + k}
                  className={'ved-pill inline-flex items-center justify-center' + (expFmt === k ? ' on' : '')}
                  onClick={() => setExpFmt(k)}
                >
                  {lb}
                </button>
              )
            )}
          </div>
        </div>

        {isRasterFmt(expFmt) && (
          <div className="fade">
            <div className="fig-sub-lbl" data-tip="veExpScale">{L.riScaleRes}</div>
            <Seg
              o={[[1, '1x'], [2, '2x (HD)'], [4, '4x (Ultra)']]}
              v={expScale}
              on={setExpScale}
              tip="veExpScale"
              tips={{ 1: 'veExpS_1', 2: 'veExpS_2', 4: 'veExpS_4' }}
            />
          </div>
        )}

        {showQuality && setExpQuality && (
          <div className="fade" data-testid="export-quality-slider">
            <Range
              l={isEn ? 'Quality' : 'Kualitas'}
              v={Math.round(expQuality * 100)}
              min={10}
              max={100}
              step={5}
              on={(v: number) => setExpQuality(Math.max(0.1, Math.min(1, v / 100)))}
              f={(v: number) => `${v}%`}
            />
          </div>
        )}

        {expFmt === 'svg' && setSvgMinify && (
          <div className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-[var(--sub)] select-none">
            <span>{isEn ? 'Minify & Optimize SVG' : 'Minify & Optimasi SVG'}</span>
            <ChartSwitch
              testId="export-svg-minify"
              checked={!!svgMinify}
              onChange={next => setSvgMinify(next)}
              ariaLabel={isEn ? 'Minify & Optimize SVG' : 'Minify & Optimasi SVG'}
            />
          </div>
        )}

        {expFmt === 'pdf' && (
          <div className="fade space-y-2 p-2.5 rounded-lg bg-[var(--sub)]" data-testid="pdf-print-options">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span>{isEn ? 'Color Space' : 'Profil Warna'}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-tip="vePdfColorSpace"
                  className={'ved-pill inline-flex items-center justify-center text-[10px] py-1 px-2.5' + (pdfColorSpace === 'rgb' ? ' on' : '')}
                  onClick={() => setPdfColorSpace && setPdfColorSpace('rgb')}
                >
                  RGB
                </button>
                <button
                  type="button"
                  data-testid="pdf-cmyk-toggle"
                  data-tip="vePdfColorSpace"
                  className={'ved-pill inline-flex items-center justify-center text-[10px] py-1 px-2.5' + (pdfColorSpace === 'cmyk' ? ' on' : '')}
                  onClick={() => setPdfColorSpace && setPdfColorSpace('cmyk')}
                >
                  CMYK
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span>{isEn ? 'Print Bleed' : 'Bleed Cetak'}</span>
              <div className="w-24">
                <Select
                  testId="pdf-bleed-select"
                  value={String(pdfBleedMm)}
                  options={[['0', '0 mm'], ['3', '3 mm'], ['5', '5 mm']]}
                  on={v => setPdfBleedMm && setPdfBleedMm(Number(v) || 0)}
                  lang={lang}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs select-none">
              <span>{isEn ? 'Crop Marks' : 'Tanda Potong (Crop Marks)'}</span>
              <ChartSwitch
                testId="pdf-cropmarks-toggle"
                checked={!!pdfCropMarks}
                onChange={next => setPdfCropMarks && setPdfCropMarks(next)}
                ariaLabel={isEn ? 'Crop Marks' : 'Tanda Potong'}
              />
            </div>
          </div>
        )}

        <div>
          <div className="fig-sub-lbl">{L.riExportArea}</div>
          <Seg
            o={[['board', 'Artboard'], ['content', L.riAreaAll], ['sel', L.riAreaSel]]}
            v={exportArea}
            on={setExportArea}
            tip="veArea"
            tips={{ board: 'veAreaBoard', content: 'veAreaAll', sel: 'veAreaSel' }}
          />
        </div>

        <div
          className="text-[11px] font-mono mut px-2.5 py-1.5 rounded-lg bg-[var(--sub)] truncate"
          data-testid="export-filename-preview"
          title={resolvedFilename}
        >
          {resolvedFilename}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="btn sec fig-cta-btn flex-1 inline-flex items-center justify-center gap-1.5"
            data-tip="veCopy"
            onClick={exportSvg}
          >
            <Ico n="copy" size={14} />
            <span>{L.riCopy} {expFmt.toUpperCase()}</span>
          </button>
          <button
            type="button"
            className={'btn ' + (applyPri ? 'sec' : 'pri') + ' fig-cta-btn flex-1 inline-flex items-center justify-center gap-1.5'}
            data-tip="veDownload"
            onClick={downloadSvg}
          >
            <Ico n="download" size={14} />
            <span>{L.riDownload} .{expFmt.toUpperCase()}</span>
          </button>
        </div>

        {batchExport && (
          <button
            type="button"
            className="btn sec fig-cta-btn w-full text-xs inline-flex items-center justify-center gap-1.5"
            data-testid="export-batch-btn"
            data-tip="veBatchExport"
            onClick={() => batchExport([1, 2])}
          >
            <Ico n="layers" size={13} />
            <span>Batch Export (SVG + PNG 1x, 2x)</span>
          </button>
        )}

        {onExportBackup && (
          <button
            type="button"
            data-tip="veExportBackup"
            className="btn sec fig-cta-btn w-full mt-1.5 text-xs inline-flex items-center justify-center gap-1.5"
            onClick={() => onExportBackup()}
          >
            <Ico n="database" size={13} />
            <span>{L.riExportBackup}</span>
          </button>
        )}
      </div>
    </div>
  );
};
