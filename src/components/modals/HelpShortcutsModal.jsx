/**
 * @file src/components/modals/HelpShortcutsModal.jsx
 * @description Dialog modal daftar pintasan papan ketik (Help)
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { usePresence } from '../../utils/presenceAndFilePicker.jsx';
import { Ico, Keys } from '../ui/IconGlyphs.jsx';
import { SC } from '../../constants/keyboardShortcuts.jsx';

const Help = ({
  open,
  onClose
}) => {
  const [m, lv] = usePresence(open, 200);
  if (!m) return null;
  return ReactDOM.createPortal(<div className={'ov ' + (lv ? 'out' : 'in')} onPointerDown={e => {
    if (e.target === e.currentTarget) onClose();
  }}><div className="hp" role="dialog" aria-label="Pintasan keyboard"><div className="hp-head"><div className="flex items-center justify-between mb-4"><div><div className="text-sm font-semibold">Pintasan keyboard</div><div className="text-[11px] mut mt-0.5">Tombol huruf tidak aktif saat mengetik di kolom input.</div></div><button className="btn sec" style={{
            padding: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            flex: 'none'
          }} onClick={onClose} aria-label="Tutup" data-tip="closeDlg"><Ico n="x" size={14} /></button></div></div><div className="hp-body"><div className="hp-g">{SC.map(([g, rows]) => <div key={g}><div className="hp-t">{g}</div>{rows.map(([k, t]) => <div key={t} className="hp-r"><span>{t}</span><Keys s={k} /></div>)}</div>)}</div></div></div></div>, document.fullscreenElement || document.body);
};
/* ---------- Panel Pengaturan ---------- */

export { Help };
export default Help;
