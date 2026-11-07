/**
 * @file src/utils/zoomAndFormatHelpers.jsx
 * @description Fungsi pemetaan slider zoom logaritmik, pemformat angka, ukuran byte, & waktu relatif
 */
import { VZMIN, VZMAX, VZ_LOG_SPAN } from '../constants/themeAndPrefsConstants.jsx';
import { clampN } from './colorMath.jsx';

const vzToSl = z => Math.round(Math.log(Math.max(VZMIN, Math.min(VZMAX, z || 1)) / VZMIN) / VZ_LOG_SPAN * 10000) / 10;
const vslToZ = v => VZMIN * Math.pow(VZMAX / VZMIN, clampN(v, 0, 1000) / 1000);
const fmtIntId = n => {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const zFmt = z => {
  const p = (Number(z) || 0) * 100;
  if (p >= 100) return fmtIntId(p) + '%';
  if (p >= 10) return p.toFixed(0) + '%';
  if (p >= 1) return p.toFixed(1) + '%';
  return p.toFixed(2) + '%';
};

/* ============================================================================
   PHASE 4 — GOOGLE FONTS URL MANAGER & PERSISTENT STORAGE
   - Validasi URL Google Fonts (css / css2)
   - Injeksi <link rel="stylesheet"> dinamis ke <head>
   - Parsing nama font family & daftar weight (100..900) dari URL
   - Penyimpanan persisten di localStorage & IndexedDB (WorkspaceDB metadata)
   - Reload otomatis saat editor dibuka & hapus manual tanpa menghapus objek teks
   ============================================================================ */

const wsUid = (prefix = 'id') => prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
const isQuotaExceededError = err => {
  if (!err) return false;
  const name = String(err.name || '');
  const msg = String(err.message || '');
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014 || /quota/i.test(name) || /quota/i.test(msg);
};

/* ----------------------------------------------------------------------------
   1. WorkspaceDB — IndexedDB Engine with Schema Migration & Safe Fallback
   ---------------------------------------------------------------------------- */

const formatBytes = bytes => {
  const b = Number(bytes) || 0;
  if (b <= 0) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(2) + ' MB';
};
const formatDateRel = ts => {
  if (!ts) return 'Baru saja';
  const diff = Math.max(0, Date.now() - Number(ts));
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Baru saja';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  try {
    return new Date(ts).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return new Date(ts).toLocaleDateString();
  }
};
const formatDateTimeFull = ts => {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return new Date(ts).toLocaleString();
  }
};

export { vzToSl, vslToZ, fmtIntId, zFmt, wsUid, isQuotaExceededError, formatBytes, formatDateRel, formatDateTimeFull };
