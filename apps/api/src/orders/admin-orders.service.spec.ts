import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { AdminOrdersService } from './admin-orders.service';

const adminId = '20000000-0000-4000-8000-000000000002';

describe('AdminOrdersService', () => {
  it('cancels a pending order and records the administrator and reason atomically', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PENDING',
          cancelledAt: null,
          payment: { id: 'payment-1', method: 'CASH', status: 'PENDING', cashReceivedAt: null, proofs: [] },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn((operation: (client: object) => unknown) => operation(transaction)),
    } as unknown as PrismaService;

    await new AdminOrdersService(prisma).cancel(adminId, 'order-1', 'Cliente desistió');

    expect(transaction.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'PENDING' },
      data: {
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
        cancelledById: adminId,
        cancellationReason: 'Cliente desistió',
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledOnce();
    expect(transaction.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', verifiedById: adminId }) }),
    );
  });

  it('does not cancel a confirmed sale', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: { findUnique: vi.fn().mockResolvedValue({ id: 'order-1', status: 'CONFIRMED', payment: null }) },
    };
    const prisma = {
      $transaction: vi.fn((operation: (client: object) => unknown) => operation(transaction)),
    } as unknown as PrismaService;

    await expect(new AdminOrdersService(prisma).cancel(adminId, 'order-1', 'No aplica')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns a stable cancellation response on retries', async () => {
    const cancelledAt = new Date('2026-10-22T12:00:00.000Z');
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          status: 'CANCELLED',
          cancelledAt,
          payment: { id: 'payment-1', method: 'CASH', status: 'REJECTED', cashReceivedAt: null, proofs: [] },
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn((operation: (client: object) => unknown) => operation(transaction)),
    } as unknown as PrismaService;

    await expect(new AdminOrdersService(prisma).cancel(adminId, 'order-1', 'Cliente desistió')).resolves.toEqual({
      orderId: 'order-1',
      status: 'CANCELLED',
      cancelledAt,
    });
  });
});
