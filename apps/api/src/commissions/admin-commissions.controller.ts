import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedUser } from '../users/users.service';
import { AdminCommissionFiltersDto, AdminPayoutFiltersDto, CreateCommissionPayoutDto } from './commissions.dto';
import { CommissionsService } from './commissions.service';

@ApiTags('admin commissions')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get('commissions')
  @ApiOperation({ summary: 'Listar comisiones generales con filtros por vendedor, estado y rango de fechas' })
  list(@Query() filters: AdminCommissionFiltersDto) {
    return this.commissions.listAdminCommissions(filters);
  }

  @Post('commission-payouts')
  @ApiOperation({ summary: 'Registrar liquidación atómica e idempotente de comisiones aprobadas' })
  createPayout(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateCommissionPayoutDto) {
    return this.commissions.createPayout(admin.id, dto);
  }

  @Get('commission-payouts')
  @ApiOperation({ summary: 'Listar liquidaciones registradas' })
  listPayouts(@Query() filters: AdminPayoutFiltersDto) {
    return this.commissions.listPayouts(filters);
  }

  @Get('commission-payouts/:id')
  @ApiOperation({ summary: 'Consultar detalle de liquidación con comisiones liquidadas' })
  getPayoutById(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.getPayoutById(id);
  }
}
