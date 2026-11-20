# Desain Fitur: Auto Simplify Node Kanvas (Presisi 100%, 1 Kali Eksekusi)

**Tanggal:** 2026-11-17  
**Status:** Menunggu Persetujuan  
**Ukuran:** Small Change  

---

## 1. Latar Belakang & Tujuan
Saat pengguna mengimpor, menempel (*paste*), atau membuat banyak objek vektor di Geovanta, berkas SVG eksternal (misalnya dari Illustrator, Figma, atau hasil *tracing*) sering kali membawa ratusan hingga ribuan *anchor points* redundan (titik bertumpuk, segmen garis collinear lurus yang dipecah banyak node, atau kurva berlebih). Hal ini memperberat komputasi teselasi dan memori kanvas.

Tujuan fitur ini:
* Memberikan optimasi otomatis (*auto-simplify*) untuk setiap objek di kanvas.
* Menetapkan **Curve Precision selalu 100%** (`level = 100.0`, toleransi $0.03125\text{ pt}$), sehingga kurva asli tetap presisi secara visual tanpa ada distorsi bentuk.
* Memastikan proses berjalan **tepat 1 kali per objek** (dengan penanda `_autoSimplified: true` atau pelacakan ID) untuk menjaga performa rendering tetap 60 FPS tanpa beban kalkulasi berulang.

---

## 2. Pendekatan yang Dipertimbangkan (*Approaches*)
1. **Pendekatan 1 (Hanya Otomatis saat Impor/Paste):**
   * *Kelebihan:* Sangat ringan, file baru langsung bersih.
   * *Kekurangan:* Objek yang sudah ada di kanvas sebelum fitur aktif tidak teroptimasi.
2. **Pendekatan 2 (Hanya Tombol Aksi Manual di Toolbar):**
   * *Kelebihan:* Kontrol penuh oleh pengguna.
   * *Kekurangan:* Pengguna harus selalu ingat mengklik tombol setiap kali menambah objek.
3. **Pendekatan 3 (Hybrid Opsi C — Dipilih Pengguna):**
   * *Kelebihan:* Objek baru otomatis disederhanakan 1× saat masuk ke kanvas (impor berkas & paste SVG), dan tersedia tombol aksi cepat "Simplify Semua Objek Kanvas" untuk membersihkan seluruh objek yang saat ini sudah ada di kanvas. Penanda `_autoSimplified` mencegah penyederhanaan ganda pada objek yang sama.

---

## 3. Spesifikasi Teknis

### A. Fungsi Inti: `autoSimplifyObjects(doc, targetIds = null)`
* **Lokasi:** Terintegrasi di `src/engine/topologicalCurveSimplifier.tsx` dan diekspos melalui `VE.autoSimplifyDoc`.
* **Parameter:**
  * `doc`: Dokumen Geovanta saat ini.
  * `targetIds`: Opsional (kumpulan ID objek spesifik, atau `null` untuk semua objek di dokumen).
* **Filter Objek:**
  * Hanya memproses objek berjenis path vektor (`type === 'path'` atau memiliki `subs`).
  * Mengabaikan objek teks (`isLegacyText` / `o.text`), bitmap image (`o.img`), background frame (`isFrameBg` / `isAutoFrame`), serta objek yang sudah ditandai `_autoSimplified === true`.
* **Konfigurasi Penyederhanaan:**
  * `level: 100.0` (Curve Precision 100%, toleransi `0.03125 pt`).
  * `cornerAngle: 30` (mempertahankan sudut tajam di bawah 150°).
  * `straightLines: false` (hanya menyederhanakan titik collinear tanpa mengubah kurva menjadi garis patah).
* **Hasil:** Objek yang berubah diberi properti `_autoSimplified: true`, mencatat jumlah node sebelum & sesudah, dan mengembalikan `{ doc, count, before, after, changed }`.

### B. Titik Pemicu Otomatis (Auto Trigger):
1. **Saat Impor Berkas SVG (`importFiles` di `VectorEditor.tsx`):**
   * Setelah objek SVG diparsing dan sebelum di-commit ke dokumen, jalankan auto-simplify 100% pada objek-objek baru tersebut.
2. **Saat Paste SVG (`pasteText` / `pasteFromSystem` di `VectorEditor.tsx`):**
   * Objek hasil paste clipboard langsung dioptimasi 1× pada presisi 100%.

### C. Aksi Manual Kanvas (Canvas Action):
* **Menu Simplify / Toolbar:**
  * Pada popover / bilah Simplify, sediakan opsi/tombol cepat: **"Auto Simplify Semua Objek (100%)"**.
  * Jika diklik: menyederhanakan semua objek di kanvas yang belum berstatus `_autoSimplified`, memberikan feedback toast: `"Auto-Simplify 100%: X objek dioptimalkan · Y → Z node"`.
* **Dukungan Undo / Redo:**
  * Seluruh mutasi dokumen melalui `commit()`, sehingga pengguna dapat melakukan `Ctrl + Z` kapan saja.

---

## 4. Kriteria Keberhasilan & Pengujian (Playwright)
1. Objek path vektor dengan banyak node collinear/redundant yang diimpor atau di-simplify berkurang jumlah nodenya tanpa merusak bentuk kurva (`level = 100`).
2. Objek yang sudah di-simplify tidak akan di-simplify ulang jika aksi dijalankan kembali (`_autoSimplified === true`).
3. Objek gambar, teks, dan frame background tidak terpengaruh.
4. Seluruh rangkaian tes Playwright lulus (`npx playwright test`).
