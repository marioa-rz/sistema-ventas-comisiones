import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { OrderStatus, Prisma } from '../generated/prisma/client';

const sellerOrderSelect = {
  id: true,
  publicCode: true,
  sellerId: true,
  status: true,
  totalAmount: true,
  commissionAmount: true,
  assignedAt: true,
  confirmedAt: true,
  createdAt: true,
  customer: { select: { name: true, phone: true } },
  items: {
    select: {
      productNameSnapshot: true,
      variantNameSnapshot: true,
      skuSnapshot: true,
      unitPrice: true,
      quantity: true,
      subtotal: true,
      commissionAmount: true,
    },
  },
  payment: { select: { method: true, status: true, cashReceivedAt: true } },
  commission: { select: { amount: true, status: true } },
} satisfies Prisma.OrderSelect;

export interface SellerOrderFilters {
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SellerOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  claim(sellerId: string, publicCode: string) {
    return this.prisma.$transaction(async (transaction) => {
      const assignedAt = new Date();
      const assignment = await transaction.order.updateMany({
        where: { publicCode, sellerId: null, status: 'PENDING' },
        data: { sellerId, assignedAt },
      });

      if (assignment.count === 0) {
        const existing = await transaction.order.findUnique({ where: { publicCode }, select: sellerOrderSelect });
        if (!existing) throw new NotFoundException('Order not found');
        if (existing.sellerId === sellerId && existing.status === 'PENDING') return existing;
        if (existing.sellerId) throw new ConflictException('Order is already assigned');
        throw new ConflictException('Order cannot be claimed in its current state');
      }

      const assignedOrder = await transaction.order.findUnique({
        where: { publicCode },
        select: { id: true, commissionAmount: true },
      });
      if (!assignedOrder) throw new ConflictException('Order assignment could not be completed');
      await transaction.commission.create({
        data: { orderId: assignedOrder.id, sellerId, amount: assignedOrder.commissionAmount.toFixed(2) },
      });
      await transaction.auditLog.create({
        data: {
          actorId: sellerId,
          action: 'ORDER_CLAIMED',
          entityType: 'Order',
          entityId: assignedOrder.id,
          metadata: { publicCode },
        },
      });
      const order = await transaction.order.findUnique({ where: { publicCode }, select: sellerOrderSelect });
      if (!order) throw new ConflictException('Order assignment could not be completed');
      return order;
    });
  }

  list(sellerId: string, filters: SellerOrderFilters) {
    return this.prisma.order.findMany({
      where: { sellerId, ...(filters.status ? { status: filters.status } : {}) },
      select: sellerOrderSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });
  }

  async getById(sellerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId },
      select: sellerOrderSelect,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
