import { Controller, Get, UseGuards } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @Get()
  @Permissions('inventory:read')
  findAll() {
    return this.periodsService.findAll();
  }
}
