# Data Dictionary — LECO Re-Order Reports

Source of truth: CSV files in `Re-Order Reports/`.  
Primary stock metric: **Stock Total**.  
Values marked *calculated* are derived in-app; never stored as source truth.

## Reporting metadata

| Canonical field | Source variants | Type | Description |
|-----------------|-----------------|------|-------------|
| run_date | `Run Date  dd-MON-YYYY` in title row | DATE | Report generation date |
| period_key | Derived from run_date | VARCHAR(7) | `YYYY-MM` reporting period |
| source_filename | File name | VARCHAR | Original CSV file name |
| file_hash | SHA-256 of file bytes | VARCHAR(64) | Duplicate / change detection |
| usage_period_label | `From …` / `Usage From …` header text | VARCHAR | 12-month usage window label |

## Item identity

| Canonical field | Source variants | Type | Nullable | Notes |
|-----------------|-----------------|------|----------|-------|
| item_code | `Item Code` | VARCHAR(32) | No | Trim whitespace; stable key |
| description | `Description` | VARCHAR(500) | Yes | Rare blanks (e.g. N167C) |
| uom | `U/M` | VARCHAR(20) | Yes | METE, EACH, NOS, SING, etc. |
| item_type | `Item Type` | VARCHAR(10) | Yes | IMP, IPM, L, L2 |
| sn | `S/N` or unnamed col 0 | NUMBER | Yes | Row serial in source |

## Usage and procurement parameters

| Canonical field | Source variants | Type | Notes |
|-----------------|-----------------|------|-------|
| usage_12m | `From …` / `Usage From …` | NUMBER | 12-month usage; commas stripped |
| avg_usage_m | `Avg. Usage/M` | NUMBER | Monthly average usage |
| proc_period | `Proc. Period` | NUMBER | Procurement lead time (months) |
| safety_margin | `Safty Margin` | NUMBER | Source spelling retained in alias map |

## Re-order and stock (actual)

| Canonical field | Source variants | Type | Notes |
|-----------------|-----------------|------|-------|
| rol | `ROL` | NUMBER | Re-order level |
| roq | `ROQ` | NUMBER | Re-order quantity |
| stock_total | `Stock Total` | NUMBER | **Primary on-hand quantity** |
| po_ops | `Total Orders (Opr.)` / `Total P/Orders (Opr.)` / `Total P/Orders raised (Opr.)` | NUMBER | Open operational POs |
| reorder_flag | Unnamed Yes/No column after P/Orders | VARCHAR(3) | Yes / No |
| avg_cost | `Average Cost` | NUMBER | Unit average cost (LKR) |
| quot_ops | `Quot./Ten./Evalu. (Opr.)` | NUMBER | Often dash/blank |
| transfer_to_project | `To be Transferred to Project w/h as at …` | NUMBER | Often dash/blank |
| final_stock | `Final Stock as at …` | NUMBER | Secondary; dual columns in Jul/Aug |
| rol_touch | `ROL Touch` | NUMBER | Signed; parentheses or minus |
| project_req | `Project Requirements` | NUMBER | Sparse |
| project_quot | `Quot./Ten./Evalu. (Proj.)` | NUMBER | Sparse |
| project_po | `PO raised (Project)` / `Total PO (Project)` / `Total P/Orders raised (Project)` | NUMBER | Sparse |
| actual_req | `Actual Req.` | NUMBER | August only |
| notes_raw | Trailing free-text cells | VARCHAR(1000) | Sparse annotations |
| is_partial | Derived | NUMBER(1) | Incomplete coded rows |

## Calculated metrics (application)

| Field | Formula | Notes |
|-------|---------|-------|
| stock_delta | stock_total(period) − stock_total(prev) | Net change only |
| stock_delta_pct | delta / prev × 100 | Null if prev = 0 |
| gap_qty | max(0, rol − stock_total) | Below-ROL shortfall |
| gap_value | gap_qty × avg_cost | Value at risk (LKR) |
| stock_status | Rule engine | STOCKOUT, CRITICAL, BELOW_ROL, AT_ROL, APPROACHING_ROL, NORMAL, ABOVE_ROL, EXCESS, NO_ROL |
| rol_ratio | stock_total / rol | Null if rol = 0 |

## Not available in source

Opening stock, receipts, issues, warehouse/branch codes, formal consumption ledger.

## Numeric parsing rules

1. Strip thousand separators (`,`).  
2. Treat `-`, empty, and whitespace as null.  
3. Parentheses `(1,234)` → −1234.  
4. Leading minus supported.  
5. Item codes: `trim()`.
