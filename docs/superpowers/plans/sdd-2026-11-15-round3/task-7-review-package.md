# Task 7 review package — diff backup .bak-r3t7 vs current

File: src/vendor/tailwindOfflineBundle.jsx; AST rules bak=841 cur=842
!important count: bak=356 cur=356
acc-deep count: bak=5 cur=5
file bytes: bak=178519 cur=178592

## rule index 841 CHANGED
BAK: undefined
CUR: {"t":"r","s":"[data-tip=\"veBgColor\"] .hexf","d":[["flex","0 0 30px"]]}

Total changed rules: 1 (of 841)

## Diff tests/accent-tokens.test.cjs (tripwire 841 -> 842)
```diff
--- tests/accent-tokens.test.cjs.bak-r3t7	2026-11-14 22:43:43.147814473 +0000
+++ tests/accent-tokens.test.cjs	2026-11-14 22:43:45.541440175 +0000
@@ -59,8 +59,10 @@
   // varian vertikal Seg Recolor + teks tengah range: .seg.vert,
   // .seg.vert > .seg-p, .seg.vert button.on, .c-inp.ctr; di-append di
   // akhir array seperti .pin3-fill sehingga indeks [464]/[465] tidak
-  // bergeser).
-  assert.equal(ast.length, 841);
+  // bergeser) + 1 aturan T7 ronde 3 (2026-11-15 — tinggi ColorText veBg
+  // = swatch 30px: [data-tip="veBgColor"] .hexf { flex: 0 0 30px };
+  // di-append di akhir array dengan alasan yang sama).
+  assert.equal(ast.length, 842);
   assert.equal(ast[464].s, ':root, :root[data-theme="light"]');
   assert.equal(ast[465].s, ':root[data-theme="dark"]');
   const light = decls(ast[464]);

```

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t7-canvas-heights.cjs (baru, probe TDD 6 asersi)
- probes/shots/r3-t7-canvas-heights-before.png, r3-t7-canvas-heights-after.png
