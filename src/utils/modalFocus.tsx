/**
 * @file src/utils/modalFocus.tsx
 * @description Pola fokus modal (Task 9, B-F5; spek §3 + §4):
 * fokus masuk ke kontrol pertama saat modal dibuka, Tab/Shift+Tab
 * ter-trap di dalam dialog, dan fokus kembali ke elemen pemicu saat
 * modal ditutup (Esc/X/Tutup/Apply).
 *
 * Keputusan yang didokumentasikan:
 * - Trap memakai listener keydown window fase capture (seperti handler
 *   Esc Ruling J), BUKAN onKeyDown React pada dialog: CustomTextBox
 *   memanggil e.stopPropagation() untuk semua keydown, sehingga handler
 *   bubble React tidak akan melihat Tab dari dalam textbox.
 * - Semua pengecekan memakai DOM (dialogRef.current.contains(...),
 *   document.querySelector('.flt')) — BUKAN state React (lesson 28).
 * - Trap diam bila fokus berada di dalam popover ColorField (.flt,
 *   portal ke document.body di luar dialog): popover itu interaktif
 *   sendiri; menarik fokus keluar darinya akan merusak pemakaian popover.
 *   (Tab dari dalam popover tetap bisa keluar modal — perilaku popover
 *   yang sudah ada, di luar scope task ini.)
 * - Fokus kembali ke pemicu berjalan saat `open` berubah true -> false
 *   (segera, bukan sesudah animasi leave 200 ms usePresence), supaya
 *   fokus tidak tertinggal di dialog yang sedang menutup.
 * - Hook ini TIDAK menyentuh Esc: semantik Esc membatalkan pratinjau
 *   tetap milik handler Esc masing-masing modal (Ruling J).
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE_SEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Elemen yang bisa difokuskan via Tab (urutan DOM), mengabaikan yang
   disabled / tersembunyi (display:none tak punya client rect). */
const getModalFocusable = root => {
  if (!root) return [];
  return [...root.querySelectorAll(FOCUSABLE_SEL)].filter(el => el.getClientRects().length > 0);
};

/* `open` = prop pembuka modal; `mounted` = flag mount usePresence (m);
   `dialogRef` = ref ke elemen [role="dialog"]; `firstSelector` = selektor
   kontrol pertama di dalam dialog (bila kosong / tak ketemu, elemen
   focusable pertama dalam urutan DOM). */
const useModalFocus = (open, mounted, dialogRef, firstSelector) => {
  const triggerRef = useRef(null);

  /* Catat pemicu saat dibuka; kembalikan fokus ke pemicu saat ditutup.
     Dijalankan saat `open` berubah — BUKAN saat `mounted` berubah, supaya
     fokus kembali segera (animasi leave usePresence masih 200 ms). */
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      return;
    }
    const t = triggerRef.current;
    triggerRef.current = null;
    if (t && t.isConnected) t.focus();
  }, [open]);

  /* Fokus ke kontrol pertama sesudah dialog ter-mount di DOM (mounted
     true). usePresence baru me-mount dialog satu render sesudah `open`
     true, jadi efek ini bergantung pada `mounted`, bukan `open`. */
  useEffect(() => {
    if (!mounted) return;
    const dlg = dialogRef.current;
    if (!dlg) return;
    const items = getModalFocusable(dlg);
    if (items.length === 0) return;
    const target = firstSelector ? dlg.querySelector(firstSelector) : null;
    const el = target && items.includes(target) ? target : items[0];
    el.focus();
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Trap Tab/Shift+Tab selama modal terbuka. Capture di window supaya
     Tab dari dalam CustomTextBox (stopPropagation di bubble) tetap
     terlihat. */
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (e.key !== 'Tab') return;
      const dlg = dialogRef.current;
      if (!dlg) return;
      const flt = document.querySelector('.flt');
      if (flt && flt.contains(document.activeElement)) return;
      const items = getModalFocusable(dlg);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (dlg.contains(document.activeElement)) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      /* Fokus di luar dialog (mis. jatuh ke body sesudah klik area
         non-fokus dialog): tarik kembali ke kontrol pertama. */
      e.preventDefault();
      first.focus();
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
};

export { useModalFocus, getModalFocusable };
export default useModalFocus;
