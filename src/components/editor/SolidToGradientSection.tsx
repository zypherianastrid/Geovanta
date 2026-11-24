/**
 * @file src/components/editor/SolidToGradientSection.tsx
 * @description Seksi sidebar kanan untuk mengubah warna solid objek terpilih
 * menjadi gradien halus (Linear, Radial, Angular) yang relevan secara OKLab/OKLCH.
 */
import React, { useMemo, useRef, useState } from 'react';
import { VE } from '../../engine/vectorEngine.tsx';
import { cssToHex } from '../../utils/colorParserAndFormatter.tsx';
import { Seg } from '../ui/SegmentedControl.tsx';
import { Range } from '../ui/RangeField.tsx';
import {
  applyRelevantGradientToObject,
  extractSourceSolidColors,
  generateRelevantGradients,
  RelevantGradType,
  RelevantGradientPreset
} from '../../engine/solidToGradient.tsx';

export interface SolidToGradientSectionProps {
  L: any;
  lang?: string;
  paintObjs: any[];
  paintTargetIds: Set<string>;
  commitObjs: (mutator: (o: any) => any, histKey?: string) => void;
  say?: (msg: string) => void;
}

const ANGLE_PRESETS = [0, 45, 90, 135];

function extractOnlyTrueSolidColors(objs: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of objs || []) {
    if (!o || o.img || o.locked) continue;
    if (VE.gradOn(o)) continue;
    const raw = o.type === 'text' && o.text ? (o.text.fill || o.fill) : o.fill;
    if (!raw || raw === 'none' || raw === 'transparent') continue;
    const hex = cssToHex(raw);
    if (!seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
    }
  }
  return out;
}

const SolidToGradientSection: React.FC<SolidToGradientSectionProps> = ({
  L,
  lang = 'id',
  paintObjs,
  paintTargetIds,
  commitObjs,
  say
}) => {
  const [gradType, setGradType] = useState<RelevantGradType>('linear');
  const [angle, setAngle] = useState<number>(135);
  const [lastPresetId, setLastPresetId] = useState<string | null>(null);
  const lastAppliedSelKeyRef = useRef<string>('');
  const lastSolidBySelRef = useRef<{ key: string; colors: string[] }>({ key: '', colors: [] });

  const selKey = paintObjs.map(o => o.id).join('|');
  const trueSolidColors = useMemo(() => extractOnlyTrueSolidColors(paintObjs), [paintObjs]);

  if (trueSolidColors.length > 0) {
    lastSolidBySelRef.current = { key: selKey, colors: trueSolidColors };
  }

  const sourceColors = useMemo(() => {
    if (trueSolidColors.length > 0) return trueSolidColors;
    if (lastSolidBySelRef.current.key === selKey && lastSolidBySelRef.current.colors.length > 0) {
      return lastSolidBySelRef.current.colors;
    }
    return extractSourceSolidColors(paintObjs);
  }, [trueSolidColors, selKey, paintObjs]);

  const presets = useMemo(
    () => generateRelevantGradients(sourceColors, gradType, angle),
    [sourceColors, gradType, angle]
  );

  const applyPreset = (preset: RelevantGradientPreset) => {
    if (!paintTargetIds || paintTargetIds.size === 0) return;
    setLastPresetId(preset.id);
    lastAppliedSelKeyRef.current = selKey;
    commitObjs(
      o => (paintTargetIds.has(o.id) && !o.img ? applyRelevantGradientToObject(o, preset) : o),
      'solid-to-grad'
    );
    const label = L[preset.labelKey] || preset.id;
    const typeLabel = gradType === 'radial' ? (L.gradRadial || 'Radial') : gradType === 'angular' ? (L.gradAngular || 'Angular') : (L.gradLinear || 'Linear');
    if (say) {
      const tmpl = L.s2gApplied || (lang === 'en' ? 'Applied smooth {type} gradient ({name})' : 'Gradien halus {type} ({name}) diterapkan');
      say(tmpl.replace('{type}', typeLabel).replace('{name}', label));
    }
  };

  const handleTypeChange = (nextType: RelevantGradType) => {
    setGradType(nextType);
    if (lastPresetId && lastAppliedSelKeyRef.current === selKey && paintObjs.some(o => VE.gradOn(o))) {
      const updated = generateRelevantGradients(sourceColors, nextType, angle);
      const match = updated.find(p => p.id === lastPresetId);
      if (match) applyPreset(match);
    }
  };

  const handleAngleSelect = (nextAngle: number) => {
    setAngle(nextAngle);
    if (lastPresetId && lastAppliedSelKeyRef.current === selKey && paintObjs.some(o => VE.gradOn(o))) {
      const updated = generateRelevantGradients(sourceColors, gradType, nextAngle);
      const match = updated.find(p => p.id === lastPresetId);
      if (match) applyPreset(match);
    }
  };

  const countText = (L.s2gColorsCount || (lang === 'en' ? '{n} color(s)' : '{n} warna')).replace('{n}', String(sourceColors.length));

  return (
    <div className="fig-isec fade" data-testid="solid-to-grad-section" data-tip="veSolidToGrad">
      <div className="fig-isec-title">
        <span>{L.s2gTitle || (lang === 'en' ? 'Solid to Gradient' : 'Solid ke Gradien')}</span>
        {sourceColors.length > 0 && <span className="fig-badge" data-testid="s2g-color-count">{countText}</span>}
      </div>

      {sourceColors.length === 0 ? (
        <div className="text-[11px] mut" data-testid="s2g-empty">
          {L.s2gEmpty || (lang === 'en' ? 'Select an object with a solid fill color to generate smooth gradients.' : 'Pilih objek dengan warna isi solid untuk membuat gradien halus.')}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="fig-sub-lbl mb-0">{L.s2gSourceColors || (lang === 'en' ? 'Source Colors' : 'Warna Sumber')}</span>
            <div className="flex items-center gap-1 flex-wrap justify-end" data-testid="s2g-source-swatches">
              {sourceColors.slice(0, 6).map(hex => (
                <span
                  key={hex}
                  className="swatch"
                  data-color={hex}
                  title={hex.toUpperCase()}
                  style={{ background: hex, width: 16, height: 16, borderRadius: 5, cursor: 'default' }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="fig-sub-lbl">{L.s2gType || (lang === 'en' ? 'Gradient Type' : 'Tipe Gradien')}</div>
            <Seg
              testId="s2g-type-seg"
              tip="veS2gType"
              v={gradType}
              on={handleTypeChange}
              o={[
                ['linear', L.gradLinear || 'Linear'],
                ['radial', L.gradRadial || 'Radial'],
                ['angular', L.gradAngular || 'Angular']
              ]}
              tips={{
                linear: 'veGradLinear',
                radial: 'veGradRadial',
                angular: 'veGradAngular'
              }}
            />
          </div>

          {(gradType === 'linear' || gradType === 'angular') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="fig-sub-lbl mb-0">{L.s2gAngle || (lang === 'en' ? 'Direction' : 'Arah')}</span>
                <div className="flex items-center gap-1">
                  {ANGLE_PRESETS.map(deg => (
                    <button
                      key={deg}
                      type="button"
                      className={'ved-pill text-[10px]' + (angle === deg ? ' on' : '')}
                      style={{ padding: '2px 6px' }}
                      data-tip="veS2gAngle"
                      data-testid={`s2g-angle-${deg}`}
                      onClick={() => handleAngleSelect(deg)}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
              <Range
                l={L.s2gAngle || (lang === 'en' ? 'Angle' : 'Sudut')}
                v={angle}
                min={-180}
                max={180}
                step={5}
                on={v => setAngle(v)}
                onCommit={v => handleAngleSelect(v)}
                tip="veS2gAngle"
                f={v => v + '°'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-0.5" data-testid="s2g-preset-grid">
            {presets.map(p => {
              const isSelected = lastPresetId === p.id && lastAppliedSelKeyRef.current === selKey && paintObjs.some(o => VE.gradOn(o) && o.grad?.type === gradType);
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`s2g-preset-${p.id}`}
                  data-tip="veS2gPreset"
                  onClick={() => applyPreset(p)}
                  className="text-left rounded-xl p-1.5 transition-all"
                  style={{
                    background: 'var(--sub)',
                    border: isSelected ? '1.5px solid var(--acc)' : '1px solid var(--line)',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    className="w-full rounded-lg mb-1"
                    style={{
                      height: 36,
                      background: p.cssPreview,
                      border: '1px solid rgba(128,128,128,0.16)'
                    }}
                  />
                  <div className="text-[10.5px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                    {L[p.labelKey] || p.id}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export { SolidToGradientSection };
export default SolidToGradientSection;
