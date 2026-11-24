/**
 * @file src/components/editor/MobileSelectionActionBar.tsx
 * @description Bilah aksi mengambang khusus mobile di atas dock saat ada objek terseleksi (Gaya, Duplikat, Layer, Hapus, Lainnya)
 */
import React from 'react';
import { Ico } from '../ui/IconGlyphs.tsx';

export interface MobileSelectionActionBarProps {
  count: number;
  lang?: string;
  onOpenStyle: () => void;
  onDuplicate: () => void;
  onOpenLayers: () => void;
  onDelete: () => void;
  onMore: (e: any) => void;
}

const MobileSelectionActionBar: React.FC<MobileSelectionActionBarProps> = ({
  count,
  lang = 'id',
  onOpenStyle,
  onDuplicate,
  onOpenLayers,
  onDelete,
  onMore,
}) => {
  if (!count || count <= 0) return null;
  const isEn = lang === 'en';

  return (
    <div
      className="mob-sel-bar"
      data-testid="mobile-selection-bar"
      role="toolbar"
      aria-label={isEn ? 'Selection Actions' : 'Aksi Seleksi'}
      onPointerDown={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        className="mob-sel-btn"
        data-testid="mob-sel-style"
        onClick={onOpenStyle}
      >
        <Ico n="palette" size={16} />
        <span>{isEn ? 'Style' : 'Gaya'}</span>
      </button>
      <button
        type="button"
        className="mob-sel-btn"
        data-testid="mob-sel-dup"
        onClick={onDuplicate}
      >
        <Ico n="copy" size={16} />
        <span>{isEn ? 'Duplicate' : 'Duplikat'}</span>
      </button>
      <button
        type="button"
        className="mob-sel-btn"
        data-testid="mob-sel-layers"
        onClick={onOpenLayers}
      >
        <Ico n="layers" size={16} />
        <span>{isEn ? 'Layers' : 'Layer'}</span>
      </button>
      <button
        type="button"
        className="mob-sel-btn danger"
        data-testid="mob-sel-delete"
        onClick={onDelete}
      >
        <Ico n="trash" size={16} />
        <span>{isEn ? 'Delete' : 'Hapus'}</span>
      </button>
      <button
        type="button"
        className="mob-sel-btn"
        data-testid="mob-sel-more"
        onClick={onMore}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
        <span>{isEn ? 'More' : 'Lainnya'}</span>
      </button>
    </div>
  );
};

export { MobileSelectionActionBar };
export default MobileSelectionActionBar;
