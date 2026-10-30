import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { CommissionsService } from './commissions.service';

describe('CommissionsService', () => {
  let service: CommissionsService;
  let prismaMock: any;
  let storageMock: any;

  beforeEach(() => {
    prismaMock = {
      appUser: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      commission: {
        findMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      commissionPayout: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      commissionPayoutItem: {
        createMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };

    storageMock = {
      upload: vi.fn(),
      remove: vi.fn(),
      createSignedUrl: vi.fn(),
    };

    service = new (CommissionsService as any)(prismaMock as unknown as PrismaService, storageMock);
  });

  describe('seller payout settings', () => {
    it('updates the authenticated seller bank destination and records an audit event', async () => {
      prismaMock.appUser.findUnique.mockResolvedValueOnce({ role: 'SELLER', isActive: true });
      prismaMock.appUser.update.mockResolvedValueOnce({
        bankName: 'Banrural',
        bankAccountNumber: '001-123456-7',
      });

      const result = await service.updateSellerPayoutSettings('seller-1', {
        bankName: '  Banrural ',
        bankAccountNumber: ' 001-123456-7 ',
      });

      expect(prismaMock.appUser.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: { bankName: 'Banrural', bankAccountNumber: '001-123456-7' },
        select: { bankName: true, bankAccountNumber: true },
      });
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'seller-1',
          action: 'SELLER_PAYOUT_SETTINGS_UPDATED',
          entityType: 'AppUser',
          entityId: 'seller-1',
          metadata: { bankName: 'Banrural', hasBankAccountNumber: true },
        },
      });
      expect(result).toEqual({ bankName: 'Banrural', bankAccountNumber: '001-123456-7' });
    });
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
      method: 'CASH' as const,
      reference: 'REF-123',
      note: 'Monthly settlement',
    };

    const proof = {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      mimetype: 'image/jpeg',
      originalname: 'liquidacion.jpg',
      size: 4,
    };

    it('requires an image proof for transfer payouts', async () => {
      await expect(
        (service.createPayout as any)(adminId, { ...dto, method: 'TRANSFER' }),
      ).rejects.toThrow('Payout proof is required for transfers');
    });

    it('rejects payout proof files for cash payouts', async () => {
      await expect((service.createPayout as any)(adminId, dto, proof)).rejects.toThrow(
        'Payout proof is only accepted for transfers',
      );
    });

    it('uploads transfer evidence and snapshots the configured bank destination', async () => {
      prismaMock.commissionPayout.findUnique.mockResolvedValueOnce(null);
      prismaMock.appUser.findUnique.mockResolvedValueOnce({
        id: sellerId,
        displayName: 'Seller Uno',
        isActive: true,
        role: 'SELLER',
        bankName: 'Banrural',
        bankAccountNumber: '001-123456-7',
      });
      prismaMock.commission.findMany.mockResolvedValueOnce([
        { id: 'comm-1', sellerId, status: 'APPROVED', amount: new Decimal('20.00'), payoutId: null, order: { publicCode: 'VNT-1' } },
        { id: 'comm-2', sellerId, status: 'APPROVED', amount: new Decimal('25.00'), payoutId: null, order: { publicCode: 'VNT-2' } },
      ]);
      storageMock.upload.mockResolvedValueOnce({
        path: 'commission-payouts/pending/proof.jpg',
        originalFilename: 'liquidacion.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
      });
      prismaMock.commissionPayout.create.mockResolvedValueOnce({
        id: 'payout-transfer',
        sellerId,
        amount: new Decimal('45.00'),
        paidAt: new Date('2026-10-30T12:00:00Z'),
        administeredById: adminId,
        method: 'TRANSFER',
        bankNameSnapshot: 'Banrural',
        bankAccountNumberSnapshot: '001-123456-7',
        proofStoragePath: 'commission-payouts/pending/proof.jpg',
        proofOriginalFilename: 'liquidacion.jpg',
        proofMimeType: 'image/jpeg',
        proofSizeBytes: 4,
        reference: null,
        note: 'Monthly settlement',
        idempotencyKey: 'idemp-key-1',
        seller: { displayName: 'Seller Uno' },
        administeredBy: { displayName: 'Admin Boss' },
      });
      prismaMock.commission.updateMany.mockResolvedValueOnce({ count: 2 });

      const result = await (service.createPayout as any)(
        adminId,
        { ...dto, method: 'TRANSFER', reference: undefined },
        proof,
      );

      expect(storageMock.upload).toHaveBeenCalledWith(proof, 'commission-payouts/pending');
      expect(prismaMock.commissionPayout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: 'TRANSFER',
            bankNameSnapshot: 'Banrural',
            bankAccountNumberSnapshot: '001-123456-7',
            proofStoragePath: 'commission-payouts/pending/proof.jpg',
            proofOriginalFilename: 'liquidacion.jpg',
            proofMimeType: 'image/jpeg',
            proofSizeBytes: 4,
          }),
        }),
      );
      expect(result).toMatchObject({ method: 'TRANSFER', proofAvailable: true });
    });

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
        method: 'CASH',
        bankNameSnapshot: null,
        bankAccountNumberSnapshot: null,
        proofStoragePath: null,
        proofOriginalFilename: null,
        proofMimeType: null,
        proofSizeBytes: null,
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
          method: 'CASH',
          bankNameSnapshot: null,
          bankAccountNumberSnapshot: null,
          proofStoragePath: null,
          proofOriginalFilename: null,
          proofMimeType: null,
          proofSizeBytes: null,
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
            method: 'CASH',
            proofAvailable: false,
          },
        },
      });

      expect(result.id).toBe('payout-new');
      expect(result.amount).toBe('45.00');
    });
  });

  describe('getSellersSummary', () => {
    it('aggregates commission totals and approved items by seller', async () => {
      prismaMock.appUser.findMany.mockResolvedValueOnce([
        { id: 'seller-1', displayName: 'Ana Seller', isActive: true, bankName: 'Banrural', bankAccountNumber: '001' },
        { id: 'seller-2', displayName: 'Sofia Seller', isActive: false, bankName: null, bankAccountNumber: null },
      ]);

      prismaMock.commission.findMany.mockResolvedValueOnce([
        {
          id: 'comm-1',
          sellerId: 'seller-1',
          amount: new Decimal('100.00'),
          status: 'APPROVED',
          order: { publicCode: 'VNT-001', totalAmount: new Decimal('500.00') },
        },
        {
          id: 'comm-2',
          sellerId: 'seller-1',
          amount: new Decimal('50.00'),
          status: 'PAID',
          order: { publicCode: 'VNT-002', totalAmount: new Decimal('250.00') },
        },
        {
          id: 'comm-3',
          sellerId: 'seller-2',
          amount: new Decimal('30.00'),
          status: 'PENDING',
          order: { publicCode: 'VNT-003', totalAmount: new Decimal('150.00') },
        },
      ]);

      const result = await service.getSellersSummary();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sellerId: 'seller-1',
        sellerName: 'Ana Seller',
        isActive: true,
        bankName: 'Banrural',
        bankAccountNumber: '001',
        pendingAmount: '0.00',
        approvedAmount: '100.00',
        paidAmount: '50.00',
        pendingCount: 0,
        approvedCount: 1,
        paidCount: 1,
        approvedCommissions: [
          { id: 'comm-1', orderPublicCode: 'VNT-001', amount: '100.00' },
        ],
      });
      expect(result[1]).toEqual({
        sellerId: 'seller-2',
        sellerName: 'Sofia Seller',
        isActive: false,
        bankName: null,
        bankAccountNumber: null,
        pendingAmount: '30.00',
        approvedAmount: '0.00',
        paidAmount: '0.00',
        pendingCount: 1,
        approvedCount: 0,
        paidCount: 0,
        approvedCommissions: [],
      });
    });
  });

  describe('payout history and cancellation', () => {
    it('cancels a completed payout atomically and makes its commissions payable again', async () => {
      prismaMock.commissionPayout.findUnique.mockResolvedValueOnce({
        id: 'payout-1',
        sellerId: 'seller-1',
        status: 'COMPLETED',
        items: [{ commissionId: 'comm-1' }, { commissionId: 'comm-2' }],
      });
      prismaMock.commission.updateMany.mockResolvedValueOnce({ count: 2 });
      prismaMock.commissionPayout.update.mockResolvedValueOnce({
        id: 'payout-1',
        status: 'CANCELLED',
        cancelledAt: new Date('2026-10-30T17:00:00Z'),
        cancellationReason: 'Cuenta equivocada',
      });

      const result = await service.cancelPayout('admin-1', 'payout-1', {
        reason: ' Cuenta equivocada ',
      });

      expect(prismaMock.commission.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['comm-1', 'comm-2'] },
          payoutId: 'payout-1',
          status: 'PAID',
        },
        data: { status: 'APPROVED', payoutId: null, paidAt: null },
      });
      expect(prismaMock.commissionPayout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payout-1', status: 'COMPLETED' },
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancelledById: 'admin-1',
            cancellationReason: 'Cuenta equivocada',
          }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'COMMISSION_PAYOUT_CANCELLED' }),
        }),
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('only signs a payout proof when it belongs to the authenticated seller', async () => {
      prismaMock.commissionPayout.findFirst.mockResolvedValueOnce({
        proofStoragePath: 'commission-payouts/pending/proof.jpg',
      });
      storageMock.createSignedUrl.mockResolvedValueOnce({ url: 'https://signed.example/proof', expiresIn: 300 });

      await expect(service.getSellerPayoutProofUrl('seller-1', 'payout-1')).resolves.toEqual({
        url: 'https://signed.example/proof',
        expiresIn: 300,
      });
      expect(prismaMock.commissionPayout.findFirst).toHaveBeenCalledWith({
        where: { id: 'payout-1', sellerId: 'seller-1' },
        select: { proofStoragePath: true },
      });
    });
  });
});
