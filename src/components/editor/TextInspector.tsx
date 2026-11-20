import React, {useEffect, useRef, useState} from 'react';
import {legacyTextSpec, legacyTextBounds} from '../../engine/legacyText.tsx';
import {clampN} from '../../utils/colorMath.tsx';
import {Select} from '../ui/SelectDropdown.tsx';
import {ensureGoogleFontPreview} from '../../renderer/googleFonts.tsx';
import {XfField} from '../ui/TransformField.tsx';
import {ColorField} from '../ui/ColorPickerField.tsx';

const WEIGHT_OPTIONS = [
  {value: 'normal', label: 'Regular'},
  {value: '500', label: 'Medium'},
  {value: '600', label: 'SemiBold'},
  {value: 'bold', label: 'Bold'}
];

export function TextInspector({
  object,
  update,
  updateLive,
  edit,
  onImportFont,
  onConvertToPath,
  availableFonts = ['IBM Plex Sans'],
  isFontAvailable = true,
  lang = 'id',
  googleFonts = [],
  embedStatus = null,
  onEmbedFont = null
}) {
  // Hooks harus di atas early return. Isi teks diedit lewat buffer lokal:
  // ketik -> pratinjau live tanpa riwayat, blur/Ctrl+Enter -> 1x commit.
  // (Dulu: tiap ketik langsung commit, jadi 1 huruf = 1 langkah Undo.)
  const t = object && object.type === 'text' ? legacyTextSpec(object) : null;
  const en = lang === 'en';
  // Tanpa updateLive, pratinjau ketik memakai commit biasa (kompatibel pemanggil lama).
  const live = updateLive || update;
  const contentRef = useRef(null);
  const contentFocused = useRef(false);
  // Nilai isi saat field mulai difokuskan. Bandingkan commit dengan ini, BUKAN
  // dengan t.content: pratinjau live sudah menyamakan t.content dengan buffer
  // tiap ketik, jadi banding ke t.content membuat blur tidak pernah commit
  // dan ketikan tidak pernah masuk riwayat Undo.
  const contentStart = useRef('');
  // Escape membatalkan ketikan: setContentBuf bersifat async, jadi blur yang
  // langsung menyusul masih melihat buffer lama — tandai lewat ref ini.
  const contentCancel = useRef(false);
  const [contentBuf, setContentBuf] = useState(t ? t.content : '');
  useEffect(() => {
    if (!contentFocused.current) setContentBuf(t ? t.content : '');
  }, [t ? t.content : '', object ? object.id : null]);
  if (!object || object.type !== 'text' || !t) return null;
  const commitContent = () => {
    if (contentCancel.current) {
      contentCancel.current = false;
      return;
    }
    if (contentBuf !== contentStart.current) update({content: contentBuf});
  };
  const [bx0, by0, bx1, by1] = legacyTextBounds(object) || [
    t.x,
    t.y - t.fontSize,
    t.x + Math.max(80, t.fontSize * 3),
    t.y + t.fontSize * 0.25
  ];
  const measuredW = Math.max(80, Math.round(bx1 - bx0));
  const measuredH = Math.max(Math.round(t.fontSize * t.lineHeight), Math.round(by1 - by0));

  // availableFonts boleh berisi string nama keluarga ATAU objek registry
  // {family, faces, assetId, isBundled} dari listFamilies() — normalisasi ke
  // string dulu: me-render objek sebagai React child melempar React error #31
  // dan meng-unmount seluruh app (blank putih).
  const families = Array.from(new Set([
    ...availableFonts.filter(Boolean).map((f: any) => typeof f === 'string' ? f : f && f.family).filter(Boolean),
    'IBM Plex Sans',
    ...(t.fontFamily ? [t.fontFamily] : [])
  ]));

  // Katalog Google Fonts yang belum terdaftar: tampil di bawah separator di
  // dropdown yang sama. Memilihnya memicu embed otomatis (onEmbedFont),
  // bukan sekadar ganti nama keluarga.
  const registeredSet = new Set(families);
  const googleOptions = (Array.isArray(googleFonts) ? googleFonts : [])
    .filter(g => g && g.family && !registeredSet.has(g.family));
  const isGooglePending = !!(embedStatus && embedStatus.family === t.fontFamily);
  const familyOptions = [
    // meta.fontFamily membuat tiap opsi dirender dengan family-nya sendiri
    // (preview); font yang belum ter-load tampil fallback dulu, lalu
    // berganti otomatis saat FontFace preview-nya masuk (lihat Select).
    ...families.map(fam => [fam, fam + (!isFontAvailable && fam === t.fontFamily && !isGooglePending ? (en ? ' (Missing)' : ' (Belum ada)') : ''), null, {fontFamily: fam}]),
    ...(googleOptions.length ? [['__sep_google__', '── Google Fonts ──', null, {disabled: true}]] : []),
    ...googleOptions.map(g => [g.family, g.family, null, {fontFamily: g.family}])
  ];
  const pickFamily = v => {
    if (googleOptions.some(g => g.family === v)) {
      if (onEmbedFont) {
        onEmbedFont(v);
        return;
      }
    }
    update({fontFamily: v});
  };

  const setResizing = mode => {
    if (mode === 'autoWidth') {
      update({resizing: 'autoWidth', width: null, height: null});
    } else if (mode === 'autoHeight') {
      update({
        resizing: 'autoHeight',
        width: t.width && t.width > 0 ? t.width : measuredW,
        height: null
      });
    } else if (mode === 'fixed') {
      update({
        resizing: 'fixed',
        width: t.width && t.width > 0 ? t.width : measuredW,
        height: t.height && t.height > 0 ? t.height : measuredH
      });
    }
  };

  const setHorizontalAlign = nextAnchor => {
    if (nextAnchor === t.textAnchor) return;
    // Keep visual box stationary when switching alignment on autoWidth point text
    if (t.resizing === 'autoWidth' && (!t.width || t.width <= 0)) {
      const boxLeft = bx0;
      const boxWidth = Math.max(1, bx1 - bx0);
      const nextX = nextAnchor === 'middle'
        ? boxLeft + boxWidth / 2
        : nextAnchor === 'end'
          ? boxLeft + boxWidth
          : boxLeft;
      update({textAnchor: nextAnchor, x: Math.round(nextX * 100) / 100});
    } else {
      update({textAnchor: nextAnchor});
    }
  };

  // Lebar/tinggi kotak: commit sekali saat selesai edit (bukan tiap ketik).
  // '' = kembali ke Auto (null), mengikuti aturan resizing yang sudah ada.
  const setBoxWidth = v => {
    const val = Math.max(1, Math.round(v * 100) / 100);
    update({width: val, resizing: t.resizing === 'autoWidth' ? 'autoHeight' : t.resizing});
  };
  const setBoxHeight = v => {
    const val = Math.max(1, Math.round(v * 100) / 100);
    update({
      height: val,
      width: t.width && t.width > 0 ? t.width : measuredW,
      resizing: 'fixed'
    });
  };

  return (
    <div className="fig-isec fade" data-testid="text-inspector">
      <div className="fig-isec-title">
        <span>{en ? 'Typography' : 'Tipografi (Teks)'}</span>
        <div className="flex items-center gap-1">
          {onImportFont && (
            <button
              type="button"
              className="ved-pill text-[10px]"
              style={{padding: '2px 7px'}}
              data-action="import-font"
              data-tip="veTextImportFont"
              onClick={onImportFont}
            >
              + Font
            </button>
          )}
          {onConvertToPath && (
            <button
              type="button"
              className="ved-pill text-[10px]"
              style={{padding: '2px 7px'}}
              data-action="convert-to-path"
              data-tip="veTextToPath"
              onClick={onConvertToPath}
            >
              {en ? 'Outline' : 'Ke Path'}
            </button>
          )}
        </div>
      </div>

      {!isFontAvailable && !(embedStatus && embedStatus.state === 'loading' && embedStatus.family === t.fontFamily) && (
        <div
          data-testid="missing-font-warning"
          className="p-2 mb-2.5 rounded-xl text-[11px] space-y-1.5"
          style={{
            background: 'color-mix(in srgb, #f59e0b 14%, var(--sub))',
            border: '1px solid color-mix(in srgb, #f59e0b 45%, var(--line))'
          }}
        >
          <div className="font-semibold flex items-center justify-between gap-1" style={{color: '#f59e0b'}}>
            <span>
              {en ? `Missing font: ${t.fontFamily}` : `Font belum tersedia: ${t.fontFamily}`}
            </span>
          </div>
          <div className="text-[11px] mut">
            {en
              ? 'Stored family is preserved. Import its .ttf/.otf file or pick a replacement.'
              : 'Nama font tetap disimpan. Impor file .ttf/.otf atau pilih font pengganti.'}
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            {onImportFont && (
              <button
                type="button"
                className="ved-pill text-[10px] flex-1 justify-center"
                data-tip="veTextImportFont"
                onClick={onImportFont}
              >
                {en ? 'Import .TTF/.OTF' : 'Impor .TTF/.OTF'}
              </button>
            )}
            <button
              type="button"
              className="ved-pill text-[10px] flex-1 justify-center"
              data-tip="veTextUsePlex"
              onClick={() => update({fontFamily: 'IBM Plex Sans', fontAssetId: null, fontAssetIds: null})}
            >
              {en ? 'Use IBM Plex Sans' : 'Pakai IBM Plex Sans'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* Font Family Picker — dropdown kustom (Select), bukan <select> native */}
        <div>
          <div className="fig-sub-lbl">{en ? 'Font Family' : 'Keluarga Font'}</div>
          <Select
            value={t.fontFamily}
            options={familyOptions}
            on={pickFamily}
            tip="veFontFamily"
            lang={lang}
            searchable
            searchPlaceholder={en ? 'Search fonts…' : 'Cari font…'}
            onOptionVisible={fam => { ensureGoogleFontPreview(fam); }}
          />
          {embedStatus && embedStatus.family === t.fontFamily && (
            <div data-testid="google-font-embed-status" className="text-[11px] mt-1" style={{color: embedStatus.state === 'error' ? '#ef4444' : embedStatus.state === 'done' ? '#16a34a' : 'var(--mut)'}}>
              {embedStatus.state === 'loading'
                ? (en ? `Downloading ${embedStatus.family}…` : `Mengunduh ${embedStatus.family}…`)
                : embedStatus.state === 'done'
                  ? (en ? `${embedStatus.family} embedded into project` : `${embedStatus.family} disematkan ke proyek`)
                  : (en ? `Failed: ${embedStatus.message}` : `Gagal: ${embedStatus.message}`)}
            </div>
          )}
        </div>

        {/* Weight, Style (B/I), & Font Size Row — semua input kustom */}
        <div className="grid grid-cols-[1fr_auto_96px] gap-1.5 items-end">
          <div>
            <div className="fig-sub-lbl">{en ? 'Weight' : 'Ketebalan'}</div>
            <Select
              value={String(t.fontWeight || 'normal')}
              options={WEIGHT_OPTIONS.map(w => [w.value, w.label])}
              on={v => update({fontWeight: v})}
              tip="veFontWeight"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={en ? 'Bold' : 'Tebal'}
              aria-pressed={t.fontWeight === 'bold' || Number(t.fontWeight) >= 600}
              data-tip="veTextBold"
              className={'fig-ibtn' + (t.fontWeight === 'bold' || Number(t.fontWeight) >= 600 ? ' on' : '')}
              style={{background: 'var(--sub)', width: 30, height: 30, fontWeight: 700, fontSize: 12}}
              onClick={() => update({fontWeight: t.fontWeight === 'bold' ? 'normal' : 'bold'})}
            >
              B
            </button>
            <button
              type="button"
              aria-label={en ? 'Italic' : 'Miring'}
              aria-pressed={t.fontStyle === 'italic'}
              data-tip="veTextItalic"
              className={'fig-ibtn' + (t.fontStyle === 'italic' ? ' on' : '')}
              style={{background: 'var(--sub)', width: 30, height: 30, fontStyle: 'italic', fontFamily: 'serif', fontSize: 12}}
              onClick={() => update({fontStyle: t.fontStyle === 'italic' ? 'normal' : 'italic'})}
            >
              I
            </button>
          </div>

          <div>
            <div className="fig-sub-lbl">{en ? 'Size' : 'Ukuran'}</div>
            <XfField label="px" ariaLabel={en ? 'Size' : 'Ukuran'} value={t.fontSize ?? 24} min={1} step={1} on={v => update({fontSize: clampN(v, 1, 10000)})} tip="veFontSize" />
          </div>
        </div>

        {/* Line Height, Letter Spacing, Paragraph Spacing (Figma 3-column metrics) */}
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <span className="fig-sub-lbl block">{en ? 'Line H' : 'Tinggi Brs'}</span>
            <XfField label="" ariaLabel={en ? 'Line height' : 'Tinggi baris'} value={t.lineHeight ?? 1.2} min={0.5} step={0.05} on={v => update({lineHeight: clampN(v, 0.5, 5)})} tip="veLineHeight" />
          </div>
          <div>
            <span className="fig-sub-lbl block">{en ? 'Letter Sp' : 'Jarak Hrf'}</span>
            <XfField label="" ariaLabel={en ? 'Letter spacing' : 'Jarak huruf'} value={t.letterSpacing ?? 0} min={-200} step={0.2} on={v => update({letterSpacing: clampN(v, -200, 1000)})} tip="veLetterSpacing" />
          </div>
          <div>
            <span className="fig-sub-lbl block">{en ? 'Para Sp' : 'Jarak Prg'}</span>
            <XfField label="" ariaLabel={en ? 'Paragraph spacing' : 'Jarak paragraf'} value={t.paragraphSpacing ?? 0} min={0} step={1} on={v => update({paragraphSpacing: clampN(v, 0, 1000)})} tip="veParaSpacing" />
          </div>
        </div>

        {/* Figma Resizing Mode (Auto Width / Auto Height / Fixed Size).
            Tata letak ronde 5: Lebar Auto + Tinggi Auto sejajar (baris 1),
            Tetap selebar penuh di bawahnya (baris 2). */}
        <div>
          <div className="fig-sub-lbl">{en ? 'Resizing' : 'Mode Kotak Teks'}</div>
          <div className="grid grid-cols-2 gap-1">
            {[
              {
                key: 'autoWidth',
                label: en ? 'Auto W' : 'Lebar Auto',
                tip: 'veTextResizeAutoW',
                icon: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4'
              },
              {
                key: 'autoHeight',
                label: en ? 'Auto H' : 'Tinggi Auto',
                tip: 'veTextResizeAutoH',
                icon: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4'
              },
              {
                key: 'fixed',
                label: en ? 'Fixed' : 'Tetap',
                tip: 'veTextResizeFixed',
                icon: 'M4 4h16v16H4z'
              }
            ].map(item => (
              <button
                key={item.key}
                type="button"
                data-resizing={item.key}
                data-tip={item.tip}
                className={'ved-pill text-[11px] flex items-center justify-center gap-1' + (item.key === 'fixed' ? ' col-span-2' : '') + (t.resizing === item.key ? ' on' : '')}
                style={{padding: '4px 6px'}}
                onClick={() => setResizing(item.key)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal & Vertical Alignment */}
        <div className="grid grid-cols-[4fr_3fr] gap-1.5">
          <div>
            <div className="fig-sub-lbl">{en ? 'Align H' : 'Rata Horz'}</div>
            <div className="fig-aln-bar">
              {[
                {k: 'start', title: en ? 'Align Left' : 'Rata Kiri', tip: 'veTextAlignLeft', d: 'M4 6h16M4 12h10M4 18h14'},
                {k: 'middle', title: en ? 'Align Center' : 'Rata Tengah', tip: 'veTextAlignCenter', d: 'M4 6h16M7 12h10M5 18h14'},
                {k: 'end', title: en ? 'Align Right' : 'Rata Kanan', tip: 'veTextAlignRight', d: 'M4 6h16M10 12h10M6 18h14'},
                {k: 'justify', title: en ? 'Justify' : 'Rata Kiri-Kanan', tip: 'veTextAlignJustify', d: 'M4 6h16M4 12h16M4 18h16'}
              ].map(al => (
                <button
                  key={al.k}
                  type="button"
                  data-align-h={al.k}
                  data-tip={al.tip}
                  aria-label={al.title}
                  className={t.textAnchor === al.k ? 'on' : ''}
                  onClick={() => setHorizontalAlign(al.k)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                    <path d={al.d} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="fig-sub-lbl">{en ? 'Align V' : 'Rata Vert'}</div>
            <div className="fig-aln-bar">
              {[
                {k: 'top', title: en ? 'Align Top' : 'Rata Atas', tip: 'veTextAlignTop', d: 'M4 4h16M12 8v12M8 12l4-4 4 4'},
                {k: 'middle', title: en ? 'Align Middle' : 'Rata Tengah Vertikal', tip: 'veTextAlignMiddle', d: 'M4 12h16M12 4v5M12 15v5'},
                {k: 'bottom', title: en ? 'Align Bottom' : 'Rata Bawah', tip: 'veTextAlignBottom', d: 'M4 20h16M12 4v12M8 12l4 4 4-4'}
              ].map(vl => (
                <button
                  key={vl.k}
                  type="button"
                  data-align-v={vl.k}
                  data-tip={vl.tip}
                  aria-label={vl.title}
                  className={t.verticalAlign === vl.k ? 'on' : ''}
                  onClick={() => update({verticalAlign: vl.k})}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d={vl.d} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Text Case & Text Decoration */}
        <div className="grid grid-cols-[4fr_3fr] gap-1.5">
          <div>
            <div className="fig-sub-lbl">{en ? 'Case' : 'Huruf Kapital'}</div>
            <div className="fig-aln-bar">
              {[
                {k: 'original', label: '—', title: en ? 'As typed' : 'Sesuai ketikan', tip: 'veTextCaseOrig'},
                {k: 'upper', label: 'AG', title: en ? 'Uppercase' : 'HURUF BESAR', tip: 'veTextCaseUpper'},
                {k: 'lower', label: 'ag', title: en ? 'Lowercase' : 'huruf kecil', tip: 'veTextCaseLower'},
                {k: 'title', label: 'Ag', title: en ? 'Title Case' : 'Awalan Kapital', tip: 'veTextCaseTitle'}
              ].map(cs => (
                <button
                  key={cs.k}
                  type="button"
                  data-text-case={cs.k}
                  data-tip={cs.tip}
                  aria-label={cs.title}
                  className={'text-[11px] font-semibold' + (t.textCase === cs.k ? ' on' : '')}
                  onClick={() => update({textCase: cs.k})}
                >
                  {cs.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="fig-sub-lbl">{en ? 'Decoration' : 'Dekorasi'}</div>
            <div className="fig-aln-bar">
              {[
                {k: 'none', label: '—', title: en ? 'None' : 'Tanpa garis', tip: 'veTextDecoNone'},
                {k: 'underline', label: 'U', title: en ? 'Underline' : 'Garis bawah', tip: 'veTextDecoUnderline', style: {textDecoration: 'underline'}},
                {k: 'strikethrough', label: 'S', title: en ? 'Strikethrough' : 'Coret tengah', tip: 'veTextDecoStrike', style: {textDecoration: 'line-through'}}
              ].map(dc => (
                <button
                  key={dc.k}
                  type="button"
                  data-text-decoration={dc.k}
                  data-tip={dc.tip}
                  aria-label={dc.title}
                  style={dc.style}
                  className={'text-[11px] font-semibold' + (t.textDecoration === dc.k ? ' on' : '')}
                  onClick={() => update({textDecoration: dc.k})}
                >
                  {dc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Box Width / Height inputs — XfField kustom; kosongkan = kembali Auto */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <span className="fig-sub-lbl block">{en ? 'Text box width' : 'Lebar kotak'}</span>
            <XfField label="W" ariaLabel={en ? 'Text box width' : 'Lebar kotak'} placeholder={en ? 'Auto' : 'Otomatis'} value={t.width} min={1} step={1} on={setBoxWidth} onClear={() => update({width: null, resizing: 'autoWidth'})} tip="veTextBoxW" />
          </div>
          <div>
            <span className="fig-sub-lbl block">{en ? 'Text box height' : 'Tinggi kotak'}</span>
            <XfField label="H" ariaLabel={en ? 'Text box height' : 'Tinggi kotak'} placeholder={en ? 'Auto' : 'Otomatis'} value={t.height} min={1} step={1} on={setBoxHeight} onClear={() => update({height: null, resizing: t.width ? 'autoHeight' : 'autoWidth'})} tip="veTextBoxH" />
          </div>
        </div>

        {/* Content — buffer lokal + pratinjau live; commit 1x saat blur.
            onKeyDown stopPropagation: tombol di sini milik field, bukan shortcut
            kanvas (dulu: spasi tidak bisa diketik, huruf t/v mengganti tool,
            Ctrl+A memilih semua objek). */}
        <label className="block text-[11px]">
          <span className="fig-sub-lbl block">{en ? 'Content' : 'Isi Teks'}</span>
          <textarea
            ref={contentRef}
            className="fig-input w-full text-[11px]"
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              background: 'var(--sub)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              resize: 'vertical'
            }}
            data-tip="veTextContent"
            aria-label={en ? 'Text content' : 'Isi teks'}
            value={contentBuf}
            onChange={e => {
              const next = e.target.value;
              setContentBuf(next);
              live({content: next});
            }}
            onFocus={() => { contentFocused.current = true; contentCancel.current = false; contentStart.current = t.content; }}
            onBlur={() => {
              contentFocused.current = false;
              commitContent();
            }}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                // Batal: kembalikan isi ke nilai saat mulai edit (termasuk
                // pratinjau live di kanvas), lalu blur tanpa commit.
                e.preventDefault();
                contentCancel.current = true;
                setContentBuf(contentStart.current);
                live({content: contentStart.current});
                contentRef.current?.blur();
              } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commitContent();
                contentRef.current?.blur();
              }
            }}
            rows={2}
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <span className="fig-sub-lbl mb-0">{en ? 'Text Color' : 'Warna Teks'}</span>
          <div className="flex items-center gap-1.5">
            <ColorField
              tip="veTextColor"
              value={t.fill}
              on={(v, meta) => {
                if (meta && meta.isLive) live({fill: v});
                else update({fill: v});
              }}
              onCommit={v => update({fill: v})}
            />
            <span className="font-mono text-[11px]">{/^#[0-9a-fA-F]{6}$/.test(t.fill) ? t.fill.toUpperCase() : t.fill}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            data-action="edit-on-canvas"
            data-tip="veTextEditCanvas"
            className="btn sec text-[11px] py-1.5 justify-center"
            onClick={edit}
          >
            {en ? 'Edit on canvas' : 'Edit di kanvas'}
          </button>
          {onConvertToPath && (
            <button
              type="button"
              className="btn pri text-[11px] py-1.5 justify-center"
              data-tip="veTextToPath"
              onClick={onConvertToPath}
            >
              {en ? 'Convert to Path' : 'Ubah ke Path'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default TextInspector;
