#!/bin/bash
# T12 fix round 1 — re-package ZIP final (trial loop sampai fixed point ukuran).
# Metode: ekstrak ZIP R3 lama -> timpa HANYA task-12-report.md (salinan ZIP:
# = working copy, KECUALI baris SHA256 §6 = placeholder) -> zip ulang.
# Satu-satunya angka yang self-referential adalah ukuran di §6 salinan ZIP;
# loop mengulang zip sampai ukuran yang tertulis = ukuran hasil zip sebenarnya.
set -u
WC="$HOME/workspace/geovanta-round2/docs/superpowers/plans/sdd-2026-11-15-round3/task-12-report.md"
STAGE=/tmp/t12f1-stage
OUT=/tmp/t12f1-r3-new.zip
OLDZIP="$HOME/workspace/your_files/Geovanta-Round3-UI-Fixes.zip"
REPORT_IN_ZIP="$STAGE/docs/superpowers/plans/sdd-2026-11-15-round3/task-12-report.md"
LOGDIR="$HOME/workspace/geovanta-round2/docs/superpowers/plans/sdd-2026-11-15-round3/task-12-fix1-logs"

echo "=== T12-fix1 re-package: $(date -u +%FT%TZ) ==="
echo "OLD ZIP SHA: $(sha256sum "$OLDZIP" | awk '{print $1}')"
cp "$OLDZIP" /tmp/t12f1-old-r3.zip.bak
rm -rf "$STAGE"; mkdir -p "$STAGE"
unzip -q -o "$OLDZIP" -d "$STAGE"
echo "stage entries: $(cd "$STAGE" && find . -mindepth 1 | wc -l)"

# 1. Salinan ZIP dari working copy: hanya baris SHA256 §6 -> placeholder (lihat §9).
python3 - "$WC" "$REPORT_IN_ZIP" <<'PYEOF'
import sys, re
src = open(sys.argv[1], encoding='utf-8').read()
pat = re.compile(r'^- SHA256: `[0-9a-f]{64}`$', re.M)
m = pat.findall(src)
assert len(m) == 1, f"SHA line found {len(m)}x, expected 1"
out = pat.sub('- SHA256: `[PLACEHOLDER — dihitung sesudah ZIP dibuat; lihat §9]`', src)
open(sys.argv[2], 'w', encoding='utf-8').write(out)
print("zipped-copy report generated (1 SHA line -> placeholder)")
PYEOF

# 2. Uncompressed total = jumlah ukuran file di staging (deterministik, sebelum zip).
UNCOMP=$(find "$STAGE" -type f -printf '%s\n' | awk '{s+=$1} END {print s}')
echo "uncompressed total (sum file sizes): $UNCOMP"

# 3. Loop fixed point untuk ukuran file ZIP yang tertulis di §6.
GUESS=12004024
for i in 1 2 3 4 5 6; do
  python3 - "$REPORT_IN_ZIP" "$UNCOMP" "$GUESS" <<'PYEOF'
import sys, re
p, uncomp, zsize = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
fmt = lambda n: f"{n:,}".replace(",", ".")
src = open(p, encoding='utf-8').read()
pat = re.compile(r'^- Ukuran uncompressed: \*\*[\d.]+ byte\*\*; ukuran file ZIP: \*\*[\d.]+ byte\*\*$', re.M)
m = pat.findall(src)
assert len(m) == 1, f"size line found {len(m)}x, expected 1"
out = pat.sub(f'- Ukuran uncompressed: **{fmt(uncomp)} byte**; ukuran file ZIP: **{fmt(zsize)} byte**', src)
open(p, 'w', encoding='utf-8').write(out)
print(f"staged report sizes set: uncomp={fmt(uncomp)} zip={fmt(zsize)}")
PYEOF
  rm -f "$OUT"
  (cd "$STAGE" && zip -r -q "$OUT" .)
  ACTUAL_ZIP=$(stat -c%s "$OUT")
  ACTUAL_UNCOMP=$(unzip -l "$OUT" | tail -1 | awk '{print $1}')
  ACTUAL_ENTRIES=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
  echo "iter $i: stated zip=$GUESS uncomp=$UNCOMP | actual zip=$ACTUAL_ZIP uncomp=$ACTUAL_UNCOMP entries=$ACTUAL_ENTRIES"
  if [ "$ACTUAL_ZIP" = "$GUESS" ] && [ "$ACTUAL_UNCOMP" = "$UNCOMP" ]; then
    echo "FIXED-POINT REACHED at iter $i"
    break
  fi
  GUESS=$ACTUAL_ZIP
  if [ "$i" = 6 ]; then echo "FIXED-POINT NOT REACHED after 6 iters"; exit 1; fi
done

echo "=== final trial zip ==="
sha256sum "$OUT"
unzip -l "$OUT" | tail -3
echo "exclude checks (harus 0 semua):"
unzip -l "$OUT" | grep -c 'node_modules/' || true
unzip -l "$OUT" | grep -c '\.git/' || true
unzip -l "$OUT" | grep -c 'probes/' || true
unzip -l "$OUT" | grep -c '\.bak' || true
