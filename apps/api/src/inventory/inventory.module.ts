import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InventoryItem,
  MonthlyInventorySnapshot,
  StockMetric,
} from '../entities';
import { PeriodsModule } from '../periods/periods.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonthlyInventorySnapshot,
      StockMetric,
      InventoryItem,
    ]),
    PeriodsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
