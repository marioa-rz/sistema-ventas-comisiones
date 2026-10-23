import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import type { PaymentProofStorage } from '../storage/payment-proof.storage';
import { generatePublicOrderCode, OrdersService } from './orders.service';

const variant = {
  id: '30000000-0000-4000-8000-000000000001',
  sku: 'DB-SKU',
  name: 'Rosa',
  price: { toString: () => '80.00' },
  product: { name: 'Labial', isActive: true, category: { isActive: true } },
};

function setup(existingOrder: unknown = null) {
  const transaction = {
    productVariant: { findMany: vi.fn().mockResolvedValue([variant]) },
    customer: { create: vi.fn().mockResolvedValue({ id: 'customer-1' }) },
    order: {
      create: vi.fn().mockResolvedValue({
        id: 'order-1',
        publicCode: 'VNT-ABC123',
        status: 'PENDING',
        totalAmount: { toFixed: () => '160.00' },
        commissionAmount: { toFixed: () => '16.00' },
        createdAt: new Date('2026-10-22T12:00:00.000Z'),
        payment: { method: 'CASH', status: 'PENDING' },
      }),
    },
  };
  const prisma = {
    order: { findUnique: vi.fn().mockResolvedValue(existingOrder) },
    $transaction: vi.fn(async (work: (client: typeof transaction) => unknown) => work(transaction)),
  } as unknown as PrismaService;
  const storage = {
    upload: vi.fn(),
    remove: vi.fn(),
  } as unknown as PaymentProofStorage;

  return { service: new OrdersService(prisma, storage), prisma, storage, transaction };
}

describe('OrdersService', () => {
  it('generates public codes accepted by the database constraint', () => {
    for (let index = 0; index < 10_000; index += 1) {
      expect(generatePublicOrderCode()).toMatch(/^VNT-[A-Z0-9]{6}$/);
    }
  });

  it('recalculates totals from database prices and stores immutable line snapshots', async () => {
    const { service, transaction } = setup();

    const result = await service.create(
      {
        customerName: 'Cliente prueba',
        customerPhone: '55550000',
        paymentMethod: 'CASH',
        items: [{ variantId: variant.id, quantity: 2, unitPrice: '0.01' }],
      },
      'retry-key-1',
    );

    expect(result).toMatchObject({ total: '160.00', commission: '16.00', publicCode: 'VNT-ABC123' });
    expect(transaction.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: '160.00',
          commissionAmount: '16.00',
          items: {
            create: [
              expect.objectContaining({
                productNameSnapshot: 'Labial',
                variantNameSnapshot: 'Rosa',
                skuSnapshot: 'DB-SKU',
                unitPrice: '80.00',
                quantity: 2,
                subtotal: '160.00',
                commissionRate: '0.1000',
                commissionAmount: '16.00',
              }),
            ],
          },
        }),
      }),
    );
  });

  it('returns the existing order for a repeated idempotency key without writing again', async () => {
    const existing = {
      id: 'order-1',
      publicCode: 'VNT-ABC123',
      status: 'PENDING',
      totalAmount: { toFixed: () => '80.00' },
      commissionAmount: { toFixed: () => '8.00' },
      createdAt: new Date('2026-10-22T12:00:00.000Z'),
      payment: { method: 'CASH', status: 'PENDING', proofs: [] },
      customer: { name: 'Cliente prueba', phone: '55550000' },
      items: [{ productVariantId: variant.id, quantity: 1 }],
    };
    const { service, prisma } = setup(existing);

    await expect(
      service.create(
        {
          customerName: 'Cliente prueba',
          customerPhone: '55550000',
          paymentMethod: 'CASH',
          items: [{ variantId: variant.id, quantity: 1 }],
        },
        'retry-key-1',
      ),
    ).resolves.toMatchObject({ id: 'order-1', total: '80.00' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('converges on the first order when concurrent attempts race on the idempotency key', async () => {
    const existing = {
      id: 'order-1',
      publicCode: 'VNT-ABC123',
      status: 'PENDING',
      totalAmount: { toFixed: () => '80.00' },
      commissionAmount: { toFixed: () => '8.00' },
      createdAt: new Date('2026-10-22T12:00:00.000Z'),
      payment: { method: 'CASH', status: 'PENDING', proofs: [] },
      customer: { name: 'Cliente prueba', phone: '55550000' },
      items: [{ productVariantId: variant.id, quantity: 1 }],
    };
    const { service, prisma } = setup();
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null).mockResolvedValueOnce(existing as never);
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

    await expect(
      service.create(
        {
          customerName: 'Cliente prueba',
          customerPhone: '55550000',
          paymentMethod: 'CASH',
          items: [{ variantId: variant.id, quantity: 1 }],
        },
        'retry-key-race',
      ),
    ).resolves.toMatchObject({ id: 'order-1', publicCode: 'VNT-ABC123' });
  });

  it('retries with a new public code after an unrelated unique collision', async () => {
    const { service, prisma, transaction } = setup();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.$transaction)
      .mockRejectedValueOnce(Object.assign(new Error('Public code collision'), { code: 'P2002' }))
      .mockImplementationOnce(async (work) => work(transaction as never));

    await expect(
      service.create(
        {
          customerName: 'Cliente prueba',
          customerPhone: '55550000',
          paymentMethod: 'CASH',
          items: [{ variantId: variant.id, quantity: 1 }],
        },
        'retry-key-collision',
      ),
    ).resolves.toMatchObject({ id: 'order-1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('rejects reuse of an idempotency key for a different request', async () => {
    const existing = {
      id: 'order-1',
      publicCode: 'VNT-ABC123',
      status: 'PENDING',
      totalAmount: { toFixed: () => '80.00' },
      commissionAmount: { toFixed: () => '8.00' },
      createdAt: new Date('2026-10-22T12:00:00.000Z'),
      customer: { name: 'Cliente prueba', phone: '55550000' },
      items: [{ productVariantId: variant.id, quantity: 1 }],
      payment: { method: 'CASH', status: 'PENDING', proofs: [] },
    };
    const { service } = setup(existing);

    await expect(
      service.create(
        {
          customerName: 'Cliente prueba',
          customerPhone: '55550000',
          paymentMethod: 'CASH',
          items: [{ variantId: variant.id, quantity: 2 }],
        },
        'retry-key-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate lines whose aggregate quantity exceeds the line limit', async () => {
    const { service } = setup();

    await expect(
      service.create(
        {
          customerName: 'Cliente prueba',
          customerPhone: '55550000',
          paymentMethod: 'CASH',
          items: [
            { variantId: variant.id, quantity: 60 },
            { variantId: variant.id, quantity: 60 },
          ],
        },
        'retry-key-quantity',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['0.00', '9999999999.99'])('rejects an order total outside the NUMERIC(12,2) range for price %s', async (price) => {
    const { service, transaction } = setup();
    transaction.productVariant.findMany.mockResolvedValue([
      { ...variant, price: { toString: () => price } },
    ]);

    await expect(
      service.create(
        {
          customerName: 'Cliente prueba',
          customerPhone: '55550000',
          paymentMethod: 'CASH',
          items: [{ variantId: variant.id, quantity: 2 }],
        },
        `retry-key-total-${price}`,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty cart', async () => {
    const { service } = setup();

    await expect(
      service.create(
        { customerName: 'Cliente', customerPhone: '55550000', paymentMethod: 'CASH', items: [] },
        'retry-key-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects variants that are unavailable or outside the active catalog', async () => {
    const { service, transaction } = setup();
    transaction.productVariant.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        {
          customerName: 'Cliente',
          customerPhone: '55550000',
          paymentMethod: 'CASH',
          items: [{ variantId: variant.id, quantity: 1 }],
        },
        'retry-key-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes an uploaded proof when the database transaction fails', async () => {
    const { service, prisma, storage } = setup();
    const file = {
      buffer: Buffer.from('%PDF-test'),
      mimetype: 'application/pdf',
      originalname: 'proof.pdf',
      size: 9,
    };
    vi.mocked(storage.upload).mockResolvedValue({
      path: 'orders/pending/proof.pdf',
      originalFilename: 'proof.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 9,
    });
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      service.create(
        {
          customerName: 'Cliente',
          customerPhone: '55550000',
          paymentMethod: 'TRANSFER',
          items: [{ variantId: variant.id, quantity: 1 }],
        },
        'retry-key-transfer',
        file,
      ),
    ).rejects.toThrow('database unavailable');
    expect(storage.remove).toHaveBeenCalledWith('orders/pending/proof.pdf');
  });
});
