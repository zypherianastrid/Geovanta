# Task 2 review package — diff backup .bak-r3t2 vs current

File: src/vendor/tailwindOfflineBundle.jsx; AST rules bak=841 cur=841
!important count: bak=356 cur=356
acc-deep count: bak=6 cur=5
file bytes: bak=178499 cur=178482

## rule index 771 CHANGED
BAK: {"t":"r","s":".ws-nav-item.on .ws-nav-ico","d":[["background","var(--acc-deep) !important"],["border-color","var(--acc) !important"],["color","var(--on-dark) !important"],["box-shadow","0 4px 10px -2px color-mix(in srgb, var(--acc) 45%, transparent) !important"]]}
CUR: {"t":"r","s":".ws-nav-item.on .ws-nav-ico","d":[["background","var(--acc) !important"],["border","none !important"],["color","var(--on-dark) !important"],["box-shadow","0 4px 10px -2px color-mix(in srgb, var(--acc) 45%, transparent) !important"]]}

Total changed rules: 1 (of 841)

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t2-wsnav-accent.cjs (baru, probe TDD 10 asersi)
- probes/shots/r3-t2-wsnav-accent-before.png, r3-t2-wsnav-accent-after.png
