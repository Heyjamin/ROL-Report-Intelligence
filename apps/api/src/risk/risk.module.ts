import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InventoryAlert,
  MonthlyInventorySnapshot,
  StockMetric,
} from '../entities';
import { PeriodsModule } from '../periods/periods.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockMetric,
      MonthlyInventorySnapshot,
      InventoryAlert,
    ]),
    PeriodsModule,
  ],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
