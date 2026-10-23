import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { SellerOrdersService } from './seller-orders.service';

const sellerId = '20000000-0000-4000-8000-000000000001';

function prismaWithTransaction(transaction: object) {
  return {
    $transaction: vi.fn((operation: (client: object) => unknown) => operation(transaction)),
  } as unknown as PrismaService;
}

describe('SellerOrdersService', () => {
  it('claims an unassigned pending order and creates its pending commission atomically', async () => {
    const claimed = {
      id: 'order-1',
      sellerId,
      status: 'PENDING',
      commissionAmount: { toFixed: () => '20.00' },
    };
    const transaction = {
      order: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(claimed),
      },
      commission: { create: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await expect(new SellerOrdersService(prismaWithTransaction(transaction)).claim(sellerId, 'VNT-ABC123')).resolves.toBe(
      claimed,
    );
    expect(transaction.order.updateMany).toHaveBeenCalledWith({
      where: { publicCode: 'VNT-ABC123', sellerId: null, status: 'PENDING' },
      data: { sellerId, assignedAt: expect.any(Date) },
    });
    expect(transaction.commission.create).toHaveBeenCalledWith({
      data: { orderId: claimed.id, sellerId, amount: '20.00' },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledOnce();
  });

  it('rejects a claim when another seller already owns the order', async () => {
    const transaction = {
      order: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'order-1', sellerId: 'other-seller', status: 'PENDING' }),
      },
      commission: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };

    await expect(
      new SellerOrdersService(prismaWithTransaction(transaction)).claim(sellerId, 'VNT-ABC123'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Este pedido ya fue reclamado por otra vendedora.' }),
    });
    expect(transaction.commission.create).not.toHaveBeenCalled();
  });

  it('rejects a repeated claim by the same seller instead of reporting a second success', async () => {
    const transaction = {
      order: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'order-1', sellerId, status: 'PENDING' }),
      },
      commission: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };

    await expect(
      new SellerOrdersService(prismaWithTransaction(transaction)).claim(sellerId, 'VNT-ABC123'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Este pedido ya está asignado a tu cuenta.' }),
    });
    expect(transaction.commission.create).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('does not reveal an order that does not belong to the seller', async () => {
    const prisma = { order: { findFirst: vi.fn().mockResolvedValue(null) } } as unknown as PrismaService;

    await expect(new SellerOrdersService(prisma).getById(sellerId, 'order-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1', sellerId } }));
  });
});
