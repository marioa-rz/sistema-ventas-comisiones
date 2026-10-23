import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  CreateCategoryDto,
  CreateProductDto,
  CreateVariantDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './catalog.dto';

@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCatalog() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        products: {
          orderBy: { name: 'asc' },
          include: { variants: { orderBy: { name: 'asc' } } },
        },
      },
    });
    return categories.map((category) => ({
      ...category,
      products: category.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => this.serializeVariant(variant)),
      })),
    }));
  }

  createCategory(actorId: string, data: CreateCategoryDto) {
    return this.handleWrite(() => this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.create({ data });
      await this.audit(transaction, actorId, 'catalog.category.created', 'Category', category.id, data);
      return category;
    }));
  }

  updateCategory(actorId: string, id: string, data: UpdateCategoryDto) {
    return this.handleWrite(() => this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.update({ where: { id }, data });
      await this.audit(transaction, actorId, 'catalog.category.updated', 'Category', category.id, data);
      return category;
    }));
  }

  createProduct(actorId: string, data: CreateProductDto) {
    return this.handleWrite(() => this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.create({ data });
      await this.audit(transaction, actorId, 'catalog.product.created', 'Product', product.id, data);
      return product;
    }));
  }

  updateProduct(actorId: string, id: string, data: UpdateProductDto) {
    return this.handleWrite(() => this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.update({ where: { id }, data });
      await this.audit(transaction, actorId, 'catalog.product.updated', 'Product', product.id, data);
      return product;
    }));
  }

  createVariant(actorId: string, productId: string, data: CreateVariantDto) {
    return this.handleWrite(() => this.prisma.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.create({ data: { ...data, productId } });
      await this.audit(transaction, actorId, 'catalog.variant.created', 'ProductVariant', variant.id, {
        productId,
        ...data,
      });
      return this.serializeVariant(variant);
    }));
  }

  updateVariant(actorId: string, id: string, data: UpdateVariantDto) {
    return this.handleWrite(() => this.prisma.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.update({ where: { id }, data });
      await this.audit(transaction, actorId, 'catalog.variant.updated', 'ProductVariant', variant.id, data);
      return this.serializeVariant(variant);
    }));
  }

  private async handleWrite<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const code = this.prismaErrorCode(error);
      if (code === 'P2002') throw new ConflictException('Catalog record already exists');
      if (code === 'P2003') throw new BadRequestException('Referenced catalog record does not exist');
      if (code === 'P2025') throw new NotFoundException('Catalog record not found');
      throw error;
    }
  }

  private prismaErrorCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  }

  private serializeVariant<T extends { price: { toFixed(decimalPlaces: number): string } }>(variant: T) {
    return { ...variant, price: variant.price.toFixed(2) };
  }

  private audit(
    transaction: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: object,
  ) {
    return transaction.auditLog.create({
      data: { actorId, action, entityType, entityId, metadata },
    });
  }
}
