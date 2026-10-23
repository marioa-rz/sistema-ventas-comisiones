import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import type { PaymentProofStorage } from '../storage/payment-proof.storage';
import { PaymentProofsService } from './payment-proofs.service';

const adminId = '20000000-0000-4000-8000-000000000002';
const file = {
  buffer: Buffer.from('%PDF-'),
  mimetype: 'application/pdf',
  originalname: 'corrected.pdf',
  size: 5,
};

describe('PaymentProofsService', () => {
  it('replaces a rejected transfer proof and returns the payment to pending', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PENDING',
          payment: { id: 'payment-1', method: 'TRANSFER', status: 'REJECTED' },
        }),
      },
      paymentProof: { create: vi.fn().mockResolvedValue({ id: 'proof-2' }) },
      payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PENDING',
          payment: { method: 'TRANSFER', status: 'REJECTED' },
        }),
      },
      $transaction: vi.fn((operation: (client: object) => unknown) => operation(transaction)),
    } as unknown as PrismaService;
    const storage = {
      upload: vi.fn().mockResolvedValue({
        path: 'orders/pending/corrected.pdf',
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      }),
      remove: vi.fn(),
    } as unknown as PaymentProofStorage;

    await new PaymentProofsService(prisma, storage).replaceRejected(adminId, 'order-1', file);

    expect(transaction.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-1', status: 'REJECTED' },
      data: { status: 'PENDING', verifiedAt: null, verifiedById: null, rejectionReason: null },
    });
    expect(transaction.paymentProof.create).toHaveBeenCalledOnce();
    expect(transaction.auditLog.create).toHaveBeenCalledOnce();
  });

  it('returns a signed URL only after loading a proof through an authorized service', async () => {
    const prisma = {
      paymentProof: {
        findFirst: vi.fn().mockResolvedValue({ id: 'proof-1', storagePath: 'orders/pending/proof.pdf' }),
      },
    } as unknown as PrismaService;
    const storage = {
      createSignedUrl: vi.fn().mockResolvedValue({ url: 'https://signed.example/proof', expiresIn: 300 }),
    } as unknown as PaymentProofStorage;

    await expect(new PaymentProofsService(prisma, storage).getAdminSignedUrl('order-1')).resolves.toEqual({
      proofId: 'proof-1',
      url: 'https://signed.example/proof',
      expiresIn: 300,
    });
    expect(prisma.paymentProof.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { payment: { is: { orderId: 'order-1' } } } }),
    );
  });
});
