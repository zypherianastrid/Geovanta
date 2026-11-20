# Task 10 review package — diff backup .bak-r3t10 vs current

## 1) themeAndPrefsManager.jsx (diff -U8)
--- src/utils/themeAndPrefsManager.jsx.bak-r3t10	2026-11-14 23:42:42.284432044 +0000
+++ src/utils/themeAndPrefsManager.jsx	2026-11-14 23:42:43.806590775 +0000
@@ -44,16 +44,22 @@
 };
 const loadPrefs = () => {
   try {
     const raw = localStorage.getItem(LS_KEY);
     if (!raw) return {
       ...DEFAULT_PREFS
     };
     const p = JSON.parse(raw);
+    /* T10: tegakkan batas 10 warna terakhir juga di jalur muat — daftar
+       lebih panjang (seed/import/prefs lama) sebelumnya dirender apa adanya
+       karena cap hanya ada di jalur tulis rememberRecentColor. */
+    if (Array.isArray(p.recentColors)) {
+      p.recentColors = p.recentColors.filter(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 10);
+    }
     if (!p.m3White) {
       p.theme = 'light';
       p.m3White = true;
       try {
         localStorage.setItem(LS_KEY, JSON.stringify({
           ...DEFAULT_PREFS,
           ...p
         }));

## 2) File produk lain — hanya file ini yang berubah (mtime)
- `src/utils/themeAndPrefsManager.jsx` — 2026-11-14 23:42:43 (waktu fix T10)
- `src/components/editor/VectorEditor.jsx` — 2026-11-14 14:34:25 (pra-T10, tak tersentuh)
- `src/components/editor/EditorRightInspector.jsx` — 2026-11-14 22:49:33 (pra-T10, tak tersentuh)
- Satu-satunya backup `.bak-r3t10`: `src/utils/themeAndPrefsManager.jsx.bak-r3t10`

## 3) Artefak R2 — klaim dikembalikan dari backup /tmp (ukuran 91738 / 95818 B)
95818 probes/shots/r2-t8-lastcolor-after.png
91738 probes/shots/r2-t8-lastcolor-before.png

## File baru (bukan diff — reviewer baca langsung)
- probes/probe-r3-t10-last-color.cjs (baru, probe 15 asersi: E1-E5, E3s, F0-F3, G0+G-pertama/tengah/terakhir, H0)
- probes/shots/r3-t10-lastcolor-eviction.png, r3-t10-lastcolor-before-reload.png, r3-t10-lastcolor-after-reload.png
