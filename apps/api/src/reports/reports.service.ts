import { BadRequestException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import ExcelJS from 'exceljs';
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

  async exportSalesXlsx(query: SalesReportQueryDto): Promise<Buffer> {
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
        commission: { select: { status: true, amount: true } },
      },
      orderBy: { confirmedAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sakura Makeup';
    workbook.created = new Date();

    // Agrupación por vendedora para cálculo de comisiones
    interface SellerCommissionSummary {
      sellerName: string;
      ordersCount: number;
      totalSales: Decimal;
      totalCommission: Decimal;
      approvedCommission: Decimal;
      paidCommission: Decimal;
    }

    const sellerMap = new Map<string, SellerCommissionSummary>();

    for (const ord of orders) {
      const sellerKey = ord.sellerId ?? 'unassigned';
      const sellerName = ord.seller?.displayName ?? 'Sin vendedora asignada';
      const orderTotal = new Decimal(ord.totalAmount);
      const commissionTotal = new Decimal(ord.commissionAmount);
      const status = ord.commission?.status ?? 'APPROVED';

      const entry = sellerMap.get(sellerKey) ?? {
        sellerName,
        ordersCount: 0,
        totalSales: new Decimal(0),
        totalCommission: new Decimal(0),
        approvedCommission: new Decimal(0),
        paidCommission: new Decimal(0),
      };

      entry.ordersCount += 1;
      entry.totalSales = entry.totalSales.plus(orderTotal);
      entry.totalCommission = entry.totalCommission.plus(commissionTotal);

      if (status === 'PAID') {
        entry.paidCommission = entry.paidCommission.plus(commissionTotal);
      } else {
        entry.approvedCommission = entry.approvedCommission.plus(commissionTotal);
      }

      sellerMap.set(sellerKey, entry);
    }

    // 1. Hoja principal: Resumen de Comisiones por Vendedora (primera para visualización directa)
    const summarySheet = workbook.addWorksheet('Resumen Comisiones');

    summarySheet.columns = [
      { header: 'Vendedora', key: 'vendedora', width: 28 },
      { header: 'Pedidos Confirmados', key: 'pedidos', width: 22 },
      { header: 'Ventas Totales', key: 'ventas', width: 20 },
      { header: 'Comisión Total Ganada', key: 'comisionTotal', width: 24 },
      { header: 'Por Pagar (Aprobada)', key: 'porPagar', width: 24 },
      { header: 'Ya Pagada', key: 'pagada', width: 20 },
    ];

    const summaryHeaderRow = summarySheet.getRow(1);
    summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A0B14' },
    };
    summaryHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    summaryHeaderRow.height = 26;

    // Ordenar de mayor a menor comisión ganada
    const sortedSellers = Array.from(sellerMap.values()).sort((a, b) =>
      b.totalCommission.minus(a.totalCommission).toNumber(),
    );

    let grandOrders = 0;
    let grandSales = new Decimal(0);
    let grandCommission = new Decimal(0);
    let grandApproved = new Decimal(0);
    let grandPaid = new Decimal(0);

    for (const s of sortedSellers) {
      grandOrders += s.ordersCount;
      grandSales = grandSales.plus(s.totalSales);
      grandCommission = grandCommission.plus(s.totalCommission);
      grandApproved = grandApproved.plus(s.approvedCommission);
      grandPaid = grandPaid.plus(s.paidCommission);

      const row = summarySheet.addRow({
        vendedora: s.sellerName,
        pedidos: s.ordersCount,
        ventas: s.totalSales.toNumber(),
        comisionTotal: s.totalCommission.toNumber(),
        porPagar: s.approvedCommission.toNumber(),
        pagada: s.paidCommission.toNumber(),
      });

      row.getCell('pedidos').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('ventas').numFmt = '"Q"#,##0.00';
      row.getCell('comisionTotal').numFmt = '"Q"#,##0.00';
      row.getCell('porPagar').numFmt = '"Q"#,##0.00';
      row.getCell('pagada').numFmt = '"Q"#,##0.00';
      row.alignment = { vertical: 'middle' };
    }

    if (sortedSellers.length > 0) {
      const totalRow = summarySheet.addRow({
        vendedora: 'TOTAL GENERAL',
        pedidos: grandOrders,
        ventas: grandSales.toNumber(),
        comisionTotal: grandCommission.toNumber(),
        porPagar: grandApproved.toNumber(),
        pagada: grandPaid.toNumber(),
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5E8F0' },
      };
      totalRow.getCell('pedidos').alignment = { vertical: 'middle', horizontal: 'center' };
      totalRow.getCell('ventas').numFmt = '"Q"#,##0.00';
      totalRow.getCell('comisionTotal').numFmt = '"Q"#,##0.00';
      totalRow.getCell('porPagar').numFmt = '"Q"#,##0.00';
      totalRow.getCell('pagada').numFmt = '"Q"#,##0.00';
      totalRow.alignment = { vertical: 'middle' };
      totalRow.height = 24;
    }

    // 2. Hoja secundaria: Detalle individual de ventas
    const detailSheet = workbook.addWorksheet('Detalle de Ventas');

    detailSheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Código Pedido', key: 'codigo', width: 16 },
      { header: 'Vendedora', key: 'vendedor', width: 22 },
      { header: 'Cliente', key: 'cliente', width: 24 },
      { header: 'Monto Total', key: 'total', width: 16 },
      { header: 'Comisión', key: 'comision', width: 16 },
      { header: 'Estado Comisión', key: 'estadoComision', width: 22 },
      { header: 'Método Pago', key: 'metodo', width: 16 },
      { header: 'Fecha Confirmación (UTC)', key: 'confirmadoUtc', width: 26 },
    ];

    const detailHeaderRow = detailSheet.getRow(1);
    detailHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A0B14' },
    };
    detailHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    detailHeaderRow.height = 24;

    const translateCommissionStatus: Record<string, string> = {
      APPROVED: 'Por Pagar (Aprobada)',
      PAID: 'Pagada',
      PENDING: 'Pendiente',
    };

    for (const ord of orders) {
      const commStatusRaw = ord.commission?.status ?? 'APPROVED';
      const commStatusLabel = translateCommissionStatus[commStatusRaw] ?? commStatusRaw;

      const row = detailSheet.addRow({
        fecha: ord.confirmedAt ? formatGuatemalaDate(ord.confirmedAt) : '',
        codigo: ord.publicCode,
        vendedor: ord.seller?.displayName ?? 'Sin vendedora asignada',
        cliente: ord.customer?.name ?? '',
        total: new Decimal(ord.totalAmount).toNumber(),
        comision: new Decimal(ord.commissionAmount).toNumber(),
        estadoComision: commStatusLabel,
        metodo: ord.payment?.method ?? '',
        confirmadoUtc: ord.confirmedAt?.toISOString() ?? '',
      });

      row.getCell('total').numFmt = '"Q"#,##0.00';
      row.getCell('comision').numFmt = '"Q"#,##0.00';
      row.getCell('estadoComision').alignment = { vertical: 'middle', horizontal: 'center' };
      row.alignment = { vertical: 'middle' };
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
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
