import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MonthlyInventorySnapshot,
  ReportingPeriod,
  StockMetric,
} from '../entities';
import { PeriodsModule } from '../periods/periods.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockMetric,
      MonthlyInventorySnapshot,
      ReportingPeriod,
    ]),
    PeriodsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
