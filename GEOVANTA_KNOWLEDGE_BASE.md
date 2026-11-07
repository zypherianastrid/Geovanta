# Geovanta — Katalog Komprehensif Seluruh Fitur, Fungsi, dan Pengetahuan Graf (Graphify)

> **Dokumentasi Lengkap Berbasis Graphify Knowledge Graph**  
> **Total File:** 89 file (`src/**` + `index.html`) | **Total Node:** 625 | **Total Edge:** 2,500 | **Komunitas:** 9 Komunitas

---

## 1. Ringkasan Arsitektur & Analisis Graphify

Geovanta adalah aplikasi editor grafis vektor 2D desktop murni offline (Windows 64-bit) dengan arsitektur modular tinggi, akselerasi GPU WebGL2 (dengan fallback Canvas 2D), sistem manipulasi kurva Bézier kubik analitik, auto-layout berbasis frame mirip Figma, serta mesin penyimpanan proyek offline berbasis IndexedDB dan ZIP (`.gv`).

### 1.1 Top 10 God Nodes (Abstraksi Inti Paling Terhubung)

- **`dist()`** (51 edges): Penghitung jarak Euclidean 2D dasar antar-titik (`Math.hypot`). Dipanggil di seluruh modul snapping, seleksi, hit-test, dan curve fitting.
- **`sub()`** (46 edges): Operasi vektor pengurangan 2D (`a - b`). Fondasi utama transformasi affine, De Casteljau, dan diferensiasi kurva.
- **`rd()`** (43 edges): Fungsi pembulatan presisi float numerik (`Math.round(v * 10000) / 10000`). Menjaga konsistensi serialisasi SVG dan mencegah floating point drift.
- **`SceneRenderer`** (39 edges): Orkestrator rendering GPU utama. Menghubungkan tree komponen React UI dengan state mesin WebGL2/Canvas 2D.
- **`VectorEditor()`** (33 edges): Komponen React canvas utama penampung event pointer, state kamera pan/zoom, manipulasi node, dan selection bounds.
- **`cross()`** (31 edges): Perkalian silang 2D (cross product). Menentukan orientasi belokan titik (winding), arah kurva, dan uji segitiga.
- **`cl()`** (31 edges): Kloning mendalam (deep clone) node vektor berserta koordinat handle kontrol in/out.
- **`uid()`** (30 edges): Generator ID unik deterministik untuk setiap subpath, node, objek gambar, teks, dan frame.
- **`clampN()`** (30 edges): Pembatas nilai numerik dalam rentang `[min, max]` untuk opacity, zoom, sudut rotasi, dan ukuran stroke.
- **`dot()`** (29 edges): Perkalian titik 2D (dot product). Menghitung proyeksi titik pada garis vektor, cosinus sudut, dan refleksi gradien.


### 1.2 Peta Komunitas (Graphify Clustering)

- **Community 0: Editor Canvas & UI Components**: Menangani komponen visual editor, toolbar aksi, sidebar layer, inspector properti, dan interaksi kontrol kanvas.
- **Community 1: Rendering Pipeline & GPU Geometry**: Menangani pipeline render GPU WebGL2, tessellator kurva adaptif, VBO vertex buffers, dan fallback kanvas 2D.
- **Community 2: Path Math & Document I/O**: Menangani parser/serializer SVG lengkap, konversi Arc ke Bézier, pembacaan format PostScript/AI, dan auto-layout frame.
- **Community 3: Affine Transforms & Snapping Solver**: Menangani matriks affine 2D, oriented bounding box, seleksi multi-objek, dan multi-constraint geometric snapping.
- **Community 4: Node Editing & Geometry Refinement**: Menangani pengeditan titik kurva, perbaikan anomali kurva, auto-refine geometri, dan pembuatan fillet pojok tajam.
- **Community 5: Topological Curve Simplifier**: Menangani penyederhanaan kurva topologis multi-level untuk mengompres jumlah node tanpa mengubah bentuk esensial.
- **Community 6: React Offline Runtime**: Implementasi internal bundle runtime React & ReactDOM tanpa dependensi jaringan eksternal.
- **Community 7: Workspace & Asset Management**: Menangani repositori proyek, pengelola aset font/gambar, controller penyimpanan IndexedDB, dan ZIP bundler.
- **Community 8: Tailwind CSS Offline Engine**: Mesin kompilasi utility CSS Tailwind runtime offline berbasis pemindaian class DOM secara dinamis.

---

## 2. Katalog Lengkap Seluruh File, Fungsi, dan Fitur (89 File)

### Domain: Root & Entrypoints (3 File)

#### 1. `index.html`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~16 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Dokumen HTML5 shell desktop utama yang memuat stylesheet font lokal, favicon SVG, elemen root container `#root`, dan entry script module `/src/main.jsx`.

- **Elemen & Konfigurasi Utama:**
  - `Root Element (#root)`: Container target untuk rendering React DOM tree.
  - `Vite Script Module`: Tag `<script type="module" src="/src/main.jsx">` untuk bootstrap aplikasi.
  - `Google Fonts Stylesheet Link`: Preload font typography editor.
  - `Favicon SVG`: Icon resmi aplikasi Geovanta.
---

#### 2. `src/App.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~448 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen akar aplikasi Geovanta yang menghubungkan WorkspaceHome, VectorEditor, & modal global

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (11 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `App` | Function | Ekspor | L23 | - |
  | `flash` | Arrow Function | Internal | L37 | `(t)` |
  | `onVisChange` | Arrow Function | Internal | L110 | - |
  | `onPageHide` | Arrow Function | Internal | L121 | - |
  | `handleOpenProject` | Arrow Function | Internal | L141 | `(projectId, forceDiscard = false)` |
  | `handleBackToWorkspace` | Arrow Function | Internal | L208 | `(currentDoc, currentViewState, forceDiscard = false)` |
  | `handleDocumentCommit` | Arrow Function | Internal | L255 | `(nextDoc, nextViewState)` |
  | `handleRestoreRecovery` | Arrow Function | Internal | L263 | - |
  | `handleIgnoreRecovery` | Arrow Function | Internal | L283 | - |
  | `handleEditorRenameSubmit` | Arrow Function | Internal | L301 | - |
  | `kd` | Arrow Function | Internal | L318 | `(e)` |

---

#### 3. `src/main.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~54 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Titik masuk utama (Entrypoint) aplikasi desktop Geovanta Tauri Windows 64-bit

- **Koneksi God Nodes:** Terhubung langsung ke `SceneRenderer`
- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

### Domain: Engine: Core Geometry & Math (23 File)

#### 4. `src/engine/affineAndOrientedBox.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver
- **Total Baris Kode:** ~605 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Matriks transformasi afine 2D, Oriented Bounding Box (OBB), handle resize/rotasi, urutan Z, & panduan jarak

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`
- **Daftar Fungsi, Komponen, Class & Konstanta (37 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `affineIdentity` | Function | Ekspor | L22 | - |
  | `affineTranslate` | Function | Ekspor | L25 | `(dx, dy)` |
  | `affineScale` | Function | Ekspor | L28 | `(sx, sy)` |
  | `affineRotate` | Function | Ekspor | L31 | `(rad)` |
  | `affineMul` | Function | Ekspor | L36 | `(a, b)` |
  | `affineDet` | Function | Ekspor | L39 | `(a)` |
  | `affineInverse` | Function | Ekspor | L42 | `(a)` |
  | `affinePt` | Function | Ekspor | L52 | `(a, p)` |
  | `transformRectBbox` | Function | Ekspor | L58 | `(a, r)` |
  | `normalizeDeg` | Function | Ekspor | L82 | `(deg)` |
  | `getObjBboxAngle` | Function | Ekspor | L89 | `(o)` |
  | `transformedAngle` | Function | Ekspor | L94 | `(angle, a)` |
  | `transformObjectGeomOnly` | Function | Ekspor | L106 | `(o, a)` |
  | `tr` | Arrow Function | Internal | L107 | `(q)` |
  | `transformObject` | Function | Ekspor | L121 | `(o, a, scaleStroke)` |
  | `tr` | Arrow Function | Internal | L123 | `(q)` |
  | `createOrientedBox` | Function | Ekspor | L174 | `(angle, rect)` |
  | `toDocPt` | Arrow Function | Internal | L177 | `(p)` |
  | `toLocal` | Arrow Function | Internal | L178 | `(p)` |
  | `docBboxAngle` | Function | Ekspor | L206 | `(doc, selIds)` |
  | `selectionOrientedBox` | Function | Ekspor | L217 | `(doc, selIds)` |
  | `VC_HANDLES` | Constant | Ekspor | L246 | - |
  | `VC_CORNERS` | Constant | Ekspor | L322 | - |
  | `hitHandle` | Function | Ekspor | L323 | `(r, lp, tol)` |
  | `inRotateZone` | Function | Ekspor | L331 | `(r, lp, inner, outer)` |
  | `boxHit` | Function | Ekspor | L342 | `(bx, p, zoom)` |
  | `scaleForDrag` | Function | Ekspor | L360 | `(r, handle, lp, proportional, fromCenter)` |
  | `clamp` | Arrow Function | Internal | L384 | `(s)` |
  | `rotateForDrag` | Function | Ekspor | L389 | `(center, start, p, snap)` |
  | `handleCursor` | Function | Ekspor | L403 | `(handle, boxAngle)` |
  | `rotateCursorForPt` | Function | Ekspor | L411 | `(center, p)` |
  | `arrangeZOrder` | Function | Ekspor | L420 | `(doc, selIds, mode)` |
  | `isBg` | Arrow Function | Internal | L423 | `(o)` |
  | `moveArr` | Arrow Function | Internal | L453 | `(arr, isSel)` |
  | `uSel` | Arrow Function | Internal | L471 | `(u)` |
  | `measureDistanceGuides` | Function | Ekspor | L484 | `(selBox, targetBox, isArtboard = false)` |
  | `fmt` | Arrow Function | Internal | L491 | `(v)` |

---

#### 5. `src/engine/arcToBezier.jsx`
- **Komunitas Graphify:** Path Math & Document I/O
- **Total Baris Kode:** ~88 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Konversi busur elips SVG (A/a) menjadi segmen kurva Bézier kubik

- **Daftar Fungsi, Komponen, Class & Konstanta (5 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `arcToCubics` | Function | Ekspor | L8 | `(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2)` |
  | `pt` | Arrow Function | Internal | L42 | `(a)` |
  | `dv` | Arrow Function | Internal | L43 | `(a)` |
  | `arcArgs` | Function | Ekspor | L57 | `(str, warnCb)` |
  | `rdr` | Arrow Function | Internal | L62 | `(r)` |

---

#### 6. `src/engine/autoRefineGeometry.jsx`
- **Komunitas Graphify:** Node Editing & Geometry Refinement
- **Total Baris Kode:** ~1485 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Analisis zona sudut multi-skala & penghapusan node non-sudut otomatis (Auto-Refine)

- **Koneksi God Nodes:** Terhubung langsung ke `cl()`, `cross()`, `dist()`, `dot()`, `rd()`, `sub()`
- **Daftar Fungsi, Komponen, Class & Konstanta (38 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `turningAngle3Pt` | Function | Ekspor | L25 | `(pPrev, pCurr, pNext)` |
  | `fitLocalLineOLS` | Function | Ekspor | L46 | `(pts)` |
  | `analyzeMultiScaleCornerZone` | Function | Ekspor | L109 | `(ns, closed, idxCenter, armLookahead = 5, mode = 'logo')` |
  | `idx` | Arrow Function | Internal | L114 | `(k)` |
  | `classifySubpathNodesDynamic` | Function | Ekspor | L302 | `(sp, opt = {})` |
  | `idx` | Arrow Function | Internal | L317 | `(k)` |
  | `consolidateSharpCornerClusters` | Function | Ekspor | L459 | `(sp, isSharedNode, opt = {})` |
  | `simplifyWithSharpCornerPreservation` | Function | Ekspor | L543 | `(sp, isSharedNode, opt = {})` |
  | `verifyChordDeviation` | Arrow Function | Internal | L566 | `(A, B, originalPts, maxTol)` |
  | `P0` | Constant | Internal | L602 | - |
  | `pruneNonCornerSub` | Function | Ekspor | L693 | `(sp, isShared, opt = {})` |
  | `ARM_GAP` | Constant | Internal | L698 | - |
  | `at` | Arrow Function | Internal | L734 | `(k)` |
  | `inR` | Arrow Function | Internal | L735 | `(k)` |
  | `pointAtArc` | Arrow Function | Internal | L738 | `(k0, dir, dd)` |
  | `armPts` | Arrow Function | Internal | L751 | `(k0, dir)` |
  | `ptSeg` | Arrow Function | Internal | L766 | `(p, a, b)` |
  | `tanDir` | Arrow Function | Internal | L772 | `(k, mode)` |
  | `arcD` | Arrow Function | Internal | L831 | `(i, j)` |
  | `ptsR` | Arrow Function | Internal | L906 | `(k0, k1)` |
  | `isCornerNode` | Arrow Function | Internal | L911 | `(nd)` |
  | `solve` | Arrow Function | Internal | L912 | `(a, b, tA, tB)` |
  | `far` | Arrow Function | Internal | L953 | `(P, Q)` |
  | `PA` | Constant | Internal | L999 | - |
  | `deleteNonCornerNodes` | Function | Ekspor | L1043 | `(doc, opt = {})` |
  | `coordKey` | Arrow Function | Internal | L1045 | `(x, y)` |
  | `isShared` | Arrow Function | Internal | L1058 | `(n)` |
  | `autoRefineGeometry` | Function | Ekspor | L1111 | `(doc, opt = {})` |
  | `coordKey` | Arrow Function | Internal | L1132 | `(x, y)` |
  | `isShared` | Arrow Function | Internal | L1145 | `(n)` |
  | `fillToRgb` | Arrow Function | Internal | L1146 | `(f)` |
  | `isWobblySeg` | Arrow Function | Internal | L1159 | `(a, b)` |
  | `canonicalAngle` | Arrow Function | Internal | L1178 | `(a, b)` |
  | `estimateSingleRadius` | Arrow Function | Internal | L1188 | `(pv, cu, nx, fillRgb)` |
  | `diff` | Arrow Function | Internal | L1208 | `(x, y)` |
  | `subOf` | Arrow Function | Internal | L1231 | `(o, sid)` |
  | `idxOf` | Arrow Function | Internal | L1232 | `(sp, id)` |
  | `refineObject` | Arrow Function | Internal | L1233 | `(obj)` |

---

#### 7. `src/engine/bezierSubdivisionAndMove.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver
- **Total Baris Kode:** ~240 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Subdivisi kurva De Casteljau (Split Segment / Insert Node) & translasi geometri

- **Koneksi God Nodes:** Terhubung langsung ke `cl()`, `rd()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (9 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `splitSeg` | Function | Ekspor | L11 | `(a, b, t)` |
  | `insertNode` | Function | Ekspor | L64 | `(o, subId, i, t)` |
  | `insertMid` | Function | Ekspor | L83 | `(o, ids)` |
  | `segPoint` | Function | Ekspor | L106 | `(a, b, t)` |
  | `mapFil` | Arrow Function | Ekspor | L118 | `(fil, fn, k = 1)` |
  | `translate` | Function | Ekspor | L129 | `(o, dx, dy)` |
  | `mv` | Arrow Function | Internal | L130 | `(q)` |
  | `moveNodes` | Function | Ekspor | L186 | `(o, ids, dx, dy)` |
  | `cloneObj` | Arrow Function | Ekspor | L218 | `(o)` |

---

#### 8. `src/engine/cornerFilletEngine.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Node Editing & Geometry Refinement, Path Math & Document I/O
- **Total Baris Kode:** ~663 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin pembulatan sudut (Corner Fillet / Radius) analitik pada garis dan kurva Bézier

- **Koneksi God Nodes:** Terhubung langsung ke `cl()`, `cross()`, `dist()`, `dot()`, `sub()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (18 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `filletGeo` | Function | Ekspor | L8 | `(pv, cu, nx, radius, opt)` |
  | `bzSplit` | Function | Ekspor | L46 | `(p0, c1, c2, p3, t)` |
  | `L` | Arrow Function | Internal | L47 | `(a, b)` |
  | `filletCurveGeo` | Function | Ekspor | L61 | `(pv, cu, nx, radius, opt)` |
  | `L1` | Constant | Internal | L73 | - |
  | `L2` | Constant | Internal | L74 | - |
  | `TA` | Constant | Internal | L83 | - |
  | `TB` | Constant | Internal | L84 | - |
  | `fillet` | Function | Ekspor | L98 | `(o, ids, radius, opt)` |
  | `refillet` | Function | Ekspor | L106 | `(o, gids, radius, opt)` |
  | `setSelectedNodesRadius` | Function | Ekspor | L271 | `(o, selIds, radius, opt)` |
  | `pair` | Arrow Function | Internal | L290 | `(A, B)` |
  | `restoreOne` | Arrow Function | Internal | L291 | `(pv, A, nx)` |
  | `hasFillet` | Arrow Function | Ekspor | L589 | `(o)` |
  | `restoreFillets` | Function | Ekspor | L592 | `(o)` |
  | `pair` | Arrow Function | Internal | L597 | `(A, B)` |
  | `restorePair` | Arrow Function | Internal | L598 | `(pv, A, nx)` |
  | `setCornerRadius` | Function | Ekspor | L647 | `(o, r, opt)` |

---

#### 9. `src/engine/curveFittingAndAnomalies.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Node Editing & Geometry Refinement
- **Total Baris Kode:** ~802 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Pencocokan lingkaran Kåsa, pencocokan kurva Schneider, & deteksi anomali geometri vektor

- **Koneksi God Nodes:** Terhubung langsung ke `cl()`, `cross()`, `dist()`, `dot()`, `rd()`, `sub()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (24 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `kasaFit` | Function | Ekspor | L14 | `(pts)` |
  | `schneiderFit` | Function | Ekspor | L72 | `(points, t1, t2, tol)` |
  | `qb` | Arrow Function | Internal | L77 | `(B, t)` |
  | `q1b` | Arrow Function | Internal | L85 | `(B, t)` |
  | `q2b` | Arrow Function | Internal | L89 | `(B, t)` |
  | `genB` | Arrow Function | Internal | L93 | `(pts, u, tan1, tan2)` |
  | `maxErrB` | Arrow Function | Internal | L125 | `(pts, B, u)` |
  | `repB` | Arrow Function | Internal | L138 | `(pts, u, B)` |
  | `fitRec` | Arrow Function | Internal | L151 | `(pts, tan1, tan2)` |
  | `HTOL` | Constant | Ekspor | L189 | - |
  | `hasH` | Arrow Function | Ekspor | L190 | `(nd, h)` |
  | `segStraight` | Arrow Function | Ekspor | L193 | `(a, b)` |
  | `chainStraight` | Arrow Function | Ekspor | L194 | `(nodes, idxs)` |
  | `makeClaim` | Arrow Function | Ekspor | L200 | - |
  | `idIndex` | Arrow Function | Ekspor | L220 | `(nodes)` |
  | `findCornerClusters` | Function | Ekspor | L228 | `(nodes, closed, eps = 4.0, minAngleDeg = 20)` |
  | `findCollinearNodes` | Function | Ekspor | L323 | `(nodes, closed, tol = 0.25)` |
  | `findWobblySpans` | Function | Ekspor | L354 | `(nodes, closed)` |
  | `findFacetedCurves` | Function | Ekspor | L426 | `(nodes, closed)` |
  | `findDenseArcNodes` | Function | Ekspor | L496 | `(nodes, closed)` |
  | `EMPTY_INSPECTION` | Constant | Ekspor | L564 | - |
  | `detectAnomalies` | Function | Ekspor | L580 | `(doc, opt = {})` |
  | `collapseClusters` | Function | Ekspor | L708 | `(nodes, clusters)` |
  | `refitChain` | Function | Ekspor | L740 | `(nodes, closed, ids, tol)` |

---

#### 10. `src/engine/figmaAutoLayoutAndFrames.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Path Math & Document I/O
- **Total Baris Kode:** ~696 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin Frame ala Figma, Auto Layout baris/kolom, padding artboard, & auto-reparenting objek

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (17 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `readingOrder` | Function | Ekspor | L16 | `(boxes)` |
  | `clusterLayoutUnits` | Function | Ekspor | L37 | `(rawItems)` |
  | `find` | Arrow Function | Internal | L52 | `(x)` |
  | `unite` | Arrow Function | Internal | L59 | `(a, b)` |
  | `applyFramePadding` | Function | Ekspor | L113 | `(doc, selObjs, cfg)` |
  | `applyAutoLayout` | Function | Ekspor | L164 | `(doc, selObjs, cfg)` |
  | `LM` | Constant | Internal | L237 | - |
  | `createFrame` | Function | Ekspor | L343 | `(doc, selObjs, cfg)` |
  | `isFrameMember` | Arrow Function | Ekspor | L437 | `(o)` |
  | `frameBgOf` | Arrow Function | Ekspor | L438 | `(doc, fid)` |
  | `frameBounds` | Function | Ekspor | L441 | `(doc, fid)` |
  | `listFrames` | Function | Ekspor | L449 | `(doc, excludeIds)` |
  | `compactGroups` | Function | Ekspor | L473 | `(objs)` |
  | `reparentDroppedObjects` | Function | Ekspor | L508 | `(doc, draggedIds, opt)` |
  | `NO` | Constant | Internal | L511 | - |
  | `inferFrameAutoLayout` | Function | Ekspor | L593 | `(doc, frameGroup)` |
  | `applyArtboardPadding` | Function | Ekspor | L673 | `(doc, selObjs, pad)` |

---

#### 11. `src/engine/gradientEngine.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Path Math & Document I/O
- **Total Baris Kode:** ~413 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin interpolasi gradien multi-stop OKLab/sRGB, kompilasi stop, & proyeksi sudut

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (17 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `mapGrad` | Arrow Function | Ekspor | L12 | `(g, f, k)` |
  | `gradOn` | Arrow Function | Ekspor | L59 | `(o)` |
  | `strokeGradOn` | Arrow Function | Ekspor | L60 | `(o)` |
  | `gradXml` | Arrow Function | Ekspor | L61 | `(g, id, ox = 0, oy = 0)` |
  | `r` | Arrow Function | Internal | L62 | `(v)` |
  | `hex2ok` | Function | Ekspor | L75 | `(hex)` |
  | `sampleGradAt` | Function | Ekspor | L82 | `(stops, t)` |
  | `compileGradStops` | Function | Ekspor | L120 | `(rawStops, useOklab = true)` |
  | `simplifyGradStops` | Function | Ekspor | L159 | `(stops, tol = 0.022)` |
  | `rdp` | Arrow Function | Internal | L174 | `(i, j)` |
  | `simplifyGradStopsTo` | Function | Ekspor | L216 | `(stops, maxN = 8, startTol = 0.012)` |
  | `ensureGradModel` | Function | Ekspor | L229 | `(o, desiredType)` |
  | `updateGradStops` | Function | Ekspor | L337 | `(o, nextRawStops, extraGradProps)` |
  | `gradAngleDeg` | Function | Ekspor | L357 | `(g)` |
  | `setGradAngleDeg` | Function | Ekspor | L361 | `(o, deg)` |
  | `projectPointToGrad` | Function | Ekspor | L384 | `(g, pt)` |
  | `gradPointAt` | Function | Ekspor | L399 | `(g, t)` |

---

#### 12. `src/engine/multiSnapSolver.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Node Editing & Geometry Refinement
- **Total Baris Kode:** ~1315 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin snapping presisi tinggi (Grid, BBox, Node, Kurva, Sumbu, & Smart Spacing)

- **Koneksi God Nodes:** Terhubung langsung ke `cross()`, `dist()`, `dot()`, `sub()`
- **Daftar Fungsi, Komponen, Class & Konstanta (19 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `snapPt` | Function | Ekspor | L11 | `(p, objects, exObjs, exNodes, thr, grid, noEdge, noHandle, hLines, noNode, midpoints)` |
  | `snapMany` | Function | Ekspor | L149 | `(pts, objects, exObjs, exNodes, thr, opt)` |
  | `rebuildHandle` | Function | Ekspor | L175 | `(n, w, t, alt)` |
  | `snapHandleCurve` | Function | Ekspor | L200 | `(objects, objId, nodeId, w, tg, alt, thr, noNode)` |
  | `segsOf` | Arrow Function | Internal | L224 | `(nn)` |
  | `contact` | Arrow Function | Internal | L230 | `(t)` |
  | `at` | Arrow Function | Internal | L267 | `(arr, tt)` |
  | `dd` | Arrow Function | Internal | L268 | `(tt)` |
  | `snapOutline` | Function | Ekspor | L334 | `(samples, segs, objects, exObjs, thr, dx, dy, opt)` |
  | `LINE_BUCKET_SZ` | Constant | Ekspor | L412 | - |
  | `addLineToBuckets` | Function | Ekspor | L413 | `(buckets, ln)` |
  | `queryLineBuckets` | Function | Ekspor | L422 | `(buckets, val, thr, fn)` |
  | `buildSnapCache` | Function | Ekspor | L432 | `(doc, exObjs, exNodes, cfg, noBoxObjs)` |
  | `pushX` | Arrow Function | Internal | L441 | `(ln)` |
  | `pushY` | Arrow Function | Internal | L445 | `(ln)` |
  | `ptHash` | Function | Ekspor | L628 | `(C, cell)` |
  | `solveMultiSnap` | Function | Ekspor | L648 | `(p, cache, objects, exObjs, exNodes, thr, gridStep, cfg, dragBBox, extra)` |
  | `nowFn` | Arrow Function | Internal | L649 | - |
  | `rnd` | Arrow Function | Internal | L864 | `(v)` |

---

#### 13. `src/engine/nodeEditingAndHandles.jsx`
- **Komunitas Graphify:** Node Editing & Geometry Refinement
- **Total Baris Kode:** ~441 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Operasi penajaman sudut, penghalusan node, Auto-Handle Catmull-Rom, & pencerminan handle

- **Koneksi God Nodes:** Terhubung langsung ke `cl()`, `cross()`, `dist()`, `dot()`, `sub()`
- **Daftar Fungsi, Komponen, Class & Konstanta (7 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `sharpenCorners` | Function | Ekspor | L12 | `(o, ids)` |
  | `smoothSelectedNodes` | Function | Ekspor | L71 | `(o, ids, strength)` |
  | `step` | Arrow Function | Internal | L81 | `(f)` |
  | `autoHandles` | Function | Ekspor | L150 | `(o, spId, opt)` |
  | `deleteNodes` | Function | Ekspor | L300 | `(o, ids)` |
  | `mirrorNodes` | Function | Ekspor | L317 | `(o, ids, mode, hkeys)` |
  | `typeNodes` | Function | Ekspor | L394 | `(o, ids, type)` |

---

#### 14. `src/engine/postscriptAiRasterIo.jsx`
- **Komunitas Graphify:** Path Math & Document I/O
- **Total Baris Kode:** ~689 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Parser & eksportir multi-format: PostScript (.eps), Adobe Illustrator (.ai), dan Raster (.png/.jpg/.webp)

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (31 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `b64enc` | Arrow Function | Ekspor | L22 | `(str)` |
  | `b64dec` | Arrow Function | Ekspor | L28 | `(b)` |
  | `embedLines` | Arrow Function | Ekspor | L36 | `(svg)` |
  | `readEmbedded` | Arrow Function | Ekspor | L37 | `(raw)` |
  | `inflateBytes` | Function | Ekspor | L50 | `(u8)` |
  | `looksText` | Arrow Function | Ekspor | L65 | `(s)` |
  | `OPS_RE` | Constant | Ekspor | L74 | - |
  | `extractPSStreams` | Function | Ekspor | L78 | `(buffer)` |
  | `isVec` | Arrow Function | Internal | L142 | `(r)` |
  | `decode` | Arrow Function | Internal | L144 | `(r)` |
  | `parsePSorAI` | Function | Ekspor | L181 | `(buffer)` |
  | `cl01` | Arrow Function | Internal | L194 | `(v)` |
  | `cmykHex` | Arrow Function | Internal | L195 | `(c, m, y, k)` |
  | `rgbHex` | Arrow Function | Internal | L199 | `(r, g, b)` |
  | `grayHex` | Arrow Function | Internal | L203 | `(g)` |
  | `notePsUnsupported` | Arrow Function | Internal | L218 | `(opName)` |
  | `trPt` | Arrow Function | Internal | L221 | `(x, y)` |
  | `popN` | Arrow Function | Internal | L237 | `(k)` |
  | `flushPath` | Arrow Function | Internal | L238 | `(doFill, doStroke, evenodd, closeFirst)` |
  | `startIfNone` | Arrow Function | Internal | L262 | - |
  | `hex01` | Arrow Function | Ekspor | L476 | `(hx)` |
  | `hasPaint` | Arrow Function | Ekspor | L480 | `(o)` |
  | `pathOps` | Function | Ekspor | L488 | `(o, mv, ln, cu, cz)` |
  | `exportEPS` | Function | Ekspor | L512 | `(doc, opt)` |
  | `exportAI` | Function | Ekspor | L537 | `(doc, opt)` |
  | `exportRaster` | Function | Ekspor | L586 | `(doc, opt, format, scale, quality)` |
  | `cleanup` | Arrow Function | Internal | L593 | - |
  | `safeResolve` | Arrow Function | Internal | L605 | `(val)` |
  | `safeReject` | Arrow Function | Internal | L611 | `(err)` |
  | `MAXD` | Constant | Internal | L623 | - |
  | `MAXA` | Constant | Internal | L624 | - |

---

#### 15. `src/engine/selectionTransformAndAlign.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver
- **Total Baris Kode:** ~305 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Operasi penjajaran objek (Alignment), distribusi, posisi, dimensi, rotasi, & pencerminan seleksi

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`
- **Daftar Fungsi, Komponen, Class & Konstanta (12 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `selectionMetrics` | Function | Ekspor | L18 | `(doc, selObjs, selNodes)` |
  | `grow` | Arrow Function | Internal | L25 | `(a, b, c, d)` |
  | `pinPoint` | Function | Ekspor | L69 | `(m, pin)` |
  | `shiftNode` | Arrow Function | Ekspor | L77 | `(n, dx, dy)` |
  | `alignSelection` | Function | Ekspor | L96 | `(doc, selObjs, selNodes, mode)` |
  | `setSelectionPosition` | Function | Ekspor | L207 | `(doc, selObjs, selNodes, axis, val, pin)` |
  | `scaleObjXY` | Function | Ekspor | L223 | `(o, px, py, sx, sy, scaleStroke)` |
  | `tr` | Arrow Function | Internal | L225 | `(q)` |
  | `setSelectionDimension` | Function | Ekspor | L251 | `(doc, selObjs, axis, newVal, opt)` |
  | `rotateObjAround` | Function | Ekspor | L270 | `(o, px, py, degDelta)` |
  | `setSelectionRotation` | Function | Ekspor | L275 | `(doc, selObjs, degTarget, isDelta, pin)` |
  | `flipSelection` | Function | Ekspor | L287 | `(doc, selObjs, axis, pin)` |

---

#### 16. `src/engine/spatialIndexAndHitTest.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver
- **Total Baris Kode:** ~523 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Kalkulasi kotak batas analitik (Tight BBox), indeks spasial dokumen, & hit-testing objek

- **Koneksi God Nodes:** Terhubung langsung ke `dist()`, `dot()`, `sub()`
- **Daftar Fungsi, Komponen, Class & Konstanta (18 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `TBB` | Constant | Ekspor | L15 | - |
  | `SEG_LUT_CACHE` | Constant | Ekspor | L16 | - |
  | `DOC_SPATIAL_CACHE` | Constant | Ekspor | L17 | - |
  | `cubicExtrema1D` | Function | Ekspor | L21 | `(p0, p1, p2, p3, outT)` |
  | `segAnalyticBBox` | Function | Ekspor | L40 | `(a, b)` |
  | `tightBBox` | Function | Ekspor | L72 | `(o)` |
  | `getSegLut` | Function | Ekspor | L107 | `(a, b)` |
  | `nearOnSeg` | Function | Ekspor | L131 | `(a, b, p)` |
  | `getDocSpatialIndex` | Function | Ekspor | L212 | `(objects)` |
  | `cellKey` | Arrow Function | Internal | L241 | `(cx, cy)` |
  | `putCell` | Arrow Function | Internal | L245 | `(map, k, item)` |
  | `queryPoint` | Arrow Function | Internal | L262 | `(x, y, rad, fnPt)` |
  | `querySegments` | Arrow Function | Internal | L321 | `(x, y, rad, fnSeg)` |
  | `queryObjectsInRect` | Arrow Function | Internal | L350 | `(rx0, ry0, rx1, ry1)` |
  | `updateSpatialIndexForObjects` | Function | Ekspor | L408 | `(prevObjects, nextObjects, dirtyIds)` |
  | `putCell` | Arrow Function | Internal | L423 | `(map, k, item)` |
  | `isHittable` | Function | Ekspor | L462 | `(o)` |
  | `hitTestObject` | Function | Ekspor | L470 | `(o, pt, tol = 2, opts = {})` |

---

#### 17. `src/engine/straightenAndAlignNodes.jsx`
- **Komunitas Graphify:** Node Editing & Geometry Refinement
- **Total Baris Kode:** ~643 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Operasi pelurusan segmen kurva (Straighten) & penjajaran node/handle ke garis regresi

- **Koneksi God Nodes:** Terhubung langsung ke `cl()`, `cross()`, `dist()`, `dot()`, `sub()`
- **Daftar Fungsi, Komponen, Class & Konstanta (17 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `mapSubs` | Arrow Function | Ekspor | L8 | `(o, f)` |
  | `straightenSub` | Function | Ekspor | L15 | `(sp, tol, angDeg)` |
  | `strait` | Arrow Function | Internal | L20 | `(a, b)` |
  | `turn` | Arrow Function | Internal | L26 | `(i)` |
  | `tlsFit` | Arrow Function | Internal | L43 | `(i, k)` |
  | `can` | Arrow Function | Internal | L81 | `(i, k)` |
  | `fixEnd` | Arrow Function | Internal | L104 | `(nd, u, start)` |
  | `straighten` | Arrow Function | Ekspor | L143 | `(o, tol, ang)` |
  | `lineFit` | Arrow Function | Ekspor | L154 | `(pts, snapDeg)` |
  | `projLine` | Arrow Function | Ekspor | L206 | `(p, c, d)` |
  | `alignNodes` | Function | Ekspor | L213 | `(o, ids, opt)` |
  | `alignHandles` | Function | Ekspor | L287 | `(o, keys, opt)` |
  | `has` | Arrow Function | Internal | L297 | `(i, w)` |
  | `setH` | Arrow Function | Internal | L298 | `(i, w, q)` |
  | `alignNodesAtAngle` | Function | Ekspor | L382 | `(o, ids, opt)` |
  | `slideOrProj` | Arrow Function | Internal | L509 | `(pt, rRail, straightNeighbor)` |
  | `measureSelectedNodesAngle` | Function | Ekspor | L617 | `(o, ids)` |

---

#### 18. `src/engine/svgDocumentParser.jsx`
- **Komunitas Graphify:** Path Math & Document I/O
- **Total Baris Kode:** ~616 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Parser DOM dokumen SVG lengkap beserta pewarisan gaya, grup, teks, gambar, & gradien

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (15 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `parseSVG` | Function | Ekspor | L14 | `(str)` |
  | `noteUnsupported` | Arrow Function | Internal | L36 | `(tag, id, reason)` |
  | `noteWarn` | Arrow Function | Internal | L40 | `(tag, id, reason)` |
  | `gHref` | Arrow Function | Internal | L53 | `(e)` |
  | `gattr` | Arrow Function | Internal | L96 | `(el, k)` |
  | `gstops` | Arrow Function | Internal | L105 | `(el, inheritedColor)` |
  | `pm` | Arrow Function | Internal | L111 | `(k)` |
  | `attachGrad` | Arrow Function | Internal | L131 | `(po, paintStr, m, targetKey = 'fill', inheritedColor = '#18181b')` |
  | `num` | Arrow Function | Internal | L159 | `(k, def)` |
  | `P` | Arrow Function | Internal | L165 | `(x, y)` |
  | `X2` | Constant | Internal | L172 | - |
  | `prop` | Arrow Function | Internal | L246 | `(el, k)` |
  | `computeEffectiveStrokeScale` | Arrow Function | Internal | L265 | `(m, subs)` |
  | `MAX_SVG_DEPTH` | Constant | Internal | L294 | - |
  | `walk` | Arrow Function | Internal | L295 | `(el, inh, grp, mat, depth = 0, useStack = null)` |

---

#### 19. `src/engine/svgDocumentSerializer.jsx`
- **Komunitas Graphify:** Path Math & Document I/O
- **Total Baris Kode:** ~114 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Serialisasi dokumen Geovanta kembali menjadi kode standar XML SVG

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`
- **Daftar Fungsi, Komponen, Class & Konstanta (3 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `serializeDoc` | Function | Ekspor | L11 | `(doc, opt)` |
  | `uq` | Arrow Function | Internal | L45 | `(b)` |
  | `r6` | Arrow Function | Internal | L54 | `(v)` |

---

#### 20. `src/engine/svgPathParser.jsx`
- **Komunitas Graphify:** Path Math & Document I/O
- **Total Baris Kode:** ~205 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Parser ketat tata bahasa atribut d path SVG menjadi struktur subpath & node

- **Koneksi God Nodes:** Terhubung langsung ke `cross()`, `dot()`, `sub()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (5 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `parsePath` | Function | Ekspor | L10 | `(d, mat, warnCb)` |
  | `mk` | Arrow Function | Internal | L22 | `(x, y)` |
  | `begin` | Arrow Function | Internal | L30 | `(x, y)` |
  | `line` | Arrow Function | Internal | L38 | `(x, y)` |
  | `cubic` | Arrow Function | Internal | L44 | `(x1, y1, x2, y2, x, y)` |

---

#### 21. `src/engine/svgPathSerializer.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Path Math & Document I/O
- **Total Baris Kode:** ~74 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Serialisasi presisi tinggi IEEE-754 subpath & generator path bentuk dasar

- **Daftar Fungsi, Komponen, Class & Konstanta (9 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `SUB_D` | Constant | Ekspor | L9 | - |
  | `rdCoord` | Arrow Function | Ekspor | L10 | `(v)` |
  | `pc2` | Arrow Function | Ekspor | L14 | `(p, ox = 0, oy = 0)` |
  | `seg` | Arrow Function | Ekspor | L15 | `(a, b, ox = 0, oy = 0)` |
  | `serializeSub` | Function | Ekspor | L16 | `(sp, ox = 0, oy = 0)` |
  | `serializePath` | Arrow Function | Ekspor | L34 | `(o, ox = 0, oy = 0)` |
  | `nodeCount` | Arrow Function | Ekspor | L35 | `(o)` |
  | `shapeD` | Function | Ekspor | L39 | `(el)` |
  | `g` | Arrow Function | Internal | L40 | `(k)` |

---

#### 22. `src/engine/textAndImageEngine.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Path Math & Document I/O
- **Total Baris Kode:** ~386 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin pengukuran kotak teks vektor & geometri objek gambar pada kanvas

- **Koneksi God Nodes:** Terhubung langsung ke `rd()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (15 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `getTextMeasureCtx` | Function | Ekspor | L14 | - |
  | `formatTextLines` | Function | Ekspor | L22 | `(txt)` |
  | `measureTextBox` | Function | Ekspor | L29 | `(txt)` |
  | `buildTextSubs` | Function | Ekspor | L85 | `(txt)` |
  | `makeTextObj` | Function | Ekspor | L125 | `(opts = {}, mat = null)` |
  | `updateTextObj` | Function | Ekspor | L182 | `(o, patch)` |
  | `syncTextTransformFromSubs` | Function | Ekspor | L198 | `(o)` |
  | `textMatrix` | Function | Ekspor | L237 | `(o)` |
  | `makeImageObj` | Function | Ekspor | L256 | `(href, w, h, x, y, name, par, m, naturalW, naturalH)` |
  | `imageMatrix` | Function | Ekspor | L279 | `(o)` |
  | `computeImageParGeometry` | Function | Ekspor | L303 | `(o, naturalW, naturalH)` |
  | `scaleObj` | Function | Ekspor | L334 | `(o, ax, ay, k)` |
  | `f` | Arrow Function | Internal | L335 | `(q)` |
  | `docBounds` | Function | Ekspor | L361 | `(doc, only)` |
  | `add` | Arrow Function | Internal | L366 | `(x, y, pad)` |

---

#### 23. `src/engine/topologicalCurveSimplifier.jsx`
- **Komunitas Graphify:** Node Editing & Geometry Refinement, Topological Curve Simplifier
- **Total Baris Kode:** ~1844 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin penyederhanaan kurva topologis (Simplify Path) & perbaikan otomatis anomali vektor

- **Koneksi God Nodes:** Terhubung langsung ke `cl()`, `cross()`, `dist()`, `dot()`, `sub()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (66 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `SIMPLIFY_LEVEL` | Constant | Ekspor | L17 | - |
  | `VC_MAX_REPARAM` | Constant | Ekspor | L18 | - |
  | `VC_MEASURE_LIMIT` | Constant | Ekspor | L19 | - |
  | `simplifyLevelTolerance` | Function | Ekspor | L20 | `(level)` |
  | `autoSimplifyLevel` | Function | Ekspor | L27 | `(size)` |
  | `vcUnit` | Function | Ekspor | L32 | `(v)` |
  | `vcStartTangent` | Function | Ekspor | L39 | `(c)` |
  | `vcEndTangent` | Function | Ekspor | L45 | `(c)` |
  | `vcDedup` | Function | Ekspor | L51 | `(pts)` |
  | `vcChordParams` | Function | Ekspor | L64 | `(pts)` |
  | `vcBern` | Function | Ekspor | L77 | `(u)` |
  | `vcEvalCubic` | Function | Ekspor | L81 | `(c, t)` |
  | `vcGenerate` | Function | Ekspor | L88 | `(pts, u, t0, t1)` |
  | `vcMaxError` | Function | Ekspor | L156 | `(pts, c, u)` |
  | `vcNewton` | Function | Ekspor | L183 | `(c, p, u)` |
  | `vcFitSingleFrom` | Function | Ekspor | L203 | `(pts, uIn, t0, t1)` |
  | `vcFitSingle` | Function | Ekspor | L226 | `(pts, t0, t1)` |
  | `vcFitRec` | Function | Ekspor | L232 | `(pts, t0, t1, tol, out, depth)` |
  | `vcFitCubics` | Function | Ekspor | L268 | `(pts, t0, t1, tol)` |
  | `vcIsStraight` | Function | Ekspor | L275 | `(c, tol)` |
  | `vcSample` | Function | Ekspor | L293 | `(c, m, pts, includeStart)` |
  | `VC_GL5_X` | Constant | Ekspor | L301 | - |
  | `VC_GL5_W` | Constant | Ekspor | L302 | - |
  | `vcCubicSpeedAt` | Function | Ekspor | L303 | `(c, t)` |
  | `vcGaussArclenInterval` | Function | Ekspor | L309 | `(c, t0, t1)` |
  | `vcMeasuredArclen` | Function | Ekspor | L318 | `(c, accuracy = 1e-6)` |
  | `ok` | Arrow Function | Internal | L319 | `(p)` |
  | `vcIsCollinearHandles` | Function | Ekspor | L337 | `(p, a, b)` |
  | `vcAnchorWithHandles` | Function | Ekspor | L346 | `(pos, hIn, hOut, keepId = null)` |
  | `vcWithHandle` | Function | Ekspor | L369 | `(node, out, h)` |
  | `vcSubpathSegCount` | Function | Ekspor | L387 | `(sp)` |
  | `vcSubpathSegment` | Function | Ekspor | L391 | `(sp, i)` |
  | `vcSubpathSegIsLine` | Function | Ekspor | L418 | `(sp, i)` |
  | `vcSubpathSegs` | Function | Ekspor | L426 | `(sp)` |
  | `vcSegLine` | Function | Ekspor | L438 | `(a, b)` |
  | `vcSegsToSubpath` | Function | Ekspor | L461 | `(segs, closed, spId)` |
  | `vcTurnDeg` | Function | Ekspor | L482 | `(a, b)` |
  | `vcJointTurnDeg` | Function | Ekspor | L491 | `(a, b)` |
  | `vcSmoothPoints` | Function | Ekspor | L502 | `(pts, sigma)` |
  | `vcRdp` | Function | Ekspor | L537 | `(pts, tol)` |
  | `vcCollapseStackedCornerNodes` | Function | Ekspor | L582 | `(sp, opts = {}, targetNodeIds = null)` |
  | `okNode` | Arrow Function | Internal | L598 | `(id)` |
  | `PV` | Constant | Internal | L619 | - |
  | `vcPreSamplePiece` | Function | Ekspor | L786 | `(piece, tol)` |
  | `vcJoinSegSamples` | Function | Ekspor | L795 | `(segSamples, a, b)` |
  | `vcFitPieceShapePreserving` | Function | Ekspor | L806 | `(piece, tol, straightLines, smooth)` |
  | `simplifyRun` | Function | Ekspor | L869 | `(run, opts = {})` |
  | `vcNoWorse` | Function | Ekspor | L890 | `(originalSp, fittedSp)` |
  | `simplifySubpath` | Function | Ekspor | L893 | `(sp, opts = {})` |
  | `simplifyWith` | Function | Ekspor | L915 | `(obj, opts = {})` |
  | `vcSimplifyRuns` | Function | Ekspor | L928 | `(sp, picked, opts)` |
  | `inside` | Arrow Function | Internal | L931 | `(a)` |
  | `simplifyPart` | Function | Ekspor | L1011 | `(obj, selectedSegSet, opts = {})` |
  | `vcReverseCubicSeg` | Function | Ekspor | L1047 | `(seg)` |
  | `vcReverseSegList` | Function | Ekspor | L1072 | `(segs)` |
  | `vcSimplifyOpenChainNodes` | Function | Ekspor | L1079 | `(chainNodes, opts, minSegs = 1)` |
  | `vcTopologicalSimplifyObjects` | Function | Ekspor | L1137 | `(allObjects, targetIds, opts)` |
  | `getCluster` | Arrow Function | Internal | L1148 | `(pt)` |
  | `uKey` | Arrow Function | Internal | L1220 | `(c1, c2)` |
  | `activeCluster` | Arrow Function | Internal | L1294 | `(c)` |
  | `areSegsChainContinuous` | Arrow Function | Internal | L1370 | `(sp, prevSegIdx, nextSegIdx, nodeCid)` |
  | `getChainKey` | Arrow Function | Internal | L1442 | `(oi1, si1, startSeg1, len, oi2, si2, startSeg2, relDir)` |
  | `simplifyDoc` | Function | Ekspor | L1547 | `(doc, params = {}, selObjsSet = null, selNodesSet = null)` |
  | `isPinnedSharedNode` | Arrow Function | Internal | L1660 | `(nd, objId)` |
  | `fixAllAnomalies` | Function | Ekspor | L1778 | `(doc, opt = {})` |
  | `fixAnomaly` | Function | Ekspor | L1795 | `(doc, anom, opt = {})` |

---

#### 24. `src/engine/transformMatrixParser.jsx`
- **Komunitas Graphify:** Path Math & Document I/O
- **Total Baris Kode:** ~162 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Parser matriks transformasi SVG & kalkulasi viewBox preserveAspectRatio

- **Daftar Fungsi, Komponen, Class & Konstanta (5 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `parseTransform` | Function | Ekspor | L7 | `(str, warnCb)` |
  | `computeViewBoxTransform` | Function | Ekspor | L79 | `(vb, viewportW, viewportH, parString = 'xMidYMid meet', vpX = 0, vpY = 0)` |
  | `isId` | Arrow Function | Ekspor | L145 | `(m)` |
  | `tp` | Arrow Function | Ekspor | L146 | `(m, p)` |
  | `bake` | Arrow Function | Ekspor | L150 | `(subs, m)` |

---

#### 25. `src/engine/vectorEngine.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Editor Canvas & UI Components
- **Total Baris Kode:** ~176 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Objek agregator utama mesin vektor (VE) yang menyatukan seluruh modul geometri

- **Koneksi God Nodes:** Terhubung langsung ke `cross()`, `dist()`, `dot()`, `rd()`, `sub()`, `uid()`
- **Daftar Fungsi, Komponen, Class & Konstanta (1 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `VE` | Constant | Ekspor | L28 | - |

---

#### 26. `src/engine/vectorPrimitives.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Node Editing & Geometry Refinement, Path Math & Document I/O
- **Total Baris Kode:** ~60 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Operasi matematika vektor 2D dasar, kloning node/subpath, & utilitas numerik

- **Daftar Fungsi, Komponen, Class & Konstanta (19 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `uid` | Arrow Function | Ekspor | L5 | - |
  | `dist` | Arrow Function | Ekspor | L6 | `(a, b)` |
  | `lerp` | Arrow Function | Ekspor | L7 | `(a, b, t)` |
  | `sub` | Arrow Function | Ekspor | L11 | `(a, b)` |
  | `add` | Arrow Function | Ekspor | L15 | `(a, b)` |
  | `mul` | Arrow Function | Ekspor | L19 | `(a, s)` |
  | `nrm` | Arrow Function | Ekspor | L23 | `(a)` |
  | `dot` | Arrow Function | Ekspor | L30 | `(a, b)` |
  | `cross` | Arrow Function | Ekspor | L31 | `(a, b)` |
  | `rd` | Arrow Function | Ekspor | L32 | `(v)` |
  | `P` | Arrow Function | Ekspor | L33 | `(n)` |
  | `cl` | Arrow Function | Ekspor | L37 | `(n)` |
  | `clSub` | Arrow Function | Ekspor | L46 | `(sp)` |
  | `NUM` | Constant | Ekspor | L50 | - |
  | `nums` | Arrow Function | Ekspor | L51 | `(s)` |
  | `esc` | Arrow Function | Ekspor | L52 | `(s)` |
  | `MAX_COORD_ABS` | Constant | Ekspor | L56 | - |
  | `isFiniteCoord` | Arrow Function | Ekspor | L57 | `(v)` |
  | `mmul` | Arrow Function | Ekspor | L58 | `(p, q)` |

---

### Domain: Renderer: GPU Acceleration & Drawing (8 File)

#### 27. `src/renderer/adaptiveCubicFlattener.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~153 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Algoritma flattening adaptif kurva Bézier kubik ke polilin dengan toleransi subpiksel

- **Daftar Fungsi, Komponen, Class & Konstanta (4 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `flattenCubicAdaptive` | Function | Ekspor | L16 | `(a, b, tolSq, outPts, depth = 0, minSegLenSq = 0, stats = null)` |
  | `currentTotalVerts` | Arrow Function | Internal | L19 | - |
  | `pointToChordDistSq` | Arrow Function | Internal | L51 | `(px, py, x0, y0, dx, dy, chordLenSq)` |
  | `rec` | Arrow Function | Internal | L67 | `(x0, y0, x1, y1, x2, y2, x3, y3, d)` |

---

#### 28. `src/renderer/benchmarkSuite.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~221 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Suite pengujian beban & tolok ukur performa render (GEOVANTA_BENCHMARK_SUITE)

- **Daftar Fungsi, Komponen, Class & Konstanta (8 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `GEOVANTA_BENCHMARK_SUITE` | Arrow Function | Ekspor | L26 | `(()` |
  | `buildCircleSvg` | Arrow Function | Internal | L27 | - |
  | `buildBezierSvg` | Arrow Function | Internal | L39 | - |
  | `buildDiagonalSvg` | Arrow Function | Internal | L58 | - |
  | `buildCompoundSvg` | Arrow Function | Internal | L92 | - |
  | `buildNodeDensityDoc` | Arrow Function | Internal | L112 | `(targetNodes = 1000)` |
  | `buildExtremeCoordinateDoc` | Arrow Function | Internal | L161 | `(offset = 100000000)` |
  | `buildSeamMosaicDoc` | Arrow Function | Internal | L169 | `(count = 240)` |

---

#### 29. `src/renderer/geometryCache.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~314 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Manajer cache memori geometri LRU (GEOMETRY_CACHE) & anggaran buffer GPU

- **Daftar Fungsi, Komponen, Class & Konstanta (20 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `MAX_LOD_BUCKETS_PER_OBJ` | Constant | Ekspor | L25 | - |
  | `MAX_GPU_MESH_PER_OBJ` | Constant | Ekspor | L26 | - |
  | `MAX_CACHED_OBJECTS` | Constant | Ekspor | L27 | - |
  | `GEOMETRY_CACHE` | Arrow Function | Ekspor | L28 | `(()` |
  | `estimateLodBytes` | Arrow Function | Internal | L35 | `(lod)` |
  | `estimateGpuMeshBytes` | Arrow Function | Internal | L44 | `(gm)` |
  | `estimateEntryBytes` | Arrow Function | Internal | L51 | `(entry)` |
  | `recomputeTotalBytes` | Arrow Function | Internal | L63 | - |
  | `registerLodBytes` | Arrow Function | Internal | L75 | `(entry, lod, sign)` |
  | `registerGpuMeshBytes` | Arrow Function | Internal | L80 | `(entry, gm, sign)` |
  | `enforceByteBudget` | Arrow Function | Internal | L85 | - |
  | `computeSubsSignature` | Arrow Function | Internal | L102 | `(subs)` |
  | `mix` | Arrow Function | Internal | L121 | `(val)` |
  | `copySubsSignature` | Arrow Function | Internal | L152 | `(oldSubs, newSubs)` |
  | `getObjectEntry` | Arrow Function | Internal | L157 | `(o)` |
  | `recordHit` | Arrow Function | Internal | L247 | - |
  | `recordMiss` | Arrow Function | Internal | L250 | - |
  | `clearAll` | Arrow Function | Internal | L258 | - |
  | `invalidateObject` | Arrow Function | Internal | L270 | `(objId)` |
  | `getStats` | Arrow Function | Internal | L281 | - |

---

#### 30. `src/renderer/objectTessellationLod.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~309 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Generator Level-of-Detail (LOD) teselasi objek & cache elemen gambar kanvas

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (4 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `getObjectTessellationLOD` | Function | Ekspor | L15 | `(o, zoom = 1)` |
  | `IMG_ELEMENT_CACHE` | Arrow Function | Ekspor | L223 | `(()` |
  | `recomputePixels` | Arrow Function | Internal | L226 | - |
  | `evictIfNeeded` | Arrow Function | Internal | L237 | - |

---

#### 31. `src/renderer/pathWindingAndBatching.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~264 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Normalisasi arah putaran (Winding Rule) path komposit, cache vinfo, & pengelompokan batch render SVG

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (11 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `sampleSubPoly` | Arrow Function | Ekspor | L9 | `(sp)` |
  | `polyWindingAt` | Arrow Function | Ekspor | L39 | `(pts, mx, my)` |
  | `reverseClosedSub` | Arrow Function | Ekspor | L52 | `(sp)` |
  | `buildNormalizedPathD` | Arrow Function | Ekspor | L62 | `(o, rawD)` |
  | `vinfo` | Arrow Function | Ekspor | L117 | `(o)` |
  | `isOpaquePaint` | Arrow Function | Ekspor | L156 | `(o)` |
  | `SEAM_STROKE_PX` | Constant | Ekspor | L157 | - |
  | `gradBatchKey` | Arrow Function | Ekspor | L166 | `(g)` |
  | `r` | Arrow Function | Internal | L168 | `(v)` |
  | `batchStyleKey` | Arrow Function | Ekspor | L173 | `(o, selObjsSet)` |
  | `buildScopeBatches` | Arrow Function | Ekspor | L195 | `(objs, selObjsSet)` |

---

#### 32. `src/renderer/polygonTriangulatorAndStroke.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~481 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Triangulasi poligon Ear-Clipping, ekspansi mesh stroke (Join/Cap/Miter), & pembuatan VBO GPU

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (12 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `hasPolygonSelfIntersection` | Function | Ekspor | L16 | `(ptsX, ptsY)` |
  | `ccwOrient` | Arrow Function | Internal | L20 | `(ax, ay, bx, by, cx, cy)` |
  | `segProperlyIntersects` | Arrow Function | Internal | L21 | `(ax, ay, bx, by, cx, cy, dx, dy)` |
  | `earClipSimplePolygon` | Function | Ekspor | L51 | `(coords)` |
  | `ptInTri` | Arrow Function | Internal | L128 | `(px, py, ax, ay, bx, by, cx, cy)` |
  | `tessellateStrokePolylines` | Function | Ekspor | L177 | `(polylines, halfWidth, joinMode = 'round', capMode = 'round', miterLimit = 4, effectiveZoom = 1)` |
  | `pushTri` | Arrow Function | Internal | L183 | `(x1, y1, x2, y2, x3, y3)` |
  | `pushArcFan` | Arrow Function | Internal | L186 | `(cx, cy, a0, a1, stepsOverride)` |
  | `isObjectSeamCandidate` | Function | Ekspor | L349 | `(o)` |
  | `buildObjectGpuBuffers` | Function | Ekspor | L356 | `(o, zoom = 1)` |
  | `saveLastGm` | Arrow Function | Internal | L374 | `(gm)` |
  | `setSceneInteractingZoom` | Function | Ekspor | L476 | `(v)` |

---

#### 33. `src/renderer/sceneRenderer.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~2768 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin perender graf adegan akselerasi perangkat keras WebGL2 & fallback Canvas2D (SceneRenderer)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (19 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `SceneRenderer` | Class | Ekspor | L26 | Metode: `constructor()`, `init()`, `_canUseWebGL2Pipeline()`, `_bindCanvas2DFallback()`, `_initBackendContext()`, `_attachContextLossHandlers()` (+1 lainnya) |
  | `compile` | Arrow Function | Internal | L516 | `(type, src)` |
  | `mk` | Arrow Function | Internal | L590 | `(arr)` |
  | `step` | Arrow Function | Internal | L778 | - |
  | `setObjectLocalTransform` | Arrow Function | Internal | L1162 | `(originX, originY, odx, ody)` |
  | `writeMaskToStencilBit7` | Arrow Function | Internal | L1170 | `(maskObj, odx, ody)` |
  | `drawObjectWebGL` | Arrow Function | Internal | L1207 | `(o, odx, ody, frameStencilActive)` |
  | `closeFrameClipWebGL` | Arrow Function | Internal | L1400 | - |
  | `openFrameClipWebGL` | Arrow Function | Internal | L1430 | `(fid)` |
  | `renderObjWebGL` | Arrow Function | Internal | L1465 | `(o, isDragged)` |
  | `closeFrameClip` | Arrow Function | Internal | L1626 | - |
  | `openFrameClip` | Arrow Function | Internal | L1648 | `(fid)` |
  | `closeFrameClip` | Arrow Function | Internal | L1811 | - |
  | `openFrameClip` | Arrow Function | Internal | L1833 | `(fid)` |
  | `compositeBinarySubRect` | Arrow Function | Internal | L2000 | `(ix0, iy0, subW, subH, covData, solidRgba, paintData, objOpacity)` |
  | `applyFrameAndObjClips` | Arrow Function | Internal | L2067 | `(ctxTarget, fid, o, odx, ody)` |
  | `closeFrameClip` | Arrow Function | Internal | L2491 | - |
  | `openFrameClip` | Arrow Function | Internal | L2513 | `(fid)` |
  | `renderObj2D` | Arrow Function | Internal | L2538 | `(o, isDragged)` |

---

#### 34. `src/renderer/subpathBBox.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~54 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Kalkulasi cepat dan cache WeakMap kotak batas subpath (subBBox)

- **Daftar Fungsi, Komponen, Class & Konstanta (2 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `VINFO` | Constant | Ekspor | L8 | - |
  | `subBBox` | Arrow Function | Ekspor | L12 | `(sp)` |

---

### Domain: Components: Editor Shell & Canvas (12 File)

#### 35. `src/components/editor/CanvasVectorObjects.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~177 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen memoized perender elemen SVG kanvas & pratinjau ikon layer (LayerSvgPreview, CanvasObj, CompositePathObj)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (1 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `LAYER_PREVIEW_JSX_CACHE` | Constant | Internal | L17 | - |

---

#### 36. `src/components/editor/EditorActionRail.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~12 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen rail navigasi aksi cepat di sisi kiri Vector Editor (EditorActionRail)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 37. `src/components/editor/EditorFloatingToolbar.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~162 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen bilah alat melayang utama di bagian bawah kanvas (EditorFloatingToolbar)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 38. `src/components/editor/EditorLeftSidebar.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~563 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen sidebar kiri: header proyek, pohon layer, & panel alat kontekstual (EditorLeftSidebar)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (7 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `FLAT_ID_MAP_CACHE` | Constant | Internal | L21 | - |
  | `getFlatIdMap` | Arrow Function | Internal | L22 | `(flatIds)` |
  | `pick` | Arrow Function | Internal | L335 | `(ids, e, allOn)` |
  | `dStart` | Arrow Function | Internal | L374 | `(e, ids)` |
  | `dEnd` | Arrow Function | Internal | L382 | - |
  | `renInput` | Arrow Function | Internal | L387 | `(rid, commitFn)` |
  | `objRow` | Arrow Function | Internal | L391 | `(o, child, nodeCnt)` |

---

#### 39. `src/components/editor/EditorRightInspector.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~517 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen sidebar inspektor properti kanan: Transform, Alignment, Fill, Gradien, Stroke, & Ekspor (EditorRightInspector)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (3 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `updateSelText` | Arrow Function | Internal | L182 | `(patch, histKey = 'p:text')` |
  | `handleAnchorChange` | Arrow Function | Internal | L191 | `(newAnchor)` |
  | `handleAddGoogleFont` | Arrow Function | Internal | L229 | `(rawOverride)` |

---

#### 40. `src/components/editor/EditorSimplifyStrip.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~28 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen bilah melayang penyederhanaan path cepat (EditorSimplifyStrip)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 41. `src/components/editor/GradientCanvasGizmo.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~249 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Gizmo interaktif manipulasi titik & stop gradien langsung di atas kanvas (GradientCanvasGizmo)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (4 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `startGizmoDrag` | Arrow Function | Internal | L45 | `(e, mode, stopPayload)` |
  | `onMove` | Arrow Function | Internal | L53 | `(ev)` |
  | `onUp` | Arrow Function | Internal | L180 | - |
  | `onLineDblClick` | Arrow Function | Internal | L190 | `(e)` |

---

#### 42. `src/components/editor/GradientEditorPanel.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~361 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Panel inspektor editor gradien multi-stop tingkat lanjut (GradientEditorPanel)

- **Koneksi God Nodes:** Terhubung langsung ke `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (13 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `applyGrad` | Arrow Function | Internal | L44 | `(mutator, histKey = 'grad-edit')` |
  | `setMode` | Arrow Function | Internal | L50 | `(m)` |
  | `startBarDrag` | Arrow Function | Internal | L69 | `(e, kind, idx)` |
  | `move` | Arrow Function | Internal | L75 | `(ev)` |
  | `up` | Arrow Function | Internal | L103 | - |
  | `onBarClick` | Arrow Function | Internal | L112 | `(e)` |
  | `deleteStop` | Arrow Function | Internal | L134 | `(id)` |
  | `reverseStops` | Arrow Function | Internal | L146 | - |
  | `distributeStops` | Arrow Function | Internal | L155 | - |
  | `simplifyStopsAction` | Arrow Function | Internal | L165 | `(maxN = 6)` |
  | `BAR_W` | Constant | Internal | L173 | - |
  | `MIN` | Constant | Internal | L176 | - |
  | `showMid` | Arrow Function | Internal | L189 | `(i)` |

---

#### 43. `src/components/editor/LayerTreeViewport.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~122 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Viewport daftar hierarki layer tervirtualisasi berkecepatan tinggi (LayerTreeViewport)

- **Daftar Fungsi, Komponen, Class & Konstanta (5 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `LAYER_ROW_EST_PX` | Constant | Ekspor | L7 | - |
  | `LAYER_OVERSCAN` | Constant | Ekspor | L8 | - |
  | `LAYER_WINDOW_SIZE` | Constant | Ekspor | L9 | - |
  | `LAYER_SCROLL_STEP_ROWS` | Constant | Ekspor | L10 | - |
  | `applyRelScroll` | Arrow Function | Internal | L40 | `(relSt)` |

---

#### 44. `src/components/editor/RenderDebugCanvasOverlay.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~111 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Overlay visualisasi kotak batas, wireframe mesh GPU, & diagnostik teselasi (RenderDebugCanvasOverlay)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (1 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `appendTris` | Arrow Function | Internal | L70 | `(arr, ox, oy)` |

---

#### 45. `src/components/editor/SelectionRotationAndRedlines.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~37 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Overlay lencana ukuran seleksi, sudut rotasi, & garis ukur jarak Alt-redline

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 46. `src/components/editor/VectorEditor.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~7307 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen ruang kerja utama Vector Editor interaktif (VectorEditor)

- **Koneksi God Nodes:** Terhubung langsung ke `SceneRenderer`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (194 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `setRenderCfg` | Arrow Function | Internal | L68 | `(patch)` |
  | `onCfg` | Arrow Function | Internal | L74 | - |
  | `onAcc` | Arrow Function | Internal | L80 | - |
  | `say` | Arrow Function | Internal | L91 | `(m)` |
  | `setSel` | Arrow Function | Internal | L125 | `(s)` |
  | `syncZoomSidebarDom` | Arrow Function | Internal | L148 | `(zVal)` |
  | `scheduleSmoothZoomReadout` | Arrow Function | Internal | L173 | `(snapImmediate = false)` |
  | `fmtVpMat` | Arrow Function | Internal | L186 | `(z, px, py)` |
  | `r` | Arrow Function | Internal | L187 | `(v)` |
  | `applyVP` | Arrow Function | Internal | L190 | `(syncRender = false, snapReadout = false, isPanOnly = false)` |
  | `flushView` | Arrow Function | Internal | L264 | `(snapReadout = true)` |
  | `softView` | Arrow Function | Internal | L296 | - |
  | `settleFn` | Arrow Function | Internal | L313 | - |
  | `gridStep` | Arrow Function | Internal | L350 | - |
  | `setSnapCfg` | Arrow Function | Internal | L399 | `(patch)` |
  | `fn` | Arrow Function | Internal | L448 | - |
  | `setPen` | Arrow Function | Internal | L491 | `(s)` |
  | `toggleCollapseGrp` | Arrow Function | Internal | L583 | `(gid, e)` |
  | `setDock` | Arrow Function | Internal | L699 | `(p)` |
  | `PW_DEF` | Constant | Internal | L710 | - |
  | `savePw` | Arrow Function | Internal | L733 | - |
  | `setPwNow` | Arrow Function | Internal | L738 | `(k, v)` |
  | `rzProps` | Arrow Function | Internal | L746 | `(k)` |
  | `flushLive` | Arrow Function | Internal | L795 | - |
  | `live` | Arrow Function | Internal | L806 | `(d)` |
  | `notifyDocCommit` | Arrow Function | Internal | L838 | `(d)` |
  | `estimateDocSnapshotBytes` | Arrow Function | Internal | L850 | `(d)` |
  | `push` | Arrow Function | Internal | L867 | `(d, key)` |
  | `commit` | Arrow Function | Internal | L897 | `(d, key)` |
  | `commitObjs` | Arrow Function | Internal | L912 | `(fn, key)` |
  | `commitRename` | Arrow Function | Internal | L928 | `(targetId, isGroup, directVal)` |
  | `moveObjsToGroup` | Arrow Function | Internal | L973 | `(ids, targetGroup)` |
  | `reorderLayerTo` | Arrow Function | Internal | L1023 | `(ids, targetObj, pos)` |
  | `undo` | Arrow Function | Internal | L1053 | - |
  | `redo` | Arrow Function | Internal | L1063 | - |
  | `xfDone` | Arrow Function | Internal | L1395 | `(nd, key)` |
  | `alignDo` | Arrow Function | Internal | L1398 | `(mode)` |
  | `setXfPos` | Arrow Function | Internal | L1406 | `(axis, v)` |
  | `setXfDim` | Arrow Function | Internal | L1407 | `(axis, v)` |
  | `rotPin` | Arrow Function | Internal | L1415 | - |
  | `setXfRot` | Arrow Function | Internal | L1416 | `(v)` |
  | `flipXf` | Arrow Function | Internal | L1417 | `(axis)` |
  | `runLayout` | Arrow Function | Internal | L1448 | `(cfg, force, padOnly)` |
  | `layUpd` | Arrow Function | Internal | L1504 | `(patch)` |
  | `layPad` | Arrow Function | Internal | L1513 | `(k, v)` |
  | `padToArtboard` | Arrow Function | Internal | L1524 | - |
  | `hOk` | Arrow Function | Internal | L1534 | - |
  | `toggleGlobalNodes` | Arrow Function | Internal | L1535 | - |
  | `toggleGlobalHandles` | Arrow Function | Internal | L1545 | - |
  | `segAt` | Arrow Function | Internal | L1556 | `(a, b, p)` |
  | `findSegAt` | Arrow Function | Internal | L1599 | `(p, tol)` |
  | `searchObj` | Arrow Function | Internal | L1602 | `(o, maxDist)` |
  | `ADD_LBL` | Constant | Internal | L1669 | - |
  | `addSnap` | Arrow Function | Internal | L1675 | `(sg, p, alt)` |
  | `computeAdd` | Arrow Function | Internal | L1759 | `(ev)` |
  | `defHandles` | Arrow Function | Internal | L1782 | `(sp, i)` |
  | `hoverNodeAt` | Arrow Function | Internal | L1808 | `(ev)` |
  | `updateAddHover` | Arrow Function | Internal | L1838 | `(e)` |
  | `makeShape` | Arrow Function | Internal | L1853 | `(kind, x, y, w, h, id)` |
  | `clampZ` | Arrow Function | Internal | L1871 | `(z)` |
  | `setZ` | Arrow Function | Internal | L1872 | `(nz, cx, cy, soft)` |
  | `zoomBy` | Arrow Function | Internal | L1898 | `(f, cx, cy)` |
  | `fitTo` | Arrow Function | Internal | L1899 | `(bx, by, bw, bh, pad)` |
  | `fitView` | Arrow Function | Internal | L1911 | - |
  | `fitSel` | Arrow Function | Internal | L1922 | - |
  | `zoomToPixels` | Arrow Function | Internal | L1941 | `(targetZ, forceMode)` |
  | `replaceDocument` | Arrow Function | Internal | L2019 | `(nextDoc, nextViewState)` |
  | `createDocument` | Arrow Function | Internal | L2061 | `(vb = [0, 0, 800, 600])` |
  | `loadDocument` | Arrow Function | Internal | L2069 | `(nextDoc, nextViewState)` |
  | `wh` | Arrow Function | Internal | L2132 | `(e)` |
  | `noMidScroll` | Arrow Function | Internal | L2140 | `(e)` |
  | `loadDoc` | Arrow Function | Internal | L2169 | `(d, note)` |
  | `readAs` | Arrow Function | Internal | L2187 | `(f, how)` |
  | `imgSize` | Arrow Function | Internal | L2193 | `(url)` |
  | `sniffKind` | Arrow Function | Internal | L2203 | `(f)` |
  | `importFiles` | Arrow Function | Internal | L2222 | `(list, at)` |
  | `pasteText` | Arrow Function | Internal | L2382 | `(tx, at)` |
  | `pasteFromSystem` | Arrow Function | Internal | L2428 | `(at)` |
  | `g` | Arrow Function | Internal | L2462 | `(k)` |
  | `ps` | Arrow Function | Internal | L2495 | `(e)` |
  | `toDoc` | Arrow Function | Internal | L2502 | `(cx, cy)` |
  | `hitObj` | Arrow Function | Internal | L2512 | `(pt)` |
  | `pickNode` | Arrow Function | Internal | L2535 | `(pt)` |
  | `nearestSeg` | Arrow Function | Internal | L2568 | `(objs, pt, tol)` |
  | `snapAt` | Arrow Function | Internal | L2607 | `(p, e, exObjs, exNodes, objs, opt)` |
  | `dragCands` | Arrow Function | Internal | L2682 | `(dg)` |
  | `MAX_CANDS` | Constant | Internal | L2722 | - |
  | `dragOutline` | Arrow Function | Internal | L2738 | `(dg)` |
  | `visibleAnoms` | Arrow Function | Internal | L2784 | - |
  | `hitAnomaly` | Arrow Function | Internal | L2795 | `(pt)` |
  | `quant45` | Arrow Function | Internal | L2812 | `(a, p)` |
  | `penFind` | Arrow Function | Internal | L2822 | `(d, s)` |
  | `penMap` | Arrow Function | Internal | L2831 | `(d, oid, spid, fn)` |
  | `penNodeMap` | Arrow Function | Internal | L2838 | `(d, oid, spid, nid, fn)` |
  | `replaceTop` | Arrow Function | Internal | L2842 | `(d)` |
  | `penTarget` | Arrow Function | Internal | L2849 | `(e, pt, f)` |
  | `updatePenHover` | Arrow Function | Internal | L2879 | `(e)` |
  | `finishPen` | Arrow Function | Internal | L2904 | - |
  | `penUndoLast` | Arrow Function | Internal | L2937 | - |
  | `penDown` | Arrow Function | Internal | L2969 | `(e, pt, base)` |
  | `penMove` | Arrow Function | Internal | L3076 | `(e, pt, dg)` |
  | `penUp` | Arrow Function | Internal | L3125 | `(dg)` |
  | `hoverAuto` | Arrow Function | Internal | L3145 | `(ev)` |
  | `ahDown` | Arrow Function | Internal | L3181 | `(e, base)` |
  | `autoSel` | Arrow Function | Internal | L3218 | `(clear, preserveShape = true)` |
  | `autoAll` | Arrow Function | Internal | L3235 | `(clear, preserveShape = true)` |
  | `selBoxNow` | Arrow Function | Internal | L3249 | - |
  | `updateAltMeasure` | Arrow Function | Internal | L3259 | `(e)` |
  | `cloneWithGroups` | Arrow Function | Internal | L3286 | `(baseObjs, pickIds, offsetDx = 0, offsetDy = 0)` |
  | `uniq` | Arrow Function | Internal | L3297 | `(n)` |
  | `clearFastDragDom` | Arrow Function | Internal | L3336 | `(dg)` |
  | `flushFastObjDrag` | Arrow Function | Internal | L3351 | `(dg)` |
  | `queryFastDragDomEls` | Arrow Function | Internal | L3364 | `(dg)` |
  | `altDupMove` | Arrow Function | Internal | L3419 | `(e, dg, dx, dy)` |
  | `figmaKeys` | Arrow Function | Internal | L3514 | `(e)` |
  | `vcBoxDown` | Arrow Function | Internal | L3627 | `(pt, base, e)` |
  | `vcScaleMove` | Arrow Function | Internal | L3684 | `(e, pt, dg)` |
  | `vcRotateMove` | Arrow Function | Internal | L3715 | `(e, pt, dg)` |
  | `onPointerDown` | Arrow Function | Internal | L3741 | `(e)` |
  | `P2` | Arrow Function | Internal | L4141 | `(n)` |
  | `onPointerMove` | Arrow Function | Internal | L4145 | `(e)` |
  | `hbuild` | Arrow Function | Internal | L4334 | `(n, t)` |
  | `grow` | Arrow Function | Internal | L4558 | `(b)` |
  | `onPointerUp` | Arrow Function | Internal | L4750 | `(e)` |
  | `nest` | Arrow Function | Internal | L4814 | `(d)` |
  | `inside` | Arrow Function | Internal | L4915 | `(n)` |
  | `onDoubleClick` | Arrow Function | Internal | L4980 | `(e)` |
  | `setProp` | Arrow Function | Internal | L5025 | `(k, v)` |
  | `delSel` | Arrow Function | Internal | L5029 | - |
  | `dup` | Arrow Function | Internal | L5057 | - |
  | `reorder` | Arrow Function | Internal | L5072 | `(up)` |
  | `cntNodes` | Arrow Function | Internal | L5076 | - |
  | `alignSel` | Arrow Function | Internal | L5078 | `(soft)` |
  | `applyStraight` | Arrow Function | Internal | L5093 | - |
  | `applyAutoRefine` | Arrow Function | Internal | L5100 | - |
  | `applyPruneNodes` | Arrow Function | Internal | L5111 | - |
  | `applyNodeAngleAlign` | Arrow Function | Internal | L5124 | `(overrideDeg, overrideMode)` |
  | `applySharpen` | Arrow Function | Internal | L5142 | - |
  | `applySmoothNodes` | Arrow Function | Internal | L5150 | - |
  | `applyType` | Arrow Function | Internal | L5155 | `(t)` |
  | `MIRROR_OPTS` | Constant | Internal | L5174 | - |
  | `applyMirror` | Arrow Function | Internal | L5175 | `(m)` |
  | `doInsert` | Arrow Function | Internal | L5182 | - |
  | `setClosed` | Arrow Function | Internal | L5193 | `(v)` |
  | `expOk` | Arrow Function | Ekspor | L5200 | - |
  | `isRasterFmt` | Arrow Function | Internal | L5201 | `(f)` |
  | `hasImgs` | Arrow Function | Internal | L5202 | - |
  | `triggerDl` | Arrow Function | Internal | L5203 | `(blob, ext)` |
  | `copyTextFb` | Arrow Function | Internal | L5213 | `(s, ok)` |
  | `exportSvg` | Arrow Function | Ekspor | L5233 | - |
  | `downloadSvg` | Arrow Function | Internal | L5257 | - |
  | `panTo` | Arrow Function | Internal | L5293 | `(wx, wy)` |
  | `selectAnomaly` | Arrow Function | Internal | L5304 | `(anom)` |
  | `fixAnomaly` | Arrow Function | Internal | L5315 | `(anom)` |
  | `cleanAllAnomalies` | Arrow Function | Internal | L5331 | - |
  | `computeVcSimpPreview` | Arrow Function | Internal | L5345 | `(baseDoc, baseSel, nextState)` |
  | `openVcSimplify` | Arrow Function | Internal | L5375 | `(forceMode = null)` |
  | `updateVcSimplify` | Arrow Function | Internal | L5413 | `(patch)` |
  | `triggerAutoSimplifyLevel` | Arrow Function | Internal | L5429 | - |
  | `openVcMoreOptions` | Arrow Function | Internal | L5447 | - |
  | `confirmVcSimplify` | Arrow Function | Internal | L5463 | - |
  | `cancelVcSimplify` | Arrow Function | Internal | L5510 | - |
  | `selected` | Arrow Function | Internal | L5521 | - |
  | `writeSysClip` | Arrow Function | Internal | L5523 | `(txt, svg, ids)` |
  | `plain` | Arrow Function | Internal | L5526 | - |
  | `copySel` | Arrow Function | Internal | L5553 | - |
  | `pasteClip` | Arrow Function | Internal | L5586 | `(at)` |
  | `uniq` | Arrow Function | Internal | L5593 | `(n)` |
  | `flattenSel` | Arrow Function | Internal | L5644 | - |
  | `createFrameSel` | Arrow Function | Internal | L5684 | - |
  | `convertFrameToAutoLayout` | Arrow Function | Internal | L5705 | `(frameName)` |
  | `groupSel` | Arrow Function | Internal | L5740 | `(noToggle)` |
  | `isFrameGid` | Arrow Function | Internal | L5777 | `(d, g)` |
  | `ungroupIds` | Arrow Function | Internal | L5778 | `(gids, label)` |
  | `ungroupSel` | Arrow Function | Internal | L5799 | - |
  | `onCtx` | Arrow Function | Internal | L5810 | `(e)` |
  | `openLayerCtx` | Arrow Function | Internal | L5825 | `(e, o)` |
  | `onKd` | Arrow Function | Internal | L5996 | `(e)` |
  | `onKu` | Arrow Function | Internal | L5997 | `(e)` |
  | `grpUn` | Arrow Function | Internal | L6005 | `(()` |
  | `IC_PASTE` | Constant | Internal | L6010 | - |
  | `toggleSelHidden` | Arrow Function | Internal | L6013 | - |
  | `toggleSelLocked` | Arrow Function | Internal | L6021 | - |
  | `isBgObj` | Arrow Function | Internal | L6314 | `(o)` |
  | `dirArrow` | Arrow Function | Internal | L6326 | `(x, y)` |
  | `isPair` | Arrow Function | Internal | L6345 | `(A, B)` |
  | `curR` | Arrow Function | Internal | L6431 | `(()` |
  | `applyRadiusToCorners` | Arrow Function | Internal | L6445 | `(cornersList, r, histKey = 'cr-indiv')` |
  | `setRadius` | Arrow Function | Internal | L6485 | `(r)` |
  | `replaceSelectionColor` | Arrow Function | Internal | L6522 | `(sc, v)` |
  | `SL` | Constant | Internal | L6551 | - |
  | `renderRailDropdowns` | Arrow Function | Internal | L6651 | - |
  | `renderBatches` | Arrow Function | Internal | L6737 | `(batches)` |
  | `r1` | Arrow Function | Internal | L6866 | `(v)` |

---

### Domain: Components: UI Control Primitives (12 File)

#### 47. `src/components/ui/ColorHexInput.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~26 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen kotak teks kode warna CSS/Hex tervalidasi (ColorText)

- **Daftar Fungsi, Komponen, Class & Konstanta (1 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `commit` | Arrow Function | Internal | L13 | `(raw)` |

---

#### 48. `src/components/ui/ColorPickerField.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~166 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen pemilih warna HSV/OKLab lengkap dengan opasitas, pipet layar, & input kode warna

- **Koneksi God Nodes:** Terhubung langsung ke `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (10 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `out` | Arrow Function | Internal | L41 | `(c)` |
  | `emit` | Arrow Function | Internal | L48 | `(h, s, v, a = alpha)` |
  | `emitAlpha` | Arrow Function | Internal | L55 | `(pct)` |
  | `clearColor` | Arrow Function | Internal | L66 | - |
  | `svFrom` | Arrow Function | Internal | L76 | `(e)` |
  | `svDown` | Arrow Function | Internal | L80 | `(e)` |
  | `svMove` | Arrow Function | Internal | L88 | `(e)` |
  | `svUp` | Arrow Function | Internal | L91 | - |
  | `pipe` | Arrow Function | Internal | L96 | - |
  | `typed` | Arrow Function | Internal | L115 | `(s)` |

---

#### 49. `src/components/ui/ContextMenu.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~107 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen menu konteks klik kanan bergaya gelap modern (CtxMenu)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (3 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `dn` | Arrow Function | Internal | L46 | `(e)` |
  | `kd` | Arrow Function | Internal | L50 | `(e)` |
  | `cl` | Arrow Function | Internal | L72 | - |

---

#### 50. `src/components/ui/CustomTextBox.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~258 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen kotak input teks & angka kustom (0% Native HTML Input) dengan pemilihan rentang & kursor

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (5 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `updateBuf` | Arrow Function | Internal | L54 | `(nextStr, nextCaret)` |
  | `startEdit` | Arrow Function | Internal | L61 | - |
  | `finishEdit` | Arrow Function | Internal | L71 | - |
  | `onKeyDown` | Arrow Function | Internal | L85 | `(e)` |
  | `onPaste` | Arrow Function | Internal | L185 | `(e)` |

---

#### 51. `src/components/ui/FloatPopover.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~94 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen panel melayang (Popover) dengan penyesuaian posisi viewport otomatis

- **Koneksi God Nodes:** Terhubung langsung ke `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (3 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `place` | Arrow Function | Internal | L25 | - |
  | `dn` | Arrow Function | Internal | L67 | `(e)` |
  | `kd` | Arrow Function | Internal | L72 | `(e)` |

---

#### 52. `src/components/ui/IconGlyphs.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~50 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen perender ikon SVG (Ico, Chev, Vi, ShapeGlyph, IconBtn, Keys)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 53. `src/components/ui/PinGridSelector.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~18 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen kisi pemilih titik poros transformasi 3x3 (PinGrid)

- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 54. `src/components/ui/RangeField.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~66 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen baris kontrol slider berlabel nilai (Range)

- **Koneksi God Nodes:** Terhubung langsung ke `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (4 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `commitDirect` | Arrow Function | Internal | L21 | `(raw)` |
  | `startLabelScrub` | Arrow Function | Internal | L28 | `(e)` |
  | `mv` | Arrow Function | Internal | L35 | `(ev)` |
  | `up` | Arrow Function | Internal | L42 | - |

---

#### 55. `src/components/ui/SegmentedControl.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~37 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen kontrol bersegmen animasi pil (Seg & GradChoice)

- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 56. `src/components/ui/SelectDropdown.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~49 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen menu pilihan (Select Dropdown) kustom berbasis FloatPopover

- **Koneksi God Nodes:** Terhubung langsung ke `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (3 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `toggle` | Arrow Function | Internal | L22 | - |
  | `choose` | Arrow Function | Internal | L26 | `(k)` |
  | `key` | Arrow Function | Internal | L31 | `(e)` |

---

#### 57. `src/components/ui/Slider.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~123 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen slider geser interaktif kustom dengan dukungan papan ketik & pointer capture

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (6 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `setRefs` | Arrow Function | Internal | L35 | `(el)` |
  | `from` | Arrow Function | Internal | L39 | `(e)` |
  | `down` | Arrow Function | Internal | L59 | `(e)` |
  | `mv` | Arrow Function | Internal | L75 | `(e)` |
  | `end` | Arrow Function | Internal | L84 | - |
  | `key` | Arrow Function | Internal | L96 | `(e)` |

---

#### 58. `src/components/ui/TransformField.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~142 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen input angka transformasi dengan label scrubbable & tombol stepper (XfField)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (13 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `evalNumericExpr` | Arrow Function | Internal | L9 | `(raw, fallbackVal)` |
  | `parseExpr` | Arrow Function | Internal | L19 | - |
  | `parseTerm` | Arrow Function | Internal | L28 | - |
  | `parseFactor` | Arrow Function | Internal | L37 | - |
  | `fmt` | Arrow Function | Internal | L69 | `(v)` |
  | `commit` | Arrow Function | Internal | L70 | `(s)` |
  | `bump` | Arrow Function | Internal | L78 | `(d, e)` |
  | `startStepHold` | Arrow Function | Internal | L86 | `(d, e)` |
  | `stop` | Arrow Function | Internal | L95 | - |
  | `startScrub` | Arrow Function | Internal | L104 | `(e)` |
  | `mv` | Arrow Function | Internal | L110 | `(ev)` |
  | `up` | Arrow Function | Internal | L117 | - |
  | `onWheel` | Arrow Function | Internal | L124 | `(e)` |

---

### Domain: Components: Modals & Overlays (3 File)

#### 59. `src/components/modals/HelpShortcutsModal.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~30 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Dialog modal daftar pintasan papan ketik (Help)

- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.
---

#### 60. `src/components/modals/SettingsModal.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~210 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Dialog modal pengaturan tampilan, aksen, performa GPU, & informasi aplikasi (Settings)

- **Daftar Fungsi, Komponen, Class & Konstanta (8 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `onCfg` | Arrow Function | Internal | L40 | - |
  | `setRenderCfg` | Arrow Function | Internal | L46 | `(patch)` |
  | `set` | Arrow Function | Internal | L52 | `(k)` |
  | `reset` | Arrow Function | Internal | L69 | - |
  | `loadTestSvg` | Arrow Function | Internal | L89 | `(svgStr, label)` |
  | `loadTestDoc` | Arrow Function | Internal | L92 | `(d, label)` |
  | `setZ` | Arrow Function | Internal | L95 | `(zf)` |
  | `runAutomatedBenchmarks` | Arrow Function | Internal | L98 | - |

---

#### 61. `src/components/modals/TooltipHost.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~204 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen host delegasi tooltip mengambang global (TipHost)

- **Koneksi God Nodes:** Terhubung langsung ke `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (15 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `TipHost` | Component | Ekspor | L12 | - |
  | `find` | Arrow Function | Internal | L33 | `(t)` |
  | `hide` | Arrow Function | Internal | L44 | - |
  | `show` | Arrow Function | Internal | L58 | `(el, now, byFocus)` |
  | `go` | Arrow Function | Internal | L66 | - |
  | `inside` | Arrow Function | Internal | L81 | `(el, x, y)` |
  | `over` | Arrow Function | Internal | L86 | `(e)` |
  | `out` | Arrow Function | Internal | L99 | `(e)` |
  | `move` | Arrow Function | Internal | L106 | `(e)` |
  | `down` | Arrow Function | Internal | L112 | `(e)` |
  | `fin` | Arrow Function | Internal | L118 | `(e)` |
  | `key` | Arrow Function | Internal | L122 | `(e)` |
  | `any` | Arrow Function | Internal | L131 | - |
  | `vis` | Arrow Function | Internal | L134 | - |
  | `L` | Arrow Function | Internal | L146 | `(t, n, f, o)` |

---

### Domain: Components: Workspace Dashboard (2 File)

#### 62. `src/components/workspace/WorkspaceHome.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~369 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen halaman utama manajemen proyek Workspace Geovanta (WorkspaceHome)

- **Daftar Fungsi, Komponen, Class & Konstanta (15 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `refreshWorkspace` | Arrow Function | Internal | L45 | - |
  | `closeMenu` | Arrow Function | Internal | L64 | `(e)` |
  | `handleQuickCreate` | Arrow Function | Internal | L72 | `(customName, w = 800, h = 600)` |
  | `handleRenameSubmit` | Arrow Function | Internal | L92 | - |
  | `handleDuplicate` | Arrow Function | Internal | L108 | `(proj)` |
  | `handleMoveToTrash` | Arrow Function | Internal | L117 | `(proj)` |
  | `handleRestoreFromTrash` | Arrow Function | Internal | L126 | `(proj)` |
  | `handlePermanentDelete` | Arrow Function | Internal | L135 | - |
  | `handleToggleFavorite` | Arrow Function | Internal | L147 | `(proj, e)` |
  | `handleExportBackup` | Arrow Function | Internal | L154 | `(proj)` |
  | `handleImportProjectFiles` | Arrow Function | Internal | L163 | `(fileList)` |
  | `triggerNativeFileImport` | Arrow Function | Internal | L187 | - |
  | `ARTBOARD_PRESETS` | Constant | Internal | L204 | - |
  | `NAV_ITEMS` | Constant | Internal | L205 | - |
  | `SORT_OPTIONS` | Constant | Internal | L226 | - |

---

#### 63. `src/components/workspace/WorkspaceProjectThumb.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components, Workspace & Asset Management
- **Total Baris Kode:** ~90 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Komponen kartu pratinjau visual proyek pada halaman beranda Workspace (WorkspaceProjectThumb)

- **Daftar Fungsi, Komponen, Class & Konstanta (1 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `setBlobUrl` | Arrow Function | Internal | L21 | `(blob)` |

---

### Domain: Workspace: Project Storage & Asset Pipeline (6 File)

#### 64. `src/workspace/assetManager.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~439 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Manajer deduplikasi aset gambar berbasis hash SHA-256 & siklus hidup Blob URL (AssetManager)

- **Daftar Fungsi, Komponen, Class & Konstanta (15 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `AssetManager` | Component | Ekspor | L12 | `(()` |
  | `normalizeMime` | Arrow Function | Internal | L15 | `(mime, filename = '')` |
  | `extFromMime` | Arrow Function | Internal | L26 | `(mime)` |
  | `dataUrlToBlob` | Arrow Function | Internal | L33 | `(dataUrl)` |
  | `blobToDataUrl` | Arrow Function | Internal | L61 | `(blob)` |
  | `getOrCreateObjectUrl` | Arrow Function | Internal | L78 | `(assetId, blob, projectId)` |
  | `ingestBlob` | Arrow Function | Internal | L91 | `(projectId, fileOrBlob, customName)` |
  | `getAsset` | Arrow Function | Internal | L122 | `(assetId, expectedProjectId)` |
  | `getProjectAssets` | Arrow Function | Internal | L129 | `(projectId)` |
  | `prepareDocumentForStorage` | Arrow Function | Internal | L136 | `(projectId, doc)` |
  | `hydrateDocument` | Arrow Function | Internal | L255 | `(projectId, doc, preloadedAssets = null)` |
  | `resolveDocForStandaloneExport` | Arrow Function | Internal | L366 | `(projectId, doc)` |
  | `releaseProjectUrls` | Arrow Function | Internal | L392 | `(projectId)` |
  | `releaseAssetUrl` | Arrow Function | Internal | L405 | `(assetId)` |
  | `getActiveUrlCount` | Arrow Function | Internal | L415 | - |

---

#### 65. `src/workspace/projectRepository.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~925 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Repositori proyek lokal: autosave, pemulihan snapshot, duplikasi, & ekspor/impor .geovanta

- **Daftar Fungsi, Komponen, Class & Konstanta (26 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `ProjectRepository` | Component | Ekspor | L15 | `(()` |
  | `DOC_SCHEMA_LIMITS` | Constant | Internal | L17 | - |
  | `validateDocStructure` | Arrow Function | Internal | L26 | `(doc)` |
  | `isFinCoord` | Arrow Function | Internal | L33 | `(v)` |
  | `estimateDocSize` | Arrow Function | Internal | L69 | `(docRecord, assetsList = [], thumbBlob = null)` |
  | `createProject` | Arrow Function | Internal | L84 | `(opts = {})` |
  | `getProject` | Arrow Function | Internal | L145 | `(projectId)` |
  | `getDocumentByProject` | Arrow Function | Internal | L149 | `(project)` |
  | `listProjects` | Arrow Function | Internal | L160 | `(opts = {})` |
  | `openProject` | Arrow Function | Internal | L206 | `(projectId)` |
  | `renameProject` | Arrow Function | Internal | L242 | `(projectId, newName)` |
  | `toggleFavorite` | Arrow Function | Internal | L257 | `(projectId)` |
  | `duplicateProject` | Arrow Function | Internal | L271 | `(projectId)` |
  | `moveToTrash` | Arrow Function | Internal | L356 | `(projectId)` |
  | `restoreFromTrash` | Arrow Function | Internal | L369 | `(projectId)` |
  | `deletePermanently` | Arrow Function | Internal | L382 | `(projectId)` |
  | `saveCrashCheckpoint` | Arrow Function | Internal | L500 | `(projectId, doc, viewState, baseRevision)` |
  | `getRecoveryCandidate` | Arrow Function | Internal | L537 | `(projectId, mainRevision)` |
  | `checkAllRecoveryCandidates` | Arrow Function | Internal | L548 | - |
  | `restoreSnapshotToMain` | Arrow Function | Internal | L567 | `(projectId, snapshotId)` |
  | `discardNewerSnapshots` | Arrow Function | Internal | L582 | `(projectId, maxKeepRevision)` |
  | `getStorageStats` | Arrow Function | Internal | L594 | - |
  | `requestPersistentStorage` | Arrow Function | Internal | L630 | - |
  | `exportBackupBlob` | Arrow Function | Ekspor | L642 | `(projectId)` |
  | `importBackupBlob` | Arrow Function | Internal | L735 | `(fileOrBlob)` |
  | `MAX_BACKUP_BYTES` | Constant | Internal | L737 | - |

---

#### 66. `src/workspace/thumbnailGenerator.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~316 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Generator gambar pratinjau (Thumbnail) proyek secara asinkron di latar belakang

- **Daftar Fungsi, Komponen, Class & Konstanta (9 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `ThumbnailGenerator` | Component | Ekspor | L10 | `(()` |
  | `MAX_W` | Constant | Internal | L13 | - |
  | `MAX_H` | Constant | Internal | L14 | - |
  | `THUMB_SCALE` | Constant | Internal | L15 | - |
  | `computeDims` | Arrow Function | Internal | L16 | `(viewBox)` |
  | `loadImgElement` | Arrow Function | Internal | L32 | `(src, timeoutMs = 900)` |
  | `preloadThumbImagesParallel` | Arrow Function | Internal | L60 | `(objs, maxConcurrency = 4, totalBudgetMs = 1500)` |
  | `worker` | Arrow Function | Internal | L66 | - |
  | `generateThumbnailBlob` | Arrow Function | Internal | L81 | `(doc, opts = {})` |

---

#### 67. `src/workspace/workspaceController.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~530 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Koordinator siklus hidup proyek & sinkronisasi status ruang kerja (WorkspaceController)

- **Daftar Fungsi, Komponen, Class & Konstanta (24 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `WorkspaceController` | Component | Ekspor | L16 | `(()` |
  | `AUTOSAVE_DEBOUNCE_MS` | Constant | Internal | L17 | - |
  | `THUMB_THROTTLE_MS` | Constant | Internal | L18 | - |
  | `CHECKPOINT_INTERVAL_MS` | Constant | Internal | L19 | - |
  | `CHECKPOINT_COMMIT_STEP` | Constant | Internal | L20 | - |
  | `setSaveStatus` | Arrow Function | Internal | L31 | `(status)` |
  | `getSaveStatus` | Arrow Function | Internal | L39 | - |
  | `onSaveStatusChange` | Arrow Function | Internal | L40 | `(fn)` |
  | `onQuotaError` | Arrow Function | Internal | L44 | `(fn)` |
  | `notifyQuotaError` | Arrow Function | Internal | L48 | `(info)` |
  | `_scheduleBackgroundThumbnail` | Arrow Function | Internal | L66 | `(projectId, doc, seq)` |
  | `_processQueue` | Arrow Function | Internal | L83 | - |
  | `scheduleAutosave` | Arrow Function | Internal | L184 | `(projectId, doc, viewState)` |
  | `flushAutosave` | Arrow Function | Internal | L214 | `(opts = {})` |
  | `retryFailedSave` | Arrow Function | Internal | L268 | - |
  | `resetSessionState` | Arrow Function | Internal | L274 | `(initialStatus = 'saved')` |
  | `readFileAsText` | Arrow Function | Internal | L287 | `(file)` |
  | `measureImageFromUrl` | Arrow Function | Internal | L293 | `(url)` |
  | `detectFileCategory` | Arrow Function | Internal | L302 | `(file)` |
  | `cancelActiveImport` | Arrow Function | Internal | L329 | - |
  | `yieldToMain` | Arrow Function | Internal | L332 | - |
  | `importFileAsNewProject` | Arrow Function | Internal | L333 | `(file, opts = {})` |
  | `MAX_IMPORT_BYTES` | Constant | Internal | L335 | - |
  | `triggerBackupDownload` | Arrow Function | Internal | L476 | `(projectId)` |

---

#### 68. `src/workspace/workspaceDb.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~310 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Lapisan basis data lokal IndexedDB dengan fallback memori RAM otomatis (WorkspaceDB)

- **Daftar Fungsi, Komponen, Class & Konstanta (16 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `WorkspaceDB` | Component | Ekspor | L12 | `(()` |
  | `_initMemFallback` | Arrow Function | Internal | L15 | - |
  | `open` | Arrow Function | Internal | L29 | - |
  | `reqToPromise` | Arrow Function | Internal | L166 | `(req)` |
  | `runTransaction` | Arrow Function | Internal | L170 | `(storeNames, mode, executor)` |
  | `setSimulatedQuotaError` | Arrow Function | Internal | L248 | `(flag)` |
  | `getStorageMode` | Arrow Function | Internal | L252 | - |
  | `isMemoryFallback` | Arrow Function | Internal | L257 | - |
  | `onStorageModeChange` | Arrow Function | Internal | L258 | `(fn)` |
  | `get` | Arrow Function | Internal | L262 | `(storeName, key)` |
  | `getAll` | Arrow Function | Internal | L263 | `(storeName)` |
  | `getAllByIndex` | Arrow Function | Internal | L264 | `(storeName, indexName, value)` |
  | `put` | Arrow Function | Internal | L265 | `(storeName, record)` |
  | `remove` | Arrow Function | Internal | L266 | `(storeName, key)` |
  | `getMetadata` | Arrow Function | Internal | L267 | `(key)` |
  | `setMetadata` | Arrow Function | Internal | L271 | `(key, value)` |

---

#### 69. `src/workspace/zipEngine.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~308 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Mesin pengemas & pembongkar arsip proyek .geovanta berbasis ZIP/CRC32 murni (ZipEngine)

- **Daftar Fungsi, Komponen, Class & Konstanta (8 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `ZipEngine` | Component | Ekspor | L8 | `(()` |
  | `CRC_TABLE` | Arrow Function | Internal | L9 | `(()` |
  | `crc32` | Arrow Function | Internal | L18 | `(u8)` |
  | `createZipBlob` | Arrow Function | Internal | L30 | `(entries)` |
  | `ZIP_LIMITS` | Constant | Internal | L102 | - |
  | `isSafeZipEntryPath` | Arrow Function | Internal | L112 | `(name)` |
  | `inflateRawBytes` | Arrow Function | Internal | L121 | `(compressedU8, maxAllowedBytes = ZIP_LIMITS.MAX_ENTRY_BYTES, maxRatio = ZIP_LIMITS.MAX_COMPRESSION_RATIO)` |
  | `readZipBuffer` | Arrow Function | Internal | L172 | `(arrayBuffer, customLimits = null)` |

---

### Domain: Utils: Colors, Fonts & Hardware (10 File)

#### 70. `src/utils/colorMath.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components, Path Math & Document I/O
- **Total Baris Kode:** ~57 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Konversi ruang warna sRGB, OKLab, dan HSV

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (10 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `lin` | Arrow Function | Ekspor | L6 | `(v)` |
  | `rgb2ok` | Function | Ekspor | L10 | `(r, g, b)` |
  | `ok2hex` | Arrow Function | Ekspor | L19 | `(L, a, b)` |
  | `e` | Arrow Function | Internal | L23 | `(v)` |
  | `hex2` | Arrow Function | Ekspor | L32 | `(v)` |
  | `toHex` | Arrow Function | Ekspor | L33 | `(r, g, b)` |
  | `hsv2hex` | Arrow Function | Ekspor | L34 | `(h, s, v)` |
  | `f` | Arrow Function | Internal | L35 | `(n)` |
  | `hex2hsv` | Arrow Function | Ekspor | L41 | `(hx)` |
  | `clampN` | Arrow Function | Ekspor | L55 | `(v, a, b)` |

---

#### 71. `src/utils/colorParserAndFormatter.jsx`
- **Komunitas Graphify:** Affine Transforms & Snapping Solver, Editor Canvas & UI Components, Path Math & Document I/O, Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~139 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Parser & formatter warna CSS dengan kanal alfa (RGBA/Hex)

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (10 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `hex3b` | Arrow Function | Ekspor | L8 | `(r, g, b)` |
  | `cssPaint` | Arrow Function | Ekspor | L9 | `(c)` |
  | `parseColorWithAlpha` | Arrow Function | Ekspor | L15 | `(val)` |
  | `formatColorWithAlpha` | Arrow Function | Ekspor | L73 | `(hex, a)` |
  | `PAINT_RGBA_CACHE` | Constant | Ekspor | L82 | - |
  | `parsePaintRgba01` | Function | Ekspor | L83 | `(colStr, opacity = 1)` |
  | `VCTX` | Arrow Function | Ekspor | L109 | `(()` |
  | `HEX_CACHE` | Constant | Ekspor | L116 | - |
  | `cssToHex` | Arrow Function | Ekspor | L117 | `(c)` |
  | `validColor` | Arrow Function | Ekspor | L137 | `(s)` |

---

#### 72. `src/utils/fontManager.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~354 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Layanan manajemen pemuatan font Google Fonts & font lokal

- **Daftar Fungsi, Komponen, Class & Konstanta (19 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `FontManager` | Component | Ekspor | L8 | `(()` |
  | `STORAGE_KEY` | Constant | Internal | L9 | - |
  | `IDB_META_KEY` | Constant | Internal | L10 | - |
  | `_notify` | Arrow Function | Internal | L14 | - |
  | `_saveToStorage` | Arrow Function | Internal | L22 | - |
  | `validateGoogleFontUrl` | Arrow Function | Internal | L40 | `(rawUrl)` |
  | `parseGoogleFontUrl` | Arrow Function | Internal | L94 | `(rawUrl)` |
  | `_injectStylesheet` | Arrow Function | Internal | L170 | `(fontEntry)` |
  | `addFontUrl` | Arrow Function | Internal | L218 | `(rawUrl)` |
  | `removeFont` | Arrow Function | Internal | L250 | `(id)` |
  | `getCustomFonts` | Arrow Function | Internal | L258 | - |
  | `getAllFonts` | Arrow Function | Internal | L259 | - |
  | `SYSTEM_FONT_NAMES` | Constant | Internal | L260 | - |
  | `ensureFontLoaded` | Arrow Function | Internal | L262 | `(val)` |
  | `findFontByNameOrFamily` | Arrow Function | Internal | L278 | `(val)` |
  | `subscribe` | Arrow Function | Internal | L291 | `(fn)` |
  | `_mergeHydratedList` | Arrow Function | Internal | L295 | `(arr)` |
  | `init` | Arrow Function | Internal | L320 | - |
  | `hydrateFromWorkspaceDB` | Arrow Function | Internal | L329 | - |

---

#### 73. `src/utils/gpuCapabilities.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~237 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Deteksi kapabilitas WebGL2 GPU, profil perangkat, & batas aman framebuffer

- **Daftar Fungsi, Komponen, Class & Konstanta (8 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `probeGpuCapabilities` | Arrow Function | Ekspor | L8 | - |
  | `GPU_CAPS` | Constant | Ekspor | L76 | - |
  | `detectGpuRenderer` | Arrow Function | Ekspor | L77 | - |
  | `GPU_INFO` | Constant | Ekspor | L78 | - |
  | `DEVICE_PROFILES` | Constant | Ekspor | L82 | - |
  | `detectDeviceProfile` | Arrow Function | Ekspor | L174 | `(overrideTier = null)` |
  | `setDeviceProfileTier` | Arrow Function | Ekspor | L196 | `(tier)` |
  | `computeSafeFramebufferSize` | Arrow Function | Ekspor | L205 | `(cssW, cssH, requestedDpr, profile = ACTIVE_DEVICE_PROFILE, aaMode = 'msaa')` |

---

#### 74. `src/utils/presenceAndFilePicker.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~45 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Hook animasi transisi komponen & dialog pemilih file

- **Daftar Fungsi, Komponen, Class & Konstanta (3 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `usePresence` | Arrow Function | Ekspor | L7 | `(open, ms = 160)` |
  | `pickFiles` | Arrow Function | Ekspor | L26 | `(accept, cb)` |
  | `pickFile` | Arrow Function | Ekspor | L41 | `(accept, cb)` |

---

#### 75. `src/utils/renderConfigAndTelemetry.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components, Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~321 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Konfigurasi pipeline render & telemetri performa frame/memori

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (17 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `MAX_RENDER_DPR` | Constant | Ekspor | L21 | - |
  | `RENDER_CONFIG` | Constant | Ekspor | L22 | - |
  | `getActivePixelPreviewMode` | Arrow Function | Ekspor | L56 | `(zoom)` |
  | `isPixelBoxModeActive` | Arrow Function | Ekspor | L64 | `(zoom)` |
  | `updateRenderConfig` | Arrow Function | Ekspor | L68 | `(patch)` |
  | `PERF_TELEMETRY` | Arrow Function | Ekspor | L108 | `(()` |
  | `MAX_SAMPLES` | Constant | Internal | L109 | - |
  | `recordFrameIntervalSample` | Arrow Function | Internal | L178 | `(dt)` |
  | `probeNativeRefreshRate` | Arrow Function | Internal | L199 | `(framesToSample = 28)` |
  | `step` | Arrow Function | Internal | L204 | `(ts)` |
  | `recordRenderPass` | Arrow Function | Internal | L215 | `(execMs, nowTs)` |
  | `pick` | Arrow Function | Internal | L227 | `(q)` |
  | `recordFrameDelta` | Arrow Function | Internal | L238 | `(dt)` |
  | `markInteractionFrame` | Arrow Function | Internal | L239 | - |
  | `updateSceneMetrics` | Arrow Function | Internal | L248 | `(metrics)` |
  | `getSnapshot` | Arrow Function | Internal | L299 | - |
  | `getBadgeText` | Arrow Function | Internal | L305 | `(gpuEnabled)` |

---

#### 76. `src/utils/screenPipette.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~118 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Alat pipet warna layar (EyeDropper & kanvas fallback)

- **Daftar Fungsi, Komponen, Class & Konstanta (6 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `colorAtPoint` | Arrow Function | Ekspor | L7 | `(x, y)` |
  | `pagePipette` | Arrow Function | Ekspor | L56 | - |
  | `upd` | Arrow Function | Internal | L71 | `(e)` |
  | `done` | Arrow Function | Internal | L78 | `(c)` |
  | `kd` | Arrow Function | Internal | L83 | `(e)` |
  | `pickScreenColor` | Arrow Function | Ekspor | L104 | - |

---

#### 77. `src/utils/shapeGenerators.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~57 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Generator geometri bentuk dasar poligon, bintang, dan kurva unit

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`
- **Daftar Fungsi, Komponen, Class & Konstanta (8 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `SHK` | Constant | Ekspor | L6 | - |
  | `shPoly` | Arrow Function | Ekspor | L7 | `(pts, x, y, w, h)` |
  | `shFit` | Arrow Function | Ekspor | L8 | `(pts)` |
  | `shNgon` | Arrow Function | Ekspor | L17 | `(n, a0)` |
  | `shStar` | Arrow Function | Ekspor | L23 | `(n, ri)` |
  | `shUnit` | Arrow Function | Ekspor | L30 | `(t, x, y, w, h)` |
  | `K2` | Constant | Ekspor | L44 | - |
  | `shapeRect` | Arrow Function | Ekspor | L45 | `(a, b, prop)` |

---

#### 78. `src/utils/themeAndPrefsManager.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~86 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Manajer penyimpanan preferensi pengguna, tema gelap/terang, & reduksi gerak

- **Daftar Fungsi, Komponen, Class & Konstanta (5 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `applyAccent` | Arrow Function | Ekspor | L7 | `(acc)` |
  | `loadPrefs` | Arrow Function | Ekspor | L41 | - |
  | `savePrefs` | Arrow Function | Ekspor | L68 | `(p)` |
  | `applyTheme` | Arrow Function | Ekspor | L77 | `(theme)` |
  | `applyMotion` | Arrow Function | Ekspor | L81 | `(motion)` |

---

#### 79. `src/utils/zoomAndFormatHelpers.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components, Workspace & Asset Management
- **Total Baris Kode:** ~88 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Fungsi pemetaan slider zoom logaritmik, pemformat angka, ukuran byte, & waktu relatif

- **Koneksi God Nodes:** Terhubung langsung ke `VectorEditor()`, `clampN()`
- **Daftar Fungsi, Komponen, Class & Konstanta (9 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `vzToSl` | Arrow Function | Ekspor | L8 | `(z)` |
  | `vslToZ` | Arrow Function | Ekspor | L9 | `(v)` |
  | `fmtIntId` | Arrow Function | Ekspor | L10 | `(n)` |
  | `zFmt` | Arrow Function | Ekspor | L15 | `(z)` |
  | `wsUid` | Arrow Function | Ekspor | L32 | `(prefix = 'id')` |
  | `isQuotaExceededError` | Arrow Function | Ekspor | L33 | `(err)` |
  | `formatBytes` | Arrow Function | Ekspor | L44 | `(bytes)` |
  | `formatDateRel` | Arrow Function | Ekspor | L51 | `(ts)` |
  | `formatDateTimeFull` | Arrow Function | Ekspor | L72 | `(ts)` |

---

### Domain: Constants & Presets (7 File)

#### 80. `src/constants/brandAndIcons.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~57 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Logo SVG & dictionary ikon antarmuka Geovanta

- **Daftar Fungsi, Komponen, Class & Konstanta (2 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `LOGO_INNER` | Constant | Ekspor | L5 | - |
  | `ICONS` | Constant | Ekspor | L6 | - |

---

#### 81. `src/constants/editorToolsAndShapes.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~212 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Definisi grup alat Vector Editor, pustaka bentuk (SHAPES), opsi snap, & preset gradien

- **Daftar Fungsi, Komponen, Class & Konstanta (9 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `VE_NODE_GROUP` | Constant | Ekspor | L9 | - |
  | `VE_GEO_GROUP` | Constant | Ekspor | L13 | - |
  | `VE_TOOLS` | Constant | Ekspor | L17 | - |
  | `SHAPES` | Constant | Ekspor | L37 | - |
  | `DEFAULT_SNAP_CFG` | Constant | Ekspor | L56 | - |
  | `SNAP_OPTS` | Constant | Ekspor | L68 | - |
  | `SNAP_TOOL_CAPABILITIES` | Constant | Ekspor | L69 | - |
  | `ALN_BTNS` | Constant | Ekspor | L205 | - |
  | `GRAD_PRESETS` | Constant | Ekspor | L210 | - |

---

#### 82. `src/constants/fontCatalog.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~147 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Daftar font bawaan dan bobot tipografi

- **Daftar Fungsi, Komponen, Class & Konstanta (3 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `ALL_FONT_WEIGHTS` | Constant | Ekspor | L13 | - |
  | `BUILTIN_FONTS` | Constant | Ekspor | L14 | - |
  | `FONT_WEIGHT_LABELS` | Constant | Ekspor | L135 | - |

---

#### 83. `src/constants/keyboardShortcuts.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~8 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Daftar pintasan papan ketik (Keyboard Shortcuts)

- **Daftar Fungsi, Komponen, Class & Konstanta (1 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `SC` | Constant | Ekspor | L5 | - |

---

#### 84. `src/constants/themeAndPrefsConstants.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~30 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Konstanta preferensi tema, palet aksen, dan batas zoom

- **Daftar Fungsi, Komponen, Class & Konstanta (5 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `LS_KEY` | Constant | Ekspor | L6 | - |
  | `DEFAULT_PREFS` | Constant | Ekspor | L7 | - |
  | `ACCENT_PALETTE` | Constant | Ekspor | L16 | - |
  | `TECH` | Constant | Ekspor | L17 | - |
  | `VZMIN` | Constant | Ekspor | L26 | - |

---

#### 85. `src/constants/tooltipsCatalog.jsx`
- **Komunitas Graphify:** Editor Canvas & UI Components
- **Total Baris Kode:** ~1093 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Katalog lengkap teks tooltip Bahasa Indonesia

- **Daftar Fungsi, Komponen, Class & Konstanta (1 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `TIPS` | Constant | Ekspor | L6 | - |

---

#### 86. `src/constants/workspaceConstants.jsx`
- **Komunitas Graphify:** Workspace & Asset Management
- **Total Baris Kode:** ~46 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Konstanta konfigurasi database Workspace & status simpan

- **Daftar Fungsi, Komponen, Class & Konstanta (7 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `WORKSPACE_DB_NAME` | Constant | Ekspor | L15 | - |
  | `WORKSPACE_DB_VERSION` | Constant | Ekspor | L16 | - |
  | `WORKSPACE_SCHEMA_VERSION` | Constant | Ekspor | L17 | - |
  | `MAX_SNAPSHOTS_PER_PROJECT` | Constant | Ekspor | L18 | - |
  | `ALLOWED_ASSET_MIMES` | Constant | Ekspor | L19 | - |
  | `WS_LAST_PROJECT_KEY` | Constant | Ekspor | L31 | - |
  | `SAVE_STATUS_LABELS` | Constant | Ekspor | L32 | - |

---

### Domain: Vendor & Desktop Runtime (3 File)

#### 87. `src/vendor/reactOfflineBundle.jsx`
- **Komunitas Graphify:** React Offline Runtime
- **Total Baris Kode:** ~991 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Offline Bundled React 18.3.1 & ReactDOM 18.3.1 Compatible Runtime Zero-CDN Local Production Runtime with Fiber Reconciliation, Hooks, Memo, Portals & Full SVG Namespace Support

- **Daftar Fungsi, Komponen, Class & Konstanta (52 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `REACT_ELEMENT_TYPE` | Constant | Internal | L8 | - |
  | `REACT_PORTAL_TYPE` | Constant | Internal | L9 | - |
  | `REACT_FRAGMENT_TYPE` | Constant | Internal | L10 | - |
  | `REACT_CONTEXT_TYPE` | Constant | Internal | L11 | - |
  | `REACT_PROVIDER_TYPE` | Constant | Internal | L12 | - |
  | `REACT_MEMO_TYPE` | Constant | Internal | L13 | - |
  | `REACT_FORWARD_REF_TYPE` | Constant | Internal | L14 | - |
  | `SVG_NS` | Constant | Internal | L16 | - |
  | `SVG_TAGS` | Constant | Internal | L17 | - |
  | `SVG_CAMEL_ATTRS` | Constant | Internal | L28 | - |
  | `UNITLESS_CSS` | Constant | Internal | L57 | - |
  | `flattenChildren` | Function | Internal | L67 | `(children, out)` |
  | `createElement` | Function | Internal | L83 | `(type, config, ...children)` |
  | `cloneElement` | Function | Internal | L112 | `(element, config, ...children)` |
  | `isValidElement` | Function | Internal | L134 | `(object)` |
  | `memo` | Function | Internal | L138 | `(type, compare)` |
  | `forwardRef` | Function | Internal | L142 | `(render)` |
  | `createContext` | Function | Internal | L146 | `(defaultValue)` |
  | `createPortal` | Function | Internal | L158 | `(children, containerInfo, key = null)` |
  | `shallowEqual` | Function | Internal | L167 | `(objA, objB)` |
  | `scheduleUpdate` | Function | Internal | L192 | `(comp)` |
  | `flushEffects` | Function | Internal | L202 | `(list)` |
  | `schedulePassiveEffects` | Function | Internal | L220 | - |
  | `flushUpdates` | Function | Internal | L228 | - |
  | `flushSync` | Function | Internal | L256 | `(fn)` |
  | `getHook` | Function | Internal | L262 | - |
  | `depsChanged` | Function | Internal | L274 | `(oldDeps, newDeps)` |
  | `useState` | Function | Internal | L282 | `(initialState)` |
  | `useReducer` | Function | Internal | L297 | `(reducer, initialArg, init)` |
  | `useRef` | Function | Internal | L312 | `(initialValue)` |
  | `useMemo` | Function | Internal | L320 | `(factory, deps)` |
  | `useCallback` | Function | Internal | L329 | `(callback, deps)` |
  | `useDeferredValue` | Function | Internal | L333 | `(value)` |
  | `useTransition` | Function | Internal | L337 | - |
  | `useId` | Function | Internal | L341 | - |
  | `useContext` | Function | Internal | L349 | `(context)` |
  | `useEffect` | Function | Internal | L353 | `(effect, deps)` |
  | `useLayoutEffect` | Function | Internal | L363 | `(effect, deps)` |
  | `assignRef` | Function | Internal | L373 | `(ref, value)` |
  | `normalizeEventName` | Function | Internal | L382 | `(propName)` |
  | `updateDomProps` | Function | Internal | L394 | `(dom, oldProps, newProps, isSvg)` |
  | `listener` | Arrow Function | Internal | L466 | `(e)` |
  | `getFirstDom` | Function | Internal | L511 | `(fiber)` |
  | `getLastDom` | Function | Internal | L524 | `(fiber)` |
  | `collectDoms` | Function | Internal | L537 | `(fiber, out)` |
  | `unmountFiber` | Function | Internal | L554 | `(fiber, removeFromDom = true)` |
  | `sameTypeAndKey` | Function | Internal | L590 | `(oldFiber, vnode)` |
  | `renderFunctionComponent` | Function | Internal | L602 | `(comp, renderFn, props, refOrUndefined)` |
  | `rerenderComponent` | Function | Internal | L625 | `(comp)` |
  | `reconcileSingle` | Function | Internal | L632 | `(parentDom, oldFiber, vnode, isSvg, depth, beforeNode = null)` |
  | `reconcileChildrenArray` | Function | Internal | L824 | `(parentDom, oldFibers, newVNodes, isSvg, depth, outerBeforeNode)` |
  | `createRoot` | Function | Internal | L907 | `(container)` |

---

#### 88. `src/vendor/tailwindOfflineBundle.jsx`
- **Komunitas Graphify:** Tailwind CSS Offline Engine
- **Total Baris Kode:** ~541 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Offline Bundled Tailwind CSS v3.4.17 JIT Engine, Preflight Reset & Theme Plugin Runtime 100% Offline Local Bundle — Zero CDN, Zero Native CSS Files

- **Daftar Fungsi, Komponen, Class & Konstanta (17 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `SPACING_SCALE` | Constant | Internal | L8 | - |
  | `FONT_SIZE_SCALE` | Constant | Internal | L19 | - |
  | `RADIUS_SCALE` | Constant | Internal | L29 | - |
  | `COLOR_PALETTE` | Constant | Internal | L34 | - |
  | `escapeCssSelector` | Function | Internal | L49 | `(cls)` |
  | `decodeArbitrary` | Function | Internal | L56 | `(raw)` |
  | `compileBaseUtility` | Function | Internal | L60 | `(token)` |
  | `STATIC` | Constant | Internal | L78 | - |
  | `splitVariants` | Function | Internal | L366 | `(cls)` |
  | `formatDecls` | Function | Internal | L385 | `(pairs)` |
  | `compileTailwindClass` | Function | Internal | L389 | `(cls)` |
  | `TAILWIND_PREFLIGHT_AST` | Constant | Internal | L436 | - |
  | `TAILWIND_PLUGIN_AST` | Constant | Internal | L437 | - |
  | `compilePluginDescriptor` | Function | Internal | L439 | `(node)` |
  | `initTailwindOfflineRuntime` | Function | Internal | L450 | - |
  | `scanElement` | Function | Internal | L464 | `(el)` |
  | `scanRoot` | Function | Internal | L488 | - |

---

#### 89. `src/vendor/tauriDesktopBridge.jsx`
- **Komunitas Graphify:** Rendering Pipeline & GPU Geometry
- **Total Baris Kode:** ~48 baris
- **Deskripsi Fitur & Tanggung Jawab:**
  Bridge integrasi native Tauri v2 / v1 untuk Windows 64-bit Desktop App (dialog file, sistem berkas, & jendela)

- **Daftar Fungsi, Komponen, Class & Konstanta (4 entitas terdeteksi):**

  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |
  | :--- | :--- | :--- | :--- | :--- |
  | `isTauriDesktop` | Arrow Function | Ekspor | L7 | - |
  | `invokeTauriCommand` | Arrow Function | Ekspor | L11 | `(cmd, args = {})` |
  | `syncDesktopWindowTitle` | Arrow Function | Ekspor | L29 | `(projectName, saveStatus)` |
  | `TauriDesktopStatusBadge` | Component | Ekspor | L38 | - |

---
