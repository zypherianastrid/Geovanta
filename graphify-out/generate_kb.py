import json, re, os, glob
from pathlib import Path

def generate_markdown():
    # 1. Load graphify data
    graph = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
    nodes = graph['nodes']
    links = graph['links']

    node_map = {n['id']: n for n in nodes}
    file_to_nodes = {}
    for n in nodes:
        sf = n.get('source_file')
        if sf:
            norm = str(Path(sf)).replace('\\', '/')
            if norm.startswith('./'):
                norm = norm[2:]
            file_to_nodes.setdefault(norm, []).append(n)

    # Build edge graph
    edges_by_node = {}
    for link in links:
        u = link['source']
        v = link['target']
        rel = link.get('relation', 'connected_to')
        conf = link.get('confidence', 'EXTRACTED')
        edges_by_node.setdefault(u, []).append((v, rel, conf))
        edges_by_node.setdefault(v, []).append((u, rel, conf))

    def parse_source_file(filepath):
        p = Path(filepath)
        if not p.exists():
            return {"desc": "", "items": [], "lines": 0}
        
        text = p.read_text(encoding='utf-8', errors='replace')
        lines = text.splitlines()
        
        # Description extraction
        desc = ""
        desc_match = re.search(r'@description\s+([^\n*]+)', text)
        if desc_match:
            desc = desc_match.group(1).strip()
        else:
            comment_lines = []
            in_block = False
            for l in lines[:25]:
                sl = l.strip()
                if sl.startswith("/*") or sl.startswith("/**"):
                    in_block = True
                if in_block:
                    clean = sl.replace("/*", "").replace("*/", "").replace("*", "").strip()
                    if clean:
                        comment_lines.append(clean)
                    if "*/" in sl:
                        in_block = False
                elif sl.startswith("//"):
                    comment_lines.append(sl[2:].strip())
                elif sl and not in_block:
                    break
            desc = " ".join(comment_lines)
            
        items = []
        class_pattern = re.compile(r'^(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+([a-zA-Z0-9_$]+))?')
        func_pattern = re.compile(r'^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*([a-zA-Z0-9_$]*)\s*\(([^)]*)\)')
        arrow_pattern = re.compile(r'^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>')
        single_arrow = re.compile(r'^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?([a-zA-Z0-9_$]+)\s*=>')
        const_pattern = re.compile(r'^(?:export\s+)?const\s+([A-Z0-9_$]{2,})\s*=')
        method_pattern = re.compile(r'^\s{2,4}(?:async\s+)?([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{')
        
        curr_class = None
        for idx, line in enumerate(lines, 1):
            s = line.strip()
            
            m_cls = class_pattern.match(s)
            if m_cls:
                cname = m_cls.group(1) or "(Anonymous Class)"
                ext = f" extends {m_cls.group(2)}" if m_cls.group(2) else ""
                is_exp = "export" in s
                curr_class = cname
                items.append({
                    "name": f"{cname}{ext}",
                    "type": "Class",
                    "args": "",
                    "line": idx,
                    "exported": is_exp,
                    "methods": []
                })
                continue
                
            if curr_class and len(items) > 0 and items[-1]["type"] == "Class":
                m_meth = method_pattern.match(line)
                if m_meth:
                    mname = m_meth.group(1)
                    margs = m_meth.group(2).strip()
                    if mname not in ('if', 'for', 'while', 'switch', 'catch'):
                        items[-1]["methods"].append((mname, margs, idx))
                if s == "}" and line.startswith("}"):
                    curr_class = None
                    
            m_func = func_pattern.match(s)
            if m_func:
                fname = m_func.group(1) or "(anonymous default function)"
                fargs = m_func.group(2).strip()
                is_exp = "export" in s
                items.append({
                    "name": fname,
                    "type": "Function",
                    "args": fargs,
                    "line": idx,
                    "exported": is_exp
                })
                continue
                
            m_arr = arrow_pattern.match(s)
            if m_arr:
                fname = m_arr.group(1)
                fargs = m_arr.group(2).strip()
                is_exp = "export" in s
                itype = "Component" if fname[0].isupper() and not fname.isupper() else "Arrow Function"
                items.append({
                    "name": fname,
                    "type": itype,
                    "args": fargs,
                    "line": idx,
                    "exported": is_exp
                })
                continue
                
            m_arr_s = single_arrow.match(s)
            if m_arr_s:
                fname = m_arr_s.group(1)
                fargs = m_arr_s.group(2).strip()
                is_exp = "export" in s
                items.append({
                    "name": fname,
                    "type": "Arrow Function",
                    "args": fargs,
                    "line": idx,
                    "exported": is_exp
                })
                continue
                
            m_const = const_pattern.match(s)
            if m_const:
                cname = m_const.group(1)
                is_exp = "export" in s
                items.append({
                    "name": cname,
                    "type": "Constant",
                    "args": "",
                    "line": idx,
                    "exported": is_exp
                })
                continue

        # Multi-exports check
        multi_exports = re.findall(r'export\s*\{\s*([^}]+)\s*\}', text)
        exported_names = set()
        for exp_block in multi_exports:
            for entry in exp_block.split(','):
                entry = entry.strip()
                if entry:
                    parts = entry.split(' as ')
                    exported_names.add(parts[-1].strip())
                    
        for it in items:
            if it["name"] in exported_names:
                it["exported"] = True
                
        return {"desc": desc, "items": items, "lines": len(lines)}

    # Collect all files
    all_files = []
    if Path("index.html").exists():
        all_files.append("index.html")
    all_files.extend(sorted(glob.glob("src/**/*.jsx", recursive=True)))
    all_files = [f.replace('\\', '/') for f in all_files]

    # Categories
    categories = {
        "Root & Entrypoints": [f for f in all_files if f in ('index.html', 'src/main.jsx', 'src/App.jsx')],
        "Engine: Core Geometry & Math": [f for f in all_files if f.startswith('src/engine/')],
        "Renderer: GPU Acceleration & Drawing": [f for f in all_files if f.startswith('src/renderer/')],
        "Components: Editor Shell & Canvas": [f for f in all_files if f.startswith('src/components/editor/')],
        "Components: UI Control Primitives": [f for f in all_files if f.startswith('src/components/ui/')],
        "Components: Modals & Overlays": [f for f in all_files if f.startswith('src/components/modals/')],
        "Components: Workspace Dashboard": [f for f in all_files if f.startswith('src/components/workspace/')],
        "Workspace: Project Storage & Asset Pipeline": [f for f in all_files if f.startswith('src/workspace/')],
        "Utils: Colors, Fonts & Hardware": [f for f in all_files if f.startswith('src/utils/')],
        "Constants & Presets": [f for f in all_files if f.startswith('src/constants/')],
        "Vendor & Desktop Runtime": [f for f in all_files if f.startswith('src/vendor/')],
    }

    md = []
    md.append("# Geovanta — Katalog Komprehensif Seluruh Fitur, Fungsi, dan Pengetahuan Graf (Graphify)\n")
    md.append("> **Dokumentasi Lengkap Berbasis Graphify Knowledge Graph**  ")
    md.append("> **Total File:** 89 file (`src/**` + `index.html`) | **Total Node:** 625 | **Total Edge:** 2,500 | **Komunitas:** 9 Komunitas\n")
    md.append("---\n")
    md.append("## 1. Ringkasan Arsitektur & Analisis Graphify\n")
    md.append("Geovanta adalah aplikasi editor grafis vektor 2D desktop murni offline (Windows 64-bit) dengan arsitektur modular tinggi, akselerasi GPU WebGL2 (dengan fallback Canvas 2D), sistem manipulasi kurva Bézier kubik analitik, auto-layout berbasis frame mirip Figma, serta mesin penyimpanan proyek offline berbasis IndexedDB dan ZIP (`.gv`).\n")
    md.append("### 1.1 Top 10 God Nodes (Abstraksi Inti Paling Terhubung)\n")
    god_nodes_info = [
        ("dist()", "51 edges", "Penghitung jarak Euclidean 2D dasar antar-titik (`Math.hypot`). Dipanggil di seluruh modul snapping, seleksi, hit-test, dan curve fitting."),
        ("sub()", "46 edges", "Operasi vektor pengurangan 2D (`a - b`). Fondasi utama transformasi affine, De Casteljau, dan diferensiasi kurva."),
        ("rd()", "43 edges", "Fungsi pembulatan presisi float numerik (`Math.round(v * 10000) / 10000`). Menjaga konsistensi serialisasi SVG dan mencegah floating point drift."),
        ("SceneRenderer", "39 edges", "Orkestrator rendering GPU utama. Menghubungkan tree komponen React UI dengan state mesin WebGL2/Canvas 2D."),
        ("VectorEditor()", "33 edges", "Komponen React canvas utama penampung event pointer, state kamera pan/zoom, manipulasi node, dan selection bounds."),
        ("cross()", "31 edges", "Perkalian silang 2D (cross product). Menentukan orientasi belokan titik (winding), arah kurva, dan uji segitiga."),
        ("cl()", "31 edges", "Kloning mendalam (deep clone) node vektor berserta koordinat handle kontrol in/out."),
        ("uid()", "30 edges", "Generator ID unik deterministik untuk setiap subpath, node, objek gambar, teks, dan frame."),
        ("clampN()", "30 edges", "Pembatas nilai numerik dalam rentang `[min, max]` untuk opacity, zoom, sudut rotasi, dan ukuran stroke."),
        ("dot()", "29 edges", "Perkalian titik 2D (dot product). Menghitung proyeksi titik pada garis vektor, cosinus sudut, dan refleksi gradien.")
    ]
    for name, deg, desc in god_nodes_info:
        md.append(f"- **`{name}`** ({deg}): {desc}")
    md.append("\n")

    md.append("### 1.2 Peta Komunitas (Graphify Clustering)\n")
    comms = {
        "Community 0: Editor Canvas & UI Components": "Menangani komponen visual editor, toolbar aksi, sidebar layer, inspector properti, dan interaksi kontrol kanvas.",
        "Community 1: Rendering Pipeline & GPU Geometry": "Menangani pipeline render GPU WebGL2, tessellator kurva adaptif, VBO vertex buffers, dan fallback kanvas 2D.",
        "Community 2: Path Math & Document I/O": "Menangani parser/serializer SVG lengkap, konversi Arc ke Bézier, pembacaan format PostScript/AI, dan auto-layout frame.",
        "Community 3: Affine Transforms & Snapping Solver": "Menangani matriks affine 2D, oriented bounding box, seleksi multi-objek, dan multi-constraint geometric snapping.",
        "Community 4: Node Editing & Geometry Refinement": "Menangani pengeditan titik kurva, perbaikan anomali kurva, auto-refine geometri, dan pembuatan fillet pojok tajam.",
        "Community 5: Topological Curve Simplifier": "Menangani penyederhanaan kurva topologis multi-level untuk mengompres jumlah node tanpa mengubah bentuk esensial.",
        "Community 6: React Offline Runtime": "Implementasi internal bundle runtime React & ReactDOM tanpa dependensi jaringan eksternal.",
        "Community 7: Workspace & Asset Management": "Menangani repositori proyek, pengelola aset font/gambar, controller penyimpanan IndexedDB, dan ZIP bundler.",
        "Community 8: Tailwind CSS Offline Engine": "Mesin kompilasi utility CSS Tailwind runtime offline berbasis pemindaian class DOM secara dinamis."
    }
    for cname, cdesc in comms.items():
        md.append(f"- **{cname}**: {cdesc}")
    md.append("\n---\n")

    md.append("## 2. Katalog Lengkap Seluruh File, Fungsi, dan Fitur (89 File)\n")

    file_counter = 0
    for cat_name, file_list in categories.items():
        md.append(f"### Domain: {cat_name} ({len(file_list)} File)\n")
        
        for fpath in file_list:
            file_counter += 1
            info = parse_source_file(fpath)
            
            # Match graphify nodes for this file
            g_nodes = file_to_nodes.get(fpath, [])
            comm_name = "N/A"
            if g_nodes:
                c_set = set(n.get('community_name') for n in g_nodes if n.get('community_name'))
                if c_set:
                    comm_name = ", ".join(sorted(list(c_set)))
            elif fpath == "index.html":
                comm_name = "Rendering Pipeline & GPU Geometry (Community 1)"
                
            md.append(f"#### {file_counter}. `{fpath}`")
            md.append(f"- **Komunitas Graphify:** {comm_name}")
            md.append(f"- **Total Baris Kode:** ~{info['lines']} baris")
            
            desc_text = info['desc']
            if not desc_text:
                if fpath == "index.html":
                    desc_text = "Dokumen HTML5 shell desktop utama yang memuat stylesheet font lokal, favicon SVG, elemen root container `#root`, dan entry script module `/src/main.jsx`."
                else:
                    desc_text = "Modul pendukung sistem Geovanta."
            md.append(f"- **Deskripsi Fitur & Tanggung Jawab:**\n  {desc_text}\n")
            
            # Graphify Connections
            file_node_ids = set(n['id'] for n in g_nodes)
            connections = []
            god_links = []
            for nid in file_node_ids:
                for target_id, rel, conf in edges_by_node.get(nid, []):
                    if target_id not in file_node_ids:
                        target_node = node_map.get(target_id, {})
                        t_label = target_node.get('label', target_id)
                        t_file = target_node.get('source_file', '')
                        if t_label in ['dist()', 'sub()', 'rd()', 'SceneRenderer', 'VectorEditor()', 'cross()', 'cl()', 'uid()', 'clampN()', 'dot()']:
                            god_links.append(f"`{t_label}`")
                        connections.append((t_label, rel, t_file))
            
            god_links = sorted(list(set(god_links)))
            if god_links:
                md.append(f"- **Koneksi God Nodes:** Terhubung langsung ke {', '.join(god_links)}")
                
            # List items / functions
            items = info['items']
            if fpath == "index.html":
                md.append("- **Elemen & Konfigurasi Utama:**")
                md.append("  - `Root Element (#root)`: Container target untuk rendering React DOM tree.")
                md.append("  - `Vite Script Module`: Tag `<script type=\"module\" src=\"/src/main.jsx\">` untuk bootstrap aplikasi.")
                md.append("  - `Google Fonts Stylesheet Link`: Preload font typography editor.")
                md.append("  - `Favicon SVG`: Icon resmi aplikasi Geovanta.")
            elif not items:
                md.append("- **Fungsi / Ekspor:** Modul agregasi konfigurasi atau re-ekspor.")
            else:
                md.append(f"- **Daftar Fungsi, Komponen, Class & Konstanta ({len(items)} entitas terdeteksi):**\n")
                md.append("  | Nama Entitas | Jenis | Status Ekspor | Baris | Parameter / Detail |")
                md.append("  | :--- | :--- | :--- | :--- | :--- |")
                for it in items:
                    name_fmt = f"`{it['name']}`"
                    exp_fmt = "Ekspor" if it["exported"] else "Internal"
                    args_fmt = f"`({it['args']})`" if it["args"] else "-"
                    if it["type"] == "Class" and it.get("methods"):
                        methods_str = ", ".join([f"`{m[0]}()`" for m in it["methods"][:6]])
                        if len(it["methods"]) > 6:
                            methods_str += f" (+{len(it['methods'])-6} lainnya)"
                        args_fmt = f"Metode: {methods_str}"
                    md.append(f"  | {name_fmt} | {it['type']} | {exp_fmt} | L{it['line']} | {args_fmt} |")
                md.append("")
                
            md.append("---\n")

    return "\n".join(md)

content = generate_markdown()
output_path = Path("GEOVANTA_KNOWLEDGE_BASE.md")
output_path.write_text(content, encoding='utf-8')
print(f"Generated {len(content)} characters in {output_path}")

