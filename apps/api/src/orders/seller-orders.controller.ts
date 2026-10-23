import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import type { AuthenticatedUser } from '../users/users.service';
import { ClaimOrderDto, SellerOrdersQueryDto } from './order-workflow.dto';
import { SellerOrdersService } from './seller-orders.service';

@ApiTags('seller orders')
@ApiBearerAuth()
@Controller('seller/orders')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('SELLER')
export class SellerOrdersController {
  constructor(
    private readonly orders: SellerOrdersService,
    private readonly payments: PaymentsService,
  ) {}

  @Post('claim')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 60_000 } })
  @ApiOperation({ summary: 'Reclamar atómicamente un pedido pendiente mediante su código' })
  claim(@CurrentUser() seller: AuthenticatedUser, @Body() dto: ClaimOrderDto) {
    return this.orders.claim(seller.id, dto.publicCode);
  }

  @Get()
  @ApiOperation({ summary: 'Listar solamente los pedidos del vendedor autenticado' })
  list(@CurrentUser() seller: AuthenticatedUser, @Query() query: SellerOrdersQueryDto) {
    return this.orders.list(seller.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un pedido propio' })
  getById(@CurrentUser() seller: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getById(seller.id, id);
  }

  @Post(':id/cash-received')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar efectivo recibido sin confirmar todavía la venta' })
  markCashReceived(@CurrentUser() seller: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.markCashReceived(seller.id, id);
  }
}
