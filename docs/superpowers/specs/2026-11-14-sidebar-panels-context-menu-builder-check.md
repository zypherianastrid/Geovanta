# Builder Check — Perapian Sidebar Kanan + Context Menu Geovanta

**Dokumen yang diperiksa:** `docs/superpowers/specs/2026-11-14-sidebar-panels-context-menu-design.md`
**Tanggal check:** 2026-11-14. **Hasil:** 1 pertanyaan memblokir penulisan plan.
Segala hal lain di dokumen sudah cukup spesifik untuk diplankan, atau
secara eksplisit diserahkan ke builder (§7), atau dapat diputuskan sendiri
secara wajar oleh builder — jadi tidak ditanyakan di sini.

---

## Q1 (satu-satunya, paling penting) — D1: Select Same tidak punya jalur lain

**Pertanyaan:** Setelah 3 item "Pilih yang Sama — Fill/Stroke/Tipe" dihapus
dari context menu, di mana fungsi Select Same tinggal — atau apakah fungsi
itu memang boleh hilang total?

Pilihan yang diajukan dokumen (§8):
- **D1-A:** Hapus ke-9 item; Select Same Fill/Stroke/Tipe hilang total
  (hanya tersisa tombol "◎" per baris warna di Selection Colors, yang
  lebih sempit: tanpa kriteria "tipe", hanya warna yang ada di seleksi).
- **D1-B (rekomendasi controller):** Hapus 6 item Boolean/Outline/Offset;
  pindahkan Select Same Fill/Stroke/Tipe ke seksi Selection Colors sebagai
  3 tombol kecil (rumah baru — fungsi tetap ada, menu tetap ramping).
- **D1-C:** Hapus 6 item; biarkan 3 item Select Same tetap di context menu.

**Kenapa jawabannya mengubah plan:** Pilihan ini menentukan isi task
context menu (hapus 9 item vs hapus 6 item), dan apakah plan harus memuat
task tambahan "bangun rumah baru Select Same di Selection Colors"
(D1-B: 3 tombol baru + label/i18n + probe) atau tidak (D1-A/D1-C).
Tanpa jawaban ini, task context menu tidak bisa ditulis dengan benar:
menulis "hapus 9 item" berarti menghapus sebuah fungsi dari aplikasi,
yang bertentangan langsung dengan instruksi user "fungsi normal nya
tetap ada".

**Yang sudah saya verifikasi sendiri di kode (bukan dari laporan):**
`selectSameCriterion` didefinisikan di `src/components/editor/VectorEditor.jsx:7692`
dan HANYA dipanggil dari ketiga item context menu itu (`:7738` fill,
`:7745` stroke, `:7752` type) — tidak ada pemanggil lain di `src/`.
Klaim dokumen bahwa menghapus ketiganya berarti menghapus fungsi itu
dari aplikasi adalah BENAR. Sebaliknya, Boolean (`applyBoolean`, dipakai
juga oleh shortcut Ctrl+Alt+U/S/I/X di `:7502-7505` + floating toolbar),
Outline Stroke, dan Offset Path memang punya jalur normal lain, jadi
penghapusan 6 item itu aman.

---

## Yang sengaja tidak ditanyakan

Dua hal sempat terlihat seperti pertanyaan, tetapi pemeriksaan kode
membuktikan dokumen sudah konsisten — jadi bukan pertanyaan:
- **Clamp per-sudut vs seragam (butir 1):** rumus dokumen adalah
  per-sudut ("maksimum yang muat di sudut itu"), dan field `curR`
  (`VectorEditor.jsx:8125`) SUDAH menampilkan rata-rata radius sudut
  yang dipilih — jadi "field menampilkan nilai efektif" tetap konsisten
  di bawah clamp per-sudut. Tidak ada konflik untuk ditanyakan; builder
  mengikuti rumus dokumen + logika `curR` yang ada.
- **Seksi F&R/Recolor saat tidak ada seleksi:** perilaku modal yang
  dipertahankan (G6) adalah panel bisa dibuka dari tombol Color Styles
  tanpa seleksi — builder cukup me-render seksi secara unconditional
  (bukan di dalam kondisional `selectionColors.length > 0`) dengan scope
  mengikuti default modal. Keputusan implementasi wajar, bukan pertanyaan
  untuk user.
