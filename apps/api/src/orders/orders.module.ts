import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentProofStorage } from '../storage/payment-proof.storage';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SellerOrdersController } from './seller-orders.controller';
import { SellerOrdersService } from './seller-orders.service';

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [OrdersController, SellerOrdersController, AdminOrdersController],
  providers: [OrdersService, SellerOrdersService, AdminOrdersService, PaymentProofStorage],
})
export class OrdersModule {}
