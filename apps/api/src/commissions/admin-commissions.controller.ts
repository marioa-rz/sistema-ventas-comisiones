import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedUser } from '../users/users.service';
import type { PaymentProofFile } from '../storage/payment-proof.storage';
import { AdminCommissionFiltersDto, AdminPayoutFiltersDto, CancelCommissionPayoutDto, CreateCommissionPayoutDto } from './commissions.dto';
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

  @Get('commissions/sellers-summary')
  @ApiOperation({ summary: 'Consultar consolidado de comisiones por vendedora para liquidación' })
  getSellersSummary() {
    return this.commissions.getSellersSummary();
  }

  @Post('commission-payouts')
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sellerId', 'commissionIds', 'method', 'idempotencyKey'],
      properties: {
        sellerId: { type: 'string', format: 'uuid' },
        commissionIds: { type: 'string', description: 'JSON array of commission UUIDs' },
        method: { type: 'string', enum: ['CASH', 'TRANSFER'] },
        proof: { type: 'string', format: 'binary', description: 'Required JPEG or PNG for transfers' },
        note: { type: 'string', maxLength: 500 },
        idempotencyKey: { type: 'string', maxLength: 128 },
      },
    },
  })
  @ApiOperation({ summary: 'Registrar liquidación atómica e idempotente de comisiones aprobadas' })
  createPayout(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateCommissionPayoutDto,
    @UploadedFile() proof?: PaymentProofFile,
  ) {
    return this.commissions.createPayout(admin.id, dto, proof);
  }

  @Get('commission-payouts')
  @ApiOperation({ summary: 'Listar liquidaciones registradas' })
  listPayouts(@Query() filters: AdminPayoutFiltersDto) {
    return this.commissions.listPayouts(filters);
  }

  @Get('commission-payouts/:id/proof-url')
  @ApiOperation({ summary: 'Crear URL firmada y temporal para el comprobante de una liquidación' })
  getPayoutProofUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.getPayoutProofUrl(id);
  }

  @Patch('commission-payouts/:id/cancel')
  @ApiOperation({ summary: 'Cancelar liquidación de comisiones de forma atómica y auditada' })
  cancelPayout(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelCommissionPayoutDto,
  ) {
    return this.commissions.cancelPayout(admin.id, id, dto);
  }

  @Get('commission-payouts/:id')
  @ApiOperation({ summary: 'Consultar detalle de liquidación con comisiones liquidadas' })
  getPayoutById(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.getPayoutById(id);
  }
}
