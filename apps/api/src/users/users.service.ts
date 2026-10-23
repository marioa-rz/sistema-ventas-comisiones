import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../database/prisma.service';
import type { Prisma, UserRole } from '../generated/prisma/client';
import type { AdminUsersFilterDto, CreateAppUserDto, UpdateAppUserDto } from './users.dto';

export interface AuthenticatedUser {
  id: string;
  authUserId: string;
  displayName: string;
  role: 'ADMIN' | 'SELLER';
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByAuthUserId(authUserId: string): Promise<AuthenticatedUser | null> {
    return this.prisma.appUser.findFirst({
      where: { authUserId, isActive: true },
      select: {
        id: true,
        authUserId: true,
        displayName: true,
        role: true,
      },
    });
  }

  async listUsers(filters: AdminUsersFilterDto) {
    const where: Prisma.AppUserWhereInput = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };

    const users = await this.prisma.appUser.findMany({
      where,
      select: {
        id: true,
        authUserId: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  async getUserById(id: string) {
    const user = await this.prisma.appUser.findUnique({
      where: { id },
      select: {
        id: true,
        authUserId: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async createUser(administratorId: string, dto: CreateAppUserDto) {
    const existing = await this.prisma.appUser.findUnique({
      where: { authUserId: dto.authUserId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A user with this authUserId already exists');
    }

    const user = await this.prisma.appUser.create({
      data: {
        authUserId: dto.authUserId,
        displayName: dto.displayName.trim(),
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: administratorId,
        action: 'USER_CREATED',
        entityType: 'AppUser',
        entityId: user.id,
        metadata: { role: user.role, displayName: user.displayName },
      },
    });

    return {
      id: user.id,
      authUserId: user.authUserId,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateUser(administratorId: string, id: string, dto: UpdateAppUserDto) {
    const user = await this.prisma.appUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.appUser.update({
      where: { id },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: administratorId,
        action: 'USER_UPDATED',
        entityType: 'AppUser',
        entityId: updated.id,
        metadata: {
          previous: { displayName: user.displayName, role: user.role, isActive: user.isActive },
          updated: { displayName: updated.displayName, role: updated.role, isActive: updated.isActive },
        },
      },
    });

    return {
      id: updated.id,
      authUserId: updated.authUserId,
      displayName: updated.displayName,
      role: updated.role,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getSellerSalesHistory(sellerId: string, limit = 20, offset = 0) {
    const seller = await this.prisma.appUser.findUnique({
      where: { id: sellerId },
      select: { id: true, displayName: true, role: true, isActive: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const orders = await this.prisma.order.findMany({
      where: { sellerId },
      select: {
        id: true,
        publicCode: true,
        status: true,
        totalAmount: true,
        commissionAmount: true,
        confirmedAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      skip: offset,
    });

    let confirmedSalesAmount = new Decimal(0);
    let confirmedOrdersCount = 0;

    for (const ord of orders) {
      if (ord.status === 'CONFIRMED') {
        confirmedSalesAmount = confirmedSalesAmount.plus(new Decimal(ord.totalAmount));
        confirmedOrdersCount++;
      }
    }

    const commissions = await this.prisma.commission.findMany({
      where: { sellerId },
      select: { status: true, amount: true },
    });

    let pendingAmount = new Decimal(0);
    let approvedAmount = new Decimal(0);
    let paidAmount = new Decimal(0);

    for (const c of commissions) {
      const amt = new Decimal(c.amount);
      if (c.status === 'PENDING') pendingAmount = pendingAmount.plus(amt);
      else if (c.status === 'APPROVED') approvedAmount = approvedAmount.plus(amt);
      else if (c.status === 'PAID') paidAmount = paidAmount.plus(amt);
    }

    return {
      seller: {
        id: seller.id,
        displayName: seller.displayName,
        isActive: seller.isActive,
      },
      summary: {
        confirmedSalesAmount: confirmedSalesAmount.toFixed(2),
        confirmedOrdersCount,
        commissions: {
          pendingAmount: pendingAmount.toFixed(2),
          approvedAmount: approvedAmount.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          totalAmount: pendingAmount.plus(approvedAmount).plus(paidAmount).toFixed(2),
        },
      },
      orders: orders.map((o) => ({
        id: o.id,
        publicCode: o.publicCode,
        status: o.status,
        totalAmount: new Decimal(o.totalAmount).toFixed(2),
        commissionAmount: new Decimal(o.commissionAmount).toFixed(2),
        confirmedAt: o.confirmedAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }
}
