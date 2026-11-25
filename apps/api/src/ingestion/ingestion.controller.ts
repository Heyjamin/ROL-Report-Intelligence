import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ingestion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('sync')
  @Permissions('ingestion:sync')
  @Roles('SUPER_ADMIN', 'ADMIN', 'ANALYST')
  sync(@CurrentUser() user: { id: number; username: string }) {
    return this.ingestionService.sync(user, 'manual');
  }

  @Get('status')
  @Permissions('ingestion:read')
  status() {
    return this.ingestionService.status();
  }
}
