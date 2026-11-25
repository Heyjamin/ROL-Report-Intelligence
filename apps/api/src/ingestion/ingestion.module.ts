import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditLog,
  InventoryAlert,
  InventoryItem,
  MonthlyInventorySnapshot,
  ReportProcessingLog,
  ReportingPeriod,
  SourceReport,
  StockMetric,
  SystemConfig,
} from '../entities';
import { CsvParserService } from './csv-parser.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { MetricsRecomputeService } from './metrics-recompute.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SourceReport,
      ReportProcessingLog,
      ReportingPeriod,
      InventoryItem,
      MonthlyInventorySnapshot,
      StockMetric,
      InventoryAlert,
      SystemConfig,
      AuditLog,
    ]),
  ],
  controllers: [IngestionController],
  providers: [CsvParserService, MetricsRecomputeService, IngestionService],
  exports: [IngestionService, MetricsRecomputeService, CsvParserService],
})
export class IngestionModule {}
