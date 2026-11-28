/**
 * @file src/components/editor/HistoryTimelinePanel.tsx
 * @description Panel Visual History Timeline & Named Version Snapshots (0% native input)
 */
import React, { useState } from 'react';
import { Ico } from '../ui/IconGlyphs.tsx';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';

export interface NamedSnapshot {
  id: string;
  name: string;
  createdAt: number;
  doc: any;
}

export interface HistoryTimelinePanelProps {
  embedded?: boolean;
  lang?: string;
  labels: string[];
  currentIndex: number;
  onJumpToHistory: (idx: number) => void;
  snapshots: NamedSnapshot[];
  onSaveSnapshot: (name: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onClose: () => void;
}

export const HistoryTimelinePanel: React.FC<HistoryTimelinePanelProps> = ({
  embedded = false,
  lang = 'id',
  labels,
  currentIndex,
  onJumpToHistory,
  snapshots,
  onSaveSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClose,
}) => {
  const isEn = lang === 'en';
  const [tab, setTab] = useState<'history' | 'snapshots'>('history');
  const [snapName, setSnapName] = useState('');

  const handleSave = (val?: string) => {
    const trimmed = String(val ?? snapName).trim();
    if (!trimmed) return;
    onSaveSnapshot(trimmed);
    setSnapName('');
  };

  return (
    <div
      data-testid="history-timeline-panel"
      className={embedded
        ? 'w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] overflow-hidden flex flex-col'
        : 'fixed bottom-16 right-4 z-[68] w-72 rounded-xl shadow-2xl border border-[var(--line)] bg-[var(--card)] overflow-hidden flex flex-col'}
      style={{ maxHeight: embedded ? 260 : 380 }}
      onPointerDown={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[var(--line)]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="history-tab-timeline"
            data-tip="veHistTabTimeline"
            className={'ved-pill inline-flex items-center justify-center gap-1 text-[11px] py-1 px-2.5' + (tab === 'history' ? ' on' : '')}
            onClick={() => setTab('history')}
          >
            <span>{isEn ? 'History' : 'Riwayat'} ({labels.length})</span>
          </button>
          <button
            type="button"
            data-testid="history-tab-snapshots"
            data-tip="veHistTabSnapshots"
            className={'ved-pill inline-flex items-center justify-center gap-1 text-[11px] py-1 px-2.5' + (tab === 'snapshots' ? ' on' : '')}
            onClick={() => setTab('snapshots')}
          >
            <span>{isEn ? 'Snapshots' : 'Snapshot'} ({snapshots.length})</span>
          </button>
        </div>
        <button
          type="button"
          data-tip="closeDlg"
          className="fig-ibtn inline-flex items-center justify-center text-xs"
          aria-label={isEn ? 'Close' : 'Tutup'}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {tab === 'history' ? (
        <div
          className="p-2.5 space-y-1.5 overflow-y-auto flex-1"
          style={{ scrollbarWidth: 'thin', overscrollBehavior: 'contain' }}
          onWheel={e => e.stopPropagation()}
        >
          {labels.map((lbl, idx) => {
            const active = idx === currentIndex;
            const future = idx > currentIndex;
            return (
              <button
                key={idx}
                type="button"
                data-testid={`history-step-${idx}`}
                data-tip="veHistStep"
                onClick={() => onJumpToHistory(idx)}
                className={'w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ' +
                  (active ? 'bg-[var(--acc)] text-white font-medium' : 'hover:bg-[var(--sub)]')}
                style={future ? { opacity: 0.55 } : undefined}
              >
                <span className="truncate">{idx === 0 ? (isEn ? 'Initial State' : 'Kondisi Awal') : lbl}</span>
                <span className="text-[10px] font-mono opacity-80 shrink-0">#{idx}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="p-2.5 space-y-2.5 overflow-y-auto flex-1"
          style={{ scrollbarWidth: 'thin', overscrollBehavior: 'contain' }}
          onWheel={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <div
              data-testid="snapshot-name-input"
              className="fld flex-1 flex items-center px-2.5 py-1 min-w-0"
              style={{ minHeight: 28 }}
              onClick={e => {
                const el = e.currentTarget.querySelector('[role="textbox"]') as HTMLElement | null;
                el?.focus();
              }}
            >
              <CustomTextBox
                value={snapName}
                placeholder={isEn ? 'Snapshot name...' : 'Nama snapshot...'}
                ariaLabel={isEn ? 'Snapshot name' : 'Nama snapshot'}
                onChange={v => setSnapName(v)}
                onCommit={v => {
                  setSnapName(v);
                }}
              />
            </div>
            <button
              type="button"
              data-testid="save-snapshot-btn"
              data-tip="veHistSaveSnap"
              className="btn pri inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 shrink-0"
              onClick={() => handleSave()}
            >
              <span>{isEn ? 'Save' : 'Simpan'}</span>
            </button>
          </div>
          {snapshots.length === 0 ? (
            <div className="text-[11px] mut py-3 text-center">
              {isEn ? 'No saved snapshots yet.' : 'Belum ada snapshot tersimpan.'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {snapshots.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--sub)] text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-[10px] mut">
                      {new Date(s.createdAt).toLocaleTimeString()} · {s.doc?.objects?.length || 0} obj
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="restore-snapshot-btn"
                    data-tip="veHistRestoreSnap"
                    className="ved-pill on inline-flex items-center justify-center text-[10px] py-1 px-2.5 shrink-0"
                    onClick={() => onRestoreSnapshot(s.id)}
                  >
                    {isEn ? 'Restore' : 'Pulihkan'}
                  </button>
                  <button
                    type="button"
                    data-tip="veHistDeleteSnap"
                    className="fig-ibtn inline-flex items-center justify-center text-xs shrink-0"
                    aria-label={isEn ? 'Delete snapshot' : 'Hapus snapshot'}
                    onClick={() => onDeleteSnapshot(s.id)}
                  >
                    <Ico n="trash" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
