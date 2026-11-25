import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { RiskService } from '../risk/risk.service';
import { PeriodsService } from '../periods/periods.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMetric } from '../entities';
import { toNum } from '../common/utils/numbers';

@Injectable()
export class ReportsService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly riskService: RiskService,
    private readonly periodsService: PeriodsService,
    @InjectRepository(StockMetric)
    private readonly metricRepo: Repository<StockMetric>,
  ) {}

  async monthlyInsight(period?: string) {
    const p = period || (await this.periodsService.latest());
    if (!p) {
      return { period: null, summary: 'No reporting periods loaded.' };
    }

    const { kpis } = await this.dashboardService.kpis(p);
    const { charts } = await this.dashboardService.charts(p);
    const attention = await this.riskService.attention(p);

    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const decreasing = metrics.filter(
      (m) => m.trendLabel === 'CONTINUOUSLY_DECREASING',
    ).length;
    const highVol = metrics.filter((m) => m.isHighVolatility).length;

    const narrative = [
      `Monthly insight for ${p}.`,
      `Portfolio covers ${kpis?.itemCount ?? 0} items.`,
      `${kpis?.stockout ?? 0} stockout, ${kpis?.critical ?? 0} critical, ${kpis?.belowRol ?? 0} below/at-risk vs ROL.`,
      `Gap value at risk: ${Math.round(kpis?.gapValue ?? 0).toLocaleString()} LKR.`,
      `Estimated on-hand stock value: ${Math.round(kpis?.stockValue ?? 0).toLocaleString()} LKR.`,
      `${kpis?.excess ?? 0} excess items; ${decreasing} continuously decreasing; ${highVol} high volatility.`,
    ].join(' ');

    return {
      period: p,
      summary: narrative,
      kpis,
      charts: {
        belowAtAbove: charts?.belowAtAbove,
        topIncreases: charts?.topIncreases?.slice(0, 5),
        topDecreases: charts?.topDecreases?.slice(0, 5),
        critical: charts?.critical?.slice(0, 10),
        excess: charts?.excess?.slice(0, 10),
      },
      attention: attention.items.slice(0, 25),
      highlights: {
        decreasing,
        highVol,
        largestGap: metrics
          .filter((m) => toNum(m.gapValue) != null)
          .sort((a, b) => (toNum(b.gapValue) || 0) - (toNum(a.gapValue) || 0))
          .slice(0, 5)
          .map((m) => ({
            itemCode: m.itemCode,
            gapValue: toNum(m.gapValue),
            gapQty: toNum(m.gapQty),
            stockStatus: m.stockStatus,
          })),
      },
    };
  }
}
