import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import {
  AuditLog,
  InventoryItem,
  MonthlyInventorySnapshot,
  ReportProcessingLog,
  ReportingPeriod,
  SourceReport,
  SystemConfig,
} from '../entities';
import { resolveReportsPath } from '../common/utils/paths';
import { CsvParserService } from './csv-parser.service';
import { MetricsRecomputeService } from './metrics-recompute.service';
import { LocalFolderSource } from './sources/local-folder.source';
import { OneDriveSource } from './sources/onedrive.source';
import { ReportSource } from './sources/report-source.interface';

export type SyncResult = {
  scanned: number;
  imported: number;
  skippedDuplicate: number;
  failed: number;
  files: { name: string; status: string; rows?: number; message?: string }[];
  metrics?: { periods: number; metrics: number };
};

@Injectable()
export class IngestionService implements OnModuleInit {
  private readonly logger = new Logger(IngestionService.name);
  private syncing = false;
  private lastSyncAt: Date | null = null;
  private lastResult: SyncResult | null = null;

  constructor(
    private readonly csvParser: CsvParserService,
    private readonly metricsService: MetricsRecomputeService,
    @InjectRepository(SourceReport)
    private readonly sourceRepo: Repository<SourceReport>,
    @InjectRepository(ReportProcessingLog)
    private readonly logRepo: Repository<ReportProcessingLog>,
    @InjectRepository(ReportingPeriod)
    private readonly periodRepo: Repository<ReportingPeriod>,
    @InjectRepository(InventoryItem)
    private readonly itemRepo: Repository<InventoryItem>,
    @InjectRepository(MonthlyInventorySnapshot)
    private readonly snapRepo: Repository<MonthlyInventorySnapshot>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async onModuleInit() {
    // Import folder reports automatically so dashboards are not empty after start
    const auto = (process.env.AUTO_SYNC_ON_START || 'true').toLowerCase();
    if (auto === 'false' || auto === '0') return;
    setTimeout(() => {
      void this.sync(null, 'startup').catch((e) =>
        this.logger.error(`Startup sync failed: ${(e as Error).message}`),
      );
    }, 1500);
  }

  @Cron('*/15 * * * *')
  async scheduledSync() {
    this.logger.log('Scheduled ingestion sync starting…');
    try {
      await this.sync(null, 'scheduler');
    } catch (e) {
      this.logger.error(`Scheduled sync failed: ${(e as Error).message}`);
    }
  }

  async sync(
    actor?: { id: number; username: string } | null,
    trigger = 'manual',
  ): Promise<SyncResult> {
    if (this.syncing) {
      return {
        scanned: 0,
        imported: 0,
        skippedDuplicate: 0,
        failed: 0,
        files: [{ name: '*', status: 'busy', message: 'Sync already in progress' }],
      };
    }
    this.syncing = true;
    const result: SyncResult = {
      scanned: 0,
      imported: 0,
      skippedDuplicate: 0,
      failed: 0,
      files: [],
    };

    try {
      const source = await this.resolveSource();
      const files = await source.listReports();
      result.scanned = files.length;
      const touchedPeriods = new Set<string>();

      for (const file of files) {
        try {
          const buffer = await source.readFile(file);
          const hash = source.computeHash(buffer);

          const existing = await this.sourceRepo.findOne({
            where: { fileHash: hash },
          });
          if (existing) {
            result.skippedDuplicate += 1;
            result.files.push({
              name: file.name,
              status: 'duplicate',
              message: `hash ${hash.slice(0, 12)}… already imported`,
            });
            continue;
          }

          const parsed = await this.csvParser.parseFile(buffer, file.name);
          if (!parsed.periodKey || !parsed.rows.length) {
            result.failed += 1;
            result.files.push({
              name: file.name,
              status: 'failed',
              message:
                'No parseable rows or missing Run Date / Item Code header',
            });
            await this.logRepo.save(
              this.logRepo.create({
                fileName: file.name,
                stage: 'parse',
                status: 'failed',
                message: 'Empty or invalid report (CSV/XLSX)',
                rowsProcessed: 0,
              }),
            );
            continue;
          }

          const sourceReport = await this.sourceRepo.save(
            this.sourceRepo.create({
              fileName: file.name,
              filePath: file.path,
              fileHash: hash,
              runDate: parsed.runDate,
              periodKey: parsed.periodKey,
              rowCount: parsed.rows.length,
              status: 'processing',
              sourceType: source.sourceType,
            }),
          );

          await this.persistRows(parsed, sourceReport.id);
          touchedPeriods.add(parsed.periodKey);

          sourceReport.status = 'completed';
          await this.sourceRepo.save(sourceReport);

          let period = await this.periodRepo.findOne({
            where: { periodKey: parsed.periodKey },
          });
          if (!period) {
            period = this.periodRepo.create({
              periodKey: parsed.periodKey,
              runDate: parsed.runDate,
              label: parsed.periodKey,
              itemCount: parsed.rows.length,
              sourceReportId: sourceReport.id,
            });
          } else {
            period.runDate = parsed.runDate;
            period.itemCount = parsed.rows.length;
            period.sourceReportId = sourceReport.id;
          }
          await this.periodRepo.save(period);

          await this.logRepo.save(
            this.logRepo.create({
              sourceReportId: sourceReport.id,
              fileName: file.name,
              stage: 'persist',
              status: 'completed',
              message: `Imported ${parsed.rows.length} rows (skipped ${parsed.skippedRows})`,
              rowsProcessed: parsed.rows.length,
            }),
          );

          result.imported += 1;
          result.files.push({
            name: file.name,
            status: 'imported',
            rows: parsed.rows.length,
          });
        } catch (err) {
          result.failed += 1;
          const message = (err as Error).message;
          result.files.push({ name: file.name, status: 'failed', message });
          await this.logRepo.save(
            this.logRepo.create({
              fileName: file.name,
              stage: 'sync',
              status: 'failed',
              message,
              rowsProcessed: 0,
            }),
          );
        }
      }

      if (touchedPeriods.size) {
        for (const pk of [...touchedPeriods].sort()) {
          await this.metricsService.recomputePeriod(pk);
        }
        // Also recompute later periods that depend on deltas
        const allPeriods = await this.periodRepo.find({
          order: { periodKey: 'ASC' },
        });
        const maxTouched = [...touchedPeriods].sort().pop()!;
        for (const p of allPeriods) {
          if (p.periodKey > maxTouched) {
            await this.metricsService.recomputePeriod(p.periodKey);
          }
        }
        result.metrics = {
          periods: touchedPeriods.size,
          metrics: 0,
        };
      }

      await this.auditRepo.save(
        this.auditRepo.create({
          userId: actor?.id ?? null,
          username: actor?.username ?? trigger,
          action: 'INGESTION_SYNC',
          resource: 'ingestion',
          details: JSON.stringify({
            trigger,
            imported: result.imported,
            skipped: result.skippedDuplicate,
            failed: result.failed,
          }),
        }),
      );

      this.lastSyncAt = new Date();
      this.lastResult = result;
      return result;
    } finally {
      this.syncing = false;
    }
  }

  async status() {
    const reports = await this.sourceRepo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const periods = await this.periodRepo.find({
      order: { periodKey: 'ASC' },
    });
    const snapCount = await this.snapRepo.count();
    const itemCount = await this.itemRepo.count();
    const reportsPath = resolveReportsPath(
      process.env.REPORTS_PATH ||
        (
          await this.configRepo.findOne({ where: { key: 'REPORTS_PATH' } })
        )?.value,
    );

    const folderSource = new LocalFolderSource(reportsPath);
    const folderFiles = folderSource.listAllOnDisk().map((f) => ({
      name: f.name,
      size: f.size,
      modifiedAt: f.modifiedAt,
      extension: f.name.includes('.')
        ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
        : '',
    }));

    return {
      syncing: this.syncing,
      lastSyncAt: this.lastSyncAt,
      lastResult: this.lastResult,
      reportsPath,
      folderExists: fs.existsSync(reportsPath),
      folderFiles,
      kpis: {
        sourceReports: await this.sourceRepo.count(),
        periods: periods.length,
        inventoryItems: itemCount,
        snapshots: snapCount,
        latestPeriod: periods.length
          ? periods[periods.length - 1].periodKey
          : null,
      },
      periods,
      recentReports: reports,
    };
  }

  private async resolveSource(): Promise<ReportSource> {
    const cfg = await this.configRepo.findOne({
      where: { key: 'INGESTION_SOURCE' },
    });
    const mode = (cfg?.value || 'local').toLowerCase();
    if (mode === 'onedrive') {
      return new OneDriveSource();
    }
    const pathCfg = await this.configRepo.findOne({
      where: { key: 'REPORTS_PATH' },
    });
    const folder = resolveReportsPath(
      process.env.REPORTS_PATH || pathCfg?.value,
    );
    return new LocalFolderSource(folder);
  }

  private async persistRows(
    parsed: {
      runDate: string | null;
      periodKey: string;
      rows: import('./csv-parser.service').ParsedRow[];
    },
    sourceReportId: number,
  ) {
    const chunk = 100;
    for (let i = 0; i < parsed.rows.length; i += chunk) {
      const slice = parsed.rows.slice(i, i + chunk);
      for (const row of slice) {
        let item = await this.itemRepo.findOne({
          where: { itemCode: row.itemCode },
        });
        if (!item) {
          item = await this.itemRepo.save(
            this.itemRepo.create({
              itemCode: row.itemCode,
              description: row.description,
              uom: row.uom,
              itemType: row.itemType,
              isActive: true,
            }),
          );
        } else {
          item.description = row.description ?? item.description;
          item.uom = row.uom ?? item.uom;
          item.itemType = row.itemType ?? item.itemType;
          await this.itemRepo.save(item);
        }

        // Append-only: if (item, period) exists with same data skip; if re-import of new file for same period, update in place only when hash differed (new SourceReport)
        let snap = await this.snapRepo.findOne({
          where: { itemCode: row.itemCode, periodKey: parsed.periodKey },
        });
        if (!snap) {
          snap = this.snapRepo.create({
            itemCode: row.itemCode,
            periodKey: parsed.periodKey,
          });
        }
        Object.assign(snap, {
          runDate: parsed.runDate,
          description: row.description,
          uom: row.uom,
          itemType: row.itemType,
          sn: row.sn,
          usage12m: row.usage12m,
          avgUsageM: row.avgUsageM,
          procPeriod: row.procPeriod,
          safetyMargin: row.safetyMargin,
          rol: row.rol,
          roq: row.roq,
          stockTotal: row.stockTotal,
          poOps: row.poOps,
          reorderFlag: row.reorderFlag,
          avgCost: row.avgCost,
          quotOps: row.quotOps,
          transferToProject: row.transferToProject,
          finalStock: row.finalStock,
          rolTouch: row.rolTouch,
          projectReq: row.projectReq,
          projectQuot: row.projectQuot,
          projectPo: row.projectPo,
          actualReq: row.actualReq,
          notesRaw: row.notesRaw,
          isPartial: row.isPartial,
          sourceReportId,
        });
        await this.snapRepo.save(snap);
      }
    }
  }
}
