# Task 1 review package — diff backup .bak-r3t1 vs current

File: src/vendor/tailwindOfflineBundle.jsx; AST rules bak=841 cur=841
!important count: bak=357 cur=356
acc-deep count: bak=6 cur=6
file bytes: bak=178573 cur=178499

## rule index 494 CHANGED
BAK: {"t":"r","s":".fig-rail-grp","d":[["display","flex"],["flex-direction","column"],["align-items","center"],["background","var(--sub)"],["border","1px solid transparent"],["border-radius","0"],["padding","2px"],["gap","1px"],["transition","background-color .2s cubic-bezier(.22,1,.36,1), border-color .2s ease, transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s ease"]]}
CUR: {"t":"r","s":".fig-rail-grp","d":[["display","flex"],["flex-direction","column"],["align-items","center"],["background","var(--sub)"],["border","none"],["border-radius","0"],["padding","2px"],["gap","1px"],["transition","background-color .2s cubic-bezier(.22,1,.36,1), border-color .2s ease, transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s ease"]]}

## rule index 794 CHANGED
BAK: {"t":"r","s":".fig-rail-grp","d":[["background","var(--sub) !important"],["border","1px solid rgba(15, 23, 42, 0.06) !important"],["box-shadow","none !important"],["border-radius","0 !important"]]}
CUR: {"t":"r","s":".fig-rail-grp","d":[["background","var(--sub) !important"],["box-shadow","none !important"],["border-radius","0 !important"]]}

Total changed rules: 2 (of 841)

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t1-rail-border.cjs (baru, probe TDD B1-B7)
- probes/shots/r3-t1-rail-border-before.png, r3-t1-rail-border-after.png
