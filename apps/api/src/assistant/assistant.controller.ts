import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantQueryDto } from './dto/query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('query')
  @Permissions('assistant:query')
  query(@Body() dto: AssistantQueryDto) {
    return this.assistantService.query(dto.question, dto.period);
  }
}
