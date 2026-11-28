/**
 * @file src/components/editor/devmode/DevModeBoxModel.tsx
 * @description Diagram Box Model interaktif ala Figma Dev Mode (Offset/Margin -> Border -> Padding -> Content W x H),
 * dioptimalkan dengan React.memo dan hover-zone highlight.
 */
import React, { memo, useState } from 'react';
import { DevBoxModel, DevUnit, formatUnitNumber } from '../../../engine/devModeCodeGen.ts';

export interface DevModeBoxModelProps {
  boxModel: DevBoxModel;
  unit: DevUnit;
  rootFontSize?: number;
  lang?: string;
  onCopy?: (val: string, label: string) => void;
}

type BoxZone = 'offset' | 'border' | 'pad' | 'content' | null;

export const DevModeBoxModel: React.FC<DevModeBoxModelProps> = memo(({
  boxModel,
  unit,
  rootFontSize = 16,
  lang = 'id',
  onCopy,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<BoxZone>(null);
  const isEn = lang === 'en';
  const fmt = (px: number) => formatUnitNumber(px, unit, rootFontSize);

  const handleCopy = (key: string, pxVal: number, label: string) => {
    const formatted = `${fmt(pxVal)}${unit}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formatted).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 900);
    onCopy?.(formatted, label);
  };

  const handleCopyDims = () => {
    const formatted = `${fmt(boxModel.width)}${unit} x ${fmt(boxModel.height)}${unit}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formatted).catch(() => {});
    }
    setCopiedKey('dims');
    setTimeout(() => setCopiedKey(prev => (prev === 'dims' ? null : prev)), 900);
    onCopy?.(formatted, 'Size');
  };

  const hasPadding =
    boxModel.paddingTop > 0 ||
    boxModel.paddingRight > 0 ||
    boxModel.paddingBottom > 0 ||
    boxModel.paddingLeft > 0;

  const ValBtn = ({
    k,
    px,
    label,
    cls = '',
  }: {
    k: string;
    px: number;
    label: string;
    cls?: string;
  }) => (
    <button
      type="button"
      title={isEn ? `Click to copy ${label}` : `Klik untuk salin ${label}`}
      onClick={e => {
        e.stopPropagation();
        handleCopy(k, px, label);
      }}
      className={
        'px-1 py-0.5 rounded text-[10px] font-mono tabular-nums transition-colors cursor-pointer ' +
        (copiedKey === k
          ? 'bg-[var(--acc)] text-white font-semibold'
          : 'hover:bg-black/10 dark:hover:bg-white/10 text-[var(--ink)]') +
        (cls ? ' ' + cls : '')
      }
    >
      {copiedKey === k ? '✓' : fmt(px)}
    </button>
  );

  return (
    <div
      data-testid="dev-mode-box-model"
      className="rounded-lg border border-[var(--line)] bg-[var(--sub)] p-2 select-none"
      onMouseLeave={() => setHoveredZone(null)}
    >
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider mut">
          Box Model
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--acc)' }}>
          {hoveredZone ? `${hoveredZone} · ${unit}` : unit}
        </span>
      </div>

      {/* Outer: Offset / Margin */}
      <div
        onMouseEnter={() => setHoveredZone('offset')}
        className={
          'relative rounded-md border border-dashed px-5 py-4 flex flex-col items-center justify-center transition-colors ' +
          (hoveredZone === 'offset'
            ? 'border-amber-500 bg-amber-500/[0.10]'
            : 'border-amber-500/50 bg-amber-500/[0.04]')
        }
        title={isEn ? 'Offset from parent frame / artboard' : 'Jarak dari parent frame / artboard'}
      >
        <span className="absolute top-0.5 left-1.5 text-[9px] font-mono text-amber-600 dark:text-amber-400 opacity-85">
          offset
        </span>
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
          <ValBtn k="ot" px={boxModel.offsetTop} label="offsetTop" />
        </div>
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          <ValBtn k="ob" px={boxModel.offsetBottom} label="offsetBottom" />
        </div>
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2">
          <ValBtn k="ol" px={boxModel.offsetLeft} label="offsetLeft" />
        </div>
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2">
          <ValBtn k="or" px={boxModel.offsetRight} label="offsetRight" />
        </div>

        {/* Border ring */}
        <div
          onMouseEnter={e => {
            e.stopPropagation();
            setHoveredZone('border');
          }}
          className={
            'w-full rounded border px-4 py-3 relative flex items-center justify-center transition-colors ' +
            (hoveredZone === 'border'
              ? 'border-sky-500 bg-sky-500/[0.12]'
              : boxModel.borderWidth > 0
                ? 'border-sky-500/60 bg-sky-500/[0.06]'
                : 'border-[var(--line)] bg-[var(--card)]/70')
          }
        >
          <span className="absolute top-0.5 left-1.5 text-[9px] font-mono text-sky-600 dark:text-sky-400 opacity-85">
            border
          </span>
          <div className="absolute top-0.5 right-1.5">
            <ValBtn k="bw" px={boxModel.borderWidth} label="borderWidth" />
          </div>

          {/* Padding or Content */}
          {hasPadding ? (
            <div
              onMouseEnter={e => {
                e.stopPropagation();
                setHoveredZone('pad');
              }}
              className={
                'w-full rounded border px-4 py-3 mt-1.5 relative flex items-center justify-center transition-colors ' +
                (hoveredZone === 'pad'
                  ? 'border-emerald-500 bg-emerald-500/[0.14]'
                  : 'border-emerald-500/50 bg-emerald-500/[0.06]')
              }
            >
              <span className="absolute top-0.5 left-1.5 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 opacity-85">
                pad
              </span>
              <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
                <ValBtn k="pt" px={boxModel.paddingTop} label="paddingTop" />
              </div>
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                <ValBtn k="pb" px={boxModel.paddingBottom} label="paddingBottom" />
              </div>
              <div className="absolute left-0.5 top-1/2 -translate-y-1/2">
                <ValBtn k="pl" px={boxModel.paddingLeft} label="paddingLeft" />
              </div>
              <div className="absolute right-0.5 top-1/2 -translate-y-1/2">
                <ValBtn k="pr" px={boxModel.paddingRight} label="paddingRight" />
              </div>
              <button
                type="button"
                onMouseEnter={e => {
                  e.stopPropagation();
                  setHoveredZone('content');
                }}
                onClick={handleCopyDims}
                className="mt-1 px-2.5 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer"
                style={{
                  background: 'color-mix(in srgb, var(--acc) 16%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--acc) 45%, transparent)',
                  color: 'var(--acc)',
                }}
              >
                {copiedKey === 'dims' ? (isEn ? 'Copied!' : 'Disalin!') : `${fmt(boxModel.width)} × ${fmt(boxModel.height)}`}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onMouseEnter={e => {
                e.stopPropagation();
                setHoveredZone('content');
              }}
              onClick={handleCopyDims}
              className="mt-2 px-3 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer"
              style={{
                background: 'color-mix(in srgb, var(--acc) 16%, transparent)',
                border: '1px solid color-mix(in srgb, var(--acc) 45%, transparent)',
                color: 'var(--acc)',
              }}
            >
              {copiedKey === 'dims' ? (isEn ? 'Copied!' : 'Disalin!') : `${fmt(boxModel.width)} × ${fmt(boxModel.height)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default DevModeBoxModel;
