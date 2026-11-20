/**
 * @file src/components/ui/ColorHexInput.tsx
 * @description Komponen kotak teks kode warna CSS/Hex tervalidasi (ColorText)
 */
import React, { useState, useEffect } from 'react';
import { validColor } from '../../utils/colorParserAndFormatter.tsx';
import { CustomTextBox } from './CustomTextBox.tsx';

const HEX_ERR = 'Kode hex tidak valid — gunakan 0-9, a-f';
const BARE_HEX_RE = /^[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i;

/* Normalisasi input mentah -> warna valid (dengan '#') atau null. */
const normHex = raw => {
  const t = String(raw || '').trim();
  if (!t) return null;
  let s = t;
  if (BARE_HEX_RE.test(s)) s = '#' + s;
  return validColor(s) ? s : null;
};

export interface ColorTextProps {
  value: string;
  on: (v: string) => void;
  onChange?: (v?: string) => void;
  L?: any;
}

const ColorText: React.FC<ColorTextProps> = ({
  value,
  on,
  onChange,
  L
}) => {
  /* Draft nilai invalid yang dipertahankan agar bisa diperbaiki (B-F2):
     tanpa ini CustomTextBox kembali menampilkan `value` (nilai lama) begitu
     edit selesai, dan input salah lenyap diam-diam. */
  const [bad, setBad] = useState(null);
  useEffect(() => {
    setBad(null);
  }, [value]);
  const commit = raw => {
    const v = normHex(raw);
    if (v) {
      setBad(null);
      if (v !== value) on(v);
    } else if (String(raw || '').trim()) {
      setBad(String(raw || '').trim());
    } else {
      setBad(null);
    }
  };
  const handleChange = next => {
    /* Bersihkan error begitu input berubah menjadi valid (sebelum commit). */
    if (bad !== null && normHex(next)) setBad(null);
    onChange && onChange(next);
  };
  return <div data-testid="color-text" style={{
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    gap: 2
  }}><div className="fld hexf" style={{
      minWidth: 0
    }} data-tip="veColorText"><CustomTextBox value={bad !== null ? bad : value} ariaLabel={L ? L.cpCssColor : 'Warna CSS'} ariaInvalid={bad !== null} onCommit={commit} onChange={handleChange} onCancel={() => setBad(null)} /></div>{bad !== null && <div data-testid="hex-error" role="alert" style={{
      color: 'var(--danger)',
      fontSize: 11,
      lineHeight: 1.35,
      overflowWrap: 'anywhere'
    }}>{HEX_ERR}</div>}</div>;
};

/* Grup 1: Alat Node & Handle — Set Ikon Geometris Terpadu (24x24, radius & stroke selaras) */

export { ColorText };
export default ColorText;
