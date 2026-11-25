import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
// pdfkit CJS default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import { ReportsService } from '../reports/reports.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly inventoryService: InventoryService,
  ) {}

  async monthlyInsightXlsx(period?: string): Promise<Buffer> {
    const data = await this.reportsService.monthlyInsight(period);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ROL Inventory Platform';

    const summary = wb.addWorksheet('Summary');
    summary.addRow(['Period', data.period]);
    summary.addRow(['Summary', data.summary]);
    summary.addRow([]);
    summary.addRow(['KPI', 'Value']);
    if (data.kpis) {
      for (const [k, v] of Object.entries(data.kpis)) {
        if (typeof v !== 'object') summary.addRow([k, v]);
      }
    }

    const attn = wb.addWorksheet('Attention');
    attn.addRow([
      'Item Code',
      'Description',
      'Status',
      'Stock',
      'ROL',
      'Gap Qty',
      'Gap Value',
      'Action',
    ]);
    for (const row of data.attention || []) {
      attn.addRow([
        row.itemCode,
        row.description,
        row.stockStatus,
        row.stockTotal,
        row.rol,
        row.gapQty,
        row.gapValue,
        row.recommendedAction,
      ]);
    }

    const crit = wb.addWorksheet('Critical');
    crit.addRow(['Item Code', 'Status', 'Stock', 'ROL', 'Gap Qty', 'Gap Value']);
    for (const row of data.charts?.critical || []) {
      crit.addRow([
        row.itemCode,
        row.stockStatus,
        row.stockTotal,
        row.rol,
        row.gapQty,
        row.gapValue,
      ]);
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async monthlyInsightPdf(period?: string): Promise<Buffer> {
    const data = await this.reportsService.monthlyInsight(period);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('ROL Monthly Insight', { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(`Period: ${data.period || 'N/A'}`);
      doc.moveDown();
      doc.text(data.summary || '');
      doc.moveDown();
      if (data.kpis) {
        doc.fontSize(12).text('KPIs', { underline: true });
        doc.fontSize(10);
        doc.text(`Items: ${data.kpis.itemCount}`);
        doc.text(`Stockout: ${data.kpis.stockout}`);
        doc.text(`Critical: ${data.kpis.critical}`);
        doc.text(`Below ROL (risk): ${data.kpis.belowRol}`);
        doc.text(`Excess: ${data.kpis.excess}`);
        doc.text(`Gap value (LKR): ${Math.round(data.kpis.gapValue)}`);
        doc.text(`Stock value (LKR): ${Math.round(data.kpis.stockValue)}`);
      }
      doc.moveDown();
      doc.fontSize(12).text('Top attention items', { underline: true });
      doc.fontSize(9);
      for (const row of (data.attention || []).slice(0, 20)) {
        doc.text(
          `${row.itemCode} | ${row.stockStatus} | stock=${row.stockTotal} rol=${row.rol} gap=${row.gapQty}`,
        );
      }
      doc.end();
    });
  }

  async inventoryXlsx(opts: {
    period?: string;
    q?: string;
    status?: string;
  }): Promise<Buffer> {
    const data = await this.inventoryService.list({
      ...opts,
      page: 1,
      pageSize: 10000,
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Inventory');
    ws.addRow([
      'Item Code',
      'Description',
      'UOM',
      'Type',
      'Stock Total',
      'ROL',
      'ROQ',
      'Avg Cost',
      'Status',
      'Delta',
      'Gap Qty',
      'Gap Value',
      'Action',
    ]);
    for (const row of data.items) {
      ws.addRow([
        row.itemCode,
        row.description,
        row.uom,
        row.itemType,
        row.stockTotal,
        row.rol,
        row.roq,
        row.avgCost,
        row.stockStatus,
        row.stockDelta,
        row.gapQty,
        row.gapValue,
        row.recommendedAction,
      ]);
    }
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
