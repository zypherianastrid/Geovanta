/**
 * @file src/components/editor/ArtboardManagerPanel.tsx
 * @description Panel manajemen Multi-Artboard / Multi-Page pada sidebar kiri
 */
import React from 'react';
import type { ArtboardSpec } from '../../types/vectorTypes.ts';
import { Ico } from '../ui/IconGlyphs.tsx';

export interface ArtboardManagerPanelProps {
  lang?: string;
  artboards: ArtboardSpec[];
  activeArtboardId?: string;
  onAddArtboard: () => void;
  onSelectArtboard: (id: string) => void;
  onDeleteArtboard: (id: string) => void;
}

export const ArtboardManagerPanel: React.FC<ArtboardManagerPanelProps> = ({
  lang = 'id',
  artboards,
  activeArtboardId,
  onAddArtboard,
  onSelectArtboard,
  onDeleteArtboard,
}) => {
  const isEn = lang === 'en';
  const curId = activeArtboardId || artboards[0]?.id;

  return (
    <div data-testid="artboard-manager-panel" className="px-2.5 py-2.5 border-b border-[var(--line)] space-y-2 bg-[var(--sub)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider mut">
          {isEn ? 'Artboards' : 'Artboard'} ({artboards.length})
        </span>
        <button
          type="button"
          data-testid="add-artboard-btn"
          data-tip="veArtboardAdd"
          onClick={onAddArtboard}
          className="ved-pill on inline-flex items-center justify-center gap-1 text-[10px] py-1 px-2.5"
        >
          <span>+ {isEn ? 'Add' : 'Tambah'}</span>
        </button>
      </div>
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {artboards.map((ab, idx) => {
          const active = ab.id === curId;
          return (
            <div
              key={ab.id}
              data-testid={`artboard-item-${idx}`}
              onClick={() => onSelectArtboard(ab.id)}
              className={'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ' +
                (active ? 'bg-[var(--acc)] text-white font-medium' : 'bg-[var(--card)] hover:opacity-90')}
            >
              <span className="truncate flex-1">{ab.name}</span>
              <span className="text-[10px] font-mono opacity-80 shrink-0">{ab.width}×{ab.height}</span>
              {artboards.length > 1 && (
                <button
                  type="button"
                  data-tip="veArtboardDelete"
                  aria-label={isEn ? 'Delete artboard' : 'Hapus artboard'}
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteArtboard(ab.id);
                  }}
                  className="inline-flex items-center justify-center opacity-80 hover:opacity-100 p-0.5 shrink-0"
                >
                  <Ico n="trash" size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
