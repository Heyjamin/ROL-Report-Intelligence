import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MonthlyInventorySnapshot,
  StockMetric,
} from '../entities';
import { PeriodsService } from '../periods/periods.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { RiskService } from '../risk/risk.service';
import { toNum } from '../common/utils/numbers';
import { sampleStdev } from '../common/utils/numbers';

export type AssistantHighlight = {
  label: string;
  value: string | number;
  tone?: 'default' | 'danger' | 'warn' | 'ok' | 'info';
};

export type AssistantChart = {
  type: 'bar' | 'pie' | 'line';
  title: string;
  categories?: string[];
  series: { name: string; data: number[] }[];
};

export type AssistantTable = {
  title?: string;
  columns: { key: string; title: string }[];
  rows: Record<string, string | number | null>[];
};

export type AssistantReply = {
  answer: string;
  period: string | null;
  intent: string;
  highlights?: AssistantHighlight[];
  chart?: AssistantChart;
  table?: AssistantTable;
  disclaimer?: string;
  data?: unknown;
};

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-LK', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function fmtLkr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) {
    return `LKR ${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `LKR ${(n / 1_000).toFixed(0)}K`;
  }
  return `LKR ${fmt(n)}`;
}

@Injectable()
export class AssistantService {
  constructor(
    @InjectRepository(StockMetric)
    private readonly metricRepo: Repository<StockMetric>,
    @InjectRepository(MonthlyInventorySnapshot)
    private readonly snapRepo: Repository<MonthlyInventorySnapshot>,
    private readonly periodsService: PeriodsService,
    private readonly dashboardService: DashboardService,
    private readonly riskService: RiskService,
  ) {}

  async query(question: string, period?: string): Promise<AssistantReply> {
    const p = period || (await this.periodsService.latest());
    const q = (question || '').toLowerCase().trim();

    if (!p) {
      return {
        answer:
          'I don’t have any monthly reports loaded yet.\n\nPlease open **Processing Monitor**, click **Sync Now**, then ask me again.',
        period: null,
        intent: 'no_data',
      };
    }

    // Stock drops / decreases — match before generic "gap" / summary
    if (
      /(biggest|largest|highest|top).{0,40}(drop|decrease|reduction|declin)/.test(
        q,
      ) ||
      /stock\s+drop|net\s+reduction|went\s+down|fell\s+most|decreased\s+most/.test(
        q,
      )
    ) {
      return this.highestReduction(p);
    }
    if (
      /(biggest|largest|highest|top).{0,40}(gain|increase|rose|growth)/.test(q) ||
      /stock\s+increase|increased\s+most|went\s+up\s+most/.test(q)
    ) {
      return this.highestIncrease(p);
    }
    if (
      /below\s*(rol|re-?order)|under\s*rol|shortfall|value\s+at\s+risk|gap\s+value/.test(
        q,
      )
    ) {
      return this.belowRol(p);
    }
    if (
      /summary|overview|kpi|dashboard|how\s*(are|is)\s*(we|stock)|inventory\s+position|current\s+position/.test(
        q,
      )
    ) {
      return this.summary(p);
    }
    if (/volatil/.test(q)) {
      return this.volatility(p);
    }
    if (/attention|risk|critical|priority|urgent/.test(q)) {
      return this.attention(p);
    }

    const codeMatch = question.match(/\b([A-Z]{1,3}\d{2,4}[A-Z0-9]*)\b/i);
    if (codeMatch) {
      return this.itemDetail(codeMatch[1].toUpperCase(), p);
    }

    return {
      answer:
        'I can help with stock questions using your verified report data. Try asking things like:\n\n' +
        '• “Give me a summary of this month”\n' +
        '• “Which items are below ROL?”\n' +
        '• “What had the biggest stock drop?”\n' +
        '• “Show items needing attention”\n' +
        '• “How is item B322 doing?”\n\n' +
        `I’m currently looking at period **${p}**.`,
      period: p,
      intent: 'help',
      disclaimer: 'Answers use imported Re-Order Report data only.',
    };
  }

  private async summary(p: string): Promise<AssistantReply> {
    const { kpis } = await this.dashboardService.kpis(p);
    const itemCount = kpis?.itemCount ?? 0;
    const stockout = kpis?.stockout ?? 0;
    const critical = kpis?.critical ?? 0;
    const below = kpis?.belowRol ?? 0;
    const excess = kpis?.excess ?? 0;
    const atRol = kpis?.atRol ?? 0;
    const above = kpis?.aboveRol ?? 0;

    const answer =
      `Here’s a clear snapshot of inventory for **${p}**.\n\n` +
      `You have **${fmt(itemCount)}** stock lines on file. ` +
      `**${fmt(below)}** items need replenishment attention (stockout, critical, or below ROL), ` +
      `while **${fmt(excess)}** look overstocked versus ROL.\n\n` +
      `Estimated gap value at risk is about **${fmtLkr(kpis?.gapValue)}**, ` +
      `and total stock holding value is about **${fmtLkr(kpis?.stockValue)}**.`;

    const byStatus = kpis?.byStatus || {};
    const pieLabels = Object.keys(byStatus);
    const pieData = pieLabels.map((k) => byStatus[k]);

    return {
      answer,
      period: p,
      intent: 'summary',
      highlights: [
        { label: 'Items', value: fmt(itemCount), tone: 'info' },
        { label: 'Zero stock', value: fmt(stockout), tone: stockout ? 'danger' : 'ok' },
        { label: 'Critical / below ROL', value: fmt(below), tone: below ? 'warn' : 'ok' },
        { label: 'At ROL', value: fmt(atRol), tone: 'default' },
        { label: 'Healthy / above', value: fmt(above), tone: 'ok' },
        { label: 'Excess', value: fmt(excess), tone: excess ? 'info' : 'default' },
        { label: 'Gap value', value: fmtLkr(kpis?.gapValue), tone: 'danger' },
        { label: 'Stock value', value: fmtLkr(kpis?.stockValue), tone: 'info' },
      ],
      chart: pieLabels.length
        ? {
            type: 'pie',
            title: `Stock status mix — ${p}`,
            categories: pieLabels,
            series: [{ name: 'Items', data: pieData }],
          }
        : undefined,
      disclaimer:
        'Figures come from imported monthly snapshots. Month-to-month change is net stock change, not proven consumption.',
      data: kpis,
    };
  }

  private async belowRol(p: string): Promise<AssistantReply> {
    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const below = metrics.filter((m) =>
      ['STOCKOUT', 'CRITICAL', 'BELOW_ROL'].includes(m.stockStatus),
    );
    const top = below
      .sort((a, b) => (toNum(b.gapValue) || 0) - (toNum(a.gapValue) || 0))
      .slice(0, 12);

    const answer =
      below.length === 0
        ? `Good news for **${p}**: I don’t see any items currently stocked out, critical, or below ROL.`
        : `For **${p}**, **${below.length}** items are below the re-order level (including stockout and critical).\n\n` +
          `The chart and table below highlight the largest value gaps so you can prioritise follow-up.`;

    return {
      answer,
      period: p,
      intent: 'below_rol',
      highlights: [
        { label: 'Items below ROL', value: below.length, tone: below.length ? 'danger' : 'ok' },
        {
          label: 'Top gap value',
          value: fmtLkr(toNum(top[0]?.gapValue)),
          tone: 'warn',
        },
      ],
      chart: {
        type: 'bar',
        title: 'Largest value gaps (LKR)',
        categories: top.map((m) => m.itemCode),
        series: [
          {
            name: 'Gap value',
            data: top.map((m) => Math.round(toNum(m.gapValue) || 0)),
          },
        ],
      },
      table: {
        title: 'Priority shortfalls',
        columns: [
          { key: 'itemCode', title: 'Item' },
          { key: 'status', title: 'Status' },
          { key: 'stockTotal', title: 'Stock' },
          { key: 'rol', title: 'ROL' },
          { key: 'gapQty', title: 'Gap qty' },
          { key: 'gapValue', title: 'Gap value' },
        ],
        rows: top.map((m) => ({
          itemCode: m.itemCode,
          status: m.stockStatus,
          stockTotal: toNum(m.stockTotal),
          rol: toNum(m.rol),
          gapQty: toNum(m.gapQty),
          gapValue: Math.round(toNum(m.gapValue) || 0),
        })),
      },
      disclaimer: 'Gap value = quantity shortfall × average cost from the report.',
      data: { count: below.length, top },
    };
  }

  private async highestReduction(p: string): Promise<AssistantReply> {
    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const top = metrics
      .filter((m) => {
        const d = toNum(m.stockDelta);
        return d !== null && d < 0;
      })
      .sort((a, b) => (toNum(a.stockDelta) || 0) - (toNum(b.stockDelta) || 0))
      .slice(0, 10);

    if (!top.length) {
      return {
        answer:
          `I looked at **${p}**, but there are no month-over-month stock changes to compare yet.\n\n` +
          `Import at least two monthly reports (Processing Monitor → Sync Now), then ask again.`,
        period: p,
        intent: 'highest_reduction',
        disclaimer:
          'Stock drops need a previous period in the database to calculate net change.',
      };
    }

    const worst = top[0];
    const answer =
      `Here are the biggest **net stock reductions** into **${p}**.\n\n` +
      `The largest drop is **${worst.itemCode}** at **${fmt(toNum(worst.stockDelta))}** units` +
      (toNum(worst.stockDeltaPct) != null
        ? ` (${fmt(toNum(worst.stockDeltaPct), 1)}%).`
        : '.') +
      `\n\nThe chart and table show the top movers.`;

    return {
      answer,
      period: p,
      intent: 'highest_reduction',
      highlights: [
        {
          label: 'Largest drop',
          value: `${worst.itemCode}: ${fmt(toNum(worst.stockDelta))}`,
          tone: 'danger',
        },
        {
          label: 'Items ranked',
          value: top.length,
          tone: 'info',
        },
      ],
      chart: {
        type: 'bar',
        title: 'Top stock decreases (qty)',
        categories: top.map((m) => m.itemCode),
        series: [
          {
            name: 'Change',
            data: top.map((m) => Math.round(toNum(m.stockDelta) || 0)),
          },
        ],
      },
      table: {
        columns: [
          { key: 'itemCode', title: 'Item' },
          { key: 'stockDelta', title: 'Change' },
          { key: 'stockDeltaPct', title: '% change' },
          { key: 'stockTotal', title: 'Current stock' },
        ],
        rows: top.map((m) => ({
          itemCode: m.itemCode,
          stockDelta: toNum(m.stockDelta),
          stockDeltaPct:
            toNum(m.stockDeltaPct) == null
              ? null
              : Number((toNum(m.stockDeltaPct) as number).toFixed(1)),
          stockTotal: toNum(m.stockTotal),
        })),
      },
      disclaimer:
        'These are net stock changes between available months, not confirmed consumption.',
      data: top,
    };
  }

  private async highestIncrease(p: string): Promise<AssistantReply> {
    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const top = metrics
      .filter((m) => {
        const d = toNum(m.stockDelta);
        return d !== null && d > 0;
      })
      .sort((a, b) => (toNum(b.stockDelta) || 0) - (toNum(a.stockDelta) || 0))
      .slice(0, 10);

    const best = top[0];
    const answer =
      !best
        ? `No stock increases found for **${p}**.`
        : `These items gained the most stock going into **${p}**.\n\n` +
          `Top gain: **${best.itemCode}** (+${fmt(toNum(best.stockDelta))} units).`;

    return {
      answer,
      period: p,
      intent: 'highest_increase',
      chart: {
        type: 'bar',
        title: 'Top stock increases (qty)',
        categories: top.map((m) => m.itemCode),
        series: [
          {
            name: 'Change',
            data: top.map((m) => Math.round(toNum(m.stockDelta) || 0)),
          },
        ],
      },
      table: {
        columns: [
          { key: 'itemCode', title: 'Item' },
          { key: 'stockDelta', title: 'Change' },
          { key: 'stockTotal', title: 'Current stock' },
        ],
        rows: top.map((m) => ({
          itemCode: m.itemCode,
          stockDelta: toNum(m.stockDelta),
          stockTotal: toNum(m.stockTotal),
        })),
      },
      disclaimer: 'Net stock change only — receipts/issues are not in the source reports.',
      data: top,
    };
  }

  private async volatility(p: string): Promise<AssistantReply> {
    const metrics = await this.metricRepo.find({ where: { periodKey: p } });
    const high = metrics
      .filter((m) => m.isHighVolatility)
      .sort((a, b) => (toNum(b.volatility) || 0) - (toNum(a.volatility) || 0))
      .slice(0, 15);

    const answer =
      high.length === 0
        ? `No high-volatility items are flagged for **${p}** under the current threshold.`
        : `I found **${high.length}** items with unusually uneven stock history in **${p}**. ` +
          `These may need investigation for inconsistent movements.`;

    return {
      answer,
      period: p,
      intent: 'volatility',
      highlights: [
        {
          label: 'High volatility items',
          value: high.length,
          tone: high.length ? 'warn' : 'ok',
        },
      ],
      chart: {
        type: 'bar',
        title: 'Volatility (stdev of stock)',
        categories: high.map((m) => m.itemCode),
        series: [
          {
            name: 'Volatility',
            data: high.map((m) =>
              Number(((toNum(m.volatility) || 0) as number).toFixed(2)),
            ),
          },
        ],
      },
      table: {
        columns: [
          { key: 'itemCode', title: 'Item' },
          { key: 'volatility', title: 'Volatility' },
          { key: 'stockTotal', title: 'Stock' },
        ],
        rows: high.map((m) => ({
          itemCode: m.itemCode,
          volatility:
            toNum(m.volatility) == null
              ? null
              : Number((toNum(m.volatility) as number).toFixed(2)),
          stockTotal: toNum(m.stockTotal),
        })),
      },
      data: high,
    };
  }

  private async attention(p: string): Promise<AssistantReply> {
    const attn = await this.riskService.attention(p);
    const items = attn.items.slice(0, 20);
    const statusCounts: Record<string, number> = {};
    for (const it of attn.items) {
      const s = it.stockStatus || 'OTHER';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const answer =
      items.length === 0
        ? `Nothing urgent is on the attention list for **${p}**.`
        : `Here’s what needs management attention for **${p}**.\n\n` +
          `**${attn.items.length}** items are flagged (critical stock, below ROL, excess, continuous decrease, or high volatility). ` +
          `The top priorities are shown below with recommended actions.`;

    return {
      answer,
      period: p,
      intent: 'attention',
      highlights: [
        {
          label: 'Attention items',
          value: attn.items.length,
          tone: attn.items.length ? 'danger' : 'ok',
        },
      ],
      chart: {
        type: 'pie',
        title: 'Attention by status',
        categories: Object.keys(statusCounts),
        series: [{ name: 'Items', data: Object.values(statusCounts) }],
      },
      table: {
        title: 'Priority attention list',
        columns: [
          { key: 'itemCode', title: 'Item' },
          { key: 'description', title: 'Description' },
          { key: 'stockStatus', title: 'Status' },
          { key: 'stockTotal', title: 'Stock' },
          { key: 'rol', title: 'ROL' },
          { key: 'recommendedAction', title: 'Suggested action' },
        ],
        rows: items.map((it) => ({
          itemCode: it.itemCode,
          description: it.description || '—',
          stockStatus: it.stockStatus,
          stockTotal: it.stockTotal,
          rol: it.rol,
          recommendedAction: it.recommendedAction || '—',
        })),
      },
      data: items,
    };
  }

  private async itemDetail(code: string, p: string): Promise<AssistantReply> {
    const history = await this.snapRepo.find({
      where: { itemCode: code },
      order: { periodKey: 'ASC' },
    });
    if (!history.length) {
      return {
        answer: `I couldn’t find item **${code}** in the imported reports. Check the item code and try again.`,
        period: p,
        intent: 'item_missing',
      };
    }

    const latest = history[history.length - 1];
    const metric = await this.metricRepo.findOne({
      where: { itemCode: code, periodKey: p },
    });
    const stocks = history
      .map((h) => toNum(h.stockTotal))
      .filter((v): v is number => v !== null);
    const vol = sampleStdev(stocks);
    const desc = latest.description || code;

    const answer =
      `Here’s what I know about **${code}** — ${desc}.\n\n` +
      `For period **${p}**, stock is **${fmt(toNum(latest.stockTotal))}** ` +
      `against ROL **${fmt(toNum(metric?.rol ?? latest.rol))}** ` +
      `(status: **${metric?.stockStatus || 'n/a'}**).\n\n` +
      `I have **${history.length}** monthly snapshot(s) for this item. ` +
      (metric?.recommendedAction
        ? `Suggested focus: ${metric.recommendedAction}.`
        : 'The chart shows stock versus ROL over time.');

    return {
      answer,
      period: p,
      intent: 'item',
      highlights: [
        {
          label: 'Current stock',
          value: fmt(toNum(latest.stockTotal)),
          tone: 'info',
        },
        {
          label: 'ROL',
          value: fmt(toNum(metric?.rol ?? latest.rol)),
          tone: 'default',
        },
        {
          label: 'Status',
          value: metric?.stockStatus || 'n/a',
          tone:
            metric?.stockStatus === 'STOCKOUT' ||
            metric?.stockStatus === 'CRITICAL'
              ? 'danger'
              : metric?.stockStatus === 'BELOW_ROL'
                ? 'warn'
                : 'ok',
        },
        {
          label: 'Volatility',
          value: vol == null ? '—' : vol.toFixed(1),
          tone: 'default',
        },
      ],
      chart: {
        type: 'line',
        title: `${code} — stock vs ROL`,
        categories: history.map((h) => h.periodKey),
        series: [
          {
            name: 'Stock',
            data: history.map((h) => toNum(h.stockTotal) || 0),
          },
          {
            name: 'ROL',
            data: history.map((h) => toNum(h.rol) || 0),
          },
        ],
      },
      table: {
        columns: [
          { key: 'periodKey', title: 'Period' },
          { key: 'stockTotal', title: 'Stock' },
          { key: 'rol', title: 'ROL' },
        ],
        rows: history.map((h) => ({
          periodKey: h.periodKey,
          stockTotal: toNum(h.stockTotal),
          rol: toNum(h.rol),
        })),
      },
      data: { history, metric, volatility: vol },
    };
  }
}
