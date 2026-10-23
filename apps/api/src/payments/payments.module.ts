import { Module } from '@nestjs/common';
import { PaymentProofStorage } from '../storage/payment-proof.storage';
import { PaymentProofsService } from './payment-proofs.service';
import { PaymentsService } from './payments.service';

@Module({
  providers: [PaymentsService, PaymentProofsService, PaymentProofStorage],
  exports: [PaymentsService, PaymentProofsService],
})
export class PaymentsModule {}
