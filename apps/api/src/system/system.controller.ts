import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class PatchConfigBody {
  @IsObject()
  values: Record<string, string | null>;
}

@Controller('system/config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  @Permissions('config:read')
  @Roles('SUPER_ADMIN', 'ADMIN')
  getAll() {
    return this.systemService.getAll();
  }

  @Patch()
  @Permissions('config:write')
  @Roles('SUPER_ADMIN', 'ADMIN')
  patch(
    @Body() body: PatchConfigBody,
    @CurrentUser() user: { id: number; username: string },
  ) {
    return this.systemService.patch(body.values || {}, user);
  }
}
