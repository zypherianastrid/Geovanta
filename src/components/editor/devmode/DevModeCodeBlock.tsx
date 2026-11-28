/**
 * @file src/components/editor/devmode/DevModeCodeBlock.tsx
 * @description Blok kode Dev Mode dengan syntax highlighting offline, pencarian CustomTextBox,
 * word-wrap toggle, download snippet, pemilih 7 bahasa, serta Live SVG Code Editor (0% native textarea).
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { DevCodeLang, getCodeFileExtension } from '../../../engine/devModeCodeGen.ts';
import { Ico } from '../../ui/IconGlyphs.tsx';
import { Select } from '../../ui/SelectDropdown.tsx';
import { CustomTextBox } from '../../ui/CustomTextBox.tsx';

export interface DevModeCodeBlockProps {
  code: string;
  codeLang: DevCodeLang;
  onChangeCodeLang: (lang: DevCodeLang) => void;
  svgMinified?: boolean;
  onToggleSvgMinified?: () => void;
  onApplySvgCode?: (code: string) => { valid: boolean; error?: string };
  fileNameBase?: string;
  lang?: string;
}

const CODE_TABS: Array<{ id: DevCodeLang; label: string }> = [
  { id: 'css', label: 'CSS' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'svg', label: 'SVG' },
  { id: 'react-jsx', label: 'React' },
  { id: 'vue-sfc', label: 'Vue' },
  { id: 'swiftui', label: 'SwiftUI' },
  { id: 'compose', label: 'Compose' },
];

type TokenKind = 'comment' | 'string' | 'prop' | 'number' | 'keyword' | 'tag' | 'plain';

function tokenizeLine(line: string, codeLang: DevCodeLang): Array<{ text: string; kind: TokenKind }> {
  const trimmed = line.trim();
  if (trimmed.startsWith('/*') || trimmed.startsWith('//') || trimmed.startsWith('<!--')) {
    return [{ text: line, kind: 'comment' }];
  }

  if (codeLang === 'css') {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !trimmed.startsWith('@')) {
      const prop = line.slice(0, colonIdx);
      const rest = line.slice(colonIdx);
      return [
        { text: prop, kind: 'prop' },
        { text: rest, kind: 'string' },
      ];
    }
  }

  const tokens: Array<{ text: string; kind: TokenKind }> = [];
  const regex = /("[^"]*"|'[^']*'|`[^`]*`|<\/?[a-zA-Z0-9:_-]+|\b\d+(?:\.\d+)?(?:px|rem|pt|dp|deg|%|sp|f)?\b|\b(?:struct|var|some|View|fun|val|import|export|default|const|return|className|template|script|setup)\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) {
      tokens.push({ text: line.slice(last, m.index), kind: 'plain' });
    }
    const val = m[0];
    let kind: TokenKind = 'plain';
    if (val.startsWith('"') || val.startsWith("'") || val.startsWith('`')) kind = 'string';
    else if (val.startsWith('<')) kind = 'tag';
    else if (/^\d/.test(val)) kind = 'number';
    else kind = 'keyword';
    tokens.push({ text: val, kind });
    last = regex.lastIndex;
  }
  if (last < line.length) {
    tokens.push({ text: line.slice(last), kind: 'plain' });
  }
  return tokens;
}

const TOKEN_CLS: Record<TokenKind, string> = {
  comment: 'text-slate-400 italic',
  string: 'text-emerald-600 dark:text-emerald-400',
  prop: 'text-sky-600 dark:text-sky-400',
  number: 'text-amber-600 dark:text-amber-400',
  keyword: 'text-violet-600 dark:text-violet-400 font-medium',
  tag: 'text-rose-600 dark:text-rose-400',
  plain: 'text-[var(--ink)]',
};

export const DevModeCodeBlock: React.FC<DevModeCodeBlockProps> = memo(({
  code,
  codeLang,
  onChangeCodeLang,
  svgMinified = false,
  onToggleSvgMinified,
  onApplySvgCode,
  fileNameBase = 'component',
  lang = 'id',
}) => {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingSvg, setIsEditingSvg] = useState(false);
  const [draftSvg, setDraftSvg] = useState(code);
  const [svgError, setSvgError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<any>(null);

  const isEn = lang === 'en';
  const canEditSvg = codeLang === 'svg' && typeof onApplySvgCode === 'function';
  const lines = useMemo(() => (code || '').split('\n'), [code]);
  const qLower = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (!canEditSvg) {
      setIsEditingSvg(false);
      setSvgError(null);
    }
  }, [canEditSvg]);

  useEffect(() => {
    if (!isEditingSvg) {
      setDraftSvg(code);
    } else if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.textContent = code;
      setDraftSvg(code);
    }
  }, [code, isEditingSvg]);

  const enterEditMode = () => {
    setDraftSvg(code);
    setSvgError(null);
    setIsEditingSvg(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.textContent = code;
        editorRef.current.focus();
      }
    }, 0);
  };

  const handleSvgInput = (nextCode: string) => {
    setDraftSvg(nextCode);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!onApplySvgCode) return;
      const res = onApplySvgCode(nextCode);
      setSvgError(res.valid ? null : (res.error || 'Invalid SVG XML'));
    }, 300);
  };

  const handleSvgApplyNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!onApplySvgCode) return;
    const currentText = editorRef.current ? (editorRef.current.textContent || '') : draftSvg;
    const res = onApplySvgCode(currentText);
    if (res.valid) {
      setSvgError(null);
    } else {
      setSvgError(res.error || 'Invalid SVG XML');
    }
  };

  const handleCopy = () => {
    const target = isEditingSvg ? draftSvg : code;
    if (!target) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(target).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleDownload = () => {
    const target = isEditingSvg ? draftSvg : code;
    if (!target || typeof document === 'undefined') return;
    const ext = getCodeFileExtension(codeLang);
    const safeName = (fileNameBase || 'element').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
    const blob = new Blob([target], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const langOptions = useMemo(
    () => CODE_TABS.map(t => [t.id, t.label] as [DevCodeLang, string]),
    []
  );

  return (
    <div
      data-testid="dev-mode-code-block"
      className="rounded-xl border border-[var(--line)] bg-[var(--sub)] overflow-hidden"
    >
      {/* Quick Language Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-[var(--line)] bg-[var(--card)]">
        {CODE_TABS.map(tab => {
          const active = codeLang === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`dev-code-tab-${tab.id}`}
              onClick={() => onChangeCodeLang(tab.id)}
              className={'ved-pill text-[10px] px-2 py-0.5' + (active ? ' on' : '')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1.5 border-b border-[var(--line)] bg-[var(--card)]">
        <div className="flex items-center gap-1">
          <div className="w-24">
            <Select
              testId="dev-code-lang-select"
              value={codeLang}
              options={langOptions}
              on={(v: DevCodeLang) => onChangeCodeLang(v)}
              lang={lang}
            />
          </div>
          {canEditSvg && (
            <button
              type="button"
              data-testid="dev-svg-edit-btn"
              onClick={() => (isEditingSvg ? setIsEditingSvg(false) : enterEditMode())}
              className={'ved-pill text-[10px] px-2 py-0.5' + (isEditingSvg ? ' on' : '')}
            >
              {isEditingSvg ? (isEn ? 'View' : 'Lihat') : (isEn ? 'Edit SVG' : 'Edit SVG')}
            </button>
          )}
          {codeLang === 'svg' && !isEditingSvg && onToggleSvgMinified && (
            <button
              type="button"
              data-testid="dev-svg-minify-btn"
              onClick={onToggleSvgMinified}
              className={'ved-pill text-[10px] px-1.5 py-0.5 font-mono' + (svgMinified ? ' on' : '')}
            >
              {svgMinified ? 'Min' : 'Pretty'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEditingSvg && (
            <>
              <button
                type="button"
                data-testid="dev-code-wrap-btn"
                onClick={() => setWordWrap(w => !w)}
                title={isEn ? 'Toggle word wrap' : 'Word Wrap'}
                className={'ved-pill text-[10px] px-1.5 py-0.5 font-mono' + (wordWrap ? ' on' : '')}
              >
                Wrap
              </button>
              <button
                type="button"
                data-testid="dev-code-search-toggle"
                onClick={() => {
                  setSearchOpen(s => !s);
                  if (searchOpen) setSearchQuery('');
                }}
                title={isEn ? 'Filter code lines' : 'Cari baris kode'}
                className={'ved-pill text-[10px] px-1.5 py-0.5' + (searchOpen ? ' on' : '')}
              >
                <Ico n="search" size={11} />
              </button>
            </>
          )}
          <button
            type="button"
            data-testid="dev-code-download-btn"
            onClick={handleDownload}
            title={isEn ? 'Download snippet' : 'Unduh kode'}
            className="ved-pill text-[10px] px-1.5 py-0.5"
          >
            <Ico n="download" size={11} />
          </button>
          <button
            type="button"
            data-testid="dev-mode-copy-code"
            onClick={handleCopy}
            className={'ved-pill text-[10px] px-2 py-0.5' + (copied ? ' on' : '')}
          >
            <Ico n={copied ? 'check' : 'copy'} size={11} />
            <span>{copied ? (isEn ? 'Copied!' : 'Disalin!') : (isEn ? 'Copy' : 'Salin')}</span>
          </button>
        </div>
      </div>

      {/* CustomTextBox Search Filter (0% native input) */}
      {searchOpen && !isEditingSvg && (
        <div className="px-2 py-1.5 border-b border-[var(--line)] bg-[var(--card)]">
          <div className="fld px-2 py-0.5 flex items-center" data-testid="dev-code-search">
            <CustomTextBox
              value={searchQuery}
              placeholder={isEn ? 'Filter code...' : 'Cari dalam kode...'}
              ariaLabel={isEn ? 'Filter code lines' : 'Cari baris kode'}
              onChange={setSearchQuery}
              onCommit={setSearchQuery}
              selectOnFocus={false}
            />
          </div>
        </div>
      )}

      {/* Live SVG Editor (0% native textarea) OR Read-only Highlighted Viewport */}
      {isEditingSvg ? (
        <div className="p-2 space-y-2">
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Live SVG Code Editor"
            data-custom-input="true"
            data-testid="dev-svg-code-editor"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            className="fig-input w-full rounded-lg p-2 font-mono text-[11px] leading-[1.45] max-h-64 min-h-[140px] overflow-auto whitespace-pre-wrap break-all focus:outline-none"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              cursor: 'text',
              userSelect: 'text',
            }}
            onKeyDown={e => e.stopPropagation()}
            onInput={e => handleSvgInput(e.currentTarget.textContent || '')}
          />
          {svgError && (
            <div
              data-testid="dev-svg-error"
              className="px-2 py-1 rounded text-[10px] font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
            >
              {svgError}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] mut">
              {isEn ? 'Live-synced to canvas' : 'Sinkron langsung ke kanvas'}
            </span>
            <button
              type="button"
              data-testid="dev-svg-apply-btn"
              onClick={handleSvgApplyNow}
              className="btn pri text-[11px] px-2.5 py-1"
            >
              {isEn ? 'Apply SVG' : 'Terapkan SVG'}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-h-64 overflow-auto font-mono text-[11px] leading-[1.45] p-2">
          <pre className={'m-0 ' + (wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre')}>
            <code>
              {lines.map((line, idx) => {
                const isMatch = qLower ? line.toLowerCase().includes(qLower) : false;
                return (
                  <div
                    key={idx}
                    className="flex rounded-sm"
                    style={isMatch ? { background: 'color-mix(in srgb, var(--acc) 20%, transparent)' } : undefined}
                  >
                    <span className="w-6 shrink-0 pr-2 text-right select-none text-[10px] text-[var(--mut)] opacity-60">
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      {tokenizeLine(line, codeLang).map((tok, tIdx) => (
                        <span key={tIdx} className={TOKEN_CLS[tok.kind]}>
                          {tok.text}
                        </span>
                      ))}
                      {line.length === 0 ? ' ' : null}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
});

export default DevModeCodeBlock;
