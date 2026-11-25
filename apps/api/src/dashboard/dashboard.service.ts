import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MonthlyInventorySnapshot,
  ReportingPeriod,
  StockMetric,
} from '../entities';
import { PeriodsService } from '../periods/periods.service';
import { toNum } from '../common/utils/numbers';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(StockMetric)
    private readonly metricRepo: Repository<StockMetric>,
    @InjectRepository(MonthlyInventorySnapshot)
    private readonly snapRepo: Repository<MonthlyInventorySnapshot>,
    @InjectRepository(ReportingPeriod)
    private readonly periodRepo: Repository<ReportingPeriod>,
    private readonly periodsService: PeriodsService,
  ) {}

  private async resolvePeriod(period?: string) {
    return period || (await this.periodsService.latest());
  }

  async kpis(period?: string) {
    const p = await this.resolvePeriod(period);
    if (!p) {
      return { period: null, kpis: null };
    }

    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const snaps = await this.snapRepo.find({ where: { periodKey: p } });

    const byStatus: Record<string, number> = {};
    let belowRol = 0;
    let atRol = 0;
    let aboveRol = 0;
    let gapValue = 0;
    let stockValue = 0;
    let stockout = 0;
    let critical = 0;
    let excess = 0;

    for (const m of metrics) {
      byStatus[m.stockStatus] = (byStatus[m.stockStatus] || 0) + 1;
      if (['STOCKOUT', 'CRITICAL', 'BELOW_ROL'].includes(m.stockStatus)) {
        belowRol += 1;
      }
      if (m.stockStatus === 'AT_ROL') atRol += 1;
      if (
        ['ABOVE_ROL', 'APPROACHING_ROL', 'NORMAL', 'EXCESS'].includes(
          m.stockStatus,
        )
      ) {
        aboveRol += 1;
      }
      if (m.stockStatus === 'STOCKOUT') stockout += 1;
      if (m.stockStatus === 'CRITICAL') critical += 1;
      if (m.stockStatus === 'EXCESS') excess += 1;
      gapValue += toNum(m.gapValue) || 0;
    }

    for (const s of snaps) {
      const st = toNum(s.stockTotal) || 0;
      const cost = toNum(s.avgCost) || 0;
      stockValue += st * cost;
    }

    return {
      period: p,
      kpis: {
        itemCount: snaps.length,
        stockout,
        critical,
        belowRol,
        atRol,
        aboveRol,
        excess,
        gapValue,
        stockValue,
        byStatus,
        partialRows: snaps.filter((s) => s.isPartial).length,
      },
    };
  }

  async charts(period?: string) {
    const p = await this.resolvePeriod(period);
    if (!p) {
      return { period: null, charts: null };
    }

    const periods = await this.periodRepo.find({
      order: { periodKey: 'ASC' },
    });
    const trend = [];
    for (const per of periods) {
      const metrics = await this.metricRepo.find({
        where: { periodKey: per.periodKey },
      });
      const snaps = await this.snapRepo.find({
        where: { periodKey: per.periodKey },
      });
      let below = 0;
      let at = 0;
      let above = 0;
      let stockValue = 0;
      for (const m of metrics) {
        if (['STOCKOUT', 'CRITICAL', 'BELOW_ROL'].includes(m.stockStatus))
          below += 1;
        else if (m.stockStatus === 'AT_ROL') at += 1;
        else if (m.stockStatus !== 'NO_ROL') above += 1;
      }
      for (const s of snaps) {
        stockValue += (toNum(s.stockTotal) || 0) * (toNum(s.avgCost) || 0);
      }
      trend.push({
        period: per.periodKey,
        below,
        at,
        above,
        stockValue,
        itemCount: snaps.length,
      });
    }

    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const withDelta = metrics
      .filter((m) => toNum(m.stockDelta) !== null)
      .map((m) => ({
        itemCode: m.itemCode,
        stockDelta: toNum(m.stockDelta)!,
        stockDeltaPct: toNum(m.stockDeltaPct),
        stockStatus: m.stockStatus,
      }));

    const topIncreases = [...withDelta]
      .sort((a, b) => b.stockDelta - a.stockDelta)
      .slice(0, 10);
    const topDecreases = [...withDelta]
      .sort((a, b) => a.stockDelta - b.stockDelta)
      .slice(0, 10);

    const critical = metrics
      .filter((m) =>
        ['STOCKOUT', 'CRITICAL', 'BELOW_ROL'].includes(m.stockStatus),
      )
      .sort(
        (a, b) => (toNum(b.gapValue) || 0) - (toNum(a.gapValue) || 0),
      )
      .slice(0, 20)
      .map((m) => ({
        itemCode: m.itemCode,
        stockStatus: m.stockStatus,
        stockTotal: toNum(m.stockTotal),
        rol: toNum(m.rol),
        gapQty: toNum(m.gapQty),
        gapValue: toNum(m.gapValue),
      }));

    const excess = metrics
      .filter((m) => m.stockStatus === 'EXCESS')
      .sort(
        (a, b) => (toNum(b.rolRatio) || 0) - (toNum(a.rolRatio) || 0),
      )
      .slice(0, 20)
      .map((m) => ({
        itemCode: m.itemCode,
        stockTotal: toNum(m.stockTotal),
        rol: toNum(m.rol),
        rolRatio: toNum(m.rolRatio),
      }));

    const belowAtAbove = trend.find((t) => t.period === p) || {
      below: 0,
      at: 0,
      above: 0,
    };

    return {
      period: p,
      charts: {
        trend,
        belowAtAbove: {
          below: belowAtAbove.below,
          at: belowAtAbove.at,
          above: belowAtAbove.above,
        },
        topIncreases,
        topDecreases,
        critical,
        excess,
      },
    };
  }
}
