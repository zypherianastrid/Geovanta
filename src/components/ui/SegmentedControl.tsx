/**
 * @file src/components/ui/SegmentedControl.tsx
 * @description Komponen kontrol bersegmen animasi pil (Seg & GradChoice)
 */
import React from 'react';
import { Ico } from './IconGlyphs.tsx';

export interface SegProps {
  o: any[];
  v: any;
  on: (val: any) => void;
  tip?: string;
  tips?: Record<string, string>;
  cls?: string;
  disabledKeys?: string[] | Set<string>;
  testId?: string;
  wrap?: boolean;
}

/* Segmented control dengan pil penanda yang bergeser halus (mendukung wrap mode dengan flex-wrap & teks nowrap) */
const Seg: React.FC<SegProps> = ({
  o,
  v,
  on,
  tip,
  tips,
  cls,
  disabledKeys,
  testId,
  wrap
}) => {
  const i = o.findIndex(x => x[0] === v);
  const isWrap = Boolean(wrap || (cls && (cls.includes('seg-wrap') || cls.includes('flex-wrap'))));
  return (
    <div
      className={'seg' + (isWrap ? ' seg-wrap flex-wrap' : '') + (cls ? ' ' + cls : '')}
      data-tip={tip || undefined}
      data-testid={testId}
      style={isWrap ? {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        height: 'auto'
      } : undefined}
    >
      {!isWrap && (
        <div
          className="seg-p"
          style={{
            width: `calc((100% - 6px) / ${o.length})`,
            transform: `translateX(${Math.max(0, i) * 100}%)`,
            opacity: i < 0 ? 0 : 1
          }}
        />
      )}
      {o.map(([k, t, ic]) => {
        const dis = disabledKeys
          ? (disabledKeys instanceof Set ? disabledKeys.has(k) : disabledKeys.includes(k))
          : false;
        const isOn = v === k;
        return (
          <button
            key={k}
            type="button"
            data-seg-val={k}
            data-tip={(tips && tips[k]) || undefined}
            disabled={dis}
            className={(isOn ? 'on' : '') + (dis ? ' disabled opacity-40 cursor-not-allowed' : '')}
            onClick={() => !dis && on(k)}
            style={isWrap ? {
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
              padding: '5px 8px',
              ...(isOn ? {
                background: 'color-mix(in srgb, var(--acc) 18%, var(--card))',
                color: 'var(--fig-sel-ink)',
                boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06)',
                fontWeight: 600
              } : {})
            } : undefined}
          >
            {ic && <Ico n={ic} size={cls && cls.includes('stk') ? 15 : 13} />}
            <span style={isWrap ? { whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip' } : undefined}>
              {t}
            </span>
          </button>
        );
      })}
    </div>
  );
};
/* ---------- Tooltip kustom (delegasi event pada atribut data-tip) ---------- */

/* GradChoice: opsi [k, label, ikon?] — ikon opsional (konvensi sama seperti
   Seg). Prop fillWrap HANYA untuk instance Mode Fill: container jadi
   flex-wrap + tiap tombol flex:1 1 auto (basis konten — membungkus ke baris
   berikut bila tak muat, lalu tumbuh mengisi lebar tanpa sisa) + label nowrap.
   Tanpa fillWrap dan tanpa ikon, perilaku default (grid + tanpa ikon) tidak
   berubah — instance gradInterp & Spread Method tidak tersentuh. */
export interface GradChoiceProps {
  value: any;
  options: any[];
  on: (val: any) => void;
  cols?: number;
  tip?: string;
  tips?: Record<string, string>;
  fillWrap?: boolean;
  testIdPrefix?: string;
}

const GradChoice: React.FC<GradChoiceProps> = ({
  value,
  options,
  on,
  cols,
  tip,
  tips,
  fillWrap,
  testIdPrefix
}) => {
  const prefix = testIdPrefix || 'grad-choice';
  return (
    <div
      className={'gch' + (fillWrap ? ' gch-fill' : '')}
      data-tip={tip}
      style={fillWrap ? {
        display: 'flex',
        flexWrap: 'wrap'
      } : {
        gridTemplateColumns: `repeat(${cols || options.length}, minmax(0, 1fr))`
      }}
    >
      {options.map(([k, label, ic]) => (
        <button
          key={k}
          type="button"
          data-testid={`${prefix}-${k}`}
          data-tip={tips && tips[k]}
          className={value === k ? 'on' : ''}
          onClick={() => on(k)}
          style={fillWrap ? {
            flex: '1 1 auto',
            whiteSpace: 'nowrap',
            gap: 4
          } : undefined}
        >
          {ic && <Ico n={ic} size={13} />}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export { Seg, GradChoice };
