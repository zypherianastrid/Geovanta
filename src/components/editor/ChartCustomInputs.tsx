/**
 * @file src/components/editor/ChartCustomInputs.tsx
 * @description Pembungkus kontrol input 100% kustom Geovanta (0% native <input>/<select>/<textarea>) untuk fitur Charts
 */
import React, { useRef, useEffect } from 'react';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';
import { Select } from '../ui/SelectDropdown.tsx';
import { ColorField } from '../ui/ColorPickerField.tsx';

export const ChartTextInput: React.FC<{
  value: string;
  onChange?: (val: string) => void;
  onCommit?: (val: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
  className?: string;
}> = ({ value, onChange, onCommit, placeholder, ariaLabel, testId, className = '' }) => (
  <div
    className={'fld px-2 py-0.5 flex items-center ' + className}
    style={{ minHeight: 26 }}
    data-testid={testId}
  >
    <CustomTextBox
      value={value ?? ''}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      onChange={onChange}
      onCommit={onCommit || onChange}
    />
  </div>
);

export const ChartNumberInput: React.FC<{
  value: number | string;
  onChange?: (val: number) => void;
  onCommit?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  testId?: string;
  className?: string;
}> = ({ value, onChange, onCommit, min = -1e9, max = 1e9, step = 1, ariaLabel, testId, className = '' }) => {
  const clamp = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return Number(value) || 0;
    return Math.max(min, Math.min(max, n));
  };
  return (
    <div
      className={'fld px-2 py-0.5 flex items-center ' + className}
      style={{ minHeight: 26 }}
      data-testid={testId}
    >
      <CustomTextBox
        value={String(value ?? 0)}
        ariaLabel={ariaLabel}
        filterRe={/[^0-9.-]/g}
        onChange={raw => {
          const n = parseFloat(raw);
          if (Number.isFinite(n) && onChange) onChange(Math.max(min, Math.min(max, n)));
        }}
        onCommit={raw => {
          const n = clamp(raw);
          if (onCommit) onCommit(n);
          else if (onChange) onChange(n);
        }}
        onBump={delta => {
          const cur = Number(value) || 0;
          const next = Math.max(min, Math.min(max, cur + delta * step));
          if (onCommit) onCommit(next);
          else if (onChange) onChange(next);
        }}
      />
    </div>
  );
};

export const ChartSelect: React.FC<{
  value: any;
  options: Array<[any, string, any?, any?]>;
  onChange: (val: any) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  lang?: string;
  testId?: string;
}> = ({ value, options, onChange, searchable = false, searchPlaceholder, lang = 'id', testId }) => (
  <Select
    value={value}
    options={options}
    on={onChange}
    searchable={searchable}
    searchPlaceholder={searchPlaceholder}
    lang={lang}
    testId={testId}
  />
);

export const ChartColorInput: React.FC<{
  value: string;
  onChange: (hex: string, meta?: any) => void;
  onCommit?: (hex: string) => void;
  L?: any;
  testId?: string;
}> = ({ value, onChange, onCommit, L, testId }) => (
  <div data-testid={testId} className="inline-flex items-center">
    <ColorField
      value={value || '#6C5CE7'}
      on={(c, meta) => onChange(c, meta)}
      onCommit={onCommit}
      L={L}
    />
  </div>
);

export const ChartSwitch: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
  testId?: string;
}> = ({ checked, onChange, ariaLabel, testId }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!checked}
    aria-label={ariaLabel}
    data-testid={testId}
    onClick={() => onChange(!checked)}
    style={{
      width: 32,
      height: 18,
      padding: 2,
      borderRadius: 999,
      display: 'inline-flex',
      alignItems: 'center',
      flexShrink: 0,
      cursor: 'pointer',
      border: 'none',
      background: checked ? 'var(--acc)' : 'var(--line)',
      transition: 'background-color .15s ease',
    }}
  >
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 999,
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
        transform: checked ? 'translateX(14px)' : 'translateX(0px)',
        transition: 'transform .15s ease',
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  </button>
);

export const ChartCodeBox: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
  minHeight?: number;
}> = ({ value, onChange, placeholder, ariaLabel, testId, minHeight = 120 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastVal = useRef(value);

  useEffect(() => {
    if (ref.current && value !== lastVal.current && document.activeElement !== ref.current) {
      ref.current.textContent = value || '';
      lastVal.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = value || '';
    }
  }, []);

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      data-testid={testId}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder || ''}
      className="fld w-full p-2 font-mono text-[10px] leading-relaxed overflow-y-auto whitespace-pre-wrap break-words focus:outline-none"
      style={{ minHeight, maxHeight: 240, cursor: 'text', userSelect: 'text' }}
      onKeyDown={e => e.stopPropagation()}
      onInput={e => {
        const txt = e.currentTarget.textContent || '';
        lastVal.current = txt;
        onChange(txt);
      }}
    />
  );
};
