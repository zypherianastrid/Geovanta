/**
 * @file src/components/modals/HelpShortcutsModal.tsx
 * @description Dialog modal daftar pintasan papan ketik (Help)
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { usePresence } from '../../utils/presenceAndFilePicker.tsx';
import { Ico, Keys } from '../ui/IconGlyphs.tsx';
import { SC, SC_EN } from '../../constants/keyboardShortcuts.tsx';
import { getAppStr } from '../../constants/appI18n.tsx';

const Help = ({
  open,
  onClose,
  lang = 'id'
}) => {
  const L = getAppStr(lang);
  const scList: any[] = lang === 'en' ? SC_EN : SC;
  const [m, lv] = usePresence(open, 200);
  if (!m) return null;
  return ReactDOM.createPortal(<div className={'ov ' + (lv ? 'out' : 'in')} onPointerDown={e => {
    if (e.target === e.currentTarget) onClose();
  }}><div className="hp" role="dialog" aria-label={L.helpTitle}><div className="hp-head"><div className="flex items-center justify-between mb-4"><div><div className="text-sm font-semibold">{L.helpTitle}</div><div className="text-[11px] mut mt-0.5">{L.helpNote}</div></div><button className="btn sec" style={{
            padding: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            flex: 'none'
          }} onClick={onClose} aria-label={L.cClose} data-tip="closeDlg"><Ico n="x" size={14} /></button></div></div><div className="hp-body"><div className="hp-g">{scList.map(([g, rows]: any) => <div key={g}><div className="hp-t">{g}</div>{rows.map(([k, t]: any) => <div key={t} className="hp-r"><span>{t}</span><Keys s={k} /></div>)}</div>)}</div></div></div></div>, document.fullscreenElement || document.body);
};
/* ---------- Panel Pengaturan ---------- */

export { Help };
export default Help;
