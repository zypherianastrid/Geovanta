/**
 * @file src/components/editor/MobileEditorTopBar.tsx
 * @description Bilah atas khusus Mode Mobile (<= 768px) untuk navigasi proyek, Undo/Redo, Zoom Fit, Aksi Cepat, Layer, & Inspektor
 */
import React from 'react';
import { Vi, Ico } from '../ui/IconGlyphs.tsx';
import { zFmt } from '../../utils/zoomAndFormatHelpers.tsx';

export interface MobileEditorTopBarProps {
  L: any;
  lang?: string;
  projectName?: string;
  saveStatus?: string;
  onBackToWorkspace?: () => void;
  onRenameProject?: () => void;
  canUndo?: boolean;
  undo?: () => void;
  canRedo?: boolean;
  redo?: () => void;
  zoom: number;
  displayZoomRef?: React.MutableRefObject<number>;
  mobZoomPctRef?: React.RefObject<HTMLButtonElement | null>;
  fitView: () => void;
  leftOpen: boolean;
  onToggleLeft: () => void;
  rightOpen: boolean;
  onToggleRight: () => void;
  railOpen: boolean;
  onToggleRail: () => void;
  selCount?: number;
}

const MobileEditorTopBar: React.FC<MobileEditorTopBarProps> = ({
  L,
  lang = 'id',
  projectName = 'Untitled Project',
  saveStatus = 'saved',
  onBackToWorkspace,
  onRenameProject,
  canUndo = false,
  undo,
  canRedo = false,
  redo,
  zoom,
  displayZoomRef,
  mobZoomPctRef,
  fitView,
  leftOpen,
  onToggleLeft,
  rightOpen,
  onToggleRight,
  railOpen,
  onToggleRail,
  selCount = 0,
}) => {
  const isEn = lang === 'en';
  const zoomText = zFmt((displayZoomRef && displayZoomRef.current) || zoom);

  return (
    <header
      className="mob-editor-topbar"
      data-testid="mobile-editor-topbar"
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="mob-top-grp">
        {onBackToWorkspace && (
          <button
            type="button"
            className="mob-top-btn"
            data-testid="mob-back-btn"
            aria-label={isEn ? 'Back to Workspace' : 'Kembali ke Workspace'}
            onClick={onBackToWorkspace}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="mob-proj-btn"
          data-testid="mob-proj-btn"
          aria-label={isEn ? 'Rename Project' : 'Ubah Nama Proyek'}
          onClick={() => onRenameProject && onRenameProject()}
        >
          <span className={'mob-save-dot st-' + (saveStatus || 'saved')} aria-hidden="true" />
          <span className="truncate">{projectName || 'Untitled Project'}</span>
        </button>
      </div>

      <div className="mob-top-grp">
        <button
          type="button"
          className="mob-top-btn"
          data-testid="mob-undo-btn"
          disabled={!canUndo}
          aria-label="Undo"
          onClick={() => undo && undo()}
        >
          <Vi d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" s={15} />
        </button>
        <button
          type="button"
          className="mob-top-btn"
          data-testid="mob-redo-btn"
          disabled={!canRedo}
          aria-label="Redo"
          onClick={() => redo && redo()}
        >
          <Vi d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 13" s={15} />
        </button>
        <button
          type="button"
          ref={mobZoomPctRef as any}
          className="mob-zoom-pill"
          data-testid="mob-zoom-fit-btn"
          aria-label={L.riFit || (isEn ? 'Fit to screen' : 'Paskan ke layar')}
          onClick={fitView}
        >
          {zoomText}
        </button>
        <button
          type="button"
          className={'mob-top-btn' + (railOpen ? ' on' : '')}
          data-testid="mob-rail-btn"
          aria-pressed={railOpen}
          aria-label={L.edQuickActions || (isEn ? 'Quick Actions' : 'Aksi Cepat')}
          onClick={onToggleRail}
        >
          <Ico n="sparkle" size={15} />
        </button>
        <button
          type="button"
          className={'mob-top-btn' + (leftOpen ? ' on' : '')}
          data-testid="mob-layers-btn"
          aria-pressed={leftOpen}
          aria-label={L.edLayers || 'Layers'}
          onClick={onToggleLeft}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 4.5-9 4.5-9-4.5Z" />
            <path d="M3 12l9 4.5 9-4.5" />
            <path d="M3 16.5l9 4.5 9-4.5" />
          </svg>
        </button>
        <button
          type="button"
          className={'mob-top-btn' + (rightOpen ? ' on' : '')}
          data-testid="mob-inspector-btn"
          aria-pressed={rightOpen}
          aria-label={isEn ? 'Inspector' : 'Inspektor'}
          onClick={onToggleRight}
        >
          <Ico n="sliders" size={15} />
          {selCount > 0 && <span className="mob-badge">{selCount > 99 ? '99+' : selCount}</span>}
        </button>
      </div>
    </header>
  );
};

export { MobileEditorTopBar };
export default MobileEditorTopBar;
