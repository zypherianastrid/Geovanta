# Task 9 review package — diff backup .bak-r3t9 vs current

## 1) CustomTextBox.jsx (diff -U5)
--- src/components/ui/CustomTextBox.jsx.bak-r3t9	2026-11-14 23:03:04.174489182 +0000
+++ src/components/ui/CustomTextBox.jsx	2026-11-14 23:11:40.578511470 +0000
@@ -31,10 +31,40 @@
   const skipRef = useRef(false);
   const bufRef = useRef(String(value ?? ''));
   const bumpedRef = useRef(false);
   const justFocusedRef = useRef(false);
   const doneRef = useRef(false);
+  /* R3-T9 (F10): teks lebih panjang dari lebar root membuat caret akhir
+     jatuh di luar viewport root (overflow:hidden, tanpa scroll) sehingga
+     pengguna tak bisa melihat apa yang diketik. Geser scrollLeft root
+     agar caret selalu terlihat — mekanisme yang sama seperti input native
+     (scroll, bukan ubah lebar). Sisa <2px yang tak bisa di-scroll
+     (scrollWidth dibulatkan ke bawah sehingga scrollLeft mentok ~1px
+     sebelum caret sepenuhnya masuk) dikoreksi dengan translateX terukur
+     pada caret itu sendiri — nilai diukur tiap run, bukan konstanta
+     magic; caret tak pernah di-transform bila tidak meluber. Reset tiap
+     run agar pengukuran berikutnya bersih. Hanya saat editing. */
+  useEffect(() => {
+    if (!editing) return;
+    const root = ref.current;
+    if (!root) return;
+    const caretEl = root.querySelector('.c-caret');
+    if (!caretEl) return;
+    caretEl.style.transform = '';
+    const rR = root.getBoundingClientRect();
+    const cR = caretEl.getBoundingClientRect();
+    /* Margin 2px: scrollLeft dibulatkan browser, tanpa margin caret bisa
+       tersisa ~1px di luar tepi root. */
+    if (cR.right > rR.right) root.scrollLeft += cR.right - rR.right + 2;
+    else if (cR.left < rR.left) root.scrollLeft -= rR.left - cR.left + 2;
+    const rR2 = root.getBoundingClientRect();
+    const cR2 = caretEl.getBoundingClientRect();
+    const over = cR2.right - rR2.right;
+    const under = rR2.left - cR2.left;
+    if (over > 0) caretEl.style.transform = `translateX(${-Math.ceil(over)}px)`;
+    else if (under > 0) caretEl.style.transform = `translateX(${Math.ceil(under)}px)`;
+  }, [editing, buf, caret, selAll]);
   useEffect(() => {
     const s = String(value ?? '');
     if (!editing || bumpedRef.current) {
       bumpedRef.current = false;
       setBuf(s);
@@ -74,10 +104,11 @@
   const finishEdit = () => {
     if (!editing || doneRef.current) return;
     doneRef.current = true;
     setEditing(false);
     setSelAll(false);
+    if (ref.current) ref.current.scrollLeft = 0; /* R3-T9 (F10): reset scroll */
     if (skipRef.current) {
       skipRef.current = false;
       const s = String(value ?? '');
       setBuf(s);
       bufRef.current = s;

## 2) ColorPickerField.jsx (diff -U5)
--- src/components/ui/ColorPickerField.jsx.bak-r3t9	2026-11-14 23:03:04.178489490 +0000
+++ src/components/ui/ColorPickerField.jsx	2026-11-14 23:03:23.259490302 +0000
@@ -38,10 +38,17 @@
   const [open, setOpen] = useState(false);
   const [hsv, setHsv] = useState(() => hex2hsv(parsed.hex));
   const [alpha, setAlpha] = useState(effAlpha);
   const [hx, setHx] = useState(null);
   const [hexHint, setHexHint] = useState(null);
+  /* R3-T9 (F3): `typed` menerapkan warna ke dokumen begitu hex ke-6
+     lengkap (live, via onChange) — Esc/onCancel yang hanya mereset draft
+     `hx` tidak mengembalikan warna dokumen. Simpan warna pra-edit saat
+     sesi ketik hex dimulai (ref sinkron, bukan state `hx` yang bisa basi
+     di closure), dan kembalikan saat batal. */
+  const hexPrevRef = useRef(null);
+  const hexEditRef = useRef(false);
   const hexHintTimer = useRef(null);
   const [drg, setDrg] = useState(false);
   const cur = hsv2hex(hsv[0], hsv[1], hsv[2]);
   useEffect(() => {
     if (act.current) return;
@@ -171,20 +178,40 @@
     }
     setHexHint(null);
   };
   const typed = s => {
     clearHexHint();
+    if (!hexEditRef.current) {
+      hexEditRef.current = true;
+      hexPrevRef.current = { hex: cur, alpha, isNone };
+    }
     const d = s.replace(/[^0-9a-f]/gi, '').slice(0, 6);
     setHx(d);
     if (d.length === 6) {
       const n = '#' + d.toLowerCase();
       const nextA = alpha <= 0 ? 1 : alpha;
       setHsv(hex2hsv(n));
       setAlpha(nextA);
       if (onOpacity) out(n);else out(formatColorWithAlpha(n, nextA));
     }
   };
+  /* R3-T9 (F3): batalkan edit hex — kembalikan warna pra-edit HANYA bila
+     sesi ketik sempat mengubah dokumen (hex/alpha berubah); bila hanya
+     ketik parsial tanpa emit, jangan kirim commit redundan ke parent. */
+  const cancelHex = () => {
+    setHx(null);
+    const prev = hexPrevRef.current;
+    hexPrevRef.current = null;
+    hexEditRef.current = false;
+    if (!prev) return;
+    if (!prev.isNone && prev.hex.toLowerCase() === cur.toLowerCase() && prev.alpha === alpha) return;
+    if (prev.isNone) { clearColor(); return; }
+    setHsv(hex2hsv(prev.hex));
+    setAlpha(prev.alpha);
+    if (onOpacity) out(prev.hex);
+    else out(formatColorWithAlpha(prev.hex, prev.alpha));
+  };
   const alphaPct = Math.round((isNone ? 0 : alpha) * 100);
   const previewCss = isNone || alpha <= 0 ? 'transparent' : formatColorWithAlpha(cur, alpha);
   const rgbStr = `${parseInt(cur.slice(1, 3), 16)}, ${parseInt(cur.slice(3, 5), 16)}, ${parseInt(cur.slice(5, 7), 16)}`;
   /* Task 11 (B-F4): tooltip swatch menampilkan nama field + nilai warna SAAT
      INI (live). Nama diambil dari katalog tooltip yang sama dengan data-tip
@@ -220,11 +247,13 @@
           flex: '1 1 0',
           minWidth: 0
         }} data-tip="cpHex"><span className="mut">#</span><CustomTextBox value={isNone ? 'NONE' : (hx !== null ? hx : cur.slice(1)).toUpperCase()} ariaLabel={LL.cpHexCode} filterRe={/[^0-9a-fA-F]/g} onFilterReject={showHexHint} maxLen={6} upper={true} onChange={typed} onCommit={v => {
             typed(v);
             setHx(null);
-          }} onCancel={() => setHx(null)} /></div><div className="fld hexf" style={{
+            hexEditRef.current = false;
+            hexPrevRef.current = null;
+          }} onCancel={cancelHex} /></div><div className="fld hexf" style={{
           width: 54,
           flex: 'none',
           padding: '0 6px'
         }} data-tip="veAlphaPct"><CustomTextBox value={String(alphaPct)} ariaLabel={LL.cpAlphaPct} filterRe={/[^0-9]/g} maxLen={3} onCommit={v => {
             const n = parseInt(v, 10);

## 3) tailwindOfflineBundle.jsx — diff vs .bak-r3t9 (harus KOSONG)
KOSONG — bundle tidak berubah

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t9-cinp.cjs (baru, probe 29 asersi)
- probes/shots/r3-t9-cinp-before.png, r3-t9-cinp-after.png (close-up kotak hex; laporan: identik byte-demi-byte)
