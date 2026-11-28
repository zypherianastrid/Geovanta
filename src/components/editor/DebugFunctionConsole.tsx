/**
 * @file src/components/editor/DebugFunctionConsole.tsx
 * @description Tab "Konsol Fungsi" di panel Debugging Mode (Pendekatan A):
 * dock kanan setinggi layar. Baris atas "SEDANG BERJALAN" = fungsi dari
 * entri log terbaru; di bawahnya stream "PERUBAHAN" (prev -> next) yang
 * diturunkan dari entri berurutan via describeDebugChange.
 * Hanya render — tidak merekam apa pun sendiri (baca entries dari panel).
 */
import React from 'react';
import { describeDebugChange, getActiveFunction } from '../../utils/debugLogger.tsx';

const DebugFunctionConsole = ({ entries, lang = 'id' }: { entries: any[]; lang?: string }) => {
  const isEn = lang === 'en';
  const active = getActiveFunction(entries || []);
  const changes = [];
  const list = entries || [];
  for (let i = 1; i < list.length; i++) {
    const text = describeDebugChange(list[i - 1], list[i]);
    if (text) changes.push({ seq: list[i].seq, ts: list[i].ts, fn: list[i].fn, text });
  }
  const recent = changes.slice(-100).reverse();
  const timeOf = ts => {
    try {
      return String(ts || '').slice(11, 19);
    } catch (e) {
      return '';
    }
  };
  return <div style={{
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 11,
    lineHeight: 1.5
  }}>
    <div style={{
      padding: '10px 12px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--sub)'
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        opacity: 0.7
      }}>{isEn ? 'CURRENTLY RUNNING' : 'SEDANG BERJALAN'}</div>
      {!active && <div style={{ opacity: 0.7, padding: '6px 0' }}>{isEn ? 'No active function yet — enable Debugging Mode and interact with the canvas.' : 'Belum ada fungsi berjalan — nyalakan Debugging Mode lalu lakukan interaksi di kanvas.'}</div>}
      {active && <div style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{active.fn}</div>
        <div style={{ opacity: 0.85 }}>{active.action}</div>
        <div style={{ opacity: 0.6 }}>{active.file}</div>
        {active.detail ? <div style={{ opacity: 0.7 }}>{active.detail}</div> : null}
        <div style={{ opacity: 0.5 }}>#{active.seq} · {timeOf(active.ts)} · [{active.category}]</div>
      </div>}
    </div>
    <div style={{
        padding: '8px 12px 4px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        opacity: 0.7
      }}>{isEn ? 'CHANGES' : 'PERUBAHAN'} ({recent.length})</div>
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '2px 12px 8px'
      }}>
        {!recent.length && <div style={{ opacity: 0.7, padding: '6px 0' }}>{isEn ? 'No changes recorded yet. Switch tools, zoom, select, or undo to see prev → next here.' : 'Belum ada perubahan tercatat. Ganti tool, zoom, seleksi, atau undo untuk melihat prev → next di sini.'}</div>}
      {recent.map(c => <div key={c.seq} style={{
        padding: '4px 0',
        borderBottom: '1px solid var(--line)'
      }}>
        <div><span style={{ opacity: 0.6 }}>#{c.seq} {timeOf(c.ts)}</span> <span style={{ fontWeight: 700 }}>{c.text}</span></div>
        <div style={{ opacity: 0.6 }}>{c.fn}</div>
      </div>)}
    </div>
  </div>;
};

export { DebugFunctionConsole };
export default DebugFunctionConsole;
