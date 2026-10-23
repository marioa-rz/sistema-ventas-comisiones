import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../src/database/prisma.service';
import { PrismaClient } from '../src/generated/prisma/client';
import { AdminOrdersService } from '../src/orders/admin-orders.service';
import { OrdersService } from '../src/orders/orders.service';
import { SellerOrdersService } from '../src/orders/seller-orders.service';
import { PaymentProofsService } from '../src/payments/payment-proofs.service';
import { PaymentsService } from '../src/payments/payments.service';
import type { PaymentProofStorage } from '../src/storage/payment-proof.storage';

const connectionString = process.env.TEST_DATABASE_URL;
const describeWithDatabase = connectionString ? describe : describe.skip;

describeWithDatabase('seller assignment and payment workflow', () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
  const suffix = randomUUID();
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const sellerOneId = randomUUID();
  const sellerTwoId = randomUUID();
  const adminId = randomUUID();
  const createdOrderIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const storage = {
    upload: vi.fn().mockImplementation(async () => ({
      path: `orders/pending/${randomUUID()}.pdf`,
      originalFilename: 'proof.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5,
    })),
    remove: vi.fn(),
  } as unknown as PaymentProofStorage;
  const orders = new OrdersService(prisma as unknown as PrismaService, storage);
  const sellerOrders = new SellerOrdersService(prisma as unknown as PrismaService);
  const payments = new PaymentsService(prisma as unknown as PrismaService);
  const proofs = new PaymentProofsService(prisma as unknown as PrismaService, storage);
  const adminOrders = new AdminOrdersService(prisma as unknown as PrismaService);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.appUser.createMany({
      data: [
        { id: sellerOneId, authUserId: randomUUID(), displayName: 'Seller One', role: 'SELLER' },
        { id: sellerTwoId, authUserId: randomUUID(), displayName: 'Seller Two', role: 'SELLER' },
        { id: adminId, authUserId: randomUUID(), displayName: 'Administrator', role: 'ADMIN' },
      ],
    });
    await prisma.category.create({ data: { id: categoryId, name: 'Workflow', slug: `workflow-${suffix}` } });
    await prisma.product.create({ data: { id: productId, categoryId, name: 'Workflow product' } });
    await prisma.productVariant.create({
      data: { id: variantId, productId, sku: `FLOW-${suffix}`, name: 'Workflow variant', price: '125.00' },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: [sellerOneId, sellerTwoId, adminId] } } });
    await prisma.commission.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.paymentProof.deleteMany({ where: { payment: { is: { orderId: { in: createdOrderIds } } } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.appUser.deleteMany({ where: { id: { in: [sellerOneId, sellerTwoId, adminId] } } });
    await prisma.$disconnect();
  });

  async function createOrder(paymentMethod: 'CASH' | 'TRANSFER') {
    const result = await orders.create(
      {
        customerName: `Workflow customer ${suffix}`,
        customerPhone: '55550000',
        paymentMethod,
        items: [{ variantId, quantity: 1 }],
      },
      `workflow:${paymentMethod}:${randomUUID()}`,
      paymentMethod === 'TRANSFER'
        ? { buffer: Buffer.from('%PDF-'), mimetype: 'application/pdf', originalname: 'proof.pdf', size: 5 }
        : undefined,
    );
    createdOrderIds.push(result.id);
    const persisted = await prisma.order.findUniqueOrThrow({ where: { id: result.id }, select: { customerId: true } });
    createdCustomerIds.push(persisted.customerId);
    return result;
  }

  it('allows exactly one seller to claim a code and enforces ownership', async () => {
    const order = await createOrder('CASH');

    const claims = await Promise.allSettled([
      sellerOrders.claim(sellerOneId, order.publicCode),
      sellerOrders.claim(sellerTwoId, order.publicCode),
    ]);

    expect(claims.filter((claim) => claim.status === 'fulfilled')).toHaveLength(1);
    expect(claims.filter((claim) => claim.status === 'rejected')).toHaveLength(1);
    const persisted = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const winner = persisted.sellerId!;
    const loser = winner === sellerOneId ? sellerTwoId : sellerOneId;
    await expect(sellerOrders.getById(winner, order.id)).resolves.toMatchObject({ id: order.id });
    await expect(sellerOrders.getById(loser, order.id)).rejects.toMatchObject({ status: 404 });
    expect(await prisma.commission.count({ where: { orderId: order.id } })).toBe(1);

    await payments.markCashReceived(winner, order.id);
    const received = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payment: true, commission: true },
    });
    expect(received).toMatchObject({ status: 'PENDING', payment: { status: 'PENDING' }, commission: { status: 'PENDING' } });

    await payments.review(adminId, order.id, { decision: 'VERIFIED' });
    const confirmed = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payment: true, commission: true },
    });
    expect(confirmed).toMatchObject({
      status: 'CONFIRMED',
      payment: { status: 'VERIFIED', verifiedById: adminId },
      commission: { status: 'APPROVED' },
    });
    expect(confirmed.confirmedAt).toBeInstanceOf(Date);
  });

  it('rejects and replaces a transfer proof before confirmation and preserves a cancelled order as non-sale', async () => {
    const transfer = await createOrder('TRANSFER');
    await sellerOrders.claim(sellerOneId, transfer.publicCode);
    await payments.review(adminId, transfer.id, { decision: 'REJECTED', rejectionReason: 'Documento ilegible' });

    const rejectedTransfer = await prisma.order.findUniqueOrThrow({
      where: { id: transfer.id },
      include: { payment: { include: { proofs: true } }, commission: true },
    });
    expect(rejectedTransfer).toMatchObject({
      status: 'PENDING',
      payment: { status: 'REJECTED', proofs: [{ reviewStatus: 'REJECTED' }] },
      commission: { status: 'PENDING' },
    });

    await proofs.replaceRejected(adminId, transfer.id, {
      buffer: Buffer.from('%PDF-'),
      mimetype: 'application/pdf',
      originalname: 'corrected.pdf',
      size: 5,
    });
    await payments.review(adminId, transfer.id, { decision: 'VERIFIED' });

    const verifiedTransfer = await prisma.order.findUniqueOrThrow({
      where: { id: transfer.id },
      include: { payment: { include: { proofs: true } }, commission: true },
    });
    expect(verifiedTransfer).toMatchObject({
      status: 'CONFIRMED',
      payment: { status: 'VERIFIED' },
      commission: { status: 'APPROVED' },
    });
    expect(verifiedTransfer.payment?.proofs.map((proof) => proof.reviewStatus).sort()).toEqual(['ACCEPTED', 'REJECTED']);

    const cancelled = await createOrder('CASH');
    await adminOrders.cancel(adminId, cancelled.id, 'Cliente desistió');
    await expect(payments.review(adminId, cancelled.id, { decision: 'VERIFIED' })).rejects.toMatchObject({ status: 409 });
    await expect(prisma.order.findUniqueOrThrow({ where: { id: cancelled.id } })).resolves.toMatchObject({
      status: 'CANCELLED',
      confirmedAt: null,
    });
  });

  it('serializes cash receipt against cancellation', async () => {
    const order = await createOrder('CASH');
    await sellerOrders.claim(sellerOneId, order.publicCode);

    const transitions = await Promise.allSettled([
      payments.markCashReceived(sellerOneId, order.id),
      adminOrders.cancel(adminId, order.id, 'Cancelación concurrente'),
    ]);

    expect(transitions.filter((transition) => transition.status === 'fulfilled')).toHaveLength(1);
    const persisted = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payment: true } });
    if (persisted.status === 'CANCELLED') {
      expect(persisted.payment).toMatchObject({ status: 'REJECTED', cashReceivedAt: null });
    } else {
      expect(persisted).toMatchObject({ status: 'PENDING', payment: { status: 'PENDING' } });
      expect(persisted.payment?.cashReceivedAt).toBeInstanceOf(Date);
    }
  });

  it('keeps cancellation consistent while a rejected proof is replaced', async () => {
    const order = await createOrder('TRANSFER');
    await sellerOrders.claim(sellerOneId, order.publicCode);
    await payments.review(adminId, order.id, { decision: 'REJECTED', rejectionReason: 'Documento ilegible' });

    await Promise.allSettled([
      proofs.replaceRejected(adminId, order.id, {
        buffer: Buffer.from('%PDF-'),
        mimetype: 'application/pdf',
        originalname: 'concurrent.pdf',
        size: 5,
      }),
      adminOrders.cancel(adminId, order.id, 'Cancelación concurrente'),
    ]);

    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payment: { include: { proofs: true } } },
    });
    expect(persisted.status).toBe('CANCELLED');
    expect(persisted.payment?.status).toBe('REJECTED');
    expect(persisted.payment?.proofs.some((proof) => proof.reviewStatus === 'PENDING')).toBe(false);
  });
});
