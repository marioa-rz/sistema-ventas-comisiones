import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PaymentProofsService } from '../payments/payment-proofs.service';
import { PaymentsService } from '../payments/payments.service';
import type { PaymentProofFile } from '../storage/payment-proof.storage';
import type { AuthenticatedUser } from '../users/users.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersQueryDto, CancelOrderDto, ReviewPaymentDto } from './order-workflow.dto';

@ApiTags('admin orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrdersController {
  constructor(
    private readonly orders: AdminOrdersService,
    private readonly payments: PaymentsService,
    private readonly proofs: PaymentProofsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos generales con filtros administrativos' })
  list(@Query() query: AdminOrdersQueryDto) {
    return this.orders.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar el detalle administrativo de un pedido' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getById(id);
  }

  @Patch(':id/verify-payment')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificar o rechazar un pago y confirmar la venta cuando corresponde' })
  reviewPayment(
    @CurrentUser() administrator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.payments.review(administrator.id, id, dto);
  }

  @Post(':id/payment-proof')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('paymentProof', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentProof'],
      properties: { paymentProof: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Reemplazar de forma controlada un comprobante de transferencia rechazado' })
  replacePaymentProof(
    @CurrentUser() administrator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) proof: PaymentProofFile,
  ) {
    return this.proofs.replaceRejected(administrator.id, id, proof);
  }

  @Get(':id/payment-proof-url')
  @ApiOperation({ summary: 'Generar una URL privada temporal para revisar el comprobante más reciente' })
  getPaymentProofUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.proofs.getAdminSignedUrl(id);
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancelar un pedido pendiente con auditoría' })
  cancel(
    @CurrentUser() administrator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancel(administrator.id, id, dto.reason);
  }
}
