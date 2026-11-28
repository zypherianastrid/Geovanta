/**
 * @file src/components/editor/devmode/DevModeCanvasOverlay.tsx
 * @description Overlay kanvas khusus Dev Mode (memoized): bounding box hijau Figma (#14AE5C),
 * badge dimensi, highlight hover objek, dan garis ukur redline jarak otomatis tanpa tombol Alt.
 */
import React, { memo } from 'react';
import { DevUnit, formatUnit } from '../../../engine/devModeCodeGen.ts';

export interface DevModeCanvasOverlayProps {
  zoom: number;
  selBox: [number, number, number, number] | null;
  hoverBox: [number, number, number, number] | null;
  hoverLabel?: string;
  devMeasure: {
    targetBox?: [number, number, number, number] | null;
    lines?: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      label: string;
      aux?: { x?: number; y?: number; x1?: number; x2?: number; y1?: number; y2?: number } | null;
    }>;
  } | null;
  unit: DevUnit;
  rootFontSize?: number;
}

export const DevModeCanvasOverlay: React.FC<DevModeCanvasOverlayProps> = memo(({
  zoom,
  selBox,
  hoverBox,
  hoverLabel,
  devMeasure,
  unit,
  rootFontSize = 16,
}) => {
  const z = Math.max(1e-4, zoom || 1);
  const fmtDim = (px: number) => formatUnit(px, unit, rootFontSize);

  return (
    <g className="ved-devmode-overlays" pointerEvents="none">
      {/* Hover target outline + tooltip */}
      {hoverBox && (
        <g data-testid="dev-hover-outline">
          <rect
            x={hoverBox[0]}
            y={hoverBox[1]}
            width={Math.max(0, hoverBox[2] - hoverBox[0])}
            height={Math.max(0, hoverBox[3] - hoverBox[1])}
            fill="color-mix(in srgb, var(--acc) 6%, transparent)"
            stroke="var(--acc)"
            strokeWidth={1.25 / z}
            strokeDasharray={`${4 / z} ${2.5 / z}`}
          />
          {(() => {
            const w = Math.max(0, hoverBox[2] - hoverBox[0]);
            const h = Math.max(0, hoverBox[3] - hoverBox[1]);
            const txt = `${hoverLabel ? hoverLabel + ' · ' : ''}${fmtDim(w)} × ${fmtDim(h)}`;
            const boxW = Math.max(64, txt.length * 6.1 + 14) / z;
            const boxH = 18 / z;
            const bx = hoverBox[0];
            const by = hoverBox[1] - boxH - 4 / z;
            return (
              <g>
                <rect x={bx} y={by} width={boxW} height={boxH} rx={4 / z} fill="#18181B" />
                <text
                  x={bx + 7 / z}
                  y={by + 12.5 / z}
                  fontSize={10 / z}
                  fontWeight="600"
                  fontFamily="ui-monospace, monospace"
                  fill="#FFFFFF"
                >
                  {txt}
                </text>
              </g>
            );
          })()}
        </g>
      )}

      {/* Selected element green bounding box & dimension badge */}
      {selBox && (
        <g data-testid="dev-sel-badge">
          <rect
            x={selBox[0]}
            y={selBox[1]}
            width={Math.max(0, selBox[2] - selBox[0])}
            height={Math.max(0, selBox[3] - selBox[1])}
            fill="none"
            stroke="var(--acc)"
            strokeWidth={1.6 / z}
          />
          {(() => {
            const w = Math.max(0, selBox[2] - selBox[0]);
            const h = Math.max(0, selBox[3] - selBox[1]);
            const txt = `${fmtDim(w)} × ${fmtDim(h)}`;
            const bw = Math.max(54, txt.length * 6.4 + 14) / z;
            const bh = 18 / z;
            const cx = (selBox[0] + selBox[2]) / 2;
            const bx = cx - bw / 2;
            const by = selBox[3] + 6 / z;
            return (
              <g>
                <rect x={bx} y={by} width={bw} height={bh} rx={4 / z} fill="var(--acc)" />
                <text
                  x={cx}
                  y={by + 12.5 / z}
                  textAnchor="middle"
                  fontSize={10 / z}
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                  fill="#FFFFFF"
                >
                  {txt}
                </text>
              </g>
            );
          })()}
        </g>
      )}

      {/* Always-on Redline Distance Guides */}
      {devMeasure && devMeasure.lines && devMeasure.lines.length > 0 && (
        <g data-testid="dev-redline-guides" pointerEvents="none">
          {devMeasure.targetBox && (
            <rect
              x={devMeasure.targetBox[0]}
              y={devMeasure.targetBox[1]}
              width={Math.max(0, devMeasure.targetBox[2] - devMeasure.targetBox[0])}
              height={Math.max(0, devMeasure.targetBox[3] - devMeasure.targetBox[1])}
              fill="none"
              stroke="#F24822"
              strokeWidth={1.2 / z}
              strokeDasharray={`${3 / z} ${2 / z}`}
            />
          )}
          {devMeasure.lines.map((ln, idx) => {
            const mx = (ln.x1 + ln.x2) / 2;
            const my = (ln.y1 + ln.y2) / 2;
            const horiz = Math.abs(ln.y2 - ln.y1) < 1e-4;
            const tick = 4.5 / z;
            const rawNum = parseFloat(ln.label);
            const displayLabel = Number.isFinite(rawNum) ? fmtDim(rawNum) : ln.label;
            const pillW = Math.max(30, displayLabel.length * 6.1 + 10) / z;
            const pillH = 16 / z;
            return (
              <g key={`dev-red-${idx}`} stroke="#F24822" strokeWidth={1.3 / z}>
                <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} />
                {horiz ? (
                  <>
                    <line x1={ln.x1} y1={ln.y1 - tick} x2={ln.x1} y2={ln.y1 + tick} />
                    <line x1={ln.x2} y1={ln.y2 - tick} x2={ln.x2} y2={ln.y2 + tick} />
                  </>
                ) : (
                  <>
                    <line x1={ln.x1 - tick} y1={ln.y1} x2={ln.x1 + tick} y2={ln.y1} />
                    <line x1={ln.x2 - tick} y1={ln.y2} x2={ln.x2 + tick} y2={ln.y2} />
                  </>
                )}
                {ln.aux &&
                  (ln.aux.x != null ? (
                    <line
                      x1={ln.aux.x}
                      y1={ln.aux.y1}
                      x2={ln.aux.x}
                      y2={ln.aux.y2}
                      strokeDasharray={`${2.5 / z} ${2.5 / z}`}
                    />
                  ) : (
                    <line
                      x1={ln.aux.x1}
                      y1={ln.aux.y}
                      x2={ln.aux.x2}
                      y2={ln.aux.y}
                      strokeDasharray={`${2.5 / z} ${2.5 / z}`}
                    />
                  ))}
                <rect
                  x={mx - pillW / 2}
                  y={my - pillH / 2}
                  width={pillW}
                  height={pillH}
                  rx={4 / z}
                  fill="#F24822"
                  stroke="none"
                />
                <text
                  x={mx}
                  y={my + 3.4 / z}
                  textAnchor="middle"
                  fontSize={9.5 / z}
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                  fill="#FFFFFF"
                  stroke="none"
                >
                  {displayLabel}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
});

export default DevModeCanvasOverlay;
