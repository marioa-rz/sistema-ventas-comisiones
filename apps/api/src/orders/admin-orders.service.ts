import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { OrderStatus, PaymentStatus, Prisma } from '../generated/prisma/client';
import { lockOrder } from './order-lock';

const adminOrderSelect = {
  id: true,
  publicCode: true,
  status: true,
  totalAmount: true,
  commissionAmount: true,
  assignedAt: true,
  confirmedAt: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  customer: { select: { name: true, phone: true } },
  seller: { select: { id: true, displayName: true, isActive: true } },
  items: true,
  payment: {
    include: {
      proofs: {
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          reviewStatus: true,
          createdAt: true,
        },
      },
    },
  },
  commission: true,
} satisfies Prisma.OrderSelect;

export interface AdminOrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sellerId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: AdminOrderFilters) {
    return this.prisma.order.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.paymentStatus ? { payment: { is: { status: filters.paymentStatus } } } : {}),
        ...(filters.sellerId ? { sellerId: filters.sellerId } : {}),
      },
      select: adminOrderSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });
  }

  async getById(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: adminOrderSelect });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  cancel(administratorId: string, orderId: string, reason: string) {
    return this.prisma.$transaction(async (transaction) => {
      await lockOrder(transaction, orderId);
      const order = await transaction.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          cancelledAt: true,
          payment: {
            select: {
              id: true,
              method: true,
              status: true,
              cashReceivedAt: true,
              proofs: { select: { id: true, reviewStatus: true } },
            },
          },
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'CANCELLED') {
        return { orderId, status: 'CANCELLED' as const, cancelledAt: order.cancelledAt };
      }
      if (order.status !== 'PENDING') throw new ConflictException('Only pending orders can be cancelled');
      if (order.payment?.method === 'CASH' && order.payment.cashReceivedAt) {
        throw new ConflictException('An order with received cash cannot be cancelled');
      }

      const cancelledAt = new Date();
      if (order.payment?.status === 'PENDING') {
        await transaction.payment.updateMany({
          where: { id: order.payment.id, status: 'PENDING' },
          data: { status: 'REJECTED', verifiedById: administratorId, rejectionReason: reason.trim() },
        });
        if (order.payment.method === 'TRANSFER') {
          await transaction.paymentProof.updateMany({
            where: { paymentId: order.payment.id, reviewStatus: 'PENDING' },
            data: {
              reviewStatus: 'REJECTED',
              reviewedAt: cancelledAt,
              reviewedById: administratorId,
              rejectionReason: reason.trim(),
            },
          });
        }
      }
      const cancelled = await transaction.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: {
          status: 'CANCELLED',
          cancelledAt,
          cancelledById: administratorId,
          cancellationReason: reason.trim(),
        },
      });
      if (cancelled.count !== 1) throw new ConflictException('Order was updated by another operation');
      await transaction.auditLog.create({
        data: {
          actorId: administratorId,
          action: 'ORDER_CANCELLED',
          entityType: 'Order',
          entityId: orderId,
          metadata: { reason: reason.trim() },
        },
      });
      return { orderId, status: 'CANCELLED' as const, cancelledAt };
    });
  }
}
