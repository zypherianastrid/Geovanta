# SDD ledger — plan: docs/superpowers/plans/2026-11-12-node-bezier-dropdown.md

## Setup rulings

- Ruling: Plan mengasumsikan repo git (worktree, `git add`/`git commit`, workspace `.superpowers/sdd/`). Working copy `Geovanta Bug Blank Font/` BUKAN repo git (fatal: not a git repository) dan tidak pernah menjadi repo di ronde-ronde sebelumnya. Keputusan: kerja langsung di working copy ini; ganti `git commit` per task dengan konvensi folder yang sudah berlaku (backup `.bak` sebelum edit destruktif + ZIP akhir sebagai rekam jejak); ledger disimpan di samping plan (`docs/superpowers/plans/2026-11-12-node-bezier-dropdown-progress.md`). Cost jika salah: tidak ada riwayat git per task — dimitigasi `.bak` + ZIP + ledger ini; push ke repo GitHub tetap butuh persetujuan user.
- Pre-flight: Task 1 → Task 4 (`joinNodes` di VE, dipakai `applyJoinNodes`) — konsisten. Task 2 → Task 4 (`splitPath`) — konsisten. Task 3 → Task 4 (`reversePath`) — konsisten. Task 4 → Task 5 (handler + props) — konsisten. Task 6 → Task 5 (6 kunci tooltip + `ftNodeActions`) — Task 5 diimplementasi dulu tetap bisa (fallback label `TT[tip] || {t: k}`), label asli diverifikasi Task 7 setelah Task 6 selesai. Task 7 memakai semua hasil. Tidak ada konflik antarmuka lain.

## Progress

Task 1: complete (tests: node --test tests/node-path-actions.test.cjs → 4/4 pass; RED dulu: 4x "VE.joinNodes is not a function", GREEN sesudah implementasi). Catatan: .bak per-file tidak dibuat untuk Task 1 (edit sudah jalan sebelum backup) — keadaan pra-rencana tersimpan utuh di ZIP ronde 5b (Geovanta-TextPanel-Ronde5b-FIX.zip); Task 4–6 wajib .bak dulu sebelum edit.

Task 2: complete (tests: node --test tests/node-path-actions.test.cjs → 7/7 pass; RED dulu: 3x "VE.splitPath is not a function", GREEN sesudah implementasi).

Task 3: complete (tests: node --test tests/node-path-actions.test.cjs → 9/9 pass; RED dulu: 2x "VE.reversePath is not a function", GREEN sesudah implementasi).

Task 4: complete (handlers applyAutoSmooth/applyConvertToCurves/applyJoinNodes/applySplitPath/applyReversePath ditambah + 9 props baru ke toolbar; esbuild sintaks OK; npm run build:web exit 0).
- Task 4: Ruling: teks say() mengikuti blok kode yang dipin plan (Bahasa Indonesia saja) — kalimat plan soal ternary EN tidak sesuai praktik handler tetangga (applySmoothNodes/applyType/doInsert semuanya say() Indonesia saja). Cost jika salah: toast aksi baru tampil Indonesia saat UI berbahasa Inggris — sama seperti handler node yang sudah ada.

Task 5: complete (NODE_ACTIONS 15 baris + seksi Aksi Node & Path di Float nodeGrp, daftar aksi scroll maxHeight 260, pola disabled dropdown Boolean; esbuild sintaks OK; npm run build:web exit 0). Catatan: L.ftNodeActions belum ada saat Task 5 (baru Task 6) — fallback 'Aksi Node & Path' dipakai sementara.

Task 6: complete (6 kunci tooltip baru ID+EN + ftNodeActions ID+EN; tes node-path-actions 10/10; paritas TIPS 335/335, APP_STR 330/330, 0 kunci hilang).

Task 7: verifikasi browser — probe `probes/probe-node-actions.cjs` 21/21 PASS (3 run berturut-turut, 0 pageerror), `npm test` 106/106, `npm run build:web` exit 0. Regresi: ronde-5 text panel 17/17, topath 2/2, dblclick 4/4, stale-assets-fix 5/5, matriks selection box 20/20.
- Temuan probe 1 (BUG APLIKASI, diperbaiki): `sameSel` di cabang klik node (VectorEditor.jsx ~4170) hanya membandingkan objek + ukuran set node — klik node lain dengan jumlah seleksi sama tidak mengubah seleksi. Fix satu baris: tambah `&& [...nodes].every(k => sel.nodes.has(k))`. Rebuild + probe ulang lolos.
- Temuan probe 2 (CACAT PROBE, bukan aplikasi): A7 Close/Open awal diuji pada path hasil Split — ujung-ujungnya salinan node yang sama (tepi penutup panjang nol) + A8 ternyata menghapus node merged (bukan BL) karena urutan path sesudah Reverse adalah [BR'', merged, BL, BR'] — sehingga path jadi horizontal 3 node. A7 dipindah ke awal probe pada rect segar (Buka hapus sisi ke-4 nyata, Tutup kembalikan). A7b: 7 piksel beda (strip 503x2 di tepi atas selection-box) — artefak anti-aliasing 1px, bukan geometri; tepi penutup yang gagal kembali akan membuat ratusan piksel beda. Toleransi A7b didokumentasikan di probe (<=100 piksel).
- Jebakan probe: Escape membatalkan seleksi objek (tutup dropdown via klik chevron); `modifiers: ['Shift']` pada mouse.click tidak terbaca handler (pakai keyboard.down/up); banding buffer PNG mentah tidak andal (pakai pixelDiff piksel-per-piksel via canvas).
- Screenshot bukti (probes/): NA_dropdown_top.png + NA_dropdown_bottom.png (dropdown lengkap, lebar 260 cukup — label terpanjang "Haluskan Kurva Otomatis" tidak meluber), NA_close_open.png (rect terbuka), NA_outline_result.png (hasil Outline Stroke, node 3->5).
- Ruling: toleransi A7b (<=100 piksel) — dibenarkan bukti: diff hanya di strip tepi selection-box (503x2, 7 piksel), sisi penutup vertikal terbukti hilang/muncul via A7a; run pertama 0 piksel, run berikut 40 piksel lalu 7 piksel — artefak render 1px, bukan geometri path.
- Final review: [menunggu reviewer independen — diisi sesudah laporan review masuk]

Final review: reviewer independen (subagent) — 0 Critical, 1 Important, 7 Minor.
- I1 (Important, DIPERBAIKI): kelima handler baru selalu toast sukses walau aksi no-op (nilai kembali commitObjs diabaikan), padahal plan menuntut toast jelas untuk Join no-op. Perbaikan: kelima handler kini memakai boolean commitObjs (pola yang sama dengan applyMirror/doInsert yang sudah ada) — Join '2 node digabung' / 'Node tidak dapat digabung'; Split 'Path dipotong di node terpilih' / 'Path tidak dapat dipotong di node terpilih'; Reverse 'Arah path dibalik' / 'Arah path tidak dapat dibalik'; Convert 'Bentuk diubah menjadi kurva Bézier' / 'Bentuk sudah berupa kurva Bézier'; AutoSmooth '…dihaluskan otomatis' / 'Kurva sudah halus'. TDD: probe J0 (Join 2 node diagonal) RED dulu (toast "2 node digabung", node tetap 4) → GREEN sesudah fix (toast "Node tidak dapat digabung"). Probe akhir 24/24 (2 run berturut-turut, 0 pageerror), npm test 112/112.
- M2 (Minor, DIPERBAIKI): joinNodes dua subpath 1-node menghasilkan subpath 1-node (melanggar invarian deleteNodes). Guard sebaris `if (joined.length < 2) return o;` + tes unit baru. TDD: tes RED dulu → GREEN.
- M4 (Minor, DIPERBAIKI sebagai cakupan): 5 tes unit baru — merge wrap-around loop tertutup, split tertutup 2 node → 2 busur, join dua ujung awal (salah satu dibalik), reversePath satu subpath dari beberapa, join dua node smooth → tipe smooth. Kelimanya lolos pada implementasi yang ada (tes regresi, bukan RED).
- M1 (Minor, TEKS PLAN DIKOREKSI, bukan kode): penempatan id split tertutup 1 node di plan tertukar; implementasi + komentar kode benar (mengikuti konvensi kasus terbuka). Teks plan diperbaiki 2026-11-12.
- M6 (Minor, TEKS PLAN DIKOREKSI, bukan kode): plan menulis strokeWidth 1.8, padahal komponen bersama Vi meng-hardcode 2 — implementasi benar memakai Vi. Teks plan diperbaiki 2026-11-12.
- M3 (Minor, DEFERRED): seleksi node tidak disegarkan sesudah Join/Split (id yang dilebur masih di selNodes, tak terlihat). Dampak ke pengguna sudah dinetralkan fix I1 (Join kedua kini toast jujur "tidak dapat digabung"); sisa dampak kosmetik (klik berikut mengganti seleksi). Perbaikan penuh (set selNodes ke id gabungan) butuh penentuan id selamat di handler — ditunda, bukan cacat perilaku.
- M5 (Minor, BUKAN UNTUK TASK INI): klasifikasi ulang tipe di autoHandles preserveShape bersifat kondisional dan bisa menyentuh node tak disentuh bila satu segmen saja mendapat handle — perilaku warisan alat autohandle yang sudah ada.
- M7 (Minor, BUKAN UNTUK TASK INI): setClosed selalu commit (klik Tutup pada path yang sudah tertutup tetap membuat entri undo) — perilaku lama dari rail.
- Ruling: A1 probe diperbaiki saat J0 dimasukkan — pemilihan corners[0]/[1] tidak lagi andal karena seleksi J0 mengubah urutan corners (unselected dulu); A1 kini memilih dua node yang berbagi sisi (x atau y sama).
- Task 7: COMPLETE. Probe 24/24, npm test 112/112, build exit 0, regresi r5 17/17 + topath 2/2 + dblclick 4/4 + stale 5/5 + matriks 20/20 (0 pageerror).
