import Decimal from 'decimal.js';
import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      order: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      commission: {
        findMany: vi.fn(),
      },
    };

    service = new ReportsService(prismaMock as unknown as PrismaService);
  });

  describe('getAdminDashboard', () => {
    it('aggregates sales metrics, order counts and commission statuses', async () => {
      // 1. Confirmed orders for today, week, month, year
      // today orders
      prismaMock.order.findMany
        .mockResolvedValueOnce([{ totalAmount: new Decimal('100.00') }]) // today
        .mockResolvedValueOnce([{ totalAmount: new Decimal('350.00') }]) // week
        .mockResolvedValueOnce([{ totalAmount: new Decimal('1200.00') }]) // month
        .mockResolvedValueOnce([{ totalAmount: new Decimal('5000.00') }]) // year
        .mockResolvedValueOnce([
          // top sellers query
          {
            sellerId: 'seller-1',
            totalAmount: new Decimal('3000.00'),
            seller: { displayName: 'Seller Top' },
          },
          {
            sellerId: 'seller-2',
            totalAmount: new Decimal('2000.00'),
            seller: { displayName: 'Seller Two' },
          },
        ]);

      // 2. Orders grouped by status
      prismaMock.order.groupBy.mockResolvedValueOnce([
        { status: 'PENDING', _count: { id: 3 } },
        { status: 'CONFIRMED', _count: { id: 10 } },
        { status: 'CANCELLED', _count: { id: 1 } },
      ]);

      // 3. Commissions summary
      prismaMock.commission.findMany.mockResolvedValueOnce([
        { status: 'PENDING', amount: new Decimal('50.00') },
        { status: 'APPROVED', amount: new Decimal('150.00') },
        { status: 'PAID', amount: new Decimal('400.00') },
      ]);

      const dashboard = await service.getAdminDashboard();

      expect(dashboard.sales.today).toEqual({ totalAmount: '100.00', ordersCount: 1 });
      expect(dashboard.sales.week).toEqual({ totalAmount: '350.00', ordersCount: 1 });
      expect(dashboard.sales.month).toEqual({ totalAmount: '1200.00', ordersCount: 1 });
      expect(dashboard.sales.year).toEqual({ totalAmount: '5000.00', ordersCount: 1 });

      expect(dashboard.ordersByStatus).toEqual({
        PENDING: 3,
        CONFIRMED: 10,
        CANCELLED: 1,
      });

      expect(dashboard.commissions).toEqual({
        pendingAmount: '50.00',
        approvedAmount: '150.00',
        paidAmount: '400.00',
        totalAmount: '600.00',
        pendingCount: 1,
        approvedCount: 1,
        paidCount: 1,
      });

      expect(dashboard.topSellers.length).toBe(2);
      expect(dashboard.topSellers[0]).toEqual({
        sellerId: 'seller-1',
        sellerName: 'Seller Top',
        confirmedSalesAmount: '3000.00',
        confirmedOrdersCount: 1,
      });
    });
  });

  describe('getSalesReport', () => {
    it('aggregates sales in range by day and by seller', async () => {
      prismaMock.order.findMany.mockResolvedValueOnce([
        {
          id: 'ord-1',
          publicCode: 'VNT-001',
          totalAmount: new Decimal('200.00'),
          commissionAmount: new Decimal('40.00'),
          confirmedAt: new Date('2026-10-15T15:00:00Z'), // 09:00 in Guatemala
          customerId: 'cust-1',
          customer: { name: 'Maria Lopez', phone: '12345678' },
          sellerId: 'seller-1',
          seller: { id: 'seller-1', displayName: 'Ana Seller' },
          payment: { method: 'TRANSFER' },
        },
        {
          id: 'ord-2',
          publicCode: 'VNT-002',
          totalAmount: new Decimal('100.00'),
          commissionAmount: new Decimal('20.00'),
          confirmedAt: new Date('2026-10-15T20:00:00Z'), // 14:00 in Guatemala
          customerId: 'cust-2',
          customer: { name: 'Juan Perez', phone: '87654321' },
          sellerId: 'seller-1',
          seller: { id: 'seller-1', displayName: 'Ana Seller' },
          payment: { method: 'CASH' },
        },
      ]);

      const report = await service.getSalesReport({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      expect(report.summary).toEqual({
        totalSalesAmount: '300.00',
        totalCommissionsAmount: '60.00',
        ordersCount: 2,
        averageOrderValue: '150.00',
      });

      expect(report.dailyBreakdown.length).toBe(1);
      expect(report.dailyBreakdown[0]).toEqual({
        date: '2026-10-15',
        ordersCount: 2,
        salesAmount: '300.00',
        commissionsAmount: '60.00',
      });

      expect(report.sellerBreakdown.length).toBe(1);
      expect(report.sellerBreakdown[0]).toEqual({
        sellerId: 'seller-1',
        sellerName: 'Ana Seller',
        ordersCount: 2,
        salesAmount: '300.00',
        commissionsAmount: '60.00',
      });
    });

    it('generates a CSV output when requested', async () => {
      prismaMock.order.findMany.mockResolvedValueOnce([
        {
          id: 'ord-1',
          publicCode: 'VNT-001',
          totalAmount: new Decimal('200.00'),
          commissionAmount: new Decimal('40.00'),
          confirmedAt: new Date('2026-10-15T15:00:00Z'),
          customer: { name: 'Maria Lopez', phone: '12345678' },
          seller: { id: 'seller-1', displayName: 'Ana Seller' },
          payment: { method: 'TRANSFER' },
        },
      ]);

      const csv = await service.exportSalesCsv({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      expect(csv).toContain('Fecha,Codigo Pedido,Vendedor,Cliente,Monto Total,Comision,Metodo Pago,Fecha Confirmacion');
      expect(csv).toContain('VNT-001');
      expect(csv).toContain('Ana Seller');
      expect(csv).toContain('200.00');
    });

    it('generates an XLSX buffer with summary and details sheets when requested', async () => {
      prismaMock.order.findMany.mockResolvedValueOnce([
        {
          id: 'ord-1',
          sellerId: 'seller-1',
          publicCode: 'VNT-001',
          totalAmount: new Decimal('200.00'),
          commissionAmount: new Decimal('40.00'),
          confirmedAt: new Date('2026-10-15T15:00:00Z'),
          customer: { name: 'Maria Lopez', phone: '12345678' },
          seller: { id: 'seller-1', displayName: 'Ana Seller' },
          payment: { method: 'TRANSFER' },
          commission: { status: 'APPROVED', amount: new Decimal('40.00') },
        },
      ]);

      const buffer = await service.exportSalesXlsx({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      // Los archivos XLSX son archivos ZIP que inician con la firma PK\x03\x04
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);

      const testWorkbook = new ExcelJS.Workbook();
      await testWorkbook.xlsx.load(Uint8Array.from(buffer).buffer);
      expect(testWorkbook.worksheets.map((w) => w.name)).toEqual(['Resumen Comisiones', 'Detalle de Ventas']);

      const summarySheet = testWorkbook.getWorksheet('Resumen Comisiones');
      expect(summarySheet).toBeDefined();
      expect(summarySheet?.rowCount).toBeGreaterThanOrEqual(2);
    });
  });
});
