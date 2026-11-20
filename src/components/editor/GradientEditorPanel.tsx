/**
 * @file src/components/editor/GradientEditorPanel.tsx
 * @description Panel inspektor editor gradien multi-stop tingkat lanjut (GradientEditorPanel)
 */
import React, { useRef } from 'react';
import { VE } from '../../engine/vectorEngine.tsx';
import { cssToHex, parseColorWithAlpha } from '../../utils/colorParserAndFormatter.tsx';
import { clampN } from '../../utils/colorMath.tsx';
import { GradChoice } from '../ui/SegmentedControl.tsx';
import { ColorField } from '../ui/ColorPickerField.tsx';
import { Ico } from '../ui/IconGlyphs.tsx';
import { Range } from '../ui/RangeField.tsx';
import { GRAD_PRESETS } from '../../constants/editorToolsAndShapes.tsx';
import { directPaintEdit } from '../../engine/colorStyles.tsx';
import { copySolidPaint, copyGradientPaint, readPaintClipboard, applyGradientPayloadToObj, useCopyFeedback } from '../../utils/colorClipboard.tsx';

export interface GradientEditorPanelProps {
  L: any;
  lang?: string;
  docStyles?: any[];
  obj: any;
  selObjs: any[];
  commitObjs: (mutator: (o: any) => any, histKey?: string) => void;
  livePaint?: (mutator: (o: any) => any, opts?: any) => void;
  commitPaint?: (mutator: ((o: any) => any) | null, histKey?: string) => void;
  say?: (msg: string) => void;
  activeStopId: string | null;
  setActiveStopId: (id: string | null) => void;
  slot?: 'fill' | 'stroke';
  onActivateSlot?: () => void;
  showGizmoFocusToggle?: boolean;
  isCanvasGizmoActive?: boolean;
  onFocusCanvasGizmo?: () => void;
  testIdPrefix?: string;
}

const GradientEditorPanel: React.FC<GradientEditorPanelProps> = ({
  L,
  lang = 'id',
  docStyles = [],
  obj,
  selObjs,
  commitObjs,
  livePaint,
  commitPaint,
  say,
  activeStopId,
  setActiveStopId,
  slot = 'fill',
  onActivateSlot,
  showGizmoFocusToggle = false,
  isCanvasGizmoActive = false,
  onFocusCanvasGizmo,
  testIdPrefix = slot === 'stroke' ? 'stroke-grad' : 'grad'
}) => {
  const barRef = useRef(null);
  const gradCopyFb = useCopyFeedback();
  const stopCopyFb = useCopyFeedback();
  const isStroke = slot === 'stroke';
  const g = obj && VE.isGradOnSlot(obj, slot) ? VE.getGradForSlot(obj, slot) : null;
  const fillMode = !obj
    ? 'solid'
    : isStroke
      ? (obj.stroke === 'none' ? 'none' : g ? g.type : 'solid')
      : (obj.fill === 'none' ? 'none' : g ? g.type : 'solid');

  /* Pastikan rawStops tersedia untuk diedit */
  const rawStops = React.useMemo(() => {
    if (!g) return [];
    if (g.rawStops && g.rawStops.length >= 2) return g.rawStops;
    const st = g.stops || [];
    if (st.length > 5) return VE.simplifyGradStopsTo(st, 10, 0.018);
    return st.map((s, i) => ({
      id: s.id || 's' + i,
      offset: s.offset,
      color: cssToHex(s.color),
      op: s.op ?? 1,
      mid: 0.5
    }));
  }, [g]);
  const curStop = rawStops.find(s => s.id === activeStopId) || rawStops[0] || null;

  /* Terapkan perubahan gradien ke semua objek terpilih secara live saat scrubbing */
  const applyGradLive = (mutator, opts = {}) => {
    const ids = new Set(selObjs.map(o => o.id));
    if (livePaint) {
      livePaint(o => ids.has(o.id) && !o.img ? mutator(o) : o, opts);
    } else {
      commitObjs(o => ids.has(o.id) && !o.img ? mutator(o) : o, 'grad-live');
    }
  };

  /* Commit permanen satu langkah saat selesai drag atau klik */
  const applyGradCommit = (mutator, histKey = 'grad-edit') => {
    const ids = new Set(selObjs.map(o => o.id));
    if (commitPaint) {
      commitPaint(mutator ? o => ids.has(o.id) && !o.img ? mutator(o) : o : null, histKey);
    } else {
      commitObjs(o => ids.has(o.id) && !o.img ? (mutator ? mutator(o) : o) : o, histKey);
    }
  };
  const applyGrad = applyGradCommit;

  /* Ganti mode Fill/Stroke: Solid | Linear | Radial | Angular | None */
  const setMode = m => {
    onActivateSlot?.();
    if (isStroke) {
      if (m === 'none') {
        applyGrad(o => ({ ...o, stroke: 'none', strokeGrad: null }), 'p:stroke');
      } else if (m === 'solid') {
        applyGrad(o => ({
          ...o,
          stroke: g ? g.base : (o.stroke && o.stroke !== 'none' ? cssToHex(o.stroke) : '#18181b'),
          strokeGrad: null
        }), 'p:stroke');
      } else {
        applyGrad(o => VE.ensureGradModel(o, m, 'stroke'), 'grad-mode');
      }
    } else {
      if (m === 'none') {
        applyGrad(o => directPaintEdit(o, {
          ...o,
          fill: 'none',
          grad: null,
          ...(o.type === 'text' && o.text ? { text: { ...o.text, fill: 'none' } } : {})
        }, 'fill', docStyles), 'p:fill');
      } else if (m === 'solid') {
        const col = g ? g.base : obj.fill !== 'none' ? cssToHex(obj.fill) : '#4f46e5';
        applyGrad(o => directPaintEdit(o, {
          ...o,
          fill: col,
          grad: null,
          ...(o.type === 'text' && o.text ? { text: { ...o.text, fill: col } } : {})
        }, 'fill', docStyles), 'p:fill');
      } else {
        applyGrad(o => {
          const next = VE.ensureGradModel(o, m, 'fill');
          if (next.fillStyleId) {
            const c = { ...next };
            delete c.fillStyleId;
            return c;
          }
          return next;
        }, 'grad-mode');
      }
    }
  };

  /* Dragging Stop atau Midpoint pada Bar Gradien */
  const startBarDrag = (e, kind, idx) => {
    e.stopPropagation();
    e.preventDefault();
    onActivateSlot?.();
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const move = ev => {
      let eventObj = ev;
      if (typeof ev.getCoalescedEvents === 'function') {
        const coal = ev.getCoalescedEvents();
        if (coal && coal.length > 0) eventObj = coal[coal.length - 1];
      }
      const t = clampN((eventObj.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      if (kind === 'stop') {
        const targetId = rawStops[idx].id;
        applyGradLive(o => {
          const m = VE.ensureGradModel(o, undefined, slot);
          const gg = VE.getGradForSlot(m, slot);
          const next = (gg.rawStops || []).map(s => s.id === targetId ? {
            ...s,
            offset: VE.rd(t)
          } : s);
          return VE.updateGradStops(m, next, null, slot);
        });
      } else if (kind === 'mid') {
        const a = rawStops[idx],
          b = rawStops[idx + 1];
        if (!a || !b) return;
        const span = Math.max(1e-4, b.offset - a.offset);
        const mid = clampN((t - a.offset) / span, 0.15, 0.85);
        applyGradLive(o => {
          const m = VE.ensureGradModel(o, undefined, slot);
          const gg = VE.getGradForSlot(m, slot);
          const next = (gg.rawStops || []).map(s => s.id === a.id ? {
            ...s,
            mid: VE.rd(mid)
          } : s);
          return VE.updateGradStops(m, next, null, slot);
        });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      applyGradCommit(null, kind === 'stop' ? 'grad-stop-drag' : 'grad-mid-drag');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  /* Klik pada area kosong di bar gradien -> Tambah Stop Baru */
  const onBarClick = e => {
    if (!g || !barRef.current) return;
    onActivateSlot?.();
    const rect = barRef.current.getBoundingClientRect();
    const t = clampN((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const smp = VE.sampleGradAt(rawStops, t);
    const newId = VE.uid();
    applyGrad(o => {
      const m = VE.ensureGradModel(o, undefined, slot);
      const gg = VE.getGradForSlot(m, slot);
      const next = [...(gg.rawStops || []), {
        id: newId,
        offset: VE.rd(t),
        color: smp.color,
        op: smp.op,
        mid: 0.5
      }];
      return VE.updateGradStops(m, next, null, slot);
    }, 'grad-add-stop');
    setActiveStopId(newId);
    say && say(lang === 'en' ? 'Gradient stop added at ' + Math.round(t * 100) + '%' : 'Stop gradien ditambahkan pada ' + Math.round(t * 100) + '%');
  };

  /* Hapus stop terpilih (minimal 2 stop harus tersisa) */
  const deleteStop = id => {
    if (rawStops.length <= 2) return say && say(lang === 'en' ? 'At least 2 color stops are required' : 'Minimal harus ada 2 stop warna');
    onActivateSlot?.();
    applyGrad(o => {
      const m = VE.ensureGradModel(o, undefined, slot);
      const gg = VE.getGradForSlot(m, slot);
      const next = (gg.rawStops || []).filter(s => s.id !== id);
      return VE.updateGradStops(m, next, null, slot);
    }, 'grad-del-stop');
    const rem = rawStops.filter(s => s.id !== id);
    if (rem.length) setActiveStopId(rem[0].id);
  };

  /* Tambah stop baru di tengah atau posisi default */
  const addStopAtDefault = () => {
    if (!g) return;
    onActivateSlot?.();
    const smp = VE.sampleGradAt(rawStops, 0.5);
    const newId = VE.uid();
    applyGrad(o => {
      const m = VE.ensureGradModel(o, undefined, slot);
      const gg = VE.getGradForSlot(m, slot);
      const next = [...(gg.rawStops || []), {
        id: newId,
        offset: 0.5,
        color: smp.color,
        op: smp.op ?? 1,
        mid: 0.5
      }];
      return VE.updateGradStops(m, next, null, slot);
    }, 'grad-add-stop');
    setActiveStopId(newId);
    say && say(lang === 'en' ? 'Gradient stop added at 50%' : 'Stop gradien ditambahkan pada 50%');
  };

  /* Operasi Cepat: Balik (Reverse), Sebar Merata (Distribute), & Sederhanakan RDP */
  const reverseStops = () => {
    onActivateSlot?.();
    applyGrad(o => {
      const m = VE.ensureGradModel(o, undefined, slot);
      const gg = VE.getGradForSlot(m, slot);
      const rev = (gg.rawStops || []).slice().reverse().map((s, i, arr) => ({
        ...s,
        offset: VE.rd(1 - s.offset),
        mid: i < arr.length - 1 ? VE.rd(1 - (arr[i + 1].mid ?? 0.5)) : 0.5
      }));
      return VE.updateGradStops(m, rev, null, slot);
    });
  };

  const distributeStops = () => {
    onActivateSlot?.();
    applyGrad(o => {
      const m = VE.ensureGradModel(o, undefined, slot);
      const gg = VE.getGradForSlot(m, slot);
      const n = (gg.rawStops || []).length;
      const dist = (gg.rawStops || []).map((s, i) => ({
        ...s,
        offset: VE.rd(i / Math.max(1, n - 1)),
        mid: 0.5
      }));
      return VE.updateGradStops(m, dist, null, slot);
    });
  };

  const simplifyStopsAction = (maxN = 6) => {
    onActivateSlot?.();
    applyGrad(o => {
      const m = VE.ensureGradModel(o, undefined, slot);
      const gg = VE.getGradForSlot(m, slot);
      const simp = VE.simplifyGradStopsTo(gg.rawStops || [], maxN, 0.01);
      say && say(lang === 'en' ? `Simplified to ${simp.length} major stops` : `Disederhanakan menjadi ${simp.length} stop utama`);
      return VE.updateGradStops(m, simp, null, slot);
    });
  };

  const copyGradient = async () => {
    if (!g) return;
    const res = await copyGradientPaint(g);
    if (!res) return;
    const msg = L.gradCopied || 'Gradien disalin';
    gradCopyFb.trigger(true, msg);
    say && say(msg);
  };

  const pasteGradient = async () => {
    const pasted = await readPaintClipboard('gradient');
    if (!pasted || pasted.kind !== 'gradient') {
      say && say(L.gradPasteInvalid || 'Clipboard tidak berisi gradien yang valid');
      return;
    }
    applyGrad(o => applyGradientPayloadToObj(o, pasted, slot), 'grad-paste');
    say && say(L.gradPasted || 'Gradien ditempel');
  };

  const copyStopColor = async () => {
    if (!curStop) return;
    const res = await copySolidPaint(curStop.color, curStop.op ?? 1);
    const msg = (L.cpColorCopied || 'Warna {v} disalin').replace('{v}', res.text);
    stopCopyFb.trigger(true, msg);
    say && say(msg);
  };

  const pasteStopColor = async () => {
    if (!curStop) return;
    const pasted = await readPaintClipboard('solid');
    if (!pasted || pasted.kind !== 'solid') {
      say && say(L.cpPasteInvalid || 'Clipboard tidak berisi warna yang valid');
      return;
    }
    applyGradCommit(o => {
      const m = VE.ensureGradModel(o, undefined, slot);
      const gg = VE.getGradForSlot(m, slot);
      return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
        ...s,
        color: pasted.isNone ? s.color : pasted.hex,
        op: pasted.isNone ? 0 : pasted.alpha
      } : s), null, slot);
    }, 'grad-stop-paste');
    say && say((L.cpColorPasted || 'Warna {v} ditempel').replace('{v}', pasted.text));
  };

  /* Lane: stop yang berdekatan (dalam piksel) dipindah ke baris rel di bawah bar agar tidak bertumpuk */
  const BAR_W = barRef.current && barRef.current.getBoundingClientRect().width || 240;
  const many = rawStops.length > 6;
  const lanes = React.useMemo(() => {
    const MIN = 15,
      ends = [],
      out = {};
    rawStops.slice().sort((a, b) => a.offset - b.offset).forEach(s => {
      const x = s.offset * BAR_W;
      let l = 0;
      while (l < ends.length && x - ends[l] < MIN) l++;
      ends[l] = x;
      out[s.id] = l;
    });
    return out;
  }, [rawStops, BAR_W]);
  const laneCount = Math.max(1, ...Object.values(lanes).map((l: any) => Number(l) + 1), 1);
  const showMid = i => !many || curStop && (rawStops[i].id === curStop.id || rawStops[i + 1] && rawStops[i + 1].id === curStop.id);
  const cssGradPreview = React.useMemo(() => {
    if (!g) return 'none';
    const st = (g.stops || []).map(s => `${s.color} ${Math.round(s.offset * 1000) / 10}%`).join(', ');
    if (g.type === 'angular') {
      const ang = g.angle != null ? g.angle : 0;
      return `conic-gradient(from ${ang}deg at 50% 50%, ${st})`;
    }
    return `linear-gradient(90deg, ${st})`;
  }, [g]);
  const isGradient = fillMode === 'linear' || fillMode === 'radial' || fillMode === 'angular';

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between text-[11px] mut mb-1.5">
          <span>{isStroke ? (L.gradStrokeMode || 'Mode Stroke') : (L.gradMode || 'Mode Fill')}</span>
          {showGizmoFocusToggle && (
            <button
              type="button"
              data-testid="grad-focus-gizmo-btn"
              className={'ved-pill text-[10px] px-2 py-0.5 flex items-center gap-1' + (isCanvasGizmoActive ? ' on' : '')}
              onClick={onFocusCanvasGizmo}
            >
              <Ico n="target" size={11} />
              <span>{L.editOnCanvas || (lang === 'en' ? 'Edit on Canvas' : 'Edit di Kanvas')}</span>
            </button>
          )}
        </div>
        <GradChoice
          value={fillMode}
          on={setMode}
          cols={3}
          fillWrap
          testIdPrefix={`${testIdPrefix}-choice`}
          options={[
            ['solid', 'Solid', 'drop'],
            ['linear', 'Linear', 'wind'],
            ['radial', 'Radial', 'detect'],
            ['angular', L.gradAngular || 'Angular', 'refresh'],
            ['none', L.gradNone, 'x']
          ]}
          tip={isStroke ? 'veGradStrokeMode' : 'veGradMode'}
          tips={{
            solid: 'veGradSolid',
            linear: 'veGradLinear',
            radial: 'veGradRadial',
            angular: 'veGradAngular',
            none: 'veGradNone'
          }}
        />
      </div>

      {isGradient && g && (
        <div className="space-y-3 fade">
          <div>
            <div className="flex items-center justify-between text-[11px] mut mb-1">
              <div className="flex items-center gap-1.5">
                <span>{L.gradStopsN ? L.gradStopsN.replace('{n}', rawStops.length) : 'Stops (' + rawStops.length + ')'}</span>
                <button
                  type="button"
                  className="ved-pill text-[10px] px-1.5 py-0.5 text-[var(--acc)] font-medium"
                  onClick={addStopAtDefault}
                  data-tip="veGradAddStop"
                >
                  {L.gradAddStop || '+ Tambah Stop'}
                </button>
              </div>
              <span className="text-[10px]">{L.gradBarHint}</span>
            </div>

            <div
              ref={barRef}
              onClick={onBarClick}
              data-tip="veGradBar"
              className="chk relative h-7 rounded-xl cursor-copy select-none"
              style={{
                border: '1px solid var(--line)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.08)'
              }}
            >
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: cssGradPreview
                }}
              />
              {rawStops.slice(0, -1).map((a, i) => {
                if (!showMid(i)) return null;
                const b = rawStops[i + 1];
                const pos = a.offset + (b.offset - a.offset) * (a.mid ?? 0.5);
                return (
                  <div
                    key={'mid-' + a.id}
                    data-tip="veGradMid"
                    onPointerDown={e => startBarDrag(e, 'mid', i)}
                    onClick={e => e.stopPropagation()}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      onActivateSlot?.();
                      applyGrad(o => {
                        const m = VE.ensureGradModel(o, undefined, slot);
                        const gg = VE.getGradForSlot(m, slot);
                        return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === a.id ? {
                          ...s,
                          mid: 0.5
                        } : s), null, slot);
                      });
                    }}
                    style={{
                      position: 'absolute',
                      left: pos * 100 + '%',
                      top: -5,
                      width: 8,
                      height: 8,
                      marginLeft: -4,
                      transform: 'rotate(45deg)',
                      background: 'var(--card)',
                      border: '1.5px solid var(--acc)',
                      cursor: 'ew-resize',
                      zIndex: 2
                    }}
                  />
                );
              })}
              {rawStops.map((s, i) => {
                const on = curStop && curStop.id === s.id;
                return (
                  <div
                    key={s.id || i}
                    data-tip="veGradStop"
                    onPointerDown={e => {
                      setActiveStopId(s.id);
                      onActivateSlot?.();
                      startBarDrag(e, 'stop', i);
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      setActiveStopId(s.id);
                      onActivateSlot?.();
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      deleteStop(s.id);
                    }}
                    style={{
                      position: 'absolute',
                      left: s.offset * 100 + '%',
                      top: '50%',
                      width: on ? 14 : many ? 4 : 11,
                      height: on ? 22 : many ? 22 : 18,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: many && !on ? 2 : 6,
                      background: s.color,
                      border: on ? '2.5px solid #fff' : '1.5px solid #fff',
                      boxShadow: on ? '0 0 0 2px var(--acc), 0 2px 6px rgba(0,0,0,.35)' : '0 1px 3px rgba(0,0,0,.35)',
                      cursor: 'grab',
                      zIndex: on ? 4 : 3,
                      transition: 'width .15s, height .15s'
                    }}
                  />
                );
              })}
            </div>

            {many && (
              <div
                className="gbar-rail"
                style={{
                  height: laneCount * 16
                }}
              >
                {rawStops.map(s => {
                  const on = curStop && curStop.id === s.id;
                  return (
                    <div
                      key={'rl-' + s.id}
                      data-tip="veGradStop"
                      onPointerDown={e => {
                        setActiveStopId(s.id);
                        onActivateSlot?.();
                        startBarDrag(e, 'stop', rawStops.indexOf(s));
                      }}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        deleteStop(s.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: s.offset * 100 + '%',
                        top: (lanes[s.id] || 0) * 16,
                        width: 12,
                        height: 12,
                        marginLeft: -6,
                        borderRadius: 4,
                        background: s.color,
                        border: on ? '2px solid var(--acc)' : '1.5px solid var(--card)',
                        boxShadow: '0 0 0 1px var(--line)',
                        cursor: 'grab',
                        zIndex: on ? 3 : 1
                      }}
                    />
                  );
                })}
              </div>
            )}

            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] mut">
                <span>{L.gradStopList ? L.gradStopList.replace('{n}', rawStops.length) : 'Stop (' + rawStops.length + ')'}</span>
              </div>
              <div className="gstop-list">
                {rawStops.slice().sort((a, b) => a.offset - b.offset).map(s => (
                  <button
                    key={'ch-' + s.id}
                    type="button"
                    className={'gstop-chip' + (curStop && curStop.id === s.id ? ' on' : '')}
                    data-tip-text={L.gradStopTip ? L.gradStopTip.replace('{hex}', cssToHex(s.color)).replace('{pct}', Math.round(s.offset * 100)) : `${cssToHex(s.color)} (${Math.round(s.offset * 100)}%)`}
                    onClick={() => {
                      setActiveStopId(s.id);
                      onActivateSlot?.();
                    }}
                  >
                    <i style={{ background: s.color }} />
                    <span className="truncate">{Math.round(s.offset * 100)}%</span>
                  </button>
                ))}
              </div>
              {many && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] mut">{L.gradCondense}</span>
                  {[4, 6, 8].filter(n => n < rawStops.length).map(n => (
                    <button key={n} type="button" className="ved-pill" onClick={() => simplifyStopsAction(n)}>{n}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {curStop && (
            <div
              className="p-2.5 rounded-xl space-y-2"
              style={{
                background: 'var(--sub)',
                border: '1px solid var(--line)'
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ColorField
                    L={L}
                    tip="veGradStopColor"
                    value={cssToHex(curStop.color)}
                    opacity={curStop.op ?? 1}
                    onOpacity={(op, meta) => {
                      const fn = o => {
                        const m = VE.ensureGradModel(o, undefined, slot);
                        const gg = VE.getGradForSlot(m, slot);
                        return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
                          ...s,
                          op
                        } : s), null, slot);
                      };
                      if (meta && meta.isLive) applyGradLive(fn, { previewOnly: true });
                      else applyGradCommit(fn, 'grad-op');
                    }}
                    on={(v, meta) => {
                      const fn = o => {
                        const m = VE.ensureGradModel(o, undefined, slot);
                        const gg = VE.getGradForSlot(m, slot);
                        if (v === 'none') {
                          return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
                            ...s,
                            op: 0
                          } : s), null, slot);
                        }
                        const p = parseColorWithAlpha(v);
                        return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
                          ...s,
                          color: p.hex,
                          op: s.op === 0 && p.a > 0 ? p.a : p.a < 1 ? p.a : s.op ?? 1
                        } : s), null, slot);
                      };
                      if (meta && meta.isLive) applyGradLive(fn, { previewOnly: true });
                      else applyGradCommit(fn, 'grad-col');
                    }}
                  />
                  <span className="text-[11px] font-mono uppercase truncate">{cssToHex(curStop.color)}</span>
                </div>
                <span className="text-[11px] font-mono mut">{Math.round(curStop.offset * 100)}%</span>
                <div className="flex items-center gap-1 flex-none">
                  <button
                    type="button"
                    className="fig-ibtn"
                    style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, borderRadius: 7, background: 'var(--card)' }}
                    data-testid={`${testIdPrefix}-stop-copy`}
                    data-tip="veGradStopCopy"
                    data-copied={stopCopyFb.status === 'copied' ? '' : undefined}
                    aria-label={L.cpCopyColorAria || L.cpCopy}
                    onClick={copyStopColor}
                  >
                    <Ico n={stopCopyFb.status === 'copied' ? 'check' : 'copy'} size={12} />
                  </button>
                  <button
                    type="button"
                    className="fig-ibtn"
                    style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, borderRadius: 7, background: 'var(--card)' }}
                    data-testid={`${testIdPrefix}-stop-paste`}
                    data-tip="veGradStopPaste"
                    aria-label={L.cpPasteColorAria || L.cpPaste}
                    onClick={pasteStopColor}
                  >
                    <Ico n="paste" size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn sec text-[10px]"
                    style={{ padding: '4px 7px', minHeight: 24 }}
                    disabled={rawStops.length <= 2}
                    onClick={() => deleteStop(curStop.id)}
                    data-tip="veGradDelStop"
                  >
                    <Ico n="trash" size={12} />
                  </button>
                  <span role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0.001, pointerEvents: 'none' }}>
                    {stopCopyFb.liveMsg}
                  </span>
                </div>
              </div>

              <Range
                tip="veGradStopPos"
                l={L.gradStopPos}
                v={Math.round(curStop.offset * 100)}
                min={0}
                max={100}
                step={1}
                on={(v, meta) => {
                  const fn = o => {
                    const m = VE.ensureGradModel(o, undefined, slot);
                    const gg = VE.getGradForSlot(m, slot);
                    return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
                      ...s,
                      offset: v / 100
                    } : s), null, slot);
                  };
                  if (meta && meta.isLive) applyGradLive(fn);
                  else applyGradCommit(fn, 'grad-pos');
                }}
                onCommit={v => {
                  const fn = o => {
                    const m = VE.ensureGradModel(o, undefined, slot);
                    const gg = VE.getGradForSlot(m, slot);
                    return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
                      ...s,
                      offset: v / 100
                    } : s), null, slot);
                  };
                  applyGradCommit(fn, 'grad-pos');
                }}
                f={v => v + '%'}
              />

              <Range
                tip="veGradStopOp"
                l="Opacity Stop"
                v={Math.round((curStop.op ?? 1) * 100)}
                min={0}
                max={100}
                step={1}
                on={(v, meta) => {
                  const fn = o => {
                    const m = VE.ensureGradModel(o, undefined, slot);
                    const gg = VE.getGradForSlot(m, slot);
                    return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
                      ...s,
                      op: v / 100
                    } : s), null, slot);
                  };
                  if (meta && meta.isLive) applyGradLive(fn);
                  else applyGradCommit(fn, 'grad-op');
                }}
                onCommit={v => {
                  const fn = o => {
                    const m = VE.ensureGradModel(o, undefined, slot);
                    const gg = VE.getGradForSlot(m, slot);
                    return VE.updateGradStops(m, (gg.rawStops || []).map(s => s.id === curStop.id ? {
                      ...s,
                      op: v / 100
                    } : s), null, slot);
                  };
                  applyGradCommit(fn, 'grad-op');
                }}
                f={v => v + '%'}
              />
            </div>
          )}

          {(fillMode === 'linear' || fillMode === 'angular') && (
            <div className="space-y-2">
              <Range
                tip="veGradAngle"
                l={fillMode === 'angular' ? (L.gradAngleAngular || 'Sudut Awal Angular') : L.gradAngle}
                v={VE.gradAngleDeg(g)}
                min={fillMode === 'angular' ? 0 : -180}
                max={fillMode === 'angular' ? 360 : 180}
                step={1}
                on={(deg, meta) => {
                  const fn = o => VE.setGradAngleDeg(VE.ensureGradModel(o, undefined, slot), deg, slot);
                  if (meta && meta.isLive) applyGradLive(fn);
                  else applyGradCommit(fn, 'grad-ang');
                }}
                onCommit={deg => {
                  const fn = o => VE.setGradAngleDeg(VE.ensureGradModel(o, undefined, slot), deg, slot);
                  applyGradCommit(fn, 'grad-ang');
                }}
                f={v => v + '°'}
              />
              <div className="ved-pills">
                {(fillMode === 'angular' ? [0, 45, 90, 135, 180, 270] : [-90, -45, 0, 45, 90, 135, 180]).map(d => (
                  <button
                    key={d}
                    type="button"
                    data-tip="veGradAnglePreset"
                    className={'ved-pill' + (Math.round(VE.gradAngleDeg(g)) === d ? ' on' : '')}
                    onClick={() => applyGrad(o => VE.setGradAngleDeg(VE.ensureGradModel(o, undefined, slot), d, slot))}
                  >
                    {d}°
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] mut mb-1.5">{L.gradInterp}</div>
            <GradChoice
              cols={2}
              value={g.oklab === false ? 'srgb' : 'oklab'}
              testIdPrefix={`${testIdPrefix}-interp`}
              on={k => applyGrad(o => {
                const m = VE.ensureGradModel(o, undefined, slot);
                const gg = VE.getGradForSlot(m, slot);
                return VE.updateGradStops(m, gg.rawStops || [], {
                  oklab: k === 'oklab'
                }, slot);
              })}
              options={[['oklab', L.gradOklab], ['srgb', 'sRGB']]}
              tip="veGradInterp"
              tips={{
                oklab: 'veGradOk',
                srgb: 'veGradSrgb'
              }}
            />
          </div>

          <div>
            <div className="text-[11px] mut mb-1.5">Spread Method</div>
            <GradChoice
              cols={3}
              value={g.spread || 'pad'}
              testIdPrefix={`${testIdPrefix}-spread`}
              on={sp => applyGrad(o => {
                const m = VE.ensureGradModel(o, undefined, slot);
                const gg = VE.getGradForSlot(m, slot);
                return VE.updateGradStops(m, gg.rawStops || [], {
                  spread: sp
                }, slot);
              })}
              options={[['pad', 'Pad'], ['reflect', 'Reflect'], ['repeat', 'Repeat']]}
              tip="veGradSpread"
              tips={{
                pad: 'veGradPad',
                reflect: 'veGradReflect',
                repeat: 'veGradRepeat'
              }}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn sec text-[11px] flex-1"
              style={{ padding: '6px 8px' }}
              data-testid={`${testIdPrefix}-copy-btn`}
              data-tip="veGradCopy"
              data-copied={gradCopyFb.status === 'copied' ? '' : undefined}
              onClick={copyGradient}
            >
              <Ico n={gradCopyFb.status === 'copied' ? 'check' : 'copy'} size={12} />
              <span>{L.gradCopy || 'Salin Gradien'}</span>
            </button>
            <button
              type="button"
              className="btn sec text-[11px] flex-1"
              style={{ padding: '6px 8px' }}
              data-testid={`${testIdPrefix}-paste-btn`}
              data-tip="veGradPaste"
              onClick={pasteGradient}
            >
              <Ico n="paste" size={12} />
              <span>{L.gradPaste || 'Tempel Gradien'}</span>
            </button>
            <span role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0.001, pointerEvents: 'none' }}>
              {gradCopyFb.liveMsg}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn sec text-[11px] flex-1"
              style={{ padding: '6px 8px' }}
              onClick={reverseStops}
              data-tip="veGradReverse"
            >
              {L.gradFlip}
            </button>
            <button
              type="button"
              className="btn sec text-[11px] flex-1"
              style={{ padding: '6px 8px' }}
              onClick={distributeStops}
              data-tip="veGradDistribute"
            >
              {L.gradFlatten}
            </button>
            {rawStops.length > 4 && (
              <button
                type="button"
                className="btn sec text-[11px] flex-1"
                style={{ padding: '6px 8px' }}
                onClick={() => simplifyStopsAction(6)}
                data-tip="veGradRdp"
              >
                ✦ RDP
              </button>
            )}
          </div>

          <div>
            <div className="text-[11px] mut mb-1">{L.gradPreset}</div>
            <div className="grid grid-cols-6 gap-1.5">
              {GRAD_PRESETS.map(([name, stops]) => {
                const bgStr = 'linear-gradient(135deg,' + stops.map(([c, u]) => `${c} ${u * 100}%`).join(',') + ')';
                return (
                  <button
                    key={name}
                    type="button"
                    data-tip-text={name}
                    className="h-6 rounded-lg border border-[var(--line)] transition-transform hover:scale-105"
                    style={{ background: bgStr }}
                    onClick={() => applyGrad(o => {
                      const m = VE.ensureGradModel(o, fillMode, slot);
                      const raw = stops.map(([c, u]) => ({
                        id: VE.uid(),
                        offset: u,
                        color: c,
                        op: 1,
                        mid: 0.5
                      }));
                      return VE.updateGradStops(m, raw, null, slot);
                    })}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { GradientEditorPanel };
export default GradientEditorPanel;
