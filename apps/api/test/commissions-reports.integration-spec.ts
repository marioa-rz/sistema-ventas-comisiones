import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CommissionsService } from '../src/commissions/commissions.service';
import type { PrismaService } from '../src/database/prisma.service';
import { PrismaClient } from '../src/generated/prisma/client';
import { OrdersService } from '../src/orders/orders.service';
import { SellerOrdersService } from '../src/orders/seller-orders.service';
import { PaymentsService } from '../src/payments/payments.service';
import { ReportsService } from '../src/reports/reports.service';
import type { PaymentProofStorage } from '../src/storage/payment-proof.storage';

const connectionString = process.env.TEST_DATABASE_URL;
const describeWithDatabase = connectionString ? describe : describe.skip;

describeWithDatabase('commissions settlements and reports workflow', () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
  const suffix = randomUUID();
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const sellerId = randomUUID();
  const adminId = randomUUID();
  const createdOrderIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdPayoutIds: string[] = [];

  const storage = {
    upload: vi.fn(),
    remove: vi.fn(),
  } as unknown as PaymentProofStorage;

  const orders = new OrdersService(prisma as unknown as PrismaService, storage);
  const sellerOrders = new SellerOrdersService(prisma as unknown as PrismaService);
  const payments = new PaymentsService(prisma as unknown as PrismaService);
  const commissions = new CommissionsService(prisma as unknown as PrismaService);
  const reports = new ReportsService(prisma as unknown as PrismaService);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.appUser.createMany({
      data: [
        { id: sellerId, authUserId: randomUUID(), displayName: 'Integration Seller', role: 'SELLER' },
        { id: adminId, authUserId: randomUUID(), displayName: 'Integration Admin', role: 'ADMIN' },
      ],
    });

    await prisma.category.create({ data: { id: categoryId, name: 'Comm Category', slug: `comm-${suffix}` } });
    await prisma.product.create({ data: { id: productId, categoryId, name: 'Comm Product' } });
    await prisma.productVariant.create({
      data: { id: variantId, productId, sku: `COMM-${suffix}`, name: 'Comm Variant', price: '100.00' }, // 20% commission = Q20
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: [sellerId, adminId] } } });
    await prisma.commission.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.commissionPayout.deleteMany({ where: { id: { in: createdPayoutIds } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.appUser.deleteMany({ where: { id: { in: [sellerId, adminId] } } });
    await prisma.$disconnect();
  });

  it('completes the full lifecycle: order confirmation -> approved commission -> payout settlement -> reports', async () => {
    // 1. Create order
    const created = await orders.create(
      {
        customerName: 'Cliente Prueba',
        customerPhone: '55551234',
        paymentMethod: 'CASH',
        items: [{ variantId, quantity: 1, unitPrice: '0.01' }],
      },
      `comm-order-${suffix}`,
    );
    createdOrderIds.push(created.id);

    const orderRecord = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
    createdCustomerIds.push(orderRecord.customerId);

    // 2. Seller claims order (creates commission in PENDING status)
    await sellerOrders.claim(sellerId, created.publicCode);

    let sellerCommView = await commissions.listSellerCommissions(sellerId, {});
    expect(sellerCommView.summary.pendingCount).toBe(1);
    expect(sellerCommView.summary.approvedCount).toBe(0);
    expect(sellerCommView.summary.pendingAmount).toBe('20.00');

    // 3. Mark cash received and Admin confirms sale (payment verified -> order confirmed -> commission approved)
    await payments.markCashReceived(sellerId, created.id);
    await payments.review(adminId, created.id, { decision: 'VERIFIED' });

    sellerCommView = await commissions.listSellerCommissions(sellerId, {});
    expect(sellerCommView.summary.pendingCount).toBe(0);
    expect(sellerCommView.summary.approvedCount).toBe(1);
    expect(sellerCommView.summary.approvedAmount).toBe('20.00');

    const approvedComm = sellerCommView.items[0];
    expect(approvedComm).toBeDefined();
    const approvedCommId = approvedComm!.id;

    // 4. Admin settles commission with idempotency
    const payoutKey = `payout-${suffix}`;
    const payoutResult = await commissions.createPayout(adminId, {
      sellerId,
      commissionIds: [approvedCommId],
      idempotencyKey: payoutKey,
      reference: 'TR-100200',
      note: 'Liquidación quincenal',
    });
    createdPayoutIds.push(payoutResult.id);

    expect(payoutResult.amount).toBe('20.00');
    expect(payoutResult.commissionsCount).toBe(1);

    // 5. Idempotent retry returns identical payout
    const retryResult = await commissions.createPayout(adminId, {
      sellerId,
      commissionIds: [approvedCommId],
      idempotencyKey: payoutKey,
    });
    expect(retryResult.id).toBe(payoutResult.id);

    // 6. Double payment attempt with a new idempotency key is rejected
    await expect(
      commissions.createPayout(adminId, {
        sellerId,
        commissionIds: [approvedCommId],
        idempotencyKey: `other-key-${suffix}`,
      }),
    ).rejects.toThrow();

    // 7. Seller commission view shows PAID
    sellerCommView = await commissions.listSellerCommissions(sellerId, {});
    expect(sellerCommView.summary.approvedCount).toBe(0);
    expect(sellerCommView.summary.paidCount).toBe(1);
    expect(sellerCommView.summary.paidAmount).toBe('20.00');

    // 8. Admin Dashboard reflects confirmed sale and paid commission
    const dashboard = await reports.getAdminDashboard();
    expect(dashboard.ordersByStatus.CONFIRMED).toBeGreaterThanOrEqual(1);
    expect(Number(dashboard.commissions.paidAmount)).toBeGreaterThanOrEqual(20);

    // 9. Sales report in range
    const todayStr = new Date().toISOString().slice(0, 10);
    const report = await reports.getSalesReport({
      startDate: todayStr,
      endDate: todayStr,
      sellerId,
    });
    expect(report.summary.ordersCount).toBe(1);
    expect(report.summary.totalSalesAmount).toBe('100.00');
    expect(report.summary.totalCommissionsAmount).toBe('20.00');
  });
});
