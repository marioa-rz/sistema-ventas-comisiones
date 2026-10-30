import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class SalesReportQueryDto {
  @ApiProperty({ description: 'Start date in YYYY-MM-DD format (America/Guatemala)', example: '2026-10-01' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate!: string;

  @ApiProperty({ description: 'End date in YYYY-MM-DD format (America/Guatemala)', example: '2026-10-31' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate!: string;

  @ApiPropertyOptional({ description: 'Optional seller ID (UUID) filter' })
  @IsOptional()
  @IsUUID('4')
  sellerId?: string;

  @ApiPropertyOptional({ enum: ReportFormat, default: ReportFormat.JSON, description: 'Export format (json or csv)' })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.JSON;
}
