import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForecastResult, MonthlyInventorySnapshot } from '../entities';
import { ForecastsController } from './forecasts.controller';
import { ForecastsService } from './forecasts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlyInventorySnapshot, ForecastResult]),
  ],
  controllers: [ForecastsController],
  providers: [ForecastsService],
})
export class ForecastsModule {}
