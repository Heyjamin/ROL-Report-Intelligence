import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ForecastResult,
  MonthlyInventorySnapshot,
} from '../entities';
import { toNum } from '../common/utils/numbers';

@Injectable()
export class ForecastsService {
  private readonly logger = new Logger(ForecastsService.name);

  constructor(
    @InjectRepository(MonthlyInventorySnapshot)
    private readonly snapRepo: Repository<MonthlyInventorySnapshot>,
    @InjectRepository(ForecastResult)
    private readonly forecastRepo: Repository<ForecastResult>,
  ) {}

  async forItem(itemCode: string) {
    const code = itemCode.trim();
    const history = await this.snapRepo.find({
      where: { itemCode: code },
      order: { periodKey: 'ASC' },
    });
    const series = history
      .map((h) => ({
        periodKey: h.periodKey,
        stockTotal: toNum(h.stockTotal),
      }))
      .filter((x) => x.stockTotal !== null) as {
      periodKey: string;
      stockTotal: number;
    }[];

    const analyticsUrl = process.env.ANALYTICS_URL;
    if (analyticsUrl) {
      try {
        const res = await fetch(`${analyticsUrl.replace(/\/$/, '')}/forecast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_code: code,
            series: series.map((s) => s.stockTotal),
            horizons: [1, 3],
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          return {
            itemCode: code,
            source: 'analytics',
            history: series,
            forecast: data,
          };
        }
      } catch (e) {
        this.logger.warn(
          `Analytics unavailable, falling back to local: ${(e as Error).message}`,
        );
      }
    }

    const local = this.localForecast(series);
    if (local.pointForecast != null) {
      await this.forecastRepo.save(
        this.forecastRepo.create({
          itemCode: code,
          periodKey: series[series.length - 1]?.periodKey ?? null,
          method: local.method,
          horizonMonths: 1,
          pointForecast: local.pointForecast,
          lowerBand: local.lowerBand,
          upperBand: local.upperBand,
          confidence: local.confidence,
          notes: local.notes,
        }),
      );
    }

    return {
      itemCode: code,
      source: 'local',
      history: series,
      forecast: local,
    };
  }

  async batch(itemCodes: string[]) {
    const codes = [...new Set(itemCodes.map((c) => c.trim()).filter(Boolean))];
    const results = [];
    for (const code of codes.slice(0, 100)) {
      results.push(await this.forItem(code));
    }
    // also allow empty → sample from latest period
    if (!codes.length) {
      const snaps = await this.snapRepo.find({ take: 20 });
      const uniq = [...new Set(snaps.map((s) => s.itemCode))].slice(0, 20);
      for (const code of uniq) {
        results.push(await this.forItem(code));
      }
    }
    return { count: results.length, results };
  }

  private localForecast(
    series: { periodKey: string; stockTotal: number }[],
  ): {
    method: string;
    pointForecast: number | null;
    lowerBand: number | null;
    upperBand: number | null;
    confidence: string;
    notes: string;
    horizons?: { months: number; value: number }[];
  } {
    if (series.length < 3) {
      return {
        method: 'insufficient_data',
        pointForecast: null,
        lowerBand: null,
        upperBand: null,
        confidence: 'none',
        notes: 'Minimum 3 historical points required',
      };
    }

    const values = series.map((s) => s.stockTotal);
    const n = values.length;

    // SMA (window 3)
    const smaWindow = Math.min(3, n);
    const sma =
      values.slice(-smaWindow).reduce((a, b) => a + b, 0) / smaWindow;

    // Simple linear regression on index
    const xs = values.map((_, i) => i);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (values[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    const linear = intercept + slope * n;

    // One-step backtest MAE
    const smaPred = values.slice(-smaWindow - 1, -1);
    const smaMae =
      smaPred.length > 0
        ? Math.abs(
            values[n - 1] -
              smaPred.reduce((a, b) => a + b, 0) / smaPred.length,
          )
        : Infinity;
    const linearPrev = intercept + slope * (n - 1);
    const linearMae = Math.abs(values[n - 1] - linearPrev);

    const useLinear = linearMae <= smaMae;
    const point = useLinear ? linear : sma;
    const method = useLinear ? 'linear' : 'sma';
    const resid = Math.abs(values[n - 1] - (useLinear ? linearPrev : values[n - 2]));
    const band = resid || Math.abs(point) * 0.1;

    return {
      method,
      pointForecast: Math.max(0, point),
      lowerBand: Math.max(0, point - band),
      upperBand: Math.max(0, point + band),
      confidence: n >= 4 ? 'low' : 'very_low',
      notes: `Local ${method} fallback; analytics sidecar not used or unavailable`,
      horizons: [
        { months: 1, value: Math.max(0, point) },
        {
          months: 3,
          value: Math.max(
            0,
            useLinear ? intercept + slope * (n + 2) : sma,
          ),
        },
      ],
    };
  }
}
