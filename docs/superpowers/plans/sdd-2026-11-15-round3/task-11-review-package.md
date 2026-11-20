# Task 11 review package — diff backup .bak-r3t11 vs current

## 1) SegmentedControl.jsx (diff -U5)
--- src/components/ui/SegmentedControl.jsx.bak-r3t11	2026-11-14 23:58:49.529645481 +0000
+++ src/components/ui/SegmentedControl.jsx	2026-11-15 00:00:52.242013584 +0000
@@ -21,17 +21,31 @@
       opacity: i < 0 ? 0 : 1
     }} />{o.map(([k, t, ic]) => <button key={k} data-tip={tips && tips[k] || undefined} className={v === k ? 'on' : ''} onClick={() => on(k)}>{ic && <Ico n={ic} size={cls && cls.includes('stk') ? 15 : 13} />}<span>{t}</span></button>)}</div>;
 };
 /* ---------- Tooltip kustom (delegasi event pada atribut data-tip) ---------- */
 
+/* GradChoice: opsi [k, label, ikon?] — ikon opsional (konvensi sama seperti
+   Seg). Prop fillWrap HANYA untuk instance Mode Fill: container jadi
+   flex-wrap + tiap tombol flex:1 1 auto (basis konten — membungkus ke baris
+   berikut bila tak muat, lalu tumbuh mengisi lebar tanpa sisa) + label nowrap.
+   Tanpa fillWrap dan tanpa ikon, perilaku default (grid + tanpa ikon) tidak
+   berubah — instance gradInterp & Spread Method tidak tersentuh. */
 const GradChoice = ({
   value,
   options,
   on,
   cols,
   tip,
-  tips
-}) => <div className="gch" data-tip={tip} style={{
+  tips,
+  fillWrap
+}) => <div className={'gch' + (fillWrap ? ' gch-fill' : '')} data-tip={tip} style={fillWrap ? {
+  display: 'flex',
+  flexWrap: 'wrap'
+} : {
   gridTemplateColumns: `repeat(${cols || options.length}, minmax(0, 1fr))`
-}}>{options.map(([k, label]) => <button key={k} type="button" data-tip={tips && tips[k]} className={value === k ? 'on' : ''} onClick={() => on(k)}>{label}</button>)}</div>;
+}}>{options.map(([k, label, ic]) => <button key={k} type="button" data-tip={tips && tips[k]} className={value === k ? 'on' : ''} onClick={() => on(k)} style={fillWrap ? {
+    flex: '1 1 auto',
+    whiteSpace: 'nowrap',
+    gap: 4
+  } : undefined}>{ic && <Ico n={ic} size={13} />}<span>{label}</span></button>)}</div>;
 
 export { Seg, GradChoice };

## 2) GradientEditorPanel.jsx (diff -U5)
--- src/components/editor/GradientEditorPanel.jsx.bak-r3t11	2026-11-14 23:58:49.533549806 +0000
+++ src/components/editor/GradientEditorPanel.jsx	2026-11-15 00:00:52.243767678 +0000
@@ -239,11 +239,11 @@
       return `conic-gradient(from ${ang}deg at 50% 50%, ${st})`;
     }
     return `linear-gradient(90deg, ${st})`;
   }, [g]);
   const isGradient = fillMode === 'linear' || fillMode === 'radial' || fillMode === 'angular';
-  return <div className="space-y-3"><div><div className="text-[11px] mut mb-1.5">{L.gradMode}</div><GradChoice value={fillMode} on={setMode} cols={3} options={[['solid', 'Solid'], ['linear', 'Linear'], ['radial', 'Radial'], ['angular', L.gradAngular || 'Angular'], ['none', L.gradNone]]} tip="veGradMode" tips={{
+  return <div className="space-y-3"><div><div className="text-[11px] mut mb-1.5">{L.gradMode}</div><GradChoice value={fillMode} on={setMode} cols={3} fillWrap options={[['solid', 'Solid', 'drop'], ['linear', 'Linear', 'wind'], ['radial', 'Radial', 'detect'], ['angular', L.gradAngular || 'Angular', 'refresh'], ['none', L.gradNone, 'x']]} tip="veGradMode" tips={{
         solid: 'veGradSolid',
         linear: 'veGradLinear',
         radial: 'veGradRadial',
         angular: 'veGradAngular',
         none: 'veGradNone'

## 3) Scope — backup .bak-r3t11 yang ada (harus tepat 2 file)
src/components/editor/GradientEditorPanel.jsx.bak-r3t11
src/components/ui/SegmentedControl.jsx.bak-r3t11

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t11-fill-icons.cjs (baru, probe 25 asersi: F1-F11, N1-N7, B1-B2, E0)
- probes/shots/r3-t11-fill-before.png, r3-t11-fill-after.png (close-up panel Mode Fill)
