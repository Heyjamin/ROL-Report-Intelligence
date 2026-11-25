import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryItem,
  MonthlyInventorySnapshot,
  StockMetric,
} from '../entities';
import { PeriodsService } from '../periods/periods.service';
import { toNum } from '../common/utils/numbers';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(MonthlyInventorySnapshot)
    private readonly snapRepo: Repository<MonthlyInventorySnapshot>,
    @InjectRepository(StockMetric)
    private readonly metricRepo: Repository<StockMetric>,
    @InjectRepository(InventoryItem)
    private readonly itemRepo: Repository<InventoryItem>,
    private readonly periodsService: PeriodsService,
  ) {}

  async list(opts: {
    period?: string;
    q?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const period =
      opts.period || (await this.periodsService.latest()) || undefined;
    if (!period) {
      return { items: [], total: 0, page: 1, pageSize: 50, period: null };
    }

    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(5000, Math.max(1, opts.pageSize || 50));

    const baseQb = () => {
      const qb = this.snapRepo
        .createQueryBuilder('s')
        .leftJoin(
          StockMetric,
          'm',
          'm.item_code = s.item_code AND m.period_key = s.period_key',
        )
        .where('s.period_key = :period', { period });
      if (opts.q) {
        qb.andWhere(
          '(LOWER(s.item_code) LIKE :q OR LOWER(COALESCE(s.description, \'\')) LIKE :q)',
          { q: `%${opts.q.toLowerCase()}%` },
        );
      }
      if (opts.status) {
        qb.andWhere('m.stock_status = :status', { status: opts.status });
      }
      return qb;
    };

    const total = await baseQb().getCount();
    const items = await baseQb()
      .select([
        's.item_code AS itemCode',
        's.description AS description',
        's.uom AS uom',
        's.item_type AS itemType',
        's.stock_total AS stockTotal',
        's.rol AS rol',
        's.roq AS roq',
        's.avg_cost AS avgCost',
        's.po_ops AS poOps',
        's.reorder_flag AS reorderFlag',
        's.is_partial AS isPartial',
        'm.stock_status AS stockStatus',
        'm.stock_delta AS stockDelta',
        'm.stock_delta_pct AS stockDeltaPct',
        'm.gap_qty AS gapQty',
        'm.gap_value AS gapValue',
        'm.rol_ratio AS rolRatio',
        'm.recommended_action AS recommendedAction',
        'm.trend_label AS trendLabel',
      ])
      .orderBy('s.item_code', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return { items, total, page, pageSize, period };
  }

  async itemIntelligence(itemCode: string) {
    const code = itemCode.trim();
    const item = await this.itemRepo.findOne({ where: { itemCode: code } });
    const history = await this.snapRepo.find({
      where: { itemCode: code },
      order: { periodKey: 'ASC' },
    });
    if (!history.length && !item) {
      throw new NotFoundException(`Item ${code} not found`);
    }
    const metrics = await this.metricRepo.find({
      where: { itemCode: code },
      order: { periodKey: 'ASC' },
    });
    const latest = history[history.length - 1];
    const latestMetric = metrics.find((m) => m.periodKey === latest?.periodKey);

    return {
      item: item || {
        itemCode: code,
        description: latest?.description ?? null,
        uom: latest?.uom ?? null,
        itemType: latest?.itemType ?? null,
      },
      latest: latest
        ? {
            ...latest,
            metric: latestMetric || null,
            suggestedQty:
              latestMetric?.gapQty != null
                ? Math.max(toNum(latest.roq) || 0, toNum(latestMetric.gapQty) || 0)
                : toNum(latest.roq),
          }
        : null,
      history,
      metrics,
    };
  }
}
