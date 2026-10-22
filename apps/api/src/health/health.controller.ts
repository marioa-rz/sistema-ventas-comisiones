import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness de la API' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness de la API y PostgreSQL' })
  @ApiOkResponse({ schema: { example: { status: 'ok', database: 'up' } } })
  async ready(): Promise<{ status: string; database: string }> {
    await this.healthService.checkDatabase();
    return { status: 'ok', database: 'up' };
  }
}
