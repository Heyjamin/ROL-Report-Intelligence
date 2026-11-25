import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('monthly-insight.xlsx')
  @Permissions('exports:excel')
  async monthlyXlsx(
    @Query('period') period: string | undefined,
    @Res() res: Response,
  ) {
    const buf = await this.exportsService.monthlyInsightXlsx(period);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="monthly-insight-${period || 'latest'}.xlsx"`,
    );
    res.send(buf);
  }

  @Get('monthly-insight.pdf')
  @Permissions('exports:pdf')
  async monthlyPdf(
    @Query('period') period: string | undefined,
    @Res() res: Response,
  ) {
    const buf = await this.exportsService.monthlyInsightPdf(period);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="monthly-insight-${period || 'latest'}.pdf"`,
    );
    res.send(buf);
  }

  @Get('inventory.xlsx')
  @Permissions('exports:excel')
  async inventoryXlsx(
    @Query('period') period: string | undefined,
    @Query('q') q: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const buf = await this.exportsService.inventoryXlsx({ period, q, status });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventory-${period || 'latest'}.xlsx"`,
    );
    res.send(buf);
  }
}
