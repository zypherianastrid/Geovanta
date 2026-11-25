/**
 * @file src/components/modals/SvgCodeInspectorModal.tsx
 * @description Dialog modal inspeksi kode SVG interaktif dengan sinkronisasi dua arah (Two-Way Live Sync),
 * validasi XML non-destruktif, nomor baris hierarkis, format prettify/minify, dan preset ekspor kode modern.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { usePresence } from '../../utils/presenceAndFilePicker.tsx';
import { Ico } from '../ui/IconGlyphs.tsx';
import {
  prettifyXml,
  optimizeSvg,
  generateExportCode,
  SvgExportFormat
} from '../../engine/svgOptimizer.tsx';
import { VE } from '../../engine/vectorEngine.tsx';
import { serializeDoc } from '../../engine/svgDocumentSerializer.tsx';
import { parseSVG } from '../../engine/svgDocumentParser.tsx';

export interface SvgCodeInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: any; // Geovanta document model
  selIds?: Set<string> | string[]; // Seleksi aktif; kosong = semua objek kanvas
  onUpdateDoc?: (newDoc: any) => void; // dipanggil saat pengguna mengedit SVG XML valid
  lang?: string; // 'id' | 'en'
}

/**
 * Validasi sintaks markup SVG XML menggunakan DOMParser browser atau fallback regex non-DOM.
 * Mengembalikan status validitas beserta pesan ringkas galat jika ditemukan <parsererror>.
 */
export function validateSvgXml(code: string): { valid: boolean; error?: string } {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Empty SVG markup' };
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(trimmed, 'image/svg+xml');
      const parserError = parsed.querySelector('parsererror') || parsed.getElementsByTagName('parsererror')[0];
      if (parserError) {
        const fullText = parserError.textContent || 'XML syntax error';
        const firstLine = fullText.split('\n')[0].replace(/^error on line \d+ at column \d+:\s*/i, '').trim();
        return { valid: false, error: firstLine || 'Invalid XML markup' };
      }
      const svgTag = parsed.querySelector('svg');
      if (!svgTag) {
        return { valid: false, error: 'Missing root <svg> element' };
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'XML parsing exception' };
    }
  }

  // Fallback validasi untuk lingkungan non-browser / Node.js
  const lower = trimmed.toLowerCase();
  if (!lower.includes('<svg')) {
    return { valid: false, error: 'Missing root <svg> element' };
  }
  if (!lower.startsWith('<svg') && !lower.startsWith('<?xml') && !lower.startsWith('<!--')) {
    return { valid: false, error: 'Missing root <svg> element: markup must begin with <svg>' };
  }
  if (!lower.includes('</svg>') && !lower.includes('/>')) {
    return { valid: false, error: 'Incomplete or missing </svg> closing tag' };
  }
  const opens = (trimmed.match(/<[a-zA-Z]/g) || []).length;
  const closes = (trimmed.match(/<\/[a-zA-Z]/g) || []).length;
  const selfCloses = (trimmed.match(/\/>/g) || []).length;
  if (opens !== closes + selfCloses) {
    return { valid: false, error: 'Unclosed XML tags detected' };
  }

  return { valid: true };
}

const TAB_CONFIG: Array<{ id: SvgExportFormat; label: string; testId: string }> = [
  { id: 'svg-raw', label: 'SVG XML', testId: 'tab-svg-xml' },
  { id: 'svg-minified', label: 'Web Minified', testId: 'tab-svg-minified' },
  { id: 'react-jsx', label: 'React JSX', testId: 'tab-react-jsx' },
  { id: 'vue-sfc', label: 'Vue SFC', testId: 'tab-vue-sfc' },
  { id: 'css-data-uri', label: 'CSS Data URI', testId: 'tab-css-data-uri' },
];

export const SvgCodeInspectorModal: React.FC<SvgCodeInspectorModalProps> = ({
  isOpen,
  onClose,
  doc,
  selIds,
  onUpdateDoc,
  lang = 'id'
}) => {
  const [mounted, leaving] = usePresence(isOpen, 200);
  const [activeTab, setActiveTab] = useState<SvgExportFormat>('svg-raw');
  const [codeText, setCodeText] = useState<string>('');
  const [xmlError, setXmlError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const selSet = useMemo(() => {
    if (!selIds) return new Set<string>();
    return selIds instanceof Set ? selIds : new Set<string>(selIds);
  }, [selIds]);

  const scopedDoc = useMemo(() => {
    if (!doc || !Array.isArray(doc.objects) || selSet.size === 0) return doc;
    const filtered = doc.objects.filter((o: any) => selSet.has(o.id) || (o.group && selSet.has(o.group)));
    return filtered.length > 0 ? { ...doc, objects: filtered } : doc;
  }, [doc, selSet]);

  const isScoped = Boolean(doc && Array.isArray(doc.objects) && selSet.size > 0 && scopedDoc !== doc);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const isFocusedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);
  const lastSentDocRef = useRef<any>(null);

  /** Serialisasi dokumen menjadi raw SVG string */
  const serializeCurrentDoc = useCallback((targetDoc: any): string => {
    if (!targetDoc) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"></svg>';
    try {
      if (typeof targetDoc === 'string') return targetDoc;
      if (VE && typeof VE.serializeDoc === 'function') {
        return VE.serializeDoc(targetDoc);
      }
      return serializeDoc(targetDoc);
    } catch (err) {
      console.warn('[SvgCodeInspector] serializeDoc failed:', err);
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"></svg>';
    }
  }, []);

  /** Hasilkan teks kode sesuai tab aktif */
  const getCodeForTab = useCallback((tab: SvgExportFormat, targetDoc: any): string => {
    if (!targetDoc) return '';
    try {
      if (tab === 'svg-raw') {
        return serializeCurrentDoc(targetDoc);
      }
      if (VE && typeof VE.generateExportCode === 'function') {
        return VE.generateExportCode(targetDoc, tab);
      }
      return generateExportCode(targetDoc, tab);
    } catch (err) {
      console.warn('[SvgCodeInspector] getCodeForTab failed:', err);
      return '';
    }
  }, [serializeCurrentDoc]);

  // Kanvas -> Kode: Perbarui tampilan kode saat prop `scopedDoc` atau `activeTab` berubah
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'svg-raw') {
      // Jika doc sama dengan yang terakhir dikirim oleh editor ini, jangan timpa
      if (doc && doc === lastSentDocRef.current) {
        return;
      }
      // Jangan timpa jika pengguna sedang fokus mengetik di textarea
      if (!isFocusedRef.current) {
        const raw = serializeCurrentDoc(scopedDoc);
        setCodeText(raw);
        setXmlError(null);
      }
    } else {
      const generated = getCodeForTab(activeTab, scopedDoc);
      setCodeText(generated);
      setXmlError(null);
    }
  }, [doc, scopedDoc, activeTab, isOpen, serializeCurrentDoc, getCodeForTab]);

  // Validasi dan sinkronisasi Kode -> Kanvas
  const validateAndSync = useCallback((code: string) => {
    const val = validateSvgXml(code);
    if (!val.valid) {
      setXmlError(val.error || 'Syntax error in SVG XML');
      return; // Kanvas tetap utuh dan aman
    }

    try {
      const parsed = VE && typeof VE.parseSVG === 'function' ? VE.parseSVG(code) : parseSVG(code);
      if (parsed && !parsed.error && Array.isArray(parsed.objects)) {
        setXmlError(null);
        let nextDoc = parsed;
        if (isScoped && doc && Array.isArray(doc.objects)) {
          const scopedIds = new Set((scopedDoc?.objects || []).map((o: any) => o.id));
          const firstIdx = doc.objects.findIndex((o: any) => scopedIds.has(o.id));
          const kept = doc.objects.filter((o: any) => !scopedIds.has(o.id));
          const insertAt = firstIdx >= 0 ? Math.min(firstIdx, kept.length) : kept.length;
          const mergedObjs = [
            ...kept.slice(0, insertAt),
            ...parsed.objects,
            ...kept.slice(insertAt),
          ];
          nextDoc = { ...doc, objects: mergedObjs };
        }
        lastSentDocRef.current = nextDoc;
        if (onUpdateDoc) {
          onUpdateDoc(nextDoc);
        }
      } else {
        setXmlError('Failed to parse SVG elements');
      }
    } catch (err: any) {
      setXmlError(err?.message || 'SVG parser error');
    }
  }, [onUpdateDoc, isScoped, doc, scopedDoc]);

  // Perubahan teks di textarea dengan debouncing 300ms
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setCodeText(nextVal);

    if (activeTab !== 'svg-raw') return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      validateAndSync(nextVal);
    }, 300);
  };

  // Bersihkan timer saat unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Pintasan Keyboard Esc untuk menutup modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key.toLowerCase() === 'c' || e.code === 'KeyC')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Sinkronisasi scroll antara textarea dan gutter line numbers
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Dukungan tombol Tab untuk indentasi 2 spasi
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && activeTab === 'svg-raw') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const nextVal = val.substring(0, start) + '  ' + val.substring(end);
      setCodeText(nextVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        validateAndSync(nextVal);
      }, 300);
    }
  };

  // Beralih Tab
  const handleTabChange = (tabId: SvgExportFormat) => {
    setActiveTab(tabId);
    setXmlError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const newText = getCodeForTab(tabId, doc);
    setCodeText(newText);
  };

  // Aksi Header: Format / Prettify
  const handlePrettify = () => {
    try {
      const fn = VE && typeof VE.prettifyXml === 'function' ? VE.prettifyXml : prettifyXml;
      const formatted = fn(codeText);
      setCodeText(formatted);
      if (activeTab === 'svg-raw') {
        validateAndSync(formatted);
      }
    } catch (err) {
      console.warn('Prettify failed:', err);
    }
  };

  // Aksi Header: Minify
  const handleMinify = () => {
    try {
      const fn = VE && typeof VE.optimizeSvg === 'function' ? VE.optimizeSvg : optimizeSvg;
      const minResult = fn(codeText, {
        collapseWhitespace: true,
        removeEditorData: false,
        precision: -1,
        removeComments: true,
        shortenColors: true,
        removeUnusedDefs: true,
      });
      setCodeText(minResult.svg);
      if (activeTab === 'svg-raw') {
        validateAndSync(minResult.svg);
      }
    } catch (err) {
      console.warn('Minify failed:', err);
    }
  };

  // Aksi Header: Salin ke Clipboard
  const handleCopy = async () => {
    let success = false;
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(codeText);
        success = true;
      }
    } catch (err) {
      // Fallback untuk lingkungan headless browser atau file://
    }

    if (!success) {
      try {
        const ta = document.createElement('textarea');
        ta.value = codeText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (err) {
        console.warn('Copy fallback failed:', err);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Aksi Header: Unduh File
  const handleDownload = () => {
    let ext = '.svg';
    let mime = 'image/svg+xml';
    if (activeTab === 'react-jsx') {
      ext = '.jsx';
      mime = 'text/javascript';
    } else if (activeTab === 'vue-sfc') {
      ext = '.vue';
      mime = 'text/plain';
    } else if (activeTab === 'css-data-uri') {
      ext = '.css';
      mime = 'text/css';
    } else if (activeTab === 'svg-minified') {
      ext = '.min.svg';
      mime = 'image/svg+xml';
    }

    const filename = `vector-graphic${ext}`;
    try {
      const blob = new Blob([codeText], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Download failed:', err);
    }
  };

  // Metrik Statistik Footer
  const lines = useMemo(() => codeText.split('\n'), [codeText]);
  const lineCount = Math.max(1, lines.length);

  const byteLength = useMemo(() => {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(codeText).length;
    }
    return codeText.length;
  }, [codeText]);

  const formattedSize = byteLength < 1024
    ? `${byteLength} B`
    : `${(byteLength / 1024).toFixed(1)} KB`;

  const savingsPct = useMemo(() => {
    if (activeTab !== 'svg-minified') return 0;
    try {
      const raw = serializeCurrentDoc(scopedDoc);
      const rawBytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(raw).length : raw.length;
      if (rawBytes <= 0) return 0;
      return Math.max(0, Math.round(((rawBytes - byteLength) / rawBytes) * 100));
    } catch (_) {
      return 0;
    }
  }, [activeTab, doc, byteLength, serializeCurrentDoc]);

  if (!mounted || typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      className={'ov ' + (leaving ? 'out' : 'in')}
      onPointerDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="hp"
        role="dialog"
        aria-label={lang === 'en' ? 'SVG Code Inspector & Live Editor' : 'Inspektor Kode SVG & Editor Langsung'}
        data-testid="code-inspector-modal"
        style={{
          width: 'min(980px, 95vw)',
          maxWidth: '95vw',
          height: 'min(820px, 90vh)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          background: 'var(--card, #1e293b)',
          border: '1px solid var(--line, #334155)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
        }}
      >
        {/* Header Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--line, #334155)', background: 'var(--sub, #0f172a)' }}
        >
          {/* Title & Live Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--acc, #13b152) 18%, transparent)', color: 'var(--acc, #13b152)' }}
            >
              <Ico n="code" size={17} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-2">
                <span>{lang === 'en' ? 'SVG Code Inspector & Live Editor' : 'SVG Code Inspector & Live Editor'}</span>
                <span className="fig-badge" data-testid="code-inspector-scope-badge">
                  {isScoped
                    ? `${lang === 'en' ? 'Selection' : 'Seleksi'}: ${scopedDoc?.objects?.length || 0}`
                    : (lang === 'en' ? 'All Canvas' : 'Semua Kanvas')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {xmlError ? (
                  <span
                    data-testid="code-inspector-error-badge"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    title={xmlError}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="truncate max-w-[260px] sm:max-w-[360px]">
                      ▲ XML Error: {xmlError}
                    </span>
                  </span>
                ) : (
                  <span
                    data-testid="code-inspector-sync-badge"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>● Live Sync Active</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              data-testid="btn-prettify"
              onClick={handlePrettify}
              className="btn sec inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors"
              title={lang === 'en' ? 'Format / Prettify XML' : 'Format / Rapikan Indentasi XML'}
            >
              <Ico n="wand" size={13} />
              <span>{lang === 'en' ? 'Prettify' : 'Format'}</span>
            </button>

            <button
              type="button"
              data-testid="btn-minify"
              onClick={handleMinify}
              className="btn sec inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors"
              title={lang === 'en' ? 'Minify SVG' : 'Kompres / Minifikasi SVG'}
            >
              <Ico n="sliders" size={13} />
              <span>{lang === 'en' ? 'Minify' : 'Minifikasi'}</span>
            </button>

            <button
              type="button"
              data-testid="btn-copy"
              onClick={handleCopy}
              className="btn sec inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors"
              title={lang === 'en' ? 'Copy code to clipboard' : 'Salin kode ke papan klip'}
            >
              <Ico n={copied ? 'check' : 'copy'} size={13} />
              <span className={copied ? 'text-emerald-400 font-semibold' : ''}>
                {copied
                  ? (lang === 'en' ? 'Copied!' : 'Tersalin!')
                  : (lang === 'en' ? 'Copy' : 'Salin')}
              </span>
            </button>

            <button
              type="button"
              data-testid="btn-download"
              onClick={handleDownload}
              className="btn sec inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors"
              title={lang === 'en' ? 'Download file' : 'Unduh berkas'}
            >
              <Ico n="download" size={13} />
              <span>{lang === 'en' ? 'Download' : 'Unduh'}</span>
            </button>

            <button
              type="button"
              data-testid="btn-close"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close' : 'Tutup'}
              className="btn sec p-1.5 rounded-lg ml-1"
              style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ico n="x" size={14} />
            </button>
          </div>
        </div>

        {/* Tab Bar (Segmented Control) */}
        <style>{`
          .svg-insp-tab { color: var(--mut); background: transparent; cursor: pointer; }
          .svg-insp-tab:hover { color: var(--ink) !important; background: var(--sub) !important; }
          .svg-insp-tab.on { color: var(--ink) !important; background: var(--sub) !important; font-weight: 600; box-shadow: inset 0 0 0 1px var(--line); }
        `}</style>
        <div
          className="flex items-center gap-1 px-5 py-2.5 border-b overflow-x-auto shrink-0 select-none"
          style={{ borderColor: 'var(--line, #334155)', background: 'var(--card, #1e293b)' }}
        >
          {TAB_CONFIG.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testId}
                onClick={() => handleTabChange(tab.id)}
                className={`svg-insp-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${isActive ? 'on' : ''}`}
              >
                <span>{tab.label}</span>
                {tab.id === 'svg-raw' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-normal opacity-70 bg-emerald-500/15 text-emerald-400">
                    Live
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Editor Area with Monospace Textarea & Line Numbers */}
        <div
          className="flex-1 flex min-h-0 relative overflow-hidden bg-slate-950"
          style={{ background: '#090d16' }}
        >
          {/* Left Gutter: Line Numbers */}
          <div
            ref={gutterRef}
            data-testid="code-line-gutter"
            className="select-none overflow-hidden text-right py-3 px-3 font-mono text-xs text-slate-500 border-r shrink-0"
            style={{
              minWidth: '46px',
              lineHeight: '20px',
              background: '#0d121f',
              borderColor: '#1e293b'
            }}
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} style={{ height: '20px', lineHeight: '20px' }}>
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea Code Editor */}
          <textarea
            ref={textareaRef}
            data-testid="svg-code-textarea"
            value={codeText}
            onChange={handleTextChange}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              isFocusedRef.current = true;
            }}
            onBlur={() => {
              isFocusedRef.current = false;
            }}
            readOnly={activeTab !== 'svg-raw'}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="flex-1 w-full h-full p-3 font-mono text-xs text-slate-100 bg-transparent resize-none outline-none whitespace-pre font-normal"
            style={{
              lineHeight: '20px',
              tabSize: 2,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }}
          />
        </div>

        {/* Footer Statistics Bar */}
        <div
          data-testid="code-inspector-stats"
          className="flex items-center justify-between px-5 py-2.5 border-t text-xs shrink-0 select-none text-slate-400"
          style={{ borderColor: 'var(--line, #334155)', background: 'var(--sub, #0f172a)' }}
        >
          <div className="flex items-center gap-4">
            <span>
              {formattedSize}
            </span>
            <span>
              {codeText.length} {lang === 'en' ? 'characters' : 'karakter'}
            </span>
            <span>
              {lineCount} {lang === 'en' ? 'lines' : 'baris'}
            </span>
            {activeTab === 'svg-minified' && savingsPct > 0 && (
              <span
                data-testid="code-inspector-savings"
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              >
                {lang === 'en' ? `Saved ${savingsPct}%` : `Hemat ${savingsPct}%`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {activeTab === 'svg-raw' ? (
              <span className="text-emerald-400/90 font-medium">
                {lang === 'en' ? 'Two-Way Live Editing Mode' : 'Mode Edit Dua Arah Langsung'}
              </span>
            ) : (
              <span className="text-slate-400">
                {lang === 'en' ? 'Read-only Export Preset' : 'Preset Ekspor Hanya Baca'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.fullscreenElement || document.body
  );
};

export default SvgCodeInspectorModal;
