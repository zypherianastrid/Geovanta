# Task 9 fix round 1 — review package (diff .bak-r3t9f1 vs current)

## 1) ColorPickerField.jsx — fix diff (I1 + M1)
--- src/components/ui/ColorPickerField.jsx.bak-r3t9f1	2026-11-14 23:24:47.339606491 +0000
+++ src/components/ui/ColorPickerField.jsx	2026-11-14 23:25:03.564545647 +0000
@@ -205,12 +205,19 @@
     if (!prev) return;
     if (!prev.isNone && prev.hex.toLowerCase() === cur.toLowerCase() && prev.alpha === alpha) return;
     if (prev.isNone) { clearColor(); return; }
     setHsv(hex2hsv(prev.hex));
     setAlpha(prev.alpha);
-    if (onOpacity) out(prev.hex);
-    else out(formatColorWithAlpha(prev.hex, prev.alpha));
+    /* R3-T9 fix1 (I1): cabang onOpacity harus mengembalikan opacity juga.
+       `setAlpha` lokal saja tidak cukup: efek sinkron [value, opacity]
+       menimpa alpha lokal dari prop parent yang sudah terlanjur 1 (promosi
+       di `typed`). Re-emit non-live meniru jalur `emitAlpha`/`clearColor`. */
+    if (onOpacity) {
+      out(prev.hex);
+      if (onOpacityCommit) onOpacityCommit(prev.alpha);
+      else onOpacity(prev.alpha, { isLive: false });
+    } else out(formatColorWithAlpha(prev.hex, prev.alpha));
   };
   const alphaPct = Math.round((isNone ? 0 : alpha) * 100);
   const previewCss = isNone || alpha <= 0 ? 'transparent' : formatColorWithAlpha(cur, alpha);
   const rgbStr = `${parseInt(cur.slice(1, 3), 16)}, ${parseInt(cur.slice(3, 5), 16)}, ${parseInt(cur.slice(5, 7), 16)}`;
   /* Task 11 (B-F4): tooltip swatch menampilkan nama field + nilai warna SAAT
@@ -229,10 +236,15 @@
       background: cur
     }} aria-label={LL.cpColorAria.replace('{v}', isNone ? LL.cpNoColor : value)} onClick={() => setOpen(o => !o)} /><Float anchor={btn} open={open} onClose={() => {
       setOpen(false);
       setHx(null);
       clearHexHint();
+      /* R3-T9 fix1 (M1): bersihkan snapshot sesi hex bila popover menutup
+         tanpa commit/cancel, supaya sesi berikutnya tidak melewatkan
+         snapshot (guard `hexEditRef`) lalu Esc mengembalikan warna basi. */
+      hexPrevRef.current = null;
+      hexEditRef.current = false;
     }} w={276} cls="cp"><div ref={sv} className="sv" data-tip="cpSV" style={{
         background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${hsv2hex(hsv[0], 1, 1)})`
       }} onPointerDown={svDown} onPointerMove={svMove} onPointerUp={svUp} onPointerCancel={svUp}><div className={'sv-h' + (drg ? ' drag' : '')} style={{
           left: hsv[1] * 100 + '%',
           top: (1 - hsv[2]) * 100 + '%',

## 2) Probe diff (29 -> 34 asersi; skenario baru F3op-*)
--- probes/probe-r3-t9-cinp.cjs.bak-r3t9f1	2026-11-14 23:23:43.320468816 +0000
+++ probes/probe-r3-t9-cinp.cjs	2026-11-14 23:23:52.856542638 +0000
@@ -529,6 +529,93 @@
     await page.keyboard.press('Escape');
     await page.waitForTimeout(200);
 
+    // ================= FASE 5 (R3-T9 fix1): F3-op — Esc stop gradient opacity 0 =================
+    // Skenario gagal I1: stop linear opacity 0 -> ketik hex 6 char (live,
+    // promosi opacity 0 -> 1) -> Esc -> hex DAN opacity harus kembali.
+    // Pilih elips kembali, ubah mode Fill ke Linear.
+    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 200);
+    await page.waitForTimeout(400);
+    const gradMode = page.locator('[data-tip="veGradMode"]').first();
+    await gradMode.waitFor({ state: 'visible', timeout: 10000 });
+    await gradMode.locator('button:has-text("Linear")').first().click();
+    await page.waitForTimeout(400);
+    const openStopPopover = async () => {
+      if (await page.locator('.flt').count() === 0) {
+        await page.locator('button.swatch[data-tip="veGradStopColor"]').first().click();
+        await page.locator('.flt').first().waitFor({ state: 'visible', timeout: 10000 });
+      }
+      const hb = page.locator('.flt .fld.hexf[data-tip="cpHex"] [data-custom-input]').first();
+      await hb.waitFor({ state: 'visible', timeout: 10000 });
+      return hb;
+    };
+    await openStopPopover();
+    const stopHexPre = (await measureBox(hexScope)).text;
+    console.log('  info stop pra-edit: hex=' + stopHexPre);
+    // Set opacity stop ke 0 via kotak alpha (commit Enter).
+    const ab0 = page.locator(`${alphaScope} [data-custom-input]`).first();
+    await ab0.click();
+    await page.waitForTimeout(200);
+    await page.keyboard.press('ControlOrMeta+a');
+    await page.keyboard.type('0', { delay: 25 });
+    await page.keyboard.press('Enter');
+    await page.waitForTimeout(400);
+    const alphaAfterSet = await measureBox(alphaScope);
+    check('F3op-setup', 'setup: opacity stop diset 0 via kotak alpha (alpha terbaca 0)',
+      alphaAfterSet.found && alphaAfterSet.text === '0',
+      `alpha=${alphaAfterSet.text}`, 'alpha=0');
+    // Ketik hex baru 6 char (live-apply).
+    const hbOp = page.locator('.flt .fld.hexf[data-tip="cpHex"] [data-custom-input]').first();
+    await hbOp.click();
+    await page.waitForTimeout(200);
+    await page.keyboard.press('ControlOrMeta+a');
+    await page.keyboard.type('AAAAAA', { delay: 25 });
+    await page.waitForTimeout(400);
+    const alphaAfterType = await measureBox(alphaScope);
+    check('F3op-live', 'kontrol: ketik hex 6 char pada stop op 0 mempromosikan opacity dokumen 0 -> 1 (alpha terbaca 100)',
+      alphaAfterType.found && alphaAfterType.text === '100',
+      `alpha=${alphaAfterType.text}`, 'alpha=100');
+    await page.keyboard.press('Escape');
+    await page.waitForTimeout(400);
+    const hexAfterOpEsc = await measureBox(hexScope);
+    const alphaAfterOpEsc = await measureBox(alphaScope);
+    check('F3op-a', 'Esc stop gradient: hex kembali ke pra-edit',
+      hexAfterOpEsc.found && hexAfterOpEsc.text === stopHexPre,
+      `hex sebelum=${stopHexPre} sesudah=${hexAfterOpEsc.text}`, `hex=${stopHexPre}`);
+    check('F3op-b', 'Esc stop gradient: opacity kembali ke 0 (bukan tetap 1)',
+      alphaAfterOpEsc.found && alphaAfterOpEsc.text === '0',
+      `alpha=${alphaAfterOpEsc.text}`, 'alpha=0');
+
+    // ================= FASE 6 (R3-T9 fix1): M1 — kontrol negatif tutup popover =================
+    // Sesi hex parsial (tanpa emit), tutup popover via klik luar (onClose),
+    // buka lagi, ketik hex penuh + Esc -> harus kembali ke hex sesi baru.
+    // Jalur ini diselidiki: klik-luar memicu blur -> commit -> refs bersih
+    // bahkan pra-fix, jadi skenario ini diharapkan LOLOS pra- dan pasca-fix
+    // (kontrol negatif; fix M1 sendiri tak punya jalur reproduksi browser).
+    await openStopPopover();
+    const m1hb = page.locator('.flt .fld.hexf[data-tip="cpHex"] [data-custom-input]').first();
+    await m1hb.click();
+    await page.waitForTimeout(200);
+    await page.keyboard.press('ControlOrMeta+a');
+    await page.keyboard.type('AB', { delay: 25 });
+    await page.waitForTimeout(300);
+    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 200);
+    await page.waitForTimeout(400);
+    const popClosed = await page.locator('.flt').count() === 0;
+    await openStopPopover();
+    const m1hb2 = page.locator('.flt .fld.hexf[data-tip="cpHex"] [data-custom-input]').first();
+    await m1hb2.click();
+    await page.waitForTimeout(200);
+    const m1HexBefore = (await measureBox(hexScope)).text;
+    await page.keyboard.press('ControlOrMeta+a');
+    await page.keyboard.type('BBBBBB', { delay: 25 });
+    await page.waitForTimeout(300);
+    await page.keyboard.press('Escape');
+    await page.waitForTimeout(400);
+    const m1HexAfter = (await measureBox(hexScope)).text;
+    check('F3op-m1', 'M1 kontrol negatif: tutup popover di tengah sesi hex parsial lalu Esc sesi baru -> hex kembali ke nilai sesi baru (bukan basi)',
+      popClosed && m1HexAfter === m1HexBefore,
+      `popClosed=${popClosed} hex sebelum=${m1HexBefore} sesudah=${m1HexAfter}`, `hex tetap ${m1HexBefore}`);
+
     check('E0', '0 pageerror selama seluruh probe', pageErrors.length === 0,
       JSON.stringify(pageErrors), '[]');
 

## 3) Konfirmasi scope — fix round hanya menyentuh ColorPickerField.jsx + probe
- `CustomTextBox.jsx` vs `.bak-r3t9` BERBEDA — itu benar: `.bak-r3t9` adalah
  baseline PRA-T9, dan T9 sendiri mengubah file ini (fix F10). Bukti fix round
  TIDAK menyentuhnya: mtime `CustomTextBox.jsx` = 23:11:40 (waktu T9),
  sedangkan edit fix round 23:24–23:25; tidak ada `.bak-r3t9f1` untuk file ini
  karena fix agent hanya mem-backup file yang ia edit (sesuai brief).
- `tailwindOfflineBundle.jsx`: IDENTIK vs `.bak-r3t9` (bundle utuh; mtime 23:09:46).
- Satu-satunya file produk yang berubah di fix round: `ColorPickerField.jsx`
  (mtime 23:25:03), plus probe (23:23:52).
