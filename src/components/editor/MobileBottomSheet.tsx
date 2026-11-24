/**
 * @file src/components/editor/MobileBottomSheet.tsx
 * @description Wadah Bottom Sheet yang dapat diseret naik/turun (half/expanded/dismiss) untuk Mode Mobile
 */
import React, { useRef, useState } from 'react';
import { Ico } from '../ui/IconGlyphs.tsx';

export interface MobileBottomSheetProps {
  testId: string;
  title: string;
  closeTestId?: string;
  closeLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  testId,
  title,
  closeTestId,
  closeLabel = 'Tutup',
  onClose,
  children,
}) => {
  const [sheetState, setSheetState] = useState<'half' | 'expanded'>('half');
  const [dragY, setDragY] = useState<number>(0);
  const dragRef = useRef<{ pid: number; startY: number; curY: number } | null>(null);

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement)?.closest('button')) return;
    e.stopPropagation();
    dragRef.current = { pid: e.pointerId, startY: e.clientY, curY: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pid !== e.pointerId) return;
    dragRef.current.curY = e.clientY;
    const dy = e.clientY - dragRef.current.startY;
    setDragY(Math.max(-90, Math.min(260, dy)));
  };

  const onHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pid !== e.pointerId) return;
    const dy = dragRef.current.curY - dragRef.current.startY;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setDragY(0);
    if (dy > 75) {
      onClose();
    } else if (dy < -50) {
      setSheetState('expanded');
    } else if (sheetState === 'expanded' && dy > 45) {
      setSheetState('half');
    }
  };

  return (
    <div
      className={'mob-sheet-wrap' + (sheetState === 'expanded' ? ' expanded' : '')}
      data-testid={testId}
      data-sheet-state={sheetState}
      role="dialog"
      aria-label={title}
      style={
        dragY !== 0
          ? {
              transform: `translateY(${Math.max(0, dragY)}px)`,
              transition: 'none',
            }
          : undefined
      }
      onPointerDown={e => e.stopPropagation()}
    >
      <div
        className="mob-sheet-header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <div className="mob-sheet-pill" aria-hidden="true" />
        <span className="text-xs font-semibold">{title}</span>
        <button
          type="button"
          className="mob-top-btn"
          data-testid={closeTestId}
          aria-label={closeLabel}
          onClick={onClose}
        >
          <Ico n="x" size={14} />
        </button>
      </div>
      {children}
    </div>
  );
};

export { MobileBottomSheet };
export default MobileBottomSheet;
