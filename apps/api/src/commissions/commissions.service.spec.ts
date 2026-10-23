import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { CommissionsService } from './commissions.service';

describe('CommissionsService', () => {
  let service: CommissionsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      appUser: {
        findUnique: vi.fn(),
      },
      commission: {
        findMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      commissionPayout: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };

    service = new CommissionsService(prismaMock as unknown as PrismaService);
  });

  describe('listSellerCommissions', () => {
    it('calculates summary and returns mapped commissions for seller', async () => {
      const sellerId = 'seller-1';

      prismaMock.commission.findMany
        .mockResolvedValueOnce([
          { status: 'PENDING', amount: new Decimal('15.00') },
          { status: 'APPROVED', amount: new Decimal('30.00') },
          { status: 'PAID', amount: new Decimal('50.00') },
        ])
        .mockResolvedValueOnce([
          {
            id: 'comm-1',
            orderId: 'order-1',
            amount: new Decimal('30.00'),
            status: 'APPROVED',
            approvedAt: new Date('2026-10-20T10:00:00Z'),
            paidAt: null,
            payoutId: null,
            createdAt: new Date('2026-10-19T10:00:00Z'),
            order: { publicCode: 'VNT-A1B2C3', totalAmount: new Decimal('150.00') },
            payout: null,
          },
        ]);

      const result = await service.listSellerCommissions(sellerId, { status: 'APPROVED' });

      expect(result.summary).toEqual({
        pendingAmount: '15.00',
        approvedAmount: '30.00',
        paidAmount: '50.00',
        totalAmount: '95.00',
        pendingCount: 1,
        approvedCount: 1,
        paidCount: 1,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0]).toEqual({
        id: 'comm-1',
        orderId: 'order-1',
        orderPublicCode: 'VNT-A1B2C3',
        orderTotal: '150.00',
        amount: '30.00',
        status: 'APPROVED',
        approvedAt: '2026-10-20T10:00:00.000Z',
        paidAt: null,
        payoutId: null,
        payoutReference: null,
        createdAt: '2026-10-19T10:00:00.000Z',
      });
    });
  });

  describe('createPayout', () => {
    const adminId = 'admin-1';
    const sellerId = 'seller-1';
    const dto = {
      sellerId,
      commissionIds: ['comm-1', 'comm-2'],
      idempotencyKey: 'idemp-key-1',
      reference: 'REF-123',
      note: 'Monthly settlement',
    };

    it('returns existing payout when idempotency key is matched (idempotent retry)', async () => {
      prismaMock.commissionPayout.findUnique.mockResolvedValueOnce({
        id: 'payout-1',
        sellerId,
        amount: new Decimal('45.00'),
        idempotencyKey: 'idemp-key-1',
        paidAt: new Date('2026-10-22T10:00:00Z'),
        reference: 'REF-123',
        note: 'Monthly settlement',
        seller: { displayName: 'Seller Uno' },
        administeredBy: { displayName: 'Admin Boss' },
        commissions: [
          { id: 'comm-1', amount: new Decimal('20.00'), order: { publicCode: 'VNT-1' } },
          { id: 'comm-2', amount: new Decimal('25.00'), order: { publicCode: 'VNT-2' } },
        ],
      });

      const result = await service.createPayout(adminId, dto);

      expect(result.id).toBe('payout-1');
      expect(result.amount).toBe('45.00');
      expect(prismaMock.commissionPayout.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if seller does not exist', async () => {
      prismaMock.commissionPayout.findUnique.mockResolvedValueOnce(null);
      prismaMock.appUser.findUnique.mockResolvedValueOnce(null);

      await expect(service.createPayout(adminId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if seller is inactive', async () => {
      prismaMock.commissionPayout.findUnique.mockResolvedValueOnce(null);
      prismaMock.appUser.findUnique.mockResolvedValueOnce({ id: sellerId, isActive: false, role: 'SELLER' });

      await expect(service.createPayout(adminId, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if commissions do not match or are not in APPROVED state', async () => {
      prismaMock.commissionPayout.findUnique.mockResolvedValueOnce(null);
      prismaMock.appUser.findUnique.mockResolvedValueOnce({ id: sellerId, isActive: true, role: 'SELLER' });
      // Only 1 returned or wrong status
      prismaMock.commission.findMany.mockResolvedValueOnce([
        { id: 'comm-1', sellerId, status: 'PAID', amount: new Decimal('20.00'), payoutId: 'some-payout' },
      ]);

      await expect(service.createPayout(adminId, dto)).rejects.toThrow(ConflictException);
    });

    it('creates payout and updates commissions atomically in a transaction', async () => {
      prismaMock.commissionPayout.findUnique.mockResolvedValueOnce(null);
      prismaMock.appUser.findUnique.mockResolvedValueOnce({ id: sellerId, displayName: 'Seller Uno', isActive: true, role: 'SELLER' });
      prismaMock.commission.findMany.mockResolvedValueOnce([
        { id: 'comm-1', sellerId, status: 'APPROVED', amount: new Decimal('20.00'), payoutId: null, order: { publicCode: 'VNT-1' } },
        { id: 'comm-2', sellerId, status: 'APPROVED', amount: new Decimal('25.00'), payoutId: null, order: { publicCode: 'VNT-2' } },
      ]);

      const createdDate = new Date('2026-10-22T12:00:00Z');
      prismaMock.commissionPayout.create.mockResolvedValueOnce({
        id: 'payout-new',
        sellerId,
        amount: new Decimal('45.00'),
        paidAt: createdDate,
        administeredById: adminId,
        reference: 'REF-123',
        note: 'Monthly settlement',
        idempotencyKey: 'idemp-key-1',
        seller: { displayName: 'Seller Uno' },
        administeredBy: { displayName: 'Admin Boss' },
      });

      prismaMock.commission.updateMany.mockResolvedValueOnce({ count: 2 });

      const result = await service.createPayout(adminId, dto);

      expect(prismaMock.commissionPayout.create).toHaveBeenCalledWith({
        data: {
          sellerId,
          amount: '45.00',
          paidAt: expect.any(Date),
          administeredById: adminId,
          reference: 'REF-123',
          note: 'Monthly settlement',
          idempotencyKey: 'idemp-key-1',
        },
        include: {
          seller: { select: { displayName: true } },
          administeredBy: { select: { displayName: true } },
        },
      });

      expect(prismaMock.commission.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['comm-1', 'comm-2'] },
          sellerId,
          status: 'APPROVED',
          payoutId: null,
        },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date),
          payoutId: 'payout-new',
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: adminId,
          action: 'COMMISSION_PAYOUT_CREATED',
          entityType: 'CommissionPayout',
          entityId: 'payout-new',
          metadata: {
            sellerId,
            commissionsCount: 2,
            totalAmount: '45.00',
          },
        },
      });

      expect(result.id).toBe('payout-new');
      expect(result.amount).toBe('45.00');
    });
  });
});
