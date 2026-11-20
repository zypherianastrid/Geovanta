/**
 * @file src/components/editor/FindReplaceSection.tsx
 * @description Seksi sidebar Find & Replace warna (Task 7, pola seksi
 * sidebar — Task 8 Recolor WAJIB memakai ulang pola ini, bukan membuat
 * pola kedua). Dipindah verbatim dari FindReplaceColorModal (dihapus):
 * kolom From/To, jumlah kena ("ke-N dari M" saat Replace satu-per-satu),
 * pemilih cakupan Seleksi/Dokumen, tombol Replace / Replace All / Tutup.
 *
 * Perbedaan terhadap modal (hanya ini):
 * - Bukan portal/overlay: dirender inline di sidebar sebagai
 *   `.fig-isec` dengan `data-testid="fr-section"`, header `.fig-isec-title`
 *   + tombol X `.fig-ibtn` (pola tombol ikon header seksi inspector).
 * - Tanpa usePresence (tidak ada animasi keluar-masuk) dan tanpa
 *   useModalFocus (TIDAK ADA focus trap — Tab mengalir normal; fokus
 *   TIDAK dicuri saat dibuka, tetap di tombol pemicu).
 * - Fokus kembali ke pemicu saat ditutup via handleCancel (Esc/Tutup/X),
 *   mengikuti perilaku modal (triggerRef + isConnected).
 * - Pratinjau dibuang saat seksi tertutup DARI JALUR APA PUN, termasuk
 *   toggle tombol pembuka (efek [open] di bawah) — modal tidak punya
 *   jalur tutup-tanpa-handleCancel, seksi punya (toggle).
 *
 * Semantik pratinjau (keputusan yang didokumentasikan — plan Step 3,
 * dipindah verbatim dari modal):
 * - Pratinjau live saat To/From berubah = HANYA kecocokan pertama yang
 *   tersisa (opts.limit: 1). Klik Replace = commit pratinjau itu saja
 *   (satu langkah Undo per klik), lalu pratinjau maju ke kecocokan
 *   berikutnya ("ke-N dari M" naik).
 * - Hover tombol Replace All = pratinjau SEMUA kecocokan; klik Replace All
 *   = commit semuanya (satu langkah Undo).
 * - Cancel/Esc/Tutup = buang pratinjau (kembalikan doc dasar), tanpa
 *   history. Esc hanya aktif saat seksi terbuka DAN overlay edit teks
 *   tertutup DAN tidak ada dropdown/popover (.flt) — Ruling J.
 * Pratinjau memakai live() langsung (bukan livePaint) supaya doc dasar
 * bisa dihitung ulang dari snapshot saat seksi dibuka: doc yang sedang
 * dipratinjau tidak boleh menjadi dasar hitungan berikutnya. Commit memakai
 * commitPaint(null, key) — commit doc yang sedang dipratinjau apa adanya
 * (fn limit:1 TIDAK boleh dijalankan ulang saat commit: sesudah pratinjau,
 * "kecocokan pertama yang tersisa" sudah bergeser ke berikutnya).
 * Kunci history unik per klik (fr-one:N / fr-all:N) supaya klik Replace
 * beruntun tidak ter-coalescing menjadi satu langkah Undo.
 *
 * Fix wave (final review Important 1): snapshot doc dasar diambil dari
 * prop committedDoc (entri riwayat terakhir di VectorEditor), BUKAN dari
 * prop doc yang live — pratinjau live seksi lain (via live() + RAF setDocS)
 * tidak boleh menjadi base seksi ini, kalau tidak Esc/X dengan kedua seksi
 * terbuka menghidupkan kembali pratinjau yang sudah dibatalkan.
 */
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Ico } from '../ui/IconGlyphs.tsx';
import { Seg } from '../ui/SegmentedControl.tsx';
import { ColorField } from '../ui/ColorPickerField.tsx';
import { ColorText } from '../ui/ColorHexInput.tsx';
import { parseColorWithAlpha } from '../../utils/colorParserAndFormatter.tsx';
import { collectDocumentColors } from '../../engine/colorWalk.tsx';
import { findReplaceColor, countMatches, unlinkedObjectIds } from '../../engine/findReplaceColor.tsx';

const FindReplaceSection = ({
  open,
  onClose,
  committedDoc,
  selIds,
  onPreviewDoc,
  onCommitPreview,
  say,
  L,
  onRecentColor
}) => {
  const baseRef = useRef(null);
  const selIdsRef = useRef(new Set());
  const stepRef = useRef(0);
  const triggerRef = useRef(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('#ea580c');
  const [scope, setScope] = useState('document');
  const [replaced, setReplaced] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [previewAll, setPreviewAll] = useState(false);

  const scopeObj = () => (scope === 'selection' ? { kind: 'selection', ids: selIdsRef.current } : { kind: 'all' });
  const scopeObjFor = sc => (sc === 'selection' ? { kind: 'selection', ids: selIdsRef.current } : { kind: 'all' });
  /* Total (M) adalah jumlah cocok pada doc dasar SAAT From/cakupan berubah
     — BUKAN sisa yang dihitung ulang tiap pratinjau (doc dasar maju tiap
     Replace, jadi hitung-ulang akan menyusutkan M: 42 -> 41 -> 40). */
  const recomputeTotal = (nextFrom, nextScope) => {
    const base = baseRef.current;
    if (!base || !nextFrom || nextFrom === 'none') {
      setTotal(0);
      return;
    }
    try {
      setTotal(countMatches(base, nextFrom, scopeObjFor(nextScope)));
    } catch (e) {
      setTotal(0);
    }
  };

  /* Snapshot doc + seleksi saat seksi dibuka; From default = warna
     terbanyak dalam cakupan. useLayoutEffect supaya render pertama sudah
     membawa From yang benar (tidak ada kilas From kosong). Tangkap juga
     pemicu yang membuka seksi (fokus dikembalikan ke sana saat tutup). */
  useLayoutEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const base = committedDoc || { objects: [] };
    baseRef.current = base;
    selIdsRef.current = selIds instanceof Set ? new Set(selIds) : new Set();
    setReplaced(0);
    setPreviewAll(false);
    setError(null);
    const sc = selIdsRef.current.size > 0 ? 'selection' : 'document';
    setScope(sc);
    const entries = collectDocumentColors(base, sc === 'selection' ? { kind: 'selection', ids: selIdsRef.current } : { kind: 'all' });
    const top = entries.slice().sort((a, b) => b.count - a.count)[0];
    setFrom(top ? top.hex : '');
    setTo('#ea580c');
    if (top) recomputeTotal(top.hex, sc);
    else setTotal(0);
  }, [open]);

  /* Pratinjau live dari doc dasar (BUKAN dari doc yang sedang dipratinjau).
     onPreviewDoc/onCommitPreview sengaja tidak masuk deps: keduanya membaca
     docRef.current secara sinkron di VectorEditor, identitasnya berubah
     tiap render tanpa mengubah perilaku. */
  useEffect(() => {
    if (!open) return;
    const base = baseRef.current;
    if (!base) return;
    if (!from) {
      setError(null);
      onPreviewDoc(base);
      return;
    }
    if (from === 'none') {
      setError(L.frFromNoneError);
      onPreviewDoc(base);
      return;
    }
    /* Fix wave F7: From == To (ternormalisasi, case-insensitive) — tombol
       Replace men-disable via !!error dan hint tampil di slot fr-error.
       From kosong dan 'none' sudah ditangani cabang di atas. */
    if (to && to !== 'none' && from.toLowerCase() === to.toLowerCase()) {
      setError(L.frSameColor);
      onPreviewDoc(base);
      return;
    }
    setError(null);
    let t = 0;
    try {
      t = countMatches(base, from, scopeObj());
    } catch (e) {
      t = 0;
    }
    if (t === 0) {
      onPreviewDoc(base);
      return;
    }
    let res;
    try {
      res = findReplaceColor(base, from, to, scopeObj(), previewAll ? {} : { limit: 1 });
    } catch (e) {
      if (e && e.message === 'from-none-not-supported') {
        setError(L.frFromNoneError);
        onPreviewDoc(base);
        return;
      }
      throw e;
    }
    onPreviewDoc(res.doc);
  }, [open, from, to, scope, replaced, previewAll]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Buang pratinjau saat seksi tertutup dari jalur apa pun — termasuk
     toggle tombol pembuka di inspector (yang memanggil onClose langsung
     tanpa handleCancel). Kembalikan doc dasar (doc hasil commit terakhir
     bila ada Replace yang sudah di-commit — baseRef dimajukan tiap
     commit, jadi pekerjaan yang sudah di-commit TIDAK hilang). Idempotent
     dengan handleCancel di bawah (doc dasar yang sama). */
  useEffect(() => {
    if (open) return;
    if (baseRef.current) onPreviewDoc(baseRef.current);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = () => {
    if (baseRef.current) onPreviewDoc(baseRef.current);
    onClose();
    const t = triggerRef.current;
    if (t && t.isConnected) t.focus();
  };

  /* Esc (Ruling J): hanya saat seksi terbuka DAN overlay edit teks
     tertutup DAN tidak ada dropdown/popover (.flt — termasuk popover
     ColorField). Capture + stopPropagation supaya handler keydown
     VectorEditor (deselect) tidak ikut jalan — seleksi tetap utuh. */
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-testid="text-edit-overlay"]')) return;
      if (document.querySelector('.flt:not(.out)')) return;
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizePicked = v => {
    const p = parseColorWithAlpha(v);
    return p.isNone ? 'none' : p.hex;
  };

  const doReplaceOne = () => {
    const base = baseRef.current;
    if (!base || !from || from === 'none' || total === 0 || replaced >= total) return;
    const res = findReplaceColor(base, from, to, scopeObj(), { limit: 1 });
    if (res.changed === 0) return;
    onPreviewDoc(res.doc);
    onCommitPreview('fr-one:' + ++stepRef.current);
    const unlinkedIds = unlinkedObjectIds(base, res.doc);
    baseRef.current = res.doc;
    setReplaced(r => r + 1);
    if (unlinkedIds.length) say(L.frUnlinked.replace('{n}', String(unlinkedIds.length)));
    if (to !== 'none' && onRecentColor) onRecentColor(to);
  };

  const doReplaceAll = () => {
    const base = baseRef.current;
    if (!base || !from || from === 'none' || total === 0) return;
    const res = findReplaceColor(base, from, to, scopeObj());
    if (res.changed === 0) return;
    onPreviewDoc(res.doc);
    onCommitPreview('fr-all:' + ++stepRef.current);
    const unlinkedIds = unlinkedObjectIds(base, res.doc);
    baseRef.current = res.doc;
    setReplaced(total);
    /* Toast: bila ada yang ter-unlink, toast unlink-lah yang tampil
       (keputusan 2B mewajibkannya); bila tidak, toast jumlah yang diganti.
       Dua say() beruntun akan saling menimpa — jadi hanya satu yang
       dikirim. */
    if (unlinkedIds.length) say(L.frUnlinked.replace('{n}', String(unlinkedIds.length)));
    else say(L.frReplaced.replace('{n}', String(res.changed)));
    if (to !== 'none' && onRecentColor) onRecentColor(to);
  };

  if (!open) return null;
  const done = total > 0 && replaced >= total;
  const countLabel = error
    ? ''
    : total === 0
      ? L.frNoMatch
      : done
        ? L.frDone
        : replaced > 0
          ? L.frOneOf.replace('{n}', String(replaced + 1)).replace('{m}', String(total))
          : L.frMatches.replace('{n}', String(total));
  return <div className="fig-isec fade" data-testid="fr-section"><div className="fig-isec-title"><span>{L.frTitle}</span><button type="button" className="fig-ibtn" onClick={handleCancel} aria-label={L.frClose} data-testid="fr-close" data-tip="frClose"><Ico n="x" size={14} /></button></div><div className="space-y-3"><div><div className="fig-sub-lbl">{L.frFrom}</div><div className="flex items-center gap-2"><ColorField L={L} tip="frFrom" value={from || '#2563eb'} on={v => {
            const nf = normalizePicked(v);
            setFrom(nf);
            setReplaced(0);
            recomputeTotal(nf, scope);
          }} /><ColorText L={L} value={from || ''} onChange={() => setError(null)} on={v => {
            const nf = normalizePicked(v);
            setFrom(nf);
            setReplaced(0);
            recomputeTotal(nf, scope);
          }} /></div></div><div><div className="fig-sub-lbl">{L.frTo}</div><div className="flex items-center gap-2"><ColorField L={L} tip="frTo" value={to} on={v => {
            setTo(normalizePicked(v));
          }} /><ColorText L={L} value={to} onChange={() => setError(null)} on={v => {
            setTo(normalizePicked(v));
          }} /><button type="button" className={'ved-pill text-[10px]' + (to === 'none' ? ' on' : '')} style={{
            padding: '4px 8px'
          }} data-testid="fr-to-none" data-tip="frToNone" aria-pressed={to === 'none'} onClick={() => setTo(to === 'none' ? '#ea580c' : 'none')}>{L.frToNone}</button></div></div><div><div className="fig-sub-lbl">{L.frScope}</div><Seg o={[['document', L.frScopeDoc], ['selection', L.frScopeSel]]} v={scope} on={v => {
          setScope(v);
          setReplaced(0);
          recomputeTotal(from, v);
        }} tip="frScope" /></div><div className="flex items-center justify-between gap-2"><span className="text-[11px] mut" data-testid="fr-count">{countLabel}</span>{error && <span className="text-[11px] font-medium" data-testid="fr-error" style={{ color: 'var(--danger, #dc2626)' }}>{error}</span>}</div><div className="flex gap-2 pt-1"><button type="button" className="btn sec text-xs" data-testid="fr-tutup" onClick={handleCancel}>{L.frClose}</button><button type="button" className="btn sec flex-1 text-xs" data-testid="fr-replace-all" data-tip="frReplaceAll" disabled={total === 0 || !!error} onMouseEnter={() => setPreviewAll(true)} onMouseLeave={() => setPreviewAll(false)} onClick={doReplaceAll}>{L.frReplaceAll}</button><button type="button" className="btn pri flex-1 text-xs" data-testid="fr-replace" data-tip="frReplace" disabled={total === 0 || done || !!error} onClick={doReplaceOne}>{L.frReplace}</button></div></div></div>;
};

export { FindReplaceSection };
export default FindReplaceSection;
