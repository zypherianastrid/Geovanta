/**
 * @file src/components/editor/EditorActionRail.tsx
 * @description Komponen rail navigasi aksi cepat di sisi kiri Vector Editor (EditorActionRail)
 */
import React from 'react';
import { Vi } from '../ui/IconGlyphs.tsx';

const EditorActionRail = ({
  renderRailDropdowns,
  L,
  onSettings,
  lang = 'id'
}: any) => (
  <aside className="fig-nav-rail" aria-label={L ? L.edQuickActions : (lang === 'en' ? 'Quick Vector Actions' : 'Aksi Cepat Vektor')}>
    <div className="fig-nav-dock flex flex-col items-center gap-2">{renderRailDropdowns()}</div>
    {onSettings && (
      <div className="fig-nav-dock flex flex-col items-center gap-2" style={{ marginTop: 'auto', paddingTop: 8 }}>
        <div className="fig-rail-grp">
          <button
            type="button"
            className="dk-b"
            data-tip="settings"
            data-testid="rail-settings-btn"
            aria-label={lang === 'en' ? 'Settings' : 'Pengaturan'}
            onClick={onSettings}
          >
            <Vi d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" s={19} />
          </button>
        </div>
      </div>
    )}
  </aside>
);

export { EditorActionRail };
export default EditorActionRail;
