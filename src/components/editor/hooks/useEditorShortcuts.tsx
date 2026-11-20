/**
 * @file src/components/editor/hooks/useEditorShortcuts.tsx
 * @description Hook modular untuk manajemen event pintasan papan ketik (keyboard shortcuts) editor
 */
import { useEffect, useRef } from 'react';
import { DEBUG_LOG } from '../../../utils/debugLogger.tsx';
import { VE } from '../../../engine/vectorEngine.tsx';
import { VE_DRAW_TOOLS } from '../../../constants/editorToolsAndShapes.tsx';
import { isLegacyText } from '../../../engine/legacyText.tsx';

export interface UseEditorShortcutsOptions {
  active: boolean;
  tool: string;
  setTool: (tool: any) => void;
  docRef: React.MutableRefObject<any>;
  selRef: React.MutableRefObject<any>;
  sel: any;
  setSel: (sel: any) => void;
  selNodes: any;
  selObjs: any[];
  shown: any[];
  undo: () => void;
  redo: () => void;
  dup: () => void;
  copySel: () => void;
  delSel: () => void;
  groupSel: (noToggle?: boolean) => void;
  ungroupSel: () => void;
  flattenSel: () => void;
  convertTextSelectionToPath: () => void;
  applyBoolean: (op: string) => void;
  applyMakeCompoundPath: () => void;
  applyReleaseCompoundPath: () => void;
  applyOutlineStroke: () => void;
  downloadSvg: () => void;
  setSnapOn: (updater: (prev: boolean) => boolean) => void;
  snapOnRef: React.MutableRefObject<boolean>;
  setGridOn: (updater: (prev: boolean) => boolean) => void;
  gridOnRef: React.MutableRefObject<boolean>;
  penRef: React.MutableRefObject<any>;
  finishPen: () => void;
  penUndoLast: () => void;
  curvatureRef: React.MutableRefObject<any>;
  editingText: boolean;
  finishCurvature: () => void;
  curvatureUndoLast: () => void;
  spaceRef: React.MutableRefObject<boolean>;
  setSpace: (space: boolean) => void;
  vcSimpRef: React.MutableRefObject<any>;
  confirmVcSimplify: () => void;
  cancelVcSimplify: () => void;
  openVcSimplify: () => void;
  offStripRef: React.MutableRefObject<any>;
  confirmOffsetStrip: () => void;
  cancelOffsetStrip: () => void;
  openGrp: any;
  snapMenuOpen: boolean;
  boolOpen: boolean;
  mirrorOpen: boolean;
  reorder: (up: boolean) => void;
  zoomBy: (factor: number, cx?: any, cy?: any) => void;
  fitView: () => void;
  fitSel: () => void;
  commitObjs: (fn: any, key: any) => void;
  setAltMeasure: (val: any) => void;
  toggleDebugMode: () => void;
  say: (msg: string, action?: any) => void;
  figmaKeys: (e: KeyboardEvent) => boolean;
  toggleCodeInspector?: () => void;
  isCodeInspectorOpen?: boolean;
}

export function useEditorShortcuts(options: UseEditorShortcutsOptions) {
  const {
    active,
    tool,
    setTool,
    docRef,
    selRef,
    sel,
    setSel,
    selNodes,
    selObjs,
    shown,
    undo,
    redo,
    dup,
    copySel,
    delSel,
    groupSel,
    ungroupSel,
    flattenSel,
    convertTextSelectionToPath,
    applyBoolean,
    applyMakeCompoundPath,
    applyReleaseCompoundPath,
    applyOutlineStroke,
    downloadSvg,
    setSnapOn,
    snapOnRef,
    setGridOn,
    gridOnRef,
    penRef,
    finishPen,
    penUndoLast,
    curvatureRef,
    editingText,
    finishCurvature,
    curvatureUndoLast,
    spaceRef,
    setSpace,
    vcSimpRef,
    confirmVcSimplify,
    cancelVcSimplify,
    openVcSimplify,
    offStripRef,
    confirmOffsetStrip,
    cancelOffsetStrip,
    openGrp,
    snapMenuOpen,
    boolOpen,
    mirrorOpen,
    reorder,
    zoomBy,
    fitView,
    fitSel,
    commitObjs,
    setAltMeasure,
    toggleDebugMode,
    say,
    figmaKeys,
    toggleCodeInspector,
    isCodeInspectorOpen
  } = options;

  const kbHandlersRef = useRef<{
    kd: ((e: KeyboardEvent) => void) | null;
    ku: ((e: KeyboardEvent) => void) | null;
  }>({
    kd: null,
    ku: null
  });

  kbHandlersRef.current.kd = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey,
      k = e.key.toLowerCase();

    // Ctrl+Alt+C: Toggle SvgCodeInspectorModal
    if (mod && e.altKey && (k === 'c' || e.code === 'KeyC')) {
      if (toggleCodeInspector) {
        e.preventDefault();
        toggleCodeInspector();
        return;
      }
    }

    const t = e.target as HTMLElement | null;
    if (t && t.closest && t.closest('[data-custom-input="true"],[role="textbox"],[contenteditable="true"],input,select,textarea')) return;
    if (document.querySelector('.ov, [role="dialog"]')) return;
    if (figmaKeys(e)) return;
    if (mod && k === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if (mod && k === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && e.shiftKey && k === 'd' && !e.altKey) {
      e.preventDefault();
      DEBUG_LOG.log('shortcut', 'toggle-debug-mode', 'toggleDebugMode', 'src/components/editor/hooks/useEditorShortcuts.tsx', 'Ctrl+Shift+D');
      toggleDebugMode();
      return;
    }
    if (mod && k === 'a') {
      e.preventDefault();
      if ((tool === 'node' || tool === 'corner') && shown.length) {
        const allN = new Set();
        shown.forEach(o => {
          if (!o.locked && !o.hidden) o.subs.forEach((sp: any) => sp.nodes.forEach((n: any) => allN.add(n.id)));
        });
        setSel({
          objs: new Set(shown.map(o => o.id)),
          nodes: allN
        });
      } else {
        setSel({
          objs: new Set(docRef.current.objects.filter((o: any) => !o.hidden && !o.locked).map((o: any) => o.id)),
          nodes: new Set()
        });
      }
      return;
    }
    if (mod && k === 'd' && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      dup();
      return;
    }
    if (mod && k === 'c' && !e.shiftKey && !e.altKey) {
      if (selRef.current.objs.size) {
        e.preventDefault();
        copySel();
      }
      return;
    }
    if (mod && k === 'g') {
      e.preventDefault();
      e.shiftKey ? ungroupSel() : groupSel();
      return;
    }
    if (mod && k === 'e') {
      e.preventDefault();
      flattenSel();
      return;
    }
    if (mod && e.shiftKey && k === 'o' && !e.altKey) {
      if (selObjs.some(isLegacyText)) {
        e.preventDefault();
        convertTextSelectionToPath();
        return;
      }
    }
    if (mod && (e.key === '8' || e.code === 'Digit8') && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) {
        applyReleaseCompoundPath();
      } else {
        applyMakeCompoundPath();
      }
      return;
    }
    if (mod && e.altKey && (k === 'u' || k === 's' || k === 'i' || k === 'x' || k === 'd' || k === 'o')) {
      e.preventDefault();
      if (k === 'u') applyBoolean('union');
      else if (k === 's') applyBoolean('subtract');
      else if (k === 'i') applyBoolean('intersect');
      else if (k === 'x') applyBoolean('exclude');
      else if (k === 'd') applyBoolean('divide');
      else if (k === 'o') applyOutlineStroke();
      return;
    }
    if (mod && k === 's') {
      e.preventDefault();
      downloadSvg();
      return;
    }
    if (mod && (e.key === "'" || e.code === 'Quote')) {
      e.preventDefault();
      if (e.shiftKey) {
        setSnapOn(s => !s);
        say(!snapOnRef.current ? 'Snap: AKTIF' : 'Snap: NONAKTIF');
      } else {
        setGridOn(g => !g);
        say(!gridOnRef.current ? 'Grid: TAMPIL' : 'Grid: SEMBUNYI');
      }
      return;
    }
    if (mod || e.altKey) return;
    if (tool === 'pen' && penRef.current) {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        finishPen();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        penUndoLast();
        return;
      }
    }
    if (tool === 'curvature' && curvatureRef.current && !editingText && !document.querySelector('.flt:not(.out)')) {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        finishCurvature();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        curvatureUndoLast();
        return;
      }
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        setSpace(true);
      }
      return;
    }
    if (vcSimpRef.current) {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmVcSimplify();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelVcSimplify();
        return;
      }
    }
    if (offStripRef.current) {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmOffsetStrip();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelOffsetStrip();
        return;
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      delSel();
    } else if (e.key === 'Escape' && (VE_DRAW_TOOLS.includes(tool) || tool === 'frame' || tool === 'shape' || (tool === 'pen' && !penRef.current)) && !editingText && openGrp == null && !snapMenuOpen && !boolOpen && !mirrorOpen && !document.querySelector('.flt:not(.out)')) {
      e.preventDefault();
      if (tool === 'pen' && selRef.current.objs.size > 0) {
        setSel({
          objs: new Set(),
          nodes: new Set()
        });
      } else {
        setTool('select');
      }
    } else if (e.key === 'Escape') {
      setSel({
        objs: new Set(),
        nodes: new Set()
      });
    } else if (k === 'f') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('frame');
    } else if (k === 'v') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('select');
    } else if (k === 'a' || k === 'n') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('node');
    } else if (k === 'h') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('hand');
    } else if (k === 's') {
      if (offStripRef.current) confirmOffsetStrip();
      setTool('simplify');
      openVcSimplify();
    } else if (k === 'p') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool(e.shiftKey ? 'pencil' : 'pen');
    } else if (k === 'b') {
      if (offStripRef.current) confirmOffsetStrip();
      setTool(e.shiftKey ? 'brush' : 'autohandle');
    } else if (k === 't') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('text');
    } else if (k === 'c') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('curvature');
    } else if (k === 'g') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('shapebuilder');
    } else if (k === 'o') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('blob');
    } else if (k === 'w') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('weave');
    } else if (k === 'l') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('line');
    } else if (k === 'r') {
      if (vcSimpRef.current) confirmVcSimplify();
      if (offStripRef.current) confirmOffsetStrip();
      setTool('arc');
    } else if (e.key === ']') reorder(true);
    else if (e.key === '[') reorder(false);
    else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomBy(1.25);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomBy(1 / 1.25);
    } else if (e.key === '0') {
      e.preventDefault();
      fitView();
    } else if (e.key === '2') {
      e.preventDefault();
      fitSel();
    } else if (e.key.startsWith('Arrow') && sel.objs.size && !(t && t.closest && t.closest('[role=slider]'))) {
      e.preventDefault();
      const st = e.shiftKey ? 10 : 1,
        dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0,
        dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
      commitObjs((o: any) => !sel.objs.has(o.id) ? o : selNodes.size ? VE.moveNodes(o, selNodes, dx, dy) : VE.translate(o, dx, dy), 'nudge');
    }
  };

  kbHandlersRef.current.ku = (e: KeyboardEvent) => {
    if (e.key === 'Alt') setAltMeasure(null);
    if (e.key === ' ' && spaceRef.current) {
      spaceRef.current = false;
      setSpace(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    const onKd = (e: KeyboardEvent) => kbHandlersRef.current.kd && kbHandlersRef.current.kd(e);
    const onKu = (e: KeyboardEvent) => kbHandlersRef.current.ku && kbHandlersRef.current.ku(e);
    window.addEventListener('keydown', onKd);
    window.addEventListener('keyup', onKu);
    return () => {
      window.removeEventListener('keydown', onKd);
      window.removeEventListener('keyup', onKu);
    };
  }, [active]);
}
