import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ForecastsService } from './forecasts.service';
import { ForecastBatchDto } from './dto/batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('forecasts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ForecastsController {
  constructor(private readonly forecastsService: ForecastsService) {}

  @Post('batch')
  @Permissions('forecasts:read')
  batch(@Body() dto: ForecastBatchDto) {
    return this.forecastsService.batch(dto.itemCodes || []);
  }

  @Get(':itemCode')
  @Permissions('forecasts:read')
  forItem(@Param('itemCode') itemCode: string) {
    return this.forecastsService.forItem(itemCode);
  }
}
