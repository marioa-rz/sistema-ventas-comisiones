import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  it('returns only the active public catalog and serializes prices as strings', async () => {
    const prisma = {
      product: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'product-1',
            name: 'Labial',
            description: 'Mate',
            mainImagePath: null,
            category: { id: 'category-1', name: 'Labiales', slug: 'labiales' },
            variants: [
              {
                id: 'variant-1',
                sku: 'LAB-ROSA',
                name: 'Rosa',
                price: { toFixed: () => '80.00' },
                imagePath: null,
                isAvailable: true,
              },
            ],
          },
        ]),
      },
    } as unknown as PrismaService;

    const result = await new CatalogService(prisma).listProducts({ search: 'lab', category: 'labiales' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 0,
        where: expect.objectContaining({
          isActive: true,
          category: { is: { isActive: true, slug: 'labiales' } },
          name: { contains: 'lab', mode: 'insensitive' },
        }),
        select: expect.objectContaining({
          variants: expect.objectContaining({ where: { isAvailable: true } }),
        }),
      }),
    );
    expect(result[0]?.variants[0]?.price).toBe('80.00');
  });

  it('returns active categories ordered by name', async () => {
    const categories = [{ id: 'category-1', name: 'Labiales', slug: 'labiales' }];
    const prisma = {
      category: { findMany: vi.fn().mockResolvedValue(categories) },
    } as unknown as PrismaService;

    await expect(new CatalogService(prisma).listCategories()).resolves.toEqual(categories);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  });

  it('loads a product detail by id without scanning the full catalog', async () => {
    const product = {
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Labial',
      description: null,
      mainImagePath: null,
      category: { id: 'category-1', name: 'Labiales', slug: 'labiales' },
      variants: [{ id: 'variant-1', price: { toFixed: () => '80.00' } }],
    };
    const prisma = {
      product: { findFirst: vi.fn().mockResolvedValue(product) },
    } as unknown as PrismaService;

    await expect(new CatalogService(prisma).getProduct(product.id)).resolves.toMatchObject({
      id: product.id,
      variants: [{ id: 'variant-1', price: '80.00' }],
    });
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: product.id, isActive: true, category: { is: { isActive: true } } },
        select: expect.objectContaining({
          variants: expect.objectContaining({ where: { isAvailable: true } }),
        }),
      }),
    );
  });
});
