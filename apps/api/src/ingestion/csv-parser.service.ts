import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { parseNumber } from '../common/utils/numbers';

export type ParsedRow = {
  sn: number | null;
  itemCode: string;
  description: string | null;
  uom: string | null;
  itemType: string | null;
  usage12m: number | null;
  avgUsageM: number | null;
  procPeriod: number | null;
  safetyMargin: number | null;
  rol: number | null;
  roq: number | null;
  stockTotal: number | null;
  poOps: number | null;
  reorderFlag: string | null;
  avgCost: number | null;
  quotOps: number | null;
  transferToProject: number | null;
  finalStock: number | null;
  rolTouch: number | null;
  projectReq: number | null;
  projectQuot: number | null;
  projectPo: number | null;
  actualReq: number | null;
  notesRaw: string | null;
  isPartial: boolean;
};

export type ParsedReport = {
  runDate: string | null;
  periodKey: string | null;
  usagePeriodLabel: string | null;
  rows: ParsedRow[];
  skippedRows: number;
};

const MONTHS: Record<string, string> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

/** Canonical field → header match predicates (normalized). */
const ALIAS_MAP: Record<string, (h: string) => boolean> = {
  sn: (h) => h === 's/n' || h === 'sn',
  itemCode: (h) => h === 'item code',
  description: (h) => h === 'description',
  uom: (h) => h === 'u/m' || h === 'um',
  usage12m: (h) =>
    h.startsWith('from ') ||
    h.startsWith('usage from') ||
    (h.includes('from ') && h.includes(' to ')),
  avgUsageM: (h) => h.includes('avg') && h.includes('usage'),
  itemType: (h) => h === 'item type',
  procPeriod: (h) => h.includes('proc') && h.includes('period'),
  safetyMargin: (h) => h.includes('safty') || h.includes('safety'),
  rol: (h) => h === 'rol',
  roq: (h) => h === 'roq',
  stockTotal: (h) => h === 'stock total',
  poOps: (h) =>
    (h.includes('total orders') || h.includes('total p/orders') || h.includes('p/orders raised')) &&
    (h.includes('opr') || h.includes('opr.')),
  avgCost: (h) => h.includes('average cost'),
  quotOps: (h) =>
    h.includes('quot') && h.includes('opr'),
  transferToProject: (h) => h.includes('transferred to project'),
  finalStock: (h) => h.startsWith('final stock'),
  rolTouch: (h) => h === 'rol touch',
  projectReq: (h) =>
    h.includes('project requirements') ||
    (h.includes('porject') && h.includes('requirement')),
  projectQuot: (h) => h.includes('quot') && h.includes('proj'),
  projectPo: (h) =>
    (h.includes('po raised') || h.includes('total po') || h.includes('p/orders raised')) &&
    h.includes('project'),
  actualReq: (h) => h.includes('actual req'),
};

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseRunDate(text: string): { runDate: string | null; periodKey: string | null } {
  const m = text.match(/Run Date\s+(\d{1,2})-([A-Za-z]{3})-(\d{4})/i);
  if (!m) return { runDate: null, periodKey: null };
  const day = m[1].padStart(2, '0');
  const mon = MONTHS[m[2].toUpperCase()];
  const year = m[3];
  if (!mon) return { runDate: null, periodKey: null };
  return {
    runDate: `${year}-${mon}-${day}`,
    periodKey: `${year}-${mon}`,
  };
}

@Injectable()
export class CsvParserService {
  /** Parse by file extension: .csv or .xlsx / .xls */
  async parseFile(buffer: Buffer, fileName: string): Promise<ParsedReport> {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      return this.parseXlsxBuffer(buffer);
    }
    return this.parseBuffer(buffer);
  }

  parseBuffer(buffer: Buffer): ParsedReport {
    const text = buffer.toString('utf8');
    const records: string[][] = parse(text, {
      relax_column_count: true,
      skip_empty_lines: false,
      trim: false,
    });
    return this.parseRecords(records);
  }

  async parseXlsxBuffer(buffer: Buffer): Promise<ParsedReport> {
    const workbook = new ExcelJS.Workbook();
    // exceljs load accepts Buffer
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet =
      workbook.worksheets.find((ws) => ws.rowCount > 0) || workbook.worksheets[0];
    if (!sheet) {
      return {
        runDate: null,
        periodKey: null,
        usagePeriodLabel: null,
        rows: [],
        skippedRows: 0,
      };
    }
    const records: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const values = row.values as Array<ExcelJS.CellValue>;
      // exceljs row.values is 1-based; index 0 is empty
      const cells: string[] = [];
      const maxCol = Math.max(row.cellCount, (values?.length || 1) - 1);
      for (let c = 1; c <= maxCol; c++) {
        cells.push(this.cellValueToString(row.getCell(c).value));
      }
      records.push(cells);
    });
    return this.parseRecords(records);
  }

  private cellValueToString(value: ExcelJS.CellValue): string {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'object') {
      const v = value as { text?: string; result?: unknown; richText?: { text: string }[] };
      if (v.text != null) return String(v.text);
      if (v.result != null) return String(v.result);
      if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
    }
    return String(value);
  }

  parseRecords(records: string[][]): ParsedReport {
    let runDate: string | null = null;
    let periodKey: string | null = null;
    let usagePeriodLabel: string | null = null;
    let headerIdx = -1;
    let headerMap: Record<string, number | number[]> = {};

    for (let i = 0; i < Math.min(records.length, 15); i++) {
      const joined = records[i].join(' ');
      if (!runDate && /Run Date/i.test(joined)) {
        const parsed = parseRunDate(joined);
        runDate = parsed.runDate;
        periodKey = parsed.periodKey;
      }
      const norms = records[i].map((c) => normalizeHeader(c || ''));
      if (norms.some((h) => h === 'item code')) {
        headerIdx = i;
        headerMap = this.buildHeaderMap(norms, records, i);
        // usage label from usage column header
        const usageCol = headerMap['usage12m'];
        const idx = Array.isArray(usageCol) ? usageCol[0] : usageCol;
        if (typeof idx === 'number' && records[i][idx]) {
          usagePeriodLabel = String(records[i][idx]).trim();
        }
        break;
      }
    }

    if (headerIdx < 0) {
      return {
        runDate,
        periodKey,
        usagePeriodLabel,
        rows: [],
        skippedRows: 0,
      };
    }

    const rows: ParsedRow[] = [];
    let skippedRows = 0;

    for (let i = headerIdx + 1; i < records.length; i++) {
      const cells = records[i];
      if (!cells || cells.every((c) => !String(c || '').trim())) continue;

      // Skip secondary header fragments (e.g. Quot Project sub-headers)
      const joined = cells.join(' ').toLowerCase();
      if (
        joined.includes('quot./ten') &&
        !this.cell(cells, headerMap, 'itemCode')
      ) {
        continue;
      }

      const itemCodeRaw = this.cell(cells, headerMap, 'itemCode');
      const itemCode = itemCodeRaw ? itemCodeRaw.trim() : '';
      if (!itemCode) {
        skippedRows += 1;
        continue;
      }

      // Prefer first Final Stock / ROL Touch occurrence
      const finalStock = this.num(cells, headerMap, 'finalStock');
      const rolTouch = this.num(cells, headerMap, 'rolTouch');

      const description = this.cell(cells, headerMap, 'description');
      const stockTotal = this.num(cells, headerMap, 'stockTotal');
      const rol = this.num(cells, headerMap, 'rol');
      const uom = this.cell(cells, headerMap, 'uom');

      const isPartial =
        !description?.trim() ||
        (stockTotal === null && rol === null) ||
        !uom?.trim();

      // Collect trailing notes (cells after mapped columns that look like text)
      const notesParts: string[] = [];
      for (let c = 0; c < cells.length; c++) {
        const v = String(cells[c] || '').trim();
        if (!v) continue;
        if (/^[A-Za-z]/.test(v) && v.length > 3 && !/^(Yes|No|IMP|IPM|L2?|METE|EACH|NOS|SING)$/i.test(v)) {
          const known = Object.values(headerMap).flatMap((x) =>
            Array.isArray(x) ? x : [x],
          );
          if (!known.includes(c) && normalizeHeader(v) !== itemCode.toLowerCase()) {
            // avoid description column
            const descIdx = headerMap['description'];
            const dIdx = Array.isArray(descIdx) ? descIdx[0] : descIdx;
            if (c !== dIdx) notesParts.push(v);
          }
        }
      }

      const reorderRaw = this.findReorderFlag(cells, headerMap);
      const snRaw = this.cell(cells, headerMap, 'sn') || cells[0];
      const snNum = parseNumber(snRaw);

      const snFallback = parseNumber(String(snRaw ?? '').replace(/[^\d.-]/g, ''));
      rows.push({
        sn:
          snNum !== null && Number.isFinite(snNum)
            ? Math.trunc(snNum)
            : snFallback !== null
              ? Math.trunc(snFallback)
              : null,
        itemCode,
        description: description?.trim() || null,
        uom: uom?.trim() || null,
        itemType: this.cell(cells, headerMap, 'itemType')?.trim() || null,
        usage12m: this.num(cells, headerMap, 'usage12m'),
        avgUsageM: this.num(cells, headerMap, 'avgUsageM'),
        procPeriod: this.num(cells, headerMap, 'procPeriod'),
        safetyMargin: this.num(cells, headerMap, 'safetyMargin'),
        rol,
        roq: this.num(cells, headerMap, 'roq'),
        stockTotal,
        poOps: this.num(cells, headerMap, 'poOps'),
        reorderFlag: reorderRaw,
        avgCost: this.num(cells, headerMap, 'avgCost'),
        quotOps: this.num(cells, headerMap, 'quotOps'),
        transferToProject: this.num(cells, headerMap, 'transferToProject'),
        finalStock,
        rolTouch,
        projectReq: this.num(cells, headerMap, 'projectReq'),
        projectQuot: this.num(cells, headerMap, 'projectQuot'),
        projectPo: this.num(cells, headerMap, 'projectPo'),
        actualReq: this.num(cells, headerMap, 'actualReq'),
        notesRaw: notesParts.length ? notesParts.join(' | ') : null,
        isPartial,
      });
    }

    return { runDate, periodKey, usagePeriodLabel, rows, skippedRows };
  }

  private buildHeaderMap(
    norms: string[],
    records: string[][],
    headerIdx: number,
  ): Record<string, number | number[]> {
    const map: Record<string, number | number[]> = {};

    // Merge next 1-2 rows for sub-headers (project columns often on next line)
    const extra: string[] = [...norms];
    for (let j = 1; j <= 2 && headerIdx + j < records.length; j++) {
      const next = records[headerIdx + j].map((c) => normalizeHeader(c || ''));
      for (let c = 0; c < next.length; c++) {
        if (next[c] && (!extra[c] || extra[c] === '')) {
          extra[c] = next[c];
        } else if (next[c] && extra[c] && !extra[c].includes(next[c])) {
          // keep primary; subheaders used via ALIAS on next alone
        }
      }
      // Also register aliases from next-row-only headers
      for (let c = 0; c < next.length; c++) {
        if (!next[c]) continue;
        for (const [field, pred] of Object.entries(ALIAS_MAP)) {
          if (pred(next[c]) && map[field] === undefined) {
            map[field] = c;
          }
        }
      }
    }

    for (let c = 0; c < norms.length; c++) {
      const h = norms[c];
      if (!h) continue;
      for (const [field, pred] of Object.entries(ALIAS_MAP)) {
        if (!pred(h)) continue;
        if (field === 'finalStock' || field === 'rolTouch') {
          const existing = map[field];
          if (existing === undefined) map[field] = c;
          else if (typeof existing === 'number') map[field] = [existing, c];
          else existing.push(c);
        } else if (map[field] === undefined) {
          map[field] = c;
        }
      }
    }

    // Reorder flag: unnamed Yes/No column after poOps
    const poIdx = map['poOps'];
    if (typeof poIdx === 'number') {
      const candidate = poIdx + 1;
      const h = norms[candidate] || '';
      if (!h || h === '') {
        map['reorderFlag'] = candidate;
      }
    }

    return map;
  }

  private cell(
    cells: string[],
    map: Record<string, number | number[]>,
    field: string,
  ): string | null {
    const idx = map[field];
    if (idx === undefined) return null;
    const i = Array.isArray(idx) ? idx[0] : idx;
    const v = cells[i];
    return v == null ? null : String(v);
  }

  private num(
    cells: string[],
    map: Record<string, number | number[]>,
    field: string,
  ): number | null {
    const idx = map[field];
    if (idx === undefined) return null;
    const i = Array.isArray(idx) ? idx[0] : idx;
    return parseNumber(cells[i]);
  }

  private findReorderFlag(
    cells: string[],
    map: Record<string, number | number[]>,
  ): string | null {
    const idx = map['reorderFlag'];
    if (typeof idx === 'number') {
      const v = String(cells[idx] || '').trim();
      if (/^(yes|no)$/i.test(v)) return v.length ? (v[0].toUpperCase() + v.slice(1).toLowerCase()) : null;
    }
    // fallback: scan near poOps
    const po = map['poOps'];
    if (typeof po === 'number') {
      for (let i = po + 1; i <= po + 2; i++) {
        const v = String(cells[i] || '').trim();
        if (/^(yes|no)$/i.test(v)) {
          return v[0].toUpperCase() + v.slice(1).toLowerCase();
        }
      }
    }
    return null;
  }
}
