# Task 1 review package — diff backup .bak-t1 vs current

File: src/vendor/tailwindOfflineBundle.jsx; AST rules bak=837 cur=841
acc-deep count: bak=7 cur=6
!important count: bak=357 cur=357
file bytes: bak=178114 cur=178472

## rule index 428 CHANGED
BAK: {"t":"r","s":".dk-b.on","d":[["background","var(--acc-deep)"],["color","#fff"]]}
CUR: {"t":"r","s":".dk-b.on","d":[["background","var(--acc)"],["color","#fff"]]}

## rule index 494 CHANGED
BAK: {"t":"r","s":".fig-rail-grp","d":[["display","flex"],["flex-direction","column"],["align-items","center"],["background","var(--sub)"],["border","1px solid transparent"],["border-radius","12px"],["padding","2px"],["gap","1px"],["transition","background-color .2s cubic-bezier(.22,1,.36,1), border-color .2s ease, transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s ease"]]}
CUR: {"t":"r","s":".fig-rail-grp","d":[["display","flex"],["flex-direction","column"],["align-items","center"],["background","var(--sub)"],["border","1px solid transparent"],["border-radius","0"],["padding","2px"],["gap","1px"],["transition","background-color .2s cubic-bezier(.22,1,.36,1), border-color .2s ease, transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s ease"]]}

## rule index 794 CHANGED
BAK: {"t":"r","s":".fig-rail-grp","d":[["background","var(--sub) !important"],["border","1px solid rgba(15, 23, 42, 0.06) !important"],["box-shadow","var(--m3-shadow-xs) !important"],["border-radius","14px !important"]]}
CUR: {"t":"r","s":".fig-rail-grp","d":[["background","var(--sub) !important"],["border","1px solid rgba(15, 23, 42, 0.06) !important"],["box-shadow","none !important"],["border-radius","0 !important"]]}

## rule index 837 CHANGED
BAK: undefined
CUR: {"t":"r","s":".seg.vert","d":[["flex-direction","column"],["gap","6px"]]}

## rule index 838 CHANGED
BAK: undefined
CUR: {"t":"r","s":".seg.vert > .seg-p","d":[["display","none"]]}

## rule index 839 CHANGED
BAK: undefined
CUR: {"t":"r","s":".seg.vert button.on","d":[["background","color-mix(in srgb, var(--acc) 18%, var(--card))"],["color","var(--fig-sel-ink)"],["box-shadow","0 1px 4px rgba(15, 23, 42, 0.06)"]]}

## rule index 840 CHANGED
BAK: undefined
CUR: {"t":"r","s":".c-inp.ctr","d":[["justify-content","center"]]}

Total changed rules: 7 (of 837)
