# Spec Desain: Tahap 2 — Geometri & Gambar (Boolean Divide, Compound Path, & Freehand Drawing)

Tanggal: 2026-11-20  
Status: Draft -> Ready for Implementation  
Penulis: Antigravity Assistant & Superpowers SDD Team  

---

## 1. Ringkasan Eksekutif & Ruang Lingkup

Tahap 2 berfokus pada dua pilar inti kemampuan manipulasi geometri dan kreasi bentuk bebas di Geovanta Vector Studio:

1. **Fitur 6: Boolean Divide & Manajemen Compound Path Eksplisit**
   - **Boolean Divide (Operasi Divide / Slice):** Memotong dan memecah seluruh bidang perpotongan antara 2 atau lebih bentuk vektor menjadi partisi bentuk-bentuk mandiri yang saling lepas (disjoint non-overlapping atomic tiles), mewarisi styling yang akurat (wilayah perpotongan mewarisi atribut visual bentuk teratas).
   - **Make Compound Path (`Ctrl+8`):** Menggabungkan 2 atau lebih objek path terpisah menjadi 1 objek path tunggal berlubang (`subs` tergabung) dengan `fillRule: 'evenodd'`, mewarisi atribut objek teratas/primer.
   - **Release Compound Path (`Ctrl+Shift+8`):** Memecah objek compound path (`subs.length > 1`) menjadi objek-objek mandiri terpisah (1 objek per subpath) pada posisi z-order aslinya.

2. **Fitur 9: Freehand Drawing (Pencil Tool & Smooth Vector Brush)**
   - **Pencil Tool (`pencil`):** Menggambar bebas (freehand sketch) secara presisi dengan stabilisasi getaran tangan (distance thresholding & moving-average smoothing) dan fitting kurva Bézier kubik minimal-node otomatis menggunakan algoritma Schneider (`schneiderFit`).
   - **Smooth Vector Brush (`brush`):** Kuas vektor organik dengan ketebalan dinamis berbasis tekanan stylus (`e.pressure`) atau variasi kecepatan mouse (dynamic calligraphic ribbon), menghasilkan kurva berbobot tebal-tipis alami yang 100% kompatibel SVG standar.
   - **Integrasi Canvas & UI:** Pendaftaran tool baru di floating toolbar, kursor crosshair, interaksi pointer down/move/up dengan live preview 60 FPS, shortcut keyboard, menu konteks, dan dukungan i18n dwibahasa (ID/EN).

---

## 2. Arsitektur & Desain Rinci Fitur 6: Boolean Divide & Compound Path

### 2.1 Boolean Divide Algorithm (`pathBoolean.tsx`)

#### Konsep Matematika:
Diberikan himpunan objek tertutup $O = \{O_0, O_1, \dots, O_{n-1}\}$ terurut dari bawah ke atas (z-order menaik). Operasi Divide mempartisi seluruh ruang gabungan $\bigcup_{i} O_i$ menjadi sekumpulan region tertutup $\{R_k\}$ yang saling lepas ($R_j \cap R_k = \emptyset, \forall j \neq k$).

#### Algoritma Iteratif Berbasis `clipRings`:
1. Inisialisasi daftar region hasil: `regions = [{ rings: flatten(O_0).rings, sourceObj: O_0 }]`.
2. Untuk setiap objek berikutnya $O_k$ ($k = 1 \dots n-1$):
   a. Buat `newRegions = []`.
   b. Inisialisasi sisa luar dari $O_k$: `remnantOfOk = flatten(O_k).rings`.
   c. Untuk setiap region yang sudah ada $R \in \text{regions}$:
      - Hitung perpotongan: `inter = clipRings(R.rings, O_k.rings, 'intersect')`.
      - Hitung selisih: `diff = clipRings(R.rings, O_k.rings, 'difference')`.
      - Jika `inter.length > 0`:
        - Region $R$ terbelah menjadi dua:
          1. Bagian luar: `diff` (mempertahankan styling `R.sourceObj`).
          2. Bagian dalam: `inter` (mewarisi styling $O_k$, karena $O_k$ berada di atas $R$ dalam z-order).
        - Tambahkan `diff` ke `newRegions` jika tidak kosong.
        - Tambahkan `inter` ke `newRegions`.
        - Kurangi `remnantOfOk` dengan $R$: `remnantOfOk = clipRings(remnantOfOk, R.rings, 'difference')`.
      - Jika `inter.length === 0`:
        - Tidak berpotongan dengan $R$. Pertahankan $R$ utuh di `newRegions`.
   d. Jika `remnantOfOk.length > 0`:
      - Tambahkan sisa $O_k$ yang tidak berpotongan dengan region mana pun ke `newRegions` dengan styling $O_k$.
   e. Set `regions = newRegions`.
3. Konversi seluruh `regions` kembali ke `VectorObject`:
   - Untuk setiap region $R \in \text{regions}$:
     - `subs = ringsToSubs(R.rings)`.
     - Buat `VectorObject` baru dengan nama `Divide-K`, mewarisi fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, opacity, dan group dari `R.sourceObj`.
4. Gantilah objek-objek terpilih dalam `doc.objects` dengan daftar objek hasil divide baru pada posisi z-index objek pertama.
5. Kembalikan `{ doc, changed: true, resultIds: [...], stats }`.

### 2.2 Manajemen Compound Path (`compoundPathEngine.tsx`)

#### 2.2.1 Make Compound Path (`makeCompoundPathDoc`):
- **Syarat:** Minimal 2 objek vektor valid terpilih (`o.subs && o.subs.length > 0`).
- **Atribut:** Mewarisi atribut visual dari objek teratas yang terpilih (`topObj`):
  - `fill`, `fillRule: 'evenodd'`, `stroke`, `strokeWidth`, `strokeLinecap`, `strokeLinejoin`, `strokeMiterlimit`, `strokeDasharray`, `strokeDashoffset`, `strokeAlign`, `blendMode`, `opacity`, `group`.
- **Subpaths:** Menggabungkan seluruh subpath dari semua objek terpilih secara sekuensial:
  `subs: targets.flatMap(o => o.subs)`.
- **Penempatan Dokumen:** Objek compound tunggal menggantikan objek-objek sumber pada slot z-order objek teratas.
- **Hasil:** `{ doc, changed: true, resultId: merged.id }`.

#### 2.2.2 Release Compound Path (`releaseCompoundPathDoc`):
- **Syarat:** Minimal 1 objek terpilih memiliki `subs.length > 1`.
- **Dekomposisi:** Untuk setiap subpath `sub` di `o.subs`:
  - Dibuat objek mandiri `VectorObject`:
    - `id: uid()`,
    - `name: `${o.name || 'Path'}-${idx + 1}``,
    - `subs: [sub]`,
    - Atribut visual (`fill`, `stroke`, `strokeWidth`, dsb.) disalin identik dari objek induk.
- **Penempatan Dokumen:** Objek-objek baru disisipkan menggantikan posisi z-order objek induk semula.
- **Hasil:** `{ doc, changed: true, resultIds: [...] }`.

---

## 3. Arsitektur & Desain Rinci Fitur 9: Freehand Pencil & Smooth Vector Brush

### 3.1 Pipeline Data Freehand (`freehandEngine.tsx`)

```
Pointer Drag Event (x, y, pressure, time)
                     │
                     ▼
       1. Distance Threshold Filter (≥ 2px)
                     │
                     ▼
       2. Stabilizer / Moving Average Smoothing
                     │
                     ▼
       3. Real-time Preview Generation (live Raf)
                     │
         [Pointer Up / Selesai]
                     │
                     ▼
       4. Auto-Close Detection (jarak start-end ≤ 10px)
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    [Mode Pencil]           [Mode Brush]
Schneider Bézier Fitting   Dynamic Ribbon Polygon /
(schneiderFit cubic Bézier)  Variable Pressure Profile
         │                       │
         └───────────┬───────────┘
                     ▼
        Final VectorObject Commit
```

### 3.2 Detail Stabilisasi & Curve Fitting:
1. **Distance Filter:** Titik baru hanya dicatat jika $\Delta d = \sqrt{(x - x_{last})^2 + (y - y_{last})^2} \ge 2.0\text{px}$.
2. **Moving-Average Smoothing:** Menghilangkan tremor/jitter tangan mikro dengan rata-rata berbobot jendela 3-5 sampel.
3. **Pencil Bézier Fitting:**
   - Menggunakan `schneiderFit(points, t1, t2, tolerance)` dari `curveFittingAndAnomalies.tsx`.
   - Menghasilkan segmen kurva Bézier kubik yang halus dengan jumlah node minimal.
   - Mengonversi segmen Bézier hasil fitting ke bentuk `{ id: uid(), x, y, handleIn, handleOut }`.
   - Mengatur `strokeLinecap: 'round'`, `strokeLinejoin: 'round'`, `stroke: activeStroke`, `strokeWidth: activeStrokeWidth`, `fill: 'none'`.
4. **Smooth Vector Brush:**
   - Menghasilkan kurva organik dengan ketebalan adaptif:
     - Jika Stylus/Apple Pencil/Wacom: Menggunakan nilai `e.pressure` (skala $0.2 \dots 1.8 \times \text{baseWidth}$).
     - Jika Mouse: Menggunakan profil ketebalan kaligrafi berbasis kecepatan gerak dan taper halus di ujung awal/akhir.
   - Dihasilkan sebagai ribbon tertutup (closed outline subpath) atau serangkaian kurva berbobot halus, siap diisi (`fill = activeStroke || activeFill`) dan dirender tajam di CanvasKit maupun diekspor ke SVG standar.

---

## 4. Integrasi UI, Tooling, & Keyboard Shortcuts

1. **Floating Toolbar (`EditorFloatingToolbar.tsx`):**
   - Tambahkan menu item `divide` pada `BOOL_ITEMS`:
     `['divide', 'veBoolDivide', L.edBoolDivide, IC_BOOL_DIVIDE, 'Ctrl+Alt+D', !canBool, () => applyBoolean('divide')]`.
   - Tambahkan `pencil` dan `brush` ke `VE_DRAW_GROUP` dan `VE_DRAW_TOOLS` di `src/constants/editorToolsAndShapes.tsx`.
2. **Menu Konteks (`VectorEditor.tsx` / `ContextMenu.tsx`):**
   - Tambahkan opsi:
     - `Make Compound Path` (`Ctrl+8`) — aktif jika `eligiblePaths.length >= 2`.
     - `Release Compound Path` (`Ctrl+Shift+8`) — aktif jika `selectedCompoundPaths.length >= 1`.
     - `Divide` (`Ctrl+Alt+D`) di menu Boolean.
3. **Pintasan Keyboard (`useEditorShortcuts.tsx`):**
   - `Ctrl+Alt+D`: Boolean Divide.
   - `Ctrl+8` (`Digit8`): Make Compound Path.
   - `Ctrl+Shift+8` (`Digit8` + Shift): Release Compound Path.
   - `n` atau `Shift+P`: Pencil Tool.
   - `b`: Brush Tool (bila belum dipakai atau beralih grup).
4. **Kamus Bahasa & Tooltip (`appI18n.tsx`, `tooltipsCatalog.tsx`):**
   - Definisi lengkap `edBoolDivide`, `veBoolDivide`, `edMakeCompound`, `edReleaseCompound`, `vePencil`, `veBrush` dalam bahasa Indonesia dan Inggris.

---

## 5. Rencana Pengujian Otomatis (Mandatory Playwright Regular)

1. `tests/tahap2-boolean-divide-and-compound.spec.ts`:
   - Unit & engine test: Boolean divide 2 persegi bertumpuk menghasilkan 3 region mutually disjoint.
   - Boolean divide 3 lingkaran bertumpuk menghasilkan partisi lengkap tanpa tumpang tindih.
   - Make compound path menggabungkan 2 subpath menjadi 1 objek dengan `fillRule: 'evenodd'`.
   - Release compound path memecah 1 objek dengan 2 subpath menjadi 2 objek mandiri.
2. `tests/tahap2-freehand-engine.spec.ts`:
   - Freehand engine: sampling titik, distance filtering, moving average smoothing.
   - Schneider Bézier curve fitting menghasilkan subpath kubik valid dengan handle konsisten.
   - Brush ribbon generator menghasilkan geometri tertutup valid.
3. `tests/tahap2-drawing-and-compound-ui-e2e.spec.ts`:
   - E2E Playwright: Memilih tool Pencil, melakukan drag mouse di kanvas, memastikan objek path baru terbentuk dengan node dan garis halus.
   - Memilih 2 objek, menekan `Ctrl+8`, verifikasi compound path terbentuk.
   - Menekan `Ctrl+Shift+8`, verifikasi compound path terurai kembali.
   - Menekan tombol Divide di floating toolbar, verifikasi objek terpotong menjadi bagian mandiri.

---

## 6. Verifikasi Interaktif (Mandatory Playwright MCP)

Menggunakan alat Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_take_screenshot`) pada server lokal aktif untuk:
1. Menavigasi ke editor.
2. Memilih Pencil Tool, menggambar garis di kanvas, memeriksa hasil visual.
3. Menguji menu Divide pada dua bentuk yang saling bertumpuk.
4. Menguji Make & Release Compound Path secara visual.
