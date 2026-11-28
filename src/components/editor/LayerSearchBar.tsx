/**
 * @file src/components/editor/LayerSearchBar.tsx
 * @description Filter tipe layer pada EditorLeftSidebar dengan flex-wrap tanpa scrollbar horizontal
 */
import React from 'react';

export type LayerTypeFilter = 'all' | 'path' | 'text' | 'image' | 'frame';

export interface LayerSearchBarProps {
  lang?: string;
  query?: string;
  onQueryChange?: (q: string) => void;
  typeFilter: LayerTypeFilter;
  onTypeFilterChange: (f: LayerTypeFilter) => void;
}

export const LayerSearchBar: React.FC<LayerSearchBarProps> = ({
  lang = 'id',
  typeFilter,
  onTypeFilterChange,
}) => {
  const isEn = lang === 'en';
  const filters: Array<{ id: LayerTypeFilter; label: string; tip: string }> = [
    { id: 'all', label: isEn ? 'All' : 'Semua', tip: 'veLayFilterAll' },
    { id: 'path', label: 'Path', tip: 'veLayFilterPath' },
    { id: 'text', label: isEn ? 'Text' : 'Teks', tip: 'veLayFilterText' },
    { id: 'image', label: isEn ? 'Image' : 'Gambar', tip: 'veLayFilterImage' },
    { id: 'frame', label: 'Frame', tip: 'veLayFilterFrame' },
  ];

  return (
    <div className="px-2.5 py-2 border-b border-[var(--line)]">
      <div className="flex flex-wrap items-center gap-1.5" data-testid="layer-filter-bar">
        {filters.map(f => (
          <button
            key={f.id}
            type="button"
            data-testid={`layer-filter-${f.id}`}
            data-tip={f.tip}
            className={'ved-pill inline-flex items-center justify-center text-[10px] py-1 px-2 whitespace-nowrap' + (typeFilter === f.id ? ' on' : '')}
            onClick={() => onTypeFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};
