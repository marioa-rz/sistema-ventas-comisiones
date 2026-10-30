import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../database/prisma.service';
import type { CommissionStatus, Prisma } from '../generated/prisma/client';
import { PaymentProofStorage, type PaymentProofFile, type StoredPaymentProof } from '../storage/payment-proof.storage';
import type {
  AdminCommissionFiltersDto,
  AdminPayoutFiltersDto,
  CancelCommissionPayoutDto,
  CreateCommissionPayoutDto,
  SellerCommissionFiltersDto,
  UpdateSellerPayoutSettingsDto,
} from './commissions.dto';

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proofStorage: PaymentProofStorage,
  ) {}

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

  async getSellersSummary() {
    const sellers = await this.prisma.appUser.findMany({
      where: { role: 'SELLER' },
      select: {
        id: true,
        displayName: true,
        isActive: true,
        bankName: true,
        bankAccountNumber: true,
      },
      orderBy: { displayName: 'asc' },
    });

    const commissions = await this.prisma.commission.findMany({
      include: {
        order: { select: { publicCode: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const summaryMap = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        isActive: boolean;
        bankName: string | null;
        bankAccountNumber: string | null;
        pendingAmount: Decimal;
        approvedAmount: Decimal;
        paidAmount: Decimal;
        pendingCount: number;
        approvedCount: number;
        paidCount: number;
        approvedCommissions: Array<{
          id: string;
          orderPublicCode: string;
          amount: string;
        }>;
      }
    >();

    for (const seller of sellers) {
      summaryMap.set(seller.id, {
        sellerId: seller.id,
        sellerName: seller.displayName,
        isActive: seller.isActive,
        bankName: seller.bankName,
        bankAccountNumber: seller.bankAccountNumber,
        pendingAmount: new Decimal(0),
        approvedAmount: new Decimal(0),
        paidAmount: new Decimal(0),
        pendingCount: 0,
        approvedCount: 0,
        paidCount: 0,
        approvedCommissions: [],
      });
    }

    for (const comm of commissions) {
      const entry = summaryMap.get(comm.sellerId);
      if (!entry) continue;

      const amt = new Decimal(comm.amount);
      if (comm.status === 'PENDING') {
        entry.pendingAmount = entry.pendingAmount.plus(amt);
        entry.pendingCount++;
      } else if (comm.status === 'APPROVED') {
        entry.approvedAmount = entry.approvedAmount.plus(amt);
        entry.approvedCount++;
        entry.approvedCommissions.push({
          id: comm.id,
          orderPublicCode: comm.order.publicCode,
          amount: amt.toFixed(2),
        });
      } else if (comm.status === 'PAID') {
        entry.paidAmount = entry.paidAmount.plus(amt);
        entry.paidCount++;
      }
    }

    return Array.from(summaryMap.values())
      .map((s) => ({
        sellerId: s.sellerId,
        sellerName: s.sellerName,
        isActive: s.isActive,
        bankName: s.bankName,
        bankAccountNumber: s.bankAccountNumber,
        pendingAmount: s.pendingAmount.toFixed(2),
        approvedAmount: s.approvedAmount.toFixed(2),
        paidAmount: s.paidAmount.toFixed(2),
        pendingCount: s.pendingCount,
        approvedCount: s.approvedCount,
        paidCount: s.paidCount,
        approvedCommissions: s.approvedCommissions,
      }))
      .sort((a, b) => new Decimal(b.approvedAmount).minus(new Decimal(a.approvedAmount)).toNumber());
  }

  async getSellerPayoutSettings(sellerId: string) {
    const seller = await this.prisma.appUser.findUnique({
      where: { id: sellerId },
      select: { role: true, bankName: true, bankAccountNumber: true },
    });
    if (!seller || seller.role !== 'SELLER') throw new NotFoundException('Seller not found');
    return {
      bankName: seller.bankName,
      bankAccountNumber: seller.bankAccountNumber,
    };
  }

  async updateSellerPayoutSettings(sellerId: string, dto: UpdateSellerPayoutSettingsDto) {
    const bankName = dto.bankName.trim();
    const bankAccountNumber = dto.bankAccountNumber.trim();
    if (!bankName || !bankAccountNumber) {
      throw new BadRequestException('Bank and account number are required');
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.appUser.findUnique({
        where: { id: sellerId },
        select: { role: true, isActive: true },
      });
      if (!current || current.role !== 'SELLER') throw new NotFoundException('Seller not found');
      if (!current.isActive) throw new BadRequestException('Seller is not active');

      const seller = await tx.appUser.update({
        where: { id: sellerId },
        data: { bankName, bankAccountNumber },
        select: { bankName: true, bankAccountNumber: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: sellerId,
          action: 'SELLER_PAYOUT_SETTINGS_UPDATED',
          entityType: 'AppUser',
          entityId: sellerId,
          metadata: { bankName, hasBankAccountNumber: true },
        },
      });
      return seller;
    });
  }

  async createPayout(
    administratorId: string,
    dto: CreateCommissionPayoutDto,
    proof?: PaymentProofFile,
  ) {
    if (dto.method === 'TRANSFER' && !proof) {
      throw new BadRequestException('Payout proof is required for transfers');
    }
    if (dto.method === 'CASH' && proof) {
      throw new BadRequestException('Payout proof is only accepted for transfers');
    }
    if (proof && proof.mimetype !== 'image/jpeg' && proof.mimetype !== 'image/png') {
      throw new BadRequestException('Only JPEG or PNG payout proofs are allowed');
    }

    const key = dto.idempotencyKey.trim();

    const include = {
      seller: { select: { displayName: true } },
      administeredBy: { select: { displayName: true } },
      commissions: {
        select: {
          id: true,
          amount: true,
          order: { select: { publicCode: true } },
        },
      },
    } as const;

    const existing = await this.prisma.commissionPayout.findUnique({
      where: { idempotencyKey: key },
      include,
    });
    if (existing) return this.mapPayout(existing);

    let storedProof: StoredPaymentProof | undefined;
    if (proof) {
      storedProof = await this.proofStorage.upload(proof, 'commission-payouts/pending');
    }

    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        const concurrentExisting = await tx.commissionPayout.findUnique({
          where: { idempotencyKey: key },
          include,
        });
        if (concurrentExisting) return { payout: this.mapPayout(concurrentExisting), created: false };

        const seller = await tx.appUser.findUnique({
          where: { id: dto.sellerId },
          select: {
            id: true,
            displayName: true,
            isActive: true,
            role: true,
            bankName: true,
            bankAccountNumber: true,
          },
        });

        if (!seller) throw new NotFoundException('Seller not found');
        if (!seller.isActive || seller.role !== 'SELLER') {
          throw new BadRequestException('Seller is not active or does not have SELLER role');
        }
        if (dto.method === 'TRANSFER' && (!seller.bankName || !seller.bankAccountNumber)) {
          throw new BadRequestException('Seller must configure bank and account number before a transfer');
        }

        const commissions = await tx.commission.findMany({
          where: { id: { in: dto.commissionIds }, sellerId: dto.sellerId },
          include: { order: { select: { publicCode: true } } },
        });

        if (commissions.length !== dto.commissionIds.length) {
          throw new ConflictException('One or more commissions could not be found for this seller');
        }

        const invalidState = commissions.some((c) => c.status !== 'APPROVED' || c.payoutId !== null);
        if (invalidState) {
          throw new ConflictException('One or more commissions cannot be paid (must be in APPROVED status and unassigned)');
        }

        const formattedTotal = commissions
          .reduce((total, commission) => total.plus(new Decimal(commission.amount)), new Decimal(0))
          .toFixed(2);

        const paidAt = new Date();

        const payout = await tx.commissionPayout.create({
          data: {
            sellerId: dto.sellerId,
            amount: formattedTotal,
            paidAt,
            administeredById: administratorId,
            method: dto.method,
            bankNameSnapshot: dto.method === 'TRANSFER' ? seller.bankName : null,
            bankAccountNumberSnapshot: dto.method === 'TRANSFER' ? seller.bankAccountNumber : null,
            proofStoragePath: storedProof?.path ?? null,
            proofOriginalFilename: storedProof?.originalFilename ?? null,
            proofMimeType: storedProof?.mimeType ?? null,
            proofSizeBytes: storedProof?.sizeBytes ?? null,
            reference: dto.reference?.trim() || null,
            note: dto.note?.trim() || null,
            idempotencyKey: key,
          },
          include: {
            seller: { select: { displayName: true } },
            administeredBy: { select: { displayName: true } },
          },
        });

        await tx.commissionPayoutItem.createMany({
          data: dto.commissionIds.map((commissionId) => ({
            payoutId: payout.id,
            commissionId,
          })),
        });

        const updated = await tx.commission.updateMany({
          where: {
            id: { in: dto.commissionIds },
            sellerId: dto.sellerId,
            status: 'APPROVED',
            payoutId: null,
          },
          data: { status: 'PAID', paidAt, payoutId: payout.id },
        });

        if (updated.count !== dto.commissionIds.length) {
          throw new ConflictException('Failed to update all commissions atomically. Possible concurrent modification.');
        }

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
              method: dto.method,
              proofAvailable: Boolean(storedProof),
            },
          },
        });

        return {
          created: true,
          payout: this.mapPayout({ ...payout, commissions }),
        };
      });

      if (!outcome.created && storedProof) await this.cleanupProof(storedProof.path);
      return outcome.payout;
    } catch (error) {
      if (storedProof) await this.cleanupProof(storedProof.path);
      throw error;
    }
  }

  private mapPayout(payout: any) {
    const commissions = payout.commissions ?? [];
    return {
      id: payout.id,
      sellerId: payout.sellerId,
      sellerName: payout.seller.displayName,
      amount: new Decimal(payout.amount).toFixed(2),
      paidAt: payout.paidAt.toISOString(),
      administeredById: payout.administeredById,
      administeredByName: payout.administeredBy.displayName,
      method: payout.method,
      status: payout.status,
      bankNameSnapshot: payout.bankNameSnapshot ?? null,
      bankAccountNumberSnapshot: payout.bankAccountNumberSnapshot ?? null,
      proofAvailable: Boolean(payout.proofStoragePath),
      reference: payout.reference,
      note: payout.note,
      cancelledAt: payout.cancelledAt?.toISOString() ?? null,
      cancellationReason: payout.cancellationReason ?? null,
      idempotencyKey: payout.idempotencyKey,
      commissionsCount: commissions.length,
      commissions: commissions.map((commission: any) => ({
        id: commission.id,
        orderPublicCode: commission.order.publicCode,
        amount: new Decimal(commission.amount).toFixed(2),
      })),
    };
  }

  private async cleanupProof(path: string) {
    await this.proofStorage.remove(path).catch(() => undefined);
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
      method: p.method,
      status: p.status,
      bankNameSnapshot: p.bankNameSnapshot,
      bankAccountNumberSnapshot: p.bankAccountNumberSnapshot,
      proofAvailable: Boolean(p.proofStoragePath),
      reference: p.reference,
      note: p.note,
      cancelledAt: p.cancelledAt?.toISOString() ?? null,
      cancellationReason: p.cancellationReason,
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
      method: payout.method,
      status: payout.status,
      bankNameSnapshot: payout.bankNameSnapshot,
      bankAccountNumberSnapshot: payout.bankAccountNumberSnapshot,
      proofAvailable: Boolean(payout.proofStoragePath),
      reference: payout.reference,
      note: payout.note,
      cancelledAt: payout.cancelledAt?.toISOString() ?? null,
      cancellationReason: payout.cancellationReason,
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

  async getPayoutProofUrl(payoutId: string) {
    const payout = await this.prisma.commissionPayout.findUnique({
      where: { id: payoutId },
      select: { proofStoragePath: true },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (!payout.proofStoragePath) throw new NotFoundException('Payout proof not found');
    return this.proofStorage.createSignedUrl(payout.proofStoragePath);
  }

  async cancelPayout(
    administratorId: string,
    payoutId: string,
    dto: CancelCommissionPayoutDto,
  ) {
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Cancellation reason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.commissionPayout.findUnique({
        where: { id: payoutId },
        select: {
          id: true,
          sellerId: true,
          status: true,
          items: { select: { commissionId: true } },
        },
      });

      if (!payout) {
        throw new NotFoundException('Payout not found');
      }

      if (payout.status !== 'COMPLETED') {
        throw new ConflictException('Only completed payouts can be cancelled');
      }

      const commissionIds = payout.items.map((item: any) => item.commissionId);

      await tx.commission.updateMany({
        where: {
          id: { in: commissionIds },
          payoutId: payout.id,
          status: 'PAID',
        },
        data: {
          status: 'APPROVED',
          payoutId: null,
          paidAt: null,
        },
      });

      const updated = await (tx.commissionPayout.update as any)({
        where: { id: payout.id, status: 'COMPLETED' },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledById: administratorId,
          cancellationReason: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: administratorId,
          action: 'COMMISSION_PAYOUT_CANCELLED',
          entityType: 'CommissionPayout',
          entityId: payout.id,
          metadata: {
            reason,
            commissionsCount: commissionIds.length,
          },
        },
      });

      return updated;
    });
  }

  async listSellerPayouts(sellerId: string) {
    const items = await this.prisma.commissionPayout.findMany({
      where: { sellerId },
      include: {
        _count: { select: { commissions: true } },
      },
      orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
    });

    return items.map((p) => ({
      id: p.id,
      amount: new Decimal(p.amount).toFixed(2),
      paidAt: p.paidAt.toISOString(),
      status: p.status,
      method: p.method,
      bankNameSnapshot: p.bankNameSnapshot,
      bankAccountNumberSnapshot: p.bankAccountNumberSnapshot,
      proofAvailable: Boolean(p.proofStoragePath),
      reference: p.reference,
      note: p.note,
      cancelledAt: p.cancelledAt?.toISOString() ?? null,
      cancellationReason: p.cancellationReason,
      commissionsCount: p._count.commissions,
    }));
  }

  async getSellerPayoutProofUrl(sellerId: string, payoutId: string) {
    const payout = await this.prisma.commissionPayout.findFirst({
      where: { id: payoutId, sellerId },
      select: { proofStoragePath: true },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (!payout.proofStoragePath) throw new NotFoundException('Payout proof not found');
    return this.proofStorage.createSignedUrl(payout.proofStoragePath);
  }
}
