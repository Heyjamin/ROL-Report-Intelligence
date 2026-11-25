import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  InventoryAlert,
  MonthlyInventorySnapshot,
  StockMetric,
  SystemConfig,
} from '../entities';
import { sampleStdev, toNum } from '../common/utils/numbers';
import {
  DEFAULT_THRESHOLDS,
  classifyStockStatus,
  recommendedAction,
  Thresholds,
} from '../common/utils/stock-status';

@Injectable()
export class MetricsRecomputeService {
  private readonly logger = new Logger(MetricsRecomputeService.name);

  constructor(
    @InjectRepository(MonthlyInventorySnapshot)
    private readonly snapRepo: Repository<MonthlyInventorySnapshot>,
    @InjectRepository(StockMetric)
    private readonly metricRepo: Repository<StockMetric>,
    @InjectRepository(InventoryAlert)
    private readonly alertRepo: Repository<InventoryAlert>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  async recomputeAll(): Promise<{ periods: number; metrics: number }> {
    const periods = await this.snapRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.periodKey', 'periodKey')
      .orderBy('s.periodKey', 'ASC')
      .getRawMany<{ periodKey: string }>();

    let total = 0;
    for (const p of periods) {
      total += await this.recomputePeriod(p.periodKey);
    }
    return { periods: periods.length, metrics: total };
  }

  async recomputePeriod(periodKey: string): Promise<number> {
    const thresholds = await this.loadThresholds();
    const trendWindow = Number(
      (await this.configRepo.findOne({ where: { key: 'TREND_WINDOW' } }))
        ?.value || 3,
    );

    const snapshots = await this.snapRepo.find({ where: { periodKey } });
    const allPeriods = await this.snapRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.periodKey', 'periodKey')
      .orderBy('s.periodKey', 'ASC')
      .getRawMany<{ periodKey: string }>();
    const periodList = allPeriods.map((p) => p.periodKey);
    const prevKey = this.previousPeriod(periodList, periodKey);

    const prevMap = new Map<string, MonthlyInventorySnapshot>();
    if (prevKey) {
      const prevSnaps = await this.snapRepo.find({
        where: { periodKey: prevKey },
      });
      for (const s of prevSnaps) prevMap.set(s.itemCode, s);
    }

    // History for trend/volatility: load all snaps for items in this period
    const codes = snapshots.map((s) => s.itemCode);
    const history =
      codes.length === 0
        ? []
        : await this.snapRepo.find({
            where: { itemCode: In(codes) },
            order: { periodKey: 'ASC' },
          });
    const histByCode = new Map<string, MonthlyInventorySnapshot[]>();
    for (const h of history) {
      const arr = histByCode.get(h.itemCode) || [];
      arr.push(h);
      histByCode.set(h.itemCode, arr);
    }

    await this.metricRepo.delete({ periodKey });
    await this.alertRepo.delete({ periodKey });

    const metrics: StockMetric[] = [];
    const alerts: InventoryAlert[] = [];

    for (const snap of snapshots) {
      const stock = toNum(snap.stockTotal);
      const rol = toNum(snap.rol);
      const avgCost = toNum(snap.avgCost);
      const prev = prevMap.get(snap.itemCode);
      const prevStock = prev ? toNum(prev.stockTotal) : null;

      let stockDelta: number | null = null;
      let stockDeltaPct: number | null = null;
      if (stock !== null && prevStock !== null) {
        stockDelta = stock - prevStock;
        stockDeltaPct =
          prevStock !== 0 ? (stockDelta / prevStock) * 100 : null;
      }

      const gapQty =
        rol !== null && stock !== null ? Math.max(0, rol - stock) : null;
      const gapValue =
        gapQty !== null && avgCost !== null ? gapQty * avgCost : null;
      const rolRatio =
        rol !== null && rol !== 0 && stock !== null ? stock / rol : null;

      const status = classifyStockStatus(stock, rol, thresholds);

      const hist = histByCode.get(snap.itemCode) || [];
      const stocks = hist
        .map((h) => toNum(h.stockTotal))
        .filter((v): v is number => v !== null);
      const vol = sampleStdev(stocks);
      const mean =
        stocks.length > 0
          ? stocks.reduce((a, b) => a + b, 0) / stocks.length
          : null;
      const isHighVol =
        vol !== null &&
        mean !== null &&
        mean > 0 &&
        vol / mean >= thresholds.volatilityRatio;

      const trendLabel = this.detectTrend(hist, periodKey, trendWindow);

      const action = recommendedAction(
        status,
        toNum(snap.poOps),
        trendLabel,
        isHighVol,
      );

      metrics.push(
        this.metricRepo.create({
          itemCode: snap.itemCode,
          periodKey,
          stockTotal: stock,
          rol,
          stockDelta,
          stockDeltaPct,
          gapQty,
          gapValue,
          rolRatio,
          stockStatus: status,
          trendLabel,
          volatility: vol,
          isHighVolatility: isHighVol,
          recommendedAction: action,
        }),
      );

      if (
        ['STOCKOUT', 'CRITICAL', 'BELOW_ROL'].includes(status) ||
        trendLabel === 'CONTINUOUSLY_DECREASING' ||
        isHighVol ||
        status === 'EXCESS'
      ) {
        const severity =
          status === 'STOCKOUT' || status === 'CRITICAL'
            ? 'high'
            : status === 'BELOW_ROL'
              ? 'medium'
              : 'low';
        alerts.push(
          this.alertRepo.create({
            itemCode: snap.itemCode,
            periodKey,
            alertType: status === 'EXCESS' ? 'EXCESS' : status,
            severity,
            message:
              action ||
              `${snap.itemCode} status ${status} in ${periodKey}`,
            isActive: true,
          }),
        );
      }
    }

    if (metrics.length) {
      // batch insert
      const chunk = 200;
      for (let i = 0; i < metrics.length; i += chunk) {
        await this.metricRepo.save(metrics.slice(i, i + chunk));
      }
    }
    if (alerts.length) {
      const chunk = 200;
      for (let i = 0; i < alerts.length; i += chunk) {
        await this.alertRepo.save(alerts.slice(i, i + chunk));
      }
    }

    this.logger.log(
      `Recomputed ${metrics.length} metrics / ${alerts.length} alerts for ${periodKey}`,
    );
    return metrics.length;
  }

  private previousPeriod(
    sorted: string[],
    current: string,
  ): string | null {
    const idx = sorted.indexOf(current);
    if (idx <= 0) return null;
    return sorted[idx - 1];
  }

  private detectTrend(
    hist: MonthlyInventorySnapshot[],
    upToPeriod: string,
    window: number,
  ): string | null {
    const upTo = hist.filter((h) => h.periodKey <= upToPeriod);
    if (upTo.length < window) return null;
    const slice = upTo.slice(-window);
    const deltas: number[] = [];
    for (let i = 1; i < slice.length; i++) {
      const a = toNum(slice[i - 1].stockTotal);
      const b = toNum(slice[i].stockTotal);
      if (a === null || b === null) return null;
      deltas.push(b - a);
    }
    if (deltas.length < window - 1) return null;
    if (deltas.every((d) => d < 0)) return 'CONTINUOUSLY_DECREASING';
    if (deltas.every((d) => d > 0)) return 'CONTINUOUSLY_INCREASING';
    return null;
  }

  private async loadThresholds(): Promise<Thresholds> {
    const keys = [
      'CRITICAL_RATIO',
      'APPROACH_RATIO',
      'EXCESS_RATIO',
      'VOLATILITY_RATIO',
    ];
    const rows = await this.configRepo.find({
      where: { key: In(keys) },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      criticalRatio: Number(map.CRITICAL_RATIO) || DEFAULT_THRESHOLDS.criticalRatio,
      approachRatio: Number(map.APPROACH_RATIO) || DEFAULT_THRESHOLDS.approachRatio,
      excessRatio: Number(map.EXCESS_RATIO) || DEFAULT_THRESHOLDS.excessRatio,
      volatilityRatio:
        Number(map.VOLATILITY_RATIO) || DEFAULT_THRESHOLDS.volatilityRatio,
    };
  }
}
