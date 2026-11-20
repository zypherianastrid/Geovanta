# Re-review package — Task 2 fix round 1/5

## Fix base: state reviewed in task-2-review.md (tests/iconify-panel.test.cjs.bak-modal-t2-r1)
## Head: current working copy

## Files changed in fix round
- tests/iconify-panel.test.cjs (vs .bak-modal-t2-r1) — production code untouched

## Full diff (fix base -> head, -U10)
=== tests/iconify-panel.test.cjs ===
--- /home/hatch/workspace/geovanta-round2/tests/iconify-panel.test.cjs.bak-modal-t2-r1	2026-11-15 05:25:18.464125660 +0000
+++ /home/hatch/workspace/geovanta-round2/tests/iconify-panel.test.cjs	2026-11-15 05:25:22.330070828 +0000
@@ -320,13 +320,20 @@
   assert.match(src, /setSelectedCategory\(v\)/);
   assert.match(src, /setSelectedPrefix\(''\)/);
   // Telusur: kategori aktif → koleksi pertama dalam kategori itu.
   assert.match(src, /selectedCategory \? visibleCollections\[0\]\?\.prefix : undefined/);
   // Cari: kategori aktif → searchIconsFiltered; ic-count = hasil
   // terfilter yang dimuat; "Muat lagi" selama !exhausted.
   assert.match(src, /searchIconsFiltered\(q,\s*\{category: selectedCategory, collections, limit: SEARCH_LIMIT/);
   assert.match(src, /selectedCategory \? searchResults\.length : searchTotal/);
   assert.match(src, /selectedCategory \? !searchExhausted : searchResults\.length < searchTotal/);
   assert.match(src, /searchIconsFiltered\(q,\s*\{category: selectedCategory, collections, limit: searchResults\.length \+ SEARCH_LIMIT/);
+  // Tripwire (review round 1, Important): kondisi "Muat lagi"
+  // !searchExhausted hanya bermakna bila kedua jalur cari benar-benar
+  // menulis res.exhausted ke state — efek cari DAN handleLoadMoreSearch.
+  // Tanpa salah satunya, tombol tampil selamanya (state awal false).
+  // Hitung 2 agar penghapusan di salah satu call site membuat tes MERAH.
+  assert.match(src, /setSearchExhausted\(res\.exhausted\)/);
+  assert.equal((src.match(/setSearchExhausted\(res\.exhausted\)/g) || []).length, 2);
   // Jalur tanpa kategori tetap searchIcons lama (total API tetap tampil).
   assert.match(src, /searchIcons\(q,\s*\{prefix: selectedPrefix \|\| undefined, limit: SEARCH_LIMIT, signal: controller\.signal\}\)/);
 });

## Production file untouched check
b99964afa4a3f4ff44d4288deb6a2c56  /home/hatch/workspace/geovanta-round2/src/components/editor/IconifyPanel.jsx
299:          setSearchExhausted(res.exhausted);
337:        setSearchExhausted(res.exhausted);
