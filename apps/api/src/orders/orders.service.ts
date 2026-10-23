import { randomInt } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { calculateCommissionLine } from '../common/money/commission-calculator';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { PaymentMethod } from '../generated/prisma/enums';
import {
  PaymentProofStorage,
  type PaymentProofFile,
  type StoredPaymentProof,
} from '../storage/payment-proof.storage';

export interface CreateOrderItemCommand {
  variantId: string;
  quantity: number;
  unitPrice?: string;
}

export interface CreateOrderCommand {
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  items: CreateOrderItemCommand[];
}

const orderResponseInclude = {
  customer: { select: { name: true, phone: true } },
  items: { select: { productVariantId: true, quantity: true } },
  payment: {
    select: {
      method: true,
      status: true,
      proofs: { select: { originalFilename: true, mimeType: true, sizeBytes: true } },
    },
  },
} as const;

type OrderForResponse = Prisma.OrderGetPayload<{ include: typeof orderResponseInclude }>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly proofStorage: PaymentProofStorage,
  ) {}

  async create(command: CreateOrderCommand, idempotencyKey: string, proofFile?: PaymentProofFile) {
    if (!command.items.length) throw new BadRequestException('Order must contain at least one item');
    this.validateProof(command.paymentMethod, proofFile);
    this.aggregateItems(command.items);

    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: orderResponseInclude,
    });
    if (existing) {
      this.assertSameIdempotentRequest(existing, command, proofFile);
      return this.toResponse(existing);
    }

    let storedProof: StoredPaymentProof | undefined;
    try {
      if (proofFile) storedProof = await this.proofStorage.upload(proofFile);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const order = await this.prisma.$transaction((transaction) =>
            this.createInTransaction(transaction, command, idempotencyKey, storedProof),
          );
          return this.toResponse(order);
        } catch (error) {
          if (!this.isUniqueConstraintError(error)) throw error;
          const concurrentOrder = await this.prisma.order.findUnique({
            where: { idempotencyKey },
            include: orderResponseInclude,
          });
          if (concurrentOrder) {
            this.assertSameIdempotentRequest(concurrentOrder, command, proofFile);
            if (storedProof) await this.removeUploadedProof(storedProof.path);
            return this.toResponse(concurrentOrder);
          }
          if (attempt === 2) {
            throw new ConflictException('Order could not be created; retry with the same Idempotency-Key');
          }
        }
      }
      throw new ConflictException('Order could not be created');
    } catch (error) {
      if (storedProof) await this.removeUploadedProof(storedProof.path);
      throw error;
    }
  }

  private async createInTransaction(
    transaction: Prisma.TransactionClient,
    command: CreateOrderCommand,
    idempotencyKey: string,
    storedProof?: StoredPaymentProof,
  ) {
    const quantities = this.aggregateItems(command.items);

    const variants = await transaction.productVariant.findMany({
      where: {
        id: { in: [...quantities.keys()] },
        isAvailable: true,
        product: { is: { isActive: true, category: { is: { isActive: true } } } },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        product: { select: { name: true } },
      },
    });

    if (variants.length !== quantities.size) {
      throw new ConflictException('One or more variants are unavailable');
    }

    let total = new Decimal(0);
    let commission = new Decimal(0);
    const lines = variants.map((variant) => {
      const quantity = quantities.get(variant.id);
      if (!quantity) throw new ConflictException('One or more variants are unavailable');
      const calculated = calculateCommissionLine(variant.price.toString(), quantity);
      total = total.plus(calculated.subtotal);
      commission = commission.plus(calculated.commission);
      return {
        productVariantId: variant.id,
        productNameSnapshot: variant.product.name,
        variantNameSnapshot: variant.name,
        skuSnapshot: variant.sku,
        unitPrice: new Decimal(variant.price.toString()).toFixed(2),
        quantity,
        subtotal: calculated.subtotal,
        commissionRate: calculated.rate,
        commissionAmount: calculated.commission,
      };
    });

    if (total.lte(0) || total.gt('9999999999.99')) {
      throw new BadRequestException('Order total is outside the supported monetary range');
    }

    const customer = await transaction.customer.create({
      data: { name: command.customerName, phone: command.customerPhone },
      select: { id: true },
    });

    return transaction.order.create({
      data: {
        publicCode: generatePublicOrderCode(),
        idempotencyKey,
        customerId: customer.id,
        totalAmount: total.toFixed(2),
        commissionAmount: commission.toFixed(2),
        items: { create: lines },
        payment: {
          create: {
            method: command.paymentMethod,
            ...(storedProof
              ? {
                  proofs: {
                    create: {
                      storagePath: storedProof.path,
                      originalFilename: storedProof.originalFilename,
                      mimeType: storedProof.mimeType,
                      sizeBytes: storedProof.sizeBytes,
                    },
                  },
                }
              : {}),
          },
        },
      },
      include: orderResponseInclude,
    });
  }

  private validateProof(method: PaymentMethod, proof?: PaymentProofFile): void {
    if (method === 'TRANSFER' && !proof) {
      throw new BadRequestException('Payment proof is required for transfers');
    }
    if (method === 'CASH' && proof) {
      throw new BadRequestException('Payment proof is only accepted for transfers');
    }
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private async removeUploadedProof(path: string): Promise<void> {
    try {
      await this.proofStorage.remove(path);
    } catch {
      this.logger.error('Failed to remove an orphan payment proof');
    }
  }

  private aggregateItems(items: CreateOrderItemCommand[]): Map<string, number> {
    const quantities = new Map<string, number>();
    for (const item of items) {
      const quantity = (quantities.get(item.variantId) ?? 0) + item.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        throw new BadRequestException('Aggregate quantity per variant must be between 1 and 100');
      }
      quantities.set(item.variantId, quantity);
    }
    return quantities;
  }

  private assertSameIdempotentRequest(
    order: OrderForResponse,
    command: CreateOrderCommand,
    proofFile?: PaymentProofFile,
  ): void {
    const expectedItems = [...this.aggregateItems(command.items).entries()]
      .map(([productVariantId, quantity]) => ({ productVariantId, quantity }))
      .sort((left, right) => left.productVariantId.localeCompare(right.productVariantId));
    const existingItems = order.items
      .map(({ productVariantId, quantity }) => ({ productVariantId, quantity }))
      .sort((left, right) => (left.productVariantId ?? '').localeCompare(right.productVariantId ?? ''));
    const existingProof = order.payment?.proofs[0];
    const sameProof = proofFile
      ? order.payment?.proofs.length === 1 &&
        existingProof?.originalFilename === proofFile.originalname &&
        existingProof.mimeType === proofFile.mimetype &&
        existingProof.sizeBytes === proofFile.size
      : order.payment?.proofs.length === 0;
    const sameRequest =
      order.customer.name === command.customerName &&
      order.customer.phone === command.customerPhone &&
      order.payment?.method === command.paymentMethod &&
      sameProof &&
      JSON.stringify(existingItems) === JSON.stringify(expectedItems);
    if (!sameRequest) {
      throw new ConflictException('Idempotency-Key was already used for a different order');
    }
  }

  private toResponse(order: OrderForResponse) {
    return {
      id: order.id,
      publicCode: order.publicCode,
      status: order.status,
      total: order.totalAmount.toFixed(2),
      commission: order.commissionAmount.toFixed(2),
      payment: order.payment ? { method: order.payment.method, status: order.payment.status } : null,
      createdAt: order.createdAt,
    };
  }
}

export function generatePublicOrderCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
  return `VNT-${suffix}`;
}
