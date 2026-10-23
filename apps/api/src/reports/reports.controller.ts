import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ReportFormat, SalesReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

@ApiTags('admin reports')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Consultar métricas generales de ventas (día, semana, mes, año), pedidos y comisiones' })
  getDashboard() {
    return this.reports.getAdminDashboard();
  }

  @Get('reports/sales')
  @ApiOperation({ summary: 'Generar reporte detallado de ventas por rango de fechas (JSON o exportación CSV)' })
  @ApiProduces('application/json', 'text/csv')
  async getSalesReport(
    @Query() query: SalesReportQueryDto,
    @Res({ passthrough: true }) res: HeaderResponse,
  ) {
    if (query.format === ReportFormat.CSV) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ventas-${query.startDate}-a-${query.endDate}.csv"`);
      return this.reports.exportSalesCsv(query);
    }

    return this.reports.getSalesReport(query);
  }
}
