import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedUser } from '../users/users.service';
import { SellerCommissionFiltersDto, UpdateSellerPayoutSettingsDto } from './commissions.dto';
import { CommissionsService } from './commissions.service';

@ApiTags('seller commissions')
@ApiBearerAuth()
@Controller('seller/commissions')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('SELLER')
export class SellerCommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get('payout-settings')
  @ApiOperation({ summary: 'Consultar el destino bancario de la vendedora autenticada' })
  getPayoutSettings(@CurrentUser() seller: AuthenticatedUser) {
    return this.commissions.getSellerPayoutSettings(seller.id);
  }

  @Patch('payout-settings')
  @ApiOperation({ summary: 'Actualizar el destino bancario de la vendedora autenticada' })
  updatePayoutSettings(
    @CurrentUser() seller: AuthenticatedUser,
    @Body() dto: UpdateSellerPayoutSettingsDto,
  ) {
    return this.commissions.updateSellerPayoutSettings(seller.id, dto);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Consultar historial de liquidaciones de comisiones recibidas por la vendedora' })
  listPayouts(@CurrentUser() seller: AuthenticatedUser) {
    return this.commissions.listSellerPayouts(seller.id);
  }

  @Get('payouts/:id/proof-url')
  @ApiOperation({ summary: 'Obtener URL privada y temporal para ver comprobante de liquidación' })
  getPayoutProofUrl(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissions.getSellerPayoutProofUrl(seller.id, id);
  }

  @Get()
  @ApiOperation({ summary: 'Consultar comisiones pendientes, aprobadas y pagadas del vendedor autenticado' })
  list(@CurrentUser() seller: AuthenticatedUser, @Query() filters: SellerCommissionFiltersDto) {
    return this.commissions.listSellerCommissions(seller.id, filters);
  }
}
