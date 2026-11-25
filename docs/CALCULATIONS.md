# Business Calculations

## Stock status classification

Configurable thresholds (defaults in `SYSTEM_CONFIG`):

| Status | Rule |
|--------|------|
| STOCKOUT | stock_total = 0 |
| NO_ROL | rol = 0 or null |
| CRITICAL | rol > 0 and stock_total / rol < critical_ratio (default 0.5) |
| BELOW_ROL | rol > 0 and stock_total < rol |
| AT_ROL | rol > 0 and stock_total = rol |
| APPROACHING_ROL | rol > 0 and stock_total >= rol and stock_total / rol < approach_ratio (default 1.1) |
| NORMAL | rol > 0 and ratio in [approach_ratio, excess_ratio) |
| ABOVE_ROL | rol > 0 and stock_total > rol |
| EXCESS | rol > 0 and stock_total / rol >= excess_ratio (default 2.0) |

Priority when multiple match: STOCKOUT > CRITICAL > BELOW_ROL > AT_ROL > APPROACHING_ROL > EXCESS > ABOVE_ROL > NORMAL > NO_ROL

## Month-over-month

```
delta = stock_total[t] - stock_total[t-1]
pct   = delta / stock_total[t-1] * 100   // null if t-1 missing or zero
```

Label as **net stock change**. Do not call it consumption.

## Gap and value at risk

```
gap_qty   = max(0, rol - stock_total)
gap_value = gap_qty * avg_cost
```

## Continuously decreasing / increasing

For last N available periods (default 3): all consecutive deltas < 0 → CONTINUOUSLY_DECREASING; all > 0 → CONTINUOUSLY_INCREASING.

## Volatility

Sample standard deviation of stock_total across available periods for an item. High volatility if stdev / mean >= volatility_ratio (default 0.35) and mean > 0.

## Forecasting

- Minimum 3 historical points required; else `insufficient_data`  
- Candidate models: SMA, WMA, exponential smoothing, linear regression  
- Select lowest MAE on one-step backtest  
- Horizons: 1, 3 months (6 months marked low confidence)  
- Output includes method, point forecast, optional simple residual band  

## Recommended actions (explainable)

| Condition | Action text |
|-----------|-------------|
| STOCKOUT or CRITICAL | Immediate replenishment attention |
| BELOW_ROL and po_ops > 0 | Expedite open purchase orders |
| BELOW_ROL and po_ops = 0 | Raise replenishment / review ROQ |
| CONTINUOUSLY_DECREASING | Investigate sustained net stock reduction |
| EXCESS | Review for possible overstock / capital lock-up |
| High volatility | Investigate inconsistent stock movements |

Purchase quantity suggestions limited to displaying `max(roq, gap_qty)` as informational when ROQ exists — not an automated PO.
