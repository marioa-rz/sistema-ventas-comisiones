import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedUser } from '../users/users.service';
import { SellerCommissionFiltersDto } from './commissions.dto';
import { CommissionsService } from './commissions.service';

@ApiTags('seller commissions')
@ApiBearerAuth()
@Controller('seller/commissions')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('SELLER')
export class SellerCommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar comisiones pendientes, aprobadas y pagadas del vendedor autenticado' })
  list(@CurrentUser() seller: AuthenticatedUser, @Query() filters: SellerCommissionFiltersDto) {
    return this.commissions.listSellerCommissions(seller.id, filters);
  }
}
