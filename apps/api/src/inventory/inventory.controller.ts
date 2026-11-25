import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Permissions('inventory:read')
  list(
    @Query('period') period?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inventoryService.list({
      period,
      q,
      status,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
    });
  }

  @Get(':itemCode')
  @Permissions('inventory:read')
  detail(@Param('itemCode') itemCode: string) {
    return this.inventoryService.itemIntelligence(itemCode);
  }
}
