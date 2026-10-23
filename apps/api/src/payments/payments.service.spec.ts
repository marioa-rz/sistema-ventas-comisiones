import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { PaymentsService } from './payments.service';

const sellerId = '20000000-0000-4000-8000-000000000001';
const adminId = '20000000-0000-4000-8000-000000000002';

function prismaWithTransaction(transaction: object) {
  return {
    $transaction: vi.fn((operation: (client: object) => unknown) => operation(transaction)),
  } as unknown as PrismaService;
}

describe('PaymentsService', () => {
  it('marks seller-owned cash as received without confirming the sale', async () => {
    const order = {
      id: 'order-1',
      sellerId,
      status: 'PENDING',
      payment: { id: 'payment-1', method: 'CASH', status: 'PENDING', cashReceivedAt: null },
    };
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: order.id }]),
      order: { findFirst: vi.fn().mockResolvedValue(order) },
      payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await new PaymentsService(prismaWithTransaction(transaction)).markCashReceived(sellerId, order.id);

    expect(transaction.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1', status: 'PENDING', cashReceivedAt: null },
        data: { cashReceivedAt: expect.any(Date), cashReceivedById: sellerId },
      }),
    );
    expect(transaction.auditLog.create).toHaveBeenCalledOnce();
  });

  it('returns the same compact response when cash was already marked received', async () => {
    const receivedAt = new Date('2026-10-22T12:00:00.000Z');
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'order-1',
          sellerId,
          status: 'PENDING',
          payment: { id: 'payment-1', method: 'CASH', status: 'PENDING', cashReceivedAt: receivedAt },
        }),
      },
    };

    await expect(
      new PaymentsService(prismaWithTransaction(transaction)).markCashReceived(sellerId, 'order-1'),
    ).resolves.toEqual({ orderId: 'order-1', paymentStatus: 'PENDING', cashReceivedAt: receivedAt });
  });

  it('confirms a reviewed transfer and approves the commission in one transaction', async () => {
    const order = {
      id: 'order-1',
      sellerId,
      status: 'PENDING',
      payment: {
        id: 'payment-1',
        method: 'TRANSFER',
        status: 'PENDING',
        proofs: [{ id: 'proof-1', reviewStatus: 'PENDING' }],
      },
      commission: { id: 'commission-1', status: 'PENDING' },
    };
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: order.id }]),
      order: { findUnique: vi.fn().mockResolvedValue(order), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      paymentProof: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      commission: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await new PaymentsService(prismaWithTransaction(transaction)).review(adminId, order.id, { decision: 'VERIFIED' });

    expect(transaction.paymentProof.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reviewStatus: 'ACCEPTED', reviewedById: adminId }) }),
    );
    expect(transaction.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED', confirmedById: adminId }) }),
    );
    expect(transaction.commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
  });

  it('does not confirm cash before the seller marked it received', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          sellerId,
          status: 'PENDING',
          payment: { id: 'payment-1', method: 'CASH', status: 'PENDING', cashReceivedAt: null, proofs: [] },
          commission: { id: 'commission-1', status: 'PENDING' },
        }),
      },
    };

    await expect(
      new PaymentsService(prismaWithTransaction(transaction)).review(adminId, 'order-1', { decision: 'VERIFIED' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects only transfer payments so cash cannot enter an unrecoverable state', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          sellerId,
          status: 'PENDING',
          payment: { id: 'payment-1', method: 'CASH', status: 'PENDING', cashReceivedAt: null, proofs: [] },
          commission: { id: 'commission-1', status: 'PENDING' },
        }),
      },
    };

    await expect(
      new PaymentsService(prismaWithTransaction(transaction)).review(adminId, 'order-1', {
        decision: 'REJECTED',
        rejectionReason: 'No aplica',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
