### Task 4: Cascade sisipan berurutan

**Files:**
- Modify: `src/components/editor/VectorEditor.jsx` (`onIconifyInsert` + ref penghitung)
- Test: `probes/probe-iconify-modal.cjs` (skenario cascade — ditambah ke file Task 3)

**Interfaces:**
- Consumes: `onIconifyInsert` (sudah ada — loadSet → buildIconSvg → parseSVG → skala frame 96 px → `commit` → `say` → `rememberRecentIcon`), `tool` (untuk reset penghitung saat modal ditutup).
- Produces: sisipan Iconify ke-`n` dari satu sesi modal (n = 0, 1, 2, …) bergeser `+24 * (n % 10)` px ke kanan-bawah dalam koordinat dokumen; hanya sisipan **berhasil** yang memajukan penghitung.

- [ ] **Step 1: Backup sebelum edit destruktif**

```bash
cp src/components/editor/VectorEditor.jsx src/components/editor/VectorEditor.jsx.bak-modal-t4
```

- [ ] **Step 2: Write the failing probe dulu (RED)** — tambah ke `probes/probe-iconify-modal.cjs`: `M6` sisip ikon yang sama 3× dari modal yang sama → bbox ke-2 bergeser (+24, +24) dan ke-3 (+48, +48) dari bbox pertama (toleransi ±2 px); `M7` tutup modal lalu buka lagi lalu sisip → bbox kembali ke tengah (offset reset); `M8` zoom 200% → pergeseran tetap 24 doc unit per langkah (Review Focus #1); `M9` sisipan gagal (blokir CDN untuk set itu) tidak memajukan penghitung — sisipan berhasil berikutnya bergeser +24 px, bukan +48 px (Review Focus #5). Jalankan melawan build Task 3 — Expected: FAIL (M6: ketiga bbox identik).

- [ ] **Step 3: Implement di `src/components/editor/VectorEditor.jsx`**
  - Ref baru `iconifyCascadeRef = useRef(0)` di dekat `onIconifyInsert`. Di dalam `onIconifyInsert`, sesudah `commit` berhasil (dan hanya sesudah berhasil — catch tidak menyentuh ref): `const step = iconifyCascadeRef.current % 10; const off = step * 24;` terapkan `dx += off; dy += off;` SEBELUM `VE.translate` (offset dalam koordinat dokumen), lalu `iconifyCascadeRef.current += 1`.
  - Reset: `useEffect` yang mengawasi `tool` — saat `tool` berubah dari `'iconify'` ke bukan-`'iconify'`, set `iconifyCascadeRef.current = 0`. (Modal tertutup ⟺ tool bukan `'iconify'`, karena `open={tool === 'iconify'}`.)
  - Tidak ada perubahan pada ukuran frame (96 px), pewarnaan, metadata, toast, atau `rememberRecentIcon`.

- [ ] **Step 4: Build + jalankan probe cascade (GREEN)**

Run:
```bash
npm run build:web
cd web && python3 -m http.server 9041
PROBE_THUMB_URL=http://127.0.0.1:9041/ node probes/probe-iconify-modal.cjs
```
Expected: M1–M9 PASS.

- [ ] **Step 5: `npm test` penuh tetap hijau**

Run: `npm test 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 6: Write the task report** — `docs/superpowers/plans/sdd-2026-11-15-iconify-modal/task-4-report.md`.

