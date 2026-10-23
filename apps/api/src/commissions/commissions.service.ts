import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../database/prisma.service';
import type { CommissionStatus, Prisma } from '../generated/prisma/client';
import type {
  AdminCommissionFiltersDto,
  AdminPayoutFiltersDto,
  CreateCommissionPayoutDto,
  SellerCommissionFiltersDto,
} from './commissions.dto';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSellerCommissions(sellerId: string, filters: SellerCommissionFiltersDto) {
    const all = await this.prisma.commission.findMany({
      where: { sellerId },
      select: { status: true, amount: true },
    });

    let pendingAmount = new Decimal(0);
    let approvedAmount = new Decimal(0);
    let paidAmount = new Decimal(0);
    let pendingCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    for (const c of all) {
      const amt = new Decimal(c.amount);
      if (c.status === 'PENDING') {
        pendingAmount = pendingAmount.plus(amt);
        pendingCount++;
      } else if (c.status === 'APPROVED') {
        approvedAmount = approvedAmount.plus(amt);
        approvedCount++;
      } else if (c.status === 'PAID') {
        paidAmount = paidAmount.plus(amt);
        paidCount++;
      }
    }

    const totalAmount = pendingAmount.plus(approvedAmount).plus(paidAmount);

    const items = await this.prisma.commission.findMany({
      where: {
        sellerId,
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        order: { select: { publicCode: true, totalAmount: true } },
        payout: { select: { reference: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return {
      summary: {
        pendingAmount: pendingAmount.toFixed(2),
        approvedAmount: approvedAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        pendingCount,
        approvedCount,
        paidCount,
      },
      items: items.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        orderPublicCode: c.order.publicCode,
        orderTotal: new Decimal(c.order.totalAmount).toFixed(2),
        amount: new Decimal(c.amount).toFixed(2),
        status: c.status,
        approvedAt: c.approvedAt?.toISOString() ?? null,
        paidAt: c.paidAt?.toISOString() ?? null,
        payoutId: c.payoutId,
        payoutReference: c.payout?.reference ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async listAdminCommissions(filters: AdminCommissionFiltersDto) {
    const where: Prisma.CommissionWhereInput = {
      ...(filters.sellerId ? { sellerId: filters.sellerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    };

    const all = await this.prisma.commission.findMany({
      where,
      select: { status: true, amount: true },
    });

    let pendingAmount = new Decimal(0);
    let approvedAmount = new Decimal(0);
    let paidAmount = new Decimal(0);
    let pendingCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    for (const c of all) {
      const amt = new Decimal(c.amount);
      if (c.status === 'PENDING') {
        pendingAmount = pendingAmount.plus(amt);
        pendingCount++;
      } else if (c.status === 'APPROVED') {
        approvedAmount = approvedAmount.plus(amt);
        approvedCount++;
      } else if (c.status === 'PAID') {
        paidAmount = paidAmount.plus(amt);
        paidCount++;
      }
    }

    const totalAmount = pendingAmount.plus(approvedAmount).plus(paidAmount);

    const items = await this.prisma.commission.findMany({
      where,
      include: {
        seller: { select: { id: true, displayName: true } },
        order: { select: { publicCode: true, totalAmount: true } },
        payout: { select: { reference: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return {
      summary: {
        pendingAmount: pendingAmount.toFixed(2),
        approvedAmount: approvedAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        pendingCount,
        approvedCount,
        paidCount,
      },
      items: items.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        orderPublicCode: c.order.publicCode,
        orderTotal: new Decimal(c.order.totalAmount).toFixed(2),
        amount: new Decimal(c.amount).toFixed(2),
        status: c.status,
        seller: {
          id: c.seller.id,
          displayName: c.seller.displayName,
        },
        approvedAt: c.approvedAt?.toISOString() ?? null,
        paidAt: c.paidAt?.toISOString() ?? null,
        payoutId: c.payoutId,
        payoutReference: c.payout?.reference ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async createPayout(administratorId: string, dto: CreateCommissionPayoutDto) {
    const key = dto.idempotencyKey.trim();

    return this.prisma.$transaction(async (tx) => {
      // 1. Idempotency check
      const existing = await tx.commissionPayout.findUnique({
        where: { idempotencyKey: key },
        include: {
          seller: { select: { displayName: true } },
          administeredBy: { select: { displayName: true } },
          commissions: {
            select: {
              id: true,
              amount: true,
              order: { select: { publicCode: true } },
            },
          },
        },
      });

      if (existing) {
        return {
          id: existing.id,
          sellerId: existing.sellerId,
          sellerName: existing.seller.displayName,
          amount: new Decimal(existing.amount).toFixed(2),
          paidAt: existing.paidAt.toISOString(),
          administeredById: existing.administeredById,
          administeredByName: existing.administeredBy.displayName,
          reference: existing.reference,
          note: existing.note,
          idempotencyKey: existing.idempotencyKey,
          commissionsCount: existing.commissions.length,
          commissions: existing.commissions.map((c: any) => ({
            id: c.id,
            orderPublicCode: c.order.publicCode,
            amount: new Decimal(c.amount).toFixed(2),
          })),
        };
      }

      // 2. Validate seller
      const seller = await tx.appUser.findUnique({
        where: { id: dto.sellerId },
        select: { id: true, displayName: true, isActive: true, role: true },
      });

      if (!seller) {
        throw new NotFoundException('Seller not found');
      }
      if (!seller.isActive || seller.role !== 'SELLER') {
        throw new BadRequestException('Seller is not active or does not have SELLER role');
      }

      // 3. Find and validate commissions
      const commissions = await tx.commission.findMany({
        where: {
          id: { in: dto.commissionIds },
          sellerId: dto.sellerId,
        },
        include: {
          order: { select: { publicCode: true } },
        },
      });

      if (commissions.length !== dto.commissionIds.length) {
        throw new ConflictException('One or more commissions could not be found for this seller');
      }

      const invalidState = commissions.some((c) => c.status !== 'APPROVED' || c.payoutId !== null);
      if (invalidState) {
        throw new ConflictException('One or more commissions cannot be paid (must be in APPROVED status and unassigned)');
      }

      // 4. Calculate total amount
      let totalAmount = new Decimal(0);
      for (const c of commissions) {
        totalAmount = totalAmount.plus(new Decimal(c.amount));
      }
      const formattedTotal = totalAmount.toFixed(2);

      const paidAt = new Date();

      // 5. Create payout record
      const payout = await tx.commissionPayout.create({
        data: {
          sellerId: dto.sellerId,
          amount: formattedTotal,
          paidAt,
          administeredById: administratorId,
          reference: dto.reference?.trim() || null,
          note: dto.note?.trim() || null,
          idempotencyKey: key,
        },
        include: {
          seller: { select: { displayName: true } },
          administeredBy: { select: { displayName: true } },
        },
      });

      // 6. Update commissions to PAID
      const updated = await tx.commission.updateMany({
        where: {
          id: { in: dto.commissionIds },
          sellerId: dto.sellerId,
          status: 'APPROVED',
          payoutId: null,
        },
        data: {
          status: 'PAID',
          paidAt,
          payoutId: payout.id,
        },
      });

      if (updated.count !== dto.commissionIds.length) {
        throw new ConflictException('Failed to update all commissions atomically. Possible concurrent modification.');
      }

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          actorId: administratorId,
          action: 'COMMISSION_PAYOUT_CREATED',
          entityType: 'CommissionPayout',
          entityId: payout.id,
          metadata: {
            sellerId: dto.sellerId,
            commissionsCount: dto.commissionIds.length,
            totalAmount: formattedTotal,
          },
        },
      });

      return {
        id: payout.id,
        sellerId: payout.sellerId,
        sellerName: payout.seller.displayName,
        amount: formattedTotal,
        paidAt: payout.paidAt.toISOString(),
        administeredById: payout.administeredById,
        administeredByName: payout.administeredBy.displayName,
        reference: payout.reference,
        note: payout.note,
        idempotencyKey: payout.idempotencyKey,
        commissionsCount: dto.commissionIds.length,
        commissions: commissions.map((c) => ({
          id: c.id,
          orderPublicCode: c.order.publicCode,
          amount: new Decimal(c.amount).toFixed(2),
        })),
      };
    });
  }

  async listPayouts(filters: AdminPayoutFiltersDto) {
    const where: Prisma.CommissionPayoutWhereInput = {
      ...(filters.sellerId ? { sellerId: filters.sellerId } : {}),
    };

    const items = await this.prisma.commissionPayout.findMany({
      where,
      include: {
        seller: { select: { id: true, displayName: true } },
        administeredBy: { select: { id: true, displayName: true } },
        _count: { select: { commissions: true } },
      },
      orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return items.map((p) => ({
      id: p.id,
      sellerId: p.sellerId,
      sellerName: p.seller.displayName,
      amount: new Decimal(p.amount).toFixed(2),
      paidAt: p.paidAt.toISOString(),
      administeredById: p.administeredById,
      administeredByName: p.administeredBy.displayName,
      reference: p.reference,
      note: p.note,
      idempotencyKey: p.idempotencyKey,
      commissionsCount: p._count.commissions,
    }));
  }

  async getPayoutById(payoutId: string) {
    const payout = await this.prisma.commissionPayout.findUnique({
      where: { id: payoutId },
      include: {
        seller: { select: { id: true, displayName: true } },
        administeredBy: { select: { id: true, displayName: true } },
        commissions: {
          include: {
            order: { select: { publicCode: true, totalAmount: true } },
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return {
      id: payout.id,
      sellerId: payout.sellerId,
      sellerName: payout.seller.displayName,
      amount: new Decimal(payout.amount).toFixed(2),
      paidAt: payout.paidAt.toISOString(),
      administeredById: payout.administeredById,
      administeredByName: payout.administeredBy.displayName,
      reference: payout.reference,
      note: payout.note,
      idempotencyKey: payout.idempotencyKey,
      commissionsCount: payout.commissions.length,
      commissions: payout.commissions.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        orderPublicCode: c.order.publicCode,
        orderTotal: new Decimal(c.order.totalAmount).toFixed(2),
        amount: new Decimal(c.amount).toFixed(2),
        status: c.status,
        approvedAt: c.approvedAt?.toISOString() ?? null,
        paidAt: c.paidAt?.toISOString() ?? null,
      })),
    };
  }
}
