import { Module } from '@nestjs/common';
import { PaymentProofStorage } from '../storage/payment-proof.storage';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PaymentProofStorage],
})
export class OrdersModule {}
