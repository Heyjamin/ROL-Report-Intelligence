# Sample Data Profiling Report

**Profiled folder:** `Re-Order Reports/`  
**Profile date:** 2026-11-25  
**Files:** 4 monthly CSV exports  

## Inventory of files

| File | Run Date | Data rows | Unique codes | Duplicates |
|------|----------|-----------|--------------|------------|
| Re-Order Report July 2026.csv | 22-JUL-2026 | 431 | 431 | None |
| Re-Order Report August 2026.csv | 28-AUG-2026 | 431 | 431 | None |
| Re-Order Report September 2026.csv | 30-SEP-2026 | 433 | 433 | None |
| Re-Order Report November 2026.csv | 15-NOV-2026 | 434 | 434 | None |

**Missing period:** October 2026 — gap accepted; do not fabricate.

## Item code universe

| Set | Count | Codes |
|-----|------:|-------|
| In all 4 months | 431 | Full Jul/Aug catalog |
| Sep+Nov extras | 2 | G332A, G452G (often partial) |
| Nov only | 1 | P715T (partial) |
| Union | 434 | |

## Schema drift summary

| Month | Notable differences |
|-------|---------------------|
| July | Dual Final Stock / ROL Touch; `Total Orders (Opr.)` |
| August | Stale Jul Final Stock column; `Actual Req.`; typo `Porject` |
| September | `Total P/Orders (Opr.)`; single Final Stock block |
| November | `S/N` header; `Usage From …`; `Total P/Orders raised (Opr.)` |

## Quality observations

- **N167C:** blank description across months.  
- **Partial rows:** G332A, G452G, P715T — import with `is_partial=1`.  
- **Annotation rows:** Comm. Module Ante / DCU lines without Item Code — skip as items, optionally log.  
- **Zero stock:** ~52–56 items per month.  
- **ROL = 0:** ~173–180 items (inactive ROL).  
- **Reorder flag** sometimes `No` despite large gap (e.g. B322) — flag is source data, not overridden.  
- Descriptions match after whitespace normalize.  

## What can be computed today

- Portfolio KPIs by month  
- Below / at / above ROL (where ROL > 0)  
- MoM stock increase/decrease between available periods  
- Gap quantity and gap value  
- Item history across Jul–Aug–Sep–Nov  
- Basic forecasts with low confidence (4 points max; Oct gap)  

## What cannot be computed

- True consumption (no issues/receipts)  
- Seasonal models with confidence  
- Automatic purchase quantity recommendations requiring lead-time + safety stock policy beyond source ROQ  
- October comparisons  

## Recommendation for database design

Append-only `MONTHLY_INVENTORY_SNAPSHOTS` keyed by `(item_code, period_key)`, with flexible column alias mapping at ingest time.
