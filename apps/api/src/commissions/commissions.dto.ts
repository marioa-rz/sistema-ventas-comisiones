import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CommissionPayoutMethod, CommissionStatus } from '../generated/prisma/client';

function parseCommissionIds({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(',').map((id: string) => id.trim()).filter(Boolean);
    }
  }
  return value;
}

export class SellerCommissionFiltersDto {
  @ApiPropertyOptional({ enum: CommissionStatus, description: 'Filter by commission status' })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional({ description: 'Number of items to return', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AdminCommissionFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by seller ID (UUID)' })
  @IsOptional()
  @IsUUID('4')
  sellerId?: string;

  @ApiPropertyOptional({ enum: CommissionStatus, description: 'Filter by commission status' })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD or ISO)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD or ISO)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Number of items to return', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CreateCommissionPayoutDto {
  @ApiProperty({ description: 'Seller ID who will receive the payout (UUID)' })
  @IsUUID('4')
  @IsNotEmpty()
  sellerId!: string;

  @ApiProperty({ description: 'List of approved commission IDs to settle (UUIDs)', type: [String] })
  @Transform(parseCommissionIds)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  commissionIds!: string[];

  @ApiProperty({ enum: CommissionPayoutMethod, description: 'How the commission payout is delivered' })
  @IsEnum(CommissionPayoutMethod)
  method!: CommissionPayoutMethod;

  @ApiPropertyOptional({ description: 'Bank transfer reference or check number', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reference?: string;

  @ApiPropertyOptional({ description: 'Administrative note regarding this settlement', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ description: 'Idempotency key to safely retry the payout request without double charging', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class UpdateSellerPayoutSettingsDto {
  @ApiProperty({ description: 'Bank selected by the authenticated seller', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankName!: string;

  @ApiProperty({ description: 'Bank account number supplied by the authenticated seller', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  bankAccountNumber!: string;
}

export class CancelCommissionPayoutDto {
  @ApiProperty({ description: 'Audited reason for cancelling the payout', maxLength: 500 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'reason must not be empty or whitespace only' })
  @MaxLength(500)
  reason!: string;
}

export class AdminPayoutFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by seller ID (UUID)' })
  @IsOptional()
  @IsUUID('4')
  sellerId?: string;

  @ApiPropertyOptional({ description: 'Number of items to return', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
