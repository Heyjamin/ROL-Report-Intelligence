import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @Permissions('dashboard:read')
  kpis(@Query('period') period?: string) {
    return this.dashboardService.kpis(period);
  }

  @Get('charts')
  @Permissions('dashboard:read')
  charts(@Query('period') period?: string) {
    return this.dashboardService.charts(period);
  }
}
