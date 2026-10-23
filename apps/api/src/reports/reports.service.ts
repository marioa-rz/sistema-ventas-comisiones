import { BadRequestException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  formatGuatemalaDate,
  getGuatemalaDayRange,
  getGuatemalaMonthRange,
  getGuatemalaWeekRange,
  getGuatemalaYearRange,
  parseDateRangeInGuatemala,
} from '../common/time/guatemala-time';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { SalesReportQueryDto } from './reports.dto';

export interface PeriodSalesAggregate {
  totalAmount: string;
  ordersCount: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboard() {
    const today = getGuatemalaDayRange();
    const week = getGuatemalaWeekRange();
    const month = getGuatemalaMonthRange();
    const year = getGuatemalaYearRange();

    const [todayOrders, weekOrders, monthOrders, yearOrders] = await Promise.all([
      this.getConfirmedOrdersInDateRange(today.startUtc, today.endUtc),
      this.getConfirmedOrdersInDateRange(week.startUtc, week.endUtc),
      this.getConfirmedOrdersInDateRange(month.startUtc, month.endUtc),
      this.getConfirmedOrdersInDateRange(year.startUtc, year.endUtc),
    ]);

    const salesToday = this.summarizeOrders(todayOrders);
    const salesWeek = this.summarizeOrders(weekOrders);
    const salesMonth = this.summarizeOrders(monthOrders);
    const salesYear = this.summarizeOrders(yearOrders);

    // Orders grouped by status
    const statusCounts = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const ordersByStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
    };
    for (const sc of statusCounts) {
      ordersByStatus[sc.status] = sc._count.id;
    }

    // Commissions status summary
    const allCommissions = await this.prisma.commission.findMany({
      select: { status: true, amount: true },
    });

    let pendingAmount = new Decimal(0);
    let approvedAmount = new Decimal(0);
    let paidAmount = new Decimal(0);
    let pendingCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    for (const c of allCommissions) {
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

    // Top sellers (lifetime or recent confirmed)
    const confirmedOrdersWithSeller = await this.prisma.order.findMany({
      where: {
        status: 'CONFIRMED',
        sellerId: { not: null },
      },
      select: {
        sellerId: true,
        totalAmount: true,
        seller: { select: { displayName: true } },
      },
    });

    const sellerMap = new Map<string, { sellerName: string; amount: Decimal; count: number }>();
    for (const ord of confirmedOrdersWithSeller) {
      if (!ord.sellerId) continue;
      const current = sellerMap.get(ord.sellerId) ?? {
        sellerName: ord.seller?.displayName ?? 'Desconocido',
        amount: new Decimal(0),
        count: 0,
      };
      current.amount = current.amount.plus(new Decimal(ord.totalAmount));
      current.count++;
      sellerMap.set(ord.sellerId, current);
    }

    const topSellers = Array.from(sellerMap.entries())
      .map(([sellerId, data]) => ({
        sellerId,
        sellerName: data.sellerName,
        confirmedSalesAmount: data.amount.toFixed(2),
        confirmedOrdersCount: data.count,
      }))
      .sort((a, b) => new Decimal(b.confirmedSalesAmount).minus(new Decimal(a.confirmedSalesAmount)).toNumber())
      .slice(0, 5);

    return {
      sales: {
        today: salesToday,
        week: salesWeek,
        month: salesMonth,
        year: salesYear,
      },
      ordersByStatus,
      commissions: {
        pendingAmount: pendingAmount.toFixed(2),
        approvedAmount: approvedAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        pendingCount,
        approvedCount,
        paidCount,
      },
      topSellers,
    };
  }

  async getSalesReport(query: SalesReportQueryDto) {
    let dateRange: { startUtc: Date; endUtc: Date };
    try {
      dateRange = parseDateRangeInGuatemala(query.startDate, query.endDate);
    } catch (err: any) {
      throw new BadRequestException(err.message ?? 'Invalid date range');
    }

    const where: Prisma.OrderWhereInput = {
      status: 'CONFIRMED',
      confirmedAt: {
        gte: dateRange.startUtc,
        lt: dateRange.endUtc,
      },
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        seller: { select: { id: true, displayName: true } },
        payment: { select: { method: true } },
      },
      orderBy: { confirmedAt: 'asc' },
    });

    let totalSales = new Decimal(0);
    let totalCommissions = new Decimal(0);

    const dailyMap = new Map<string, { count: number; sales: Decimal; commissions: Decimal }>();
    const sellerMap = new Map<string, { sellerName: string; count: number; sales: Decimal; commissions: Decimal }>();

    for (const order of orders) {
      const orderSales = new Decimal(order.totalAmount);
      const orderComms = new Decimal(order.commissionAmount);

      totalSales = totalSales.plus(orderSales);
      totalCommissions = totalCommissions.plus(orderComms);

      // Date in Guatemala
      const dateKey = order.confirmedAt ? formatGuatemalaDate(order.confirmedAt) : 'Sin fecha';
      const dailyEntry = dailyMap.get(dateKey) ?? { count: 0, sales: new Decimal(0), commissions: new Decimal(0) };
      dailyEntry.count++;
      dailyEntry.sales = dailyEntry.sales.plus(orderSales);
      dailyEntry.commissions = dailyEntry.commissions.plus(orderComms);
      dailyMap.set(dateKey, dailyEntry);

      // Seller aggregation
      const sellerId = order.sellerId ?? 'unassigned';
      const sellerName = order.seller?.displayName ?? 'Sin asignar';
      const sellerEntry = sellerMap.get(sellerId) ?? {
        sellerName,
        count: 0,
        sales: new Decimal(0),
        commissions: new Decimal(0),
      };
      sellerEntry.count++;
      sellerEntry.sales = sellerEntry.sales.plus(orderSales);
      sellerEntry.commissions = sellerEntry.commissions.plus(orderComms);
      sellerMap.set(sellerId, sellerEntry);
    }

    const averageOrderValue = orders.length > 0 ? totalSales.div(orders.length).toFixed(2) : '0.00';

    const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ordersCount: data.count,
      salesAmount: data.sales.toFixed(2),
      commissionsAmount: data.commissions.toFixed(2),
    }));

    const sellerBreakdown = Array.from(sellerMap.entries()).map(([sellerId, data]) => ({
      sellerId,
      sellerName: data.sellerName,
      ordersCount: data.count,
      salesAmount: data.sales.toFixed(2),
      commissionsAmount: data.commissions.toFixed(2),
    }));

    return {
      query: {
        startDate: query.startDate,
        endDate: query.endDate,
        sellerId: query.sellerId ?? null,
      },
      summary: {
        totalSalesAmount: totalSales.toFixed(2),
        totalCommissionsAmount: totalCommissions.toFixed(2),
        ordersCount: orders.length,
        averageOrderValue,
      },
      dailyBreakdown,
      sellerBreakdown,
    };
  }

  async exportSalesCsv(query: SalesReportQueryDto): Promise<string> {
    let dateRange: { startUtc: Date; endUtc: Date };
    try {
      dateRange = parseDateRangeInGuatemala(query.startDate, query.endDate);
    } catch (err: any) {
      throw new BadRequestException(err.message ?? 'Invalid date range');
    }

    const where: Prisma.OrderWhereInput = {
      status: 'CONFIRMED',
      confirmedAt: {
        gte: dateRange.startUtc,
        lt: dateRange.endUtc,
      },
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        seller: { select: { id: true, displayName: true } },
        payment: { select: { method: true } },
      },
      orderBy: { confirmedAt: 'asc' },
    });

    const headers = [
      'Fecha',
      'Codigo Pedido',
      'Vendedor',
      'Cliente',
      'Monto Total',
      'Comision',
      'Metodo Pago',
      'Fecha Confirmacion',
    ];

    const rows = orders.map((ord) => {
      const guatemalaDate = ord.confirmedAt ? formatGuatemalaDate(ord.confirmedAt) : '';
      const publicCode = ord.publicCode;
      const seller = ord.seller?.displayName ?? 'Sin vendedor';
      const customer = ord.customer?.name ?? '';
      const totalAmount = new Decimal(ord.totalAmount).toFixed(2);
      const commissionAmount = new Decimal(ord.commissionAmount).toFixed(2);
      const paymentMethod = ord.payment?.method ?? '';
      const confirmedAt = ord.confirmedAt?.toISOString() ?? '';

      return [
        this.escapeCsvField(guatemalaDate),
        this.escapeCsvField(publicCode),
        this.escapeCsvField(seller),
        this.escapeCsvField(customer),
        totalAmount,
        commissionAmount,
        paymentMethod,
        confirmedAt,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCsvField(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  private getConfirmedOrdersInDateRange(startUtc: Date, endUtc: Date) {
    return this.prisma.order.findMany({
      where: {
        status: 'CONFIRMED',
        confirmedAt: {
          gte: startUtc,
          lt: endUtc,
        },
      },
      select: { totalAmount: true },
    });
  }

  private summarizeOrders(orders: Array<{ totalAmount: any }>): PeriodSalesAggregate {
    let total = new Decimal(0);
    for (const o of orders) {
      total = total.plus(new Decimal(o.totalAmount));
    }
    return {
      totalAmount: total.toFixed(2),
      ordersCount: orders.length,
    };
  }
}
