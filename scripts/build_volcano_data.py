# Builds assets/data/airway-volcano.json from the DESeq2 results in tarikcolic/RNAseq-workshop.
# Usage: python3 scripts/build_volcano_data.py <RNAseq-workshop>/analyses/results_airway/DE_results.csv assets/data/airway-volcano.json
import csv, json, math, random, sys
src, out = sys.argv[1], sys.argv[2]
rows = []
with open(src) as f:
    for r in csv.DictReader(f):
        try:
            lfc = float(r["log2FoldChange"]); padj = float(r["padj"])
        except ValueError:
            continue
        if padj <= 0 or math.isnan(padj) or math.isnan(lfc):
            continue
        rows.append((lfc, -math.log10(padj), r["direction"], r["symbol"] if r["symbol"] not in ("", "NA") else r["gene"]))
random.seed(7)
up = [r for r in rows if r[2] == "up"]
down = [r for r in rows if r[2] == "down"]
ns = [r for r in rows if r[2] not in ("up", "down")]
print(len(rows), len(up), len(down), len(ns), set(r[2] for r in rows))
def pick(lst, n):
    lst = sorted(lst, key=lambda r: -r[1])
    top = lst[:40]
    rest = lst[40:]
    return top + random.sample(rest, max(0, min(n - 40, len(rest))))
sel = pick(up, 230) + pick(down, 170) + random.sample(ns, 380)
code = {"up": 1, "down": -1}
data = {
  "title": "airway: dexamethasone vs control",
  "total": len(rows), "up": len(up), "down": len(down),
  "points": [[round(l, 2), round(min(p, 140), 1), code.get(d, 0), s] for l, p, d, s in sel],
}
json.dump(data, open(out, "w"), separators=(",", ":"))
print(len(sel))
