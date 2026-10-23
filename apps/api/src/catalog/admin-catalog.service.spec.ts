import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { AdminCatalogService } from './admin-catalog.service';

describe('AdminCatalogService', () => {
  it('lists active and inactive catalog records for administration', async () => {
    const categories = [{ id: 'category-1', isActive: false, products: [] }];
    const prisma = {
      category: { findMany: vi.fn().mockResolvedValue(categories) },
    } as unknown as PrismaService;

    await expect(new AdminCatalogService(prisma).listCatalog()).resolves.toEqual(categories);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
        include: expect.objectContaining({ products: expect.any(Object) }),
      }),
    );
  });

  it('creates a product and an audit record in one transaction', async () => {
    const transaction = {
      product: {
        create: vi.fn().mockResolvedValue({
          id: '20000000-0000-4000-8000-000000000001',
          categoryId: '10000000-0000-4000-8000-000000000001',
          name: 'Labial',
          description: null,
          mainImagePath: null,
          isActive: true,
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof transaction) => unknown) => work(transaction)),
    } as unknown as PrismaService;

    const result = await new AdminCatalogService(prisma).createProduct(
      'admin-id',
      { categoryId: '10000000-0000-4000-8000-000000000001', name: 'Labial' },
    );

    expect(result).toMatchObject({ name: 'Labial' });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin-id',
        action: 'catalog.product.created',
        entityType: 'Product',
        entityId: '20000000-0000-4000-8000-000000000001',
      }),
    });
  });

  it('updates availability instead of deleting a variant', async () => {
    const transaction = {
      productVariant: {
        update: vi.fn().mockResolvedValue({
          id: '30000000-0000-4000-8000-000000000001',
          price: { toFixed: () => '80.00' },
          isAvailable: false,
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof transaction) => unknown) => work(transaction)),
    } as unknown as PrismaService;

    const result = await new AdminCatalogService(prisma).updateVariant(
      'admin-id',
      '30000000-0000-4000-8000-000000000001',
      { isAvailable: false },
    );

    expect(result).toMatchObject({ price: '80.00', isAvailable: false });
    expect(transaction.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '30000000-0000-4000-8000-000000000001' },
        data: { isAvailable: false },
      }),
    );
  });

  it.each([
    ['P2002', ConflictException],
    ['P2025', NotFoundException],
  ])('maps expected Prisma error %s to a stable HTTP exception', async (code, ExceptionType) => {
    const prisma = {
      $transaction: vi.fn().mockRejectedValue(Object.assign(new Error('database detail'), { code })),
    } as unknown as PrismaService;

    await expect(
      new AdminCatalogService(prisma).createCategory('admin-id', { name: 'Labiales', slug: 'labiales' }),
    ).rejects.toBeInstanceOf(ExceptionType);
  });
});
