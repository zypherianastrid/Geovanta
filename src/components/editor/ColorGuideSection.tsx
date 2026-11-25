/**
 * @file src/components/editor/ColorGuideSection.tsx
 * @description Seksi Color Guide di Inspector Kanan (mengacu ke VectorCraft Color Guide)
 * Menggunakan komponen input kustom Gevonta (Select, Seg, Range) tanpa native <select>/<input>.
 */
import React, { useMemo, useState } from 'react';
import {
  HARMONY_RULES,
  DEFAULT_GUIDE_OPTIONS,
  HarmonyRuleId,
  VariationMode,
  buildColorGuide,
} from '../../utils/colorHarmony.tsx';
import { Ico } from '../ui/IconGlyphs.tsx';
import { Select } from '../ui/SelectDropdown.tsx';
import { Seg } from '../ui/SegmentedControl.tsx';
import { Range } from '../ui/RangeField.tsx';

interface ColorGuideSectionProps {
  lang?: string;
  currentColor: string;
  targetSlot?: 'fill' | 'stroke';
  hasSelection: boolean;
  onApplyColor: (hex: string, slot: 'fill' | 'stroke') => void;
  onSaveToPalette: (colors: string[]) => void;
}

export const ColorGuideSection: React.FC<ColorGuideSectionProps> = ({
  lang = 'id',
  currentColor,
  hasSelection,
  onApplyColor,
  onSaveToPalette,
}) => {
  const isEn = lang === 'en';
  const [open, setOpen] = useState(false);
  const [baseColor, setBaseColor] = useState<string>(() =>
    currentColor && currentColor !== 'none' && currentColor.startsWith('#') ? currentColor : '#e67828'
  );
  const [rule, setRule] = useState<HarmonyRuleId>('complementary');
  const [variation, setVariation] = useState<VariationMode>('tintsShades');
  const [steps, setSteps] = useState<number>(DEFAULT_GUIDE_OPTIONS.steps);
  const [amount, setAmount] = useState<number>(DEFAULT_GUIDE_OPTIONS.amount);
  const [slot, setSlot] = useState<'fill' | 'stroke'>('fill');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);

  const guide = useMemo(
    () => buildColorGuide(baseColor, rule, { steps, amount, variation }),
    [baseColor, rule, steps, amount, variation]
  );

  const harmonyOptions = useMemo(
    () => HARMONY_RULES.map(r => [r.id, r.label]),
    []
  );

  const variationOptions = useMemo(
    () => [
      ['tintsShades', 'Tints / Shades'],
      ['warmCool', isEn ? 'Warm / Cool' : 'Hangat / Sejuk'],
      ['vividMuted', isEn ? 'Vivid / Muted' : 'Cerah / Redup'],
    ],
    [isEn]
  );

  const stepOptions = useMemo(
    () => [2, 3, 4, 5, 6].map(n => [n, `${n} ${isEn ? 'steps' : 'langkah'}`]),
    [isEn]
  );

  const handleSetBaseFromCurrent = () => {
    if (currentColor && currentColor !== 'none' && currentColor.startsWith('#')) {
      setBaseColor(currentColor);
      setSelectedCells([]);
    }
  };

  const handleCellClick = (e: React.MouseEvent, hex: string) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedCells(prev => (prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex]));
      return;
    }
    setSelectedCells([hex]);
    onApplyColor(hex, slot);
  };

  const handleSave = () => {
    const toSave = selectedCells.length > 0 ? selectedCells : guide.colors;
    onSaveToPalette(Array.from(new Set(toSave.map(c => c.toLowerCase()))));
  };

  return (
    <div className="fig-isec fade" data-testid="color-guide-section" data-tip="veColorGuide">
      <div className="fig-isec-title">
        <button
          type="button"
          data-testid="color-guide-toggle"
          className="flex items-center gap-1.5 text-left flex-1 cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <Ico n="palette" size={13} />
          <span>Color Guide</span>
          <span className="text-[10px] mut font-normal ml-1">{open ? '▾' : '▸'}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="color-guide-base-chip"
            data-color={baseColor}
            title={isEn ? 'Set base color to current color' : 'Jadikan warna aktif sebagai warna dasar'}
            className="w-5 h-5 border border-[var(--line)] cursor-pointer shrink-0"
            style={{ background: baseColor, borderRadius: 7 }}
            onClick={handleSetBaseFromCurrent}
          />
        </div>
      </div>

      {open && (
        <div className="space-y-2.5 pt-1">
          <div className="space-y-1.5">
            <Select
              testId="color-guide-harmony-select"
              lang={lang}
              searchable={true}
              searchPlaceholder={isEn ? 'Search harmony…' : 'Cari harmoni…'}
              value={rule}
              options={harmonyOptions}
              on={v => {
                setRule(v as HarmonyRuleId);
                setSelectedCells([]);
              }}
            />
            <Seg
              cls="eq"
              o={[['fill', 'Fill'], ['stroke', 'Stroke']]}
              v={slot}
              on={v => setSlot(v as 'fill' | 'stroke')}
            />
          </div>

          {/* Harmony Strip */}
          <div
            data-testid="color-guide-strip"
            className="flex gap-1 p-1 bg-[var(--sub)] border border-[var(--line)]"
            style={{ borderRadius: 10 }}
          >
            {guide.colors.map((col, idx) => (
              <button
                key={`${col}-${idx}`}
                type="button"
                data-color={col}
                title={col.toUpperCase()}
                className="flex-1 h-5 cursor-pointer border border-black/15 transition-transform hover:scale-105"
                style={{ background: col, borderRadius: 6 }}
                onClick={e => handleCellClick(e, col)}
              />
            ))}
          </div>

          {/* Variation mode & steps (custom SelectDropdown) */}
          <div className="grid grid-cols-[1fr_auto] gap-1.5 items-center">
            <Select
              testId="color-guide-variation-select"
              lang={lang}
              value={variation}
              options={variationOptions}
              on={v => {
                setVariation(v as VariationMode);
                setSelectedCells([]);
              }}
            />
            <Select
              testId="color-guide-steps-select"
              lang={lang}
              value={steps}
              options={stepOptions}
              on={v => setSteps(Number(v))}
            />
          </div>

          {/* Reach / Amount (custom Range + Slider) */}
          <Range
            l={isEn ? 'Reach' : 'Jangkauan'}
            v={amount}
            min={10}
            max={100}
            step={5}
            f={v => `${v}%`}
            on={v => setAmount(v)}
          />

          {/* Variation Grid */}
          <div data-testid="color-guide-grid" className="space-y-1 p-1 bg-[var(--sub)] border border-[var(--line)]" style={{ borderRadius: 10 }}>
            {guide.grid.map((row, rIdx) => (
              <div key={rIdx} className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                {row.map((cellHex, cIdx) => {
                  const isCenter = cIdx === guide.centerIndex;
                  const isPicked = selectedCells.includes(cellHex);
                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      data-color={cellHex}
                      title={cellHex.toUpperCase()}
                      className="h-5 cursor-pointer transition-transform hover:scale-110"
                      style={{
                        background: cellHex,
                        borderRadius: 5,
                        outline: isPicked
                          ? '2px solid var(--acc)'
                          : isCenter
                          ? '1.5px solid rgba(255,255,255,0.85)'
                          : '1px solid rgba(0,0,0,0.12)',
                        outlineOffset: isPicked ? -1 : 0,
                      }}
                      onClick={e => handleCellClick(e, cellHex)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] mut truncate">
              {!hasSelection
                ? isEn
                  ? 'Select object to apply'
                  : 'Pilih objek untuk terapkan'
                : selectedCells.length > 0
                ? `${selectedCells.length} ${isEn ? 'selected' : 'dipilih'}`
                : isEn
                ? 'Click to apply · Shift+click multi'
                : 'Klik terapkan · Shift+klik pilih banyak'}
            </span>
            <button
              type="button"
              data-testid="color-guide-save-palette"
              className="ved-pill text-[10px] shrink-0"
              style={{ padding: '4px 8px' }}
              onClick={handleSave}
            >
              {isEn ? 'Save to Palette' : 'Simpan ke Palet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorGuideSection;
