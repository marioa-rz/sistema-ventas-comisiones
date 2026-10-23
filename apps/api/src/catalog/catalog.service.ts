import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CatalogFilters {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listProducts(filters: CatalogFilters) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        category: { is: { isActive: true, ...(filters.category ? { slug: filters.category } : {}) } },
        ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' as const } } : {}),
      },
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
      select: {
        id: true,
        name: true,
        description: true,
        mainImagePath: true,
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isAvailable: true },
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            imagePath: true,
            isAvailable: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({ ...variant, price: variant.price.toFixed(2) })),
    }));
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true, category: { is: { isActive: true } } },
      select: {
        id: true,
        name: true,
        description: true,
        mainImagePath: true,
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isAvailable: true },
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            imagePath: true,
            isAvailable: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...product,
      variants: product.variants.map((variant) => ({ ...variant, price: variant.price.toFixed(2) })),
    };
  }
}
