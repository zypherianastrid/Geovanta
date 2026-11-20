/**
 * @file src/utils/presenceAndFilePicker.tsx
 * @description Hook animasi transisi komponen & dialog pemilih file
 */
import React, { useState, useEffect } from 'react';

const usePresence = (open, ms = 160) => {
  const [m, setM] = useState(open),
    [lv, setLv] = useState(false);
  useEffect(() => {
    if (open) {
      setM(true);
      setLv(false);
      return;
    }
    if (!m) return;
    setLv(true);
    const t = setTimeout(() => {
      setM(false);
      setLv(false);
    }, ms);
    return () => clearTimeout(t);
  }, [open]);
  return [m, lv];
};
/* Teruskan filter `accept` ke dialog sistem sebagai `types`, supaya dialog
   impor font hanya menampilkan .ttf/.otf (sebelumnya: semua file). */
const acceptToTypes = accept => {
  const a = String(accept || '').toLowerCase();
  const types = [];
  if (a.includes('.ttf') || a.includes('.otf')) types.push({description: 'Font', accept: {'font/ttf': ['.ttf'], 'font/otf': ['.otf']}});
  if (a.includes('.svg')) types.push({description: 'SVG', accept: {'image/svg+xml': ['.svg']}});
  if (a.includes('.png') || a.includes('.jpg') || a.includes('.jpeg') || a.includes('.webp') || a.includes('.gif')) types.push({description: 'Gambar', accept: {'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'], 'image/gif': ['.gif']}});
  if (a.includes('.pdf')) types.push({description: 'PDF', accept: {'application/pdf': ['.pdf']}});
  return types.length ? types : undefined;
};
const pickFiles = async (accept, cb) => {
  if (window.showOpenFilePicker) {
    try {
      const hs = await window.showOpenFilePicker({
        multiple: true,
        types: acceptToTypes(accept)
      });
      const fs = await Promise.all(hs.map(h => h.getFile()));
      if (fs.length) cb(fs);
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  window.dispatchEvent(new CustomEvent('svgpeak-open-import'));
};
const pickFile = (accept, cb) => pickFiles(accept, fs => {
  if (fs && fs[0]) cb(fs[0]);
});

export { usePresence, pickFiles, pickFile };
