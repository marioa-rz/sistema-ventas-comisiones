import { ConflictException, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      appUser: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
      },
      commission: {
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new UsersService(prismaMock as unknown as PrismaService);
  });

  describe('findActiveByAuthUserId', () => {
    it('returns active user when found', async () => {
      prismaMock.appUser.findFirst.mockResolvedValueOnce({
        id: 'user-1',
        authUserId: 'auth-1',
        displayName: 'Test User',
        role: 'SELLER',
      });

      const user = await service.findActiveByAuthUserId('auth-1');
      expect(user).toEqual({
        id: 'user-1',
        authUserId: 'auth-1',
        displayName: 'Test User',
        role: 'SELLER',
      });
    });
  });

  describe('createUser', () => {
    it('creates a new user and logs audit entry', async () => {
      prismaMock.appUser.findUnique.mockResolvedValueOnce(null);
      prismaMock.appUser.create.mockResolvedValueOnce({
        id: 'new-user',
        authUserId: 'auth-new',
        displayName: 'New Seller',
        role: 'SELLER',
        isActive: true,
        createdAt: new Date('2026-10-22T00:00:00Z'),
      });

      const user = await service.createUser('admin-1', {
        authUserId: 'auth-new',
        displayName: 'New Seller',
        role: 'SELLER',
      });

      expect(user.id).toBe('new-user');
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'admin-1',
          action: 'USER_CREATED',
          entityType: 'AppUser',
          entityId: 'new-user',
          metadata: { role: 'SELLER', displayName: 'New Seller' },
        },
      });
    });

    it('throws ConflictException if authUserId already exists', async () => {
      prismaMock.appUser.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.createUser('admin-1', {
          authUserId: 'auth-existing',
          displayName: 'Duplicate',
          role: 'SELLER',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getSellerSalesHistory', () => {
    it('aggregates seller sales and returns order history', async () => {
      prismaMock.appUser.findUnique.mockResolvedValueOnce({
        id: 'seller-1',
        displayName: 'Seller Uno',
        role: 'SELLER',
        isActive: true,
      });

      prismaMock.order.findMany.mockResolvedValueOnce([
        {
          id: 'ord-1',
          publicCode: 'VNT-001',
          status: 'CONFIRMED',
          totalAmount: new Decimal('150.00'),
          commissionAmount: new Decimal('30.00'),
          confirmedAt: new Date('2026-10-20T10:00:00Z'),
          createdAt: new Date('2026-10-19T10:00:00Z'),
        },
      ]);

      prismaMock.commission.findMany.mockResolvedValueOnce([
        { status: 'APPROVED', amount: new Decimal('30.00') },
      ]);

      const history = await service.getSellerSalesHistory('seller-1', 20, 0);

      expect(history.seller).toEqual({ id: 'seller-1', displayName: 'Seller Uno', isActive: true });
      expect(history.summary.confirmedSalesAmount).toBe('150.00');
      expect(history.summary.confirmedOrdersCount).toBe(1);
      expect(history.summary.commissions.approvedAmount).toBe('30.00');
      expect(history.orders.length).toBe(1);
    });

    it('throws NotFoundException if user not found', async () => {
      prismaMock.appUser.findUnique.mockResolvedValueOnce(null);

      await expect(service.getSellerSalesHistory('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
