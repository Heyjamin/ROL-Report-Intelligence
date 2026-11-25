import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMetric } from '../entities';
import { DashboardModule } from '../dashboard/dashboard.module';
import { RiskModule } from '../risk/risk.module';
import { PeriodsModule } from '../periods/periods.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockMetric]),
    DashboardModule,
    RiskModule,
    PeriodsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
