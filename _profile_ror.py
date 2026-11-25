# Read-only profiler for LECO Re-Order Report CSVs
import csv, os, re, json
from collections import Counter, defaultdict
from pathlib import Path

FOLDER = Path(r"D:\MY FILES\LECO HO IT\Project\Re Order Report\Re-Order Reports")
FILES = [
    "Re-Order Report July 2026.csv",
    "Re-Order Report August 2026.csv",
    "Re-Order Report September 2026.csv",
    "Re-Order Report November 2026.csv",
]

def parse_num(s):
    if s is None:
        return None
    t = str(s).strip().strip('"').strip()
    if t == "" or t in ("-", "–", "—") or re.fullmatch(r"-+\s*", t):
        return None  # blank/dash
    # parentheses negative
    paren = False
    if t.startswith("(") and t.endswith(")"):
        paren = True
        t = t[1:-1].strip()
    # remove commas and spaces
    t2 = t.replace(",", "").replace(" ", "")
    # leading minus already or after paren
    try:
        v = float(t2)
        if paren:
            v = -abs(v)
        return v
    except ValueError:
        return "UNPARSEABLE:" + repr(s)

def is_blank(s):
    if s is None:
        return True
    t = str(s).strip().strip('"').strip()
    return t == "" or t in ("-", "–", "—") or bool(re.fullmatch(r"-+\s*", t))

def find_header_idx(rows):
    for i, r in enumerate(rows):
        joined = ",".join(r).lower()
        if "item code" in joined:
            return i
    return None

results = {}
all_codes = {}
all_descs = {}

for fname in FILES:
    path = FOLDER / fname
    size = path.stat().st_size
    # read raw text for metadata lines
    raw = path.read_text(encoding="utf-8-sig", errors="replace")
    lines = raw.splitlines()
    # parse with csv
    rows = list(csv.reader(lines))
    # metadata: first few non-data lines
    hidx = find_header_idx(rows)
    meta_lines = lines[:hidx+2] if hidx is not None else lines[:6]
    header = rows[hidx] if hidx is not None else []
    subheader = rows[hidx+1] if hidx is not None and hidx+1 < len(rows) else []
    # data rows: start after subheader if it looks like continuation, else after header
    start = hidx + 1
    # skip pure subheader rows that don't start with a number
    while start < len(rows):
        r = rows[start]
        # check if first non-empty looks like serial number
        first = next((c.strip() for c in r if c.strip()), "")
        if re.fullmatch(r"\d+", first):
            break
        # also accept item-code-only continuation? skip blank/subheader
        if "item code" in ",".join(r).lower():
            start += 1
            continue
        # if row has item-like code in col1
        if len(r) > 1 and re.match(r"^[A-Z]\d", (r[1] or "").strip()):
            break
        start += 1
        if start > hidx + 5:
            break

    data = []
    trailer_notes = []
    for r in rows[start:]:
        first = next((c.strip() for c in r if c.strip()), "")
        # numbered data row
        if re.fullmatch(r"\d+", first):
            data.append(r)
        elif any(c.strip() for c in r):
            # note / trailer / annotation
            trailer_notes.append(r)

    # column index map from header
    # Col layout (typical):
    # 0: S/N (sometimes empty header), 1: Item Code, 2: Desc, 3: U/M,
    # 4: Usage, 5: Avg Usage/M, 6: Item Type, 7: Proc Period, 8: Safety Margin,
    # 9: ROL, 10: ROQ, 11: Stock Total, 12: P/Orders, 13: Yes/No?, 14: Average Cost,
    # 15: Quot Opr, 16: Transfer, 17: Final Stock, 18: ROL Touch, ...

    # Detect S/N column: November has "S/N" in col0, others have empty col0 and Item Code in col1
    def col_idx(name_parts):
        for i, h in enumerate(header):
            hl = (h or "").strip().lower()
            if all(p.lower() in hl for p in name_parts):
                return i
        return None

    ic_idx = col_idx(["item code"])
    if ic_idx is None:
        ic_idx = 1
    desc_idx = col_idx(["description"]) or 2
    um_idx = col_idx(["u/m"]) or 3
    # usage column - first col with "from" or "usage"
    usage_idx = None
    for i, h in enumerate(header):
        hl = (h or "").strip().lower()
        if "from" in hl or hl.startswith("usage"):
            usage_idx = i
            break
    if usage_idx is None:
        usage_idx = 4
    avg_idx = col_idx(["avg"]) or 5
    type_idx = col_idx(["item type"]) or 6
    proc_idx = col_idx(["proc"]) or 7
    safe_idx = col_idx(["safty"]) or col_idx(["safety"]) or 8
    rol_idx = None
    for i, h in enumerate(header):
        if (h or "").strip().upper() == "ROL":
            rol_idx = i
            break
    if rol_idx is None:
        rol_idx = 9
    roq_idx = None
    for i, h in enumerate(header):
        if (h or "").strip().upper() == "ROQ":
            roq_idx = i
            break
    if roq_idx is None:
        roq_idx = 10
    stock_idx = col_idx(["stock total"]) or 11
    po_idx = None
    for i, h in enumerate(header):
        hl = (h or "").strip().lower()
        if "order" in hl and ("opr" in hl or "p/order" in hl or "total" in hl):
            po_idx = i
            break
    if po_idx is None:
        po_idx = 12
    cost_idx = col_idx(["average cost"]) or 14
    # Final Stock - first occurrence
    final_idxs = [i for i, h in enumerate(header) if "final stock" in (h or "").lower()]
    final_idx = final_idxs[0] if final_idxs else 17
    # ROL Touch - first occurrence
    rt_idxs = [i for i, h in enumerate(header) if "rol touch" in (h or "").lower()]
    rt_idx = rt_idxs[0] if rt_idxs else 18

    codes = []
    descs = {}
    blanks = Counter()
    n = len(data)
    fields_check = {
        "Usage": usage_idx,
        "Avg Usage/M": avg_idx,
        "Item Type": type_idx,
        "Proc Period": proc_idx,
        "Safety Margin": safe_idx,
        "ROL": rol_idx,
        "ROQ": roq_idx,
        "Stock Total": stock_idx,
        "P/Orders": po_idx,
        "Average Cost": cost_idx,
        "Final Stock": final_idx,
        "ROL Touch": rt_idx,
    }
    for r in data:
        def get(i):
            return r[i] if i is not None and i < len(r) else ""
        code = get(ic_idx).strip()
        codes.append(code)
        descs[code] = get(desc_idx)
        for name, idx in fields_check.items():
            if is_blank(get(idx)):
                blanks[name] += 1

    code_counts = Counter(codes)
    dups = {c: n for c, n in code_counts.items() if n > 1 and c}

    # numeric stats
    stocks, rols, roqs = [], [], []
    stock0 = rol0 = roq0 = 0
    stock_lt = stock_eq = stock_gt = 0
    parse_notes = Counter()
    for r in data:
        def get(i):
            return r[i] if i is not None and i < len(r) else ""
        for label, rawv in [("stock", get(stock_idx)), ("rol", get(rol_idx)), ("roq", get(roq_idx)),
                            ("usage", get(usage_idx)), ("cost", get(cost_idx)), ("final", get(final_idx)), ("rt", get(rt_idx))]:
            t = str(rawv).strip()
            if "," in t:
                parse_notes["has_comma"] += 1
            if t.startswith("(") and t.endswith(")"):
                parse_notes["paren_neg"] += 1
            if is_blank(rawv):
                parse_notes["dash_or_blank"] += 1
            if t.startswith("-") and not is_blank(rawv) and t not in ("-",):
                parse_notes["leading_minus"] += 1

        s = parse_num(get(stock_idx))
        rol = parse_num(get(rol_idx))
        roq = parse_num(get(roq_idx))
        if isinstance(s, float):
            stocks.append(s)
            if s == 0:
                stock0 += 1
        if isinstance(rol, float):
            rols.append(rol)
            if rol == 0:
                rol0 += 1
        if isinstance(roq, float):
            roqs.append(roq)
            if roq == 0:
                roq0 += 1
        if isinstance(s, float) and isinstance(rol, float):
            if rol > 0:
                if s < rol:
                    stock_lt += 1
                elif s == rol:
                    stock_eq += 1
                else:
                    stock_gt += 1
            elif rol == 0:
                if s == 0:
                    stock_eq += 1  # both 0 - counted separately below? user asked Stock=ROL and Stock>ROL generally
                # still count stock==rol / stock>rol including rol=0
                pass
        # Also overall Stock vs ROL regardless
    # recount stock vs rol for all parseable pairs
    stock_lt_all = stock_eq_all = stock_gt_all = 0
    stock_lt_rolpos = stock_eq_rolpos = stock_gt_rolpos = 0
    for r in data:
        def get(i):
            return r[i] if i is not None and i < len(r) else ""
        s = parse_num(get(stock_idx))
        rol = parse_num(get(rol_idx))
        if isinstance(s, float) and isinstance(rol, float):
            if s < rol:
                stock_lt_all += 1
            elif s == rol:
                stock_eq_all += 1
            else:
                stock_gt_all += 1
            if rol > 0:
                if s < rol:
                    stock_lt_rolpos += 1
                elif s == rol:
                    stock_eq_rolpos += 1
                else:
                    stock_gt_rolpos += 1

    # free text notes: look at trailing columns and annotation rows
    note_samples = []
    # July has notes in later columns - scan all cells after col 19 for non-blank non-numeric-ish text
    for r in data:
        for cell in r[19:]:
            t = (cell or "").strip()
            if not t or is_blank(t):
                continue
            # skip pure numbers
            if parse_num(t) is not None and not isinstance(parse_num(t), str):
                # still could be a note that's numeric like project req
                continue
            if re.search(r"[A-Za-z]", t):
                note_samples.append(t)
    for r in trailer_notes:
        joined = " | ".join(c.strip() for c in r if c.strip())
        if joined:
            note_samples.append(joined)

    # Run date
    run_date = None
    for line in lines[:5]:
        m = re.search(r"Run Date\s+(\S+)", line)
        if m:
            run_date = m.group(1)
            break

    # receipts/issues/opening
    all_headers_text = " | ".join(header) + " | " + " | ".join(subheader)
    has_receipts = bool(re.search(r"receipt", all_headers_text, re.I))
    has_issues = bool(re.search(r"\bissues?\b", all_headers_text, re.I))
    has_opening = bool(re.search(r"opening", all_headers_text, re.I))

    month_key = fname
    all_codes[month_key] = set(c for c in codes if c)
    all_descs[month_key] = descs

    results[month_key] = {
        "size_bytes": size,
        "run_date": run_date,
        "meta_lines": meta_lines,
        "header": header,
        "subheader": subheader,
        "data_rows": n,
        "unique_codes": len(set(c for c in codes if c)),
        "duplicate_codes": dups,
        "blank_rates": {k: {"blank": blanks[k], "n": n, "pct": round(100*blanks[k]/n, 2) if n else None} for k in fields_check},
        "stock0": stock0, "rol0": rol0, "roq0": roq0,
        "stock_lt_rol_pos": stock_lt_rolpos,
        "stock_eq_rol_pos": stock_eq_rolpos,
        "stock_gt_rol_pos": stock_gt_rolpos,
        "stock_lt_all": stock_lt_all,
        "stock_eq_all": stock_eq_all,
        "stock_gt_all": stock_gt_all,
        "sum_stock": sum(stocks),
        "sum_rol": sum(rols),
        "sum_roq": sum(roqs),
        "n_stock_parsed": len(stocks),
        "n_rol_parsed": len(rols),
        "n_roq_parsed": len(roqs),
        "parse_notes": dict(parse_notes),
        "has_receipts": has_receipts,
        "has_issues": has_issues,
        "has_opening": has_opening,
        "note_samples": note_samples[:25],
        "trailer_count": len(trailer_notes),
        "col_map": {k: v for k, v in fields_check.items()},
        "header_len": len(header),
    }

# cross-file
months = list(FILES)
# column structure comparison
headers = {m: results[m]["header"] for m in months}
# normalize headers for comparison (strip)
norm = {m: [((h or "").strip()) for h in headers[m]] for m in months}

# item universe
sets = {m: all_codes[m] for m in months}
all_union = set.union(*sets.values())
all_inter = set.intersection(*sets.values())
only = {m: sorted(sets[m] - set.union(*(sets[o] for o in months if o != m))) for m in months}
# codes in exactly some
in_3 = []
in_2 = []
in_1 = []
for c in sorted(all_union):
    cnt = sum(1 for m in months if c in sets[m])
    if cnt == 4:
        pass
    elif cnt == 3:
        in_3.append(c)
    elif cnt == 2:
        in_2.append(c)
    else:
        in_1.append(c)

# description mismatches
mismatches = []
for c in sorted(all_inter):
    ds = {}
    for m in months:
        d = (all_descs[m].get(c) or "").strip()
        ds[m] = d
    uniq = set(ds.values())
    if len(uniq) > 1:
        mismatches.append({"code": c, "descs": ds})

out = {
    "per_file": results,
    "cross": {
        "header_exact_match": len(set(tuple(norm[m]) for m in months)) == 1,
        "headers_norm": norm,
        "union_codes": len(all_union),
        "intersection_codes": len(all_inter),
        "only_per_month_counts": {m: len(only[m]) for m in months},
        "only_per_month": {m: only[m] for m in months},
        "in_exactly_1": in_1,
        "in_exactly_2": in_2,
        "in_exactly_3": in_3,
        "desc_mismatches_count": len(mismatches),
        "desc_mismatches_sample": mismatches[:10],
    }
}

out_path = Path(r"D:\MY FILES\LECO HO IT\Project\Re Order Report\_profile_out.json")
out_path.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
print("WROTE", out_path)
print("sizes", {m: results[m]["size_bytes"] for m in months})
print("rows", {m: results[m]["data_rows"] for m in months})
print("unique", {m: results[m]["unique_codes"] for m in months})
print("dups", {m: results[m]["duplicate_codes"] for m in months})
print("run", {m: results[m]["run_date"] for m in months})
print("sums stock", {m: results[m]["sum_stock"] for m in months})
print("sums rol", {m: results[m]["sum_rol"] for m in months})
print("sums roq", {m: results[m]["sum_roq"] for m in months})
print("stock0", {m: results[m]["stock0"] for m in months})
print("rol0", {m: results[m]["rol0"] for m in months})
print("roq0", {m: results[m]["roq0"] for m in months})
print("stock<rol (rol>0)", {m: results[m]["stock_lt_rol_pos"] for m in months})
print("stock=rol (rol>0)", {m: results[m]["stock_eq_rol_pos"] for m in months})
print("stock>rol (rol>0)", {m: results[m]["stock_gt_rol_pos"] for m in months})
print("union", len(all_union), "inter", len(all_inter))
print("desc mismatches", len(mismatches))
for m in months:
    print("BLANKS", m, results[m]["blank_rates"])
