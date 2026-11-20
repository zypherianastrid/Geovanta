/**
 * @file src/components/modals/IconifyModal.tsx
 * @description Wrapper modal untuk panel Iconify (Task 3 plan "Iconify
 * Pindah ke Modal Popup"). Komponen tipis saja — tanpa logika cari/sisip;
 * semua itu tetap di IconifyPanel.
 *
 * Pola SettingsModal: portal + `.ov` + `.hp` + `usePresence(open, 200)`.
 * - Mount TANPA bungkus kondisional (spec §6.2/Q5): `usePresence` hanya
 *   bisa memainkan animasi keluar bila komponen tetap ter-mount sementara
 *   `open` berubah ke `false`; bila `!m`, return `null`.
 * - `open` diteruskan apa adanya ke panel (ruling R2, bukan literal
 *   `open={true}`): efek panel yang di-gate `open` (probeOnline, listener
 *   Esc, fetch listCollections/loadSet) hanya jalan selama modal terbuka
 *   dan berhenti selama animasi keluar.
 * - Backdrop: `onPointerDown`, tutup hanya bila klik tepat di backdrop
 *   (`e.target === e.currentTarget`) DAN tidak ada dropdown/popover
 *   `.flt` yang terbuka (guard Q4, sama seperti handler Esc panel) —
 *   supaya klik di luar dropdown (cara normal menutup dropdown) tidak
 *   ikut menutup modal dan menghilangkan state panel (query, kategori,
 *   koleksi, halaman).
 * - Ukuran (design §6.1): maxWidth 960, maxHeight 85vh, badan modal bisa
 *   scroll sendiri (grid panjang tidak mendorong dialog keluar layar).
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { usePresence } from '../../utils/presenceAndFilePicker.tsx';
import { IconifyPanel } from '../editor/IconifyPanel.tsx';

const IconifyModal = ({
  open,
  onInsert,
  onClose,
  L,
  recentIcons = []
}) => {
  const [m, lv] = usePresence(open, 200);
  if (!m) return null;
  return ReactDOM.createPortal(<div className={'ov ' + (lv ? 'out' : 'in')} onPointerDown={e => {
    if (e.target !== e.currentTarget) return;
    if (document.querySelector('.flt')) return;
    onClose();
  }}><div className="hp" role="dialog" aria-label={L.icTitle} data-testid="ic-modal" style={{
      width: 'min(1100px, 94vw)',
      maxWidth: '94vw',
      height: 'min(820px, 86vh)',
      maxHeight: '88vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 28px',
      overflow: 'hidden'
    }}><IconifyPanel open={open} onInsert={onInsert} onClose={onClose} L={L} recentIcons={recentIcons} /></div></div>, document.fullscreenElement || document.body);
};

export { IconifyModal };
export default IconifyModal;
