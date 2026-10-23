import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { lockOrder } from '../orders/order-lock';

const paymentReviewInclude = {
  payment: { include: { proofs: { orderBy: { createdAt: 'desc' as const } } } },
  commission: true,
} satisfies Prisma.OrderInclude;

type PaymentReviewOrder = Prisma.OrderGetPayload<{ include: typeof paymentReviewInclude }>;

export interface ReviewPaymentCommand {
  decision: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  markCashReceived(sellerId: string, orderId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await lockOrder(transaction, orderId);
      const order = await transaction.order.findFirst({
        where: { id: orderId, sellerId },
        include: { payment: true },
      });
      if (!order?.payment) throw new NotFoundException('Order not found');
      if (order.status !== 'PENDING') throw new ConflictException('Order is not pending');
      if (order.payment.method !== 'CASH') throw new ConflictException('Only cash payments can be marked received');
      if (order.payment.status !== 'PENDING') throw new ConflictException('Payment is not pending');
      if (order.payment.cashReceivedAt) {
        return { orderId, paymentStatus: 'PENDING' as const, cashReceivedAt: order.payment.cashReceivedAt };
      }

      const receivedAt = new Date();
      const updated = await transaction.payment.updateMany({
        where: { id: order.payment.id, status: 'PENDING', cashReceivedAt: null },
        data: { cashReceivedAt: receivedAt, cashReceivedById: sellerId },
      });
      if (updated.count !== 1) throw new ConflictException('Cash payment was already updated');
      await transaction.auditLog.create({
        data: {
          actorId: sellerId,
          action: 'CASH_RECEIVED',
          entityType: 'Payment',
          entityId: order.payment.id,
          metadata: { orderId },
        },
      });
      return { orderId, paymentStatus: 'PENDING' as const, cashReceivedAt: receivedAt };
    });
  }

  review(administratorId: string, orderId: string, command: ReviewPaymentCommand) {
    return this.prisma.$transaction(async (transaction) => {
      await lockOrder(transaction, orderId);
      const order = await transaction.order.findUnique({
        where: { id: orderId },
        include: paymentReviewInclude,
      });
      if (!order?.payment) throw new NotFoundException('Order not found');

      if (command.decision === 'REJECTED') {
        return this.reject(transaction, administratorId, order, command.rejectionReason);
      }
      if (order.status === 'CONFIRMED' && order.payment.status === 'VERIFIED') {
        return {
          orderId,
          orderStatus: 'CONFIRMED' as const,
          paymentStatus: 'VERIFIED' as const,
          confirmedAt: order.confirmedAt,
        };
      }
      if (order.status !== 'PENDING' || order.payment.status !== 'PENDING') {
        throw new ConflictException('Payment cannot be verified in its current state');
      }
      if (!order.sellerId || !order.commission || order.commission.status !== 'PENDING') {
        throw new ConflictException('Order must be assigned before payment verification');
      }
      if (order.payment.method === 'CASH' && !order.payment.cashReceivedAt) {
        throw new ConflictException('Cash must be marked received before verification');
      }
      const pendingProof = order.payment.proofs.find((proof) => proof.reviewStatus === 'PENDING');
      if (order.payment.method === 'TRANSFER' && !pendingProof) {
        throw new ConflictException('Transfer requires a pending payment proof');
      }

      const confirmedAt = new Date();
      if (pendingProof) {
        const proof = await transaction.paymentProof.updateMany({
          where: { id: pendingProof.id, reviewStatus: 'PENDING' },
          data: { reviewStatus: 'ACCEPTED', reviewedAt: confirmedAt, reviewedById: administratorId },
        });
        if (proof.count !== 1) throw new ConflictException('Payment proof was already reviewed');
      }
      const payment = await transaction.payment.updateMany({
        where: { id: order.payment.id, status: 'PENDING' },
        data: { status: 'VERIFIED', verifiedAt: confirmedAt, verifiedById: administratorId },
      });
      const confirmedOrder = await transaction.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'CONFIRMED', confirmedAt, confirmedById: administratorId },
      });
      const commission = await transaction.commission.updateMany({
        where: { id: order.commission.id, status: 'PENDING' },
        data: { status: 'APPROVED', approvedAt: confirmedAt },
      });
      if (payment.count !== 1 || confirmedOrder.count !== 1 || commission.count !== 1) {
        throw new ConflictException('Sale confirmation conflicted with another operation');
      }
      await transaction.auditLog.create({
        data: {
          actorId: administratorId,
          action: 'ORDER_CONFIRMED',
          entityType: 'Order',
          entityId: order.id,
          metadata: { paymentId: order.payment.id, method: order.payment.method },
        },
      });
      return { orderId, orderStatus: 'CONFIRMED' as const, paymentStatus: 'VERIFIED' as const, confirmedAt };
    });
  }

  private async reject(
    transaction: Prisma.TransactionClient,
    administratorId: string,
    order: PaymentReviewOrder,
    reason: string | undefined,
  ) {
    const rejectionReason = reason?.trim();
    if (!rejectionReason) throw new BadRequestException('Rejection reason is required');
    const paymentToReject = order.payment;
    if (paymentToReject?.method !== 'TRANSFER') {
      throw new ConflictException('Only transfer payments can be rejected');
    }
    if (order.status === 'PENDING' && paymentToReject.status === 'REJECTED') {
      return { orderId: order.id, orderStatus: 'PENDING' as const, paymentStatus: 'REJECTED' as const };
    }
    if (order.status !== 'PENDING' || paymentToReject?.status !== 'PENDING') {
      throw new ConflictException('Payment cannot be rejected in its current state');
    }
    const reviewedAt = new Date();
    const pendingProof = paymentToReject.proofs.find((proof) => proof.reviewStatus === 'PENDING');
    if (pendingProof) {
      await transaction.paymentProof.updateMany({
        where: { id: pendingProof.id, reviewStatus: 'PENDING' },
        data: {
          reviewStatus: 'REJECTED',
          reviewedAt,
          reviewedById: administratorId,
          rejectionReason,
        },
      });
    }
    const payment = await transaction.payment.updateMany({
      where: { id: paymentToReject.id, status: 'PENDING' },
      data: { status: 'REJECTED', verifiedById: administratorId, rejectionReason },
    });
    if (payment.count !== 1) throw new ConflictException('Payment was already reviewed');
    await transaction.auditLog.create({
      data: {
        actorId: administratorId,
        action: 'PAYMENT_REJECTED',
        entityType: 'Payment',
        entityId: paymentToReject.id,
        metadata: { orderId: order.id },
      },
    });
    return { orderId: order.id, orderStatus: 'PENDING' as const, paymentStatus: 'REJECTED' as const };
  }
}
