/**
 * @file src/components/editor/RecolorSection.tsx
 * @description Seksi sidebar Recolor (Task 8, memakai ulang pola seksi
 * Task 7 dari FindReplaceSection.tsx — BUKAN pola kedua). Dipindah
 * verbatim dari RecolorModal (dihapus): Tab Mode 1 (Geser Hue) /
 * Mode 2 (Palette Mapping), pratinjau live dari snapshot doc dasar,
 * Apply = commit satu langkah + tutup seksi, Cancel/Esc/Tutup = buang
 * pratinjau.
 *
 * Perbedaan terhadap modal (hanya ini):
 * - Bukan portal/overlay: dirender inline di sidebar sebagai
 *   `.fig-isec` dengan `data-testid="rc-section"`, header `.fig-isec-title`
 *   + tombol X `.fig-ibtn` (pola tombol ikon header seksi inspector).
 * - Tanpa usePresence (tidak ada animasi keluar-masuk) dan tanpa
 *   useModalFocus (TIDAK ADA focus trap — Tab mengalir normal; fokus
 *   TIDAK dicuri saat dibuka, tetap di tombol pemicu).
 * - Fokus kembali ke pemicu saat ditutup via handleCancel (Esc/Tutup/X),
 *   mengikuti perilaku modal (triggerRef + isConnected).
 * - Pratinjau dibuang saat seksi tertutup DARI JALUR APA PUN, termasuk
 *   toggle tombol pembuka (efek [open] di bawah) — modal tidak punya
 *   jalur tutup-tanpa-handleCancel, seksi punya (toggle).
 * - doApply memajukan baseRef ke doc hasil Apply SEBELUM onClose()
 *   (adaptasi WAJIB pola seksi, bukan perubahan logika): efek
 *   buang-pratinjau [open] berjalan sesudah Apply menutup seksi; tanpa
 *   pemajuan ini efek itu akan mengembalikan doc dasar PRA-Apply dan
 *   menimpa commit yang baru saja dilakukan (live() menulis
 *   docRef.current). Pola yang sama dengan doReplaceOne/doReplaceAll
 *   FindReplaceSection (baseRef dimajukan tiap commit). Semantik
 *   terjaga: doc ter-commit menjadi dasar baru; Cancel berikutnya
 *   mengembalikan doc pasca-Apply (benar — Apply sudah ter-commit,
 *   jalan kembali adalah Ctrl+Z, seperti komentar modal).
 *
 * Semantik pratinjau (keputusan yang didokumentasikan — plan Step 4 +
 * pelajaran Task 5, dipindah verbatim dari modal):
 * - Pratinjau live dari doc dasar (BUKAN dari doc yang sedang dipratinjau):
 *   setiap perubahan kontrol menjalankan shiftHueDoc / paletteMapDoc
 *   atas baseRef dan hasilnya diterapkan via live() (onPreviewDoc).
 * - Mode 1 dengan parameter identitas (delta 0, sat x1, light x1) TIDAK
 *   memanggil shiftHueDoc: round-trip HSL 8-bit bisa menggeser hex 1 LSB
 *   sehingga "tidak ada perubahan" akan terhitung berubah. Guard ini
 *   ada di UI (bukan engine — engine Task 6 sudah direview).
 * - Apply = onPreviewDoc(preview) lalu commitPaint(null, key) — commit
 *   doc yang sedang dipratinjau apa adanya (pola Task 5). Kunci history
 *   unik per klik (recolor:mode1:N / recolor:mode2:N, stepRef naik)
 *   supaya dua Apply beruntun tidak ter-coalescing menjadi satu langkah
 *   Undo (push coalescing <900ms, kunci sama).
 * - Apply MENUTUP seksi (berbeda dengan Find & Replace yang tetap
 *   terbuka untuk Replace satu-per-satu): daftar keluarga dihitung dari
 *   doc dasar saat dibuka — sesudah Apply, keluarga itu sudah tidak ada
 *   di doc baru, jadi seksi dibuka ulang untuk sesi berikutnya. Efek
 *   samping yang bagus: Ctrl+Z langsung berfungsi sesudah Apply (Undo
 *   mati saat modal terbuka — guard pra-ada di onKd).
 * - Cancel/Esc/Tutup = kembalikan doc dasar, tanpa history. Esc hanya
 *   aktif saat seksi terbuka DAN overlay edit teks tertutup DAN tidak ada
 *   dropdown/popover (.flt) — Ruling J.
 * - TIDAK ada tombol "Simpan sebagai style" (di luar spec yang disetujui).
 * - Fix wave (final review Important 1): snapshot doc dasar diambil dari
 *   prop committedDoc (entri riwayat terakhir di VectorEditor), BUKAN dari
 *   prop doc yang live — sama seperti FindReplaceSection; kedua seksi
 *   berbagi satu base bersih sehingga discard idempotent dan tidak
 *   bergantung urutan tutup.
 * - Mode 2 TIDAK menawarkan kontrol target untuk keluarga gray
 *   (Ruling O / minor Task 6: familyTargets gray akan menintai abu-abu
 *   biru secara diam-diam). Override per warna TETAP bisa mengubah gray
 *   (pemetaan penuh, sesuai spec engine).
 * - Empty state (Task 12, B-F6): bila 0 warna dalam cakupan, area kontrol
 *   Mode 1/Mode 2 (termasuk seg mode + seg cakupan) disembunyikan dan
 *   diganti teks "Dokumen ini belum memiliki warna…" + Terapkan disabled.
 *   Bukan error (tidak memakai peran alert, tanpa --danger). Seg/Range/Slider
 *   tidak punya prop disabled — menyembunyikan adalah cara jujur yang
 *   setara (wrapper pointer-events:none akan palsu: keyboard tetap bisa
 *   mengaktifkan). Fokus pertama jatuh ke tombol X (fallback hook T9)
 *   — di seksi: fokus TETAP di pemicu (tidak ada focus trap).
 * - Toast Apply: satu say() saja (dua say() beruntun saling menimpa;
 *   pola regex TOAST_EN berjangkar ^…$). Bila ada yang ter-unlink,
 *   pesannya gabungan "{n} warna diubah, {m} objek dilepas dari style"
 *   dengan pola TOAST_PATTERNS sendiri; bila tidak, "{n} warna diubah".
 *   Jumlah objek dilepas dihitung BERBEDA via unlinkedObjectIds (Ruling K).
 */
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Ico } from '../ui/IconGlyphs.tsx';
import { Seg } from '../ui/SegmentedControl.tsx';
import { Range } from '../ui/RangeField.tsx';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';
import { ColorField } from '../ui/ColorPickerField.tsx';
import { ColorText } from '../ui/ColorHexInput.tsx';
import { parseColorWithAlpha } from '../../utils/colorParserAndFormatter.tsx';
import { clampN, hex2hsl, hsl2hex } from '../../utils/colorMath.tsx';
import { collectDocumentColors } from '../../engine/colorWalk.tsx';
import { hueFamilyGroup, shiftHueDoc, paletteMapDoc, familyOfHex } from '../../engine/recolorEngine.tsx';
import { unlinkedObjectIds } from '../../engine/findReplaceColor.tsx';

/* Task 12 (B-F6): teks empty state verbatim per brief (elipsis U+2026).
   Hardcode ID seperti HEX_ERR Task 7 — i18n follow-up, bukan task ini. */
const RC_EMPTY_DOC = 'Dokumen ini belum memiliki warna…';

const RecolorSection = ({
  open,
  onClose,
  committedDoc,
  selIds,
  onPreviewDoc,
  onCommitPreview,
  say,
  L
}) => {
  const baseRef = useRef(null);
  const selIdsRef = useRef(new Set());
  const stepRef = useRef(0);
  const previewRef = useRef(null);
  const lastResRef = useRef(null);
  const triggerRef = useRef(null);
  const [mode, setMode] = useState('mode1');
  const [deltaHue, setDeltaHue] = useState(0);
  const [satMul, setSatMul] = useState(1);
  const [lightMul, setLightMul] = useState(1);
  const [hueMin, setHueMin] = useState(190);
  const [hueMax, setHueMax] = useState(260);
  const [scope, setScope] = useState('document');
  const [familyTargets, setFamilyTargets] = useState({});
  const [overrides, setOverrides] = useState({});
  const [overrideFor, setOverrideFor] = useState(null);
  const [families, setFamilies] = useState([]);
  const [changed, setChanged] = useState(0);

  const scopeObj = () => (scope === 'selection' ? { kind: 'selection', ids: selIdsRef.current } : { kind: 'all' });
  const scopeObjFor = sc => (sc === 'selection' ? { kind: 'selection', ids: selIdsRef.current } : { kind: 'all' });
  const computeFamilies = (sc: any, base: any = null) => {
    const b = base || baseRef.current;
    if (!b) { setFamilies([]); return; }
    setFamilies(hueFamilyGroup(collectDocumentColors(b, scopeObjFor(sc))));
  };

  /* Snapshot doc + seleksi saat seksi dibuka; kontrol kembali ke default.
     useLayoutEffect supaya render pertama sudah membawa keluarga yang benar.
     Tangkap juga pemicu yang membuka seksi (fokus dikembalikan ke sana
     saat tutup). */
  useLayoutEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const base = committedDoc || { objects: [] };
    baseRef.current = base;
    selIdsRef.current = selIds instanceof Set ? new Set(selIds) : new Set();
    setMode('mode1');
    setDeltaHue(0);
    setSatMul(1);
    setLightMul(1);
    setHueMin(190);
    setHueMax(260);
    setFamilyTargets({});
    setOverrides({});
    setOverrideFor(null);
    setChanged(0);
    const sc = selIdsRef.current.size > 0 ? 'selection' : 'document';
    setScope(sc);
    computeFamilies(sc, base);
  }, [open]);

  /* Pratinjau live dari doc dasar (BUKAN dari doc yang sedang dipratinjau).
     onPreviewDoc/onCommitPreview sengaja tidak masuk deps: keduanya membaca
     docRef.current secara sinkron di VectorEditor. */
  useEffect(() => {
    if (!open) return;
    const base = baseRef.current;
    if (!base) return;
    let res;
    if (mode === 'mode1') {
      if (deltaHue === 0 && satMul === 1 && lightMul === 1) {
        res = { doc: base, changed: 0, unlinked: 0 };
      } else {
        res = shiftHueDoc(base, { deltaHue, satMul, lightMul, hueRange: [hueMin, hueMax], scope: scopeObj() });
      }
    } else {
      res = paletteMapDoc(base, { familyTargets, overrides, scope: scopeObj() });
    }
    lastResRef.current = res;
    previewRef.current = res.doc;
    setChanged(res.changed);
    onPreviewDoc(res.doc);
  }, [open, mode, deltaHue, satMul, lightMul, hueMin, hueMax, scope, familyTargets, overrides]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Buang pratinjau saat seksi tertutup dari jalur apa pun — termasuk
     toggle tombol pembuka di inspector (yang memanggil onClose langsung
     tanpa handleCancel). Kembalikan doc dasar (doc hasil commit terakhir
     bila ada Apply yang sudah dilakukan — baseRef dimajukan di doApply,
     jadi pekerjaan yang sudah di-commit TIDAK hilang). Idempotent dengan
     handleCancel di bawah (doc dasar yang sama). */
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
    return p.isNone ? null : p.hex;
  };
  const setTarget = (family, v) => {
    const h = normalizePicked(v);
    if (!h) return;
    setFamilyTargets(prev => ({ ...prev, [family]: h }));
  };
  const clearTarget = family => {
    setFamilyTargets(prev => {
      const next = { ...prev };
      delete next[family];
      return next;
    });
  };
  const setOverride = (hex, v) => {
    const h = normalizePicked(v);
    if (!h) return;
    setOverrides(prev => ({ ...prev, [hex.toLowerCase()]: h }));
  };
  const clearOverride = hex => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[hex.toLowerCase()];
      return next;
    });
    setOverrideFor(null);
  };
  /* Hex hasil pemetaan untuk satu warna (khusus tampilan daftar
     asal -> hasil): override dulu, lalu target keluarga (hue target +
     S/L asal — rumus yang sama dengan paletteMapDoc). */
  const mappedHexFor = hex => {
    const low = hex.toLowerCase();
    if (overrides[low]) return overrides[low];
    const fam = familyOfHex(hex);
    const t = familyTargets[fam];
    if (!t) return hex;
    const [, s, l] = hex2hsl(hex);
    return hsl2hex(hex2hsl(t)[0], s, l);
  };

  const handleScope = v => {
    setScope(v);
    computeFamilies(v);
    /* Fix wave F9: editor override menutup saat cakupan diganti — nilainya
       tetap tersimpan (dan tetap diterapkan saat Apply), hanya tampilannya
       yang ditutup karena warnanya bisa tak lagi masuk cakupan baru. */
    setOverrideFor(null);
  };

  const doApply = () => {
    const prev = previewRef.current;
    const res = lastResRef.current;
    if (!prev || !res || res.changed === 0) return;
    onPreviewDoc(prev);
    onCommitPreview('recolor:' + (mode === 'mode1' ? 'mode1:' : 'mode2:') + ++stepRef.current);
    const unlinkedIds = unlinkedObjectIds(baseRef.current, prev);
    if (unlinkedIds.length) say(L.rcChangedUnlinked.replace('{n}', String(res.changed)).replace('{m}', String(unlinkedIds.length)));
    else say(L.rcChanged.replace('{n}', String(res.changed)));
    /* Majukan doc dasar ke doc hasil Apply SEBELUM onClose(): efek
       buang-pratinjau [open] berjalan sesudah seksi tertutup dan akan
       memanggil onPreviewDoc(baseRef.current) — tanpa pemajuan ini ia
       mengembalikan doc PRA-Apply dan menimpa commit barusan. */
    baseRef.current = prev;
    onClose();
  };

  if (!open) return null;
  /* Task 12 (B-F6): 0 warna dalam cakupan (dokumen kosong, atau seleksi
     tanpa warna) -> empty state; kontrol mode disembunyikan. families
     dihitung dari cakupan aktif, jadi sinyal ini scope-aware. */
  const isEmpty = families.length === 0;
  const countLabel = changed > 0 ? L.rcMatches.replace('{n}', String(changed)) : L.rcNoChange;
  return <div className="fig-isec fade" data-testid="rc-section"><div className="fig-isec-title"><span>{L.rcTitle}</span><button type="button" className="fig-ibtn" onClick={handleCancel} aria-label={L.frClose} data-testid="rc-close" data-tip="rcClose"><Ico n="x" size={14} /></button></div><div className="space-y-3">{isEmpty ? <div data-testid="rc-empty-state" className="text-[11px] mut">{RC_EMPTY_DOC}</div> : <><div data-testid="rc-mode-seg"><Seg cls="vert" o={[['mode1', L.rcTabMode1], ['mode2', L.rcTabMode2]]} v={mode} on={setMode} tip="rcMode" tips={{ mode1: 'rcTabMode1', mode2: 'rcTabMode2' }} /></div><div data-testid="rc-scope-seg"><Seg o={[['document', L.frScopeDoc], ['selection', L.frScopeSel]]} v={scope} on={handleScope} tip="rcScope" /></div>{mode === 'mode1' ? <div className="space-y-3"><div data-testid="rc-hue"><Range l={L.rcHue} v={deltaHue} min={-180} max={180} step={1} on={v => setDeltaHue(v)} tip="rcHue" f={v => (v > 0 ? '+' : '') + v + '°'} /></div><div data-testid="rc-sat"><Range l={L.rcSat} v={satMul} min={0} max={2} step={0.05} on={v => setSatMul(v)} tip="rcSat" f={v => '×' + v} /></div><div data-testid="rc-light"><Range l={L.rcLight} v={lightMul} min={0} max={2} step={0.05} on={v => setLightMul(v)} tip="rcLight" f={v => '×' + v} /></div><div><div className="fig-sub-lbl" data-tip="rcHueRange">{L.rcHueRange}</div><div className="flex items-center gap-2"><div className="fld flex items-center px-1.5 py-1" style={{ flex: 1, height: 30 }} data-testid="rc-range-min"><CustomTextBox cls="ctr" value={String(hueMin)} ariaLabel={L.rcHueRangeMin} filterRe={/[^0-9]/g} onCommit={v => { const n = parseInt(v, 10); if (Number.isFinite(n)) setHueMin(clampN(n, 0, 360)); }} /></div><span className="text-[11px] mut">–</span><div className="fld flex items-center px-1.5 py-1" style={{ flex: 1, height: 30 }} data-testid="rc-range-max"><CustomTextBox cls="ctr" value={String(hueMax)} ariaLabel={L.rcHueRangeMax} filterRe={/[^0-9]/g} onCommit={v => { const n = parseInt(v, 10); if (Number.isFinite(n)) setHueMax(clampN(n, 0, 360)); }} /></div></div><div className="text-[11px] mut mt-1">{L.rcHueRangeHint}</div></div></div> : <div className="space-y-3">{families.map(g => <div key={g.family} className="space-y-1.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{L['rcFamily_' + g.family] || g.family}</span><span className="text-[11px] mut">{L.rcFamilyColors.replace('{n}', String(g.colors.length))}</span></div><div className="flex flex-wrap items-center gap-1.5">{g.colors.map(e => <span key={e.hex} className="flex items-center gap-1"><button type="button" className={'swatch' + (overrideFor === e.hex ? ' open' : '')} style={{ background: e.hex, width: 22, height: 22 }} data-testid={`rc-family-${g.family}-color-${e.hex.slice(1).toLowerCase()}`} data-tip="rcOverride" aria-label={e.hex} title={e.hex + ' × ' + e.count} onClick={() => setOverrideFor(overrideFor === e.hex ? null : e.hex)} /><span className="text-[11px] mut">→</span><span className="swatch" style={{ background: mappedHexFor(e.hex), width: 22, height: 22 }} title={mappedHexFor(e.hex)} /></span>)}</div>{g.family === 'gray' ? <div className="text-[11px] mut">{L.rcGrayNote}</div> : familyTargets[g.family] ? <div className="flex items-center gap-2" data-testid={`rc-family-${g.family}`}><span className="text-[11px] mut">{L.rcSetTarget}</span><ColorField L={L} tip="rcFamilyTarget" value={familyTargets[g.family]} on={v => setTarget(g.family, v)} /><ColorText L={L} value={familyTargets[g.family]} on={v => setTarget(g.family, v)} /><button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-testid={`rc-family-${g.family}-clear`} data-tip="rcClearTarget" aria-label={L.rcClearTarget} onClick={() => clearTarget(g.family)}>×</button></div> : <button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-testid={`rc-family-${g.family}-add`} data-tip="rcSetTarget" onClick={() => { const top = [...g.colors].sort((a, b) => b.count - a.count)[0]; if (top) setTarget(g.family, top.hex); }}>{L.rcSetTarget}</button>}{overrideFor && familyOfHex(overrideFor) === g.family ? <div className="flex items-center gap-2 pt-1" data-testid={`rc-override-${overrideFor.slice(1).toLowerCase()}`}><span className="text-[11px] mut">{L.rcOverride} {overrideFor}</span><ColorField L={L} tip="rcOverride" value={overrides[overrideFor.toLowerCase()] || overrideFor} on={v => setOverride(overrideFor, v)} /><ColorText L={L} value={overrides[overrideFor.toLowerCase()] || overrideFor} on={v => setOverride(overrideFor, v)} /><button type="button" className="ved-pill text-[10px]" style={{ padding: '2px 6px' }} data-tip="rcRemoveOverride" aria-label={L.rcRemoveOverride} onClick={() => clearOverride(overrideFor)}>×</button></div> : null}</div>)}</div>}</>}<div className="flex items-center justify-between gap-2"><span className="text-[11px] mut" data-testid="rc-count">{countLabel}</span></div><div className="flex gap-2 pt-1"><button type="button" className="btn pri flex-1 text-xs" data-testid="rc-apply" data-tip="rcApply" disabled={isEmpty || changed === 0} onClick={doApply}>{L.rcApply}</button><button type="button" className="btn sec text-xs" data-testid="rc-tutup" onClick={handleCancel}>{L.frClose}</button></div></div></div>;
};

export { RecolorSection };
export default RecolorSection;
