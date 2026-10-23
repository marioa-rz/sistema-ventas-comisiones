import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../src/database/prisma.service';
import { PrismaClient } from '../src/generated/prisma/client';
import { OrdersService } from '../src/orders/orders.service';
import type { PaymentProofStorage } from '../src/storage/payment-proof.storage';

const connectionString = process.env.TEST_DATABASE_URL;
const describeWithDatabase = connectionString ? describe : describe.skip;

describeWithDatabase('order creation transaction', () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
  const suffix = randomUUID();
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const idempotencyKey = `integration:${suffix}`;
  const raceIdempotencyKey = `integration-race:${suffix}`;
  const customerName = `Integration ${suffix}`;
  const storage = { upload: vi.fn(), remove: vi.fn() } as unknown as PaymentProofStorage;
  const service = new OrdersService(prisma as unknown as PrismaService, storage);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.category.create({
      data: { id: categoryId, name: 'Integration', slug: `integration-${suffix}` },
    });
    await prisma.product.create({
      data: { id: productId, categoryId, name: 'Producto de integración' },
    });
    await prisma.productVariant.create({
      data: { id: variantId, productId, sku: `INT-${suffix}`, name: 'Variante', price: '125.00' },
    });
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({
      where: { idempotencyKey: { in: [idempotencyKey, raceIdempotencyKey] } },
      select: { id: true, customerId: true },
    });
    const orderIds = orders.map((order) => order.id);
    const customerIds = orders.map((order) => order.customerId);
    await prisma.paymentProof.deleteMany({ where: { payment: { is: { orderId: { in: orderIds } } } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('persists server-calculated snapshots once and returns the same order on retry', async () => {
    const command = {
      customerName,
      customerPhone: '55550000',
      paymentMethod: 'CASH' as const,
      items: [{ variantId, quantity: 2, unitPrice: '0.01' }],
    };

    const first = await service.create(command, idempotencyKey);
    await prisma.productVariant.update({ where: { id: variantId }, data: { price: '999.00' } });
    const retry = await service.create(command, idempotencyKey);

    expect(retry.id).toBe(first.id);
    expect(first).toMatchObject({ total: '250.00', commission: '50.00', status: 'PENDING' });
    const persisted = await prisma.order.findUniqueOrThrow({
      where: { idempotencyKey },
      include: { items: true, payment: true },
    });
    expect(persisted.items).toHaveLength(1);
    expect(persisted.items[0]).toMatchObject({
      productNameSnapshot: 'Producto de integración',
      variantNameSnapshot: 'Variante',
      skuSnapshot: `INT-${suffix}`,
      quantity: 2,
    });
    expect(persisted.items[0]?.unitPrice.toFixed(2)).toBe('125.00');
    expect(persisted.items[0]?.commissionRate.toFixed(4)).toBe('0.2000');
    expect(await prisma.order.count({ where: { idempotencyKey } })).toBe(1);
    expect(await prisma.customer.count({ where: { name: customerName } })).toBe(1);
  });

  it('allows only one order when two identical creations execute concurrently', async () => {
    const command = {
      customerName,
      customerPhone: '55550000',
      paymentMethod: 'CASH' as const,
      items: [{ variantId, quantity: 1 }],
    };

    const [first, second] = await Promise.all([
      service.create(command, raceIdempotencyKey),
      service.create(command, raceIdempotencyKey),
    ]);

    expect(second.id).toBe(first.id);
    expect(await prisma.order.count({ where: { idempotencyKey: raceIdempotencyKey } })).toBe(1);
  });
});
