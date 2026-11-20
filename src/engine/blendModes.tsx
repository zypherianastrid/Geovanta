/**
 * @file src/engine/blendModes.tsx
 * @description Definisi grup, opsi UI, normalisasi, dan pemetaan CanvasKit untuk blend mode objek
 */
import type { BlendModeName } from '../types/vectorTypes.ts';

export interface BlendModeItem {
  key: BlendModeName;
  label: string;
}

export interface BlendModeGroup {
  id: string;
  label: string;
  modes: ReadonlyArray<BlendModeItem>;
}

export type BlendModeOptionTuple =
  | [string, string]
  | [string, string, string | null, { disabled?: boolean }];

export const BLEND_MODE_GROUPS: ReadonlyArray<BlendModeGroup> = [
  {
    id: 'normal',
    label: 'Normal',
    modes: [{ key: 'normal', label: 'Normal' }]
  },
  {
    id: 'darken',
    label: 'Darken',
    modes: [
      { key: 'darken', label: 'Darken' },
      { key: 'multiply', label: 'Multiply' },
      { key: 'color-burn', label: 'Color Burn' }
    ]
  },
  {
    id: 'lighten',
    label: 'Lighten',
    modes: [
      { key: 'lighten', label: 'Lighten' },
      { key: 'screen', label: 'Screen' },
      { key: 'color-dodge', label: 'Color Dodge' }
    ]
  },
  {
    id: 'contrast',
    label: 'Contrast',
    modes: [
      { key: 'overlay', label: 'Overlay' },
      { key: 'soft-light', label: 'Soft Light' },
      { key: 'hard-light', label: 'Hard Light' }
    ]
  },
  {
    id: 'inversion',
    label: 'Comparative',
    modes: [
      { key: 'difference', label: 'Difference' },
      { key: 'exclusion', label: 'Exclusion' }
    ]
  },
  {
    id: 'component',
    label: 'Color',
    modes: [
      { key: 'hue', label: 'Hue' },
      { key: 'saturation', label: 'Saturation' },
      { key: 'color', label: 'Color' },
      { key: 'luminosity', label: 'Luminosity' }
    ]
  }
];

export const BLEND_MODE_OPTIONS: ReadonlyArray<BlendModeOptionTuple> = BLEND_MODE_GROUPS.flatMap(
  (group, index) => {
    const items: BlendModeOptionTuple[] = group.modes.map(m => [m.key, m.label]);
    if (index === 0) return items;
    return [
      [`__sep_${group.id}__`, `── ${group.label} ──`, null, { disabled: true }],
      ...items
    ];
  }
);

export const VALID_BLEND_MODES: ReadonlySet<BlendModeName> = new Set<BlendModeName>(
  BLEND_MODE_GROUPS.flatMap(g => g.modes.map(m => m.key))
);

const CK_BLEND_MODE_KEYS: Record<Exclude<BlendModeName, 'normal'>, string> = {
  darken: 'Darken',
  multiply: 'Multiply',
  'color-burn': 'ColorBurn',
  lighten: 'Lighten',
  screen: 'Screen',
  'color-dodge': 'ColorDodge',
  overlay: 'Overlay',
  'soft-light': 'SoftLight',
  'hard-light': 'HardLight',
  difference: 'Difference',
  exclusion: 'Exclusion',
  hue: 'Hue',
  saturation: 'Saturation',
  color: 'Color',
  luminosity: 'Luminosity'
};

/** Menormalisasi nilai blend mode secara case-insensitive; nilai tak dikenal kembali ke 'normal'. */
export function normalizeBlendMode(raw: any): BlendModeName {
  if (typeof raw !== 'string') return 'normal';
  const normalized = raw.trim().toLowerCase() as BlendModeName;
  return VALID_BLEND_MODES.has(normalized) ? normalized : 'normal';
}

/** Memetakan blend mode ke enum CanvasKit BlendMode, atau null untuk 'normal' / kit tidak tersedia. */
export function toCanvasKitBlendMode(kit: any, mode: any): any | null {
  const normalized = normalizeBlendMode(mode);
  if (normalized === 'normal') return null;
  if (!kit || !kit.BlendMode) return null;
  const key = CK_BLEND_MODE_KEYS[normalized];
  const val = key ? kit.BlendMode[key] : undefined;
  return val !== undefined ? val : null;
}
