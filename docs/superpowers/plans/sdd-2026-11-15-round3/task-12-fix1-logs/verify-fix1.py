#!/usr/bin/env python3
# T12 fix round 1 — verifikasi integritas ZIP baru (fresh run, independen dari packaging).
# 1. Ekstrak ZIP R3 baru + ZIP R2 ke staging terpisah.
# 2. Perbandingan hash per file vs ZIP R2: berubah/ditambah/dihapus/identik.
# 3. Diff laporan working copy vs salinan DI DALAM ZIP: harus tepat 1 baris beda (SHA §6).
# 4. Isi salinan dalam ZIP: §6 placeholder saja, §7 smoke asli, §9 pengungkapan 1 placeholder.
# 5. Pola exclude di ZIP baru + SHA R2 tetap.
import hashlib, os, shutil, subprocess, sys, zipfile

HOME = os.path.expanduser("~")
NEWZIP = f"{HOME}/workspace/your_files/Geovanta-Round3-UI-Fixes.zip"
R2ZIP = f"{HOME}/workspace/user/files/Geovanta-Round2-UI-Fixes_1_h80o.zip"
WC = f"{HOME}/workspace/geovanta-round2/docs/superpowers/plans/sdd-2026-11-15-round3/task-12-report.md"
VNEW = "/tmp/t12f1-verify-new"
VR2 = "/tmp/t12f1-verify-r2"
REL = "docs/superpowers/plans/sdd-2026-11-15-round3/task-12-report.md"
fail = []

def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()

def check(label, cond, detail=""):
    print(f"[{'PASS' if cond else 'FAIL'}] {label} {detail}")
    if not cond:
        fail.append(label)

for d, z in ((VNEW, NEWZIP), (VR2, R2ZIP)):
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    subprocess.run(["unzip", "-q", "-o", z, "-d", d], check=True)

def file_hashes(root):
    out = {}
    for dp, _, fns in os.walk(root):
        for fn in fns:
            p = os.path.join(dp, fn)
            out[os.path.relpath(p, root)] = sha(p)
    return out

new_files = file_hashes(VNEW)
r2_files = file_hashes(VR2)
shared = set(new_files) & set(r2_files)
changed = sorted(f for f in shared if new_files[f] != r2_files[f])
added = sorted(set(new_files) - set(r2_files))
deleted = sorted(set(r2_files) - set(new_files))
identical = sorted(f for f in shared if new_files[f] == r2_files[f])
print(f"DELTA vs R2: berubah={len(changed)} ditambah={len(added)} dihapus={len(deleted)} identik={len(identical)}")
print("BERUBAH:"); [print("  ", f) for f in changed]
print("DITAMBAH (84 diharapkan):"); [print("  ", f) for f in added]
print("DIHAPUS:"); [print("  ", f) for f in deleted]
check("delta 12/84/0/229", (len(changed), len(added), len(deleted), len(identical)) == (12, 84, 0, 229),
      f"got {len(changed)}/{len(added)}/{len(deleted)}/{len(identical)}")
check("task-12-report.md termasuk DITAMBAH (bukan berubah)", REL in added)
check("T12-fix1 files TIDAK ikut ZIP (T9-fix1 BOLEH: sudah di ZIP lama, bagian dari 84)",
      not any("task-12-fix1" in f for f in added),
      f"task-12-fix1 in zip: {[f for f in added if 'task-12-fix1' in f]}")

# Diff laporan working copy vs salinan dalam ZIP.
wc = open(WC, encoding="utf-8").read().splitlines()
inz = open(os.path.join(VNEW, REL), encoding="utf-8").read().splitlines()
print(f"baris: working copy={len(wc)} salinan ZIP={len(inz)}")
diff_lines = [(i + 1, a, b) for i, (a, b) in enumerate(zip(wc, inz)) if a != b]
if len(wc) != len(inz):
    print("JUMLAH BARIS BERBEDA — diff baris tidak sebanding")
    fail.append("jumlah baris laporan")
check("salinan ZIP vs working copy: tepat 1 baris beda", len(diff_lines) == 1, f"beda={len(diff_lines)}")
for ln, a, b in diff_lines:
    print(f"  baris {ln}:\n    WC : {a}\n    ZIP: {b}")
    check("baris yang beda adalah SHA256 §6", a.startswith("- SHA256: `97966e1e") and b.startswith("- SHA256: `[PLACEHOLDER"), f"baris {ln}")
inz_text = "\n".join(inz)
check("§6 salinan ZIP: placeholder SHA merujuk §9", "[PLACEHOLDER — dihitung sesudah ZIP dibuat; lihat §9]" in inz_text)
check("§6 salinan ZIP: TIDAK ada rujukan §7 yang salah", "lihat §7]" not in inz_text)
check("§6 salinan ZIP: entri + ukuran + exclude lengkap",
      "31.350.867 byte" in inz_text and "12.004.873 byte" in inz_text and "365" in inz_text)
check("§6 salinan ZIP: TIDAK ada placeholder smoke", "PLACEHOLDER-SMOKE" not in inz_text)
check("§7 salinan ZIP: hasil smoke asli 6/6 + S1-S6",
      all(s in inz_text for s in ["6/6 lolos", "S1 aplikasi termuat", "S2 0 pageerror",
                                  "S3 inspector kanan tampil", "S4 5 tombol Mode Fill",
                                  "S5 strip recent-colors", "S6 klik Linear"]))
check("§7 salinan ZIP: catatan run pertama 5/6", "run smoke pertama 5/6" in inz_text)
check("§7 salinan ZIP: menyebut probes/probe-r3-t12-smoke.cjs", "probes/probe-r3-t12-smoke.cjs" in inz_text)
check("§9 salinan ZIP: TEPAT SATU placeholder", "TEPAT SATU" in inz_text and "Selain baris SHA256 §6 itu, kedua salinan" in inz_text)
check("§9: tidak ada klaim identik yang palsu", "Isi laporan selain baris itu identik" not in inz_text)
check("§9 salinan ZIP: SHA benar dirujuk ke working copy §6", "working copy ini (§6)" in inz_text)

# Listing ZIP baru: entri + exclude + ukuran.
with zipfile.ZipFile(NEWZIP) as z:
    names = z.namelist()
    info = z.infolist()
    total_uncomp = sum(i.file_size for i in info)
print(f"ZIP baru: entri={len(names)} file={len([n for n in names if not n.endswith('/')])} uncomp={total_uncomp} bytes={os.path.getsize(NEWZIP)}")
check("entri ZIP baru = 365", len(names) == 365)
check("uncomp ZIP baru = 31.350.867", total_uncomp == 31350867)
check("ukuran file ZIP baru = 12.004.873", os.path.getsize(NEWZIP) == 12004873)
for pat in ("node_modules/", ".git/", "probes/", ".bak"):
    n = sum(1 for x in names if pat in x)
    check(f"exclude 0 entri '{pat}'", n == 0, f"found={n}")

# SHA ZIP + R2.
new_sha = sha(NEWZIP)
r2_sha = sha(R2ZIP)
print(f"SHA ZIP baru : {new_sha}")
print(f"SHA ZIP R2   : {r2_sha}")
check("SHA ZIP baru = 97966e1e… (yang tertulis di §6 working copy)",
      new_sha == "97966e1e25a15ac8267c53565e4b825f3cde011370f51cc87a296851644f643f")
check("SHA ZIP R2 tetap c75e7a62… (tidak ditimpa)",
      r2_sha == "c75e7a62e09e9410d4064752ad858d868c86be904d76475b56c985941d24bed7")
check("§6 working copy memuat SHA baru", "97966e1e25a15ac8267c53565e4b825f3cde011370f51cc87a296851644f643f" in "\n".join(wc))
check("§6 working copy memuat ukuran baru", "31.350.867 byte" in "\n".join(wc) and "12.004.873 byte" in "\n".join(wc))

print()
if fail:
    print(f"VERIFIKASI GAGAL: {len(fail)} cek: {fail}")
    sys.exit(1)
print("VERIFIKASI INTEGRITAS: SEMUA CEK LOLOS")
