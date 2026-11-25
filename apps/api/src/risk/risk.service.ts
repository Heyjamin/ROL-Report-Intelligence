import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryAlert,
  MonthlyInventorySnapshot,
  StockMetric,
} from '../entities';
import { PeriodsService } from '../periods/periods.service';
import { toNum } from '../common/utils/numbers';

@Injectable()
export class RiskService {
  constructor(
    @InjectRepository(StockMetric)
    private readonly metricRepo: Repository<StockMetric>,
    @InjectRepository(MonthlyInventorySnapshot)
    private readonly snapRepo: Repository<MonthlyInventorySnapshot>,
    @InjectRepository(InventoryAlert)
    private readonly alertRepo: Repository<InventoryAlert>,
    private readonly periodsService: PeriodsService,
  ) {}

  async attention(period?: string) {
    const p = period || (await this.periodsService.latest());
    if (!p) return { period: null, items: [] };

    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const snaps = await this.snapRepo.find({ where: { periodKey: p } });
    const snapMap = new Map(snaps.map((s) => [s.itemCode, s]));
    const alerts = await this.alertRepo.find({
      where: { periodKey: p, isActive: true },
    });

    const priority = (m: StockMetric) => {
      const order: Record<string, number> = {
        STOCKOUT: 0,
        CRITICAL: 1,
        BELOW_ROL: 2,
        CONTINUOUSLY_DECREASING: 3,
        EXCESS: 4,
      };
      let score = order[m.stockStatus] ?? 9;
      if (m.trendLabel === 'CONTINUOUSLY_DECREASING') score = Math.min(score, 3);
      if (m.isHighVolatility) score = Math.min(score, 5);
      return score;
    };

    const items = metrics
      .filter(
        (m) =>
          ['STOCKOUT', 'CRITICAL', 'BELOW_ROL', 'EXCESS'].includes(
            m.stockStatus,
          ) ||
          m.trendLabel === 'CONTINUOUSLY_DECREASING' ||
          m.isHighVolatility,
      )
      .sort((a, b) => {
        const pa = priority(a) - priority(b);
        if (pa !== 0) return pa;
        return (toNum(b.gapValue) || 0) - (toNum(a.gapValue) || 0);
      })
      .slice(0, 100)
      .map((m) => {
        const s = snapMap.get(m.itemCode);
        return {
          itemCode: m.itemCode,
          description: s?.description ?? null,
          stockStatus: m.stockStatus,
          stockTotal: toNum(m.stockTotal),
          rol: toNum(m.rol),
          gapQty: toNum(m.gapQty),
          gapValue: toNum(m.gapValue),
          poOps: toNum(s?.poOps),
          trendLabel: m.trendLabel,
          isHighVolatility: m.isHighVolatility,
          recommendedAction: m.recommendedAction,
        };
      });

    return { period: p, items, alertCount: alerts.length };
  }
}
