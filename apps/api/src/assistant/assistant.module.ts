import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyInventorySnapshot, StockMetric } from '../entities';
import { PeriodsModule } from '../periods/periods.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { RiskModule } from '../risk/risk.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockMetric, MonthlyInventorySnapshot]),
    PeriodsModule,
    DashboardModule,
    RiskModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
