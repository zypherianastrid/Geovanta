# Task 5 review package — diff backup .bak-r3t5 vs current

## Files changed (diff -U2)
--- src/components/editor/EditorFloatingToolbar.jsx.bak-r3t5	2026-11-14 22:21:21.040109802 +0000
+++ src/components/editor/EditorFloatingToolbar.jsx	2026-11-14 22:21:23.372383048 +0000
@@ -11,5 +11,5 @@
 import { VE } from '../../engine/vectorEngine.jsx';
 
-const FrameToolGlyph = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4H5a1 1 0 0 0-1 1v3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="8" y="8" width="8" height="8" rx="1.2" /><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" /></svg>;
+const FrameToolGlyph = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1" /><rect x="7.5" y="7.5" width="9" height="9" rx="0.5" /></svg>;
 const NodeSizeGlyph = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" /><line x1="5.5" y1="18.5" x2="18.5" y2="5.5" stroke="currentColor" strokeWidth="1.6" /><circle cx="5.5" cy="18.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="18.5" cy="5.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M4 8V4h4 M20 16v4h-4" stroke="currentColor" strokeWidth="1.6" /></svg>;
 

## Checks
1
1

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t5-frame-icon.cjs (baru, probe TDD P1-P10)
- probes/shots/r3-t5-frame-icon-before.png, r3-t5-frame-icon-after.png (close-up)
