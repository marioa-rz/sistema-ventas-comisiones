import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { lockOrder } from '../orders/order-lock';
import {
  PaymentProofStorage,
  type PaymentProofFile,
  type StoredPaymentProof,
} from '../storage/payment-proof.storage';

@Injectable()
export class PaymentProofsService {
  private readonly logger = new Logger(PaymentProofsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PaymentProofStorage,
  ) {}

  async replaceRejected(administratorId: string, orderId: string, file: PaymentProofFile) {
    const current = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, payment: { select: { method: true, status: true } } },
    });
    if (!current?.payment) throw new NotFoundException('Order not found');
    if (current.status !== 'PENDING' || current.payment.method !== 'TRANSFER' || current.payment.status !== 'REJECTED') {
      throw new ConflictException('Only a rejected transfer proof can be replaced');
    }

    let stored: StoredPaymentProof | undefined;
    try {
      stored = await this.storage.upload(file);
      return await this.prisma.$transaction(async (transaction) => {
        await lockOrder(transaction, orderId);
        const order = await transaction.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, payment: { select: { id: true, method: true, status: true } } },
        });
        if (
          !order?.payment ||
          order.status !== 'PENDING' ||
          order.payment.method !== 'TRANSFER' ||
          order.payment.status !== 'REJECTED'
        ) {
          throw new ConflictException('Payment changed before the proof could be replaced');
        }

        const payment = await transaction.payment.updateMany({
          where: { id: order.payment.id, status: 'REJECTED' },
          data: { status: 'PENDING', verifiedAt: null, verifiedById: null, rejectionReason: null },
        });
        if (payment.count !== 1) throw new ConflictException('Payment changed before the proof could be replaced');
        const proof = await transaction.paymentProof.create({
          data: {
            paymentId: order.payment.id,
            storagePath: stored!.path,
            originalFilename: stored!.originalFilename,
            mimeType: stored!.mimeType,
            sizeBytes: stored!.sizeBytes,
          },
          select: { id: true },
        });
        await transaction.auditLog.create({
          data: {
            actorId: administratorId,
            action: 'PAYMENT_PROOF_REPLACED',
            entityType: 'PaymentProof',
            entityId: proof.id,
            metadata: { orderId },
          },
        });
        return { orderId, proofId: proof.id, paymentStatus: 'PENDING' as const };
      });
    } catch (error) {
      if (stored) await this.removeUploaded(stored.path);
      throw error;
    }
  }

  async getAdminSignedUrl(orderId: string) {
    const proof = await this.prisma.paymentProof.findFirst({
      where: { payment: { is: { orderId } } },
      select: { id: true, storagePath: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!proof) throw new NotFoundException('Payment proof not found');
    const signed = await this.storage.createSignedUrl(proof.storagePath);
    return { proofId: proof.id, ...signed };
  }

  private async removeUploaded(path: string): Promise<void> {
    try {
      await this.storage.remove(path);
    } catch {
      this.logger.error(`Orphaned payment proof requires cleanup: ${path}`);
    }
  }
}
