import { StreamableFile } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ReportsController } from './reports.controller';
import { ReportFormat } from './reports.dto';
import type { ReportsService } from './reports.service';

describe('ReportsController', () => {
  it('delegates getDashboard to reports service', async () => {
    const mockDashboard = { sales: {}, ordersByStatus: {}, commissions: {}, topSellers: [] } as any;
    const reportsService = {
      getAdminDashboard: vi.fn().mockResolvedValue(mockDashboard),
    } as unknown as ReportsService;

    const controller = new ReportsController(reportsService);
    const result = await controller.getDashboard();

    expect(result).toBe(mockDashboard);
    expect(reportsService.getAdminDashboard).toHaveBeenCalledOnce();
  });

  it('returns a StreamableFile for XLSX format with appropriate headers', async () => {
    const fakeBuffer = Buffer.from('PK\x03\x04fake-xlsx-content');
    const reportsService = {
      exportSalesXlsx: vi.fn().mockResolvedValue(fakeBuffer),
    } as unknown as ReportsService;

    const controller = new ReportsController(reportsService);
    const res = { setHeader: vi.fn() };

    const result = await controller.getSalesReport(
      { startDate: '2026-10-01', endDate: '2026-10-29', format: ReportFormat.XLSX },
      res,
    );

    expect(result).toBeInstanceOf(StreamableFile);
    expect(reportsService.exportSalesXlsx).toHaveBeenCalledWith({
      startDate: '2026-10-01',
      endDate: '2026-10-29',
      format: ReportFormat.XLSX,
    });

    const streamable = result as StreamableFile;
    const headers = streamable.getHeaders();
    expect(headers.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(headers.disposition).toBe('attachment; filename="ventas-2026-10-01-a-2026-10-29.xlsx"');
  });

  it('sets CSV headers and returns CSV string for CSV format', async () => {
    const mockCsv = 'Fecha,Codigo Pedido\n2026-10-15,VNT-001';
    const reportsService = {
      exportSalesCsv: vi.fn().mockResolvedValue(mockCsv),
    } as unknown as ReportsService;

    const controller = new ReportsController(reportsService);
    const res = { setHeader: vi.fn() };

    const result = await controller.getSalesReport(
      { startDate: '2026-10-01', endDate: '2026-10-29', format: ReportFormat.CSV },
      res,
    );

    expect(result).toBe(mockCsv);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="ventas-2026-10-01-a-2026-10-29.csv"',
    );
  });

  it('returns JSON report when no format is specified', async () => {
    const mockReport = { summary: {}, dailyBreakdown: [], sellerBreakdown: [] } as any;
    const reportsService = {
      getSalesReport: vi.fn().mockResolvedValue(mockReport),
    } as unknown as ReportsService;

    const controller = new ReportsController(reportsService);
    const res = { setHeader: vi.fn() };

    const result = await controller.getSalesReport(
      { startDate: '2026-10-01', endDate: '2026-10-29' },
      res,
    );

    expect(result).toBe(mockReport);
    expect(reportsService.getSalesReport).toHaveBeenCalledWith({
      startDate: '2026-10-01',
      endDate: '2026-10-29',
    });
  });
});
