"""Re-Order Report analytics sidecar — multi-method stock forecasts."""

from __future__ import annotations

import math
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Re-Order Report Analytics", version="1.0.0")

MethodName = Literal["SMA", "WMA", "exp_smoothing", "linear_regression"]


class HealthResponse(BaseModel):
    status: str
    service: str


class ForecastRequest(BaseModel):
    series: list[Any] = Field(..., description="Numeric series or {value|period} objects")
    horizons: list[int] = Field(default_factory=lambda: [1, 3])
    item_code: str | None = None


class ForecastResponse(BaseModel):
    method: str
    forecasts: dict[str, float]
    mae: float | None
    rmse: float | None
    mape: float | None
    confidence: str
    pointForecast: float | None = None
    lowerBand: float | None = None
    upperBand: float | None = None
    notes: str | None = None
    horizons: list[dict[str, float | int]] | None = None


def _extract_series(raw: list[Any]) -> list[float]:
    values: list[float] = []
    for item in raw:
        if isinstance(item, (int, float)) and not isinstance(item, bool):
            values.append(float(item))
        elif isinstance(item, dict):
            v = item.get("value", item.get("stockTotal", item.get("y")))
            if v is None:
                continue
            values.append(float(v))
        else:
            try:
                values.append(float(item))
            except (TypeError, ValueError):
                continue
    return values


def _sma(values: list[float], window: int | None = None) -> float:
    w = window or min(3, len(values))
    w = max(1, min(w, len(values)))
    return sum(values[-w:]) / w


def _wma(values: list[float], window: int | None = None) -> float:
    w = window or min(3, len(values))
    w = max(1, min(w, len(values)))
    chunk = values[-w:]
    weights = list(range(1, w + 1))
    return sum(v * wt for v, wt in zip(chunk, weights)) / sum(weights)


def _exp_smoothing(values: list[float], alpha: float = 0.4) -> float:
    level = values[0]
    for v in values[1:]:
        level = alpha * v + (1 - alpha) * level
    return level


def _linear_regression_predict(values: list[float], steps_ahead: int = 1) -> float:
    n = len(values)
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(values) / n
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values))
    den = sum((x - x_mean) ** 2 for x in xs)
    slope = 0.0 if den == 0 else num / den
    intercept = y_mean - slope * x_mean
    return intercept + slope * (n - 1 + steps_ahead)


def _one_step(method: MethodName, train: list[float]) -> float:
    if method == "SMA":
        return _sma(train)
    if method == "WMA":
        return _wma(train)
    if method == "exp_smoothing":
        return _exp_smoothing(train)
    return _linear_regression_predict(train, steps_ahead=1)


def _backtest_mae(values: list[float], method: MethodName) -> float:
    """Leave-one-out style one-step MAE on the last half of the series (min 1 fold)."""
    n = len(values)
    start = max(2, n - max(2, n // 2))
    errors: list[float] = []
    for i in range(start, n):
        train = values[:i]
        pred = _one_step(method, train)
        errors.append(abs(values[i] - pred))
    return sum(errors) / len(errors) if errors else float("inf")


def _metrics(actual: list[float], predicted: list[float]) -> tuple[float, float, float]:
    n = len(actual)
    if n == 0:
        return float("inf"), float("inf"), float("inf")
    abs_err = [abs(a - p) for a, p in zip(actual, predicted)]
    mae = sum(abs_err) / n
    rmse = math.sqrt(sum(e * e for e in abs_err) / n)
    mape_vals = [abs((a - p) / a) for a, p in zip(actual, predicted) if a != 0]
    mape = (sum(mape_vals) / len(mape_vals) * 100) if mape_vals else float("inf")
    return mae, rmse, mape


def _forecast_horizon(method: MethodName, values: list[float], h: int) -> float:
    if method == "linear_regression":
        return max(0.0, _linear_regression_predict(values, steps_ahead=h))
    # iterative for smoothing-style methods
    series = list(values)
    last = 0.0
    for _ in range(h):
        last = _one_step(method, series)
        series.append(last)
    return max(0.0, last)


def _confidence(n: int, mae: float, scale: float) -> str:
    if n < 3:
        return "none"
    rel = mae / scale if scale else 1.0
    if n >= 6 and rel < 0.1:
        return "high"
    if n >= 4 and rel < 0.25:
        return "medium"
    if n >= 3 and rel < 0.5:
        return "low"
    return "very_low"


@app.get("/health", response_model=HealthResponse)
def health() -> dict[str, str]:
    return {"status": "ok", "service": "re-order-report-analytics"}


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "message": "ROL analytics service",
        "docs": "/docs",
        "endpoints": ["/health", "POST /forecast"],
    }


@app.post("/forecast", response_model=ForecastResponse)
def forecast(body: ForecastRequest) -> ForecastResponse:
    values = _extract_series(body.series)
    if len(values) < 3:
        raise HTTPException(
            status_code=400,
            detail="series must contain at least 3 numeric points",
        )

    horizons = [h for h in (body.horizons or [1, 3]) if isinstance(h, int) and h > 0]
    if not horizons:
        horizons = [1, 3]

    methods: list[MethodName] = ["SMA", "WMA", "exp_smoothing", "linear_regression"]
    scores = {m: _backtest_mae(values, m) for m in methods}
    best = min(scores, key=scores.get)  # type: ignore[arg-type]

    # Holdout metrics on final point using best method
    train, actual = values[:-1], values[-1]
    pred = _one_step(best, train)
    mae, rmse, mape = _metrics([actual], [pred])

    forecasts: dict[str, float] = {}
    horizon_list: list[dict[str, float | int]] = []
    for h in sorted(set(horizons)):
        val = _forecast_horizon(best, values, h)
        forecasts[str(h)] = round(val, 4)
        horizon_list.append({"months": h, "value": round(val, 4)})

    point = forecasts.get(str(min(horizons)), next(iter(forecasts.values())))
    scale = abs(sum(values) / len(values)) or 1.0
    band = max(mae, abs(point) * 0.1)

    return ForecastResponse(
        method=best,
        forecasts=forecasts,
        mae=None if math.isinf(mae) else round(mae, 4),
        rmse=None if math.isinf(rmse) else round(rmse, 4),
        mape=None if math.isinf(mape) else round(mape, 4),
        confidence=_confidence(len(values), mae if not math.isinf(mae) else scale, scale),
        pointForecast=round(point, 4),
        lowerBand=round(max(0.0, point - band), 4),
        upperBand=round(point + band, 4),
        notes=f"Selected {best} by lowest backtest MAE among SMA/WMA/exp_smoothing/linear_regression",
        horizons=horizon_list,
    )
